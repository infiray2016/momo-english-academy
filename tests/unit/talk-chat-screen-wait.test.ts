// 이야기 방식 화면 W fix 2(13절 C243 보완 7 (3) ~ (7), 화면 검토 I-1 · M-1 ~ M-4). 화면에서 갈라낸 판단만 본다: 조용함 요청 뒤 기다림 칸을
// 그릴지(talk-frame · tori), 설명 기다림 차례의 한 줄 자리(talk-frame · tori), 이야기 방식 힌트 받기 단의 높이 값과 5초 줄(hint-loading-dots),
// 열림 때 기록 칸이 맨 아래를 떠나 있으면 넣는 사건(talk-frame). 실제 높이 · 시간 · 넘김은 브라우저 점검 장면(chat-quiet-wait · chat-explain-slot ·
// chat-hint-height · chat-log-away)의 몫이다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  chatHintLoadingMinHOf,
  HintLoadingDots,
} from "@/components/conversation/hint-loading-dots";
import {
  chatExplainSlotOf,
  chatOpenEventsOf,
  chatQuietWaitOf,
  chatTurnOf,
} from "@/components/conversation/talk-frame";
import {
  type LessonBubbleContent,
  LessonToriBubble,
  lessonBubbleWaitOf,
} from "@/components/conversation/tori";
import { WAIT_TEXT } from "@/components/session/wait-hint";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));

const SESSION = "00000000-0000-4000-8000-000000000001";

const content = (sentences: string[], done = true): LessonBubbleContent => ({
  lines: sentences.map((en) => ({ t: "s", en }) as const),
  ko: "재미있겠다!",
  done,
});

const base = {
  level: 3,
  englishName: "Momo",
  teacherName: "미나",
  waitSeconds: [1, 5] as const,
  onReplay: () => {},
  onSound: () => {},
};

describe("AC-27f 조용함 요청 뒤 기다림 칸(C243 보완 7 (3) · 정본 03 4절 96 · 97줄)", () => {
  it("AC-27f 조용함 요청을 보낸 동안만 기다림 시작 때를 낸다(그 밖 · 기존 두 방식은 없음)", () => {
    expect(chatQuietWaitOf({ quietWaiting: true, waitingSince: 1_234 })).toBe(
      1_234,
    );
    expect(
      chatQuietWaitOf({ quietWaiting: false, waitingSince: 1_234 }),
    ).toBeNull();
    expect(
      chatQuietWaitOf({ quietWaiting: true, waitingSince: null }),
    ).toBeNull();
  });

  it("AC-27f 지금 말풍선이 있으면 그 아래에 그리고, 말풍선이 비어 제자리 기다림 칸이 있으면 더 그리지 않는다", () => {
    expect(
      lessonBubbleWaitOf({
        waiting: 10,
        quietWait: 10,
        empty: false,
        sounds: 0,
      }),
    ).toBe("below");
    // 끊긴 조용함 행의 이어 하기(resume)는 말풍선을 비우고 보통 기다림 칸을 쓴다
    expect(
      lessonBubbleWaitOf({
        waiting: 10,
        quietWait: 10,
        empty: true,
        sounds: 0,
      }),
    ).toBe("in-place");
    expect(
      lessonBubbleWaitOf({
        waiting: 10,
        quietWait: null,
        empty: true,
        sounds: 0,
      }),
    ).toBe("in-place");
    expect(
      lessonBubbleWaitOf({
        waiting: 10,
        quietWait: null,
        empty: false,
        sounds: 0,
      }),
    ).toBe("none");
    expect(
      lessonBubbleWaitOf({
        waiting: null,
        quietWait: null,
        empty: true,
        sounds: 0,
      }),
    ).toBe("none");
  });

  it("AC-27f 말풍선 아래 기다림 칸은 보통 기다림 칸의 꼴(점 셋 · 상태 줄)이고 지금 말풍선은 그대로 둔다", () => {
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: content(["Do you like ducks?"]),
        waiting: 0,
        quietWait: 0,
      }),
    );
    expect(html).toContain("data-tori-bubble");
    expect(html).toContain("Do you like ducks?");
    expect(html).toContain("data-tori-waiting-quiet");
    expect(html).toContain('data-tori-waiting=""');
    expect(html).toContain("data-wait-hint");
    // 첫 그림에는 5초 줄이 없다(둘째 값이 지나야 붙음)
    expect(html).not.toContain("data-wait-line");
    const without = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: content(["Do you like ducks?"]),
        waiting: 0,
      }),
    );
    expect(without).not.toContain("data-tori-waiting");
  });
});

