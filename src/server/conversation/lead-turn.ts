import "server-only";
// 새 회화 엔진의 턴 길(Claude 가 이끄는 대화, talk.lead_mode claude — 13절 C233 · C238 · C240, spec '회화 Claude 주도' 설계 1~8 · 데이터 절,
// plan 묶음 S1). lesson-turn.ts 의 아이 차례 길이 세션 잠금 · 같은 시도 다시 흘림 · 아이 행 저장 · 하루 안전 상한 · 대화 안전 상한을 지난 뒤,
// 처음 스냅숏의 방식이 claude 이고 대화 토막이면 여기로 온다(core leadTurnAppliesOf). 한 차례: 요청 조립(안내문 · 사실 알림 · 대화 기록) → 흘려 받기
// (첫 문장을 먼저 내보냄, 1~3단계 model_repeat 는 말 칸을 끝까지 받음) → 문장 문(지금 안전 검사 그대로) → 좁은 정의에 걸린 질문만 같은 뜻 다시
// 말하기 한 번 → 1~3단계 글 빼기 → 줄 내보내기 → 행 저장. 그 밖에는 응답을 고쳐 쓰지 않고, 차례 종류 · 질문 여부 · 도움 순서 · 카드 전환을
// 정하지 않는다. 판단은 core lead-turn-core(대본 도구와 같은 함수, NFR-4)가 하고 여기는 DB · 호출 · 줄만 맡는다. 아이 글 · AI 글을 로그에 내지
// 않는다(오류 이름 · Postgres 코드만).
// 불러오기 방향(의존 방향 검사 no-circular — 묶음 S1 CI 고침): 이 파일은 lesson-turn.ts 의 형 · 도우미를 불러오고, lesson-turn.ts 는 이 파일을
// 형으로도 값으로도 불러오지 않는다. 갈림의 판단은 lesson-turn 이 core leadTurnAppliesOf 를 직접 부르고, 아이 차례 뒤 처리기(leadTurnAfterChild)는
// 부르는 쪽 turn.ts 가 runTalkLessonTurn 의 인자로 넘긴다(lesson-turn 의 LessonLeadAfterChild 꼴).
import { and, eq, notInArray, sql } from "drizzle-orm";
import type { LevelContext } from "@/core/ai/calls/common";
import {
  type TalkLeadCefr,
  type TalkLeadInput,
  type TalkLeadOutput,
  talkLeadAssistantOf,
  talkLeadTextOf,
  talkLeadTurnSpec,
  talkLeadUserMessage,
} from "@/core/ai/calls/talk-lead";
import {
  isLowBandLevel,
  type TalkInputMode,
  talkSceneWordsOf,
  teacherSentencesMaxOf,
} from "@/core/ai/calls/talk-lesson";
import {
  type LeadFormRule,
  type LeadLevelInput,
  leadNarrowHitsOf,
  leadNarrowItemOf,
  leadNarrowOutcomeOf,
  leadNarrowRetryPrompt,
  leadWideCheckOf,
} from "@/core/conversation/lead-level";
import { leadKoLineOf } from "@/core/conversation/lead-low-band";
import {
  type LeadExtra,
  leadPrevStuckOf,
  leadTeacherMoveOf,
} from "@/core/conversation/lead-record";
import {
  createLeadSentenceFlow,
  LEAD_NARROW_RECORD_TAG,
  LEAD_OPEN_ACTIVITY_NO,
  LEAD_OPEN_INPUT,
  LEAD_RECORD_TAG,
  type LeadOpen,
  type LeadTextOf,
  leadAiQuestionOf,
  leadChildFieldsOf,
  leadChildHelpAfterOf,
  leadChildHelpOfRow,
  leadChildOf,
  leadChildStuckOf,
  leadClosingAddsOf,
  leadClosingTurnOf,
  leadConversationOrder,
  leadExplanationOf,
  leadExtraOf,
  leadFailedMoveKindOf,
  leadFirstTurnOf,
  leadFlowPrevStuckOf,
  leadGateOf,
  leadGreetingOf,
  leadHintsOf,
  leadHistoryOf,
  leadHoldSayOf,
  leadKeptSoundOf,
  leadMoveWithSound,
  leadNarrowTargetOf,
  leadOpenAcceptsOf,
  leadOpenAttemptId,
  leadOpenChildOf,
  leadOpenReplayOf,
  leadSaidOf,
  leadSettleOf,
  leadSoundLinesOf,
  leadStatusOf,
  leadTurnAppliesOf,
  talkLeadRetrySpec,
} from "@/core/conversation/lead-turn-core";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import { childCauseOf } from "@/core/conversation/lesson-turns";
import {
  readTalkMove,
  type TalkMove,
  talkMoveOf,
} from "@/core/conversation/move";
import { turnQuestionOf } from "@/core/conversation/question-check";
import { metWordsIn } from "@/core/conversation/said";
import { allowedLemmaOfVocab } from "@/core/conversation/situation";
import { MORE_PROMPT } from "@/core/conversation/spoken";
import { checkToriSentence } from "@/core/conversation/stream";
import { CEFRS, type Cefr, LEVEL_MAX } from "@/core/seed/structure";
import { buildLexicon, type LexiconEntry } from "@/core/seed/text";
import { vocab } from "@/db/schema/content";
import { attempts, sessions, talkTurns } from "@/db/schema/learning";
import { aiCalls } from "@/db/schema/operations";
import { runAiCall } from "@/server/ai/run";
import { type TalkLeadOutcome, talkLeadTurn } from "@/server/ai/talk";
import type { Db } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readLevelSpec } from "@/server/seed/read";
import {
  getOutputCheckLists,
  loadSeedList,
  seedHomophones,
} from "@/server/seed-lists";
import { levelContextOf } from "@/server/session/ai-context";
import { SettingMissingError } from "@/server/settings";
import { completeTalk, insertClosingRecord } from "./closing";
import {
  emptyLessonRange,
  type LessonRange,
  lessonRangeOf,
  lessonSafeLineOf,
  lessonTeacherOf,
  lineOptionsOf,
} from "./lesson-input";
import {
  type LessonAiQuestion,
  type LessonTurnDeps,
  type LessonTurnShared,
  lessonArgsOf,
  lessonChildLiteOf,
  lessonNextOf,
  lessonOutcomeViewOf,
  lessonOverLengthOf,
  lessonWrapLinesOf,
  questionRetryFits,
  replayLesson,
  seedLessonTalkLists,
  type TalkLessonLine,
  turnInFlight,
} from "./lesson-turn";
import {
  isTalkOpen,
  positiveInt,
  readTalkLessonState,
  snapshotNumber,
  type TalkLessonState,
  type TalkTurnRow,
  toriTextOf,
  writeSay,
} from "./state";

