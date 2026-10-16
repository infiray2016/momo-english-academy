import type { NextConfig } from "next";

// 관찰 페이지(page.preview.tsx)는 Vercel 운영 배포(VERCEL_ENV=production) 빌드에서 뺀다. 로컬 · 프리뷰 빌드는 넣는다.
const isProductionDeployment = process.env.VERCEL_ENV === "production";

const nextConfig: NextConfig = {
  reactCompiler: true,
  agentRules: false,
  // 목록을 바꾸면 기본 넷도 적어야 한다(proxy.ts · instrumentation 은 기본 확장자로 잡힌다).
  pageExtensions: isProductionDeployment
    ? ["tsx", "ts", "jsx", "js"]
    : ["tsx", "ts", "jsx", "js", "preview.tsx"],
  // unauthorized() 로 페이지 · 서버 액션 · Route Handler 가 401 을 낸다(C55 (4), plan-p03b 공용 변경 1)
  experimental: { authInterrupts: true },
  turbopack: {
    root: import.meta.dirname,
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
