import "server-only";
// 수업 안 한국어 질문 길(수업 안 한국어로 묻기 spec 판 3 설계 4 · 5, plan 묶음 4-나 · 접점 다, 13절 C221 · C225 · C226 (3)). Route Handler
// POST /api/talk/ko-help 가 부른다(접근 확인 · 같은 출처 · 본문 크기는 그 처리기). 차례: 입력 검증 → 프로필 · 가림 · 설정(끄는 스위치) · 'AI 쉬는 중'
// → 세션 상태(그 프로필의 열린 회화 수업 · 아이 차례가 열림 · 마무리 고르기가 아님) → 같은 시도 id 확인 → 질문 저장(talk_ko_helps 한 행) → 한국어
// 도움 호출 → 검사 · 대신 줄 → 같은 행에 답 채움 → 응답. talk_turns 는 읽기만 하고 고치지 않는다 — 한국어 문답은 학습 셈 어디에도 들지 않고
// '모름'이나 학습 실패로 다루지 않는다(C221 · C226 (3), spec 설계 6). AI 호출에 아이 이름을 보내지 않는다(질문은 가린 글). 로그에는 오류 이름만 남긴다.
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  koHelpFallbackLineOf,
  type TalkKoHelpFallbackShape,
  type TalkKoHelpInput,
  type TalkKoHelpOutput,
  talkKoHelpResultOf,
} from "@/core/ai/calls/talk-ko-help";
import { chatFlowRowsOf } from "@/core/conversation/chat-turn-core";
import { chatFirstQuestionBlocksOf } from "@/core/conversation/chat-turn-plan";
import { ClientListenSchema } from "@/core/conversation/client-listen";
import {
  KO_ASK_CONTEXT_TURNS_KEY,
  KO_ASK_MODE_KEY,
  koAskContextTurnsFrom,
  koAskModeFrom,
} from "@/core/conversation/ko-ask";
import {
  isKoHelpAnswered,
  type KoHelpFallback,
  koAskTurnOpenOf,
  koHelpEarlierOf,
  koHelpViewOf,
  nextKoHelpSeqOf,
  type TalkKoHelpAnswered,
} from "@/core/conversation/ko-help";
import { isChatSession } from "@/core/conversation/lead-mode";
import { isLowBand } from "@/core/conversation/lesson-turns";
import { talkKoHelps } from "@/db/schema/learning";
import { type AiOutcome, askKoHelp } from "@/server/ai";
import { allowedWordsOf, maskerFor } from "@/server/ai/run";
import { type Db, getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readHouseholdProfile } from "@/server/profile";
import {
  getOutputCheckLists,
  loadSeedList,
  seedTalkKoHelpLines,
} from "@/server/seed-lists";
import { levelContextOf } from "@/server/session/ai-context";
import { aiRestingToday } from "@/server/session/ai-gate";
import { getSettings, SettingMissingError } from "@/server/settings";
import {
  CLIENT_ATTEMPT_ID_MAX,
  HINT_TIERS_MAX,
  lessonCurrentOf,
  lessonHintTextOf,
  TALK_TEXT_MAX,
} from "./index";
import { lessonTeacherOf } from "./lesson-input";
import {
  isTalkOpen,
  readKoHelpRows,
  readTalkAnyState,
  type TalkKoHelpRow,
  type TalkLessonState,
  type TalkServerDeps,
  toriLinesOf,
} from "./state";

// ── 요청 · 응답(접점 다) ──────────────────────────────────────────

/**
 * 한국어 질문 요청. 질문 글자 수 상한은 회화 턴의 아이 글과 같다(TALK_TEXT_MAX). 연 힌트 단 수는 회화 턴 요청의 hint.opened 와 같은 믿음
 * 수준이고 같은 상한(HINT_TIERS_MAX)을 쓴다(plan 정한 것 6 · 검토 rev-b4b I-1 — 큰 수가 호출 앞 반복을 묶지 않게). 서버가 지금 질문 자리의
 * 단 수로 자른다. 듣기 요약은 글 없는 꼴이다(C149).
 */
