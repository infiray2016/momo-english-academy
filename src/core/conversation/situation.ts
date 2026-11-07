// 회화 1~3단계 상황 차례('AI 몫 넓힘' spec 판 4 설계 1 · 13절 C209 '나' · C210 · C211 (4) · 정본 02-2 208줄 · 06:221). 인사 끝 · 받침 첫째 ·
// 둘째 · 셋째 · 들리지 않음 차례의 선생님 말은 AI 가 그 자리에 맞게 쓰고, 앱은 그 말에 어휘 · 답 글 · 금지 구 검사를 걸어 걸린 첫 문장을 시드
// '상황 줄'로 바꾼다(뒤 걸림은 지움 — 6.4 안전한 대사 꼴). 들리지 않음은 앱이 판단한 기술 문제라 그 차례의 판단 칸(막힘 · 갈래 · 아이가 보인
// 능력 · 스스로 쓴 단어 …)은 읽지 않는다. 순수 모듈이다. 서버 턴 길(lesson-turn)과 대본 도구(talk-observe)가 같이 부른다(plan 정한 것 7).
import type { TalkLessonOutput } from "@/core/ai/calls/talk-lesson";
import { isDontKnowSaying } from "@/core/conversation/child-kind";
import type { TeacherTurnPlan } from "@/core/conversation/lesson-flow";
import {
  TALK_SUPPORT_STAGE_EASY,
  TALK_SUPPORT_STAGE_MAX,
  TALK_SUPPORT_STAGE_TOGETHER,
} from "@/core/conversation/move";
import {
  CLOSED_CLASS_PASS_WORDS,
  type LowLevelLineOptions,
  offbandWordsIn,
} from "@/core/conversation/question-check";
import { normalizeSpoken } from "@/core/conversation/spoken";
import type {
  TalkListLine,
  TalkSituationLinesFile,
} from "@/core/seed/schema/reference";
import type { TalkSituationPlace } from "@/core/seed/structure";
import { expandContraction, splitSentences, tokenize } from "@/core/seed/text";
import { lemmaLookup } from "@/core/session/attempt";

/** 상황 차례 자리(시드 '상황 줄' 목록의 열쇠와 같다). */
export type SituationPlace = TalkSituationPlace;

/**
 * 1~3단계 상황 차례(인사 끝 · 받침 · 들리지 않음 — 02-2 3.3 상황 차례 · spec 설계 1 · 2, C209 · C211)의 예. 자리마다 꼴이 다른 예 셋이다.
 * 고정부에는 목록을 두지 않고 사용자 메시지의 'Example line' 한 줄로 그 차례 자리의 예 하나만 돌려 보인다(대본 회차 r1 판정 I-1 · M-1 — 목록의
 * 첫째를 베끼고 자리를 섞음). 앱은 AI 가 예 문장을 그대로 쓰거나 이 대화에서 이미 한 말을 되풀이하면 상황 줄로 바꾼다(checkSituationSentence
 * repeat). 같이 말하자 · 따라 하라는 말(신호 말은 앱 몫, C207)과 답 글 · 질문은 없다. 예의 낱말은 상황 차례 어휘 검사와 허용 목록의 재료이고,
 * 넓이 시험이 이 표를 읽는다(talk-lesson 이 같은 이름으로 다시 내보낸다).
 */
export const TALK_SITUATION_EXAMPLES = {
  /** 인사 끝 → 짧은 준비. */
  greetingEndPrep: [
    "Good to hear! Let's learn some new words!",
    "Yay! New words time!",
    "Oh, I like that! Now, some new words.",
  ],
  /** 인사 끝 → 대화. */
  greetingEndTalk: [
    "Let's talk!",
    "Great! Now let's talk.",
    "Oh, okay! Let's talk now.",
  ],
  /** 받침 첫째(같이 말하기 — 괜찮다는 반응과 짧은 격려, 같이 말하자는 안내는 앱 신호 말). */
  together: [
    "That's okay!",
    "No problem. You can do it!",
    "It's okay. We can do it!",
  ],
  /** 받침 둘째(쉬운 질문으로 바꾼다는 연결 말). */
  easy: [
    "That's okay! Here is an easy one.",
    "No problem! Let me ask in a new way.",
    "Okay! Try this one.",
  ],
  /** 받침 셋째(답을 들려주고 넘어간다는 말 — 따라 하라는 말 없음, C204 (5)). */
  close: [
    // [M-1] 듣고 따라 하라는 신호 말 꼴('Listen …')은 예에 두지 않는다(같은 고정부의 신호 말 금지 줄 · C207)
    "That's okay! Here is the answer.",
    "No problem. I will help, and then we go on.",
    "It's okay! Let's go on.",
  ],
  /** 들리지 않음(못 들은 것을 소리 · 선생님 쪽 일로, spec 설계 1 [M-8]). */
  nospeech: [
    "Oops, my ears! Let's go on.",
    "Hmm, the sound is not good. Let's go on.",
    "Sorry, I can't hear it well. Here is the answer.",
  ],
} as const;

