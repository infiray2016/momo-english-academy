// 선생님 줄 단추 상태 · 이야기 듣기 셈 · 칩 켜짐 · 띠 나누기(가르치고 배우는 수업 plan 묶음 라-1 · spec 설계 5 · 10 · 15절 AC-N20).
// 단추는 읽기가 끝나면(들려줌 · 끝 알림 없음) 밝고, 감시가 넘긴 들려주지 못함이면 밝고 안내 한 줄, 읽지 않음(ko-KR 없음 · read_ko 끔)이면
// 바로 밝고 안내 없음, 읽는 중이면 흐리다. 이야기의 소리 없는 들려주기는 '다시 듣기' 횟수에 세지 않는다(C179 (2)).
import { describe, expect, it } from "vitest";
import {
  chipLightOf,
  chipSegmentsOf,
  chipsLitOf,
  highlightSegmentsOf,
  lineProgressOf,
  STORY_REPLAYS,
  storyPlaysOf,
  type TeachLineResult,
  teachLineStateOf,
} from "@/core/session/teach-line";

const played: TeachLineResult = { kind: "ended", heard: "played" };
const noEnd: TeachLineResult = { kind: "ended", heard: "no_end" };
const notPlayed: TeachLineResult = { kind: "ended", heard: "not_played" };
const noKo: TeachLineResult = { kind: "skipped", reason: "no_ko_voice" };
const readKoOff: TeachLineResult = { kind: "skipped", reason: "read_ko_off" };

describe("선생님 줄 단추 상태(AC-N20 단위)", () => {
  it("AC-N20 읽는 중에는 흐리고 다음 토막을 읽는다", () => {
    expect(teachLineStateOf(2, [])).toEqual({
      bright: false,
      notice: false,
      next: 0,
    });
    expect(teachLineStateOf(2, [played])).toEqual({
      bright: false,
      notice: false,
      next: 1,
    });
  });

  it("AC-N20 읽기가 끝나면(들려줌 · 끝 알림 없음) 밝고 안내가 없다", () => {
    expect(teachLineStateOf(2, [played, played])).toEqual({
      bright: true,
      notice: false,
      next: undefined,
    });
    expect(teachLineStateOf(2, [noEnd, played])).toEqual({
      bright: true,
      notice: false,
      next: undefined,
    });
  });

  it("AC-N20 감시가 넘긴 들려주지 못함이면 읽기를 멈추고 밝히며 안내 한 줄을 띄운다", () => {
    expect(teachLineStateOf(2, [notPlayed])).toEqual({
      bright: true,
      notice: true,
      next: undefined,
    });
    // 시작 전 오류 · 읽을 수 없는 기기도 들려주지 못함(pace speakHeardOutcomeOf)
    expect(
      teachLineStateOf(2, [{ kind: "error", code: "x", started: false }]),
    ).toMatchObject({ bright: true, notice: true });
    expect(teachLineStateOf(1, [{ kind: "unsupported" }])).toMatchObject({
      bright: true,
      notice: true,
    });
    // 시작 뒤 오류는 끝 알림 없음 — 소리는 났다
    expect(
      teachLineStateOf(1, [{ kind: "error", code: "x", started: true }]),
    ).toEqual({ bright: true, notice: false, next: undefined });
  });

  it("AC-N20 ko-KR 목소리가 없거나 read_ko 끔(skipped)이면 바로 밝고 안내가 없으며, 영어 토막은 이어 읽는다", () => {
    expect(teachLineStateOf(2, [noKo])).toEqual({
      bright: true,
      notice: false,
      next: 1,
    });
    expect(teachLineStateOf(2, [readKoOff, played])).toEqual({
      bright: true,
      notice: false,
      next: undefined,
    });
    expect(teachLineStateOf(1, [readKoOff])).toEqual({
      bright: true,
      notice: false,
      next: undefined,
    });
  });

  it("AC-N20 다른 읽기가 끊으면(cancelled) 그 줄은 거기서 끝나 밝고 안내가 없다", () => {
    expect(teachLineStateOf(2, [{ kind: "cancelled" }])).toEqual({
      bright: true,
      notice: false,
      next: undefined,
    });
  });

  it("AC-N20 읽을 토막이 없으면 바로 밝다", () => {
    expect(teachLineStateOf(0, [])).toEqual({
      bright: true,
      notice: false,
      next: undefined,
    });
  });
});

