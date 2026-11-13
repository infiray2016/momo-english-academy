// 회화 N 길의 1~3단계 글 빼기(intent 2026-11-12-회화-Claude-주도 spec 설계 8 · FR-9 · AC-9, plan 묶음 R5): model_repeat 차례의 따라 할 문장과
// 막힌 뒤 고르기 차례의 or 물음 문장을 보이는 글에서 빼고 소리 줄로 돌린다. 안내 말은 글로 남기고 따옴표 · 끝 쉼표 · 겹친 빈칸을 정리한다.
// 뜻 줄(say_ko) · 막힌 뒤 뜻(hint_ko)은 지금 길의 영어 문장 거르개를 지난다. 4단계부터는 아무것도 빼지 않는다. 문장은 실험 P 실행의 실제 말 칸이다
// (docs/research/2026-11-12-회화-구조-비교-실험/runs).
import { describe, expect, it } from "vitest";
import {
  type LeadLowBandInput,
  leadKoLineOf,
  leadLowBandShownOf,
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

  it("AC-26i 안내 말이 아닌 말 뒤의 끝 쉼표는 묶음 S5 전처럼 지운다('Wow, I like it.' → 'Wow', 검토 rev-s5 M-4)", () => {
    const out = shown({
      move: "model_repeat",
      say: "Wow, I like it.",
      modelSentence: "I like it.",
    });
    expect(out.text).toBe("Wow");
    expect(out.removed).toEqual(["I like it."]);
  });

  it("AC-26i 가운데 있는 따라 할 문장은 빼고 뒤 글을 남기며 소리 차례가 바뀐 것을 돌려준다", () => {
    const out = shown({
      move: "model_repeat",
      say: "Good! Say it: I swim at the pool. You can do it!",
      modelSentence: "I swim at the pool.",
    });
    expect(out.text).toBe("Good! Say it: You can do it!");
    expect(out.removed).toEqual(["I swim at the pool."]);
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
    ).toEqual({ text: a, removed: [], model: null, soundMoved: false });
    const b = "I like cats. Or what?";
    expect(
      shown({ move: "easier_or_choices", say: b, prevStuck: true }),
    ).toEqual({ text: b, removed: [], model: null, soundMoved: false });
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
      model: null,
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
