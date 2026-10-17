// 첫 실행 e2e(4절 첫 실행 행 · AC-1a · AC-1b · AC-1c, plan-p10a 증명 표 — 차례 2 몫, AC-1b 는 차례 7 · 'AC-1c 주제 변형 수업'은 fix 8 에 더했다).
// 실제 e2e DB(playwright.config 의 임시 DB, 시험용 시드)를 쓰고 파일마다 집 기록을 비운다. 설계 숫자는 시험 DB 설정 · 구조 상수에서.

import type { Page } from "@playwright/test";
import { test as plain } from "@playwright/test";
import { and, eq, gte, isNull } from "drizzle-orm";
import {
  AVATARS,
  PIN_LENGTH,
  TOPIC_BUNDLES,
} from "../../src/core/profile/start";
import { lessons, vocab } from "../../src/db/schema/content";
import {
  profiles,
  profileTracks,
  sessions,
} from "../../src/db/schema/learning";
import {
  aiCalls,
  parentAlerts,
  settings,
} from "../../src/db/schema/operations";
import {
  cloneLessons,
  closeE2eDb,
  countRows,
  e2eDb,
  resetHousehold,
  withHouseholdSetting,
} from "./db";
import { expect, loadSpeechScript, test } from "./fixtures";
import { insertHousehold, randomPin } from "./household";

const T = {
  pinTitle: `부모님 PIN ${PIN_LENGTH}자리를 정해 주세요`,
  pinAgain: "한 번 더 넣어 주세요",
  pinMismatch: "PIN 이 서로 달라요. 다시 정해 주세요",
  displayName: "홈에 보일 이름(한글)",
  englishName: "토리가 부를 영어 이름",
  nickname: "토리가 부를 다른 영어 이름(별명)을 골라 주세요",
  alphabetKnown: "알아요",
  levelTitle: "영역마다 시작 단계를 고를 수 있어요",
  micCheck: "마이크 확인",
  micFailed: "마이크를 쓸 수 없었어요. 그래도 다음으로 넘어갈 수 있어요",
  micOk: "마이크가 잘 돼요",
  handoff: "아이에게 넘기기",
  next: "다음",
  accessLabel: "가족 접근 코드",
  accessButton: "들어가기",
} as const;
const THROUGH_KEY = "seed.complete_through_level";
/** 4절 '1~6단계만 보인다' 를 보려고 올리는 완전성 끝 단계(12절 기본값). */
const WIDE_THROUGH = 6;
const TALK_CHOSEN = 5;
/** 시작 단계 화면의 영역 단추(AREA_LABEL). */
const AREA_TABS = [
  ["reading", "읽기"],
  ["writing", "쓰기"],
  ["speaking", "말하기"],
  ["talk", "회화"],
] as const;

// test(fixtures)와 plain(@playwright/test)은 같은 파일 묶음이라 한 번만 건다(검토 review-p10-2-code 7절 2)
test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

const step = (page: Page) => page.locator("[data-first-run-step]");
const next = (page: Page) => page.getByRole("button", { name: T.next });

async function throughOf(): Promise<number> {
  const [row] = await e2eDb()
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.key, THROUGH_KEY), isNull(settings.profileId)));
  return Number(row?.value);
}

async function fillPin(page: Page) {
  const pin = randomPin();
  // 화면이 하이드레이션된 뒤 채운다 — 그 전에 채우면 상태가 비어 '다음'이 꺼진 채다(차례 5 CI). PIN 칸은 autoFocus 라
  // 초점은 하이드레이션 전에도 잡히므로 하이드레이션 표시를 기다린다(CI 7차)
  await expect(
    page.locator("[data-first-run-step][data-hydrated]"),
  ).toHaveCount(1);
  await expect(page.getByLabel("PIN", { exact: true })).toBeFocused();
  await page.getByLabel("PIN", { exact: true }).fill(pin);
  await page.getByLabel(T.pinAgain).fill(pin);
  await next(page).click();
}

