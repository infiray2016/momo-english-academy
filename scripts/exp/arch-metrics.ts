// 회화 구조 비교 실험(13절 C234 · task-exp-harness)의 수치 셈(순수 함수). 네트워크 · 파일을 쓰지 않는다.
// 문장 자르기 · 물음 문장 · 낱말 · 형태 · 범위 밖 낱말은 앱의 함수(src/core)를 그대로 쓴다.
import {
  CLOSED_CLASS_PASS_WORDS,
  type LowLevelLineOptions,
  type OffbandExtra,
  offbandWordsIn,
  questionKeyOf,
} from "../../src/core/conversation/question-check";
import { normalizeSpoken } from "../../src/core/conversation/spoken";
import { isQuestionSentence } from "../../src/core/conversation/stream";
import {
  formsIn,
  isEnglishSentence,
  sentenceWords,
  splitSentences,
  tokenize,
} from "../../src/core/seed/text";

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
