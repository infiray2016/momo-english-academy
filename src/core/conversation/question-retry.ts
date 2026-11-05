// 1~3단계 AI 질문 검사에 걸린 질문을 한 번 다시 쓰게 하는 몫(13절 C203 (3) 컨트롤러 잠정): 걸린 질문 찾기 · 다시 쓰게 할 사용자 메시지 ·
// 다시 쓴 응답과 앞 응답 잇기. 서버 턴 길(lesson-turn)과 대본 도구(talk:observe)가 같은 함수를 쓴다(서버 사본을 만들지 않음).
// 순수 모듈이다(시각 · DB · SDK 없음). 숫자는 부르는 쪽이 단계 규격에서 넘긴다.
import {
  checkLowLevelQuestion,
  type LowLevelLineOptions,
  type LowLevelLineReason,
} from "@/core/conversation/question-check";

/** 문장 문을 지난 선생님 문장(서버 LessonSentence 와 같은 꼴 — 구조로 맞춘다). */
export type RetrySentence = {
  en: string;
  question: boolean;
  cue: boolean;
  state: "sent" | "held" | "dropped";
  reason?: "question" | "same" | "overlap";
};

/** 다시 쓰게 할 까닭이 되는 질문 검사 결과(길이 · 노리는 단어 · 범위 밖 낱말 · 형태). */
export type HeldQuestionFail = {
  question: string;
  reason: Exclude<LowLevelLineReason, "shape" | "no_target">;
  /** 걸린 낱말(노리는 단어 · 범위 밖 낱말). 다른 까닭이면 빈 목록. */
  words: string[];
};

/**
 * 잡아 둔 질문 가운데 처음 걸린 것(서버 끝 처리 settleLessonTurn 의 1~3단계 질문 검사와 같은 판정 — 노리는 단어는 응답의 next_targets).
 * 걸린 것이 없거나 잡아 둔 질문이 없으면 null.
 */
export function heldQuestionFailOf({
  entries,
  targets,
  options,
}: {
  entries: readonly RetrySentence[];
  targets: readonly string[];
  options: LowLevelLineOptions;
}): HeldQuestionFail | null {
  for (const e of entries) {
    if (e.state !== "held" || !e.question || e.cue) continue;
    const check = checkLowLevelQuestion(e.en, { ...options, targets });
    if (check.ok) continue;
    if (check.reason === "shape" || check.reason === "no_target") continue;
    return { question: e.en, reason: check.reason, words: check.words ?? [] };
  }
  return null;
}

const REASON_LINE: Record<HeldQuestionFail["reason"], string> = {
  empty: "it was empty",
  too_long: "it was too long",
  target_word: "it put the unit word the question aims at in the question",
  offband: "it used words above the child's level",
  form: "it used a grammar form above the child's level",
};

/**
 * 다시 쓰게 할 사용자 메시지(같은 응답 꼴로 한 번 — C203 (3)): 걸린 질문 · 까닭 · 걸린 낱말 · 지킬 범위(문장 길이 상한 · 그 단계 쉬운 낱말 ·
 * 단원 단어 · 아이가 말한 낱말 · 노리는 단어를 질문에 넣지 않음)를 알린다. 반응은 이미 아이에게 나갔으므로 질문만 새로 쓰게 한다.
 */
export function questionRetryNoteOf(
  fail: HeldQuestionFail,
  ctx: {
    sentenceMaxWords: number;
    targets: readonly string[];
    childWords: readonly string[];
  },
): string {
  const words =
    fail.words.length > 0 ? ` (words: ${fail.words.join(", ")})` : "";
  return [
    `App check: your question "${fail.question}" was not shown, because ${REASON_LINE[fail.reason]}${words}.`,
    "Your reaction was already shown. Write this turn again: in tori_en write only one new question (and a cue only if you fill model_line or choices). Keep the other fields for the new question.",
    `Use at most ${ctx.sentenceMaxWords} words, only easy words of this level, the unit words and words the child said (${ctx.childWords.join(", ") || "none"}).`,
    `Do not put the word the question aims at in the question (aims at: ${ctx.targets.join(", ") || "none"}).`,
  ].join("\n");
}

