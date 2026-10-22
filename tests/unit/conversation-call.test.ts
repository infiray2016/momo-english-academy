// 회화 턴 · 끝맺음 턴 규격(plan-p13a 파일별 값 1 · 정할 것 회7, 6.1 · 6.2 · 6.4 · C19 · C20 · C21 · C36 · C44 · C89 · C95).
// 실제 API 를 부르지 않는다. 설계 숫자는 시험용 설정(testSettingValues) · 실시드 단계 규격(seed/level-specs.json) · 견본 빌더에서 읽는다.
// 이름은 지어낸 이름(sample-inputs)이다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CallSettingError } from "@/core/ai/calls/common";
import {
  applyTalkChecks,
  checkLowLevelAiQuestion,
  englishHintTiersOf,
  normalizeTalk,
  type TalkOutput,
  type TalkRules,
  type TalkTurn,
  type TalkTurnContext,
  type TalkTurnInput,
  TORI_NAME,
  talkCheckFields,
  talkClosingSpec,
  talkContextDelta,
  talkTurnSpec,
  talkUserMessage,
  toriRewriteOf,
  twoAnswersLine,
} from "@/core/ai/calls/talk";
import { capabilitiesOf, requestConfigOf } from "@/core/ai/combo";
import { createMasker } from "@/core/ai/mask";
import type { FieldHit } from "@/core/ai/output-check";
import { buildAiRequest } from "@/core/ai/request";
import {
  type FormEntry,
  LevelSpecsFileSchema,
  ListFormsFileSchema,
  type TalkLevelSpec,
} from "@/core/seed/schema/reference";
import { lemmaLookup } from "@/core/session/attempt";
import { MODEL_PRICES_FIXTURE } from "../fixtures/ai/model-prices";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
  SAMPLE_PHONE,
} from "../fixtures/ai/sample-inputs";
import { smallReferenceSet, talkCard } from "../fixtures/seed/builders";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const LEVEL_SPECS = LevelSpecsFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/level-specs.json"), "utf8"),
  ),
).levelSpecs.filter((s): s is TalkLevelSpec => s.area === "talk");
const FORMS: FormEntry[] = ListFormsFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/forms.json"), "utf8"),
  ),
).forms;
const SAMPLES = join(process.cwd(), "tests/fixtures/ai/samples/talk");
const ref = smallReferenceSet();
const book = new Map(
  MODEL_PRICES_FIXTURE.models.map((m) => [
    m.model,
    { caps: capabilitiesOf(m) },
  ]),
);
const masker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});

/** 시험 단원 단어(원형)와 활용형. */
const VOCAB = [
  { word: "apple", forms: ["apples"] },
  { word: "ball", forms: ["balls"] },
  { word: "two", forms: [] },
  { word: "red", forms: [] },
  { word: "lunch", forms: ["lunches"] },
  { word: "park", forms: ["parks"] },
  { word: "go", forms: ["goes", "went", "gone"] },
];
const UNIT_WORDS = VOCAB.map((v) => v.word);
const lemmaOf = lemmaLookup(VOCAB);

function specOf(level: number): TalkLevelSpec {
  const spec = LEVEL_SPECS.find((s) => s.level === level);
  if (!spec) throw new Error(`회화 ${level}단계 규격이 없다`);
  return spec;
}

const baseTurn: TalkTurn = {
  child: "I like apples.",
  input: "speech",
  segment: "talk",
  hintKind: "none",
  hintTier: 0,
  heardHelp: "none",
  dontKnowCount: 0,
  targetReached: false,
  closing: false,
  levelTest: false,
  moreTalkUsedUp: false,
  aiQuestionSlot: false,
};

function inputOf(
  level: number,
  over: Partial<TalkTurnInput> = {},
): TalkTurnInput {
  const spec = specOf(level);
  return {
    level,
    canDo: spec.canDo,
    learningElement: "좋아하는 것 말하기",
    prevLearningElements: [],
    unitWords: UNIT_WORDS,
    sentenceMaxWords: spec.sentenceMaxWords,
    spec,
    card: talkCard(ref, {
      level,
      unit: 1,
      kind: "assigned",
      lessonNo: 1,
      variant: 1,
    }).card,
    summaries: ["사과를 좋아한다고 했다."],
    history: [],
    turn: baseTurn,
    lemmaOf,
    ...over,
  };
}

