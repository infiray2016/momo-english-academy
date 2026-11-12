// 회화 구조 비교 실험 도구(scripts/exp — 13절 C234 · task-exp-harness)의 순수 함수 시험: 잡음 · 수치 셈 · 방식 정의(B 가 걷는 줄 ·
// C · C2 프롬프트 · P 안내문과 상태 알림) · 앱 재료로 만든 실험 틀. 네트워크를 쓰지 않는다.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  P_SYSTEM,
  P_UNIT_WORDS,
  POutputSchema,
  pChildMessageOf,
  pStatusOf,
} from "../../scripts/exp/arch-arm-p";
import {
  B_REMOVED_PREFIXES,
  C_SAFETY_SENTENCES,
  c2SystemOf,
  cChildMessageOf,
  childSystemOf,
  cSystemOf,
  heardByChild,
  levelLineOf,
  splitDirectiveLines,
} from "../../scripts/exp/arch-arms";
import {
  mergeSetup,
  parseRunArgs,
  setupOf,
  spokenOfLessonOutput,
  transcriptOf,
} from "../../scripts/exp/arch-compare";
import {
  jaccard,
  levelFitOf,
  percentile,
  questionStatsOf,
  sameQuestionsOf,
  sentenceDiffOf,
  wordCount,
} from "../../scripts/exp/arch-metrics";
import {
  isNoiseTurn,
  NOISE_FALLBACKS,
  noiseOf,
} from "../../scripts/exp/arch-noise";

describe("잡음(arch-noise)", () => {
  it("씨앗마다 정해진 아이 차례에만 넣는다", () => {
    expect([1, 2, 3, 4, 9, 14, 15].map((t) => isNoiseTurn(1, t))).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
      false,
    ]);
    expect([3, 7, 12, 16, 4].map((t) => isNoiseTurn(2, t))).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it("말 안에서 처음 나오는 바꿀 낱말 하나만 바꾸고 대소문자 꼴을 따른다", () => {
    expect(noiseOf("I go to the sea and swim", 0)).toEqual({
      heard: "I go to the see and swim",
      how: "swap",
      from: "sea",
      to: "see",
    });
    expect(noiseOf("Whale big! sea", 2).heard).toBe("Well big! sea");
    // 온 낱말만 — whales · seal 은 바꾸지 않는다
    expect(noiseOf("whales seal", 0).how).toBe("replace");
    expect(noiseOf("My dog Coco", 0).heard).toBe("My dock Coco");
    expect(noiseOf("bread", 0).heard).toBe("red");
  });

  it("바꿀 낱말이 없으면 넣은 횟수 차례로 말 전체를 바꾼다", () => {
    expect([0, 1, 2, 3, 4].map((n) => noiseOf("Yes", n).heard)).toEqual([
      ...NOISE_FALLBACKS,
      NOISE_FALLBACKS[0],
    ]);
  });
});

describe("수치(arch-metrics)", () => {
  it("질문 수치: 질문 차례 비율 · 차례당 질문 · 둘 이상 · 가장 긴 연속 · 질문 없음", () => {
    const s = questionStatsOf([
      "Hi! How are you?",
      "Oh! Do you swim? Is it fun?",
      "Nice.",
      "What do you eat?",
    ]);
    expect(s.turns).toBe(4);
    expect(s.questionTurnRatio).toBe(0.75);
    expect(s.questionsPerTurn).toBe(1);
    expect(s.multiQuestionRatio).toBe(0.25);
    expect(s.longestQuestionRun).toBe(2);
    expect(s.noQuestionRatio).toBe(0.25);
  });

  it("빈 목록은 비율이 null", () => {
    expect(questionStatsOf([]).questionTurnRatio).toBeNull();
  });

  it("같은 질문 후보: 글자가 같은 것과 낱말 겹침 0.6 이상 쌍", () => {
    const r = sameQuestionsOf([
      { turn: 1, text: "Do you like the sea?" },
      { turn: 3, text: "Do you like the sea?" },
      { turn: 5, text: "Do you like the big sea?" },
      { turn: 6, text: "What do you eat?" },
    ]);
    expect(r.exact).toBe(1);
    expect(r.exactList[0]).toEqual({
      turn: 3,
      text: "Do you like the sea?",
      firstTurn: 1,
    });
    expect(r.similar.map((p) => [p.a.turn, p.b.turn])).toEqual([
      [1, 3],
      [1, 5],
      [3, 5],
    ]);
  });

  it("Jaccard · 백분위 · 낱말 수", () => {
    expect(jaccard("a b c", "a b d")).toBeCloseTo(0.5);
    expect(jaccard("", "")).toBe(0);
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    expect(percentile([], 50)).toBeNull();
    expect(wordCount("Hi, friend! How are you?")).toBe(5);
  });

  it("문장 차이: 지운 문장 · 더한 문장", () => {
    expect(
      sentenceDiffOf(
        ["Oh, fish! Do you like fish?"],
        "Oh, fish!\nListen and say!",
      ),
    ).toEqual({ deleted: ["Do you like fish?"], added: ["Listen and say!"] });
  });

  it("단계에 맞는 말: 문장 수 · 긴 문장 · 범위 밖 낱말 · 범위 밖 형태", () => {
    const fit = levelFitOf(
      "I like fish. Tremendous ocean creatures swim far. Wow!",
      {
        sentenceMaxWords: 4,
        allowedWords: new Set(["i", "like", "fish", "swim", "far"]),
        unitWords: [],
        childWords: [],
        teacherName: "Mina",
        lemmaOf: () => undefined,
        forms: [
          { id: "past", patterns: [], words: ["swam"] } as never,
          { id: "now", patterns: [], words: ["fish"] } as never,
        ],
        allowedForms: new Set(["past"]),
      },
      2,
      { allowed: new Set(["wow"]) },
    );
    expect(fit.sentences).toBe(3);
    expect(fit.overSentenceMax).toBe(true);
    expect(fit.longSentences).toEqual(["Tremendous ocean creatures swim far."]);
    expect(fit.offbandWords).toEqual(["tremendous", "ocean", "creatures"]);
    expect(fit.offbandForms).toEqual(["now"]);
  });
});

