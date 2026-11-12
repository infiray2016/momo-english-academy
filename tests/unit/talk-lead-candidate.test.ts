// 새 회화 엔진(N)의 새 후보 판정 — 기록 전용(spec '회화 Claude 주도' 설계 5 · 13절 C233 (3) · C238 (4) · plan 묶음 R3 · AC-26f).
// 지금 판정('말했다', said.ts)은 그대로 두고, 아이가 말한 단원 단어마다 다섯 갈래 + 그 밖을 매겨 지금 판정과 나란히 놓는다.
// 동음이의어는 시드 목록 그대로다.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  contentWordKeysOf,
  type LeadCandidateChildRow,
  type LeadCandidateLex,
  type LeadCandidateRow,
  type LeadCandidateTeacherRow,
  leadCandidateTableOf,
  leadCandidateTurnsOf,
} from "@/core/conversation/lead-candidate";
import { HomophonesFileSchema } from "@/core/seed/schema/reference";
import { lemmaLookup } from "@/core/session/attempt";

const HOMOPHONES = HomophonesFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/homophones.json"), "utf8"),
  ),
).groups;
const VOCAB = [
  { word: "go", forms: ["goes", "went", "gone", "going"] },
  { word: "see", forms: ["sees", "saw", "seen", "seeing"] },
  { word: "sea", forms: ["seas"] },
  { word: "beach", forms: ["beaches"] },
  { word: "mountain", forms: ["mountains"] },
  { word: "drink", forms: ["drinks", "drank", "drinking"] },
  { word: "water", forms: [] },
  { word: "milk", forms: [] },
  { word: "swim", forms: ["swims", "swam", "swimming"] },
  { word: "cloud", forms: ["clouds"] },
  { word: "sky", forms: [] },
  { word: "sun", forms: [] },
];
const LEX: LeadCandidateLex = {
  unitWords: VOCAB.map((v) => v.word),
  lemmaOf: lemmaLookup(VOCAB),
  homophones: HOMOPHONES,
};

function teacher(
  say: string,
  extra: Partial<Omit<LeadCandidateTeacherRow, "role" | "say">> = {},
): LeadCandidateTeacherRow {
  return {
    role: "teacher",
    say,
    move: "react_and_follow_up",
    model: null,
    choices: false,
    koShown: false,
    ...extra,
  };
}

/** 아이 행. claude 를 주지 않으면 Claude 후보 = 지금 판정 낱말(saidWords)이다. */
function child(
  heard: string,
  saidWords: string[],
  extra: Partial<
    Omit<LeadCandidateChildRow, "role" | "heard" | "saidWords">
  > = {},
): LeadCandidateChildRow {
  return {
    role: "child",
    heard,
    saidWords,
    claudeWords: saidWords,
    hintKind: "none",
    stuck: false,
    koHelp: false,
    meaningHint: false,
    reading: "clear_answer",
    ...extra,
  };
}

/** 마지막 아이 차례의 새 후보(값 2) 낱말 → 갈래. */
function lastCandidate(rows: LeadCandidateRow[]) {
  const turns = leadCandidateTurnsOf(rows, LEX);
  const last = turns.at(-1);
  if (last === undefined) throw new Error("아이 차례가 없다");
  return last;
}
function categoriesOf(rows: LeadCandidateRow[]) {
  return Object.fromEntries(
    lastCandidate(rows).candidate.map((c) => [c.word, c.category]),
  );
}

