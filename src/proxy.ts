// 요청 거르기(10절 접근 제어 · NFR-5 · AC-N5, plan-p03b 파일별 값 5, C55 (4) · (7) · (8) · C57).
// 쿠키를 읽는 낙관적 확인만 한다. DB · 설정 · argon2 를 가져오지 않는다(의존 규칙 proxy-stays-light).
// 401 페이지는 proxy 가 아니라 /access 페이지가 unauthorized() 로 낸다(proxy 는 다시 쓰기만 한다).
// 서버 액션 · Route Handler 는 이 거르기와 따로 첫 문장 requireAccess() 로 다시 확인한다.
import { type NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  accessKeyMaterial,
  verifyAccessToken,
} from "@/core/access-token";
import { now } from "@/server/clock";

const ACCESS_PATH = "/access";
/** 쿠키 없이 넘기는 경로. 접근 코드 화면과 그 제출 끝점. */
const PUBLIC_PATHS = new Set([ACCESS_PATH, "/access/submit"]);
/** Cron 경로 접두. 처리기 첫 문장 requireCron 이 확인한다(C55 (8)). */
const CRON_PREFIX = "/api/cron/";
const API_PATH = "/api";
const PAGE_METHODS = new Set(["GET", "HEAD"]);
const ACTION_HEADER = "next-action";

let warnedMissingKey = false;

function isApiPath(pathname: string): boolean {
  return pathname === API_PATH || pathname.startsWith(`${API_PATH}/`);
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isServerAction = request.headers.has(ACTION_HEADER);
  // 공개 경로라도 서버 액션 호출(next-action)은 넘기지 않는다. 접근 코드 화면은 서버 액션을 쓰지 않는다(깊이 방어, 검토 M-1)
  if (
    !isServerAction &&
    (PUBLIC_PATHS.has(pathname) || pathname.startsWith(CRON_PREFIX))
  ) {
    return NextResponse.next();
  }

  const keyMaterial = accessKeyMaterial(process.env);
  if (!keyMaterial && !warnedMissingKey) {
    warnedMissingKey = true;
    console.error("ACCESS_CODE_HASH 가 없어 모든 접근 쿠키를 거부합니다");
  }
  const valid = await verifyAccessToken(
    request.cookies.get(ACCESS_COOKIE_NAME)?.value,
    { keyMaterial, now: now() },
  );
  // 이미 등록된 기기는 잠금과 관계없이 쓴다(잠금 상태를 보지 않는다)
  if (valid) return NextResponse.next();

  const isPageRequest =
    PAGE_METHODS.has(request.method) && !isServerAction && !isApiPath(pathname);
  if (isPageRequest) {
    return NextResponse.rewrite(new URL(ACCESS_PATH, request.url));
  }
  // 서버 액션 POST · /api · 그 밖 메서드. 브라우저 인증 창을 띄우지 않게 WWW-Authenticate 를 붙이지 않는다
  return new NextResponse(null, { status: 401 });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest|woff2?)$).*)",
  ],
};
