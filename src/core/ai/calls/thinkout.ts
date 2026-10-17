// 생각 꺼내기 규격(6.2 생각 꺼내기 행 · 3.3 생각 꺼내기 문단 · 6.1 프롬프트 캐시 · 6.4 끝 문단 · C63 (4),
// plan-p09b 파일별 값 7). 쓰기 6단계부터 첫 세션에서 턴마다 부른다. 여러 턴 호출이라 자동 캐시를 건다.
import { z } from "zod";
import {
  type ApplyChecksResult,
  buildSystem,
  CallSettingError,
  type CallSpec,
  type ChatMessage,
  COMMON_FIXED_RULES,
  hitUnder,
  type LevelContext,
  levelVariable,
  type SettingValues,
} from "@/core/ai/calls/common";
import type { CheckField } from "@/core/ai/output-check";
import {
  THINKOUT_OPTIONS,
  THINKOUT_STARTERS,
  THINKOUT_WORDS,
} from "@/core/seed/structure";

export type ThinkoutInput = LevelContext & {
  task: string;
  example: string;
  hints: string[];
  /** 이번 수업 배정 새 단어(시드 차례). */
  newWords: string[];
  /** 그 단계 어휘 범위의 낱말(소문자, P9c 가 vocab 에서 채움). */
  allowedWords: ReadonlySet<string>;
  /** 앞 턴들: 토리 글(정규화한 값의 historyEntry)과 아이 답. */
  history: { assistant: string; answer: string }[];
  /** 지금 턴(1부터). */
  turn: number;
};

export type ThinkoutRules = { maxTurns: number; lastTurn: boolean };

const MAX_TURNS_KEY = "writing.thinkout_max_turns";
const MaxTurnsSchema = z.int().min(1);

/** 마지막 턴에만 붙이는 말(바뀌는 값은 마지막 사용자 메시지에만, 6.1). */
export const THINKOUT_LAST_TURN_NOTE =
  "This is the last turn: set done to true and fill summary, words and starters.";
/** 첫 턴의 사용자 메시지. */
const START_MESSAGE = "Start: ask the first question.";

const thinkoutWire = z
  .object({
    question: z
      .string()
      .describe("Korean, 해요체, one question. Empty when done"),
    options: z
      .array(z.string().min(1))
      .max(THINKOUT_OPTIONS)
      .describe(
        `${THINKOUT_OPTIONS} short Korean options when asking. Empty when done`,
      ),
    done: z.boolean(),
    summary: z
      .string()
      .describe(
        "Korean summary of the child's ideas when done. Empty otherwise",
      ),
    words: z
      .array(z.string().min(1))
      .max(THINKOUT_WORDS.max)
      .describe(
        `${THINKOUT_WORDS.min}-${THINKOUT_WORDS.max} English words for writing when done, new words first. Empty otherwise`,
      ),
    starters: z
      .array(z.string().min(1))
      .max(THINKOUT_STARTERS)
      .describe(
        `${THINKOUT_STARTERS} English sentence starters when done. Empty otherwise`,
      ),
  })
  .meta({ title: "thinkout" });

export type ThinkoutOutput = z.infer<typeof thinkoutWire>;

const thinkoutLoose = z.object({
  question: z.string(),
  options: z.array(z.string()),
  done: z.boolean(),
  summary: z.string(),
  words: z.array(z.string()),
  starters: z.array(z.string()),
});

const THINKOUT_RULES: readonly string[] = [
  "Help the child find ideas before writing (writing level 6 and above).",
  "Ask one question at a time in Korean (해요체). Narrow the idea to a size the child can write with the learning element of this level.",
  `Give ${THINKOUT_OPTIONS} short Korean options. The child taps an option or types a short Korean answer.`,
  "Never ask for a school name, address, phone number or other personal information.",
  `On the last turn, or when there are enough ideas, set done to true and give a Korean summary of the ideas, ${THINKOUT_WORDS.min}-${THINKOUT_WORDS.max} English words for writing (within the level's vocabulary, the new words of this lesson first) and ${THINKOUT_STARTERS} English sentence starters (within the level's sentence length).`,
  "Fields not used in a turn are empty strings or empty lists.",
];

/** 앞 턴의 표시(마지막 턴 말은 붙지 않는다 — 지금 턴만 마지막일 수 있다). */
function turnMarker(turn: number, rules: ThinkoutRules): string {
  return `(Turn ${turn} / ${rules.maxTurns})`;
}

/** 턴 번호는 input.turn 하나다. 기록 수와 어긋나면 던진다(검토 M-2, request.ts 의 목적 검사와 같은 꼴). */
function assertTurn(input: ThinkoutInput): void {
  if (input.turn !== input.history.length + 1) {
    throw new RangeError(
      `생각 꺼내기 턴(${input.turn})이 앞 턴 기록 수(${input.history.length}) + 1 과 다르다`,
    );
  }
}

function wordsOf(
  answerWords: readonly string[],
  input: ThinkoutInput,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (word: string) => {
    const key = word.toLowerCase();
    if (word === "" || seen.has(key)) return;
    seen.add(key);
    out.push(word);
  };
  for (const word of input.newWords) add(word);
  for (const word of answerWords) {
    if (input.allowedWords.has(word.toLowerCase())) add(word);
  }
  return out.slice(0, THINKOUT_WORDS.max);
}

export const thinkoutSpec: CallSpec<
  ThinkoutInput,
  ThinkoutOutput,
  ThinkoutRules
