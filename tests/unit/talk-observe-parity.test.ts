// 대본 도구 사본 ↔ 서버 턴 끝 처리 짝 시험('AI 몫 넓힘' plan 묶음 5 · 정한 것 7 · 위험 4 · 장부 T-157 · T-163 (3)).
// talk-observe 는 server-only 인 서버 턴 끝 처리(createLessonSentenceFlow · settleLessonTurn · lessonOutcomeViewOf · lessonHintsAt)를 줄여 옮긴
// 사본을 들고 있다. 같은 응답 · 계획 · 행을 서버 함수와 도구에 넣어 같은 줄(화면 글 · 붙일 줄 · 뜻 · 신호 말 · move)과 같은 판정(지운 까닭 ·
// 상황 줄 · 카드 자리 까닭 · 힌트 단)이 나오는지 본다. 서버 쪽 배선(목록 · 질문 검사 범위 · 턴 번호 · 아이 행)은 lessonTurnAfterChild 를 그대로
// 옮겨 시험 안에 둔다(그 함수는 DB · AI 를 부른다). 짝이 다르면 대본 회차를 돌리지 않는다(plan 위험 4).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
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
} from "@/core/ai/calls/talk-lesson";
import { requestConfigOf } from "@/core/ai/combo";
import type { Masker } from "@/core/ai/mask";
import { createMasker } from "@/core/ai/mask";
import { checkOutputFields } from "@/core/ai/output-check";
import { buildAiRequest } from "@/core/ai/request";
import { cueBandOf, seedCuePhrasesOf } from "@/core/conversation/cue-line";
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
import type { TalkLessonOutcome } from "@/server/ai/talk";
import {
  type LessonCore,
  lessonAdvanceLeadOf,
  lessonMoreLeadOf,
  lessonMoreOf,
} from "@/server/conversation/index";
import { leadTurnApplies } from "@/server/conversation/lead-turn";
import { lineOptionsOf } from "@/server/conversation/lesson-input";
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
  questionRetryFits,
  seedLessonTalkLists,
  settleLessonTurn,
  slotQuestionTextOf,
  TURN_IN_FLIGHT_MS,
  TURN_SAVE_GRACE_MS,
  teacherTextsOf,
  withQuestionRetry,
} from "@/server/conversation/lesson-turn";
import { seedHomophones } from "@/server/seed-lists";
import { loadScriptConfig } from "../../scripts/ai-contract";
import {
  type CallResult,
  createTalkSim,
  evaluateLessonMessage,
  type LeadLine,
  type LeadSimEntry,
  type Materials,
  materialsOf,
  OBSERVE_TURN_IN_FLIGHT_MS,
  OBSERVE_TURN_SAVE_GRACE_MS,
  observeChildLiteOf,
  observeFailLineOf,
  observeLiveOf,
  observeMoreLeadOf,
  observeMoreOf,
  observeOverLengthOf,
  observeQuestionRetryFits,
  type PreparedTurn,
  readSeedFiles,
  type SimRow,
  sentenceEntriesOf,
  settleTurn,
  type TalkSim,
  type TurnRecord,
  talkListsOf,
  slotQuestionTextOf as toolSlotQuestionTextOf,
} from "../../scripts/talk-observe";
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
