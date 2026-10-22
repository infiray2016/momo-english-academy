// 쓰기 4~5 문장 틀 · 고칠 곳(plan-p11b 값 7 · 3.3 쓰기 4~5 행). 화면과 서버가 같은 함수로 문장을 만들고 고칠 곳 자리를 찾는다.
import { describe, expect, it } from "vitest";
import { INPUT_JSON_MAX, parseAttemptInput } from "@/core/session/attempt";
import {
  applyFix,
  assembleSentence,
  BLANK_TEXT_MAX,
  fixSpotOf,
  frameBlanks,
  ownRepeatStopOf,
} from "@/core/writing/guided";
import {
  defaultSettings,
  referenceSet,
  writingLesson,
} from "../fixtures/seed/builders";

const sample = writingLesson(referenceSet(defaultSettings()), 4).lesson;

describe("쓰기 4~5 문장 틀", () => {
  it("문장 틀: 빈칸(밑줄 셋 이상) 수를 세고 채운 낱말로 온 문장을 만든다 — 견본 4단계 모범 문장과 같다", () => {
    expect(frameBlanks("I like the ___ and the ___.")).toBe(2);
    expect(frameBlanks("It is very _____.")).toBe(1);
    expect(frameBlanks("No blank here.")).toBe(0);
    expect(
      assembleSentence("I like the ___ and the ___.", ["cat", "dog"]),
    ).toBe("I like the cat and the dog.");
    // 덜 채운 빈칸은 빈 글 · 앞뒤 빈칸은 다듬는다
    expect(assembleSentence("We can ___ with Momo.", [" run "])).toBe(
      "We can run with Momo.",
    );
    if (sample.content.shape !== "guided") throw new Error("견본 꼴");
    for (const s of sample.content.sentences) {
      // 모범 문장의 빈칸 자리 낱말을 단어 상자 앞 낱말들로 채우면 모범 문장이 된다
      const words = (s.wordBox ?? []).slice(0, frameBlanks(s.frame));
      expect(assembleSentence(s.frame, words)).toBe(s.model);
    }
  });

  it("고칠 곳: 아이 문장에서 원문 자리를 대소문자 없이 찾고 바른 말로 바꾼다 — 없으면 바꾸지 않는다", () => {
    expect(fixSpotOf("He like apples.", "he like")).toBe(0);
    expect(fixSpotOf("I like apples.", "likes")).toBe(-1);
    expect(applyFix("He like apples.", "He like", "He likes")).toBe(
      "He likes apples.",
    );
    expect(applyFix("We can swim with Momo.", "SWIM", "run")).toBe(
      "We can run with Momo.",
    );
    expect(applyFix("I like apples.", "likes", "like")).toBe("I like apples.");
  });

  it("빈칸 글자 상한: 견본 문장 틀의 빈칸을 모두 상한만큼 채워도 쓰기 확인 시도 꼴 상한 안이다", () => {
    if (sample.content.shape !== "guided") throw new Error("견본 꼴");
    const full = "x".repeat(BLANK_TEXT_MAX);
    // 견본 문장을 두 번 이어 붙여(문장 · 빈칸 수 두 배) 실시드의 많은 쪽을 덮는다
    const frames = [...sample.content.sentences, ...sample.content.sentences];
    const sentences = frames.map((s) =>
      assembleSentence(
        s.frame,
        Array.from({ length: frameBlanks(s.frame) }, () => full),
      ),
    );
    const input = { v: 1, kind: "writing-guided", step: "final", sentences };
    expect(JSON.stringify(input).length).toBeLessThan(INPUT_JSON_MAX);
    expect(parseAttemptInput(input)).toBeDefined();
  });

  it("내 문장 말하기: 마이크를 쓸 수 없음은 기기 상태를 남기고 이 활동만 건너뛰며 멈춤 · 말소리 없음은 건너뛰기만, 그 밖은 그대로다", () => {
    expect(ownRepeatStopOf("mic-unavailable")).toEqual({ markDevice: true });
    expect(ownRepeatStopOf("mic-stalled")).toEqual({ markDevice: false });
    expect(ownRepeatStopOf("speech-silent")).toEqual({ markDevice: false });
    for (const verdict of [
      "heard",
      "retry",
      "skip",
      "offline",
      "none",
    ] as const)
      expect(ownRepeatStopOf(verdict)).toBeUndefined();
  });
});
