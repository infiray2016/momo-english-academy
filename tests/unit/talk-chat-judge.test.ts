// 회화 이야기 방식의 학습 근거 판정 둘 — 기록 전용(intent 2026-11-13-회화-대화-구조-R spec 설계 8-2 · 8-3 · 8-4, plan 묶음 P4 · AC-8).
// 앱 판정(앱이 아는 것만, 설계 8-3 표의 갈래 다섯과 고르기 답 표지)과 기존 꼴 판정(평가 호출 출력을 지금 새 방식의 판정 함수에 그대로 넘김),
// chat_judge 칸의 꼴. 공식 said_words · '안다' · 단원 통과 · 승급의 입력이 아니다. 동음이의어는 시드 목록 그대로다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TalkChatEvalOutput } from "@/core/ai/calls/talk-chat-eval";
import {
  CHAT_EVAL_FAILURES,
  type ChatEvalState,
  type ChatJudge,
  type ChatJudgeChildRow,
  type ChatJudgeContext,
  type ChatJudgeRow,
  ChatJudgeSchema,
  type ChatJudgeTeacherRow,
  chatJudgeChangesOf,
  chatJudgesOf,
  readChatJudge,
} from "@/core/conversation/chat-judge";
import { HomophonesFileSchema } from "@/core/seed/schema/reference";
import { lemmaLookup } from "@/core/session/attempt";

const HOMOPHONES = HomophonesFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/homophones.json"), "utf8"),
  ),
).groups;
const VOCAB = [
  { word: "go", forms: ["goes", "went", "gone", "going"] },
  { word: "see", forms: ["sees", "saw", "seen", "seeing"] },
  { word: "sea", forms: ["seas"] },
  { word: "beach", forms: ["beaches"] },
  { word: "mountain", forms: ["mountains"] },
  { word: "drink", forms: ["drinks", "drank", "drinking"] },
  { word: "water", forms: [] },
  { word: "milk", forms: [] },
  { word: "swim", forms: ["swims", "swam", "swimming"] },
  { word: "sky", forms: [] },
];
const CTX: ChatJudgeContext = {
  unitWords: VOCAB.map((v) => v.word),
  lemmaOf: lemmaLookup(VOCAB),
  homophones: HOMOPHONES,
  sceneWords: new Set(["beach", "sea", "mountain", "weekend"]),
  spec: { band: "1-3" },
  teacherName: "Mina",
};

function teacher(
  say: string,
  extra: Partial<Omit<ChatJudgeTeacherRow, "role" | "say">> = {},
): ChatJudgeTeacherRow {
  return {
    role: "teacher",
    say,
    listenSentence: null,
    explainShown: false,
    closing: false,
    first: false,
    ...extra,
  };
}

const DONE_OUTPUT: TalkChatEvalOutput = {
  reading: "clear_answer",
  teacher_move: "react_and_follow_up",
  model_sentence: "",
  child_used_on_own: [],
};

function done(partial: Partial<TalkChatEvalOutput> = {}): ChatEvalState {
  return { status: "done", output: { ...DONE_OUTPUT, ...partial } };
}

/** 말 입력 아이 행. 평가 호출 값을 주지 않으면 '기다림'이다. */
function child(
  heard: string,
  extra: Partial<Omit<ChatJudgeChildRow, "role" | "heard">> = {},
): ChatJudgeChildRow {
  return {
    role: "child",
    input: "speech",
    heard,
    opened: [],
    koHelp: null,
    eval: { status: "waiting" },
    ...extra,
  };
}

/** 각 아이 행의 판정(행 차례 그대로, 아이 행만). */
function judges(rows: ChatJudgeRow[]): ChatJudge[] {
  return chatJudgesOf(rows, CTX).map((j) => j.judge);
}

/** 마지막 아이 행의 앱 판정 낱말 → [갈래, 인정, 고르기 답]. */
function appOfLast(rows: ChatJudgeRow[]) {
  const last = judges(rows).at(-1);
  if (last === undefined) throw new Error("아이 행이 없다");
  return Object.fromEntries(
    last.app.words.map((w) => [
      w.word,
      [w.category, w.accepted, w.choiceAnswer],
    ]),
  );
}