describe("AC-26f 새 후보 판정 — 설계 5 표의 예마다 갈래", () => {
  it("AC-26f ① 'Say it with me: I see the sea.' 뒤 'I see the sea.' 는 완성 답 따라 말함, 인정하지 않는다", () => {
    const turn = lastCandidate([
      teacher("Say it with me: I see the sea.", {
        move: "model_repeat",
        model: "I see the sea.",
      }),
      child("I see the sea.", [], {
        claudeWords: ["see", "sea"],
        hintKind: "english",
        reading: "repeated_my_model",
      }),
    ]);
    expect(turn.candidate).toEqual([
      { word: "see", category: "repeated_model", accepted: false, help: null },
      { word: "sea", category: "repeated_model", accepted: false, help: null },
    ]);
    expect(turn.hintKind).toBe("english");
  });

  it("AC-26f ② 'Do you go to the beach?' 뒤 'Beach!' 는 목표 낱말만 되풀이함(보류, 인정하지 않음)", () => {
    expect(
      categoriesOf([
        teacher("Do you go to the beach?"),
        child("Beach!", ["beach"]),
      ]),
    ).toEqual({ beach: "echoed_word" });
    const turn = lastCandidate([
      teacher("Do you go to the beach?"),
      child("Beach!", ["beach"]),
    ]);
    expect(turn.candidate[0]?.accepted).toBe(false);
  });

  it("AC-26f ② 되묻기 사이: 'On weekends, I go to the mountain.' → 되묻기 → 'Mountain.' 은 그 앞 선생님 행까지 거슬러 본다", () => {
    const rows: LeadCandidateRow[] = [
      teacher("On weekends, I go to the mountain. Where do you go?"),
      child("Mountin?", [], { claudeWords: [], reading: "likely_misheard" }),
      teacher("Where do you go on weekends?", { move: "ask_again" }),
      child("Mountain.", ["mountain"]),
    ];
    expect(categoriesOf(rows)).toEqual({ mountain: "echoed_word" });
    // 되묻기가 아니면 바로 앞 선생님 행만 본다 → 선생님이 말하지 않은 낱말(그 밖)
    const plain = rows.map((row, i) =>
      i === 2 && row.role === "teacher"
        ? { ...row, move: "react_and_follow_up" as const }
        : row,
    );
    expect(categoriesOf(plain)).toEqual({ mountain: "not_said_by_teacher" });
  });

  it("AC-26f ③ 한국어 도움 '바다' 뒤 'I like sea.' 는 뜻을 알려 준 뒤 답함, 도움 범위를 적고 지금 기준(힌트 종류)대로", () => {
    const ko = lastCandidate([
      teacher("What do you like?"),
      child("I like sea.", [], {
        claudeWords: ["sea"],
        koHelp: true,
        hintKind: "english",
      }),
    ]);
    expect(ko.candidate).toEqual([
      {
        word: "sea",
        category: "after_meaning",
        accepted: false,
        help: "ko_help",
      },
    ]);
    const meaning = lastCandidate([
      teacher("What do you like?"),
      child("I like sea.", ["sea"], {
        meaningHint: true,
        hintKind: "meaning_only",
      }),
    ]);
    expect(meaning.candidate).toEqual([
      {
        word: "sea",
        category: "after_meaning",
        accepted: true,
        help: "meaning_hint",
      },
    ]);
  });

  it("AC-26f ③ 앞 선생님 차례가 막힌 뒤 한국어 뜻(hint_ko)을 보였으면 ③ 이고 차이 표에 따로 센다", () => {
    const rows: LeadCandidateRow[] = [
      teacher("What do you like?"),
      child("", [], { claudeWords: [], reading: "does_not_know" }),
      teacher("Do you like the sea or the mountain?", {
        move: "easier_or_choices",
        koShown: true,
      }),
      child("I like sea.", ["sea"]),
    ];
    // W=sea 가 앞 say 에 있고 내용 낱말(like · sea)이 모두 say 에 있으면 ② 가 먼저 맞는다 — 갈래는 위에서부터 처음 맞는 하나
    expect(categoriesOf(rows)).toEqual({ sea: "echoed_word" });
    const own: LeadCandidateRow[] = [
      teacher("What do you like?"),
      child("", [], { claudeWords: [], reading: "does_not_know" }),
      teacher("It's okay. What place do you like?", {
        move: "easier_or_choices",
        koShown: true,
      }),
      child("I like sea.", ["sea"]),
    ];
    expect(lastCandidate(own).candidate).toEqual([
      {
        word: "sea",
        category: "after_meaning",
        accepted: true,
        help: "teacher_ko",
      },
    ]);
    expect(leadCandidateTableOf(own, LEX).counts.teacherKo).toBe(1);
  });

  it("AC-26f ④ 'What do you and Coco drink?' 뒤 'Water. Coco drink water. I drink milk.' 의 drink 는 새 문장(인정 후보)", () => {
    const turn = lastCandidate([
      teacher("What do you and Coco drink?"),
      child("Water. Coco drink water. I drink milk.", [
        "water",
        "drink",
        "milk",
      ]),
    ]);
    expect(
      Object.fromEntries(turn.candidate.map((c) => [c.word, c.category])),
    ).toEqual({
      water: "not_said_by_teacher",
      drink: "own_sentence",
      milk: "not_said_by_teacher",
    });
    expect(turn.candidate.every((c) => c.accepted)).toBe(true);
  });

  it("AC-26f 'Do you go to the beach?' 뒤 'Beach!' 와 'I go to the beach with my mom.' 은 서로 다른 갈래(② · ④)", () => {
    const echo = categoriesOf([
      teacher("Do you go to the beach?"),
      child("Beach!", ["beach"]),
    ]);
    const sentence = categoriesOf([
      teacher("Do you go to the beach?"),
      child("I go to the beach with my mom.", ["go", "beach"]),
    ]);
    expect(echo.beach).toBe("echoed_word");
    expect(sentence.beach).toBe("own_sentence");
    expect(sentence.go).toBe("own_sentence");
  });

  it("AC-26f ⑤ 앞에서 ② 로 적힌 beach 를 뒤에 'I swim at the beach.' 로 스스로 쓰면 별도 독립 근거 후보", () => {
    const turns = leadCandidateTurnsOf(
      [
        teacher("Do you go to the beach?"),
        child("Beach!", ["beach"]),
        teacher("What do you do there?"),
        child("I swim at the beach.", ["swim", "beach"]),
      ],
      LEX,
    );
    expect(turns[0]?.candidate[0]?.category).toBe("echoed_word");
    expect(turns[1]?.candidate).toEqual([
      {
        word: "swim",
        category: "not_said_by_teacher",
        accepted: true,
        help: null,
      },
      { word: "beach", category: "own_later", accepted: true, help: null },
    ]);
  });

  it("AC-26f (그 밖) 'What do you do there?' 뒤 'I see clouds.' 는 선생님이 말하지 않은 낱말, 지금 판정과 같다", () => {
    const counted = lastCandidate([
      teacher("What do you do there?"),
      child("I see clouds.", ["see", "cloud"]),
    ]);
    expect(counted.candidate).toEqual([
      {
        word: "see",
        category: "not_said_by_teacher",
        accepted: true,
        help: null,
      },
      {
        word: "cloud",
        category: "not_said_by_teacher",
        accepted: true,
        help: null,
      },
    ]);
    // 지금 판정이 세지 않은 낱말(막힘 등)은 그 밖에서도 인정하지 않는다
    const stuck = lastCandidate([
      teacher("What do you do there?"),
      child("I see clouds.", [], {
        claudeWords: ["see", "cloud"],
        stuck: true,
        reading: "does_not_fit",
      }),
    ]);
    expect(stuck.candidate.map((c) => c.accepted)).toEqual([false, false]);
    expect(stuck.heard.map((c) => c.accepted)).toEqual([false, false]);
    expect(stuck.currentConditionsMet).toBe(false);
  });

  it("AC-26f ① 뒤의 ⑤: 따라 말한 sea 를 뒤에 'I swim in the sea.' 로 스스로 쓰면 별도 독립 근거 후보", () => {
    const turns = leadCandidateTurnsOf(
      [
        teacher("Say it with me: I see the sea.", {
          move: "model_repeat",
          model: "I see the sea.",
        }),
        child("I see the sea.", [], {
          claudeWords: ["see", "sea"],
          hintKind: "english",
          reading: "repeated_my_model",
        }),
        teacher("What do you do there?"),
        child("I swim in the sea.", ["swim", "sea"]),
      ],
      LEX,
    );
    expect(turns[0]?.candidate.map((c) => c.category)).toEqual([
      "repeated_model",
      "repeated_model",
    ]);
    expect(turns[1]?.candidate).toEqual([
      {
        word: "swim",
        category: "not_said_by_teacher",
        accepted: true,
        help: null,
      },
      { word: "sea", category: "own_later", accepted: true, help: null },
    ]);
    expect(turns[1]?.heard.find((c) => c.word === "sea")?.category).toBe(
      "own_later",
    );
  });
});

