// 한국어로 묻기 묶음 5-가 — 화면의 순수 판정(수업 안 한국어로 묻기 spec 판 3 설계 2 · 3, plan 정한 것 3 · 11 · 12 · 접점 마).
// 한국어 듣기의 결과 가운데 영어 셈 기계(judge · onSpeech)로 가는 것은 '마이크를 쓸 수 없음'과 network 뿐이고, 나머지는 화면이 따로 세어
// 문턱에 닿으면 단추를 숨긴다. 합친 안내는 힌트 단추와 남은 단으로 고르고, 답의 소리는 1~3단계 표현 답만 쉰 뒤 읽으며 그 소리가 시작한 뒤에
// 아이 차례를 연다. 도움이 없는 턴의 요청에는 koHelp 칸이 없다.
import { describe, expect, it, vi } from "vitest";

// 틀의 순수 판정(소리 끝 · 보는 창 지키기)을 가져오려고 조각의 서버 · 기기 의존을 비운다(discard-screen.test.ts 와 같은 꼴)
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/first-run", () => ({}));

import {
  lessonKeepInViewOf,
  type TalkSoundEndAt,
  talkSoundEndDue,
  talkSoundEndSceneOf,
} from "@/components/conversation/talk-frame";
import { lessonFitLandscapeOf } from "@/components/conversation/talk-log";
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
  koSoundDroppedOf,
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

// ── 화면 고침 b5-fix1(코드 검토 rev-b5a I-2 · I-7, 13절 C226 (4)) ──

describe("AC-25e 쉼 동안 소리 끝 입력 없음 [N-2] — 한국어 처리 중(ko_help)은 소리 끝을 알리지 않고, 표현 소리가 시작해 아이 차례로 돌린 뒤 줄이 비면 한 번", () => {
  /** 그림 차례를 돌려 소리 끝을 부른 그림 번호를 모은다(틀의 effect 와 같은 꼴). */
  const dues = (
    frames: readonly { phase: "child" | "ko_help"; speaking: boolean }[],
  ) => {
    let prev: TalkSoundEndAt | undefined;
    const out: number[] = [];
    frames.forEach((f, i) => {
      const next = {
        scene: talkSoundEndSceneOf({
          stage: "talk",
          phase: f.phase,
          away: false,
        }),
        speaking: f.speaking,
      };
      if (talkSoundEndDue(prev, next)) out.push(i);
      prev = next;
    });
    return out;
  };
  it("아이 차례(줄 빔) → 질문 보냄 · 기다림 → 답의 쉼(줄은 읽는 중) → 소리 시작으로 아이 차례(읽는 중) → 줄 빔: 소리 끝은 처음과 마지막에만", () => {
    expect(
      dues([
        { phase: "child", speaking: false }, // 아이 차례가 열림(앞 차례의 소리 끝)
        { phase: "ko_help", speaking: false }, // 보냄 · 기다림
        { phase: "ko_help", speaking: true }, // 답의 쉼(ko_ask_sound_pause_ms — 줄은 읽는 중)
        { phase: "child", speaking: true }, // 소리 시작 알림으로 아이 차례
        { phase: "child", speaking: false }, // 표현을 다 읽음
      ]),
    ).toEqual([0, 4]);
  });
  it("쉼 동안에는 줄이 읽는 중이라 차례가 바뀌어도 소리 끝이 나가지 않는다", () => {
    expect(
      dues([
        { phase: "ko_help", speaking: false },
        { phase: "ko_help", speaking: true },
        { phase: "ko_help", speaking: true },
      ]),
    ).toEqual([]);
  });
});

describe("AC-25b 표현 답의 소리가 시작하기 전에 줄이 비면 들려주지 못함으로 보고 아이 차례를 연다(코드 검토 rev-b5a I-2 (나))", () => {
  const waiting = { waitOpen: true, started: false, failed: false };
  it("답을 받아 소리를 기다리는데 줄이 멈췄으면(쉬는 중 줄을 비움 · 음성 접점 없음) 참", () => {
    expect(
      koSoundDroppedOf({ waiting: true, speaking: false, sound: waiting }),
    ).toBe(true);
  });
  it("쉬는 중 · 읽는 중이거나, 질문 요청이 아직 나가 있거나, 기다릴 소리가 없으면 거짓", () => {
    expect(
      koSoundDroppedOf({ waiting: true, speaking: true, sound: waiting }),
    ).toBe(false);
    expect(
      koSoundDroppedOf({ waiting: false, speaking: false, sound: waiting }),
    ).toBe(false);
    expect(
      koSoundDroppedOf({ waiting: true, speaking: false, sound: undefined }),
    ).toBe(false);
  });
  it("이미 시작했거나 들려주지 못함이 왔거나 기다리지 않는 답(4단계부터)이면 거짓 — 차례는 이미 열렸다", () => {
    for (const sound of [
      { ...waiting, started: true },
      { ...waiting, failed: true },
      { ...waiting, waitOpen: false },
    ])
      expect(
        koSoundDroppedOf({ waiting: true, speaking: false, sound }),
        JSON.stringify(sound),
      ).toBe(false);
  });
});

describe("AC-25a 한국어로 묻는 수업의 가로 화면 — 대화 장면도 기록 칸 높이를 남는 높이에 맞추고, 한국어 처리 중도 단추를 화면 안에 둔다(13절 C226 (4) · b5-fix1)", () => {
  it("한국어로 묻는 수업은 아이 차례 · 한국어 처리 중 · 선생님 차례에서 가로도 맞춘다", () => {
    for (const phase of ["child", "ko_help", "tori", "moving"])
      expect(
        lessonFitLandscapeOf({ wrapShown: false, phase, koAsk: true }),
        phase,
      ).toBe(true);
    for (const phase of ["prep", "break", "closed", "offline", "failed"])
      expect(
        lessonFitLandscapeOf({ wrapShown: false, phase, koAsk: true }),
        phase,
      ).toBe(false);
  });
  it("AC-N26 한국어로 묻지 않는 수업은 그대로다(가로의 대화 장면은 맞추지 않음)", () => {
    for (const phase of ["child", "tori", "moving"]) {
      expect(lessonFitLandscapeOf({ wrapShown: false, phase }), phase).toBe(
        false,
      );
      expect(
        lessonFitLandscapeOf({ wrapShown: false, phase, koAsk: false }),
        phase,
      ).toBe(false);
    }
  });
  it("한국어 처리 중(ko_help)도 으뜸 단추 줄을 보는 창 안에 둘 차례다(짧은 준비 쪽지 안은 아님)", () => {
    expect(
      lessonKeepInViewOf({ wrapShown: false, inPrep: false, phase: "ko_help" }),
    ).toBe(true);
    expect(
      lessonKeepInViewOf({ wrapShown: false, inPrep: true, phase: "ko_help" }),
    ).toBe(false);
  });
});
