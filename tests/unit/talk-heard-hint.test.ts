// 회화 내용 고침 1 — 알아듣기(13절 C217 (1), AC-15zi). 요청자 iPad 수업(11-08)에서 맞는 답 sea 가 'See' 로, beach 가 'Teach' 로 들려 선생님이
// 딴 낱말로 받았다. 앱이 들은 글의 낱말을 그 차례의 기대 낱말과 두 갈래(동음이의어 묶음 · 소리가 가까운 낱말 시드 목록)로 맞대어 회화 턴
// 사용자 메시지에 귀띔 한 줄을 넣고, 막힘 무름과 '먼저 답한 필수 질문' 셈에 동음이의어를 쓴다. '말함'은 동음이의어까지만 센다(소리가 가까운 낱말은
// 대화에만). 실제 API 를 부르지 않는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  normalizeTalkLesson,
  type TalkLessonOutput,
  talkCallTurnOf,
  talkLessonSystem,
  talkLessonUserMessage,
} from "@/core/ai/calls/talk-lesson";
import { effectiveStuckOf, touchesScene } from "@/core/conversation/child-kind";
import {
  type HeardHint,
  heardHintsOf,
  type SoundAlikeEntry,
} from "@/core/conversation/heard-hint";
import {
  childAnsweredRequiredOf,
  type LessonArgs,
  nextTeacherTurnOf,
  talkLessonPositionOf,
} from "@/core/conversation/lesson-flow";
import { saidWordsOf } from "@/core/conversation/said";
import { checkTalkLists } from "@/core/seed/check-talk-lists";
import {
  HomophonesFileSchema,
  SoundAlikesFileSchema,
} from "@/core/seed/schema/reference";
import { SEED_FILES } from "@/core/seed/structure";
import { buildLexicon } from "@/core/seed/text";
import { seedSoundAlikes } from "@/server/seed-lists";
import {
  BASE_CALL_TURN,
  lessonInput,
  lessonRules,
} from "../fixtures/ai/talk-lesson-inputs";
import {
  aiTurn,
  CARD3,
  LOW,
  MID,
  NEW3,
  opening3,
  SPEC3,
  SPEC4,
  said,
} from "../fixtures/talk-lesson";

const REPO = process.cwd();
const readSeed = (path: string): unknown =>
  JSON.parse(readFileSync(join(REPO, "seed", path), "utf8"));

/** 요청자 수업(3단계 단원 1 다지기 — 바닷가와 산 나들이)의 낱말로 만든 작은 견본. */
const HOMOPHONES = [
  ["see", "sea"],
  ["two", "to", "too"],
  ["four", "for"],
];
const ALIKES: SoundAlikeEntry[] = [
  { word: "beach", alikes: ["teach", "peach"] },
  { word: "wash", alikes: ["wish"] },
];
const UNIT = ["eat", "drink", "go", "come", "wash", "sea", "mountain", "beach"];
/** 표기형 → 원형 견본. */
const LEMMAS: Record<string, string> = {
  sandwiches: "sandwich",
  whales: "whale",
  eats: "eat",
  washes: "wash",
  wishes: "wish",
};
const lemmaOf = (w: string) => LEMMAS[w.toLowerCase()];
const lists = { homophones: HOMOPHONES, soundAlikes: ALIKES };

const hints = (
  heard: string,
  expected: {
    answer?: string | null;
    targets?: string[];
    scene?: string[];
  } = {},
  over: Partial<typeof lists> = {},
): HeardHint[] =>
  heardHintsOf({
    heard,
    answer: expected.answer ?? null,
    targets: expected.targets ?? [],
    scene: expected.scene ?? [],
    ...lists,
    ...over,
    lemmaOf,
  });

