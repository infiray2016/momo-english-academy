// AI 계약(수동) 명령(9절 AI 계약(수동) · C46 (3) · plan-p09c 파일별 값 6).
// 사용: pnpm ai:contract [--dry-run] [--case <id,…>]
// 종료 코드: 0 모두 기대대로, 1 하나라도 어긋남, 2 입력 · 설정 오류(모르는 인자 · 키 없음 · 규격에 어긋난 시드 파일).
// 순수 함수(parseArgs · loadScriptConfig · contractCases · recordOf · compareModelInfo · fetchModelInfo · runContract)를 내보내고
// 네트워크 · 파일 쓰기는 직접 실행될 때만 한다(P4c seed-validate 와 같은 꼴). src/server 는 server-only 라 가져오지 않는다 —
// src/core/ai(조합 · 규격 · 요청 본문 · 비용 · 분류)와 SDK 를 직접 쓴다. 키는 .env.local 에서만 읽고 출력하지 않는다.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  answerTextOf,
  type CallSpec,
  prepareAnswer,
} from "../src/core/ai/calls/common";
import {
  speakingAnswerSpec,
  speakingConfirmSpec,
  speakingPresentationSpec,
} from "../src/core/ai/calls/speaking";
import {
  type ThinkoutInput,
  thinkoutSpec,
} from "../src/core/ai/calls/thinkout";
import {
  writingCheckSpec,
  writingFeedbackSpec,
} from "../src/core/ai/calls/writing";
import {
  type AiPurpose,
  type AiRequestConfig,
  type ModelCapabilities,
  probeConfigOf,
  requestConfigOf,
  SERVER_SIDE_FALLBACK_BETA,
  STRUCTURED_OUTPUTS_BETA,
} from "../src/core/ai/combo";
import {
  billedAttemptsOf,
  costOf,
  type MessageLike,
  type PriceBook,
  priceBookOf,
  priceRowsOfSeed,
} from "../src/core/ai/cost";
import { classifyFailure, httpFailureOf } from "../src/core/ai/failure";
import { createMasker } from "../src/core/ai/mask";
import { buildAiRequest } from "../src/core/ai/request";
import {
  type ModelPrice,
  type ModelPricesFile,
  ModelPricesFileSchema,
  SettingsFileSchema,
} from "../src/core/seed/schema/reference";
import { SEED_FILES } from "../src/core/seed/structure";
import { MODEL_PRICES_FIXTURE } from "../tests/fixtures/ai/model-prices";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
  SPEAKING_CONFIRM_SAMPLE,
  speakingAnswerSample,
  speakingPresentationSample,
  THINKOUT_HISTORY,
  thinkoutSample,
  WRITING_CHECK_SAMPLE,
  WRITING_CHECK_VARIANTS,
  writingFeedbackSample,
} from "../tests/fixtures/ai/sample-inputs";
import { testSettingValues } from "../tests/fixtures/settings";

/** SDK 판(녹화 파일에 적는다, plan 위험 5). */
export const SDK_VERSION = "0.135.0";
/** SDK 기본 주소(P9a 값 7 과 같게 고정). */
const API_BASE_URL = "https://api.anthropic.com";
const SEED_DIR = "seed";
const RECORDED_DIR = "tests/fixtures/ai/recorded";
/** 녹화 파일에 남기는 응답 머리글(이 셋만 — 키 · 인증 머리글은 처음부터 담지 않는다). */
export const RECORDED_HEADERS = [
  "request-id",
  "content-type",
  "retry-after",
] as const;
/** 확인 호출의 고정 입력(6.2 확인 호출 행 · C46). */
const PROBE_INPUT = "ok";
/** 회화 턴 두 설정의 단계(구간 1-3 · 4-6 의 첫 단계). */
const TALK_LEVELS = { haiku: 1, sonnet: 4 } as const;
/** 모델 정보 대조에서 보는 effort 다섯 단계. */
const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
/** 응답 없이 끝난 시도(타임아웃 · 연결)의 상태 자리. */
export const NO_RESPONSE_STATUS = 0;
/** 종료 코드. */
const EXIT_OK = 0;
const EXIT_MISMATCH = 1;
const EXIT_INPUT = 2;

export class ScriptInputError extends Error {}

// ── 인자 ─────────────────────────────────────────────────────────

