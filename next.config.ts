import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  agentRules: false,
  // unauthorized() 로 페이지 · 서버 액션 · Route Handler 가 401 을 낸다(C55 (4), plan-p03b 공용 변경 1)
  experimental: { authInterrupts: true },
  turbopack: {
    root: import.meta.dirname,
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