/** 그 자리의 예 목록(인사 끝은 다음 토막으로 가른다 — 짧은 준비가 아니면 대화). */
function situationExamplesOf(
  place: SituationPlace,
  nextPart: "prep" | "talk" | undefined,
): readonly string[] {
  const ex = TALK_SITUATION_EXAMPLES;
  if (place === "greeting_end")
    return nextPart === "prep" ? ex.greetingEndPrep : ex.greetingEndTalk;
  return ex[place];
}

/** 그 차례 자리의 예 하나(돌림 번호 at 으로 셋 가운데 하나 — 사용자 메시지 'Example line', 판정 r1 I-1 (가)). */
export function situationExampleOf(
  place: SituationPlace,
  at: number,
  nextPart?: "prep" | "talk",
): string {
  const list = situationExamplesOf(place, nextPart);
  const n = list.length;
  return list[((Math.trunc(at) % n) + n) % n] ?? "";
}

/**
 * 1~3단계 짧은 반응 예(고정부 '짧은 반응은 자기 말로' 줄 — 대본 회차 r2 판정 N-1 (라)). 아이 말에 대한 맞장구 한 문장 꼴이고, 'yummy' 처럼 그
 * 낱말이 허용 목록을 뽑는 예 문장 출처가 된다(넓이 시험 · 묶음 3-(다) 절차).
 */
export const TALK_LOW_REACTION_EXAMPLES = [
  "Yummy!",
  "Wow, nice!",
  "Oh, fun!",
] as const;

/** 짧은 반응으로 보는 가장 많은 낱말 수(고정부 'a short reaction of at most four words' · 대본 지표와 같은 기준, 판정 r2 N-1 (가)). */
export const SHORT_REACTION_MAX_WORDS = 4;

/** 넘김 문장(수업 시작 · 다음으로 가는 말)의 낱말 — 짧아도 이 낱말이 들면 맞장구가 아니라 넘김이다(판정 r2 N-1 (나)). */
const MOVE_ON_WORDS = new Set([
  "let",
  "lets",
  "let's",
  "now",
  "start",
  "begin",
  "go",
  "going",
  "next",
  "time",
  "talk",
  "learn",
  "try",
  "here",
  "then",
]);

/** 글의 낱말(소문자, 문장 부호 밖 — 축약형은 한 낱말). */
function plainWordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z'\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w !== "" && w !== "'");
}

/**
 * 맞장구 한 문장인가(판정 r2 N-1 (가)): 낱말 SHORT_REACTION_MAX_WORDS 개 이하이고 넘김 낱말이 없다('Good to hear!' · 'That's okay!' · 'No
 * problem!' · 'Yummy!'). 'Let's talk!' · 'Try this one.' · 'New words time!' 은 넘김이라 아니다. 상황 차례의 예 베끼기 검사는 맞장구를 걸지 않는다
 * (아이 답에 대한 사람 같은 반응이고, 버릇처럼 굳는 것은 넘김 문장이었다).
 */
export function isShortReaction(sentence: string): boolean {
  const words = plainWordsOf(sentence);
  return (
    words.length > 0 &&
    words.length <= SHORT_REACTION_MAX_WORDS &&
    !words.some((w) => MOVE_ON_WORDS.has(w))
  );
}

/** 같은 뜻 견주기에서 빼는 기능어(관사 · 대명사 · be 꼴 · 축약형 · 전치사 · 이음말 · 감탄 — 내용 낱말만 남긴다). */
const ECHO_FUNCTION_WORDS = new Set(
  "a an the i you it he she we they me us them my your its our their is am are was were it's that's i'm you're we're let's to in on at with of for and or but so oh".split(
    " ",
  ),
);

