// 배치 적응 규칙(3.2 배치 평가 표 · 13절 C71 · plan-p10a 파일별 값 9 · 정할 것 라 · 처). 상태는 답 기록뿐이다(AC-11d).
// 설계 숫자는 시험용 설정(12절 기본값 — 단계마다 3문항)과 시험용 시드 설정(작은 틀 — 단계마다 1문항)에서 읽는다.
import { describe, expect, it } from "vitest";
import { checkAnswer } from "@/core/answer/check";
import {
  nextPlacementStep,
  type PlacementAnswerRecord,
  type PlacementInput,
  type PlacementResult,
  type PlacementStep,
  slotKey,
} from "@/core/placement/adaptive";
import { placementFinishOf } from "@/core/placement/finish";
import { LEVEL_MAX, LEVEL_MIN } from "@/core/seed/structure";
import { matchRate } from "@/core/speech/match-rate";
import { loadableSettings } from "../fixtures/seed/loadable";
import { TEST_SETTINGS } from "../fixtures/settings";

const RULES = {
  startLevel: TEST_SETTINGS["placement.start_level"].value,
  perLevel: TEST_SETTINGS["placement.items_per_level"].value,
  maxItems: TEST_SETTINGS["placement.items_per_area"].value,
  levelMax: LEVEL_MAX,
  through: LEVEL_MAX,
};
const SMALL_PER_LEVEL = loadableSettings().settings.find(
  (row) => row.key === "placement.items_per_level",
)?.value as number;
const REPEAT_PASS = TEST_SETTINGS["placement.repeat_pass"].value;
const MAX_RETRIES = TEST_SETTINGS["speech.max_retries"].value;

type Reply = "ok" | "no" | "dk" | "failed";

/** 다음 차례마다 reply 로 답하며 끝까지 돈다. 낸 문항(단계 · 자리 · 번호)과 결과를 돌려준다. */
function drive(
  reply: (step: Extract<PlacementStep, { kind: "item" }>, i: number) => Reply,
  overrides: Partial<PlacementInput> = {},
) {
  const answers: PlacementAnswerRecord[] = [];
  const served: string[] = [];
  for (let i = 0; i < 100; i += 1) {
    const step = nextPlacementStep({
      ...RULES,
      repeatSlots: new Set(),
      ...overrides,
      answers,
    });
    if (step.kind === "done") return { served, result: step.result, answers };
    served.push(`${step.level}${step.slot === "spare" ? "s" : ""}:${step.no}`);
    const r = reply(step, i);
    answers.push({
      level: step.level,
      slot: step.slot,
      no: step.no,
      correct: r === "ok",
      dontKnow: r === "dk",
      repeatFailed: r === "failed",
    });
  }
  throw new Error("끝나지 않았다");
}

/** 단계마다 맞힐 수(그 밖은 틀림). */
const byLevel =
  (right: Record<number, number>) =>
  (step: { level: number; no: number }): Reply =>
    step.no <= (right[step.level] ?? 0) ? "ok" : "no";

