// 가르치는 수업 읽기 · 쓰기 e2e(가르치고 배우는 수업 plan 묶음 라-2 · 델타 spec 설계 1 · 2 · 5 · 10, 정본 15절 AC-22c · AC-3d · AC-4d · AC-3k ·
// AC-N20). 3단계 단원 1 승인 수업(lessons.ts teachSample — 시드 파일 글자 그대로)을 넣고 진행 세션을 주소로 연다. 여섯 자리(오늘 배울 것 →
// 살펴보기 → 같이 해 보기 → 혼자 해 보기 → 스스로 해 보기)를 지나며, 틀린 뒤 차례('왜' · 띠 · 색 칸 · 둘째 정답)와 짝(낼 짝 · '혼자 해냈어요!' ·
// 다 맞히면 짝 없이 결과)을 본다. 선생님 줄 안내 셈은 시작 알림을 내지 않는 가짜 음성(utterances neverStart)으로 두 번 내어 무음 모드 줄
// (e2e 기기는 아이패드 사파리)을 본다 — 조각의 onLineEnd({ notice })가 실제로 불리는지(라-1 fix 1 우려). 시험 숫자(칭찬 표지 · 감시 상한 ·
// 짝 상한)는 시험용 설정에서 읽는다. 상태: '작성됨'(정적 — 이 Mac 에서는 돌리지 않음, 11-01 뒤 CI).
// 집은 선생님(미나)을 이미 고른 채로 둔다(atTeachLevel) — 여는 차례의 '선생님을 골라요'(묶음 마-2 · AC-3i)는 teacher-choice.spec 이 본다.
// 말하기(묶음 라-3): 3단계 단원 1 승인 말하기 수업으로 같이 해 보기(누가 자리 고르기 · 같이 말하기 · 틀만 보고 말하기) · 따라 말하기 끊어 들려주기 ·
// 듣기 이해 다시(답 덩어리를 천천히) · 이야기 → 질문(가짜 AI 말하기 평가 — 정한 것 6) · 짝(질문 → 듣기 → 문장)을 지나고, 이야기가 소리 없이
// 넘어가는 갈래(AC-N20)와 'AI 쉬는 중'에 혼자 질문을 건너뛰는 갈래(AC-N19)를 본다. 인식 글은 가짜 Web Speech 대본(start() 마다 하나)이다.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { and, eq, max } from "drizzle-orm";
import { learningDayOf } from "../../src/core/learning-day";
import type { LessonOf } from "../../src/core/seed/schema/lesson";
import { type Activity, activitiesOf } from "../../src/core/session/preview";
import type {
  RecognitionRun,
  SpeechScript,
} from "../../src/core/speech/script";
import { attempts, profiles } from "../../src/db/schema/learning";
import {
  aiCalls,
  settings as settingRows,
} from "../../src/db/schema/operations";
import { type FakeReply, messageBody } from "../fixtures/ai/fake-anthropic";
import { TEST_SETTINGS } from "../fixtures/settings";
import { closeE2eDb, e2eDb, resetHousehold } from "./db";
import { fakeAiRequestsOf, pushFakeAi, resetFakeAi, ruleFor } from "./fake-ai";
import { expect, loadSpeechScript, speechPage, test } from "./fixtures";
import {
  atLevel,
  E2E_LESSON_NO,
  insertSampleLesson,
  openLessonSession,
  teachSample,
} from "./lessons";
import { speechRecord } from "./talk";

/** 아이 화면 글(델타 spec 설계 5 '정본 밖 문구' 표 · 정본 C78 그대로). */
const T = {
  start: "시작",
  next: "다음",
  slot: {
    today: "오늘 배울 것",
    show: "살펴보기",
    together: "같이 해 보기",
    solo: "혼자 해 보기",
    spare: "스스로 해 보기",
  },
  soloFirst: "이제 혼자 해 봐요.",
  spareFirst: {
    reading: "다른 글에서 혼자 해 봐요.",
    writing: "다른 문장도 혼자 놓아 봐요.",
  },
  spareRight: "혼자 해냈어요!",
  retrySolve: "한 번 더 풀기",
  retryDo: "한 번 더 하기",
  right: "맞았어요!",
  answerIs: "정답은 이거예요",
  whyCapital: "첫 글자를 대문자 단추로 바꿔요.",
  done: "다 놓았어요",
  soundless: "소리가 안 나와서 글로 봐요.",
  /** 무음 모드 줄(C111 — 아이패드 사파리, e2e 기기). */
  silentMode: "아이패드 제어 센터에서 무음 모드를 꺼 주세요",
} as const;
const MS = 1000;
const PRAISE_MS = TEST_SETTINGS["talk.teacher_praise_seconds"].value * MS;
const START_TIMEOUT_MS =
  TEST_SETTINGS["speech.speak_start_timeout_seconds"].value * MS;
const SPARE_CAP = {
  reading: TEST_SETTINGS["lesson.spares_per_session.reading"].value,
  writing: TEST_SETTINGS["lesson.spares_per_session.writing"].value,
} as const;
/** 선생님 줄 · 칭찬 표지 · 감시 상한 여럿을 기다리는 여유(시험 값). */
const WAIT_MS = 30_000;

/** 읽어 주기가 바로 끝나는 기기(영어 · 한국어 목소리 둘 — 선생님 한국어 줄도 읽는다). */
function quickScript(): SpeechScript {
  const base = loadSpeechScript("default-ok");
  return {
    ...base,
    synthesis: {
      voices: [
        ...(base.synthesis?.voices ?? []),
        {
          name: "Test Korean",
          lang: "ko-KR",
          localService: true,
          default: false,
        },
      ],
      utterances: [{ startAfter: 10, endAfter: 60 }],
    },
  };
}
/** 모든 읽어 주기가 시작 알림 없이 사라지는 기기(감시가 '들려주지 못함'으로 넘김). */
function neverPlaysScript(): SpeechScript {
  const quick = quickScript();
  return {
    ...quick,
    synthesis: {
      voices: quick.synthesis?.voices ?? [],
      utterances: [{ neverStart: true }],
    },
  };
}

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

/** 그 영역을 3단계에서 시작하고 선생님(미나)을 이미 고른 집으로 fn(묶음 마-2 — 고르기 화면 없이 오늘 배울 것부터). */
function atTeachLevel<T>(
  where: Parameters<typeof atLevel>[0],
  fn: (profileId: string) => Promise<T>,
): Promise<T> {
  return atLevel(where, async (profileId) => {
    await e2eDb()
      .update(profiles)
      .set({ teacherKey: "mina" })
      .where(eq(profiles.id, profileId));
    return fn(profileId);
  });
}

const activityNo = (page: Page) =>
  page.locator("[data-activity]").getAttribute("data-activity-no");

