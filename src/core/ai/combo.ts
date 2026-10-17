// AI 호출 조합 · 요청 구성(6.1 공통 규칙 · 조합 표 · 12절 ai.* · C21 · AC-8i, plan-p09a 파일별 값 4).
// 호출 목적 · 설정 키 · 조합 칸 규격 · 조합 검사 · '끔' 변환 · 요청 구성 · 확인 호출 구성.
// 현재 시각 · DB · SDK · Next 를 가져오지 않는 순수 모듈이다(의존 규칙 core-no-framework · sdk-only-in-ai).
import { z } from "zod";
import { ModelPriceSchema } from "@/core/seed/schema/reference";
import {
  BAND_NAMES,
  bandOf,
  EFFORTS,
  type Effort,
} from "@/core/seed/structure";

/** 호출 목적(5절 ai_calls.purpose, DB 열거형 ai_purpose 와 같은 값 · 차례). */
export const AI_PURPOSES = [
  "writing_feedback",
  "writing_check",
  "speaking_eval",
  "thinkout",
  "talk_turn",
  "talk_closing",
  "probe",
] as const;
export type AiPurpose = (typeof AI_PURPOSES)[number];

/** 아이가 기다리는 대화형 호출. 첫 바이트 전 연결 오류에만 1회 다시 보낸다(6.1 · 8절, P9c). */
export const REALTIME_PURPOSES = [
  "writing_check",
  "speaking_eval",
  "thinkout",
  "talk_turn",
] as const satisfies readonly AiPurpose[];

/** 12절 ai.thinking 의 저장 값('끔' · '적응', plan-p06a 정할 것 마). */
export const THINKING_SETTINGS = ["off", "adaptive"] as const;
export type ThinkingSetting = (typeof THINKING_SETTINGS)[number];

/** 서버 측 대체 모델 재시도 머리글(6.1 · 확인한 사실 2). */
export const SERVER_SIDE_FALLBACK_BETA = "server-side-fallback-2026-07-01";
/** 구조화 출력 머리글. SDK 의 beta.messages.parse 가 붙이는 값을 따른다(정할 것 라 · 위험 1 · 확인한 사실 3). */
export const STRUCTURED_OUTPUTS_BETA = "structured-outputs-2025-12-15";

/** 초 → 밀리초(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;
/** 확인 호출의 effort — 가장 가벼운 값(6.1 표 확인 호출 행 'low'). */
const PROBE_EFFORT: Effort = EFFORTS[0];
/** 조합 검사를 하는 호출 목적(회화 턴은 구간마다 따로, 끝맺음 턴은 회화 턴 값을 쓴다 — 12절). */
const SINGLE_COMBO_PURPOSES = [
  "writing_feedback",
  "writing_check",
  "speaking_eval",
  "thinkout",
] as const satisfies readonly AiPurpose[];
/** 회화 턴의 구간 키 접두(12절 `talk_turn.<구간>`). */
const TALK_TURN_KEY = "talk_turn";
/** feedback 타임아웃을 쓰는 호출(6.1 표: 첨삭 · 끝맺음 턴). */
const FEEDBACK_TIMEOUT_PURPOSES: readonly AiPurpose[] = [
  "writing_feedback",
  "talk_closing",
];

// ── 조합 칸 ──────────────────────────────────────────────────────

/** model_prices.capabilities jsonb 의 꼴(P7 적재가 capabilitiesOf 로 채운다, 5절 · 6.1 조합 표). */
export const ModelCapabilitiesSchema = ModelPriceSchema.pick({
  thinkingDefault: true,
  thinkingOff: true,
  thinkingOffEfforts: true,
  effortDefault: true,
  serverFallback: true,
  fallbackOnly: true,
});
export type ModelCapabilities = z.infer<typeof ModelCapabilitiesSchema>;

/** 단가표 줄(시드 규격)에서 조합 칸만. */
export function capabilitiesOf(
  entry: z.input<typeof ModelPriceSchema> | ModelCapabilities,
): ModelCapabilities {
  const caps: ModelCapabilities = {
    thinkingDefault: entry.thinkingDefault,
    thinkingOff: entry.thinkingOff,
    thinkingOffEfforts: [...entry.thinkingOffEfforts],
    effortDefault: entry.effortDefault,
    serverFallback: entry.serverFallback,
  };
  if (entry.fallbackOnly !== undefined) caps.fallbackOnly = entry.fallbackOnly;
  return caps;
}

/** 조합 검사가 보는 책. 값 5 의 PriceBook 이 이 꼴을 넓힌다. */
export type ComboBook = ReadonlyMap<string, { caps: ModelCapabilities }>;

