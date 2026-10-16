// 시험용 단가표(plan-p09a 파일별 값 3). P6 seed/model-prices.json 과 같은 여섯 행, 단가는 6.6(C61 (3)) · 확인한 사실 1.
// P4a 견본(builders.ts)의 조합 칸은 시험용으로 지어낸 값이라 옮기지 않는다.
import { capabilitiesOf } from "@/core/ai/combo";
import type { ModelPricesFile } from "@/core/seed/schema/reference";
import { modelPrices } from "@/db/schema/content";
import type { Db } from "@/server/db";

/** 시험용 단가 줄의 적용 시작일. */
export const FIXTURE_EFFECTIVE_FROM = "2026-10-16";

export const MODEL_PRICES_FIXTURE: ModelPricesFile = {
  models: [
    {
      model: "claude-opus-5-5",
      inputUsdPerMTok: 4,
      outputUsdPerMTok: 20,
      cacheWriteUsdPerMTok: 5,
      cacheReadUsdPerMTok: 0.2,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      thinkingDefault: "adaptive",
      thinkingOff: null,
      thinkingOffEfforts: [],
      effortDefault: "medium",
      serverFallback: true,
    },
    {
      model: "claude-sonnet-5-5",
      inputUsdPerMTok: 2,
      outputUsdPerMTok: 10,
      cacheWriteUsdPerMTok: 2.5,
      cacheReadUsdPerMTok: 0.1,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      thinkingDefault: "adaptive",
      thinkingOff: "between_tools",
      thinkingOffEfforts: ["low", "medium", "high"],
      effortDefault: "high",
      serverFallback: true,
    },
    {
      // 프롬프트 10만 토큰 이하 단가(위험 8)
      model: "claude-haiku-5-5",
      inputUsdPerMTok: 0.1,
      outputUsdPerMTok: 0.5,
      cacheWriteUsdPerMTok: 0.125,
      cacheReadUsdPerMTok: 0.01,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      thinkingDefault: "adaptive",
      thinkingOff: "disabled",
      thinkingOffEfforts: ["low", "medium", "high"],
      effortDefault: "medium",
      serverFallback: false,
    },
    {
      model: "claude-sonnet-5",
      inputUsdPerMTok: 2,
      outputUsdPerMTok: 10,
      cacheWriteUsdPerMTok: 2.5,
      cacheReadUsdPerMTok: 0.2,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      thinkingDefault: "adaptive",
      thinkingOff: "disabled",
      thinkingOffEfforts: ["low", "medium", "high"],
      effortDefault: "high",
      serverFallback: false,
      fallbackOnly: true,
    },
    {
      model: "claude-opus-5",
      inputUsdPerMTok: 5,
      outputUsdPerMTok: 25,
      cacheWriteUsdPerMTok: 6.25,
      cacheReadUsdPerMTok: 0.5,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      thinkingDefault: "adaptive",
      thinkingOff: "disabled",
      thinkingOffEfforts: ["low", "medium", "high"],
      effortDefault: "high",
      serverFallback: true,
      fallbackOnly: true,
    },
    {
      // '단가 없음'일 때 쓰는 단가이기도 하다(6.1)
      model: "claude-opus-4-8",
      inputUsdPerMTok: 5,
      outputUsdPerMTok: 25,
      cacheWriteUsdPerMTok: 6.25,
      cacheReadUsdPerMTok: 0.5,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      thinkingDefault: "none",
      thinkingOff: "disabled",
      thinkingOffEfforts: ["low", "medium", "high", "xhigh", "max"],
      effortDefault: "high",
      serverFallback: false,
      fallbackOnly: true,
    },
  ],
};

/** 시험용 단가 줄 하나(모델 이름으로). 없으면 던진다. */
export function fixturePrice(model: string) {
  const entry = MODEL_PRICES_FIXTURE.models.find((m) => m.model === model);
  if (!entry) throw new Error(`시험용 단가표에 없는 모델: ${model}`);
  return entry;
}

/**
 * model_prices 행을 넣는다. 단가는 numeric(10,4) 글로(수를 toFixed(4) 로), capabilities 칸은 capabilitiesOf(entry).
 * 적용 시작일은 줄마다의 effectiveFrom 이고, 셋째 인자를 넘기면 모든 줄을 그것으로 덮는다(검토 M-4).
 */
export async function seedModelPrices(
  db: Db,
  file: ModelPricesFile = MODEL_PRICES_FIXTURE,
  effectiveFrom?: string,
): Promise<void> {
  if (file.models.length === 0) return;
  await db.insert(modelPrices).values(
    file.models.map((entry) => ({
      model: entry.model,
      effectiveFrom: effectiveFrom ?? entry.effectiveFrom,
      inputUsdPerMtok: entry.inputUsdPerMTok.toFixed(4),
      outputUsdPerMtok: entry.outputUsdPerMTok.toFixed(4),
      cacheWriteUsdPerMtok: entry.cacheWriteUsdPerMTok.toFixed(4),
      cacheReadUsdPerMtok: entry.cacheReadUsdPerMTok.toFixed(4),
      capabilities: capabilitiesOf(entry),
    })),
  );
}