describe("앱 판정(설계 8-3 표)", () => {
  it("AC-27h 따라 말하기 요청 뒤 그대로 따라 말함: 'I see the sea.' 는 인정하지 않는다", () => {
    const rows = [
      teacher("Say it with me: I see the sea.", {
        listenSentence: "I see the sea.",
      }),
      child("I see the sea."),
    ];
    expect(appOfLast(rows)).toEqual({
      see: ["repeated_model", false, false],
      sea: ["repeated_model", false, false],
    });
    expect(judges(rows)[0]?.app.said).toEqual([]);
  });

  it("AC-27h 완성 문장 제시 뒤 되풀이(선생님 말의 낱말만): 'Do you go to the beach?' 뒤 'Beach!' 는 보류(인정하지 않음으로 셈)", () => {
    const rows = [teacher("Do you go to the beach?"), child("Beach!")];
    expect(appOfLast(rows)).toEqual({ beach: ["echoed_word", false, false] });
    expect(judges(rows)[0]?.app.said).toEqual([]);
  });

  it("AC-27h 도움받은 상황: 힌트 영어 문장 단을 연 뒤의 말은 인정하지 않고, 뜻 단만 열었으면 인정 후보", () => {
    const say = "What do you drink?";
    const english = [
      teacher(say),
      child("I drink milk.", { opened: ["ko", "sentence"] }),
    ];
    expect(appOfLast(english)).toEqual({
      drink: ["helped", false, false],
      milk: ["helped", false, false],
    });
    expect(judges(english)[0]?.app.hintKind).toBe("english");
    const frame = [
      teacher(say),
      child("I drink milk.", { opened: ["ko", "frame"] }),
    ];
    expect(appOfLast(frame).milk).toEqual(["helped", false, false]);
    const meaning = [teacher(say), child("I drink milk.", { opened: ["ko"] })];
    expect(appOfLast(meaning)).toEqual({
      drink: ["helped", true, false],
      milk: ["helped", true, false],
    });
    expect(judges(meaning)[0]?.app.said).toEqual(["drink", "milk"]);
    expect(judges(meaning)[0]?.app.hintKind).toBe("meaning_only");
  });

  it("AC-27h 도움받은 상황: 한국어 도움이 영어를 알려 줬으면 인정하지 않고, 뜻만 풀이했으면 인정 후보", () => {
    const say = "What do you drink?";
    expect(
      appOfLast([
        teacher(say),
        child("I drink milk.", { koHelp: { taught: "I drink milk." } }),
      ]).milk,
    ).toEqual(["helped", false, false]);
    expect(
      appOfLast([
        teacher(say),
        child("I drink milk.", { koHelp: { taught: null } }),
      ]).milk,
    ).toEqual(["helped", true, false]);
  });

  it("AC-27h 도움받은 상황: 앞 선생님 차례가 막힌 뒤 설명을 보였으면 도움 갈래(뜻 — 인정 후보)", () => {
    const rows: ChatJudgeRow[] = [
      teacher("Do you like the sky?"),
      child("", { input: "dont_know", eval: { status: "not_called" } }),
      teacher("It is up there. Look up!", { explainShown: true }),
      child("I see the sky."),
    ];
    expect(appOfLast(rows)).toEqual({
      see: ["helped", true, false],
      sky: ["helped", true, false],
    });
  });

  it("AC-27h 독립 표현: 'What do you and Coco drink?' 뒤 'Water. Coco drink water.' 는 새 낱말을 더한 말이라 인정 후보", () => {
    const rows = [
      teacher("What do you and Coco drink?"),
      child("Water. Coco drink water."),
    ];
    expect(appOfLast(rows)).toEqual({
      water: ["own_sentence", true, false],
      drink: ["own_sentence", true, false],
    });
    expect(judges(rows)[0]?.app.said).toEqual(["water", "drink"]);
  });

  it("AC-27h 독립 표현: 직전 선생님 말에 W 가 있어도 새 내용 낱말이 있으면 인정 후보(같은 낱말이 있다는 이유만으로 빼지 않음)", () => {
    const rows = [
      teacher("Do you go to the beach?"),
      child("I go to the beach with my mom."),
    ];
    expect(appOfLast(rows)).toEqual({
      go: ["own_sentence", true, false],
      beach: ["own_sentence", true, false],
    });
  });

  it("AC-27h 독립 표현: W 가 앞 say 에 없으면 인정 후보", () => {
    const rows = [teacher("What do you do there?"), child("I swim.")];
    expect(appOfLast(rows)).toEqual({ swim: ["own_sentence", true, false] });
  });

  it("AC-27h 뒤에 다른 문맥에서 스스로 씀: 앞에서 보류로 적힌 beach 를 'I swim at the beach.' 로 쓰면 독립 근거 후보로 따로 적는다", () => {
    const rows = [
      teacher("Do you go to the beach?"),
      child("Beach!"),
      teacher("Fun! What do you like?"),
      child("I swim at the beach."),
    ];
    expect(appOfLast(rows)).toEqual({
      swim: ["own_sentence", true, false],
      beach: ["own_later", true, false],
    });
  });

  it("AC-27h 뒤에 스스로 씀: 따라 말한 sea 도 뒤에 스스로 쓰면 독립 근거 후보", () => {
    const rows = [
      teacher("Say it with me: I see the sea.", {
        listenSentence: "I see the sea.",
      }),
      child("I see the sea."),
      teacher("Great! What do you do?"),
      child("I swim in the sea."),
    ];
    expect(appOfLast(rows).sea).toEqual(["own_later", true, false]);
  });

  it("AC-27h 고르기 물음 뒤 한 낱말 답 'Sea.' 는 보류 갈래에 '고르기 답' 표지", () => {
    const rows = [
      teacher("Do you like the sea or the mountain?"),
      child("Sea."),
    ];
    expect(appOfLast(rows)).toEqual({ sea: ["echoed_word", false, true] });
  });

  it("AC-27h 고르기 물음 뒤라도 새 내용 낱말이 있는 말은 고르기 답이 아니다", () => {
    const rows = [
      teacher("Do you like the sea or the mountain?"),
      child("I swim in the sea."),
    ];
    expect(appOfLast(rows)).toEqual({
      swim: ["own_sentence", true, false],
      sea: ["own_sentence", true, false],
    });
  });

  it("AC-27h 앱이 보는 선생님 행은 바로 앞 하나다(되묻기 사슬을 앱이 모름)", () => {
    const rows = [
      teacher("On weekends, I go to the mountain."),
      child("Mountain sky"),
      teacher("Sorry, say it again, please!"),
      child("Mountain."),
    ];
    expect(appOfLast(rows)).toEqual({
      mountain: ["own_sentence", true, false],
    });
  });

  it("AC-27h 표에 없는 경우: 앱이 아는 막힘 말에 든 단원 단어는 갈래를 적되 인정하지 않는다(보수 쪽)", () => {
    const rows = [teacher("Do you swim?"), child("I don't know swim.")];
    const judge = judges(rows)[0];
    expect(judge?.app.stuck).toBe(true);
    expect(judge?.app.words.map((w) => [w.word, w.accepted])).toEqual([
      ["swim", false],
    ]);
    expect(judge?.app.said).toEqual([]);
  });

  it("AC-27h 말 입력이 아닌 차례(모름 단추 · 눌렀으나 듣지 못함 · 조용함)는 두 판정 모두 빈 값", () => {
    const rows: ChatJudgeRow[] = [
      teacher("Hi!"),
      child("", { input: "dont_know", eval: { status: "not_called" } }),
      teacher("That's okay."),
      child("", { input: "not_heard", eval: { status: "not_called" } }),
      teacher("Hmm?"),
      child("", { input: "quiet", eval: { status: "not_called" } }),
    ];
    const out = judges(rows);
    expect(out.map((j) => j.app.said)).toEqual([[], [], []]);
    expect(out.map((j) => j.app.words)).toEqual([[], [], []]);
    expect(out.map((j) => j.legacy.status)).toEqual([
      "not_called",
      "not_called",
      "not_called",
    ]);
    expect(out.map((j) => j.legacy.said)).toEqual([[], [], []]);
    expect(out.map((j) => j.app.stuck)).toEqual([true, false, false]);
  });
});

