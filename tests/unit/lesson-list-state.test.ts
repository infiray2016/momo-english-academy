// 수업 목록 상태 · 세션 시작 재판정(4절 수업 목록 표 · 3.2 · AC-2b · AC-2d, plan-p10b 파일별 값 1 · 위험 3).
// 같은 ListInput 으로 lessonListState 와 judgeLessonStart 를 맞댄다 — 목록에서 고를 수 있는 것 = 재판정 통과.
import { describe, expect, it } from "vitest";
import {
  judgeLessonStart,
  type LessonCellView,
  type LessonRef,
  type ListInput,
  lessonListState,
  minLessonsOf,
  pastUnits,
  type SessionLite,
  unitGateOf,
} from "@/core/lesson-list/state";
import { UNITS_PER_LEVEL } from "@/core/seed/structure";

const LEVEL = 2;
const UNIT = 2;
const ROUND_START = new Date("2026-10-12T10:00:00+09:00");
const BEFORE_ROUND = new Date("2026-10-05T10:00:00+09:00");
const AFTER = new Date("2026-10-13T10:00:00+09:00");
const ctx = { seedThrough: 6, placed: true };

function cell(
  unit: number,
  kind: LessonRef["kind"],
  lessonNo: number,
  variant = 1,
): LessonCellView {
  return {
    unit,
    kind,
    lessonNo,
    lessonId: `l-${unit}-${kind}-${lessonNo}-${variant}`,
    variant,
    title: `${kind} ${lessonNo}`,
    newWords: [],
    unitWords: [],
    revision: 1,
    correction: 0,
  };
}

/** 단원 하나: 배정 1~3 · 다지기 4~5 · 보강 1~2. */
const unitCells = (unit: number) => [
  cell(unit, "assigned", 1),
  cell(unit, "assigned", 2),
  cell(unit, "assigned", 3),
  cell(unit, "reinforce", 4),
  cell(unit, "reinforce", 5),
  cell(unit, "remedial", 1),
  cell(unit, "remedial", 2),
];

function session(
  over: Partial<SessionLite> & Pick<SessionLite, "ref">,
): SessionLite {
  return {
    id: `s-${Math.random().toString(36).slice(2)}`,
    status: "completed",
    kind: "regular",
    variant: 1,
    startedAt: AFTER,
    ...over,
  };
}

function input(over: Partial<ListInput> = {}): ListInput {
  return {
    area: "reading",
    level: LEVEL,
    unit: UNIT,
    roundStartedAt: ROUND_START,
    currentPassed: false,
    unitsPassed: [1],
    lessonsByUnit: { 1: unitCells(1), 2: unitCells(2), 3: unitCells(3) },
    sessions: [],
    gate: { remainingLessons: 4, remainingDays: 3 },
    state: "normal",
    feedbackReady: [],
    remedialIssued: [],
    practice: [],
    reviewDue: false,
    unitsPerLevel: UNITS_PER_LEVEL,
    ...over,
  };
}

const ref = (unit: number, kind: LessonRef["kind"], lessonNo: number) => ({
  unit,
  kind,
  lessonNo,
});

