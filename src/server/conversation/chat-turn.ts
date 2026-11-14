import "server-only";
// 회화 이야기 방식의 턴 길(talk.lead_mode chat — 13절 C243 · C243 보완 2~4, intent 2026-11-13-회화-대화-구조-R spec 설계 2~11, plan 묶음 S1).
// lesson-turn.ts 의 아이 차례 길이 세션 잠금 · 같은 시도 다시 흘림 · 아이 행 저장 · 하루 안전 상한을 지난 뒤, 처음 스냅숏의 방식이 chat 이고 인사 · 대화 ·
// 더 이야기하기 토막이면 여기로 온다(chatTurnAppliesOf — 지금 새 방식의 갈림 앞). 아이 말 없는 입구 넷(start 수업 첫 말 · more · quiet 조용함 · back
// 짧은 준비 뒤 돌아옴)은 turn.ts 가 runChatOpenTurn 으로 보낸다. 한 차례: 요청 조립(묶음 P1) → 흘려 받기(묶음 S0 talkChatTurn — 문장 문 · 6.4) →
// 응답 처리(묶음 P2) → 줄 내보내기(끝 줄 신호 — 묶음 P3) → 행 저장 → 응답 뒤 평가 호출(묶음 S0, 거래가 끝난 뒤). 무엇을 부르고 무엇을 저장할지는
// core chat-turn-plan(대본 도구와 같은 함수)이 정하고, 여기는 DB · 호출 · 줄만 맡는다. 앱은 선생님 말을 고쳐 쓰지 않고(C242) 신호 말 · 받침 문구 ·
// 마무리 상수 물음을 붙이지 않는다(spec 설계 4 '쓰지 않는 것'). 아이 글 · AI 글을 로그에 내지 않는다(오류 이름 · Postgres 코드만).
// 불러오기 방향: 이 파일은 lesson-turn.ts · lead-turn.ts 를 불러오고, lesson-turn.ts 는 이 파일을 불러오지 않는다(처리기는 turn.ts 가 넘긴다).
import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import type { LevelContext } from "@/core/ai/calls/common";
import {
  CHAT_QUESTION_MAX,
  CHAT_SENTENCE_MAX,
  type TalkChatInput,
  talkChatTopicOf,
} from "@/core/ai/calls/talk-chat";
import {
  type TalkHintKind,
  teacherSentencesMaxOf,
} from "@/core/ai/calls/talk-lesson";
import { talkSafetyOf } from "@/core/ai/cost-alert";
import { parseTalkAttemptInput } from "@/core/conversation/attempt";
import {
  chatChildHintOf,
  chatHintRecordOfRow,
} from "@/core/conversation/chat-hints";
import {
  type ChatJudgeContext,
  chatJudgesOf,
} from "@/core/conversation/chat-judge";
import { type ChatInput, chatClockOf } from "@/core/conversation/chat-message";
import type { ChatReplyCheck } from "@/core/conversation/chat-reply";
import {
  chatChildTurnCountOf,
  isChatQuietRow,
} from "@/core/conversation/chat-turn-core";
import {
  type ChatOpen,
  chatChildFieldsOf,
  chatHistoryOf,
  chatMetCountOf,
  chatOpenAcceptsOf,
  chatOpenInputOf,
  chatOpenReplayOf,
  chatPrevStageOf,
  chatReplayLinesOf,
  chatSignalOfRows,
  chatTurnInputOf,
  chatTurnPlanOf,
  createChatSentenceFlow,
} from "@/core/conversation/chat-turn-plan";
import {
  type ChatCallResult,
  type ChatTeacherDraft,
  chatTurnResultOf,
} from "@/core/conversation/chat-turn-result";
import {
  chatTurnEvalDueOf,
  chatUnitWordsFromLexicon,
} from "@/core/conversation/chat-unit-words";
import { heardHelpsOfMove } from "@/core/conversation/hints";
import { isChatSession } from "@/core/conversation/lead-mode";
import {
  LEAD_OPEN_ACTIVITY_NO,
  LEAD_OPEN_INPUT,
  leadConversationOrder,
  leadOpenAttemptId,
} from "@/core/conversation/lead-turn-core";
import { readTalkMove } from "@/core/conversation/move";
import { allowedLemmaOfVocab } from "@/core/conversation/situation";
import { chatMaterialOf } from "@/core/teacher/roster";
import { attempts, sessions, talkTurns } from "@/db/schema/learning";
import { createAlertOnce } from "@/server/ai/store";
import {
  type TalkChatOutcome,
  talkChatSentUserMessageOf,
  talkChatTurn,
} from "@/server/ai/talk";
import type { DbOrTx } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { seedHomophones } from "@/server/seed-lists";
import { levelContextOf } from "@/server/session/ai-context";
import { SettingMissingError } from "@/server/settings";
import { chatJudgeRowsOf, runChatEvalAfterTurn } from "./chat-eval";
import {
  type ChatUnitWords,
  chatJudgeContextFrom,
  chatUnitWordsOf,
  readChatUnitWords,
} from "./chat-unit-words";
import {
  completeTalk,
  insertClosingRecord,
  safetyClosesOn,
  scheduleChatClose,
} from "./closing";
import {
  cardLineOf,
  type LeadOpenClaim,
  readLexiconEntries,
  releaseOpenClaim,
} from "./lead-turn";
import {
  emptyLessonRange,
  lessonRangeOf,
  lessonSafeLineOf,
  lessonTeacherOf,
  lineOptionsOf,
} from "./lesson-input";
import {
  chatTurnAppliesOf,
  closeLessonOnTurn,
  type LessonChatTurn,
  type LessonTurnDeps,
  type LessonTurnRequest,
  type LessonTurnShared,
  lessonArgsOf,
  lessonNextOf,
  lessonWrapLinesOf,
  SAFETY_ALERT_KEY,
  SAFETY_ALERT_KIND,
  seedLessonTalkLists,
  turnInFlight,
} from "./lesson-turn";
import {
  isTalkOpen,
  positiveInt,
  readTalkLessonState,
  snapshotNumber,
  type TalkLessonState,
  type TalkTurnRow,
  writeSay,
} from "./state";