describe("AC-26f 감탄사 · 예 · 아니요만 더한 말(검토 M-2, 컨트롤러 결정)", () => {
  it.each([
    "Yes. Sky.",
    "Oh, sky!",
    "Okay, sky.",
    "OK sky.",
    "Wow, sky!",
    "Um... sky.",
    "Yeah, sky.",
    "No, sky.",
  ])(
    "AC-26f 'Do you see the sky too?' 뒤 '%s' 는 그것만 되풀이함(②, 인정하지 않음)",
    (heard) => {
      const turn = lastCandidate([
        teacher("Do you see the sky too?"),
        child(heard, ["sky"]),
      ]);
      expect(turn.candidate).toEqual([
        { word: "sky", category: "echoed_word", accepted: false, help: null },
      ]);
      expect(turn.heard.map((c) => c.category)).toEqual(["echoed_word"]);
    },
  );

  it("AC-26f 목록 밖 낱말이 하나라도 더해지면 지금처럼 넷째 갈래('Oh, blue sky!')", () => {
    expect(
      categoriesOf([
        teacher("Do you see the sky too?"),
        child("Oh, blue sky!", ["sky"]),
      ]),
    ).toEqual({ sky: "own_sentence" });
  });

  it("AC-26f 감탄사 · 예 · 아니요는 내용 낱말이 아니다", () => {
    expect(
      contentWordKeysOf("Oh, wow! Okay, OK. Um, yes, yeah, no.", LEX),
    ).toEqual([]);
  });

  it("AC-26f 따라 할 문장 뒤 'Oh, I see the sea.' 도 완성 답 따라 말함(①)", () => {
    const turn = lastCandidate([
      teacher("Say it with me: I see the sea.", {
        move: "model_repeat",
        model: "I see the sea.",
      }),
      child("Oh, I see the sea.", [], {
        claudeWords: ["see", "sea"],
        hintKind: "english",
      }),
    ]);
    expect(turn.candidate.map((c) => c.category)).toEqual([
      "repeated_model",
      "repeated_model",
    ]);
  });
});

