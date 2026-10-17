// 9절 AI 계약 · 두 명령의 순수 함수(plan-p09c 증명 표). 실제 API 를 부르지 않는다.
// 손으로 만든 표본(tests/fixtures/ai/samples, source handmade)과 H4 뒤 녹화 표본(tests/fixtures/ai/recorded)을 규격에 대 본다.
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CallSpec } from "@/core/ai/calls/common";
import { answerTextOf, prepareAnswer } from "@/core/ai/calls/common";
import {
  speakingAnswerSpec,
  speakingConfirmSpec,
  speakingPresentationSpec,
} from "@/core/ai/calls/speaking";
import { thinkoutSpec } from "@/core/ai/calls/thinkout";
import { writingCheckSpec, writingFeedbackSpec } from "@/core/ai/calls/writing";
import { SERVER_SIDE_FALLBACK_BETA } from "@/core/ai/combo";
import {
  billedAttemptsOf,
  costOf,
  type MessageLike,
  priceBookOf,
  priceRowsOfSeed,
} from "@/core/ai/cost";
import { classifyFailure, httpFailureOf } from "@/core/ai/failure";
import { createAnthropicClient } from "@/server/ai/client";
import {
  compareModelInfo,
  contractCases,
  fetchModelInfo,
  loadScriptConfig,
  type ModelInfoLike,
  parseArgs as parseContractArgs,
  recordOf,
  runContract,
} from "../../scripts/ai-contract";
import {
  chooseThinking,
  type GroupSummary,
  groupRequest,
  observeFailureOf,
  observePlan,
  parseArgs as parseObserveArgs,
  recommendMaxTokens,
  reportMarkdown,
  runObserve,
  summarize,
} from "../../scripts/ai-observe";
import {
  consoleLimitBody,
  createFakeAnthropic,
  errorBody,
  type FakeRule,
} from "../fixtures/ai/fake-anthropic";
import {
  FIXTURE_EFFECTIVE_FROM,
  fixturePrice,
  MODEL_PRICES_FIXTURE,
} from "../fixtures/ai/model-prices";
import {
  SPEAKING_CONFIRM_SAMPLE,
  speakingAnswerSample,
  speakingPresentationSample,
  thinkoutSample,
  WRITING_CHECK_SAMPLE,
  writingFeedbackSample,
} from "../fixtures/ai/sample-inputs";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";

const SAMPLES_DIR = join(process.cwd(), "tests/fixtures/ai/samples");
const RECORDED_DIR = join(process.cwd(), "tests/fixtures/ai/recorded");
const values = testSettingValues();

type Sample = {
  case: string;
  purpose: string;
  title: string;
  source: "handmade" | "recorded";
  response: { status: number; body: Record<string, unknown> };
  /** 손으로 만든 표본만 있다. 녹화 표본(recordOf)에는 없다 — 녹화 표본에서 읽을 때는 ?. 로 읽는다. */
  expect: {
    strict?: boolean;
    refusal?: boolean;
    classify?: string;
    answeredModel?: string;
    billedModels?: string[];
    normalized?: Record<string, unknown>;
  };
};

function readSamples(dir: string): Sample[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Sample);
}

const handmade = readSamples(SAMPLES_DIR);

/**
 * 콘솔 한도 표본을 고른다. 손으로 만든 표본은 expect.classify 로, 녹화 표본(recordOf 꼴 — 실제 응답 기록이라 expect 가 없다)은
 * H12 사례 id `console-limit` 으로 고른다(검토 review-p09c-3 범위 밖 관찰).
 */
function consoleLimitSamples(hand: Sample[], rec: Sample[]): Sample[] {
  return [
    ...hand.filter((s) => s.expect?.classify === "console_limit"),
    ...rec.filter(
      (s) => s.case === "console-limit" && s.response.status !== 200,
    ),
  ];
}

function checkConsoleLimits(limits: readonly Sample[]): void {
  for (const sample of limits) {
    const failure = httpFailureOf(
      sample.response.status,
      sample.response.body,
      false,
    );
    expect(classifyFailure(failure).reason, sample.case).toBe("console_limit");
  }
}

/** 녹화 표본 가운데 호출 규격에 대 볼 것(200 · 규격 제목이 있고 talk_config · probe 밖)이 엄격 또는 정규화를 지나는지. */
function checkRecordedCalls(rec: readonly Sample[]): number {
  let checked = 0;
  for (const sample of rec.filter(
    (s) => s.response.status === 200 && s.title !== undefined,
  )) {
    if (
      !sample.title ||
      sample.title === "talk_config" ||
      sample.title === "probe"
    )
      continue;
    checked += 1;
    const result = strictOf(sample);
    if (result.ok) continue;
    expect(
      result.spec.normalize(
        result.prepared,
        result.input as never,
        result.rules as never,
      ),
      sample.case,
    ).not.toBeNull();
  }
  return checked;
}