describe("들은 글 귀띔 표(heardHintsOf — 동음이의어 · 소리가 가까운 낱말)", () => {
  it("AC-15zi: See → sea: 그 질문의 답 낱말과 같은 소리 묶음이면 동음이의어 귀띔이다(요청자 수업 T6 · T9)", () => {
    expect(
      hints("See", { answer: "They swim in the sea.", targets: ["sea"] }),
    ).toEqual([
      { heard: "see", expected: "sea", by: "homophone", from: "answer" },
    ]);
    // 답 예시만 있고 노리는 단어가 없는 AI 질문이어도 답 예시의 내용 낱말로 맞댄다
    expect(hints("See", { answer: "It is in the sea." })).toEqual([
      { heard: "see", expected: "sea", by: "homophone", from: "answer" },
    ]);
  });

  it("AC-15zi: Teach → beach: 소리가 가까운 낱말 시드 목록에 있으면 소리 귀띔이다(요청자 수업 C20)", () => {
    expect(
      hints("Teach", { answer: "We play at the beach.", targets: ["beach"] }),
    ).toEqual([
      { heard: "teach", expected: "beach", by: "sound", from: "answer" },
    ]);
    // 원형으로 맞댄다(답 예시가 활용형이어도, 들은 글이 활용형이어도) — 귀띔의 기대 낱말은 답 예시에 적힌 꼴이다
    expect(hints("Wish", { answer: "She washes it." })).toEqual([
      { heard: "wish", expected: "washes", by: "sound", from: "answer" },
    ]);
    expect(
      hints("Wishes", { answer: "I wash it.", targets: ["wash"] }),
    ).toEqual([
      { heard: "wishes", expected: "wash", by: "sound", from: "answer" },
    ]);
  });

  it("AC-15zi: 답 예시와 틀이 같다는 것만으로는 귀띔을 내지 않는다: 'I can see'(답 예시 'Yes, I can swim.') · 'I can run' · 'I like dolphins' 에 귀띔이 없다(13절 'C203 (1) · C217 보완 3' — 소리가 닮지 않은 낱말을 답 예시 낱말로 바꿔 듣지 않는다)", () => {
    const swim = { answer: "Yes, I can swim." };
    // 요청자 수업 T3 의 'I can see': see 와 swim 은 같은 소리도 가까운 소리 목록의 낱말도 아니다
    expect(
      hints("I can see", { ...swim, scene: ["see", "sea", "swim"] }),
    ).toEqual([]);
    // 반대 사례: 닫힌 질문에 답 예시와 다른 낱말로 맞게 답한 말(선생님이 답 예시 낱말로 뒤집으면 안 된다)
    expect(hints("I can run", { ...swim, scene: ["swim", "run"] })).toEqual([]);
    expect(
      hints("I like dolphins", {
        answer: "Yes, I like whales.",
        scene: ["whale", "dolphin", "sea"],
      }),
    ).toEqual([]);
    expect(hints("It hits fish", { answer: "It eats fish." })).toEqual([]);
    expect(hints("I am tired", { answer: "I am happy." })).toEqual([]);
    // 소리에 근거가 있는 귀띔은 문장 속이어도 그대로 난다(그 질문의 답 낱말과 같은 소리 · 가까운 소리)
    expect(
      hints("They swim in the see", {
        answer: "They swim in the sea.",
        targets: ["sea"],
      }),
    ).toEqual([
      { heard: "see", expected: "sea", by: "homophone", from: "answer" },
    ]);
    expect(
      hints("We play at the teach", {
        answer: "We play at the beach.",
        targets: ["beach"],
      }),
    ).toEqual([
      { heard: "teach", expected: "beach", by: "sound", from: "answer" },
    ]);
  });

  it("AC-15zi: Tomorrow 는 귀띔이 없다(묶음 · 목록 어디에도 닿지 않음 — 요청자 수업 C7)", () => {
    expect(
      hints("Tomorrow", {
        answer: "It is big.",
        targets: [],
        scene: UNIT,
      }),
    ).toEqual([]);
  });

  it("AC-15zi: 기대 낱말이 없으면 귀띔도 없다(답 예시 · 노리는 단어 · 장면 낱말이 모두 빔)", () => {
    expect(hints("See")).toEqual([]);
    expect(hints("Teach")).toEqual([]);
    expect(hints("I can see")).toEqual([]);
  });

  it("AC-15zi: 들은 낱말이 이미 그 질문의 답 낱말이면 귀띔하지 않는다(맞게 들린 말)", () => {
    expect(
      hints("Sea", { answer: "They swim in the sea.", targets: ["sea"] }),
    ).toEqual([]);
    expect(
      hints("Beach", { answer: "We play at the beach.", targets: ["beach"] }),
    ).toEqual([]);
    expect(
      hints("We eat sandwiches", { answer: "We eat sandwiches." }),
    ).toEqual([]);
  });

  it("AC-15zi: 그 질문의 답에는 없고 오늘 장면 낱말에만 닿으면 장면 귀띔이다 — 소리 귀띔은 한두 낱말 말에만", () => {
    // 동음이의어: 들은 낱말이 장면 낱말이 아니고 같은 소리의 장면 낱말이 있다
    expect(hints("See", { answer: "It is big.", scene: ["sea"] })).toEqual([
      { heard: "see", expected: "sea", by: "homophone", from: "scene" },
    ]);
    // 인사 · 맞장구 말(too · hi · right)은 장면 낱말과 맞대지 않는다(13절 C217 보완 — talk-content-fix1.test.ts)
    expect(hints("Too", { answer: "It is big.", scene: ["two"] })).toEqual([]);
    // 소리: 한 낱말 말
    expect(hints("Teach", { answer: "It is big.", scene: UNIT })).toEqual([
      { heard: "teach", expected: "beach", by: "sound", from: "scene" },
    ]);
    // 문장 속 낱말은 장면 소리 귀띔을 내지 않는다(아이가 정말 그 낱말을 말했을 수 있다)
    expect(
      hints("I teach my dog", { answer: "It is big.", scene: UNIT }),
    ).toEqual([]);
    // 들은 낱말이 그대로 장면 낱말이면(see · sea 모두 단원 단어) 장면 귀띔을 내지 않는다
    expect(
      hints("See", { answer: "It is big.", scene: ["see", "sea"] }),
    ).toEqual([]);
  });

  it("AC-15zi: 기능어는 한두 낱말 말일 때만 맞댄다('I go to school.' 의 to 가 two 귀띔이 되지 않게)", () => {
    expect(
      hints("I go to school", { answer: "Two apples.", targets: ["two"] }),
    ).toEqual([]);
    expect(hints("To", { answer: "Two apples.", targets: ["two"] })).toEqual([
      { heard: "to", expected: "two", by: "homophone", from: "answer" },
    ]);
    // 장면 낱말에는 기능어를 맞대지 않는다
    expect(hints("For", { scene: ["four"] })).toEqual([]);
  });

  it("AC-15zi: 모름 말 · 빈 글 · 한국어 글은 귀띔이 없고, 같은 낱말은 한 번만 낸다", () => {
    const expected = { answer: "They swim in the sea.", targets: ["sea"] };
    expect(hints("I don't know", expected)).toEqual([]);
    expect(hints("", expected)).toEqual([]);
    expect(hints("바다", expected)).toEqual([]);
    expect(hints("See see", expected)).toHaveLength(1);
  });

  it("AC-15zi: 목록이 비면(파일 없는 개발 길) 귀띔이 없다", () => {
    const none = { homophones: [], soundAlikes: [] };
    expect(
      hints("See", { answer: "They swim in the sea.", targets: ["sea"] }, none),
    ).toEqual([]);
    expect(hints("I can see", { answer: "Yes, I can swim." }, none)).toEqual(
      [],
    );
  });
});