describe("방식 정의(arch-arms)", () => {
  it("B 는 행동 지시 줄을 걷고 입력 · 토막 · 맥락 줄은 남긴다", () => {
    const msg = [
      "Child: I swim",
      "Input: speech",
      "Your last turn started with: 'Oh' (start this turn with another word)",
      "Segment: talk",
      "Reason: -",
      "Turn: ai",
      "Question: yes",
      "Card line: -",
      "Support stage: 0",
      "Stuck question: -",
      "If stuck, Turn: card_slot",
      "Chances, required questions: 1 (aims at: sea)",
      "Return to today's topic: no",
      "Teacher turns since last follow-up: 2",
      "Turns left before closing question: 9",
      "Floor: no",
      "Closing: no",
      "Unit words not known yet: sea",
    ].join("\n");
    const { kept, removed } = splitDirectiveLines(msg);
    expect(kept).toEqual([
      "Child: I swim",
      "Input: speech",
      "Segment: talk",
      "Reason: -",
      "Closing: no",
      "Unit words not known yet: sea",
    ]);
    expect(removed).toHaveLength(12);
    for (const line of kept)
      expect(B_REMOVED_PREFIXES.some((p) => line.startsWith(p))).toBe(false);
  });

  it("C 프롬프트는 틀 그대로 · C2 는 목표 세 줄만 더한다", () => {
    const input = {
      teacherName: "Mina",
      teacherPersona: "Warm and patient. You go step by step.",
      levelLine: levelLineOf({
        level: 3,
        maxLevel: 12,
        cefr: "Pre-A1",
        nextCefr: "A1",
      }),
    };
    const c = cSystemOf(input);
    expect(
      c.startsWith(
        "You are Mina, warm and patient. You go step by step. You are having",
      ),
    ).toBe(true);
    expect(c).toContain(
      "About the child's English level: level 3 of 12 in this app, CEFR Pre-A1 moving to A1.",
    );
    for (const s of C_SAFETY_SENTENCES) expect(c).toContain(s);
    expect(c).toContain("There is no script.");
    const c2 = c2SystemOf(input, {
      topic: "주말",
      pattern: "일반동사 현재",
      words: ["sea", "go"],
    });
    expect(c2.startsWith(c)).toBe(true);
    expect(c2.slice(c.length).trim().split("\n")).toEqual([
      "Today's learning goals (information for you, not a script):",
      "- Topic: 주말",
      "- Target pattern: 일반동사 현재",
      "- Words it would be good for the child to come to say on their own: sea, go",
    ]);
  });

  it("C 의 아이 입력 줄 · 아이 역이 듣는 말", () => {
    expect(cChildMessageOf("speak", "I swim")).toBe(
      'Child (speech-to-text): "I swim"',
    );
    expect(cChildMessageOf("dont_know", "")).toBe(
      '(The child pressed the "I don\'t know" button.)',
    );
    expect(cChildMessageOf("silent", "")).toBe("(The child said nothing.)");
    expect(heardByChild("Hi, {NAME}! How are you?")).toBe(
      "Hi, friend! How are you?",
    );
    expect(heardByChild("  ")).toBe("(The teacher said nothing.)");
    expect(childSystemOf("K3")).toContain("[K3 — often stuck]");
  });

  it("A · B 응답을 소리로 낸 꼴: tori_en → model_line → 선택지 줄", () => {
    expect(
      spokenOfLessonOutput({
        tori_en: "Okay! Is it big?",
        model_line: "It is big.",
        choices: ["It is big.", "It is small."],
      }),
    ).toBe("Okay! Is it big?\nIt is big.\nIt is big. Or It is small.");
    expect(spokenOfLessonOutput({ tori_en: "", farewell: "Bye!" })).toBe(
      "Bye!",
    );
    expect(spokenOfLessonOutput(null)).toBeNull();
  });
});