type AnySpec = CallSpec<never, unknown, unknown>;
/** 규격 제목 → 규격과 표본을 대 볼 견본 입력(단계는 표본 이름의 l 숫자 또는 기본). */
function specCase(sample: Pick<Sample, "title" | "case">): {
  spec: AnySpec;
  input: unknown;
  rules: unknown;
} {
  const as = <I, O, R>(spec: CallSpec<I, O, R>, input: I) => ({
    spec: spec as unknown as AnySpec,
    input,
    rules: spec.rulesOf(values, input),
  });
  switch (sample.title) {
    case "writing_check":
      return as(writingCheckSpec, WRITING_CHECK_SAMPLE);
    case "writing_feedback":
      return as(writingFeedbackSpec, writingFeedbackSample(6));
    case "speaking_eval.answer":
      return as(
        speakingAnswerSpec,
        speakingAnswerSample(sample.case.includes("l3") ? 3 : 4),
      );
    case "speaking_eval.presentation":
      return as(speakingPresentationSpec, speakingPresentationSample(9));
    case "speaking_eval.confirm":
      return as(speakingConfirmSpec, SPEAKING_CONFIRM_SAMPLE);
    case "thinkout": {
      const turn = sample.case.endsWith(".done")
        ? TEST_SETTINGS["writing.thinkout_max_turns"].value
        : 1;
      return as(thinkoutSpec, thinkoutSample(turn));
    }
    default:
      throw new Error(`모르는 규격 제목 ${sample.title}`);
  }
}

function strictOf(sample: Sample) {
  const { spec, input, rules } = specCase(sample);
  const body = sample.response.body as unknown as MessageLike & {
    content: { type: string; text?: string }[];
  };
  if (body.stop_reason !== "end_turn")
    return { ok: false as const, spec, input, rules };
  let prepared: unknown;
  try {
    prepared = prepareAnswer(JSON.parse(answerTextOf(body)), spec.enumPaths);
  } catch {
    return { ok: false as const, spec, input, rules };
  }
  const wire = spec
    .wireSchema(input as never, rules as never)
    .safeParse(prepared);
  const ok =
    wire.success &&
    spec.validate(wire.data, input as never, rules as never).length === 0;
  return { ok, spec, input, rules, prepared };
}

const messageSamples = handmade.filter((s) => s.response.status === 200);

describe("9절 계약", () => {
  it("9절 계약: 손으로 만든 표본(호출 넷 · 말하기 셋)이 엄격 규격을 통과한다", () => {
    const strict = messageSamples.filter((s) => s.expect.strict === true);
    expect(new Set(strict.map((s) => s.title))).toEqual(
      new Set([
        "writing_check",
        "writing_feedback",
        "speaking_eval.answer",
        "speaking_eval.presentation",
        "speaking_eval.confirm",
        "thinkout",
      ]),
    );
    for (const sample of strict) {
      expect(sample.source).toBe("handmade");
      const result = strictOf(sample);
      expect(result.ok, sample.case).toBe(true);
      if (sample.expect.answeredModel) {
        expect(sample.response.body.model).toBe(sample.expect.answeredModel);
      }
    }
  });

  it("9절 계약: 개수 · 범위를 넘는 표본은 엄격 규격에 걸리고 정규화가 고친다", () => {
    const over = messageSamples.filter(
      (s) => s.expect.strict === false && s.expect.normalized,
    );
    expect(over.length).toBeGreaterThanOrEqual(4);
    for (const sample of over) {
      const result = strictOf(sample);
      expect(result.ok, sample.case).toBe(false);
      const value = result.spec.normalize(
        result.prepared,
        result.input as never,
        result.rules as never,
      ) as Record<string, unknown> | null;
      expect(value, sample.case).not.toBeNull();
      for (const [key, want] of Object.entries(
        sample.expect.normalized ?? {},
      )) {
        const got = value?.[key];
        if (typeof want === "number" && Array.isArray(got)) {
          expect(got, `${sample.case} ${key}`).toHaveLength(want);
        } else {
          expect(got, `${sample.case} ${key}`).toEqual(want);
        }
      }
    }
  });

  it("9절 계약: 거절 · max_tokens 표본은 규격 밖이다", () => {
    const refusals = messageSamples.filter((s) => s.expect.refusal === true);
    const cut = messageSamples.filter((s) => s.case.endsWith(".max-tokens"));
    expect(refusals.length).toBeGreaterThanOrEqual(4);
    expect(cut.length).toBeGreaterThanOrEqual(4);
    for (const sample of [...refusals, ...cut]) {
      expect(strictOf(sample).ok, sample.case).toBe(false);
      expect(sample.response.body.stop_reason).not.toBe("end_turn");
    }
    for (const sample of refusals) {
      // 출력 전 거절(cyber, 출력 0)은 과금되지 않는다
      const body = sample.response.body as unknown as MessageLike;
      expect(billedAttemptsOf(body, body.model)).toEqual([]);
    }
  });

  it("9절 계약: 거절한 대체 홉의 iteration model 이 null 이면 요청 모델 단가로 센다(fallback 블록 from.model 이 그 모델)", () => {
    const sample = handmade.find(
      (s) => s.case === "writing_feedback.fallback-null-model",
    );
    if (!sample) throw new Error("표본이 없다");
    const body = sample.response.body as unknown as MessageLike;
    const blocks = sample.response.body.content as {
      type: string;
      from?: { model: string };
    }[];
    const requested = TEST_SETTINGS["ai.model.writing_feedback"].value;
    const attempts = billedAttemptsOf(body, requested);
    expect(attempts.map((a) => a.model)).toEqual(sample.expect.billedModels);
    expect(blocks.find((b) => b.type === "fallback")?.from?.model).toBe(
      requested,
    );
    const book = priceBookOf(
      priceRowsOfSeed(MODEL_PRICES_FIXTURE),
      FIXTURE_EFFECTIVE_FROM,
    );
    expect(costOf(attempts, book).priceMissing).toBe(false);
  });

  const recorded = readSamples(RECORDED_DIR);
  it("9절 계약: 녹화 표본이 엄격 규격 또는 정규화를 통과한다", () => {
    checkRecordedCalls(recorded);
  });
  for (const title of [
    "writing_check",
    "writing_feedback",
    "speaking_eval.answer",
    "speaking_eval.presentation",
    "speaking_eval.confirm",
    "thinkout",
  ]) {
    if (!recorded.some((s) => s.title === title)) {
      it.todo(`${title} 녹화 표본 없음 — H4 뒤 pnpm ai:contract`);
    }
  }

  it("9절 계약: 콘솔 한도 표본(손 · H12 녹화)을 8절 분류가 콘솔 한도로 본다", () => {
    const limits = consoleLimitSamples(handmade, recorded);
    expect(limits.length).toBeGreaterThanOrEqual(2);
    checkConsoleLimits(limits);
    // 다른 오류 표본도 표본에 적힌 갈래대로
    for (const sample of handmade.filter((s) => s.expect.classify)) {
      const failure = httpFailureOf(
        sample.response.status,
        sample.response.body,
        false,
      );
      expect(classifyFailure(failure).reason, sample.case).toBe(
        sample.expect.classify,
      );
    }
  });

  it("9절 계약: 계약 명령의 요청마다 max_tokens 가 ai.max_tokens.<목적>이다", () => {
    const config = loadScriptConfig({
      root: join(process.cwd(), "no-seed-here"),
    });
    expect(config.settingsSource).toBe("TEST_SETTINGS");
    for (const c of contractCases(config)) {
      if (!c.request) continue;
      const key =
        c.kind === "talk_config"
          ? "ai.max_tokens.talk_turn"
          : c.kind === "probe" || c.kind === "console-limit"
            ? "ai.max_tokens.probe"
            : `ai.max_tokens.${c.purpose}`;
      expect(c.request.summary.max_tokens, c.id).toBe(
        TEST_SETTINGS[key as keyof typeof TEST_SETTINGS].value,
      );
      for (const k of ["temperature", "top_p", "top_k", "metadata"]) {
        expect(c.request.body).not.toHaveProperty(k);
      }
    }
  });
});