describe("기존 꼴 판정(설계 8-2 — 평가 호출 출력을 지금 판정 함수에 그대로)", () => {
  it("AC-27h 평가 출력의 child_used_on_own 가 saidWordsOf 를 지난 것이 기존 꼴 said 다", () => {
    const rows = [
      teacher("What do you drink?"),
      child("I drink milk.", {
        eval: done({ child_used_on_own: ["drink", "milk", "water"] }),
      }),
      teacher("Yum!"),
    ];
    const judge = judges(rows)[0];
    expect(judge?.legacy).toMatchObject({
      status: "done",
      said: ["drink", "milk"],
      stuck: false,
      askAgain: false,
      help: { hintKind: "none", hintLevel: 0, heardHelp: null },
    });
  });

  it("AC-27h 막힘은 reading 을 막힘 값 · 아이 말 갈래로 옮긴 뒤 effectiveStuckOf 로 무른다", () => {
    const stuck = judges([
      teacher("What do you drink?"),
      child("Blue car", {
        eval: done({ reading: "does_not_fit", child_used_on_own: [] }),
      }),
    ])[0];
    expect(stuck?.legacy.stuck).toBe(true);
    // 영어 낱말 셋 이상의 말은 갈래와 관계없이 막힘이 아니다(지금 무름)
    const notStuck = judges([
      teacher("What do you drink?"),
      child("I drink cold milk", {
        eval: done({ reading: "likely_misheard", child_used_on_own: ["milk"] }),
      }),
    ])[0];
    expect(notStuck?.legacy).toMatchObject({ stuck: false, said: ["milk"] });
  });

  it("AC-27h 막힘인 차례는 기존 꼴 said 가 빈다", () => {
    const judge = judges([
      teacher("Do you like the sea?"),
      child("Sea mountain", {
        eval: done({ reading: "does_not_know", child_used_on_own: ["sea"] }),
      }),
    ])[0];
    // 'Sea mountain' 은 장면 낱말에 닿는 한두 낱말 말이라 무름 → 막힘 아님
    expect(judge?.legacy.stuck).toBe(false);
    const stuck = judges([
      teacher("Do you like milk?"),
      child("Swim water", {
        eval: done({ reading: "does_not_know", child_used_on_own: ["swim"] }),
      }),
    ])[0];
    expect(stuck?.legacy).toMatchObject({ stuck: true, said: [] });
  });

  it("AC-27h n+1 이 되묻기(teacher_move ask_again)면 그 차례 기존 꼴 said 는 빈다", () => {
    const judge = judges([
      teacher("What do you drink?"),
      child("I drink milk.", {
        eval: done({ teacher_move: "ask_again", child_used_on_own: ["milk"] }),
      }),
      teacher("Sorry, say it again, please!"),
    ])[0];
    expect(judge?.legacy).toMatchObject({ askAgain: true, said: [] });
  });

  it("AC-27h 수업이 닫힐 때 n+1 없이 부른 마지막 차례는 되묻기 없음으로 본다", () => {
    const judge = judges([
      teacher("What do you drink?"),
      child("I drink milk.", {
        eval: done({ teacher_move: "ask_again", child_used_on_own: ["milk"] }),
      }),
    ])[0];
    expect(judge?.legacy).toMatchObject({ askAgain: false, said: ["milk"] });
  });

  it("AC-27h 들은 도움: 앞 선생님 차례가 따라 할 문장을 들려줬으면(앞 평가의 model_repeat) heardHelpsOfMove 로 답 예시 → 힌트 종류 '영어'", () => {
    const rows = [
      teacher("What do you drink?"),
      child("Um milk", {
        eval: done({
          reading: "does_not_know",
          teacher_move: "model_repeat",
          model_sentence: "I drink milk.",
        }),
      }),
      teacher("Say it with me: I drink milk.", {
        listenSentence: "I drink milk.",
      }),
      child("I drink milk.", {
        eval: done({ child_used_on_own: ["drink", "milk"] }),
      }),
    ];
    const judge = judges(rows)[1];
    expect(judge?.legacy).toMatchObject({
      said: [],
      help: { hintKind: "english", heardHelp: "answer_example" },
      prevMove: "eval",
    });
  });

  it("AC-27h 들은 도움: 앞 평가가 없으면(모름 단추 뒤) 앞 선생님 행의 앱 사실(따라 할 문장 · 막힌 뒤 고르기)로 채운다", () => {
    const model = judges([
      teacher("What do you drink?"),
      child("", { input: "dont_know", eval: { status: "not_called" } }),
      teacher("Say it with me: I drink milk.", {
        listenSentence: "I drink milk.",
      }),
      child("I drink milk.", { eval: done({ child_used_on_own: ["milk"] }) }),
    ])[1];
    expect(model?.legacy).toMatchObject({
      said: [],
      help: { hintKind: "english", heardHelp: "answer_example" },
      prevMove: "app_dont_know",
    });
    const choices = judges([
      teacher("What do you drink?"),
      child("", { input: "dont_know", eval: { status: "not_called" } }),
      teacher("Milk or water?"),
      child("Milk.", { eval: done({ child_used_on_own: ["milk"] }) }),
    ])[1];
    expect(choices?.legacy).toMatchObject({
      said: [],
      help: { hintKind: "english", heardHelp: "two_answers" },
      prevMove: "app_dont_know",
    });
  });

  it("AC-27h 보통 차례의 이어 묻는 고르기 질문은 들은 도움이 아니다(C205)", () => {
    const judge = judges([
      teacher("Hi!"),
      child("I like the sea", { eval: done({ child_used_on_own: ["sea"] }) }),
      teacher("Me too! Do you swim or play?"),
      child("I swim.", { eval: done({ child_used_on_own: ["swim"] }) }),
    ])[1];
    expect(judge?.legacy).toMatchObject({
      said: ["swim"],
      help: { hintKind: "none", heardHelp: null },
    });
  });

  it("AC-27h 힌트 종류는 hintKindOf(연 단 = 설계 7 의 실제 단): 뜻만 열면 '뜻만'이고 said 는 남는다, 영어 단이면 빈다", () => {
    const meaning = judges([
      teacher("What do you drink?"),
      child("I drink milk.", {
        opened: ["ko"],
        eval: done({ child_used_on_own: ["milk"] }),
      }),
    ])[0];
    expect(meaning?.legacy).toMatchObject({
      said: ["milk"],
      help: { hintKind: "meaning_only", hintLevel: 1 },
    });
    const english = judges([
      teacher("What do you drink?"),
      child("I drink milk.", {
        opened: ["ko", "sentence"],
        eval: done({ child_used_on_own: ["milk"] }),
      }),
    ])[0];
    expect(english?.legacy).toMatchObject({
      said: [],
      help: { hintKind: "english", hintLevel: 2 },
    });
  });

  it("AC-27h 되물은 뒤 이어 받기: 앞 선생님이 되물었으면(앞 평가의 ask_again) 되물은 아이 차례의 힌트 칸을 하한으로 이어 받는다", () => {
    const judge = judges([
      teacher("What do you drink?"),
      child("Mill", {
        opened: ["ko", "sentence"],
        eval: done({ reading: "likely_misheard", teacher_move: "ask_again" }),
      }),
      teacher("Sorry, say it again, please!"),
      child("Milk!", { eval: done({ child_used_on_own: ["milk"] }) }),
    ])[1];
    expect(judge?.legacy).toMatchObject({
      said: [],
      help: { hintKind: "english", hintLevel: 2 },
    });
  });

  it("AC-27h 판정 없음 · 기다림은 기존 꼴 said 가 비고 상태만 남는다", () => {
    const out = judges([
      teacher("What do you drink?"),
      child("I drink milk.", { eval: { status: "failed" } }),
      teacher("Yum!"),
      child("I drink water."),
    ]);
    expect(
      out.map((j) => [j.legacy.status, j.legacy.said, j.legacy.output]),
    ).toEqual([
      ["failed", [], null],
      ["waiting", [], null],
    ]);
  });

  it("AC-27h 평가 호출의 reading 이 바뀌어도 앱 판정 · 앱이 아는 막힘은 같다(흐름 입력은 앱만)", () => {
    const rowsWith = (
      reading: TalkChatEvalOutput["reading"],
    ): ChatJudgeRow[] => [
      teacher("Do you go to the beach?"),
      child("Blue car", { eval: done({ reading }) }),
      teacher("Oh, a blue car!"),
      child("I go to the beach.", { eval: done({ reading }) }),
    ];
    const a = judges(rowsWith("clear_answer")).map((j) => j.app);
    const b = judges(rowsWith("does_not_fit")).map((j) => j.app);
    expect(b).toEqual(a);
  });
});

