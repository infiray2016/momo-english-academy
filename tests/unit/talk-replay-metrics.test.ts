// 실제 입력 지표 넷(talk-replay-metrics — 13절 C217 (4) · AC-15zl): 요청자 iPad 수업(2026-11-08)의 차례를 표본으로 옮겨 못 알아들음 ·
// 같은 꼴 반응 · 도움 차례 비율 · 카드 글 그대로 붙임의 분자 · 분모가 분석 보고(task-ana-lesson-content-report.md 2.1 · 3.2)의 손셈과
// 같은지 본다. 카드 글은 살아 있는 시드를 읽지 않고 이 파일의 고정 표본을 쓴다(카드가 개정돼도 셈의 증명이 흔들리지 않게).
import { describe, expect, it } from "vitest";
import type { TalkLessonOutput } from "@/core/ai/calls/talk-lesson";
import {
  kitOf,
  loadMetricsSeed,
  metricsFilesOf,
} from "../../scripts/talk-metrics";
import {
  ANCHORED_NOTICE,
  CHILD_DONT_KNOW_TEXT,
  CHILD_NOSPEECH_TEXT,
  JUDGE_KEYS,
  REPLAY_NOTICE,
  type RunReport,
  type TurnRecord,
} from "../../scripts/talk-observe";
import {
  addReplayTally,
  cardLinesOf,
  emptyReplayTally,
  firstWordsText,
  fractionText,
  heardHintLineOf,
  heardVerdictOf,
  type ReplayKit,
  replayJson,
  replayMarkdown,
  replayMetricsOf,
  replayTurnsOf,
  replayValueTexts,
  spotKeyOf,
  tallyReplay,
} from "../../scripts/talk-replay-metrics";

/** 다지기 6 카드(개정 5)의 필수 질문 · 더 이야기할 거리 글 표본. */
const CARD = {
  required: [
    { no: 1, en: "Sandwiches for lunch! What do you do on the mountain?" },
    { no: 2, en: "Whales and dolphins! Where do they swim?" },
    { no: 3, en: "Sand on your feet! What do you do in the sea?" },
    { no: 4, en: "Sand and shells! Where do you play?" },
    { no: 5, en: "It is hot at the beach. What do you do with cold juice?" },
    { no: 6, en: "Up, up, to the top! Where are you?" },
  ],
  more: [{ no: 1, en: "Bags in the car! What do you do with your family?" }],
} as unknown as Parameters<typeof cardLinesOf>[0];

const LEMMAS: Readonly<Record<string, string>> = {
  swims: "swim",
  swimming: "swim",
  beaches: "beach",
};
const KIT: ReplayKit = {
  cardLines: cardLinesOf(CARD),
  lemmaOf: (word) => LEMMAS[word.toLowerCase()],
};

type TurnOver = Partial<Omit<TurnRecord, "move">> & {
  move?: Partial<TurnRecord["move"]>;
};

/** 보고 한 줄(빈 값이 기본 — 말로 답한 대화 토막 AI 차례). */
function turn(no: number, over: TurnOver = {}): TurnRecord {
  const { move, ...rest } = over;
  const teacher = over.teacher ?? "";
  return {
    no,
    child: "Fish",
    segment: "talk",
    plan: "ai · 질문",
    teacher,
    attach: [],
    toriKo: null,
    sound: {},
    recast: "",
    explanation: "",
    replaced: null,
    dropped: [],
    returned: null,
    sameQuestion: null,
    judge: Object.fromEntries(
      JUDGE_KEYS.map((k) => [k, { expect: null, auto: null }]),
    ) as TurnRecord["judge"],
    recastCheck: null,
    usage: null,
    failure: null,
    flags: [],
    techError: null,
    design: null,
    output: { tori_en: teacher } as unknown as TalkLessonOutput,
    userMessage: "",
    appAfter: [],
    childKind: "answer",
    stuck: { ai: false, app: false, overridden: false },
    reask: null,
    ...rest,
    move: {
      kind: "ai",
      next: "follow_up",
      why: null,
      item: { kind: "none", no: 0 },
      app: [],
      stage: 0,
      ...move,
    },
  };
}

const SEA = { word: "sea", heardAs: ["see"] };
const BEACH_TEACH = { word: "beach", heardAs: ["teach"] };
const support = (stage: number, answer?: string): TurnOver => ({
  move: { kind: "card_slot", next: "none", why: "support", stage },
  ...(answer !== undefined ? { sound: { answer } } : {}),
});

