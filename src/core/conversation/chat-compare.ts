// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 13 '수업별 비교 기록' · '일치 비율' · '직접 대조', plan 묶음 P4)의
// 수업별 비교 집계와 일치 비율 — 기록 전용. 아이 행의 chat_judge(chat-judge)를 모아 두 판정(기존 꼴 said · 앱 said)의 같은 낱말 · 한쪽만의 낱말 ·
// 까닭 표지 · 판정 없음 · 기다림 수 · 일치 비율 두 값(고르기 답을 넣은 값 · 뺀 값)을 낸다. 실제 수업과 모의 수업(대본 실행)은 부르는 쪽이 가름 값을
// 넘기고 합계에서 섞지 않는다(C243 (6), I-8 (다)). 아이 말 글은 담지 않는다(표지 행 · 도구가 행 번호로 다시 읽음). 학습 근거 · 통과 · 승급 ·
// 이어하기의 입력이 아니다. 같은 일치 비율을 직접 대조(AC-20 — 지금 새 방식 기록의 공식 said_words 와 기존 꼴 said)에도 쓴다. 순수 모듈이다.
import { z } from "zod";
import {
  CHAT_APP_CATEGORIES,
  type ChatAppCategory,
  type ChatJudge,
} from "@/core/conversation/chat-judge";
import { homophoneHeadOf } from "@/core/conversation/child-kind";

// ── 일치 비율(설계 13 '일치 비율', I-8 (나)) ────────────────────────────

/** (아이 차례, 단원 단어) 쌍 하나: 두 판정 a · b 가 인정했는지와 고르기 답 표지. 어느 한쪽이라도 인정한 쌍만 만든다. */
export type ChatPair = {
  word: string;
  a: boolean;
  b: boolean;
  choice: boolean;
};

/**
 * 한 아이 차례의 쌍: 두 낱말 목록의 합(a 의 차례 → b 에만 있는 낱말 차례). 둘 다 인정하지 않은 쌍은 만들지 않는다(넣으면 늘 높게 나옴).
 * choice 는 고르기 답 표지가 붙은 낱말이다(앱 판정의 choiceAnswer).
 */
export function chatTurnPairsOf({
  a,
  b,
  choice,
}: {
  a: readonly string[];
  b: readonly string[];
  choice: readonly string[];
}): ChatPair[] {
  const words: string[] = [];
  for (const w of [...a, ...b]) if (!words.includes(w)) words.push(w);
  return words.map((word) => ({
    word,
    a: a.includes(word),
    b: b.includes(word),
    choice: choice.includes(word),
  }));
}

/** 일치 비율 하나: 분모(쌍 수) · 분자(둘 다 인정한 쌍 수) · 비율(쌍이 없으면 null). */
export type ChatAgreementValue = {
  pairs: number;
  agreed: number;
  ratio: number | null;
};

/** 일치 비율 두 값(고르기 답 표지가 붙은 쌍을 넣은 값 · 뺀 값, 컨트롤러가 정한 것 2). */
export type ChatAgreement = {
  withChoice: ChatAgreementValue;
  withoutChoice: ChatAgreementValue;
};

function agreementValueOf(pairs: number, agreed: number): ChatAgreementValue {
  return { pairs, agreed, ratio: pairs === 0 ? null : agreed / pairs };
}

/** 쌍들의 일치 비율 두 값. */
export function chatAgreementOf(pairs: readonly ChatPair[]): ChatAgreement {
  const both = (p: ChatPair) => p.a && p.b;
  const noChoice = pairs.filter((p) => !p.choice);
  return {
    withChoice: agreementValueOf(pairs.length, pairs.filter(both).length),
    withoutChoice: agreementValueOf(
      noChoice.length,
      noChoice.filter(both).length,
    ),
  };
}

// ── 수업별 비교(설계 13 '수업별 비교 기록') ──────────────────────────────

/** 실제 수업(아이의 iPad 수업) · 모의 수업(대본 실행). */
export const CHAT_COMPARE_SOURCES = ["real", "mock"] as const;
export type ChatCompareSource = (typeof CHAT_COMPARE_SOURCES)[number];

/**
 * 한쪽만의 낱말의 까닭 표지(설계 13): choice_answer 고르기 답(앱이 보류) · ask_again_unknown 되물린 차례나 되물은 뒤의 답 차례(앱은 되묻기를
 * 모름) · legacy_stuck 기존 꼴 막힘 · hint_kind_differs 두 판정의 힌트 종류가 다름 · app_stuck 앱이 아는 막힘 말(fix 1 M-3). 붙는 것을 모두
 * 적고, 없으면 빈 목록이다.
 */
