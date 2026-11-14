// 회화 N 길의 1~3단계 글 빼기(intent 2026-11-12-회화-Claude-주도 spec 설계 8 · FR-9 · AC-9, plan 묶음 R5): model_repeat 차례의 따라 할 문장과
// 막힌 뒤 고르기 차례의 or 물음 문장을 보이는 글에서 빼고 소리 줄로 돌린다. 안내 말은 글로 남기고 따옴표 · 끝 쉼표 · 겹친 빈칸을 정리한다.
// 뜻 줄(say_ko) · 막힌 뒤 뜻(hint_ko)은 지금 길의 영어 문장 거르개를 지난다. 4단계부터는 아무것도 빼지 않는다. 문장은 실험 P 실행의 실제 말 칸이다
// (docs/research/2026-11-12-회화-구조-비교-실험/runs).
import { describe, expect, it } from "vitest";
import {
  type LeadLowBandInput,
  leadKoLineOf,
  leadLowBandShownOf,
  lowBandPlacedLinesOf,
  lowBandSoundAtOf,
  lowBandStrippedOf,
} from "@/core/conversation/lead-low-band";

const base: LeadLowBandInput = {
  level: 3,
  move: "react_and_follow_up",
  say: "",
  modelSentence: "",
  prevStuck: false,
  closing: false,
};

const shown = (over: Partial<LeadLowBandInput>) =>
  leadLowBandShownOf({ ...base, ...over });

