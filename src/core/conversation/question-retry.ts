// 1~3단계 AI 질문 검사에 걸린 질문을 한 번 다시 쓰게 하는 몫(13절 C203 (3) 컨트롤러 잠정): 걸린 질문 찾기 · 다시 쓰게 할 사용자 메시지 ·
// 다시 쓴 응답과 앞 응답 잇기. 서버 턴 길(lesson-turn)과 대본 도구(talk:observe)가 같은 함수를 쓴다(서버 사본을 만들지 않음).
// 순수 모듈이다(시각 · DB · SDK 없음). 숫자는 부르는 쪽이 단계 규격에서 넘긴다.
import {
  aimedTargetWordsIn,
  checkLowLevelQuestion,
  type EasySlotCheck,
  type LowLevelLineOptions,
  type LowLevelLineReason,
  questionKeyOf,
  targetWordsIn,
} from "@/core/conversation/question-check";

/** 문장 문을 지난 선생님 문장(서버 LessonSentence 와 같은 꼴 — 구조로 맞춘다). */
export type RetrySentence = {
  en: string;
  question: boolean;
  cue: boolean;
  state: "sent" | "held" | "dropped";
  /** 지운 까닭(서버 · 도구의 문장 꼴마다 다르다 — 잇기는 읽지 않고 그대로 옮긴다). */
  reason?: string;
  /** 앱이 더한 문장(상황 줄의 넘김 몫 — 13절 C249). AI 뜻 목록에 자리가 없다. */
  app?: boolean;
};

/**
 * 다시 쓰게 할 까닭이 되는 질문 검사 결과(길이 · 노리는 단어 · 범위 밖 낱말 · 형태 · 되묻기 · 받침 둘째의 쉬운 질문 아님)와, 질문 검사에는 걸리지
 * 않지만 다시 쓰게 하는 까닭 chain(카드 답 바로 뒤 차례에 카드 필수 질문 글이 그대로 옴 — 13절 C217 (2) (ㄷ) · C204 (6)).
 */
export type HeldQuestionFail = {
  question: string;
  reason: Exclude<LowLevelLineReason, "shape" | "no_target"> | "chain";
  /** 걸린 낱말(노리는 단어 · 범위 밖 낱말). 다른 까닭이면 빈 목록. */
  words: string[];
  /**
   * 걸린 질문에 든 노리는 단어(질문 검사와 같은 판정 question-check aimedTargetWordsIn — 으뜸 까닭이 무엇이든, 13절 C203 보완 1 덧붙임 (나)).
   * 길이가 먼저 걸린 질문(too_long)에도 노리는 단어가 들었으면 여기에 든다. heldQuestionFailOf 가 들었을 때만 채운다. 칸이 없으면 까닭
   * target_word 의 words 로 본다(그 밖의 까닭이면 빈 목록).
   */
  aimed?: string[];
};

/** 걸린 질문에 든 노리는 단어(aimed, 없으면 까닭 target_word 의 걸린 낱말). 비어 있지 않으면 새 노림 줄과 노림 안전망을 건다. */
function aimedWordsOf(fail: HeldQuestionFail): readonly string[] {
  return fail.aimed ?? (fail.reason === "target_word" ? fail.words : []);
}

/**
 * 1~3단계 한 차례 질문 하나(고정부 'your question is the last question sentence of tori_en' · 대본 회차 r2 판정 M-r2-1 — 'Is it apple juice? What
 * do you do with it?'): 잡아 둔 질문 문장이 둘 이상이면 마지막 것만 남기고 앞의 것은 지운다(까닭 question). 서버 끝 처리와 대본 도구가 같이 쓴다.
 */
