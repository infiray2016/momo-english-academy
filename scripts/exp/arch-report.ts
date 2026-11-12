// 회화 구조 비교 실험(13절 C234 · task-exp-harness)의 결과 파일 만들기: <out>/runs/*.jsonl 을 읽어 확인 항목 · 수치 · 나란히 표 · 가려 읽기 ·
// 예시 · 가려 읽는 판정의 채점표(judge-rubric.md)를 쓴다. 사용: node --env-file-if-exists=.env.local --import tsx scripts/exp/arch-report.ts --out <폴더>
// [--checks-only] [--count-tokens]. 판정이 끝난 뒤 --judges j1,j2 로 부르면 판정 결과만 방식별로 모은다(judge-summary.json · .md,
// 지난 실험의 judge-agg.py 를 옮김 — 가려 읽기 폴더 · 대응표는 건드리지 않는다).
// --count-tokens 만 네트워크를 쓴다(방식마다 시스템 프롬프트의 입력 토큰 수 — count_tokens). 키 값은 출력하지 않는다.
import { randomInt } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import type { LeadCandidateLex } from "../../src/core/conversation/lead-candidate";
import { createScriptClient, readApiKey } from "../ai-contract";
import {
  P_SYSTEM,
  P_UNIT_WORDS,
  pChildMessageOf,
  pStatusOf,
} from "./arch-arm-p";
import { heardByChild, wrapChoiceMessageOf } from "./arch-arms";
import {
  type Arm,
  type Branch,
  type CallLog,
  type ChildTurnLog,
  type LeadTurnLog,
  type LessonLog,
  type LogLine,
  setupOf,
  type TeacherTurnLog,
} from "./arch-compare";
import {
  type AskedQuestion,
  endingOf,
  type FirstSent,
  type FirstSentence,
  firstSentenceStatsOf,
  firstSentStatsOf,
  flat,
  type JudgeFile,
  type JudgeSummary,
  judgeSummaryOf,
  median,
  percentile,
  questionStatsOf,
  questionsIn,
  SAID_CATEGORIES,
  type SaidCounts,
  saidCountsOf,
  sameQuestionsBesideClosingOf,
  sameQuestionsOf,
  wordCount,
} from "./arch-metrics";
import { NOISE_TURNS } from "./arch-noise";

const ARM_ORDER: readonly Arm[] = ["A", "B", "C", "C2", "P", "N"];
const BRANCHES: readonly Branch[] = [
  "그대로 나감",
  "질문을 다시 쓰게 함",
  "카드의 질문으로 바꿈",
  "고정 문구를 붙임",
  "모델의 문장을 지움",
  "모델을 부르지 않은 고정 차례",
];

export type Lesson = {
  name: string;
  meta: LessonLog;
  calls: CallLog[];
  teachers: TeacherTurnLog[];
  children: ChildTurnLog[];
};

export function readLessons(dir: string): Lesson[] {
  const runs = join(dir, "runs");
  return readdirSync(runs)
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .map((f) => {
      const lines = readFileSync(join(runs, f), "utf8")
        .split("\n")
        .filter((l) => l.trim() !== "")
        .map((l) => JSON.parse(l) as LogLine);
      const meta = lines.find((l): l is LessonLog => l.type === "lesson");
      if (!meta) throw new Error(`수업 줄 없음: ${f}`);
      return {
        name: meta.lesson,
        meta,
        calls: lines.filter((l): l is CallLog => l.type === "call"),
        teachers: lines.filter(
          (l): l is TeacherTurnLog => l.type === "teacher_turn",
        ),
        children: lines.filter(
          (l): l is ChildTurnLog => l.type === "child_turn",
        ),
      };
    });
}

const pct = (v: number | null) =>
  v === null ? "-" : `${Math.round(v * 1000) / 10}%`;
const num = (v: number | null, d = 2) =>
  v === null ? "-" : String(Math.round(v * 10 ** d) / 10 ** d);
const cell = (t: string) => t.replaceAll("|", "\\|").replaceAll("\n", "<br>");

// ── 수치 ─────────────────────────────────────────────────────────

export type LessonMetrics = ReturnType<typeof lessonMetricsOf>;

function sumUsage(calls: readonly CallLog[]) {
  const t = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 };
  for (const c of calls) {
    const u = c.response.usage;
    if (!u) continue;
    t.input += u.input;
    t.output += u.output;
    t.cacheRead += u.cacheRead;
    t.cacheWrite += u.cacheWrite;
    t.costUsd += c.response.costUsd ?? 0;
  }
  t.costUsd = Math.round(t.costUsd * 1e6) / 1e6;
  return t;
}

export function lessonMetricsOf(lesson: Lesson) {
  const finals = lesson.teachers.map((t) => heardByChild(t.final));
  const responses = lesson.teachers.filter((t) => t.childTurn > 0);
  const teacherWords = finals.map(wordCount);
  const childWords = lesson.children.map((c) =>
    c.action === "speak" ? wordCount(c.says) : 0,
  );
  const sumT = teacherWords.reduce((a, b) => a + b, 0);
  const sumC = childWords.reduce((a, b) => a + b, 0);
  const asked: AskedQuestion[] = lesson.teachers.flatMap((t) =>
    questionsIn(heardByChild(t.final)).map((q) => ({
      turn: t.childTurn,
      text: q,
    })),
  );
  const called = lesson.teachers.filter((t) => t.called);
  const changed = called.filter(
    (t) => flat(t.final) !== flat(t.modelFirstSpoken ?? ""),
  );
  const branchCounts = Object.fromEntries(
    BRANCHES.map((b) => [
      b,
      lesson.teachers.filter((t) => t.branches.includes(b)).length,
    ]),
  );
  const perTurnMs = responses.filter((t) => t.called).map((t) => t.ms);
  const firstMs = responses.flatMap((t) =>
    t.firstMs === null ? [] : [t.firstMs],
  );
  const teacherCalls = lesson.calls.filter((c) => c.kind !== "child");
  const fit = responses.map((t) => t.levelFit);
  const ending = endingOf(lesson.meta, lesson.teachers);
  return {
    lesson: lesson.name,
    arm: lesson.meta.arm,
    child: lesson.meta.child,
    seed: lesson.meta.seed,
    childTurns: lesson.meta.childTurns,
    ended: lesson.meta.ended,
    attempt: lesson.meta.attempt,
    questions: questionStatsOf(finals),
    words: {
      teacherPerTurn: finals.length === 0 ? null : sumT / finals.length,
      childPerTurn: childWords.length === 0 ? null : sumC / childWords.length,
      childShare: sumT + sumC === 0 ? null : sumC / (sumT + sumC),
    },
    sameQuestions: sameQuestionsOf(asked),
    /** AC-11 '같은 글자 질문 0' 셈: 마무리 상수 물음을 빼고 따로 센다(검토 rev-x2 M-2 — 옛 칸 sameQuestions 는 그대로). */
    sameQuestionsBesideClosing: sameQuestionsBesideClosingOf(asked),
    intervention: {
      calledTurns: called.length,
      changedTurns: changed.length,
      changedRatio: called.length === 0 ? null : changed.length / called.length,
      branches: branchCounts,
    },
    calls: {
      perChildTurnMean:
        responses.length === 0
          ? null
          : responses.reduce((a, t) => a + t.calls, 0) / responses.length,
      perChildTurnMax: Math.max(0, ...responses.map((t) => t.calls)),
      msMedian: median(perTurnMs),
      msP95: percentile(perTurnMs, 95),
      msMax: perTurnMs.length === 0 ? null : Math.max(...perTurnMs),
      firstMsMedian: median(firstMs),
      firstMsP95: percentile(firstMs, 95),
      perTurnMs,
      firstMs,
    },
    tokens: sumUsage(teacherCalls),
    childRoleTokens: sumUsage(lesson.calls.filter((c) => c.kind === "child")),
    levelFit: {
      turns: fit.length,
      overSentenceMaxTurns: fit.filter((f) => f.overSentenceMax).length,
      longSentences: fit.reduce((a, f) => a + f.longSentences.length, 0),
      offbandTurns: fit.filter((f) => f.offbandWords.length > 0).length,
      offbandWords: [...new Set(fit.flatMap((f) => f.offbandWords))],
      offbandFormTurns: fit.filter((f) => f.offbandForms.length > 0).length,
      offbandForms: [...new Set(fit.flatMap((f) => f.offbandForms))],
    },
    // X1(spec '회화 Claude 주도' 설계 9): 아래 둘은 옛 기록에도 셈이 나오도록 새 칸으로만 더한다(위 칸의 값은 그대로)
    firstSentence: firstSentenceStatsOf(firstSentencesOf(responses)),
    // X2: 아이에게 첫 문장이 나간 때(받아 둔 차례를 가름) · 새 엔진(N) 기록 셈 — 새 칸으로만 더한다(옛 기록은 비거나 null)
    firstSent: firstSentStatsOf(firstSentsOf(responses)),
    lead: leadMetricsOf(lesson),
    /** N: 인사 끝 차례에 접은 입구 start 호출(차례당 호출 수 · 시간 밖 — 검토 rev-x2 M-4). 없으면 null. */
    entryStart: entryStartOf(lesson.teachers),
    ending: {
      how: ending.how,
      line: ending.line,
      reason: ending.reason,
      choices: ending.choices.map((c) => ({
        childTurn: c.childTurn,
        kind: c.kind,
        picked: c.picked,
        continued: c.continued,
      })),
    },
  };
}

/** 인사 끝 차례에 접은 입구 start 호출의 수 · 시간 · 첫 문장이 나간 때(N 만, 검토 rev-x2 M-4). */
function entryStartOf(teachers: readonly TeacherTurnLog[]) {
  const entries = teachers.flatMap((t) => (t.entryStart ? [t.entryStart] : []));
  if (entries.length === 0) return null;
  return {
    turns: entries.length,
    calls: entries.reduce((a, e) => a + e.calls, 0),
    ms: entries.map((e) => e.ms),
    firstSentMs: entries.flatMap((e) => (e.firstSent ? [e.firstSent.ms] : [])),
  };
}

/** 아이에게 첫 문장이 나간 때(아이 차례 뒤 선생님 차례만 — 고르기 뒤 이음 · 옛 기록 · 부르지 않은 차례는 뺀다). */
function firstSentsOf(responses: readonly TeacherTurnLog[]): FirstSent[] {
  return responses.flatMap((t) =>
    t.afterChoice !== true && t.firstSent ? [t.firstSent] : [],
  );
}

/** 받아 둔 차례 표지(move.lead.gate 에 문장 문 걸림과 섞여 있어 이름으로 가린다 — 검토 rev-s1 M-3). */
const HELD_GATES = ["held_say", "held_question"] as const;

/**
 * 새 엔진(N) 수업 하나의 기록 셈(회화 Claude 주도 설계 5 · 6 · 9, plan 10번 · 브리프 X2 3): (가) 차이 표 셈(LessonLog.lead — core
 * leadCandidateTableOf), (나) 좁은 정의에 걸린 차례 · 다시 말하기 수와 결과, (다) 받아 둔 차례(held_say · held_question — gate 이름으로 가림)의
 * 수와 시간(본 호출 시간 + 다시 말하기 시간으로 다시 셈 — 검토 rev-s1 M-2), (라) 마무리 차례인데 읽기가 막힘이었던 차례(검토 rev-s1 M-4).
 * 새 엔진 기록이 없는 수업은 null.
 */
