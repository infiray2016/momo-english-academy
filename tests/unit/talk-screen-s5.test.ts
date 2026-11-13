// 회화 화면 고침 묶음 S5(화면 검토 task-des-s3-report 의 C-1 · I-1 · I-2 · M-1 · M-6, 정본 03 4절 94 · 96 · 97 · 98 · 100줄 · 15절 AC-26m).
// 순수 판단만 본다: 기록 칸을 맨 아래로 다시 맞출지(C-1 · M-6), 으뜸 단추 줄을 보는 창 안으로 옮길 거리(I-2), 되묻는 차례에 그대로 둘 앞 차례의
// 소리 줄과 그 줄을 읽지 않음(I-1), 고르기 물음 듣기 단추의 접근 이름(M-1). 넘김 · 크기 재기 · 화면 캡처는 e2e(talk-lead · talk-log-follow)의 몫이다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  KEEP_IN_VIEW_MARGIN_PX,
  keepInViewScrollOf,
  lessonBubbleOf,
  lessonKeepInViewOf,
  lessonSpokenItemsOf,
} from "@/components/conversation/talk-frame";
import {
  type KeepNodeAccess,
  keepBottomOf,
  TALK_LOG_PIN_SLACK_PX,
  TALK_LOG_PULL_PX,
  TALK_LOG_UP_INTENT_MS,
  talkLogClearUpOf,
  talkLogFitOf,
  talkLogFollowOf,
  talkLogPinnedAfterScrollOf,
  talkLogPinnedOf,
  talkLogPullOf,
  talkLogTouchStepOf,
  talkLogUpKeyOf,
  talkLogUpwardOf,
} from "@/components/conversation/talk-log";
import {
  BUBBLE_TEXT,
  isKeptSoundLine,
  type LessonBubbleLine,
  LessonToriBubble,
  lessonSpokenOf,
  soundListenLabelOf,
} from "@/components/conversation/tori";
import {
  leadKeptSoundOf,
  leadRowSoundLinesOf,
  leadSoundLinesOf,
} from "@/core/conversation/lead-turn-core";
import {
  readTalkMove,
  type TalkMove,
  talkMoveOf,
} from "@/core/conversation/move";
import { lessonReplayLinesOf } from "@/server/conversation/lesson-turn";

// 틀(talk-frame)을 불러오려면 브라우저 · 서버 액션 모듈을 비운다(talk-follow.test.ts 와 같은 꼴)
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));

