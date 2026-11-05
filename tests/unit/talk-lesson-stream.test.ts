// 새 꼴 회화 수업 턴의 흘려 받기(DB 없는 몫, 회화 plan 묶음 8 — server/ai/talk.ts streamTalkLesson). 가짜 Anthropic 의 SSE 'stream' 응답을
// SDK 클라이언트에 끼워, 새 꼴 문장 문이 물음표 문장을 지우지 않는지(잡아 두기 · 검사는 서버 턴 길 몫, 정한 것 19)와 앱 확인이 소리 줄을
// 바꾼 턴의 ai_calls 상태(묶음 6 검토 8절 (라))를 본다. 실제 API 를 부르지 않는다. 숫자는 시험용 설정 · 견본에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type TalkLessonInput,
  talkLessonClosingSpec,
  talkLessonTurnSpec,
} from "@/core/ai/calls/talk-lesson";
import { capabilitiesOf, requestConfigOf } from "@/core/ai/combo";
import { priceBookOf, priceRowsOfSeed } from "@/core/ai/cost";
import { createMasker } from "@/core/ai/mask";
import {
  ForbiddenFileSchema,
  MetaSentencesFileSchema,
} from "@/core/seed/schema/reference";
import { createAnthropicClient } from "@/server/ai/client";
import {
  streamTalkLesson,
  type TalkAttemptRecord,
  type TalkLessonStreamPlan,
} from "@/server/ai/talk";
import {
  createFakeAnthropic,
  type FakeReply,
  type FakeRule,
} from "../fixtures/ai/fake-anthropic";
import {
  FIXTURE_EFFECTIVE_FROM,
  MODEL_PRICES_FIXTURE,
} from "../fixtures/ai/model-prices";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
} from "../fixtures/ai/sample-inputs";
import { talkLessonSampleFor } from "../fixtures/ai/talk-lesson-inputs";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const SAMPLES = join(process.cwd(), "tests/fixtures/ai/samples");
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
const comboBook = new Map(
  MODEL_PRICES_FIXTURE.models.map((m) => [
    m.model,
    { caps: capabilitiesOf(m) },
  ]),
);
const priceBook = priceBookOf(
  priceRowsOfSeed(MODEL_PRICES_FIXTURE),
  FIXTURE_EFFECTIVE_FROM,
);
const masker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});
const SAFE_LINE = "Let's talk about something fun!";

function sampleBody(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(SAMPLES, `${id}.json`), "utf8")).response
    .body;
}
const once = (body: unknown): FakeRule => ({
  reply: { kind: "stream", body, chunks: 7 } satisfies FakeReply,
  times: 1,
});

function harness(rules: FakeRule[], input: TalkLessonInput) {
  const fake = createFakeAnthropic(rules);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  const spec = input.turn.closing ? talkLessonClosingSpec : talkLessonTurnSpec;
  const config = requestConfigOf({
    purpose: spec.purpose,
    level: input.level,
    values,
    book: comboBook,
  });
  const rows: TalkAttemptRecord[] = [];
  const sentences: string[] = [];
  const startedAt = new Date();
  const plan: TalkLessonStreamPlan = {
    spec,
    input,
    rules: spec.rulesOf(values, input),
    config,
    otherModelConfig: null,
    masker,
    forbidden: FORBIDDEN,
    metaPhrases: META,
    book: priceBook,
    client,
    clock: () => new Date(),
    startedAt,
    requestReceivedAt: startedAt,
    safeLine: SAFE_LINE,
    onSentence: input.turn.closing ? undefined : (s) => sentences.push(s),
    record: async (row) => {
      rows.push(row);
    },
  };
  return { plan, rows, sentences };
}

describe("새 꼴 흘려 받기(streamTalkLesson)", () => {
  it("회화 plan 정한 것 19 새 꼴 문장 문은 1~3단계 물음표 문장을 지우지 않고 넘긴다(잡아 두기 · 질문 검사는 서버 턴 길)", async () => {
    const id = "talk_turn.v2-l3-ai";
    const { plan, rows, sentences } = harness(
      [once(sampleBody(id))],
      talkLessonSampleFor(id),
    );
    const result = await streamTalkLesson(plan);
    expect(result.ok).toBe(true);
    expect(sentences).toContain("When is your free day?");
    if (!result.ok) throw new Error("성공이어야 한다");
    expect(result.soundFixed).toEqual({
      model: false,
      choices: false,
      overlap: false,
    });
    expect(rows.map((r) => r.status)).toEqual(["success"]);
  });

  it("묶음 6 검토 8절 (라) 앱 확인이 범위 밖 따라 할 말을 바꾼 턴은 소리 줄 바뀜으로 알리고 ai_calls 를 '검증 실패'로 남긴다", async () => {
    const id = "talk_turn.v2-l3-model-offband";
    const { plan, rows } = harness(
      [once(sampleBody(id))],
      talkLessonSampleFor(id),
    );
    const result = await streamTalkLesson(plan);
    if (!result.ok) throw new Error("성공이어야 한다");
    expect(result.value.model_line).toBe("The weekend.");
    // 흘린 'The weekend is fun!' 이 바꾼 따라 할 말 'The weekend.' 를 담았다(지울 수 없어 겹침으로 남김 — 검토 I-1)
    expect(result.soundFixed).toEqual({
      model: true,
      choices: false,
      overlap: true,
    });
    expect(rows.map((r) => r.status)).toEqual(["validation_failed"]);
  });
});
