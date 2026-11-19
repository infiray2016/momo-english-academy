// 수업 안 한국어로 묻기 묶음 4-다 — 도움 뒤 다음 영어 턴의 순수 판정(세 방식 공통 대접 · 기존 방식의 한 줄 · 귀띔 · 막힘 무름 · '말했다' 거름 ·
// 되묻는 차례를 건너 이어받기 [N-1]). spec 판 3 설계 4 '다음 영어 턴' 표 · plan 정한 것 8 · 9, 정본 11 AC-25c · AC-25j · AC-25o · AC-N26.
import { describe, expect, it } from "vitest";
import {
  normalizeTalkLesson,
  type TalkHeardSource,
  type TalkLessonOutput,
  talkLessonUserMessage,
} from "@/core/ai/calls/talk-lesson";
import { effectiveStuckOf } from "@/core/conversation/child-kind";
import { heardHintsOf } from "@/core/conversation/heard-hint";
import {
  heardWithTaughtOf,
  KO_HELP_HINT_KINDS,
  KO_HELP_TAUGHT_SPELLING_NOTE,
  type KoHelpStandingRow,
  koHelpCarryOf,
  koHelpLineText,
  koHelpStandingOf,
  koHelpTurnNosOf,
  koHelpUnitWordsOf,
  koTaughtHeardOf,
  koTaughtMatchedOf,
  raiseHintKind,
  unitWordsWithoutShownOf,
  withKoHelpLineOf,
} from "@/core/conversation/ko-help";
import { TALK_HINT_KINDS } from "@/core/conversation/lesson-turns";
import { metWordsIn } from "@/core/conversation/said";
import { bestMatchRate } from "@/core/speech/match-rate";
import {
  KO_HELP_ENTRIES_MAX,
  parseTalkTurnRequest,
  turnSettings,
} from "@/server/conversation/turn";
import {
  BASE_CALL_TURN,
  lessonInput,
  lessonRules,
} from "../fixtures/ai/talk-lesson-inputs";

const row = (over: Partial<KoHelpStandingRow> = {}): KoHelpStandingRow => ({
  turnNo: 3,
  seq: 1,
  kind: "expression",
  sayKo: "김밥은 이렇게 말해.",
  teachEn: "I like gimbap.",
  textShown: true,
  fallback: "none",
  shownEn: ["I like gimbap."],
  heard: null,
  ...over,
});

const rate = (targets: readonly string[], heard: string) =>
  bestMatchRate(targets, heard, { homophones: [], nameSlot: "excluded" });