/** 요청자 iPad 수업(2026-11-08, 세션 5fa29d9f)의 아이 차례 23 과 그때의 선생님 말(분석 보고 2.1 표). */
const LESSON: TurnRecord[] = [
  turn(1, {
    child: "I'm fine",
    segment: "greeting_end",
    teacher: "Good to hear! Let's start!",
    appAfter: ["Hot sun and cool water! Can you swim?"],
    lessonBefore: "Hi, {NAME}! How are you?",
  }),
  turn(2, {
    child: "I can see",
    teacher: "Oh, you can see! What do you see in the water?",
    meant: { word: "swim", heardAs: ["see"] },
    lessonBefore: "Hot sun and cool water! Can you swim?",
  }),
  turn(3, {
    child: CHILD_DONT_KNOW_TEXT,
    teacher: "No problem! Let's try together.",
    ...support(1, "I see a fish."),
    lessonBefore: "Oh, you can see! What do you see in the water?",
  }),
  turn(4, {
    child: "Fish",
    teacher: "Yes, you see a fish! Where is the fish?",
    lessonBefore: "No problem! Let's try together. 〈I see a fish.〉",
  }),
  turn(5, {
    child: "See",
    teacher: "Yes, you see the fish! Is it big or small?",
    meant: SEA,
    lessonBefore: "Yes, you see a fish! Where is the fish?",
  }),
  turn(6, {
    child: "Tomorrow",
    teacher: "That's okay!",
    ...support(1, "It is big."),
    stuck: { ai: true, app: true, overridden: false },
    lessonBefore: "Yes, you see the fish! Is it big or small?",
  }),
  turn(7, {
    child: "Sure",
    teacher: "Okay! Here is a new one. Where do whales swim?",
    move: { kind: "ai", next: "required", stage: 2 },
    stuck: { ai: true, app: true, overridden: false },
    lessonBefore: "That's okay! 〈It is big.〉",
  }),
  turn(8, {
    child: "See",
    teacher: "Oh, you see!",
    attach: ["Sandwiches for lunch! What do you do on the mountain?"],
    move: { kind: "card_slot", next: "none", why: "question_check" },
    meant: SEA,
    lessonBefore: "Okay! Here is a new one. Where do whales swim?",
  }),
  turn(9, {
    child: "Eat",
    teacher: "Yum! You eat on the mountain! What do you eat?",
    lessonBefore:
      "Oh, you see! Sandwiches for lunch! What do you do on the mountain?",
  }),
  turn(10, {
    child: CHILD_DONT_KNOW_TEXT,
    teacher: "It's okay! I am with you.",
    ...support(1, "I eat sandwiches."),
    lessonBefore: "Yum! You eat on the mountain! What do you eat?",
  }),
  turn(11, {
    child: "Apple",
    teacher: "Yum, apples! You eat an apple! Who is with you?",
    lessonBefore: "It's okay! I am with you. 〈I eat sandwiches.〉",
  }),
  turn(12, {
    child: "Family",
    teacher: "Nice, your family! Whales and dolphins! Where do they swim?",
    lessonBefore: "Yum, apples! You eat an apple! Who is with you?",
  }),
  turn(13, {
    child: "Yeah",
    teacher: "No problem! I can help.",
    ...support(1, "They swim in the sea."),
    stuck: { ai: true, app: true, overridden: false },
    lessonBefore: "Nice, your family! Whales and dolphins! Where do they swim?",
  }),
  turn(14, {
    child: "See See",
    teacher: "Yes, in the sea! Sand on your feet! What do you do in the sea?",
    meant: SEA,
    lessonBefore: "No problem! I can help. 〈They swim in the sea.〉",
  }),
  turn(15, {
    child: CHILD_DONT_KNOW_TEXT,
    teacher: "Okay! We can do this.",
    ...support(1, "I wash my feet."),
    lessonBefore:
      "Yes, in the sea! Sand on your feet! What do you do in the sea?",
  }),
  turn(16, {
    child: "I wash my feet",
    teacher: "Nice, you wash your feet! Is the water cold?",
    lessonBefore: "Okay! We can do this. 〈I wash my feet.〉",
  }),
  turn(17, {
    child: "Hot water",
    teacher: "Oh, hot water! Sand and shells! Where do you play?",
    lessonBefore: "Nice, you wash your feet! Is the water cold?",
  }),
  turn(18, {
    child: "Pad",
    teacher: "Oh, that's okay! I am with you.",
    ...support(1, "We play at the beach."),
    stuck: { ai: true, app: true, overridden: false },
    lessonBefore: "Oh, hot water! Sand and shells! Where do you play?",
  }),
  turn(19, {
    child: "Teach",
    teacher: "No problem! Here is an easy one.",
    attach: ["Do you like shells?"],
    ...support(2),
    stuck: { ai: true, app: true, overridden: false },
    meant: BEACH_TEACH,
    lessonBefore: "Oh, that's okay! I am with you. 〈We play at the beach.〉",
  }),
  turn(20, {
    child: "Beach",
    teacher: "Yes, the beach! You play at the beach! What shells do you see?",
    lessonBefore: "No problem! Here is an easy one. Do you like shells?",
  }),
  turn(21, {
    child: "Each shells",
    teacher:
      "Oh, many shells! It is hot at the beach. What do you do with cold juice?",
    meant: { word: "beach", heardAs: ["each"] },
    lessonBefore:
      "Yes, the beach! You play at the beach! What shells do you see?",
  }),
  turn(22, {
    child: "Drink",
    teacher: "Yes, you drink cold juice! What juice do you like?",
    lessonBefore:
      "Oh, many shells! It is hot at the beach. What do you do with cold juice?",
  }),
  turn(23, {
    child: "Strawberry",
    teacher: "Yum, strawberry! You like strawberry juice!",
    attach: ["Do you want to talk more?"],
    move: { kind: "closing_slot", next: "none" },
    lessonBefore: "Yes, you drink cold juice! What juice do you like?",
  }),
];

