// 회화 N 길 요청 규격(intent 2026-11-12-회화-Claude-주도 spec 설계 2 · 7, plan 묶음 R1): 안내문 골든 · 사실 알림 줄 · 대화 기록 · 응답 아홉 칸 ·
// 호출 규격 · 가림. 실제 API 를 부르지 않는다. 3단계 단원 1 의 값은 시드(unit-specs · level-specs · teachers)와 시험용 설정에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { prepareAnswer } from "@/core/ai/calls/common";
import {
  applyTalkLeadChecks,
  normalizeTalkLead,
  TALK_LEAD_OUTPUT_FIELDS,
  TALK_LEAD_STATUS_HEAD,
  TALK_LEAD_TEXT_L3U1,
  TALK_LEAD_TITLE,
  type TalkLeadCefr,
  type TalkLeadInput,
  type TalkLeadOutput,
  TalkLeadOutputSchema,
  type TalkLeadTurn,
  talkLeadAssistantOf,
  talkLeadCheckFields,
  talkLeadGoalWordsSaidOf,
  talkLeadLearnerOf,
  talkLeadMessages,
  talkLeadRulesOf,
  talkLeadSentencesLineOf,
  talkLeadSoundNotesOf,
  talkLeadStatusLines,
  talkLeadSystem,
  talkLeadTextOf,
  talkLeadTurnSpec,
  talkLeadUserMessage,
  teacherTraitOf,
} from "@/core/ai/calls/talk-lead";
import { talkLessonSystem } from "@/core/ai/calls/talk-lesson";
import { settingKeysOf } from "@/core/ai/combo";
import type { Masker } from "@/core/ai/mask";
import { checkOutputFields } from "@/core/ai/output-check";
import { buildAiRequest } from "@/core/ai/request";
import type { Cefr } from "@/core/seed/structure";
import { SAMPLE_FORBIDDEN } from "../fixtures/ai/sample-inputs";
import { lessonInput, lessonRules } from "../fixtures/ai/talk-lesson-inputs";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";

const ROOT = join(__dirname, "../..");
const readJson = (path: string) =>
  JSON.parse(readFileSync(join(ROOT, path), "utf8"));
const GOLDEN = readFileSync(
  join(ROOT, "tests/fixtures/talk-lead-system-l3u1.txt"),
  "utf8",
);

/** spec AC-2 의 안내문 크기 상한(수용 기준 값). */
const SYSTEM_MAX_CHARS = 4300;

const values = testSettingValues();

/** 지금 길의 고정부(talk-lesson.ts commonRules)와 글자까지 같아야 하는 안전 문장 넷(spec 설계 2). */
const SAFETY = [
  "Use only content suitable for children.",
  "Never ask for a name, school, address, phone number, photo, or to meet. If the child says personal information, do not ask about it and go back to the topic.",
  "Never say you are a human.",
  "Do not make up a human life for yourself (age, family, home, school). If the child asks who you are, say you are an AI teacher in this app.",
];

/** 시드의 회화 3단계 단원 1 값. */
const UNIT = (
  readJson("seed/unit-specs.json").unitSpecs as {
    area: string;
    level: number;
    unit: number;
    words: string[];
  }[]
).find((u) => u.area === "talk" && u.level === 3 && u.unit === 1);
const TALK_LEVELS = (
  readJson("seed/level-specs.json").levelSpecs as {
    area: string;
    level: number;
    cefr: Cefr;
    sentenceMaxWords: number;
  }[]
).filter((s) => s.area === "talk");
const LEVEL = TALK_LEVELS.find((s) => s.level === 3);
/** 단계 규격 두 행(이 단계 · 다음 단계)의 CEFR — 부르는 쪽(S1)이 채우는 값과 같은 출처. */
function cefrOf(level: number): TalkLeadCefr {
  const here = TALK_LEVELS.find((s) => s.level === level);
  if (!here) throw new Error(`시드에 회화 ${level}단계 규격이 없다`);
  const next = TALK_LEVELS.find((s) => s.level === level + 1);
  return { level: here.cefr, next: next?.cefr ?? null };
}
const TEACHERS = readJson("seed/teachers.json").teachers as {
  key: string;
  nameEn: string;
  personaEn: string;
}[];
const MINA = TEACHERS.find((t) => t.key === "mina");
const LEO = TEACHERS.find((t) => t.key === "leo");
const LESSON_SEED = readJson("seed/lessons/talk/3/1.json") as {
  lessons: { card: Record<string, unknown> }[];
};