describe("AC-25j 한국어 도움의 대접(koHelpStandingOf — 세 방식 공통)", () => {
  it("도움이 없으면 그대로: 없음 · ko_help 없음 · 한 줄 없음(AC-N26)", () => {
    expect(koHelpStandingOf([], { lowBand: true })).toEqual({
      hintKind: "none",
      koHelp: false,
      taught: [],
      line: null,
      shownWords: [],
    });
  });

  it("4단계부터 표현을 글로 보았으면 '영어' · ko_help · taught 한 줄", () => {
    const s = koHelpStandingOf([row()], { lowBand: false });
    expect(s.hintKind).toBe("english");
    expect(s.koHelp).toBe(true);
    expect(s.line).toEqual({ kind: "taught", taught: ["I like gimbap."] });
    expect(s.shownWords).toEqual(["i", "like", "gimbap"]);
  });

  it("4단계부터 가르친 표현 칸이 비고 한국어 답 속 토막이 새로 보였으면 그 토막을 적는다 [N-4]", () => {
    // 4-나 는 한국어 답 속 새 영어 토막이 있을 때 textShown 을 참으로 적는다(검토 rev-b4c M-1 — 실제로 생기는 행)
    const s = koHelpStandingOf(
      [
        row({
          kind: "meaning",
          teachEn: null,
          textShown: true,
          shownEn: ["red apple"],
        }),
      ],
      { lowBand: false },
    );
    expect(s.hintKind).toBe("english");
    expect(s.line).toEqual({ kind: "taught", taught: ["red apple"] });
  });

  it("4단계부터 '보았다'는 행의 textShown 으로 본다: 쉼표로 늘어놓은 낱말(조각 글 'cat dog')은 '뜻만' · meaning only [rev-b4c M-1]", () => {
    // 4-나 는 "'cat, dog'는 …" 의 조각을 토막으로 보지 않아 textShown 거짓 · shown_en 은 문장 부호를 버린 'cat dog' 로 적는다
    const s = koHelpStandingOf(
      [
        row({
          kind: "meaning",
          teachEn: null,
          textShown: false,
          shownEn: ["cat dog"],
        }),
      ],
      { lowBand: false },
    );
    expect(s.hintKind).toBe("meaning_only");
    expect(s.koHelp).toBe(true);
    expect(s.line).toEqual({ kind: "meaning" });
    expect(koHelpLineText(s.line ?? { kind: "meaning" })).toBe(
      "Korean help before this answer: meaning only",
    );
    // 새로 보인 낱말은 대접과 관계없이 '말했다' 거름에 든다
    expect(s.shownWords).toEqual(["cat", "dog"]);
  });

  it("4단계부터 한 줄의 토막은 textShown 이 참인 행의 shown_en 에서만 고른다 [rev-b4c M-1]", () => {
    const s = koHelpStandingOf(
      [
        row({
          kind: "meaning",
          teachEn: null,
          textShown: false,
          shownEn: ["cat dog"],
        }),
        row({
          seq: 2,
          kind: "meaning",
          teachEn: null,
          textShown: true,
          shownEn: ["red apple"],
        }),
      ],
      { lowBand: false },
    );
    expect(s.hintKind).toBe("english");
    expect(s.line).toEqual({ kind: "taught", taught: ["red apple"] });
  });

  it("뜻만 받았으면 '뜻만' · ko_help · meaning only(낱말 하나 토막은 표현이 아니다)", () => {
    const s = koHelpStandingOf(
      [
        row({
          kind: "meaning",
          teachEn: null,
          textShown: false,
          shownEn: ["apple"],
        }),
      ],
      { lowBand: false },
    );
    expect(s.hintKind).toBe("meaning_only");
    expect(s.koHelp).toBe(true);
    expect(s.line).toEqual({ kind: "meaning" });
    expect(s.shownWords).toEqual(["apple"]);
  });

  it("1~3단계 표현을 소리로 들었으면(값이 없으면 들은 것으로) '영어'", () => {
    const low = row({ textShown: false, shownEn: [] });
    expect(koHelpStandingOf([low], { lowBand: true }).hintKind).toBe("english");
    expect(
      koHelpStandingOf([low], {
        lowBand: true,
        device: [{ turnNo: 3, seq: 1, heard: true, replays: 1 }],
      }).line,
    ).toEqual({ kind: "taught", taught: ["I like gimbap."] });
  });

  it("1~3단계 한 번도 들려주지 못한 표현은 그대로 · ko_help 없음(기기 값이 행 값보다 앞선다) [I-6]", () => {
    const low = row({ textShown: false, shownEn: [], heard: true });
    const s = koHelpStandingOf([low], {
      lowBand: true,
      device: [{ turnNo: 3, seq: 1, heard: false, replays: 0 }],
    });
    expect(s).toMatchObject({ hintKind: "none", koHelp: false, line: null });
    expect(
      koHelpStandingOf([{ ...low, heard: false }], { lowBand: true }).koHelp,
    ).toBe(false);
  });

  it("불분명 · 그 밖 · 대신 줄 두 꼴 · 답이 없는 행은 도움 없음 [N-5]", () => {
    const cases: KoHelpStandingRow[] = [
      row({ kind: "unclear", teachEn: null, shownEn: [] }),
      row({ kind: "other", teachEn: null, shownEn: [] }),
      row({ kind: null, fallback: "call_failed", teachEn: null, shownEn: [] }),
      // 검사 걸림 꼴은 모델 갈래(표현)가 남아도 도움 없음(검토 rev-b4b 6절)
      row({ fallback: "check_blocked", teachEn: null, textShown: false }),
      row({ kind: null, sayKo: null, fallback: null, teachEn: null }),
    ];
    for (const c of cases)
      expect(koHelpStandingOf([c], { lowBand: false })).toMatchObject({
        hintKind: "none",
        koHelp: false,
        line: null,
      });
  });

  it("여럿이면 가장 높은 대접 · 한 줄에 가르친 표현을 모두(같은 글은 하나)", () => {
    const s = koHelpStandingOf(
      [
        row({ kind: "meaning", teachEn: null, textShown: false, shownEn: [] }),
        row({ seq: 2 }),
        row({
          seq: 3,
          teachEn: "Gimbap, please.",
          shownEn: ["Gimbap, please."],
        }),
        row({ seq: 4 }),
      ],
      { lowBand: false },
    );
    expect(s.hintKind).toBe("english");
    expect(s.line).toEqual({
      kind: "taught",
      taught: ["I like gimbap.", "Gimbap, please."],
    });
    expect(koHelpLineText(s.line ?? { kind: "meaning" })).toBe(
      `Korean help before this answer: taught 'I like gimbap.'; 'Gimbap, please.' ${KO_HELP_TAUGHT_SPELLING_NOTE}`,
    );
    expect(koHelpLineText({ kind: "meaning" })).toBe(
      "Korean help before this answer: meaning only",
    );
  });

  it("C225 보완 3 가르친 표현 꼴의 줄 끝에만 철자 구가 한 번 붙는다(뜻만 받은 꼴은 그대로)", () => {
    expect(KO_HELP_TAUGHT_SPELLING_NOTE).toBe(
      "(speech-to-text may write these words wrong; words that sound like them are these words, so say them back in this spelling)",
    );
    expect(koHelpLineText({ kind: "taught", taught: ["I like gimbap."] })).toBe(
      "Korean help before this answer: taught 'I like gimbap.' (speech-to-text may write these words wrong; words that sound like them are these words, so say them back in this spelling)",
    );
    const many = koHelpLineText({
      kind: "taught",
      taught: ["I like gimbap.", "Gimbap, please."],
    });
    expect(many.split(KO_HELP_TAUGHT_SPELLING_NOTE)).toHaveLength(2);
    expect(
      many.endsWith(`'Gimbap, please.' ${KO_HELP_TAUGHT_SPELLING_NOTE}`),
    ).toBe(true);
    expect(koHelpLineText({ kind: "meaning" })).not.toContain(
      KO_HELP_TAUGHT_SPELLING_NOTE,
    );
  });

  it("힌트 종류 올림은 높은 쪽만(이미 더 높으면 그대로)", () => {
    expect(raiseHintKind("none", "english")).toBe("english");
    expect(raiseHintKind("english", "meaning_only")).toBe("english");
    expect(raiseHintKind("meaning_only", "none")).toBe("meaning_only");
  });

  it("힌트 종류 목록은 회화 턴 행의 목록 하나다(같은 값 · 같은 차례) [rev-b4c M-4]", () => {
    expect(KO_HELP_HINT_KINDS).toBe(TALK_HINT_KINDS);
  });
});

