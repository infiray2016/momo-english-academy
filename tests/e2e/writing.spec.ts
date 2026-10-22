// 쓰기 세션 e2e. 1~3(3.3 쓰기 1~3 행 · AC-4a, plan-p11a 값 11 · 13절 C73 · C77 (2) · C78): 1단계는 시험용 시드(그림 보고 고르기 ·
// 글자 베끼기 · 빈 글자 채우기), 3단계는 견본 빌더 writingLesson 3(문장 조립). 4~5(plan-p11b 값 7 · 8 · 증명 표 쓰기 4~5 · 1-가 안전
// 상한 행): 견본 writingLesson 4 와 그 5단계 복제, AI 는 playwright.config 의 가짜 Anthropic 서버(응답은 이 수업 문장으로 시험 안에서
// 만듦). 진행 세션을 주소로 열어 끝까지 한다. 정답 · 오답은 시드 문항에서 시험 안에서 세운다. 화면 검토 사진은 E2E_PHOTOS 때만.

import type { Page } from "@playwright/test";
import { and, eq, max } from "drizzle-orm";
import { cardTokensOf, displayCardsOf } from "../../src/core/answer/expected";
import { learningDayOf } from "../../src/core/learning-day";
import type {
  WritingContent,
  WritingItem,
} from "../../src/core/seed/schema/lesson";
import { PLACEHOLDER_NAME } from "../../src/core/seed/structure";
import { assembleSentence, frameBlanks } from "../../src/core/writing/guided";
import { lessons } from "../../src/db/schema/content";
import {
  attempts,
  profileTracks,
  sessions,
  unitProgress,
} from "../../src/db/schema/learning";
import { aiCalls, settings } from "../../src/db/schema/operations";
import {
  defaultSettings,
  referenceSet,
  writingLesson,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";
import { CHILD_VIEWPORTS } from "./child-size";
import { closeE2eDb, countRows, e2eDb, resetHousehold } from "./db";
import {
  FAKE_PRAISE,
  FAKE_REASON,
  fakeAiRequests,
  fakeAiRequestsOf,
  pushFakeAi,
  resetFakeAi,
  ruleFor,
  writingCheckReply,
} from "./fake-ai";
import { expect, test } from "./fixtures";
import { householdChoices, insertHousehold } from "./household";
import {
  atLevel,
  guidedSample,
  insertSampleLesson,
  levelSpecOf,
  openLessonSession,
} from "./lessons";
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
// 쓰기 4~5 는 가짜 AI 를 쓴다 — 시험마다 비우고 뒤 파일에 규칙이 남지 않게 끝에도 비운다(plan-p11b 값 8)
test.beforeEach(resetFakeAi);
test.afterEach(resetFakeAi);
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

const openSession = openLessonSession;

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

// ── 쓰기 4~5(AI 확인) ──

const G = {
  task: "과제",
  example: "예시",
  written: "다 썼어요",
  fixHint: "색칠한 곳을 눌러 고쳐 봐요",
  pick: "알맞은 말을 골라요",
  pickAgain: "다시 골라 볼까요",
  fixed: "잘 고쳤어요!",
  own: "내 문장을 듣고 따라 말해 봐요",
  skip: "건너뛰기",
  micOk: "알겠어요",
  rest: "토리가 잠깐 쉬어요. 다른 공부를 해 볼까요",
  home: "홈",
  back: "수업 목록",
} as const;
/** 쓰기 4~5 시험 하나의 시간 상한(두 단계를 끝까지 · 빌드된 서버, 기술 값). */
const GUIDED_TEST_MS = 120_000;

type Guided = Extract<WritingContent, { shape: "guided" }>;

/** 수업 문장마다 빈칸 낱말(견본 4단계 모범 문장 = 단어 상자 앞 낱말들). */
function rightWords(content: Guided): string[][] {
  return content.sentences.map((s) =>
    (s.wordBox ?? []).slice(0, frameBlanks(s.frame)),
  );
}

/** 문장 쓰기 화면에 낱말을 넣는다(4단계 단어 상자 칩 · 5단계 입력란). */
async function fillGuided(
  page: Page,
  input: "word-box" | "slot",
  values: readonly (readonly string[])[],
) {
  for (const [i, row] of values.entries()) {
    const sentence = page.locator(`[data-guided-sentence="${i}"]`);
    for (const [j, value] of row.entries()) {
      if (input === "word-box")
        await sentence.locator(`[data-word-chip="${value}"]`).first().click();
      else await sentence.locator("[data-blank-input]").nth(j).fill(value);
    }
  }
}

test("쓰기 4~5: 문장을 다 쓰고 내면 칭찬 한 줄과 고칠 곳 하나가 같은 화면에 보이고 고칠 곳을 누르면 보기 2~3개가 나와 골라 고친다", async ({
  page,
}) => {
  test.setTimeout(GUIDED_TEST_MS);
  const activity = page.locator("[data-activity]");
  for (const level of [4, 5] as const) {
    await resetHousehold();
    await resetFakeAi();
    const sample = guidedSample(level);
    const content = sample.lesson.content as Guided;
    const spec = (await levelSpecOf("writing", level)) as {
      amount: { input: "word-box" | "slot" };
    };
    const input = spec.amount.input;
    // 한 문장의 빈칸 하나를 단어 상자의 다른 낱말로 틀리게 쓴다(4단계 둘째 · 5단계 셋째 문장)
    const wrongAt = level === 4 ? 1 : 2;
    const right = rightWords(content);
    const box = content.sentences[wrongAt]?.wordBox ?? [];
    const correctWord = right[wrongAt]?.[0] ?? "";
    const wrongWord = box.at(-1) ?? "";
    const decoy = content.sentences[0]?.wordBox?.at(-1) ?? "";
    expect(new Set([correctWord, wrongWord, decoy]).size).toBe(3);
    const values = right.map((row, i) =>
      i === wrongAt ? [wrongWord, ...row.slice(1)] : row,
    );
    const sentences = content.sentences.map((s, i) =>
      assembleSentence(s.frame, values[i] ?? []),
    );
    await pushFakeAi([
      ruleFor(
        "writing_check",
        writingCheckReply({
          correct: sentences.map((_, i) => i !== wrongAt),
          fix: {
            sentenceIndex: wrongAt,
            original: wrongWord,
            corrected: correctWord,
            distractors: [wrongWord, decoy],
          },
        }),
      ),
    ]);
    await atLevel({ area: "writing", level }, async (profileId) => {
      const lesson = await insertSampleLesson({ sample });
      const sessionId = await openLessonSession(profileId, lesson);
      await page.goto(`/session/${sessionId}`);
      await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(
        1,
      );
      await expect(activity).toHaveAttribute("data-activity", "preview");
      await page.getByRole("button", { name: T.next }).click();

      // 과제(과제 · 예시, 4단계는 단어 상자) — 시드 힌트 · 채점표는 보이지 않는다
      await expect(activity).toHaveAttribute("data-activity", "writing-task");
      await expect(page.getByText(G.task, { exact: true })).toBeVisible();
      await expect(page.getByText(G.example, { exact: true })).toBeVisible();
      await expect(page.getByText(content.example)).toBeVisible();
      await expect(page.locator("[data-word-box]")).toHaveCount(
        input === "word-box" ? 1 : 0,
      );
      for (const hidden of [...content.hints, ...content.rubric])
        await expect(page.getByText(hidden)).toHaveCount(0);
      await photo(page, `p11-writing-${level}-task`);
      await page.getByRole("button", { name: T.next }).click();

      // 문장 쓰기(문장 전부 한 화면) — 다 채워야 '다 썼어요'
      await expect(activity).toHaveAttribute("data-activity", "writing-guided");
      await expect(page.locator("[data-guided-sentence]")).toHaveCount(
        content.sentences.length,
      );
      const written = page.getByRole("button", { name: G.written });
      await expect(written).toBeDisabled();
      // 채우기 전 빈칸(사진 — 화면 검토 '사진 없음')
      await photo(page, `p11-writing-${level}-blank`);
      // 5단계는 예시문을 보며 바꿀 칸만 쓴다(4절 쓰기 세션 행 — 화면 검토 I-1), 4단계는 단어 상자
      await expect(page.locator("[data-guided-example]")).toHaveCount(
        input === "slot" ? 1 : 0,
      );
      if (input === "slot")
        await expect(
          page.locator("[data-guided-example]").getByText(content.example),
        ).toBeVisible();
      if (input === "word-box") {
        await noDeviceKeyboard(page);
      } else {
        // 5단계: 빈칸마다 기기 자판 입력란(자동 수정 · 자동 대문자 · 맞춤법 · 추천 끔)
        const field = page.locator("[data-blank-input]").first();
        await expect(field).toHaveAttribute("autocomplete", "off");
        await expect(field).toHaveAttribute("autocorrect", "off");
        await expect(field).toHaveAttribute("autocapitalize", "off");
        await expect(field).toHaveAttribute("spellcheck", "false");
        await expect(field).toHaveAttribute("lang", "en");
      }
      await fillGuided(page, input, values);
      await expect(written).toBeEnabled();
      await photo(page, `p11-writing-${level}-write`);
      await fitsBothWays(page);
      await written.click();

      // 확인은 같은 화면에: 칭찬 한 줄 + 고칠 곳 하나 색칠
      await expect(page.getByText(FAKE_PRAISE)).toBeVisible();
      await expect(activity).toHaveAttribute("data-activity", "writing-guided");
      await expect(page.getByText(G.fixHint)).toBeVisible();
      const spot = page.locator("[data-fix-spot]");
      await expect(spot).toHaveCount(1);
      await expect(spot).toHaveText(wrongWord);
      await photo(page, `p11-writing-${level}-check`);
      // AI 는 아이가 쓴 온 문장 전부를 한 번 받았다 — 아이 영어 이름은 {NAME} 으로 가려서(6.1 이름 가림 · 6.2 쓰기 확인)
      const requests = await fakeAiRequestsOf("writing_check");
      expect(requests).toHaveLength(1);
      const sent = JSON.stringify(
        (requests[0]?.body as { messages?: unknown } | undefined)?.messages,
      );
      const { englishName } = householdChoices();
      for (const sentence of sentences)
        expect(sent).toContain(
          sentence.replaceAll(englishName, PLACEHOLDER_NAME),
        );
      expect(sent).not.toContain(englishName);

      // 고칠 곳을 누르면 보기 2~3개 → 틀리면 '다시 골라 볼까요' → 바르게 고침
      // 이유 줄은 고르기 전에는 없다(13절 C86)
      await expect(page.locator("[data-fix-reason]")).toHaveCount(0);
      await spot.click();
      await expect(page.getByText(G.pick)).toBeVisible();
      const options = page.locator("[data-fix-option]");
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(3);
      await photo(page, `p11-writing-${level}-options`);
      await page.locator(`[data-fix-option="${decoy}"]`).click();
      await expect(page.getByText(G.pickAgain)).toBeVisible();
      await expect(page.locator("[data-fix-reason]")).toHaveCount(0);
      await photo(page, `p11-writing-${level}-pick-again`);
      await expect(page.locator(`[data-fix-option="${decoy}"]`)).toBeDisabled();
      await page.locator(`[data-fix-option="${correctWord}"]`).click();
      await expect(page.getByText(G.fixed)).toBeVisible();
      // 바르게 고친 뒤 '잘 고쳤어요!' 아래 AI 의 한 문장 이유(13절 C86)
      await expect(page.locator("[data-fix-reason]")).toHaveText(FAKE_REASON);
      await expect(page.locator("[data-fix-done]")).toHaveText(correctWord);
      await photo(page, `p11-writing-${level}-fixed`);
      await fitsBothWays(page);
      await page.getByRole("button", { name: T.next }).click();

      // 내 문장 듣고 따라 말하기(선택) — 고친 문장을 하나씩, '건너뛰기'
      await expect(activity).toHaveAttribute(
        "data-activity",
        "writing-own-repeat",
      );
      if ((await page.locator("[data-mic-notice]").count()) > 0)
        await page.getByRole("button", { name: G.micOk }).click();
      await expect(page.getByText(G.own)).toBeVisible();
      const fixedSentences = sentences.map((s, i) =>
        i === wrongAt
          ? assembleSentence(content.sentences[i]?.frame ?? "", right[i] ?? [])
          : s,
      );
      await expect(
        page.getByText(fixedSentences[0] ?? "", { exact: true }),
      ).toBeVisible();
      await photo(page, `p11-writing-${level}-own`);
      await page.getByRole("button", { name: G.skip }).click();

      await expect(page).toHaveURL(new RegExp(`/result/${sessionId}$`));
      await expect(
        page.getByRole("heading", { name: T.finished }),
      ).toBeVisible();
      // 점수 = 첫 제출에서 맞다고 본 문장 수 ÷ 문장 수(고친 뒤 그대로, 3.7)
      const [row] = await e2eDb()
        .select({ status: sessions.status, score: sessions.score })
        .from(sessions)
        .where(eq(sessions.id, sessionId));
      expect(row).toEqual({
        status: "completed",
        score: (sentences.length - 1) / sentences.length,
      });
      // 고친 문장은 진행 시도로 남는다(내 문장 듣기 · 다시 열 때)
      const tries = await e2eDb()
        .select({ input: attempts.input })
        .from(attempts)
        .where(eq(attempts.sessionId, sessionId));
      expect(tries.map((t) => t.input)).toContainEqual({
        v: 1,
        kind: "writing-guided-fix",
        step: "progress",
        fixed: fixedSentences,
      });
    });
  }
});

/** 그 프로필이 오늘 학습일의 하루 안전 상한에 닿게 한다(프로필 설정 ai.safety_daily_calls 를 1 로, 오늘 호출 한 행). */
async function reachSafetyCap(profileId: string) {
  const db = e2eDb();
  const [version] = await db
    .select({ v: max(settings.version) })
    .from(settings);
  await db.insert(settings).values({
    key: "ai.safety_daily_calls",
    scope: "profile",
    profileId,
    value: 1,
    version: Number(version?.v ?? 0) + 1,
  });
  const at = new Date();
  await db.insert(aiCalls).values({
    profileId,
    sessionId: null,
    calledAt: at,
    learningDay: learningDayOf(
      at,
      TEST_SETTINGS["app.timezone"].value,
      TEST_SETTINGS["app.day_start_hour"].value,
    ),
    purpose: "writing_check",
    requestedModel: TEST_SETTINGS["ai.model.writing_check"].value,
    answeredModel: TEST_SETTINGS["ai.model.writing_check"].value,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    costUsd: "0.000000",
    priceMissing: false,
    latencyMs: null,
    status: "success",
    errorCode: null,
  });
}

test("1-가 안전 상한: 쓰기 5단계 수업을 고르면 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 '홈'이 보인다", async ({
  page,
}) => {
  const sample = guidedSample(5);
  await atLevel({ area: "writing", level: sample.level }, async (profileId) => {
    const lesson = await insertSampleLesson({ sample });
    await reachSafetyCap(profileId);
    await page.goto("/writing/lessons");
    await expect(
      page.locator("[data-lesson-board][data-hydrated]"),
    ).toHaveCount(1);
    await page.locator('[data-lesson="assigned-1"]').click();
    await expect(page.getByText(G.rest)).toBeVisible();
    // 한 화면에 안내와 '홈' 하나(종이 띠의 '홈'은 숨김)
    await expect(page.getByRole("link", { name: G.home })).toHaveCount(1);
    await expect(
      page.locator("[data-ai-rest]").getByRole("link", { name: G.home }),
    ).toBeVisible();
    await photo(page, "p11-ai-rest-list");
    // 세션을 열지 않았고 AI 를 부르지 않았다
    expect(await countRows(sessions, eq(sessions.profileId, profileId))).toBe(
      0,
    );
    expect(await fakeAiRequests()).toHaveLength(0);
    await page
      .locator("[data-ai-rest]")
      .getByRole("link", { name: G.home })
      .click();
    await expect(page).toHaveURL(/\/$/);

    // 지난 수업 쪽도 같은 꼴 — 띠의 '수업 목록' 링크를 숨겨 '홈' 하나(검토 M-2 · 화면 M-5)
    await passWritingUnitOne(profileId);
    await page.goto("/writing/lessons/past?unit=1");
    await expect(
      page.locator("[data-past-lessons][data-hydrated]"),
    ).toHaveCount(1);
    await page.locator('[data-lesson="assigned-1"]').click();
    await expect(page.getByText(G.rest)).toBeVisible();
    await expect(page.getByRole("link", { name: G.back })).toHaveCount(0);
    await expect(page.getByRole("link", { name: G.home })).toHaveCount(1);
    await photo(page, "p11-ai-rest-past");
    expect(await countRows(sessions, eq(sessions.profileId, profileId))).toBe(
      0,
    );

    // 세션 도중(하던 세션을 상한 날 다시 엶) — 안내와 '홈' 하나, 세션은 진행으로 남는다
    const sessionId = await openLessonSession(profileId, lesson);
    await page.goto(`/session/${sessionId}`);
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    await expect(page.locator("[data-ai-rest]")).toBeVisible();
    await expect(page.getByRole("button", { name: G.home })).toHaveCount(1);
    await photo(page, "p11-ai-rest-session");
    await page.getByRole("button", { name: G.home }).click();
    await expect(page).toHaveURL(/\/$/);
    const [row] = await e2eDb()
      .select({ status: sessions.status })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    expect(row?.status).toBe("in_progress");
  });
});

/** 쓰기 단원 1 을 통과한 것으로 둔다(단원 2 회차 · 트랙 단원 2 — 지난 수업 쪽이 열리게, lesson-list.spec 과 같은 꼴). */
async function passWritingUnitOne(profileId: string) {
  const db = e2eDb();
  const [round] = await db
    .select()
    .from(unitProgress)
    .where(
      and(
        eq(unitProgress.profileId, profileId),
        eq(unitProgress.area, "writing"),
      ),
    );
  if (!round) throw new Error("단원 회차 없음");
  await db
    .update(unitProgress)
    .set({ passedAt: new Date() })
    .where(eq(unitProgress.id, round.id));
  await db
    .insert(unitProgress)
    .values({ ...round, id: undefined, unit: 2, passedAt: null });
  await db
    .update(profileTracks)
    .set({ unit: 2 })
    .where(
      and(
        eq(profileTracks.profileId, profileId),
        eq(profileTracks.area, "writing"),
      ),
    );
}