export function keepLastHeldQuestion(
  entries: readonly RetrySentence[],
  /**
   * 되묻기 질문인가(question-check questionEchoesChild — 아이 말 · 노린 단어로). 주면 남길 질문을 고르기 전에 되묻기를 먼저 뺀다: 되묻기가
   * 아닌 질문 가운데 마지막을 남기고, 모두 되묻기면 마지막을 남긴다(판정 r3 M-r3-2 — 'Are you hungry now? What do you want?').
   */
  isEcho: (question: string) => boolean = () => false,
): void {
  const held = entries.filter(
    (e) => e.state === "held" && e.question && !e.cue,
  );
  if (held.length < 2) return;
  const keep = held.filter((e) => !isEcho(e.en)).at(-1) ?? held.at(-1);
  for (const e of held) {
    if (e === keep) continue;
    e.state = "dropped";
    e.reason = "question";
  }
}

/**
 * 잡아 둔 질문 가운데 처음 걸린 것(서버 끝 처리 settleLessonTurn 의 1~3단계 질문 검사와 같은 판정 — 노리는 단어는 응답의 next_targets).
 * 걸린 것이 없거나 잡아 둔 질문이 없으면 null. 질문 검사를 지난 질문이라도 그 질문 열쇠가 chainKeys(카드 답 바로 뒤 차례의 카드 필수 질문 글 —
 * talk-lesson talkCardChainKeysOf)에 있으면 까닭 chain 으로 낸다: 다시 쓰게만 하고 끝 처리의 질문 검사는 이 까닭을 보지 않는다(다시 쓴 질문도
 * 카드 글이면 지금처럼 갈래 표지만 고쳐 내보낸다 — 카드 자리로 바꾸면 같은 카드 글이 다시 붙는다).
 */
export function heldQuestionFailOf({
  entries,
  targets,
  options,
  chainKeys = [],
}: {
  entries: readonly RetrySentence[];
  targets: readonly string[];
  options: LowLevelLineOptions & { easySlot?: EasySlotCheck | undefined };
  /** 카드 답 바로 뒤 차례에 그대로 오면 안 되는 질문 열쇠(questionKeyOf 꼴). 그 차례가 아니면 빈 목록. */
  chainKeys?: readonly string[];
}): HeldQuestionFail | null {
  for (const e of entries) {
    if (e.state !== "held" || !e.question || e.cue) continue;
    const check = checkLowLevelQuestion(e.en, { ...options, targets });
    // 으뜸 까닭과 관계없이 걸린 질문에 든 노리는 단어(13절 C203 보완 1 덧붙임 (나) — 질문 검사는 길이를 먼저 본다). 들었을 때만 칸을 둔다
    const aimed = aimedTargetWordsIn(e.en, targets, options);
    const aim = aimed.length > 0 ? { aimed } : {};
    if (check.ok) {
      if (chainKeys.includes(questionKeyOf(e.en)))
        return { question: e.en, reason: "chain", words: [], ...aim };
      continue;
    }
    if (check.reason === "shape" || check.reason === "no_target") continue;
    return {
      question: e.en,
      reason: check.reason,
      words: check.words ?? [],
      ...aim,
    };
  }
  return null;
}

const REASON_LINE: Record<HeldQuestionFail["reason"], string> = {
  empty: "it was empty",
  too_long: "it was too long",
  target_word: "it put the unit word the question aims at in the question",
  offband: "it used words above the child's level",
  form: "it used a grammar form above the child's level",
  echo: "it asked again about what the child already told you",
  not_easy:
    "at Support stage 2 the question must be an easier yes-or-no question, not a card required question or a what, who or where question",
  chain:
    "it asked the next card question right after the child answered a card question",
};

/**
 * 다시 쓴 질문에 맞게 나머지 칸을 다시 쓰라는 문장(13절 C203 보완 1 — 'Keep the other fields' 가 노리는 단어 · 힌트 · 답 예시를 앞 질문의 것으로
 * 남기게 했다, 대본 열다섯 번 가운데 열다섯 번 · 장부 T-625). 세 판이 같이 쓴다.
 */
const FIELDS_AGAIN_LINE =
  "Write the other fields again for the new question (next_targets, card_item, next_hint_ko, next_hints and next_answer_example): the hints and the answer example answer the new question, not the question that was not shown.";