describe("chat_judge 칸(설계 8-4)", () => {
  it("AC-27h 판정 결과는 chat_judge 규격을 지나고, 읽기는 꼴이 틀린 값을 null 로 돌린다", () => {
    const out = judges([
      teacher("Do you like the sea or the mountain?"),
      child("Sea.", { eval: done({ child_used_on_own: ["sea"] }) }),
      teacher("Me too!"),
      child("", { input: "dont_know", eval: { status: "not_called" } }),
    ]);
    for (const judge of out) {
      expect(ChatJudgeSchema.parse(judge)).toEqual(judge);
      expect(readChatJudge(JSON.parse(JSON.stringify(judge)))).toEqual(judge);
    }
    expect(readChatJudge(null)).toBeNull();
    expect(readChatJudge({ app: {}, legacy: { status: "maybe" } })).toBeNull();
  });

  it("AC-27h 담는 것: 앱 판정(낱말마다 갈래 · 인정 · 고르기 답) · 앱 said · 앱이 아는 막힘 · 기존 꼴 상태 · 평가 출력 · 기존 꼴 said · 막힘 · 힌트 종류", () => {
    const [judge] = judges([
      teacher("Do you like the sea or the mountain?"),
      child("Sea.", { eval: done({ child_used_on_own: ["sea"] }) }),
      teacher("Me too!"),
    ]);
    expect(judge).toEqual({
      app: {
        stuck: false,
        hintKind: "none",
        words: [
          {
            word: "sea",
            category: "echoed_word",
            accepted: false,
            choiceAnswer: true,
          },
        ],
        said: [],
      },
      legacy: {
        status: "done",
        output: { ...DONE_OUTPUT, child_used_on_own: ["sea"] },
        said: ["sea"],
        stuck: false,
        askAgain: false,
        afterAskAgain: false,
        help: { hintKind: "none", hintLevel: 0, heardHelp: null },
        prevMove: "app_no_child",
      },
    } satisfies ChatJudge);
  });

  it("AC-27h 결과는 아이 행의 차례 번호와 함께 나온다(선생님 행은 판정이 없다)", () => {
    const rows: ChatJudgeRow[] = [
      teacher("Hi!"),
      child("Hello"),
      teacher("How are you?"),
      child("Good"),
    ];
    expect(chatJudgesOf(rows, CTX).map((j) => j.row)).toEqual([1, 3]);
  });

  it("AC-27h chat-judge 는 DB · 서버 모듈을 가져오지 않는 순수 모듈이다", () => {
    const source = readFileSync(
      join(process.cwd(), "src/core/conversation/chat-judge.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from "@\/(server|db)\/|drizzle-orm/);
    // 지금 새 방식의 후보 판정 모듈은 src 에서 가져다 쓰지 않는다(AC-26f 그대로)
    expect(source).not.toContain("lead-candidate");
  });
});

/** 3단계 단원 1 수업 2 의 실제 단원 단어(see 가 없음 — 검토 probe2). */
const VOCAB_L3 = [
  { word: "eat", forms: ["eats", "ate", "eaten", "eating"] },
  { word: "drink", forms: ["drinks", "drank", "drinking"] },
  { word: "go", forms: ["goes", "went", "gone", "going"] },
  { word: "come", forms: ["comes", "came", "coming"] },
  { word: "wash", forms: ["washes", "washed", "washing"] },
  { word: "sea", forms: ["seas"] },
  { word: "mountain", forms: ["mountains"] },
  { word: "beach", forms: ["beaches"] },
];
const CTX_L3: ChatJudgeContext = {
  ...CTX,
  unitWords: VOCAB_L3.map((v) => v.word),
  lemmaOf: lemmaLookup(VOCAB_L3),
};

function appWith(ctx: ChatJudgeContext, rows: ChatJudgeRow[]) {
  const last = chatJudgesOf(rows, ctx).at(-1)?.judge;
  if (last === undefined) throw new Error("아이 행이 없다");
  return {
    words: Object.fromEntries(
      last.app.words.map((w) => [
        w.word,
        [w.category, w.accepted, w.choiceAnswer],
      ]),
    ),
    said: last.app.said,
  };
}

describe("fix 1 — 같은 소리 낱말(I-1)", () => {
  it("AC-27h 고르기 물음 'the sea or the mountain?' 뒤 들린 'See.'(단원에 see 없음)는 sea · 보류 · 고르기 답", () => {
    expect(
      appWith(CTX_L3, [
        teacher("Do you like the sea or the mountain?"),
        child("See."),
      ]),
    ).toEqual({ words: { sea: ["echoed_word", false, true] }, said: [] });
  });

  it("AC-27h 'What do you like?' 뒤 들린 'See.'(단원에 see 없음)는 sea 독립 표현 — 지금 공식 규칙과 같은 갈래", () => {
    expect(
      appWith(CTX_L3, [teacher("What do you like?"), child("See.")]),
    ).toEqual({ words: { sea: ["own_sentence", true, false] }, said: ["sea"] });
  });

  it("AC-27h 단원에 see · sea 가 함께 있으면 글자로 먼저 잇는다: 'Sea.' 는 sea 만, 'See.' 는 see 만", () => {
    expect(
      appWith(CTX, [teacher("What do you like?"), child("Sea.")]).words,
    ).toEqual({ sea: ["own_sentence", true, false] });
    expect(
      appWith(CTX, [teacher("What do you like?"), child("See.")]).words,
    ).toEqual({ see: ["own_sentence", true, false] });
    // 선생님 말의 sea 와 같은 소리이므로 '선생님 말에 있음'으로 본다(인정하지 않는 쪽)
    expect(
      appWith(CTX, [
        teacher("Do you like the sea or the mountain?"),
        child("See."),
      ]).words,
    ).toEqual({ see: ["echoed_word", false, true] });
  });

  it("AC-27h 같은 소리로 넓히는 것은 영어 낱말 둘 이하의 말뿐이다", () => {
    expect(
      appWith(CTX_L3, [
        teacher("What do you like?"),
        child("I like to see it."),
      ]).words,
    ).toEqual({});
  });

  it("AC-27h 맞장구 · 기능어는 같은 소리로 넓히지 않는다('Me too.' 는 two 가 아님)", () => {
    const ctx = { ...CTX, unitWords: [...CTX.unitWords, "two"] };
    expect(
      appWith(ctx, [teacher("I like the sea."), child("Me too.")]).words,
    ).toEqual({});
  });
});

describe("fix 1 — 되물은 뒤의 답(I-2)", () => {
  it("AC-27h 앞 선생님 차례의 기존 꼴 행동이 되묻기면 그 아이 차례에 afterAskAgain 표시", () => {
    const out = judges([
      teacher("On weekends, I go to the mountain."),
      child("Mountain sky", {
        eval: done({
          reading: "likely_misheard",
          teacher_move: "ask_again",
          child_used_on_own: ["mountain"],
        }),
      }),
      teacher("Sorry, say it again, please!"),
      child("Mountain.", { eval: done({ child_used_on_own: [] }) }),
    ]);
    expect(out.map((j) => [j.legacy.askAgain, j.legacy.afterAskAgain])).toEqual(
      [
        [true, false],
        [false, true],
      ],
    );
    expect(out[1]?.app.said).toEqual(["mountain"]);
  });
});

/** 객체 열쇠의 차례를 모든 깊이에서 뒤집는다(jsonb 가 열쇠 차례를 바꾸는 것을 흉내). */
function reversedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reversedKeys);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([k, v]) => [k, reversedKeys(v)]),
  );
}

