import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/** 기본 쪽 확장자 넷. 목록을 바꾸면 proxy.ts · instrumentation 도 이 목록으로 잡힌다(P2b). */
const BASE_PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];
/** 관찰 페이지(page.preview.tsx)는 Vercel 운영 배포(VERCEL_ENV=production) 빌드에서만 뺀다(P2b, plan-p02 다-1). */
const PREVIEW_PAGE_EXTENSION = "preview.tsx";
/** 로컬 전용 화면(page.local.tsx, 시드 보기)은 next dev 에서만 넣는다. 프리뷰 · 운영 · 로컬 next build 에서 빠진다(P5b, AC-7f). */
const LOCAL_PAGE_EXTENSION = "local.tsx";
/**
 * 회화 선생님 모델 · 초상(public/teachers/ — 파일 이름에 내용 해시)은 1년 바꾸지 않는 캐시(선생님 화면 plan 값 15 · spec '제공' 행).
 * 내용이 바뀌면 이름이 바뀐다(teacher:reduce).
 */
export const TEACHER_ASSET_CACHE = "public, max-age=31536000, immutable";

export default function nextConfig(phase: string): NextConfig {
  const isProductionDeployment = process.env.VERCEL_ENV === "production";
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    reactCompiler: true,
    agentRules: false,
    // unauthorized() 로 페이지 · 서버 액션 · Route Handler 가 401 을 낸다(C55 (4), P3b)
    experimental: { authInterrupts: true },
    // 시드 목록은 빌드에 묶어 배포한다(5절). 서버 함수가 실행 때 읽는다 — plan-p09c 값 3. 키 '/*' 는 홈 '/' 에 걸리지 않아(차례 4 검토
    // X-1) 홈 응답 뒤 일(밀린 첨삭 · 회화 홈 진입 정리 — 끝맺음 검사가 읽는 금지어 · 형태 표)이 시드 목록을 못 읽는다 — 키 '/' 를 더한다.
    // 회화 선생님 명단(seed/teachers.json)도 같은 길이다(아이 화면 · 회화 서버 · 고르기 액션이 읽음 — 선생님 화면 plan 값 5)
    outputFileTracingIncludes: {
      "/": ["./seed/lists/**/*.json", "./seed/teachers.json"],
      "/*": ["./seed/lists/**/*.json", "./seed/teachers.json"],
    },
    headers: async () => [
      {
        source: "/teachers/:path*",
        headers: [{ key: "Cache-Control", value: TEACHER_ASSET_CACHE }],
      },
    ],
    pageExtensions: [
      ...BASE_PAGE_EXTENSIONS,
      ...(isProductionDeployment ? [] : [PREVIEW_PAGE_EXTENSION]),
      ...(isDevServer ? [LOCAL_PAGE_EXTENSION] : []),
    ],
    turbopack: {
      root: import.meta.dirname,
      rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
    },
  };
}
