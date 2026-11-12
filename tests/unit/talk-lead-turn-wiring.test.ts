// 서버 턴 길의 남은 배선 일곱(검토 rev-s1-2 N-3, spec AC-12 · 15절 AC-26l): lead-turn.ts 의 leadTeacherTurn 에 있던 DB 없는 판단 · 조립을 core
// lead-turn-core 의 순수 함수로 옮겼다(식 그대로 — 동작은 바꾸지 않음). 대본 도구(묶음 X2)가 서버와 같은 함수를 부르므로, 여기서 함수마다 갈래의
// 값을 지킨다. 표지 상수의 작은 모듈(N-5 (b))도 함께 본다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { LessonHintSpec } from "@/core/conversation/hints";
import { koExplanationShownOf } from "@/core/conversation/hints";
import * as tags from "@/core/conversation/lead-call-tags";
import { leadAiHintsOf, leadHintBlockOf } from "@/core/conversation/lead-hints";
import type { LeadLevelInput } from "@/core/conversation/lead-level";
import { leadKoLineOf } from "@/core/conversation/lead-low-band";
import { leadSaidWordsOf } from "@/core/conversation/lead-record";
import {
  LEAD_NARROW_RECORD_TAG,
  LEAD_RECORD_TAG,
  leadChildFieldsOf,
  leadChildStuckOf,
  leadExplanationOf,
  leadExtraOf,
  leadFailedMoveKindOf,
  leadFlowPrevStuckOf,
  leadHintsOf,
  leadSaidOf,
} from "@/core/conversation/lead-turn-core";
import { buildLexicon } from "@/core/seed/text";
import { SAMPLE_FORBIDDEN } from "../fixtures/ai/sample-inputs";

const sceneWords = new Set(["sea", "see", "beach"]);
const homophones = [["see", "sea"]];
const lemmaOf = (w: string) => w.toLowerCase().replace(/s$/, "");

