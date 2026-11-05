// 되짚기 마무리 줄 고르기(델타 spec 2026-10-29 가르치고 배우는 수업 설계 5 · 8 끝, plan 사, 정본 03 세션 결과 행 · 15절 AC-6g).
// 수업은 3단계 단원 1 정규 시드 셋(teachSeedLessons)을 그대로 읽고, 문턱 lesson.recap_min_evidence · lesson.recap_can_ratio 와
// 짝 상한 lesson.spares_per_session.<영역>은 정규 시드 설정 파일에서 읽는다(숫자를 다시 적지 않음). 시험 이름은 정본 15절 번호다.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type AttemptInput,
  lemmaLookup,
  type OutcomeContext,
  questionJudgeContextOf,
} from "@/core/session/attempt";
import { type Activity, activitiesOf } from "@/core/session/preview";
import {
  type RecapSettings,
  recapItemsOf,
  recapLineOf,
} from "@/core/session/recap";
import { sparesFromFinals } from "@/core/session/spares";
import { judgeSpeakingQuestion, questionTextsOf } from "@/core/speaking/judge";
import { type MeaningWord, meaningWordsFor } from "@/core/speaking/meaning";
import {
  defaultSettings,
  referenceSet,
  teachSeedLessons,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";

const SEED = resolve(__dirname, "../../seed");
const SETTINGS = JSON.parse(
  readFileSync(join(SEED, "settings.json"), "utf8"),
) as { settings: { key: string; value: unknown }[] };
const settingOf = (key: string): number => {
  const value = SETTINGS.settings.find((row) => row.key === key)?.value;
  if (typeof value !== "number") throw new Error(`${key} 없음`);
  return value;
};
/** 정규 시드 설정의 되짚기 문턱. */
const RECAP: RecapSettings = {
  minEvidence: settingOf("lesson.recap_min_evidence"),
  canRatio: settingOf("lesson.recap_can_ratio"),
};

const ref = referenceSet(defaultSettings());
const teach = teachSeedLessons();
const vocab: MeaningWord[] = JSON.parse(
  readFileSync(join(SEED, "vocab.json"), "utf8"),
).vocab;
const ctxOf = (lesson: { unitWords: readonly string[] }): OutcomeContext => ({
  answerMatchPass: TEST_SETTINGS["speaking.answer_match_pass"].value,
  homophones: [],
  unitWords: lesson.unitWords,
  lemmaOf: lemmaLookup(ref.vocab.vocab),
  // 3단계 혼자 질문은 AI 판정(시도 꼴 judge 칸 — 서버 액션이 채움)
  appJudgedQuestions: false,
  repeatGoodRate: TEST_SETTINGS["ui.match_phrase_levels"].value[0],
  meaningWords: meaningWordsFor(questionTextsOf(teach.speaking), vocab),
});

const final = (kind: string, content: Record<string, unknown>) =>
  ({ v: 2, kind, step: "final", ...content }) as unknown as AttemptInput;
/** 되짚기가 있는 수업(teach) 결과 — 없으면 던진다. */
const must = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error("되짚기 없음");
  return value;
};

function activitiesFor(area: "reading" | "writing" | "speaking") {
  const lesson = teach[area];
  if (!lesson.teach) throw new Error("teach 없음");
  return activitiesOf({
    area,
    level: 3,
    content: lesson.content,
    teach: lesson.teach,
  } as Parameters<typeof activitiesOf>[0]);
}
const noOf = (
  activities: readonly Activity[],
  match: (a: Activity) => boolean,
): number => {
  const index = activities.findIndex(match);
  if (index < 0) throw new Error("활동 없음");
  return index + 1;
};
const soloNo = (activities: readonly Activity[], kind: string, index: number) =>
  noOf(activities, (a) => a.kind === kind && "index" in a && a.index === index);
const spareNo = (
  activities: readonly Activity[],
  base: string,
  index: number,
) =>
  noOf(
    activities,
    (a) => a.kind === "spare" && a.base === base && a.index === index,
  );

