// 회화 수업 새 꼴(C189) 힌트 · 한국어 설명 · 들은 도움 · '말했다' 자리(3.3 힌트 문단 · 막힘 문단 · '말했다', 회화 plan 묶음 '5-나'
// 할 것 2 — hints.ts · said.ts 의 새 꼴 갈래). 옛 꼴 갈래(hintTiersOf 등)는 동작 그대로다. 숫자는 단계 규격 · 시험용 설정에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  heardHelpOf,
  heardHelpsOfMove,
  hintKindOf,
  koExplanationShownOf,
  lessonHintTiersOf,
  openedTierCount,
} from "@/core/conversation/hints";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import { talkMoveOf } from "@/core/conversation/move";
import { countsAsSaid, saidWordsOf } from "@/core/conversation/said";
import {
  LevelSpecsFileSchema,
  type TalkLevelSpec,
  TalkLevelSpecSchema,
} from "@/core/seed/schema/reference";
import {
  button,
  CARD3,
  LOW,
  NEW3,
  noSpeech,
  opening3,
  SPEC3,
  SPEC4,
  teacher,
} from "../fixtures/talk-lesson";

const item = {
  hintKo: "주말에 하는 일",
  hints: ["I ___ on the weekend.", "I play soccer."],
};
/** 실시드 회화 단계 규격(seed/level-specs.json) — 힌트 단 · 한국어 설명 칸을 단계 규격에서 읽는다(C54 (2) · C195). */
const REAL = LevelSpecsFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/level-specs.json"), "utf8"),
  ),
).levelSpecs.filter((s): s is TalkLevelSpec => s.area === "talk");
function specAt(level: number): TalkLevelSpec {
  const spec = REAL.find((s) => s.level === level);
  if (!spec) throw new Error(`회화 ${level}단계 규격이 없다`);
  return spec;
}
const spec3 = specAt(3);
const spec5 = specAt(5);
const spec6 = specAt(6);
const spec8 = specAt(8);
const spec10 = specAt(10);

