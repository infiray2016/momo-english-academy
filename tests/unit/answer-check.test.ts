// 답 맞춤(plan-p10a 파일별 값 10 · 정할 것 차 · 카 · 13절 C73). 앱이 채점하는 갈래 모두 — 맞음 · 틀림 · 몰라요 · 정규화.
// 일치율 기준(placement.repeat_pass)은 시험용 설정에서 읽고, 일치율 값은 P2a 함수로 계산해 단언한다(위험 16).
import { describe, expect, it } from "vitest";
import {
  type Answer,
  type CheckItem,
  checkAnswer,
  joinCards,
  normalizeTyped,
} from "@/core/answer/check";
import { matchRate } from "@/core/speech/match-rate";
import { TEST_SETTINGS } from "../fixtures/settings";

const REPEAT_PASS = TEST_SETTINGS["placement.repeat_pass"].value;
const opts = { repeatPass: REPEAT_PASS, homophones: [] };
const ok = (item: CheckItem, answer: Answer) =>
  checkAnswer(item, answer, opts).correct;

describe("답 맞춤", () => {
  it("답 맞춤: 고르기 · 타일 · 카드(문장 부호 카드 붙임) · 쓴 답(공백 · 따옴표만 맞춤) · 따라 말하기 · 몰라요", () => {
    // 고르기(읽기 그림 · 글 보기 · pick-word · 듣고 고르기): 고른 번호 = answerNo
    for (const type of ["picture", "fact", "pick-word", "listening"] as const) {
      const item = { type, answerNo: 2 } as CheckItem;
      expect(ok(item, { kind: "choice", no: 2 })).toBe(true);
      expect(ok(item, { kind: "choice", no: 1 })).toBe(false);
    }
    // 글자 타일: 놓은 글자를 이은 낱말이 허용 정답 하나와 같다
    const copy: CheckItem = { type: "copy-tiles", accepted: ["cat"] };
    expect(ok(copy, { kind: "tiles", pieces: ["c", "a", "t"] })).toBe(true);
    expect(ok(copy, { kind: "tiles", pieces: ["a", "c", "t"] })).toBe(false);
    // 카드: 문장 부호 카드는 앞 카드에 붙인다
    const sentence: CheckItem = {
      type: "assemble-sentence",
      accepted: ["I like apples."],
    };
    expect(
      ok(sentence, { kind: "tiles", pieces: ["I", "like", "apples", "."] }),
    ).toBe(true);
    // 쓴 답: 앞뒤 공백 · 겹 빈칸 · 굽은 따옴표만 맞춘다
    const fix: CheckItem = {
      type: "fix-sentence",
      accepted: ["It's my dog."],
    };
    expect(ok(fix, { kind: "text", text: "  It’s  my dog. " })).toBe(true);
    // 따라 말하기: 시도 가운데 가장 높은 일치율이 기준 이상
    const repeat: CheckItem = { type: "repeat", sentence: "I see a red ball" };
    expect(ok(repeat, { kind: "repeat", heard: ["I see a red ball"] })).toBe(
      true,
    );
    // 몰라요는 모두 틀림
    for (const item of [copy, sentence, fix, repeat]) {
      expect(checkAnswer(item, { kind: "dont-know" }, opts)).toEqual({
        correct: false,
        detail: expect.objectContaining({ reason: "dont-know" }),
      });
    }
  });

  it("답 맞춤: build-tiles 는 허용 정답 아무것과 맞고, fill-letters 는 빈 글자 자리에 놓은 글자를 채운 낱말을 견준다", () => {
    const build: CheckItem = {
      type: "build-tiles",
      accepted: ["grey", "gray"],
    };
    expect(ok(build, { kind: "tiles", pieces: ["g", "r", "a", "y"] })).toBe(
      true,
    );
    expect(ok(build, { kind: "tiles", pieces: ["g", "r", "e", "y"] })).toBe(
      true,
    );
    const fill: CheckItem = {
      type: "fill-letters",
      pattern: "b_ll",
      accepted: ["ball"],
    };
    expect(ok(fill, { kind: "tiles", pieces: ["a"] })).toBe(true);
    expect(ok(fill, { kind: "tiles", pieces: ["e"] })).toBe(false);
    // 빈 자리 수와 놓은 수가 다르면 틀림
    expect(ok(fill, { kind: "tiles", pieces: ["a", "l"] })).toBe(false);
    expect(ok(fill, { kind: "tiles", pieces: [] })).toBe(false);
  });

  it("답 맞춤: 문장 조립은 첫 글자 대문자 · 마침표 카드 · 차례를 가리고(C73), 대문자 단추로 바꾼 첫 카드는 맞음이다", () => {
    const item: CheckItem = {
      type: "assemble-sentence",
      accepted: ["I like red apples."],
    };
    // 카드는 시드 그대로 소문자 — 첫 카드를 대문자로 바꾸지 않으면 틀림
    const cards = (first: string, ...rest: string[]) => ({
      kind: "tiles" as const,
      pieces: [first, ...rest],
    });
    const phrase: CheckItem = {
      type: "assemble-sentence",
      accepted: ["The cat runs."],
    };
    expect(ok(phrase, cards("the", "cat", "runs", "."))).toBe(false);
    expect(ok(phrase, cards("The", "cat", "runs", "."))).toBe(true);
    // 마침표 카드를 빼면 틀림
    expect(ok(phrase, cards("The", "cat", "runs"))).toBe(false);
    // 차례가 다르면 틀림
    expect(ok(item, cards("I", "like", "apples", "red", "."))).toBe(false);
    expect(joinCards(["Do", "you", "like", "it", "?"])).toBe("Do you like it?");
    expect(joinCards(["Yes", ",", "I", "do", "!"])).toBe("Yes, I do!");
  });

  it("답 맞춤: 쓴 답에서 낱말 답은 대소문자를 가리지 않고 문장 답은 첫 글자 대문자 · 끝 문장 부호를 가린다(C73)", () => {
    const word: CheckItem = { type: "dictation", accepted: ["apple"] };
    expect(ok(word, { kind: "text", text: "Apple" })).toBe(true);
    expect(ok(word, { kind: "text", text: " APPLE " })).toBe(true);
    expect(ok(word, { kind: "text", text: "aple" })).toBe(false);
    const blank: CheckItem = { type: "fill-blank", accepted: ["is", "'s"] };
    expect(ok(blank, { kind: "text", text: "’s" })).toBe(true);
    const sentence: CheckItem = {
      type: "fix-sentence",
      accepted: ["She has a cat."],
    };
    expect(ok(sentence, { kind: "text", text: "She has a cat." })).toBe(true);
    expect(ok(sentence, { kind: "text", text: "she has a cat." })).toBe(false);
    expect(ok(sentence, { kind: "text", text: "She has a cat" })).toBe(false);
    expect(ok(sentence, { kind: "text", text: "She has a cat ." })).toBe(true);
    expect(normalizeTyped("  “Hi”  she  said . ")).toBe('"Hi" she said.');
  });

  it("답 맞춤: 따라 말하기는 시도 가운데 가장 높은 일치율이 placement.repeat_pass 이상이면 맞음이고 기준이 없으면 던진다", () => {
    const sentence =
      "I see a big red ball and a small blue cup on the long brown table in the warm sunny";
    const words = sentence.split(" ");
    const low = words.slice(0, 12).join(" ");
    const high = words.slice(0, 17).join(" ");
    const match = { homophones: [], nameSlot: "any-word" as const };
    const lowRate = matchRate(sentence, low, match);
    const highRate = matchRate(sentence, high, match);
    expect(lowRate).toBeLessThan(REPEAT_PASS);
    expect(highRate).toBeGreaterThanOrEqual(REPEAT_PASS);
    const item: CheckItem = { type: "repeat", sentence };
    const two = checkAnswer(item, { kind: "repeat", heard: [low, high] }, opts);
    expect(two.correct).toBe(true);
    expect(two.detail.rate).toBe(highRate);
    expect(ok(item, { kind: "repeat", heard: [low] })).toBe(false);
    expect(ok(item, { kind: "repeat", heard: [] })).toBe(false);
    expect(ok(item, { kind: "repeat-failed" })).toBe(false);
    // 동음이의어 묶음은 같은 낱말로 본다
    const homo = { repeatPass: REPEAT_PASS, homophones: [["two", "too"]] };
    expect(
      checkAnswer(
        { type: "repeat", sentence: "I have two cats" },
        { kind: "repeat", heard: ["I have too cats"] },
        homo,
      ).correct,
    ).toBe(true);
    expect(() =>
      checkAnswer(item, { kind: "repeat", heard: [high] }, { homophones: [] }),
    ).toThrow();
  });

  it("답 맞춤: 문항 갈래와 답 꼴이 맞지 않으면 틀림이고 정답 글을 detail 에 돌려준다", () => {
    const copy: CheckItem = { type: "copy-tiles", accepted: ["cat"] };
    const wrong = checkAnswer(copy, { kind: "choice", no: 1 }, opts);
    expect(wrong.correct).toBe(false);
    expect(wrong.detail.reason).toBe("wrong-shape");
    expect(
      checkAnswer(copy, { kind: "tiles", pieces: ["c", "a"] }, opts).detail
        .expected,
    ).toBe("cat");
    const pick = checkAnswer(
      { type: "pick-word", answerNo: 3 },
      { kind: "choice", no: 1 },
      opts,
    );
    expect(pick.detail.expected).toBe("3");
  });
});
