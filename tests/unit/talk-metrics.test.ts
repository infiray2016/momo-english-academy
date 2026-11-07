// 회화 대본 지표(talk:metrics — 'AI 몫 넓힘' spec 설계 8 · plan 묶음 4-나): 작은 보고 표본으로 지표마다 분자 · 분모, 기술 오류 자리 빼기,
// 분모 10 아래 건수 처리, 기준선 대비 · 기준 판정 · 기회 알림, 표 · 검토 목록 · 명령 실행(네트워크 · 파일 없음)을 본다.
import { describe, expect, it } from "vitest";
import type { TalkLessonOutput } from "@/core/ai/calls/talk-lesson";
import {
  addTally,
  COUNT_BELOW,
  englishLinesIn,
  FIRST_SENTENCE_SLACK_MS,
  isFixedTurn,
  isSelfLine,
  kitOf,
  loadMetricsSeed,
  type MetricsKit,
  metricsBaseOf,
  metricsMarkdown,
  metricsOf,
  type ObserveJson,
  offbandIn,
  parseMetricsArgs,
  parseObserveJson,
  promptExampleSentences,
  ratioText,
  reviewMarkdown,
  runTalkMetrics,
  SELF_LINE_KEY,
  soundOutsideOf,
  tallyRun,
  turnFactsOf,
  verdictRows,
  withinMax,
} from "../../scripts/talk-metrics";
import {
  CHANCE_ALERT_DEFAULT,
  CHILD_DONT_KNOW_TEXT,
  CHILD_NOSPEECH_TEXT,
  JUDGE_KEYS,
  type RunReport,
  type TurnRecord,
  type TurnUsage,
} from "../../scripts/talk-observe";

const ROOT = process.cwd();
/**
 * 목록 셋(감탄 · 수업 말 허용 목록 · 상황 줄 · 신호 말)은 살아 있는 시드 목록을 읽지 않고 이 고정 표본을 쓴다 — 목록 내용이 바뀌어도 지표 셈의
 * 증명이 흔들리지 않게(실제 목록은 묶음 5 의 넓이 시험이 본다). 카드 · 어휘 · 설정은 시드 그대로다.
 */
const FIXED_LISTS = {
  allowed: ["oops", "yay", "together", "hear", "again"],
  situationLines: [
    "Okay! Let's talk!",
    "Let's say it together!",
    "Good try! Let's go on.",
    "Oops, my ears! Let's go on.",
  ],
  cueLines: ["Listen and say it!", "Your turn!", "Say it with me!"],
};
const seed = { ...loadMetricsSeed(ROOT), ...FIXED_LISTS };
const SCRIPT = {
  name: "l3-sample",
  title: "표본",
  level: 3,
  unit: 1,
  lesson: 1,
  teacher: "mina",
};
const PROMPT =
  "Examples: 'Good to hear! Let's learn some new words!' and 'That's okay! Let's say it together.' Never copy \"Great job today!\" as is.";
const Q1 = "Rice and fish for lunch! What do you do at the table?";
const Q2 = "The sun is hot! What do you do with the juice?";

function usage(over: Partial<TurnUsage> = {}): TurnUsage {
  return {
    model: "claude-sonnet-5-5",
    stopReason: "end_turn",
    verdict: "strict",
    inputTokens: 5000,
    outputTokens: 300,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0.005,
    latencyMs: 2000,
    firstSentenceMs: 1000,
    requestId: "req",
    checkHits: 0,
    ...over,
  };
}

type TurnOver = Partial<Omit<TurnRecord, "move">> & {
  move?: Partial<TurnRecord["move"]>;
};

/** 보고 한 줄(빈 값이 기본 — 말로 답한 대화 토막 AI 차례). */
function turn(no: number, over: TurnOver = {}): TurnRecord {
  const { move, ...rest } = over;
  const teacher = over.teacher ?? "";
  return {
    no,
    child: "I eat rice.",
    segment: "talk",
    plan: "ai · 질문",
    teacher,
    attach: [],
    toriKo: null,
    sound: {},
    recast: "",
    explanation: "",
    replaced: null,
    dropped: [],
    returned: null,
    sameQuestion: null,
    judge: Object.fromEntries(
      JUDGE_KEYS.map((k) => [k, { expect: null, auto: null }]),
    ) as TurnRecord["judge"],
    recastCheck: null,
    usage: usage(),
    failure: null,
    flags: [],
    techError: null,
    design: null,
    output: { tori_en: teacher } as unknown as TalkLessonOutput,
    userMessage: "",
    appAfter: [],
    childKind: "answer",
    stuck: { ai: false, app: false, overridden: false },
    reask: null,
    ...rest,
    move: {
      kind: "ai",
      next: "follow_up",
      why: null,
      item: { kind: "none", no: 0 },
      app: [],
      stage: 0,
      ...move,
    },
  };
}