export const CHAT_COMPARE_REASONS = [
  "choice_answer",
  "ask_again_unknown",
  "legacy_stuck",
  "hint_kind_differs",
  "app_stuck",
] as const;
export type ChatCompareReason = (typeof CHAT_COMPARE_REASONS)[number];

const OneSideSchema = z.strictObject({
  /** 아이 행 번호(도구가 그 차례의 선생님 말 · 들린 글을 다시 읽는 열쇠). */
  row: z.int().min(0),
  word: z.string(),
  side: z.enum(["legacy_only", "app_only"]),
  /** 그 낱말의 앱 판정 갈래(앱 판정이 그 낱말을 보지 않았으면 null). */
  category: z.enum(CHAT_APP_CATEGORIES).nullable(),
  reasons: z.array(z.enum(CHAT_COMPARE_REASONS)),
});
export type ChatCompareOneSide = z.infer<typeof OneSideSchema>;

const AgreementValueSchema = z.strictObject({
  pairs: z.int().min(0),
  agreed: z.int().min(0),
  ratio: z.number().min(0).max(1).nullable(),
});

const CountsSchema = z.strictObject({
  /** 아이 차례 수(chat_judge 가 있는 아이 행 전부 — 조용함 · 단추 차례 포함). */
  childTurns: z.int().min(0),
  /** 기존 꼴 판정이 있는 차례 수(일치 비율의 분모에 드는 차례). */
  done: z.int().min(0),
  /** 판정 없음 · 기다림 · 부르지 않음 차례 수(분모 밖). */
  failed: z.int().min(0),
  waiting: z.int().min(0),
  notCalled: z.int().min(0),
});

/** 수업별 비교 요약(attempts 표지 행 `talk-chat-compare:<세션 id>` 에 담는 꼴). 아이 말 글은 없다. */
export const ChatCompareSummarySchema = z.strictObject({
  source: z.enum(CHAT_COMPARE_SOURCES),
  counts: CountsSchema,
  /** 기존 꼴 said 낱말(처음 나온 차례, 같은 말 하나로). */
  legacySaid: z.array(z.string()),
  /** 앱 said 낱말. */
  appSaid: z.array(z.string()),
  /** 두 판정이 같은 차례에서 함께 인정한 낱말. */
  same: z.array(z.string()),
  /** 한쪽만 인정한 (차례, 낱말) 쌍. */
  oneSide: z.array(OneSideSchema),
  /** 만남 낱말(부르는 쪽이 넘긴 값 그대로). */
  met: z.array(z.string()),
  agreement: z.strictObject({
    withChoice: AgreementValueSchema,
    withoutChoice: AgreementValueSchema,
  }),
});
export type ChatCompareSummary = z.infer<typeof ChatCompareSummarySchema>;

function pushNew(list: string[], words: readonly string[]): void {
  for (const w of words) if (!list.includes(w)) list.push(w);
}

/**
 * 한 수업의 비교 요약. rows 는 그 수업 아이 행의 차례 번호와 chat_judge 다(chat_judge 가 없는 행은 부르는 쪽이 뺀다). 일치 비율 · 같은 낱말 ·
 * 한쪽만의 낱말 · said 낱말은 기존 꼴 판정이 있는 차례(있음)만 센다 — 판정 없음 · 기다림 · 부르지 않음 차례는 분모에서 빼고 수만 적는다.
 * 쌍의 a 는 기존 꼴 said, b 는 앱 said 다. source 는 실제 · 모의 가름이다(부르는 쪽이 정함, 섞지 않는다). 한쪽만의 낱말에 앱 판정의 갈래 ·
 * 고르기 답 표지를 찾을 때는 글자가 같은 앱 낱말을 먼저, 없으면 같은 소리 대표 낱말이 같은 앱 낱말을 쓴다(fix 2 N-3 — 단원에 see · sea 가
 * 함께 있어 앱은 들린 'See.' 를 see 로, 기존 꼴은 sea 로 적은 쌍). homophones 는 판정에 쓴 동음이의어 묶음 그대로다.
 */