/**
 * 같은 턴에 남긴 문장과 같은 뜻을 되풀이하는 문장인가(판정 r2 N-2 — 'You can do it! You can do it with me.'): 두 낱말 이상인 앞 문장의 낱말이
 * 이 문장에 모두 들거나, 이 문장의 낱말이 앞 문장에 모두 든다. 상황 차례에서 이 문장은 상황 줄로 바꾸지 않고 지운다.
 */
export function echoesTurnSentence(
  sentence: string,
  kept: readonly string[],
): boolean {
  // 내용 낱말로만 견준다 — 'It's okay!' 뒤 'Okay, it's hard!' 를 기능어 겹침으로 지우지 않게(코드 재검토 fix2 Minor 1)
  const contentOf = (text: string) =>
    new Set(plainWordsOf(text).filter((w) => !ECHO_FUNCTION_WORDS.has(w)));
  const mine = contentOf(sentence);
  if (mine.size === 0) return false;
  return kept.some((other) => {
    const theirs = contentOf(other);
    if (theirs.size < 2 && mine.size < 2) return false;
    const within = (a: Set<string>, b: Set<string>) =>
      a.size >= 2 && [...a].every((w) => b.has(w));
    return within(theirs, mine) || within(mine, theirs);
  });
}

/**
 * 상황 줄을 이 턴에 이미 남긴 AI 반응 뒤에 붙일 때의 꼴(판정 r2 N-1 (나) · N-2): 이 턴에 AI 맞장구가 남았고 상황 줄이 '맞장구 + 넘김' 두 문장
 * 이상이면 앞의 맞장구를 떼고 넘김만 쓴다('That's okay!' 뒤에 'It's okay! Now we go on.' 이 아니라 'Now we go on.'). 뜻도 문장 수가 같을 때만
 * 같은 자리를 떼고, 아니면 줄 그대로다.
 */
export function situationTailOf(
  line: TalkListLine,
  reacted: boolean,
): TalkListLine {
  if (!reacted) return line;
  const en = splitSentences(line.en);
  const first = en[0];
  if (en.length < 2 || first === undefined || !isShortReaction(first))
    return line;
  const ko = line.ko
    .split(/(?<=[.!?])\s+/)
    .map((k) => k.trim())
    .filter((k) => k !== "");
  if (ko.length !== en.length) return line;
  return { en: en.slice(1).join(" "), ko: ko.slice(1).join(" ") };
}

/** 예 문장 전부(정규화 글 — 자리와 관계없이, 예를 그대로 베낀 문장 걸림의 재료). */
export const SITUATION_EXAMPLE_SENTENCES: ReadonlySet<string> = new Set(
  Object.values(TALK_SITUATION_EXAMPLES)
    .flatMap((lines) => lines.flatMap((line) => splitSentences(line)))
    .map(normalizeSpoken)
    .filter((s) => s !== ""),
);

/** 돌림 번호에 더하는 값의 폭(목록 길이 셋 · 넷의 공배수 — 어느 목록에서도 고르게 돈다, 판정 기준이 아닌 코드 상수). */
const SITUATION_ROTATION_SPAN = 12;

/**
 * 상황 줄 · 예의 돌림 번호(판정 r1 M-6): 턴 번호에 대화마다 다른 값(서버는 세션 id, 대본 도구는 대본 이름 · 바퀴)을 더한다. 같은 수업을 다시
 * 해도 같은 자리에서 같은 줄이 나오지 않게 하고, 같은 대화 안에서는 다시 흘림 · 시험이 같은 줄을 낸다. 열쇠가 비면 턴 번호 그대로다.
 */
export function situationRotationOf(turnNo: number, key: string): number {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return Math.trunc(turnNo) + (hash % SITUATION_ROTATION_SPAN);
}

/**
 * 이 계획이 1~3단계 상황 차례인가 · 어느 자리인가(spec 설계 1 '상황 차례' — 인사 끝 · 받침 · 들리지 않음). 들리지 않음이 먼저다(인사 끝 자리를
 * 들리지 않음으로 닫아도 들리지 않음 차례). 앞 아이 차례가 막힘(단추 · 막힘 말)이면 받침 단계로 같이 말하기 · 쉬운 질문 · 닫기다(대화 중 연 짧은
 * 준비를 여는 닫기 포함). 말로 답한 인사 끝 턴은 인사 끝이다. 그 밖(4단계부터 · AI 차례 · 카드 자리 · 마무리 자리)은 null.
 */