describe("카드 항목 힌트(새 꼴)", () => {
  it("AC-15p 3단계 카드 항목 턴은 한국어 뜻 → 영어 틀 → 영어 문장(듣기) 차례로 카드 힌트를 쓴다", () => {
    expect(
      lessonHintTiersOf({ spec: spec3, item, ai: undefined, askKind: "first" }),
    ).toEqual([
      { kind: "ko", text: "주말에 하는 일" },
      { kind: "frame", text: "I ___ on the weekend." },
      { kind: "sentence", text: "I play soccer.", listen: true },
    ]);
  });

  it("카드 항목 턴은 AI 힌트가 와도 카드 힌트를 쓴다", () => {
    const ai = {
      hintKo: "AI 뜻",
      hints: ["AI frame", "AI sentence"],
      usable: [],
    };
    expect(
      lessonHintTiersOf({ spec: spec3, item, ai, askKind: "first" })[0],
    ).toEqual({
      kind: "ko",
      text: "주말에 하는 일",
    });
  });

  it("이어 묻기 · 따라가기 · 꺼내기 턴(카드 항목 없음)은 AI 힌트, 걸렸거나 없으면 '힌트' 단추가 없다", () => {
    const ai = {
      hintKo: "AI 뜻",
      hints: ["AI frame ___.", "AI sentence."],
      usable: [],
    };
    expect(
      lessonHintTiersOf({ spec: spec3, item: null, ai, askKind: "re_ask" }),
    ).toEqual([
      { kind: "ko", text: "AI 뜻" },
      { kind: "frame", text: "AI frame ___." },
      { kind: "sentence", text: "AI sentence.", listen: true },
    ]);
    expect(
      lessonHintTiersOf({
        spec: spec3,
        item: null,
        ai: undefined,
        askKind: "re_ask",
      }),
    ).toEqual([]);
  });

  it("AC-15h 6단계 처음 묻는 턴의 첫 단은 AI 출력과 관계없이 영어 틀이고 다시 묻는 턴은 한국어 뜻 단부터, 8단계 두 번 누르면 뜻 다음 영어 틀, 10단계는 단추가 없다", () => {
    const six = {
      ...item,
      usablePhrases: ["play soccer", "go swimming", "read books"],
    };
    expect(
      lessonHintTiersOf({
        spec: spec6,
        item: six,
        // AI 출력과 관계없이(AC-15h): AI 가 뜻 단을 내도 카드 항목 턴의 첫 단은 카드 영어 틀이다
        ai: { hintKo: "AI 뜻", hints: ["AI frame ___."], usable: [] },
        askKind: "first",
      })[0],
    ).toEqual({
      kind: "frame",
      text: "I ___ on the weekend.",
      usable: ["play soccer", "go swimming"],
    });
    expect(
      lessonHintTiersOf({
        spec: spec6,
        item: six,
        ai: undefined,
        askKind: "re_ask",
      })[0],
    ).toEqual({
      kind: "ko",
      text: "주말에 하는 일",
    });
    // 8단계 다시 묻는 턴: '힌트'를 두 번 누르면 한국어 뜻 다음 영어 틀(AC-15h)
    const eight = lessonHintTiersOf({
      spec: spec8,
      item,
      ai: undefined,
      askKind: "re_ask",
    });
    expect(eight.map((t) => t.kind)).toEqual(["ko", "frame"]);
    expect(
      eight.slice(
        0,
        openedTierCount({ tiers: eight, pressed: 2, dontKnowCount: 0 }),
      ),
    ).toEqual([
      { kind: "ko", text: "주말에 하는 일" },
      { kind: "frame", text: "I ___ on the weekend." },
    ]);
    expect(
      lessonHintTiersOf({
        spec: spec10,
        item,
        ai: undefined,
        askKind: "re_ask",
      }),
    ).toEqual([]);
  });

  it("4단계부터 영어 문장 단에는 듣기 단추가 없고, 쓸 수 있는 말은 영어 틀 단과 함께 열린다", () => {
    const tiers = lessonHintTiersOf({
      spec: spec5,
      item: { ...item, usablePhrases: ["play soccer"] },
      ai: undefined,
      askKind: "first",
    });
    expect(tiers[1]).toEqual({
      kind: "frame",
      text: "I ___ on the weekend.",
      usable: ["play soccer"],
    });
    expect(tiers[2]).toEqual({ kind: "sentence", text: "I play soccer." });
  });
});