> = {
  purpose: "thinkout",
  title: "thinkout",
  wireSchema: () => thinkoutWire,
  looseSchema: thinkoutLoose,
  multiTurn: true,
  enumPaths: [],
  settingSchemas: { [MAX_TURNS_KEY]: MaxTurnsSchema },
  rulesOf: (values: SettingValues, input) => {
    const parsed = MaxTurnsSchema.safeParse(values[MAX_TURNS_KEY]);
    if (!parsed.success) {
      throw new CallSettingError(MAX_TURNS_KEY, "1 이상 정수가 아니다");
    }
    assertTurn(input);
    return { maxTurns: parsed.data, lastTurn: input.turn >= parsed.data };
  },
  mask: (input, masker) => ({
    ...input,
    history: input.history.map((entry) => ({
      assistant: entry.assistant,
      answer: masker(entry.answer).text,
    })),
  }),
  // 시스템 프롬프트는 대화 끝까지 같다(턴 · 기록을 넣지 않는다)
  system: (input) =>
    buildSystem({
      fixed: [...COMMON_FIXED_RULES, ...THINKOUT_RULES],
      variable: [
        ...levelVariable(input),
        ["Lesson task", input.task],
        ["Lesson example", input.example],
        ["Lesson hints", input.hints.join("; ")],
        ["New words of this lesson", input.newWords.join(", ")],
      ],
    }),
  messages: (input, rules): ChatMessage[] => {
    assertTurn(input);
    // 사용자 메시지 차례 = 턴 번호(1부터). 마지막 사용자 메시지가 input.turn 이고 바뀌는 값은 여기에만(6.1)
    const userTexts = [
      START_MESSAGE,
      ...input.history.map((entry) => entry.answer),
    ];
    const messages: ChatMessage[] = [];
    userTexts.forEach((text, index) => {
      const turn = index + 1;
      if (index > 0) {
        messages.push({
          role: "assistant",
          content: input.history[index - 1]?.assistant ?? "",
        });
      }
      const marker = turnMarker(turn, rules);
      const current = turn === input.turn;
      messages.push({
        role: "user",
        content:
          current && rules.lastTurn
            ? `${text}\n${marker}\n${THINKOUT_LAST_TURN_NOTE}`
            : `${text}\n${marker}`,
      });
    });
    return messages;
  },
  validate: (value, _input, rules) => {
    const issues: string[] = [];
    // 마지막 턴이면 done 이 거짓이어도 끝낸 턴으로 본다 — 검증에 걸려야 1회 다시 요청한다(6.1, 검토 I-3)
    const done = value.done || rules.lastTurn;
    if (!done) {
      if (value.question.trim() === "") issues.push("질문이 비었다");
      if (value.options.length !== THINKOUT_OPTIONS) {
        issues.push("보기 수가 규격과 다르다");
      }
    } else {
      if (value.summary.trim() === "") issues.push("요약이 비었다");
      if (
        value.words.length < THINKOUT_WORDS.min ||
        value.words.length > THINKOUT_WORDS.max
      ) {
        issues.push("단어 수가 규격 밖이다");
      }
      if (value.starters.length !== THINKOUT_STARTERS) {
        issues.push("틀 수가 규격과 다르다");
      }
    }
    return issues;
  },
  normalize: (loose, input, rules) => {
    const parsed = thinkoutLoose.safeParse(loose);
    if (!parsed.success) return null;
    const answer = parsed.data;
    // 마지막 턴이면 끝낸다
    const done = answer.done || rules.lastTurn;
    if (done) {
      if (answer.summary === "") return null;
      return {
        question: "",
        options: [],
        done: true,
        summary: answer.summary,
        words: wordsOf(answer.words, input),
        starters: answer.starters
          .filter((s) => s !== "")
          .slice(0, THINKOUT_STARTERS),
      };
    }
    if (answer.question === "") return null;
    return {
      question: answer.question,
      options: answer.options
        .filter((o) => o !== "")
        .slice(0, THINKOUT_OPTIONS),
      done: false,
      summary: "",
      words: [],
      starters: [],
    };
  },
  checkFields: (value): CheckField[] => [
    { path: "question", lang: "ko", text: value.question },
    ...value.options.map(
      (text, i): CheckField => ({ path: `options.${i}`, lang: "ko", text }),
    ),
    { path: "summary", lang: "ko", text: value.summary },
    ...value.words.map(
      (text, i): CheckField => ({ path: `words.${i}`, lang: "en", text }),
    ),
    ...value.starters.map(
      (text, i): CheckField => ({ path: `starters.${i}`, lang: "en", text }),
    ),
  ],
  applyChecks: (value, hits): ApplyChecksResult<ThinkoutOutput> => {
    if (hits.size === 0) return { value, changed: false, fatal: false };
    return {
      value: {
        question: value.question,
        options: value.options.filter(
          (_, i) => !hitUnder(hits, `options.${i}`),
        ),
        done: value.done,
        summary: hitUnder(hits, "summary") ? "" : value.summary,
        words: value.words.filter((_, i) => !hitUnder(hits, `words.${i}`)),
        starters: value.starters.filter(
          (_, i) => !hitUnder(hits, `starters.${i}`),
        ),
      },
      changed: true,
      // 질문이 걸리면 그 턴은 실패다(P11 은 '이번에는 바로 써 볼까요' 초고 화면으로, 8절)
      fatal: hitUnder(hits, "question"),
    };
  },
  historyEntry: (value) =>
    JSON.stringify({
      question: value.question,
      options: value.options,
      done: value.done,
      summary: value.summary,
      words: value.words,
      starters: value.starters,
    }),
};