describe("AC-26i 1~3단계 따라 할 문장 글 빼기", () => {
  it("AC-26i 끝에 있는 따라 할 문장(안내 말 'Say it with me:' 는 글로 남음, P-K3-s2 차례 5)", () => {
    const out = shown({
      move: "model_repeat",
      say: "Yes, grass! Say it with me: I see grass.",
      modelSentence: "I see grass.",
    });
    expect(out.text).toBe("Yes, grass! Say it with me:");
    expect(out.removed).toEqual(["I see grass."]);
    expect(out.model).toEqual({ sentence: "I see grass.", removed: true });
    expect(out.soundMoved).toBe(false);
  });

  it("AC-26i 'Say: I look at comic books.'(P-K3-s1 차례 7)", () => {
    const out = shown({
      move: "model_repeat",
      say: "Oh, comic books are fun! Say: I look at comic books.",
      modelSentence: "I look at comic books.",
    });
    expect(out.text).toBe("Oh, comic books are fun! Say:");
    expect(out.removed).toEqual(["I look at comic books."]);
  });

  it("AC-26i 따옴표로 싼 따라 할 문장은 따옴표를 정리하고 안내 말 뒤 끝 쉼표를 쌍점으로 바꾼다(P-K1-s1 차례 10 · 화면 검토 M-2)", () => {
    const out = shown({
      move: "model_repeat",
      say: 'Yes, the sun is bright! Say, "I see the sun."',
      modelSentence: "I see the sun.",
    });
    expect(out.text).toBe("Yes, the sun is bright! Say:");
    expect(out.removed).toEqual(["I see the sun."]);
  });

  it('AC-26i 따옴표 안 문장이 마침표 없이 확인돼도 남은 따옴표 · 마침표를 정리한다("Say: \\"I look at comic books.\\"")', () => {
    const out = shown({
      move: "model_repeat",
      say: 'Say: "I look at comic books."',
      modelSentence: "I look at comic books",
    });
    expect(out.text).toBe("Say:");
    expect(out.removed).toEqual(["I look at comic books"]);
  });

  it("AC-26i 둥근 따옴표 · 따옴표 밖 마침표도 정리하고 끝 쉼표는 쌍점이다", () => {
    const out = shown({
      move: "model_repeat",
      say: "Good job! Say, “I drink juice at the beach”.",
      modelSentence: "I drink juice at the beach",
    });
    expect(out.text).toBe("Good job! Say:");
  });

  it("AC-26i 따라 말하게 하는 안내 말(Repeat after me · Say it) 뒤의 끝 쉼표도 쌍점이다(검토 rev-s5 M-4)", () => {
    expect(
      shown({
        move: "model_repeat",
        say: 'Great! Repeat after me, "I like it."',
        modelSentence: "I like it.",
      }).text,
    ).toBe("Great! Repeat after me:");
    expect(
      shown({
        move: "model_repeat",
        say: "Nice! Say it, I see the sun.",
        modelSentence: "I see the sun.",
      }).text,
    ).toBe("Nice! Say it:");
  });

  it("AC-26i 쉼표 뒤 문장의 일부로만 든 따라 할 문장은 빼지 않고 글로 둔다('Wow, I like it.' — 13절 C241 보완 7 · D-2 (1), 앞 판의 'Wow' 꼴을 바꿈)", () => {
    const say = "Wow, I like it.";
    const out = shown({
      move: "model_repeat",
      say,
      modelSentence: "I like it.",
    });
    expect(out.text).toBe(say);
    expect(out.removed).toEqual([]);
    expect(out.model).toEqual({ sentence: "I like it.", removed: false });
  });

  it("AC-26i 가운데 있는 따라 할 문장은 빼고 뒤 글을 남기며, 소리 줄은 뺀 자리(안내 말 'Say it:' 뒤 · 뒤 글 앞)에서 읽는다(13절 C241 보완 7)", () => {
    const out = shown({
      move: "model_repeat",
      say: "Good! Say it: I swim at the pool. You can do it!",
      modelSentence: "I swim at the pool.",
    });
    expect(out.text).toBe("Good! Say it: You can do it!");
    expect(out.removed).toEqual(["I swim at the pool."]);
    expect(out.soundAt).toEqual({ model: "Good! Say it:".length });
    expect(lowBandPlacedLinesOf(out.text, out.soundAt)).toEqual([
      { t: "s", en: "Good!" },
      { t: "s", en: "Say it:" },
      { t: "slot", kind: "model", before: 2 },
      { t: "s", en: "You can do it!" },
    ]);
    // 단추는 말풍선 아래 글 뒤에 있어 원래 차례와 다르다(soundMoved 의 뜻을 좁힘)
    expect(out.soundMoved).toBe(true);
  });

  it("AC-26i 같은 따라 할 문장이 두 번 나오면 둘 다 뺀다", () => {
    const out = shown({
      move: "model_repeat",
      say: "Let's try together! Say: I see the sky. I see the sky.",
      modelSentence: "I see the sky.",
    });
    expect(out.text).toBe("Let's try together! Say:");
    expect(out.removed).toEqual(["I see the sky.", "I see the sky."]);
    expect(out.soundMoved).toBe(false);
  });

  it("AC-26i 말 칸 전체가 따라 할 문장이면 글이 빈다", () => {
    const out = shown({
      move: "model_repeat",
      say: "I eat sandwiches.",
      modelSentence: "I eat sandwiches.",
    });
    expect(out.text).toBe("");
    expect(out.removed).toEqual(["I eat sandwiches."]);
  });

  it("AC-26i 뺄 문장이 말 칸에 글자 그대로 없으면 빼지 않고 그대로 두며 그 사실을 돌려준다", () => {
    const say = "Yes, grass! Say it with me: I see the grass!";
    const out = shown({
      move: "model_repeat",
      say,
      modelSentence: "I see grass.",
    });
    expect(out.text).toBe(say);
    expect(out.removed).toEqual([]);
    expect(out.model).toEqual({ sentence: "I see grass.", removed: false });
  });

  it("AC-26i 대소문자가 다르면 글자 그대로가 아니다", () => {
    const say = "Nice! Say: i see the sky.";
    const out = shown({
      move: "model_repeat",
      say,
      modelSentence: "I see the sky.",
    });
    expect(out.text).toBe(say);
    expect(out.model).toEqual({ sentence: "I see the sky.", removed: false });
  });

  it("AC-26i model_repeat 인데 따라 할 문장이 비면 빼지 않고 빈 문장으로 돌려준다", () => {
    const say = "Let's try together!";
    const out = shown({ move: "model_repeat", say, modelSentence: "  " });
    expect(out.text).toBe(say);
    expect(out.model).toEqual({ sentence: "", removed: false });
  });

  it("AC-26i 마침표 없는 따라 할 문장은 문장 경계에서만 뺀다(반응 문장 'I like pizza too.' 는 남김, 검토 M-1)", () => {
    const out = shown({
      move: "model_repeat",
      say: "Wow, yes! I like pizza too. Say it with me: I like pizza.",
      modelSentence: "I like pizza",
    });
    expect(out.text).toBe("Wow, yes! I like pizza too. Say it with me:");
    expect(out.removed).toEqual(["I like pizza"]);
    expect(out.model).toEqual({ sentence: "I like pizza", removed: true });
    expect(out.soundMoved).toBe(false);
  });

  it("AC-26i 따라 할 문장이 다른 낱말의 앞부분('the sea' → 'the seashells')이면 빼지 않는다(검토 M-1)", () => {
    const say = "Say: I see the seashells.";
    const out = shown({
      move: "model_repeat",
      say,
      modelSentence: "I see the sea",
    });
    expect(out.text).toBe(say);
    expect(out.removed).toEqual([]);
    expect(out.model).toEqual({ sentence: "I see the sea", removed: false });
  });

  it("AC-26i 곧은 작은따옴표로 싼 따라 할 문장도 따옴표를 정리하고 줄임표(I'm)는 그대로 둔다(검토 M-2)", () => {
    const out = shown({
      move: "model_repeat",
      say: "Great! I'm happy. Say it with me: 'I see the sky.'",
      modelSentence: "I see the sky.",
    });
    expect(out.text).toBe("Great! I'm happy. Say it with me:");
    expect(out.removed).toEqual(["I see the sky."]);
  });

  it("AC-26i model_repeat 가 아닌 차례는 model_sentence 가 있어도 빼지 않는다", () => {
    const say = "Nice! I see the sky too.";
    const out = shown({
      move: "react_only",
      say,
      modelSentence: "I see the sky.",
    });
    expect(out.text).toBe(say);
    expect(out.removed).toEqual([]);
    expect(out.model).toBeNull();
  });
});

