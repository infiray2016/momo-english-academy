// 선생님 상태 · 칭찬 · 움직임 · 깜빡임 · 차례 번호(plan 회화-선생님-캐릭터 값 11, AC-19g · AC-19h 함수 몫).
// 시제품 움직임 시험 다섯(prototypes/teacher-avatar/test/motion.test.js)을 같은 뜻으로 옮겼다.
import { describe, expect, it } from "vitest";
import {
  blinkAt,
  createLoadTurn,
  MOTION,
  praiseUntilOf,
  sampleMotion,
  TEACHER_STATES,
  type TeacherState,
  teacherStateOf,
} from "@/core/teacher/state";

const BODY_KEYS = ["headX", "headY", "headZ", "bodyX", "bodyY"] as const;

describe("선생님 움직임(시제품 시험 다섯)", () => {
  it("AC-19g 선생님 움직임: 말하기 밖(쉬기 · 듣기 · 생각 · 칭찬)에는 입이 0 이다", () => {
    for (const state of ["idle", "listening", "thinking", "praise"] as const) {
      expect(sampleMotion(state, 2.4, false).mouth).toBe(0);
    }
  });

  it("AC-19g 선생님 움직임: 말하기는 입을 0.3 넘게 여는 때가 있고 늘 0~0.65 안이다", () => {
    const samples = Array.from({ length: 100 }, (_, n) =>
      sampleMotion("speaking", n / 20, false),
    );
    expect(samples.some((pose) => pose.mouth > 0.3)).toBe(true);
    expect(samples.every((pose) => pose.mouth >= 0 && pose.mouth <= 0.65)).toBe(
      true,
    );
  });

  it("AC-19h 선생님 움직임: 움직임 줄이기면 몸 · 고개가 시간과 관계없이 같고 말하기 입만 바뀐다", () => {
    const first = sampleMotion("speaking", 0.2, true);
    const later = sampleMotion("speaking", 7.4, true);
    for (const key of BODY_KEYS) expect(first[key]).toBe(later[key]);
    expect(first.mouth).not.toBe(later.mouth);
    for (const state of TEACHER_STATES) {
      const a = sampleMotion(state, 1.1, true);
      const b = sampleMotion(state, 9.7, true);
      for (const key of BODY_KEYS) expect(a[key]).toBe(b[key]);
      expect(a.smile).toBe(b.smile);
    }
  });

  it("AC-19g 선생님 움직임: 듣기는 고개를 기울이고 칭찬은 웃음이 눈에 띄게 커진다", () => {
    expect(sampleMotion("listening", 0, false).headZ).toBeGreaterThan(0.08);
    expect(sampleMotion("praise", 0, false).smile).toBeGreaterThan(
      sampleMotion("idle", 0, false).smile + 0.3,
    );
  });

  it("AC-19g 선생님 움직임: 모르는 상태는 쉬기와 같고 입을 열지 않는다", () => {
    const unknown = "not-a-state" as TeacherState;
    expect(sampleMotion(unknown, 1, false)).toEqual(
      sampleMotion("idle", 1, false),
    );
    expect(sampleMotion(unknown, 1, false).mouth).toBe(0);
  });

  it("AC-19h 선생님 움직임: 움직임 줄이기가 아니면 쉬기도 시간에 따라 몸이 움직인다", () => {
    const a = sampleMotion("idle", 0.5, false);
    const b = sampleMotion("idle", 3.1, false);
    expect(BODY_KEYS.some((key) => a[key] !== b[key])).toBe(true);
  });
});