export function situationPlaceOf(
  plan: Pick<TeacherTurnPlan, "lowBand" | "segment" | "cause" | "stage">,
): SituationPlace | null {
  if (plan.lowBand !== true) return null;
  if (plan.cause === "nospeech") return "nospeech";
  if (plan.cause === "button" || plan.cause === "stuck") {
    if (plan.stage >= TALK_SUPPORT_STAGE_MAX) return "close";
    if (plan.stage === TALK_SUPPORT_STAGE_EASY) return "easy";
    if (plan.stage === TALK_SUPPORT_STAGE_TOGETHER) return "together";
    return null;
  }
  return plan.segment === "greeting_end" ? "greeting_end" : null;
}

/**
 * 회화 턴이 실패 · 거절된 1~3단계 차례의 대신 줄 자리(spec 설계 1 대신 줄 행 · 대본 회차 r1 판정 I-3 (나)(다)): 상황 차례면 그 자리, 상황 차례가
 * 아니고 아이 말이 모름 · 못 알아들음 꼴('Huh?' · 'I don't know.')이면 쉬운 질문으로 넘어가는 받침 둘째 자리(칭찬으로 들은 척하지 않음), 그 밖은
 * null(부르는 쪽이 카드 안전한 대사 — 뜻 있음 — 를 쓴다). child 는 말 입력의 인식 글(말이 아니면 null).
 */
export function failSituationPlaceOf(
  plan: Pick<TeacherTurnPlan, "lowBand" | "segment" | "cause" | "stage">,
  child: string | null,
): SituationPlace | null {
  const place = situationPlaceOf(plan);
  if (place !== null || plan.lowBand !== true) return place;
  return child !== null && isDontKnowSaying(child) ? "easy" : null;
}

/**
 * 1~3단계 실패 · 거절 차례의 대신 상황 줄(failSituationPlaceOf 자리의 줄): 상황 차례면 그 자리 줄, 모름 꼴 아이 말이면 받침 둘째 줄 가운데
 * '쉬운'을 말하지 않는 줄이다 — 그 뒤에 붙는 것은 받침 둘째의 쉬운 질문이 아니라 다음 카드 질문이다(코드 검토 Minor 3). 자리가 없으면 null.
 */
export function failSituationLineOf(
  lines: Partial<TalkSituationLinesFile["lines"]>,
  plan: Pick<TeacherTurnPlan, "lowBand" | "segment" | "cause" | "stage">,
  child: string | null,
  turnNo: number,
  texts: readonly string[],
): TalkListLine | null {
  const place = failSituationPlaceOf(plan, child);
  if (place === null) return null;
  const fromStuckWords = situationPlaceOf(plan) === null;
  return situationLineOf(lines, place, turnNo, {
    texts,
    ...(fromStuckWords ? { words: ["easy", "easier"] } : {}),
  });
}

/**
 * 허용 낱말 대조의 모든 단계 원형 찾기(컨트롤러 결정 (나)): 어휘 행 가운데 허용 낱말인 행의 활용형(단계 무관)을 원형에 잇는다. 서버는 DB vocab,
 * 대본 도구 · 넓이 시험은 seed/vocab.json 의 행을 넣어 같은 사전을 만든다(plan 정한 것 7 · 위험 4 — 같은 입력이면 같은 판정, rev-2 fix 1 N-2).
 */
export function allowedLemmaOfVocab(
  entries: readonly { word: string; forms: readonly string[] }[],
  allowed: Iterable<string>,
): (surface: string) => string | undefined {
  const want = new Set([...allowed].map((w) => w.toLowerCase()));
  return lemmaLookup(entries.filter((e) => want.has(e.word.toLowerCase())));
}

/** 답 글 검사 재료(받침 · 들리지 않음 차례 — spec 설계 1 말 검사 (나)). */
export type SituationAnswer = {
  /** 그 자리 답 예시(카드 답 예시 · 장면 여는 질문 답 예시 · AI 질문 답 예시). */
  example: string;
  /** 그 질문 글(장면 문장 포함 — 그 자리를 연 선생님 차례부터 지금까지 보인 글). */
  question: string;
  /** 기능어(어휘 시드의 기능어 표시 — 소문자 표기). 답 예시의 내용어를 가른다. */
  functionWords: ReadonlySet<string>;
};

