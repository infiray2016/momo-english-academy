// 조용함 차례 듣기 집계(회화 대화 구조 R spec 설계 6 '세는 기준' · '끄는 잣대' · AC-6 = AC-27f 의 기록 집계 시험, plan 묶음 P6).
// 합성 기록만 쓴다. 칸 이름은 client_listen 의 꼴(dc 의 g · sr · why · rw · as · qa · ql, 인식기 칸 cf · na · int · mx)과 같다.
import { describe, expect, it } from "vitest";
import type {
  ClientListenEntry,
  DiscardNote,
} from "@/core/conversation/client-listen";
import {
  QUIET_FLOWS,
  type QuietOffCriteria,
  type QuietStatsRow,
  quietListenStatsOf,
} from "@/core/speech/quiet-listen-stats";

// 끄는 잣대의 권고값(spec 설계 6). 시험이 넘기는 값이고 모듈에는 기본값이 없다.
const CRITERIA: QuietOffCriteria = {
  minCount: 5,
  marginPoints: 20,
  firstRun: 3,
};

// ── 듣기 요약 ──
const listen = (
  o: string,
  dc?: DiscardNote,
  extra: Partial<ClientListenEntry> = {},
): ClientListenEntry => ({
  o,
  d: 3_000,
  snd: o === "result",
  ...(dc ? { dc } : {}),
  ...extra,
});
const deaf = (dc?: DiscardNote) => listen("deaf", dc);
const heard = (dc?: DiscardNote) => listen("result", dc);
const silent = (dc?: DiscardNote) => listen("error:no-speech", dc);

// 흐름별 dc(spec 설계 6 '흐름별 기대값' 표와 묶음 V 검토 장면).
const DC = {
  deadFirst: { g: "reopen", rw: "quiet", sr: false, ql: false, qa: 40, as: 40 },
  liveThenDead: { g: "reopen", rw: "quiet", sr: false, ql: true, as: 60 },
  liveTwice: { g: "live", rw: "quiet", sr: true, ql: true },
  reopenReadOutside: { g: "reopen", rw: "quiet", sr: true, ql: false },
  selfEnd: {
    g: "live",
    why: "self_end",
    rw: "quiet",
    sr: true,
    ql: false,
    qa: 40,
  },
  hiddenAfterJudge: {
    g: "reopen",
    rw: "hidden",
    sr: false,
    ql: false,
    qa: 120,
  },
  openDead: { g: "discard", sr: false },
  normal: { g: "discard", sr: false },
  helpGap: { g: "discard", sr: true },
  helpLive: { g: "live", sr: true },
} as const satisfies Record<string, DiscardNote>;

// ── 행 ──
const teacher = (
  segment = "talk",
  choice?: QuietStatsRow["choice"],
): QuietStatsRow => ({
  speaker: "tori",
  segment,
  ...(choice === undefined ? {} : { choice }),
});
const said = (
  listens: ClientListenEntry[],
  segment = "talk",
): QuietStatsRow => ({
  speaker: "child",
  segment,
  inputMode: "speech",
  listens,
});
const quiet = (segment = "talk"): QuietStatsRow => ({
  speaker: "child",
  segment,
  inputMode: "quiet",
});
const button = (listens: ClientListenEntry[] = []): QuietStatsRow => ({
  speaker: "child",
  segment: "talk",
  inputMode: "dont_know",
  src: "button",
  listens,
});
const nospeech = (listens: ClientListenEntry[]): QuietStatsRow => ({
  speaker: "child",
  segment: "talk",
  inputMode: "dont_know",
  src: "nospeech",
  listens,
});

/** quiet → 선생님 → 아이(첫 진짜 = first) 한 묶음. */
const afterQuiet = (first: ClientListenEntry): QuietStatsRow[] => [
  quiet(),
  teacher(),
  said([first, heard({ g: "discard", sr: false })]),
];
/** 말한 아이 → 선생님 → 아이(첫 진짜 = first) 한 묶음. */
const afterSpeech = (first: ClientListenEntry): QuietStatsRow[] => [
  said([heard()]),
  teacher(),
  said([first]),
];

