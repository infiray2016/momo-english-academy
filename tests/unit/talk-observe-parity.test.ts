// 대본 도구 사본 ↔ 서버 턴 끝 처리 짝 시험('AI 몫 넓힘' plan 묶음 5 · 정한 것 7 · 위험 4 · 장부 T-157 · T-163 (3)).
// talk-observe 는 server-only 인 서버 턴 끝 처리(createLessonSentenceFlow · settleLessonTurn · lessonOutcomeViewOf · lessonHintsAt)를 줄여 옮긴
// 사본을 들고 있다. 같은 응답 · 계획 · 행을 서버 함수와 도구에 넣어 같은 줄(화면 글 · 붙일 줄 · 뜻 · 신호 말 · move)과 같은 판정(지운 까닭 ·
// 상황 줄 · 카드 자리 까닭 · 힌트 단)이 나오는지 본다. 서버 쪽 배선(목록 · 질문 검사 범위 · 턴 번호 · 아이 행)은 lessonTurnAfterChild 를 그대로
// 옮겨 시험 안에 둔다(그 함수는 DB · AI 를 부른다). 짝이 다르면 대본 회차를 돌리지 않는다(plan 위험 4).
import { readFileSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import {
  CHAT_QUESTION_MAX,
  CHAT_SENTENCE_MAX,
  type TalkChatInput,
  type TalkChatOutput,
  talkChatTopicOf,
  talkChatTurnSpec,
} from "@/core/ai/calls/talk-chat";
import {
  type TalkLeadInput,
  talkLeadMessages,
  talkLeadRulesOf,
  talkLeadTextOf,
  talkLeadTurnSpec,
} from "@/core/ai/calls/talk-lead";
import {
  applyTalkLessonChecks,
  isLowBandLevel,
  type TalkLessonOutput,
  talkCallTurnOf,
  talkCardChainKeysOf,
  talkLessonCheckFields,
  talkTurnWiringOf,
  teacherSentencesMaxOf,
} from "@/core/ai/calls/talk-lesson";
import { requestConfigOf } from "@/core/ai/combo";
import type { Masker } from "@/core/ai/mask";
import { createMasker } from "@/core/ai/mask";
import { checkOutputFields } from "@/core/ai/output-check";
import { buildAiRequest } from "@/core/ai/request";
import { startPrepWordsOf } from "@/core/conversation/chances";
import {
  chatChildHintOf,
  chatHintRecordOf,
  chatHintRecordOfRow,
} from "@/core/conversation/chat-hints";
import { chatJudgesOf } from "@/core/conversation/chat-judge";
import {
  type ChatInput,
  type ChatRecognizer,
  chatClockOf,
} from "@/core/conversation/chat-message";
import type { ChatReplyCheck } from "@/core/conversation/chat-reply";
import {
  type ChatOpen,
  chatChildFieldsOf,
  chatHistoryOf,
  chatOpenInputOf,
  chatPrevStageOf,
  chatTurnInputOf,
  chatTurnPlanOf,
  createChatSentenceFlow,
} from "@/core/conversation/chat-turn-plan";
import {
  type ChatCallResult,
  chatTurnResultOf,
} from "@/core/conversation/chat-turn-result";
import { cueBandOf, seedCuePhrasesOf } from "@/core/conversation/cue-line";
import { heardHelpsOfMove } from "@/core/conversation/hints";
import { leadNarrowHitsOf } from "@/core/conversation/lead-level";
import { TALK_LEAD_MODE_KEY } from "@/core/conversation/lead-mode";
import {
  type LeadRowLike,
  leadChildOf as leadChildLineOf,
  leadClosingTurnOf,
  leadConversationOrder,
  leadExplanationOf,
  leadFirstTurnOf,
  leadGreetingOf,
  leadHistoryOf,
  leadOpenChildOf,
  leadRowSoundLinesOf,
  leadStatusOf,
} from "@/core/conversation/lead-turn-core";
import {
  childAnsweredRequiredOf,
  childLinesOf,
  reaskWordsOf,
  talkLessonPositionOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import { talkLessonSettingsFrom } from "@/core/conversation/lesson-turns";
import { readTalkMove } from "@/core/conversation/move";
import { checkLowLevelQuestion } from "@/core/conversation/question-check";
import {
  allowedLemmaOfVocab,
  answerOnlyWordsOf,
  checkSituationSentence,
  failSituationLineOf,
  heardFieldsBlankOf,
  SITUATION_EXAMPLE_SENTENCES,
  situationPlaceOf,
} from "@/core/conversation/situation";
import { MORE_PROMPT, normalizeSpoken } from "@/core/conversation/spoken";
import { createToriSentenceGate, safeLineOf } from "@/core/conversation/stream";
import { bandOf, FUNCTION_POS } from "@/core/seed/structure";
import { splitSentences } from "@/core/seed/text";
import { createAnthropicClient } from "@/server/ai/client";
import {
  chatListenCheckedOf,
  chatSayChangesOf,
  streamTalkChat,
  type TalkLessonOutcome,
  talkChatSentUserMessageOf,
} from "@/server/ai/talk";
import {
  chatEvalFailureOf,
  chatEvalInputFor,
  chatEvalStateOf,
  chatEvalWritesOf,
  chatJudgeRowsOf,
} from "@/server/conversation/chat-eval";
import {
  type ChatTurnRowLike as ChatTurnRowLikeServer,
  chatHintInputOf,
  chatSaidSayLostOf,
} from "@/server/conversation/chat-hint";
import {
  chatJudgeContextFrom,
  chatUnitWordsOf,
} from "@/server/conversation/chat-unit-words";
import {
  type LessonCore,
  lessonAdvanceLeadOf,
  lessonMoreLeadOf,
  lessonMoreOf,
  lessonStartModeOf,
  TALK_TEXT_MAX,
} from "@/server/conversation/index";
import { leadTurnApplies } from "@/server/conversation/lead-turn";
import {
  childWordsOf,
  lessonSafeLineOf,
  lineOptionsOf,
} from "@/server/conversation/lesson-input";
import {
  createLessonSentenceFlow,
  type LessonLiveChecks,
  type LessonOutcomeView,
  type LessonSettleLive,
  type LessonTurnResult,
  lessonChildLiteOf,
  lessonChildRowOf,
  lessonHintsAt,
  lessonOutcomeViewOf,
  lessonOverLengthOf,
  lessonReplayLinesOf,
  lessonWrapLinesOf,
  questionRetryFits,
  seedLessonTalkLists,
  settleLessonTurn,
  slotQuestionTextOf,
  TURN_IN_FLIGHT_MS,
  TURN_SAVE_GRACE_MS,
  teacherTextsOf,
  withQuestionRetry,
} from "@/server/conversation/lesson-turn";
import {
  lessonFlowTurnsOf,
  type TalkTurnRow,
} from "@/server/conversation/state";
import { seedHomophones } from "@/server/seed-lists";
import { loadScriptConfig } from "../../scripts/ai-contract";
import {
  type CallResult,
  type ChatCaller,
  type ChatCallKind,
  type ChatSimEntry,
  type ChatSimRow,
  type ChatTurnRecord,
  chatCallPlanOf,
  createTalkSim,
  evaluateLessonMessage,
  type LeadLine,
  type LeadSimEntry,
  type Materials,
  materialsOf,
  OBSERVE_CHAT_TEXT_MAX,
  OBSERVE_TURN_IN_FLIGHT_MS,
  OBSERVE_TURN_SAVE_GRACE_MS,
  type ObserveStep,
  observeChatEvalFailureOf,
  observeChatEvalInputOf,
  observeChatEvalStateOf,
  observeChatEvalWritesOf,
  observeChatHintInputOf,
  observeChatJudgeRowsOf,
  observeChatListenCheckedOf,
  observeChatSaidSayLostOf,
  observeChatSayChangesOf,
  observeChatStartModeOf,
  observeChildLiteOf,
  observeFailLineOf,
  observeLiveOf,
  observeMoreLeadOf,
  observeMoreOf,
  observeOverLengthOf,
  observeQuestionRetryFits,
  type PreparedTurn,
  parseArgs,
  readSeedFiles,
  runChatScenario,
  runTalkObserve,
  type SimRow,
  sentenceEntriesOf,
  settleTurn,
  type TalkSim,
  type TurnRecord,
  talkListsOf,
  slotQuestionTextOf as toolSlotQuestionTextOf,
} from "../../scripts/talk-observe";
import {
  createFakeAnthropic,
  type FakeRule,
} from "../fixtures/ai/fake-anthropic";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
} from "../fixtures/ai/sample-inputs";

const ROOT = process.cwd();
const config = loadScriptConfig({ root: ROOT });
/** 서버 readAllowedLemmaOf 가 읽는 vocab 행(word · forms — 개발 DB 는 seed/vocab.json 을 적재한 것). */
const VOCAB_ROWS = (
  JSON.parse(readFileSync(`${ROOT}/seed/vocab.json`, "utf8")) as {
    vocab: { word: string; forms: string[] }[];
  }
).vocab;
/**
 * 서버 readFunctionWords(lesson-turn.ts)가 읽는 기능어: 적재된 vocab.parts_of_speech 에 기능어 표시가 든 낱말(소문자). 적재(seed/load.ts
 * vocabRowOf)는 시드 vocab.json 의 pos 칸을 parts_of_speech 로 옮기므로, 같은 행을 시드에서 바로 읽는다(검토 rev-x2 I-1).
 */
const SERVER_FUNCTION_WORDS = new Set(
  (
    JSON.parse(readFileSync(`${ROOT}/seed/vocab.json`, "utf8")) as {
      vocab: { word: string; pos: string[] }[];
    }
  ).vocab
    .filter((v) => v.pos.includes(FUNCTION_POS))
    .map((v) => v.word.toLowerCase()),
);
/** 허용 낱말 원형 사전을 견줄 표기형(규칙 활용 · 불규칙 · 허용 밖). */
const LEMMA_PROBES = [
  "words",
  "going",
  "went",
  "keeping",
  "kept",
  "helps",
  "tried",
  "swords",
  "news",
  "Words",
];

function materialsAt(level: number): Materials {
  const m = materialsOf(readSeedFiles(ROOT, level, 1), {
    level,
    unit: 1,
    lesson: 1,
    teacher: "mina",
  });
  if (!m.ok) throw new Error(m.missing);
  return m.materials;
}

/**
 * 4단계 재료: 4단계 카드 시드가 아직 없어(회화 plan — 1~3단계만) 3단계 단원 1 수업 1 카드를 4단계 단계 규격 · 단원 규격으로 돌린다. 4단계 길이
 * 1~3단계 검사 없이 서버와 같은지만 본다.
 */
function materials4(): Materials {
  const files = readSeedFiles(ROOT, 3, 1);
  const four = readSeedFiles(ROOT, 4, 1);
  const m = materialsOf(
    { ...four, lessonFile: files.lessonFile },
    { level: 4, unit: 1, lesson: 1, teacher: "mina" },
  );
  if (!m.ok) throw new Error(m.missing);
  return m.materials;
}

/** 장면 여는 질문 칸이 없는 카드(개정 4 꼴 — 대화 첫 질문이 필수 질문 1번, 받침 답이 카드 답 예시다). */
function withoutSceneOpener(m: Materials): Materials {
  const { sceneOpener: _opener, ...card } = m.card;
  return { ...m, card };
}

/** 인사 턴 2 카드(spec 설계 2 [M-2] — 둘째 인사가 AI 차례, 걸리면 카드 둘째 인사 질문). 시드 카드에 둘째 인사 질문을 더한 시험 카드다. */
function withSecondGreeting(m: Materials): Materials {
  const greeting = m.card.greeting;
  if (!("questions" in greeting)) throw new Error("인사 질문 카드가 아님");
  return {
    ...m,
    card: {
      ...m.card,
      greetingTurns: 2,
      greeting: {
        questions: [
          ...greeting.questions,
          {
            question: { en: "Do you like water?", ko: "물 좋아해?" },
            hintKo: "응, 좋아해.",
            hintEn: "Yes, I do.",
            answerExample: "Yes, I do.",
          },
        ],
      },
    },
  };
}

/** 가짜 응답(회화 턴 출력 칸 전부 — 빈 값이 기본, 뜻은 문장마다). */
function fakeMessage(over: Partial<Record<keyof TalkLessonOutput, unknown>>) {
  const sentences = splitSentences(String(over.tori_en ?? ""));
  const body = {
    child_kind: "answer",
    stuck: false,
    tori_en: "",
    model_line: "",
    choices: [],
    tori_ko: sentences.map((_, i) => `뜻 ${i + 1}`),
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    response_fit: true,
    child_topic: false,
    child_asked: false,
    goal_suggest: [],
    next_move: "none",
    card_item: { kind: "none", no: 0 },
    next_goal: [],
    support: "none",
    next_targets: [],
    next_hint_ko: "",
    next_hints: [],
    next_usable_phrases: [],
    next_answer_example: "",
    image_word: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
  return {
    ok: true,
    message: {
      model: "claude-sonnet-5-5",
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify(body) }],
      usage: {
        input_tokens: 5000,
        output_tokens: 400,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
    latencyMs: 2100,
    firstSentenceMs: 900,
    requestId: "req_fake",
  } satisfies CallResult;
}

const FAILED: CallResult = {
  ok: false,
  status: 500,
  detail: "server",
  latencyMs: 100,
};

const say = (text: string) => ({ say: text });
const dontKnow = { input: "dont_know" as const };
const noSpeech = { input: "nospeech" as const };

/** 메모리 행 → 흐름 행(도구 lightOf 와 같은 꼴). */
function light(rows: readonly SimRow[]): TalkLessonTurn[] {
  return rows.map((row) =>
    row.speaker === "tori"
      ? {
          speaker: "teacher",
          text: row.text,
          move: row.move,
          answerExample: row.answerExample,
        }
      : {
          speaker: "child",
          segment: row.segment,
          input: row.input,
          stuck: row.stuck,
          nospeech: row.nospeech,
          targets: [...row.targets],
        },
  );
}

/** 응답 → 검사 뒤 값(도구 evaluateResult · 서버 talk.ts 와 같은 core 함수). */
function checkedValue(
  m: Materials,
  p: PreparedTurn,
  message: CallResult,
): TalkLessonOutput | null {
  if (!message.ok) return null;
  const evaluated = evaluateLessonMessage(message, p.input, p.rules);
  if (evaluated.value === null) return null;
  const checks = checkOutputFields(talkLessonCheckFields(evaluated.value), {
    forbidden: m.forbidden,
    sentenceMaxWords: m.ctx.sentenceMaxWords,
  });
  return applyTalkLessonChecks(evaluated.value, checks, p.input).value;
}

/** 서버 문장 문 앞 거름(talk.ts — createToriSentenceGate). */
function gatedSentences(
  m: Materials,
  p: PreparedTurn,
  value: TalkLessonOutput,
): string[] {
  const gate = createToriSentenceGate({
    forbidden: m.forbidden,
    metaPhrases: m.metaPhrases,
    safeLine: safeLineOf(m.card.safeLines, p.input.history.length + 1),
    sentenceMaxWords: m.ctx.sentenceMaxWords,
  });
  return splitSentences(value.tori_en).flatMap((one) => {
    const out = gate.accept(one);
    return out === null ? [] : [out];
  });
}

type ServerTurn = {
  live: { checks: LessonLiveChecks; settle: LessonSettleLive } | null;
  entries: ReturnType<ReturnType<typeof createLessonSentenceFlow>["entries"]>;
  result: LessonTurnResult;
  sentences: string[];
  /** 끝 처리에 넣은 응답 값(들리지 않음이면 판단 칸을 비운 것). */
  value: TalkLessonOutput | null;
};

/**
 * 서버 턴 끝 처리(lessonTurnAfterChild 의 (7) · (8) 배선을 DB · AI 없이 옮김): 시드 목록 넷(seedLessonTalkLists) · 질문 검사 범위(lineOptionsOf)
 * · 이 선생님 행 번호(아이 행 번호 + 1) · 상황 질문 글(slotQuestionTextOf) · 들리지 않음 판단 칸 비움 · 실패 대신 줄(lessonOutcomeViewOf) ·
 * 아이 행(lessonChildLiteOf). 재질문은 부르지 않는다(도구 finish 도 retry 없이 부른다).
 */
function serverTurn(
  m: Materials,
  sim: TalkSim,
  p: PreparedTurn,
  message: CallResult,
): ServerTurn {
  const {
    low,
    turns,
    lineOptions,
    live,
    settings,
    flow,
    view,
    value,
    sentences,
  } = serverPartsOf(m, sim, p, message);
  const stuck = flow.stuckValue() === true && p.mode === "speech";
  const position = talkLessonPositionOf(p.flowArgs);
  const child = lessonChildLiteOf(
    position,
    { mode: p.mode, nospeech: p.nospeech },
    settings,
    stuck,
  );
  const result = settleLessonTurn({
    flow,
    outcome: view,
    ctx: {
      card: m.card,
      turns: [...turns, child],
      asked: p.before.asked,
      max: settings.sameQuestionMax,
      low,
      koMeaning: m.spec.koMeaning,
      dropped: [],
      spec: m.spec,
      lineOptions,
      live: live?.settle ?? null,
    },
  });
  return { live, entries: flow.entries(), result, sentences, value };
}

/**
 * 서버 턴의 끝 처리 앞까지(문장 문 · 응답 꼴 — serverTurn 과 질문 다시 쓰기 짝 시험이 같이 쓴다). 끝 처리(settleLessonTurn)는 문장 상태를 바꾸므로
 * 질문 다시 쓰기(withQuestionRetry)는 이 재료를 새로 만들어 넣는다(서버도 다시 쓰기가 끝 처리보다 먼저다).
 */
function serverPartsOf(
  m: Materials,
  sim: TalkSim,
  p: PreparedTurn,
  message: CallResult,
) {
  const low = isLowBandLevel(m.level);
  const lists = low ? seedLessonTalkLists() : null;
  const turns = light(sim.rows);
  const lastTori = sim.rows.findLast((r) => r.speaker === "tori");
  const childTurnNo = lastTori?.turnNo ?? 0;
  const teacherTurnNo = childTurnNo + 1;
  // 서버 배선과 같이 이 대화의 아이 말을 질문 검사 재료에 넣는다(판정 r1 I-6 — 되묻는 질문 걸림)
  const childText = p.mode === "speech" ? (p.childText ?? "") : null;
  const lineOptions = low
    ? {
        ...lineOptionsOf(p.input),
        childLines: childLinesOf(
          sim.rows.map((r) =>
            r.speaker === "child"
              ? { speaker: "child" as const, text: r.text ?? "" }
              : { speaker: "teacher" as const, text: r.text, move: r.move },
          ),
          childText,
        ),
      }
    : null;
  // 허용 낱말 원형(서버 readAllowedLemmaOf — 상황 차례 계획일 때만 읽는다)
  const allowedLemmaOf =
    lists &&
    [p.ifAnswered, p.ifStuck].some(
      (plan) => plan !== null && situationPlaceOf(plan) !== null,
    )
      ? allowedLemmaOfVocab(VOCAB_ROWS, lists.allowed.allowed)
      : undefined;
  const live: ServerTurn["live"] = lists
    ? {
        checks: {
          cuePhrases: seedCuePhrasesOf(lists.cue),
          madeUp: lists.madeUp,
          situation: {
            options: lineOptions,
            allowed: new Set(lists.allowed.allowed),
            allowedLemmaOf,
            forbidden: lists.situation.forbidden,
            lines: lists.situation.lines,
            turnNo: teacherTurnNo,
            question: slotQuestionTextOf(turns),
            spoken: teacherTextsOf(turns),
            repeat: true,
            functionWords: SERVER_FUNCTION_WORDS,
          },
        },
        settle: {
          situationLines: lists.situation.lines,
          turnNo: teacherTurnNo,
          cue: (() => {
            const band = cueBandOf(m.level);
            return band ? { file: lists.cue, band } : null;
          })(),
        },
      }
    : null;
  const settings = p.flowArgs.settings;
  const flow = createLessonSentenceFlow({
    low,
    ifAnswered: p.ifAnswered,
    ifStuck: p.ifStuck,
    asked: p.before.asked,
    max: settings.sameQuestionMax,
    live: live?.checks ?? null,
  });
  let value = checkedValue(m, p, message);
  const notHeardLow = low && p.mode === "dont_know" && p.nospeech;
  const sentences = value ? gatedSentences(m, p, value) : [];
  if (value) {
    flow.stuck(value.stuck);
    for (const s of sentences) flow.accept(s);
  }
  if (value && notHeardLow) value = heardFieldsBlankOf(value);
  if (value) flow.stuck(value.stuck);

  const outcome: TalkLessonOutcome = value
    ? ({
        ok: true,
        value,
        hintsBlocked: false,
        overLength: 0,
        blocked: [],
      } as unknown as TalkLessonOutcome)
    : ({ ok: false, reason: "server", refusals: 0 } as TalkLessonOutcome);
  const view = lessonOutcomeViewOf(outcome, {
    low,
    koMeaning: m.spec.koMeaning,
    safeLines: m.card.safeLines,
    safeLine: safeLineOf(m.card.safeLines, p.input.history.length + 1),
    turnNo: childTurnNo,
    situation:
      low && lists
        ? failSituationLineOf(
            lists.situation.lines,
            flow.chosen(),
            childText,
            teacherTurnNo,
            teacherTextsOf(turns),
          )
        : null,
  });
  if (view.kind === "break") throw new Error("4단계 실패는 쉼(선생님 행 없음)");
  return {
    low,
    turns,
    lineOptions,
    live,
    settings,
    flow,
    view: view as LessonOutcomeView,
    value,
    sentences,
  };
}

/**
 * 한 차례를 서버와 도구에 함께 돌려 같은 결과인지 본다: 재료(live) · 문장 문(지운 까닭 · 상황 줄 원문 · 뜻) · 화면 글 · 붙일 줄 · 뜻 · 신호 말 ·
 * move · 카드 자리 까닭. 도구 차례는 sim.finish 의 보고 한 줄과 새 선생님 행이다.
 */
function stepBoth(
  m: Materials,
  sim: TalkSim,
  step: Parameters<TalkSim["prepare"]>[0],
  message: CallResult,
): { server: ServerTurn; record: TurnRecord; p: PreparedTurn } {
  const ready = sim.prepare(step, sim.rows.length);
  if (!ready.ok) throw new Error(ready.reason);
  const p = ready.turn;
  const server = serverTurn(m, sim, p, message);
  // 도구 재료 · 문장 문(같은 계획 · 같은 문장)
  const toolLive = observeLiveOf(m, {
    turns: light(sim.rows),
    teacherTurnNo:
      (sim.rows.findLast((r) => r.speaker === "tori")?.turnNo ?? 0) + 1,
    lineOptions: server.live?.checks.situation?.options ?? null,
  });
  // 함수 칸(허용 낱말 원형 사전)은 따로 견준다 — 서버는 상황 차례 계획일 때만 넘기고, 그 사전은 상황 차례 검사만 쓴다
  const serverLemma = server.live?.checks.situation?.allowedLemmaOf;
  const toolLemma = toolLive?.checks.situation?.allowedLemmaOf;
  if (serverLemma)
    expect(LEMMA_PROBES.map((w) => toolLemma?.(w))).toEqual(
      LEMMA_PROBES.map((w) => serverLemma(w)),
    );
  expect(withoutLemma(toolLive)).toEqual(withoutLemma(server.live));
  const value = checkedValue(m, p, message);
  const chosen =
    value?.stuck === true && p.mode === "speech" && p.ifStuck
      ? p.ifStuck
      : p.ifAnswered;
  expect(
    sentenceEntriesOf(server.sentences, chosen, {
      low: isLowBandLevel(m.level),
      asked: p.before.asked,
      max: p.flowArgs.settings.sameQuestionMax,
      live: toolLive?.checks ?? null,
    }),
  ).toEqual(server.entries);
  const record = sim.finish(p, message);
  const row = sim.rows.findLast((r) => r.speaker === "tori");
  // 앱 차례(대화 첫 질문)가 뒤따르면 마지막 행은 그 앱 행이다 — 이 차례 선생님 행은 아이 행 바로 뒤다
  const childAt = sim.rows.findLastIndex((r) => r.speaker === "child");
  const teacherRow = sim.rows[childAt + 1];
  if (!row || teacherRow?.speaker !== "tori") throw new Error("선생님 행 없음");
  const { result } = server;
  expect(teacherRow.text).toBe(result.text);
  expect(teacherRow.rewrite).toBe(result.rewrite);
  expect(teacherRow.move).toEqual(result.move);
  expect(record.teacher).toBe(result.kept.join(" "));
  expect(record.toriKo).toBe(result.ko);
  expect(record.cue ?? null).toEqual(result.cue);
  expect(record.attach).toEqual([
    ...(result.cue ? [result.cue.en] : []),
    ...result.attach.flatMap((l) =>
      l.kind === "sound" ? [] : "en" in l ? [l.en] : [],
    ),
  ]);
  expect(record.replaced).toBe(result.replaced);
  expect(record.output).toEqual(server.value);
  expect(record.sound.model).toBe(result.sound.model);
  expect(record.sound.choices).toEqual(result.sound.choices);
  return { server, record, p };
}

/** 재료에서 허용 낱말 원형 사전(함수 칸)을 뺀 꼴(견주기용). */
function withoutLemma<T extends { checks: LessonLiveChecks } | null>(live: T) {
  if (live === null) return null;
  const situation = live.checks.situation;
  if (!situation) return live;
  const { allowedLemmaOf: _lemma, ...rest } = situation;
  return { ...live, checks: { ...live.checks, situation: rest } };
}

/** 인사 끝까지(대화 첫 질문 앱 차례가 붙는다). 인사 끝 반응 글을 바꿀 수 있다. */
function greeted(m: Materials, toriEn = "Good to hear! Let's start!") {
  const sim = createTalkSim(m, config.values, config.book);
  const first = stepBoth(
    m,
    sim,
    say("I am fine."),
    fakeMessage({ tori_en: toriEn }),
  );
  return { sim, first };
}

/**
 * 장면 여는 질문에 답한 AI 차례 뒤 첫 막힘의 받침 첫째 돌림 줄(앞 선생님 행 글에 넣어 건너뛰기를 본다). 인사 끝 · 받침 같은 상황 차례 글은 이제
 * 예 베끼기 · 되풀이 검사로 바뀌므로(판정 r1 I-1 (나)) 상황 검사를 받지 않는 대화 토막 AI 차례에 넣는다. 행 번호는 글과 관계없어 미리 돌려 센다.
 */
function rotatedTogether(m: Materials): string {
  const probe = greeted(m);
  stepBoth(
    m,
    probe.sim,
    say("Yes."),
    fakeMessage({ tori_en: "Oh, yes! Who rides with you?" }),
  );
  const last = probe.sim.rows.findLast((r) => r.speaker === "tori");
  const lines = m.talkLists.situation.lines.together ?? [];
  const line = lines[((last?.turnNo ?? 0) + 1) % lines.length]?.en;
  if (!line) throw new Error("상황 줄 없음");
  return line;
}

/** 인사 뒤 장면 여는 질문에 답하고 AI 차례가 그 글(said)을 반응으로 쓴 대화(다음 차례가 막힘이면 받침 첫째). */
function saidInTalk(m: Materials, said: string) {
  const { sim } = greeted(m);
  stepBoth(
    m,
    sim,
    say("Yes."),
    fakeMessage({ tori_en: `${said} Who rides with you?` }),
  );
  return { sim };
}

describe("재료가 같다", () => {
  it("도구가 읽은 시드 목록 넷은 서버 seedLessonTalkLists 와 같다", () => {
    const m = materialsAt(3);
    const server = seedLessonTalkLists();
    expect(m.talkLists.cue).toEqual(server.cue);
    expect(m.talkLists.situation).toEqual(server.situation);
    expect(m.talkLists.allowed).toEqual(server.allowed);
    expect(m.talkLists.madeUp).toEqual(server.madeUp);
  });

  it("목록 파일이 없으면 서버와 같은 빈 꼴이다(seedListOrEmpty)", () => {
    expect(talkListsOf({})).toEqual({
      cue: {
        introduce: {
          "1": { long: [], short: [] },
          "2-3": { long: [], short: [] },
        },
        together: {
          "1": { long: [], short: [] },
          "2-3": { long: [], short: [] },
        },
        choices: {
          "1": { long: [], short: [] },
          "2-3": { long: [], short: [] },
        },
      },
      situation: {
        lines: {
          greeting_end: [],
          together: [],
          easy: [],
          close: [],
          nospeech: [],
          ask_again: [],
        },
        forbidden: { all: [], nospeech: [], ask_again: [] },
      },
      allowed: { allowed: [], feeling: [] },
      madeUp: [],
    });
  });

  it("상황 질문 글은 서버 slotQuestionTextOf 와 같다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    expect(toolSlotQuestionTextOf(light(sim.rows))).toBe(
      slotQuestionTextOf(light(sim.rows)),
    );
  });

  it("4단계는 실시간 검사 재료가 없다(서버 lists 도 1~3단계만)", () => {
    const m = materials4();
    expect(
      observeLiveOf(m, { turns: [], teacherTurnNo: 2, lineOptions: null }),
    ).toBeNull();
  });
});