describe("배치 적응 규칙", () => {
  it("AC-11a 배치: 3단계 3/3 → 5단계 2/3 → 6단계 1/3 이면 넘은 최고 단계는 5, 시작은 4다", () => {
    const run = drive(byLevel({ 3: 3, 5: 2, 6: 1 }));
    expect(run.served).toEqual([
      "3:1",
      "3:2",
      "3:3",
      "5:1",
      "5:2",
      "5:3",
      "6:1",
      "6:2",
      "6:3",
    ]);
    expect(run.result).toEqual({
      start: 4,
      highest: 5,
      alphabet: false,
      usedSpares: false,
    });
  });

  it("AC-11a 배치: 한 단계에서 처음 두 문항을 틀리거나 몰라요로 넘기면 셋째 문항 없이 그 단계를 못 넘음으로 둔다", () => {
    // 3단계 처음 둘 틀림(몰라요 하나) → 셋째 없이 2단계로, 2단계 3/3 → 3단계는 이미 못 넘음이라 끝
    const run = drive((step) => {
      if (step.level === 3) return step.no === 1 ? "dk" : "no";
      return "ok";
    });
    expect(run.served).toEqual(["3:1", "3:2", "2:1", "2:2", "2:3"]);
    expect(run.result.highest).toBe(2);
    expect(run.result.start).toBe(1);
    // 첫 문항만 틀리면 셋째까지 본다(맞힌 수 1 + 남은 1 = 2 — 한 단계 오를 수 있음)
    const second = drive((step) =>
      step.level === 3 && step.no === 1 ? "no" : "ok",
    );
    expect(second.served.slice(0, 4)).toEqual(["3:1", "3:2", "3:3", "4:1"]);
  });

  it("AC-11a 배치: 1단계도 못 넘으면 시작 1과 알파벳 처리가 나온다", () => {
    const run = drive(() => "no");
    expect(run.served).toEqual(["3:1", "3:2", "2:1", "2:2", "1:1", "1:2"]);
    expect(run.result).toEqual({
      start: LEVEL_MIN,
      highest: null,
      alphabet: true,
      usedSpares: false,
    });
  });

  it("AC-11a 배치: 두 단계 뛴 뒤 못 넘으면 건너뛴 단계를 보고 넘은 단계 바로 위에서 못 넘거나 placement.items_per_area 문항이면 끝난다", () => {
    // 3 다 맞힘 → 5 못 넘음 → 건너뛴 4 → 4 넘음이면 5 가 이미 못 넘음이라 끝(최고 4, 시작 3)
    const passFour = drive(byLevel({ 3: 3, 5: 0, 4: 3 }));
    expect(passFour.served.map((s) => s.split(":")[0])).toEqual([
      "3",
      "3",
      "3",
      "5",
      "5",
      "4",
      "4",
      "4",
    ]);
    expect(passFour.result.highest).toBe(4);
    expect(passFour.result.start).toBe(3);
    // 4 도 못 넘으면 넘은 3 바로 위에서 못 넘음이라 끝(최고 3, 시작 2)
    const failFour = drive(byLevel({ 3: 3 }));
    expect(failFour.result.highest).toBe(3);
    expect(failFour.result.start).toBe(2);
    // 3 못 넘음 → 2 에서 2/3 → 3 은 이미 못 넘음이라 끝(최고 2, 시작 1)
    const down = drive(byLevel({ 2: 2 }));
    expect(down.result.highest).toBe(2);
    expect(down.result.start).toBe(1);
    // 문항 수 상한: 다 맞히면 3 → 5 → 7 → 9 → 11 에서 placement.items_per_area 를 다 써서 끝
    const all = drive(() => "ok");
    expect(all.served).toHaveLength(RULES.maxItems);
  });

  it("AC-11a 배치: 시작 단계는 seed.complete_through_level 을 넘지 않고 기본 설정의 가장 높은 시작은 10 이다", () => {
    const all = drive(() => "ok");
    expect(all.served.map((s) => Number(s.split(":")[0]))).toEqual(
      [3, 5, 7, 9, 11].flatMap((l) => [l, l, l]),
    );
    expect(all.result.highest).toBe(11);
    expect(all.result.start).toBe(10);
    // 시드 범위 끝이 시작 단계보다 낮으면 범위 끝에서 시작한다(6.3)
    const capped = drive(() => "ok", { through: RULES.startLevel });
    expect(capped.result.start).toBe(RULES.startLevel);
    const one = drive(() => "ok", { through: LEVEL_MIN });
    expect(one.result.start).toBe(LEVEL_MIN);
    expect(one.result.alphabet).toBe(false);
  });

  it("AC-11a 배치: 단계마다 문항 하나(작은 틀)여도 다 맞히면 두 단계 · 틀리면 못 넘음으로 끝까지 돈다", () => {
    expect(SMALL_PER_LEVEL).toBe(1);
    const small = { perLevel: SMALL_PER_LEVEL };
    const up = drive(() => "ok", small);
    // 3 → 5 → 7 → 9 → 11 → (13 은 없음) 12 → 12 가 맨 위라 끝
    expect(up.served).toEqual(["3:1", "5:1", "7:1", "9:1", "11:1", "12:1"]);
    expect(up.result.highest).toBe(12);
    expect(up.result.start).toBe(11);
    const down = drive(() => "no", small);
    expect(down.served).toEqual(["3:1", "2:1", "1:1"]);
    expect(down.result.alphabet).toBe(true);
    const mixed = drive(byLevel({ 3: 1, 5: 0, 4: 1 }), small);
    expect(mixed.served).toEqual(["3:1", "5:1", "4:1"]);
    expect(mixed.result.highest).toBe(4);
  });

  it("AC-11c 배치: 두 시도 가운데 높은 일치율이 placement.repeat_pass 이상이면 맞음이다", () => {
    const sentence =
      "I see a big red ball and a small blue cup on the long brown table in the warm sunny";
    const words = sentence.split(" ");
    const first = words.slice(0, 12).join(" ");
    const second = words.slice(0, 17).join(" ");
    const match = { homophones: [], nameSlot: "any-word" as const };
    expect(matchRate(sentence, first, match)).toBe(0.6);
    expect(matchRate(sentence, second, match)).toBe(0.85);
    const item = { type: "repeat" as const, sentence };
    const opts = { repeatPass: REPEAT_PASS, homophones: [] };
    expect(
      checkAnswer(item, { kind: "repeat", heard: [first, second] }, opts)
        .correct,
    ).toBe(true);
    expect(
      checkAnswer(item, { kind: "repeat", heard: [first, first] }, opts)
        .correct,
    ).toBe(false);
  });

  it("AC-11c 배치: 실패 3회 뒤 그 문항과 남은 따라 말하기 자리는 같은 단계 예비 문항이다", () => {
    expect(MAX_RETRIES).toBe(3);
    // 3단계 1 · 3 번과 5단계 1 번이 따라 말하기(2 번은 듣고 고르기)
    const repeatSlots = new Set([slotKey(3, 1), slotKey(3, 3), slotKey(5, 1)]);
    const run = drive((_step, i) => (i === 0 ? "failed" : "ok"), {
      repeatSlots,
    });
    // 실패한 3:1 은 예비로 다시, 듣고 고르기 3:2 는 본 문항 그대로, 3:3 · 5:1 은 예비
    expect(run.served.slice(0, 5)).toEqual([
      "3:1",
      "3s:1",
      "3:2",
      "3s:3",
      "5s:1",
    ]);
    expect(run.result.usedSpares).toBe(true);
    // 실패한 시도는 틀림으로 세지 않는다 — 3단계는 3/3 으로 두 단계 올랐다
    expect(run.served[4]?.startsWith("5")).toBe(true);
    // 문항 수 상한에도 넣지 않는다
    const counted = run.answers.filter((a) => !a.repeatFailed);
    expect(counted.length).toBeLessThanOrEqual(RULES.maxItems);
  });

  it("AC-11d 배치: 답 기록만으로 멈춘 문항을 다시 낸다", () => {
    const answers: PlacementAnswerRecord[] = [
      {
        level: 3,
        slot: "main",
        no: 1,
        correct: true,
        dontKnow: false,
        repeatFailed: false,
      },
      {
        level: 3,
        slot: "main",
        no: 2,
        correct: true,
        dontKnow: false,
        repeatFailed: false,
      },
    ];
    const input = { ...RULES, repeatSlots: new Set<string>(), answers };
    const step = nextPlacementStep(input);
    expect(step).toEqual({
      kind: "item",
      level: 3,
      slot: "main",
      no: 3,
      itemNo: 3,
    });
    // 같은 기록이면 같은 차례(다시 셈)
    expect(nextPlacementStep(input)).toEqual(step);
    // 기록이 차례와 맞지 않으면 던진다(서버가 엉뚱한 칸의 답을 받지 않게)
    expect(() =>
      nextPlacementStep({
        ...input,
        answers: [{ ...answers[0], level: 4 } as PlacementAnswerRecord],
      }),
    ).toThrow();
  });
});