/** act 뒤 다음 활동으로 넘어갈 때까지 기다린다. */
async function toNext(page: Page, act: () => Promise<void>) {
  const before = await activityNo(page);
  await act();
  await expect(page.locator("[data-activity]")).not.toHaveAttribute(
    "data-activity-no",
    before ?? "",
    { timeout: WAIT_MS },
  );
}

/** 선생님 줄 화면의 단추(읽기가 끝나면 밝아짐)를 누른다. */
async function pressTeach(page: Page, action: "start" | "next") {
  const button = page.locator(`[data-teach-action="${action}"]`);
  await expect(button).toBeEnabled({ timeout: WAIT_MS });
  await toNext(page, () => button.click());
}

/** 위 띠 자리 이름. */
async function expectSlot(page: Page, name: string) {
  await expect(page.locator("[data-teach-slot-name]")).toContainText(name);
}

/** 오늘 배울 것 → 새 단어 → 본보기(수만큼)까지. */
async function throughShow(page: Page, models: number) {
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "today",
  );
  await expectSlot(page, T.slot.today);
  await pressTeach(page, "start");
  await expectSlot(page, T.slot.show);
  // 새 단어 카드에는 예문이 없다(C170 (3))
  await expect(page.locator("[data-new-word]").first()).toBeVisible();
  await pressTeach(page, "next");
  for (let i = 0; i < models; i++) {
    await expect(page.locator("[data-teach-model]")).toBeVisible();
    await pressTeach(page, "next");
  }
}

/** 그 세션의 끝 시도 입력(대기열이 보낸 뒤). */
async function finalInputs(sessionId: string) {
  const rows = await e2eDb()
    .select({ activityNo: attempts.activityNo, input: attempts.input })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  return rows
    .map((r) => ({
      activityNo: r.activityNo,
      input: r.input as Record<string, unknown>,
    }))
    .filter((r) => r.input.step === "final");
}

/** 읽기: 같이 해 보기 둘을 바른 보기로(맞음 반응 · 칭찬 표지 뒤 저절로 넘어감). 첫 문항은 먼저 틀려 본다(틀림 반응 뒤 다시). */
async function throughReadingTogether(page: Page, lesson: LessonOf["reading"]) {
  const together = lesson.teach?.together ?? [];
  for (const [i, item] of together.entries()) {
    await expectSlot(page, T.slot.together);
    await expect(page.locator("[data-highlight]").first()).toBeVisible();
    const choices = page.locator("[data-together-choices]");
    if (i === 0) {
      const wrongNo = item.answerNo === 1 ? 2 : 1;
      await choices.locator(`[data-answer-choice="${wrongNo}"]`).click();
      await expect(page.locator("[data-together-reaction]")).toHaveAttribute(
        "data-together-reaction",
        "wrong",
      );
      await expect(page.getByText(item.wrongKo)).toBeVisible();
    }
    await toNext(page, async () => {
      await choices.locator(`[data-answer-choice="${item.answerNo}"]`).click();
      await expect(page.getByText(item.rightKo)).toBeVisible();
    });
  }
}

/** 읽기 문항 하나를 고른다(보기 번호). */
async function pickOption(page: Page, no: number) {
  await page.locator(`ol [data-answer-choice="${no}"]`).first().click();
}

test.describe("가르치는 수업 읽기(AC-22c · AC-3d · AC-3k)", () => {
  test.use({ speechScript: quickScript() });

  test("AC-22c 읽기 3단계 단원 1 세션은 여섯 자리를 지나고, 처음 틀린 문항의 짝이 '스스로 해 보기'로 나오며 AC-3d '왜' · 띠 · 둘째 정답을 지난다", async ({
    page,
  }) => {
    const sample = teachSample("reading");
    const lesson = sample.lesson;
    const questions = lesson.content.questions;
    const [q0] = questions;
    if (!q0?.spare || !q0.whyKo || !q0.retryHighlight)
      throw new Error("승인 수업 꼴");
    const { spare: spare0, whyKo: why0, retryHighlight } = q0;
    await atTeachLevel({ area: "reading", level: 3 }, async (profileId) => {
      const row = await insertSampleLesson({
        sample,
        lessonNo: E2E_LESSON_NO.teach,
      });
      const sessionId = await openLessonSession(profileId, row);
      await page.goto(`/session/${sessionId}`);
      await throughShow(page, lesson.teach?.models.length ?? 0);
      await throughReadingTogether(page, lesson);

      // 혼자 해 보기 첫 화면(지문)에만 초상과 '이제 혼자 해 봐요.'
      await expectSlot(page, T.slot.solo);
      await expect(page.locator('[data-teach-first="solo"]')).toContainText(
        T.soloFirst,
      );
      await toNext(page, () =>
        page
          .locator("[data-passage-activity]")
          .getByRole("button", { name: T.next })
          .click(),
      );

      // AC-3k 문항 화면: 세로 화면에서도 지문이 늘 함께, 문항 위 이름표, 초상 없음
      await expect(page.locator("[data-passage-always]")).toBeVisible();
      await expect(page.locator("[data-show-passage]")).toHaveCount(0);
      await expect(page.locator("[data-ask-role]")).toBeVisible();
      await expect(page.locator("[data-teacher-line]")).toHaveCount(0);

      // AC-3d 처음 틀림 → 같은 문항 위 '왜'(시드 whyKo) · '한 번 더 풀기' → 지문 답 문장에 띠 → 둘째도 틀림 → '정답은 이거예요'
      const wrong = (q0.answerNo % 4) + 1;
      const wrong2 =
        (wrong % 4) + 1 === q0.answerNo ? (wrong % 4) + 2 : (wrong % 4) + 1;
      await pickOption(page, wrong);
      await expect(page.locator("[data-teach-why]")).toContainText(why0);
      await expect(page.locator("[data-explanation]")).toHaveCount(0);
      const retry = page.locator('[data-teach-action="retry"]');
      await expect(retry).toHaveText(T.retrySolve);
      await expect(retry).toBeEnabled({ timeout: WAIT_MS });
      await retry.click();
      await expect(page.locator("[data-retry-highlight] mark")).toHaveText(
        retryHighlight,
      );
      await pickOption(page, wrong2);
      await expect(page.getByText(T.answerIs)).toBeVisible();
      await toNext(page, () =>
        page.getByRole("button", { name: T.next }).click(),
      );

      // 나머지 문항은 처음에 맞힌다('맞았어요!'만, 해설 칸 없음)
      for (const q of questions.slice(1)) {
        await pickOption(page, q.answerNo);
        await expect(page.getByText(T.right)).toBeVisible();
        await expect(page.locator("[data-explanation]")).toHaveCount(0);
        await toNext(page, () =>
          page.getByRole("button", { name: T.next }).click(),
        );
      }

      // 스스로 해 보기: 첫 문항의 짝(짝 글 · 띠 없음) — 첫 장 한 줄, 처음 맞으면 '혼자 해냈어요!'
      await expect(page.locator("[data-activity]")).toHaveAttribute(
        "data-activity",
        "spare",
      );
      await expectSlot(page, T.slot.spare);
      await expect(page.locator('[data-teach-first="spare"]')).toContainText(
        T.spareFirst.reading,
      );
      await expect(page.getByText(spare0.textEn)).toBeVisible();
      await expect(page.locator("[data-highlight]")).toHaveCount(0);
      await pickOption(page, spare0.answerNo);
      await expect(page.getByText(T.spareRight)).toBeVisible();
      await page.getByRole("button", { name: T.next }).click();
      await page.waitForURL(`**/result/${sessionId}`, { timeout: WAIT_MS });

      // 끝 시도는 판 2, 짝 시도는 문항 꼴 + slot "spare" 하나(내지 않은 짝은 시도 없음)
      const finals = await finalInputs(sessionId);
      expect(finals.every((f) => f.input.v === 2)).toBe(true);
      const spares = finals.filter((f) => f.input.slot === "spare");
      expect(spares).toHaveLength(1);
      expect(spares[0]?.input.kind).toBe("reading-question");
      expect(SPARE_CAP.reading).toBeGreaterThanOrEqual(1);
      // 같이 해 보기 시도는 틀린 보기 뒤 바른 보기(연습 — 맞힐 때까지)
      const together = finals.find(
        (f) => f.input.kind === "together" && f.input.index === 0,
      );
      expect((together?.input.tries as unknown[] | undefined)?.length).toBe(2);
    });
  });

  test("AC-22c 혼자 해 보기를 다 맞히면 짝 없이 결과 화면으로 간다", async ({
    page,
  }) => {
    const sample = teachSample("reading");
    const lesson = sample.lesson;
    await atTeachLevel({ area: "reading", level: 3 }, async (profileId) => {
      const row = await insertSampleLesson({
        sample,
        lessonNo: E2E_LESSON_NO.teach,
      });
      const sessionId = await openLessonSession(profileId, row);
      await page.goto(`/session/${sessionId}`);
      await throughShow(page, lesson.teach?.models.length ?? 0);
      await throughReadingTogether(page, lesson);
      await toNext(page, () =>
        page
          .locator("[data-passage-activity]")
          .getByRole("button", { name: T.next })
          .click(),
      );
      const questions = lesson.content.questions;
      for (const [i, q] of questions.entries()) {
        await pickOption(page, q.answerNo);
        const next = page.getByRole("button", { name: T.next });
        if (i < questions.length - 1) await toNext(page, () => next.click());
        else await next.click();
      }
      await page.waitForURL(`**/result/${sessionId}`, { timeout: WAIT_MS });
      const finals = await finalInputs(sessionId);
      expect(finals.filter((f) => f.input.slot === "spare")).toHaveLength(0);
    });
  });
});