describe("상황 차례(AC-1 (나))", () => {
  it("인사 끝의 범위 밖 문장은 첫 걸림이 상황 줄, 뒤 걸림은 지움 — 서버와 같다", () => {
    const m = materialsAt(3);
    const sim = createTalkSim(m, config.values, config.book);
    const { server } = stepBoth(
      m,
      sim,
      say("I am fine."),
      fakeMessage({
        tori_en:
          "Good to hear! Spaghetti is delicious. Pizza is delicious. Let's start!",
      }),
    );
    expect(server.entries.some((e) => e.ai !== undefined)).toBe(true);
    expect(server.entries.some((e) => e.reason === "situation")).toBe(true);
  });

  it("받침 첫째의 자기 말 반응('I can help.')은 남고 AI 신호 말은 지우며 앱 신호 말(긴 꼴)이 붙는다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const { server, record } = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "I can help. Listen and say it with me!" }),
    );
    expect(record.teacher).toContain("I can help.");
    expect(server.entries.find((e) => e.cue)?.reason).toBe("cue");
    expect(server.result.cue).not.toBeNull();
  });

  it("받침 첫째의 답 글(질문 글에 없는 답 예시 내용어)은 상황 줄로 바뀐다", () => {
    const m = withoutSceneOpener(materialsAt(3));
    const { sim } = greeted(m);
    const { server } = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "You eat it! You can do it!" }),
    );
    expect(server.entries[0]?.ai).toBe("You eat it!");
  });

  it("들리지 않음: 들은 척 칭찬은 상황 줄로, 판단 칸은 비워 move 가 서버와 같다(AC-1 (가))", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const { server } = stepBoth(
      m,
      sim,
      noSpeech,
      fakeMessage({
        tori_en: "Good answer! Oops, my ears!",
        child_kind: "not_understood",
        response_fit: true,
        child_topic: true,
        child_asked: true,
        self_used_words: ["eat"],
        recast: "I ride a bike.",
      }),
    );
    expect(server.entries[0]?.ai).toBe("Good answer!");
    expect(server.result.move.suggest).toEqual(
      expect.objectContaining({ fit: false, topic: false, asked: false }),
    );
  });

  it("상황 줄은 이 턴에 남긴 문장 · 앞 선생님 행 글과 겹치지 않게 고른다(rev-2 M-1) — 서버와 같다", () => {
    // 카드 필수 질문 자리(답 예시 'We eat rice and fish.' — 'I' 가 답 글 낱말이 아니다)에서 본다
    const m = withoutSceneOpener(materialsAt(3));
    const { sim } = greeted(m);
    const one = stepBoth(
      m,
      sim,
      dontKnow,
      // 이 차례의 돌림 줄(together 둘째 'No problem! I can help.')은 남긴 'I can help.' 와 한 문장이 같아 건너뛴다('No problem!' 은 예 문장이라
      // 이제 그 자체가 상황 줄로 바뀐다 — 판정 r1 I-1 (나))
      fakeMessage({ tori_en: "I can help. Spaghetti is delicious." }),
    );
    const replaced = one.server.entries.find((e) => e.ai !== undefined);
    expect(one.server.entries[0]?.en).toBe("I can help.");
    expect(replaced).toBeDefined();
    expect(replaced?.en).not.toContain("I can help.");
    const two = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "Pizza is delicious." }),
    );
    expect(two.server.entries[0]?.ai).toBe("Pizza is delicious.");
  });

  it("반응 자리 상황 줄 · 실패 대신 줄은 앞 선생님 행 글에 그대로 든 줄을 건너뛴다(rev-2 M-1) — 서버와 같다", () => {
    const m = materialsAt(3);
    const said = rotatedTogether(m);
    const a = saidInTalk(m, said);
    expect(
      a.sim.rows.findLast((r) => r.speaker === "tori")?.text ?? "",
    ).toContain(said);
    const fallback = stepBoth(
      m,
      a.sim,
      dontKnow,
      fakeMessage({ tori_en: "Listen and say it with me!" }),
    );
    expect(fallback.server.result.kept[0]).not.toBe(said);
    const b = saidInTalk(m, said);
    const failed = stepBoth(m, b.sim, dontKnow, FAILED);
    expect(failed.server.result.kept[0]).not.toBe(said);
  });

  it("허용 낱말 대조는 서버와 같은 모든 단계 원형 사전을 쓴다: 'went' 는 사전으로만 · 'news' 는 꼬리 떼기로만 지나는 낱말이라 두 길이 가른다(1단계 범위)", () => {
    // 1단계 카드 시드가 없어 3단계 단원 1 수업 1 카드를 1단계 규격 · 어휘로 돌린다(go · word 는 1단계 범위 밖)
    const three = readSeedFiles(ROOT, 3, 1);
    const one = materialsOf(
      { ...readSeedFiles(ROOT, 1, 1), lessonFile: three.lessonFile },
      { level: 1, unit: 1, lesson: 1, teacher: "mina" },
    );
    if (!one.ok) throw new Error(one.missing);
    const m = one.materials;
    const { sim } = greeted(m);
    const went = "It went well.";
    const news = "The news is good.";
    const { server } = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: `${went} ${news}` }),
    );
    // 사전 길(서버 · 도구): went → go 는 지나고, news 는 허용 낱말의 활용형이 아니라 걸려 상황 줄로 바뀐다
    expect(server.entries[0]).toEqual(
      expect.objectContaining({ en: went, state: "sent" }),
    );
    expect(server.entries[1]?.ai).toBe(news);
    // 사전 없는 길(꼬리 떼기)은 거꾸로 가른다 — 짝 시험이 사전을 넘긴 길을 재는지 확인
    const situation = server.live?.checks.situation;
    if (!situation) throw new Error("상황 재료 없음");
    const withoutDictionary = (en: string) =>
      checkSituationSentence(en, {
        place: "together",
        options: situation.options,
        allowed: situation.allowed,
        forbidden: situation.forbidden,
        answer: null,
      }).ok;
    expect(withoutDictionary(went)).toBe(false);
    expect(withoutDictionary(news)).toBe(true);
  });

  it("반응이 다 지워진 상황 차례는 반응 자리에 상황 줄 하나", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const { server } = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "Listen and say it with me!" }),
    );
    expect(server.result.kept.length).toBeGreaterThan(0);
  });
});

describe("신호 말(AC-6 (가))", () => {
  it("같은 자리 둘째 신호 말은 짧은 꼴, 받침 둘째(소리 줄 없음) · 셋째 · 들리지 않음에는 없다 — 차례마다 서버와 같다", () => {
    const m = materialsAt(3);
    const together = m.talkLists.cue.together["2-3"];
    const { sim } = greeted(m);
    // 장면 여는 질문 자리: 받침 첫째(같이 말하기 첫 신호 말 — 긴 꼴) → 둘째(쉬운 질문, 소리 줄 없음) → 셋째(닫기)
    const one = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "That's okay!" }),
    );
    const two = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "No problem!" }),
    );
    const three = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "That's okay! Now we go on." }),
    );
    expect(together.long.map((l) => l.en)).toContain(one.server.result.cue?.en);
    expect(two.server.result.cue).toBeNull();
    expect(three.server.result.cue).toBeNull();
    // 닫기 뒤 다음 카드 자리에서 다시 막힘: 같은 자리(같이 말하기)의 둘째 신호 말 — 짧은 꼴
    const four = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "That's okay!" }),
    );
    expect(four.p.ifAnswered.stage).toBe(1);
    expect(together.short.map((l) => l.en)).toContain(
      four.server.result.cue?.en,
    );
    // 들리지 않음 차례: 신호 말이 없다
    const five = stepBoth(
      m,
      sim,
      noSpeech,
      fakeMessage({ tori_en: "Oops, my ears!" }),
    );
    expect(five.server.result.cue).toBeNull();
  });
});

describe("지어낸 경험 · 범위 밖 낱말(AC-3 (라))", () => {
  it("AI 차례의 지어낸 경험 꼴 문장은 지우고 질문은 남는다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const { server } = stepBoth(
      m,
      sim,
      say("Yes, I ride a bike."),
      fakeMessage({
        tori_en: "Wow! Yesterday I ate fish. Do you like fish?",
        next_move: "follow_child",
        next_answer_example: "Yes, I like fish.",
      }),
    );
    expect(server.entries.find((e) => e.reason === "made_up")?.en).toBe(
      "Yesterday I ate fish.",
    );
  });

  it("AI 질문이 범위 밖이면 카드 자리로 바뀐다(재질문 없이) — 서버와 같다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const { server } = stepBoth(
      m,
      sim,
      say("Yes, I ride a bike."),
      fakeMessage({
        tori_en: "Wow! Do you like xylophone concerts?",
        next_move: "follow_child",
      }),
    );
    expect(server.result.replaced).toBe("question_check");
  });
});

describe("둘째 인사 대신 줄(AC-2 (나))", () => {
  it("둘째 인사 AI 질문이 걸리면 카드 둘째 인사 질문을 붙인 카드 자리 — 서버와 같다", () => {
    const m = withSecondGreeting(materialsAt(3));
    const sim = createTalkSim(m, config.values, config.book);
    const { server } = stepBoth(
      m,
      sim,
      say("I am fine."),
      fakeMessage({ tori_en: "Good! Do you like xylophone concerts?" }),
    );
    expect(server.result.replaced).not.toBeNull();
    expect(server.result.attach.map((l) => ("en" in l ? l.en : ""))).toEqual([
      "Do you like water?",
    ]);
  });
});

describe("실패 대신 줄(AC-1 (마))", () => {
  it("1~3단계 상황 차례가 실패하면 상황 줄이고 인사 끝 뒤 카드 질문이 없다", () => {
    const m = materialsAt(3);
    const sim = createTalkSim(m, config.values, config.book);
    const { server } = stepBoth(m, sim, say("I am fine."), FAILED);
    expect(server.result.attach).toEqual([]);
    const greetingEnd = m.talkLists.situation.lines.greeting_end ?? [];
    expect(greetingEnd.map((l) => l.en)).toContain(server.result.kept[0]);
  });

  it("1~3단계 상황 차례가 아닌 실패는 뜻 있는 안전한 대사(카드 자리) — 서버와 같다(판정 r1 I-3 (나))", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const { server } = stepBoth(m, sim, say("Yes, I ride a bike."), FAILED);
    const safe = m.card.safeLines.find((l) => l.en === server.result.kept[0]);
    expect(safe?.ko).toBeTruthy();
    expect(m.card.praiseLines).not.toContain(server.result.kept[0]);
  });

  it("1~3단계 상황 차례가 아닌 실패에서 아이 말이 모름 꼴('Huh?')이면 쉬운 질문으로 넘어가는 상황 줄 — 서버와 같다(판정 r1 I-3 (다))", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const { server } = stepBoth(m, sim, say("Huh?"), FAILED);
    const easy = m.talkLists.situation.lines.easy ?? [];
    expect(easy.map((l) => l.en)).toContain(server.result.kept[0]);
    expect(m.card.praiseLines).not.toContain(server.result.kept[0]);
  });

  it("도구의 실패 한 줄은 서버 lessonOutcomeViewOf 의 한 줄과 같다(거절 · 4단계 밖)", () => {
    const m = materialsAt(3);
    const safeLine = safeLineOf(m.card.safeLines, 3);
    const line = m.talkLists.situation.lines.together?.[0] ?? null;
    for (const situation of [line, null])
      for (const refusal of [false, true]) {
        const view = lessonOutcomeViewOf(
          (refusal
            ? { ok: false, reason: "refusal", refusals: 2 }
            : {
                ok: false,
                reason: "server",
                refusals: 0,
              }) as TalkLessonOutcome,
          {
            low: true,
            koMeaning: true,
            safeLines: m.card.safeLines,
            safeLine,
            turnNo: 4,
            situation,
          },
        );
        expect(view.kind).toBe("line");
        if (view.kind !== "line") continue;
        expect(
          observeFailLineOf({
            low: true,
            koMeaning: true,
            card: m.card,
            refusal,
            situation,
            safeLine,
            childTurnNo: 4,
          }),
        ).toEqual(view.line);
      }
  });
});

describe("장면 여는 질문 힌트 · 뜻(AC-5 (나))", () => {
  /** 도구가 센 힌트 단 = 서버 lessonHintsAt(같은 행 · 같은 자리). */
  function sameHints(
    m: Materials,
    sim: TalkSim,
    step: Parameters<TalkSim["prepare"]>[0] = dontKnow,
  ) {
    const ready = sim.prepare(step, sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    const p = ready.turn;
    const server = lessonHintsAt(
      {
        spec: m.spec,
        card: m.card,
        turns: p.flowArgs.turns,
        liveRows: sim.rows.map((r) => ({
          speaker: r.speaker,
          aiQuestion: r.speaker === "tori" ? r.aiQuestion : null,
        })),
      },
      p.slot,
    );
    expect(p.hintTiers).toEqual(server);
    // 열린 단 수 · 힌트 종류(사용자 메시지의 hintTier · hintKind)도 서버 아이 행 칸과 같다(rev-5 M-2). 대본 칸 hint 가 없을 때만 —
    // 있으면 화면에서 아이가 연 것의 흉내라 대본 값 그대로다. 들은 도움은 도구처럼 앞 선생님 행 move 에서만 온다(요청의 heard 는 빈 목록)
    if (!("hint" in step) || step.hint === undefined) {
      const row = lessonChildRowOf(
        {
          sessionId: "parity",
          clientAttemptId: "parity",
          input: {
            mode: p.mode,
            ...("say" in step && step.say !== undefined
              ? { text: step.say }
              : {}),
            ...(p.nospeech ? { nospeech: true } : {}),
          },
          hint: { opened: step.hintTier ?? 0, heard: [] },
        },
        {
          state: {
            spec: m.spec,
            card: m.card,
            position: talkLessonPositionOf(p.flowArgs),
            turns: p.flowArgs.turns,
            liveRows: sim.rows.map((r) => ({
              speaker: r.speaker,
              aiQuestion: r.speaker === "tori" ? r.aiQuestion : null,
            })),
            segment: p.flowArgs.segment,
          } as Parameters<typeof lessonChildRowOf>[1]["state"],
          masker: (text) => ({ text }) as ReturnType<Masker>,
        },
      );
      expect(p.hintTier).toBe(row.hintLevel);
      expect(p.hintKind).toBe(row.hintKind);
      expect(p.heardHelp).toBe(row.heardHelp ?? "none");
    }
    return p;
  }

  it("인사 질문 자리 · 장면 여는 질문 자리의 힌트 단이 서버와 같다", () => {
    const m = materialsAt(3);
    const sim = createTalkSim(m, config.values, config.book);
    const greet = sameHints(m, sim, say("I am fine."));
    expect(greet.hintTiers.length).toBeGreaterThan(0);
    const { sim: after } = greeted(m);
    const scene = sameHints(m, after);
    expect(scene.slot?.scene).toBe(true);
    expect(scene.hintTiers.map((t) => t.text)).toContain(
      m.card.sceneOpener?.hintEn,
    );
  });

  it("같은 자리 '모름'이 둘 이어진 뒤에는 모든 단을 연 것으로 본다(서버 openedTierCount)", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    stepBoth(m, sim, dontKnow, fakeMessage({ tori_en: "That's okay!" }));
    expect(sameHints(m, sim).hintTier).toBe(0);
    stepBoth(m, sim, dontKnow, fakeMessage({ tori_en: "No problem!" }));
    const p = sameHints(m, sim);
    expect(p.hintTier).toBe(p.hintTiers.length);
    expect(p.hintKind).toBe("english");
  });

  it("AI 질문 자리는 그 질문을 쓴 선생님 행의 AI 힌트 단이다(검사를 지난 것)", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    stepBoth(
      m,
      sim,
      say("Yes, I ride a bike."),
      fakeMessage({
        tori_en: "Wow! Do you like ducks?",
        next_move: "follow_child",
        next_hint_ko: "응, 오리 좋아해.",
        next_hints: ["Yes, I ___ ducks.", "Yes, I like ducks."],
        next_answer_example: "Yes, I like ducks.",
      }),
    );
    sameHints(m, sim, say("Yes."));
  });

  it("장면 여는 질문 받침 둘째의 쉬운 질문과 뜻이 서버와 같다 · 대화 첫 질문 행의 뜻은 서버 다시 흘림 뜻과 같다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const opener = sim.rows.findLast((r) => r.speaker === "tori");
    if (opener?.speaker !== "tori") throw new Error("대화 첫 질문 행 없음");
    const replay = lessonReplayLinesOf(
      { text: opener.text, toriKo: null, move: opener.move },
      { card: m.card, koMeaning: true },
    );
    expect(replay).toContainEqual(
      expect.objectContaining({
        kind: "question",
        en: m.card.sceneOpener?.question.en,
        ko: m.card.sceneOpener?.question.ko,
      }),
    );
    stepBoth(m, sim, dontKnow, fakeMessage({ tori_en: "That's okay!" }));
    const { server } = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "No problem!" }),
    );
    expect(server.result.attach).toContainEqual(
      expect.objectContaining({
        kind: "question",
        en: m.card.sceneOpener?.easyQuestion.en,
        ko: m.card.sceneOpener?.easyQuestion.ko,
      }),
    );
  });
});

describe("4단계 불변", () => {
  it("4단계 AI 차례는 신호 말 · 상황 줄 없이 서버와 같다", () => {
    const m = materials4();
    const sim = createTalkSim(m, config.values, config.book);
    const { server, record } = stepBoth(
      m,
      sim,
      say("I am good."),
      fakeMessage({
        tori_en: "Good to hear! Listen and say it with me!",
      }),
    );
    expect(server.live).toBeNull();
    expect(record.cue ?? null).toBeNull();
  });
});

describe("직접 끝 처리(settleTurn ↔ settleLessonTurn)", () => {
  it("같은 계획 · 문장 · 행이면 화면 글 · 뜻 · 신호 말 · move 가 같다(재질문을 이은 entries 포함)", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const ready = sim.prepare(dontKnow, sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    const p = ready.turn;
    const message = fakeMessage({
      tori_en: "Oops! You can do it! Say it together.",
    });
    const server = serverTurn(m, sim, p, message);
    const value = checkedValue(m, p, message);
    const position = talkLessonPositionOf(p.flowArgs);
    const child = lessonChildLiteOf(
      position,
      { mode: p.mode, nospeech: p.nospeech },
      p.flowArgs.settings,
      false,
    );
    const live = observeLiveOf(m, {
      turns: light(sim.rows),
      teacherTurnNo:
        (sim.rows.findLast((r) => r.speaker === "tori")?.turnNo ?? 0) + 1,
      lineOptions: server.live?.checks.situation?.options ?? null,
    });
    const settled = settleTurn({
      chosen: p.ifAnswered,
      value,
      sentences: server.sentences,
      soundFixed: false,
      entries: server.entries,
      live,
      materials: m,
      turns: [...light(sim.rows), child],
      asked: p.before.asked,
      max: p.flowArgs.settings.sameQuestionMax,
      lineOptions: server.live?.checks.situation?.options ?? null,
    });
    expect(settled.text).toBe(server.result.text);
    expect(settled.kept).toEqual(server.result.kept);
    expect(settled.ko).toBe(server.result.ko);
    expect(settled.cue).toEqual(server.result.cue);
    expect(settled.move).toEqual(server.result.move);
    expect(settled.attach).toEqual(server.result.attach);
    expect(settled.plan).toEqual(server.result.plan);
  });
});