/** 초 → ms(단위 바꿈 상수 — lesson-turn.ts 와 같다). */
const MS_PER_SECOND = 1000;

/** 새 엔진 턴 길의 의존: 지금 턴 길의 것 + 안내문 글 출처(기본 talkLeadTextOf — 시험이 1단계 시드로 새 엔진을 돌리게 바꾼다). */
export type LeadTurnDeps = LessonTurnDeps & { leadText?: LeadTextOf };

/**
 * 이 아이 차례 뒤 선생님 차례를 새 엔진이 만드는가(spec 설계 1): 세션 판단은 isLeadSession(처음 스냅숏 · 단계 — 묶음 S2), 토막 조건은 S1
 * (core leadTurnAppliesOf). 지금 설정 값(state.settings.leadMode)은 읽지 않는다(묶음 M 검토 M-3).
 */
export function leadTurnApplies(
  state: Pick<TalkLessonState, "start" | "segment" | "level">,
): boolean {
  return leadTurnAppliesOf(state);
}

function logFailure(what: string, error: unknown) {
  if (error instanceof SettingMissingError)
    console.error(`${what} 실패(설정 ${error.key} 가 없습니다)`);
  else console.error(`${what} 실패(${dbErrorTag(error)})`);
}

const stringsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];

/** 회화 단계 규격 두 행(이 단계 · 다음 단계)의 CEFR(안내문 수준 자리, 묶음 R1 확인할 것 4). 이 단계 값이 없으면 던진다. */
async function leadCefrOf(
  db: Db,
  level: number,
  revision: number,
): Promise<TalkLeadCefr> {
  const read = (l: number) =>
    l > LEVEL_MAX
      ? Promise.resolve(undefined)
      : readLevelSpec(
          { area: "talk", level: l, startRevision: revision },
          { db },
        );
  const [here, next] = await Promise.all([read(level), read(level + 1)]);
  const asCefr = (v: unknown): Cefr | null =>
    (CEFRS as readonly unknown[]).includes(v) ? (v as Cefr) : null;
  const cefr = asCefr(here?.cefr);
  if (cefr === null)
    throw new Error(`회화 ${level}단계 규격의 CEFR 을 읽지 못했다`);
  return { level: cefr, next: asCefr(next?.cefr) };
}

/** 모든 단계 어휘(좁은 정의의 단계 · 품사 사전과 허용 낱말 원형 — vocab.json 과 같은 행, 묶음 R4 LeadLevelInput.lexicon). */
async function readLexiconEntries(db: Db): Promise<LexiconEntry[]> {
  const rows = await db
    .select({
      word: vocab.word,
      pos: vocab.partsOfSpeech,
      level: vocab.bandLevel,
      forms: vocab.forms,
    })
    .from(vocab);
  return rows.map((r) => ({
    word: r.word,
    pos: [...r.pos],
    level: r.level,
    forms: stringsOf(r.forms),
  }));
}

/** 좁은 정의 다시 말하기 호출 뒤 그 호출의 ai_calls 행에 표지를 단다(runAiCall 은 표지 자리가 없어 앞뒤 행 차이로 고른다). 실패는 기록만. */
async function tagNarrowRows(
  db: Db,
  { sessionId, before }: { sessionId: string; before: readonly string[] },
): Promise<void> {
  try {
    await db
      .update(aiCalls)
      .set({
        errorCode: sql`case when ${aiCalls.errorCode} is null then ${LEAD_NARROW_RECORD_TAG} else ${LEAD_NARROW_RECORD_TAG} || ':' || ${aiCalls.errorCode} end`,
      })
      .where(
        and(
          eq(aiCalls.sessionId, sessionId),
          eq(aiCalls.purpose, "talk_turn"),
          ...(before.length > 0 ? [notInArray(aiCalls.id, [...before])] : []),
        ),
      );
  } catch (error) {
    console.error(`회화 다시 말하기 기록 표지 실패(${dbErrorTag(error)})`);
  }
}

/**
 * 입구가 호출 전에 넣은 겹친 요청 막기 표지(시도 id · 넣은(고쳐 잡은) 시각). called 는 회화 턴 호출을 내보내기 직전에 참이 된다 — 그 전에 끝나는
 * 길(안내문 글 없음 · 재료 읽기 예외 등)은 표지를 지운다(13절 C241 보완 2 '호출하지 않고 끝나는 길에서는 표지를 남기지 않는다', 검토 rev-s1-2 N-1).
 * 호출이 나간 뒤의 실패는 ai_calls 행이 있어 지금 규칙(turnInFlight)대로 둔다.
 */
type LeadOpenClaim = { id: string; at: Date; called: boolean };

/** 이 차례를 연 것: 아이 말(아이 행이 이미 저장됨) 또는 아이 말 없이 부르는 입구(대화 토막 첫 차례 · 더 이야기하기 — 아이 행 없음). */
type LeadEntry =
  | { kind: "child"; child: TalkTurnRow }
  | { kind: "open"; open: LeadOpen; turnNo: number; claim: LeadOpenClaim };

