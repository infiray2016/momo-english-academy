// iPad 버리는 듣기 e2e(tests/e2e/talk-discard.spec.ts) 여섯 번 시험의 가짜 반응 셋이 서버 질문 검사(13절 C203 (3) — 걸린 질문은 한 번 다시
// 쓰게 함)를 지나는지 본다(묶음 5 fix 4 · 장부 T-316). e2e DB 는 시험용 시드 나무(devSeedTree — 가상 낱말 어휘)를 적재하므로 seed/vocab.json 이
// 아니라 그 나무의 3단계 이하 어휘가 질문 검사 범위다. 반응 · 아이 말은 e2e 파일에서 읽어 한 곳에만 둔다. 실제 API 를 부르지 않는다.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { TalkLessonOutput } from "@/core/ai/calls/talk-lesson";
import { seedCuePhrasesOf } from "@/core/conversation/cue-line";
import {
  childLinesOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import {
  questionKeyOf,
  questionsOfText,
  sameQuestionKeyHit,
} from "@/core/conversation/question-check";
import { splitSentences } from "@/core/seed/text";
import type { TalkLessonOutcome } from "@/server/ai/talk";
import {
  lessonRangeOf,
  lineOptionsOf,
} from "@/server/conversation/lesson-input";
import {
  asksQuestion,
  createLessonSentenceFlow,
  type LessonOutcomeView,
  lessonOutcomeViewOf,
  seedLessonTalkLists,
  withQuestionRetry,
} from "@/server/conversation/lesson-turn";
import type { DbOrTx } from "@/server/db";
import { rosterOf } from "@/server/teacher";
import { smallReferenceSet, talkCard } from "../fixtures/seed/builders";
import { devSeedTree } from "../fixtures/seed/dev-tree";
import { LOW, SPEC3, said, teacher } from "../fixtures/talk-lesson";

const LEVEL = 3;
const UNIT = 1;
const SPEC_FILE = "tests/e2e/talk-discard.spec.ts";
/** e2e 가 고르는 선생님(talkHousehold 의 기본 teacherKey). */
const TEACHER_KEY = "mina";
/** e2e 의 인사 답(saidRun) · 인사 끝 반응(GREETING_REPLY). */
const GREETING_SAID = "I'm good.";

/** e2e 파일의 문자열 배열 하나(`const <name> = [ … ]`). */
function stringsOf(source: string, name: string): string[] {
  const block = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\]`).exec(source);
  if (!block?.[1]) throw new Error(`${SPEC_FILE} 에 ${name} 배열이 없다`);
  return [...block[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) =>
    JSON.parse(`"${m[1]}"`),
  );
}
const source = readFileSync(SPEC_FILE, "utf8");
const REPLIES = stringsOf(source, "REPLIES");
/** 여섯 번 시험의 아이 말(그 파일에서 `const said = [` 는 그 시험 하나뿐이다). */
const SAID = stringsOf(source, "said");
const GREETING_REPLY =
  /const GREETING_REPLY = "([^"]*)"/.exec(source)?.[1] ?? "";

/** e2e openTalk 의 카드(greetingTalkLesson · withoutSceneOpener 와 같은 꼴 — 짧은 준비 · 오늘 쓸 말 · 장면 여는 질문 없음). */
function e2eCard() {
  const lesson = talkCard(smallReferenceSet(), {
    level: LEVEL,
    unit: UNIT,
    kind: "assigned",
    lessonNo: 1,
    variant: 1,
  });
  const { prep: _prep, sceneOpener: _opener, ...card } = lesson.card;
  return { ...card, todayWords: [] };
}

const tree = devSeedTree();
/** e2e DB 의 vocab 행(load.ts 가 bandLevel 에 level 을 넣는다 — 서버는 그 단계 이하를 읽는다). */
const VOCAB_ROWS = tree.reference.vocab.vocab.map((v) => ({
  word: v.word,
  forms: [...v.forms],
}));
/** 서버 lessonRangeOf 가 부르는 select · from · where 만 흉내 낸 DB(그 단계 이하 vocab 행). */
const fakeDb = {
  select: () => ({
    from: () => ({
      where: async () =>
        tree.reference.vocab.vocab
          .filter((v) => v.level <= LEVEL)
          .map((v) => ({ word: v.word, forms: [...v.forms] })),
    }),
  }),
} as unknown as DbOrTx;

const unitWords = (() => {
  const spec = tree.reference.unitSpecs.unitSpecs.find(
    (u) => u.area === "talk" && u.level === LEVEL && u.unit === UNIT,
  );
  if (!spec) throw new Error("회화 3단계 단원 1 규격이 없다");
  return [...spec.words];
})();
const sentenceMaxWords = (() => {
  const spec = tree.reference.levelSpecs.levelSpecs.find(
    (s) => s.area === "talk" && s.level === LEVEL,
  );
  if (!spec) throw new Error("회화 3단계 단계 규격이 없다");
  return spec.sentenceMaxWords;
})();
const teacherNameEn = (() => {
  const found = rosterOf().find((t) => t.key === TEACHER_KEY);
  if (!found) throw new Error(`선생님 명단에 ${TEACHER_KEY} 가 없다`);
  return found.nameEn;
})();

function reply(toriEn: string): TalkLessonOutput {
  return {
    child_kind: "answer",
    stuck: false,
    tori_en: toriEn,
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
    // 노리는 단어는 단원 단어 모두(가장 엄한 꼴 — 실제 응답의 next_targets 는 그 일부다)
    next_targets: unitWords,
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
  };
}

type Row = { speaker: "child" | "teacher"; text: string };
type RangeState = Parameters<typeof lessonRangeOf>[1];

/**
 * 서버 질문 다시 쓰기 판정(lessonTurnAfterChild 의 범위 · 문장 문 · withQuestionRetry 배선을 DB · AI 없이 옮김): 범위는 서버 lessonRangeOf ·
 * lineOptionsOf, 아이 말 줄은 childLinesOf, 문장은 createLessonSentenceFlow 에 넣고, 다시 쓰기는 부르면 세는 가짜다.
 */
async function retryOf({
  rows,
  turns,
  child,
  toriEn,
}: {
  rows: readonly Row[];
  turns: readonly TalkLessonTurn[];
  child: string;
  toriEn: string;
}) {
  const card = e2eCard();
  const { ifAnswered, ifStuck } = teacherTurnPlansOf(
    {
      spec: SPEC3,
      card,
      newWords: [],
      turns,
      segment: "talk",
      settings: LOW,
      prepWords: [],
    },
    { segment: "talk", targets: [] },
  );
  const range = await lessonRangeOf(
    fakeDb,
    {
      level: LEVEL,
      unit: UNIT,
      lemmaOf: () => undefined,
      // childWordsOf 가 읽는 speaker · text 만 둔 행
      liveRows: rows as unknown as RangeState["liveRows"],
      turns: [...turns],
      prepWords: [],
      start: null,
    },
    child,
  );
  const lineOptions = {
    ...lineOptionsOf({
      sentenceMaxWords,
      unitWords,
      teacher: { nameEn: teacherNameEn, personaEn: "" },
      lineRange: range.lineRange,
      lemmaOf: range.lemmaOf,
    }),
    childLines: childLinesOf(
      rows.map((r) =>
        r.speaker === "child"
          ? { speaker: "child" as const, text: r.text }
          : { speaker: "teacher" as const, text: r.text },
      ),
      child,
    ),
  };
  const lists = seedLessonTalkLists();
  const flow = createLessonSentenceFlow({
    low: true,
    ifAnswered,
    ifStuck,
    asked: new Map(),
    max: LOW.sameQuestionMax,
    live: {
      cuePhrases: seedCuePhrasesOf(lists.cue),
      madeUp: lists.madeUp,
      situation: null,
    },
  });
  flow.stuck(false);
  for (const s of splitSentences(toriEn)) flow.accept(s);
  const outcome = {
    ok: true,
    value: reply(toriEn),
    hintsBlocked: false,
    overLength: 0,
    blocked: [],
  } as unknown as TalkLessonOutcome;
  const view = lessonOutcomeViewOf(outcome, {
    low: true,
    koMeaning: SPEC3.koMeaning,
    safeLines: card.safeLines,
    safeLine: card.safeLines[0]?.en ?? "",
    turnNo: 0,
  }) as LessonOutcomeView;
  const asks: string[] = [];
  const out = await withQuestionRetry({
    flow,
    view,
    lineOptions,
    sentenceMaxWords,
    retry: async ({ note }) => {
      asks.push(note);
      return null;
    },
  });
  return {
    asks: asksQuestion(flow.chosen()),
    retried: out.retried,
    notes: asks,
  };
}

/** 인사 → 인사 끝 반응 → 대화 첫 질문(카드 필수 1)까지의 행(e2e throughGreeting). */
function opening(): { rows: Row[]; turns: TalkLessonTurn[] } {
  const card = e2eCard();
  const greeting =
    "questions" in card.greeting
      ? (card.greeting.questions[0]?.question.en ?? "")
      : "";
  const first = card.required[0];
  if (!first) throw new Error("카드 필수 질문이 없다");
  return {
    rows: [
      { speaker: "teacher", text: greeting },
      { speaker: "child", text: GREETING_SAID },
      { speaker: "teacher", text: GREETING_REPLY },
      { speaker: "teacher", text: first.en },
    ],
    turns: [
      teacher(greeting, { kind: "first_question" }),
      said({ segment: "greeting_end" }),
      teacher(GREETING_REPLY, { kind: "ai" }),
      teacher(first.en, {
        kind: "first_question",
        item: { kind: "required", no: first.no },
        words: [...first.targets],
      }),
    ],
  };
}

describe("iPad 버리는 듣기 e2e 여섯 번 시험의 가짜 반응(묶음 5 fix 4 · 13절 C203 (3))", () => {
  it("e2e 파일에서 반응 셋 · 아이 말 여섯 · 인사 끝 반응을 읽는다", () => {
    expect(REPLIES).toHaveLength(3);
    expect(SAID).toHaveLength(6);
    expect(GREETING_REPLY).not.toBe("");
  });

  it("AC-24g 여섯 번 시험의 반응 셋이 그 카드 · 그 아이 말에서 질문 검사를 지난다(다시 쓰기 0)", async () => {
    const { rows, turns } = opening();
    for (const [i, child] of SAID.entries()) {
      const toriEn = REPLIES[i % REPLIES.length] ?? "";
      const nextTurns = [...turns, said({ segment: "talk" })];
      const out = await retryOf({ rows, turns: nextTurns, child, toriEn });
      // 질문을 쓰는 AI 차례에서 본다(카드 자리 차례면 질문이 지워져 다시 쓰기가 없다 — 더 엄한 쪽)
      expect(out.asks, `${i + 1}번째 계획이 AI 질문 차례`).toBe(true);
      expect(out.notes, `${i + 1}번째(${child} → ${toriEn})`).toEqual([]);
      expect(out.retried).toBe(false);
      rows.push(
        { speaker: "child", text: child },
        { speaker: "teacher", text: toriEn },
      );
      turns.push(said({ segment: "talk" }), teacher(toriEn, { kind: "ai" }));
    }
  });

  it("AC-24g 여섯 번 시험의 질문(카드 첫 질문 + 반응 셋)이 같은 질문 상한(talk.same_question_max)에 닿지 않는다", () => {
    const first = e2eCard().required[0]?.en ?? "";
    const asked = new Map<string, number>([[questionKeyOf(first), 1]]);
    for (const [i] of SAID.entries()) {
      const question = questionsOfText(REPLIES[i % REPLIES.length] ?? "").at(
        -1,
      );
      expect(question, `${i + 1}번째 반응의 질문`).toBeDefined();
      const key = questionKeyOf(question ?? "");
      expect(
        sameQuestionKeyHit({
          key,
          blocked: [],
          asked,
          max: LOW.sameQuestionMax,
        }),
        `${i + 1}번째: ${question}`,
      ).toBeNull();
      asked.set(key, (asked.get(key) ?? 0) + 1);
    }
  });

  it("옛 첫 반응 'Wow! What can you see?' 는 see 가 시험용 시드 나무의 3단계 이하 어휘 밖이라 걸려 다시 쓰기를 한 번 부른다(CI 42374458850)", async () => {
    const { rows, turns } = opening();
    const out = await retryOf({
      rows,
      turns: [...turns, said({ segment: "talk" })],
      child: SAID[0] ?? "",
      toriEn: "Wow! What can you see?",
    });
    expect(out.retried).toBe(true);
    expect(out.notes).toHaveLength(1);
    expect(out.notes[0]).toContain(
      "words above the child's level (words: see)",
    );
    expect(VOCAB_ROWS.some((v) => v.word === "see")).toBe(false);
  });
});
