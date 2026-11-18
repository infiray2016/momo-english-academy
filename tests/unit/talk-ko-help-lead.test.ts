// 수업 안 한국어로 묻기 묶음 4-라 — Claude 주도 방식에 잇기(13절 C240 · C225 (3) (5) · C225 보완 1 (2) (3) (4) (6) · C221). 순수 함수만:
// 사실 알림의 가르친 표현(목록) · 가림, 소리 귀띔의 기대 낱말 · 막힘 무름 한 꼴(읽기 칸을 막힘 값으로 옮긴 뒤의 앱 무름 자리) · '말했다' 거름의 배선,
// 되묻는 차례 뒤 이어받기(끝 줄 lesson.koCarry · [N-1]), 후보 판정 행의 koHelp 재료. 판정은 묶음 4-다 의 koHelpStandingOf 를 그대로 쓴다.
import { describe, expect, it } from "vitest";
import {
  type TalkLeadInput,
  talkLeadKoTaughtText,
  talkLeadStatusLines,
  talkLeadTurnSpec,
  talkLeadUserMessage,
} from "@/core/ai/calls/talk-lead";
import type { Masker } from "@/core/ai/mask";
import {
  type KoHelpStandingRow,
  type KoHelpTurnRow,
  koCarryOf,
  koHelpStandingOf,
  koHelpTurnNosOf,
  leadKoHelpOf,
} from "@/core/conversation/ko-help";
import {
  type LeadCandidateChildRow,
  type LeadCandidateRow,
  leadCandidateKoHelpTurnsOf,
  leadCandidateTurnsOf,
} from "@/core/conversation/lead-candidate";
import {
  type LeadRowLike,
  leadChildStuckOf,
  leadFlowPrevStuckOf,
  leadStatusOf,
} from "@/core/conversation/lead-turn-core";
import { talkMoveOf } from "@/core/conversation/move";
import { koHelpTurnRowOf } from "@/server/conversation/state";

const TAUGHT = "I like gimbap.";
const lemmaOf = (w: string) => w.toLowerCase();

/** 답이 있는 한국어 도움 행(기본은 1~3단계 표현 — 소리로만 준 표현, 새로 보인 영어 글 없음). */
function help(over: Partial<KoHelpStandingRow> = {}): KoHelpStandingRow {
  return {
    turnNo: 4,
    seq: 1,
    kind: "expression",
    sayKo: "김밥이 좋다고 말하고 싶구나. 이렇게 말해 봐.",
    teachEn: TAUGHT,
    textShown: false,
    fallback: "none",
    shownEn: [],
    heard: null,
    ...over,
  };
}

/** 대화 토막의 선생님 · 아이 행(새 엔진 행 꼴 — 소리 귀띔 재료는 move.lead.asked). */
function rowsUntilTeacher(): LeadRowLike[] {
  return [
    {
      speaker: "tori",
      turnNo: 3,
      segment: "talk",
      text: "What food do you like?",
      move: {
        kind: "ai",
        lead: { move: "react_and_follow_up", asked: ["food"] },
      },
      toriRewrite: "{}",
    },
    {
      speaker: "child",
      turnNo: 3,
      segment: "talk",
      text: "Pizza.",
      sentUserMessage: "m",
    },
    {
      speaker: "tori",
      turnNo: 4,
      segment: "talk",
      text: "Yummy! What else do you like?",
      move: {
        kind: "ai",
        lead: { move: "react_and_follow_up", asked: ["like"] },
      },
      toriRewrite: "{}",
    },
  ];
}

const statusArgs = {
  rows: rowsUntilTeacher(),
  hasChild: true,
  speech: true,
  heard: "Kimbob.",
  turnsLeft: 10,
  unitWords: ["food", "pizza", "like"],
  homophones: [] as const,
  soundAlikes: [{ word: "gimbap", alikes: ["kimbob"] }],
  lemmaOf,
  open: null,
  closing: false,
};