describe("막힘 무름 · 먼저 답한 필수 질문에 동음이의어 정규화(C217 (1) · 분석 A1 · A2)", () => {
  const scene = new Set(["sea", "beach", "two", "fish"]);

  it("AC-15zi: touchesScene: 'See.' 는 장면 낱말 sea 에 닿고, 묶음이 없으면 닿지 않는다", () => {
    expect(touchesScene("See.", scene)).toBe(false);
    expect(touchesScene("See.", scene, HOMOPHONES)).toBe(true);
    expect(touchesScene("Big see.", scene, HOMOPHONES)).toBe(true);
    // 글자 그대로 닿는 말은 그대로
    expect(touchesScene("Fish.", scene, HOMOPHONES)).toBe(true);
    // 기능어는 묶음을 거치기 전에 거른다('To.' 가 two 에 닿지 않는다)
    expect(touchesScene("To.", scene, HOMOPHONES)).toBe(false);
    // 소리가 가까운 낱말은 앱의 막힘 무름에 쓰지 않는다(C217 — 동음이의어까지만)
    expect(touchesScene("Teach.", scene, HOMOPHONES)).toBe(false);
    // 세 낱말 이상 · 모름 말은 이 조건이 아니다
    expect(touchesScene("Huh?", scene, HOMOPHONES)).toBe(false);
  });

  it("AC-15zi: effectiveStuckOf: AI 가 'See.' 를 관계없는 낱말(막힘)로 봐도 앱이 무른다", () => {
    const base = {
      aiStuck: true,
      childKind: "unrelated_words" as const,
      child: "See.",
      input: "speech",
      sceneWords: scene,
    };
    expect(effectiveStuckOf(base)).toBe(true);
    expect(effectiveStuckOf({ ...base, homophones: HOMOPHONES })).toBe(false);
    // 막힘이 아닌 말을 막힘으로 바꾸지 않는다(무르기만)
    expect(
      effectiveStuckOf({ ...base, aiStuck: false, homophones: HOMOPHONES }),
    ).toBe(false);
    // 장면과 관계없는 한 낱말은 그대로 막힘이다
    expect(
      effectiveStuckOf({ ...base, child: "Tomorrow.", homophones: HOMOPHONES }),
    ).toBe(true);
  });

  it("AC-15zi: 정규화(normalizeTalkLesson)가 입력의 동음이의어 묶음으로 막힘을 무른다", () => {
    const raw: TalkLessonOutput = {
      child_kind: "unrelated_words",
      stuck: true,
      tori_en: "That's okay!",
      model_line: "",
      choices: [],
      tori_ko: [],
      recast: "",
      explanation: "",
      new_words: [],
      self_used_words: [],
      mission_done: [],
      response_fit: false,
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
    };
    // 견본 단원 단어에 'sunday' 가 있다 — 같은 소리 묶음 견본으로 'sundae' 를 쓴다
    const groups = [["sunday", "sundae"]];
    const without = normalizeTalkLesson(
      raw,
      lessonInput(3, { turn: { child: "Sundae." } }),
      lessonRules(3),
    );
    const withGroups = normalizeTalkLesson(
      raw,
      lessonInput(3, { turn: { child: "Sundae." }, homophones: groups }),
      lessonRules(3),
    );
    expect(without?.stuck).toBe(true);
    expect(withGroups?.stuck).toBe(false);
  });

  it("AC-15zi: childAnsweredRequiredOf: 'They swim in the see.' 는 sea 를 노리는 필수 질문의 답으로 센다", () => {
    const required = [
      {
        no: 2,
        targets: ["sea"],
        answerExample: "They swim in the sea.",
      },
      { no: 7, targets: ["two"], answerExample: "Two apples." },
    ];
    const of = (
      childLines: string[],
      homophones?: readonly (readonly string[])[],
    ) =>
      childAnsweredRequiredOf({
        required,
        childLines,
        lemmaOf,
        ...(homophones ? { homophones } : {}),
      });
    expect(of(["They swim in the see."])).toEqual([]);
    expect(of(["They swim in the see."], HOMOPHONES)).toEqual([2]);
    // 답 예시의 다른 내용 낱말(swim)이 없으면 지금처럼 세지 않는다(뜻 일치 조건은 그대로)
    expect(of(["See."], HOMOPHONES)).toEqual([]);
    // 기능어는 묶음을 거치지 않는다('I want to eat apples.' 의 to 가 two 답이 아니다)
    expect(of(["I want to eat apples."], HOMOPHONES)).toEqual([]);
    expect(of(["Two apples."], HOMOPHONES)).toEqual([7]);
    // 소리가 가까운 낱말은 이 셈에 닿지 않는다(C217 — 'We play at the teach.' 는 beach 를 노리는 질문의 답으로 세지 않는다)
    expect(
      childAnsweredRequiredOf({
        required: [
          { no: 4, targets: ["beach"], answerExample: "We play at the beach." },
        ],
        childLines: ["We play at the teach."],
        lemmaOf,
        homophones: HOMOPHONES,
      }),
    ).toEqual([]);
  });
});

