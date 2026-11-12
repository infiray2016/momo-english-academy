// 새 회화 엔진(N, Claude 가 이끄는 대화)의 새 후보 판정 — 기록 전용(spec '회화 Claude 주도' 설계 5 · 13절 C233 (3) · C238 (4) · plan 묶음 R3).
// 아이가 말한 단원 단어마다 다섯 갈래 + 그 밖 가운데 하나를 매기고, 지금 판정('말했다')과 나란히 놓아 차이 표를 낸다. 행에서 그때그때
// 계산하고 저장하지 않는다. 이 값은 said_words · '안다' · 단원 통과 · 승급 계산의 입력이 아니다(AC-26f 호출 자리 검색 시험 — src 의 어느
// 파일도 이 모듈을 가져다 쓰지 않는다). 지금 판정 함수(said.ts)는 그대로 부를 뿐 바꾸지 않는다. DB 없는 순수 모듈이다.
import { homophoneHeadOf } from "@/core/conversation/child-kind";
import type { TalkHintKind } from "@/core/conversation/lesson-turns";
import type { TalkLeadMove, TalkLeadReading } from "@/core/conversation/move";
import { metWordsIn, saidWordsOf } from "@/core/conversation/said";
import { normalizeForMatch } from "@/core/speech/match-rate";

/** 단원 단어 · 원형 · 동음이의어(지금 판정 saidWordsOf 와 같은 재료). */
export type LeadCandidateLex = {
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
  homophones: readonly (readonly string[])[];
};

/** 선생님 행(새 엔진 행의 say · move.lead 에서 부르는 쪽이 채운다). */
export type LeadCandidateTeacherRow = {
  role: "teacher";
  /** 나간 말 칸(say, 문장 문을 지난 글). */
  say: string;
  /** 응답의 차례 갈래(lead.move). 옛 행 · 지금 길 행은 null. */
  move: TalkLeadMove | null;
  /** 앱이 확인한 따라 할 문장(lead.model.sentence — 설계 4 첫 줄, 말 칸에 그대로 들었는지와 관계없이). 없으면 null. */
  model: string | null;
  /** 막힌 뒤 고르기 답을 들려준 차례(lead.choices — 설계 4 둘째 줄). */
  choices: boolean;
  /** 막힌 뒤 한국어 뜻(hint_ko)을 보인 차례. */
  koShown: boolean;
};

/** 아이 행(talk_turns 아이 행에서 부르는 쪽이 채운다). */
export type LeadCandidateChildRow = {
  role: "child";
  /** 들린 글(인식 글). */
  heard: string;
  /** 지금 판정이 이 차례에 '말했다'로 센 단원 단어(저장된 said_words). */
  saidWords: readonly string[];
  /** Claude 가 낸 후보(child_used_on_own). */
  claudeWords: readonly string[];
  hintKind: TalkHintKind;
  /** 이 차례가 막힘이었다(저장된 막힘 — 지금 판정 leadSaidWordsOf 의 stuck 과 같은 값, 말 입력이 아닌 차례도 부르는 쪽이 참으로 채운다). */
  stuck: boolean;
  /** 이 차례에 한국어 도움(수업 안 한국어로 묻기)을 받았다. */
  koHelp: boolean;
  /** 이 차례에 뜻 힌트를 열었다. */
  meaningHint: boolean;
  /** 이 아이 말을 읽은 다음 선생님 응답의 reading. 없으면 null. */
  reading: TalkLeadReading | null;
};

export type LeadCandidateRow = LeadCandidateTeacherRow | LeadCandidateChildRow;

/**
 * 갈래(설계 5 표 · C233 (3)). 위에서부터 처음 맞는 하나다.
 * - repeated_model ① 완성 답을 듣고 그대로 따라 말함 — 인정하지 않음
 * - echoed_word ② 선생님이 말한 목표 낱말만 되풀이함 — 자동 인정하지 않음(보류)
 * - after_meaning ③ 뜻을 알려 준 뒤 답함 — 도움 범위를 적고 지금 기준(힌트 종류)대로
 * - own_sentence ④ 질문에 든 낱말로 아이가 새 문장을 만듦 — 겹침만으로 빼지 않음(인정 후보)
 * - own_later ⑤ 뒤에 다른 문맥에서 스스로 씀 — 별도 독립 근거 후보
 * - not_said_by_teacher (그 밖) 선생님이 말하지 않은 낱말 — 지금 판정과 같음
 */