const rulesOf = (input: TalkTurnInput): TalkRules =>
  talkTurnSpec.rulesOf(values, input);

type Sample = {
  case: string;
  response: { body: { content: { type: string; text?: string }[] } };
  expect: {
    strict?: boolean;
    level?: number;
    normalized?: Record<string, unknown>;
  };
};
function sample(id: string): Sample {
  return JSON.parse(
    readFileSync(join(SAMPLES, `${id}.json`), "utf8"),
  ) as Sample;
}
/** 견본 응답 글(text 블록을 차례로 이음 — 흘려 받기와 같은 꼴, 정할 것 회8). */
function sampleJson(id: string): unknown {
  return JSON.parse(
    sample(id)
      .response.body.content.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join(""),
  );
}

describe("회화 턴 규격", () => {
  it("AC-15c 회화 턴 응답 규격에 판정 칸이 없고 회화 턴 사용자 메시지에 이 턴의 힌트 종류와 아직 '안다'가 아닌 단원 단어가 든다", () => {
    const input = inputOf(1);
    const wire = talkTurnSpec.wireSchema(input, rulesOf(input));
    const keys = Object.keys(
      (wire as unknown as { shape: Record<string, unknown> }).shape,
    );
    expect(keys[0]).toBe("tori_en");
    expect(keys[1]).toBe("tori_ko");
    for (const banned of ["score", "correct", "judgement", "verdict", "pass"])
      expect(
        keys.some((k) => k.includes(banned)),
        banned,
      ).toBe(false);
    // 끝맺음 필드는 끝인사 → 잘한 말 → 다음엔 이렇게 → 요약 차례(C21)
    const closing = ["farewell", "good_lines", "next_time_lines", "summary"];
    expect(closing.map((k) => keys.indexOf(k))).toEqual(
      [...closing.map((k) => keys.indexOf(k))].sort((a, b) => a - b),
    );
    const message = talkUserMessage({
      ...baseTurn,
      hintKind: "meaning_only",
      hintTier: 1,
      context: { unknownWords: ["ball", "red"] },
    });
    expect(message).toContain("Hint: meaning_only (1)");
    expect(message).toContain("Unit words not known yet: ball, red");
  });

  it("회화 턴 규격: 회화 턴과 끝맺음 턴은 같은 응답 규격 · 같은 고정부를 쓰고 대화 도중 바뀌는 값은 시스템 프롬프트에 없다", () => {
    const first = inputOf(4);
    const later = inputOf(4, {
      history: [{ user: talkUserMessage(baseTurn), assistant: "Nice!" }],
      turn: { ...baseTurn, child: "pizza", targetReached: true },
    });
    const rules = rulesOf(first);
    expect(talkClosingSpec.title).toBe(talkTurnSpec.title);
    expect(talkClosingSpec.purpose).toBe("talk_closing");
    expect(talkTurnSpec.purpose).toBe("talk_turn");
    expect(
      JSON.stringify(z.toJSONSchema(talkClosingSpec.wireSchema(first, rules))),
    ).toBe(
      JSON.stringify(z.toJSONSchema(talkTurnSpec.wireSchema(later, rules))),
    );
    expect(talkTurnSpec.system(first, rules)).toBe(
      talkTurnSpec.system(later, rules),
    );
    expect(talkClosingSpec.system(first, rules)).toBe(
      talkTurnSpec.system(first, rules),
    );
    expect(talkTurnSpec.multiTurn).toBe(true);
  });

  it("회화 턴 규격: 고정부는 반말 뜻 · 설명이고 해요체 지시가 없으며 두 턴 수는 설정에서 읽어 숫자로 넣는다", () => {
    const base = inputOf(4);
    const input = inputOf(4, {
      card: {
        ...base.card,
        todayTopicsKo: ["옆 칸 목록 하나", "옆 칸 목록 둘"],
      },
    });
    const rules = rulesOf(input);
    const system = talkTurnSpec.system(input, rules);
    expect(system).not.toContain("해요체");
    expect(system).toContain("반말");
    expect(system).toContain(TORI_NAME);
    expect(system).toContain(
      `${values["talk.reask_sentence_every_turns"]} turns`,
    );
    expect(system).toContain(
      `${values["talk.follow_up_min_every_turns"]} turns`,
    );
    expect(system).toContain("Keep these rules until the end");
    expect(system).toContain(
      `reaches ${values["talk.dontknow_max"]}, give the answer example`,
    );
    // 가변부: 카드 질문 목록(4단계부터) · 지난 대화 요약 · can-do
    expect(system).toContain(input.card.questions?.[0]?.en ?? "(없음)");
    expect(system).toContain("사과를 좋아한다고 했다.");
    expect(system).toContain(input.canDo);
    // 오늘 이야기 목록은 넣지 않는다
    for (const topic of input.card.todayTopicsKo)
      expect(system).not.toContain(topic);
    // 1~3단계 구간 규칙: tori_en 에는 반응과 연결 말만
    const low = talkTurnSpec.system(inputOf(1), rulesOf(inputOf(1)));
    expect(low).toContain(
      "Do not write questions or answer examples in tori_en",
    );
    expect(low).not.toContain(
      `${values["talk.reask_sentence_every_turns"]} turns`,
    );
  });

  it("회화 턴 규격: 설정 키가 없으면 CallSettingError 로 던진다", () => {
    const input = inputOf(5);
    const broken = { ...values };
    delete broken["talk.next_time_lines"];
    expect(() => talkTurnSpec.rulesOf(broken, input)).toThrow(CallSettingError);
    const wrong = { ...values, "talk.good_lines": -1 };
    expect(() => talkTurnSpec.rulesOf(wrong, input)).toThrow(CallSettingError);
  });

  it("회화 턴 규격: 요청 본문은 1~3단계 Haiku · 4단계부터 Sonnet 구성이고 자동 캐시를 걸며 아이 이름 · 전화번호가 없다", () => {
    for (const level of [1, 4]) {
      const input = inputOf(level, {
        turn: {
          ...baseTurn,
          child: `My name is ${SAMPLE_NAMES.englishName}. Call ${SAMPLE_PHONE}.`,
        },
        summaries: [`${SAMPLE_NAMES.displayName}는 사과를 좋아한다.`],
      });
      const built = buildAiRequest(talkTurnSpec, input, {
        config: requestConfigOf({ purpose: "talk_turn", level, values, book }),
        masker,
        rules: rulesOf(input),
      });
      const text = JSON.stringify(built.body);
      expect(text).not.toContain(SAMPLE_NAMES.englishName);
      expect(text).not.toContain(SAMPLE_NAMES.displayName);
      expect(text).not.toContain(SAMPLE_PHONE);
      expect(text).toContain("{NAME}");
      expect(built.body.cache_control).toEqual({ type: "ephemeral" });
      expect(built.title).toBe("talk_turn");
      expect(built.body.messages.at(-1)?.role).toBe("user");
    }
  });
});

