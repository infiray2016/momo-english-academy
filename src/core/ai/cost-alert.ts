// 호출 앞 판정 · 비용 알림 판정 · 대화 안전 상한 판정 · 달 열쇠 · 알림 종류 값
// (6.1 · 8절 '하루 안전 상한' · '비용 알림 기준 도달' · '대화 안전 상한' · C6 · C15 · C28 · C56 (4) · C63 (1), plan-p09c 파일별 값 2).
// 금액은 마이크로달러 정수로 견주고 '닿으면'은 같거나 넘음(≥)이다. 순수 모듈이다(시각 · DB 없음 — 시각은 부르는 쪽이 넘긴다).
// 1-가는 판정만 한다. 비용 알림 행을 만드는 일(createAlertOnce 를 부름) · 'AI 쉬는 중'은 1-나다(정할 것 바).
import { usdToMicros } from "@/core/ai/cost";

/** parent_alerts.kind 값(C56 (4) 'P9 · 1-나가 정한다', 정할 것 마). 다른 P 는 이 꼴(snake_case 영어)로 더한다. */
export const AI_ALERT_KINDS = [
  "cost",
  "console_near_limit",
  "call_config_check",
  "ai_rest",
  "talk_safety_cap",
  "feedback_failed",
] as const;
export type AiAlertKind = (typeof AI_ALERT_KINDS)[number];

const DAILY_CALL_ALERT_KEY = "ai.daily_call_alert";
const DAILY_COST_ALERT_KEY = "ai.daily_cost_alert_usd";
const MONTHLY_COST_ALERT_KEY = "ai.monthly_cost_alert_usd";
const CONSOLE_ALERT_KEY = "ai.console_alert_ratio";

// ── 호출 앞 판정 ─────────────────────────────────────────────────

export type GateUsage = { profileCalls: number; householdCostMicros: number };
export type GateSettings = {
  safetyDailyCalls: number;
  safetyDailyCostUsd: number;
};
export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: "safety_calls" | "safety_cost" };

/**
 * 하루 안전 상한(6.1 · 8절 '호출을 보내기 전에 그날 호출 수 · 비용 합계로 판정' · C15).
 * 1-나는 셋째 인자로 ai_status 를 더한다(묶음 위험 8).
 */
export function preCallGate(
  usage: GateUsage,
  settings: GateSettings,
): GateResult {
  if (usage.profileCalls >= settings.safetyDailyCalls) {
    return { allowed: false, reason: "safety_calls" };
  }
  if (usage.householdCostMicros >= usdToMicros(settings.safetyDailyCostUsd)) {
    return { allowed: false, reason: "safety_cost" };
  }
  return { allowed: true };
}

// ── 비용 알림 판정 ───────────────────────────────────────────────

export type CostAlertUsage = {
  profileCallsToday: number;
  householdCostTodayMicros: number;
  householdCostMonthMicros: number;
  learningDay: string;
  /** monthKeyOf 의 값(호출 시각의 달력 달, C63 (1)). */
  monthKey: string;
};

export type CostAlertSettings = {
  dailyCallAlert: number;
  dailyCostAlertUsd: number;
  monthlyCostAlertUsd: number;
  monthlyAlertMultiples: readonly number[];
  consoleLimitUsd: number;
  consoleAlertRatio: number;
};

export type DueAlert = {
  kind: Extract<AiAlertKind, "cost" | "console_near_limit">;
  /** profile 이면 그 프로필 알림, household 면 profile_id 를 비운 집 전체 알림. */
  scope: "profile" | "household";
  thresholdKey: string;
  /** P9a createAlertOnce 의 once(그날은 day, 그달은 key — 달은 기준 키에 든다). */
  once: "day" | "key";
  /** 알림 내용(parent_alerts.value). 금액은 마이크로달러. */
  value: { threshold: number; actual: number };
};

/**
 * 기준에 닿은 알림을 모두 낸다(호출은 막지 않는다, 6.1 · AC-8a). 한 번만 만드는 일은 createAlertOnce 가 하고
 * 부르는 쪽은 1-나다(정할 것 바).
 */
export function dueCostAlerts(
  usage: CostAlertUsage,
  settings: CostAlertSettings,
): DueAlert[] {
  const alerts: DueAlert[] = [];
  if (usage.profileCallsToday >= settings.dailyCallAlert) {
    alerts.push({
      kind: "cost",
      scope: "profile",
      thresholdKey: DAILY_CALL_ALERT_KEY,
      once: "day",
      value: {
        threshold: settings.dailyCallAlert,
        actual: usage.profileCallsToday,
      },
    });
  }
  const dailyCost = usdToMicros(settings.dailyCostAlertUsd);
  if (usage.householdCostTodayMicros >= dailyCost) {
    alerts.push({
      kind: "cost",
      scope: "household",
      thresholdKey: DAILY_COST_ALERT_KEY,
      once: "day",
      value: { threshold: dailyCost, actual: usage.householdCostTodayMicros },
    });
  }
  const monthly = usdToMicros(settings.monthlyCostAlertUsd);
  for (const multiple of settings.monthlyAlertMultiples) {
    const threshold = Math.round(monthly * multiple);
    if (usage.householdCostMonthMicros >= threshold) {
      alerts.push({
        kind: "cost",
        scope: "household",
        thresholdKey: `${MONTHLY_COST_ALERT_KEY}:x${multiple}:${usage.monthKey}`,
        once: "key",
        value: { threshold, actual: usage.householdCostMonthMicros },
      });
    }
  }
  const near = Math.round(
    usdToMicros(settings.consoleLimitUsd) * settings.consoleAlertRatio,
  );
  if (usage.householdCostMonthMicros >= near) {
    alerts.push({
      kind: "console_near_limit",
      scope: "household",
      thresholdKey: `${CONSOLE_ALERT_KEY}:${usage.monthKey}`,
      once: "key",
      value: { threshold: near, actual: usage.householdCostMonthMicros },
    });
  }
  return alerts;
}

// ── 대화 안전 상한 ───────────────────────────────────────────────

/**
 * 대화 하나가 talk.safety_max_turns 에 닿으면 닫고, 그 학습일 닿은 수가 talk.safety_alert_count 일 때만 알린다
 * (3.3 · 8절 '대화 안전 상한'). reachedToday 는 이번 것을 넣은 수다. 회화는 1-나라 판정 함수만 둔다.
 */
export function talkSafetyOf(
  { turns, reachedToday }: { turns: number; reachedToday: number },
  {
    safetyMaxTurns,
    safetyAlertCount,
  }: { safetyMaxTurns: number; safetyAlertCount: number },
): { close: boolean; alert: boolean } {
  const close = turns >= safetyMaxTurns;
  return { close, alert: close && reachedToday === safetyAlertCount };
}

// ── 달 열쇠 ──────────────────────────────────────────────────────

const monthFormatters = new Map<string, Intl.DateTimeFormat>();

/** "YYYY-MM" — 호출 시각의 app.timezone 달력 달(학습일이 아니다, C63 (1) · AC-8e). */
export function monthKeyOf(instant: Date, timeZone: string): string {
  let formatter = monthFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
    });
    monthFormatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(instant);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  if (year === undefined || month === undefined) {
    throw new RangeError("달을 읽지 못했습니다");
  }
  return `${year}-${month}`;
}
