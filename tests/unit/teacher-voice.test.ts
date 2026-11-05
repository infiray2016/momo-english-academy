// 선생님 목소리 고르기(plan 회화-선생님-캐릭터 값 12, AC-19j 단위 몫): 같은 언어(en-US) 목소리 가운데 순서 조각 차례로,
// 이름에 그 조각(대소문자 무시)이 든 첫 목소리. 없으면 undefined(부르는 쪽이 pickVoice).
// 쓰임별 목소리 고르기(가르치고 배우는 수업 spec 설계 4 · 10, AC-3h): 선생님 한국어 줄 · 선생님 영어 · 글 자료.
import { describe, expect, it } from "vitest";
import { speechSettingsFrom } from "@/core/speech/listen";
import { preferredVoice, voiceFor, voiceUseOf } from "@/core/teacher/voice";
import { testSettingValues } from "../fixtures/settings";

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

// 설계 숫자(한국어 빠르기 · 단계 빠르기)는 시험용 설정(12절 기본값)에서 읽는다
const values = testSettingValues();
const speech = speechSettingsFrom((key) => values[key]);
const device = (name: string, lang: string, isDefault = false) => ({
  name,
  lang,
  default: isDefault,
  localService: true,
});
const samantha = device("Samantha", "en-US", true);
const aaron = device("Aaron", "en-US");
const yuna = device("Yuna", "ko-KR");
const sora = device("Sora", "ko_KR", true);
const teacher = { pitch: 1.08, prefer: ["aaron"] };

describe("쓰임별 목소리 고르기(voiceFor)", () => {
  it("AC-3h 목소리 고르기: 선생님 한국어 줄은 ko-KR 가운데 기기 기본 목소리에 선생님 높이와 speech.rate_ko 를 얹는다", () => {
    expect(
      voiceFor({
        use: "teacher_ko",
        voices: [samantha, yuna, sora],
        teacher,
        rate: speech.rate["1-3"],
        speech,
      }),
    ).toEqual({
      kind: "speak",
      voice: sora,
      lang: "ko-KR",
      pitch: teacher.pitch,
      rate: speech.rateKo,
    });
  });

  it("AC-3h 목소리 고르기: ko-KR 기본 목소리가 없으면 첫 ko-KR, 그것도 없으면 읽지 않음(글로만)이다", () => {
    const first = voiceFor({
      use: "teacher_ko",
      voices: [samantha, yuna, { ...sora, default: false }],
      teacher,
      speech,
    });
    expect(first.kind === "speak" && first.voice).toBe(yuna);
    // 언어 앞부분만 같은 목소리(ko)는 ko-KR 이 아니다
    expect(
      voiceFor({
        use: "teacher_ko",
        voices: [samantha, device("Korean", "ko")],
        teacher,
        speech,
      }),
    ).toEqual({ kind: "skip", reason: "no_ko_voice" });
  });

  it("AC-3h 목소리 고르기: speech.read_ko 가 끔이면 ko-KR 목소리가 있어도 한국어 줄을 읽지 않는다", () => {
    expect(
      voiceFor({
        use: "teacher_ko",
        voices: [sora],
        teacher,
        speech: { ...speech, readKo: false },
      }),
    ).toEqual({ kind: "skip", reason: "read_ko_off" });
  });

  it("AC-3h 목소리 고르기: 선생님 한국어 줄은 고르기 전(선생님 없음)이면 기본 높이다", () => {
    const choice = voiceFor({ use: "teacher_ko", voices: [sora], speech });
    expect(choice).toEqual({
      kind: "speak",
      voice: sora,
      lang: "ko-KR",
      pitch: undefined,
      rate: speech.rateKo,
    });
  });

  it("AC-3h 목소리 고르기: 선생님 영어는 명단 목소리 순서의 en-US 목소리, 없으면 지금 목소리(pickVoice)이고 높이 · 넘긴 빠르기를 쓴다", () => {
    const rate = speech.rate["4-6"];
    expect(
      voiceFor({
        use: "teacher_en",
        voices: [samantha, aaron, sora],
        teacher,
        rate,
        speech,
      }),
    ).toEqual({
      kind: "speak",
      voice: aaron,
      lang: speech.lang,
      pitch: teacher.pitch,
      rate,
    });
    const fallback = voiceFor({
      use: "teacher_en",
      voices: [samantha, aaron],
      teacher: { pitch: teacher.pitch, prefer: ["zoe"] },
      rate,
      speech,
    });
    expect(fallback.kind === "speak" && fallback.voice).toBe(samantha);
  });

  it("AC-3h 목소리 고르기: 글 자료는 선생님과 관계없이 지금 목소리(pickVoice) · 기본 높이 · 넘긴 빠르기다", () => {
    const rate = speech.rate["7-9"];
    expect(
      voiceFor({
        use: "material",
        voices: [aaron, samantha, sora],
        teacher,
        rate,
        speech,
      }),
    ).toEqual({
      kind: "speak",
      voice: samantha,
      lang: speech.lang,
      pitch: undefined,
      rate,
    });
  });

  it("AC-3h 목소리 고르기: 한국어 lang 이면 선생님 한국어 줄, 선생님 높이나 목소리 순서가 있으면 선생님 영어, 없으면 글 자료다", () => {
    expect(voiceUseOf({ lang: "ko-KR", pitch: 1.08 })).toBe("teacher_ko");
    expect(voiceUseOf({ lang: "ko_kr" })).toBe("teacher_ko");
    expect(voiceUseOf({ pitch: 1.08 })).toBe("teacher_en");
    expect(voiceUseOf({ voicePrefer: [] })).toBe("teacher_en");
    expect(voiceUseOf({ lang: "en-US" })).toBe("material");
    expect(voiceUseOf({})).toBe("material");
  });
});
