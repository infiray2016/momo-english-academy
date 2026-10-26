import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  agentRules: false,
  turbopack: {
    root: import.meta.dirname,
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
