// 회화 턴 흘려 받기(6.2 끝 문단 · 6.4 실시간 출력 검사 · 8절 '회화 턴 실패' · C92 · C95, plan-p13a 파일별 값 2 · 정할 것 회8).
// SDK 의 text 조각(delta)을 차례로 이어 앞 칸 막힘 판단(stuck, C127)을 읽고 tori_en 문자열을 이스케이프까지 직접 풀고, 문장이 끝날
// 때마다 검사해 통과한(또는 바꾼) 문장만 내보낸다. 브라우저는 검사 전 글을 받지 않는다. 순수 모듈이다(시각 · DB · SDK 없음).
import { checkOutputFields } from "@/core/ai/output-check";
import {
  type ForbiddenList,
  isEnglishSentence,
  normalizeQuotes,
  sentenceWords,
  splitSentences,
  tokenize,
} from "@/core/seed/text";

// ── tori_en 풀기 ─────────────────────────────────────────────────

/** 토리 영어 말 속성 이름(6.2). */
export const TORI_EN_KEY = "tori_en";
/** tori_en 앞에 오는 막힘 판단 속성 이름(13절 C127 — 서버가 첫 문장 전에 안다). */
export const STUCK_KEY = "stuck";
/** stuck 앞에 오는 아이 말 갈래 속성 이름(13절 C204 (3) — 서버가 첫 문장 전에 막힘을 다시 본다). 값은 낱말 열거값(이스케이프 없음). */
export const CHILD_KIND_KEY = "child_kind";
const BOOLEAN_LITERALS = ["true", "false"] as const;
/** 흘려 받는 중 문장 끝을 가릴 때 글 끝에 붙여 보는 글자(공백이 아닌 아무 글자, 기술 값). */
const PROBE = "x";
/** \uXXXX 의 16진 자리 수(JSON 문법). */
const UNICODE_HEX_DIGITS = 4;
const HEX_RADIX = 16;
const JSON_WHITESPACE = /[ \t\n\r﻿]/;
const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

/** 말 칸 앞에 올 수 있는 칸 하나: 열거 글(낱말 글, 이스케이프 없음) · 참 거짓. */
export type ReaderHead = { key: string; kind: "enum" | "boolean" };

/**
 * 흘려 받는 말 칸과 그 앞 칸의 이름(회화 N 길 spec 설계 8 — 말 칸 이름과 앞 칸 이름을 매개로). 앞 칸은 적힌 차례로 한 번씩만 올 수 있고
 * (뒤 칸을 읽은 뒤 앞 칸이 오면 failed), requireHeads 면 앞 칸을 모두 읽은 뒤에만 말 칸을 흘린다(그 전에 말 칸이 오면 failed).
 */
export type ToriEnReaderKeys = {
  sayKey: string;
  heads: readonly ReaderHead[];
  requireHeads?: boolean;
};

/** 지금 길(A)의 칸 이름: child_kind(C204) · stuck(C127) 다음 tori_en, 앞 칸은 둘 다 없어도 된다. 매개 없는 읽개의 값이다. */
export const TORI_EN_READER_KEYS: ToriEnReaderKeys = {
  sayKey: TORI_EN_KEY,
  heads: [
    { key: CHILD_KIND_KEY, kind: "enum" },
    { key: STUCK_KEY, kind: "boolean" },
  ],
};

type ReaderPhase =
  | "start"
  | "before-key"
  | "key"
  | "after-head-key"
  | "before-head-value"
  | "enum-value"
  | "boolean-value"
  | "after-head-value"
  | "after-key"
  | "before-value"
  | "string"
  | "escape"
  | "unicode"
  | "closed"
  | "failed";

