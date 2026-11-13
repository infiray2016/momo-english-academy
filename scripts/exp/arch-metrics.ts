// 회화 구조 비교 실험(13절 C234 · task-exp-harness)의 수치 셈(순수 함수). 네트워크 · 파일을 쓰지 않는다.
// 문장 자르기 · 물음 문장 · 낱말 · 형태 · 범위 밖 낱말은 앱의 함수(src/core)를 그대로 쓴다.
import {
  LEAD_CANDIDATE_CATEGORIES,
  type LeadCandidateCategory,
  type LeadCandidateLex,
  type LeadCandidateRow,
  leadCandidateTableOf,
} from "../../src/core/conversation/lead-candidate";
import { leadModelOf } from "../../src/core/conversation/lead-record";
import {
  CLOSED_CLASS_PASS_WORDS,
  type LowLevelLineOptions,
  type OffbandExtra,
  offbandWordsIn,
  questionKeyOf,
} from "../../src/core/conversation/question-check";
import { metWordsIn } from "../../src/core/conversation/said";
import {
  MORE_PROMPT,
  normalizeSpoken,
} from "../../src/core/conversation/spoken";
import {
  createToriEnReader,
  isQuestionSentence,
  TORI_EN_KEY,
} from "../../src/core/conversation/stream";
import {
  formsIn,
  isEnglishSentence,
  sentenceWords,
  splitSentences,
  tokenize,
} from "../../src/core/seed/text";
import { isQArm } from "./arch-arm-q";
import { CHILD_NAME_FILL } from "./arch-arms";
import type {
  ChildTurnLog,
  LessonEnding,
  LessonLog,
  TeacherTurnLog,
  WrapChoice,
} from "./arch-compare";

/** 글의 영어 낱말 수(앱 tokenize 의 낱말 토큰). */
export function wordCount(text: string): number {
  return tokenize(text).filter((t) => t.kind === "word").length;
}

/** 글의 물음 문장(앱 splitSentences · isQuestionSentence). */
export function questionsIn(text: string): string[] {
  return splitSentences(text).filter((s) => isQuestionSentence(s));
}

export type QuestionStats = {
  turns: number;
  questionTurnRatio: number | null;
  questionsPerTurn: number | null;
  multiQuestionRatio: number | null;
  longestQuestionRun: number;
  noQuestionRatio: number | null;
};

const ratio = (n: number, d: number) => (d === 0 ? null : n / d);

