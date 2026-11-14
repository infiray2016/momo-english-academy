import "server-only";
// 회화 턴 입구(plan-p13b 파일별 값 2 · 회화 plan 묶음 8 · 12 — Route Handler POST /api/talk/turn 이 부른다, C92 NDJSON). 접근 확인은 부르는
// Route Handler 의 첫 문장. 입력 Zod → 프로필 · 가림 · 설정 · 1-가 하루 안전 상한 확인을 함께 읽고 → 새 꼴 카드 세션이면 턴 길
// (lesson-turn.ts runTalkLessonTurn)로 보낸다. 세션이 없거나 옛 꼴 카드 세션이면 stale(화면이 자료를 다시 읽으면 옛 꼴 세션은 닫힌다 —
// 정한 것 2). 알림 기준(하루 호출 · 비용)은 막지 않는다(AC-8b). 로그에는 오류 이름 · Postgres 코드만(아이 글 없음).
// 아이 말 없는 요청 둘(묶음 S3 — 'Claude 주도' spec 설계 3 · 13절 C241): 화면이 토막 넘김의 leadTurn 'start'(대화 토막의 첫 차례) ·
// '더 이야기하기'의 leadTurn 'more' 를 받으면 { sessionId, lead } 만 보낸다. 같은 확인 · 같은 공통 값으로 새 엔진 입구(lead-turn.ts
// runLeadOpenTurn)에 잇는다. 아이 말 요청의 꼴은 그대로이고 두 꼴은 서로의 칸을 받지 않는다(strictObject 둘).
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  TALK_PROMPT_SETTING_SCHEMAS,
  TEACHER_SENTENCES_SETTING_SCHEMAS,
} from "@/core/ai/calls/talk-lesson";
import { chatRecognizerSchemaOf } from "@/core/conversation/chat-message";
import { CHAT_OPENS, type ChatOpen } from "@/core/conversation/chat-turn-plan";
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
import { chatSessionOf, lessonChatTurn, runChatOpenTurn } from "./chat-turn";
import { CLIENT_ATTEMPT_ID_MAX, TALK_TEXT_MAX } from "./index";
import { leadTurnAfterChild, runLeadOpenTurn } from "./lead-turn";
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
  /**
   * 인식기 정보(이야기 방식 spec 설계 11 · 묶음 P1 의 꼴 — 확신 정도 · 다른 후보 글 · 중간 결과만). 이야기 방식 수업만 읽고, 다른 후보 글은 다듬기 ·
   * 이름 가림을 지나 알림 줄(보낸 사용자 메시지)에만 남는다. 듣기 요약(client_listen)의 칸 이름(cf · na · int · mx)과는 층이 달라 맞추지 않는다.
   */
  recognizer: chatRecognizerSchemaOf(TALK_TEXT_MAX).optional(),
});

/**
 * 아이 말 없는 요청에서 부를 입구: 새 엔진(묶음 S3)의 start · more 와 이야기 방식(묶음 S1)의 quiet(조용함) · back(짧은 준비 뒤 돌아옴). 이야기 방식
 * 수업의 start 는 수업 첫 말이다. 값 목록은 chat-turn-plan CHAT_OPENS 하나다.
 */
const OPEN_REQUESTS = CHAT_OPENS;

/** 아이 말 없는 요청(묶음 S3 · S1): 수업 id 와 부를 입구 하나뿐. 아이 말 요청의 칸은 받지 않는다. */
const LeadOpenRequestSchema = z.strictObject({
  sessionId: z.uuid(),
  lead: z.enum(OPEN_REQUESTS),
});

/** 턴 요청 한 건: 아이 말 하나(지금 꼴) 또는 아이 말 없이 부르는 입구(묶음 S3 · S1). */
export type ParsedTurnRequest =
  | { kind: "child"; request: z.infer<typeof TurnRequestSchema> }
  | { kind: "open"; request: { sessionId: string; open: ChatOpen } };

/**
 * 턴 요청 본문 → 꼴 하나(순수). 아이 말 요청은 지금 TurnRequestSchema 그대로 먼저 본다(검증 · 결과 값이 지금과 같다). 그 꼴이 아니면 아이 말
 * 없는 요청 꼴을 본다. 둘 다 아니면 null.
 */
export function parseTalkTurnRequest(raw: unknown): ParsedTurnRequest | null {
  const child = TurnRequestSchema.safeParse(raw);
  if (child.success) return { kind: "child", request: child.data };
  const open = LeadOpenRequestSchema.safeParse(raw);
  if (open.success)
    return {
      kind: "open",
      request: { sessionId: open.data.sessionId, open: open.data.lead },
    };
  return null;
}