/** 쓰기 카드를 차례로 놓고(대문자 단추 선택) '다 놓았어요'. */
async function placeCards(
  page: Page,
  cards: readonly string[],
  capital: boolean,
) {
  for (const card of cards)
    await page.locator(`[data-tile="${card}"]`).first().click();
  if (capital) await page.locator("[data-capital]").first().click();
  await page.getByRole("button", { name: T.done }).click();
}

test.describe("가르치는 수업 쓰기(AC-4d · AC-3d · AC-22c)", () => {
  test.use({ speechScript: quickScript() });

  test("AC-4d 같이 해 보기에서 남은 카드를 모두 놓으면 문장이 완성되고, AC-3d 까닭별 '왜' · 색 칸 · 둘째 정답, AC-22c 틀린 문장의 짝이 나온다", async ({
    page,
  }) => {
    const sample = teachSample("writing");
    const lesson = sample.lesson;
    if (lesson.content.shape !== "items") throw new Error("쓰기 꼴");
    const items = lesson.content.items;
    const [item0, item1] = items;
    if (!item0?.whyKo || !item0.spare || !item1?.spare)
      throw new Error("승인 수업 꼴");
    const { whyKo: why0, spare: itemSpare0 } = item0;
    const itemSpare1 = item1.spare;
    const [blanks, capitalItem] = lesson.teach?.together ?? [];
    if (
      blanks?.type !== "assemble-sentence" ||
      !blanks.filled ||
      !Array.isArray(blanks.slot) ||
      !capitalItem
    )
      throw new Error("같이 해 보기 꼴");
    const blankCards = blanks.cards;
    const blankSlot = blanks.slot;
    await atTeachLevel({ area: "writing", level: 3 }, async (profileId) => {
      const row = await insertSampleLesson({
        sample,
        lessonNo: E2E_LESSON_NO.teach,
      });
      const sessionId = await openLessonSession(profileId, row);
      await page.goto(`/session/${sessionId}`);
      await throughShow(page, lesson.teach?.models.length ?? 0);

      // AC-4d 같이 해 보기 1: 빈칸 둘 = 남은 카드 둘. 틀린 차례(cold is) → wrongKo · 카드가 돌아옴 → 바른 차례로 문장 완성
      await expectSlot(page, T.slot.together);
      const cards = page.locator("[data-together-cards]");
      await expect(cards.locator('[data-slot="empty"]')).toHaveCount(
        blanks.choices?.length ?? 0,
      );
      const [first, second] = blanks.choices ?? [];
      const order = blankSlot.map((p) => blankCards[p - 1] ?? "");
      await cards.locator(`[data-tile="${order[1]}"]`).click();
      await cards.locator(`[data-tile="${order[0]}"]`).click();
      await cards.getByRole("button", { name: T.done }).click();
      await expect(page.getByText(blanks.wrongKo)).toBeVisible();
      await expect(cards.locator('[data-slot="empty"]')).toHaveCount(2);
      expect([first, second].sort()).toEqual([...order].sort());
      await toNext(page, async () => {
        for (const card of order)
          await cards.locator(`[data-tile="${card}"]`).click();
        await cards.getByRole("button", { name: T.done }).click();
        // 남은 카드를 다 놓은 문장이 완성된다(빈칸 없음)
        await expect(cards.locator('[data-slot="empty"]')).toHaveCount(0);
        await expect(page.getByText(blanks.rightKo)).toBeVisible();
      });

      // 같이 해 보기 2: 다 놓인 문장의 대문자 단추가 반짝이고, 누르면 맞음
      const flash = page.locator("[data-capital-flash]");
      await expect(flash).toBeVisible();
      await toNext(page, async () => {
        await flash.click();
        await expect(page.getByText(capitalItem.rightKo)).toBeVisible();
      });

      // 혼자 해 보기 첫 화면 한 줄
      await expectSlot(page, T.slot.solo);
      await expect(page.locator('[data-teach-first="solo"]')).toContainText(
        T.soloFirst,
      );

      // AC-3d 문항 1: 차례가 틀림 → 시드 whyKo · 정답은 아직 없음 → '한 번 더 하기' → 색 칸(칩 이름) · 대문자 단추 반짝임 →
      // 둘째도 틀림 → '정답은 이거예요'와 정답 → 그대로 놓기 → '맞았어요!'
      const right0 = (item0.accepted[0] ?? "").match(/[^\s.]+|\./g) ?? [];
      const lower0 = right0.map((c, i) => (i === 0 ? c.toLowerCase() : c));
      const swapped = [
        lower0[0] ?? "",
        lower0[2] ?? "",
        lower0[1] ?? "",
        ...lower0.slice(3),
      ];
      await placeCards(page, swapped, true);
      await expect(page.locator("[data-teach-why]")).toContainText(why0);
      await expect(page.getByText(T.answerIs)).toHaveCount(0);
      const retry = page.locator('[data-teach-action="retry"]');
      await expect(retry).toHaveText(T.retryDo);
      await expect(retry).toBeEnabled({ timeout: WAIT_MS });
      await retry.click();
      await expect(page.locator("[data-slot-role]").first()).toBeVisible();
      await expect(page.locator("[data-capital-flash]")).toBeVisible();
      await expect(page.locator("[data-reveal-tile]")).toHaveCount(0);
      await placeCards(page, swapped, true);
      await expect(page.getByText(T.answerIs)).toBeVisible();
      await expect(page.locator("[data-reveal-tile]").first()).toBeVisible();
      await page.getByRole("button", { name: T.retryDo }).click();
      await placeCards(page, lower0, true);
      await expect(page.getByText(T.right)).toBeVisible();
      await toNext(page, () =>
        page.getByRole("button", { name: T.next }).click(),
      );

      // 문항 2: 차례는 맞고 대문자만 틀림 → 앱 문구 '첫 글자를 대문자 단추로 바꿔요.' → 다시 맞힘
      const right1 = (item1.accepted[0] ?? "").match(/[^\s.]+|\./g) ?? [];
      const lower1 = right1.map((c, i) => (i === 0 ? c.toLowerCase() : c));
      await placeCards(page, lower1, false);
      await expect(page.locator("[data-teach-why]")).toContainText(
        T.whyCapital,
      );
      const retry1 = page.locator('[data-teach-action="retry"]');
      await expect(retry1).toBeEnabled({ timeout: WAIT_MS });
      await retry1.click();
      await placeCards(page, lower1, true);
      await toNext(page, () =>
        page.getByRole("button", { name: T.next }).click(),
      );

      // 나머지는 처음에 맞힌다
      for (const item of items.slice(2)) {
        const right = (item.accepted[0] ?? "").match(/[^\s.]+|\./g) ?? [];
        await placeCards(
          page,
          right.map((c, i) => (i === 0 ? c.toLowerCase() : c)),
          true,
        );
        await toNext(page, () =>
          page.getByRole("button", { name: T.next }).click(),
        );
      }

      // 스스로 해 보기: 처음 틀린 문항 둘의 짝(상한 lesson.spares_per_session.writing 안). 첫 짝은 틀려 본다 → 바른 답과 짝의 '왜',
      // 다시 없음 → 둘째 짝은 처음 맞힘 '혼자 해냈어요!'
      expect(SPARE_CAP.writing).toBeGreaterThanOrEqual(2);
      await expectSlot(page, T.slot.spare);
      await expect(page.locator('[data-teach-first="spare"]')).toContainText(
        T.spareFirst.writing,
      );
      const spare0 = (itemSpare0.accepted[0] ?? "").match(/[^\s.]+|\./g) ?? [];
      const spareLower0 = spare0.map((c, i) => (i === 0 ? c.toLowerCase() : c));
      await placeCards(
        page,
        [
          spareLower0[0] ?? "",
          spareLower0[2] ?? "",
          spareLower0[1] ?? "",
          ...spareLower0.slice(3),
        ],
        true,
      );
      await expect(page.getByText(T.answerIs)).toBeVisible();
      await expect(page.locator("[data-teach-why]")).toContainText(
        itemSpare0.whyKo ?? "",
      );
      await expect(page.locator('[data-teach-action="retry"]')).toHaveCount(0);
      // '왜' 화면의 '다음'은 선생님이 줄을 읽은 뒤에 밝다(설계 5 — fix 1 I1)
      await expect(page.locator("[data-teach-next]")).toBeEnabled({
        timeout: WAIT_MS,
      });
      await toNext(page, () =>
        page.getByRole("button", { name: T.next }).click(),
      );
      await expect(page.locator("[data-teach-first]")).toHaveCount(0);
      const spare1 = (itemSpare1.accepted[0] ?? "").match(/[^\s.]+|\./g) ?? [];
      await placeCards(
        page,
        spare1.map((c, i) => (i === 0 ? c.toLowerCase() : c)),
        true,
      );
      await expect(page.getByText(T.spareRight)).toBeVisible();
      await page.getByRole("button", { name: T.next }).click();
      await page.waitForURL(`**/result/${sessionId}`, { timeout: WAIT_MS });

      const finals = await finalInputs(sessionId);
      const spares = finals.filter((f) => f.input.slot === "spare");
      expect(spares).toHaveLength(2);
      expect(spares.every((f) => f.input.kind === "writing-item")).toBe(true);
      // 같이 해 보기 2(대문자 단추)는 맞출 칸이 없는 시도 하나(L-34 계약)
      const capitalTry = finals.find(
        (f) => f.input.kind === "together" && f.input.index === 1,
      );
      expect(capitalTry?.input.tries).toEqual([{}]);
      // 같이 해 보기 1 의 시도는 빈칸 차례의 카드
      const blankTry = finals.find(
        (f) => f.input.kind === "together" && f.input.index === 0,
      );
      expect(blankTry?.input.tries).toEqual([
        { pieces: [order[1], order[0]] },
        { pieces: order },
      ]);
    });
  });
});