describe("AC-27f 막힌 뒤 설명 자리(C243 보완 7 (4) · 정본 03 4절 99줄)", () => {
  const turn = (explainWait?: number) =>
    chatTurnOf(SESSION, 4, {
      hint: true,
      ...(explainWait === undefined ? {} : { explainWait }),
    });

  it("AC-27f 끝 줄에 설명 기다림 칸이 있고 그 차례의 말풍선이 끝 줄까지 받았을 때만 자리를 잡는다(값 0 도 칸이 있음)", () => {
    expect(chatExplainSlotOf({ turn: turn(6), done: true })).toBe(true);
    expect(chatExplainSlotOf({ turn: turn(0), done: true })).toBe(true);
    // 새 선생님 차례가 흐르는 동안(끝 줄 전)은 앞 차례의 신호로 자리를 잡지 않는다
    expect(chatExplainSlotOf({ turn: turn(6), done: false })).toBe(false);
    expect(chatExplainSlotOf({ turn: turn(), done: true })).toBe(false);
    // 기존 두 방식(끝 줄 신호 없음)
    expect(chatExplainSlotOf({ turn: null, done: true })).toBe(false);
  });

  it("AC-27f 자리는 설명과 같은 꼴의 글 없는 한 줄이고, 설명이 오면 그 자리에 글이 든다(기다리는 표시는 없음)", () => {
    const slot = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: content(["Do you like ducks?"]),
        waiting: null,
        explainSlot: true,
      }),
    );
    expect(slot).toContain('data-tori-explanation-slot=""');
    expect(slot).toContain('aria-hidden="true"');
    expect(slot).not.toContain("data-tori-explanation=");
    expect(slot).not.toContain("data-wait-hint");
    const filled = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: content(["Do you like ducks?"]),
        waiting: null,
        explainSlot: true,
        explanation: "오리를 좋아하는지 묻는 거야.",
      }),
    );
    expect(filled).toContain('data-tori-explanation=""');
    expect(filled).toContain("오리를 좋아하는지 묻는 거야.");
    expect(filled).not.toContain("data-tori-explanation-slot");
    // 두 꼴의 클래스가 같다(같은 높이 · 간격)
    const classOf = (html: string, attr: string) =>
      new RegExp(`<p ${attr}[^>]*class="([^"]+)"`).exec(html)?.[1] ??
      new RegExp(`<p [^>]*class="([^"]+)"[^>]*${attr}`).exec(html)?.[1];
    expect(classOf(slot, 'data-tori-explanation-slot=""')).toBeDefined();
    expect(classOf(slot, 'data-tori-explanation-slot=""')).toBe(
      classOf(filled, 'data-tori-explanation=""'),
    );
    const none = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: content(["Do you like ducks?"]),
        waiting: null,
      }),
    );
    expect(none).not.toContain("data-tori-explanation");
  });
});

describe("AC-27g 이야기 방식 힌트 받기 단(C243 보완 7 (5) · 정본 03 4절 7 · 99줄)", () => {
  it("AC-27g 점 셋 줄의 최소 높이는 그 단 글 줄의 높이다(뜻 · 단을 모름 → 안내 글 한 줄, 영어 → 영어 글 한 줄, 듣기 단추가 있는 단 → 누르는 곳)", () => {
    expect(chatHintLoadingMinHOf(undefined)).toBe("min-h-7");
    expect(chatHintLoadingMinHOf({ kind: "ko" })).toBe("min-h-7");
    expect(chatHintLoadingMinHOf({ kind: "frame" })).toBe("min-h-8");
    expect(chatHintLoadingMinHOf({ kind: "sentence" })).toBe("min-h-8");
    expect(chatHintLoadingMinHOf({ kind: "sentence", listen: true })).toBe(
      "min-h-14",
    );
  });

  it("AC-27g 기존 방식의 점 셋 조각(속성 없음)은 그대로다", () => {
    const old = renderToStaticMarkup(createElement(HintLoadingDots));
    expect(old).toContain('class="flex min-h-9 items-center gap-2"');
    expect(old).not.toContain("data-wait-line");
  });

  it("AC-27g 이야기 방식은 받은 높이 값을 쓰고, 첫 그림에는 5초 줄이 없다", () => {
    const html = renderToStaticMarkup(
      createElement(HintLoadingDots, {
        chat: { minH: "min-h-8", waitSeconds: [1, 5] },
      }),
    );
    expect(html).toContain("min-h-8");
    expect(html).not.toContain("min-h-9");
    expect(html).toContain("data-hint-loading");
    expect(html).not.toContain(WAIT_TEXT.checking);
  });
});

describe("AC-27f 열림 때 기록 칸이 맨 아래를 떠나 있음(C243 보완 7 (7))", () => {
  it("AC-27f 열림 바로 뒤에 맨 아래를 떠남을 넣고, 붙어 있거나 값이 없으면 넣지 않는다", () => {
    const turn = chatTurnOf(SESSION, 4, { quietSeconds: 8 });
    const args = {
      turn,
      now: 100,
      hidden: false,
      stopping: false,
      reading: true,
    };
    expect(chatOpenEventsOf({ ...args, logAway: true })).toEqual([
      expect.objectContaining({ type: "open" }),
      { type: "log-away", now: 100 },
    ]);
    expect(chatOpenEventsOf({ ...args, logAway: false })).toHaveLength(1);
    expect(chatOpenEventsOf(args)).toHaveLength(1);
    expect(
      chatOpenEventsOf({ ...args, turn: null, logAway: true }),
    ).toHaveLength(0);
  });
});
