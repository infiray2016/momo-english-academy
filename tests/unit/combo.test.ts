// AC-8i(P9 몫: 조합 · 구간 키) · 6.1 조합 · 요청 구성(plan-p09a 증명 표). 숫자는 TEST_SETTINGS · MODEL_PRICES_FIXTURE 에서 읽는다.
import { describe, expect, it } from "vitest";
import {
  AI_PURPOSES,
  type AiPurpose,
  aiSettingSchemasOf,
  type ComboBook,
  ComboError,
  capabilitiesOf,
  checkCombo,
  checkSettingsCombos,
  probeConfigOf,
  requestConfigOf,
  SERVER_SIDE_FALLBACK_BETA,
  settingKeysOf,
  thinkingParamOf,
} from "@/core/ai/combo";
import { ModelPricesFileSchema } from "@/core/seed/schema/reference";
import { BAND_INFOS } from "@/core/seed/structure";
import { aiPurposeEnum } from "@/db/schema/content";
import {
  fixturePrice,
  MODEL_PRICES_FIXTURE,
} from "../fixtures/ai/model-prices";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";

const OPUS = "claude-opus-5-5";
const SONNET = "claude-sonnet-5-5";
const HAIKU = "claude-haiku-5-5";

/** 시험용 단가표의 조합 칸으로 만든 책(조합 검사는 caps 만 본다). */
const book: ComboBook = new Map(
  MODEL_PRICES_FIXTURE.models.map((m) => [
    m.model,
    { caps: capabilitiesOf(m) },
  ]),
);

/** 구간마다 대표 단계(그 구간의 첫 단계). */
function levelOfBand(band: string): number {
  const info = BAND_INFOS.find((b) => b.band === band);
  if (!info) throw new Error(`모르는 구간 ${band}`);
  return info.first;
}

function settingsWith(overrides: Record<string, unknown>) {
  return { ...testSettingValues(), ...overrides };
}

const MS_PER_SECOND = 1000;
const realtimeMs =
  TEST_SETTINGS["ai.timeout_seconds.realtime"].value * MS_PER_SECOND;
const feedbackMs =
  TEST_SETTINGS["ai.timeout_seconds.feedback"].value * MS_PER_SECOND;

describe("AC-8i 조합 · 구간 키", () => {
  it("AC-8i ai.effort.talk_turn 을 xhigh(또는 max)로 두면 '끔'과 함께 받지 않는다", () => {
    for (const effort of ["xhigh", "max"] as const) {
      for (const band of ["1-3", "4-6"] as const) {
        const values = settingsWith({
          [`ai.effort.talk_turn.${band}`]: effort,
        });
        const violations = checkSettingsCombos(values, book);
        expect(violations).toEqual([
          {
            keyBase: `talk_turn.${band}`,
            reasons: ["effort-not-allowed-with-off"],
          },
        ]);
      }
    }
    // 기본값은 위반이 없다
    expect(checkSettingsCombos(testSettingValues(), book)).toEqual([]);
    // '적응'이면 xhigh 도 받는다
    expect(
      checkCombo(
        { model: SONNET, effort: "xhigh", thinking: "adaptive" },
        book,
      ),
    ).toEqual({ ok: true });
  });

  it("AC-8i 쓰기 확인 모델을 Opus 5.5 로 두고 '끔'을 고르면 받지 않는다", () => {
    const values = settingsWith({
      "ai.model.writing_check": OPUS,
      "ai.thinking.writing_check": "off",
    });
    expect(checkSettingsCombos(values, book)).toEqual([
      { keyBase: "writing_check", reasons: ["thinking-off-unsupported"] },
    ]);
    expect(() =>
      requestConfigOf({ purpose: "writing_check", values, book }),
    ).toThrow(ComboError);
    // 단가표에 없거나 대체 모델 전용인 모델도 받지 않는다
    expect(
      checkCombo(
        { model: "claude-opus-4-8", effort: "low", thinking: "adaptive" },
        book,
      ),
    ).toEqual({ ok: false, reasons: ["unknown-model"] });
    expect(
      checkCombo(
        { model: "claude-unknown-9", effort: "low", thinking: "adaptive" },
        book,
      ),
    ).toEqual({ ok: false, reasons: ["unknown-model"] });
  });

  it("AC-8i 4~6 구간 회화 모델을 Haiku 5.5 로 바꾸면 그 구간 회화 턴은 disabled 로 나가고 대체 모델 재시도가 없다", () => {
    const values = settingsWith({ "ai.model.talk_turn.4-6": HAIKU });
    expect(checkSettingsCombos(values, book)).toEqual([]);
    const config = requestConfigOf({
      purpose: "talk_turn",
      level: levelOfBand("4-6"),
      values,
      book,
    });
    expect(config.model).toBe(HAIKU);
    expect(config.thinking).toEqual({ type: "disabled" });
    expect(config.fallbacks).toBeNull();
    expect(config.betas).toEqual([]);
    // 다른 구간은 그대로 Sonnet between_tools
    const other = requestConfigOf({
      purpose: "talk_turn",
      level: levelOfBand("7-9"),
      values,
      book,
    });
    expect(other.model).toBe(SONNET);
    expect(other.thinking).toEqual({ type: "between_tools" });
  });

  it("AC-8i 1-3 구간 effort 를 medium 으로 바꿔도 4-6 구간 회화 턴은 low 로 나간다", () => {
    const values = settingsWith({ "ai.effort.talk_turn.1-3": "medium" });
    const low = requestConfigOf({
      purpose: "talk_turn",
      level: levelOfBand("4-6"),
      values,
      book,
    });
    expect(low.effort).toBe(TEST_SETTINGS["ai.effort.talk_turn.4-6"].value);
    const changed = requestConfigOf({
      purpose: "talk_turn",
      level: levelOfBand("1-3"),
      values,
      book,
    });
    expect(changed.effort).toBe("medium");
    // 끝맺음 턴도 그 구간 talk_turn 값을 쓴다
    const closing = requestConfigOf({
      purpose: "talk_closing",
      level: levelOfBand("4-6"),
      values,
      book,
    });
    expect(closing.effort).toBe(TEST_SETTINGS["ai.effort.talk_turn.4-6"].value);
  });

  it("AC-8i 확인 호출 구성은 ai.model · ai.effort · ai.thinking 값과 관계없이 6.1 표의 조합이다", () => {
    const probeMaxTokens = TEST_SETTINGS["ai.max_tokens.probe"].value;
    const realtimeSeconds = TEST_SETTINGS["ai.timeout_seconds.realtime"].value;
    const expected = {
      [HAIKU]: { type: "disabled" },
      [SONNET]: { type: "between_tools" },
      [OPUS]: { type: "adaptive" },
    } as const;
    for (const model of [HAIKU, SONNET, OPUS] as const) {
      const config = probeConfigOf(
        model,
        capabilitiesOf(fixturePrice(model)),
        probeMaxTokens,
        realtimeSeconds,
      );
      expect(config).toEqual({
        purpose: "probe",
        model,
        effort: "low",
        thinking: expected[model],
        maxTokens: probeMaxTokens,
        timeoutMs: realtimeMs,
        fallbacks: null,
        betas: [],
      });
    }
    // 확인 호출은 ai.model · ai.effort · ai.thinking 키를 쓰지 않는다
    expect(() => settingKeysOf("probe")).toThrow();
    expect(() =>
      requestConfigOf({ purpose: "probe", values: testSettingValues(), book }),
    ).toThrow();
  });
});

