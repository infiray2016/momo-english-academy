// 회화 선생님 모델 줄이기(plan 선생님 값 1 · 미결 3, 로컬 전용 — CI 는 부르지 않는다, images:fetch 와 같은 자리).
// 사용: pnpm teacher:reduce --key <mina|leo> --src <원본 VRM 절대 경로> [--max-texture 1024] [--out <폴더>] [--write]
// GLB 안 그림만 다시 쓰고(색 WebP 손실 · 법선 WebP 무손실 · 썸네일 PNG 256, EXT_texture_webp) VRM JSON(meta · humanoid · blendShapeMaster ·
// secondaryAnimation · materialProperties)과 accessor · 머티리얼은 글자 그대로 둔다(메타 보존을 구조로 지킴). 초상은 원본 썸네일을 512² WebP 로.
// 원본은 읽기만 하고(덮어쓰지 않음, plan 위험 4) SHA-256 을 명단 source.originalSha256 과 대조한다.
// --write 면 명단(seed/teachers.json) 그 항목의 model · portrait · source.reduction 을 고치고 같은 키의 옛 파일을 지운다(--out 기본 폴더에서만).
// 도구: libwebp cwebp · dwebp(Homebrew `webp`). 종료 코드: 0 끝, 2 입력 · 도구 · 원본 오류.
// 순수 함수를 내보내고 파일 · 실행 파일 · 출력은 직접 실행될 때만 한다(scripts 의 다른 명령과 같은 꼴).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SEED_FILES,
  TEACHER_ASSET_DIR,
  TEACHER_ASSET_HASH_CHARS,
  TEACHER_KEY,
} from "../src/core/seed/structure";
import { buildGlb, type GltfJson, parseGlb } from "../src/core/seed/vrm";

/** 저장소 뿌리 기준 시드 · 공개 폴더. */
export const SEED_DIR = "seed";
export const PUBLIC_DIR = "public";
/** 기본 텍스처 한 변 상한(1024 표본 — 프리뷰에 씀, plan 값 1). */
export const DEFAULT_MAX_TEXTURE = 1024;
export const DEFAULT_OUT = `${PUBLIC_DIR}/${TEACHER_ASSET_DIR}`;
/** glTF WebP 텍스처 확장(되돌림 PNG 없음 — extensionsRequired). */
export const WEBP_EXTENSION = "EXT_texture_webp";

/** 줄이기 값(plan 값 1 — 도구 값이라 설정이 아니고, 줄인 방법 글로 명단 · 출처 문서에 남는다). */
const ENCODE = {
  colorQuality: 85,
  colorAlphaQuality: 100,
  losslessEffort: 9,
  thumbnailSide: 256,
  portraitSide: 512,
  portraitQuality: 80,
} as const;
/** 파일 이름에 넣는 SHA-256 앞 글자 수(자산 검사와 같은 값 — 검토 3 Minor-2). */
const HASH_PREFIX = TEACHER_ASSET_HASH_CHARS;

// ── 순수 함수 ────────────────────────────────────────────────────

