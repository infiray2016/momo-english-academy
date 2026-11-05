// 화면 가족 꼴(UI · UX plan 묶음 5-가 · spec 설계 5.4 화면 가족 · 결과 판 배치 · UX 검토 3판 D-1 · D-7 · D-10 · D-14 · 15절 AC-23j).
// 세션 진행 표시는 점 대신 활동 묶음 막대(묶음 이름 · 지금 자리 — 순수 함수 activityGroupsOf, 이름 표는 한 곳: plan 정한 것 8)이고, 결과는
// 판 하나에 결과 전부(가로 두 열 · 세로 한 열, 별이 앞쪽), 막힘 · 쉼 · 오류는 화면 가운데 큰 판 하나(빈 바탕이 화면 높이 1/3 아래), 첫 실행
// 종이는 내용 높이다. 화면 조각은 renderToStaticMarkup 으로 그려 표지 · 차례를 본다(효과는 돌지 않음). 판 상자 셈(e2e 도우미)은 순수 함수다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/writing", () => ({}));
vi.mock("@/server/actions/placement", () => ({}));
vi.mock("@/server/actions/first-run", () => ({}));

import {
  RESULT_TEXT,
  ResultView,
  resultRewardSideOf,
} from "@/app/(child)/result/[id]/result-view";
import { FirstRunFlow } from "@/app/(setup)/first-run/first-run-flow";
import { ActivityProgress } from "@/components/session/activity-progress";
import { AiRest } from "@/components/session/ai-rest";
import { AppErrorPanel, NotFoundPanel } from "@/components/session/app-trouble";
import {
  FamilyBoard,
  STANDALONE_BOARD_MIN_SHARE,
} from "@/components/session/family-board";
import { MicBlockedPanel } from "@/components/session/mic-blocked";
import { REWARD_TEXT } from "@/components/session/reward";
import type { Activity, ActivityKind } from "@/core/session/preview";
import {
  ACTIVITY_GROUP_NAME,
  ACTIVITY_GROUP_OF,
  activityGroupsOf,
  isTeachActivities,
  TEACH_SLOT_OF,
} from "@/core/session/progress";
import { TEACH_SLOT_NAME } from "@/core/session/teach-line";
import { speechSettingsFrom } from "@/core/speech/listen";
import type { ResultView as ResultData } from "@/server/session/result";
import { DESK_EMPTY_MAX, deskEmptyShareOf } from "../e2e/board-fill";

/** 활동 종류 전부(core/session/preview Activity 의 kind — 이름 표가 모두 덮는지 본다). */
const ALL_KINDS: readonly ActivityKind[] = [
  "today",
  "model",
  "together",
  "spare",
  "preview",
  "reading-passage",
  "reading-question",
  "writing-item",
  "writing-task",
  "writing-guided",
  "writing-own-repeat",
  "thinkout",
  "draft",
  "feedback-praise",
  "feedback-correction",
  "rewrite",
  "model-answer",
  "own-speak",
  "repeat-word",
  "repeat-sentence",
  "listening",
  "picture-task",
  "question",
  "presentation",
  "confirm-question",
];

/**
 * 정본 3.2 · 3.3 의 활동 · 자리 이름(묶음 이름은 이 안에서만 — 새 문구를 만들지 않는다, plan 정한 것 8). 가르치는 수업의 자리 다섯은
 * 델타 spec 설계 5 '정본 밖 문구' 표 '위 띠 자리 이름' 글 그대로(가르치고 plan 정한 것 16 — teach-line TEACH_SLOT_NAME).
 */
const CANON_NAMES = new Set([
  "오늘 배울 것",
  "살펴보기",
  "같이 해 보기",
  "혼자 해 보기",
  "스스로 해 보기",
  "새 단어",
  "보여 주기",
  "지문 읽기",
  "문제",
  "과제",
  "따라 말하기",
  "생각 꺼내기",
  "초고 쓰기",
  "첨삭 보기",
  "고쳐 쓰기",
  "모범 답안",
  "내 문장 말하기",
  "듣기",
  "질문",
  "주제 말하기",
  "확인 질문",
]);