// ── 계약 명령 ────────────────────────────────────────────────────

function infoOf(
  model: string,
  over: Partial<ModelInfoLike> = {},
): ModelInfoLike {
  const entry = fixturePrice(model);
  const yes = { supported: true };
  const no = { supported: false };
  return {
    id: model,
    lifecycle: "active",
    retires_at: null,
    allowed_fallback_models: entry.serverFallback ? ["claude-sonnet-5"] : [],
    capabilities: {
      structured_outputs: yes,
      effort: {
        supported: true,
        low: yes,
        medium: yes,
        high: yes,
        xhigh: yes,
        max: yes,
      },
      thinking: {
        supported: true,
        types: {
          adaptive: yes,
          between_tools: entry.thinkingOff === "between_tools" ? yes : no,
          disabled: entry.thinkingOff === "disabled" ? yes : no,
          enabled: no,
        },
      },
    },
    ...over,
  };
}

describe("AI 계약 명령", () => {
  it("AI 계약 명령: 사례 목록이 9절 AI 계약(수동) 행(호출 넷 · 회화 턴 두 설정 · 확인 호출 세 모델 · 콘솔 한도)과 모델 정보 대조를 덮는다 · dry-run 은 네트워크를 쓰지 않는다 · 녹화 파일에 키 · 인증 머리글이 없다", async () => {
    const config = loadScriptConfig({
      root: join(process.cwd(), "no-seed-here"),
    });
    const cases = contractCases(config);
    const ids = cases.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "writing_check.l4",
        "writing_check.l5",
        "writing_feedback.l6",
        "writing_feedback.l10",
        "speaking_eval.answer.l3",
        "speaking_eval.answer.l6",
        "speaking_eval.presentation.l9",
        "speaking_eval.confirm.l9",
        "thinkout.l6",
        "talk_config.haiku",
        "talk_config.sonnet",
        "probe.haiku",
        "probe.sonnet",
        "probe.opus",
        "models",
        "console-limit",
      ]),
    );
    expect(cases.find((c) => c.id === "console-limit")?.inDefault).toBe(false);
    // 회화 턴 두 설정: 생각 끔 + 구조화 출력(Haiku disabled · Sonnet between_tools + 대체 모델)
    const haiku = cases.find((c) => c.id === "talk_config.haiku")?.request
      ?.summary;
    const sonnet = cases.find((c) => c.id === "talk_config.sonnet")?.request
      ?.summary;
    expect(haiku).toMatchObject({
      model: "claude-haiku-5-5",
      thinking: { type: "disabled" },
      effort: "low",
      fallbacks: null,
      title: "talk_config",
    });
    expect(sonnet).toMatchObject({
      model: "claude-sonnet-5-5",
      thinking: { type: "between_tools" },
      effort: "low",
      fallbacks: "default",
    });
    expect(sonnet?.betas).toContain(SERVER_SIDE_FALLBACK_BETA);

    // dry-run: 클라이언트 · 파일 쓰기를 부르지 않고 종료 0
    const lines: string[] = [];
    const code = await runContract(
      { dryRun: true, cases: null },
      {
        config,
        createClient: () => {
          throw new Error("dry-run 이 클라이언트를 만들었다");
        },
        log: (line) => lines.push(line),
        write: () => {
          throw new Error("dry-run 이 파일을 썼다");
        },
      },
    );
    expect(code).toBe(0);
    for (const c of cases.filter((x) => x.inDefault)) {
      expect(
        lines.some((l) => l.includes(c.id)),
        c.id,
      ).toBe(true);
    }
    expect(lines.some((l) => l.includes("console-limit"))).toBe(false);

    // 녹화 파일: 머리글 셋만
    const record = recordOf({
      testCase: cases.find((c) => c.id === "writing_check.l4") ?? cases[0],
      response: {
        status: 200,
        headers: new Headers({
          "request-id": "req_1",
          "content-type": "application/json",
          "retry-after": "3",
          "x-api-key": "test-key",
          authorization: "Bearer test",
          "anthropic-organization-id": "org",
        }),
        body: { ok: true },
      },
      recordedOn: "2026-10-17",
    });
    expect(Object.keys(record.response.headers).sort()).toEqual(
      ["content-type", "request-id", "retry-after"].sort(),
    );
    expect(JSON.stringify(record)).not.toContain("test-key");
    expect(record).toMatchObject({ source: "recorded", sdk: "0.135.0" });

    // 인자
    expect(
      parseContractArgs(["--dry-run", "--case", "models,probe.haiku"]),
    ).toEqual({
      ok: true,
      args: { dryRun: true, cases: ["models", "probe.haiku"] },
    });
    expect(parseContractArgs(["--nope"]).ok).toBe(false);
  });

  it("AI 계약 명령: 모델 정보 대조는 생각 형 · effort · 대체 모델 목록 · 수명이 단가표와 어긋나면 그 칸을 짚는다(손으로 만든 모델 정보로)", () => {
    const book = priceBookOf(
      priceRowsOfSeed(MODEL_PRICES_FIXTURE),
      FIXTURE_EFFECTIVE_FROM,
    );
    const sonnet = fixturePrice("claude-sonnet-5-5");
    expect(
      compareModelInfo(sonnet, infoOf(sonnet.model), { book, inSettings: true })
        .mismatches,
    ).toEqual([]);
    const bad = compareModelInfo(
      sonnet,
      infoOf(sonnet.model, {
        lifecycle: "deprecated",
        retires_at: "2027-01-01",
        allowed_fallback_models: ["claude-unknown-9"],
        capabilities: {
          ...infoOf(sonnet.model).capabilities,
          effort: {
            supported: true,
            low: { supported: true },
            medium: { supported: true },
            high: { supported: true },
            xhigh: null,
            max: { supported: true },
          },
          thinking: {
            supported: true,
            types: {
              adaptive: { supported: true },
              between_tools: { supported: false },
              disabled: { supported: false },
              enabled: { supported: false },
            },
          },
        },
      }),
      { book, inSettings: true },
    );
    expect(bad.mismatches.map((m) => m.field).sort()).toEqual(
      ["allowed_fallback_models", "effort", "lifecycle", "thinking"].sort(),
    );
    expect(
      bad.mismatches.find((m) => m.field === "lifecycle")?.detail,
    ).toContain("2027-01-01");
    // 대체 모델 재시도가 없는 모델(Haiku)이 목록을 받으면 serverFallback 과 어긋남
    const haiku = fixturePrice("claude-haiku-5-5");
    expect(
      compareModelInfo(
        haiku,
        infoOf(haiku.model, { allowed_fallback_models: ["claude-sonnet-5"] }),
        { book, inSettings: true },
      ).mismatches.map((m) => m.field),
    ).toEqual(["serverFallback"]);
  });

  it("AI 계약 명령: 대체 모델 목록이 null 이면 server-side-fallback 머리글로 한 번 더 묻고, 그래도 null 이면 '확인 못 함'으로 적는다", async () => {
    const calls: { id: string; betas?: string[] }[] = [];
    const sonnet = fixturePrice("claude-sonnet-5-5");
    const nullThenList = async (id: string, params: { betas?: string[] }) => {
      calls.push({ id, betas: params.betas });
      return infoOf(id, {
        allowed_fallback_models: params.betas ? ["claude-sonnet-5"] : null,
      });
    };
    const found = await fetchModelInfo(nullThenList, sonnet.model);
    expect(calls).toEqual([
      { id: sonnet.model, betas: undefined },
      { id: sonnet.model, betas: [SERVER_SIDE_FALLBACK_BETA] },
    ]);
    expect(found.fallbackListKnown).toBe(true);
    expect(found.info.allowed_fallback_models).toEqual(["claude-sonnet-5"]);

    const alwaysNull = async (id: string) =>
      infoOf(id, { allowed_fallback_models: null });
    const unknown = await fetchModelInfo(alwaysNull, sonnet.model);
    expect(unknown.fallbackListKnown).toBe(false);
    const book = priceBookOf(
      priceRowsOfSeed(MODEL_PRICES_FIXTURE),
      FIXTURE_EFFECTIVE_FROM,
    );
    const compared = compareModelInfo(sonnet, unknown.info, {
      book,
      inSettings: true,
    });
    // 그 칸만 어긋남으로 세지 않고 '확인 못 함'으로 적는다
    expect(compared.mismatches).toEqual([]);
    expect(compared.notes.join(" ")).toContain("대체 모델 목록 확인 못 함");
  });
});

