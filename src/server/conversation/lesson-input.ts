import "server-only";
// 새 꼴 회화 수업 턴 · 끝맺음 턴의 호출 입력(회화 plan 묶음 8 — 턴 길 lesson-turn.ts 와 끝맺음 closing.ts 가 함께 쓴다. 두 파일이 서로
// 가져오지 않게 따로 둔다). 6.1 '사용자 메시지(턴마다 바뀌는 값만)' · '앞 턴 전문 그대로' · 가변부 재료, 1~3단계 소리 줄 · 질문 검사
// 재료(어휘 범위 · 형태 표 · 아이가 이 대화에서 말한 낱말). AI 를 부르지 않는다. 아이 글을 로그에 내지 않는다.
import { eq, lte } from "drizzle-orm";
import { z } from "zod";
import type { LevelContext } from "@/core/ai/calls/common";
import {
  isLowBandLevel,
  type TalkCallTurn,
  type TalkGoalText,
  type TalkLessonContext,
  type TalkLessonInput,
  type TalkLineRange,
  talkLessonContextDelta,
  talkLineOptionsOf,
} from "@/core/ai/calls/talk-lesson";
import { parseTalkAttemptInput } from "@/core/conversation/attempt";
import { reaskWordsOf } from "@/core/conversation/lesson-flow";
import type { LowLevelLineOptions } from "@/core/conversation/question-check";
import { metWordsIn } from "@/core/conversation/said";
import { safeLineOf } from "@/core/conversation/stream";
import { type FormRule, tokenize } from "@/core/seed/text";
import { lemmaLookup } from "@/core/session/attempt";
import { vocab } from "@/db/schema/content";
import { attempts } from "@/db/schema/learning";
import type { DbOrTx } from "@/server/db";
import { readUnitSpec } from "@/server/seed/read";
import { loadSeedList } from "@/server/seed-lists";
import { rosterOf, teacherPromptOf } from "@/server/teacher";
import {
  friendshipOf,
  historyOf,
  knownSayOf,
  openingLineOf,
  summariesBefore,
  type TalkLessonState,
  type TalkTurnRow,
} from "./state";

/**
 * 고정부 선생님 블록의 재료(6.1): 이 대화의 선생님(처음 스냅숏 키 → 프로필의 지금 선생님, state.teacher). 둘 다 명단에 없는 드문 길은
 * 명단 첫 항목이다(선생님 화면 plan '드문 길' · 정할 것 11).
 */
export function lessonTeacherOf(state: Pick<TalkLessonState, "teacher">): {
  nameEn: string;
  personaEn: string;
} {
  const teacher = state.teacher ?? rosterOf()[0];
  if (!teacher) throw new Error("회화 선생님 명단이 비었다");
  return teacherPromptOf(teacher);
}

const GoalTextsSchema = z.array(z.object({ id: z.string(), ko: z.string() }));

/** 적재된 단원 규격 행의 목표 칸(unit_specs.goals) → 목표 ID · 글. 비었거나 꼴이 틀리면 빈 목록(가변부는 ID 만 보인다). */
export function goalTextsOf(raw: unknown): TalkGoalText[] {
  const parsed = GoalTextsSchema.safeParse(raw);
  return parsed.success ? parsed.data.map(({ id, ko }) => ({ id, ko })) : [];
}

/**
 * 그 회화 단원의 목표 글(회화 턴 가변부 'Lesson goals' · 이월 목표, 6.1 — 회화 plan 묶음 8 fix 1 · 보정 11-05 (7)). 세션 시작 개정의 단원 규격
 * 행에서 읽는다. 행이 없으면 빈 목록.
 */
export async function readUnitGoalTexts(
  db: DbOrTx,
  { level, unit, revision }: { level: number; unit: number; revision: number },
): Promise<TalkGoalText[]> {
  const row = await readUnitSpec(
    { area: "talk", level, unit, startRevision: revision },
    { db },
  );
  return goalTextsOf(row?.goals);
}

/** 걸린 문장 첫 자리를 바꿀 카드 안전한 대사(턴 번호로 돌려 고른다 — 옛 꼴과 같은 safeLineOf). */
export function lessonSafeLineOf(
  state: Pick<TalkLessonState, "card">,
  turnNo: number,
): string {
  return safeLineOf(state.card.safeLines, turnNo);
}

/** 아이가 이 대화에서 말한 낱말(인식 글의 낱말, 소문자 — 1~3단계 질문 · 소리 줄 검사의 범위, 02-2 202줄). */
export function childWordsOf(
  rows: readonly Pick<TalkTurnRow, "speaker" | "text">[],
  extra = "",
): string[] {
  const out = new Set<string>();
  for (const text of [
    ...rows.flatMap((r) =>
      r.speaker === "child" && r.text ? [r.text] : ([] as string[]),
    ),
    extra,
  ])
    for (const t of tokenize(text))
      if (t.kind === "word") out.add(t.text.toLowerCase());
  return [...out];
}

