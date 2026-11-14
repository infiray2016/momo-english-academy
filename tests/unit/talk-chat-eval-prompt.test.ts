// 회화 이야기 방식의 평가 호출 조각(talk_chat_eval, intent 2026-11-13-회화-대화-구조-R spec 설계 8-2 · plan 묶음 P4 · AC-8 · AC-17).
// 요청을 만드는 순수 함수와 응답 Zod 만 본다(호출 실행 · 저장은 묶음 S0). 실제 API 를 부르지 않는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  type ChatEvalEntry,
  normalizeTalkChatEval,
  TALK_CHAT_EVAL_OUTPUT_FIELDS,
  TALK_CHAT_EVAL_SAME_SOUND_LINE,
  TalkChatEvalOutputSchema,
  talkChatEvalInputOf,
  talkChatEvalSpec,
  talkChatEvalUserMessage,
} from "@/core/ai/calls/talk-chat-eval";
import { hasJsonSchemaRefs } from "@/core/ai/inline-refs";
import { TALK_LEAD_MOVES, TALK_LEAD_READINGS } from "@/core/conversation/move";

const UNIT_WORDS = ["go", "see", "sea", "beach", "drink", "water"];

const teacher = (say: string): ChatEvalEntry => ({ speaker: "teacher", say });
const child = (message: string): ChatEvalEntry => ({
  speaker: "child",
  message,
});
const speech = (heard: string) => child(`Child (speech-to-text): "${heard}"`);

/** 대화 차례 열둘: 0 수업 시작 · 1 선생님 · 2 아이 · 3 선생님 … 11 선생님. */
function lesson(): ChatEvalEntry[] {
  const out: ChatEvalEntry[] = [
    child(
      "(The chat starts now. It is Friday evening. This is your first chat with this child. Say hello.)",
    ),
  ];
  for (let i = 1; i <= 11; i++)
    out.push(
      i % 2 === 1 ? teacher(`Teacher line ${i}.`) : speech(`Child ${i}`),
    );
  return out;
}