function runOf(turns: TurnRecord[], over: Partial<RunReport> = {}): RunReport {
  return {
    script: SCRIPT,
    model: "claude-sonnet-5-5",
    effort: "low",
    thinking: "between_tools",
    round: 1,
    systemPrompt: PROMPT,
    overrides: [],
    summaries: [],
    turns,
    opening: ["Hello, {NAME}! How are you?"],
    stopped: null,
    ...over,
  };
}

function kit(over: Partial<MetricsKit> = {}): MetricsKit {
  const k = kitOf(seed, runOf([]));
  if (!k) throw new Error("3단계 단원 1 수업 1 재료가 없다");
  return { ...k, ...over };
}

const jsonOf = (runs: RunReport[], rounds = 1): ObserveJson => ({
  date: "2026-11-07",
  effort: "low",
  rounds,
  runs,
});

const nospeech = (no: number, teacher: string, over: TurnOver = {}) =>
  turn(no, {
    child: CHILD_NOSPEECH_TEXT,
    teacher,
    techError: { nospeech: true, call: null },
    ...over,
  });

describe("재료", () => {
  it("프롬프트의 따옴표 예 문장을 문장마다 정규화해 꺼낸다(안의 줄임꼴 ' 는 지난다)", () => {
    const s = promptExampleSentences(PROMPT);
    expect(s).toContain("good to hear");
    expect(s).toContain("let us learn some new words");
    expect(s).toContain("that is okay");
    expect(s).toContain("let us say it together");
    expect(s).toContain("great job today");
  });

  it("목록 JSON 의 en 글을 모으고 forbidden 칸은 뺀다", () => {
    expect(
      englishLinesIn({
        lines: { close: [{ en: "Good try!", ko: "잘했어!" }] },
        forbidden: { all: ["that's wrong"] },
      }),
    ).toEqual(["Good try!"]);
  });

  it("고정 문장은 프롬프트 예 · 카드 안전한 대사 · 칭찬 대사 · 상황 줄 · 신호 말이다", () => {
    const k = kit();
    expect(k.fixed.has("good to hear")).toBe(true);
    expect(k.fixed.has("nice")).toBe(true);
    expect(k.fixed.has("oops my ears")).toBe(true);
    expect(k.fixed.has("your turn")).toBe(true);
    // 3단계 단원 1 수업 1 카드는 개정 5 부터 장면 여는 질문 칸이 있다(C206, 묶음 3-(다))
    expect(k.sceneOpener).not.toBeNull();
    expect(k.selfLineEvery).toBe(3);
  });

  it("자기 이야기 빈도 참고값은 대본 덮음이 설정 파일보다 앞선다", () => {
    const k = kitOf(
      seed,
      runOf([], {
        overrides: [{ key: SELF_LINE_KEY, value: 5, from: "set", known: true }],
      }),
    );
    expect(k?.selfLineEvery).toBe(5);
  });

  it("시드에 카드가 없는 대본은 세지 않고 건너뛴 대본으로 적는다", () => {
    const m = metricsOf(
      jsonOf([runOf([turn(1, { teacher: "Hi!" })])]),
      () => null,
    );
    expect(m.skipped).toEqual(["l3-sample"]);
    expect(m.total.fixed).toEqual({ num: 0, den: 0 });
  });
});

describe("고정 문장 차례 가름(M-5 — (가) 앱이 상황 줄로 바꿈 · (나) AI 글이 예문 그대로)", () => {
  it("앱이 넣은 상황 줄은 AI 몫에서 빼고 (가) 건수로만 세며, AI 몫이 예문 그대로인 차례만 (나) 분자다", () => {
    const run = runOf([
      // r2 꼴: AI 맞장구 + 앱 넘김 줄 — AI 몫 'Good to hear!' 는 예문이라 (나), 앱 줄이 있어 (가)
      turn(1, {
        segment: "greeting_end",
        child: "I am fine.",
        teacher: "Good to hear! Let's talk!",
        situationLines: ["Let's talk!"],
      }),
      // 앱이 통째로 바꾼 차례 — AI 몫이 없어 (나) 아님, (가)
      turn(2, {
        teacher: "Okay! Let's talk!",
        situationLines: ["Okay! Let's talk!"],
      }),
      // AI 자기 말 — 둘 다 아님
      turn(3, { teacher: "Yum, rice! Do you like fish?", situationLines: [] }),
    ]);
    const { tally, facts } = tallyRun(run, kit());
    // 1 은 AI 몫이 맞장구 'Good to hear!' 뿐이라 (나)에서 빼고 건수로(판정 r3 M-r3-5)
    expect(tally.fixed).toEqual({ num: 0, den: 3 });
    expect(tally.fixedReaction).toBe(1);
    expect(tally.appSituation).toBe(2);
    expect(facts.map((f) => f.aiOwn)).toEqual([
      ["Good to hear!"],
      [],
      ["Yum, rice!", "Do you like fish?"],
    ]);
    // 넘김 예문을 AI 가 그대로 쓴 차례는 (나)다
    const copied = tallyRun(
      runOf([
        turn(1, {
          segment: "greeting_end",
          teacher: "Good to hear! Let's learn some new words!",
          situationLines: [],
        }),
      ]),
      kit(),
    ).tally;
    expect(copied.fixed).toEqual({ num: 1, den: 1 });
    expect(copied.fixedReaction).toBe(0);
  });

  it("situationLines 칸이 없는 옛 보고는 표시 글('상황 줄로 바꿈' · '반응 자리에 상황 줄')로 앱 줄을 읽는다", () => {
    const run = runOf([
      turn(1, {
        teacher: "Okay! Let's talk!",
        flags: ['상황 줄로 바꿈("Good to hear!" → "Okay! Let\'s talk!")'],
      }),
      turn(2, {
        teacher: "Oops, my ears! Let's go on.",
        flags: ['반응 자리에 상황 줄("Oops, my ears! Let\'s go on.")'],
      }),
    ]);
    const { tally } = tallyRun(run, kit());
    expect(tally.appSituation).toBe(2);
    expect(tally.fixed.num).toBe(0);
  });
});