describe("AC-26f 따라 할 문장에 새 낱말을 더한 말 · 같은 소리 낱말", () => {
  it("AC-26f 'I see the sea and sky.' 는 ④ 로 적고 그 차례의 힌트 종류 '영어'를 함께 적는다", () => {
    const turn = lastCandidate([
      teacher("Say it with me: I see the sea.", {
        move: "model_repeat",
        model: "I see the sea.",
      }),
      child("I see the sea and sky.", [], {
        claudeWords: ["see", "sea", "sky"],
        hintKind: "english",
      }),
    ]);
    expect(turn.hintKind).toBe("english");
    expect(
      Object.fromEntries(turn.candidate.map((c) => [c.word, c.category])),
    ).toEqual({
      see: "own_sentence",
      sea: "own_sentence",
      sky: "not_said_by_teacher",
    });
    // sky 는 그 밖 — 지금 판정('영어'라 없음)과 같다
    expect(turn.candidate.find((c) => c.word === "sky")?.accepted).toBe(false);
  });

  it("AC-26f 같은 소리: 'Do you like the sea?' 뒤 들린 글 'See!'(Claude 후보 sea)는 sea 로 매기고 ② 다", () => {
    const turn = lastCandidate([
      teacher("Do you like the sea?"),
      child("See!", ["sea"]),
    ]);
    expect(turn.candidate).toEqual([
      { word: "sea", category: "echoed_word", accepted: false, help: null },
    ]);
    // 들린 글만으로 매긴 셋째 값은 글자 그대로 see(선생님은 sea 를 말함 → 그 밖, 지금 기준의 차례 조건을 지나 인정 — Claude 후보에 기대지 않음)
    expect(turn.heard).toEqual([
      {
        word: "see",
        category: "not_said_by_teacher",
        accepted: true,
        help: null,
      },
    ]);
    // 소리로만 이어진 후보(sea 는 글자로 들리지 않음)는 'Claude 가 내지 않음'으로 세지 않는다
    expect(turn.heardNotClaude).toEqual([]);
  });

  it("AC-26f 같은 소리 두 낱말이 함께 들리면('I see the sea.', Claude 후보 sea) 들린 see 는 'Claude 가 내지 않음'으로 센다", () => {
    const turn = lastCandidate([
      teacher("What is there?"),
      child("I see the sea.", ["sea"]),
    ]);
    expect(turn.heardNotClaude).toEqual(["see"]);
    expect(turn.claudeNotHeard).toEqual([]);
  });

  it("AC-26f 같은 소리라도 선생님이 다른 낱말을 말했으면 W 는 say 에 없다('What do you see?' → 'Sea.')", () => {
    expect(
      categoriesOf([teacher("What do you see?"), child("Sea.", ["sea"])]),
    ).toEqual({ sea: "not_said_by_teacher" });
  });

  it("AC-26f 내용 낱말은 기능어를 빼고 원형 · 축약형 펼침으로 본다", () => {
    const keys = (text: string) =>
      contentWordKeysOf(text, LEX).map((k) => k.word);
    expect(keys("I'm going to the beach with my mom!")).toEqual([
      "go",
      "beach",
      "mom",
    ]);
    expect(keys("Yes, it is.")).toEqual([]);
  });
});

