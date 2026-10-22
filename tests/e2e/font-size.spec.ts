// 아이 화면 크기(4절 · AC-N9, plan-p10b 증명 표 AC-N9 — P10 몫 화면). 실제 e2e DB(시험용 시드)를 쓴다.
// 화면마다 세로 820 · 가로 1180 에서 child-size.ts 훑기를 돌려 위반을 모은 뒤 한 번에 단언한다(어느 화면 · 방향인지 보이게).
import type { Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import type { RecognitionRun } from "../../src/core/speech/script";
import { lessons } from "../../src/db/schema/content";
import { profileTracks, unitProgress } from "../../src/db/schema/learning";
import { settings } from "../../src/db/schema/operations";
import { childSizeBothWays } from "./child-size";
import { closeE2eDb, e2eDb, insertSessions, resetHousehold } from "./db";
import { expect, loadSpeechScript, speechPage, test } from "./fixtures";
import { insertHousehold } from "./household";

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

const LONG = 180_000;

/** 마이크 확인을 통과시키는 듣기(기본 대본의 첫 듣기)와 말소리 없이 끝나는 듣기(다시 듣기 갈래). */
const DEFAULT_OK = loadSpeechScript("default-ok");
const MIC_OK = DEFAULT_OK.recognitions[0] as RecognitionRun;
const SILENT: RecognitionRun = {
  events: [
    { at: 50, type: "start" },
    { at: 150, type: "end" },
  ],
};

async function settingNumber(key: string): Promise<number> {
  const [row] = await e2eDb()
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key));
  return Number(row?.value);
}

async function readingCell(unit: number, kind: "assigned", lessonNo: number) {
  const [row] = await e2eDb()
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "reading"),
        eq(lessons.level, 1),
        eq(lessons.unit, unit),
        eq(lessons.kind, kind),
        eq(lessons.lessonNo, lessonNo),
        eq(lessons.topicVariant, 1),
      ),
    );
  if (!row) throw new Error("수업 칸 없음");
  return row;
}

/** 읽기 단원 1 을 통과하고 단원 2 로 옮긴다(지난 수업 쪽이 생기게). */
async function passReadingUnitOne(profileId: string) {
  const db = e2eDb();
  const [round] = await db
    .select()
    .from(unitProgress)
    .where(
      and(
        eq(unitProgress.profileId, profileId),
        eq(unitProgress.area, "reading"),
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
        eq(profileTracks.area, "reading"),
      ),
    );
}

const placementShown = (page: Page) =>
  expect(page.locator("[data-placement-screen][data-hydrated]")).toHaveCount(1);

