// AI 기다림 · 시간 넘김 e2e(4절 첫 문단 기다림 표시 · 8절 'AI 호출 하나의 실패' · 6.1 타임아웃, plan-p11b 증명 표 AC-N6 · AC-N10 —
// AC-8d(생각 꺼내기)는 차례 6 이 더한다). 쓰기 4단계 견본(writingLesson 4)의 진행 세션을 열고 문장을 다 채워 '다 썼어요'를 누른다.
// 가짜 Anthropic 서버(playwright.config)가 응답을 늦추거나(delayMs) 끝내 주지 않는다(hang). 숫자는 시험용 설정(ui.wait_hint_seconds ·
// ai.timeout_seconds.realtime)에서 읽는다.
import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import type { WritingContent } from "../../src/core/seed/schema/lesson";
import { frameBlanks } from "../../src/core/writing/guided";
import { attempts } from "../../src/db/schema/learning";
import { TEST_SETTINGS } from "../fixtures/settings";
import { closeE2eDb, e2eDb, resetHousehold } from "./db";
import {
  FAKE_PRAISE,
  pushFakeAi,
  resetFakeAi,
  ruleFor,
  writingCheckReply,
} from "./fake-ai";
import { expect, test } from "./fixtures";
import {
  atLevel,
  compositionSample,
  guidedSample,
  insertSampleLesson,
  openLessonSession,
} from "./lessons";
import { photo } from "./photos";

const T = {
  next: "다음",
  fallback: "이번에는 바로 써 볼까요",
  written: "다 썼어요",
  checking: "확인하고 있어요",
} as const;
/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;
const [HINT_WITHIN_S, LINE_AFTER_S] = TEST_SETTINGS["ui.wait_hint_seconds"]
  .value as readonly [number, number];
const REALTIME_TIMEOUT_S = TEST_SETTINGS["ai.timeout_seconds.realtime"].value;
/** 시간 넘김을 기다리는 시험의 시간 상한(타임아웃 두 배 + 빌드된 서버 여유, 기술 값). */
const TIMEOUT_TEST_MS = 90_000;
/** 느린 응답이 '확인하고 있어요' 뒤까지 늦도록 더하는 여유(기술 값 — 타임아웃보다는 짧게). */
const SLOW_EXTRA_MS = 1500;

test.beforeEach(resetHousehold);
test.beforeEach(resetFakeAi);
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

type Guided = Extract<WritingContent, { shape: "guided" }>;

/** 쓰기 4단계 세션을 열어 문장 쓰기 화면에서 모범 낱말로 다 채운다. 세션 id 를 돌려준다. */
async function readyToSubmit(page: Page, profileId: string): Promise<string> {
  const sample = guidedSample(4);
  const content = sample.lesson.content as Guided;
  const lesson = await insertSampleLesson({ sample });
  const sessionId = await openLessonSession(profileId, lesson);
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await page.getByRole("button", { name: T.next }).click();
  await page.getByRole("button", { name: T.next }).click();
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "writing-guided",
  );
  for (const [i, s] of content.sentences.entries()) {
    const sentence = page.locator(`[data-guided-sentence="${i}"]`);
    for (const word of (s.wordBox ?? []).slice(0, frameBlanks(s.frame)))
      await sentence.locator(`[data-word-chip="${word}"]`).first().click();
  }
  await expect(page.getByRole("button", { name: T.written })).toBeEnabled();
  return sessionId;
}

test("AC-N10 응답을 늦춘 고정 표본에서 1초 안에 기다림 표시가 보이고 5초 뒤 '확인하고 있어요'가 더해진다", async ({
  page,
}) => {
  test.setTimeout(TIMEOUT_TEST_MS);
  const sentences = guidedSample(4).lesson.content as Guided;
  await pushFakeAi([
    ruleFor(
      "writing_check",
      writingCheckReply({
        correct: sentences.sentences.map(() => true),
        delayMs: LINE_AFTER_S * MS_PER_SECOND + SLOW_EXTRA_MS,
      }),
    ),
  ]);
  await atLevel({ area: "writing", level: 4 }, async (profileId) => {
    await readyToSubmit(page, profileId);
    const pressedAt = Date.now();
    await page.getByRole("button", { name: T.written }).click();
    // 첫 값 안에 기다림 표시(점 셋), 그때는 아직 한 줄이 없다
    await expect(page.locator("[data-wait-hint]")).toBeVisible({
      timeout: HINT_WITHIN_S * MS_PER_SECOND,
    });
    await expect(page.locator("[data-wait-line]")).toHaveCount(0);
    await photo(page, "p11-wait-hint");
    // 둘째 값이 지나면 '확인하고 있어요'가 더해진다(그 전에는 없다)
    await expect(page.locator("[data-wait-line]")).toHaveText(T.checking, {
      timeout: (LINE_AFTER_S + 1) * MS_PER_SECOND,
    });
    expect(Date.now() - pressedAt).toBeGreaterThanOrEqual(
      LINE_AFTER_S * MS_PER_SECOND,
    );
    await photo(page, "p11-wait-line");
    // 응답이 오면 기다림 표시가 사라지고 확인 결과가 같은 화면에
    await expect(page.getByText(FAKE_PRAISE)).toBeVisible({
      timeout: REALTIME_TIMEOUT_S * MS_PER_SECOND,
    });
    await expect(page.locator("[data-wait-hint]")).toHaveCount(0);
  });
});