describe("세는 기준 세 줄", () => {
  it("AC-27f 세 줄을 고르고 줄마다 o 의 수와 '마이크 안 잡힘' 비율을 낸다", () => {
    const session: QuietStatsRow[] = [
      teacher("greeting"), // 첫 차례: 어느 줄도 아님
      said([heard(DC.normal)], "greeting"),
      teacher("greeting"),
      said([deaf(DC.normal), heard(DC.normal)], "greeting"), // 둘째 줄: 마이크 안 잡힘
      teacher(),
      quiet(),
      teacher(),
      said([deaf(DC.liveThenDead), heard(DC.normal)]), // 첫째 줄: 마이크 안 잡힘
      teacher(),
      button(), // 둘째 줄: 첫 진짜 없음(단추만)
      teacher(),
      said([silent(DC.helpGap)]), // 셋째 줄: 말소리 없음
      teacher(),
      said([heard(DC.normal)]), // 둘째 줄: 들음
    ];
    const stats = quietListenStatsOf([session], CRITERIA);
    expect(stats.afterQuiet).toMatchObject({
      firstReals: 1,
      deaf: 1,
      heard: 0,
      noSpeech: 0,
      other: 0,
      noFirstReal: 0,
      deafRate: 1,
    });
    expect(stats.afterSpeech).toEqual({
      firstReals: 2,
      deaf: 1,
      heard: 1,
      noSpeech: 0,
      other: 0,
      noFirstReal: 1,
      deafRate: 0.5,
    });
    expect(stats.afterHelpReadOutside).toEqual({
      firstReals: 1,
      deaf: 0,
      heard: 0,
      noSpeech: 1,
      other: 0,
      noFirstReal: 0,
      deafRate: 0,
    });
    expect(stats.differencePoints).toBe(50);
  });

  it("AC-27f 결과 종류: deaf 는 마이크 안 잡힘, result 는 들음, no-result · error:no-speech 는 말소리 없음, 그 밖은 기타", () => {
    const session = [
      ...afterSpeech(listen("no-result")),
      ...afterSpeech(listen("error:no-speech")),
      ...afterSpeech(listen("stalled")),
      ...afterSpeech(listen("interrupted:hidden")),
      ...afterSpeech(listen("error:network")),
    ];
    const stats = quietListenStatsOf([session], CRITERIA);
    expect(stats.afterSpeech).toMatchObject({
      firstReals: 5,
      noSpeech: 2,
      other: 3,
      deafRate: 0,
    });
  });

  it("AC-27f 첫째 줄을 흐름 (ㄱ) · (ㄴ) · (ㄴ') 로 가른다(dc.rw quiet 를 먼저 거르고 ql · g · sr 로)", () => {
    const session = [
      ...afterQuiet(heard(DC.deadFirst)),
      ...afterQuiet(heard(DC.liveThenDead)),
      ...afterQuiet(deaf(DC.liveThenDead)),
      ...afterQuiet(deaf(DC.liveTwice)),
    ];
    const { afterQuiet: line } = quietListenStatsOf([session], CRITERIA);
    expect(line.firstReals).toBe(4);
    expect(line.flows.dead_first).toMatchObject({ firstReals: 1, heard: 1 });
    expect(line.flows.live_then_dead).toMatchObject({
      firstReals: 2,
      heard: 1,
      deaf: 1,
      deafRate: 0.5,
    });
    expect(line.flows.live_twice).toMatchObject({ firstReals: 1, deaf: 1 });
  });

  it("AC-27f 표 밖 흐름 둘을 따로 센다: 다시 연 버림 뒤 세션 없이 읽음(g reopen · sr 참) · 조용함 버림이 소리 전에 저절로 끝남(g live · why self_end · ql 거짓)", () => {
    const session = [
      ...afterQuiet(deaf(DC.reopenReadOutside)),
      ...afterQuiet(deaf(DC.selfEnd)),
      ...afterQuiet(heard(DC.selfEnd)),
    ];
    const { afterQuiet: line } = quietListenStatsOf([session], CRITERIA);
    expect(line.flows.reopen_read_outside).toMatchObject({
      firstReals: 1,
      deaf: 1,
    });
    expect(line.flows.self_end_before_sound).toMatchObject({
      firstReals: 2,
      deaf: 1,
      heard: 1,
    });
    expect(line.flows.dead_first.firstReals).toBe(0);
    expect(line.flows.live_twice.firstReals).toBe(0);
  });

  it("AC-27f rw 가 quiet 가 아니면 ql · qa 가 남아 있어도 흐름 셋에 넣지 않는다(판정 뒤 숨김 · 마이크 확인, 열린 죽은 버림에서 받은 quiet, 버림 없는 기기)", () => {
    const session = [
      ...afterQuiet(heard(DC.hiddenAfterJudge)),
      ...afterQuiet(heard(DC.openDead)),
      ...afterQuiet(deaf()),
    ];
    const { afterQuiet: line } = quietListenStatsOf([session], CRITERIA);
    expect(line.firstReals).toBe(3);
    expect(line.flows.dead_first.firstReals).toBe(0);
    expect(line.flows.not_quiet_opened).toMatchObject({
      firstReals: 2,
      heard: 2,
    });
    expect(line.flows.no_discard).toMatchObject({ firstReals: 1, deaf: 1 });
    expect(line.flows.long_rest.firstReals).toBe(0);
    // 흐름의 합은 줄의 첫 진짜 수와 같다.
    const sum = QUIET_FLOWS.reduce((n, f) => n + line.flows[f].firstReals, 0);
    expect(sum).toBe(line.firstReals);
  });

  it("AC-27f 오래 쉰 뒤의 첫 진짜(g rest)는 따로 세고 버림이 열리지 않은 조용함과 섞지 않으며, 끄는 잣대에는 든다", () => {
    const session = [
      ...afterQuiet(deaf({ g: "rest", qa: 30, ql: false })),
      ...afterQuiet(heard({ g: "rest" })),
      ...afterQuiet(deaf(DC.openDead)),
    ];
    const stats = quietListenStatsOf([session], CRITERIA);
    const line = stats.afterQuiet;
    expect(line.flows.long_rest).toMatchObject({
      firstReals: 2,
      deaf: 1,
      heard: 1,
    });
    expect(line.flows.not_quiet_opened).toMatchObject({
      firstReals: 1,
      deaf: 1,
    });
    expect(line).toMatchObject({ firstReals: 3, deaf: 2 });
  });

  it("AC-27f 조용함 차례가 잇달아 오면 마지막 조용함 뒤 아이 차례가 첫째 줄이 되고, quiet 행은 첫 진짜 없음으로 세지 않는다", () => {
    const session: QuietStatsRow[] = [
      teacher(),
      quiet(),
      teacher(),
      quiet(),
      teacher(),
      said([deaf(DC.liveTwice)]),
    ];
    const { afterQuiet: line } = quietListenStatsOf([session], CRITERIA);
    expect(line).toMatchObject({ firstReals: 1, deaf: 1, noFirstReal: 0 });
    expect(line.flows.live_twice.firstReals).toBe(1);
  });

  it("AC-27f 셋째 줄은 단추 '모름' · '더 이야기하기' 뒤 첫 진짜 가운데 g discard · sr 참만 세고, 넓은 줄은 따로 낸다", () => {
    const session: QuietStatsRow[] = [
      teacher(),
      button(),
      teacher(),
      said([deaf(DC.helpGap)]), // 셋째 줄
      teacher(),
      button(),
      teacher(),
      said([deaf(DC.helpLive)]), // 넓은 줄만(g live)
      teacher("talk"), // 마무리 제안
      teacher("more_talk"), // '더 이야기하기' 입구 뒤 선생님 차례
      said([heard(DC.helpGap)], "more_talk"), // 셋째 줄
      teacher("more_talk"),
      nospeech([deaf(DC.helpGap)]),
      teacher("more_talk"),
      said([heard(DC.helpGap)], "more_talk"), // 말소리 없음 '모름' 뒤: 어느 줄도 아님
    ];
    const stats = quietListenStatsOf([session], CRITERIA);
    expect(stats.afterHelpReadOutside).toMatchObject({
      firstReals: 2,
      deaf: 1,
      heard: 1,
    });
    expect(stats.afterHelpAll).toMatchObject({
      firstReals: 3,
      deaf: 2,
      heard: 1,
    });
  });

  it("AC-27f 아이 행 바로 앞 선생님 행의 바로 앞 행 하나로만 가른다(선생님 행을 묶어 걷지 않음)", () => {
    // quiet → 선생님 → 선생님 → 아이: 아이 바로 앞 선생님 행의 앞 행은 선생님 행이라 입구로 읽고, 첫째 줄이 아니다.
    const session: QuietStatsRow[] = [
      teacher(),
      quiet(),
      teacher(),
      teacher(),
      said([deaf(DC.liveTwice)]),
    ];
    const stats = quietListenStatsOf([session], CRITERIA);
    expect(stats.afterQuiet.firstReals).toBe(0);
    expect(stats.afterSpeech.firstReals).toBe(0);
  });

  it("AC-27f 마무리 제안 뒤 '더 이야기하기' 입구(같은 토막)는 셋째 줄로 가고 둘째 줄을 건드리지 않는다(검토 재현 P1)", () => {
    for (const choice of ["suggestion", undefined] as const) {
      const session: QuietStatsRow[] = [
        teacher(),
        said([heard(DC.normal)]),
        teacher("talk", choice), // 마무리 제안
        teacher("talk"), // 입구 뒤 선생님 차례
        said([deaf(DC.helpGap)]),
      ];
      const stats = quietListenStatsOf([session], CRITERIA);
      expect(stats.afterSpeech.firstReals).toBe(0);
      expect(stats.afterHelpReadOutside).toMatchObject({
        firstReals: 1,
        deaf: 1,
      });
      expect(stats.afterHelpAll.firstReals).toBe(1);
    }
  });

  it("AC-27f more_talk 안에서 다시 고른 입구(마무리 차례 뒤)도 셋째 줄로 가고 둘째 줄을 건드리지 않는다(검토 재현 P2)", () => {
    for (const choice of ["closing", undefined] as const) {
      const session: QuietStatsRow[] = [
        teacher("talk", "closing"),
        teacher("more_talk"),
        said([heard(DC.helpGap)], "more_talk"), // 첫 입구 뒤: 셋째 줄
        teacher("more_talk", choice), // more_talk 안의 마무리 차례
        teacher("more_talk"), // 다시 고른 입구 뒤
        said([deaf(DC.helpGap)], "more_talk"),
      ];
      const stats = quietListenStatsOf([session], CRITERIA);
      expect(stats.afterSpeech.firstReals).toBe(0);
      expect(stats.afterHelpReadOutside).toMatchObject({
        firstReals: 2,
        deaf: 1,
        heard: 1,
      });
    }
  });

  it("AC-27f 마무리 물음 뒤 입구(more_talk 로 들어감)는 표지가 있든 없든 셋째 줄이다", () => {
    for (const choice of ["closing", undefined] as const) {
      const session: QuietStatsRow[] = [
        teacher(),
        said([heard(DC.normal)]),
        teacher("talk", choice),
        teacher("more_talk"),
        said([deaf(DC.helpGap)], "more_talk"),
      ];
      const stats = quietListenStatsOf([session], CRITERIA);
      expect(stats.afterHelpReadOutside.firstReals).toBe(1);
      expect(stats.afterSpeech.firstReals).toBe(0);
    }
  });

  it("AC-27f 앞 선생님 행이 고를 차례가 아니라고 표지되면(choice null) 선생님 → 선생님은 어느 줄도 아니다", () => {
    const session: QuietStatsRow[] = [
      teacher(),
      said([heard(DC.normal)]),
      teacher("talk", null),
      teacher("talk"),
      said([deaf(DC.helpGap)]),
    ];
    const stats = quietListenStatsOf([session], CRITERIA);
    expect(stats.afterHelpAll.firstReals).toBe(0);
    expect(stats.afterSpeech.firstReals).toBe(0);
  });

  it("AC-27f 표지가 없고 토막이 바뀌는 선생님 → 선생님(인사 뒤 대화의 첫 차례)은 어느 줄도 아니다", () => {
    const session: QuietStatsRow[] = [
      teacher("greeting"),
      said([heard(DC.normal)], "greeting"),
      teacher("greeting"),
      teacher("talk"),
      said([deaf(DC.helpGap)]),
    ];
    const stats = quietListenStatsOf([session], CRITERIA);
    expect(stats.afterHelpAll.firstReals).toBe(0);
    expect(stats.afterSpeech.firstReals).toBe(0);
    expect(stats.afterQuiet.firstReals).toBe(0);
  });

  it("AC-27f 수업 사이와 대화 토막 밖 행은 잇지 않는다", () => {
    const first: QuietStatsRow[] = [teacher(), quiet()];
    const second: QuietStatsRow[] = [teacher(), said([deaf(DC.liveTwice)])];
    const prep: QuietStatsRow[] = [
      teacher(),
      quiet(),
      teacher("prep"),
      said([deaf(DC.liveTwice)], "prep"),
    ];
    const stats = quietListenStatsOf([first, second, prep], CRITERIA);
    expect(stats.afterQuiet.firstReals).toBe(0);
    expect(stats.afterQuiet.noFirstReal).toBe(0);
  });

  it("AC-27f 첫 진짜 없음: 다음 아이 차례가 듣기 없이 단추만 누른 차례면 그 줄의 첫 진짜 없음으로 센다", () => {
    const session: QuietStatsRow[] = [teacher(), quiet(), teacher(), button()];
    const { afterQuiet: line } = quietListenStatsOf([session], CRITERIA);
    expect(line).toMatchObject({
      firstReals: 0,
      noFirstReal: 1,
      deafRate: null,
    });
  });
});