describe("고정 문장 차례 · 되풀이 · 기술 오류 자리", () => {
  it("AI 문장이 모두 고정 문장인 차례만 센다(짧은 반응 하나가 같은 것만으로는 아님)", () => {
    const k = kit();
    expect(
      isFixedTurn(k, ["Good to hear!", "Let's learn some new words!"]),
    ).toBe(true);
    expect(isFixedTurn(k, ["Nice!"])).toBe(true);
    expect(isFixedTurn(k, ["Nice!", "Do you like fish?"])).toBe(false);
    expect(isFixedTurn(k, [])).toBe(false);
  });

  it("분자 · 분모에서 들리지 않음 · 호출 실패 차례를 빼고 따로 센다", () => {
    const run = runOf([
      turn(1, {
        segment: "greeting_end",
        child: "I am fine.",
        teacher: "Good to hear! Let's learn some new words!",
      }),
      turn(2, { teacher: "Yum, rice! Do you like fish?" }),
      nospeech(3, "Oops, my ears! Let's go on."),
      turn(4, {
        teacher: "Oh, okay!",
        usage: null,
        failure: "호출 실패(500)",
        output: null,
        techError: { nospeech: false, call: "failed" },
      }),
      turn(5, { teacher: "Nice! Do you eat fish?" }),
    ]);
    const { tally } = tallyRun(run, kit());
    expect(tally.fixed).toEqual({ num: 1, den: 3 });
    expect(tally.appSituation).toBe(0);
    expect(tally.nospeech).toBe(1);
    expect(tally.nospeechFixed).toBe(1);
    expect(tally.callTech).toBe(1);
  });

  it("되풀이는 한 대화에서 상황 차례 반응 전체가 같은 글인 수다(들리지 않음 차례 포함)", () => {
    const run = runOf([
      nospeech(1, "I couldn't hear you. That's okay! Let's move on."),
      turn(2, { teacher: "Yum, rice! Do you like fish?" }),
      nospeech(3, "I couldn't hear you. That's okay! Let's move on."),
      turn(4, {
        child: CHILD_DONT_KNOW_TEXT,
        teacher: "That's okay! Let's move on.",
        move: { stage: 3, kind: "card_slot" },
      }),
      turn(5, {
        child: CHILD_DONT_KNOW_TEXT,
        teacher: "That's okay! Let's move on.",
        move: { stage: 3, kind: "card_slot" },
      }),
    ]);
    const { tally, facts } = tallyRun(run, kit());
    expect(tally.repeats).toBe(2);
    expect(facts[2]?.flags).toContain("상황 반응 되풀이");
  });
});