describe("AC-25j 단원 단어 목록 — 거름은 '말했다'에만, '만났다'는 거르지 않은 목록 [rev-b4c I-1]", () => {
  const lemmaOf = (w: string) => ({ apples: "apple" })[w.toLowerCase()];
  it("새로 보인 낱말이 있어도 '만났다' 목록은 받은 목록 그대로(같은 배열), '말했다'만 거른다", () => {
    const unit = ["apple", "gimbap", "red"];
    const lists = koHelpUnitWordsOf(unit, ["apples"], lemmaOf);
    expect(lists.met).toBe(unit);
    expect(lists.said).toEqual(["gimbap", "red"]);
    // 선생님이 다음 영어 말에서 그 낱말을 쓰면 '만났다'에는 든다
    expect(
      metWordsIn("Do you like apples?", {
        unitWords: lists.met,
        lemmaOf: (w) => lemmaOf(w) ?? w,
      }),
    ).toContain("apple");
  });
  it("도움이 없으면 둘 다 받은 목록 그대로(같은 배열 — AC-N26)", () => {
    const unit = ["apple", "gimbap"];
    const lists = koHelpUnitWordsOf(unit, [], lemmaOf);
    expect(lists.met).toBe(unit);
    expect(lists.said).toBe(unit);
  });
});