/** 초 → ms(단위 바꿈 상수 — lesson-turn.ts 와 같다). */
const MS_PER_SECOND = 1000;

/**
 * 이야기 방식 턴 길의 의존: 지금 턴 길의 것 + 단원 주제 출처(기본 talkChatTopicOf — 시험이 이야기 방식 재료가 없는 시험 시드 단원으로 이 길을 돌리게
 * 바꾼다, 지금 새 방식의 leadText 와 같은 꼴).
 */
export type ChatTurnDeps = LessonTurnDeps & {
  chatTopic?: (level: number, unit: number) => string | null;
};

function logFailure(what: string, error: unknown) {
  if (error instanceof SettingMissingError)
    console.error(`${what} 실패(설정 ${error.key} 가 없습니다)`);
  else console.error(`${what} 실패(${dbErrorTag(error)})`);
}

// ── 방식 판단 · 만남 수(읽기만) ────────────────────────────────────────

/**
 * 그 회화 세션이 이야기 방식인가(isChatSession — 처음 스냅숏의 방식 · 단계만 읽음, 잠그지 않음). turn.ts 가 아이 말 없는 요청 start · more 를 이 길과
 * 지금 새 엔진 입구 가운데 어디로 보낼지 정할 때 부른다. 세션이 없거나 남의 세션이면 거짓.
 */
export async function chatSessionOf(
  db: DbOrTx,
  { sessionId, profileId }: { sessionId: string; profileId: string },
): Promise<boolean> {
  const [row] = await db
    .select({ level: sessions.level })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.profileId, profileId),
        eq(sessions.area, "talk"),
      ),
    );
  if (!row || row.level === null) return false;
  const tried = await db
    .select({ input: attempts.input })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  let start: { leadMode?: unknown } | null = null;
  for (const t of tried) {
    const input = parseTalkAttemptInput(t.input);
    if (input?.kind === "talk-start") start = input;
  }
  return isChatSession({ start, level: row.level });
}

/** 수업 시작의 만남 수(chatMetCountOf — 같은 프로필 · 같은 선생님 · 정리까지 닫힌 회화 수업, 방식 무관). */
async function chatMetOf(
  db: DbOrTx,
  {
    profileId,
    sessionId,
    teacherKey,
  }: { profileId: string; sessionId: string; teacherKey: string },
): Promise<number> {
  const rows = await db
    .select({
      id: sessions.id,
      segment: sessions.talkSegment,
      input: attempts.input,
    })
    .from(sessions)
    .innerJoin(attempts, eq(attempts.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.profileId, profileId),
        eq(sessions.area, "talk"),
        eq(sessions.talkSegment, "wrap_up"),
      ),
    );
  return chatMetCountOf(
    rows.map((r) => {
      const input = parseTalkAttemptInput(r.input);
      return {
        id: r.id,
        segment: r.segment,
        teacherKey:
          input?.kind === "talk-start" ? (input.teacherKey ?? null) : null,
      };
    }),
    { sessionId, teacherKey },
  );
}

// ── 다시 흘리기 ─────────────────────────────────────────────────────