describe("틀에 박힌 맞장구 꼴 · 이어짐", () => {
  it("아이 말을 받지 않은 일반 맞장구 한 문장 + 질문 하나만 센다", () => {
    const run = runOf([
      turn(1, { teacher: "Nice! Do you like fish?" }),
      turn(2, { teacher: "Yum, rice! Do you like fish?" }),
      turn(3, { teacher: "Me too! Do you like fish?" }),
      turn(4, { teacher: "Great! You eat rice. Do you like fish?" }),
      turn(5, {
        teacher: "Good job!",
        attach: [Q2],
        move: { kind: "card_slot" },
      }),
      turn(6, { teacher: "Wow, nice!" }),
    ]);
    const { tally } = tallyRun(run, kit());
    // 6 은 질문이 없어 분모 밖, 5 는 카드 자리여도 질문 하나로 끝나 셈 안(붙인 줄의 질문)
    expect(tally.stock).toEqual({ num: 2, den: 5 });
    expect(tally.stockSpoke).toEqual({ num: 2, den: 5 });
  });

  it("이어짐 자동 보조: 아이 말 내용어(원형 포함)가 선생님 말에 다시 나온 차례 ÷ 말로 답한 차례", () => {
    const run = runOf([
      turn(1, { child: "I like dogs.", teacher: "Oh, a dog! Is it big?" }),
      turn(2, { child: "I eat rice.", teacher: "Nice! What do you drink?" }),
      turn(3, {
        child: CHILD_DONT_KNOW_TEXT,
        teacher: "That's okay! Let's say it together.",
        move: { stage: 1 },
      }),
      turn(4, {
        child: "Rice.",
        teacher: "Yes, rice!",
        stuck: { ai: true, app: true, overridden: false },
      }),
    ]);
    const { tally } = tallyRun(run, kit());
    expect(tally.linked).toEqual({ num: 1, den: 2 });
  });

  it("예 · 아니요 답은 바로 앞 질문의 명사 · 형용사로 뜻을 받았는지 본다", () => {
    const run = runOf(
      [
        turn(1, {
          child: "Yes!",
          teacher: "Yay, the lake! What do you do there?",
        }),
        turn(2, { child: "Yes.", teacher: "Nice! What do you eat?" }),
      ],
      { opening: ["We are at the lake! Do you like the lake?"] },
    );
    const k = kit();
    const facts = turnFactsOf(run, k);
    expect([...(facts[0]?.childKeys ?? [])]).toContain("lake");
    const { tally } = tallyRun(run, k);
    expect(tally.linked).toEqual({ num: 1, den: 2 });
  });
});

describe("범위 밖 낱말 · 답 글", () => {
  it("질문 밖 원문 문장의 범위 밖 내용어 ÷ 내용어(닫힌 품사 한 낱말 · 아이가 먼저 말한 낱말은 범위 안)", () => {
    const k = kit();
    expect(offbandIn(k, "Delicious rice!", new Set())).toEqual({
      content: 2,
      off: ["delicious"],
    });
    expect(offbandIn(k, "Rice is good too!", new Set()).off).toEqual([]);
    expect(offbandIn(k, "A volcano, wow!", new Set(["volcano"])).off).toEqual(
      [],
    );
    expect(offbandIn(k, "That's okay!", new Set())).toEqual({
      content: 0,
      off: [],
    });
  });

  it("아이에게 나간 글을 세고 질문 문장은 뺀다 · 걸린 낱말 목록을 모으며, 원문(나가지 않은 글 포함) 수는 따로 보인다(판정 r3 M-r3-5)", () => {
    const run = runOf([
      turn(1, {
        teacher: "Delicious rice! Do you like delicious fish?",
        output: {
          tori_en: "Delicious rice! A volcano! Do you like delicious fish?",
        } as unknown as TalkLessonOutput,
      }),
    ]);
    const { tally, facts } = tallyRun(run, kit());
    // 나간 'Delicious rice!' 2 → 내용어 2, 범위 밖 delicious(5단계). 지워진 'A volcano!' 의 volcano 는 원문 수에만 든다
    expect(tally.offband).toEqual({ num: 1, den: 2 });
    expect(tally.offbandWords).toEqual({ delicious: 1 });
    expect(tally.offbandRaw).toBe(2);
    expect(facts[0]?.flags).toContain("범위 밖 낱말(delicious)");
  });

  it("받침 · 들리지 않음 차례에서 답 예시 내용어(질문 글에 없는 것)가 든 문장을 원문 · 나간 것으로 센다", () => {
    const run = runOf(
      [
        turn(1, {
          child: CHILD_DONT_KNOW_TEXT,
          teacher: "That's okay!",
          output: {
            tori_en: "That's okay! You eat rice and fish!",
          } as unknown as TalkLessonOutput,
          sound: { answer: "We eat rice and fish." },
          move: { stage: 1 },
          appAfter: [],
        }),
        nospeech(2, "Oops! You drink the juice.", { attach: [Q2] }),
      ],
      { opening: [Q1] },
    );
    const { tally } = tallyRun(run, kit());
    // 1: 질문 글에 rice · fish 가 있어 답 글 낱말은 eat 뿐 → 원문 'You eat rice and fish!' 1 · 나간 0
    // 2: 앞 질문은 1 의 응답(That's okay!) — 카드 질문이 없어 답 예시를 모르면 세지 않는다
    expect(tally.answerRaw).toBe(1);
    expect(tally.answerSent).toBe(0);
  });

  it("답 소리가 없으면 앞 선생님 글에 든 카드 질문의 답 예시를 쓴다", () => {
    const run = runOf(
      [
        turn(1, {
          child: CHILD_DONT_KNOW_TEXT,
          teacher: "It's okay! I drink the juice.",
          move: { stage: 2, kind: "card_slot" },
          attach: ["Do you like juice?"],
        }),
      ],
      { opening: [Q2] },
    );
    const { tally, facts } = tallyRun(run, kit());
    expect(tally.answerSent).toBe(1);
    expect(facts[0]?.flags).toContain("나간 답 글");
  });
});