export type ContractArgs = { dryRun: boolean; cases: string[] | null };

export function parseArgs(
  argv: readonly string[],
): { ok: true; args: ContractArgs } | { ok: false; error: string } {
  let dryRun = false;
  let cases: string[] | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--case") {
      const value = argv[++i];
      if (!value) return { ok: false, error: "--case 뒤에 사례 id 가 없다" };
      cases = value.split(",").filter((c) => c !== "");
    } else return { ok: false, error: `모르는 인자: ${arg}` };
  }
  return { ok: true, args: { dryRun, cases } };
}

// ── 설정 · 단가표 ────────────────────────────────────────────────

export type ScriptConfig = {
  values: Record<string, unknown>;
  settingsSource: "seed/settings.json" | "TEST_SETTINGS";
  prices: ModelPricesFile;
  pricesSource: "seed/model-prices.json" | "MODEL_PRICES_FIXTURE";
  book: PriceBook;
  onDay: string;
};

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new ScriptInputError(`JSON 을 읽지 못했다: ${path}`);
  }
}

/**
 * seed/settings.json · seed/model-prices.json 이 있으면 그것(P4a 규격으로 검증), 없으면 TEST_SETTINGS · MODEL_PRICES_FIXTURE.
 * 단가는 실행 시각의 UTC 날짜로 priceBookOf 가 고른다(P5a 와 같은 고르기 · 같은 날짜).
 */
export function loadScriptConfig({
  root = process.cwd(),
  now = new Date(),
}: {
  root?: string;
  now?: Date;
} = {}): ScriptConfig {
  const settingsPath = join(root, SEED_DIR, SEED_FILES.settings);
  const pricesPath = join(root, SEED_DIR, SEED_FILES.modelPrices);
  let values: Record<string, unknown> = testSettingValues();
  let settingsSource: ScriptConfig["settingsSource"] = "TEST_SETTINGS";
  if (existsSync(settingsPath)) {
    const parsed = SettingsFileSchema.safeParse(readJson(settingsPath));
    if (!parsed.success) {
      throw new ScriptInputError(`규격에 어긋난 파일: ${settingsPath}`);
    }
    values = Object.fromEntries(
      parsed.data.settings.map((r) => [r.key, r.value]),
    );
    settingsSource = "seed/settings.json";
  }
  let prices: ModelPricesFile = MODEL_PRICES_FIXTURE;
  let pricesSource: ScriptConfig["pricesSource"] = "MODEL_PRICES_FIXTURE";
  if (existsSync(pricesPath)) {
    const parsed = ModelPricesFileSchema.safeParse(readJson(pricesPath));
    if (!parsed.success) {
      throw new ScriptInputError(`규격에 어긋난 파일: ${pricesPath}`);
    }
    prices = parsed.data;
    pricesSource = "seed/model-prices.json";
  }
  const onDay = now.toISOString().slice(0, 10);
  return {
    values,
    settingsSource,
    prices,
    pricesSource,
    book: priceBookOf(priceRowsOfSeed(prices), onDay),
    onDay,
  };
}

// ── 사례 ─────────────────────────────────────────────────────────

export type RequestSummary = {
  model: string;
  max_tokens: number;
  thinking: AiRequestConfig["thinking"];
  effort: string;
  fallbacks: "default" | null;
  betas: string[];
  title: string | null;
};

export type CaseRequest = {
  body: Record<string, unknown>;
  betas: string[];
  timeoutMs: number;
  summary: RequestSummary;
};

type AnySpec = CallSpec<never, unknown, unknown>;

export type ContractCase = {
  id: string;
  kind:
    | "call"
    | "thinkout"
    | "talk_config"
    | "probe"
    | "models"
    | "console-limit";
  purpose: AiPurpose | null;
  /** 기본 목록에 드는가(console-limit 은 H12 때만). */
  inDefault: boolean;
  /** 견본 입력 id(시스템 프롬프트 · 메시지는 이것으로만 적는다). */
  inputCase: string | null;
  expect: string;
  request: CaseRequest | null;
  /** 응답을 규격에 대 볼 때(call · thinkout). */
  spec?: AnySpec;
  input?: unknown;
  rules?: unknown;
};

const scriptMasker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});