describe("끄는 잣대", () => {
  /** 첫째 줄 결과 차례(true = 마이크 안 잡힘)와 둘째 줄 결과로 만든 수업 하나. */
  const sessionOf = (
    quietDeaf: readonly boolean[],
    speechDeaf: readonly boolean[],
  ): QuietStatsRow[] => [
    teacher(),
    ...quietDeaf.flatMap((d) =>
      afterQuiet(d ? deaf(DC.liveThenDead) : heard(DC.liveThenDead)),
    ),
    ...speechDeaf.flatMap((d) =>
      afterSpeech(d ? deaf(DC.normal) : heard(DC.normal)),
    ),
  ];

  it("AC-27f 첫째 줄이 다섯 이상이고 차이가 20%포인트를 넘으면 닿는다", () => {
    const stats = quietListenStatsOf(
      [sessionOf([false, false, false, true, true], [false, false, false])],
      CRITERIA,
    );
    expect(stats.differencePoints).toBe(40);
    expect(stats.off).toEqual({
      reached: true,
      byMargin: true,
      byFirstRun: false,
    });
  });

  it("AC-27f 차이가 꼭 20%포인트이면 닿지 않는다(넘어야 닿음)", () => {
    // 첫째 줄 3/5 = 60%, 둘째 줄 2/5 = 40%.
    const stats = quietListenStatsOf(
      [
        sessionOf(
          [false, true, false, true, true],
          [true, false, true, false, false],
        ),
      ],
      CRITERIA,
    );
    expect(stats.differencePoints).toBeCloseTo(20, 9);
    expect(stats.off.byMargin).toBe(false);
    expect(stats.off.reached).toBe(false);
  });

  it("AC-27f 첫째 줄이 다섯 미만이면 차이로는 닿지 않는다", () => {
    const stats = quietListenStatsOf(
      [sessionOf([false, true, true, true], [false, false, false, false])],
      CRITERIA,
    );
    expect(stats.differencePoints).toBe(75);
    expect(stats.off).toEqual({
      reached: false,
      byMargin: false,
      byFirstRun: false,
    });
  });

  it("AC-27f 첫째 줄의 처음 셋이 모두 마이크 안 잡힘이면 다섯 전이어도 닿는다(수업을 넘어 차례대로 셈)", () => {
    const stats = quietListenStatsOf(
      [sessionOf([true, true], []), sessionOf([true], [false])],
      CRITERIA,
    );
    expect(stats.off).toEqual({
      reached: true,
      byMargin: false,
      byFirstRun: true,
    });
    // 셋이 안 되면 닿지 않는다.
    expect(
      quietListenStatsOf([sessionOf([true, true], [false])], CRITERIA).off
        .byFirstRun,
    ).toBe(false);
  });

  it("AC-27f 둘째 줄이 비고 첫째 줄의 처음 셋이 모두 마이크 안 잡힘이면 잣대에 닿는다", () => {
    const stats = quietListenStatsOf(
      [sessionOf([true, true, true], [])],
      CRITERIA,
    );
    expect(stats.afterSpeech.firstReals).toBe(0);
    expect(stats.differencePoints).toBeNull();
    expect(stats.off).toEqual({
      reached: true,
      byMargin: false,
      byFirstRun: true,
    });
  });

  it("AC-27f 둘째 줄이 비면 차이를 내지 않는다(지난 기록의 값을 기준으로 쓰지 않음)", () => {
    const stats = quietListenStatsOf(
      [sessionOf([false, true, false, true, true, true], [])],
      CRITERIA,
    );
    expect(stats.afterSpeech.firstReals).toBe(0);
    expect(stats.differencePoints).toBeNull();
    expect(stats.off.reached).toBe(false);
  });

  it("AC-27f 잣대의 수는 인자로 받는다", () => {
    const sessions = [
      sessionOf([false, false, true, true], [false, false, false]),
    ];
    expect(quietListenStatsOf(sessions, CRITERIA).off.reached).toBe(false);
    expect(
      quietListenStatsOf(sessions, { ...CRITERIA, minCount: 4 }).off.byMargin,
    ).toBe(true);
    expect(
      quietListenStatsOf(sessions, {
        ...CRITERIA,
        minCount: 4,
        marginPoints: 60,
      }).off.byMargin,
    ).toBe(false);
  });

  it("AC-27f 첫째 줄의 모든 흐름이 끄는 잣대에 든다(표 밖 흐름 · rw 가 quiet 가 아닌 것 포함)", () => {
    const session: QuietStatsRow[] = [
      teacher(),
      ...afterQuiet(deaf(DC.selfEnd)),
      ...afterQuiet(deaf(DC.hiddenAfterJudge)),
      ...afterQuiet(deaf(DC.reopenReadOutside)),
    ];
    expect(quietListenStatsOf([session], CRITERIA).off.byFirstRun).toBe(true);
  });
});

