import "server-only";
// 회화 턴 입구(plan-p13b 파일별 값 2 · 회화 plan 묶음 8 · 12 — Route Handler POST /api/talk/turn 이 부른다, C92 NDJSON). 접근 확인은 부르는
// Route Handler 의 첫 문장. 입력 Zod → 프로필 · 가림 · 설정 · 1-가 하루 안전 상한 확인을 함께 읽고 → 새 꼴 카드 세션이면 턴 길
// (lesson-turn.ts runTalkLessonTurn)로 보낸다. 세션이 없거나 옛 꼴 카드 세션이면 stale(화면이 자료를 다시 읽으면 옛 꼴 세션은 닫힌다 —
// 정한 것 2). 알림 기준(하루 호출 · 비용)은 막지 않는다(AC-8b). 로그에는 오류 이름 · Postgres 코드만(아이 글 없음).
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ClientListenSchema } from "@/core/conversation/client-listen";
import type { StageTimings } from "@/core/conversation/timing";
import { createStageTimer } from "@/core/conversation/timing";
import { talkCardKindOf } from "@/core/seed/schema/talk";
import { lessons } from "@/db/schema/content";
import { sessions } from "@/db/schema/learning";
import { maskerFor } from "@/server/ai/run";
import { type Db, type DbOrTx, getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readHouseholdProfile } from "@/server/profile";
import { getOutputCheckLists } from "@/server/seed-lists";
import { aiRestingToday } from "@/server/session/ai-gate";
import { getSettings, SettingMissingError } from "@/server/settings";
import { CLIENT_ATTEMPT_ID_MAX, TALK_TEXT_MAX } from "./index";
import { runTalkLessonTurn, type TalkLessonLine } from "./lesson-turn";
import type { TalkServerDeps } from "./state";

export type { TalkLessonLine } from "./lesson-turn";

/** 힌트 단 수 상한(기술 값 — 단계 규격 단 수보다 넉넉히). */
const HINT_TIERS_MAX = 10;
/** 듣기 끝 대기 초 · 체감 대기 ms 상한(기술 값 — 꼴 검사). */
const LISTEN_END_MAX_SECONDS = 600;
const PERCEIVED_WAIT_MAX_MS = 600_000;

const TurnRequestSchema = z.strictObject({
  sessionId: z.uuid(),
  clientAttemptId: z.string().min(1).max(CLIENT_ATTEMPT_ID_MAX),
  input: z.strictObject({
    mode: z.enum(["speech", "dont_know"]),
    text: z.string().max(TALK_TEXT_MAX).optional(),
    /** no-speech 로 넘어간 '모름'(화면의 말소리 없음 셈 — 서버는 받기만 한다). */
    nospeech: z.boolean().optional(),
  }),
  hint: z.strictObject({
    opened: z.int().min(0).max(HINT_TIERS_MAX),
    heard: z.array(z.enum(["two_answers", "answer_example"])).max(2),
  }),
  listenEndSeconds: z.number().min(0).max(LISTEN_END_MAX_SECONDS).optional(),
  confirmSkipped: z.boolean().optional(),
  prevPerceivedWaitMs: z.int().min(0).max(PERCEIVED_WAIT_MAX_MS).optional(),
  /** 그 턴의 듣기 사건 요약(C149 — 글 · 소리 없음, 5절 talk_turns client_listen). */
  clientListen: ClientListenSchema.optional(),
});

export type TurnDeps = TalkServerDeps & {
  /** 줄 하나를 브라우저로(Route Handler — 던지지 않는다). */
  write: (line: TalkLessonLine) => void;
  /** 서버가 요청을 받은 때(첫 문장 시간의 시작, 6.1). */
  requestReceivedAt?: Date;
  /** AI 를 부르기 직전에 한 번 — 구간마다 준비 시간(13절 C125 (4) · NFR-8). 아이 글은 들지 않는다. */
  onPrepTimings?: (timings: StageTimings) => void;
};

const turnSettings = {
  "talk.safety_max_turns": z.unknown(),
  "talk.safety_alert_count": z.unknown(),
  "talk.memory_summaries": z.unknown(),
  "talk.friendship_per_talk": z.unknown(),
  "talk.friendship_max": z.unknown(),
  "ai.timeout_seconds.realtime": z.number().positive(),
} as Record<string, z.ZodType>;

function logFailure(what: string, error: unknown) {
  if (error instanceof SettingMissingError)
    console.error(`${what} 실패(설정 ${error.key} 가 없습니다)`);
  else console.error(`${what} 실패(${dbErrorTag(error)})`);
}

/**
 * 그 프로필 회화 세션의 카드 꼴(talkCardKindOf — 세션 행 · 수업 행 한 번 읽기, 잠그지 않음). 세션이 없으면 undefined.
 */
async function sessionCardKindOf(
  db: DbOrTx,
  { sessionId, profileId }: { sessionId: string; profileId: string },
): Promise<ReturnType<typeof talkCardKindOf> | undefined> {
  const [row] = await db
    .select({ content: lessons.content })
    .from(sessions)
    .innerJoin(lessons, eq(lessons.id, sessions.lessonId))
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.profileId, profileId),
        eq(sessions.area, "talk"),
      ),
    );
  if (!row) return undefined;
  return talkCardKindOf((row.content as { card?: unknown } | null)?.card);
}

/**
 * 아이 말 하나(값 2). 줄은 write 로 흘려 보낸다(던지지 않는다). 끝에 늘 끝 줄(end · resting · break · close · stale · error) 하나.
 */
export async function runTalkTurnRequest(
  raw: unknown,
  deps: TurnDeps,
): Promise<void> {
  const { write } = deps;
  const parsed = TurnRequestSchema.safeParse(raw);
  if (!parsed.success) {
    write({ t: "error" });
    return;
  }
  const request = parsed.data;
  const db: Db = deps.db ?? getDb();
  const received = deps.requestReceivedAt ?? deps.now();
  // 구간마다 준비 시간(C125 (4)) — 차례로 기다리던 읽기는 서로 기대지 않는 것끼리 함께 돌린다
  const timer = createStageTimer(() => performance.now());
  try {
    const profile = await readHouseholdProfile({ db });
    timer.mark("profile");
    if (!profile) {
      write({ t: "error" });
      return;
    }
    const profileId = profile.id;
    const contact = getOutputCheckLists()
      .forbidden.patterns.filter((p) => p.category === "contact")
      .map((p) => p.regex);
    const [masker, s] = await Promise.all([
      maskerFor(db, profileId, contact),
      getSettings(turnSettings, { db, profileId }),
    ]);
    timer.mark("masker_settings");
    const at = deps.now();
    // 1-가 하루 안전 상한 확인은 세션 행 잡기와 함께 시작한다(서로 기대지 않음 — 결과는 턴 길이 씀). 일찍 끝나는 길에서도 놓친 거절이
    // 남지 않게 받아 둔다
    const restingP = aiRestingToday({ profileId, at }, { db });
    restingP.catch(() => {});
    // 새 꼴 카드 세션만 턴 길로(정한 것 1 · 2 — 세션이 없거나 옛 꼴 카드면 stale)
    if (
      (await sessionCardKindOf(db, {
        sessionId: request.sessionId,
        profileId,
      })) !== "new"
    ) {
      write({ t: "stale" });
      return;
    }
    await runTalkLessonTurn(request, deps, {
      db,
      profileId,
      masker,
      settings: s,
      at,
      received,
      restingP,
      timer,
    });
  } catch (error) {
    logFailure("회화 턴 길", error);
    write({ t: "error" });
  }
}