export type ImageRoles = {
  /** 썸네일 그림(VRM 0.x meta.texture 가 가리키는 텍스처의 source). */
  thumbnail: number | undefined;
  /** 법선 그림(materialProperties[].textureProperties._BumpMap 텍스처의 source). */
  normals: number[];
  /** 나머지 그림(색). */
  colors: number[];
  /** 썸네일 그림을 같이 쓰는 다른 텍스처(있으면 종료 2). */
  shared: number[];
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** GLB 그림을 썸네일 · 법선 · 색으로 나눈다. */
export function imageRolesOf(json: GltfJson): ImageRoles {
  const textures = json.textures ?? [];
  const sourceOf = (texture: unknown) =>
    typeof texture === "number" ? textures[texture]?.source : undefined;
  const vrm = isRecord(json.extensions?.VRM) ? json.extensions.VRM : {};
  const meta = isRecord(vrm.meta) ? vrm.meta : {};
  const thumbnail = sourceOf(meta.texture);
  const normals = new Set<number>();
  for (const m of Array.isArray(vrm.materialProperties)
    ? vrm.materialProperties
    : []) {
    if (!isRecord(m) || !isRecord(m.textureProperties)) continue;
    const n = sourceOf(m.textureProperties._BumpMap);
    if (n !== undefined && n !== thumbnail) normals.add(n);
  }
  const colors: number[] = [];
  (json.images ?? []).forEach((_, i) => {
    if (i !== thumbnail && !normals.has(i)) colors.push(i);
  });
  const shared: number[] = [];
  textures.forEach((t, i) => {
    if (thumbnail !== undefined && t.source === thumbnail && i !== meta.texture)
      shared.push(i);
  });
  return {
    thumbnail,
    normals: [...normals].sort((a, b) => a - b),
    colors,
    shared,
  };
}

export type EncodedImage = {
  bytes: Uint8Array;
  mimeType: "image/webp" | "image/png";
};

const pad4 = (n: number) => (4 - (n % 4)) % 4;

/**
 * 인코더 결과(그림 차례 → 바이트 · 꼴)로 GLB JSON · BIN 을 다시 쓴다. 입력은 고치지 않는다.
 * WebP 그림을 쓰는 텍스처는 EXT_texture_webp.source 로 옮기고 source 를 지운다. bufferView 는 차례대로 4바이트 맞춰 다시 놓는다.
 * accessor · 머티리얼 · VRM 확장은 그대로다. 버퍼가 하나가 아니거나 그림 둘이 한 bufferView 를 쓰면 던진다.
 */
export function applyImageRewrite(
  input: GltfJson,
  bin: Uint8Array,
  encoded: ReadonlyMap<number, EncodedImage>,
): { json: GltfJson; bin: Uint8Array } {
  const json = structuredClone(input);
  const images = json.images ?? [];
  const views = json.bufferViews ?? [];
  if ((json.buffers ?? []).length !== 1)
    throw new Error("버퍼가 하나인 GLB 만 다시 쓴다");
  const replaced = new Map<number, Uint8Array>();
  for (const [index, image] of encoded) {
    const target = images[index];
    if (!target || target.bufferView === undefined)
      throw new Error(`그림 ${index} 가 bufferView 를 쓰지 않는다`);
    if (replaced.has(target.bufferView))
      throw new Error(`bufferView ${target.bufferView} 를 그림 둘이 쓴다`);
    replaced.set(target.bufferView, image.bytes);
    target.mimeType = image.mimeType;
  }

  let anyWebp = false;
  for (const texture of json.textures ?? []) {
    const source = texture.source;
    if (source === undefined) continue;
    if (encoded.get(source)?.mimeType !== "image/webp") continue;
    texture.extensions = {
      ...(texture.extensions ?? {}),
      [WEBP_EXTENSION]: { source },
    };
    delete texture.source;
    anyWebp = true;
  }
  if (
    anyWebp ||
    (json.textures ?? []).some((t) => t.extensions?.[WEBP_EXTENSION])
  ) {
    for (const key of ["extensionsUsed", "extensionsRequired"] as const) {
      const list = json[key] ?? [];
      if (!list.includes(WEBP_EXTENSION)) list.push(WEBP_EXTENSION);
      json[key] = list;
    }
  }

  const chunks: Uint8Array[] = [];
  let offset = 0;
  for (const [i, view] of views.entries()) {
    if (view.buffer !== 0) throw new Error(`bufferView ${i} 가 버퍼 0 밖이다`);
    const start = view.byteOffset ?? 0;
    const data =
      replaced.get(i) ?? bin.subarray(start, start + view.byteLength);
    offset += pad4(offset);
    view.byteOffset = offset;
    view.byteLength = data.length;
    chunks.push(data);
    offset += data.length;
  }
  const out = new Uint8Array(offset);
  views.forEach((view, i) => {
    const data = chunks[i];
    if (data) out.set(data, view.byteOffset ?? 0);
  });
  const buffer = json.buffers?.[0];
  if (buffer) buffer.byteLength = offset;
  return { json, bin: out };
}

/** 줄인 방법 글(명단 source.reduction · 출처 문서에 그대로). */
export function reductionText(libwebpVersion: string, maxTexture: number) {
  return `pnpm teacher:reduce --max-texture ${maxTexture} (scripts/teacher-reduce.ts) · libwebp cwebp/dwebp ${libwebpVersion} · 텍스처 한 변 ${maxTexture} · 색 WebP q${ENCODE.colorQuality}(알파 무손실) · 법선 WebP 무손실 · 썸네일 PNG ${ENCODE.thumbnailSide} · ${WEBP_EXTENSION}(되돌림 PNG 없음) · 정점 · 뼈 · 표정 · 머티리얼 · VRM 메타 그대로`;
}

export type ReduceArgs = {
  key: string;
  src: string;
  maxTexture: number;
  out: string;
  write: boolean;
};

export function parseArgs(
  argv: readonly string[],
): { ok: true; args: ReduceArgs } | { ok: false; error: string } {
  let key: string | undefined;
  let src: string | undefined;
  let maxTexture = DEFAULT_MAX_TEXTURE;
  let out = DEFAULT_OUT;
  let write = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--write") {
      write = true;
      continue;
    }
    const value = argv[i + 1];
    if (
      arg === "--key" ||
      arg === "--src" ||
      arg === "--max-texture" ||
      arg === "--out"
    ) {
      if (value === undefined || value.startsWith("--"))
        return { ok: false, error: `${arg} 뒤에 값이 없다` };
      i++;
      if (arg === "--key") key = value;
      else if (arg === "--src") src = value;
      else if (arg === "--out") out = value;
      else {
        const n = Number(value);
        if (!Number.isInteger(n) || n <= 0)
          return {
            ok: false,
            error: `--max-texture ${value} 는 양의 정수가 아니다`,
          };
        maxTexture = n;
      }
      continue;
    }
    return { ok: false, error: `모르는 인자: ${arg}` };
  }
  if (key === undefined || !TEACHER_KEY.test(key))
    return { ok: false, error: "--key 는 영어 소문자 키다" };
  if (src === undefined) return { ok: false, error: "--src 가 없다" };
  return { ok: true, args: { key, src, maxTexture, out, write } };
}