// ── 관찰 명령 ────────────────────────────────────────────────────

function lines(group: string, outputs: number[], latency: number, over = {}) {
  return outputs.map((output, i) => ({
    group,
    purpose: "writing_check",
    latencyMs: latency + i,
    inputTokens: 2500,
    outputTokens: output,
    thinkingTokens: null,
    cacheReadTokens: 0,
    stopReason: "end_turn",
    strictFirst: true,
    cut: 0,
    checkHits: 0,
    languageMismatch: 0,
    metaHits: 0,
    costUsd: 0.01,
    answeredModel: "claude-sonnet-5-5",
    requestId: `req_${i}`,
    ...over,
  }));
}

describe("관찰표", () => {
  it("관찰표: p99 와 권하는 max_tokens(두 배를 100 단위 올림) · 생각 단계 고르기 규칙", () => {
    expect(recommendMaxTokens(612)).toBe(1300);
    expect(recommendMaxTokens(600)).toBe(1200);
    expect(recommendMaxTokens(1)).toBe(100);
    const outputs = Array.from({ length: 100 }, (_, i) => i + 1);
    const [summary] = summarize(lines("writing_check.adaptive", outputs, 1000));
    expect(summary?.n).toBe(100);
    expect(summary?.output.p99).toBe(99);
    expect(summary?.output.max).toBe(100);
    expect(summary?.recommendedMaxTokens).toBe(recommendMaxTokens(99));
    expect(summary?.strictRate).toBe(1);

    const base = (over: Partial<GroupSummary>): GroupSummary => ({
      ...(summary as GroupSummary),
      ...over,
    });
    // p95 5초 넘는 쪽은 고르지 않는다
    expect(
      chooseThinking(
        base({
          group: "a.adaptive",
          latency: { p50: 1, p95: 6000, p99: 7000 },
        }),
        base({ group: "a.off", latency: { p50: 1, p95: 2000, p99: 3000 } }),
      ),
    ).toBe("off");
    // 둘 다 되면 규칙 위반이 적은 쪽, 같으면 평균 비용이 낮은 쪽
    expect(
      chooseThinking(base({ violations: 1 }), base({ violations: 3 })),
    ).toBe("adaptive");
    expect(
      chooseThinking(base({ avgCostUsd: 0.02 }), base({ avgCostUsd: 0.01 })),
    ).toBe("off");

    // 계획: 묶음마다 n 번 · 예상 비용 · --yes 없으면 부르지 않음
    const config = loadScriptConfig({
      root: join(process.cwd(), "no-seed-here"),
    });
    const plan = observePlan(config, 20);
    expect(plan.groups.map((g) => g.id)).toEqual(
      expect.arrayContaining([
        "writing_check.adaptive",
        "writing_check.off",
        "speaking_eval.answer.l3.adaptive",
        "speaking_eval.answer.l6.off",
        "speaking_eval.presentation.l9.adaptive",
        "thinkout.off",
        "writing_feedback.setting",
      ]),
    );
    expect(plan.calls).toBe(plan.groups.length * 20);
    expect(plan.expectedCostUsd).toBeGreaterThan(0);
    expect(parseObserveArgs([])).toEqual({
      ok: true,
      args: { yes: false, n: 20 },
    });
    expect(parseObserveArgs(["--yes", "--n", "5"])).toEqual({
      ok: true,
      args: { yes: true, n: 5 },
    });
  });

  it("관찰표: 'H4 첫 실호출' 표에 P5a 확인 호출 줄(빈칸)과 이 명령의 첫 응답 줄이 있다", () => {
    const summaries = summarize(
      lines("writing_check.adaptive", [100, 200], 900),
    );
    const first = lines("writing_check.adaptive", [150], 800)[0];
    const md = reportMarkdown({
      date: "2026-10-17",
      summaries,
      firstLine: first ?? null,
    });
    expect(md).toContain("## H4 첫 실호출");
    const tableLines = md.split("\n").filter((l) => l.startsWith("|"));
    expect(tableLines.some((l) => l.includes("pnpm seed:check --probe"))).toBe(
      true,
    );
    const p5a =
      tableLines.find((l) => l.includes("pnpm seed:check --probe")) ?? "";
    // P5a 줄은 빈칸(컨트롤러가 장부에서 옮긴다)
    expect(
      p5a
        .split("|")
        .slice(2, -1)
        .every((cell) => cell.trim() === ""),
    ).toBe(true);
    const own = tableLines.find((l) => l.includes("pnpm ai:observe")) ?? "";
    expect(own).toContain("claude-sonnet-5-5");
    expect(own).toContain("end_turn");
    expect(md).toContain("writing_check.adaptive");
  });
});