describe("대본 회차 r1 판정 fix 1 — 서버 · 도구가 같은 길(근거 차례의 글)", () => {
  it("I-1 (나) · [N-1] 인사 끝이 예를 그대로 쓰면(21/24 'Good to hear! Let's learn some new words!') 맞장구는 남고 넘김 문장만 앱 돌림 줄(넘김 꼴)로 바뀐다", () => {
    const m = materialsAt(3);
    const { first } = greeted(m, "Good to hear! Let's learn some new words!");
    expect(first.server.entries[0]).toMatchObject({
      en: "Good to hear!",
      state: "sent",
    });
    expect(first.server.entries[0]?.ai).toBeUndefined();
    expect(first.server.entries[1]?.ai).toBe("Let's learn some new words!");
    // 시드 넘김 줄(맞장구가 앞에 있으면 줄의 맞장구를 떼고 넘김만)
    const greetingEnd = (m.talkLists.situation.lines.greeting_end ?? []).map(
      (l) => l.en,
    );
    const moveOn = first.server.entries[1]?.en ?? "";
    expect(
      greetingEnd.some(
        (line) => line === moveOn || line.endsWith(` ${moveOn}`),
      ),
    ).toBe(true);
    expect(first.record.teacher.startsWith("Good to hear! ")).toBe(true);
    expect(first.record.teacher).not.toContain("Let's learn some new words!");
    // 반응 하나 + 넘김 하나(넘김 둘 · 문장 수 상한 넘김 없음 — 코드 검토 Important 1 · Minor 6)
    expect(splitSentences(first.record.teacher)).toHaveLength(2);
    expect(
      SITUATION_EXAMPLE_SENTENCES.has(normalizeSpoken("Good to hear!")),
    ).toBe(true);
  });

  it("I-1 (나) stuck-three 꼴: 받침 첫째 반응이 세 번 'That's okay! You can do it!' 이어도 세 차례의 말이 모두 다르다(상황 반응 되풀이 0)", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const same = "That's okay! You can do it!";
    const support1: string[] = [];
    const a = stepBoth(m, sim, dontKnow, fakeMessage({ tori_en: same }));
    support1.push(a.record.teacher);
    stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "No problem! Here is an easy one." }),
    );
    stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "That's okay! Here is the answer." }),
    );
    const b = stepBoth(
      m,
      sim,
      say("Huh?"),
      fakeMessage({
        tori_en: same,
        stuck: true,
        child_kind: "not_understood",
      }),
    );
    expect(b.record.move.stage).toBe(1);
    support1.push(b.record.teacher);
    stepBoth(
      m,
      sim,
      say("I drink juice."),
      fakeMessage({ tori_en: "Oh, juice! Who drinks with you?" }),
    );
    const c = stepBoth(
      m,
      sim,
      say("I don't know."),
      fakeMessage({
        tori_en: same,
        stuck: true,
        child_kind: "not_understood",
      }),
    );
    expect(c.record.move.stage).toBe(1);
    support1.push(c.record.teacher);
    // 세 차례가 모두 다른 말이다(시드 상황 줄이 그 꼴이면 한 번은 나와도 된다 — 되풀이 0)
    expect(new Set(support1.map(normalizeSpoken)).size).toBe(3);
    expect(support1.filter((t) => t === same).length).toBeLessThanOrEqual(1);
  });

  it("I-2 greet-more L2 3: 아이가 'We eat rice and fish.' 라 한 턴의 카드 자리는 필수 1 을 되묻지 않고 다음 필수 질문을 붙인다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    stepBoth(
      m,
      sim,
      say("Yes, I like it."),
      fakeMessage({
        tori_en: "Oh, you like it! Who rides with you?",
        next_move: "follow_up",
      }),
    );
    // 근거 차례의 걸린 질문(노리는 단어 drink 를 담음 → 카드 자리, 재질문 없이)
    const { server, p } = stepBoth(
      m,
      sim,
      say("We eat rice and fish."),
      fakeMessage({
        tori_en: "Yum, rice and fish! Do you drink juice at the lake?",
        next_targets: ["drink"],
      }),
    );
    const required = m.card.required;
    expect(p.ifAnswered.chances.required.map((r) => r.no)).not.toContain(1);
    expect(server.result.replaced).toBe("question_check");
    const asked = server.result.attach.flatMap((l) =>
      l.kind === "question" ? [l.en] : [],
    );
    expect(asked).not.toContain(required[0]?.en);
    expect(asked).toEqual([required[1]?.en]);
  });

  it("I-4 word-answers L1 2: AI 가 'Rice.' 를 관계없는 낱말(막힘)이라 해도 막힘이 아니다(받침 · 상관없는 답 소리 없음)", () => {
    // 막힘을 무른 턴의 잡아 두기 · 다시 쓰기(C204 (3))는 서버 흉내(serverTurn)에 없어 도구 길로만 본다 — 막힘 판정은 둘이 같은 정규화 함수다
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const ready = sim.prepare(say("Rice."), sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    const message = fakeMessage({
      tori_en: "Oh, rice! Yum!",
      stuck: true,
      child_kind: "unrelated_words",
    });
    expect(checkedValue(m, ready.turn, message)?.stuck).toBe(false);
    const record = sim.finish(ready.turn, message);
    expect(record.stuck).toEqual({ ai: true, app: false, overridden: true });
    expect(record.move.stage).toBe(0);
    expect(record.sound.answer).toBeUndefined();
  });

  it("I-6 preview-1 L1 7: 'Yes I like fish.' 를 들은 뒤 'Do you like the fish?' 는 되묻기로 걸려 카드 자리다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    stepBoth(
      m,
      sim,
      say("Yes I like fish."),
      fakeMessage({
        tori_en: "Oh, you like fish! Who eats fish with you?",
        next_move: "follow_up",
      }),
    );
    const { server } = stepBoth(
      m,
      sim,
      say("Yes big fish."),
      fakeMessage({
        tori_en: "Wow, a big fish! Do you like the fish?",
        next_move: "follow_up",
      }),
    );
    const options = server.live?.checks.situation?.options;
    if (!options) throw new Error("1~3단계 범위 재료 없음");
    expect(
      checkLowLevelQuestion("Do you like the fish?", {
        ...options,
        targets: [],
      }),
    ).toEqual({ ok: false, reason: "echo" });
    expect(server.result.replaced).toBe("question_check");
    expect(server.result.kept).not.toContain("Do you like the fish?");
  });

  it("I-3 (가) 응답을 읽지 못한 차례는 까닭 · 멈춘 까닭을 표시 칸에, 원문을 JSON 보고 칸에 남긴다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const ready = sim.prepare(say("Big."), sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    const text = JSON.stringify({ tori_en: "", tori_ko: [] });
    const base = fakeMessage({});
    const record = sim.finish(ready.turn, {
      ...base,
      message: {
        ...base.message,
        content: [{ type: "text", text }],
      },
    });
    expect(record.failure).toContain("까닭 tori_en_empty · 규격 ");
    expect(record.failure).toContain("채운 칸 없음");
    expect(record.failure).toContain("stop end_turn");
    expect(record.rawOnFail).toBe(text);
    // 대신 줄은 뜻 있는 안전한 대사(칭찬 대사 아님 — I-3 (나))
    expect(m.card.safeLines.map((l) => l.en)).toContain(record.teacher);
    expect(record.toriKo).toBeTruthy();
  });
});

describe("컨트롤러 결정 2026-11-07 — 1~3단계 막힘 응답의 빈 tori_en 은 반응 지워진 막힘 차례", () => {
  it("'Huh?' 에 stuck 참 · 빈 tori_en 응답이면 읽지 못함이 아니라 받침 첫째이고, 반응 자리에 시드 상황 줄 · 답 소리가 붙으며 재질문이 없다 — 서버와 같다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const message = fakeMessage({
      tori_en: "",
      stuck: true,
      child_kind: "not_understood",
    });
    const ready = sim.prepare(say("Huh?"), sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    // 재질문(다시 부름)이 없다 — 호출 추가 없음
    expect(sim.retryOf(ready.turn, message)).toBeNull();
    const { server, record } = stepBoth(m, sim, say("Huh?"), message);
    expect(server.value).toMatchObject({ stuck: true, tori_en: "" });
    expect(record.failure).toBeNull();
    expect(record.techError).toBeNull();
    expect(record.reask).toBeNull();
    expect(record.move.stage).toBe(1);
    const together = (m.talkLists.situation.lines.together ?? []).map(
      (l) => l.en,
    );
    expect(together).toContain(server.result.kept[0]);
    expect(record.teacher).toBe(server.result.kept[0]);
    expect(record.sound.answer).toBeDefined();
    expect(record.toriKo).toBeTruthy();
    expect(record.flags.join(" ")).toContain("empty_tori_en_stuck");
  });
});

describe("fix 2 — 대본 회차 r2 재판정 N-1 · N-2 · N-3 · M-r2-1(서버 · 도구가 같은 길)", () => {
  const sentencesIn = (texts: readonly string[]) =>
    texts.flatMap((t) => splitSentences(t)).map(normalizeSpoken);

  it("[N-1] recall L1 1: 인사 끝 'Apples are yummy!' 는 남고(허용 낱말 yummy) 넘김만 앱 줄로 바뀐다", () => {
    const m = materialsAt(3);
    const { first } = greeted(
      m,
      "Apples are yummy! Let's learn some new words!",
    );
    expect(first.record.teacher.startsWith("Apples are yummy! ")).toBe(true);
    expect(first.server.entries[0]?.ai).toBeUndefined();
    expect(first.server.entries[1]?.ai).toBe("Let's learn some new words!");
  });

  it("[N-2] stuck-three 꼴 받침 셋: 같은 뜻 두 번 말하기가 없고, 한 턴 · 차례끼리 같은 문장이 다시 나오지 않는다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const one = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({
        tori_en: "That's okay! You can do it! You can do it with me.",
      }),
    );
    // 같은 턴의 같은 뜻('You can do it with me.')은 지움, AI 자기 말은 남음
    expect(one.record.teacher).toBe("That's okay! You can do it!");
    const two = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({
        tori_en: "No problem! Here is an easy one. Let's try an easier one.",
      }),
    );
    // 넘김 예 베끼기는 앱 줄(넘김만)로, 그 뒤 AI 문장은 지움 — 두 문장
    expect(two.record.move.stage).toBe(2);
    expect(two.record.teacher.startsWith("No problem! ")).toBe(true);
    expect(splitSentences(two.record.teacher)).toHaveLength(2);
    expect(two.record.teacher).not.toContain("easier");
    const three = stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({ tori_en: "That's okay! Let's go on. Then we go on." }),
    );
    expect(three.record.move.stage).toBe(3);
    expect(three.record.teacher).not.toContain("Then we go on.");
    const all = [one, two, three].map((s) => s.record.teacher);
    const said = sentencesIn(all);
    expect(new Set(said).size).toBe(said.length);
  });

  it("[N-3] stuck-three L1 6: 'I drink juice.' 뒤 'What do you do with the juice?'(노림 drink)는 되묻기로 걸린다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    stepBoth(
      m,
      sim,
      say("Yes."),
      fakeMessage({
        tori_en: "Oh, you ride a bike! Who rides with you?",
        next_move: "follow_up",
      }),
    );
    const { server } = stepBoth(
      m,
      sim,
      say("I drink juice."),
      fakeMessage({
        tori_en: "Yum, juice! What do you do with the juice?",
        next_targets: ["drink"],
        next_move: "follow_up",
      }),
    );
    const options = server.live?.checks.situation?.options;
    if (!options) throw new Error("1~3단계 범위 재료 없음");
    expect(
      checkLowLevelQuestion("What do you do with the juice?", {
        ...options,
        targets: ["drink"],
      }),
    ).toEqual({ ok: false, reason: "echo" });
    expect(server.result.replaced).toBe("question_check");
    expect(server.result.kept).not.toContain("What do you do with the juice?");
  });

  it("[M-r2-1] second-session L2 4: 'Oh, apples! Is it apple juice? What do you do with it?' 는 마지막 질문 하나만 남는다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const { server, record } = stepBoth(
      m,
      sim,
      say("Apples!"),
      fakeMessage({
        tori_en: "Oh, apples! Is it apple juice? What do you do with it?",
        next_move: "follow_up",
      }),
    );
    // 끝 처리가 앞 질문을 지운다(서버 · 도구 같은 core keepLastHeldQuestion — 화면 글 · 선생님 행이 같은지는 stepBoth 가 본다)
    expect(server.result.kept).not.toContain("Is it apple juice?");
    expect(server.result.kept).toContain("What do you do with it?");
    expect(record.teacher).not.toContain("Is it apple juice?");
  });
});

describe("fix 3 — 대본 회차 r3 재판정 I-r3-1 · M-r3-2(서버 · 도구가 같은 길)", () => {
  it("[I-r3-1] 막힘 네 번(받침 첫째) 모두 AI 가 'That's okay!' 를 써도 네 차례의 말이 모두 다르다(상황 줄 통째 되풀이 0)", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const stuck = (child: string) =>
      stepBoth(
        m,
        sim,
        say(child),
        fakeMessage({
          tori_en: "That's okay!",
          stuck: true,
          child_kind: "not_understood",
        }),
      );
    const follow = (child: string, tori: string) =>
      stepBoth(
        m,
        sim,
        say(child),
        fakeMessage({ tori_en: tori, next_move: "follow_up" }),
      );
    const said: string[] = [];
    said.push(
      stepBoth(m, sim, dontKnow, fakeMessage({ tori_en: "That's okay!" }))
        .record.teacher,
    );
    follow("I drink juice.", "Oh, juice! Who drinks with you?");
    said.push(stuck("Huh?").record.teacher);
    follow("We go to the lake.", "Oh, the lake! Who goes with you?");
    said.push(stuck("I don't know.").record.teacher);
    follow("We eat rice.", "Yum, rice! Who eats with you?");
    said.push(stuck("Huh?").record.teacher);
    expect(new Set(said).size).toBe(said.length);
  });

  it("[M-r3-2] 질문 둘 가운데 뒤의 것이 되묻기('Are you hungry now?')면 앞 질문을 남긴다", () => {
    const m = materialsAt(3);
    const { sim } = greeted(m);
    const { server } = stepBoth(
      m,
      sim,
      say("Yes I am hungry"),
      fakeMessage({
        tori_en: "Oh, hungry! What food do you like? Are you hungry now?",
        next_move: "follow_up",
      }),
    );
    expect(server.result.kept).toContain("What food do you like?");
    expect(server.result.kept).not.toContain("Are you hungry now?");
  });
});

/** 3단계 단원 1 다지기 6 재료(재생 대본 replay-lesson-1108 의 카드 — 필수 질문 여섯 · 장면 여는 질문 'Can you swim?'). */
function materialsReinforce(): Materials {
  const m = materialsOf(readSeedFiles(ROOT, 3, 1), {
    level: 3,
    unit: 1,
    lesson: 6,
    teacher: "mina",
  });
  if (!m.ok) throw new Error(m.missing);
  return m.materials;
}

/**
 * 서버 lessonTurnAfterChild (6) 이 부르는 그대로 알아듣기 재료를 조립한다(내용 고침 1 fix 1 — 코드 검토 rev-content-1 I-3). 조립은 서버 · 도구가 같이
 * 부르는 core 함수(talkTurnWiringOf) 하나이고, 여기서는 서버가 넘기는 인자(시드 읽기 seedHomophones · seedLessonTalkLists, 아이 행
 * lessonChildLiteOf, 단계 맥락의 단원 단어)를 그대로 넘긴다 — 시험 안에 배선을 옮겨 적은 사본을 두지 않는다.
 */
function serverPlanned(m: Materials, sim: TalkSim, p: PreparedTurn) {
  const low = isLowBandLevel(m.level);
  const lists = low ? seedLessonTalkLists() : null;
  const wiring = talkTurnWiringOf({
    low,
    args: p.flowArgs,
    lite: lessonChildLiteOf(
      talkLessonPositionOf(p.flowArgs),
      { mode: p.mode, nospeech: p.nospeech },
      p.flowArgs.settings,
    ),
    childText: p.mode === "speech" ? (p.childText ?? "") : null,
    rows: sim.rows.map((r) =>
      r.speaker === "child"
        ? { speaker: "child" as const, text: r.text ?? "" }
        : { speaker: "teacher" as const, text: r.text, move: r.move },
    ),
    card: m.card,
    lemmaOf: m.lemmaOf,
    homophones: low ? seedHomophones() : [],
    soundAlikes: lists?.soundAlikes ?? [],
  });
  const planned = talkCallTurnOf({
    plan: wiring.plans.ifAnswered,
    ifStuck: wiring.plans.ifStuck,
    child: p.childText ?? "",
    input: p.mode,
    hintKind: p.hintKind,
    hintTier: p.hintTier,
    heardHelp: p.heardHelp,
    ...(lists ? { feelingWords: lists.allowed.feeling } : {}),
    lemmaOf: m.lemmaOf,
    heard: wiring.heardOf(m.ctx.unitWords),
    lastStart: wiring.lastStart,
  });
  return {
    homophones: wiring.homophones,
    plans: wiring.plans,
    planned,
    answeredSlot: wiring.answeredSlot,
  };
}

/** 도구가 준비한 차례가 서버 배선 사본과 같은 계획 · 귀띔 · 동음이의어 묶음인지 본다. */
function expectPlannedSame(m: Materials, sim: TalkSim, p: PreparedTurn) {
  const server = serverPlanned(m, sim, p);
  expect(p.ifAnswered).toEqual(server.plans.ifAnswered);
  expect(p.ifStuck ?? null).toEqual(server.plans.ifStuck ?? null);
  expect(p.turn.heardHints).toEqual(server.planned.heardHints);
  expect(p.turn.lastStart).toBe(server.planned.lastStart);
  expect(p.input.homophones).toEqual(
    isLowBandLevel(m.level) ? server.homophones : undefined,
  );
  return server;
}

/**
 * 서버 질문 다시 쓰기(withQuestionRetry)가 다시 부를 때의 입력(앞 글 · 까닭 줄). 다시 부르지 않으면 null. 재료는 끝 처리 앞의 것을 새로 만든다.
 * chainKeys 는 서버와 같이 호출 입력의 차례(p.turn)와 카드로 낸다(13절 C217 (2) (ㄷ)).
 */
async function serverRetryAsk(
  m: Materials,
  sim: TalkSim,
  p: PreparedTurn,
  message: CallResult,
): Promise<{ previous: string; note: string } | null> {
  return (await serverRetryOf(m, sim, p, message))?.ask ?? null;
}

/** 서버 질문 다시 쓰기의 입력과 까닭(ai_calls 표지에 남는 값 — 코드 검토 rev-content-1 M-8). 다시 부르지 않으면 null. */
async function serverRetryOf(
  m: Materials,
  sim: TalkSim,
  p: PreparedTurn,
  message: CallResult,
): Promise<{
  ask: { previous: string; note: string };
  reason: string;
} | null> {
  const parts = serverPartsOf(m, sim, p, message);
  let asked: {
    ask: { previous: string; note: string };
    reason: string;
  } | null = null;
  await withQuestionRetry({
    flow: parts.flow,
    view: parts.view,
    lineOptions: parts.lineOptions,
    sentenceMaxWords: p.input.sentenceMaxWords,
    chainKeys: parts.low ? talkCardChainKeysOf(p.turn, m.card) : [],
    retry: async ({ previous, note, reason }) => {
      asked = { ask: { previous, note }, reason };
      return null;
    },
  });
  return asked;
}