describe("한국어 설명 · 힌트 마지막 단(AC-15g 단위)", () => {
  it("AC-15g 1~4단계는 첫 막힘부터, 5단계부터는 둘째 막힘부터 한국어 설명을 보인다", () => {
    expect(
      koExplanationShownOf({
        spec: specAt(3),
        stuckInSlot: 1,
        cause: "button",
      }),
    ).toBe(true);
    expect(
      koExplanationShownOf({ spec: specAt(4), stuckInSlot: 1, cause: "stuck" }),
    ).toBe(true);
    expect(
      koExplanationShownOf({
        spec: specAt(5),
        stuckInSlot: 1,
        cause: "button",
      }),
    ).toBe(false);
    expect(
      koExplanationShownOf({
        spec: specAt(5),
        stuckInSlot: 2,
        cause: "button",
      }),
    ).toBe(true);
  });

  it("AC-15g 한국어 설명의 막힘 차례는 회화 단계 규격 칸 koExplainFromStuck 이다(1~4단계 1 · 5단계부터 2, C195)", () => {
    expect(REAL.map((s) => s.level)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    for (const spec of REAL)
      expect(spec.koExplainFromStuck, `${spec.level}단계`).toBe(
        spec.level <= 4 ? 1 : 2,
      );
    // 칸 없는 행(옛 판 단계 규격)은 단계 규격 스키마가 거부한다(필수 칸 — 묶음 12, '5-나' 재검토 N-2 의 좁혀 읽기가 여기서 닫힘)
    const { koExplainFromStuck: _k, ...old } = specAt(3);
    expect(TalkLevelSpecSchema.safeParse(old).success).toBe(false);
    expect(TalkLevelSpecSchema.safeParse(specAt(3)).success).toBe(true);
  });

  it("AC-15g 말로 답한 턴 · 들리지 않음에는 한국어 설명을 보이지 않는다", () => {
    expect(
      koExplanationShownOf({ spec: specAt(3), stuckInSlot: 0, cause: null }),
    ).toBe(false);
    expect(
      koExplanationShownOf({
        spec: specAt(3),
        stuckInSlot: 0,
        cause: "nospeech",
      }),
    ).toBe(false);
  });

  it("AC-15g 같은 질문 자리의 둘째 막힘부터 힌트가 마지막 단까지 열리고, 들리지 않음은 그 셈에 들지 않는다", () => {
    const tiers = lessonHintTiersOf({
      spec: spec3,
      item,
      ai: undefined,
      askKind: "first",
    });
    const stage1 = teacher("That's okay! Let's say it together.", {
      kind: "card_slot",
      why: "support",
      stage: 1,
      item: { kind: "required", no: 1 },
    });
    const args = (
      turns: Parameters<typeof talkLessonPositionOf>[0]["turns"],
    ) => ({
      spec: SPEC3,
      card: CARD3,
      newWords: NEW3,
      turns,
      segment: "talk" as const,
      settings: LOW,
      prepWords: CARD3.prep ?? [],
    });
    const once = talkLessonPositionOf(args([...opening3(), button(), stage1]));
    expect(
      openedTierCount({ tiers, pressed: 0, dontKnowCount: once.stuckInSlot }),
    ).toBe(0);
    const twice = talkLessonPositionOf(
      args([...opening3(), button(), stage1, button(), stage1]),
    );
    expect(
      openedTierCount({ tiers, pressed: 0, dontKnowCount: twice.stuckInSlot }),
    ).toBe(tiers.length);
    const silent = talkLessonPositionOf(args([...opening3(), noSpeech()]));
    expect(silent.stuckInSlot).toBe(0);
  });
});

describe("서버가 붙인 소리 줄을 들은 턴(힌트 종류 '영어')", () => {
  it("AC-15h 앞 선생님 행 move 의 같이 말하기 · 답 예시 · 따라 할 말은 답 예시, 선택지는 선택지 도움이다", () => {
    expect(
      heardHelpsOfMove(
        talkMoveOf({ kind: "card_slot", app: ["together", "answer_example"] }),
        SPEC3,
      ),
    ).toEqual(["answer_example"]);
    expect(
      heardHelpsOfMove(
        talkMoveOf({ kind: "card_slot", app: ["choices"] }),
        SPEC3,
      ),
    ).toEqual(["two_answers"]);
    expect(
      heardHelpsOfMove(talkMoveOf({ kind: "ai", ai: "model_line" }), SPEC3),
    ).toEqual(["answer_example"]);
    expect(
      heardHelpsOfMove(
        talkMoveOf({ kind: "ai", sound: { model: "I play soccer." } }),
        SPEC3,
      ),
    ).toEqual(["answer_example"]);
    // 꺼낸 턴(새 단어를 들려주고 한 번 따라 하게 함)도 따라 할 말을 들은 턴이다(02-2 180줄)
    expect(
      heardHelpsOfMove(talkMoveOf({ kind: "ai", intro: ["weekend"] }), SPEC3),
    ).toEqual(["answer_example"]);
    expect(
      heardHelpsOfMove(
        talkMoveOf({ kind: "card_slot", app: ["easy_question"] }),
        SPEC3,
      ),
    ).toEqual([]);
    expect(heardHelpsOfMove(null, SPEC3)).toEqual([]);
  });

  it("AC-15h 4단계부터 AI 가 말로 답을 준 차례(같이 말하기 · 닫기 · 들리지 않음)는 AI 의 support 값과 관계없이 답 예시를 들은 것이다", () => {
    for (const move of [
      talkMoveOf({ kind: "ai", stage: 1, cause: "button", ai: "none" }),
      talkMoveOf({ kind: "ai", stage: 3, cause: "stuck", ai: "none" }),
      talkMoveOf({ kind: "ai", cause: "nospeech", ai: "none" }),
    ])
      expect(heardHelpsOfMove(move, SPEC4)).toEqual(["answer_example"]);
    // 받침 둘째(쉬운 질문)는 답을 들려주지 않는다
    expect(
      heardHelpsOfMove(
        talkMoveOf({ kind: "ai", stage: 2, cause: "button" }),
        SPEC4,
      ),
    ).toEqual([]);
  });

  it("AC-15h 1~3단계 AI 차례는 서버가 붙인 소리 줄만 사실 기록이다(답 소리 줄이 비면 계획의 받침 단계로 답을 들었다고 보지 않음, '5-다' 검토 M-2)", () => {
    for (const move of [
      talkMoveOf({ kind: "ai", stage: 1, cause: "button", app: [] }),
      talkMoveOf({ kind: "ai", stage: 3, cause: "stuck", app: [] }),
      talkMoveOf({ kind: "ai", cause: "nospeech", app: [] }),
    ]) {
      expect(heardHelpsOfMove(move, SPEC3)).toEqual([]);
      // 같은 차례가 4단계부터면 AI 가 선생님 말 안에 답을 준 차례다
      expect(heardHelpsOfMove(move, SPEC4)).toEqual(["answer_example"]);
    }
    // 1~3단계 AI 차례라도 서버가 붙인 답 소리 줄이 있으면 답 예시를 들은 것이다
    expect(
      heardHelpsOfMove(
        talkMoveOf({
          kind: "ai",
          stage: 1,
          cause: "button",
          sound: { answer: "I play soccer." },
        }),
        SPEC3,
      ),
    ).toEqual(["answer_example"]);
  });

  it("AC-15h 1~3단계 카드 자리 차례는 서버가 붙인 소리 줄만 사실 기록이다(답 소리 줄 없이 닫은 자리는 들은 도움 없음, '5-나' 재검토 N-1)", () => {
    for (const move of [
      talkMoveOf({ kind: "card_slot", stage: 3, cause: "stuck", app: [] }),
      talkMoveOf({ kind: "card_slot", stage: 1, cause: "button", app: [] }),
      talkMoveOf({ kind: "card_slot", cause: "nospeech", app: [] }),
    ])
      expect(heardHelpsOfMove(move, SPEC3)).toEqual([]);
    // 같은 자리에 서버가 답 소리 줄을 붙였으면 답 예시를 들은 것이다
    expect(
      heardHelpsOfMove(
        talkMoveOf({
          kind: "card_slot",
          stage: 3,
          cause: "stuck",
          app: ["answer_example"],
        }),
        SPEC3,
      ),
    ).toEqual(["answer_example"]);
  });

  it("AC-15h 소리 줄을 들은 턴은 힌트를 열지 않아도 '영어'이고 '말했다'가 아니다", () => {
    const heard = heardHelpsOfMove(
      talkMoveOf({ kind: "card_slot", app: ["together", "answer_example"] }),
      SPEC3,
    );
    expect(hintKindOf({ opened: [], heard })).toBe("english");
    expect(heardHelpOf(heard)).toBe("answer_example");
    expect(
      saidWordsOf({
        aiWords: ["play"],
        heard: "I play soccer",
        hintKind: hintKindOf({ opened: [], heard }),
        unitWords: ["play", "soccer"],
        lemmaOf: () => undefined,
        homophones: [],
      }),
    ).toEqual([]);
    expect(
      hintKindOf({
        opened: [],
        heard: heardHelpsOfMove(talkMoveOf({ kind: "ai" }), SPEC3),
      }),
    ).toBe("none");
  });

  it("짧은 준비 · 바닥선 듣기 활동의 따라 말하기는 '말했다'에 넣지 않는다", () => {
    expect(countsAsSaid({ source: "prep", sessionKind: "regular" })).toBe(
      false,
    );
    expect(countsAsSaid({ source: "floor", sessionKind: "regular" })).toBe(
      false,
    );
    expect(countsAsSaid({ source: "turn", sessionKind: "regular" })).toBe(true);
  });
});
