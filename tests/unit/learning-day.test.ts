// AC-N7 의 P3 몫(학습일 경계)과 한 시계 정적 검사(plan-p03a 증명 표, 묶음 위험 7).
// 시간대 · 경계 시각은 TEST_SETTINGS 에서 읽고, 경계 앞뒤 시각은 그 값에서 계산한다.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { learningDayOf } from "@/core/learning-day";
import { TEST_SETTINGS } from "../fixtures/settings";

const TIME_ZONE = TEST_SETTINGS["app.timezone"].value;
const DAY_START_HOUR = TEST_SETTINGS["app.day_start_hour"].value;
/** 시험에 쓰는 달력 날짜. 해의 끝 날이라 하루 빼기가 달과 해를 함께 넘는다(검토 A2 M2). */
const BASE_DAY = "2026-12-31";
/** 경계 앞뒤로 떨어뜨리는 분(AC-N7 의 '10분'). */
const NEAR_MINUTES = 10;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_MINUTE = 60_000;

/** 그 시간대 벽시계가 가리키는 순간과 UTC 의 차(밀리초). */
function zoneOffsetMs(timeZone: string, epochMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(epochMs));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wall - epochMs;
}

/** 그 시간대의 벽시계 'YYYY-MM-DD hh:mm' 을 순간으로 바꾼다. 분은 시를 넘어도 된다(음수도). */
function wallClock(
  timeZone: string,
  day: string,
  hour: number,
  minute: number,
): Date {
  const [y, m, d] = day.split("-").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hour, minute);
  let instant = asUtc - zoneOffsetMs(timeZone, asUtc);
  instant = asUtc - zoneOffsetMs(timeZone, instant);
  return new Date(instant);
}

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

describe("학습일", () => {
  it("AC-N7 자정 앞뒤(23시 50분 · 0시 10분)는 같은 학습일이다", () => {
    const nextDay = addDays(BASE_DAY, 1);
    const beforeMidnight = wallClock(
      TIME_ZONE,
      BASE_DAY,
      HOURS_PER_DAY - 1,
      MINUTES_PER_HOUR - NEAR_MINUTES,
    );
    const afterMidnight = wallClock(TIME_ZONE, nextDay, 0, NEAR_MINUTES);
    expect(learningDayOf(beforeMidnight, TIME_ZONE, DAY_START_HOUR)).toBe(
      BASE_DAY,
    );
    expect(learningDayOf(afterMidnight, TIME_ZONE, DAY_START_HOUR)).toBe(
      BASE_DAY,
    );
  });

  it("AC-N7 경계(app.day_start_hour) 10분 뒤는 다음 학습일이다", () => {
    const nextDay = addDays(BASE_DAY, 1);
    const afterBoundary = wallClock(
      TIME_ZONE,
      nextDay,
      DAY_START_HOUR,
      NEAR_MINUTES,
    );
    const atBoundary = wallClock(TIME_ZONE, nextDay, DAY_START_HOUR, 0);
    expect(learningDayOf(afterBoundary, TIME_ZONE, DAY_START_HOUR)).toBe(
      nextDay,
    );
    expect(learningDayOf(atBoundary, TIME_ZONE, DAY_START_HOUR)).toBe(nextDay);
  });

  it("AC-N7 경계 10분 앞(새벽 3시 50분)에 끝낸 수업은 전날 학습일이다", () => {
    const nextDay = addDays(BASE_DAY, 1);
    const beforeBoundary = wallClock(
      TIME_ZONE,
      nextDay,
      DAY_START_HOUR,
      -NEAR_MINUTES,
    );
    expect(learningDayOf(beforeBoundary, TIME_ZONE, DAY_START_HOUR)).toBe(
      BASE_DAY,
    );
  });

  it("AC-N7 학습일은 app.timezone 의 벽시계로 센다(같은 순간의 UTC 날짜와 다를 수 있다)", () => {
    const nextDay = addDays(BASE_DAY, 1);
    // 경계 바로 뒤의 이른 아침은 시간대가 UTC 보다 앞서 있으면 UTC 로는 아직 전날이다
    const earlyMorning = wallClock(TIME_ZONE, nextDay, DAY_START_HOUR, 0);
    const utcDay = earlyMorning.toISOString().slice(0, 10);
    expect(zoneOffsetMs(TIME_ZONE, earlyMorning.getTime())).toBeGreaterThan(
      DAY_START_HOUR * MINUTES_PER_HOUR * MS_PER_MINUTE,
    );
    expect(learningDayOf(earlyMorning, TIME_ZONE, DAY_START_HOUR)).toBe(
      nextDay,
    );
    expect(utcDay).toBe(BASE_DAY);
    // 같은 순간을 UTC 로 세면 다른 학습일이 나온다(시간대를 실제로 쓴다)
    expect(learningDayOf(earlyMorning, "UTC", DAY_START_HOUR)).not.toBe(
      nextDay,
    );
  });

  it("AC-N7 틀린 시간대 · 경계 시각은 RangeError 다", () => {
    const instant = wallClock(TIME_ZONE, BASE_DAY, DAY_START_HOUR, 0);
    expect(() => learningDayOf(instant, "Not/A_Zone", DAY_START_HOUR)).toThrow(
      RangeError,
    );
    for (const badHour of [
      -1,
      HOURS_PER_DAY,
      DAY_START_HOUR + 0.5,
      Number.NaN,
    ]) {
      expect(() => learningDayOf(instant, TIME_ZONE, badHour)).toThrow(
        RangeError,
      );
    }
  });
});

