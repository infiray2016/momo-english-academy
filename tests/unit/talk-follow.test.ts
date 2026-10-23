// 회화 따라 말하기 · 처음 안내 · 마무리 세 장(plan-p13b 파일별 값 14 · 15, 4절 회화 세션 · 회화 마무리 행 · 3.3 · C33 · C39 · C97 ·
// 컨트롤러 결정 '열 때마다 시작! 한 번'). 차례 고르기 · 다시 보임 판정 · 장 차례 · 친한 정도 칸은 순수 함수, 화면 글은 정적 그림으로 본다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CLOSING_TEXT,
  ClosingFirst,
  ClosingThird,
  closingCardsOf,
  friendshipCellsOf,
} from "@/components/conversation/closing-cards";
import {
  followStepsOf,
  practiceRevealOf,
  TALK_START_TEXT,
  TalkStart,
} from "@/components/conversation/follow-along";
import { TEACHER_TEXT } from "@/core/teacher/name";
import { TEST_SETTINGS } from "../fixtures/settings";

// 브라우저 전용 표시 모듈 · 쪽 길잡이 · 서버 액션은 시험(node)에서 빈 모듈로
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));

const HINT_READ_MATCH = TEST_SETTINGS["talk.hint_read_match"].value;
const FRIENDSHIP_MAX = TEST_SETTINGS["talk.friendship_max"].value;

const todayWords = [
  { word: "cat", meaningKo: "고양이", example: "I see a cat." },
  { word: "run", meaningKo: "달리다", example: "I can run." },
  { word: "red", meaningKo: "빨간", example: "It is red." },
];
const practice = {
  items: [
    { word: "cat", example: "I see a cat.", exampleKo: "고양이가 보여." },
    { word: "run", example: "I can run.", exampleKo: "나는 달릴 수 있어." },
  ],
  order: [
    [0, 1],
    [1, 0],
  ],
};
const noneDone = { today: [], practice: [], wrapUp: [], again: false };

