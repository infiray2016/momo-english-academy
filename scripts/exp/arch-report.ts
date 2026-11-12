// 회화 구조 비교 실험(13절 C234 · task-exp-harness)의 결과 파일 만들기: <out>/runs/*.jsonl 을 읽어 확인 항목 · 수치 · 나란히 표 · 가려 읽기 ·
// 예시를 쓴다. 사용: node --env-file-if-exists=.env.local --import tsx scripts/exp/arch-report.ts --out <폴더> [--checks-only] [--count-tokens]
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
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import { createScriptClient, readApiKey } from "../ai-contract";
import {
  P_SYSTEM,
  P_UNIT_WORDS,
  pChildMessageOf,
  pStatusOf,
} from "./arch-arm-p";
import { heardByChild } from "./arch-arms";
import type {
  Arm,
  Branch,
  CallLog,
  ChildTurnLog,
  LessonLog,
  LogLine,
  TeacherTurnLog,
} from "./arch-compare";
import {
  type AskedQuestion,
  flat,
  median,
  percentile,
  questionStatsOf,
  questionsIn,
  sameQuestionsOf,
  wordCount,
} from "./arch-metrics";
import { NOISE_TURNS } from "./arch-noise";

const ARM_ORDER: readonly Arm[] = ["A", "B", "C", "C2", "P"];
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
  };
}

/** 방식 하나의 모든 수업을 한데 모은 수치(차례 단위 비율은 차례를 모아서 다시 센다). */
function armMetricsOf(arm: Arm, lessons: readonly Lesson[]) {
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
  };
}

function metricsMarkdown(
  arms: ReturnType<typeof armMetricsOf>[],
  per: LessonMetrics[],
  pricesSource: string,
): string {
  const rows = (
    title: string,
    header: string[],
    body: string[][],
  ): string[] => [
    `## ${title}`,
    "",
    `| ${header.join(" | ")} |`,
    `|${header.map(() => "---").join("|")}|`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
    "",
  ];
  return [
    "# 수치(방식별 · 수업별)",
    "",
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
      ["방식", "앞 질문과 글자가 같은 질문", "낱말 겹침 0.6 이상 쌍"],
      arms.map((m) => [
        m.arm,
        String(m.sameQuestions.exact),
        String(m.sameQuestions.similarPairs),
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

// ── 가려 읽기 ────────────────────────────────────────────────────

function blindOf(dir: string, lessons: readonly Lesson[]): void {
  const blind = join(dir, "blind");
  if (existsSync(blind)) rmSync(blind, { recursive: true });
  mkdirSync(blind, { recursive: true });
  const order = [...lessons];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j] as Lesson, order[i] as Lesson];
  }
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
      out.push(
        `- 아이가 하려던 말: ${c.action === "speak" ? `"${c.says}"` : c.action === "dont_know" ? "('잘 모르겠어요' 단추)" : "(말 없음)"}`,
      );
      if (c.action === "speak") out.push(`- 들린 글: "${c.heard ?? ""}"`);
      const t = l.teachers.find((x) => x.childTurn === c.childTurn);
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
  // 6. 아이 역이 최종 영어만 받는지
  let childOk = 0;
  let childAll = 0;
  for (const l of lessons) {
    const childCalls = l.calls.filter((c) => c.kind === "child");
    for (const c of childCalls) {
      childAll++;
      const msgs = c.request.messages as { role: string; content: string }[];
      const last = msgs.at(-1)?.content ?? "";
      const before = l.teachers.filter((t) => t.childTurn < c.childTurn).at(-1);
      if (before && last === `Teacher: ${heardByChild(before.final)}`)
        childOk++;
    }
  }
  out.push(
    `6. 아이 역 호출의 마지막 사용자 메시지가 'Teacher: ' + 바로 앞 선생님 최종 영어({NAME}→friend)와 같은 차례: ${childOk}/${childAll}(한국어 뜻 · 내부 값은 싣지 않음)`,
  );
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

// ── 예시 ─────────────────────────────────────────────────────────

function systemBlocks(arm: Arm, system: string) {
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
  writeFileSync(
    join(dir, "metrics.json"),
    `${JSON.stringify({ pricesSource, arms, lessons: per }, null, 2)}\n`,
  );
  writeFileSync(
    join(dir, "metrics.md"),
    metricsMarkdown(arms, per, pricesSource),
  );
  writeFileSync(join(dir, "after-noise.md"), afterNoiseMarkdown(lessons));
  writeFileSync(
    join(dir, "after-own-topic.md"),
    afterOwnTopicMarkdown(lessons),
  );
  blindOf(dir, lessons);
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