// ── 읽기 ──
const reading = teach.reading;
const readingActs = activitiesFor("reading");
const readingCtx = ctxOf(reading);
const wrongNo = (answerNo: number) => (answerNo === 1 ? 2 : 1);
/** 읽기 혼자 문항 i 의 첫 시도(맞음 · 틀림, 도움 칸). */
const readSolo = (i: number, right: boolean, extra = {}) => {
  const q = reading.content.questions[i];
  if (!q) throw new Error("문항 없음");
  return [
    soloNo(readingActs, "reading-question", i),
    final("reading-question", {
      tries: [right ? q.answerNo : wrongNo(q.answerNo)],
      ...extra,
    }),
  ] as const;
};
/** 읽기 문항 i 의 짝 첫 시도. */
const readSpare = (i: number, right: boolean, extra = {}) => {
  const answerNo = reading.content.questions[i]?.spare?.answerNo;
  if (answerNo === undefined) throw new Error("짝 없음");
  return [
    spareNo(readingActs, "reading-question", i),
    final("reading-question", {
      tries: [right ? answerNo : wrongNo(answerNo)],
      slot: "spare",
      ...extra,
    }),
  ] as const;
};
const readingRecap = (
  finals: (readonly [number, AttemptInput])[],
  settings = RECAP,
) =>
  must(
    recapLineOf({
      lesson: reading,
      activities: readingActs,
      finals: new Map(finals),
      ctx: readingCtx,
      settings,
    }),
  );

// ── 말하기(첫 목표 speak-3-1-3 = 질문 넷) ──
const speaking = teach.speaking;
const speakingActs = activitiesFor("speaking");
const speakingCtx = ctxOf(speaking);
const questions = speaking.content.questions;
/** 말하기 혼자 질문 i 의 끝 시도: 말한 글과 서버가 채운 판정(AI 원 판정은 맞음으로 둠). */
const askSolo = (i: number, heard: string) => {
  const q = questions[i];
  if (!q) throw new Error("질문 없음");
  return [
    soloNo(speakingActs, "question", i),
    final("question", {
      heard: [heard],
      failures: 0,
      judge: judgeSpeakingQuestion(
        q,
        heard,
        questionJudgeContextOf(speakingCtx),
        "correct",
      ),
    }),
  ] as const;
};
/** 판정하지 못한 혼자 질문(U): 건너뜀 · 'AI 쉬는 중' · 소리 없음. */
const askU = (i: number, how: "recognition" | "ai_rest" | "tech") =>
  [
    soloNo(speakingActs, "question", i),
    final("question", {
      heard: [],
      failures: 0,
      ...(how === "tech" ? { techError: "speak_fail" } : { skipped: how }),
    }),
  ] as const;
const accepted = (i: number): string => {
  const first = questions[i]?.accepted?.[0];
  if (first === undefined) throw new Error("허용 답 없음");
  return first;
};
const speakingRecap = (finals: (readonly [number, AttemptInput])[]) =>
  must(
    recapLineOf({
      lesson: speaking,
      activities: speakingActs,
      finals: new Map(finals),
      ctx: speakingCtx,
      settings: RECAP,
    }),
  );

