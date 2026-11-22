// 노리는 단어가 들어 걸린 질문의 다시 쓰기(13절 C203 보완 1 · 02-2 3.3 · AC-15zj (바), 장부 T-625). 기존 방식 1~3단계에서 다시 쓴 응답이 질문만
// 바꾸고 노리는 단어 · 힌트 · 답 예시를 앞 질문의 것으로 내던 흠(대본 열다섯 번 가운데 열다섯 번)을 알림 글 고침과 앱의 노림 안전망으로 막는다.
// 실제 API 를 부르지 않는다. 설계 숫자는 시험용 설정에서 읽는다.
import { describe, expect, it } from "vitest";
import type { TalkLessonOutput } from "@/core/ai/calls/talk-lesson";
import { talkCardChainKeysOf } from "@/core/ai/calls/talk-lesson";
import { type TalkCarry, talkChancesOf } from "@/core/conversation/chances";
import {
  type LessonArgs,
  nextTeacherTurnOf,
  talkLessonPositionOf,
} from "@/core/conversation/lesson-flow";
import type {
  TalkLessonTeacherTurn,
  TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import {
  type HeldQuestionFail,
  heldQuestionFailOf,
  questionRetryNoteOf,
  type RetrySentence,
  retryAimGuardOf,
} from "@/core/conversation/question-retry";
import {
  createLessonSentenceFlow,
  type LessonOutcomeView,
  type LessonTurnResult,
  lessonHintsAt,
  type QuestionRetryAnswer,
  settleLessonTurn,
  withQuestionRetry,
} from "@/server/conversation/lesson-turn";
import { CARD3 as VIEW_CARD3 } from "../fixtures/ai/talk-lesson-inputs";
import {
  button,
  CARD3,
  LOW,
  NEW3,
  opening3,
  SPEC3,
  said,
} from "../fixtures/talk-lesson";

/** 빈 응답 위에 고칠 칸만 얹는다(AI 차례 — 이어 묻기). */
function answer(over: Partial<TalkLessonOutput> = {}): TalkLessonOutput {
  return {
    child_kind: "answer",
    stuck: false,
    tori_en: "Nice! Who is with you?",
    model_line: "",
    choices: [],
    tori_ko: [],
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
    next_goal: [],
    support: "none",
    next_targets: [],
    next_hint_ko: "",
    next_hints: [],
    next_usable_phrases: [],
    next_answer_example: "",
    image_word: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}

// ── 알림 글 ───────────────────────────────────────────────────────

const failOf = (
  reason: HeldQuestionFail["reason"],
  words: string[] = [],
): HeldQuestionFail => ({
  question: "Do you eat it with your family?",
  reason,
  words,
});
const ctx = { sentenceMaxWords: 8, targets: ["eat"], childWords: ["gimbap"] };
const FIELDS_AGAIN =
  "Write the other fields again for the new question (next_targets, card_item, next_hint_ko, next_hints and next_answer_example): the hints and the answer example answer the new question, not the question that was not shown.";
const OLD_AIM = "ask about the thing or the person instead";
const NORMAL_AIM = `This turn, do not aim at "eat": ask one new question that follows up on the child's last words, about something else (who, where or what). Leave "eat" out of next_targets, and set card_item to kind none and no 0 unless the new question uses another card item. Bring up "eat" in a later turn.`;
const EASY_AIM = `This turn, do not aim at "eat": ask about the same thing as the question the child could not answer, more easily and without "eat" (a yes-or-no question, or two answer choices). Leave "eat" out of next_targets. Bring up "eat" in a later turn.`;

describe("AC-15zj (바): 노리는 단어가 들어 걸린 질문의 다시 쓰기 알림(13절 C203 보완 1 (1))", () => {
  it("target_word 판: 이번 차례는 걸린 낱말을 노리지 않고, 아이 말에 이어 다른 것을 묻고, 노림 칸 · 카드 항목에서 빼고 뒤 차례에 꺼낸다", () => {
    const note = questionRetryNoteOf(failOf("target_word", ["eat"]), ctx);
    expect(note).toContain(NORMAL_AIM);
    // 노림은 그대로 두고 사람 · 물건을 물으라는 줄(모순의 뿌리)은 이 알림에 없다
    expect(note).not.toContain(OLD_AIM);
    expect(note).not.toContain("(aims at: eat)");
    expect(note).toContain(FIELDS_AGAIN);
    expect(note).not.toContain("Keep the other fields");
  });

  it("세 판(그 밖 · 쉬운 질문 자리 · chain) 모두 나머지 칸을 새 질문에 맞게 다시 쓰고, 쉬운 질문 · chain 판의 카드 항목 none 은 그대로다", () => {
    const plain = questionRetryNoteOf(failOf("too_long"), ctx);
    const easy = questionRetryNoteOf(failOf("offband", ["whale"]), {
      ...ctx,
      easySlot: true,
    });
    const chain = questionRetryNoteOf(failOf("chain"), ctx);
    for (const note of [plain, easy, chain]) {
      expect(note).toContain(FIELDS_AGAIN);
      expect(note).not.toContain("Keep the other fields");
      expect(note).not.toContain("keep the other fields");
    }
    expect(easy).toContain(
      "Set next_move follow_up and card_item kind none and no 0.",
    );
    expect(chain).toContain(
      "(next_move follow_up, card_item kind none and no 0)",
    );
  });

  it("걸린 질문에 노리는 단어가 없는(aimed 칸 없음) 다른 까닭(too_long · offband · form · echo · not_easy · chain)은 '노리는 단어를 질문에 넣지 않는다' 줄을 그대로 둔다", () => {
    for (const reason of [
      "too_long",
      "offband",
      "form",
      "echo",
      "not_easy",
      "chain",
    ] as const) {
      const note = questionRetryNoteOf(failOf(reason), ctx);
      expect(note, reason).toContain(
        "Do not put the word the question aims at in the question (aims at: eat); ask about the thing or the person instead (e.g. 'Do you like fish?').",
      );
      expect(note, reason).not.toContain("This turn, do not aim at");
    }
  });

  it("AC-15zj (바) 덧붙임 (다): 쉬운 질문 자리의 노림 줄은 막힌 질문과 같은 것을 그 낱말 없이 예 · 아니요나 선택지 둘로 쉽게 묻게 하고, 아이 말에 이어 새 질문을 쓰라는 뜻 · 'who, where or what' · 다른 카드 항목 갈래를 넣지 않는다", () => {
    const note = questionRetryNoteOf(failOf("target_word", ["eat"]), {
      ...ctx,
      easySlot: true,
    });
    expect(note).toContain(EASY_AIM);
    expect(note).not.toContain("follows up on the child's last words");
    // 같은 알림의 '같은 것을 쉽게' 줄과 뜻이 맞는다(어긋나던 줄 — 코드 검토 M-2 · 설계 M-2)
    expect(note).toContain("easy yes-or-no question about the same thing");
    expect(note).not.toContain("who, where or what");
    expect(note).not.toContain(
      "unless the new question uses another card item",
    );
    expect(note).not.toContain(OLD_AIM);
  });

  it("AC-15zj (바): 보통 자리의 노림 줄은 한 줄이고 예문이 없다(13절 C203 보완 1 덧붙임 2 — '낱말만 바꿔 묻지 않는다' 문장은 실호출에서 듣지 않아 넣지 않음)", () => {
    const note = questionRetryNoteOf(failOf("target_word", ["eat"]), ctx);
    const aimLine = note.split("\n").find((l) => l.startsWith("This turn"));
    expect(aimLine).toBe(NORMAL_AIM);
    // 노림 줄에는 금지 · 본보기 예문이 없다(모델이 그 꼴을 따라 쓰지 않게)
    expect(aimLine).not.toMatch(/e\.g\.|'[^']*\?'/);
    expect(note).not.toContain("changed to another word");
    // 다른 줄의 'what, who or where' 권고는 그대로다
    expect(note).toContain("Prefer a what, who or where question");
  });

  it("AC-15zj (바) 덧붙임 (나): 길이가 먼저 걸린 긴 질문에 노리는 단어가 들었으면 aimed 에 들고, 알림은 첫 까닭 줄 · 길이 줄을 그대로 두면서 새 노림 줄을 쓴다", () => {
    const entries = held("Is soccer fun for you and your friend here?");
    const fail = heldQuestionFailOf({
      entries,
      targets: ["soccer"],
      options: OPTIONS,
    });
    expect(fail).toEqual({
      question: "Is soccer fun for you and your friend here?",
      reason: "too_long",
      words: [],
      aimed: ["soccer"],
    });
    if (fail === null) throw new Error("걸림 없음");
    const note = questionRetryNoteOf(fail, {
      sentenceMaxWords: 8,
      targets: ["soccer"],
      childWords: OPTIONS.childWords,
    });
    expect(note).toContain("because it was too long.");
    expect(note).toContain("To make it shorter");
    expect(note).toContain('This turn, do not aim at "soccer"');
    expect(note).not.toContain(OLD_AIM);
    // 아이가 이미 말한 낱말은 질문 검사처럼 노림에서 빠진다 → 노리는 단어 없음 → 옛 줄
    const said = heldQuestionFailOf({
      entries,
      targets: ["soccer"],
      options: { ...OPTIONS, childWords: ["soccer"] },
    });
    expect(said?.reason).toBe("too_long");
    expect(said?.aimed).toBeUndefined();
    // 노리는 단어가 없는 긴 질문도 옛 줄 그대로
    const plain = heldQuestionFailOf({
      entries: held("Is it fun for you and your friend here?"),
      targets: ["soccer"],
      options: OPTIONS,
    });
    expect(plain?.aimed).toBeUndefined();
    if (plain === null || said === null) throw new Error("걸림 없음");
    for (const f of [plain, said])
      expect(
        questionRetryNoteOf(f, {
          sentenceMaxWords: 8,
          targets: ["soccer"],
          childWords: OPTIONS.childWords,
        }),
      ).toContain(OLD_AIM);
  });
});

// ── 노림 안전망(순수) ─────────────────────────────────────────────

const LEMMA: Record<string, string> = { eats: "eat", ate: "eat" };
const lemmaOf = (w: string) => LEMMA[w.toLowerCase()];
const AIM_CARD = {
  required: [
    { no: 1, targets: ["eat"] },
    { no: 2, targets: ["park"] },
  ],
  more: [{ no: 1, targets: ["eat"] }],
};
const held = (en: string): RetrySentence[] => [
  { en: "Yum!", question: false, cue: false, state: "sent" },
  { en, question: true, cue: false, state: "held" },
];
/** 원자료(대본) 꼴: 질문만 바뀌고 노림 · 힌트 · 답 예시는 앞 질문의 것. */
const stale = (over: Partial<TalkLessonOutput> = {}) =>
  answer({
    tori_en: "Yum! Who is with you at the table?",
    next_targets: ["eat"],
    next_hint_ko: "우리는 김밥을 먹어.",
    next_hints: ["We ___ gimbap.", "We eat gimbap."],
    next_answer_example: "We eat gimbap.",
    ...over,
  });
const guard = (
  value: TalkLessonOutput,
  question = "Who is with you at the table?",
  fail = failOf("target_word", ["eat"]),
) =>
  retryAimGuardOf({
    fail,
    entries: held(question),
    value,
    card: AIM_CARD,
    options: { lemmaOf },
  });

describe("AC-15zj (바): 다시 쓴 응답의 노림 안전망 retryAimGuardOf(13절 C203 보완 1 (2))", () => {
  it("① 묵은 칸(노림 eat · 카드 항목 none · 답 예시 'We eat gimbap.'): 노림에서 빼고 답 예시 · 힌트 · 뜻 힌트를 함께 비운다", () => {
    const out = guard(stale());
    expect(out).not.toBeNull();
    expect(out?.next_targets).toEqual([]);
    expect(out?.card_item).toEqual({ kind: "none", no: 0 });
    expect(out?.next_answer_example).toBe("");
    expect(out?.next_hints).toEqual([]);
    expect(out?.next_hint_ko).toBe("");
    // 다른 칸은 다시 쓴 응답 그대로
    expect(out?.tori_en).toBe("Yum! Who is with you at the table?");
  });

  it("② 같은 질문에 카드 항목 required 1(노림 eat): 카드 항목을 none · 0 으로 둔다", () => {
    const out = guard(stale({ card_item: { kind: "required", no: 1 } }));
    expect(out?.card_item).toEqual({ kind: "none", no: 0 });
    const more = guard(stale({ card_item: { kind: "more", no: 1 } }));
    expect(more?.card_item).toEqual({ kind: "none", no: 0 });
    // 걸린 낱말을 노리지 않는 다른 카드 항목은 그대로 둔다
    const other = guard(
      stale({ card_item: { kind: "required", no: 2 }, next_targets: ["park"] }),
    );
    expect(other?.card_item).toEqual({ kind: "required", no: 2 });
    expect(other?.next_targets).toEqual(["park"]);
  });

  it("③ 알림을 따른 응답(노림 [] · 답 예시 · 힌트에 eat 없음)은 그대로 받는다", () => {
    const followed = answer({
      tori_en: "Yum! Who is with you at the table?",
      next_hint_ko: "엄마랑 같이 있어.",
      next_hints: ["My ___ is with me.", "My mom is with me."],
      next_answer_example: "My mom is with me.",
    });
    expect(guard(followed)).toEqual(followed);
  });

  it("④ 다시 쓴 질문에 걸린 낱말이 원형으로 남음('Who eats with you?') → null(앞 응답으로 카드 자리 — 빼기 전에 본다, 분석 U-4)", () => {
    expect(guard(stale(), "Who eats with you?")).toBeNull();
    expect(guard(stale({ next_targets: [] }), "Who eats with you?")).toBeNull();
  });

  it("⑤ 걸린 질문에 노리는 단어가 없는(aimed 칸 없음) 다른 까닭(too_long · chain)의 다시 쓴 응답은 그대로 받는다(같은 값)", () => {
    const chainValue = answer({
      tori_en: "Yum! What do you do at the table?",
      card_item: { kind: "required", no: 1 },
      next_targets: ["eat"],
      next_answer_example: "We eat gimbap.",
    });
    for (const reason of ["too_long", "chain"] as const) {
      const out = guard(
        chainValue,
        "What do you do at the table?",
        failOf(reason),
      );
      expect(out, reason).toBe(chainValue);
    }
  });

  it("⑥ AC-15zj (바) 덧붙임 (나): 으뜸 까닭이 too_long 이라도 걸린 질문에 노리는 단어가 들었으면(aimed) 안전망이 돈다", () => {
    const long: HeldQuestionFail = {
      ...failOf("too_long"),
      aimed: ["eat"],
    };
    const out = guard(stale(), "Who is with you at the table?", long);
    expect(out?.next_targets).toEqual([]);
    expect(out?.next_answer_example).toBe("");
    expect(guard(stale(), "Who eats with you?", long)).toBeNull();
  });
});

// ── 서버 배선과 흐름 결과 ─────────────────────────────────────────

const OPTIONS = {
  sentenceMaxWords: 8,
  allowedWords: new Set(
    "do you like it oh nice i what is fun okay sport who with your friend for here".split(
      " ",
    ),
  ),
  unitWords: NEW3,
  childWords: ["play"],
  teacherName: "Mina",
  lemmaOf: () => undefined,
  forms: [],
  allowedForms: new Set<string>(),
};

const argsOf = (turns: TalkLessonTurn[]): LessonArgs => ({
  spec: SPEC3,
  card: CARD3,
  newWords: NEW3,
  turns,
  segment: "talk",
  settings: LOW,
  prepWords: CARD3.prep ?? [],
});

const okView = (value: TalkLessonOutput): LessonOutcomeView => ({
  kind: "ok",
  value,
  hintsBlocked: false,
  overLength: 0,
});

/** 필수 1 에 답한 뒤의 AI 차례(이어 묻기). */
const BEFORE: TalkLessonTurn[] = [...opening3(), said()];

function flowOf(sentences: string[]) {
  const a = argsOf(BEFORE);
  const flow = createLessonSentenceFlow({
    low: true,
    ifAnswered: nextTeacherTurnOf(a),
    ifStuck: null,
    asked: talkLessonPositionOf(a).askedQuestions,
    max: LOW.sameQuestionMax,
  });
  flow.stuck(false);
  for (const en of sentences) flow.accept(en);
  return flow;
}

function settle(
  out: Awaited<ReturnType<typeof withQuestionRetry>>,
): LessonTurnResult {
  const a = argsOf(BEFORE);
  return settleLessonTurn({
    flow: out.flow,
    outcome: out.view,
    ctx: {
      card: CARD3,
      turns: BEFORE,
      asked: talkLessonPositionOf(a).askedQuestions,
      max: LOW.sameQuestionMax,
      low: true,
      koMeaning: true,
      dropped: [],
      spec: SPEC3,
      lineOptions: OPTIONS,
    },
  });
}

/** 저장된 행 → 흐름 꼴(서버 state.ts 의 선생님 행 읽기와 같음 — 빈 답 예시는 null). */
function rowOf(result: LessonTurnResult): TalkLessonTeacherTurn {
  const ex = result.aiQuestion?.answerExample;
  return {
    speaker: "teacher",
    text: result.text,
    move: result.move,
    answerExample: ex === undefined || ex === "" ? null : ex,
  };
}

/** 첫 응답: 필수 2 의 노리는 단어 soccer 를 질문에 넣어 걸린다. */
const FIRST = answer({
  tori_en: "Nice! Is soccer fun for you?",
  next_targets: ["soccer"],
  card_item: { kind: "required", no: 2 },
  next_hint_ko: "축구는 재미있어.",
  next_hints: ["Soccer is ___.", "Soccer is fun."],
  next_answer_example: "Soccer is fun.",
});
/** 다시 쓴 응답(원자료 꼴): 질문만 바뀌고 노림 · 카드 항목 · 힌트 · 답 예시는 앞 질문의 것. */
const STALE_RETRY = answer({
  ...FIRST,
  tori_en: "Nice! Who is with you?",
});

async function retried(
  retryValue: TalkLessonOutput,
  card?: Parameters<typeof withQuestionRetry>[0]["card"],
  first: TalkLessonOutput = FIRST,
) {
  const notes: string[] = [];
  const sentences = retryValue.tori_en.split(/(?<=[!?.])\s+/);
  const again: QuestionRetryAnswer = {
    value: retryValue,
    entries: flowOf(sentences).entries(),
    hintsBlocked: false,
    overLength: 0,
    blocked: 0,
  };
  const out = await withQuestionRetry({
    flow: flowOf(first.tori_en.split(/(?<=[!?.])\s+/)),
    view: okView(first),
    lineOptions: OPTIONS,
    sentenceMaxWords: 8,
    ...(card === undefined ? {} : { card }),
    retry: async ({ note }) => {
      notes.push(note);
      return again;
    },
  });
  return { out, notes, result: settle(out) };
}

describe("AC-15zj (바): 서버 withQuestionRetry 배선 · 흐름 결과(13절 C203 보완 1 (2))", () => {
  it("서버: 묵은 칸의 다시 쓴 응답은 안전망을 지나 노림 [] · 카드 항목 none · 답 예시 · 힌트가 빈 행이 된다(알림은 target_word 판)", async () => {
    const { out, notes, result } = await retried(STALE_RETRY, CARD3);
    expect(out.retried).toBe(true);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('This turn, do not aim at "soccer"');
    expect(result.replaced).toBeNull();
    expect(result.kept.at(-1)).toBe("Who is with you?");
    expect(result.move.words).toEqual([]);
    expect(result.move.item).toEqual({ kind: "none", no: 0 });
    expect(result.aiQuestion?.answerExample).toBe("");
    expect(result.aiQuestion?.hints).toBeUndefined();
    expect(result.aiQuestion?.hintKo).toBeUndefined();
  });

  it("AC-15zj (바): 서버: 알림대로 노림 칸에서는 빼고 질문에는 걸린 낱말을 남긴 응답(범위 안 · 노림 [])은 안전망 ①이 앞 응답으로 카드 자리를 만든다(분석 U-4)", async () => {
    // 범위 안 낱말 + 걸린 낱말 + 노림 [] — ①이 없으면 끝 처리가 노리는 단어를 몰라 이 질문이 지나간다(코드 검토 M-1)
    const { out, result } = await retried(
      answer({
        ...FIRST,
        next_targets: [],
        tori_en: "Nice! Is soccer fun with your friend?",
      }),
      CARD3,
    );
    expect(out.retried).toBe(true);
    // 안전망이 null 이면 앞 응답 그대로(합치지 않음)
    expect(out.view.kind === "ok" ? out.view.value : null).toBe(FIRST);
    expect(result.replaced).toBe("question_check");
    expect(result.kept.join(" ")).not.toContain("soccer");
  });

  it("AC-15zj (바) 덧붙임 (나): 서버: 길이가 먼저 걸린 긴 질문에 노리는 단어가 들었으면 새 노림 줄을 알리고, 묵은 노림 칸 · 카드 항목 · 답 예시를 뺀다", async () => {
    const longFirst = answer({
      ...FIRST,
      tori_en: "Nice! Is soccer fun for you and your friend here?",
    });
    const { notes, result } = await retried(STALE_RETRY, CARD3, longFirst);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("because it was too long.");
    expect(notes[0]).toContain('This turn, do not aim at "soccer"');
    expect(notes[0]).not.toContain("(aims at: soccer)");
    expect(result.replaced).toBeNull();
    expect(result.kept.at(-1)).toBe("Who is with you?");
    expect(result.move.words).toEqual([]);
    expect(result.move.item).toEqual({ kind: "none", no: 0 });
    expect(result.aiQuestion?.answerExample).toBe("");
  });

  it("흐름 ⓐ ~ ⓓ: 안전망을 지난 행 뒤에는 카드 기회 뒤가 아니고 · 받침 첫째에 앞 질문의 답 소리가 없고 · 카드 2 힌트가 없고 · 필수 2 가 남은 기회에 남는다", async () => {
    const guarded = rowOf((await retried(STALE_RETRY, CARD3)).result);
    // 견줌: 카드를 주지 않으면 카드 항목은 남는다(묵은 카드 항목이 만드는 연쇄 — 분석 3.3)
    const cardKept = rowOf((await retried(STALE_RETRY)).result);
    expect(cardKept.move?.item).toEqual({ kind: "required", no: 2 });

    // ⓐ 다음 차례가 카드 기회 뒤가 아니고 chain 열쇠가 빈 목록
    const afterSaid = talkLessonPositionOf(
      argsOf([...BEFORE, guarded, said()]),
    );
    expect(afterSaid.afterCardChance).toBe(false);
    expect(talkCardChainKeysOf(afterSaid, VIEW_CARD3)).toEqual([]);
    expect(
      talkLessonPositionOf(argsOf([...BEFORE, cardKept, said()]))
        .afterCardChance,
    ).toBe(true);

    // ⓑ 이어진 '잘 모르겠어요' 차례의 받침 첫째에 앞 질문의 답 소리가 붙지 않는다(답이 없어 AI 받침 계획)
    const plan = nextTeacherTurnOf(argsOf([...BEFORE, guarded, button()]));
    expect(plan.stage).toBe(1);
    expect(plan.answerFallback).toBeNull();
    expect(plan.attach.some((l) => l.kind === "sound")).toBe(false);
    expect(JSON.stringify(plan)).not.toContain("Soccer is fun.");
    const stalePlan = nextTeacherTurnOf(
      argsOf([...BEFORE, cardKept, button()]),
    );
    expect(stalePlan.attach.some((l) => l.kind === "sound")).toBe(true);

    // ⓒ 힌트 단이 카드 2 의 힌트를 내지 않는다
    const hintCard = {
      greeting: CARD3.greeting,
      required: CARD3.required.map((i) => ({
        no: i.no,
        hintKo: `카드 뜻 ${i.no}`,
        hints: [`Card hint ${i.no}.`],
      })),
      more: [],
    };
    const hintsOf = (row: TalkLessonTeacherTurn, rowQ: unknown) => {
      const turns = [...BEFORE, row];
      return lessonHintsAt(
        {
          spec: {
            band: "1-3",
            hintTiers: ["ko", "frame", "sentence"],
            usablePhrases: 0,
          },
          card: hintCard,
          turns,
          liveRows: [{ speaker: "tori", aiQuestion: rowQ }],
        },
        talkLessonPositionOf(argsOf(turns)).slot,
      );
    };
    const guardedQ = (await retried(STALE_RETRY, CARD3)).result.aiQuestion;
    // 그 질문에는 '힌트' 버튼이 없다(결정 (2) — 힌트 단이 빈 목록)
    expect(hintsOf(guarded, guardedQ)).toEqual([]);
    const shown = JSON.stringify(hintsOf(guarded, guardedQ));
    expect(shown).not.toContain("Card hint 2.");
    expect(shown).not.toContain("Soccer is fun.");
    expect(
      JSON.stringify(
        hintsOf(cardKept, (await retried(STALE_RETRY)).result.aiQuestion),
      ),
    ).toContain("Card hint 2.");

    // ⓓ 필수 질문 2 가 남은 기회에 남는다
    const NO_CARRY: TalkCarry = { goals: [], words: [] };
    const chancesOf = (row: TalkLessonTeacherTurn) =>
      talkChancesOf({
        card: CARD3,
        newWords: NEW3,
        turns: [...BEFORE, row, said()],
        carry: NO_CARRY,
        missionsDone: 0,
        settings: LOW,
        prepWords: CARD3.prep ?? [],
      });
    expect(chancesOf(guarded).required.map((r) => r.no)).toContain(2);
    expect(chancesOf(cardKept).required.map((r) => r.no)).not.toContain(2);
  });
});