export const KoHelpRequestSchema = z.strictObject({
  sessionId: z.uuid(),
  clientAttemptId: z.string().min(1).max(CLIENT_ATTEMPT_ID_MAX),
  question: z.string().trim().min(1).max(TALK_TEXT_MAX),
  hint: z.strictObject({ opened: z.int().min(0).max(HINT_TIERS_MAX) }),
  clientListen: ClientListenSchema.optional(),
});
export type KoHelpRequest = z.infer<typeof KoHelpRequestSchema>;

/**
 * 응답 한 건(회화 턴 끝점과 같은 꼴의 끝 줄 — ok 밖은 화면이 지금 꼴로 다룬다). ok 의 help 는 늘 답이 있는 꼴이다(sayKo · fallback 이 있음 —
 * 답이 아직 없는 꼴은 화면 자료 koHelps 에만 나온다, 검토 rev-b4b 4절 우려 2).
 */
export type KoHelpReply =
  | { t: "ok"; help: TalkKoHelpAnswered }
  | { t: "resting" }
  | { t: "stale" }
  | { t: "off" }
  | { t: "error" };

export type KoHelpDeps = TalkServerDeps & {
  /** 대신 줄 목록(시드 lists/talk-ko-help-lines.json). 시험이 바꾼다. */
  koHelpLines?: () => Readonly<
    Record<TalkKoHelpFallbackShape, readonly string[]>
  >;
};