describe("되짚기 마무리 줄 고르기", () => {
  it("AC-6g 정규 시드 설정에 되짚기 문턱 둘이 있고, 유효 문항 하한은 하나보다 크며 비율 문턱은 0 과 1 사이다", () => {
    expect(RECAP.minEvidence).toBeGreaterThan(1);
    expect(RECAP.canRatio).toBeGreaterThan(0);
    expect(RECAP.canRatio).toBeLessThanOrEqual(1);
  });

  it("AC-6g 핵심 목표에 이어진 혼자 문항을 모두 첫 시도에 맞히면 closeKo 이고, 짝 첫 시도로 되찾은 문항도 독립 해냄이다", () => {
    const count = reading.content.questions.length;
    expect(readingRecap([0, 1, 2].map((i) => readSolo(i, true)))).toEqual({
      line: "closeKo",
      evidence: { valid: count, done: count, ratio: 1 },
    });
    // 문항 1 은 첫 시도에 틀렸지만 짝 첫 시도에 맞힘
    const recovered = readingRecap([
      readSolo(0, true),
      readSolo(1, false),
      readSpare(1, true),
      readSolo(2, true),
    ]);
    expect(recovered.line).toBe("closeKo");
    expect(recovered.evidence.done).toBe(count);
    // 짝도 틀리면 해냄이 아니다
    const failed = readingRecap([
      readSolo(0, true),
      readSolo(1, false),
      readSpare(1, false),
      readSolo(2, true),
    ]);
    expect(failed.evidence).toEqual({
      valid: count,
      done: count - 1,
      ratio: (count - 1) / count,
    });
  });

  it("AC-6g U 를 빼고 문항 하나만 남은 세션은 그 하나를 맞혀도 closeKoPracticed 다(인식 실패 · 'AI 쉬는 중' · 소리 없음은 셈에서 뺀다)", () => {
    const result = speakingRecap([
      askSolo(0, accepted(0)),
      askU(1, "ai_rest"),
      askU(2, "tech"),
      askU(3, "recognition"),
    ] as (readonly [number, AttemptInput])[]);
    expect(result).toEqual({
      line: "closeKoPracticed",
      evidence: { valid: 1, done: 1, ratio: 1 },
    });
  });

  it("AC-6g U 가 많아 유효 문항이 lesson.recap_min_evidence 보다 적은 세션은 비율과 상관없이 closeKoPracticed 이고, 모두 U 면 비율이 없다", () => {
    const short = RECAP.minEvidence - 1;
    expect(short).toBeLessThan(questions.length);
    const finals = questions.map((_, i) =>
      i < short ? askSolo(i, accepted(i)) : askU(i, "ai_rest"),
    ) as (readonly [number, AttemptInput])[];
    expect(speakingRecap(finals)).toEqual({
      line: "closeKoPracticed",
      evidence: { valid: short, done: short, ratio: short === 0 ? null : 1 },
    });
    const allU = questions.map((_, i) => askU(i, "recognition")) as (readonly [
      number,
      AttemptInput,
    ])[];
    expect(speakingRecap(allU)).toEqual({
      line: "closeKoPracticed",
      evidence: { valid: 0, done: 0, ratio: null },
    });
  });

  it("AC-6g 읽어 주기 · 뜻 보기를 쓴 읽기 해냄(혼자 문항 · 짝)은 독립 해냄이 아니다", () => {
    const finals = [
      readSolo(0, true, { aid: { readAloud: true } }),
      readSolo(1, true, { aid: { gloss: ["lake"] } }),
      readSolo(2, false),
      readSpare(2, true, { aid: { readAloud: true } }),
    ];
    expect(
      recapItemsOf({
        lesson: reading,
        activities: readingActs,
        finals: new Map(finals),
        ctx: readingCtx,
      }).map((item) => item.outcome),
    ).toEqual(["assisted", "assisted", "assisted"]);
    expect(readingRecap(finals)).toEqual({
      line: "closeKoPracticed",
      evidence: { valid: 3, done: 0, ratio: 0 },
    });
    // 뜻 보기 목록이 비었으면 도움이 아니다
    expect(
      readingRecap([
        readSolo(0, true, { aid: { gloss: [] } }),
        readSolo(1, true),
        readSolo(2, true),
      ]).line,
    ).toBe("closeKo");
  });

  it("AC-6g 'Yes, they do.'로 맞힌 질문(의사소통 정답 acceptedMeaning)은 맞음이어도 독립 해냄이 아니다", () => {
    const yesIndex = questions.findIndex((q) =>
      q.acceptedMeaning?.includes("Yes, they do."),
    );
    expect(yesIndex).toBeGreaterThanOrEqual(0);
    const yes = askSolo(yesIndex, "Yes, they do.");
    const judge = (
      yes[1] as { judge?: { final: string; communicative?: true } }
    ).judge;
    expect(judge?.final).toBe("correct");
    expect(judge?.communicative).toBe(true);
    const finals = questions.map((_, i) =>
      i === yesIndex ? yes : askSolo(i, accepted(i)),
    );
    const result = speakingRecap(finals);
    expect(result.evidence).toEqual({
      valid: questions.length,
      done: questions.length - 1,
      ratio: (questions.length - 1) / questions.length,
    });
    expect(result.line).toBe(
      (questions.length - 1) / questions.length >= RECAP.canRatio
        ? "closeKo"
        : "closeKoPracticed",
    );
    // 판정 칸이 없는 짝 시도(기기 대기열 꼴)도 같은 판정 함수로 의사소통 정답을 가른다
    const spare = questions[0]?.spare;
    const meaning = spare?.acceptedMeaning?.[0];
    if (!spare || meaning === undefined) throw new Error("짝 뜻 답 없음");
    const items = recapItemsOf({
      lesson: speaking,
      activities: speakingActs,
      finals: new Map([
        ...finals.slice(1),
        [
          soloNo(speakingActs, "question", 0),
          final("question", {
            heard: ["Yes, they eat rice."],
            failures: 0,
            judge: judgeSpeakingQuestion(
              questions[0] ?? spare,
              "Yes, they eat rice.",
              questionJudgeContextOf(speakingCtx),
              "correct",
            ),
          }),
        ],
        [
          spareNo(speakingActs, "question", 0),
          final("question", {
            heard: [meaning],
            failures: 0,
            slot: "spare",
          }),
        ],
      ]),
      ctx: speakingCtx,
    });
    expect(items[0]?.outcome).toBe("assisted");
  });

  it("AC-6g 상한 때문에 짝을 내지 못한 문항은 유효 문항으로 남고 독립 해냄이 아니다", () => {
    const writing = teach.writing;
    const acts = activitiesFor("writing");
    const ctx = ctxOf(writing);
    const content = writing.content;
    if (content.shape !== "items") throw new Error("쓰기 1~3 수업 아님");
    const cap = settingOf("lesson.spares_per_session.writing");
    expect(cap).toBeLessThan(content.items.length);
    /** 첫 허용 답을 카드 차례로 놓은 답. */
    const piecesOf = (item: { accepted: readonly string[] }) =>
      (item.accepted[0] ?? "").replace(/\.$/, " .").split(" ");
    const solo = new Map<number, AttemptInput>(
      content.items.map((item, i) => [
        soloNo(acts, "writing-item", i),
        final("writing-item", {
          tries: [{ kind: "tiles", pieces: [...piecesOf(item)].reverse() }],
        }),
      ]),
    );
    // 다섯 모두 첫 시도에 틀림 → 상한만큼만 짝을 내고, 낸 짝은 모두 첫 시도에 맞힘
    const { show } = sparesFromFinals({
      activities: acts,
      lesson: writing,
      finals: solo,
      ctx,
      cap,
    });
    expect(show).toHaveLength(cap);
    const finals = new Map(solo);
    for (const no of show) {
      const activity = acts[no - 1];
      if (activity?.kind !== "spare") throw new Error("짝 아님");
      const spare = content.items[activity.index]?.spare;
      if (!spare || !("accepted" in spare)) throw new Error("짝 없음");
      finals.set(
        no,
        final("writing-item", {
          tries: [{ kind: "tiles", pieces: piecesOf(spare) }],
          slot: "spare",
        }),
      );
    }
    const items = recapItemsOf({
      lesson: writing,
      activities: acts,
      finals,
      ctx,
    });
    expect(items.map((item) => item.outcome)).toEqual(
      content.items.map((_, i) => (i < cap ? "independent" : "not_done")),
    );
    expect(
      recapLineOf({
        lesson: writing,
        activities: acts,
        finals,
        ctx,
        settings: RECAP,
      }),
    ).toEqual({
      line:
        cap / content.items.length >= RECAP.canRatio
          ? "closeKo"
          : "closeKoPracticed",
      evidence: {
        valid: content.items.length,
        done: cap,
        ratio: cap / content.items.length,
      },
    });
  });

  it("AC-6g 짝을 냈지만 그 짝을 판정하지 못했으면(건너뜀 · 소리 없음) 그 문항은 U 가 아니라 해내지 못함으로 분모에 남는다", () => {
    const silentSpare = [
      spareNo(speakingActs, "question", 0),
      final("question", {
        heard: [],
        failures: 0,
        slot: "spare",
        techError: "speak_fail",
      }),
    ] as const;
    const items = recapItemsOf({
      lesson: speaking,
      activities: speakingActs,
      finals: new Map([askSolo(0, "Yes, they eat rice."), silentSpare]),
      ctx: speakingCtx,
    });
    expect(items[0]).toEqual({
      activityNo: soloNo(speakingActs, "question", 0),
      outcome: "not_done",
    });
    // 맞음 둘 + '틀림 → 짝 소리 없음' 하나(나머지 하나는 U) → 유효 3 · 독립 2. U 로 빼면 2/2 로 closeKo 가 되는 퇴행을 잡는다
    expect(2 / 3).toBeLessThan(RECAP.canRatio);
    expect(
      speakingRecap([
        askSolo(0, "Yes, they eat rice."),
        silentSpare,
        askSolo(1, accepted(1)),
        askSolo(2, accepted(2)),
        askU(3, "ai_rest"),
      ]),
    ).toEqual({
      line: "closeKoPracticed",
      evidence: { valid: 3, done: 2, ratio: 2 / 3 },
    });
  });

  it("AC-6g 같은 문제 다시에서 맞힌 문항(첫 시도 틀림 · 둘째 시도 맞음, 짝 없음)은 해내지 못함이다(해냄은 첫 시도 · 짝 첫 시도로만)", () => {
    const q = reading.content.questions[0];
    if (!q) throw new Error("문항 없음");
    const finals = [
      [
        soloNo(readingActs, "reading-question", 0),
        final("reading-question", { tries: [wrongNo(q.answerNo), q.answerNo] }),
      ] as const,
      readSolo(1, true),
      readSolo(2, true),
    ];
    expect(
      recapItemsOf({
        lesson: reading,
        activities: readingActs,
        finals: new Map(finals),
        ctx: readingCtx,
      })[0]?.outcome,
    ).toBe("not_done");
    expect(readingRecap(finals).evidence).toEqual({
      valid: 3,
      done: 2,
      ratio: 2 / 3,
    });
  });

  it("AC-6g 유효 문항 수가 lesson.recap_min_evidence 와 같고 비율이 문턱 이상이면 closeKo 다(경계)", () => {
    const min = RECAP.minEvidence;
    expect(min).toBeLessThanOrEqual(questions.length);
    const finals = questions.map((_, i) =>
      i < min ? askSolo(i, accepted(i)) : askU(i, "recognition"),
    ) as (readonly [number, AttemptInput])[];
    expect(speakingRecap(finals)).toEqual({
      line: "closeKo",
      evidence: { valid: min, done: min, ratio: 1 },
    });
  });

  it("AC-6g 문턱 값은 설정에서 읽는다: 같은 시도라도 lesson.recap_can_ratio · lesson.recap_min_evidence 가 바뀌면 줄이 바뀐다", () => {
    const finals = [readSolo(0, true), readSolo(1, true), readSolo(2, false)];
    const base = readingRecap(finals);
    expect(base.evidence).toEqual({ valid: 3, done: 2, ratio: 2 / 3 });
    expect(base.line).toBe(
      2 / 3 >= RECAP.canRatio ? "closeKo" : "closeKoPracticed",
    );
    expect(readingRecap(finals, { ...RECAP, canRatio: 2 / 3 }).line).toBe(
      "closeKo",
    );
    expect(readingRecap(finals, { minEvidence: 4, canRatio: 2 / 3 }).line).toBe(
      "closeKoPracticed",
    );
  });

  it("AC-6g teach.goals 첫 목표에 이어진 혼자 문항만 센다(다른 목표의 듣기 · 따라 말하기는 셈 밖)", () => {
    const listeningWrong = speaking.content.listening.map((l, i) => [
      soloNo(speakingActs, "listening", i),
      final("listening", { tries: [wrongNo(l.answerNo)] }),
    ]) as (readonly [number, AttemptInput])[];
    const result = speakingRecap([
      ...questions.map((_, i) => askSolo(i, accepted(i))),
      ...listeningWrong,
    ]);
    expect(result).toEqual({
      line: "closeKo",
      evidence: { valid: questions.length, done: questions.length, ratio: 1 },
    });
    expect(
      recapItemsOf({
        lesson: speaking,
        activities: speakingActs,
        finals: new Map(),
        ctx: speakingCtx,
      }).map((item) => item.activityNo),
    ).toEqual(questions.map((_, i) => soloNo(speakingActs, "question", i)));
  });

  it("AC-6g teach 칸이 없는 수업은 되짚기 줄을 고르지 않는다(undefined)", () => {
    const { teach: _drop, ...plain } = reading;
    expect(
      recapLineOf({
        lesson: plain,
        activities: activitiesOf({
          area: "reading",
          level: 3,
          content: plain.content,
        }),
        finals: new Map(),
        ctx: readingCtx,
        settings: RECAP,
      }),
    ).toBeUndefined();
  });
});