/**
 * '무엇을 다시 쓸지' 줄(받침 둘째 · 카드 답 뒤는 새 질문의 꼴이 정해져 있다). 쉬운 질문 자리(받침 둘째의 AI 질문)에서는 걸린 까닭이 길이 · 범위 밖
 * 낱말 · 되묻기여도 예 · 아니요 질문으로 다시 쓰게 한다 — 자리로 고른다(코드 검토 rev-content-1 M-1: 까닭으로 고르면 다시 쓴 wh 질문이 끝 처리에서
 * 또 걸린다).
 */
function rewriteLineOf(
  reason: HeldQuestionFail["reason"],
  easySlot: boolean,
): string {
  if (easySlot || reason === "not_easy")
    return `Your reaction was already shown. Write this turn again: in tori_en write only one easy yes-or-no question about the same thing (e.g. 'Do you like fish?'), or one question with two answer choices in choices. Set next_move follow_up and card_item kind none and no 0. ${FIELDS_AGAIN_LINE}`;
  if (reason === "chain")
    return `Your reaction was already shown. Write this turn again: in tori_en write only one new question that follows up on the child's last answer, in your own words (next_move follow_up, card_item kind none and no 0). Bring up the next card chance in a later turn. ${FIELDS_AGAIN_LINE}`;
  return `Your reaction was already shown. Write this turn again: in tori_en write only one new question (and a cue only if you fill model_line or choices). ${FIELDS_AGAIN_LINE}`;
}

/**
 * 노리는 단어가 든 걸린 질문의 노림 줄(13절 C203 보완 1 · 덧붙임 (다)): 이번 차례는 그 낱말을 노리지 않고, 그 낱말은 노리는 단어 칸에서
 * 빼고 뒤 차례에 꺼낸다. 보통 자리는 아이의 바로 앞 말에 이어 다른 것을 묻는다. 쉬운 질문 자리(받침 둘째)는 아이의 앞 말이 '잘 모르겠어요'라
 * 이을 말이 없으므로, 막힌 질문과 같은 것을 그 낱말 없이 예 · 아니요나 선택지 둘로 쉽게 묻는다(덧붙임 (다)). 그 자리는 카드 항목 none 이
 * 정해져 있어 '다른 카드 항목' 갈래를 넣지 않는다. 덧붙임 (라)의 '그 낱말만 다른 낱말로 바꿔 묻지 않는다' 문장은 넣었다가 뺐다: 실호출에서
 * 다시 쓴 질문의 꼴이 달라지지 않았다(덧붙임 2). 알림 글을 더 늘려 다듬지 않는다.
 */
