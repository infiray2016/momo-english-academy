// 마이크 점검 쪽(/dev/mic-probe, 브리프 task-mic-probe 2026-11-06)이 접근 쿠키 뒤에서 뜨고 '자동 W 라운드 2'(fix 8) · '자동 W 라운드'(fix 7) · 전략 단추 전부 · '지금 눌러 말하기'(꺼짐) · 지금 한 일 고르기 · 기록 복사 단추가 있다(fix 1 F · G, fix 2 H~M).
// 실제 듣기 확인은 요청자 iPad 몫이다(이 시험은 가짜 음성으로 쪽이 뜨는지만 본다).
import { BUTTON_STRATEGIES } from "../../src/app/dev/mic-probe/probe-log";
import { MIC_TEXT } from "../../src/app/dev/mic-probe/probe-text";
import { expect, test } from "./fixtures";

test("마이크 점검 쪽이 뜨고 전략 단추 전부와 지금 한 일 고르기 · 기록 복사 단추가 있다", async ({
  page,
}) => {
  await page.goto("/dev/mic-probe");
  await expect(page.getByTestId("mic-probe")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.getByText(MIC_TEXT.guide)).toBeVisible();
  // A 라운드(브리프 task-probe): '자동 A 라운드(받아 온 소리)' 단추(맨 위) · 안내 글 · 횟수 고르기(누르지 않는다 — 라운드는 요청자 iPad 몫).
  // 새로 연 쪽은 speechSynthesis 를 부른 적이 없어 새로 고침 안내가 없다
  await expect(
    page.getByRole("button", { name: MIC_TEXT.roundAStart, exact: true }),
  ).toBeEnabled();
  await expect(page.getByText(MIC_TEXT.roundAGuide)).toBeVisible();
  await expect(page.getByTestId("mic-round-a-count-3")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("mic-round-a-synth-used")).toHaveCount(0);
  // fix 8: '자동 W 라운드 2' 단추(맨 위)와 요청자 안내 글(누르지 않는다)
  await expect(
    page.getByRole("button", { name: MIC_TEXT.round2Start, exact: true }),
  ).toBeEnabled();
  await expect(page.getByText(MIC_TEXT.round2Guide)).toBeVisible();
  // fix 7: '자동 W 라운드' 단추와 요청자 안내 글(라운드는 요청자 iPad 몫이라 누르지 않는다)
  await expect(
    page.getByRole("button", { name: MIC_TEXT.roundStart, exact: true }),
  ).toBeEnabled();
  await expect(page.getByText(MIC_TEXT.roundGuide)).toBeVisible();
  for (const strategy of BUTTON_STRATEGIES) {
    await expect(
      page.getByRole("button", { name: MIC_TEXT.strategy[strategy] }),
    ).toBeVisible();
  }
  // F · G 의 '지금 눌러 말하기'는 읽기 전에는 꺼져 있다
  await expect(
    page.getByRole("button", { name: MIC_TEXT.pressNow }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: MIC_TEXT.copy })).toBeVisible();
  await expect(page.getByTestId("mic-reset")).toHaveValue("as-is");
});