export function chatCompareOf({
  rows,
  met,
  source,
  homophones,
}: {
  rows: readonly { row: number; judge: ChatJudge }[];
  met: readonly string[];
  source: ChatCompareSource;
  homophones: readonly (readonly string[])[];
}): ChatCompareSummary {
  const head = homophoneHeadOf(homophones);
  const counts = {
    childTurns: rows.length,
    done: 0,
    failed: 0,
    waiting: 0,
    notCalled: 0,
  };
  const legacySaid: string[] = [];
  const appSaid: string[] = [];
  const same: string[] = [];
  const oneSide: ChatCompareOneSide[] = [];
  const pairs: ChatPair[] = [];
  for (const { row, judge } of rows) {
    const { app, legacy } = judge;
    if (legacy.status === "failed") counts.failed += 1;
    if (legacy.status === "waiting") counts.waiting += 1;
    if (legacy.status === "not_called") counts.notCalled += 1;
    if (legacy.status !== "done") continue;
    counts.done += 1;
    pushNew(legacySaid, legacy.said);
    pushNew(appSaid, app.said);
    // 쌍 낱말의 앱 판정 항목: 글자가 같은 것 먼저, 없으면 같은 소리 대표 낱말이 같은 것
    const entryOf = (word: string) =>
      app.words.find((w) => w.word === word) ??
      app.words.find((w) => head(w.word) === head(word));
    const choice = [...legacy.said, ...app.said].filter(
      (w) => entryOf(w)?.choiceAnswer === true,
    );
    const turnPairs = chatTurnPairsOf({
      a: legacy.said,
      b: app.said,
      choice,
    });
    pairs.push(...turnPairs);
    for (const pair of turnPairs) {
      if (pair.a && pair.b) {
        pushNew(same, [pair.word]);
        continue;
      }
      const entry = entryOf(pair.word);
      const reasons: ChatCompareReason[] = [];
      if (entry?.choiceAnswer === true) reasons.push("choice_answer");
      // 되물린 차례(뒤에 선생님이 되물음)와 되물은 뒤의 답 차례(앞 선생님이 되물음) 모두 앱이 되묻기를 모르는 경우다(spec 8-3 둘째 줄)
      if (legacy.askAgain === true || legacy.afterAskAgain === true)
        reasons.push("ask_again_unknown");
      if (legacy.stuck === true) reasons.push("legacy_stuck");
      if (legacy.help !== null && legacy.help.hintKind !== app.hintKind)
        reasons.push("hint_kind_differs");
      if (app.stuck) reasons.push("app_stuck");
      oneSide.push({
        row,
        word: pair.word,
        side: pair.a ? "legacy_only" : "app_only",
        category: (entry?.category ?? null) as ChatAppCategory | null,
        reasons,
      });
    }
  }
  return {
    source,
    counts,
    legacySaid,
    appSaid,
    same,
    oneSide,
    met: [...met],
    agreement: chatAgreementOf(pairs),
  };
}

// ── 묶음 합계(실제 · 모의 따로) ─────────────────────────────────────────

/** 한 가름(실제 또는 모의)의 합계. 일치 비율은 수업별 비율의 평균이 아니라 쌍 수를 더해 다시 낸다. */
export type ChatCompareTotal = {
  lessons: number;
  counts: ChatCompareSummary["counts"];
  /** 한쪽만의 (차례, 낱말) 쌍 수. */
  oneSide: number;
  agreement: ChatAgreement;
};

function emptyTotal(): ChatCompareTotal {
  return {
    lessons: 0,
    counts: { childTurns: 0, done: 0, failed: 0, waiting: 0, notCalled: 0 },
    oneSide: 0,
    agreement: chatAgreementOf([]),
  };
}

/** 수업별 요약들의 합계를 실제 · 모의로 갈라 낸다(두 가름을 더한 값은 내지 않는다). */
export function chatCompareTotalsOf(
  summaries: readonly ChatCompareSummary[],
): Record<ChatCompareSource, ChatCompareTotal> {
  const out: Record<ChatCompareSource, ChatCompareTotal> = {
    real: emptyTotal(),
    mock: emptyTotal(),
  };
  for (const source of CHAT_COMPARE_SOURCES) {
    const total = out[source];
    const sums = {
      withChoice: { pairs: 0, agreed: 0 },
      withoutChoice: { pairs: 0, agreed: 0 },
    };
    for (const s of summaries) {
      if (s.source !== source) continue;
      total.lessons += 1;
      total.oneSide += s.oneSide.length;
      for (const key of Object.keys(
        total.counts,
      ) as (keyof ChatCompareTotal["counts"])[])
        total.counts[key] += s.counts[key];
      for (const key of ["withChoice", "withoutChoice"] as const) {
        sums[key].pairs += s.agreement[key].pairs;
        sums[key].agreed += s.agreement[key].agreed;
      }
    }
    total.agreement = {
      withChoice: agreementValueOf(
        sums.withChoice.pairs,
        sums.withChoice.agreed,
      ),
      withoutChoice: agreementValueOf(
        sums.withoutChoice.pairs,
        sums.withoutChoice.agreed,
      ),
    };
  }
  return out;
}
