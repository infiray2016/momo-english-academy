// 회화 카드 새 꼴 검사(회화 plan 묶음 3 — 6.3 회화 카드 행 · 6.4 회화 시나리오 카드 · 회화 카드 목표 · 회화 필수 질문 · 회화 짧은 준비 ·
// 더 이야기할 거리 · 회화 단원 덮기 · 회화 미션 · 역할 바꾸기 행, C189). 증명: AC-15m(거부 목록 · 안 거부 목록 · 일부 단원 경고) · AC-7a(완전성 몫).
import { describe, expect, it } from "vitest";
import type { SeedIssue } from "@/core/seed/check-lesson";
import {
  checkTalkCard,
  checkTalkUnit,
  TALK_SCENE_OPENER_EXEMPT,
} from "@/core/seed/check-talk";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import { type TalkLesson, TalkLessonSchema } from "@/core/seed/schema/lesson";
import {
  type SettingRow,
  type TalkLevelSpec,
  TalkLevelSpecSchema,
  type UnitGoal,
} from "@/core/seed/schema/reference";
import {
  type TalkRequired,
  type TalkSceneOpener,
  talkCardKindOf,
} from "@/core/seed/schema/talk";
import {
  bandKey,
  lessonFilePath,
  TALK_SAME_QUESTION_MAX,
  TALK_SEGMENTS,
  TALK_SPEC_SEGMENTS,
} from "@/core/seed/structure";
import { itemsOf, validateSeed } from "@/core/seed/validate";
import { checkFrameRelations } from "@/core/vocab/allocate";
import { talkSegmentEnum } from "@/db/schema/content";
import {
  defaultSettings,
  miniSeed,
  type ReferenceSet,
  referenceSet,
  seedTreeFiles,
  settingNumber,
  talkCard,
  talkLesson,
  talkUnitCards,
  unitWordsOf,
} from "../fixtures/seed/builders";

const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
const num = (key: string) => settingNumber(ref.settings, key);
const UNIT = 1;

function ctxOf(level: number, idx = index) {
  return {
    area: "talk" as const,
    level,
    unit: UNIT,
    file: lessonFilePath("talk", level, UNIT),
    index: idx,
  };
}
function check(lesson: TalkLesson, level: number, idx = index): SeedIssue[] {
  return checkTalkCard(lesson, ctxOf(level, idx));
}
const errorsOf = (issues: SeedIssue[]) =>
  issues.filter((i) => i.severity === "error");
const rulesOf = (issues: SeedIssue[]) =>
  [...new Set(errorsOf(issues).map((i) => i.rule))].sort();
const pathsOf = (issues: SeedIssue[], rule: string) =>
  errorsOf(issues)
    .filter((i) => i.rule === rule)
    .map((i) => i.path);

function card(level: 1 | 3 | 4 | 5): TalkLesson {
  return structuredClone(talkLesson(ref, level).lesson);
}
function reinforceCard(level: number): TalkLesson {
  const cards = talkUnitCards(ref, level);
  const found = cards.find((c) => c.kind === "reinforce");
  if (!found) throw new Error("다지기 카드가 없다");
  return structuredClone(found);
}
function specOf(level: number): TalkLevelSpec {
  const spec = index.levelSpec("talk", level);
  if (spec?.area !== "talk") throw new Error(`회화 ${level}단계 규격 없음`);
  return spec;
}
function requiredAt(lesson: TalkLesson, i: number): TalkRequired {
  const item = lesson.card.required[i];
  if (!item) throw new Error(`필수 질문 ${i} 없음`);
  return item;
}

// ── 목표가 있는 견본(단원 규격 goals · seed.unit_goals_max) ─────────

const CORE = "정보 묻고 답하기";
function goalOf(id: string, core = CORE): UnitGoal {
  return {
    id,
    ko: "선생님 질문에 한 문장으로 답할 수 있다",
    core,
    tasks: ["card-answer"],
    home: ["선생님과 이야기"],
    needs: ["word", "response"],
    accept: "meaning",
  };
}
/** 회화 1 · 3 · 4 · 5단계 단원 1 에 목표(talk-<단계>-1-1 · -2)를 단 규격 묶음. */
function goalRef(): ReferenceSet {
  const base = structuredClone(ref);
  const row: SettingRow = {
    key: "seed.unit_goals_max",
    scope: "household",
    value: 5,
    changeVia: "seed",
  };
  base.settings = { settings: [...base.settings.settings, row] };
  base.unitSpecs = {
    unitSpecs: base.unitSpecs.unitSpecs.map((u) =>
      u.area === "talk" && u.unit === UNIT && [1, 3, 4, 5].includes(u.level)
        ? {
            ...u,
            goals: [
              goalOf(`talk-${u.level}-1-1`),
              goalOf(`talk-${u.level}-1-2`, "좋고 싫음 말하기"),
            ],
          }
        : u,
    ),
  };
  return base;
}
const goalIndex = buildReferenceIndex(goalRef()).index;