describe("talkChatEvalInputOf (평가 호출 입력, 설계 8-2)", () => {
  it("AC-27h 입력에는 아이 차례 n 앞 talk.chat_eval_context_turns 차례와 n · n+1 만 있다", () => {
    const entries = lesson();
    const input = talkChatEvalInputOf({
      entries,
      at: 8,
      contextTurns: 6,
      unitWords: UNIT_WORDS,
    });
    expect(input.before).toEqual(entries.slice(2, 8));
    expect(input.target).toBe('Child (speech-to-text): "Child 8"');
    expect(input.after).toBe("Teacher line 9.");
    const text = talkChatEvalUserMessage(input);
    for (const i of [3, 5, 7, 9]) expect(text).toContain(`Teacher line ${i}.`);
    for (const i of [1, 11]) expect(text).not.toContain(`Teacher line ${i}.`);
    expect(text).not.toContain("Child 10");
    expect(text).not.toContain("The chat starts now");
  });

  it("AC-27h 앞 차례가 차례 수보다 적으면 있는 만큼, 0 이면 앞 차례 없이 n · n+1 만", () => {
    const entries = lesson();
    expect(
      talkChatEvalInputOf({
        entries,
        at: 2,
        contextTurns: 6,
        unitWords: UNIT_WORDS,
      }).before,
    ).toEqual(entries.slice(0, 2));
    expect(
      talkChatEvalInputOf({
        entries,
        at: 4,
        contextTurns: 0,
        unitWords: UNIT_WORDS,
      }).before,
    ).toEqual([]);
  });

  it("AC-27h 수업이 닫힐 때의 마지막 아이 차례는 n+1 없이 부르고, 글이 그 사실을 알린다", () => {
    const entries = [...lesson(), speech("Bye")];
    const input = talkChatEvalInputOf({
      entries,
      at: entries.length - 1,
      contextTurns: 6,
      unitWords: UNIT_WORDS,
    });
    expect(input.after).toBeNull();
    expect(talkChatEvalUserMessage(input)).toContain("No teacher turn follows");
  });

  it("AC-27h n 뒤가 아이 차례(n+1 이 선생님 차례가 아님)면 n+1 을 싣지 않는다", () => {
    const entries = [
      teacher("Hi!"),
      speech("Hello"),
      child("(The child chose to talk more.)"),
    ];
    expect(
      talkChatEvalInputOf({ entries, at: 1, contextTurns: 6, unitWords: [] })
        .after,
    ).toBeNull();
  });

  it("AC-27h n 이 아이 차례가 아니거나 차례 수가 0 이상 정수가 아니면 던진다", () => {
    const entries = lesson();
    expect(() =>
      talkChatEvalInputOf({ entries, at: 3, contextTurns: 6, unitWords: [] }),
    ).toThrow(RangeError);
    expect(() =>
      talkChatEvalInputOf({ entries, at: 99, contextTurns: 6, unitWords: [] }),
    ).toThrow(RangeError);
    expect(() =>
      talkChatEvalInputOf({ entries, at: 2, contextTurns: -1, unitWords: [] }),
    ).toThrow(RangeError);
    expect(() =>
      talkChatEvalInputOf({ entries, at: 2, contextTurns: 1.5, unitWords: [] }),
    ).toThrow(RangeError);
  });

  it("AC-27h 사용자 메시지에 단원 단어와 n 표시가 있고, 목표 관리 글은 없다", () => {
    const entries = lesson();
    const text = talkChatEvalUserMessage(
      talkChatEvalInputOf({
        entries,
        at: 8,
        contextTurns: 2,
        unitWords: UNIT_WORDS,
      }),
    );
    expect(text).toContain("Unit words: go, see, sea, beach, drink, water");
    expect(text).toContain(">>> CHILD TURN TO JUDGE");
    // 판정할 차례 표시는 n 하나에만 붙는다
    expect(text.split(">>> CHILD TURN TO JUDGE").length).toBe(2);
    expect(text.indexOf("Child 8")).toBeGreaterThan(
      text.indexOf(">>> CHILD TURN TO JUDGE"),
    );
    expect(text).not.toMatch(/Status|turns left|goal words said/i);
  });

  it("AC-27h 아이 쪽 차례는 대화 호출에 보낸 글(사실 줄 + 입력 줄) 그대로, 선생님 쪽은 나간 say 다", () => {
    const fact =
      "This is the closing turn. After your turn the app shows the buttons 'talk more' and 'finish'.";
    const entries = [
      teacher("Do you go to the beach?"),
      child(`${fact}\nChild (speech-to-text): "Yes"`),
      teacher("Fun!"),
    ];
    const text = talkChatEvalUserMessage(
      talkChatEvalInputOf({ entries, at: 1, contextTurns: 6, unitWords: [] }),
    );
    expect(text).toContain(fact);
    expect(text).toContain('Child (speech-to-text): "Yes"');
    expect(text).toContain('Teacher: "Do you go to the beach?"');
    expect(text).toContain('Teacher: "Fun!"');
  });
});

describe("talkChatEvalSpec (호출 규격)", () => {
  const input = talkChatEvalInputOf({
    entries: lesson(),
    at: 6,
    contextTurns: 6,
    unitWords: UNIT_WORDS,
  });

  it("AC-27h 목적은 talk_chat_eval, 한 번 묻는 호출이고 열거 칸은 reading · teacher_move", () => {
    expect(talkChatEvalSpec.purpose).toBe("talk_chat_eval");
    expect(talkChatEvalSpec.multiTurn).toBe(false);
    expect(talkChatEvalSpec.enumPaths).toEqual(["reading", "teacher_move"]);
    const rules = talkChatEvalSpec.rulesOf({}, input);
    const messages = talkChatEvalSpec.messages(input, rules);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe("user");
    expect(messages[0]?.content).toBe(talkChatEvalUserMessage(input));
  });

  it("AC-27h 안내문은 네 칸의 뜻(n 의 읽기 · n+1 의 행동 · 따라 할 문장 · 스스로 쓴 단원 단어)을 적고 열거 값을 모두 싣는다", () => {
    const system = talkChatEvalSpec.system(
      input,
      talkChatEvalSpec.rulesOf({}, input),
    );
    for (const value of [...TALK_LEAD_READINGS, ...TALK_LEAD_MOVES])
      expect(system).toContain(value);
    for (const field of TALK_CHAT_EVAL_OUTPUT_FIELDS)
      expect(system).toContain(`"${field}"`);
    expect(system).toContain("not repeating");
  });

  it("AC-27q 입력에 아이 이름 칸이 없고, 가림이 아이 · 선생님 글 모두에 걸린다", () => {
    const named = talkChatEvalInputOf({
      entries: [
        teacher("Hi Hana!"),
        speech("I am Hana"),
        teacher("Nice, Hana."),
      ],
      at: 1,
      contextTurns: 6,
      unitWords: [],
    });
    expect(Object.keys(named).sort()).toEqual(
      ["after", "before", "target", "unitWords"].sort(),
    );
    const masked = talkChatEvalSpec.mask(named, (text) => ({
      text: text.replaceAll("Hana", "{NAME}"),
      names: text.split("Hana").length - 1,
      contacts: 0,
    }));
    const text = talkChatEvalUserMessage(masked);
    expect(text).not.toContain("Hana");
    expect(text).toContain("{NAME}");
  });

  it("AC-27q 이 모듈은 서버 · DB · SDK 를 가져오지 않는 순수 모듈이다", () => {
    const source = readFileSync(
      join(process.cwd(), "src/core/ai/calls/talk-chat-eval.ts"),
      "utf8",
    );
    expect(source).not.toMatch(
      /from "@\/(server|db)\/|@anthropic-ai\/sdk|drizzle-orm/,
    );
  });
});

