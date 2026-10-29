// 선생님 관찰 쪽 목소리 목록 꼴(선생님 화면 plan 값 16 — 요청자가 iPad 목소리 목록을 대화창에 붙여 넣어 리오 · 미나 목소리 순서를 정함).
import { describe, expect, it } from "vitest";
import {
  PROBE_TEXT,
  voiceListText,
  voiceRowsOf,
} from "../../src/app/dev/teacher-probe/probe-text";

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
