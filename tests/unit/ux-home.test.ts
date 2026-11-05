// UI · UX 묶음 3 — 홈 카드 넷 · 홈 위 띠 · 수업 목록 위 띠 · 영역 그림 · 홈 작은 초상(spec UI · UX 개선 [승인 UX2] · R-4 · R-6 · R-8 · R-12 ·
// R-13 · 설계 5 홈 · 수업 목록 · 설계 6 문구 표, 정본 4절 홈 · 수업 목록 행 C178 · C180, AC-2a · AC-2d · AC-23c · AC-23h).
// 화면 조각은 renderToStaticMarkup 으로 그려 글 · 표지를 본다(효과는 돌지 않음 — 마이크 판정 전 꼴).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ListBandDetail } from "@/app/(child)/[area]/lessons/lesson-board";
import {
  HOME_TEXT,
  HomeBandChips,
  HomeCards,
  homeTodayOf,
} from "@/app/(child)/home-cards";
import { AREA_ART, AreaArt } from "@/components/board/area-art";
import {
  type BandFacts,
  bandBarsOf,
  hereStartTitleOf,
  type LessonCellView,
  type ListInput,
  lessonListState,
  recentCellsOf,
  unitCellsOf,
} from "@/core/lesson-list/state";
import { AREAS, UNITS_PER_LEVEL } from "@/core/seed/structure";
import type { TeacherView } from "@/core/teacher/roster";
import type { HomeCard } from "@/server/home";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/writing", () => ({}));
vi.mock("@/server/actions/teacher", () => ({}));

const card = (over: Partial<HomeCard> = {}): HomeCard => ({
  area: "reading",
  gate: null,
  level: 3,
  unit: 2,
  thisWeek: 2,
  today: { done: false, newLessonDone: false },
  firstLesson: false,
  ...over,
});

const MINA: TeacherView = {
  key: "mina",
  nameKo: "미나",
  introKo: "",
  traitsKo: [],
  greetingEn: "",
  color: { room: "#dfeee0", accent: "#2f6f3a" },
  modelPath: "/teachers/mina.vrm",
  portraitPath: "/teachers/mina.webp",
  voice: { pitch: 1, prefer: [] },
};

/** 카드 한 장의 그림(그 카드 표지부터 다음 카드 표지 앞까지 — 감싼 포스트잇 머리는 앞에서 찾는다). */
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

const allCards = (over: Partial<Record<string, Partial<HomeCard>>> = {}) =>
  AREAS.map((area) => card({ area, ...over[area] }));

describe("홈 위 띠(R-12 · C179 (1))", () => {
  it("AC-23c 홈 위 띠: 별이 0 이면 별 칸이 없고([data-star-total] 0개) 첫 별 뒤에는 '별 n개' 칸 하나다. 연속 학습 일수 칸은 값이 1 이상일 때만 별 칸 앞에 그린다", () => {
    const none = renderToStaticMarkup(
      createElement(HomeBandChips, { starTotal: 0 }),
    );
    expect(none).not.toContain("data-star-total");
    expect(none).not.toContain("data-streak");
    expect(none).not.toMatch(/>\s*0/);
    const first = renderToStaticMarkup(
      createElement(HomeBandChips, { starTotal: 1 }),
    );
    expect(first.match(/data-star-total/g)).toHaveLength(1);
    expect(first).toContain(HOME_TEXT.stars(1));
    // 연속 학습 일수는 P12 가 값을 넣는다 — 0 · 없음이면 칸이 없고, 1 이상이면 별 칸 앞에 그린다(0-다 검토 M1)
    expect(
      renderToStaticMarkup(
        createElement(HomeBandChips, { starTotal: 1, streakDays: 0 }),
      ),
    ).not.toContain("data-streak");
    const both = renderToStaticMarkup(
      createElement(HomeBandChips, { starTotal: 4, streakDays: 3 }),
    );
    expect(both).toContain(HOME_TEXT.streak(3));
    expect(both.indexOf("data-streak")).toBeLessThan(
      both.indexOf("data-star-total"),
    );
  });
});