function runOf(
  turns: TurnRecord[],
  over: Partial<RunReport> = {},
  script: Partial<RunReport["script"]> = {},
): RunReport {
  return {
    script: {
      name: "replay-lesson-1108",
      title: "실제 수업 재생",
      level: 3,
      unit: 1,
      lesson: 6,
      teacher: "mina",
      replay: true,
      ...script,
    },
    model: "claude-sonnet-5-5",
    effort: "low",
    thinking: "disabled",
    round: 1,
    systemPrompt: "",
    overrides: [],
    summaries: [],
    turns,
    opening: ["Hi, {NAME}! How are you?"],
    stopped: null,
    ...over,
  };
}

const kitFor = () => KIT;

describe("재료", () => {
  it("AC-15zl: 카드 필수 질문 · 더 이야기할 거리 글을 장면 문장과 질문 문장으로 나눈다", () => {
    const lines = cardLinesOf(CARD);
    expect(lines.filter((l) => l.kind === "required" && l.no === 1)).toEqual([
      {
        kind: "required",
        no: 1,
        en: "Sandwiches for lunch!",
        key: "sandwiches for lunch",
        question: false,
      },
      {
        kind: "required",
        no: 1,
        en: "What do you do on the mountain?",
        key: "what do you do on the mountain",
        question: true,
      },
    ]);
    // 필수 6(문장 둘씩, 6번은 'Up, up, to the top!' 한 문장 + 질문) + 더 이야기할 거리 1(문장 둘)
    expect(lines).toHaveLength(14);
    expect(lines.filter((l) => l.kind === "more")).toHaveLength(2);
  });

  it("AC-15zl: 자리 열쇠는 마지막 질문, 질문이 없으면 소리 줄(〈 〉 · 보고의 소리 줄 칸), 그것도 없으면 글 전체다", () => {
    expect(spotKeyOf("Yes, you see a fish! Where is the fish?")).toBe(
      "where is the fish",
    );
    expect(spotKeyOf("That's okay! 〈It is big.〉")).toBe("it is big");
    expect(spotKeyOf("That's okay!", "It is big.")).toBe("it is big");
    expect(spotKeyOf("Good to hear!")).toBe("good to hear");
    // 질문이 있으면 소리 줄보다 질문이 자리다
    expect(spotKeyOf("Okay! 〈It is big.〉 Is it big?")).toBe("is it big");
  });
});

