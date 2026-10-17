// 쓰기 1~3 세션 e2e(3.3 쓰기 1~3 행 · AC-4a, plan-p11a 값 11 · 13절 C73 · C77 (2) · C78). 1단계는 시험용 시드(그림 보고 고르기 ·
// 글자 베끼기 · 빈 글자 채우기), 3단계는 견본 빌더 writingLesson 3(문장 조립)을 넣는다. 진행 세션을 주소로 열어 끝까지 한다.
// 정답 · 오답은 시드 문항에서 시험 안에서 세운다. 화면 검토 사진은 E2E_PHOTOS 때만.

import type { Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { cardTokensOf, displayCardsOf } from "../../src/core/answer/expected";
import type { WritingItem } from "../../src/core/seed/schema/lesson";
import { lessons } from "../../src/db/schema/content";
import { sessions } from "../../src/db/schema/learning";
import { aiCalls } from "../../src/db/schema/operations";
import {
  defaultSettings,
  referenceSet,
  writingLesson,
} from "../fixtures/seed/builders";
import { CHILD_VIEWPORTS } from "./child-size";
import {
  closeE2eDb,
  countRows,
  e2eDb,
  insertSessions,
  resetHousehold,
} from "./db";
import { expect, test } from "./fixtures";
import { insertHousehold } from "./household";
import { atLevel, insertSampleLesson } from "./lessons";
import { photo } from "./photos";

const T = {
  next: "다음",
  preview: "오늘의 새 단어",
  done: "다 놓았어요",
  written: "다 썼어요",
  capital: "대문자",
  right: "맞았어요!",
  answerIs: "정답은 이거예요",
  tryAgain: "한 번 더 풀기",
  finished: "수업을 끝냈어요!",
  guide: {
    "pick-word": "그림에 맞는 단어를 골라요",
    "copy-tiles": "단어를 보고 글자를 차례대로 놓아요",
    "build-tiles": "뜻에 맞게 글자를 놓아 단어를 만들어요",
    "fill-letters": "빈칸에 들어갈 글자를 놓아요",
    dictation: "잘 듣고 단어를 써요",
    "assemble-phrase": "이 뜻이 되게 카드를 놓아요",
    "assemble-sentence": "이 뜻이 되게 카드를 놓아요",
  },
} as const;

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

/** 기기 자판을 띄우는 요소가 없다(AC-4a — 앱 안 자판 · 타일 · 카드만). */
async function noDeviceKeyboard(page: Page) {
  await expect(
    page.locator("[data-child-screen] :is(input, textarea, [contenteditable])"),
  ).toHaveCount(0);
}

async function placeTiles(page: Page, pieces: readonly string[]) {
  for (const piece of pieces)
    await page.locator(`[data-tile="${piece}"]`).first().click();
}

/** 다 놓기 전에는 '다 놓았어요'가 꺼져 있고, 마지막 조각을 놓으면 켜진다(화면 검토 review-p11-3-design I-2). */
async function placeAll(page: Page, pieces: readonly string[]) {
  const done = page.getByRole("button", { name: T.done });
  await placeTiles(page, pieces.slice(0, -1));
  await expect(done).toBeDisabled();
  await placeTiles(page, pieces.slice(-1));
  await expect(done).toBeEnabled();
}

/** 두 방향 모두 쪽이 보는 창보다 길지 않다(화면 검토 M-1). 끝나면 세로로 돌려 둔다. */
async function fitsBothWays(page: Page) {
  for (const size of Object.values(CHILD_VIEWPORTS)) {
    await page.setViewportSize(size);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeLessThanOrEqual(size.height);
  }
  await page.setViewportSize(CHILD_VIEWPORTS.portrait);
}

/** 빈 칸 너비가 모두 같다(칸 모양이 차례를 가리키지 않게 — 화면 검토 I-1). */
async function emptySlotsEven(page: Page) {
  const widths = await page
    .locator('[data-slot="empty"]')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
  expect(widths.length).toBeGreaterThan(0);
  for (const w of widths)
    expect(Math.abs(w - (widths[0] ?? 0))).toBeLessThan(0.5);
}

/** 문항을 정답으로 낸다(시드 문항에서 세운 정답). */
async function answerRight(page: Page, item: WritingItem) {
  const first = item.accepted[0] ?? "";
  switch (item.type) {
    case "pick-word":
      // 고르면 바로 채점(내기 단추 없음 — 화면 검토 M-2)
      await page.locator(`[data-answer-choice="${item.answerNo}"]`).click();
      return;
    case "copy-tiles":
    case "build-tiles":
      await placeAll(page, [...first]);
      break;
    case "fill-letters":
      await placeAll(
        page,
        [...item.pattern].flatMap((c, i) =>
          c === "_" ? [first[i] ?? ""] : [],
        ),
      );
      break;
    case "dictation":
      for (const letter of first)
        await page.locator(`[data-key="${letter.toLowerCase()}"]`).click();
      await page.getByRole("button", { name: T.written }).click();
      return;
    case "assemble-phrase":
    case "assemble-sentence": {
      // 화면 카드: 첫 낱말은 소문자 카드(대문자 단추로 바꿈), 문장 가운데 대문자 낱말은 정답 꼴 카드(displayCardsOf, C84)
      const tokens = cardTokensOf(first);
      const done = page.getByRole("button", { name: T.done });
      for (const [i, token] of tokens.entries()) {
        if (i === tokens.length - 1) await expect(done).toBeDisabled();
        await placeTiles(page, [i === 0 ? token.toLowerCase() : token]);
        // 첫 카드는 '대문자' 단추로 첫 글자를 바꾼다(C73 — 시드 카드는 소문자)
        if (i === 0 && token !== token.toLowerCase())
          await page.getByRole("button", { name: T.capital }).click();
      }
      break;
    }
  }
  await page.getByRole("button", { name: T.done }).click();
}

async function openSession(
  profileId: string,
  lesson: typeof lessons.$inferSelect,
) {
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: "writing",
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

test("AC-4a 쓰기 1 · 3단계 세션은 AI 호출 0회로 채점되고 기기 자판이 뜨지 않으며 첫 활동은 새 단어 미리보기다", async ({
  page,
}) => {
  const aiBefore = await countRows(aiCalls);
  const activity = page.locator("[data-activity]");

  /** 세션을 끝까지 한다. 첫 문항만 먼저 틀리고 다시 맞힌다. 사진 머리 이름을 받는다. */
  async function runSession(
    sessionId: string,
    items: readonly WritingItem[],
    shot: string,
  ) {
    await page.goto(`/session/${sessionId}`);
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    await expect(activity).toHaveAttribute("data-activity", "preview");
    await expect(page.getByText(T.preview)).toBeVisible();
    await noDeviceKeyboard(page);
    await page.getByRole("button", { name: T.next }).click();
    const seen = new Set<string>();
    for (const [index, item] of items.entries()) {
      await expect(activity).toHaveAttribute("data-activity", "writing-item");
      await expect(activity).toHaveAttribute(
        "data-activity-no",
        String(2 + index),
      );
      await expect(page.getByText(T.guide[item.type]).first()).toBeVisible();
      await noDeviceKeyboard(page);
      // 갈래마다 처음 나온 문항을 찍는다
      const firstOfType = !seen.has(item.type);
      seen.add(item.type);
      if (firstOfType) await photo(page, `${shot}-${item.type}`);
      if (index === 0) {
        if ("cards" in item) {
          // 놓는 칸은 카드 수만큼(목업 B_W3_Order) · 너비는 모두 같다
          await expect(page.locator('[data-slot="empty"]')).toHaveCount(
            item.cards.length,
          );
          await emptySlotsEven(page);
        }
        // 틀리면 정답(타일 · 카드 차례 그대로)과 '한 번 더 풀기'
        if (item.type === "pick-word") {
          const wrong = item.answerNo === 1 ? 2 : 1;
          await page.locator(`[data-answer-choice="${wrong}"]`).click();
        } else if ("cards" in item) {
          // 화면 카드 차례 그대로(소문자 첫 카드 — 대문자 판정에 걸림). 하나만 놓으면 '다 놓았어요'가 꺼져 있고 빈 칸 너비는 같다
          const shown = displayCardsOf(item);
          await placeTiles(page, shown.slice(0, 1));
          await expect(
            page.getByRole("button", { name: T.done }),
          ).toBeDisabled();
          await emptySlotsEven(page);
          await placeTiles(page, shown.slice(1));
          await page.getByRole("button", { name: T.done }).click();
        } else {
          throw new Error(`첫 문항 갈래를 틀리게 낼 길이 없다: ${item.type}`);
        }
        await expect(page.getByText(T.answerIs)).toBeVisible();
        await expect(
          page.getByRole("button", { name: T.tryAgain }),
        ).toBeVisible();
        if ("cards" in item) {
          await expect(page.locator("[data-reveal-tile]")).toHaveText(
            cardTokensOf(item.accepted[0] ?? ""),
          );
        }
        await photo(page, `${shot}-wrong`);
        await page.getByRole("button", { name: T.tryAgain }).click();
        await expect(page.getByText(T.answerIs)).toHaveCount(0);
      }
      await answerRight(page, item);
      await expect(page.getByText(T.right)).toBeVisible();
      // 맞으면 낱말(정답 글)이 보인다(목업 B_W1_Words '맞았어요!'와 낱말 · 뜻 두 줄)
      await expect(
        page
          .locator("[data-writing-right]")
          .getByText(item.accepted[0] ?? "", { exact: true }),
      ).toBeVisible();
      if (index === 0) {
        await photo(page, `${shot}-right`);
        await fitsBothWays(page);
      }
      await noDeviceKeyboard(page);
      await page.getByRole("button", { name: T.next }).click();
    }
    await expect(page).toHaveURL(new RegExp(`/result/${sessionId}$`));
    await expect(page.getByRole("heading", { name: T.finished })).toBeVisible();
    const [row] = await e2eDb()
      .select({ status: sessions.status, score: sessions.score })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    // 점수는 첫 시도 정답률(첫 문항만 처음에 틀림, 3.7)
    expect(row).toEqual({
      status: "completed",
      score: (items.length - 1) / items.length,
    });
  }

  // 1단계(시험용 시드)
  const { profileId } = await insertHousehold({ startLevels: { writing: 1 } });
  const [one] = await e2eDb()
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "writing"),
        eq(lessons.level, 1),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, 1),
        eq(lessons.topicVariant, 1),
      ),
    );
  if (!one) throw new Error("쓰기 1단계 수업 없음");
  const oneItems = (one.content as { content: { items: WritingItem[] } })
    .content.items;
  await runSession(
    await openSession(profileId, one),
    oneItems,
    "p11-writing-1",
  );

  // 3단계(견본 빌더 — 문장 조립)
  await resetHousehold();
  const sample = writingLesson(referenceSet(defaultSettings()), 3);
  if (sample.lesson.content.shape !== "items") throw new Error("견본 꼴");
  const threeItems = sample.lesson.content.items;
  await atLevel({ area: "writing", level: 3 }, async (threeProfile) => {
    const three = await insertSampleLesson({ sample });
    await runSession(
      await openSession(threeProfile, three),
      threeItems,
      "p11-writing-3",
    );
  });

  // AI 호출 0회(쓰기 1~3 은 앱 채점, 3.3 · 6.2)
  expect(await countRows(aiCalls)).toBe(aiBefore);
});