describe("홈 카드 넷(R-4 · R-6 · R-8 · [승인 UX2])", () => {
  it("AC-2a 카드 오늘 자리: 오늘 완료면 '오늘 다 했어요' 표지, 새 수업이 없으면 '오늘 아직이에요', 둘 다 '이번 주 n일'과 함께다. 회화는 오늘 이야기 제목이 '오늘 아직이에요' 자리다", () => {
    expect(homeTodayOf(card())).toEqual({
      kind: "progress",
      mark: "not_yet",
      story: null,
      week: 2,
    });
    expect(
      homeTodayOf(card({ today: { done: true, newLessonDone: true } })),
    ).toEqual({ kind: "progress", mark: "done", story: null, week: 2 });
    // 새 수업은 했지만 복습이 남아 꺼진 날은 표지 없이 이번 주만(4절 '오늘 완료' 행)
    expect(
      homeTodayOf(card({ today: { done: false, newLessonDone: true } })),
    ).toMatchObject({ mark: null });
    expect(
      homeTodayOf(card({ area: "talk", storyTitle: "좋아하는 음식" })),
    ).toEqual({
      kind: "progress",
      mark: null,
      story: "좋아하는 음식",
      week: 2,
    });
    expect(
      homeTodayOf(
        card({
          area: "talk",
          storyTitle: "좋아하는 음식",
          today: { done: true, newLessonDone: true },
        }),
      ),
    ).toMatchObject({ mark: "done", story: "좋아하는 음식" });
  });

  it("AC-23c 첫 사용 꼴: 끝낸 세션이 없는 영역 카드는 '첫 수업을 해 봐요' 한 줄만이고 숫자 0 · 막대 · '이번 주' · '오늘 아직이에요'가 없다. 배치 전 카드도 첫 사용이면 '이번 주'를 숨긴다", () => {
    expect(homeTodayOf(card({ firstLesson: true, thisWeek: 0 }))).toEqual({
      kind: "first",
    });
    expect(
      homeTodayOf(card({ gate: "placement", firstLesson: true, thisWeek: 0 })),
    ).toEqual({ kind: "gate", week: null });
    expect(
      homeTodayOf(card({ gate: "placement", firstLesson: false, thisWeek: 1 })),
    ).toEqual({ kind: "gate", week: 1 });
    const html = renderToStaticMarkup(
      createElement(HomeCards, {
        cards: AREAS.map((area) =>
          card({ area, firstLesson: true, thisWeek: 0, level: 1 }),
        ),
      }),
    );
    for (const area of AREAS) {
      const one = cardHtml(html, area);
      expect(one).toContain(HOME_TEXT.firstLesson);
      expect(one).not.toContain("이번 주");
      expect(one).not.toContain(HOME_TEXT.todayNotYet);
      expect(one).not.toContain("아는 단어");
      expect(one).not.toContain("data-unit-cells");
      expect(one).not.toContain("data-recent-cells");
      // 화면 글에 숫자 0 이 없다(단계 '1단계'만 숫자)
      const text = one.replace(/<[^>]+>/g, " ");
      expect(text, area).not.toMatch(/(^|\D)0(\D|$)/);
    }
  });

  it("AC-2a 카드 넷: 카드마다 영역 이름 · 영역 그림 · 단계(크게) · 오늘 · 큰 단추이고 단원 5칸 · 막대 둘 · 단원 줄은 홈에 없다", () => {
    const html = renderToStaticMarkup(
      createElement(HomeCards, {
        cards: allCards({
          reading: { today: { done: true, newLessonDone: true } },
          talk: { storyTitle: "좋아하는 음식" },
        }),
        teacher: MINA,
      }),
    );
    expect(html).not.toContain("data-unit-cells");
    expect(html).not.toContain("data-recent-cells");
    expect(html).not.toContain("아는 단어");
    expect(html).not.toContain("끝낸 대화");
    expect(html).not.toContain("단원 2");
    for (const area of AREAS) {
      const one = cardHtml(html, area);
      expect(one).toContain(`data-area-art="${area}"`);
      expect(one).toContain("3단계");
      expect(one).toContain("이번 주 2일");
    }
    expect(cardHtml(html, "reading")).toContain('data-today="done"');
    expect(cardHtml(html, "reading")).toContain(HOME_TEXT.todayDone);
    expect(cardHtml(html, "writing")).toContain(HOME_TEXT.todayNotYet);
    // 회화 카드: 작은 초상(둥근 창 꼴) · 오늘 이야기 제목 · '이야기 고르기' 자리, '오늘 아직이에요'는 없다
    const talk = cardHtml(html, "talk");
    expect(talk).toContain('data-teacher-portrait="mina"');
    expect(talk).toContain('data-portrait-shape="window"');
    expect(talk).toContain("data-story-title");
    expect(talk).toContain("좋아하는 음식");
    expect(talk).not.toContain(HOME_TEXT.todayNotYet);
    // 초상은 회화 카드에만
    expect(html.match(/data-teacher-portrait=/g)).toHaveLength(1);
  });

  it("AC-2a 회화 카드 작은 초상: 선생님을 고르기 전에는 글자 동그라미 '선'이고, 첫 사용 · 배치 전 회화 카드에도 같은 자리에 있다", () => {
    const html = renderToStaticMarkup(
      createElement(HomeCards, {
        cards: allCards({
          talk: { gate: "needs_speaking", firstLesson: true, thisWeek: 0 },
        }),
        teacher: null,
      }),
    );
    const talk = cardHtml(html, "talk");
    expect(talk).toContain('data-teacher-portrait="initial"');
    expect(talk).toContain("data-home-portrait");
    expect(talk).not.toContain("이번 주");
  });
});

