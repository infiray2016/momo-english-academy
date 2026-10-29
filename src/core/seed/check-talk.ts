// 회화 카드 검사(plan-p04c '회화 카드 검사', 6.4 회화 시나리오 카드 행 · 어휘 배정의 회화 몫, AC-15m 단위 몫).
// 카드 하나는 P4b 수업 공통 검사를 회화 몫 role 로 부른 뒤 회화 규칙을 더 본다. 단원 단위는 주제 변형마다 정규 카드만 본다(정할 것 ㅈ).
// 단계마다 다른 것은 level_specs 회화 칸에서 읽는다. DB 없는 순수 함수다.
import {
  checkLessonCommon,
  type LessonCellContext,
  makeReport,
  type Report,
  type SeedIssue,
} from "@/core/seed/check-lesson";
import { checkTeacherNames } from "@/core/seed/check-teacher";
import { type TalkLesson, textsOfLesson } from "@/core/seed/schema/lesson";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import type { TurnCard } from "@/core/seed/schema/talk";
import {
  approxGe,
  cellKey,
  PLACEHOLDER_NAME,
  TALK_SAME_QUESTION_MAX,
  TALK_TARGETS_PER_TURN,
  TALK_TODAY_TOPICS,
  type TextRole,
} from "@/core/seed/structure";
import { placeholdersIn, wordIdsIn } from "@/core/seed/text";

/**
 * 회화 몫의 영어 글 role(6.4 회화 행: 첫 말 · 힌트 · 답 예시 · 더 이야기할 거리 · 정리 · 안전한 대사 · 끝인사 · 미션).
 * 예상 흐름(role flow)은 아이에게 보이지 않는 AI 지시 글이라 넣지 않는다 — 문장 길이 · 형태 범위 · 단원 단어 · 문장 통계 · 보강 덮기 세기에서 빠지고,
 * 금지어 · 선생님 이름 검사는 받는다(C132 (3) · C134). 미션 영어 등 다른 prompt 역할 글은 지금 검사 그대로다.
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
/** 회화 어휘 배정: 아이 차례의 힌트 · 답 예시 · 쓸 수 있는 말 · 목표 표현(6.4 어휘 배정). */
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

/** 소문자 · 문장 부호 뺀 낱말(답 두 개 견주기). */
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

function talkSpec(ctx: LessonCellContext): TalkLevelSpec | undefined {
  const spec = ctx.index.levelSpec("talk", ctx.level);
  return spec?.area === "talk" ? spec : undefined;
}

type TurnGroup = { name: "turns" | "moreTalk"; turns: readonly TurnCard[] };

function checkShape(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  report: Report,
): void {
  const { card } = lesson;
  const greetingQuestions =
    "questions" in card.greeting ? card.greeting.questions : undefined;
  if (spec.cardShape === "turns") {
    if (!greetingQuestions) {
      report(
        "talk-shape",
        "card.greeting",
        "이 단계 카드는 인사 질문(greeting.questions)을 둔다",
      );
    } else if (greetingQuestions.length !== card.greetingTurns) {
      report(
        "talk-shape",
        "card.greeting.questions",
        `인사 질문 ${greetingQuestions.length}개가 인사 턴 수 ${card.greetingTurns} 와 다르다`,
      );
    }
    if (!card.turns)
      report(
        "talk-shape",
        "card.turns",
        "이 단계 카드는 대화 턴(turns)을 둔다",
      );
    if (card.questions)
      report(
        "talk-shape",
        "card.questions",
        "이 단계 카드에는 질문 목록(questions)이 없다",
      );
    return;
  }
  if (greetingQuestions)
    report(
      "talk-shape",
      "card.greeting",
      "이 단계 카드는 토리의 첫 말(greeting.firstLine)을 둔다",
    );
  if (!card.questions)
    report(
      "talk-shape",
      "card.questions",
      "이 단계 카드는 질문 목록(questions)을 둔다",
    );
  if (card.turns)
    report(
      "talk-shape",
      "card.turns",
      "이 단계 카드에는 대화 턴(turns)이 없다",
    );
  if (card.moreTalk)
    report(
      "talk-shape",
      "card.moreTalk",
      "이 단계 카드에는 더 이야기할 거리(moreTalk)가 없다",
    );
}

