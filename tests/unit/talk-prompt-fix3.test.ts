// 회화 턴 프롬프트 · 흐름 규칙 고침 3(대본 4회차 설계 재판정 task-talk-quality-review-2.md N-1 · N-2 · 두 낱말 관련 말 · N-3 · N-5 · N-6 · N-8).
// 되묻는 고르기 거름 · 늦은 카드 답 · 카드 항목만 필수인 되돌림 · 장면에 닿는 두 낱말 · 고정부 문장. 실제 API 를 부르지 않는다.
import { describe, expect, it } from "vitest";
import {
  normalizeTalkLesson,
  type TalkLessonOutput,
  talkLessonSystem,
  talkSceneWordsOf,
} from "@/core/ai/calls/talk-lesson";
import {
  effectiveStuckOf,
  sceneWordsOf,
  touchesScene,
} from "@/core/conversation/child-kind";
import { lateCardAnswerOf } from "@/core/conversation/lesson-flow";
import { choicesEchoChild } from "@/core/conversation/question-check";
import { questionRetryNoteOf } from "@/core/conversation/question-retry";
import { lessonCallTurnOf } from "@/server/conversation/lesson-turn";
import {
  GOAL_1,
  lessonInput,
  lessonRules,
} from "../fixtures/ai/talk-lesson-inputs";
import { aiTurn, opening3, said } from "../fixtures/talk-lesson";

const lemma = (w: string) =>
  ({ plays: "play", played: "play" })[w.toLowerCase()];