/**
 * 같은 시도 id · 같은 입구의 저장된 선생님 행을 다시 흘린다(AI 없음): 저장한 글 · 뜻 · 소리 줄 그대로이고 신호 말을 고르지 않는다(지금 길의
 * lessonCueOfRows 에 받침 단계를 적은 행이 걸리지 않게 — 브리프 7). 끝 줄 신호는 저장된 행과 지금의 'AI 쉬는 중'으로 다시 정한다(chatSignalOfRows).
 */
export function replayChat(
  state: TalkLessonState,
  teacher: TalkTurnRow,
  deps: Pick<LessonTurnDeps, "write">,
  aiResting: boolean,
): void {
  for (const line of chatReplayLinesOf(teacher, state.spec.koMeaning))
    deps.write(line);
  const rows = leadConversationOrder(state.liveRows);
  const at = rows.findIndex((r) => r.id === teacher.id);
  deps.write({
    t: "end",
    lesson: { ...lessonNextOf(state, {}), hints: [] },
    chat: chatSignalOfRows({
      rows: at < 0 ? rows : rows.slice(0, at + 1),
      // 'AI 쉬는 중'이면 조용함 기다림 · 설명 기다림을 싣지 않는다(실시간 길과 같은 판단 — 검토 rev-chat-s1 M-5)
      aiResting,
      settings: state.settings.chat,
    }),
  });
}

// ── 아이 차례 뒤 · 입구 ─────────────────────────────────────────────

/** 이 차례를 연 것: 아이 말(아이 행이 이미 저장됨) · 조용함(입구가 넣은 quiet 행) · 아이 말 없이 부르는 입구(아이 행 없음). */
type ChatEntry =
  | { kind: "child"; child: TalkTurnRow; request: LessonTurnRequest }
  | {
      kind: "quiet";
      child: TalkTurnRow;
      turnNo: number;
      claim: LeadOpenClaim;
    }
  | {
      kind: "open";
      open: Exclude<ChatOpen, "quiet">;
      turnNo: number;
      /** 'AI 쉬는 중'의 수업 첫 말은 표지 행 없이 카드 인사 첫 줄로 연다. */
      claim: LeadOpenClaim | null;
      resting: boolean;
    };

/** 아이 말 뒤 이야기 방식의 선생님 차례(lesson-turn 의 LessonChatTurn.afterChild). 끝에 늘 끝 줄 하나. */
export function chatTurnAfterChild(
  state: TalkLessonState,
  child: TalkTurnRow,
  request: LessonTurnRequest,
  deps: ChatTurnDeps,
  shared: LessonTurnShared,
  ctxP: Promise<LevelContext>,
): Promise<void> {
  return chatTeacherTurn(
    state,
    { kind: "child", child, request },
    deps,
    shared,
    ctxP,
  );
}

/** turn.ts 가 lesson-turn 에 넘기는 이야기 방식 처리기. */
export const lessonChatTurn: LessonChatTurn = {
  afterChild: chatTurnAfterChild,
  replay: replayChat,
};

type OpenBegun =
  | { kind: "stale" }
  | { kind: "resting" }
  | { kind: "close"; state: TalkLessonState }
  | { kind: "replay"; state: TalkLessonState; teacher: TalkTurnRow }
  | { kind: "call"; state: TalkLessonState; entry: ChatEntry };

/**
 * 아이 말 없이 부르는 입구(spec 설계 3 · 5 · 6 · 10 · C241 보완 2): start 수업 첫 말 · more '더 이야기하기' · quiet 조용함 · back 짧은 준비 뒤 돌아옴.
 * 받지 않는 때는 stale. 같은 입구를 다시 보내 그 입구가 쓴 행이 마지막 행이면 저장한 행을 다시 흘린다(quiet 밖). 같은 차례의 입구가 아직 돌면 stale —
 * 잠금 안에서 호출 전에 표지 행(지금 꼴 그대로 leadOpenAttemptId)을 넣고, 이미 있으면 그 시각부터 turnInFlight 로 가린다. quiet 는 표지 행과 함께
 * quiet 아이 행(글 없음)을 넣고, 앞 quiet 가 끊겨 그 행이 고아로 남았으면 새로 쓰지 않고 그 행으로 다시 부른다. 'AI 쉬는 중'이면 지금 새 방식의
 * 입구와 같이 쉼(참여 완료 전) · 정리로 닫음(뒤)이고, 수업 첫 말만은 카드 인사 첫 줄로 연다(spec 설계 5).
 */
