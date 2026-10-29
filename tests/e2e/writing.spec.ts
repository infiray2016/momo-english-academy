// 쓰기 세션 e2e. 1~3(3.3 쓰기 1~3 행 · AC-4a, plan-p11a 값 11 · 13절 C73 · C77 (2) · C78): 1단계는 시험용 시드(그림 보고 고르기 ·
// 글자 베끼기 · 빈 글자 채우기), 3단계는 견본 빌더 writingLesson 3(문장 조립). 4~5(plan-p11b 값 7 · 8 · 증명 표 쓰기 4~5 · 1-가 안전
// 상한 행): 견본 writingLesson 4 와 그 5단계 복제, AI 는 playwright.config 의 가짜 Anthropic 서버(응답은 이 수업 문장으로 시험 안에서
// 만듦). 진행 세션을 주소로 열어 끝까지 한다. 정답 · 오답은 시드 문항에서 시험 안에서 세운다. 화면 검토 사진은 E2E_PHOTOS 때만.

import type { Page } from "@playwright/test";
import { and, eq, max } from "drizzle-orm";
import { THINKOUT_LAST_TURN_NOTE } from "../../src/core/ai/calls/thinkout";
import { cardTokensOf, displayCardsOf } from "../../src/core/answer/expected";
import { learningDayOf } from "../../src/core/learning-day";
import type {
  WritingContent,
  WritingItem,
} from "../../src/core/seed/schema/lesson";
import { PLACEHOLDER_NAME } from "../../src/core/seed/structure";
import { rubricScore } from "../../src/core/writing/feedback";
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
import { CHILD_VIEWPORTS, layoutBoxesOf } from "./child-size";
import { closeE2eDb, countRows, e2eDb, resetHousehold } from "./db";
import {
  FAKE_PRAISE,
  FAKE_REASON,
  FAKE_THINKOUT,
  fakeAiRequests,
  fakeAiRequestsOf,
  feedbackReply,
  pushFakeAi,
  resetFakeAi,
  ruleFor,
  thinkoutReply,
  writingCheckReply,
} from "./fake-ai";
import { expect, test } from "./fixtures";
import { householdChoices, insertHousehold } from "./household";
import {
  atLevel,
  compositionSample,
  guidedSample,
  insertReadyDraft,
  insertSampleLesson,
  levelSpecOf,
  openLessonSession,
  READY_DRAFT,
  READY_FEEDBACK,
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
  stillReading: "아직 글을 살펴보고 있어요",
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
/** 안내 줄 한 줄 높이의 위 한계(px, 시험 값 — 20px 글 · 상태 줄 최소 높이 32px 와 아이콘 28px 를 넉넉히). */
const ONE_LINE_PX = 44;

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
  /** 선생님을 고르지 않은 집(atLevel)이라 이름 자리는 '선생님'(C123 · 선생님 화면 plan 값 9). */
  rest: "선생님이 잠깐 쉬어요. 다른 공부를 해 볼까요",
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

test("1-가 안전 상한: 쓰기 5단계 수업을 고르면 '선생님이 잠깐 쉬어요. 다른 공부를 해 볼까요'(선생님을 고르기 전)와 '홈'이 보인다", async ({
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

// ── 쓰기 6~12 첫 세션(생각 꺼내기 · 초고 · 첨삭 보내기 — 차례 6) ──

const C = {
  task: "과제",
  thinkout: "생각 꺼내기",
  typeOwn: "직접 쓸래요",
  send: "보내기",
  myIdea: "내 생각",
  words: "쓸 수 있는 단어",
  starters: "이렇게 시작해 봐요",
  written: "다 썼어요",
  sent: "글을 보냈어요. 첨삭이 오면 고쳐 쓰고 별을 받아요",
  feedback: "첨삭 보기",
} as const;
const MAX_TURNS = TEST_SETTINGS["writing.thinkout_max_turns"].value;
/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND_E2E = 1000;
/** 첨삭이 오기 전 기다림 표시를 볼 만큼 늦추는 응답 시간(기술 값 — 첨삭 타임아웃보다 짧게). */
const FEEDBACK_DELAY_MS = 4000;
/** 결과 화면이 첨삭을 다시 읽어 단추를 바꾸기까지 기다리는 상한(기술 값). */
const FEEDBACK_SHOWN_MS = 20_000;
const DRAFT_TEXT =
  "I have a small dog. We go to the park. We play every day. I love it.";

test("AC-4c 쓰기 6단계 첫 세션에서 생각 꺼내기는 writing.thinkout_max_turns 턴에서 앱이 끝내고 초고를 내면 세션이 끝나며 결과 화면에 '글을 보냈어요. 첨삭이 오면 고쳐 쓰고 별을 받아요'와 기다림 표시가 보이고 첨삭이 오면 큰 버튼이 '첨삭 보기'가 된다", async ({
  page,
}) => {
  test.setTimeout(GUIDED_TEST_MS);
  const activity = page.locator("[data-activity]");
  const sample = compositionSample();
  const rubric = { task: 4, grammar: 3, vocabulary: 3 };
  await pushFakeAi([
    ruleFor("thinkout", thinkoutReply({ done: false }), MAX_TURNS - 1),
    ruleFor("thinkout", thinkoutReply({ done: true })),
    ruleFor(
      "writing_feedback",
      feedbackReply({ rubric, delayMs: FEEDBACK_DELAY_MS }),
    ),
  ]);
  await atLevel({ area: "writing", level: sample.level }, async () => {
    await insertSampleLesson({ sample });
    // 목록에서 고른다(서버가 6단계 첫 세션을 writing_part draft 로 연다)
    await page.goto("/writing/lessons");
    await expect(
      page.locator("[data-lesson-board][data-hydrated]"),
    ).toHaveCount(1);
    await page.locator('[data-lesson="assigned-1"]').click();
    await expect(page).toHaveURL(/\/session\//);
    const sessionId = new URL(page.url()).pathname.split("/").at(-1) ?? "";
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    await page.getByRole("button", { name: T.next }).click();

    // 과제(과제 · 예시)
    await expect(activity).toHaveAttribute("data-activity", "writing-task");
    await expect(page.getByText(C.task, { exact: true })).toBeVisible();
    await photo(page, "p11-writing-6-task");
    await page.getByRole("button", { name: T.next }).click();

    // 생각 꺼내기: 들어오면 첫 질문 — 보기를 누르거나 '직접 쓸래요'로 한글로 짧게
    await expect(activity).toHaveAttribute("data-activity", "thinkout");
    await expect(page.getByText(C.thinkout, { exact: true })).toBeVisible();
    for (let turn = 1; turn < MAX_TURNS; turn += 1) {
      await expect(page.locator("[data-thinkout-turn]")).toHaveAttribute(
        "data-thinkout-turn",
        String(turn),
      );
      await expect(page.getByText(FAKE_THINKOUT.question)).toBeVisible();
      await expect(page.locator("[data-thinkout-option]")).toHaveCount(
        FAKE_THINKOUT.options.length,
      );
      if (turn === 1) {
        await photo(page, "p11-writing-6-thinkout");
        await page
          .locator(`[data-thinkout-option="${FAKE_THINKOUT.options[0]}"]`)
          .click();
      } else {
        await page.getByRole("button", { name: C.typeOwn }).click();
        await page.locator("[data-thinkout-answer]").fill("공원에서 놀아요");
        await photo(page, "p11-writing-6-thinkout-typing");
        await page.getByRole("button", { name: C.send }).click();
      }
    }

    // writing.thinkout_max_turns 턴째에 앱이 끝낸다 → 초고(내 생각 · 쓸 수 있는 단어 · 시작 틀)
    await expect(activity).toHaveAttribute("data-activity", "draft");
    await expect(page.getByText(C.myIdea, { exact: true })).toBeVisible();
    await expect(page.getByText(FAKE_THINKOUT.summary)).toBeVisible();
    await expect(page.getByText(C.words, { exact: true })).toBeVisible();
    await expect(page.getByText(C.starters, { exact: true })).toBeVisible();
    const thinkouts = await fakeAiRequestsOf("thinkout");
    expect(thinkouts).toHaveLength(MAX_TURNS);
    expect(thinkouts.at(-1)?.bodyText).toContain(THINKOUT_LAST_TURN_NOTE);
    for (const r of thinkouts.slice(0, -1))
      expect(r.bodyText).not.toContain(THINKOUT_LAST_TURN_NOTE);
    // 영어 입력란(자동 수정 · 대문자 · 맞춤법 · 추천 끔)
    const draft = page.locator("[data-draft-text]");
    await expect(draft).toHaveAttribute("autocorrect", "off");
    await expect(draft).toHaveAttribute("autocapitalize", "off");
    await expect(draft).toHaveAttribute("spellcheck", "false");
    await expect(draft).toHaveAttribute("lang", "en");
    await photo(page, "p11-writing-6-draft");
    // 분량 상한만큼 써도 두 방향 모두 한 화면 안이고, 가로에서도 입력란 안에서 넘기지 않는다(화면 검토 review-p11-6-design M-2)
    const spec = (await levelSpecOf("writing", sample.level)) as {
      amount: { words?: { max: number } };
    };
    const maxWords = spec.amount.words?.max ?? 0;
    expect(maxWords).toBeGreaterThan(0);
    const chunk = "My little brother plays outside."; // 낱말 다섯 · 실제 글처럼 긴 낱말(줄이 늘어나게)
    const long = Array.from(
      { length: Math.ceil(maxWords / chunk.split(" ").length) },
      () => chunk,
    ).join(" ");
    await draft.fill(long);
    await fitsBothWays(page);
    await page.setViewportSize(CHILD_VIEWPORTS.landscape);
    await expect
      .poll(() =>
        draft.evaluate(
          (el) => (el as HTMLTextAreaElement).scrollHeight <= el.clientHeight,
        ),
      )
      .toBe(true);
    await photo(page, "p11-writing-6-draft-long", ["landscape"]);
    await page.setViewportSize(CHILD_VIEWPORTS.portrait);
    await draft.fill(DRAFT_TEXT);
    await expect(page.locator("[data-draft-count]")).toHaveAttribute(
      "data-draft-count",
      String(DRAFT_TEXT.split(/\s+/).length),
    );
    await photo(page, "p11-writing-6-draft-written");
    await page.getByRole("button", { name: C.written }).click();

    // 결과: '글을 보냈어요 …' + 기다림 표시 → 첨삭이 오면 '첨삭 보기'
    await expect(page).toHaveURL(new RegExp(`/result/${sessionId}$`));
    await expect(page.getByRole("heading", { name: C.sent })).toBeVisible();
    await expect(
      page.locator('[data-result-next="waiting"] [data-wait-hint]'),
    ).toBeVisible();
    await photo(page, "p11-writing-6-sent");
    await expect(page.getByRole("button", { name: C.feedback })).toBeVisible({
      timeout: FEEDBACK_SHOWN_MS,
    });
    await photo(page, "p11-writing-6-feedback-ready");
    expect(await fakeAiRequestsOf("writing_feedback")).toHaveLength(1);
    expect(await fakeAiRequestsOf("thinkout")).toHaveLength(MAX_TURNS);
    const [row] = await e2eDb()
      .select({
        status: sessions.status,
        writingPart: sessions.writingPart,
        score: sessions.score,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    expect(row).toEqual({
      status: "completed",
      writingPart: "draft",
      score: rubricScore(rubric),
    });
  });
});

// ── 쓰기 6~12 둘째 세션 · 되살림(차례 7) ──

const R = {
  feedback: "첨삭 보기",
  praise: "잘한 점",
  correction: "이렇게 고쳐 봐요",
  rewrite: "고쳐 쓰기",
  rewritten: "다 고쳤어요",
  model: "모범 답안",
  ownSpeak: "내 글을 소리 내어 읽어 봐요",
  skip: "건너뛰기",
  micOk: "알겠어요",
  finished: "수업을 끝냈어요!",
  home: "홈",
  newLesson: "새 수업 할래요",
} as const;

test("AC-4c 다음 쓰기 세션은 첨삭(칭찬 → 교정 하나씩) · 고쳐 쓰기 · 모범 답안 순서로 열리고 모범 답안은 고쳐 쓰기를 내기 전에는 보이지 않는다", async ({
  page,
}) => {
  test.setTimeout(GUIDED_TEST_MS);
  const activity = page.locator("[data-activity]");
  const sample = compositionSample();
  await atLevel({ area: "writing", level: sample.level }, async (profileId) => {
    const lesson = await insertSampleLesson({ sample });
    const firstId = await insertReadyDraft(profileId, lesson);
    // 목록 맨 위 '첨삭 보기'(여기부터 해요) → 그 수업의 둘째 세션
    await page.goto("/writing/lessons");
    await expect(
      page.locator("[data-lesson-board][data-hydrated]"),
    ).toHaveCount(1);
    await page.locator('[data-top-item="feedback"]').click();
    await expect(page).toHaveURL(/\/session\//);
    const sessionId = new URL(page.url()).pathname.split("/").at(-1) ?? "";
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    const model = page.getByText(READY_FEEDBACK.modelAnswer);

    // 칭찬(미리보기 없이 첫 활동)
    await expect(activity).toHaveAttribute("data-activity", "feedback-praise");
    await expect(page.getByText(R.praise, { exact: true })).toBeVisible();
    await expect(page.getByText(READY_FEEDBACK.praise)).toBeVisible();
    await expect(model).toHaveCount(0);
    await photo(page, "p11-writing-6-rewrite-praise");
    await fitsBothWays(page);
    await page.getByRole("button", { name: T.next }).click();

    // 교정 하나씩(원문 · 수정 · 이유) — 한 화면에 하나
    for (const [i, c] of READY_FEEDBACK.corrections.entries()) {
      await expect(activity).toHaveAttribute(
        "data-activity",
        "feedback-correction",
      );
      await expect(page.getByText(R.correction, { exact: true })).toBeVisible();
      await expect(page.getByText(c.corrected, { exact: true })).toBeVisible();
      await expect(page.getByText(c.reason)).toBeVisible();
      await expect(page.locator("[data-feedback-correction]")).toHaveCount(1);
      await expect(model).toHaveCount(0);
      if (i === 0) {
        await photo(page, "p11-writing-6-rewrite-correction");
        await fitsBothWays(page);
      }
      await page.getByRole("button", { name: T.next }).click();
    }

    // 고쳐 쓰기: 초고를 채운 입력란 + 교정 칩, 모범 답안은 아직 없다
    await expect(activity).toHaveAttribute("data-activity", "rewrite");
    await expect(page.getByText(R.rewrite, { exact: true })).toBeVisible();
    const box = page.locator("[data-rewrite-text]");
    await expect(box).toHaveValue(READY_DRAFT);
    await expect(page.locator("[data-rewrite-chips] li")).toHaveCount(
      READY_FEEDBACK.corrections.length,
    );
    await expect(model).toHaveCount(0);
    await photo(page, "p11-writing-6-rewrite");
    await fitsBothWays(page);
    await box.fill("I have a dog. We go to the park. I love my dog.");
    await page.getByRole("button", { name: R.rewritten }).click();

    // 고쳐 쓰기를 낸 뒤에만 모범 답안
    await expect(activity).toHaveAttribute("data-activity", "model-answer");
    await expect(page.getByText(R.model, { exact: true })).toBeVisible();
    await expect(model).toBeVisible();
    await photo(page, "p11-writing-6-model-answer");
    await fitsBothWays(page);
    await page.getByRole("button", { name: T.next }).click();

    // 내 글 소리 내어 읽기(선택) → 결과
    await expect(activity).toHaveAttribute("data-activity", "own-speak");
    if ((await page.locator("[data-mic-notice]").count()) > 0)
      await page.getByRole("button", { name: R.micOk }).click();
    await expect(page.getByText(R.ownSpeak)).toBeVisible();
    await photo(page, "p11-writing-6-own-speak");
    await page.getByRole("button", { name: R.skip }).click();
    await expect(page).toHaveURL(new RegExp(`/result/${sessionId}$`));
    await expect(page.getByRole("heading", { name: R.finished })).toBeVisible();
    const [row] = await e2eDb()
      .select({
        status: sessions.status,
        writingPart: sessions.writingPart,
        score: sessions.score,
        lessonId: sessions.lessonId,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    expect(row).toEqual({
      status: "completed",
      writingPart: "rewrite",
      score: null,
      lessonId: lesson.id,
    });
    expect(sessionId).not.toBe(firstId);
    // 둘째 세션이 끝나 목록에서 끝낸 수업(첨삭 보기 없음)
    await page.goto("/writing/lessons");
    await expect(page.locator('[data-top-item="feedback"]')).toHaveCount(0);
    await expect(
      page.locator('[data-lesson="assigned-1"] [data-done]'),
    ).toHaveCount(1);
  });
});

test("AC-2e 쓰기 6단계 초고를 쓰다 다른 수업을 고른 뒤 그 수업을 다시 열면 초고 입력란에 쓴 글이 채워져 있다", async ({
  page,
}) => {
  test.setTimeout(GUIDED_TEST_MS);
  const activity = page.locator("[data-activity]");
  const sample = compositionSample();
  const text = "I have a dog. We play in the park";
  await pushFakeAi([ruleFor("thinkout", thinkoutReply({ done: true }))]);
  await atLevel({ area: "writing", level: sample.level }, async () => {
    await insertSampleLesson({ sample, lessonNo: 1 });
    await insertSampleLesson({ sample, lessonNo: 2 });
    const board = async () => {
      await page.goto("/writing/lessons");
      await expect(
        page.locator("[data-lesson-board][data-hydrated]"),
      ).toHaveCount(1);
    };
    // 수업 1: 생각 꺼내기(첫 턴에 끝) → 초고를 쓰다가 '홈'
    await board();
    await page.locator('[data-lesson="assigned-1"]').click();
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    await page.getByRole("button", { name: T.next }).click();
    await page.getByRole("button", { name: T.next }).click();
    await expect(activity).toHaveAttribute("data-activity", "draft");
    await page.locator("[data-draft-text]").fill(text);
    await page.getByRole("button", { name: R.home }).click();
    await expect(page).toHaveURL(/\/$/);
    // 수업 2 를 고른다(하던 수업 1 은 중단)
    await board();
    await page.locator('[data-lesson="assigned-2"]').click();
    await page.getByRole("button", { name: R.newLesson }).click();
    await expect(page).toHaveURL(/\/session\//);
    // 수업 1 을 다시 연다 → 생각 꺼내기는 건너뛰고(AI 다시 안 부름) 초고 입력란에 쓴 글
    await board();
    await page.locator('[data-lesson="assigned-1"]').click();
    // 하던 수업 2 가 있어 한 번 묻는다
    await page.getByRole("button", { name: R.newLesson }).click();
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    await page.getByRole("button", { name: T.next }).click();
    await page.getByRole("button", { name: T.next }).click();
    await expect(activity).toHaveAttribute("data-activity", "draft");
    await expect(page.locator("[data-draft-text]")).toHaveValue(text);
    await expect(page.locator("[data-draft-idea]")).toBeVisible();
    expect(await fakeAiRequestsOf("thinkout")).toHaveLength(1);
    await photo(page, "p11-writing-6-restored");
  });
});

/** 기다림 표시가 첫 값 뒤 그려지기까지의 여유(타이머 · 그리기 — 기술 값). */
const WAIT_RENDER_SLACK_MS = 500;
/** 서버가 첨삭을 기다리는 동안 기다림 표시를 볼 만큼 첨삭 응답을 늦추는 시간(기술 값 — 첫 값보다 길고 첨삭 타임아웃보다 짧게). */
const SLOW_FEEDBACK_MS = 4000;
/** 실시드 단원 흉내(정규 10~15 + 보강 — 장부 56행): 목록이 세로 보는 창을 넘게 첨삭 대기 칸 뒤에 넣는 수업 수(시험 값). */
const CROWDED_LESSONS = 24;
/** 가로 한 화면에 들어야 하는 수업 카드 수 · 한 줄 장 수(plan-p10b '실시드 12~15장' · 디자인 fix 1c — 시험 값). */
const LANDSCAPE_ONE_SCREEN = 15;
const LANDSCAPE_PER_ROW = 6;

/** 첨삭 대기 칸(1번) 뒤에 수업을 여럿 넣어 목록 판이 세로 보는 창보다 길게 한다(화면 검토 review-p11-7-design M-1). */
async function crowdLessonList(
  sample: ReturnType<typeof compositionSample>,
): Promise<void> {
  for (let lessonNo = 2; lessonNo <= CROWDED_LESSONS; lessonNo += 1)
    await insertSampleLesson({ sample, lessonNo });
}

/** 목록이 보는 창보다 길다(맨 아래에 그리면 보는 창 밖이 되는 집인지 — 시험의 전제). */
async function expectPageTallerThanView(page: Page) {
  const tall = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
  expect(tall).toBe(true);
}

/** 요소가 지금 보는 창 안에 다 들어온다(세로 y + 높이 ≤ 보는 창 높이 — M-1 선 위 검증). */
async function expectInView(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  const view = page.viewportSize();
  expect(box).not.toBeNull();
  expect(view).not.toBeNull();
  if (!box || !view) return;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(view.height);
}

test("수업 목록 화면 꼴: 가로에서 수업 카드 15장은 한 줄 6장으로 판 안 한 화면에 들고 모든 카드가 같은 크기다", async ({
  page,
}) => {
  // plan-p10b '가로 실시드 12~15장이 한 화면에' · C114 · C82(디자인 fix 1c) — 쓰기 6단계 단원 1 에 수업 15장
  const sample = compositionSample();
  await atLevel({ area: "writing", level: sample.level }, async () => {
    for (let lessonNo = 1; lessonNo <= LANDSCAPE_ONE_SCREEN; lessonNo += 1)
      await insertSampleLesson({ sample, lessonNo });
    await page.setViewportSize(CHILD_VIEWPORTS.landscape);
    await page.goto("/writing/lessons");
    await expect(
      page.locator("[data-lesson-board][data-hydrated]"),
    ).toHaveCount(1);
    const cards = page
      .locator("button")
      .filter({ has: page.locator("[data-lesson]") });
    await expect(cards).toHaveCount(LANDSCAPE_ONE_SCREEN);
    const boxes = await layoutBoxesOf(cards);
    // 한 줄 6장(첫 줄 위 끝이 같은 카드 수)
    const firstTop = Math.min(...boxes.map((b) => b.top));
    expect(boxes.filter((b) => Math.abs(b.top - firstTop) <= 1)).toHaveLength(
      LANDSCAPE_PER_ROW,
    );
    // 같은 크기 · 맨 아래 카드 아래 끝이 보는 창 안
    const heights = boxes.map((b) => b.height);
    const widths = boxes.map((b) => b.width);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
    const scrollTop = await page.evaluate(() => window.scrollY);
    expect(scrollTop).toBe(0);
    expect(Math.max(...boxes.map((b) => b.bottom))).toBeLessThanOrEqual(
      CHILD_VIEWPORTS.landscape.height,
    );
    await photo(page, "lesson-list-landscape-15", ["landscape"]);
  });
});

test("쓰기 6~12: 첨삭을 기다리는 칸을 목록에서 고르면 서버가 첨삭을 기다리는 동안 ui.wait_hint_seconds 첫 값 안에 기다림 표시가 보이고 첨삭이 오면 둘째 세션이 열린다", async ({
  page,
}) => {
  // 코드 검토 review-p11-7-code I-1 (가) — 일반 수업 카드로 골라도 서버가 첨삭을 한 번 더 부르는 동안 기다림 표시
  test.setTimeout(GUIDED_TEST_MS);
  const [hintWithin] = TEST_SETTINGS["ui.wait_hint_seconds"].value as readonly [
    number,
    number,
  ];
  await pushFakeAi([
    ruleFor("writing_feedback", feedbackReply({ delayMs: SLOW_FEEDBACK_MS })),
  ]);
  const sample = compositionSample();
  await atLevel({ area: "writing", level: sample.level }, async (profileId) => {
    const lesson = await insertSampleLesson({ sample });
    await insertReadyDraft(profileId, lesson, { pending: true });
    await crowdLessonList(sample);
    await page.setViewportSize(CHILD_VIEWPORTS.portrait);
    await page.goto("/writing/lessons");
    await expect(
      page.locator("[data-lesson-board][data-hydrated]"),
    ).toHaveCount(1);
    await expectPageTallerThanView(page);
    // 첨삭 대기 칸은 맨 위 '첨삭 보기'가 없고 일반 수업 카드로 남아 있다
    await expect(page.locator('[data-top-item="feedback"]')).toHaveCount(0);
    await page.locator('[data-lesson="assigned-1"]').click();
    await expect(page.locator("[data-wait-hint]")).toBeVisible({
      timeout: hintWithin * MS_PER_SECOND_E2E + WAIT_RENDER_SLACK_MS,
    });
    // 기다림 표시는 누른 카드 바로 아래 — 목록이 길어도 보는 창 안(M-1)
    await expect(
      page.locator("[data-lesson-wait] [data-wait-hint]"),
    ).toHaveCount(1);
    await expectInView(page, "[data-wait-hint]");
    await photo(page, "p11-lesson-start-wait");
    // 첨삭이 오면 그 수업의 둘째 세션
    await expect(page).toHaveURL(/\/session\//, {
      timeout: SLOW_FEEDBACK_MS + FEEDBACK_SHOWN_MS,
    });
    await expect(page.locator("[data-activity]")).toHaveAttribute(
      "data-activity",
      "feedback-praise",
    );
    expect(await fakeAiRequestsOf("writing_feedback")).toHaveLength(1);
  });
});

test("쓰기 6~12: 다른 부름이 첨삭을 잡고 있어 아직 첨삭이 없으면 목록이 누른 카드 바로 아래에 '아직 글을 살펴보고 있어요'를 보는 창 안에 보이고 세션을 열지 않는다", async ({
  page,
}) => {
  // 화면 검토 review-p11-7-design M-1 — feedback_pending 의 안내 줄도 누른 자리 가까이
  test.setTimeout(GUIDED_TEST_MS);
  const sample = compositionSample();
  await atLevel({ area: "writing", level: sample.level }, async (profileId) => {
    const lesson = await insertSampleLesson({ sample });
    await insertReadyDraft(profileId, lesson, { pending: true, claimed: true });
    await crowdLessonList(sample);
    await page.setViewportSize(CHILD_VIEWPORTS.portrait);
    await page.goto("/writing/lessons");
    await expect(
      page.locator("[data-lesson-board][data-hydrated]"),
    ).toHaveCount(1);
    await expectPageTallerThanView(page);
    await page.locator('[data-lesson="assigned-1"]').click();
    const line = page
      .locator("[data-lesson-wait]")
      .getByText(T.stillReading, { exact: true });
    await expect(line).toBeVisible();
    await expectInView(page, "[data-lesson-wait]");
    // 안내는 한 줄 칸(격자 한 줄 전체)이라 두 방향 모두 한 줄이고 수업 카드는 모두 같은 높이(fix 8b N-1 · 전체 디자인 리뷰 M-8 · C114)
    for (const size of Object.values(CHILD_VIEWPORTS)) {
      await page.setViewportSize(size);
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
      );
      const lineBox = await line.boundingBox();
      expect(lineBox?.height ?? 0).toBeLessThanOrEqual(ONE_LINE_PX);
      // 기울기 없는 레이아웃 높이(포스트잇 기울기는 그대로 — 디자인 fix 1b)
      const heights = (
        await layoutBoxesOf(
          page.locator("button").filter({ has: page.locator("[data-lesson]") }),
        )
      ).map((b) => b.height);
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(
        1,
      );
    }
    await page.setViewportSize(CHILD_VIEWPORTS.portrait);
    await photo(page, "p11-lesson-start-still-reading");
    await expect(page).toHaveURL(/\/writing\/lessons$/);
    // 잡은 부름이 있으니 서버는 첨삭을 다시 부르지 않는다
    expect(await fakeAiRequestsOf("writing_feedback")).toHaveLength(0);
  });
});
