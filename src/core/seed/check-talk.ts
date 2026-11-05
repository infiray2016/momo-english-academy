// 회화 카드 검사(6.4 회화 시나리오 카드 · 회화 카드 목표 · 회화 필수 질문 · 회화 짧은 준비 · 더 이야기할 거리 · 회화 단원 덮기 ·
// 회화 미션 · 역할 바꾸기 행과 어휘 배정의 회화 몫, C189 새 꼴 — 회화 plan 묶음 3 · AC-15m 단위 몫).
// 으뜸 원칙(C172 · C181): 카드와 목표는 대화를 돕는 장치이지 수업 완료를 위해 채우는 할당량이 아니다. 이 검사는 카드가 준비한 기회의
// 꼴과 수만 보고, 모든 질문을 정한 차례로 묻게 하거나 참고 턴을 질문으로 채우는 꼴을 요구하지 않는다(필수 질문 하한은 새 단어 · k 뿐).
// 카드 하나는 P4b 수업 공통 검사를 회화 몫 role 로 부른 뒤 회화 규칙을 더 본다. 단원 단위(단원 덮기 · 목표 정의 전)는 checkTalkUnit 이
// 보고, 단원 칸이 다 차지 않았으면 경고로만 낸다(회화 plan 정한 것 15). 단계마다 다른 것은 level_specs 회화 칸에서 읽는다. DB 없는 순수 함수다.
import { cardQuestionKeyOf } from "@/core/conversation/question-check";
import {
  checkLessonCommon,
  type LessonCellContext,
  makeReport,
  type Report,
  type SeedIssue,
} from "@/core/seed/check-lesson";
import { checkTeacherNames } from "@/core/seed/check-teacher";
import { type TalkLesson, textsOfLesson } from "@/core/seed/schema/lesson";
import type { TalkLevelSpec, UnitGoal } from "@/core/seed/schema/reference";
import type {
  TalkMission,
  TalkMore,
  TalkRequired,
} from "@/core/seed/schema/talk";
import {
  approxLe,
  bandKey,
  cellKey,
  GOAL_AREA_PREFIX,
  PLACEHOLDER_NAME,
  TALK_LOW_BAND,
  TALK_SAME_QUESTION_MAX,
  TALK_TARGETS_PER_TURN,
  TALK_TODAY_TOPICS,
  type TextRole,
} from "@/core/seed/structure";
import { placeholdersIn, wordIdsIn } from "@/core/seed/text";

/**
 * 회화 몫의 영어 글 role(6.4 회화 행: 첫 말 · 힌트 · 답 예시 · 들려줄 말 · 쉬운 질문 · 선택지 · 더 이야기할 거리 · 정리 · 안전한 대사 ·
 * 끝인사 · 미션 · 역할 바꾸기). 예상 흐름(role flow)은 아이에게 보이지 않는 AI 지시 글이라 넣지 않는다 — 문장 길이 · 형태 범위 · 단원 단어 ·
 * 문장 통계 · 보강 덮기 세기에서 빠지고, 금지어 · 선생님 이름 검사는 받는다(C132 (3) · C134).
 */
export const TALK_ROLES: readonly TextRole[] = [
  "tori",
  "hint",
  "child",
  "pair",
  "prompt",
  "example",
  "expression",
];
/** 회화 어휘 배정: 아이 차례의 힌트 · 답 예시 · 쓸 수 있는 말 · 목표 표현(6.4 어휘 배정). 들려줄 말 · 예문(example)은 세지 않는다. */
export const TALK_ALLOCATION_ROLES: readonly TextRole[] = [
  "hint",
  "child",
  "expression",
];

function cellOf(lesson: TalkLesson, ctx: LessonCellContext): string {
  return cellKey({
    type: "lesson",
    area: "talk",
    level: ctx.level,
    unit: ctx.unit,
    kind: lesson.kind,
    lessonNo: lesson.lessonNo,
    variant: lesson.variant,
  });
}

/** 소문자 · 문장 부호 뺀 낱말(선택지 견주기). */
function plainWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w !== "");
}

