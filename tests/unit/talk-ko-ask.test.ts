// 한국어로 묻기 묶음 5-가 — 화면의 순수 판정(수업 안 한국어로 묻기 spec 판 3 설계 2 · 3, plan 정한 것 3 · 11 · 12 · 접점 마).
// 한국어 듣기의 결과 가운데 영어 셈 기계(judge · onSpeech)로 가는 것은 '마이크를 쓸 수 없음'과 network 뿐이고, 나머지는 화면이 따로 세어
// 문턱에 닿으면 단추를 숨긴다. 합친 안내는 힌트 단추와 남은 단으로 고르고, 답의 소리는 1~3단계 표현 답만 쉰 뒤 읽으며 그 소리가 시작한 뒤에
// 아이 차례를 연다. 도움이 없는 턴의 요청에는 koHelp 칸이 없다.
import { describe, expect, it } from "vitest";
import {
  KO_ASK_NOTICE,
  KO_ASK_TIP,
  koAskNoticeOf,
  koCarrySoundsOf,
  koChildOpenOf,
  koFailStepOf,
  koHelpSoundOf,
  koHelpTurnPartOf,
  koListenEndOf,
  koResumeOf,
  koTaughtOf,
  koTipShownOf,
} from "@/core/conversation/ko-ask";
import { classifyRecognitionError } from "@/core/speech/listen";
import {
  type QuietStatsListen,
  type QuietStatsRow,
  quietListenStatsOf,
} from "@/core/speech/quiet-listen-stats";

const errorOf = (code: string) => ({
  kind: "error" as const,
  code,
  group: classifyRecognitionError(code, true),
});

describe("AC-25f 한국어 듣기의 끝 — 영어 셈 기계에는 마이크를 쓸 수 없음 · network 만 넘긴다(정한 것 3 · 코드 검토 묶음 3 O-1)", () => {
  it("글이 오면 heard(앞뒤 빈칸을 지운 글), 빈 글은 글 없이 끝남", () => {
    expect(
      koListenEndOf({ kind: "result", text: "  조개는 영어로 뭐야 " }),
    ).toEqual({
      kind: "heard",
      text: "조개는 영어로 뭐야",
    });
    expect(koListenEndOf({ kind: "result", text: "   " })).toEqual({
      kind: "not-heard",
    });
  });

  it("service-not-allowed · language-not-supported 는 그 언어만 안 됨(영어 셈 기계에 닿지 않음)", () => {
    expect(koListenEndOf(errorOf("service-not-allowed"))).toEqual({
      kind: "lang",
    });
    expect(koListenEndOf(errorOf("language-not-supported"))).toEqual({
      kind: "lang",
    });
  });

  it("not-allowed · 받아쓰기 꺼짐 · network 만 english(7절 그대로)", () => {
    for (const code of ["not-allowed", "dictation-disabled", "network"])
      expect(koListenEndOf(errorOf(code))).toEqual({
        kind: "english",
        event: { type: "error", code },
      });
  });

  it("말소리 없음 · 결과 없음 · 다시 듣는 오류 · 감시 타이머 멈춤은 글 없이 끝남, 마이크 안 잡힘은 deaf, 끊김은 none", () => {
    expect(koListenEndOf(errorOf("no-speech"))).toEqual({ kind: "not-heard" });
    expect(koListenEndOf(errorOf("aborted"))).toEqual({ kind: "not-heard" });
    expect(koListenEndOf({ kind: "no-result" })).toEqual({ kind: "not-heard" });
    expect(koListenEndOf({ kind: "stalled" })).toEqual({ kind: "not-heard" });
    expect(koListenEndOf({ kind: "deaf" })).toEqual({ kind: "deaf" });
    expect(koListenEndOf({ kind: "interrupted" })).toEqual({ kind: "none" });
  });
});

describe("AC-25f (다) 한국어 듣기 실패 셈과 단추 숨김(talk.ko_ask_fail_hide_after)", () => {
  it("글 없이 끝남 · 마이크 안 잡힘이 이어져 문턱에 닿으면 숨긴다", () => {
    const hideAfter = 2;
    const one = koFailStepOf(0, "not-heard", hideAfter);
    expect(one).toEqual({ fails: 1, hide: false });
    expect(koFailStepOf(one.fails, "deaf", hideAfter)).toEqual({
      fails: 2,
      hide: true,
    });
  });

  it("글이 오면 0 으로 돌아가고, 그 언어만 안 됨은 셈과 관계없이 숨긴다", () => {
    expect(koFailStepOf(1, "heard", 2)).toEqual({ fails: 0, hide: false });
    expect(koFailStepOf(0, "lang", 3)).toEqual({ fails: 0, hide: true });
  });

  it("영어 셈 기계로 넘긴 오류와 끊김은 셈을 바꾸지 않는다", () => {
    expect(koFailStepOf(1, "english", 2)).toEqual({ fails: 1, hide: false });
    expect(koFailStepOf(1, "none", 2)).toEqual({ fails: 1, hide: false });
  });
});

