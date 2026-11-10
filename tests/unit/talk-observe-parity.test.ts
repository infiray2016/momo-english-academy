// 대본 도구 사본 ↔ 서버 턴 끝 처리 짝 시험('AI 몫 넓힘' plan 묶음 5 · 정한 것 7 · 위험 4 · 장부 T-157 · T-163 (3)).
// talk-observe 는 server-only 인 서버 턴 끝 처리(createLessonSentenceFlow · settleLessonTurn · lessonOutcomeViewOf · lessonHintsAt)를 줄여 옮긴
// 사본을 들고 있다. 같은 응답 · 계획 · 행을 서버 함수와 도구에 넣어 같은 줄(화면 글 · 붙일 줄 · 뜻 · 신호 말 · move)과 같은 판정(지운 까닭 ·
// 상황 줄 · 카드 자리 까닭 · 힌트 단)이 나오는지 본다. 서버 쪽 배선(목록 · 질문 검사 범위 · 턴 번호 · 아이 행)은 lessonTurnAfterChild 를 그대로
// 옮겨 시험 안에 둔다(그 함수는 DB · AI 를 부른다). 짝이 다르면 대본 회차를 돌리지 않는다(plan 위험 4).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyTalkLessonChecks,
  isLowBandLevel,
  type TalkLessonOutput,
  talkCallTurnOf,
  talkCardChainKeysOf,
  talkLessonCheckFields,
  talkTurnWiringOf,
} from "@/core/ai/calls/talk-lesson";
import type { Masker } from "@/core/ai/mask";
import { checkOutputFields } from "@/core/ai/output-check";
import { cueBandOf, seedCuePhrasesOf } from "@/core/conversation/cue-line";
import {
  childAnsweredRequiredOf,
  childLinesOf,
  talkLessonPositionOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import { checkLowLevelQuestion } from "@/core/conversation/question-check";
import {
  allowedLemmaOfVocab,
  checkSituationSentence,
  failSituationLineOf,
  heardFieldsBlankOf,
  SITUATION_EXAMPLE_SENTENCES,
  situationPlaceOf,
} from "@/core/conversation/situation";
import { normalizeSpoken } from "@/core/conversation/spoken";
import { createToriSentenceGate, safeLineOf } from "@/core/conversation/stream";
import { splitSentences } from "@/core/seed/text";
import type { TalkLessonOutcome } from "@/server/ai/talk";
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
  lessonReplayLinesOf,
  seedLessonTalkLists,
  settleLessonTurn,
  slotQuestionTextOf,
  teacherTextsOf,
  withQuestionRetry,
} from "@/server/conversation/lesson-turn";
import { seedHomophones } from "@/server/seed-lists";
import { loadScriptConfig } from "../../scripts/ai-contract";
import {
  type CallResult,
  createTalkSim,
  evaluateLessonMessage,
  type Materials,
  materialsOf,
  observeFailLineOf,
  observeLiveOf,
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

const ROOT = process.cwd();
const config = loadScriptConfig({ root: ROOT });
/** 서버 readAllowedLemmaOf 가 읽는 vocab 행(word · forms — 개발 DB 는 seed/vocab.json 을 적재한 것). */
const VOCAB_ROWS = (
  JSON.parse(readFileSync(`${ROOT}/seed/vocab.json`, "utf8")) as {
    vocab: { word: string; forms: string[] }[];
  }
).vocab;
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
            functionWords: m.functionWords,
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
        },
        forbidden: { all: [], nospeech: [] },
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