describe("회화 카드 새 꼴(6.3 · C189)", () => {
  it("AC-15m 새 꼴 견본(1 · 3 · 4 · 5단계)과 단원 정규 카드는 오류 · 경고 없이 통과한다", () => {
    for (const level of [1, 3, 4, 5] as const) {
      expect(check(card(level), level), `${level}단계 견본`).toEqual([]);
      expect(check(card(level), level, goalIndex), `${level}단계 목표`).toEqual(
        [],
      );
    }
    for (const level of [1, 3, 4]) {
      const cards = talkUnitCards(ref, level);
      for (const c of cards)
        expect(check(c, level), `${level}단계 수업 ${c.lessonNo}`).toEqual([]);
    }
  });

  it("AC-15m 옛 칸(turns · moreTalk · questions · firstQuestion · 말해 보기 예문 뜻 · 1단계 인사 답 두 개)이 있으면 새 꼴 규격이 거부한다", () => {
    const lesson = card(1);
    expect(TalkLessonSchema.safeParse(lesson).success).toBe(true);
    const oldKeys: Record<string, unknown> = {
      turns: [],
      moreTalk: [],
      questions: [],
      firstQuestion: "What do you see?",
    };
    for (const [key, value] of Object.entries(oldKeys)) {
      const withOld = { ...lesson, card: { ...lesson.card, [key]: value } };
      expect(TalkLessonSchema.safeParse(withOld).success, key).toBe(false);
    }
    const exampleKo = structuredClone(lesson);
    Object.assign(exampleKo.card.todayWords[0] ?? {}, { exampleKo: "뜻" });
    expect(TalkLessonSchema.safeParse(exampleKo).success).toBe(false);
    const greetingPair = structuredClone(lesson);
    if (!("questions" in greetingPair.card.greeting))
      throw new Error("인사 질문 없음");
    Object.assign(greetingPair.card.greeting.questions[0] ?? {}, {
      twoAnswers: ["I'm good.", "I'm fine."],
    });
    expect(TalkLessonSchema.safeParse(greetingPair).success).toBe(false);
  });

  it("AC-15m 틀린 칸(모르는 키 · 첫 꼴 값 · 선택지 셋 · 목표 없음 · 필수 질문 없음)은 새 꼴 규격이 거부한다", () => {
    const base = card(1);
    const cases: [string, (l: TalkLesson) => void][] = [
      ["모르는 키", (l) => Object.assign(requiredAt(l, 0), { extra: 1 })],
      [
        "첫 꼴 값",
        (l) => Object.assign(requiredAt(l, 0), { firstForm: "guess" }),
      ],
      [
        "선택지 셋",
        (l) => Object.assign(requiredAt(l, 0), { choices: ["a", "b", "c"] }),
      ],
      ["카드 목표 없음", (l) => Object.assign(l.card, { goals: [] })],
      ["질문 목표 없음", (l) => Object.assign(requiredAt(l, 0), { goals: [] })],
      ["필수 질문 없음", (l) => Object.assign(l.card, { required: [] })],
      [
        "쉬운 질문 없음",
        (l) => {
          const item = requiredAt(l, 0) as Partial<TalkRequired>;
          delete item.easyQuestion;
        },
      ],
      [
        "들려줄 말 없음",
        (l) => {
          const word = l.card.todayWords[0] as { modelLine?: string };
          delete word.modelLine;
        },
      ],
    ];
    for (const [label, mutate] of cases) {
      const lesson = structuredClone(base);
      mutate(lesson);
      expect(TalkLessonSchema.safeParse(lesson).success, label).toBe(false);
    }
  });

  it("AC-15m 꼴 가르기 talkCardKindOf: 새 꼴 · 옛 꼴(옛 꼴에만 있던 칸) · 틀림", () => {
    const fresh = card(1).card;
    expect(talkCardKindOf(fresh)).toBe("new");
    for (const key of ["firstQuestion", "turns", "moreTalk", "questions"])
      expect(talkCardKindOf({ ...fresh, [key]: [] }), key).toBe("old");
    expect(talkCardKindOf({ topic: "x" })).toBe("invalid");
    expect(talkCardKindOf(null)).toBe("invalid");
  });

  it("AC-15m 시드 나무에 옛 꼴 회화 카드가 있으면 seed:validate 가 talk-card-v1 로 막는다", () => {
    const tree = miniSeed({ areas: ["talk"], through: 1, frame: "small" });
    const file = tree.lessons.find((f) => f.area === "talk");
    if (!file) throw new Error("회화 수업 파일 없음");
    const [first] = file.lessons;
    if (!first) throw new Error("수업 없음");
    // 옛 꼴 카드(C189 앞 칸 firstQuestion · turns 를 가진 카드)
    const old = {
      ...first,
      card: { ...first.card, firstQuestion: "What do you see?", turns: [] },
    };
    (file.lessons as unknown[])[0] = old;
    const report = validateSeed(seedTreeFiles(tree), {
      mode: "pr",
      areas: ["talk"],
    });
    expect(report.errors.map((e) => e.rule)).toContain("talk-card-v1");
  });
});

describe("회화 카드 목표(6.4 회화 카드 목표 · 요구 능력 타당성)", () => {
  it("AC-15m 카드 목표가 그 단원 목표 밖이거나 필수 질문 · 미션의 목표가 카드 목표 밖이면 거부한다", () => {
    const outside = card(3);
    outside.card.goals = ["talk-3-1-9"];
    requiredAt(outside, 0).goals = ["talk-3-1-9"];
    expect(rulesOf(check(outside, 3, goalIndex))).toContain("talk-goals");
    const item = card(3);
    requiredAt(item, 1).goals = ["talk-3-1-2"];
    const issues = check(item, 3, goalIndex);
    expect(rulesOf(issues)).toEqual(["talk-goals"]);
    expect(pathsOf(issues, "talk-goals")).toEqual(["card.required.1.goals"]);
    const mission = card(5);
    const first = mission.card.missions?.[0];
    if (!first) throw new Error("미션 없음");
    first.goals = ["talk-5-1-2"];
    expect(pathsOf(check(mission, 5, goalIndex), "talk-goals")).toEqual([
      "card.missions.0.goals",
    ]);
  });

  it("AC-15m 카드 목표마다 필수 질문 하나 이상이 노린다 · 목표 ID 꼴이 그 단원 꼴이다", () => {
    const unused = card(3);
    unused.card.goals = ["talk-3-1-1", "talk-3-1-2"];
    expect(pathsOf(check(unused, 3, goalIndex), "talk-goals")).toEqual([
      "card.goals.1",
    ]);
    const wrongId = card(3);
    wrongId.card.goals = ["talk-4-1-1"];
    for (const r of wrongId.card.required) r.goals = ["talk-4-1-1"];
    for (const m of wrongId.card.more) m.goals = ["talk-4-1-1"];
    expect(pathsOf(check(wrongId, 3), "talk-goals")).toContain("card.goals.0");
  });

  it("AC-15m 질문 하나가 목표 여럿을 가리키면 요구 능력이 있어야 하고 목표마다 그 core 가 요구 능력 안이다", () => {
    const lesson = card(3);
    lesson.card.goals = ["talk-3-1-1", "talk-3-1-2"];
    requiredAt(lesson, 0).goals = ["talk-3-1-1", "talk-3-1-2"];
    expect(pathsOf(check(lesson, 3, goalIndex), "talk-demands")).toEqual([
      "card.required.0.demands",
    ]);
    requiredAt(lesson, 0).demands = [CORE];
    const issues = check(lesson, 3, goalIndex);
    expect(rulesOf(issues)).toEqual(["talk-demands"]);
    expect(errorsOf(issues)[0]?.message).toContain("talk-3-1-2");
    requiredAt(lesson, 0).demands = [CORE, "좋고 싫음 말하기"];
    expect(check(lesson, 3, goalIndex)).toEqual([]);
  });

  it("AC-15m 목표 home 밖 purpose 를 단 질문에 요구 능력이 없으면 거부한다(talk-demands)", () => {
    const lesson = card(3);
    requiredAt(lesson, 0).purpose = "가게와 식당";
    expect(pathsOf(check(lesson, 3, goalIndex), "talk-demands")).toEqual([
      "card.required.0.demands",
    ]);
    // home 안 purpose 는 요구 능력 없이 받는다.
    const home = card(3);
    requiredAt(home, 0).purpose = "선생님과 이야기";
    expect(check(home, 3, goalIndex)).toEqual([]);
    requiredAt(lesson, 0).demands = [CORE];
    expect(check(lesson, 3, goalIndex)).toEqual([]);
  });

  it("AC-15m 단원 목표가 아직 없는 단원은 칸 검사가 막지 않고 단원 검사가 '목표 정의 전' 경고 하나를 낸다", () => {
    const cards = talkUnitCards(ref, 1);
    for (const c of cards) expect(check(c, 1)).toEqual([]);
    const issues = checkTalkUnit(cards, ctxOf(1));
    const pending = issues.filter((i) => i.rule === "talk-goals-pending");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.severity).toBe("warning");
    expect(errorsOf(issues)).toEqual([]);
  });
});