describe("'말함' · 평가에는 소리가 가까운 낱말이 닿지 않는다(C217 (1) — 정본 그대로 동음이의어까지만)", () => {
  const lex = {
    unitWords: UNIT,
    lemmaOf,
    homophones: HOMOPHONES,
  };

  it("AC-15zi: saidWordsOf: AI 가 beach 를 돌려줘도 들은 글이 'Teach' 면 '말했다'가 아니고, 'See' 는 sea 로 센다", () => {
    expect(
      saidWordsOf({
        ...lex,
        aiWords: ["beach"],
        heard: "Teach",
        hintKind: "none",
      }),
    ).toEqual([]);
    expect(
      saidWordsOf({ ...lex, aiWords: ["sea"], heard: "See", hintKind: "none" }),
    ).toEqual(["sea"]);
    // see · sea 가 모두 단원 단어인 실제 단원(회화 3단계 단원 1)에서도 같다 — 실제 단원 단어 시험은 conversation-said.test.ts(코드 검토 M-6 · O-1)
    const both = { ...lex, unitWords: ["see", ...UNIT] };
    expect(
      saidWordsOf({
        ...both,
        aiWords: ["sea"],
        heard: "See",
        hintKind: "none",
      }),
    ).toEqual(["sea"]);
    expect(
      saidWordsOf({
        ...both,
        aiWords: ["sea"],
        heard: "Sea",
        hintKind: "none",
      }),
    ).toEqual(["sea"]);
    expect(
      saidWordsOf({
        ...both,
        aiWords: ["beach"],
        heard: "Teach",
        hintKind: "none",
      }),
    ).toEqual([]);
  });

  it("AC-15zi: '말함' · 단계 평가 · 일치율 모듈은 귀띔 모듈과 소리가 가까운 낱말 목록을 읽지 않는다", () => {
    const src = (path: string) => readFileSync(join(REPO, "src", path), "utf8");
    for (const path of [
      "core/conversation/said.ts",
      "core/conversation/listen.ts",
      "core/speech/match-rate.ts",
    ]) {
      expect(src(path), path).not.toMatch(
        /heard-hint|sound-alikes|soundAlikes/,
      );
    }
    // 귀띔 모듈도 '말함' 셈을 가져오지 않는다
    expect(src("core/conversation/heard-hint.ts")).not.toMatch(
      /conversation\/said|saidWordsOf/,
    );
  });
});