describe("AC-26i 1~3단계 막힌 뒤 고르기 물음 글 빼기", () => {
  it("AC-26i 쉼표 든 or 물음('Do you watch TV, or play games?', P-K3-s1 차례 6)", () => {
    const out = shown({
      move: "easier_or_choices",
      say: "That's okay! Do you watch TV, or play games?",
      prevStuck: true,
    });
    expect(out.text).toBe("That's okay!");
    expect(out.removed).toEqual(["Do you watch TV, or play games?"]);
    expect(out.soundMoved).toBe(false);
  });

  it("AC-26i 앞 아이 차례가 막힘이면 move 가 무엇이든 고르기 차례다(ask_again 'Beach or mountain?', P-K3-s1 차례 4)", () => {
    const out = shown({
      move: "ask_again",
      say: "Sorry, say it again, please! Beach or mountain?",
      prevStuck: true,
    });
    expect(out.text).toBe("Sorry, say it again, please!");
    expect(out.removed).toEqual(["Beach or mountain?"]);
  });

  it("AC-26i 막힘이 아니어도 move 가 easier_or_choices 면 고르기 차례다(P-K1-s1 차례 13)", () => {
    const out = shown({
      move: "easier_or_choices",
      say: "OK! You go to the beach. Do you go in summer or winter?",
    });
    expect(out.text).toBe("OK! You go to the beach.");
    expect(out.removed).toEqual(["Do you go in summer or winter?"]);
  });

  it("AC-26i or 물음이 마지막 문장이 아니면 그 문장만 빼고 뒤 글을 남기며 소리 차례가 바뀐다(P-K1-s2 차례 16)", () => {
    const out = shown({
      move: "easier_or_choices",
      say: "Okay! Watch TV, or go outside? Which one?",
      prevStuck: true,
    });
    expect(out.text).toBe("Okay! Which one?");
    expect(out.removed).toEqual(["Watch TV, or go outside?"]);
    // 소리 줄은 뺀 자리에서 읽는다: Okay! → 고르기 물음 → Which one?(13절 C241 보완 7)
    expect(out.soundAt).toEqual({ answer: "Okay!".length });
    expect(lowBandPlacedLinesOf(out.text, out.soundAt)).toEqual([
      { t: "s", en: "Okay!" },
      { t: "slot", kind: "answer", before: 1 },
      { t: "s", en: "Which one?" },
    ]);
    expect(out.soundMoved).toBe(true);
  });

  it("AC-26i 보통 차례의 이어 묻는 고르기 질문은 글로 둔다(P-K3-s2 차례 4)", () => {
    const say = "A park, nice! Do you see grass or a river?";
    const out = shown({ move: "react_and_follow_up", say });
    expect(out.text).toBe(say);
    expect(out.removed).toEqual([]);
  });

  it("AC-26i 마무리 차례 · move wrap_up 차례의 물음은 빼지 않는다", () => {
    const say = "That was fun! Do you want to talk more, or stop here?";
    expect(
      shown({ move: "react_only", say, prevStuck: true, closing: true }).text,
    ).toBe(say);
    expect(shown({ move: "wrap_up", say, prevStuck: true }).text).toBe(say);
  });

  it("AC-26i or 가 없는 물음 · or 가 물음 문장 밖에 있는 글은 빼지 않는다", () => {
    const a = "Sorry, I didn't hear well! Do you eat at the park?";
    expect(
      shown({ move: "easier_or_choices", say: a, prevStuck: true }).text,
    ).toBe(a);
    const b = "Cats or dogs, both are cute. What do you like?";
    expect(
      shown({ move: "easier_or_choices", say: b, prevStuck: true }).text,
    ).toBe(b);
  });

  it("AC-26i 두 물음 문장으로 나뉜 고르기('Do you go to the beach? Or the mountain?')는 두 문장을 한 소리 줄로 뺀다(검토 I-1)", () => {
    const out = shown({
      move: "easier_or_choices",
      say: "That's okay! Do you go to the beach? Or the mountain?",
      prevStuck: true,
    });
    expect(out.text).toBe("That's okay!");
    expect(out.removed).toEqual(["Do you go to the beach? Or the mountain?"]);
    expect(out.soundMoved).toBe(false);
  });

  it("AC-26i 짧은 나뉜 고르기('Beach? Or mountain?')도 막힌 뒤면 뺀다(검토 I-1)", () => {
    const out = shown({
      move: "ask_again",
      say: "No problem! Beach? Or mountain?",
      prevStuck: true,
    });
    expect(out.text).toBe("No problem!");
    expect(out.removed).toEqual(["Beach? Or mountain?"]);
  });

  it("AC-26i 나뉜 고르기 뒤에 남은 글이 있으면 소리 차례가 바뀐다", () => {
    const out = shown({
      move: "easier_or_choices",
      say: "Okay! Cats? Or dogs? You can pick one.",
    });
    expect(out.text).toBe("Okay! You can pick one.");
    expect(out.removed).toEqual(["Cats? Or dogs?"]);
    expect(out.soundMoved).toBe(true);
  });

  it("AC-26i 한 문장 고르기는 그 문장만 뺀다(나뉜 꼴 판정이 한 문장 꼴을 바꾸지 않음)", () => {
    const out = shown({
      move: "easier_or_choices",
      say: "That's okay! Do you go to the beach or the mountain?",
      prevStuck: true,
    });
    expect(out.text).toBe("That's okay!");
    expect(out.removed).toEqual(["Do you go to the beach or the mountain?"]);
  });

  it("AC-26i or 가 없는 물음 둘 · 앞에 물음 문장이 없는 'Or what?' 은 고르기가 아니어서 빼지 않는다", () => {
    const a = "That's okay! Do you like it? Do you swim?";
    expect(
      shown({ move: "easier_or_choices", say: a, prevStuck: true }),
    ).toEqual({
      text: a,
      removed: [],
      cutsAt: [],
      model: null,
      moreRemoved: [],
      soundAt: {},
      soundMoved: false,
    });
    const b = "I like cats. Or what?";
    expect(
      shown({ move: "easier_or_choices", say: b, prevStuck: true }),
    ).toEqual({
      text: b,
      removed: [],
      cutsAt: [],
      model: null,
      moreRemoved: [],
      soundAt: {},
      soundMoved: false,
    });
  });

  it("AC-26i 마무리 차례의 나뉜 고르기 물음은 빼지 않는다", () => {
    const say = "That was fun! Do you want to talk more? Or stop here?";
    expect(
      shown({ move: "react_only", say, prevStuck: true, closing: true }).text,
    ).toBe(say);
  });

  it("AC-26i 따라 할 문장과 or 물음이 한 차례에 함께 있으면 둘 다 원래 차례대로 뺀다", () => {
    const out = shown({
      move: "model_repeat",
      say: "Say: I see grass. Grass or a river?",
      modelSentence: "I see grass.",
      prevStuck: true,
    });
    expect(out.text).toBe("Say:");
    expect(out.removed).toEqual(["I see grass.", "Grass or a river?"]);
    expect(out.soundMoved).toBe(false);
  });
});