describe("소리 줄 자리 · 신호 말 겹침", () => {
  it("설계 4 표: 선택지는 받침 둘째, 따라 할 말 · 답은 받침 첫째 · 셋째 · 들리지 않음 · 꺼내기에서만", () => {
    expect(
      soundOutsideOf(
        turn(1, { sound: { choices: ["It is cold.", "It is hot."] } }),
        3,
      ),
    ).toBe(1);
    expect(
      soundOutsideOf(
        turn(1, { sound: { choices: ["a", "b"] }, move: { stage: 2 } }),
        3,
      ),
    ).toBe(0);
    expect(
      soundOutsideOf(
        turn(1, { sound: { model: "I eat rice." }, move: { stage: 1 } }),
        3,
      ),
    ).toBe(0);
    expect(
      soundOutsideOf(
        turn(1, {
          sound: { model: "I eat rice." },
          move: { next: "introduce" },
        }),
        3,
      ),
    ).toBe(0);
    expect(
      soundOutsideOf(
        turn(1, { sound: { model: "I eat rice.", answer: "We eat." } }),
        3,
      ),
    ).toBe(2);
    expect(
      soundOutsideOf(
        turn(1, {
          sound: { answer: "We eat." },
          techError: { nospeech: true, call: null },
        }),
        3,
      ),
    ).toBe(0);
    expect(
      soundOutsideOf(
        turn(1, { sound: { choices: ["a", "b"] }, move: { next: "required" } }),
        1,
      ),
    ).toBe(0);
  });

  it("한 차례에 신호 말이 둘 들리면(AI 신호 구 + 앱 신호 말 줄) 겹침 한 건", () => {
    const run = runOf([
      turn(1, {
        teacher: "Great! Listen and say.",
        attach: ["Your turn!"],
        sound: { model: "I eat rice." },
        move: { stage: 1 },
      }),
      turn(2, { teacher: "Nice!", attach: ["Your turn!"], move: { stage: 1 } }),
    ]);
    const { tally } = tallyRun(run, kit());
    expect(tally.cueOverlap).toBe(1);
    expect(tally.soundOutside).toBe(0);
  });
});

describe("장면 여는 질문 뒤", () => {
  it("장면 여는 질문에 말로 답한 수가 분모, 그 뒤 첫 AI 차례가 이어 물은 수가 분자(건수)", () => {
    const scene = "We are at the lake! Do you like the lake?";
    const k = kit({ sceneOpener: "we are at the lake do you like the lake" });
    const run = runOf([
      turn(1, {
        segment: "greeting_end",
        child: "I am fine.",
        teacher: "Good to hear!",
        appAfter: [scene],
      }),
      turn(2, { child: "Yes!", teacher: "Yay! Do you swim in the lake?" }),
      turn(3, { child: "No.", teacher: "Okay!", appAfter: [scene] }),
      turn(4, { child: "No.", teacher: "Oh, okay! What do you eat?" }),
    ]);
    const { tally, facts } = tallyRun(run, k);
    expect(tally.scene).toEqual({ num: 1, den: 2 });
    expect(facts[3]?.flags).toContain("장면 여는 질문 뒤 이어 묻지 않음(자동)");
  });
});

describe("선생님 말 양 · 긴 차례", () => {
  it("(1) 선생님 낱말(앱 첫 차례 · AI 글 · 붙인 줄 · 소리 줄 · 앱 다음 차례) ÷ 아이 낱말 (2) 아이 차례 앞 선생님 낱말", () => {
    const run = runOf([
      turn(1, {
        child: "I am fine.",
        segment: "greeting_end",
        teacher: "Good to hear!",
        appAfter: [Q1],
      }),
      turn(2, {
        child: CHILD_DONT_KNOW_TEXT,
        teacher: "That's okay!",
        sound: { answer: "We eat rice and fish." },
        move: { stage: 1 },
      }),
      nospeech(3, "Oops, my ears!"),
    ]);
    const { tally } = tallyRun(run, kit());
    // 앱 첫 차례 'Hello, {NAME}! How are you?' 4(틀 자리 뺌) · 1: 3 + 12 · 2: 2 + 5(답 소리) · 3: 3
    expect(tally.teacherWords).toBe(4 + 15 + 7 + 3);
    expect(tally.childWords).toBe(3);
    expect(tally.techTeacherWords).toBe(3);
    expect(tally.before).toEqual([4, 15, 7]);
  });

  it("㉠ 한두 낱말 답 뒤 둘째 반응이 자기 이야기 · 장면 말 ㉡ 아이 이야기 뒤 이어 묻지 않고 자기 이야기 ㉢ 참고값보다 잦은 자기 이야기", () => {
    const k = kit({ selfLineEvery: 3 });
    const run = runOf([
      turn(1, {
        child: "Juice.",
        teacher: "Oh, juice! The sun is hot! What do you do?",
      }),
      turn(2, {
        child: "Rice.",
        teacher: "Yum, rice! You eat rice! Do you like fish?",
      }),
      turn(3, {
        child: "I have a big dog at home.",
        childKind: "new_topic",
        teacher: "Wow! I like cats. Do you like the lake?",
      }),
      turn(4, {
        child: "I swim.",
        teacher: "I like swimming too! Do you swim?",
      }),
      turn(5, { child: "I eat fish.", teacher: "Fish, yum! Is it big?" }),
    ]);
    const { tally } = tallyRun(run, k);
    expect(tally.longA).toBe(1);
    expect(tally.longB).toBe(1);
    expect(tally.longC).toBe(1);
    expect(tally.selfTurns).toBe(2);
    expect(tally.aiTurns).toBe(5);
    expect(isSelfLine("I see!")).toBe(false);
    expect(isSelfLine("Me too!")).toBe(true);
    expect(isSelfLine("Let's pretend we are ducks!")).toBe(true);
  });
});