describe("C-1 · M-6 기록 칸을 맨 아래로 다시 맞출지(talk-log)", () => {
  it("AC-26m 남은 넘김 거리가 반올림 여유 안이면 맨 아래에 붙어 있고, 넘치지 않는 칸은 늘 붙어 있다", () => {
    expect(
      talkLogPinnedOf({
        scrollTop: 300,
        scrollHeight: 1008,
        clientHeight: 708,
      }),
    ).toBe(true);
    expect(
      talkLogPinnedOf({
        scrollTop: 300 - TALK_LOG_PIN_SLACK_PX,
        scrollHeight: 1008,
        clientHeight: 708,
      }),
    ).toBe(true);
    expect(
      talkLogPinnedOf({
        scrollTop: 200,
        scrollHeight: 1008,
        clientHeight: 708,
      }),
    ).toBe(false);
    expect(
      talkLogPinnedOf({ scrollTop: 0, scrollHeight: 400, clientHeight: 400 }),
    ).toBe(true);
  });

  it("AC-26m 맨 아래에 닿은 넘김 사건은 위로 넘기려는 중이어도 다시 붙는다(입력 없이 맨 아래로 돌아온 칸 포함 · rev-s5-3 M-2)", () => {
    expect(
      talkLogPinnedAfterScrollOf({
        pinned: false,
        atBottom: true,
        upward: true,
      }),
    ).toBe(true);
    expect(
      talkLogPinnedAfterScrollOf({
        pinned: false,
        atBottom: true,
        upward: false,
      }),
    ).toBe(true);
  });

  it("AC-26m 맨 아래가 아니고 위로 넘기려는 중이면 붙어 있음이 풀린다", () => {
    expect(
      talkLogPinnedAfterScrollOf({
        pinned: true,
        atBottom: false,
        upward: true,
      }),
    ).toBe(false);
  });

  it("AC-26m 맨 아래가 아니어도 위로 넘기려는 입력이 없으면 붙어 있음을 바꾸지 않는다(줄었다가 다시 커진 꼴 · 칸 안을 누르기만 한 꼴, rev-s5-3 I-1)", () => {
    // 줄었다가 다시 커진 뒤에 처리된 넘김 사건 — 입력이 없으므로 위로 넘기려는 중이 아니다
    const shrunk = talkLogUpwardOf({
      now: 10_000,
      upAt: Number.NEGATIVE_INFINITY,
    });
    expect(shrunk).toBe(false);
    expect(
      talkLogPinnedAfterScrollOf({
        pinned: true,
        atBottom: false,
        upward: shrunk,
      }),
    ).toBe(true);
    // 칸 안을 누르기만 함 — 손가락이 거의 움직이지 않아(문턱 안) 넘기려는 때가 적히지 않는다
    expect(talkLogPullOf({ pull: 0, dy: 3 })).toBeLessThanOrEqual(
      TALK_LOG_PULL_PX,
    );
    const tapped = talkLogUpwardOf({
      now: 10_000,
      upAt: Number.NEGATIVE_INFINITY,
    });
    expect(tapped).toBe(false);
    expect(
      talkLogPinnedAfterScrollOf({
        pinned: true,
        atBottom: false,
        upward: tapped,
      }),
    ).toBe(true);
    // 위로 넘겨 둔 칸도 그대로 풀려 있다
    expect(
      talkLogPinnedAfterScrollOf({
        pinned: false,
        atBottom: false,
        upward: false,
      }),
    ).toBe(false);
  });

  it("AC-26m 손가락이 아래로 간 거리는 touchstart 뒤의 순거리다: 멈추면 그대로, 위로 가면 그만큼 줄고, 0 아래로 내려가지 않는다(S5 fix 6 N-1 (나))", () => {
    expect(TALK_LOG_PULL_PX).toBe(8);
    expect(talkLogPullOf({ pull: 0, dy: 5 })).toBe(5);
    expect(talkLogPullOf({ pull: 5, dy: 6 })).toBe(11);
    expect(talkLogPullOf({ pull: 11, dy: 0 })).toBe(11);
    expect(talkLogPullOf({ pull: 11, dy: -1 })).toBe(10);
    expect(talkLogPullOf({ pull: 3, dy: -5 })).toBe(0);
    expect(talkLogPullOf({ pull: 0, dy: -2 })).toBe(0);
    // 느리게 떨며 끄는 손(아래로 3 · 위로 1 · 멈춤 · 아래로 3 · 위로 1 · 아래로 4)도 순거리로 문턱을 넘는다
    let pull = 0;
    for (const dy of [3, -1, 0, 3, -1, 4]) pull = talkLogPullOf({ pull, dy });
    expect(pull).toBe(8);
    expect(talkLogPullOf({ pull, dy: 1 })).toBeGreaterThan(TALK_LOG_PULL_PX);
  });

  it("AC-26m 위로 가는 키(ArrowUp · PageUp · Home · Shift+Space)만 위로 넘기려는 입력으로 센다", () => {
    for (const key of ["ArrowUp", "PageUp", "Home"])
      expect(talkLogUpKeyOf({ key, shiftKey: false })).toBe(true);
    expect(talkLogUpKeyOf({ key: " ", shiftKey: true })).toBe(true);
    for (const key of ["ArrowDown", "PageDown", "End", " ", "Enter", "Tab"])
      expect(talkLogUpKeyOf({ key, shiftKey: false })).toBe(false);
  });

  it("AC-26m 위로 넘기려는 중인지는 때로만 판단한다: 위로 넘기려는 입력에서 TALK_LOG_UP_INTENT_MS 안이면 참, 지나면 거짓(입력이 없었으면 거짓 · S5 fix 6)", () => {
    expect(TALK_LOG_UP_INTENT_MS).toBe(300);
    expect(talkLogUpwardOf({ now: 10_000, upAt: 10_000 })).toBe(true);
    expect(
      talkLogUpwardOf({ now: 10_000, upAt: 10_000 - TALK_LOG_UP_INTENT_MS }),
    ).toBe(true);
    expect(
      talkLogUpwardOf({
        now: 10_000,
        upAt: 10_000 - TALK_LOG_UP_INTENT_MS - 1,
      }),
    ).toBe(false);
    expect(
      talkLogUpwardOf({ now: 10_000, upAt: Number.NEGATIVE_INFINITY }),
    ).toBe(false);
  });

  it("AC-26m 맨 아래에 닿은 넘김 사건은 붙이기만 하고, 이어지는 맨 아래가 아닌 넘김 사건이 넘기려는 중이면 풀린다(부드럽게 시작하는 넘김 · S5 fix 6 N-1 (가))", () => {
    // 위로 가는 키(ArrowUp)를 10_000 에 누름 — 부드러운 넘김의 첫 사건은 아직 맨 아래(2px 안)에 있다
    const upAt = 10_000;
    let pinned = true;
    pinned = talkLogPinnedAfterScrollOf({
      pinned,
      atBottom: true,
      upward: talkLogUpwardOf({ now: 10_016, upAt }),
    });
    expect(pinned).toBe(true);
    // 맨 아래 사건이 넘기려는 때를 지우지 않으므로, 뒤의 사건(맨 아래가 아님)은 넘기려는 중이고 붙어 있음이 풀린다
    const upward = talkLogUpwardOf({ now: 10_032, upAt });
    expect(upward).toBe(true);
    pinned = talkLogPinnedAfterScrollOf({ pinned, atBottom: false, upward });
    expect(pinned).toBe(false);
    // 그 뒤 크기 알림이 와도 끌어내리지 않는다
    expect(talkLogFollowOf({ newTurn: false, pinned })).toBe(false);
  });

  it("AC-26m 넘기려는 입력이 없으면 맨 아래가 아닌 넘김 사건이 와도 붙어 있음을 바꾸지 않는다(S5 fix 6)", () => {
    const upward = talkLogUpwardOf({
      now: 10_000,
      upAt: Number.NEGATIVE_INFINITY,
    });
    expect(upward).toBe(false);
    for (const pinned of [true, false])
      expect(
        talkLogPinnedAfterScrollOf({ pinned, atBottom: false, upward }),
      ).toBe(pinned);
  });

  it("AC-26m 한 번 닿은 손으로 위로 엿본 뒤 같은 손으로 맨 아래까지 돌아오면 넘기려는 때가 지워져, 손을 뗀 뒤 곧 '줄었다가 다시 커짐'이 와도 붙어 있다(S5 fix 7 · rev-s5-5 M-1)", () => {
    // 검토자의 장면(peek): 손가락을 10px 씩 12번 아래로(위로 엿봄) · 12번 위로(맨 아래로 돌아옴), 한 움직임이 16ms
    let t = 10_000;
    let hand = { pull: 0, back: false };
    let upAt = Number.NEGATIVE_INFINITY;
    let pinned = true;
    const move = (dy: number) => {
      t += 16;
      const step = talkLogTouchStepOf({ ...hand, dy });
      hand = { pull: step.pull, back: step.back };
      if (step.markUp) upAt = t;
    };
    const scroll = (atBottom: boolean) => {
      if (talkLogClearUpOf({ atBottom, back: hand.back }))
        upAt = Number.NEGATIVE_INFINITY;
      pinned = talkLogPinnedAfterScrollOf({
        pinned,
        atBottom,
        upward: talkLogUpwardOf({ now: t, upAt }),
      });
    };
    for (let i = 0; i < 12; i++) {
      move(10);
      scroll(false);
    }
    // 엿보는 동안: 넘기려는 중이라 붙어 있음이 풀렸다
    expect(pinned).toBe(false);
    expect(hand.back).toBe(false);
    for (let i = 0; i < 12; i++) {
      move(-10);
      scroll(i === 11);
    }
    // 되돌아오는 손은 때를 새로 적지 않고, 맨 아래에 닿은 사건이 때를 지운다
    expect(hand.back).toBe(true);
    expect(upAt).toBe(Number.NEGATIVE_INFINITY);
    expect(pinned).toBe(true);
    // 손을 뗀 바로 뒤(300ms 안) 지금 턴이 줄었다가 다시 커져 브라우저가 자리를 줄인 넘김 사건이 와도 풀리지 않고, 크기 알림에 맨 아래로 맞춘다
    t += 1;
    scroll(false);
    expect(pinned).toBe(true);
    expect(talkLogFollowOf({ newTurn: false, pinned })).toBe(true);
  });

  it("AC-26m 손 한 움직임: 아래로 가고 순거리가 문턱을 넘을 때만 넘기려는 때를 적고, 위로 가면 돌아오는 손 · 아래로 가면 아님 · 멈추면 그대로다(S5 fix 7)", () => {
    expect(
      talkLogTouchStepOf({ pull: TALK_LOG_PULL_PX, back: false, dy: 1 }),
    ).toEqual({ pull: TALK_LOG_PULL_PX + 1, back: false, markUp: true });
    // 순거리가 아직 문턱 위여도 되돌아오는 손은 적지 않는다(고치기 전에는 적었다)
    expect(talkLogTouchStepOf({ pull: 60, back: false, dy: -10 })).toEqual({
      pull: 50,
      back: true,
      markUp: false,
    });
    expect(talkLogTouchStepOf({ pull: 60, back: true, dy: 0 })).toEqual({
      pull: 60,
      back: true,
      markUp: false,
    });
    expect(talkLogTouchStepOf({ pull: 0, back: true, dy: 5 })).toEqual({
      pull: 5,
      back: false,
      markUp: false,
    });
    // 넘기려는 때를 지우는 것은 돌아오는 손이 맨 아래에 닿은 사건뿐이다(휠 · 키의 첫 맨 아래 사건은 지우지 않음 — N-1 (가))
    expect(talkLogClearUpOf({ atBottom: true, back: true })).toBe(true);
    expect(talkLogClearUpOf({ atBottom: true, back: false })).toBe(false);
    expect(talkLogClearUpOf({ atBottom: false, back: true })).toBe(false);
  });

  it("AC-26m 새 차례(줄 수 · 지금 턴 열쇠가 바뀜)면 아이가 위로 넘겨 둔 때도 맨 아래로 간다(지금처럼)", () => {
    expect(talkLogFollowOf({ newTurn: true, pinned: false })).toBe(true);
    expect(talkLogFollowOf({ newTurn: true, pinned: true })).toBe(true);
  });

  it("AC-26m 맨 아래에 붙어 있던 칸은 크기 알림(지금 턴 · 지난 줄이 자라거나 줄어듦 · 칸 높이가 바뀜, 첫 알림 포함)마다 다시 맨 아래로 맞춘다(C-1 · M-6 · fix 4 원인 1)", () => {
    expect(talkLogFollowOf({ newTurn: false, pinned: true })).toBe(true);
  });

  it("AC-26m 아이가 위로 넘겨 지난 말을 보는 중이면(붙어 있지 않음) 크기 알림에 끌어내리지 않는다(4절 94줄 '위로 넘겨 다시 본다')", () => {
    expect(talkLogFollowOf({ newTurn: false, pinned: false })).toBe(false);
  });
});

