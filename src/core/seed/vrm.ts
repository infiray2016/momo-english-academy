// VRM(GLB) 머리글 읽기 — 줄이기 스크립트(scripts/teacher-reduce.ts)와 자산 검사(check-teacher.ts)가 같이 쓴다(plan 선생님 값 3 · 6.4 자산 검사).
// GLB 를 JSON · BIN 덩이로 풀고 다시 묶으며, VRM 확장에서 메타 · 표정 · 뼈를 뽑는다. 파일 · 프로세스를 읽지 않는 순수 함수다.
import { VRM0_PRESET_TO_EXPRESSION } from "@/core/seed/structure";

/** GLB 형식 상수(glTF 2.0 규격 'GLB File Format' — 설계 숫자 아님). */
const GLB = {
  /** 머리 'glTF'(작은 끝). */
  magic: 0x46546c67,
  version: 2,
  headerBytes: 12,
  chunkHeaderBytes: 8,
  jsonChunk: 0x4e4f534a,
  binChunk: 0x004e4942,
  align: 4,
  jsonPad: 0x20,
  /** 머리 안 자리: 판 · 전체 길이. 덩이 머리 안 자리: 종류(길이는 0). */
  versionAt: 4,
  lengthAt: 8,
  chunkTypeAt: 4,
} as const;

/** glTF JSON(이 모듈 · 줄이기 스크립트가 읽고 고치는 칸만 형을 둔다). */
export type GltfJson = {
  [key: string]: unknown;
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  extensions?: Record<string, unknown>;
  buffers?: { byteLength: number; uri?: string }[];
  bufferViews?: {
    buffer: number;
    byteOffset?: number;
    byteLength: number;
    [key: string]: unknown;
  }[];
  images?: {
    bufferView?: number;
    mimeType?: string;
    uri?: string;
    name?: string;
  }[];
  textures?: {
    source?: number;
    sampler?: number;
    extensions?: Record<string, unknown>;
  }[];
};

export type ParsedGlb =
  | { ok: true; json: GltfJson; bin: Uint8Array }
  | { ok: false; reason: string };

const padOf = (n: number) => (GLB.align - (n % GLB.align)) % GLB.align;

/** GLB 를 JSON(첫 덩이) · BIN(둘째 덩이)으로 푼다. BIN 은 덩이 내용 그대로(끝 맞춤 0 포함)다. */
export function parseGlb(bytes: Uint8Array): ParsedGlb {
  if (bytes.length < GLB.headerBytes + GLB.chunkHeaderBytes)
    return { ok: false, reason: "GLB 머리보다 짧다" };
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== GLB.magic)
    return { ok: false, reason: "머리가 'glTF' 가 아니다" };
  const version = dv.getUint32(GLB.versionAt, true);
  if (version !== GLB.version)
    return { ok: false, reason: `GLB 판 ${version} 은 2 가 아니다` };
  const total = dv.getUint32(GLB.lengthAt, true);
  if (total > bytes.length)
    return {
      ok: false,
      reason: `머리의 길이 ${total} 가 파일 ${bytes.length} 보다 길다`,
    };

  const chunkAt = (at: number) => {
    if (at + GLB.chunkHeaderBytes > total) return undefined;
    const length = dv.getUint32(at, true);
    const type = dv.getUint32(at + GLB.chunkTypeAt, true);
    const start = at + GLB.chunkHeaderBytes;
    if (start + length > total) return null;
    return { type, start, length };
  };
  const first = chunkAt(GLB.headerBytes);
  if (!first) return { ok: false, reason: "첫 덩이가 잘렸다" };
  if (first.type !== GLB.jsonChunk)
    return { ok: false, reason: "첫 덩이가 JSON 이 아니다" };
  let json: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true })
      .decode(bytes.subarray(first.start, first.start + first.length))
      .replace(/\0+$/, "");
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: "JSON 덩이를 읽을 수 없다" };
  }
  if (typeof json !== "object" || json === null || Array.isArray(json))
    return { ok: false, reason: "JSON 덩이가 객체가 아니다" };
  const second = chunkAt(first.start + first.length);
  if (second === undefined) return { ok: false, reason: "BIN 덩이가 없다" };
  if (second === null) return { ok: false, reason: "BIN 덩이가 잘렸다" };
  if (second.type !== GLB.binChunk)
    return { ok: false, reason: "둘째 덩이가 BIN 이 아니다" };
  return {
    ok: true,
    json: json as GltfJson,
    bin: bytes.subarray(second.start, second.start + second.length),
  };
}

