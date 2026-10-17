// 읽기 세션 e2e(3.3 읽기 · AC-3a, plan-p11a 값 9 · 10 · 13절 C77 (1) · C78). 4단계 견본 수업(견본 빌더 readingLesson 4)을 넣고
// 진행 세션을 주소로 연다. 시험 숫자(지문 낱말 수 범위 · 문항 수)는 DB 의 단계 규격에서 읽는다. 화면 검토 사진은 E2E_PHOTOS 때만.

import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { attempts, sessions } from "../../src/db/schema/learning";
import {
  defaultSettings,
  readingLesson,
  referenceSet,
} from "../fixtures/seed/builders";
import { CHILD_VIEWPORTS } from "./child-size";
import { closeE2eDb, e2eDb, insertSessions, resetHousehold } from "./db";
import { expect, test } from "./fixtures";
import { atLevel, insertSampleLesson, levelSpecOf } from "./lessons";
import { photo } from "./photos";

const T = {
  next: "다음",
  tapHint: "모르는 단어를 누르면 뜻이 보여요",
  readAloud: "읽어 주기",
  right: "맞았어요!",
  answerIs: "정답은 이거예요",
  tryAgain: "한 번 더 풀기",
  showPassage: "지문 보기",
  close: "닫기",
  done: "수업을 끝냈어요!",
} as const;

/** 두 방향 모두 쪽이 보는 창보다 길지 않다(화면 검토 review-p11-3-design M-1). 끝나면 세로로 돌려 둔다. */
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

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