describe("수업 목록", () => {
  it("AC-2b 수업 목록: 지금 단원의 남은 수업 가운데 셋째 것을 먼저 고를 수 있고 다음 단원은 통과 전에는 고를 수 없다", () => {
    const view = lessonListState(input());
    const third = view.current?.front[2];
    expect(third?.ref).toEqual(ref(UNIT, "assigned", 3));
    expect(third?.done).toBe(false);
    expect(
      judgeLessonStart(
        input(),
        { level: LEVEL, ref: ref(UNIT, "assigned", 3) },
        ctx,
      ),
    ).toMatchObject({ ok: true, kind: "regular", variantRule: "profile" });
    // 다음 단원은 잠긴 한 장뿐이고 그 수업은 재판정이 거부한다
    expect(view.lockedNext?.unit).toBe(UNIT + 1);
    expect(
      judgeLessonStart(
        input(),
        { level: LEVEL, ref: ref(UNIT + 1, "assigned", 1) },
        ctx,
      ),
    ).toEqual({ ok: false, reason: "locked_unit" });
  });

  it("AC-2d 수업 목록 첫 화면: 지금 단원 묶음(배정 앞줄 · 다지기 뒷줄) · 잠긴 다음 단원 한 장 · '지난 수업 다시 하기' 한 장만", () => {
    const view = lessonListState(
      input({
        sessions: [
          session({ ref: ref(UNIT, "assigned", 1) }),
          // 앞 회차에서 끝낸 수업은 이 회차의 '끝냄'이 아니다
          session({ ref: ref(UNIT, "assigned", 2), startedAt: BEFORE_ROUND }),
        ],
      }),
    );
    expect(view.band).toEqual({ level: LEVEL, unit: UNIT });
    expect(
      view.current?.front.map((l) => [l.ref.kind, l.ref.lessonNo, l.done]),
    ).toEqual([
      ["assigned", 1, true],
      ["assigned", 2, false],
      ["assigned", 3, false],
    ]);
    expect(view.current?.back.map((l) => [l.ref.kind, l.ref.lessonNo])).toEqual(
      [
        ["reinforce", 4],
        ["reinforce", 5],
      ],
    );
    // 발급 안 된 보강은 보이지 않는다
    expect(view.current?.front.some((l) => l.ref.kind === "remedial")).toBe(
      false,
    );
    expect(view.lockedNext).toEqual({
      unit: UNIT + 1,
      line: { kind: "lessons", n: 4 },
    });
    expect(view.past).toBe(true);
    expect(view.top).toEqual([]);
    expect(view.practice).toEqual([]);
    expect(view.notice).toBeNull();
    // 지난 단원이 없으면 '지난 수업 다시 하기'도 없다 · 다섯째 단원이면 잠긴 자리는 비운다(정할 것 ㅎ)
    expect(lessonListState(input({ unitsPassed: [] })).past).toBe(false);
    expect(
      lessonListState(
        input({
          unit: UNITS_PER_LEVEL,
          lessonsByUnit: { [UNITS_PER_LEVEL]: unitCells(UNITS_PER_LEVEL) },
        }),
      ).lockedNext,
    ).toBeNull();
    // 받은 첫 단원 칸의 '여기부터 해요'는 남은 배정 가운데 가장 낮은 번호
    expect(lessonListState(input()).hereStart).toEqual({
      kind: "lesson",
      ref: ref(UNIT, "assigned", 1),
    });
  });

  it("AC-2d 하던 수업 · 첨삭 보기 · 보강이 함께 있으면 '여기부터 해요'는 하던 수업 하나에만 붙는다", () => {
    const going = session({
      id: "s-going",
      status: "in_progress",
      ref: ref(UNIT, "assigned", 2),
    });
    const both = input({
      sessions: [going],
      feedbackReady: [ref(UNIT, "assigned", 1)],
      remedialIssued: [ref(UNIT, "remedial", 1)],
      levelTest: { ready: true },
    });
    const view = lessonListState(both);
    expect(view.hereStart).toEqual({ kind: "resume", sessionId: "s-going" });
    expect(view.top.map((t) => t.kind)).toEqual([
      "resume",
      "feedback",
      "level_test",
    ]);
    // 하던 수업이 없으면 첨삭 보기 → 단계 평가 → 보강 → 남은 배정 → 남은 다지기 차례
    expect(lessonListState({ ...both, sessions: [] }).hereStart).toEqual({
      kind: "feedback",
      ref: ref(UNIT, "assigned", 1),
    });
    expect(
      lessonListState({ ...both, sessions: [], feedbackReady: [] }).hereStart,
    ).toEqual({ kind: "level_test" });
    expect(
      lessonListState({
        ...both,
        sessions: [],
        feedbackReady: [],
        levelTest: undefined,
      }).hereStart,
    ).toEqual({ kind: "lesson", ref: ref(UNIT, "remedial", 1) });
    const allAssignedDone = [1, 2, 3].map((n) =>
      session({ ref: ref(UNIT, "assigned", n) }),
    );
    expect(
      lessonListState(input({ sessions: allAssignedDone })).hereStart,
    ).toEqual({
      kind: "lesson",
      ref: ref(UNIT, "reinforce", 4),
    });
    // 보강은 발급되면 앞줄 맨 앞에 '보강' 표시로
    const front = lessonListState(both).current?.front ?? [];
    expect(front[0]).toMatchObject({
      ref: ref(UNIT, "remedial", 1),
      remedial: true,
    });
  });

  it("AC-2d 잠긴 다음 단원은 남은 조건 하나를 한 줄로 — 학습일만 모자라면 '내일 이 단원 수업을 또 하면 열려요(앞으로 n일)'", () => {
    const line = (gate: ListInput["gate"]) =>
      lessonListState(input({ gate })).lockedNext?.line;
    expect(line({ remainingLessons: 2, remainingDays: 3 })).toEqual({
      kind: "lessons",
      n: 2,
    });
    expect(line({ remainingLessons: 0, remainingDays: 3 })).toEqual({
      kind: "days",
      n: 3,
    });
    expect(
      line({
        remainingLessons: 0,
        remainingDays: 0,
        wordsShort: true,
        scoreShort: true,
      }),
    ).toEqual({ kind: "words" });
    expect(
      line({ remainingLessons: 0, remainingDays: 0, scoreShort: true }),
    ).toEqual({
      kind: "score",
    });
    expect(line({ remainingLessons: 0, remainingDays: 0 })).toBeNull();
  });

  it("AC-2d 통과한 단원에서 하지 않은 수업은 '안 해 본 수업' 표시로 열린다", () => {
    const sessions = [
      session({ ref: ref(1, "assigned", 1), startedAt: BEFORE_ROUND }),
    ];
    const items = pastUnits(input({ sessions }), 1);
    expect(items.map((i) => [i.ref.kind, i.ref.lessonNo, i.mark])).toEqual([
      ["assigned", 1, "retry"],
      ["assigned", 2, "untried"],
      ["assigned", 3, "untried"],
      ["reinforce", 4, "untried"],
      ["reinforce", 5, "untried"],
    ]);
    expect(
      judgeLessonStart(
        input({ sessions }),
        { level: LEVEL, ref: ref(1, "assigned", 2) },
        ctx,
      ),
    ).toMatchObject({ ok: true, kind: "untried", variantRule: "profile" });
    expect(
      judgeLessonStart(
        input({ sessions }),
        { level: LEVEL, ref: ref(1, "assigned", 1) },
        ctx,
      ),
    ).toMatchObject({ ok: true, kind: "retry", variantRule: "first_session" });
  });
});

