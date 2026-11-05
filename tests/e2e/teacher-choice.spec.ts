// '선생님을 골라요' · 관찰 쪽 e2e(선생님 화면 plan 차례 6 — 증명 표 AC-19b 의 화면 · 관찰 쪽 몫, 4절 '선생님을 골라요' 행 · 3.3 회화 세션
// 여는 차례 · C141 (3) 정본 밖 문구, 컨트롤러 덧 2026-10-23 '단원 바로 가기'). 회화 견본 수업을 시험이 넣고 진행 세션을 바로 연다.
// 선생님 고르기 · '시작!' 까지만 보고 회화 턴(AI)은 부르지 않는다. 아이 이름은 지어낸 값이다. 화면 검토 사진은 E2E_PHOTOS 때만.
// UI · UX plan 묶음 4-가(spec 설계 5.5 · 15절 AC-23i): 장 안 초상은 같은 초상 파일의 둥근 창 꼴(위 반원 · 방 색 바탕)이다.
// 가르치고 배우는 수업 plan 묶음 마-2(델타 spec 설계 4 [L3 · C177] · 15절 AC-3i): 세 영역 가르치는 수업(3단계 단원 1 승인 수업 — 시드 파일
// 글자 그대로)도 고른 선생님이 없으면 막힘 · 쉼 뒤, 오늘 배울 것 앞에 같은 조각이 한 번 나오고, 이미 고른 프로필은 다른 영역 수업을 처음 열어도
// 묻지 않는다. 상태: '작성됨'(정적 — 이 Mac 에서는 돌리지 않음, 11-01 뒤 CI).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import teachersFile from "../../seed/teachers.json";
import { PROBE_TEXT } from "../../src/app/dev/teacher-probe/probe-text";
import {
  LessonFileSchema,
  type LessonOf,
} from "../../src/core/seed/schema/lesson";
import { LEVEL_MAX } from "../../src/core/seed/structure";
import { lessons } from "../../src/db/schema/content";
import {
  attempts,
  profiles,
  profileTracks,
} from "../../src/db/schema/learning";
import type { LessonSample } from "../fixtures/seed/builders";
import { CHILD_VIEWPORTS } from "./child-size";
import { closeE2eDb, e2eDb, resetHousehold, withHouseholdSetting } from "./db";
import { expect, speechPage, test } from "./fixtures";
import { insertHousehold } from "./household";
import { insertSampleLesson, openLessonSession, teachSample } from "./lessons";
import { photo } from "./photos";
import {
  insertTalkLesson,
  openTalkSession,
  reachSafetyCap,
  speechRecord,
  talkHousehold,
  talkScript,
} from "./talk";

/** 화면 글(4절 · 3.3 · 정본 밖 문구 표 — 문구 표 TEACHER_TEXT 와 같은 글). */
const T = {
  title: "선생님을 골라요",
  goBefore: "선생님과 할래요",
  goMina: "미나 선생님과 할래요",
  chosen: "골랐어요",
  parents: "고른 선생님은 부모님이 바꿀 수 있어요",
  greetMina: "미나 인사 듣기",
  greetLeo: "리오 인사 듣기",
  start: "시작!",
  introMina: "미나는 앱 속 AI 선생님이에요.",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  rest: "선생님이 잠깐 쉬어요",
  home: "홈",
} as const;
const MIC_STATE_KEY = "momo.mic.v1";
const MINA = teachersFile.teachers.find((t) => t.key === "mina");
const LEO = teachersFile.teachers.find((t) => t.key === "leo");
if (!MINA || !LEO) throw new Error("명단에 미나 · 리오가 없다");

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

const choice = (page: Page) => page.locator("[data-teacher-choice]");
const card = (page: Page, key: string) =>
  page.locator(`[data-teacher-card="${key}"]`);

async function teacherKeyOf(profileId: string) {
  const [row] = await e2eDb()
    .select({ key: profiles.teacherKey })
    .from(profiles)
    .where(eq(profiles.id, profileId));
  return row?.key;
}

/** 회화 1단계 견본 수업의 진행 세션을 열고 그 쪽으로 간다. */
async function openSession(
  context: BrowserContext,
  profileId: string,
  { beforeGoto }: { beforeGoto?: (page: Page) => Promise<void> } = {},
) {
  const row = await insertTalkLesson({ level: 1 });
  const sessionId = await openTalkSession(profileId, row);
  const page = await speechPage(context, talkScript([]));
  await beforeGoto?.(page);
  await page.goto(`/session/${sessionId}`);
  return { page, sessionId };
}

