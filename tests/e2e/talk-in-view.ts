// 회화 화면의 자리 단언 · 가로로 연 수업의 사진(묶음 S5 — 화면 검토 task-des-s3-report 1.4 · C-1 · I-2, 정본 03 4절 94 · 97줄 · 15절 AC-26m).
// toBeVisible 은 넘침에 잘린 요소도 통과해서 '지금 말풍선이 기록 칸 아래로 가려짐'을 지나쳤다. 그래서 (1) 지금 턴([data-talk-log-now])의 아래 끝이
// 기록 칸([data-talk-log])의 보이는 상자 안에 있는지와 (2) 으뜸 단추가 쪽을 내리지 않아도 보는 창 안에 온전히 있는지를 잰다. 새 방식
// (talk-lead.spec) · 기존 방식(talk-log-follow.spec)이 함께 쓴다.
import type { Locator, Page } from "@playwright/test";
import { CHILD_VIEWPORTS } from "./child-size";
import { expect } from "./fixtures";
import { PHOTOS_DIR, PHOTOS_ENV } from "./photos";

/** 화소 반올림 여유(px, 시험 값). */
const SLACK_PX = 1;
const SETTLE_MS = 10_000;

/** 지금 턴의 아래 끝이 기록 칸의 보이는 상자 안에 있다(기록 칸이 넘친 뒤에도 — C-1). */
export async function expectNowInLog(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((slack) => {
          const log = document.querySelector("[data-talk-log]");
          const now = log?.querySelector("[data-talk-log-now]");
          if (!log || !now) return "기록 칸 · 지금 턴 없음";
          const box = log.getBoundingClientRect();
          const turn = now.getBoundingClientRect();
          return turn.bottom <= box.bottom + slack && turn.bottom >= box.top
            ? "in"
            : `지금 턴 아래 끝 ${turn.bottom} · 기록 칸 ${box.top}~${box.bottom}`;
        }, SLACK_PX),
      { timeout: SETTLE_MS },
    )
    .toBe("in");
}

/** 으뜸 단추가 쪽을 내리지 않아도 보는 창 안에 온전히 있다(I-2 — 앱이 스스로 옮긴 뒤). */
export async function expectInView(target: Locator): Promise<void> {
  await expect(target).toBeInViewport({ ratio: 1, timeout: SETTLE_MS });
}

/** 가로로 연 수업의 사진(돌려 찍기와 별도 — 화면 검토 1.3 · 1.4). E2E_PHOTOS 가 있을 때만 <이름>-landscape-opened.png. */
export async function openedLandscapePhoto(
  page: Page,
  name: string,
): Promise<void> {
  if (!process.env[PHOTOS_ENV]) return;
  await page.screenshot({
    path: `${PHOTOS_DIR}/${name}-landscape-opened.png`,
    fullPage: true,
  });
}

/** 수업을 가로로 연다(쪽을 열기 전에 — 기록 칸 상한 · 배치가 처음부터 가로). */
export async function openLandscape(page: Page): Promise<void> {
  await page.setViewportSize(CHILD_VIEWPORTS.landscape);
}