describe("회화 필수 질문 · 받침(6.4 회화 필수 질문)", () => {
  it("AC-15m 배정 카드: 새 단어마다 처음 묻는 필수 질문이 하나다(빠짐 · 둘 · 새 단어 아닌 단어 거부)", () => {
    const missing = card(3);
    missing.card.required = missing.card.required.slice(1);
    missing.card.required.forEach((r, i) => {
      r.no = i + 1;
    });
    expect(rulesOf(check(missing, 3))).toContain("talk-first-ask");
    const twice = card(3);
    const copy = structuredClone(requiredAt(twice, 0));
    copy.no = twice.card.required.length + 1;
    copy.en = "Who is it?";
    twice.card.required.push(copy);
    expect(rulesOf(check(twice, 3))).toContain("talk-first-ask");
    const notNew = card(3);
    const other = unitWordsOf(ref, "talk", 3, UNIT).find(
      (w) => !notNew.newWords.includes(w),
    );
    if (!other) throw new Error("단어 없음");
    requiredAt(notNew, 0).targets = [other];
    expect(pathsOf(check(notNew, 3), "talk-first-ask")).toContain(
      "card.required.0.targets",
    );
  });

  it("AC-15m 다지기 카드: 처음 묻는 필수 질문이 있거나 다시 묻는 필수 질문이 k 개보다 적으면 거부한다", () => {
    const first = reinforceCard(3);
    requiredAt(first, 0).ask = "first";
    expect(pathsOf(check(first, 3), "talk-first-ask")).toEqual([
      "card.required.0.ask",
    ]);
    const fewer = reinforceCard(3);
    const k = num(bandKey("unit.new_words_per_lesson", "1-3"));
    expect(fewer.card.required).toHaveLength(k);
    fewer.card.required = fewer.card.required.slice(0, -1);
    expect(pathsOf(check(fewer, 3), "talk-required")).toEqual([
      "card.required",
    ]);
  });

  it("AC-15m 필수 질문 수가 참고 턴 × talk.required_max_ratio 를 넘으면 거부한다(하한은 질문으로 참고 턴을 채우게 하지 않는다)", () => {
    const spec = specOf(3);
    const max = spec.targetTurns * num("talk.required_max_ratio");
    const lesson = reinforceCard(3);
    const words = unitWordsOf(ref, "talk", 3, UNIT);
    const extra = Math.floor(max) + 1 - lesson.card.required.length;
    const base = requiredAt(lesson, 0);
    const easies = [
      "Is it big?",
      "Do you see it?",
      "Is it here?",
      "Is this it?",
      "Can I see it?",
    ];
    for (let i = 0; i < extra; i++) {
      lesson.card.required.push({
        ...structuredClone(base),
        no: lesson.card.required.length + 1,
        en: ["Who has it?", "Where is it?", "What is that?"][i % 3] ?? "",
        targets: [words[(i + 10) % words.length] ?? ""],
        easyQuestion: { en: easies[i % easies.length] ?? "", ko: "그거야?" },
      });
    }
    expect(lesson.card.required.length).toBeGreaterThan(max);
    expect(pathsOf(check(lesson, 3), "talk-required")).toEqual([
      "card.required",
    ]);
  });

  it("AC-15m 질문 · 쉬운 질문 · 더 이야기할 거리 질문에 노리는 단원 단어가 있으면 거부한다(A4-03)", () => {
    const lesson = card(3);
    const target = requiredAt(lesson, 1).targets[0];
    const more = lesson.card.more[0];
    if (!target || !more) throw new Error("칸 없음");
    requiredAt(lesson, 1).en = `Do you ${target}?`;
    requiredAt(lesson, 2).easyQuestion.en =
      `Is it ${requiredAt(lesson, 2).targets[0]}?`;
    more.en = `Is it ${more.targets[0]}?`;
    expect(pathsOf(check(lesson, 3), "talk-targets").sort()).toEqual([
      "card.more.0.en",
      "card.required.1.en",
      "card.required.2.easyQuestion.en",
    ]);
  });

  it("AC-15m 받침: 쉬운 질문이 물음표로 끝나지 않거나 그 질문과 정규화한 글이 같으면 거부한다", () => {
    const noMark = card(3);
    requiredAt(noMark, 0).easyQuestion.en = "Tell me more.";
    expect(pathsOf(check(noMark, 3), "talk-support")).toEqual([
      "card.required.0.easyQuestion.en",
    ]);
    const same = card(3);
    const q = requiredAt(same, 0);
    q.easyQuestion.en = `  ${q.en.toUpperCase()}  `;
    expect(pathsOf(check(same, 3), "talk-support")).toEqual([
      "card.required.0.easyQuestion.en",
    ]);
  });

  it("AC-15m 1단계 첫 꼴: 짧은 준비 낱말은 그냥, 아니면 선택지 · 꺼내기이고 선택지면 같은 꼴 둘에 하나는 노리는 단어다", () => {
    const lesson = card(1);
    const prep = new Set(lesson.card.prep ?? []);
    const plainAt = lesson.card.required.findIndex((r) =>
      r.targets.some((t) => prep.has(t)),
    );
    const choiceAt = lesson.card.required.findIndex(
      (r) => r.firstForm === "choices",
    );
    expect(plainAt).toBeGreaterThanOrEqual(0);
    expect(choiceAt).toBeGreaterThanOrEqual(0);
    const wrongForm = structuredClone(lesson);
    requiredAt(wrongForm, plainAt).firstForm = "introduce";
    expect(pathsOf(check(wrongForm, 1), "talk-first-form")).toEqual([
      `card.required.${plainAt}.firstForm`,
    ]);
    const noChoices = structuredClone(lesson);
    delete requiredAt(noChoices, choiceAt).choices;
    expect(pathsOf(check(noChoices, 1), "talk-choices")).toEqual([
      `card.required.${choiceAt}.choices`,
    ]);
    const notPair = structuredClone(lesson);
    const pair = requiredAt(notPair, choiceAt).choices;
    if (!pair) throw new Error("선택지 없음");
    requiredAt(notPair, choiceAt).choices = [pair[0], "I like it very much."];
    expect(rulesOf(check(notPair, 1))).toEqual(["talk-choices"]);
    const noForm = structuredClone(lesson);
    delete requiredAt(noForm, choiceAt).firstForm;
    expect(pathsOf(check(noForm, 1), "talk-first-form")).toEqual([
      `card.required.${choiceAt}.firstForm`,
    ]);
    // 3단계(선택지를 두지 않는 단계)에 첫 꼴 · 선택지를 두면 거부한다.
    const three = card(3);
    requiredAt(three, 0).firstForm = "plain";
    requiredAt(three, 1).choices = ["I go home.", "I go out."];
    expect(rulesOf(check(three, 3)).sort()).toEqual([
      "talk-choices",
      "talk-first-form",
    ]);
  });

  it("AC-15m 처음 묻는 필수 질문의 영어 문장 힌트에 그 질문의 새 단어가 없으면 거부한다", () => {
    const lesson = card(3);
    const item = requiredAt(lesson, 0);
    item.hints = item.hints.map((h) => h.replace(item.targets[0] ?? "", "it"));
    expect(pathsOf(check(lesson, 3), "talk-first-ask")).toEqual([
      "card.required.0.hints",
    ]);
  });

  it("AC-15m 영어 힌트 단 수가 단계 규격과 다르거나 1~4단계 질문 · 쉬운 질문의 한국어 뜻이 없으면 거부한다", () => {
    const tiers = card(4);
    requiredAt(tiers, 0).hints = requiredAt(tiers, 0).hints.slice(1);
    expect(pathsOf(check(tiers, 4), "talk-hints")).toEqual([
      "card.required.0.hints",
    ]);
    const noKo = card(4);
    delete requiredAt(noKo, 0).ko;
    delete requiredAt(noKo, 1).easyQuestion.ko;
    expect(pathsOf(check(noKo, 4), "talk-ko").sort()).toEqual([
      "card.required.0.ko",
      "card.required.1.easyQuestion.ko",
    ]);
    // 5단계(한국어 뜻 없는 단계)는 보지 않는다.
    expect(specOf(5).koMeaning).toBe(false);
  });

  it("AC-15m 인사 꼴: 1~3단계 인사 질문 수가 인사 턴 수와 다르거나 4단계부터 인사 질문을 두면 거부한다(talk-shape)", () => {
    const count = card(3);
    count.card.greetingTurns = 2;
    expect(rulesOf(check(count, 3))).toEqual(["talk-shape"]);
    expect(pathsOf(check(count, 3), "talk-shape")).toEqual([
      "card.greeting.questions",
    ]);
    const high = card(4);
    const low = card(3);
    if (!("questions" in low.card.greeting)) throw new Error("인사 질문 없음");
    const [first] = low.card.greeting.questions;
    if (!first) throw new Error("인사 질문 없음");
    const { frameEn: _frame, ...noFrame } = first;
    high.card.greeting = { questions: [noFrame] };
    expect(pathsOf(check(high, 4), "talk-shape")).toEqual(["card.greeting"]);
  });

  it("AC-15m 힌트: 쓸 수 있는 말 수가 단계 규격과 다르거나 인사 질문의 영어 틀이 단계 규격과 어긋나면 거부한다(talk-hints)", () => {
    const fewer = card(5);
    requiredAt(fewer, 0).usablePhrases = requiredAt(
      fewer,
      0,
    ).usablePhrases?.slice(1);
    expect(pathsOf(check(fewer, 5), "talk-hints")).toEqual([
      "card.required.0.usablePhrases",
    ]);
    const extra = card(4);
    requiredAt(extra, 0).usablePhrases = ["Here you are."];
    expect(pathsOf(check(extra, 4), "talk-hints")).toEqual([
      "card.required.0.usablePhrases",
    ]);
    const noFrame = card(3);
    if (!("questions" in noFrame.card.greeting))
      throw new Error("인사 질문 없음");
    delete noFrame.card.greeting.questions[0]?.frameEn;
    expect(pathsOf(check(noFrame, 3), "talk-hints")).toEqual([
      "card.greeting.questions.0.frameEn",
    ]);
    const withFrame = card(1);
    if (!("questions" in withFrame.card.greeting))
      throw new Error("인사 질문 없음");
    Object.assign(withFrame.card.greeting.questions[0] ?? {}, {
      frameEn: "I'm ___.",
    });
    expect(pathsOf(check(withFrame, 1), "talk-hints")).toEqual([
      "card.greeting.questions.0.frameEn",
    ]);
  });

  it("AC-15m 번호가 1부터 차례가 아니면 거부한다 · 같은 선생님 질문이 세 번이면 거부한다", () => {
    const numbers = card(3);
    requiredAt(numbers, 1).no = 5;
    expect(pathsOf(check(numbers, 3), "talk-numbers")).toEqual([
      "card.required.1.no",
    ]);
    const same = card(3);
    const repeated = "What is your toy?";
    same.card.more.slice(0, TALK_SAME_QUESTION_MAX).forEach((m) => {
      m.en = repeated;
    });
    expect(rulesOf(check(same, 3))).toEqual([]);
    const third = same.card.more[TALK_SAME_QUESTION_MAX];
    if (!third) throw new Error("더 이야기할 거리 없음");
    third.en = repeated;
    expect(rulesOf(check(same, 3))).toEqual(["talk-same-question"]);
    // 열쇠는 실행 셈과 같은 마지막 물음표 문장이다(turnQuestionOf): 앞 장면이 달라도 꼬리가 같으면 같은 질문이고, 꼬리가 다르면 다른 질문이다.
    const scenes = ["You see it.", "You like it.", "You have it."];
    const tails = card(3);
    tails.card.more.slice(0, TALK_SAME_QUESTION_MAX + 1).forEach((m, i) => {
      m.en = `${scenes[i]} What do you do?`;
    });
    expect(rulesOf(check(tails, 3))).toEqual(["talk-same-question"]);
    const apart = card(3);
    const ends = ["What do you see?", "What do you like?", "What do you have?"];
    apart.card.more.slice(0, TALK_SAME_QUESTION_MAX + 1).forEach((m, i) => {
      m.en = `${scenes[i]} ${ends[i]}`;
    });
    expect(rulesOf(check(apart, 3))).toEqual([]);
  });
});

