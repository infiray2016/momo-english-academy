// 쪽 확장자(next.config.ts pageExtensions — 선생님 화면 plan 값 16 · AC-19b 의 단위 몫). 관찰 쪽(page.preview.tsx — 음성 관찰 ·
// 선생님 관찰)은 Vercel 운영 배포(VERCEL_ENV=production) 빌드에 없고, 로컬 전용 화면(page.local.tsx)은 next dev 에서만 있다.

import { readdirSync } from "node:fs";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { afterEach, describe, expect, it, vi } from "vitest";
import { teacherAssetPath } from "@/core/seed/check-teacher";
import {
  TEACHER_ASSET_DIR,
  TEACHER_ASSET_HASH_CHARS,
  TEACHER_KEY,
} from "@/core/seed/structure";
import nextConfig, {
  TEACHER_ASSET_CACHE,
  TEACHER_ASSET_SOURCE,
} from "../../next.config";

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
    const teachers = rules.find((r) => r.source === TEACHER_ASSET_SOURCE);
    expect(teachers?.headers).toEqual([
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ]);
    expect(TEACHER_ASSET_CACHE).toBe("public, max-age=31536000, immutable");
  });

  it("AC-N12 1년 캐시는 해시 이름(<키>.<SHA-256 앞 8자>.<vrm|webp>)에만 붙고 해시 없는 이름에는 붙지 않는다(Next 의 경로 맞춤으로 맞춰 봄)", () => {
    // Next 가 머리글 source 를 맞추는 것과 같은 함수(path-to-regexp — 매개변수 정규식이 받아들여지는지도 여기서 던짐으로 드러남)
    const match = getPathMatch(TEACHER_ASSET_SOURCE, { strict: true });
    const hits = (path: string) => match(path) !== false;
    // 키 꼴 · 글자 수는 명단 꼴과 한 곳(structure.ts)
    expect(TEACHER_KEY.source).toBe("^[a-z]+$");
    expect(TEACHER_ASSET_HASH_CHARS).toBe(8);
    const sha =
      "9c5152a7e0d1f2a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b";
    for (const ext of ["vrm", "webp"] as const) {
      expect(hits(`/${teacherAssetPath("mina", sha, ext)}`), ext).toBe(true);
    }
    // 지금 public/teachers 의 파일은 모두 해시 이름이라 붙는다
    const files = readdirSync(`public/${TEACHER_ASSET_DIR}`);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(hits(`/${TEACHER_ASSET_DIR}/${file}`), file).toBe(true);
    }
    for (const path of [
      "/teachers/readme.txt",
      "/teachers/mina.webp",
      "/teachers/mina.vrm",
      "/teachers/mina.9c5152a.vrm",
      "/teachers/mina.9c5152a7a.vrm",
      "/teachers/mina.9c5152g7.vrm",
      "/teachers/mina.9c5152a7.png",
      "/teachers/mina.9c5152a7.vrm.bak",
      "/teachers/mina2.9c5152a7.vrm",
      "/teachers/old/mina.9c5152a7.vrm",
      "/teachers/",
    ]) {
      expect(hits(path), path).toBe(false);
    }
  });
});
