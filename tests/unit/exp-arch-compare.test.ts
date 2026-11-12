// 회화 구조 비교 실험 도구(scripts/exp — 13절 C234 · task-exp-harness)의 순수 함수 시험: 잡음 · 수치 셈 · 방식 정의(B 가 걷는 줄 ·
// C · C2 프롬프트 · P 안내문과 상태 알림) · 앱 재료로 만든 실험 틀. 네트워크를 쓰지 않는다.
// 묶음 X1(spec '회화 Claude 주도' 설계 9 · plan X1 · AC-26k): 첫 문장 시각 · 끝난 길과 마무리 단추 · 채점표 판 2 · 판정 모음 · 옛 기록 호환.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
  type LessonLog,
  type LogLine,
  mergeSetup,
  parseRunArgs,
  setupOf,
  spokenOfLessonOutput,
  type TeacherTurnLog,
  transcriptOf,
  WrapChildOutputSchema,
  wrapChoiceKindOf,
  wrapChoiceMessageOf,
} from "../../scripts/exp/arch-compare";
import {
  createFirstSentenceClock,
  createSpeechReader,
  endingHowOf,
  endingOf,
  type FirstSentence,
  firstSentenceStatsOf,
  jaccard,
  jsonStringFieldOf,
  judgeSummaryOf,
  lessonEndingOf,
  levelFitOf,
  pearson,
  percentile,
  pyRound,
  questionStatsOf,
  sameQuestionsOf,
  sentenceDiffOf,
  TEACHER_CLOSING_REASON,
  wordCount,
} from "../../scripts/exp/arch-metrics";
import {
  isNoiseTurn,
  NOISE_FALLBACKS,
  noiseOf,
} from "../../scripts/exp/arch-noise";
import {
  armMetricsOf,
  judgeRubricOf,
  judgeSummaryMarkdown,
  lessonMetricsOf,
  OWN_LIFE_RULE,
  PUSHY_RULE,
  parseJudgesArg,
  REPEAT_RULE,
  readJudgeSummary,
  readLessons,
} from "../../scripts/exp/arch-report";

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

// ── 묶음 X1 ─────────────────────────────────────────────────────