describe("이야기 화면 들려주기 셈(AC-N20 단위 · C179 (2))", () => {
  it("AC-N20 저절로 한 번 들은 뒤 '다시 듣기'가 한 번 남고, 쓰면 없어진다", () => {
    expect(STORY_REPLAYS).toBe(1);
    expect(storyPlaysOf([], true)).toEqual({
      heard: false,
      replayed: false,
      replayLeft: false,
      nextBright: false,
    });
    expect(storyPlaysOf([played], false)).toEqual({
      heard: true,
      replayed: false,
      replayLeft: true,
      nextBright: true,
    });
    expect(storyPlaysOf([played, played], false)).toEqual({
      heard: true,
      replayed: true,
      replayLeft: false,
      nextBright: true,
    });
  });

  it("AC-N20 소리 없이 넘어간 들려주기는 '다시 듣기' 횟수에 세지 않고 '다시 듣기'를 살려 둔다", () => {
    expect(storyPlaysOf([notPlayed], false)).toEqual({
      heard: false,
      replayed: false,
      replayLeft: true,
      nextBright: true,
    });
    expect(storyPlaysOf([notPlayed, notPlayed, played], false)).toEqual({
      heard: true,
      replayed: false,
      replayLeft: true,
      nextBright: true,
    });
  });

  it("AC-N20 저절로 들려주기 전에는 '다시 듣기' · '다음'이 흐리다", () => {
    expect(storyPlaysOf([], false)).toMatchObject({
      replayLeft: false,
      nextBright: false,
    });
  });

  it("AC-N20 들려주는 동안은 '다시 듣기' · '다음'이 흐리다", () => {
    expect(storyPlaysOf([played], true)).toMatchObject({
      replayLeft: false,
      nextBright: false,
    });
  });
});