describe("호출 · 첫 문장 · 기회", () => {
  it("호출은 부른 차례 수, 재질문 · 기술 오류 자리의 다시 부르기는 따로, 첫 문장은 재질문 차례를 따로 적는다", () => {
    const reask = {
      usage: usage({ costUsd: 0.004 }),
      outcome: "다시 쓴 질문 통과",
      firstToriEn: "",
      firstFail: { question: "", reason: "offband", words: [] },
      retryToriEn: "",
      retryFail: null,
    } as TurnRecord["reask"];
    const run = runOf([
      turn(1, { teacher: "Nice!", usage: usage({ firstSentenceMs: 900 }) }),
      turn(2, {
        teacher: "Nice!",
        usage: usage({ firstSentenceMs: 1500 }),
        reask,
      }),
      nospeech(3, "Oops!", { usage: usage({ firstSentenceMs: 1200 }), reask }),
      turn(4, {
        teacher: "",
        usage: null,
        failure: "호출 실패(529)",
        output: null,
        techError: { nospeech: false, call: "failed" },
      }),
    ]);
    const m = metricsOf(jsonOf([run]), () => kit());
    expect(m.total.calls).toEqual({ calls: 4, perRound: 4, reasks: 2 });
    expect(m.total.tech.recalls).toBe(1);
    expect(m.total.firstSentence.withoutReask.p95).toBe(900);
    expect(m.total.firstSentence.reask).toEqual({ p50: 1200, p95: 1500, n: 2 });
    expect(m.total.firstSentence.p95).toBe(1500);
    expect(m.total.ops.costUsd).toBeCloseTo(0.005 * 3 + 0.004 * 2, 6);
  });

  it("다룬 필수 질문은 카드 항목(앱 첫 질문 · 질문이 있는 차례의 move.item)을 바퀴마다 한 번씩 센다", () => {
    const run = runOf([
      turn(1, { segment: "greeting_end", teacher: "Good!", appAfter: [Q1] }),
      turn(2, {
        teacher: "Nice!",
        attach: [Q2],
        move: { kind: "card_slot", item: { kind: "required", no: 2 } },
      }),
      turn(3, {
        teacher: "Yum! What do they do at the lake?",
        move: { item: { kind: "more", no: 1 } },
      }),
      turn(4, {
        teacher: "Nice!",
        move: { item: { kind: "required", no: 2 } },
      }),
    ]);
    const { tally } = tallyRun(run, kit());
    expect(tally.required).toBe(2);
    expect(tally.more).toBe(1);
  });
});