test("AC-N9 아이 화면(접근 코드 · 홈 · 수업 목록 · 지난 수업 · 회화 준비 중 · 배치 평가 시작 · 문항 · 결과 · 세션 틀)의 안내 20px · 영어 24px · 버튼 글자 22px 이상, 누르는 곳 56px 이상, '%' 가 없고 세로 820 · 가로 1180 에서 가로 넘침이 없다", async ({
  page,
  browser,
  baseURL,
  context,
}) => {
  test.setTimeout(LONG);
  const problems: string[] = [];

  // 접근 코드(쿠키 없는 새 문맥 — 아이 화면 틀 밖이라 main 을 뿌리로)
  const anonymous = await browser.newContext({ baseURL });
  const access = await anonymous.newPage();
  await access.goto("/");
  await expect(access.getByRole("heading", { level: 1 })).toHaveText(
    "부모님이 코드를 넣어 주세요",
  );
  problems.push(...(await childSizeBothWays(access, "접근 코드", "main")));
  await anonymous.close();

  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });

  // 홈(읽기 카드 · 배치 전 카드 · 회화 카드)
  await page.goto("/");
  await expect(page.locator("[data-home-card]")).toHaveCount(4);
  // 마이크 판정이 끝나 '시작!' · '이야기 고르기' 행동 자리까지 그려진 뒤 훑는다(카드 넷은 서버 HTML 에도 있다 — 검토 M-2)
  await expect(page.locator("[data-home-cards][data-hydrated]")).toHaveCount(1);
  problems.push(...(await childSizeBothWays(page, "홈")));

  // 회화 준비 중(부모용 작은 글은 뺀다)
  await page.goto("/talk");
  problems.push(...(await childSizeBothWays(page, "회화 준비 중")));

  // 세션 틀(진행 세션을 넣고 연다): 미리보기 → 지문 → 문항
  const cell = await readingCell(1, "assigned", 1);
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: "reading",
      level: 1,
      unit: 1,
      lessonId: cell.id,
      kind: "regular",
      status: "in_progress",
      startedAt: new Date(),
      seedRevision: cell.revision,
      seedCorrection: cell.correction,
    },
  ]);
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  problems.push(...(await childSizeBothWays(page, "세션 틀 미리보기")));
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "reading-passage",
  );
  problems.push(...(await childSizeBothWays(page, "세션 틀 지문")));
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "reading-question",
  );
  problems.push(...(await childSizeBothWays(page, "세션 틀 문항")));

  // 수업 목록(하던 수업 이어 하기가 맨 위에 있는 꼴)
  await page.goto("/reading/lessons");
  await expect(page.locator("[data-lesson-board][data-hydrated]")).toHaveCount(
    1,
  );
  problems.push(...(await childSizeBothWays(page, "수업 목록")));

  // 지난 수업(단원 고르기 · 수업 고르기)
  await passReadingUnitOne(profileId);
  await page.goto("/reading/lessons/past");
  problems.push(...(await childSizeBothWays(page, "지난 수업 단원")));
  await page.goto("/reading/lessons/past?unit=1");
  await expect(page.locator("[data-past-lessons][data-hydrated]")).toHaveCount(
    1,
  );
  problems.push(...(await childSizeBothWays(page, "지난 수업 수업")));

  // 배치 평가: 시작 → 문항(읽기 그림 고르기 · 쓰기 글자 타일) → 결과
  await page.goto("/writing/placement");
  await placementShown(page);
  problems.push(...(await childSizeBothWays(page, "배치 시작")));
  await page.getByRole("button", { name: "시작" }).click();
  await expect(page.locator("[data-placement-item]")).toHaveCount(1);
  problems.push(...(await childSizeBothWays(page, "배치 문항(쓰기 타일)")));
  for (let i = 0; i < 20; i += 1) {
    if ((await page.locator("[data-placement-result]").count()) > 0) break;
    const before = await page
      .locator("[data-placement-item]")
      .getAttribute("data-placement-item");
    await page.getByRole("button", { name: "몰라요" }).click();
    await expect(page.locator(`[data-placement-item="${before}"]`)).toHaveCount(
      0,
    );
  }
  await expect(page.locator("[data-placement-result]")).toBeVisible();
  problems.push(...(await childSizeBothWays(page, "배치 결과")));

  // 말하기 배치(가짜 음성 길): 마이크 안내 → 따라 말하기 문항 → 인식 실패 끝에 듣고 고르기 예비 문항(검토 M-1 · M-3)
  const retries = await settingNumber("speech.max_retries");
  const speaking = await speechPage(context, {
    name: "font-size-speaking",
    source:
      "손으로 씀 — 크기 훑기: 마이크 확인 통과 뒤 말소리 없는 듣기만(예비 문항까지 가려고)",
    recognitions: [MIC_OK, ...Array.from({ length: retries }, () => SILENT)],
    ...(DEFAULT_OK.synthesis ? { synthesis: DEFAULT_OK.synthesis } : {}),
  });
  await speaking.goto("/speaking/placement");
  await placementShown(speaking);
  await speaking.getByRole("button", { name: "시작" }).click();
  // 이 기기에서 처음이면 마이크 안내 화면 — 바뀐 화면이 보인 뒤 훑는다
  await expect(speaking.locator("[data-mic-notice]")).toBeVisible();
  problems.push(...(await childSizeBothWays(speaking, "배치 마이크 안내")));
  await speaking.getByRole("button", { name: "마이크 확인" }).click();
  await expect(speaking.locator("[data-placement-item]")).toHaveCount(1);
  await expect(speaking.getByRole("button", { name: "말하기" })).toBeVisible();
  problems.push(
    ...(await childSizeBothWays(speaking, "배치 문항(따라 말하기)")),
  );
  const repeatItem = await speaking
    .locator("[data-placement-item]")
    .getAttribute("data-placement-item");
  for (let i = 0; i < retries; i += 1) {
    await expect(
      speaking.getByRole("button", { name: "말하기" }),
    ).toBeEnabled();
    await speaking.getByRole("button", { name: "말하기" }).click();
    if (i < retries - 1)
      await expect(
        speaking
          .getByRole("status")
          .filter({ hasText: "다시 한 번 말해 볼까요" }),
      ).toBeVisible();
  }
  await expect(
    speaking.locator(`[data-placement-item="${repeatItem}"]`),
  ).toHaveCount(0);
  await expect(speaking.locator("[data-answer-choice]").first()).toBeVisible();
  problems.push(
    ...(await childSizeBothWays(speaking, "배치 문항(듣고 고르기 예비)")),
  );
  await speaking.close();

  // 읽기 그림 고르기 문항(시작 단계를 고르지 않은 집)
  await resetHousehold();
  await insertHousehold();
  await page.goto("/reading/placement");
  await placementShown(page);
  await page.getByRole("button", { name: "시작" }).click();
  await expect(page.locator("[data-placement-item]")).toHaveCount(1);
  problems.push(...(await childSizeBothWays(page, "배치 문항(읽기 고르기)")));

  expect(problems).toEqual([]);
});