describe("fix 1 — 출처의 가름과 다시 세기(I-3)", () => {
  const prevMoveOfLast = (rows: ChatJudgeRow[]) =>
    judges(rows).at(-1)?.legacy.prevMove;
  const last = () =>
    child("I drink milk.", { eval: done({ child_used_on_own: ["milk"] }) });

  it("AC-27h 앞 평가가 없으면 출처를 까닭별로 적는다", () => {
    const q = teacher("What do you drink?");
    expect(
      prevMoveOfLast([
        q,
        child("", { input: "dont_know", eval: { status: "not_called" } }),
        q,
        last(),
      ]),
    ).toBe("app_dont_know");
    expect(
      prevMoveOfLast([
        q,
        child("", { input: "not_heard", eval: { status: "not_called" } }),
        q,
        last(),
      ]),
    ).toBe("app_not_heard");
    expect(
      prevMoveOfLast([
        q,
        child("", { input: "quiet", eval: { status: "not_called" } }),
        q,
        last(),
      ]),
    ).toBe("app_no_child");
    expect(prevMoveOfLast([q, last()])).toBe("app_no_child");
    expect(
      prevMoveOfLast([
        q,
        child("Milk", { eval: { status: "failed" } }),
        q,
        last(),
      ]),
    ).toBe("app_eval_failed");
    expect(prevMoveOfLast([q, child("Milk"), q, last()])).toBe(
      "app_eval_waiting",
    );
    expect(
      prevMoveOfLast([q, child("Milk", { eval: done() }), q, last()]),
    ).toBe("eval");
  });

  it("AC-27h 늦게 온 평가 값: 다시 센 결과가 저장값과 다른 아이 행(그 평가의 행과 그 값에 기대는 뒤 행)만 돌려준다", () => {
    const waitingRows: ChatJudgeRow[] = [
      teacher("What do you drink?"),
      child("Um milk"),
      teacher("Say it with me: I drink milk.", {
        listenSentence: "I drink milk.",
      }),
      child("I drink milk.", {
        eval: done({ child_used_on_own: ["drink", "milk"] }),
      }),
      teacher("Great!"),
      child("I swim.", { eval: done({ child_used_on_own: ["swim"] }) }),
    ];
    const stored = new Map<number, unknown>(
      chatJudgesOf(waitingRows, CTX).map(({ row, judge }) => [
        row,
        // jsonb 를 거친 값(열쇠 차례가 바뀌어도 같은 값으로 본다)
        reversedKeys(JSON.parse(JSON.stringify(judge))),
      ]),
    );
    expect(chatJudgeChangesOf({ rows: waitingRows, stored, ctx: CTX })).toEqual(
      [],
    );
    const arrived = waitingRows.map((row, at) =>
      at === 1 && row.role === "child"
        ? {
            ...row,
            eval: done({
              reading: "does_not_know",
              teacher_move: "model_repeat",
              model_sentence: "I drink milk.",
            }),
          }
        : row,
    );
    const changes = chatJudgeChangesOf({ rows: arrived, stored, ctx: CTX });
    expect(changes.map((c) => c.row)).toEqual([1, 3]);
    expect(changes[1]?.judge.legacy.prevMove).toBe("eval");
    // 저장값이 없거나 꼴이 틀린 행도 고쳐 쓸 행이다
    expect(
      chatJudgeChangesOf({
        rows: arrived,
        stored: new Map([[1, { app: {} }]]),
        ctx: CTX,
      }).map((c) => c.row),
    ).toEqual([1, 3, 5]);
  });
});