describe("모으기 · 판정", () => {
  it("분모가 10 아래면 건수, 아니면 백분율 · 상한 판정도 건수로", () => {
    expect(COUNT_BELOW).toBe(10);
    expect(ratioText({ num: 1, den: 4 })).toBe("1건/4(건수)");
    expect(ratioText({ num: 3, den: 30 })).toBe("3/30(10%)");
    expect(withinMax({ num: 1, den: 4 }, 0.1)).toBe(false);
    expect(withinMax({ num: 0, den: 4 }, 0.1)).toBe(true);
    expect(withinMax({ num: 3, den: 30 }, 0.1)).toBe(true);
    expect(withinMax({ num: 0, den: 0 }, 0.1)).toBeNull();
  });

  it("대본마다 두 바퀴를 합친 분자 · 분모, 합계는 대본을 더한 것", () => {
    const r1 = runOf([turn(1, { teacher: "Nice! Do you like fish?" })]);
    const r2 = runOf([turn(1, { teacher: "Yum, rice! Do you like fish?" })], {
      round: 2,
    });
    const other = runOf([turn(1, { teacher: "Nice!" })], {
      script: { ...SCRIPT, name: "l3-other" },
    });
    const m = metricsOf(jsonOf([r1, r2, other], 2), () => kit());
    const sample = m.scripts.find((s) => s.name === "l3-sample")?.values;
    expect(sample?.runs).toBe(2);
    expect(sample?.stock).toEqual({ num: 1, den: 2 });
    expect(sample?.calls.perRound).toBe(1);
    // 'Nice!' 만인 차례는 맞장구만 예문과 같은 차례라 (나)에서 빼고 건수로(판정 r3 M-r3-5)
    expect(m.total.fixed).toEqual({ num: 0, den: 3 });
    expect(m.total.fixedReaction).toBe(1);
    expect(m.total.runs).toBe(3);
    const t = addTally(tallyRun(r1, kit()).tally, tallyRun(r2, kit()).tally);
    // 고정 표본 허용 목록에 yum 이 없어 r2 의 'Yum, rice!' 가 범위 밖 한 낱말 — 더한 셈이 낱말 목록을 합친다
    expect(t.offbandWords).toEqual({ yum: 1 });
  });

  it("기준선 대비: 맞장구 꼴이 고침 전보다 낮으면 통과, 첫 문장 p95 가 0.3초 넘게 늦거나 호출 수가 다르면 기준 밖, 기회 알림", () => {
    const now = runOf([
      turn(1, {
        teacher: "Yum, rice! Do you like fish?",
        usage: usage({ firstSentenceMs: 1000 + FIRST_SENTENCE_SLACK_MS + 1 }),
      }),
    ]);
    const before = runOf([
      turn(1, {
        teacher: "Nice! Do you like fish?",
        move: { item: { kind: "required", no: 1 } },
        usage: usage({ firstSentenceMs: 1000 }),
      }),
      turn(2, {
        teacher: "Nice! Do you like rice?",
        move: { item: { kind: "required", no: 2 } },
      }),
    ]);
    const a = metricsOf(jsonOf([now]), () => kit());
    const b = metricsOf(jsonOf([before]), () => kit());
    const rows = new Map(
      verdictRows(a, b, CHANCE_ALERT_DEFAULT).map((r) => [r.key, r]),
    );
    expect(rows.get("stock")?.verdict).toBe("통과");
    expect(rows.get("firstSentence")?.verdict).toBe("기준 밖");
    expect(rows.get("calls")?.verdict).toContain(
      "기준 밖(l3-sample: 바퀴당 1(고침 전 2))",
    );
    expect(rows.get("chances")?.verdict).toBe("사람 판정 · 알림 1");
    expect(rows.get("linked")?.verdict).toBe("사람 판정");
    const noBase = new Map(
      verdictRows(a, null, CHANCE_ALERT_DEFAULT).map((r) => [r.key, r]),
    );
    expect(noBase.get("stock")?.verdict).toBe("기준선 없음");
    expect(noBase.get("fixed")?.verdict).toBe("통과");
    expect(noBase.get("scene")?.verdict).toBe("해당 없음");
  });

  it("표: 합계 · 대본마다 · 기준선 대비 · 기술 오류 자리 · 범위 밖 낱말 · 사람 판정 칸(비움) · 알림", () => {
    const run = runOf([
      turn(1, {
        teacher: "Nice! Do you like fish?",
        move: { item: { kind: "required", no: 1 } },
      }),
      nospeech(2, "Oops, my ears!"),
    ]);
    const base = runOf([
      turn(1, {
        teacher: "Nice! Do you like fish?",
        move: { item: { kind: "required", no: 1 } },
      }),
      turn(2, {
        teacher: "Nice! Do you like rice?",
        move: { item: { kind: "required", no: 2 } },
      }),
      turn(3, {
        teacher: "Nice! Do you like the lake?",
        move: { item: { kind: "required", no: 3 } },
      }),
    ]);
    const meta = {
      source: "/tmp/now.json",
      date: "2026-11-07",
      effort: "low",
      rounds: 1,
      baseline: "/tmp/base.json",
      chanceAlert: 0.5,
    };
    const md = metricsMarkdown(
      metricsOf(jsonOf([run]), () => kit()),
      metricsOf(jsonOf([base]), () => kit()),
      meta,
    );
    expect(md).toContain("## 합계");
    expect(md).toContain(
      "| 고정 문장 차례 (나) AI 글이 예문 · 고정 문장 그대로 | 0건/1(건수) |",
    );
    expect(md).toContain(
      "| 고정 문장 차례 (가) 앱이 상황 줄로 바꾼 차례(설계상 교체, 건수) | 0건 / 1 · 맞장구만 예문과 같은 차례 0건((나)에서 뺌) |",
    );
    // 수치는 검증 기준이지 목표가 아님(C211 (2))을 표 머리글에 둔다
    expect(md).toContain("선생님이 맞출 목표가 아니다(13절 C211 (2))");
    expect(md).toContain("## 대본마다");
    expect(md).toContain("## 기준선 대비(대본마다 — 지금 · 고침 전)");
    expect(md).toContain("| 들리지 않음 차례 · 그중 고정 문장 차례 | 1 · 1 |");
    expect(md).toContain(
      "기회 알림 — l3-sample: 다룬 필수 질문 바퀴당 1 < 고침 전 3 × 0.5",
    );
    expect(md).toContain(
      "| l3-sample | □ | □ | □ | □ | □ | □ | □ | □ | □ | □ |",
    );
    const review = reviewMarkdown(
      metricsOf(jsonOf([run]), () => kit()),
      meta,
    );
    expect(review).toContain("## 걸린 차례");
    expect(review).toContain("| l3-sample · 1 · 2 |");
    expect(review).toContain("기술 오류 자리");
    expect(review).toContain("### l3-sample");
  });
});

