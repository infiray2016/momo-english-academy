// proxy 일치식(src/proxy.ts config.matcher)이 관문에서 빼는 꼴 — _next/static · _next/image · favicon.ico · images/ · teachers/ 로 시작하거나
// 정적 파일 확장자(png · txt · xml …)로 끝나는 경로 — 에 src/app 의 쪽(page) · 경로 처리기(route) · 메타데이터 경로(robots · sitemap ·
// manifest · icon …)가 열리지 않음을 고정한다(13절 C247 보안 점검, 보안 검토 task-rev-sec-report 5절 범위 밖 관찰). 그런 자리에 쪽이나
// 처리기를 두면 proxy 의 가족 접근 쿠키 확인을 건너뛴다. 일치식은 proxy.ts 에서 가져다 쓰고(베끼지 않는다), 판정은 Next 의 시험 도구
// unstable_doesMiddlewareMatch 가 실제 일치 규칙으로 한다. 동적 조각([id] 등)은 평범한 값 하나로 채운다 — 아이가 넣는 값이 확장자 꼴일 때는
// 이 시험의 범위 밖이다(보고 task-tool-bp-report 5절).
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config as proxyConfig } from "@/proxy";

const REPO_ROOT = process.cwd();
const APP_ROOT = "src/app";

/**
 * 쪽 · 경로 처리기 파일. 확장자는 next.config.ts 의 pageExtensions 전부(기본 넷 + 관찰 쪽 preview.tsx · 로컬 쪽 local.tsx —
 * 배포 종류마다 빠지는 것까지 모두 본다).
 */
const PAGE_OR_ROUTE =
  /^(page|route)\.(?:(?:preview|local)\.)?(?:tsx|ts|jsx|js)$/;
/** 메타데이터 경로 파일(Next 파일 규칙). 코드 꼴(ts · tsx · js)과 정적 꼴(txt · xml · json · webmanifest · 그림)이 모두 경로를 연다. */
const METADATA_FILE =
  /^(robots|sitemap|manifest|favicon|icon\d*|apple-icon\d*|opengraph-image\d*|twitter-image\d*)\.(tsx|ts|jsx|js|txt|xml|json|webmanifest|ico|png|jpg|jpeg|gif|svg)$/;
const CODE_EXT = new Set(["tsx", "ts", "jsx", "js"]);
/** 코드 꼴 메타데이터 파일이 내는 주소의 마지막 조각(이름이 확장자를 갖는 셋). 나머지(icon · opengraph-image …)는 확장자 없이 이름 그대로. */
const METADATA_CODE_URL: Record<string, string> = {
  robots: "robots.txt",
  sitemap: "sitemap.xml",
  manifest: "manifest.webmanifest",
};
/** 동적 조각을 채우는 평범한 값. */
const DYNAMIC_SAMPLE = "x";

type AppEntry = { file: string; url: string };

/** 폴더 조각 하나를 주소 조각으로. 경로 묶음 (x) · 병렬 자리 @x 는 주소에 없고, 가로채기 표지 (.) · (..) 는 떼고, 동적 조각은 견본 값으로 채운다. */
function urlSegmentOf(segment: string): string | null {
  if (/^\(.*\)$/.test(segment) || segment.startsWith("@")) return null;
  const name = segment.replace(/^(\(\.{1,3}\))+/, "");
  if (/^\[\[?\.\.\..+\]\]?$/.test(name))
    return `${DYNAMIC_SAMPLE}/${DYNAMIC_SAMPLE}`;
  if (/^\[.+\]$/.test(name)) return DYNAMIC_SAMPLE;
  return name;
}

/** app 폴더 기준 파일 경로(조각 '/' 로 이음) 하나가 여는 주소. 쪽 · 처리기 · 메타데이터 파일이 아니거나 비공개 폴더(_x) 안이면 null. */
function appEntryOf(appPath: string): AppEntry | null {
  const parts = appPath.split("/");
  const fileName = parts.pop() ?? "";
  if (parts.some((p) => p.startsWith("_"))) return null;
  const segments = parts
    .map(urlSegmentOf)
    .filter((s): s is string => s !== null);
  if (PAGE_OR_ROUTE.test(fileName)) {
    return { file: appPath, url: `/${segments.join("/")}` };
  }
  const meta = METADATA_FILE.exec(fileName);
  if (meta) {
    const [, name = "", ext = ""] = meta;
    const last = CODE_EXT.has(ext)
      ? (METADATA_CODE_URL[name] ?? name)
      : `${name}.${ext}`;
    return { file: appPath, url: `/${[...segments, last].join("/")}` };
  }
  return null;
}

