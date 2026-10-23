// 쪽 확장자(next.config.ts pageExtensions — 선생님 화면 plan 값 16 · AC-19b 의 단위 몫). 관찰 쪽(page.preview.tsx — 음성 관찰 ·
// 선생님 관찰)은 Vercel 운영 배포(VERCEL_ENV=production) 빌드에 없고, 로컬 전용 화면(page.local.tsx)은 next dev 에서만 있다.
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";
import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig, { TEACHER_ASSET_CACHE } from "../../next.config";

afterEach(() => {
  vi.unstubAllEnvs();
});

const extensionsOf = (phase: string) => nextConfig(phase).pageExtensions ?? [];

describe("쪽 확장자(next.config pageExtensions)", () => {
  it("AC-19b 운영 배포 빌드(VERCEL_ENV=production)의 쪽 확장자에 preview.tsx 가 없어 관찰 쪽(/dev/teacher-probe)이 빠진다", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const extensions = extensionsOf(PHASE_PRODUCTION_BUILD);
    expect(extensions).not.toContain("preview.tsx");
    expect(extensions).not.toContain("local.tsx");
    expect(extensions).toEqual(expect.arrayContaining(["tsx", "ts"]));
  });

  it("AC-19b 프리뷰 배포 빌드(VERCEL_ENV=preview)에는 preview.tsx 가 있어 관찰 쪽이 들어가고 local.tsx 는 없다", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const extensions = extensionsOf(PHASE_PRODUCTION_BUILD);
    expect(extensions).toContain("preview.tsx");
    expect(extensions).not.toContain("local.tsx");
  });

  it("AC-19b next dev 에는 preview.tsx · local.tsx 가 다 있다", () => {
    vi.stubEnv("VERCEL_ENV", "");
    const extensions = extensionsOf(PHASE_DEVELOPMENT_SERVER);
    expect(extensions).toContain("preview.tsx");
    expect(extensions).toContain("local.tsx");
  });
});

describe("선생님 자산 캐시(next.config headers)", () => {
  it("AC-N12 회화 선생님 모델 · 초상(/teachers/)은 1년 바꾸지 않는 캐시 머리글이다(파일 이름에 내용 해시)", async () => {
    const rules = (await nextConfig(PHASE_PRODUCTION_BUILD).headers?.()) ?? [];
    const teachers = rules.find((r) => r.source === "/teachers/:path*");
    expect(teachers?.headers).toEqual([
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ]);
    expect(TEACHER_ASSET_CACHE).toBe("public, max-age=31536000, immutable");
  });
});