describe("I-2 으뜸 단추 줄을 보는 창 안으로(talk-frame)", () => {
  const VIEW = 1180;

  it("AC-26m 이미 보는 창 안(여유 포함)이면 넘기지 않는다", () => {
    expect(
      keepInViewScrollOf({
        top: 900,
        bottom: VIEW - KEEP_IN_VIEW_MARGIN_PX,
        viewportHeight: VIEW,
        margin: KEEP_IN_VIEW_MARGIN_PX,
      }),
    ).toBe(0);
  });

  /** 화면 재검토 des-s5 model-P(기록 칸을 맞추기 전 배치, 쪽 위에서): 판의 마지막 조각(점선 1124 ~ 빈 알림 줄 자리 끝 1266) 안의 아이 차례 =
   * 단추 묶음(말하기 1154~1210 · 묶음 1142~1222) + 빈 알림 줄(1234~1266). */
  type Box = {
    top: number;
    bottom: number;
    status?: "empty" | "shown";
    kids?: Box[];
  };
  const BOX: KeepNodeAccess<Box> = {
    top: (b) => b.top,
    bottom: (b) => b.bottom,
    emptyStatus: (b) => b.status === "empty",
    children: (b) => b.kids ?? [],
  };
  const footOf = (status: "empty" | "shown", choice?: Box): Box => ({
    top: 1124,
    bottom: choice ? choice.bottom : 1266,
    kids: [
      {
        top: 1142,
        bottom: 1266,
        kids: [
          {
            top: 1142,
            bottom: 1222,
            kids: [{ top: 1154, bottom: 1210 }],
          },
          { top: 1234, bottom: 1266, status },
        ],
      },
      ...(choice ? [choice] : []),
    ],
  });

  it("AC-26m 쪽 넘김의 기준은 판의 마지막 조각 전체가 아니라 으뜸 단추 묶음의 아래 끝이다: 빈 알림 줄 자리는 빼고, 알림 글이 뜨면 그 줄까지(S5 fix 7 · des-s5 D-1 근거 2)", () => {
    // 고치기 전에는 조각 전체(1266)가 기준이라 실제 화면에서 102px 내려갔다 — 단추 묶음까지면 58px
    expect(keepBottomOf(footOf("empty"), BOX)).toBe(1222);
    expect(
      keepInViewScrollOf({
        top: 1124,
        bottom: keepBottomOf(footOf("empty"), BOX),
        viewportHeight: VIEW,
        margin: KEEP_IN_VIEW_MARGIN_PX,
      }),
    ).toBe(1222 + KEEP_IN_VIEW_MARGIN_PX - VIEW);
    expect(keepBottomOf(footOf("shown"), BOX)).toBe(1266);
    // 마무리 제안: 아이 차례 뒤에 두 단추 줄이 있으면 그 줄의 아래 끝(빈 알림 줄은 맨 끝이 아니라 빼지 않는다)
    const choice = {
      top: 1294,
      bottom: 1350,
      kids: [{ top: 1294, bottom: 1350 }],
    };
    expect(keepBottomOf(footOf("empty", choice), BOX)).toBe(1350);
    // 빈 알림 줄뿐인 조각은 위 끝
    expect(
      keepBottomOf(
        {
          top: 10,
          bottom: 50,
          kids: [{ top: 10, bottom: 50, status: "empty" }],
        },
        BOX,
      ),
    ).toBe(10);
  });

  it("AC-26m 세로 기록 칸 높이의 상한은 남는 높이다: 칸 아래 조각(빈 알림 줄 자리까지)이 여유를 두고 보는 창 안에 들고, 낮은 창에서도 지금 턴보다 낮아지지 않는다(C241 보완 4)", () => {
    // model-P: 칸 위 끝 396 · 칸 아래에서 조각 끝까지 1266 - 1104 = 162 → 606(요청자에게 알린 708 → 606 쯤)
    expect(
      talkLogFitOf({
        viewportHeight: VIEW,
        logTop: 396,
        belowLog: 162,
        margin: KEEP_IN_VIEW_MARGIN_PX,
        minHeight: 286,
      }),
    ).toBe(606);
    // 낮은 세로(도구 막대를 뺀 1060)
    expect(
      talkLogFitOf({
        viewportHeight: 1060,
        logTop: 396,
        belowLog: 162,
        margin: KEEP_IN_VIEW_MARGIN_PX,
        minHeight: 286,
      }),
    ).toBe(486);
    // 한 화면에 다 들 수 없으면 지금 턴이 온전히 보이는 높이를 지킨다(남는 몫은 쪽 넘김이 받침)
    expect(
      talkLogFitOf({
        viewportHeight: 720,
        logTop: 396,
        belowLog: 162,
        margin: KEEP_IN_VIEW_MARGIN_PX,
        minHeight: 242.5,
      }),
    ).toBe(243);
  });

  it("AC-26m 정리의 말하기처럼 보는 창보다 아래에 있는 줄도 같은 식이고(화면 검토 wrap-P), 줄의 위 끝이 보는 창 위로 나가게는 넘기지 않는다", () => {
    expect(
      keepInViewScrollOf({
        top: 1431.5,
        bottom: 1485.5,
        viewportHeight: VIEW,
        margin: KEEP_IN_VIEW_MARGIN_PX,
      }),
    ).toBe(1485.5 + KEEP_IN_VIEW_MARGIN_PX - VIEW);
    // 줄이 보는 창보다 크면 위 끝을 보는 창 위 끝에 맞춘다(위 끝이 이미 위로 나갔으면 넘기지 않음 — 위로는 넘기지 않는다)
    expect(
      keepInViewScrollOf({
        top: 200,
        bottom: 1500,
        viewportHeight: VIEW,
        margin: KEEP_IN_VIEW_MARGIN_PX,
      }),
    ).toBe(200);
    expect(
      keepInViewScrollOf({
        top: -10,
        bottom: 1500,
        viewportHeight: VIEW,
        margin: KEEP_IN_VIEW_MARGIN_PX,
      }),
    ).toBe(0);
  });

  it("AC-26m 옮기는 차례는 아이 차례 · 고르기 차례(두 단추) · 정리 화면이고, 선생님 차례 · 짧은 준비 쪽지 · 쉼 · 닫힘에서는 쪽을 움직이지 않는다", () => {
    const at = (
      phase: string,
      more: { wrapShown?: boolean; inPrep?: boolean } = {},
    ) =>
      lessonKeepInViewOf({
        phase,
        wrapShown: more.wrapShown ?? false,
        inPrep: more.inPrep ?? false,
      });
    expect(at("child")).toBe(true);
    expect(at("choice")).toBe(true);
    expect(at("tori", { wrapShown: true })).toBe(true);
    for (const phase of [
      "tori",
      "moving",
      "prep",
      "break",
      "closed",
      "offline",
      "failed",
    ])
      expect(at(phase), phase).toBe(false);
    expect(at("child", { inPrep: true })).toBe(false);
  });
});