export type TurnDeps = TalkServerDeps & {
  /** 줄 하나를 브라우저로(Route Handler — 던지지 않는다). */
  write: (line: TalkLessonLine) => void;
  /** 서버가 요청을 받은 때(첫 문장 시간의 시작, 6.1). */
  requestReceivedAt?: Date;
  /** AI 를 부르기 직전에 한 번 — 구간마다 준비 시간(13절 C125 (4) · NFR-8). 아이 글은 들지 않는다. */
  onPrepTimings?: (timings: StageTimings) => void;
};

/** 회화 턴 길이 한 번에 읽는 설정(lesson-turn 이 positiveInt · teacherSentencesMaxOf 로 읽는 키 — 빠지면 턴이 오류가 된다). */
export const turnSettings = {
  "talk.safety_max_turns": z.unknown(),
  "talk.safety_alert_count": z.unknown(),
  "talk.memory_summaries": z.unknown(),
  "talk.friendship_per_talk": z.unknown(),
  "talk.friendship_max": z.unknown(),
  // 되묻기 상한(13절 C218 — 수업 상태 읽기 talkLessonSettingsFrom 이 0 이상 정수로 읽는다). 턴 입구 목록에도 두어 키가 빠진 DB 에서는
  // 턴 입구의 SettingMissingError 로 바로 드러나게 한다(장부 T-157 꼴, 내용 고침 2 plan 위험 2)
  "talk.ask_again_max": z.unknown(),
  "ai.timeout_seconds.realtime": z.number().positive(),
  // 턴 길의 길이 초과 기록이 읽는 선생님 문장 상한(lesson-turn teacherSentencesMaxOf — 빠지면 턴이 CallSettingError 로 오류가 된다)
  ...TEACHER_SENTENCES_SETTING_SCHEMAS,
  // 회화 턴 고정부 규칙 키(talk.self_line_every_turns · talk.greeting_recall) — 호출 안에서만 읽으면 빠졌을 때 1~3단계가 칭찬 대사로
  // 조용히 바뀌므로 턴 입구에서 SettingMissingError 로 드러나게 한다(장부 T-157, 회화 AI 몫 넓힘 plan 정한 것 2)
  ...TALK_PROMPT_SETTING_SCHEMAS,
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
 * 아이 말 하나(값 2) 또는 아이 말 없이 부르는 새 엔진 입구(묶음 S3). 줄은 write 로 흘려 보낸다(던지지 않는다). 끝에 늘 끝 줄(end · resting ·
 * break · close · stale · error) 하나. 입구는 새 방식의 수업이 아니거나 그 차례가 아니면 stale 이다(runLeadOpenTurn 이 정한다).
 */
export async function runTalkTurnRequest(
  raw: unknown,
  deps: TurnDeps,
): Promise<void> {
  const { write } = deps;
  const parsed = parseTalkTurnRequest(raw);
  if (!parsed) {
    write({ t: "error" });
    return;
  }
  const request = parsed.request;
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
    const shared = {
      db,
      profileId,
      masker,
      settings: s,
      at,
      received,
      restingP,
      timer,
      // 이야기 방식 수업의 처리기(lesson-turn 은 chat-turn 을 불러오지 않는다 — 의존 방향 검사 no-circular)
      chat: lessonChatTurn,
    };
    if (parsed.kind === "open") {
      // 아이 말 없는 요청 — 공통 값은 아이 차례와 같은 것(task-s1-report 3절). quiet · back 은 이야기 방식에만 있고, start · more 는 이야기 방식
      // 수업이면 그 입구로, 아니면 지금 새 엔진 입구로 간다(이야기 방식인지는 처음 스냅숏 · 단계만 읽어 본다)
      const { open, sessionId } = parsed.request;
      if (
        open === "quiet" ||
        open === "back" ||
        (await chatSessionOf(db, { sessionId, profileId }))
      ) {
        await runChatOpenTurn(parsed.request, deps, shared);
        return;
      }
      await runLeadOpenTurn({ sessionId, open }, deps, shared);
      return;
    }
    // 새 엔진 수업의 대화 차례 처리기는 여기서 넘긴다(lesson-turn.ts 는 lead-turn.ts 를 불러오지 않는다 — 의존 방향 검사 no-circular)
    await runTalkLessonTurn(parsed.request, deps, shared, leadTurnAfterChild);
  } catch (error) {
    logFailure("회화 턴 길", error);
    write({ t: "error" });
  }
}