/** (가) 선생님 차례(최종 말) 목록의 질문 수치. */
export function questionStatsOf(turns: readonly string[]): QuestionStats {
  const counts = turns.map((t) => questionsIn(t).length);
  let run = 0;
  let longest = 0;
  for (const n of counts) {
    run = n > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const withQ = counts.filter((n) => n > 0).length;
  return {
    turns: counts.length,
    questionTurnRatio: ratio(withQ, counts.length),
    questionsPerTurn: ratio(
      counts.reduce((a, b) => a + b, 0),
      counts.length,
    ),
    multiQuestionRatio: ratio(
      counts.filter((n) => n >= 2).length,
      counts.length,
    ),
    longestQuestionRun: longest,
    noQuestionRatio: ratio(counts.length - withQ, counts.length),
  };
}

/** 낱말 겹침(Jaccard — 소문자 낱말 집합). 둘 다 비면 0. */
export function jaccard(a: string, b: string): number {
  const set = (t: string) =>
    new Set(
      tokenize(t)
        .filter((x) => x.kind === "word")
        .map((x) => x.text.toLowerCase()),
    );
  const sa = set(a);
  const sb = set(b);
  if (sa.size === 0 && sb.size === 0) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
}

export const SIMILAR_JACCARD = 0.6;

export type AskedQuestion = { turn: number; text: string };
export type SameQuestions = {
  /** 앞의 질문과 글자가 같은(questionKeyOf 꼴) 질문 수. */
  exact: number;
  exactList: { turn: number; text: string; firstTurn: number }[];
  /** 낱말 겹침 0.6 이상인 쌍(글자가 같은 쌍 포함). */
  similar: { a: AskedQuestion; b: AskedQuestion; jaccard: number }[];
};

/** (다) 한 수업 안의 같은 질문 후보. */
export function sameQuestionsOf(
  questions: readonly AskedQuestion[],
): SameQuestions {
  const firstOf = new Map<string, number>();
  const exactList: SameQuestions["exactList"] = [];
  const similar: SameQuestions["similar"] = [];
  questions.forEach((q, i) => {
    const key = questionKeyOf(q.text);
    const first = firstOf.get(key);
    if (first !== undefined)
      exactList.push({ turn: q.turn, text: q.text, firstTurn: first });
    else firstOf.set(key, q.turn);
    for (let j = 0; j < i; j++) {
      const p = questions[j] as AskedQuestion;
      const s = jaccard(p.text, q.text);
      if (s >= SIMILAR_JACCARD)
        similar.push({ a: p, b: q, jaccard: Math.round(s * 1000) / 1000 });
    }
  });
  return { exact: exactList.length, exactList, similar };
}

/**
 * AC-11 '같은 글자 질문 0(마무리 상수는 셈 밖)'의 셈(검토 rev-x2 M-2): 앱이 붙이는 마무리 상수 물음(MORE_PROMPT.en — 앱 상수라 같은 글자가
 * 되풀이되는 것이 정상)을 빼고 같은 질문을 센다. 뺀 물음의 수는 closingConstant 로 따로 적는다. 옛 셈(sameQuestionsOf)은 그대로 둔다.
 */
export function sameQuestionsBesideClosingOf(
  questions: readonly AskedQuestion[],
): SameQuestions & { closingConstant: number } {
  const closingKey = questionKeyOf(MORE_PROMPT.en);
  const rest = questions.filter((q) => questionKeyOf(q.text) !== closingKey);
  return {
    ...sameQuestionsOf(rest),
    closingConstant: questions.length - rest.length,
  };
}

/** 가장 가까운 순위 백분위(빈 목록 null). */
export function percentile(
  values: readonly number[],
  p: number,
): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))] ?? null;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] ?? null)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/** 견줌용 글 꼴(공백 · 줄바꿈 하나로, 앞뒤 공백 없이). */
export function flat(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** 모델이 처음 쓴 말과 최종 말의 문장 차이(정규화한 문장 — 지운 문장 · 더한 문장). */
export function sentenceDiffOf(
  model: readonly string[],
  final: string,
): { deleted: string[]; added: string[] } {
  const norm = (s: string) => normalizeSpoken(s);
  const modelSentences = model.flatMap((t) => splitSentences(t));
  const finalSentences = splitSentences(final);
  const finalSet = new Set(finalSentences.map(norm));
  const modelSet = new Set(modelSentences.map(norm));
  return {
    deleted: modelSentences.filter((s) => !finalSet.has(norm(s))),
    added: finalSentences.filter((s) => !modelSet.has(norm(s))),
  };
}

export type LevelFit = {
  sentences: number;
  /** 문장 수가 상한(talk.teacher_sentences_max.<구간>)을 넘었는가. */
  overSentenceMax: boolean;
  /** 낱말 수가 단계 상한(level_specs sentenceMaxWords)을 넘은 영어 문장. */
  longSentences: string[];
  /** 범위 밖 낱말(앱 offbandWordsIn — 범위 밖이 닫힌 품사 한 낱말뿐인 문장은 뺀다). */
  offbandWords: string[];
  /** 그 단계 · 단원에 아직 쓸 수 없는 형태 id(앱 formsIn). */
  offbandForms: string[];
};

/** (사) 단계에 맞는 말: 앱의 기존 검사(문장 수 · 문장 길이 · 범위 밖 낱말 · 범위 밖 형태)를 기록 전용으로. */
export function levelFitOf(
  text: string,
  options: LowLevelLineOptions,
  sentenceMax: number,
  extra: OffbandExtra = {},
): LevelFit {
  const sentences = splitSentences(text).filter((s) => isEnglishSentence(s));
  const offband: string[] = [];
  const forms: string[] = [];
  for (const s of sentences) {
    const off = offbandWordsIn(s, options, extra);
    const closedOnly =
      off.length === 1 && CLOSED_CLASS_PASS_WORDS.has(off[0] ?? "");
    if (!closedOnly)
      for (const w of off) if (!offband.includes(w)) offband.push(w);
    for (const id of formsIn(s, options.forms))
      if (!options.allowedForms.has(id) && !forms.includes(id)) forms.push(id);
  }
  return {
    sentences: sentences.length,
    overSentenceMax: sentences.length > sentenceMax,
    longSentences: sentences.filter(
      (s) => sentenceWords(s) > options.sentenceMaxWords,
    ),
    offbandWords: offband,
    offbandForms: forms,
  };
}

// ── 첫 문장 시각(흘려 받기 — spec '회화 Claude 주도' 설계 9 · AC-26k) ─────────

/** 아이에게 나갈 말이 든 응답 칸: 방식 A(앱 출력 꼴)는 tori_en, 방식 P 는 say. */
export type SpeechField = typeof TORI_EN_KEY | "say";

/** 흘려 받는 중 문장 끝을 가르는 덧글자(앱 createToriEnReader 와 같은 규칙 — 문장부호 뒤에 공백이 와야 끝으로 본다). */
const SENTENCE_PROBE = "x";
const JSON_SPACE = /[ \t\n\r﻿]/;
/** 끝나지 않은 글 끝의 이스케이프 조각(\ · \u12)을 떼어 볼 최대 글자 수. */
const PARTIAL_ESCAPE_MAX = 6;

function stringEndOf(buffer: string, from: number): number {
  let j = from;
  while (j < buffer.length) {
    const c = buffer[j];
    if (c === "\\") j += 2;
    else if (c === '"') return j;
    else j += 1;
  }
  return -1;
}

function decodeJsonString(raw: string, closed: boolean): string | null {
  const tries = closed ? 1 : PARTIAL_ESCAPE_MAX + 1;
  for (let cut = 0; cut < tries && cut <= raw.length; cut++) {
    try {
      return JSON.parse(`"${raw.slice(0, raw.length - cut)}"`) as string;
    } catch {
      // 끝나지 않은 이스케이프 — 한 글자 떼고 다시
    }
  }
  return null;
}

/**
 * 흘려 받은 JSON 글(앞부분)에서 맨 바깥 객체의 글 칸 하나를 푼다. 칸이 아직 오지 않았거나 글 칸이 아니면 null, 글이 끝나지 않았으면
 * 받은 데까지(closed false). 칸 차례는 따지지 않는다(앞에 어떤 칸이 와도 읽는다).
 */
export function jsonStringFieldOf(
  buffer: string,
  field: string,
): { text: string; closed: boolean } | null {
  let depth = 0;
  let i = 0;
  const n = buffer.length;
  const skipSpace = (from: number) => {
    let k = from;
    while (k < n && JSON_SPACE.test(buffer[k] ?? "")) k += 1;
    return k;
  };
  while (i < n) {
    const ch = buffer[i];
    if (ch === '"') {
      const end = stringEndOf(buffer, i + 1);
      if (end < 0) return null;
      const colon = skipSpace(end + 1);
      if (depth === 1 && colon < n && buffer[colon] === ":") {
        if (decodeJsonString(buffer.slice(i + 1, end), true) === field) {
          const v = skipSpace(colon + 1);
          if (v >= n || buffer[v] !== '"') return null;
          const vend = stringEndOf(buffer, v + 1);
          const closed = vend >= 0;
          const text = decodeJsonString(
            buffer.slice(v + 1, closed ? vend : n),
            closed,
          );
          return text === null ? null : { text, closed };
        }
        i = colon + 1;
        continue;
      }
      i = end + 1;
      continue;
    }
    if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") depth -= 1;
    i += 1;
  }
  return null;
}

export type SpeechReader = {
  /** 조각 하나를 넣고 이번에 새로 끝난 문장들을 돌려준다. */
  push(delta: string): string[];
};

/**
 * 말 칸 흘려 읽개. tori_en 은 앱의 읽개(createToriEnReader — 앞 칸이 child_kind · stuck 일 때만 흘리고, 칸 차례를 어기면 끝까지
 * 받아 한 번에 낸다)를 그대로 쓰고, 그 밖의 칸(P 의 say)은 칸 이름으로 찾아 같은 문장 끝 규칙으로 흘린다.
 */
export function createSpeechReader(field: SpeechField): SpeechReader {
  if (field === TORI_EN_KEY) {
    const app = createToriEnReader();
    return { push: (delta) => app.push(delta) };
  }
  let buffer = "";
  let emitted = 0;
  return {
    push(delta) {
      buffer += delta;
      const found = jsonStringFieldOf(buffer, field);
      if (!found) return [];
      const pieces = found.closed
        ? splitSentences(found.text)
        : splitSentences(found.text + SENTENCE_PROBE).slice(0, -1);
      const fresh = pieces.slice(emitted);
      emitted = Math.max(emitted, pieces.length);
      return fresh;
    },
  };
}

/** 선생님 호출 하나의 첫 문장(아이에게 나갈 말 칸의 첫 문장이 끝난 때). */
export type FirstSentence = {
  /** 요청을 보낸 때부터 첫 문장이 끝난 때까지(ms). 흘려 읽지 못했으면 호출이 끝난 때(앱도 그때 한 번에 낸다). */
  ms: number;
  /** stream: 흘려 받는 중에 잡음 · end: 호출이 끝난 뒤(읽개가 칸 차례를 어긴 응답 · 말 칸이 빔). */
  from: "stream" | "end";
  text: string | null;
  /** 첫 문장이 물음 문장이다(1~3단계 앱은 물음 문장을 잡아 둔다 — 받아 둔 차례를 가를 재료). */
  question: boolean;
};

/** 다 받은 응답 글에서 말 칸의 첫 문장(칸 차례는 따지지 않음). */
export function firstSentenceOfText(
  field: SpeechField,
  text: string,
): string | null {
  const found = jsonStringFieldOf(text, field);
  if (!found) return null;
  return splitSentences(found.text)[0] ?? null;
}

/** 흘려 받는 호출 하나의 첫 문장 시계. 만들 때가 요청을 보낸 때이고, 조각마다 text 를, 호출이 끝나면 done 을 부른다. */
export function createFirstSentenceClock(
  field: SpeechField,
  now: () => number,
): {
  text(delta: string): void;
  done(endMs: number, fullText: string): FirstSentence;
} {
  const started = now();
  const reader = createSpeechReader(field);
  let first: { ms: number; text: string } | null = null;
  return {
    text(delta) {
      if (first) return;
      const sentence = reader.push(delta)[0];
      if (sentence !== undefined)
        first = { ms: now() - started, text: sentence };
    },
    done(endMs, fullText) {
      if (first)
        return {
          ms: first.ms,
          from: "stream",
          text: first.text,
          question: isQuestionSentence(first.text),
        };
      const text = firstSentenceOfText(field, fullText);
      return {
        ms: endMs,
        from: "end",
        text,
        question: text !== null && isQuestionSentence(text),
      };
    },
  };
}

/** 첫 문장 시간 수치(전부 · 첫 문장이 물음이 아닌 차례 · 흘려 읽지 못한 차례 수). */
export function firstSentenceStatsOf(items: readonly FirstSentence[]): {
  turns: number;
  msMedian: number | null;
  msP95: number | null;
  plainTurns: number;
  plainMsMedian: number | null;
  plainMsP95: number | null;
  fromEnd: number;
} {
  const all = items.map((f) => f.ms);
  const plain = items.filter((f) => !f.question).map((f) => f.ms);
  return {
    turns: items.length,
    msMedian: median(all),
    msP95: percentile(all, 95),
    plainTurns: plain.length,
    plainMsMedian: median(plain),
    plainMsP95: percentile(plain, 95),
    fromEnd: items.filter((f) => f.from === "end").length,
  };
}

/**
 * 아이에게 첫 문장이 실제로 나간 때(A · P · N 같은 뜻, 묶음 X2 — 검토 rev-x1 M5 · rev-s1 M-2): 요청을 보낸 때부터 앱이 첫 문장을 아이에게 내보낸
 * 때까지(ms). 앱이 문장을 응답 끝까지 받아 두지 않은 차례는 첫 호출을 흘려 받으며 말 칸의 첫 문장이 끝난 때(FirstSentence 그대로 — P 는 늘 이
 * 꼴), 받아 둔 차례(held)는 받아 둔 응답이 끝난 때(본 호출의 끝 + 그 차례의 다시 쓰기 · 다시 말하기 호출 시간)다. 받아 둔 차례: A 는 1~3단계 첫
 * 문장이 물음(question) · 막힘을 무른 질문 차례의 통째 다시 쓰기(rewrite), N 은 1~3단계 model_repeat 의 말 칸 전체(say) · 첫 문장부터 붙잡은
 * 물음(question — 좁은 정의 · 막힌 뒤 고르기). 대화 첫 질문을 쓰는 N 의 입구 차례(start)와 고르기 뒤 이음(afterChoice)은 아이 차례 뒤가 아니라
 * 셈에 넣지 않는다(A 의 그 자리는 호출이 없는 앱 줄이다).
 */
export type FirstSent = {
  ms: number;
  from: "stream" | "end";
  text: string | null;
  held: "say" | "question" | "rewrite" | null;
};

/**
 * 첫 문장이 나간 때 수치: 받아 두지 않은 차례의 중앙값 · p95(AC-11 '반드시' 행) · 받아 둔 차례의 수와 시간(AC-11 '판단' 행) · 받아 둔 차례까지
 * 합친 중앙값 · p95(참고 — 두 방식의 차례 구성이 달라 '반드시' 행만으로는 안 보이는 것, 검토 rev-x2 M-5).
 */
export function firstSentStatsOf(items: readonly FirstSent[]): {
  turns: number;
  allMsMedian: number | null;
  allMsP95: number | null;
  plainTurns: number;
  plainMsMedian: number | null;
  plainMsP95: number | null;
  heldTurns: number;
  heldBy: Record<"say" | "question" | "rewrite", number>;
  heldMsMedian: number | null;
  heldMsP95: number | null;
  fromEnd: number;
} {
  const plain = items.filter((f) => f.held === null).map((f) => f.ms);
  const held = items.filter((f) => f.held !== null);
  const heldMs = held.map((f) => f.ms);
  const all = items.map((f) => f.ms);
  return {
    turns: items.length,
    allMsMedian: median(all),
    allMsP95: percentile(all, 95),
    plainTurns: plain.length,
    plainMsMedian: median(plain),
    plainMsP95: percentile(plain, 95),
    heldTurns: held.length,
    heldBy: {
      say: held.filter((f) => f.held === "say").length,
      question: held.filter((f) => f.held === "question").length,
      rewrite: held.filter((f) => f.held === "rewrite").length,
    },
    heldMsMedian: median(heldMs),
    heldMsP95: percentile(heldMs, 95),
    fromEnd: items.filter((f) => f.held === null && f.from === "end").length,
  };
}

// ── 세 방식을 같은 규칙으로 센 '말했다' 수(검토 rev-x2 I-2 · 미결 7) ─────────────

/**
 * 선생님 차례의 따라 할 문장 후보(기록에 남은 칸만 읽는다): A 는 앱이 낸 소리 줄(checks.sound.model), P 는 응답의 model_sentence, N 은 새 엔진
 * 기록의 소리 줄(lead.sound.model), Q · QP 는 응답의 listen_sentence(task-x3). N 의 새 엔진 기록이 없는 차례(지금 길로 도는 인사 토막)는 A 와 같은 칸(checks.sound.model)으로 물러선다
 * (검토 rev-x2-2 N-1). 없거나 빈 글이면 null. 아이가 실제로 들었는지는 heardFollowSentenceOf 가 본다.
 */
export function followSentenceOf(t: TeacherTurnLog): string | null {
  const text =
    t.arm === "N" && t.lead !== undefined
      ? t.lead.sound.model
      : t.arm === "P"
        ? (t.modelFirst as { model_sentence?: unknown } | null)?.model_sentence
        : isQArm(t.arm)
          ? (t.modelFirst as { listen_sentence?: unknown } | null)
              ?.listen_sentence
          : (t.checks as { sound?: { model?: unknown } } | null)?.sound?.model;
  return typeof text === "string" && text.trim() !== "" ? text.trim() : null;
}

/**
 * 아이가 실제로 들은 따라 할 문장(검토 rev-x2-2 N-1 — spec 설계 5 '확인된 따라 할 문장'): followSentenceOf 의 문장이 아이가 들은 선생님 말
 * (child_turn.heardTeacher)에 글자 그대로 들 때만 그 문장, 아니면 null. 대조는 새 엔진이 기록하는 core leadModelOf 의 inSay(정규화한 글에
 * 낱말 경계로 듦) 그대로다. 들은 말은 {NAME} 을 지어낸 부름말로 채운 글이므로 문장도 같게 채워 본다. 세 방식에 같게 건다.
 */
export function heardFollowSentenceOf(
  t: TeacherTurnLog,
  heardTeacher: string,
): string | null {
  const sentence = followSentenceOf(t);
  if (sentence === null) return null;
  const { inSay } = leadModelOf({
    move: "model_repeat",
    modelSentence: sentence.replaceAll("{NAME}", CHILD_NAME_FILL),
    say: heardTeacher,
  });
  return inSay === true ? sentence : null;
}

/** 아이 차례 n 바로 앞에 아이가 들은 선생님 차례(고르기 뒤 이음이 있으면 그것, 아니면 앞 아이 차례 뒤 선생님 차례). */
function teacherBeforeOf(
  teachers: readonly TeacherTurnLog[],
  childTurn: number,
): TeacherTurnLog | undefined {
  return (
    teachers.find((t) => t.childTurn === childTurn && t.afterChoice === true) ??
    teachers.find(
      (t) => t.childTurn === childTurn - 1 && t.afterChoice !== true,
    )
  );
}

export type SaidCounts = {
  /** 말로 들린 아이 차례 수. */
  turns: number;
  /** (1) 들린 글에 든 단원 단어(원형 · 서로 다른 낱말, 처음 나온 차례대로). */
  heardUnit: string[];
  /** (2) 그 가운데 바로 앞 선생님 말과 따라 할 문장에 없던 차례가 한 번이라도 있는 낱말. */
  beyondTeacher: string[];
  /** (3) core leadCandidateTableOf 의 셋째 값(후보 없이 들린 글만으로 매긴 갈래, 차례 × 낱말). */
  heardByCategory: Record<LeadCandidateCategory, number>;
  /** 셋째 값이 독립 수행으로 본 낱말(낱말 행의 heard). */
  heardAccepted: string[];
};

/**
 * 한 수업의 '말했다' 수를 세 방식에 같은 규칙으로 센다(검토 rev-x2 I-2). 입력은 기록에 있는 들린 글(child_turn.heard) · 아이가 들은 바로 앞
 * 선생님 말(child_turn.heardTeacher) · 그 말에 든 따라 할 문장(heardFollowSentenceOf — rev-x2-2 N-1) · 단원 단어뿐이다. 새 판정 규칙을 만들지 않는다: (1) · (2) 는 지금
 * '만났다'와 같은 대조(metWordsIn)이고, (3) 은 core leadCandidateTableOf 에 같은 꼴의 행(Claude 후보 · 저장된 판정 · 힌트 · 막힘 · 읽기 칸
 * 없음)을 넣은 셋째 값이다. 그래서 차례 조건(힌트 종류 · 막힘 · 되물음 · 한국어 도움)은 세 방식 모두 적용하지 않은 것으로 같게 놓이고, 값은
 * 각 엔진의 지금 판정보다 넉넉하다(rev-x2-2 N-2).
 */
export function saidCountsOf(
  lesson: {
    teachers: readonly TeacherTurnLog[];
    children: readonly ChildTurnLog[];
  },
  lex: LeadCandidateLex,
): SaidCounts {
  const heardUnit: string[] = [];
  const beyond: string[] = [];
  const rows: LeadCandidateRow[] = [];
  let turns = 0;
  for (const c of lesson.children) {
    if (c.action !== "speak" || c.heard === null) continue;
    turns++;
    const before = teacherBeforeOf(lesson.teachers, c.childTurn);
    const model = before ? heardFollowSentenceOf(before, c.heardTeacher) : null;
    rows.push(
      {
        role: "teacher",
        say: c.heardTeacher,
        move: null,
        model,
        choices: false,
        koShown: false,
      },
      {
        role: "child",
        heard: c.heard,
        saidWords: [],
        claudeWords: [],
        hintKind: "none",
        stuck: false,
        koHelp: false,
        meaningHint: false,
        reading: null,
      },
    );
    const given = new Set([
      ...metWordsIn(c.heardTeacher, lex),
      ...(model ? metWordsIn(model, lex) : []),
    ]);
    for (const w of metWordsIn(c.heard, lex)) {
      if (!heardUnit.includes(w)) heardUnit.push(w);
      if (!given.has(w) && !beyond.includes(w)) beyond.push(w);
    }
  }
  const table = leadCandidateTableOf(rows, lex);
  return {
    turns,
    heardUnit,
    beyondTeacher: heardUnit.filter((w) => beyond.includes(w)),
    heardByCategory: { ...table.counts.heardByCategory },
    heardAccepted: table.words.filter((w) => w.heard).map((w) => w.word),
  };
}

/** 갈래 이름 차례(표 머리 · 셈). */
export const SAID_CATEGORIES = LEAD_CANDIDATE_CATEGORIES;

// ── 가려 읽는 판정 모음(지난 실험의 모음 스크립트 judge-agg.py 를 옮김) ─────────

/** 파이썬 round(x, n) 과 같은 반올림(이진 값 그대로의 십진 전개에서, 딱 가운데면 짝수 쪽). */
export function pyRound(x: number, digits: number): number {
  if (!Number.isFinite(x)) return x;
  const exact = Math.abs(x).toFixed(100);
  const [intPart = "0", frac = ""] = exact.split(".");
  const kept = `${intPart}${frac.slice(0, digits)}`;
  const next = frac.charAt(digits);
  const rest = frac.slice(digits + 1);
  const lastOdd = Number(kept.slice(-1)) % 2 === 1;
  let scaled = BigInt(kept);
  if (next > "5" || (next === "5" && (/[1-9]/.test(rest) || lastOdd)))
    scaled += BigInt(1);
  const s = scaled.toString().padStart(digits + 1, "0");
  const v = Number(
    digits === 0 ? s : `${s.slice(0, -digits)}.${s.slice(-digits)}`,
  );
  return x < 0 ? -v : v;
}

type Maybe<T> = T | null | undefined;

export type JudgeTurn = {
  n: number;
  link?: Maybe<number>;
  uptake?: Maybe<number>;
  misread?: Maybe<boolean>;
  repeat?: Maybe<boolean>;
  repeat_of?: Maybe<number>;
  q_count?: Maybe<number>;
  pushy?: Maybe<boolean>;
  made_up?: Maybe<boolean>;
  /** 채점표 판 2: 선생님이 사람의 삶(나이 · 가족 · 집 · 학교)을 제 것으로 말함. */
  own_life?: Maybe<boolean>;
  /** 채점표 판 2: 일과(먹다 · 가다 꼴)를 제 것으로 말한 문장. */
  own_routine?: Maybe<string[]>;
  help?: Maybe<number>;
  follow?: Maybe<number>;
  level?: Maybe<number>;
  note?: Maybe<string>;
};

export type JudgeLesson = {
  id: string;
  turns: JudgeTurn[];
  feel?: Maybe<number>;
  memory?: Maybe<string>;
  memory_turns?: Maybe<number[]>;
  teaching?: Maybe<number>;
  child_room?: Maybe<number>;
};

export type JudgeFile = { lessons: JudgeLesson[] };

/** blind-key.json 의 값(수업 이름 글, 또는 lesson · name 칸을 가진 객체). */
export type BlindKey = Record<string, unknown>;

function lessonNameOf(value: unknown): string {
  if (typeof value === "string") return value;
  const o = (value ?? {}) as { lesson?: unknown; name?: unknown };
  const v = o.lesson || o.name;
  return typeof v === "string" ? v : JSON.stringify(value);
}

function present<T>(xs: readonly Maybe<T>[]): T[] {
  return xs.filter((x): x is T => x !== null && x !== undefined);
}

function meanOf(xs: readonly Maybe<number>[]): number | null {
  const v = present(xs);
  return v.length === 0
    ? null
    : pyRound(v.reduce((a, b) => a + b, 0) / v.length, 2);
}

function rateOf(xs: readonly Maybe<boolean>[]): number | null {
  const v = present(xs);
  return v.length === 0
    ? null
    : pyRound((100 * v.filter((x) => x).length) / v.length, 1);
}

const JUDGE_NUM_FIELDS = [
  "link",
  "uptake",
  "level",
  "help",
  "follow",
  "q_count",
] as const;
const JUDGE_FLAG_FIELDS = [
  "misread",
  "repeat",
  "pushy",
  "made_up",
  "own_life",
] as const;
const JUDGE_LESSON_FIELDS = ["feel", "teaching", "child_room"] as const;
/** 일과 예문을 방식마다 몇 개까지 적는가. */
const ROUTINE_EXAMPLES_MAX = 5;

export type JudgeArmRow = {
  turns: number;
  link: number | null;
  uptake: number | null;
  level: number | null;
  "misread%": number | null;
  "repeat%": number | null;
  "pushy%": number | null;
  "made_up%": number | null;
  help: number | null;
  help_n: number;
  follow: number | null;
  follow_n: number;
  "q/turn": number | null;
  feel: number | null;
  teaching: number | null;
  child_room: number | null;
  memory: Record<string, number>;
  feel_by_child: Record<string, number | null>;
  /** 채점표 판 2 의 셈(옛 판정 파일이면 0 · null). */
  made_up_n: number;
  "own_life%": number | null;
  own_life_n: number;
  own_routine_n: number;
  own_routine_examples: { id: string; n: number; text: string }[];
};

export type JudgeTurnRef = { id: string; n: number };

export type JudgePair = {
  a: string;
  b: string;
  /** 수업마다 '대화하는 느낌'의 두 판정자 차이(지난 스크립트가 찍던 줄). */
  feel: {
    lessons: number;
    meanDiff: number | null;
    same: number;
    withinOne: number;
    corr: number | null;
  };
  /** 방식마다 두 판정자가 함께 표시한 차례(AC-11 '둘이 함께 표시한 차례 0'). */
  both: Record<string, { made_up: JudgeTurnRef[]; own_life: JudgeTurnRef[] }>;
  lessons: { id: string; name: string; a: number | null; b: number | null }[];
};

export type JudgeSummary = {
  arms: string[];
  judges: Record<string, Record<string, JudgeArmRow>>;
  pair: JudgePair | null;
};

/** 피어슨 상관(statistics.correlation 과 같은 뜻). 값이 비거나 한쪽이 한 값뿐이면 null. */
export function pearson(
  xs: readonly Maybe<number>[],
  ys: readonly Maybe<number>[],
): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  if (xs.some((x) => x == null) || ys.some((y) => y == null)) return null;
  const a = xs as number[];
  const b = ys as number[];
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < a.length; i++) {
    const da = (a[i] as number) - ma;
    const db = (b[i] as number) - mb;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }
  return saa === 0 || sbb === 0 ? null : sab / Math.sqrt(saa * sbb);
}