describe("회화 짧은 준비 · 더 이야기할 거리 · 미션(6.4)", () => {
  it("AC-15m 1~3단계 배정 카드의 짧은 준비 낱말이 talk.prep_words 개 · 오늘 쓸 말 안 · 그 질문이 앞쪽 절반 안이어야 한다", () => {
    const prepWords = num(bandKey("talk.prep_words", "1-3"));
    const lesson = card(3);
    expect(lesson.card.prep).toHaveLength(prepWords);
    const fewer = structuredClone(lesson);
    fewer.card.prep = fewer.card.prep?.slice(1);
    expect(pathsOf(check(fewer, 3), "talk-prep")).toEqual(["card.prep"]);
    const outside = structuredClone(lesson);
    const other = unitWordsOf(ref, "talk", 3, UNIT).find(
      (w) => !outside.newWords.includes(w),
    );
    if (!other || !outside.card.prep) throw new Error("단어 없음");
    outside.card.prep = [other, ...outside.card.prep.slice(1)];
    expect(pathsOf(check(outside, 3), "talk-prep")).toContain("card.prep.0");
    const late = structuredClone(lesson);
    const [firstItem] = late.card.required.splice(0, 1);
    if (!firstItem) throw new Error("질문 없음");
    late.card.required.push(firstItem);
    late.card.required.forEach((r, i) => {
      r.no = i + 1;
    });
    expect(pathsOf(check(late, 3), "talk-prep")).toEqual([
      `card.required.${late.card.required.length - 1}`,
    ]);
    const noPrep = structuredClone(lesson);
    delete noPrep.card.prep;
    expect(pathsOf(check(noPrep, 3), "talk-prep")).toEqual(["card.prep"]);
    // 다지기 카드는 비우고 앱이 고른다.
    const reinforce = reinforceCard(3);
    reinforce.card.prep = [...lesson.newWords.slice(0, prepWords)];
    expect(pathsOf(check(reinforce, 3), "talk-prep")).toEqual(["card.prep"]);
  });

  it("AC-15m 4단계부터 배정 카드의 짧은 준비 낱말은 두면 개수 · 오늘 쓸 말 안만 보고 앞쪽 절반은 보지 않는다(06:186)", () => {
    const need = num(bandKey("talk.prep_words", "4-6"));
    const lesson = card(4);
    expect(lesson.card.prep).toBeUndefined();
    // 뒤쪽 필수 질문이 노리는 새 단어를 고른다(1~3단계였다면 앞쪽 절반 밖).
    lesson.card.prep = lesson.newWords.slice(-need);
    expect(check(lesson, 4)).toEqual([]);
    const fewer = structuredClone(lesson);
    fewer.card.prep = lesson.newWords.slice(-(need - 1));
    expect(pathsOf(check(fewer, 4), "talk-prep")).toEqual(["card.prep"]);
  });

  it("AC-15m 더 이야기할 거리가 talk.more_talk_turns 개보다 적거나 처음 묻는 질문이면 거부한다(모든 단계)", () => {
    for (const level of [1, 4] as const) {
      const fewer = card(level);
      expect(fewer.card.more.length).toBeGreaterThanOrEqual(
        num("talk.more_talk_turns"),
      );
      fewer.card.more = fewer.card.more.slice(0, -1);
      expect(rulesOf(check(fewer, level)), `${level}단계`).toEqual([
        "talk-more",
      ]);
    }
    const first = card(3);
    const item = first.card.more[0];
    if (!item) throw new Error("더 이야기할 거리 없음");
    item.ask = "first";
    expect(pathsOf(check(first, 3), "talk-more")).toEqual(["card.more.0.ask"]);
  });

  it("AC-15m 5~7단계 미션 수가 단계 규격과 다르거나 역할 바꾸기를 미션 없는 단계에 두면 거부한다", () => {
    const missions = card(5);
    missions.card.missions = missions.card.missions?.slice(1);
    expect(rulesOf(check(missions, 5))).toEqual(["talk-missions"]);
    const swap = card(4);
    swap.card.roleSwap = {
      firstLine: "You can do it.",
      hint: "I can do it.",
      purpose: "가게와 식당",
    };
    expect(pathsOf(check(swap, 4), "talk-missions")).toEqual(["card.roleSwap"]);
  });

  it("AC-15m 그림 키가 카탈로그에 없거나 그림을 두지 않는 단계에 있으면 거부한다", () => {
    const missing = card(1);
    requiredAt(missing, 0).imageKey = "no-such-image";
    expect(pathsOf(check(missing, 1), "talk-images")).toEqual([
      "card.required.0.imageKey",
    ]);
    const high = card(4);
    const [word] = high.newWords;
    const key = word ? index.vocab.get(word)?.imageKey : undefined;
    if (!key || !high.card.todayWords[0]) throw new Error("그림 키 없음");
    high.card.todayWords[0].imageKey = key;
    expect(pathsOf(check(high, 4), "talk-images")).toEqual([
      "card.todayWords.0.imageKey",
    ]);
  });

  it("6.4 회화 시나리오 카드: {NAME} 밖의 틀 자리 · 오늘 쓸 말과 새 단어 어긋남 · 1~4단계 정리 대사 뜻 빠짐을 거부한다", () => {
    const placeholder = card(4);
    if (!("firstLine" in placeholder.card.greeting))
      throw new Error("첫 말 없음");
    placeholder.card.greeting.firstLine.en = "Hi {CHILD}! How are you?";
    expect(rulesOf(check(placeholder, 4))).toEqual(["talk-placeholder"]);
    const today = card(3);
    today.card.todayWords = today.card.todayWords.slice(1);
    expect(rulesOf(check(today, 3))).toContain("talk-today");
    const noKo = card(1);
    delete noKo.card.closingLines[0]?.ko;
    expect(pathsOf(check(noKo, 1), "talk-ko")).toEqual([
      "card.closingLines.0.ko",
    ]);
  });

  it("6.4 어휘 배정(회화): 새 단어가 아이 차례의 힌트 · 답 예시 · 쓸 수 있는 말 · 목표 표현에 없으면 거부한다(들려줄 말 · 예문은 세지 않음)", () => {
    const lesson = card(5);
    const [word] = lesson.newWords;
    const other = unitWordsOf(ref, "talk", 5, UNIT).find(
      (w) => !lesson.newWords.includes(w),
    );
    if (!word || !other) throw new Error("단어 없음");
    const swap = (text: string) =>
      text.replace(new RegExp(`\\b${word}\\b`, "g"), other);
    lesson.card.targetExpressions = lesson.card.targetExpressions.map(swap);
    for (const list of [lesson.card.required, lesson.card.more]) {
      for (const q of list) {
        q.hints = q.hints.map(swap);
        q.usablePhrases = q.usablePhrases?.map(swap);
        q.answerExample = swap(q.answerExample);
      }
    }
    lesson.card.missions = lesson.card.missions?.map((m) => ({
      ...m,
      en: swap(m.en),
    }));
    expect(lesson.card.todayWords.some((w) => w.modelLine.includes(word))).toBe(
      true,
    );
    const issues = check(lesson, 5).filter(
      (i) => i.rule === "vocab-allocation",
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain(word);
  });
});

describe("회화 단원 덮기 · 일부 단원(6.4 회화 단원 덮기, 정한 것 15)", () => {
  it("AC-15m 단원을 다 채운 단원은 단원 단어마다 다지기 · 보강 필수 질문과 더 이야기할 거리가 talk.known_days 번 이상 서로 다른 수업에서 노려야 한다", () => {
    const cards = structuredClone(talkUnitCards(ref, 1));
    const frame = index.frame("talk", 1, UNIT);
    if (!frame) throw new Error("단원 틀 없음");
    expect(cards).toHaveLength(frame.regularLessons);
    const complete = { complete: true };
    expect(
      errorsOf(checkTalkUnit(cards, ctxOf(1), complete)).map((i) => i.rule),
    ).toEqual([]);
    const [word, other] = unitWordsOf(ref, "talk", 1, UNIT);
    if (!word || !other) throw new Error("단원 단어 없음");
    for (const c of cards) {
      for (const list of [c.card.required, c.card.more]) {
        for (const item of list) {
          if (item.ask === "re_ask")
            item.targets = item.targets.map((t) => (t === word ? other : t));
        }
      }
    }
    const issues = errorsOf(checkTalkUnit(cards, ctxOf(1), complete)).filter(
      (i) => i.rule === "talk-known-days",
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain(word);
  });

  it("AC-15m 단원 덮기는 배정 카드의 다시 묻는 필수 질문을 세지 않는다(다지기 · 보강 필수 질문 · 더 이야기할 거리만, 06:187)", () => {
    const cards = structuredClone(talkUnitCards(ref, 1));
    const [word, other] = unitWordsOf(ref, "talk", 1, UNIT);
    if (!word || !other) throw new Error("단원 단어 없음");
    for (const c of cards)
      for (const list of [c.card.required, c.card.more])
        for (const item of list)
          if (item.ask === "re_ask")
            item.targets = item.targets.map((t) => (t === word ? other : t));
    // 배정 카드 둘에 그 단어를 다시 묻는 필수 질문을 하나씩 더한다(상한 안).
    const assigned = cards.filter((c) => c.kind === "assigned").slice(0, 2);
    expect(assigned).toHaveLength(2);
    for (const c of assigned) {
      const base = c.card.required[0];
      if (!base) throw new Error("필수 질문 없음");
      c.card.required.push({
        ...structuredClone(base),
        no: c.card.required.length + 1,
        ask: "re_ask",
        targets: [word],
      });
    }
    const issues = errorsOf(
      checkTalkUnit(cards, ctxOf(1), { complete: true }),
    ).filter((i) => i.rule === "talk-known-days");
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain(word);
  });

  it("AC-15m 단원 칸이 다 찼는지는 검증기가 단원 틀로 가른다: 다 찬 단원(정규 · 보강 · 주제 변형 전부)은 덮기 모자람이 오류이고 보강 카드의 필수 질문도 센다", () => {
    const frame = index.frame("talk", 1, UNIT);
    if (!frame) throw new Error("단원 틀 없음");
    const full: TalkLesson[] = [];
    for (let variant = 1; variant <= frame.topicVariants; variant++) {
      full.push(...talkUnitCards(ref, 1, UNIT, variant));
      for (let n = 1; n <= frame.remedialLessons; n++)
        full.push(
          talkCard(ref, {
            level: 1,
            unit: UNIT,
            kind: "remedial",
            lessonNo: n,
            variant,
          }),
        );
    }
    const cards = structuredClone(full);
    expect(errorsOf(checkTalkUnit(cards, ctxOf(1)))).toEqual([]);
    const [word, other] = unitWordsOf(ref, "talk", 1, UNIT);
    if (!word || !other) throw new Error("단원 단어 없음");
    const v1 = cards.filter((c) => c.variant === 1);
    for (const c of v1)
      for (const list of [c.card.required, c.card.more])
        for (const item of list)
          if (item.ask === "re_ask")
            item.targets = item.targets.map((t) => (t === word ? other : t));
    const broken = errorsOf(checkTalkUnit(cards, ctxOf(1)));
    expect(broken.map((i) => i.rule)).toEqual(["talk-known-days"]);
    expect(broken[0]?.path).toBe("variant.1");
    expect(broken[0]?.message).toContain(word);
    // 보강 카드 둘의 필수 질문이 그 단어를 다시 묻으면 덮기가 찬다.
    const remedial = v1.filter((c) => c.kind === "remedial").slice(0, 2);
    expect(remedial).toHaveLength(2);
    for (const c of remedial) {
      const item = c.card.required[0];
      if (!item) throw new Error("필수 질문 없음");
      item.targets = [word];
    }
    expect(errorsOf(checkTalkUnit(cards, ctxOf(1)))).toEqual([]);
  });

  it("AC-15m 단원 칸이 덜 찬 단원(세 장 먼저)은 옵션 없이도 단원 덮기를 talk-unit-incomplete 경고 하나로만 낸다", () => {
    const three = talkUnitCards(ref, 3).slice(0, 3);
    const issues = checkTalkUnit(three, ctxOf(3));
    expect(errorsOf(issues)).toEqual([]);
    const incomplete = issues.filter((i) => i.rule === "talk-unit-incomplete");
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.severity).toBe("warning");
    expect(incomplete[0]?.path).toBe("variant.1");
  });

  it("AC-15m 일부 단원(세 장 먼저)은 단원 덮기를 오류가 아닌 talk-unit-incomplete 경고로만 낸다", () => {
    const three = talkUnitCards(ref, 3).slice(0, 3);
    const issues = checkTalkUnit(three, ctxOf(3), { complete: false });
    expect(errorsOf(issues)).toEqual([]);
    const incomplete = issues.filter((i) => i.rule === "talk-unit-incomplete");
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.severity).toBe("warning");
    // 다 찬 단원이라고 하면 같은 카드가 오류다.
    expect(
      errorsOf(checkTalkUnit(three, ctxOf(3), { complete: true })).length,
    ).toBeGreaterThan(0);
  });
});

