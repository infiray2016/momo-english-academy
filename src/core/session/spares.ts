// 짝 고르기(델타 spec 2026-10-29 가르치고 배우는 수업 설계 1 '다른 예시에서 스스로' · 9 기록, plan 나 · 정한 것 3). DB · 시계 없는
// 순수 함수다. 활동 목록에는 모든 짝 활동이 영역 차례(말하기 질문 → 듣기 → 문장 → 낱말, 읽기 · 쓰기는 문항 차례)로 늘 있고, 여기서
// 혼자 첫 시도에 틀린 문항의 짝을 그 차례대로 상한(lesson.spares_per_session.<영역>, 부르는 쪽이 설정에서 읽음)까지 고른다.
// 내지 않은 짝(맞힌 문항 · U 문항 · 상한 넘음)은 시도 행 없이 끝난 것으로 본다(이어 하기 · 끝내기). 기기와 서버가 같은 함수를 쓰고
// 서버가 저장된 첫 시도로 다시 고른 값이 정본이다.
import type { LessonOf } from "@/core/seed/schema/lesson";
import {
  type AttemptInput,
  lemmaLookup,
  type OutcomeContext,
  parseAttemptInput,
  type SoloOutcome,
  soloOutcomeOf,
} from "@/core/session/attempt";
import type { Activity } from "@/core/session/preview";
import type { MeaningWord } from "@/core/speaking/meaning";

type AppLesson = LessonOf["reading" | "writing" | "speaking"];

/** 낼 짝 · 끝난 것으로 볼 짝(둘 다 활동 번호, 1부터, 차례대로). */
export type SpareChoice = { show: number[]; skip: number[] };

/** 짝 활동이 가리키는 혼자 문항의 활동 번호(1부터). 없으면 undefined. */
export function soloActivityNoOf(
  activities: readonly Activity[],
  spare: Extract<Activity, { kind: "spare" }>,
): number | undefined {
  const index = activities.findIndex(
    (a) => a.kind === spare.base && "index" in a && a.index === spare.index,
  );
  return index < 0 ? undefined : index + 1;
}

/**
 * 낼 짝(델타 spec 설계 1 · AC-1b 델타): 짝 활동을 목록 차례대로 보며 그 혼자 문항의 첫 시도가 틀림인 것만 cap 개까지 고른다.
 * outcomes 는 혼자 문항 활동 번호 → 첫 시도 결과(없으면 아직 안 함 — 내지 않음). 나머지 짝 번호는 skip 이다.
 */
export function sparesToShow(input: {
  activities: readonly Activity[];
  outcomes: ReadonlyMap<number, SoloOutcome>;
  cap: number;
}): SpareChoice {
  const show: number[] = [];
  const skip: number[] = [];
  input.activities.forEach((activity, i) => {
    if (activity.kind !== "spare") return;
    const solo = soloActivityNoOf(input.activities, activity);
    const wrong = solo !== undefined && input.outcomes.get(solo) === "wrong";
    if (wrong && show.length < input.cap) show.push(i + 1);
    else skip.push(i + 1);
  });
  return { show, skip };
}

/** 짝이 있는 혼자 문항마다 첫 시도 결과(finals: 활동 번호 → 그 활동의 첫 끝 시도). 끝 시도가 없으면 넣지 않는다. */
export function soloOutcomesOf(
  activities: readonly Activity[],
  lesson: AppLesson,
  finals: ReadonlyMap<number, AttemptInput>,
  ctx: OutcomeContext,
): Map<number, SoloOutcome> {
  const outcomes = new Map<number, SoloOutcome>();
  for (const activity of activities) {
    if (activity.kind !== "spare") continue;
    const no = soloActivityNoOf(activities, activity);
    const solo = no === undefined ? undefined : activities[no - 1];
    const input = no === undefined ? undefined : finals.get(no);
    if (no === undefined || !solo || !input) continue;
    outcomes.set(no, soloOutcomeOf(solo, lesson, input, ctx));
  }
  return outcomes;
}

