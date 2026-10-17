// 세션 틀 e2e(3.3 첫 활동 · 5절 전이 · 8절, plan-p10b 파일별 값 7 · 정할 것 ㅈ · plan-p11a 값 7 · 8). 수업 목록에서 시작하는 길
// (AC-2b · 2e · 2f)은 lesson-list.spec.ts 몫이고, 여기서는 진행 세션을 DB 에 넣고 주소(/session/<id>)로 열어 끝까지 한다.
import { and, eq } from "drizzle-orm";
import { lessons } from "../../src/db/schema/content";
import { attempts, sessions } from "../../src/db/schema/learning";
import { CHILD_VIEWPORTS } from "./child-size";
import { closeE2eDb, e2eDb, insertSessions, resetHousehold } from "./db";
import { expect, test } from "./fixtures";
import { insertHousehold } from "./household";
import { photo } from "./photos";

const T = {
  next: "다음",
  home: "홈",
  preview: "오늘의 새 단어",
  right: "맞았어요!",
  tryAgain: "한 번 더 풀기",
  done: "수업을 끝냈어요!",
  nextLesson: "다음 수업",
} as const;

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

async function openReadingSession(): Promise<{
  sessionId: string;
  newWords: string[];
  /** 문항마다 정답 번호. */
  questions: number[];
}> {
  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });
  const [lesson] = await e2eDb()
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "reading"),
        eq(lessons.level, 1),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, 1),
      ),
    );
  if (!lesson) throw new Error("수업 행 없음");
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: "reading",
      level: 1,
      unit: 1,
      lessonId: lesson.id,
      kind: "regular",
      status: "in_progress",
      startedAt: new Date(),
      seedRevision: lesson.revision,
      seedCorrection: lesson.correction,
    },
  ]);
  if (!sessionId) throw new Error("세션 없음");
  const content = lesson.content as {
    content: { questions: { answerNo: number }[] };
  };
  return {
    sessionId,
    newWords: lesson.newWords,
    questions: content.content.questions.map((q) => q.answerNo),
  };
}