describe("내용 고침 1(13절 C217) — 도구 배선이 서버와 같은 길", () => {
  it("(1) 들은 글 귀띔: 'Can you swim?' 에 'I can see' 면 답 틀이 같다는 것만으로는 귀띔이 없고(서버와 같음 — 13절 'C203 (1) · C217 보완 3'), 호출 입력에 동음이의어 묶음이 든다", () => {
    const m = materialsReinforce();
    const { sim } = greeted(m);
    const ready = sim.prepare(say("I can see"), sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    const server = expectPlannedSame(m, sim, ready.turn);
    expect(server.answeredSlot?.answerExample).toBe("Yes, I can swim.");
    // see 와 swim 은 같은 소리도 가까운 소리 목록의 낱말도 아니다 — 소리가 닮지 않은 낱말을 답 예시 낱말로 바꿔 듣지 않는다
    expect(ready.turn.turn.heardHints).toBeUndefined();
    expect(ready.turn.userMessage).not.toContain("Heard hint");
    expect(ready.turn.input.homophones).toContainEqual(["see", "sea"]);
    expect(m.soundAlikes.length).toBeGreaterThan(0);
  });

  it("(1) · (3) 'Where do they swim?' 에 'See' 면 sea 귀띔이 나가고, 같은 소리로 들린 답도 먼저 답한 필수 질문으로 세어 계획이 서버와 같다", () => {
    const m = materialsReinforce();
    const { sim } = greeted(m);
    stepBoth(
      m,
      sim,
      say("Yes."),
      fakeMessage({
        tori_en: "Oh, good! Whales and dolphins! Where do they swim?",
        next_move: "required",
        card_item: { kind: "required", no: 2 },
        next_targets: ["sea"],
        next_hint_ko: "바다에서 헤엄쳐.",
        next_hints: ["They swim in the ___.", "They swim in the sea."],
        next_answer_example: "They swim in the sea.",
      }),
    );
    const ready = sim.prepare(say("See"), sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    const server = expectPlannedSame(m, sim, ready.turn);
    expect(server.answeredSlot?.words).toContain("sea");
    expect(JSON.stringify(ready.turn.turn.heardHints)).toContain("sea");
    expect(ready.turn.userMessage).toMatch(/Heard hint[^\n]*sea/);
  });

  it("(3) 먼저 답한 필수 질문: 장면 여는 질문에 'They swim in the see.' 라고 하면 같은 소리(sea)로 필수 2 를 먼저 답한 것으로 세고 계획이 서버와 같다", () => {
    const m = materialsReinforce();
    const { sim } = greeted(m);
    const ready = sim.prepare(say("They swim in the see."), sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    const p = ready.turn;
    expectPlannedSame(m, sim, p);
    // 동음이의어 묶음을 넣지 않은 계획과는 다르다(배선이 빠지면 이 단언이 깨진다)
    const rows = sim.rows.map((r) =>
      r.speaker === "child"
        ? { speaker: "child" as const, text: r.text ?? "" }
        : { speaker: "teacher" as const, text: r.text, move: r.move },
    );
    const answered = (homophones: string[][]) =>
      childAnsweredRequiredOf({
        required: m.card.required,
        childLines: childLinesOf(rows, p.childText, true),
        lemmaOf: m.lemmaOf,
        homophones,
      });
    expect(answered(seedHomophones())).toEqual([2]);
    expect(answered([])).toEqual([]);
    const lite = lessonChildLiteOf(
      talkLessonPositionOf(p.flowArgs),
      { mode: p.mode, nospeech: p.nospeech },
      p.flowArgs.settings,
    );
    const without = teacherTurnPlansOf(
      { ...p.flowArgs, childAnswered: [] },
      lite,
    );
    expect(p.ifAnswered).not.toEqual(without.ifAnswered);
  });

  it("(1) · (2) '잘 모르겠어요' 차례 · 4단계에는 귀띔이 없고, 4단계 호출 입력에는 동음이의어 묶음이 없다", () => {
    const m = materialsReinforce();
    const { sim } = greeted(m);
    const button = sim.prepare(dontKnow, sim.rows.length);
    if (!button.ok) throw new Error(button.reason);
    expectPlannedSame(m, sim, button.turn);
    expect(button.turn.turn.heardHints).toBeUndefined();
    expect(button.turn.userMessage).not.toContain("Heard hint");
    const m4 = materials4();
    const four = createTalkSim(m4, config.values, config.book);
    const ready = four.prepare(say("I am fine."), 0);
    if (!ready.ok) throw new Error(ready.reason);
    expectPlannedSame(m4, four, ready.turn);
    expect(ready.turn.turn.heardHints).toBeUndefined();
    expect(ready.turn.input.homophones).toBeUndefined();
  });

  /** AI 질문 자리에서 두 번 막힌 대화(다음 선생님 차례가 받침 둘째의 AI 질문 자리). */
  function stuckTwiceAtAiQuestion(m: Materials) {
    const { sim } = greeted(m);
    stepBoth(
      m,
      sim,
      say("Yes."),
      fakeMessage({
        tori_en: "Oh, good! What do you see?",
        next_move: "follow_up",
        next_hint_ko: "물고기가 보여.",
        next_hints: ["I see a ___.", "I see a fish."],
        next_answer_example: "I see a fish.",
      }),
    );
    stepBoth(m, sim, dontKnow, fakeMessage({ tori_en: "That's okay!" }));
    return sim;
  }

  it("(4) 받침 둘째의 AI 질문 자리: wh 질문은 서버 · 도구 모두 질문 검사에 걸려 카드 자리가 되고, 다시 쓰기 까닭 줄(not_easy)이 서버와 같다", async () => {
    const m = materialsReinforce();
    const sim = stuckTwiceAtAiQuestion(m);
    const message = fakeMessage({
      tori_en: "No problem! Where do whales swim?",
      next_move: "follow_up",
      next_answer_example: "They swim in the sea.",
    });
    const ready = sim.prepare(dontKnow, sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    expect(ready.turn.ifAnswered).toMatchObject({
      kind: "ai",
      aiAsks: true,
      stage: 2,
    });
    const ask = sim.retryOf(ready.turn, message);
    expect(ask?.fail?.reason).toBe("not_easy");
    const serverAsk = await serverRetryOf(m, sim, ready.turn, message);
    expect(serverAsk).not.toBeNull();
    expect(ask?.input.retry).toEqual(serverAsk?.ask);
    // 서버가 기록 표지에 남기는 까닭이 도구가 보고에 적는 까닭과 같다
    expect(serverAsk?.reason).toBe("not_easy");
    const { record, server } = stepBoth(m, sim, dontKnow, message);
    expect(server.result.replaced).toBe("question_check");
    expect(record.replaced).toBe("question_check");
    expect(record.teacher).not.toContain("Where do whales swim?");
  });

  it("(4) 받침 둘째의 AI 질문 자리: 예 · 아니요 질문은 서버 · 도구 모두 그대로 나가고 다시 쓰지 않는다", async () => {
    const m = materialsReinforce();
    const sim = stuckTwiceAtAiQuestion(m);
    const message = fakeMessage({
      tori_en: "No problem! Do you like fish?",
      next_move: "follow_up",
      next_answer_example: "Yes, I do.",
    });
    const ready = sim.prepare(dontKnow, sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    expect(sim.retryOf(ready.turn, message)).toBeNull();
    expect(await serverRetryAsk(m, sim, ready.turn, message)).toBeNull();
    const { record, server } = stepBoth(m, sim, dontKnow, message);
    expect(server.result.replaced).toBeNull();
    expect(record.replaced).toBeNull();
    expect(record.teacher).toContain("Do you like fish?");
  });

  it("(5) 카드 답 바로 뒤 차례에 카드 필수 질문 글이 그대로 오면 다시 쓰기 까닭 줄(chain)이 서버와 같고, 끝 처리는 그 까닭을 보지 않는다", async () => {
    const m = materialsReinforce();
    const { sim } = greeted(m);
    stepBoth(
      m,
      sim,
      say("Yes."),
      fakeMessage({
        tori_en: "Oh, good! Whales and dolphins! Where do they swim?",
        next_move: "required",
        card_item: { kind: "required", no: 2 },
        next_targets: ["sea"],
        next_answer_example: "They swim in the sea.",
      }),
    );
    const message = fakeMessage({
      tori_en: "Yes, in the sea! Sand on your feet! What do you do in the sea?",
      next_move: "required",
      card_item: { kind: "required", no: 3 },
      next_targets: ["wash"],
      next_answer_example: "I wash my feet.",
      self_used_words: ["sea"],
    });
    const ready = sim.prepare(say("In the sea."), sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    expect(talkCardChainKeysOf(ready.turn.turn, m.card).length).toBe(
      m.card.required.length,
    );
    const ask = sim.retryOf(ready.turn, message);
    expect(ask?.fail?.reason).toBe("chain");
    const serverAsk = await serverRetryOf(m, sim, ready.turn, message);
    expect(ask?.input.retry).toEqual(serverAsk?.ask);
    expect(serverAsk?.reason).toBe("chain");
    // 다시 쓰지 못한 턴은 지금처럼 그대로 나간다(카드 자리로 바꾸지 않는다 — 서버와 같음)
    const { record, server } = stepBoth(m, sim, say("In the sea."), message);
    expect(server.result.replaced).toBeNull();
    expect(record.replaced).toBeNull();
  });
  it("fix 2 아이가 'See' 라고 한 뒤의 'Do you like the sea?'(노림 sea)는 서버 · 도구 모두 질문 검사를 지나고 다시 쓰지 않는다(같은 소리 낱말 — 13절 'C203 (1) · C217 보완 3' (2))", async () => {
    const m = materialsReinforce();
    const { sim } = greeted(m);
    stepBoth(
      m,
      sim,
      say("Yes."),
      fakeMessage({
        tori_en: "Oh, good! Whales and dolphins! Where do they swim?",
        next_move: "required",
        card_item: { kind: "required", no: 2 },
        next_targets: ["sea"],
        next_answer_example: "They swim in the sea.",
      }),
    );
    const message = fakeMessage({
      tori_en: "Right, whales swim there! Do you like the sea?",
      next_move: "follow_up",
      next_targets: ["sea"],
      next_answer_example: "Yes, I do.",
      self_used_words: ["sea"],
    });
    const ready = sim.prepare(say("See"), sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    // 서버 · 도구가 같은 core 함수(talkLineOptionsOf)로 만든 재료에 같은 동음이의어 묶음이 든다
    expect(lineOptionsOf(ready.turn.input).homophones).toContainEqual([
      "see",
      "sea",
    ]);
    expect(sim.retryOf(ready.turn, message)).toBeNull();
    expect(await serverRetryAsk(m, sim, ready.turn, message)).toBeNull();
    const { record, server } = stepBoth(m, sim, say("See"), message);
    expect(server.result.replaced).toBeNull();
    expect(record.replaced).toBeNull();
    expect(record.teacher).toContain("Do you like the sea?");
  });

  it("fix 2 아이가 sea 도 see 도 말한 적이 없거나 문장으로만 'I can see' 라고 했으면 선생님이 먼저 말한 'Do you like the sea?'(노림 sea)는 서버 · 도구 모두 걸려 다시 쓰기 까닭 줄(target_word)이 같다", async () => {
    // 'Yes.' — 말한 적 없음, 'I can see' — 문장 속 see 는 sea 를 말한 근거가 아니다(한두 낱말 말만 같은 소리로 넓힌다)
    for (const child of ["Yes.", "I can see"]) {
      const m = materialsReinforce();
      const { sim } = greeted(m);
      const message = fakeMessage({
        tori_en: "Oh, good! Do you like the sea?",
        next_move: "follow_up",
        next_targets: ["sea"],
        next_answer_example: "Yes, I do.",
      });
      const ready = sim.prepare(say(child), sim.rows.length);
      if (!ready.ok) throw new Error(ready.reason);
      const ask = sim.retryOf(ready.turn, message);
      expect(ask?.fail?.reason).toBe("target_word");
      const serverAsk = await serverRetryOf(m, sim, ready.turn, message);
      expect(serverAsk?.reason).toBe("target_word");
      expect(ask?.input.retry).toEqual(serverAsk?.ask);
      const { record, server } = stepBoth(m, sim, say(child), message);
      expect(server.result.replaced).toBe("question_check");
      expect(record.replaced).toBe("question_check");
      expect(record.teacher).not.toContain("Do you like the sea?");
    }
  });

  it("fix 1 (가) 카드 글 그대로인 AI 질문이 검사에 걸려 카드 자리가 되면, 반응에 남은 장면 문장을 카드 줄에서 빼 한 번만 나간다(서버 · 도구 같음)", () => {
    const m = materialsReinforce();
    // 이 자리에서 카드 자리에 붙는 카드 줄을 먼저 알아낸다(같은 대화를 한 번 돌려 본다)
    const lead = (sim: TalkSim) =>
      stepBoth(
        m,
        sim,
        say("Yes."),
        fakeMessage({
          tori_en: "Oh, good! Whales and dolphins! Where do they swim?",
          next_move: "required",
          card_item: { kind: "required", no: 2 },
          next_targets: ["sea"],
          next_answer_example: "They swim in the sea.",
        }),
      );
    const probe = greeted(m).sim;
    lead(probe);
    // 질문이 문장 길이 상한을 넘어 질문 검사에 걸린다 → 카드 자리
    const failing = (reaction: string) =>
      fakeMessage({
        tori_en: `${reaction} What do you and your mom and your dad do in the water?`,
        next_move: "follow_up",
        next_answer_example: "We swim.",
      });
    const probed = stepBoth(m, probe, say("In the sea."), failing("Yes!"));
    expect(probed.server.result.replaced).toBe("question_check");
    const cardLine = probed.server.result.attach.find(
      (l) => l.kind === "question",
    );
    if (cardLine?.kind !== "question") throw new Error("카드 줄 없음");
    const parts = splitSentences(cardLine.en);
    // 장면 문장 + 질문 꼴의 카드 글이다(시험이 빈 조건으로 지나지 않게)
    expect(parts.length).toBeGreaterThan(1);
    const scene = parts[0] ?? "";
    const question = parts.at(-1) ?? "";

    const { sim } = greeted(m);
    lead(sim);
    const { server, record } = stepBoth(
      m,
      sim,
      say("In the sea."),
      failing(`Yes, in the sea! ${scene}`),
    );
    expect(server.result.replaced).toBe("question_check");
    expect(server.result.kept).toContain(scene);
    const attached = server.result.attach.flatMap((l) =>
      l.kind === "question" ? [l.en] : [],
    );
    // 붙인 카드 줄은 질문 문장만이고, 화면 글 전체에 장면 문장은 한 번이다
    expect(attached).toEqual([parts.slice(1).join(" ")]);
    const shown = `${record.teacher} ${record.attach.join(" ")}`;
    expect(shown.split(scene).length - 1).toBe(1);
    expect(shown).toContain(question);
    expect(server.result.text.split(scene).length - 1).toBe(1);
    // 그 차례의 질문 셈 · 카드 항목은 그대로다(붙인 줄의 마지막 문장이 카드 질문)
    expect(server.result.move.item).toEqual(cardLine.item);
    // 다시 흘림도 뺀 줄의 뜻을 찾는다(뜻이 있는 단계)
    if (m.spec.koMeaning && cardLine.ko !== undefined) {
      const replay = lessonReplayLinesOf(
        {
          text: server.result.text,
          toriKo: server.result.ko,
          move: server.result.move,
        },
        { card: m.card, koMeaning: true },
      );
      const again = replay.find((l) => l.t === "add" && l.kind === "question");
      expect(again).toMatchObject({ en: attached[0] });
      expect(again && "ko" in again ? again.ko : undefined).toBeTruthy();
    }
  });

  it("fix 1 (나) 받침 둘째의 AI 질문 뒤 'See' 에는 그 질문의 답(sea)과 맞댄 귀띔이 붙는다(자리 재현 차례 8 — 서버 배선과 같음)", () => {
    const m = materialsReinforce();
    const sim = stuckTwiceAtAiQuestion(m);
    // 받침 둘째: 선생님이 쉬운 예 · 아니요 질문을 쓴다(답 예시에 sea)
    stepBoth(
      m,
      sim,
      dontKnow,
      fakeMessage({
        tori_en: "No problem! Do whales swim in the water?",
        next_move: "follow_up",
        next_targets: ["sea"],
        next_answer_example: "Yes, they swim in the sea.",
      }),
    );
    const last = sim.rows.findLast((r) => r.speaker === "tori");
    expect(last?.move?.stage).toBe(2);
    expect(last?.text).toContain("Do whales swim in the water?");
    const ready = sim.prepare(say("See"), sim.rows.length);
    if (!ready.ok) throw new Error(ready.reason);
    const server = expectPlannedSame(m, sim, ready.turn);
    // 자리의 답은 처음 질문 것 그대로이고, 귀띔은 쉬운 질문의 답과 맞댄다
    expect(server.answeredSlot?.answerExample).toBe("I see a fish.");
    expect(server.answeredSlot?.easyAsked).toEqual({
      answerExample: "Yes, they swim in the sea.",
      words: ["sea"],
    });
    expect(ready.turn.userMessage).toMatch(
      /Heard hint[^\n]*'see' may be the answer word 'sea' \(same sound\)/,
    );
  });
});

// ── 묶음 X2: 새 엔진 길(talk.lead_mode claude — 회화 Claude 주도 AC-26l) ─────────────────────────
// 모의 실행기의 새 엔진 길이 서버 턴 길(src/server/conversation/lead-turn.ts)과 같은 요청(안내문 · 사실 알림 · 메시지)을 만들고 같은 응답 처리
// 결과(저장될 행의 칸 · 화면 줄 · 평가 입력)를 내는지 본다. 서버 턴 길은 DB · AI 를 부르므로 같은 입력의 기대 값은 묶음 S1 통합 시험
// (tests/integration/talk-lead-turn.test.ts)이 서버에 단언한 꼴 그대로 두고, 서버의 순수 export(lessonChildLiteOf · lessonOverLengthOf ·
// lessonMoreOf · lessonMoreLeadOf · lessonAdvanceLeadOf · leadTurnApplies · questionRetryFits)와 서버 새 엔진 길이 부르는 core 함수
// (leadExplanationOf 등 — 서버와 같은 인자)는 직접 맞댄다.

const LEAD_VALUES: Record<string, unknown> = {
  ...config.values,
  [TALK_LEAD_MODE_KEY]: "claude",
};
/** 도구와 같은 가림(talk-observe masker — 시험용 이름 · 연락처 꼴). */
const sampleMasker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});
const SAMPLE_CHILD_NAME = SAMPLE_NAMES.englishName ?? "Ganada";
const LEAD_SYSTEM_GOLDEN = readFileSync(
  `${ROOT}/tests/fixtures/talk-lead-system-l3u1.txt`,
  "utf8",
);

/** 새 엔진 응답(아홉 칸 — 빈 값 + 덮어쓴 칸, 칸 차례는 reading · move · say 먼저 — 통합 시험 leadAnswer 와 같은 꼴). */
function leadResult(
  over: Record<string, unknown>,
  extra: { latencyMs?: number; stop?: string } = {},
): CallResult {
  const body = {
    reading: "clear_answer",
    move: "react_and_follow_up",
    say: "Nice!",
    say_ko: "",
    model_sentence: "",
    hint_ko: "",
    hint_en: "",
    goal_words_i_said: [],
    child_used_on_own: [],
    ...over,
  };
  return {
    ok: true,
    message: {
      model: "claude-sonnet-5-5",
      stop_reason: extra.stop ?? "end_turn",
      content: [{ type: "text", text: JSON.stringify(body) }],
      usage: {
        input_tokens: 4000,
        output_tokens: 200,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
    latencyMs: extra.latencyMs ?? 1800,
    firstSentenceMs: 700,
    requestId: "req_lead",
  } satisfies CallResult;
}

function retryResult(question: unknown, latencyMs = 2900): CallResult {
  return {
    ok: true,
    message: {
      model: "claude-sonnet-5-5",
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify({ question }) }],
      usage: {
        input_tokens: 4100,
        output_tokens: 20,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
    latencyMs,
    firstSentenceMs: null,
    requestId: "req_retry",
  } satisfies CallResult;
}

const systemText = (body: Record<string, unknown>): string =>
  typeof body.system === "string"
    ? body.system
    : (body.system as { text: string }[]).map((b) => b.text).join("");
const messagesOf = (body: Record<string, unknown>) =>
  body.messages as { role: string; content: string }[];
const sLines = (rec: { lines: readonly LeadLine[] }) =>
  rec.lines.flatMap((l) => (l.t === "s" ? [l.en] : []));

/** 3단계 단원 1(안내문 글이 있는 단원)의 새 엔진 수업: 인사를 지금 길로 마친 상태(대화 첫 질문 차례 — 입구 start 가 열림). */
function leadGreeted(m: Materials = materialsAt(3)) {
  const sim = createTalkSim(m, LEAD_VALUES, config.book);
  for (let i = 0; i < 4 && !sim.lead.applies(); i++) {
    const g = sim.prepare(say("I am fine."), i);
    if (!g.ok) throw new Error(g.reason);
    sim.finish(g.turn, fakeMessage({ tori_en: "Good to hear!" }));
  }
  return sim;
}

function leadStep(
  sim: TalkSim,
  entry: LeadSimEntry,
  result: CallResult,
  retry?: CallResult,
) {
  const ready = sim.lead.prepare(entry);
  if (!ready.ok) throw new Error(ready.reason);
  const ask = sim.lead.retryOf(ready.turn, result);
  const rec = sim.lead.finish(
    ready.turn,
    result,
    ask && retry ? { ask, result: retry } : undefined,
  );
  return { p: ready.turn, ask, rec };
}

/** 대화가 열린(입구 start 를 지난) 새 엔진 수업. */
function leadTalking(m: Materials = materialsAt(3)) {
  const sim = leadGreeted(m);
  const opened = leadStep(
    sim,
    { kind: "open", open: "start" },
    leadResult({
      say: "Let's talk! What do you do on weekends?",
      move: "react_and_follow_up",
    }),
  );
  return { sim, opened };
}

const child = (
  step: { say?: string; input?: "dont_know" | "nospeech" },
  i = 1,
) => ({ kind: "child", step, stepIndex: i }) as const;

/** 서버 LessonCore(index.ts lessonCoreOf 꼴)를 메모리 상태로 — 새 아이 · 진행 중 · 이월 없음. */
function coreOf(
  m: Materials,
  sim: TalkSim,
  segment: LessonCore["segment"],
): LessonCore {
  return {
    spec: m.spec,
    card: m.card,
    newWords: m.newWords,
    turns: light(sim.rows),
    segment,
    settings: talkLessonSettingsFrom((k) => LEAD_VALUES[k], bandOf(m.level)),
    prepWords: sim.snapshot().prepWords,
    prepPlan: [],
    status: "in_progress",
    orphan: false,
    todayWordCount: m.card.todayWords.length,
  };
}

/**
 * 서버 턴 길의 요청 조립(src/server/conversation/lead-turn.ts leadTeacherTurn (2) — 안내문 · 사실 알림 · 대화 기록)을 시험 안에 옮긴 것: 행은
 * talk_turns 칸(LeadRowLike), 아이 차례는 server lessonChildLiteOf, 마무리 때 · 사실 값은 core 함수에 서버가 넘기는 값 그대로다. 도구의 요청과
 * 글자까지 견준다(AC-26l 첫째 항목).
 */
function serverLeadRequestOf(
  m: Materials,
  sim: TalkSim,
  entry: LeadSimEntry,
): { system: unknown; messages: unknown } {
  const rows: LeadRowLike[] = sim.rows.map((r) =>
    r.speaker === "tori"
      ? {
          speaker: "tori",
          turnNo: r.turnNo,
          segment: r.segment ?? "greeting",
          text: r.text,
          move: r.move,
          toriRewrite: r.rewrite === "" ? null : r.rewrite,
          sentUserMessage: r.sentUserMessage ?? null,
        }
      : {
          speaker: "child",
          turnNo: r.turnNo,
          segment: r.segment,
          text: r.text,
          sentUserMessage: r.sentUserMessage,
        },
  );
  const settings = talkLessonSettingsFrom(
    (k) => LEAD_VALUES[k],
    bandOf(m.level),
  );
  const prepWords = sim.snapshot().prepWords;
  const segment = sim.snapshot().segment;
  const args = {
    spec: m.spec,
    card: m.card,
    newWords: m.newWords,
    turns: light(sim.rows),
    segment,
    settings,
    prepWords,
  };
  const position = talkLessonPositionOf(args);
  const child = entry.kind === "child" ? entry.step : null;
  const mode =
    child === null || child.say === undefined ? "dont_know" : "speech";
  const nospeech = child?.input === "nospeech";
  const input = { mode: child === null ? "speech" : mode, nospeech } as const;
  const speech = child !== null && mode === "speech";
  const heard = speech ? sampleMasker(child?.say ?? "").text : "";
  const closing = leadClosingTurnOf({
    speech,
    positionAfter: () =>
      talkLessonPositionOf({
        ...args,
        turns: [
          ...args.turns,
          lessonChildLiteOf(position, input, settings, false),
        ],
      }),
  });
  const ordered = leadConversationOrder(rows);
  const text = talkLeadTextOf(m.level, m.unit);
  if (text === null || !m.leadCefr) throw new Error("안내문 재료 없음");
  const open = entry.kind === "open" ? entry.open : null;
  const first = leadFirstTurnOf(ordered);
  const leadInput: TalkLeadInput = {
    ...m.ctx,
    teacher: m.teacher,
    cefr: m.leadCefr,
    text,
    history: leadHistoryOf(ordered),
    turn: {
      child:
        open !== null
          ? leadOpenChildOf(open)
          : leadChildLineOf({ mode, nospeech, heard }),
      ...(first ? { greeting: leadGreetingOf(ordered) } : {}),
      status: leadStatusOf({
        rows: ordered,
        hasChild: child !== null,
        speech,
        heard,
        turnsLeft: position.turnsLeft,
        unitWords: m.ctx.unitWords,
        homophones: m.homophones,
        soundAlikes: m.soundAlikes,
        lemmaOf: m.lemmaOf,
        open,
        closing,
      }),
    },
  };
  const built = buildAiRequest(talkLeadTurnSpec, leadInput, {
    config: requestConfigOf({
      purpose: "talk_turn",
      level: m.level,
      values: LEAD_VALUES,
      book: config.book,
    }),
    masker: sampleMasker,
    rules: talkLeadRulesOf(LEAD_VALUES, leadInput),
  });
  return { system: built.body.system, messages: built.body.messages };
}

describe("묶음 X2 새 엔진 길(AC-26l 동등)", () => {
  it("AC-26l (I-1) 도구의 기능어 집합은 서버가 적재된 vocab.parts_of_speech 에서 읽는 기능어와 같다(시드 pos 칸, 169개) — 지금 길(A)의 상황 차례 답 글 검사가 기능어를 내용어로 보지 않는다", () => {
    // 기능어는 단계와 상관없이 어휘 시드 전체에서 읽는다(서버 질의에 단계 거름이 없다)
    for (const m of [materialsAt(3), materials4()]) {
      expect([...m.functionWords].sort()).toEqual(
        [...SERVER_FUNCTION_WORDS].sort(),
      );
    }
    expect(SERVER_FUNCTION_WORDS.size).toBe(169);
    for (const w of ["a", "the", "i", "we", "with", "my", "in", "at"])
      expect(SERVER_FUNCTION_WORDS.has(w)).toBe(true);
    // 검토가 든 예: 답 예시 'I swim with my family.' 에서 질문 글에 없는 '내용어'는 swim · family 뿐이다(with · my 는 기능어). 그래서
    // 'You can do it with me!' 같은 반응이 서버에서는 답 글 검사를 지난다.
    const m = materialsAt(3);
    const only = answerOnlyWordsOf(
      {
        example: "I swim with my family.",
        question: "What do you do on weekends?",
        functionWords: m.functionWords,
      },
      m.lemmaOf,
    );
    expect(only.has("with")).toBe(false);
    expect(only.has("my")).toBe(false);
    expect(only.has("swim")).toBe(true);
  });

  it("AC-26l (M-3) 다시 말하기의 시간 예산: 도구 사본이 서버 questionRetryFits 와 같고, 좁은 정의 기록에 서버라면 불렀는지(fits)를 남긴다(동작은 그대로 부름)", () => {
    expect(OBSERVE_TURN_IN_FLIGHT_MS).toBe(TURN_IN_FLIGHT_MS);
    expect(OBSERVE_TURN_SAVE_GRACE_MS).toBe(TURN_SAVE_GRACE_MS);
    for (const elapsedMs of [0, 2000, 34_999, 35_000, 35_001, 60_000])
      for (const timeoutMs of [5000, 10_000, 20_000])
        expect(observeQuestionRetryFits({ elapsedMs, timeoutMs })).toBe(
          questionRetryFits({ elapsedMs, timeoutMs }),
        );
    const original = "Do you go in summer or winter?";
    for (const [latencyMs, fits] of [
      [2000, true],
      [40_000, false],
    ] as const) {
      const { sim } = leadTalking();
      const ready = sim.lead.prepare(child(say("I play outside.")));
      if (!ready.ok) throw new Error(ready.reason);
      const first = leadResult({ say: original }, { latencyMs });
      const ask = sim.lead.retryOf(ready.turn, first);
      if (!ask) throw new Error("다시 말하기 요청이 없다");
      const rec = sim.lead.finish(ready.turn, first, {
        ask,
        result: retryResult("Do you go there when it is hot?"),
      });
      expect(rec.narrow?.fits).toBe(fits);
      // 도구는 시간 예산과 관계없이 부른다(기록만)
      expect(rec.narrow?.called).toBe(true);
    }
  });

  it("AC-26l (M-6) 되물은 뒤 하한을 적용할 때 뜻 힌트(meaningHint)도 되물은 차례에서 이어 받는다 — hintKind 와 같은 기록", () => {
    const m = materialsAt(3);
    // 입구 start 의 물음에 뜻(hint_ko)이 있어 아이 차례에 뜻 단이 열린다
    const sim = leadGreeted(m);
    leadStep(
      sim,
      { kind: "open", open: "start" },
      leadResult({
        say: "Let's talk! What do you do on weekends?",
        hint_ko: "주말에 뭐 해?",
        hint_en: "I play.",
      }),
    );
    const word = m.ctx.unitWords[0] ?? "sea";
    leadStep(
      sim,
      {
        kind: "child",
        step: { say: `Pad ${word} pad.`, hintTier: 9 },
        stepIndex: 1,
      } as never,
      leadResult({
        reading: "likely_misheard",
        move: "ask_again",
        say: "Sorry, say it again, please!",
      }),
    );
    const asked = sim.rows.findLast((r) => r.speaker === "child");
    expect(asked).toMatchObject({ meaningHint: true });
    const after = leadStep(
      sim,
      child(say(`${word}.`), 2),
      leadResult({ say: "Yes!", move: "react_only" }),
    );
    expect(after.rec.child?.hintKind).toBe(
      asked?.speaker === "child" ? asked.hintKind : undefined,
    );
    expect(sim.rows.findLast((r) => r.speaker === "child")).toMatchObject({
      meaningHint: true,
    });
    const rows = sim.lead.candidateRows();
    expect(rows.findLast((r) => r.role === "child")).toMatchObject({
      meaningHint: true,
    });
  });

  it("AC-26l (첫째) 도구가 Claude 에게 보내는 요청(안내문 · 사실 알림 · 대화 기록 메시지)이 서버 턴 길의 조립과 글자까지 같다 — 입구 start · 말 · 단추 · 말소리 없음 · 마무리 차례 · 입구 more, 아이 차례 꼴은 server lessonChildLiteOf 와 같다", () => {
    const m = materialsAt(3);
    const sim = leadGreeted(m);
    const settings = talkLessonSettingsFrom(
      (k) => LEAD_VALUES[k],
      bandOf(m.level),
    );
    const check = (entry: LeadSimEntry) => {
      const expected = serverLeadRequestOf(m, sim, entry);
      const ready = sim.lead.prepare(entry);
      if (!ready.ok) throw new Error(ready.reason);
      expect(ready.turn.request.body.system).toEqual(expected.system);
      expect(ready.turn.request.body.messages).toEqual(expected.messages);
      if (ready.turn.child) {
        const position = talkLessonPositionOf({
          spec: m.spec,
          card: m.card,
          newWords: m.newWords,
          turns: light(sim.rows),
          segment: sim.snapshot().segment,
          settings,
          prepWords: sim.snapshot().prepWords,
        });
        expect(ready.turn.child.lite).toEqual(
          lessonChildLiteOf(
            position,
            {
              mode: ready.turn.child.mode,
              nospeech: ready.turn.child.nospeech,
            },
            settings,
          ),
        );
      }
      return ready.turn;
    };
    const finish = (
      turn: ReturnType<typeof check>,
      over: Record<string, unknown>,
    ) => sim.lead.finish(turn, leadResult(over));
    finish(check({ kind: "open", open: "start" }), {
      say: "Let's talk! What do you do on weekends?",
    });
    finish(check(child(say("I go to the sea."))), {
      say: "The sea! Do you swim?",
      child_used_on_own: ["sea"],
    });
    finish(check(child(dontKnow, 2)), {
      reading: "does_not_know",
      move: "model_repeat",
      say: "That's okay! Say it with me: I see the sea.",
      model_sentence: "I see the sea.",
    });
    finish(check(child(say("I see the sea."), 3)), {
      reading: "repeated_my_model",
      move: "react_only",
      say: "Great!",
    });
    finish(check(child(noSpeech, 4)), { say: "Are you there?" });
    let closed = false;
    for (let i = 5; i < 40 && !closed; i++) {
      const turn = check(child(say("I like it."), i));
      closed = turn.closing;
      finish(turn, {
        say: closed ? "You did great today!" : "Nice!",
        move: "react_only",
      });
    }
    expect(closed).toBe(true);
    expect(sim.chooseMore()).toEqual({ ok: true, mode: "claude" });
    finish(check({ kind: "open", open: "more" }), { say: "Yay! What else?" });
  });

  it("AC-26l 처음 스냅숏: claude · 3단계 단원 1 이면 새 엔진 세션이고 인사 뒤 카드 첫 질문 행 없이 입구 start 가 열린다. app 이거나 안내문 글이 없는 단원(단원 2)은 지금 길이다", () => {
    const m = materialsAt(3);
    const sim = leadGreeted(m);
    expect(sim.lead.on).toBe(true);
    expect(sim.lead.applies()).toBe(true);
    expect(sim.lead.openDue()).toBe("start");
    // 서버 갈림 판정과 같다(처음 스냅숏 · 토막)
    expect(
      leadTurnApplies({
        start: { leadMode: "claude" } as never,
        segment: "talk",
        level: 3,
      }),
    ).toBe(true);
    expect(
      sim.rows.some(
        (r) =>
          r.speaker === "tori" &&
          r.move.kind === "first_question" &&
          r.turnNo > 1,
      ),
    ).toBe(false);
    // 지금 방식은 같은 인사 뒤 카드 첫 질문 행이 붙는다
    const app = createTalkSim(m, config.values, config.book);
    const g = app.prepare(say("I am fine."), 0);
    if (!g.ok) throw new Error(g.reason);
    const record = app.finish(
      g.turn,
      fakeMessage({ tori_en: "Good to hear!" }),
    );
    expect(app.lead.on).toBe(false);
    expect(record.appAfter.length).toBeGreaterThan(0);
    // 안내문 글이 없는 단원은 claude 설정이어도 지금 길(13절 C241 보완 — 같은 카드를 3단계 단원 2 로 돌림)
    expect(
      createTalkSim({ ...m, unit: 2 }, LEAD_VALUES, config.book).lead.on,
    ).toBe(false);
  });

  it("AC-26l 대화로 넘김의 토막은 서버 lessonAdvanceLeadOf 와 같다(인사 · 준비 끝 → 대화 토막, 행 없음)", () => {
    const m = materialsAt(3);
    const sim = leadGreeted(m);
    const decided = lessonAdvanceLeadOf(coreOf(m, sim, "prep"));
    expect(decided).toEqual({ ok: true, segment: "talk" });
    expect(sim.lead.applies()).toBe(true);
  });

  it("AC-26l 입구 start 의 요청: system 이 R1 골든과 글자 그대로, 사용자 메시지는 인사 이음 · 대화 시작 줄(아이 차례 줄 · 소리 귀띔 없음), 행은 first_question 이고 보낸 메시지를 선생님 행에 둔다", () => {
    const sim = leadGreeted();
    const ready = sim.lead.prepare({ kind: "open", open: "start" });
    if (!ready.ok) throw new Error(ready.reason);
    const body = ready.turn.request.body;
    expect(systemText(body)).toBe(LEAD_SYSTEM_GOLDEN.trimEnd());
    const user = messagesOf(body).at(-1)?.content ?? "";
    expect(messagesOf(body)).toHaveLength(1);
    expect(user).toContain("Greeting so far:");
    expect(user).toContain("The talk part starts now.");
    expect(user).not.toContain("Child turn");
    expect(user).not.toMatch(/Child \(speech-to-text\)/);
    expect(user).toBe(ready.turn.userMessage);
    // 요청은 서버와 같은 조립(buildAiRequest + talkLeadTurnSpec — 같은 입력이면 같은 메시지)
    expect(
      talkLeadMessages(
        talkLeadTurnSpec.mask(ready.turn.input, sampleMasker),
      ).at(-1)?.content,
    ).toBe(user);
    const rec = sim.lead.finish(
      ready.turn,
      leadResult({ say: "Let's talk! What do you do on weekends?" }),
    );
    expect(rec.child).toBeNull();
    expect(rec.teacher.move.kind).toBe("first_question");
    expect(rec.teacher.sentUserMessage).toBe(user);
    expect(sLines(rec)).toEqual(["Let's talk!", "What do you do on weekends?"]);
    expect(JSON.parse(rec.teacher.toriRewrite ?? "{}").say).toBe(
      "Let's talk! What do you do on weekends?",
    );
    expect(sim.lead.openDue()).toBeNull();
  });

  it("AC-26l 아이 첫 답 → 둘째 차례(통합 시험 AC-26b 와 같은 입력): 기록 쌍 · 'Child turn 1' · 나간 글 = 말 칸 · 행 칸 · '말했다' 가 서버와 같다", () => {
    const m = materialsAt(3);
    const { sim, opened } = leadTalking(m);
    const word = m.ctx.unitWords[0] ?? "sea";
    const { p, rec } = leadStep(
      sim,
      child(say(`I like ${word}.`)),
      leadResult({
        say: "Oh, nice! Do you like it?",
        say_ko: "오, 좋아! 그거 좋아해?",
        hint_ko: "응, 좋아해.",
        hint_en: `I like ${word}.`,
        child_used_on_own: [word],
      }),
    );
    const msgs = messagesOf(p.request.body);
    expect(msgs).toHaveLength(3);
    expect(msgs[0]?.content).toBe(opened.rec.teacher.sentUserMessage);
    expect(msgs[1]?.content).toBe(opened.rec.teacher.toriRewrite);
    const user = msgs[2]?.content ?? "";
    expect(user).toContain(`Child (speech-to-text): "I like ${word}."`);
    expect(user).not.toContain("Greeting so far:");
    expect(user).toMatch(
      /Child turn 1 \(the app offers to finish around turn \d+\)\./,
    );
    expect(sLines(rec)).toEqual(["Oh, nice!", "Do you like it?"]);
    expect(rec.lines).toContainEqual({ t: "ko", ko: "오, 좋아! 그거 좋아해?" });
    expect(rec.teacher.text).toBe("Oh, nice! Do you like it?");
    expect(rec.teacher.toriKo).toBe("오, 좋아! 그거 좋아해?");
    expect(rec.teacher.sentUserMessage).toBeNull();
    expect(rec.teacher.aiQuestion).toMatchObject({
      en: "Do you like it?",
      answerExample: `I like ${word}.`,
    });
    expect(rec.teacher.move.kind).toBe("ai");
    expect(rec.teacher.move.lead).toMatchObject({
      reading: "clear_answer",
      move: "react_and_follow_up",
    });
    expect(rec.teacher.move.lead?.wide).toBeDefined();
    expect(rec.child?.sentUserMessage).toBe(user);
    expect(rec.child?.selfUsedWords).toEqual([word]);
    expect(rec.child?.saidWords).toEqual([word]);
    expect(rec.child?.askAgain).toBe(false);
    // 둘째 아이 차례: 기록이 둘로 이어지고 아이 차례 번호가 오른다
    const next = leadStep(
      sim,
      child(say("Rice."), 2),
      leadResult({ say: "Yummy!", move: "react_only" }),
    );
    const third = messagesOf(next.p.request.body);
    expect(third).toHaveLength(5);
    expect(third[2]?.content).toBe(rec.child?.sentUserMessage);
    expect(third[3]?.content).toBe(rec.teacher.toriRewrite);
    expect(third[4]?.content).toContain("Child turn 2");
  });

  it("AC-26l 1~3단계 model_repeat: 따라 할 문장은 소리 줄 · 뜻 줄의 영어 문장 거름 · 받아 둔 차례(held_say), 다음 아이 차례는 '영어' · 답 예시 · '말했다' 빔과 사실 줄", () => {
    const m = materialsAt(3);
    const { sim } = leadTalking(m);
    const word = m.ctx.unitWords[0] ?? "sea";
    const { rec } = leadStep(
      sim,
      child(dontKnow),
      leadResult({
        reading: "does_not_know",
        move: "model_repeat",
        say: "That's okay! Say it with me: I see the sun.",
        say_ko: '맞아, 해가 밝지! "I see the sun."이라고 말해 봐.',
        model_sentence: "I see the sun.",
      }),
    );
    expect(sLines(rec).join(" ")).not.toContain("I see the sun");
    expect(rec.lines).toContainEqual({
      t: "sound",
      kind: "model",
      say: "I see the sun.",
    });
    expect(rec.lines).toContainEqual({ t: "ko", ko: "맞아, 해가 밝지!" });
    expect(rec.teacher.toriKo).toBe("맞아, 해가 밝지!");
    expect(rec.teacher.move.ai).toBe("model_line");
    expect(rec.teacher.move.sound).toEqual({ model: "I see the sun." });
    expect(rec.teacher.move.lead?.model).toEqual({
      sentence: "I see the sun.",
      inSay: true,
    });
    expect(rec.teacher.move.lead?.removed).toEqual(["I see the sun."]);
    expect(rec.held).toBe("say");
    expect(rec.teacher.move.lead?.gate).toContain("held_say");
    expect(rec.heard).toContain("I see the sun.");
    const next = leadStep(
      sim,
      child(say(`I see the sun ${word}.`), 2),
      leadResult({
        reading: "repeated_my_model",
        move: "react_only",
        say: "Great job!",
        child_used_on_own: [word],
      }),
    );
    expect(next.p.userMessage).toContain(
      'Your last turn gave a model sentence to repeat: "I see the sun."',
    );
    expect(next.rec.child?.hintKind).toBe("english");
    expect(next.rec.child?.heardHelp).toBe("answer_example");
    expect(next.rec.child?.saidWords).toEqual([]);
  });

  it("AC-26l · AC-26i 1~3단계 따라 할 문장 차례 바로 뒤의 되묻는 차례: 대본 도구도 서버와 같은 core 함수로 앞 차례의 소리 줄을 kept 줄로 내고, 그 줄은 들은 영어 · 행 move.sound 에 들지 않는다(평가 입력 그대로 — 묶음 S5 I-1)", () => {
    const m = materialsAt(3);
    const { sim } = leadTalking(m);
    leadStep(
      sim,
      child(dontKnow),
      leadResult({
        reading: "does_not_know",
        move: "model_repeat",
        say: "That's okay! Say it with me: I see the sun.",
        model_sentence: "I see the sun.",
      }),
    );
    const asked = leadStep(
      sim,
      child(say("Pad pad."), 2),
      leadResult({
        reading: "likely_misheard",
        move: "ask_again",
        say: "Sorry? Say it again, please.",
      }),
    );
    const { rec } = asked;
    expect(rec.lines).toContainEqual({
      t: "sound",
      kind: "model",
      say: "I see the sun.",
      lead: { kept: true },
    });
    expect(rec.heard).not.toContain("I see the sun.");
    expect(rec.teacher.move.sound).toBeUndefined();
    expect(rec.child?.askAgain).toBe(true);
    // 다음 아이 차례의 들은 도움 · 힌트 종류는 되물은 차례의 값을 하한으로 이어 받을 뿐이다(kept 줄은 들은 도움으로 세지 않음)
    const after = leadStep(
      sim,
      child(say("I see the sun."), 3),
      leadResult({ move: "react_only", say: "Great job!" }),
    );
    expect(after.rec.child?.hintKind).toBe(asked.rec.child?.hintKind);
    expect(after.rec.child?.heardHelp).toBe(asked.rec.child?.heardHelp);
  });

  it("AC-26l · AC-26i 저장된 행에서 다시 만든 소리 줄(같은 시도 다시 흘림 · 이어 하기 — core leadRowSoundLinesOf)이 실시간 길이 낸 소리 줄과 같다: 따라 할 문장 · 되묻는 차례의 kept · 고르기 물음의 ask(묶음 S5 지킬 것 2)", () => {
    const m = materialsAt(3);
    const { sim } = leadTalking(m);
    const steps = [
      leadStep(
        sim,
        child(dontKnow),
        leadResult({
          reading: "does_not_know",
          move: "model_repeat",
          say: "That's okay! Say it with me: I see the sun.",
          model_sentence: "I see the sun.",
        }),
      ),
      leadStep(
        sim,
        child(say("Pad pad."), 2),
        leadResult({
          reading: "likely_misheard",
          move: "ask_again",
          say: "Sorry? Say it again, please.",
        }),
      ),
      leadStep(
        sim,
        child(dontKnow, 3),
        leadResult({
          reading: "does_not_know",
          move: "easier_or_choices",
          say: "That's okay! Apples or bananas?",
        }),
      ),
    ];
    // 행: 선생님 행(턴 번호 n) 뒤 아이 행(같은 번호) — 대화 차례(leadConversationOrder)와 같은 꼴
    const rows = steps.flatMap(({ rec }, i) => [
      {
        speaker: "tori" as const,
        turnNo: i + 1,
        segment: "talk",
        text: rec.teacher.text,
        move: rec.teacher.move,
        sentUserMessage: rec.teacher.sentUserMessage,
      },
      {
        speaker: "child" as const,
        turnNo: i + 1,
        segment: "talk",
        text: "",
      },
    ]);
    steps.forEach(({ rec }, i) => {
      const teacher = rows.find(
        (r) => r.speaker === "tori" && r.turnNo === i + 1,
      );
      if (!teacher) throw new Error("행 없음");
      expect(
        leadRowSoundLinesOf({ level: 3, rows, teacher }),
        `${i + 1} 차례`,
      ).toEqual(rec.lines.filter((l) => l.t === "sound"));
    });
    expect(steps[1]?.rec.lines.filter((l) => l.t === "sound")).toEqual([
      {
        t: "sound",
        kind: "model",
        say: "I see the sun.",
        lead: { kept: true },
      },
    ]);
  });

  it("AC-26l · AC-26i 되묻기가 둘 이어지면 둘째 되묻는 차례도 앞 행이 보인 듣기 줄(kept)을 이어 받고, 보통 차례에서 사라진다: 실시간 길 · 저장된 행에서 다시 만든 줄이 같고 행 move.sound 는 비어 있다(검토 rev-s5 M-1)", () => {
    const m = materialsAt(3);
    const { sim } = leadTalking(m);
    const ask = leadResult({
      reading: "likely_misheard",
      move: "ask_again",
      say: "Sorry? Say it again, please.",
    });
    const steps = [
      leadStep(
        sim,
        child(dontKnow),
        leadResult({
          reading: "does_not_know",
          move: "model_repeat",
          say: "That's okay! Say it with me: I see the sun.",
          model_sentence: "I see the sun.",
        }),
      ),
      leadStep(sim, child(say("Pad pad."), 2), ask),
      leadStep(sim, child(say("Pad."), 3), ask),
      leadStep(
        sim,
        child(say("I see the sun."), 4),
        leadResult({ move: "react_only", say: "Great job!" }),
      ),
    ];
    const kept = {
      t: "sound",
      kind: "model",
      say: "I see the sun.",
      lead: { kept: true },
    };
    const soundOf = (i: number) =>
      steps[i]?.rec.lines.filter((l) => l.t === "sound");
    expect(soundOf(1)).toEqual([kept]);
    expect(soundOf(2)).toEqual([kept]);
    expect(soundOf(3)).toEqual([]);
    expect(steps[1]?.rec.teacher.move.sound).toBeUndefined();
    expect(steps[2]?.rec.teacher.move.sound).toBeUndefined();
    const rows = steps.flatMap(({ rec }, i) => [
      {
        speaker: "tori" as const,
        turnNo: i + 1,
        segment: "talk",
        text: rec.teacher.text,
        move: rec.teacher.move,
        sentUserMessage: rec.teacher.sentUserMessage,
      },
      {
        speaker: "child" as const,
        turnNo: i + 1,
        segment: "talk",
        text: "",
      },
    ]);
    steps.forEach((_, i) => {
      const teacher = rows.find(
        (r) => r.speaker === "tori" && r.turnNo === i + 1,
      );
      if (!teacher) throw new Error("행 없음");
      expect(
        leadRowSoundLinesOf({ level: 3, rows, teacher }),
        `${i + 1} 차례`,
      ).toEqual(soundOf(i));
    });
  });

  it("AC-26l 1~3단계 막힌 뒤 고르기: or 물음 문장은 소리 줄 하나 · 앞 반응 그대로 · 받아 둔 질문은 아님(앞 문장이 먼저 나감), 막힌 뒤 뜻은 core leadExplanationOf(서버 새 엔진 길과 같은 함수 · 같은 인자)와 같다", () => {
    const m = materialsAt(3);
    const { sim } = leadTalking(m);
    const { p, rec } = leadStep(
      sim,
      child(dontKnow),
      leadResult({
        reading: "does_not_know",
        move: "easier_or_choices",
        say: "That's okay! Apples or bananas?",
        say_ko: "괜찮아! 사과야, 바나나야?",
        hint_ko: "사과라고 말해 봐.",
        hint_en: "Apples.",
      }),
    );
    expect(sLines(rec)).toEqual(["That's okay!"]);
    // 고르기 물음 줄은 ask 표지를 단다(서버와 같은 core leadSoundLinesOf — 묶음 S5 화면 검토 M-1)
    expect(rec.lines).toContainEqual({
      t: "sound",
      kind: "answer",
      say: "Apples or bananas?",
      lead: { ask: true },
    });
    expect(rec.teacher.text).toBe("That's okay!");
    expect(rec.teacher.move.ai).toBe("choices");
    expect(rec.teacher.move.sound).toEqual({ answer: "Apples or bananas?" });
    expect(rec.teacher.move.lead?.choices).toBe(true);
    expect(rec.teacher.move.cause).toBe("button");
    expect(rec.held).toBeNull();
    const lite = p.child?.lite;
    if (!lite) throw new Error("아이 행 없음");
    const after = talkLessonPositionOf({
      spec: m.spec,
      card: m.card,
      newWords: m.newWords,
      turns: [...light(sim.rows).slice(0, -2), lite],
      segment: "talk",
      settings: talkLessonSettingsFrom((k) => LEAD_VALUES[k], bandOf(m.level)),
      prepWords: [],
    });
    // 서버 lead-turn.ts 와 같은 인자: 이 아이 차례 꼴 · 아이 차례를 더한 위치의 막힘 수 · 단계 규격 · 단계 · 응답의 hint_ko
    const expected = leadExplanationOf({
      child: lite,
      stuckInSlot: () => after.stuckInSlot,
      spec: m.spec,
      level: m.level,
      hintKo: "사과라고 말해 봐.",
    });
    expect(expected).not.toBeNull();
    expect(rec.teacher.explanation).toBe(expected);
  });

  it("AC-26l 좁은 정의: 걸린 질문은 같은 뜻 다시 말하기 한 번(서버와 같은 요청 글 · 같은 기록), 받는 조건을 지난 문장이 그 자리 · 앞 반응 그대로", () => {
    const { sim } = leadTalking();
    const ready = sim.lead.prepare(child(say("I play outside.")));
    if (!ready.ok) throw new Error(ready.reason);
    const original = "Do you go in summer or winter?";
    expect(
      leadNarrowHitsOf(original, ready.turn.levelInput).length,
    ).toBeGreaterThan(0);
    const first = leadResult({
      say: `You went outside! ${original}`,
      say_ko: "밖에 나갔구나! 여름에 가, 겨울에 가?",
    });
    const ask = sim.lead.retryOf(ready.turn, first);
    if (!ask) throw new Error("다시 말하기 요청이 없다");
    const prompt = messagesOf(ask.request.body).at(-1)?.content ?? "";
    expect(prompt).toContain(`Your question "${original}"`);
    expect(prompt).not.toMatch(
      /different question|another question|ask about/i,
    );
    // 앞 기록 + 이 차례 응답 원문(assistant) + 요청 글
    expect(messagesOf(ask.request.body).at(-2)?.role).toBe("assistant");
    const rec = sim.lead.finish(ready.turn, first, {
      ask,
      result: retryResult("Do you go there when it is hot?"),
    });
    expect(sLines(rec)).toEqual([
      "You went outside!",
      "Do you go there when it is hot?",
    ]);
    expect(rec.teacher.text).toBe(
      "You went outside! Do you go there when it is hot?",
    );
    expect(JSON.parse(rec.teacher.toriRewrite ?? "{}").say).toBe(
      "You went outside! Do you go there when it is hot?",
    );
    expect(rec.teacher.move.lead?.narrow).toMatchObject({
      retry: "Do you go there when it is hot?",
      ms: 2900,
    });
    expect(rec.narrow).toMatchObject({ called: true, sentence: original });
    expect(rec.held).toBeNull();
  });

  it("AC-26l 좁은 정의: 다시 받은 글이 두 문장이거나 호출이 없으면 원래 질문이 나간다 · 첫 문장이 걸린 질문이면 받아 둔 질문(held_question)", () => {
    for (const retry of ["Okay! Do you like big animals?", null] as const) {
      const { sim } = leadTalking();
      const original = "Do you go in summer or winter?";
      const first = leadResult({ say: original });
      const ready = sim.lead.prepare(child(say("I play outside.")));
      if (!ready.ok) throw new Error(ready.reason);
      const ask = sim.lead.retryOf(ready.turn, first);
      const rec = sim.lead.finish(
        ready.turn,
        first,
        ask && retry !== null ? { ask, result: retryResult(retry) } : undefined,
      );
      expect(sLines(rec)).toEqual([original]);
      expect(rec.teacher.move.lead?.narrow?.retry).toBe("");
      expect(rec.held).toBe("question");
      expect(rec.teacher.move.lead?.gate).toContain("held_question");
      expect(rec.narrow?.called).toBe(retry !== null);
    }
  });

  it("AC-26l 문장 문: 금지어 문장은 카드 안전한 대사로 바뀌고 나머지는 그대로 · gate 에 걸린 검사 이름", () => {
    const m = materialsAt(3);
    const { sim } = leadTalking(m);
    const { p, rec } = leadStep(
      sim,
      child(say("I like apples.")),
      leadResult({ say: "Haha! That is stupid. Do you like apples?" }),
    );
    expect(sLines(rec)).toEqual(["Haha!", p.safeLine, "Do you like apples?"]);
    expect(JSON.stringify(rec.lines)).not.toContain("stupid");
    expect(rec.teacher.move.lead?.gate).toContain("forbidden");
    // 안전한 대사는 서버와 같은 고르기(lessonSafeLineOf — 기록 쌍 수 + 1)
    expect(p.safeLine).toBe(safeLineOf(m.card.safeLines, 2));
  });

  it("AC-26l 말소리 없음 · 되묻기: '(The child said nothing.)' 줄, 되묻기 차례는 되물음 표지 · '말했다' 빔, 다음 답은 되물은 차례의 힌트 칸을 하한으로", () => {
    const m = materialsAt(3);
    const { sim } = leadTalking(m);
    const quiet = leadStep(
      sim,
      child(noSpeech),
      leadResult({ say: "Are you there?", move: "react_only" }),
    );
    expect(quiet.p.userMessage).toContain("(The child said nothing.)");
    const word = m.ctx.unitWords[0] ?? "sea";
    const again = leadStep(
      sim,
      child(say(`Pad ${word} pad pad.`), 2),
      leadResult({
        reading: "likely_misheard",
        move: "ask_again",
        say: "Sorry, say it again, please!",
        child_used_on_own: [word],
      }),
    );
    expect(again.rec.child?.askAgain).toBe(true);
    expect(again.rec.child?.saidWords).toEqual([]);
    expect(sim.rows.findLast((r) => r.speaker === "child")).toMatchObject({
      askAgain: true,
    });
  });

  it("AC-26l 마무리 차례: 앱이 정한 때에 사실 줄, 물음이 없을 때만 지금 상수 물음 · 두 단추 차례 · move wrap_up 은 마무리 제안 길(통합 시험 AC-26c 와 같은 꼴)", () => {
    const m = materialsAt(3);
    for (const ownQuestion of [false, true]) {
      const { sim } = leadTalking(m);
      let i = 1;
      let last: ReturnType<typeof leadStep> | null = null;
      for (;;) {
        const ready = sim.lead.prepare(child(say("I like it."), i));
        if (!ready.ok) throw new Error(ready.reason);
        if (ready.turn.closing) {
          last = {
            p: ready.turn,
            ask: null,
            rec: sim.lead.finish(
              ready.turn,
              leadResult({
                say: ownQuestion
                  ? "You did great! Shall we talk a little more?"
                  : "You did great today!",
                move: "react_only",
              }),
            ),
          };
          break;
        }
        sim.lead.finish(
          ready.turn,
          leadResult({ say: "Nice!", move: "react_only" }),
        );
        i++;
        if (i > 40) throw new Error("마무리 차례에 닿지 않는다");
      }
      expect(last.p.userMessage).toContain("This is the closing turn.");
      expect(last.rec.teacher.move.kind).toBe("closing_slot");
      const added = last.rec.lines.filter((l) => l.t === "add");
      if (ownQuestion) {
        expect(added).toEqual([]);
        expect(last.rec.teacher.move.lead?.closingAdded).toBeUndefined();
      } else {
        expect(added).toEqual([
          {
            t: "add",
            kind: "more_prompt",
            en: MORE_PROMPT.en,
            ...(m.spec.koMeaning ? { ko: MORE_PROMPT.ko } : {}),
          },
        ]);
        expect(last.rec.teacher.text).toBe(
          `You did great today!\n${MORE_PROMPT.en}`,
        );
      }
      expect(sim.stopBefore()?.choice).toBe("closing");
      // '더 이야기하기' → 행 없이 토막만(서버 lessonMoreLeadOf 와 같은 결정) → 입구 more
      const core = coreOf(m, sim, "talk");
      const server = lessonMoreLeadOf(core);
      expect(observeMoreLeadOf(core)).toEqual(server);
      const rowsBefore = sim.rows.length;
      expect(sim.chooseMore()).toEqual({ ok: true, mode: "claude" });
      expect(sim.rows).toHaveLength(rowsBefore);
      expect(sim.lead.openDue()).toBe("more");
      const more = leadStep(
        sim,
        { kind: "open", open: "more" },
        leadResult({ say: "Yay! What else do you like?" }),
      );
      expect(more.p.userMessage).toContain("(The child chose to talk more.)");
      expect(more.p.userMessage).not.toContain("Child turn");
      expect(more.rec.teacher.move.kind).toBe("ai");
      expect(sim.rows.at(-1)).toMatchObject({
        speaker: "tori",
        segment: "more_talk",
      });
      expect(sim.stopBefore()).toBeNull();
    }
    // Claude 가 스스로 마무리를 고른 차례 → 마무리 제안 길(참고 턴 전)
    const { sim } = leadTalking(m);
    const wrap = leadStep(
      sim,
      child(say("I'm tired.")),
      leadResult({ say: "That was fun! Shall we stop here?", move: "wrap_up" }),
    );
    expect(wrap.p.userMessage).not.toContain("This is the closing turn.");
    expect(readTalkMove(wrap.rec.teacher.move)?.next).toBe("closing");
    expect(sim.stopBefore()?.choice).toBe("suggestion");
  });

  it("AC-26l 아이 이름은 가린 뒤 실린다(이름 자리 밖의 아이 이름 없음)", () => {
    const { sim } = leadTalking();
    const ready = sim.lead.prepare(child(say(`I am ${SAMPLE_CHILD_NAME}.`)));
    if (!ready.ok) throw new Error(ready.reason);
    expect(JSON.stringify(ready.turn.request.body)).not.toContain(
      SAMPLE_CHILD_NAME,
    );
  });

  it("AC-26l 서버 배선 사본이 서버 export 와 같다: lessonChildLiteOf · lessonOverLengthOf · lessonMoreOf(지금 방식 '더 이야기하기')", () => {
    const m = materialsAt(3);
    const settings = talkLessonSettingsFrom(
      (k) => config.values[k],
      bandOf(m.level),
    );
    const sim = createTalkSim(m, config.values, config.book);
    const position = talkLessonPositionOf({
      spec: m.spec,
      card: m.card,
      newWords: m.newWords,
      turns: light(sim.rows),
      segment: "greeting",
      settings,
      prepWords: [],
    });
    for (const input of [
      { mode: "speech" as const },
      { mode: "dont_know" as const, nospeech: true },
      { mode: "dont_know" as const, nospeech: false },
    ])
      for (const stuck of [false, true])
        expect(observeChildLiteOf(position, input, settings, stuck)).toEqual(
          lessonChildLiteOf(position, input, settings, stuck),
        );
    for (const words of [0, 1])
      for (const sentences of [1, 3, 4])
        expect(observeOverLengthOf({ words, sentences, max: 3 })).toBe(
          lessonOverLengthOf({ words, sentences, max: 3 }),
        );
    // 지금 방식: 마무리 물음까지 가서 '더 이야기하기'
    const greet = sim.prepare(say("I am fine."), 0);
    if (!greet.ok) throw new Error(greet.reason);
    sim.finish(greet.turn, fakeMessage({ tori_en: "Good to hear!" }));
    for (let i = 1; i < 40 && sim.stopBefore() === null; i++) {
      const ready = sim.prepare(say("I like it."), i);
      if (!ready.ok) break;
      sim.finish(
        ready.turn,
        fakeMessage({ tori_en: "Nice! Do you like the sea?" }),
      );
    }
    expect(sim.stopBefore()?.choice).not.toBeNull();
    const core = coreOf(m, sim, "talk");
    const server = lessonMoreOf({ ...core, settings });
    const tool = observeMoreOf({ ...core, settings });
    expect(tool).toEqual(server);
    const chosen = sim.chooseMore();
    if (!server.ok) expect(chosen.ok).toBe(false);
    else {
      expect(chosen).toEqual({ ok: true, mode: "app", line: server.line });
      expect(sim.rows.at(-1)).toMatchObject({
        speaker: "tori",
        text: `\n${server.line.en}`,
        move: server.move,
      });
      expect(sim.stopBefore()).toBeNull();
    }
  });
});

// ── 이야기 방식 묶음 T1(회화 대화 구조 R plan 'T1 대본 도구 · 짝 시험' · NFR-4 · AC-3 · AC-11 · AC-18) ──────────────────────────────
// 대본 도구(createTalkSim 의 chat 길)가 서버 턴 길(src/server/conversation/chat-turn.ts chatTeacherTurn · saveChatTurn)과 같은 판단 함수를 같은 차례로
// 부르는지 본다. 서버 쪽은 시험 안에 옮긴 짝(serverChatTurn)이다: 저장 행 → 서버 lessonFlowTurnsOf(quiet 거름) → 서버 lessonChildRowOf(아이 행) →
// core 입력 · 계획 · 대화 기록 → 서버 talkChatSentUserMessageOf → 서버 streamTalkChat(가짜 Anthropic 으로 실제 흘려 받기) → core chatTurnResultOf →
// core 아이 행 칸 · 힌트 칸 → 서버 chatJudgeRowsOf + core chatJudgesOf. 같은 가짜 응답을 도구에 넣고 요청 본문 · 보낸 메시지 · 줄 · 행 · 끝 줄 신호 ·
// 판정 기록이 같은지 견준다. AI · DB 를 부르지 않는다.

const CHAT_VALUES: Record<string, unknown> = {
  ...config.values,
  [TALK_LEAD_MODE_KEY]: "chat",
};
/** 수업 시작 시각(서울 토요일 아침 — 수업 시작 줄의 요일 · 때). */
const CHAT_AT = new Date("2026-11-14T01:00:00.000Z");
/** 미나의 이야기 방식 재료(시드 teachers.json — 서버 chatMaterialOf 가 읽는 두 칸). */
const CHAT_TEACHER = (() => {
  const row = (
    JSON.parse(readFileSync(`${ROOT}/seed/teachers.json`, "utf8")) as {
      teachers: {
        key: string;
        chatPersonaEn?: string;
        chatFavoritesEn?: string;
      }[];
    }
  ).teachers.find((t) => t.key === "mina");
  if (!row?.chatPersonaEn || !row.chatFavoritesEn)
    throw new Error("미나의 이야기 방식 재료가 없다");
  return {
    chatPersonaEn: row.chatPersonaEn,
    chatFavoritesEn: row.chatFavoritesEn,
  };
})();

/** 이야기 방식 응답(네 칸 — 칸 차례는 listen_sentence · say · say_ko · wrap_up). */
function chatAnswerOf(over: Partial<TalkChatOutput> = {}): TalkChatOutput {
  return {
    listen_sentence: "",
    say: "Oh, nice!",
    say_ko: "",
    wrap_up: false,
    ...over,
  };
}

function chatResult(
  answer: TalkChatOutput | string,
  extra: { stop?: string } = {},
): CallResult {
  return {
    ok: true,
    message: {
      model: "claude-sonnet-5-5",
      stop_reason: extra.stop ?? "end_turn",
      content: [
        {
          type: "text",
          text: typeof answer === "string" ? answer : JSON.stringify(answer),
        },
      ],
      usage: {
        input_tokens: 3200,
        output_tokens: 90,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 2800,
      },
    },
    latencyMs: 1500,
    firstSentenceMs: 600,
    requestId: "req_chat",
  } satisfies CallResult;
}

/** 가짜 Anthropic 의 흘려 받기 응답(서버 streamTalkChat 이 받는 꼴 — talk-chat-stream 시험의 bodyOf 와 같은 메시지). */
function chatStreamRule(
  answer: TalkChatOutput | string,
  stop = "end_turn",
): FakeRule {
  return {
    reply: {
      kind: "stream",
      body: {
        id: "msg_chat_t1",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-5-5",
        content: [
          {
            type: "text",
            text: typeof answer === "string" ? answer : JSON.stringify(answer),
            citations: null,
          },
        ],
        stop_reason: stop,
        stop_sequence: null,
        usage: {
          input_tokens: 3200,
          output_tokens: 90,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 2800,
          service_tier: "standard",
        },
      },
      chunks: 9,
    },
    // 서버는 읽지 못함 · 거절 뒤 같은 시도를 한 번 더 보낸다 — 같은 응답을 한 번 더 준다
    times: 2,
  };
}

function chatSimOf(
  m: Materials = materialsAt(3),
  values: Record<string, unknown> = CHAT_VALUES,
) {
  return createTalkSim(m, values, config.book, {
    chatAt: CHAT_AT,
    rotationKey: "t1",
  });
}

const chatChild = (
  step: ObserveStep,
  extra: Partial<Extract<ChatSimEntry, { kind: "child" }>> = {},
): ChatSimEntry => ({ kind: "child", step, stepIndex: 0, ...extra });
const chatOpen = (open: ChatOpen): ChatSimEntry => ({ kind: "open", open });

/** 서버 행 꼴(talk_turns 행 — 서버 함수가 읽는 칸만 채우고 나머지는 시험에 닿지 않는다). */
const asServerRows = (rows: readonly ChatSimRow[]) =>
  rows.map((r) => ({ ...r }) as unknown as TalkTurnRow);

/** move.chat.firstMs 는 흘려 받는 시계(서버 · 도구가 다름)라 견줌에서 뺀다. */
function withoutFirstMs(move: unknown): unknown {
  const m = move as { chat?: Record<string, unknown> } | null;
  if (!m?.chat) return move;
  const { firstMs: _first, ...chat } = m.chat;
  return { ...m, chat };
}

type ServerChatOut = {
  body: Record<string, unknown>;
  userMessage: string;
  lines: unknown[];
  close: { reason: "safety"; farewell: unknown } | null;
  signal: unknown;
  teacher: unknown;
  child: unknown;
  judge: unknown;
  met: string[];
  facts: string[];
};

/**
 * 서버 턴 길의 한 차례(chat-turn.ts chatTeacherTurn · saveChatTurn 의 판단 차례를 그대로 — DB · 잠금 · 표지 행 · 알림 · 응답 뒤 작업만 뺌).
 * 행은 도구가 지금까지 쌓은 행(서버 talk_turns 꼴)을 받는다. answer 가 null 이면 호출 실패(chat-turn.ts 의 catch — server).
 */
async function serverChatTurn(
  m: Materials,
  values: Record<string, unknown>,
  sim: TalkSim,
  entry: ChatSimEntry,
  answer: TalkChatOutput | string | null,
  opts: { stop?: string } = {},
): Promise<ServerChatOut> {
  const level = m.level;
  const band = bandOf(level);
  const settings = talkLessonSettingsFrom((k) => values[k], band);
  const snap = sim.snapshot();
  const live = asServerRows(sim.chat.serverRows());
  const session = { start: { leadMode: "chat" as const }, level };
  const turns = lessonFlowTurnsOf(live, session);
  const args = {
    spec: m.spec,
    card: m.card,
    newWords: m.newWords,
    turns,
    segment: snap.segment,
    settings,
    prepWords: snap.prepWords,
  };
  const position = talkLessonPositionOf(args);
  const ordered = leadConversationOrder(live);
  const maxTurn = live.reduce((max, r) => Math.max(max, r.turnNo), 0);
  // (가) 이 차례를 연 것: 아이 말(lesson-turn 이 lessonChildRowOf 로 넣은 행) · 조용함(입구가 넣은 quiet 행) · 입구
  let child: TalkTurnRow | null = null;
  let recognizer: ChatRecognizer | undefined;
  let opened = 0;
  let teacherTurnNo: number;
  let input: ChatInput;
  if (entry.kind === "child") {
    const step = entry.step;
    const mode = step.say === undefined ? "dont_know" : "speech";
    const request = {
      sessionId: "s",
      clientAttemptId: "a",
      input: {
        mode,
        ...(step.say === undefined ? {} : { text: step.say }),
        ...(step.input === "nospeech" ? { nospeech: true } : {}),
      },
      hint: { opened: entry.hintOpened ?? 0, heard: [] },
      ...(entry.recognizer === undefined
        ? {}
        : { recognizer: entry.recognizer }),
    } as Parameters<typeof lessonChildRowOf>[0];
    const fields = lessonChildRowOf(request, {
      state: {
        spec: lessonSpecOfMaterials(m),
        card: m.card,
        position,
        turns,
        liveRows: live,
        segment: snap.segment,
      } as unknown as Parameters<typeof lessonChildRowOf>[1]["state"],
      masker: sampleMasker,
    });
    const lastTeacher = live.at(-1) as TalkTurnRow;
    child = {
      id: `child-${lastTeacher.turnNo}`,
      turnNo: lastTeacher.turnNo,
      segment: snap.segment,
      speaker: "child",
      ...fields,
      stuckPhrase: null,
      sentUserMessage: null,
      toriRewrite: null,
      toriKo: null,
      aiQuestion: null,
      move: null,
      chatJudge: null,
      askAgain: null,
    } as unknown as TalkTurnRow;
    recognizer = entry.recognizer;
    opened = entry.hintOpened ?? 0;
    teacherTurnNo = lastTeacher.turnNo + 1;
    input = chatTurnInputOf(child, recognizer, {
      unsureConfidence: settings.chat.unsureConfidence,
      unsureOnPartial: settings.chat.unsureOnPartial,
    });
  } else if (entry.open === "quiet") {
    teacherTurnNo = maxTurn + 1;
    child = {
      id: `child-${teacherTurnNo - 1}`,
      turnNo: teacherTurnNo - 1,
      segment: snap.segment,
      speaker: "child",
      text: null,
      inputMode: "quiet",
      hintKind: "none",
      hintLevel: 0,
      clientListen: null,
      stuckPhrase: null,
      targetWords: null,
      sentUserMessage: null,
      toriRewrite: null,
      toriKo: null,
      aiQuestion: null,
      move: null,
      chatJudge: null,
      askAgain: null,
    } as unknown as TalkTurnRow;
    input = { kind: "quiet" };
  } else {
    teacherTurnNo = maxTurn + 1;
    input = chatOpenInputOf(
      entry.open,
      entry.open === "start"
        ? {
            clock: chatClockOf(
              CHAT_AT,
              values["app.timezone"] as string,
              settings.chat.dayPartHours,
            ),
            met: 0,
          }
        : null,
    );
  }
  const prepPlan = startPrepWordsOf({
    card: m.card,
    carryWords: [],
    unitWords: m.newWords,
    known: [],
    count: settings.prepWords,
  });
  const plan = chatTurnPlanOf({
    input,
    child,
    args,
    position,
    rows: live,
    segment: snap.segment,
    prepOpens: settings.prepMode === "always" && prepPlan.length > 0,
    safetyMaxTurns: values["talk.safety_max_turns"] as number,
    settings,
  });
  // (나) 요청 조립
  const history = chatHistoryOf(ordered);
  const chatInput: TalkChatInput = {
    level,
    unitWords: m.ctx.unitWords,
    teacher: {
      nameEn: m.teacher.nameEn,
      chatPersonaEn: CHAT_TEACHER.chatPersonaEn,
      chatFavoritesEn: CHAT_TEACHER.chatFavoritesEn,
    },
    topicEn: talkChatTopicOf(level, m.unit) as string,
    history,
    message: { facts: plan.facts, input },
  };
  const userMessage = talkChatSentUserMessageOf(chatInput, sampleMasker);
  // (다) 흘려 받기(서버 streamTalkChat — 가짜 Anthropic)
  const flow = createChatSentenceFlow({
    level,
    appStuck: plan.appStuck,
    holdAll: plan.lastTurn,
  });
  const streamed: string[] = [];
  const safeLine = lessonSafeLineOf({ card: m.card }, history.length + 1);
  const fake = createFakeAnthropic(
    answer === null ? [] : [chatStreamRule(answer, opts.stop)],
  );
  let outcome: Awaited<ReturnType<typeof streamTalkChat>>;
  if (answer === null) outcome = { ok: false, reason: "server", refusals: 0 };
  else {
    const at = new Date();
    outcome = await streamTalkChat({
      spec: talkChatTurnSpec,
      input: chatInput,
      rules: talkChatTurnSpec.rulesOf(values, chatInput),
      config: requestConfigOf({
        purpose: talkChatTurnSpec.purpose,
        level,
        values,
        book: config.book,
      }),
      otherModelConfig: null,
      masker: sampleMasker,
      forbidden: m.forbidden,
      metaPhrases: m.metaPhrases,
      book: config.book,
      client: createAnthropicClient({
        env: { ANTHROPIC_API_KEY: "test-key" },
        fetch: fake.fetch,
      }),
      clock: () => new Date(),
      startedAt: at,
      requestReceivedAt: at,
      safeLine,
      sentenceMaxWords: m.ctx.sentenceMaxWords,
      onListen: (listen) => flow.listen(listen),
      onSentence: (en) => {
        if (flow.accept(en)) streamed.push(en);
      },
      record: async () => {},
    });
  }
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
  // (라) 응답 갈래의 조립(서버와 같은 재료)
  const lists = seedLessonTalkLists();
  const homophones = seedHomophones();
  const lineOptions = lineOptionsOf({
    sentenceMaxWords: m.ctx.sentenceMaxWords,
    unitWords: m.ctx.unitWords,
    teacher: m.teacher,
    lineRange: {
      allowedWords: m.allowedWords,
      forms: m.forms,
      allowedForms: m.allowedForms,
      childWords: chatChildWordsOf(live, input),
      reaskWords: reaskWordsOf({
        turns,
        prepWords: snap.prepWords,
        metBefore: [],
      }),
    },
    lemmaOf: m.lemmaOf,
    homophones,
  });
  const check: ChatReplyCheck = {
    range: lineOptions,
    extra: {
      allowed: new Set(lists.allowed.allowed),
      allowedLemmaOf: allowedLemmaOfVocab(VOCAB_ROWS, lists.allowed.allowed),
    },
    sentenceMax: CHAT_SENTENCE_MAX,
    questionMax: CHAT_QUESTION_MAX,
    madeUpPhrases: lists.madeUp,
  };
  const result = chatTurnResultOf({
    plan,
    call,
    flow: { sent: flow.sent(), held: flow.held() },
    level,
    koMeaning: m.spec.koMeaning,
    check,
    card: m.card,
    safeLine,
    turnNo: child?.turnNo ?? teacherTurnNo,
    sentenceMax: teacherSentencesMaxOf(values, level),
    prevStage: chatPrevStageOf(live),
    rowsAfter: child !== null ? [...ordered, child] : ordered,
    settings: { lesson: settings, chat: settings.chat },
    // 만남 셈은 서버 그대로(chat-turn.ts lexicon — 단계 맥락의 단원 단어 + 수업 상태의 원형 표 state.lemmaOf, 컨트롤러 결정: 공식 학습 기록이라 바꾸지 않음)
    lexicon: { unitWords: m.ctx.unitWords, lemmaOf: lessonLemmaOfServer(m) },
  });
  const lines = [...streamed.map((en) => ({ t: "s", en })), ...result.lines];
  // (마) 행 칸(saveChatTurn)
  const teacher =
    result.teacher === null
      ? null
      : {
          id: `tori-${teacherTurnNo}`,
          turnNo: teacherTurnNo,
          segment: child?.segment ?? snap.segment,
          speaker: "tori",
          text: result.teacher.text,
          toriRewrite: result.teacher.toriRewrite,
          toriKo: result.teacher.toriKo,
          overLength: result.teacher.overLength,
          move: result.teacher.move,
          aiQuestion: null,
          sentUserMessage: child === null ? userMessage : null,
          inputMode: null,
          hintLevel: null,
          clientListen: null,
          chatJudge: null,
        };
  let childOut: unknown = null;
  let judge: unknown = null;
  if (child !== null) {
    const prevTeacher = live.find(
      (r) => r.speaker === "tori" && r.turnNo === child.turnNo,
    );
    const hint =
      plan.input.kind === "quiet"
        ? { hintKind: "none" as const, hintLevel: 0 }
        : chatChildHintOf({
            record: chatHintRecordOfRow(
              prevTeacher?.aiQuestion ?? null,
              lessonSpecOfMaterials(m),
            ),
            opened,
            stuckRun: position.stuckInSlot,
            heard: [
              ...new Set(
                heardHelpsOfMove(
                  readTalkMove(prevTeacher?.move),
                  lessonSpecOfMaterials(m),
                ),
              ),
            ],
          });
    const fields = chatChildFieldsOf({
      input: plan.input,
      sentUserMessage: userMessage,
      hint,
    });
    childOut = {
      inputMode: child.inputMode,
      text: child.text,
      clientListen: child.clientListen,
      ...fields,
    };
    const judgeRows = [
      ...live,
      { ...child, ...fields },
      ...(teacher === null ? [] : [teacher]),
    ] as unknown as ChatTurnRowLikeServer[];
    const judged = chatJudgeRowsOf(judgeRows, { band });
    const index = judged.ids.indexOf(child.id);
    judge =
      index < 0
        ? null
        : (chatJudgesOf(
            judged.rows,
            // 서버 chat-turn.ts 와 같은 판정 맥락(서버 chat-unit-words.ts chatJudgeContextFrom — 단계 맥락의 단원 낱말 재료, S2 fix 2)
            chatJudgeContextFrom(
              { card: m.card, spec: { band }, teacher: m.teacher },
              unitWordsServer(m),
              homophones,
            ),
          ).find((j) => j.row === index)?.judge ?? null);
  }
  const body = (fake.requests[0]?.body ?? {}) as Record<string, unknown>;
  const { stream: _stream, ...sent } = body;
  return {
    body: sent,
    userMessage,
    lines,
    close: plan.lastTurn
      ? { reason: "safety", farewell: result.farewell }
      : null,
    signal: plan.lastTurn ? null : result.finish.signal,
    teacher:
      teacher === null
        ? null
        : {
            text: teacher.text,
            toriRewrite: teacher.toriRewrite,
            toriKo: teacher.toriKo,
            overLength: teacher.overLength,
            move: withoutFirstMs(teacher.move),
            sentUserMessage: teacher.sentUserMessage,
            segment: teacher.segment,
            turnNo: teacher.turnNo,
          },
    child: childOut,
    judge,
    met: result.met,
    facts: plan.facts.map((f) => f.kind),
  };
}

/**
 * 서버 쪽 단원 낱말 재료(서버 chat-unit-words.ts chatUnitWordsOf — readChatUnitWords 가 DB 에서 읽는 꼴 자료를 시드 vocab.json 에서 같은 거름
 * (낱말이 단계 맥락의 단원 단어인 행 — 서버 lemmaEntriesOf)으로 도구와 따로 만든다. 개발 DB 의 vocab 은 그 시드를 적재한 것이다).
 */
function unitWordsServer(m: Materials) {
  const words = new Set(m.ctx.unitWords);
  return chatUnitWordsOf({
    unitWords: m.ctx.unitWords,
    lemmaEntries: VOCAB_ROWS.filter((v) => words.has(v.word)),
  });
}
const unitLemmaOfServer = (m: Materials) => unitWordsServer(m).lemmaOf;

/**
 * 서버 수업 상태의 원형 표(state.ts — lemmaLookup(lemmaEntriesOf(db, lesson.unitWords))): 그 수업 내용의 단원 단어(시드 수업의 unitWords) 각각의
 * 어휘 행으로 만든 표. 만남 셈 · 정리 되짚을 말이 쓴다. 시드에서 도구와 따로 만든다.
 */
function lessonLemmaOfServer(m: Materials) {
  const file = JSON.parse(
    readFileSync(`${ROOT}/seed/lessons/talk/${m.level}/${m.unit}.json`, "utf8"),
  ) as { lessons: { lessonNo: number; unitWords?: string[] }[] };
  const words = new Set(
    file.lessons.find((l) => l.lessonNo === m.lessonNo)?.unitWords ?? [],
  );
  return chatUnitWordsOf({
    unitWords: [...words],
    lemmaEntries: VOCAB_ROWS.filter((v) => words.has(v.word)),
  }).lemmaOf;
}

/** 이야기 방식 칸만 남긴 단계 규격(서버 state.spec 의 꼴 — band · koMeaning · hintTiers · targetTurns). */
function lessonSpecOfMaterials(m: Materials) {
  return { ...m.spec, band: bandOf(m.level) };
}

/** 서버 lessonRangeOf 의 이 대화 아이 낱말(앞 아이 행의 들린 글 + 이번 들린 글 — 도구 · 서버가 같은 재료). */
function chatChildWordsOf(
  rows: readonly TalkTurnRow[],
  input: ChatInput,
): string[] {
  return childWordsOf(rows, input.kind === "speech" ? input.heard : "");
}

/** 도구 한 차례: prepare → (가짜 응답) → finish. */
function chatToolTurn(sim: TalkSim, entry: ChatSimEntry, result: CallResult) {
  const ready = sim.chat.prepare(entry);
  if (!ready.ok) throw new Error(ready.reason);
  return { p: ready.turn, rec: sim.chat.finish(ready.turn, result) };
}

/**
 * 같은 상태 · 같은 응답으로 서버 짝과 도구를 한 차례씩 돌려 견준다(요청 본문 · 보낸 메시지 · 줄 · 닫는 줄 · 끝 줄 신호 · 선생님 행 · 아이 행 칸 ·
 * 첫 판정 기록 · 만남 · 사실 줄). 도구의 기록을 돌려준다.
 */
async function bothChat(
  m: Materials,
  values: Record<string, unknown>,
  sim: TalkSim,
  entry: ChatSimEntry,
  answer: TalkChatOutput | string | null,
  opts: { stop?: string } = {},
) {
  const server = await serverChatTurn(m, values, sim, entry, answer, opts);
  const { p, rec } = chatToolTurn(
    sim,
    entry,
    answer === null
      ? { ok: false, status: 500, detail: "api_error", latencyMs: 10 }
      : chatResult(answer, opts.stop === undefined ? {} : { stop: opts.stop }),
  );
  if (answer !== null) expect(p.request.body).toEqual(server.body);
  expect(p.userMessage).toBe(server.userMessage);
  expect(rec.lines).toEqual(server.lines);
  expect(rec.close).toEqual(server.close);
  expect(rec.signal).toEqual(server.signal);
  expect(
    rec.teacher === null
      ? null
      : {
          text: rec.teacher.text,
          toriRewrite: rec.teacher.toriRewrite,
          toriKo: rec.teacher.toriKo,
          overLength: rec.teacher.overLength,
          move: withoutFirstMs(rec.teacher.move),
          sentUserMessage: rec.teacher.sentUserMessage,
          segment: rec.teacher.segment,
          turnNo: rec.teacher.turnNo,
        },
  ).toEqual(server.teacher);
  expect(
    rec.child === null
      ? null
      : {
          inputMode: rec.child.inputMode,
          text: rec.child.text,
          clientListen: rec.child.clientListen,
          saidWords: rec.child.saidWords,
          selfUsedWords: rec.child.selfUsedWords,
          stuckPhrase: rec.child.stuckPhrase,
          sentUserMessage: rec.child.sentUserMessage,
          hintKind: rec.child.hintKind,
          hintLevel: rec.child.hintLevel,
        },
  ).toEqual(server.child);
  expect(rec.judge).toEqual(server.judge);
  expect(rec.met).toEqual(server.met);
  expect(rec.facts).toEqual(server.facts);
  return rec;
}

/** 수업 첫 말 → 인사 끝(짧은 준비가 열림) → 돌아옴까지 지난 이야기 방식 수업(서버 짝과 견주며). */
async function chatTalking(
  m: Materials = materialsAt(3),
  values: Record<string, unknown> = CHAT_VALUES,
) {
  const sim = chatSimOf(m, values);
  await bothChat(
    m,
    values,
    sim,
    chatOpen("start"),
    chatAnswerOf({ say: "Hi! How are you today?", say_ko: "안녕! 오늘 어때?" }),
  );
  for (let i = 0; i < 4 && sim.chat.openDue() !== "back"; i++)
    await bothChat(
      m,
      values,
      sim,
      chatChild({ say: "I am fine." }),
      chatAnswerOf({ say: "Good! Let's look at some words." }),
    );
  await bothChat(
    m,
    values,
    sim,
    chatOpen("back"),
    chatAnswerOf({ say: "Great job! What do you do on weekends?" }),
  );
  return sim;
}

describe("AC-27r 서버 턴 길과 createTalkSim 이 같은 함수를 부름(이야기 방식 묶음 T1)", () => {
  it("AC-27r 처음 스냅숏: 설정 chat · 3단계 · 단원 재료 · 선생님 재료 넷이 서면 이야기 방식이고 서버 lessonStartModeOf 와 같다, 하나라도 빠지면 지금 길", () => {
    const m3 = materialsAt(3);
    expect(chatSimOf(m3).chat.on).toBe(true);
    expect(chatSimOf(m3).lead.on).toBe(false);
    // 수업 첫 말 입구 start 를 받는 때이고 카드 인사 행을 넣지 않았다
    const sim = chatSimOf(m3);
    expect(sim.rows).toEqual([]);
    expect(sim.chat.openDue()).toBe("start");
    for (const [mode, teacher, unit, level] of [
      ["chat", CHAT_TEACHER, 1, 3],
      ["chat", null, 1, 3],
      ["chat", CHAT_TEACHER, 2, 3],
      ["chat", CHAT_TEACHER, 1, 4],
      ["app", CHAT_TEACHER, 1, 3],
      ["claude", CHAT_TEACHER, 1, 3],
    ] as const) {
      expect(
        observeChatStartModeOf({ mode, level, unit, teacher }),
        `${mode} · ${level}단계 단원 ${unit} · 선생님 재료 ${teacher !== null}`,
      ).toBe(lessonStartModeOf({ mode, level, unit, teacher }));
    }
    // 선생님 재료가 없는 선생님 · 4단계는 지금 길(카드 인사 행이 들어감)
    const noTeacher = chatSimOf({ ...m3, chatTeacher: null });
    expect(noTeacher.chat.on).toBe(false);
    expect(noTeacher.rows.length).toBeGreaterThan(0);
  });

  it("AC-27r 인사(수업 첫 말 start · 인사 끝 차례의 사실 줄) · 돌아옴(back): 요청 본문 · 보낸 메시지 · 줄 · 행 · 끝 줄 신호가 서버와 같다", async () => {
    const m = materialsAt(3);
    const sim = chatSimOf(m);
    const first = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatOpen("start"),
      chatAnswerOf({
        say: "Hi! How are you today?",
        say_ko: "안녕! 오늘 어때?",
      }),
    );
    expect(first.entry).toBe("start");
    expect(first.teacher?.sentUserMessage).toContain("Saturday morning");
    let greetingEnd: ChatTurnRecord | null = null;
    for (let i = 0; i < 4 && sim.chat.openDue() !== "back"; i++)
      greetingEnd = await bothChat(
        m,
        CHAT_VALUES,
        sim,
        chatChild({ say: "I am fine." }),
        chatAnswerOf({ say: "Good! Let's look at some words." }),
      );
    // 인사 끝 차례: 사실 줄 prep_next · 빈 신호(다음이 짧은 준비), 그 뒤 대화 토막 · 돌아옴 입구
    expect(greetingEnd?.facts).toEqual(["prep_next"]);
    expect(greetingEnd?.signal).toEqual({});
    expect(sim.snapshot().segment).toBe("talk");
    const back = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatOpen("back"),
      chatAnswerOf({
        say: "You know these words now! What do you do on weekends?",
      }),
    );
    expect(back.teacher?.move).toMatchObject({ kind: "first_question" });
    expect(back.signal).toMatchObject({ hint: true });
    expect(sim.chat.openDue()).toBeNull();
  });

  it("AC-27r 대화 · 1~3단계 따라 할 문장(소리 줄로 빼기) · 인식기 알림 · 모름 단추 · 말소리 없음 · 조용함 · 호출 실패가 서버와 같다", async () => {
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    // 대화(따라 할 문장이 소리 줄로 빠짐)
    const talk = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "I play soccer." }),
      chatAnswerOf({
        listen_sentence: "I play soccer.",
        say: 'Soccer is fun! Say "I play soccer." What else do you do?',
        say_ko: "축구 재밌지! 또 뭐 해?",
      }),
    );
    expect(talk.lines.some((l) => l.t === "sound")).toBe(true);
    // 인식기 알림(확신 정도가 낮음)
    const unsure = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild(
        { say: "I see the see." },
        { recognizer: { confidence: 0.2, alternative: "I see the sea." } },
      ),
      chatAnswerOf({ say: "The sea? Do you like the sea?" }),
    );
    expect(unsure.child?.sentUserMessage).toContain("recognizer");
    // 모름 단추(앱이 아는 막힘 — 설명 기다림)
    const dk = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ input: "dont_know" }),
      chatAnswerOf({ say: "That's okay! Do you like the beach or the park?" }),
    );
    expect(dk.signal).toMatchObject({ explainWait: expect.any(Number) });
    expect(dk.stage).toBe(1);
    // 말소리 없음(눌렀으나 듣지 못함 — 기기 쪽, 막힘 아님)
    const ns = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ input: "nospeech" }),
      chatAnswerOf({ say: "I didn't hear you. Can you say it again?" }),
    );
    expect(ns.child?.clientListen).toMatchObject({ src: "nospeech" });
    // 조용함 입구(quiet 행 · 잇달아 말한 수 1)
    const quiet = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatOpen("quiet"),
      chatAnswerOf({ say: "I like the park. It is green." }),
    );
    expect(quiet.child?.inputMode).toBe("quiet");
    expect(quiet.run).toBe(1);
    // 호출 실패(서버 catch — 안전한 대사)
    const failed = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "Yes." }),
      null,
    );
    expect(failed.call.kind).toBe("failed");
  });

  it("AC-27r 마무리 차례(사실 줄 closing · 두 단추) · 마무리 제안(wrap_up) → 더 이야기하기(more) 가 서버와 같다", async () => {
    const base = materialsAt(3);
    const m: Materials = { ...base, spec: { ...base.spec, targetTurns: 3 } };
    const sim = await chatTalking(m);
    let closing: ChatTurnRecord | null = null;
    for (let i = 0; i < 6 && sim.stopBefore() === null; i++)
      closing = await bothChat(
        m,
        CHAT_VALUES,
        sim,
        chatChild({ say: "I like the beach." }),
        chatAnswerOf({ say: "Me too! Do you want to talk more?" }),
      );
    expect(closing?.facts).toContain("closing");
    expect(closing?.turnEnd).toBe("closing");
    expect(closing?.signal).not.toHaveProperty("quietSeconds");
    expect(sim.stopBefore()?.choice).toBe("closing");
    const chosen = sim.chooseMore();
    expect(chosen).toEqual({ ok: true, mode: "chat" });
    expect(sim.chat.openDue()).toBe("more");
    const more = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatOpen("more"),
      chatAnswerOf({ say: "Yay! What is your favorite food?" }),
    );
    expect(more.entry).toBe("more");
    // 마무리 제안(선생님이 스스로 맺음 — wrap_up 참)
    const suggestion = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "Pizza." }),
      chatAnswerOf({ say: "Pizza is yummy! That was fun.", wrap_up: true }),
    );
    expect(suggestion.turnEnd).toBe("suggestion");
    expect(sim.stopBefore()?.choice).toBe("suggestion");
  });

  it("AC-27r 안전 상한 차례(quiet 행을 포함한 아이 차례 수): 사실 줄 last_turn · 닫는 줄 하나 · 수업이 닫힌다 — 서버와 같다", async () => {
    const m = materialsAt(3);
    const values = { ...CHAT_VALUES, "talk.safety_max_turns": 4 };
    const sim = await chatTalking(m, values);
    await bothChat(
      m,
      values,
      sim,
      chatOpen("quiet"),
      chatAnswerOf({ say: "I like the park." }),
    );
    let last: ChatTurnRecord | null = null;
    for (let i = 0; i < 6 && last?.close == null; i++)
      last = await bothChat(
        m,
        values,
        sim,
        chatChild({ say: "I like it too." }),
        chatAnswerOf({ say: "That was a great talk! Bye bye!" }),
      );
    if (last === null) throw new Error("차례가 없다");
    // 조용함 행을 포함한 아이 행 수가 talk.safety_max_turns 에 닿은 차례
    expect(
      sim.chat.serverRows().filter((r) => r.speaker === "child"),
    ).toHaveLength(4);
    expect(sim.chat.serverRows().some((r) => r.inputMode === "quiet")).toBe(
      true,
    );
    expect(last.facts).toEqual(["last_turn"]);
    expect(last.close).toEqual({
      reason: "safety",
      farewell: { en: "That was a great talk! Bye bye!" },
    });
    expect(last.lines).toEqual([]);
    expect(sim.stopBefore()?.reason).toBe("대화가 닫혔다");
  });

  it("AC-27r 말이 적은 아이: 조용함 → 조용함 → 상한(셋째는 입구를 받지 않고 끝 줄에 기다림 시간이 없음) · 조용함 뒤 말함은 셈을 끊는다", async () => {
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    const q1 = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatOpen("quiet"),
      chatAnswerOf({ say: "I like the park." }),
    );
    expect(q1.signal).toMatchObject({ quietSeconds: 8 });
    const q2 = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatOpen("quiet"),
      chatAnswerOf({ say: "Parks have trees." }),
    );
    expect(q2.run).toBe(2);
    expect(q2.signal).not.toHaveProperty("quietSeconds");
    expect(sim.chat.prepare(chatOpen("quiet"))).toMatchObject({ ok: false });
    // 조용함 뒤 말함: 잇달아 말한 수가 0 으로 돌아가 다시 기다림 시간이 실린다
    const spoke = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "Tree." }),
      chatAnswerOf({ say: "Trees are tall! Do you climb trees?" }),
    );
    expect(spoke.run).toBe(0);
    expect(spoke.signal).toMatchObject({ quietSeconds: 8 });
  });

  it("AC-27r 말이 적은 아이: 모름 단추가 이어지면 받침 단계 1 · 2 · 3(talk.dontknow_max 번째에 닫기) · 말소리 없음 → 조용함 → 말소리 없음은 서로 다른 입력 줄이다", async () => {
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    const stages: number[] = [];
    for (const say of ["Hmm, okay.", "Do you like cats or dogs?", "Okay!"]) {
      const rec = await bothChat(
        m,
        CHAT_VALUES,
        sim,
        chatChild({ input: "dont_know" }),
        chatAnswerOf({ say }),
      );
      stages.push(rec.stage);
    }
    expect(stages).toEqual([1, 2, 3]);
    const messages: string[] = [];
    for (const entry of [
      chatChild({ input: "nospeech" }),
      chatOpen("quiet"),
      chatChild({ input: "nospeech" }),
    ]) {
      const rec = await bothChat(
        m,
        CHAT_VALUES,
        sim,
        entry,
        chatAnswerOf({ say: "Take your time. Do you like cats?" }),
      );
      messages.push(
        (rec.child?.sentUserMessage ?? "").split("\n").at(-1) ?? "",
      );
    }
    expect(messages[0]).toBe(messages[2]);
    expect(messages[1]).not.toBe(messages[0]);
  });

  it("AC-27r 말이 적은 아이: 모름 단추 → 조용함 → 모름 단추는 받침 단계 1 · 1 · 2(조용함은 막힘 수를 늘리지도 끊지도 않고 앞 받침을 잇는다 — 보완 5 (1))", async () => {
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    const stages: number[] = [];
    for (const entry of [
      chatChild({ input: "dont_know" }),
      chatOpen("quiet"),
      chatChild({ input: "dont_know" }),
    ]) {
      const rec = await bothChat(
        m,
        CHAT_VALUES,
        sim,
        entry,
        chatAnswerOf({ say: "That's okay. Do you like cats or dogs?" }),
      );
      stages.push(rec.stage);
    }
    expect(stages).toEqual([1, 1, 2]);
  });

  it("AC-27r 서버 배선 사본이 서버 export 와 같다: 흘려 받기의 6.4 · 문장 문 짝 · 보낸 메시지 · 힌트 입력 · 평가 입력 · 판정 행", async () => {
    // 대본의 인식기 정보 글 상한(index.ts TALK_TEXT_MAX — 턴 요청 규격과 같은 값)
    expect(OBSERVE_CHAT_TEXT_MAX).toBe(TALK_TEXT_MAX);
    // 흘려 받기(talk.ts)
    for (const listen of ["I like cats.", "You are stupid.", ""])
      expect(
        observeChatListenCheckedOf(listen, materialsAt(3).forbidden, 7),
      ).toBe(chatListenCheckedOf(listen, materialsAt(3).forbidden, 7));
    const gate = {
      forbidden: materialsAt(3).forbidden,
      metaPhrases: materialsAt(3).metaPhrases,
      safeLine: "Let's talk!",
      sentenceMaxWords: 7,
    };
    for (const sayText of [
      "Hi! You are stupid. Bye.",
      "I am an AI model. Let's play.",
      "Nice!",
    ])
      expect(observeChatSayChangesOf(sayText, gate)).toEqual(
        chatSayChangesOf(sayText, gate),
      );
    // 힌트 · 평가 입력과 판정 행(chat-hint.ts · chat-eval.ts) — 대화가 쌓인 수업의 행으로
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "I play soccer." }),
      chatAnswerOf({
        listen_sentence: "I play soccer.",
        say: 'Soccer! Say "I play soccer." Who do you play with?',
      }),
    );
    await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatOpen("quiet"),
      chatAnswerOf({ say: "I play with my friends." }),
    );
    await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "Friend." }),
      chatAnswerOf({ say: "Friends are great! What do you play?" }),
    );
    const rows = sim.chat.serverRows();
    const serverRows = rows as unknown as ChatTurnRowLikeServer[];
    const teacher = rows.findLast((r) => r.speaker === "tori");
    const hintArgs = {
      teacherRowId: teacher?.id ?? "",
      level: 3,
      sentenceMaxWords: m.ctx.sentenceMaxWords,
      hintTiers: m.spec.hintTiers,
      teacherNameEn: m.teacher.nameEn,
    };
    expect(observeChatHintInputOf({ rows, ...hintArgs })).toEqual(
      chatHintInputOf({ rows: serverRows, ...hintArgs }),
    );
    for (const r of rows.filter((x) => x.speaker === "child")) {
      const evalArgs = {
        childRowId: r.id,
        contextTurns: 6,
        unitWords: m.ctx.unitWords,
      };
      expect(observeChatEvalInputOf({ rows, ...evalArgs })).toEqual(
        chatEvalInputFor({ rows: serverRows, ...evalArgs }),
      );
    }
    expect(observeChatJudgeRowsOf(rows, { band: bandOf(3) })).toEqual(
      chatJudgeRowsOf(serverRows, { band: bandOf(3) }),
    );
    // 정리 되짚을 말(lesson-turn.ts lessonWrapLinesOf — 이야기 방식 갈래)
    expect(sim.chat.wrapLines()).toEqual(
      lessonWrapLinesOf({
        rows: serverRows as unknown as TalkTurnRow[],
        card: m.card,
        spec: lessonSpecOfMaterials(m),
        lemmaOf: lessonLemmaOfServer(m),
        level: 3,
        start: { leadMode: "chat" } as never,
      }),
    );
    // 저장할 사용자 메시지(talkChatSentUserMessageOf)
    const ready = sim.chat.prepare(
      chatChild({ say: `I am ${SAMPLE_CHILD_NAME}.` }),
    );
    if (!ready.ok) throw new Error(ready.reason);
    expect(ready.turn.userMessage).toBe(
      talkChatSentUserMessageOf(ready.turn.chatInput, sampleMasker),
    );
    expect(ready.turn.userMessage).not.toContain(SAMPLE_CHILD_NAME);
  });

  it("AC-27r 기존 두 방식의 길은 이야기 방식 칸을 쓰지 않는다: app · claude 수업에서 chat 은 꺼져 있고 조용함 · 고르기 차례는 받지 않는다", () => {
    const m = materialsAt(3);
    for (const mode of ["app", "claude"] as const) {
      const sim = createTalkSim(
        m,
        { ...config.values, [TALK_LEAD_MODE_KEY]: mode },
        config.book,
      );
      expect(sim.chat.on).toBe(false);
      expect(sim.chat.prepare(chatOpen("start"))).toMatchObject({ ok: false });
      expect(sim.prepare({ input: "quiet" }, 0)).toMatchObject({ ok: false });
    }
  });
});

