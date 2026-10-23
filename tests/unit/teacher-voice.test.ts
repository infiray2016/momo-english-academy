// 선생님 목소리 고르기(plan 회화-선생님-캐릭터 값 12, AC-19j 단위 몫): 같은 언어(en-US) 목소리 가운데 순서 조각 차례로,
// 이름에 그 조각(대소문자 무시)이 든 첫 목소리. 없으면 undefined(부르는 쪽이 pickVoice).
import { describe, expect, it } from "vitest";
import { preferredVoice } from "@/core/teacher/voice";

const voices = [
  { name: "Daniel", lang: "en-GB" },
  { name: "Samantha", lang: "en-US" },
  { name: "Aaron", lang: "en_US" },
  { name: "Nicky (Enhanced)", lang: "EN-us" },
  { name: "Karen", lang: "en-AU" },
  { name: "Yuna", lang: "ko-KR" },
];

describe("선생님 목소리 고르기", () => {
  it("AC-19j 선생님 목소리 고르기: 순서 조각의 차례가 목소리 목록 차례보다 앞선다", () => {
    expect(preferredVoice(voices, "en-US", ["nicky", "samantha"])?.name).toBe(
      "Nicky (Enhanced)",
    );
    expect(preferredVoice(voices, "en-US", ["aaron", "nicky"])?.name).toBe(
      "Aaron",
    );
  });

  it("AC-19j 선생님 목소리 고르기: 첫 조각에 맞는 목소리가 없으면 다음 조각으로 간다", () => {
    expect(preferredVoice(voices, "en-US", ["zoe", "sAmAn"])?.name).toBe(
      "Samantha",
    );
  });

  it("AC-19j 선생님 목소리 고르기: 언어가 같은(소문자 · '_' 를 '-' 로) 목소리만 고르고 en-GB · en-AU 는 고르지 않는다", () => {
    expect(preferredVoice(voices, "en-US", ["daniel"])).toBeUndefined();
    expect(preferredVoice(voices, "en-US", ["karen"])).toBeUndefined();
    expect(preferredVoice(voices, "en_us", ["aaron"])?.name).toBe("Aaron");
  });

  it("AC-19j 선생님 목소리 고르기: 맞는 목소리가 없거나 순서가 비면 undefined 다", () => {
    expect(preferredVoice(voices, "en-US", ["zoe"])).toBeUndefined();
    expect(preferredVoice(voices, "en-US", [])).toBeUndefined();
    expect(preferredVoice([], "en-US", ["samantha"])).toBeUndefined();
  });

  it("AC-19j 선생님 목소리 고르기: 빈 조각은 아무 목소리에나 맞지 않게 건너뛴다", () => {
    expect(preferredVoice(voices, "en-US", [""])).toBeUndefined();
    expect(preferredVoice(voices, "en-US", ["", "aaron"])?.name).toBe("Aaron");
  });

  it("AC-19j 선생님 목소리 고르기: 받은 목소리 객체를 그대로 돌린다", () => {
    const picked = preferredVoice(voices, "en-US", ["samantha"]);
    expect(picked).toBe(voices[1]);
  });
});
