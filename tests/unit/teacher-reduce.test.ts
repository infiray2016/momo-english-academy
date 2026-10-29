// 줄이기 스크립트의 순수 함수(plan 선생님 값 1): 그림 갈래 · 그림 다시 쓰기(VRM JSON 글자 그대로 · 4바이트 맞춤 · 확장 목록) ·
// 줄인 방법 글 · 인자 · PNG 크기 · 줄일 크기 · 옛 파일 고르기 · 명단 글 꼴. 실행 파일(cwebp · dwebp) 부르기는 직접 실행 때만이라 여기서 부르지 않는다.
import { describe, expect, it } from "vitest";
import { TEACHER_ASSET_DIR } from "@/core/seed/structure";
import { parseGlb } from "@/core/seed/vrm";
import {
  applyImageRewrite,
  type EncodedImage,
  formatRoster,
  imageRolesOf,
  oldAssetFiles,
  parseArgs,
  pngSizeOf,
  reductionText,
  resizeArgsOf,
  WEBP_EXTENSION,
} from "../../scripts/teacher-reduce";
import { FAKE_ACCESSOR_BYTES, fakeVrm } from "../fixtures/seed/vrm";

type Json = Record<string, unknown>;
type View = { buffer: number; byteOffset?: number; byteLength: number };

const webp = (n: number, fill: number) => ({
  bytes: new Uint8Array(n).fill(fill),
  mimeType: "image/webp" as const,
});

describe("그림 갈래", () => {
  it("썸네일은 VRM 메타 texture 의 그림, 법선은 _BumpMap 텍스처의 그림, 나머지는 색이다", () => {
    const roles = imageRolesOf(fakeVrm().json);
    expect(roles).toEqual({
      thumbnail: 2,
      normals: [1],
      colors: [0],
      shared: [],
    });
  });

  it("썸네일 그림을 다른 텍스처가 같이 쓰면 그 텍스처를 shared 로 알린다(스크립트는 종료 2)", () => {
    const { json } = fakeVrm();
    (json.textures as { source: number }[]).push({ source: 2 });
    expect(imageRolesOf(json).shared).toEqual([3]);
  });
});

