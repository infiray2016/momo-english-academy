// 배치 평가 e2e(4절 배치 평가 행 · 3.2 · 7절 · AC-11b · 11c · 11d · AC-5e 배치 몫, plan-p10a 증명 표).
// 실제 e2e DB(시험용 시드 — 완전성 1단계, 단계마다 배치 문항 1, 말하기 본 문항은 따라 말하기 · 예비는 듣고 고르기)를 쓴다.
// 정답은 그 문항의 시드 행에서 읽고, 가짜 음성 대본은 시험 안에서 그 문항의 문장으로 만든다(위험 16). 설계 숫자는 DB 설정에서 읽는다.
import type { BrowserContext, Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { matchRate } from "../../src/core/speech/match-rate";
import type {
  RecognitionRun,
  SpeechScript,
} from "../../src/core/speech/script";
import { placementItems } from "../../src/db/schema/content";
import {
  levelTests,
  profileTracks,
  sessions,
} from "../../src/db/schema/learning";
import { settings } from "../../src/db/schema/operations";
import { closeE2eDb, e2eDb, resetHousehold, shiftTimes } from "./db";
import { expect, loadSpeechScript, speechPage, test } from "./fixtures";
import { insertHousehold } from "./household";
import { photo } from "./photos";

const T = {
  start:
    /^처음이라 내게 맞는 단계를 찾아요\. 모르는 문제는 '몰라요'를 눌러요\. 많아도 \d+문제예요$/,
  startButton: "시작",
  micNotice:
    "말한 소리는 인터넷으로 보내 글자로 바꿔요. 소리는 저장하지 않아요",
  micCheck: "마이크 확인",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  dontKnow: "몰라요",
  next: "다음",
  oneMore: "한 번 더 말해 볼까요?",
  retry: "다시 한 번 말해 볼까요",
  meetTeacher: "이제 회화 선생님을 만날 수 있어요",
  spares: "말하기 일부는 듣기로 봤어요",
  toLessons: "수업 고르러 가기",
  done: "다 놓았어요",
  capital: "대문자",
  space: "띄우기",
} as const;
const AREA_LABEL = { reading: "읽기", writing: "쓰기", speaking: "말하기" };
const HOUR = 1;
const LONG = 120_000;

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

async function settingValue(key: string): Promise<unknown> {
  const [row] = await e2eDb()
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key));
  return row?.value;
}

type ItemRow = typeof placementItems.$inferSelect;

async function itemRow(id: string): Promise<ItemRow> {
  const [row] = await e2eDb()
    .select()
    .from(placementItems)
    .where(eq(placementItems.id, id));
  if (!row) throw new Error(`문항 행 없음: ${id}`);
  return row;
}

/** 본 문항 칸(영역 · 단계 · 번호 1)의 행. */
async function mainRow(
  area: "reading" | "writing" | "speaking",
  level: number,
) {
  const [row] = await e2eDb()
    .select()
    .from(placementItems)
    .where(
      and(
        eq(placementItems.area, area),
        eq(placementItems.level, level),
        eq(placementItems.itemNo, 1),
        eq(placementItems.isSpare, false),
      ),
    );
  if (!row) throw new Error(`본 문항 없음: ${area} ${level}`);
  return row;
}

/** 문항 칸 하나의 내용을 그 시험 동안만 바꾼다. */
async function withItem<T>(
  row: ItemRow,
  item: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const db = e2eDb();
  await db
    .update(placementItems)
    .set({ item, itemType: item.type as string })
    .where(eq(placementItems.id, row.id));
  try {
    return await fn();
  } finally {
    await db
      .update(placementItems)
      .set({ item: row.item, itemType: row.itemType })
      .where(eq(placementItems.id, row.id));
  }
}

const itemLocator = (page: Page) => page.locator("[data-placement-item]");

/** 배치 화면을 열고 하이드레이션을 기다린다(그 전 누름은 사라진다). */
async function openPlacement(page: Page, area: string) {
  await page.goto(`/${area}/placement`);
  await expect(
    page.locator("[data-placement-screen][data-hydrated]"),
  ).toHaveCount(1);
}

async function currentItem(page: Page): Promise<ItemRow> {
  await expect(itemLocator(page)).toHaveCount(1);
  const id = await itemLocator(page).getAttribute("data-placement-item");
  if (!id) throw new Error("문항 id 없음");
  return itemRow(id);
}

async function expectItemNo(page: Page, n: number) {
  await expect(page.locator("[data-paper-band]")).toContainText(`문제 ${n}`);
}