/** 이름 화면부터 넘겨주기까지 기본 선택으로 지나고 홈을 기다린다. */
async function finishFrom(
  page: Page,
  from: "name" | "avatar" | "level" | "mic",
  name = "모모",
) {
  if (from === "name") {
    await page.getByLabel(T.displayName).fill(name);
    await next(page).click();
  }
  if (from === "name" || from === "avatar") {
    await expect(step(page)).toHaveAttribute("data-first-run-step", "avatar");
    await page.getByRole("button", { name: AVATARS[0].label }).click();
    await next(page).click();
    await page.getByRole("button", { name: T.alphabetKnown }).click();
    await next(page).click();
    await page.getByRole("button", { name: TOPIC_BUNDLES[0].label }).click();
    await next(page).click();
  }
  if (from !== "mic") {
    await expect(step(page)).toHaveAttribute("data-first-run-step", "level");
    await next(page).click();
  }
  await expect(step(page)).toHaveAttribute("data-first-run-step", "mic");
  await next(page).click();
  await page.getByRole("button", { name: T.handoff }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

plain(
  "AC-1a 접근 쿠키 없이 홈을 열면 접근 코드 화면이 나오고 맞는 코드를 넣으면 첫 실행 화면으로 가며, 첫 실행은 PIN 6자리를 두 번 같게 넣어야 다음으로 넘어간다",
  async ({ page }) => {
    await page.goto("/");
    await page
      .getByLabel(T.accessLabel)
      .fill(process.env.E2E_ACCESS_CODE ?? "");
    await page.getByRole("button", { name: T.accessButton }).click();
    await page.waitForURL((url) => url.pathname === "/first-run");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      T.pinTitle,
    );
    // 자리가 모자라면 '다음'이 눌리지 않는다
    const pin = randomPin();
    await page.getByLabel("PIN", { exact: true }).fill(pin.slice(1));
    await page.getByLabel(T.pinAgain).fill(pin.slice(1));
    await expect(next(page)).toBeDisabled();
    // 숫자만 받고 자리 수까지만 받는다
    await page.getByLabel("PIN", { exact: true }).fill(`${pin}9a`);
    await expect(page.getByLabel("PIN", { exact: true })).toHaveValue(pin);
    // 둘이 다르면 넘어가지 않고 다시 정하게 한다
    const other = pin.replace(/^./, (d) => String((Number(d) + 1) % 10));
    await page.getByLabel(T.pinAgain).fill(other);
    await next(page).click();
    await expect(page.getByRole("status").first()).toHaveText(T.pinMismatch);
    await expect(step(page)).toHaveAttribute("data-first-run-step", "pin");
    await expect(page.getByLabel("PIN", { exact: true })).toHaveValue("");
    // 같게 넣으면 다음 화면
    await page.getByLabel("PIN", { exact: true }).fill(pin);
    await page.getByLabel(T.pinAgain).fill(pin);
    await next(page).click();
    await expect(step(page)).toHaveAttribute("data-first-run-step", "name");
    expect(await countRows(profiles)).toBe(0);
  },
);

test("AC-1c 첫 실행은 PIN → 이름 → 아바타 → 알파벳 → 주제 묶음 → 시작 단계 → 음성 인식 안내 → 넘겨주기 순서로 한 화면에 하나씩 넘어간다", async ({
  page,
}) => {
  await page.goto("/first-run");
  const order: string[] = [];
  const record = async () => {
    order.push((await step(page).getAttribute("data-first-run-step")) ?? "");
    // 한 화면에 제목 하나, 큰 단추 하나(다음 · 넘기기)
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  };
  await record();
  await fillPin(page);
  await record();
  // 이름 화면에 들어오면 두 칸이 비어 있다(PIN 칸 요소가 이름 칸으로 이어지지 않음 — 컨트롤러 핫픽스 확인)
  await expect(page.getByLabel(T.displayName)).toHaveValue("");
  await expect(page.getByLabel(T.englishName)).toHaveValue("");
  await page.getByLabel(T.displayName).fill("모모");
  await next(page).click();
  await expect(step(page)).toHaveAttribute("data-first-run-step", "avatar");
  await record();
  await expect(next(page)).toBeDisabled();
  await page.getByRole("button", { name: AVATARS[2].label }).click();
  await next(page).click();
  await record();
  await expect(next(page)).toBeDisabled();
  await page.getByRole("button", { name: T.alphabetKnown }).click();
  await next(page).click();
  await record();
  await expect(next(page)).toBeDisabled();
  await page.getByRole("button", { name: TOPIC_BUNDLES[1].label }).click();
  await next(page).click();
  await record();
  // 시작 단계는 건너뛸 수 있다
  await expect(next(page)).toBeEnabled();
  await next(page).click();
  await record();
  await next(page).click();
  await record();
  expect(order).toEqual([
    "pin",
    "name",
    "avatar",
    "alphabet",
    "topic",
    "level",
    "mic",
    "handoff",
  ]);
  // 이전으로 돌아가도 고른 값이 남는다
  await page.getByRole("button", { name: "이전" }).click();
  await expect(step(page)).toHaveAttribute("data-first-run-step", "mic");
  await next(page).click();
  await page.getByRole("button", { name: T.handoff }).click();
  await page.waitForURL((url) => url.pathname === "/");
  const [profile] = await e2eDb().select().from(profiles);
  expect(profile).toMatchObject({
    avatar: AVATARS[2].id,
    topicBundle: TOPIC_BUNDLES[1].id,
  });
});

test("AC-1c 한글 이름을 넣으면 영어 이름 칸이 로마자로 먼저 채워지고 홈에는 한글 이름이 보인다", async ({
  page,
}) => {
  await page.goto("/first-run");
  await fillPin(page);
  await page.getByLabel(T.displayName).fill("남궁모모");
  await expect(page.getByLabel(T.englishName)).toHaveValue("Momo");
  // 부모가 고치면 그 값을 쓰고, 다 지우면 다시 채운다
  await page.getByLabel(T.englishName).fill("Momo Kim");
  await page.getByLabel(T.displayName).fill("토리");
  await expect(page.getByLabel(T.englishName)).toHaveValue("Momo Kim");
  await page.getByLabel(T.englishName).fill("");
  await expect(page.getByLabel(T.englishName)).toHaveValue("Tori");
  await page.getByLabel(T.displayName).fill("남궁모모");
  await next(page).click();
  // 뒤로 갔다 오면 이름 칸이 다시 채워진다(비제어 칸의 defaultValue 복원 — 검토 review-p10-fix2-code N-1)
  await expect(step(page)).toHaveAttribute("data-first-run-step", "avatar");
  await page.getByRole("button", { name: "이전" }).click();
  await expect(page.getByLabel(T.displayName)).toHaveValue("남궁모모");
  await expect(page.getByLabel(T.englishName)).toHaveValue("Momo");
  await next(page).click();
  await finishFrom(page, "avatar");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "남궁모모의 공부 보드",
  );
  const [profile] = await e2eDb().select().from(profiles);
  expect(profile).toMatchObject({
    displayName: "남궁모모",
    englishName: "Momo",
  });
});

