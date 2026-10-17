// 관찰표 · 1-가 실시간 호출 표본 평가 명령(9절 실시간 호출 표본 평가의 1-가 몫 · 역분석 제안 5 · C21, plan-p09c 파일별 값 7).
// 사용: pnpm ai:observe [--yes] [--n <수>]
// --yes 가 없으면 계획과 예상 비용만 출력하고 부르지 않는다(종료 0). 설정값은 바꾸지 않는다(컨트롤러 13절 → P6).
// 200 아닌 응답은 8절 분류(classifyFailure)로 셋으로 센다. 400 요청 거부(same_error)는 '받지 않음'으로 적고 그 묶음을 고르지 않는다(plan 위험 11).
// 콘솔 한도 · 계정 · 404 · 413 은 '설정 · 한도 오류'로 적고 고르기에 쓰지 않으며, 콘솔 한도 · 계정이면 실행 전체가 막힌 것이라 남은 묶음을 건너뛰고
// 그때까지의 산출물을 쓴다. 5xx · 한도 아닌 429 · 응답 없음(타임아웃 · 연결)은 '일시 오류'로 횟수만 적고 다음 사례로 간다.
// 셋 모두 지연 · 위반 통계에서는 빠진다.
// 순수 함수(parseArgs · observePlan · summarize · recommendMaxTokens · chooseThinking · reportMarkdown)를 내보내고
// 네트워크 · 파일 쓰기는 직접 실행될 때만 한다. src/server 를 가져오지 않는다.
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CallSpec } from "../src/core/ai/calls/common";
import {
  speakingAnswerSpec,
  speakingPresentationSpec,
} from "../src/core/ai/calls/speaking";
import { thinkoutSpec } from "../src/core/ai/calls/thinkout";
import {
  writingCheckSpec,
  writingFeedbackSpec,
} from "../src/core/ai/calls/writing";
import { type AiPurpose, requestConfigOf } from "../src/core/ai/combo";
import {
  billedAttemptsOf,
  costOf,
  formatUsd6,
  type MessageLike,
} from "../src/core/ai/cost";
import { classifyFailure, httpFailureOf } from "../src/core/ai/failure";
import { createMasker } from "../src/core/ai/mask";
import { checkOutputFields } from "../src/core/ai/output-check";
import { buildAiRequest } from "../src/core/ai/request";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_FORBIDDEN,
  SAMPLE_NAMES,
  SPEAKING_ANSWER_VARIANTS,
  SPEAKING_PRESENTATION_VARIANTS,
  THINKOUT_VARIANTS,
  WRITING_CHECK_VARIANTS,
  WRITING_FEEDBACK_VARIANTS,
} from "../tests/fixtures/ai/sample-inputs";
import {
  type CaseRequest,
  createScriptClient,
  evaluateCall,
  loadScriptConfig,
  readApiKey,
  type ScriptConfig,
  ScriptInputError,
  sendCase,
  withFormat,
} from "./ai-contract";

/** 묶음마다 표본 수 기본값(9절 '표본 20개씩'). */
const DEFAULT_N = 20;
/** 대화형 호출 지연 p95 상한(NFR-6 · AC-N6, 정할 것 사). */
const LATENCY_P95_LIMIT_MS = 5000;
/** C21 '출력 p99 의 두 배' 와 100 단위 올림. */
const MAX_TOKENS_MULTIPLE = 2;
const MAX_TOKENS_STEP = 100;
/** 6.6 1회 입력 · 출력 토큰 가정(예상 비용용, 추측). */
const ESTIMATED_TOKENS: Record<string, { input: number; output: number }> = {
  writing_feedback: { input: 3000, output: 2000 },
  default: { input: 2500, output: 600 },
};
/** 메타 문장 목록이 없을 때의 짧은 내장 목록('추론 같은 글'). */
const BUILTIN_META = ["the child", "the student", "i should", "let me"];
const HANGUL = /[\uAC00-\uD7A3]/;
const OUT_DIR = "docs/research";
const EXIT_OK = 0;
const EXIT_INPUT = 2;