/**
 * 답을 보낸 뒤: 앞 문항이 사라지고 다음 문항이나 결과 하나가 보일 때까지 기다린다. 결과면 참.
 * (앞 문항이 남은 순간에 다음 화면을 확인하면 느린 CI 에서 어긋난다 — 차례 5 CI 실패.)
 */
async function nextScreen(page: Page, previousId: string): Promise<boolean> {
  await expect(
    page.locator(`[data-placement-item="${previousId}"]`),
  ).toHaveCount(0);
  await expect(
    page.locator("[data-placement-result], [data-placement-item]"),
  ).toHaveCount(1);
  return (await page.locator("[data-placement-result]").count()) > 0;
}

/** 고르기 문항을 정답(또는 틀린 답)으로 보내고 다음 화면을 기다린다. 결과면 참. */
async function answerChoice(page: Page, right = true): Promise<boolean> {
  const row = await currentItem(page);
  const answerNo = (row.item as { answerNo: number }).answerNo;
  const pick = right ? answerNo : answerNo === 1 ? 2 : 1;
  await page.locator(`[data-answer-choice="${pick}"]`).click();
  await page.getByRole("button", { name: T.next, exact: true }).click();
  return nextScreen(page, row.id);
}

/** 글자 타일 문항을 정답 글자 차례대로 보내고 다음 화면을 기다린다. */
async function answerTiles(page: Page): Promise<boolean> {
  const row = await currentItem(page);
  const word = (row.item as { accepted: string[] }).accepted[0] ?? "";
  for (const letter of word) {
    await page.locator(`[data-tile="${letter}"]`).first().click();
  }
  await page.getByRole("button", { name: T.done }).click();
  return nextScreen(page, row.id);
}

const DEFAULT_OK = loadSpeechScript("default-ok");
const MIC_OK = DEFAULT_OK.recognitions[0] as RecognitionRun;
/** 한 문장을 말하고 조용해지는 듣기(앱이 stop 하면 끝). */
const said = (text: string): RecognitionRun => ({
  events: [
    { at: 50, type: "start" },
    { at: 100, type: "audiostart" },
    { at: 200, type: "speechstart" },
    { at: 400, type: "result", results: [{ transcript: text, isFinal: true }] },
  ],
  onStop: [{ at: 50, type: "end" }],
});
/** 말소리 없이 끝나는 듣기(결과 없음 — 다시 듣기 갈래). */
const SILENT: RecognitionRun = {
  events: [
    { at: 50, type: "start" },
    { at: 150, type: "end" },
  ],
};
function script(runs: RecognitionRun[]): SpeechScript {
  return {
    name: "placement-e2e",
    source: "손으로 씀 — 배치 e2e(시험 안에서 문항 문장으로 만듦)",
    recognitions: runs,
    ...(DEFAULT_OK.synthesis ? { synthesis: DEFAULT_OK.synthesis } : {}),
  };
}

/** 그 듣기들의 대본을 넣은 새 쪽(fixtures 의 speechPage). */
const runsPage = (context: BrowserContext, runs: RecognitionRun[]) =>
  speechPage(context, script(runs));

/** 말하기 배치: 시작 → 첫 마이크 안내 화면 → '마이크 확인'. */
async function startSpeaking(page: Page) {
  await openPlacement(page, "speaking");
  await page.getByRole("button", { name: T.startButton }).click();
  await expect(page.getByText(T.micNotice)).toBeVisible();
  await expect(
    page.getByText("단추를 누른 뒤 아무 말이나 한마디 해 주세요"),
  ).toBeVisible();
  await photo(page, "placement-mic-notice");
  await page.getByRole("button", { name: T.micCheck }).click();
  await expectItemNo(page, 1);
}

async function trackOf(profileId: string, area: string) {
  const [row] = await e2eDb()
    .select()
    .from(profileTracks)
    .where(
      and(
        eq(profileTracks.profileId, profileId),
        eq(profileTracks.area, area as "reading"),
      ),
    );
  return row;
}

async function placementAnswers(profileId: string) {
  const [row] = await e2eDb()
    .select()
    .from(levelTests)
    .where(eq(levelTests.profileId, profileId));
  return {
    test: row,
    answers: (row?.answers ?? []) as {
      level: number;
      correct: boolean;
      dontKnow: boolean;
      slot: string;
      repeatFailed: boolean;
    }[],
  };
}

