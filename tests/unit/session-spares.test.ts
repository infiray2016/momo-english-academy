// 짝 고르기(델타 spec 2026-10-29 가르치고 배우는 수업 설계 1 '다른 예시' · 9 기록, plan 나 · 정한 것 3). 수업은 3단계 단원 1 정규
// 시드 셋(teachSeedLessons)을 그대로 읽고, 상한(lesson.spares_per_session.<영역>)은 정규 시드 설정 파일에서 읽는다(숫자를 다시 적지 않음).
// 시험 이름은 정본 15절 번호다(가르치고 3판 정본 반영 C184: 델타 AC-2a → AC-3c · 1b → AC-22b · 2c → AC-3e).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type AttemptInput,
  lemmaLookup,
  resumePointOf,
  type SoloOutcome,
} from "@/core/session/attempt";
import { type Activity, activitiesOf } from "@/core/session/preview";
import {
  outcomeContextOf,
  soloOutcomesOf,
  spareInputOf,
  sparesFromFinals,
  sparesToShow,
} from "@/core/session/spares";
import { createSessionInputStore } from "@/lib/session-input";
import {
  defaultSettings,
  referenceSet,
  teachSeedLessons,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";

const SETTINGS = JSON.parse(
  readFileSync(resolve(__dirname, "../../seed/settings.json"), "utf8"),
) as { settings: { key: string; value: unknown }[] };
const capOf = (area: "reading" | "writing" | "speaking"): number => {
  const value = SETTINGS.settings.find(
    (row) => row.key === `lesson.spares_per_session.${area}`,
  )?.value;
  if (typeof value !== "number") throw new Error(`${area} 짝 상한 없음`);
  return value;
};

const ref = referenceSet(defaultSettings());
const teach = teachSeedLessons();
const PASS = TEST_SETTINGS["speaking.answer_match_pass"].value;
const [GOOD_RATE] = TEST_SETTINGS["ui.match_phrase_levels"].value;

const ctxOf = (unitWords: readonly string[], appJudgedQuestions: boolean) => ({
  answerMatchPass: PASS,
  homophones: [],
  unitWords,
  lemmaOf: lemmaLookup(ref.vocab.vocab),
  appJudgedQuestions,
  repeatGoodRate: GOOD_RATE,
  // 질문 짝을 앱이 판정하는 시험이 이 파일에는 없다(묶음 다 의 판정 시험은 speaking-judge · session-attempt)
  meaningWords: [],
});

const final = <K extends AttemptInput["kind"]>(
  kind: K,
  content: Omit<Extract<AttemptInput, { kind: K }>, "v" | "kind" | "step">,
) => ({ v: 2, kind, step: "final", ...content }) as unknown as AttemptInput;

/** 활동 목록에서 그 종류 · 차례 활동의 번호(1부터). */
const noOf = (
  activities: readonly Activity[],
  match: (a: Activity) => boolean,
): number => {
  const index = activities.findIndex(match);
  if (index < 0) throw new Error("활동 없음");
  return index + 1;
};
const soloNo =
  (activities: readonly Activity[]) =>
  (kind: Activity["kind"], index = 0) =>
    noOf(
      activities,
      (a) => a.kind === kind && "index" in a && a.index === index,
    );
const spareNo =
  (activities: readonly Activity[]) => (base: string, index: number) =>
    noOf(
      activities,
      (a) => a.kind === "spare" && a.base === base && a.index === index,
    );
const spareNos = (activities: readonly Activity[]) =>
  activities.flatMap((a, i) => (a.kind === "spare" ? [i + 1] : []));

function readingActivities() {
  const r = teach.reading;
  if (!r.teach) throw new Error("teach 없음");
  return activitiesOf({
    area: "reading",
    level: 3,
    content: r.content,
    teach: r.teach,
  });
}
function speakingActivities() {
  const s = teach.speaking;
  if (!s.teach) throw new Error("teach 없음");
  return activitiesOf({
    area: "speaking",
    level: 3,
    content: s.content,
    teach: s.teach,
  });
}

describe("짝 고르기", () => {
  it("짝 고르기: 정규 시드 설정에 영역마다 짝 상한이 있다", () => {
    for (const area of ["reading", "writing", "speaking"] as const)
      expect(capOf(area)).toBeGreaterThan(0);
  });

  it("AC-22b 짝 고르기: 첫 시도에 틀린 혼자 문항이 없으면 빈 목록이고 모든 짝 번호가 끝난 것으로 본다", () => {
    const activities = readingActivities();
    const solo = soloNo(activities);
    const outcomes = new Map<number, SoloOutcome>(
      teach.reading.content.questions.map((_, i) => [
        solo("reading-question", i),
        "correct",
      ]),
    );
    expect(
      sparesToShow({ activities, outcomes, cap: capOf("reading") }),
    ).toEqual({ show: [], skip: spareNos(activities) });
    // 아직 혼자 첫 시도가 없어도 빈 목록이다(짝은 혼자 해 보기 뒤라 이어 하기는 혼자 문항에서 멈춘다)
    expect(
      sparesToShow({ activities, outcomes: new Map(), cap: capOf("reading") })
        .show,
    ).toEqual([]);
  });

  it("AC-22b 짝 고르기: 읽기에서 둘 틀리면 그 두 짝을 문항 차례로 낸다", () => {
    const activities = readingActivities();
    const solo = soloNo(activities);
    const spare = spareNo(activities);
    const outcomes = new Map<number, SoloOutcome>([
      [solo("reading-question", 0), "correct"],
      [solo("reading-question", 1), "wrong"],
      [solo("reading-question", 2), "wrong"],
    ]);
    const { show, skip } = sparesToShow({
      activities,
      outcomes,
      cap: capOf("reading"),
    });
    expect(show).toEqual([
      spare("reading-question", 1),
      spare("reading-question", 2),
    ]);
    expect(skip).toEqual([spare("reading-question", 0)]);
  });

  it("AC-22b 짝 고르기: 말하기에서 낱말 · 문장 · 듣기 · 질문을 섞어 여섯 틀리면 질문 → 듣기 → 문장 → 낱말 차례로 상한까지 낸다", () => {
    const activities = speakingActivities();
    const solo = soloNo(activities);
    const spare = spareNo(activities);
    const wrong: [Activity["kind"], number][] = [
      ["repeat-word", 0],
      ["repeat-word", 1],
      ["repeat-sentence", 0],
      ["listening", 0],
      ["question", 1],
      ["question", 2],
    ];
    const outcomes = new Map<number, SoloOutcome>(
      wrong.map(([kind, i]) => [solo(kind, i), "wrong"]),
    );
    const cap = capOf("speaking");
    const ordered = [
      spare("question", 1),
      spare("question", 2),
      spare("listening", 0),
      spare("repeat-sentence", 0),
      spare("repeat-word", 0),
      spare("repeat-word", 1),
    ];
    const { show, skip } = sparesToShow({ activities, outcomes, cap });
    expect(show).toEqual(ordered.slice(0, cap));
    // 상한을 넘은 짝과 틀리지 않은 문항의 짝은 끝난 것으로 본다. 차례 번호는 낸 짝과 상관없이 같다(AC-3c)
    expect([...show, ...skip].sort((a, b) => a - b)).toEqual(
      spareNos(activities),
    );
    expect(activities).toEqual(speakingActivities());
  });

  it("AC-22b 짝 고르기: U 문항(건너뜀 · 'AI 쉬는 중' · 소리 없음)의 짝은 내지 않고, 틀림은 첫 시도로만 가른다", () => {
    const s = teach.speaking;
    const c = s.content;
    const activities = speakingActivities();
    const solo = soloNo(activities);
    const spare = spareNo(activities);
    const ctx = ctxOf(s.unitWords, false);
    const q = c.questions[0];
    const l = c.listening[0];
    const word = c.repeat.words[0];
    const sentence = c.repeat.sentences[0];
    if (!q || !l || !word || !sentence) throw new Error("문항 없음");
    const wrongNo = l.answerNo === 1 ? 2 : 1;
    const finals = new Map<number, AttemptInput>([
      // 'AI 쉬는 중'으로 건너뛴 질문 · 판정이 없는 질문은 U
      [
        solo("question", 0),
        final("question", { heard: [], failures: 0, skipped: "recognition" }),
      ],
      [solo("question", 1), final("question", { heard: ["a"], failures: 0 })],
      // AI 판정 '부분'은 틀림(같은 문제 다시를 한 문항)
      [
        solo("question", 2),
        final("question", {
          heard: ["a"],
          failures: 0,
          judge: {
            meaning: "ok",
            bundle: "meaning",
            ai: "partial",
            final: "partial",
            by: "ai",
            expressionDone: false,
          },
        }),
      ],
      // 소리를 못 들려준 채 낸 듣기 답은 U(틀려도)
      [
        solo("listening", 0),
        final("listening", {
          tries: [wrongNo, l.answerNo],
          techError: "speak_fail",
        }),
      ],
      // 따라 말하기는 첫 시도 결과 말이 '잘 말했어요'가 아니면 틀림(둘째 시도가 맞아도)
      [
        solo("repeat-word", 0),
        final("repeat-word", { heard: ["zzz qqq", word], failures: 0 }),
      ],
      [
        solo("repeat-sentence", 0),
        final("repeat-sentence", { heard: [sentence], failures: 0 }),
      ],
    ]);
    const outcomes = soloOutcomesOf(activities, s, finals, ctx);
    expect(outcomes.get(solo("question", 0))).toBe("unscored");
    expect(outcomes.get(solo("question", 1))).toBe("unscored");
    expect(outcomes.get(solo("question", 2))).toBe("wrong");
    expect(outcomes.get(solo("listening", 0))).toBe("unscored");
    expect(outcomes.get(solo("repeat-word", 0))).toBe("wrong");
    expect(outcomes.get(solo("repeat-sentence", 0))).toBe("correct");
    expect(
      sparesFromFinals({
        activities,
        lesson: s,
        finals,
        ctx,
        cap: capOf("speaking"),
      }).show,
    ).toEqual([spare("question", 2), spare("repeat-word", 0)]);
  });

  it("AC-22b 짝 고르기: 쓰기는 첫 시도 정오로 고르고 같은 문제 다시에서 맞힌 문항도 틀린 문항이다", () => {
    const w = teach.writing;
    if (!w.teach || w.content.shape !== "items") throw new Error("teach 없음");
    const activities = activitiesOf({
      area: "writing",
      level: 3,
      content: w.content,
      teach: w.teach,
    });
    const solo = soloNo(activities);
    const spare = spareNo(activities);
    const finals = new Map<number, AttemptInput>(
      w.content.items.map((item, i) => {
        const pieces = (item.accepted[0] ?? "").replace(/\.$/, " .").split(" ");
        const right = { kind: "tiles" as const, pieces };
        const tries =
          i === 1
            ? [{ kind: "tiles" as const, pieces: ["zzz"] }, right]
            : [right];
        return [solo("writing-item", i), final("writing-item", { tries })];
      }),
    );
    expect(
      sparesFromFinals({
        activities,
        lesson: w,
        finals,
        ctx: ctxOf(w.unitWords, true),
        cap: capOf("writing"),
      }).show,
    ).toEqual([spare("writing-item", 1)]);
  });
});

describe("짝 이어 하기", () => {
  it("AC-3e 짝 이어 하기: 짝 활동 도중 닫았다 열면 내지 않은 짝을 건너뛰어 같은 짝 활동에서 이어지고 그 활동 안 입력이 남아 있다", () => {
    const activities = readingActivities();
    const solo = soloNo(activities);
    const spare = spareNo(activities);
    const outcomes = new Map<number, SoloOutcome>([
      [solo("reading-question", 0), "wrong"],
      [solo("reading-question", 1), "correct"],
      [solo("reading-question", 2), "wrong"],
    ]);
    const { show, skip } = sparesToShow({
      activities,
      outcomes,
      cap: capOf("reading"),
    });
    // 첫 짝까지 끝낸 뒤 둘째 짝을 고르던 중 닫음
    const firstSpare = spare("reading-question", 0);
    const secondSpare = spare("reading-question", 2);
    expect(show).toEqual([firstSpare, secondSpare]);
    const done = activities
      .map((_, i) => i + 1)
      .filter((no) => no <= firstSpare);
    const storage = new Map<string, string>();
    const store = createSessionInputStore({
      get length() {
        return storage.size;
      },
      clear: () => storage.clear(),
      getItem: (k) => storage.get(k) ?? null,
      key: (i) => [...storage.keys()][i] ?? null,
      removeItem: (k) => void storage.delete(k),
      setItem: (k, v) => void storage.set(k, v),
    });
    store.write("s-1", secondSpare, { tries: [2] });
    expect(resumePointOf(activities, done, skip)).toEqual({
      next: secondSpare,
    });
    expect(store.read("s-1", secondSpare)).toEqual({ tries: [2] });
    // 낸 짝을 다 하면 끝(내지 않은 짝은 시도 행이 없어도 끝난 것)
    expect(resumePointOf(activities, [...done, secondSpare], skip)).toEqual({
      done: true,
    });
    // 건너뜀 목록이 없으면 지금처럼 첫 빈 활동(내지 않은 짝)에서 멈춘다
    expect(resumePointOf(activities, done)).toEqual({
      next: firstSpare + 1,
    });
  });
});

describe("기기 쪽 짝 입력", () => {
  it("기기 쪽 짝 입력: 화면 자료와 시도 목록으로 만든 입력이 서버의 다시 고르기와 같은 짝을 고르고 진행 시도 · 둘째 끝 시도는 첫 시도로 보지 않는다", () => {
    const s = teach.speaking;
    const activities = speakingActivities();
    const solo = soloNo(activities);
    const word = s.content.repeat.words[0];
    if (!word) throw new Error("낱말 없음");
    const no = solo("repeat-word", 0);
    const view = {
      activities,
      lesson: s,
      config: {
        speaking: { answerMatchPass: PASS },
        ui: {
          matchPhraseLevels: TEST_SETTINGS["ui.match_phrase_levels"].value,
        },
      },
      homophones: [],
      lemmaEntries: ref.vocab.vocab,
      meaningWords: [],
      appJudged: false,
      spares: { cap: capOf("speaking") },
    };
    const attempts = [
      // 진행 시도는 첫 시도가 아니다
      {
        activityNo: no,
        input: {
          ...final("repeat-word", { heard: [word], failures: 0 }),
          step: "progress",
        },
      },
      {
        activityNo: no,
        input: final("repeat-word", { heard: ["zzz qqq"], failures: 0 }),
      },
      // 같은 활동의 둘째 끝 시도(다른 기기)는 보지 않는다
      {
        activityNo: no,
        input: final("repeat-word", { heard: [word], failures: 0 }),
      },
    ];
    const input = spareInputOf(view, attempts);
    if (!input) throw new Error("짝 입력이 있어야 한다");
    expect(input.ctx.repeatGoodRate).toBe(GOOD_RATE);
    expect(input.ctx.appJudgedQuestions).toBe(false);
    expect(input.cap).toBe(capOf("speaking"));
    const server = sparesFromFinals({
      activities,
      lesson: s,
      finals: new Map([[no, attempts[1]?.input as AttemptInput]]),
      ctx: ctxOf(s.unitWords, false),
      cap: capOf("speaking"),
    });
    expect(sparesFromFinals(input)).toEqual(server);
    expect(server.show).toEqual([spareNo(activities)("repeat-word", 0)]);
    expect(outcomeContextOf(view).answerMatchPass).toBe(PASS);
    // 짝이 없는 수업
    expect(spareInputOf({ ...view, spares: null }, attempts)).toBeUndefined();
  });
});
