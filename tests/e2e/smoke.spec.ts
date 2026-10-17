import { expect, test } from "@playwright/test";
import { TABLET_10_9_VIEWPORT } from "../../playwright.config";
import { PIN_LENGTH } from "../../src/core/profile/start";
import { addAccessCookie } from "./access-cookie";
import { closeE2eDb, resetHousehold } from "./db";
import { insertHousehold } from "./household";

/** 4절 접근 코드 화면 문구(C57). */
const ACCESS_TITLE = "부모님이 코드를 넣어 주세요";
const ACCESS_LABEL = "가족 접근 코드";
const ACCESS_BUTTON = "들어가기";
/** 첫 실행 첫 화면 제목(C72). 프로필이 없으면 홈 대신 첫 실행으로 간다(plan-p10a 공용 변경 8). */
const FIRST_RUN_PIN_TITLE = `부모님 PIN ${PIN_LENGTH}자리를 정해 주세요`;

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

/** 이 환경 변수가 있으면 접근 코드 화면 사진을 그 경로에 남긴다(화면 검토용, plan-p03b 작업 6). */
const SCREENSHOT_ENV = "E2E_ACCESS_SCREENSHOT";

test("AC-1a · AC-N5 쿠키 없이 홈을 열면 401 과 접근 코드 화면('부모님이 코드를 넣어 주세요')이 10.9형 화면에 ko 로 열린다", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(401);
  expect(response?.headers()["www-authenticate"]).toBeUndefined();
  expect(page.viewportSize()).toEqual(TABLET_10_9_VIEWPORT);
  expect(
    await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    })),
  ).toEqual(TABLET_10_9_VIEWPORT);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    ACCESS_TITLE,
  );
  const input = page.getByLabel(ACCESS_LABEL);
  await expect(input).toHaveAttribute("type", "password");
  await expect(input).toHaveAttribute("autocomplete", "off");
  await expect(page.getByRole("button", { name: ACCESS_BUTTON })).toHaveCount(
    1,
  );
  await expect(page.getByRole("button")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("");
  // 주소는 다시 쓴 그대로(/)다
  expect(new URL(page.url()).pathname).toBe("/");
  const screenshotPath = process.env[SCREENSHOT_ENV];
  if (screenshotPath) {
    await page.screenshot({ path: screenshotPath });
    // 입력칸에 초점이 있는 장면(초점 고리 검토용)은 같은 이름 끝에 -focus 를 붙여 남긴다
    await input.focus();
    await page.screenshot({
      path: screenshotPath.replace(/\.png$/, "-focus.png"),
    });
  }
});

test("AC-1a 유효한 접근 쿠키가 있는 기기는 접근 코드 화면 없이 홈이 열린다", async ({
  page,
  context,
  baseURL,
}) => {
  await addAccessCookie(context, baseURL);
  // 프로필이 없으면 홈 대신 첫 실행(/first-run)으로 간다
  const first = await page.goto("/");
  expect(first?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe("/first-run");
  await expect(
    page.getByRole("heading", { level: 1, name: FIRST_RUN_PIN_TITLE }),
  ).toBeVisible();
  await expect(page.getByText(ACCESS_TITLE)).toHaveCount(0);
  // 프로필이 있으면 홈이 열린다
  await insertHousehold();
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByText(ACCESS_TITLE)).toHaveCount(0);
  // 쿠키가 있는 기기가 /access 를 열면 홈으로 간다
  await page.goto("/access");
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByText(ACCESS_TITLE)).toHaveCount(0);
});

test("AC-N5 쿠키 없이 /api 요청과 서버 액션 꼴 POST 는 401 이다", async ({
  request,
}) => {
  const api = await request.get("/api/anything");
  expect(api.status()).toBe(401);
  expect(api.headers()["www-authenticate"]).toBeUndefined();
  const action = await request.post("/", {
    headers: { "next-action": "0123456789abcdef" },
    data: "[]",
  });
  expect(action.status()).toBe(401);
  expect(action.headers()["www-authenticate"]).toBeUndefined();
});
