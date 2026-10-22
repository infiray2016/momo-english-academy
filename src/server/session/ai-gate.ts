import "server-only";
// 1-가 하루 안전 상한(11절 (7) · 13절 C50 (2) · C80, plan-p11b 파일별 값 2 · 위험 8). 그 학습일에 AI 가 필요한 수업을 시작하지 않고
// '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'를 보일지 정한다. 판정은 P9c 호출 앞 판정(preCallGate)과 같은 함수 · 같은 사용량
// (dailyUsage — 그 프로필 호출 수 · 집 하루 비용)이라 흐름이 막는 때와 어긋나지 않는다. 1-나가 ai_status 를 더하면 이 함수 하나만 고친다.
// AI 를 부르지 않는다(ai_calls 를 읽기만 함). 시각은 부르는 쪽이 넘긴다.
import { z } from "zod";
import { preCallGate } from "@/core/ai/cost-alert";
import { learningDayOf } from "@/core/learning-day";
import { dailyUsage } from "@/server/ai/store";
import { type Db, getDb } from "@/server/db";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
} from "@/server/settings";

const gateSettings = {
  "app.timezone": appTimezoneSchema,
  "app.day_start_hour": appDayStartHourSchema,
  "ai.safety_daily_calls": z.int().min(1),
  "ai.safety_daily_cost_usd": z.number().positive(),
};

/** 그 프로필이 그 시각의 학습일에 하루 안전 상한에 닿았는가(닿으면 AI 가 필요한 수업 · 활동을 막는다). */
export async function aiRestingToday(
  { profileId, at }: { profileId: string; at: Date },
  { db = getDb() }: { db?: Db } = {},
): Promise<boolean> {
  const s = await getSettings(gateSettings, { db, profileId });
  const learningDay = learningDayOf(
    at,
    s["app.timezone"],
    s["app.day_start_hour"],
  );
  const usage = await dailyUsage(db, { profileId, learningDay });
  return !preCallGate(usage, {
    safetyDailyCalls: s["ai.safety_daily_calls"],
    safetyDailyCostUsd: s["ai.safety_daily_cost_usd"],
  }).allowed;
}