describe("영역 그림(설계 5.3 · 5.6 · 위험 14)", () => {
  it("AC-23h 영역 그림 넷: 시안 ② 의 책 · 연필 · 말풍선 · 대화 선 그림이고 글자 · 날값 색이 없으며 꾸밈이라 보조 기술에서 숨는다", () => {
    expect(Object.keys(AREA_ART).sort()).toEqual([...AREAS].sort());
    for (const area of AREAS) {
      const svg = renderToStaticMarkup(createElement(AreaArt, { area }));
      expect(svg).toContain(`data-area-art="${area}"`);
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).toContain(`viewBox="${AREA_ART[area].viewBox}"`);
      expect(svg).not.toContain("<text");
      // 색은 토큰(채움 · 획 클래스)만 — 날값 색 · rgb() 가 없다
      expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(svg).not.toMatch(/rgba?\(/);
      expect(svg).toMatch(/stroke-ink/);
    }
  });
});

// ── 수업 목록 위 띠(R-13 · AC-2d) ──

const cell = (
  unit: number,
  lessonNo: number,
  title = `수업 ${lessonNo}`,
): LessonCellView => ({
  unit,
  kind: "assigned",
  lessonNo,
  lessonId: `l-${unit}-${lessonNo}`,
  variant: 1,
  title,
  newWords: [],
  unitWords: [],
  revision: 1,
  correction: 0,
});

const ROUND = new Date("2026-10-12T10:00:00+09:00");
const listInput = (over: Partial<ListInput> = {}): ListInput => ({
  area: "reading",
  level: 1,
  unit: 2,
  roundStartedAt: ROUND,
  currentPassed: false,
  unitsPassed: [1],
  lessonsByUnit: {
    1: [cell(1, 1)],
    2: [cell(2, 1), cell(2, 2, "좋아하는 음식")],
  },
  sessions: [],
  gate: { remainingLessons: 2, remainingDays: 2 },
  state: "normal",
  feedbackReady: [],
  remedialIssued: [],
  practice: [],
  reviewDue: false,
  unitsPerLevel: UNITS_PER_LEVEL,
  ...over,
});

const lessonFacts = (over: Partial<BandFacts> = {}): BandFacts => ({
  finished: true,
  passedUnits: [1],
  known: { n: 4, of: 30 },
  recent: ["pass", "miss", "empty", "empty", "empty"],
  ...over,
});