test.describe("선생님을 골라요(차례 6)", () => {
  test("AC-19b 선생님을 고르지 않은 프로필이 회화 수업을 열면 '시작!' 앞에 '선생님을 골라요'가 나오고, 미나를 골라 '미나 선생님과 할래요'를 누르면 teacher_key 가 mina 이고 '미나는 앱 속 AI 선생님이에요' 안내와 '시작!'이 나오며 다시 열면 고르는 화면이 없다", async ({
    context,
  }) => {
    const profileId = await talkHousehold(1, { teacherKey: null });
    const { page } = await openSession(context, profileId);
    await expect(choice(page)).toBeVisible();
    await expect(page.locator("[data-talk-start]")).toHaveCount(0);
    await expect(
      choice(page).getByRole("heading", { name: T.title }),
    ).toBeVisible();
    await expect(page.locator("[data-teacher-card]")).toHaveCount(2);
    await expect(choice(page)).toContainText(T.parents);
    // 한 화면 '홈' 하나(위 띠)
    await expect(
      page.getByRole("button", { name: T.home, exact: true }),
    ).toHaveCount(1);
    // 고르기 전 큰 단추는 흐린 '선생님과 할래요'
    const go = page.locator("[data-teacher-go]");
    await expect(go).toHaveText(T.goBefore);
    await expect(go).toBeDisabled();
    await photo(page, "teacher-choice-empty");

    // 장 안 누름 자리(aria-pressed) — 그 아래 '인사 듣기'는 따로다
    await card(page, "mina").locator('button[aria-pressed="false"]').click();
    await expect(card(page, "mina")).toHaveAttribute("data-teacher-chosen", "");
    await expect(card(page, "mina")).toContainText(T.chosen);
    await expect(
      card(page, "mina").locator('button[aria-pressed="true"]'),
    ).toHaveCount(1);
    await expect(card(page, "leo")).not.toHaveAttribute(
      "data-teacher-chosen",
      "",
    );
    await expect(go).toHaveText(T.goMina);
    await expect(go).toBeEnabled();
    await photo(page, "teacher-choice");

    await go.click();
    await expect(page.locator("[data-talk-start]")).toBeVisible();
    await expect(choice(page)).toHaveCount(0);
    await expect(page.locator("[data-talk-intro]")).toContainText(T.introMina);
    await expect(
      page.getByRole("button", { name: T.start, exact: true }),
    ).toBeVisible();
    expect(await teacherKeyOf(profileId)).toBe("mina");
    // U5-8 아이패드 사파리(e2e 기기)는 '시작!' 아래 무음 모드 한 줄
    await expect(page.locator("[data-talk-silent-note]")).toHaveText(
      "소리가 안 나면 무음 모드를 꺼 주세요",
    );
    await photo(page, "teacher-start");

    // 다음에 열면 고르는 화면 없이 '시작!'
    await page.reload();
    await expect(page.locator("[data-talk-start]")).toBeVisible();
    await expect(choice(page)).toHaveCount(0);
  });

  test("AC-19b '선생님을 골라요'의 '인사 듣기'는 그 선생님 높이로 인사를 읽어 주고 화면 · 접근 이름에 영어 글이 없다", async ({
    context,
  }) => {
    const profileId = await talkHousehold(1, { teacherKey: null });
    const { page } = await openSession(context, profileId);
    await expect(choice(page)).toBeVisible();
    const greetMina = page.getByRole("button", { name: T.greetMina });
    await expect(greetMina).toBeEnabled();
    await greetMina.click();
    await expect
      .poll(async () => (await speechRecord(page)).spoken)
      .toContain(MINA.greetingEn);
    await page.getByRole("button", { name: T.greetLeo }).click();
    await expect
      .poll(async () => (await speechRecord(page)).spoken)
      .toContain(LEO.greetingEn);
    const record = await speechRecord(page);
    expect(record.pitches[record.spoken.indexOf(MINA.greetingEn)]).toBe(
      MINA.voice.pitch,
    );
    expect(record.pitches[record.spoken.indexOf(LEO.greetingEn)]).toBe(
      LEO.voice.pitch,
    );
    // 인사를 들어도 고른 것이 아니다
    await expect(page.locator("[data-teacher-chosen]")).toHaveCount(0);
    const text = await page.locator("main").innerText();
    for (const t of [MINA, LEO]) {
      expect(text).not.toContain(t.greetingEn);
      expect(text).not.toContain(t.nameEn);
    }
    const labels = await page
      .locator("[aria-label]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    for (const label of labels) {
      expect(label).not.toContain(MINA.greetingEn);
      expect(label).not.toContain(LEO.greetingEn);
    }
  });

  test("AC-19b 영어 이름이 Mina 인 프로필의 '선생님을 골라요'에는 리오 장만 있다", async ({
    context,
  }) => {
    const { profileId } = await insertHousehold({
      startLevels: { talk: 1 },
      englishName: "Mina",
      teacherKey: null,
    });
    const { page } = await openSession(context, profileId);
    await expect(choice(page)).toBeVisible();
    await expect(page.locator("[data-teacher-card]")).toHaveCount(1);
    await expect(card(page, "leo")).toBeVisible();
    await expect(card(page, "mina")).toHaveCount(0);
    // 장 하나는 두 칸 격자의 가운데에 두 장일 때와 같은 너비로(화면 검토 1 M-7) — 세로 · 가로 모두
    for (const way of ["portrait", "landscape"] as const) {
      await page.setViewportSize(CHILD_VIEWPORTS[way]);
      const list = await choice(page).locator("ul").boundingBox();
      const one = await card(page, "leo").boundingBox();
      expect(list && one, way).toBeTruthy();
      if (list && one) {
        expect(
          Math.abs(one.x + one.width / 2 - (list.x + list.width / 2)),
          way,
        ).toBeLessThanOrEqual(1);
        expect(one.width, way).toBeLessThan(list.width / 2);
        expect(one.width, way).toBeGreaterThan(list.width / 2 - 20);
      }
    }
  });

  test("AC-19b 가로 1180 × 820 에서 '선생님을 골라요'의 큰 단추 · 안내 줄이 보는 창 안이고 장은 누운 꼴(왼쪽 초상 · 그 아래 '인사 듣기', 오른쪽 이름)이며 '인사 듣기'를 눌러도 고른 것이 아니다", async ({
    context,
  }) => {
    const profileId = await talkHousehold(1, { teacherKey: null });
    const { page } = await openSession(context, profileId);
    await page.setViewportSize(CHILD_VIEWPORTS.landscape);
    await expect(choice(page)).toBeVisible();
    const height = CHILD_VIEWPORTS.landscape.height;
    for (const selector of ["[data-teacher-go]", "[data-teacher-choice] > p"]) {
      const box = await page.locator(selector).last().boundingBox();
      expect(box, selector).not.toBeNull();
      expect((box?.y ?? 0) + (box?.height ?? 0), selector).toBeLessThanOrEqual(
        height,
      );
    }
    for (const t of [MINA, LEO]) {
      const portrait = await card(page, t.key)
        .locator(`img[data-teacher-portrait="${t.key}"]:visible`)
        .boundingBox();
      const greet = await card(page, t.key)
        .locator("[data-teacher-greet]")
        .boundingBox();
      const name = await card(page, t.key)
        .getByText(t.nameKo, { exact: true })
        .boundingBox();
      expect(portrait && greet && name, t.key).toBeTruthy();
      if (portrait && greet && name) {
        // 초상 아래 '인사 듣기', 둘 다 이름(오른쪽 칸)보다 왼쪽
        expect(greet.y, t.key).toBeGreaterThanOrEqual(
          portrait.y + portrait.height,
        );
        expect(portrait.x + portrait.width, t.key).toBeLessThanOrEqual(name.x);
        expect(greet.x + greet.width, t.key).toBeLessThanOrEqual(name.x);
      }
    }
    // '인사 듣기'는 누름 자리와 같은 칸에 겹쳐 있어도 따로 눌린다
    await page.getByRole("button", { name: T.greetMina }).click();
    await expect(page.locator("[data-teacher-chosen]")).toHaveCount(0);
    await card(page, "mina").locator('button[aria-pressed="false"]').click();
    await expect(card(page, "mina")).toHaveAttribute("data-teacher-chosen", "");
    const go = await page.locator("[data-teacher-go]").boundingBox();
    expect((go?.y ?? 0) + (go?.height ?? 0)).toBeLessThanOrEqual(height);
  });

  test("AC-23i '선생님을 골라요' 장 안 초상은 같은 초상 파일을 둥근 창 꼴(위 반원 · 아래 작은 모서리 · 방 색 바탕)로 세로 · 가로 모두 보인다", async ({
    context,
  }) => {
    const profileId = await talkHousehold(1, { teacherKey: null });
    const { page } = await openSession(context, profileId);
    await expect(choice(page)).toBeVisible();
    for (const viewport of [
      CHILD_VIEWPORTS.portrait,
      CHILD_VIEWPORTS.landscape,
    ]) {
      await page.setViewportSize(viewport);
      for (const t of [MINA, LEO]) {
        const portrait = card(page, t.key).locator(
          `img[data-teacher-portrait="${t.key}"]:visible`,
        );
        await expect(portrait).toHaveCount(1);
        await expect(portrait).toHaveAttribute("data-portrait-shape", "window");
        await expect(portrait).toHaveAttribute("src", `/${t.portrait.path}`);
        const look = await portrait.evaluate((el) => {
          const style = getComputedStyle(el);
          return {
            width: el.getBoundingClientRect().width,
            topLeft: Number.parseFloat(style.borderTopLeftRadius),
            bottomLeft: Number.parseFloat(style.borderBottomLeftRadius),
            bg: style.backgroundColor,
          };
        });
        expect(look.topLeft, t.key).toBeCloseTo(look.width / 2, 0);
        expect(look.bottomLeft, t.key).toBeLessThan(look.topLeft);
        const [r, g, b] = [1, 3, 5].map((i) =>
          Number.parseInt(t.color.room.slice(i, i + 2), 16),
        );
        expect(look.bg, t.key).toBe(`rgb(${r}, ${g}, ${b})`);
      }
    }
    await photo(page, "teacher-choice-window");
  });

  test("AC-19b 마이크를 쓸 수 없는 기기에서는 '선생님을 골라요'보다 막힌 안내가 먼저다", async ({
    context,
  }) => {
    const profileId = await talkHousehold(1, { teacherKey: null });
    const { page } = await openSession(context, profileId, {
      beforeGoto: async (p) => {
        await p.addInitScript((key) => {
          localStorage.setItem(
            key,
            JSON.stringify({
              state: "unavailable",
              code: "not-allowed",
              at: "2026-10-17T00:00:00Z",
            }),
          );
        }, MIC_STATE_KEY);
      },
    });
    await expect(page.getByText(T.needsMic)).toBeVisible();
    await expect(choice(page)).toHaveCount(0);
    expect(await teacherKeyOf(profileId)).toBeNull();
  });

  test("AC-19b 1-가 하루 안전 상한 날에는 '선생님을 골라요'보다 '선생님이 잠깐 쉬어요'가 먼저다", async ({
    context,
  }) => {
    const profileId = await talkHousehold(1, { teacherKey: null });
    await reachSafetyCap(profileId);
    const { page } = await openSession(context, profileId);
    await expect(page.getByText(T.rest)).toBeVisible();
    await expect(choice(page)).toHaveCount(0);
  });
});