function checkTurns(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  report: Report,
): void {
  const { card } = lesson;
  if (spec.cardShape === "turns" && card.turns) {
    const total = card.greetingTurns + card.turns.length;
    if (total !== spec.targetTurns) {
      report(
        "talk-turns",
        "card.turns",
        `인사 턴 ${card.greetingTurns} + 대화 턴 ${card.turns.length} 이 목표 턴 ${spec.targetTurns} 과 다르다`,
      );
    }
  }
  if (spec.cardShape === "questions" && card.questions) {
    const need = spec.targetTurns - card.greetingTurns;
    if (card.questions.length < need) {
      report(
        "talk-turns",
        "card.questions",
        `질문 목록 ${card.questions.length}개가 목표 턴 − 인사 턴 수 ${need} 보다 적다`,
      );
    }
  }
}

function checkHints(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  report: Report,
): void {
  const { card } = lesson;
  const groups: TurnGroup[] = [
    { name: "turns", turns: card.turns ?? [] },
    { name: "moreTalk", turns: card.moreTalk ?? [] },
  ];
  for (const group of groups) {
    group.turns.forEach((turn, i) => {
      const has = turn.frameEn !== undefined;
      if (has !== spec.frameInTurns) {
        report(
          "talk-hints",
          `card.${group.name}.${i}.frameEn`,
          spec.frameInTurns
            ? "이 단계 턴에는 영어 틀(frameEn)이 있어야 한다"
            : "이 단계 턴에는 영어 틀(frameEn)을 두지 않는다",
        );
      }
    });
  }
  const tiers = spec.hintTiers.filter((t) => t !== "ko").length;
  card.questions?.forEach((q, i) => {
    if (q.hintTiers.length !== tiers) {
      report(
        "talk-hints",
        `card.questions.${i}.hintTiers`,
        `영어 힌트 단 ${q.hintTiers.length}개가 단계 규격 ${tiers}개와 다르다`,
      );
    }
    const usable = q.usablePhrases?.length;
    if (
      spec.usablePhrases > 0
        ? usable !== spec.usablePhrases
        : usable !== undefined
    ) {
      report(
        "talk-hints",
        `card.questions.${i}.usablePhrases`,
        `쓸 수 있는 말이 ${usable ?? 0}개라 단계 규격 ${spec.usablePhrases}개와 다르다`,
      );
    }
  });
}

function pairDiffersByOne(a: string, b: string): boolean {
  const x = plainWords(a);
  const y = plainWords(b);
  if (x.length !== y.length) return false;
  return x.filter((w, i) => w !== y[i]).length === 1;
}

function checkPairs(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  ctx: LessonCellContext,
  report: Report,
): void {
  const { card } = lesson;
  const newWords = new Set(lesson.newWords);
  const greetingQuestions =
    "questions" in card.greeting ? card.greeting.questions : [];
  const entries: {
    path: string;
    pair?: readonly [string, string];
    targets: readonly string[];
    first: boolean;
  }[] = [
    ...greetingQuestions.map((g, i) => ({
      path: `card.greeting.questions.${i}`,
      pair: g.twoAnswers,
      targets: [],
      first: false,
    })),
    ...(card.turns ?? []).map((t, i) => ({
      path: `card.turns.${i}`,
      pair: t.twoAnswers,
      targets: t.targets,
      first: t.ask === "first",
    })),
  ];
  for (const entry of entries) {
    if (spec.twoAnswers !== (entry.pair !== undefined)) {
      report(
        "talk-pairs",
        `${entry.path}.twoAnswers`,
        spec.twoAnswers
          ? "답 두 개가 없다"
          : "이 단계에는 답 두 개를 두지 않는다",
      );
      continue;
    }
    if (!entry.pair) continue;
    const [a, b] = entry.pair;
    if (!pairDiffersByOne(a, b)) {
      report(
        "talk-pairs",
        `${entry.path}.twoAnswers`,
        `답 두 개(${a} · ${b})가 같은 꼴 문장에서 낱말 하나만 다르지 않다`,
      );
    }
    const turnNew = entry.targets.filter((t) => newWords.has(t));
    if (entry.first && turnNew.length > 0) {
      const ids = new Set([
        ...wordIdsIn(a, ctx.index.lexicon),
        ...wordIdsIn(b, ctx.index.lexicon),
      ]);
      if (!turnNew.some((w) => ids.has(w))) {
        report(
          "talk-pairs",
          `${entry.path}.twoAnswers`,
          `처음 묻는 턴의 답 두 개에 그 턴의 새 단어(${turnNew.join(", ")})가 없다`,
        );
      }
    }
  }
  card.moreTalk?.forEach((t, i) => {
    if (t.twoAnswers !== undefined) {
      report(
        "talk-pairs",
        `card.moreTalk.${i}.twoAnswers`,
        "더 이야기할 거리에는 답 두 개를 두지 않는다",
      );
    }
  });
}