// ── fix 1(검토 review-p09c) ──────────────────────────────────────

describe("fix 1", () => {
  it("관찰표: 모든 묶음의 요청에 구조화 출력 형식이 있고 제목이 규격 제목이다", () => {
    const config = loadScriptConfig({
      root: join(process.cwd(), "no-seed-here"),
    });
    const plan = observePlan(config, 1);
    for (const group of plan.groups) {
      const { request } = groupRequest(config, group, 0);
      const format = (
        request.body.output_config as {
          format?: { type?: string; schema?: { title?: string } };
        }
      ).format;
      expect(format?.type, group.id).toBe("json_schema");
      expect(format?.schema?.title, group.id).toBe(group.spec.title);
      // off 묶음은 '생각 끔 + 구조화 출력' 조합이다(plan 위험 11)
      if (group.thinking === "off") {
        expect(request.summary.thinking.type, group.id).not.toBe("adaptive");
      }
    }
  });

  it("관찰표: 200 이 아닌 응답은 묶음마다 '받지 않음'으로 남기고 그 묶음은 adaptive 를 고른다", () => {
    const ok = lines("writing_check.adaptive", [100, 200], 900);
    const rejections = { "writing_check.off": { rejected: { 400: 3 } } };
    const summaries = summarize(ok, rejections);
    const off = summaries.find((s) => s.group === "writing_check.off");
    expect(off).toMatchObject({ n: 0, rejected: { 400: 3 } });
    const adaptive = summaries.find(
      (s) => s.group === "writing_check.adaptive",
    );
    if (!adaptive || !off) throw new Error("요약이 없다");
    expect(chooseThinking(adaptive, off)).toBe("adaptive");
    const md = reportMarkdown({
      date: "2026-10-17",
      summaries,
      firstLine: null,
    });
    expect(md).toContain("받지 않음(400 3회)");
    expect(md).toContain("- writing_check: adaptive");
    expect(md).toContain("받지 않은 쪽은 고르지 않는다");
  });

  it("AI 계약 명령: 생각 꺼내기는 done 이면 그 턴에서 멈추고 보낸 턴까지만 녹화한다(가짜 클라이언트)", async () => {
    const done = JSON.parse(
      readFileSync(join(SAMPLES_DIR, "thinkout.done.json"), "utf8"),
    ).response.body;
    const fake = createFakeAnthropic([
      { when: { purpose: "thinkout" }, reply: { kind: "message", body: done } },
    ]);
    const client = createAnthropicClient({
      env: { ANTHROPIC_API_KEY: "test-key" },
      fetch: fake.fetch,
    });
    const written: string[] = [];
    const logs: string[] = [];
    const config = loadScriptConfig({
      root: join(process.cwd(), "no-seed-here"),
    });
    const code = await runContract(
      { dryRun: false, cases: ["thinkout.l6"] },
      {
        config,
        createClient: () => client,
        log: (line) => logs.push(line),
        write: (path) => written.push(path),
      },
    );
    expect(code).toBe(0);
    expect(fake.requests).toHaveLength(1);
    expect(written).toEqual([
      join("tests/fixtures/ai/recorded", "thinkout.l6.turn1.json"),
    ]);
    expect(logs.some((l) => l.includes("어긋남 0"))).toBe(true);
  });
});