describe("인식기 칸(spec 미결 11)", () => {
  it("AC-27f 중간 결과만(int) · 섞인 글(mx) 듣기 수와 인식기 칸이 있는 듣기 수를 낸다", () => {
    const session: QuietStatsRow[] = [
      teacher(),
      said([
        listen("result", undefined, { cf: 0.8, na: 2, int: false }),
        listen("result", undefined, { na: 2, int: true }),
      ]),
      teacher(),
      said([listen("result", undefined, { cf: 0.4, na: 2, mx: true })]),
      teacher(),
      said([listen("deaf"), listen("result")]),
      teacher(),
      nospeech([listen("error:no-speech")]),
    ];
    expect(quietListenStatsOf([session], CRITERIA).recognizer).toEqual({
      results: 4,
      withInfo: 3,
      interimOnly: 1,
      mixed: 1,
    });
  });
});

describe("받는 칸", () => {
  it("AC-27f 집계는 수 칸과 갈래 칸만 쓰고 결과에 받은 값의 글이 남지 않는다", () => {
    const leaky = {
      ...said([deaf(DC.liveTwice)]),
      text: "my dog is happy",
      name: "child-name",
    } as QuietStatsRow;
    const session: QuietStatsRow[] = [teacher(), quiet(), teacher(), leaky];
    const out = JSON.stringify(quietListenStatsOf([session], CRITERIA));
    expect(out).not.toContain("dog");
    expect(out).not.toContain("child-name");
  });
});