test("AC-1c 두 번째 기기는 접근 코드 뒤 첫 실행 없이 홈으로 간다", async ({
  page,
}) => {
  await insertHousehold();
  await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "모모의 공부 보드",
  );
  // 첫 실행 주소를 열어도 홈으로 간다
  await page.goto("/first-run");
  expect(new URL(page.url()).pathname).toBe("/");
});

test.describe("마이크 확인 실패", () => {
  test.use({ speechScript: loadSpeechScript("not-allowed") });

  test("AC-1c 음성 인식 안내의 '마이크 확인'이 실패해도 다음 화면으로 넘어가고 부모 알림이 하나 생긴다", async ({
    page,
  }) => {
    await page.goto("/first-run");
    await fillPin(page);
    await page.getByLabel(T.displayName).fill("모모");
    await next(page).click();
    await finishToMic(page);
    await page.getByRole("button", { name: T.micCheck }).click();
    await expect(page.getByRole("status").first()).toHaveText(T.micFailed);
    await expect(next(page)).toBeEnabled();
    await next(page).click();
    await expect(step(page)).toHaveAttribute("data-first-run-step", "handoff");
    await page.getByRole("button", { name: T.handoff }).click();
    await page.waitForURL((url) => url.pathname === "/");
    expect(
      await countRows(parentAlerts, eq(parentAlerts.kind, "mic_unavailable")),
    ).toBe(1);
    // 권한 거부(mic-unavailable 갈래)는 이 브라우저에 '쓸 수 없음'을 남긴다
    expect(
      await page.evaluate(() => localStorage.getItem("momo.mic.v1")),
    ).toContain("not-allowed");
  });
});