/** 앞 선생님 행 move(새 엔진 — 소리 줄을 적은 행). */
function prevWith(sound: TalkMove["sound"]): TalkMove {
  return { ...talkMoveOf({ kind: "ai" }), ...(sound ? { sound } : {}) };
}

describe("I-1 되묻는 차례에 앞 차례의 듣기 단추를 그대로 둔다(core leadKeptSoundOf · leadSoundLinesOf)", () => {
  const base = {
    level: 3,
    move: "ask_again" as const,
    hasChild: true,
    own: {},
  };

  it("AC-26i 1~3단계 아이 말 차례의 ask_again 이고 이 차례에 제 소리 줄이 없으면, 바로 앞 선생님 행의 따라 할 문장 · 고르기 물음 소리 줄을 그대로 돌려준다", () => {
    expect(
      leadKeptSoundOf({ ...base, prevMove: prevWith({ model: "I like it." }) }),
    ).toEqual({ model: "I like it." });
    expect(
      leadKeptSoundOf({
        ...base,
        prevMove: prevWith({ answer: "This or that?" }),
      }),
    ).toEqual({ answer: "This or that?" });
  });

  it("AC-26i 되묻는 차례가 아니거나 · 4단계부터거나 · 입구 차례(아이 말 없음)거나 · 이 차례에 제 소리 줄이 있거나 · 앞 행에 소리 줄이 없으면 빈 값이다", () => {
    const prevMove = prevWith({ model: "I like it." });
    expect(
      leadKeptSoundOf({ ...base, prevMove, move: "react_and_follow_up" }),
    ).toEqual({});
    expect(leadKeptSoundOf({ ...base, prevMove, level: 4 })).toEqual({});
    expect(leadKeptSoundOf({ ...base, prevMove, hasChild: false })).toEqual({});
    expect(
      leadKeptSoundOf({ ...base, prevMove, own: { model: "I see it." } }),
    ).toEqual({});
    expect(leadKeptSoundOf({ ...base, prevMove: prevWith(undefined) })).toEqual(
      {},
    );
    expect(leadKeptSoundOf({ ...base, prevMove: null })).toEqual({});
    // 지금 길의 선택지(①②)는 새 엔진의 소리 줄 꼴이 아니라 그대로 두지 않는다
    expect(
      leadKeptSoundOf({
        ...base,
        prevMove: prevWith({ choices: ["I like it.", "I don't."] }),
      }),
    ).toEqual({});
  });

  it("AC-26i 흘려 보낼 소리 줄: 이 차례의 따라 할 문장(표지 없음) → 고르기 물음(ask) → 그대로 둔 앞 차례의 소리 줄(kept)", () => {
    expect(leadSoundLinesOf({ sound: { model: "I like it." } })).toEqual([
      { t: "sound", kind: "model", say: "I like it." },
    ]);
    expect(leadSoundLinesOf({ sound: { answer: "This or that?" } })).toEqual([
      { t: "sound", kind: "answer", say: "This or that?", lead: { ask: true } },
    ]);
    expect(
      leadSoundLinesOf({ sound: {}, kept: { model: "I like it." } }),
    ).toEqual([
      { t: "sound", kind: "model", say: "I like it.", lead: { kept: true } },
    ]);
    expect(
      leadSoundLinesOf({ sound: {}, kept: { answer: "This or that?" } }),
    ).toEqual([
      {
        t: "sound",
        kind: "answer",
        say: "This or that?",
        lead: { ask: true, kept: true },
      },
    ]);
    expect(leadSoundLinesOf({ sound: {} })).toEqual([]);
  });
});