describe("AC-26f 셋째 값(들린 글만) · Claude 후보와 앱 대조", () => {
  it("AC-26f Claude 가 내지 않은 들린 단원 단어도 셋째 값으로 같은 갈래를 매기고, 어긋남을 따로 적는다", () => {
    const turns = leadCandidateTurnsOf(
      [
        teacher("Do you go to the beach?"),
        child("Beach!", ["beach"]),
        teacher("What do you do there?"),
        child("I swim at the beach.", ["swim"], {
          claudeWords: ["swim", "sun"],
        }),
      ],
      LEX,
    );
    const last = turns[1];
    expect(last?.candidate.map((c) => c.word)).toEqual(["swim"]);
    expect(last?.heard).toEqual([
      {
        word: "swim",
        category: "not_said_by_teacher",
        accepted: true,
        help: null,
      },
      { word: "beach", category: "own_later", accepted: true, help: null },
    ]);
    expect(last?.claudeNotHeard).toEqual(["sun"]);
    expect(last?.heardNotClaude).toEqual(["beach"]);
  });

  it("AC-26f 셋째 값의 그 밖은 Claude 후보 없이 지금 기준의 차례 조건(힌트 종류 '영어' 아님 · 막힘 아님 · 뒤에 되묻기 아님)으로 인정한다", () => {
    const say = teacher("What do you do there?");
    const heardOf = (
      extra: Parameters<typeof child>[2],
      rest = [] as LeadCandidateRow[],
    ) =>
      leadCandidateTurnsOf(
        [say, child("I go to the mountain.", ["go"], extra), ...rest],
        LEX,
      )[0]?.heard;
    // Claude 는 go 만 냈지만 들린 mountain 도 그 밖에서 인정한다
    expect(heardOf({})).toEqual([
      {
        word: "go",
        category: "not_said_by_teacher",
        accepted: true,
        help: null,
      },
      {
        word: "mountain",
        category: "not_said_by_teacher",
        accepted: true,
        help: null,
      },
    ]);
    expect(heardOf({ hintKind: "english" })?.map((c) => c.accepted)).toEqual([
      false,
      false,
    ]);
    expect(heardOf({ stuck: true })?.map((c) => c.accepted)).toEqual([
      false,
      false,
    ]);
    const askedAgain = heardOf({}, [
      teacher("Where do you go?", { move: "ask_again" }),
    ]);
    expect(askedAgain?.map((c) => c.accepted)).toEqual([false, false]);
    // 값 2 의 그 밖은 저장된 지금 판정 그대로(mountain 은 Claude 후보가 아니라 값 2 에 없다)
    expect(
      leadCandidateTurnsOf(
        [say, child("I go to the mountain.", ["go"])],
        LEX,
      )[0]?.candidate.map((c) => c.word),
    ).toEqual(["go"]);
  });
});