test.describe("관찰 쪽 /dev/teacher-probe(차례 6 · 컨트롤러 덧)", () => {
  async function openProbe(page: Page) {
    await page.goto("/dev/teacher-probe");
    await expect(page.getByTestId("teacher-probe")).toHaveAttribute(
      "data-ready",
      "true",
    );
  }

  test("AC-19b 관찰 쪽 '이 프로필의 선생님 지우기'를 누르면 teacher_key 가 비고 다음 회화에서 '선생님을 골라요'가 다시 나온다", async ({
    context,
    page,
  }) => {
    const profileId = await talkHousehold(1);
    await openProbe(page);
    await expect(page.getByTestId("teacher-now")).toHaveText(
      PROBE_TEXT.teacherNow("미나"),
    );
    await page.getByRole("button", { name: PROBE_TEXT.clear }).click();
    await expect(page.getByTestId("teacher-line")).toHaveText(
      PROBE_TEXT.cleared,
    );
    await expect(page.getByTestId("teacher-now")).toHaveText(
      PROBE_TEXT.teacherNow(null),
    );
    expect(await teacherKeyOf(profileId)).toBeNull();
    await photo(page, "teacher-probe");

    const { page: talk } = await openSession(context, profileId);
    await expect(choice(talk)).toBeVisible();
  });

  test("AC-19b 관찰 쪽 '단원 바로 가기'로 회화 단원 3 을 골라 '그 단원으로'를 누르면 회화 지금 단원이 1단계 단원 3 이고 홈 회화 카드가 단원 3 을 보인다", async ({
    page,
  }) => {
    const profileId = await talkHousehold(1);
    await openProbe(page);
    await page
      .getByRole("button", { name: PROBE_TEXT.unitPick("회화", 3) })
      .click();
    await page
      .getByRole("button", { name: PROBE_TEXT.jumpKeepLabel("회화") })
      .click();
    // 결과 줄의 시작 개정은 적재된 시드에 따라 달라 그 앞(영역 · 단계 · 단원 · 회차)까지만 본다
    await expect(page.getByTestId("jump-line")).toContainText(
      PROBE_TEXT.jumped("회화", {
        level: 1,
        unit: 3,
        round: 1,
        startRevision: 0,
        started: true,
      }).split(" · 시작 개정")[0] ?? "",
    );
    await expect(
      page.locator('[data-probe-track="talk"] [data-probe-now]'),
    ).toHaveText(PROBE_TEXT.trackNow(1, 3));
    const [track] = await e2eDb()
      .select({ level: profileTracks.level, unit: profileTracks.unit })
      .from(profileTracks)
      .where(
        and(
          eq(profileTracks.profileId, profileId),
          eq(profileTracks.area, "talk"),
        ),
      );
    expect(track).toEqual({ level: 1, unit: 3 });
    await page.goto("/");
    // 홈 회화 카드(카드 링크 안의 표지 — home.spec 과 같은 선택자)
    await expect(
      page
        .locator("a, button")
        .filter({ has: page.locator('[data-home-card="talk"]') }),
    ).toContainText("단원 3");
  });
});