describe("명령", () => {
  it("인자: 보고 JSON 하나 · --baseline · --chance-alert(0 초과 1 이하) · --out", () => {
    expect(parseMetricsArgs(["/tmp/r.json"])).toEqual({
      ok: true,
      args: {
        report: "/tmp/r.json",
        baseline: null,
        chanceAlert: 0.5,
        out: null,
      },
    });
    expect(
      parseMetricsArgs([
        "/tmp/r.json",
        "--baseline",
        "/tmp/b.json",
        "--chance-alert",
        "0.6",
        "--out",
        "/tmp/o",
      ]),
    ).toEqual({
      ok: true,
      args: {
        report: "/tmp/r.json",
        baseline: "/tmp/b.json",
        chanceAlert: 0.6,
        out: "/tmp/o",
      },
    });
    expect(parseMetricsArgs([]).ok).toBe(false);
    expect(parseMetricsArgs(["/a.json", "/b.json"]).ok).toBe(false);
    expect(parseMetricsArgs(["/a.json", "--chance-alert", "2"]).ok).toBe(false);
    expect(parseMetricsArgs(["/a.json", "--x", "1"]).ok).toBe(false);
    expect(metricsBaseOf("/tmp/a/2026-11-07-talk-observe-low.json", null)).toBe(
      "/tmp/a/2026-11-07-talk-observe-low",
    );
  });

  it("JSON 보고 꼴이 아니면 그 까닭을 낸다", () => {
    expect(parseObserveJson({ runs: [] }, "/x.json").ok).toBe(false);
    expect(parseObserveJson(jsonOf([runOf([])]), "/x.json").ok).toBe(true);
  });

  it("보고 · 기준선을 읽어 표 · JSON · 검토 목록을 쓰고 표를 출력한다(꼴이 틀리면 2)", () => {
    const files: Record<string, unknown> = {
      "/tmp/r.json": jsonOf([
        runOf([turn(1, { teacher: "Nice! Do you like fish?" })]),
      ]),
      "/tmp/b.json": jsonOf([
        runOf([turn(1, { teacher: "Yum, rice! Do you like fish?" })]),
      ]),
      "/tmp/bad.json": { date: 1 },
    };
    const written = new Map<string, string>();
    const logs: string[] = [];
    const io = {
      readJson: (p: string) => {
        if (!Object.hasOwn(files, p)) throw new Error("없음");
        return files[p];
      },
      write: (p: string, t: string) => written.set(p, t),
      log: (l: string) => logs.push(l),
      kitFor: () => kit(),
    };
    const code = runTalkMetrics(
      {
        report: "/tmp/r.json",
        baseline: "/tmp/b.json",
        chanceAlert: 0.5,
        out: "/tmp/o",
      },
      io,
    );
    expect(code).toBe(0);
    expect([...written.keys()].sort()).toEqual([
      "/tmp/o/r-metrics.json",
      "/tmp/o/r-metrics.md",
      "/tmp/o/r-review.md",
    ]);
    const json = JSON.parse(written.get("/tmp/o/r-metrics.json") ?? "{}") as {
      total: { stock: { num: number; den: number } };
      baselineTotal: { stock: { num: number; den: number } };
      rows: { key: string; verdict: string }[];
      human: Record<string, Record<string, null>>;
    };
    expect(json.total.stock).toEqual({ num: 1, den: 1 });
    expect(json.baselineTotal.stock).toEqual({ num: 0, den: 1 });
    expect(json.rows.find((r) => r.key === "stock")?.verdict).toBe("기준 밖");
    expect(
      Object.values(json.human["l3-sample"] ?? {}).every((v) => v === null),
    ).toBe(true);
    expect(logs[0]).toContain("# 회화 대본 지표");
    expect(
      runTalkMetrics(
        {
          report: "/tmp/bad.json",
          baseline: null,
          chanceAlert: 0.5,
          out: null,
        },
        io,
      ),
    ).toBe(2);
    expect(
      runTalkMetrics(
        {
          report: "/tmp/r.json",
          baseline: "/tmp/none.json",
          chanceAlert: 0.5,
          out: null,
        },
        io,
      ),
    ).toBe(2);
  });
});