function checkFirstAsk(
  lesson: TalkLesson,
  ctx: LessonCellContext,
  report: Report,
): void {
  const turns = lesson.card.turns;
  if (!turns) return;
  const newWords = new Set(lesson.newWords);
  const half = Math.ceil(turns.length / 2);
  const firstTargets = new Set<string>();
  turns.forEach((turn, i) => {
    if (turn.ask !== "first") return;
    const at = `card.turns.${i}`;
    if (lesson.kind !== "assigned") {
      report(
        "talk-first-ask",
        `${at}.ask`,
        "다지기 · 보강 카드에는 처음 묻는 턴이 없다",
      );
      return;
    }
    const notNew = turn.targets.filter((t) => !newWords.has(t));
    if (notNew.length > 0) {
      report(
        "talk-first-ask",
        `${at}.targets`,
        `처음 묻는 턴이 새 단어가 아닌 ${notNew.join(", ")} 를 노린다`,
      );
    }
    if (i + 1 > half) {
      report(
        "talk-first-ask",
        at,
        `처음 묻는 턴(대화 턴 ${i + 1})이 대화 토막 앞쪽 절반(1~${half}) 밖이다`,
      );
    }
    const hintIds = wordIdsIn(turn.hintEn, ctx.index.lexicon);
    const missing = turn.targets.filter(
      (t) => newWords.has(t) && !hintIds.has(t),
    );
    if (missing.length > 0) {
      report(
        "talk-first-ask",
        `${at}.hintEn`,
        `처음 묻는 턴의 영어 문장 힌트에 새 단어 ${missing.join(", ")} 가 없다`,
      );
    }
    for (const t of turn.targets) firstTargets.add(t);
  });
  if (lesson.kind === "assigned") {
    for (const word of lesson.newWords) {
      if (!firstTargets.has(word)) {
        report(
          "talk-first-ask",
          "card.turns",
          `새 단어 ${word} 를 노리는 처음 묻는 턴이 없다`,
        );
      }
    }
  }
}

function checkTargets(
  lesson: TalkLesson,
  ctx: LessonCellContext,
  report: Report,
): void {
  const unitWords = new Set(
    ctx.index.unitSpec("talk", ctx.level, ctx.unit)?.words ?? [],
  );
  const { card } = lesson;
  const items: {
    path: string;
    question: string;
    questionPath: string;
    targets: readonly string[];
  }[] = [
    ...(card.turns ?? []).map((t, i) => ({
      path: `card.turns.${i}`,
      question: t.question.en,
      questionPath: `card.turns.${i}.question.en`,
      targets: t.targets,
    })),
    ...(card.moreTalk ?? []).map((t, i) => ({
      path: `card.moreTalk.${i}`,
      question: t.question.en,
      questionPath: `card.moreTalk.${i}.question.en`,
      targets: t.targets,
    })),
    ...(card.questions ?? []).map((q, i) => ({
      path: `card.questions.${i}`,
      question: q.en,
      questionPath: `card.questions.${i}.en`,
      targets: q.targets,
    })),
  ];
  for (const item of items) {
    const n = item.targets.length;
    if (n < TALK_TARGETS_PER_TURN.min || n > TALK_TARGETS_PER_TURN.max) {
      report(
        "talk-targets",
        `${item.path}.targets`,
        `노리는 단어 ${n}개가 ${TALK_TARGETS_PER_TURN.min}~${TALK_TARGETS_PER_TURN.max}개 밖이다`,
      );
    }
    const outside = item.targets.filter((t) => !unitWords.has(t));
    if (outside.length > 0) {
      report(
        "talk-targets",
        `${item.path}.targets`,
        `노리는 단어 ${outside.join(", ")} 가 이 단원 단어가 아니다`,
      );
    }
    const ids = wordIdsIn(item.question, ctx.index.lexicon);
    const inQuestion = item.targets.filter((t) => ids.has(t));
    if (inQuestion.length > 0) {
      report(
        "talk-targets",
        item.questionPath,
        `토리 질문에 그 턴이 노리는 단어 ${inQuestion.join(", ")} 가 있다`,
      );
    }
  }
}