/** PNG 머리(IHDR)의 너비 · 높이. PNG 가 아니면 undefined. */
export function pngSizeOf(
  bytes: Uint8Array,
): { width: number; height: number } | undefined {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((b, i) => bytes[i] !== b))
    return undefined;
  const ihdr = String.fromCharCode(...bytes.subarray(12, 16));
  if (ihdr !== "IHDR") return undefined;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: dv.getUint32(16, false), height: dv.getUint32(20, false) };
}

/** 한 변이 상한보다 크면 비를 지키는 cwebp -resize 인자(긴 변만 주고 짧은 변 0), 아니면 빈 목록. */
export function resizeArgsOf(
  size: { width: number; height: number },
  maxSide: number,
): string[] {
  if (Math.max(size.width, size.height) <= maxSide) return [];
  return size.width >= size.height
    ? ["-resize", String(maxSide), "0"]
    : ["-resize", "0", String(maxSide)];
}

/** 같은 키의 옛 파일(`<키>.<16진 8자>.(vrm|webp)` 꼴만)을 고른다. keep 은 남긴다. */
export function oldAssetFiles(
  names: readonly string[],
  key: string,
  keep: readonly string[],
): string[] {
  const pattern = new RegExp(
    `^${key}\\.[0-9a-f]{${HASH_PREFIX}}\\.(vrm|webp)$`,
  );
  return names.filter((n) => pattern.test(n) && !keep.includes(n));
}

/** 명단 항목 칸 차례(규격 schema/teachers.ts 차례). 표에 없는 칸은 뒤에 둔다. */
const ROSTER_FIELD_ORDER = [
  "key",
  "kind",
  "nameKo",
  "nameEn",
  "nameKoWordExceptions",
  "introKo",
  "traitsKo",
  "personaEn",
  "greetingEn",
  "color",
  "model",
  "portrait",
  "voice",
  "source",
] as const;
/** 칸마다 한 줄로 펴서 쓰는 명단 칸(출처). */
const EXPANDED_FIELDS = new Set(["source"]);

/** 한 줄 JSON(객체 `{ "a": 1 }` · 목록 `["a", "b"]` — 지금 명단 글 꼴). */
function inline(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(inline).join(", ")}]`;
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    return `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`).join(", ")} }`;
  }
  return JSON.stringify(value);
}

/** 명단을 지금 seed/teachers.json 글 꼴(항목 칸마다 한 줄 · 출처는 칸마다 한 줄)로 쓴다. */
export function formatRoster(roster: { teachers: unknown[] }): string {
  const teacher = (t: unknown) => {
    const record = isRecord(t) ? t : {};
    const keys = [
      ...ROSTER_FIELD_ORDER.filter((k) => k in record),
      ...Object.keys(record).filter(
        (k) => !(ROSTER_FIELD_ORDER as readonly string[]).includes(k),
      ),
    ];
    const lines = keys.map((k) => {
      const value = record[k];
      if (EXPANDED_FIELDS.has(k) && isRecord(value)) {
        const inner = Object.entries(value).map(
          ([ik, iv]) => `        ${JSON.stringify(ik)}: ${inline(iv)}`,
        );
        return `      ${JSON.stringify(k)}: {\n${inner.join(",\n")}\n      }`;
      }
      return `      ${JSON.stringify(k)}: ${inline(value)}`;
    });
    return `    {\n${lines.join(",\n")}\n    }`;
  };
  return `{\n  "teachers": [\n${roster.teachers.map(teacher).join(",\n")}\n  ]\n}\n`;
}