describe("AC-25j '말했다' 거름 — 새로 보인 낱말만 단원 단어 목록에서 뺀다", () => {
  const lemmaOf = (w: string) =>
    ({ apples: "apple", likes: "like" })[w.toLowerCase()];
  it("새로 보인 낱말이 없으면 목록 그대로(같은 배열)", () => {
    const unit = ["apple", "gimbap"];
    expect(unitWordsWithoutShownOf(unit, [], lemmaOf)).toBe(unit);
  });
  it("표기형도 원형으로 맞대어 뺀다", () => {
    expect(
      unitWordsWithoutShownOf(["apple", "gimbap", "red"], ["apples"], lemmaOf),
    ).toEqual(["gimbap", "red"]);
  });
});

describe("AC-25o 가르친 표현과의 일치(막힘 무름 한 꼴)", () => {
  it("일치율이 문턱 이상이면 참, 아래면 거짓", () => {
    const taught = ["I like gimbap."];
    expect(
      koTaughtMatchedOf({
        heard: "I like gimbap",
        taught,
        minMatch: 0.9,
        rateOf: rate,
      }),
    ).toBe(true);
    expect(
      koTaughtMatchedOf({
        heard: "I like kimpap",
        taught,
        minMatch: 0.9,
        rateOf: rate,
      }),
    ).toBe(false);
  });
  it("가르친 표현이 없거나 들은 글에 영어 낱말이 없으면 거짓", () => {
    expect(
      koTaughtMatchedOf({
        heard: "I like gimbap",
        taught: [],
        minMatch: 0.9,
        rateOf: rate,
      }),
    ).toBe(false);
    expect(
      koTaughtMatchedOf({
        heard: "김밥",
        taught: ["I like gimbap."],
        minMatch: 0.9,
        rateOf: rate,
      }),
    ).toBe(false);
  });
});

describe("AC-25j AC-25o 되묻는 차례를 건너 이어받기 [N-1](기존 방식은 순수 함수 시험)", () => {
  // 선생님 3 → 아이 3(도움 뒤 말, 되물음) → 선생님 4(되묻기) → 지금 아이 차례 4
  const rows = [
    { speaker: "teacher" as const, turnNo: 3 },
    { speaker: "child" as const, turnNo: 3, askAgain: true },
    { speaker: "teacher" as const, turnNo: 4, askAgain: true },
  ];
  it("되묻는 차례 뒤의 아이 차례가 그 앞 차례의 도움을 이어받아 '영어' · ko_help · 한 줄", () => {
    const turnNos = koHelpTurnNosOf(rows);
    expect(turnNos).toEqual([3, 4]);
    const helps = [row({ turnNo: 3, textShown: false, shownEn: [] })].filter(
      (h) => turnNos.includes(h.turnNo),
    );
    const s = koHelpStandingOf(helps, { lowBand: true });
    expect(s).toMatchObject({
      hintKind: "english",
      koHelp: true,
      line: { kind: "taught", taught: ["I like gimbap."] },
    });
    expect(s.taught).toEqual(["I like gimbap."]);
    // 이어받은 도움(끝 줄 koCarry 의 재료)은 지금 턴 번호가 아닌 것만
    expect(
      koHelpCarryOf([row({ turnNo: 3 }), row({ turnNo: 4 })], turnNos),
    ).toEqual([row({ turnNo: 3 })]);
  });
  it("되묻기가 없으면 이어받지 않는다(지금 턴 번호만)", () => {
    const plain = [
      { speaker: "teacher" as const, turnNo: 3 },
      { speaker: "child" as const, turnNo: 3 },
      { speaker: "teacher" as const, turnNo: 4 },
    ];
    const turnNos = koHelpTurnNosOf(plain);
    expect(turnNos).toEqual([4]);
    expect(koHelpCarryOf([row({ turnNo: 3 })], turnNos)).toEqual([]);
  });
});

// ── 기존 방식의 배선(서버 lesson-turn 의 순수 몫 · 회화 턴 입력 · 입구의 요청 풀기) ──────────────

const stuckAnswer = (
  over: Partial<TalkLessonOutput> = {},
): TalkLessonOutput => ({
  child_kind: "unrelated_words",
  stuck: true,
  tori_en: "That's okay. Do you like rice?",
  model_line: "",
  choices: [],
  tori_ko: ["괜찮아.", "밥 좋아해?"],
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
});