describe("AC-26f 수업마다 차이 표", () => {
  const lesson: LeadCandidateRow[] = [
    teacher("Do you go to the beach?"),
    child("Beach!", ["beach"]),
    teacher("Say it with me: I see the sea.", {
      move: "model_repeat",
      model: "I see the sea.",
    }),
    child("I see the sea and sky.", [], {
      claudeWords: ["see", "sea", "sky"],
      hintKind: "english",
    }),
    teacher("What do you do there?"),
    child("I see clouds.", ["see", "cloud"], {
      claudeWords: ["see", "cloud", "sun"],
    }),
    teacher("Hmm. Is it the beach or the mountain?", {
      move: "easier_or_choices",
      choices: true,
    }),
    child("Mountain.", [], { claudeWords: ["mountain"], hintKind: "english" }),
  ];

  it("AC-26f 낱말마다 지금 판정 · 새 후보 · 들린 글만 어느 쪽에 있는지와 갈래를 낸다", () => {
    const table = leadCandidateTableOf(lesson, LEX);
    const row = (word: string) => table.words.find((w) => w.word === word);
    expect(row("beach")).toMatchObject({
      current: true,
      candidate: false,
      side: "current_only",
      categories: ["echoed_word"],
    });
    expect(row("sea")).toMatchObject({
      current: false,
      candidate: true,
      side: "candidate_only",
      categories: ["own_sentence"],
    });
    expect(row("see")).toMatchObject({
      current: true,
      candidate: true,
      side: "both",
      categories: ["own_sentence", "not_said_by_teacher"],
    });
    expect(row("sky")).toMatchObject({ side: "neither" });
    expect(row("mountain")).toMatchObject({
      side: "neither",
      categories: ["echoed_word"],
    });
  });

  it("AC-26f 차이 낱말 수 · 갈래별 수 · 막힌 뒤 고르기로 빠진 차례 수 · Claude 후보와 앱 대조 어긋남을 센다", () => {
    const { counts } = leadCandidateTableOf(lesson, LEX);
    expect(counts.differ).toBe(2);
    expect(counts.currentOnly).toBe(1);
    expect(counts.candidateOnly).toBe(1);
    expect(counts.byCategory).toEqual({
      repeated_model: 0,
      echoed_word: 2,
      after_meaning: 0,
      own_sentence: 2,
      own_later: 0,
      not_said_by_teacher: 3,
    });
    expect(counts.choicesDropped).toBe(1);
    expect(counts.claudeNotHeard).toBe(1);
    expect(counts.heardNotClaude).toBe(0);
    expect(counts.teacherKo).toBe(0);
  });

  it("AC-26f 아이 차례마다 세 값과 들린 글 · reading 을 함께 싣는다", () => {
    const turns = leadCandidateTurnsOf(lesson, LEX);
    expect(turns).toHaveLength(4);
    expect(turns[3]).toMatchObject({
      row: 7,
      text: "Mountain.",
      reading: "clear_answer",
      current: [],
      choicesDropped: true,
    });
  });

  it("AC-26f 고르기 뒤 힌트 종류가 '영어'가 아닌 빈 차례(막힘 · Claude 후보 없음)는 고르기로 빠진 차례로 세지 않는다", () => {
    const choices = teacher("Is it the beach or the mountain?", {
      move: "easier_or_choices",
      choices: true,
    });
    const stuck = leadCandidateTableOf(
      [
        choices,
        child("Mountain.", [], {
          claudeWords: ["mountain"],
          stuck: true,
          reading: "does_not_fit",
        }),
      ],
      LEX,
    );
    expect(stuck.turns[0]?.choicesDropped).toBe(false);
    expect(stuck.counts.choicesDropped).toBe(0);
    const noCandidate = leadCandidateTableOf(
      [choices, child("Mountain.", [], { claudeWords: [] })],
      LEX,
    );
    expect(noCandidate.counts.choicesDropped).toBe(0);
  });
});