/** 요청 본문에 구조화 출력 형식을 붙인다(앱 흐름 run.ts 와 같은 길). 관찰 명령도 쓴다. */
export function withFormat(
  body: Record<string, unknown>,
  schema: z.ZodType,
): Record<string, unknown> {
  const { type, schema: json } = zodOutputFormat(schema);
  const outputConfig = body.output_config as Record<string, unknown>;
  return {
    ...body,
    output_config: { ...outputConfig, format: { type, schema: json } },
  };
}

function summaryOf(
  config: AiRequestConfig,
  betas: string[],
  title: string | null,
): RequestSummary {
  return {
    model: config.model,
    max_tokens: config.maxTokens,
    thinking: config.thinking,
    effort: config.effort,
    fallbacks: config.fallbacks,
    betas,
    title,
  };
}

function callCase<I extends { level: number }, O, R>(
  id: string,
  spec: CallSpec<I, O, R>,
  input: I,
  inputCase: string,
  config: ScriptConfig,
  expect: string,
  kind: "call" | "thinkout" = "call",
): ContractCase {
  const reqConfig = requestConfigOf({
    purpose: spec.purpose,
    level: input.level,
    values: config.values,
    book: config.book,
  });
  const rules = spec.rulesOf(config.values, input);
  const built = buildAiRequest(spec, input, {
    config: reqConfig,
    masker: scriptMasker,
    rules,
  });
  return {
    id,
    kind,
    purpose: spec.purpose,
    inDefault: true,
    inputCase,
    expect,
    request: {
      body: withFormat(
        built.body as unknown as Record<string, unknown>,
        built.wireSchema,
      ),
      betas: built.betas,
      timeoutMs: built.timeoutMs,
      summary: summaryOf(reqConfig, built.betas, built.title),
    },
    spec: spec as unknown as AnySpec,
    input,
    rules,
  };
}

/** 1~3 구간 회화 턴 모델 설정 키 · Haiku 5.5(설정으로 고를 수 있는 쪽 — C112). */
const TALK_LOW_MODEL_KEY = "ai.model.talk_turn.1-3";
const HAIKU_MODEL = "claude-haiku-5-5";

/** 회화 턴 두 설정으로 보내는 작은 구조화 출력(필드 둘, 모두 필수 — 1-나 회화 턴과 같은 '생각 끔 + 구조화 출력' 조합). */
const TalkConfigSchema = z
  .object({ reply: z.string(), done: z.boolean() })
  .meta({ title: "talk_config" });

function talkConfigCase(
  which: keyof typeof TALK_LEVELS,
  config: ScriptConfig,
): ContractCase {
  const reqConfig = requestConfigOf({
    purpose: "talk_turn",
    level: TALK_LEVELS[which],
    // C112 뒤 1~3 기본도 Sonnet 이라, Haiku 사례는 1~3 구간 모델을 Haiku 로 골라 둔다(설정으로 고를 수 있는 조합의 증명)
    values:
      which === "haiku"
        ? { ...config.values, [TALK_LOW_MODEL_KEY]: HAIKU_MODEL }
        : config.values,
    book: config.book,
  });
  const betas = [...reqConfig.betas, STRUCTURED_OUTPUTS_BETA];
  const body = withFormat(
    {
      model: reqConfig.model,
      max_tokens: reqConfig.maxTokens,
      system:
        "Reply only with the JSON fields. reply is one short English sentence for a child.",
      messages: [{ role: "user", content: "Say hello." }],
      thinking: reqConfig.thinking,
      output_config: { effort: reqConfig.effort },
      ...(reqConfig.fallbacks === null
        ? {}
        : { fallbacks: reqConfig.fallbacks }),
    },
    TalkConfigSchema,
  );
  return {
    id: `talk_config.${which}`,
    kind: "talk_config",
    purpose: "talk_turn",
    inDefault: true,
    inputCase: "talk_config.hello",
    expect:
      "200(400 이 아님) — 생각 끔 + 구조화 출력을 함께 받는지 처음 증명한다(추측, plan-p05a 위험 6)",
    request: {
      body,
      betas,
      timeoutMs: reqConfig.timeoutMs,
      summary: summaryOf(reqConfig, betas, "talk_config"),
    },
  };
}