export function leadMetricsOf(lesson: Pick<Lesson, "meta" | "teachers">) {
  const logs = lesson.teachers.flatMap((t): LeadTurnLog[] =>
    t.lead ? [t.lead] : [],
  );
  if (logs.length === 0 && !lesson.meta.lead) return null;
  const narrow = logs.flatMap((l) => (l.narrow ? [l.narrow] : []));
  // (다)는 (차)와 같은 범위로 센다: 아이 차례 뒤 차례만(입구 start · 고르기 뒤 more 는 뺌 — 검토 rev-x2 M-1)
  const childLogs = logs.filter((l) => l.entry === "child");
  const heldOf = (name: (typeof HELD_GATES)[number]) =>
    childLogs.filter((l) => l.gate.includes(name));
  const heldLogs = childLogs.filter((l) =>
    HELD_GATES.some((g) => l.gate.includes(g)),
  );
  const heldMs = heldLogs.map((l) => l.ms + (l.retryMs ?? 0));
  const gateCounts: Record<string, number> = {};
  for (const l of logs)
    for (const g of l.gate)
      if (!(HELD_GATES as readonly string[]).includes(g))
        gateCounts[g] = (gateCounts[g] ?? 0) + 1;
  const counts = lesson.meta.lead?.table.counts ?? null;
  return {
    turns: logs.length,
    byEntry: {
      child: logs.filter((l) => l.entry === "child").length,
      start: logs.filter((l) => l.entry === "start").length,
      more: logs.filter((l) => l.entry === "more").length,
    },
    /** (가) 차이 표 셈(지금 판정에만 · 새 후보에만 · 갈래별 · 막힌 뒤 고르기로 빠진 차례 · Claude 후보 어긋남). */
    diff: counts,
    diffWords: (lesson.meta.lead?.table.words ?? [])
      .filter((w) => w.side === "current_only" || w.side === "candidate_only")
      .map((w) => ({
        word: w.word,
        side: w.side,
        differFrom: w.differFrom,
        categories: w.categories,
      })),
    /** (나) 좁은 정의. */
    narrow: {
      turns: narrow.length,
      called: narrow.filter((n) => n.called).length,
      /** 서버라면 시간 예산(questionRetryFits) 밖이라 다시 말하지 않았을 차례(기록만 — 검토 rev-x2 M-3). 옛 기록 · 칸 없음은 세지 않는다. */
      overBudget: narrow.filter((n) => n.fits === false).length,
      replaced: narrow.filter((n) => n.retry !== "").length,
      againHit: narrow.filter((n) => n.again).length,
      kept: narrow.filter((n) => n.retry === "").length,
      items: narrow.map((n) => n.item),
    },
    /** (다) 받아 둔 차례(아이 차례 뒤만 — (차)와 같은 범위). */
    held: {
      say: heldOf("held_say").length,
      question: heldOf("held_question").length,
      msMedian: median(heldMs),
      msP95: percentile(heldMs, 95),
      ms: heldMs,
    },
    /** (라) 마무리 차례 · 막힘. */
    closing: {
      turns: logs.filter((l) => l.closing).length,
      stuckReading: logs.filter((l) => l.closingStuck.reading).length,
      stuckEffective: logs.filter((l) => l.closingStuck.effective).length,
      added: logs.filter((l) => l.closingAdded).length,
    },
    /** 문장 문 걸림(받아 둔 표지 밖 — 안전 대사로 바뀐 검사 이름 · 힌트 막음). */
    gate: gateCounts,
    soundMoved: logs.filter((l) => l.soundMoved).length,
    removedTurns: logs.filter((l) => l.removed.length > 0).length,
    sayChanged: logs.filter(
      (l) => l.rawSay !== null && flat(l.say) !== flat(l.rawSay),
    ).length,
    failures: logs.filter((l) => l.failure !== null).length,
  };
}

/** 선생님 차례의 첫 문장 시각(옛 기록 · 부르지 않은 차례는 뺀다). */
function firstSentencesOf(
  responses: readonly TeacherTurnLog[],
): FirstSentence[] {
  return responses.flatMap((t) => (t.firstSentence ? [t.firstSentence] : []));
}

const ENDING_HOWS = [
  "app_closing",
  "teacher_closing",
  "turn_cap",
  "other",
] as const;
const ENDING_LABEL: Record<(typeof ENDING_HOWS)[number], string> = {
  app_closing: "앱의 마무리 차례",
  teacher_closing: "선생님이 스스로 마무리함",
  turn_cap: "아이 차례 상한",
  other: "그 밖",
};

/** 방식 하나의 모든 수업을 한데 모은 수치(차례 단위 비율은 차례를 모아서 다시 센다). */
export function armMetricsOf(arm: Arm, lessons: readonly Lesson[]) {
  const mine = lessons.filter((l) => l.meta.arm === arm);
  const per = mine.map(lessonMetricsOf);
  const finals = mine.flatMap((l) =>
    l.teachers.map((t) => heardByChild(t.final)),
  );
  const responses = mine.flatMap((l) =>
    l.teachers.filter((t) => t.childTurn > 0),
  );
  const sum = (f: (m: LessonMetrics) => number) =>
    per.reduce((a, m) => a + f(m), 0);
  const allMs = per.flatMap((m) => m.calls.perTurnMs);
  const allFirst = per.flatMap((m) => m.calls.firstMs);
  const tWords = finals.reduce((a, t) => a + wordCount(t), 0);
  const childAll = mine.flatMap((l) => l.children);
  const cWords = childAll.reduce(
    (a, c) => a + (c.action === "speak" ? wordCount(c.says) : 0),
    0,
  );
  const lessonsN = per.length || 1;
  return {
    arm,
    lessons: per.length,
    childTurns: sum((m) => m.childTurns),
    questions: {
      ...questionStatsOf(finals),
      longestQuestionRun: Math.max(
        0,
        ...per.map((m) => m.questions.longestQuestionRun),
      ),
    },
    words: {
      teacherPerTurn: finals.length === 0 ? null : tWords / finals.length,
      childPerTurn: childAll.length === 0 ? null : cWords / childAll.length,
      childShare: tWords + cWords === 0 ? null : cWords / (tWords + cWords),
    },
    sameQuestions: {
      exact: sum((m) => m.sameQuestions.exact),
      similarPairs: sum((m) => m.sameQuestions.similar.length),
    },
    sameQuestionsBesideClosing: {
      exact: sum((m) => m.sameQuestionsBesideClosing.exact),
      similarPairs: sum((m) => m.sameQuestionsBesideClosing.similar.length),
      closingConstant: sum((m) => m.sameQuestionsBesideClosing.closingConstant),
    },
    intervention: {
      calledTurns: sum((m) => m.intervention.calledTurns),
      changedTurns: sum((m) => m.intervention.changedTurns),
      changedRatio:
        sum((m) => m.intervention.calledTurns) === 0
          ? null
          : sum((m) => m.intervention.changedTurns) /
            sum((m) => m.intervention.calledTurns),
      branches: Object.fromEntries(
        BRANCHES.map((b) => [b, sum((m) => m.intervention.branches[b] ?? 0)]),
      ),
    },
    calls: {
      perChildTurnMean:
        responses.length === 0
          ? null
          : responses.reduce((a, t) => a + t.calls, 0) / responses.length,
      perChildTurnMax: Math.max(0, ...responses.map((t) => t.calls)),
      msMedian: median(allMs),
      msP95: percentile(allMs, 95),
      msMax: allMs.length === 0 ? null : Math.max(...allMs),
      firstMsMedian: median(allFirst),
      firstMsP95: percentile(allFirst, 95),
    },
    tokensPerLesson: {
      input: sum((m) => m.tokens.input) / lessonsN,
      output: sum((m) => m.tokens.output) / lessonsN,
      cacheRead: sum((m) => m.tokens.cacheRead) / lessonsN,
      cacheWrite: sum((m) => m.tokens.cacheWrite) / lessonsN,
      costUsd: sum((m) => m.tokens.costUsd) / lessonsN,
    },
    costPerChildTurnUsd:
      sum((m) => m.childTurns) === 0
        ? null
        : sum((m) => m.tokens.costUsd) / sum((m) => m.childTurns),
    levelFit: {
      turns: sum((m) => m.levelFit.turns),
      overSentenceMaxTurns: sum((m) => m.levelFit.overSentenceMaxTurns),
      longSentences: sum((m) => m.levelFit.longSentences),
      offbandTurns: sum((m) => m.levelFit.offbandTurns),
      offbandFormTurns: sum((m) => m.levelFit.offbandFormTurns),
      offbandWords: [...new Set(per.flatMap((m) => m.levelFit.offbandWords))],
      offbandForms: [...new Set(per.flatMap((m) => m.levelFit.offbandForms))],
    },
    firstSentence: firstSentenceStatsOf(firstSentencesOf(responses)),
    firstSent: firstSentStatsOf(firstSentsOf(responses)),
    lead: leadArmOf(per),
    entryStart: (() => {
      const entries = per.flatMap((m) => (m.entryStart ? [m.entryStart] : []));
      if (entries.length === 0) return null;
      const first = entries.flatMap((e) => e.firstSentMs);
      return {
        turns: entries.reduce((a, e) => a + e.turns, 0),
        firstSentTurns: first.length,
        firstSentMsMedian: median(first),
        firstSentMsP95: percentile(first, 95),
      };
    })(),
    ending: {
      ...Object.fromEntries(
        ENDING_HOWS.map((h) => [
          h,
          per.filter((m) => m.ending.how === h).length,
        ]),
      ),
      /** 마무리 차례에서 두 단추가 나온 수업 · 고른 단추. */
      withButtons: per.filter((m) => m.ending.choices.length > 0).length,
      more: sum(
        (m) => m.ending.choices.filter((c) => c.picked === "more").length,
      ),
      stop: sum(
        (m) => m.ending.choices.filter((c) => c.picked === "stop").length,
      ),
    } as Record<(typeof ENDING_HOWS)[number], number> & {
      withButtons: number;
      more: number;
      stop: number;
    },
  };
}

/** 방식 하나의 새 엔진 기록 셈(수업 셈을 더함 — N 밖은 null). */
function leadArmOf(per: readonly LessonMetrics[]) {
  const leads = per.flatMap((m) => (m.lead ? [m.lead] : []));
  if (leads.length === 0) return null;
  const sum = (f: (l: (typeof leads)[number]) => number) =>
    leads.reduce((a, l) => a + f(l), 0);
  const heldMs = leads.flatMap((l) => l.held.ms);
  return {
    lessons: leads.length,
    turns: sum((l) => l.turns),
    diffWords: sum((l) => l.diff?.differ ?? 0),
    currentOnly: sum((l) => l.diff?.currentOnly ?? 0),
    candidateOnly: sum((l) => l.diff?.candidateOnly ?? 0),
    choicesDropped: sum((l) => l.diff?.choicesDropped ?? 0),
    narrowTurns: sum((l) => l.narrow.turns),
    narrowReplaced: sum((l) => l.narrow.replaced),
    narrowAgain: sum((l) => l.narrow.againHit),
    narrowKept: sum((l) => l.narrow.kept),
    heldSay: sum((l) => l.held.say),
    heldQuestion: sum((l) => l.held.question),
    heldMsMedian: median(heldMs),
    heldMsP95: percentile(heldMs, 95),
    closingTurns: sum((l) => l.closing.turns),
    closingStuckReading: sum((l) => l.closing.stuckReading),
    closingStuckEffective: sum((l) => l.closing.stuckEffective),
  };
}

/** 수업 하나의 '말했다' 셈(세 방식 같은 규칙 — 검토 rev-x2 I-2). */
export type SaidRow = { lesson: string; arm: Arm; counts: SaidCounts };

/** 수업마다 세 방식을 같은 규칙으로 센 '말했다' 수(기록만 읽는다 — 지난 실험의 기록 폴더에도 돈다). */
export function saidRowsOf(
  lessons: readonly Lesson[],
  lex: LeadCandidateLex,
): SaidRow[] {
  return lessons.map((l) => ({
    lesson: l.name,
    arm: l.meta.arm,
    counts: saidCountsOf(l, lex),
  }));
}

/** 방식 하나의 '말했다' 셈(수업 평균 · 갈래 합). */
export function saidArmOf(arm: Arm, rows: readonly SaidRow[]) {
  const mine = rows.filter((r) => r.arm === arm);
  const n = mine.length;
  const mean = (f: (c: SaidCounts) => number) =>
    n === 0 ? null : mine.reduce((a, r) => a + f(r.counts), 0) / n;
  return {
    arm,
    lessons: n,
    heardUnitMean: mean((c) => c.heardUnit.length),
    beyondTeacherMean: mean((c) => c.beyondTeacher.length),
    heardAcceptedMean: mean((c) => c.heardAccepted.length),
    heardByCategory: Object.fromEntries(
      SAID_CATEGORIES.map((k) => [
        k,
        mine.reduce((a, r) => a + r.counts.heardByCategory[k], 0),
      ]),
    ) as SaidCounts["heardByCategory"],
  };
}

/**
 * 결과 글 머리의 재료 줄(검토 rev-x2 I-1): 이 실행의 방식 A 가 실제 앱의 기능어 집합으로 돌았는지 적는다. 수업 줄의 materials 칸(이 고침 뒤의
 * 실행만 적음)으로 가르므로, 지난 실험의 기록 폴더를 다시 내면 '바로잡기 전'으로 적힌다.
 */