describe("AC-26f 차이 표의 표지 칸 — 다섯 구분에서 온 차이인지 · 그 밖의 조건에서 온 차이인지(검토 M-4, 컨트롤러 결정)", () => {
  it("AC-26f ② 로 빠진 지금 판정 낱말은 다섯 구분에서 온 차이, 힌트 종류 '영어' 차례의 ④ 는 그 밖의 조건에서 온 차이", () => {
    const table = leadCandidateTableOf(
      [
        teacher("Do you go to the beach?"),
        child("Beach!", ["beach"]),
        teacher("Say it with me: I see the sea.", {
          move: "model_repeat",
          model: "I see the sea.",
        }),
        child("I see the sea and sky.", [], {
          claudeWords: ["see", "sea", "sky"],
          hintKind: "english",
        }),
      ],
      LEX,
    );
    const row = (word: string) => table.words.find((w) => w.word === word);
    expect(row("beach")).toMatchObject({
      side: "current_only",
      differFrom: "categories",
    });
    expect(row("sea")).toMatchObject({
      side: "candidate_only",
      differFrom: "other_conditions",
    });
    expect(row("sky")).toMatchObject({ side: "neither", differFrom: null });
  });

  it("AC-26f 막힘 차례의 ④('Do you go to the beach?' 뒤 'Beach mountain')는 그 밖의 조건에서 온 차이, 계산은 그대로", () => {
    const table = leadCandidateTableOf(
      [
        teacher("Do you go to the beach?"),
        child("Beach mountain", [], {
          claudeWords: ["beach", "mountain"],
          stuck: true,
          reading: "does_not_fit",
        }),
      ],
      LEX,
    );
    expect(table.turns[0]?.candidate).toEqual([
      { word: "beach", category: "own_sentence", accepted: true, help: null },
      {
        word: "mountain",
        category: "not_said_by_teacher",
        accepted: false,
        help: null,
      },
    ]);
    expect(table.words.find((w) => w.word === "beach")).toMatchObject({
      side: "candidate_only",
      differFrom: "other_conditions",
    });
    expect(table.counts.candidateOnly).toBe(1);
  });

  it("AC-26f 지금 판정에만 있고 새 후보에 낱말이 없으면(Claude 후보 밖) 그 밖의 조건에서 온 차이, 양쪽이 같으면 표지 없음", () => {
    const table = leadCandidateTableOf(
      [
        teacher("What do you do there?"),
        child("I see clouds.", ["see", "cloud"], { claudeWords: ["see"] }),
      ],
      LEX,
    );
    expect(table.words.find((w) => w.word === "cloud")).toMatchObject({
      side: "current_only",
      differFrom: "other_conditions",
    });
    expect(table.words.find((w) => w.word === "see")).toMatchObject({
      side: "both",
      differFrom: null,
    });
  });
});

describe("AC-26f 호출 자리 검색 — 새 후보 판정은 평가 입력에 들지 않는다", () => {
  function filesUnder(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory()
        ? filesUnder(path)
        : /\.(ts|tsx)$/.test(name)
          ? [path]
          : [];
    });
  }

  it("AC-26f src 의 어느 파일도 lead-candidate 를 가져다 쓰지 않는다(said_words · '안다' · 단원 통과 · 승급 입력 밖)", () => {
    const root = join(process.cwd(), "src");
    const users = filesUnder(root)
      .filter((path) => !path.endsWith("lead-candidate.ts"))
      .filter((path) => readFileSync(path, "utf8").includes("lead-candidate"))
      .map((path) => relative(process.cwd(), path));
    expect(users).toEqual([]);
  });

  it("AC-26f lead-candidate 는 DB · 서버 모듈을 가져오지 않는 순수 모듈이다", () => {
    const source = readFileSync(
      join(process.cwd(), "src/core/conversation/lead-candidate.ts"),
      "utf8",
    );
    const imports = [...source.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
    expect(imports.every((m) => m?.startsWith("@/core/"))).toBe(true);
  });
});