/** DB 열거에만 남은 옛 흐름 토막 값(오늘 쓸 말 · 말해 보기 — 코드 토막에서는 묶음 12 가 지웠다, 정한 것 8). */
const OLD_SEGMENTS = talkSegmentEnum.enumValues.filter(
  (v) => !(TALK_SEGMENTS as readonly string[]).includes(v),
);

describe("회화 단계 규격 새 꼴 · 관계 · 문항 번호", () => {
  it("AC-15m 시드 파일의 회화 단계 규격 행이 옛 꼴(옛 토막 · turns · twoAnswers · choices 없음)이면 단계 규격이 거부하고, 네 토막 차례가 틀리면 규격 정합이 거부한다", () => {
    for (const level of [1, 3, 4, 12]) {
      const spec = specOf(level);
      expect(spec.segments).toEqual([...TALK_SPEC_SEGMENTS]);
      expect(spec.cardShape).toBe("required");
      expect(spec.choices).toBe(level === 1);
      expect(spec.moreTalk).toBe(true);
      expect("twoAnswers" in spec).toBe(false);
      expect(spec.koExplainFromStuck).toBe(level <= 4 ? 1 : 2);
    }
    // 옛 판 행 꼴(C189 앞): 말해 보기 토막 · turns 카드 · 답 두 개 · choices 없음
    const { choices: _c, ...noChoices } = specOf(2);
    const oldRow = {
      ...noChoices,
      segments: ["greeting", ...OLD_SEGMENTS, "talk", "wrap_up"],
      cardShape: "turns",
      twoAnswers: false,
    };
    expect(TalkLevelSpecSchema.safeParse(oldRow).success).toBe(false);
    // 값은 새 꼴이지만 차례가 틀린 행은 규격 정합(level-spec-talk-v1)이 거부한다
    const old = structuredClone(ref);
    old.levelSpecs.levelSpecs = old.levelSpecs.levelSpecs.map((s) =>
      s.area === "talk" && s.level === 2
        ? { ...s, segments: ["greeting", "talk", "prep", "wrap_up"] }
        : s,
    );
    const { issues } = buildReferenceIndex(old);
    const v1 = issues.filter((i) => i.rule === "level-spec-talk-v1");
    expect(v1).toHaveLength(1);
    expect(v1[0]?.message).toContain("2단계");
  });

  it("AC-15m 회화 단계 규격 행의 옛 칸은 하나만 어겨도 거부한다(옛 토막 · cardShape · choices 없음 · twoAnswers · koExplainFromStuck 없음 각각 — 단계 규격 필수 칸, C195 · 묶음 12)", () => {
    const base = specOf(4) as unknown as Record<string, unknown>;
    const without = (key: string) => {
      const { [key]: _drop, ...rest } = base;
      return rest;
    };
    const cases: [string, Record<string, unknown>][] = [
      [
        "segments",
        { ...base, segments: ["greeting", OLD_SEGMENTS[0], "talk", "wrap_up"] },
      ],
      ["cardShape", { ...base, cardShape: "turns" }],
      ["choices 없음", without("choices")],
      ["twoAnswers", { ...base, twoAnswers: false }],
      ["koExplainFromStuck 없음", without("koExplainFromStuck")],
    ];
    expect(TalkLevelSpecSchema.safeParse(base).success).toBe(true);
    for (const [label, row] of cases)
      expect(TalkLevelSpecSchema.safeParse(row).success, label).toBe(false);
  });

  it("AC-15m 3.2 관계 표: talk.prep_words.1-3 ≤ unit.new_words_per_lesson.1-3 · 새 단어 수 ≤ 참고 턴 × talk.required_max_ratio", () => {
    const values = new Map(
      ref.settings.settings.map((r) => [r.key, r.value as number]),
    );
    const reader = (over: Record<string, number>) => (key: string) => {
      const v = over[key] ?? values.get(key);
      if (typeof v !== "number") throw new Error(`없는 키 ${key}`);
      return v;
    };
    const levelSpecs = ref.levelSpecs.levelSpecs;
    expect(checkFrameRelations({ settings: reader({}), levelSpecs })).toEqual(
      [],
    );
    const prep = checkFrameRelations({
      settings: reader({ "talk.prep_words.1-3": 6 }),
      levelSpecs,
    });
    expect(prep.map((v) => v.rule)).toEqual(["frame-talk-prep"]);
    const required = checkFrameRelations({
      settings: reader({ "talk.required_max_ratio": 0.2 }),
      levelSpecs,
    });
    expect(new Set(required.map((v) => v.rule))).toEqual(
      new Set(["frame-talk-required"]),
    );
    expect(required.every((v) => v.area === "talk")).toBe(true);
  });

  it("AC-15m 문항 번호: 회화 카드는 인사 → 필수 질문 → 더 이야기할 거리 차례다", () => {
    const lesson = card(1);
    const items = itemsOf({
      key: "x",
      kind: "lesson",
      area: "talk",
      value: lesson,
    });
    const greeting =
      "questions" in lesson.card.greeting
        ? lesson.card.greeting.questions.length
        : 1;
    expect(items).toHaveLength(
      greeting + lesson.card.required.length + lesson.card.more.length,
    );
    expect(items[0]?.path).toBe("card.greeting.questions.0");
    expect(items[greeting]?.path).toBe("card.required.0");
    expect(items.at(-1)?.path).toBe(`card.more.${lesson.card.more.length - 1}`);
  });
});