function targetWordAimLineOf(words: readonly string[], easy: boolean): string {
  const list = words.map((w) => `"${w}"`).join(", ");
  return easy
    ? `This turn, do not aim at ${list}: ask about the same thing as the question the child could not answer, more easily and without ${list} (a yes-or-no question, or two answer choices). Leave ${list} out of next_targets. Bring up ${list} in a later turn.`
    : `This turn, do not aim at ${list}: ask one new question that follows up on the child's last words, about something else (who, where or what). Leave ${list} out of next_targets, and set card_item to kind none and no 0 unless the new question uses another card item. Bring up ${list} in a later turn.`;
}

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
    /** 쉬운 질문 자리인가(받침 둘째의 AI 질문 — talk-lesson talkEasyAiSlotOf). 참이면 까닭과 관계없이 예 · 아니요 질문으로 다시 쓰게 한다. */
    easySlot?: boolean;
  },
): string {
  const easy = ctx.easySlot === true || fail.reason === "not_easy";
  const aimed = aimedWordsOf(fail);
  const words =
    fail.words.length > 0 ? ` (words: ${fail.words.join(", ")})` : "";
  return [
    `App check: your question "${fail.question}" was not shown, because ${REASON_LINE[fail.reason]}${words}.`,
    rewriteLineOf(fail.reason, easy),
    `Use at most ${ctx.sentenceMaxWords} words, only easy words of this level, the unit words and words the child said (${ctx.childWords.join(", ") || "none"}).`,
    // 걸린 질문에 노리는 단어가 들었으면 으뜸 까닭과 관계없이 이번 차례에 그 낱말을 노리지 않는다(13절 C203 보완 1 · 덧붙임 (나)) —
    // 까닭 줄은 첫 까닭 그대로, 노리는 단어가 없는 다시 쓰기는 노림 줄을 그대로 둔다
    aimed.length > 0
      ? targetWordAimLineOf(aimed, easy)
      : `Do not put the word the question aims at in the question (aims at: ${ctx.targets.join(", ") || "none"}); ask about the thing or the person instead (e.g. 'Do you like fish?').`,
    // [N-3] 아이의 바로 앞 말이 답인 질문 금지(대본 회차 r2 판정 N-3)
    "Do not ask a question whose answer the child just gave in the last words (after 'I drink juice.', not 'What do you do with the juice?').",
    // 다시 쓰기의 버릇 꼴 · 비튼 문장(대본 회차 r1 판정 M-7 · M-2) — 받침 둘째의 쉬운 질문은 예 · 아니요 꼴이 맞으므로 이 줄을 넣지 않는다
    ...(easy
      ? []
      : [
          "Prefer a what, who or where question about something new; do not fall back to 'Do you like …?' or 'A or B?' each time.",
        ]),
    // 길이 줄은 걸린 질문을 줄여 쓰라는 뜻이다. 보통 자리에서 노리는 단어가 든 긴 질문은 새 질문을 쓰게 하므로(노림 줄) 이 줄을 넣지 않는다 —
    // '줄여라'와 '다른 것을 물어라'가 한 알림에서 어긋나지 않게(재검토 rev-t625-2 N-1). 낱말 수 상한은 위 줄이 이미 알린다
    ...(fail.reason === "too_long" && (aimed.length === 0 || easy)
      ? [
          "To make it shorter, leave out extra words but keep a whole question that makes sense (not 'Is the lake with your family?').",
        ]
      : []),
  ].join("\n");
}

/**
 * 막힘을 무른 턴을 통째로 다시 쓰게 할 사용자 메시지(13절 C204 (3)): AI 가 막힘이라 한 아이 말이 뜻이 통하는 영어 말(답 · 아이 이야기)이라 앱이
 * 막힘을 물렀음을 알리고, 막힘 거짓으로 짧은 반응과 이어 묻는 질문 하나를 쓰게 한다. 앞 응답은 아이에게 나가지 않았다.
 */
export function stuckRewriteNoteOf(child: string): string {
  return [
    `App check: the child's words "${child}" make sense, so the child is not stuck (it is an answer or the child's own topic).`,
    "Nothing of your last answer was shown. Write this turn again with stuck false: a short reaction to what the child said, then one follow-up question about it (next_move follow_up, or follow_child for the child's own topic). Do not say it together and do not give the answer.",
  ].join("\n");
}