describe("칩 · 띠 나누기(AC-3g 본보기 · 같이 해 보기 조각)", () => {
  it("AC-3g 칩 글을 문장에서 차례로 찾아(대소문자 무시) 나누고, 문장의 글자를 그대로 쓴다", () => {
    expect(
      chipSegmentsOf("No, they drink water.", [
        { text: "They" },
        { text: "drink" },
        { text: "water" },
      ]),
    ).toEqual([
      { at: 0, text: "No, ", chip: undefined },
      { at: 4, text: "they", chip: 0 },
      { at: 8, text: " ", chip: undefined },
      { at: 9, text: "drink", chip: 1 },
      { at: 14, text: " ", chip: undefined },
      { at: 15, text: "water", chip: 2 },
      { at: 20, text: ".", chip: undefined },
    ]);
    // 같은 낱말이 두 번(wash) — 앞에서부터 차례로
    const two = chipSegmentsOf("I wash my face. They wash the dog.", [
      { text: "I" },
      { text: "wash" },
      { text: "my face" },
      { text: "They" },
      { text: "wash" },
      { text: "the dog" },
    ]);
    expect(two?.filter((s) => s.chip !== undefined).map((s) => s.text)).toEqual(
      ["I", "wash", "my face", "They", "wash", "the dog"],
    );
    // 마침표 칩
    expect(
      chipSegmentsOf("The classroom is big.", [
        { text: "The classroom" },
        { text: "is" },
        { text: "big" },
        { text: "." },
      ])?.at(-1),
    ).toEqual({ at: 20, text: ".", chip: 3 });
  });

  it("AC-3g 칩 글을 차례대로 찾지 못하면 나누지 않는다(undefined — 조각이 칩 줄만 따로 그린다)", () => {
    expect(chipSegmentsOf("We eat cake.", [{ text: "lunch" }])).toBeUndefined();
    expect(
      chipSegmentsOf("We eat cake.", [{ text: "cake" }, { text: "We" }]),
    ).toBeUndefined();
    // 낱말 안('This' 의 is · 'Tim' 의 i)은 칩 자리가 아니다
    expect(
      chipSegmentsOf("This is Tim.", [{ text: "is" }])?.find(
        (s) => s.chip === 0,
      ),
    ).toEqual({ at: 5, text: "is", chip: 0 });
    expect(chipSegmentsOf("This is Tim.", [{ text: "is" }])?.[0]).toEqual({
      at: 0,
      text: "This ",
      chip: undefined,
    });
  });

  it("AC-3g 칩은 선생님 한 줄에 그 이름이 나오는 차례로 켜지고, 나오지 않는 칩은 끝에 켜진다", () => {
    const line = "하는 일 말을 찾아요. 앞은 누가, 뒤는 무엇이에요.";
    const name = { who: "누가", do: "하는 일", what: "무엇" } as const;
    const marks = chipLightOf(
      [{ role: "who" }, { role: "do" }, { role: "what" }],
      line,
      (role) => name[role as keyof typeof name],
    );
    expect(marks[1]).toBe(0);
    expect(marks[0]).toBeGreaterThan(0);
    expect(marks[2]).toBeGreaterThan(marks[0] ?? 0);
    expect(marks[2]).toBeLessThan(1);
    // 'is' 는 낱말 경계로만 찾는다(this 안의 is 는 아님)
    const writing = chipLightOf(
      [{ role: "thing" }, { role: "is" }, { role: "end" }],
      "this 말고 '교실이 커요'는 무엇, is, 어때요 차례로 놓아요.",
      (role) => ({ thing: "무엇", is: "is", end: "마침표" })[role] ?? role,
    );
    expect(writing[0]).toBeLessThan(writing[1] ?? 0);
    expect(writing[1]).toBeGreaterThan(0.3);
    expect(writing[2]).toBe(1);
  });

  it("AC-3g 줄을 읽기 전에는 칩이 꺼져 있고, 읽는 만큼 켜지며, 끝나면 모두 켜진다", () => {
    const marks = [0.4, 0, 0.7, 1];
    expect(chipsLitOf(marks, undefined)).toEqual([false, false, false, false]);
    expect(chipsLitOf(marks, 0)).toEqual([false, true, false, false]);
    expect(chipsLitOf(marks, 0.5)).toEqual([true, true, false, false]);
    expect(chipsLitOf(marks, "done")).toEqual([true, true, true, true]);
  });

  it("AC-3g 읽은 몫은 시작부터 지난 시간 ÷ (글자 수 ÷ 1초 글자 수 × 빠르기)이고 1 을 넘지 않는다", () => {
    const speech = { speakCharsPerSecondKo: 5, rateKo: 1 };
    // 10글자 → 2초
    expect(
      lineProgressOf({
        text: "가".repeat(10),
        startedAt: 0,
        now: 1000,
        speech,
      }),
    ).toBe(0.5);
    expect(
      lineProgressOf({
        text: "가".repeat(10),
        startedAt: 0,
        now: 5000,
        speech,
      }),
    ).toBe(1);
    expect(
      lineProgressOf({
        text: "가".repeat(10),
        startedAt: undefined,
        now: 1000,
        speech,
      }),
    ).toBeUndefined();
  });

  it("AC-3g 띠 칠 말(highlight)을 낱말 경계로 찾아 나눈다", () => {
    expect(
      highlightSegmentsOf("I eat rice. They eat apples.", ["They eat"]),
    ).toEqual([
      { at: 0, text: "I eat rice. ", marked: false },
      { at: 12, text: "They eat", marked: true },
      { at: 20, text: " apples.", marked: false },
    ]);
    expect(
      highlightSegmentsOf("Dan and Tess come to my room.", ["come"]),
    ).toEqual([
      { at: 0, text: "Dan and Tess ", marked: false },
      { at: 13, text: "come", marked: true },
      { at: 17, text: " to my room.", marked: false },
    ]);
    // 낱말 안(become)은 띠가 아니다 · 띠가 없으면 통째로
    expect(highlightSegmentsOf("They become cats.", ["come"])).toEqual([
      { at: 0, text: "They become cats.", marked: false },
    ]);
    expect(highlightSegmentsOf("We eat.", [])).toEqual([
      { at: 0, text: "We eat.", marked: false },
    ]);
  });
});