// ── 앱 행동 흉내(묶음 T1 '앱 행동' · '말이 적은 아이' — runChatScenario) ──────────────────────────────────────

/** 가짜 호출: 대화는 차례대로 준 응답, 힌트 · 설명 · 평가는 꼴만 맞춘 응답(또는 실패). 부른 갈래를 센다. */
function fakeChatCaller(
  dialog: readonly (TalkChatOutput | null)[],
  opts: { hintFails?: number } = {},
) {
  const calls: ChatCallKind[] = [];
  let at = 0;
  let hintFails = opts.hintFails ?? 0;
  const call: ChatCaller = async (kind) => {
    calls.push(kind);
    if (kind === "dialog") {
      const answer = dialog[Math.min(at, dialog.length - 1)] ?? null;
      at += 1;
      return answer === null
        ? { ok: false, status: 500, detail: "api_error", latencyMs: 5 }
        : chatResult(answer);
    }
    if (kind === "hint" || kind === "explain") {
      if (kind === "hint" && hintFails > 0) {
        hintFails -= 1;
        return { ok: false, status: 500, detail: "api_error", latencyMs: 5 };
      }
      return chatResult(
        JSON.stringify({
          hint_ko: "주말에 하는 것을 말해 봐요.",
          hint_en: "I play soccer.",
          explain_ko: "선생님은 주말에 뭐 하는지 물었어요.",
        }),
      );
    }
    return chatResult(
      JSON.stringify({
        reading: "clear_answer",
        teacher_move: "react_and_follow_up",
        model_sentence: "",
        child_used_on_own: [],
      }),
    );
  };
  return { call, calls };
}