test.describe("선생님 줄 안내 셈(AC-N20 · UI · UX R-57)", () => {
  test("AC-N20 선생님 줄을 들려주지 못하면 '소리가 안 나와서 글로 봐요'와 밝은 단추이고, 한 세션에서 두 번째부터 무음 모드 줄이 붙는다", async ({
    context,
  }) => {
    // 감시 상한 + 여유(START_TIMEOUT_MS + WAIT_MS)를 두 번 기다린다 — 기본 제한 시간(30초)보다 길다(e2e 첫 실행 분류 3절 ×T)
    test.setTimeout(3 * (START_TIMEOUT_MS + WAIT_MS));
    const sample = teachSample("reading");
    await atTeachLevel({ area: "reading", level: 3 }, async (profileId) => {
      const row = await insertSampleLesson({
        sample,
        lessonNo: E2E_LESSON_NO.teach,
      });
      const sessionId = await openLessonSession(profileId, row);
      const page = await speechPage(context, neverPlaysScript());
      await page.goto(`/session/${sessionId}`);
      await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(
        1,
      );
      // 첫 안내: 감시 상한 뒤 안내 · '시작' 밝음, 무음 모드 줄은 아직 없음
      await expect(page.getByText(T.soundless)).toBeVisible({
        timeout: START_TIMEOUT_MS + WAIT_MS,
      });
      await expect(page.locator('[data-teach-action="start"]')).toBeEnabled();
      await expect(page.locator("[data-teach-silent]")).toHaveCount(0);
      await pressTeach(page, "start");
      // 두 번째 안내(새 단어 화면 — 조각의 onLineEnd({ notice: true })를 틀이 셈) → 무음 모드 줄
      await expect(page.locator("[data-teach-silent]")).toContainText(
        T.silentMode,
        { timeout: START_TIMEOUT_MS + WAIT_MS },
      );
      await expect(page.locator('[data-teach-action="next"]')).toBeEnabled();
      expect(PRAISE_MS).toBeGreaterThan(0);
    });
  });
});

