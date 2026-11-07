// 회화 1~3단계 신호 말('AI 몫 넓힘' 묶음 2 — spec 판 4 설계 6 · 13절 C207 · AC-15zf (가), plan 정한 것 6). 자리 · 몇 번째 · 긴 꼴 · 짧은 꼴 돌림 ·
// 바로 앞과 같은 줄 안 씀, AI 가 쓴 신호 말 지움, 흘림 줄 차례(뜻 뒤 · 소리 줄 앞), 기록 · text · 다시 쓸 차례 밖, 같은 시도 id 다시 흘림이 같은
// 줄을 냄을 본다. 목록은 시험 안 견본이다(시드 목록 내용은 묶음 3 몫).
import { describe, expect, it } from "vitest";
import type { TalkLessonOutput } from "@/core/ai/calls/talk-lesson";
import {
  CUE_PHRASES,
  cueBandOf,
  cueLineOf,
  cueLinesOfMoves,
  cueOrdinalOf,
  cuePlaceOf,
  isSoundCue,
  seedCuePhrasesOf,
  TALK_CUE_LINE_KIND,
} from "@/core/conversation/cue-line";
import {
  type LessonArgs,
  nextTeacherTurnOf,
  type TeacherTurnPlan,
  talkLessonPositionOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import { liveTeacherEntryOf } from "@/core/conversation/log";
import { type TalkMove, talkMoveOf } from "@/core/conversation/move";
import type { TalkCueLinesFile } from "@/core/seed/schema/reference";
import {
  createLessonSentenceFlow,
  type LessonOutcomeView,
  lessonAfterLinesOf,
  lessonCueOfRows,
  lessonReplayLinesOf,
  settleLessonTurn,
} from "@/server/conversation/lesson-turn";
import { seedTalkCueLines } from "@/server/seed-lists";
import {
  CARD3,
  LOW,
  NEW3,
  noSpeech,
  opening3,
  SPEC3,
  said,
  stuckSaid,
  teacher,
} from "../fixtures/talk-lesson";

const line = (en: string, ko: string) => ({ en, ko });
const FILE: TalkCueLinesFile = {
  introduce: {
    "1": {
      long: [line("Listen and say it!", "듣고 말해 봐!")],
      short: [line("Your turn!", "네 차례야!"), line("Say it!", "말해 봐!")],
    },
    "2-3": {
      long: [line("Listen and say this word!", "듣고 이 낱말을 말해 봐!")],
      short: [line("Your turn!", "네 차례야!"), line("You try!", "해 봐!")],
    },
  },
  together: {
    "1": {
      long: [line("Say it with me!", "나랑 같이 말해 봐!")],
      short: [line("With me!", "나랑 같이!"), line("Together!", "같이!")],
    },
    "2-3": {
      long: [line("Listen and say it with me!", "듣고 나랑 같이 말해 봐!")],
      short: [
        line("Your turn!", "네 차례야!"),
        line("Let's say it!", "같이 말하자!"),
      ],
    },
  },
  choices: {
    "1": {
      long: [line("Listen and pick one!", "듣고 하나 골라 봐!")],
      short: [
        line("Pick one!", "하나 골라 봐!"),
        line("You pick!", "네가 골라 봐!"),
      ],
    },
    "2-3": {
      long: [line("Listen and choose one!", "듣고 하나 골라 봐!")],
      short: [
        line("Pick one!", "하나 골라 봐!"),
        line("Your pick!", "네가 골라!"),
      ],
    },
  },
};

function out(over: Partial<TalkLessonOutput> = {}): TalkLessonOutput {
  return {
    child_kind: over.stuck === true ? "not_understood" : "answer",
    stuck: false,
    tori_en: "",
    model_line: "",
    choices: [],
    tori_ko: [],
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    response_fit: false,
    child_topic: false,
    child_asked: false,
    goal_suggest: [],
    next_move: "none",
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

const ok = (value: TalkLessonOutput): LessonOutcomeView => ({
  kind: "ok",
  value,
  hintsBlocked: false,
  overLength: 0,
});

function args3(turns: TalkLessonTurn[]): LessonArgs {
  return {
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: LOW,
    prepWords: ["play", "soccer", "sunday"],
  };
}

const RANGE = new Set(
  "that is okay oh nice do you like it i the weekend sunday play soccer fun".split(
    " ",
  ),
);

/** 문장 문 → 끝 처리(신호 말 재료 포함, 3단계 '2-3' 구간). */
function play({
  args,
  plan,
  stuck = false,
  sentences,
  value,
  child,
}: {
  args: LessonArgs;
  plan: TeacherTurnPlan;
  stuck?: boolean;
  sentences: string[];
  value: TalkLessonOutput;
  child: TalkLessonTurn;
}) {
  const flow = createLessonSentenceFlow({
    low: true,
    ifAnswered: plan,
    ifStuck: null,
    asked: talkLessonPositionOf(args).askedQuestions,
    max: args.settings.sameQuestionMax,
    live: { cuePhrases: seedCuePhrasesOf(FILE), madeUp: [], situation: null },
  });
  flow.stuck(stuck);
  const states = sentences.map((s) => flow.accept(s));
  const result = settleLessonTurn({
    flow,
    outcome: ok(value),
    ctx: {
      card: args.card,
      turns: [...args.turns, child],
      asked: talkLessonPositionOf(args).askedQuestions,
      max: args.settings.sameQuestionMax,
      low: true,
      koMeaning: true,
      dropped: [],
      spec: args.spec,
      lineOptions: {
        sentenceMaxWords: 8,
        allowedWords: RANGE,
        unitWords: NEW3,
        childWords: [],
        teacherName: "Mina",
        lemmaOf: () => undefined,
        forms: [],
        allowedForms: new Set(),
      },
      live: {
        situationLines: {},
        turnNo: 7,
        cue: { file: FILE, band: "2-3" },
      },
    },
  });
  return { states, result };
}

const mv = (over: Partial<Omit<TalkMove, "v">>): TalkMove =>
  talkMoveOf({ kind: "card_slot", ...over });

describe("cuePlaceOf · cueBandOf — 신호 말 자리(spec 설계 6 자리 행)", () => {
  it("AC-15zf (가) 신호 말은 꺼내기 · 받침 첫째 · 선택지 차례에만 붙고, 받침 셋째 · 들리지 않음 · 소리 줄 없는 차례에는 없다", () => {
    expect(
      cuePlaceOf(
        mv({ stage: 1, cause: "button", sound: { answer: "I play." } }),
      ),
    ).toBe("together");
    expect(
      cuePlaceOf(
        mv({
          kind: "ai",
          stage: 1,
          cause: "stuck",
          sound: { model: "I play." },
        }),
      ),
    ).toBe("together");
    expect(cuePlaceOf(mv({ kind: "ai", sound: { model: "Soccer." } }))).toBe(
      "introduce",
    );
    expect(
      cuePlaceOf(
        mv({ kind: "ai", sound: { choices: ["I play.", "I swim."] } }),
      ),
    ).toBe("choices");
    expect(
      cuePlaceOf(
        mv({
          kind: "ai",
          stage: 2,
          cause: "button",
          sound: { choices: ["A.", "B."] },
        }),
      ),
    ).toBe("choices");
    expect(
      cuePlaceOf(
        mv({ stage: 3, cause: "button", sound: { answer: "I play." } }),
      ),
    ).toBeNull();
    expect(
      cuePlaceOf(
        mv({ stage: 0, cause: "nospeech", sound: { answer: "I play." } }),
      ),
    ).toBeNull();
    expect(cuePlaceOf(mv({ stage: 1, cause: "button" }))).toBeNull();
    expect(cuePlaceOf(mv({ kind: "ai" }))).toBeNull();
    expect(cuePlaceOf(null)).toBeNull();
  });

  it("구간은 1단계 '1' · 2~3단계 '2-3' 이고 4단계부터는 신호 말이 없다", () => {
    expect([1, 2, 3, 4, 12].map(cueBandOf)).toEqual([
      "1",
      "2-3",
      "2-3",
      null,
      null,
    ]);
  });
});

describe("cueLineOf · cueLinesOfMoves — 긴 꼴 · 짧은 꼴 돌림 · 되풀이 없음", () => {
  const lines = FILE.introduce["2-3"];

  it("AC-15zf (가) 그 자리의 첫 신호 말은 긴 꼴, 뒤는 짧은 꼴을 차례로 돌린다", () => {
    expect(
      [0, 1, 2, 3].map(
        (ordinal) => cueLineOf({ lines, ordinal, previous: null })?.en,
      ),
    ).toEqual([
      "Listen and say this word!",
      "Your turn!",
      "You try!",
      "Your turn!",
    ]);
  });

  it("AC-15zf (가) 바로 앞 신호 말과 같은 줄(정규화 글)은 건너뛰고, 고를 줄이 없으면 null 이다", () => {
    expect(cueLineOf({ lines, ordinal: 1, previous: "your turn" })?.en).toBe(
      "You try!",
    );
    expect(
      cueLineOf({
        lines: { long: [line("Go!", "가!")], short: [] },
        ordinal: 0,
        previous: "Go!",
      }),
    ).toBeNull();
    expect(
      cueLineOf({ lines: { long: [], short: [] }, ordinal: 0, previous: null }),
    ).toBeNull();
  });

  it("AC-15zf (가) 한 대화의 선생님 행 차례대로 자리마다 몇 번째인지 세고, 다른 자리라도 바로 앞과 같은 줄이 오지 않는다", () => {
    const together = mv({
      stage: 1,
      cause: "button",
      sound: { answer: "I play." },
    });
    const intro = mv({ kind: "ai", sound: { model: "Soccer." } });
    const plain = mv({ kind: "ai" });
    expect(
      cueLinesOfMoves({
        moves: [intro, plain, intro, together, together, null, together],
        band: "2-3",
        file: FILE,
      }).map((l) => l?.en ?? null),
    ).toEqual([
      "Listen and say this word!",
      null,
      "Your turn!",
      "Listen and say it with me!",
      // together 짧은 꼴 첫째 'Your turn!' 는 바로 앞 신호 말과 다르므로 쓴다
      "Your turn!",
      null,
      "Let's say it!",
    ]);
    // 다른 자리의 같은 글(introduce 둘째 'Your turn!' 바로 뒤 together 둘째)은 건너뛴다
    expect(
      cueLinesOfMoves({
        moves: [together, intro, intro, together],
        band: "2-3",
        file: FILE,
      }).map((l) => l?.en ?? null),
    ).toEqual([
      "Listen and say it with me!",
      "Listen and say this word!",
      "Your turn!",
      "Let's say it!",
    ]);
    expect(cueOrdinalOf([intro, together, intro], "introduce")).toBe(2);
    expect(cueOrdinalOf([intro, together, intro], "choices")).toBe(0);
  });
});

describe("긴 꼴이 여럿인 목록(설계 검토 des-3 M-2)", () => {
  const two = {
    long: [
      line("Listen and say it!", "듣고 말해 봐!"),
      line("Listen, then say it!", "듣고 말해 봐!"),
    ],
    short: [
      line("Your turn!", "네 차례야!"),
      line("Say it!", "말해 봐!"),
      line("You try!", "해 봐!"),
    ],
  };
  const file: TalkCueLinesFile = {
    ...FILE,
    introduce: { ...FILE.introduce, "2-3": two },
  };
  const intro = mv({ kind: "ai", sound: { model: "Soccer." } });
  const plain = mv({ kind: "ai" });

  it("첫 신호 말의 긴 꼴은 그 행의 선생님 차례 순번으로 돌아 대화마다 다르고, 뒤는 짧은 꼴 셋을 모두 돌린다", () => {
    const at = (moves: TalkMove[]) =>
      cueLinesOfMoves({ moves, band: "2-3", file }).map((l) => l?.en ?? null);
    expect(at([intro, intro, intro, intro])).toEqual([
      "Listen and say it!",
      "Your turn!",
      "Say it!",
      "You try!",
    ]);
    expect(at([plain, intro])[1]).toBe("Listen, then say it!");
    // 시드 목록의 둘째 긴 꼴도 닿는다(자리 · 구간마다)
    const seed = seedTalkCueLines();
    for (const place of ["introduce", "together", "choices"] as const)
      for (const band of ["1", "2-3"] as const) {
        const second = seed[place][band].long[1];
        if (!second) continue;
        const move =
          place === "choices"
            ? mv({ kind: "ai", sound: { choices: ["A.", "B."] } })
            : place === "together"
              ? mv({ stage: 1, cause: "button", sound: { answer: "A." } })
              : intro;
        expect(
          cueLinesOfMoves({ moves: [plain, move], band, file: seed }).at(-1)
            ?.en,
        ).toBe(second.en);
      }
  });
});

describe("isSoundCue — AI 가 쓴 신호 말 알아보기", () => {
  it("신호 구는 낱말 경계로, 시드 신호 말 줄은 문장 전체가 같을 때만 신호 말이다('Together!' 가 'We play together!' 를 지우지 않음)", () => {
    const seed = seedCuePhrasesOf(FILE);
    expect(isSoundCue("Listen and say!")).toBe(true);
    expect(isSoundCue("That's okay! Let's say it together.")).toBe(true);
    expect(isSoundCue("I like to listen to music.")).toBe(false);
    expect(isSoundCue("Your turn!", seed)).toBe(true);
    expect(isSoundCue("Together!", seed)).toBe(true);
    expect(isSoundCue("We play together!", seed)).toBe(false);
    expect(isSoundCue("Is it your turn to play?", seed)).toBe(false);
    expect(isSoundCue("Your turn!")).toBe(false);
    expect(CUE_PHRASES).toContain("say it together");
  });

  it("낱말 둘 이상인 시드 꼴이 문장 앞 · 끝에 오고 나머지가 맞장구 · 이어 주는 말 · 이름뿐이면 신호 말이다(검토 rev-2 M-2 · 06:221)", () => {
    const seed = seedCuePhrasesOf(FILE);
    for (const cue of [
      "Now it's your turn!",
      "Pick one, okay?",
      "Your turn, Mina!",
      "Okay, say it!",
    ])
      expect(isSoundCue(cue, seed), cue).toBe(true);
    for (const reply of [
      "I can say it!",
      "Can you try?",
      "Come with me!",
      "Is it your turn to play?",
      "We play together!",
    ])
      expect(isSoundCue(reply, seed), reply).toBe(false);
  });

  it("시드 신호 말 목록의 줄은 모두 신호 말로 알아본다(목록이 바뀌어도 꼴 그대로)", () => {
    const file = seedTalkCueLines();
    const seed = seedCuePhrasesOf(file);
    for (const bands of Object.values(file))
      for (const forms of Object.values(bands))
        for (const l of [...forms.long, ...forms.short])
          expect(isSoundCue(l.en, seed)).toBe(true);
  });
});

describe("끝 처리 · 흘림 줄 · 다시 흘림 · 기록(AC-15zf (가) 서버 몫)", () => {
  it("AC-15zf (가) 받침 첫째(같이 말하기)에 앱이 신호 말을 붙이고, AI 가 쓴 신호 말 문장은 화면 · 읽어 주기에 없다 · 흘림 차례는 뜻 → 신호 말 → 소리 줄", () => {
    const args = args3(opening3());
    const { ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const { states, result } = play({
      args,
      plan: ifStuck,
      stuck: true,
      sentences: ["That's okay!", "Your turn!", "Listen and say it with me!"],
      value: out({
        stuck: true,
        tori_ko: ["괜찮아!", "네 차례야!", "같이 말해 봐!"],
      }),
      child: stuckSaid(),
    });
    expect(states).toEqual(["send", "drop", "drop"]);
    expect(result.cue).toEqual({
      en: "Listen and say it with me!",
      ko: "듣고 나랑 같이 말해 봐!",
    });
    expect(lessonAfterLinesOf(result)).toEqual([
      { t: "ko", ko: "괜찮아!" },
      {
        t: "add",
        kind: TALK_CUE_LINE_KIND,
        en: "Listen and say it with me!",
        ko: "듣고 나랑 같이 말해 봐!",
      },
      { t: "sound", kind: "answer", say: "Answer first 1." },
    ]);
    // 신호 말은 talk_turns 원문(text) · 다시 쓸 차례에 없다
    expect(result.text).toBe("That's okay!");
    expect(result.rewrite).not.toContain("Listen and say");
  });

  it("AC-15zf (가) 같은 자리 둘째는 짧은 꼴이고, 받침 셋째 · 들리지 않음 · 소리 줄 없는 AI 차례에는 신호 말이 없다", () => {
    const firstRow = teacher("That's okay!", {
      kind: "card_slot",
      why: "support",
      stage: 1,
      cause: "stuck",
      item: { kind: "required", no: 1 },
      words: ["play"],
      app: ["together", "answer_example"],
      sound: { answer: "Answer first 1." },
    });
    const turns: TalkLessonTurn[] = [
      ...opening3(),
      stuckSaid(),
      firstRow,
      said(),
      teacher("Oh! Do you like soccer?", {
        kind: "ai",
        item: { kind: "required", no: 2 },
        words: ["soccer"],
      }),
    ];
    const args = args3(turns);
    const { ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["soccer"],
    });
    expect(ifStuck.stage).toBe(1);
    const second = play({
      args,
      plan: ifStuck,
      stuck: true,
      sentences: ["Okay!"],
      value: out({ stuck: true }),
      child: stuckSaid(),
    }).result;
    expect(second.cue?.en).toBe("Your turn!");

    const silent = nextTeacherTurnOf(args3([...opening3(), noSpeech()]));
    expect(
      play({
        args: args3(opening3()),
        plan: silent,
        sentences: ["Oops!"],
        value: out(),
        child: noSpeech(),
      }).result.cue,
    ).toBeNull();

    const answered = teacherTurnPlansOf(args3(opening3()), {
      segment: "talk",
      targets: ["play"],
    }).ifAnswered;
    const plain = play({
      args: args3(opening3()),
      plan: answered,
      sentences: ["Oh, nice!", "Do you like it?"],
      value: out({ next_targets: ["sunday"] }),
      child: said(),
    }).result;
    expect(plain.cue).toBeNull();
    const intro = play({
      args: args3(opening3()),
      plan: answered,
      sentences: ["Oh, nice!", "Do you like soccer?"],
      value: out({
        model_line: "Soccer.",
        new_words: ["soccer"],
        next_targets: ["sunday"],
      }),
      child: said(),
    }).result;
    expect(intro.move.sound).toEqual({ model: "Soccer." });
    expect(intro.cue?.en).toBe("Listen and say this word!");
  });

  it("AC-15zf (가) 같은 시도 id 다시 흘림은 저장된 move 로 같은 신호 말을 같은 자리(뜻 뒤 · 소리 줄 앞)에 낸다", () => {
    const args = args3(opening3());
    const { ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const { result } = play({
      args,
      plan: ifStuck,
      stuck: true,
      sentences: ["That's okay!"],
      value: out({ stuck: true, tori_ko: ["괜찮아!"] }),
      child: stuckSaid(),
    });
    const saved = teacher(result.text, { ...result.move });
    const state = {
      level: 3,
      spec: SPEC3,
      turns: [...opening3(), stuckSaid(), saved],
    };
    const cue = lessonCueOfRows(state, { cue: FILE });
    expect(cue).toEqual(result.cue);
    const replay = lessonReplayLinesOf(
      { text: result.text, toriKo: result.ko, move: result.move },
      { card: CARD3, koMeaning: true, cue },
    );
    expect(replay).toEqual([
      { t: "s", en: "That's okay!" },
      { t: "ko", ko: "괜찮아!" },
      {
        t: "add",
        kind: TALK_CUE_LINE_KIND,
        en: "Listen and say it with me!",
        ko: "듣고 나랑 같이 말해 봐!",
      },
      { t: "sound", kind: "answer", say: "Answer first 1." },
    ]);
    // 4단계는 신호 말을 다시 고르지 않는다
    expect(lessonCueOfRows({ ...state, level: 4 }, { cue: FILE })).toBeNull();
  });

  it("AC-15zf (가) 신호 말은 대화 기록에 들지 않는다(지금 턴 말풍선에만)", () => {
    const entry = liveTeacherEntryOf({
      turnNo: 9,
      content: {
        lines: [
          { t: "s", en: "That's okay!" },
          {
            t: "add",
            kind: TALK_CUE_LINE_KIND,
            en: "Listen and say it with me!",
            ko: "듣고 나랑 같이 말해 봐!",
          },
          { t: "sound", kind: "answer", say: "I play soccer." },
          { t: "add", kind: "question", en: "What sport is fun?", ko: "뜻 2" },
        ],
        ko: "괜찮아!",
      },
      koMeaning: true,
    });
    expect(JSON.stringify(entry)).not.toContain("Listen and say");
    expect(
      entry?.who === "teacher" ? entry.lines.map((l) => l.en) : [],
    ).toEqual(["That's okay!", "What sport is fun?"]);
  });
});
