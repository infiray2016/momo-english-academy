// 6.1 요청 본문(네 호출 여섯 규격, plan-p09b 증명 표). 실제 API 를 부르지 않는다. 이름은 지어낸 이름이다.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { CallSpec } from "@/core/ai/calls/common";
import {
  speakingAnswerSpec,
  speakingConfirmSpec,
  speakingPresentationSpec,
} from "@/core/ai/calls/speaking";
import {
  THINKOUT_LAST_TURN_NOTE,
  thinkoutSpec,
} from "@/core/ai/calls/thinkout";
import { writingCheckSpec, writingFeedbackSpec } from "@/core/ai/calls/writing";
import {
  capabilitiesOf,
  requestConfigOf,
  SERVER_SIDE_FALLBACK_BETA,
  STRUCTURED_OUTPUTS_BETA,
} from "@/core/ai/combo";
import { createMasker } from "@/core/ai/mask";
import { type BuiltRequest, buildAiRequest } from "@/core/ai/request";
import { MODEL_PRICES_FIXTURE } from "../fixtures/ai/model-prices";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
  SPEAKING_CONFIRM_SAMPLE,
  speakingAnswerSample,
  speakingPresentationSample,
  THINKOUT_HISTORY,
  thinkoutSample,
  WRITING_CHECK_SAMPLE,
  writingFeedbackSample,
} from "../fixtures/ai/sample-inputs";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const book = new Map(
  MODEL_PRICES_FIXTURE.models.map((m) => [
    m.model,
    { caps: capabilitiesOf(m) },
  ]),
);
const masker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});

type Case = {
  spec: CallSpec<never, unknown, unknown>;
  input: unknown;
  /** 가변부에 있어야 할 수업 글. */
  lesson: string;
  /** 시스템 프롬프트에 없어야 할 아이 글. */
  childTexts: string[];
};

function asCase<I, O, R>(
  spec: CallSpec<I, O, R>,
  input: I,
  lesson: string,
  childTexts: string[],
): Case {
  return {
    spec: spec as unknown as CallSpec<never, unknown, unknown>,
    input,
    lesson,
    childTexts,
  };
}

const feedbackInput = writingFeedbackSample(9);
const answerInput = speakingAnswerSample(4);
const presentationInput = speakingPresentationSample(9);
const thinkoutInput = thinkoutSample(2);

/** 네 호출 여섯 규격. */
const CASES: Case[] = [
  asCase(
    writingCheckSpec,
    WRITING_CHECK_SAMPLE,
    WRITING_CHECK_SAMPLE.task,
    WRITING_CHECK_SAMPLE.sentences,
  ),
  asCase(writingFeedbackSpec, feedbackInput, feedbackInput.task, [
    feedbackInput.draft,
  ]),
  asCase(speakingAnswerSpec, answerInput, answerInput.question, [
    answerInput.transcript,
  ]),
  asCase(speakingPresentationSpec, presentationInput, presentationInput.topic, [
    presentationInput.transcript,
  ]),
  asCase(
    speakingConfirmSpec,
    SPEAKING_CONFIRM_SAMPLE,
    SPEAKING_CONFIRM_SAMPLE.question,
    [SPEAKING_CONFIRM_SAMPLE.transcript],
  ),
  asCase(
    thinkoutSpec,
    thinkoutInput,
    thinkoutInput.task,
    thinkoutInput.history.map((h) => h.answer),
  ),
];

function build(c: Case): BuiltRequest<unknown> {
  const config = requestConfigOf({ purpose: c.spec.purpose, values, book });
  const rules = c.spec.rulesOf(values, c.input as never);
  return buildAiRequest(c.spec, c.input as never, { config, masker, rules });
}

function buildThinkout(turn: number) {
  const input = thinkoutSample(turn);
  const config = requestConfigOf({ purpose: "thinkout", values, book });
  return buildAiRequest(thinkoutSpec, input, {
    config,
    masker,
    rules: thinkoutSpec.rulesOf(values, input),
  });
}

const ALLOWED_BODY_KEYS = [
  "model",
  "max_tokens",
  "system",
  "messages",
  "thinking",
  "output_config",
  "fallbacks",
  "cache_control",
];