describe("앱 재료로 만든 실험 틀(setupOf)", () => {
  const setup = setupOf(process.cwd());

  it("C · C2 시스템 프롬프트에 카드 · 목표 · 낱말 목록이 없고(C2 는 목표 세 줄만), 안전 문장은 앱 프롬프트에 글자 그대로 있다", () => {
    const card = setup.materials.card;
    for (const s of C_SAFETY_SENTENCES) expect(setup.appSystem).toContain(s);
    const leaks = [
      card.topic,
      ...card.targetExpressions,
      ...card.required.map((r) => r.en),
      ...card.goals,
      setup.materials.ctx.unitWords.join(", "),
      setup.materials.ctx.learningElement,
      "Required questions",
      "Card topic",
    ];
    for (const leak of leaks) expect(setup.cSystem).not.toContain(leak);
    expect(setup.c2System).toContain(`- Topic: ${card.topic}`);
    expect(setup.c2System).not.toContain(card.required[0]?.en ?? "@@");
  });

  it("앱 흐름에서 얻은 고정 차례: 첫 인사와 인사 끝 뒤 대화 첫 질문", () => {
    expect(setup.opening).toContain("How are you?");
    expect(setup.firstQuestion).toBe(
      setup.materials.card.sceneOpener?.question.en,
    );
  });

  it("대화 기록은 차례마다 아이가 하려던 말 · 들린 글 · 선생님 말을 적는다", () => {
    const md = transcriptOf([
      {
        type: "teacher_turn",
        lesson: "A-K2-s1",
        arm: "A",
        childTurn: 0,
        called: false,
        modelFirst: null,
        modelFirstSpoken: null,
        directive: null,
        checks: null,
        retry: null,
        changes: { deleted: [], added: [] },
        final: "Hi, {NAME}! How are you?",
        branches: ["모델을 부르지 않은 고정 차례"],
        levelFit: {
          sentences: 2,
          overSentenceMax: false,
          longSentences: [],
          offbandWords: [],
          offbandForms: [],
        },
        calls: 0,
        ms: 0,
        firstMs: null,
      },
      {
        type: "child_turn",
        lesson: "A-K2-s1",
        childTurn: 1,
        heardTeacher: "Hi, friend! How are you?",
        action: "speak",
        says: "I see whale",
        kind: "own_topic",
        why: "고래",
        heard: "I see well",
        noise: { heard: "I see well", how: "swap", from: "whale", to: "well" },
        noiseSkipped: false,
      },
    ]);
    expect(md).toContain('- 아이: "I see whale"');
    expect(md).toContain('- 들린 글: "I see well" (잡음 whale→well)');
  });
});