function answer(over: Partial<TalkLessonOutput> = {}): TalkLessonOutput {
  return {
    child_kind: "answer",
    stuck: false,
    tori_en: "Yes, the juice is cold! Is it red or blue?",
    model_line: "",
    choices: [],
    tori_ko: ["응, 주스가 차가워!", "빨간색이야 파란색이야?"],
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    response_fit: true,
    child_topic: false,
    child_asked: false,
    goal_suggest: [],
    next_move: "follow_up",
    card_item: { kind: "none", no: 0 },
    next_goal: [GOAL_1],
    support: "choices",
    next_targets: [],
    next_hint_ko: "",
    next_hints: [],
    next_usable_phrases: [],
    next_answer_example: "It is red.",
    image_word: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}

describe("N-1 아이가 방금 한 말을 되묻는 고르기(02-2 196 · 184)", () => {
  it("바뀌는 자리가 아이 말의 낱말이면 참, 새 물음이면 거짓", () => {
    expect(
      choicesEchoChild(["It is cold.", "It is hot."], "Cold.", lemma),
    ).toBe(true);
    expect(
      choicesEchoChild(
        ["I like fish.", "I like rice."],
        "Yes I like fish.",
        lemma,
      ),
    ).toBe(true);
    expect(
      choicesEchoChild(["It is big.", "It is small."], "Yes big fish.", lemma),
    ).toBe(true);
    expect(
      choicesEchoChild(
        ["It is apple juice.", "It is orange juice."],
        "I drink the juice.",
        lemma,
      ),
    ).toBe(false);
    // 바뀌지 않는 자리(like)가 아이 말에 있어도 되묻기가 아니다
    expect(
      choicesEchoChild(
        ["I like my friend.", "I like my day."],
        "I like it.",
        lemma,
      ),
    ).toBe(false);
  });

  it("정규화는 되묻는 고르기를 버리고, 새 것을 묻는 고르기는 남긴다(2~3단계 이어 묻기)", () => {
    const input = (child: string) =>
      lessonInput(3, { turn: { child, input: "speech" } });
    const ask = "Nice! Do you like your friend or your day?";
    const echo = normalizeTalkLesson(
      answer({
        tori_en: ask,
        choices: ["I like my friend.", "I like my day."],
      }),
      input("My friend is fun."),
      lessonRules(3),
    );
    expect(echo?.choices).toEqual([]);
    expect(echo?.support).toBe("none");
    const fresh = normalizeTalkLesson(
      answer({
        tori_en: ask,
        choices: ["I like my friend.", "I like my day."],
      }),
      input("Yes."),
      lessonRules(3),
    );
    expect(fresh?.choices).toEqual(["I like my friend.", "I like my day."]);
  });
});

describe("N-2 늦은 카드 답 · 카드 항목만 필수인 되돌림", () => {
  it("가장 최근 필수 질문 차례의 노린 단어를 아이 말이 담으면 늦은 카드 답이다(원형으로)", () => {
    const turns = [
      ...opening3(),
      said(),
      aiTurn("Nice! Do you like it?", { next: "follow_up" }),
      said(),
    ];
    expect(
      lateCardAnswerOf({ turns, child: "I play soccer.", lemmaOf: lemma }),
    ).toBe(true);
    expect(
      lateCardAnswerOf({ turns, child: "He plays.", lemmaOf: lemma }),
    ).toBe(true);
    expect(
      lateCardAnswerOf({ turns, child: "I like cats.", lemmaOf: lemma }),
    ).toBe(false);
    expect(
      lateCardAnswerOf({
        turns: opening3().slice(0, 4),
        child: "I play.",
        lemmaOf: lemma,
      }),
    ).toBe(false);
  });

  it("앞 차례가 카드 기회인 턴에 갈래를 follow_up 으로 적고 카드 항목만 필수 질문이어도 되돌림이 걸린다(카드 항목은 남김)", () => {
    const out = normalizeTalkLesson(
      answer({
        tori_en: "Yum! What sport is fun?",
        next_move: "follow_up",
        card_item: { kind: "required", no: 2 },
        next_targets: ["soccer"],
        choices: [],
      }),
      lessonInput(3, { turn: { afterCardChance: true } }),
      lessonRules(3),
    );
    expect(out?.next_move).toBe("follow_up");
    // 이어 묻기 이름표에 카드 항목만 필수 질문이면 카드 항목을 비운다 — 그 필수 항목은 다룬 것으로 세지 않는다(고침 3 fix 1 A · 검토 P3-1)
    expect(out?.card_item).toEqual({ kind: "none", no: 0 });
  });
});

describe("두 낱말 관련 말 — 앱 안전망(셋 이상) 밖의 자리", () => {
  const scene = sceneWordsOf([
    "Rice and fish for lunch!",
    "The juice is cold.",
  ]);

  it("영어 낱말 둘이고 그중 하나가 장면 낱말이면 장면에 닿는 짧은 말이고, 기능어 · 장면 밖 두 낱말은 아니다", () => {
    expect(scene.has("fish")).toBe(true);
    expect(scene.has("the")).toBe(false);
    expect(touchesScene("Big fish.", scene)).toBe(true);
    expect(touchesScene("Cold juice.", scene)).toBe(true);
    expect(touchesScene("Blue car.", scene)).toBe(false);
    expect(touchesScene("Yes it.", scene)).toBe(false);
    expect(touchesScene("Fish.", scene)).toBe(false);
    expect(touchesScene("I don't know.", scene)).toBe(false);
  });

  it("갈래가 막힘 갈래여도 장면에 닿는 두 낱말이면 막힘이 아니고, 장면 밖 두 낱말은 갈래가 정한다", () => {
    const of = (child: string) =>
      effectiveStuckOf({
        aiStuck: true,
        childKind: "unrelated_words",
        child,
        input: "speech",
        sceneWords: scene,
      });
    expect(of("Big fish.")).toBe(false);
    expect(of("Blue car.")).toBe(true);
  });

  it("정규화는 카드 글 · 단원 단어로 장면 낱말을 만들어 막힘을 다시 본다", () => {
    const words = talkSceneWordsOf(lessonInput(3));
    expect(words.has("soccer")).toBe(true);
    expect(words.has("weekend")).toBe(true);
    const out = normalizeTalkLesson(
      answer({ child_kind: "unrelated_words", stuck: true }),
      lessonInput(3, {
        turn: {
          child: "Big soccer.",
          input: "speech",
          ifStuck: {
            kind: "card_slot",
            aiAsks: false,
            cardLine: null,
            supportStage: 1,
            stuckQuestion: "What sport is fun?",
            stuckAnswer: "Soccer is fun.",
          },
        },
      }),
      lessonRules(3),
    );
    expect(out?.stuck).toBe(false);
  });
});

describe("고정부 · 다시 쓰기 메시지 문장(고침 3)", () => {
  const system = talkLessonSystem(lessonInput(3), lessonRules(3));

  it("N-1 · N-2 · N-3 · N-5 · N-8 문장", () => {
    expect(system).toContain(
      "After you say back a short answer, ask something new about it (another thing, who, where, or whether they like it). Never put the child's last words in the choices (not 'Cold.' -> 'Is it cold or hot?'), and never ask again in the same words a question the child already answered, even with one word.",
    );
    expect(system).toContain(
      "If the child answers an earlier card question late, follow up on that answer first too; do not jump to the next card question.",
    );
    expect(system).toContain(
      "ask about the thing or the person instead (e.g. 'Do you like fish?').",
    );
    expect(system).toContain("Start with 'I couldn't hear you.'.");
    expect(
      questionRetryNoteOf(
        { question: "Do you eat rice?", reason: "target_word", words: ["eat"] },
        { sentenceMaxWords: 7, targets: ["eat"], childWords: [] },
      ),
    ).toContain("e.g. 'Do you like fish?'");
  });
});

describe("고침 3 fix 1(검토 rev-prompt-2 P3-1 · P3-2 · P3-3 · P3-4 · P3-5 · 설계 N-10)", () => {
  it("A 앞 차례가 카드 기회인 턴의 이어 묻기 이름표 + 필수 카드 항목은 카드 항목을 비우고, 필수 갈래는 이름표만 되돌리며 카드 항목을 남긴다", () => {
    const after = lessonInput(3, { turn: { afterCardChance: true } });
    const labeled = normalizeTalkLesson(
      answer({
        tori_en: "Yum! What sport is fun?",
        next_move: "follow_child",
        card_item: { kind: "required", no: 2 },
        next_targets: ["soccer"],
        choices: [],
      }),
      after,
      lessonRules(3),
    );
    expect(labeled?.next_move).toBe("follow_child");
    expect(labeled?.card_item).toEqual({ kind: "none", no: 0 });
    const required = normalizeTalkLesson(
      answer({
        tori_en: "Yum! What sport is fun?",
        next_move: "required",
        card_item: { kind: "required", no: 2 },
        next_targets: ["soccer"],
        choices: [],
      }),
      after,
      lessonRules(3),
    );
    expect(required?.next_move).toBe("follow_up");
    expect(required?.card_item).toEqual({ kind: "required", no: 2 });
    // 앞 차례가 카드 기회가 아니면 그대로
    const plain = normalizeTalkLesson(
      answer({
        tori_en: "Yum! What sport is fun?",
        next_move: "follow_up",
        card_item: { kind: "required", no: 2 },
        next_targets: ["soccer"],
        choices: [],
      }),
      lessonInput(3),
      lessonRules(3),
    );
    expect(plain?.card_item).toEqual({ kind: "required", no: 2 });
  });

  it("A · B 고정부 문장: 카드 답 뒤 card_item 도 필수 질문이 될 수 없고, 낱말 답의 되풀이는 방금 질문의 동사를 쓴다(like 아님, 02-2 196 · 198)", () => {
    const system = talkLessonSystem(lessonInput(3), lessonRules(3));
    expect(system).toContain(
      "In this turn next_move can never be required, and card_item can never be a required question either.",
    );
    expect(system).toContain(
      "using the verb of the question you just asked, not 'like' (e.g. 'What do you do with the juice?' + 'Juice.' -> 'You drink juice!'; 'Where do you go?' + 'Lake.' -> 'You go to the lake!').",
    );
  });

  it("C 늦은 카드 답은 그 필수 질문 뒤 처음 노린 단어를 담은 말이고 폭 안일 때만이다(이미 답했거나 폭을 넘으면 아님)", () => {
    const card = {
      speaker: "teacher" as const,
      text: "What do you do on the weekend?",
      move: {
        item: { kind: "required" as const, no: 1 },
        words: ["play"],
      },
    };
    const kid = (text: string) => ({ speaker: "child" as const, text });
    const ai = { speaker: "teacher" as const, text: "Nice!", move: null };
    const of = (
      rows: Parameters<typeof lateCardAnswerOf>[0]["rows"],
      child: string,
    ) => lateCardAnswerOf({ rows, child, lemmaOf: lemma });
    expect(of([card, kid("I like dogs."), ai], "I play soccer.")).toBe(true);
    // 이미 답한 뒤 같은 낱말을 다시 쓰면 아니다
    expect(of([card, kid("I play."), ai], "He plays soccer.")).toBe(false);
    // 폭(LATE_CARD_ANSWER_MAX_GAP)을 넘으면 아니다
    expect(
      of(
        [card, kid("Dogs."), ai, kid("Cats."), ai, kid("Fish."), ai],
        "I play.",
      ),
    ).toBe(false);
    expect(of([ai, kid("Hi.")], "I play.")).toBe(false);
  });

  it("C 서버의 호출 입력 손질(lessonCallTurnOf): 늦은 카드 답이면 '앞 차례가 카드 기회'로, 말 입력이 아니면 그대로, 인사 끝은 다음 토막", () => {
    const rows = [
      {
        speaker: "teacher" as const,
        text: "What do you do on the weekend?",
        move: { item: { kind: "required" as const, no: 1 }, words: ["play"] },
      },
      { speaker: "child" as const, text: "I like dogs." },
      { speaker: "teacher" as const, text: "Nice!", move: null },
    ];
    const base: {
      segment: string;
      afterCardChance: boolean;
      nextPart?: "prep" | "talk";
    } = { segment: "talk", afterCardChance: false };
    const ctx = { rows, child: "I play.", lemmaOf: lemma, prepPlanned: true };
    expect(
      lessonCallTurnOf(base, { ...ctx, speech: true }).afterCardChance,
    ).toBe(true);
    expect(
      lessonCallTurnOf(base, { ...ctx, speech: false }).afterCardChance,
    ).toBe(false);
    expect(
      lessonCallTurnOf(
        { ...base, segment: "greeting_end" },
        { ...ctx, speech: true },
      ).nextPart,
    ).toBe("prep");
    expect(
      lessonCallTurnOf(
        { ...base, segment: "greeting_end" },
        { ...ctx, speech: true, prepPlanned: false },
      ).nextPart,
    ).toBe("talk");
    expect(
      lessonCallTurnOf(base, { ...ctx, speech: true }).nextPart,
    ).toBeUndefined();
  });

  it("D 장면 낱말 표는 카드 진행 설명 글(flow) · 진행 말을 담지 않는다", () => {
    const words = talkSceneWordsOf(lessonInput(3));
    for (const w of ["teacher", "asks", "brings", "now", "one"])
      expect(words.has(w), w).toBe(false);
    expect(words.has("sport")).toBe(true);
  });

  it("E 질문에 아이 말 · 바뀌는 자리에 없는 새 내용 낱말(다른 사람 · 다른 물건)이 있으면 되묻기로 보지 않는다", () => {
    expect(
      choicesEchoChild(
        ["He is big.", "He is small."],
        "My mom is big.",
        lemma,
        "Is your dad big or small?",
      ),
    ).toBe(false);
    expect(
      choicesEchoChild(
        ["The water is hot.", "The water is cold."],
        "It is hot.",
        lemma,
        "Is the water hot or cold?",
      ),
    ).toBe(false);
    expect(
      choicesEchoChild(
        ["It is cold.", "It is hot."],
        "Cold.",
        lemma,
        "Is it cold or hot?",
      ),
    ).toBe(true);
    expect(
      choicesEchoChild(
        ["It is big.", "It is small."],
        "Yes big fish.",
        lemma,
        "Is the fish big or small?",
      ),
    ).toBe(true);
  });
});
