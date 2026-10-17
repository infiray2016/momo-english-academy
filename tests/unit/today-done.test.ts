// 오늘 완료 · 이번 주 n일(4절 홈 표 '오늘 완료' 행 · 3.5 '이번 주 n일' · AC-2a · AC-N7, plan-p10b 파일별 값 2 · 정할 것 ㄴ).
// 학습일은 P3a learningDayOf(시각, TEST_SETTINGS app.timezone · app.day_start_hour) 로 만든다(숫자를 시험에 다시 적지 않는다).
import { describe, expect, it } from "vitest";
import { learningDayOf } from "@/core/learning-day";
import { type DoneSession, thisWeekDays, todayDone } from "@/core/today/done";
import { TEST_SETTINGS } from "../fixtures/settings";

const TZ = TEST_SETTINGS["app.timezone"].value;
const START = TEST_SETTINGS["app.day_start_hour"].value;
/** 서울 벽시계 시각 → 학습일. */
const day = (local: string) =>
  learningDayOf(new Date(`${local}+09:00`), TZ, START);
const hh = (h: number, m = 0) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;

const done = (kind: DoneSession["kind"], learningDay: string): DoneSession => ({
  kind,
  status: "completed",
  learningDay,
});

const TODAY = day(`2026-10-15T${hh(START + 6)}`); // 목요일 낮
const YESTERDAY = day(`2026-10-14T${hh(START + 6)}`);
const base = {
  today: TODAY,
  reviewDue: false,
  reviewDoneToday: false,
  noNewLessonPossible: false,
};

describe("오늘 완료", () => {
  it("AC-2a 오늘 완료: 새 수업과 그날 복습 · 할 수 있는 새 수업이 없는 날의 다시 하기 · 단계 평가 세션 하나로 켜지고 새 수업이 없으면 '오늘 아직이에요'다", () => {
    // 아무것도 없으면 꺼짐 · 새 수업 없음('오늘 아직이에요')
    expect(todayDone({ ...base, sessions: [] })).toEqual({
      done: false,
      newLessonDone: false,
    });
    // 새 수업 = 정규 · 보강 · 연습 · 안 해 본 수업
    for (const kind of [
      "regular",
      "remedial",
      "practice",
      "untried",
    ] as const) {
      expect(
        todayDone({ ...base, sessions: [done(kind, TODAY)] }),
        kind,
      ).toEqual({ done: true, newLessonDone: true });
    }
    // 복습할 카드가 있으면 그날 복습도 해야 켜진다
    expect(
      todayDone({
        ...base,
        reviewDue: true,
        sessions: [done("regular", TODAY)],
      }),
    ).toEqual({ done: false, newLessonDone: true });
    expect(
      todayDone({
        ...base,
        reviewDue: true,
        reviewDoneToday: true,
        sessions: [done("regular", TODAY)],
      }),
    ).toEqual({ done: true, newLessonDone: true });
    // 다시 하기 · 복습만으로는 켜지지 않는다 — 할 수 있는 새 수업이 없는 날(부모 확인 대기 · 다음 단계 준비 중)에만
    expect(todayDone({ ...base, sessions: [done("retry", TODAY)] })).toEqual({
      done: false,
      newLessonDone: false,
    });
    expect(
      todayDone({
        ...base,
        noNewLessonPossible: true,
        sessions: [done("retry", TODAY)],
      }),
    ).toEqual({ done: true, newLessonDone: false });
    expect(
      todayDone({
        ...base,
        noNewLessonPossible: true,
        sessions: [done("review", TODAY)],
      }),
    ).toEqual({ done: true, newLessonDone: false });
    // 단계 평가 세션 하나를 끝내도 켜진다
    expect(
      todayDone({ ...base, sessions: [done("level_test", TODAY)] }),
    ).toEqual({ done: true, newLessonDone: false });
    // 어제 것 · 끝내지 않은 것 · 배치 평가는 세지 않는다
    expect(
      todayDone({
        ...base,
        sessions: [
          done("regular", YESTERDAY),
          { kind: "regular", status: "in_progress", learningDay: null },
          { kind: "regular", status: "aborted", learningDay: TODAY },
          done("placement", TODAY),
        ],
      }),
    ).toEqual({ done: false, newLessonDone: false });
  });

  it("AC-N7 오늘 완료: 새벽 3시 50분에 끝낸 새 수업은 전날의 오늘 완료를 켠다", () => {
    const beforeStart = day(`2026-10-16T${hh(START - 1, 50)}`);
    expect(beforeStart).toBe(TODAY);
    expect(
      todayDone({ ...base, sessions: [done("regular", beforeStart)] }),
    ).toEqual({ done: true, newLessonDone: true });
    const afterStart = day(`2026-10-16T${hh(START, 10)}`);
    expect(
      todayDone({ ...base, sessions: [done("regular", afterStart)] }).done,
    ).toBe(false);
  });
});

describe("이번 주 n일", () => {
  it("AC-N7 이번 주 n일: 밤 11시 50분과 0시 10분은 같은 학습일, 4시 10분은 다음 학습일로 세고 월요일에 새 주가 된다", () => {
    // 2026-10-12 는 월요일
    const mon = day(`2026-10-12T${hh(START + 8)}`);
    const tueLate = day("2026-10-13T23:50:00");
    const wedEarly = day("2026-10-14T00:10:00");
    const wedMorning = day(`2026-10-14T${hh(START, 10)}`);
    expect(tueLate).toBe(wedEarly);
    expect(wedMorning).not.toBe(wedEarly);
    const today = day(`2026-10-15T${hh(START + 6)}`);
    expect(
      thisWeekDays({
        today,
        learningDays: [mon, tueLate, wedEarly, wedMorning, wedMorning],
      }),
    ).toBe(3);
    // 지난 주 일요일(새벽 4시 전 월요일 포함)은 세지 않고, 오늘 뒤 날도 세지 않는다
    const sunday = day(`2026-10-11T${hh(START + 8)}`);
    const mondayEarly = day(`2026-10-12T${hh(START - 1)}`);
    expect(mondayEarly).toBe(sunday);
    expect(
      thisWeekDays({ today, learningDays: [sunday, mondayEarly, mon] }),
    ).toBe(1);
    expect(
      thisWeekDays({
        today: mon,
        learningDays: [mon, day(`2026-10-13T${hh(START + 8)}`)],
      }),
    ).toBe(1);
    // 월요일이 오면 새 주
    const nextMon = day(`2026-10-19T${hh(START + 1)}`);
    expect(
      thisWeekDays({ today: nextMon, learningDays: [mon, tueLate, today] }),
    ).toBe(0);
  });
});