function firstTurn(): TalkLeadTurn {
  return {
    child: null,
    greeting: [
      { speaker: "teacher", text: "Hello, {NAME}! How are you?" },
      { speaker: "child", text: "I am fine." },
    ],
    status: { goalWordsSaid: [], talkStarts: true },
  };
}

function leadInput(over: Partial<TalkLeadInput> = {}): TalkLeadInput {
  if (!UNIT || !LEVEL || !MINA) throw new Error("시드에 3단계 단원 1 이 없다");
  return {
    level: 3,
    canDo: "",
    learningElement: "",
    prevLearningElements: [],
    unitWords: UNIT.words,
    sentenceMaxWords: LEVEL.sentenceMaxWords,
    teacher: { nameEn: MINA.nameEn, personaEn: MINA.personaEn },
    cefr: cefrOf(3),
    text: TALK_LEAD_TEXT_L3U1,
    history: [],
    turn: firstTurn(),
    ...over,
  };
}

const rules = talkLeadRulesOf(values, { level: 3 });

const OUTPUT: TalkLeadOutput = {
  reading: "clear_answer",
  move: "react_and_follow_up",
  say: "Oh, you go to the beach! What do you see there?",
  say_ko: "오, 바다에 가는구나! 거기서 뭘 봐?",
  model_sentence: "",
  hint_ko: "나는 바다를 봐.",
  hint_en: "I see the sea.",
  goal_words_i_said: ["go", "beach", "see"],
  child_used_on_own: ["beach"],
};