/**
 * 인사 뒤 짧은 준비에서 따라 말하지 못하고 건너뛴 낱말(talk-prep 시도의 skipped — 인식 실패 상한 · 마이크 없음 · 말소리 없음 · 멈춤). 같은 낱말에
 * 건너뛰지 않은 시도가 있으면 빼지 않는다. 02-2 177줄 '짧은 준비에서 따라 말한 낱말은 만났다'의 반대 몫이다(분석 A9). 쪽지 차례대로.
 */
export function skippedPrepWordsOf(inputs: readonly unknown[]): string[] {
  const skipped: string[] = [];
  const said = new Set<string>();
  for (const raw of inputs) {
    const input = parseTalkAttemptInput(raw);
    if (input?.kind !== "talk-prep" || input.place !== "greeting") continue;
    if (input.skipped === undefined) said.add(input.word);
    else if (!skipped.includes(input.word)) skipped.push(input.word);
  }
  return skipped.filter((w) => !said.has(w));
}

/** 이 세션의 건너뛴 인사 뒤 준비 낱말(attempts 를 읽는다 — skippedPrepWordsOf). */
export async function readSkippedPrepWords(
  db: DbOrTx,
  sessionId: string,
): Promise<string[]> {
  const rows = await db
    .select({ input: attempts.input })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  return skippedPrepWordsOf(rows.map((r) => r.input));
}

/**
 * 첫 턴 · 값이 바뀐 턴에만 넣는 값(6.1 · B5-13, 새 꼴). 만난 단어는 처음 스냅숏 + 짧은 준비에서 보인 낱말(건너뛴 낱말 뺌 — skippedPrep, 분석 A9)
 * + 그 자리까지의 선생님 화면 글에서 찾은 단원 단어, 미션은 그 자리까지 선생님 행의 미션 체크. 아직 '안다'가 아닌 단어 · 새 단어 · 친한 정도는
 * 지금 값이다(옛 갈래와 같다).
 */
export function lessonContextAt(
  state: Pick<TalkLessonState, "start" | "lesson" | "lemmaOf" | "prepWords">,
  {
    rows,
    knownSay,
    friendship,
    unitWords,
    skippedPrep = [],
  }: {
    rows: readonly TalkTurnRow[];
    knownSay: ReadonlySet<string>;
    friendship: number;
    unitWords: readonly string[];
    /** 인사 뒤 준비에서 건너뛴 낱말(만난 것이 아님). */
    skippedPrep?: readonly string[];
  },
): TalkLessonContext {
  const met = new Set([
    ...(state.start?.metBefore ?? []),
    ...state.prepWords.filter((w) => !skippedPrep.includes(w)),
  ]);
  const missions = new Set<number>();
  for (const row of rows) {
    if (row.speaker !== "tori") continue;
    for (const w of metWordsIn(row.text ?? "", {
      unitWords,
      lemmaOf: state.lemmaOf,
    }))
      met.add(w);
    if (Array.isArray(row.missionChecks))
      for (const n of row.missionChecks)
        if (Number.isInteger(n)) missions.add(n as number);
  }
  const unknownWords = unitWords.filter((w) => !knownSay.has(w));
  return {
    unknownWords,
    metUnknownWords: unknownWords.filter((w) => met.has(w)),
    newWords: [...state.lesson.newWords],
    friendship,
    missionsDone: [...missions].sort((a, b) => a - b),
  };
}

/** 1~3단계 소리 줄 · 질문 검사 재료(어휘 범위 · 형태 표). 4단계부터는 정규화 · 서버가 읽지 않으니 빈 범위다. */
export type LessonRange = {
  lineRange: TalkLineRange;
  /** 단원 단어 원형 표 + 단계 범위 원형 표(질문 · 소리 줄 검사의 lemmaOf). */
  lemmaOf: (surface: string) => string | undefined;
};

const EMPTY_RANGE: TalkLineRange = {
  allowedWords: new Set(),
  forms: [],
  allowedForms: new Set(),
  childWords: [],
  reaskWords: [],
};

/** 빈 범위(4단계부터 · 끝맺음 턴 · 1~3단계 범위를 읽지 못한 때 — 질문 · 소리 줄 검사는 모두 걸린다). */
export function emptyLessonRange(
  state: Pick<TalkLessonState, "lemmaOf">,
): LessonRange {
  return { lineRange: EMPTY_RANGE, lemmaOf: state.lemmaOf };
}

/**
 * 1~3단계 범위 재료를 읽는다(그 단계 이하 vocab 낱말 · 그 단계 · 단원까지 나온 형태 · 다시 묻는 턴 낱말 — reaskWordsOf, 13절 C202 (1)). 형태 표를
 * 읽지 못하면 던진다(검사하지 않은 AI 질문 · 소리 줄을 아이에게 보이지 않는다 — 부르는 쪽이 턴을 오류로 닫는다).
 */