/** 요청 본문 → 요청(순수). 꼴이 틀리면 null. */
export function parseKoHelpRequest(raw: unknown): KoHelpRequest | null {
  const parsed = KoHelpRequestSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** 끝점이 늘 읽는 설정(끄는 스위치 · 앞 대화 줄 수). 빠지면 SettingMissingError 로 드러난다(T-157 꼴). */
const koHelpSettings: Record<string, z.ZodType> = {
  [KO_ASK_MODE_KEY]: z.unknown(),
  [KO_ASK_CONTEXT_TURNS_KEY]: z.unknown(),
};

function logFailure(what: string, error: unknown) {
  if (error instanceof SettingMissingError)
    console.error(`${what} 실패(설정 ${error.key} 가 없습니다)`);
  else console.error(`${what} 실패(${dbErrorTag(error)})`);
}

// ── 호출 입력 · 답 고르기(DB 없는 몫 — 단위 시험이 본다) ───────────────

/** 선생님 행 글(화면 글 첫 줄 + 앱이 붙인 줄)을 한 줄로. */
const screenTextOf = (text: string | null) => {
  const { aiPart, appended } = toriLinesOf(text);
  return [aiPart, ...appended]
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join(" ");
};

/**
 * 선생님의 지금 말(화면 글 전체)과 소리 줄 글(1~3단계, 화면에 글로 보이지 않음). 이어 하기 자료(lessonCurrentOf)에서 가져온다 — 세 방식 공통.
 * 화면 글이 비면(소리 줄만 낸 차례) 선생님의 지금 말도 빈 글이다 — 소리 줄을 대신 넣지 않는다. 검사 뒤 값 고르기가 선생님의 지금 말을 이미 보인
 * 글로 치므로, 대신 넣으면 소리로만 들은 낱말이 새로 보인 영어에서 빠진다(설계 4 [N-4] · 검토 rev-b4b M-2). 소리 줄은 1~3단계 메시지에 따로 실린다.
 */
export function koHelpTeacherWordsOf(
  current: Pick<
    NonNullable<ReturnType<typeof lessonCurrentOf>>,
    "lines" | "sound" | "leadSound"
  > | null,
): { teacherLine: string; soundLine: string } {
  if (current === null) return { teacherLine: "", soundLine: "" };
  const teacherLine = current.lines
    .map((line) => line.en.trim())
    .filter((en) => en !== "")
    .join(" ");
  const sounds =
    current.leadSound !== undefined
      ? current.leadSound.map((line) => line.say)
      : [
          current.sound?.model,
          ...(current.sound?.choices ?? []),
          current.sound?.answer,
        ];
  const soundLine = sounds
    .filter(
      (say): say is string => typeof say === "string" && say.trim() !== "",
    )
    .map((say) => say.trim())
    .join(" / ");
  return { teacherLine, soundLine };
}

/** 한국어 도움 하나를 채울 값(talk_ko_helps 의 답 칸). */
export type KoHelpAnswer = {
  kind: TalkKoHelpOutput["kind"] | null;
  sayKo: string;
  teachEn: string;
  shownEn: string[];
  textShown: boolean;
  outOfRange: number;
  fallback: KoHelpFallback;
};

/**
 * 호출 결과 → 채울 값(설계 4 검사와 대신 처리). 실패 · 거절 · 타임아웃 · 설정 문제는 호출 실패 꼴의 대신 줄(갈래 없음), 검사가 답을 비웠으면
 * 검사 걸림 꼴의 대신 줄(모델이 낸 갈래는 남긴다)이다. 대신 줄은 그 차례의 순번으로 돌린다. 하루 안전 상한(safety_cap)은 여기 오지 않는다
 * (부르는 쪽이 'AI 쉬는 중'으로 끝낸다).
 */
export function koHelpAnswerOf(
  outcome: AiOutcome<TalkKoHelpOutput>,
  input: Parameters<typeof talkKoHelpResultOf>[1],
  {
    lines,
    seq,
  }: {
    lines: Readonly<Record<TalkKoHelpFallbackShape, readonly string[]>>;
    seq: number;
  },
): KoHelpAnswer {
  if (!outcome.ok)
    return {
      kind: null,
      sayKo: koHelpFallbackLineOf(lines, "call_failed", seq),
      teachEn: "",
      shownEn: [],
      textShown: false,
      outOfRange: 0,
      fallback: "call_failed",
    };
  const result = talkKoHelpResultOf(outcome.value, input);
  if (result.fallback === "check_blocked")
    return {
      kind: result.kind,
      sayKo: koHelpFallbackLineOf(lines, "check_blocked", seq),
      teachEn: "",
      shownEn: [],
      textShown: false,
      outOfRange: 0,
      fallback: "check_blocked",
    };
  return {
    kind: result.kind,
    sayKo: result.sayKo,
    teachEn: result.teachEn,
    shownEn: result.shownEn,
    textShown: result.textShown,
    outOfRange: result.outOfRange,
    fallback: "none",
  };
}

/**
 * 답을 채운 행 → 응답의 도움(그 아이 차례가 읽는 도움이라 가르친 표현 글을 싣는다 — 읽기 재료, 1~3단계 화면은 그리지 않는다). 답이 아직 없는
 * 행이면 null(부르는 쪽은 답을 채운 행만 넘긴다).
 */
function helpOfRow(row: TalkKoHelpRow): TalkKoHelpAnswered | null {
  const view = koHelpViewOf(row, { withTeach: true });
  return isKoHelpAnswered(view) ? view : null;
}

/** 답을 채운 행 → ok 응답(답이 없으면 error — 쓰는 길에서는 생기지 않는다). */
function okOfRow(row: TalkKoHelpRow): KoHelpReply {
  const help = helpOfRow(row);
  return help === null ? { t: "error" } : { t: "ok", help };
}

// ── 세션 상태 확인 · 질문 저장 ──────────────────────────────────────

type Begun =
  | { kind: "stale" }
  | { kind: "stored"; row: TalkKoHelpRow }
  | { kind: "call"; state: TalkLessonState; row: TalkKoHelpRow };

/** 지금 아이 차례가 한국어 질문을 받는가(회화 턴 끝점이 아이 말을 받는 조건 + 마무리 고르기가 아님). */
function turnOpen(state: TalkLessonState): boolean {
  const pos = state.position;
  return koAskTurnOpenOf({
    segment: state.segment,
    orphan: state.orphan !== null,
    closed: pos.closed,
    lastRowTeacher:
      pos.lastRow === "teacher" && state.liveRows.at(-1)?.speaker === "tori",
    firstQuestionDue: isChatSession(state)
      ? chatFirstQuestionBlocksOf(pos)
      : pos.firstQuestionDue,
    prepPending: pos.prepPending,
    choice: pos.choice,
  });
}

/**
 * 세션 행을 잡고(FOR UPDATE — 같은 세션의 순번이 겹치지 않게) 같은 시도 id 를 본 뒤 질문 행을 넣는다. 같은 시도 id 의 행이 다른 세션 것이면
 * stale 이다(시도 id 는 표 전체에서 유일 — 남의 세션 답을 돌려주지 않는다, 검토 rev-b4a 7절). 답이 있으면 그 답, 비어 있으면 같은 행으로
 * 다시 부른다(그 아이 차례가 아직 열려 있을 때만).
 */
async function beginKoHelp(
  db: Db,
  request: KoHelpRequest,
  {
    profileId,
    at,
    question,
  }: { profileId: string; at: Date; question: string },
): Promise<Begun> {
  return db.transaction(async (tx): Promise<Begun> => {
    const any = await readTalkAnyState(tx, {
      sessionId: request.sessionId,
      profileId,
      lock: true,
      at,
    });
    if (any?.kind !== "new" || !isTalkOpen(any.state.session))
      return { kind: "stale" };
    const state = any.state;
    const [own] = await tx
      .select()
      .from(talkKoHelps)
      .where(eq(talkKoHelps.clientAttemptId, request.clientAttemptId));
    const open = turnOpen(state);
    const turnNo = state.liveRows.at(-1)?.turnNo;
    if (own) {
      if (own.sessionId !== state.session.id) return { kind: "stale" };
      if (own.answeredAt !== null && own.sayKo !== null)
        return { kind: "stored", row: own };
      if (!open || own.turnNo !== turnNo) return { kind: "stale" };
      return { kind: "call", state, row: own };
    }
    if (!open || turnNo === undefined) return { kind: "stale" };
    const helps = await readKoHelpRows(tx, state.session.id);
    const [row] = await tx
      .insert(talkKoHelps)
      .values({
        sessionId: state.session.id,
        turnNo,
        seq: nextKoHelpSeqOf(helps, turnNo),
        clientAttemptId: request.clientAttemptId,
        question,
        ...(request.clientListen === undefined
          ? {}
          : { clientListen: request.clientListen }),
        askedAt: at,
      })
      .returning();
    if (!row) throw new Error("한국어 도움 행을 넣지 못했다");
    return { kind: "call", state, row };
  });
}

/** 호출 입력(설계 4 가변부 · 사용자 메시지). 아이 이름은 넣지 않는다 — 질문은 가린 글이고 선생님 말은 {NAME} 틀 그대로다. */
async function koHelpInputOf(
  db: Db,
  state: TalkLessonState,
  {
    question,
    opened,
    contextTurns,
    deps,
  }: {
    question: string;
    opened: number;
    contextTurns: number;
    deps: KoHelpDeps;
  },
): Promise<TalkKoHelpInput> {
  const revision = state.session.seedRevision ?? state.lessonRow.revision;
  const [ctx, allowedWords] = await Promise.all([
    levelContextOf(
      { area: "talk", level: state.level, unit: state.unit, revision },
      { db },
    ),
    allowedWordsOf(db, state.level),
  ]);
  const { teacherLine, soundLine } = koHelpTeacherWordsOf(
    lessonCurrentOf(state, { aiResting: false }),
  );
  // 이야기 방식의 힌트 단은 힌트 호출이 낸 글이라 여기서 다시 만들지 않는다(묶음 K 의 몫 — 보고 8절)
  const openedHints = isChatSession(state)
    ? []
    : Array.from({ length: opened }, (_, tier) =>
        lessonHintTextOf(state, tier),
      ).filter((text): text is string => text !== null);
  const flow = isChatSession(state)
    ? chatFlowRowsOf(state.liveRows)
    : state.liveRows;
  const before = flow.slice(0, -1).map((row) => ({
    who: row.speaker === "child" ? ("child" as const) : ("teacher" as const),
    text: row.speaker === "child" ? row.text : screenTextOf(row.text),
  }));
  const metaPhrases = (
    deps.ai?.metaPhrases ?? (() => loadSeedList("metaSentences").phrases)
  )();
  return {
    ...ctx,
    teacher: lessonTeacherOf(state),
    cardTopic: state.card.topic,
    teachShown: !isLowBand(state.spec),
    teacherLine,
    soundLine,
    openedHints,
    earlier: koHelpEarlierOf(before, contextTurns),
    question,
    check: { allowedWords, lemmaOf: state.lemmaOf, metaPhrases },
  };
}

// ── 한국어 질문 한 번 ─────────────────────────────────────────────

/** 한국어 질문 한 건 → 응답 한 건(던지지 않는다 — 예외는 error 로 닫는다). */
export async function runTalkKoHelpRequest(
  raw: unknown,
  deps: KoHelpDeps,
): Promise<KoHelpReply> {
  const request = parseKoHelpRequest(raw);
  if (!request) return { t: "error" };
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { t: "error" };
    const profileId = profile.id;
    const contact = (deps.ai?.lists ?? getOutputCheckLists)()
      .forbidden.patterns.filter((p) => p.category === "contact")
      .map((p) => p.regex);
    const at = deps.now();
    const [masker, s, resting] = await Promise.all([
      maskerFor(db, profileId, contact),
      getSettings(koHelpSettings, { db, profileId }),
      aiRestingToday({ profileId, at }, { db }),
    ]);
    const read = (key: string) => s[key];
    // 끄는 스위치(C221 · AC-25m): 끔이면 요청을 받지 않는다(행 없음)
    if (koAskModeFrom(read) !== "on") return { t: "off" };
    const contextTurns = koAskContextTurnsFrom(read);
    // 'AI 쉬는 중'(1-가 하루 안전 상한, 8절): 행을 넣지 않고 끝낸다
    if (resting) return { t: "resting" };
    // 아이 글은 이름 → {NAME} · 전화번호 · 주소 꼴을 가린 뒤 저장하고 보낸다(설계 4 입력 문단)
    const question = masker(request.question).text;
    const begun = await beginKoHelp(db, request, { profileId, at, question });
    if (begun.kind === "stale") return { t: "stale" };
    if (begun.kind === "stored") return okOfRow(begun.row);
    const { state, row } = begun;
    const input = await koHelpInputOf(db, state, {
      question: row.question,
      opened: request.hint.opened,
      contextTurns,
      deps,
    });
    const outcome = await askKoHelp(
      input,
      { profileId, sessionId: state.session.id, level: state.level },
      { db, clock: deps.now, ...deps.ai },
    );
    // 호출 앞 판정이 막았다(같은 때의 다른 호출로 상한에 닿음) — 'AI 쉬는 중'. 행은 답 없이 남고 아이 차례가 열려 있어 다시 물을 수 있다
    if (!outcome.ok && outcome.reason === "safety_cap") return { t: "resting" };
    const answer = koHelpAnswerOf(outcome, input, {
      lines: (deps.koHelpLines ?? seedTalkKoHelpLines)(),
      seq: row.seq,
    });
    // 답은 먼저 채운 쪽이 이긴다(답이 아직 없을 때만 채움 — 검토 rev-b4b I-2): 같은 시도 id 의 겹친 요청(기기가 끊긴 첫 요청을 다시 보냄)이
    // 둘 다 불렀어도 늦게 끝난 쪽은 행을 덮지 않고 저장된 답을 돌려준다. 그래서 어느 차례로 끝나도 응답과 행(이어 하기 · 다음 영어 턴이 읽음)이 같다
    const [saved] = await db
      .update(talkKoHelps)
      .set({
        kind: answer.kind,
        sayKo: answer.sayKo,
        teachEn: answer.teachEn === "" ? null : answer.teachEn,
        shownEn: answer.shownEn,
        textShown: answer.textShown,
        outOfRange: answer.outOfRange,
        fallback: answer.fallback,
        answeredAt: deps.now(),
      })
      .where(and(eq(talkKoHelps.id, row.id), isNull(talkKoHelps.answeredAt)))
      .returning();
    if (saved) return okOfRow(saved);
    const [stored] = await db
      .select()
      .from(talkKoHelps)
      .where(eq(talkKoHelps.id, row.id));
    return stored ? okOfRow(stored) : { t: "error" };
  } catch (error) {
    logFailure("한국어 질문 길", error);
    return { t: "error" };
  }
}
