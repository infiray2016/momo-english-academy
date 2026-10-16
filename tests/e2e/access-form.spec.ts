// 접근 코드 폼의 응답별 문구 · 동작(4절 접근 코드 행 · C57 · 7절 네트워크 행, plan-p03b 값 8, 검토 M-4).
// 제출 끝점은 page.route 로 흉내 내므로 DB 가 필요 없다.
import { expect, type Page, test } from "@playwright/test";

const SUBMIT_ROUTE = "**/access/submit";
const ACCESS_LABEL = "가족 접근 코드";
const ACCESS_BUTTON = "들어가기";
const MESSAGES = {
  wrong: "코드가 맞지 않아요. 다시 넣어 주세요",
  locked: "잠시 뒤에 다시 넣어 주세요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  other: "지금은 들어갈 수 없어요. 잠시 뒤에 다시 해 주세요",
} as const;
/** 견본 입력(접근 코드 꼴만 맞춘 가짜, 끝점은 흉내다). */
const SAMPLE_CODE = "SampleCode0000";

async function openForm(page: Page) {
  const response = await page.goto("/access");
  expect(response?.status()).toBe(401);
  return page.getByLabel(ACCESS_LABEL);
}

async function submitWith(
  page: Page,
  respond: Parameters<Page["route"]>[1],
): Promise<number> {
  let calls = 0;
  await page.route(SUBMIT_ROUTE, async (route, request) => {
    calls += 1;
    await respond(route, request);
  });
  const input = await openForm(page);
  await input.fill(SAMPLE_CODE);
  await page.getByRole("button", { name: ACCESS_BUTTON }).click();
  return calls;
}

test("접근 코드 폼: 틀리면(401) 틀림 문구를 보이고 입력칸을 비운 뒤 초점을 돌린다", async ({
  page,
}) => {
  await submitWith(page, (route) =>
    route.fulfill({ status: 401, json: { result: "wrong" } }),
  );
  await expect(page.getByRole("status")).toHaveText(MESSAGES.wrong);
  const input = page.getByLabel(ACCESS_LABEL);
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
});

test("접근 코드 폼: 잠기면(429) 잠김 문구를 보이고 남은 분을 보이지 않는다", async ({
  page,
}) => {
  await submitWith(page, (route) =>
    route.fulfill({
      status: 429,
      json: { result: "locked" },
      headers: { "retry-after": "900" },
    }),
  );
  await expect(page.getByRole("status")).toHaveText(MESSAGES.locked);
  await expect(page.getByLabel(ACCESS_LABEL)).toBeFocused();
});

test("접근 코드 폼: 그 밖(503)은 '지금은 들어갈 수 없어요' 문구다", async ({
  page,
}) => {
  await submitWith(page, (route) =>
    route.fulfill({ status: 503, json: { result: "not_configured" } }),
  );
  await expect(page.getByRole("status")).toHaveText(MESSAGES.other);
  await expect(page.getByLabel(ACCESS_LABEL)).toBeFocused();
});

test("접근 코드 폼: 연결이 끊기면 끊김 문구다", async ({ page }) => {
  await submitWith(page, (route) => route.abort("internetdisconnected"));
  await expect(page.getByRole("status")).toHaveText(MESSAGES.offline);
  await expect(page.getByLabel(ACCESS_LABEL)).toBeFocused();
});

test("접근 코드 폼: 맞으면(204) 홈으로 간다", async ({ page }) => {
  const calls = await submitWith(page, (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.waitForURL((url) => url.pathname === "/");
  expect(calls).toBe(1);
});

test("접근 코드 폼: 빈 칸(공백만 포함)이면 요청 없이 입력칸에 초점만 둔다", async ({
  page,
}) => {
  let calls = 0;
  await page.route(SUBMIT_ROUTE, async (route) => {
    calls += 1;
    await route.fulfill({ status: 401, json: { result: "wrong" } });
  });
  const input = await openForm(page);
  for (const value of ["", "   "]) {
    await input.fill(value);
    await page.getByRole("button", { name: ACCESS_BUTTON }).click();
    await expect(input).toBeFocused();
    await expect(page.getByRole("status")).toHaveText("");
  }
  expect(calls).toBe(0);
});
