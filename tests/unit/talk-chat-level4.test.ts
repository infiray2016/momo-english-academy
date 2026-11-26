// 회화 4단계 단원 1 을 이야기 방식으로 여는 재료(13절 C254 · 분석 task-ana-talk4-ready-report.md 2.3 S1 ~ S3). 수업을 여는 판단(설정 · 구간 ·
// 단원 재료 · 선생님 재료), 4단계 안내문 · 힌트 호출 조립(시드 값), 4단계 화면 규칙(따라 할 문장은 글에 남김 · 힌트 단 · 뜻 줄)의 순수 함수 몫을
// 본다. 카드는 아직 생성 전이라 분석가가 만든 예시 카드 사본(생성 브리프 12절 예시 — tests/fixtures/talk-lesson-4-1-example.json)을 견본으로 쓴다.
// 실제 AI 를 부르지 않는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type TalkChatInput,
  talkChatRulesOf,
  talkChatSystem,
  talkChatTopicOf,
} from "@/core/ai/calls/talk-chat";
import { talkChatHintRulesOf } from "@/core/ai/calls/talk-chat-hint";
import { talkLeadTextOf } from "@/core/ai/calls/talk-lead";
import { chatHintTiersOf } from "@/core/conversation/chat-hints";
import { chatListenLiteralOf } from "@/core/conversation/chat-reply";
import { lessonStartModeOf } from "@/core/conversation/chat-start";
import { chatCardGreetingLineOf } from "@/core/conversation/chat-turn-plan";
import type { LessonHintSpec } from "@/core/conversation/hints";
import {
  isChatSession,
  isLeadSession,
  leadModeStartField,
} from "@/core/conversation/lead-mode";
import { chatMaterialOf } from "@/core/teacher/roster";
import { rosterOf } from "@/server/teacher";
import { testSettingValues } from "../fixtures/settings";

const ROOT = process.cwd();
const readJson = (path: string) =>
  JSON.parse(readFileSync(join(ROOT, path), "utf8"));

type LevelSpecRow = LessonHintSpec & {
  area: string;
  level: number;
  koMeaning: boolean;
  sentenceMaxWords: number;
};
const LEVEL_SPECS = readJson("seed/level-specs.json")
  .levelSpecs as LevelSpecRow[];
const talkSpec = (level: number): LevelSpecRow => {
  const row = LEVEL_SPECS.find((s) => s.area === "talk" && s.level === level);
  if (!row) throw new Error(`시드에 회화 ${level}단계 규격이 없다`);
  return row;
};
const UNIT_4_1 = (
  readJson("seed/unit-specs.json").unitSpecs as {
    area: string;
    level: number;
    unit: number;
    words: string[];
  }[]
).find((u) => u.area === "talk" && u.level === 4 && u.unit === 1);
/** 분석가가 만든 4단계 단원 1 예시 카드(생성 브리프 12절 예시의 사본 — 정규 시드 아님). */
const EXAMPLE = readJson("tests/fixtures/talk-lesson-4-1-example.json") as {
  unitWords: string[];
  card: {
    greetingTurns: number;
    greeting: { firstLine: { en: string; ko: string } };
    prep?: unknown;
  };
};
const values = testSettingValues();
const roster = rosterOf();
const teacherOf = (key: string) => {
  const found = roster.find((t) => t.key === key);
  if (!found) throw new Error(`시드 명단에 ${key} 가 없다`);
  return found;
};

describe("회화 4단계 단원 1 을 여는 방식(13절 C254 (2) · (3))", () => {
  it("AC-27a 설정 chat · 시드 선생님(미나 · 리오)이면 회화 4단계 단원 1 은 이야기 방식으로 열리고 처음 스냅숏에 chat 을 적는다", () => {
    for (const key of ["mina", "leo"]) {
      const teacher = teacherOf(key);
      expect(chatMaterialOf(teacher), key).not.toBeNull();
      const mode = lessonStartModeOf({
        mode: "chat",
        level: 4,
        unit: 1,
        teacher,
      });
      expect(mode, key).toBe("chat");
      const start = leadModeStartField(mode);
      expect(start).toEqual({ leadMode: "chat" });
      expect(isChatSession({ start, level: 4 })).toBe(true);
      expect(isLeadSession({ start, level: 4 })).toBe(false);
    }
  });

  it("AC-27a 재료가 없는 회화 4 · 5단계 단원은 설정이 chat 이어도 기존 방식이다", () => {
    const teacher = teacherOf("mina");
    const opened: string[] = [];
    for (const level of [4, 5])
      for (let unit = 1; unit <= 5; unit++)
        if (
          lessonStartModeOf({ mode: "chat", level, unit, teacher }) === "chat"
        )
          opened.push(`${level}-${unit}`);
    expect(opened).toEqual(["4-1"]);
  });

  it("AC-26a 설정이 claude 면 회화 4단계는 단원 1 도 기존 방식이고, 새 방식의 표 읽기는 그대로다(4단계 단원 1 에 새 방식 글 없음)", () => {
    const teacher = teacherOf("mina");
    for (let unit = 1; unit <= 5; unit++) {
      expect(
        lessonStartModeOf({ mode: "claude", level: 4, unit, teacher }),
      ).toBe("app");
      expect(lessonStartModeOf({ mode: "app", level: 4, unit, teacher })).toBe(
        "app",
      );
    }
    expect(talkLeadTextOf(4, 1)).toBeNull();
    // 새 방식이 4단계 스냅숏을 받아도(있을 수 없는 길) 새 방식 세션이 아니다 — 구간은 1~3단계 그대로
    expect(isLeadSession({ start: { leadMode: "claude" }, level: 4 })).toBe(
      false,
    );
  });
});