describe("I-1 · M-1 화면: 그대로 둔 소리 줄은 단추만 있고 읽지 않으며, 고르기 물음 단추의 접근 이름(tori · talk-frame)", () => {
  const lines: LessonBubbleLine[] = [
    { t: "s", en: "Sorry?" },
    { t: "s", en: "Say it again, please." },
    { t: "sound", kind: "model", say: "I like it.", lead: { kept: true } },
  ];

  it("AC-26i 그대로 둔 소리 줄은 저절로 읽는 차례 · 말풍선 다시 읽기(지금 턴)에 없고, 이 차례의 말만 줄 차례 그대로 읽는다", () => {
    expect(isKeptSoundLine(lines[2] as LessonBubbleLine)).toBe(true);
    expect(
      isKeptSoundLine({ t: "sound", kind: "model", say: "x" } as never),
    ).toBe(false);
    for (const spoken of [
      lessonSpokenItemsOf({ lines }, 3),
      lessonSpokenOf({ lines }, 3),
    ])
      expect(spoken).toEqual([
        { text: "Sorry?", w: "tori" },
        { text: "Say it again, please.", w: "tori" },
      ]);
    // 표지 없는 소리 줄은 지금처럼 줄 차례를 실어 읽는다(들려줬는지 되찾기 — playedSoundsOf)
    const own: LessonBubbleLine[] = [
      { t: "s", en: "Great!" },
      { t: "sound", kind: "model", say: "I like it." },
    ];
    expect(lessonSpokenItemsOf({ lines: own }, 3)).toEqual([
      { text: "Great!", w: "tori" },
      { text: "I like it.", w: "sound", line: 1 },
    ]);
  });

  it("AC-26m 되묻는 차례의 말풍선 아래에 그 듣기 단추가 있고(data-sound-kept), 접근 이름은 따라 할 말이면 '따라 할 말 듣기' 다", () => {
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        content: { lines, done: true },
        level: 3,
        englishName: "Momo",
        waiting: null,
        waitSeconds: [1, 5] as const,
        onReplay: () => {},
        onSound: () => {},
      }),
    );
    expect(html).toContain('data-sound-listen="model"');
    expect(html).toContain("data-sound-kept");
    expect(html).toContain(`aria-label="${BUBBLE_TEXT.model}"`);
  });

  it("AC-26m 새 엔진의 막힌 뒤 고르기 물음(ask) 듣기 단추는 '물어본 말 듣기' 이고, 표지 없는 줄(지금 길의 따라 할 말 · 받침의 답)은 그대로 '따라 할 말 듣기' 다(M-1)", () => {
    expect(BUBBLE_TEXT.ask).toBe("물어본 말 듣기");
    expect(soundListenLabelOf({ lead: { ask: true } })).toBe(BUBBLE_TEXT.ask);
    expect(soundListenLabelOf({})).toBe(BUBBLE_TEXT.model);
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        content: {
          lines: [
            { t: "s", en: "That's okay!" },
            {
              t: "sound",
              kind: "answer",
              say: "This or that?",
              lead: { ask: true },
            },
          ],
          done: true,
        },
        level: 3,
        englishName: "Momo",
        waiting: null,
        waitSeconds: [1, 5] as const,
        onReplay: () => {},
        onSound: () => {},
      }),
    );
    expect(html).toContain('data-sound-listen="answer"');
    expect(html).toContain(`aria-label="${BUBBLE_TEXT.ask}"`);
    expect(html).not.toContain("data-sound-kept");
  });
});

