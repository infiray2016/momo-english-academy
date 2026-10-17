import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  agentRules: false,
  // 시드 목록은 빌드에 묶어 배포한다(5절). 서버 함수가 실행 때 읽는다 — plan-p09c 값 3
  outputFileTracingIncludes: { "/*": ["./seed/lists/**/*.json"] },
  turbopack: {
    root: import.meta.dirname,
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
