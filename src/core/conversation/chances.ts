// 회화 수업 카드 기회(3.3 '남은 기회 알림' · '수업 끝' 셋을 가른다 · 짧은 준비 낱말, 회화 plan 정한 것 7 · 18).
// 기회는 필수 질문 · 새 단어마다 다시 쓰기(talk.reask_per_word) · 꺼낼 새 단어 · 미션이고, 선생님 행 move 로 그때그때 센다(저장 안 함).
// 앱은 기회를 사용자 메시지의 알림으로만 넘기고, 기회를 채우려고 카드 자리를 만들지 않는다(C172). 다른 까닭으로 카드 자리가 되면
// 가장 앞의 남은 기회(남은 필수 질문 → 다시 쓰기가 남은 낱말을 노리는 더 이야기할 거리)를 붙이고, 이월은 붙이지 않는다.
// 학습 기회 제공 수는 이월 · 사용 시험 측정에만 쓰고 참여 완료 · 목표 달성의 조건이 아니다. 순수 모듈이다.
import type {
  TalkLessonCard,
  TalkLessonItem,
  TalkLessonSettings,
  TalkLessonTeacherTurn,
  TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import {
  TALK_SUPPORT_STAGE_MAX,
  type TalkCardItemRef,
  type TalkMove,
} from "@/core/conversation/move";
import {
  cardQuestionKeyOf,
  sameQuestionKeyHit,
} from "@/core/conversation/question-check";

/** 이월(같은 단원 앞 회화 세션들에서 넘어온 우선 연습 후보, 설계 4 [승인 아]). 계산은 둘째 묶음(carry.ts)이고 여기서는 받기만 한다. */
export type TalkCarry = { goals: readonly string[]; words: readonly string[] };

export type TalkChances = {
  /** 기회 알림 맨 앞(우선 연습 후보). 카드 자리에 붙이지 않는다. */
  carry: { goals: string[]; words: string[] };
  /** 다루지 않은 필수 질문(번호 · 노리는 단어, 카드 차례). */
  required: { no: number; targets: string[] }[];
  /** 다시 쓰기가 남은 새 단어(한 번 이상 다뤘고 다시 쓰기가 talk.reask_per_word 보다 적음). */
  reuse: string[];
  /** 아직 꺼내지 않은 새 단어 가운데 아무 질문도 노리지 않은 것(짧은 준비 낱말 밖) — 기회 알림 '꺼낼 새 단어'. */
  introduce: string[];
  /** 실제로 보인 짧은 준비에 없고 아직 꺼내지 않은 새 단어(물은 낱말 포함) — 대화 중 짧은 준비 낱말의 후보. */
  notIntroduced: string[];
  /** 아직 해내지 않은 미션 번호(1부터, 5~7단계). */
  missions: number[];
  /** 학습 기회 제공: 카드가 준비한 기회 수 · 그 가운데 다룬 수. */
  prepared: number;
  offered: number;
  /** 카드 기회를 다 다뤘다(사용자 메시지의 참고 정보 — 마무리 물음을 앞당기지 않는다). */
  allDealt: boolean;
  /** 기회를 다루지 않은 AI 차례가 끝에서 이어진 수 · 돌아오기 알림(talk.required_gap_turns 이상). */
  aiWithoutChanceRun: number;
  returnNudge: boolean;
};

/**
 * 받침 첫째 · 둘째 차례(같은 질문 자리 안의 선생님 행)는 새 질문 자리를 열지 않는다(3.3 질문 자리). 셋째(닫기)는 그 자리를 닫고
 * 그 뒤 질문으로 새 자리를 연다.
 */
export function isSupportMove(move: TalkMove): boolean {
  return move.stage > 0 && move.stage < TALK_SUPPORT_STAGE_MAX;
}

/** 새 질문 자리를 여는 선생님 행(받침 첫째 · 둘째 · 마무리 자리 · move 없음은 아니다). */
export function opensSlot(row: TalkLessonTeacherTurn): boolean {
  const m = row.move;
  return m !== null && m.kind !== "closing_slot" && !isSupportMove(m);
}

function dealsChance(
  move: TalkMove,
  chanceWords: ReadonlySet<string>,
): boolean {
  return (
    move.item.kind !== "none" ||
    move.intro.length > 0 ||
    move.next === "mission" ||
    move.words.some((w) => chanceWords.has(w))
  );
}

/** 대화 토막에 든 뒤의 선생님 행(인사 끝 아이 행 · 대화 아이 행 뒤). */
function talkTeacherRows(
  turns: readonly TalkLessonTurn[],
): TalkLessonTeacherTurn[] {
  let inTalk = false;
  const out: TalkLessonTeacherTurn[] = [];
  for (const row of turns) {
    if (row.speaker === "child") {
      if (row.segment !== "greeting") inTalk = true;
    } else if (inTalk) out.push(row);
  }
  return out;
}

/**
 * 남은 기회 · 학습 기회 제공 · 돌아오기 알림(3.3). 노린 것은 새 질문 자리를 연 선생님 행의 move(카드 항목 · 노린 단어 · 꺼낸 새 단어)로
 * 센다: 새 단어를 처음 다룬 차례(처음 묻는 턴 · 꺼낸 턴)가 첫 번째이고, 그 뒤 차례가 다시 쓰기다. 짧은 준비는 다룬 차례가 아니다.
 * '짧은 준비에 든 낱말'은 이 수업에서 실제로 보인 것이다: 인사 뒤 준비에서 보인 낱말(prepWords, 부르는 쪽이 talk-prep 시도로 안다)과
 * 대화 중 연 준비의 낱말(선생님 행 move.prep). 카드 짧은 준비 칸은 보이지 않았으면 빼지 않는다(02-2 173 · 180줄).
 */
export function talkChancesOf({
  card,
  newWords,
  turns,
  carry,
  missionsDone,
  settings,
  prepWords,
}: {
  card: Pick<TalkLessonCard, "required" | "missions">;
  newWords: readonly string[];
  turns: readonly TalkLessonTurn[];
  carry: TalkCarry;
  missionsDone: number;
  settings: Pick<TalkLessonSettings, "reaskPerWord" | "requiredGapTurns">;
  /**
   * 인사 뒤 준비 토막을 실제로 지났을 때 쪽지로 보인 낱말 전부(인식 실패로 건너뛴 낱말 포함, 정본 02-2 175줄). 그 토막을 지나지 않았으면(4단계부터 준비 없이 · 보일 낱말이 없는 다지기) 빈 목록이다. talk-start 스냅숏의 준비 목록
   * (준비 전에 정한 것)을 넘기지 않는다. 낱말 수 설정 talk.prep_words(TalkLessonSettings.prepWords)와 다른 칸이다.
   */
  prepWords: readonly string[];
}): TalkChances {
  const prep = new Set(prepWords);
  for (const row of turns)
    if (row.speaker === "teacher")
      for (const w of row.move?.prep?.words ?? []) prep.add(w);
  const covered = new Set<number>();
  const touches = new Map<string, number>();
  const introduced = new Set<string>();
  const newSet = new Set(newWords);
  for (const row of turns) {
    if (row.speaker !== "teacher" || !opensSlot(row) || !row.move) continue;
    const m = row.move;
    if (m.item.kind === "required") covered.add(m.item.no);
    for (const w of m.intro) introduced.add(w);
    for (const w of new Set([...m.words, ...m.intro]))
      if (newSet.has(w)) touches.set(w, (touches.get(w) ?? 0) + 1);
  }
  const reask = settings.reaskPerWord;
  const required = card.required
    .filter((item) => !covered.has(item.no))
    .map((item) => ({ no: item.no, targets: [...item.targets] }));
  const reuse = newWords.filter((w) => {
    const n = touches.get(w) ?? 0;
    return n > 0 && n - 1 < reask;
  });
  const notIntroduced = newWords.filter(
    (w) => !prep.has(w) && !introduced.has(w),
  );
  const introduce = notIntroduced.filter((w) => (touches.get(w) ?? 0) === 0);
  const missionCount = card.missions?.length ?? 0;
  const done = Math.min(Math.max(0, missionsDone), missionCount);
  const missions = Array.from(
    { length: missionCount - done },
    (_, i) => done + i + 1,
  );
  const reused = newWords.reduce(
    (sum, w) => sum + Math.min(reask, Math.max(0, (touches.get(w) ?? 0) - 1)),
    0,
  );
  const prepared =
    card.required.length + newWords.length * reask + missionCount;
  const offered = card.required.length - required.length + reused + done;
  const allDealt =
    required.length === 0 &&
    missions.length === 0 &&
    newWords.every((w) => (touches.get(w) ?? 0) >= 1 + reask);
  const chanceWords = new Set([...newWords, ...carry.words]);
  let run = 0;
  for (const row of talkTeacherRows(turns)) {
    if (!row.move || isSupportMove(row.move)) continue;
    run =
      row.move.kind === "ai" && !dealsChance(row.move, chanceWords)
        ? run + 1
        : 0;
  }
  return {
    carry: { goals: [...carry.goals], words: [...carry.words] },
    required,
    reuse,
    introduce,
    notIntroduced,
    missions,
    prepared,
    offered,
    allDealt,
    aiWithoutChanceRun: run,
    returnNudge: run >= settings.requiredGapTurns,
  };
}

// ── 카드 자리에 붙일 기회 · 대신 질문 ─────────────────────────────

type QuestionGuard = {
  /** 지금 쓰면 안 되는 질문 글(questionKeyOf 꼴 — 막힌 바로 뒤의 막힌 질문). */
  blocked: readonly string[];
  /** 이 대화에서 나온 질문 글의 수(questionKeyOf 꼴)와 같은 질문 상한. 없으면 상한을 보지 않는다. */
  asked?: ReadonlyMap<string, number>;
  max?: number;
};

/** 항목 글은 실행 열쇠(마지막 물음표 문장, cardQuestionKeyOf)로 견준다 — 막힌 질문 · 센 질문이 그 열쇠다(C172 · 장부 T-53). */
function usable(item: TalkLessonItem, guard: QuestionGuard): boolean {
  return (
    sameQuestionKeyHit({
      key: cardQuestionKeyOf(item.en),
      blocked: guard.blocked,
      asked: guard.asked ?? new Map(),
      max: guard.max ?? Number.POSITIVE_INFINITY,
    }) === null
  );
}

/**
 * 카드 자리에 붙일 가장 앞의 남은 기회(3.3, AC-15i): 남은 필수 질문(카드 차례) → 다시 쓰기가 남은 낱말을 노리는 더 이야기할 거리
 * (카드 차례). 마지막 물음표 문장이 막힌 질문 · 같은 질문 상한에 닿은 질문인 항목은 건너뛴다. 이월은 붙이지 않는다. 붙일 것이 없으면 null.
 */
export function slotChanceOf({
  card,
  chances,
  ...guard
}: {
  card: Pick<TalkLessonCard, "required" | "more">;
  chances: Pick<TalkChances, "required" | "reuse">;
} & QuestionGuard): TalkCardItemRef | null {
  const left = new Set(chances.required.map((r) => r.no));
  const required = card.required.find(
    (item) => left.has(item.no) && usable(item, guard),
  );
  if (required) return { kind: "required", no: required.no };
  const reuse = new Set(chances.reuse);
  const more = card.more.find(
    (item) => item.targets.some((w) => reuse.has(w)) && usable(item, guard),
  );
  return more ? { kind: "more", no: more.no } : null;
}

/**
 * 대신 질문(회화 plan 정한 것 18): 이 대화에서 가장 오래전에 쓴 더 이야기할 거리(안 쓴 것이 먼저, 같으면 앞 번호). AI 질문 검사 ·
 * 같은 질문으로 질문이 지워진 카드 자리에 붙일 남은 기회가 없을 때 쓴다. 쓸 수 있는 것이 없으면 null.
 */
export function oldestMoreOf({
  card,
  turns,
  ...guard
}: {
  card: Pick<TalkLessonCard, "more">;
  turns: readonly TalkLessonTurn[];
} & QuestionGuard): TalkCardItemRef | null {
  const lastUse = new Map<number, number>();
  turns.forEach((row, i) => {
    if (
      row.speaker === "teacher" &&
      opensSlot(row) &&
      row.move?.item.kind === "more"
    )
      lastUse.set(row.move.item.no, i);
  });
  let best: TalkLessonItem | undefined;
  for (const item of card.more) {
    if (!usable(item, guard)) continue;
    if (!best || (lastUse.get(item.no) ?? -1) < (lastUse.get(best.no) ?? -1))
      best = item;
  }
  return best ? { kind: "more", no: best.no } : null;
}

/** 카드 항목 번호로 그 줄(없으면 undefined). */
export function cardItemOf(
  card: Pick<TalkLessonCard, "required" | "more">,
  ref: TalkCardItemRef,
): TalkLessonItem | undefined {
  if (ref.kind === "none") return undefined;
  return (ref.kind === "required" ? card.required : card.more).find(
    (item) => item.no === ref.no,
  );
}

// ── 짧은 준비 낱말 ───────────────────────────────────────────────

const unique = (words: readonly string[]) => [...new Set(words)];

/**
 * 수업 앞 짧은 준비 낱말(3.3 짧은 준비 '낱말'): 배정 수업은 카드 짧은 준비 낱말 그대로, 다지기 · 보강(카드 칸이 빔)은 이월 단어를
 * 앞세워 그 수업이 노리는 단원 단어 가운데 아직 '안다'가 아닌 것을 count(talk.prep_words.<구간>) 개까지. 보일 낱말이 없으면 빈 목록
 * (짧은 준비를 건너뜀, C33).
 */
export function startPrepWordsOf({
  card,
  carryWords,
  unitWords,
  known,
  count,
}: {
  card: Pick<TalkLessonCard, "prep">;
  carryWords: readonly string[];
  unitWords: readonly string[];
  known: readonly string[];
  count: number;
}): string[] {
  if (card.prep && card.prep.length > 0) return card.prep.slice(0, count);
  const knownSet = new Set(known);
  return unique([...carryWords, ...unitWords])
    .filter((w) => !knownSet.has(w))
    .slice(0, count);
}

/**
 * 대화 중 여는 짧은 준비 낱말(3.3 짧은 준비 (나), 4단계부터): 아직 꺼내지 않은 새 단어(pool — TalkChances.notIntroduced) 가운데
 * 막힌 질문이 노린 낱말을 앞세운 count 개.
 */
export function stuckPrepWordsOf({
  stuckTargets,
  pool,
  count,
}: {
  stuckTargets: readonly string[];
  pool: readonly string[];
  count: number;
}): string[] {
  const inPool = new Set(pool);
  return unique([...stuckTargets.filter((w) => inPool.has(w)), ...pool]).slice(
    0,
    count,
  );
}