/** 호출 전에 끝난 입구의 표지를 지운다(시도 id 와 그 요청이 넣은 시각이 같을 때만 — 그 사이 다른 요청이 고쳐 잡았으면 남긴다). 실패는 기록만. */
async function releaseOpenClaim(db: Db, claim: LeadOpenClaim): Promise<void> {
  try {
    await db
      .delete(attempts)
      .where(
        and(
          eq(attempts.clientAttemptId, claim.id),
          eq(attempts.attemptedAt, claim.at),
        ),
      );
  } catch (error) {
    console.error(`회화 새 엔진 입구 표지 지우기 실패(${dbErrorTag(error)})`);
  }
}

/** 카드 대사 한 줄(뜻은 그 단계가 뜻 줄을 보일 때만 — lesson-turn.ts 의 내보내지 않은 lineOf 와 같은 꼴). */
function cardLineOf(
  line: { en: string; ko?: string | undefined },
  koMeaning: boolean,
): { en: string; ko?: string } {
  return {
    en: line.en,
    ...(koMeaning && line.ko !== undefined ? { ko: line.ko } : {}),
  };
}

/**
 * 아이 말 뒤 새 엔진의 선생님 차례(spec 설계 1~8). 줄은 write 로 흘려 보낸다(던지면 lesson-turn 의 바깥 잡기가 error 줄로 닫는다). 끝에 늘 끝 줄
 * (end · break · stale · error) 하나.
 */
export function leadTurnAfterChild(
  state: TalkLessonState,
  child: TalkTurnRow,
  deps: LeadTurnDeps,
  shared: LessonTurnShared,
  ctxP: Promise<LevelContext>,
): Promise<void> {
  return leadTeacherTurn(state, { kind: "child", child }, deps, shared, ctxP);
}

/**
 * 아이 말 없이 부르는 입구(검토 rev-s2 I-2 — 화면이 토막 넘김의 leadTurn start · 더 이야기하기의 leadTurn more 를 받으면 턴 요청으로 부른다,
 * 묶음 S3 가 turn.ts 에서 잇는다). 아이 행을 만들지 않고 턴 셈 · 대화 안전 상한에 넣지 않는다. 받지 않는 때는 stale, 같은 입구를 다시 보내
 * 그 입구가 쓴 행이 마지막 행이면 저장한 행을 그대로 다시 흘린다(AI 없음). 'AI 쉬는 중'이면 아이 차례 길과 같은 규칙(8절)으로, 참여 완료 전
 * (대화 토막 첫 차례)은 resting, 참여 완료 뒤('더 이야기하기')는 수업을 정리로 닫고 close 줄(쉬는 중 · 되짚을 말)을 낸다(화면 묶음 S3 보고 4절 1 —
 * 쉬는 줄만 내면 참여 완료를 한 아이가 정리에 닿지 못한다). 같은 차례의 입구가 아직 돌고 있으면
 * (화면의 다시 보냄 · 연결 끊김 뒤 다시 부름) stale 이다 — 잠금 안에서 호출 전에 표지 행(leadOpenAttemptId)을 넣고, 이미 있으면 그 시각부터
 * 지금 길의 막기(turnInFlight)로 가린다(검토 rev-s1 I-3 — 호출이 두 번 나가거나 아이가 들은 말과 저장된 행이 달라지지 않게).
 */