// ── 직접 실행 ────────────────────────────────────────────────────

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

class ReduceError extends Error {}

function run(command: string, args: readonly string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new ReduceError(
      `${command} ${args.join(" ")} 실패: ${result.error?.message ?? result.stderr}`,
    );
  }
  return result.stdout;
}

function libwebpVersion(): string {
  const versionOf = (tool: string) => {
    const r = spawnSync(tool, ["-version"], { encoding: "utf8" });
    if (r.error || r.status !== 0)
      throw new ReduceError(
        `${tool} 를 찾을 수 없다 — 'brew install webp' 로 libwebp 를 깐다`,
      );
    return r.stdout.split("\n")[0]?.trim() ?? "";
  };
  const c = versionOf("cwebp");
  const d = versionOf("dwebp");
  return c === d ? c : `cwebp ${c} · dwebp ${d}`;
}

type RosterEntry = Record<string, unknown> & {
  key?: unknown;
  source?: Record<string, unknown>;
};

function readRoster(path: string): { teachers: RosterEntry[] } {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isRecord(raw) || !Array.isArray(raw.teachers))
    throw new ReduceError(`명단 꼴이 아니다: ${path}`);
  return { teachers: raw.teachers.filter(isRecord) as RosterEntry[] };
}

function main(): number {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`teacher-reduce: ${parsed.error}`);
    return 2;
  }
  const { key, src, maxTexture, out, write } = parsed.args;
  const cwd = process.cwd();
  const outDir = resolve(cwd, out);
  const rosterPath = join(cwd, SEED_DIR, SEED_FILES.teachers);
  const work = mkdtempSync(join(tmpdir(), "teacher-reduce-"));
  try {
    if (write && outDir !== resolve(cwd, DEFAULT_OUT))
      throw new ReduceError(`--write 는 --out 기본(${DEFAULT_OUT})에서만 쓴다`);
    const roster = readRoster(rosterPath);
    const entry = roster.teachers.find((t) => t.key === key);
    if (!entry) throw new ReduceError(`명단에 키 ${key} 가 없다`);

    // (1) 원본 해시 대조
    let original: Uint8Array;
    try {
      original = new Uint8Array(readFileSync(src));
    } catch {
      throw new ReduceError(`원본을 읽을 수 없다: ${src}`);
    }
    const originalSha = sha256(original);
    if (originalSha !== entry.source?.originalSha256)
      throw new ReduceError(
        `원본 SHA-256 ${originalSha} 가 명단 source.originalSha256 과 다르다`,
      );
    // (2) 도구 판
    const version = libwebpVersion();
    // (3) GLB 풀기
    const glb = parseGlb(original);
    if (!glb.ok) throw new ReduceError(`원본 GLB: ${glb.reason}`);
    // (4) 그림 갈래
    const roles = imageRolesOf(glb.json);
    if (roles.thumbnail === undefined)
      throw new ReduceError("VRM 메타 썸네일(meta.texture)이 없다");
    if (roles.shared.length > 0)
      throw new ReduceError(
        `썸네일 그림을 다른 텍스처 ${roles.shared.join(", ")} 가 같이 쓴다`,
      );
    const images = glb.json.images ?? [];
    for (const n of roles.normals) {
      const name = images[n]?.name ?? "";
      if (!name.includes("_nml"))
        console.log(`알림: 법선 그림 ${n}(${name})의 이름에 _nml 이 없다`);
    }
    const views = glb.json.bufferViews ?? [];
    const imageBytes = (i: number) => {
      const view = views[images[i]?.bufferView ?? -1];
      if (!view)
        throw new ReduceError(`그림 ${i} 가 bufferView 를 쓰지 않는다`);
      const bytes = glb.bin.subarray(
        view.byteOffset ?? 0,
        (view.byteOffset ?? 0) + view.byteLength,
      );
      const size = pngSizeOf(bytes);
      if (!size) throw new ReduceError(`그림 ${i} 가 PNG 가 아니다`);
      return { bytes, size };
    };
    const encodeWith = (i: number, args: readonly string[]) => {
      const { bytes, size } = imageBytes(i);
      const input = join(work, `${i}.png`);
      const output = join(work, `${i}.webp`);
      writeFileSync(input, bytes);
      run("cwebp", [
        "-quiet",
        ...args,
        ...resizeArgsOf(size, maxTexture),
        input,
        "-o",
        output,
      ]);
      return new Uint8Array(readFileSync(output));
    };

    // (5) 다시 쓰기
    const encoded = new Map<number, EncodedImage>();
    for (const i of roles.colors) {
      encoded.set(i, {
        bytes: encodeWith(i, [
          "-q",
          String(ENCODE.colorQuality),
          "-alpha_q",
          String(ENCODE.colorAlphaQuality),
        ]),
        mimeType: "image/webp",
      });
    }
    for (const i of roles.normals) {
      encoded.set(i, {
        bytes: encodeWith(i, [
          "-lossless",
          "-z",
          String(ENCODE.losslessEffort),
        ]),
        mimeType: "image/webp",
      });
    }
    const thumb = imageBytes(roles.thumbnail);
    const thumbIn = join(work, "thumb.png");
    writeFileSync(thumbIn, thumb.bytes);
    const side = String(ENCODE.thumbnailSide);
    run("cwebp", [
      "-quiet",
      "-lossless",
      "-exact",
      "-resize",
      side,
      side,
      thumbIn,
      "-o",
      join(work, "thumb.webp"),
    ]);
    // dwebp 1.6.0 은 PNG 가 기본 출력이다(-png 인자가 없다).
    run("dwebp", [
      join(work, "thumb.webp"),
      "-quiet",
      "-o",
      join(work, "thumb-256.png"),
    ]);
    encoded.set(roles.thumbnail, {
      bytes: new Uint8Array(readFileSync(join(work, "thumb-256.png"))),
      mimeType: "image/png",
    });
    // (6) · (7) 확장 · bufferView
    const rewritten = applyImageRewrite(glb.json, glb.bin, encoded);
    const model = buildGlb(rewritten.json, rewritten.bin);
    // (8) 초상
    const portraitSide = String(ENCODE.portraitSide);
    run("cwebp", [
      "-quiet",
      "-q",
      String(ENCODE.portraitQuality),
      "-resize",
      portraitSide,
      portraitSide,
      thumbIn,
      "-o",
      join(work, "portrait.webp"),
    ]);
    const portrait = new Uint8Array(readFileSync(join(work, "portrait.webp")));

    // (9) 쓰기
    const modelSha = sha256(model);
    const portraitSha = sha256(portrait);
    const modelName = `${key}.${modelSha.slice(0, HASH_PREFIX)}.vrm`;
    const portraitName = `${key}.${portraitSha.slice(0, HASH_PREFIX)}.webp`;
    const reduction = reductionText(version, maxTexture);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, modelName), model);
    writeFileSync(join(outDir, portraitName), portrait);
    console.log(`모델 ${out}/${modelName} ${model.length}B sha256 ${modelSha}`);
    console.log(
      `초상 ${out}/${portraitName} ${portrait.length}B sha256 ${portraitSha}`,
    );
    console.log(`줄인 방법: ${reduction}`);

    if (write) {
      entry.model = {
        path: `${TEACHER_ASSET_DIR}/${modelName}`,
        bytes: model.length,
        sha256: modelSha,
      };
      entry.portrait = {
        path: `${TEACHER_ASSET_DIR}/${portraitName}`,
        bytes: portrait.length,
      };
      entry.source = { ...(entry.source ?? {}), reduction };
      writeFileSync(rosterPath, formatRoster(roster));
      for (const old of oldAssetFiles(readdirSync(outDir), key, [
        modelName,
        portraitName,
      ])) {
        unlinkSync(join(outDir, old));
        console.log(`옛 파일 지움: ${out}/${old}`);
      }
      console.log(`명단 고침: ${SEED_DIR}/${SEED_FILES.teachers} (${key})`);
    }
    return 0;
  } catch (error) {
    if (error instanceof ReduceError) {
      console.error(`teacher-reduce: ${error.message}`);
      return 2;
    }
    throw error;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectRun()) process.exitCode = main();
