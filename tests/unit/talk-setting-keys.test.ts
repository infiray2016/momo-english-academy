// 회화 턴 설정 키 짝 시험(회화 AI 몫 넓힘 묶음 0-가 · 장부 T-157 막기): 회화 턴 호출 규격과 턴 입구(turnSettings)가 읽는 키가
// 모두 seed/settings.json · TEST_SETTINGS 에 있고 그 규격을 지난다. 새 키 talk.self_line_every_turns · talk.greeting_recall(12절,
// C211 (1)) 의 시드 값과 1~3단계 effort low(AC-7)를 본다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CallSettingError } from "@/core/ai/calls/common";
import {
  TALK_PROMPT_SETTING_SCHEMAS,
  talkLessonRulesOf,
  talkLessonTurnSpec,
} from "@/core/ai/calls/talk-lesson";
import { turnSettings } from "@/server/conversation/turn";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";

const seed = JSON.parse(
  readFileSync(join(process.cwd(), "seed/settings.json"), "utf8"),
) as { settings: { key: string; value: unknown }[] };
const seedValues: Record<string, unknown> = Object.fromEntries(
  seed.settings.map((s) => [s.key, s.value]),
);
const testValues = testSettingValues();
const NEW_KEYS = ["talk.self_line_every_turns", "talk.greeting_recall"];

describe("회화 턴 설정 키 짝(T-157)", () => {
  const schemas = {
    ...talkLessonTurnSpec.settingSchemas,
    ...turnSettings,
  } as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

  it("회화 턴 호출 규격 ∪ turnSettings 의 키는 모두 seed/settings.json 과 TEST_SETTINGS 에 있고 규격을 지난다", () => {
    for (const [key, schema] of Object.entries(schemas)) {
      expect(seedValues, `seed/settings.json 에 ${key}`).toHaveProperty([key]);
      expect(schema.safeParse(seedValues[key]).success, `seed ${key}`).toBe(
        true,
      );
      expect(TEST_SETTINGS, `TEST_SETTINGS 에 ${key}`).toHaveProperty([key]);
      expect(schema.safeParse(testValues[key]).success, `test ${key}`).toBe(
        true,
      );
    }
  });

  it("새 키 둘은 호출 규격과 턴 입구에 함께 있다(빠지면 턴 입구의 SettingMissingError 로 드러남)", () => {
    expect(Object.keys(TALK_PROMPT_SETTING_SCHEMAS).sort()).toEqual(
      [...NEW_KEYS].sort(),
    );
    for (const key of NEW_KEYS) {
      expect(Object.keys(talkLessonTurnSpec.settingSchemas)).toContain(key);
      expect(Object.keys(turnSettings)).toContain(key);
    }
  });

  it("시드 값으로 selfLineEvery 3 · greetingRecall 거짓이고, TEST_SETTINGS 도 같다", () => {
    for (const values of [seedValues, testValues]) {
      const rules = talkLessonRulesOf(values, { level: 3 });
      expect(rules.selfLineEvery).toBe(3);
      expect(rules.greetingRecall).toBe(false);
    }
  });

  it("talk.greeting_recall 은 'on' 이면 참이고, 꼴 밖 값 · 빠진 키는 던진다", () => {
    expect(
      talkLessonRulesOf(
        { ...testValues, "talk.greeting_recall": "on" },
        { level: 2 },
      ).greetingRecall,
    ).toBe(true);
    expect(() =>
      talkLessonRulesOf(
        { ...testValues, "talk.greeting_recall": true },
        { level: 2 },
      ),
    ).toThrow(CallSettingError);
    const { "talk.greeting_recall": _g, ...noRecall } = testValues;
    expect(() => talkLessonRulesOf(noRecall, { level: 2 })).toThrow(
      CallSettingError,
    );
  });

  it("talk.self_line_every_turns 는 1 이상 정수이고, 0 · 소수 · 빠진 키는 던진다", () => {
    expect(
      talkLessonRulesOf(
        { ...testValues, "talk.self_line_every_turns": 5 },
        { level: 1 },
      ).selfLineEvery,
    ).toBe(5);
    for (const bad of [0, 2.5, "3"]) {
      expect(() =>
        talkLessonRulesOf(
          { ...testValues, "talk.self_line_every_turns": bad },
          { level: 1 },
        ),
      ).toThrow(CallSettingError);
    }
    const { "talk.self_line_every_turns": _s, ...noSelf } = testValues;
    expect(() => talkLessonRulesOf(noSelf, { level: 1 })).toThrow(
      CallSettingError,
    );
  });

  it("1~3단계 회화 턴 effort 는 시드 · 시험용 설정 모두 low 다(AC-7, medium 은 요청자가 따로 정함)", () => {
    expect(seedValues["ai.effort.talk_turn.1-3"]).toBe("low");
    expect(testValues["ai.effort.talk_turn.1-3"]).toBe("low");
  });
});
