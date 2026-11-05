// 불편 1차 묶음 B — 화면 피드백 · 보상 · 표시(UX 검토 3판 2절 ② ③ ④ ⑤ · 4절 (나) · 13절 C166 R3 · R4 · R7 · C167, 코드 검토 B 지적 I · M).
// 시험 이름의 U 번호는 UX 검토 보고의 지적 번호다. 화면 조각은 renderToStaticMarkup 으로 그려 글 · 표지를 본다(효과는 돌지 않음).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  HOME_TEXT,
  HomeCards,
  homeCardLookOf,
  startHereAreaOf,
} from "@/app/(child)/home-cards";
import {
  RESULT_TEXT,
  ResultView,
  resultRewardOf,
} from "@/app/(child)/result/[id]/result-view";
import { handoffLinesOf } from "@/app/(setup)/first-run/first-run-flow";
import { ConfirmSheet } from "@/components/board/board";
import {
  CLOSING_TEXT,
  ClosingFirst,
  closingMetWordsOf,
  closingRewardOf,
} from "@/components/conversation/closing-cards";
import {
  closingFarewellOf,
  lessonSegmentLabelOf,
  wrapFarewellOf,
} from "@/components/conversation/talk-frame";
import {
  answerTipShownOf,
  BUBBLE_TEXT,
  LESSON_BUBBLE_START,
  type LessonBubbleContent,
  LessonToriBubble,
  lessonBubbleStep,
} from "@/components/conversation/tori";
import { pickAnotherShown, READING_TEXT } from "@/components/session/reading";
import { REWARD_TEXT } from "@/components/session/reward";
import {
  belowAmountOf,
  COMPOSITION_TEXT,
  canSubmitDraft,
  draftWordsOf,
} from "@/components/session/writing-composition";
import { homeBandChipsOf } from "@/core/home/band";
import { speechSettingsFrom } from "@/core/speech/listen";
import type { HomeCard } from "@/server/home";
import type { ResultView as ResultData } from "@/server/session/result";

// 브라우저 전용 표시 모듈 · 쪽 길잡이 · 서버 액션은 시험(node)에서 빈 모듈로
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/writing", () => ({}));
vi.mock("@/server/actions/teacher", () => ({}));
vi.mock("@/server/actions/first-run", () => ({}));

const progressCard = (over: Partial<HomeCard> = {}): HomeCard => ({
  area: "reading",
  gate: null,
  level: 1,
  unit: 1,
  thisWeek: 0,
  today: { done: false, newLessonDone: false },
  firstLesson: false,
  ...over,
});

/** 카드 한 장의 그림(그 카드 포스트잇 — 링크 또는 마이크 판정 전 글 상자 — 의 시작부터 다음 카드 표지 앞까지). */
function cardHtml(html: string, area: string): string {
  const at = html.indexOf(`data-home-card="${area}"`);
  expect(at, area).toBeGreaterThan(-1);
  const start = Math.max(
    html.lastIndexOf("<a", at),
    html.lastIndexOf("<div", at),
  );
  const end = html.indexOf("data-home-card=", at + 1);
  return html.slice(start, end === -1 ? undefined : end);
}