/**
 * 가려 읽는 판정 결과를 방식별로 모은다(지난 실험의 judge-agg.py 와 같은 셈 · 같은 반올림, 방식 목록만 key 에 나온 방식으로).
 * 채점표 판 2 의 칸(own_life · own_routine)과 두 판정자가 함께 표시한 차례를 더한다.
 */
export function judgeSummaryOf(
  key: BlindKey,
  judges: Readonly<Record<string, JudgeFile>>,
  armOrder: readonly string[],
): JudgeSummary {
  const map = (
    key.map && typeof key.map === "object" ? key.map : key
  ) as BlindKey;
  const nameOf = (id: string) => lessonNameOf(map[id]);
  const armOf = (id: string) => nameOf(id).split("-")[0] ?? "";
  const seen = Object.keys(map).map(armOf);
  const arms = [
    ...armOrder.filter((a) => seen.includes(a)),
    ...seen.filter((a, i) => !armOrder.includes(a) && seen.indexOf(a) === i),
  ];
  const out: Record<string, Record<string, JudgeArmRow>> = {};
  const feelOf: Record<string, Map<string, Maybe<number>>> = {};
  const flagsOf: Record<string, Map<string, JudgeTurn>> = {};
  for (const [judge, data] of Object.entries(judges)) {
    feelOf[judge] = new Map();
    flagsOf[judge] = new Map();
    const acc = new Map<string, Record<string, unknown[]>>();
    const kid = new Map<string, Map<string, Maybe<number>[]>>();
    const routine = new Map<
      string,
      { id: string; n: number; text: string }[]
    >();
    for (const a of arms) {
      acc.set(a, {});
      kid.set(a, new Map());
      routine.set(a, []);
    }
    const push = (arm: string, f: string, v: unknown) => {
      const bucket = acc.get(arm);
      if (!bucket) return;
      const list = bucket[f] ?? [];
      list.push(v);
      bucket[f] = list;
    };
    for (const lesson of data.lessons) {
      const arm = armOf(lesson.id);
      const child = nameOf(lesson.id).split("-")[1] ?? "";
      for (const t of lesson.turns) {
        for (const f of JUDGE_NUM_FIELDS) push(arm, f, t[f]);
        for (const f of JUDGE_FLAG_FIELDS)
          push(
            arm,
            f,
            t[f] === null || t[f] === undefined ? null : Boolean(t[f]),
          );
        for (const text of t.own_routine ?? [])
          routine.get(arm)?.push({ id: lesson.id, n: t.n, text });
        flagsOf[judge]?.set(`${lesson.id}#${t.n}`, t);
      }
      for (const f of JUDGE_LESSON_FIELDS) push(arm, f, lesson[f]);
      const byChild = kid.get(arm);
      if (byChild) {
        const list = byChild.get(child) ?? [];
        list.push(lesson.feel);
        byChild.set(child, list);
      }
      push(arm, "memory", lesson.memory);
      feelOf[judge]?.set(lesson.id, lesson.feel);
    }
    const rows: Record<string, JudgeArmRow> = {};
    for (const a of arms) {
      const x = acc.get(a) ?? {};
      const nums = (f: string) => (x[f] ?? []) as Maybe<number>[];
      const flags = (f: string) => (x[f] ?? []) as Maybe<boolean>[];
      const memory: Record<string, number> = {};
      for (const m of (x.memory ?? []) as Maybe<string>[]) {
        const k = m === null || m === undefined ? "null" : String(m);
        memory[k] = (memory[k] ?? 0) + 1;
      }
      const routines = routine.get(a) ?? [];
      rows[a] = {
        turns: nums("link").length,
        link: meanOf(nums("link")),
        uptake: meanOf(nums("uptake")),
        level: meanOf(nums("level")),
        "misread%": rateOf(flags("misread")),
        "repeat%": rateOf(flags("repeat")),
        "pushy%": rateOf(flags("pushy")),
        "made_up%": rateOf(flags("made_up")),
        help: meanOf(nums("help")),
        help_n: present(nums("help")).length,
        follow: meanOf(nums("follow")),
        follow_n: present(nums("follow")).length,
        "q/turn": meanOf(nums("q_count")),
        feel: meanOf(nums("feel")),
        teaching: meanOf(nums("teaching")),
        child_room: meanOf(nums("child_room")),
        memory,
        feel_by_child: Object.fromEntries(
          [...(kid.get(a) ?? new Map<string, Maybe<number>[]>()).entries()].map(
            ([c, v]) => [c, meanOf(v)],
          ),
        ),
        made_up_n: present(flags("made_up")).filter((v) => v).length,
        "own_life%": rateOf(flags("own_life")),
        own_life_n: present(flags("own_life")).filter((v) => v).length,
        own_routine_n: routines.length,
        own_routine_examples: routines.slice(0, ROUTINE_EXAMPLES_MAX),
      };
    }
    out[judge] = rows;
  }
  const names = Object.keys(judges);
  let pair: JudgePair | null = null;
  const [ja, jb] = names;
  if (ja !== undefined && jb !== undefined) {
    const fa = feelOf[ja] ?? new Map();
    const fb = feelOf[jb] ?? new Map();
    const ids = [...fa.keys()].filter((id) => fb.has(id)).sort();
    const va = ids.map((id) => fa.get(id));
    const vb = ids.map((id) => fb.get(id));
    const diff = ids.flatMap((_, i) => {
      const x = va[i];
      const y = vb[i];
      return x == null || y == null ? [] : [Math.abs(x - y)];
    });
    const corr = pearson(va, vb);
    const both: JudgePair["both"] = Object.fromEntries(
      arms.map((a) => [a, { made_up: [], own_life: [] }]),
    );
    const ta = flagsOf[ja] ?? new Map();
    const tb = flagsOf[jb] ?? new Map();
    for (const [ref, t] of ta) {
      const u = tb.get(ref);
      if (!u) continue;
      const [id = "", n = "0"] = ref.split("#");
      const slot = both[armOf(id)];
      if (!slot) continue;
      if (t.made_up && u.made_up) slot.made_up.push({ id, n: Number(n) });
      if (t.own_life && u.own_life) slot.own_life.push({ id, n: Number(n) });
    }
    pair = {
      a: ja,
      b: jb,
      feel: {
        lessons: diff.length,
        meanDiff:
          diff.length === 0
            ? null
            : pyRound(diff.reduce((s, d) => s + d, 0) / diff.length, 2),
        same: diff.filter((d) => d === 0).length,
        withinOne: diff.filter((d) => d <= 1).length,
        corr: corr === null ? null : pyRound(corr, 2),
      },
      both,
      lessons: ids.map((id, i) => ({
        id,
        name: nameOf(id),
        a: va[i] ?? null,
        b: vb[i] ?? null,
      })),
    };
  }
  return { arms, judges: out, pair };
}