test.describe("마이크 확인 · 소리 안 들어옴", () => {
  test.use({ speechScript: loadSpeechScript("audio-no-sound") });

  test("마이크 확인: 소리 받기만 시작하고 소리가 들어오지 않으면(원격 PC 가상 장치 꼴) '마이크가 잘 돼요'가 아니라 실패 문구가 보인다", async ({
    page,
  }) => {
    await page.goto("/first-run");
    await fillPin(page);
    await page.getByLabel(T.displayName).fill("모모");
    await next(page).click();
    await finishToMic(page);
    // 확인은 소리가 들어와야 성공이라 단추 아래에 말해 달라는 안내가 있다(C72)
    await expect(
      page.getByText("단추를 누른 뒤 아무 말이나 한마디 해 주세요"),
    ).toBeVisible();
    await page.getByRole("button", { name: T.micCheck }).click();
    await expect(page.getByRole("status").first()).toHaveText(T.micFailed);
    await expect(page.getByText(T.micOk)).toHaveCount(0);
    // 다시 듣기 갈래(소리 없음)는 이 브라우저에 '쓸 수 없음'을 남기지 않는다
    expect(
      await page.evaluate(() => localStorage.getItem("momo.mic.v1")),
    ).toBeNull();
  });
});

async function finishToMic(page: Page) {
  await expect(step(page)).toHaveAttribute("data-first-run-step", "avatar");
  await page.getByRole("button", { name: AVATARS[0].label }).click();
  await next(page).click();
  await page.getByRole("button", { name: T.alphabetKnown }).click();
  await next(page).click();
  await page.getByRole("button", { name: TOPIC_BUNDLES[0].label }).click();
  await next(page).click();
  await next(page).click();
  await expect(step(page)).toHaveAttribute("data-first-run-step", "mic");
}

test("AC-1c 시작 단계 화면에는 1~seed.complete_through_level 단계만 보이고 회화를 5단계로 고르면 회화는 5단계에서 시작한다", async ({
  page,
}) => {
  await withHouseholdSetting(THROUGH_KEY, WIDE_THROUGH, async () => {
    const through = await throughOf();
    await page.goto("/first-run");
    await fillPin(page);
    await page.getByLabel(T.displayName).fill("모모");
    await next(page).click();
    await expect(step(page)).toHaveAttribute("data-first-run-step", "avatar");
    await page.getByRole("button", { name: AVATARS[0].label }).click();
    await next(page).click();
    await page.getByRole("button", { name: T.alphabetKnown }).click();
    await next(page).click();
    await page.getByRole("button", { name: TOPIC_BUNDLES[0].label }).click();
    await next(page).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      T.levelTitle,
    );
    // 영역마다 한 칸(영역 단추로 고름) — 1~through 단계와 단계마다 예시 줄
    for (const [area, label] of AREA_TABS) {
      await page.getByRole("tab", { name: new RegExp(`^${label}`) }).click();
      const panel = page.locator(`[data-level-area="${area}"]`);
      await expect(panel).toBeVisible();
      for (let level = 1; level <= through; level += 1) {
        await expect(
          panel.getByRole("button", { name: `${level}단계`, exact: true }),
        ).toHaveCount(1);
      }
      await expect(
        panel.getByRole("button", { name: `${through + 1}단계`, exact: true }),
      ).toHaveCount(0);
      // 단계 선택지마다 예시 한 줄(그 줄은 단추 다음 칸)
      await expect(panel.locator("p")).toHaveCount(through + 1);
    }
    await page.getByRole("tab", { name: /^회화/ }).click();
    await page
      .locator('[data-level-area="talk"]')
      .getByRole("button", { name: `${TALK_CHOSEN}단계`, exact: true })
      .click();
    await expect(
      page.getByRole("tab", { name: `회화 · ${TALK_CHOSEN}단계` }),
    ).toBeVisible();
    await next(page).click();
    await next(page).click();
    await page.getByRole("button", { name: T.handoff }).click();
    await page.waitForURL((url) => url.pathname === "/");
  });
  const [talk] = await e2eDb()
    .select()
    .from(profileTracks)
    .where(eq(profileTracks.area, "talk"));
  expect(talk).toMatchObject({ level: TALK_CHOSEN, unit: 1 });
});