describe("AC-26c AC-25c 사실 알림의 가르친 표현(목록 — C240 · 정본 05 6.1 Claude 주도 방식 문단)", () => {
  it("표현 하나는 승인된 사실 줄 그대로, 여럿이면 `; ` 로 잇고, 빈 목록 · 빈 표현은 줄이 없다", () => {
    const line = (koTaught: readonly string[]) =>
      talkLeadStatusLines({ goalWordsSaid: [], koTaught }).at(-1);
    expect(line([TAUGHT])).toBe(
      'The child asked in Korean and was taught: "I like gimbap.".',
    );
    expect(line([TAUGHT, "Gimbap, please."])).toBe(
      'The child asked in Korean and was taught: "I like gimbap."; "Gimbap, please.".',
    );
    expect(talkLeadStatusLines({ goalWordsSaid: [], koTaught: [] })).toEqual([
      "Goal words the child has said so far: none yet.",
    ]);
    expect(talkLeadKoTaughtText([" ", ""])).toBe("");
    // 옛 꼴(글 하나)은 표현 하나와 같은 글이다
    expect(talkLeadKoTaughtText(TAUGHT)).toBe(talkLeadKoTaughtText([TAUGHT]));
  });

  it("가림은 목록의 표현마다 건다(아이 이름이 든 표현이 사용자 메시지에 나가지 않음)", () => {
    const masker: Masker = (text) => ({
      text: text.replaceAll("Jimin", "{NAME}"),
      names: 0,
      contacts: 0,
    });
    const input = {
      turn: {
        child: { kind: "speech", heard: "I like gimbap." },
        status: {
          goalWordsSaid: [],
          koTaught: ["Jimin and I like gimbap.", TAUGHT],
        },
      },
    } as unknown as TalkLeadInput;
    const message = talkLeadUserMessage(
      talkLeadTurnSpec.mask(input, masker).turn,
    );
    expect(message).toContain(
      '- The child asked in Korean and was taught: "{NAME} and I like gimbap."; "I like gimbap.".',
    );
    expect(message).not.toContain("Jimin");
  });
});

describe("AC-25o AC-N26 leadStatusOf — 사실 줄과 소리 귀띔의 기대 낱말", () => {
  it("가르친 표현을 넘기면 사실 줄 값이 생기고, 소리 귀띔에 가르친 표현의 내용 낱말이 기대 낱말로 든다", () => {
    const plain = leadStatusOf(statusArgs);
    const helped = leadStatusOf({ ...statusArgs, koTaught: [TAUGHT] });
    expect(helped.koTaught).toEqual([TAUGHT]);
    expect(plain.soundNotes ?? []).toEqual([]);
    expect(helped.soundNotes).toEqual([
      expect.objectContaining({ like: "gimbap" }),
    ]);
    // 그 밖의 줄은 같다
    const { koTaught: _k, soundNotes: _s, ...restHelped } = helped;
    const { soundNotes: _p, ...restPlain } = plain;
    expect(restHelped).toEqual(restPlain);
  });

  it("가르친 표현이 없거나 빈 목록이면 고치기 전과 같은 값(칸이 생기지 않음)", () => {
    const plain = leadStatusOf(statusArgs);
    expect(leadStatusOf({ ...statusArgs, koTaught: [] })).toEqual(plain);
    expect(plain).not.toHaveProperty("koTaught");
    expect(talkLeadStatusLines(plain).join("\n")).not.toContain("Korean");
  });
});

describe("AC-25o 막힘 무름 한 꼴(읽기 칸을 막힘 값으로 옮긴 뒤의 앱 무름 자리)", () => {
  const base = {
    reading: "does_not_fit",
    mode: "speech" as const,
    heard: "Gimbap like.",
    sceneWords: new Set<string>(),
    homophones: [] as const,
  };
  it("읽기 칸이 막힘 갈래여도 가르친 표현과 맞은 말이면 막힘이 아니다(흘려 받는 동안의 판정도 같다)", () => {
    expect(leadChildStuckOf(base)).toBe(true);
    expect(leadChildStuckOf({ ...base, taughtMatched: true })).toBe(false);
    const flow = {
      ...base,
      hasChild: true,
      nospeech: false,
    };
    expect(leadFlowPrevStuckOf(flow)).toBe(true);
    expect(leadFlowPrevStuckOf({ ...flow, taughtMatched: true })).toBe(false);
  });

  it("'잘 모르겠어요' 단추는 무름이 닿지 않는다(말 입력에서만)", () => {
    expect(
      leadFlowPrevStuckOf({
        ...base,
        mode: "dont_know",
        hasChild: true,
        nospeech: false,
        taughtMatched: true,
      }),
    ).toBe(true);
  });
});