/** 주소 목록에서 proxy 일치식이 빼는(관문을 건너뛰는) 것. */
function bypassingEntries(entries: AppEntry[]): AppEntry[] {
  return entries.filter(
    (e) => !unstable_doesMiddlewareMatch({ config: proxyConfig, url: e.url }),
  );
}

function appFiles(dir: string): string[] {
  return readdirSync(join(REPO_ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(REPO_ROOT, path)).isDirectory()
      ? appFiles(path)
      : [path];
  });
}

function realEntries(): AppEntry[] {
  return appFiles(APP_ROOT)
    .map((p) => relative(APP_ROOT, p).split(sep).join("/"))
    .map(appEntryOf)
    .filter((e): e is AppEntry => e !== null);
}

describe("proxy 일치식 가드", () => {
  it("AC-N5 proxy 일치식 가드: src/app 의 쪽 · 경로 처리기 · 메타데이터 경로 가운데 proxy 를 건너뛰는 것이 없다", () => {
    const entries = realEntries();
    // 훑기가 실제로 쪽 · 처리기를 찾는다(폴더가 옮겨져 빈 목록으로 통과하지 않게)
    expect(entries.map((e) => e.url)).toEqual(
      expect.arrayContaining([
        "/",
        "/access",
        "/access/submit",
        "/api/talk/turn",
      ]),
    );
    expect(bypassingEntries(entries)).toEqual([]);
  });

  it("AC-N5 proxy 일치식 가드: 건너뛰는 꼴의 가짜 경로(.txt · .xml 경로 처리기 · images/ · teachers/ 아래 쪽 · 메타데이터 파일)를 잡는다", () => {
    const fake = [
      "(setup)/notes.txt/route.ts",
      "api/feed.xml/route.ts",
      "(child)/images/board/page.tsx",
      "(child)/teachers/list/page.tsx",
      "favicon.ico/route.ts",
      "dev/report.png/page.preview.tsx",
      "robots.ts",
      "sitemap.ts",
      "manifest.ts",
      "(child)/icon.png",
      "robots.txt",
    ];
    const caught = bypassingEntries(
      fake.map(appEntryOf).filter((e): e is AppEntry => e !== null),
    );
    expect(caught.map((e) => e.file)).toEqual(fake);
    expect(caught.map((e) => e.url)).toEqual([
      "/notes.txt",
      "/api/feed.xml",
      "/images/board",
      "/teachers/list",
      "/favicon.ico",
      "/dev/report.png",
      "/robots.txt",
      "/sitemap.xml",
      "/manifest.webmanifest",
      "/icon.png",
      "/robots.txt",
    ]);
  });

  it("AC-N5 proxy 일치식 가드: 관문을 타는 가짜 경로(평범한 쪽 · 처리기 · 동적 조각 · 코드 꼴 그림 메타데이터)는 잡지 않는다", () => {
    const fake = [
      "(child)/notes/page.tsx",
      "api/talk/turn/route.ts",
      "(child)/session/[id]/page.tsx",
      "(child)/[area]/lessons/page.tsx",
      "docs/[...slug]/page.tsx",
      "@modal/(.)photo/page.tsx",
      "opengraph-image.tsx",
      "imagesx/page.tsx",
      "(child)/teachers/page.tsx",
    ];
    const entries = fake
      .map(appEntryOf)
      .filter((e): e is AppEntry => e !== null);
    expect(entries.map((e) => e.url)).toEqual([
      "/notes",
      "/api/talk/turn",
      "/session/x",
      "/x/lessons",
      "/docs/x/x",
      "/photo",
      "/opengraph-image",
      "/imagesx",
      "/teachers",
    ]);
    expect(bypassingEntries(entries)).toEqual([]);
  });

  it("AC-N5 proxy 일치식 가드: 쪽 · 처리기가 아닌 파일과 비공개 폴더(_x)는 주소를 열지 않는다", () => {
    for (const path of [
      "(child)/home-cards.tsx",
      "(child)/layout.tsx",
      "error.tsx",
      "globals.css",
      "_lib/route.ts",
      "dev/mic-probe/probe-log.ts",
    ]) {
      expect(appEntryOf(path), path).toBeNull();
    }
  });
});