describe("그림 다시 쓰기", () => {
  const rewrite = () => {
    const { json, bin } = fakeVrm();
    const before = structuredClone(json);
    const encoded = new Map<number, EncodedImage>([
      [0, webp(6, 0xc0)],
      [1, webp(9, 0xa0)],
      [
        2,
        {
          bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
          mimeType: "image/png" as const,
        },
      ],
    ]);
    return { before, out: applyImageRewrite(json, bin, encoded), encoded };
  };

  it("VRM 확장 · accessors · materials · meshes 밖 칸은 글자 그대로 둔다", () => {
    const { before, out } = rewrite();
    expect(out.json.extensions).toEqual(before.extensions);
    expect(JSON.stringify((out.json.extensions as Json).VRM)).toBe(
      JSON.stringify((before.extensions as Json).VRM),
    );
    expect(out.json.accessors).toEqual(before.accessors);
    expect(out.json.materials).toEqual(before.materials);
    expect(out.json.samplers).toEqual(before.samplers);
  });

  it("bufferView 를 차례대로 4바이트 맞춰 다시 놓고 buffers[0].byteLength 를 고치며, accessor 바이트는 그대로다", () => {
    const { out, encoded } = rewrite();
    const views = out.json.bufferViews as View[];
    const lengths = [6, 9, 4, FAKE_ACCESSOR_BYTES.length];
    expect(views.map((v) => v.byteLength)).toEqual(lengths);
    let expected = 0;
    views.forEach((v, i) => {
      expect(v.byteOffset, `view ${i}`).toBe(expected);
      expect((v.byteOffset ?? 0) % 4).toBe(0);
      expected += (lengths[i] ?? 0) + ((4 - ((lengths[i] ?? 0) % 4)) % 4);
    });
    const last = views[3];
    if (!last) throw new Error("view 없음");
    expect((out.json.buffers as { byteLength: number }[])[0]?.byteLength).toBe(
      (last.byteOffset ?? 0) + last.byteLength,
    );
    expect(out.bin.length).toBe((last.byteOffset ?? 0) + last.byteLength);
    const at = (i: number) => {
      const v = views[i];
      if (!v) throw new Error("view 없음");
      return [
        ...out.bin.subarray(
          v.byteOffset ?? 0,
          (v.byteOffset ?? 0) + v.byteLength,
        ),
      ];
    };
    expect(at(0)).toEqual([...(encoded.get(0)?.bytes ?? [])]);
    expect(at(1)).toEqual([...(encoded.get(1)?.bytes ?? [])]);
    expect(at(3)).toEqual([...FAKE_ACCESSOR_BYTES]);
  });

  it("WebP 그림을 쓰는 텍스처는 EXT_texture_webp.source 로 옮기고 source 를 지우며, 썸네일 텍스처는 PNG source 를 지킨다", () => {
    const { out } = rewrite();
    expect(out.json.textures).toEqual([
      { sampler: 0, extensions: { [WEBP_EXTENSION]: { source: 0 } } },
      { sampler: 0, extensions: { [WEBP_EXTENSION]: { source: 1 } } },
      { sampler: 0, source: 2 },
    ]);
    const images = out.json.images as { mimeType: string }[];
    expect(images.map((i) => i.mimeType)).toEqual([
      "image/webp",
      "image/webp",
      "image/png",
    ]);
    expect(out.json.extensionsUsed).toEqual([
      "KHR_materials_unlit",
      "VRM",
      WEBP_EXTENSION,
    ]);
    expect(out.json.extensionsRequired).toEqual([WEBP_EXTENSION]);
  });

  it("다시 쓴 JSON · BIN 을 묶으면 GLB 로 다시 풀린다(두 번 써도 확장 목록이 겹치지 않음)", async () => {
    const { buildGlb } = await import("@/core/seed/vrm");
    const { out } = rewrite();
    const twice = applyImageRewrite(
      out.json,
      out.bin,
      new Map([[0, webp(6, 1)]]),
    );
    expect(twice.json.extensionsUsed).toEqual(out.json.extensionsUsed);
    expect(twice.json.extensionsRequired).toEqual([WEBP_EXTENSION]);
    const parsed = parseGlb(buildGlb(twice.json, twice.bin));
    expect(parsed.ok).toBe(true);
  });

  it("고치지 않은 입력 JSON 은 바뀌지 않는다", () => {
    const { json, bin } = fakeVrm();
    const before = structuredClone(json);
    applyImageRewrite(json, bin, new Map([[0, webp(6, 1)]]));
    expect(json).toEqual(before);
  });
});