/** 같은 질문 세기의 글 꼴(소문자, 공백 정리). */
export function questionKey(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
/** 쉬운 질문과 그 질문을 견주는 정규화(소문자 · 문장 부호 · 공백, 6.4 '정규화한 글이 다르다'). */
function normalizedQuestion(text: string): string {
  return plainWords(text).join(" ");
}

function talkSpec(ctx: LessonCellContext): TalkLevelSpec | undefined {
  const spec = ctx.index.levelSpec("talk", ctx.level);
  return spec?.area === "talk" ? spec : undefined;
}
const isLow = (spec: TalkLevelSpec) => spec.band === TALK_LOW_BAND;

/** 필수 질문 · 더 이야기할 거리 한 줄과 그 경로. */
type Item = {
  path: string;
  item: TalkRequired | TalkMore;
  group: "required" | "more";
};
function itemsOfCard(lesson: TalkLesson): Item[] {
  return [
    ...lesson.card.required.map((item, i) => ({
      path: `card.required.${i}`,
      item,
      group: "required" as const,
    })),
    ...lesson.card.more.map((item, i) => ({
      path: `card.more.${i}`,
      item,
      group: "more" as const,
    })),
  ];
}

// ── 꼴 · 번호 ────────────────────────────────────────────────────

function checkShape(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  report: Report,
): void {
  const { card } = lesson;
  const greetingQuestions =
    "questions" in card.greeting ? card.greeting.questions : undefined;
  if (isLow(spec)) {
    if (!greetingQuestions) {
      report(
        "talk-shape",
        "card.greeting",
        "1~3단계 카드는 인사 질문(greeting.questions)을 둔다",
      );
    } else if (greetingQuestions.length !== card.greetingTurns) {
      report(
        "talk-shape",
        "card.greeting.questions",
        `인사 질문 ${greetingQuestions.length}개가 인사 턴 수 ${card.greetingTurns} 와 다르다`,
      );
    }
  } else if (greetingQuestions) {
    report(
      "talk-shape",
      "card.greeting",
      "4단계부터 카드는 선생님의 첫 말(greeting.firstLine)을 둔다",
    );
  }
  for (const [name, list] of [
    ["required", card.required],
    ["more", card.more],
  ] as const) {
    list.forEach((item, i) => {
      if (item.no !== i + 1) {
        report(
          "talk-numbers",
          `card.${name}.${i}.no`,
          `번호 ${item.no} 가 차례 ${i + 1} 과 다르다(1부터 차례대로)`,
        );
      }
    });
  }
}

// ── 목표 · 요구 능력 ─────────────────────────────────────────────

function unitGoalsOf(ctx: LessonCellContext): Map<string, UnitGoal> {
  const goals = ctx.index.unitSpec("talk", ctx.level, ctx.unit)?.goals ?? [];
  return new Map(goals.map((g) => [g.id, g]));
}

/**
 * 6.4 회화 카드 목표: 카드 goals 는 그 단원 목표 안(단원 목표가 없으면 단원 검사의 '목표 정의 전' 경고), 필수 질문 · 더 이야기할 거리 ·
 * 미션의 목표는 카드 goals 안, 카드 목표마다 필수 질문 하나 이상이 노린다. 목표가 여럿이면 요구 능력이 있어야 하고, 목표마다 그 core 가
 * 요구 능력 안이다(요구 능력 타당성, C171). home 밖 purpose 를 단 과제에 요구 능력이 없으면 거부한다.
 */
function checkGoals(
  lesson: TalkLesson,
  ctx: LessonCellContext,
  report: Report,
): void {
  const { card } = lesson;
  const unitGoals = unitGoalsOf(ctx);
  const pattern = new RegExp(
    `^${GOAL_AREA_PREFIX.talk}-${ctx.level}-${ctx.unit}-\\d+$`,
  );
  card.goals.forEach((id, i) => {
    if (!pattern.test(id)) {
      report(
        "talk-goals",
        `card.goals.${i}`,
        `목표 ID ${id} 가 ${GOAL_AREA_PREFIX.talk}-${ctx.level}-${ctx.unit}-<n> 꼴이 아니다`,
      );
    } else if (unitGoals.size > 0 && !unitGoals.has(id)) {
      report(
        "talk-goals",
        `card.goals.${i}`,
        `목표 ${id} 가 이 단원의 unit-specs goals [${[...unitGoals.keys()].join(", ")}] 에 없다`,
      );
    }
  });
  const cardGoals = new Set(card.goals);
  const linked: {
    path: string;
    goals: readonly string[];
    demands?: readonly string[];
    purpose?: string;
  }[] = [
    ...itemsOfCard(lesson).map(({ path, item }) => ({
      path,
      goals: item.goals,
      ...(item.demands ? { demands: item.demands } : {}),
      ...(item.purpose ? { purpose: item.purpose } : {}),
    })),
    ...(card.missions ?? []).map((m: TalkMission, i) => ({
      path: `card.missions.${i}`,
      goals: m.goals,
      ...(m.demands ? { demands: m.demands } : {}),
      ...(m.purpose ? { purpose: m.purpose } : {}),
    })),
  ];
  for (const entry of linked) {
    const outside = entry.goals.filter((g) => !cardGoals.has(g));
    if (outside.length > 0) {
      report(
        "talk-goals",
        `${entry.path}.goals`,
        `목표 ${outside.join(", ")} 가 카드 goals [${card.goals.join(", ")}] 밖이다`,
      );
    }
    const purpose = entry.purpose ?? card.purpose;
    const homeOutside =
      purpose !== undefined &&
      entry.goals.some((g) => {
        const goal = unitGoals.get(g);
        return goal !== undefined && !goal.home.includes(purpose);
      });
    if ((entry.goals.length > 1 || homeOutside) && !entry.demands) {
      report(
        "talk-demands",
        `${entry.path}.demands`,
        entry.goals.length > 1
          ? `목표 ${entry.goals.length}개(${entry.goals.join(", ")})를 가리키는데 요구 능력(demands)이 없다`
          : `목표 home 밖 purpose(${purpose})를 단 과제에 요구 능력(demands)이 없다`,
      );
      continue;
    }
    const demands =
      entry.demands ??
      (entry.goals.length === 1
        ? [unitGoals.get(entry.goals[0] ?? "")?.core ?? ""]
        : []);
    for (const id of entry.goals) {
      const goal = unitGoals.get(id);
      if (goal && !demands.includes(goal.core)) {
        report(
          "talk-demands",
          `${entry.path}.demands`,
          `요구 능력이 맞지 않음: 목표 ${id} 의 주된 능력 '${goal.core}' 가 요구 능력 [${demands.join(", ")}] 안에 없다(그 능력의 목표로 잇거나 과제를 고침)`,
        );
      }
    }
  }
  const aimed = new Set(card.required.flatMap((r) => r.goals));
  card.goals.forEach((id, i) => {
    if (!aimed.has(id)) {
      report(
        "talk-goals",
        `card.goals.${i}`,
        `카드 목표 ${id} 를 노리는 필수 질문이 없다`,
      );
    }
  });
}

// ── 필수 질문 · 처음 묻는 턴 · 짧은 준비 ──────────────────────────

/** 영어 문장 힌트 칸(단계 규격 hintTiers 의 sentence 차례). 그 단이 없는 단계는 undefined. */
function sentenceHintIndex(spec: TalkLevelSpec): number | undefined {
  const tiers = spec.hintTiers.filter((t) => t !== "ko");
  const at = tiers.indexOf("sentence");
  return at < 0 ? undefined : at;
}

/**
 * 6.4 회화 필수 질문(수): 배정 수업은 새 단어마다 처음 묻는 필수 질문이 하나(처음 묻는 질문은 새 단어만 노림), 다지기 · 보강 수업은
 * 처음 묻는 질문이 없고 다시 묻는 필수 질문이 k 개 이상, 모든 카드는 필수 질문 수가 참고 턴 × talk.required_max_ratio 이하다.
 * 처음 묻는 필수 질문의 영어 문장 힌트(그 단이 없는 단계는 답 예시)는 그 질문의 새 단어를 담는다.
 */
function checkRequired(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  ctx: LessonCellContext,
  report: Report,
): void {
  const { card } = lesson;
  const newWords = new Set(lesson.newWords);
  const k = ctx.index.frame("talk", ctx.level, ctx.unit)?.k;
  const max = spec.targetTurns * ctx.index.num("talk.required_max_ratio");
  if (!approxLe(card.required.length, max)) {
    report(
      "talk-required",
      "card.required",
      `필수 질문 ${card.required.length}개가 참고 턴 ${spec.targetTurns} × talk.required_max_ratio = ${max} 를 넘는다(나머지 턴은 아이 말을 따라갈 자리다)`,
    );
  }
  const sentenceAt = sentenceHintIndex(spec);
  const firstOf = new Map<string, number>();
  card.required.forEach((item, i) => {
    const at = `card.required.${i}`;
    if (item.ask !== "first") return;
    if (lesson.kind !== "assigned") {
      report(
        "talk-first-ask",
        `${at}.ask`,
        "다지기 · 보강 카드에는 처음 묻는 필수 질문이 없다",
      );
      return;
    }
    const notNew = item.targets.filter((t) => !newWords.has(t));
    if (notNew.length > 0) {
      report(
        "talk-first-ask",
        `${at}.targets`,
        `처음 묻는 필수 질문이 새 단어가 아닌 ${notNew.join(", ")} 를 노린다`,
      );
    }
    const hintText =
      sentenceAt === undefined ? item.answerExample : item.hints[sentenceAt];
    const hintIds = wordIdsIn(hintText ?? "", ctx.index.lexicon);
    const missing = item.targets.filter(
      (t) => newWords.has(t) && !hintIds.has(t),
    );
    if (missing.length > 0) {
      report(
        "talk-first-ask",
        sentenceAt === undefined ? `${at}.answerExample` : `${at}.hints`,
        `처음 묻는 필수 질문의 영어 문장 힌트에 새 단어 ${missing.join(", ")} 가 없다`,
      );
    }
    for (const t of item.targets) {
      if (!newWords.has(t)) continue;
      if (firstOf.has(t)) {
        report(
          "talk-first-ask",
          `${at}.targets`,
          `새 단어 ${t} 를 처음 묻는 필수 질문이 둘이다(card.required.${firstOf.get(t)} 와 겹침)`,
        );
      } else firstOf.set(t, i);
    }
  });
  if (lesson.kind === "assigned") {
    for (const word of lesson.newWords) {
      if (!firstOf.has(word)) {
        report(
          "talk-first-ask",
          "card.required",
          `새 단어 ${word} 를 처음 묻는 필수 질문이 없다`,
        );
      }
    }
  } else if (k !== undefined) {
    const again = card.required.filter((r) => r.ask === "re_ask").length;
    if (again < k) {
      report(
        "talk-required",
        "card.required",
        `다지기 · 보강 카드의 다시 묻는 필수 질문 ${again}개가 k(unit.new_words_per_lesson) ${k} 보다 적다`,
      );
    }
  }
  checkPrep(lesson, spec, ctx, firstOf, report);
}

/**
 * 6.4 회화 짧은 준비: 1~3단계 배정 수업 카드의 짧은 준비 낱말이 talk.prep_words.<구간> 개이고 오늘 쓸 말 안에 있으며, 그 낱말을 처음 묻는
 * 필수 질문이 앞쪽 절반 안에 있다. 4단계부터는 두면 개수 · 오늘 쓸 말 안만 본다(06:30 '4단계부터 선택'). 다지기 · 보강 수업은 비운다(앱이 고른다).
 */
function checkPrep(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  ctx: LessonCellContext,
  firstOf: ReadonlyMap<string, number>,
  report: Report,
): void {
  const { card } = lesson;
  const prep = card.prep ?? [];
  if (lesson.kind !== "assigned") {
    if (prep.length > 0)
      report(
        "talk-prep",
        "card.prep",
        "다지기 · 보강 카드의 짧은 준비 낱말은 비운다(앱이 이월 단어를 앞세워 고른다)",
      );
    return;
  }
  if (card.prep === undefined && !isLow(spec)) return;
  const need = ctx.index.num(bandKey("talk.prep_words", spec.band));
  if (prep.length !== need) {
    report(
      "talk-prep",
      "card.prep",
      `짧은 준비 낱말 ${prep.length}개가 talk.prep_words.${spec.band} ${need} 와 다르다`,
    );
  }
  const today = new Set(card.todayWords.map((w) => w.word));
  const half = Math.ceil(card.required.length / 2);
  prep.forEach((word, i) => {
    if (!today.has(word)) {
      report(
        "talk-prep",
        `card.prep.${i}`,
        `짧은 준비 낱말 ${word} 가 오늘 쓸 말 안에 없다`,
      );
      return;
    }
    // 앞쪽 절반은 1~3단계 배정 카드에만 건다(06:186). 4단계부터는 앱이 막힌 질문 차례로 고른다(02-2:173)
    const at = firstOf.get(word);
    if (isLow(spec) && at !== undefined && at + 1 > half) {
      report(
        "talk-prep",
        `card.required.${at}`,
        `짧은 준비 낱말 ${word} 를 노리는 필수 질문(${at + 1}번)이 앞쪽 절반(1~${half}) 밖이다`,
      );
    }
  });
}

/**
 * 1단계 처음 묻는 필수 질문의 첫 꼴(6.3 · 6.4): 짧은 준비 낱말이면 그냥, 아니면 선택지 · 꺼내기. 선택지면 선택지 둘이 같은 꼴 문장에서
 * 낱말 하나만 다르고 하나는 노리는 단어다. 선택지를 두지 않는 단계 · 다시 묻는 질문에는 첫 꼴 · 선택지가 없다.
 */
function checkFirstForm(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  ctx: LessonCellContext,
  report: Report,
): void {
  const prep = new Set(lesson.card.prep ?? []);
  lesson.card.required.forEach((item, i) => {
    const at = `card.required.${i}`;
    const wanted = spec.choices === true && item.ask === "first";
    if (!wanted) {
      if (item.firstForm !== undefined)
        report(
          "talk-first-form",
          `${at}.firstForm`,
          "첫 꼴은 1단계 처음 묻는 필수 질문에만 둔다",
        );
      if (item.choices !== undefined)
        report(
          "talk-choices",
          `${at}.choices`,
          "선택지는 1단계 처음 묻는 필수 질문(첫 꼴 선택지)에만 둔다",
        );
      return;
    }
    const onPrep = item.targets.some((t) => prep.has(t));
    const expected = onPrep
      ? "그냥(plain)"
      : "선택지(choices) · 꺼내기(introduce)";
    const ok =
      item.firstForm !== undefined &&
      (onPrep ? item.firstForm === "plain" : item.firstForm !== "plain");
    if (!ok) {
      report(
        "talk-first-form",
        `${at}.firstForm`,
        `1단계 처음 묻는 필수 질문의 첫 꼴이 ${item.firstForm ?? "없음"} 이다(${onPrep ? "짧은 준비 낱말" : "짧은 준비에 없는 낱말"}이면 ${expected})`,
      );
    }
    if (item.firstForm !== "choices") {
      if (item.choices !== undefined)
        report(
          "talk-choices",
          `${at}.choices`,
          "첫 꼴이 선택지가 아니면 선택지를 두지 않는다",
        );
      return;
    }
    if (!item.choices) {
      report(
        "talk-choices",
        `${at}.choices`,
        "첫 꼴이 선택지인데 선택지 둘이 없다",
      );
      return;
    }
    const [a, b] = item.choices;
    const x = plainWords(a);
    const y = plainWords(b);
    if (x.length !== y.length || x.filter((w, j) => w !== y[j]).length !== 1) {
      report(
        "talk-choices",
        `${at}.choices`,
        `선택지 둘(${a} · ${b})이 같은 꼴 문장에서 낱말 하나만 다르지 않다`,
      );
    }
    const ids = new Set([
      ...wordIdsIn(a, ctx.index.lexicon),
      ...wordIdsIn(b, ctx.index.lexicon),
    ]);
    if (!item.targets.some((t) => ids.has(t))) {
      report(
        "talk-choices",
        `${at}.choices`,
        `선택지 둘에 노리는 단어(${item.targets.join(", ")})가 없다`,
      );
    }
  });
}

// ── 노린 단어 · 받침 · 힌트 · 같은 질문 ──────────────────────────

/** 노리는 단어 1~2 · 단원 단어 · 질문 · 쉬운 질문에 노리는 단어 없음(A4-03). */
function checkTargets(
  lesson: TalkLesson,
  ctx: LessonCellContext,
  report: Report,
): void {
  const unitWords = new Set(
    ctx.index.unitSpec("talk", ctx.level, ctx.unit)?.words ?? [],
  );
  for (const { path, item } of itemsOfCard(lesson)) {
    const n = item.targets.length;
    if (n < TALK_TARGETS_PER_TURN.min || n > TALK_TARGETS_PER_TURN.max) {
      report(
        "talk-targets",
        `${path}.targets`,
        `노리는 단어 ${n}개가 ${TALK_TARGETS_PER_TURN.min}~${TALK_TARGETS_PER_TURN.max}개 밖이다`,
      );
    }
    const outside = item.targets.filter((t) => !unitWords.has(t));
    if (outside.length > 0) {
      report(
        "talk-targets",
        `${path}.targets`,
        `노리는 단어 ${outside.join(", ")} 가 이 단원 단어가 아니다`,
      );
    }
    for (const [textPath, text] of [
      [`${path}.en`, item.en],
      [`${path}.easyQuestion.en`, item.easyQuestion.en],
    ] as const) {
      const ids = wordIdsIn(text, ctx.index.lexicon);
      const inText = item.targets.filter((t) => ids.has(t));
      if (inText.length > 0) {
        report(
          "talk-targets",
          textPath,
          `선생님 질문에 그 질문이 노리는 단어 ${inText.join(", ")} 가 있다`,
        );
      }
    }
  }
}

/** 받침: 필수 질문 · 더 이야기할 거리마다 물음표로 끝나는 쉬운 질문이 있고 그 질문과 정규화한 글이 다르다(막힌 뒤 같은 질문 금지). */
function checkSupport(lesson: TalkLesson, report: Report): void {
  for (const { path, item } of itemsOfCard(lesson)) {
    const easy = item.easyQuestion.en.trim();
    if (!easy.endsWith("?")) {
      report(
        "talk-support",
        `${path}.easyQuestion.en`,
        `쉬운 질문 '${easy}' 이 물음표로 끝나지 않는다`,
      );
    } else if (normalizedQuestion(easy) === normalizedQuestion(item.en)) {
      report(
        "talk-support",
        `${path}.easyQuestion.en`,
        "쉬운 질문이 그 질문과 같은 글이다(막힌 뒤 같은 질문을 다시 묻지 않는다)",
      );
    }
  }
}

/** 힌트 단 수 · 쓸 수 있는 말 수(단계 규격) · 1~3단계 인사 질문의 영어 틀. */
function checkHints(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  report: Report,
): void {
  const { card } = lesson;
  if ("questions" in card.greeting) {
    card.greeting.questions.forEach((turn, i) => {
      if ((turn.frameEn !== undefined) !== spec.frameInTurns) {
        report(
          "talk-hints",
          `card.greeting.questions.${i}.frameEn`,
          spec.frameInTurns
            ? "이 단계 인사 질문에는 영어 틀(frameEn)이 있어야 한다"
            : "이 단계 인사 질문에는 영어 틀(frameEn)을 두지 않는다",
        );
      }
    });
  }
  const tiers = spec.hintTiers.filter((t) => t !== "ko").length;
  for (const { path, item } of itemsOfCard(lesson)) {
    if (item.hints.length !== tiers) {
      report(
        "talk-hints",
        `${path}.hints`,
        `영어 힌트 단 ${item.hints.length}개가 단계 규격 ${tiers}개(${spec.hintTiers.filter((t) => t !== "ko").join(" → ") || "없음"})와 다르다`,
      );
    }
    const usable = item.usablePhrases?.length;
    if (
      spec.usablePhrases > 0
        ? usable !== spec.usablePhrases
        : usable !== undefined
    ) {
      report(
        "talk-hints",
        `${path}.usablePhrases`,
        `쓸 수 있는 말이 ${usable ?? 0}개라 단계 규격 ${spec.usablePhrases}개와 다르다`,
      );
    }
  }
}

/**
 * 한 카드 안에서 같은 선생님 질문(인사 · 필수 · 더 · 쉬운 질문)은 두 번까지. 열쇠는 실행 셈과 같은 마지막 물음표 문장이다
 * (question-check.ts 의 cardQuestionKeyOf — 카드 자리 항목 고르기와 같은 함수). 앱이 선생님 차례의 같은 질문을 그 문장으로
 * 세므로(02-2 200줄), 앞 장면이 달라도 꼬리가 같은 'You see it. What do you do?' 와 'You like it. What do you do?' 는 같은
 * 질문이다(회화 3단계 브리프 설계 검토 I-1).
 */
function checkSameQuestion(lesson: TalkLesson, report: Report): void {
  const { card } = lesson;
  const greeting = "questions" in card.greeting ? card.greeting.questions : [];
  const all: { path: string; text: string }[] = [
    ...greeting.map((g, i) => ({
      path: `card.greeting.questions.${i}.question.en`,
      text: g.question.en,
    })),
    ...itemsOfCard(lesson).flatMap(({ path, item }) => [
      { path: `${path}.en`, text: item.en },
      { path: `${path}.easyQuestion.en`, text: item.easyQuestion.en },
    ]),
  ];
  const counts = new Map<string, { n: number; path: string }>();
  for (const q of all) {
    const key = cardQuestionKeyOf(q.text);
    const seen = counts.get(key);
    counts.set(key, { n: (seen?.n ?? 0) + 1, path: seen?.path ?? q.path });
  }
  for (const [key, { n, path }] of counts) {
    if (n > TALK_SAME_QUESTION_MAX) {
      report(
        "talk-same-question",
        path,
        `같은 선생님 질문 '${key}' 가 ${n}번 나온다(마지막 물음표 문장 기준, ${TALK_SAME_QUESTION_MAX}번까지)`,
      );
    }
  }
}

// ── 더 이야기할 거리 · 그림 · 한국어 뜻 · 오늘 쓸 말 · 미션 ─────────

/** 더 이야기할 거리: talk.more_talk_turns 개 이상이고 모두 다시 묻는 질문이다(모든 단계). */
function checkMore(
  lesson: TalkLesson,
  ctx: LessonCellContext,
  report: Report,
): void {
  const more = lesson.card.more;
  const need = ctx.index.num("talk.more_talk_turns");
  if (more.length < need) {
    report(
      "talk-more",
      "card.more",
      `더 이야기할 거리 ${more.length}개가 talk.more_talk_turns ${need} 보다 적다`,
    );
  }
  more.forEach((item, i) => {
    if (item.ask !== "re_ask") {
      report(
        "talk-more",
        `card.more.${i}.ask`,
        "더 이야기할 거리는 모두 다시 묻는 질문이다",
      );
    }
  });
}

function checkImages(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  ctx: LessonCellContext,
  report: Report,
): void {
  const { card } = lesson;
  const greeting = "questions" in card.greeting ? card.greeting.questions : [];
  const keys: { path: string; key?: string }[] = [
    ...greeting.map((g, i) => ({
      path: `card.greeting.questions.${i}.imageKey`,
      key: g.imageKey,
    })),
    ...card.todayWords.map((w, i) => ({
      path: `card.todayWords.${i}.imageKey`,
      key: w.imageKey,
    })),
    ...itemsOfCard(lesson).map(({ path, item }) => ({
      path: `${path}.imageKey`,
      key: item.imageKey,
    })),
  ];
  for (const { path, key } of keys) {
    if (key === undefined) continue;
    if (!spec.turnImages) {
      report("talk-images", path, "이 단계 카드에는 그림 키를 두지 않는다");
    } else if (!ctx.index.images.has(key)) {
      report("talk-images", path, `그림 키 ${key} 가 그림 카탈로그에 없다`);
    }
  }
}

function checkKo(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  report: Report,
): void {
  if (!spec.koMeaning) return;
  const { card } = lesson;
  const need = (path: string, ko: string | undefined, what: string) => {
    if (ko === undefined) report("talk-ko", path, `${what}의 한국어 뜻이 없다`);
  };
  card.closingLines.forEach((l, i) => {
    need(`card.closingLines.${i}.ko`, l.ko, "정리 대사");
  });
  card.safeLines.forEach((l, i) => {
    need(`card.safeLines.${i}.ko`, l.ko, "안전한 대사");
  });
  need("card.farewell.ko", card.farewell.ko, "끝인사");
  need(
    "card.safetyFarewell.ko",
    card.safetyFarewell.ko,
    "'새 이야기로 이어 가자' 끝인사",
  );
  if ("firstLine" in card.greeting) {
    need(
      "card.greeting.firstLine.ko",
      card.greeting.firstLine.ko,
      "선생님 첫 말",
    );
  }
  for (const { path, item } of itemsOfCard(lesson)) {
    need(`${path}.ko`, item.ko, "선생님 질문");
    // 쉬운 질문의 뜻도 1~4단계에서 막는다(13절 C194 (2), 화면이 선생님 말 아래 뜻을 보인다)
    need(`${path}.easyQuestion.ko`, item.easyQuestion.ko, "쉬운 질문");
  }
}

function checkToday(lesson: TalkLesson, report: Report): void {
  const { card } = lesson;
  const words = card.todayWords.map((w) => w.word);
  const same =
    words.length === new Set(words).size &&
    words.length === lesson.newWords.length &&
    words.every((w) => lesson.newWords.includes(w));
  if (!same) {
    report(
      "talk-today",
      "card.todayWords",
      `오늘 쓸 말 [${words.join(", ")}] 이 새 단어 [${lesson.newWords.join(", ")}] 와 다르다`,
    );
  }
  const topics = card.todayTopicsKo.length;
  if (topics < TALK_TODAY_TOPICS.min || topics > TALK_TODAY_TOPICS.max) {
    report(
      "talk-today",
      "card.todayTopicsKo",
      `오늘 이야기 목록 ${topics}개가 ${TALK_TODAY_TOPICS.min}~${TALK_TODAY_TOPICS.max}개 밖이다`,
    );
  }
}

/** 6.4 회화 미션 · 역할 바꾸기: 5~7단계 미션 수가 level_specs missions 와 같고, 역할 바꾸기는 미션이 있는 단계(5단계부터)에만 둔다. */
function checkMissions(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  report: Report,
): void {
  const { missions, roleSwap } = lesson.card;
  if (spec.missions === 0) {
    if (missions !== undefined)
      report("talk-missions", "card.missions", "이 단계 카드에는 미션이 없다");
    if (roleSwap !== undefined)
      report(
        "talk-missions",
        "card.roleSwap",
        "역할 바꾸기는 미션이 있는 단계(5단계부터)에만 둔다",
      );
  } else if ((missions?.length ?? 0) !== spec.missions) {
    report(
      "talk-missions",
      "card.missions",
      `미션 ${missions?.length ?? 0}개가 단계 규격 ${spec.missions}개와 다르다`,
    );
  }
}

function checkPlaceholders(lesson: TalkLesson, report: Report): void {
  for (const fragment of textsOfLesson("talk", lesson)) {
    for (const p of placeholdersIn(fragment.text)) {
      if (p !== PLACEHOLDER_NAME) {
        report(
          "talk-placeholder",
          fragment.path,
          `틀 자리 ${p} 는 쓸 수 없다(${PLACEHOLDER_NAME} 하나만)`,
        );
      }
    }
  }
}

/** 회화 카드 칸 하나(6.4 회화 행, 새 꼴). path 는 수업 객체 기준이다. */
export function checkTalkCard(
  lesson: TalkLesson,
  ctx: LessonCellContext,
): SeedIssue[] {
  const out: SeedIssue[] = [];
  const report = makeReport(out, ctx.file, cellOf(lesson, ctx));
  if (!ctx.index.ready) {
    report(
      "reference-not-ready",
      "",
      "규격 파일(설정값 · 단계 규격 · 단원 규격 · vocab)이 깨져 칸 검사를 건너뛴다",
    );
    return out;
  }
  const spec = talkSpec(ctx);
  if (!spec) {
    report("layout", "kind", `회화 ${ctx.level}단계 규격이 없다(규격 파일)`);
    return out;
  }
  const fragments = textsOfLesson("talk", lesson);
  out.push(
    ...checkLessonCommon(lesson, ctx, {
      fragments,
      englishRoles: TALK_ROLES,
      allocationRoles: TALK_ALLOCATION_ROLES,
    }),
  );
  checkShape(lesson, spec, report);
  checkGoals(lesson, ctx, report);
  checkRequired(lesson, spec, ctx, report);
  checkFirstForm(lesson, spec, ctx, report);
  checkTargets(lesson, ctx, report);
  checkSupport(lesson, report);
  checkHints(lesson, spec, report);
  checkSameQuestion(lesson, report);
  checkMore(lesson, ctx, report);
  checkImages(lesson, spec, ctx, report);
  checkKo(lesson, spec, report);
  checkToday(lesson, report);
  checkMissions(lesson, spec, report);
  checkPlaceholders(lesson, report);
  checkTeacherNames(fragments, ctx.index.teacherNames, report);
  return out;
}

// ── 단원 단위 ────────────────────────────────────────────────────

/**
 * 카드 하나가 다시 묻는 자리의 단원 단어(6.4 회화 단원 덮기, 06:175 · 06:187): 다지기 · 보강 카드의 필수 질문과 모든 카드의 더 이야기할 거리의
 * 노리는 단어. 배정 카드의 필수 질문은 다시 묻는 질문이어도 세지 않는다(수업 종류가 '다지기 · 보강'인 필수 질문만 단원 덮기 자리다).
 */
export function againTargets(lesson: TalkLesson): string[] {
  const required = lesson.kind === "assigned" ? [] : lesson.card.required;
  return [...required, ...lesson.card.more].flatMap((item) => item.targets);
}

/** 단원 칸이 다 찼는가: 주제 변형마다 정규 수업 1~n 과 보강 수업 1~m 이 다 있다(단원 틀). */
function unitComplete(
  cards: readonly TalkLesson[],
  ctx: LessonCellContext,
): boolean {
  const frame = ctx.index.frame("talk", ctx.level, ctx.unit);
  if (!frame) return false;
  const have = new Set(
    cards.map(
      (c) =>
        `${c.variant}:${c.kind === "remedial" ? "remedial" : "regular"}:${c.lessonNo}`,
    ),
  );
  for (let v = 1; v <= frame.topicVariants; v++) {
    for (let n = 1; n <= frame.regularLessons; n++)
      if (!have.has(`${v}:regular:${n}`)) return false;
    for (let n = 1; n <= frame.remedialLessons; n++)
      if (!have.has(`${v}:remedial:${n}`)) return false;
  }
  return true;
}

/**
 * 단원 단위 회화 검사(6.4 회화 단원 덮기 · 회화 카드 목표의 '목표 정의 전'). 받은 카드를 주제 변형마다 묶어, 단원 단어마다 다시 묻는 자리가
 * talk.known_days 번 이상 서로 다른 수업에 있는지 본다. 단원 칸이 다 차지 않았으면(세 장 먼저 · 일부 단원) 오류 대신 변형마다
 * talk-unit-incomplete 경고 하나로 낸다(회화 plan 정한 것 15). complete 를 넘기면 그 값을 쓴다(시험). 결과의 cell 은 비우고 path 는
 * `variant.<변형>` 이다. 평가 spec 기회 수(evidence.*)는 P12 키가 들어온 뒤 더한다.
 */
export function checkTalkUnit(
  cards: readonly TalkLesson[],
  ctx: LessonCellContext,
  options: { complete?: boolean } = {},
): SeedIssue[] {
  const out: SeedIssue[] = [];
  if (!ctx.index.ready || cards.length === 0) return out;
  const report = makeReport(out, ctx.file, undefined);
  const unitSpec = ctx.index.unitSpec("talk", ctx.level, ctx.unit);
  if ((unitSpec?.goals?.length ?? 0) === 0) {
    report(
      "talk-goals-pending",
      "",
      `회화 ${ctx.level}단계 단원 ${ctx.unit} 에 단원 목표(goals)가 아직 없어 카드 목표를 대조하지 못했다(목표 정의 전)`,
      "warning",
    );
  }
  const unitWords = unitSpec?.words ?? [];
  const days = ctx.index.num("talk.known_days");
  const complete = options.complete ?? unitComplete(cards, ctx);
  const variants = new Map<number, TalkLesson[]>();
  for (const c of cards)
    variants.set(c.variant, [...(variants.get(c.variant) ?? []), c]);
  for (const [variant, list] of [...variants].sort((a, b) => a[0] - b[0])) {
    const at = `variant.${variant}`;
    const lessonsOf = new Map<string, Set<string>>();
    for (const c of list) {
      for (const word of againTargets(c)) {
        const set = lessonsOf.get(word) ?? new Set<string>();
        set.add(`${c.kind}:${c.lessonNo}`);
        lessonsOf.set(word, set);
      }
    }
    const short = unitWords
      .map((word) => ({ word, n: lessonsOf.get(word)?.size ?? 0 }))
      .filter(({ n }) => n < days);
    if (!complete) {
      if (short.length > 0)
        report(
          "talk-unit-incomplete",
          at,
          `주제 변형 ${variant}: 단원 칸이 다 차지 않아(카드 ${list.length}장) 단원 덮기를 경고로만 본다 — talk.known_days ${days} 에 못 미친 단원 단어 ${short.length}개(단원을 다 채운 뒤 막는다)`,
          "warning",
        );
      continue;
    }
    for (const { word, n } of short) {
      report(
        "talk-known-days",
        at,
        `주제 변형 ${variant}: 단원 단어 ${word} 를 다시 묻는 서로 다른 수업(다지기 · 보강 필수 질문 · 더 이야기할 거리)이 ${n}개라 talk.known_days ${days} 보다 적다`,
      );
    }
  }
  return out;
}
