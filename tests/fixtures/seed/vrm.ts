// 가짜 VRM(GLB) 견본 — 줄이기 스크립트 · VRM 머리글 읽기 · 자산 검사 단위 시험이 같이 쓴다(plan 선생님 값 1 · 3 · 4).
// GLB 바이트는 src 의 buildGlb 를 쓰지 않고 여기서 직접 짠다(풀기 · 묶기 시험이 제 결과를 견주지 않게).
// 그림 셋(0 색 · 1 법선 · 2 썸네일)과 accessor 가 쓰는 bufferView 하나(3), VRM 0.x 확장(메타 · 표정 · 뼈 · 머티리얼)을 둔다.

/** GLB 형식 상수(glTF 2.0 규격, 설계 숫자 아님). */
const MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

const pad4 = (n: number) => (4 - (n % 4)) % 4;

/** JSON 글과 BIN 바이트로 GLB 를 직접 짠다(덩이 꼴을 깨뜨리는 시험용 선택 포함). */
export function rawGlb(
  jsonText: string,
  bin: Uint8Array | null,
  options: { magic?: number; version?: number; firstChunk?: number } = {},
): Uint8Array {
  const json = new TextEncoder().encode(jsonText);
  const jsonLen = json.length + pad4(json.length);
  const binLen = bin ? bin.length + pad4(bin.length) : 0;
  const total = 12 + 8 + jsonLen + (bin ? 8 + binLen : 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, options.magic ?? MAGIC, true);
  dv.setUint32(4, options.version ?? 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jsonLen, true);
  dv.setUint32(16, options.firstChunk ?? JSON_CHUNK, true);
  out.set(json, 20);
  out.fill(0x20, 20 + json.length, 20 + jsonLen);
  if (bin) {
    const at = 20 + jsonLen;
    dv.setUint32(at, binLen, true);
    dv.setUint32(at + 4, BIN_CHUNK, true);
    out.set(bin, at + 8);
  }
  return out;
}

export const FAKE_CONDITIONS_URL = "https://hub.vroid.com/license?fixture=1";

/** 그림 · accessor 자리 바이트(길이가 4의 배수가 아니게 — 다시 놓을 때 맞춤을 본다). */
export const FAKE_IMAGES = {
  color: new Uint8Array([1, 1, 1, 1, 1]),
  normal: new Uint8Array([2, 2, 2]),
  thumbnail: new Uint8Array([3, 3, 3, 3, 3, 3, 3]),
} as const;
export const FAKE_ACCESSOR_BYTES = new Uint8Array([
  9, 9, 9, 9, 8, 8, 8, 8, 7, 7, 7, 7,
]);

export type FakeVrmOptions = {
  licenseName?: string;
  allowedUserName?: string;
  commercialUssageName?: string;
  otherPermissionUrl?: string;
  otherLicenseUrl?: string;
  presets?: string[];
  bones?: string[];
  /** VRM 0.x 대신 VRM 1.0(VRMC_vrm) 확장. */
  vrm1?: boolean;
  /** VRM 확장 없음. */
  noVrm?: boolean;
};

/** 가짜 VRM 0.x JSON 과 BIN(bufferView 0 색 · 1 법선 · 2 썸네일 · 3 accessor, 4바이트 맞춤 없이 이어 붙임). */
export function fakeVrm(options: FakeVrmOptions = {}): {
  json: Record<string, unknown>;
  bin: Uint8Array;
} {
  const parts = [
    FAKE_IMAGES.color,
    FAKE_IMAGES.normal,
    FAKE_IMAGES.thumbnail,
    FAKE_ACCESSOR_BYTES,
  ];
  const bufferViews: {
    buffer: number;
    byteOffset: number;
    byteLength: number;
  }[] = [];
  let offset = 0;
  for (const p of parts) {
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: p.length });
    offset += p.length;
  }
  const bin = new Uint8Array(offset);
  let at = 0;
  for (const p of parts) {
    bin.set(p, at);
    at += p.length;
  }
  const meta = {
    title: "fixture",
    author: "VRoid Project",
    texture: 2,
    allowedUserName: options.allowedUserName ?? "Everyone",
    commercialUssageName: options.commercialUssageName ?? "Allow",
    licenseName: options.licenseName ?? "CC0",
    otherPermissionUrl: options.otherPermissionUrl ?? FAKE_CONDITIONS_URL,
    otherLicenseUrl: options.otherLicenseUrl ?? FAKE_CONDITIONS_URL,
  };
  const presets = options.presets ?? [
    "neutral",
    "a",
    "i",
    "u",
    "e",
    "o",
    "blink",
    "joy",
    "unknown",
  ];
  const bones = options.bones ?? ["hips", "spine", "chest", "neck", "head"];
  const vrm0 = {
    exporterVersion: "fixture",
    meta,
    humanoid: { humanBones: bones.map((bone, node) => ({ bone, node })) },
    blendShapeMaster: {
      blendShapeGroups: presets.map((presetName) => ({
        name: presetName === "unknown" ? "Custom" : presetName,
        presetName,
        binds: [],
      })),
    },
    materialProperties: [
      {
        name: "body",
        shader: "VRM/MToon",
        textureProperties: { _MainTex: 0, _ShadeTexture: 0, _BumpMap: 1 },
      },
    ],
  };
  const extensions: Record<string, unknown> = options.noVrm
    ? {}
    : options.vrm1
      ? {
          VRMC_vrm: {
            specVersion: "1.0",
            meta: { name: "fixture", licenseUrl: FAKE_CONDITIONS_URL },
            humanoid: {
              humanBones: Object.fromEntries(
                bones.map((bone, node) => [bone, { node }]),
              ),
            },
            expressions: {
              preset: { blink: {}, happy: {}, aa: {}, oh: {}, ee: {} },
            },
          },
        }
      : { VRM: vrm0 };
  const json: Record<string, unknown> = {
    asset: { version: "2.0", generator: "fixture" },
    extensionsUsed: ["KHR_materials_unlit", options.vrm1 ? "VRMC_vrm" : "VRM"],
    extensions,
    buffers: [{ byteLength: bin.length }],
    bufferViews,
    accessors: [{ bufferView: 3, componentType: 5126, count: 1, type: "VEC3" }],
    images: [
      { name: "body_col", bufferView: 0, mimeType: "image/png" },
      { name: "body_nml", bufferView: 1, mimeType: "image/png" },
      { name: "thumbnail", bufferView: 2, mimeType: "image/png" },
    ],
    samplers: [{ magFilter: 9729, minFilter: 9729 }],
    textures: [
      { sampler: 0, source: 0 },
      { sampler: 0, source: 1 },
      { sampler: 0, source: 2 },
    ],
    materials: [
      {
        name: "body",
        pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
        normalTexture: { index: 1 },
        extensions: { KHR_materials_unlit: {} },
      },
    ],
  };
  return { json, bin };
}

/** 가짜 VRM 을 GLB 바이트로. */
export function fakeVrmBytes(options: FakeVrmOptions = {}): Uint8Array {
  const { json, bin } = fakeVrm(options);
  return rawGlb(JSON.stringify(json), bin);
}