describe("서버 턴 길의 남은 배선(검토 rev-s1-2 N-3 — 서버 턴 길과 대본 도구가 같은 함수를 부름)", () => {
  it("AC-26l 흘려 받는 동안 앞 아이 차례 막힘: 입구 차례는 거짓, 단추는 말소리 없음이 아닐 때 참, 말은 응답의 reading 으로 정한다(leadChildStuckOf)", () => {
    const base = {
      hasChild: true,
      mode: "speech" as const,
      nospeech: false,
      heard: "Um.",
      sceneWords,
      homophones,
    };
    expect(
      leadFlowPrevStuckOf({
        ...base,
        hasChild: false,
        reading: "does_not_know",
      }),
    ).toBe(false);
    expect(
      leadFlowPrevStuckOf({
        ...base,
        mode: "dont_know",
        heard: "",
        reading: undefined,
      }),
    ).toBe(true);
    expect(
      leadFlowPrevStuckOf({
        ...base,
        mode: "dont_know",
        nospeech: true,
        heard: "",
        reading: "does_not_know",
      }),
    ).toBe(false);
    for (const [reading, heard] of [
      ["does_not_know", "Um."],
      ["likely_misheard", "See."],
      ["nope", "Um."],
      [undefined, "Um."],
    ] as const)
      expect(leadFlowPrevStuckOf({ ...base, heard, reading })).toBe(
        leadChildStuckOf({
          reading,
          mode: "speech",
          heard,
          sceneWords,
          homophones,
        }),
      );
    expect(leadFlowPrevStuckOf({ ...base, reading: "does_not_know" })).toBe(
      true,
    );
  });

  it("AC-26l 응답이 없는 차례의 선생님 행 kind: 마무리 차례 closing_slot → 입구 start first_question → 그 밖 ai", () => {
    expect(leadFailedMoveKindOf({ closing: true, open: "start" })).toBe(
      "closing_slot",
    );
    expect(leadFailedMoveKindOf({ closing: true, open: null })).toBe(
      "closing_slot",
    );
    expect(leadFailedMoveKindOf({ closing: false, open: "start" })).toBe(
      "first_question",
    );
    expect(leadFailedMoveKindOf({ closing: false, open: "more" })).toBe("ai");
    expect(leadFailedMoveKindOf({ closing: false, open: null })).toBe("ai");
  });

  describe("힌트 재료 고르기", () => {
    const range: LeadLevelInput = {
      level: 3,
      range: {
        sentenceMaxWords: 7,
        allowedWords: new Set(["i", "see", "the", "sea", "like"]),
        unitWords: ["sea", "beach"],
        childWords: [],
        teacherName: "Mina",
        lemmaOf,
        forms: [],
        allowedForms: new Set(),
      },
      forms: [],
      lexicon: buildLexicon([
        { word: "see", pos: ["verb"], level: 1, forms: ["sees"] },
        { word: "sea", pos: ["noun"], level: 1, forms: ["seas"] },
      ]),
      promptLines: [],
    };
    const check = { forbidden: SAMPLE_FORBIDDEN, sentenceMaxWords: 7 };
    const spec: Pick<LessonHintSpec, "band" | "hintTiers"> = {
      band: "1-3",
      hintTiers: ["ko", "frame", "sentence"],
    };
    const common = { check, spec, unitWords: ["sea", "beach"], lemmaOf };
    /** 옮기기 전 lead-turn.ts 의 식(비교 기준). */
    const formerOf = (
      output: { hint_ko: string; hint_en: string },
      levelInput: LeadLevelInput | null,
    ) => {
      const bothHints =
        output.hint_ko.trim() !== "" && output.hint_en.trim() !== "";
      const hintBlock =
        levelInput !== null && bothHints
          ? leadHintBlockOf({ output, check, range: levelInput })
          : null;
      const aiHints =
        levelInput === null || hintBlock !== null
          ? undefined
          : leadAiHintsOf({
              hintKo: output.hint_ko,
              hintEn: output.hint_en,
              spec,
              unitWords: common.unitWords,
              lemmaOf,
            });
      return { hintBlock, aiHints };
    };
    const passing = { hint_ko: "바다가 보여.", hint_en: "I see the sea." };
    const offensive = {
      hint_ko: "바다가 보여.",
      hint_en: "The sea is stupid.",
    };
    const koEmpty = { hint_ko: "", hint_en: "I see the sea." };
    const enEmpty = { hint_ko: "바다가 보여.", hint_en: "" };
    const cases = [passing, offensive, koEmpty, enEmpty];

    it("AC-26j 범위를 읽은 차례: 두 칸이 다 있고 검사를 지나면 힌트 단 재료, 걸리면 걸린 까닭만, 한 칸이 비면 검사 없이 재료 함수의 값(빈 칸이면 없음)", () => {
      const pass = leadHintsOf({ ...common, output: passing, range });
      expect(pass.hintBlock).toBeNull();
      expect(pass.aiHints).toEqual(
        leadAiHintsOf({
          hintKo: "바다가 보여.",
          hintEn: "I see the sea.",
          spec,
          unitWords: common.unitWords,
          lemmaOf,
        }),
      );
      expect(pass.aiHints).toBeDefined();
      const blocked = leadHintsOf({ ...common, output: offensive, range });
      expect(blocked).toEqual({
        hintBlock: { kind: "output_check", paths: ["hint_en"] },
        aiHints: undefined,
      });
      expect(leadHintsOf({ ...common, output: koEmpty, range })).toEqual({
        hintBlock: null,
        aiHints: undefined,
      });
      for (const output of cases)
        expect(leadHintsOf({ ...common, output, range })).toEqual(
          formerOf(output, range),
        );
    });

    it("AC-26j 범위를 못 읽은 차례는 검사도 재료도 없다(힌트 단추 없음)", () => {
      for (const output of cases) {
        expect(leadHintsOf({ ...common, output, range: null })).toEqual({
          hintBlock: null,
          aiHints: undefined,
        });
        expect(leadHintsOf({ ...common, output, range: null })).toEqual(
          formerOf(output, null),
        );
      }
    });
  });

  it("AC-26l move.lead 기록 칸 조립: 빈 값은 칸을 두지 않고, wide 는 수 값 칸만 남긴다", () => {
    expect(
      leadExtraOf({
        narrow: undefined,
        wide: null,
        gate: [],
        closingAdded: false,
        removed: [],
        soundMoved: false,
      }),
    ).toEqual({});
    const narrow = { item: "form", retry: "accepted", again: false, ms: 120 };
    const extra = leadExtraOf({
      narrow,
      wide: { offband: 2, forms: undefined, questionsHit: 0 },
      gate: ["held_say"],
      closingAdded: true,
      removed: ["I like apples."],
      soundMoved: true,
    });
    expect(extra).toEqual({
      narrow,
      wide: { offband: 2, questionsHit: 0 },
      gate: ["held_say"],
      closingAdded: true,
      removed: ["I like apples."],
      soundMoved: true,
    });
    expect(Object.keys(extra)).toEqual([
      "narrow",
      "wide",
      "gate",
      "closingAdded",
      "removed",
      "soundMoved",
    ]);
    // wide 가 비어 있어도(읽었지만 걸린 것 없음) 빈 칸을 둔다 — 옮기기 전 식 그대로
    expect(
      leadExtraOf({
        narrow: undefined,
        wide: {},
        gate: [],
        closingAdded: false,
        removed: [],
        soundMoved: false,
      }),
    ).toEqual({ wide: {} });
  });

  it("AC-26i 막힌 뒤 한국어 뜻: 아이 말 차례이고 지금 판정(koExplanationShownOf)이 보일 때만 hint_ko 를 1~3단계 거르개에 지나 싣는다", () => {
    const spec = { koExplainFromStuck: 1 };
    const button = {
      input: "dont_know" as const,
      stuck: false,
      nospeech: false,
    };
    const hintKo = '맞아, 해가 밝지! "I see the sun."이라고 말해 봐.';
    let read = 0;
    const slot = (n: number) => () => {
      read += 1;
      return n;
    };
    expect(
      leadExplanationOf({
        child: null,
        stuckInSlot: slot(3),
        spec,
        level: 3,
        hintKo,
      }),
    ).toBeNull();
    expect(read).toBe(0);
    const shown = leadExplanationOf({
      child: button,
      stuckInSlot: slot(1),
      spec,
      level: 3,
      hintKo,
    });
    expect(shown).toBe(leadKoLineOf(3, hintKo));
    expect(shown).not.toContain("I see");
    // 같은 자리 막힘 수가 모자라면 · 말로 답한 막힘 아님 · 말소리 없음은 보이지 않는다
    expect(
      leadExplanationOf({
        child: button,
        stuckInSlot: slot(0),
        spec,
        level: 3,
        hintKo,
      }),
    ).toBeNull();
    expect(
      koExplanationShownOf({ spec, stuckInSlot: 0, cause: "button" }),
    ).toBe(false);
    expect(
      leadExplanationOf({
        child: { input: "speech", stuck: false, nospeech: false },
        stuckInSlot: slot(5),
        spec,
        level: 3,
        hintKo,
      }),
    ).toBeNull();
    expect(
      leadExplanationOf({
        child: { input: "dont_know", stuck: false, nospeech: true },
        stuckInSlot: slot(5),
        spec,
        level: 3,
        hintKo,
      }),
    ).toBeNull();
    expect(
      leadExplanationOf({
        child: { input: "speech", stuck: true, nospeech: false },
        stuckInSlot: slot(1),
        spec,
        level: 5,
        hintKo: "바다를 봐.",
      }),
    ).toBe("바다를 봐.");
    // 거른 뒤 빈 뜻은 싣지 않는다
    expect(
      leadExplanationOf({
        child: button,
        stuckInSlot: slot(1),
        spec,
        level: 3,
        hintKo: "  ",
      }),
    ).toBeNull();
  });

  it("AC-26e '말했다'와 되묻기 표지: 되묻기는 아이 말 차례에서 move ask_again 일 때만, '말했다'는 힌트 값이 있을 때 leadSaidWordsOf 그대로(되물은 차례는 빈 목록)", () => {
    const base = {
      hasChild: true,
      move: "react_and_follow_up" as const,
      help: { hintKind: "none" as const, hintLevel: 0, heardHelp: null },
      candidates: ["sea"],
      heard: "I see the sea.",
      speech: true,
      stuck: false,
      unitWords: ["sea", "beach"],
      lemmaOf,
      homophones,
    };
    const said = leadSaidOf(base);
    expect(said.askAgain).toBe(false);
    expect(said.said).toEqual(
      leadSaidWordsOf({
        candidates: base.candidates,
        heard: base.heard,
        hintKind: "none",
        speech: true,
        stuck: false,
        askAgain: false,
        unitWords: base.unitWords,
        lemmaOf,
        homophones,
      }),
    );
    expect(said.said).toEqual(["sea"]);
    expect(leadSaidOf({ ...base, move: "ask_again" })).toEqual({
      askAgain: true,
      said: [],
    });
    expect(
      leadSaidOf({ ...base, hasChild: false, move: "ask_again", help: null }),
    ).toEqual({ askAgain: false, said: [] });
    expect(leadSaidOf({ ...base, help: null })).toEqual({
      askAgain: false,
      said: [],
    });
  });

  it("AC-26e 아이 행에 고쳐 쓸 칸: 스스로 쓴 낱말은 말 입력만, 막힘이면 들린 글, 되묻기 표지 · 힌트 하한 칸은 있을 때만", () => {
    const base = {
      speech: true,
      childUsedOnOwn: ["sea"],
      said: ["sea"],
      stuck: false,
      heard: "I see the sea.",
      sentUserMessage: "Child: I see the sea.",
      askAgain: false,
      helpFields: {},
    };
    const fields = leadChildFieldsOf(base);
    expect(fields).toEqual({
      selfUsedWords: ["sea"],
      saidWords: ["sea"],
      stuckPhrase: null,
      sentUserMessage: "Child: I see the sea.",
    });
    expect(fields.selfUsedWords).not.toBe(base.childUsedOnOwn);
    expect(fields.saidWords).toBe(base.said);
    expect(
      leadChildFieldsOf({
        ...base,
        speech: false,
        stuck: true,
        askAgain: true,
        helpFields: { hintKind: "english" as const, hintLevel: 2 },
      }),
    ).toEqual({
      selfUsedWords: [],
      saidWords: ["sea"],
      stuckPhrase: "I see the sea.",
      sentUserMessage: "Child: I see the sea.",
      askAgain: true,
      hintKind: "english",
      hintLevel: 2,
    });
    // 응답이 없는 차례(실패 길)는 후보 · '말했다' · 막힘 없이 부른다 — 옮기기 전 칸 그대로
    expect(
      leadChildFieldsOf({
        ...base,
        childUsedOnOwn: [],
        said: [],
        helpFields: { heardHelp: "answer_example" as const },
      }),
    ).toEqual({
      selfUsedWords: [],
      saidWords: [],
      stuckPhrase: null,
      sentUserMessage: "Child: I see the sea.",
      heardHelp: "answer_example",
    });
  });

  it("AC-26a 호출 기록 표지 상수는 작은 모듈에 있고 lead-turn-core 가 같은 값을 다시 내보낸다(store.ts 는 작은 모듈만 불러옴 — 검토 rev-s1-2 N-5)", () => {
    expect(tags.LEAD_RECORD_TAG).toBe("lead");
    expect(tags.LEAD_NARROW_RECORD_TAG).toBe("lead.narrow");
    expect(LEAD_RECORD_TAG).toBe(tags.LEAD_RECORD_TAG);
    expect(LEAD_NARROW_RECORD_TAG).toBe(tags.LEAD_NARROW_RECORD_TAG);
    expect(Object.keys(tags).sort()).toEqual([
      "LEAD_NARROW_RECORD_TAG",
      "LEAD_RECORD_TAG",
    ]);
  });

  it("AC-26l 서버는 move 소리 줄 맞추기를 core 의 leadMoveWithSound 로 부르고 제 사본을 두지 않는다(검토 rev-s1-3 O-2)", () => {
    const src = readFileSync(
      join(process.cwd(), "src/server/conversation/lead-turn.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/function withSound\b/);
    expect(src).not.toMatch(/\bwithSound\(/);
    expect(src.match(/\bleadMoveWithSound\(/g)?.length ?? 0).toBe(2);
  });

  it("AC-26c 입구가 시작해 넘기는 단계 맥락 약속에는 아이 차례 길처럼 거절 받개를 단다(기다리지 않고 끝나는 길에서 처리되지 않은 거절이 없게 — 검토 rev-s1-3 O-1)", () => {
    const src = readFileSync(
      join(process.cwd(), "src/server/conversation/lead-turn.ts"),
      "utf8",
    );
    const started = [
      ...src.matchAll(/const (\w+) = levelContextOf\([\s\S]*?\);/g),
    ];
    expect(started.length).toBeGreaterThan(0);
    for (const m of started) {
      const after = src.slice((m.index ?? 0) + m[0].length).trimStart();
      expect(after.startsWith(`${m[1]}.catch(() => {});`)).toBe(true);
    }
  });
});