// ── 설정 키 ──────────────────────────────────────────────────────

export type AiSettingKeys = {
  model: string;
  effort: string;
  thinking: string;
  maxTokens: string;
  timeout: string;
};

function isTalkPurpose(purpose: AiPurpose): boolean {
  return purpose === "talk_turn" || purpose === "talk_closing";
}

/** 모델 · effort · 생각 단계 키의 뒷부분. 회화 턴 · 끝맺음 턴은 `talk_turn.<구간>`(12절). */
function comboKeyBaseOf(purpose: AiPurpose, level?: number): string {
  if (purpose === "probe") {
    throw new RangeError(
      "확인 호출은 ai.model · ai.effort · ai.thinking 키를 쓰지 않는다(probeConfigOf)",
    );
  }
  if (!isTalkPurpose(purpose)) return purpose;
  if (level === undefined) {
    throw new RangeError(`${purpose} 는 단계가 있어야 구간 키를 안다`);
  }
  return `${TALK_TURN_KEY}.${bandOf(level)}`;
}

/** 호출 목적(회화는 단계)의 설정 키 다섯(6.1 · 12절 · C21). 확인 호출은 던진다. */
export function settingKeysOf(
  purpose: AiPurpose,
  level?: number,
): AiSettingKeys {
  const base = comboKeyBaseOf(purpose, level);
  return {
    model: `ai.model.${base}`,
    effort: `ai.effort.${base}`,
    thinking: `ai.thinking.${base}`,
    maxTokens: `ai.max_tokens.${purpose}`,
    timeout: FEEDBACK_TIMEOUT_PURPOSES.includes(purpose)
      ? "ai.timeout_seconds.feedback"
      : "ai.timeout_seconds.realtime",
  };
}

const ModelSettingSchema = z.string().min(1);
const EffortSettingSchema = z.enum(EFFORTS);
const ThinkingSettingSchema = z.enum(THINKING_SETTINGS);
const MaxTokensSettingSchema = z.int().min(1);
const TimeoutSettingSchema = z.number().positive();

/** 키마다 Zod 규격. P3a getSettings 에 그대로 넘긴다(12절). */
export function aiSettingSchemasOf(
  purpose: AiPurpose,
  level?: number,
): Record<string, z.ZodType> {
  const keys = settingKeysOf(purpose, level);
  return {
    [keys.model]: ModelSettingSchema,
    [keys.effort]: EffortSettingSchema,
    [keys.thinking]: ThinkingSettingSchema,
    [keys.maxTokens]: MaxTokensSettingSchema,
    [keys.timeout]: TimeoutSettingSchema,
  };
}

// ── 조합 검사 ────────────────────────────────────────────────────

export type ComboReason =
  | "unknown-model"
  | "thinking-off-unsupported"
  | "effort-not-allowed-with-off";
export type Combo = {
  model: string;
  effort: Effort;
  thinking: ThinkingSetting;
};
export type ComboCheck = { ok: true } | { ok: false; reasons: ComboReason[] };

