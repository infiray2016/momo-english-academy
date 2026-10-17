// AC-8a · AC-N2 호출 앞 판정 · 비용 알림 판정 · 대화 안전 상한 · 달 열쇠(plan-p09c 증명 표). 값은 모두 TEST_SETTINGS 에서 읽는다.
import { describe, expect, it } from "vitest";
import { usdToMicros } from "@/core/ai/cost";
import {
  AI_ALERT_KINDS,
  type CostAlertSettings,
  dueCostAlerts,
  monthKeyOf,
  preCallGate,
  talkSafetyOf,
} from "@/core/ai/cost-alert";
import { learningDayOf } from "@/core/learning-day";
import { TEST_SETTINGS } from "../fixtures/settings";

const TZ = TEST_SETTINGS["app.timezone"].value;
const DAY_START = TEST_SETTINGS["app.day_start_hour"].value;

const alertSettings: CostAlertSettings = {
  dailyCallAlert: TEST_SETTINGS["ai.daily_call_alert"].value,
  dailyCostAlertUsd: TEST_SETTINGS["ai.daily_cost_alert_usd"].value,
  monthlyCostAlertUsd: TEST_SETTINGS["ai.monthly_cost_alert_usd"].value,
  monthlyAlertMultiples: [...TEST_SETTINGS["ai.monthly_alert_multiples"].value],
  consoleLimitUsd: TEST_SETTINGS["ai.console_limit_usd"].value,
  consoleAlertRatio: TEST_SETTINGS["ai.console_alert_ratio"].value,
};
const safety = {
  safetyDailyCalls: TEST_SETTINGS["ai.safety_daily_calls"].value,
  safetyDailyCostUsd: TEST_SETTINGS["ai.safety_daily_cost_usd"].value,
};
const micros = (usd: number) => usdToMicros(usd);
const DAY = "2026-10-20";
const MONTH = "2026-10";

function usage(over: Partial<Parameters<typeof dueCostAlerts>[0]> = {}) {
  return {
    profileCallsToday: 0,
    householdCostTodayMicros: 0,
    householdCostMonthMicros: 0,
    learningDay: DAY,
    monthKey: MONTH,
    ...over,
  };
}

