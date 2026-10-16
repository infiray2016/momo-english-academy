// 요청 본문 만들기(6.1 · C62 · C63 (5) · AC-N4, plan-p09b 파일별 값 8). 조합 구성(P9a) + 호출 규격 + 가림.
// 본문 칸은 P5a 의 GA 요청과 같다(P9a 확인한 사실 12). temperature · top_p · top_k · metadata · stop_sequences · tools 는 넣지 않는다(6.1).
// output_config.format 은 넣지 않는다 — SDK 도우미(zodOutputFormat)는 src/server/ai 와 스크립트만 가져올 수 있어
// P9c 가 wireSchema 로 붙인다(sdk-only-in-ai). 순수 모듈이다.
import type { z } from "zod";
import type { CallSpec, ChatMessage } from "@/core/ai/calls/common";
import {
  type AiRequestConfig,
  STRUCTURED_OUTPUTS_BETA,
  type ThinkingParam,
} from "@/core/ai/combo";
import type { Masker } from "@/core/ai/mask";
import type { Effort } from "@/core/seed/structure";

/** 여러 턴 호출의 자동 캐시(6.1 '여러 턴 호출에서 대화 끝까지'). */
const AUTO_CACHE = { type: "ephemeral" } as const;

/** SDK 형을 가져오지 않는 요청 본문 꼴(P9c 가 sendAttempt 의 AttemptBody 로 넘긴다). */
export type AiRequestBody = {
  model: string;
  max_tokens: number;
  system: string;
  messages: ChatMessage[];
  thinking: ThinkingParam;
  output_config: { effort: Effort };
  fallbacks?: "default";
  cache_control?: typeof AUTO_CACHE;
};

export type BuiltRequest<O> = {
  body: AiRequestBody;
  betas: string[];
  timeoutMs: number;
  wireSchema: z.ZodType<O>;
  title: string;
  /** 가린 수(이름 · 연락처). 흐름이 받아 둔다(위험 3). */
  masked: { names: number; contacts: number };
};

/** 가린 수를 세는 가림 함수 감싸기. */
function countingMasker(masker: Masker) {
  const counts = { names: 0, contacts: 0 };
  const wrapped: Masker = (text) => {
    const result = masker(text);
    counts.names += result.names;
    counts.contacts += result.contacts;
    return result;
  };
  return { wrapped, counts };
}

/**
 * 요청 본문을 만든다. 가린 입력으로 system · messages 를 만들고, 조합 구성의 모델 · 최대 출력 · 생각 단계 · effort 를 쓴다.
 * fallbacks 가 있으면 'default', 여러 턴 규격이면 자동 캐시. betas 는 조합 구성의 것에 구조화 출력 머리글을 더한다.
 */
export function buildAiRequest<I, O, R>(
  spec: CallSpec<I, O, R>,
  input: I,
  {
    config,
    masker,
    rules,
  }: { config: AiRequestConfig; masker: Masker; rules: R },
): BuiltRequest<O> {
  if (config.purpose !== spec.purpose) {
    throw new RangeError(
      `요청 구성의 목적(${config.purpose})이 규격의 목적(${spec.purpose})과 다르다`,
    );
  }
  const { wrapped, counts } = countingMasker(masker);
  const masked = spec.mask(input, wrapped);
  const body: AiRequestBody = {
    model: config.model,
    max_tokens: config.maxTokens,
    system: spec.system(masked, rules),
    messages: spec.messages(masked, rules),
    thinking: config.thinking,
    output_config: { effort: config.effort },
    ...(config.fallbacks === null ? {} : { fallbacks: config.fallbacks }),
    ...(spec.multiTurn ? { cache_control: AUTO_CACHE } : {}),
  };
  return {
    body,
    betas: [...config.betas, STRUCTURED_OUTPUTS_BETA],
    timeoutMs: config.timeoutMs,
    wireSchema: spec.wireSchema(input, rules),
    title: spec.title,
    masked: { ...counts },
  };
}