/** 새 엔진 응답 행의 move(lead 칸 — 행에서 다시 만들 때 읽는 move · 소리 줄만). */
function leadRowMove(
  move: "model_repeat" | "ask_again" | "easier_or_choices",
  sound?: TalkMove["sound"],
): TalkMove {
  return {
    ...talkMoveOf({ kind: "ai" }),
    ...(sound ? { sound } : {}),
    lead: { reading: "clear_answer", move, asked: [], said: [] },
  } as TalkMove;
}

describe("지킬 것 2 다시 흘림 · 이어 하기도 저장된 행에서 같은 표지의 소리 줄(core leadRowSoundLinesOf · lessonReplayLinesOf · lessonBubbleOf)", () => {
  const modelRow = {
    speaker: "tori" as const,
    turnNo: 4,
    segment: "talk",
    text: "Great! Say it with me.",
    move: leadRowMove("model_repeat", { model: "I like it." }),
    sentUserMessage: null,
  };
  const askRow = {
    speaker: "tori" as const,
    turnNo: 5,
    segment: "talk",
    text: "Sorry? Say it again, please.",
    move: leadRowMove("ask_again"),
    sentUserMessage: null,
  };
  const rows = [
    modelRow,
    {
      speaker: "child" as const,
      turnNo: 4,
      segment: "talk",
      text: "I like it.",
    },
    askRow,
    { speaker: "child" as const, turnNo: 5, segment: "talk", text: "" },
  ];
  const keptLine = {
    t: "sound" as const,
    kind: "model" as const,
    say: "I like it.",
    lead: { kept: true as const },
  };

  it("AC-26i 되묻는 행은 앞 선생님 행의 소리 줄을 kept 로, 고르기 물음 행은 ask 로 다시 만들고(실시간 길과 같은 값), 지금 길 · 옛 행은 null 이다", () => {
    expect(leadRowSoundLinesOf({ level: 3, rows, teacher: askRow })).toEqual([
      keptLine,
    ]);
    expect(leadRowSoundLinesOf({ level: 3, rows, teacher: modelRow })).toEqual([
      { t: "sound", kind: "model", say: "I like it." },
    ]);
    const choiceRow = {
      ...askRow,
      move: leadRowMove("easier_or_choices", { answer: "This or that?" }),
    };
    expect(
      leadRowSoundLinesOf({ level: 3, rows: [choiceRow], teacher: choiceRow }),
    ).toEqual([
      { t: "sound", kind: "answer", say: "This or that?", lead: { ask: true } },
    ]);
    // 지금 길 행(move.lead 없음)은 null — 부르는 쪽이 표지 없는 지금 꼴의 줄을 낸다
    const appRow = {
      ...askRow,
      move: { ...talkMoveOf({ kind: "ai" }), sound: { answer: "Yes, I do." } },
    };
    expect(
      leadRowSoundLinesOf({ level: 3, rows: [appRow], teacher: appRow }),
    ).toBeNull();
    // 입구 차례 행(사용자 메시지를 행에 둠 — 아이 말 없음)은 그대로 둘 것이 없다
    expect(
      leadRowSoundLinesOf({
        level: 3,
        rows: [modelRow, { ...askRow, sentUserMessage: "(start)" }],
        teacher: { ...askRow, sentUserMessage: "(start)" },
      }),
    ).toEqual([]);
  });

  // 되묻기가 둘 넘게 이어진 경우(검토 rev-s5 M-1 — 컨트롤러 결정: 앞 행이 되묻는 차례였으면 그 행이 화면에 보인 소리 줄을 이어 받는다. 행
  // move.sound 는 지금처럼 비워 평가 입력은 그대로)
  const askRow2 = { ...askRow, turnNo: 6 };
  const chained = [
    ...rows,
    askRow2,
    { speaker: "child" as const, turnNo: 6, segment: "talk", text: "" },
  ];

  it("AC-26i 되묻기 둘이 이어지면 둘째 되묻는 행도 첫 되묻는 행이 보인 따라 할 문장 듣기 줄(kept)을 이어 받는다(실시간 길 leadKeptSoundOf rows · 다시 만든 줄 모두, M-1)", () => {
    // 실시간 길: 둘째 되묻는 차례 앞의 행(첫 되묻는 행 · 그 아이 행까지)
    expect(
      leadKeptSoundOf({
        level: 3,
        move: "ask_again",
        hasChild: true,
        own: {},
        prevMove: readTalkMove(askRow.move),
        rows,
      }),
    ).toEqual({ model: "I like it." });
    // 저장된 행에서 다시 만든 줄(다시 흘림 · 이어 하기)
    expect(
      leadRowSoundLinesOf({ level: 3, rows: chained, teacher: askRow2 }),
    ).toEqual([keptLine]);
    // 첫 되묻는 행의 줄은 그대로(앞 행 · 뒤 행 모두 있는 목록에서도 앞 행만 본다)
    expect(
      leadRowSoundLinesOf({ level: 3, rows: chained, teacher: askRow }),
    ).toEqual([keptLine]);
    // 행에 적은 값은 지금처럼 비어 있다(평가 입력 — 들은 도움 · 힌트 종류 · '말했다'가 읽는 move.sound)
    expect(readTalkMove(askRow.move)?.sound).toBeUndefined();
    expect(readTalkMove(askRow2.move)?.sound).toBeUndefined();
    // rows 를 주지 않으면 앞 행 move.sound 만 본다(지금 꼴 — 첫 되묻는 행 move.sound 는 비어 있다)
    expect(
      leadKeptSoundOf({
        level: 3,
        move: "ask_again",
        hasChild: true,
        own: {},
        prevMove: readTalkMove(askRow.move),
      }),
    ).toEqual({});
  });

  it("AC-26i 되묻기 뒤의 보통 차례(되묻기가 아님 · 제 소리 줄 없음)에서는 그대로 둔 듣기 줄이 사라지고, 그다음 되묻기도 이어 받을 것이 없다(M-1)", () => {
    const plainRow = {
      ...askRow,
      turnNo: 6,
      text: "Nice!",
      move: leadRowMove("model_repeat"),
    };
    const afterPlain = [
      ...rows,
      plainRow,
      { speaker: "child" as const, turnNo: 6, segment: "talk", text: "" },
    ];
    expect(
      leadRowSoundLinesOf({ level: 3, rows: afterPlain, teacher: plainRow }),
    ).toEqual([]);
    const askRow3 = { ...askRow, turnNo: 7 };
    expect(
      leadRowSoundLinesOf({
        level: 3,
        rows: [...afterPlain, askRow3],
        teacher: askRow3,
      }),
    ).toEqual([]);
    expect(
      leadKeptSoundOf({
        level: 3,
        move: "ask_again",
        hasChild: true,
        own: {},
        prevMove: readTalkMove(plainRow.move),
        rows: afterPlain,
      }),
    ).toEqual({});
  });

  it("AC-26i 같은 시도 다시 흘림(lessonReplayLinesOf)은 새 엔진 행이면 다시 만든 줄을 내고, 지금 길 행은 지금 꼴 그대로다", () => {
    const card = {
      required: [],
      more: [],
      greeting: { firstLine: { en: "Hi!" } },
    };
    const replay = lessonReplayLinesOf(
      { text: askRow.text, toriKo: null, move: askRow.move },
      {
        card: card as never,
        koMeaning: false,
        leadSound: leadRowSoundLinesOf({ level: 3, rows, teacher: askRow }),
      },
    );
    expect(replay).toEqual([
      { t: "s", en: "Sorry?" },
      { t: "s", en: "Say it again, please." },
      keptLine,
    ]);
    const old = lessonReplayLinesOf(
      {
        text: "Nice!",
        toriKo: null,
        move: {
          ...talkMoveOf({ kind: "ai" }),
          sound: { answer: "Yes, I do." },
        },
      },
      { card: card as never, koMeaning: false, leadSound: null },
    );
    expect(old).toEqual([
      { t: "s", en: "Nice!" },
      { t: "sound", kind: "answer", say: "Yes, I do." },
    ]);
  });

  it("AC-26m 쪽을 다시 연 이어 하기(lessonBubbleOf)는 서버가 다시 만든 줄로 말풍선을 그려 kept 단추가 남고 저절로 읽지 않는다", () => {
    const bubble = lessonBubbleOf({
      turnNo: 5,
      kind: "ai",
      lines: [{ en: "Sorry? Say it again, please.", app: false }],
      sound: null,
      app: [],
      item: null,
      hints: [],
      leadSound: [keptLine],
    });
    expect(bubble.lines.at(-1)).toEqual(keptLine);
    expect(lessonSpokenItemsOf(bubble, 3)).toEqual([
      { text: "Sorry? Say it again, please.", w: "tori" },
    ]);
  });
});