export const LEAD_CANDIDATE_CATEGORIES = [
  "repeated_model",
  "echoed_word",
  "after_meaning",
  "own_sentence",
  "own_later",
  "not_said_by_teacher",
] as const;
export type LeadCandidateCategory = (typeof LEAD_CANDIDATE_CATEGORIES)[number];

/** ③ 의 도움 범위: 이 차례 한국어 도움 · 이 차례 뜻 힌트 · 앞 선생님 차례가 막힌 뒤 보인 한국어 뜻(차이 표에 따로 셈). */
export type LeadCandidateHelp = "ko_help" | "meaning_hint" | "teacher_ko";

export type LeadCandidateWord = {
  word: string;
  category: LeadCandidateCategory;
  /** 새 후보 판정이 독립 수행으로 보는가. */
  accepted: boolean;
  /** ③ 일 때 도움 범위, 그 밖은 null. */
  help: LeadCandidateHelp | null;
};

/** 아이 차례마다 나란히 내는 값(설계 5 · 검토 M-3). */
export type LeadCandidateTurn = {
  /** 입력 행 번호(0부터). */
  row: number;
  /** 들린 글. */
  text: string;
  reading: TalkLeadReading | null;
  hintKind: TalkHintKind;
  /** 값 1: 지금 판정 낱말(Claude 후보 + saidWordsOf, 저장된 그대로). */
  current: string[];
  /** 값 2: 새 후보 — Claude 후보 가운데 들린 글에 든 단원 단어와 갈래. */
  candidate: LeadCandidateWord[];
  /** 값 3: 후보 없이 들린 글만으로 찾은 단원 단어와 갈래(그 밖은 저장된 판정이 아니라 currentConditionsMet 로 인정 — 검토 M-3). */
  heard: LeadCandidateWord[];
  /**
   * 지금 기준의 차례 조건을 지났다: 힌트 종류 '영어' 아님 · 막힘 아님 · 이 차례 뒤 선생님이 되묻지 않음(지금 판정 leadSaidWordsOf 의 조건 그대로,
   * 새 규칙이 아니다). 값 3 의 그 밖 인정과 차이 표의 표지 칸(differFrom)에 쓴다.
   */
  currentConditionsMet: boolean;
  /** Claude 가 냈지만 인식 글에 없는 단원 단어. */
  claudeNotHeard: string[];
  /** 인식 글에 있지만 Claude 가 내지 않은 단원 단어(소리로만 이어진 후보 — 그 후보 낱말이 글자로는 들리지 않음 — 는 낸 것으로 본다, 검토 M-1). */
  heardNotClaude: string[];
  /** 막힌 뒤 고르기로 빠진 차례: 앞 선생님 행이 고르기를 들려줬고, 그 차례 힌트 종류가 '영어'이며, 들린 글에 단원 단어가 있는데 지금 판정이 없다(검토 M-5). */
  choicesDropped: boolean;
};

/**
 * 내용 낱말을 가리는 기능어(설계 5: 관사 · 대명사 · be · 조동사 · 전치사 · 접속사 · yes/no). 영어 낱말 목록이라 코드 상수다. 축약형을 편 뒤의
 * not 은 조동사의 부정으로 함께 넣고, yes/no 는 인식 글의 흔한 표기(yeah · yep · nope)를 함께 넣는다.
 */
