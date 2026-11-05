// 짝 · 같이 해 보기 첫 시도 판정 공용 함수(plan 다 · 아 검토 M1 — 지표 · 되짚기가 같이 쓴다). 수업은 3단계 단원 1 정규 시드 셋,
// 말하기 질문 품사 표는 seed/vocab.json 을 그 수업 글로 좁힌 표다. 시험 이름은 정본 15절 번호(AC-22k)다.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type AttemptInput,
  lemmaLookup,
  type OutcomeContext,
} from "@/core/session/attempt";
import {
  spareOutcomeOf,
  togetherOutcomeOf,
} from "@/core/session/spare-outcome";
import { questionTextsOf } from "@/core/speaking/judge";
import { type MeaningWord, meaningWordsFor } from "@/core/speaking/meaning";
import {
  defaultSettings,
  referenceSet,
  teachSeedLessons,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";

const ref = referenceSet(defaultSettings());
const speaking = teachSeedLessons().speaking;
const vocab: MeaningWord[] = JSON.parse(
  readFileSync(join(resolve(__dirname, "../../seed"), "vocab.json"), "utf8"),
).vocab;
const ctx: OutcomeContext = {
  answerMatchPass: TEST_SETTINGS["speaking.answer_match_pass"].value,
  homophones: [],
  unitWords: speaking.unitWords,
  lemmaOf: lemmaLookup(ref.vocab.vocab),
  appJudgedQuestions: false,
  repeatGoodRate: TEST_SETTINGS["ui.match_phrase_levels"].value[0],
  meaningWords: meaningWordsFor(questionTextsOf(speaking), vocab),
};
const v2 = (kind: string, content: Record<string, unknown>) =>
  ({ v: 2, kind, step: "final", ...content }) as unknown as AttemptInput;

describe("짝 · 같이 해 보기 첫 시도 판정(공용)", () => {
  it("AC-22k 질문 짝은 judge 칸이 없으면 혼자 질문과 같은 판정 함수로 셈하고(일치율이 문턱을 넘어도 의미가 틀리면 틀림), 있으면 그 합친 판정을 따른다", () => {
    const activity = { kind: "spare", base: "question", index: 0 } as const;
    const said = (heard: string, extra: Record<string, unknown> = {}) =>
      v2("question", { heard: [heard], failures: 0, slot: "spare", ...extra });
    expect(
      spareOutcomeOf(activity, speaking, said("No, they eat rice."), ctx),
    ).toBe("correct");
    expect(
      spareOutcomeOf(activity, speaking, said("Max and Ted eat rice."), ctx),
    ).toBe("correct");
    // 허용 답 'They eat rice.'와 일치율 1 이지만 방향이 틀림
    expect(
      spareOutcomeOf(activity, speaking, said("Yes, they eat rice."), ctx),
    ).toBe("wrong");
    expect(
      spareOutcomeOf(
        activity,
        speaking,
        said("No, they eat rice.", {
          judge: {
            meaning: "ok",
            final: "retry",
            by: "app",
            expressionDone: false,
          },
        }),
        ctx,
      ),
    ).toBe("wrong");
    expect(
      spareOutcomeOf(
        activity,
        speaking,
        v2("question", {
          heard: [],
          failures: 3,
          slot: "spare",
          skipped: "recognition",
        }),
        ctx,
      ),
    ).toBe("unscored");
  });

  it("AC-22k 말하기 같이 해 보기는 고른 보기와 처음 말한 글을 함께 보고, 말은 의미 검사를 거친 판정이다", () => {
    const t0 = speaking.teach?.together[0];
    if (!t0?.answerNo) throw new Error("같이 해 보기 고르기 없음");
    const activity = { kind: "together", index: 0 } as const;
    const tries = (list: unknown[]) =>
      v2("together", { index: 0, tries: list });
    expect(
      togetherOutcomeOf(
        activity,
        speaking,
        tries([{ choice: t0.answerNo, heard: "No, they eat cookies." }]),
        ctx,
      ),
    ).toBe("correct");
    // 보기는 맞았지만 말이 방향이 틀림
    expect(
      togetherOutcomeOf(
        activity,
        speaking,
        tries([{ choice: t0.answerNo, heard: "Yes, they eat cookies." }]),
        ctx,
      ),
    ).toBe("wrong");
    expect(
      togetherOutcomeOf(
        activity,
        speaking,
        tries([{ choice: t0.answerNo === 1 ? 2 : 1 }]),
        ctx,
      ),
    ).toBe("wrong");
  });

  it("AC-22k 저장된 같이 해 보기에 judge 가 있어도 첫 시도의 고른 보기를 본다(고르기 틀림 → 둘째 시도에 말한 바른 답의 judge 가 맞음이어도 틀림, 검토 I1)", () => {
    const t0 = speaking.teach?.together[0];
    if (!t0?.answerNo) throw new Error("같이 해 보기 고르기 없음");
    const activity = { kind: "together", index: 0 } as const;
    const right = {
      meaning: "ok",
      bundle: "accepted",
      final: "correct",
      by: "app",
      expressionDone: true,
    };
    const wrongChoice = t0.answerNo === 1 ? 2 : 1;
    expect(
      togetherOutcomeOf(
        activity,
        speaking,
        v2("together", {
          index: 0,
          tries: [
            { choice: wrongChoice },
            { choice: t0.answerNo, heard: "No, they eat cookies." },
          ],
          judge: right,
        }),
        ctx,
      ),
    ).toBe("wrong");
    // 첫 시도에 말이 있으면 그 말의 정오는 judge.final 이다(고른 보기도 함께 본다)
    expect(
      togetherOutcomeOf(
        activity,
        speaking,
        v2("together", {
          index: 0,
          tries: [{ choice: t0.answerNo, heard: "No, they eat cookies." }],
          judge: { ...right, final: "retry", expressionDone: false },
        }),
        ctx,
      ),
    ).toBe("wrong");
    expect(
      togetherOutcomeOf(
        activity,
        speaking,
        v2("together", {
          index: 0,
          tries: [{ choice: t0.answerNo, heard: "No, they eat cookies." }],
          judge: right,
        }),
        ctx,
      ),
    ).toBe("correct");
  });
});