// ── 인자 ─────────────────────────────────────────────────────────

export type ObserveArgs = { yes: boolean; n: number };

export function parseArgs(
  argv: readonly string[],
): { ok: true; args: ObserveArgs } | { ok: false; error: string } {
  let yes = false;
  let n = DEFAULT_N;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--yes") yes = true;
    else if (arg === "--n") {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 1) {
        return { ok: false, error: "--n 은 1 이상 정수다" };
      }
      n = value;
    } else return { ok: false, error: `모르는 인자: ${arg}` };
  }
  return { ok: true, args: { yes, n } };
}

// ── 계획 ─────────────────────────────────────────────────────────

type AnySpec = CallSpec<never, unknown, unknown>;
type Thinking = "adaptive" | "off" | "setting";

export type ObserveGroup = {
  id: string;
  purpose: AiPurpose;
  thinking: Thinking;
  spec: AnySpec;
  inputs: readonly { level: number }[];
  n: number;
};

const masker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});

function asSpec<I, O, R>(spec: CallSpec<I, O, R>): AnySpec {
  return spec as unknown as AnySpec;
}

/** 생각 단계 둘(adaptive · off, 둘 다 effort low)과 첨삭의 설정 조합 하나로 묶음마다 n 번(값 7). */
export function observePlan(
  config: ScriptConfig,
  n: number,
): { groups: ObserveGroup[]; calls: number; expectedCostUsd: number } {
  const pair = (
    base: string,
    purpose: AiPurpose,
    spec: AnySpec,
    inputs: readonly { level: number }[],
  ): ObserveGroup[] =>
    (["adaptive", "off"] as const).map((thinking) => ({
      id: `${base}.${thinking}`,
      purpose,
      thinking,
      spec,
      inputs,
      n,
    }));
  const answers = (level: number) =>
    SPEAKING_ANSWER_VARIANTS.filter((v) => v.level === level);
  const groups: ObserveGroup[] = [
    ...pair(
      "writing_check",
      "writing_check",
      asSpec(writingCheckSpec),
      WRITING_CHECK_VARIANTS,
    ),
    ...pair(
      "speaking_eval.answer.l3",
      "speaking_eval",
      asSpec(speakingAnswerSpec),
      answers(3),
    ),
    ...pair(
      "speaking_eval.answer.l6",
      "speaking_eval",
      asSpec(speakingAnswerSpec),
      answers(6),
    ),
    ...pair(
      "speaking_eval.presentation.l9",
      "speaking_eval",
      asSpec(speakingPresentationSpec),
      SPEAKING_PRESENTATION_VARIANTS.filter((v) => v.level === 9),
    ),
    ...pair(
      "thinkout",
      "thinkout",
      asSpec(thinkoutSpec),
      THINKOUT_VARIANTS.filter((v) => v.turn === 1),
    ),
    {
      id: "writing_feedback.setting",
      purpose: "writing_feedback",
      thinking: "setting",
      spec: asSpec(writingFeedbackSpec),
      inputs: WRITING_FEEDBACK_VARIANTS,
      n,
    },
  ];
  let micros = 0;
  for (const group of groups) {
    const model = config.values[`ai.model.${group.purpose}`] as string;
    const price = config.book.get(model);
    const tokens = ESTIMATED_TOKENS[group.purpose] ?? ESTIMATED_TOKENS.default;
    if (!price || !tokens) continue;
    const perCall =
      (tokens.input * price.input4 + tokens.output * price.output4) / 10_000;
    micros += perCall * group.n;
  }
  return {
    groups,
    calls: groups.reduce((sum, g) => sum + g.n, 0),
    expectedCostUsd: Math.round(micros) / 1_000_000,
  };
}