const LEAD_FUNCTION_WORDS: ReadonlySet<string> = new Set([
  // 관사
  "a",
  "an",
  "the",
  // 대명사(인칭 · 소유 · 재귀 · 지시 · 의문 · 부정)
  "i",
  "me",
  "my",
  "mine",
  "myself",
  "you",
  "your",
  "yours",
  "yourself",
  "he",
  "him",
  "his",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "it",
  "its",
  "itself",
  "we",
  "us",
  "our",
  "ours",
  "ourselves",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "this",
  "that",
  "these",
  "those",
  "what",
  "who",
  "whom",
  "whose",
  "which",
  "someone",
  "somebody",
  "something",
  "anyone",
  "anybody",
  "anything",
  "everyone",
  "everybody",
  "everything",
  "nobody",
  "nothing",
  // be
  "be",
  "am",
  "is",
  "are",
  "was",
  "were",
  "been",
  "being",
  // 조동사
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "can",
  "could",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "not",
  // 전치사
  "about",
  "above",
  "across",
  "after",
  "against",
  "along",
  "around",
  "at",
  "before",
  "behind",
  "below",
  "beside",
  "between",
  "by",
  "down",
  "during",
  "for",
  "from",
  "in",
  "inside",
  "into",
  "near",
  "of",
  "off",
  "on",
  "onto",
  "out",
  "outside",
  "over",
  "through",
  "to",
  "toward",
  "under",
  "until",
  "up",
  "with",
  "without",
  // 접속사
  "and",
  "or",
  "but",
  "so",
  "because",
  "if",
  "when",
  "while",
  "than",
  // yes/no
  "yes",
  "no",
  "yeah",
  "yep",
  "nope",
]);

/**
 * 감탄사 · 맞장구(검토 M-2, 컨트롤러 결정 2026-11-13): 선생님이 방금 말한 낱말에 이것만 더한 말('Oh, sky!' · 'Yes. Sky.')은 새 뜻과 문장이 아니라 ②
 * 그것만 되풀이함이다. 좁은 목록이고(yes · yeah · no 는 위 yes/no 에 있다), 이 밖의 낱말이 하나라도 더해지면 지금처럼 ④ 다. 영어 낱말 목록이라 코드 상수다.
 */
const LEAD_INTERJECTION_WORDS: ReadonlySet<string> = new Set([
  "oh",
  "okay",
  "ok",
  "wow",
  "um",
]);

/** 내용 낱말 하나: 원형(원형 표에 없으면 소문자 낱말)과 견줌 열쇠(글자 · 원형 · 같은 소리 대표 낱말). */
export type LeadContentWord = { word: string; keys: string[] };

/**
 * 글의 내용 낱말(설계 5): 일치율과 같은 정규화(소문자 · 문장 부호 · 축약형 펼침 · 숫자)를 거친 낱말 가운데 기능어 · 감탄사 목록 밖의 낱말을 원형으로
 * 본 것. 견줌 열쇠에 동음이의어 대표 낱말을 넣어, 들린 글 'See!' 가 선생님 말의 sea 와 같은 낱말로 맞게 한다.
 */
export function contentWordKeysOf(
  text: string,
  lex: LeadCandidateLex,
): LeadContentWord[] {
  const head = homophoneHeadOf(lex.homophones);
  const out: LeadContentWord[] = [];
  for (const token of normalizeForMatch(text, [])) {
    const lemma = lex.lemmaOf(token)?.toLowerCase();
    if (
      LEAD_FUNCTION_WORDS.has(token) ||
      LEAD_INTERJECTION_WORDS.has(token) ||
      (lemma !== undefined && LEAD_FUNCTION_WORDS.has(lemma))
    )
      continue;
    const word = lemma ?? token;
    const keys = new Set([token, word, head(token), head(word)]);
    out.push({ word, keys: [...keys] });
  }
  return out;
}

/** 아이 말의 내용 낱말이 모두 이 글(들)의 내용 낱말에 드는가. */
function allContentWithin(
  childWords: readonly LeadContentWord[],
  texts: readonly string[],
  lex: LeadCandidateLex,
): boolean {
  const keys = new Set(
    texts.flatMap((t) => contentWordKeysOf(t, lex).flatMap((w) => w.keys)),
  );
  return childWords.every((w) => w.keys.some((k) => keys.has(k)));
}

/** 이 아이 차례가 보는 선생님 행들: 바로 앞 선생님 행, 그 행이 되묻기면 그 앞의 선생님 행까지 거슬러 본다(되묻기가 이어지면 계속). */
function teacherChainOf(
  rows: readonly LeadCandidateRow[],
  childAt: number,
): LeadCandidateTeacherRow[] {
  const chain: LeadCandidateTeacherRow[] = [];
  for (let i = childAt - 1; i >= 0; i--) {
    const row = rows[i];
    if (row === undefined || row.role !== "teacher") continue;
    chain.push(row);
    if (row.move !== "ask_again") break;
  }
  return chain;
}