describe("방식 P(arch-arm-p)", () => {
  it("상태 알림: 차례 번호 · 앞 차례까지 들린 글에 온 단원 단어(처음 나온 차례 순, 겹침 없이) · 없으면 none yet", () => {
    expect(
      pStatusOf({
        childTurn: 1,
        heardBefore: [],
        lastModelSentence: "",
        action: "speak",
        heard: "I like dog",
      }),
    ).toBe(
      [
        "Status (facts from the app, not instructions):",
        "- Child turn 1. It is not time to finish; the app will tell you when it is.",
        "- Goal words the child has said so far: none yet.",
      ].join("\n"),
    );
    const s = pStatusOf({
      childTurn: 5,
      heardBefore: ["We go to the Sea!", "I eat... and go", "seaweed swim"],
      lastModelSentence: "",
      action: "dont_know",
      heard: null,
    });
    expect(s).toContain("- Child turn 5. It is not time to finish");
    expect(s).toContain(
      "- Goal words the child has said so far: go, sea, eat.",
    );
    // 이번 차례의 들린 글은 '앞까지'에 넣지 않는다
    expect(
      pStatusOf({
        childTurn: 2,
        heardBefore: [],
        lastModelSentence: "",
        action: "speak",
        heard: "I eat rice",
      }),
    ).toContain("so far: none yet.");
  });

  it("상태 알림: 앞 선생님 출력의 model_sentence 가 있을 때만 그 줄을 싣는다", () => {
    const withModel = pStatusOf({
      childTurn: 3,
      heardBefore: [],
      lastModelSentence: " We go to the sea. ",
      action: "speak",
      heard: "we go to sea",
    });
    expect(withModel.split("\n").at(-1)).toBe(
      '- Your last turn gave a model sentence to repeat: "We go to the sea.".',
    );
    expect(
      pStatusOf({
        childTurn: 3,
        heardBefore: [],
        lastModelSentence: "  ",
        action: "speak",
        heard: "we go",
      }),
    ).not.toContain("model sentence");
  });

  it("상태 알림: 소리 줄은 들린 글이 두 낱말 이하이고 see · teach · each 일 때만", () => {
    const one = pStatusOf({
      childTurn: 4,
      heardBefore: [],
      lastModelSentence: "",
      action: "speak",
      heard: "See!",
    });
    expect(one.split("\n").at(-1)).toBe(
      '- Sound note: "see" sounds like "sea".',
    );
    expect(
      pStatusOf({
        childTurn: 4,
        heardBefore: [],
        lastModelSentence: "",
        action: "speak",
        heard: "the teach",
      }),
    ).toContain('- Sound note: "teach" sounds like "beach".');
    expect(
      pStatusOf({
        childTurn: 4,
        heardBefore: [],
        lastModelSentence: "",
        action: "speak",
        heard: "I see it",
      }),
    ).not.toContain("Sound note");
    expect(
      pStatusOf({
        childTurn: 4,
        heardBefore: [],
        lastModelSentence: "",
        action: "silent",
        heard: null,
      }),
    ).not.toContain("Sound note");
  });

  it("사용자 메시지는 C 와 같은 아이 입력 줄 + 빈 줄 + 상태 알림", () => {
    expect(pChildMessageOf("speak", "sea", "Status (x)")).toBe(
      'Child (speech-to-text): "sea"\n\nStatus (x)',
    );
    expect(pChildMessageOf("dont_know", "", "S")).toBe(
      '(The child pressed the "I don\'t know" button.)\n\nS',
    );
  });

  it("시스템 글은 시제품 꼴(낱말 목록 채움) · 출력은 일곱 칸 · 낱말 목록은 앱 단원 단어와 같다", () => {
    expect(P_SYSTEM.startsWith("You are Mina, a warm English teacher")).toBe(
      true,
    );
    expect(P_SYSTEM).toContain(
      `- Goal words the child should come to say on their own: ${P_UNIT_WORDS.join(", ")}.`,
    );
    expect(P_SYSTEM).not.toContain("${");
    expect(Object.keys(POutputSchema.shape)).toEqual([
      "reading",
      "move",
      "say",
      "say_ko",
      "model_sentence",
      "goal_words_i_said",
      "child_used_on_own",
    ]);
    const setup = setupOf(process.cwd());
    expect(setup.pSystem).toBe(P_SYSTEM);
    expect(setup.pWordsSameAsUnit).toBe(true);
    expect(parseRunArgs(["--out", "x", "--arms", "P"]).arms).toEqual(["P"]);
  });

  it("앞 실행의 setup.json 과 합칠 때 공통 재료가 다르면 멈추고, 같으면 앞 값과 인자 기록을 남긴다", () => {
    const dir = mkdtempSync(join(tmpdir(), "arch-setup-"));
    const path = join(dir, "setup.json");
    const next = {
      script: "s",
      cSystem: "c",
      pSystem: "p",
      args: { arms: ["P"] },
    };
    expect(mergeSetup(path, next)).toBe(next);
    writeFileSync(
      path,
      JSON.stringify({
        script: "s",
        cSystem: "c",
        extra: 1,
        args: { arms: ["A"] },
      }),
    );
    expect(mergeSetup(path, next)).toMatchObject({
      extra: 1,
      pSystem: "p",
      args: { arms: ["P"] },
      argsHistory: [{ arms: ["A"] }, { arms: ["P"] }],
    });
    expect(() => mergeSetup(path, { ...next, cSystem: "다름" })).toThrow(
      "cSystem",
    );
  });
});