export type ToriEnReader = {
  /** 조각 하나를 넣고 이번에 새로 끝난 문장들을 돌려준다. 문자열이 닫히면 남은 마지막 문장도 함께. */
  push(delta: string): string[];
  /** 흐름이 끝났을 때 아직 내지 않은 문장. 문자열이 닫히지 않았으면(끊김) 끝나지 않은 조각은 내지 않는다. */
  finish(): string[];
  /** 앞 칸이 매개의 앞 칸 · 말 칸이 아니거나 JSON 꼴이 아니다 — 흘려 보내지 않고 끝까지 받아 한 번에 보낸다(위험 3). */
  failed(): boolean;
  /** 말 칸 앞 칸에서 읽은 막힘 판단(C127, 앞 칸 stuck). 그 칸이 없었거나 아직 오지 않았으면 undefined. */
  stuck(): boolean | undefined;
  /** 앞 칸에서 읽은 아이 말 갈래 글(C204, 앞 칸 child_kind). 그 칸이 없었거나 아직 오지 않았으면 undefined. */
  childKind(): string | undefined;
  /** 앞 칸 하나의 값. 그 칸이 없었거나 아직 오지 않았으면 undefined. */
  head(key: string): string | boolean | undefined;
  /** 지금까지 읽은 앞 칸 값(칸 이름 → 값). */
  heads(): Readonly<Record<string, string | boolean>>;
  /** 말 칸 문자열을 읽기 시작했다(이 뒤로 문장이 나올 수 있다). */
  sayStarted(): boolean;
  /** 말 칸 문자열이 닫혔다. */
  closed(): boolean;
  /** 지금까지 푼 말 칸 글. */
  text(): string;
};

/**
 * 말 칸(기본 tori_en) 흘려 풀기. 조각 경계에 걸친 이스케이프(\" \\ \/ \n \t \uXXXX)를 잇고, 문장 끝은 P4a `splitSentences` 규칙이다.
 * 흘려 받는 중에는 문장부호 뒤에 공백이 온 뒤에야 끝으로 본다 — 글 끝에 공백 아닌 글자를 붙여 잘라 보고 마지막 조각을 뺀다.
 * 이미 끝난 문장의 경계는 뒤 글이 붙어도 바뀌지 않으므로 낸 문장 수만 센다. 기본 앞 칸은 child_kind(낱말 글 한 번, C204) · stuck(참 · 거짓 한 번)
 * 다음 tori_en 이거나 tori_en 바로다(C127 — 모델이 칸 차례를 어겨 tori_en 이 먼저 와도 흘려 보내고 stuck 은 모른다). 그 밖의 앞 칸이면 failed.
 * 칸 이름은 매개로 바꾼다(회화 N 길: 말 칸 say · 앞 칸 reading · move, spec 설계 8).
 */
