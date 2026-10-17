// 세션 틀 e2e(3.3 첫 활동 · 5절 전이 · 8절, plan-p10b 파일별 값 7 · 정할 것 ㅈ). 수업 목록에서 시작하는 길(AC-2b · 2e · 2f)은
// lesson-list.spec.ts 몫이고, 여기서는 진행 세션을 DB 에 넣고 주소(/session/<id>)로 열어 틀만 본다.
import { and, eq } from "drizzle-orm";
import { lessons } from "../../src/db/schema/content";
import { attempts, sessions } from "../../src/db/schema/learning";
import { closeE2eDb, e2eDb, insertSessions, resetHousehold } from "./db";
import { expect, test } from "./fixtures";
import { insertHousehold } from "./household";

const T = { next: "다음", home: "홈", preview: "오늘의 새 단어" } as const;

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

async function openReadingSession(): Promise<{
  sessionId: string;
  newWords: string[];
  questions: number;
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
  const content = lesson.content as { content: { questions: unknown[] } };
  return {
    sessionId,
    newWords: lesson.newWords,
    questions: content.content.questions.length,
  };
}

test("세션 틀: 첫 활동은 새 단어 미리보기이고 '다음'을 누르면 보인 단어가 시도로 저장되며 둘째 활동부터 보기만 하고 마지막 뒤 수업 목록으로 간다", async ({
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
  // 다시 열면 저장한 시도 다음 활동부터
  await page.reload();
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "reading-passage",
  );
  // 둘째 활동부터는 보기만 — 지문 다음 문항마다 '다음', 마지막 문항의 '다음'은 수업 목록으로
  for (let q = 1; q <= questions; q += 1) {
    await page.getByRole("button", { name: T.next }).click();
    await expect(page.locator("[data-activity]")).toHaveAttribute(
      "data-activity",
      "reading-question",
    );
    await expect(page.locator("[data-activity]")).toHaveAttribute(
      "data-activity-no",
      String(2 + q),
    );
  }
  await page.getByRole("button", { name: T.next }).click();
  await expect(page).toHaveURL(/\/reading\/lessons$/);
  // 세션은 진행으로 남는다(완료 · 결과는 P11 · P12)
  const [row] = await e2eDb()
    .select({ status: sessions.status })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  expect(row?.status).toBe("in_progress");
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
