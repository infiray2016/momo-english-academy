// 회화 듣기 끝 규칙 · 인식 확인 · 이름 묻기 턴 가림(plan-p13a 파일별 값 11, 7절 · 4절 인식 확인 행 · 6.1 · C7 · C23 · C37).
// 초 · 일치율은 시험용 설정에서 읽는다. 동음이의어는 시드 목록 그대로.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  confirmPlanOf,
  maskNameAnswer,
  TALK_SLOW_READ_UNTIL_LEVEL,
  talkEndRuleFor,
  talkSpeakRateOf,
  talkSpeechSettingsFrom,
} from "@/core/conversation/listen";
import { HomophonesFileSchema } from "@/core/seed/schema/reference";
import { speechSettingsFrom } from "@/core/speech/listen";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const read = (key: string) => values[key];
const speech = speechSettingsFrom(read);
const talk = talkSpeechSettingsFrom(read);
const ms = (key: string) => (values[key] as number) * 1000;
const HOMOPHONES = HomophonesFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/homophones.json"), "utf8"),
  ),
).groups;

describe("회화 듣기 끝 규칙(C7 · C37)", () => {
  it("AC-5e 회화 4단계 한 문장 답은 speech.end_silence_seconds.talk.4-6 조용하면 끝나는 규칙이다", () => {
    expect(
      talkEndRuleFor({ level: 4, mode: "dialogue" }, speech, talk),
    ).toEqual({
      endSilenceMs: ms("speech.end_silence_seconds.talk.4-6"),
      capMs: speech.maxListenMs,
      chunkMs: speech.maxListenMs,
    });
    // 오늘 쓸 말 · 말해 보기 · 정리의 따라 말하기도 회화 구간 값
    expect(
      talkEndRuleFor({ level: 2, mode: "follow" }, speech, talk).endSilenceMs,
    ).toBe(ms("speech.end_silence_seconds.talk.1-3"));
    // 말하기 영역 값과 다르다
    expect(ms("speech.end_silence_seconds.talk.4-6")).not.toBe(
      ms("speech.end_silence_seconds.4-6"),
    );
  });

  it("AC-5e 회화 8단계 대화 답은 speech.end_silence_seconds.talk_long 조용함 · 말하기 버튼 · talk.max_answer_seconds 로 끝나고 8단계 평가 대화 답은 speech.end_silence_seconds.talk.7-9 로 끝난다", () => {
    expect(
      talkEndRuleFor({ level: 8, mode: "dialogue" }, speech, talk),
    ).toEqual({
      endSilenceMs: ms("speech.end_silence_seconds.talk_long"),
      capMs: ms("talk.max_answer_seconds"),
      chunkMs: speech.maxListenMs,
    });
    expect(talkEndRuleFor({ level: 8, mode: "test" }, speech, talk)).toEqual({
      endSilenceMs: ms("speech.end_silence_seconds.talk.7-9"),
      capMs: speech.maxListenMs,
      chunkMs: speech.maxListenMs,
    });
    expect(
      talkEndRuleFor({ level: 7, mode: "dialogue" }, speech, talk).endSilenceMs,
    ).toBe(ms("speech.end_silence_seconds.talk.7-9"));
    expect(
      talkEndRuleFor({ level: 12, mode: "follow" }, speech, talk).endSilenceMs,
    ).toBe(ms("speech.end_silence_seconds.talk.10-12"));
  });

  it("회화 듣기: 설정 키가 없거나 꼴이 틀리면 던진다", () => {
    expect(() => talkSpeechSettingsFrom(() => undefined)).toThrow();
    expect(() =>
      talkSpeechSettingsFrom((key) =>
        key === "speech.end_silence_seconds.talk_long" ? 0 : read(key),
      ),
    ).toThrow();
  });
});

