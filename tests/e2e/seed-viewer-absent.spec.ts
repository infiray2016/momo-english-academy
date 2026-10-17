// 로컬 전용 시드 보기 화면이 운영 빌드(next build → next start)에 없는지 본다(plan-p05b 증명 표 AC-7f, 정할 것 아).
// 이 e2e 는 접근 쿠키를 갖고 시작한다(fixtures). 쿠키가 있어도 경로가 없어 404 다.
import { expect, test } from "./fixtures";

const VIEWER_PATH = "/dev/seed-viewer";

test("AC-7f 운영 빌드에서는 시드 보기 주소(/dev/seed-viewer)가 접근 쿠키가 있어도 404 다", async ({
  page,
}) => {
  const home = await page.goto("/");
  // 쿠키가 통한다(401 이 아니다)
  expect(home?.status()).toBe(200);
  const response = await page.goto(VIEWER_PATH);
  expect(response?.status()).toBe(404);
  const withFile = await page.goto(
    `${VIEWER_PATH}?file=${encodeURIComponent("lessons/reading/1/1.json")}`,
  );
  expect(withFile?.status()).toBe(404);
});