function probeCase(
  id: string,
  model: string,
  caps: ModelCapabilities,
  config: ScriptConfig,
  kind: "probe" | "console-limit",
): ContractCase {
  const reqConfig = probeConfigOf(
    model,
    caps,
    config.values["ai.max_tokens.probe"] as number,
    config.values["ai.timeout_seconds.realtime"] as number,
  );
  return {
    id,
    kind,
    purpose: "probe",
    inDefault: kind === "probe",
    inputCase: "probe.ok",
    expect:
      kind === "probe"
        ? "200 · stop_reason max_tokens(9절 'max_tokens 로 끝난 확인 호출 표본')"
        : "400 또는 429 · 8절 분류 console_limit(H12 때만)",
    request: {
      body: {
        model: reqConfig.model,
        max_tokens: reqConfig.maxTokens,
        thinking: reqConfig.thinking,
        output_config: { effort: reqConfig.effort },
        messages: [{ role: "user", content: PROBE_INPUT }],
      },
      betas: [],
      timeoutMs: reqConfig.timeoutMs,
      summary: summaryOf(reqConfig, [], null),
    },
  };
}

function capsOf(config: ScriptConfig, model: string): ModelCapabilities {
  const entry = config.book.get(model);
  if (!entry) throw new ScriptInputError(`단가표에 없는 모델: ${model}`);
  return entry.caps;
}

/** 9절 AI 계약(수동) 사례 표 전부(plan-p09c 값 6 표). */
export function contractCases(config: ScriptConfig): ContractCase[] {
  const strict =
    "200 · end_turn · 엄격 통과(아니면 '정규화로 통과'로 적고 실패로 보지 않음)";
  const level5 =
    WRITING_CHECK_VARIANTS.find((v) => v.level === 5) ?? WRITING_CHECK_SAMPLE;
  const haiku = "claude-haiku-5-5";
  const sonnet = "claude-sonnet-5-5";
  const opus = "claude-opus-5-5";
  return [
    callCase(
      "writing_check.l4",
      writingCheckSpec,
      WRITING_CHECK_SAMPLE,
      "WRITING_CHECK_SAMPLE",
      config,
      strict,
    ),
    callCase(
      "writing_check.l5",
      writingCheckSpec,
      level5,
      "WRITING_CHECK_VARIANTS[level 5]",
      config,
      strict,
    ),
    callCase(
      "writing_feedback.l6",
      writingFeedbackSpec,
      writingFeedbackSample(6),
      "writingFeedbackSample(6)",
      config,
      strict,
    ),
    callCase(
      "writing_feedback.l10",
      writingFeedbackSpec,
      writingFeedbackSample(10),
      "writingFeedbackSample(10)",
      config,
      strict,
    ),
    callCase(
      "speaking_eval.answer.l3",
      speakingAnswerSpec,
      speakingAnswerSample(3),
      "speakingAnswerSample(3)",
      config,
      `${strict}. 문법 지적은 정규화 뒤 0`,
    ),
    callCase(
      "speaking_eval.answer.l6",
      speakingAnswerSpec,
      speakingAnswerSample(6),
      "speakingAnswerSample(6)",
      config,
      strict,
    ),
    callCase(
      "speaking_eval.presentation.l9",
      speakingPresentationSpec,
      speakingPresentationSample(9),
      "speakingPresentationSample(9)",
      config,
      strict,
    ),
    callCase(
      "speaking_eval.confirm.l9",
      speakingConfirmSpec,
      SPEAKING_CONFIRM_SAMPLE,
      "SPEAKING_CONFIRM_SAMPLE",
      config,
      strict,
    ),
    callCase(
      "thinkout.l6",
      thinkoutSpec,
      thinkoutSample(1),
      "thinkoutSample(1..N) + THINKOUT_HISTORY 답",
      config,
      `턴마다 ${strict} · 마지막 턴 done`,
      "thinkout",
    ),
    talkConfigCase("haiku", config),
    talkConfigCase("sonnet", config),
    probeCase("probe.haiku", haiku, capsOf(config, haiku), config, "probe"),
    probeCase("probe.sonnet", sonnet, capsOf(config, sonnet), config, "probe"),
    probeCase("probe.opus", opus, capsOf(config, opus), config, "probe"),
    {
      id: "models",
      kind: "models",
      purpose: null,
      inDefault: true,
      inputCase: null,
      expect:
        "생각 형 · effort · 구조화 출력 · 대체 모델 목록 · 수명이 단가표 · 설정과 맞음",
      request: null,
    },
    probeCase(
      "console-limit",
      haiku,
      capsOf(config, haiku),
      config,
      "console-limit",
    ),
  ];
}