describe("AC-26b 안내문(spec 설계 2)", () => {
  it("AC-26b 3단계 단원 1 · 미나의 값으로 조립한 안내문이 골든(spec 의 글 + 성격 한 줄)과 글자까지 같고 4,202자 · 상한 4,300자 안이다", () => {
    const system = talkLeadSystem(leadInput(), rules);
    expect(system).toBe(GOLDEN);
    expect(system.length).toBe(4202);
    expect(system.length).toBeLessThanOrEqual(SYSTEM_MAX_CHARS);
  });

  it("AC-26b 골든은 spec 설계 2 의 글(4,166자)에 성격 첫 문장 한 줄만 더한 글이다(검토 I-3)", () => {
    const lines = GOLDEN.split("\n");
    expect(lines[1]).toBe("Your personality: Warm and patient.");
    const specText = [lines[0], ...lines.slice(2)].join("\n");
    expect(specText.length).toBe(4166);
  });

  it("AC-26b 성격 글은 첫 문장(성질 말)만 싣고 행동을 지시하는 문장은 싣지 않는다(C238 (2), 검토 I-3)", () => {
    if (!LEO || !MINA) throw new Error("시드에 미나 · 리오가 없다");
    expect(teacherTraitOf(MINA.personaEn)).toBe("Warm and patient.");
    expect(teacherTraitOf(LEO.personaEn)).toBe("Curious and relaxed.");
    const mina = talkLeadSystem(leadInput(), rules);
    const leo = talkLeadSystem(
      leadInput({ teacher: { nameEn: LEO.nameEn, personaEn: LEO.personaEn } }),
      rules,
    );
    // 리오의 글은 골든에서 이름 · 성격 한 줄만 다르다
    expect(leo).toBe(
      GOLDEN.replace("You are Mina,", "You are Leo,").replace(
        "Your personality: Warm and patient.",
        "Your personality: Curious and relaxed.",
      ),
    );
    expect(leo.length).toBeLessThanOrEqual(SYSTEM_MAX_CHARS);
    for (const [system, persona] of [
      [mina, MINA.personaEn],
      [leo, LEO.personaEn],
    ] as const) {
      expect(system).not.toContain(persona);
      expect(system).not.toContain("step by step");
      expect(system).not.toContain("try one more time");
    }
    expect(() => teacherTraitOf(" ")).toThrow(RangeError);
  });

  it("AC-26b 3단계 단원 1 만 글의 출처가 있고 다른 단원은 null 이다(spec 미결 2)", () => {
    expect(talkLeadTextOf(3, 1)).toBe(TALK_LEAD_TEXT_L3U1);
    expect(talkLeadTextOf(3, 2)).toBeNull();
    expect(talkLeadTextOf(4, 1)).toBeNull();
  });

  it("AC-26b 자리 값은 선생님 명단 · 단원 단어 · 단계 규격 CEFR · 문장 상한 설정 N · 단계 문장 낱말 상한에서 온다(검토 I-1)", () => {
    const system = talkLeadSystem(
      leadInput({
        teacher: { nameEn: "Ari", personaEn: "Calm and bright. You hum." },
        unitWords: ["swim", "run"],
        sentenceMaxWords: 9,
        cefr: { level: "Pre-A1", next: "Pre-A1" },
      }),
      { teacherSentencesMax: 4 },
    );
    expect(
      system.startsWith(
        "You are Ari, a warm English teacher having a spoken one-to-one conversation with a Korean child (about 10 years old, beginner, CEFR Pre-A1). ",
      ),
    ).toBe(true);
    expect(system).toContain("\nYour personality: Calm and bright.\n\n");
    expect(system).not.toContain("You hum.");
    expect(system).toContain(
      "- Goal words the child should come to say on their own: swim, run.",
    );
    expect(system).toContain(
      "- At most 3 short sentences per turn (4 only when you model a sentence). At most 9 words per sentence.",
    );
    // 시험용 설정(talk.teacher_sentences_max.1-3)의 값이 안내문의 N 이다
    const n = TEST_SETTINGS["talk.teacher_sentences_max.1-3"].value;
    expect(rules.teacherSentencesMax).toBe(n);
    expect(talkLeadSystem(leadInput(), rules)).toContain(
      `- At most ${n - 1} short sentences per turn (${n} only when you model a sentence). At most ${LEVEL?.sentenceMaxWords} words per sentence.`,
    );
  });

  it("AC-26b 문장 수 줄은 설정 N 으로 'At most N−1 … (N only …)' 이고, N 이 2 보다 작으면 던진다", () => {
    expect(talkLeadSentencesLineOf(2)).toBe(
      "At most 1 short sentences per turn (2 only when you model a sentence).",
    );
    expect(talkLeadSentencesLineOf(5)).toBe(
      "At most 4 short sentences per turn (5 only when you model a sentence).",
    );
    for (const bad of [1, 0, -1, 2.5])
      expect(() => talkLeadSentencesLineOf(bad)).toThrow(RangeError);
    expect(() =>
      talkLeadSystem(leadInput(), { teacherSentencesMax: 1 }),
    ).toThrow(RangeError);
    expect(() =>
      talkLeadRulesOf(
        { ...values, "talk.teacher_sentences_max.1-3": 1 },
        { level: 3 },
      ),
    ).toThrow(RangeError);
  });

  it("AC-26b 수준 줄은 단계 규격의 CEFR 이고 다음 단계가 다르면 '<이 단계> to <다음 단계>', 1~3단계 구간 밖이면 던진다(spec 우려 5)", () => {
    expect(talkLeadLearnerOf(1, cefrOf(1))).toBe("beginner, CEFR Pre-A1");
    expect(talkLeadLearnerOf(2, cefrOf(2))).toBe("beginner, CEFR Pre-A1");
    expect(talkLeadLearnerOf(3, cefrOf(3))).toBe("beginner, CEFR Pre-A1 to A1");
    for (const level of [4, 7, 12])
      expect(() => talkLeadLearnerOf(level, cefrOf(level))).toThrow(RangeError);
    expect(() =>
      talkLeadSystem(leadInput({ level: 4, cefr: cefrOf(4) }), rules),
    ).toThrow(RangeError);
  });

  it("AC-26b 단계 맥락의 can-do · 학습 요소 · 앞 학습 요소는 요청에 싣지 않는다(spec 설계 2 자리 값 표, 검토 M-1)", () => {
    const input = leadInput({
      canDo: "MARK-CANDO 선생님과 15번 주고받는다",
      learningElement: "MARK-ELEMENT present simple",
      prevLearningElements: ["MARK-PREV be verb"],
    });
    const request = [
      talkLeadSystem(input, rules),
      ...talkLeadMessages(input).map((m) => m.content),
    ].join("\n");
    expect(request).not.toContain("MARK-");
    expect(talkLeadSystem(input, rules)).toBe(GOLDEN);
  });

  it("AC-26b 도움 순서 문장 · 지금 길의 행동 규칙 · 카드 칸 이름표가 없다", () => {
    const system = talkLeadSystem(leadInput(), rules);
    expect(system).not.toMatch(/first .* only after that/);
    expect(system).not.toContain("Rules:");
    expect(system).not.toContain("Required questions");
    expect(system).not.toContain("Expected flow");
    expect(system).not.toContain("More talk");
    // 지금 길의 고정부 규칙 줄(행동 규칙 81줄)은 하나도 들지 않는다 — 안전 문장 넷만 겹친다
    const aSystem = talkLessonSystem(lessonInput(3), lessonRules(3));
    const aRules = aSystem
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2));
    const shared = aRules.filter((rule) => SAFETY.includes(rule));
    // 'Use only content …' 은 지금 길에서 학습자 문장과 한 줄이라 줄로는 셋이 겹친다
    expect(shared).toHaveLength(3);
    for (const rule of aRules)
      if (!SAFETY.includes(rule)) expect(system).not.toContain(rule);
  });

  it("AC-26b 안전 문장 넷은 지금 길의 고정부와 글자까지 같고 이름 문장(FR-11)이 글자 그대로 있다", () => {
    const system = talkLeadSystem(leadInput(), rules);
    const aSystem = talkLessonSystem(lessonInput(3), lessonRules(3));
    for (const sentence of SAFETY) {
      expect(system).toContain(sentence);
      expect(aSystem).toContain(sentence);
    }
    expect(system).toContain(
      'If the child names a person, a school, or the place they live, do not repeat the name; say "your friend", "your school", "your town". A pet\'s name is fine.',
    );
  });
});