test("AC-3a 읽기 4단계 세션의 지문은 55~80단어이고 문제는 4개이며 답을 고르면 바로 채점과 해설이 보인다", async ({
  page,
}) => {
  const sample = readingLesson(referenceSet(defaultSettings()), 4);
  const spec = (await levelSpecOf("reading", 4)) as {
    passage: { words: { min: number; max: number } };
    questions: { total: number };
  };
  const { questions, glossary } = sample.lesson.content;
  await atLevel({ area: "reading", level: 4 }, async (profileId) => {
    const lesson = await insertSampleLesson({ sample });
    const [sessionId] = await insertSessions([
      {
        profileId,
        area: "reading",
        level: 4,
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
    const activity = page.locator("[data-activity]");
    await page.goto(`/session/${sessionId}`);
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    await expect(activity).toHaveAttribute("data-activity", "preview");
    // 문제는 규격 수만큼(활동 점 = 미리보기 · 지문 · 문항)
    expect(questions).toHaveLength(spec.questions.total);
    await expect(page.locator("[data-activity-dots] li")).toHaveCount(
      2 + spec.questions.total,
    );
    await page.getByRole("button", { name: T.next }).click();

    // 지문: 낱말 수가 규격 범위 · '읽어 주기' · 낱말을 누르면 뜻 쪽지
    await expect(activity).toHaveAttribute("data-activity", "reading-passage");
    await expect(page.getByText(T.tapHint)).toBeVisible();
    await expect(page.getByRole("button", { name: T.readAloud })).toBeVisible();
    const text = await page
      .locator("[data-passage-activity] p[lang=en]")
      .innerText();
    const words = text.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(spec.passage.words.min);
    expect(words).toBeLessThanOrEqual(spec.passage.words.max);
    await photo(page, "p11-reading-passage");
    const entry = glossary.find((g) => !g.proper);
    if (!entry) throw new Error("글로서리 없음");
    await page.locator(`[data-word-tap="${entry.lemma}"]`).first().click();
    await expect(page.locator("[data-word-note]")).toHaveText(entry.meaningKo);
    await photo(page, "p11-reading-word-note");
    // 오른쪽 끝이 가장 큰 글로서리 낱말의 뜻 쪽지도 활동 카드 안에 든다(화면 검토 I-3). 그 낱말은 왼쪽 맞춤이었다면
    // 쪽지가 카드를 넘었을 자리여야 한다(앞 조건 — 아니면 이 견본으로는 고친 것을 증명할 수 없다, 코드 재검토 Minor)
    const rightmost = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("[data-word-tap]")];
      let best = 0;
      buttons.forEach((b, i) => {
        if (
          b.getBoundingClientRect().right >
          (buttons[best]?.getBoundingClientRect().right ?? 0)
        )
          best = i;
      });
      return best;
    });
    await page.locator("[data-word-tap]").nth(rightmost).click();
    await expect(page.locator("[data-word-note]")).toHaveCount(1);
    const wouldOverflowLeftAligned = await page.evaluate(() => {
      const button = document.querySelector(
        '[data-word-tap][aria-expanded="true"]',
      );
      const note = document.querySelector("[data-word-note]");
      const card = note?.closest("[data-activity-card]");
      if (!button || !note || !card) return false;
      return (
        button.getBoundingClientRect().left +
          note.getBoundingClientRect().width >
        card.getBoundingClientRect().right
      );
    });
    expect(wouldOverflowLeftAligned).toBe(true);
    const inside = () =>
      page.evaluate(() => {
        const note = document.querySelector("[data-word-note]");
        const card = note?.closest("[data-activity-card]");
        if (!note || !card) return false;
        const n = note.getBoundingClientRect();
        const c = card.getBoundingClientRect();
        return n.left >= c.left - 0.5 && n.right <= c.right + 0.5;
      });
    await expect.poll(inside).toBe(true);
    await photo(page, "p11-reading-word-note-right");
    await expect.poll(inside).toBe(true);
    // 쪽지 밖을 누르면 닫힌다(화면 검토 M-4)
    await page.getByText(T.tapHint).click();
    await expect(page.locator("[data-word-note]")).toHaveCount(0);
    await page.getByRole("button", { name: T.next }).click();

    // 문항 1: 처음 틀리면 해설과 '한 번 더 풀기'(정답은 아직 안 보임), 둘째도 틀리면 정답 보기와 '다음'
    for (const [index, question] of questions.entries()) {
      await expect(activity).toHaveAttribute(
        "data-activity",
        "reading-question",
      );
      await expect(activity).toHaveAttribute(
        "data-activity-no",
        String(3 + index),
      );
      const wrong = question.answerNo === 1 ? 2 : 1;
      const choice = (no: number) =>
        page.locator(`[data-answer-choice="${no}"]`);
      if (index === 0) {
        await choice(wrong).click();
        await expect(page.locator("[data-question-stage]")).toHaveAttribute(
          "data-question-stage",
          "wrong",
        );
        await expect(page.getByText(question.explanationKo)).toBeVisible();
        await expect(
          page.getByRole("button", { name: T.tryAgain }),
        ).toBeVisible();
        await expect(page.locator('[data-choice-state="answer"]')).toHaveCount(
          0,
        );
        await expect(page.getByRole("button", { name: T.next })).toHaveCount(0);
        await photo(page, "p11-reading-wrong");
        await page.getByRole("button", { name: T.tryAgain }).click();
        // 다시 고르는 동안: 처음 오답은 ✕ 로 남고(고를 수 없음) 해설도 남는다(화면 검토 M-1 · M-2)
        await expect(choice(wrong)).toHaveAttribute(
          "data-choice-state",
          "picked-wrong",
        );
        await expect(choice(wrong)).toBeDisabled();
        await expect(page.getByText(question.explanationKo)).toBeVisible();
        await photo(page, "p11-reading-retry");
        const second = [1, 2, 3, 4].find(
          (no) => no !== wrong && no !== question.answerNo,
        );
        if (second === undefined) throw new Error("보기 없음");
        await choice(second).click();
        await expect(page.getByText(T.answerIs)).toBeVisible();
        await expect(choice(question.answerNo)).toHaveAttribute(
          "data-choice-state",
          "answer",
        );
        // 정답 보기에서도 고른 오답 둘 다 ✕(화면 검토 M-1)
        for (const no of [wrong, second])
          await expect(choice(no)).toHaveAttribute(
            "data-choice-state",
            "picked-wrong",
          );
        await photo(page, "p11-reading-reveal");
        await fitsBothWays(page);
      } else {
        // 고르면 바로 채점과 해설(누름 한 번)
        await choice(question.answerNo).click();
        await expect(page.getByText(T.right)).toBeVisible();
        await expect(page.getByText(question.explanationKo)).toBeVisible();
        if (index === 1) {
          await photo(page, "p11-reading-right");
          await fitsBothWays(page);
          // 세로: 문항 위 '지문 보기' → 쪽지(글 · '읽어 주기' · '닫기')
          await page.getByRole("button", { name: T.showPassage }).click();
          const sheet = page.locator("[data-passage-sheet]");
          await expect(sheet).toBeVisible();
          await expect(
            sheet.getByRole("button", { name: T.readAloud }),
          ).toBeVisible();
          await photo(page, "p11-reading-passage-sheet", ["portrait"]);
          await sheet.getByRole("button", { name: T.close }).click();
          await expect(sheet).toHaveCount(0);
        }
      }
      await page.getByRole("button", { name: T.next }).click();
    }

    // 결과: '수업을 끝냈어요!', 세션 완료 · 점수 = 첫 시도 정답 수 ÷ 문항 수
    await expect(page).toHaveURL(new RegExp(`/result/${sessionId}$`));
    await expect(page.getByRole("heading", { name: T.done })).toBeVisible();
    await photo(page, "p11-reading-result");
    const [row] = await e2eDb()
      .select({ status: sessions.status, score: sessions.score })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    expect(row).toEqual({
      status: "completed",
      score: (questions.length - 1) / questions.length,
    });
    expect(
      await e2eDb()
        .select({ no: attempts.activityNo })
        .from(attempts)
        .where(eq(attempts.sessionId, sessionId)),
    ).toHaveLength(2 + questions.length);
  });
});