export async function lessonRangeOf(
  db: DbOrTx,
  state: Pick<
    TalkLessonState,
    "level" | "unit" | "lemmaOf" | "liveRows" | "turns" | "prepWords" | "start"
  >,
  childText: string,
): Promise<LessonRange> {
  if (!isLowBandLevel(state.level)) return emptyLessonRange(state);
  const file = loadSeedList("forms");
  const forms: FormRule[] = file.forms;
  const allowedForms = new Set(
    file.forms
      .filter(({ introducedAt }) => {
        const at = introducedAt.rst;
        return (
          at !== null &&
          (at.level < state.level ||
            (at.level === state.level && at.unit <= state.unit))
        );
      })
      .map(({ id }) => id),
  );
  const rows = await db
    .select({ word: vocab.word, forms: vocab.forms })
    .from(vocab)
    .where(lte(vocab.bandLevel, state.level));
  const rangeLemma = lemmaLookup(
    rows.map((r) => ({
      word: r.word,
      forms: Array.isArray(r.forms)
        ? r.forms.filter((f): f is string => typeof f === "string")
        : [],
    })),
  );
  return {
    lineRange: {
      allowedWords: new Set(rows.map((r) => r.word.toLowerCase())),
      forms,
      allowedForms,
      childWords: childWordsOf(state.liveRows, childText),
      reaskWords: reaskWordsOf({
        turns: state.turns,
        prepWords: state.prepWords,
        metBefore: state.start?.metBefore ?? [],
      }),
    },
    lemmaOf: (surface) => state.lemmaOf(surface) ?? rangeLemma(surface),
  };
}

/**
 * 1~3단계 질문 검사 재료(question-check LowLevelLineOptions — 입력과 같은 범위). core talkLineOptionsOf 그대로다(대본 도구와 같은 함수 — 호출 입력의
 * 동음이의어 묶음이 있으면 노리는 단어 검사가 아이가 한두 낱말 말로 한 낱말의 같은 소리 낱말까지 본다, 13절 'C203 (1) · C217 보완 3' (2)).
 */
export function lineOptionsOf(
  input: Parameters<typeof talkLineOptionsOf>[0],
): LowLevelLineOptions {
  return talkLineOptionsOf(input);
}

/**
 * 새 꼴 회화 턴 입력(TalkLessonInput). 이번 턴 칸(바뀐 값)은 앞 아이 행 자리의 값과 견줘 바뀐 것만, 첫 턴이면 모두. rowsBefore 는 이번 아이 말
 * 앞까지의 행이다. 단원 목표 글(goalTexts)은 부르는 쪽이 readUnitGoalTexts 로 읽어 넘긴다(없으면 빈 목록 — 가변부는 ID 만 보인다).
 * 회화 턴 · 끝맺음 턴이 같이 쓴다(같은 선생님 블록 · 같은 가변부 — 캐시).
 */
export async function talkLessonInputOf(
  db: DbOrTx,
  {
    state,
    ctx,
    rowsBefore,
    turn,
    summaryLimit,
    range,
    goalTexts = [],
  }: {
    state: TalkLessonState;
    ctx: LevelContext;
    rowsBefore: readonly TalkTurnRow[];
    turn: Omit<TalkCallTurn, "context">;
    summaryLimit: number;
    range: LessonRange;
    goalTexts?: readonly TalkGoalText[];
  },
): Promise<TalkLessonInput> {
  const unitWords = ctx.unitWords;
  const [knownSay, friendship, summaries, skippedPrep] = await Promise.all([
    knownSayOf(db, { profileId: state.profileId, words: unitWords }),
    friendshipOf(db, state.profileId),
    summariesBefore(db, {
      profileId: state.profileId,
      before: state.session.startedAt,
      limit: summaryLimit,
    }),
    readSkippedPrepWords(db, state.session.id),
  ]);
  const now = lessonContextAt(state, {
    rows: rowsBefore,
    knownSay,
    friendship,
    unitWords,
    skippedPrep,
  });
  const prevChildIndex = rowsBefore.findLastIndex(
    (r) => r.speaker === "child" && r.sentUserMessage !== null,
  );
  const prev =
    prevChildIndex >= 0
      ? lessonContextAt(state, {
          rows: rowsBefore.slice(0, prevChildIndex),
          knownSay,
          friendship,
          unitWords,
          skippedPrep,
        })
      : null;
  const history = historyOf(rowsBefore);
  const opening = openingLineOf(state.rows);
  return {
    ...ctx,
    spec: state.spec,
    teacher: lessonTeacherOf(state),
    card: state.card,
    goalTexts,
    carryGoals: [...(state.start?.carry.goals ?? [])],
    summaries,
    history,
    turn: { ...turn, context: talkLessonContextDelta(prev, now) },
    lineRange: range.lineRange,
    ...(history.length === 0 && opening !== undefined
      ? { openingLine: opening }
      : {}),
    lemmaOf: range.lemmaOf,
  };
}