export type SituationCheckContext = {
  place: SituationPlace;
  /** 1~3단계 질문 검사와 같은 범위 재료. null 이면 범위를 읽지 못한 턴이라 모든 문장이 걸린다(plan 2 행). */
  options: LowLevelLineOptions | null;
  /** 시드 '감탄 · 수업 말' 허용 낱말(소문자). */
  allowed: ReadonlySet<string>;
  /** 허용 낱말 대조의 모든 단계 원형 찾기(OffbandExtra.allowedLemmaOf — 없으면 규칙 꼬리 떼기). */
  allowedLemmaOf?: ((surface: string) => string | undefined) | undefined;
  /** 상황 금지 구(all: 모든 상황 차례, nospeech: 들리지 않음에 더함 — 자연 글, 견줄 때 정규화). */
  forbidden: { all: readonly string[]; nospeech: readonly string[] };
  /** 답 글 재료(받침 · 들리지 않음 차례에서 답 예시가 있을 때). 없으면 답 글 검사를 하지 않는다. */
  answer: SituationAnswer | null;
  /**
   * 되풀이 · 예 베끼기 검사 재료(판정 r1 I-1 (나)): 이 대화의 앞 선생님 행 글. 주면 그 글의 한 문장과 같은 문장(이 대화에서 이미 한 말)과
   * 상황 차례 예 문장과 같은 문장(SITUATION_EXAMPLE_SENTENCES)이 걸린다. 없으면 보지 않는다(옛 시험 길).
   */
  repeat?: { spoken: readonly string[] } | undefined;
};

/** repeat: 이 대화에서 이미 한 선생님 말과 같은 문장 · copy: 상황 차례 예를 그대로 쓴 문장(판정 r1 I-1). */
export type SituationHitReason =
  | "range"
  | "offband"
  | "answer"
  | "forbidden"
  | "repeat"
  | "copy";
export type SituationCheck =
  | { ok: true }
  | { ok: false; reason: SituationHitReason; words?: string[] };

/** 낱말 토큰을 축약형을 펼친 조각(소문자)과 그 원형으로. */
function piecesOf(
  text: string,
  lemmaOf: (surface: string) => string | undefined,
): { piece: string; lemma: string | undefined }[] {
  return tokenize(text)
    .filter((t) => t.kind === "word")
    .flatMap((t) => expandContraction(t.text))
    .map((piece) => ({ piece, lemma: lemmaOf(piece)?.toLowerCase() }));
}

/**
 * 답 예시의 내용어 가운데 질문 글에 없는 낱말(소문자 조각 · 원형 — 겹침 없애기 C125 를 넓힘, spec 설계 1 (나) · N-2). 'We eat rice and fish.' 에
 * 'Rice and fish for lunch! What do you do at the table?' 이면 eat 하나다.
 */
export function answerOnlyWordsOf(
  answer: SituationAnswer,
  lemmaOf: (surface: string) => string | undefined,
): Set<string> {
  const shown = new Set<string>();
  for (const { piece, lemma } of piecesOf(answer.question, lemmaOf)) {
    shown.add(piece);
    if (lemma !== undefined) shown.add(lemma);
  }
  const isFunction = (piece: string, lemma: string | undefined) =>
    answer.functionWords.has(piece) ||
    (lemma !== undefined && answer.functionWords.has(lemma));
  const out = new Set<string>();
  for (const { piece, lemma } of piecesOf(answer.example, lemmaOf)) {
    if (isFunction(piece, lemma)) continue;
    if (shown.has(piece) || (lemma !== undefined && shown.has(lemma))) continue;
    out.add(lemma ?? piece);
    out.add(piece);
  }
  return out;
}

/** 정규화 글에 구가 낱말 경계로 드는가. */
function holdsPhrase(normalized: string, phrase: string): boolean {
  const p = normalizeSpoken(phrase);
  return p !== "" && ` ${normalized} `.includes(` ${p} `);
}

/**
 * 상황 차례 선생님 문장 하나의 검사(spec 설계 1 말 검사 · AC-1 (나)). (다) 상황 금지 구(탓 · 학습 실패 꼴, 들리지 않음은 들은 척하는 칭찬 ·
 * 되받기 꼴을 더함) → (나) 답 글(받침 · 들리지 않음: 질문 글에 없는 답 예시 내용어) → (가) 어휘(축약형을 펼친 뒤 1~3단계 질문 검사 범위 +
 * 허용 목록, 범위 밖이 닫힌 품사 한 낱말뿐이면 통과). 범위 재료가 없으면 'range' 로 걸린다. 걸린 낱말은 words 에 둔다.
 */