/** 묶음의 i 번째 요청(관찰용 변형을 돌려 쓴다). 생각 단계 'off' 는 설정을 바꿔 조합 구성에 넘긴다(설정 파일은 바꾸지 않음). */
export function groupRequest(
  config: ScriptConfig,
  group: ObserveGroup,
  i: number,
): { request: CaseRequest; input: unknown; rules: unknown } {
  const input = group.inputs[i % group.inputs.length] as { level: number };
  const values =
    group.thinking === "setting"
      ? config.values
      : {
          ...config.values,
          [`ai.thinking.${group.purpose}`]: group.thinking,
          [`ai.effort.${group.purpose}`]: "low",
        };
  const reqConfig = requestConfigOf({
    purpose: group.purpose,
    level: input.level,
    values,
    book: config.book,
  });
  const rules = group.spec.rulesOf(values, input as never);
  const built = buildAiRequest(group.spec, input as never, {
    config: reqConfig,
    masker,
    rules,
  });
  return {
    request: {
      // 앱 흐름 · 계약 명령과 같이 구조화 출력 형식을 붙인다(검토 I-1)
      body: withFormat(
        built.body as unknown as Record<string, unknown>,
        built.wireSchema,
      ),
      betas: built.betas,
      timeoutMs: built.timeoutMs,
      summary: {
        model: reqConfig.model,
        max_tokens: reqConfig.maxTokens,
        thinking: reqConfig.thinking,
        effort: reqConfig.effort,
        fallbacks: reqConfig.fallbacks,
        betas: built.betas,
        title: built.title,
      },
    },
    input,
    rules,
  };
}

// ── 줄 · 요약 ────────────────────────────────────────────────────

export type ObserveLine = {
  group: string;
  purpose: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number | null;
  cacheReadTokens: number;
  stopReason: string;
  strictFirst: boolean;
  cut: number;
  checkHits: number;
  languageMismatch: number;
  metaHits: number;
  costUsd: number;
  answeredModel: string;
  requestId: string;
};

export type GroupSummary = {
  group: string;
  n: number;
  latency: { p50: number; p95: number; p99: number };
  output: { p50: number; p95: number; p99: number; max: number };
  strictRate: number;
  violations: number;
  avgCostUsd: number;
  recommendedMaxTokens: number;
  /** 400 요청 거부(same_error) 수(상태 → 횟수). 받지 않은 묶음(plan 위험 11)은 고르지 않는다. */
  rejected: Record<string, number>;
  /** 설정 · 한도 오류(콘솔 한도 · 계정 · 404 · 413 …) 수(오류 코드 → 횟수). 고르기에 쓰지 않는다(검토 N2-1). */
  configErrors: Record<string, number>;
  /** 일시 오류(5xx · 한도 아닌 429 · 응답 없음 0) 수(상태 → 횟수). 묶음을 버리지 않고 횟수만 적는다(검토 N-2). */
  transientErrors: Record<string, number>;
};

/** '받지 않음'으로 보는 요청 거부 상태(invalid_request). */
const REJECTED_STATUS = 400;
/** 응답 없이 끝난 시도(ai-contract.ts NO_RESPONSE_STATUS)의 상태 · 관찰표 글. */
const NO_RESPONSE = 0;
const NO_RESPONSE_LABEL = "응답 없음";

export type ObserveFailureKind = "rejected" | "config" | "transient";
/** 묶음 → 갈래 → (열쇠 → 횟수). */
export type ObserveErrors = Record<
  string,
  Partial<Record<ObserveFailureKind, Record<string, number>>>
>;

/**
 * 200 아닌 응답의 갈래(계약 명령과 같은 8절 분류). stop 이면 실행 전체가 막힌 것(콘솔 한도 · 계정)이라 남은 묶음을 건너뛴다.
 */