test("AC-11d 배치 평가 시작 화면에 안내 문구가 보이고 문제마다 '몰라요'가 있으며 몰라요는 틀림으로 센다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold();
  const maxItems = await settingValue("placement.items_per_area");
  await openPlacement(page, "reading");
  await expect(page.getByText(T.start)).toHaveText(
    `처음이라 내게 맞는 단계를 찾아요. 모르는 문제는 '몰라요'를 눌러요. 많아도 ${maxItems}문제예요`,
  );
  // 화면 검토 사진(전체 디자인 리뷰 M-11 (4)) — 시작 · 문항 · 결과(마이크 안내는 말하기 배치 시험)
  await photo(page, "placement-start");
  await page.getByRole("button", { name: T.startButton }).click();
  let n = 0;
  let done = false;
  while (!done) {
    n += 1;
    // 통과 기준 칸 · 정오 표시 없음 — 위에는 '문제 n'만
    await expectItemNo(page, n);
    if (n === 1) await photo(page, "placement-item");
    const { id } = await currentItem(page);
    await page.getByRole("button", { name: T.dontKnow }).click();
    done = await nextScreen(page, id);
  }
  // 몰라요만이면 1단계도 못 넘음 — 1단계(알파벳 · 소리 단원)
  await expect(page.locator("[data-placement-result]")).toHaveText(
    "읽기는 1단계에서 시작해요",
  );
  await photo(page, "placement-result");
  const { answers, test: lt } = await placementAnswers(profileId);
  expect(answers.length).toBe(n);
  expect(answers.every((a) => a.dontKnow && !a.correct)).toBe(true);
  expect(lt?.totalScore).toBe(0);
  expect(await trackOf(profileId, "reading")).toMatchObject({
    level: 1,
    unit: 0,
  });
});

test("AC-11d 배치 평가를 하다 멈추고 24시간 뒤 카드를 누르면 멈춘 문항부터 이어진다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold();
  await openPlacement(page, "reading");
  await page.getByRole("button", { name: T.startButton }).click();
  await expectItemNo(page, 1);
  await answerChoice(page);
  await expectItemNo(page, 2);
  const stopped = await currentItem(page);
  await page.getByRole("link", { name: "홈" }).click();
  const [session] = await e2eDb()
    .select()
    .from(sessions)
    .where(eq(sessions.profileId, profileId));
  if (!session?.levelTestId) throw new Error("배치 세션 없음");
  const resumeHours = Number(await settingValue("session.resume_hours"));
  await shiftTimes("sessions", session.id, resumeHours + HOUR);
  await shiftTimes("level_tests", session.levelTestId, resumeHours + HOUR);
  await page.goto("/");
  await page
    .locator("a")
    .filter({ has: page.locator('[data-home-card="reading"]') })
    .click();
  await expect(page).toHaveURL(/\/reading\/placement$/);
  await expectItemNo(page, 2);
  expect((await currentItem(page)).id).toBe(stopped.id);
  const [still] = await e2eDb()
    .select({ status: sessions.status })
    .from(sessions)
    .where(eq(sessions.id, session.id));
  expect(still?.status).toBe("in_progress");
});

test("AC-11c 따라 말하기 문항에서 첫 시도 일치율 0.6 · 둘째 0.85 면 맞음이고 첫 시도 뒤에는 인식 글 없이 '한 번 더 말해 볼까요?'만 보인다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold();
  const start = Number(await settingValue("placement.start_level"));
  const pass = Number(await settingValue("placement.repeat_pass"));
  const row = await mainRow("speaking", start);
  const sentence =
    "I see a big red ball and a small blue cup on the long brown table in the warm sunny";
  const words = sentence.split(" ");
  const first = words.slice(0, 12).join(" ");
  const second = words.slice(0, 17).join(" ");
  const match = { homophones: [], nameSlot: "any-word" as const };
  expect(matchRate(sentence, first, match)).toBe(0.6);
  expect(matchRate(sentence, second, match)).toBe(0.85);
  expect(0.6).toBeLessThan(pass);
  expect(0.85).toBeGreaterThanOrEqual(pass);
  await withItem(
    row,
    { ...(row.item as Record<string, unknown>), sentence },
    async () => {
      const page = await runsPage(context, [MIC_OK, said(first), said(second)]);
      await startSpeaking(page);
      await expect(page.getByText(sentence)).toBeVisible();
      await page.getByRole("button", { name: "말하기" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: T.oneMore }),
      ).toBeVisible();
      // 인식 글은 보이지 않는다
      await expect(page.getByText(first, { exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "말하기" }).click();
      await expectItemNo(page, 2);
      const { answers } = await placementAnswers(profileId);
      expect(answers[0]).toMatchObject({ level: start, correct: true });
      await page.close();
    },
  );
});