describe("AC-25j AC-25o leadKoHelpOf — Claude 주도 방식 턴 길의 배선", () => {
  const opts = {
    heard: TAUGHT,
    speech: true,
    unitWords: ["gimbap", "food"],
    lemmaOf,
    minMatch: 0.8,
    homophones: [] as const,
  };
  it("도움이 없으면 가르친 표현 없음 · 무름 거짓 · 단원 단어는 받은 목록 그대로(AC-N26)", () => {
    const out = leadKoHelpOf(null, opts);
    expect(out.koTaught).toBeUndefined();
    expect(out.taughtMatched).toBe(false);
    expect(out.saidUnitWords).toBe(opts.unitWords);
  });

  it("들은 표현 뒤: 가르친 표현 목록 · 맞은 말이면 무름 · 말 입력이 아니면 무름 없음", () => {
    const ko = koHelpStandingOf([help()], { lowBand: true });
    const out = leadKoHelpOf(ko, opts);
    expect(out.koTaught).toEqual([TAUGHT]);
    expect(out.taughtMatched).toBe(true);
    expect(leadKoHelpOf(ko, { ...opts, heard: "Pizza." }).taughtMatched).toBe(
      false,
    );
    expect(leadKoHelpOf(ko, { ...opts, speech: false }).taughtMatched).toBe(
      false,
    );
  });

  it("뜻만 받은 뒤: 사실 줄 없음(가르친 표현이 없음) · 한국어 답에 글자로 든 단원 단어는 '말했다' 목록에서 빠진다", () => {
    const ko = koHelpStandingOf(
      [
        help({
          kind: "meaning",
          teachEn: null,
          sayKo: "gimbap 은 김밥이야.",
          shownEn: ["gimbap"],
        }),
      ],
      { lowBand: true },
    );
    expect(ko.hintKind).toBe("meaning_only");
    const out = leadKoHelpOf(ko, { ...opts, heard: "I like gimbap." });
    expect(out.koTaught).toBeUndefined();
    expect(out.saidUnitWords).toEqual(["food"]);
  });

  it("한 번도 들려주지 못한 1~3단계 표현 · 대신 줄 · 답이 없는 행은 도움 없음과 같다", () => {
    for (const row of [
      help({ heard: false }),
      help({ fallback: "call_failed" }),
      help({ sayKo: null, fallback: null, kind: null }),
    ]) {
      const out = leadKoHelpOf(
        koHelpStandingOf([row], { lowBand: true }),
        opts,
      );
      expect(out.koTaught).toBeUndefined();
      expect(out.taughtMatched).toBe(false);
    }
  });
});

describe("AC-25j AC-25o [N-1] 되묻는 차례(move ask_again) 뒤 이어받기", () => {
  /** 도움을 받은 차례(턴 4)의 아이 말이 되물은 아이 차례가 되고, 선생님 턴 5 가 되묻는 차례다. */
  const askedRows: KoHelpTurnRow[] = [
    { speaker: "teacher", turnNo: 4 },
    { speaker: "child", turnNo: 4, askAgain: true },
    { speaker: "teacher", turnNo: 5, askAgain: true },
  ];
  it("되묻는 차례 뒤 아이 차례는 앞 차례의 도움을 읽고, 대접이 그대로 걸린다(사실 줄 · 무름)", () => {
    const turnNos = koHelpTurnNosOf(askedRows);
    expect(turnNos).toEqual([4, 5]);
    const ko = koHelpStandingOf(
      [help()].filter((h) => turnNos.includes(h.turnNo)),
      { lowBand: true },
    );
    const out = leadKoHelpOf(ko, {
      heard: TAUGHT,
      speech: true,
      unitWords: [],
      lemmaOf,
      minMatch: 0.8,
      homophones: [],
    });
    expect(ko.hintKind).toBe("english");
    expect(out.koTaught).toEqual([TAUGHT]);
    expect(out.taughtMatched).toBe(true);
  });

  it("끝 줄 koCarry: 이어받은 도움(답이 있고 대신 줄이 아닌 것)만, 가르친 표현 글과 함께 · 되묻지 않은 차례는 빈 목록", () => {
    const rows = [
      help(),
      help({ seq: 2, kind: "meaning", teachEn: null }),
      help({ seq: 3, fallback: "check_blocked", teachEn: null }),
      help({ seq: 4, sayKo: null, fallback: null, kind: null }),
      help({ turnNo: 5, seq: 1 }),
    ];
    expect(koCarryOf(rows, [4, 5])).toEqual([
      { turnNo: 4, seq: 1, teachEn: TAUGHT },
      { turnNo: 4, seq: 2 },
    ]);
    expect(koCarryOf(rows, [5])).toEqual([]);
    expect(koCarryOf(rows, [])).toEqual([]);
  });

  it("후보 판정 행의 koHelp 재료: 도움 대접이 ko_help 인 아이 차례(되묻는 차례를 건너 이어받은 것 포함)", () => {
    const rows: KoHelpTurnRow[] = [
      { speaker: "teacher", turnNo: 3 },
      { speaker: "child", turnNo: 3 },
      ...askedRows,
      { speaker: "child", turnNo: 5 },
      { speaker: "teacher", turnNo: 6 },
      { speaker: "child", turnNo: 6 },
    ];
    expect([
      ...leadCandidateKoHelpTurnsOf(rows, [help()], { lowBand: true }),
    ]).toEqual([4, 5]);
    expect(
      leadCandidateKoHelpTurnsOf(rows, [help({ heard: false })], {
        lowBand: true,
      }).size,
    ).toBe(0);
    expect(leadCandidateKoHelpTurnsOf(rows, [], { lowBand: true }).size).toBe(
      0,
    );
  });

  it("그 재료로 채운 후보 판정 행은 도움 범위 ko_help 를 적는다(기록 전용 판정 — 독립 수행으로 보지 않음)", () => {
    const lex = {
      unitWords: ["gimbap"],
      lemmaOf,
      homophones: [] as const,
    };
    const child = (koHelp: boolean): LeadCandidateChildRow => ({
      role: "child",
      heard: TAUGHT,
      saidWords: [],
      claudeWords: ["gimbap"],
      hintKind: koHelp ? "english" : "none",
      stuck: false,
      koHelp,
      meaningHint: false,
      reading: "clear_answer",
    });
    const teacher: LeadCandidateRow = {
      role: "teacher",
      say: "What food do you like?",
      move: "react_and_follow_up",
      model: null,
      choices: false,
      koShown: false,
    };
    const turnOf = (koHelp: boolean) =>
      leadCandidateTurnsOf([teacher, child(koHelp)], lex).at(-1);
    expect(turnOf(true)?.candidate).toEqual([
      {
        word: "gimbap",
        category: "after_meaning",
        accepted: false,
        help: "ko_help",
      },
    ]);
    expect(turnOf(false)?.candidate[0]?.help ?? null).toBeNull();
  });
});