describe("회화 인식 확인(C23 · 4절)", () => {
  const base = {
    lowLevel: true,
    matchPass: values["talk.hint_read_match"] as number,
    homophones: HOMOPHONES,
    confirmMs: ms("talk.confirm_seconds"),
  };

  it("회화 듣기: 1~3단계 인식 글이 연 영어 문장 힌트나 들려준 답과 talk.hint_read_match 이상 맞으면 확인 없이 보내고 {NAME} 자리는 빼고 견준다", () => {
    expect(
      confirmPlanOf({
        ...base,
        heard: "I like apples",
        openedSentence: "I like apples.",
      }),
    ).toEqual({ autoSend: true, bigRetry: false, waitMs: 0 });
    expect(
      confirmPlanOf({
        ...base,
        heard: "I'm ten",
        heardAnswers: ["I'm nine.", "I'm ten."],
      }),
    ).toEqual({ autoSend: true, bigRetry: false, waitMs: 0 });
    // {NAME} 자리는 뺀다: 'My name is {NAME}.' 에 아무 이름이나 와도 맞음
    expect(
      confirmPlanOf({
        ...base,
        heard: "my name is momo",
        openedSentence: "My name is {NAME}.",
      }).autoSend,
    ).toBe(true);
    // 연 힌트 · 들은 답과 맞지 않으면 기다리고 '다시 말하기'를 크게
    expect(
      confirmPlanOf({
        ...base,
        heard: "I like dogs and cats",
        openedSentence: "I like apples.",
      }),
    ).toEqual({ autoSend: false, bigRetry: true, waitMs: base.confirmMs });
    // 연 힌트 · 들은 답이 없으면 4단계부터와 같다
    const plain = { autoSend: false, bigRetry: false, waitMs: base.confirmMs };
    expect(confirmPlanOf({ ...base, heard: "I like apples" })).toEqual(plain);
    expect(
      confirmPlanOf({
        ...base,
        lowLevel: false,
        heard: "I like apples",
        openedSentence: "I like apples.",
      }),
    ).toEqual(plain);
    // 견줄 낱말이 없는 힌트({NAME} 하나)는 맞음으로 보지 않는다
    expect(
      confirmPlanOf({ ...base, heard: "momo", openedSentence: "{NAME}." }),
    ).toEqual({ autoSend: false, bigRetry: true, waitMs: base.confirmMs });
  });
});

describe("이름 묻기 턴 가림(6.1)", () => {
  it("AC-16b 영어 이름이 Minjun 일 때 이름 묻기 턴의 인식 결과 'my name is min jun' 은 'my name is {NAME}' 이 된다", () => {
    expect(
      maskNameAnswer("my name is min jun", {
        templates: ["My name is {NAME}.", "I'm {NAME}."],
      }),
    ).toBe("my name is {NAME}");
  });

  it("회화 듣기: 이름 묻기 턴 가림은 {NAME} 틀 자리 낱말만 바꾸고 이름 아닌 낱말과 틀이 없는 턴은 그대로 둔다", () => {
    const templates = [
      "My name is {NAME}.",
      "I'm {NAME}.",
      "Call me {NAME}, please.",
    ];
    expect(maskNameAnswer("I'm Momo", { templates })).toBe("I'm {NAME}");
    expect(maskNameAnswer("call me Tori please", { templates })).toBe(
      "call me {NAME} please",
    );
    expect(maskNameAnswer("My name is Momo.", { templates })).toBe(
      "My name is {NAME}.",
    );
    expect(maskNameAnswer("I like apples", { templates })).toBe(
      "I like apples",
    );
    expect(maskNameAnswer("my name is", { templates })).toBe("my name is");
    expect(
      maskNameAnswer("my name is Momo", { templates: ["I like it."] }),
    ).toBe("my name is Momo");
  });
});

describe("회화 읽어 주기 빠르기(C96)", () => {
  it("회화 읽어 주기: 1~2단계는 speech.slow_rate 로 천천히, 3단계부터는 기본 빠르기로 읽는다", () => {
    const slow = values["speech.slow_rate"] as number;
    expect(talk.slowRate).toBe(slow);
    for (let level = 1; level <= TALK_SLOW_READ_UNTIL_LEVEL; level++)
      expect(talkSpeakRateOf(level, talk)).toBe(slow);
    expect(
      talkSpeakRateOf(TALK_SLOW_READ_UNTIL_LEVEL + 1, talk),
    ).toBeUndefined();
    expect(() =>
      talkSpeechSettingsFrom((key) =>
        key === "speech.slow_rate" ? undefined : read(key),
      ),
    ).toThrow();
  });
});
