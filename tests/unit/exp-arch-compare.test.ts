// 회화 구조 비교 실험 도구(scripts/exp — 13절 C234 · task-exp-harness)의 순수 함수 시험: 잡음 · 수치 셈 · 방식 정의(B 가 걷는 줄 ·
// C · C2 프롬프트 · P 안내문과 상태 알림) · 앱 재료로 만든 실험 틀. 네트워크를 쓰지 않는다.
// 묶음 X1(spec '회화 Claude 주도' 설계 9 · plan X1 · AC-26k): 첫 문장 시각 · 끝난 길과 마무리 단추 · 채점표 판 2 · 판정 모음 · 옛 기록 호환.
// 묶음 X2(plan X2 · AC-26l): 방식 N(대본 도구의 새 엔진 길) · '더 이야기하기' 이음(A · N) · 아이에게 첫 문장이 나간 때 · 새 엔진 기록 셈 ·
// 넘겨받은 Minor(rev-x1 M1~M7) — 수업 하나를 가짜 client(흘려 받기 on · finalMessage)로 끝까지 돌리는 시험을 둔다(네트워크 없음).
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
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
  appFirstSentOf,
  type ChildTurnLog,
  type LeadTurnLog,
  type LessonLog,
  type LogLine,
  mergeSetup,
  parseRunArgs,
  runLesson,
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
  firstSentStatsOf,
  followSentenceOf,
  jaccard,
  jsonStringFieldOf,
  judgeSummaryOf,
  lessonEndingOf,
  levelFitOf,
  pearson,
  percentile,
  pyRound,
  questionStatsOf,
  type SaidCounts,
  saidCountsOf,
  sameQuestionsBesideClosingOf,
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
  childOnlyHeardOf,
  JUDGE_SUMMARY_TOOL,
  judgeRubricOf,
  judgeSummaryJsonOf,
  judgeSummaryMarkdown,
  judgeSummaryOverwriteBlocked,
  leadMarkdown,
  leadMetricsOf,
  lessonMetricsOf,
  materialsNoteOf,
  OWN_LIFE_RULE,
  PUSHY_RULE,
  parseJudgesArg,
  REPEAT_RULE,
  readJudgeSummary,
  readLessons,
  saidArmOf,
  saidRowsOf,
} from "../../scripts/exp/arch-report";
import {
  type LeadCandidateLex,
  leadCandidateTableOf,
} from "../../src/core/conversation/lead-candidate";
import { MORE_PROMPT } from "../../src/core/conversation/spoken";

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
      "- 마무리 단추(아이 차례 15 앞 · 마무리 제안): 더 이야기하기 · 이을 길이 없어 여기서 끝남 · 더 하고 싶다",
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
      // 이 도구가 쓴 파일이면 표지 칸(tool)도 판정자가 아니다(검토 rev-x2 M-7)
      const judges = Object.keys(was).filter(
        (j) => j !== "pair" && j !== "tool",
      );
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

// ── 묶음 X2 ─────────────────────────────────────────────────────

const CHILD_ROLE_MARK = "You are role-playing a Korean elementary school child";
const BUTTONS_MARK = "Now the screen shows two buttons";

type FakeBody = {
  model?: string;
  system?: unknown;
  messages?: { role: string; content: string }[];
  output_config?: unknown;
};

/** 가짜 Anthropic(흘려 받기 꼴 — on('text') · finalMessage · request_id). route 가 요청마다 응답 글을 정한다. 요청은 차례대로 남긴다. */
function fakeClient(route: (body: FakeBody) => string) {
  const requests: FakeBody[] = [];
  const client = {
    beta: {
      messages: {
        stream(body: FakeBody) {
          requests.push(body);
          const text = route(body);
          let onText: ((delta: string) => void) | null = null;
          return {
            on(event: string, f: (delta: string) => void) {
              if (event === "text") onText = f;
              return this;
            },
            async finalMessage() {
              for (const piece of chunks(text, 7)) onText?.(piece);
              return {
                model: body.model ?? "claude-sonnet-5-5",
                stop_reason: "end_turn",
                usage: {
                  input_tokens: 1000,
                  output_tokens: 50,
                  cache_creation_input_tokens: 0,
                  cache_read_input_tokens: 0,
                },
                content: [{ type: "text", text }],
              };
            },
            request_id: "req_fake",
          };
        },
      },
    },
  };
  return { client: client as unknown as Anthropic, requests };
}