describe("AC-26i 뺀 자리의 글 · 쌍점 · 문장 첫머리 · 소리 줄 자리(13절 C241 보완 7, 분석 L2 2-2 예문)", () => {
  /** 글과 소리 줄 자리로 낸 줄 차례를 읽는 차례로(글 줄은 글, 소리 줄은 '🔊 갈래:소리 글'). */
  const heardOf = (
    out: ReturnType<typeof shown>,
    sound: { model?: string; answer?: string },
  ) => {
    const lines = lowBandPlacedLinesOf(out.text, out.soundAt);
    const placed = new Set(
      lines.flatMap((l) => (l.t === "slot" ? [l.kind] : [])),
    );
    return [
      ...lines.map((l) =>
        l.t === "s" ? l.en : `🔊 ${sound[l.kind] ?? "(없음)"}`,
      ),
      ...(["model", "answer"] as const).flatMap((k) =>
        sound[k] !== undefined && !placed.has(k) ? [`🔊 ${sound[k]}`] : [],
      ),
    ];
  };

  it("AC-26i #8 'Say \"…\"' 뒤에 다른 물음이 오면 안내 말 뒤에 쌍점을 두고 줄을 나눠, 들리는 차례가 선생님 말 그대로다", () => {
    const out = shown({
      move: "model_repeat",
      say: 'Soccer is fun! Say "I play soccer." What else do you do?',
      modelSentence: "I play soccer.",
    });
    expect(out.text).toBe("Soccer is fun! Say: What else do you do?");
    expect(out.removed).toEqual(["I play soccer."]);
    expect(heardOf(out, { model: "I play soccer." })).toEqual([
      "Soccer is fun!",
      "Say:",
      "🔊 I play soccer.",
      "What else do you do?",
    ]);
    expect(out.soundMoved).toBe(true);
  });

  it("AC-26i #9 'You can say \"…\" Nice!' 는 'You can say:' → 소리 줄 → 'Nice!'", () => {
    const out = shown({
      move: "model_repeat",
      say: 'You can say "I play soccer." Nice!',
      modelSentence: "I play soccer.",
    });
    expect(out.text).toBe("You can say: Nice!");
    expect(heardOf(out, { model: "I play soccer." })).toEqual([
      "You can say:",
      "🔊 I play soccer.",
      "Nice!",
    ]);
  });

  it("AC-26i #10 'Say, \"…\"' 뒤에 다른 물음이 와도 쉼표는 쌍점이다", () => {
    const out = shown({
      move: "model_repeat",
      say: 'Soccer is fun! Say, "I play soccer." What else do you do?',
      modelSentence: "I play soccer.",
    });
    expect(out.text).toBe("Soccer is fun! Say: What else do you do?");
    expect(heardOf(out, { model: "I play soccer." })).toEqual([
      "Soccer is fun!",
      "Say:",
      "🔊 I play soccer.",
      "What else do you do?",
    ]);
  });

  it("AC-26i #11 쉼표 없는 'Say \"…\"' 가 글 끝이면 'Say:' 이고 소리 줄은 글 뒤(지금 차례)다", () => {
    const out = shown({
      move: "model_repeat",
      say: 'Soccer is fun! Say "I play soccer."',
      modelSentence: "I play soccer.",
    });
    expect(out.text).toBe("Soccer is fun! Say:");
    expect(lowBandPlacedLinesOf(out.text, out.soundAt)).toEqual([
      { t: "s", en: "Soccer is fun!" },
      { t: "s", en: "Say:" },
    ]);
    expect(out.soundMoved).toBe(false);
  });

  it("AC-26i #12 문장의 일부로 든 앞 자리는 글로 두고 문장 첫머리인 뒤 자리만 뺀다('Wow, I play soccer.' 가 보임 — D-2 (1))", () => {
    const out = shown({
      move: "model_repeat",
      say: "Wow, I play soccer. Say it with me: I play soccer.",
      modelSentence: "I play soccer.",
    });
    expect(out.text).toBe("Wow, I play soccer. Say it with me:");
    expect(out.removed).toEqual(["I play soccer."]);
    expect(out.model).toEqual({ sentence: "I play soccer.", removed: true });
    expect(out.soundMoved).toBe(false);
  });

  it("AC-26i #1 'Try this: \"…\" Can you say it?' 는 쌍점 뒤에서 소리 줄을 읽고 물음이 뒤에 온다", () => {
    const out = shown({
      move: "model_repeat",
      say: 'It\'s okay! Try this: "I watch TV." Can you say it?',
      modelSentence: "I watch TV.",
    });
    expect(out.text).toBe("It's okay! Try this: Can you say it?");
    expect(heardOf(out, { model: "I watch TV." })).toEqual([
      "It's okay!",
      "Try this:",
      "🔊 I watch TV.",
      "Can you say it?",
    ]);
  });

  it("AC-26i #4 'Rain sounds go tap, tap, tap.' 의 뒤 조각은 문장의 일부라 빼지 않고, 끝의 온전한 'Tap, tap, tap!' 만 뺀다(다른 글자 조각 moreModels)", () => {
    const out = shown({
      move: "model_repeat",
      say: "Yes! Rain sounds go tap, tap, tap. Can you say it with me? Tap, tap, tap!",
      modelSentence: "tap, tap, tap.",
      moreModels: ["Tap, tap, tap!"],
    });
    expect(out.text).toBe(
      "Yes! Rain sounds go tap, tap, tap. Can you say it with me?",
    );
    expect(out.removed).toEqual(["Tap, tap, tap!"]);
    expect(out.model).toEqual({ sentence: "tap, tap, tap.", removed: false });
    expect(out.moreRemoved).toEqual(["Tap, tap, tap!"]);
    expect(out.soundMoved).toBe(false);
  });

  it("AC-26i #7 'He says, \"More, please!\"' 처럼 안내 말이 say · repeat 가 아니어도 뺀 자리 앞 쉼표는 쌍점이다", () => {
    const out = shown({
      move: "model_repeat",
      say: 'Yes! The monkey likes banana milk. He says, "More, please!"',
      modelSentence: "More, please!",
    });
    expect(out.text).toBe("Yes! The monkey likes banana milk. He says:");
    expect(out.removed).toEqual(["More, please!"]);
  });

  it("AC-26i 같은 따라 할 문장이 두 자리에서 빠지면 소리 줄은 마지막 자리 하나다(그 사이 글 뒤)", () => {
    const out = shown({
      move: "model_repeat",
      say: "Say: I see the sky. Good! I see the sky. Your turn!",
      modelSentence: "I see the sky.",
    });
    expect(out.text).toBe("Say: Good! Your turn!");
    expect(out.removed).toEqual(["I see the sky.", "I see the sky."]);
    expect(out.cutsAt).toEqual(["Say:".length, "Say: Good!".length]);
    expect(out.soundAt).toEqual({ model: "Say: Good!".length });
    // 소리 줄이 없는 앞 자리에서는 줄을 나누지 않는다(글 줄은 문장마다)
    expect(heardOf(out, { model: "I see the sky." })).toEqual([
      "Say: Good!",
      "🔊 I see the sky.",
      "Your turn!",
    ]);
  });

  it("AC-26i 행에 남길 소리 줄 자리는 앞서 나간 글 줄과 그 앞 글 줄을 이은 글의 글자 수이고, 그 글을 같은 자리에서 나누면 같은 줄 차례다", () => {
    const lines = lowBandPlacedLinesOf("Okay! Which one?", { answer: 5 });
    const at = lowBandSoundAtOf(lines, ["Hi!"]);
    expect(at).toEqual({ answer: "Hi! Okay!".length });
    expect(lowBandPlacedLinesOf("Hi! Okay! Which one?", at)).toEqual([
      { t: "s", en: "Hi!" },
      { t: "s", en: "Okay!" },
      { t: "slot", kind: "answer", before: 2 },
      { t: "s", en: "Which one?" },
    ]);
    // 자리가 없거나 뒤에 글이 없으면 slot 이 없다(지금 차례 — 글 뒤)
    expect(lowBandPlacedLinesOf("Okay!", { answer: 5 })).toEqual([
      { t: "s", en: "Okay!" },
    ]);
    expect(lowBandPlacedLinesOf("Okay! Which one?", {})).toEqual([
      { t: "s", en: "Okay!" },
      { t: "s", en: "Which one?" },
    ]);
  });

  it("AC-26i 이야기 방식의 잡아 둔 글 지우기는 본체와 같은 다듬기 · 같은 자리다(다듬기 한 곳, S1 재검토 2 M2-1)", () => {
    const say = 'Say "I play soccer." What else do you do?';
    const body = shown({
      move: "model_repeat",
      say,
      modelSentence: "I play soccer.",
    });
    expect(lowBandStrippedOf(say, ["I play soccer."])).toEqual({
      text: body.text,
      cutsAt: body.cutsAt,
    });
    // 빈 괄호 · 낱말 없는 조각은 지우고, 못 찾은 조각의 자리는 undefined
    expect(lowBandStrippedOf("Say (I play.) now.", ["I play.", "x"])).toEqual({
      text: "Say: now.",
      cutsAt: ["Say:".length, undefined],
    });
    expect(lowBandStrippedOf("Hi  there.", ["x"])).toEqual({
      text: "Hi there.",
      cutsAt: [undefined],
    });
  });
});