describe("fix 1 — 따라 할 문장의 하한 · 군말과 부름말 · 한 낱말", () => {
  it("AC-27h 앞 평가가 'Yum! Say it with me: I drink milk.' 를 반응으로 읽어도, 앱의 따라 할 문장이 하한이 되어 따라 말한 말은 기존 꼴에서 인정되지 않는다", () => {
    const judge = judges([
      teacher("What do you drink?"),
      child("Milk", {
        eval: done({ teacher_move: "react_and_follow_up", model_sentence: "" }),
      }),
      teacher("Yum! Say it with me: I drink milk.", {
        listenSentence: "I drink milk.",
      }),
      child("I drink milk.", {
        eval: done({ child_used_on_own: ["drink", "milk"] }),
      }),
    ])[1];
    expect(judge?.legacy).toMatchObject({
      said: [],
      help: { hintKind: "english", heardHelp: "answer_example" },
      prevMove: "eval",
    });
  });

  it("AC-27h 고르기 물음 뒤 군말 · please · 선생님 이름이 붙은 한 낱말 답도 고르기 답 표지를 받는다", () => {
    for (const heard of ["Uh, sea.", "Hmm sea", "Sea, please.", "Sea, Mina!"])
      expect(
        appOfLast([
          teacher("Do you like the sea or the mountain?"),
          child(heard),
        ]),
        heard,
      ).toEqual({ sea: ["echoed_word", false, true] });
  });

  it("AC-27h 고르기 답의 '한 낱말'은 서로 다른 대표 낱말 수다('Sea sea!')", () => {
    expect(
      appOfLast([
        teacher("Do you like the sea or the mountain?"),
        child("Sea sea!"),
      ]),
    ).toEqual({ sea: ["echoed_word", false, true] });
    expect(
      appOfLast([
        teacher("Do you like the sea or the mountain?"),
        child("Sea mountain"),
      ]),
    ).toEqual({
      sea: ["echoed_word", false, false],
      mountain: ["echoed_word", false, false],
    });
  });
});