// ── 녹화 ─────────────────────────────────────────────────────────

export type RecordedSample = {
  case: string;
  source: "recorded";
  recordedOn: string;
  sdk: string;
  inputCase: string | null;
  purpose: AiPurpose | null;
  title: string | null;
  request: RequestSummary | null;
  response: {
    status: number;
    headers: Partial<Record<(typeof RECORDED_HEADERS)[number], string>>;
    body: unknown;
  };
};

/** 녹화 파일 한 벌. 머리글은 RECORDED_HEADERS 셋만, 시스템 프롬프트 · 메시지는 견본 입력 id 로만 적는다. */
export function recordOf({
  testCase,
  response,
  recordedOn,
}: {
  testCase: ContractCase | undefined;
  response: { status: number; headers: Headers; body: unknown };
  recordedOn: string;
}): RecordedSample {
  const headers: RecordedSample["response"]["headers"] = {};
  for (const name of RECORDED_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null) headers[name] = value;
  }
  return {
    case: testCase?.id ?? "unknown",
    source: "recorded",
    recordedOn,
    sdk: SDK_VERSION,
    inputCase: testCase?.inputCase ?? null,
    purpose: testCase?.purpose ?? null,
    title: testCase?.request?.summary.title ?? null,
    request: testCase?.request?.summary ?? null,
    response: { status: response.status, headers, body: response.body },
  };
}

// ── 모델 정보 대조 ───────────────────────────────────────────────

type Support = { supported: boolean } | null | undefined;
export type ModelInfoLike = {
  id: string;
  lifecycle?: "active" | "deprecated" | "retired";
  retires_at?: string | null;
  allowed_fallback_models: string[] | null;
  capabilities: {
    structured_outputs?: Support;
    effort?: { supported: boolean } & Partial<
      Record<(typeof EFFORT_LEVELS)[number], Support>
    >;
    thinking?: {
      supported: boolean;
      types: Partial<
        Record<"adaptive" | "between_tools" | "disabled" | "enabled", Support>
      >;
    };
  } | null;
};

export type ModelRetrieve = (
  id: string,
  params: { betas?: string[] },
) => Promise<ModelInfoLike>;

/**
 * 모델 정보를 묻는다. 먼저 betas 없이, allowed_fallback_models 가 null 이면 server-side-fallback 머리글로 한 번 더.
 * 어느 베타 값이 그 칸을 채우는지는 설치판 · 문서에 없다(추측, P9a 확인한 사실 11).
 */
export async function fetchModelInfo(
  retrieve: ModelRetrieve,
  id: string,
): Promise<{ info: ModelInfoLike; fallbackListKnown: boolean }> {
  const first = await retrieve(id, {});
  if (first.allowed_fallback_models !== null) {
    return { info: first, fallbackListKnown: true };
  }
  const second = await retrieve(id, { betas: [SERVER_SIDE_FALLBACK_BETA] });
  return {
    info: second,
    fallbackListKnown: second.allowed_fallback_models !== null,
  };
}

export type ModelMismatch = { field: string; detail: string };

const supported = (s: Support) => s?.supported === true;