// ── 가르치는 수업의 선생님 고르기(묶음 마-2 · AC-3i) ──

/** 말하기 3단계 단원 1 승인 수업(teachSample 과 같은 꼴 — 말하기 몫, 시드 파일 글자 그대로). */
function speakingTeachSample(): LessonSample<"speaking"> {
  const file = LessonFileSchema.parse(
    JSON.parse(
      readFileSync(
        join(
          __dirname,
          "..",
          "..",
          "seed",
          "lessons",
          "speaking",
          "3",
          "1.json",
        ),
        "utf8",
      ),
    ),
  );
  const lesson = file.lessons.find(
    (l) => l.kind === "assigned" && l.lessonNo === 1 && l.variant === 1,
  );
  if (!lesson || !("teach" in lesson) || !lesson.teach)
    throw new Error("말하기 3단계 승인 수업 없음");
  return {
    area: "speaking",
    level: file.level,
    unit: file.unit,
    lesson: lesson as LessonOf["speaking"],
  };
}

/** 세 영역을 3단계에서 시작한, 선생님을 고르지 않은 집(teacherKey 비움 — 첫 실행과 같음). */
function teachHousehold<T>(fn: (profileId: string) => Promise<T>): Promise<T> {
  return withHouseholdSetting(
    "seed.complete_through_level",
    LEVEL_MAX,
    async () => {
      const { profileId } = await insertHousehold({
        startLevels: { reading: 3, writing: 3, speaking: 3 },
      });
      return fn(profileId);
    },
  );
}