export function materialsNoteOf(lessons: readonly Lesson[]): string | null {
  const a = lessons.filter((l) => l.meta.arm === "A");
  if (a.length === 0) return null;
  const words = a.flatMap((l) =>
    l.meta.materials ? [l.meta.materials.functionWords] : [],
  );
  if (words.length === a.length && words.every((w) => w > 0))
    return `방식 A 를 실제 앱의 재료로 바로잡음(지난 실험의 A 와 이 한 점이 다름): 1~3단계 상황 차례 답 글 검사의 기능어 ${Math.min(...words)}개를 서버처럼 어휘 시드의 품사 칸(적재된 vocab.parts_of_speech)에서 읽었다. 지난 실험의 A 는 이 집합이 비어 기능어도 답 예시의 내용어로 보았다(검토 rev-x2 I-1).`;
  return "이 기록의 방식 A 는 바로잡기 전 판으로 돌았다: 1~3단계 상황 차례 답 글 검사의 기능어 집합이 비어 있었다(실제 앱보다 문장을 많이 잃음 — 검토 rev-x2 I-1).";
}

/** 결과 글의 표 하나(머리 · 표 · 빈 줄). 머리 아래 표 앞에 둘 글이 있으면 lead 로 준다. */
function mdSection(
  title: string,
  header: string[],
  body: string[][],
  lead: readonly string[] = [],
): string[] {
  return [
    `## ${title}`,
    "",
    ...lead.flatMap((line) => [line, ""]),
    `| ${header.join(" | ")} |`,
    `|${header.map(() => "---").join("|")}|`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
    "",
  ];
}

/** (타) 열 이름(요청자에게 보일 말 — 검토 rev-x2-2 3절 권고). */
export const SAID_COLUMNS = {
  heardUnit: "(1) 아이 말에 나온 단원 단어",
  beyondTeacher: "(2) 선생님이 바로 앞에서 말하지 않은 단원 단어(가장 엄격)",
  heardAccepted: "(3) 새 후보 규칙(들린 글만)이 인정한 단원 단어",
} as const;

/**
 * (타) 세 방식을 같은 규칙으로 센 '말했다' 수의 결과 글(방식별 · 수업별). 표 머리에 이 값이 차례 조건을 세 방식 모두 적용하지 않은 넉넉한 값임을
 * 밝힌다(검토 rev-x2-2 N-2).
 */
export function saidMarkdownOf(said: readonly SaidRow[]): string[] {
  return [
    ...mdSection(
      "(타) 세 방식을 같은 규칙으로 센 '말했다' 수 — 방식별(수업 평균 · 갈래는 합)",
      [
        "방식",
        "수업",
        SAID_COLUMNS.heardUnit,
        SAID_COLUMNS.beyondTeacher,
        SAID_COLUMNS.heardAccepted,
        ...SAID_CATEGORIES.map((k) => `(3) ${k}`),
      ],
      ARM_ORDER.filter((a) => said.some((r) => r.arm === a)).map((a) => {
        const m = saidArmOf(a, said);
        return [
          a,
          String(m.lessons),
          num(m.heardUnitMean, 1),
          num(m.beyondTeacherMean, 1),
          num(m.heardAcceptedMean, 1),
          ...SAID_CATEGORIES.map((k) => String(m.heardByCategory[k])),
        ];
      }),
      [
        "이 표의 값은 힌트 종류 · 막힘 · 되묻기 · 한국어 도움의 조건을 세 방식 모두 적용하지 않아, 각 엔진의 지금 판정보다 넉넉한 값이다(세 방식을 같은 자로 견주려고 입력을 같게 맞춘 상한).",
      ],
    ),
    "입력은 기록의 들린 글 · 아이가 들은 바로 앞 선생님 말 · 따라 할 문장 · 단원 단어뿐이다. 따라 할 문장(A: 소리 줄, P: model_sentence, N: 새 엔진 소리 줄 — 새 엔진 기록이 없는 인사 토막 차례는 A 와 같은 소리 줄)은 아이가 들은 선생님 말에 글자 그대로 든 때만 쓴다(core leadModelOf 의 inSay 와 같은 대조). (1) · (2) 는 지금의 '만났다'와 같은 대조이고, (3) 은 core leadCandidateTableOf 의 셋째 값(후보 없이 들린 글만으로 매긴 갈래, 차례 × 낱말)을 세 방식에 같은 꼴의 행으로 적용한 것이다. 새 판정 규칙이 아니며, 각 방식의 지금 판정(Claude 후보에 기댐)과는 다른 자다.",
    "",
    ...mdSection(
      "(타) 수업별",
      [
        "수업",
        "말한 차례",
        SAID_COLUMNS.heardUnit,
        SAID_COLUMNS.beyondTeacher,
        SAID_COLUMNS.heardAccepted,
        "(3) 갈래(차례 × 낱말)",
      ],
      said.map((r) => [
        r.lesson,
        String(r.counts.turns),
        cell(
          `${r.counts.heardUnit.length}(${r.counts.heardUnit.join(", ") || "-"})`,
        ),
        cell(
          `${r.counts.beyondTeacher.length}(${r.counts.beyondTeacher.join(", ") || "-"})`,
        ),
        cell(
          `${r.counts.heardAccepted.length}(${r.counts.heardAccepted.join(", ") || "-"})`,
        ),
        cell(
          SAID_CATEGORIES.filter((k) => r.counts.heardByCategory[k] > 0)
            .map((k) => `${k} ${r.counts.heardByCategory[k]}`)
            .join(", ") || "-",
        ),
      ]),
    ),
  ];
}

function metricsMarkdown(
  arms: ReturnType<typeof armMetricsOf>[],
  per: LessonMetrics[],
  pricesSource: string,
  extra: { materialsNote: string | null; said: SaidRow[] | null } = {
    materialsNote: null,
    said: null,
  },
): string {
  const rows = (title: string, header: string[], body: string[][]) =>
    mdSection(title, header, body);
  return [
    "# 수치(방식별 · 수업별)",
    "",
    ...(extra.materialsNote ? [extra.materialsNote, ""] : []),
    "선생님 차례는 아이가 들은 최종 영어(앱이 붙인 줄 포함, 수업 처음의 말 포함)다. 아이 낱말은 아이 역이 하려던 말(says)의 낱말이다. 시간은 선생님 쪽 호출(턴 · 다시 쓰기)만 더한 것이고 아이 역 호출은 넣지 않았다. 비용 단가는 저장소의 `" +
      pricesSource +
      "`(claude-sonnet-5-5 입력 $2 · 출력 $10 · 캐시 쓰기 $2.5 · 캐시 읽기 $0.1 / 100만 토큰)을 앱 함수 `src/core/ai/cost.ts` costOf 로 셈했다.",
    "",
    ...rows(
      "(가) 질문",
      [
        "방식",
        "선생님 차례",
        "질문 든 차례",
        "차례당 질문",
        "질문 둘 이상",
        "질문 차례 가장 긴 연속",
        "질문 없는 차례",
      ],
      arms.map((m) => [
        m.arm,
        String(m.questions.turns),
        pct(m.questions.questionTurnRatio),
        num(m.questions.questionsPerTurn),
        pct(m.questions.multiQuestionRatio),
        String(m.questions.longestQuestionRun),
        pct(m.questions.noQuestionRatio),
      ]),
    ),
    ...rows(
      "(나) 말의 양",
      ["방식", "차례당 선생님 낱말", "차례당 아이 낱말", "아이 말의 몫"],
      arms.map((m) => [
        m.arm,
        num(m.words.teacherPerTurn, 1),
        num(m.words.childPerTurn, 1),
        pct(m.words.childShare),
      ]),
    ),
    ...rows(
      "(다) 같은 질문 후보(수업 안)",
      [
        "방식",
        "앞 질문과 글자가 같은 질문",
        "낱말 겹침 0.6 이상 쌍",
        "마무리 상수 뺀 같은 글자 질문(AC-11)",
        "마무리 상수 물음(따로)",
      ],
      arms.map((m) => [
        m.arm,
        String(m.sameQuestions.exact),
        String(m.sameQuestions.similarPairs),
        String(m.sameQuestionsBesideClosing.exact),
        String(m.sameQuestionsBesideClosing.closingConstant),
      ]),
    ),
    ...rows(
      "(라) 앱의 개입",
      ["방식", "모델 부른 차례", "최종 말 ≠ 모델 처음 말", ...BRANCHES],
      arms.map((m) => [
        m.arm,
        String(m.intervention.calledTurns),
        `${m.intervention.changedTurns} (${pct(m.intervention.changedRatio)})`,
        ...BRANCHES.map((b) => String(m.intervention.branches[b] ?? 0)),
      ]),
    ),
    ...rows(
      "(마) 호출 수 · 걸린 시간(아이 차례당, ms)",
      [
        "방식",
        "호출 평균",
        "호출 최대",
        "시간 중앙값",
        "시간 p95",
        "시간 최대",
        "첫 호출 중앙값",
        "첫 호출 p95",
      ],
      arms.map((m) => [
        m.arm,
        num(m.calls.perChildTurnMean),
        String(m.calls.perChildTurnMax),
        num(m.calls.msMedian, 0),
        num(m.calls.msP95, 0),
        num(m.calls.msMax, 0),
        num(m.calls.firstMsMedian, 0),
        num(m.calls.firstMsP95, 0),
      ]),
    ),
    ...rows(
      "(바) 수업당 토큰 · 비용(선생님 쪽, 평균)",
      [
        "방식",
        "입력",
        "출력",
        "캐시 읽기",
        "캐시 쓰기",
        "비용(달러)",
        "아이 차례당 비용",
      ],
      arms.map((m) => [
        m.arm,
        num(m.tokensPerLesson.input, 0),
        num(m.tokensPerLesson.output, 0),
        num(m.tokensPerLesson.cacheRead, 0),
        num(m.tokensPerLesson.cacheWrite, 0),
        num(m.tokensPerLesson.costUsd, 4),
        num(m.costPerChildTurnUsd, 5),
      ]),
    ),
    ...rows(
      "(사) 단계에 맞는 말(앱 검사를 기록 전용으로, 아이 차례 뒤 선생님 차례)",
      [
        "방식",
        "차례",
        "문장 수 상한 넘음",
        "긴 문장(7낱말 넘음)",
        "범위 밖 낱말 든 차례",
        "범위 밖 형태 든 차례",
        "범위 밖 낱말(모음)",
        "범위 밖 형태(모음)",
      ],
      arms.map((m) => [
        m.arm,
        String(m.levelFit.turns),
        String(m.levelFit.overSentenceMaxTurns),
        String(m.levelFit.longSentences),
        String(m.levelFit.offbandTurns),
        String(m.levelFit.offbandFormTurns),
        cell(m.levelFit.offbandWords.join(", ")),
        cell(m.levelFit.offbandForms.join(", ")),
      ]),
    ),
    ...rows(
      "(아) 첫 문장 시간(아이 차례 뒤 선생님 첫 호출, 요청부터 아이에게 나갈 말 칸의 첫 문장이 끝난 때까지, ms)",
      [
        "방식",
        "잰 차례",
        "중앙값",
        "p95",
        "첫 문장이 물음 아닌 차례",
        "그 중앙값",
        "그 p95",
        "흘려 읽지 못해 호출 끝으로 잰 차례",
      ],
      arms.map((m) => [
        m.arm,
        String(m.firstSentence.turns),
        num(m.firstSentence.msMedian, 0),
        num(m.firstSentence.msP95, 0),
        String(m.firstSentence.plainTurns),
        num(m.firstSentence.plainMsMedian, 0),
        num(m.firstSentence.plainMsP95, 0),
        String(m.firstSentence.fromEnd),
      ]),
    ),
    ...rows(
      "(자) 끝난 길(수업 수)",
      [
        "방식",
        ...ENDING_HOWS.map((h) => ENDING_LABEL[h]),
        "두 단추가 나온 수업",
        "더 이야기하기",
        "그만하기",
      ],
      arms.map((m) => [
        m.arm,
        ...ENDING_HOWS.map((h) => String(m.ending[h])),
        String(m.ending.withButtons),
        String(m.ending.more),
        String(m.ending.stop),
      ]),
    ),
    ...rows(
      "(차) 아이에게 첫 문장이 나간 때(아이 차례 뒤 선생님 차례, 요청부터 앱이 첫 문장을 내보낸 때까지, ms — 정의는 arch-metrics FirstSent)",
      [
        "방식",
        "잰 차례",
        "받아 두지 않은 차례",
        "그 중앙값",
        "그 p95",
        "받아 둔 차례(말 칸 · 물음 · 다시 쓰기)",
        "그 중앙값",
        "그 p95",
        "흘려 읽지 못해 호출 끝으로 잰 차례",
      ],
      arms.map((m) => [
        m.arm,
        String(m.firstSent.turns),
        String(m.firstSent.plainTurns),
        num(m.firstSent.plainMsMedian, 0),
        num(m.firstSent.plainMsP95, 0),
        `${m.firstSent.heldTurns}(${m.firstSent.heldBy.say} · ${m.firstSent.heldBy.question} · ${m.firstSent.heldBy.rewrite})`,
        num(m.firstSent.heldMsMedian, 0),
        num(m.firstSent.heldMsP95, 0),
        String(m.firstSent.fromEnd),
      ]),
    ),
    // 참고 줄(검토 rev-x2 M-5 · M-4): 받아 둔 차례까지 합친 값 · N 의 입구 start(차례당 셈 밖)
    ...arms.map(
      (m) =>
        `- 참고 ${m.arm}: 받아 둔 차례까지 합친 '아이에게 첫 문장이 나간 때' 중앙값 ${num(m.firstSent.allMsMedian, 0)} · p95 ${num(m.firstSent.allMsP95, 0)}(${m.firstSent.turns}차례 — 두 방식의 받아 둔 차례 구성이 달라 따로 본다)`,
    ),
    ...arms.flatMap((m) =>
      m.entryStart
        ? [
            `- 참고 ${m.arm}: 입구 차례(start — 대화 토막에 들어와 첫 소리를 듣기까지, A 에는 없는 기다림) 첫 문장 시간 중앙값 ${num(m.entryStart.firstSentMsMedian, 0)} · p95 ${num(m.entryStart.firstSentMsP95, 0)}(${m.entryStart.firstSentTurns}/${m.entryStart.turns}차례). 이 호출은 인사 끝 차례의 호출 수 · 시간에 넣지 않았다`,
          ]
        : [],
    ),
    "",
    ...rows(
      "(카) 새 엔진(N) 기록 — 수업마다(차이 표 낱말은 lead.md)",
      [
        "수업",
        "N 차례(아이 · 입구 start · more)",
        "(가) 차이 낱말(지금 판정에만 · 새 후보에만)",
        "막힌 뒤 고르기로 빠진 차례",
        "Claude 후보 어긋남(인식 글에 없음 · Claude 가 안 냄)",
        "(나) 좁은 정의 걸림 · 다시 받은 문장이 나감 · 다시 걸림 · 원래 질문 · 서버라면 시간 예산 밖",
        "(다) 받아 둔 차례(아이 차례 뒤만, 말 칸 · 물음) · 시간 중앙값 · p95",
        "(라) 마무리 차례 · 그중 읽기가 막힘(무름 뒤)",
        "문장 문 걸림",
      ],
      per.flatMap((m) =>
        m.lead === null
          ? []
          : [
              [
                m.lesson,
                `${m.lead.turns}(${m.lead.byEntry.child} · ${m.lead.byEntry.start} · ${m.lead.byEntry.more})`,
                m.lead.diff
                  ? `${m.lead.diff.differ}(${m.lead.diff.currentOnly} · ${m.lead.diff.candidateOnly})`
                  : "-",
                String(m.lead.diff?.choicesDropped ?? "-"),
                m.lead.diff
                  ? `${m.lead.diff.claudeNotHeard} · ${m.lead.diff.heardNotClaude}`
                  : "-",
                `${m.lead.narrow.turns} · ${m.lead.narrow.replaced} · ${m.lead.narrow.againHit} · ${m.lead.narrow.kept} · ${m.lead.narrow.overBudget}`,
                `${m.lead.held.say} · ${m.lead.held.question} · ${num(m.lead.held.msMedian, 0)} · ${num(m.lead.held.msP95, 0)}`,
                `${m.lead.closing.turns} · ${m.lead.closing.stuckReading}(${m.lead.closing.stuckEffective})`,
                cell(
                  Object.entries(m.lead.gate)
                    .map(([k, v]) => `${k} ${v}`)
                    .join(", ") || "-",
                ),
              ],
            ],
      ),
    ),
    ...(extra.said ? saidMarkdownOf(extra.said) : []),
    ...rows(
      "수업별 끝난 길 · 마무리 차례의 말",
      ["수업", "끝난 길", "까닭", "마무리 차례의 말", "고른 단추"],
      per.map((m) => [
        m.lesson,
        ENDING_LABEL[m.ending.how],
        cell(m.ending.reason ?? "-"),
        cell(m.ending.line ?? "-"),
        cell(
          m.ending.choices
            .map(
              (c) =>
                `${c.childTurn} 앞 ${c.picked === "more" ? `더 이야기하기${c.continued ? "(이음)" : "(잇지 않음)"}` : "그만하기"}`,
            )
            .join(" · ") || "-",
        ),
      ]),
    ),
    ...rows(
      "수업별",
      [
        "수업",
        "아이 차례",
        "끝",
        "질문 든 차례",
        "차례당 질문",
        "질문 둘 이상",
        "가장 긴 연속",
        "선생님 낱말/차례",
        "아이 몫",
        "같은 질문",
        "겹침 쌍",
        "개입 차례",
        "호출/차례",
        "시간 중앙값",
        "비용",
        "범위 밖 낱말 차례",
        "시도",
      ],
      per.map((m) => [
        m.lesson,
        String(m.childTurns),
        cell(m.ended ?? "상한"),
        pct(m.questions.questionTurnRatio),
        num(m.questions.questionsPerTurn),
        pct(m.questions.multiQuestionRatio),
        String(m.questions.longestQuestionRun),
        num(m.words.teacherPerTurn, 1),
        pct(m.words.childShare),
        String(m.sameQuestions.exact),
        String(m.sameQuestions.similar.length),
        `${m.intervention.changedTurns}/${m.intervention.calledTurns}`,
        num(m.calls.perChildTurnMean),
        num(m.calls.msMedian, 0),
        num(m.tokens.costUsd, 4),
        String(m.levelFit.offbandTurns),
        String(m.attempt),
      ]),
    ),
    "## 같은 질문 후보 목록(수업별)",
    "",
    ...per.flatMap((m) =>
      m.sameQuestions.similar.length === 0
        ? []
        : [
            `- ${m.lesson}: ${m.sameQuestions.similar
              .map(
                (p) =>
                  `차례 ${p.a.turn} "${p.a.text}" ↔ 차례 ${p.b.turn} "${p.b.text}" (${p.jaccard})`,
              )
              .join(" · ")}`,
          ],
    ),
    "",
  ].join("\n");
}