/** 단가표 줄(조합 칸) · 설정과 모델 정보를 대 본다. 어긋난 칸과 고칠 곳(P6 의 model-prices.json)을 짚는다. */
export function compareModelInfo(
  entry: ModelPrice,
  info: ModelInfoLike,
  { book, inSettings }: { book: PriceBook; inSettings: boolean },
): { mismatches: ModelMismatch[]; notes: string[] } {
  const mismatches: ModelMismatch[] = [];
  const notes: string[] = [];
  const caps = info.capabilities;
  const types = caps?.thinking?.types ?? {};
  const between = supported(types.between_tools);
  const disabled = supported(types.disabled);
  const thinkingOk =
    entry.thinkingOff === "between_tools"
      ? between
      : entry.thinkingOff === "disabled"
        ? disabled
        : !between && !disabled;
  if (!thinkingOk) {
    mismatches.push({
      field: "thinking",
      detail: `thinkingOff ${entry.thinkingOff} 와 모델의 생각 형(between_tools ${between} · disabled ${disabled})이 다르다`,
    });
  }
  const missingEffort = EFFORT_LEVELS.filter(
    (level) => !supported(caps?.effort?.[level]),
  );
  if (missingEffort.length > 0) {
    mismatches.push({
      field: "effort",
      detail: `effort 를 받지 않는 단계: ${missingEffort.join(", ")}`,
    });
  }
  if (entry.fallbackOnly !== true && !supported(caps?.structured_outputs)) {
    mismatches.push({
      field: "structured_outputs",
      detail: "구조화 출력을 받지 않는다",
    });
  }
  const list = info.allowed_fallback_models;
  if (list === null) {
    notes.push(`${entry.model}: 대체 모델 목록 확인 못 함(두 번 다 null)`);
  } else {
    const unknown = list.filter((m) => !book.has(m));
    if (unknown.length > 0) {
      mismatches.push({
        field: "allowed_fallback_models",
        detail: `단가표에 없는 대체 모델(그 모델이 답하면 '단가 없음'): ${unknown.join(", ")}`,
      });
    }
    if (entry.serverFallback !== list.length > 0) {
      mismatches.push({
        field: "serverFallback",
        detail: `serverFallback ${entry.serverFallback} 와 대체 모델 목록(${list.length}개)이 다르다`,
      });
    }
  }
  if (
    inSettings &&
    info.lifecycle !== undefined &&
    info.lifecycle !== "active"
  ) {
    mismatches.push({
      field: "lifecycle",
      detail: `설정의 모델이 ${info.lifecycle}(retires_at ${info.retires_at ?? "없음"}, C17 모델 은퇴)`,
    });
  }
  return { mismatches, notes };
}

// ── 실행 ─────────────────────────────────────────────────────────

type ClientLike = Anthropic;

export type ContractIo = {
  config: ScriptConfig;
  createClient: () => ClientLike;
  log: (line: string) => void;
  write: (path: string, text: string) => void;
  now?: () => Date;
};

function describeRequest(c: ContractCase): string {
  if (!c.request) return `${c.id} · ${c.kind} · 기대: ${c.expect}`;
  const s = c.request.summary;
  return `${c.id} · ${s.model} · max_tokens ${s.max_tokens} · thinking ${s.thinking.type} · effort ${s.effort} · fallbacks ${s.fallbacks ?? "없음"} · betas [${s.betas.join(", ")}] · 제목 ${s.title ?? "없음"} · 기대: ${c.expect}`;
}

type SendResult = {
  status: number;
  headers: Headers;
  body: unknown;
  latencyMs: number;
};

