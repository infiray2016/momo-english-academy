import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/** 기본 쪽 확장자 넷. 목록을 바꾸면 proxy.ts · instrumentation 도 이 목록으로 잡힌다(P2b). */
const BASE_PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];
/** 관찰 페이지(page.preview.tsx)는 Vercel 운영 배포(VERCEL_ENV=production) 빌드에서만 뺀다(P2b, plan-p02 다-1). */
const PREVIEW_PAGE_EXTENSION = "preview.tsx";
/** 로컬 전용 화면(page.local.tsx, 시드 보기)은 next dev 에서만 넣는다. 프리뷰 · 운영 · 로컬 next build 에서 빠진다(P5b, AC-7f). */
const LOCAL_PAGE_EXTENSION = "local.tsx";

export default function nextConfig(phase: string): NextConfig {
  const isProductionDeployment = process.env.VERCEL_ENV === "production";
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    reactCompiler: true,
    agentRules: false,
    // unauthorized() 로 페이지 · 서버 액션 · Route Handler 가 401 을 낸다(C55 (4), P3b)
    experimental: { authInterrupts: true },
    // 시드 목록은 빌드에 묶어 배포한다(5절). 서버 함수가 실행 때 읽는다 — plan-p09c 값 3
    outputFileTracingIncludes: { "/*": ["./seed/lists/**/*.json"] },
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