describe("AC-26h 카드는 정보(spec 설계 7 · FR-8)", () => {
  it("AC-26h 요청에 카드 필수 질문 · 묻는 법 · 답 예시 · 더 이야기할 거리 · 예상 흐름이 없고 주제 · 목표 표현 · 단원 단어가 있다", () => {
    const built = buildAiRequest(talkLeadTurnSpec, leadInput(), {
      config: {
        purpose: "talk_turn",
        model: "claude-sonnet-5-5",
        effort: "low",
        thinking: { type: "disabled" },
        maxTokens: 1000,
        timeoutMs: 10_000,
        fallbacks: null,
        betas: [],
      },
      masker: (text) => ({ text, names: 0, contacts: 0 }),
      rules,
    });
    const request = [
      built.body.system,
      ...built.body.messages.map((m) => m.content),
    ].join("\n");
    /** 글 칸의 모든 글(중첩 객체 · 목록 안까지). */
    const textsOf = (value: unknown): string[] =>
      typeof value === "string"
        ? [value]
        : Array.isArray(value)
          ? value.flatMap(textsOf)
          : value !== null && typeof value === "object"
            ? Object.values(value).flatMap(textsOf)
            : [];
    // 시드 카드 항목의 실제 칸(required · more · sceneOpener): 질문 · 뜻 · 한국어 힌트 · 힌트 단 · 답 예시 · 쉬운 질문 · 목표 id.
    // targets 는 단원 단어(Goal words 줄에 실림)라 빼고, ask 는 묻는 법 부호라 아래에서 따로 본다.
    const ITEM_KEYS = [
      "en",
      "ko",
      "hintKo",
      "hints",
      "answerExample",
      "easyQuestion",
      "goals",
    ];
    const cardTexts: string[] = [];
    const asks = new Set<string>();
    for (const { card } of LESSON_SEED.lessons) {
      const items = [
        ...((card.required as Record<string, unknown>[]) ?? []),
        ...((card.more as Record<string, unknown>[]) ?? []),
      ];
      for (const item of items) {
        for (const key of ITEM_KEYS) cardTexts.push(...textsOf(item[key]));
        if (typeof item.ask === "string") asks.add(item.ask);
      }
      cardTexts.push(...textsOf(card.sceneOpener));
      cardTexts.push(...textsOf(card.flow));
    }
    expect(cardTexts.length).toBeGreaterThan(0);
    for (const text of cardTexts) expect(request).not.toContain(text);
    // 묻는 법(ask)은 부호('first' · 're_ask' …)라 글 대조 대신 칸 이름표와 영어 낱말이 아닌 부호가 없음을 본다
    expect(asks.size).toBeGreaterThan(0);
    expect(request).not.toMatch(/\bask\s*[:=]/i);
    for (const ask of asks)
      if (ask.includes("_")) expect(request).not.toContain(ask);
    // 주제 · 목표 표현(3단계 단원 1 은 P 의 영어 글) · 단원 단어
    expect(request).toContain(`- Topic: ${TALK_LEAD_TEXT_L3U1.topicEn}.`);
    expect(request).toContain(TALK_LEAD_TEXT_L3U1.sentencesLikeEn);
    expect(request).toContain(UNIT?.words.join(", "));
  });
});