const NICE = chatAnswerOf({ say: "Nice! What do you do on weekends?" });

describe("AC-27r 앱 행동(runChatScenario — 가짜 시계 · 조용함 타이머 · 힌트 누름 · 설명 · 평가 켜고 끄기)", () => {
  it("말이 적은 아이: 조용함 → 조용함 → 상한에서 기다림(호출 없음) → 말함", async () => {
    const sim = chatSimOf();
    const { call, calls } = fakeChatCaller([NICE]);
    const run = await runChatScenario(
      sim,
      [
        { say: "I am fine." },
        { input: "quiet" },
        { input: "quiet" },
        { input: "quiet" },
        { say: "Soccer." },
      ],
      { call, evalOn: false },
    );
    expect(run.stopped).toBeNull();
    const kinds = run.turns.map((t) => t.entry);
    // 입구 start · 인사 끝 차례 · 돌아옴 · 조용함 둘 · 셋째는 기다림 · 말함
    expect(kinds).toEqual([
      "start",
      "child",
      "back",
      "quiet",
      "quiet",
      "wait",
      "child",
    ]);
    const waited = run.turns.find((t) => t.entry === "wait");
    expect(waited?.note).toContain("조용함 신호 없음");
    // 조용함 차례는 타이머 함수가 정한 기다림(talk.chat_quiet_seconds) 뒤에 보냈다
    expect(
      run.turns.filter((t) => t.entry === "quiet").map((t) => t.waitedMs),
    ).toEqual([8000, 8000]);
    expect(calls.filter((k) => k === "dialog")).toHaveLength(6);
    expect(run.calls).toMatchObject({
      dialog: 6,
      hint: 0,
      explain: 0,
      eval: 0,
    });
  });

  it("말이 늦은 아이: 기다림 시간보다 오래 망설이면 조용함 차례가 먼저 오고 그 말은 다음 아이 차례로 간다", async () => {
    const sim = chatSimOf();
    const { call } = fakeChatCaller([NICE]);
    const run = await runChatScenario(
      sim,
      [{ say: "I am fine." }, { say: "Soccer.", chat: { waitSeconds: 10 } }],
      { call, evalOn: false },
    );
    expect(run.turns.map((t) => t.entry)).toEqual([
      "start",
      "child",
      "back",
      "quiet",
      "child",
    ]);
  });

  it("모름 단추가 이어지면 설명 요청(설명 기다림 신호)이 차례마다 가고, 힌트 누름은 단을 차례로 열어 연 단 수를 다음 턴 요청에 싣는다(실패 뒤 다시 받기)", async () => {
    const sim = chatSimOf();
    const { call, calls } = fakeChatCaller([NICE], { hintFails: 1 });
    const run = await runChatScenario(
      sim,
      [
        { say: "I am fine." },
        { say: "I play soccer.", hintTier: 2 },
        { input: "dont_know" },
        { input: "dont_know" },
      ],
      { call, evalOn: false },
    );
    expect(run.stopped).toBeNull();
    // 모름 단추 차례 뒤 끝 줄의 설명 기다림 신호마다 설명 요청 하나(힌트와 다른 표지 — 저장 칸은 같음)
    const explains = run.turns.filter((t) => t.explain !== undefined);
    expect(explains).toHaveLength(2);
    expect(calls.filter((k) => k === "explain")).toHaveLength(2);
    const said = run.turns.find((t) => t.hints.length > 0);
    expect(said?.hints.map((h) => h.reply.ok)).toEqual([false, true, true]);
    expect(said?.record?.child?.hintLevel).toBe(2);
    // 첫 누름 실패 → 다시 받기 한 번(talk.chat_hint_retry_max 1) → 둘째 단은 저장된 단(호출 없음)
    expect(calls.filter((k) => k === "hint")).toHaveLength(2);
  });

  it("인식기 알림 일정: 정한 차례에 확신 정도가 낮은 인식기 정보를 실으면 그 차례 메시지에만 알림 줄이 든다", async () => {
    const sim = chatSimOf();
    const { call } = fakeChatCaller([NICE]);
    const run = await runChatScenario(
      sim,
      [
        { say: "I am fine." },
        { say: "I see the see.", chat: { recognizer: { confidence: 0.2 } } },
        { say: "I see the sea." },
      ],
      { call, evalOn: false },
    );
    const children = run.turns.filter((t) => t.entry === "child");
    expect(children[1]?.record?.child?.sentUserMessage).toContain("recognizer");
    expect(children[2]?.record?.child?.sentUserMessage).not.toContain(
      "recognizer",
    );
  });

  it("기록 전용 평가 호출은 켜고 끌 수 있다: 켜면 말 입력 차례마다 하나(그 차례의 판정 기록이 있음), 끄면 '부르지 않음'", async () => {
    const steps: ObserveStep[] = [
      { say: "I am fine." },
      { say: "Soccer." },
      { input: "dont_know" },
      { say: "Pizza." },
      { choose: "stop" },
    ];
    const on = fakeChatCaller([NICE]);
    const withEval = await runChatScenario(chatSimOf(), steps, {
      call: on.call,
      evalOn: true,
    });
    // 말 입력 차례 셋(인사 끝 포함), 모름 단추는 부르지 않음
    expect(withEval.calls.eval).toBe(3);
    const off = fakeChatCaller([NICE]);
    const without = await runChatScenario(chatSimOf(), steps, {
      call: off.call,
      evalOn: false,
    });
    expect(without.calls.eval).toBe(0);
    expect(off.calls).not.toContain("eval");
    expect(
      without.turns.flatMap((t) => t.evals.map((e) => e.status)),
    ).toContain("not_called");
    expect(without.turns.at(-1)?.entry).toBe("choose");
  });

  it("기록: 차례마다 입구 종류 · 끝 줄 신호 · move.chat · 판정 기록 · 첫 문장 시간 · 입력 토큰 · 비용 · 호출 수(갈래별)를 남기고 아이 이름은 가린다", async () => {
    const sim = chatSimOf();
    const { call } = fakeChatCaller([NICE]);
    const run = await runChatScenario(
      sim,
      [{ say: `I am ${SAMPLE_CHILD_NAME}.` }, { say: "Soccer." }],
      { call, evalOn: true },
    );
    const said = run.turns.find((t) => t.entry === "child" && t.no === 2);
    expect(said?.record?.teacher?.move.chat).toBeDefined();
    expect(said?.record?.signal).toMatchObject({ hint: true });
    expect(said?.usage?.inputTokens).toBeGreaterThan(0);
    expect(said?.usage?.firstSentenceMs).toBe(600);
    expect(said?.calls).toMatchObject({ dialog: 1 });
    expect(JSON.stringify(run)).not.toContain(SAMPLE_CHILD_NAME);
    expect(run.costUsd).toBeGreaterThan(0);
  });

  it("어림 호출 수: 대본 차례로 대화 · 힌트 · 설명 · 평가 호출의 위쪽 어림을 낸다(부르기 전 계획 줄)", () => {
    const plan = chatCallPlanOf(
      [
        { say: "I am fine." },
        { input: "quiet" },
        { input: "dont_know" },
        { say: "Soccer.", hintTier: 2 },
        { choose: "more" },
        { say: "Pizza." },
      ],
      {
        prepOpens: true,
        evalOn: true,
        hintRetryMax: 1,
        teacherRunMax: 2,
      },
    );
    // 대화: start · 아이 차례 넷 · 조용함 하나 · back · more = 8, 힌트: 첫 누름 + 다시 받기 상한 = 2, 설명: 모름 단추 하나, 평가: 말 입력 셋
    expect(plan).toEqual({ dialog: 8, hint: 2, explain: 1, eval: 3 });
  });
});