export async function runLeadOpenTurn(
  request: { sessionId: string; open: LeadOpen },
  deps: LeadTurnDeps,
  shared: LessonTurnShared,
): Promise<void> {
  const { write } = deps;
  const { db, profileId, at, timer, settings: s } = shared;
  try {
    // 쉬는 중 확인은 잠금 밖에서 기다린다(세션 잠금을 쥔 채 다른 연결의 질의를 기다리지 않게 — 연결 풀이 잠금을 기다리는 요청으로 차면 막힌다)
    const resting = await shared.restingP;
    const begun = await db.transaction(
      async (
        tx,
      ): Promise<
        | { kind: "stale" }
        | { kind: "resting" }
        | { kind: "close"; state: TalkLessonState }
        | { kind: "replay"; state: TalkLessonState; teacher: TalkTurnRow }
        | {
            kind: "call";
            state: TalkLessonState;
            turnNo: number;
            claim: LeadOpenClaim;
          }
      > => {
        const state = await readTalkLessonState(tx, {
          sessionId: request.sessionId,
          profileId,
          lock: true,
          at,
        });
        if (!state || !isTalkOpen(state.session)) return { kind: "stale" };
        const pos = state.position;
        const last = state.liveRows.at(-1);
        if (
          !leadTurnAppliesOf(state) ||
          state.orphan ||
          pos.closed ||
          pos.lastRow !== "teacher" ||
          last?.speaker !== "tori"
        )
          return { kind: "stale" };
        if (leadOpenReplayOf(request.open, last))
          return { kind: "replay", state, teacher: last };
        if (
          !leadOpenAcceptsOf(request.open, {
            segment: state.segment,
            firstQuestionDue: pos.firstQuestionDue,
            choice: pos.choice,
          })
        )
          return { kind: "stale" };
        // 'AI 쉬는 중'이면 표지 행을 남기지 않고 닫는다(쉬는 중이 풀린 뒤 다시 부르면 바로 받게). 값은 트랜잭션 앞에서 기다려 둔 것이다.
        // 아이 차례 길(lesson-turn.ts (4))과 같은 규칙: 참여 완료 전이면 쉼(세션 진행), 뒤면 정리로 닫고 끝맺음은 미룬다(쉬는 중이 풀린 뒤
        // 홈 진입이 부른다). 닫기는 그 길의 closeLessonOnTurn 의 참여 완료 뒤 갈래와 같다(토막 wrap_up · 끝맺음 기록 대기 — 그 함수는
        // 내보내지 않아 같은 두 쓰기를 여기 둔다, 보고 '확인할 것')
        if (resting) {
          if (state.session.status !== "completed") return { kind: "resting" };
          await tx
            .update(sessions)
            .set({ talkSegment: "wrap_up" })
            .where(eq(sessions.id, state.session.id));
          await insertClosingRecord(tx, {
            sessionId: state.session.id,
            at,
            reason: "resting",
          });
          return { kind: "close", state };
        }
        const turnNo =
          state.rows.reduce((max, r) => Math.max(max, r.turnNo), 0) + 1;
        const id = leadOpenAttemptId(state.session.id, turnNo);
        const claimed = await tx
          .insert(attempts)
          .values({
            sessionId: state.session.id,
            clientAttemptId: id,
            activityNo: LEAD_OPEN_ACTIVITY_NO,
            input: LEAD_OPEN_INPUT,
            attemptedAt: at,
            status: "done",
          })
          .onConflictDoNothing({ target: attempts.clientAttemptId })
          .returning({ id: attempts.id });
        if (claimed.length === 0) {
          const [prior] = await tx
            .select({ attemptedAt: attempts.attemptedAt })
            .from(attempts)
            .where(eq(attempts.clientAttemptId, id));
          if (
            prior !== undefined &&
            (await turnInFlight(tx, {
              sessionId: state.session.id,
              since: prior.attemptedAt,
              at,
              timeoutMs:
                (s["ai.timeout_seconds.realtime"] as number) * MS_PER_SECOND,
            }))
          )
            return { kind: "stale" };
          // 앞 요청이 행을 남기지 못하고 끝났다(호출이 끊겨 남은 표지) — 읽은 옛 시각을 조건으로 표지 시각을 이 요청으로 고쳐 잡는다. 고쳐
          // 잡기도 한 요청만 성공한다(끊긴 뒤 다시 부르는 요청이 겹쳐도 호출이 한 번만 나가게)
          if (!prior) return { kind: "stale" };
          const moved = await tx
            .update(attempts)
            .set({ attemptedAt: at })
            .where(
              and(
                eq(attempts.clientAttemptId, id),
                eq(attempts.attemptedAt, prior.attemptedAt),
              ),
            )
            .returning({ id: attempts.id });
          if (moved.length === 0) return { kind: "stale" };
        }
        return {
          kind: "call",
          state,
          turnNo,
          claim: { id, at, called: false },
        };
      },
    );
    if (begun.kind === "stale") {
      write({ t: "stale" });
      return;
    }
    if (begun.kind === "resting") {
      write({ t: "resting" });
      return;
    }
    if (begun.kind === "close") {
      write({
        t: "close",
        reason: "resting",
        lines: lessonWrapLinesOf(begun.state),
        farewell: cardLineOf(
          begun.state.card.farewell,
          begun.state.spec.koMeaning,
        ),
      });
      return;
    }
    if (begun.kind === "replay") {
      replayLesson(begun.state, begun.teacher, deps);
      return;
    }
    const { state, turnNo, claim } = begun;
    timer.mark("state");
    try {
      const revision = state.session.seedRevision ?? state.lessonRow.revision;
      const ctxP = levelContextOf(
        { area: "talk", level: state.level, unit: state.unit, revision },
        { db },
      );
      ctxP.catch(() => {});
      await leadTeacherTurn(
        state,
        { kind: "open", open: request.open, turnNo, claim },
        deps,
        shared,
        ctxP,
      );
    } catch (error) {
      // 호출 전의 예외(재료 읽기 · 단계 맥락 등)면 표지를 지우고 바깥 잡기가 error 줄로 닫는다(검토 rev-s1-2 N-1)
      if (!claim.called) await releaseOpenClaim(db, claim);
      throw error;
    }
  } catch (error) {
    logFailure("회화 새 엔진 입구", error);
    write({ t: "error" });
  }
}

