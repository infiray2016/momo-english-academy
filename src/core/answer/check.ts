// 답 맞춤(plan-p10a 파일별 값 10 · 정할 것 차 · 카 · 13절 C73). 앱이 채점하는 갈래 모두를 DB 없는 순수 함수로 본다.
// 배치 평가(서버가 채점)가 먼저 쓰고 P11 세션 · P12 복습과 단계 평가가 그대로 쓴다. 1~3단계 쓰기 · 읽기 문제 ·
// 따라 말하기 일치율에는 AI 를 쓰지 않는다. 일치율 기준(placement.repeat_pass)은 부르는 쪽이 설정에서 읽어 넘긴다.
import type { READING_TEXT_QUESTION_TYPES } from "@/core/seed/structure";
import { bestMatchRate, type MatchOptions } from "@/core/speech/match-rate";

type ReadingType = "picture" | (typeof READING_TEXT_QUESTION_TYPES)[number];

/** 앱이 채점하는 문항(P4a 규격 형에서 채점에 쓰는 칸만 — 수업 · 평가 · 배치 공통). */
export type CheckItem =
  | { type: ReadingType | "pick-word" | "listening"; answerNo: number }
  | { type: "copy-tiles" | "build-tiles"; accepted: readonly string[] }
  | { type: "fill-letters"; pattern: string; accepted: readonly string[] }
  | {
      type: "assemble-phrase" | "assemble-sentence";
      accepted: readonly string[];
    }
  | {
      type: "dictation" | "fill-blank" | "fix-sentence";
      accepted: readonly string[];
    }
  | { type: "repeat"; sentence: string };

/** 답 입력 조각이 보내는 답(src/components/answer/*). */
export type Answer =
  /** 고른 보기 번호(1부터). */
  | { kind: "choice"; no: number }
  /** 놓은 글자 타일 · 낱말 카드(차례대로, 대문자 단추로 바꾼 첫 카드는 바뀐 글). fill-letters 는 빈 자리에 놓은 글자. */
  | { kind: "tiles"; pieces: readonly string[] }
  /** 쓴 글(받아쓰기 · 빈칸 채우기 · 문장 고치기). */
  | { kind: "text"; text: string }
  /** 따라 말하기 시도마다 인식된 글. */
  | { kind: "repeat"; heard: readonly string[] }
  /** 한 문항 인식이 두 시도를 합쳐 speech.max_retries 번 실패함(배치는 예비 문항으로, 3.2 · AC-5e). */
  | { kind: "repeat-failed" }
  | { kind: "dont-know" };

export type CheckOptions = {
  /** 따라 말하기 맞음 기준(placement.repeat_pass). 따라 말하기 문항에는 있어야 한다. */
  repeatPass?: number;
  /** 동음이의어 묶음(시드 lists/homophones.json). */
  homophones: MatchOptions["homophones"];
};

export type CheckResult = {
  correct: boolean;
  /** P11 이 '틀리면 정답을 보여 주고 다시'(3.3)에 쓴다. */
  detail: {
    /** 정답 글(고르기는 번호 글, 허용 정답이 여럿이면 첫째). */
    expected?: string;
    /** 견준 아이 답(이은 글 · 정규화한 글). */
    given?: string;
    /** 따라 말하기의 가장 높은 일치율. */
    rate?: number;
    reason?: "dont-know" | "wrong-shape" | "repeat-failed";
  };
};

/** 앞 카드에 붙는 문장 부호 카드(목업 B_W3_Order '마침표 카드'). */
const PUNCTUATION_CARD = /^[.,?!]$/;
/** 낱말 타일 빈 글자 자리(P4a fill-letters 무늬). */
const BLANK_LETTER = "_";
const SINGLE_QUOTES = /[‘’ʼ]/g;
const DOUBLE_QUOTES = /[“”]/g;
const SPACES = /\s+/g;
const SPACE_BEFORE_MARK = / ([.,?!])/g;

/** 낱말 카드를 빈칸 하나로 잇되 문장 부호 카드는 앞 카드에 붙인다. */
export function joinCards(cards: readonly string[]): string {
  let out = "";
  for (const card of cards) {
    if (out === "" || PUNCTUATION_CARD.test(card)) out += card;
    else out += ` ${card}`;
  }
  return out;
}