describe("선생님 상태 차례", () => {
  const base = {
    listening: false,
    thinking: false,
    speaking: false,
    praiseUntil: null,
    now: 1000,
  };

  it("AC-19g 선생님 상태: 듣기 → 생각 → 말하기 → 칭찬 → 쉬기 차례로 앞이 이긴다", () => {
    const all = {
      listening: true,
      thinking: true,
      speaking: true,
      praiseUntil: 2000,
      now: 1000,
    };
    expect(teacherStateOf(all)).toBe("listening");
    expect(teacherStateOf({ ...all, listening: false })).toBe("thinking");
    expect(teacherStateOf({ ...all, listening: false, thinking: false })).toBe(
      "speaking",
    );
    expect(
      teacherStateOf({
        ...all,
        listening: false,
        thinking: false,
        speaking: false,
      }),
    ).toBe("praise");
    expect(teacherStateOf(base)).toBe("idle");
  });

  it("AC-19g 선생님 상태: 칭찬은 now 가 praiseUntil 앞일 때만이고 닿으면 쉬기다", () => {
    expect(teacherStateOf({ ...base, praiseUntil: 1001 })).toBe("praise");
    expect(teacherStateOf({ ...base, praiseUntil: 1000 })).toBe("idle");
    expect(teacherStateOf({ ...base, praiseUntil: 999 })).toBe("idle");
  });

  it("AC-19g 선생님 상태: 칭찬 끝 시각은 지금 + 설정 초 × 1000 이다", () => {
    expect(praiseUntilOf(5000, 2)).toBe(7000);
    expect(praiseUntilOf(5000, 0.5)).toBe(5500);
    const until = praiseUntilOf(5000, 2);
    expect(teacherStateOf({ ...base, praiseUntil: until, now: 6999 })).toBe(
      "praise",
    );
    expect(teacherStateOf({ ...base, praiseUntil: until, now: 7000 })).toBe(
      "idle",
    );
  });

  it("AC-19g 선생님 상태: 다섯 상태 이름은 쉬기 · 말하기 · 듣기 · 칭찬 · 생각이다", () => {
    expect(TEACHER_STATES).toEqual([
      "idle",
      "speaking",
      "listening",
      "praise",
      "thinking",
    ]);
  });
});

describe("선생님 깜빡임", () => {
  it("AC-19h 선생님 깜빡임: 시작 뒤 깜빡임 시간 동안 사인 곡선이고 그 밖은 0 이다", () => {
    const span = MOTION.blinkSeconds;
    expect(blinkAt({ elapsed: 10, blinkStart: 10, reduced: false })).toBe(0);
    expect(
      blinkAt({ elapsed: 10 + span / 2, blinkStart: 10, reduced: false }),
    ).toBeCloseTo(1, 10);
    expect(blinkAt({ elapsed: span, blinkStart: 0, reduced: false })).toBe(0);
    expect(blinkAt({ elapsed: 12, blinkStart: 10, reduced: false })).toBe(0);
    expect(blinkAt({ elapsed: 5, blinkStart: -10, reduced: false })).toBe(0);
    const mid = blinkAt({
      elapsed: 10 + span / 4,
      blinkStart: 10,
      reduced: false,
    });
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it("AC-19h 선생님 깜빡임: 움직임 줄이기면 늘 0 이다", () => {
    for (const elapsed of [10, 10.05, 10.09, 10.15]) {
      expect(blinkAt({ elapsed, blinkStart: 10, reduced: true })).toBe(0);
    }
  });
});

describe("불러오기 차례 번호", () => {
  it("AC-19i 불러오기 차례: 마지막으로 받은 번호만 지금 차례다", () => {
    const turn = createLoadTurn();
    const first = turn.next();
    expect(turn.isCurrent(first)).toBe(true);
    const second = turn.next();
    expect(second).not.toBe(first);
    expect(turn.isCurrent(first)).toBe(false);
    expect(turn.isCurrent(second)).toBe(true);
  });

  it("AC-19i 불러오기 차례: 따로 만든 차례 번호는 서로 섞이지 않는다", () => {
    const a = createLoadTurn();
    const b = createLoadTurn();
    const n = a.next();
    b.next();
    b.next();
    expect(a.isCurrent(n)).toBe(true);
  });
});