async function leadTeacherTurn(
  state: TalkLessonState,
  entry: LeadEntry,
  deps: LeadTurnDeps,
  shared: LessonTurnShared,
  ctxP: Promise<LevelContext>,
): Promise<void> {
  const { write } = deps;
  const { db, profileId, masker, settings: s, received, timer } = shared;
  const text = (deps.leadText ?? talkLeadTextOf)(state.level, state.unit);
  if (text === null) {
    // 안내문 글이 아직 없는 단원(spec 미결 2) — 새 엔진을 열 수 없다. 지금 길로 바꾸면 한 세션에 두 길이 섞이므로 오류로 닫는다(보고 확인할 것).
    // 입구 차례는 호출하지 않고 끝나므로 표지를 지운다(검토 rev-s1-2 N-1)
    console.error(
      `회화 새 엔진 안내문 글이 없는 단원이다(${state.level}단계 단원 ${state.unit})`,
    );
    if (entry.kind === "open") await releaseOpenClaim(db, entry.claim);
    write({ t: "error" });
    return;
  }
  const child = entry.kind === "child" ? entry.child : null;
  const open = entry.kind === "open" ? entry.open : null;
  const position = state.position;
  const level = state.level;
  const low = isLowBandLevel(level);
  const mode = (child?.inputMode ?? "speech") as TalkInputMode;
  const nospeech =
    (child?.clientListen as { src?: unknown } | null | undefined)?.src ===
    "nospeech";
  const input = { mode, nospeech };
  const speech = child !== null && mode === "speech";
  const heard = child?.text ?? "";
  const args = lessonArgsOf(state);
  const liteOf = (stuck: boolean) =>
    lessonChildLiteOf(position, input, state.settings, stuck);
  const positionAfter = (stuck: boolean) =>
    talkLessonPositionOf({ ...args, turns: [...args.turns, liteOf(stuck)] });
  // 마무리 물음을 꺼내는 때는 지금 그대로 앱이 정한다(참고 턴 · 더 이야기하기 한 바퀴 끝 — 말로 답한 차례, 지금 answeredPlan 과 같은 때)
  const closing = leadClosingTurnOf({
    speech,
    positionAfter: () => positionAfter(false),
  });
  const rows = leadConversationOrder(state.liveRows);
  const prevTeacher = rows.findLast((r) => r.speaker === "tori") ?? null;
  const prevMove = readTalkMove(prevTeacher?.move);
  const askedChild = rows.findLast((r) => r.speaker === "child") ?? null;
  const lists = (deps.talkLists ?? seedLessonTalkLists)();
  const homophones = (deps.homophones ?? seedHomophones)();
  const revision = state.session.seedRevision ?? state.lessonRow.revision;
  const checkLists = (deps.ai?.lists ?? getOutputCheckLists)();
  const forbidden = checkLists.forbidden;
  const metaPhrases = (
    deps.ai?.metaPhrases ?? (() => loadSeedList("metaSentences").phrases)
  )();
  const timeoutMs =
    (s["ai.timeout_seconds.realtime"] as number) * MS_PER_SECOND;
  const teacherTurnNo =
    entry.kind === "child" ? entry.child.turnNo + 1 : entry.turnNo;
  const segment = child?.segment ?? state.segment;

  // (1) 재료(나란히): 단계 맥락 · 범위(지금 질문 검사와 같은 범위) · 모든 단계 어휘 · CEFR
  const [ctx, rangeRead, lexiconRows, cefr] = await Promise.all([
    ctxP,
    lessonRangeOf(db, state, heard).catch((error: unknown) => {
      console.error(
        `회화 새 엔진 범위 재료를 읽지 못했다(${error instanceof Error ? error.name : "Error"})`,
      );
      return null;
    }),
    readLexiconEntries(db).catch((error: unknown) => {
      console.error(
        `회화 새 엔진 어휘 사전을 읽지 못했다(${dbErrorTag(error)})`,
      );
      return null;
    }),
    leadCefrOf(db, level, revision),
  ]);
  timer.mark("checks_context");
  const unitWords = ctx.unitWords;
  const teacher = lessonTeacherOf(state);
  const range: LessonRange = rangeRead ?? emptyLessonRange(state);
  const lineOptions = lineOptionsOf({
    sentenceMaxWords: ctx.sentenceMaxWords,
    unitWords,
    teacher,
    lineRange: range.lineRange,
    lemmaOf: range.lemmaOf,
    homophones,
  });
  const allowed = new Set(lists.allowed.allowed);
  const allowedLemmaOf =
    lexiconRows === null
      ? undefined
      : allowedLemmaOfVocab(lexiconRows, lists.allowed.allowed);
  // 좁은 정의 · 힌트 범위 재료(spec 설계 6). 범위를 읽지 못한 차례는 좁은 정의를 보지 않고(질문을 지우지 않음) 힌트 단추를 내지 않는다
  let levelInput: LeadLevelInput | null = null;
  if (rangeRead !== null && lexiconRows !== null) {
    try {
      levelInput = {
        level,
        range: lineOptions,
        forms: loadSeedList("forms").forms as readonly LeadFormRule[],
        lexicon: buildLexicon(lexiconRows),
        promptLines: [text.topicEn, text.sentencesLikeEn],
        allowed,
        allowedLemmaOf,
      };
    } catch (error) {
      console.error(
        `회화 새 엔진 형태 표를 읽지 못했다(${error instanceof Error ? error.name : "Error"})`,
      );
    }
  }
  const hitsOf = (sentence: string) =>
    levelInput === null ? [] : leadNarrowHitsOf(sentence, levelInput);
  const sceneWords = talkSceneWordsOf({ card: state.card, unitWords });
  const stuckOfReading = (reading: unknown) =>
    child === null
      ? false
      : leadChildStuckOf({ reading, mode, heard, sceneWords, homophones });

  // (2) 요청 조립(안내문 · 사실 알림 · 대화 기록 — spec 설계 2). 입구 차례는 아이 차례 줄 · 소리 귀띔이 없다(턴 셈 밖)
  const history = leadHistoryOf(rows);
  // 첫 차례는 대화 토막의 선생님 행이 없을 때뿐이다(입구 차례가 실패해 기록 쌍이 비어도 인사 이음을 다시 싣지 않음 — 검토 rev-s1 M-1)
  const first = leadFirstTurnOf(rows);
  const status = leadStatusOf({
    rows,
    hasChild: child !== null,
    speech,
    heard,
    turnsLeft: position.turnsLeft,
    unitWords,
    homophones,
    soundAlikes: lists.soundAlikes ?? [],
    lemmaOf: state.lemmaOf,
    open,
    closing,
  });
  const leadInput: TalkLeadInput = {
    ...ctx,
    teacher,
    cefr,
    text,
    history,
    turn: {
      child:
        open !== null
          ? leadOpenChildOf(open)
          : leadChildOf({ mode, nospeech, heard }),
      ...(first ? { greeting: leadGreetingOf(rows) } : {}),
      status,
    },
  };
  const sentUserMessage = talkLeadUserMessage(
    talkLeadTurnSpec.mask(leadInput, masker).turn,
  );
  timer.mark("input");

  // (3) 흘려 받기 — 문장 문(지금 안전 검사)을 지난 문장을 바로 보내고, 좁은 정의 · 1~3단계 막힌 뒤 고르기 물음부터는 붙잡는다. 읽기 · 행동 칸은
  // 붙잡기 콜백(holdSay)으로만 받는다(R6 — 새 엔진에서는 막힘 콜백이 불리지 않음). 문장 콜백은 늘 넘긴다(R6 검토)
  const send = (en: string) => {
    try {
      write({ t: "s", en });
    } catch {
      // 브라우저 연결이 닫혀도 응답을 끝까지 받아 선생님 행을 저장한다
    }
  };
  const flow = createLeadSentenceFlow({
    low,
    closing,
    prevStuck: (heads) =>
      leadFlowPrevStuckOf({
        hasChild: child !== null,
        mode,
        nospeech,
        reading: heads.reading,
        heard,
        sceneWords,
        homophones,
      }),
    hitsOf,
  });
  const holdOf = leadHoldSayOf(level);
  const safeLine = lessonSafeLineOf(state, history.length + 1);
  let outcome: TalkLeadOutcome;
  // 여기부터는 호출이 나간 차례다 — 입구 표지는 지금 규칙(turnInFlight)대로 남긴다(검토 rev-s1-2 N-1)
  if (entry.kind === "open") entry.claim.called = true;
  try {
    outcome = await talkLeadTurn(
      leadInput,
      {
        profileId,
        sessionId: state.session.id,
        level,
        requestReceivedAt: received,
        safeLine,
        recordTag: LEAD_RECORD_TAG,
        onPrepared: () => {
          timer.mark("ai_prep");
          deps.onPrepTimings?.(timer.result());
        },
        holdSay: (heads) => {
          flow.heads(heads);
          return holdOf(heads);
        },
        onSentence: (en) => {
          if (flow.accept(en)) send(en);
        },
      },
      { db, clock: deps.now, ...deps.ai },
    );
  } catch (error) {
    logFailure("회화 새 엔진 턴", error);
    outcome = { ok: false, reason: "server", refusals: 0 };
  }

  // 되물은 뒤의 답(02-2 259줄): 앞 선생님 행이 새 엔진의 되묻기면 되물은 아이 차례의 힌트 칸을 하한으로 이어 받는다
  const { help, fields: helpFields } = leadChildHelpAfterOf({
    own: child === null ? null : leadChildHelpOfRow(child),
    prevMove,
    asked: askedChild === null ? null : leadChildHelpOfRow(askedChild),
  });
  const sentenceMax = teacherSentencesMaxOf(s, level);
  const save = {
    state,
    child,
    deps,
    shared,
    args,
    turnNo: teacherTurnNo,
    segment,
  };

  // (4-가) 응답이 없는 차례(지금 실패 규칙 그대로 — 거절 · 두 번 실패 · 설정 · 안전 상한은 카드 안전한 대사, 첫 문장 뒤 끊김은 보낸 문장으로 닫음)
  if (!outcome.ok) {
    let shown: string[];
    let ko: string | null = null;
    let sound: { model?: string; answer?: string } = {};
    if (outcome.reason === "cut_after_first") {
      // 첫 문장 뒤 끊김: 보낸 문장으로 닫는다. 붙잡아 둔 문장(좁은 정의 · 1~3단계 막힌 뒤 고르기 물음)도 지우지 않고 같은 끝 처리로 낸다
      // (고르기 물음은 소리 줄, 그 밖은 글 — 다시 말하기는 부르지 않는다). 앞 칸을 못 읽었으면 보낸 문장만이다
      const cutMove = flow.move();
      if (cutMove === undefined) {
        shown = outcome.sentSentences.slice(0, flow.sentCount());
      } else {
        const cut = leadSettleOf({
          level,
          move: cutMove,
          prevStuck: flow.prevStuck(),
          closing,
          modelSentence: "",
          sentences: outcome.sentSentences,
          sentCount: flow.sentCount(),
          held: false,
          narrow: null,
        });
        for (const en of cut.release) send(en);
        shown = cut.shown;
        sound = cut.sound;
      }
    } else {
      const view = lessonOutcomeViewOf(outcome, {
        low,
        koMeaning: state.spec.koMeaning,
        safeLines: state.card.safeLines,
        safeLine,
        turnNo: child?.turnNo ?? teacherTurnNo,
        situation: null,
      });
      if (view.kind === "break") {
        write({ t: "break", ...view.line });
        return;
      }
      if (view.kind !== "line") {
        write({ t: "error" });
        return;
      }
      send(view.line.en);
      ko = view.line.ko ?? null;
      shown = [view.line.en];
    }
    if (ko !== null) write({ t: "ko", ko });
    // 응답이 없던 차례의 행은 move.lead 가 없어 다시 흘림이 지금 꼴의 줄을 낸다 — 여기도 표지 없는 지금 꼴(같은 값, 컨트롤러 지킬 것 2)
    if (sound.model !== undefined)
      write({ t: "sound", kind: "model", say: sound.model });
    if (sound.answer !== undefined)
      write({ t: "sound", kind: "answer", say: sound.answer });
    const say = shown.join(" ");
    const closingAdded = leadClosingAddsOf({ closing, say });
    if (closingAdded) write(closingLine(state.spec.koMeaning));
    const lite = child === null ? null : liteOf(false);
    await saveLeadTurn({
      ...save,
      lite,
      teacher: {
        text: toriTextOf(say, closingAdded ? [MORE_PROMPT.en] : []),
        toriRewrite: null,
        toriKo: ko,
        explanation: null,
        overLength: lessonOverLengthOf({
          words: outcome.reason === "cut_after_first" ? outcome.overLength : 0,
          sentences: shown.length,
          max: sentenceMax,
        }),
        aiQuestion: null,
        move: leadMoveWithSound(
          talkMoveOf({
            kind: leadFailedMoveKindOf({ closing, open }),
            cause: lite === null ? null : childCauseOf(lite),
          }),
          sound,
        ),
        sentUserMessage: child === null ? sentUserMessage : null,
      },
      childFields: leadChildFieldsOf({
        speech,
        childUsedOnOwn: [],
        said: [],
        stuck: false,
        heard,
        sentUserMessage,
        askAgain: false,
        helpFields,
      }),
      met: metWordsIn(say, { unitWords, lemmaOf: state.lemmaOf }),
      explanation: null,
    });
    return;
  }

  // (4-나) 응답이 있는 차례
  const value: TalkLeadOutput = outcome.value;
  const stuck = stuckOfReading(value.reading);
  const lite = child === null ? null : liteOf(stuck);
  const prevStuck = lite === null ? false : leadPrevStuckOf(lite);
  const sentences = outcome.sentSentences;
  // 좁은 정의 다시 말하기 한 번(spec 설계 6 (나) · (다)): 받는 조건과 안전 검사를 지날 때만 그 자리를 채우고, 아니면 원래 질문이 나간다
  const target = leadNarrowTargetOf(sentences, {
    closing,
    move: value.move,
    hitsOf,
  });
  let narrow: { index: number; sentence: string } | null = null;
  let narrowRecord: LeadExtra["narrow"];
  if (target !== null && levelInput !== null) {
    const startedAt = deps.now().getTime();
    let answer: string | null = null;
    if (
      questionRetryFits({
        elapsedMs: startedAt - received.getTime(),
        timeoutMs,
      })
    ) {
      const before = (
        await db
          .select({ id: aiCalls.id })
          .from(aiCalls)
          .where(
            and(
              eq(aiCalls.sessionId, state.session.id),
              eq(aiCalls.purpose, "talk_turn"),
            ),
          )
      ).map((r) => r.id);
      try {
        const retried = await runAiCall(
          talkLeadRetrySpec,
          {
            ...leadInput,
            retry: {
              assistant: JSON.stringify(value),
              prompt: leadNarrowRetryPrompt(target.sentence, target.hits),
            },
          },
          { profileId, sessionId: state.session.id, level },
          { db, clock: deps.now, ...deps.ai },
        );
        answer = retried.ok ? retried.value.question : null;
      } catch (error) {
        logFailure("회화 새 엔진 다시 말하기", error);
      }
      await tagNarrowRows(db, { sessionId: state.session.id, before });
    }
    const decided = leadNarrowOutcomeOf({
      original: target.sentence,
      received: answer,
      input: levelInput,
      passes: (sentence) =>
        checkToriSentence(sentence, { forbidden, metaPhrases }).ok,
    });
    narrow = { index: target.index, sentence: decided.sentence };
    narrowRecord = {
      item: leadNarrowItemOf(target.hits),
      retry: decided.retry,
      again: decided.again,
      ms: Math.max(0, deps.now().getTime() - startedAt),
    };
  }
  const settled = leadSettleOf({
    level,
    move: value.move,
    prevStuck,
    closing,
    modelSentence: value.model_sentence,
    sentences,
    sentCount: flow.sentCount(),
    held: outcome.held === true,
    narrow,
  });

  // (5) 줄 내보내기: 남은 글 문장 → 뜻 → 소리 줄(따라 할 문장 · 막힌 뒤 고르기 — 글 뒤, 미결 11 · 되묻는 차례면 앞 차례의 소리 줄을 그대로,
  // 저절로 읽지 않음 — 정본 03 4절 98줄 · 화면 검토 I-1, 행 move.sound 에는 적지 않음) → 마무리 상수(물음이 없을 때만). 신호 말은
  // 붙이지 않는다(Claude 가 제 말로 안내 — 같은 시도 다시 흘림도 저장한 행 그대로 같은 줄을 낸다)
  for (const en of settled.release) send(en);
  const ko = state.spec.koMeaning
    ? leadKoLineOf(level, value.say_ko).trim()
    : "";
  if (ko !== "") write({ t: "ko", ko });
  const kept = leadKeptSoundOf({
    level,
    move: value.move,
    hasChild: child !== null,
    own: settled.sound,
    prevMove,
    // 앞 행이 보인 소리 줄(되묻기가 이어지면 거슬러 감 — 다시 흘림 · 이어 하기(leadRowSoundLinesOf) · 모의 실행기와 같은 값, 검토 rev-s5 M-1)
    rows,
  });
  for (const line of leadSoundLinesOf({ sound: settled.sound, kept }))
    write(line);
  const closingAdded = leadClosingAddsOf({ closing, say: settled.say });
  if (closingAdded) write(closingLine(state.spec.koMeaning));

  // (6) 기록: 위치 되짚기 · 평가 입력(묶음 R2) · 기록 칸(move.lead) · 힌트 재료 · 막힌 뒤 뜻
  const { hintBlock, aiHints } = leadHintsOf({
    output: value,
    range: levelInput,
    check: { forbidden, sentenceMaxWords: ctx.sentenceMaxWords },
    spec: state.spec,
    unitWords,
    lemmaOf: state.lemmaOf,
  });
  const wide =
    rangeRead === null
      ? null
      : leadWideCheckOf(settled.say, {
          range: lineOptions,
          extra: {
            allowed,
            ...(allowedLemmaOf === undefined ? {} : { allowedLemmaOf }),
          },
          sentenceMax,
          same: {
            blocked: [],
            asked: position.askedQuestions,
            max: state.settings.sameQuestionMax,
          },
        });
  // 받아 둔 차례(첫 문장 시간이 비거나 늦는 차례 — AC-11 '판단' 행에서 따로 셈): 말 칸 전체를 붙잡음(held_say) · 첫 문장부터 물음을 붙잡음(held_question)
  const gate = leadGateOf({
    blocked: outcome.blocked,
    heldSay: outcome.held === true,
    flowHeld: flow.held(),
    sentCount: flow.sentCount(),
    hintBlock,
    rangeUnread: levelInput === null,
  });
  const extra = leadExtraOf({
    narrow: narrowRecord,
    wide,
    gate,
    closingAdded,
    removed: settled.removed,
    soundMoved: settled.soundMoved,
  });
  const move = leadMoveWithSound(
    leadTeacherMoveOf({
      response: {
        reading: value.reading,
        move: value.move,
        say: settled.say,
        model_sentence: value.model_sentence,
      },
      prevChild: lite,
      spec: state.spec,
      closingSlot: closing,
      // 대화 토막을 여는 입구의 행은 대화 첫 질문(first_question)이다 — 위치 되짚기의 '대화 첫 질문 차례'를 닫아 아이의 첫 답을 받는다
      firstQuestion: open === "start",
      unitWords,
      lemmaOf: state.lemmaOf,
      extra,
    }),
    settled.sound,
  );
  const teacherText = toriTextOf(
    settled.shown.join(" "),
    closingAdded ? [MORE_PROMPT.en] : [],
  );
  // 막힌 뒤 한국어 뜻(02-2 275줄 · C195): 지금 길과 같은 때(koExplanationShownOf)에 hint_ko 를 말풍선 아래 글로(읽지 않음)
  const explanation = leadExplanationOf({
    child: lite,
    stuckInSlot: () => positionAfter(stuck).stuckInSlot,
    spec: state.spec,
    level,
    hintKo: value.hint_ko,
  });
  const aiQuestion: LessonAiQuestion | null = leadAiQuestionOf({
    question: turnQuestionOf(teacherText, move.kind),
    ko,
    hintEn: value.hint_en,
    hints: aiHints,
  });
  const { askAgain, said } = leadSaidOf({
    hasChild: child !== null,
    move: value.move,
    help,
    candidates: value.child_used_on_own,
    heard,
    speech,
    stuck,
    unitWords,
    lemmaOf: state.lemmaOf,
    homophones,
  });
  await saveLeadTurn({
    ...save,
    lite,
    teacher: {
      text: teacherText,
      toriRewrite: talkLeadAssistantOf(JSON.stringify(value), settled.say),
      toriKo: ko === "" ? null : ko,
      explanation,
      overLength: lessonOverLengthOf({
        words: outcome.overLength,
        sentences: sentences.length,
        max: sentenceMax,
      }),
      aiQuestion,
      move,
      sentUserMessage: child === null ? sentUserMessage : null,
    },
    childFields: leadChildFieldsOf({
      speech,
      childUsedOnOwn: value.child_used_on_own,
      said,
      stuck,
      heard,
      sentUserMessage,
      askAgain,
      helpFields,
    }),
    met: metWordsIn(settled.say, { unitWords, lemmaOf: state.lemmaOf }),
    explanation,
  });
}