describe("AC-25f 합친 안내 고르기(정한 것 12 · [N-3])", () => {
  it("힌트 단추가 있고 열 단이 남은 턴만 '힌트'를 짚는다", () => {
    expect(koAskNoticeOf({ hintButton: true, tiersLeft: true })).toBe(
      KO_ASK_NOTICE.hint,
    );
    expect(koAskNoticeOf({ hintButton: true, tiersLeft: false })).toBe(
      KO_ASK_NOTICE.talk,
    );
    expect(koAskNoticeOf({ hintButton: false, tiersLeft: true })).toBe(
      KO_ASK_NOTICE.talk,
    );
  });

  it("문구는 정본 글자 그대로이고 '잘 모르겠어요' · '이 기기에서는'을 짚지 않는다", () => {
    expect(KO_ASK_NOTICE.hint).toBe(
      "지금은 한국어로 물어볼 수 없어요. '힌트'를 눌러 봐요",
    );
    expect(KO_ASK_NOTICE.talk).toBe(
      "지금은 한국어로 물어볼 수 없어요. 아는 말로 말해 봐요",
    );
    for (const text of Object.values(KO_ASK_NOTICE)) {
      expect(text).not.toContain("잘 모르겠어요");
      expect(text).not.toContain("이 기기");
    }
  });
});

describe("AC-25b 답의 소리 고르기와 아이 차례를 여는 때(정한 것 11 · [N-2] · [I-6])", () => {
  const pause = 700;

  it("1~3단계 표현 답은 쉰 뒤 그 표현을 읽고 소리가 시작한 뒤에 연다", () => {
    expect(
      koHelpSoundOf(
        { replay: "taught", teachEn: "I eat gimbap." },
        { lowBand: true, soundPauseMs: pause },
      ),
    ).toEqual({
      kind: "taught",
      text: "I eat gimbap.",
      pauseMs: pause,
      waitOpen: true,
    });
  });

  it("4단계부터의 표현은 쉼 없이 읽고 바로 연다", () => {
    expect(
      koHelpSoundOf(
        { replay: "taught", teachEn: "I played with my friend." },
        { lowBand: false, soundPauseMs: pause },
      ),
    ).toEqual({
      kind: "taught",
      text: "I played with my friend.",
      pauseMs: 0,
      waitOpen: false,
    });
  });

  it("표현이 없으면(뜻 · 불분명 · 그 밖 · 대신 줄) 지금 말 다시 읽기", () => {
    expect(
      koHelpSoundOf(
        { replay: "teacher_line" },
        { lowBand: true, soundPauseMs: pause },
      ),
    ).toEqual({ kind: "teacher_line" });
    // 갈래가 taught 여도 글이 없으면 다시 읽기(1~3단계 화면 자료가 teachEn 을 내리지 않은 때)
    expect(
      koHelpSoundOf(
        { replay: "taught" },
        { lowBand: true, soundPauseMs: pause },
      ),
    ).toEqual({ kind: "teacher_line" });
  });

  it("쉬는 동안은 열지 않고, 소리가 시작했거나 들려주지 못하면 연다", () => {
    expect(
      koChildOpenOf({ waitOpen: true, started: false, failed: false }),
    ).toBe(false);
    expect(
      koChildOpenOf({ waitOpen: true, started: true, failed: false }),
    ).toBe(true);
    expect(
      koChildOpenOf({ waitOpen: true, started: false, failed: true }),
    ).toBe(true);
    expect(
      koChildOpenOf({ waitOpen: false, started: false, failed: false }),
    ).toBe(true);
  });
});

describe("AC-N26 다음 영어 턴 요청의 koHelp 칸(접점 마)", () => {
  it("도움이 없는 턴은 칸 자체가 없다", () => {
    expect(koHelpTurnPartOf([])).toEqual({});
    expect("koHelp" in koHelpTurnPartOf([])).toBe(false);
  });

  it("도움이 있으면 턴 번호 · 순번 · 들었는가 · 다시 들은 수", () => {
    expect(
      koHelpTurnPartOf([{ turnNo: 3, seq: 1, heard: true, replays: 2 }]),
    ).toEqual({ koHelp: [{ turnNo: 3, seq: 1, heard: true, replays: 2 }] });
  });
});

describe("AC-25c 가르친 표현과 맞으면 바로 보냄 — 인식 확인의 들려준 답에 더할 표현", () => {
  it("빈 것은 빼고 같은 표현은 하나", () => {
    expect(
      koTaughtOf([
        { teachEn: "I eat gimbap." },
        {},
        { teachEn: " " },
        { teachEn: "I eat gimbap." },
      ]),
    ).toEqual(["I eat gimbap."]);
  });
});