describe("fix 1 — 빈 경계(M-5)", () => {
  it("AC-27h 조용함 행 뒤의 선생님 행은 앞 아이 차례가 없다: 고르기 물음도 들은 도움이 아니고 출처는 app_no_child", () => {
    const judge = judges([
      teacher("Do you like the sea?"),
      child("", { input: "quiet", eval: { status: "not_called" } }),
      teacher("Sea or mountain?"),
      child("Mountain.", { eval: done({ child_used_on_own: ["mountain"] }) }),
    ]).at(-1);
    expect(judge?.legacy).toMatchObject({
      said: ["mountain"],
      help: { heardHelp: null },
      prevMove: "app_no_child",
    });
  });

  it("AC-27h 마무리 차례의 or 물음은 막힌 뒤라도 고르기가 아니다", () => {
    const judge = judges([
      teacher("What do you drink?"),
      child("", { input: "dont_know", eval: { status: "not_called" } }),
      teacher("Do you want to talk more or finish?", { closing: true }),
      child("Talk more drink", {
        eval: done({ child_used_on_own: ["drink"] }),
      }),
    ]).at(-1);
    expect(judge?.legacy).toMatchObject({
      said: ["drink"],
      help: { hintKind: "none", heardHelp: null },
    });
  });
});

describe("fix 2 — 소리로만 이은 낱말과 선생님 말(N-1) · 군말과 단원 낱말(N-2)", () => {
  it("AC-27h 'What can you see at the beach?' 뒤 들린 'See.'(see 가 단원 낱말 아님)는 선생님 말의 see 를 되풀이한 것으로 보아 인정하지 않는다", () => {
    expect(
      appWith(CTX_L3, [
        teacher("What can you see at the beach?"),
        child("See."),
      ]),
    ).toEqual({ words: { sea: ["echoed_word", false, false] }, said: [] });
  });

  it("AC-27h 따라 할 문장 'I can see.' 뒤 들린 'See.' 는 따라 말함으로 인정하지 않는다", () => {
    expect(
      appWith(CTX_L3, [
        teacher("Say it with me: I can see.", { listenSentence: "I can see." }),
        child("See."),
      ]),
    ).toEqual({ words: { sea: ["repeated_model", false, false] }, said: [] });
  });

  it("AC-27h 'Do you see it?' 뒤 들린 'See it.' 은 인정하지 않는다", () => {
    expect(
      appWith(CTX_L3, [teacher("Do you see it?"), child("See it.")]),
    ).toEqual({ words: { sea: ["echoed_word", false, false] }, said: [] });
  });

  it("AC-27h 글자로 든 낱말의 판단은 그대로다: 'What can you see?' 뒤 'Sea.' 는 독립 표현", () => {
    expect(
      appWith(CTX_L3, [teacher("What can you see?"), child("Sea.")]),
    ).toEqual({ words: { sea: ["own_sentence", true, false] }, said: ["sea"] });
  });

  it("AC-27h 군말 목록의 낱말이라도 그 수업의 단원 낱말이면 내용 낱말이다: 'Do you swim well or fast?' 뒤 'Well.' 은 고르기 답으로 보류", () => {
    const ctx = { ...CTX, unitWords: [...CTX.unitWords, "well"] };
    expect(
      appWith(ctx, [teacher("Do you swim well or fast?"), child("Well.")])
        .words,
    ).toEqual({ well: ["echoed_word", false, true] });
  });
});