/** 마무리 상수 물음 줄(지금 길의 마무리 자리와 같은 꼴 — add more_prompt). */
function closingLine(koMeaning: boolean): TalkLessonLine {
  return {
    t: "add",
    kind: "more_prompt",
    en: MORE_PROMPT.en,
    ...(koMeaning ? { ko: MORE_PROMPT.ko } : {}),
  };
}

/**
 * 선생님 행 · 아이 행 저장(지금 길과 같은 트랜잭션: 다시 잠금 · 같은 행 없음 확인 · '만났다' · '말했다' · 참여 완료) 뒤 끝 줄. 아이 말 없이 부른
 * 차례(child null)는 아이 행을 고치지 않고 보낸 사용자 메시지를 선생님 행에 두며, 참여 완료는 보지 않는다(묶음 S2 가 이미 처리).
 */
async function saveLeadTurn({
  state,
  child,
  deps,
  shared,
  args,
  turnNo,
  segment,
  lite,
  teacher,
  childFields,
  met,
  explanation,
}: {
  state: TalkLessonState;
  child: TalkTurnRow | null;
  deps: LeadTurnDeps;
  shared: LessonTurnShared;
  args: ReturnType<typeof lessonArgsOf>;
  turnNo: number;
  segment: TalkTurnRow["segment"];
  lite: ReturnType<typeof lessonChildLiteOf> | null;
  teacher: {
    text: string;
    toriRewrite: string | null;
    toriKo: string | null;
    explanation: string | null;
    overLength: boolean;
    aiQuestion: LessonAiQuestion | null;
    move: TalkMove;
    sentUserMessage: string | null;
  };
  childFields: Partial<
    Pick<
      typeof talkTurns.$inferInsert,
      | "selfUsedWords"
      | "saidWords"
      | "stuckPhrase"
      | "sentUserMessage"
      | "askAgain"
      | "hintKind"
      | "hintLevel"
      | "heardHelp"
    >
  >;
  met: readonly string[];
  explanation: string | null;
}): Promise<void> {
  const { write } = deps;
  const { db, profileId, settings: s, at } = shared;
  const said = child === null ? [] : (childFields.saidWords ?? []);
  const saved = await db.transaction(async (tx) => {
    const locked = await readTalkLessonState(tx, {
      sessionId: state.session.id,
      profileId,
      lock: true,
      at,
    });
    if (!locked || !isTalkOpen(locked.session)) return undefined;
    const exists = locked.rows.some(
      (r) => r.speaker === "tori" && r.turnNo === turnNo,
    );
    if (!exists) {
      await tx.insert(talkTurns).values({
        sessionId: state.session.id,
        turnNo,
        segment,
        speaker: "tori",
        text: teacher.text,
        toriRewrite: teacher.toriRewrite,
        toriKo: teacher.toriKo,
        recast: null,
        explanation: teacher.explanation,
        newWords: null,
        missionChecks: null,
        overLength: teacher.overLength,
        aiQuestion: teacher.aiQuestion,
        move: teacher.move,
        sentUserMessage: teacher.sentUserMessage,
        recordedAt: at,
      });
      if (child !== null)
        await tx
          .update(talkTurns)
          .set(childFields)
          .where(eq(talkTurns.id, child.id));
      await writeSay(tx, {
        profileId,
        met,
        said,
        day: locked.learningDay,
        knownDays: snapshotNumber(locked, "talk.known_days"),
      });
      // 참여 완료 (1): 마무리 물음에 답한 턴(세션마다 한 번 — 지금 길과 같은 판정, 02-2 293~302줄)
      const answered =
        lite !== null &&
        talkLessonPositionOf({ ...args, turns: [...args.turns, lite] })
          .closingAnswered;
      if (answered && !locked.position.closingAnswered)
        await completeTalk(tx, {
          state: locked,
          at,
          rules: {
            per: positiveInt(s, "talk.friendship_per_talk"),
            max: positiveInt(s, "talk.friendship_max"),
          },
        });
    }
    return readTalkLessonState(tx, {
      sessionId: state.session.id,
      profileId,
      at,
    });
  });
  if (!saved) {
    write({ t: "stale" });
    return;
  }
  write({ t: "end", lesson: lessonNextOf(saved, { explanation }) });
}
