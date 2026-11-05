// 화면 가족 꼴 e2e(UI · UX plan 묶음 5-가 · spec 설계 5.4 화면 가족 · 결과 판 배치 · 15절 AC-23j · AC-23e (4) 사진 · UX 검토 3판 D-1 · D-7 · D-10 ·
// D-14). 세션 · 결과 · 막힘 · 쉼 · 오류 · 없는 주소 · 첫 실행을 세로 820 · 가로 1180 두 방향에서 열고 판 상자를 잰다(board-fill):
// - 빈 바탕(종이가 덮지 않은 몫)이 화면 높이의 1/3 아래(AC-23j · D-1), 세션 · 결과 판은 판 아래 끝이 보는 창 아래 끝(ChildScreen 아래 여백만).
// - 결과 판: 별 자리가 세로는 제목 위, 가로는 오른쪽 열이고 단추 줄('다음 수업' · '홈')이 판 안에 있다(설계 5.4 · D-10).
// - 세션: 진행 표시는 활동 묶음 막대(점 아님, 지금 묶음 aria-current)이고 틀의 '다음'은 판 안 아래(D-7 · D-10).
// - 첫 실행 종이는 높이 = 내용(D-14).
// 화면 검토 사진(E2E_PHOTOS 때만)은 family-<화면>-<portrait|landscape>.png 다. 쉼은 하루 안전 상한(talk.ts reachSafetyCap), 막힘은 가짜 음성의
// not-allowed, 앱 오류는 시험 DB 설정 행 하나를 지워 만든다(plan 정한 것 6 — 앱 코드에 시험용 갈래 없음).
// 상태: '작성됨'(tsc · lint) — 이 Mac 에서는 돌릴 수 없고(내장 Postgres, plan 위험 7) 11-01 뒤 CI e2e 첫 실행에서 확인한다.
import type { Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import type {
  RecognitionRun,
  SpeechScript,
} from "../../src/core/speech/script";
import { lessons } from "../../src/db/schema/content";
import {
  BOARD_BOTTOM_GAP_MAX,
  boardFill,
  DESK_EMPTY_MAX,
  FIT_TOLERANCE_PX,
  paperOverContent,
} from "./board-fill";
import { CHILD_VIEWPORTS } from "./child-size";
import {
  closeE2eDb,
  e2eDb,
  insertSessions,
  removeHouseholdSetting,
  resetHousehold,
} from "./db";
import { expect, loadSpeechScript, speechPage, test } from "./fixtures";
import { insertHousehold } from "./household";
import {
  atLevel,
  guidedSample,
  insertSampleLesson,
  openLessonSession,
} from "./lessons";
import { photo } from "./photos";
import { failingRun, reachSafetyCap } from "./talk";

/** 아이 화면 글(정본 · spec 설계 6 문구 표 그대로). */
const T = {
  next: "다음",
  micOk: "알겠어요",
  done: "수업을 끝냈어요!",
  nextLesson: "다음 수업",
  home: "홈",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  writingRest: "선생님이 잠깐 쉬어요. 다른 공부를 해 볼까요",
  appError: "잠깐 문제가 생겼어요",
  missing: "찾는 화면이 없어요",
} as const;
/** 서버 판정 · 읽기를 기다리는 여유(시험 값). */
const WAIT_MS = 30_000;
/** 앱 오류를 일으킬 설정 키(필수 경로 나 N-15 와 같은 키 — plan 정한 것 6). */
const BREAKING_SETTING = "speech.skip_notice_seconds";
/** 없는 주소(앱이 모르는 주소). */
const MISSING_PATH = "/no-such-screen";

const DEFAULT_OK = loadSpeechScript("default-ok");
const runsScript = (runs: RecognitionRun[]): SpeechScript => ({
  name: "screen-family",
  source: "손으로 씀 — 화면 가족 꼴(시험 안에서 만듦)",
  recognitions: runs,
  ...(DEFAULT_OK.synthesis ? { synthesis: DEFAULT_OK.synthesis } : {}),
});

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

type Way = keyof typeof CHILD_VIEWPORTS;
const WAYS = Object.keys(CHILD_VIEWPORTS) as Way[];

/** 그 방향으로 돌리고 한 그림 기다린다(방향 미디어 질의가 다시 맞춰지게). */
async function turn(page: Page, way: Way) {
  await page.setViewportSize(CHILD_VIEWPORTS[way]);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
  );
}