test("AC-11c · AC-5e 한 문항 인식이 두 시도를 합쳐 3회 실패하면 남은 따라 말하기 자리에 예비 문항이 나오고 결과에 '말하기 일부는 듣기로 봤어요'가 붙는다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold();
  const retries = Number(await settingValue("speech.max_retries"));
  const page = await runsPage(context, [
    MIC_OK,
    ...Array.from({ length: retries }, () => SILENT),
  ]);
  await startSpeaking(page);
  for (let i = 1; i < retries; i += 1) {
    await page.getByRole("button", { name: "말하기" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: T.retry }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "말하기" })).toBeEnabled();
  }
  const main = await currentItem(page);
  await page.getByRole("button", { name: "말하기" }).click();
  // 같은 자리(문제 1)에 예비 문항(듣고 고르기)이 나온다
  expect(await nextScreen(page, main.id)).toBe(false);
  await expectItemNo(page, 1);
  const spare = await currentItem(page);
  expect(spare.isSpare).toBe(true);
  expect(spare.itemType).toBe("listening");
  // 남은 따라 말하기 자리도 예비 문항 — 끝까지 듣고 고르기로 맞힌다
  let done = false;
  while (!done) {
    const row = await currentItem(page);
    expect(row.isSpare).toBe(true);
    done = await answerChoice(page);
  }
  await expect(page.getByText(T.spares)).toBeVisible();
  const { answers } = await placementAnswers(profileId);
  expect(answers[0]).toMatchObject({ slot: "main", repeatFailed: true });
  expect(answers.slice(1).every((a) => a.slot === "spare")).toBe(true);
  await page.close();
});

test("AC-11b 말하기 배치를 끝내면 결과 화면에 '말하기는 n단계에서 시작해요' · '이제 회화 선생님을 만날 수 있어요'와 '수업 고르러 가기'만 보이고 회화 카드가 열리며 회화는 n 과 talk.placement_cap 가운데 낮은 단계다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold();
  // 다 맞히는 길: 단계마다 문항 하나(작은 틀) — 시작 단계에서 두 단계씩, 맨 위 단계 앞에서 한 단계(3.2 · C71)
  const levels: number[] = [];
  const max = 12;
  for (
    let l = Number(await settingValue("placement.start_level"));
    l <= max;
  ) {
    levels.push(l);
    l = l + 2 <= max ? l + 2 : l === max ? max + 1 : max;
  }
  const sentences = await Promise.all(
    levels.map(
      async (l) => (await mainRow("speaking", l)).item as { sentence: string },
    ),
  );
  const page = await runsPage(context, [
    MIC_OK,
    ...sentences.map((s) => said(s.sentence)),
  ]);
  await startSpeaking(page);
  let done = false;
  for (let i = 0; i < levels.length && !done; i += 1) {
    await expectItemNo(page, i + 1);
    const { id } = await currentItem(page);
    await page.getByRole("button", { name: "말하기" }).click();
    done = await nextScreen(page, id);
  }
  // 결과 화면이 보인 뒤에 DB 를 읽는다(결과는 같은 트랜잭션에서 저장된다)
  expect(done).toBe(true);
  const speaking = await trackOf(profileId, "speaking");
  const n = speaking?.level ?? 0;
  await expect(page.locator("[data-placement-result]")).toHaveText(
    `말하기는 ${n}단계에서 시작해요`,
  );
  await expect(page.getByText(T.meetTeacher)).toBeVisible();
  // 결과 화면의 단추는 '수업 고르러 가기' 하나다(띠의 '홈'도 없다)
  await expect(page.locator("main").getByRole("link")).toHaveCount(1);
  await expect(page.locator("main").getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("link", { name: T.toLessons })).toHaveAttribute(
    "href",
    "/speaking/lessons",
  );
  const cap = Number(await settingValue("talk.placement_cap"));
  expect(await trackOf(profileId, "talk")).toMatchObject({
    level: Math.min(n, cap),
    unit: 1,
  });
  await page.goto("/");
  const talk = page
    .locator("a")
    .filter({ has: page.locator('[data-home-card="talk"]') });
  await expect(talk).toHaveAttribute("href", "/talk/lessons");
  await page.close();
});