describe("회화 4단계 단원 1 의 이야기 방식 호출 조립(시드 값 — 실제 호출 없음)", () => {
  const mina = teacherOf("mina");
  const material = chatMaterialOf(mina);
  const input = (level: number, topicEn: string): TalkChatInput => {
    if (!UNIT_4_1) throw new Error("시드에 회화 4단계 단원 1 규격이 없다");
    if (!material) throw new Error("미나의 이야기 방식 재료가 없다");
    return {
      level,
      unitWords: UNIT_4_1.words,
      teacher: {
        nameEn: mina.nameEn,
        chatPersonaEn: material.personaEn,
        chatFavoritesEn: material.favoritesEn,
      },
      topicEn,
      history: [],
      message: {
        facts: [],
        input: {
          kind: "start",
          clock: { weekday: "Friday", dayPart: "afternoon" },
          met: 0,
        },
      },
    };
  };

  it("AC-27b 4단계 안내문은 주제 'friends and what people do' · 단원 단어(단원 규격) · talk.chat_turn_words.4-6 으로 조립되고, 자리 값 밖의 글은 3단계와 글자까지 같다(프롬프트 글을 더하지 않음)", () => {
    const topic = talkChatTopicOf(4, 1);
    expect(topic).toBe("friends and what people do");
    const rules4 = talkChatRulesOf(values, { level: 4 });
    expect(rules4).toEqual({ turnWords: values["talk.chat_turn_words.4-6"] });
    const system4 = talkChatSystem(input(4, topic ?? ""), rules4);
    expect(system4).toContain("friends and what people do");
    expect(system4).toContain("singer");
    expect(system4).toContain(`about ${rules4.turnWords} words in all`);
    // 같은 자리 값으로 3단계 규칙(1-3 키, 같은 값 12)을 쓰면 글자까지 같다 — 단계마다 다른 글이 들지 않는다
    const system3 = talkChatSystem(
      input(3, topic ?? ""),
      talkChatRulesOf(values, { level: 3 }),
    );
    expect(system4).toBe(system3);
  });

  it("AC-27g 4단계 힌트 호출의 규칙을 읽고, 힌트 단은 단계 규격 4단계(뜻 → 영어 틀 → 영어 문장)이며 뜻 단의 영어 문장을 거르지 않고 영어 문장 단에 듣기 단추가 없다", () => {
    expect(() => talkChatHintRulesOf(values, { level: 4 })).not.toThrow();
    const lemmaOf = (s: string) => s.toLowerCase();
    const output = {
      hint_ko: "내 친구는 가수야. My friend is a singer.",
      hint_en: "My friend is a singer.",
      explain_ko: "",
    };
    const unitWords = UNIT_4_1?.words ?? [];
    const four = chatHintTiersOf({
      output,
      spec: talkSpec(4),
      unitWords,
      lemmaOf,
    });
    expect(talkSpec(4).hintTiers).toEqual(["ko", "frame", "sentence"]);
    expect(four.map((t) => t.kind)).toEqual(["ko", "frame", "sentence"]);
    expect(four[0]?.text).toBe("내 친구는 가수야. My friend is a singer.");
    expect(four[1]?.text).toContain("My friend is a ");
    expect(four[1]?.text).not.toContain("singer");
    expect(four[2]).toEqual({
      kind: "sentence",
      text: "My friend is a singer.",
    });
    expect(four.some((t) => t.listen === true)).toBe(false);
    // 3단계(1~3단계 꼴)는 뜻 단의 영어 문장을 거르고 문장 단에 듣기 단추가 붙는다 — 4단계 규칙이 다름을 맞대 본다
    const three = chatHintTiersOf({
      output,
      spec: talkSpec(3),
      unitWords,
      lemmaOf,
    });
    expect(three[0]?.text).toBe("내 친구는 가수야.");
    expect(three.at(-1)?.listen).toBe(true);
  });

  it("AC-27f 4단계는 따라 할 문장을 글에서 빼지 않고(소리 줄 없음 — 정본 02-2 따라 할 문장 · chat-reply), 뜻 줄을 보이는 단계다(단계 규격 koMeaning)", () => {
    const say = "My friend is a singer. Can you say it? My friend is a singer.";
    expect(chatListenLiteralOf(say, "My friend is a singer.", 4)).toBeNull();
    expect(
      chatListenLiteralOf(say, "My friend is a singer.", 3),
    ).not.toBeNull();
    expect(talkSpec(4).koMeaning).toBe(true);
    expect(talkSpec(5).koMeaning).toBe(false);
  });

  it("AC-27e 예시 카드(생성 브리프 12절)는 인사가 선생님 첫 말 하나이고 짧은 준비가 없어, 첫 말 호출이 실패하면 그 첫 말을 쓴다", () => {
    expect(EXAMPLE.card.greetingTurns).toBe(1);
    expect(EXAMPLE.card.prep ?? null).toBeNull();
    expect(values["talk.prep_mode.4-6"]).toBe("when_needed");
    expect(chatCardGreetingLineOf(EXAMPLE.card)).toEqual(
      EXAMPLE.card.greeting.firstLine,
    );
    // 예시 카드의 단원 단어는 단원 규격 4단계 단원 1 의 단어 안이다(이야기 방식 호출의 단원 단어는 단원 규격에서 온다)
    for (const word of EXAMPLE.unitWords)
      expect(UNIT_4_1?.words, word).toContain(word);
  });
});