describe("AC-26i 4단계부터는 빼지 않는다", () => {
  it("AC-26i 4단계 model_repeat · 막힌 뒤 고르기는 글 그대로", () => {
    const say = "Yes, grass! Say it with me: I see grass.";
    const model = shown({
      level: 4,
      move: "model_repeat",
      say,
      modelSentence: "I see grass.",
    });
    expect(model).toEqual({
      text: say,
      removed: [],
      cutsAt: [],
      model: null,
      moreRemoved: [],
      soundAt: {},
      soundMoved: false,
    });
    const choice = "That's okay! Do you watch TV, or play games?";
    expect(
      shown({
        level: 4,
        move: "easier_or_choices",
        say: choice,
        prevStuck: true,
      }).text,
    ).toBe(choice);
  });

  it("AC-26i 1단계도 뺀다", () => {
    const out = shown({
      level: 1,
      move: "model_repeat",
      say: 'Yum, juice! Say, "I drink juice at the beach."',
      modelSentence: "I drink juice at the beach.",
    });
    expect(out.text).toBe("Yum, juice! Say:");
  });
});

describe("AC-26i 1~3단계 뜻 줄 · 막힌 뒤 뜻의 영어 문장 거르기", () => {
  it("AC-26i 따옴표 안 영어 문장이 든 뜻 줄(P-K1-s1 차례 10)", () => {
    expect(
      leadKoLineOf(3, '맞아, 해가 밝지! "I see the sun."이라고 말해 봐.'),
    ).toBe("맞아, 해가 밝지!");
  });

  it("AC-26i 쌍점 뒤 영어 문장이 든 뜻 줄(P-K3-s2 차례 5)", () => {
    expect(leadKoLineOf(2, "그래, 풀! 나랑 같이 말해 봐: I see grass.")).toBe(
      "그래, 풀!",
    );
  });

  it("AC-26i 영어 낱말 하나('TV를 봐')는 남는다(P-K3-s1 차례 6)", () => {
    const ko = "괜찮아! TV를 봐, 아니면 게임을 해?";
    expect(leadKoLineOf(3, ko)).toBe(ko);
  });

  it("AC-26i 막힌 뒤 뜻(hint_ko)에 영어 답이 섞이면 그 문장을 뺀다", () => {
    expect(
      leadKoLineOf(1, "좋아하는 음식을 말해 봐. 'I like pizza.'처럼."),
    ).toBe("좋아하는 음식을 말해 봐.");
    expect(leadKoLineOf(1, '"I eat sandwiches."라고 말할 수 있어.')).toBe("");
  });

  it("AC-26i 4단계부터는 뜻 줄을 거르지 않는다", () => {
    const ko = "그래, 풀! 나랑 같이 말해 봐: I see grass.";
    expect(leadKoLineOf(4, ko)).toBe(ko);
  });
});