describe("따라 말하기 차례(값 14)", () => {
  it("회화 따라 말하기: 오늘 쓸 말은 단어 차례, 말해 보기는 바퀴마다 정한 차례이고 1~3단계 따라 말할 것은 단어 · 4단계부터 예문이다", () => {
    const low = followStepsOf({
      todayWords,
      practice,
      done: noneDone,
      lowLevel: true,
    });
    expect(low.today.map((s) => [s.index, s.target])).toEqual([
      [0, "cat"],
      [1, "run"],
      [2, "red"],
    ]);
    expect(low.practice.map((s) => `${s.round}:${s.index}`)).toEqual([
      "0:0",
      "0:1",
      "1:1",
      "1:0",
    ]);
    // 첫 바퀴는 영어와 뜻, 둘째 바퀴부터 뜻만
    expect(low.practice.map((s) => s.showEnglish)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(low.practice[0]?.target).toBe("I see a cat.");
    const high = followStepsOf({
      todayWords,
      practice: { items: [], order: [] },
      done: noneDone,
      lowLevel: false,
    });
    expect(high.today.map((s) => s.target)).toEqual([
      "I see a cat.",
      "I can run.",
      "It is red.",
    ]);
    expect(high.practice).toEqual([]);
  });

  it("회화 따라 말하기: 이어 열면 이미 저장한 차례는 건너뛴다", () => {
    const steps = followStepsOf({
      todayWords,
      practice,
      done: {
        today: [0, 1],
        practice: [{ round: 0, index: 0 }],
      },
      lowLevel: true,
    });
    expect(steps.today.map((s) => s.index)).toEqual([2]);
    expect(steps.practice.map((s) => `${s.round}:${s.index}`)).toEqual([
      "0:1",
      "1:1",
      "1:0",
    ]);
  });

  it("회화 말해 보기: 둘째 바퀴부터 일치율이 talk.hint_read_match 아래이면 영어 문장을 보이고 들려준다(첫 바퀴는 이미 보임)", () => {
    expect(
      practiceRevealOf({ round: 1, rate: 0.5, hintReadMatch: HINT_READ_MATCH }),
    ).toBe(true);
    expect(
      practiceRevealOf({
        round: 1,
        rate: HINT_READ_MATCH,
        hintReadMatch: HINT_READ_MATCH,
      }),
    ).toBe(false);
    expect(
      practiceRevealOf({ round: 0, rate: 0, hintReadMatch: HINT_READ_MATCH }),
    ).toBe(false);
  });
});

describe("처음 회화 안내 · '시작!'(값 14 · 3.3)", () => {
  it("AC-16c 처음 회화 안내는 3.3 글 그대로 세션 선생님 이름 자리를 채우고 처음이 아니면 안내 글 없이 '시작!'만 있다", () => {
    const first = renderToStaticMarkup(
      createElement(TalkStart, {
        first: true,
        teacherName: "미나",
        onStart: () => {},
      }),
    );
    expect(first).toContain("data-talk-intro");
    for (const line of TEACHER_TEXT.intro("미나"))
      expect(first).toContain(line);
    expect(first).toContain("미나는 앱 속 AI 선생님이에요.");
    expect(first).toContain("미나는 지난 이야기를 조금 기억해요");
    expect(first).toContain("미나와 나눈 이야기는 부모님도 볼 수 있어요");
    expect(first).toContain('aria-label="미나 선생님"');
    expect(first).toContain(TALK_START_TEXT.start);
    expect(first).not.toContain("토리");
    // 고르기 전(이름 없음)은 '선생님'
    const before = renderToStaticMarkup(
      createElement(TalkStart, { first: true, onStart: () => {} }),
    );
    expect(before).toContain("선생님은 지난 이야기를 조금 기억해요");
    expect(before).toContain("선생님과 나눈 이야기는 부모님도 볼 수 있어요");
    const again = renderToStaticMarkup(
      createElement(TalkStart, {
        first: false,
        teacherName: "미나",
        onStart: () => {},
      }),
    );
    expect(again).not.toContain("data-talk-intro");
    expect(again).toContain(TALK_START_TEXT.start);
    expect(TEACHER_TEXT.followGuide("미나")).toBe("미나를 따라 말해 봐요");
  });
});

const wrap = {
  lines: [
    {
      en: "Today you said cat.",
      ko: "오늘 그 말을 했어.",
      source: "card" as const,
    },
  ],
  farewell: { en: "Bye! See you soon.", ko: "안녕! 또 만나." },
  aborted: false,
  retry: false,
  gotWords: [
    { word: "cat", meaningKo: "고양이", example: "I see a cat.", inTalk: true },
    { word: "run", meaningKo: "달리다", example: "I can run.", inTalk: false },
  ],
  friendship: { value: 3, max: FRIENDSHIP_MAX },
  nextLesson: {
    lessonId: "00000000-0000-4000-8000-000000000001",
    title: "회화 1단계 대화 2",
  },
};

describe("마무리 세 장(값 15 · 4절 회화 마무리 · C33)", () => {
  it("AC-15e 1~3단계 마무리는 둘째 장 없이 첫 장 · 셋째 장이고 목표 턴 뒤 '홈'은 첫 장만이다", () => {
    expect(closingCardsOf({ lowLevel: true, mode: "full" })).toEqual([
      "first",
      "third",
    ]);
    expect(closingCardsOf({ lowLevel: true, mode: "first" })).toEqual([
      "first",
    ]);
  });

  it("회화 마무리: 친한 정도 막대는 talk.friendship_max 칸 가운데 지금 값만큼 찬다(숫자 없음)", () => {
    const cells = friendshipCellsOf(3, FRIENDSHIP_MAX);
    expect(cells).toHaveLength(FRIENDSHIP_MAX);
    expect(cells.filter(Boolean)).toHaveLength(3);
    expect(
      friendshipCellsOf(FRIENDSHIP_MAX + 2, FRIENDSHIP_MAX).every(Boolean),
    ).toBe(true);
  });

  it("AC-15g 마무리 첫 장의 오늘 얻은 단어는 대화에 원형이 안 나온 것에만 듣기 단추가 있고 끝인사 · 숫자 · 퍼센트 · '내일'이 없다", () => {
    const html = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap,
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(html).toContain(CLOSING_TEXT.gotWords);
    expect(html).toContain('data-closing-word="cat"');
    expect(html).toContain('data-closing-word="run"');
    expect(html.match(/data-word-listen/g)).toHaveLength(1);
    expect(html).not.toContain(wrap.farewell.en);
    expect(html).not.toContain("내일");
    expect(html).not.toContain("%");
    expect(html.replace(/<[^>]*>/g, "")).not.toMatch(/\d/);
    expect(html).toContain(CLOSING_TEXT.next);
  });

  it("AC-15f 목표 턴 전 그만둔 대화의 첫 장은 '다음에 끝까지 이야기하면 별을 받아요', 다시 하기는 '다시 했어요'다", () => {
    const aborted = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: { ...wrap, aborted: true },
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(aborted).toContain("다음에 끝까지 이야기하면 별을 받아요");
    const retried = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: { ...wrap, retry: true, friendship: null },
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(retried).toContain("다시 했어요");
    expect(retried).not.toContain("다음에 끝까지 이야기하면 별을 받아요");
  });

  it("AC-15e 셋째 장은 친한 정도 막대 · 다음 이야기 · 큰 '다음 이야기' · 작은 '홈'이고 '다음'이 없으며 다음 수업이 없으면 큰 단추는 '수업 목록', 다시 하기는 막대가 없다", () => {
    const props = {
      busy: false,
      onNextStory: () => {},
      onLessons: () => {},
      onHome: () => {},
    };
    const html = renderToStaticMarkup(
      createElement(ClosingThird, { wrap, teacherName: "리오", ...props }),
    );
    expect(html).toContain("data-friendship");
    expect(html).toContain("리오와 친한 정도");
    expect(
      renderToStaticMarkup(createElement(ClosingThird, { wrap, ...props })),
    ).toContain("선생님과 친한 정도");
    expect(html.match(/data-friendship-cell/g)).toHaveLength(FRIENDSHIP_MAX);
    expect(html).toContain(wrap.nextLesson.title);
    expect(html).toContain(CLOSING_TEXT.nextStory);
    expect(html).toContain(CLOSING_TEXT.home);
    expect(html).not.toContain(`>${CLOSING_TEXT.next}<`);
    expect(html).not.toContain("내일");
    expect(html).not.toContain("%");
    // 숫자는 다음 이야기 제목(시드 글)에만 — 친한 정도에 수를 쓰지 않는다
    expect(
      html.replace(wrap.nextLesson.title, "").replace(/<[^>]*>/g, ""),
    ).not.toMatch(/\d/);
    const none = renderToStaticMarkup(
      createElement(ClosingThird, {
        wrap: { ...wrap, nextLesson: null, retry: true, friendship: null },
        ...props,
      }),
    );
    expect(none).toContain(CLOSING_TEXT.lessons);
    expect(none).not.toContain(CLOSING_TEXT.nextStory);
    expect(none).not.toContain("data-friendship");
  });
});
