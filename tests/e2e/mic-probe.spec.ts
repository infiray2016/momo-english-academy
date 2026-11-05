// 마이크 점검 쪽(/dev/mic-probe, 브리프 task-mic-probe 2026-11-06)이 접근 쿠키 뒤에서 뜨고 전략 단추 일곱 · '지금 눌러 말하기'(꺼짐) · 기록 복사 단추가 있다(fix 1 의 F · G).
// 실제 듣기 확인은 요청자 iPad 몫이다(이 시험은 가짜 음성으로 쪽이 뜨는지만 본다).
import { STRATEGIES } from "../../src/app/dev/mic-probe/probe-log";
import { MIC_TEXT } from "../../src/app/dev/mic-probe/probe-text";
import { expect, test } from "./fixtures";

test("마이크 점검 쪽이 뜨고 전략 단추 일곱과 기록 복사 단추가 있다", async ({
  page,
}) => {
  await page.goto("/dev/mic-probe");
  await expect(page.getByTestId("mic-probe")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.getByText(MIC_TEXT.guide)).toBeVisible();
  for (const strategy of STRATEGIES) {
    await expect(
      page.getByRole("button", { name: MIC_TEXT.strategy[strategy] }),
    ).toBeVisible();
  }
  // F · G 의 '지금 눌러 말하기'는 읽기 전에는 꺼져 있다
  await expect(
    page.getByRole("button", { name: MIC_TEXT.pressNow }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: MIC_TEXT.copy })).toBeVisible();
});