describe("홈 첫 사용 꼴(C166 R7)", () => {
  it("U2-1 수업을 하나도 안 한 영역 카드는 '첫 수업을 해 봐요' 한 줄과 큰 단추이고 아는 단어 0 · 최근 성적 빈 막대 · 이번 주 0일 · 오늘 아직이에요가 없다", () => {
    const first = progressCard({ firstLesson: true });
    expect(homeCardLookOf(first)).toBe("first");
    expect(homeCardLookOf(progressCard())).toBe("progress");
    expect(homeCardLookOf(progressCard({ gate: "placement" }))).toBe("gate");
    const html = renderToStaticMarkup(
      createElement(HomeCards, {
        cards: [first, progressCard({ area: "writing" })],
      }),
    );
    const reading = cardHtml(html, "reading");
    expect(reading).toContain(HOME_TEXT.firstLesson);
    expect(reading).toContain("data-first-lesson");
    expect(reading).toContain(HOME_TEXT.start);
    expect(reading).toContain("1단계");
    expect(reading).not.toContain("아는 단어");
    expect(reading).not.toContain("data-recent-cells");
    expect(reading).not.toContain("이번 주");
    expect(reading).not.toContain(HOME_TEXT.todayNotYet);
    // 한 번이라도 수업을 한 영역은 보통 꼴(4절 홈 표 — 단원 5칸 · 막대는 수업 목록 위 띠로 옮김, UI · UX 묶음 3 · [승인 UX2])
    const writing = cardHtml(html, "writing");
    expect(writing).not.toContain(HOME_TEXT.firstLesson);
    expect(writing).not.toContain("data-recent-cells");
    expect(writing).toContain("이번 주 0일");
    expect(writing).toContain(HOME_TEXT.todayNotYet);
  });

  it("U2-2 '여기부터 해요' 표지는 오늘 할 것이 남은 앞 영역 하나에만 붙고, 마이크 판정 전 · 닫힌 말하기 · 회화와 말하기를 기다리는 회화에는 붙지 않는다", () => {
    const cards = (over: Partial<Record<string, Partial<HomeCard>>>) =>
      (["reading", "writing", "speaking", "talk"] as const).map((area) =>
        progressCard({ area, ...over[area] }),
      );
    const done = { today: { done: true, newLessonDone: true } };
    expect(startHereAreaOf(cards({}), true)).toBe("reading");
    expect(startHereAreaOf(cards({ reading: done }), true)).toBe("writing");
    expect(startHereAreaOf(cards({ reading: done, writing: done }), true)).toBe(
      "speaking",
    );
    // 마이크 판정 전 · 쓸 수 없는 기기의 말하기 · 회화는 고르지 않는다
    expect(
      startHereAreaOf(cards({ reading: done, writing: done }), undefined),
    ).toBeUndefined();
    expect(
      startHereAreaOf(cards({ reading: done, writing: done }), false),
    ).toBeUndefined();
    // 말하기 배치 전 회화 카드는 말하기 배치로 가므로 고르지 않는다
    expect(
      startHereAreaOf(
        cards({
          reading: done,
          writing: done,
          speaking: done,
          talk: { gate: "needs_speaking" },
        }),
        true,
      ),
    ).toBeUndefined();
    // 배치 전 카드도 할 것이 정해진 영역이다
    expect(
      startHereAreaOf(cards({ reading: { gate: "placement" } }), true),
    ).toBe("reading");
    // 다 했으면 없음
    expect(
      startHereAreaOf(
        cards({ reading: done, writing: done, speaking: done, talk: done }),
        true,
      ),
    ).toBeUndefined();
    const html = renderToStaticMarkup(
      createElement(HomeCards, { cards: cards({}) }),
    );
    expect(html.match(/data-start-here=""/g)).toHaveLength(1);
    expect(cardHtml(html, "reading")).toContain(HOME_TEXT.startHere);
  });

  it("U2-3 배치 전 회화 카드의 단추 글은 '말하기 단계 찾기'이고 다른 영역은 '내 단계 찾기'다", () => {
    const html = renderToStaticMarkup(
      createElement(HomeCards, {
        cards: [
          progressCard({ gate: "placement" }),
          progressCard({ area: "talk", gate: "needs_speaking" }),
        ],
      }),
    );
    expect(HOME_TEXT.findSpeakingLevel).toBe("말하기 단계 찾기");
    expect(cardHtml(html, "reading")).toContain(HOME_TEXT.findLevel);
    // 회화 카드는 마이크 판정 전이라 단추 자리를 비운다 — 판정 뒤 글은 e2e 가 본다. 여기서는 글이 '내 단계 찾기'가 아닌 것만
    expect(cardHtml(html, "talk")).not.toContain(HOME_TEXT.findLevel);
  });
});