/**
 * 쓴 답 · 허용 정답의 정규화(정할 것 카 · C73): 굽은 따옴표를 곧은 따옴표로, 겹 빈칸을 하나로, 문장 부호 앞 빈칸을 지우고
 * 앞뒤 공백을 지운다. 대소문자 · 문장 부호 자체는 그대로 둔다.
 */
export function normalizeTyped(text: string): string {
  return text
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(SPACES, " ")
    .replace(SPACE_BEFORE_MARK, "$1")
    .trim();
}

/** 낱말 단위 답(빈칸 없는 답)인가 — 대소문자를 가리지 않는다(C73). */
function isWordUnit(accepted: string): boolean {
  return !accepted.includes(" ");
}

function typedMatches(given: string, accepted: string): boolean {
  const want = normalizeTyped(accepted);
  return isWordUnit(want)
    ? given.toLowerCase() === want.toLowerCase()
    : given === want;
}

/** fill-letters: 무늬의 빈 글자 자리에 놓은 글자를 차례로 채운 낱말(빈 자리 수와 다르면 undefined). */
function fillPattern(
  pattern: string,
  letters: readonly string[],
): string | undefined {
  const blanks = [...pattern].filter((c) => c === BLANK_LETTER).length;
  if (letters.length !== blanks) return undefined;
  let at = 0;
  return [...pattern]
    .map((c) => (c === BLANK_LETTER ? (letters[at++] ?? "") : c))
    .join("");
}

const WRONG_SHAPE: CheckResult = {
  correct: false,
  detail: { reason: "wrong-shape" },
};

/** 문항 하나의 답을 맞춘다. 몰라요는 모두 틀림이다(3.2). */
export function checkAnswer(
  item: CheckItem,
  answer: Answer,
  options: CheckOptions,
): CheckResult {
  const expected = expectedOf(item);
  if (answer.kind === "dont-know")
    return { correct: false, detail: { expected, reason: "dont-know" } };
  switch (item.type) {
    case "repeat": {
      if (options.repeatPass === undefined)
        throw new Error("따라 말하기 맞음 기준(placement.repeat_pass)이 없다");
      if (answer.kind === "repeat-failed")
        return {
          correct: false,
          detail: { expected, reason: "repeat-failed" },
        };
      if (answer.kind !== "repeat") return WRONG_SHAPE;
      const match: MatchOptions = {
        homophones: options.homophones,
        nameSlot: "any-word",
      };
      const rate = Math.max(
        0,
        ...answer.heard.map((heard) =>
          bestMatchRate([item.sentence], heard, match),
        ),
      );
      return {
        correct: rate >= options.repeatPass,
        detail: { expected, rate },
      };
    }
    case "copy-tiles":
    case "build-tiles":
    case "fill-letters":
    case "assemble-phrase":
    case "assemble-sentence": {
      if (answer.kind !== "tiles") return WRONG_SHAPE;
      const given =
        item.type === "fill-letters"
          ? fillPattern(item.pattern, answer.pieces)
          : item.type === "assemble-phrase" || item.type === "assemble-sentence"
            ? normalizeTyped(joinCards(answer.pieces))
            : answer.pieces.join("");
      if (given === undefined) return { correct: false, detail: { expected } };
      const correct = item.accepted.some((a) =>
        item.type === "assemble-phrase" || item.type === "assemble-sentence"
          ? normalizeTyped(a) === given
          : a === given,
      );
      return { correct, detail: { expected, given } };
    }
    case "dictation":
    case "fill-blank":
    case "fix-sentence": {
      if (answer.kind !== "text") return WRONG_SHAPE;
      const given = normalizeTyped(answer.text);
      return {
        correct: item.accepted.some((a) => typedMatches(given, a)),
        detail: { expected, given },
      };
    }
    default: {
      if (answer.kind !== "choice") return WRONG_SHAPE;
      return {
        correct: answer.no === item.answerNo,
        detail: { expected, given: String(answer.no) },
      };
    }
  }
}

function expectedOf(item: CheckItem): string {
  if ("answerNo" in item) return String(item.answerNo);
  if (item.type === "repeat") return item.sentence;
  return item.accepted[0] ?? "";
}
