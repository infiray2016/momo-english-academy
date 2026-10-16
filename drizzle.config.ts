import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./src/db/schema/content.ts",
    "./src/db/schema/learning.ts",
    "./src/db/schema/operations.ts",
  ],
  out: "./drizzle",
  // migrate 만 쓴다. 세션 풀러(5432) 주소다. 트랜잭션 풀러는 prepared statement 를 받지 않는다(10절 · 위험 2)
  dbCredentials: { url: process.env.MIGRATION_DATABASE_URL ?? "" },
  migrations: { table: "__drizzle_migrations", schema: "drizzle" },
  strict: true,
  verbose: true,
});