describe("수업 목록 위 띠", () => {
  it("AC-2d 단원 5칸: 지금 단원은 current, 통과한 회차가 있는 단원은 passed, 나머지는 upcoming 이다", () => {
    expect(
      unitCellsOf({
        unit: 2,
        unitsPerLevel: UNITS_PER_LEVEL,
        passedUnits: [1, 3],
      }),
    ).toEqual([
      "passed",
      "current",
      "passed",
      ...Array.from({ length: UNITS_PER_LEVEL - 3 }, () => "upcoming"),
    ]);
  });

  it("AC-2d 최근 성적 칸: 점수 없는 세션과 쓰기 둘째 세션은 빼고 최근 window 개를 오래된 것부터, 기준 이상만 pass, 남는 칸은 empty 다", () => {
    const pass = 0.8;
    const cells = recentCellsOf({
      // 최근 것부터
      sessions: [
        { score: 0.9, writingPart: null },
        { score: null, writingPart: null },
        { score: 0.5, writingPart: "rewrite" },
        { score: 0.7, writingPart: "draft" },
        { score: 0.8, writingPart: null },
      ],
      windowSize: 4,
      pass,
    });
    expect(cells).toEqual(["pass", "miss", "pass", "empty"]);
  });

  it("AC-2d 막대 둘: 읽기 · 쓰기 · 말하기는 아는 단어 · 최근 성적, 회화는 아는 단어 · 끝낸 대화 · 친한 정도이고 그 영역에 끝낸 세션이 없으면 막대를 숨긴다(R-13)", () => {
    expect(bandBarsOf("reading", lessonFacts())).toEqual({
      kind: "lesson",
      known: { n: 4, of: 30 },
      recent: ["pass", "miss", "empty", "empty", "empty"],
    });
    expect(bandBarsOf("reading", lessonFacts({ finished: false }))).toBeNull();
    expect(bandBarsOf("reading", undefined)).toBeNull();
    const talk: BandFacts = {
      finished: true,
      passedUnits: [],
      known: { n: 2, of: 30 },
      talks: { done: 1, min: 6 },
      friendship: { n: 3, max: 10, teacherName: "미나" },
    };
    expect(bandBarsOf("talk", talk)).toEqual({
      kind: "talk",
      known: { n: 2, of: 30 },
      talks: { done: 1, min: 6 },
      friendship: { n: 3, max: 10, teacherName: "미나" },
    });
    expect(bandBarsOf("talk", { ...talk, finished: false })).toBeNull();
    // 목록 상태가 같은 띠를 낸다(화면에 보인 것 = 서버가 넘긴 것)
    const view = lessonListState(listInput({ bandFacts: lessonFacts() }));
    expect(view.band).toEqual({
      level: 1,
      unit: 2,
      cells: unitCellsOf({
        unit: 2,
        unitsPerLevel: UNITS_PER_LEVEL,
        passedUnits: [1],
      }),
      bars: bandBarsOf("reading", lessonFacts()),
    });
    // 재료가 없으면(서버가 넘기지 않음) 단원 칸은 지난 통과 단원으로, 막대는 숨김
    expect(lessonListState(listInput()).band.bars).toBeNull();
  });

  it("AC-2d 위 띠 그림: 단계 · 단원 줄 · 단원 5칸 · 막대 이름(아는 단어 n/30 · 최근 성적, 회화는 끝낸 대화 · 친한 정도 n/10), 막대가 없으면 단원 칸만이다", () => {
    const view = lessonListState(listInput({ bandFacts: lessonFacts() }));
    const html = renderToStaticMarkup(
      createElement(ListBandDetail, { area: "reading", band: view.band }),
    );
    expect(html).toContain("1단계 · 단원 2");
    expect(html.match(/data-unit-cell=/g)).toHaveLength(UNITS_PER_LEVEL);
    expect(html).toContain("아는 단어 4/30");
    expect(html).toContain("최근 성적");
    expect(html.match(/data-recent-cell=/g)).toHaveLength(5);
    const hidden = renderToStaticMarkup(
      createElement(ListBandDetail, {
        area: "reading",
        band: { ...view.band, bars: null },
      }),
    );
    expect(hidden).toContain("data-unit-cells");
    expect(hidden).not.toContain("data-band-bars");
    expect(hidden).not.toContain("아는 단어");
    const talk = renderToStaticMarkup(
      createElement(ListBandDetail, {
        area: "talk",
        band: {
          level: 1,
          unit: 1,
          cells: unitCellsOf({
            unit: 1,
            unitsPerLevel: UNITS_PER_LEVEL,
            passedUnits: [],
          }),
          bars: {
            kind: "talk",
            known: { n: 2, of: 30 },
            talks: { done: 1, min: 6 },
            friendship: { n: 3, max: 10, teacherName: "미나" },
          },
        },
      }),
    );
    expect(talk).toContain("아는 단어 2/30");
    expect(talk).toContain("끝낸 대화 1/6");
    expect(talk).toContain("미나와 친한 정도 3/10");
    expect(talk).not.toContain("최근 성적");
  });
});

describe("홈 회화 카드 오늘 이야기(4절 회화 카드 행)", () => {
  it("AC-2a 오늘 이야기 제목은 수업 목록의 '여기부터 해요' 수업 제목이다(하던 수업이면 그 수업, 없으면 없음)", () => {
    const input = listInput({ area: "talk", unitsPassed: [] });
    const view = lessonListState(input);
    expect(view.hereStart).toMatchObject({ kind: "lesson" });
    expect(hereStartTitleOf(input, view)).toBe("수업 1");
    // 하던 수업이 있으면 그 수업이 '여기부터 해요'
    const going = listInput({
      area: "talk",
      unitsPassed: [],
      sessions: [
        {
          id: "s1",
          status: "in_progress",
          kind: "regular",
          ref: { unit: 2, kind: "assigned", lessonNo: 2 },
          startedAt: ROUND,
        },
      ],
    });
    expect(hereStartTitleOf(going, lessonListState(going))).toBe(
      "좋아하는 음식",
    );
    // 새 수업 후보가 없는 상태(부모 확인 대기)면 없음
    const paused = listInput({ area: "talk", state: "parent_check" });
    expect(hereStartTitleOf(paused, lessonListState(paused))).toBeNull();
  });
});