describe("AC-25c 기존 방식 회화 턴 사용자 메시지의 한국어 도움 한 줄", () => {
  const taught = koHelpStandingOf([row()], { lowBand: false });
  it("도움이 있으면 아이 말 줄(과 귀띔 줄) 바로 뒤에 한 줄", () => {
    const msg = talkLessonUserMessage(
      withKoHelpLineOf({ ...BASE_CALL_TURN, child: "I like gimbap." }, taught),
    );
    const lines = msg.split("\n");
    const at = lines.indexOf(
      `Korean help before this answer: taught 'I like gimbap.' ${KO_HELP_TAUGHT_SPELLING_NOTE}`,
    );
    expect(at).toBeGreaterThan(0);
    expect(lines[at - 1]).toBe("Child: I like gimbap.");
    expect(lines[at + 1]).toBe("Input: speech");
  });
  it("뜻만 받았으면 meaning only", () => {
    const meaning = koHelpStandingOf(
      [row({ kind: "meaning", teachEn: null, textShown: false, shownEn: [] })],
      { lowBand: false },
    );
    expect(
      talkLessonUserMessage(withKoHelpLineOf(BASE_CALL_TURN, meaning)),
    ).toContain("Korean help before this answer: meaning only");
  });
  it("AC-N26 도움이 없으면 입력도 사용자 메시지도 글자 그대로(같은 객체)", () => {
    const none = koHelpStandingOf([], { lowBand: true });
    expect(withKoHelpLineOf(BASE_CALL_TURN, none)).toBe(BASE_CALL_TURN);
    expect(withKoHelpLineOf(BASE_CALL_TURN, null)).toBe(BASE_CALL_TURN);
    expect(talkLessonUserMessage(withKoHelpLineOf(BASE_CALL_TURN, null))).toBe(
      talkLessonUserMessage(BASE_CALL_TURN),
    );
    expect(talkLessonUserMessage(BASE_CALL_TURN)).not.toContain("Korean help");
  });
});

describe("AC-25o 귀띔의 기대 낱말에 가르친 표현 · 막힘 무름 한 꼴(기존 방식)", () => {
  const source: TalkHeardSource = {
    answer: "I like rice.",
    targets: ["rice"],
    scene: ["rice", "fish"],
    homophones: [],
    soundAlikes: [{ word: "gimbap", alikes: ["kimbob"] }],
  };
  it("가르친 표현의 내용 낱말로 들린 것일 수 있으면 귀띔이 생긴다(없으면 없다)", () => {
    const lemma = () => undefined;
    expect(
      heardHintsOf({ ...source, heard: "I like kimbob.", lemmaOf: lemma }),
    ).toEqual([]);
    const withTaught = heardWithTaughtOf(source, {
      taught: ["I like gimbap."],
    });
    expect(
      heardHintsOf({
        ...(withTaught ?? source),
        heard: "I like kimbob.",
        lemmaOf: lemma,
      }),
    ).toEqual([
      { heard: "kimbob", expected: "gimbap", by: "sound", from: "answer" },
    ]);
  });
  it("소리에 근거가 없으면 답 틀만으로 귀띔을 내지 않는다(C217 보완 3 (6) — spec 설계 4 의 답 틀 꼴은 따르지 않음)", () => {
    const withTaught = heardWithTaughtOf(source, {
      taught: ["I like gimbap."],
    });
    expect(
      heardHintsOf({
        ...(withTaught ?? source),
        heard: "I like pizza.",
        lemmaOf: () => undefined,
      }),
    ).toEqual([]);
  });
  it("귀띔 재료가 없거나 도움이 없으면 재료 그대로(같은 값)", () => {
    expect(
      heardWithTaughtOf(undefined, { taught: ["I like gimbap."] }),
    ).toBeUndefined();
    expect(heardWithTaughtOf(source, null)).toBe(source);
    expect(heardWithTaughtOf(source, { taught: [] })).toBe(source);
  });
  it("가르친 표현과 문턱 이상 맞으면 가짜 응답이 막힘 참이어도 앱이 막힘으로 보지 않는다", () => {
    const ko = { taught: ["I like gimbap."] };
    const minMatch = 0.9;
    expect(
      koTaughtHeardOf(ko, "I like gimbap", {
        minMatch,
        homophones: [],
      }),
    ).toBe(true);
    expect(
      koTaughtHeardOf(null, "I like gimbap", {
        minMatch,
        homophones: [],
      }),
    ).toBe(false);
    // 4단계 입력(귀띔 없는 구간에도 무름은 모든 단계)
    const base = lessonInput(4, { turn: { child: "Gimbap." } });
    expect(
      normalizeTalkLesson(stuckAnswer(), base, lessonRules(4))?.stuck,
    ).toBe(true);
    expect(
      normalizeTalkLesson(
        stuckAnswer(),
        { ...base, koTaughtMatched: true },
        lessonRules(4),
      )?.stuck,
    ).toBe(false);
  });
  it("무름은 말 입력에서만, 무르기만 한다(막힘 거짓은 그대로)", () => {
    const common = {
      childKind: undefined,
      child: "Gimbap.",
      taughtMatched: true,
    };
    expect(
      effectiveStuckOf({ ...common, aiStuck: true, input: "dont_know" }),
    ).toBe(true);
    expect(
      effectiveStuckOf({ ...common, aiStuck: false, input: "speech" }),
    ).toBe(false);
    expect(
      effectiveStuckOf({ ...common, aiStuck: true, input: "speech" }),
    ).toBe(false);
  });
});