describe("S0 — 판정 없음의 까닭(컨트롤러 결정 (A))", () => {
  const rows = (state: ChatEvalState): ChatJudgeRow[] => [
    teacher("What do you drink?"),
    child("I drink milk.", { eval: state }),
    teacher("Yum!"),
  ];

  it("AC-27h 판정 없음 행은 까닭(시간 넘음 · 검증 실패 · 그 밖)을 기존 꼴 기록에 남기고, 읽고 쓰는 왕복에서 그대로다", () => {
    expect([...CHAT_EVAL_FAILURES]).toEqual(["timeout", "invalid", "other"]);
    for (const failure of CHAT_EVAL_FAILURES) {
      const [judge] = judges(rows({ status: "failed", failure }));
      expect(judge?.legacy).toMatchObject({ status: "failed", failure });
      expect(readChatJudge(JSON.parse(JSON.stringify(judge)))).toEqual(judge);
    }
  });

  it("AC-27h 까닭을 모르는 판정 없음 · 판정 없음이 아닌 행에는 까닭 칸이 없다", () => {
    const [unknown] = judges(rows({ status: "failed" }));
    expect(unknown?.legacy).not.toHaveProperty("failure");
    for (const state of [done(), { status: "waiting" } as const]) {
      const [judge] = judges(rows(state));
      expect(judge?.legacy).not.toHaveProperty("failure");
    }
  });

  it("AC-27h 판정 없음이 아닌 행에 까닭이 있으면 읽기가 거부한다(null)", () => {
    const [judge] = judges(rows(done()));
    const broken = {
      ...judge,
      legacy: { ...judge?.legacy, failure: "timeout" },
    };
    expect(readChatJudge(broken)).toBeNull();
    const [failed] = judges(rows({ status: "failed", failure: "timeout" }));
    expect(
      readChatJudge({
        ...failed,
        legacy: { ...failed?.legacy, failure: "late" },
      }),
    ).toBeNull();
  });

  it("AC-27i 다시 세기는 지금 견줌(깊은 같음) 그대로: 까닭이 같으면 바뀜 없음, 까닭만 다르면 바뀐 행으로 본다", () => {
    const state: ChatEvalState = { status: "failed", failure: "invalid" };
    const [judge] = judges(rows(state));
    const same = chatJudgeChangesOf({
      rows: rows(state),
      stored: new Map([[1, JSON.parse(JSON.stringify(judge))]]),
      ctx: CTX,
    });
    expect(same).toEqual([]);
    const differs = chatJudgeChangesOf({
      rows: rows(state),
      stored: new Map([
        [1, { ...judge, legacy: { ...judge?.legacy, failure: "timeout" } }],
      ]),
      ctx: CTX,
    });
    expect(differs.map((c) => c.row)).toEqual([1]);
  });
});
