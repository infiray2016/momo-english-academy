// 이어 하기 e2e(4절 '닫았다 열면 같은 자리' · AC-6a, plan-p11a 값 2 · 6 · 7). 끝 시도가 없는 가장 앞 활동에서, 같은 기기면 그 활동
// 안 입력(고른 보기 · 놓은 카드)까지 되살린다. '앱을 닫고 다시 열기'는 쪽을 닫고 같은 브라우저 문맥(같은 기기 저장소)에서 새 쪽을
// 여는 것으로 본다. b 가 쓰기 6단계 초고 글을 더한다.

import type { BrowserContext, Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { lessons } from "../../src/db/schema/content";
import { SESSION_INPUT_KEY } from "../../src/lib/session-input";
import {
  defaultSettings,
  referenceSet,
  writingLesson,
} from "../fixtures/seed/builders";
import { closeE2eDb, e2eDb, insertSessions, resetHousehold } from "./db";
import { expect, speechPage, test } from "./fixtures";
import { insertHousehold } from "./household";
import { atLevel, insertSampleLesson } from "./lessons";
import { photo } from "./photos";

const T = { next: "다음", right: "맞았어요!" } as const;

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

async function session(
  profileId: string,
  lesson: typeof lessons.$inferSelect,
  area: "reading" | "writing",
): Promise<string> {
  const [sessionId] = await insertSessions([
    {
      profileId,
      area,
      level: lesson.level,
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
  return sessionId;
}

/** 기기 저장소에 그 세션 · 활동의 활동 안 입력이 쓰였는가(쪽을 닫기 전에 기다린다). */
async function savedInput(page: Page, sessionId: string, activityNo: number) {
  await expect
    .poll(() =>
      page.evaluate(
        ({ key, id, no }) =>
          Boolean(
            (
              JSON.parse(localStorage.getItem(key) ?? "{}") as Record<
                string,
                Record<string, unknown>
              >
            )[id]?.[String(no)],
          ),
        { key: SESSION_INPUT_KEY, id: sessionId, no: activityNo },
      ),
    )
    .toBe(true);
}

/** 쪽을 닫고 같은 기기(브라우저 문맥)에서 다시 연다. */
async function reopen(
  page: Page,
  context: BrowserContext,
  sessionId: string,
): Promise<Page> {
  await page.close();
  const again = await speechPage(context, "default-ok");
  await again.goto(`/session/${sessionId}`);
  await expect(again.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  return again;
}

test("AC-6a 세션 도중 앱을 닫고 다시 열면 같은 활동 · 같은 입력에서 이어진다(읽기 셋째 문항 · 쓰기 3단계 놓은 카드)", async ({
  page,
  context,
}) => {
  // 읽기 1단계: 문항 둘을 끝내고 셋째 문항에서 처음 틀린 채로 닫는다
  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });
  const [reading] = await e2eDb()
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
  if (!reading) throw new Error("읽기 수업 없음");
  const answers = (
    reading.content as { content: { questions: { answerNo: number }[] } }
  ).content.questions.map((q) => q.answerNo);
  const readingId = await session(profileId, reading, "reading");
  await page.goto(`/session/${readingId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await page.getByRole("button", { name: T.next }).click(); // 미리보기
  await page.getByRole("button", { name: T.next }).click(); // 지문
  for (const answerNo of answers.slice(0, 2)) {
    await page.locator(`[data-answer-choice="${answerNo}"]`).click();
    await expect(page.getByText(T.right)).toBeVisible();
    await page.getByRole("button", { name: T.next }).click();
  }
  const third = page.locator("[data-activity]");
  await expect(third).toHaveAttribute("data-activity-no", "5");
  const answerNo = answers[2] ?? 1;
  const wrong = answerNo === 1 ? 2 : 1;
  await page.locator(`[data-answer-choice="${wrong}"]`).click();
  await expect(page.locator("[data-question-stage]")).toHaveAttribute(
    "data-question-stage",
    "wrong",
  );
  await savedInput(page, readingId, 5);
  let current = await reopen(page, context, readingId);
  await expect(current.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "reading-question",
  );
  await expect(current.locator("[data-activity]")).toHaveAttribute(
    "data-activity-no",
    "5",
  );
  // 같은 입력: 처음 고른 오답 · 해설 · '한 번 더 풀기' 그대로
  await expect(current.locator("[data-question-stage]")).toHaveAttribute(
    "data-question-stage",
    "wrong",
  );
  await expect(
    current.locator(`[data-answer-choice="${wrong}"]`),
  ).toHaveAttribute("data-choice-state", "picked-wrong");
  await photo(current, "p11-resume-reading");

  // 쓰기 3단계(견본 빌더 — 문장 조립): 첫 문항에 카드 둘을 놓은 채로 닫는다
  await resetHousehold();
  const sample = writingLesson(referenceSet(defaultSettings()), 3);
  if (sample.lesson.content.shape !== "items") throw new Error("견본 꼴");
  const first = sample.lesson.content.items[0];
  if (!first || !("cards" in first)) throw new Error("견본 조립 문항 없음");
  await atLevel({ area: "writing", level: 3 }, async (writingProfile) => {
    const lesson = await insertSampleLesson({ sample });
    const writingId = await session(writingProfile, lesson, "writing");
    await current.goto(`/session/${writingId}`);
    await expect(current.locator("[data-activity][data-hydrated]")).toHaveCount(
      1,
    );
    await current.getByRole("button", { name: T.next }).click(); // 미리보기
    const placed = first.cards.slice(0, 2);
    for (const card of placed)
      await current.locator(`[data-tile="${card}"]`).first().click();
    await expect(current.locator("[data-placed-tile]")).toHaveText(placed);
    await savedInput(current, writingId, 2);
    current = await reopen(current, context, writingId);
    await expect(current.locator("[data-activity]")).toHaveAttribute(
      "data-activity",
      "writing-item",
    );
    await expect(current.locator("[data-activity]")).toHaveAttribute(
      "data-activity-no",
      "2",
    );
    // 같은 입력: 놓은 카드 둘이 그 차례로, 남은 칸 수만큼 빈 칸
    await expect(current.locator("[data-placed-tile]")).toHaveText(placed);
    await expect(current.locator('[data-slot="empty"]')).toHaveCount(
      first.cards.length - placed.length,
    );
    await photo(current, "p11-resume-writing");
  });
});