type TurnFacts = {
  childWords: LeadContentWord[];
  says: string[];
  sayWords: Set<string>;
  models: string[];
  modelWords: Set<string>;
  help: LeadCandidateHelp | null;
  hintKind: TalkHintKind;
};

/**
 * 낱말 하나의 갈래(설계 5 표, 위에서부터 처음 맞는 하나). history 는 이 수업 앞에서 ① · ② 로 적힌 낱말이고, otherAccepted 는 그 밖의 인정
 * 여부다(값 2 는 저장된 지금 판정, 값 3 은 지금 기준의 차례 조건).
 */
function categorize(
  word: string,
  facts: TurnFacts,
  history: ReadonlySet<string>,
  otherAccepted: (word: string) => boolean,
  lex: LeadCandidateLex,
): LeadCandidateWord {
  const of = (
    category: LeadCandidateCategory,
    accepted: boolean,
    help: LeadCandidateHelp | null = null,
  ): LeadCandidateWord => ({ word, category, accepted, help });
  if (
    facts.modelWords.has(word) &&
    allContentWithin(facts.childWords, facts.models, lex)
  )
    return of("repeated_model", false);
  const inSay = facts.sayWords.has(word);
  if (inSay && allContentWithin(facts.childWords, facts.says, lex))
    return of("echoed_word", false);
  if (facts.help !== null)
    return of("after_meaning", facts.hintKind !== "english", facts.help);
  if (inSay) return of("own_sentence", true);
  if (history.has(word)) return of("own_later", true);
  return of("not_said_by_teacher", otherAccepted(word));
}

/**
 * 한 수업의 차례 기록에서 아이 차례마다 세 값을 낸다(설계 5): 값 1 지금 판정 낱말, 값 2 Claude 후보 가운데 들린 글에 든 단원 단어(saidWordsOf 의
 * 대조 그대로 — 힌트 종류로 빼지 않는다)와 갈래(그 밖 = 저장된 지금 판정), 값 3 후보 없이 들린 글에서 찾은 단원 단어(만남과 같은 대조, 동음이의어
 * 없이)와 갈래(그 밖 = 지금 기준의 차례 조건, Claude 후보에 기대지 않는다 — 검토 M-3). ⑤ 의 '앞에서 ① · ② 로 적힌 적'은 값마다 따로 쌓는다.
 */
export function leadCandidateTurnsOf(
  rows: readonly LeadCandidateRow[],
  lex: LeadCandidateLex,
): LeadCandidateTurn[] {
  const head = homophoneHeadOf(lex.homophones);
  const unit = new Set(lex.unitWords);
  const candidateHistory = new Set<string>();
  const heardHistory = new Set<string>();
  const turns: LeadCandidateTurn[] = [];
  rows.forEach((row, at) => {
    if (row.role !== "child") return;
    const chain = teacherChainOf(rows, at);
    const says = chain.map((t) => t.say);
    const models = chain
      .map((t) => t.model)
      .filter((m): m is string => m !== null && m.trim() !== "");
    const help: LeadCandidateHelp | null = row.koHelp
      ? "ko_help"
      : row.meaningHint
        ? "meaning_hint"
        : chain.some((t) => t.koShown)
          ? "teacher_ko"
          : null;
    const facts: TurnFacts = {
      childWords: contentWordKeysOf(row.heard, lex),
      says,
      sayWords: new Set(says.flatMap((s) => metWordsIn(s, lex))),
      models,
      modelWords: new Set(models.flatMap((m) => metWordsIn(m, lex))),
      help,
      hintKind: row.hintKind,
    };
    // 이 아이 말을 읽은 응답은 바로 다음 선생님 행이다(isLeadAskAgain 과 같은 뜻).
    const next = rows[at + 1];
    const askedAgain = next?.role === "teacher" && next.move === "ask_again";
    const currentConditionsMet =
      row.hintKind !== "english" && !row.stuck && !askedAgain;
    const current = new Set(row.saidWords);
    const linked = saidWordsOf({
      ...lex,
      aiWords: row.claudeWords,
      heard: row.heard,
      hintKind: "none",
    });
    const heardWords = metWordsIn(row.heard, lex);
    const classify = (
      words: readonly string[],
      history: Set<string>,
      otherAccepted: (word: string) => boolean,
    ) => {
      const out = words.map((w) =>
        categorize(w, facts, history, otherAccepted, lex),
      );
      for (const c of out)
        if (c.category === "repeated_model" || c.category === "echoed_word")
          history.add(c.word);
      return out;
    };
    const claudeUnit: string[] = [];
    for (const w of row.claudeWords) {
      const lemma = lex.lemmaOf(w) ?? w.toLowerCase();
      if (unit.has(lemma) && !claudeUnit.includes(lemma))
        claudeUnit.push(lemma);
    }
    // 소리로만 이어진 후보: 글자로는 들리지 않았는데 같은 소리 낱말로 이어진 후보(들린 'See!' → 후보 sea). 'I see the sea.' 처럼 두 낱말이 다
    // 글자로 들렸으면 see 는 이어진 것이 아니다(검토 M-1).
    const linkedBySoundOnly = (w: string) =>
      linked.some((l) => head(l) === head(w) && !heardWords.includes(l));
    turns.push({
      row: at,
      text: row.heard,
      reading: row.reading,
      hintKind: row.hintKind,
      current: [...row.saidWords],
      candidate: classify(linked, candidateHistory, (w) => current.has(w)),
      heard: classify(heardWords, heardHistory, () => currentConditionsMet),
      currentConditionsMet,
      claudeNotHeard: claudeUnit.filter((w) => !linked.includes(w)),
      heardNotClaude: heardWords.filter(
        (w) => !claudeUnit.includes(w) && !linkedBySoundOnly(w),
      ),
      choicesDropped:
        chain.some((t) => t.choices) &&
        row.hintKind === "english" &&
        row.saidWords.length === 0 &&
        heardWords.length > 0,
    });
  });
  return turns;
}

