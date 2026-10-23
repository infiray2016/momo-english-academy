import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import type { ImageEntry } from "@/core/seed/schema/reference";
import { IMAGE_MAX_BYTES } from "@/core/seed/structure";
import {
  checkCatalogFiles,
  checkSvg,
  type ImageFile,
  parseArgs,
  parseSource,
  readImageFiles,
  runCheck,
  twemojiUrl,
} from "../../scripts/vocab-images";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TMP_ROOT = join(REPO_ROOT, "tests/.tmp");
const made: string[] = [];

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const TWEMOJI_VERSION = "17.0.3";
const ATTRIBUTION =
  "Twemoji v17.0.3 (github.com/jdecked/twemoji) © 2014–2021 Twitter, © 2022– Jason Sofonia & Justine De Caires, CC-BY 4.0";
const CLEAN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><defs><linearGradient id="a"/></defs><path fill="url(#a)" d="M0 0h36v36H0z"/></svg>';

function twemojiRow(key: string, code: string): ImageEntry {
  return {
    key,
    file: `images/vocab/${key}.svg`,
    source: `twemoji v${TWEMOJI_VERSION} ${code}`,
    license: "cc_by",
    attribution: ATTRIBUTION,
    word: key,
  };
}
function selfRow(key: string): ImageEntry {
  return {
    key,
    file: `images/vocab/${key}.svg`,
    source: "self-made 2026-10-17",
    license: "generated",
    word: key,
  };
}
function svgFile(name: string, text = CLEAN_SVG): ImageFile {
  return { name, bytes: Buffer.byteLength(text, "utf8"), text };
}
function catalogText(images: readonly ImageEntry[]): string {
  return JSON.stringify({ images });
}