// ── 말하기(묶음 라-3 · 델타 spec 설계 1 · 5 · 8 · 10, 정본 AC-22c · AC-4d · AC-5d · AC-3k · AC-N19 · AC-N20) ──

/** 말하기 화면 글(정본 4절 · 설계 5 문구 표 · C78 그대로). */
const ST = {
  micOk: "알겠어요",
  together: "같이 말해 볼까요",
  good: "잘 말했어요",
  whyRepeat: "끊어서 다시 들어 봐요.",
  retrySpeak: "한 번 더 말하기",
  spareFirst: "다른 이야기로 혼자 해 봐요.",
  soundRetry: "소리가 안 나왔어요. 다시 들어 봐요",
} as const;
/** 인식 결과가 오는 때(대본 안 ms). */
const RESULT_AT = 400;
/** 가짜 AI 피드백 한 문장(시험 고정 글 — 해요체, 금지어 목록에 걸리지 않음). */
const FAKE_SPEAKING_FEEDBACK = "질문에 알맞게 대답했어요.";
/** 시도 꼴 판(core/session/attempt INPUT_VERSION). */
const INPUT_V2 = 2;
/** 미나 선생님 목소리 높이(seed/teachers.json voice.pitch — 집이 고른 선생님). */
const MINA_PITCH = (
  JSON.parse(
    readFileSync(join(__dirname, "..", "..", "seed", "teachers.json"), "utf8"),
  ) as { teachers: { key: string; voice: { pitch: number } }[] }
).teachers.find((t) => t.key === "mina")?.voice.pitch;