/** JSON · BIN 을 GLB 로 묶는다(JSON 은 공백, BIN 은 0 으로 4바이트 맞춤). */
export function buildGlb(json: GltfJson, bin: Uint8Array): Uint8Array {
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jsonLen = text.length + padOf(text.length);
  const binLen = bin.length + padOf(bin.length);
  const total = GLB.headerBytes + GLB.chunkHeaderBytes * 2 + jsonLen + binLen;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, GLB.magic, true);
  dv.setUint32(GLB.versionAt, GLB.version, true);
  dv.setUint32(GLB.lengthAt, total, true);
  let at = GLB.headerBytes;
  dv.setUint32(at, jsonLen, true);
  dv.setUint32(at + GLB.chunkTypeAt, GLB.jsonChunk, true);
  at += GLB.chunkHeaderBytes;
  out.set(text, at);
  out.fill(GLB.jsonPad, at + text.length, at + jsonLen);
  at += jsonLen;
  dv.setUint32(at, binLen, true);
  dv.setUint32(at + GLB.chunkTypeAt, GLB.binChunk, true);
  at += GLB.chunkHeaderBytes;
  out.set(bin, at);
  return out;
}

export type VrmMeta = {
  licenseName?: string;
  allowedUserName?: string;
  commercialUssageName?: string;
  otherPermissionUrl?: string;
  otherLicenseUrl?: string;
  /** 썸네일 텍스처 차례(VRM 0.x meta.texture). */
  texture?: number;
};

export type VrmFacts = {
  version: "0.x" | "1.0" | "none";
  /** VRM 0.x 메타(1.0 · none 은 비움 — 1-가 명단은 0.x 만). */
  meta: VrmMeta;
  /** 표정 이름(VRM 1.0 이름, 0.x 프리셋은 VRM0_PRESET_TO_EXPRESSION 로 바꿈). */
  expressions: string[];
  /** 사람 뼈 이름. */
  bones: string[];
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const recordsOf = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter(isRecord) : [];
const stringOf = (v: unknown) => (typeof v === "string" ? v : undefined);

/** VRM 0.x 의 이름 없는 사용자 표정 프리셋(그룹 이름으로만 구분 — 표정 이름으로 세지 않는다). */
const VRM0_CUSTOM_PRESET = "unknown";

/** VRM 확장에서 판 · 메타 · 표정 · 뼈를 뽑는다. 칸 꼴이 틀리면 그 칸만 비운다. */
export function vrmFactsOf(json: GltfJson): VrmFacts {
  const ext = isRecord(json.extensions) ? json.extensions : {};
  const v0 = ext.VRM;
  if (isRecord(v0)) {
    const m = isRecord(v0.meta) ? v0.meta : {};
    const meta: VrmMeta = {};
    for (const key of [
      "licenseName",
      "allowedUserName",
      "commercialUssageName",
      "otherPermissionUrl",
      "otherLicenseUrl",
    ] as const) {
      const value = stringOf(m[key]);
      if (value !== undefined) meta[key] = value;
    }
    if (typeof m.texture === "number") meta.texture = m.texture;
    const master = isRecord(v0.blendShapeMaster) ? v0.blendShapeMaster : {};
    const expressions = recordsOf(master.blendShapeGroups)
      .map((g) => stringOf(g.presetName))
      .filter(
        (p): p is string =>
          p !== undefined && p !== "" && p !== VRM0_CUSTOM_PRESET,
      )
      .map((p) => VRM0_PRESET_TO_EXPRESSION[p] ?? p);
    const humanoid = isRecord(v0.humanoid) ? v0.humanoid : {};
    const bones = recordsOf(humanoid.humanBones)
      .map((b) => stringOf(b.bone))
      .filter((b): b is string => b !== undefined);
    return { version: "0.x", meta, expressions, bones };
  }
  const v1 = ext.VRMC_vrm;
  if (isRecord(v1)) {
    const expressions = isRecord(v1.expressions) ? v1.expressions : {};
    const humanoid = isRecord(v1.humanoid) ? v1.humanoid : {};
    return {
      version: "1.0",
      meta: {},
      expressions: isRecord(expressions.preset)
        ? Object.keys(expressions.preset)
        : [],
      bones: isRecord(humanoid.humanBones)
        ? Object.keys(humanoid.humanBones)
        : [],
    };
  }
  return { version: "none", meta: {}, expressions: [], bones: [] };
}