describe("확인 쪽지 단추 강조(U5-6 · U3-3)", () => {
  it("U5-6 · U3-3 확인 쪽지는 계속하는 쪽이 큰 먹색 단추(첫 단추 — 초점)이고 파괴적 선택('그만할래요' · '새 수업 할래요')은 작은 종이 단추다", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmSheet, {
        open: true,
        message: "선생님과 이야기를 그만할까요?",
        confirmLabel: "그만할래요",
        cancelLabel: "더 이야기할래요",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    const buttons = [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)];
    expect(buttons.map((b) => b[1])).toEqual(["더 이야기할래요", "그만할래요"]);
    const [keep, stop] = buttons.map((b) => b[0]);
    expect(keep).toContain("bg-ink");
    expect(keep).toContain("text-paper");
    expect(stop).toContain("bg-paper");
    expect(stop).not.toContain("bg-ink");
  });
});

/** 시험용 음성 설정(12절 기본값 tests/fixtures/speech/settings.json — 결과 자료의 speech 칸, 라-4). */
const RESULT_SPEECH = (() => {
  const raw = JSON.parse(
    readFileSync(
      join(process.cwd(), "tests", "fixtures", "speech", "settings.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  return speechSettingsFrom((key) => raw[key]);
})();

const resultData = (over: Partial<ResultData> = {}): ResultData => ({
  sessionId: "00000000-0000-4000-8000-000000000001",
  speech: RESULT_SPEECH,
  area: "reading",
  level: 1,
  unit: 1,
  kind: "regular",
  writingPart: null,
  title: "고양이 이야기",
  next: { kind: "list" },
  metWords: [
    { word: "cat", meaningKo: "고양이" },
    { word: "dog", meaningKo: "개" },
  ],
  waitHintSeconds: [1, 5],
  starsPerLesson: 1,
  ...over,
});

const wrapData = {
  lines: [],
  farewell: { en: "Bye, {NAME}!", ko: "잘 가!" },
  aborted: false,
  retry: false,
  kind: "regular" as const,
  starsPerLesson: 1,
  metWords: [],
  friendship: null,
  nextLesson: null,
};

describe("결과 · 마무리 보상(C166 R3 · C167 (5))", () => {
  it("U4-1 읽기 · 쓰기 · 말하기 결과에 별과 오늘 만난 말 카드가 보이고, 다시 하기는 별 · 단어 카드 대신 '다시 했어요', 쓰기 초고는 별이 없다", () => {
    expect(resultRewardOf(resultData())).toBe("star");
    expect(resultRewardOf(resultData({ kind: "retry" }))).toBe("retried");
    const draft = {
      state: "pending" as const,
      submittedAt: new Date(0).toISOString(),
      waitSeconds: 60,
      lessonId: "00000000-0000-4000-8000-000000000002",
    };
    expect(
      resultRewardOf(
        resultData({ area: "writing", writingPart: "draft", draft }),
      ),
    ).toBe("none");
    for (const area of ["reading", "writing", "speaking"] as const) {
      const html = renderToStaticMarkup(
        createElement(ResultView, { view: resultData({ area }) }),
      );
      expect(html, area).toContain("data-reward-star");
      expect(html, area).toContain(REWARD_TEXT.star);
      expect(html, area).toContain(REWARD_TEXT.metWords);
      // 세 영역 결과 칸 이름은 '오늘 만난 말'(정본 03:26 · 가르치고 spec 설계 5 문구 표, C173 (1) · C178 UX1 — teach 없는 수업도)
      expect(html, area).toContain("오늘 만난 말");
      expect(html, area).not.toContain("오늘 만난 단어");
      expect(html.match(/data-met-word=/g), area).toHaveLength(2);
      expect(html, area).toContain('lang="en"');
      expect(html, area).toContain("고양이");
    }
    // M-5 · R-40 다시 하기에는 오늘 만난 말 카드를 두지 않는다([승인 UX1] — 맞힌 단어는 P12)
    const retried = renderToStaticMarkup(
      createElement(ResultView, { view: resultData({ kind: "retry" }) }),
    );
    expect(retried).not.toContain("data-reward-star");
    expect(retried).toContain(REWARD_TEXT.retried);
    expect(retried).not.toContain(REWARD_TEXT.metWords);
    const empty = renderToStaticMarkup(
      createElement(ResultView, { view: resultData({ metWords: [] }) }),
    );
    expect(empty).not.toContain(REWARD_TEXT.metWords);
  });

  it("M-5 쓰기 6단계 이상 다시 하기의 초고 결과는 고쳐 쓰기 전이라 '다시 했어요'도 별도 없다", () => {
    expect(
      resultRewardOf(
        resultData({ area: "writing", kind: "retry", writingPart: "draft" }),
      ),
    ).toBe("none");
    expect(
      resultRewardOf(
        resultData({ area: "writing", kind: "retry", writingPart: "rewrite" }),
      ),
    ).toBe("retried");
  });

  it("I-1 별 수는 서버가 실은 reward.star_complete 만큼 그리고 글에는 숫자가 없다(값 2 — 결과 · 마무리 둘 다)", () => {
    expect(REWARD_TEXT.star).toBe("별을 받았어요");
    const two = renderToStaticMarkup(
      createElement(ResultView, { view: resultData({ starsPerLesson: 2 }) }),
    );
    expect(two.match(/data-star-icon=""/g)).toHaveLength(2);
    expect(two).not.toContain("하나");
    const one = renderToStaticMarkup(
      createElement(ResultView, { view: resultData() }),
    );
    expect(one.match(/data-star-icon=""/g)).toHaveLength(1);
    // 값 0 이면 별 줄이 없다
    const none = renderToStaticMarkup(
      createElement(ResultView, { view: resultData({ starsPerLesson: 0 }) }),
    );
    expect(none).not.toContain("data-reward-star");
    const closing = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: { ...wrapData, starsPerLesson: 2 },
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(closing.match(/data-star-icon=""/g)).toHaveLength(2);
  });

  it("U4-8 쓰기 초고 결과의 첨삭 기다림에는 '기다리는 동안 다른 공부를 해도 돼요' 한 줄이 붙고 별은 없다", () => {
    const html = renderToStaticMarkup(
      createElement(ResultView, {
        view: resultData({
          area: "writing",
          writingPart: "draft",
          draft: {
            state: "pending",
            submittedAt: new Date().toISOString(),
            waitSeconds: 60,
            lessonId: "00000000-0000-4000-8000-000000000002",
          },
        }),
      }),
    );
    expect(html).toContain(RESULT_TEXT.feedbackWait);
    expect(html).toContain('data-result-next="waiting"');
    expect(html).not.toContain("data-reward-star");
  });

  it("U4-1 회화 마무리 첫 장: 끝까지 한 대화는 별과 선생님 끝인사 글이 남고, 그만둔 대화 · 다시 한 대화는 별이 없다", () => {
    expect(closingRewardOf(wrapData)).toBe("star");
    expect(closingRewardOf({ ...wrapData, aborted: true })).toBe("none");
    expect(closingRewardOf({ ...wrapData, kind: "retry" })).toBe("none");
    const html = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: wrapData,
        farewell: { en: "See you next time, Momo!", ko: "다음에 또 보자!" },
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(html).toContain("data-reward-star");
    expect(html).toContain("data-closing-farewell");
    expect(html).toContain("See you next time, Momo!");
    expect(html).toContain("다음에 또 보자!");
    const aborted = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: { ...wrapData, aborted: true },
        farewell: wrapData.farewell,
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(aborted).not.toContain("data-reward-star");
  });

  it("N-2 정리의 끝맺음 상태 묻기가 실패해도 정리에서 읽은 카드 끝인사를 첫 장에 남기고, 끝맺음 끝인사가 왔으면 그것을 남긴다", async () => {
    const card = { en: "Bye! See you soon.", ko: "안녕! 또 만나." };
    const closing = { en: "Bye bye, friend!", ko: "잘 가, 친구야!" };
    expect(
      await wrapFarewellOf(() => Promise.reject(new Error("끊김")), card),
    ).toEqual({ closing: undefined, bye: card });
    expect(
      await wrapFarewellOf(
        () => Promise.resolve({ state: "pending" as const }),
        card,
      ),
    ).toEqual({ closing: undefined, bye: card });
    expect(
      await wrapFarewellOf(
        () =>
          Promise.resolve({
            state: "ready" as const,
            farewell: closing,
            goodLines: [],
            nextTime: [],
          }),
        card,
      ),
    ).toEqual({ closing, bye: closing });
  });

  it("M-6 마무리 첫 장의 끝인사 글은 정리에서 읽은 끝인사만(이름 채움) — 정리를 거치지 않은 첫 장만 길(목표 턴 뒤 '홈')에는 없다", () => {
    expect(closingFarewellOf(undefined, "Momo")).toBeUndefined();
    expect(
      closingFarewellOf({ en: "Bye, {NAME}!", ko: "잘 가, {NAME}!" }, "Momo"),
    ).toEqual({ en: "Bye, Momo!", ko: "잘 가, Momo!" });
    expect(closingFarewellOf({ en: "Bye!" }, "Momo")).toEqual({ en: "Bye!" });
    const html = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: wrapData,
        farewell: undefined,
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(html).not.toContain("data-closing-farewell");
  });
});

describe("회화 화면 표시", () => {
  it("U5-5 위 띠에 지금 토막 이름(인사 · 짧은 준비 · 대화 · 정리)이 보인다(더 이야기하기도 대화 — 새 흐름 네 토막, C189)", () => {
    expect(lessonSegmentLabelOf("greeting")).toBe("인사");
    expect(lessonSegmentLabelOf("prep")).toBe("짧은 준비");
    expect(lessonSegmentLabelOf("talk")).toBe("대화");
    expect(lessonSegmentLabelOf("more_talk")).toBe("대화");
    expect(lessonSegmentLabelOf("wrap_up")).toBe("정리");
  });

  it("U5-11 · R-29 ①② 듣기 단추 한 번 안내 '번호를 누르면 답을 들려줘요'는 프로필마다 한 번 — 프로필이 본 적 없을 때 처음 ①② 가 뜬 턴에만", () => {
    expect(BUBBLE_TEXT.answerTip).toBe("번호를 누르면 답을 들려줘요");
    // 프로필이 아직 안 봄(notices_seen.talk_answer_tip 없음): 이 회화에서 아직 안내한 턴이 없으면 이 턴에 보이고, 안내한 턴이 생기면 그 턴만
    expect(answerTipShownOf({ seen: false, tipTurn: null, turn: 3 })).toBe(
      true,
    );
    expect(answerTipShownOf({ seen: false, tipTurn: 3, turn: 3 })).toBe(true);
    expect(answerTipShownOf({ seen: false, tipTurn: 3, turn: 4 })).toBe(false);
    // 같은 프로필이 본 뒤(다른 기기 · 다시 연 회화 포함 — 서버 저장)에는 없다
    expect(answerTipShownOf({ seen: true, tipTurn: null, turn: 0 })).toBe(
      false,
    );
  });

  it("U5-11 · R-29 ①② 안내 줄은 답 두 개(선택지 소리 줄)가 있는 말풍선에서 안내할 때만 그리고, 기기 저장 열쇠(momo.answer-tip.v1)를 쓰지 않는다", () => {
    const linesOf = (
      lines: Parameters<typeof lessonBubbleStep>[1][],
    ): LessonBubbleContent => ({
      ...lines.reduce(lessonBubbleStep, LESSON_BUBBLE_START),
      done: true,
    });
    const pair = linesOf([
      { t: "s", en: "How old are you?" },
      { t: "sound", kind: "choices", answers: ["I'm nine.", "I'm ten."] },
    ]);
    const bubbleOf = (content: LessonBubbleContent, answerTip: boolean) =>
      renderToStaticMarkup(
        createElement(LessonToriBubble, {
          content,
          level: 1,
          englishName: "Momo",
          waiting: null,
          waitSeconds: [1, 5],
          answerTip,
          onReplay: () => {},
          onSound: () => {},
        }),
      );
    expect(bubbleOf(pair, true)).toContain(BUBBLE_TEXT.answerTip);
    expect(bubbleOf(pair, false)).not.toContain(BUBBLE_TEXT.answerTip);
    expect(bubbleOf(linesOf([{ t: "s", en: "Hi!" }]), true)).not.toContain(
      BUBBLE_TEXT.answerTip,
    );
  });
});

describe("보상 문구 · 홈 위 띠(UI · UX 묶음 0-다)", () => {
  it("R-12 · AC-U3 홈 위 띠의 별 칸은 별 수가 1 이상일 때만 있고, 연속 학습 일수 칸은 값이 들어오고 1 이상일 때만 있다(첫 사용 홈의 위 띠에 0 이 없다)", () => {
    expect(homeBandChipsOf({ starTotal: 0 })).toEqual([]);
    expect(homeBandChipsOf({ starTotal: 1 })).toEqual([
      { kind: "stars", value: 1 },
    ]);
    expect(homeBandChipsOf({ starTotal: 4, streakDays: 0 })).toEqual([
      { kind: "stars", value: 4 },
    ]);
    // 연속 학습 일수(P12 가 값을 넣음)는 별 수와 같은 규칙이고 별 칸보다 앞(위 띠 오른쪽 '연속 학습 일수와 별 수')
    expect(homeBandChipsOf({ starTotal: 0, streakDays: 2 })).toEqual([
      { kind: "streak", value: 2 },
    ]);
    expect(homeBandChipsOf({ starTotal: 3, streakDays: 1 })).toEqual([
      { kind: "streak", value: 1 },
      { kind: "stars", value: 3 },
    ]);
  });

  it("R-54 참여 완료 전에 그만둔 대화의 첫 장은 별 대신 '다음에 조금 더 이야기하면 별을 받아요'다", () => {
    expect(CLOSING_TEXT.aborted).toBe("다음에 조금 더 이야기하면 별을 받아요");
    const aborted = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: { ...wrapData, aborted: true },
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(aborted).toContain(CLOSING_TEXT.aborted);
    expect(aborted).not.toContain("data-reward-star");
    expect(aborted).not.toContain("끝까지");
  });

  it("R-19 다시 하기로 한 대화의 첫 장은 '다시 했어요'이고 오늘 만난 단어를 보이지 않는다(새 대화 · 그만둔 대화는 보인다)", () => {
    const words = [
      {
        word: "cat",
        meaningKo: "고양이",
        example: "I see a cat.",
        inTalk: true,
      },
    ];
    expect(closingMetWordsOf({ retry: false, metWords: words })).toEqual(words);
    expect(closingMetWordsOf({ retry: true, metWords: words })).toEqual([]);
    const retried = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: { ...wrapData, retry: true, kind: "retry", metWords: words },
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(retried).toContain(REWARD_TEXT.retried);
    expect(retried).not.toContain(CLOSING_TEXT.metWords);
    expect(retried).not.toContain("data-closing-word");
    const fresh = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: { ...wrapData, metWords: words },
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(fresh).toContain(CLOSING_TEXT.metWords);
    expect(fresh).toContain('data-closing-word="cat"');
  });
});

describe("세션 안 작은 안내", () => {
  it("U4-7 읽기 '한 번 더 풀기'를 누른 뒤 '다른 답을 골라요' 한 줄이 보인다(첫 고름 전 · 맞힌 뒤 · 정답 공개 뒤는 없음)", () => {
    expect(READING_TEXT.pickAnother).toBe("다른 답을 골라요");
    expect(pickAnotherShown([2], true)).toBe(true);
    expect(pickAnotherShown([2], false)).toBe(false);
    expect(pickAnotherShown([], false)).toBe(false);
    expect(pickAnotherShown([2, 1], false)).toBe(false);
  });

  it("N-1 한글만 쓴 초고도 '다 썼어요'가 켜지고(글이 비었는가로만 끔) 보이는 낱말 수는 0 이라 보내면 분량 아래 쪽지를 묻는다", () => {
    const korean = "나는 고양이가 좋아요";
    expect(canSubmitDraft(korean)).toBe(true);
    expect(canSubmitDraft("   ")).toBe(false);
    expect(canSubmitDraft("")).toBe(false);
    expect(draftWordsOf(korean)).toBe(0);
    expect(belowAmountOf(korean, { unit: "words", min: 30 })).toBe(true);
  });

  it("U4-6 쓰기 초고가 분량 아래면 '다 썼어요' 뒤 '이대로 보낼까요?' 확인을 묻고, 분량에 닿으면 묻지 않는다(단어 · 문장 분량 둘 다)", () => {
    expect(COMPOSITION_TEXT.shortConfirm).toBe("이대로 보낼까요?");
    const words = { unit: "words" as const, min: 10, max: 20 };
    expect(belowAmountOf("I like cats.", words)).toBe(true);
    expect(
      belowAmountOf(
        "I like cats and dogs and birds and fish very much.",
        words,
      ),
    ).toBe(false);
    // M-7 낱말은 화면의 '지금 n단어'와 같이 시드 검증기의 셈(sentenceWords)으로 — 떨어진 부호는 낱말이 아니고 쉼표로 붙은 둘은 두 낱말
    expect(draftWordsOf("cats .")).toBe(1);
    expect(draftWordsOf("dog,cat")).toBe(2);
    const two = { unit: "words" as const, min: 2, max: 4 };
    expect(belowAmountOf("cats .", two)).toBe(true);
    expect(belowAmountOf("dog,cat", two)).toBe(false);
    const sentences = { unit: "sentences" as const, min: 3, max: 5 };
    expect(belowAmountOf("I like cats. They are cute.", sentences)).toBe(true);
    expect(
      belowAmountOf("I like cats. They are cute. I have one.", sentences),
    ).toBe(false);
  });

  it("U1-3 '아이에게 넘겨 주세요' 화면은 영역마다 무엇을 먼저 하는지 세 줄 안에서 알린다", () => {
    expect(handoffLinesOf({ startLevels: {}, alphabetUnknown: false })).toEqual(
      [
        "읽기 · 쓰기 · 말하기는 짧은 문제로 단계를 찾아요",
        "회화는 말하기 단계를 찾은 뒤에 시작해요",
      ],
    );
    expect(
      handoffLinesOf({
        startLevels: { reading: 2, speaking: 1 },
        alphabetUnknown: false,
      }),
    ).toEqual([
      "읽기 · 말하기는 고른 단계의 첫 수업부터 해요",
      "쓰기는 짧은 문제로 단계를 찾아요",
      "회화는 말하기 단계를 따라 시작해요",
    ]);
    expect(
      handoffLinesOf({
        startLevels: { speaking: 1, talk: 1 },
        alphabetUnknown: true,
      }),
    ).toEqual([
      "읽기 · 쓰기는 알파벳 · 소리 단원부터 해요",
      "말하기 · 회화는 고른 단계의 첫 수업부터 해요",
    ]);
    for (const lines of [
      handoffLinesOf({ startLevels: {}, alphabetUnknown: true }),
      handoffLinesOf({
        startLevels: { reading: 1, writing: 1, speaking: 1, talk: 1 },
        alphabetUnknown: false,
      }),
    ])
      expect(lines.length).toBeLessThanOrEqual(3);
  });
});