test.describe("인식 API 없음", () => {
  test.use({ speechScript: loadSpeechScript("no-recognition-api") });

  test("AC-11c 마이크를 쓸 수 없는 기기에서는 말하기 배치가 시작되지 않고 읽기 · 쓰기 배치는 그대로 된다", async ({
    page,
  }) => {
    const { profileId } = await insertHousehold();
    await openPlacement(page, "speaking");
    await expect(page.getByText(T.needsMic)).toBeVisible();
    await expect(page.getByRole("button", { name: T.startButton })).toHaveCount(
      0,
    );
    await expect(page.getByRole("link", { name: "홈" })).toBeVisible();
    const [speaking] = await e2eDb()
      .select()
      .from(sessions)
      .where(eq(sessions.profileId, profileId));
    expect(speaking).toBeUndefined();
    for (const area of ["reading", "writing"] as const) {
      await openPlacement(page, area);
      await page.getByRole("button", { name: T.startButton }).click();
      await expectItemNo(page, 1);
      await expect(page.locator("[data-paper-band]")).toContainText(
        AREA_LABEL[area],
      );
    }
  });
});

test("답 입력 조각: 쓰기 배치에서 글자 타일 · 문장 조립(대문자 단추 · 마침표 카드) · 앱 안 자판 받아쓰기 · 빈칸 채우기가 각각 답을 보내고 맞음으로 센다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold();
  const start = Number(await settingValue("placement.start_level"));
  const [r1, r2, r3] = await Promise.all([
    mainRow("writing", start),
    mainRow("writing", start + 2),
    mainRow("writing", start + 4),
  ]);
  if (!r1 || !r2 || !r3) throw new Error("문항 없음");
  const base = (row: ItemRow) => {
    const { no, revision, correction } = row.item as Record<string, number>;
    return { no, revision, correction };
  };
  const page = await runsPage(context, [MIC_OK]);
  await withItem(
    r1,
    {
      ...base(r1),
      type: "assemble-sentence",
      cards: ["the", "cat", "runs", "."],
      accepted: ["The cat runs."],
    },
    () =>
      withItem(
        r2,
        {
          ...base(r2),
          type: "dictation",
          word: "red cup",
          audioText: "red cup",
          accepted: ["red cup"],
        },
        () =>
          withItem(
            r3,
            {
              ...base(r3),
              type: "fill-blank",
              prompt: "I ___ a cat.",
              accepted: ["have"],
            },
            async () => {
              await openPlacement(page, "writing");
              await page.getByRole("button", { name: T.startButton }).click();
              // (1) 문장 조립: 카드를 차례로 놓고 첫 카드에 '대문자'
              await expectItemNo(page, 1);
              for (const card of ["the", "cat", "runs", "."]) {
                await page.locator(`[data-tile="${card}"]`).click();
              }
              await page.getByRole("button", { name: T.capital }).click();
              await expect(page.locator('[data-placed-tile="0"]')).toHaveText(
                "The",
              );
              await page.getByRole("button", { name: T.done }).click();
              // (2) 받아쓰기: 앱 안 자판(기기 자판 입력란 없음)
              await expectItemNo(page, 2);
              await expect(page.locator("[data-app-keyboard]")).toBeVisible();
              await expect(page.locator("input")).toHaveCount(0);
              for (const key of "red")
                await page.locator(`[data-key="${key}"]`).click();
              await page.getByRole("button", { name: T.space }).click();
              for (const key of "cup")
                await page.locator(`[data-key="${key}"]`).click();
              await expect(page.locator("[data-typed]")).toHaveText("red cup");
              await page
                .getByRole("button", { name: T.next, exact: true })
                .click();
              // (3) 빈칸 채우기: 입력란(자동 수정 · 자동 대문자 · 맞춤법 검사 끔)
              await expectItemNo(page, 3);
              const input = page.locator("input");
              await expect(input).toHaveAttribute("autocorrect", "off");
              await expect(input).toHaveAttribute("autocapitalize", "off");
              await expect(input).toHaveAttribute("spellcheck", "false");
              await input.fill(" Have ");
              await page
                .getByRole("button", { name: T.next, exact: true })
                .click();
              // (4) 글자 타일(시험용 시드 copy-tiles)
              await expectItemNo(page, 4);
              await answerTiles(page);
              await expectItemNo(page, 5);
            },
          ),
      ),
  );
  const { answers } = await placementAnswers(profileId);
  expect(answers.slice(0, 4).map((a) => [a.level, a.correct])).toEqual([
    [start, true],
    [start + 2, true],
    [start + 4, true],
    [start + 6, true],
  ]);
  await page.close();
});