export function createToriEnReader(
  keys: ToriEnReaderKeys = TORI_EN_READER_KEYS,
): ToriEnReader {
  const { sayKey, heads } = keys;
  let phase: ReaderPhase = "start";
  let key = "";
  let literal = "";
  /** 지금 값을 읽는 앞 칸의 차례. */
  let headAt = -1;
  /** 마지막으로 읽은(읽는) 앞 칸의 차례 — 이보다 뒤 칸만 올 수 있다. */
  let lastHead = -1;
  const values: Record<string, string | boolean> = {};
  let enumText = "";
  let hex = "";
  let decoded = "";
  let emitted = 0;
  let sayStarted = false;

  /** 지금 올 수 있는 앞 칸들(차례 · 이름). */
  const openHeads = (): { at: number; key: string }[] =>
    heads.map((h, at) => ({ at, key: h.key })).filter((h) => h.at > lastHead);
  /** requireHeads 면 앞 칸 모두(마지막 칸만이 아니라)의 값을 읽었을 때만 말 칸이 열린다. 아니면 늘 열려 있다(지금 길). */
  const sayOpen = (): boolean =>
    !keys.requireHeads || heads.every((h) => Object.hasOwn(values, h.key));

  const complete = (): string[] => {
    const pieces =
      phase === "closed"
        ? splitSentences(decoded)
        : splitSentences(decoded + PROBE).slice(0, -1);
    const fresh = pieces.slice(emitted);
    emitted = pieces.length;
    return fresh;
  };

  const step = (ch: string): void => {
    switch (phase) {
      case "start":
        if (JSON_WHITESPACE.test(ch)) return;
        phase = ch === "{" ? "before-key" : "failed";
        return;
      case "before-key":
        if (JSON_WHITESPACE.test(ch)) return;
        key = "";
        phase = ch === '"' ? "key" : "failed";
        return;
      case "key": {
        if (ch === '"') {
          // 앞 칸은 적힌 차례로 한 번씩(뒤 칸 뒤에 앞 칸이 오지 않음) 다음 말 칸, 또는 말 칸 바로(requireHeads 가 아니면)
          const open = openHeads().find((h) => h.key === key);
          if (key === sayKey && sayOpen()) phase = "after-key";
          else if (open) {
            headAt = open.at;
            lastHead = open.at;
            phase = "after-head-key";
          } else phase = "failed";
          return;
        }
        key += ch;
        if (
          !(sayOpen() && sayKey.startsWith(key)) &&
          !openHeads().some((h) => h.key.startsWith(key))
        )
          phase = "failed";
        return;
      }
      case "after-head-key":
        if (JSON_WHITESPACE.test(ch)) return;
        phase = ch === ":" ? "before-head-value" : "failed";
        return;
      case "before-head-value":
        if (heads[headAt]?.kind === "boolean") {
          literal = "";
          phase = "boolean-value";
          step(ch);
          return;
        }
        if (JSON_WHITESPACE.test(ch)) return;
        enumText = "";
        phase = ch === '"' ? "enum-value" : "failed";
        return;
      case "enum-value":
        if (ch === '"') {
          values[heads[headAt]?.key ?? ""] = enumText;
          phase = "after-head-value";
        } else if (/[a-z_]/.test(ch)) enumText += ch;
        else phase = "failed";
        return;
      case "boolean-value": {
        if (literal === "" && JSON_WHITESPACE.test(ch)) return;
        literal += ch;
        const done = BOOLEAN_LITERALS.find((l) => l === literal);
        if (done) {
          values[heads[headAt]?.key ?? ""] = done === "true";
          phase = "after-head-value";
        } else if (!BOOLEAN_LITERALS.some((l) => l.startsWith(literal)))
          phase = "failed";
        return;
      }
      case "after-head-value":
        if (JSON_WHITESPACE.test(ch)) return;
        phase = ch === "," ? "before-key" : "failed";
        return;
      case "after-key":
        if (JSON_WHITESPACE.test(ch)) return;
        phase = ch === ":" ? "before-value" : "failed";
        return;
      case "before-value":
        if (JSON_WHITESPACE.test(ch)) return;
        if (ch === '"') {
          sayStarted = true;
          phase = "string";
        } else phase = "failed";
        return;
      case "string":
        if (ch === "\\") phase = "escape";
        else if (ch === '"') phase = "closed";
        else decoded += ch;
        return;
      case "escape": {
        if (ch === "u") {
          hex = "";
          phase = "unicode";
          return;
        }
        const plain = SIMPLE_ESCAPES[ch];
        if (plain === undefined) {
          phase = "failed";
          return;
        }
        decoded += plain;
        phase = "string";
        return;
      }
      case "unicode":
        hex += ch;
        if (!/^[0-9a-fA-F]*$/.test(hex)) {
          phase = "failed";
          return;
        }
        if (hex.length === UNICODE_HEX_DIGITS) {
          // 서로게이트 쌍은 두 이스케이프가 차례로 붙어 한 글자가 된다
          decoded += String.fromCharCode(Number.parseInt(hex, HEX_RADIX));
          phase = "string";
        }
        return;
      default:
        return;
    }
  };

  // step 이 phase 를 바꾸므로 좁힌 형을 믿지 않게 함수로 읽는다
  const stopped = (): boolean => phase === "failed" || phase === "closed";
  const isFailed = (): boolean => phase === "failed";
  const headValue = (name: string): string | boolean | undefined =>
    Object.hasOwn(values, name) ? values[name] : undefined;
  return {
    push(delta) {
      if (stopped()) return [];
      for (const ch of delta) {
        step(ch);
        if (stopped()) break;
      }
      if (isFailed()) return [];
      return complete();
    },
    finish() {
      if (phase !== "closed") return [];
      return complete();
    },
    failed: isFailed,
    stuck: () => {
      const v = headValue(STUCK_KEY);
      return typeof v === "boolean" ? v : undefined;
    },
    childKind: () => {
      const v = headValue(CHILD_KIND_KEY);
      return typeof v === "string" ? v : undefined;
    },
    head: headValue,
    heads: () => ({ ...values }),
    sayStarted: () => sayStarted,
    closed: () => phase === "closed",
    text: () => decoded,
  };
}