describe("코드 검토 묶음 3 O-2 — 조용함 집계가 한국어 듣기를 영어의 첫 진짜로 세지 않는다", () => {
  it("아이 행 listens 의 앞에 lg 가 있는 듣기가 있어도 첫 진짜는 그 뒤의 영어 듣기다", () => {
    const english: QuietStatsListen = { o: "result" };
    const korean: QuietStatsListen = { o: "deaf", lg: "ko-KR" };
    // 말로 답한 아이 차례 → 선생님 차례 → 센 아이 차례(둘째 줄 '말로 답한 뒤')
    const rowsOf = (listens: QuietStatsListen[]): QuietStatsRow[] => [
      { speaker: "child", segment: "talk", inputMode: "speech" },
      { speaker: "tori", segment: "talk", choice: null },
      { speaker: "child", segment: "talk", inputMode: "speech", listens },
    ];
    const criteria = { minCount: 1, marginPoints: 1, firstRun: 1 };
    const plain = quietListenStatsOf([rowsOf([english])], criteria);
    const withKo = quietListenStatsOf([rowsOf([korean, english])], criteria);
    expect(plain.afterSpeech.firstReals).toBe(1);
    expect(withKo).toEqual(plain);
  });
});

// 묶음 5-나 — 이어 하기 · 이어받은 차례 · 첫 안내의 순수 판정.
describe("AC-25k 첫 안내 '모르는 말은 한국어로 물어봐요' — 프로필마다 한 번, '막히면 눌러요'와 겹치지 않는다", () => {
  it("문구는 plan '옮겨 적는 문구' 그대로다", () => {
    expect(KO_ASK_TIP).toBe("모르는 말은 한국어로 물어봐요");
  });
  it("아직 보지 않았고 단추가 보이고 '막히면 눌러요'가 없는 차례에만 보인다", () => {
    expect(
      koTipShownOf({ unseen: true, buttonShown: true, nudgeShown: false }),
    ).toBe(true);
    expect(
      koTipShownOf({ unseen: true, buttonShown: true, nudgeShown: true }),
    ).toBe(false);
    expect(
      koTipShownOf({ unseen: false, buttonShown: true, nudgeShown: false }),
    ).toBe(false);
    expect(
      koTipShownOf({ unseen: true, buttonShown: false, nudgeShown: false }),
    ).toBe(false);
  });
});

describe("AC-25i 이어 하기 — 화면 자료 koHelps 를 곁 말풍선 · 기록 · 이어받은 듣기로 가른다(접점 라)", () => {
  const h = (
    turnNo: number,
    seq: number,
    open: boolean,
    over: Partial<Parameters<typeof koResumeOf>[0][number]> = {},
  ) => ({
    turnNo,
    seq,
    open,
    question: "뭐라고 해?",
    sayKo: "이렇게 말해 봐.",
    teachEn: "I like it.",
    replay: "taught" as const,
    ...over,
  });

  it("지금 차례의 열린 도움은 곁 말풍선, 앞 턴의 열린 도움은 이어받음(기록에도 둠), 나머지는 기록이다", () => {
    const out = koResumeOf([h(6, 1, true), h(2, 1, false), h(4, 1, true)], {
      turnNo: 6,
    });
    expect(out.live.map((x) => x.turnNo)).toEqual([6]);
    expect(out.carried.map((x) => x.turnNo)).toEqual([4]);
    expect(out.log.map((x) => x.turnNo)).toEqual([2, 4]);
  });

  it("답이 아직 없는 행(sayKo null)은 어디에도 두지 않는다", () => {
    const out = koResumeOf([h(6, 1, true, { sayKo: null })], { turnNo: 6 });
    expect(out).toEqual({ live: [], carried: [], log: [] });
  });

  it("같은 차례의 도움은 순번 차례로 되살린다", () => {
    const out = koResumeOf([h(6, 2, true), h(6, 1, true)], { turnNo: 6 });
    expect(out.live.map((x) => x.seq)).toEqual([1, 2]);
  });
});

describe("AC-25o 되묻는 차례 뒤 이어받은 차례의 '알려 준 말 듣기'(끝 줄 lesson.koCarry — 접점 마)", () => {
  const known = [{ turnNo: 4, seq: 1, teachEn: "I found a shell." }];
  it("칸이 없거나 비면 아무것도 두지 않는다(지금과 같다)", () => {
    expect(koCarrySoundsOf(undefined, known, { lowBand: true })).toEqual([]);
    expect(koCarrySoundsOf([], known, { lowBand: true })).toEqual([]);
  });
  it("1~3단계는 이어받은 표현마다 하나 — 끝 줄의 글이 먼저, 없으면 받아 둔 도움의 글", () => {
    expect(
      koCarrySoundsOf([{ turnNo: 4, seq: 1 }], known, { lowBand: true }),
    ).toEqual([{ key: "4:1", text: "I found a shell." }]);
    expect(
      koCarrySoundsOf([{ turnNo: 4, seq: 1, teachEn: "A shell." }], known, {
        lowBand: true,
      }),
    ).toEqual([{ key: "4:1", text: "A shell." }]);
  });
  it("표현이 없는 도움(뜻 · 대신 줄)과 4단계부터는 두지 않는다", () => {
    expect(
      koCarrySoundsOf([{ turnNo: 9, seq: 1 }], known, { lowBand: true }),
    ).toEqual([]);
    expect(
      koCarrySoundsOf([{ turnNo: 4, seq: 1 }], known, { lowBand: false }),
    ).toEqual([]);
  });
});