describe("회화 턴 사용자 메시지 · 다시 쓸 토리 차례", () => {
  const context: TalkTurnContext = {
    unknownWords: ["ball", "red"],
    metUnknownWords: ["ball"],
    newWords: ["apple"],
    friendship: 3,
    missionsDone: [],
  };

  it("AC-15k 둘째 턴부터의 사용자 메시지에는 단원 단어 목록과 친한 정도가 값이 바뀐 턴에만 들고 다시 쓸 토리 차례에는 tori_ko 와 영어 이름이 없다", () => {
    // 첫 턴: 모든 값
    const firstDelta = talkContextDelta(null, context);
    const first = talkUserMessage(
      { ...baseTurn, segment: "greeting", context: firstDelta },
      "Hi {NAME}! How are you today?",
    );
    expect(first.startsWith("Tori (app): Hi {NAME}! How are you today?")).toBe(
      true,
    );
    expect(first).toContain("Unit words not known yet: ball, red");
    expect(first).toContain("Friendship: 3");
    // 둘째 턴: 값이 같으면 넣지 않는다
    const same = talkUserMessage({
      ...baseTurn,
      context: talkContextDelta(context, { ...context }),
    });
    expect(same).not.toContain("Unit words not known yet");
    expect(same).not.toContain("Friendship");
    expect(same).not.toContain("Tori (app)");
    // 안다가 된 단어가 생긴 턴: 그 값만
    const changed = talkUserMessage({
      ...baseTurn,
      context: talkContextDelta(context, { ...context, unknownWords: ["red"] }),
    });
    expect(changed).toContain("Unit words not known yet: red");
    expect(changed).not.toContain("Friendship");
    // 다시 쓸 토리 차례: 검사를 지난 영어 글 + 앱이 붙인 말, tori_ko · 이름 없음
    const rewrite = toriRewriteOf({
      sentSentences: ["Two apples!", "Great job, {NAME}."],
      appended: [
        "What color is it?",
        twoAnswersLine(["It's red.", "It's blue."]),
      ],
    });
    expect(rewrite).toBe(
      "Two apples! Great job, {NAME}.\nWhat color is it?\nIt's red. Or It's blue.",
    );
    expect(rewrite).not.toContain("사과");
    expect(rewrite).not.toContain(SAMPLE_NAMES.englishName);
  });

  it("회화 턴 사용자 메시지: 늘 넣는 값은 영어 이름표 줄이고 같은 입력이면 같은 글이다", () => {
    const turn: TalkTurn = {
      ...baseTurn,
      input: "dont_know",
      child: "",
      hintKind: "english",
      hintTier: 2,
      heardHelp: "answer_example",
      dontKnowCount: 2,
      targetReached: true,
      moreTalkUsedUp: true,
      aiQuestionSlot: true,
      segment: "more_talk",
    };
    const text = talkUserMessage(turn);
    expect(text.split("\n")).toEqual([
      "Child: (don't know)",
      "Input: dont_know",
      "Segment: more_talk",
      "Hint: english (2)",
      "Heard help: answer_example",
      "Don't-know count: 2",
      "Target reached: yes",
      "Closing: no",
      "Level test: no",
      "More-talk material used up: yes",
      "AI question slot: yes",
    ]);
    expect(talkUserMessage(turn)).toBe(text);
    expect(
      talkUserMessage({ ...baseTurn, closing: true, child: "" }),
    ).toContain("Closing: yes");
  });

  it("회화 턴 사용자 메시지: 앞 턴은 보낸 사용자 메시지 전문과 다시 쓸 토리 차례를 글자 그대로 쓰고 첫 턴만 앱의 첫 말을 앞머리에 둔다", () => {
    const sent = talkUserMessage(
      { ...baseTurn, segment: "greeting" },
      "How are you today?",
    );
    const input = inputOf(1, {
      history: [{ user: sent, assistant: "Great!\nWhat is this?" }],
      openingLine: "How are you today?",
      turn: { ...baseTurn, child: "It's a ball." },
    });
    const messages = talkTurnSpec.messages(input, rulesOf(input));
    expect(messages).toEqual([
      { role: "user", content: sent },
      { role: "assistant", content: "Great!\nWhat is this?" },
      { role: "user", content: talkUserMessage(input.turn) },
    ]);
    const firstInput = inputOf(1, { openingLine: "How are you today?" });
    expect(talkTurnSpec.messages(firstInput, rulesOf(firstInput))).toEqual([
      {
        role: "user",
        content: talkUserMessage(firstInput.turn, "How are you today?"),
      },
    ]);
  });

  it("회화 턴 사용자 메시지: 가림은 이번 아이 말과 지난 대화 요약만 바꾸고 앞 턴 전문은 글자 그대로 둔다", () => {
    const sent = talkUserMessage({ ...baseTurn, child: "I like red." });
    const input = inputOf(1, {
      history: [{ user: sent, assistant: "Nice!" }],
      turn: { ...baseTurn, child: `I am ${SAMPLE_NAMES.englishName}.` },
      summaries: [`${SAMPLE_NAMES.displayName}는 빨강을 좋아한다.`],
    });
    const masked = talkTurnSpec.mask(input, masker);
    expect(masked.turn.child).toBe("I am {NAME}.");
    expect(masked.summaries[0]).toBe("{NAME}는 빨강을 좋아한다.");
    expect(masked.history).toBe(input.history);
  });
});