describe("호출 입력 · 사용자 메시지 · 고정부(귀띔 한 줄과 받는 규칙 두 줄)", () => {
  const turns = [...opening3(), said()];
  const args = (level: 3 | 4): LessonArgs => ({
    spec: level === 3 ? SPEC3 : SPEC4,
    card: CARD3,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: level === 3 ? LOW : MID,
    prepWords: CARD3.prep ?? [],
  });
  const heard = {
    answer: "They swim in the sea.",
    targets: ["sea"],
    scene: UNIT,
    ...lists,
  };
  const callTurn = (
    level: 3 | 4,
    child: string,
    input: "speech" | "dont_know" = "speech",
    withHeard = true,
  ) =>
    talkCallTurnOf({
      plan: nextTeacherTurnOf(args(level)),
      child,
      input,
      hintKind: "none",
      hintTier: 0,
      heardHelp: "none",
      lemmaOf,
      ...(withHeard ? { heard } : {}),
    });

  it("AC-15zi: 귀띔 재료의 질문 자리: 아이 행까지 넣은 위치의 answeredSlot 이 아이가 답하던 질문 글 · 답 예시 · 노리는 단어다(서버 배선이 읽는 칸)", () => {
    // 카드 필수 질문에 답한 턴
    const card = talkLessonPositionOf(args(3)).answeredSlot;
    expect(card).toMatchObject({
      question: CARD3.required[0]?.en,
      answerExample: CARD3.required[0]?.answerExample,
      words: CARD3.required[0]?.targets,
    });
    // 선생님의 AI 질문에 답한 턴(답 예시는 그 응답의 next_answer_example)
    const ai = talkLessonPositionOf({
      ...args(3),
      turns: [
        ...turns,
        aiTurn("Oh! Is it fun?", { next: "follow_up" }, "Yes, it is fun."),
        said(),
      ],
    }).answeredSlot;
    expect(ai).toMatchObject({
      question: "Is it fun?",
      answerExample: "Yes, it is fun.",
      words: [],
    });
  });

  it("AC-15zi: talkCallTurnOf 가 1~3단계 말 입력 턴에 귀띔 칸을 채우고, 재료를 받지 않았거나 닿는 것이 없으면 칸이 없다", () => {
    expect(callTurn(3, "See").heardHints).toEqual([
      { heard: "see", expected: "sea", by: "homophone", from: "answer" },
    ]);
    expect(callTurn(3, "Sea").heardHints).toBeUndefined();
    expect(callTurn(3, "Tomorrow").heardHints).toBeUndefined();
    expect(callTurn(3, "See", "speech", false).heardHints).toBeUndefined();
    // 단추('잘 모르겠어요') 턴 · 4단계부터는 넣지 않는다(4단계부터 사용자 메시지는 고치기 전 글자 그대로)
    expect(callTurn(3, "See", "dont_know").heardHints).toBeUndefined();
    expect(callTurn(4, "See").heardHints).toBeUndefined();
  });

  it("AC-15zi: 사용자 메시지: 귀띔이 있으면 아이 말 줄 바로 뒤에 한 줄, 없으면 줄이 없다", () => {
    const message = talkLessonUserMessage(callTurn(3, "See"));
    const lines = message.split("\n");
    const at = lines.findIndex((l) => l.startsWith("Child: "));
    expect(lines[at]).toBe("Child: See");
    expect(lines[at + 1]).toBe(
      "Heard hint (speech recognition may have misheard): 'see' may be the answer word 'sea' (same sound)",
    );
    expect(talkLessonUserMessage(callTurn(3, "Sea"))).not.toContain(
      "Heard hint",
    );
    expect(talkLessonUserMessage(BASE_CALL_TURN)).not.toContain("Heard hint");
  });

  it("AC-15zi: 사용자 메시지: 갈래마다 글이 다르고(같은 소리 · 가까운 소리, 답 낱말 · 장면 낱말) 여러 귀띔은 한 줄에 잇는다", () => {
    const line = (hintList: HeardHint[], child: string) =>
      talkLessonUserMessage({
        ...BASE_CALL_TURN,
        child,
        heardHints: hintList,
      })
        .split("\n")
        .find((l) => l.startsWith("Heard hint"));
    expect(
      line(
        [{ heard: "teach", expected: "beach", by: "sound", from: "answer" }],
        "Teach",
      ),
    ).toBe(
      "Heard hint (speech recognition may have misheard): 'teach' may be the answer word 'beach' (close sound)",
    );
    expect(
      line(
        [{ heard: "see", expected: "sea", by: "homophone", from: "answer" }],
        "See",
      ),
    ).toBe(
      "Heard hint (speech recognition may have misheard): 'see' may be the answer word 'sea' (same sound)",
    );
    expect(
      line(
        [
          { heard: "teach", expected: "beach", by: "sound", from: "scene" },
          { heard: "too", expected: "two", by: "homophone", from: "scene" },
        ],
        "Teach too",
      ),
    ).toBe(
      "Heard hint (speech recognition may have misheard): 'teach' may be today's word 'beach' (close sound); 'too' may be today's word 'two' (same sound)",
    );
  });

  it("AC-15zi: 사용자 메시지: 가린 아이 말에 없는 들은 낱말은 귀띔에 싣지 않는다(가림 뒤 글에 없는 낱말이 새지 않게)", () => {
    const turn = {
      ...BASE_CALL_TURN,
      child: "I am [이름]",
      heardHints: [
        {
          heard: "minsu",
          expected: "happy",
          by: "sound",
          from: "answer",
        } as const,
      ],
    };
    const message = talkLessonUserMessage(turn);
    expect(message).not.toContain("minsu");
    expect(message).not.toContain("Heard hint");
  });

  it("AC-15zi: 고정부: 1~3단계에 받는 규칙 두 줄이 있고(한 낱말 답은 인식이 자주 틀린다 · 귀띔이 있으면 그 낱말로 받고 잘못 들린 낱말을 되풀이하지 않는다), 4단계부터는 없다", () => {
    const three = talkLessonSystem(lessonInput(3), lessonRules(3));
    expect(three).toContain(
      "a one-word answer is easily misheard as a word with the same or a close sound",
    );
    expect(three).toContain("When the message has a 'Heard hint' line");
    expect(three).toContain("never say the misheard word back");
    expect(three).toContain(
      "If the child's words make sense as they are, take them as they are.",
    );
    const four = talkLessonSystem(lessonInput(4), lessonRules(4));
    expect(four).not.toContain("Heard hint");
    expect(four).not.toContain("misheard");
  });
});