describe("AC-26b 사실 알림 · 아이 입력 줄(spec 설계 2 표)", () => {
  it("AC-26b 대화 토막 첫 호출은 인사 이음 · 대화 시작 줄을 싣고 아이 입력 줄이 없다", () => {
    expect(talkLeadUserMessage(firstTurn())).toBe(
      [
        "Greeting so far:",
        'Teacher: "Hello, {NAME}! How are you?"',
        'Child: "I am fine."',
        "",
        TALK_LEAD_STATUS_HEAD,
        "- Goal words the child has said so far: none yet.",
        "- The talk part starts now.",
      ].join("\n"),
    );
  });

  it("AC-26b 아이 입력 줄은 실험 C 의 세 꼴과 더 이야기하기 한 꼴이고, 그 뒤에 빈 줄과 사실 알림이 붙는다", () => {
    const status = { goalWordsSaid: ["go"], childTurn: { n: 3, offerAt: 15 } };
    const message = (child: TalkLeadTurn["child"]) =>
      talkLeadUserMessage({ child, status });
    const tail = [
      "",
      TALK_LEAD_STATUS_HEAD,
      "- Child turn 3 (the app offers to finish around turn 15).",
      "- Goal words the child has said so far: go.",
    ].join("\n");
    expect(message({ kind: "speech", heard: "I go to the beach." })).toBe(
      `Child (speech-to-text): "I go to the beach."\n${tail}`,
    );
    expect(message({ kind: "dont_know" })).toBe(
      `(The child pressed the "I don't know" button.)\n${tail}`,
    );
    expect(message({ kind: "silent" })).toBe(
      `(The child said nothing.)\n${tail}`,
    );
    expect(message({ kind: "more_talk" })).toBe(
      `(The child chose to talk more.)\n${tail}`,
    );
  });

  it("AC-26b 값이 있는 줄만 표의 차례대로 싣고, 'Goal words' 줄은 늘 싣는다", () => {
    expect(talkLeadStatusLines({ goalWordsSaid: [] })).toEqual([
      "Goal words the child has said so far: none yet.",
    ]);
    expect(
      talkLeadStatusLines({
        childTurn: { n: 15, offerAt: 15 },
        goalWordsSaid: ["go", "sea"],
        help: { easierQuestion: 1, choices: 2, modelSentence: 0 },
        lastModelSentence: "I see the sea.",
        soundNotes: [{ heard: "see", like: "sea" }],
        talkStarts: false,
        closingTurn: true,
        koTaught: "I like swimming.",
      }),
    ).toEqual([
      "Child turn 15 (the app offers to finish around turn 15).",
      "Goal words the child has said so far: go, sea.",
      "Help you gave in this lesson: easier question 1, choices 2, model sentence 0.",
      'Your last turn gave a model sentence to repeat: "I see the sea.".',
      'Sound note: "see" sounds like "sea".',
      "This is the closing turn. After your turn the app shows the buttons 'talk more' and 'finish'.",
      'The child asked in Korean and was taught: "I like swimming.".',
    ]);
  });

  it("AC-26b 도움이 하나도 없거나 따라 할 문장 · 한국어 도움이 빈 글이면 그 줄을 싣지 않는다", () => {
    expect(
      talkLeadStatusLines({
        goalWordsSaid: [],
        help: { easierQuestion: 0, choices: 0, modelSentence: 0 },
        lastModelSentence: " ",
        koTaught: "",
        soundNotes: [],
      }),
    ).toEqual(["Goal words the child has said so far: none yet."]);
  });

  it("AC-26b 'Goal words' 값은 앞 차례들의 들린 글에서 처음 나온 단원 단어 차례다(평가 결과가 아님)", () => {
    expect(
      talkLeadGoalWordsSaidOf(
        ["I go to the beach.", "Sea! I see the sea.", "We go."],
        UNIT?.words ?? [],
      ),
    ).toEqual(["go", "beach", "sea", "see"]);
    expect(talkLeadGoalWordsSaidOf([], UNIT?.words ?? [])).toEqual([]);
  });

  it("AC-26b 'Sound note' 는 들린 글이 두 낱말 이하일 때만 귀띔을 옮긴다", () => {
    const hints = [{ heard: "teach", expected: "beach" }];
    expect(talkLeadSoundNotesOf("Teach.", hints)).toEqual([
      { heard: "teach", like: "beach" },
    ]);
    expect(talkLeadSoundNotesOf("The teach.", hints)).toHaveLength(1);
    expect(talkLeadSoundNotesOf("I go teach.", hints)).toEqual([]);
    expect(talkLeadSoundNotesOf("", hints)).toEqual([]);
  });
});