function checkSameQuestion(lesson: TalkLesson, report: Report): void {
  const { card } = lesson;
  const greetingQuestions =
    "questions" in card.greeting ? card.greeting.questions : [];
  const all: { path: string; text: string }[] = [
    ...greetingQuestions.map((g, i) => ({
      path: `card.greeting.questions.${i}.question.en`,
      text: g.question.en,
    })),
    ...(card.turns ?? []).map((t, i) => ({
      path: `card.turns.${i}.question.en`,
      text: t.question.en,
    })),
    ...(card.moreTalk ?? []).map((t, i) => ({
      path: `card.moreTalk.${i}.question.en`,
      text: t.question.en,
    })),
    ...(card.questions ?? []).map((q, i) => ({
      path: `card.questions.${i}.en`,
      text: q.en,
    })),
  ];
  const counts = new Map<string, { n: number; path: string }>();
  for (const q of all) {
    const key = questionKey(q.text);
    const seen = counts.get(key);
    counts.set(key, { n: (seen?.n ?? 0) + 1, path: seen?.path ?? q.path });
  }
  for (const [key, { n, path }] of counts) {
    if (n > TALK_SAME_QUESTION_MAX) {
      report(
        "talk-same-question",
        path,
        `같은 토리 질문 '${key}' 가 ${n}번 나온다(${TALK_SAME_QUESTION_MAX}번까지)`,
      );
    }
  }
}