export function observeFailureOf(
  status: number,
  body: unknown,
  headers: Headers,
): { kind: ObserveFailureKind; key: string; stop: boolean } {
  if (status === NO_RESPONSE) {
    return { kind: "transient", key: String(NO_RESPONSE), stop: false };
  }
  const failure = classifyFailure(
    httpFailureOf(status, body, headers.has("retry-after")),
  );
  switch (failure.reason) {
    case "same_error":
      return status === REJECTED_STATUS
        ? { kind: "rejected", key: String(status), stop: false }
        : { kind: "config", key: failure.errorCode, stop: false };
    case "console_limit":
    case "account":
      return { kind: "config", key: failure.errorCode, stop: true };
    default:
      return { kind: "transient", key: String(status), stop: false };
  }
}

/** 가까운 순위 백분위(1 ≤ 순위 ≤ n). */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(
    sorted.length,
    Math.max(1, Math.ceil((p / 100) * sorted.length)),
  );
  return sorted[rank - 1] as number;
}

/** C21 — 출력(생각 포함) p99 의 두 배를 100 단위로 올린 값. */
export function recommendMaxTokens(p99: number): number {
  return (
    Math.ceil((MAX_TOKENS_MULTIPLE * p99) / MAX_TOKENS_STEP) * MAX_TOKENS_STEP
  );
}

/** 묶음마다 n · 지연 · 출력 백분위 · 엄격 통과율 · 규칙 위반 수 · 평균 비용 · 권하는 max_tokens. */
export function summarize(
  lines: readonly ObserveLine[],
  errors: ObserveErrors = {},
): GroupSummary[] {
  const byGroup = new Map<string, ObserveLine[]>();
  for (const line of lines) {
    const list = byGroup.get(line.group) ?? [];
    list.push(line);
    byGroup.set(line.group, list);
  }
  // 응답을 하나도 받지 못한 묶음도 요약에 남긴다(n 0)
  for (const group of Object.keys(errors)) {
    if (!byGroup.has(group)) byGroup.set(group, []);
  }
  return [...byGroup.entries()].map(([group, list]) => {
    const latency = list.map((l) => l.latencyMs);
    const output = list.map((l) => l.outputTokens);
    const p99 = percentile(output, 99);
    const n = Math.max(1, list.length);
    return {
      rejected: { ...errors[group]?.rejected },
      configErrors: { ...errors[group]?.config },
      transientErrors: { ...errors[group]?.transient },
      group,
      n: list.length,
      latency: {
        p50: percentile(latency, 50),
        p95: percentile(latency, 95),
        p99: percentile(latency, 99),
      },
      output: {
        p50: percentile(output, 50),
        p95: percentile(output, 95),
        p99,
        max: output.length === 0 ? 0 : Math.max(...output),
      },
      strictRate: list.filter((l) => l.strictFirst).length / n,
      violations: list.reduce(
        (sum, l) => sum + l.cut + l.checkHits + l.languageMismatch + l.metaHits,
        0,
      ),
      avgCostUsd: list.reduce((sum, l) => sum + l.costUsd, 0) / n,
      recommendedMaxTokens: recommendMaxTokens(p99),
    };
  });
}

/**
 * 정할 것 사의 규칙: 지연 p95 가 5초 이하인 쪽, 둘 다(또는 둘 다 아니면) 규칙 위반이 적은 쪽, 같으면 평균 비용이 낮은 쪽.
 * 그래도 같으면 adaptive.
 */
export function chooseThinking(
  adaptive: GroupSummary,
  off: GroupSummary | null,
): "adaptive" | "off" {
  if (!off) return "adaptive";
  // 받지 않은 묶음(400 — 예: 생각 끔 + 구조화 출력)은 고르지 않는다(plan 위험 11). 일시 오류는 고르기에 쓰지 않는다
  const rejectedA = Object.keys(adaptive.rejected).length > 0;
  const rejectedO = Object.keys(off.rejected).length > 0;
  if (rejectedO && !rejectedA) return "adaptive";
  if (rejectedA && !rejectedO) return "off";
  const okA = adaptive.latency.p95 <= LATENCY_P95_LIMIT_MS;
  const okO = off.latency.p95 <= LATENCY_P95_LIMIT_MS;
  if (okA !== okO) return okA ? "adaptive" : "off";
  if (adaptive.violations !== off.violations) {
    return adaptive.violations < off.violations ? "adaptive" : "off";
  }
  if (adaptive.avgCostUsd !== off.avgCostUsd) {
    return adaptive.avgCostUsd < off.avgCostUsd ? "adaptive" : "off";
  }
  return "adaptive";
}