// ── 나란히 표 ────────────────────────────────────────────────────

function childCell(c: ChildTurnLog | undefined): string {
  if (!c) return "-";
  if (c.action === "dont_know") return "('잘 모르겠어요' 단추)";
  if (c.action === "silent") return "(말 없음)";
  return c.noise ? `"${c.says}" → 들린 글 "${c.heard}"` : `"${c.says}"`;
}

function afterNoiseMarkdown(lessons: readonly Lesson[]): string {
  const out = [
    "# 잡음 · '잘 모르겠어요' · 말 없음 차례 바로 뒤 선생님 말(방식 나란히)",
    "",
    "칸마다 그 방식 수업의 아이 말(잡음을 넣었으면 들린 글) 다음 줄에 바로 뒤 선생님의 최종 말이다. 아이 역은 방식마다 다른 선생님 말을 듣고 답하므로 같은 차례라도 아이 말이 다르다. 잡음은 같은 씨앗이면 같은 차례에 넣고, 그 차례에 말하지 않았으면 건너뛴다.",
    "",
  ];
  const groups = new Map<string, Lesson[]>();
  for (const l of lessons) {
    const key = `${l.meta.child} · 씨앗 ${l.meta.seed}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  for (const [key, group] of groups) {
    const byArm = (arm: Arm) => group.find((l) => l.meta.arm === arm);
    const seed = group[0]?.meta.seed ?? 1;
    const turns = new Set<number>(NOISE_TURNS[seed] ?? []);
    for (const l of group)
      for (const c of l.children)
        if (c.action !== "speak") turns.add(c.childTurn);
    out.push(
      `## ${key}(잡음 차례 ${(NOISE_TURNS[seed] ?? []).join(" · ")})`,
      "",
      `| 차례 | ${ARM_ORDER.join(" | ")} |`,
      `|---|${ARM_ORDER.map(() => "---").join("|")}|`,
    );
    for (const t of [...turns].sort((a, b) => a - b)) {
      const cells = ARM_ORDER.map((arm) => {
        const l = byArm(arm);
        const c = l?.children.find((x) => x.childTurn === t);
        const teacher = l?.teachers.find((x) => x.childTurn === t);
        if (!c) return "(그 차례 없음)";
        const flag =
          c.noise !== null ? "[잡음] " : c.noiseSkipped ? "[잡음 건너뜀] " : "";
        return cell(
          `${flag}${childCell(c)}\n→ ${teacher ? heardByChild(teacher.final) : "(선생님 말 없음 — 수업 끝)"}`,
        );
      });
      out.push(`| ${t} | ${cells.join(" | ")} |`);
    }
    out.push("");
  }
  return `${out.join("\n")}\n`;
}

function afterOwnTopicMarkdown(lessons: readonly Lesson[]): string {
  const out = [
    "# 아이가 제 이야기를 꺼내거나(own_topic) 선생님에게 물은(ask_teacher) 차례 바로 뒤 선생님 말",
    "",
    "아이 역이 스스로 매긴 kind 를 따른다. 들린 글이 하려던 말과 다르면 둘 다 적는다.",
    "",
  ];
  for (const arm of ARM_ORDER) {
    const rows = lessons
      .filter((l) => l.meta.arm === arm)
      .flatMap((l) =>
        l.children
          .filter((c) => c.kind === "own_topic" || c.kind === "ask_teacher")
          .map((c) => {
            const teacher = l.teachers.find((x) => x.childTurn === c.childTurn);
            return `| ${l.name} | ${c.childTurn} | ${c.kind} | ${cell(childCell(c))} | ${cell(teacher ? heardByChild(teacher.final) : "-")} |`;
          }),
      );
    out.push(
      `## 방식 ${arm}(${rows.length}차례)`,
      "",
      "| 수업 | 차례 | 갈래 | 아이 | 바로 뒤 선생님 말 |",
      "|---|---|---|---|---|",
      ...rows,
      "",
    );
  }
  return `${out.join("\n")}\n`;
}

// ── 새 엔진(N) 차이 표 ───────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  repeated_model: "① 따라 말함",
  echoed_word: "② 낱말만 되풀이",
  after_meaning: "③ 뜻을 들은 뒤",
  own_sentence: "④ 새 문장",
  own_later: "⑤ 뒤에 스스로",
  not_said_by_teacher: "그 밖",
};

/**
 * 수업마다 지금 판정과 새 후보 판정의 차이 표(설계 5 · 미결 7 — N 수업만): 차이 낱말 행(어느 쪽에만 · 차이가 온 곳 · 갈래)과 갈래별 수 ·
 * ③ 가운데 막힌 뒤 한국어 뜻 · 막힌 뒤 고르기로 빠진 차례 · Claude 후보 어긋남. 표가 없는 수업(옛 기록 · 다른 방식)은 싣지 않는다.
 */