describe("소리가 가까운 낱말 시드 목록(seed/lists/sound-alikes.json — 규격 · 검증기 · 읽기 길)", () => {
  const seed = readSeed("lists/sound-alikes.json");
  const homophones = HomophonesFileSchema.parse(
    readSeed("lists/homophones.json"),
  );

  it("AC-15zi: 규격 파일 표에 있고 규격을 지난다 — 3단계 단원 1 의 단원 단어마다 가까운 낱말이 있다", () => {
    expect(SEED_FILES.soundAlikes).toBe("lists/sound-alikes.json");
    const file = SoundAlikesFileSchema.parse(seed);
    const words = new Set(file.words.map((w) => w.word));
    const units = (
      readSeed("unit-specs.json") as {
        unitSpecs: {
          area: string;
          level: number;
          unit: number;
          words: string[];
        }[];
      }
    ).unitSpecs.find((u) => u.area === "talk" && u.level === 3 && u.unit === 1);
    expect(units).toBeDefined();
    for (const word of units?.words ?? []) expect(words, word).toContain(word);
    // 요청자 수업의 틀린 인식(beach → Teach · wash → wish)이 목록에 있다
    const of = (word: string) =>
      file.words.find((w) => w.word === word)?.alikes ?? [];
    expect(of("beach")).toContain("teach");
    expect(of("wash")).toContain("wish");
  });

  it("AC-15zi: 규격: 빈 목록 · 겹친 낱말 · 겹친 항목 · 대문자 · 모르는 열쇠를 거부한다", () => {
    const ok = { words: [{ word: "beach", alikes: ["teach"] }] };
    expect(SoundAlikesFileSchema.safeParse(ok).success).toBe(true);
    for (const bad of [
      { words: [] },
      { words: [{ word: "beach", alikes: [] }] },
      { words: [{ word: "beach", alikes: ["teach", "teach"] }] },
      { words: [{ word: "Beach", alikes: ["teach"] }] },
      { words: [{ word: "beach", alikes: ["teach"], note: "x" }] },
      {
        words: [
          { word: "beach", alikes: ["teach"] },
          { word: "beach", alikes: ["peach"] },
        ],
      },
    ])
      expect(SoundAlikesFileSchema.safeParse(bad).success).toBe(false);
  });

  it("AC-15zi: 검증기: 자기 자신 · 같은 원형의 활용형 · 동음이의어 묶음의 낱말 · 기능어 · 어휘에 없는 표제어를 막는다", () => {
    const lexicon = buildLexicon([
      { word: "beach", pos: ["noun"], level: 3, forms: ["beaches"] },
      { word: "sea", pos: ["noun"], level: 3, forms: ["seas"] },
      { word: "eat", pos: ["verb"], level: 1, forms: ["eats", "ate"] },
    ]);
    const check = (words: SoundAlikeEntry[]) =>
      checkTalkLists(
        {
          soundAlikes: {
            words: words.map((w) => ({ ...w, alikes: [...w.alikes] })),
          },
          homophones: { groups: [["see", "sea"]] },
        },
        { lexicon, maxWordsAt: () => undefined },
      ).filter((i) => i.rule === "sound-alikes");
    expect(check([{ word: "beach", alikes: ["teach", "peach"] }])).toEqual([]);
    const bad = check([
      { word: "beach", alikes: ["beach"] },
      { word: "beach", alikes: ["beaches"] },
      { word: "sea", alikes: ["see"] },
      { word: "eat", alikes: ["it"] },
      { word: "whale", alikes: ["wail"] },
    ]);
    expect(bad.map((i) => i.path)).toEqual([
      "words.0.alikes.0",
      "words.1.alikes.0",
      "words.2.alikes.0",
      "words.3.alikes.0",
      "words.4.word",
    ]);
    expect(bad.every((i) => i.file === SEED_FILES.soundAlikes)).toBe(true);
    // 실제 시드 목록은 실제 동음이의어 묶음과 겹치지 않는다
    const real = SoundAlikesFileSchema.parse(seed);
    expect(
      checkTalkLists(
        { soundAlikes: real, homophones },
        { maxWordsAt: () => undefined },
      ).filter((i) => i.rule === "sound-alikes"),
    ).toEqual([]);
  });

  it("AC-15zi: 서버 읽기: 목록을 읽고, 파일이 없는 뿌리에서는 빈 목록이다", () => {
    const list = seedSoundAlikes({ root: REPO });
    expect(list.find((w) => w.word === "beach")?.alikes).toContain("teach");
    expect(seedSoundAlikes({ root: join(REPO, "tests", "fixtures") })).toEqual(
      [],
    );
  });
});