/** '일시 오류 3회(529 1회 · 응답 없음 1회 …)' 꼴. 없으면 빈칸. */
function transientText(errors: Record<string, number>): string {
  const entries = Object.entries(errors);
  if (entries.length === 0) return "";
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const parts = entries.map(
    ([status, count]) =>
      `${Number(status) === 0 ? NO_RESPONSE_LABEL : status} ${count}회`,
  );
  return `일시 오류 ${total}회(${parts.join(" · ")})`;
}

/** '설정 · 한도 오류 2회(console_limit:400 1회 · account:401 1회)' 꼴. 없으면 빈칸. */
function configText(errors: Record<string, number>): string {
  const entries = Object.entries(errors);
  if (entries.length === 0) return "";
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const parts = entries.map(([code, count]) => `${code} ${count}회`);
  return `설정 · 한도 오류 ${total}회(${parts.join(" · ")})`;
}

/** '받지 않음(400 3회)' 꼴. 없으면 빈칸. */
function rejectedText(rejected: Record<string, number>): string {
  const parts = Object.entries(rejected).map(
    ([status, count]) => `${status} ${count}회`,
  );
  return parts.length === 0 ? "" : `받지 않음(${parts.join(" · ")})`;
}

const cells = (values: readonly (string | number)[]) =>
  `| ${values.join(" | ")} |`;

/** 관찰표 쪽 글. 머리에 'H4 첫 실호출' 표(P5a 확인 호출 줄은 빈칸 — 컨트롤러가 장부에서 옮긴다). */
export type ObserveStop = { errorCode: string; skippedGroups: number };

export function reportMarkdown({
  date,
  summaries,
  firstLine,
  stopped = null,
}: {
  date: string;
  summaries: readonly GroupSummary[];
  firstLine: ObserveLine | null;
  /** 콘솔 한도 · 계정 오류로 멈춘 때. */
  stopped?: ObserveStop | null;
}): string {
  const out: string[] = [
    `# AI 관찰표(${date}, pnpm ai:observe)`,
    "",
    "## H4 첫 실호출",
    "",
    cells(["명령", "모델", "stop_reason", "입력 토큰", "출력 토큰", "판단"]),
    cells(["---", "---", "---", "---", "---", "---"]),
    "| pnpm seed:check --probe |  |  |  |  |  |",
    firstLine
      ? cells([
          "pnpm ai:observe",
          firstLine.answeredModel,
          firstLine.stopReason,
          firstLine.inputTokens,
          firstLine.outputTokens,
          firstLine.strictFirst ? "엄격 통과" : "엄격 실패",
        ])
      : "| pnpm ai:observe |  |  |  |  |  |",
    "",
    "## 묶음",
    "",
    cells([
      "묶음",
      "n",
      "지연 p50 · p95 · p99(ms)",
      "출력 p50 · p95 · p99 · 최대",
      "엄격 통과율",
      "규칙 위반",
      "평균 비용(달러)",
      "권하는 max_tokens",
      "받지 않음",
      "설정 · 한도 오류",
      "일시 오류",
    ]),
    cells([
      "---",
      "---",
      "---",
      "---",
      "---",
      "---",
      "---",
      "---",
      "---",
      "---",
      "---",
    ]),
    ...summaries.map((s) =>
      cells([
        s.group,
        s.n,
        `${s.latency.p50} · ${s.latency.p95} · ${s.latency.p99}`,
        `${s.output.p50} · ${s.output.p95} · ${s.output.p99} · ${s.output.max}`,
        s.strictRate.toFixed(2),
        s.violations,
        s.avgCostUsd.toFixed(6),
        s.recommendedMaxTokens,
        rejectedText(s.rejected),
        configText(s.configErrors),
        transientText(s.transientErrors),
      ]),
    ),
    "",
    ...(stopped === null
      ? []
      : [
          "",
          `실행이 ${stopped.errorCode}(콘솔 한도 · 계정)로 막혀 남은 묶음 ${stopped.skippedGroups}개를 건너뛰었다. 한도 · 키를 확인한 뒤 다시 돌린다.`,
        ]),
    "",
    "## 권하는 생각 단계(정할 것 사)",
    "",
  ];
  const bases = new Set(
    summaries
      .filter((s) => s.group.endsWith(".adaptive"))
      .map((s) => s.group.slice(0, -".adaptive".length)),
  );
  for (const base of bases) {
    const a = summaries.find((s) => s.group === `${base}.adaptive`);
    const o = summaries.find((s) => s.group === `${base}.off`) ?? null;
    if (a) out.push(`- ${base}: ${chooseThinking(a, o)}`);
  }
  out.push(
    "",
    "받지 않은 쪽은 고르지 않는다(400 요청 거부 — plan-p09c 위험 11. 생각 끔 + 구조화 출력이 400 이면 회화 턴 조합은 1-나 전에 컨트롤러가 13절로 다시 정한다). 설정 · 한도 오류(콘솔 한도 · 계정 · 404 · 413 등)와 일시 오류(5xx · 한도 아닌 429 · 응답 없음)는 고르기에 쓰지 않고 횟수만 적는다.",
    "",
    "설정값은 이 명령이 바꾸지 않는다. 컨트롤러가 13절 한 줄로 정한 뒤 P6 이 settings.json 에 옮긴다.",
  );
  return `${out.join("\n")}\n`;
}

