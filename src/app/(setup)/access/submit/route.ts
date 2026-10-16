// 가족 접근 코드 제출 끝점 POST /access/submit(10절 접근 제어, plan-p03b 파일별 값 9, C55 (7)).
// 쿠키 없는 기기가 쓰는 유일한 입구라 첫 문장 requireAccess() 를 두지 않는다(함수 안 확인 훑기의 허용 목록).
// 서버 액션이 아닌 까닭: 다시 쓴 화면의 주소가 / 라서 서버 액션 POST 는 proxy 가 401 로 막는다(plan-p03b 위험 3).
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ACCESS_CODE_MAX_LENGTH,
  ACCESS_COOKIE_NAME,
} from "@/core/access-token";
import { submitAccessCode } from "@/server/access/attempts";
import {
  accessCookieOptions,
  clientIp,
  isSameOrigin,
} from "@/server/access/guard";
import { now } from "@/server/clock";
import { SettingMissingError } from "@/server/settings";

const bodySchema = z.object({ code: z.string().max(ACCESS_CODE_MAX_LENGTH) });
const HTTPS = "https:";

const notConfigured = () =>
  NextResponse.json({ result: "not_configured" }, { status: 503 });

export async function POST(request: NextRequest) {
  // 다른 사이트가 아이 기기 브라우저로 틀린 코드를 보내 잠그게 하지 못하게 같은 출처만 받는다(위험 9)
  if (!isSameOrigin(request)) {
    return NextResponse.json({ result: "forbidden" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ result: "invalid" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ result: "invalid" }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof submitAccessCode>>;
  try {
    result = await submitAccessCode({
      code: parsed.data.code.trim(),
      ip: clientIp(request.headers),
      now: now(),
    });
  } catch (error) {
    if (error instanceof SettingMissingError) {
      console.error(`접근 코드 제출: 설정 ${error.key} 가 없습니다`);
      return notConfigured();
    }
    throw error;
  }

  switch (result.kind) {
    case "ok": {
      const response = new NextResponse(null, { status: 204 });
      response.cookies.set(
        ACCESS_COOKIE_NAME,
        result.token,
        accessCookieOptions({
          maxAgeSeconds: result.maxAgeSeconds,
          secure: request.nextUrl.protocol === HTTPS,
        }),
      );
      return response;
    }
    case "wrong":
      return NextResponse.json({ result: "wrong" }, { status: 401 });
    case "locked":
      return NextResponse.json(
        { result: "locked" },
        {
          status: 429,
          headers: { "retry-after": String(result.retryAfterSeconds) },
        },
      );
    case "not_configured":
      console.error(
        "접근 코드 제출: ACCESS_CODE_HASH 가 없거나 풀리지 않습니다",
      );
      return notConfigured();
  }
}