describe("(가) 못 알아들음", () => {
  it("AC-15zl: 기대 낱말이 선생님 말에 있으면 받음, 없고 잘못 들린 낱말이 있으면 되풀이, 둘 다 없으면 둘 다 없음이다", () => {
    expect(heardVerdictOf(KIT, ["Yes, in the sea!"], SEA)).toBe("taken");
    expect(
      heardVerdictOf(
        KIT,
        ["Yes, you see the fish!", "Is it big or small?"],
        SEA,
      ),
    ).toBe("echoed");
    expect(heardVerdictOf(KIT, ["That's okay!"], SEA)).toBe("neither");
    // 기대 낱말과 잘못 들린 낱말이 함께 있으면 받음이다
    expect(
      heardVerdictOf(KIT, ["Yes, the sea!", "What do you see?"], SEA),
    ).toBe("taken");
  });

  it("AC-15zl: 기대 낱말은 원형으로도 찾고, 카드 글 그대로인 문장은 빼고 본다", () => {
    expect(
      heardVerdictOf(KIT, ["Oh, you like swimming!"], {
        word: "swim",
        heardAs: ["see"],
      }),
    ).toBe("taken");
    // 'It is hot at the beach.' 는 카드 필수 5 의 장면 문장이라 beach 로 받은 것이 아니다
    expect(
      heardVerdictOf(
        KIT,
        [
          "Oh, many shells!",
          "It is hot at the beach.",
          "What do you do with cold juice?",
        ],
        { word: "beach", heardAs: ["each"] },
      ),
    ).toBe("neither");
  });

  it("AC-15zl: 실제 수업 표본은 주석 여섯 가운데 다섯을 기대 낱말로 받지 못했다(되풀이 3 · 둘 다 없음 2 · 막힘으로 셈 1)", () => {
    const rows = replayTurnsOf(runOf(LESSON), KIT);
    expect(
      rows.flatMap((r) => (r.heard ? [[r.no, r.heard.verdict]] : [])),
    ).toEqual([
      [2, "echoed"],
      [5, "echoed"],
      [8, "echoed"],
      [14, "taken"],
      [19, "neither"],
      [21, "neither"],
    ]);
    const t = tallyReplay(rows);
    expect(t.heard).toEqual({
      den: 6,
      taken: 1,
      echoed: 3,
      neither: 2,
      stuck: 1,
      sameSpot: { den: 6, taken: 1 },
    });
    expect(replayValueTexts(t).heard).toBe(
      "5/6 — 되풀이 3 · 둘 다 없음 2 · 막힘으로 셈 1",
    );
  });

  it("AC-15zl: 단추 · 들리지 않음 · 호출 실패 차례의 주석은 세지 않는다", () => {
    const rows = replayTurnsOf(
      runOf([
        turn(1, { child: CHILD_DONT_KNOW_TEXT, meant: SEA }),
        turn(2, { child: CHILD_NOSPEECH_TEXT, meant: SEA }),
        turn(3, {
          child: "See",
          meant: SEA,
          teacher: "Oh, you see!",
          techError: { nospeech: false, call: "failed" },
        }),
      ]),
      KIT,
    );
    expect(rows.map((r) => r.heard)).toEqual([null, null, null]);
    expect(tallyReplay(rows).heard.den).toBe(0);
    expect(replayValueTexts(tallyReplay(rows)).heard).toBe("주석 없음(0/0)");
  });
});

describe("(나) 같은 꼴 반응", () => {
  it("AC-15zl: 실제 수업 표본의 AI 반응 14 의 첫 낱말은 yes 5 · oh 4 · yum 3 · nice 2 이고 연달아 같은 첫 낱말은 2/13 이다", () => {
    const t = tallyReplay(replayTurnsOf(runOf(LESSON), KIT));
    expect(t.shape).toEqual({
      reactions: 14,
      firstWords: { oh: 4, yes: 5, yum: 3, nice: 2 },
      pairs: 13,
      same: 2,
      longest: 2,
    });
    expect(firstWordsText(t.shape.firstWords)).toBe(
      "yes 5 · oh 4 · yum 3 · nice 2",
    );
    expect(replayValueTexts(t).shape).toBe("2/13(15%) · 가장 긴 줄 2");
  });

  it("AC-15zl: 받침 차례 · 인사 끝 · 기술 오류 자리 · 앱이 넣은 상황 줄은 첫 낱말 셈에서 빠진다", () => {
    const rows = replayTurnsOf(
      runOf([
        turn(1, { segment: "greeting_end", teacher: "Good to hear!" }),
        turn(2, { teacher: "Yes, a fish! Is it big?" }),
        turn(3, { teacher: "That's okay!", ...support(1, "It is big.") }),
        turn(4, { teacher: "Yes, it is big! Do you like it?" }),
        turn(5, {
          teacher: "Yes! What is it?",
          techError: { nospeech: false, call: "failed" },
        }),
        // 반응 자리에 앱이 상황 줄을 넣었으면 그 뒤 AI 문장의 첫 낱말을 본다
        turn(6, {
          teacher: "Oh, okay! Nice, a cat! Is it small?",
          situationLines: ["Oh, okay!"],
        }),
        turn(7, { teacher: "Yes, small! Do you like cats?" }),
        turn(8, { teacher: "Yes, me too! What do you eat?" }),
      ]),
      KIT,
    );
    expect(rows.map((r) => r.firstWord)).toEqual([
      null,
      "yes",
      null,
      "yes",
      null,
      "nice",
      "yes",
      "yes",
    ]);
    // 사이의 받침 차례는 건너뛰고 이웃한 AI 반응을 견준다: yes-yes · yes-nice · nice-yes · yes-yes
    expect(tallyReplay(rows).shape).toEqual({
      reactions: 5,
      firstWords: { yes: 4, nice: 1 },
      pairs: 4,
      same: 2,
      longest: 2,
    });
  });
});