// ── fix 2(검토 review-p09c-2) ────────────────────────────────────

describe("fix 2", () => {
  it("관찰표: 일시 오류(5xx · 한도 아닌 429 · 응답 없음)는 묶음을 버리지 않고 '일시 오류 n회'로 따로 센다", () => {
    const adaptiveLines = lines("writing_check.adaptive", [100, 200], 900);
    const offLines = lines("writing_check.off", [100, 200], 900, {
      checkHits: 2,
    });
    const summaries = summarize([...adaptiveLines, ...offLines], {
      "writing_check.adaptive": { transient: { 529: 1, 429: 1, 0: 1 } },
    });
    const adaptive = summaries.find(
      (s) => s.group === "writing_check.adaptive",
    );
    const off = summaries.find((s) => s.group === "writing_check.off");
    if (!adaptive || !off) throw new Error("요약이 없다");
    // 400 만 '받지 않음'이고 나머지는 일시 오류로, 지연 · 위반 통계(n 2)에 들지 않는다
    expect(adaptive).toMatchObject({
      n: 2,
      rejected: {},
      transientErrors: { 0: 1, 429: 1, 529: 1 },
    });
    // 일시 오류가 있어도 고르기는 통계로 한다(위반이 적은 adaptive)
    expect(chooseThinking(adaptive, off)).toBe("adaptive");
    const md = reportMarkdown({
      date: "2026-10-17",
      summaries,
      firstLine: null,
    });
    expect(md).toContain("일시 오류 3회");
    expect(md).not.toContain("받지 않음(");
  });

  it("관찰 명령: 실행 중 연결이 한 번 끊겨도 일시 오류로 세고 다음 사례로 가며 산출물을 끝까지 쓴다(가짜 클라이언트)", async () => {
    const okBody = (title: string) =>
      JSON.parse(readFileSync(join(SAMPLES_DIR, `${title}.ok.json`), "utf8"))
        .response.body;
    const fake = createFakeAnthropic([
      { reply: { kind: "network-error" }, times: 1 },
      ...[
        "writing_check",
        "writing_feedback",
        "speaking_eval.answer",
        "speaking_eval.presentation",
        "thinkout",
      ].map((title) => ({
        when: { purpose: title },
        reply: { kind: "message" as const, body: okBody(title) },
      })),
    ]);
    const client = createAnthropicClient({
      env: { ANTHROPIC_API_KEY: "test-key" },
      fetch: fake.fetch,
    });
    const config = loadScriptConfig({
      root: join(process.cwd(), "no-seed-here"),
    });
    const plan = observePlan(config, 1);
    const written = new Map<string, string>();
    const logs: string[] = [];
    const code = await runObserve(
      { yes: true, n: 1 },
      {
        config,
        createClient: () => client,
        log: (line) => logs.push(line),
        write: (path, text) => written.set(path, text),
        now: () => new Date("2026-10-17T05:00:00Z"),
      },
    );
    expect(code).toBe(0);
    // 끊긴 첫 요청 뒤에도 묶음마다 하나씩 모두 보냈다
    expect(fake.requests).toHaveLength(plan.groups.length);
    expect([...written.keys()].sort()).toEqual(
      [
        join("docs/research", "2026-10-17-ai-observe.jsonl"),
        join("docs/research", "2026-10-17-ai-observe.md"),
      ].sort(),
    );
    const md =
      written.get(join("docs/research", "2026-10-17-ai-observe.md")) ?? "";
    expect(md).toContain("일시 오류 1회");
    const jsonl = (
      written.get(join("docs/research", "2026-10-17-ai-observe.jsonl")) ?? ""
    )
      .trim()
      .split("\n");
    expect(jsonl).toHaveLength(plan.groups.length - 1);
    // 응답 본문 · 오류 메시지를 줄 출력에 남기지 않는다
    expect(logs.join("\n")).not.toContain("fetch failed");
  });

  it("AI 계약 명령: 응답 없는 오류(연결 · 타임아웃)는 다시 던지지 않고 status 0 실패로 그 사례를 어긋남으로 적는다", async () => {
    const fake = createFakeAnthropic([{ reply: { kind: "network-error" } }]);
    const client = createAnthropicClient({
      env: { ANTHROPIC_API_KEY: "test-key" },
      fetch: fake.fetch,
    });
    const config = loadScriptConfig({
      root: join(process.cwd(), "no-seed-here"),
    });
    const logs: string[] = [];
    const written: string[] = [];
    const code = await runContract(
      { dryRun: false, cases: ["writing_check.l4", "probe.haiku"] },
      {
        config,
        createClient: () => client,
        log: (line) => logs.push(line),
        write: (path) => written.push(path),
      },
    );
    expect(code).toBe(1);
    expect(fake.requests).toHaveLength(2);
    expect(logs.filter((l) => l.includes(" · 0 · ")).length).toBe(2);
    expect(logs.some((l) => l.includes("어긋남 2"))).toBe(true);
    expect(logs.join("\n")).not.toContain("fetch failed");
  });
});