/** 두 방향 모두 판 하나 · 빈 바탕 1/3 아래(fill 이면 판 아래 끝 = 보는 창 아래 끝). 끝나면 세로로 돌려 둔다. */
async function expectBoardFills(page: Page, { fill }: { fill: boolean }) {
  for (const way of WAYS) {
    await turn(page, way);
    const box = await boardFill(page);
    expect(box.boards, `${way} 판 수`).toBe(1);
    expect(box.emptyShare, `${way} 빈 바탕 몫`).toBeLessThan(DESK_EMPTY_MAX);
    if (fill)
      expect(box.bottomGap, `${way} 판 아래 틈`).toBeLessThanOrEqual(
        BOARD_BOTTOM_GAP_MAX,
      );
  }
  await turn(page, "portrait");
}

/** 그 영역 1단계 단원 1 의 첫 배정 수업(시험용 시드). */
async function seedLesson(area: "reading" | "speaking") {
  const [row] = await e2eDb()
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, area),
        eq(lessons.level, 1),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, 1),
        eq(lessons.topicVariant, 1),
      ),
    );
  if (!row) throw new Error(`${area} 수업 없음`);
  return row;
}

test("AC-23e (4) D-1 · D-7 · D-10 세션: 위 띠 아래 판 하나가 보는 창 아래 끝까지 차고, 진행 표시는 활동 묶음 막대이며 틀의 '다음'은 판 안 아래다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });
  const sessionId = await openLessonSession(
    profileId,
    await seedLesson("reading"),
  );
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  const board = page.locator('[data-family-board="session"]');
  await expect(board.locator("[data-activity-progress]")).toBeVisible();
  await expect(
    board.locator('[data-activity-progress] li[aria-current="step"]'),
  ).toHaveCount(1);
  await expect(page.locator("[data-activity-dots]")).toHaveCount(0);
  await expect(
    board.locator("[data-frame-next]").getByRole("button", { name: T.next }),
  ).toBeVisible();
  await expectBoardFills(page, { fill: true });
  await photo(page, "family-session");
});

test("AC-23j 결과: 판 하나에 별 · 제목 · 단추 줄이 있고 별 자리가 세로는 제목 위 · 가로는 오른쪽 열이며 빈 바탕이 화면 높이의 1/3 아래다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });
  const lesson = await seedLesson("reading");
  const at = new Date();
  const [doneId] = await insertSessions([
    {
      profileId,
      area: "reading",
      level: lesson.level,
      unit: lesson.unit ?? 1,
      lessonId: lesson.id,
      kind: "regular",
      status: "completed",
      startedAt: at,
      completedAt: at,
      learningDay: at.toISOString().slice(0, 10),
      seedRevision: lesson.revision,
      seedCorrection: lesson.correction,
      score: 1,
    },
  ]);
  if (!doneId) throw new Error("끝낸 세션 없음");
  await page.goto(`/result/${doneId}`);
  const board = page.locator('[data-family-board="result"]');
  await expect(page.locator("[data-result][data-hydrated]")).toHaveCount(1);
  const star = board.locator('[data-result-reward="star"]');
  const title = board.getByRole("heading", { name: T.done });
  const buttons = board.locator("[data-result-buttons]");
  await expect(star).toBeVisible();
  await expect(title).toBeVisible();
  await expect(
    buttons.getByRole("button", { name: T.nextLesson }),
  ).toBeVisible();
  await expect(buttons.getByRole("link", { name: T.home })).toBeVisible();
  // 위 띠에는 '홈'이 없다(단추 줄로 옮김 — 한 화면에 '홈' 하나)
  await expect(
    page.locator("[data-paper-band]").getByRole("link", { name: T.home }),
  ).toHaveCount(0);
  await expectBoardFills(page, { fill: true });
  for (const way of WAYS) {
    await turn(page, way);
    const s = await star.boundingBox();
    const t = await title.boundingBox();
    const b = await buttons.boundingBox();
    if (!s || !t || !b) throw new Error("상자 없음");
    if (way === "portrait") {
      // 세로 한 열: 별 → 제목 → … → 단추
      expect(s.y + s.height).toBeLessThanOrEqual(t.y);
    } else {
      // 가로 두 열: 왼쪽 제목 · 단추, 오른쪽 별(위쪽 — 별이 단추보다 앞)
      expect(s.x).toBeGreaterThanOrEqual(t.x + t.width);
      expect(s.y).toBeLessThan(b.y);
    }
    expect(t.y).toBeLessThan(b.y);
  }
  await turn(page, "portrait");
  await photo(page, "family-result");
});

