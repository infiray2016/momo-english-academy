// 홈('/') 요청 셈 도우미(UI · UX plan 묶음 0-마 · 정한 것 7 · 위험 8 · AC-23g '그 사이 홈 요청이 0회'). 필수 경로 나는 돌아가는 길이
// 홈을 거치지 않는지 잰다. 센다: '/' 문서 이동(주소창 · reload · 링크 전체 이동)과 '/' 의 RSC 요청(router.push('/') · Link 누름 — 머리 rsc).
// 세지 않는다: Next 의 미리 읽기(머리 next-router-prefetch · next-router-segment-prefetch — 보이는 '홈' 링크를 Link 가 미리 읽는다)와
// 서버 액션(머리 next-action — 그 쪽 주소로 POST). 머리 이름은 설치된 next 16.4 의 app-router-headers 값 그대로다.
// 가름(isHomeVisit)은 순수 함수라 tests/unit/required-e2e-helpers.test.ts 가 잠근다. 이 파일은 Playwright 형만 가져온다(값 없음).
import type { Page, Request } from "@playwright/test";

/** 요청 하나의 사실(Playwright Request 에서 뽑음 — 머리 이름은 소문자). */
export type RequestFacts = {
  url: string;
  navigation: boolean;
  resourceType: string;
  headers: Record<string, string>;
};

const HOME_PATH = "/";
const RSC_HEADER = "rsc";
const PREFETCH_HEADERS = [
  "next-router-prefetch",
  "next-router-segment-prefetch",
] as const;
const ACTION_HEADER = "next-action";

/** 홈('/')으로 가는 요청인가(순수): 문서 이동이거나 미리 읽기 · 서버 액션이 아닌 RSC 요청. */
export function isHomeVisit(r: RequestFacts): boolean {
  if (new URL(r.url).pathname !== HOME_PATH) return false;
  const headers = Object.fromEntries(
    Object.entries(r.headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  if (headers[ACTION_HEADER] !== undefined) return false;
  if (r.navigation && r.resourceType === "document") return true;
  if (headers[RSC_HEADER] === undefined) return false;
  return PREFETCH_HEADERS.every((h) => headers[h] === undefined);
}

function factsOf(request: Request): RequestFacts {
  return {
    url: request.url(),
    navigation: request.isNavigationRequest(),
    resourceType: request.resourceType(),
    headers: request.headers(),
  };
}

/** 지켜보는 동안 센 홈 요청. */
export type HomeWatch = {
  /** 센 홈 요청 주소(차례대로). 경로 내내 빈 배열이어야 한다. */
  visits(): string[];
  /** 지켜보기를 그친다(시험 끝에 — 그 뒤 '홈' 누름은 세지 않음). */
  stop(): string[];
};

/**
 * 그 쪽의 홈 요청을 지금부터 센다. 시험은 경로를 시작하기 직전(첫 화면을 연 뒤)에 걸고 끝에 `expect(watch.stop()).toEqual([])` 꼴로
 * '경로 내내 0회'를 단언한다.
 */
export function watchHomeRequests(page: Page): HomeWatch {
  const seen: string[] = [];
  const onRequest = (request: Request) => {
    if (isHomeVisit(factsOf(request))) seen.push(request.url());
  };
  page.on("request", onRequest);
  return {
    visits: () => [...seen],
    stop: () => {
      page.off("request", onRequest);
      return [...seen];
    },
  };
}