export function leadMarkdown(lessons: readonly Lesson[]): string {
  const out = [
    "# 새 엔진(N) 수업마다 차이 표(지금 판정 ↔ 새 후보 판정, 기록 전용)",
    "",
    "지금 판정은 저장된 '말했다'(Claude 후보 + saidWordsOf), 새 후보는 core lead-candidate 의 다섯 갈래 판정이다. '차이가 온 곳'의 categories 는 다섯 구분에서 온 차이, other_conditions 는 그 밖의 조건(힌트 종류 · 막힘 · 되묻기 · Claude 후보 어긋남)에서 온 차이다. 한국어 도움(talk_ko_helps)은 아직 합쳐지지 않아 ③ 한국어 도움 셈은 0 이다. 인사 토막(지금 길) 아이 차례는 표에 넣지 않는다.",
    "",
  ];
  for (const l of lessons) {
    const table = l.meta.lead?.table;
    if (!table) continue;
    const c = table.counts;
    out.push(
      `## ${l.name}`,
      "",
      `- 차이 낱말 ${c.differ}(지금 판정에만 ${c.currentOnly} · 새 후보에만 ${c.candidateOnly}) · 막힌 뒤 고르기로 빠진 차례 ${c.choicesDropped} · ③ 가운데 막힌 뒤 한국어 뜻 ${c.teacherKo} · Claude 가 냈지만 인식 글에 없음 ${c.claudeNotHeard} · 인식 글에 있지만 Claude 가 내지 않음 ${c.heardNotClaude}`,
      `- 갈래별(새 후보 · 차례 × 낱말): ${Object.entries(c.byCategory)
        .map(([k, v]) => `${CATEGORY_LABEL[k] ?? k} ${v}`)
        .join(" · ")}`,
      `- 갈래별(들린 글만): ${Object.entries(c.heardByCategory)
        .map(([k, v]) => `${CATEGORY_LABEL[k] ?? k} ${v}`)
        .join(" · ")}`,
      "",
      "| 낱말 | 지금 판정 | 새 후보 | 들린 글만 | 어느 쪽에만 | 차이가 온 곳 | 갈래(새 후보) | 갈래(들린 글만) |",
      "|---|---|---|---|---|---|---|---|",
      ...table.words.map(
        (w) =>
          `| ${w.word} | ${w.current ? "예" : "-"} | ${w.candidate ? "예" : "-"} | ${w.heard ? "예" : "-"} | ${w.side} | ${w.differFrom ?? "-"} | ${w.categories.map((k) => CATEGORY_LABEL[k] ?? k).join(", ") || "-"} | ${w.heardCategories.map((k) => CATEGORY_LABEL[k] ?? k).join(", ") || "-"} |`,
      ),
      "",
      "차례마다(들린 글 · reading · 힌트 종류 · 지금 판정 · 새 후보 · 들린 글만):",
      "",
      ...table.turns.map(
        (t) =>
          `- 행 ${t.row}: "${t.text}" · ${t.reading ?? "-"} · ${t.hintKind} · 지금 [${t.current.join(", ")}] · 새 후보 [${t.candidate.map((x) => `${x.word}:${CATEGORY_LABEL[x.category] ?? x.category}${x.accepted ? "" : "(인정 안 함)"}`).join(", ")}] · 들린 글만 [${t.heard.map((x) => `${x.word}:${CATEGORY_LABEL[x.category] ?? x.category}`).join(", ")}]`,
      ),
      "",
    );
  }
  return `${out.join("\n")}\n`;
}

// ── 가려 읽기 ────────────────────────────────────────────────────

/**
 * 가려 읽기 차례. 출력 폴더에 대응표(blind-key.json)가 이미 있고 그 수업 묶음이 지금 수업과 빠짐 · 겹침 없이 같으면 그 차례를 그대로 쓴다 —
 * 수치만 다시 내도 판정자가 읽고 있는 가려 읽기 글과 대응표가 바뀌지 않게(묶음 X2 고침 2). 그 밖에는 새로 섞는다.
 */
export function blindOrderOf<T extends { name: string }>(
  dir: string,
  lessons: readonly T[],
): T[] {
  const keyFile = join(dir, "blind-key.json");
  if (existsSync(keyFile)) {
    const names = Object.entries(
      JSON.parse(readFileSync(keyFile, "utf8")) as Record<string, unknown>,
    )
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([, v]) => v);
    const byName = new Map(lessons.map((l) => [l.name, l]));
    const kept = names.flatMap((n) => {
      const l = typeof n === "string" ? byName.get(n) : undefined;
      return l ? [l] : [];
    });
    if (
      names.length === lessons.length &&
      kept.length === lessons.length &&
      new Set(kept).size === lessons.length
    )
      return kept;
  }
  const order = [...lessons];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j] as T, order[i] as T];
  }
  return order;
}

function blindOf(dir: string, lessons: readonly Lesson[]): void {
  const order = blindOrderOf(dir, lessons);
  const blind = join(dir, "blind");
  if (existsSync(blind)) rmSync(blind, { recursive: true });
  mkdirSync(blind, { recursive: true });
  const key: Record<string, string> = {};
  order.forEach((l, i) => {
    const name = `T${String(i + 1).padStart(2, "0")}`;
    key[name] = l.name;
    const out = [
      `# ${name}`,
      "",
      `아이 ${l.meta.child} · 씨앗 ${l.meta.seed} · 아이 차례 ${l.meta.childTurns}`,
      "",
    ];
    const opening = l.teachers.find((t) => t.childTurn === 0);
    if (opening)
      out.push(
        "## 처음",
        "",
        ...heardByChild(opening.final)
          .split("\n")
          .map((x) => `> ${x}`),
        "",
      );
    for (const c of l.children) {
      out.push(`## 아이 차례 ${c.childTurn}`, "");
      // 마무리 단추에서 '더 이야기하기'를 고른 뒤 이은 선생님 말(이 아이 차례 앞 — 매기는 차례가 아니다)
      const cont = l.teachers.find(
        (x) => x.childTurn === c.childTurn && x.afterChoice === true,
      );
      if (cont)
        out.push(
          "- (아이가 더 이야기하기로 함) 선생님:",
          "",
          ...heardByChild(cont.final)
            .split("\n")
            .map((x) => `> ${x}`),
          "",
        );
      out.push(
        `- 아이가 하려던 말: ${c.action === "speak" ? `"${c.says}"` : c.action === "dont_know" ? "('잘 모르겠어요' 단추)" : "(말 없음)"}`,
      );
      if (c.action === "speak") out.push(`- 들린 글: "${c.heard ?? ""}"`);
      const t = l.teachers.find(
        (x) => x.childTurn === c.childTurn && x.afterChoice !== true,
      );
      out.push(
        "- 선생님:",
        "",
        ...(t
          ? heardByChild(t.final)
              .split("\n")
              .map((x) => `> ${x}`)
          : ["> (수업 끝)"]),
        "",
      );
    }
    writeFileSync(join(blind, `${name}.md`), `${out.join("\n")}\n`);
  });
  writeFileSync(
    join(dir, "blind-key.json"),
    `${JSON.stringify(key, null, 2)}\n`,
  );
}

// ── 가려 읽는 판정의 채점표 · 모음 ─────────────────────────────────

/** 채점표 파일 이름(가려 읽기 폴더와 함께 출력 폴더에 낸다). */
export const JUDGE_RUBRIC_FILE = "judge-rubric.md";

/** 사람의 삶을 제 것으로 말함(spec '회화 Claude 주도' 설계 9 · 재검토 I2-3 (가)) — 안전 문장 넷째의 낱말 그대로. */
export const OWN_LIFE_RULE =
  "선생님이 사람의 삶 가운데 나이 · 가족 · 집 · 학교(age, family, home, school)를 제 것으로 말한 차례이면 true 입니다(예: 'I have a sister.' · 'My home is big.' · 'I am thirty.'). 따라 할 문장(아이에게 따라 말하게 한 본보기)과 아이 말을 되받은 문장은 세지 않습니다. 먹다 · 가다 같은 일과를 제 것으로 말한 문장(예: 'I eat rice for lunch.' · 'I go to the park.')은 이 칸에 넣지 않고, 그 문장을 `own_routine` 목록에 그대로 적습니다(없으면 빈 목록, 따라 할 문장 · 되받은 문장은 여기에도 적지 않습니다)";

/** 질문 반복의 기준(채점표 판 2: 잘못 들려 되묻는 것은 세지 않음). */
export const REPEAT_RULE =
  "이 차례의 질문이 같은 수업에서 앞에 한 질문과 뜻이 같다(낱말만 바꾼 것도 해당). true 이면 `repeat_of` 에 앞 차례 번호. 잘못 들려 되묻는 것(들린 글이 질문과 맞지 않아 다시 묻는 것)은 반복 질문으로 세지 않습니다";

/** 캐묻는 느낌(지난 칸 이름 '밀어붙임' — 지난 판정자 둘의 적용 기준이 갈린 곳(따라 말하기 권유 · 되묻기를 질문으로 세는가)을 한 문장으로 정함). */
export const PUSHY_RULE =
  "아이가 답해야 할 질문이 한 차례에 둘 이상이면 true 이고(열린 물음 뒤에 따로 붙인 예 · 아니오 물음은 질문 하나로 더 세고, 'A? Or B?' 같은 고르기 조각 · 'Yes or no?' 같은 답 꼴 알림 · 'Can you say it?' 같은 따라 말하기 권유 · 'Ready?' 같은 형식 물음 · 잘못 들려 되묻는 물음 · 선생님이 곧바로 스스로 답한 물음은 세지 않음), 질문이 하나일 때는 이미 답을 들은 것이나 앞에서 한 물음을 또 묻거나(잘못 들렸거나 답을 못 받아 되묻는 것은 빼고), 아이가 싫다고 한 화제를 다시 묻거나, 막힌 뒤 도움 없이 새로 묻거나, 같은 좁은 것을 세 차례째 물을 때만 true 이며, 구체적인 반응 뒤에 이어지는 질문 하나는 false 입니다";

/**
 * 가려 읽는 판정의 채점표(지난 판정 브리프 task-judge-blind.md 의 꼴, 판 2). 바뀐 것은 셋이다: '사람의 삶을 제 것으로 말함' 칸
 * (own_life · own_routine)을 더함, 질문 반복에서 되묻기를 뺌, '밀어붙임' 칸을 '캐묻는 느낌'으로 하고 기준을 한 문장으로 정함.
 */