/** 6.1 '받지 않는 조합은 저장하지 않는다'(AC-8i). */
export function checkCombo(combo: Combo, book: ComboBook): ComboCheck {
  const caps = book.get(combo.model)?.caps;
  if (!caps || caps.fallbackOnly === true) {
    return { ok: false, reasons: ["unknown-model"] };
  }
  const reasons: ComboReason[] = [];
  if (combo.thinking === "off") {
    if (caps.thinkingOff === null) {
      reasons.push("thinking-off-unsupported");
    } else if (!caps.thinkingOffEfforts.includes(combo.effort)) {
      reasons.push("effort-not-allowed-with-off");
    }
  }
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

export type SettingsComboViolation = {
  keyBase: string;
  reasons: (ComboReason | "invalid-setting")[];
};

const ComboSettingSchema = z.object({
  model: ModelSettingSchema,
  effort: EffortSettingSchema,
  thinking: ThinkingSettingSchema,
});

/**
 * 호출 목적 넷과 회화 턴 구간 넷의 조합을 모두 본다(P7 설정값 시드 적재 · 2차 고급 화면, AC-8i).
 * 값이 없거나 꼴이 틀리면 'invalid-setting'.
 */
export function checkSettingsCombos(
  values: Readonly<Record<string, unknown>>,
  book: ComboBook,
): SettingsComboViolation[] {
  const keyBases = [
    ...SINGLE_COMBO_PURPOSES,
    ...BAND_NAMES.map((band) => `${TALK_TURN_KEY}.${band}`),
  ];
  const violations: SettingsComboViolation[] = [];
  for (const keyBase of keyBases) {
    const parsed = ComboSettingSchema.safeParse({
      model: values[`ai.model.${keyBase}`],
      effort: values[`ai.effort.${keyBase}`],
      thinking: values[`ai.thinking.${keyBase}`],
    });
    if (!parsed.success) {
      violations.push({ keyBase, reasons: ["invalid-setting"] });
      continue;
    }
    const check = checkCombo(parsed.data, book);
    if (!check.ok) violations.push({ keyBase, reasons: check.reasons });
  }
  return violations;
}

// ── 요청 구성 ────────────────────────────────────────────────────

export type ThinkingParam =
  | { type: "adaptive" }
  | { type: "between_tools" }
  | { type: "disabled" };

/** '끔'은 모델마다 다른 값으로 보낸다. 끌 수 없는 모델(Opus 5.5)은 adaptive(6.1). */
export function thinkingParamOf(
  thinking: ThinkingSetting,
  caps: ModelCapabilities,
): ThinkingParam {
  if (thinking === "off" && caps.thinkingOff !== null) {
    return { type: caps.thinkingOff };
  }
  return { type: "adaptive" };
}

export type AiRequestConfig = {
  purpose: AiPurpose;
  model: string;
  effort: Effort;
  thinking: ThinkingParam;
  maxTokens: number;
  timeoutMs: number;
  fallbacks: "default" | null;
  betas: string[];
};

export class ComboError extends Error {
  constructor(
    readonly purpose: AiPurpose,
    readonly model: string,
    readonly reasons: readonly ComboReason[],
  ) {
    super(`${purpose} 의 조합을 받지 않는다(${model}: ${reasons.join(", ")})`);
    this.name = "ComboError";
  }
}

function fallbackOf(caps: ModelCapabilities): {
  fallbacks: "default" | null;
  betas: string[];
} {
  return caps.serverFallback
    ? { fallbacks: "default", betas: [SERVER_SIDE_FALLBACK_BETA] }
    : { fallbacks: null, betas: [] };
}

/**
 * 설정값과 단가표로 요청 구성을 만든다(6.1 · 8절 · C21). 조합 검사에 걸리면 ComboError
 * (설정은 적재 때 이미 걸러졌어야 한다 — P9c 는 '설정 문제'로 처리).
 */
export function requestConfigOf({
  purpose,
  level,
  values,
  book,
}: {
  purpose: AiPurpose;
  level?: number;
  values: Readonly<Record<string, unknown>>;
  book: ComboBook;
}): AiRequestConfig {
  const keys = settingKeysOf(purpose, level);
  const model = ModelSettingSchema.parse(values[keys.model]);
  const effort = EffortSettingSchema.parse(values[keys.effort]);
  const thinking = ThinkingSettingSchema.parse(values[keys.thinking]);
  const maxTokens = MaxTokensSettingSchema.parse(values[keys.maxTokens]);
  const timeoutSeconds = TimeoutSettingSchema.parse(values[keys.timeout]);

  const check = checkCombo({ model, effort, thinking }, book);
  if (!check.ok) throw new ComboError(purpose, model, check.reasons);
  const caps = book.get(model)?.caps as ModelCapabilities;
  return {
    purpose,
    model,
    effort,
    thinking: thinkingParamOf(thinking, caps),
    maxTokens,
    timeoutMs: timeoutSeconds * MS_PER_SECOND,
    ...fallbackOf(caps),
  };
}

/**
 * 확인 호출의 가장 가벼운 조합(6.1 표 확인 호출 행 · C1 · AC-8i 끝 문장): effort low,
 * 끌 수 있으면 끈 값(Haiku disabled · Sonnet between_tools), 없으면 adaptive(Opus). 대체 모델 재시도 없음.
 * ai.model · ai.effort · ai.thinking 설정을 읽지 않는다. 1-가는 P9c 계약 명령만 쓴다.
 */
export function probeConfigOf(
  model: string,
  caps: ModelCapabilities,
  probeMaxTokens: number,
  realtimeTimeoutSeconds: number,
): AiRequestConfig {
  return {
    purpose: "probe",
    model,
    effort: PROBE_EFFORT,
    thinking:
      caps.thinkingOff === null
        ? { type: "adaptive" }
        : { type: caps.thinkingOff },
    maxTokens: probeMaxTokens,
    timeoutMs: realtimeTimeoutSeconds * MS_PER_SECOND,
    fallbacks: null,
    betas: [],
  };
}