// ── 문장 검사 ────────────────────────────────────────────────────

export type ToriSentenceReason = "forbidden" | "contact" | "personal" | "meta";

export type ToriSentenceCheck =
  | { ok: true }
  | { ok: false; reason: ToriSentenceReason };

export type ToriSentenceOptions = {
  forbidden: ForbiddenList;
  /** 시드 meta-sentences.json 의 구(소문자). */
  metaPhrases: readonly string[];
};

/** 시드 금지 정규식 범주 → 걸린 갈래(seed/lists/forbidden.json 의 category). */
const CATEGORY_REASON: Readonly<Record<string, ToriSentenceReason>> = {
  contact: "contact",
  "personal-info": "personal",
};
/** 갈래를 고르는 차례(한 문장이 여럿에 걸리면 앞의 것). */
const REASON_ORDER: readonly ToriSentenceReason[] = [
  "forbidden",
  "personal",
  "contact",
];
/** 문장 끝 물음표 뒤에 올 수 있는 닫는 따옴표 · 괄호. */
const QUESTION_END = /\?["')\]}”’»]*$/;

function lowerWords(text: string): string[] {
  return tokenize(normalizeQuotes(text)).map((t) => t.text.toLowerCase());
}

function hasSequence(
  haystack: readonly string[],
  needle: readonly string[],
): boolean {
  if (needle.length === 0) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true;
  }
  return false;
}

/** 메타 문장(아이를 3인칭으로 가리키거나 토리의 할 일을 말함, 6.4): 시드 구가 낱말 단위로 들어 있다. */
function isMetaSentence(sentence: string, phrases: readonly string[]): boolean {
  const words = lowerWords(sentence);
  return phrases.some((phrase) => hasSequence(words, lowerWords(phrase)));
}

/** 물음표로 끝나는 문장(닫는 따옴표 · 괄호 뒤까지). */
export function isQuestionSentence(sentence: string): boolean {
  return QUESTION_END.test(sentence.trim());
}

/**
 * 토리 영어 문장 하나의 검사(6.4 회화 턴): 금지어 · 개인 정보 질문 패턴 · 연락처(P9b 출력 검사와 같은 함수) · 메타 문장.
 * 1~3단계 물음표 문장은 서버 턴 길이 잡아 둔다(회화 plan 정한 것 19 — 이 문은 지우지 않는다). 길이 상한은 막지 않는다(`isOverLength` 로 센다, 3.6 '길이 초과').
 */
export function checkToriSentence(
  sentence: string,
  options: ToriSentenceOptions,
): ToriSentenceCheck {
  const hits =
    checkOutputFields(
      [{ path: "s", lang: "en", text: sentence, checkLength: false }],
      {
        forbidden: options.forbidden,
        sentenceMaxWords: Number.MAX_SAFE_INTEGER,
      },
    ).get("s") ?? [];
  const reasons = new Set<ToriSentenceReason>();
  for (const hit of hits) {
    if (hit.kind !== "forbidden") continue;
    reasons.add(
      (hit.category ? CATEGORY_REASON[hit.category] : undefined) ?? "forbidden",
    );
  }
  const first = REASON_ORDER.find((reason) => reasons.has(reason));
  if (first) return { ok: false, reason: first };
  if (isMetaSentence(sentence, options.metaPhrases))
    return { ok: false, reason: "meta" };
  return { ok: true };
}

/** 영어 문장이 3.6 문장 길이 상한을 넘었다(talk_turns '길이 초과' 기록). */
export function isOverLength(sentence: string, maxWords: number): boolean {
  return isEnglishSentence(sentence) && sentenceWords(sentence) > maxWords;
}

