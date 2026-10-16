// e2e 도우미: 유효한 가족 접근 쿠키를 브라우저 문맥에 넣는다(plan-p03b 파일별 값 12, P2 · P10 이 같이 씀).
// 열쇠는 playwright.config 가 실행 때 만든 E2E_ACCESS_CODE_HASH 이고, e2e 서버의 ACCESS_CODE_HASH 와 같다.
// src/core/access-token.ts 는 server-only 가 없는 순수 모듈이라 Playwright 에서 바로 읽힌다.
import type { BrowserContext } from "@playwright/test";
import {
  ACCESS_COOKIE_NAME,
  issueAccessToken,
} from "../../src/core/access-token";

/** 시험 쿠키 유효 시간(기술 값, 한 번의 e2e 실행보다 길면 된다). */
const E2E_COOKIE_TTL_SECONDS = 60 * 60;
const NONCE_BYTES = 16;

export async function addAccessCookie(
  context: BrowserContext,
  baseURL: string | undefined,
): Promise<void> {
  const keyMaterial = process.env.E2E_ACCESS_CODE_HASH;
  if (!keyMaterial) {
    throw new Error(
      "E2E_ACCESS_CODE_HASH 가 없습니다. playwright.config 가 실행 때 만든다",
    );
  }
  if (!baseURL) throw new Error("baseURL 이 없습니다");
  const token = await issueAccessToken({
    keyMaterial,
    now: new Date(),
    ttlSeconds: E2E_COOKIE_TTL_SECONDS,
    nonce: crypto.getRandomValues(new Uint8Array(NONCE_BYTES)),
  });
  await context.addCookies([
    {
      name: ACCESS_COOKIE_NAME,
      value: token,
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