/** 차이 표의 낱말 행: 지금 판정 · 새 후보 · 들린 글만(값 3)이 독립 수행으로 보는지와, 값 2 · 값 3 에서 매긴 갈래(처음 나온 차례). */
export type LeadCandidateWordRow = {
  word: string;
  current: boolean;
  candidate: boolean;
  heard: boolean;
  side: "both" | "current_only" | "candidate_only" | "neither";
  /**
   * 표지 칸(검토 M-4, 컨트롤러 결정 2026-11-13): 차이(side 가 current_only · candidate_only)가 어디서 왔는가. 계산은 바꾸지 않는다.
   * - categories: 다섯 구분에서 온 차이 — 그 차례의 새 후보 인정에 지금 기준의 차례 조건(currentConditionsMet)을 걸어도 지금 판정과 다르다
   * - other_conditions: 그 밖의 조건에서 온 차이 — 차례 조건을 걸면 지금 판정과 같아진다(힌트 종류 '영어' · 막힘 · 되묻기를 갈래가 보지 않아
   *   생긴 차이), 또는 그 차례 새 후보에 그 낱말이 없다(Claude 후보와 저장된 판정의 어긋남)
   * 같은 방향의 차이가 난 차례 가운데 하나라도 categories 면 categories 다. 차이가 없으면 null.
   */
  differFrom: "categories" | "other_conditions" | null;
  categories: LeadCandidateCategory[];
  heardCategories: LeadCandidateCategory[];
};

export type LeadCandidateCounts = {
  /** 차이 낱말 수(지금 판정에만 + 새 후보에만). */
  differ: number;
  currentOnly: number;
  candidateOnly: number;
  /** 갈래별 수(값 2, 차례 × 낱말). */
  byCategory: Record<LeadCandidateCategory, number>;
  /** 갈래별 수(값 3, 차례 × 낱말). */
  heardByCategory: Record<LeadCandidateCategory, number>;
  /** ③ 가운데 앞 선생님 차례가 막힌 뒤 한국어 뜻을 보인 경우(값 2, 따로 셈). */
  teacherKo: number;
  /** 막힌 뒤 고르기로 빠진 차례 수. */
  choicesDropped: number;
  /** Claude 후보와 앱 대조 어긋남(차례 × 낱말). */
  claudeNotHeard: number;
  heardNotClaude: number;
};

export type LeadCandidateTable = {
  turns: LeadCandidateTurn[];
  words: LeadCandidateWordRow[];
  counts: LeadCandidateCounts;
};

function emptyCategoryCounts(): Record<LeadCandidateCategory, number> {
  return Object.fromEntries(
    LEAD_CANDIDATE_CATEGORIES.map((c) => [c, 0]),
  ) as Record<LeadCandidateCategory, number>;
}