describe("AC-26b 대화 기록(spec 설계 2)", () => {
  const raw = JSON.stringify(OUTPUT);

  it("AC-26b 앞 응답은 모델이 낸 JSON 원문 그대로이고, 나간 말이 같으면 원문을 바꾸지 않는다", () => {
    expect(talkLeadAssistantOf(raw)).toBe(raw);
    expect(talkLeadAssistantOf(raw, OUTPUT.say)).toBe(raw);
    expect(talkLeadAssistantOf("not json", "Hi.")).toBe("not json");
  });

  it("AC-26b 문장 문이 바꾼 말이 있으면 say 칸만 나간 글로 바꾸고 칸 차례는 그대로다", () => {
    const sent = "Oh, you go to the beach! What do you do there?";
    const entry = talkLeadAssistantOf(raw, sent);
    const parsed = JSON.parse(entry) as Record<string, unknown>;
    expect(parsed.say).toBe(sent);
    expect(Object.keys(parsed)).toEqual([...TALK_LEAD_OUTPUT_FIELDS]);
    expect({ ...parsed, say: OUTPUT.say }).toEqual(OUTPUT);
  });

  it("AC-26b 메시지는 지난 차례(사용자 · 선생님) 뒤에 이번 사용자 메시지 하나다(차례당 호출 1)", () => {
    const history = [
      { user: talkLeadUserMessage(firstTurn()), assistant: raw },
    ];
    const turn: TalkLeadTurn = {
      child: { kind: "speech", heard: "I see sea." },
      status: { goalWordsSaid: [], childTurn: { n: 1, offerAt: 15 } },
    };
    const messages = talkLeadMessages(leadInput({ history, turn }));
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(messages[0]?.content).toBe(history[0]?.user);
    expect(messages[1]?.content).toBe(raw);
    expect(messages[2]?.content).toBe(talkLeadUserMessage(turn));
  });
});