describe("평가 호출 응답(Zod)", () => {
  it("AC-27h 응답 칸은 reading · teacher_move · model_sentence · child_used_on_own 차례다", () => {
    expect(TALK_CHAT_EVAL_OUTPUT_FIELDS).toEqual([
      "reading",
      "teacher_move",
      "model_sentence",
      "child_used_on_own",
    ]);
    const ok = TalkChatEvalOutputSchema.safeParse({
      reading: "clear_answer",
      teacher_move: "react_only",
      model_sentence: "",
      child_used_on_own: ["drink"],
    });
    expect(ok.success).toBe(true);
    expect(
      TalkChatEvalOutputSchema.safeParse({
        reading: "great",
        teacher_move: "react_only",
        model_sentence: "",
        child_used_on_own: [],
      }).success,
    ).toBe(false);
  });

  it("AC-27h 정규화: 열거 밖 값은 null(판정 없음), 빠진 글 · 목록 칸은 빈 값, 글 아닌 목록 값은 뺀다", () => {
    expect(
      normalizeTalkChatEval({ reading: "x", teacher_move: "react_only" }),
    ).toBeNull();
    expect(
      normalizeTalkChatEval({ reading: "clear_answer", teacher_move: "y" }),
    ).toBeNull();
    expect(
      normalizeTalkChatEval({
        reading: "new_topic",
        teacher_move: "ask_again",
        child_used_on_own: ["beach", 3, null],
      }),
    ).toEqual({
      reading: "new_topic",
      teacher_move: "ask_again",
      model_sentence: "",
      child_used_on_own: ["beach"],
    });
  });

  it("AC-27h 보낼 응답 규격에 $defs · $ref 가 없다", () => {
    const wire = talkChatEvalSpec.wireSchema(
      talkChatEvalInputOf({
        entries: lesson(),
        at: 2,
        contextTurns: 6,
        unitWords: [],
      }),
      {},
    );
    expect(hasJsonSchemaRefs(z.toJSONSchema(wire))).toBe(false);
  });

  it("AC-27h 아이에게 보이는 칸이 없어 출력 검사 칸이 없고, 검사 결과로 값을 바꾸지 않는다", () => {
    const value = {
      reading: "clear_answer" as const,
      teacher_move: "react_only" as const,
      model_sentence: "",
      child_used_on_own: [],
    };
    expect(talkChatEvalSpec.checkFields(value)).toEqual([]);
    expect(
      talkChatEvalSpec.applyChecks(
        value,
        new Map(),
        talkChatEvalInputOf({
          entries: lesson(),
          at: 2,
          contextTurns: 6,
          unitWords: [],
        }),
      ),
    ).toEqual({ value, changed: false, fatal: false });
  });
});

describe("fix 1 — 평가 안내문의 알아듣기 문장(M-4)", () => {
  it("AC-27h 지금 새 방식 안내문의 같은 소리 문장을 같은 글로 싣는다", () => {
    const lead = readFileSync(
      join(process.cwd(), "src/core/ai/calls/talk-lead.ts"),
      "utf8",
    );
    expect(TALK_CHAT_EVAL_SAME_SOUND_LINE).toBe(
      "If a word that sounds the same would fit (see/sea, teach/beach), take that meaning.",
    );
    expect(lead).toContain(TALK_CHAT_EVAL_SAME_SOUND_LINE);
    const input = talkChatEvalInputOf({
      entries: lesson(),
      at: 2,
      contextTurns: 6,
      unitWords: [],
    });
    expect(
      talkChatEvalSpec.system(input, talkChatEvalSpec.rulesOf({}, input)),
    ).toContain(TALK_CHAT_EVAL_SAME_SOUND_LINE);
  });
});