test("AC-N6 쓰기 확인이 ai.timeout_seconds.realtime 을 넘으면 확인 없이 다음 활동으로 넘어간다", async ({
  page,
}) => {
  test.setTimeout(TIMEOUT_TEST_MS);
  await pushFakeAi([ruleFor("writing_check", { kind: "hang" })]);
  await atLevel({ area: "writing", level: 4 }, async (profileId) => {
    const sessionId = await readyToSubmit(page, profileId);
    const pressedAt = Date.now();
    await page.getByRole("button", { name: T.written }).click();
    await expect(page.locator("[data-wait-hint]")).toBeVisible();
    // 타임아웃 뒤 확인 없이 다음 활동(내 문장 듣고 따라 말하기)으로 — 칭찬 · 고칠 곳 없음
    await expect(page.locator("[data-activity]")).toHaveAttribute(
      "data-activity",
      "writing-own-repeat",
      { timeout: (REALTIME_TIMEOUT_S * 2 + 5) * MS_PER_SECOND },
    );
    expect(Date.now() - pressedAt).toBeGreaterThanOrEqual(
      REALTIME_TIMEOUT_S * MS_PER_SECOND,
    );
    await expect(page.locator("[data-fix-spot]")).toHaveCount(0);
    await photo(page, "p11-wait-timeout-next");
    // 확인 끝 시도는 실패(시간 넘김)로 남고 점수가 없다(점수 없는 세션 — 3.7 · 8절)
    const rows = await e2eDb()
      .select({
        input: attempts.input,
        aiFeedback: attempts.aiFeedback,
        score: attempts.score,
      })
      .from(attempts)
      .where(eq(attempts.sessionId, sessionId));
    const check = rows.find(
      (r) => (r.input as { kind?: string } | null)?.kind === "writing-guided",
    );
    expect(check).toMatchObject({
      aiFeedback: { state: "failed", reason: "timeout" },
      score: null,
    });
  });
});

test("AC-8d 응답을 늦춘 고정 표본에서 10초 타임아웃 뒤 생각 꺼내기는 '이번에는 바로 써 볼까요'와 과제 예시 · 시드 힌트가 붙은 초고 화면으로 넘어간다", async ({
  page,
}) => {
  test.setTimeout(TIMEOUT_TEST_MS);
  await pushFakeAi([ruleFor("thinkout", { kind: "hang" })]);
  const sample = compositionSample();
  const content = sample.lesson.content;
  if (content.shape !== "composition") throw new Error("견본 꼴");
  await atLevel({ area: "writing", level: sample.level }, async (profileId) => {
    const lesson = await insertSampleLesson({ sample });
    const sessionId = await openLessonSession(profileId, lesson, {
      writingPart: "draft",
    });
    await page.goto(`/session/${sessionId}`);
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    await page.getByRole("button", { name: T.next }).click(); // 미리보기
    const enteredAt = Date.now();
    await page.getByRole("button", { name: T.next }).click(); // 과제 → 생각 꺼내기(첫 질문을 부름)
    await expect(page.locator("[data-wait-hint]")).toBeVisible();
    // 타임아웃 뒤 '이번에는 바로 써 볼까요' 초고 화면(과제 예시 · 시드 힌트)
    await expect(page.locator("[data-activity]")).toHaveAttribute(
      "data-activity",
      "draft",
      { timeout: (REALTIME_TIMEOUT_S * 2 + 5) * MS_PER_SECOND },
    );
    expect(Date.now() - enteredAt).toBeGreaterThanOrEqual(
      REALTIME_TIMEOUT_S * MS_PER_SECOND,
    );
    await expect(page.getByText(T.fallback)).toBeVisible();
    await expect(
      page.locator("[data-draft-example]").getByText(content.example),
    ).toBeVisible();
    for (const hint of content.hints)
      await expect(
        page.locator("[data-draft-hints]").getByText(hint, { exact: true }),
      ).toBeVisible();
    await photo(page, "p11-writing-6-fallback");
  });
});