function checkMore(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  ctx: LessonCellContext,
  report: Report,
): void {
  const more = lesson.card.moreTalk;
  if (!spec.moreTalk) {
    if (more)
      report(
        "talk-more",
        "card.moreTalk",
        "이 단계 카드에는 더 이야기할 거리가 없다",
      );
    return;
  }
  if (!more) {
    report("talk-more", "card.moreTalk", "더 이야기할 거리가 없다");
    return;
  }
  const expected = ctx.index.num("talk.more_talk_turns");
  if (more.length !== expected) {
    report(
      "talk-more",
      "card.moreTalk",
      `더 이야기할 거리 ${more.length}턴이 talk.more_talk_turns ${expected} 와 다르다`,
    );
  }
  const asked = new Set((lesson.card.turns ?? []).flatMap((t) => t.targets));
  more.forEach((turn, i) => {
    if (turn.ask !== "re_ask") {
      report(
        "talk-more",
        `card.moreTalk.${i}.ask`,
        "더 이야기할 거리는 모두 다시 묻는 턴이다",
      );
    }
    const unasked = turn.targets.filter((t) => !asked.has(t));
    if (unasked.length > 0) {
      report(
        "talk-more",
        `card.moreTalk.${i}.targets`,
        `더 이야기할 거리가 이 대화에서 묻지 않은 ${unasked.join(", ")} 를 노린다`,
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
  const greetingQuestions =
    "questions" in card.greeting ? card.greeting.questions : [];
  const keys: { path: string; key?: string }[] = [
    ...greetingQuestions.map((g, i) => ({
      path: `card.greeting.questions.${i}.imageKey`,
      key: g.imageKey,
    })),
    ...(card.turns ?? []).map((t, i) => ({
      path: `card.turns.${i}.imageKey`,
      key: t.imageKey,
    })),
    ...(card.moreTalk ?? []).map((t, i) => ({
      path: `card.moreTalk.${i}.imageKey`,
      key: t.imageKey,
    })),
  ];
  for (const { path, key } of keys) {
    if (key === undefined) continue;
    if (!spec.turnImages) {
      report("talk-images", path, "이 단계 카드에는 턴 그림을 두지 않는다");
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
      "토리 첫 말",
    );
  }
}

function checkToday(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  report: Report,
): void {
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
  if (spec.segments.includes("practice")) {
    card.todayWords.forEach((w, i) => {
      if (w.exampleKo === undefined) {
        report(
          "talk-today",
          `card.todayWords.${i}.exampleKo`,
          `말해 보기 예문 ${w.word} 의 한국어 뜻이 없다`,
        );
      }
    });
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

function checkMissions(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  report: Report,
): void {
  const missions = lesson.card.missions;
  if (spec.missions === 0) {
    if (missions !== undefined)
      report("talk-missions", "card.missions", "이 단계 카드에는 미션이 없다");
  } else if ((missions?.length ?? 0) !== spec.missions) {
    report(
      "talk-missions",
      "card.missions",
      `미션 ${missions?.length ?? 0}개가 단계 규격 ${spec.missions}개와 다르다`,
    );
  }
}

function checkFirstQuestion(
  lesson: TalkLesson,
  spec: TalkLevelSpec,
  report: Report,
): void {
  const { card } = lesson;
  const expected =
    spec.cardShape === "turns"
      ? card.turns?.[0]?.question.en
      : card.questions?.[0]?.en;
  if (expected !== undefined && card.firstQuestion !== expected) {
    report(
      "talk-first-question",
      "card.firstQuestion",
      "대화 첫 질문이 첫 대화 턴 · 질문 목록 1번의 질문과 다르다",
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

/** 회화 카드 칸 하나(plan-p04c 회화 카드 검사 첫 표). path 는 수업 객체 기준이다. */
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
  out.push(
    ...checkLessonCommon(lesson, ctx, {
      fragments: textsOfLesson("talk", lesson),
      englishRoles: TALK_ROLES,
      allocationRoles: TALK_ALLOCATION_ROLES,
    }),
  );
  checkShape(lesson, spec, report);
  checkTurns(lesson, spec, report);
  checkHints(lesson, spec, report);
  checkPairs(lesson, spec, ctx, report);
  checkFirstAsk(lesson, ctx, report);
  checkTargets(lesson, ctx, report);
  checkSameQuestion(lesson, report);
  checkMore(lesson, spec, ctx, report);
  checkImages(lesson, spec, ctx, report);
  checkKo(lesson, spec, report);
  checkToday(lesson, spec, report);
  checkMissions(lesson, spec, report);
  checkFirstQuestion(lesson, spec, report);
  checkPlaceholders(lesson, report);
  checkTeacherNames(
    textsOfLesson("talk", lesson),
    ctx.index.teacherNames,
    report,
  );
  return out;
}

/**
 * 카드 하나의 다시 묻는 턴 자리(노리는 단어 하나가 한 자리). 대화 턴만 센다(더 이야기할 거리는 목표 턴 밖이라 세지 않는다).
 * 1~3단계는 카드의 ask 표시를, 4단계부터는 배정 카드에서 새 단어를 그 카드에서 처음 노리는 자리만 처음으로 본다(정할 것 ㅈ).
 */
export function againSlots(lesson: TalkLesson): string[] {
  const { card } = lesson;
  if (card.turns) {
    return card.turns
      .filter((t) => t.ask === "re_ask")
      .flatMap((t) => t.targets);
  }
  const fresh = new Set(lesson.kind === "assigned" ? lesson.newWords : []);
  const slots: string[] = [];
  for (const q of card.questions ?? []) {
    for (const target of q.targets) {
      if (fresh.has(target)) fresh.delete(target);
      else slots.push(target);
    }
  }
  return slots;
}

/**
 * 단원 단위 회화 검사(plan-p04c 회화 카드 검사 둘째 표). 받은 카드 가운데 정규 카드(배정 · 다지기)를 주제 변형마다 묶어 본다.
 * 결과의 cell 은 비우고(단원 단위) path 는 `variant.<변형>` 이다.
 */
export function checkTalkUnit(
  cards: readonly TalkLesson[],
  ctx: LessonCellContext,
): SeedIssue[] {
  const out: SeedIssue[] = [];
  if (!ctx.index.ready) return out;
  const report = makeReport(out, ctx.file, undefined);
  const unitWords =
    ctx.index.unitSpec("talk", ctx.level, ctx.unit)?.words ?? [];
  const ratio = ctx.index.num("talk.said_ratio");
  const days = ctx.index.num("talk.known_days");
  const variants = new Map<number, TalkLesson[]>();
  for (const c of cards) {
    if (c.kind !== "assigned" && c.kind !== "reinforce") continue;
    variants.set(c.variant, [...(variants.get(c.variant) ?? []), c]);
  }
  for (const [variant, list] of [...variants].sort((a, b) => a[0] - b[0])) {
    const at = `variant.${variant}`;
    const lessonsOf = new Map<string, Set<number>>();
    let total = 0;
    for (const c of list) {
      for (const word of againSlots(c)) {
        total++;
        const set = lessonsOf.get(word) ?? new Set<number>();
        set.add(c.lessonNo);
        lessonsOf.set(word, set);
      }
    }
    const need = unitWords.length * ratio * days;
    if (!approxGe(total, need)) {
      report(
        "talk-again-slots",
        at,
        `주제 변형 ${variant} 정규 카드의 다시 묻는 턴 자리 ${total}개가 단원 단어 ${unitWords.length} × talk.said_ratio ${ratio} × talk.known_days ${days} 보다 적다`,
      );
    }
    for (const word of unitWords) {
      const n = lessonsOf.get(word)?.size ?? 0;
      if (n < days) {
        report(
          "talk-known-days",
          at,
          `주제 변형 ${variant}: 단원 단어 ${word} 를 다시 묻는 서로 다른 정규 수업이 ${n}개라 talk.known_days ${days} 보다 적다`,
        );
      }
    }
  }
  return out;
}
