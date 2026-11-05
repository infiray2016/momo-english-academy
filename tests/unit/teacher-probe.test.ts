// 선생님 관찰 쪽 목소리 목록 꼴(선생님 화면 plan 값 16 — 요청자가 iPad 목소리 목록을 대화창에 붙여 넣어 리오 · 미나 목소리 순서를 정함).
// 단원 바로 가기의 단계 고르기 · 단추 둘 · 결과 줄(회화 plan 정한 것 21 — 묶음 14-가).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/teacher-preview", () => ({}));

import { LEVEL_MAX, LEVEL_MIN } from "@/core/seed/structure";
import { previewLevels, previewUnitsOf } from "@/server/preview";
import {
  jumpLevelOf,
  jumpUnitOf,
  PROBE_TEXT,
  voiceListText,
  voiceRowsOf,
} from "../../src/app/dev/teacher-probe/probe-text";
import {
  JumpRow,
  type UnitsByLevel,
} from "../../src/app/dev/teacher-probe/teacher-probe";

const VOICES = [
  { name: "Yuna", lang: "ko-KR", default: true, localService: true },
  { name: "Samantha", lang: "en-US", default: false, localService: true },
  { name: "Daniel", lang: "en-GB", default: false, localService: false },
  {
    name: "Google US English",
    lang: "EN-us",
    default: false,
    localService: false,
  },
];

describe("관찰 쪽 목소리 목록", () => {
  it("AC-19b 관찰 쪽 목소리 목록: en 으로 시작하는 목소리만 기기 차례 그대로 남긴다(대소문자 무시)", () => {
    expect(voiceRowsOf(VOICES).map((r) => r.name)).toEqual([
      "Samantha",
      "Daniel",
      "Google US English",
    ]);
    expect(voiceRowsOf(VOICES)[1]).toEqual({
      name: "Daniel",
      lang: "en-GB",
      isDefault: false,
      local: false,
    });
  });

  it("AC-19b 관찰 쪽 목록 복사: 기기 줄 · 머리 줄 · 목소리마다 탭으로 가른 한 줄이고, 목소리가 없으면 없다는 줄이다", () => {
    expect(voiceListText(voiceRowsOf(VOICES), "UA-1").split("\n")).toEqual([
      "기기: UA-1",
      "이름\t언어\t기본\t기기 안",
      "Samantha\ten-US\t아니요\t예",
      "Daniel\ten-GB\t아니요\t아니요",
      "Google US English\tEN-us\t아니요\t아니요",
    ]);
    expect(voiceListText([], "UA-2").split("\n")).toEqual([
      "기기: UA-2",
      "이름\t언어\t기본\t기기 안",
      PROBE_TEXT.noVoices,
    ]);
  });
});

const LEVELS = previewLevels();
const unitsOf = (area: "reading" | "talk"): UnitsByLevel =>
  Object.fromEntries(LEVELS.map((l) => [l, previewUnitsOf(area, l)]));

function rowHtml(track: {
  area: "reading" | "talk";
  level: number | null;
  unit: number | null;
}) {
  return renderToStaticMarkup(
    createElement(JumpRow, {
      track,
      levels: LEVELS,
      units: unitsOf(track.area),
      busy: false,
      onJump: () => {},
    }),
  );
}