/** 정본 4절 글꼴: 영어 Fredoka · 본문 Gowun Dodum(next/font 가 붙이는 이름이 바뀌어도 맞게 이름 조각으로 본다). */
const FREDOKA = /fredoka/i;
const GOWUN = /gowun/i;

test('4절 글꼴: 영어 글(lang="en")의 첫 글꼴은 Fredoka 이고 실제로 실려 그려지며, 한국어 안내는 Gowun Dodum 그대로다(화면 검토 review-p11-7-design X-1)', async ({
  page,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });
  const cell = await readingCell(1, "assigned", 1);
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: "reading",
      level: 1,
      unit: 1,
      lessonId: cell.id,
      kind: "regular",
      status: "in_progress",
      startedAt: new Date(),
      seedRevision: cell.revision,
      seedCorrection: cell.correction,
    },
  ]);
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "reading-passage",
  );
  const english = page.locator('[data-child-screen] [lang="en"]').first();
  await expect(english).toBeVisible();
  const families = await english.evaluate((el) => {
    const first = (family: string) =>
      (family.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
    // 한국어 줄(lang 없는 첫 글줄 — 제목 Jua 이거나 안내 Gowun Dodum, 어느 쪽이든 Fredoka 가 아니다)
    const korean = document.querySelector(
      '[data-child-screen] p:not([lang]):not([lang="en"] *)',
    );
    return {
      english: first(getComputedStyle(el).fontFamily),
      korean: korean ? first(getComputedStyle(korean).fontFamily) : "",
    };
  });
  expect(families.english).toMatch(FREDOKA);
  expect(families.english).not.toMatch(/fallback/i);
  expect(families.korean).not.toBe("");
  expect(families.korean).not.toMatch(FREDOKA);
  // 이름만 맞고 글꼴 파일이 안 실리면 Gowun Dodum 의 라틴 글자로 그려진다 — 실린 글꼴 가운데 Fredoka 가 있는지까지 본다
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((f) => f.status === "loaded")
      .map((f) => f.family);
  });
  expect(loaded.some((family) => FREDOKA.test(family))).toBe(true);
  expect(loaded.some((family) => GOWUN.test(family))).toBe(true);
});