// ── fix 3(검토 review-p09c-3) ────────────────────────────────────

describe("fix 3", () => {
  it("9절 계약: 녹화 표본(recordOf 꼴, expect 없음)이 있어도 표본 읽기 · 규격 대 보기 · 콘솔 한도 분류가 깨지지 않는다", () => {
    const dir = mkdtempSync(join(tmpdir(), "momo-recorded-"));
    try {
      const config = loadScriptConfig({
        root: join(process.cwd(), "no-seed-here"),
      });
      const cases = contractCases(config);
      const ok = readFileSync(
        join(SAMPLES_DIR, "writing_check.ok.json"),
        "utf8",
      );
      const workspace = JSON.parse(
        readFileSync(
          join(SAMPLES_DIR, "error.console-workspace-400.json"),
          "utf8",
        ),
      ).response;
      const write = (id: string, status: number, body: unknown) =>
        writeFileSync(
          join(dir, `${id}.json`),
          JSON.stringify(
            recordOf({
              testCase: cases.find((c) => c.id === id),
              response: {
                status,
                headers: new Headers({ "request-id": "req_recorded" }),
                body,
              },
              recordedOn: "2026-10-17",
            }),
          ),
        );
      write("writing_check.l4", 200, JSON.parse(ok).response.body);
      write("console-limit", workspace.status, workspace.body);
      const rec = readSamples(dir);
      expect(rec).toHaveLength(2);
      expect(rec.every((s) => s.source === "recorded")).toBe(true);
      // 규격에 대 볼 녹화 호출 하나(writing_check)
      expect(checkRecordedCalls(rec)).toBe(1);
      // 콘솔 한도: 손으로 만든 것 둘 + H12 녹화(case console-limit) 하나
      const limits = consoleLimitSamples(handmade, rec);
      expect(limits.map((s) => s.case)).toContain("console-limit");
      checkConsoleLimits(limits);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("관찰표: 200 아닌 응답은 8절 분류로 받지 않음(400 거부) · 설정 · 한도 오류(콘솔 한도 · 계정 · 404 · 413, 앞 둘은 멈춤) · 일시 오류(5xx · 한도 아닌 429 · 응답 없음)로 가른다", () => {
    const of = (status: number, body: unknown) =>
      observeFailureOf(status, body, new Headers());
    const workspace = consoleLimitBody("workspace");
    const tier = consoleLimitBody("tier");
    expect(of(400, errorBody(400, "invalid_request_error", "bad"))).toEqual({
      kind: "rejected",
      key: "400",
      stop: false,
    });
    expect(of(workspace.status, workspace.body)).toEqual({
      kind: "config",
      key: "console_limit:400",
      stop: true,
    });
    expect(of(tier.status, tier.body)).toEqual({
      kind: "config",
      key: "console_limit:429",
      stop: true,
    });
    expect(of(401, errorBody(401, "authentication_error", "key"))).toEqual({
      kind: "config",
      key: "account:401",
      stop: true,
    });
    for (const status of [404, 413]) {
      expect(of(status, errorBody(status, "x", "y"))).toEqual({
        kind: "config",
        key: `same_error:${status}`,
        stop: false,
      });
    }
    for (const status of [500, 529, 429]) {
      expect(of(status, errorBody(status, "x", "y"))).toEqual({
        kind: "transient",
        key: String(status),
        stop: false,
      });
    }
    expect(
      of(0, { type: "error", error: { type: "APIConnectionError" } }),
    ).toEqual({
      kind: "transient",
      key: "0",
      stop: false,
    });
  });

  const observeWith = async (rules: FakeRule[]) => {
    const fake = createFakeAnthropic(rules);
    const client = createAnthropicClient({
      env: { ANTHROPIC_API_KEY: "test-key" },
      fetch: fake.fetch,
    });
    const config = loadScriptConfig({
      root: join(process.cwd(), "no-seed-here"),
    });
    const written = new Map<string, string>();
    const code = await runObserve(
      { yes: true, n: 1 },
      {
        config,
        createClient: () => client,
        log: () => {},
        write: (path, text) => written.set(path, text),
        now: () => new Date("2026-10-17T05:00:00Z"),
      },
    );
    const md =
      written.get(join("docs/research", "2026-10-17-ai-observe.md")) ?? "";
    const row = (group: string) =>
      md.split("\n").find((l) => l.startsWith(`| ${group} |`)) ?? "";
    return {
      code,
      fake,
      written,
      md,
      row,
      groups: observePlan(config, 1).groups.length,
    };
  };
  const okRules = (): FakeRule[] =>
    [
      "writing_check",
      "writing_feedback",
      "speaking_eval.answer",
      "speaking_eval.presentation",
      "thinkout",
    ].map((title) => ({
      when: { purpose: title },
      reply: {
        kind: "message" as const,
        body: JSON.parse(
          readFileSync(join(SAMPLES_DIR, `${title}.ok.json`), "utf8"),
        ).response.body,
      },
    }));

  it("관찰 명령: 콘솔 한도 400 은 '설정 · 한도 오류'로 세고 남은 묶음을 건너뛰며 그때까지의 산출물 둘을 쓴다(가짜 클라이언트)", async () => {
    const workspace = consoleLimitBody("workspace");
    const run = await observeWith([
      {
        reply: {
          kind: "error",
          status: workspace.status,
          body: workspace.body,
        },
      },
    ]);
    expect(run.code).toBe(0);
    expect(run.fake.requests).toHaveLength(1);
    expect(run.written.size).toBe(2);
    expect(run.row("writing_check.adaptive")).toContain(
      "설정 · 한도 오류 1회(console_limit:400 1회)",
    );
    expect(run.md).not.toContain("받지 않음(");
    expect(run.md).toContain(`남은 묶음 ${run.groups - 1}개를 건너뛰었다`);
  });

  it("관찰 명령: 400 요청 거부는 '받지 않음', 529 는 '일시 오류'로 세고 나머지 묶음을 계속 돈다(가짜 클라이언트)", async () => {
    const run = await observeWith([
      {
        reply: {
          kind: "error",
          status: 400,
          body: errorBody(
            400,
            "invalid_request_error",
            "thinking type not supported",
          ),
        },
        times: 1,
      },
      {
        reply: {
          kind: "error",
          status: 529,
          body: errorBody(529, "overloaded_error", "x"),
        },
        times: 1,
      },
      ...okRules(),
    ]);
    expect(run.code).toBe(0);
    expect(run.fake.requests).toHaveLength(run.groups);
    expect(run.row("writing_check.adaptive")).toContain("받지 않음(400 1회)");
    expect(run.row("writing_check.off")).toContain("일시 오류 1회(529 1회)");
    expect(run.md).not.toContain("건너뛰었다");
    // 받지 않은 쪽(adaptive)은 고르지 않는다
    expect(run.md).toContain("- writing_check: off");
  });
});