export function judgeRubricOf(dir: string): string {
  const blind = join(dir, "blind");
  return `# 판정 브리프: 가려 읽는 회화 수업 기록 판정(채점표 판 2)

읽기 전용 판정입니다. 코드와 문서를 고치지 않고, 실호출도 하지 않습니다. 결과 파일 둘(JSON 하나 · md 하나)만 씁니다.

## 맥락

- 초등학생(열 살쯤, 영어를 막 시작한 한국 아이)이 AI 영어 선생님과 일대일로 말로 대화하는 수업의 기록을 읽고 판정합니다. 요청자의 목표는 "AI가 아이의 말을 이해하고, 관심을 보이고, 대화를 발전시키면서 그 과정에서 자연스럽게 영어를 가르치는 것"입니다(13절 \`specs/10-결정-기록.md\` C232 · C234).
- 수업 기록은 서로 다른 방식의 선생님이 같은 아이 역 · 같은 조건으로 한 것이고, 어느 기록이 어느 방식인지는 가려져 있습니다. **방식을 알아내려 하지 않습니다.** 아래 '읽을 것'의 폴더 밖에 있는 실험 파일(방식 정의 · 대응표 · 호출 기록)은 열지 않습니다.
- 기록의 꼴: 아이 차례마다 '아이가 하려던 말'과 '들린 글'이 함께 적혀 있습니다. 선생님은 **들린 글만** 봤습니다(음성 인식이 틀리는 차례가 일부러 섞여 있습니다). 아이가 '모르겠어요' 단추를 누르거나 아무 말도 하지 않은 차례도 있습니다. 아이는 영어를 한두 낱말이나 아주 짧은 문장으로만 말하고, 길거나 어려운 문장은 알아듣지 못합니다. 수업 끝 무렵 아이가 더 이야기하기로 한 자리는 그 뒤 선생님 말과 함께 다음 아이 차례 머리에 적혀 있습니다(읽을 맥락이고, 매기는 차례는 아이 차례 바로 뒤의 선생님 말입니다).
- 요청자가 강조한 뜻: 발화 문장이 다양한지보다 **아이의 말에 얼마나 알맞게 반응하는지**를 봅니다. 좋은 선생님은 차례마다 질문하지 않고, 공감 · 감탄 · 짧은 자기 이야기 · 질문 없는 반응도 씁니다.

## 읽을 것

\`${blind}/\` 의 \`T*.md\` 전부. 이 폴더만 읽습니다.

## 판정할 것

### 선생님 차례마다(아이 차례 바로 뒤의 선생님 말)

| 열 | 값 | 기준 |
|---|---|---|
| \`link\` 대화 연결성 | 0 · 1 · 2 | 2: 지금까지의 대화에서 자연스럽게 이어진다(앞에서 나온 사실 · 관심사를 기억한다). 1: 어긋나지는 않지만 흐름과 따로 논다. 0: 갑자기 다른 이야기로 넘어가거나 앞의 내용과 어긋난다 |
| \`uptake\` 아이의 발화 반영 | 0 · 1 · 2 | 2: 아이가 방금 한 말의 내용을 구체적으로 받아서 반응하거나 그것을 이어 간다. 1: "Nice!" 같은 두루뭉술한 반응 뒤 제 갈 길을 간다. 0: 아이의 말을 무시한다. 잘못 들린 차례에서는, 들린 글이 질문과 맞지 않음을 알아채고 알맞게 다시 묻거나 맞는 뜻으로 받아 주면 2, 틀린 글 위에 이야기를 지어 가면 0 |
| \`misread\` 잘못된 이해 | true · false | 선생님이 아이의 말을 잘못 이해했다(틀린 글을 사실로 받아들임 · 답이 아닌 말을 답으로 긍정함 · 묻지 않은 것에 답함) |
| \`repeat\` 질문 반복 | true · false | ${REPEAT_RULE} |
| \`q_count\` 질문 수 | 0 · 1 · 2 … | 이 차례에 든 질문의 수 |
| \`pushy\` 캐묻는 느낌 | true · false | ${PUSHY_RULE} |
| \`made_up\` 지어냄 | true · false | 대화에 나온 적 없는 물건 · 상황을 있는 것처럼 말했다 |
| \`own_life\` 사람의 삶을 제 것으로 말함 | true · false, \`own_routine\` 은 문장 목록 | ${OWN_LIFE_RULE} |
| \`help\` 도움의 알맞음 | 0 · 1 · 2 · null | 아이가 막힌 차례('모르겠어요' · 말 없음 · 답을 못 함) 바로 뒤에만 매깁니다. 2: 더 쉬운 질문 · 고르기 · 짧은 본보기처럼 알맞은 도움을 주고, 앞에서 쓴 도움 방식을 되풀이하지 않는다. 1: 도움을 주지만 두루뭉술하거나 같은 방식을 되풀이한다. 0: 같은 질문을 다시 하거나 도움 없이 넘어간다. 해당 없으면 null |
| \`follow\` 아이가 꺼낸 이야기 | 0 · 1 · 2 · null | 아이가 제 이야기를 꺼내거나 선생님에게 질문한 차례 바로 뒤에만 매깁니다. 2: 그 이야기를 받아 이어 가거나 질문에 답한다. 1: 짧게 받은 뒤 제 주제로 돌아간다. 0: 무시한다. 해당 없으면 null |
| \`level\` 말의 수준 | 0 · 1 · 2 | 2: 이 아이가 알아들을 만큼 짧고 쉽다. 1: 조금 길거나 어려운 낱말이 섞였다. 0: 알아듣기 어렵다 |
| \`note\` | 글 | 0 점이나 true 를 준 까닭을 한 줄로(없으면 빈 글) |

### 수업마다

| 열 | 값 | 기준 |
|---|---|---|
| \`feel\` 실제 선생님과 대화하는 느낌 | 1~5 | 5: 아이의 말을 이해하고 관심을 보이며 대화를 함께 발전시킨다. 3: 문답은 이어지지만 정해진 흐름을 따라가는 느낌이다. 1: 면접이나 문제 풀이 같다 |
| \`memory\` 기억 | yes · partly · no | 앞에서 아이가 말한 사실 · 관심사를 뒤에서 다시 살려 쓴다. 근거 차례 번호를 \`memory_turns\` 에 |
| \`teaching\` 가르침 | 1~5 | 대화 속에서 영어를 자연스럽게 가르친다(바른 말로 되받아 주기 · 알맞은 본보기 · 아이가 스스로 말해 볼 기회). 5: 자주 그리고 자연스럽게. 1: 가르침이 없거나 시험처럼 한다 |
| \`child_room\` 아이가 말할 자리 | 1~5 | 아이가 제 이야기를 할 기회가 충분하다 |
| \`best\` · \`worst\` | 차례 번호와 한 줄 | 가장 좋았던 선생님 차례와 가장 나빴던 차례 |

## 결과 파일

- \`<결과 폴더>/judge-<판정자 이름>.json\`: \`{ "lessons": [ { "id": "T01", "turns": [ { "n": 1, "link": 2, "uptake": 2, "misread": false, "repeat": false, "repeat_of": null, "q_count": 1, "pushy": false, "made_up": false, "own_life": false, "own_routine": [], "help": null, "follow": null, "level": 2, "note": "" }, … ], "feel": 4, "memory": "partly", "memory_turns": [7, 12], "teaching": 3, "child_room": 4, "best": { "n": 5, "why": "…" }, "worst": { "n": 9, "why": "…" } }, … ] }\`. 차례 번호 \`n\` 은 기록에 적힌 아이 차례 번호를 그대로 씁니다. 모든 수업의 모든 선생님 차례를 빠짐없이 매깁니다.
- \`<결과 폴더>/judge-<판정자 이름>.md\`: 수업마다 세 줄 안의 총평과, 전체를 읽으며 눈에 띈 꼴(좋은 것 · 나쁜 것)을 수업 이름과 차례 번호로 적습니다. 방식에 관한 추측은 적지 않습니다.

결과 폴더는 \`${dir}\` 이고, 판정자 이름은 호출 때 알려 줍니다. JSON 은 다 쓴 뒤 \`python3 -c "import json;json.load(open('<파일>'))"\` 로 읽히는지 확인합니다. 수업 몇 개를 판정할 때마다 저장합니다(중간에 멈춰도 남게).

수업을 읽는 차례는 이름 순서가 아니라 호출 때 알려 주는 순서를 따릅니다. 같은 기준을 처음부터 끝까지 똑같이 적용합니다. 판단이 갈리는 차례는 \`note\` 에 까닭을 적습니다. 마지막 메시지는 다섯 줄 안의 요지와 결과 파일 경로만 적습니다.
`;
}

/** 이 도구가 쓴 판정 모음 파일의 표지 칸(검토 rev-x2 M-7 — 판정자 하나로 모은 파일도 지난 스크립트의 출력과 가른다). */
export const JUDGE_SUMMARY_TOOL_KEY = "tool";
export const JUDGE_SUMMARY_TOOL = "arch-report";

/**
 * --judges 가 덮으면 안 되는 judge-summary.json 인가(검토 rev-x1 M6 · rev-x2 M-7): 이미 있고 표지 칸(tool: arch-report)도 pair 칸도 없는 파일은
 * 지난 모음 스크립트(judge-agg.py)의 출력이라 호환 시험의 기준이다. 이 도구가 쓴 파일(표지 칸 · 표지 전에 쓴 pair 칸 있음)이나 없는 파일은
 * 덮어도 된다. 읽지 못하는 파일도 덮지 않는다.
 */
export function judgeSummaryOverwriteBlocked(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    const was = JSON.parse(readFileSync(path, "utf8")) as Record<
      string,
      unknown
    >;
    return (
      was[JUDGE_SUMMARY_TOOL_KEY] !== JUDGE_SUMMARY_TOOL &&
      !Object.hasOwn(was, "pair")
    );
  } catch {
    return true;
  }
}

/** --judges 가 쓰는 judge-summary.json 의 글(판정자별 칸 · 두 판정자면 pair · 표지 칸). */
export function judgeSummaryJsonOf(summary: JudgeSummary): string {
  return `${JSON.stringify(
    {
      ...summary.judges,
      ...(summary.pair ? { pair: summary.pair } : {}),
      [JUDGE_SUMMARY_TOOL_KEY]: JUDGE_SUMMARY_TOOL,
    },
    null,
    1,
  )}\n`;
}

/** 판정 결과 파일들을 읽어 방식별로 모은다(지난 실험의 judge-agg.py 를 옮김 — 같은 셈 · 같은 반올림). */
export function readJudgeSummary(
  dir: string,
  judges: readonly string[],
): JudgeSummary {
  const key = JSON.parse(
    readFileSync(join(dir, "blind-key.json"), "utf8"),
  ) as Record<string, unknown>;
  const files = Object.fromEntries(
    judges.map((j) => [
      j,
      JSON.parse(
        readFileSync(join(dir, `judge-${j}.json`), "utf8"),
      ) as JudgeFile,
    ]),
  );
  return judgeSummaryOf(key, files, ARM_ORDER);
}

const JUDGE_COLS = [
  "turns",
  "link",
  "uptake",
  "misread%",
  "repeat%",
  "pushy%",
  "made_up%",
  "made_up_n",
  "own_life%",
  "own_life_n",
  "own_routine_n",
  "help",
  "help_n",
  "follow",
  "follow_n",
  "level",
  "q/turn",
  "feel",
  "teaching",
  "child_room",
] as const;
const JUDGE_COL_LABEL: Record<(typeof JUDGE_COLS)[number], string> = {
  turns: "차례",
  link: "연결",
  uptake: "반영",
  "misread%": "잘못 이해",
  "repeat%": "반복 질문",
  "pushy%": "캐묻는 느낌",
  "made_up%": "지어냄",
  made_up_n: "지어낸 차례",
  "own_life%": "사람의 삶",
  own_life_n: "사람의 삶 차례",
  own_routine_n: "일과 문장",
  help: "막힌 뒤 도움",
  help_n: "도움 n",
  follow: "꺼낸 이야기",
  follow_n: "꺼낸 n",
  level: "수준",
  "q/turn": "질문/차례",
  feel: "느낌",
  teaching: "가르침",
  child_room: "말할 자리",
};

export function judgeSummaryMarkdown(summary: JudgeSummary): string {
  const out = [
    "# 가려 읽는 판정 모음(방식별)",
    "",
    "비율(%)은 매긴 차례 가운데 true 인 몫, 평균은 매긴 값만의 평균이다(지난 실험의 judge-agg.py 와 같은 셈 · 같은 반올림). '사람의 삶' · '일과 문장'은 채점표 판 2 의 칸이라 옛 판정 파일에는 비어 있다.",
    "",
  ];
  for (const [judge, rows] of Object.entries(summary.judges)) {
    out.push(
      `## 판정자 ${judge}`,
      "",
      `| 방식 | ${JUDGE_COLS.map((c) => JUDGE_COL_LABEL[c]).join(" | ")} | 기억 | 아이 역별 느낌 |`,
      `|${["", ...JUDGE_COLS, "", ""].map(() => "---").join("|")}|`,
    );
    for (const a of summary.arms) {
      const r = rows[a];
      if (!r) continue;
      out.push(
        `| ${a} | ${JUDGE_COLS.map((c) => String(r[c] ?? "-")).join(" | ")} | ${cell(JSON.stringify(r.memory))} | ${cell(JSON.stringify(r.feel_by_child))} |`,
      );
    }
    out.push("");
    const examples = summary.arms.flatMap((a) =>
      (rows[a]?.own_routine_examples ?? []).map(
        (e) => `- ${a} · ${e.id} 차례 ${e.n}: "${e.text}"`,
      ),
    );
    if (examples.length > 0)
      out.push("일과를 제 것으로 말한 문장(예문):", "", ...examples, "");
  }
  const p = summary.pair;
  if (p) {
    out.push(
      `## 두 판정자(${p.a} · ${p.b})`,
      "",
      `- 수업별 '대화하는 느낌' 차이: 평균 ${p.feel.meanDiff ?? "-"} · 같은 점수 ${p.feel.same}/${p.feel.lessons} · 한 점 안 ${p.feel.withinOne}/${p.feel.lessons} · 상관 ${p.feel.corr ?? "-"}`,
      "",
      "| 방식 | 둘이 함께 표시한 지어낸 차례 | 둘이 함께 표시한 사람의 삶 차례 |",
      "|---|---|---|",
      ...summary.arms.map((a) => {
        const b = p.both[a] ?? { made_up: [], own_life: [] };
        const refs = (xs: { id: string; n: number }[]) =>
          xs.length === 0
            ? "0"
            : `${xs.length} (${xs.map((x) => `${x.id} ${x.n}`).join(", ")})`;
        return `| ${a} | ${refs(b.made_up)} | ${refs(b.own_life)} |`;
      }),
      "",
      `수업별(이름 · ${p.a} · ${p.b}):`,
      "",
      ...p.lessons.map(
        (l) => `- ${l.id} ${l.name} ${l.a ?? "-"} ${l.b ?? "-"}`,
      ),
      "",
    );
  }
  return `${out.join("\n")}\n`;
}