test("AC-1c 영어 이름 칸에 vocab 의 낱말을 넣으면 '토리가 부를 다른 영어 이름(별명)을 골라 주세요'가 보이고 다른 이름을 받는다", async ({
  page,
}) => {
  const [row] = await e2eDb().select({ word: vocab.word }).from(vocab).limit(1);
  const word = row?.word ?? "";
  await page.goto("/first-run");
  await fillPin(page);
  await page.getByLabel(T.displayName).fill("모모");
  await page.getByLabel(T.englishName).fill(word);
  await next(page).click();
  await expect(page.getByLabel(T.nickname)).toBeVisible();
  await expect(step(page)).toHaveAttribute("data-first-run-step", "name");
  // 별명도 vocab 낱말이면 받지 않고, 칸 아래 상태 줄에 까닭(4절 문장)을 보이며 칸을 표시한다
  await page.getByLabel(T.nickname).fill(word);
  await next(page).click();
  await expect(step(page)).toHaveAttribute("data-first-run-step", "name");
  await expect(
    page.getByRole("status").filter({ hasText: T.nickname }),
  ).toBeVisible();
  await expect(page.getByLabel(T.nickname)).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel(T.nickname).fill("Tori");
  await next(page).click();
  await finishFrom(page, "avatar");
  const [profile] = await e2eDb().select().from(profiles);
  expect(profile).toMatchObject({ englishName: word, toriNickname: "Tori" });
});

test("AC-1b 첫 실행에서 읽기 시작 단계를 3으로 고르면 읽기 카드는 배치 평가 없이 읽기 3단계 단원 1의 수업 1로 열리고 고르지 않은 쓰기 · 말하기 카드는 배치 평가로 열린다", async ({
  page,
}) => {
  const CHOSEN = 3;
  // 이 시험 동안의 AI 호출만 센다(앞 시험 · P11 가짜 AI e2e 의 행이 남아도 — 검토 review-p10-7-code M-5)
  const startedAt = new Date();
  await withHouseholdSetting(THROUGH_KEY, WIDE_THROUGH, async () => {
    // 시험용 시드는 1단계뿐 — 3단계 단원 1 수업을 1단계 내용으로 복제한다(정할 것 서, e2e 전용)
    await cloneLessons({
      area: "reading",
      fromLevel: 1,
      toLevel: CHOSEN,
      unit: 1,
    });
    await page.goto("/first-run");
    await fillPin(page);
    await page.getByLabel(T.displayName).fill("모모");
    await next(page).click();
    await expect(step(page)).toHaveAttribute("data-first-run-step", "avatar");
    await page.getByRole("button", { name: AVATARS[0].label }).click();
    await next(page).click();
    await page.getByRole("button", { name: T.alphabetKnown }).click();
    await next(page).click();
    await page.getByRole("button", { name: TOPIC_BUNDLES[0].label }).click();
    await next(page).click();
    await expect(step(page)).toHaveAttribute("data-first-run-step", "level");
    await page.getByRole("tab", { name: /^읽기/ }).click();
    await page
      .locator('[data-level-area="reading"]')
      .getByRole("button", { name: `${CHOSEN}단계`, exact: true })
      .click();
    await next(page).click();
    await expect(step(page)).toHaveAttribute("data-first-run-step", "mic");
    await next(page).click();
    await page.getByRole("button", { name: T.handoff }).click();
    await page.waitForURL((url) => url.pathname === "/");

    // 홈: 읽기 카드는 수업 목록, 고르지 않은 쓰기 · 말하기는 배치 평가로
    const card = (area: string) =>
      page
        .locator("a")
        .filter({ has: page.locator(`[data-home-card="${area}"]`) });
    await expect(card("reading")).toContainText(`${CHOSEN}단계`);
    await expect(card("reading")).toHaveAttribute("href", "/reading/lessons");
    for (const area of ["writing", "speaking"]) {
      await expect(card(area)).toHaveAttribute("href", `/${area}/placement`);
    }

    // 읽기 카드 → 수업 목록 → '여기부터 해요'(수업 1) → 그 수업의 세션
    await card("reading").click();
    await page.waitForURL((url) => url.pathname === "/reading/lessons");
    await expect(page.getByText(`${CHOSEN}단계 · 단원 1`)).toBeVisible();
    await expect(
      page.locator("[data-lesson-board][data-hydrated]"),
    ).toHaveCount(1);
    await page.locator('[data-lesson="assigned-1"]').click();
    await page.waitForURL((url) => url.pathname.startsWith("/session/"));
    const id = new URL(page.url()).pathname.split("/").at(-1) ?? "";
    const [session] = await e2eDb()
      .select({ lessonId: sessions.lessonId, level: sessions.level })
      .from(sessions)
      .where(eq(sessions.id, id));
    const [lesson] = await e2eDb()
      .select()
      .from(lessons)
      .where(eq(lessons.id, session?.lessonId ?? ""));
    expect(session?.level).toBe(CHOSEN);
    expect(lesson).toMatchObject({
      area: "reading",
      level: CHOSEN,
      unit: 1,
      kind: "assigned",
      lessonNo: 1,
    });
    // 첫 실행부터 세션 시작까지 AI 호출이 없다(AC-1b — 세션 모듈 정적 검사는 통합)
    expect(await countRows(aiCalls, gte(aiCalls.calledAt, startedAt))).toBe(0);
  });
});