describe("세션 시작 재판정", () => {
  it("세션 틀: 목록에서 고를 수 있는 수업은 모두 재판정을 지나고 그 밖은 까닭과 함께 거부된다", () => {
    const going = session({
      id: "s-going",
      status: "in_progress",
      ref: ref(UNIT, "assigned", 2),
    });
    const base = input({
      sessions: [going, session({ ref: ref(UNIT, "assigned", 1) })],
      remedialIssued: [ref(UNIT, "remedial", 2)],
    });
    const view = lessonListState(base);
    const offered = [
      ...(view.current?.front ?? []),
      ...(view.current?.back ?? []),
      ...base.unitsPassed.flatMap((u) => pastUnits(base, u)),
    ];
    expect(offered.length).toBeGreaterThan(0);
    for (const item of offered) {
      const judged = judgeLessonStart(
        base,
        { level: LEVEL, ref: item.ref },
        ctx,
      );
      expect(judged.ok, JSON.stringify(item.ref)).toBe(true);
    }
    // 하던 수업 그 칸은 이어 하기, 다른 칸은 하던 세션을 닫자고 알린다
    expect(
      judgeLessonStart(
        base,
        { level: LEVEL, ref: ref(UNIT, "assigned", 2) },
        ctx,
      ),
    ).toMatchObject({
      ok: true,
      resume: "s-going",
    });
    expect(
      judgeLessonStart(
        base,
        { level: LEVEL, ref: ref(UNIT, "assigned", 3) },
        ctx,
      ),
    ).toMatchObject({
      ok: true,
      kind: "regular",
      abort: "s-going",
    });
    // 이 회차에서 끝낸 정규 수업은 다시 하기 · 처음 변형
    expect(
      judgeLessonStart(
        base,
        { level: LEVEL, ref: ref(UNIT, "assigned", 1) },
        ctx,
      ),
    ).toMatchObject({
      ok: true,
      kind: "retry",
      variantRule: "first_session",
    });
    // 발급된 보강은 보강, 발급 안 된 보강은 거부
    expect(
      judgeLessonStart(
        base,
        { level: LEVEL, ref: ref(UNIT, "remedial", 2) },
        ctx,
      ),
    ).toMatchObject({
      ok: true,
      kind: "remedial",
    });
    expect(
      judgeLessonStart(
        base,
        { level: LEVEL, ref: ref(UNIT, "remedial", 1) },
        ctx,
      ),
    ).toEqual({
      ok: false,
      reason: "not_issued",
    });
    // 배치 전 · 시드 범위 밖 · 다른 단계 · 없는 칸
    expect(
      judgeLessonStart(
        base,
        { level: LEVEL, ref: ref(UNIT, "assigned", 1) },
        { ...ctx, placed: false },
      ),
    ).toEqual({
      ok: false,
      reason: "not_placed",
    });
    expect(
      judgeLessonStart(
        base,
        { level: ctx.seedThrough + 1, ref: ref(1, "assigned", 1) },
        ctx,
      ),
    ).toEqual({ ok: false, reason: "beyond_seed" });
    expect(
      judgeLessonStart(
        base,
        { level: LEVEL - 1, ref: ref(1, "assigned", 1) },
        ctx,
      ),
    ).toEqual({
      ok: false,
      reason: "other_level",
    });
    expect(
      judgeLessonStart(
        base,
        { level: LEVEL, ref: ref(UNIT, "assigned", 9) },
        ctx,
      ),
    ).toEqual({
      ok: false,
      reason: "unknown",
    });
  });

  it("세션 틀: 부모 확인 대기(지금 단원 통과 전)면 지금 단원 묶음 대신 4절 안내 · 잠긴 줄 없음 · 지금 단원의 새 수업은 열지 않는다", () => {
    const base = input({
      state: "parent_check",
      sessions: [session({ ref: ref(UNIT, "assigned", 1) })],
    });
    const view = lessonListState(base);
    expect(view.notice).toBe("parent_check");
    expect(view.current).toBeNull();
    expect(view.hereStart).toBeNull();
    // 열 조건은 부모가 정한다 — 잠긴 다음 단원 한 줄을 보이지 않는다(컨트롤러 해석, 검토 review-p10-4-code I-1)
    expect(view.lockedNext).toEqual({ unit: UNIT + 1, line: null });
    expect(
      judgeLessonStart(
        base,
        { level: LEVEL, ref: ref(UNIT, "assigned", 2) },
        ctx,
      ),
    ).toEqual({ ok: false, reason: "paused" });
    expect(
      judgeLessonStart(
        base,
        { level: LEVEL, ref: ref(UNIT, "assigned", 1) },
        ctx,
      ),
    ).toMatchObject({ ok: true, kind: "retry" });
    expect(
      judgeLessonStart(base, { level: LEVEL, ref: ref(1, "assigned", 1) }, ctx),
    ).toMatchObject({ ok: true });
  });

  it("세션 틀: 지금 단원을 통과한 상태(다음 단계 준비 중 · 졸업 · 단계 평가 대기)에서 목록의 수업은 모두 재판정을 지나고 안 한 수업은 안 해 본 수업이다", () => {
    const passedStates: Partial<ListInput>[] = [
      { state: "next_level_pending" },
      { state: "graduated" },
      { state: "normal", levelTest: { ready: true } },
    ];
    for (const over of passedStates) {
      const going = session({
        id: "s-going",
        status: "in_progress",
        ref: ref(UNIT, "reinforce", 5),
      });
      for (const sessions of [
        [session({ ref: ref(UNIT, "assigned", 1) })],
        [session({ ref: ref(UNIT, "assigned", 1) }), going],
      ]) {
        const base = input({ ...over, currentPassed: true, sessions });
        const view = lessonListState(base);
        expect(view.current, JSON.stringify(over)).not.toBeNull();
        const items = [
          ...(view.current?.front ?? []),
          ...(view.current?.back ?? []),
        ];
        for (const item of items) {
          const judged = judgeLessonStart(
            base,
            { level: LEVEL, ref: item.ref },
            ctx,
          );
          expect(
            judged.ok,
            `${JSON.stringify(over)} ${JSON.stringify(item.ref)}`,
          ).toBe(true);
          if (judged.ok && !item.inProgress) {
            expect(judged.kind).toBe(item.done ? "retry" : "untried");
          }
          expect(item.untried === true).toBe(!item.done);
        }
        // 잠긴 줄이 없고, '여기부터 해요'는 하던 수업 · 단계 평가만(남은 정규 수업은 후보가 아님)
        expect(view.lockedNext?.line ?? null).toBeNull();
        const here = view.hereStart?.kind ?? null;
        if (sessions.includes(going)) expect(here).toBe("resume");
        else expect(here).toBe(over.levelTest?.ready ? "level_test" : null);
      }
    }
  });

  it("세션 틀: 지금 단원을 통과한 뒤에는 앞 회차에 끝낸 수업도 끝낸 수업이고 다시 하기로 연다(새 수업 별을 두 번 주지 않게)", () => {
    // 앞 회차(회차 시작 전)에 끝낸 배정 1 — 통과 전에는 이 회차의 수업이 아니라 정규로 다시 열리지만,
    // 통과한 뒤에는 지난 단원과 같게 '끝낸 적 있음'이라 다시 하기다(검토 review-p10-fix3-code N-1)
    const earlier = session({
      ref: ref(UNIT, "assigned", 1),
      startedAt: BEFORE_ROUND,
      completedAt: BEFORE_ROUND,
    });
    const before = input({ sessions: [earlier] });
    expect(
      judgeLessonStart(
        before,
        { level: LEVEL, ref: ref(UNIT, "assigned", 1) },
        ctx,
      ),
    ).toMatchObject({ ok: true, kind: "regular" });
    const passed = input({ sessions: [earlier], currentPassed: true });
    expect(
      judgeLessonStart(
        passed,
        { level: LEVEL, ref: ref(UNIT, "assigned", 1) },
        ctx,
      ),
    ).toMatchObject({ ok: true, kind: "retry" });
    const item = [...(lessonListState(passed).current?.front ?? [])].find(
      (i) => i.ref.kind === "assigned" && i.ref.lessonNo === 1,
    );
    expect(item?.done).toBe(true);
    expect(item?.untried).toBeUndefined();
  });

  it("단어 익히기(practice) 상태에서는 잠긴 다음 단원 한 줄을 다시 쓰지 않는다", () => {
    const view = lessonListState(
      input({
        state: "practice",
        gate: { remainingLessons: 0, remainingDays: 0, wordsShort: true },
      }),
    );
    expect(view.lockedNext).toEqual({ unit: UNIT + 1, line: null });
  });

  it("이 회차에서 끝냄은 끝낸 시각으로 가른다 — 회차 시작 전에 시작해 뒤에 끝낸 세션은 이 회차에서 끝낸 것이다", () => {
    const view = lessonListState(
      input({
        sessions: [
          session({
            ref: ref(UNIT, "assigned", 1),
            startedAt: BEFORE_ROUND,
            completedAt: AFTER,
          }),
          session({
            ref: ref(UNIT, "assigned", 2),
            startedAt: BEFORE_ROUND,
            completedAt: BEFORE_ROUND,
          }),
        ],
      }),
    );
    expect(view.current?.front.map((l) => l.done)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe("잠긴 단원 수", () => {
  it("잠긴 단원 수: 최소 수업 수는 배정 수와 복사본 unit.min_lessons 가운데 큰 값이고 쓰기 6단계부터는 level_specs frame.minLessons 를 쓴다", () => {
    expect(
      minLessonsOf({
        area: "reading",
        level: 1,
        assignedCount: 5,
        snapshotMinLessons: 6,
      }),
    ).toBe(6);
    expect(
      minLessonsOf({
        area: "reading",
        level: 1,
        assignedCount: 5,
        snapshotMinLessons: 3,
      }),
    ).toBe(5);
    expect(
      minLessonsOf({
        area: "writing",
        level: 6,
        assignedCount: 2,
        snapshotMinLessons: 9,
        frameMinLessons: 5,
      }),
    ).toBe(5);
    expect(
      minLessonsOf({
        area: "writing",
        level: 5,
        assignedCount: 2,
        snapshotMinLessons: 9,
        frameMinLessons: 5,
      }),
    ).toBe(9);
    expect(
      minLessonsOf({
        area: "reading",
        level: 6,
        assignedCount: 2,
        snapshotMinLessons: 9,
        frameMinLessons: 5,
      }),
    ).toBe(9);
  });

  it("잠긴 단원 수: 남은 수업 수는 이 회차에서 끝낸 정규 수업만 빼고(다시 하기 · 보강 아님), 학습일은 정규 · 보강 · 연습 · 다시 하기를 끝낸 서로 다른 날을 센다", () => {
    const at = (day: string) => new Date(`${day}T12:00:00+09:00`);
    const s = (
      kind: SessionLite["kind"],
      day: string,
      unit = UNIT,
      started = at(day),
    ) =>
      session({
        ref: ref(unit, "assigned", 1),
        kind,
        startedAt: started,
        completedAt: at(day),
        learningDay: day,
      });
    const gate = (sessions: SessionLite[]) =>
      unitGateOf({
        unit: UNIT,
        roundStartedAt: ROUND_START,
        minLessons: 6,
        minDays: 4,
        sessions,
      });
    expect(gate([s("regular", "2026-10-13")])).toEqual({
      remainingLessons: 5,
      remainingDays: 3,
    });
    // 다시 하기는 수업 수에 안 들고 학습일에는 든다
    expect(
      gate([s("regular", "2026-10-13"), s("retry", "2026-10-14")]),
    ).toEqual({
      remainingLessons: 5,
      remainingDays: 2,
    });
    // 보강 · 연습은 학습일에만, 진행 중 · 다른 단원 · 회차 전에 끝낸 것은 안 든다
    expect(
      gate([
        s("remedial", "2026-10-13"),
        s("practice", "2026-10-15"),
        { ...s("regular", "2026-10-16"), status: "in_progress" },
        s("regular", "2026-10-13", UNIT - 1),
        s("regular", "2026-10-11"),
      ]),
    ).toEqual({ remainingLessons: 6, remainingDays: 2 });
    // 회차 전에 시작해 뒤에 끝낸 정규 수업은 든다
    expect(gate([s("regular", "2026-10-13", UNIT, at("2026-10-10"))])).toEqual({
      remainingLessons: 5,
      remainingDays: 3,
    });
    // 넘치면 0
    expect(
      gate(
        Array.from({ length: 8 }, (_, i) =>
          s("regular", `2026-10-${13 + (i % 4)}`),
        ),
      ),
    ).toEqual({ remainingLessons: 0, remainingDays: 0 });
  });
});

describe("쓰기 두 세션(plan-p11b 값 11 · 정할 것 ㄱ · C79)", () => {
  const W = { area: "writing" as const, level: 6 };
  const a1 = ref(UNIT, "assigned", 1);
  const a2 = ref(UNIT, "assigned", 2);
  const draft = (over: Partial<SessionLite> = {}) =>
    session({
      ref: a1,
      writingPart: "draft",
      completedAt: AFTER,
      unit: UNIT,
      learningDay: "2026-10-13",
      ...over,
    });
  const drafts = (
    state: "awaiting" | "ready" | "failed",
  ): NonNullable<ListInput["writingDrafts"]> => [
    {
      ref: a1,
      variant: 1,
      draftSessionId: "s-draft",
      lessonRowId: "row-a1",
      kind: "regular",
      state,
    },
  ];

  it("목록: 첫 세션만 끝난 칸은 남은 수업이고 둘째 세션이 끝나야 끝낸 수업이며 잠긴 단원 수는 첫 세션으로 센다", () => {
    // 첫 세션만 끝남(첨삭 대기): 남은 수업 — 완료 표시 없음, 다시 하기가 아님
    const onlyDraft = input({
      ...W,
      sessions: [draft({ id: "s-draft" })],
      writingDrafts: drafts("awaiting"),
    });
    const item = lessonListState(onlyDraft).current?.front.find(
      (i) => i.ref.lessonNo === 1,
    );
    expect(item?.done).toBe(false);
    // 첨삭 대기 칸은 '여기부터 해요' 새 수업 후보가 아니다(다음 남은 수업으로)
    expect(lessonListState(onlyDraft).hereStart).toEqual({
      kind: "lesson",
      ref: a2,
    });
    // 첨삭이 옴: 맨 위 '첨삭 보기'(그 수업 행) · 여기부터 해요는 하던 수업 다음으로 첨삭
    const ready = input({
      ...W,
      sessions: [draft({ id: "s-draft" })],
      writingDrafts: drafts("ready"),
      feedbackReady: [a1],
    });
    const view = lessonListState(ready);
    expect(view.top).toContainEqual({
      kind: "feedback",
      ref: a1,
      lessonId: "row-a1",
    });
    expect(view.hereStart).toEqual({ kind: "feedback", ref: a1 });
    // 둘째 세션이 끝나면 끝낸 수업 — 다시 고르면 다시 하기
    const both = input({
      ...W,
      sessions: [
        draft({ id: "s-draft" }),
        session({
          ref: a1,
          writingPart: "rewrite",
          completedAt: AFTER,
          unit: UNIT,
          learningDay: "2026-10-14",
        }),
      ],
    });
    expect(
      lessonListState(both).current?.front.find((i) => i.ref.lessonNo === 1)
        ?.done,
    ).toBe(true);
    expect(judgeLessonStart(both, { level: 6, ref: a1 }, ctx)).toMatchObject({
      ok: true,
      kind: "retry",
    });
    // 잠긴 단원 수: 수업 수는 첫 세션(둘째 세션은 빼고), 학습일은 두 세션 모두
    const gate = unitGateOf({
      unit: UNIT,
      roundStartedAt: ROUND_START,
      minLessons: 5,
      minDays: 5,
      sessions: both.sessions,
    });
    expect(gate).toEqual({ remainingLessons: 4, remainingDays: 3 });
  });

  it("시작 판정: 첨삭이 오면 둘째 세션(그 첫 세션의 수업 행 · 종류), 대기면 feedback_pending, 못 함이면 새 첫 세션이다", () => {
    const base = { ...W, sessions: [draft({ id: "s-draft" })] };
    expect(
      judgeLessonStart(
        input({ ...base, writingDrafts: drafts("ready"), feedbackReady: [a1] }),
        { level: 6, ref: a1 },
        ctx,
      ),
    ).toMatchObject({
      ok: true,
      kind: "regular",
      part: "rewrite",
      draftSessionId: "s-draft",
      lessonRowId: "row-a1",
    });
    expect(
      judgeLessonStart(
        input({ ...base, writingDrafts: drafts("awaiting") }),
        { level: 6, ref: a1 },
        ctx,
      ),
    ).toEqual({
      ok: false,
      reason: "feedback_pending",
      draftSessionId: "s-draft",
    });
    const failed = judgeLessonStart(
      input({ ...base, writingDrafts: drafts("failed") }),
      { level: 6, ref: a1 },
      ctx,
    );
    expect(failed).toMatchObject({ ok: true, kind: "regular" });
    expect(failed).not.toHaveProperty("part");
    // 하던 둘째 세션은 이어 한다
    const going = session({
      id: "s-rewrite",
      ref: a1,
      status: "in_progress",
      writingPart: "rewrite",
    });
    expect(
      judgeLessonStart(
        input({
          ...base,
          sessions: [...base.sessions, going],
          writingDrafts: drafts("ready"),
          feedbackReady: [a1],
        }),
        { level: 6, ref: a1 },
        ctx,
      ),
    ).toMatchObject({ ok: true, resume: "s-rewrite" });
  });
});