const REPO_ROOT = join(import.meta.dirname, "../..");
const CLOCK_SCOPES = ["src/core", "src/server", "src/db", "src/proxy.ts"];
const CLOCK_HOME = "src/server/clock/";
const SOURCE_FILE = /\.(ts|tsx|mts|cts|js|mjs)$/;
// 현재 시각을 읽는 꼴: Date.now(부르기 · 넘기기), 인자 없는 new Date() · new Date;, new 없는 Date()(검토 A2 M1)
const CLOCK_READ =
  /\bDate\.now\b|\bnew\s+Date\b(?!\s*\(\s*[^\s)])|(?<!\bnew\s+)(?<![\w.$])Date\s*\(/;
const CLOCK_READ_SAMPLES = [
  "const t = Date.now();",
  "createClock({ realNow: Date.now });",
  "const d = new Date();",
  "const d = new Date;",
  "const s = Date();",
];
const NOT_CLOCK_READ_SAMPLES = [
  "const d = new Date(ms);",
  "const d = new Date(Date.UTC(y, m - 1, d));",
  "const d = toDate(value);",
  "function f(instant: Date): Date {",
  "const d = new Date(\n  ms,\n);",
];

function sourceFiles(path: string): string[] {
  const full = join(REPO_ROOT, path);
  if (!existsSync(full)) return [];
  if (statSync(full).isFile()) return SOURCE_FILE.test(full) ? [path] : [];
  return readdirSync(full).flatMap((name) => sourceFiles(join(path, name)));
}

describe("한 시계", () => {
  it("한 시계: src/core · src/server · src/db · src/proxy.ts 에서 Date.now() · 인자 없는 new Date() 는 src/server/clock 에만 있다", () => {
    for (const sample of CLOCK_READ_SAMPLES) {
      expect(CLOCK_READ.test(sample), sample).toBe(true);
    }
    for (const sample of NOT_CLOCK_READ_SAMPLES) {
      expect(CLOCK_READ.test(sample), sample).toBe(false);
    }
    const readers = CLOCK_SCOPES.flatMap(sourceFiles)
      .map((path) =>
        relative(REPO_ROOT, join(REPO_ROOT, path)).split(sep).join("/"),
      )
      .filter((path) =>
        CLOCK_READ.test(readFileSync(join(REPO_ROOT, path), "utf8")),
      );
    expect(readers.filter((path) => !path.startsWith(CLOCK_HOME))).toEqual([]);
    expect(readers.some((path) => path.startsWith(CLOCK_HOME))).toBe(true);
  });
});