describe("AC-N26 회화 턴 입구의 koHelp 칸(세 방식 공통 — 한 번 푼다)", () => {
  const base = {
    sessionId: "00000000-0000-4000-8000-000000000001",
    clientAttemptId: "a-1",
    input: { mode: "speech", text: "I like gimbap." },
    hint: { opened: 0, heard: [] },
  };
  it("칸이 없으면 지금과 같은 값(칸이 생기지 않는다)", () => {
    const parsed = parseTalkTurnRequest(base);
    expect(parsed?.kind).toBe("child");
    expect(parsed?.request).toEqual(base);
    expect("koHelp" in (parsed?.request ?? {})).toBe(false);
  });
  it("도움 칸을 받는다(heard · replays 는 없어도 된다)", () => {
    const koHelp = [
      { turnNo: 3, seq: 1, heard: true, replays: 2 },
      { turnNo: 3, seq: 2 },
    ];
    const parsed = parseTalkTurnRequest({ ...base, koHelp });
    expect(parsed?.kind === "child" && parsed.request.koHelp).toEqual(koHelp);
  });
  it("꼴이 틀린 항목은 받지 않는다(가외 칸 · 음수 · 순번 0)", () => {
    for (const bad of [
      [{ turnNo: 3, seq: 1, text: "x" }],
      [{ turnNo: -1, seq: 1 }],
      [{ turnNo: 3, seq: 0 }],
      [{ turnNo: 3, seq: 1, replays: -1 }],
    ])
      expect(parseTalkTurnRequest({ ...base, koHelp: bad })).toBeNull();
  });
  it("항목이 상한을 넘어도 턴 요청을 거절하지 않고 마지막 것들만 읽는다(횟수로 수업을 멈추지 않는다) [rev-b4c M-2]", () => {
    const koHelp = Array.from({ length: KO_HELP_ENTRIES_MAX + 10 }, (_, i) => ({
      turnNo: 3,
      seq: i + 1,
    }));
    const parsed = parseTalkTurnRequest({ ...base, koHelp });
    expect(parsed?.kind).toBe("child");
    const read = parsed?.kind === "child" ? parsed.request.koHelp : undefined;
    expect(read).toEqual(koHelp.slice(-KO_HELP_ENTRIES_MAX));
    expect(read?.[0]?.seq).toBe(11);
    // 상한 안이면 그대로
    const fit = koHelp.slice(0, KO_HELP_ENTRIES_MAX);
    const fitted = parseTalkTurnRequest({ ...base, koHelp: fit });
    expect(fitted?.kind === "child" && fitted.request.koHelp).toEqual(fit);
  });
  it("턴 입구 설정 목록에 talk.hint_read_match(막힘 무름 문턱)가 있다(plan 정한 것 13)", () => {
    expect(Object.keys(turnSettings)).toContain("talk.hint_read_match");
  });
});
