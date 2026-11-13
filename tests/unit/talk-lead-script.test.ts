// 회화 새 엔진 e2e(talk-lead.spec.ts) 대본을 서버 턴 길의 core 함수로 미리 지나게 하는 시험(CI 고침 2 — e2e 는 CI 에서 한 번에 오래 걸려,
// 대본의 차례마다 e2e 가 기대하는 줄이 실제로 나오는지를 여기서 먼저 지킨다). 대본은 tests/e2e/talk-lead-script.ts 하나를 e2e 와 같이 읽는다.
// 재료는 e2e 와 같다: 단계 · 단원 규격 · 어휘는 e2e DB 에 넣는 시험용 시드(devSeedTree — playwright.config 의 dev-db --ephemeral), 형태 표 ·
// 허용 목록 · 동음이의어 · 금지어 · 메타 문장은 서버가 파일로 읽는 저장소 seed/lists, 수업은 e2e 가 넣는 talkLessonCard(3). 차례마다 서버
// 턴 길(lead-turn.ts leadTeacherTurn)과 같은 차례로 부른다: 문장 문 → 흘려 받기 흐름(붙잡기) → 좁은 정의 · 다시 말하기 → 글 빼기 · 소리 줄 →
// 뜻 줄 → 힌트 재료 → 막힌 뒤 뜻 → 마무리 상수. DB · 흘려 받기 · 화면은 통합 시험과 e2e 의 몫이다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import {
  isLowBandLevel,
  talkLineOptionsOf,
  talkSceneWordsOf,
} from "@/core/ai/calls/talk-lesson";
import {
  type LeadFormRule,
  type LeadLevelInput,
  leadNarrowHitsOf,
  leadNarrowOutcomeOf,
} from "@/core/conversation/lead-level";
import { leadKoLineOf } from "@/core/conversation/lead-low-band";
import {
  leadPrevStuckOf,
  leadTeacherMoveOf,
} from "@/core/conversation/lead-record";
import {
  createLeadSentenceFlow,
  type LeadHeads,
  type LeadSoundLine,
  leadChildStuckOf,
  leadClosingAddsOf,
  leadClosingTurnOf,
  leadExplanationOf,
  leadFlowPrevStuckOf,
  leadHintsOf,
  leadHoldSayOf,
  leadKeptSoundOf,
  leadNarrowTargetOf,
  leadSettleOf,
  leadSoundLinesOf,
} from "@/core/conversation/lead-turn-core";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import type {
  TalkLessonChildTurn,
  TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import { type TalkMove, talkMoveOf } from "@/core/conversation/move";
import { allowedLemmaOfVocab } from "@/core/conversation/situation";
import { checkToriSentence } from "@/core/conversation/stream";
import {
  ForbiddenFileSchema,
  HomophonesFileSchema,
  MetaSentencesFileSchema,
  type TalkLevelSpec,
} from "@/core/seed/schema/reference";
import { buildLexicon, splitSentences, tokenize } from "@/core/seed/text";
import { lemmaLookup } from "@/core/session/attempt";
import { talkLessonCard } from "../e2e/talk";
import {
  LEAD_SCRIPT,
  LEAD_SCRIPT_CHILD_SAYS,
  LEAD_SCRIPT_CHOICES,
  LEAD_SCRIPT_COUNTED_BEFORE_INSERT,
  LEAD_SCRIPT_GREETING_END,
  LEAD_SCRIPT_HINT_KO,
  LEAD_SCRIPT_HINT_SAY_KO,
  LEAD_SCRIPT_MODEL,
  LEAD_SCRIPT_RETRY,
  LEAD_SCRIPT_SAY_COMMA_SHOWN,
  type LeadScriptStep,
} from "../e2e/talk-lead-script";
import { devSeedTree } from "../fixtures/seed/dev-tree";
import {
  aiTurn,
  button,
  LOW as LOW_SETTINGS,
  said,
  teacher,
} from "../fixtures/talk-lesson";

/** e2e 의 단계 · 단원(talk-lead.spec.ts LEVEL — insertTalkLesson 은 단원 1 에 넣는다). */
const LEVEL = 3;
const UNIT = 1;
const ROOT = process.cwd();
const listJson = (name: string): unknown =>
  JSON.parse(readFileSync(join(ROOT, "seed/lists", name), "utf8"));

// ── e2e 와 같은 재료 ────────────────────────────────────────────────

const ref = devSeedTree().reference;
const levelSpec = ref.levelSpecs.levelSpecs.find(
  (s) => s.area === "talk" && s.level === LEVEL,
) as TalkLevelSpec | undefined;
if (!levelSpec) throw new Error("시험용 시드에 회화 3단계 규격이 없다");
const unitSpec = ref.unitSpecs.unitSpecs.find(
  (u) => u.area === "talk" && u.level === LEVEL && u.unit === UNIT,
);
if (!unitSpec) throw new Error("시험용 시드에 회화 3단계 단원 1 규격이 없다");
const spec: TalkLevelSpec = levelSpec;
const lesson = talkLessonCard(LEVEL);
const card = lesson.card;
/** 단계 맥락의 단원 단어(levelContextOf — 단원 규격 targetVocab). */
const unitWords = [...unitSpec.words];
const vocabRows = ref.vocab.vocab.map((v) => ({
  word: v.word,
  pos: [...v.pos],
  level: v.level,
  forms: [...v.forms],
}));
/** 상태의 원형 찾기(state.ts lemmaEntriesOf — 수업의 unitWords 어휘) + 범위 원형 찾기(lesson-input.ts lessonRangeOf — 단계 이하 어휘). */
const stateLemma = lemmaLookup(
  vocabRows.filter((v) => lesson.unitWords.includes(v.word)),
);
const inRange = vocabRows.filter((v) => v.level <= LEVEL);
const rangeLemma = lemmaLookup(inRange);
const lemmaOf = (surface: string) => stateLemma(surface) ?? rangeLemma(surface);
const forms = (listJson("forms.json") as { forms: LeadFormRule[] }).forms;
const allowedForms = new Set(
  forms
    .filter(({ introducedAt }) => {
      const at = introducedAt.rst as { level: number; unit: number } | null;
      return (
        at !== null &&
        (at.level < LEVEL || (at.level === LEVEL && at.unit <= UNIT))
      );
    })
    .map(({ id }) => id),
);
const allowedList = (
  listJson("talk-allowed-words.json") as { allowed: string[] }
).allowed;
const homophones = HomophonesFileSchema.parse(
  listJson("homophones.json"),
).groups;
const FORBIDDEN = ForbiddenFileSchema.parse(listJson("forbidden.json"));
const META = MetaSentencesFileSchema.parse(
  listJson("meta-sentences.json"),
).phrases;
const teacherName =
  ref.teachers.teachers.find((t) => t.key === "mina")?.nameEn ?? "";
const sceneWords = talkSceneWordsOf({ card, unitWords });

/** 아이가 이 대화에서 말한 낱말(lesson-input.ts childWordsOf — 들린 글은 늘 같은 말이다). */
function childWordsOf(texts: readonly string[]): string[] {
  const out = new Set<string>();
  for (const text of texts)
    for (const t of tokenize(text))
      if (t.kind === "word") out.add(t.text.toLowerCase());
  return [...out];
}

/** 좁은 정의 재료(lead-turn.ts levelInput 과 같은 조립). */
function levelInputOf(childTexts: readonly string[]): LeadLevelInput {
  return {
    level: LEVEL,
    range: talkLineOptionsOf({
      sentenceMaxWords: spec.sentenceMaxWords,
      unitWords,
      teacher: { nameEn: teacherName } as never,
      lineRange: {
        allowedWords: new Set(inRange.map((v) => v.word.toLowerCase())),
        forms,
        allowedForms,
        childWords: childWordsOf(childTexts),
        reaskWords: [],
      },
      lemmaOf,
      homophones,
    }),
    forms,
    lexicon: buildLexicon(vocabRows),
    promptLines: [
      TALK_LEAD_TEXT_L3U1.topicEn,
      TALK_LEAD_TEXT_L3U1.sentencesLikeEn,
    ],
    allowed: new Set(allowedList),
    allowedLemmaOf: allowedLemmaOfVocab(vocabRows, allowedList),
  };
}

// ── 차례 하나(lead-turn.ts leadTeacherTurn 의 (3) ~ (6) 차례) ────────────

type StepOut = {
  /** 나간 글 줄(t: s) — 흘려 보낸 앞 문장 + 끝에서 낸 문장. */
  lines: string[];
  sound: { model?: string; answer?: string };
  /** 흘려 보낸 소리 줄(t: sound — 이 차례의 소리 줄 → 되묻는 차례면 그대로 둔 앞 차례의 소리 줄 kept, 서버 lead-turn.ts 와 같은 core 함수). */
  soundLines: LeadSoundLine[];
  /** 아이 차례가 막힘인가(위치 되짚기의 '말 주고받기' 셈에서 빠짐). */
  stuck: boolean;
  /** 뜻 줄(t: ko — 빈 글이면 줄 없음). */
  ko: string;
  /** 막힌 뒤 한국어 뜻(end 줄의 explanation — 말풍선 아래 글). */
  explanation: string | null;
  /** 힌트 재료(없으면 그 차례에 힌트 단추가 없다). */
  hints: unknown;
  /** 마무리 상수 물음 줄(두 단추 차례). */
  closingAdded: boolean;
  /** 좁은 정의에 걸린 물음(다시 말하기를 부름). */
  narrowed: string | null;
};

function runStep(
  step: LeadScriptStep,
  {
    closing = false,
    childTexts = [],
    stuckInSlot = 1,
    prevMove = null,
  }: {
    closing?: boolean;
    childTexts?: readonly string[];
    stuckInSlot?: number;
    /** 바로 앞 선생님 행 move(되묻는 차례가 그대로 둘 소리 줄을 읽는다). */
    prevMove?: TalkMove | null;
  } = {},
): StepOut {
  const { child, reply } = step;
  const low = isLowBandLevel(LEVEL);
  const mode = child?.mode ?? "speech";
  const heard = child?.mode === "speech" ? child.text : "";
  const input = levelInputOf([...childTexts, heard]);
  const hitsOf = (sentence: string) => leadNarrowHitsOf(sentence, input);
  const heads: LeadHeads = {
    reading: reply.reading ?? "clear_answer",
    move: reply.move,
  };
  // 문장 문(지금 안전 검사) — 대본 문장은 모두 지나야 한다(걸리면 카드 안전한 대사로 바뀌어 e2e 의 글이 달라진다)
  const sentences = splitSentences(reply.say)
    .map((s) => s.trim())
    .filter((s) => s !== "");
  for (const s of sentences)
    expect(
      checkToriSentence(s, { forbidden: FORBIDDEN, metaPhrases: META }),
      s,
    ).toEqual({ ok: true });
  const flow = createLeadSentenceFlow({
    low,
    closing,
    prevStuck: (h) =>
      leadFlowPrevStuckOf({
        hasChild: child !== null,
        mode,
        nospeech: false,
        reading: h.reading,
        heard,
        sceneWords,
        homophones,
      }),
    hitsOf,
  });
  const held = leadHoldSayOf(LEVEL)(heads);
  flow.heads(heads);
  const streamed = held ? [] : sentences.filter((s) => flow.accept(s));
  const stuck =
    child === null
      ? false
      : leadChildStuckOf({
          reading: heads.reading,
          mode,
          heard,
          sceneWords,
          homophones,
        });
  const lite: TalkLessonChildTurn | null =
    child === null
      ? null
      : {
          speaker: "child",
          segment: "talk",
          input: mode,
          stuck: mode === "speech" && stuck,
          nospeech: false,
          targets: [],
        };
  const target = leadNarrowTargetOf(sentences, {
    closing,
    move: reply.move,
    hitsOf,
  });
  const narrow =
    target === null
      ? null
      : {
          index: target.index,
          sentence: leadNarrowOutcomeOf({
            original: target.sentence,
            received: LEAD_SCRIPT_RETRY,
            input,
            passes: (s) =>
              checkToriSentence(s, { forbidden: FORBIDDEN, metaPhrases: META })
                .ok,
          }).sentence,
        };
  const settled = leadSettleOf({
    level: LEVEL,
    move: reply.move,
    prevStuck: leadPrevStuckOf(lite),
    closing,
    modelSentence: reply.model_sentence ?? "",
    sentences,
    sentCount: flow.sentCount(),
    held,
    narrow,
  });
  const output = { hint_ko: reply.hint_ko ?? "", hint_en: reply.hint_en ?? "" };
  const kept = leadKeptSoundOf({
    level: LEVEL,
    move: reply.move,
    hasChild: child !== null,
    own: settled.sound,
    prevMove,
  });
  return {
    lines: [...streamed, ...settled.release],
    sound: settled.sound,
    soundLines: leadSoundLinesOf({ sound: settled.sound, kept }),
    stuck,
    ko: spec.koMeaning ? leadKoLineOf(LEVEL, reply.say_ko ?? "").trim() : "",
    explanation: leadExplanationOf({
      child: lite,
      stuckInSlot: () => stuckInSlot,
      spec,
      level: LEVEL,
      hintKo: output.hint_ko,
    }),
    hints: leadHintsOf({
      output,
      range: input,
      check: { forbidden: FORBIDDEN, sentenceMaxWords: spec.sentenceMaxWords },
      spec,
      unitWords,
      lemmaOf: stateLemma,
    }).aiHints,
    closingAdded: leadClosingAddsOf({ closing, say: settled.say }),
    narrowed: target?.sentence ?? null,
  };
}

const said1 = [LEAD_SCRIPT_CHILD_SAYS];

// ── 시험 ───────────────────────────────────────────────────────────

describe("회화 새 엔진 e2e 대본(talk-lead.spec.ts)의 차례마다 서버 턴 길 core 함수가 e2e 가 기대하는 줄을 낸다", () => {
  it("AC-26g CI 첫 실패의 풀이: 시드에 없는 낱말로 쓴 고르기 물음 'Cats or dogs?' 는 e2e 재료의 좁은 정의에 걸려 다시 말하기 응답으로 바뀌고 고르기 소리 줄이 없다(화면의 'That's okay! Do you like it?' 와 같다)", () => {
    const out = runStep(
      {
        child: { mode: "dont_know" },
        reply: {
          reading: "does_not_know",
          move: "easier_or_choices",
          say: "That's okay! Cats or dogs?",
        },
      },
      { childTexts: said1 },
    );
    expect(out.narrowed).toBe("Cats or dogs?");
    expect(out.lines).toEqual(["That's okay!", LEAD_SCRIPT_RETRY]);
    expect(out.sound).toEqual({});
  });

  it("AC-26g 대본의 물음 문장은 어느 차례에서도 좁은 정의에 걸리지 않는다(다시 말하기 호출 없음 — 가짜 다시 말하기 응답이 대본을 바꾸지 않음)", () => {
    for (const [name, step] of Object.entries(LEAD_SCRIPT))
      expect(
        runStep(step, { childTexts: said1 }).narrowed,
        `${name} 차례`,
      ).toBeNull();
  });

  it("AC-26c · AC-26m 대화 첫 차례(입구 start): 말이 글로 나가고 뜻 줄(say_ko)이 있으며 소리 줄 · 막힌 뒤 뜻 · 힌트 재료가 없다(힌트 단추 없는 차례)", () => {
    const out = runStep(LEAD_SCRIPT.opening);
    expect(out.lines).toEqual(["Hello again!", "Do you like it?"]);
    expect(out.ko).toBe(LEAD_SCRIPT.opening.reply.say_ko);
    expect(out.sound).toEqual({});
    expect(out.explanation).toBeNull();
    expect(out.hints).toBeUndefined();
    expect(out.closingAdded).toBe(false);
  });

  it("AC-26i 아이 답 뒤 따라 할 문장(model_repeat): 따라 할 문장은 글에서 빠져 소리 줄 model 하나이고 앞 안내 말은 글로 남는다", () => {
    const out = runStep(LEAD_SCRIPT.model, { childTexts: said1 });
    expect(out.sound).toEqual({ model: LEAD_SCRIPT_MODEL });
    expect(out.lines).toEqual(["Great!", "Say it with me."]);
    expect(out.lines.join(" ")).not.toContain(LEAD_SCRIPT_MODEL);
    expect(out.ko).toBe(LEAD_SCRIPT.model.reply.say_ko);
    expect(out.explanation).toBeNull();
    expect(out.hints).toBeUndefined();
  });

  it("AC-26i 따라 할 문장 차례 바로 뒤의 되묻는 차례(ask_again): 선생님 말만 글이고, 이 차례의 소리 줄 없이 앞 차례의 따라 할 문장 소리 줄을 그대로 둔 kept 줄 하나가 나간다(저절로 읽지 않음 — 정본 03 4절 98줄 · 화면 검토 I-1)", () => {
    const model = runStep(LEAD_SCRIPT.model, { childTexts: said1 });
    const out = runStep(LEAD_SCRIPT.askAgain, {
      childTexts: said1,
      prevMove: moveWithSound(model.sound),
    });
    expect(out.lines).toEqual(["Sorry?", "Say it again, please."]);
    expect(out.sound).toEqual({});
    expect(out.soundLines).toEqual([
      {
        t: "sound",
        kind: "model",
        say: LEAD_SCRIPT_MODEL,
        lead: { kept: true },
      },
    ]);
    expect(out.ko).toBe(LEAD_SCRIPT.askAgain.reply.say_ko);
    expect(out.explanation).toBeNull();
    // 앞 차례가 소리 줄 없는 차례면 그대로 둘 것이 없다
    expect(
      runStep(LEAD_SCRIPT.askAgain, {
        childTexts: said1,
        prevMove: moveWithSound({}),
      }).soundLines,
    ).toEqual([]);
  });

  it("AC-26i 'Say, \"…\"' 꼴의 따라 할 문장(model_repeat): 따라 할 문장은 소리 줄 model 이고, 안내 말 뒤 끝 쉼표는 쌍점이 되어 글은 'Good! Say:' 다(화면 검토 M-2)", () => {
    const out = runStep(LEAD_SCRIPT.sayComma, { childTexts: said1 });
    expect(out.sound).toEqual({ model: LEAD_SCRIPT_MODEL });
    expect(out.lines).toEqual([...LEAD_SCRIPT_SAY_COMMA_SHOWN]);
    expect(out.soundLines).toEqual([
      { t: "sound", kind: "model", say: LEAD_SCRIPT_MODEL },
    ]);
  });

  it("AC-26i '잘 모르겠어요' 뒤 막힌 뒤 고르기 차례: 고르기 물음은 글에서 빠져 소리 줄 answer 하나(고르기 물음 표지 ask)이고, 앞 반응은 글이며 hint_ko 가 없어 막힌 뒤 뜻이 없다", () => {
    const out = runStep(LEAD_SCRIPT.choices, { childTexts: said1 });
    expect(out.sound).toEqual({ answer: LEAD_SCRIPT_CHOICES });
    expect(out.soundLines).toEqual([
      {
        t: "sound",
        kind: "answer",
        say: LEAD_SCRIPT_CHOICES,
        lead: { ask: true },
      },
    ]);
    expect(out.lines).toEqual(["That's okay!"]);
    expect(out.explanation).toBeNull();
    expect(out.hints).toBeUndefined();
  });

  it("AC-26c · AC-26m 또 '잘 모르겠어요' 뒤: 3단계는 첫 막힘부터 막힌 뒤 한국어 뜻(hint_ko — 아이가 할 수 있는 답의 한국어)을 말풍선 아래 글로 내고, 같은 차례에 뜻 줄(say_ko)도 있으며, 고르기가 아닌 물음은 글로 나간다", () => {
    // 3단계 규격의 koExplainFromStuck 이 1 이라, 단추 차례(그 자리 막힘 수가 1 이상)마다 보인다
    expect(spec.koExplainFromStuck).toBe(1);
    const out = runStep(LEAD_SCRIPT.hintKo, { childTexts: said1 });
    expect(out.explanation).toBe(LEAD_SCRIPT_HINT_KO);
    expect(out.ko).toBe(LEAD_SCRIPT_HINT_SAY_KO);
    expect(out.lines).toEqual(["That's okay.", "I like this.", "And you?"]);
    expect(out.sound).toEqual({});
    expect(out.hints).toBeUndefined();
  });

  it("AC-26c 마무리 차례: e2e 가 앞선 대화 차례를 (참고 턴 − 1 − 넣기 전에 센 말 차례) 쌍 넣은 뒤의 말 차례가 앱이 정한 마무리 때이고, 말 칸에 물음이 없어 상수 물음이 붙는다(두 단추)", () => {
    const target = spec.targetTurns;
    const shown = (step: LeadScriptStep) =>
      runStep(step, { childTexts: said1 }).lines.join(" ");
    const askStuck = runStep(LEAD_SCRIPT.askAgain, {
      childTexts: said1,
    }).stuck;
    // e2e 의 차례 그대로(인사 하나 → 인사 끝 → 대화 첫 차례 → 말 · 말(되물음) · 말 · 단추 · 단추 → 넣은 쌍)
    const before: TalkLessonTurn[] = [
      teacher("How are you today?", { kind: "first_question" }),
      said({ segment: "greeting_end" }),
      teacher(LEAD_SCRIPT_GREETING_END, { kind: "ai" }),
      teacher(shown(LEAD_SCRIPT.opening), { kind: "first_question" }),
      said(),
      aiTurn(shown(LEAD_SCRIPT.model)),
      said({ stuck: askStuck, askAgain: true }),
      aiTurn(shown(LEAD_SCRIPT.askAgain)),
      said(),
      aiTurn(shown(LEAD_SCRIPT.sayComma)),
      button(),
      aiTurn(shown(LEAD_SCRIPT.choices)),
      button(),
      aiTurn(shown(LEAD_SCRIPT.hintKo)),
    ];
    const args = {
      spec,
      card,
      newWords: lesson.newWords,
      segment: "talk" as const,
      settings: LOW_SETTINGS,
      prepWords: [],
    };
    // e2e 가 쓰는 '넣기 전에 센 말 차례' 수(위치 되짚기의 말 주고받기 셈 — 인사 끝의 말도 든다)
    expect(talkLessonPositionOf({ ...args, turns: before }).talkCount).toBe(
      LEAD_SCRIPT_COUNTED_BEFORE_INSERT,
    );
    const closingAfter = (turns: TalkLessonTurn[]) =>
      leadClosingTurnOf({
        speech: true,
        positionAfter: () =>
          talkLessonPositionOf({ ...args, turns: [...turns, said()] }),
      });
    const filledWith = (pairs: number) => [
      ...before,
      ...Array.from({ length: pairs }, () => [said(), aiTurn("Nice!")]).flat(),
    ];
    const pairs = target - 1 - LEAD_SCRIPT_COUNTED_BEFORE_INSERT;
    // 넣기 전 · 한 쌍 덜 넣은 뒤의 말 차례는 마무리 때가 아니다(마무리는 넣은 쌍이 정한다)
    expect(closingAfter(before)).toBe(false);
    expect(closingAfter(filledWith(pairs - 1))).toBe(false);
    expect(closingAfter(filledWith(pairs))).toBe(true);
    const out = runStep(LEAD_SCRIPT.closing, {
      closing: true,
      childTexts: said1,
    });
    expect(out.closingAdded).toBe(true);
    expect(out.lines).toEqual([LEAD_SCRIPT.closing.reply.say]);
    expect(out.sound).toEqual({});
  });

  it("AC-26c '더 이야기하기' 뒤의 차례(입구 more): 말이 글로 나가고 소리 줄 · 마무리 상수 · 막힌 뒤 뜻이 없다", () => {
    const out = runStep(LEAD_SCRIPT.more, { childTexts: said1 });
    expect(out.lines).toEqual(["Yay!", "Let's talk more."]);
    expect(out.sound).toEqual({});
    expect(out.closingAdded).toBe(false);
    expect(out.explanation).toBeNull();
  });

  it("AC-26c · AC-26m '더 이야기하기' 뒤 아이 말 → 마무리 제안(move wrap_up): 말이 글로 나가고 소리 줄 · 마무리 상수 · 막힌 뒤 뜻이 없으며, 행 move 는 마무리 제안 길(next closing)이다", () => {
    const out = runStep(LEAD_SCRIPT.wrapUp, { childTexts: said1 });
    expect(out.lines).toEqual(["You did great today!", "Let's stop here."]);
    expect(out.soundLines).toEqual([]);
    expect(out.closingAdded).toBe(false);
    expect(out.explanation).toBeNull();
    // 행 move(서버 턴 길 · 대본 도구가 같이 부르는 core leadTeacherMoveOf) — e2e 의 마무리 제안 장면이 이 값에 기댄다(lesson-flow next closing, 검토 rev-s5 M-5)
    const { reply } = LEAD_SCRIPT.wrapUp;
    const move = leadTeacherMoveOf({
      response: {
        reading: "clear_answer",
        move: reply.move,
        say: reply.say,
        model_sentence: "",
      },
      prevChild: { input: "speech", stuck: false, nospeech: false },
      spec,
      closingSlot: false,
      firstQuestion: false,
      unitWords,
      lemmaOf,
    });
    expect(move.next).toBe("closing");
  });
});

/** 앞 선생님 행 move(소리 줄을 적은 새 엔진 행 — 되묻는 차례가 읽는 칸만). */
function moveWithSound(sound: { model?: string; answer?: string }): TalkMove {
  const move = talkMoveOf({ kind: "ai" });
  return sound.model === undefined && sound.answer === undefined
    ? move
    : { ...move, sound: { ...sound } };
}