describe("배치 결과 행", () => {
  const values: Record<string, unknown> = Object.fromEntries(
    loadableSettings().settings.map((row) => [row.key, row.value]),
  );
  const read = (key: string) => values[key];
  const NOW = new Date("2026-10-18T10:00:00+09:00");
  const base = {
    profileId: "00000000-0000-4000-8000-000000000001",
    read,
    seedRevision: 1,
    settingsVersion: 7,
    now: NOW,
  };
  const result = (start: number, extra: Partial<PlacementResult> = {}) => ({
    start,
    highest: start + 1,
    alphabet: false,
    usedSpares: false,
    ...extra,
  });

  it("배치 결과 행: 읽기는 그 단계 단원 1 · 사건 source placement 이고 1단계도 못 넘으면 단원 0 과 alphabet_sound 알림이다", () => {
    const placed = placementFinishOf({
      ...base,
      area: "reading",
      result: result(1),
      talkPending: true,
    });
    expect(placed.track).toEqual({ level: 1, unit: 1, placementLevel: 1 });
    expect(placed.entries).toHaveLength(1);
    expect(placed.entries[0]?.event).toMatchObject({
      kind: "auto_judgement",
      actor: "app",
      target: { area: "reading", source: "placement" },
      newValue: { level: 1, unit: 1 },
    });
    expect(placed.entries[0]?.unitProgress.settingsVersion).toBe(7);
    expect(placed.alerts.map((a) => a.kind)).toEqual([]);
    const alphabet = placementFinishOf({
      ...base,
      area: "writing",
      result: result(1, { highest: null, alphabet: true }),
      talkPending: true,
    });
    expect(alphabet.track.unit).toBe(0);
    expect(alphabet.alerts.map((a) => a.kind)).toEqual(["alphabet_sound"]);
    // 말하기는 1단계도 못 넘어도 알파벳 단원이 없다(3.1 — 읽기 · 쓰기만)
    const speaking = placementFinishOf({
      ...base,
      area: "speaking",
      result: result(1, { highest: null, alphabet: true }),
      talkPending: false,
    });
    expect(speaking.track.unit).toBe(1);
    expect(speaking.alerts).toEqual([]);
  });

  it("배치 결과 행: 말하기 결과는 회화가 배치 대기일 때만 min(시작, talk.placement_cap) 단원 1로 넣고 예비 문항을 썼으면 speaking_placement_listening 알림이다", () => {
    const cap = TEST_SETTINGS["talk.placement_cap"].value;
    const high: Record<string, unknown> = {
      ...values,
      "seed.complete_through_level": LEVEL_MAX,
    };
    const highRead = (key: string) => high[key];
    const run = placementFinishOf({
      ...base,
      read: highRead,
      area: "speaking",
      result: result(cap + 2, { usedSpares: true }),
      talkPending: true,
    });
    expect(run.track.level).toBe(cap + 2);
    expect(run.talkTrack).toEqual({ level: cap, unit: 1 });
    expect(run.entries.map((e) => e.event.target)).toEqual([
      { area: "speaking", source: "placement" },
      { area: "talk", source: "speaking_start" },
    ]);
    expect(run.alerts.map((a) => a.kind)).toEqual([
      "speaking_placement_listening",
    ]);
    const low = placementFinishOf({
      ...base,
      read: highRead,
      area: "speaking",
      result: result(cap - 1),
      talkPending: true,
    });
    expect(low.talkTrack).toEqual({ level: cap - 1, unit: 1 });
    const chosen = placementFinishOf({
      ...base,
      area: "speaking",
      result: result(1),
      talkPending: false,
    });
    expect(chosen.talkTrack).toBeUndefined();
    expect(chosen.entries).toHaveLength(1);
  });
});