describe("줄인 방법 글 · 인자 · 크기", () => {
  it("줄인 방법 글은 plan 값 1 글과 같다(판 · 한 변만 바뀜)", () => {
    expect(reductionText("1.6.0", 1024)).toBe(
      "pnpm teacher:reduce --max-texture 1024 (scripts/teacher-reduce.ts) · libwebp cwebp/dwebp 1.6.0 · 텍스처 한 변 1024 · 색 WebP q85(알파 무손실) · 법선 WebP 무손실 · 썸네일 PNG 256 · EXT_texture_webp(되돌림 PNG 없음) · 정점 · 뼈 · 표정 · 머티리얼 · VRM 메타 그대로",
    );
    expect(reductionText("1.6.0", 2048)).toContain("텍스처 한 변 2048");
  });

  it("인자: --key · --src 는 꼭, --max-texture 기본 1024 · --out 기본 public/teachers · --write", () => {
    expect(parseArgs(["--key", "mina", "--src", "/a/mina.vrm"])).toEqual({
      ok: true,
      args: {
        key: "mina",
        src: "/a/mina.vrm",
        maxTexture: 1024,
        out: `public/${TEACHER_ASSET_DIR}`,
        write: false,
      },
    });
    const full = parseArgs([
      "--key",
      "leo",
      "--src",
      "/a/leo.vrm",
      "--max-texture",
      "2048",
      "--out",
      "tests/.tmp/teacher-2048",
      "--write",
    ]);
    expect(full.ok && full.args).toMatchObject({
      maxTexture: 2048,
      out: "tests/.tmp/teacher-2048",
      write: true,
    });
    for (const bad of [
      [],
      ["--key", "mina"],
      ["--key", "Mina", "--src", "/a"],
      ["--key", "mina", "--src", "/a", "--max-texture", "0"],
      ["--key", "mina", "--src", "/a", "--nope"],
      ["--key", "mina", "--src"],
    ]) {
      expect(parseArgs(bad).ok, bad.join(" ")).toBe(false);
    }
  });

  it("PNG 크기는 IHDR 에서 읽고, PNG 가 아니면 undefined", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    png.set([0x49, 0x48, 0x44, 0x52], 12);
    const dv = new DataView(png.buffer);
    dv.setUint32(16, 2048, false);
    dv.setUint32(20, 1024, false);
    expect(pngSizeOf(png)).toEqual({ width: 2048, height: 1024 });
    expect(pngSizeOf(new Uint8Array(24))).toBeUndefined();
  });

  it("한 변이 상한보다 크면 비를 지켜 -resize(긴 변만 주고 짧은 변 0), 아니면 줄이지 않는다", () => {
    expect(resizeArgsOf({ width: 2048, height: 2048 }, 1024)).toEqual([
      "-resize",
      "1024",
      "0",
    ]);
    expect(resizeArgsOf({ width: 512, height: 2048 }, 1024)).toEqual([
      "-resize",
      "0",
      "1024",
    ]);
    expect(resizeArgsOf({ width: 1024, height: 512 }, 1024)).toEqual([]);
  });

  it("옛 파일은 같은 키의 <키>.<16진 8자>.(vrm|webp) 꼴만 고르고 새 파일은 남긴다", () => {
    const names = [
      "mina.0123abcd.vrm",
      "mina.0123abcd.webp",
      "mina.ffffffff.vrm",
      "mina.vrm",
      "mina.0123ABCD.vrm",
      "minari.0123abcd.vrm",
      "leo.0123abcd.vrm",
      "mina.0123abcd.png",
    ];
    expect(oldAssetFiles(names, "mina", ["mina.ffffffff.vrm"])).toEqual([
      "mina.0123abcd.vrm",
      "mina.0123abcd.webp",
    ]);
  });
});

describe("명단 글 꼴", () => {
  it("명단을 칸 차례대로 쓰고 짧은 칸은 한 줄 · 출처는 칸마다 한 줄로 둔다(다시 읽으면 같은 값)", () => {
    const roster = {
      teachers: [
        {
          source: { creator: "A", reduction: "r" },
          key: "mina",
          kind: "vrm",
          nameKo: "미나",
          nameEn: "Mina",
          nameKoWordExceptions: ["미나리"],
          traitsKo: ["a", "b"],
          color: { room: "#000000", accent: "#ffffff" },
          model: { path: "teachers/mina.0123abcd.vrm", bytes: 1, sha256: "0" },
          voice: { pitch: 1.08, prefer: [] },
        },
      ],
    };
    const text = formatRoster(roster);
    expect(JSON.parse(text)).toEqual(roster);
    expect(text.endsWith("}\n")).toBe(true);
    const lines = text.split("\n");
    expect(lines).toContain('      "traitsKo": ["a", "b"],');
    expect(lines).toContain(
      '      "color": { "room": "#000000", "accent": "#ffffff" },',
    );
    expect(lines).toContain('      "voice": { "pitch": 1.08, "prefer": [] },');
    expect(lines).toContain('        "creator": "A",');
    // 칸 차례: key 가 source 보다 먼저, nameKoWordExceptions 는 nameEn 바로 뒤
    const order = lines
      .map((l) => /^ {6}"(\w+)"/.exec(l)?.[1])
      .filter((k): k is string => k !== undefined);
    expect(order).toEqual([
      "key",
      "kind",
      "nameKo",
      "nameEn",
      "nameKoWordExceptions",
      "traitsKo",
      "color",
      "model",
      "voice",
      "source",
    ]);
  });
});