/** 한 문장을 말하고 조용해지는 듣기(앱이 stop 하면 끝). */
const said = (text: string): RecognitionRun => ({
  events: [
    { at: 50, type: "start" },
    { at: 100, type: "audiostart" },
    { at: 200, type: "speechstart" },
    {
      at: RESULT_AT,
      type: "result",
      results: [{ transcript: text, isFinal: true }],
    },
  ],
  onStop: [{ at: 50, type: "end" }],
});
/** 읽어 주기가 바로 끝나는 기기 + 차례대로 말하는 답(듣기 start() 마다 하나). */
function speakingScript(
  answers: readonly string[],
  base: SpeechScript = quickScript(),
): SpeechScript {
  return { ...base, recognitions: answers.map(said) };
}
/** 말하기 단추가 밝아지면(읽는 중 흐림이 풀리면) 누르고 그 듣기가 끝날 때까지. */
async function speakOnce(page: Page) {
  const button = page.locator(
    "[data-activity] [data-speak]:not([data-speak-waiting])",
  );
  await expect(button).toBeEnabled({ timeout: WAIT_MS });
  await button.click();
  await expect(
    page.locator("[data-activity] [data-speak][data-listening]"),
  ).toHaveCount(0, { timeout: WAIT_MS });
}
/** 이야기 화면(글자 없이 소리만)의 '다음' — 저절로 한 번 들려준 뒤 밝다. */
async function pastStory(page: Page, story: string) {
  await expect(page.locator("[data-teach-story]")).toBeVisible();
  await expect(page.locator("[data-teach-story]")).not.toContainText(story);
  const next = page.locator('[data-teach-story] [data-teach-action="next"]');
  await expect(next).toBeEnabled({ timeout: WAIT_MS });
  await next.click();
}
/** 말하기 평가 응답(맞음 — 정한 것 6: 의미 검사가 실패하면 앱이 '다시'로 바꾼다). */
function speakingEvalReply(correctSentence: string): FakeReply {
  return {
    kind: "message",
    body: messageBody({
      model: TEST_SETTINGS["ai.model.speaking_eval"].value,
      json: {
        judgement: "correct",
        feedback: FAKE_SPEAKING_FEEDBACK,
        correctSentence,
        grammarNotes: [],
      },
    }),
  };
}
/** 그 세션의 진행 시도 입력. */
async function progressInputs(sessionId: string) {
  const rows = await e2eDb()
    .select({ activityNo: attempts.activityNo, input: attempts.input })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  return rows
    .map((r) => ({
      activityNo: r.activityNo,
      input: r.input as Record<string, unknown>,
    }))
    .filter((r) => r.input.step === "progress");
}
/** 말하기 승인 수업의 활동 차례(서버 activitiesOf 와 같은 함수). */
function speakingActivities(lesson: LessonOf["speaking"]): Activity[] {
  return activitiesOf({
    area: "speaking",
    level: 3,
    content: lesson.content,
    ...(lesson.teach ? { teach: lesson.teach } : {}),
  } as Parameters<typeof activitiesOf>[0]);
}
/** 혼자 질문 앞 활동들을 바로 맞힌 끝 시도로 넣는다(그 세션이 첫 질문에서 이어진다 — 시험 지름길). */
async function finishedBeforeQuestions(
  sessionId: string,
  lesson: LessonOf["speaking"],
): Promise<number> {
  const activities = speakingActivities(lesson);
  const firstQuestion = activities.findIndex((a) => a.kind === "question");
  const c = lesson.content;
  const inputOf = (a: Activity): Record<string, unknown> => {
    const head = { v: INPUT_V2, step: "final" };
    switch (a.kind) {
      case "today":
        return { ...head, kind: "today" };
      case "preview":
        return {
          ...head,
          kind: "preview",
          shownWords: lesson.preview.map((p) => p.word),
        };
      case "model":
        return { ...head, kind: "model", index: a.index };
      case "together":
        return { ...head, kind: "together", index: a.index, tries: [] };
      case "repeat-word":
        return {
          ...head,
          kind: "repeat-word",
          heard: [c.repeat.words[a.index] ?? ""],
          failures: 0,
        };
      case "repeat-sentence":
        return {
          ...head,
          kind: "repeat-sentence",
          heard: [c.repeat.sentences[a.index] ?? ""],
          failures: 0,
        };
      case "listening":
        return {
          ...head,
          kind: "listening",
          tries: [c.listening[a.index]?.answerNo ?? 1],
        };
      default:
        throw new Error(`질문 앞에 올 수 없는 활동(${a.kind})`);
    }
  };
  const at = new Date();
  await e2eDb()
    .insert(attempts)
    .values(
      activities.slice(0, firstQuestion).map((a, i) => ({
        sessionId,
        clientAttemptId: randomUUID(),
        activityNo: i + 1,
        input: inputOf(a),
        attemptedAt: at,
        status: "done" as const,
      })),
    );
  return firstQuestion + 1;
}
/** 그 프로필이 오늘 학습일의 하루 안전 상한에 닿게 한다(프로필 설정 ai.safety_daily_calls 를 1 로, 오늘 호출 한 행 — writing.spec 과 같은 꼴). */
async function reachSafetyCap(profileId: string) {
  const db = e2eDb();
  const [version] = await db
    .select({ v: max(settingRows.version) })
    .from(settingRows);
  await db.insert(settingRows).values({
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
    purpose: "speaking_eval",
    requestedModel: TEST_SETTINGS["ai.model.speaking_eval"].value,
    answeredModel: TEST_SETTINGS["ai.model.speaking_eval"].value,
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

test.describe("가르치는 수업 말하기(AC-22c · AC-4d · AC-5d · AC-3k)", () => {
  test.beforeEach(resetFakeAi);
  test.afterEach(resetFakeAi);

  test("AC-22c 말하기 3단계 단원 1 세션은 여섯 자리를 지나고 질문마다 이야기 → 질문이며, AC-4d 끊어 들려주기 · 듣기 다시 · 질문 '왜' → 바른 답 → 같이 말해 볼까요, AC-5d 판정 글자 없이, AC-3k 처음 틀린 문항의 짝이 질문 → 듣기 → 문장 차례로 나온다", async ({
    context,
  }) => {
    test.setTimeout(10 * 60 * MS);
    const sample = teachSample("speaking");
    const lesson = sample.lesson;
    const c = lesson.content;
    const [s5, s6] = lesson.teach?.together ?? [];
    const [l0, ...restListening] = c.listening;
    const [q0, ...restQuestions] = c.questions;
    if (
      !s5?.modelAnswer ||
      s5.answerNo === undefined ||
      !s6 ||
      !l0?.whyKo ||
      !l0.retryHighlight ||
      !l0.spare ||
      !q0?.storyEn ||
      !q0.whyKo ||
      !q0.modelAnswer ||
      !q0.spare?.storyEn
    )
      throw new Error("승인 말하기 수업 꼴");
    // 콜백 안에서도 좁힌 꼴이 남게 상수로
    const s5Model = s5.modelAnswer;
    const l0Why = l0.whyKo;
    const l0Slow = l0.retryHighlight;
    const l0SpareAnswer = l0.spare.answerNo;
    const q0Story = q0.storyEn;
    const q0Why = q0.whyKo;
    const q0Model = q0.modelAnswer;
    const spareQ0 = q0.spare;
    const spareStory = q0.spare.storyEn;
    const [sentence0, ...restSentences] = c.repeat.sentences;
    const chunks0 = (c.repeat.chunks?.[0] ?? "")
      .split("/")
      .map((piece) => piece.trim());
    if (!sentence0 || chunks0.length < 2) throw new Error("끊는 자리");
    const wrongChoice = s5.answerNo === 1 ? 2 : 1;
    const answers = [
      // 같이 해 보기: S5 고른 뒤 틀린 말 → 같이 말해 볼까요, S6 틀만 보고
      "Yes, they eat cake.",
      s5.modelAnswer,
      s6.accepted[0] ?? "",
      // 따라 말하기: 낱말 모두 바로, 문장 0 은 먼저 틀림 → 끊어 들은 뒤 다시
      ...c.repeat.words,
      "zzz qqq",
      sentence0,
      ...restSentences,
      // 질문 0: 방향이 틀린 답(AI 는 맞음이라 해도 앱이 '다시') → 같이 말해 볼까요, 나머지는 허용 답
      "Yes, they eat rice.",
      q0.modelAnswer,
      ...restQuestions.map((q) => q.accepted?.[0] ?? ""),
      // 짝: 질문 짝 맞음, 문장 짝 틀림
      spareQ0.accepted[0] ?? "",
      "zzz qqq",
    ];
    await pushFakeAi([
      ruleFor("speaking_eval.answer", speakingEvalReply(q0.modelAnswer)),
    ]);
    await atTeachLevel({ area: "speaking", level: 3 }, async (profileId) => {
      const row = await insertSampleLesson({
        sample,
        lessonNo: E2E_LESSON_NO.teach,
      });
      const sessionId = await openLessonSession(profileId, row);
      const page = await speechPage(context, speakingScript(answers));
      await page.goto(`/session/${sessionId}`);
      await throughShow(page, lesson.teach?.models.length ?? 0);

      // 같이 해 보기(처음 마이크 안내 뒤): S5 누가 자리 — 틀린 보기 ✕ → 바른 보기 → 같이 말하기
      await expectSlot(page, T.slot.together);
      await page.getByRole("button", { name: ST.micOk }).click();
      const choices = page.locator("[data-together-choices]");
      await choices.locator(`[data-answer-choice="${wrongChoice}"]`).click();
      await expect(page.getByText(s5.wrongKo)).toBeVisible();
      await expect(page.locator("[data-activity] [data-speak]")).toHaveCount(0);
      await choices.locator(`[data-answer-choice="${s5.answerNo}"]`).click();
      await speakOnce(page);
      // 틀린 말: 틀 반응 뒤 바른 답을 보이며 들려주고 '같이 말해 볼까요'(판정 글자 없음)
      await expect(page.locator("[data-together-echo]")).toBeVisible();
      await expect(page.locator("[data-model-answer]")).toContainText(s5Model);
      await expect(page.getByText(ST.together)).toBeVisible();
      await expect
        .poll(async () => (await speechRecord(page)).spoken, {
          timeout: WAIT_MS,
        })
        .toContain(s5Model);
      await toNext(page, async () => {
        await speakOnce(page);
        await expect(page.getByText(s5.rightKo)).toBeVisible();
      });
      // S6 영어 틀만 보고 말하기
      await toNext(page, async () => {
        await speakOnce(page);
        await expect(page.getByText(s6.rightKo)).toBeVisible();
      });

      // 혼자 해 보기: 첫 화면(따라 말하기 낱말)에만 초상과 한 줄
      await expectSlot(page, T.slot.solo);
      await expect(page.locator('[data-teach-first="solo"]')).toContainText(
        T.soloFirst,
      );
      for (const _ of c.repeat.words)
        await toNext(page, async () => {
          await speakOnce(page);
          await expect(page.getByText(ST.good)).toBeVisible();
        });
      // AC-4d 문장 0: 첫 시도가 '잘 말했어요'가 아니면 '왜'(앱 문구) → '한 번 더 말하기' → 끊어 들려준 뒤 다시
      await speakOnce(page);
      await expect(page.locator("[data-teach-why]")).toContainText(
        ST.whyRepeat,
      );
      const retry = page.locator('[data-teach-retry="speak"]');
      await expect(retry).toHaveText(ST.retrySpeak);
      await expect(retry).toBeEnabled({ timeout: WAIT_MS });
      await retry.click();
      await expect(page.locator("[data-chunked]")).toBeVisible();
      await expect
        .poll(async () => (await speechRecord(page)).spoken, {
          timeout: WAIT_MS,
        })
        .toEqual(expect.arrayContaining(chunks0));
      await toNext(page, async () => {
        await speakOnce(page);
        await expect(page.getByText(ST.good)).toBeVisible();
      });
      for (const _ of restSentences)
        await toNext(page, async () => {
          await speakOnce(page);
          await expect(page.getByText(ST.good)).toBeVisible();
        });

      // AC-4d 듣기 이해 0: 처음 틀림 → '왜'(시드) · '한 번 더 풀기' → 대본 뒤 답 덩어리를 천천히 → 둘째도 틀림 → 정답
      const right0 = l0.answerNo;
      const wrong0 = (right0 % l0.options.length) + 1;
      const wrong1 =
        (wrong0 % l0.options.length) + 1 === right0
          ? ((wrong0 + 1) % l0.options.length) + 1
          : (wrong0 % l0.options.length) + 1;
      await page.locator(`[data-answer-choice="${wrong0}"]`).click();
      await expect(page.locator("[data-teach-why]")).toContainText(l0Why);
      const solve = page.locator('[data-teach-retry="solve"]');
      await expect(solve).toBeEnabled({ timeout: WAIT_MS });
      await solve.click();
      await expect(page.locator("[data-slow-answer]")).toBeVisible();
      // 답 덩어리는 대본 문장과 글이 같을 수 있어 빠르기로 가린다: speech.rate.1-3 × speech.slow_rate_factor 로 읽은 발화
      const slowRate =
        TEST_SETTINGS["speech.rate.1-3"].value *
        TEST_SETTINGS["speech.slow_rate_factor"].value;
      await expect
        .poll(
          async () => {
            const record = await speechRecord(page);
            return record.spoken.some(
              (text, i) =>
                text === l0Slow &&
                Math.abs((record.rates[i] ?? 0) - slowRate) < 1e-6,
            );
          },
          { timeout: WAIT_MS },
        )
        .toBe(true);
      await page.locator(`[data-answer-choice="${wrong1}"]`).click();
      await expect(page.getByText(T.answerIs)).toBeVisible();
      await toNext(page, () =>
        page.getByRole("button", { name: T.next }).click(),
      );
      for (const item of restListening) {
        await page.locator(`[data-answer-choice="${item.answerNo}"]`).click();
        await expect(page.getByText(T.right)).toBeVisible();
        await toNext(page, () =>
          page.getByRole("button", { name: T.next }).click(),
        );
      }

      // AC-22c 질문 0: 이야기 화면(글자 없이) → 질문 → 방향이 틀린 답 → AC-4d '왜'(시드) · '한 번 더 말하기' → 바른 답(시드) · 같이 말해 볼까요
      await pastStory(page, q0Story);
      await expect(page.getByText(q0.en)).toBeVisible();
      await expect(page.locator("[data-activity]")).not.toContainText(q0Story);
      await speakOnce(page);
      await expect(page.locator("[data-teach-why]")).toContainText(q0Why, {
        timeout: WAIT_MS,
      });
      // AC-5d 판정 글자 · 결과 말 · AI 피드백 없음(합친 판정이 AI 와 다르다 — 정한 것 6)
      await expect(page.getByText(ST.good)).toHaveCount(0);
      await expect(page.locator("[data-ai-feedback]")).toHaveCount(0);
      await expect(page.locator("[data-heard]")).toHaveText(
        "Yes, they eat rice.",
      );
      const speakRetry = page.locator('[data-teach-retry="speak"]');
      await expect(speakRetry).toBeEnabled({ timeout: WAIT_MS });
      await speakRetry.click();
      await expect(page.locator("[data-model-answer]")).toContainText(q0Model);
      await expect(page.getByText(ST.together)).toBeVisible();
      await toNext(page, () => speakOnce(page));
      // 나머지 질문: 허용 답 → '잘 말했어요'와 AI 피드백 한 문장
      for (const q of restQuestions) {
        await pastStory(page, q.storyEn ?? "~");
        await speakOnce(page);
        await expect(page.getByText(ST.good)).toBeVisible({ timeout: WAIT_MS });
        await expect(page.locator("[data-ai-feedback]")).toContainText(
          FAKE_SPEAKING_FEEDBACK,
        );
        await toNext(page, () =>
          page.getByRole("button", { name: T.next }).click(),
        );
      }

      // AC-3k 스스로 해 보기: 질문 짝(첫 장 한 줄 · 이야기 화면 · 앱 판정) → 듣기 짝 → 문장 짝
      await expectSlot(page, T.slot.spare);
      await expect(page.locator('[data-teach-first="spare"]')).toContainText(
        ST.spareFirst,
      );
      await pastStory(page, spareStory);
      await speakOnce(page);
      await expect(page.getByText(T.spareRight)).toBeVisible();
      await toNext(page, () =>
        page.getByRole("button", { name: T.next }).click(),
      );
      await page.locator(`[data-answer-choice="${l0SpareAnswer}"]`).click();
      await expect(page.getByText(T.spareRight)).toBeVisible();
      await toNext(page, () =>
        page.getByRole("button", { name: T.next }).click(),
      );
      // 문장 짝도 틀리면 바른 답을 들려주고 '다음'(같은 문제 다시 없음)
      const spareSentence = c.repeat.spares?.sentences[0] ?? "~";
      await speakOnce(page);
      await expect(
        page.locator('[data-teach-stage="spare-wrong"]'),
      ).toBeVisible();
      await expect(page.getByText(ST.retrySpeak)).toHaveCount(0);
      await expect
        .poll(async () => (await speechRecord(page)).spoken, {
          timeout: WAIT_MS,
        })
        .toContain(spareSentence);
      await page.getByRole("button", { name: T.next }).click();
      await page.waitForURL(`**/result/${sessionId}`, { timeout: WAIT_MS });

      // AI 호출은 혼자 질문 넷뿐(같이 해 보기 · 짝은 앱 판정 — AC-N19), 질문 직전 이야기를 함께 보냈다(정한 것 5)
      const requests = await fakeAiRequestsOf("speaking_eval.answer");
      expect(requests).toHaveLength(c.questions.length);
      expect(JSON.stringify(requests[0]?.body)).toContain(q0Story);
      const finals = await finalInputs(sessionId);
      expect(finals.every((f) => f.input.v === INPUT_V2)).toBe(true);
      // 질문 0 의 끝 시도: 서버가 앱 판정으로 합친 judge(AI 맞음이지만 '다시'), 이야기 다시 듣기 기록
      const activities = speakingActivities(lesson);
      const q0No = activities.findIndex((a) => a.kind === "question") + 1;
      const q0Final = finals.find((f) => f.activityNo === q0No)?.input;
      expect(q0Final?.judge).toMatchObject({ ai: "correct", final: "retry" });
      expect(q0Final?.story).toEqual({ replayed: false });
      // '같이 말해 볼까요' 뒤 말은 서버가 같은 끝 시도 행에 합친다(같은 행의 도움받은 시도 — fix 1 I1), 따로 된 진행 시도는 없다
      expect(q0Final?.echo).toBe(q0Model);
      expect(
        (await progressInputs(sessionId)).filter((p) => p.activityNo === q0No),
      ).toHaveLength(0);
      // 질문은 선생님이 보이는 영어라 고른 선생님(미나) 높이로, 이야기는 글 자료라 높이 없이 읽었다(설계 4 목소리 표 · fix 1 M1)
      const record = await speechRecord(page);
      const pitchOf = (text: string) =>
        record.pitches[record.spoken.indexOf(text)];
      expect(pitchOf(q0.en)).toBe(MINA_PITCH);
      expect(pitchOf(q0Story)).not.toBe(MINA_PITCH);
      // 같이 해 보기 0: 틀린 보기 · 틀린 말 · 같이 말한 바른 답 세 시도(연습 — 맞힐 때까지)
      const together0 = finals.find(
        (f) => f.input.kind === "together" && f.input.index === 0,
      );
      expect(together0?.input.tries).toEqual([
        { choice: wrongChoice },
        { choice: s5.answerNo, heard: "Yes, they eat cake." },
        { choice: s5.answerNo, heard: s5Model },
      ]);
      // 짝 셋(질문 → 듣기 → 문장), 내지 않은 짝은 시도 없음
      const spares = finals.filter((f) => f.input.slot === "spare");
      expect(spares.map((f) => f.input.kind)).toEqual([
        "question",
        "listening",
        "repeat-sentence",
      ]);
    });
  });

  test("AC-N20 이야기가 소리 없이 넘어가면 '다시 듣기'가 횟수와 따로 살아 있고 소리 다시 해 보기 안내 · 두 번째부터 무음 모드 줄이며, 그 답은 판정 없이 기술 오류(U)로 남는다", async ({
    context,
  }) => {
    test.setTimeout(5 * 60 * MS);
    const sample = teachSample("speaking");
    const lesson = sample.lesson;
    const [q0] = lesson.content.questions;
    if (!q0?.storyEn || !q0.modelAnswer) throw new Error("승인 말하기 질문 꼴");
    const q0Model = q0.modelAnswer;
    await atTeachLevel({ area: "speaking", level: 3 }, async (profileId) => {
      const row = await insertSampleLesson({
        sample,
        lessonNo: E2E_LESSON_NO.teach,
      });
      const sessionId = await openLessonSession(profileId, row);
      const q0No = await finishedBeforeQuestions(sessionId, lesson);
      const page = await speechPage(
        context,
        speakingScript([q0Model], neverPlaysScript()),
      );
      await page.goto(`/session/${sessionId}`);
      await expect(page.locator("[data-activity]")).toHaveAttribute(
        "data-activity-no",
        String(q0No),
      );
      await page.getByRole("button", { name: ST.micOk }).click();
      // 저절로 들려주기가 감시 상한 뒤 '들려주지 못함' → 안내와 큰 '다시 듣기', 이야기 '다시 듣기'도 살아 있다
      await expect(page.getByText(ST.soundRetry)).toBeVisible({
        timeout: START_TIMEOUT_MS + WAIT_MS,
      });
      await expect(
        page.locator('[data-teach-story] [data-teach-action="listen-again"]'),
      ).toBeEnabled();
      await page.locator("[data-sound-retry-replay]").click();
      // 다시도 못 들려주면 무음 모드 줄(e2e 기기는 아이패드 사파리), 작은 '다음'은 두지 않는다(이야기 '다음' 하나)
      await expect(page.locator("[data-sound-retry-silent]")).toBeVisible({
        timeout: START_TIMEOUT_MS + WAIT_MS,
      });
      await expect(page.locator("[data-sound-retry-next]")).toHaveCount(0);
      await expect(
        page.locator('[data-teach-story] [data-teach-action="listen-again"]'),
      ).toBeEnabled();
      await page
        .locator('[data-teach-story] [data-teach-action="next"]')
        .click();
      await toNext(page, () => speakOnce(page));
      // AI 를 부르지 않고 U 끝 시도(소리를 못 들은 답 — 설계 10 · C179 (2))
      expect(await fakeAiRequestsOf("speaking_eval.answer")).toHaveLength(0);
      const rows = await e2eDb()
        .select({ input: attempts.input, score: attempts.score })
        .from(attempts)
        .where(
          and(eq(attempts.sessionId, sessionId), eq(attempts.activityNo, q0No)),
        );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.score).toBeNull();
      expect(rows[0]?.input).toMatchObject({
        kind: "question",
        step: "final",
        techError: "speak_fail",
        story: { replayed: false },
      });
    });
  });

  test("AC-N19 'AI 쉬는 중'(하루 안전 상한)이면 말하기 3단계 혼자 질문을 그 앞 이야기 화면과 함께 건너뛰고(짝도 없음) 세션을 끝까지 한다", async ({
    context,
  }) => {
    test.setTimeout(3 * 60 * MS);
    const sample = teachSample("speaking");
    const lesson = sample.lesson;
    await atTeachLevel({ area: "speaking", level: 3 }, async (profileId) => {
      await reachSafetyCap(profileId);
      const row = await insertSampleLesson({
        sample,
        lessonNo: E2E_LESSON_NO.teach,
      });
      const sessionId = await openLessonSession(profileId, row);
      await finishedBeforeQuestions(sessionId, lesson);
      const page = await speechPage(context, speakingScript([]));
      await page.goto(`/session/${sessionId}`);
      // 쉬는 안내 판 없이 질문 · 이야기 화면을 건너뛰어 결과로(7절 말하기 3~8 예외)
      await page.waitForURL(`**/result/${sessionId}`, { timeout: WAIT_MS });
      expect(await fakeAiRequestsOf("speaking_eval.answer")).toHaveLength(0);
      const finals = await finalInputs(sessionId);
      const questions = finals.filter(
        (f) => f.input.kind === "question" && f.input.slot === undefined,
      );
      expect(questions).toHaveLength(lesson.content.questions.length);
      expect(questions.every((f) => f.input.skipped === "ai_rest")).toBe(true);
      expect(finals.filter((f) => f.input.slot === "spare")).toHaveLength(0);
    });
  });
});