describe("(다) 도움 차례 비율 · (라) 카드 글 그대로 붙임", () => {
  it("AC-15zl: 실제 수업 표본은 대화 토막 선생님 차례 22 가운데 받침 8(단추 3 · 말했는데 막힘 5 · 받침 1 여섯 · 받침 2 둘)이다", () => {
    const t = tallyReplay(replayTurnsOf(runOf(LESSON), KIT));
    expect(t.support).toEqual({
      den: 22,
      num: 8,
      button: 3,
      speech: 5,
      stages: { "1": 6, "2": 2 },
    });
    expect(replayValueTexts(t).support).toBe(
      "8/22(36%) — 단추 3 · 말했는데 막힘 5 · 받침 1: 6 · 받침 2: 2",
    );
  });

  it("AC-15zl: 실제 수업 표본에서 카드 문장이 그대로 든 차례는 5/22(AI 글 4 · 앱이 붙임 1)이고 쉬운 질문 · 마무리 물음은 세지 않는다", () => {
    const rows = replayTurnsOf(runOf(LESSON), KIT);
    expect(
      rows.flatMap((r) =>
        r.cardHits.length > 0
          ? [[r.no, r.cardHits.map((h) => `${h.by}:${h.no}`).join(" ")]]
          : [],
      ),
    ).toEqual([
      [8, "app:1 app:1"],
      [12, "ai:2 ai:2"],
      [14, "ai:3 ai:3"],
      [17, "ai:4 ai:4"],
      [21, "ai:5 ai:5"],
    ]);
    const t = tallyReplay(rows);
    expect(t.card).toEqual({ den: 22, num: 5, ai: 4, app: 1 });
    expect(replayValueTexts(t).card).toBe("5/22(23%) — AI 글 4 · 앱이 붙임 1");
  });

  it("AC-15zl: 들리지 않음 차례는 (다) · (라)의 분자 · 분모에서 빠진다", () => {
    const t = tallyReplay(
      replayTurnsOf(
        runOf([
          turn(1, { teacher: "Yes! Where do you play?" }),
          turn(2, {
            child: CHILD_NOSPEECH_TEXT,
            teacher: "Oops! Sand and shells!",
            techError: { nospeech: true, call: null },
            move: { stage: 1 },
          }),
        ]),
        KIT,
      ),
    );
    expect(t.support).toMatchObject({ den: 1, num: 0 });
    expect(t.card).toEqual({ den: 1, num: 1, ai: 1, app: 0 });
  });
});

describe("고정 입력 재생의 어긋남", () => {
  it("AC-15zl: 실제 수업 그대로면 모든 차례가 같은 자리다(0/23)", () => {
    const rows = replayTurnsOf(runOf(LESSON), KIT);
    expect(rows.every((r) => r.sameSpot === true)).toBe(true);
    expect(tallyReplay(rows).drift).toEqual({ den: 23, num: 0 });
  });

  it("AC-15zl: 선생님 질문이 실제 수업과 달라진 뒤의 입력은 '다름'으로 적고, (가)는 같은 자리 차례만 따로 센다", () => {
    const changed = LESSON.map((t) =>
      t.no === 4
        ? { ...t, teacher: "Yes, a fish! What color is the fish?" }
        : t,
    );
    const rows = replayTurnsOf(runOf(changed), KIT);
    expect(rows.find((r) => r.no === 5)?.sameSpot).toBe(false);
    const t = tallyReplay(rows);
    expect(t.drift).toEqual({ den: 23, num: 1 });
    expect(t.heard.sameSpot).toEqual({ den: 5, taken: 1 });
    expect(replayValueTexts(t).heardSameSpot).toBe("4/5");
  });

  it("AC-15zl: lessonBefore 가 없는 대본은 어긋남을 세지 않는다", () => {
    const rows = replayTurnsOf(
      runOf([turn(1, { teacher: "Yes! Where do you play?" })]),
      KIT,
    );
    expect(rows[0]?.sameSpot).toBeNull();
    expect(replayValueTexts(tallyReplay(rows)).drift).toBe("—");
  });
});