const reading: Activity[] = [
  { kind: "preview" },
  { kind: "reading-passage" },
  { kind: "reading-question", index: 0 },
  { kind: "reading-question", index: 1 },
  { kind: "reading-question", index: 2 },
  { kind: "reading-question", index: 3 },
];

const speaking: Activity[] = [
  { kind: "preview" },
  { kind: "repeat-word", index: 0 },
  { kind: "repeat-word", index: 1 },
  { kind: "repeat-sentence", index: 0 },
  { kind: "listening", index: 0 },
  { kind: "listening", index: 1 },
  { kind: "question", index: 0 },
];

describe("활동 묶음 막대(D-7 · 설계 5.4 세션 · plan 정한 것 8)", () => {
  it("D-7 읽기 세션은 새 단어 · 지문 읽기 · 문제 세 묶음이고, 지금 묶음과 그 안 자리 · 끝낸 수를 낸다", () => {
    const groups = activityGroupsOf(reading, 4, new Set([1, 2, 3]));
    expect(groups.map((g) => g.name)).toEqual(["새 단어", "지문 읽기", "문제"]);
    expect(groups.map((g) => g.state)).toEqual(["done", "done", "current"]);
    const [, , questions] = groups;
    expect(questions).toMatchObject({
      first: 3,
      size: 4,
      done: 1,
      at: 2,
    });
    expect(questions?.cells).toEqual(["done", "current", "next", "next"]);
    expect(groups[0]?.at).toBeUndefined();
  });

  it("D-7 말하기 세션은 따라 말하기(낱말 · 문장)를 한 묶음으로 묶어 새 단어 · 따라 말하기 · 듣기 · 질문 넷이다", () => {
    const groups = activityGroupsOf(speaking, 1, new Set());
    expect(groups.map((g) => [g.name, g.size])).toEqual([
      ["새 단어", 1],
      ["따라 말하기", 3],
      ["듣기", 2],
      ["질문", 1],
    ]);
    expect(groups.map((g) => g.state)).toEqual([
      "current",
      "next",
      "next",
      "next",
    ]);
    // 묶음 크기의 합은 활동 수다(칸 하나 = 활동 하나)
    expect(groups.reduce((n, g) => n + g.size, 0)).toBe(speaking.length);
  });

  it("D-7 묶음 이름은 이름 표 한 곳에서 오고 정본 3.2 · 3.3 의 활동 · 자리 이름이며, 모든 활동 종류가 묶음을 가진다", () => {
    expect(Object.keys(ACTIVITY_GROUP_OF).sort()).toEqual(
      [...ALL_KINDS].sort(),
    );
    for (const kind of ALL_KINDS) {
      const name = ACTIVITY_GROUP_NAME[ACTIVITY_GROUP_OF[kind]];
      expect(CANON_NAMES.has(name), `${kind} → ${name}`).toBe(true);
    }
    // plan 정한 것 8 이 든 다섯(새 단어 · 과제 · 따라 말하기 · 듣기 · 질문)
    expect(ACTIVITY_GROUP_NAME[ACTIVITY_GROUP_OF.preview]).toBe("새 단어");
    expect(ACTIVITY_GROUP_NAME[ACTIVITY_GROUP_OF["writing-task"]]).toBe("과제");
    expect(ACTIVITY_GROUP_NAME[ACTIVITY_GROUP_OF["repeat-word"]]).toBe(
      "따라 말하기",
    );
    expect(ACTIVITY_GROUP_NAME[ACTIVITY_GROUP_OF.listening]).toBe("듣기");
    expect(ACTIVITY_GROUP_NAME[ACTIVITY_GROUP_OF.question]).toBe("질문");
  });

  it("D-7 이웃한 같은 묶음만 합치고, 지금 활동이 없으면(끝낸 뒤) 지금 묶음이 없다", () => {
    const guided: Activity[] = [
      { kind: "preview" },
      { kind: "writing-task" },
      { kind: "writing-guided" },
      { kind: "writing-own-repeat" },
    ];
    const groups = activityGroupsOf(guided, 3, new Set([1, 2]));
    // 과제 → 문장 틀 쓰기는 한 묶음 '과제'(정본 3.3 쓰기 4단계 행, 5-가 검토 M1)
    expect(groups.map((g) => g.name)).toEqual([
      "새 단어",
      "과제",
      "따라 말하기",
    ]);
    expect(groups.map((g) => g.state)).toEqual(["done", "current", "next"]);
    expect(groups[1]?.cells).toEqual(["done", "current"]);
    // 떨어진 같은 이름은 따로 묶음(차례가 곧 자리)
    const apart: Activity[] = [
      { kind: "repeat-word", index: 0 },
      { kind: "listening", index: 0 },
      { kind: "repeat-sentence", index: 0 },
    ];
    const split = activityGroupsOf(apart, 1, new Set());
    expect(split.map((g) => g.name)).toEqual([
      "따라 말하기",
      "듣기",
      "따라 말하기",
    ]);
    const after = activityGroupsOf(reading, reading.length + 1, new Set());
    expect(after.some((g) => g.state === "current")).toBe(false);
  });

  it("D-7 진행 막대 그림: 묶음 이름은 안내 크기(20px) 글이고 지금 묶음에 aria-current, 활동 수 표지와 칸 수 = 활동 수, '%' 가 없다", () => {
    const html = renderToStaticMarkup(
      createElement(ActivityProgress, {
        area: "reading",
        groups: activityGroupsOf(reading, 4, new Set([1, 2, 3])),
      }),
    );
    expect(html).toContain('data-activity-progress=""');
    expect(html).toContain(`data-activity-total="${reading.length}"`);
    expect(html.match(/data-progress-cell=/g)).toHaveLength(reading.length);
    expect(html.match(/data-progress-group=/g)).toHaveLength(3);
    expect(html).toMatch(/<li[^>]*aria-current="step"[^>]*>/);
    expect(html.match(/aria-current=/g)).toHaveLength(1);
    for (const name of ["새 단어", "지문 읽기", "문제"])
      expect(html).toContain(name);
    expect(html).toContain("text-xl");
    expect(html).not.toContain("%");
    // 점(작은 동그라미 18개 — D-7)이 아니다
    expect(html).not.toContain("data-activity-dots");
  });
});

