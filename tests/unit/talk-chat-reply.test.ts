// 회화 이야기 방식(talk.lead_mode 'chat')의 응답 처리(intent 2026-11-13-회화-대화-구조-R spec 설계 4 · 5 · 데이터 move 행, plan 묶음 P2).
// 글을 바꾸는 것은 셋뿐이다: say 에 든 따라 할 문장(listen_sentence)을 소리 줄로 빼기 · 앱이 아는 막힘 뒤의 or 물음 빼기 · say_ko 의 영어 문장 거르기.
// 어긋남 · 수준 검사 · 지어낸 경험 꼴 검사는 기록만 한다. 인사 · 첫 말 · 돌아옴 차례의 wrap_up 참은 거짓으로 다루고 기록한다. 정리 되짚을 말의 출처도 본다.
import { describe, expect, it } from "vitest";
import type { TalkChatOutput } from "@/core/ai/calls/talk-chat";
import { isSupportMove } from "@/core/conversation/chances";
import type { ChatInput } from "@/core/conversation/chat-message";
import {
  type ChatReplyCheck,
  type ChatReplyInput,
  chatListenLiteralOf,
  chatReplyOf,
  chatTeacherMoveOf,
  chatWrapSourcesOf,
  chatWrapUpHeldAtOf,
} from "@/core/conversation/chat-reply";
import {
  chatChildFlowOf,
  chatGreetingEndOf,
  chatSupportStageOf,
} from "@/core/conversation/chat-turn-core";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import type {
  TalkLessonSettings,
  TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import {
  eraseTalkMoveText,
  readTalkMove,
  TalkMoveSchema,
  talkMoveOf,
} from "@/core/conversation/move";
import type { LowLevelLineOptions } from "@/core/conversation/question-check";
import { wrapUpLinesOf } from "@/core/conversation/wrap-up";
import {
  CARD3,
  LOW,
  NEW3,
  SPEC3,
  said,
  teacher,
} from "../fixtures/talk-lesson";

const range: LowLevelLineOptions = {
  sentenceMaxWords: 8,
  allowedWords: new Set(
    "i you we it a the like likes cats cat dogs dog do what is are and or say with me fine am okay that good yes no park parks went to yesterday play hello how".split(
      " ",
    ),
  ),
  unitWords: ["play"],
  childWords: [],
  teacherName: "Mina",
  lemmaOf: (s) => s.toLowerCase(),
  forms: [],
  allowedForms: new Set(),
};

const check: ChatReplyCheck = {
  range,
  sentenceMax: 2,
  questionMax: 1,
  madeUpPhrases: ["yesterday i", "when i was little"],
};

const out = (o: Partial<TalkChatOutput> & { say: string }): TalkChatOutput => ({
  listen_sentence: "",
  say_ko: "",
  wrap_up: false,
  ...o,
});

const reply = (
  o: Partial<TalkChatOutput> & { say: string },
  over: Partial<ChatReplyInput> = {},
) =>
  chatReplyOf({
    level: 3,
    output: out(o),
    appStuck: false,
    closingSlot: false,
    wrapUpHeldAt: null,
    check,
    ...over,
  });

describe("따라 할 문장(listen_sentence) 대조와 소리 줄(spec 설계 4 · AC-4)", () => {
  it("AC-27d say 에 든 listen_sentence 는 글에 없고 소리 줄", () => {
    const r = reply({
      listen_sentence: "I like cats.",
      say: "Say it with me: I like cats. What do you like?",
    });
    expect(r.text).toBe("Say it with me: What do you like?");
    expect(r.text).not.toContain("I like cats");
    expect(r.sound).toEqual({ model: "I like cats." });
    expect(r.record.listen).toEqual({ sentence: "I like cats.", inSay: true });
    expect(r.record.removed).toEqual(["I like cats."]);
    const move = chatTeacherMoveOf({
      reply: r,
      closingSlot: false,
      firstQuestion: false,
      stage: 0,
      extra: { facts: [], run: 0 },
    });
    expect(move.sound).toEqual({ model: "I like cats." });
    expect(move.chat?.listen).toEqual({
      sentence: "I like cats.",
      inSay: true,
    });
    expect(TalkMoveSchema.safeParse(move).success).toBe(true);
  });

  it("AC-27d 정규화(소문자 · 문장 부호 · 축약형 펼침)로 대조하고, 글에서는 say 에 실제로 든 글자를 뺀다", () => {
    const contraction = reply({
      listen_sentence: "I am fine.",
      say: "Good question! I'm fine. How about you?",
    });
    expect(contraction.text).toBe("Good question! How about you?");
    expect(contraction.sound).toEqual({ model: "I'm fine." });
    expect(contraction.record.listen).toEqual({
      sentence: "I am fine.",
      inSay: true,
    });

    const casing = reply({
      listen_sentence: "i like cats",
      say: 'You can say, "I like cats!" Do you?',
    });
    expect(casing.text).not.toContain("cats");
    expect(casing.sound.model).toBe("I like cats!");
    expect(casing.record.listen?.inSay).toBe(true);
  });

  it("AC-27d 어긋남은 글을 바꾸지 않음: say 에 없는 listen_sentence 는 글 그대로 두고 어긋남으로만 남긴다", () => {
    const say = "I like cats. Do you like cats?";
    const r = reply({ listen_sentence: "I like dogs.", say });
    expect(r.text).toBe(say);
    expect(r.sound).toEqual({});
    expect(r.record.listen).toEqual({ sentence: "I like dogs.", inSay: false });
    expect(r.record.removed).toBeUndefined();
    const move = chatTeacherMoveOf({
      reply: r,
      closingSlot: false,
      firstQuestion: false,
      stage: 0,
      extra: { facts: [], run: 0 },
    });
    expect(move.sound).toBeUndefined();
  });

  it("AC-27d 문장의 일부로만 든 따라 할 문장은 문장 경계에 맞지 않아 어긋남이고 글을 바꾸지 않으며, 기록에 partial 표지가 붙는다", () => {
    for (const say of [
      "I like cats and dogs. Do you?",
      "I like cats, too.",
      'You say, "I like cats," okay?',
      "Say it with me: I like cats",
    ]) {
      const r = reply({ listen_sentence: "I like cats.", say });
      expect(r.text).toBe(say);
      expect(r.sound).toEqual({});
      expect(r.record.listen).toEqual({
        sentence: "I like cats.",
        inSay: false,
        partial: true,
      });
    }
    // 아예 없는 꼴은 partial 표지가 없다
    expect(
      reply({ listen_sentence: "I like dogs.", say: "I like cats." }).record
        .listen,
    ).toEqual({ sentence: "I like dogs.", inSay: false });
  });

  it("AC-27d 끝 부호 없는 조각보다 문장 끝 부호가 붙은 조각을 먼저 본다: 앞 문장 일부와 뒤의 온전한 문장이 함께 있으면 온전한 문장을 부호째 뺀다", () => {
    const r = reply({
      listen_sentence: "I like cats.",
      say: "I like cats and dogs. Say it: I like cats.",
    });
    expect(r.text).toBe("I like cats and dogs. Say it:");
    expect(r.sound).toEqual({ model: "I like cats." });
    expect(r.record.listen).toEqual({ sentence: "I like cats.", inSay: true });
  });

  it("AC-27d 말 끝에 부호가 없는 따라 할 문장(글 끝)은 빼지 않고 어긋남이다", () => {
    const say = "Say it with me: I like cats";
    const r = reply({ listen_sentence: "I like cats", say });
    expect(r.text).toBe(say);
    expect(r.record.listen).toEqual({
      sentence: "I like cats",
      inSay: false,
      partial: true,
    });
  });

  it("AC-27d 조각으로 된 따라 할 문장이 문장 뒷부분과만 맞으면(문장 첫머리가 아님) 빼지 않고 글로 둔다(13절 C241 보완 7 — 앞 판의 'I' 꼴을 바꿈)", () => {
    const r = reply({ listen_sentence: "like cats.", say: "I like cats." });
    expect(r.text).toBe("I like cats.");
    expect(r.sound).toEqual({});
    expect(r.record.listen).toEqual({
      sentence: "like cats.",
      inSay: false,
      partial: true,
    });
  });

  it("AC-27d #4 앞 조각이 문장의 일부('Rain sounds go tap, tap, tap.')면 글로 두고, 끝의 온전한 문장 'Tap, tap, tap!' 만 빼 그 글자로 소리 줄을 낸다(분석 L2 2-2 #4)", () => {
    const r = reply({
      listen_sentence: "tap, tap, tap.",
      say: "Yes! Rain sounds go tap, tap, tap. Can you say it with me? Tap, tap, tap!",
    });
    expect(r.text).toBe(
      "Yes! Rain sounds go tap, tap, tap. Can you say it with me?",
    );
    expect(r.sound).toEqual({ model: "Tap, tap, tap!" });
    expect(r.record.removed).toEqual(["Tap, tap, tap!"]);
    expect(r.record.listen?.inSay).toBe(true);
    expect(r.record.soundMoved).toBeUndefined();
  });

  it("AC-27d 같은 따라 할 문장이 다른 글자로 두 자리에서 빠지면 소리 줄은 하나이고 그 글자는 첫 조각(흘림 판단이 잡는 조각과 같음), 자리는 마지막 뺀 자리다(13절 C241 보완 7)", () => {
    const say = "I'm fine. Say it: I am fine. Your turn!";
    const r = reply({ listen_sentence: "I am fine.", say });
    expect(r.sound).toEqual({ model: "I'm fine." });
    expect(chatListenLiteralOf(say, "I am fine.", 3)).toBe("I'm fine.");
    expect(r.text).toBe("Say it: Your turn!");
    expect(r.record.soundMoved).toBe(true);
  });

  it("AC-27d 6.4 출력 검사가 비운 따라 할 문장(빈 글)은 빼지 않는다: say 에 그 문장이 있어도 글 그대로이고 대조 칸이 없다", () => {
    // 6.4 를 지나기 전의 listen_sentence 는 'I like cats.' 였으나 걸려 빈 글로 왔다(코드 검토 rev-chat-p1 H2)
    const say = "Say it with me: I like cats. What do you like?";
    const r = reply({ listen_sentence: "", say });
    expect(r.text).toBe(say);
    expect(r.sound).toEqual({});
    expect(r.record.listen).toBeUndefined();
    expect(r.record.removed).toBeUndefined();
  });

  it("AC-27d 같은 따라 할 문장이 다른 글자로 두 번 들면 둘 다 뺀다", () => {
    const r = reply({
      listen_sentence: "I am fine.",
      say: "I'm fine. Say it: I am fine.",
    });
    expect(r.text).not.toMatch(/fine/);
    expect(r.record.removed).toEqual(["I'm fine.", "I am fine."]);
  });

  it("chatListenLiteralOf: 1~3단계에서 본체가 실제로 빼는 조각일 때만 그 조각을 돌려준다(없거나 문장 경계 밖이면 null)", () => {
    expect(chatListenLiteralOf("I'm fine.", "I am fine", 3)).toBe("I'm fine.");
    // 쉼표 뒤 문장의 일부는 첫머리가 아니다(13절 C241 보완 7 — 본체도 글로 둔다)
    expect(
      chatListenLiteralOf("Wow, I like cats!", "i like cats", 3),
    ).toBeNull();
    expect(chatListenLiteralOf("Wow! I like cats!", "i like cats", 3)).toBe(
      "I like cats!",
    );
    expect(
      chatListenLiteralOf(
        "I like cats and dogs. I like cats.",
        "I like cats",
        3,
      ),
    ).toBe("I like cats.");
    expect(chatListenLiteralOf("I like dogs.", "I like cats.", 3)).toBeNull();
    expect(chatListenLiteralOf("I like cats.", "", 3)).toBeNull();
    expect(
      chatListenLiteralOf("I like cats and dogs.", "I like cats.", 3),
    ).toBeNull();
    // 4단계부터는 빼지 않으므로 null
    expect(chatListenLiteralOf("I like cats.", "I like cats.", 4)).toBeNull();
  });

  it("AC-27d chatListenLiteralOf 와 본체가 같은 판정이다: 1~3단계에서 '이 함수가 null 이 아님 ⟺ 같은 글로 본체를 돌리면 따라 할 문장이 say 에 든 것으로 기록됨'", () => {
    const listen = "I like cats.";
    const cases = [
      "I like cats and dogs.",
      "I like cats, too.",
      'You say, "I like cats," okay?',
      "Say it with me: I like cats",
      "Say it with me: I like cats.",
      'You say, "I like cats." Okay?',
      "Wow, I like cats!",
      "I like cats and dogs. Say it: I like cats.",
      "i LIKE cats.",
      "I like dogs.",
      // 13절 C241 보완 7: 문장의 일부(쉼표 · 낱말 뒤)는 첫머리가 아니고, 따옴표 · 쌍점 뒤는 첫머리다
      "Rain sounds go I like cats.",
      'Say "I like cats." What do you like?',
      "Wow! I like cats. Your turn!",
    ];
    for (const level of [1, 2, 3]) {
      for (const say of cases) {
        const literal = chatListenLiteralOf(say, listen, level);
        const r = reply({ listen_sentence: listen, say }, { level });
        expect(literal !== null, say).toBe(r.record.listen?.inSay === true);
        // 잡아 둔 조각은 본체가 소리 줄로 낸 조각과 같다
        if (literal !== null) expect(r.sound.model, say).toBe(literal);
      }
    }
  });

  it("4단계부터는 빼지 않는다(이야기 방식은 1~3단계에서만 열리고, 4단계의 inSay 는 정규화로 든 것만 본다 — 보고 M-4)", () => {
    const say = "Say it with me: I like cats.";
    const r = reply({ listen_sentence: "I like cats.", say }, { level: 4 });
    expect(r.text).toBe(say);
    expect(r.sound).toEqual({});
    expect(r.record.listen).toEqual({ sentence: "I like cats.", inSay: true });
  });
});

describe("앱이 아는 막힘 뒤의 or 물음(spec 설계 4 · AC-4)", () => {
  const say = "That's okay. Do you like cats or dogs?";

  it("AC-27d 앱이 아는 막힘 뒤의 or 물음 문장은 글에 없고 소리 줄이며 move.ai 는 choices", () => {
    const r = reply({ say }, { appStuck: true });
    expect(r.text).toBe("That's okay.");
    expect(r.sound).toEqual({ answer: "Do you like cats or dogs?" });
    expect(r.record.choices).toBe(true);
    const move = chatTeacherMoveOf({
      reply: r,
      closingSlot: false,
      firstQuestion: false,
      stage: 0,
      extra: { facts: [], run: 0 },
    });
    expect(move.ai).toBe("choices");
    expect(move.sound).toEqual({ answer: "Do you like cats or dogs?" });
  });

  it("AC-27d 막힘이 아니거나 마무리 차례 · wrap_up 차례이면 or 물음을 빼지 않는다", () => {
    expect(reply({ say }).text).toBe(say);
    expect(reply({ say }, { appStuck: true, closingSlot: true }).text).toBe(
      say,
    );
    expect(reply({ say, wrap_up: true }, { appStuck: true }).text).toBe(say);
    expect(reply({ say }).record.choices).toBeUndefined();
  });

  it("AC-27d 거짓으로 다룬 wrap_up(인사 차례)은 wrap_up 차례가 아니라 막힘 뒤 or 물음을 뺀다", () => {
    const r = reply(
      { say, wrap_up: true },
      { appStuck: true, wrapUpHeldAt: "greeting" },
    );
    expect(r.wrapUp).toBe(false);
    expect(r.text).toBe("That's okay.");
  });

  it("AC-27d 빼낸 or 물음 자리가 따라 할 문장을 품으면 소리 줄은 그 자리 하나(answer)이고 model 로 겹쳐 내지 않는다", () => {
    const r = reply(
      {
        listen_sentence: "Do you like cats?",
        say: "Do you like cats? Or dogs?",
      },
      { appStuck: true },
    );
    expect(r.text).toBe("");
    expect(r.sound).toEqual({ answer: "Do you like cats? Or dogs?" });
    expect(r.record.removed).toEqual(["Do you like cats? Or dogs?"]);
    expect(r.record.listen).toEqual({
      sentence: "Do you like cats?",
      inSay: true,
    });
  });

  it("AC-27d 따라 할 문장과 or 물음이 함께 있으면 둘 다 빼고 소리 줄 칸을 가른다", () => {
    const r = reply(
      {
        listen_sentence: "I like cats.",
        say: "Say it with me: I like cats. Do you like cats or dogs?",
      },
      { appStuck: true },
    );
    expect(r.text).toBe("Say it with me:");
    expect(r.sound).toEqual({
      model: "I like cats.",
      answer: "Do you like cats or dogs?",
    });
  });
});

describe("say_ko 의 영어 문장 거르기(spec 설계 4 · C204 (4))", () => {
  it("AC-27d 1~3단계 뜻 줄에서 영어 문장을 거르고, 영어 낱말 하나는 남긴다", () => {
    const r = reply({
      say: "Say it with me: I like cats.",
      listen_sentence: "I like cats.",
      say_ko: '나랑 같이 말해 봐. "I like cats." 라고. cat 은 고양이야.',
    });
    expect(r.sayKo).toBe("나랑 같이 말해 봐. cat 은 고양이야.");
  });
});

describe("기록 전용 검사(spec 설계 4 수준 검사 · 지어낸 경험 꼴)", () => {
  it("AC-27d 수준 검사는 글을 고치지 않고 수치만 남긴다(자는 인자의 문장 2 · 물음 1)", () => {
    const say = "Hello! Do you like cats? Do you like dogs?";
    const r = reply({ say });
    expect(r.text).toBe(say);
    expect(r.record.level.sentences).toBe(3);
    expect(r.record.level.overSentenceMax).toBe(1);
    expect(r.record.level.questions).toBe(2);
    expect(r.record.level.overQuestionMax).toBe(1);
    for (const v of Object.values(r.record.level))
      expect(typeof v).toBe("number");
  });

  it("AC-27d 수준 검사의 자는 코드에 고정하지 않고 인자로 받는다", () => {
    const say = "Hello! Do you like cats? Do you like dogs?";
    const r = reply(
      { say },
      { check: { ...check, sentenceMax: 3, questionMax: 2 } },
    );
    expect(r.record.level.overSentenceMax).toBe(0);
    expect(r.record.level.overQuestionMax).toBe(0);
  });

  it("AC-27d 지어낸 경험 꼴은 고치지 않고 걸린 꼴만 남긴다", () => {
    const say = "Yesterday I went to the park. Do you like parks?";
    const r = reply({ say });
    expect(r.text).toBe(say);
    expect(r.record.madeUp).toEqual(["yesterday i"]);
    expect(reply({ say: "I like cats." }).record.madeUp).toEqual([]);
    expect(
      reply({ say }, { check: { ...check, madeUpPhrases: [] } }).record.madeUp,
    ).toEqual([]);
  });
});

describe("wrap_up 처리(spec 설계 5 · 9 · AC-5)", () => {
  it("AC-27e 거짓으로 다룰 자리: 수업 첫 말 · 돌아옴 입구 · 인사 토막이고, 대화 · 더 이야기하기는 아니다", () => {
    expect(chatWrapUpHeldAtOf({ input: "start", greeting: true })).toBe(
      "start",
    );
    expect(chatWrapUpHeldAtOf({ input: "back", greeting: false })).toBe("back");
    expect(chatWrapUpHeldAtOf({ input: "speech", greeting: true })).toBe(
      "greeting",
    );
    expect(chatWrapUpHeldAtOf({ input: "quiet", greeting: true })).toBe(
      "greeting",
    );
    expect(chatWrapUpHeldAtOf({ input: "speech", greeting: false })).toBeNull();
    expect(chatWrapUpHeldAtOf({ input: "more", greeting: false })).toBeNull();
  });

  it("AC-27e 인사 · 첫 말 · 돌아옴 차례의 wrap_up 참은 거짓으로 다루고 move.chat 에 그 자리를 남기며 마무리 제안(next closing)으로 가지 않는다", () => {
    for (const at of ["start", "greeting", "back"] as const) {
      const r = reply({ say: "Bye!", wrap_up: true }, { wrapUpHeldAt: at });
      expect(r.wrapUp).toBe(false);
      expect(r.record.wrapUpHeld).toBe(at);
      const move = chatTeacherMoveOf({
        reply: r,
        closingSlot: false,
        firstQuestion: false,
        stage: 0,
        extra: { facts: [], run: 0 },
      });
      expect(move.next).toBe("none");
      expect(move.chat?.wrapUpHeld).toBe(at);
    }
  });

  it("AC-27e 그 자리에서도 wrap_up 이 거짓이면 기록이 없다", () => {
    const r = reply({ say: "Hi!" }, { wrapUpHeldAt: "start" });
    expect(r.wrapUp).toBe(false);
    expect(r.record.wrapUpHeld).toBeUndefined();
  });

  it("AC-27e 대화 차례의 wrap_up 참은 그대로 참이고 next closing 이다. 앱의 마무리 차례는 closing_slot 이다", () => {
    const r = reply({ say: "That was fun.", wrap_up: true });
    expect(r.wrapUp).toBe(true);
    expect(r.record.wrapUpHeld).toBeUndefined();
    const move = chatTeacherMoveOf({
      reply: r,
      closingSlot: false,
      firstQuestion: false,
      stage: 0,
      extra: { facts: [], run: 0 },
    });
    expect(move.kind).toBe("ai");
    expect(move.next).toBe("closing");
    const slot = chatTeacherMoveOf({
      reply: reply({ say: "That was fun." }, { closingSlot: true }),
      closingSlot: true,
      firstQuestion: false,
      stage: 0,
      extra: { facts: ["closing"], run: 0 },
    });
    expect(slot.kind).toBe("closing_slot");
    expect(slot.chat?.facts).toEqual(["closing"]);
    expect(
      chatTeacherMoveOf({
        reply: r,
        closingSlot: false,
        firstQuestion: true,
        stage: 0,
        extra: { facts: [], run: 0 },
      }).kind,
    ).toBe("first_question");
  });
});

describe("move.chat 묶음(spec 데이터 move 행 · 선택 칸, 판은 그대로)", () => {
  it("서버가 채우는 칸(문장 문 걸림 · 사실 줄 · 조용함 · 잇달아 말한 수 · 첫 문장 시간 · 설명)이 규격을 지나고 읽힌다", () => {
    const move = chatTeacherMoveOf({
      reply: reply({ listen_sentence: "I like cats.", say: "I like cats." }),
      closingSlot: false,
      firstQuestion: false,
      stage: 0,
      extra: {
        gate: ["ban"],
        facts: ["prep_next"],
        quiet: true,
        run: 2,
        firstMs: 840,
        explain: true,
      },
    });
    expect(move.chat).toMatchObject({
      gate: ["ban"],
      facts: ["prep_next"],
      quiet: true,
      run: 2,
      firstMs: 840,
      explain: true,
    });
    expect(move.lead).toBeUndefined();
    expect(readTalkMove(JSON.parse(JSON.stringify(move)))).toEqual(move);
  });

  it("chat 칸이 없는 move(기존 방식 · 지금 새 방식)는 JSON 글이 이 변경 앞과 같다(키 차례 · 글자 그대로)", () => {
    const plain = talkMoveOf({ kind: "ai", sound: { model: "I like cats." } });
    expect(Object.keys(plain)).not.toContain("chat");
    expect(JSON.stringify(plain)).toBe(
      '{"v":1,"kind":"ai","why":null,"next":"none","item":{"kind":"none","no":0},"goals":[],"words":[],"stage":0,"cause":null,"streak":0,"app":[],"ai":"none","intro":[],"suggest":{"fit":false,"topic":false,"asked":false,"goals":[]},"linked":[],"held":[],"sound":{"model":"I like cats."}}',
    );
    const lead = talkMoveOf({
      kind: "ai",
      lead: {
        reading: "clear_answer",
        move: "react_only",
        asked: [],
        said: [],
      },
    });
    expect(JSON.stringify(lead)).toBe(
      '{"v":1,"kind":"ai","why":null,"next":"none","item":{"kind":"none","no":0},"goals":[],"words":[],"stage":0,"cause":null,"streak":0,"app":[],"ai":"none","intro":[],"suggest":{"fit":false,"topic":false,"asked":false,"goals":[]},"linked":[],"held":[],"lead":{"reading":"clear_answer","move":"react_only","asked":[],"said":[]}}',
    );
  });

  it("원문을 지울 때와 사본에서 listen 의 partial 표지가 남는다", () => {
    const move = chatTeacherMoveOf({
      reply: reply({
        listen_sentence: "I like cats.",
        say: "I like cats, too.",
      }),
      closingSlot: false,
      firstQuestion: false,
      stage: 0,
      extra: { facts: [], run: 0 },
    });
    expect(move.chat?.listen).toEqual({
      sentence: "I like cats.",
      inSay: false,
      partial: true,
    });
    expect(readTalkMove(JSON.parse(JSON.stringify(move)))).toEqual(move);
    expect(talkMoveOf(move).chat?.listen?.partial).toBe(true);
    expect(eraseTalkMoveText(move).chat?.listen).toEqual({
      sentence: "",
      inSay: false,
      partial: true,
    });
  });

  it("원문을 지울 때 chat 묶음의 글 칸(따라 할 문장 · 뺀 문장)만 비우고 값은 남긴다", () => {
    const move = chatTeacherMoveOf({
      reply: reply(
        {
          listen_sentence: "I like cats.",
          say: "Say it with me: I like cats. Do you like cats or dogs?",
        },
        { appStuck: true },
      ),
      closingSlot: false,
      firstQuestion: false,
      stage: 0,
      extra: { facts: [], run: 1 },
    });
    const erased = eraseTalkMoveText(move);
    expect(erased.sound).toBeUndefined();
    expect(erased.chat?.listen).toEqual({ sentence: "", inSay: true });
    expect(erased.chat?.removed).toEqual([]);
    expect(erased.chat?.choices).toBe(true);
    expect(erased.chat?.run).toBe(1);
    expect(eraseTalkMoveText(erased)).toEqual(erased);
  });
});

describe("정리 되짚을 말의 출처(spec 설계 5 정리 · AC-5)", () => {
  const moveOf = (listen: string, say: string) =>
    chatTeacherMoveOf({
      reply: reply({ listen_sentence: listen, say }),
      closingSlot: false,
      firstQuestion: false,
      stage: 0,
      extra: { facts: [], run: 0 },
    });

  it("AC-27e 되짚을 말은 say 에 든 listen_sentence 이고, 어긋난 문장 · chat 칸 없는 행 · move 없는 행은 뺀다", () => {
    const rows = [
      { move: moveOf("I like cats.", "Say it with me: I like cats.") },
      { move: moveOf("I like dogs.", "I like cats.") },
      { move: talkMoveOf({ kind: "ai" }) },
      { move: null },
      {},
      { move: moveOf("I play soccer.", "Wow! I play soccer.") },
    ];
    expect(chatWrapSourcesOf(rows)).toEqual(["I like cats.", "I play soccer."]);
  });

  it("AC-27e 확인된 따라 할 문장이 없으면 정리는 카드 정리 대사로 간다(wrapUpLinesOf 의 지금 고르기)", () => {
    const recasts = chatWrapSourcesOf([
      { move: moveOf("I like dogs.", "I like cats.") },
    ]);
    expect(recasts).toEqual([]);
    const lines = wrapUpLinesOf({
      recasts,
      todayWords: ["play"],
      closingLines: [{ en: "I play outside.", ko: "나는 밖에서 놀아." }],
      koMeaning: true,
      lemmaOf: (s) => s.toLowerCase(),
    });
    expect(lines).toEqual([
      { en: "I play outside.", ko: "나는 밖에서 놀아.", source: "card" },
    ]);
  });
});

// ── 추가 1: 받침 단계(묶음 P3 검토 — 이야기 방식 선생님 행 move.stage) ─────────────

describe("받침 단계(chatTeacherMoveOf 의 stage — 받은 값을 적기만 한다)", () => {
  const moveWith = (
    stage: number,
    over: { closingSlot?: boolean; firstQuestion?: boolean } = {},
  ) =>
    chatTeacherMoveOf({
      reply: reply({ say: "That's okay. I like parks." }),
      closingSlot: over.closingSlot ?? false,
      firstQuestion: over.firstQuestion ?? false,
      stage,
      extra: { facts: [], run: 0 },
    });

  it("AC-27f 받침 단계 1 · 2 를 넘긴 move 는 받침 행(isSupportMove)이고 chat 묶음도 함께 있다", () => {
    for (const stage of [1, 2]) {
      const move = moveWith(stage);
      expect(move.stage).toBe(stage);
      expect(isSupportMove(move)).toBe(true);
      expect(move.chat).toBeDefined();
      expect(TalkMoveSchema.safeParse(move).success).toBe(true);
    }
  });

  it("AC-27f 받침 단계 0 은 단계를 넘기기 전과 글자까지 같은 move 다", () => {
    const move = moveWith(0);
    expect(isSupportMove(move)).toBe(false);
    expect(JSON.stringify(move)).toBe(
      '{"v":1,"kind":"ai","why":null,"next":"none","item":{"kind":"none","no":0},"goals":[],"words":[],"stage":0,"cause":null,"streak":0,"app":[],"ai":"none","intro":[],"suggest":{"fit":false,"topic":false,"asked":false,"goals":[]},"linked":[],"held":[],"chat":{"level":{"sentences":2,"overSentenceMax":0,"longSentences":0,"maxWords":3,"offbandWords":1,"offbandForms":0,"questionsHit":0,"questions":0,"overQuestionMax":0},"madeUp":[],"facts":[],"run":0}}',
    );
    // 단계 1 로 만든 move 와는 stage 칸 하나만 다르다(단계는 다른 칸을 바꾸지 않는다)
    const one = moveWith(1);
    expect(one.stage).toBe(1);
    expect(JSON.stringify({ ...one, stage: 0 })).toBe(JSON.stringify(move));
  });

  it("AC-27f 마무리 자리 · 대화 첫 선생님 행은 지금 새 방식처럼 받침 단계를 적지 않는다(0)", () => {
    expect(moveWith(1, { closingSlot: true }).stage).toBe(0);
    expect(moveWith(2, { firstQuestion: true }).stage).toBe(0);
  });

  it("AC-27f 이 move 를 넣은 행으로 위치 되짚기를 돌리면 이어진 둘째 막힘 뒤 자리 막힘 수가 2 이상이다", () => {
    const settings: TalkLessonSettings = { ...LOW, dontknowMax: 3 };
    const positionOf = (
      turns: readonly TalkLessonTurn[],
      segment: "greeting" | "talk",
    ) =>
      talkLessonPositionOf({
        spec: SPEC3,
        card: CARD3,
        newWords: NEW3,
        turns,
        segment,
        settings,
        prepWords: CARD3.prep ?? [],
      });
    // 선생님 말에 물음이 없는 수업(질문 자리가 없음): 인사 둘을 말로 끝낸 뒤 대화 토막에서 모름 단추 둘
    const STATEMENT = "I like parks.";
    const toriRow = (stage: number) =>
      teacher(
        STATEMENT,
        chatTeacherMoveOf({
          reply: reply({ say: STATEMENT }),
          closingSlot: false,
          firstQuestion: false,
          stage,
          extra: { facts: [], run: 0 },
        }),
      );
    const SAY: ChatInput = { kind: "speech", heard: "I go to the park." };
    const DK: ChatInput = { kind: "dont_know" };
    const turns: TalkLessonTurn[] = [toriRow(0)];
    let segment: "greeting" | "talk" = "greeting";
    let lastStage = 0;
    let after = positionOf(turns, segment);
    for (const input of [SAY, SAY, DK, DK]) {
      const greetingEnd = chatGreetingEndOf({
        input,
        position: positionOf(turns, segment),
        settings,
      });
      const flow = chatChildFlowOf(input);
      if (flow !== null) turns.push(said({ ...flow, segment }));
      after = positionOf(turns, segment);
      lastStage = chatSupportStageOf({
        input,
        positionAfter: after,
        prevStage: lastStage,
        settings,
      });
      turns.push(toriRow(lastStage));
      if (greetingEnd) {
        segment = "talk";
        turns.push(toriRow(0));
      }
    }
    expect(segment).toBe("talk");
    expect(lastStage).toBe(2);
    expect(after.stuckInSlot).toBeGreaterThanOrEqual(2);
    expect(positionOf(turns, "talk").stuckInSlot).toBeGreaterThanOrEqual(2);
  });
});