export function checkSituationSentence(
  sentence: string,
  ctx: SituationCheckContext,
): SituationCheck {
  if (ctx.options === null) return { ok: false, reason: "range" };
  const options = ctx.options;
  const normalized = normalizeSpoken(sentence);
  const forbidden = [
    ...ctx.forbidden.all,
    ...(ctx.place === "nospeech" ? ctx.forbidden.nospeech : []),
  ];
  const banned = forbidden.filter((p) => holdsPhrase(normalized, p));
  if (banned.length > 0)
    return { ok: false, reason: "forbidden", words: banned };
  if (ctx.answer !== null && ctx.place !== "greeting_end") {
    const only = answerOnlyWordsOf(ctx.answer, options.lemmaOf);
    const leaked = piecesOf(sentence, options.lemmaOf)
      .filter(
        ({ piece, lemma }) =>
          only.has(piece) || (lemma !== undefined && only.has(lemma)),
      )
      .map(({ piece }) => piece);
    if (leaked.length > 0)
      return { ok: false, reason: "answer", words: [...new Set(leaked)] };
  }
  const off = offbandWordsIn(sentence, options, {
    allowed: ctx.allowed,
    expand: true,
    ...(ctx.allowedLemmaOf ? { allowedLemmaOf: ctx.allowedLemmaOf } : {}),
  });
  const closedOnly =
    off.length === 1 && CLOSED_CLASS_PASS_WORDS.has(off[0] ?? "");
  if (off.length > 0 && !closedOnly)
    return { ok: false, reason: "offband", words: off };
  if (ctx.repeat !== undefined && normalized !== "") {
    const said = ctx.repeat.spoken.some((text) =>
      splitSentences(text).some((s) => normalizeSpoken(s) === normalized),
    );
    if (said) return { ok: false, reason: "repeat" };
    // 맞장구 한 문장은 예와 같아도 걸지 않는다 — 넘김 문장만 앱 돌림 줄로(판정 r2 N-1 (가)(나))
    if (
      SITUATION_EXAMPLE_SENTENCES.has(normalized) &&
      !isShortReaction(sentence)
    )
      return { ok: false, reason: "copy" };
  }
  return { ok: true };
}

/** 상황 줄 고르기에서 피할 글(검토 rev-2 M-1). */
export type SituationAvoid = {
  /** 이 낱말이 든 줄은 건너뛴다(모두 걸리면 돌림 줄 — 실패 대신 줄이 '쉬운'을 약속하지 않게, 코드 검토 Minor 3). */
  words?: readonly string[];
  /** 이 턴에 AI 반응(맞장구)이 남았다 — 모든 줄이 걸리면 넘김 꼬리만 붙일 수 있다(대본 회차 r3 판정 I-r3-1 (나)). */
  reacted?: boolean;
  /** 이 턴에 이미 보낸(남긴) 선생님 문장 — 상황 줄의 한 문장이 이것과 같으면 건너뛴다('That's okay! That's okay! …' 막기). */
  sentences?: readonly string[];
  /** 이 대화의 앞 선생님 행 글 — 상황 줄이 그대로 든 줄이면 건너뛴다(상황 반응 되풀이 0, spec 설계 8). */
  texts?: readonly string[];
};

/**
 * 그 자리의 상황 줄(시드 목록, 턴 번호로 돌림 — spec 설계 1 대신 줄 행). 돌림 순서로 (1) 이 턴 문장 · 앞 선생님 행의 줄 · 문장 · 피할 낱말에
 * 걸리지 않는 줄, (가) 앞 행에 통째로 나온 적 없는 줄(문장은 나왔어도), (나) 이 턴 AI 반응이 남았으면(avoid.reacted) 넘김 꼬리가 앞에 나오지
 * 않은 줄의 꼬리만, (다) 피할 낱말 없는 첫 줄 · 돌림 차례 줄 차례로 고른다(대본 회차 r3 판정 I-r3-1 — 다 걸려도 이미 통째로 쓴 줄로 돌아가지
 * 않게). 들리지 않음 · 받침 · 인사 끝 목록이 모두 같은 고르기를 쓴다. 목록이 비었으면 null(부르는 쪽이 지운다 · 지금 대신 줄로).
 */