describe("AC-27r 실제 호출의 문(runTalkObserve — 이야기 방식 대본)", () => {
  const chatScript = {
    name: "chat-quiet-child",
    title: "말이 적은 아이(이야기 방식)",
    level: 3,
    unit: 1,
    lesson: 1,
    teacher: "mina",
    settings: { [TALK_LEAD_MODE_KEY]: "chat" },
    steps: [
      { say: "I am fine." },
      { input: "quiet" },
      { input: "dont_know" },
      { say: "Soccer.", hintTier: 1 },
      { choose: "stop" },
    ],
  };
  function chatIo(client?: Anthropic) {
    const logs: string[] = [];
    const written = new Map<string, string>();
    return {
      logs,
      written,
      io: {
        root: ROOT,
        config,
        readScripts: () => [{ file: "chat-quiet-child.json", raw: chatScript }],
        readSeed: (level: number, unit: number) =>
          readSeedFiles(ROOT, level, unit),
        createClient: () => {
          if (!client) throw new Error("계획만인데 클라이언트를 만들었다");
          return client;
        },
        log: (line: string) => logs.push(line),
        write: (path: string, text: string) => written.set(path, text),
        now: () => new Date("2026-11-14T00:00:00Z"),
      },
    };
  }
  const argsOf = (over: Record<string, unknown> = {}) => {
    const parsed = parseArgs(["--out", "/tmp/talk-observe-chat"]);
    if (!parsed.ok) throw new Error(parsed.error);
    return { ...parsed.args, ...over };
  };

  it("--chat-eval 은 on · off 만 받는다(없으면 칸 없음 = 켬)", () => {
    expect(parseArgs(["--chat-eval", "off"])).toMatchObject({
      ok: true,
      args: { chatEval: false },
    });
    expect(parseArgs(["--chat-eval", "maybe"])).toMatchObject({ ok: false });
    const plain = parseArgs([]);
    expect(plain.ok && "chatEval" in plain.args).toBe(false);
  });

  it("--yes 없이는 호출 갈래별 어림 · 비용만 내고 부르지 않는다", async () => {
    const { io, logs, written } = chatIo();
    expect(await runTalkObserve(argsOf(), io)).toBe(0);
    expect(written.size).toBe(0);
    const line = logs.find((l) =>
      l.startsWith("chat-quiet-child · 이야기 방식"),
    );
    expect(line).toContain("대화 6 · 힌트 2 · 설명 1 · 평가 2(켬)");
    expect(logs.some((l) => l.startsWith("이야기 방식 합계:"))).toBe(true);
    const off = chatIo();
    await runTalkObserve(argsOf({ chatEval: false }), off.io);
    expect(
      off.logs.find((l) => l.startsWith("chat-quiet-child · 이야기 방식")),
    ).toContain("평가 0(끔 — 부르지 않음)");
  });

  it("--yes 면 대화 · 힌트 · 설명 · 평가가 같은 문을 지나 -chat.json 에 차례마다 기록되고, 평가를 끄면 평가 요청이 나가지 않는다", async () => {
    const bodies: Record<string, unknown>[] = [];
    const client = {
      beta: {
        messages: {
          stream: (body: Record<string, unknown>) => {
            bodies.push(body);
            const result = chatResult(
              chatAnswerOf({ say: "Nice! What do you do on weekends?" }),
            );
            return {
              on: () => undefined,
              finalMessage: async () => (result.ok ? result.message : null),
              request_id: "req_fake",
            };
          },
        },
      },
    } as unknown as Anthropic;
    const { io, written } = chatIo(client);
    expect(await runTalkObserve(argsOf({ yes: true }), io)).toBe(0);
    const path = [...written.keys()].find((k) => k.endsWith("-chat.json"));
    expect(path).toBeDefined();
    const json = JSON.parse(written.get(path ?? "") ?? "{}") as {
      runs: { run: ChatScenarioRunLike }[];
    };
    const run = json.runs[0]?.run;
    expect(run?.turns.map((t) => t.entry)).toEqual([
      "start",
      "child",
      "back",
      "quiet",
      "child",
      "child",
      "choose",
    ]);
    expect(run?.calls.dialog).toBe(6);
    expect(run?.calls.eval).toBeGreaterThan(0);
    expect(bodies).toHaveLength(
      (run?.calls.dialog ?? 0) +
        (run?.calls.hint ?? 0) +
        (run?.calls.explain ?? 0) +
        (run?.calls.eval ?? 0),
    );
    // 지금 길의 보고 · 지표 파일은 쓰지 않는다(돌린 대본이 이야기 방식뿐)
    expect([...written.keys()].some((k) => k.endsWith("-metrics.md"))).toBe(
      false,
    );
    const onBodies = [...bodies];
    const off = chatIo(client);
    bodies.length = 0;
    await runTalkObserve(argsOf({ yes: true, chatEval: false }), off.io);
    const offJson = JSON.parse(
      [...off.written.entries()].find(([k]) => k.endsWith("-chat.json"))?.[1] ??
        "{}",
    ) as { runs: { run: ChatScenarioRunLike }[] };
    expect(offJson.runs[0]?.run.calls.eval).toBe(0);
    // 평가 요청(사용자 메시지에 판정할 차례 표지가 든 요청)이 하나도 나가지 않았다 — 켠 실행에서는 나갔다
    const evalBodies = (list: readonly Record<string, unknown>[]) =>
      list.filter((b) => JSON.stringify(b).includes("CHILD TURN TO JUDGE"));
    expect(evalBodies(bodies)).toHaveLength(0);
    expect(evalBodies(onBodies)).toHaveLength(run?.calls.eval ?? -1);
  });
});