test("AC-1c 고른 관심 주제 묶음의 주제 변형 수업이 열린다", async ({
  page,
}) => {
  // 시험용 시드는 변형 1 뿐 — 읽기 1단계 단원 1 의 변형 2 칸을 변형 1 내용으로 복제하고(정할 것 서, e2e 전용)
  // 제목 끝에 시험용 표시를 붙여 화면에서 구별한다. 끝나면 집 기록과 복제 칸을 지운다(다른 e2e 에 남지 않게)
  const VARIANT_MARK = " · 변형 시험";
  const db = e2eDb();
  const second = Number(TOPIC_BUNDLES[1].id);
  const first = Number(TOPIC_BUNDLES[0].id);
  const variantCells = and(
    eq(lessons.area, "reading"),
    eq(lessons.level, 1),
    eq(lessons.unit, 1),
    eq(lessons.topicVariant, second),
  );
  await cloneLessons({
    area: "reading",
    fromLevel: 1,
    unit: 1,
    fromVariant: first,
    toVariant: second,
  });
  for (const row of await db.select().from(lessons).where(variantCells)) {
    await db
      .update(lessons)
      .set({ listTitle: `${row.listTitle}${VARIANT_MARK}` })
      .where(eq(lessons.id, row.id));
  }
  /** 수업 목록에서 배정 1 을 열고 그 세션의 수업 칸을 돌려준다. */
  const openFirstLesson = async () => {
    await page.goto("/reading/lessons");
    await expect(
      page.locator("[data-lesson-board][data-hydrated]"),
    ).toHaveCount(1);
    const card = page.locator('[data-lesson="assigned-1"]');
    const title = (await card.textContent()) ?? "";
    await card.click();
    await page.waitForURL((url) => url.pathname.startsWith("/session/"));
    const id = new URL(page.url()).pathname.split("/").at(-1) ?? "";
    const [session] = await db
      .select({ lessonId: sessions.lessonId })
      .from(sessions)
      .where(eq(sessions.id, id));
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, session?.lessonId ?? ""));
    return { title, lesson };
  };
  try {
    // 첫 실행에서 둘째 주제 묶음을 고르고 읽기 시작 단계를 1 로
    await page.goto("/first-run");
    await fillPin(page);
    await page.getByLabel(T.displayName).fill("모모");
    await next(page).click();
    await expect(step(page)).toHaveAttribute("data-first-run-step", "avatar");
    await page.getByRole("button", { name: AVATARS[0].label }).click();
    await next(page).click();
    await page.getByRole("button", { name: T.alphabetKnown }).click();
    await next(page).click();
    await page.getByRole("button", { name: TOPIC_BUNDLES[1].label }).click();
    await next(page).click();
    await expect(step(page)).toHaveAttribute("data-first-run-step", "level");
    await page.getByRole("tab", { name: /^읽기/ }).click();
    await page
      .locator('[data-level-area="reading"]')
      .getByRole("button", { name: "1단계", exact: true })
      .click();
    await next(page).click();
    await next(page).click();
    await page.getByRole("button", { name: T.handoff }).click();
    await page.waitForURL((url) => url.pathname === "/");
    // 목록 제목과 열린 세션의 수업 칸이 둘째 묶음의 변형이다
    const chosen = await openFirstLesson();
    expect(chosen.title).toContain(VARIANT_MARK);
    expect(chosen.lesson).toMatchObject({
      kind: "assigned",
      lessonNo: 1,
      topicVariant: second,
    });

    // 반대쪽: 첫 묶음을 고른 집은 변형 1 을 연다
    await resetHousehold();
    await insertHousehold({
      startLevels: { reading: 1 },
      topicBundle: TOPIC_BUNDLES[0].id,
    });
    const other = await openFirstLesson();
    expect(other.title).not.toContain(VARIANT_MARK);
    expect(other.lesson).toMatchObject({
      kind: "assigned",
      lessonNo: 1,
      topicVariant: first,
    });
  } finally {
    await resetHousehold();
    await db.delete(lessons).where(variantCells);
  }
});