export function situationLineOf(
  lines: Partial<TalkSituationLinesFile["lines"]>,
  place: SituationPlace,
  turnNo: number,
  avoid: SituationAvoid = {},
): TalkListLine | null {
  const list = lines[place] ?? [];
  const n = list.length;
  if (n === 0) return null;
  const at = ((Math.trunc(turnNo) % n) + n) % n;
  const said = new Set(
    (avoid.sentences ?? []).map(normalizeSpoken).filter((t) => t !== ""),
  );
  const before = (avoid.texts ?? [])
    .map((t) => normalizeSpoken(t))
    .filter((t) => t !== "")
    .map((t) => ` ${t} `);
  // [N-2] 앞 선생님 행에 나온 문장(정규화)을 담은 줄도 건너뛴다 — 'That's okay!' 가 차례마다 다시 나오지 않게(대본 회차 r2 판정 N-2)
  const saidBefore = new Set(
    (avoid.texts ?? [])
      .flatMap((t) => splitSentences(t))
      .map(normalizeSpoken)
      .filter((t) => t !== ""),
  );
  const order = Array.from({ length: n }, (_, i) => list[(at + i) % n]).filter(
    (line): line is TalkListLine => line !== undefined,
  );
  const sentencesOf = (line: TalkListLine) =>
    splitSentences(line.en).map((s) => normalizeSpoken(s));
  const echoes = (line: TalkListLine) =>
    sentencesOf(line).some((s) => said.has(s));
  const usedWhole = (line: TalkListLine) =>
    before.some((t) => t.includes(` ${normalizeSpoken(line.en)} `));
  const sentenceSaid = (line: TalkListLine) =>
    sentencesOf(line).some((s) => saidBefore.has(s));
  const hasWord = (line: TalkListLine) =>
    (avoid.words ?? []).some((w) =>
      plainWordsOf(line.en).includes(w.toLowerCase()),
    );
  // (1) 어느 것에도 걸리지 않는 줄
  const clean = order.find(
    (l) => !echoes(l) && !usedWhole(l) && !sentenceSaid(l) && !hasWord(l),
  );
  if (clean) return clean;
  // [I-r3-1] (가) 문장은 앞에 나왔어도 통째로 쓴 적 없는 줄(대본 회차 r3 판정 I-r3-1 — 다 걸리면 이미 쓴 줄로 돌아가지 않게).
  // [fix3-M1] AI 맞장구가 남은 턴은 부르는 쪽이 꼬리만 보이므로(situationTailOf), 꼬리가 앞에 나온 줄은 고르지 않는다(fix 3 재검토 Minor)
  const tailFresh = (l: TalkListLine) => {
    if (!avoid.reacted) return true;
    const tail = situationTailOf(l, true);
    return !echoes(tail) && !sentenceSaid(tail);
  };
  const unused = order.find(
    (l) => !echoes(l) && !usedWhole(l) && !hasWord(l) && tailFresh(l),
  );
  if (unused) return unused;
  // [I-r3-1] (나) 이 턴에 AI 반응이 남았으면 넘김 꼬리만(꼬리가 앞에 나오지 않은 줄)
  if (avoid.reacted)
    for (const line of order) {
      const tail = situationTailOf(line, true);
      if (tail === line) continue;
      if (!echoes(tail) && !sentenceSaid(tail) && !hasWord(tail)) return tail;
    }
  // (다) 피할 낱말 없는 돌림 순서의 첫 줄, 그것도 없으면 돌림 차례 줄
  return order.find((l) => !hasWord(l)) ?? list[at] ?? null;
}

/**
 * 들리지 않음 차례의 판단 칸을 빈 값으로(spec 설계 1 응답 칸 행 · AC-1 (가) — '모름' 단추 차례와 같다): 막힘 · 아이 말 갈래 · 알맞은 응답 ·
 * 아이가 꺼낸 이야기 · 아이가 물음 · 아이가 보인 능력 · 스스로 쓴 단어 · 미션 체크 · 되풀이. 차례와 셈은 부르기 전에 정한 계획대로다.
 */
export function heardFieldsBlankOf(value: TalkLessonOutput): TalkLessonOutput {
  return {
    ...value,
    child_kind: "answer",
    stuck: false,
    response_fit: false,
    child_topic: false,
    child_asked: false,
    goal_suggest: [],
    self_used_words: [],
    mission_done: [],
    recast: "",
  };
}
