// 모든 호출 목적의 보낼 응답 규격에 $defs · $ref 가 없는가(대본 3회차 400 'The compiled grammar is too large' — $ref 꼴이 API 문법 한도를 넘음,
// 2026-11-06). 요청 본문을 만드는 두 길(회화 턴 · 끝맺음은 server/ai/talk.ts talkOutputFormatOf, 그 밖은 server/ai/run.ts aiOutputFormatOf)이
// 같은 펼치기(core/ai/inline-refs)를 거친다. 실제 API 를 부르지 않는다.
import { describe, expect, it } from "vitest";
import type { CallSpec } from "@/core/ai/calls/common";
import {
  speakingAnswerSpec,
  speakingConfirmSpec,
  speakingPresentationSpec,
} from "@/core/ai/calls/speaking";
import {
  talkLessonClosingSpec,
  talkLessonTurnSpec,
} from "@/core/ai/calls/talk-lesson";
import { thinkoutSpec } from "@/core/ai/calls/thinkout";
import { writingCheckSpec, writingFeedbackSpec } from "@/core/ai/calls/writing";
import { hasJsonSchemaRefs } from "@/core/ai/inline-refs";
import { aiOutputFormatOf } from "@/server/ai/run";
import { talkOutputFormatOf } from "@/server/ai/talk";
import { withFormat } from "../../scripts/ai-contract";
import {
  SPEAKING_CONFIRM_SAMPLE,
  speakingAnswerSample,
  speakingPresentationSample,
  thinkoutSample,
  WRITING_CHECK_SAMPLE,
  writingFeedbackSample,
} from "../fixtures/ai/sample-inputs";
import { lessonInput } from "../fixtures/ai/talk-lesson-inputs";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();

function wireOf<I, O, R>(spec: CallSpec<I, O, R>, input: I) {
  return spec.wireSchema(input, spec.rulesOf(values, input));
}

/** run.ts 길로 보내는 목적(회화 밖)과 그 견본 입력. */
const RUN_CASES: [string, () => unknown][] = [
  ["writing_check", () => wireOf(writingCheckSpec, WRITING_CHECK_SAMPLE)],
  [
    "writing_feedback 6",
    () => wireOf(writingFeedbackSpec, writingFeedbackSample(6)),
  ],
  [
    "writing_feedback 10",
    () => wireOf(writingFeedbackSpec, writingFeedbackSample(10)),
  ],
  [
    "speaking_eval 답",
    () => wireOf(speakingAnswerSpec, speakingAnswerSample(4)),
  ],
  [
    "speaking_eval 발표",
    () => wireOf(speakingPresentationSpec, speakingPresentationSample(10)),
  ],
  [
    "speaking_eval 확인",
    () => wireOf(speakingConfirmSpec, SPEAKING_CONFIRM_SAMPLE),
  ],
  ["thinkout", () => wireOf(thinkoutSpec, thinkoutSample(1))],
];

describe("모든 목적의 보낼 응답 규격에 $ref · $defs 가 없다", () => {
  for (const [name, wire] of RUN_CASES)
    it(`${name}(run.ts aiOutputFormatOf)`, () => {
      const format = aiOutputFormatOf(wire());
      expect(format.type).toBe("json_schema");
      expect(hasJsonSchemaRefs(format.schema)).toBe(false);
    });
  for (const [name, spec] of [
    ["talk_turn", talkLessonTurnSpec],
    ["talk_closing", talkLessonClosingSpec],
  ] as const)
    for (const level of [3, 4, 5, 10])
      it(`${name} ${level}단계(talk.ts talkOutputFormatOf)`, () => {
        const input = lessonInput(level);
        expect(
          hasJsonSchemaRefs(
            talkOutputFormatOf(
              spec.wireSchema(input, spec.rulesOf(values, input)),
            ).schema,
          ),
        ).toBe(false);
      });
  it("계약 · 관찰 명령의 본문(scripts/ai-contract withFormat)도 모든 목적에서 $ref 없이 앱과 같은 꼴이다", () => {
    for (const [name, wire] of RUN_CASES) {
      const body = withFormat({ output_config: {} }, wire() as never) as {
        output_config: { format: { schema: unknown } };
      };
      expect(hasJsonSchemaRefs(body.output_config.format.schema), name).toBe(
        false,
      );
      expect(body.output_config.format.schema).toEqual(
        aiOutputFormatOf(wire()).schema,
      );
    }
    const input = lessonInput(3);
    const wire = talkLessonTurnSpec.wireSchema(
      input,
      talkLessonTurnSpec.rulesOf(values, input),
    );
    const body = withFormat({ output_config: {} }, wire as never) as {
      output_config: { format: { schema: unknown } };
    };
    expect(body.output_config.format.schema).toEqual(
      talkOutputFormatOf(wire).schema,
    );
  });
});