// ── 장면 여는 질문(06:186 · C206 — 'AI 몫 넓힘' plan 묶음 3 · AC-5 (가)) ──

/** 견본 어휘(기능어 · like)만 쓴 장면 여는 질문. 단계 규격에 맞춰 3단계는 영어 틀, 선택지 단계(1단계)는 선택지 둘을 둔다. */
function openerFor(level: number): TalkSceneOpener {
  const spec = specOf(level);
  return {
    question: {
      en: "This is it. Do we like it?",
      ko: "이거야. 우리 이거 좋아해?",
    },
    hintKo: "응, 좋아.",
    hintEn: "Yes, I like it.",
    ...(spec.frameInTurns ? { frameEn: "Yes, I like ___." } : {}),
    answerExample: "Yes, I do.",
    easyQuestion: { en: "Is it here?", ko: "여기 있어?" },
    ...(spec.choices ? { choices: ["I like it.", "I like this."] } : {}),
  } as TalkSceneOpener;
}
function withOpener(
  level: 1 | 3,
  change: (o: TalkSceneOpener) => void = () => {},
): TalkLesson {
  const lesson = card(level);
  const opener = openerFor(level);
  change(opener);
  lesson.card.sceneOpener = opener;
  return lesson;
}
/** 예외 카드(3단계 단원 1, 개정 4)와 같은 자리 · 개정의 견본 카드(칸 없음). */
function exemptLike(
  kind: "assigned" | "reinforce",
  lessonNo: number,
): TalkLesson {
  const lesson = card(3);
  lesson.kind = kind;
  lesson.lessonNo = lessonNo;
  lesson.variant = 1;
  lesson.revision = 4;
  delete lesson.card.sceneOpener;
  return lesson;
}
const openerPaths = (issues: SeedIssue[]) =>
  pathsOf(issues, "talk-scene-opener");

