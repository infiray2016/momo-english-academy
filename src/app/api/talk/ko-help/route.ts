// 수업 안 한국어 질문 끝점 POST /api/talk/ko-help(수업 안 한국어로 묻기 plan 정한 것 5 · 접점 다, spec 설계 4 입력 문단).
// 회화 턴 끝점(api/talk/turn)과 같은 차례로 앞머리를 본다: 첫 문장 requireAccess()(쿠키 없으면 401), 같은 출처만(403), 본문 크기 상한(413),
// JSON 이 아니면 400. 그 뒤는 한국어 질문 길(server/conversation/ko-help.ts)이고 JSON 한 번으로 답한다(흘려 받지 않는다).
// 응답 { t: "ok", help } · { t: "resting" } · { t: "stale" } · { t: "off" } · { t: "error" }. 오류는 이름만 남긴다(아이 글 없음, AC-N27).
import type { NextRequest } from "next/server";
import { isSameOrigin, requireAccess } from "@/server/access/guard";
import { now } from "@/server/clock";
import {
  type KoHelpReply,
  runTalkKoHelpRequest,
} from "@/server/conversation/ko-help";

export const dynamic = "force-dynamic";
// 함수 실행 시간 상한(maxDuration)은 두지 않는다: 한 번 호출(흘려 받지 않음)이라 같은 실시간 호출을 하는 서버 액션(힌트 · 말하기 평가)과 같은
// 배포 기본값을 쓴다. 회화 턴 끝점의 60 은 흘려 보내며 호출이 둘일 수 있어서다(설계 숫자 대조 상한 49 — 보고 8절).

/** 요청 본문 글자 수 상한(기술 값 — 회화 턴 끝점과 같다. 한국어 질문 한 번 + 듣기 요약보다 넉넉히). */
const BODY_MAX_CHARS = 4000;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_LARGE = 413;
const HTTP_BAD_REQUEST = 400;

const json = (body: KoHelpReply, status?: number) =>
  new Response(JSON.stringify(body), {
    ...(status === undefined ? {} : { status }),
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

/** 본문 크기 머리글이 상한을 넘는가(본문을 읽기 전에 413). 머리글이 없거나 수가 아니면 읽은 뒤 다시 센다. */
function declaredTooLarge(request: Request): boolean {
  const declared = Number(request.headers.get("content-length"));
  return Number.isFinite(declared) && declared > BODY_MAX_CHARS;
}

export async function POST(request: NextRequest) {
  await requireAccess();
  if (!isSameOrigin(request)) return json({ t: "error" }, HTTP_FORBIDDEN);
  if (declaredTooLarge(request)) return json({ t: "error" }, HTTP_TOO_LARGE);
  const text = await request.text();
  if (text.length > BODY_MAX_CHARS) return json({ t: "error" }, HTTP_TOO_LARGE);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ t: "error" }, HTTP_BAD_REQUEST);
  }
  try {
    return json(await runTalkKoHelpRequest(body, { now }));
  } catch (error) {
    console.error(
      `한국어 질문 끝점 실패(${error instanceof Error ? error.name : "Error"})`,
    );
    return json({ t: "error" });
  }
}