// ── 실행 ─────────────────────────────────────────────────────────

function textFields(spec: AnySpec, value: unknown) {
  return spec.checkFields(value as never);
}

export type ObserveIo = {
  config: ScriptConfig;
  createClient: () => ReturnType<typeof createScriptClient>;
  log: (line: string) => void;
  write: (path: string, text: string) => void;
  now?: () => Date;
};

/** 관찰을 돈다. --yes 가 없으면 예상 비용만. 200 이 아닌 응답 · 응답 없음은 묶음마다 세고 다음 사례로 간다. */
export async function runObserve(
  args: ObserveArgs,
  io: ObserveIo,
): Promise<number> {
  const { config } = io;
  const plan = observePlan(config, args.n);
  io.log(
    `ai-observe: 묶음 ${plan.groups.length} · 호출 ${plan.calls} · 예상 비용 약 ${plan.expectedCostUsd.toFixed(2)}달러(6.6 1회 비용 × 횟수, 추측)`,
  );
  if (!args.yes) {
    io.log("ai-observe: --yes 가 없어 부르지 않는다");
    return EXIT_OK;
  }
  const client = io.createClient();
  const lines: ObserveLine[] = [];
  const texts: unknown[] = [];
  const errors: ObserveErrors = {};
  let stopped: ObserveStop | null = null;
  const KIND_LABEL: Record<ObserveFailureKind, string> = {
    rejected: "받지 않음",
    config: "설정 · 한도 오류",
    transient: "일시 오류",
  };
  groups: for (const [index, group] of plan.groups.entries()) {
    for (let i = 0; i < group.n; i++) {
      const { request, input, rules } = groupRequest(config, group, i);
      const result = await sendCase(client, request);
      if (result.status !== 200) {
        const failure = observeFailureOf(
          result.status,
          result.body,
          result.headers,
        );
        const byKind = errors[group.id] ?? {};
        const counts = byKind[failure.kind] ?? {};
        counts[failure.key] = (counts[failure.key] ?? 0) + 1;
        byKind[failure.kind] = counts;
        errors[group.id] = byKind;
        io.log(`${group.id} · ${result.status} · ${KIND_LABEL[failure.kind]}`);
        if (failure.stop) {
          // 실행 전체가 막혔다(콘솔 한도 · 계정) — 남은 묶음을 건너뛰고 그때까지의 산출물을 쓴다
          stopped = {
            errorCode: failure.key,
            skippedGroups: plan.groups.length - index - 1,
          };
          io.log(
            `ai-observe: ${failure.key} 로 멈춘다 — 남은 묶음 ${stopped.skippedGroups}개 건너뜀`,
          );
          break groups;
        }
        continue;
      }
      const message = result.body as MessageLike & {
        usage: {
          output_tokens_details?: { thinking_tokens?: number | null } | null;
        };
      };
      const cost = costOf(
        billedAttemptsOf(message, request.summary.model),
        config.book,
      );
      const evaluated = evaluateCall(
        { spec: group.spec, input, rules },
        message,
      );
      const fields =
        evaluated.value === null ? [] : textFields(group.spec, evaluated.value);
      const hits = checkOutputFields(fields, {
        forbidden: SAMPLE_FORBIDDEN,
        sentenceMaxWords: (input as { sentenceMaxWords: number })
          .sentenceMaxWords,
      });
      const languageMismatch = fields.filter(
        (f) => f.text !== "" && (f.lang === "ko") !== HANGUL.test(f.text),
      ).length;
      const metaHits = fields.filter((f) =>
        BUILTIN_META.some((m) => f.text.toLowerCase().includes(m)),
      ).length;
      const line: ObserveLine = {
        group: group.id,
        purpose: group.purpose,
        latencyMs: result.latencyMs,
        inputTokens: cost.tokens.input,
        outputTokens: cost.tokens.output,
        thinkingTokens:
          message.usage.output_tokens_details?.thinking_tokens ?? null,
        cacheReadTokens: cost.tokens.cacheRead,
        stopReason: message.stop_reason ?? "",
        strictFirst: evaluated.verdict === "strict",
        cut: evaluated.verdict === "normalized" ? 1 : 0,
        checkHits: hits.size,
        languageMismatch,
        metaHits,
        costUsd: Number(formatUsd6(cost.costMicros)),
        answeredModel: message.model,
        requestId: result.headers.get("request-id") ?? "",
      };
      lines.push(line);
      texts.push({ ...line, fields });
      io.log(
        `${group.id} · ${line.latencyMs}ms · 입력 ${line.inputTokens} · 출력 ${line.outputTokens} · 생각 ${line.thinkingTokens ?? ""} · ${line.stopReason} · 엄격 ${line.strictFirst} · 검사 ${line.checkHits} · ${cost.costUsd}달러 · ${line.answeredModel} · ${line.requestId}`,
      );
    }
  }
  const date = (io.now?.() ?? new Date()).toISOString().slice(0, 10);
  io.write(
    join(OUT_DIR, `${date}-ai-observe.md`),
    reportMarkdown({
      date,
      summaries: summarize(lines, errors),
      firstLine: lines[0] ?? null,
      stopped,
    }),
  );
  io.write(
    join(OUT_DIR, `${date}-ai-observe.jsonl`),
    `${texts.map((t) => JSON.stringify(t)).join("\n")}\n`,
  );
  io.log(`ai-observe: ${OUT_DIR}/${date}-ai-observe.md`);
  return EXIT_OK;
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`ai-observe: ${parsed.error}`);
    return EXIT_INPUT;
  }
  try {
    return await runObserve(parsed.args, {
      config: loadScriptConfig(),
      createClient: () => {
        const key = readApiKey();
        if (key === null) {
          throw new ScriptInputError(
            "ANTHROPIC_API_KEY 가 없습니다(.env.local)",
          );
        }
        return createScriptClient(key);
      },
      log: (line) => console.log(line),
      write: (path, text) => {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text);
      },
    });
  } catch (error) {
    if (error instanceof ScriptInputError) {
      console.error(`ai-observe: ${error.message}`);
      return EXIT_INPUT;
    }
    throw error;
  }
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
  void main().then((code) => {
    process.exitCode = code;
  });
}
