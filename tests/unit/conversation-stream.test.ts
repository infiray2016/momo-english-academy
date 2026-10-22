// 회화 턴 흘려 받기(plan-p13a 파일별 값 2 · 정할 것 회8, 6.2 끝 문단 · 6.4 실시간 출력 검사 · 8절 회화 턴 실패 · C92 · C95).
// tori_en 조각 풀기 · 문장 끝 · 문장 검사 · 걸린 문장 바꾸기 · 시도 다음 할 일. 실제 API 를 부르지 않는다.
// 금지어 · 메타 문장은 시드 목록(seed/lists) 그대로, 견본 응답은 tests/fixtures/ai/samples 에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { answerTextOf } from "@/core/ai/calls/common";
import {
  checkToriSentence,
  createToriEnReader,
  createToriSentenceGate,
  isOverLength,
  safeLineOf,
  talkAttemptNext,
} from "@/core/conversation/stream";
import {
  ForbiddenFileSchema,
  MetaSentencesFileSchema,
} from "@/core/seed/schema/reference";
import { splitSentences } from "@/core/seed/text";

const FORBIDDEN = ForbiddenFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/forbidden.json"), "utf8"),
  ),
);
const META = MetaSentencesFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/meta-sentences.json"), "utf8"),
  ),
).phrases;
const SAMPLES = join(process.cwd(), "tests/fixtures/ai/samples");

type TalkSample = {
  case: string;
  response: { body: { content: { type: string; text?: string }[] } };
};
function sampleText(id: string): string {
  const sample = JSON.parse(
    readFileSync(join(SAMPLES, `${id}.json`), "utf8"),
  ) as TalkSample;
  return answerTextOf(sample.response.body);
}