/** 시도 하나(베타 create, 비스트리밍, maxRetries 0). 상태 · 머리글 · 본문을 돌려준다. */
export async function sendCase(
  client: ClientLike,
  request: CaseRequest,
): Promise<SendResult> {
  const started = Date.now();
  try {
    const { data, response } = await client.beta.messages
      .create(
        {
          ...request.body,
          ...(request.betas.length > 0 ? { betas: request.betas } : {}),
          stream: false,
        } as never,
        { timeout: request.timeoutMs },
      )
      .withResponse();
    return {
      status: response.status,
      headers: response.headers,
      body: data,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    if (error instanceof APIError && typeof error.status === "number") {
      return {
        status: error.status,
        headers: error.headers ?? new Headers(),
        body: error.error,
        latencyMs: Date.now() - started,
      };
    }
    // 응답 없는 오류(타임아웃 · 연결 — 상태가 없는 APIError)는 던지지 않고 status 0 실패로 돌려준다.
    // 오류 이름만 남기고 메시지 · 요청 내용은 담지 않는다(검토 review-p09c-2 범위 밖 관찰 2)
    if (error instanceof APIError) {
      return {
        status: NO_RESPONSE_STATUS,
        headers: new Headers(),
        body: { type: "error", error: { type: error.constructor.name } },
        latencyMs: Date.now() - started,
      };
    }
    throw error;
  }
}

/** 응답을 규격에 대 본다: strict | normalized | invalid. */
export function evaluateCall(
  testCase: Pick<ContractCase, "spec" | "input" | "rules">,
  body: unknown,
): { verdict: "strict" | "normalized" | "invalid"; value: unknown } {
  const spec = testCase.spec;
  if (!spec) return { verdict: "invalid", value: null };
  const message = body as MessageLike & {
    content: { type: string; text?: string }[];
  };
  let prepared: unknown;
  try {
    prepared = prepareAnswer(JSON.parse(answerTextOf(message)), spec.enumPaths);
  } catch {
    return { verdict: "invalid", value: null };
  }
  const input = testCase.input as never;
  const rules = testCase.rules as never;
  const wire = spec.wireSchema(input, rules).safeParse(prepared);
  if (
    message.stop_reason === "end_turn" &&
    wire.success &&
    spec.validate(wire.data, input, rules).length === 0
  ) {
    return {
      verdict: "strict",
      value: spec.normalize(wire.data, input, rules),
    };
  }
  const value = spec.normalize(prepared, input, rules);
  return { verdict: value === null ? "invalid" : "normalized", value };
}

function lineOf(
  id: string,
  result: SendResult,
  extra: string,
  book: PriceBook,
): string {
  const body = result.body as Partial<MessageLike> & { _request_id?: string };
  const requestId = result.headers.get("request-id") ?? "";
  if (result.status !== 200 || !body.usage) {
    return `${id} · ${result.status} · ${extra} · ${result.latencyMs}ms · ${requestId}`;
  }
  const message = body as MessageLike;
  const cost = costOf(billedAttemptsOf(message, message.model), book);
  return `${id} · ${result.status} · ${message.stop_reason} · ${extra} · ${result.latencyMs}ms · 입력 ${cost.tokens.input} · 출력 ${cost.tokens.output} · ${cost.costUsd}달러 · ${requestId}`;
}

/** 사례를 고르고 돌린다. dry-run 은 사례 목록과 요청 꼴만 출력하고 네트워크 · 파일 쓰기를 하지 않는다. */
export async function runContract(
  args: ContractArgs,
  io: ContractIo,
): Promise<number> {
  const all = contractCases(io.config);
  const chosen =
    args.cases === null
      ? all.filter((c) => c.inDefault)
      : args.cases.map((id) => {
          const found = all.find((c) => c.id === id);
          if (!found) throw new ScriptInputError(`모르는 사례: ${id}`);
          return found;
        });
  io.log(
    `ai-contract: 설정 ${io.config.settingsSource} · 단가표 ${io.config.pricesSource}(${io.config.onDay}) · 사례 ${chosen.length}`,
  );
  if (args.dryRun) {
    for (const c of chosen) io.log(describeRequest(c));
    return EXIT_OK;
  }
  const client = io.createClient();
  const recordedOn = (io.now?.() ?? new Date()).toISOString().slice(0, 10);
  let mismatched = 0;
  const save = (c: ContractCase, result: SendResult, suffix = "") =>
    io.write(
      join(RECORDED_DIR, `${c.id}${suffix}.json`),
      `${JSON.stringify(recordOf({ testCase: c, response: result, recordedOn }), null, 2)}\n`,
    );

  for (const c of chosen) {
    if (c.kind === "models") {
      const settingModels = new Set(
        Object.entries(io.config.values)
          .filter(([key]) => key.startsWith("ai.model."))
          .map(([, value]) => String(value)),
      );
      for (const entry of io.config.prices.models) {
        const { info } = await fetchModelInfo(
          (id, params) =>
            client.beta.models.retrieve(
              id,
              params,
            ) as unknown as Promise<ModelInfoLike>,
          entry.model,
        );
        const { mismatches, notes } = compareModelInfo(entry, info, {
          book: io.config.book,
          inSettings: settingModels.has(entry.model),
        });
        for (const note of notes) io.log(`models · ${note}`);
        for (const m of mismatches) {
          io.log(
            `models · ${entry.model} · 어긋남 ${m.field}: ${m.detail} → P6 seed/model-prices.json`,
          );
        }
        if (mismatches.length > 0) mismatched += 1;
      }
      continue;
    }
    if (!c.request) continue;
    if (c.kind === "thinkout") {
      const maxTurns = io.config.values["writing.thinkout_max_turns"] as number;
      let history: ThinkoutInput["history"] = [];
      for (let turn = 1; turn <= maxTurns; turn++) {
        const turnCase =
          turn === 1
            ? c
            : callCase(
                c.id,
                thinkoutSpec,
                thinkoutSample(turn, { history }),
                c.inputCase ?? "",
                io.config,
                c.expect,
                "thinkout",
              );
        const result = await sendCase(client, turnCase.request as CaseRequest);
        save(turnCase, result, `.turn${turn}`);
        const { verdict, value } =
          result.status === 200
            ? evaluateCall(turnCase, result.body)
            : { verdict: "invalid" as const, value: null };
        const done = (value as { done?: boolean } | null)?.done === true;
        // done 이면 그 턴을 마지막으로 보고 멈춘다(앱도 done 에서 멈춘다, 6.2 '종료 여부' · 검토 M-5)
        const ok = verdict !== "invalid" && (turn < maxTurns || done);
        io.log(
          lineOf(
            `${c.id}.turn${turn}`,
            result,
            `${verdict}${turn === maxTurns ? ` · done ${done}` : ""}`,
            io.config.book,
          ),
        );
        if (!ok) {
          mismatched += 1;
          break;
        }
        if (done) break;
        const entry =
          value === null
            ? ""
            : (thinkoutSpec.historyEntry?.(value as never) ?? "");
        history = [
          ...history,
          {
            assistant: entry,
            answer: THINKOUT_HISTORY[turn - 1]?.answer ?? "몰라요",
          },
        ];
      }
      continue;
    }
    const result = await sendCase(client, c.request);
    save(c, result);
    let ok: boolean;
    let extra: string;
    if (c.kind === "call") {
      const { verdict } =
        result.status === 200
          ? evaluateCall(c, result.body)
          : { verdict: "invalid" as const };
      ok = verdict !== "invalid";
      extra = verdict === "normalized" ? "정규화로 통과" : verdict;
    } else if (c.kind === "talk_config") {
      ok = result.status === 200;
      extra = ok ? "생각 끔 + 구조화 출력 받음" : "받지 않음";
    } else if (c.kind === "probe") {
      const stop = (result.body as { stop_reason?: string }).stop_reason;
      ok = result.status === 200 && stop === "max_tokens";
      extra = `확인 호출 ${stop ?? ""}`;
    } else {
      const failure = classifyFailure(
        httpFailureOf(
          result.status,
          result.body,
          result.headers.has("retry-after"),
        ),
      );
      ok =
        (result.status === 400 || result.status === 429) &&
        failure.reason === "console_limit";
      const message =
        (result.body as { error?: { message?: string } }).error?.message ?? "";
      extra = `분류 ${failure.reason} · 메시지 '${message}'`;
    }
    io.log(
      lineOf(c.id, result, `${extra}${ok ? "" : " · 어긋남"}`, io.config.book),
    );
    if (!ok) mismatched += 1;
  }
  io.log(`ai-contract: 어긋남 ${mismatched}`);
  return mismatched === 0 ? EXIT_OK : EXIT_MISMATCH;
}

/** 스크립트 클라이언트(P9a 값 7 과 같은 선택: 키만 · authToken null · 기본 주소 · maxRetries 0 · logLevel warn · OpenTelemetry 끔). */
export function createScriptClient(apiKey: string): ClientLike {
  return new Anthropic({
    apiKey,
    authToken: null,
    baseURL: API_BASE_URL,
    maxRetries: 0,
    logLevel: "warn",
    openTelemetry: { traces: false, propagation: false },
  });
}

/** .env.local 이 있으면 읽고 키가 있는지만 본다(값을 출력하지 않는다). */
export function readApiKey(): string | null {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? key : null;
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`ai-contract: ${parsed.error}`);
    return EXIT_INPUT;
  }
  try {
    const config = loadScriptConfig();
    const key = parsed.args.dryRun ? null : readApiKey();
    if (!parsed.args.dryRun && key === null) {
      console.error("ai-contract: ANTHROPIC_API_KEY 가 없습니다(.env.local)");
      return EXIT_INPUT;
    }
    return await runContract(parsed.args, {
      config,
      createClient: () => createScriptClient(key as string),
      log: (line) => console.log(line),
      write: (path, text) => {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text);
      },
    });
  } catch (error) {
    if (error instanceof ScriptInputError) {
      console.error(`ai-contract: ${error.message}`);
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