// ── 수업이 끝난 길(마무리 기록 — spec '회화 Claude 주도' 설계 9 · AC-26k) ─────────

/** 방식 P 의 선생님이 move wrap_up 으로 스스로 마무리한 차례의 까닭 글(LessonLog.ended · ending.reason). */
export const TEACHER_CLOSING_REASON = "선생님이 스스로 마무리함(move wrap_up)";
/** 방식 Q · QP 의 선생님이 wrap_up 참으로 마무리를 꺼내 두 단추가 나온 차례의 까닭 글('그만하기'면 이 글로 끝난다 — 선생님이 스스로 마무리함). */
export const TEACHER_WRAP_REASON =
  "선생님이 마무리를 꺼냄(wrap_up 참) — 두 단추";

/** 끝난 까닭 글(LessonLog.ended)로 끝난 길을 정한다. 옛 기록도 같은 글을 쓴다(대본 도구의 멈춘 까닭 · 도구의 마무리 글). */
export function endingHowOf(
  ended: string | null,
  failures: readonly string[],
): LessonEnding["how"] {
  if (failures.length > 0) return "other";
  if (ended === null) return "turn_cap";
  if (
    ended.includes(TEACHER_CLOSING_REASON) ||
    ended.includes(TEACHER_WRAP_REASON)
  )
    return "teacher_closing";
  if (ended.includes("고르기 차례") || ended.includes("대화가 닫혔다"))
    return "app_closing";
  return "other";
}

export function lessonEndingOf(input: {
  ended: string | null;
  failures: readonly string[];
  childTurns: number;
  /** 마지막 선생님 최종 영어. */
  lastLine: string | null;
  choices: readonly WrapChoice[];
}): LessonEnding {
  const how = endingHowOf(input.ended, input.failures);
  return {
    how,
    childTurns: input.childTurns,
    line:
      how === "app_closing" || how === "teacher_closing"
        ? input.lastLine
        : null,
    reason: input.ended,
    choices: [...input.choices],
  };
}

/** 기록의 끝난 길: 새 기록은 ending 그대로, 옛 기록(ending 없음)은 ended 글과 마지막 선생님 말로 정한다(고른 단추는 없음). */
export function endingOf(
  meta: LessonLog,
  teachers: readonly TeacherTurnLog[],
): LessonEnding {
  if (meta.ending) return meta.ending;
  const last = [...teachers].sort((a, b) => a.childTurn - b.childTurn).at(-1);
  return lessonEndingOf({
    ended: meta.ended,
    failures: meta.failures,
    childTurns: meta.childTurns,
    lastLine: last?.final ?? null,
    choices: [],
  });
}