/**
 * 수업마다의 차이 표(설계 5 · 미결 7): 지금 판정이 '말했다'로 센 낱말과 새 후보 판정이 독립 수행으로 보는 낱말을 나란히 놓고, 낱말마다 어느 쪽에만
 * 있는지와 갈래를 낸다. 낱말 행은 어느 값에든 처음 나온 차례대로다.
 */
export function leadCandidateTableOf(
  rows: readonly LeadCandidateRow[],
  lex: LeadCandidateLex,
): LeadCandidateTable {
  const turns = leadCandidateTurnsOf(rows, lex);
  const byWord = new Map<string, LeadCandidateWordRow>();
  const rowOf = (word: string) => {
    let row = byWord.get(word);
    if (row === undefined) {
      row = {
        word,
        current: false,
        candidate: false,
        heard: false,
        side: "neither",
        differFrom: null,
        categories: [],
        heardCategories: [],
      };
      byWord.set(word, row);
    }
    return row;
  };
  const counts: LeadCandidateCounts = {
    differ: 0,
    currentOnly: 0,
    candidateOnly: 0,
    byCategory: emptyCategoryCounts(),
    heardByCategory: emptyCategoryCounts(),
    teacherKo: 0,
    choicesDropped: 0,
    claudeNotHeard: 0,
    heardNotClaude: 0,
  };
  const addCategory = (
    list: LeadCandidateCategory[],
    category: LeadCandidateCategory,
  ) => {
    if (!list.includes(category)) list.push(category);
  };
  // 낱말마다 방향별(지금 판정에만 · 새 후보에만) 차이가 난 차례의 출처
  const differSources = new Map<
    string,
    {
      currentOnly: Set<"categories" | "other_conditions">;
      candidateOnly: Set<"categories" | "other_conditions">;
    }
  >();
  for (const turn of turns) {
    for (const word of new Set([
      ...turn.current,
      ...turn.candidate.map((c) => c.word),
    ])) {
      const now = turn.current.includes(word);
      const entry = turn.candidate.find((c) => c.word === word);
      const accepted = entry?.accepted ?? false;
      if (now === accepted) continue;
      const gated =
        entry === undefined
          ? now
          : entry.category === "not_said_by_teacher"
            ? entry.accepted
            : entry.accepted && turn.currentConditionsMet;
      const source = gated === now ? "other_conditions" : "categories";
      let sources = differSources.get(word);
      if (sources === undefined) {
        sources = { currentOnly: new Set(), candidateOnly: new Set() };
        differSources.set(word, sources);
      }
      (now ? sources.currentOnly : sources.candidateOnly).add(source);
    }
  }
  for (const turn of turns) {
    for (const word of turn.current) rowOf(word).current = true;
    for (const c of turn.candidate) {
      const row = rowOf(c.word);
      if (c.accepted) row.candidate = true;
      addCategory(row.categories, c.category);
      counts.byCategory[c.category] += 1;
      if (c.help === "teacher_ko") counts.teacherKo += 1;
    }
    for (const c of turn.heard) {
      const row = rowOf(c.word);
      if (c.accepted) row.heard = true;
      addCategory(row.heardCategories, c.category);
      counts.heardByCategory[c.category] += 1;
    }
    if (turn.choicesDropped) counts.choicesDropped += 1;
    counts.claudeNotHeard += turn.claudeNotHeard.length;
    counts.heardNotClaude += turn.heardNotClaude.length;
  }
  const words = [...byWord.values()];
  for (const row of words) {
    row.side =
      row.current && row.candidate
        ? "both"
        : row.current
          ? "current_only"
          : row.candidate
            ? "candidate_only"
            : "neither";
    if (row.side === "current_only") counts.currentOnly += 1;
    if (row.side === "candidate_only") counts.candidateOnly += 1;
    if (row.side === "current_only" || row.side === "candidate_only") {
      const sources = differSources.get(row.word);
      const found =
        row.side === "current_only"
          ? sources?.currentOnly
          : sources?.candidateOnly;
      row.differFrom = found?.has("categories")
        ? "categories"
        : "other_conditions";
    }
  }
  counts.differ = counts.currentOnly + counts.candidateOnly;
  return { turns, words, counts };
}
