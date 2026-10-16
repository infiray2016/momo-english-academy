import "server-only";

// 함수 안 접근 확인 · Cron 확인 · 요청 도우미(10절 접근 제어 · NFR-5, plan-p03b 파일별 값 4, C55 (4) · (8)).
// 모든 서버 액션 · Route Handler 의 첫 문장은 `await requireAccess()` 다(접근 코드 제출 끝점과 Cron 만 예외).
// Cron 처리기(/api/cron/ 아래)의 첫 문장은 `requireCron(request)` 다.
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { unauthorized } from "next/navigation";
import {
  ACCESS_COOKIE_NAME,
  accessKeyMaterial,
  verifyAccessToken,
} from "@/core/access-token";
import { now } from "@/server/clock";

const UNKNOWN_IP = "unknown";
const BEARER_PREFIX = "Bearer ";

/** 요청의 접근 쿠키가 지금 유효하면 true. ACCESS_CODE_HASH 가 없으면 언제나 false(닫힌 쪽). */
export async function hasValidAccess(): Promise<boolean> {
  const store = await cookies();
  return verifyAccessToken(store.get(ACCESS_COOKIE_NAME)?.value, {
    keyMaterial: accessKeyMaterial(process.env),
    now: now(),
  });
}

/** 접근 쿠키가 없거나 무효면 unauthorized()(401). */
export async function requireAccess(): Promise<void> {
  if (!(await hasValidAccess())) unauthorized();
}

/** Authorization 이 `Bearer <CRON_SECRET>` 과 다르거나 CRON_SECRET 이 비면 unauthorized()(401). */
export function requireCron(request: Request): void {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (!secret) unauthorized();
  const expected = Buffer.from(`${BEARER_PREFIX}${secret}`);
  const actual = Buffer.from(header);
  // 길이가 같을 때만 상수 시간 비교를 한다(timingSafeEqual 은 길이가 다르면 던진다)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    unauthorized();
  }
}

/** x-real-ip → x-forwarded-for 의 첫 값 → "unknown". Vercel 은 이 머리글을 덮어써 위조를 막는다. */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || UNKNOWN_IP;
}

/** 접근 쿠키 속성. Secure 는 https 요청일 때만 켠다. 쓸 때마다 늘리지 않는다(C55 (6)). */
export function accessCookieOptions({
  maxAgeSeconds,
  secure,
}: {
  maxAgeSeconds: number;
  secure: boolean;
}) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
    secure,
  };
}

/** Origin 머리글이 있고 그 host 가 Host 머리글과 같을 때만 true. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