describe("회화 턴 정규화", () => {
  const closingTurn: TalkTurn = { ...baseTurn, child: "", closing: true };

  it("AC-15d 정규화 함수는 5단계 다음엔 이렇게 3개 응답에서 1개만 남기고 10단계는 2개를 남기며 4단계는 잘한 말과 다음엔 이렇게를 비운다", () => {
    const answer = sampleJson("talk_turn.l5-closing");
    const at = (level: number) => {
      const input = inputOf(level, { turn: closingTurn });
      return normalizeTalk(answer, input, rulesOf(input));
    };
    const nextTime = values["talk.next_time_lines"] as Record<string, number>;
    const good = values["talk.good_lines"] as number;
    const five = at(5);
    expect(five?.next_time_lines).toHaveLength(nextTime["5"] ?? -1);
    expect(five?.good_lines).toHaveLength(good);
    expect(at(10)?.next_time_lines).toHaveLength(nextTime["10"] ?? -1);
    const four = at(4);
    expect(four?.good_lines).toEqual([]);
    expect(four?.next_time_lines).toEqual([]);
    expect(four?.farewell).toBe("It was fun to talk with you, {NAME}!");
    // 한국어 뜻은 단계 규격 koMeaning(1~4단계)만
    expect(four?.farewell_ko).not.toBe("");
    expect(five?.farewell_ko).toBe("");
    // 끝맺음 턴의 tori_en 은 빈 문자열(C33)
    expect(five?.tori_en).toBe("");
  });

  it("회화 턴 정규화: 힌트 영어 단은 단계 규격 수(4~5 · 6~7 둘, 8~9 하나, 10~12 없음)로 자르고 뜻 힌트는 힌트가 있는 단계만 남긴다", () => {
    const answer = sampleJson("talk_turn.l4-ok");
    const expected: Record<number, number> = {};
    for (const spec of LEVEL_SPECS.filter((s) => s.cardShape === "questions"))
      expected[spec.level] = spec.hintTiers.filter((t) => t !== "ko").length;
    expect(Object.values(expected)).toEqual([2, 2, 2, 2, 1, 1, 0, 0, 0]);
    for (const [level, tiers] of Object.entries(expected)) {
      const input = inputOf(Number(level));
      expect(englishHintTiersOf(input.spec)).toBe(tiers);
      const value = normalizeTalk(answer, input, rulesOf(input));
      expect(value?.next_hints, `${level}단계`).toHaveLength(tiers);
      expect(value?.next_hint_ko === "", `${level}단계`).toBe(
        input.spec.hintTiers.length === 0,
      );
    }
  });

  it("회화 턴 정규화: 스스로 쓴 단어는 원형으로 바꿔 단원 단어 목록에 있는 것만 남기고 카드 질문 번호는 0~카드 질문 수로 자른다", () => {
    const input = inputOf(4);
    const value = normalizeTalk(
      {
        ...(sampleJson("talk_turn.l4-ok") as object),
        self_used_words: ["apples", "Apple", "went", "banana", ""],
        card_question_no: 999,
        next_targets: ["parks", "lunch", "lunch", "moon"],
      },
      input,
      rulesOf(input),
    );
    expect(value?.self_used_words).toEqual(["apple", "go"]);
    expect(value?.card_question_no).toBe(input.card.questions?.length);
    expect(value?.next_targets).toEqual(["park", "lunch"]);
    const negative = normalizeTalk(
      { ...(sampleJson("talk_turn.l4-ok") as object), card_question_no: -3 },
      input,
      rulesOf(input),
    );
    expect(negative?.card_question_no).toBe(0);
  });

  it("회화 턴 정규화: 1~3단계는 흐름이 AI 자리로 판정한 턴(AI question slot)에만 AI 질문 · 힌트를 남기고 그 밖 턴과 평가 대화는 비운다", () => {
    const answer = sampleJson("talk_turn.l1-more-talk-ai");
    const used = inputOf(1, {
      turn: {
        ...baseTurn,
        segment: "more_talk",
        moreTalkUsedUp: true,
        aiQuestionSlot: true,
      },
    });
    const kept = normalizeTalk(answer, used, rulesOf(used));
    expect(kept?.next_question_en).toBe("What color is your ball?");
    expect(kept?.next_hints).toEqual(["My ball is red."]);
    const plain = inputOf(1);
    const cleared = normalizeTalk(answer, plain, rulesOf(plain));
    expect(cleared?.next_question_en).toBe("");
    expect(cleared?.next_hint_ko).toBe("");
    expect(cleared?.next_hints).toEqual([]);
    expect(cleared?.next_answer_example).toBe("");
    const test = inputOf(4, { turn: { ...baseTurn, levelTest: true } });
    const testValue = normalizeTalk(
      sampleJson("talk_turn.l4-ok"),
      test,
      rulesOf(test),
    );
    expect(testValue?.next_hints).toEqual([]);
    expect(testValue?.card_question_no).toBe(0);
  });

  it("회화 턴 정규화: 목표 턴 전 대화 토막의 AI 자리에서도 next_question_en 이 남는다(C100)", () => {
    const answer = sampleJson("talk_turn.l1-more-talk-ai");
    const before = inputOf(1, {
      turn: {
        ...baseTurn,
        segment: "talk",
        moreTalkUsedUp: true,
        aiQuestionSlot: true,
      },
    });
    const kept = normalizeTalk(answer, before, rulesOf(before));
    expect(kept?.next_question_en).toBe("What color is your ball?");
    expect(kept?.next_answer_example).toBe("My ball is red.");
    expect(talkUserMessage(before.turn)).toContain("AI question slot: yes");
    // '더 이야기하기' 토막이라도 흐름이 AI 자리가 아니라고 하면 비운다
    const notSlot = inputOf(1, {
      turn: { ...baseTurn, segment: "more_talk", moreTalkUsedUp: true },
    });
    expect(
      normalizeTalk(answer, notSlot, rulesOf(notSlot))?.next_question_en,
    ).toBe("");
    const low = talkTurnSpec.system(before, rulesOf(before));
    expect(low).toContain("only when 'AI question slot: yes'");
  });

  it("회화 턴 정규화: 엄격 검증은 잘한 말도 다음엔 이렇게와 같이 talk.feedback_from_level 미만이면 0개를 기준으로 본다", () => {
    const from = values["talk.feedback_from_level"] as number;
    const closing = { ...baseTurn, child: "", closing: true };
    const value = {
      ...(normalizeTalk(
        sampleJson("talk_turn.l5-closing"),
        inputOf(from, { turn: closing }),
        rulesOf(inputOf(from, { turn: closing })),
      ) as TalkOutput),
    };
    const lower = inputOf(from - 1, { turn: closing });
    const issues = talkClosingSpec.validate(value, lower, rulesOf(lower));
    expect(issues).toContain("잘한 말 수가 설정을 넘는다");
    const at = inputOf(from, { turn: closing });
    expect(talkClosingSpec.validate(value, at, rulesOf(at))).not.toContain(
      "잘한 말 수가 설정을 넘는다",
    );
  });

  it("회화 턴 정규화: 요약은 talk.summary_max_chars 자로 자르고 미션은 카드 미션 번호만, tori_en 이 없거나 빈 대화 턴은 null 이다", () => {
    const max = values["talk.summary_max_chars"] as number;
    const input = inputOf(5, { turn: closingTurn });
    const long = normalizeTalk(
      {
        ...(sampleJson("talk_turn.l5-closing") as object),
        summary: "가".repeat(max + 10),
      },
      input,
      rulesOf(input),
    );
    expect(Array.from(long?.summary ?? "")).toHaveLength(max);
    const missions = input.card.missions?.length ?? 0;
    expect(missions).toBeGreaterThan(0);
    const turn = inputOf(5);
    const withMissions = normalizeTalk(
      {
        ...(sampleJson("talk_turn.l4-ok") as object),
        mission_done: [1, 1, missions + 1, 0],
      },
      turn,
      rulesOf(turn),
    );
    expect(withMissions?.mission_done).toEqual([1]);
    expect(withMissions?.farewell).toBe("");
    expect(withMissions?.summary).toBe("");
    expect(
      normalizeTalk({ tori_ko: "안녕" }, inputOf(1), rulesOf(inputOf(1))),
    ).toBeNull();
    expect(
      normalizeTalk({ tori_en: "  " }, inputOf(1), rulesOf(inputOf(1))),
    ).toBeNull();
    expect(
      normalizeTalk("not json", inputOf(1), rulesOf(inputOf(1))),
    ).toBeNull();
  });

  it("회화 턴 정규화: 견본 응답이 엄격 규격을 지나거나(정상) 정규화로 고쳐진다(개수 초과)", () => {
    for (const id of [
      "talk_turn.l1-ok",
      "talk_turn.l1-question-in-reaction",
      "talk_turn.l1-blocked",
      "talk_turn.l1-more-talk-ai",
      "talk_turn.l4-ok",
      "talk_turn.l5-closing",
      "talk_turn.fallback",
    ]) {
      const s = sample(id);
      const level = s.expect.level ?? 1;
      const closing = id.includes("closing");
      const moreTalk = id.includes("more-talk");
      const input = inputOf(level, {
        turn: {
          ...baseTurn,
          closing,
          segment: moreTalk ? "more_talk" : "talk",
          moreTalkUsedUp: moreTalk,
          aiQuestionSlot: moreTalk,
        },
      });
      const rules = rulesOf(input);
      const spec = closing ? talkClosingSpec : talkTurnSpec;
      const json = sampleJson(id);
      const wire = spec.wireSchema(input, rules).safeParse(json);
      expect(wire.success, id).toBe(true);
      const issues = wire.success ? spec.validate(wire.data, input, rules) : [];
      expect(issues.length === 0, `${id} ${issues.join(",")}`).toBe(
        s.expect.strict === true,
      );
      const value = spec.normalize(json, input, rules) as TalkOutput | null;
      expect(value, id).not.toBeNull();
      for (const [key, want] of Object.entries(s.expect.normalized ?? {})) {
        const got = (value as Record<string, unknown>)[key];
        if (typeof want === "number")
          expect(got, `${id} ${key}`).toHaveLength(want);
        else expect(got, `${id} ${key}`).toEqual(want);
      }
    }
  });
});