test("세션 틀: 첫 활동은 새 단어 미리보기이고 '다음'을 누르면 보인 단어가 시도로 저장되며 읽기 수업을 끝까지 하면 결과 화면으로 가고 세션이 끝난다", async ({
  page,
}) => {
  const { sessionId, newWords, questions } = await openReadingSession();
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "preview",
  );
  await expect(page.getByText(T.preview)).toBeVisible();
  for (const word of newWords) {
    await expect(page.getByText(word, { exact: true }).first()).toBeVisible();
  }
  await page.getByRole("button", { name: T.next }).click();
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "reading-passage",
  );
  // 첫 활동 시도(보인 단어)가 저장된다(기기 대기열 → 서버)
  await expect
    .poll(async () =>
      (
        await e2eDb()
          .select({ input: attempts.input, no: attempts.activityNo })
          .from(attempts)
          .where(eq(attempts.sessionId, sessionId))
      ).map((a) => a.no),
    )
    .toEqual([1]);
  // 다시 열면 끝 시도가 없는 가장 앞 활동부터
  await page.reload();
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "reading-passage",
  );
  // 지문 그림 줄: 그림 파일을 열었거나, 못 열면 뜻 글 상자(깨진 그림 표 없음 — 화면 검토 I-2)
  const passagePictures = page.locator("[data-passage-picture]");
  expect(await passagePictures.count()).toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll("[data-passage-picture]")].every((li) => {
          const img = li.querySelector("img");
          return img
            ? img.complete && img.naturalWidth > 0
            : li.querySelector("[data-picture-missing]") !== null;
        }),
      ),
    )
    .toBe(true);
  await photo(page, "p11-reading-level1-passage");
  await page.getByRole("button", { name: T.next }).click();
  /** 가로 화면에서 그 단추의 아래 끝이 보는 창 안인가(화면 검토 I-1). */
  const withinLandscape = async (name: string) => {
    const box = await page.getByRole("button", { name }).boundingBox();
    if (!box) throw new Error(`단추 없음: ${name}`);
    expect(box.y + box.height).toBeLessThanOrEqual(
      CHILD_VIEWPORTS.landscape.height,
    );
  };
  // 문항 1 은 가로에서 처음 틀리고 다시 맞힘, 문항 2 는 가로에서 바로 맞힘, 나머지는 세로에서 바로 맞힘
  const wrongOf = (answerNo: number) => (answerNo === 1 ? 2 : 1);
  for (const [q, answerNo] of questions.entries()) {
    await expect(page.locator("[data-activity]")).toHaveAttribute(
      "data-activity",
      "reading-question",
    );
    await expect(page.locator("[data-activity]")).toHaveAttribute(
      "data-activity-no",
      String(3 + q),
    );
    if (q === 0) await photo(page, "p11-reading-level1-question-ask");
    if (q <= 1) await page.setViewportSize(CHILD_VIEWPORTS.landscape);
    if (q === 0) {
      await page.locator(`[data-answer-choice="${wrongOf(answerNo)}"]`).click();
      await expect(
        page.getByRole("button", { name: T.tryAgain }),
      ).toBeVisible();
      await withinLandscape(T.tryAgain);
      await page.getByRole("button", { name: T.tryAgain }).click();
    }
    await page.locator(`[data-answer-choice="${answerNo}"]`).click();
    await expect(page.getByText(T.right)).toBeVisible();
    if (q <= 1) {
      await withinLandscape(T.next);
      await page.setViewportSize(CHILD_VIEWPORTS.portrait);
    }
    if (q === 1) await photo(page, "p11-reading-level1-question");
    await page.getByRole("button", { name: T.next }).click();
  }
  // 마지막 문항 뒤 결과 화면(세션 완료 · 점수 = 첫 시도 정답 수 ÷ 문항 수 — 문항 1 만 처음에 틀림)
  await expect(page).toHaveURL(new RegExp(`/result/${sessionId}$`));
  await expect(page.getByRole("heading", { name: T.done })).toBeVisible();
  await expect(page.locator("[data-result][data-hydrated]")).toHaveCount(1);
  await photo(page, "p11-reading-result-next");
  const [row] = await e2eDb()
    .select({ status: sessions.status, score: sessions.score })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  expect(row).toEqual({
    status: "completed",
    score: (questions.length - 1) / questions.length,
  });
  // 끝난 세션 주소는 결과로
  await page.goto(`/session/${sessionId}`);
  await expect(page).toHaveURL(new RegExp(`/result/${sessionId}$`));
  // '다음 수업'은 수업 목록의 '여기부터 해요'와 같은 수업을 연다
  await page.getByRole("button", { name: T.nextLesson }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/session/"));
  expect(page.url()).not.toContain(sessionId);
});

test("세션 틀: 첫 활동에서 '홈'을 누르면 세션 행이 지워지고 둘째 활동에서 누른 '홈'은 진행으로 남긴다", async ({
  page,
}) => {
  const first = await openReadingSession();
  await page.goto(`/session/${first.sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await page.getByRole("button", { name: T.home }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect
    .poll(
      async () =>
        (
          await e2eDb()
            .select()
            .from(sessions)
            .where(eq(sessions.id, first.sessionId))
        ).length,
    )
    .toBe(0);

  await resetHousehold();
  const second = await openReadingSession();
  await page.goto(`/session/${second.sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await page.getByRole("button", { name: T.next }).click();
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "reading-passage",
  );
  await page.getByRole("button", { name: T.home }).click();
  await expect(page).toHaveURL(/\/$/);
  const [row] = await e2eDb()
    .select({ status: sessions.status })
    .from(sessions)
    .where(eq(sessions.id, second.sessionId));
  expect(row?.status).toBe("in_progress");
  // 진행이 아닌 세션 주소는 그 영역 수업 목록으로
  await e2eDb()
    .update(sessions)
    .set({ status: "aborted", learningDay: "2026-10-18" })
    .where(eq(sessions.id, second.sessionId));
  await page.goto(`/session/${second.sessionId}`);
  await expect(page).toHaveURL(/\/reading\/lessons$/);
});