describe("AC-26b 응답 아홉 칸 · 호출 규격", () => {
  it("AC-26b 응답 칸은 아홉이고 칸 차례가 spec 의 생성 차례와 같다", () => {
    expect([...TALK_LEAD_OUTPUT_FIELDS]).toEqual([
      "reading",
      "move",
      "say",
      "say_ko",
      "model_sentence",
      "hint_ko",
      "hint_en",
      "goal_words_i_said",
      "child_used_on_own",
    ]);
    expect(TalkLeadOutputSchema.safeParse(OUTPUT).success).toBe(true);
    expect(talkLeadTurnSpec.wireSchema(leadInput(), rules)).toBe(
      TalkLeadOutputSchema,
    );
  });

  it("AC-26b 호출은 지금 회화 턴과 같은 설정 키(talk_turn)를 쓰고 새 설정 키를 만들지 않는다", () => {
    expect(talkLeadTurnSpec.purpose).toBe("talk_turn");
    expect(talkLeadTurnSpec.title).toBe(TALK_LEAD_TITLE);
    expect(talkLeadTurnSpec.multiTurn).toBe(true);
    expect(settingKeysOf(talkLeadTurnSpec.purpose, 3)).toEqual({
      model: "ai.model.talk_turn.1-3",
      effort: "ai.effort.talk_turn.1-3",
      thinking: "ai.thinking.talk_turn.1-3",
      maxTokens: "ai.max_tokens.talk_turn",
      timeout: "ai.timeout_seconds.realtime",
    });
    const known = new Set(Object.keys(TEST_SETTINGS));
    for (const key of Object.keys(talkLeadTurnSpec.settingSchemas))
      expect(known.has(key)).toBe(true);
  });

  it("AC-26b 정규화는 응답을 고쳐 쓰지 않고, 열거 밖 · 빈 말 칸이면 null(다시 시도 규칙)이다", () => {
    const prepared = prepareAnswer(
      { ...OUTPUT, reading: "Clear_Answer", move: " REACT_ONLY " },
      talkLeadTurnSpec.enumPaths,
    );
    expect(normalizeTalkLead(prepared)).toEqual({
      ...OUTPUT,
      reading: "clear_answer",
      move: "react_only",
    });
    expect(normalizeTalkLead({ ...OUTPUT, reading: "fine" })).toBeNull();
    expect(normalizeTalkLead({ ...OUTPUT, move: "ask_two" })).toBeNull();
    expect(normalizeTalkLead({ ...OUTPUT, say: "" })).toBeNull();
    expect(normalizeTalkLead({ ...OUTPUT, say: 3 })).toBeNull();
    expect(normalizeTalkLead("oops")).toBeNull();
    // 빠진 글 칸 · 목록 칸은 빈 값
    const { hint_ko: _k, child_used_on_own: _c, ...rest } = OUTPUT;
    expect(normalizeTalkLead(rest)).toEqual({
      ...OUTPUT,
      hint_ko: "",
      child_used_on_own: [],
    });
    expect(
      talkLeadTurnSpec.validate({ ...OUTPUT, say: " " }, leadInput(), rules),
    ).toHaveLength(1);
    expect(talkLeadTurnSpec.validate(OUTPUT, leadInput(), rules)).toEqual([]);
  });

  it("AC-26b 출력 검사는 뜻 · 힌트 둘을 보고, 힌트가 걸리면 둘 다 비우며 턴을 실패로 보지 않는다", () => {
    const options = { forbidden: SAMPLE_FORBIDDEN, sentenceMaxWords: 7 };
    const clean = checkOutputFields(talkLeadCheckFields(OUTPUT), options);
    expect(clean.size).toBe(0);
    expect(applyTalkLeadChecks(OUTPUT, clean)).toEqual({
      value: OUTPUT,
      changed: false,
      fatal: false,
    });
    const bad = { ...OUTPUT, hint_en: "You are stupid." };
    const hits = checkOutputFields(talkLeadCheckFields(bad), options);
    expect([...hits.keys()]).toEqual(["hint_en"]);
    const result = applyTalkLeadChecks(bad, hits);
    expect(result.fatal).toBe(false);
    expect(result.changed).toBe(true);
    expect(result.value).toEqual({ ...OUTPUT, hint_ko: "", hint_en: "" });
  });
});

describe("AC-26l 이름 자리 밖 아이 이름 없음(NFR-3)", () => {
  it("AC-26l 가림은 이번 아이 말 · 인사 이음의 아이 말 · 한국어 도움 표현에 걸리고 안내문에는 아이 이름이 없다", () => {
    const name = "Jisu";
    const masker: Masker = (text) => ({
      text: text.replaceAll(name, "{NAME}"),
      names: text.includes(name) ? 1 : 0,
      contacts: 0,
    });
    const config = {
      purpose: "talk_turn" as const,
      model: "claude-sonnet-5-5",
      effort: "low" as const,
      thinking: { type: "disabled" as const },
      maxTokens: 1000,
      timeoutMs: 10_000,
      fallbacks: null,
      betas: [],
    };
    const first = buildAiRequest(
      talkLeadTurnSpec,
      leadInput({
        turn: {
          ...firstTurn(),
          greeting: [
            { speaker: "teacher", text: "Hello, {NAME}! How are you?" },
            { speaker: "child", text: `I am ${name}. I am fine.` },
          ],
        },
      }),
      { config, masker, rules },
    );
    const later = buildAiRequest(
      talkLeadTurnSpec,
      leadInput({
        turn: {
          child: { kind: "speech", heard: `My friend ${name} goes too.` },
          status: { goalWordsSaid: [], koTaught: `${name} and I swim.` },
        },
      }),
      { config, masker, rules },
    );
    for (const built of [first, later]) {
      const all = [
        built.body.system,
        ...built.body.messages.map((m) => m.content),
      ].join("\n");
      expect(all).not.toContain(name);
      expect(all).toContain("{NAME}");
    }
    expect(first.masked.names).toBe(1);
    expect(later.masked.names).toBe(2);
  });
});