describe("회화 턴 출력 검사(6.4)", () => {
  const hit: FieldHit[] = [{ kind: "forbidden", match: "x" }];

  it("회화 턴 출력 검사: 아이에게 보이는 글 칸을 모두 내고 tori_en 은 내지 않는다", () => {
    const input = inputOf(4);
    const value = normalizeTalk(
      sampleJson("talk_turn.l4-ok"),
      input,
      rulesOf(input),
    ) as TalkOutput;
    const paths = talkCheckFields(value).map((f) => f.path);
    expect(paths).not.toContain("tori_en");
    for (const path of [
      "tori_ko",
      "recast",
      "next_hint_ko",
      "next_hints.0",
      "next_hints.1",
      "next_answer_example",
    ])
      expect(paths).toContain(path);
  });

  it("회화 턴 출력 검사: 걸린 뜻은 전체를 비우고 걸린 힌트 · 답 예시는 비운 채 카드 것으로 바꾸라고 알리며 걸린 끝인사 · 요약은 비운다", () => {
    const input = inputOf(4, { turn: { ...baseTurn, closing: true } });
    const value: TalkOutput = {
      ...(normalizeTalk(
        sampleJson("talk_turn.l4-ok"),
        inputOf(4),
        rulesOf(inputOf(4)),
      ) as TalkOutput),
      farewell: "Bye!",
      farewell_ko: "안녕!",
      good_lines: ["A.", "B."],
      summary: "요약",
    };
    const result = applyTalkChecks(
      value,
      new Map([
        ["tori_ko", hit],
        ["next_hints.1", hit],
        ["farewell_ko", hit],
        ["good_lines.0", hit],
        ["summary", hit],
      ]),
    );
    expect(result.changed).toBe(true);
    expect(result.value.tori_ko).toBe("");
    expect(result.hintsBlocked).toBe(true);
    expect(result.value.next_hints).toEqual([]);
    expect(result.value.next_hint_ko).toBe("");
    expect(result.value.next_answer_example).toBe("");
    expect(result.value.card_question_no).toBe(value.card_question_no);
    expect(result.farewellBlocked).toBe(true);
    expect(result.value.farewell).toBe("");
    expect(result.value.farewell_ko).toBe("");
    expect(result.value.good_lines).toEqual(["B."]);
    expect(result.summaryBlocked).toBe(true);
    expect(result.value.summary).toBe("");
    // 걸린 것이 없으면 그대로
    const clean = applyTalkChecks(value, new Map());
    expect(clean).toEqual({
      value,
      changed: false,
      hintsBlocked: false,
      farewellBlocked: false,
      summaryBlocked: false,
    });
    // CallSpec 꼴의 applyChecks 는 실패 턴으로 보지 않는다
    expect(
      talkTurnSpec.applyChecks(value, new Map([["tori_ko", hit]]), input).fatal,
    ).toBe(false);
  });
});