const lastUser = (body: FakeBody) => body.messages?.at(-1)?.content ?? "";
const schemaOf = (body: FakeBody) => JSON.stringify(body.output_config ?? {});

/** 아이 역: 보통 차례는 짧은 말, 단추 차례는 '더 이야기하기'. */
function childReply(body: FakeBody): string {
  const buttons = lastUser(body).includes(BUTTONS_MARK);
  return JSON.stringify({
    action: "speak",
    says: buttons ? "" : "I like the sea.",
    kind: "answer",
    why: "짧게",
    ...(buttons ? { wrap_choice: "more" } : {}),
  });
}

describe("묶음 X2 방식 N · '더 이야기하기' 이음(가짜 client 로 수업 하나)", () => {
  const setup = setupOf(process.cwd());

  it("AC-26l 방식 N 은 인사 뒤 대화 첫 차례를 입구 start 로 부르고(카드 첫 질문 없음, 인사 끝 차례에 접음), 대화 차례마다 새 엔진 요청 하나 · 기록 칸 · 차이 표를 남긴다", async () => {
    expect(setup.nSystem).not.toBeNull();
    const { client, requests } = fakeClient((body) => {
      if (String(body.system).includes(CHILD_ROLE_MARK))
        return childReply(body);
      if (schemaOf(body).includes('"reading"'))
        return JSON.stringify({
          reading: "clear_answer",
          move: "react_and_follow_up",
          say: "Nice! Do you go to the sea?",
          say_ko: "좋아! 바다에 가?",
          model_sentence: "",
          hint_ko: "",
          hint_en: "",
          goal_words_i_said: [],
          child_used_on_own: ["sea"],
        });
      return JSON.stringify({
        child_kind: "answer",
        stuck: false,
        tori_en: "Good to hear!",
      });
    });
    const run = await runLesson(setup, client, "N", "K1", 2, 3, 1);
    expect(run.error).toBeNull();
    const teachers = run.lines.filter(
      (l): l is TeacherTurnLog => l.type === "teacher_turn",
    );
    // 인사 끝 차례(지금 길 — 앱의 인사 끝 처리 그대로)에 입구 start 의 말을 접었다 — 앱의 카드 첫 질문 없이 Claude 의 첫 질문
    const greetEnd = teachers.find((t) => t.lead?.entry === "start");
    if (!greetEnd) throw new Error("입구 start 차례가 없다");
    expect(greetEnd.final.split("\n").at(-1)).toBe(
      "Nice! Do you go to the sea?",
    );
    // 접은 입구 start 는 차례당 호출 수 · 시간에 더하지 않고 따로 둔다(검토 rev-x2 M-4 — 실제 앱은 두 호출 사이에 짧은 준비가 있다)
    expect(greetEnd.calls).toBe(1);
    expect(greetEnd.entryStart?.calls).toBe(1);
    expect(greetEnd.entryStart?.firstSent?.text).toBe("Nice!");
    expect(greetEnd.final).not.toContain(setup.firstQuestion);
    const lessonOfRun = run.lines.find(
      (l): l is LessonLog => l.type === "lesson",
    );
    // 이 실행의 A · N 이 실제 앱의 기능어 집합(시드 품사 칸)으로 돈다는 표지(검토 rev-x2 I-1)
    expect(lessonOfRun?.materials?.functionWords).toBe(169);
    // 대화 차례: 새 엔진 기록 · 첫 문장이 나간 때
    const talk = teachers.filter((t) => t.lead?.entry === "child");
    expect(talk.length).toBeGreaterThan(0);
    for (const t of talk) {
      expect(t.lead?.kind).toBe("ai");
      expect(t.lead?.say).toBe("Nice! Do you go to the sea?");
      expect(t.firstSent?.held).toBeNull();
      expect(t.branches).toEqual(["그대로 나감"]);
    }
    // 새 엔진 요청: 시스템은 수업 처음 값 하나, 사용자 메시지에 사실 알림
    const leadReqs = requests.filter((b) => schemaOf(b).includes('"reading"'));
    expect(new Set(leadReqs.map((b) => String(b.system)))).toEqual(
      new Set([setup.nSystem]),
    );
    expect(lastUser(leadReqs.at(-1) ?? {})).toContain("Child turn");
    const lesson = run.lines.find((l): l is LessonLog => l.type === "lesson");
    expect(lesson?.lead?.table.turns.length).toBeGreaterThan(0);
    const m = leadMetricsOf({ meta: lesson as LessonLog, teachers });
    expect(m?.byEntry.start).toBe(1);
    expect(m?.byEntry.child).toBe(talk.length);
    expect(
      leadMarkdown([
        {
          name: run.lesson,
          meta: lesson as LessonLog,
          calls: [],
          teachers,
          children: [],
        },
      ]),
    ).toContain(`## ${run.lesson}`);
  });

  it("AC-26l A · N 모두 마무리 차례에서 '더 이야기하기'를 고르면 앱처럼 잇는다(A: 카드 자리 한 줄 · N: 입구 more) — 두 방식이 같은 아이 차례 수로 끝난다", async () => {
    const results: Record<
      string,
      {
        childTurns: number;
        cont: TeacherTurnLog | undefined;
        choices: unknown[];
      }
    > = {};
    for (const arm of ["A", "N"] as const) {
      const { client } = fakeClient((body) => {
        if (String(body.system).includes(CHILD_ROLE_MARK))
          return childReply(body);
        if (schemaOf(body).includes('"reading"'))
          return JSON.stringify({
            reading: "clear_answer",
            move: "react_only",
            say: "Nice!",
            say_ko: "",
            model_sentence: "",
            hint_ko: "",
            hint_en: "",
            goal_words_i_said: [],
            child_used_on_own: [],
          });
        return JSON.stringify({
          child_kind: "answer",
          stuck: false,
          tori_en: "Nice! Do you like the sea?",
        });
      });
      const run = await runLesson(setup, client, arm, "K1", 2, 16, 1);
      expect(run.error).toBeNull();
      const lesson = run.lines.find((l): l is LessonLog => l.type === "lesson");
      const teachers = run.lines.filter(
        (l): l is TeacherTurnLog => l.type === "teacher_turn",
      );
      results[arm] = {
        childTurns: lesson?.childTurns ?? 0,
        cont: teachers.find((t) => t.afterChoice === true),
        choices: lesson?.ending?.choices ?? [],
      };
      expect(transcriptOf(run.lines)).toContain("앱처럼 이음");
    }
    expect(results.A?.cont?.called).toBe(false);
    expect(results.A?.cont?.branches).toEqual(["모델을 부르지 않은 고정 차례"]);
    expect(results.N?.cont?.called).toBe(true);
    expect(results.N?.cont?.lead?.entry).toBe("more");
    for (const arm of ["A", "N"]) {
      expect(results[arm]?.choices).toHaveLength(1);
      expect(results[arm]?.choices[0]).toMatchObject({
        picked: "more",
        continued: true,
      });
      expect(results[arm]?.childTurns).toBe(16);
    }
  });

  it("AC-26l 방식 P 는 move wrap_up 에서 수업을 끝낸다(선생님이 스스로 마무리함, 이음 없음)", async () => {
    let teacherCalls = 0;
    const { client } = fakeClient((body) => {
      if (String(body.system).includes(CHILD_ROLE_MARK))
        return childReply(body);
      teacherCalls++;
      return JSON.stringify({
        reading: "clear_answer",
        move: teacherCalls >= 3 ? "wrap_up" : "react_only",
        say: teacherCalls >= 3 ? "Bye!" : "Hi!",
        say_ko: "",
        model_sentence: "",
        goal_words_i_said: [],
        child_used_on_own: [],
      });
    });
    const run = await runLesson(setup, client, "P", "K1", 1, 16, 1);
    const lesson = run.lines.find((l): l is LessonLog => l.type === "lesson");
    expect(lesson?.ending?.how).toBe("teacher_closing");
    expect(lesson?.childTurns).toBe(2);
  });
});