describe("6.1 요청 본문", () => {
  it("6.1 요청: 네 호출 여섯 규격 모두 temperature · top_p · top_k · metadata 가 없고 max_tokens 는 ai.max_tokens.<목적>이다", () => {
    expect(new Set(CASES.map((c) => c.spec.title)).size).toBe(6);
    expect(new Set(CASES.map((c) => c.spec.purpose)).size).toBe(4);
    for (const c of CASES) {
      const { body, timeoutMs } = build(c);
      for (const key of [
        "temperature",
        "top_p",
        "top_k",
        "metadata",
        "stop_sequences",
        "tools",
      ]) {
        expect(body).not.toHaveProperty(key);
      }
      for (const key of Object.keys(body)) {
        expect(ALLOWED_BODY_KEYS).toContain(key);
      }
      const maxTokensKey =
        `ai.max_tokens.${c.spec.purpose}` as keyof typeof TEST_SETTINGS;
      expect(body.max_tokens).toBe(TEST_SETTINGS[maxTokensKey].value);
      expect(body.model).toBe(
        TEST_SETTINGS[
          `ai.model.${c.spec.purpose}` as keyof typeof TEST_SETTINGS
        ].value,
      );
      expect(body.output_config).toEqual({
        effort:
          TEST_SETTINGS[
            `ai.effort.${c.spec.purpose}` as keyof typeof TEST_SETTINGS
          ].value,
      });
      expect(body.thinking).toEqual({ type: "adaptive" });
      expect(timeoutMs).toBeGreaterThan(0);
    }
    // 목적이 다른 구성은 받지 않는다
    const wrong = requestConfigOf({ purpose: "thinkout", values, book });
    expect(() =>
      buildAiRequest(writingCheckSpec, WRITING_CHECK_SAMPLE, {
        config: wrong,
        masker,
        rules: {},
      }),
    ).toThrow();
  });

  it("6.1 요청: 시스템 프롬프트에 공통 고정부(한국어 해요체 설명 · 개인 정보 · {NAME})와 가변부(can-do · 단원 단어 · 학습 요소 · 수업)가 있고 아이 이름 · 아이 글이 없다", () => {
    for (const c of CASES) {
      const { body } = build(c);
      const input = c.input as {
        canDo: string;
        unitWords: string[];
        learningElement: string;
      };
      expect(body.system).toContain("해요체");
      expect(body.system).toContain("phone number");
      expect(body.system).toContain("{NAME}");
      expect(body.system).toContain(input.canDo);
      expect(body.system).toContain(input.unitWords.join(", "));
      expect(body.system).toContain(input.learningElement);
      expect(body.system).toContain(c.lesson);
      expect(body.system).not.toContain(SAMPLE_NAMES.displayName);
      expect(body.system).not.toContain(SAMPLE_NAMES.englishName);
      for (const text of c.childTexts) {
        expect(body.system).not.toContain(text);
      }
      // 아이 이름은 본문 어디에도 없다
      const all = JSON.stringify(body);
      expect(all).not.toContain(SAMPLE_NAMES.displayName);
      expect(all.toLowerCase()).not.toContain(
        SAMPLE_NAMES.englishName.toLowerCase(),
      );
    }
  });

  it("6.1 요청: 말하기 평가 고정부에 인식 오류를 근거로 쓰지 않는다는 규칙이 있다", () => {
    for (const c of CASES) {
      const { body } = build(c);
      const has = body.system.includes("recognition errors");
      expect(has).toBe(c.spec.purpose === "speaking_eval");
    }
  });

  it("6.1 요청: 생각 꺼내기만 자동 캐시이고 바뀌는 값(마지막 턴)은 마지막 사용자 메시지에만 있다", () => {
    for (const c of CASES) {
      const { body } = build(c);
      if (c.spec.purpose === "thinkout") {
        expect(body.cache_control).toEqual({ type: "ephemeral" });
      } else {
        expect(body).not.toHaveProperty("cache_control");
      }
    }
    const maxTurns = TEST_SETTINGS["writing.thinkout_max_turns"].value;
    const last = buildThinkout(maxTurns).body;
    const lastMessage = last.messages.at(-1);
    expect(lastMessage?.role).toBe("user");
    expect(lastMessage?.content).toContain(THINKOUT_LAST_TURN_NOTE);
    for (const message of last.messages.slice(0, -1)) {
      expect(message.content).not.toContain(THINKOUT_LAST_TURN_NOTE);
    }
    expect(last.system).not.toContain(THINKOUT_LAST_TURN_NOTE);
    // 마지막 턴이 아니면 어디에도 없다
    expect(JSON.stringify(buildThinkout(maxTurns - 1).body)).not.toContain(
      THINKOUT_LAST_TURN_NOTE,
    );
    // 시스템 프롬프트는 대화 끝까지 같다
    expect(buildThinkout(1).body.system).toBe(last.system);
  });

  it("6.1 요청: 생각 꺼내기 둘째 턴 메시지는 첫 턴 메시지를 글자 그대로 앞에 둔다", () => {
    const first = buildThinkout(1).body.messages;
    const second = buildThinkout(2).body.messages;
    const third = buildThinkout(3).body.messages;
    expect(first).toHaveLength(1);
    expect(second.slice(0, first.length)).toEqual(first);
    expect(second[1]).toEqual({
      role: "assistant",
      content: THINKOUT_HISTORY[0]?.assistant,
    });
    expect(third.slice(0, second.length)).toEqual(second);
    expect(third.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
      "user",
    ]);
  });

  it("6.1 요청: 생각 꺼내기 턴 번호는 입력의 turn 하나이고 기록 수와 어긋나면 던진다", () => {
    const config = requestConfigOf({ purpose: "thinkout", values, book });
    const maxTurns = TEST_SETTINGS["writing.thinkout_max_turns"].value;
    const mismatched = thinkoutSample(1, { turn: maxTurns });
    expect(() =>
      buildAiRequest(thinkoutSpec, mismatched, {
        config,
        masker,
        rules: thinkoutSpec.rulesOf(values, mismatched),
      }),
    ).toThrow();
    // 맞으면 마지막 사용자 메시지의 턴 표시가 입력의 turn 이다
    const ok = buildThinkout(2).body.messages.at(-1)?.content ?? "";
    expect(ok).toContain(`(Turn 2 / ${maxTurns})`);
  });

  it("6.1 요청: 규격 제목이 목적 이름이다 · betas 에 구조화 출력 머리글이 있다", () => {
    for (const c of CASES) {
      const built = build(c);
      expect(built.title).toBe(c.spec.title);
      expect(built.title.split(".")[0]).toBe(c.spec.purpose);
      const json = z.toJSONSchema(built.wireSchema) as { title?: string };
      expect(json.title).toBe(c.spec.title);
      expect(built.betas).toContain(STRUCTURED_OUTPUTS_BETA);
      // Sonnet · Opus 는 서버 측 대체 머리글도
      expect(built.betas).toContain(SERVER_SIDE_FALLBACK_BETA);
      expect(built.body.fallbacks).toBe("default");
      // 형식은 P9c 가 wireSchema 로 붙인다(sdk-only-in-ai)
      expect(built.body.output_config).not.toHaveProperty("format");
    }
  });
});