test("AC-23e (4) D-1 막힘: 말하기 세션의 마이크 막힘 판은 세션 판 안 가운데에 안내와 단추 둘이고 빈 바탕이 화면 높이의 1/3 아래다", async ({
  context,
}) => {
  const { profileId } = await insertHousehold({
    startLevels: { speaking: 1 },
  });
  const sessionId = await openLessonSession(
    profileId,
    await seedLesson("speaking"),
  );
  const page = await speechPage(
    context,
    runsScript([failingRun("not-allowed")]),
  );
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await page.getByRole("button", { name: T.next }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
  const speak = page.locator(
    "[data-repeat-activity] [data-speak]:not([data-speak-waiting])",
  );
  await expect(speak).toBeVisible({ timeout: WAIT_MS });
  await speak.click();
  const blocked = page.locator(
    '[data-family-board="session"] [data-blocked] [data-stuck-fill]',
  );
  await expect(blocked).toContainText(T.needsMic);
  await expectBoardFills(page, { fill: true });
  await photo(page, "family-blocked");
});

test("AC-23e (4) D-1 쉼: 세션 도중 쉬는 안내는 세션 판 안 가운데에 안내와 단추 둘이고 빈 바탕이 화면 높이의 1/3 아래다", async ({
  page,
}) => {
  const sample = guidedSample(5);
  await atLevel({ area: "writing", level: sample.level }, async (profileId) => {
    const lesson = await insertSampleLesson({ sample });
    const sessionId = await openLessonSession(profileId, lesson);
    await reachSafetyCap(profileId);
    await page.goto(`/session/${sessionId}`);
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    await expect(
      page.locator('[data-family-board="session"] [data-ai-rest]'),
    ).toContainText(T.writingRest);
    await expectBoardFills(page, { fill: true });
    await photo(page, "family-rest");
  });
});

test("AC-23e (4) D-1 앱 오류 · 없는 주소: 화면 가운데 큰 판 하나에 안내와 단추이고 빈 바탕이 화면 높이의 1/3 아래다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });
  const sessionId = await openLessonSession(
    profileId,
    await seedLesson("reading"),
  );
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  const restore = await removeHouseholdSetting(BREAKING_SETTING);
  try {
    await page.reload();
    const board = page.locator('[data-app-error] [data-family-board="stuck"]');
    await expect(board.getByRole("heading", { name: T.appError })).toBeVisible({
      timeout: WAIT_MS,
    });
    await expectBoardFills(page, { fill: false });
    await photo(page, "family-error");
  } finally {
    await restore();
  }
  await page.goto(MISSING_PATH);
  const missing = page.locator('[data-not-found] [data-family-board="stuck"]');
  await expect(missing.getByRole("heading", { name: T.missing })).toBeVisible();
  await expectBoardFills(page, { fill: false });
  await photo(page, "family-missing");
});

test("AC-23e (4) D-14 첫 실행: 종이 높이는 내용에 맞고(남는 아래는 책상) '다음' 단추 줄이 종이 안 아래에 있다", async ({
  page,
}) => {
  await page.goto("/first-run");
  const paper = page.locator('[data-family-board="first-run"]');
  await expect(paper).toHaveAttribute("data-hydrated", "");
  await expect(
    paper.locator("[data-first-run-nav]").getByRole("button", { name: T.next }),
  ).toBeVisible();
  for (const way of WAYS) {
    await turn(page, way);
    expect(
      await paperOverContent(page, '[data-family-board="first-run"]'),
      way,
    ).toBeLessThanOrEqual(FIT_TOLERANCE_PX);
  }
  await turn(page, "portrait");
  await photo(page, "family-first-run");
});