/** 첫 끝 시도에서 바로 낼 짝을 고른다(soloOutcomesOf → sparesToShow). 짝 활동이 없는 수업은 빈 목록 둘. */
export function sparesFromFinals(input: {
  activities: readonly Activity[];
  lesson: AppLesson;
  finals: ReadonlyMap<number, AttemptInput>;
  ctx: OutcomeContext;
  cap: number;
}): SpareChoice {
  return sparesToShow({
    activities: input.activities,
    outcomes: soloOutcomesOf(
      input.activities,
      input.lesson,
      input.finals,
      input.ctx,
    ),
    cap: input.cap,
  });
}

// ── 기기 쪽 입력(검토 M4 — 화면이 맥락을 손으로 맞추지 않게, 서버의 다시 고르기와 같은 입력 꼴) ──

/** 짝 고르기 맥락의 재료(화면 자료 SessionView 의 칸 이름 그대로 — 서버 세션 설정도 같은 config 꼴이다). */
export type SpareContextSource = {
  config: {
    speaking: { answerMatchPass: number };
    ui: { matchPhraseLevels: readonly [number, number] | readonly number[] };
  };
  homophones: string[][];
  lemmaEntries: readonly { word: string; forms: readonly string[] }[];
  appJudged: boolean;
  lesson: { unitWords: readonly string[] };
  /** 말하기 질문 판정의 낱말 품사 표(plan 다 · 정한 것 7 — 서버가 meaningWordsOf 로 만들어 화면 자료에 싣는다). */
  meaningWords: readonly MeaningWord[];
};

/**
 * 혼자 첫 시도 판정 맥락(OutcomeContext): 허용 답 기준 speaking.answer_match_pass · 따라 말하기 맞음 = ui.match_phrase_levels 첫 값
 * ('잘 말했어요') · 앱 판정 단계 여부 · 동음이의어 · 원형 표 · 단원 단어 · 말하기 질문 품사 표. 서버 scoringOf 도 이 함수를 부른다.
 */
export function outcomeContextOf(source: SpareContextSource): OutcomeContext {
  const good = source.config.ui.matchPhraseLevels[0];
  if (good === undefined)
    throw new Error("결과 말 경계(ui.match_phrase_levels)가 없다");
  return {
    answerMatchPass: source.config.speaking.answerMatchPass,
    homophones: source.homophones,
    unitWords: source.lesson.unitWords,
    lemmaOf: lemmaLookup(source.lemmaEntries),
    appJudgedQuestions: source.appJudged,
    repeatGoodRate: good,
    meaningWords: source.meaningWords,
  };
}

/**
 * 활동 번호마다 첫 끝 시도(시도 차례대로 넘긴 목록 — 기기 대기열 · 이 기기에서 낸 시도). 진행 시도 · 꼴이 틀린 시도는 넣지 않는다.
 * 서버는 저장 시각 차례로 같은 일을 한다(서버 값이 정본).
 */
export function firstFinalsOf(
  attempts: readonly { activityNo: number; input: unknown }[],
): Map<number, AttemptInput> {
  const out = new Map<number, AttemptInput>();
  for (const { activityNo, input: raw } of attempts) {
    const input = parseAttemptInput(raw);
    if (input?.step === "final" && !out.has(activityNo))
      out.set(activityNo, input);
  }
  return out;
}

/**
 * 기기가 짝을 고를 입력(sparesFromFinals 의 입력 꼴): 화면 자료(활동 · 수업 · 설정 · 상한 view.spares.cap)와 첫 끝 시도 목록에서
 * 만든다. 짝이 없는 수업(view.spares 가 null)은 undefined. 서버가 이미 고른 값(view.spares.show · skip)이 정본이므로, 기기는
 * 혼자 문항 첫 시도를 모두 가진 때(이 기기에서 혼자 해 보기를 한 때)에만 이 입력으로 다시 고른다.
 */
export function spareInputOf(
  view: SpareContextSource & {
    activities: readonly Activity[];
    lesson: AppLesson;
    spares: { cap: number } | null;
  },
  attempts: readonly { activityNo: number; input: unknown }[],
): Parameters<typeof sparesFromFinals>[0] | undefined {
  if (!view.spares) return undefined;
  return {
    activities: view.activities,
    lesson: view.lesson,
    finals: firstFinalsOf(attempts),
    ctx: outcomeContextOf(view),
    cap: view.spares.cap,
  };
}