describe("C225 보완 2 (1) 도움 뒤 '잘 모르겠어요' 차례(Claude 주도 방식)", () => {
  it("사실 알림에 가르친 표현이 실린다(받침을 Claude 가 정함) · 막힘 무름과 소리 귀띔에는 닿지 않는다", () => {
    const ko = koHelpStandingOf([help()], { lowBand: true });
    const out = leadKoHelpOf(ko, {
      heard: "",
      speech: false,
      unitWords: ["gimbap", "food"],
      lemmaOf,
      minMatch: 0.8,
      homophones: [],
    });
    expect(out.koTaught).toEqual([TAUGHT]);
    expect(out.taughtMatched).toBe(false);
    const status = leadStatusOf({
      ...statusArgs,
      speech: false,
      heard: "",
      koTaught: out.koTaught,
    });
    expect(status.koTaught).toEqual([TAUGHT]);
    expect(status.soundNotes ?? []).toEqual([]);
    expect(talkLeadStatusLines(status).at(-1)).toBe(
      'The child asked in Korean and was taught: "I like gimbap.".',
    );
  });
});

describe("AC-25j [N-1] koHelpTurnRowOf — talk_turns 행을 읽을 턴 번호 꼴로", () => {
  const leadMove = (move: "ask_again" | "react_and_follow_up") =>
    talkMoveOf({
      kind: "ai",
      lead: { reading: "likely_misheard", move, asked: [], said: [] },
    });
  it("선생님 행의 move.lead.move 가 ask_again 이면 되묻는 차례다(아이 행 표지가 없어도 앞 아이 차례의 도움을 읽는다)", () => {
    const rows = [
      {
        speaker: "tori",
        turnNo: 4,
        askAgain: null,
        move: leadMove("react_and_follow_up"),
      },
      { speaker: "child", turnNo: 4, askAgain: null, move: null },
      {
        speaker: "tori",
        turnNo: 5,
        askAgain: null,
        move: leadMove("ask_again"),
      },
    ] as const;
    const turnRows = rows.map(koHelpTurnRowOf);
    expect(turnRows).toEqual([
      { speaker: "teacher", turnNo: 4, askAgain: false },
      { speaker: "child", turnNo: 4, askAgain: false },
      { speaker: "teacher", turnNo: 5, askAgain: true },
    ]);
    expect(koHelpTurnNosOf(turnRows)).toEqual([4, 5]);
    // 되묻지 않은 선생님 행이면 지금 차례 하나다(AC-N26)
    const plain = [
      rows[0],
      rows[1],
      { ...rows[2], move: leadMove("react_and_follow_up") },
    ];
    expect(koHelpTurnNosOf(plain.map(koHelpTurnRowOf))).toEqual([5]);
  });
});
