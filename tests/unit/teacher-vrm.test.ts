// VRM 머리글 읽기(plan 선생님 값 3 · AC-19k 의 순수 몫): GLB 풀기 · 묶기 되돌림, 머리 · 덩이 깨짐, VRM 0.x 사실 뽑기.
import { describe, expect, it } from "vitest";
import {
  VRM_REQUIRED_BONES,
  VRM_REQUIRED_EXPRESSIONS,
  VRM0_PRESET_TO_EXPRESSION,
} from "@/core/seed/structure";
import { buildGlb, parseGlb, vrmFactsOf } from "@/core/seed/vrm";
import {
  FAKE_CONDITIONS_URL,
  fakeVrm,
  fakeVrmBytes,
  rawGlb,
} from "../fixtures/seed/vrm";

describe("GLB 풀기 · 묶기", () => {
  it("AC-19k 가짜 VRM 을 풀면 JSON 과 BIN 이 나오고, 다시 묶으면 같은 JSON · BIN 으로 풀린다", () => {
    const { json, bin } = fakeVrm();
    const parsed = parseGlb(rawGlb(JSON.stringify(json), bin));
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.json).toEqual(json);
    expect([...parsed.bin.subarray(0, bin.length)]).toEqual([...bin]);

    const rebuilt = buildGlb(parsed.json, parsed.bin);
    expect(rebuilt.length % 4).toBe(0);
    const dv = new DataView(rebuilt.buffer, rebuilt.byteOffset);
    expect(dv.getUint32(8, true)).toBe(rebuilt.length);
    // JSON 덩이 길이도 4의 배수(공백으로 맞춤)
    expect(dv.getUint32(12, true) % 4).toBe(0);
    const again = parseGlb(rebuilt);
    if (!again.ok) throw new Error(again.reason);
    expect(again.json).toEqual(json);
    expect([...again.bin.subarray(0, bin.length)]).toEqual([...bin]);
  });

  it("AC-19k 머리 'glTF' · 판 2 · 첫 덩이 JSON · 둘째 덩이 BIN 이 아니거나 JSON 이 깨지면 이유와 함께 거부한다", () => {
    const { json, bin } = fakeVrm();
    const text = JSON.stringify(json);
    const cases: [string, Uint8Array][] = [
      ["짧음", new Uint8Array(8)],
      ["머리", rawGlb(text, bin, { magic: 0x12345678 })],
      ["판", rawGlb(text, bin, { version: 1 })],
      ["첫 덩이", rawGlb(text, bin, { firstChunk: 0x004e4942 })],
      ["BIN 없음", rawGlb(text, null)],
      ["JSON 깨짐", rawGlb("{ not json", bin)],
      ["JSON 이 객체 아님", rawGlb("[1, 2]", bin)],
    ];
    for (const [label, bytes] of cases) {
      const parsed = parseGlb(bytes);
      expect(parsed.ok, label).toBe(false);
      if (!parsed.ok) expect(parsed.reason, label).not.toBe("");
    }
    // 덩이 길이가 파일보다 길면 거부
    const good = rawGlb(text, bin);
    const cut = good.subarray(0, good.length - 4);
    expect(parseGlb(cut).ok).toBe(false);
  });
});

describe("VRM 사실", () => {
  it("AC-19k VRM 0.x 의 메타 · 표정(VRM 1.0 이름으로 바꿈) · 뼈를 뽑는다", () => {
    const facts = vrmFactsOf(fakeVrm().json);
    expect(facts.version).toBe("0.x");
    expect(facts.meta).toEqual({
      licenseName: "CC0",
      allowedUserName: "Everyone",
      commercialUssageName: "Allow",
      otherPermissionUrl: FAKE_CONDITIONS_URL,
      otherLicenseUrl: FAKE_CONDITIONS_URL,
      texture: 2,
    });
    // a → aa · i → ih · u → ou · e → ee · o → oh · joy → happy(three-vrm 의 VRM 0.x 이름 바꿈), unknown 은 이름 없는 사용자 표정이라 뺀다
    expect(facts.expressions).toEqual([
      "neutral",
      "aa",
      "ih",
      "ou",
      "ee",
      "oh",
      "blink",
      "happy",
    ]);
    for (const e of VRM_REQUIRED_EXPRESSIONS)
      expect(facts.expressions).toContain(e);
    expect(facts.bones).toEqual(["hips", "spine", "chest", "neck", "head"]);
    for (const b of VRM_REQUIRED_BONES) expect(facts.bones).toContain(b);
    expect(VRM0_PRESET_TO_EXPRESSION).toEqual({
      blink: "blink",
      joy: "happy",
      a: "aa",
      i: "ih",
      u: "ou",
      e: "ee",
      o: "oh",
    });
  });

  it("AC-19k VRM 1.0 은 판만 알리고(1-가 자산 검사가 거부), VRM 확장이 없으면 none 이다", () => {
    expect(vrmFactsOf(fakeVrm({ vrm1: true }).json).version).toBe("1.0");
    const none = vrmFactsOf(fakeVrm({ noVrm: true }).json);
    expect(none).toEqual({
      version: "none",
      meta: {},
      expressions: [],
      bones: [],
    });
    // 칸 꼴이 틀리면(문자열 아님) 그 칸만 비운다
    const { json } = fakeVrm();
    const ext = json.extensions as { VRM: { meta: Record<string, unknown> } };
    ext.VRM.meta.licenseName = 3;
    expect(vrmFactsOf(json).meta.licenseName).toBeUndefined();
  });

  it("AC-19k 풀기부터 사실까지 GLB 바이트 하나로 이어진다", () => {
    const parsed = parseGlb(fakeVrmBytes({ licenseName: "Other" }));
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(vrmFactsOf(parsed.json).meta.licenseName).toBe("Other");
  });
});