/** 글을 n 글자 조각으로 나눈다(조각 경계가 어디든 같은 문장이 나와야 한다). */
function chunks(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

function readAll(text: string, size: number) {
  const reader = createToriEnReader();
  const sentences: string[] = [];
  for (const piece of chunks(text, size)) sentences.push(...reader.push(piece));
  sentences.push(...reader.finish());
  return { sentences, reader };
}

const json = (toriEn: string, rest = `,"tori_ko":"좋아!"}`) =>
  `{"tori_en":${JSON.stringify(toriEn)}${rest}`;

describe("회화 흘려 받기: tori_en 풀기", () => {
  it("회화 흘려 받기: 조각 크기와 관계없이 끝난 문장을 차례로 내고 문자열이 닫히면 마지막 문장을 낸다", () => {
    const tori = "Two apples! Great job, {NAME}. Now let's talk about colors.";
    for (const size of [1, 2, 3, 7, 1000]) {
      const { sentences, reader } = readAll(json(tori), size);
      expect(sentences, `조각 ${size}`).toEqual(splitSentences(tori));
      expect(reader.failed()).toBe(false);
      expect(reader.closed()).toBe(true);
      expect(reader.text()).toBe(tori);
    }
  });

  it("회화 흘려 받기: 조각 경계에 걸친 이스케이프와 약어 · 숫자 점은 문장을 끊지 않는다", () => {
    const tori =
      'Mr. Lee is here. Say "Hi!" to him. It is 3.5 meters long.\nWe met at 9 a.m. today. Café \\ fun\t❤️ 🍎!';
    // JSON 글에 \uXXXX 이스케이프(서로게이트 쌍 포함)를 일부러 넣는다
    const text = json(tori)
      .replace("é", "\\u00e9")
      .replace("🍎", "\\ud83c\\udf4e");
    expect(text).toContain("\\u00e9");
    for (const size of [1, 2, 5]) {
      const { sentences } = readAll(text, size);
      expect(sentences, `조각 ${size}`).toEqual(splitSentences(tori));
      expect(sentences).toEqual([
        "Mr. Lee is here.",
        'Say "Hi!"',
        "to him.",
        "It is 3.5 meters long.",
        "We met at 9 a.m. today.",
        "Café \\ fun\t❤️ 🍎!",
      ]);
    }
    // \u 이스케이프가 조각 사이에서 잘려도 한 글자로 푼다
    const reader = createToriEnReader();
    expect(reader.push('{"tori_en":"Caf\\u00')).toEqual([]);
    expect(reader.push('e9! Ok"}')).toEqual(["Café!", "Ok"]);
    // 역빗금만 앞 조각 끝에 온 경우
    const second = createToriEnReader();
    second.push('{"tori_en":"Say \\');
    second.push('"yes\\"! Next."}');
    expect(second.text()).toBe('Say "yes"! Next.');
  });

  it("회화 흘려 받기: 문장부호 뒤에 공백이 와야 그 문장을 끝난 것으로 본다", () => {
    const reader = createToriEnReader();
    expect(reader.push('{"tori_en":"Good job!')).toEqual([]);
    expect(reader.push(" Next")).toEqual(["Good job!"]);
    expect(reader.push(" one.")).toEqual([]);
    expect(reader.push('","tori_ko":"')).toEqual(["Next one."]);
    expect(reader.finish()).toEqual([]);
  });

  it("회화 흘려 받기: 첫 속성이 tori_en 이 아니면 흘려 보내지 않는다(failed)", () => {
    const reader = createToriEnReader();
    expect(reader.push('{"tori_ko":"좋아!","tori_en":"Hi. "}')).toEqual([]);
    expect(reader.failed()).toBe(true);
    expect(reader.finish()).toEqual([]);
    const notObject = createToriEnReader();
    notObject.push('["tori_en"]');
    expect(notObject.failed()).toBe(true);
  });

  it("회화 흘려 받기: 문자열이 닫히기 전에 끊기면 끝나지 않은 조각은 내지 않는다", () => {
    const reader = createToriEnReader();
    expect(reader.push('{"tori_en":"Nice! I like')).toEqual(["Nice!"]);
    expect(reader.finish()).toEqual([]);
    expect(reader.closed()).toBe(false);
  });

  it("회화 흘려 받기: 앞 공백 · 줄바꿈이 있는 JSON 과 빈 tori_en(끝맺음 턴)도 읽는다", () => {
    const { sentences, reader } = readAll(' \n{ "tori_en" : "" , "x":1}', 3);
    expect(sentences).toEqual([]);
    expect(reader.closed()).toBe(true);
    expect(reader.failed()).toBe(false);
  });

  it("회화 흘려 받기: 견본 응답 l1-ok 의 tori_en 이 문장으로 나온다", () => {
    const text = sampleText("talk_turn.l1-ok");
    const whole = JSON.parse(text) as { tori_en: string };
    expect(readAll(text, 4).sentences).toEqual(splitSentences(whole.tori_en));
  });
});

describe("회화 흘려 받기: 문장 검사", () => {
  const low = { forbidden: FORBIDDEN, metaPhrases: META, lowLevel: true };
  const high = { ...low, lowLevel: false };

  it("회화 흘려 받기: 금지어 · 연락처 · 개인 정보 질문 · 메타 문장 · 1~3단계 물음표 문장을 갈래로 가른다", () => {
    expect(checkToriSentence("Two apples! Here you go.", low)).toEqual({
      ok: true,
    });
    expect(checkToriSentence("That is a stupid game.", low)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(checkToriSentence("Call me at 010-1234-5678.", low)).toEqual({
      ok: false,
      reason: "contact",
    });
    expect(checkToriSentence("Tell me your phone number now.", high)).toEqual({
      ok: false,
      reason: "personal",
    });
    expect(checkToriSentence("The child likes apples.", high)).toEqual({
      ok: false,
      reason: "meta",
    });
    expect(checkToriSentence("I should ask a new question.", high)).toEqual({
      ok: false,
      reason: "meta",
    });
    expect(checkToriSentence("What color is it?", low)).toEqual({
      ok: false,
      reason: "question",
    });
    expect(checkToriSentence('Is it "red?"', low)).toEqual({
      ok: false,
      reason: "question",
    });
    expect(checkToriSentence("What color is it?", high)).toEqual({ ok: true });
    // 메타 구는 낱말 단위다(the children 은 the child 가 아니다)
    expect(checkToriSentence("The children are happy.", high)).toEqual({
      ok: true,
    });
  });

  it("회화 흘려 받기: 문장 길이 상한을 넘은 문장은 막지 않고 길이 초과로만 센다", () => {
    expect(isOverLength("I like red apples very much.", 5)).toBe(true);
    expect(isOverLength("I like apples.", 5)).toBe(false);
    expect(isOverLength("좋아!", 1)).toBe(false);
  });

  it("AC-15b 흘려 받은 tori_en 에서 금지어 · 개인 정보를 묻는 문장 · 메타 문장은 카드의 안전한 대사로 바뀌고 1~3단계 반응의 물음표 문장은 지워진다", () => {
    const safe = "That's fun! Let's keep talking.";
    // 견본 l1-blocked: 반응 · 개인 정보 질문 · 메타 문장 · 금지어 · 물음표 문장
    const text = sampleText("talk_turn.l1-blocked");
    const { sentences } = readAll(text, 6);
    const gate = createToriSentenceGate({
      ...low,
      safeLine: safe,
      sentenceMaxWords: 5,
    });
    const out = sentences
      .map((s) => gate.accept(s))
      .filter((s): s is string => s !== null);
    expect(out).toEqual(["Nice!", safe]);
    expect(gate.sent()).toEqual(["Nice!", safe]);
    expect(gate.blocked()).toEqual([
      "personal",
      "meta",
      "forbidden",
      "question",
    ]);
    for (const sentence of out) {
      expect(checkToriSentence(sentence, low)).toEqual({ ok: true });
    }
    // 1~3단계 반응의 물음표 문장만 있는 견본
    const questionOnly = createToriSentenceGate({
      ...low,
      safeLine: safe,
      sentenceMaxWords: 5,
    });
    const reaction = readAll(sampleText("talk_turn.l1-question-in-reaction"), 5)
      .sentences.map((s) => questionOnly.accept(s))
      .filter((s): s is string => s !== null);
    expect(reaction).toEqual(["Wow, a red ball!"]);
    expect(questionOnly.blocked()).toEqual(["question"]);
  });

  it("회화 흘려 받기: 걸린 문장은 한 턴에 처음 걸린 자리만 안전한 대사로 바꾸고 길이 초과는 센다", () => {
    const safe = "That's fun! Let's keep talking.";
    const gate = createToriSentenceGate({
      ...high,
      safeLine: safe,
      sentenceMaxWords: 4,
    });
    expect(gate.accept("The user is happy.")).toBe(safe);
    expect(gate.accept("Good job today, my friend.")).toBe(
      "Good job today, my friend.",
    );
    expect(gate.accept("The student said it.")).toBeNull();
    expect(gate.accept("What is your phone number?")).toBeNull();
    expect(gate.sent()).toEqual([safe, "Good job today, my friend."]);
    expect(gate.overLength()).toBe(1);
  });

  it("회화 흘려 받기: 안전한 대사는 카드 safeLines 를 턴 번호로 돌려 고른다", () => {
    const lines = [{ en: "A." }, { en: "B." }, { en: "C." }];
    expect(safeLineOf(lines, 1)).toBe("B.");
    expect(safeLineOf(lines, 3)).toBe("A.");
    expect(safeLineOf(lines, 5)).toBe("C.");
    expect(() => safeLineOf([], 1)).toThrow();
  });
});

describe("회화 턴 실패 길(시도 다음 할 일)", () => {
  const base = {
    firstSentenceSent: false,
    retriedSame: false,
    retriedOtherModel: false,
    canRetryOtherModelOnRefusal: true,
  };

  it("회화 턴: 첫 문장 전 연결 오류 · 타임아웃만 같은 입력으로 한 번 다시 부른다", () => {
    expect(talkAttemptNext({ ...base, end: "connection" })).toEqual({
      next: "retry_same",
    });
    expect(talkAttemptNext({ ...base, end: "timeout" })).toEqual({
      next: "retry_same",
    });
    expect(
      talkAttemptNext({ ...base, end: "timeout", retriedSame: true }),
    ).toEqual({ next: "fail", reason: "timeout" });
    expect(talkAttemptNext({ ...base, end: "server" })).toEqual({
      next: "fail",
      reason: "server",
    });
    expect(talkAttemptNext({ ...base, end: "end_turn" })).toEqual({
      next: "done",
    });
  });

  it("회화 턴: Haiku 5.5 첫 문장 전 거절만 Sonnet 5.5 로 한 번 다시 부르고 그것도 거절이면 거절로 끝난다", () => {
    expect(talkAttemptNext({ ...base, end: "refusal" })).toEqual({
      next: "retry_other_model",
    });
    expect(
      talkAttemptNext({ ...base, end: "refusal", retriedOtherModel: true }),
    ).toEqual({ next: "fail", reason: "refusal" });
    expect(
      talkAttemptNext({
        ...base,
        end: "refusal",
        canRetryOtherModelOnRefusal: false,
      }),
    ).toEqual({ next: "fail", reason: "refusal" });
  });

  it("회화 턴: 첫 문장 뒤 실패(거절 · max_tokens · 타임아웃 · 연결 · 서버)는 다시 부르지 않고 그 턴을 닫는다", () => {
    for (const end of [
      "refusal",
      "max_tokens",
      "timeout",
      "connection",
      "server",
    ] as const) {
      expect(
        talkAttemptNext({ ...base, end, firstSentenceSent: true }),
        end,
      ).toEqual({ next: "close_turn", reason: end });
    }
    expect(
      talkAttemptNext({ ...base, end: "end_turn", firstSentenceSent: true }),
    ).toEqual({ next: "done" });
  });

  it("회화 턴: 첫 문장 전 max_tokens 는 다시 부르지 않고 실패다", () => {
    expect(talkAttemptNext({ ...base, end: "max_tokens" })).toEqual({
      next: "fail",
      reason: "max_tokens",
    });
  });
});