/** 앞 응답 칸 가운데 아이의 지난 말에 대한 것(다시 쓴 응답이 아니라 앞 응답 값을 쓴다). */
const CHILD_FIELDS = [
  "stuck",
  "recast",
  "explanation",
  "self_used_words",
  "mission_done",
  "response_fit",
  "child_topic",
  "child_asked",
  "goal_suggest",
] as const;

type RetryValue = {
  tori_en: string;
  tori_ko: string[];
  new_words: string[];
} & Record<(typeof CHILD_FIELDS)[number], unknown>;

/**
 * 다시 쓴 응답을 앞 응답에 잇는다(C203 (3)). 앞 응답의 보낸 문장(반응)은 그대로 두고 잡아 둔 문장(걸린 질문부터)을 버린 뒤, 다시 쓴 응답의
 * 첫 물음표 문장부터를 잡아 둔 문장으로 붙인다. 값은 다음 질문 칸(갈래 · 카드 항목 · 노린 것 · 힌트 · 소리 줄)을 다시 쓴 응답에서, 아이 말에
 * 대한 칸(막힘 · 되풀이 · 아이가 보인 능력 …)을 앞 응답에서 가져온다. 뜻은 문장 자리마다 두고, 문장 수와 맞지 않는 응답 쪽의 자리는 빈 뜻,
 * 둘 다 맞지 않으면 빈 목록이다(걸린 질문 · 버린 반응의 뜻이 붙지 않게). 다시 쓴 응답에 질문이 없으면 null(부르는 쪽이 앞 응답으로 카드 자리를 만든다).
 */
export function mergeQuestionRetry<V extends RetryValue>({
  first,
  firstEntries,
  retry,
  retryEntries,
}: {
  first: V;
  firstEntries: readonly RetrySentence[];
  retry: V;
  retryEntries: readonly RetrySentence[];
}): { entries: RetrySentence[]; value: V } | null {
  const at = retryEntries.findIndex((e) => e.question && !e.cue);
  if (at < 0) return null;
  const kept = firstEntries.filter((e) => e.state !== "held");
  const added = retryEntries
    .slice(at)
    .map((e) =>
      e.state === "dropped" ? { ...e } : { ...e, state: "held" as const },
    );
  const entries = [...kept, ...added];
  const keptIndexes = firstEntries.flatMap((e, i) =>
    e.state !== "held" ? [i] : [],
  );
  // 뜻은 문장마다 맞는 쪽만 문장 자리에 둔다(13절 C202 (5) — 빠진 문장의 뜻만 뺌, 검토 rev-night-2 fix1 N-1). 맞지 않는 쪽의 문장 자리는
  // 빈 뜻이라 보이지 않는다. 두 쪽 모두 맞지 않으면 빈 목록(뜻 없음) — 걸린 질문 · 버린 반응의 뜻을 한 덩이로 잇지 않는다
  const firstAligned = first.tori_ko.length === firstEntries.length;
  const retryAligned = retry.tori_ko.length === retryEntries.length;
  const toriKo =
    firstAligned || retryAligned
      ? [
          ...keptIndexes.map((i) =>
            firstAligned ? (first.tori_ko[i] ?? "") : "",
          ),
          ...retryEntries
            .slice(at)
            .map((_, j) => (retryAligned ? (retry.tori_ko[at + j] ?? "") : "")),
        ]
      : [];
  const fromFirst = Object.fromEntries(
    CHILD_FIELDS.map((key) => [key, first[key]]),
  );
  const value: V = {
    ...retry,
    ...fromFirst,
    tori_en: entries.map((e) => e.en).join(" "),
    tori_ko: toriKo,
    new_words: [...new Set([...first.new_words, ...retry.new_words])],
  };
  return { entries, value };
}
