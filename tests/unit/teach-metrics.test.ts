// 수업 설계 지표(델타 spec 2026-10-29 가르치고 배우는 수업 FR-10 · 설계 8 '수업 설계 지표', plan 아). 수업은 3단계 단원 1 정규 시드 셋
// (teachSeedLessons)을 그대로 읽고 시도 묶음은 합성한다. 시험 이름은 정본 15절 번호다(C184 대응: 델타 AC-10a → AC-22o).
import { describe, expect, it } from "vitest";
import {
  type AttemptInput,
  lemmaLookup,
  type OutcomeContext,
  type QuestionJudge,
} from "@/core/session/attempt";
import { type Activity, activitiesOf } from "@/core/session/preview";
import {
  type MetricAttempt,
  type MetricSession,
  secondsSummary,
  TEACH_SLOTS,
  teachMetricsBy,
  teachMetricsOf,
} from "@/core/session/teach-metrics";
import {
  formatTeachReport,
  parseTeachMetricsArgs,
} from "../../scripts/teach-metrics";
import {
  defaultSettings,
  referenceSet,
  teachSeedLessons,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";

const ref = referenceSet(defaultSettings());
const teach = teachSeedLessons();
const PASS = TEST_SETTINGS["speaking.answer_match_pass"].value;
const [GOOD_RATE] = TEST_SETTINGS["ui.match_phrase_levels"].value;
const LEVEL = 3;
const STEP_MS = 10_000;
const T0 = new Date("2026-11-02T09:00:00+09:00");

type TeachArea = "reading" | "writing" | "speaking";

const ctxOf = (area: TeachArea): OutcomeContext => ({
  answerMatchPass: PASS,
  homophones: [],
  unitWords: teach[area].unitWords,
  lemmaOf: lemmaLookup(ref.vocab.vocab),
  // 3단계 말하기 질문은 AI 판정(level_specs questions.acceptedMin 0)
  appJudgedQuestions: false,
  repeatGoodRate: GOOD_RATE,
  // 같이 해 보기 · 질문 짝 판정 품사 표(묶음 다) — 이 시험의 말하기 글은 표 없이도 같은 판정이다
  meaningWords: [],
});

function activitiesFor(area: TeachArea, withTeach = true): Activity[] {
  const lesson = teach[area];
  if (!lesson.teach) throw new Error("teach 없음");
  return activitiesOf({
    area,
    level: LEVEL,
    content: lesson.content,
    ...(withTeach ? { teach: lesson.teach } : {}),
  } as Parameters<typeof activitiesOf>[0]);
}

const final = <K extends AttemptInput["kind"]>(
  kind: K,
  content: Omit<Extract<AttemptInput, { kind: K }>, "v" | "kind" | "step">,
): AttemptInput => ({ v: 2, kind, step: "final", ...content }) as AttemptInput;
const spare = <K extends AttemptInput["kind"]>(
  kind: K,
  content: Omit<Extract<AttemptInput, { kind: K }>, "v" | "kind" | "step">,
): AttemptInput =>
  ({ v: 2, kind, step: "final", slot: "spare", ...content }) as AttemptInput;

const judge = (finalJudge: QuestionJudge["final"]): QuestionJudge => ({
  meaning: "ok",
  final: finalJudge,
  by: "ai",
  expressionDone: finalJudge === "correct",
});

/** 활동 목록에서 그 활동의 번호(1부터). */
function noOf(activities: readonly Activity[], match: Partial<Activity>) {
  const index = activities.findIndex((a) =>
    Object.entries(match).every(
      ([k, v]) => (a as Record<string, unknown>)[k] === v,
    ),
  );
  if (index < 0) throw new Error(`활동 없음 ${JSON.stringify(match)}`);
  return index + 1;
}

/**
 * 합성 세션: inputs 는 활동 번호 → 그 활동의 시도(차례대로). 시도 시각은 활동 번호 차례로 STEP_MS 씩 늦다(한 활동에 시도가 여럿이면
 * 같은 활동 안에서 1ms 씩). 시도가 없는 활동(내지 않은 짝)은 시각도 차지하지 않는다.
 */
function sessionOf(
  area: TeachArea,
  inputs: ReadonlyMap<number, readonly AttemptInput[]>,
  extra: Partial<MetricSession> = {},
): MetricSession {
  const activities = extra.activities ?? activitiesFor(area);
  const attempts: MetricAttempt[] = [];
  let tick = 0;
  activities.forEach((_, i) => {
    const list = inputs.get(i + 1);
    if (!list) return;
    tick += 1;
    list.forEach((input, j) => {
      attempts.push({
        activityNo: i + 1,
        input,
        attemptedAt: new Date(T0.getTime() + tick * STEP_MS + j),
      });
    });
  });
  return {
    profileNo: 1,
    lessonRef: {
      id: `${area}-3-1-1`,
      area,
      level: LEVEL,
      unit: 1,
      lessonNo: 1,
    },
    lesson: teach[area],
    activities,
    startedAt: T0,
    attempts,
    ctx: ctxOf(area),
    ...extra,
  };
}

/** 오늘 배울 것 · 보여 주기(미리보기 · 본보기) · 같이 해 보기를 끝낸 시도(자리 시간 · 차례를 채움). */
function teachSlotsDone(
  activities: readonly Activity[],
): Map<number, AttemptInput[]> {
  const map = new Map<number, AttemptInput[]>();
  activities.forEach((a, i) => {
    if (a.kind === "today") map.set(i + 1, [final("today", {})]);
    if (a.kind === "preview")
      map.set(i + 1, [final("preview", { shownWords: [] })]);
    if (a.kind === "model")
      map.set(i + 1, [final("model", { index: a.index })]);
  });
  return map;
}

const wrongNo = (answerNo: number, size: number) => (answerNo % size) + 1;

/** 읽기: 문항 0 첫 시도 틀림(다시 맞힘) → 짝 맞힘, 문항 1 틀림 → 짝 틀림, 문항 2 맞음(뒤 끝 시도는 무시). 같이 해 보기 0 맞음 · 1 틀림. */
function readingSession(): MetricSession {
  const activities = activitiesFor("reading");
  const r = teach.reading;
  const qs = r.content.questions;
  const together = r.teach?.together ?? [];
  const map = teachSlotsDone(activities);
  const t0 = together[0];
  const t1 = together[1];
  if (!t0 || !t1) throw new Error("같이 해 보기 둘이 없다");
  map.set(noOf(activities, { kind: "together", index: 0 }), [
    final("together", { index: 0, tries: [{ choice: t0.answerNo }] }),
  ]);
  map.set(noOf(activities, { kind: "together", index: 1 }), [
    final("together", {
      index: 1,
      tries: [
        { choice: wrongNo(t1.answerNo, t1.choices.length) },
        { choice: t1.answerNo },
      ],
    }),
  ]);
  map.set(noOf(activities, { kind: "reading-passage" }), [
    final("reading-passage", { tappedWords: [] }),
  ]);
  const [q0, q1, q2] = qs;
  if (!q0?.spare || !q1?.spare || !q2) throw new Error("문항 · 짝 없음");
  map.set(noOf(activities, { kind: "reading-question", index: 0 }), [
    final("reading-question", {
      tries: [wrongNo(q0.answerNo, q0.options.length), q0.answerNo],
    }),
  ]);
  map.set(noOf(activities, { kind: "reading-question", index: 1 }), [
    final("reading-question", {
      tries: [wrongNo(q1.answerNo, q1.options.length)],
    }),
  ]);
  map.set(noOf(activities, { kind: "reading-question", index: 2 }), [
    final("reading-question", { tries: [q2.answerNo] }),
    final("reading-question", {
      tries: [wrongNo(q2.answerNo, q2.options.length)],
    }),
  ]);
  map.set(
    noOf(activities, { kind: "spare", base: "reading-question", index: 0 }),
    [spare("reading-question", { tries: [q0.spare.answerNo] })],
  );
  map.set(
    noOf(activities, { kind: "spare", base: "reading-question", index: 1 }),
    [
      spare("reading-question", {
        tries: [wrongNo(q1.spare.answerNo, q1.spare.options.length)],
      }),
    ],
  );
  return sessionOf("reading", map, { activities });
}

const cardsOf = (sentence: string) =>
  sentence.replace(/([.?!])$/, " $1").split(" ");

/** 쓰기: 같이 해 보기 0(빈칸 카드) 맞음 · 1(대문자 단추, 시도 둘) 틀림, 문항 0 틀림 → 짝 맞음, 나머지 맞음. */
function writingSession(): MetricSession {
  const activities = activitiesFor("writing");
  const w = teach.writing;
  if (w.content.shape !== "items") throw new Error("쓰기 1~3 꼴 아님");
  const items = w.content.items;
  const map = teachSlotsDone(activities);
  const [t0] = w.teach?.together ?? [];
  if (!t0 || !("cards" in t0) || !Array.isArray(t0.slot))
    throw new Error("빈칸 같이 해 보기 없음");
  const slotCards = t0.slot.map((p) => t0.cards[p - 1] ?? "");
  map.set(noOf(activities, { kind: "together", index: 0 }), [
    final("together", { index: 0, tries: [{ pieces: slotCards }] }),
  ]);
  map.set(noOf(activities, { kind: "together", index: 1 }), [
    final("together", { index: 1, tries: [{}, {}] }),
  ]);
  items.forEach((item, i) => {
    if (!("accepted" in item)) throw new Error("조립 문항 아님");
    const right = cardsOf(item.accepted[0] ?? "");
    const pieces = i === 0 ? [...right].reverse() : right;
    map.set(noOf(activities, { kind: "writing-item", index: i }), [
      final("writing-item", { tries: [{ kind: "tiles", pieces }] }),
    ]);
  });
  const sp = items[0]?.spare;
  if (!sp || !("accepted" in sp)) throw new Error("짝 없음");
  map.set(noOf(activities, { kind: "spare", base: "writing-item", index: 0 }), [
    spare("writing-item", {
      tries: [{ kind: "tiles", pieces: cardsOf(sp.accepted[0] ?? "") }],
    }),
  ]);
  return sessionOf("writing", map, { activities });
}

/**
 * 말하기(3단계 — 질문은 AI 판정): 따라 말하기 낱말 0 소리 없음(U) · 1 틀림 → 짝 맞음 · 문장 0 맞음, 질문 0 건너뜀(U) · 1 판정 없음(U)
 * · 2 맞음 · 3 부분(틀림) → 짝 건너뜀(U). 같이 해 보기 0 고르기 맞음 · 1 말하기 맞음.
 */
function speakingSession(): MetricSession {
  const activities = activitiesFor("speaking");
  const s = teach.speaking;
  const c = s.content;
  const map = teachSlotsDone(activities);
  const [t0, t1] = s.teach?.together ?? [];
  if (!t0?.answerNo || !t1) throw new Error("같이 해 보기 없음");
  map.set(noOf(activities, { kind: "together", index: 0 }), [
    final("together", { index: 0, tries: [{ choice: t0.answerNo }] }),
  ]);
  map.set(noOf(activities, { kind: "together", index: 1 }), [
    final("together", { index: 1, tries: [{ heard: t1.accepted[0] }] }),
  ]);
  const said = (heard: string[]) => ({ heard, failures: 0 });
  map.set(noOf(activities, { kind: "repeat-word", index: 0 }), [
    final("repeat-word", { ...said([]), techError: "speak_fail" }),
  ]);
  map.set(noOf(activities, { kind: "repeat-word", index: 1 }), [
    final("repeat-word", said(["banana yellow"])),
  ]);
  map.set(noOf(activities, { kind: "repeat-sentence", index: 0 }), [
    final("repeat-sentence", said([c.repeat.sentences[0] ?? ""])),
  ]);
  map.set(noOf(activities, { kind: "question", index: 0 }), [
    final("question", { ...said([]), skipped: "recognition" }),
  ]);
  map.set(noOf(activities, { kind: "question", index: 1 }), [
    final("question", said(["they eat"])),
  ]);
  map.set(noOf(activities, { kind: "question", index: 2 }), [
    final("question", {
      ...said([c.questions[2]?.modelAnswer ?? ""]),
      judge: judge("correct"),
    }),
  ]);
  map.set(noOf(activities, { kind: "question", index: 3 }), [
    final("question", { ...said(["they"]), judge: judge("partial") }),
  ]);
  map.set(noOf(activities, { kind: "spare", base: "repeat-word", index: 1 }), [
    spare("repeat-word", said([c.repeat.spares?.words[1] ?? ""])),
  ]);
  map.set(noOf(activities, { kind: "spare", base: "question", index: 3 }), [
    spare("question", { ...said([]), skipped: "silent" }),
  ]);
  return sessionOf("speaking", map, { activities });
}

describe("수업 설계 지표", () => {
  it("AC-22o 수업 설계 지표: 스스로 해냄은 첫 시도에 틀린 혼자 문항 가운데 그 짝을 첫 시도에 맞힌 비율이다", () => {
    const m = teachMetricsOf([readingSession()]);
    expect(m.selfDone).toEqual({
      hits: 1,
      total: 2,
      unscored: 0,
      missing: 0,
      rate: 0.5,
    });
  });

  it("AC-22o 수업 설계 지표: 혼자 첫 시도 정답률은 문항마다 첫 끝 시도의 첫 시도로 센다(뒤 시도 · 다시 맞힘은 세지 않음)", () => {
    const m = teachMetricsOf([readingSession()]);
    expect(m.soloFirst).toEqual({
      hits: 1,
      total: 3,
      unscored: 0,
      rate: 1 / 3,
    });
    const solo = m.items
      .filter((i) => i.slot === "solo")
      .map((i) => [i.kind, i.index, i.first.rate]);
    expect(solo).toEqual([
      ["reading-question", 0, 0],
      ["reading-question", 1, 0],
      ["reading-question", 2, 1],
    ]);
    const spares = m.items
      .filter((i) => i.slot === "spare")
      .map((i) => [i.kind, i.index, i.first.hits, i.first.total]);
    expect(spares).toEqual([
      ["reading-question", 0, 1, 1],
      ["reading-question", 1, 0, 1],
    ]);
  });

  it("AC-22o 수업 설계 지표: 같이 해 보기 첫 시도 정답률(읽기 고르기 · 쓰기 빈칸 카드 · 대문자 단추 · 말하기 고르기 · 말하기 허용 답)", () => {
    expect(teachMetricsOf([readingSession()]).togetherFirst).toEqual({
      hits: 1,
      total: 2,
      unscored: 0,
      rate: 0.5,
    });
    // 대문자 단추처럼 앱이 맞출 칸이 없는 시도는 '맞힐 때까지 다시'(설계 1)로 본다: 시도가 둘이면 첫 시도는 틀림
    expect(teachMetricsOf([writingSession()]).togetherFirst).toEqual({
      hits: 1,
      total: 2,
      unscored: 0,
      rate: 0.5,
    });
    expect(teachMetricsOf([speakingSession()]).togetherFirst).toEqual({
      hits: 2,
      total: 2,
      unscored: 0,
      rate: 1,
    });
  });

  it("AC-22o 수업 설계 지표: 같이 해 보기 말하기 첫 시도가 허용 답에 못 미치면 틀림이다", () => {
    const base = speakingSession();
    const no = noOf(base.activities, { kind: "together", index: 1 });
    const attempts = base.attempts.map((a) =>
      a.activityNo === no
        ? {
            ...a,
            input: final("together", {
              index: 1,
              tries: [{ heard: "cake" }, { heard: "cake" }],
            }),
          }
        : a,
    );
    expect(teachMetricsOf([{ ...base, attempts }]).togetherFirst).toEqual({
      hits: 1,
      total: 2,
      unscored: 0,
      rate: 0.5,
    });
  });

  it("AC-22o 수업 설계 지표: 같이 해 보기에 판정 칸(judge)이 있으면 일치율이 문턱 위여도 judge.final 로 판정한다", () => {
    const base = speakingSession();
    const t1 = teach.speaking.teach?.together[1];
    if (!t1) throw new Error("같이 해 보기 없음");
    const no = noOf(base.activities, { kind: "together", index: 1 });
    const withJudge = (finalJudge: QuestionJudge["final"]) => ({
      ...base,
      attempts: base.attempts.map((a) =>
        a.activityNo === no
          ? {
              ...a,
              input: final("together", {
                index: 1,
                tries: [{ heard: t1.accepted[0] }],
                judge: judge(finalJudge),
              }),
            }
          : a,
      ),
    });
    expect(teachMetricsOf([withJudge("retry")]).togetherFirst).toEqual({
      hits: 1,
      total: 2,
      unscored: 0,
      rate: 0.5,
    });
    expect(teachMetricsOf([withJudge("correct")]).togetherFirst).toEqual({
      hits: 2,
      total: 2,
      unscored: 0,
      rate: 1,
    });
  });

  it("AC-22o 수업 설계 지표: 쓰기 문항 첫 시도 틀림 → 짝 맞음이 스스로 해냄 하나다", () => {
    const m = teachMetricsOf([writingSession()]);
    if (teach.writing.content.shape !== "items") throw new Error("꼴");
    const n = teach.writing.content.items.length;
    expect(m.soloFirst).toEqual({
      hits: n - 1,
      total: n,
      unscored: 0,
      rate: (n - 1) / n,
    });
    expect(m.selfDone).toEqual({
      hits: 1,
      total: 1,
      unscored: 0,
      missing: 0,
      rate: 1,
    });
  });

  it("AC-22o 수업 설계 지표: U 문항(소리 없음 · 건너뜀 · 판정 없는 AI 질문)과 U 짝은 비율의 분모에서 빼고 따로 센다", () => {
    const m = teachMetricsOf([speakingSession()]);
    // 맞음: 문장 0 · 질문 2, 틀림: 낱말 1 · 질문 3, U: 낱말 0 · 질문 0 · 질문 1
    expect(m.soloFirst).toEqual({ hits: 2, total: 4, unscored: 3, rate: 0.5 });
    // 낱말 1 → 짝 맞음(해냄), 질문 3 → 짝 건너뜀(U)
    expect(m.selfDone).toEqual({
      hits: 1,
      total: 1,
      unscored: 1,
      missing: 0,
      rate: 1,
    });
  });

  it("AC-22o 수업 설계 지표: 짝을 내지 않은(상한 · 아직 안 함) 틀린 혼자 문항은 missing 으로 세고 분모에 넣지 않는다", () => {
    const base = readingSession();
    const no = noOf(base.activities, {
      kind: "spare",
      base: "reading-question",
      index: 1,
    });
    const m = teachMetricsOf([
      { ...base, attempts: base.attempts.filter((a) => a.activityNo !== no) },
    ]);
    expect(m.selfDone).toEqual({
      hits: 1,
      total: 1,
      unscored: 0,
      missing: 1,
      rate: 1,
    });
  });

  it("AC-22o 수업 설계 지표: 자리별 걸린 시간은 앞 자리 끝 시도(첫 자리는 세션 시작)부터 그 자리 끝 시도까지다", () => {
    const session = readingSession();
    const m = teachMetricsOf([session]);
    const count = (slot: string) =>
      session.activities.filter((a, i) => {
        const kind = a.kind;
        const has = session.attempts.some((t) => t.activityNo === i + 1);
        if (!has) return false;
        if (slot === "today") return kind === "today";
        if (slot === "show") return kind === "preview" || kind === "model";
        if (slot === "together") return kind === "together";
        if (slot === "spare") return kind === "spare";
        return !["today", "preview", "model", "together", "spare"].includes(
          kind,
        );
      }).length;
    const seconds = STEP_MS / 1000;
    // 활동마다 STEP_MS 씩(같은 활동 안 뒤 시도의 1ms 는 끝 시도 시각에 든다)
    expect(m.slotSeconds.today).toEqual([count("today") * seconds]);
    expect(m.slotSeconds.show).toEqual([count("show") * seconds]);
    expect(m.slotSeconds.together).toEqual([count("together") * seconds]);
    expect(m.slotSeconds.solo[0]).toBeCloseTo(count("solo") * seconds, 2);
    expect(m.slotSeconds.spare[0]).toBeCloseTo(count("spare") * seconds, 2);
    expect(secondsSummary([30, 10, 20])).toEqual({ n: 3, median: 20, max: 30 });
    expect(secondsSummary([10, 20])).toEqual({ n: 2, median: 15, max: 20 });
  });

  it("AC-22o 수업 설계 지표: 빈 입력은 세션 0 · 비율 null · 자리 시간 빈 목록이다", () => {
    const m = teachMetricsOf([]);
    expect(m.sessions).toBe(0);
    expect(m.skippedSessions).toBe(0);
    expect(m.selfDone.rate).toBeNull();
    expect(m.soloFirst.rate).toBeNull();
    expect(m.togetherFirst.rate).toBeNull();
    for (const slot of TEACH_SLOTS) expect(m.slotSeconds[slot]).toEqual([]);
    expect(m.items).toEqual([]);
    expect(secondsSummary([])).toEqual({ n: 0, median: null, max: null });
    expect(teachMetricsBy([], "area")).toEqual([]);
  });

  it("AC-22o 수업 설계 지표: 가르치는 수업이 아닌 세션(오늘 배울 것이 없는 차례)은 세지 않고 수만 센다", () => {
    const plain = sessionOf("reading", new Map(), {
      activities: activitiesFor("reading", false),
    });
    const m = teachMetricsOf([plain, readingSession()]);
    expect(m.sessions).toBe(1);
    expect(m.skippedSessions).toBe(1);
  });

  it("AC-22o 수업 설계 지표: 영역 · 단계 · 단원 · 수업 · 프로필 번호로 묶어 내고 문항별 행은 세션을 넘어 합친다", () => {
    const sessions = [
      readingSession(),
      { ...readingSession(), profileNo: 2 },
      speakingSession(),
    ];
    expect(teachMetricsBy(sessions, "area").map((g) => g.key)).toEqual([
      "reading",
      "speaking",
    ]);
    const byLesson = teachMetricsBy(sessions, "lesson");
    expect(byLesson.map((g) => [g.key, g.metrics.sessions])).toEqual([
      ["reading 3-1 #1", 2],
      ["speaking 3-1 #1", 1],
    ]);
    const reading = byLesson[0]?.metrics;
    expect(reading?.selfDone).toMatchObject({ hits: 2, total: 4 });
    expect(
      reading?.items.find((i) => i.slot === "solo" && i.index === 2)?.first,
    ).toEqual({ hits: 2, total: 2, unscored: 0, rate: 1 });
    expect(teachMetricsBy(sessions, "profile").map((g) => g.key)).toEqual([
      "profile 1",
      "profile 2",
    ]);
    expect(teachMetricsBy(sessions, "unit").map((g) => g.key)).toEqual([
      "reading 3-1",
      "speaking 3-1",
    ]);
    expect(teachMetricsBy(sessions, "level").map((g) => g.key)).toEqual([
      "reading 3",
      "speaking 3",
    ]);
  });
});

describe("수업 설계 지표 보고 명령", () => {
  it("AC-22o 수업 설계 지표 보고: 인자(기간 · 영역 · 단계 · 묶음 · 문항별)를 읽고 모르는 인자는 거부한다", () => {
    expect(parseTeachMetricsArgs([])).toEqual({
      ok: true,
      args: {
        areas: ["reading", "writing", "speaking"],
        by: "lesson",
        items: false,
      },
    });
    const parsed = parseTeachMetricsArgs([
      "--from",
      "2026-11-02",
      "--to",
      "2026-11-08",
      "--areas",
      "reading,speaking",
      "--levels",
      "1-3",
      "--by",
      "area",
      "--items",
    ]);
    expect(parsed).toEqual({
      ok: true,
      args: {
        from: "2026-11-02",
        to: "2026-11-08",
        areas: ["reading", "speaking"],
        levels: { min: 1, max: 3 },
        by: "area",
        items: true,
      },
    });
    expect(parseTeachMetricsArgs(["--levels", "3"])).toMatchObject({
      ok: true,
      args: { levels: { min: 3, max: 3 } },
    });
    for (const bad of [
      ["--what"],
      ["--from", "11-02"],
      ["--from", "2026-11-09", "--to", "2026-11-02"],
      ["--areas", "talk"],
      ["--levels", "0"],
      ["--levels", "3-1"],
      ["--by", "child"],
      ["--from"],
    ])
      expect(parseTeachMetricsArgs(bad).ok).toBe(false);
  });

  it("AC-22o 수업 설계 지표 보고: markdown 표에 지표 넷 · 자리별 상한을 싣고 프로필은 번호로만 적는다", () => {
    const sessions = [readingSession(), { ...readingSession(), profileNo: 2 }];
    const lines = formatTeachReport({
      groups: teachMetricsBy(sessions, "profile"),
      total: teachMetricsOf(sessions),
      caps: { today: 15, show: 90 },
      period: { from: "2026-11-02", to: "2026-11-08" },
      items: true,
    });
    const text = lines.join("\n");
    expect(text).toContain("| 프로필 1 |");
    expect(text).toContain("| 프로필 2 |");
    expect(text).toContain("스스로 해냄");
    expect(text).toContain("혼자 첫 시도 정답률");
    expect(text).toContain("같이 해 보기 첫 시도 정답률");
    expect(text).toContain("| 오늘 배울 것 | 2 | 10 | 10 | 15 |");
    expect(text).toContain("2/4 (50%)");
    expect(text).toContain("읽기 3단계 단원 1 수업 1");
    // 수업 id(시험에서는 영역 이름이 든 글)는 문항별 표에도 내지 않는다
    expect(text).not.toContain("reading-3-1-1");
  });
});