/** 그 세션의 시도 수(고르기는 활동이 아니라 시도를 남기지 않는다). */
async function attemptCountOf(sessionId: string) {
  const rows = await e2eDb()
    .select({ id: attempts.id })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  return rows.length;
}

const todayScreen = (page: Page) => page.locator('[data-teach-slot="today"]');

test.describe("가르치는 수업의 '선생님을 골라요'(묶음 마-2 · AC-3i)", () => {
  test("AC-3i 선생님을 고르지 않은 프로필이 읽기 가르치는 수업을 열면 오늘 배울 것 앞에 '선생님을 골라요'가 나오고, 미나를 고르면 teacher_key 가 mina 이고 같은 수업의 오늘 배울 것에 미나가 나오며, 쓰기 가르치는 수업을 처음 열 때는 다시 묻지 않는다", async ({
    context,
  }) => {
    await teachHousehold(async (profileId) => {
      const readingRow = await insertSampleLesson({
        sample: teachSample("reading"),
      });
      const sessionId = await openLessonSession(profileId, readingRow);
      const page = await speechPage(context, "default-ok");
      await page.goto(`/session/${sessionId}`);
      await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(
        1,
      );
      // 여는 차례: 고르기 화면(회화 조각 · 문구 그대로), 오늘 배울 것은 아직 없다
      await expect(choice(page)).toBeVisible();
      await expect(
        choice(page).getByRole("heading", { name: T.title }),
      ).toBeVisible();
      await expect(choice(page)).toContainText(T.parents);
      await expect(page.locator("[data-teacher-card]")).toHaveCount(2);
      await expect(todayScreen(page)).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: T.home, exact: true }),
      ).toHaveCount(1);
      const go = page.locator("[data-teacher-go]");
      await expect(go).toHaveText(T.goBefore);
      await expect(go).toBeDisabled();
      await photo(page, "teach-teacher-choice");

      await card(page, "mina").locator('button[aria-pressed="false"]').click();
      await expect(go).toHaveText(T.goMina);
      await go.click();

      // 고른 뒤: 같은 세션 · 같은 활동(오늘 배울 것)에 미나 초상, 고르기 화면 없음, 시도 없음
      await expect(todayScreen(page)).toBeVisible();
      await expect(choice(page)).toHaveCount(0);
      await expect(
        todayScreen(page).locator('[data-teacher-portrait="mina"]'),
      ).toBeVisible();
      await expect(page.locator("[data-activity]")).toHaveAttribute(
        "data-activity-no",
        "1",
      );
      expect(await teacherKeyOf(profileId)).toBe("mina");
      expect(await attemptCountOf(sessionId)).toBe(0);

      // 다시 열어도 묻지 않는다
      await page.reload();
      await expect(todayScreen(page)).toBeVisible();
      await expect(choice(page)).toHaveCount(0);

      // 다른 영역(쓰기) 가르치는 수업을 처음 열어도 묻지 않는다
      const writingRow = await insertSampleLesson({
        sample: teachSample("writing"),
      });
      const writingSession = await openLessonSession(profileId, writingRow);
      await page.goto(`/session/${writingSession}`);
      await expect(todayScreen(page)).toBeVisible();
      await expect(choice(page)).toHaveCount(0);
      await expect(
        todayScreen(page).locator('[data-teacher-portrait="mina"]'),
      ).toBeVisible();
    });
  });

  test("AC-3i teach 칸이 없는 수업(적재된 1단계 시드 수업)은 선생님을 고르지 않은 프로필이어도 '선생님을 골라요'가 없다(정한 것 1)", async ({
    page,
  }) => {
    const { profileId } = await insertHousehold({
      startLevels: { reading: 1 },
    });
    // 적재된 1단계 시드 수업(teach 칸 없음 — 다시 만들기 전 차례 그대로)
    const [row] = await e2eDb()
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.area, "reading"),
          eq(lessons.level, 1),
          eq(lessons.unit, 1),
          eq(lessons.kind, "assigned"),
          eq(lessons.lessonNo, 1),
          eq(lessons.topicVariant, 1),
        ),
      );
    if (!row) throw new Error("읽기 1단계 수업 없음");
    if (
      row.content &&
      typeof row.content === "object" &&
      "teach" in row.content
    )
      throw new Error("1단계 수업에 teach 칸이 있다 — 시험 전제를 다시 본다");
    const sessionId = await openLessonSession(profileId, row);
    await page.goto(`/session/${sessionId}`);
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    await expect(choice(page)).toHaveCount(0);
    await expect(page.locator("[data-teach-slot-name]")).toHaveCount(0);
    expect(await teacherKeyOf(profileId)).toBeNull();
  });

  test("AC-3i 말하기 가르치는 수업은 마이크를 쓸 수 없는 기기면 '선생님을 골라요'보다 막힌 안내가 먼저다", async ({
    context,
  }) => {
    await teachHousehold(async (profileId) => {
      const row = await insertSampleLesson({ sample: speakingTeachSample() });
      const sessionId = await openLessonSession(profileId, row);
      const page = await speechPage(context, "default-ok");
      await page.addInitScript((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            state: "unavailable",
            code: "not-allowed",
            at: "2026-10-17T00:00:00Z",
          }),
        );
      }, MIC_STATE_KEY);
      await page.goto(`/session/${sessionId}`);
      await expect(page.getByText(T.needsMic)).toBeVisible();
      await expect(choice(page)).toHaveCount(0);
      await expect(todayScreen(page)).toHaveCount(0);
      expect(await teacherKeyOf(profileId)).toBeNull();
    });
  });
});
