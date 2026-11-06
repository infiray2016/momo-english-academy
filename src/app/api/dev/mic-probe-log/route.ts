// 마이크 점검 쪽(/dev/mic-probe)의 서버 로그 끝점 POST /api/dev/mic-probe-log(브리프 task-mic-probe fix 4). 요청자가 기록을 복사하지
// 않아도 컨트롤러가 배포 로그로 읽게, 받은 JSON 을 console.log 한 줄로만 남긴다(DB · 파일 쓰기 없음). 운영 배포(VERCEL_ENV=production)는
// 404(관찰 도구 — previewToolsAllowed, 접근 확인 뒤). 다른 API 와 같이 첫 일로 requireAccess()(쿠키 없으면 401), 같은 출처만(403), 본문 상한(413).
// 들은 글은 보내는 쪽이 길이만 보내고, 여기서도 글 칸을 길이로 바꿔 남긴다(redactLogBody — 아이 말 원문 · 이름을 로그에 남기지 않음).
import {
  LOG_BODY_MAX_CHARS,
  LOG_TAG,
  redactLogBody,
} from "@/app/dev/mic-probe/probe-log";
import { isSameOrigin, requireAccess } from "@/server/access/guard";
import { previewToolsAllowed } from "@/server/preview";

export const dynamic = "force-dynamic";

const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_TOO_LARGE = 413;

const empty = (status: number) => new Response(null, { status });

/** 본문 크기 머리글이 상한을 넘는가(본문을 읽기 전에 413 — 회화 턴 끝점과 같은 꼴). */
function declaredTooLarge(request: Request): boolean {
  const declared = Number(request.headers.get("content-length"));
  return Number.isFinite(declared) && declared > LOG_BODY_MAX_CHARS;
}

export async function POST(request: Request) {
  // 첫 문장은 접근 확인(모든 처리기의 규칙 — access-gate.test.ts AC-N5). 운영 배포는 그 뒤 404
  await requireAccess();
  if (!previewToolsAllowed()) return empty(HTTP_NOT_FOUND);
  if (!isSameOrigin(request)) return empty(HTTP_FORBIDDEN);
  if (declaredTooLarge(request)) return empty(HTTP_TOO_LARGE);
  const text = await request.text();
  if (text.length > LOG_BODY_MAX_CHARS) return empty(HTTP_TOO_LARGE);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return empty(HTTP_BAD_REQUEST);
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return empty(HTTP_BAD_REQUEST);
  }
  console.log(LOG_TAG, JSON.stringify(redactLogBody(body)));
  return empty(HTTP_NO_CONTENT);
}