describe("1~3단계 AI 질문 · 힌트 검사(6.4 · C5)", () => {
  const level = 3;
  const spec = specOf(level);
  const allowedForms = new Set(
    FORMS.filter((f) => {
      const at = f.introducedAt.rst;
      return at ? at.level <= level : false;
    }).map((f) => f.id),
  );
  const options = {
    englishTiers: englishHintTiersOf(spec),
    sentenceMaxWords: spec.sentenceMaxWords,
    allowedWords: new Set([
      "my",
      "is",
      "what",
      "color",
      "your",
      "a",
      "it",
      "i",
      "like",
    ]),
    unitWords: UNIT_WORDS,
    lemmaOf,
    forms: FORMS,
    allowedForms,
  };
  const good = {
    next_question_en: "What color is your ball?",
    next_question_ko: "네 공은 무슨 색이야?",
    next_hint_ko: "내 공은 빨간색이야.",
    next_hints: ["My ball is ___.", "My ball is red."],
    next_answer_example: "My ball is red.",
  };

  it("회화 흐름: 1~3단계 AI 질문이 물음표 · 뜻 힌트 · 어휘 범위 검사에 걸리면 걸린 것으로 돌려준다", () => {
    expect(checkLowLevelAiQuestion(good, options)).toEqual({ ok: true });
    expect(
      checkLowLevelAiQuestion(
        { ...good, next_question_en: "Tell me your ball color." },
        options,
      ),
    ).toEqual({ ok: false, reason: "question" });
    expect(
      checkLowLevelAiQuestion(
        {
          ...good,
          next_question_en: "What color is your very big round red ball?",
        },
        options,
      ),
    ).toEqual({ ok: false, reason: "too_long" });
    expect(
      checkLowLevelAiQuestion({ ...good, next_hint_ko: "" }, options),
    ).toEqual({ ok: false, reason: "hint_pair" });
    expect(
      checkLowLevelAiQuestion(
        { ...good, next_hints: ["My ball is red."] },
        options,
      ),
    ).toEqual({ ok: false, reason: "hint_pair" });
    expect(
      checkLowLevelAiQuestion(
        { ...good, next_answer_example: "My ball is purple." },
        options,
      ),
    ).toEqual({ ok: false, reason: "offband" });
    expect(
      checkLowLevelAiQuestion({ ...good, next_answer_example: "" }, options),
    ).toEqual({ ok: false, reason: "answer_example" });
    // {NAME} 과 수는 범위 밖으로 보지 않는다
    expect(
      checkLowLevelAiQuestion(
        { ...good, next_answer_example: "{NAME} is 2." },
        { ...options, allowedWords: new Set([...options.allowedWords]) },
      ),
    ).toEqual({ ok: true });
  });

  it("회화 흐름: 1~3단계 AI 힌트에 그 단계에 아직 없는 형태(과거형 등)가 있으면 걸린다", () => {
    const pastForm = FORMS.find((f) => f.words.includes("was"));
    expect(pastForm).toBeDefined();
    const narrow = {
      ...options,
      allowedWords: new Set([...options.allowedWords, "was"]),
      allowedForms: new Set(
        [...allowedForms].filter((id) => id !== pastForm?.id),
      ),
    };
    expect(
      checkLowLevelAiQuestion(
        { ...good, next_hints: ["My ball ___ red.", "My ball was red."] },
        narrow,
      ),
    ).toEqual({ ok: false, reason: "form" });
  });
});