describe("그림 카탈로그 스크립트", () => {
  it("그림 카탈로그: Twemoji 출처 글에서 고정 판 주소를 만든다", () => {
    expect(parseSource(`twemoji v${TWEMOJI_VERSION} 1f34e`)).toEqual({
      kind: "twemoji",
      version: TWEMOJI_VERSION,
      code: "1f34e",
    });
    expect(twemojiUrl(TWEMOJI_VERSION, "1f34e")).toBe(
      "https://cdn.jsdelivr.net/gh/jdecked/twemoji@v17.0.3/assets/svg/1f34e.svg",
    );
    // 이어진 코드(ZWJ 묶음)는 파일 이름 그대로 쓴다.
    const joined = parseSource(`twemoji v${TWEMOJI_VERSION} 1f9d1-200d-1f373`);
    expect(joined).toEqual({
      kind: "twemoji",
      version: TWEMOJI_VERSION,
      code: "1f9d1-200d-1f373",
    });
    if (joined.kind !== "twemoji") throw new Error("Twemoji 출처가 아니다");
    expect(twemojiUrl(joined.version, joined.code)).toBe(
      "https://cdn.jsdelivr.net/gh/jdecked/twemoji@v17.0.3/assets/svg/1f9d1-200d-1f373.svg",
    );
    expect(parseSource("self-made 2026-10-17")).toEqual({ kind: "self" });
  });

  it("그림 카탈로그: 출처 글 꼴이 틀리면 거부한다", () => {
    const bad = [
      "",
      "momo-fixture",
      "twemoji 17.0.3 1f34e",
      "twemoji v17.0 1f34e",
      "twemoji vlatest 1f34e",
      "twemoji v17.0.3",
      "twemoji v17.0.3 1F34E",
      "twemoji v17.0.3 1f34e.svg",
      "twemoji v17.0.3 ../1f34e",
      "twemoji v17.0.3 1f34e-",
      "twemoji v17.0.3 1f34e extra",
      " twemoji v17.0.3 1f34e",
      "self-made",
      "self-made 2026/10/17",
      "self-made 2026-13-01",
      "self-made 2026-02-30",
    ];
    for (const text of bad) {
      expect(parseSource(text).kind, text).toBe("invalid");
    }
    // check 는 출처 글이 틀린 행과 출처 · 라이선스가 어긋난 행을 위반(1)으로 낸다.
    const rows = [twemojiRow("apple", "1f34e"), selfRow("cap")];
    const files = [svgFile("apple.svg"), svgFile("cap.svg")];
    expect(runCheck({ catalog: catalogText(rows), files }).code).toBe(0);
    const badSource = [{ ...twemojiRow("apple", "1f34e"), source: "twemoji" }];
    const one = runCheck({
      catalog: catalogText(badSource),
      files: [svgFile("apple.svg")],
    });
    expect(one.code).toBe(1);
    expect(one.lines.join("\n")).toContain("apple");
    const mismatch = [
      { ...selfRow("cap"), license: "cc0" as const },
      {
        ...twemojiRow("apple", "1f34e"),
        source: "self-made 2026-10-17",
      },
    ];
    const two = runCheck({
      catalog: catalogText(mismatch),
      files: [svgFile("apple.svg"), svgFile("cap.svg")],
    });
    expect(two.code).toBe(1);
    expect(two.lines.filter((l) => l.includes("라이선스"))).toHaveLength(2);
    // 명령 인자 꼴이 틀리면 거부한다.
    expect(parseArgs(["check"])).toEqual({
      ok: true,
      args: { command: "check", root: "." },
    });
    expect(parseArgs(["fetch", "--root", "x"])).toEqual({
      ok: true,
      args: { command: "fetch", root: "x" },
    });
    expect(parseArgs([]).ok).toBe(false);
    expect(parseArgs(["pull"]).ok).toBe(false);
    expect(parseArgs(["check", "--root"]).ok).toBe(false);
    expect(parseArgs(["check", "--json"]).ok).toBe(false);
  });

  it("그림 카탈로그: 파일이 없거나 상한을 넘거나 카탈로그 밖 파일이 있으면 잡는다", () => {
    const images = [twemojiRow("apple", "1f34e"), selfRow("cap")];
    const ok = [
      { name: "apple.svg", bytes: IMAGE_MAX_BYTES },
      { name: "cap.svg", bytes: 1 },
    ];
    expect(checkCatalogFiles({ images, files: ok })).toEqual([]);
    // 파일 없음
    const missing = checkCatalogFiles({ images, files: ok.slice(0, 1) });
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain("cap");
    // 상한 넘음
    const big = checkCatalogFiles({
      images,
      files: [{ name: "apple.svg", bytes: IMAGE_MAX_BYTES + 1 }, ok[1]],
    });
    expect(big).toHaveLength(1);
    expect(big[0]).toContain("apple");
    // 카탈로그 밖 파일
    const stray = checkCatalogFiles({
      images,
      files: [...ok, { name: "dog.svg", bytes: 1 }],
    });
    expect(stray).toHaveLength(1);
    expect(stray[0]).toContain("dog.svg");
    // 파일 이름이 키와 다르다
    const renamed = checkCatalogFiles({
      images: [{ ...images[0], file: "images/vocab/cap.svg" }, images[1]],
      files: ok,
    });
    expect(renamed.some((p) => p.includes("apple"))).toBe(true);

    // 실제 폴더에서 읽어 check 를 돈다(임시 폴더, 네트워크 없음).
    const root = join(
      TMP_ROOT,
      `vocab-images-${randomBytes(6).toString("hex")}`,
    );
    made.push(root);
    const dir = join(root, "public/images/vocab");
    expect(readImageFiles(dir)).toBeNull();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "apple.svg"), CLEAN_SVG);
    writeFileSync(join(dir, "cap.svg"), CLEAN_SVG);
    const catalog = catalogText(images);
    expect(runCheck({ catalog, files: readImageFiles(dir) }).code).toBe(0);
    writeFileSync(join(dir, "dog.svg"), CLEAN_SVG);
    expect(runCheck({ catalog, files: readImageFiles(dir) }).code).toBe(1);
    rmSync(join(dir, "dog.svg"));
    rmSync(join(dir, "cap.svg"));
    expect(runCheck({ catalog, files: readImageFiles(dir) }).code).toBe(1);
    writeFileSync(join(dir, "cap.svg"), "x".repeat(IMAGE_MAX_BYTES + 1));
    expect(runCheck({ catalog, files: readImageFiles(dir) }).code).toBe(1);
    writeFileSync(join(dir, "cap.svg"), CLEAN_SVG);
    // 하위 폴더는 카탈로그 밖으로 잡는다.
    mkdirSync(join(dir, "old"));
    const sub = runCheck({ catalog, files: readImageFiles(dir) });
    expect(sub.code).toBe(1);
    expect(sub.lines.join("\n")).toContain("images/vocab/old/");
    rmSync(join(dir, "old"), { recursive: true });
    // macOS 의 .DS_Store 는 건너뛰고, 그 밖 숨은 파일은 카탈로그 밖이다.
    writeFileSync(join(dir, ".DS_Store"), "x");
    expect(runCheck({ catalog, files: readImageFiles(dir) }).code).toBe(0);
    writeFileSync(join(dir, ".hidden"), "x");
    const hidden = runCheck({ catalog, files: readImageFiles(dir) });
    expect(hidden.code).toBe(1);
    expect(hidden.lines.join("\n")).toContain("images/vocab/.hidden");
    rmSync(join(dir, ".hidden"));
    // 입력 오류(2): 카탈로그 없음 · JSON 깨짐 · 꼴 틀림 · 그림 폴더 없음
    expect(runCheck({ catalog: null, files: [] }).code).toBe(2);
    expect(runCheck({ catalog: "{", files: [] }).code).toBe(2);
    expect(runCheck({ catalog: '{"images":[{}]}', files: [] }).code).toBe(2);
    expect(runCheck({ catalog, files: null }).code).toBe(2);
    // 오류 글은 뿌리를 붙인 실제 경로를 보인다(--root 를 잘못 준 때).
    const wrongRoot = join(root, "seed");
    expect(
      runCheck({ catalog: null, files: [], root: wrongRoot }).lines[0],
    ).toContain(join(wrongRoot, "seed/images.json"));
    expect(
      runCheck({ catalog, files: null, root: wrongRoot }).lines[0],
    ).toContain(join(wrongRoot, "public/images/vocab"));
  });

  it("그림 카탈로그: 그림 폴더 자리에 파일이 있거나 없음 밖의 오류면 null 로 삼키지 않는다", () => {
    const root = join(
      TMP_ROOT,
      `vocab-images-${randomBytes(6).toString("hex")}`,
    );
    made.push(root);
    mkdirSync(join(root, "public/images"), { recursive: true });
    const notDir = join(root, "public/images/vocab");
    writeFileSync(notDir, "x");
    expect(() => readImageFiles(notDir)).toThrow("폴더가 아닌 것");
    expect(readImageFiles(join(root, "public/images/none"))).toBeNull();
  });

  it("그림 카탈로그: 행이 없으면 그림 폴더가 없어도 통과한다", () => {
    const empty = catalogText([]);
    expect(runCheck({ catalog: empty, files: null })).toEqual({
      code: 0,
      lines: ["vocab-images check: 행 0 · 파일 0 · 위반 0"],
    });
    const root = join(
      TMP_ROOT,
      `vocab-images-${randomBytes(6).toString("hex")}`,
    );
    made.push(root);
    const dir = join(root, "public/images/vocab");
    expect(readImageFiles(dir)).toBeNull();
    expect(runCheck({ catalog: empty, files: readImageFiles(dir) }).code).toBe(
      0,
    );
    // 행이 있는데 폴더가 없으면 입력 오류(2)다.
    const one = catalogText([twemojiRow("apple", "1f34e")]);
    expect(runCheck({ catalog: one, files: null }).code).toBe(2);
    // 행이 없어도 폴더에 파일이 있으면 카탈로그 밖이다.
    expect(
      runCheck({ catalog: empty, files: [svgFile("apple.svg")] }).code,
    ).toBe(1);
  });

  it("그림 카탈로그: script · foreignObject · 바깥 주소 · 이벤트 속성이 든 SVG 를 잡는다", () => {
    // 이름 공간 xmlns 와 안쪽 참조 url(#…) 는 바깥 주소가 아니다.
    expect(checkSvg(CLEAN_SVG)).toEqual([]);
    expect(
      checkSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#a"/></svg>',
      ),
    ).toEqual([]);
    const bad = [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><SCRIPT href="#a"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div/></foreignObject></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="#a"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="http://example.com"><path d="M0 0"/></a></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><use xlink:href="https://example.com/a.svg#b"/></svg>',
      "<svg xmlns=\"http://www.w3.org/2000/svg\"><use href='//example.com/a.svg#b'/></svg>",
      '<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:url(http://example.com/a)" d="M0 0"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(\'https://example.com/a\')" d="M0 0"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><path onClick = "x" d="M0 0"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><style>@import "x.css";</style></svg>',
      // href 는 # 안쪽 참조만 받는다.
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><path d="M0 0"/></a></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><use xlink:href="data:image/svg+xml;base64,PHN2Zy8+#a"/></svg>',
      // href 를 바꾸는 애니메이션
      '<svg xmlns="http://www.w3.org/2000/svg"><a><animate attributeName="href" values="#a"/></a></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><a><set attributeName="xlink:href" to="#a"/></a></svg>',
    ];
    for (const text of bad) {
      expect(checkSvg(text).length, text).toBeGreaterThan(0);
    }
    // check 는 SVG 안전 문제를 위반(1)으로 낸다.
    const images = [twemojiRow("apple", "1f34e")];
    const result = runCheck({
      catalog: catalogText(images),
      files: [svgFile("apple.svg", bad[0])],
    });
    expect(result.code).toBe(1);
    expect(result.lines.join("\n")).toContain("apple.svg");
  });
});