describe("합계 · 글", () => {
  it("AC-15zl: 바퀴를 더하면 분자 · 분모 · 첫 낱말 분포가 더해지고 가장 긴 줄은 큰 쪽이다", () => {
    const one = tallyReplay(replayTurnsOf(runOf(LESSON), KIT));
    const two = addReplayTally(one, one);
    expect(two.runs).toBe(2);
    expect(two.heard.den).toBe(12);
    expect(two.shape).toMatchObject({
      reactions: 28,
      pairs: 26,
      same: 4,
      longest: 2,
    });
    expect(two.shape.firstWords.yes).toBe(10);
    expect(two.support.stages).toEqual({ "1": 12, "2": 4 });
    expect(addReplayTally(emptyReplayTally(), one)).toEqual(one);
  });

  it("AC-15zl: 분자 · 분모 글은 분모 10 부터 백분율을 붙인다", () => {
    expect(fractionText(0, 0)).toBe("0/0");
    expect(fractionText(5, 6)).toBe("5/6");
    expect(fractionText(8, 22)).toBe("8/22(36%)");
  });

  it("AC-15zl: 지표 절은 고정 입력 재생을 밝히고 지표 넷의 분자 · 분모와 차례별 선생님 말 표를 낸다", () => {
    const now = replayMetricsOf(
      [
        runOf(LESSON),
        runOf(
          [turn(1, { teacher: "Yes, rice! Do you like fish?" })],
          {},
          { name: "l3-word-answers", lesson: 1, replay: false },
        ),
      ],
      kitFor,
    );
    expect(now.scripts.map((s) => [s.name, s.replay])).toEqual([
      ["l3-word-answers", false],
      ["replay-lesson-1108", true],
    ]);
    const md = replayMarkdown(now, null);
    expect(md).toContain("## 실제 입력 지표 넷(13절 C217 (4) · AC-15zl)");
    expect(md).toContain(REPLAY_NOTICE);
    expect(md).toContain(
      "| (가) 못 알아들음: 기대 낱말로 받지 못한 차례 ÷ 기대 낱말 주석이 있는 말 차례 | 5/6 — 되풀이 3 · 둘 다 없음 2 · 막힘으로 셈 1 | — |",
    );
    expect(md).toContain("| replay-lesson-1108(고정 입력 재생) | 1 |");
    expect(md).toContain("| l3-word-answers | 1 | 주석 없음(0/0) |");
    // 차례별 표는 재생 대본만 낸다
    expect(md).toContain(
      "### 차례별 선생님 말: replay-lesson-1108 · 바퀴 1(고정 입력 재생)",
    );
    expect(md).not.toContain("### 차례별 선생님 말: l3-word-answers");
    expect(md).toContain(
      "| 19 | Oh, that's okay! I am with you. 〈We play at the beach.〉 | 같음 | Teach | beach ← teach | No problem! Here is an easy one. | Do you like shells? | — | 둘 다 없음 · 막힘으로 셈 | — | 받침 2(말) | — |",
    );
    expect(md).toContain(
      "| 8 | Okay! Here is a new one. Where do whales swim? | 같음 | See | sea ← see | Oh, you see! | Sandwiches for lunch! What do you do on the mountain? | — | 잘못 들린 낱말 되풀이 | oh | — | 앱이 붙임: Sandwiches for lunch! / 앱이 붙임: What do you do on the mountain? |",
    );
  });

  it("AC-15zl: 기준선이 있으면 합계 표의 기준선 칸에 같은 셈을 적고, JSON 에는 차례 재료를 보고 원문 없이 둔다", () => {
    const base = replayMetricsOf([runOf(LESSON)], kitFor);
    const better = LESSON.map((t) =>
      t.no === 5 ? { ...t, teacher: "Yes, in the sea! Is it big?" } : t,
    );
    const now = replayMetricsOf([runOf(better)], kitFor);
    const md = replayMarkdown(now, base);
    expect(md).toContain(
      "| 4/6 — 되풀이 2 · 둘 다 없음 2 · 막힘으로 셈 1 | 5/6 — 되풀이 3 · 둘 다 없음 2 · 막힘으로 셈 1 |",
    );
    const json = replayJson(now, base);
    expect(json.total.heard.taken).toBe(2);
    expect(json.baselineTotal?.heard.taken).toBe(1);
    expect(json.turns[0]).not.toHaveProperty("run");
    expect(json.turns[0]?.turns).toHaveLength(23);
  });

  it("AC-15zl: talk:metrics 의 표 · JSON 끝에 지표 넷이 붙는다(앞 지표는 그대로)", () => {
    const seed = loadMetricsSeed(process.cwd());
    const run = runOf(
      [
        turn(1, {
          child: "See",
          teacher: "Yes, you see! Do you like fish?",
          meant: SEA,
        }),
      ],
      {},
      { name: "l3-sample", lesson: 1, replay: false },
    );
    const files = metricsFilesOf({
      json: { date: "2026-11-10", effort: "settings", rounds: 1, runs: [run] },
      baseline: null,
      meta: {
        source: "report.json",
        date: "2026-11-10",
        effort: "settings",
        rounds: 1,
        baseline: null,
        chanceAlert: 0.5,
      },
      kitFor: (r) => kitOf(seed, r),
    });
    expect(files.markdown).toContain("# 회화 대본 지표(talk:metrics");
    expect(files.markdown).toContain(
      "## 실제 입력 지표 넷(13절 C217 (4) · AC-15zl)",
    );
    expect(files.markdown.indexOf("## 사람 판정")).toBeLessThan(
      files.markdown.indexOf("## 실제 입력 지표 넷"),
    );
    expect(files.metrics.replay.total.heard).toMatchObject({
      den: 1,
      echoed: 1,
    });
    expect(JSON.parse(files.json).replay.scripts[0].name).toBe("l3-sample");
    // 카드 재료(시드)가 지표 재료에 들어 있다
    expect(kitOf(seed, run)?.cardLines.length).toBeGreaterThan(0);
  });
});