describe("묶음 X2 첫 문장이 나간 때 · 새 엔진 기록 셈 · 넘겨받은 Minor", () => {
  const fs = (
    ms: number,
    text: string | null,
    question = false,
  ): FirstSentence => ({
    ms,
    from: "stream",
    text,
    question,
  });

  it("AC-26l A 의 받아 둔 차례: 1~3단계 첫 문장이 물음이면 본 호출 + 다시 쓰기 끝, 통째 다시 쓰기는 rewrite, 4단계 · 물음 아닌 첫 문장은 흘린 때", () => {
    expect(
      appFirstSentOf({
        level: 3,
        first: fs(700, "Do you swim?", true),
        firstMs: 2000,
        retryKind: "question",
        retryMs: 1500,
      }),
    ).toEqual({
      ms: 3500,
      from: "end",
      text: "Do you swim?",
      held: "question",
    });
    expect(
      appFirstSentOf({
        level: 3,
        first: fs(700, "Nice!"),
        firstMs: 2000,
        retryKind: "rewrite",
        retryMs: 1500,
      }),
    ).toMatchObject({ ms: 3500, held: "rewrite" });
    expect(
      appFirstSentOf({
        level: 3,
        first: fs(700, "Nice!"),
        firstMs: 2000,
        retryKind: null,
        retryMs: null,
      }),
    ).toEqual({ ms: 700, from: "stream", text: "Nice!", held: null });
    expect(
      appFirstSentOf({
        level: 4,
        first: fs(700, "Do you swim?", true),
        firstMs: 2000,
        retryKind: null,
        retryMs: null,
      }),
    ).toMatchObject({ ms: 700, held: null });
    const stats = firstSentStatsOf([
      { ms: 700, from: "stream", text: "a", held: null },
      { ms: 900, from: "end", text: "b", held: null },
      { ms: 3000, from: "end", text: "c", held: "say" },
      { ms: 4000, from: "end", text: "d", held: "question" },
    ]);
    expect(stats).toMatchObject({
      turns: 4,
      plainTurns: 2,
      plainMsMedian: 800,
      heldTurns: 2,
      heldBy: { say: 1, question: 1, rewrite: 0 },
      heldMsMedian: 3500,
      fromEnd: 1,
    });
  });

  it("AC-26l 새 엔진 기록 셈: 받아 둔 차례는 gate 이름으로 가리고(문장 문 걸림과 섞임) 시간은 본 호출 + 다시 말하기, 좁은 정의 · 마무리 막힘을 센다", () => {
    const base: LeadTurnLog = {
      entry: "child",
      reading: "clear_answer",
      move: "react_and_follow_up",
      kind: "ai",
      closing: false,
      closingAdded: false,
      closingStuck: { reading: false, effective: false },
      held: null,
      narrow: null,
      gate: [],
      removed: [],
      soundMoved: false,
      sound: {},
      say: "Nice!",
      rawSay: "Nice!",
      failure: null,
      ms: 1000,
      retryMs: null,
      child: null,
      explanation: null,
    };
    const narrow = {
      sentence: "Do you go in summer or winter?",
      item: "choice:summer",
      prompt: "p",
      called: true,
      retry: "Do you go when it is hot?",
      again: false,
    };
    const teachers = [
      teacherLine(1, "a", {
        lead: {
          ...base,
          gate: ["forbidden", "held_say"],
          held: "say",
          ms: 2000,
        },
      }),
      teacherLine(2, "b", {
        lead: {
          ...base,
          gate: ["held_question"],
          held: "question",
          narrow,
          ms: 1500,
          retryMs: 2500,
        },
      }),
      teacherLine(3, "c", {
        lead: {
          ...base,
          closing: true,
          closingStuck: { reading: true, effective: false },
          closingAdded: true,
        },
      }),
      teacherLine(4, "d", {
        lead: {
          ...base,
          narrow: { ...narrow, called: false, retry: "" },
          gate: ["forbidden"],
        },
      }),
    ];
    const m = leadMetricsOf({ meta: lessonLine(), teachers });
    expect(m?.held).toMatchObject({
      say: 1,
      question: 1,
      ms: [2000, 4000],
      msMedian: 3000,
    });
    expect(m?.narrow).toMatchObject({
      turns: 2,
      called: 1,
      replaced: 1,
      kept: 1,
      againHit: 0,
    });
    expect(m?.closing).toMatchObject({
      turns: 1,
      stuckReading: 1,
      stuckEffective: 0,
      added: 1,
    });
    expect(m?.gate).toEqual({ forbidden: 2 });
    expect(
      leadMetricsOf({ meta: lessonLine(), teachers: [teacherLine(1, "x")] }),
    ).toBeNull();
  });

  it("AC-26l 채점표 문구(rev-x1 M1 · M2 · M3): 예 · 아니오 물음은 질문 하나로 더 셈 · 답을 못 받아 되묻는 것도 뺌 · 일과 목록에도 따라 할 문장을 넣지 않음, 읽을 폴더는 절대 경로", () => {
    expect(PUSHY_RULE).toContain(
      "열린 물음 뒤에 따로 붙인 예 · 아니오 물음은 질문 하나로 더 세고",
    );
    expect(PUSHY_RULE).toContain(
      "앞에서 한 물음을 또 묻거나(잘못 들렸거나 답을 못 받아 되묻는 것은 빼고)",
    );
    expect(OWN_LIFE_RULE).toContain(
      "따라 할 문장 · 되받은 문장은 여기에도 적지 않습니다",
    );
    expect(PUSHY_RULE.split(/다\. |니다\. /)).toHaveLength(1);
    const md = judgeRubricOf("/abs/out");
    expect(md).toContain("`/abs/out/blind/`");
    // 화면 · 단추를 가리키는 낱말 없이 중립으로(검토 rev-x2 볼 것 6)
    expect(md).toContain("아이가 더 이야기하기로 한 자리");
    expect(md).not.toContain("단추를 누른 자리");
  });

  it("AC-26l 확인 항목 6(rev-x1 M4): 마무리 단추 고르기 호출은 같은 말 + 단추 안내로 따로 세고, 고르기 뒤 이은 차례의 말을 다음 아이 호출이 받는다", () => {
    const childCall = (childTurn: number, content: string) => ({
      type: "call" as const,
      lesson: "A-K1-s1",
      childTurn,
      kind: "child" as const,
      request: {
        model: "m",
        system: "s",
        messages: [{ role: "user", content }],
        thinking: null,
        output_config: {},
        max_tokens: 1,
        betas: [],
      },
      response: { ok: true },
      ms: 1,
    });
    const closingLine = "You did great! Do you want to talk more?";
    const cont = "What do you like at the sea?";
    const lesson = {
      name: "A-K1-s1",
      meta: lessonLine({
        lesson: "A-K1-s1",
        arm: "A",
        ending: {
          how: "turn_cap",
          childTurns: 16,
          line: null,
          reason: null,
          choices: [
            {
              childTurn: 16,
              kind: "closing",
              line: closingLine,
              picked: "more",
              says: "",
              why: "",
              continued: true,
            },
          ],
        },
      }),
      calls: [
        childCall(15, `Teacher: ${heardByChild("Nice!")}`),
        childCall(16, wrapChoiceMessageOf(heardByChild(closingLine))),
        childCall(16, `Teacher: ${heardByChild(cont)}`),
      ],
      teachers: [
        teacherLine(14, "Nice!"),
        teacherLine(15, closingLine),
        teacherLine(16, cont, { afterChoice: true, called: false }),
        teacherLine(16, "Cool!"),
      ],
      children: [],
    };
    expect(childOnlyHeardOf([lesson])).toEqual({
      turnOk: 2,
      turnAll: 2,
      choiceOk: 1,
      choiceAll: 1,
    });
  });

  it("AC-26l --judges 는 지난 모음 스크립트 출력(pair 칸 없음)을 덮지 않는다(rev-x1 M6), 이 도구가 쓴 파일 · 없는 파일은 덮는다", () => {
    const dir = mkdtempSync(join(tmpdir(), "arch-judge-"));
    const path = join(dir, "judge-summary.json");
    expect(judgeSummaryOverwriteBlocked(path)).toBe(false);
    writeFileSync(path, JSON.stringify({ j1: { A: {} } }));
    expect(judgeSummaryOverwriteBlocked(path)).toBe(true);
    writeFileSync(path, JSON.stringify({ j1: { A: {} }, pair: {} }));
    expect(judgeSummaryOverwriteBlocked(path)).toBe(false);
  });

  it("AC-26l 방식 목록에 N 이 있고 --arms 로 고른다", () => {
    expect(parseRunArgs(["--out", "x", "--arms", "A,P,N"]).arms).toEqual([
      "A",
      "P",
      "N",
    ]);
  });
});

