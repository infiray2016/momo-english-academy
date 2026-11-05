// 막힘 단추 차례 · 문구 모듈(UI · UX plan 묶음 2-가 보탬 · 0-나 검토 M1). 앱 오류 화면 · 없는 주소 판(R-52)은 루트 오류 경계로 모든 쪽에
// 걸리므로, 단추 차례(stuckButtonsOf)와 막힘 문구를 의존 없는 작은 모듈에서 가져와 음성 층(mic-state → lib/speech/browser)을 들이지 않는다.
// 막힘 판(mic-blocked)은 같은 값을 그대로 내보내 쓰는 쪽과 시험이 바뀌지 않는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));

import * as micBlocked from "@/components/session/mic-blocked";
import * as stuck from "@/components/session/stuck-buttons";

const source = (path: string) =>
  readFileSync(join(process.cwd(), "src", path), "utf8");
const importsOf = (text: string) =>
  [...text.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);

describe("막힘 단추 차례 · 문구 모듈(R-52 · AC-23g)", () => {
  it("AC-23g 단추 차례 · 막힘 문구 모듈은 아무것도 들이지 않고, 막힘 판이 같은 값을 그대로 내보낸다", () => {
    expect(importsOf(source("components/session/stuck-buttons.ts"))).toEqual(
      [],
    );
    expect(micBlocked.MIC_BLOCKED_TEXT).toBe(stuck.MIC_BLOCKED_TEXT);
    expect(micBlocked.stuckButtonsOf).toBe(stuck.stuckButtonsOf);
    expect(stuck.stuckButtonsOf("blocked")).toEqual({
      big: "retry",
      small: "home",
    });
    expect(stuck.stuckButtonsOf("resting")).toEqual({
      big: "home",
      small: "retry",
    });
  });

  it("AC-23g 앱 오류 화면 · 없는 주소 판은 막힘 판(음성 층을 들이는 모듈)을 들이지 않는다", () => {
    const imports = importsOf(source("components/session/app-trouble.tsx"));
    expect(imports).toContain("@/components/session/stuck-buttons");
    expect(imports).not.toContain("@/components/session/mic-blocked");
    expect(imports.filter((m) => /speech|mic-state/.test(m))).toEqual([]);
  });
});