describe("회화 장면 여는 질문(06:186 · C206, AC-5 (가))", () => {
  it("AC-5 바른 장면 여는 질문을 단 1 · 3단계 카드는 오류가 없다", () => {
    for (const level of [1, 3] as const) {
      expect(rulesOf(check(withOpener(level), level)), `${level}단계`).toEqual(
        rulesOf(check(card(level), level)),
      );
      expect(openerPaths(check(withOpener(level), level))).toEqual([]);
    }
  });

  it("AC-5 예외 밖 1~3단계 카드(견본 · 새로 만드는 카드)는 개정이 낮아도 장면 여는 질문이 없으면 거부한다", () => {
    for (const level of [1, 2, 3] as const) {
      const lesson =
        level === 2
          ? structuredClone(talkUnitCards(ref, 2)[0] as TalkLesson)
          : card(level);
      expect(lesson.revision).toBeLessThanOrEqual(4);
      // 견본 3단계 카드는 예외 자리(단원 1 배정 1)라 수업 번호를 비켜 예외 밖으로 둔다
      if (level === 3) lesson.lessonNo = 2;
      expect(openerPaths(check(lesson, level)), `${level}단계 칸 있음`).toEqual(
        [],
      );
      delete lesson.card.sceneOpener;
      expect(openerPaths(check(lesson, level)), `${level}단계 칸 없음`).toEqual(
        ["card.sceneOpener"],
      );
    }
    // 예외와 단계 · 단원 · 수업만 같고 변형이 다른 카드도 예외 밖이다
    const other = exemptLike("assigned", 1);
    other.variant = 2;
    expect(openerPaths(check(other, 3))).toEqual(["card.sceneOpener"]);
  });

  it("AC-5 예외 카드(회화 3단계 단원 1 배정 1 · 다지기 6, 개정 4 이하)는 장면 여는 질문 없이 통과한다", () => {
    expect(
      TALK_SCENE_OPENER_EXEMPT.map((e) => [
        e.level,
        e.unit,
        e.kind,
        e.lessonNo,
        e.variant,
        e.maxRevision,
      ]),
    ).toEqual([
      [3, 1, "assigned", 1, 1, 4],
      [3, 1, "reinforce", 6, 1, 4],
    ]);
    for (const [kind, no] of [
      ["assigned", 1],
      ["reinforce", 6],
    ] as const) {
      const lesson = exemptLike(kind, no);
      expect(openerPaths(check(lesson, 3)), `${kind} ${no}`).toEqual([]);
      // 칸이 있으면 예외 카드도 검사를 모두 받는다
      lesson.card.sceneOpener = openerFor(3);
      lesson.card.sceneOpener.answerExample = "I like it.";
      expect(openerPaths(check(lesson, 3))).toEqual([
        "card.sceneOpener.answerExample",
      ]);
    }
    // 단원 2 의 같은 수업 번호는 예외가 아니다
    const lesson = exemptLike("assigned", 1);
    expect(
      openerPaths(checkTalkCard(lesson, { ...ctxOf(3), unit: 2 })),
    ).toContain("card.sceneOpener");
  });

  it("AC-5 예외 카드도 개정 5 이상이면 장면 여는 질문이 없으면 거부한다", () => {
    for (const [kind, no] of [
      ["assigned", 1],
      ["reinforce", 6],
    ] as const) {
      const lesson = exemptLike(kind, no);
      lesson.revision = 5;
      expect(openerPaths(check(lesson, 3)), `${kind} ${no}`).toEqual([
        "card.sceneOpener",
      ]);
    }
  });

  it("AC-5 4단계 카드에는 장면 여는 질문을 두지 않고 칸을 요구하지 않는다", () => {
    const lesson = card(4);
    expect(openerPaths(check(lesson, 4))).toEqual([]);
    lesson.card.sceneOpener = openerFor(3);
    expect(openerPaths(check(lesson, 4))).toEqual(["card.sceneOpener"]);
  });

  it("AC-5 물음표 문장 둘 · 물음표가 마지막이 아님 · 세 문장을 거부한다", () => {
    const q = "card.sceneOpener.question.en";
    for (const en of [
      "Do you like it? Do we like it?",
      "Do we like it? It is here.",
      "This is it. It is here.",
      "This is it. It is here. Do we like it?",
    ]) {
      const lesson = withOpener(3, (o) => {
        o.question.en = en;
      });
      expect(openerPaths(check(lesson, 3)), en).toContain(q);
    }
  });

  it("AC-5 예 · 아니요 꼴이 아닌 질문(첫 낱말이 조동사 · be 가 아님 · 'or')을 거부한다", () => {
    const q = "card.sceneOpener.question.en";
    for (const en of [
      "This is it. What do we like?",
      "This is it. You like it?",
      "Do you like this or that?",
    ]) {
      const issues = check(
        withOpener(3, (o) => {
          o.question.en = en;
        }),
        3,
      );
      expect(openerPaths(issues), en).toContain(q);
    }
    for (const en of [
      "Is it there?",
      "Can we have it?",
      "{NAME}, do we like it?",
    ]) {
      const issues = check(
        withOpener(3, (o) => {
          o.question.en = en;
        }),
        3,
      );
      expect(openerPaths(issues), en).toEqual([]);
    }
  });

  it("AC-5 범위 밖 낱말 · {NAME} 둘 · 노리는 단어가 든 질문을 거부한다", () => {
    const lesson = card(3);
    const target = requiredAt(lesson, 0).targets[0] ?? "";
    const cases: [string, (o: TalkSceneOpener) => void][] = [
      [
        "범위 밖",
        (o) => {
          o.question.en = "This is a zebra. Do we like it?";
        },
      ],
      [
        "{NAME} 둘",
        (o) => {
          o.question.en = "{NAME}, {NAME}! Do we like it?";
        },
      ],
      [
        "노리는 단어",
        (o) => {
          o.question.en = `Do we like the ${target}?`;
        },
      ],
    ];
    for (const [label, change] of cases) {
      expect(openerPaths(check(withOpener(3, change), 3)), label).toContain(
        "card.sceneOpener.question.en",
      );
    }
  });

  it("AC-5 인사 · 필수 · 쉬운 · 더 이야기할 거리 질문과 같은 글을 거부한다(정규화 · 마지막 물음표 문장)", () => {
    const lesson = card(3);
    const greeting =
      "questions" in lesson.card.greeting
        ? (lesson.card.greeting.questions[0]?.question.en ?? "")
        : "";
    const required = requiredAt(lesson, 0);
    const more = lesson.card.more[0];
    for (const en of [
      greeting,
      required.en.toUpperCase(),
      `This is it. ${required.easyQuestion.en}`,
      more?.en ?? "",
    ]) {
      const issues = check(
        withOpener(3, (o) => {
          o.question.en = en;
        }),
        3,
      );
      expect(
        errorsOf(issues).some(
          (i) =>
            i.rule === "talk-scene-opener" && i.message.includes("같은 질문"),
        ),
        en,
      ).toBe(true);
    }
  });

  it("AC-5 한국어 뜻 없음 · 답 예시가 Yes · No 로 시작하지 않음 · 쉬운 질문 물음표 없음 · 쉬운 질문이 같은 글을 거부한다", () => {
    const cases: [string, string, (o: TalkSceneOpener) => void][] = [
      [
        "뜻 없음",
        "card.sceneOpener.question.ko",
        (o) => {
          delete o.question.ko;
        },
      ],
      [
        "답 예시",
        "card.sceneOpener.answerExample",
        (o) => {
          o.answerExample = "I like it.";
        },
      ],
      [
        "쉬운 질문 물음표",
        "card.sceneOpener.easyQuestion.en",
        (o) => {
          o.easyQuestion.en = "It is here.";
        },
      ],
      [
        "쉬운 질문 같은 글",
        "card.sceneOpener.easyQuestion.en",
        (o) => {
          o.easyQuestion.en = "Do we like it?";
        },
      ],
      [
        "쉬운 질문 뜻 없음",
        "card.sceneOpener.easyQuestion.ko",
        (o) => {
          delete o.easyQuestion.ko;
        },
      ],
    ];
    for (const [label, path, change] of cases) {
      expect(openerPaths(check(withOpener(3, change), 3)), label).toContain(
        path,
      );
    }
    for (const answer of ["No, I don't.", "yes!", "Yes."]) {
      const issues = check(
        withOpener(3, (o) => {
          o.answerExample = answer;
        }),
        3,
      );
      expect(openerPaths(issues), answer).toEqual([]);
    }
  });

  it("AC-5 선택지 단계(1단계)는 같은 꼴에 낱말 하나만 다른 선택지 둘을 두고, 다른 단계는 선택지를 두지 않으며 3단계는 영어 틀을 둔다", () => {
    const c = "card.sceneOpener.choices";
    expect(
      openerPaths(
        check(
          withOpener(1, (o) => {
            delete o.choices;
          }),
          1,
        ),
      ),
    ).toContain(c);
    expect(
      openerPaths(
        check(
          withOpener(1, (o) => {
            o.choices = ["I like it.", "We like this."];
          }),
          1,
        ),
      ),
    ).toContain(c);
    expect(
      openerPaths(
        check(
          withOpener(3, (o) => {
            o.choices = ["I like it.", "I like this."];
          }),
          3,
        ),
      ),
    ).toContain(c);
    expect(specOf(3).frameInTurns).toBe(true);
    expect(
      openerPaths(
        check(
          withOpener(3, (o) => {
            delete o.frameEn;
          }),
          3,
        ),
      ),
    ).toContain("card.sceneOpener.frameEn");
  });

  it("AC-5 선생님 이름이 든 칸 · 문장 길이 상한을 넘는 칸은 카드 글 공통 검사가 sceneOpener 경로로 막는다", () => {
    const named = check(
      withOpener(3, (o) => {
        o.hintEn = "Yes, Mina, I like it.";
      }),
      3,
    );
    expect(pathsOf(named, "teacher-name")).toContain("card.sceneOpener.hintEn");
    const long = check(
      withOpener(1, (o) => {
        o.question.en = "This is it. Do we like it here with you too?";
      }),
      1,
    );
    expect(pathsOf(long, "learning-elements")).toContain(
      "card.sceneOpener.question.en",
    );
  });

  it("AC-6 1~3단계 카드의 안전한 대사가 지어낸 경험 꼴에 걸리면 거부하고, 4단계는 보지 않는다", () => {
    for (const level of [1, 3, 4] as const) {
      const lesson = card(level);
      const first = lesson.card.safeLines[0];
      if (!first) throw new Error("안전한 대사 없음");
      first.en = "I remember it! Let's talk.";
      const paths = pathsOf(check(lesson, level), "talk-made-up");
      expect(paths, `${level}단계`).toEqual(
        level === 4 ? [] : ["card.safeLines.0.en"],
      );
    }
  });
});
