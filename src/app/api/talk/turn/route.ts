// 회화 턴 끝점 POST /api/talk/turn(plan-p13b 파일별 값 5 · 13절 C92 · a 정할 것 회6, 10절 '회화 스트리밍 포함').
// 첫 문장 requireAccess()(쿠키 없으면 401), 같은 출처만(403), 본문 크기 상한(413). 줄마다 JSON 한 줄(NDJSON)을 바로 흘려 보낸다 —
// 검사를 지난 토리 문장(s) · 뜻(ko) · 앱이 붙일 말(add) · 끝 줄(end · resting · break · close · stale · error). 브라우저 연결이 닫혀도
// 쓰기 실패를 삼키고 턴 길은 응답을 끝까지 받아 토리 행을 저장한다(a2 M1 계약). 오류는 이름만 남긴다(아이 글 없음).
import { after, type NextRequest } from "next/server";
import { stageTimingsLine } from "@/core/conversation/timing";
import { isSameOrigin, requireAccess } from "@/server/access/guard";
import { now } from "@/server/clock";
import type { TalkLine } from "@/server/conversation";
import { runTalkTurnRequest } from "@/server/conversation/turn";

export const dynamic = "force-dynamic";
/** 회화 턴 기다림(ai.timeout_seconds.realtime 의 두 배) + 저장보다 넉넉히(초, 기술 값 — 배포 설정 칸이라 상수). */
export const maxDuration = 60;

/** 요청 본문 글자 수 상한(기술 값 — 아이 말 한 턴 + 칸들보다 넉넉히). */
const BODY_MAX_CHARS = 4000;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_LARGE = 413;
const HTTP_BAD_REQUEST = 400;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

/** 본문 크기 머리글이 상한을 넘는가(본문을 읽기 전에 413 — 검토 M-3). 머리글이 없거나 수가 아니면 읽은 뒤 다시 센다. */
function declaredTooLarge(request: Request): boolean {
  const declared = Number(request.headers.get("content-length"));
  return Number.isFinite(declared) && declared > BODY_MAX_CHARS;
}

export async function POST(request: NextRequest) {
  await requireAccess();
  if (!isSameOrigin(request)) return json({ t: "error" }, HTTP_FORBIDDEN);
  if (declaredTooLarge(request)) return json({ t: "error" }, HTTP_TOO_LARGE);
  const received = now();
  const text = await request.text();
  if (text.length > BODY_MAX_CHARS) return json({ t: "error" }, HTTP_TOO_LARGE);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ t: "error" }, HTTP_BAD_REQUEST);
  }
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let open = true;
  const write = (line: TalkLine) => {
    if (!open) return;
    // 줄마다 바로 보낸다. 브라우저가 끊으면 쓰기가 실패하는데 삼키고 턴 길은 끝까지 간다(a2 M1 계약)
    writer.write(encoder.encode(`${JSON.stringify(line)}\n`)).catch(() => {
      open = false;
    });
  };
  const done = runTalkTurnRequest(body, {
    now,
    write,
    requestReceivedAt: received,
    // AI 를 부르기 전 구간마다 준비 시간(13절 C125 (4)) — 구간 이름과 ms 만 남긴다
    onPrepTimings: (timings) => {
      console.info(`회화 턴 준비 시간 ${stageTimingsLine(timings)}`);
    },
  })
    .catch((error: unknown) => {
      console.error(
        `회화 턴 끝점 실패(${error instanceof Error ? error.name : "Error"})`,
      );
      write({ t: "error" });
    })
    .finally(() => {
      open = false;
      writer.close().catch(() => {
        // 이미 닫힘 · 끊김
      });
    });
  // 응답 스트림이 끊겨도 턴 저장(토리 행)이 함수 수명 안에서 끝나게 약속을 넘긴다(검토 M-4)
  after(done);
  return new Response(readable, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