/** 카드의 안전한 대사를 턴 번호로 돌려 고른다(같은 대사가 턴마다 되풀이되지 않게). */
export function safeLineOf(
  safeLines: readonly { en: string }[],
  turnNo: number,
): string {
  if (safeLines.length === 0) throw new RangeError("카드에 안전한 대사가 없다");
  const index =
    ((Math.trunc(turnNo) % safeLines.length) + safeLines.length) %
    safeLines.length;
  return safeLines[index]?.en ?? "";
}

export type ToriSentenceGate = {
  /** 문장 하나를 보고 내보낼 글(그대로 · 안전한 대사)이나 null(지움)을 돌려준다. */
  accept(sentence: string): string | null;
  /** 지금까지 내보낸 문장(다시 쓸 토리 차례의 재료). */
  sent(): string[];
  /** 걸린 갈래(걸린 차례). */
  blocked(): ToriSentenceReason[];
  /** 길이 상한을 넘은, 내보낸 원문 문장 수. */
  overLength(): number;
};

/**
 * 걸린 문장 바꾸기(정할 것 회8): forbidden · contact · personal · meta 는 한 턴에 처음 걸린 자리만 카드 안전한 대사로 바꾸고
 * 그 뒤 걸린 문장은 지운다(같은 대사 되풀이를 막음).
 */
export function createToriSentenceGate(
  options: ToriSentenceOptions & { safeLine: string; sentenceMaxWords: number },
): ToriSentenceGate {
  const sent: string[] = [];
  const blocked: ToriSentenceReason[] = [];
  let replaced = false;
  let over = 0;
  return {
    accept(sentence) {
      const check = checkToriSentence(sentence, options);
      if (check.ok) {
        if (isOverLength(sentence, options.sentenceMaxWords)) over += 1;
        sent.push(sentence);
        return sentence;
      }
      blocked.push(check.reason);
      if (replaced) return null;
      replaced = true;
      sent.push(options.safeLine);
      return options.safeLine;
    },
    sent: () => [...sent],
    blocked: () => [...blocked],
    overLength: () => over,
  };
}

// ── 시도 다음 할 일(8절 '회화 턴 실패' · 6.1 대체 모델 재시도, 정할 것 회8) ──

/** 시도 하나가 끝난 꼴. 실패 갈래는 부르는 쪽(P9a classifyFailure)이 고른다. */
export type TalkAttemptEnd =
  | "end_turn"
  | "refusal"
  | "max_tokens"
  | "timeout"
  | "connection"
  | "server"
  | "other";

export type TalkAttemptNext =
  | { next: "done" }
  | { next: "retry_same" }
  | { next: "retry_other_model" }
  | { next: "close_turn"; reason: Exclude<TalkAttemptEnd, "end_turn"> }
  | { next: "fail"; reason: Exclude<TalkAttemptEnd, "end_turn"> };

/**
 * 첫 문장 전 연결 오류 · 타임아웃이면 같은 입력으로 1회 다시. 첫 문장 뒤 끊김 · 타임아웃 · 거절 · max_tokens 면 보낸 문장을 두고
 * 그 턴을 닫는다. 거절은 같은 모델로 다시 부르지 않고, 서버 측 대체 모델 재시도가 없는 모델(Haiku 5.5)의 첫 문장 전 거절만
 * 다른 모델(Sonnet 5.5)로 1회.
 */
export function talkAttemptNext(input: {
  end: TalkAttemptEnd;
  firstSentenceSent: boolean;
  retriedSame: boolean;
  retriedOtherModel: boolean;
  canRetryOtherModelOnRefusal: boolean;
}): TalkAttemptNext {
  const { end } = input;
  if (end === "end_turn") return { next: "done" };
  if (input.firstSentenceSent) return { next: "close_turn", reason: end };
  if ((end === "connection" || end === "timeout") && !input.retriedSame)
    return { next: "retry_same" };
  if (
    end === "refusal" &&
    input.canRetryOtherModelOnRefusal &&
    !input.retriedOtherModel
  )
    return { next: "retry_other_model" };
  return { next: "fail", reason: end };
}