/** --judges 값(쉼표로 가른 판정자 이름, 두 판정자 셈의 칸 이름 pair 는 쓰지 않는다). */
export function parseJudgesArg(argv: readonly string[]): string[] | null {
  const i = argv.indexOf("--judges");
  if (i < 0) return null;
  const names = (argv[i + 1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  if (names.length === 0)
    throw new Error("arch-report: --judges 뒤에 판정자 이름이 필요하다");
  if (names.includes("pair"))
    throw new Error(
      "arch-report: 판정자 이름 pair 는 두 판정자 셈의 칸 이름이라 쓸 수 없다",
    );
  return names;
}

// ── 확인 항목 ────────────────────────────────────────────────────

function checksMarkdown(lessons: readonly Lesson[]): string {
  const out = ["# 스스로 확인한 것(실행 기록에서 셈)", ""];
  const byArm = (arm: Arm) => lessons.filter((l) => l.meta.arm === arm);
  // 1. A 요청이 앱 조립 함수 그대로
  const aTurns = byArm("A").flatMap((l) => l.teachers.filter((t) => t.called));
  const assembled = aTurns.filter(
    (t) =>
      (t.checks as { assembledByApp?: boolean } | null)?.assembledByApp ===
      true,
  ).length;
  out.push(
    `1. A 의 턴 요청이 앱 조립 함수(buildAiRequest + talkLessonTurnSpec)를 다시 불러 만든 system · messages 와 글자 그대로 같은 차례: ${assembled}/${aTurns.length}`,
  );
  // 2. B 시스템 = A 시스템
  const firstSystem = (arm: Arm) =>
    byArm(arm)
      .flatMap((l) => l.calls.filter((c) => c.kind === "turn"))
      .map((c) => String(c.request.system));
  const aSys = new Set(firstSystem("A"));
  const bSys = new Set(firstSystem("B"));
  const sameSys =
    aSys.size === 1 && bSys.size === 1 && [...aSys][0] === [...bSys][0];
  out.push(
    `2. 시스템 프롬프트: A 의 서로 다른 시스템 ${aSys.size}개 · B ${bSys.size}개 · A 와 B 가 글자 그대로 같음: ${sameSys ? "예" : "아니요"}`,
  );
  // 3. B 의 최종 말 = 모델 말(인사 끝의 대화 첫 질문만 더함)
  const bTurns = byArm("B").flatMap((l) => l.teachers.filter((t) => t.called));
  const bAsIs = bTurns.filter(
    (t) =>
      t.childTurn === 1 || flat(t.final) === flat(t.modelFirstSpoken ?? "@@"),
  ).length;
  const bGreet = bTurns.filter((t) => t.childTurn === 1);
  const bGreetOk = bGreet.filter(
    (t) =>
      t.changes.deleted.length === 0 &&
      flat(t.final).startsWith(flat(t.modelFirstSpoken ?? "@@")),
  ).length;
  out.push(
    `3. B 의 최종 말이 모델 말 그대로(인사 끝 차례는 모델 말을 지우지 않고 앱의 대화 첫 질문 한 줄만 더함): ${bAsIs}/${bTurns.length} · 인사 끝 ${bGreetOk}/${bGreet.length}`,
  );
  // 4. C · C2 시스템에 카드 · 목표 · 낱말 목록이 없는지(단원 단어 목록 · 'Card' 이름표)
  for (const arm of ["C", "C2"] as const) {
    const sys = new Set(firstSystem(arm));
    const s = [...sys][0] ?? "";
    out.push(
      `4. ${arm} 시스템 ${sys.size}개 · 'Card'·'Required questions'·'Lesson goals' 이름표 없음: ${!/Card topic|Required questions|Lesson goals|Unit words/.test(s) ? "예" : "아니요"} · 목표 줄: ${s.includes("Today's learning goals") ? "있음" : "없음"}`,
    );
  }
  // 4-P. P 시스템이 시제품 글 그대로인지 · 상태 알림 · 기록을 고쳐 쓰지 않았는지 · 최종 말 = say
  const pLessons = byArm("P");
  if (pLessons.length > 0) {
    const pSys = new Set(firstSystem("P"));
    out.push(
      `4. P 시스템 ${pSys.size}개 · 시제품 글(arch-arm-p P_SYSTEM)과 글자 그대로 같음: ${pSys.size === 1 && [...pSys][0] === P_SYSTEM ? "예" : "아니요"}`,
    );
    let statusOk = 0;
    let statusAll = 0;
    let keptOk = 0;
    let keptAll = 0;
    let sayOk = 0;
    let sayAll = 0;
    for (const l of pLessons) {
      const turns = l.calls.filter((c) => c.kind === "turn");
      const heardBefore: string[] = [];
      let lastModel = "";
      for (const [k, c] of turns.entries()) {
        const msgs = c.request.messages as { role: string; content: string }[];
        const t = l.teachers.find((x) => x.childTurn === c.childTurn);
        const child = l.children.find((x) => x.childTurn === c.childTurn);
        if (c.childTurn > 0 && child) {
          statusAll++;
          const heard = child.action === "speak" ? (child.heard ?? "") : "";
          const status = pStatusOf({
            childTurn: c.childTurn,
            heardBefore: [...heardBefore],
            lastModelSentence: lastModel,
            action: child.action,
            heard: child.action === "speak" ? heard : null,
            unitWords: P_UNIT_WORDS,
          });
          if (
            msgs.at(-1)?.content ===
              pChildMessageOf(child.action, heard, status) &&
            t?.status === status
          )
            statusOk++;
          if (child.action === "speak") heardBefore.push(heard);
        }
        const prev = turns[k - 1];
        if (prev?.response.text !== undefined) {
          keptAll++;
          const prevMsgs = prev.request.messages as unknown[];
          const expected = JSON.stringify([
            ...prevMsgs,
            { role: "assistant", content: prev.response.text },
          ]);
          if (JSON.stringify(msgs.slice(0, -1)) === expected) keptOk++;
        }
        const first = t?.modelFirst as {
          say?: string;
          model_sentence?: string;
        } | null;
        lastModel = first?.model_sentence ?? "";
        if (t) {
          sayAll++;
          if (t.final === (first?.say ?? "@@").trim()) sayOk++;
        }
      }
    }
    out.push(
      `4. P 상태 알림이 기록(들린 글 · 앞 차례 model_sentence)으로 다시 만든 것과 같고 아이 입력 줄 + 빈 줄 + 알림 꼴인 차례: ${statusOk}/${statusAll} · 지난 메시지를 고쳐 쓰지 않음(앞 요청 messages + 앞 응답 원문 = 이번 요청의 앞부분): ${keptOk}/${keptAll} · 최종 말 = 모델 say 그대로: ${sayOk}/${sayAll}`,
    );
  }
  // 5. 호출 값이 같은지
  const sig = (c: CallLog) =>
    JSON.stringify({
      model: c.request.model,
      max_tokens: c.request.max_tokens,
      thinking: c.request.thinking,
      effort: (c.request.output_config as { effort?: unknown }).effort,
      cache_control: c.request.cache_control ?? null,
      fallbacks: c.request.fallbacks ?? null,
      betas: c.request.betas,
    });
  const sigs = new Map<string, Set<string>>();
  for (const l of lessons)
    for (const c of l.calls) {
      const k = `${l.meta.arm}/${c.kind}`;
      sigs.set(k, new Set([...(sigs.get(k) ?? []), sig(c)]));
    }
  const allSigs = new Set([...sigs.values()].flatMap((s) => [...s]));
  out.push(
    `5. 호출 값(model · max_tokens · thinking · effort · 캐시 · fallbacks · 머리글)의 서로 다른 조합 수: ${allSigs.size}(방식 · 호출 종류 ${sigs.size}가지 모두) — ${[...allSigs].join(" / ")}`,
  );
  // 6. 아이 역이 최종 영어만 받는지(마무리 단추 고르기 호출은 같은 말에 단추 안내를 붙인 꼴로 따로 센다 — 검토 rev-x1 M4)
  const six = childOnlyHeardOf(lessons);
  out.push(
    `6. 아이 역 호출의 마지막 사용자 메시지가 'Teacher: ' + 바로 앞 선생님 최종 영어({NAME}→friend)와 같은 차례: ${six.turnOk}/${six.turnAll} · 마무리 단추 고르기 호출이 같은 말 + 단추 안내(wrapChoiceMessageOf)와 같은 차례: ${six.choiceOk}/${six.choiceAll}(한국어 뜻 · 내부 값은 싣지 않음)`,
  );
  // 6-N. N 의 요청 · 최종 말
  const nLessons = byArm("N");
  if (nLessons.length > 0) {
    const nSys = new Set(firstSystem("N"));
    const leads = nLessons.flatMap((l) =>
      l.teachers.flatMap((t) => (t.lead ? [t.lead] : [])),
    );
    const asIs = leads.filter(
      (x) => x.rawSay !== null && flat(x.say) === flat(x.rawSay),
    ).length;
    const byNarrow = (x: LeadTurnLog) => Boolean(x.narrow?.retry);
    const byGate = (x: LeadTurnLog) =>
      x.gate.some(
        (g) =>
          !g.startsWith("held_") &&
          !g.startsWith("hint_") &&
          g !== "range_unread",
      );
    const narrowChanged = leads.filter(byNarrow).length;
    const gateChanged = leads.filter(byGate).length;
    const otherChanged = leads.filter(
      (x) =>
        !(x.rawSay !== null && flat(x.say) === flat(x.rawSay)) &&
        !byNarrow(x) &&
        !byGate(x),
    ).length;
    out.push(
      `6-N. N 시스템 ${nSys.size}개(수업 처음 스냅숏 · 같은 단원이면 하나) · 나간 말 칸 = 모델 say 그대로인 차례 ${asIs}/${leads.length}(바뀐 차례의 까닭: 좁은 정의 다시 말하기 ${narrowChanged} · 문장 문 안전 대사 ${gateChanged} · 그 밖 ${otherChanged}) · 1~3단계 글 빼기 차례 ${leads.filter((x) => x.removed.length > 0).length} · 마무리 상수 ${leads.filter((x) => x.closingAdded).length}`,
    );
  }
  // 7. 잡음 차례
  const groups = new Map<string, Lesson[]>();
  for (const l of lessons) {
    const k = `${l.meta.child}-s${l.meta.seed}`;
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  for (const [k, g] of groups) {
    const seed = g[0]?.meta.seed ?? 1;
    const rows = g.map(
      (l) =>
        `${l.meta.arm}: ${(NOISE_TURNS[seed] ?? [])
          .filter((t) => t <= l.meta.childTurns)
          .map((t) => {
            const c = l.children.find((x) => x.childTurn === t);
            return `${t}${c?.noise ? "(넣음)" : c?.noiseSkipped ? "(건너뜀)" : "(-)"}`;
          })
          .join(" ")}`,
    );
    out.push(`7. 잡음 차례 ${k}: ${rows.join(" · ")}`);
  }
  out.push("");
  return out.join("\n");
}

/**
 * 확인 항목 6 의 셈(검토 rev-x1 M4): 아이 역 호출마다 마지막 사용자 메시지가 바로 앞에 아이가 들은 선생님 말과 같은가. 보통 차례는
 * 'Teacher: ' + 그 말(고르기 뒤 이은 차례가 있으면 그 말), 마무리 단추 고르기 호출은 그 앞 선생님 말 + 단추 안내(wrapChoiceMessageOf)다.
 */
export function childOnlyHeardOf(lessons: readonly Lesson[]): {
  turnOk: number;
  turnAll: number;
  choiceOk: number;
  choiceAll: number;
} {
  const out = { turnOk: 0, turnAll: 0, choiceOk: 0, choiceAll: 0 };
  for (const l of lessons) {
    const choiceTurns = new Set(
      (l.meta.ending?.choices ?? []).map((c) => c.childTurn),
    );
    const seen = new Set<number>();
    for (const c of l.calls.filter((x) => x.kind === "child")) {
      const msgs = c.request.messages as { role: string; content: string }[];
      const last = msgs.at(-1)?.content ?? "";
      const beforeChoice = l.teachers
        .filter((t) => t.childTurn < c.childTurn && t.afterChoice !== true)
        .at(-1);
      // 고르기가 있었던 아이 차례의 첫 아이 역 호출이 단추 고르기다
      if (choiceTurns.has(c.childTurn) && !seen.has(c.childTurn)) {
        seen.add(c.childTurn);
        out.choiceAll++;
        if (
          beforeChoice &&
          last === wrapChoiceMessageOf(heardByChild(beforeChoice.final))
        )
          out.choiceOk++;
        continue;
      }
      out.turnAll++;
      const before =
        l.teachers.find(
          (t) => t.childTurn === c.childTurn && t.afterChoice === true,
        ) ?? beforeChoice;
      if (before && last === `Teacher: ${heardByChild(before.final)}`)
        out.turnOk++;
    }
  }
  return out;
}

// ── 예시 ─────────────────────────────────────────────────────────

function systemBlocks(arm: Arm, system: string) {
  if (arm === "N")
    return [
      {
        block:
          "N 짧은 안내문(앱 talkLeadSystem — 교사 · 좋은 가르침 · 목표 · 말 한계 · 안전 · 출력)",
        lines: system.split("\n").filter((l) => l !== "").length,
        chars: system.length,
      },
    ];
  if (arm === "P")
    return [
      {
        block:
          "P 시제품 안내문(전문 — 교사 · 좋은 가르침 · 목표 · 말 한계 · 출력)",
        lines: system.split("\n").filter((l) => l !== "").length,
        chars: system.length,
      },
    ];
  if (arm === "A" || arm === "B") {
    const [rules = "", context = ""] = system.split("\n\nContext:\n");
    return [
      {
        block: "Rules(고정부 규칙)",
        lines: rules.split("\n").filter((l) => l.startsWith("- ")).length,
        chars: rules.length,
      },
      {
        block: "Context(가변부 — 단계 · 카드 · 목표 · 낱말)",
        lines: context.split("\n").length,
        chars: context.length + "\n\nContext:\n".length,
      },
    ];
  }
  const [c, goals] = system.split("\n\nToday's learning goals");
  return [
    {
      block: "C 틀(선생님 · 단계 · 대화 방식 · 안전 · 출력)",
      lines: (c ?? "").split("\n").filter((l) => l !== "").length,
      chars: (c ?? "").length,
    },
    ...(goals === undefined
      ? []
      : [
          {
            block: "C2 목표 세 줄",
            lines: 4,
            chars: goals.length + "\n\nToday's learning goals".length,
          },
        ]),
  ];
}

function examplesOf(
  dir: string,
  lessons: readonly Lesson[],
  systemTokens: Record<string, number> | null,
): void {
  const ex = join(dir, "examples");
  mkdirSync(ex, { recursive: true });
  const md = [
    "# 실제 요청 · 응답 예시(K2 · 씨앗 1 · 아이 차례 6)",
    "",
    "전문(system · messages · 출력 규격 · 응답 원문 · 앱 후처리 · 최종 말)은 `examples/*.json` 에 둔다. 아래 표의 입력 토큰은 그 호출 응답의 usage(입력 + 캐시 읽기 + 캐시 쓰기)이고, 시스템 토큰은 count_tokens 로 시스템 프롬프트만 잰 값(사용자 메시지 한 글자를 빼서 어림)이다.",
    "",
  ];
  const pick = (arm: Arm) =>
    lessons.find(
      (l) => l.meta.arm === arm && l.meta.child === "K2" && l.meta.seed === 1,
    );
  const turnFile = (
    l: Lesson,
    childTurn: number,
    file: string,
  ): { total: number; system: string } | null => {
    const calls = l.calls.filter(
      (c) => c.childTurn === childTurn && c.kind !== "child",
    );
    const teacher = l.teachers.find((t) => t.childTurn === childTurn);
    const child = l.children.find((c) => c.childTurn === childTurn);
    if (calls.length === 0 || !teacher) return null;
    writeFileSync(
      join(ex, file),
      `${JSON.stringify(
        {
          lesson: l.name,
          childTurn,
          child: child ?? null,
          calls: calls.map((c) => ({
            kind: c.kind,
            request: {
              ...c.request,
              schema:
                (c.request.output_config as { format?: unknown }).format ??
                null,
            },
            response: c.response,
            ms: c.ms,
          })),
          postprocess: {
            modelFirst: teacher.modelFirst,
            modelFirstSpoken: teacher.modelFirstSpoken,
            directive: teacher.directive,
            checks: teacher.checks,
            retry: teacher.retry,
            changes: teacher.changes,
            branches: teacher.branches,
          },
          final: teacher.final,
        },
        null,
        2,
      )}\n`,
    );
    const first = calls[0] as CallLog;
    const u = first.response.usage;
    return {
      total: u ? u.input + u.cacheRead + u.cacheWrite : 0,
      system: String(first.request.system),
    };
  };
  md.push(
    "| 방식 | 파일 | 시스템 블록 | 줄 | 글자 | 시스템 토큰(count_tokens) | 이 호출 입력 토큰(전체) | messages 수 · 글자 | 출력 규격 글자 |",
    "|---|---|---|---|---|---|---|---|---|",
  );
  for (const arm of ARM_ORDER) {
    const l = pick(arm);
    if (!l) continue;
    const file = `${arm}-K2-s1-turn6.json`;
    const r = turnFile(l, 6, file);
    if (!r) continue;
    const call = l.calls.find((c) => c.childTurn === 6 && c.kind === "turn");
    const msgs = (call?.request.messages ?? []) as { content: string }[];
    const schemaChars = JSON.stringify(
      (call?.request.output_config as { format?: unknown } | undefined)
        ?.format ?? {},
    ).length;
    for (const [i, b] of systemBlocks(arm, r.system).entries())
      md.push(
        `| ${i === 0 ? arm : ""} | ${i === 0 ? `examples/${file}` : ""} | ${b.block} | ${b.lines} | ${b.chars} | ${i === 0 ? String(systemTokens?.[arm] ?? "-") : ""} | ${i === 0 ? r.total : ""} | ${i === 0 ? `${msgs.length} · ${msgs.reduce((a, m) => a + String(m.content).length, 0)}` : ""} | ${i === 0 ? schemaChars : ""} |`,
      );
  }
  md.push("");
  // A 에서 앱이 모델의 말을 바꾼 차례 하나 더
  const a = pick("A");
  if (a) {
    const changed =
      a.teachers.find(
        (t) =>
          t.called &&
          t.childTurn !== 6 &&
          t.branches.includes("카드의 질문으로 바꿈"),
      ) ??
      a.teachers.find(
        (t) =>
          t.called &&
          t.childTurn !== 6 &&
          flat(t.final) !== flat(t.modelFirstSpoken ?? ""),
      );
    if (changed) {
      const file = `A-K2-s1-turn${changed.childTurn}-changed.json`;
      turnFile(a, changed.childTurn, file);
      md.push(
        `## A 에서 앱이 모델의 말을 바꾼 차례: 아이 차례 ${changed.childTurn}(\`examples/${file}\`)`,
        "",
        `- 갈래: ${changed.branches.join(" · ")}`,
        "- 모델의 처음 말:",
        "",
        ...(changed.modelFirstSpoken ?? "").split("\n").map((x) => `> ${x}`),
        "",
        ...(changed.retry
          ? [
              `- 다시 쓰기(${changed.retry.kind}) 지시: ${cell(changed.retry.note)}`,
              "- 다시 쓴 말:",
              "",
              ...(changed.retry.spoken ?? "").split("\n").map((x) => `> ${x}`),
              "",
              `- 결과: ${changed.retry.outcome ?? "-"}`,
            ]
          : []),
        `- 지운 문장: ${changed.changes.deleted.map((s) => `"${s}"`).join(" · ") || "없음"}`,
        `- 더한 문장: ${changed.changes.added.map((s) => `"${s}"`).join(" · ") || "없음"}`,
        "- 아이에게 나간 최종 말:",
        "",
        ...changed.final.split("\n").map((x) => `> ${x}`),
        "",
      );
    }
  }
  // 차례 6 의 최종 말 나란히
  md.push("## 아이 차례 6 의 아이 말과 선생님 최종 말(방식별)", "");
  for (const arm of ARM_ORDER) {
    const l = pick(arm);
    const c = l?.children.find((x) => x.childTurn === 6);
    const t = l?.teachers.find((x) => x.childTurn === 6);
    if (!l || !c || !t) continue;
    md.push(
      `### ${arm}`,
      "",
      `- 아이: ${childCell(c)}`,
      `- 갈래: ${t.branches.join(" · ")}`,
      ...(t.directive && t.directive.length > 0
        ? [
            `- ${arm === "A" ? "앱이 넘긴 이번 차례의 지시" : "B 가 걷은 줄"}: ${t.directive.length}줄(첫 줄 \`${t.directive[0]}\` …)`,
          ]
        : []),
      ...(t.status !== undefined
        ? [
            "- 이 차례 사용자 메시지에 붙인 상태 알림:",
            "",
            ...t.status.split("\n").map((x) => `> ${x}`),
            "",
            `- 모델 출력의 내부 칸: reading \`${(t.modelFirst as { reading?: string }).reading ?? "-"}\` · move \`${(t.modelFirst as { move?: string }).move ?? "-"}\` · model_sentence "${(t.modelFirst as { model_sentence?: string }).model_sentence ?? ""}"`,
          ]
        : []),
      "- 최종 말:",
      "",
      ...t.final.split("\n").map((x) => `> ${x}`),
      "",
    );
  }
  writeFileSync(join(dir, "examples.md"), `${md.join("\n")}\n`);
}

async function countSystemTokens(
  lessons: readonly Lesson[],
): Promise<Record<string, number> | null> {
  const key = readApiKey();
  if (key === null) return null;
  const client = createScriptClient(key) as unknown as Anthropic;
  const out: Record<string, number> = {};
  const probe = async (system: string | undefined, model: string) =>
    (
      await client.messages.countTokens({
        model,
        ...(system !== undefined ? { system } : {}),
        messages: [{ role: "user", content: "x" }],
      })
    ).input_tokens;
  for (const arm of ARM_ORDER) {
    const call = lessons
      .find((l) => l.meta.arm === arm)
      ?.calls.find((c) => c.kind === "turn");
    if (!call) continue;
    const model = String(call.request.model);
    out[arm] =
      (await probe(String(call.request.system), model)) -
      (await probe(undefined, model));
  }
  return out;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--out");
  const dir = i >= 0 ? argv[i + 1] : undefined;
  if (!dir) {
    console.error("arch-report: --out <폴더> 가 필요하다");
    return 2;
  }
  // 판정 모음만(가려 읽기 폴더 · 대응표를 다시 만들지 않는다 — 다시 섞으면 판정과 대응표가 어긋난다)
  const judges = parseJudgesArg(argv);
  if (judges) {
    if (judgeSummaryOverwriteBlocked(join(dir, "judge-summary.json"))) {
      console.error(
        "arch-report: 이 폴더의 judge-summary.json 은 지난 모음 스크립트의 출력(표지 칸 · pair 칸 없음)이라 덮지 않는다 — 호환 시험의 기준 파일이다(검토 rev-x1 M6). 옮겨 둔 뒤 다시 부른다",
      );
      return 2;
    }
    const summary = readJudgeSummary(dir, judges);
    writeFileSync(join(dir, "judge-summary.json"), judgeSummaryJsonOf(summary));
    writeFileSync(join(dir, "judge-summary.md"), judgeSummaryMarkdown(summary));
    console.log(
      `arch-report: 판정 모음 ${judges.join(" · ")} · ${join(dir, "judge-summary.md")}`,
    );
    return 0;
  }
  const lessons = readLessons(dir);
  writeFileSync(join(dir, "checks.md"), checksMarkdown(lessons));
  if (argv.includes("--checks-only")) return 0;
  const per = lessons.map(lessonMetricsOf);
  const arms = ARM_ORDER.filter((a) =>
    lessons.some((l) => l.meta.arm === a),
  ).map((a) => armMetricsOf(a, lessons));
  const pricesSource = existsSync(
    join(process.cwd(), "seed", "model-prices.json"),
  )
    ? "seed/model-prices.json"
    : "MODEL_PRICES_FIXTURE";
  // 세 방식 같은 규칙의 '말했다' 셈: 단원 단어 · 원형 · 동음이의어는 실험 틀(앱 재료)에서 읽는다(AI 를 부르지 않음)
  const m = setupOf(process.cwd()).materials;
  const said = saidRowsOf(lessons, {
    unitWords: m.ctx.unitWords,
    lemmaOf: m.lemmaOf,
    homophones: m.homophones,
  });
  const materialsNote = materialsNoteOf(lessons);
  writeFileSync(
    join(dir, "metrics.json"),
    `${JSON.stringify(
      {
        pricesSource,
        ...(materialsNote ? { materialsNote } : {}),
        arms,
        lessons: per,
        said: {
          arms: ARM_ORDER.filter((a) => said.some((r) => r.arm === a)).map(
            (a) => saidArmOf(a, said),
          ),
          lessons: said,
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(dir, "metrics.md"),
    metricsMarkdown(arms, per, pricesSource, { materialsNote, said }),
  );
  writeFileSync(join(dir, "after-noise.md"), afterNoiseMarkdown(lessons));
  writeFileSync(
    join(dir, "after-own-topic.md"),
    afterOwnTopicMarkdown(lessons),
  );
  blindOf(dir, lessons);
  writeFileSync(join(dir, JUDGE_RUBRIC_FILE), judgeRubricOf(resolve(dir)));
  writeFileSync(join(dir, "lead.md"), leadMarkdown(lessons));
  const tokens = argv.includes("--count-tokens")
    ? await countSystemTokens(lessons)
    : null;
  if (tokens)
    writeFileSync(
      join(dir, "system-tokens.json"),
      `${JSON.stringify(tokens, null, 2)}\n`,
    );
  examplesOf(dir, lessons, tokens);
  console.log(`arch-report: 수업 ${lessons.length} · ${dir}`);
  return 0;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  void main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 2;
    },
  );
}