// ── 묶음 X2 고침 1(검토 rev-x2 I-1 · I-2 · M-1 · M-2 · M-4 · M-5 · M-7) ──────────────────────

/** 시험용 낱말 재료(단원 단어 셋 · 복수 꼬리만 떼는 원형). */
const SAID_LEX: LeadCandidateLex = {
  unitWords: ["sea", "swim", "fish"],
  lemmaOf: (w) => {
    const low = w.toLowerCase();
    return ["sea", "swim", "fish"].includes(low)
      ? low
      : low === "seas"
        ? "sea"
        : undefined;
  },
  homophones: [],
};

function childLine(
  childTurn: number,
  heardTeacher: string,
  heard: string | null,
  lesson = "A-K1-s1",
): ChildTurnLog {
  return {
    type: "child_turn",
    lesson,
    childTurn,
    heardTeacher,
    action: heard === null ? "dont_know" : "speak",
    says: heard ?? "",
    kind: "answer",
    why: "",
    heard,
    noise: null,
    noiseSkipped: false,
  };
}

describe("묶음 X2 고침 1: 세 방식 같은 규칙의 '말했다' 수(I-2) · 재료 표지(I-1) · Minor", () => {
  /** 같은 대화(들린 글 · 앞 선생님 말 · 따라 할 문장)를 방식마다의 기록 칸에 담는다. */
  function sameTalkAs(arm: "A" | "P" | "N") {
    const lesson = `${arm}-K1-s1`;
    const model = "I swim in the sea.";
    const withModel = (childTurn: number, final: string) =>
      teacherLine(childTurn, final, {
        lesson,
        arm,
        ...(arm === "A"
          ? { checks: { sound: { model } } }
          : arm === "P"
            ? { modelFirst: { say: final, model_sentence: model } }
            : {
                lead: {
                  entry: "child",
                  reading: null,
                  move: null,
                  kind: "ai",
                  closing: false,
                  closingAdded: false,
                  closingStuck: { reading: false, effective: false },
                  held: null,
                  narrow: null,
                  gate: [],
                  removed: [],
                  soundMoved: true,
                  sound: { model },
                  say: final,
                  rawSay: final,
                  failure: null,
                  ms: 900,
                  retryMs: null,
                  child: null,
                  explanation: null,
                },
              }),
      });
    return {
      teachers: [
        teacherLine(0, "Hi! Do you like the sea?", { lesson, arm }),
        withModel(1, "Me too! Can you say it?"),
        teacherLine(2, "Great!", { lesson, arm }),
      ],
      children: [
        childLine(1, "Hi! Do you like the sea?", "Yes, sea!", lesson),
        childLine(2, "Me too! Can you say it?", "I swim in the sea.", lesson),
        childLine(3, "Great!", "Fish!", lesson),
        childLine(4, "Great!", null, lesson),
      ],
    };
  }

  it("AC-26l (I-2) 따라 할 문장은 방식마다 기록 칸에서 읽는다(A: checks.sound.model · P: model_sentence · N: lead.sound.model)", () => {
    for (const arm of ["A", "P", "N"] as const) {
      const t = sameTalkAs(arm).teachers[1];
      if (!t) throw new Error("차례 없음");
      expect(followSentenceOf(t)).toBe("I swim in the sea.");
    }
    expect(followSentenceOf(teacherLine(1, "Nice!"))).toBeNull();
  });

  it("AC-26l (I-2) 같은 기록이면 세 방식의 셈이 같다: (1) 들린 글의 단원 단어 · (2) 앞 선생님 말 · 따라 할 문장에 없던 낱말 · (3) core 셋째 값", () => {
    const counts = (["A", "P", "N"] as const).map((arm) =>
      saidCountsOf(sameTalkAs(arm), SAID_LEX),
    );
    const [a, p, n] = counts as [SaidCounts, SaidCounts, SaidCounts];
    expect(p).toEqual(a);
    expect(n).toEqual(a);
    // 말한 차례 셋(모름 단추 차례는 뺌), 들린 단원 단어 sea · swim · fish
    expect(a.turns).toBe(3);
    expect(a.heardUnit).toEqual(["sea", "swim", "fish"]);
    // sea 는 앞 선생님 말에, swim · sea 는 따라 할 문장에 있었다 — fish 만 스스로
    expect(a.beyondTeacher).toEqual(["fish"]);
    // (3) 은 core leadCandidateTableOf 의 셋째 값 그대로(같은 꼴의 행을 넣음)
    const direct = leadCandidateTableOf(
      [
        {
          role: "teacher",
          say: "Hi! Do you like the sea?",
          move: null,
          model: null,
          choices: false,
          koShown: false,
        },
        {
          role: "child",
          heard: "Yes, sea!",
          saidWords: [],
          claudeWords: [],
          hintKind: "none",
          stuck: false,
          koHelp: false,
          meaningHint: false,
          reading: null,
        },
        {
          role: "teacher",
          say: "Me too! Can you say it?",
          move: null,
          model: "I swim in the sea.",
          choices: false,
          koShown: false,
        },
        {
          role: "child",
          heard: "I swim in the sea.",
          saidWords: [],
          claudeWords: [],
          hintKind: "none",
          stuck: false,
          koHelp: false,
          meaningHint: false,
          reading: null,
        },
        {
          role: "teacher",
          say: "Great!",
          move: null,
          model: null,
          choices: false,
          koShown: false,
        },
        {
          role: "child",
          heard: "Fish!",
          saidWords: [],
          claudeWords: [],
          hintKind: "none",
          stuck: false,
          koHelp: false,
          meaningHint: false,
          reading: null,
        },
      ],
      SAID_LEX,
    );
    expect(a.heardByCategory).toEqual(direct.counts.heardByCategory);
    expect(a.heardByCategory.echoed_word).toBe(1);
    expect(a.heardByCategory.repeated_model).toBe(2);
    expect(a.heardByCategory.not_said_by_teacher).toBe(1);
    expect(a.heardAccepted).toEqual(
      direct.words.filter((w) => w.heard).map((w) => w.word),
    );
    expect(a.heardAccepted).toEqual(["fish"]);
  });

  it("AC-26l (I-2) 고르기 뒤 이음이 있으면 그 말이 바로 앞 선생님 말이다(따라 할 문장도 그 차례에서)", () => {
    const teachers = [
      teacherLine(0, "Hi!", { arm: "N" }),
      teacherLine(1, "Do you swim?", { arm: "N" }),
      teacherLine(2, "Fish!", {
        arm: "N",
        afterChoice: true,
        modelFirst: null,
      }),
    ];
    const c = saidCountsOf(
      {
        teachers,
        children: [
          childLine(1, "Hi!", "Hello."),
          childLine(2, "Fish!", "Fish and swim."),
        ],
      },
      SAID_LEX,
    );
    expect(c.heardUnit).toEqual(["fish", "swim"]);
    // fish 는 이음 말에 있었고 swim 은 아이 차례 1 뒤 말에만 있었다(바로 앞 말은 이음) — swim 이 스스로
    expect(c.beyondTeacher).toEqual(["swim"]);
  });

  it.skipIf(PAST === null)(
    "AC-26l (I-2) 지난 실험의 기록 폴더에도 그대로 돈다(기록만 읽는 셈 — 모든 수업 · 방식마다 한 줄)",
    () => {
      const lessons = readLessons(PAST as string);
      const setup = setupOf(process.cwd());
      const rows = saidRowsOf(lessons, {
        unitWords: setup.materials.ctx.unitWords,
        lemmaOf: setup.materials.lemmaOf,
        homophones: setup.materials.homophones,
      });
      expect(rows).toHaveLength(lessons.length);
      const arms = [...new Set(rows.map((r) => r.arm))];
      for (const arm of arms) {
        const m = saidArmOf(arm, rows);
        expect(m.lessons).toBeGreaterThan(0);
        expect(m.heardUnitMean).not.toBeNull();
      }
      for (const r of rows)
        expect(r.counts.beyondTeacher.length).toBeLessThanOrEqual(
          r.counts.heardUnit.length,
        );
    },
  );

  it("AC-26l (I-1) 결과 글 머리: 이 실행의 A 가 실제 앱의 기능어로 돌았으면 '바로잡음' 한 줄, 표지 없는 옛 기록이면 '바로잡기 전' 한 줄, A 가 없으면 없음", () => {
    const lessonWith = (
      arm: "A" | "N",
      materials?: { functionWords: number },
    ) => ({
      ...lessonOf([lessonLine({ arm, ...(materials ? { materials } : {}) })]),
      children: [],
    });
    expect(
      materialsNoteOf([lessonWith("A", { functionWords: 169 })]),
    ).toContain(
      "방식 A 를 실제 앱의 재료로 바로잡음(지난 실험의 A 와 이 한 점이 다름)",
    );
    expect(materialsNoteOf([lessonWith("A")])).toContain("바로잡기 전");
    expect(
      materialsNoteOf([lessonWith("N", { functionWords: 169 })]),
    ).toBeNull();
  });

  it("AC-26l (M-2) 같은 글자 질문 셈은 마무리 상수 물음을 빼고, 뺀 수를 따로 적는다(옛 셈은 그대로)", () => {
    const asked = [
      { turn: 3, text: MORE_PROMPT.en },
      { turn: 5, text: "Do you swim?" },
      { turn: 9, text: MORE_PROMPT.en },
    ];
    expect(sameQuestionsOf(asked).exact).toBe(1);
    const beside = sameQuestionsBesideClosingOf(asked);
    expect(beside.exact).toBe(0);
    expect(beside.closingConstant).toBe(2);
    const m = lessonMetricsOf({
      ...lessonOf([
        teacherLine(0, "Hi! Do you swim?"),
        teacherLine(1, `Nice!\n${MORE_PROMPT.en}`),
        teacherLine(2, `Okay!\n${MORE_PROMPT.en}`),
        lessonLine(),
      ]),
    });
    expect(m.sameQuestions.exact).toBe(1);
    expect(m.sameQuestionsBesideClosing.exact).toBe(0);
    expect(m.sameQuestionsBesideClosing.closingConstant).toBe(2);
  });

  it("AC-26l (M-5) 아이에게 첫 문장이 나간 때: 받아 둔 차례까지 합친 중앙값 · p95 를 참고로 낸다", () => {
    const st = firstSentStatsOf([
      { ms: 1000, from: "stream", text: "a", held: null },
      { ms: 3000, from: "end", text: "b", held: "question" },
      { ms: 2000, from: "stream", text: "c", held: null },
    ]);
    expect(st.plainMsMedian).toBe(1500);
    expect(st.allMsMedian).toBe(2000);
    expect(st.allMsP95).toBe(percentile([1000, 3000, 2000], 95));
  });

  it("AC-26l (M-1 · M-4) 받아 둔 차례는 아이 차례 뒤만 세고(입구 start · more 는 뺌), 접은 입구 start 는 차례당 셈 밖에 따로 둔다", () => {
    const lead = (entry: "child" | "start" | "more"): LeadTurnLog => ({
      entry,
      reading: null,
      move: null,
      kind: "ai",
      closing: false,
      closingAdded: false,
      closingStuck: { reading: false, effective: false },
      held: "question",
      narrow: null,
      gate: ["held_question"],
      removed: [],
      soundMoved: false,
      sound: {},
      say: "Do you swim?",
      rawSay: "Do you swim?",
      failure: null,
      ms: 1000,
      retryMs: null,
      child: null,
      explanation: null,
    });
    const teachers = [
      teacherLine(1, "a", {
        arm: "N",
        lead: lead("start"),
        calls: 1,
        ms: 800,
        entryStart: {
          calls: 1,
          ms: 1200,
          firstSent: { ms: 700, from: "stream", text: "Hi!", held: null },
        },
      }),
      teacherLine(2, "b", { arm: "N", lead: lead("child") }),
      teacherLine(3, "c", { arm: "N", lead: lead("more"), afterChoice: true }),
    ];
    const m = leadMetricsOf({ meta: lessonLine({ arm: "N" }), teachers });
    expect(m?.held.question).toBe(1);
    expect(m?.byEntry).toEqual({ child: 1, start: 1, more: 1 });
    const per = lessonMetricsOf({
      ...lessonOf([...teachers, lessonLine({ arm: "N" })]),
    });
    expect(per.entryStart).toEqual({
      turns: 1,
      calls: 1,
      ms: [1200],
      firstSentMs: [700],
    });
    expect(per.calls.perTurnMs).not.toContain(2000);
  });

  it("AC-26l (M-7) --judges 가 쓴 파일에는 표지 칸이 있어, 판정자 하나로 모은 파일(pair 없음)도 다음 실행이 덮는다", () => {
    const dir = mkdtempSync(join(tmpdir(), "arch-judge-tool-"));
    const path = join(dir, "judge-summary.json");
    const text = judgeSummaryJsonOf({
      judges: { j1: {} },
      pair: null,
    } as never);
    expect(JSON.parse(text)).toMatchObject({ tool: JUDGE_SUMMARY_TOOL });
    expect(JSON.parse(text)).not.toHaveProperty("pair");
    writeFileSync(path, text);
    expect(judgeSummaryOverwriteBlocked(path)).toBe(false);
  });
});