export async function runChatOpenTurn(
  request: { sessionId: string; open: ChatOpen },
  deps: ChatTurnDeps,
  shared: LessonTurnShared,
): Promise<void> {
  const { write } = deps;
  const { db, profileId, at, timer, settings: s } = shared;
  try {
    // 쉬는 중 확인은 잠금 밖에서 기다린다(lead-turn runLeadOpenTurn 과 같은 까닭)
    const resting = await shared.restingP;
    const begun = await db.transaction(async (tx): Promise<OpenBegun> => {
      const state = await readTalkLessonState(tx, {
        sessionId: request.sessionId,
        profileId,
        lock: true,
        at,
      });
      if (!state || !isTalkOpen(state.session) || !chatTurnAppliesOf(state))
        return { kind: "stale" };
      const last = state.liveRows.at(-1);
      const accepts = chatOpenAcceptsOf(request.open, {
        segment: state.segment,
        position: state.position,
        rows: state.liveRows,
        orphan: state.orphan,
        settings: state.settings.chat,
      });
      // 다시 흘림은 그 입구를 지금 새로 받을 수 없을 때만이다(마무리 제안으로 끝난 more 차례 뒤의 more 는 새 차례 — 검토 rev-chat-s1 I-1)
      if (
        state.orphan === null &&
        last !== undefined &&
        chatOpenReplayOf(request.open, last, accepts)
      )
        return { kind: "replay", state, teacher: last };
      if (!accepts) return { kind: "stale" };
      const turnNo =
        state.rows.reduce((max, r) => Math.max(max, r.turnNo), 0) + 1;
      if (resting) {
        if (request.open === "start")
          return {
            kind: "call",
            state,
            entry: {
              kind: "open",
              open: "start",
              turnNo,
              claim: null,
              resting: true,
            },
          };
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
        if (!prior) return { kind: "stale" };
        if (
          await turnInFlight(tx, {
            sessionId: state.session.id,
            since: prior.attemptedAt,
            at,
            timeoutMs:
              (s["ai.timeout_seconds.realtime"] as number) * MS_PER_SECOND,
          })
        )
          return { kind: "stale" };
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
      const claim: LeadOpenClaim = { id, at, called: false };
      if (request.open !== "quiet")
        return {
          kind: "call",
          state,
          entry: {
            kind: "open",
            open: request.open,
            turnNo,
            claim,
            resting: false,
          },
        };
      // quiet 아이 행(입력 방식 quiet · 글 없음 — spec 설계 6 '저장'): 앞 quiet 가 끊겨 남은 고아 행이면 그 행을 다시 쓴다
      let quiet =
        state.orphan !== null && isChatQuietRow(state.orphan)
          ? state.orphan
          : null;
      if (quiet === null) {
        [quiet] = await tx
          .insert(talkTurns)
          .values({
            sessionId: state.session.id,
            turnNo: turnNo - 1,
            segment: state.segment,
            speaker: "child",
            text: null,
            inputMode: "quiet",
            hintKind: "none",
            hintLevel: 0,
            saidWords: [],
            selfUsedWords: [],
            recordedAt: at,
          })
          .returning();
        if (!quiet) throw new Error("quiet 행을 넣지 못했다");
      }
      return {
        kind: "call",
        state,
        entry: { kind: "quiet", child: quiet, turnNo, claim },
      };
    });
    if (begun.kind === "stale") {
      write({ t: "stale" });
      return;
    }
    if (begun.kind === "resting") {
      write({ t: "resting" });
      return;
    }
    if (begun.kind === "close") {
      // 쉬는 중 닫기: 끝맺음은 쉬는 중이 풀린 뒤 홈 진입이 부르고, 남은 평가 · 비교 표지 행만 응답 뒤 작업으로(묶음 S2 의 닫기)
      scheduleChatClose(begun.state.session.id, deps, { closing: false });
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
      replayChat(begun.state, begun.teacher, deps, resting);
      return;
    }
    const { state, entry } = begun;
    timer.mark("state");
    const claim = entry.kind === "child" ? null : entry.claim;
    try {
      const revision = state.session.seedRevision ?? state.lessonRow.revision;
      const ctxP = levelContextOf(
        { area: "talk", level: state.level, unit: state.unit, revision },
        { db },
      );
      ctxP.catch(() => {});
      await chatTeacherTurn(state, entry, deps, shared, ctxP);
    } catch (error) {
      // 호출 전의 예외(재료 읽기 · 단계 맥락 등)면 표지를 지우고 바깥 잡기가 error 줄로 닫는다(quiet 행은 고아로 남아 다시 보내면 다시 쓴다)
      if (claim !== null && !claim.called) await releaseOpenClaim(db, claim);
      throw error;
    }
  } catch (error) {
    logFailure("회화 이야기 방식 입구", error);
    write({ t: "error" });
  }
}

// ── 선생님 차례 하나 ────────────────────────────────────────────────

async function chatTeacherTurn(
  state: TalkLessonState,
  entry: ChatEntry,
  deps: ChatTurnDeps,
  shared: LessonTurnShared,
  ctxP: Promise<LevelContext>,
): Promise<void> {
  const { write } = deps;
  const { db, profileId, masker, settings: s, received, timer, at } = shared;
  const claim = entry.kind === "child" ? null : entry.claim;
  const level = state.level;
  const chat = state.settings.chat;
  const material = state.teacher ? chatMaterialOf(state.teacher) : null;
  const topic = (deps.chatTopic ?? talkChatTopicOf)(level, state.unit);
  if (state.teacher === null || material === null || topic === null) {
    // 이야기 방식 재료가 없는 수업(스냅숏 조건 넷이 섰다면 나올 수 없는 길) — 지금 길로 바꾸면 한 세션에 두 길이 섞이므로 오류로 닫는다
    console.error(
      `회화 이야기 방식 재료가 없는 수업이다(${level}단계 단원 ${state.unit})`,
    );
    if (claim !== null) await releaseOpenClaim(db, claim);
    write({ t: "error" });
    return;
  }
  const teacherName = state.teacher.nameEn;
  const child = entry.kind === "open" ? null : entry.child;
  const request = entry.kind === "child" ? entry.request : null;
  const rows = leadConversationOrder(state.liveRows);
  const input: ChatInput =
    entry.kind === "child"
      ? chatTurnInputOf(entry.child, entry.request.recognizer, {
          unsureConfidence: chat.unsureConfidence,
          unsureOnPartial: chat.unsureOnPartial,
        })
      : entry.kind === "quiet"
        ? { kind: "quiet" }
        : chatOpenInputOf(
            entry.open,
            entry.open === "start"
              ? {
                  clock: chatClockOf(at, state.timezone, chat.dayPartHours),
                  met: await chatMetOf(db, {
                    profileId,
                    sessionId: state.session.id,
                    teacherKey: state.teacher.key,
                  }),
                }
              : null,
          );
  const safetyMaxTurns = positiveInt(s, "talk.safety_max_turns");
  const plan = chatTurnPlanOf({
    input,
    child,
    args: lessonArgsOf(state),
    position: state.position,
    rows: state.liveRows,
    segment: state.segment,
    prepOpens: (state.start?.prepPlan.length ?? 0) > 0,
    safetyMaxTurns,
    settings: state.settings,
  });
  const segment = child?.segment ?? state.segment;
  const teacherTurnNo =
    entry.kind === "child" ? entry.child.turnNo + 1 : entry.turnNo;
  const lists = (deps.talkLists ?? seedLessonTalkLists)();
  const homophones = (deps.homophones ?? seedHomophones)();
  const heard = input.kind === "speech" ? input.heard : "";

  // (1) 재료(나란히): 단계 맥락 · 범위 · 모든 단계 어휘(기록 전용 수준 검사 — 지금 새 방식과 같은 재료)
  const [ctx, rangeRead, lexiconRows] = await Promise.all([
    ctxP,
    lessonRangeOf(db, state, heard).catch((error: unknown) => {
      console.error(
        `회화 이야기 방식 범위 재료를 읽지 못했다(${error instanceof Error ? error.name : "Error"})`,
      );
      return null;
    }),
    readLexiconEntries(db).catch((error: unknown) => {
      console.error(
        `회화 이야기 방식 어휘 사전을 읽지 못했다(${dbErrorTag(error)})`,
      );
      return null;
    }),
  ]);
  timer.mark("checks_context");
  const unitWords = ctx.unitWords;
  const range = rangeRead ?? emptyLessonRange(state);
  const allowedLemmaOf =
    lexiconRows === null
      ? undefined
      : allowedLemmaOfVocab(lexiconRows, lists.allowed.allowed);
  const check: ChatReplyCheck = {
    range: lineOptionsOf({
      sentenceMaxWords: ctx.sentenceMaxWords,
      unitWords,
      teacher: lessonTeacherOf(state),
      lineRange: range.lineRange,
      lemmaOf: range.lemmaOf,
      homophones,
    }),
    extra: {
      allowed: new Set(lists.allowed.allowed),
      ...(allowedLemmaOf === undefined ? {} : { allowedLemmaOf }),
    },
    sentenceMax: CHAT_SENTENCE_MAX,
    questionMax: CHAT_QUESTION_MAX,
    madeUpPhrases: lists.madeUp,
  };
  // 판정 맥락의 단원 낱말 재료(단계 맥락의 단원 단어 · 그 원형 표 — 닫기 · 힌트 액션과 같은 재료, S2 fix 2)는 이미 읽은 어휘 사전에서 만든다(첫 문장
  // 앞에 DB 를 더 읽지 않음 — 재검토 rev-chat-s2-3 N-1 · NFR-1). 사전 읽기가 실패했으면 vocab 꼴 자료 읽기를 지금 시작만 해 두고 호출 뒤에 기다린다.
  // 그것도 실패하면 원형 표 없이 두고, 그 차례의 응답 뒤 평가는 부르지 않는다(M-2 — 기다림으로 남아 닫을 때 다시 불림)
  const unitWordsP: Promise<{ unit: ChatUnitWords; read: boolean }> =
    lexiconRows !== null
      ? Promise.resolve({
          unit: chatUnitWordsFromLexicon({ unitWords, lexicon: lexiconRows }),
          read: true,
        })
      : readChatUnitWords(db, unitWords).then(
          (unit) => ({ unit, read: true }),
          (error: unknown) => {
            console.error(
              `회화 이야기 방식 단원 낱말 재료를 읽지 못했다(${dbErrorTag(error)})`,
            );
            return {
              unit: chatUnitWordsOf({ unitWords, lemmaEntries: [] }),
              read: false,
            };
          },
        );

  // (2) 요청 조립(spec 설계 2 · 3): 안내문 재료 · 대화 기록(저장된 글 그대로) · 사실 줄 + 입력 줄. 보낸 사용자 메시지는 호출과 같은 가림을 지난 글
  const history = chatHistoryOf(rows);
  const chatInput: TalkChatInput = {
    level,
    unitWords,
    teacher: {
      nameEn: teacherName,
      chatPersonaEn: material.personaEn,
      chatFavoritesEn: material.favoritesEn,
    },
    topicEn: topic,
    history,
    message: { facts: plan.facts, input },
  };
  const sentUserMessage = talkChatSentUserMessageOf(chatInput, masker);
  timer.mark("input");

  // (3) 흘려 받기: 따라 할 문장(6.4 를 지난 글, 마지막 알림)을 본체가 뺄 문장 · 막힌 뒤 물음부터는 잡아 두고, 안전 상한 차례는 모두 잡아 닫는 줄로 낸다
  const flow = createChatSentenceFlow({
    level,
    appStuck: plan.appStuck,
    holdAll: plan.lastTurn,
  });
  const send = (en: string) => {
    try {
      write({ t: "s", en });
    } catch {
      // 브라우저 연결이 닫혀도 응답을 끝까지 받아 선생님 행을 저장한다
    }
  };
  const safeLine = lessonSafeLineOf(state, history.length + 1);
  const restingStart = entry.kind === "open" && entry.resting;
  let outcome: TalkChatOutcome;
  if (restingStart) {
    outcome = { ok: false, reason: "safety_cap", refusals: 0 };
  } else {
    // 여기부터는 호출이 나간 차례다 — 입구 표지는 지금 규칙(turnInFlight)대로 남긴다
    if (claim !== null) claim.called = true;
    try {
      outcome = await talkChatTurn(
        chatInput,
        {
          profileId,
          sessionId: state.session.id,
          level,
          requestReceivedAt: received,
          safeLine,
          sentenceMaxWords: ctx.sentenceMaxWords,
          onPrepared: () => {
            timer.mark("ai_prep");
            deps.onPrepTimings?.(timer.result());
          },
          onListen: (listen) => flow.listen(listen),
          onSentence: (en) => {
            if (flow.accept(en)) send(en);
          },
        },
        { db, clock: deps.now, ...deps.ai },
      );
    } catch (error) {
      logFailure("회화 이야기 방식 턴", error);
      outcome = { ok: false, reason: "server", refusals: 0 };
    }
  }

  // (4) 응답 갈래의 조립(core chatTurnResultOf — 대본 도구와 같은 함수): 흘림 뒤 줄 · 선생님 행 초안 · 끝인사 · 만남 · 받침 단계 · 끝 줄 신호
  const call: ChatCallResult = outcome.ok
    ? {
        kind: "ok",
        value: outcome.value,
        assistant: outcome.assistant,
        blocked: outcome.blocked,
        listenBlocked: outcome.listenBlocked,
        overLength: outcome.overLength,
        sentSentences: outcome.sentSentences,
        firstSentenceMs: outcome.firstSentenceMs,
      }
    : outcome.reason === "cut_after_first"
      ? {
          kind: "cut",
          sentSentences: outcome.sentSentences,
          overLength: outcome.overLength,
          firstSentenceMs: outcome.firstSentenceMs,
        }
      : { kind: "failed", reason: outcome.reason };
  const result = chatTurnResultOf({
    plan,
    call,
    flow: { sent: flow.sent(), held: flow.held() },
    level,
    koMeaning: state.spec.koMeaning,
    check,
    card: state.card,
    safeLine,
    turnNo: child?.turnNo ?? teacherTurnNo,
    sentenceMax: teacherSentencesMaxOf(s, level),
    prevStage: chatPrevStageOf(state.liveRows),
    rowsAfter: child !== null ? [...rows, child] : rows,
    settings: { lesson: state.settings, chat },
    lexicon: { unitWords, lemmaOf: state.lemmaOf },
  });
  // 흘린 줄과 본체 글이 갈린 차례(검토 M-2) — 글 없이 한 줄만 남겨 켜기 전 관문이 센다
  if (result.diverged)
    console.error("회화 이야기 방식 흘린 줄이 응답 처리 글과 갈렸다");
  for (const line of result.lines)
    if (line.t === "s") send(line.en);
    else write(line);
  const { teacher, finish, farewell, met } = result;

  // 판정 맥락은 닫기(묶음 S2)와 같은 함수 · 같은 재료로, 호출 뒤에 만든다(쓰는 곳이 행 저장 · 응답 뒤 평가뿐 — 만드는 곳이 둘이면 다시 갈린다, 검토
  // rev-chat-s2 I-2 · 재검토 rev-chat-s2-2)
  const unitWordsRead = await unitWordsP;
  const judgeCtx: ChatJudgeContext = chatJudgeContextFrom(
    state,
    unitWordsRead.unit,
    homophones,
  );

  // (5) 행 저장 · 끝 줄
  const saved = await saveChatTurn({
    state,
    shared,
    plan,
    child,
    request,
    turnNo: teacherTurnNo,
    segment,
    teacher: teacher === null ? null : { ...teacher, sentUserMessage },
    childSentUserMessage: sentUserMessage,
    met,
    judgeCtx,
  });
  if (saved === undefined) {
    write({ t: "stale" });
    return;
  }
  if (saved.kind === "closed") {
    // 대화 안전 상한(spec 설계 10): 그 말이 나간 뒤 지금처럼 닫는다(이미 참여 완료면 완료, 아니면 중단 — closeLessonOnTurn). 알림은 그대로
    const verdict = talkSafetyOf(
      {
        turns: chatChildTurnCountOf(rows) + 1,
        reachedToday: saved.reached,
      },
      {
        safetyMaxTurns,
        safetyAlertCount: positiveInt(s, "talk.safety_alert_count"),
      },
    );
    if (verdict.alert)
      await createAlertOnce(db, {
        kind: SAFETY_ALERT_KIND,
        profileId,
        thresholdKey: SAFETY_ALERT_KEY,
        learningDay: saved.learningDay,
        value: { sessionId: state.session.id },
        createdAt: at,
        once: "day",
      });
    // 이야기 방식의 닫기(묶음 S2 scheduleChatClose): 남은 '기다림' 평가와 비교 표지 행을 끝맺음과 한 응답 뒤 작업으로(토막 접점 검토 rev-chat-s2 6절 S1)
    scheduleChatClose(state.session.id, deps, { closing: saved.inserted });
    write({ t: "close", reason: "safety", farewell });
    return;
  }
  write({
    t: "end",
    lesson: { ...lessonNextOf(saved.state, {}), hints: [] },
    chat: finish.signal,
  });

  // (6) 응답 뒤 평가 호출(spec 설계 8-2 — 말 입력 차례만, 저장 거래가 끝난 뒤 거래가 아닌 연결로. 던지지 않는다)
  if (chatTurnEvalDueOf({ input, unitWordsRead: unitWordsRead.read })) {
    const schedule = deps.schedule ?? ((task) => after(task));
    schedule(async () => {
      await runChatEvalAfterTurn(
        {
          profileId,
          sessionId: state.session.id,
          level,
          sentenceMaxWords: ctx.sentenceMaxWords,
          contextTurns: chat.evalContextTurns,
          ctx: judgeCtx,
        },
        { ...deps.ai, db, clock: deps.now },
      );
    });
  }
}

/** 선생님 행 초안(저장 앞). */

type ChatSaved =
  | { kind: "saved"; state: TalkLessonState }
  | {
      kind: "closed";
      inserted: boolean;
      reached: number;
      learningDay: string;
    };

/**
 * 선생님 행 · 아이 행 저장(지금 길과 같은 거래: 다시 잠금 · 같은 행 없음 확인 · 만남 · 참여 완료). 아이 행(말 · 모름 단추 · 들리지 않음 · quiet)에는
 * 공식 '말했다' 낱말 빈 목록 · 막힘 말 · 보낸 사용자 메시지 · 힌트 종류와 연 단 수(묶음 P5 — 이어진 막힘 수는 이번 아이 행을 넣기 전 위치의 자리 막힘 수,
 * 검토 rev-chat-p35-2 N-2) · 첫 판정 기록(기다림 · 부르지 않음 — 그 행에만 씀)을 쓴다. '말함' 기록 쓰기에는 낱말을 넘기지 않는다(만남만). 입구 차례의
 * 사용자 메시지는 선생님 행에 둔다. 안전 상한 차례면 같은 거래에서 수업을 닫는다.
 */
async function saveChatTurn({
  state,
  shared,
  plan,
  child,
  request,
  turnNo,
  segment,
  teacher,
  childSentUserMessage,
  met,
  judgeCtx,
}: {
  state: TalkLessonState;
  shared: LessonTurnShared;
  plan: ReturnType<typeof chatTurnPlanOf>;
  child: TalkTurnRow | null;
  request: LessonTurnRequest | null;
  turnNo: number;
  segment: TalkTurnRow["segment"];
  teacher: (ChatTeacherDraft & { sentUserMessage: string }) | null;
  childSentUserMessage: string;
  met: readonly string[];
  judgeCtx: ChatJudgeContext;
}): Promise<ChatSaved | undefined> {
  const { db, profileId, settings: s, at } = shared;
  const stuckRun = state.position.stuckInSlot;
  return db.transaction(async (tx): Promise<ChatSaved | undefined> => {
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
      const inserted = teacher
        ? await tx
            .insert(talkTurns)
            .values({
              sessionId: state.session.id,
              turnNo,
              segment,
              speaker: "tori",
              text: teacher.text,
              toriRewrite: teacher.toriRewrite,
              toriKo: teacher.toriKo,
              recast: null,
              explanation: null,
              newWords: null,
              missionChecks: null,
              overLength: teacher.overLength,
              // 힌트 호출이 빈 칸일 때만 저장한다(검토 rev-chat-s0 M-1)
              aiQuestion: null,
              move: teacher.move,
              // 입구 차례(start · more · back)는 아이 행이 없어 보낸 사용자 메시지를 선생님 행에 둔다
              sentUserMessage: child === null ? teacher.sentUserMessage : null,
              recordedAt: at,
            })
            .returning()
        : [];
      if (child !== null) {
        const now = locked.rows.find((r) => r.id === child.id) ?? child;
        const prevTeacher = locked.rows.find(
          (r) => r.speaker === "tori" && r.turnNo === child.turnNo,
        );
        const prevMove = readTalkMove(prevTeacher?.move);
        const hint =
          plan.input.kind === "quiet"
            ? { hintKind: "none" as TalkHintKind, hintLevel: 0 }
            : chatChildHintOf({
                record: chatHintRecordOfRow(
                  prevTeacher?.aiQuestion ?? null,
                  locked.spec,
                ),
                opened: request?.hint.opened ?? 0,
                stuckRun,
                heard: [
                  ...new Set([
                    ...(request?.hint.heard ?? []),
                    ...heardHelpsOfMove(prevMove, locked.spec),
                  ]),
                ],
              });
        const fields = chatChildFieldsOf({
          input: plan.input,
          sentUserMessage: childSentUserMessage,
          hint,
        });
        const judgeRows = [
          ...locked.rows.filter((r) => r.id !== child.id),
          { ...now, ...fields },
          ...inserted,
        ];
        const judged = chatJudgeRowsOf(judgeRows, judgeCtx.spec);
        const index = judged.ids.indexOf(child.id);
        const judge =
          index < 0
            ? null
            : (chatJudgesOf(judged.rows, judgeCtx).find((j) => j.row === index)
                ?.judge ?? null);
        await tx
          .update(talkTurns)
          .set({ ...fields, chatJudge: judge })
          .where(eq(talkTurns.id, child.id));
      }
      await writeSay(tx, {
        profileId,
        met,
        said: [],
        day: locked.learningDay,
        knownDays: snapshotNumber(locked, "talk.known_days"),
      });
      // 참여 완료 (1): 마무리 물음에 답한 턴(세션마다 한 번 — 지금 길과 같은 판정)
      if (
        plan.lite !== null &&
        plan.positionAfter.closingAnswered &&
        !locked.position.closingAnswered
      )
        await completeTalk(tx, {
          state: locked,
          at,
          rules: {
            per: positiveInt(s, "talk.friendship_per_talk"),
            max: positiveInt(s, "talk.friendship_max"),
          },
        });
      if (plan.lastTurn) {
        const now = await readTalkLessonState(tx, {
          sessionId: state.session.id,
          profileId,
          at,
        });
        if (!now) return undefined;
        const closedInserted = await closeLessonOnTurn(tx, now, {
          at,
          reason: "safety",
        });
        const reached = await safetyClosesOn(tx, {
          profileId,
          at,
          learningDay: now.learningDay,
          timezone: now.timezone,
          dayStartHour: now.dayStartHour,
        });
        return {
          kind: "closed",
          inserted: closedInserted,
          reached,
          learningDay: now.learningDay,
        };
      }
    }
    const read = await readTalkLessonState(tx, {
      sessionId: state.session.id,
      profileId,
      at,
    });
    return read === undefined ? undefined : { kind: "saved", state: read };
  });
}