describe("자리 재현(talk:observe --anchored)", () => {
  /** 자리 재현으로 받은 차례(앞 상태는 실제 수업 기록 — 서로 잇지 않은 응답). */
  const anchoredTurn = (
    no: number,
    over: TurnOver & { prev?: string | null; after?: string } = {},
  ) => {
    const { prev = null, after = "", ...rest } = over;
    return turn(no, {
      ...rest,
      anchored: { lessonAfter: after, prevFirstWord: prev, check: [] },
    });
  };
  const anchoredRun = (turns: TurnRecord[], over: Partial<RunReport> = {}) =>
    runOf(turns, { anchored: true, ...over });

  it("AC-15zl: 자리 재현 차례는 앞 새 응답과 관계없이 늘 같은 자리이고, (가)는 주석 자리 모두를 같은 자리로 센다", () => {
    const rows = replayTurnsOf(
      anchoredRun([
        anchoredTurn(5, {
          child: "See",
          teacher: "Yes, in the sea! Is the fish big?",
          meant: SEA,
          lessonBefore: "Yes, you see a fish! Where is the fish?",
        }),
        // 앞 새 응답('Is the fish big?')과 실제 수업의 앞 질문이 달라도 같은 자리다
        anchoredTurn(8, {
          child: "See",
          teacher: "Oh, you see! What do you see?",
          meant: SEA,
          lessonBefore: "Okay! Here is a new one. Where do whales swim?",
        }),
      ]),
      KIT,
    );
    expect(rows.map((r) => [r.anchored, r.sameSpot, r.before])).toEqual([
      [true, true, "Yes, you see a fish! Where is the fish?"],
      [true, true, "Okay! Here is a new one. Where do whales swim?"],
    ]);
    const t = tallyReplay(rows);
    expect(t.drift).toEqual({ den: 2, num: 0 });
    expect(t.heard.sameSpot).toEqual({ den: 2, taken: 1 });
    expect(replayValueTexts(t).heard).toBe(
      "1/2 — 되풀이 1 · 둘 다 없음 0 · 막힘으로 셈 0",
    );
  });

  it("AC-15zl: 자리 재현의 (나)는 새 응답의 첫 낱말을 기록의 앞 AI 반응 첫 낱말과 견준다(이웃한 새 응답과 견주지 않는다)", () => {
    const t = tallyReplay(
      replayTurnsOf(
        anchoredRun([
          anchoredTurn(2, { teacher: "Oh, nice! Do you swim?", prev: null }),
          anchoredTurn(4, { teacher: "Oh, a fish! Is it big?", prev: "yes" }),
          anchoredTurn(5, { teacher: "Yes, the sea! Is it big?", prev: "yes" }),
        ]),
        KIT,
      ),
    );
    // 쌍은 앞 AI 반응이 있는 둘뿐이고(차례 2 는 없음), 이웃한 새 응답 oh-oh 는 세지 않는다
    expect(t.shape).toEqual({
      reactions: 3,
      firstWords: { oh: 2, yes: 1 },
      pairs: 2,
      same: 1,
      longest: 2,
    });
  });

  it("AC-15zl: 사용자 메시지의 귀띔 줄을 읽는다(없으면 빈 글)", () => {
    expect(
      heardHintLineOf(
        "Child: See\nHeard hint (speech recognition may have misheard): 'see' may be 'sea' (same sound)\nQuestion: yes",
      ),
    ).toBe("'see' may be 'sea' (same sound)");
    expect(heardHintLineOf("Child: See\nQuestion: yes")).toBe("");
  });

  it("AC-15zl: 자리 재현 표는 차례마다 앞 선생님 말 · 들은 글 · 실제 수업의 말 · 귀띔 줄 · 새 선생님 말 · 막힘 · 다시 쓰기를 한 줄로 내고, 기준선도 자리 재현이면 나란히 둔다", () => {
    const record = (teacher: string, over: TurnOver = {}) =>
      anchoredTurn(19, {
        child: "Teach",
        teacher,
        meant: BEACH_TEACH,
        lessonBefore:
          "Oh, that's okay! I am with you. 〈We play at the beach.〉",
        after: "No problem! Here is an easy one. / Do you like shells?",
        ...over,
      });
    const base = replayMetricsOf(
      [
        anchoredRun([
          record("Oh, that's okay!", {
            attach: ["Do you like shells?"],
            ...support(2),
            stuck: { ai: true, app: true, overridden: false },
          }),
        ]),
      ],
      kitFor,
    );
    const now = replayMetricsOf(
      [
        anchoredRun([
          record("Yes, the beach! Do you like the beach?", {
            userMessage:
              "Child: Teach\nHeard hint (speech recognition may have misheard): 'teach' may be today's word 'beach' (close sound)",
            reask: {
              usage: null,
              outcome: "",
              firstToriEn: "",
              firstFail: { question: "Where?", reason: "too_long", words: [] },
              retryToriEn: null,
              retryFail: null,
            },
          }),
        ]),
      ],
      kitFor,
    );
    expect(now.scripts[0]).toMatchObject({ anchored: true, replay: true });
    const md = replayMarkdown(now, base);
    expect(md).toContain(`${ANCHORED_NOTICE}.`);
    expect(md).not.toContain(REPLAY_NOTICE);
    expect(md).toContain("| replay-lesson-1108(자리 재현) | 1 |");
    expect(md).toContain("### 자리 재현: replay-lesson-1108 · 바퀴 1");
    expect(md).not.toContain("### 차례별 선생님 말:");
    expect(md).toContain(
      "| 19 | Oh, that's okay! I am with you. 〈We play at the beach.〉 | Teach | beach ← teach | No problem! Here is an easy one. / Do you like shells? | Oh, that's okay! / Do you like shells? | 둘 다 없음 · 막힘으로 셈(받침 2) | 'teach' may be today's word 'beach' (close sound) | Yes, the beach! Do you like the beach? | 받음 | — | too_long |",
    );
    expect(md).toContain("깐 상태 대조: 도구가 그 자리에서 셈한 아이 행 칸");
    // 기준선이 없으면 기준선 칸이 없다
    expect(replayMarkdown(now, null)).toContain(
      "| 19 | Oh, that's okay! I am with you. 〈We play at the beach.〉 | Teach | beach ← teach | No problem! Here is an easy one. / Do you like shells? | 'teach' may be today's word 'beach' (close sound) | Yes, the beach! Do you like the beach? | 받음 | — | too_long |",
    );
  });

  it("AC-15zl: 깐 상태가 기록과 다른 차례는 표 아래에 적는다", () => {
    const now = replayMetricsOf(
      [
        anchoredRun([
          turn(4, {
            teacher: "Yes, a fish!",
            anchored: {
              lessonAfter: "Yes, you see a fish! Where is the fish?",
              prevFirstWord: "oh",
              check: ["targets"],
            },
          }),
        ]),
      ],
      kitFor,
    );
    expect(replayMarkdown(now, null)).toContain(
      "깐 상태가 기록과 다른 차례(도구가 그 자리에서 셈한 아이 행 칸): 차례 4(targets)",
    );
  });
});
