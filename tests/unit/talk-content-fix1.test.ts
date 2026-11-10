// 회화 내용 고침 1 fix 1(13절 C217 보완 — 코드 검토 rev-content-1 I-1 · I-2 · M-1 · M-2 · M-3 · M-4 · M-8, 자리 재현 재생 보고 8.5).
// 귀띔이 맞게 들린 말에 붙어 선생님이 아이의 맞는 말을 뒤집거나, 인사 · 맞장구 말이 단원 단어의 '말했다' 근거로 밀리는 길을 막는다:
// (1) 장면 낱말의 같은 소리 귀띔도 한두 낱말 말에만, 아이 말의 인사 · 맞장구 말은 묶음을 거치지 않는다. (2) 답 틀만으로 내는 귀띔은 fix 2 에서
// 뺐다(13절 C217 보완 3 (6)). (3) 문장 속에서 들은 낱말이 그대로 장면 낱말이면 소리 귀띔을 내지 않고, 겹친 가까운 낱말을 검증기가 알린다. 실제 API 를 부르지 않는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  talkCallTurnOf,
  talkLastStartOf,
  talkLessonSystem,
  talkLessonUserMessage,
  talkTurnWiringOf,
} from "@/core/ai/calls/talk-lesson";
import {
  effectiveStuckOf,
  isChildFillerWord,
  touchesScene,
} from "@/core/conversation/child-kind";
import {
  type HeardHint,
  heardHintsOf,
  type SoundAlikeEntry,
} from "@/core/conversation/heard-hint";
import {
  childAnsweredRequiredOf,
  type LessonArgs,
  talkLessonPositionOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import {
  TALK_SUPPORT_STAGE_EASY,
  TALK_SUPPORT_STAGE_TOGETHER,
} from "@/core/conversation/move";
import { questionRetryNoteOf } from "@/core/conversation/question-retry";
import { cardLineWithoutSaidOf } from "@/core/conversation/spoken";
import { checkTalkLists } from "@/core/seed/check-talk-lists";
import {
  HomophonesFileSchema,
  SoundAlikesFileSchema,
} from "@/core/seed/schema/reference";
import { buildLexicon } from "@/core/seed/text";
import { questionRetryTagOf, taggedErrorCode } from "@/server/ai/talk";
import {
  lessonInput,
  lessonRules,
  CARD3 as VIEW_CARD3,
} from "../fixtures/ai/talk-lesson-inputs";
import {
  aiTurn,
  button,
  CARD3,
  child,
  LOW,
  MID,
  NEW3,
  opening3,
  SPEC3,
  SPEC4,
  said,
  teacher,
} from "../fixtures/talk-lesson";

const REPO = process.cwd();
const readSeed = (path: string): unknown =>
  JSON.parse(readFileSync(join(REPO, "seed", path), "utf8"));

/** 실제 시드 목록(동음이의어 묶음 · 소리가 가까운 낱말)과 실제 회화 단원 단어. */
const HOMOPHONES = HomophonesFileSchema.parse(
  readSeed("lists/homophones.json"),
).groups;
const ALIKES = SoundAlikesFileSchema.parse(
  readSeed("lists/sound-alikes.json"),
).words;
const UNITS = (
  readSeed("unit-specs.json") as {
    unitSpecs: { area: string; level: number; unit: number; words: string[] }[];
  }
).unitSpecs.filter((u) => u.area === "talk");
const unitWords = (level: number, unit: number): string[] => {
  const found = UNITS.find((u) => u.level === level && u.unit === unit);
  if (!found) throw new Error(`회화 ${level}단계 단원 ${unit} 규격이 없다`);
  return found.words;
};

const hints = (
  heard: string,
  expected: {
    answer?: string | null;
    targets?: string[];
    scene?: string[];
  } = {},
  over: {
    homophones?: readonly (readonly string[])[];
    soundAlikes?: readonly SoundAlikeEntry[];
  } = {},
): HeardHint[] =>
  heardHintsOf({
    heard,
    answer: expected.answer ?? null,
    targets: expected.targets ?? [],
    scene: expected.scene ?? [],
    homophones: HOMOPHONES,
    soundAlikes: ALIKES,
    ...over,
    lemmaOf: () => undefined,
  });

describe("I-2 귀띔 좁힘 — 인사 · 맞장구 말은 단원 단어의 같은 소리 귀띔이 되지 않는다(C217 보완)", () => {
  it("AC-15zi: 'Hi! I am good.'(회화 3단계 단원 3 단원 단어 high) · 'I like it too.'(1단계 단원 5 two) · 'Right!'(2단계 단원 4 write)에 귀띔이 없다", () => {
    // 실제 단원 단어에 그 낱말이 있다(시험이 빈 조건으로 지나지 않게)
    expect(unitWords(3, 3)).toContain("high");
    expect(unitWords(1, 5)).toContain("two");
    expect(unitWords(2, 4)).toContain("write");
    const greeting = { answer: "I am good." };
    expect(
      hints("Hi! I am good.", { ...greeting, scene: unitWords(3, 3) }),
    ).toEqual([]);
    expect(
      hints("I like it too.", {
        answer: "Yes, I do.",
        scene: unitWords(1, 5),
      }),
    ).toEqual([]);
    expect(
      hints("Right!", {
        answer: "Yes, it is.",
        scene: unitWords(2, 4),
      }),
    ).toEqual([]);
    // 한 낱말 인사 · 맞장구도 장면 낱말과는 맞대지 않는다
    for (const [said, scene] of [
      ["Hi!", unitWords(3, 3)],
      ["Too.", unitWords(1, 5)],
      ["Bye!", ["buy"]],
      ["So.", ["sew"]],
    ] as const)
      expect(hints(said, { scene: [...scene] }), said).toEqual([]);
  });

  it("AC-15zi: 장면 낱말의 같은 소리 귀띔은 한두 낱말 말에만 낸다(문장 속 낱말은 아이가 정말 말했을 수 있다)", () => {
    const scene = ["sea", "beach", "swim"];
    expect(hints("See", { answer: "It is big.", scene })).toEqual([
      { heard: "see", expected: "sea", by: "homophone", from: "scene" },
    ]);
    expect(hints("Big see", { answer: "It is big.", scene })).toEqual([
      { heard: "see", expected: "sea", by: "homophone", from: "scene" },
    ]);
    expect(hints("I see a big fish", { answer: "It is big.", scene })).toEqual(
      [],
    );
    // 그 질문의 답 낱말과 같은 소리이면 문장 속이어도 낸다(질문이 그 낱말을 기대한다)
    expect(
      hints("They swim in the see", {
        answer: "They swim in the sea.",
        targets: ["sea"],
        scene,
      }),
    ).toEqual([
      { heard: "see", expected: "sea", by: "homophone", from: "answer" },
    ]);
  });

  it("AC-15zi: 인사 · 맞장구 말도 한두 낱말 말이면 그 질문의 답 낱말과는 맞댄다('Too.' — 답 예시 'Two shells.')", () => {
    const two = { answer: "Two shells.", targets: ["two"] };
    expect(hints("Too", two)).toEqual([
      { heard: "too", expected: "two", by: "homophone", from: "answer" },
    ]);
    expect(hints("I like shells too", two)).toEqual([]);
  });

  it("AC-15zi: 아이 말 거르는 표: 인사 · 맞장구 말과 기능어이고, 내용 낱말은 아니다", () => {
    for (const w of ["hi", "Bye", "too", "right", "so", "yes", "to", "I"])
      expect(isChildFillerWord(w), w).toBe(true);
    for (const w of ["see", "sea", "beach", "two", "write", "high", "fish"])
      expect(isChildFillerWord(w), w).toBe(false);
  });

  it("AC-15zi: 막힘 무름(touchesScene): 'Me too.' · 'Hi!' · 'Right!' 은 같은 소리 장면 낱말에 닿지 않고, 글자 그대로 장면 낱말이면 닿는다", () => {
    expect(touchesScene("Me too.", new Set(["two"]), HOMOPHONES)).toBe(false);
    expect(touchesScene("Hi!", new Set(["high"]), HOMOPHONES)).toBe(false);
    expect(touchesScene("Right!", new Set(["write"]), HOMOPHONES)).toBe(false);
    expect(touchesScene("Right.", new Set(["right"]), HOMOPHONES)).toBe(true);
    expect(touchesScene("See.", new Set(["sea"]), HOMOPHONES)).toBe(true);
    // 인사말이 장면 낱말의 같은 소리라는 까닭만으로 AI 의 막힘 판단을 무르지 않는다
    expect(
      effectiveStuckOf({
        aiStuck: true,
        childKind: "unrelated_words",
        child: "Hi!",
        input: "speech",
        sceneWords: new Set(["high"]),
        homophones: HOMOPHONES,
      }),
    ).toBe(true);
  });

  it("AC-15zi: 먼저 답한 필수 질문: 'I like shells too.' 는 two 를 노리는 질문(답 예시 'Two shells.')의 답으로 세지 않는다(M-2)", () => {
    const of = (line: string) =>
      childAnsweredRequiredOf({
        required: [{ no: 3, targets: ["two"], answerExample: "Two shells." }],
        childLines: [line],
        lemmaOf: (w) => (w.toLowerCase() === "shells" ? "shell" : undefined),
        homophones: HOMOPHONES,
      });
    expect(of("I like shells too.")).toEqual([]);
    expect(of("Me too.")).toEqual([]);
    expect(of("Two shells.")).toEqual([3]);
  });

  it("AC-15zi: 고정부 Heard hint 줄: 귀띔 낱말은 아이 말을 그 낱말로 받았을 때만 self_used_words 에 넣는다(1~3단계만)", () => {
    const three = talkLessonSystem(lessonInput(3), lessonRules(3));
    const four = talkLessonSystem(lessonInput(4), lessonRules(4));
    const line =
      "Put a hinted word in self_used_words only when you took the child's words as that word in this turn";
    expect(three).toContain(line);
    expect(three).toContain(
      "A greeting or an agreeing word (e.g. 'Hi', 'Me too', 'Right!') is never a unit word.",
    );
    expect(four).not.toContain(line);
  });
});

describe("I-1 답 틀 — 답 예시와 틀이 같다는 것만으로는 귀띔을 내지 않는다(13절 'C203 (1) · C217 보완 3')", () => {
  it("AC-15zi: 반대 사례 대본의 세 말('I can run' · 'No, I like rice.' · 'I like dolphins')과 'I can see' 에 답 예시 낱말 귀띔이 없다(실제 목록 · 실제 단원 단어)", () => {
    const scene = unitWords(3, 1);
    expect(hints("I can run", { answer: "Yes, I can swim.", scene })).toEqual(
      [],
    );
    expect(
      hints("No, I like rice.", { answer: "Yes, I like fish.", scene }),
    ).toEqual([]);
    expect(
      hints("I like dolphins", { answer: "Yes, I like whales.", scene }),
    ).toEqual([]);
    expect(hints("I can see", { answer: "Yes, I can swim.", scene })).toEqual(
      [],
    );
    expect(hints("Yes I can see", { answer: "Yes, I can swim." })).toEqual([]);
    expect(hints("I am happy", { answer: "I am hungry." })).toEqual([]);
  });

  it("AC-15zi: 실제 수업에서 소리로 닿던 다섯 자리의 귀띔은 그대로다('See' 둘 · 'See See' → sea, 'Teach' · 'Each shells' → beach)", () => {
    const scene = unitWords(3, 1);
    const sea = { answer: "They swim in the sea.", targets: ["sea"], scene };
    expect(hints("See", sea)).toEqual([
      { heard: "see", expected: "sea", by: "homophone", from: "answer" },
    ]);
    expect(hints("See See", sea)).toEqual([
      { heard: "see", expected: "sea", by: "homophone", from: "answer" },
    ]);
    expect(
      hints("Teach", {
        answer: "We play at the beach.",
        targets: ["beach"],
        scene,
      }),
    ).toEqual([
      { heard: "teach", expected: "beach", by: "sound", from: "answer" },
    ]);
    expect(
      hints("Each shells", { answer: "I see big shells.", scene }),
    ).toEqual([
      { heard: "each", expected: "beach", by: "sound", from: "scene" },
    ]);
  });
});

describe("M-3 소리 귀띔 — 문장 속에서 그대로 장면 낱말인 들은 낱말 · 겹친 가까운 낱말(C217 보완)", () => {
  /** watch 가 wash 의 가까운 낱말로 적힌 견본 목록(실제 목록에서는 뺐다 — 같은 단원의 단원 단어). */
  const sample: SoundAlikeEntry[] = [
    { word: "wash", alikes: ["wish", "watch"] },
  ];
  const wash = {
    answer: "I wash my feet.",
    targets: ["wash"],
    scene: ["wash", "watch", "sea", "beach"],
  };

  it("AC-15zi: 'I watch TV at home.' 에 wash 귀띔이 없다 — 문장 속에서 들은 낱말이 그대로 단원 단어이면 소리 귀띔을 내지 않는다", () => {
    expect(hints("I watch TV at home.", wash, { soundAlikes: sample })).toEqual(
      [],
    );
    // 단원 단어가 아닌 들은 낱말은 문장 속이어도 그 질문의 답 낱말과 맞댄다('I wish my feet.')
    expect(hints("I wish my feet", wash, { soundAlikes: sample })).toEqual([
      { heard: "wish", expected: "wash", by: "sound", from: "answer" },
    ]);
    // 한두 낱말 말은 지금처럼 맞댄다
    expect(hints("Wish", wash, { soundAlikes: sample })).toEqual([
      { heard: "wish", expected: "wash", by: "sound", from: "answer" },
    ]);
  });

  it("AC-15zi: 실제 목록: 'Each shells' 는 beach 귀띔이고(eat 이 아님), 가까운 낱말은 같은 소리 표제어에도 닿는다(seat → see · sea)", () => {
    const scene = unitWords(3, 1);
    expect(
      hints("Each shells", {
        answer: "I see big shells.",
        scene,
      }),
    ).toEqual([
      { heard: "each", expected: "beach", by: "sound", from: "scene" },
    ]);
    expect(hints("Seat", { answer: "It is in the sea." })).toEqual([
      { heard: "seat", expected: "sea", by: "sound", from: "answer" },
    ]);
    expect(hints("Seat", { answer: "I see a fish." })).toEqual([
      { heard: "seat", expected: "see", by: "sound", from: "answer" },
    ]);
    // 실제 목록에서 wash ↔ watch 를 뺐다(둘 다 그 단원의 단원 단어)
    expect(hints("Watch", wash)).toEqual([]);
  });

  it("AC-15zi: 검증기: 표제어와 같은 단원의 단원 단어인 가까운 낱말은 막고, 표제어 둘에 겹친 가까운 낱말은 알린다", () => {
    const lexicon = buildLexicon([
      { word: "wash", pos: ["verb"], level: 3, forms: ["washes"] },
      { word: "watch", pos: ["verb"], level: 3, forms: ["watches"] },
      { word: "eat", pos: ["verb"], level: 1, forms: ["eats", "ate"] },
      { word: "beach", pos: ["noun"], level: 3, forms: ["beaches"] },
    ]);
    const check = (words: SoundAlikeEntry[]) =>
      checkTalkLists(
        {
          soundAlikes: {
            words: words.map((w) => ({ ...w, alikes: [...w.alikes] })),
          },
          homophones: { groups: [["see", "sea"]] },
        },
        {
          lexicon,
          maxWordsAt: () => undefined,
          talkUnitWords: [
            ["eat", "wash", "watch", "beach"],
            ["watch", "run"],
          ],
        },
      ).filter((i) => i.rule === "sound-alikes");
    const same = check([{ word: "wash", alikes: ["wish", "watch"] }]);
    expect(same.map((i) => [i.path, i.severity])).toEqual([
      ["words.0.alikes.1", "error"],
    ]);
    expect(same[0]?.message).toContain("같은 단원의 단원 단어");
    const twice = check([
      { word: "eat", alikes: ["heat", "each"] },
      { word: "beach", alikes: ["teach", "each"] },
    ]);
    expect(twice.map((i) => [i.path, i.severity])).toEqual([
      ["words.1.alikes.1", "warning"],
    ]);
    expect(twice[0]?.message).toContain("eat");
    expect(check([{ word: "beach", alikes: ["teach", "each"] }])).toEqual([]);
  });

  it("AC-15zi: 실제 시드 목록에는 같은 단원의 단원 단어인 가까운 낱말도, 표제어 둘에 겹친 가까운 낱말도 없다", () => {
    expect(
      checkTalkLists(
        {
          soundAlikes: { words: ALIKES.map((w) => ({ ...w })) },
          homophones: { groups: HOMOPHONES.map((g) => [...g]) },
        },
        {
          maxWordsAt: () => undefined,
          talkUnitWords: UNITS.map((u) => u.words),
        },
      ).filter((i) => i.rule === "sound-alikes"),
    ).toEqual([]);
    const of = (word: string) =>
      ALIKES.find((w) => w.word === word)?.alikes ?? [];
    expect(of("beach")).toContain("each");
    expect(of("eat")).not.toContain("each");
    expect(of("wash")).not.toContain("watch");
    expect(of("watch")).not.toContain("wash");
  });
});

describe("M-1 · M-8 질문 다시 쓰기 — 쉬운 질문 자리의 메시지 · 까닭 기록", () => {
  const ctx = { sentenceMaxWords: 8, targets: ["sea"], childWords: ["fish"] };

  it("AC-15zj: 쉬운 질문 자리(받침 둘째의 AI 질문)에서는 걸린 까닭이 길이 · 범위 밖 낱말이어도 예 · 아니요 질문으로 다시 쓰게 하고 'wh 질문을 먼저' 줄을 넣지 않는다", () => {
    for (const reason of ["too_long", "offband", "echo", "not_easy"] as const) {
      const note = questionRetryNoteOf(
        { question: "Where do the big whales swim today?", reason, words: [] },
        { ...ctx, easySlot: true },
      );
      expect(note, reason).toContain("write only one easy yes-or-no question");
      expect(note, reason).not.toContain(
        "Prefer a what, who or where question",
      );
    }
    // 그 자리가 아니면 지금처럼 까닭으로 고른다
    const plain = questionRetryNoteOf(
      {
        question: "Where do the big whales swim today?",
        reason: "too_long",
        words: [],
      },
      ctx,
    );
    expect(plain).toContain("write only one new question");
    expect(plain).toContain("Prefer a what, who or where question");
  });

  it("AC-15zj: 다시 쓰기 호출의 기록 표지에 까닭이 남는다(question_retry.<까닭> — ai_calls error_code)", () => {
    expect(questionRetryTagOf("chain")).toBe("question_retry.chain");
    expect(questionRetryTagOf("not_easy")).toBe("question_retry.not_easy");
    expect(questionRetryTagOf("stuck_overridden")).toBe(
      "question_retry.stuck_overridden",
    );
    expect(taggedErrorCode(null, questionRetryTagOf("chain"))).toBe(
      "question_retry.chain",
    );
    expect(taggedErrorCode("timeout", questionRetryTagOf("target_word"))).toBe(
      "question_retry.target_word:timeout",
    );
  });
});

describe("자리 재현에서 본 앱 결함 (가) — 카드 자리의 카드 줄에서 선생님 말에 이미 든 장면 문장을 뺀다", () => {
  const line = {
    en: "Sand on your feet! What do you do in the sea?",
    ko: "발에 모래가 묻었네! 바다에서 뭘 해?",
  };

  it("AC-15zj: 선생님 말에 카드 줄의 장면 문장이 이미 있으면 질문 문장만 붙인다(뜻도 같은 문장만)", () => {
    expect(
      cardLineWithoutSaidOf(
        ["Yes, they swim in the sea!", "Sand on your feet!"],
        line,
      ),
    ).toEqual({ en: "What do you do in the sea?", ko: "바다에서 뭘 해?" });
    // 대소문자 · 문장 부호가 달라도 같은 문장이다
    expect(cardLineWithoutSaidOf(["Oh! sand on your feet."], line).en).toBe(
      "What do you do in the sea?",
    );
    // 뜻이 없는 줄은 뜻 칸을 만들지 않는다
    expect(
      cardLineWithoutSaidOf(["Sand on your feet!"], { en: line.en }),
    ).toEqual({ en: "What do you do in the sea?" });
  });

  it("AC-15zj: 선생님 말에 없는 장면 문장 · 한 문장 줄 · 질문 문장은 그대로 둔다", () => {
    expect(cardLineWithoutSaidOf(["Yes, in the sea!"], line)).toEqual(line);
    expect(
      cardLineWithoutSaidOf(["Where do you play?"], {
        en: "Where do you play?",
      }),
    ).toEqual({ en: "Where do you play?" });
    // 장면 문장의 낱말 일부만 든 말은 같은 문장이 아니다
    expect(cardLineWithoutSaidOf(["Sand!", "Your feet!"], line)).toEqual(line);
    // 질문 문장은 선생님 말에 있어도 이 함수가 빼지 않는다(줄 전체가 겹치면 겹침 없애기가 줄을 뺀다)
    expect(cardLineWithoutSaidOf(["What do you do in the sea?"], line)).toEqual(
      line,
    );
  });

  it("AC-15zj: 뜻의 문장 수가 영어와 다르면 뜻은 그대로 둔다(문장을 맞출 수 없다)", () => {
    expect(
      cardLineWithoutSaidOf(["Sand on your feet!"], {
        en: line.en,
        ko: "발에 모래가 묻었는데 바다에서 뭘 해?",
      }),
    ).toEqual({
      en: "What do you do in the sea?",
      ko: "발에 모래가 묻었는데 바다에서 뭘 해?",
    });
  });
});

describe("자리 재현에서 본 앱 결함 (나) — 받침 둘째의 AI 질문 뒤 '아이가 답하던 자리'", () => {
  const argsOf = (turns: TalkLessonTurn[]): LessonArgs => ({
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: LOW,
    prepWords: CARD3.prep ?? [],
  });
  /** 필수 1 에 답한 뒤 AI 질문('What is fun?')에서 두 번 막혀 선생님이 쉬운 질문을 쓴 대화. */
  const easyAsked = (): TalkLessonTurn[] => [
    ...opening3(),
    said(),
    aiTurn("Oh, nice! What is fun?", { next: "follow_up" }, "Soccer is fun."),
    button(),
    teacher("That's okay!", {
      kind: "card_slot",
      why: "support",
      stage: TALK_SUPPORT_STAGE_TOGETHER,
      cause: "button",
    }),
    button(),
    aiTurn(
      "Okay! Do you play on Sunday?",
      {
        next: "follow_up",
        stage: TALK_SUPPORT_STAGE_EASY,
        cause: "button",
        words: ["sunday"],
      },
      "Yes, I play on Sunday.",
    ),
  ];

  it("AC-15zj: 자리의 답은 처음 질문 것 그대로이고, 선생님이 쓴 쉬운 질문의 답 예시 · 노리는 단어를 따로 둔다", () => {
    const slot = talkLessonPositionOf(argsOf(easyAsked())).slot;
    expect(slot?.question).toBe("Do you play on Sunday?");
    // 받침 줄 · 닫는 답 소리는 처음 질문의 답을 그대로 쓴다
    expect(slot?.answerExample).toBe("Soccer is fun.");
    expect(slot?.easyAsked).toEqual({
      answerExample: "Yes, I play on Sunday.",
      words: ["sunday"],
    });
    // 받침 첫째(카드 자리 — 질문 없음)는 따로 두지 않는다
    const first = talkLessonPositionOf(argsOf(easyAsked().slice(0, -2))).slot;
    expect(first?.easyAsked).toBeUndefined();
  });

  it("AC-15zi: 귀띔 재료: 받침 둘째의 AI 질문에 답한 말은 그 질문의 답 예시 · 노리는 단어와 맞댄다('Sundae' → sunday)", () => {
    const turns = easyAsked();
    const lite = child();
    const wiring = talkTurnWiringOf({
      low: true,
      args: argsOf(turns),
      lite,
      childText: "Sundae",
      rows: [],
      card: VIEW_CARD3,
      lemmaOf: () => undefined,
      homophones: [["sunday", "sundae"]],
      soundAlikes: [],
    });
    expect(wiring.answeredSlot?.question).toBe("Do you play on Sunday?");
    expect(wiring.heardOf([])).toMatchObject({
      answer: "Yes, I play on Sunday.",
      targets: ["sunday"],
    });
    // 보통 자리(받침 없는 AI 질문)는 그 자리의 답 예시 그대로다
    const plain = talkTurnWiringOf({
      low: true,
      args: argsOf(turns.slice(0, 8)),
      lite,
      childText: "Soccer",
      rows: [],
      card: VIEW_CARD3,
      lemmaOf: () => undefined,
      homophones: [],
      soundAlikes: [],
    });
    expect(plain.heardOf([])).toMatchObject({
      answer: "Soccer is fun.",
      targets: [],
    });
  });
});

describe("I-3 서버 (6) 배선의 재료 조립 — 서버 · 대본 도구 · 짝 시험이 같은 함수를 부른다", () => {
  const turns = [...opening3()];
  const args: LessonArgs = {
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: LOW,
    prepWords: CARD3.prep ?? [],
  };
  const base = {
    args,
    lite: child(),
    rows: [],
    card: VIEW_CARD3,
    lemmaOf: () => undefined,
    homophones: [["sunday", "sundae"]],
    soundAlikes: [{ word: "play", alikes: ["pray"] }],
  };

  it("AC-15zi: 1~3단계: 동음이의어 묶음 · 먼저 답한 필수 질문 · 차례 계획 둘 · 답하던 질문 자리 · 귀띔 재료 · 호출 입력의 묶음을 한 번에 낸다", () => {
    const w = talkTurnWiringOf({ ...base, low: true, childText: "Pray" });
    expect(w.homophones).toEqual([["sunday", "sundae"]]);
    expect(w.callInput).toEqual({ homophones: [["sunday", "sundae"]] });
    expect(w.plans.ifAnswered.callsAi).toBe(true);
    expect(w.plans.ifStuck).not.toBeNull();
    expect(w.answeredSlot?.question).toBe("What do you do on the weekend?");
    const heard = w.heardOf(["sunday", "weekend", "zebra"]);
    expect(heard?.targets).toEqual(["play"]);
    expect(heard?.homophones).toEqual([["sunday", "sundae"]]);
    expect(heard?.soundAlikes).toEqual([{ word: "play", alikes: ["pray"] }]);
    // 오늘 장면 낱말: 넘긴 단원 단어와 카드 내용 낱말
    expect([...(heard?.scene ?? [])]).toEqual(
      expect.arrayContaining(["zebra", "soccer"]),
    );
    expect(w.args.childAnswered).toEqual([]);
  });

  it("AC-15zi: 4단계부터: 묶음 · 귀띔 재료 · 먼저 답한 필수 질문을 넣지 않는다(고치기 전 그대로)", () => {
    const w = talkTurnWiringOf({
      ...base,
      args: { ...args, spec: SPEC4, settings: MID },
      low: false,
      childText: "Pray",
    });
    expect(w.homophones).toEqual([]);
    expect(w.callInput).toEqual({});
    expect(w.heardOf(["sunday"])).toBeUndefined();
    expect(w.answeredSlot).toBeNull();
    expect(w.args.childAnswered).toBeUndefined();
  });

  it("AC-15zi: '잘 모르겠어요' 차례는 막힘 계획이 없고 아이 말이 없다(귀띔 재료는 있으나 말 입력이 아니라 줄이 생기지 않는다)", () => {
    const w = talkTurnWiringOf({
      ...base,
      low: true,
      lite: button(),
      childText: null,
    });
    expect(w.plans.ifStuck).toBeNull();
    expect(w.plans.ifAnswered.callsAi).toBe(true);
  });

  it("AC-15zi: 서버 · 도구 원본은 재료를 이 함수로 조립한다(따로 옮겨 적은 사본이 없다)", () => {
    const src = (path: string) => readFileSync(join(REPO, path), "utf8");
    for (const path of [
      "src/server/conversation/lesson-turn.ts",
      "scripts/talk-observe.ts",
      "tests/unit/talk-observe-parity.test.ts",
    ]) {
      const text = src(path);
      expect(text, path).toContain("talkTurnWiringOf(");
      // 귀띔 재료 칸을 손으로 다시 조립하지 않는다
      expect(text, path).not.toMatch(/answer: answeredSlot\?\.answerExample/);
    }
  });
});

describe("이음새 · 말씨 다듬기 — 카드 글이 선생님 맥락에 새지 않게 · 바로 앞 선생님 말의 첫 낱말(C217 보완)", () => {
  const flowArgs = (turns: TalkLessonTurn[]): LessonArgs => ({
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: LOW,
    prepWords: CARD3.prep ?? [],
  });
  const callOf = (turns: TalkLessonTurn[], lite = child()) => {
    const w = talkTurnWiringOf({
      low: true,
      args: flowArgs(turns),
      lite,
      childText: lite.input === "speech" ? "Soccer" : null,
      rows: [],
      card: VIEW_CARD3,
      lemmaOf: () => undefined,
      homophones: [],
      soundAlikes: [],
    });
    return talkCallTurnOf({
      plan: w.plans.ifAnswered,
      ifStuck: w.plans.ifStuck,
      child: lite.input === "speech" ? "Soccer" : "",
      input: lite.input,
      hintKind: "none",
      hintTier: 0,
      heardHelp: "none",
      heard: w.heardOf([]),
      lastStart: w.lastStart,
    });
  };

  it("AC-15zj: 사용자 메시지: 1~3단계 카드 항목 줄(Card line · If stuck, Card line)은 글을 싣지 않고 항목 번호만 알린다 — 앱이 붙이는 줄이다", () => {
    // 필수 1 자리에서 '잘 모르겠어요' 둘째: 카드 쉬운 질문을 붙이는 카드 자리
    const easy = callOf(
      [
        ...opening3(),
        button(),
        teacher("That's okay!", {
          kind: "card_slot",
          why: "support",
          stage: TALK_SUPPORT_STAGE_TOGETHER,
          cause: "button",
          item: { kind: "required", no: 1 },
          words: ["play"],
        }),
      ],
      button(),
    );
    expect(easy.cardLine).toMatchObject({ role: "easy", hidden: true });
    const message = talkLessonUserMessage(easy);
    expect(message).toContain(
      "Card line: easy question for required 1 (the app adds it; do not write it)",
    );
    expect(message).not.toContain(easy.cardLine?.en ?? "?");
    // 글이 실린 줄(4단계부터 · 숨김 표지 없는 줄)은 고치기 전 그대로다
    const shown = talkLessonUserMessage({
      ...easy,
      cardLine: {
        role: "card",
        kind: "required",
        no: 2,
        en: "What sport is fun?",
      },
    });
    expect(shown).toContain("Card line: required 2: What sport is fun?");
    const hiddenCard = talkLessonUserMessage({
      ...easy,
      cardLine: {
        role: "card",
        kind: "required",
        no: 2,
        en: "What sport is fun?",
        hidden: true,
      },
    });
    expect(hiddenCard).toContain(
      "Card line: required 2 (the app adds this card question; do not write it)",
    );
    expect(hiddenCard).not.toContain("What sport is fun?");
  });

  it("AC-15zj: 사용자 메시지: 1~3단계 카드 답 바로 뒤 AI 차례에는 필수 질문 기회 줄 대신 '이번 차례에는 아이 답에 이어 묻기'를 알린다(남은 기회 셈은 그대로)", () => {
    // 필수 1(카드 기회)에 말로 답한 바로 뒤
    const after = callOf([...opening3()]);
    expect(after.afterCardChance).toBe(true);
    expect(after.holdChances).toBe(true);
    expect(after.chances.required.length).toBeGreaterThan(0);
    const message = talkLessonUserMessage(after);
    expect(message).toContain(
      "Chances, required questions: (not in this turn: follow up on the child's answer first)",
    );
    expect(message).toContain("Previous turn was a card chance: yes");
    // 카드 기회가 아닌 AI 질문에 답한 뒤에는 기회 줄 그대로다
    const plain = callOf([
      ...opening3(),
      said(),
      aiTurn("Oh, nice! What is fun?", { next: "follow_up" }, "It is fun."),
    ]);
    expect(plain.afterCardChance).toBe(false);
    expect(plain.holdChances).toBeUndefined();
    expect(talkLessonUserMessage(plain)).toMatch(
      /Chances, required questions: \d+ \(aims at: /,
    );
    // 4단계부터는 줄을 바꾸지 않는다
    expect(
      talkLessonUserMessage({
        ...lessonInput(4).turn,
        afterCardChance: true,
      }),
    ).not.toContain("not in this turn");
  });

  it("AC-15zj: 고정부에 '질문에 제가 말한 단원 단어는 next_targets 에 적지 않는다' 줄이 없다 — 선생님이 먼저 말하는 단원 단어는 계속 질문 검사에 걸린다(13절 'C203 (1) · C217 보완 3' (1))", () => {
    // fix 1 이 더했던 줄: 선생님이 제 질문에 말한 단원 단어를 칸에서 빼게 해 질문 검사를 지나게 했다(코드 검토 rev-content-1 fix 1 재검토 N-1)
    for (const level of [3, 4]) {
      const system = talkLessonSystem(lessonInput(level), lessonRules(level));
      expect(system).not.toContain("is not a target");
      expect(system).not.toContain("leave it out of next_targets");
      expect(system).not.toContain("next_targets has only");
    }
    // 노리는 낱말은 아이가 말해야 한다는 줄(13절 C217 (2) (ㄱ))은 그대로다
    expect(talkLessonSystem(lessonInput(3), lessonRules(3))).toContain(
      "The word a chance aims at must come from the child, so your question never has it.",
    );
  });

  it("AC-15zk: 바로 앞 선생님 말의 첫 낱말: AI 가 반응을 쓴 마지막 선생님 행의 첫 낱말이고, 앱이 붙인 대화 첫 질문 행은 건너뛴다", () => {
    // 인사 끝 반응('Me too! …') 뒤 앱의 대화 첫 질문 → 아이 답
    expect(talkLastStartOf(opening3())).toBe("Me");
    expect(
      talkLastStartOf([
        ...opening3(),
        said(),
        aiTurn("Oh, nice! What is fun?", { next: "follow_up" }),
      ]),
    ).toBe("Oh");
    expect(
      talkLastStartOf([
        ...opening3(),
        button(),
        teacher("That's okay!", {
          kind: "card_slot",
          why: "support",
          stage: TALK_SUPPORT_STAGE_TOGETHER,
          cause: "button",
        }),
      ]),
    ).toBe("That's");
    expect(talkLastStartOf([])).toBeUndefined();
    expect(callOf([...opening3()]).lastStart).toBe("Me");
  });

  it("AC-15zk: 사용자 메시지: 1~3단계 AI 차례에 바로 앞 선생님 말의 첫 낱말을 알린다(같은 낱말로 연달아 시작하지 않게)", () => {
    const turn = lessonInput(3).turn;
    const message = talkLessonUserMessage({ ...turn, lastStart: "Oh" });
    expect(message).toContain(
      "Your last turn started with: 'Oh' (start this turn with another word)",
    );
    expect(talkLessonUserMessage(turn)).not.toContain(
      "Your last turn started with",
    );
  });
});