type ChatScenarioRunLike = {
  turns: { entry: string }[];
  calls: Record<"dialog" | "hint" | "explain" | "eval", number>;
};

// ── 묶음 T1 fix 1(코드 검토 rev-chat-t1 I-1 · M-1~M-3 · 실험 도구 T2 가 찾은 결함) ─────────────────────────────────

describe("T1 fix 1 — 힌트 단 재료 · 더 이야기하기 입구 · 힌트 실패 뒤 · 짝 시험의 폭 · 기록", () => {
  it("I-1 힌트 단 재료: 단계 맥락에만 있는 낱말(beach · sea)과 그 낱말의 다른 꼴(beaches)에서 도구의 단이 서버 재료(단계 맥락 25 · 그 낱말로 만든 원형 표)의 단과 같다", async () => {
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    for (const hintEn of [
      "I like the beach.",
      "I like beaches.",
      "I see the sea.",
    ]) {
      await bothChat(
        m,
        CHAT_VALUES,
        sim,
        chatChild({ say: "Yes." }),
        chatAnswerOf({ say: "Cool! What do you like?" }),
      );
      const ask = sim.chat.hintAsk("hint");
      if (ask.kind !== "call")
        throw new Error(`힌트 호출이어야 한다: ${ask.kind}`);
      const output = {
        hint_ko: "바닷가가 좋아요.",
        hint_en: hintEn,
        explain_ko: "",
      };
      const out = sim.chat.hintFinish(ask, chatResult(JSON.stringify(output)));
      const expected = chatHintRecordOf({
        output,
        spec: lessonSpecOfMaterials(m),
        unitWords: m.ctx.unitWords,
        lemmaOf: unitLemmaOfServer(m),
      });
      expect(out.ok ? out.record : null, hintEn).toEqual(expected);
      // 그 수업의 단원 단어 5개(eat · drink · go · come · wash)에는 없는 낱말이라 틀 단은 단계 맥락의 목록에서만 생긴다
      expect(
        expected.tiers.map((t) => t.kind),
        hintEn,
      ).toContain("frame");
    }
  });

  it("I-1 판정 맥락의 원형 표: 단계 맥락 낱말의 다른 꼴(saw · mountains)을 말한 차례의 첫 판정이 서버 재료와 같다", async () => {
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    const rec = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "I saw the mountains." }),
      chatAnswerOf({ say: "Wow, mountains! Were they tall?" }),
    );
    expect(rec.judge).not.toBeNull();
  });

  it("실험 도구가 찾은 결함: 마무리 제안(wrap_up) 자리에서 아이가 고르기 전에는 openDue 가 more 를 내지 않고, '더 이야기하기'를 고른 뒤에 한 번만 낸다", async () => {
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "Pizza." }),
      chatAnswerOf({ say: "Pizza is yummy! That was fun.", wrap_up: true }),
    );
    expect(sim.stopBefore()?.choice).toBe("suggestion");
    expect(sim.chat.openDue()).toBeNull();
    expect(sim.chooseMore()).toEqual({ ok: true, mode: "chat" });
    expect(sim.chat.openDue()).toBe("more");
    await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatOpen("more"),
      chatAnswerOf({ say: "Yay! What is your favorite food?" }),
    );
    expect(sim.chat.openDue()).toBeNull();
  });

  it("실험 도구가 찾은 결함: runChatScenario 는 마무리 제안 뒤 { choose: more } 차례가 와야 '더 이야기하기' 차례를 연다", async () => {
    const wrap = chatAnswerOf({ say: "That was fun! Bye!", wrap_up: true });
    const { call } = fakeChatCaller([NICE, NICE, NICE, wrap, NICE]);
    const run = await runChatScenario(
      chatSimOf(),
      [
        { say: "I am fine." },
        { say: "Soccer." },
        { choose: "more" },
        { say: "Pizza." },
      ],
      { call, evalOn: false },
    );
    expect(run.stopped).toBeNull();
    expect(run.turns.map((t) => t.entry)).toEqual([
      "start",
      "child",
      "back",
      "child",
      "choose",
      "more",
      "child",
    ]);
  });

  it("M-1 한 단이 다시 받기까지 실패하면 다음 단을 누르지 않아, 힌트 호출이 첫 누름 + 다시 받기 상한(서버와 같은 수 · 계획 줄 어림)을 넘지 않는다", async () => {
    const { call, calls } = fakeChatCaller([NICE], { hintFails: 99 });
    const sim = chatSimOf();
    const steps: ObserveStep[] = [
      { say: "I am fine." },
      { say: "Soccer.", hintTier: 2 },
    ];
    const run = await runChatScenario(sim, steps, { call, evalOn: false });
    const max = 1 + sim.chat.settings.hintRetryMax;
    expect(calls.filter((k) => k === "hint")).toHaveLength(max);
    expect(
      chatCallPlanOf(steps, {
        prepOpens: true,
        evalOn: false,
        hintRetryMax: sim.chat.settings.hintRetryMax,
        teacherRunMax: sim.chat.settings.teacherRunMax,
      }).hint,
    ).toBe(max);
    const said = run.turns.find((t) => t.hints.length > 0);
    expect(said?.hints.every((h) => !h.reply.ok)).toBe(true);
    expect(said?.record?.child?.hintLevel).toBe(0);
  });

  it("M-2 걸린 문장 · 6.4 가 비운 따라 할 문장과 그 다음 차례(기록 글) · 읽지 못함 · 거절 차례가 서버와 같다", async () => {
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    const blocked = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "I play." }),
      chatAnswerOf({ say: "You are stupid. Do you like cats?" }),
    );
    expect(blocked.teacher?.move.chat?.gate ?? []).not.toEqual([]);
    const listen = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "Cats." }),
      chatAnswerOf({
        listen_sentence: "You are stupid.",
        say: "Hmm, cats! What do you like?",
      }),
    );
    expect(listen.teacher?.move.chat?.gate).toContain("listen_check");
    // 다음 차례: 6.4 가 비운 따라 할 문장의 기록 글(대화 기록)까지 요청 본문이 같다
    await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "Dogs." }),
      chatAnswerOf({ say: "Dogs are fun!" }),
    );
    const unreadable = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "Yes." }),
      "Sorry, no JSON here.",
    );
    expect(unreadable.call).toEqual({ kind: "failed", reason: "invalid" });
    const refused = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "Yes." }),
      "{}",
      { stop: "refusal" },
    );
    expect(refused.call).toEqual({ kind: "failed", reason: "refusal" });
  });

  it("M-2 직접 맞대지 않던 사본: 평가 실패 갈래 · 평가 상태(done · failed) · 원문 잃음 · 평가 쓰기가 서버 export 와 같다", async () => {
    for (const reason of [
      "timeout",
      "invalid",
      "output_blocked",
      "server",
      "refusal",
      "safety_cap",
    ])
      expect(observeChatEvalFailureOf(reason)).toBe(
        chatEvalFailureOf(reason as Parameters<typeof chatEvalFailureOf>[0]),
      );
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    for (const say of ["I play soccer.", "With my dad."])
      await bothChat(
        m,
        CHAT_VALUES,
        sim,
        chatChild({ say }),
        chatAnswerOf({ say: "Nice! Who else?" }),
      );
    const rows = sim.chat.serverRows();
    const serverRows = rows as unknown as ChatTurnRowLikeServer[];
    const ctx = chatJudgeContextFrom(
      { card: m.card, spec: { band: bandOf(3) }, teacher: m.teacher },
      unitWordsServer(m),
      seedHomophones(),
    );
    const children = rows.filter((r) => r.speaker === "child");
    const states = [
      {
        status: "done" as const,
        output: {
          reading: "clear_answer" as const,
          teacher_move: "react_and_follow_up" as const,
          model_sentence: "",
          child_used_on_own: ["soccer"],
        },
      },
      { status: "failed" as const, failure: "timeout" as const },
    ];
    for (const child of children)
      for (const state of states) {
        const args = { rows, childRowId: child.id, state, ctx };
        const tool = observeChatEvalWritesOf(args);
        expect(tool).toEqual(chatEvalWritesOf({ ...args, rows: serverRows }));
        // 쓴 판정으로 읽은 평가 상태도 같다
        for (const write of tool ?? []) {
          const row = { ...child, chatJudge: write.judge };
          expect(observeChatEvalStateOf(row)).toEqual(
            chatEvalStateOf(row as unknown as ChatTurnRowLikeServer),
          );
        }
      }
    // 원문 잃음: 대화 기록 글이 없고 뺀 문장 · 따라 할 문장 칸이 빈 값인 꼴
    const teacher = rows.findLast((r) => r.speaker === "tori");
    const move = readTalkMove(teacher?.move) ?? { kind: "ai" };
    for (const chat of [
      { removed: [] },
      { listen: { sentence: "", inSay: false } },
      { removed: ["I play soccer."] },
    ]) {
      const row = {
        toriRewrite: null,
        move: {
          ...move,
          chat: { ...(move as { chat?: object }).chat, ...chat },
        },
      };
      expect(observeChatSaidSayLostOf(row)).toBe(chatSaidSayLostOf(row));
    }
  });

  it("M-2 이어진 막힘의 힌트 칸: 저장된 단이 있는 선생님 행 뒤 모름 단추가 이어지면 자리 막힘 수(stuckRun)로 연 단 수가 정해지고 서버와 같다", async () => {
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    const levels: number[] = [];
    for (let i = 0; i < 3; i++) {
      const rec = await bothChat(
        m,
        CHAT_VALUES,
        sim,
        chatChild({ input: "dont_know" }),
        chatAnswerOf({ say: "That's okay. Do you like the sea or the sky?" }),
      );
      levels.push(rec.child?.hintLevel ?? -1);
      // 막힌 뒤 설명 요청이 그 선생님 행에 단을 저장한다(힌트와 같은 칸 — 다음 아이 차례의 힌트 칸 재료)
      const ask = sim.chat.hintAsk("explain");
      if (ask.kind !== "call")
        throw new Error(`설명 호출이어야 한다: ${ask.kind}`);
      const out = sim.chat.hintFinish(
        ask,
        chatResult(
          JSON.stringify({
            hint_ko: "바다가 좋아요.",
            hint_en: "I like the sea.",
            explain_ko: "바다랑 하늘 가운데 뭐가 좋은지 물었어요.",
          }),
        ),
      );
      expect(out.ok).toBe(true);
    }
    // 둘째 막힘부터는 저장된 단을 마지막 단까지 연 것으로 센다(첫 막힘은 앞 행에 단이 없어 0)
    expect(levels[0]).toBe(0);
    expect(levels[2]).toBeGreaterThan(0);
  });

  it("M-2 범위 재료의 아이 낱말: 아이가 먼저 말한 범위 밖 낱말을 선생님이 되받으면 수준 기록에 그 낱말이 범위 밖으로 남지 않고 서버와 같다", async () => {
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    const rec = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "I like slime." }),
      chatAnswerOf({ say: "Oh, slime is fun! Do you play with slime?" }),
    );
    // 아이가 말한 낱말은 범위 안이다(서버 lessonRangeOf 의 childWords — 수준 기록의 범위 밖 낱말 수에 들지 않음)
    expect(rec.teacher?.move.chat?.level.offbandWords).toBe(0);
  });

  it("M-3 기록: 닫힌 수업의 정리 되짚을 말 · 끝 행(판정 포함) · 평가 출력 · 힌트와 설명의 사용량과 지연이 대본 기록에 든다", async () => {
    const { call } = fakeChatCaller([NICE]);
    const run = await runChatScenario(
      chatSimOf(),
      [
        { say: "I am fine." },
        { say: "Soccer.", hintTier: 1 },
        { input: "dont_know" },
        { say: "Pizza." },
        { choose: "stop" },
      ],
      { call, evalOn: true },
    );
    expect(run.wrap?.length).toBeGreaterThan(0);
    expect(
      run.rows?.some((r) => r.speaker === "child" && r.chatJudge !== null),
    ).toBe(true);
    const done = run.turns
      .flatMap((t) => t.evals)
      .filter((e) => e.status === "done");
    expect(done.length).toBeGreaterThan(0);
    expect(done.every((e) => e.output !== undefined)).toBe(true);
    const hint = run.turns.flatMap((t) => t.hints).find((h) => h.called);
    expect(hint?.latencyMs).toBe(1500);
    expect(hint?.usage?.inputTokens).toBeGreaterThan(0);
    const explain = run.turns.find((t) => t.explain?.called)?.explain;
    expect(explain?.latencyMs).toBe(1500);
    expect(explain?.usage?.inputTokens).toBeGreaterThan(0);
  });
});

describe("T1 fix 1 — 단원 낱말 재료는 서버와 같은 core 함수(chat-unit-words.ts)", () => {
  it("I-1 도구 재료의 원형 표가 서버 재료(core chatUnitWordsOf — 서버 readChatUnitWords 가 읽는 꼴 자료)와 같고, 판정 맥락이 서버 chatJudgeContextFrom 과 같다", () => {
    const m = materialsAt(3);
    const server = unitWordsServer(m);
    const probes = [
      ...m.ctx.unitWords,
      "beaches",
      "saw",
      "mountains",
      "skies",
      "Went",
      "pizza",
      "slime",
      "",
    ];
    for (const p of probes)
      expect(m.unitLemmaOf?.(p), p).toBe(server.lemmaOf(p));
    // 도구가 쓰는 판정 맥락(같은 core 함수)과 서버가 다시 내보낸 함수의 값이 같다
    const lesson = {
      card: m.card,
      spec: { band: bandOf(3) },
      teacher: m.teacher,
    };
    const { lemmaOf: a, ...toolCtx } = chatJudgeContextFrom(
      lesson,
      { unitWords: m.ctx.unitWords, lemmaOf: m.unitLemmaOf ?? m.lemmaOf },
      seedHomophones(),
    );
    const { lemmaOf: b, ...serverCtx } = chatJudgeContextFrom(
      lesson,
      server,
      seedHomophones(),
    );
    expect(toolCtx).toEqual(serverCtx);
    for (const p of probes) expect(a(p), p).toBe(b(p));
  });
});

describe("T1 fix 1 덧붙임 — 만남 셈의 원형 표는 서버 그대로(수업 상태의 표)", () => {
  it("만남: 선생님 말의 굴절형 가운데 수업 단원 단어(eat)의 꼴만 원형으로 읽고, 단계 맥락에만 있는 낱말의 꼴(beaches · saw)은 서버처럼 만남에 들지 않는다", async () => {
    const m = materialsAt(3);
    const sim = await chatTalking(m);
    const rec = await bothChat(
      m,
      CHAT_VALUES,
      sim,
      chatChild({ say: "I went to the beach." }),
      chatAnswerOf({
        say: "You went to the beaches! I saw the sea. Then we ate snacks.",
      }),
    );
    expect(rec.met).toContain("eat");
    expect(rec.met).not.toContain("beach");
    expect(rec.met).not.toContain("see");
  });
});