describe("6.1 조합 · 요청 구성", () => {
  it("6.1 '끔'은 Sonnet 5.5 between_tools · Haiku 5.5 disabled · Opus 5.5 adaptive 로 보낸다", () => {
    expect(
      thinkingParamOf("off", capabilitiesOf(fixturePrice(SONNET))),
    ).toEqual({ type: "between_tools" });
    expect(thinkingParamOf("off", capabilitiesOf(fixturePrice(HAIKU)))).toEqual(
      {
        type: "disabled",
      },
    );
    expect(thinkingParamOf("off", capabilitiesOf(fixturePrice(OPUS)))).toEqual({
      type: "adaptive",
    });
    for (const model of [SONNET, HAIKU, OPUS]) {
      expect(
        thinkingParamOf("adaptive", capabilitiesOf(fixturePrice(model))),
      ).toEqual({ type: "adaptive" });
    }
  });

  it("6.1 Sonnet · Opus 는 fallbacks default 와 server-side-fallback-2026-07-01, Haiku 는 둘 다 없다", () => {
    const values = testSettingValues();
    const feedback = requestConfigOf({
      purpose: "writing_feedback",
      values,
      book,
    });
    expect(feedback.model).toBe(OPUS);
    expect(feedback.fallbacks).toBe("default");
    expect(feedback.betas).toEqual([SERVER_SIDE_FALLBACK_BETA]);
    expect(SERVER_SIDE_FALLBACK_BETA).toBe("server-side-fallback-2026-07-01");

    const check = requestConfigOf({ purpose: "writing_check", values, book });
    expect(check.model).toBe(SONNET);
    expect(check.fallbacks).toBe("default");
    expect(check.betas).toEqual([SERVER_SIDE_FALLBACK_BETA]);

    // 1~3 구간을 Haiku 로 고른 때(C112 뒤 기본은 Sonnet)
    const talk = requestConfigOf({
      purpose: "talk_turn",
      level: levelOfBand("1-3"),
      values: { ...values, "ai.model.talk_turn.1-3": HAIKU },
      book,
    });
    expect(talk.model).toBe(HAIKU);
    expect(talk.fallbacks).toBeNull();
    expect(talk.betas).toEqual([]);
  });

  it("6.1 최대 출력은 ai.max_tokens.<목적>, 끝맺음 턴은 talk_turn 모델 값과 talk_closing 최대 출력", () => {
    const values = testSettingValues();
    for (const purpose of [
      "writing_feedback",
      "writing_check",
      "speaking_eval",
      "thinkout",
    ] as const) {
      const config = requestConfigOf({ purpose, values, book });
      expect(config.maxTokens).toBe(
        TEST_SETTINGS[`ai.max_tokens.${purpose}`].value,
      );
      expect(config.model).toBe(TEST_SETTINGS[`ai.model.${purpose}`].value);
      expect(settingKeysOf(purpose).maxTokens).toBe(`ai.max_tokens.${purpose}`);
    }
    for (const band of ["1-3", "4-6", "7-9", "10-12"] as const) {
      const level = levelOfBand(band);
      const turn = requestConfigOf({
        purpose: "talk_turn",
        level,
        values,
        book,
      });
      const closing = requestConfigOf({
        purpose: "talk_closing",
        level,
        values,
        book,
      });
      expect(turn.maxTokens).toBe(
        TEST_SETTINGS["ai.max_tokens.talk_turn"].value,
      );
      expect(closing.maxTokens).toBe(
        TEST_SETTINGS["ai.max_tokens.talk_closing"].value,
      );
      expect(closing.model).toBe(
        TEST_SETTINGS[`ai.model.talk_turn.${band}`].value,
      );
      expect(closing.model).toBe(turn.model);
      expect(closing.thinking).toEqual(turn.thinking);
      expect(settingKeysOf("talk_closing", level)).toMatchObject({
        model: `ai.model.talk_turn.${band}`,
        effort: `ai.effort.talk_turn.${band}`,
        thinking: `ai.thinking.talk_turn.${band}`,
        maxTokens: "ai.max_tokens.talk_closing",
      });
    }
    // 회화 턴 · 끝맺음 턴은 단계가 있어야 구간 키를 안다
    expect(() => settingKeysOf("talk_turn")).toThrow();
  });

  it("6.1 첨삭 · 끝맺음 턴은 feedback 타임아웃, 나머지는 realtime", () => {
    const values = testSettingValues();
    const level = levelOfBand("4-6");
    const expected: Record<Exclude<AiPurpose, "probe">, number> = {
      writing_feedback: feedbackMs,
      talk_closing: feedbackMs,
      writing_check: realtimeMs,
      speaking_eval: realtimeMs,
      thinkout: realtimeMs,
      talk_turn: realtimeMs,
    };
    for (const [purpose, ms] of Object.entries(expected)) {
      const config = requestConfigOf({
        purpose: purpose as AiPurpose,
        level,
        values,
        book,
      });
      expect(config.timeoutMs).toBe(ms);
    }
    // 설정 키 규격: getSettings 에 그대로 넘길 키 다섯
    const schemas = aiSettingSchemasOf("writing_feedback");
    expect(Object.keys(schemas).sort()).toEqual(
      [
        "ai.effort.writing_feedback",
        "ai.max_tokens.writing_feedback",
        "ai.model.writing_feedback",
        "ai.thinking.writing_feedback",
        "ai.timeout_seconds.feedback",
      ].sort(),
    );
    expect(
      schemas["ai.effort.writing_feedback"]?.safeParse("xhigh").success,
    ).toBe(true);
    expect(
      schemas["ai.thinking.writing_feedback"]?.safeParse("on").success,
    ).toBe(false);
    expect(
      schemas["ai.max_tokens.writing_feedback"]?.safeParse(0).success,
    ).toBe(false);
  });

  it("6.1 시험용 단가표(여섯 행)가 P4a ModelPricesFileSchema 를 통과하고 조합 칸을 그대로 옮긴다 · thinkingDefault 'none'(Opus 4.8)을 받는다", () => {
    const parsed = ModelPricesFileSchema.safeParse(MODEL_PRICES_FIXTURE);
    expect(parsed.success).toBe(true);
    expect(MODEL_PRICES_FIXTURE.models).toHaveLength(6);
    const opus48 = fixturePrice("claude-opus-4-8");
    expect(opus48.thinkingDefault).toBe("none");
    for (const entry of MODEL_PRICES_FIXTURE.models) {
      expect(capabilitiesOf(entry)).toEqual({
        thinkingDefault: entry.thinkingDefault,
        thinkingOff: entry.thinkingOff,
        thinkingOffEfforts: entry.thinkingOffEfforts,
        effortDefault: entry.effortDefault,
        serverFallback: entry.serverFallback,
        ...(entry.fallbackOnly === undefined
          ? {}
          : { fallbackOnly: entry.fallbackOnly }),
      });
    }
    // 'adaptive' · 'none' 밖은 받지 않는다
    const bad = {
      models: [{ ...opus48, thinkingDefault: "enabled" }],
    };
    expect(ModelPricesFileSchema.safeParse(bad).success).toBe(false);
  });

  it("6.1 조합 검사: 설정값이 없거나 꼴이 틀리면 invalid-setting 이다", () => {
    const values = settingsWith({ "ai.thinking.writing_check": "on" });
    delete values["ai.model.thinkout"];
    expect(checkSettingsCombos(values, book)).toEqual([
      { keyBase: "writing_check", reasons: ["invalid-setting"] },
      { keyBase: "thinkout", reasons: ["invalid-setting"] },
    ]);
  });

  it("6.1 호출 목적은 DB 열거형 ai_purpose 와 같은 값 · 차례다", () => {
    expect([...AI_PURPOSES]).toEqual(aiPurposeEnum.enumValues);
  });
});