describe("관찰 쪽 단원 바로 가기(회화 plan 정한 것 21)", () => {
  it("AC-19b 단원 바로 가기 단계 고르기: 단계는 LEVEL_MIN~LEVEL_MAX 이고 처음 단계는 그 영역의 지금 단계, 배치 전이면 가장 낮은 단계다", () => {
    expect(LEVELS[0]).toBe(LEVEL_MIN);
    expect(LEVELS.at(-1)).toBe(LEVEL_MAX);
    expect(LEVELS).toHaveLength(LEVEL_MAX - LEVEL_MIN + 1);
    expect(jumpLevelOf(LEVELS, 3)).toBe(3);
    expect(jumpLevelOf(LEVELS, null)).toBe(LEVEL_MIN);

    const html = rowHtml({ area: "talk", level: 3, unit: 1 });
    expect(html).toContain(`aria-label="${PROBE_TEXT.levelPick("회화")}"`);
    expect(html.match(/<option /g)).toHaveLength(LEVELS.length);
    expect(html).toContain(
      `<option value="3" selected="">${PROBE_TEXT.levelOption(3)}</option>`,
    );
    const before = rowHtml({ area: "talk", level: null, unit: null });
    expect(before).toContain(
      `<option value="${LEVEL_MIN}" selected="">${PROBE_TEXT.levelOption(LEVEL_MIN)}</option>`,
    );
  });

  it("AC-19b 단원 바로 가기 단원 고르기: 고른 단계의 단원만 보이고(1단계 읽기는 알파벳 단원 0 포함), 지금 단원이 골라져 있으며 단계를 바꿔 없는 단원이면 첫 단원이다", () => {
    expect(previewUnitsOf("reading", 1)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(previewUnitsOf("reading", 3)).toEqual([1, 2, 3, 4, 5]);
    expect(previewUnitsOf("talk", 1)).toEqual([1, 2, 3, 4, 5]);
    expect(jumpUnitOf([1, 2, 3, 4, 5], 0)).toBe(1);
    expect(jumpUnitOf([0, 1, 2, 3, 4, 5], 4)).toBe(4);
    expect(jumpUnitOf([1, 2], null)).toBe(1);

    const html = rowHtml({ area: "talk", level: 3, unit: 2 });
    expect(html.match(/data-probe-unit="/g)).toHaveLength(5);
    expect(html).toMatch(
      new RegExp(
        `aria-label="${PROBE_TEXT.unitPick("회화", 2)}" aria-pressed="true"`,
      ),
    );
    expect(rowHtml({ area: "reading", level: 1, unit: 0 })).toContain(
      'data-probe-unit="0"',
    );
  });

  it("AC-19b 단원 바로 가기 단추 둘: '그 단원으로'(있는 회차 쓰기)와 '새 회차로 열기'가 영역 이름을 단 이름으로 있다", () => {
    const html = rowHtml({ area: "talk", level: 3, unit: 1 });
    expect(html).toContain(
      `aria-label="${PROBE_TEXT.jumpKeepLabel("회화")}" data-probe-jump="keep"`,
    );
    expect(html).toContain(
      `aria-label="${PROBE_TEXT.jumpNewLabel("회화")}" data-probe-jump="new"`,
    );
    expect(html).toContain(`>${PROBE_TEXT.jumpKeep}</button>`);
    expect(html).toContain(`>${PROBE_TEXT.jumpNew}</button>`);
    expect(PROBE_TEXT.jumpKeep).toBe("그 단원으로");
    expect(PROBE_TEXT.jumpNew).toBe("새 회차로 열기");
    expect(PROBE_TEXT.jumpNoSeed).toBe("자료가 없는 단원은 수업 목록이 비어요");
  });

  it("AC-19b 단원 바로 가기 결과 줄: 영역 · 단계 · 단원 · 회차 번호 · 시작 개정 · 새로 열었는지를 적는다", () => {
    expect(
      PROBE_TEXT.jumped("회화", {
        level: 3,
        unit: 1,
        round: 2,
        startRevision: 3,
        started: true,
      }),
    ).toBe(
      "바꿨어요 — 회화 3단계 · 단원 1 · 회차 2 · 시작 개정 3 · 새로 열었어요",
    );
    expect(
      PROBE_TEXT.jumped("읽기", {
        level: 1,
        unit: 0,
        round: 1,
        startRevision: 1,
        started: false,
      }),
    ).toBe(
      "바꿨어요 — 읽기 1단계 · 단원 0 · 회차 1 · 시작 개정 1 · 있던 회차예요",
    );
  });
});