describe("AC-8a 판정", () => {
  it("AC-8a · AC-N2 알림 기준 셋(하루 호출 · 하루 비용 · 월 비용)에 닿으면 알림을 내고 호출은 허용한다", () => {
    const below = usage({
      profileCallsToday: alertSettings.dailyCallAlert - 1,
      householdCostTodayMicros: micros(alertSettings.dailyCostAlertUsd) - 1,
      householdCostMonthMicros: micros(alertSettings.monthlyCostAlertUsd) - 1,
    });
    expect(dueCostAlerts(below, alertSettings)).toEqual([]);

    const reached = usage({
      profileCallsToday: alertSettings.dailyCallAlert,
      householdCostTodayMicros: micros(alertSettings.dailyCostAlertUsd),
      householdCostMonthMicros: micros(alertSettings.monthlyCostAlertUsd),
    });
    const alerts = dueCostAlerts(reached, alertSettings);
    expect(alerts.map((a) => a.thresholdKey)).toEqual([
      "ai.daily_call_alert",
      "ai.daily_cost_alert_usd",
      `ai.monthly_cost_alert_usd:x1:${MONTH}`,
    ]);
    expect(alerts.every((a) => a.kind === "cost")).toBe(true);
    expect(alerts.map((a) => a.once)).toEqual(["day", "day", "key"]);
    expect(alerts[0]?.scope).toBe("profile");
    expect(alerts[1]?.scope).toBe("household");
    // 알림 기준에 닿아도 호출은 막지 않는다(안전 상한보다 훨씬 아래)
    expect(
      preCallGate(
        {
          profileCalls: reached.profileCallsToday,
          householdCostMicros: reached.householdCostTodayMicros,
        },
        safety,
      ),
    ).toEqual({ allowed: true });
    expect(AI_ALERT_KINDS).toContain("cost");
  });

  it("AC-8a 하루 안전 상한 둘(호출 수 · 비용)에 닿을 때만 막는다", () => {
    const limitMicros = micros(safety.safetyDailyCostUsd);
    expect(
      preCallGate(
        {
          profileCalls: safety.safetyDailyCalls - 1,
          householdCostMicros: limitMicros - 1,
        },
        safety,
      ),
    ).toEqual({ allowed: true });
    expect(
      preCallGate(
        { profileCalls: safety.safetyDailyCalls, householdCostMicros: 0 },
        safety,
      ),
    ).toEqual({ allowed: false, reason: "safety_calls" });
    expect(
      preCallGate(
        { profileCalls: 0, householdCostMicros: limitMicros },
        safety,
      ),
    ).toEqual({ allowed: false, reason: "safety_cost" });
  });

  it("AC-8a 월 비용 알림은 배수 1 · 2 · 4 마다 하나씩이다", () => {
    const base = micros(alertSettings.monthlyCostAlertUsd);
    const monthly = (cost: number) =>
      dueCostAlerts(usage({ householdCostMonthMicros: cost }), alertSettings)
        .filter((a) => a.thresholdKey.startsWith("ai.monthly_cost_alert_usd"))
        .map((a) => a.thresholdKey);
    const [m1, m2, m4] = alertSettings.monthlyAlertMultiples as [
      number,
      number,
      number,
    ];
    expect(monthly(base * m2 - 1)).toEqual([
      `ai.monthly_cost_alert_usd:x${m1}:${MONTH}`,
    ]);
    expect(monthly(base * m2)).toEqual([
      `ai.monthly_cost_alert_usd:x${m1}:${MONTH}`,
      `ai.monthly_cost_alert_usd:x${m2}:${MONTH}`,
    ]);
    expect(monthly(base * m4)).toHaveLength(
      alertSettings.monthlyAlertMultiples.length,
    );
  });

  it("AC-8a 대화가 80턴에 닿으면 닫고 같은 학습일 둘째에만 알린다", () => {
    const settings = {
      safetyMaxTurns: TEST_SETTINGS["talk.safety_max_turns"].value,
      safetyAlertCount: TEST_SETTINGS["talk.safety_alert_count"].value,
    };
    expect(
      talkSafetyOf(
        { turns: settings.safetyMaxTurns - 1, reachedToday: 0 },
        settings,
      ),
    ).toEqual({ close: false, alert: false });
    expect(
      talkSafetyOf(
        { turns: settings.safetyMaxTurns, reachedToday: 1 },
        settings,
      ),
    ).toEqual({ close: true, alert: false });
    expect(
      talkSafetyOf(
        {
          turns: settings.safetyMaxTurns,
          reachedToday: settings.safetyAlertCount,
        },
        settings,
      ),
    ).toEqual({ close: true, alert: true });
    expect(
      talkSafetyOf(
        {
          turns: settings.safetyMaxTurns,
          reachedToday: settings.safetyAlertCount + 1,
        },
        settings,
      ),
    ).toEqual({ close: true, alert: false });
  });

  it("AC-8a 그달 비용이 콘솔 한도 × 비율(56달러)에 닿으면 콘솔 한도 근접 알림", () => {
    const near = Math.round(
      micros(alertSettings.consoleLimitUsd) * alertSettings.consoleAlertRatio,
    );
    expect(near).toBe(micros(56));
    const kinds = (cost: number) =>
      dueCostAlerts(usage({ householdCostMonthMicros: cost }), alertSettings)
        .filter((a) => a.kind === "console_near_limit")
        .map((a) => ({ key: a.thresholdKey, once: a.once, scope: a.scope }));
    expect(kinds(near - 1)).toEqual([]);
    expect(kinds(near)).toEqual([
      {
        key: `ai.console_alert_ratio:${MONTH}`,
        once: "key",
        scope: "household",
      },
    ]);
  });

  it("AC-8a 한국 시간 1일 0시 30분은 새 달이다", () => {
    // 한국 시간 2026-11-01 00:30 = UTC 2026-10-31 15:30
    const instant = new Date("2026-10-31T15:30:00Z");
    expect(monthKeyOf(instant, TZ)).toBe("2026-11");
    // 학습일은 아직 전달 말일(app.day_start_hour 전)이지만 달은 새 달이다(C63 (1))
    expect(learningDayOf(instant, TZ, DAY_START)).toBe("2026-10-31");
    expect(monthKeyOf(new Date("2026-10-31T14:59:59Z"), TZ)).toBe("2026-10");
  });
});