/** 가르치는 수업 읽기 세션(오늘 배울 것 → 새 단어 → 본보기 셋 → 같이 해 보기 둘 → 지문 → 문항 셋 → 짝 셋, 델타 spec 설계 1). */
const teachReading: Activity[] = [
  { kind: "today" },
  { kind: "preview" },
  { kind: "model", index: 0 },
  { kind: "model", index: 1 },
  { kind: "model", index: 2 },
  { kind: "together", index: 0 },
  { kind: "together", index: 1 },
  { kind: "reading-passage" },
  { kind: "reading-question", index: 0 },
  { kind: "reading-question", index: 1 },
  { kind: "reading-question", index: 2 },
  { kind: "spare", base: "reading-question", index: 0 },
  { kind: "spare", base: "reading-question", index: 1 },
  { kind: "spare", base: "reading-question", index: 2 },
];

describe("가르치는 수업의 진행 막대 · 위 띠 자리 이름(가르치고 plan 정한 것 16 · 15절 AC-22c)", () => {
  it("AC-22c 가르치는 수업은 묶음을 자리 다섯(오늘 배울 것 · 살펴보기 · 같이 해 보기 · 혼자 해 보기 · 스스로 해 보기)으로 내고 이름은 위 띠 자리 이름 표에서 온다", () => {
    const groups = activityGroupsOf(
      teachReading,
      9,
      new Set([1, 2, 3, 4, 5, 6, 7, 8]),
    );
    expect(groups.map((g) => [g.key, g.name, g.size])).toEqual([
      ["today", TEACH_SLOT_NAME.today, 1],
      ["show", TEACH_SLOT_NAME.show, 4],
      ["together", TEACH_SLOT_NAME.together, 2],
      ["solo", TEACH_SLOT_NAME.solo, 4],
      ["spare", TEACH_SLOT_NAME.spare, 3],
    ]);
    expect(groups.map((g) => g.name)).toEqual([
      "오늘 배울 것",
      "살펴보기",
      "같이 해 보기",
      "혼자 해 보기",
      "스스로 해 보기",
    ]);
    expect(groups.map((g) => g.state)).toEqual([
      "done",
      "done",
      "done",
      "current",
      "next",
    ]);
    // 혼자 해 보기는 지문과 문항 전부가 한 묶음이다(지금 자리 = 둘째 칸)
    expect(groups[3]?.at).toBe(2);
    for (const g of groups) expect(CANON_NAMES.has(g.name)).toBe(true);
  });

  it("AC-22c 자리 표는 모든 활동 종류를 덮고, 새 단어는 살펴보기 · 짝은 스스로 해 보기 · 과제 활동은 혼자 해 보기다", () => {
    expect(Object.keys(TEACH_SLOT_OF).sort()).toEqual([...ALL_KINDS].sort());
    expect(TEACH_SLOT_OF.preview).toBe("show");
    expect(TEACH_SLOT_OF.model).toBe("show");
    expect(TEACH_SLOT_OF.spare).toBe("spare");
    for (const kind of [
      "reading-passage",
      "reading-question",
      "writing-item",
      "repeat-word",
      "repeat-sentence",
      "listening",
      "question",
    ] as const)
      expect(TEACH_SLOT_OF[kind]).toBe("solo");
    for (const kind of ALL_KINDS)
      expect(CANON_NAMES.has(TEACH_SLOT_NAME[TEACH_SLOT_OF[kind]])).toBe(true);
  });

  it("AC-22c 내지 않을 짝(hidden)은 막대에서 빠져 '스스로 해 보기'는 낸 짝만 센다(정한 것 3 · 위험 9)", () => {
    const done = new Set(Array.from({ length: 11 }, (_, i) => i + 1));
    const groups = activityGroupsOf(teachReading, 13, done, new Set([12, 14]));
    expect(groups.map((g) => [g.key, g.size])).toEqual([
      ["today", 1],
      ["show", 4],
      ["together", 2],
      ["solo", 4],
      ["spare", 1],
    ]);
    const spare = groups.at(-1);
    expect(spare).toMatchObject({ first: 13, at: 1, state: "current" });
    // 칸 수 = 활동 수 − 뺀 짝
    expect(groups.reduce((n, g) => n + g.size, 0)).toBe(
      teachReading.length - 2,
    );
    // hidden 을 주지 않으면 지금 그대로(모든 활동이 칸)
    expect(
      activityGroupsOf(teachReading, 13, done).reduce((n, g) => n + g.size, 0),
    ).toBe(teachReading.length);
  });

  it("AC-22c teach 없는 수업(오늘 배울 것이 없는 활동 목록)은 지금 묶음 표 그대로다(정한 것 1)", () => {
    expect(isTeachActivities(reading)).toBe(false);
    expect(isTeachActivities(teachReading)).toBe(true);
    expect(activityGroupsOf(reading, 1, new Set()).map((g) => g.name)).toEqual([
      "새 단어",
      "지문 읽기",
      "문제",
    ]);
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
  next: { kind: "lesson", lessonId: "00000000-0000-4000-8000-000000000003" },
  metWords: [
    { word: "cat", meaningKo: "고양이" },
    { word: "dog", meaningKo: "개" },
  ],
  waitHintSeconds: [1, 5],
  starsPerLesson: 1,
  ...over,
});

describe("결과 판(설계 5.4 결과 판 배치 · AC-23j · D-10)", () => {
  it("AC-23j 판 하나에 별 · 제목 · 오늘 만난 말 · 단추 줄이 있고, 별 자리가 제목보다 앞(세로 첫째)이며 가로는 오른쪽 열이다", () => {
    const html = renderToStaticMarkup(
      createElement(ResultView, { view: resultData() }),
    );
    const board = html.indexOf('data-family-board="result"');
    expect(board).toBeGreaterThan(-1);
    const star = html.indexOf("data-result-reward");
    const title = html.indexOf(RESULT_TEXT.done);
    const words = html.indexOf("data-met-words");
    const buttons = html.indexOf("data-result-buttons");
    expect(board).toBeLessThan(star);
    expect(star).toBeLessThan(title);
    expect(title).toBeLessThan(words);
    expect(words).toBeLessThan(buttons);
    expect(html).toContain('data-result-columns="two"');
    // 가로 두 열: 별 열이 오른쪽(차례를 뒤집음), 세로 한 열
    expect(html).toContain("landscape:flex-row-reverse");
    expect(html).toContain(REWARD_TEXT.star);
  });

  it("AC-23j · D-10 단추 줄: '다음 수업'(큰) · '홈'(작은)은 판 안 아래 단추 줄에 있고 위 띠에는 '홈'이 없다", () => {
    const html = renderToStaticMarkup(
      createElement(ResultView, { view: resultData() }),
    );
    const band = html.slice(0, html.indexOf("</header>"));
    expect(band).not.toContain(RESULT_TEXT.home);
    const row = html.slice(html.indexOf("data-result-buttons"));
    expect(row).toContain(RESULT_TEXT.nextLesson);
    expect(row).toMatch(/<a[^>]*href="\/"[^>]*>홈<\/a>/);
    expect(row.indexOf(RESULT_TEXT.nextLesson)).toBeLessThan(
      row.indexOf(">홈<"),
    );
  });

  it("AC-23j 다시 하기는 별 자리에 '다시 했어요'를 두고, 쓰기 초고 · 별 0 은 별 자리를 접어 한 열이다", () => {
    expect(resultRewardSideOf(resultData())).toBe("star");
    expect(resultRewardSideOf(resultData({ kind: "retry" }))).toBe("retried");
    expect(resultRewardSideOf(resultData({ starsPerLesson: 0 }))).toBeNull();
    const draft = resultData({
      area: "writing",
      writingPart: "draft",
      draft: {
        state: "pending",
        submittedAt: new Date(0).toISOString(),
        waitSeconds: 60,
        lessonId: "00000000-0000-4000-8000-000000000002",
      },
    });
    expect(resultRewardSideOf(draft)).toBeNull();
    const retried = renderToStaticMarkup(
      createElement(ResultView, { view: resultData({ kind: "retry" }) }),
    );
    const side = retried.slice(retried.indexOf("data-result-reward"));
    expect(side).toContain(REWARD_TEXT.retried);
    expect(retried.indexOf("data-result-reward")).toBeLessThan(
      retried.indexOf(RESULT_TEXT.done),
    );
    const sent = renderToStaticMarkup(
      createElement(ResultView, { view: draft }),
    );
    expect(sent).not.toContain("data-result-reward");
    expect(sent).toContain('data-result-columns="one"');
    expect(sent).toContain(RESULT_TEXT.sent);
  });
});

describe("막힘 · 쉼 · 오류 판(설계 5.4 · D-1)", () => {
  it("D-1 앱 오류 · 없는 주소는 화면 가운데 큰 판 하나이고, 판의 최소 높이가 화면 높이의 2/3 이상이라 빈 바탕이 1/3 아래다", () => {
    expect(STANDALONE_BOARD_MIN_SHARE).toBeGreaterThanOrEqual(
      1 - DESK_EMPTY_MAX,
    );
    const panels = [
      () => createElement(AppErrorPanel, { onRetry: () => {} }),
      () => createElement(NotFoundPanel),
    ];
    for (const panel of panels) {
      const html = renderToStaticMarkup(panel());
      expect(html.match(/data-family-board="stuck"/g)).toHaveLength(1);
      expect(html).toContain(
        `min-h-[${Math.round(STANDALONE_BOARD_MIN_SHARE * 100)}dvh]`,
      );
    }
  });

  it("D-1 판 꼴: 종이 테 · 판 모서리 · 테이프가 있고, fill 이면 위 띠 아래를 화면 아래 끝까지 채운다", () => {
    const html = renderToStaticMarkup(
      createElement(
        FamilyBoard,
        { kind: "stuck", fill: true, center: true },
        "안내",
      ),
    );
    expect(html).toContain("rounded-board");
    expect(html).toContain("border-(length:--paper-edge)");
    expect(html).toContain("data-tape");
    expect(html).toContain("flex-1");
    expect(html).toContain("justify-center");
  });

  it("D-1 막힘 판 · 쉬는 안내는 fill 이면 판 안 가운데를 채우고, 넘기지 않으면 지금 꼴 그대로다(회화 틀 · 결과 단추 자리)", () => {
    const blocked = (fill?: boolean) =>
      renderToStaticMarkup(
        createElement(MicBlockedPanel, {
          kind: "needsMic",
          ipadSafari: false,
          retry: { speech: undefined, onRecovered: () => {} },
          home: { href: "/" },
          ...(fill === undefined ? {} : { fill }),
        }),
      );
    expect(blocked(true)).toMatch(/data-stuck-fill=""[^>]*flex-1/);
    expect(blocked()).not.toContain("data-stuck-fill");
    const rest = (fill?: boolean) =>
      renderToStaticMarkup(
        createElement(AiRest, {
          onHome: () => {},
          ...(fill === undefined ? {} : { fill }),
        }),
      );
    expect(rest(true)).toMatch(/data-ai-rest=""[^>]*flex-1/);
    expect(rest()).not.toMatch(/data-ai-rest=""[^>]*flex-1/);
  });
});

describe("첫 실행 종이(D-14)", () => {
  it("D-14 첫 실행 종이는 내용 높이(화면을 채우지 않음)이고 '이전' · '다음' 단추 줄이 종이 안 아래에 있다", () => {
    const html = renderToStaticMarkup(
      createElement(FirstRunFlow, {
        view: {
          through: 3,
          targetMinutes: 10,
          levels: { reading: [], writing: [], speaking: [], talk: [] },
          bundles: [],
          speech: {} as never,
        },
      }),
    );
    const at = html.indexOf('data-family-board="first-run"');
    expect(at).toBeGreaterThan(-1);
    const tag = html.slice(html.lastIndexOf("<", at), html.indexOf(">", at));
    expect(tag).not.toContain("flex-1");
    const close = html.indexOf("</section>");
    expect(html.indexOf("data-first-run-nav")).toBeGreaterThan(at);
    expect(html.indexOf("data-first-run-nav")).toBeLessThan(close);
  });
});

describe("판 상자 셈(e2e 도우미 board-fill — AC-23j · D-1)", () => {
  it("AC-23j 빈 바탕 몫은 보는 창 높이에서 종이(띠 · 판)가 덮지 않은 몫이고, 겹친 · 창 밖 상자는 한 번만 · 창 안만 센다", () => {
    expect(DESK_EMPTY_MAX).toBeCloseTo(1 / 3);
    expect(deskEmptyShareOf(1000, [])).toBe(1);
    expect(deskEmptyShareOf(1000, [{ top: 0, bottom: 1000 }])).toBe(0);
    expect(
      deskEmptyShareOf(1000, [
        { top: 24, bottom: 120 },
        { top: 144, bottom: 976 },
      ]),
    ).toBeCloseTo(0.072);
    // 겹친 상자 · 창 밖으로 나간 상자
    expect(
      deskEmptyShareOf(1000, [
        { top: 100, bottom: 600 },
        { top: 500, bottom: 1400 },
        { top: -50, bottom: 50 },
      ]),
    ).toBeCloseTo(0.05);
  });
});