/** 지난 실행의 결과 폴더(저장소에 넣지 않은 실험 결과 — 이 작업 폴더나 위 폴더(워크트리면 본 저장소)에 있을 때만 호환 시험을 돈다). */
const PAST_NAME = join("docs", "research", "2026-11-12-회화-구조-비교-실험");
function pastDirOf(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const at = join(dir, PAST_NAME);
    if (existsSync(join(at, "metrics.json"))) return at;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const PAST = pastDirOf();

function chunks(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

const FIT = {
  sentences: 1,
  overSentenceMax: false,
  longSentences: [],
  offbandWords: [],
  offbandForms: [],
};

function teacherLine(
  childTurn: number,
  final: string,
  extra: Partial<TeacherTurnLog> = {},
): TeacherTurnLog {
  return {
    type: "teacher_turn",
    lesson: "P-K1-s1",
    arm: "P",
    childTurn,
    called: childTurn > 0,
    modelFirst: null,
    modelFirstSpoken: final,
    directive: null,
    checks: null,
    retry: null,
    changes: { deleted: [], added: [] },
    final,
    branches: ["그대로 나감"],
    levelFit: FIT,
    calls: childTurn > 0 ? 1 : 0,
    ms: 900,
    firstMs: 900,
    ...extra,
  };
}

function lessonLine(extra: Partial<LessonLog> = {}): LessonLog {
  return {
    type: "lesson",
    lesson: "P-K1-s1",
    arm: "P",
    child: "K1",
    seed: 1,
    turnsAsked: 16,
    childTurns: 2,
    ended: null,
    attempt: 1,
    failures: [],
    startedAt: "2026-11-13T00:00:00.000Z",
    finishedAt: "2026-11-13T00:01:00.000Z",
    ...extra,
  };
}

function lessonOf(lines: LogLine[]) {
  const meta = lines.find((l): l is LessonLog => l.type === "lesson");
  if (!meta) throw new Error("수업 줄 없음");
  return {
    name: meta.lesson,
    meta,
    calls: [],
    teachers: lines.filter(
      (l): l is TeacherTurnLog => l.type === "teacher_turn",
    ),
    children: [],
  };
}

describe("AC-26k 첫 문장 시각(흘려 받기)", () => {
  it("AC-26k say 칸은 앞 칸(reading · move)이 무엇이든 칸 이름으로 찾아, 조각 경계에 걸친 이스케이프를 이어 첫 문장을 낸다", () => {
    const json = JSON.stringify({
      reading: "clear_answer",
      move: "react_and_follow_up",
      say: 'Wow, a "big" whale! Do you like the sea?',
      say_ko: "와, 큰 고래! 바다 좋아해?",
    });
    // JSON 글에서 따옴표는 \" 이스케이프로 오고, 세 글자 조각이라 이스케이프가 조각 경계에 걸린다
    expect(json).toContain('\\"big\\"');
    const reader = createSpeechReader("say");
    const got: string[][] = chunks(json, 3).map((c) => reader.push(c));
    const firstAt = got.findIndex((g) => g.length > 0);
    expect(got[firstAt]).toEqual(['Wow, a "big" whale!']);
    // 첫 문장은 뒤 글의 공백이 온 뒤에야 끝난다(앱 읽개와 같은 규칙) — 그 조각 전까지는 비어 있다
    expect(firstAt).toBeGreaterThan(0);
    expect(got.flat()).toEqual(['Wow, a "big" whale!', "Do you like the sea?"]);
  });

  it("AC-26k tori_en 칸은 앱 읽개 그대로: child_kind · stuck 뒤면 흘리고, 칸 차례를 어기면 흘리지 않는다", () => {
    const ok = createSpeechReader("tori_en");
    const okJson =
      '{"child_kind":"answer","stuck":false,"tori_en":"Nice! I see. What do you eat?"}';
    expect(chunks(okJson, 5).flatMap((c) => ok.push(c))).toEqual([
      "Nice!",
      "I see.",
      "What do you eat?",
    ]);
    const bad = createSpeechReader("tori_en");
    const badJson = '{"say_ko":"x","tori_en":"Nice! I see."}';
    expect(chunks(badJson, 5).flatMap((c) => bad.push(c))).toEqual([]);
  });

  it("AC-26k JSON 칸 풀기: 끝나지 않은 글은 받은 데까지, 안쪽 객체의 같은 이름 칸 · 글 안의 따옴표는 칸으로 읽지 않는다", () => {
    expect(jsonStringFieldOf('{"say":"Hi the', "say")).toEqual({
      text: "Hi the",
      closed: false,
    });
    expect(jsonStringFieldOf('{"say":"Hi \\u00', "say")).toEqual({
      text: "Hi ",
      closed: false,
    });
    expect(
      jsonStringFieldOf(
        '{"x":{"say":"no"},"note":"\\"say\\":","say":"yes"}',
        "say",
      ),
    ).toEqual({ text: "yes", closed: true });
    expect(jsonStringFieldOf('{"reading":"clear', "say")).toBeNull();
    expect(jsonStringFieldOf('{"say":3}', "say")).toBeNull();
  });

  it("AC-26k 시계: 흘려 읽은 첫 문장은 그 조각이 온 때, 흘리지 못했으면 호출이 끝난 때(from end)로 적고 물음 문장인지 적는다", () => {
    let now = 1000;
    const clock = createFirstSentenceClock("say", () => now);
    for (const [at, c] of [
      [1100, '{"reading":"clear_answer","move":"react_only","say":"Do you'],
      [1350, " like fish? Me too"],
      [1600, '!","say_ko":"..."}'],
    ] as const) {
      now = at;
      clock.text(c);
    }
    expect(clock.done(1700, "")).toEqual({
      ms: 350,
      from: "stream",
      text: "Do you like fish?",
      question: true,
    });
    const late = createFirstSentenceClock("tori_en", () => 0);
    const out = '{"tori_en":"Great job.","stuck":false}';
    late.text('{"say_ko":"","tori_en":"Great job.","stuck":false}');
    expect(late.done(2400, out)).toEqual({
      ms: 2400,
      from: "end",
      text: "Great job.",
      question: false,
    });
  });

  it("AC-26k 수치: 첫 문장 시간 중앙값 · p95(전부 · 첫 문장이 물음 아닌 차례), 호출 끝으로 잰 차례 수 — 옛 기록(칸 없음)은 셈에서 빠진다", () => {
    const f = (
      ms: number,
      question: boolean,
      from: FirstSentence["from"] = "stream",
    ): FirstSentence => ({
      ms,
      from,
      text: question ? "Why?" : "Nice.",
      question,
    });
    expect(
      firstSentenceStatsOf([
        f(400, false),
        f(800, true),
        f(600, false),
        f(2000, false, "end"),
      ]),
    ).toEqual({
      turns: 4,
      msMedian: 700,
      msP95: 2000,
      plainTurns: 3,
      plainMsMedian: 600,
      plainMsP95: 2000,
      fromEnd: 1,
    });
    const m = lessonMetricsOf(
      lessonOf([
        teacherLine(0, "Hi! How are you?"),
        teacherLine(1, "Nice. Do you swim?", { firstSentence: f(500, false) }),
        teacherLine(2, "Cool!"),
        lessonLine(),
      ]),
    );
    expect(m.firstSentence).toMatchObject({ turns: 1, msMedian: 500 });
    expect(m.calls.firstMs).toEqual([900, 900]);
  });
});

describe("AC-26k 마무리 기록(끝난 길 · 마무리 차례의 말 · 두 단추)", () => {
  it("AC-26k 끝난 길: 앱의 마무리 차례(고르기 · 닫힘) · 선생님이 스스로 마무리함 · 아이 차례 상한 · 그 밖", () => {
    expect(endingHowOf(null, [])).toBe("turn_cap");
    expect(
      endingHowOf(
        "아이 차례 16 앞: 고르기 차례(마무리 물음)에 닿아 멈춘다",
        [],
      ),
    ).toBe("app_closing");
    expect(endingHowOf("아이 차례 9 앞: 대화가 닫혔다", [])).toBe(
      "app_closing",
    );
    expect(endingHowOf(`아이 차례 7: ${TEACHER_CLOSING_REASON}`, [])).toBe(
      "teacher_closing",
    );
    expect(endingHowOf("아이 차례 3: 선생님 차례 뒤가 아니다", [])).toBe(
      "other",
    );
    expect(endingHowOf(null, ["호출 실패"])).toBe("other");
    expect(wrapChoiceKindOf("고르기 차례(마무리 물음)에 닿아 멈춘다")).toBe(
      "closing",
    );
    expect(wrapChoiceKindOf("고르기 차례(마무리 제안)에 닿아 멈춘다")).toBe(
      "suggestion",
    );
    expect(wrapChoiceKindOf("대화가 닫혔다")).toBeNull();
  });

  it("AC-26k 마무리 차례의 말 · 고른 단추를 기록에 남기고, 대화 기록에도 적는다", () => {
    const choice = {
      childTurn: 15,
      kind: "suggestion" as const,
      line: "Do you want to talk more?",
      picked: "more" as const,
      says: "",
      why: "더 하고 싶다",
      continued: false,
    };
    const ending = lessonEndingOf({
      ended: "아이 차례 15 앞: 고르기 차례(마무리 제안)에 닿아 멈춘다",
      failures: [],
      childTurns: 14,
      lastLine: "Do you want to talk more?",
      choices: [choice],
    });
    expect(ending).toEqual({
      how: "app_closing",
      childTurns: 14,
      line: "Do you want to talk more?",
      reason: "아이 차례 15 앞: 고르기 차례(마무리 제안)에 닿아 멈춘다",
      choices: [choice],
    });
    expect(
      lessonEndingOf({
        ended: null,
        failures: [],
        childTurns: 16,
        lastLine: "Bye?",
        choices: [],
      }).line,
    ).toBeNull();
    const md = transcriptOf([
      teacherLine(0, "Hi!"),
      lessonLine({ ended: ending.reason, ending }),
    ]);
    expect(md).toContain(
      "- 마무리 단추(아이 차례 15 앞 · 마무리 제안): 더 이야기하기 · 도구가 잇지 않아 여기서 끝남 · 더 하고 싶다",
    );
    const m = lessonMetricsOf(
      lessonOf([
        teacherLine(0, "Hi!"),
        lessonLine({ ended: ending.reason, ending }),
      ]),
    );
    expect(m.ending).toEqual({
      how: "app_closing",
      line: "Do you want to talk more?",
      reason: ending.reason,
      choices: [
        { childTurn: 15, kind: "suggestion", picked: "more", continued: false },
      ],
    });
  });

  it("AC-26k 아이 역 출력에 고른 단추 칸 하나(wrap_choice: more · stop)를 더하고, 안내는 기본을 '더 이야기하기'로 둔다", () => {
    const base = { action: "speak", says: "", kind: "answer", why: "더" };
    expect(
      WrapChildOutputSchema.safeParse({ ...base, wrap_choice: "more" }).success,
    ).toBe(true);
    expect(
      WrapChildOutputSchema.safeParse({ ...base, wrap_choice: "stop" }).success,
    ).toBe(true);
    expect(
      WrapChildOutputSchema.safeParse({ ...base, wrap_choice: "later" })
        .success,
    ).toBe(false);
    expect(WrapChildOutputSchema.safeParse(base).success).toBe(false);
    expect(Object.keys(WrapChildOutputSchema.shape)).toEqual([
      "action",
      "says",
      "kind",
      "why",
      "wrap_choice",
    ]);
    const msg = wrapChoiceMessageOf("Do you want to talk more?");
    expect(msg.startsWith("Teacher: Do you want to talk more?\n\n")).toBe(true);
    expect(msg).toContain('press "Talk more" unless you really want to stop');
  });

  it("AC-26k 옛 기록(ending 없음)은 ended 글과 마지막 선생님 말로 끝난 길을 정하고 고른 단추는 없다", () => {
    const meta = lessonLine({
      lesson: "A-K1-s1",
      arm: "A",
      ended: "아이 차례 16 앞: 고르기 차례(마무리 물음)에 닿아 멈춘다",
      childTurns: 15,
    });
    expect(
      endingOf(meta, [
        teacherLine(15, "Do you want to talk more?"),
        teacherLine(0, "Hi!"),
      ]),
    ).toEqual({
      how: "app_closing",
      childTurns: 15,
      line: "Do you want to talk more?",
      reason: meta.ended,
      choices: [],
    });
    expect(endingOf(lessonLine(), [teacherLine(16, "Bye!")]).how).toBe(
      "turn_cap",
    );
  });
});

describe("AC-26k 가려 읽는 판정의 채점표(판 2)", () => {
  const md = judgeRubricOf("/out/run");

  it("AC-26k 바뀐 셋: '사람의 삶을 제 것으로 말함' 칸 · 반복 질문에서 되묻기를 뺌 · '캐묻는 느낌' 칸과 한 문장 기준", () => {
    expect(md).toContain(
      `| \`own_life\` 사람의 삶을 제 것으로 말함 | true · false, \`own_routine\` 은 문장 목록 | ${OWN_LIFE_RULE} |`,
    );
    expect(OWN_LIFE_RULE).toContain(
      "나이 · 가족 · 집 · 학교(age, family, home, school)",
    );
    expect(OWN_LIFE_RULE).toContain(
      "따라 할 문장(아이에게 따라 말하게 한 본보기)과 아이 말을 되받은 문장은 세지 않습니다",
    );
    expect(OWN_LIFE_RULE).toContain("`own_routine`");
    expect(REPEAT_RULE).toContain(
      "잘못 들려 되묻는 것(들린 글이 질문과 맞지 않아 다시 묻는 것)은 반복 질문으로 세지 않습니다",
    );
    expect(md).toContain(
      `| \`pushy\` 캐묻는 느낌 | true · false | ${PUSHY_RULE} |`,
    );
    expect(md).not.toContain("밀어붙임");
    // 한 문장: 마침표로 끝나는 문장이 하나뿐이다(괄호 안의 인용 물음표는 문장 끝이 아님)
    expect(PUSHY_RULE.split(/다\. |니다\. /)).toHaveLength(1);
    // 지난 두 판정자가 갈린 곳(따라 말하기 권유 · 되묻기를 질문으로 세는가)을 정한다
    expect(PUSHY_RULE).toContain("'Can you say it?' 같은 따라 말하기 권유");
    expect(PUSHY_RULE).toContain("잘못 들려 되묻는 물음");
  });

  it("AC-26k 나머지는 지난 판정 브리프 꼴 그대로: 읽을 폴더 · 결과 파일 · 결과 JSON 칸", () => {
    expect(md).toContain(
      "`/out/run/blind/` 의 `T*.md` 전부. 이 폴더만 읽습니다.",
    );
    expect(md).toContain("결과 폴더는 `/out/run` 이고");
    expect(md).toContain(
      '"made_up": false, "own_life": false, "own_routine": [], "help": null',
    );
    for (const col of [
      "link",
      "uptake",
      "misread",
      "q_count",
      "made_up",
      "help",
      "follow",
      "level",
      "note",
      "feel",
      "memory",
      "teaching",
      "child_room",
    ])
      expect(md).toContain(`| \`${col}\``);
  });
});

describe("AC-26k 판정 모음(judge-agg.py 를 도구 안으로)", () => {
  it("AC-26k 반올림은 파이썬 round 와 같다(이진 값 그대로 · 딱 가운데면 짝수 쪽)", () => {
    expect(pyRound(6.25, 1)).toBe(6.2);
    expect(pyRound(6.75, 1)).toBe(6.8);
    expect(pyRound(1.125, 2)).toBe(1.12);
    expect(pyRound(2.675, 2)).toBe(2.67);
    expect(pyRound(0.125, 2)).toBe(0.12);
    expect(pyRound(1.44, 2)).toBe(1.44);
    expect(pyRound(15.0537634, 1)).toBe(15.1);
    expect(pyRound(-2.5, 0)).toBe(-2);
    expect(pearson([1, 2, 3], [2, 4, 7])).toBeCloseTo(0.9934, 3);
    expect(pearson([1, 1], [2, 3])).toBeNull();
  });

  it("AC-26k 방식별 평균 · 비율 · 지어낸 차례 수 · 사람의 삶 · 일과 예문, 두 판정자가 함께 표시한 차례", () => {
    const key = { T01: "A-K1-s1", T02: "N-K2-s1" };
    const turn = (n: number, extra: Record<string, unknown> = {}) => ({
      n,
      link: 2,
      uptake: 1,
      misread: false,
      repeat: false,
      q_count: 1,
      pushy: false,
      made_up: false,
      help: null,
      follow: null,
      level: 2,
      ...extra,
    });
    const j1 = {
      lessons: [
        {
          id: "T01",
          turns: [turn(1, { made_up: true }), turn(2, { link: 1 })],
          feel: 2,
          memory: "no",
          teaching: 3,
          child_room: 2,
        },
        {
          id: "T02",
          turns: [
            turn(1, { own_life: true }),
            turn(2, { own_life: false, own_routine: ["I eat rice."], help: 2 }),
            turn(3, { own_life: false, pushy: true }),
          ],
          feel: 4,
          memory: "yes",
          teaching: 4,
          child_room: 4,
        },
      ],
    };
    const j2 = {
      lessons: [
        {
          id: "T01",
          turns: [turn(1, { made_up: true }), turn(2)],
          feel: 3,
          memory: "partly",
          teaching: 3,
          child_room: 3,
        },
        {
          id: "T02",
          turns: [turn(1, { own_life: false }), turn(2), turn(3)],
          feel: 4,
          memory: "yes",
          teaching: 4,
          child_room: 4,
        },
      ],
    };
    const s = judgeSummaryOf(key, { j1, j2 }, ["A", "B", "C", "C2", "P"]);
    expect(s.arms).toEqual(["A", "N"]);
    expect(s.judges.j1?.A).toMatchObject({
      turns: 2,
      link: 1.5,
      "made_up%": 50,
      made_up_n: 1,
      "own_life%": null,
      feel: 2,
      memory: { no: 1 },
      feel_by_child: { K1: 2 },
    });
    expect(s.judges.j1?.N).toMatchObject({
      turns: 3,
      "pushy%": 33.3,
      "own_life%": 33.3,
      own_life_n: 1,
      own_routine_n: 1,
      own_routine_examples: [{ id: "T02", n: 2, text: "I eat rice." }],
      help: 2,
      help_n: 1,
    });
    expect(s.pair?.both).toEqual({
      A: { made_up: [{ id: "T01", n: 1 }], own_life: [] },
      N: { made_up: [], own_life: [] },
    });
    expect(s.pair?.feel).toMatchObject({
      lessons: 2,
      meanDiff: 0.5,
      same: 1,
      withinOne: 2,
    });
    const md = judgeSummaryMarkdown(s);
    expect(md).toContain("캐묻는 느낌");
    expect(md).toContain('- N · T02 차례 2: "I eat rice."');
    expect(md).toContain("| A | 1 (T01 1) | 0 |");
  });

  it("AC-26k --judges 로 부르면 판정 결과 파일만 읽는다(이름 pair 는 받지 않음)", () => {
    expect(parseJudgesArg(["--out", "x", "--judges", "j1,j2"])).toEqual([
      "j1",
      "j2",
    ]);
    expect(parseJudgesArg(["--out", "x"])).toBeNull();
    expect(() => parseJudgesArg(["--judges", ""])).toThrow();
    expect(() => parseJudgesArg(["--judges", "j1,pair"])).toThrow("pair");
    const dir = mkdtempSync(join(tmpdir(), "arch-judges-"));
    writeFileSync(
      join(dir, "blind-key.json"),
      JSON.stringify({ map: { T01: { lesson: "P-K3-s2" } } }),
    );
    writeFileSync(
      join(dir, "judge-j1.json"),
      JSON.stringify({
        lessons: [{ id: "T01", turns: [{ n: 1, link: 2 }], feel: 5 }],
      }),
    );
    const s = readJudgeSummary(dir, ["j1"]);
    expect(s.arms).toEqual(["P"]);
    expect(s.judges.j1?.P).toMatchObject({
      turns: 1,
      link: 2,
      feel: 5,
      feel_by_child: { K3: 5 },
    });
    expect(s.pair).toBeNull();
  });
});

describe("AC-26k 지난 실행의 기록 꼴을 읽는 호환", () => {
  it("AC-26k 새 칸(firstSentence · ending)이 없는 옛 기록 줄도 읽고, 새 셈은 비거나 ended 글로 정한다", () => {
    const dir = mkdtempSync(join(tmpdir(), "arch-old-"));
    mkdirSync(join(dir, "runs"));
    const old = [
      teacherLine(0, "Hi! How are you?"),
      {
        type: "child_turn",
        lesson: "P-K1-s1",
        childTurn: 1,
        heardTeacher: "Hi!",
        action: "speak",
        says: "Good",
        kind: "answer",
        why: "",
        heard: "Good",
        noise: null,
        noiseSkipped: false,
      },
      teacherLine(1, "Great! What do you like?"),
      lessonLine({ childTurns: 1 }),
    ];
    writeFileSync(
      join(dir, "runs", "P-K1-s1.jsonl"),
      `${old.map((l) => JSON.stringify(l)).join("\n")}\n`,
    );
    const [lesson] = readLessons(dir);
    if (!lesson) throw new Error("수업 없음");
    const m = lessonMetricsOf(lesson);
    expect(m.firstSentence).toEqual({
      turns: 0,
      msMedian: null,
      msP95: null,
      plainTurns: 0,
      plainMsMedian: null,
      plainMsP95: null,
      fromEnd: 0,
    });
    expect(m.ending.how).toBe("turn_cap");
    expect(m.calls.firstMs).toEqual([900]);
    expect(m.questions.turns).toBe(2);
  });

  it.skipIf(PAST === null)(
    "AC-26k 지난 결과 폴더로 수치를 다시 내면 metrics.json 의 값(옛 칸 전부)과 같다",
    () => {
      const dir = PAST as string;
      const old = JSON.parse(
        readFileSync(join(dir, "metrics.json"), "utf8"),
      ) as {
        arms: Record<string, unknown>[];
        lessons: Record<string, unknown>[];
      };
      const lessons = readLessons(dir);
      const per = lessons.map(lessonMetricsOf);
      const pick = (now: object, was: Record<string, unknown>) =>
        JSON.parse(
          JSON.stringify(
            Object.fromEntries(
              Object.keys(was).map((k) => [
                k,
                (now as Record<string, unknown>)[k],
              ]),
            ),
          ),
        );
      expect(per).toHaveLength(old.lessons.length);
      per.forEach((m, i) => {
        expect(pick(m, old.lessons[i] ?? {})).toEqual(old.lessons[i]);
      });
      for (const was of old.arms) {
        const now = armMetricsOf(was.arm as "A", lessons);
        expect(pick(now, was)).toEqual(was);
      }
      // 옛 기록의 A 두 수업은 앱의 마무리 차례에서 끝났다(ended 글로 정함)
      expect(
        per.filter((m) => m.ending.how === "app_closing").map((m) => m.arm),
      ).toEqual(["A", "A"]);
    },
  );

  it.skipIf(
    PAST === null || !existsSync(join(PAST ?? "", "judge-summary.json")),
  )(
    "AC-26k 지난 판정 결과로 모음을 다시 내면 judge-summary.json(지난 스크립트의 출력)과 같다",
    () => {
      const dir = PAST as string;
      const was = JSON.parse(
        readFileSync(join(dir, "judge-summary.json"), "utf8"),
      ) as Record<string, Record<string, Record<string, unknown>>>;
      const judges = Object.keys(was).filter((j) => j !== "pair");
      const s = readJudgeSummary(dir, judges);
      for (const j of judges)
        for (const [arm, row] of Object.entries(was[j] ?? {})) {
          const now = s.judges[j]?.[arm] as Record<string, unknown> | undefined;
          expect(now).toBeDefined();
          expect(
            Object.fromEntries(Object.keys(row).map((k) => [k, now?.[k]])),
          ).toEqual(row);
        }
    },
  );
});