/** 앞 응답 칸 가운데 아이의 지난 말에 대한 것(다시 쓴 응답이 아니라 앞 응답 값을 쓴다). */
const CHILD_FIELDS = [
  "child_kind",
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
 * 다시 쓴 응답을 앞 응답에 잇는다(C203 (3)). 앞 응답의 첫 잡아 둔 질문 앞 문장(보낸 반응 · 잡아 둔 넘김 말 · 지운 것, C249)은 그대로 두고 그
 * 질문부터 버린 뒤, 다시 쓴 응답의
 * 첫 물음표 문장부터를 잡아 둔 문장으로 붙인다. 값은 다음 질문 칸(갈래 · 카드 항목 · 노린 것 · 힌트 · 소리 줄)을 다시 쓴 응답에서, 아이 말에
 * 대한 칸(막힘 · 되풀이 · 아이가 보인 능력 …)을 앞 응답에서 가져온다. 뜻은 문장 자리마다 두고, 문장 수와 맞지 않는 응답 쪽의 자리는 빈 뜻,
 * 둘 다 맞지 않으면 빈 목록이다(걸린 질문 · 버린 반응의 뜻이 붙지 않게). 다시 쓴 응답에 질문이 없으면 null(부르는 쪽이 앞 응답으로 카드 자리를 만든다).
 */
export function mergeQuestionRetry<
  V extends RetryValue,
  E extends RetrySentence = RetrySentence,
>({
  first,
  firstEntries,
  retry,
  retryEntries,
  whole = false,
}: {
  first: V;
  firstEntries: readonly E[];
  retry: V;
  retryEntries: readonly E[];
  /** 앞 응답을 통째로 바꾼다(막힘을 무른 턴 — 앞 응답 문장은 모두 잡아 둔 채였다). 다시 쓴 응답의 반응부터 잇는다. */
  whole?: boolean;
}): { entries: E[]; value: V } | null {
  const firstQuestion = retryEntries.findIndex((e) => e.question && !e.cue);
  if (firstQuestion < 0) return null;
  const at = whole ? 0 : firstQuestion;
  // 앞 응답은 첫 잡아 둔 질문 앞의 문장(보낸 것 · 잡아 둔 넘김 말 · 지운 것)을 지키고 그 질문부터 버린다(13절 C249 — 받침 차례의 넘김 말은
  // 질문 앞에 잡아 둔다). 통째로 다시 쓰는 턴(whole)은 앞 응답 문장이 모두 잡아 둔 채라 지운 것만 남긴다(지금과 같음)
  const heldQuestion = firstEntries.findIndex(
    (e) => e.state === "held" && e.question && !e.cue,
  );
  const cut = heldQuestion < 0 ? firstEntries.length : heldQuestion;
  const keepFirst = (e: E, i: number) => (whole ? e.state !== "held" : i < cut);
  const kept = firstEntries.filter(keepFirst);
  const added = retryEntries
    .slice(at)
    .map((e) =>
      e.state === "dropped" ? { ...e } : { ...e, state: "held" as const },
    );
  const entries = [...kept, ...added];
  // 뜻은 AI 문장 자리마다다(앱이 더한 문장은 자리가 없다 — C249). aiIndexesOf 는 그 문장의 AI 뜻 자리(앱 문장은 -1)
  const aiIndexesOf = (list: readonly E[]) => {
    let n = 0;
    return list.map((e) => (e.app ? -1 : n++));
  };
  const firstAi = aiIndexesOf(firstEntries);
  const retryAi = aiIndexesOf(retryEntries);
  const keptIndexes = firstEntries.flatMap((e, i) =>
    keepFirst(e, i) && !e.app ? [firstAi[i] ?? -1] : [],
  );
  // 뜻은 문장마다 맞는 쪽만 문장 자리에 둔다(13절 C202 (5) — 빠진 문장의 뜻만 뺌, 검토 rev-night-2 fix1 N-1). 맞지 않는 쪽의 문장 자리는
  // 빈 뜻이라 보이지 않는다. 두 쪽 모두 맞지 않으면 빈 목록(뜻 없음) — 걸린 질문 · 버린 반응의 뜻을 한 덩이로 잇지 않는다
  const firstAligned =
    first.tori_ko.length === firstEntries.filter((e) => !e.app).length;
  const retryAligned =
    retry.tori_ko.length === retryEntries.filter((e) => !e.app).length;
  const toriKo =
    firstAligned || retryAligned
      ? [
          ...keptIndexes.map((i) =>
            firstAligned ? (first.tori_ko[i] ?? "") : "",
          ),
          ...retryEntries
            .slice(at)
            .flatMap((e, j) =>
              e.app
                ? []
                : [
                    retryAligned
                      ? (retry.tori_ko[retryAi[at + j] ?? -1] ?? "")
                      : "",
                  ],
            ),
        ]
      : [];
  // 통째로 다시 쓴 턴(막힘을 무름)은 앞 응답이 막힘이라 보고 쓴 것이라 아이 말 칸('말함' · 목표 근거 · 되풀이 …)이 비어 있다 — 앱이 정한 갈래 ·
  // 막힘만 앞 응답 값으로 두고 나머지 아이 말 칸은 다시 쓴 응답에서 가져온다(검토 rev-prompt-2 A)
  const firstKeys: readonly (typeof CHILD_FIELDS)[number][] = whole
    ? ["child_kind", "stuck"]
    : CHILD_FIELDS;
  const fromFirst = Object.fromEntries(
    firstKeys.map((key) => [key, first[key]]),
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

/** 노림 안전망이 읽고 고치는 응답 칸(회화 턴 출력 TalkLessonOutput 의 다음 질문 칸). */
type RetryAimValue = {
  next_targets: string[];
  card_item: { kind: string; no: number };
  next_hint_ko: string;
  next_hints: string[];
  next_answer_example: string;
};

/** 노림 안전망이 읽는 카드 항목(번호와 노리는 단어). */
type RetryAimItem = { no: number; targets: readonly string[] };

/**
 * 노리는 단어가 든 걸린 질문을 다시 쓴 응답의 노림 안전망(13절 C203 보완 1 (2) · 덧붙임 (나) · 02-2 3.3 · AC-15zj (바)). 으뜸 까닭이 무엇이든
 * 걸린 질문에 노리는 단어가 들었을 때(aimedWordsOf — 걸린 낱말이라 부른다) 동작하고, 들지 않았으면 합친 값을 그대로 돌려준다. 차례는 다음과 같다.
 * ① 합친 문장의 잡아 둔 질문을 모두 보아 걸린 낱말(원형 포함)이 남았으면 null — 부르는 쪽이 앞 응답으로 카드 자리를 만든다. 끝 처리는 마지막
 *    질문 하나만 남긴 뒤 검사하므로(keepLastHeldQuestion), ①은 끝 처리보다 넓게 볼 수 있다(지워질 앞 질문에만 남아도 카드 자리 — 더 조심스러운 쪽).
 *    빼기보다 먼저 본다: 빼고 나면 끝 처리 검사가 노리는 단어를 모르게 되어 그 질문이 지나간다(분석 U-4 · C217 보완 3 (1)).
 * ② next_targets 에서 걸린 낱말을 뺀다.
 * ③ card_item 이 가리키는 카드 항목의 노리는 단어가 걸린 낱말과 겹치면 kind none · no 0 으로 둔다.
 * ④ next_answer_example · next_hints 가운데 걸린 낱말을 담은 칸이 있으면 next_answer_example · next_hints · next_hint_ko 를 함께 비운다.
 * 낱말 찾기는 질문 검사와 같은 판정(question-check targetWordsIn)이다. 알림을 잘 따른 응답(걸린 낱말이 어느 칸에도 없음)은 같은 값이 된다.
 */
export function retryAimGuardOf<V extends RetryAimValue>({
  fail,
  entries,
  value,
  card,
  options,
}: {
  fail: HeldQuestionFail;
  /** 합친 문장(mergeQuestionRetry 의 entries). */
  entries: readonly RetrySentence[];
  /** 합친 값(mergeQuestionRetry 의 value). */
  value: V;
  card: {
    required: readonly RetryAimItem[];
    more: readonly RetryAimItem[];
  };
  options: Pick<LowLevelLineOptions, "lemmaOf">;
}): V | null {
  const aimed = aimedWordsOf(fail);
  if (aimed.length === 0) return value;
  const has = (text: string) => targetWordsIn(text, aimed, options).length > 0;
  // ①
  if (entries.some((e) => e.state === "held" && e.question && has(e.en)))
    return null;
  // ②
  const nextTargets = value.next_targets.filter((t) => !has(t));
  // ③
  const kind = value.card_item.kind;
  const item =
    kind === "required" || kind === "more"
      ? (kind === "required" ? card.required : card.more).find(
          (x) => x.no === value.card_item.no,
        )
      : undefined;
  const cardItem =
    item !== undefined && has(item.targets.join(" "))
      ? { ...value.card_item, kind: "none", no: 0 }
      : value.card_item;
  // ④
  const stale =
    has(value.next_answer_example) || value.next_hints.some((h) => has(h));
  return {
    ...value,
    next_targets: nextTargets,
    card_item: cardItem,
    ...(stale
      ? { next_answer_example: "", next_hints: [], next_hint_ko: "" }
      : {}),
  };
}
