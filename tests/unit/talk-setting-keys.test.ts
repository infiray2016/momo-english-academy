// 회화 턴 설정 키 짝 시험(회화 AI 몫 넓힘 묶음 0-가 · 장부 T-157 막기): 회화 턴 호출 규격과 턴 입구(turnSettings)가 읽는 키가
// 모두 seed/settings.json · TEST_SETTINGS 에 있고 그 규격을 지난다. 새 키 talk.self_line_every_turns · talk.greeting_recall(12절,
// C211 (1)) 의 시드 값과 1~3단계 effort low(AC-7)를 본다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CallSettingError } from "@/core/ai/calls/common";
import {
  TALK_KO_HELP_TITLE,
  talkKoHelpPiece,
  talkKoHelpSpec,
} from "@/core/ai/calls/talk-ko-help";
import {
  TALK_PROMPT_SETTING_SCHEMAS,
  talkLessonRulesOf,
  talkLessonTurnSpec,
} from "@/core/ai/calls/talk-lesson";
import {
  KO_ASK_CONTEXT_TURNS_KEY,
  KO_ASK_MODE_KEY,
  KO_ASK_REPLY_MAX_CHARS_KEY,
  KO_ASK_SETTING_KEYS,
  koAskContextTurnsFrom,
  koAskModeFrom,
  koAskSettingsFrom,
} from "@/core/conversation/ko-ask";
import { talkLessonSettingsFrom } from "@/core/conversation/lesson-turns";
import { SPEECH_SETTING_KEYS } from "@/core/speech/listen";
import { turnSettings } from "@/server/conversation/turn";
import {
  TALK_KO_HELP_PURPOSE,
  talkKoHelpBody,
  talkKoHelpRule,
} from "../fixtures/ai/fake-anthropic";
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

describe("되묻기 상한 talk.ask_again_max(회화 내용 고침 2 묶음 2-0 — 13절 C218 · 'C218 · C222 보완 2' (3), 12절 09:90)", () => {
  const KEY = "talk.ask_again_max";
  const settingsWith = (value: unknown) =>
    talkLessonSettingsFrom(
      (key) => (key === KEY ? value : testValues[key]),
      "1-3",
    );

  it("턴 입구 설정 목록(turnSettings)에 있고(빠지면 턴 입구에서 드러남, T-157) 시드 · 시험 설정 값은 1 이다", () => {
    expect(Object.keys(turnSettings)).toContain(KEY);
    expect(seedValues[KEY]).toBe(1);
    expect(testValues[KEY]).toBe(1);
    const row = (
      seed.settings as {
        key: string;
        scope?: string;
        changeVia?: string;
      }[]
    ).find((s) => s.key === KEY);
    expect(row).toMatchObject({
      scope: "household",
      changeVia: "decision-first",
    });
  });

  it("회화 수업 흐름 설정이 askAgainMax 로 읽는다: 시드 · 시험 설정은 1, 구간과 관계없이 같은 값이다", () => {
    for (const values of [seedValues, testValues])
      for (const band of ["1-3", "4-6", "7-9", "10-12"] as const)
        expect(
          talkLessonSettingsFrom((key) => values[key], band).askAgainMax,
          band,
        ).toBe(1);
  });

  it("0 이상 정수다: 0 은 끔(되묻지 않음)이고, 음수 · 소수 · 글 · 빠진 키는 던진다(조용한 기본값 없음)", () => {
    expect(settingsWith(0).askAgainMax).toBe(0);
    expect(settingsWith(2).askAgainMax).toBe(2);
    for (const bad of [-1, 1.5, "1", null, undefined, true])
      expect(() => settingsWith(bad), String(bad)).toThrow(KEY);
  });
});

// ── 수업 안 한국어로 묻기 묶음 4-가(spec 판 3 설계 7 · plan '새 설정 키와 마이그레이션' · 13절 C225 (6)) ──────────────

/** 새 키 아홉의 12절 기본값 · 바꾸는 곳(spec 설계 7 표 그대로, 잠정). 이 표가 시험의 기준이다. */
const KO_ASK_KEYS: readonly {
  key: string;
  value: unknown;
  changeVia: string;
}[] = [
  { key: "talk.ko_ask_mode", value: "on", changeVia: "seed" },
  { key: "speech.lang_ko", value: "ko-KR", changeVia: "seed" },
  {
    key: "speech.end_silence_seconds.ko_ask",
    value: 2.5,
    changeVia: "advanced",
  },
  { key: "talk.ko_ask_confirm_seconds", value: 3, changeVia: "advanced" },
  { key: "talk.ko_ask_sound_pause_ms", value: 1500, changeVia: "advanced" },
  { key: "talk.ko_ask_fail_hide_after", value: 3, changeVia: "advanced" },
  { key: "talk.ko_ask_context_turns", value: 4, changeVia: "advanced" },
  { key: "talk.ko_ask_reply_max_chars", value: 80, changeVia: "advanced" },
  { key: "ai.max_tokens.talk_ko_help", value: 1000, changeVia: "advanced" },
];
const koSpec = (key: string) => {
  const row = KO_ASK_KEYS.find((k) => k.key === key);
  if (!row) throw new Error(`표에 없는 키 ${key}`);
  return row.value;
};
/** 화면 자료(접점 라 koAsk)가 읽는 여섯. */
const KO_VIEW_KEYS = [
  "talk.ko_ask_mode",
  "speech.lang_ko",
  "speech.end_silence_seconds.ko_ask",
  "talk.ko_ask_confirm_seconds",
  "talk.ko_ask_sound_pause_ms",
  "talk.ko_ask_fail_hide_after",
];
const MS_PER_SECOND = 1000;
const readOf =
  (values: Record<string, unknown>, overrides: Record<string, unknown> = {}) =>
  (key: string) =>
    key in overrides ? overrides[key] : values[key];

describe("AC-25m 한국어로 묻기 설정 키 아홉(spec 설계 7 · C225 (6))", () => {
  const rows = seed.settings as {
    key: string;
    scope: string;
    value: unknown;
    changeVia: string;
  }[];

  it("AC-25m 키 아홉은 seed/settings.json 과 TEST_SETTINGS 에 집 전체 범위 · spec 기본값 · 바꾸는 곳 그대로 있다", () => {
    expect(KO_ASK_KEYS).toHaveLength(9);
    for (const { key, value, changeVia } of KO_ASK_KEYS) {
      const row = rows.find((r) => r.key === key);
      expect(row, `seed/settings.json 에 ${key}`).toBeDefined();
      expect(row).toMatchObject({ scope: "household", value, changeVia });
      expect(TEST_SETTINGS, `TEST_SETTINGS 에 ${key}`).toHaveProperty([key]);
      expect(
        (TEST_SETTINGS as Record<string, { scope: string; value: unknown }>)[
          key
        ],
      ).toEqual({ scope: "household", value });
    }
  });

  it("AC-25m 화면 자료가 읽는 여섯의 키 목록이고, 모든 영역이 읽는 음성 설정 목록 · 회화 턴 입구 목록에는 넣지 않는다(정한 것 13)", () => {
    expect([...KO_ASK_SETTING_KEYS]).toEqual(KO_VIEW_KEYS);
    for (const { key } of KO_ASK_KEYS) {
      expect(SPEECH_SETTING_KEYS, key).not.toContain(key);
      expect(Object.keys(turnSettings), key).not.toContain(key);
    }
  });

  it("AC-25m 시드 · 시험 설정으로 화면 자료 값이 켜짐 · ko-KR · 밀리초로 바꾼 시간 · 실패 문턱이다", () => {
    for (const values of [seedValues, testValues]) {
      expect(koAskSettingsFrom(readOf(values))).toEqual({
        on: true,
        lang: koSpec("speech.lang_ko"),
        endSilenceMs:
          (koSpec("speech.end_silence_seconds.ko_ask") as number) *
          MS_PER_SECOND,
        confirmMs:
          (koSpec("talk.ko_ask_confirm_seconds") as number) * MS_PER_SECOND,
        soundPauseMs: koSpec("talk.ko_ask_sound_pause_ms"),
        failHideAfter: koSpec("talk.ko_ask_fail_hide_after"),
      });
      expect(koAskModeFrom(readOf(values))).toBe("on");
      expect(koAskContextTurnsFrom(readOf(values))).toBe(
        koSpec("talk.ko_ask_context_turns"),
      );
    }
  });

  it("AC-25m talk.ko_ask_mode 가 off 면 끔이다(되돌림 스위치, 코드 배포 없이 적재로 끈다)", () => {
    const read = readOf(testValues, { [KO_ASK_MODE_KEY]: "off" });
    expect(koAskModeFrom(read)).toBe("off");
    expect(koAskSettingsFrom(read).on).toBe(false);
  });

  it("AC-25m 키가 하나라도 없거나 꼴이 틀리면 그 키 이름으로 던진다(조용한 기본값 없음)", () => {
    const bad: Record<string, unknown[]> = {
      "talk.ko_ask_mode": ["yes", true, ""],
      "speech.lang_ko": ["", 1],
      "speech.end_silence_seconds.ko_ask": [0, -1, "2.5"],
      "talk.ko_ask_confirm_seconds": [-1, "3"],
      "talk.ko_ask_sound_pause_ms": [-1, 1.5, "1500"],
      "talk.ko_ask_fail_hide_after": [0, 1.5, "3"],
    };
    for (const key of KO_VIEW_KEYS) {
      expect(
        () => koAskSettingsFrom(readOf(testValues, { [key]: undefined })),
        key,
      ).toThrow(key);
      for (const value of bad[key] ?? [])
        expect(
          () => koAskSettingsFrom(readOf(testValues, { [key]: value })),
          `${key}=${String(value)}`,
        ).toThrow(key);
    }
    for (const value of [undefined, -1, 1.5, "4"])
      expect(
        () =>
          koAskContextTurnsFrom(
            readOf(testValues, { [KO_ASK_CONTEXT_TURNS_KEY]: value }),
          ),
        String(value),
      ).toThrow(KO_ASK_CONTEXT_TURNS_KEY);
    expect(
      koAskContextTurnsFrom(
        readOf(testValues, { [KO_ASK_CONTEXT_TURNS_KEY]: 0 }),
      ),
    ).toBe(0);
  });
});

describe("AC-25g 한국어 도움 호출 규격 talkKoHelpSpec(plan 정한 것 4 — 조각에 목적 · 설정 규격 · 규칙 읽기를 더함)", () => {
  it("AC-25g 목적은 talk_ko_help 이고 제목과 같으며, 조각의 칸을 그대로 쓴다", () => {
    expect(talkKoHelpSpec.purpose).toBe("talk_ko_help");
    expect(talkKoHelpSpec.title).toBe(TALK_KO_HELP_TITLE);
    expect(talkKoHelpSpec.title).toBe(talkKoHelpSpec.purpose);
    for (const [name, value] of Object.entries(talkKoHelpPiece))
      expect(
        (talkKoHelpSpec as unknown as Record<string, unknown>)[name],
        name,
      ).toBe(value);
  });

  it("AC-25g 설정 규격은 talk.ko_ask_reply_max_chars 하나이고 시드 · 시험 설정이 그 규격을 지나 규칙 값 replyMaxChars 가 된다", () => {
    expect(Object.keys(talkKoHelpSpec.settingSchemas)).toEqual([
      KO_ASK_REPLY_MAX_CHARS_KEY,
    ]);
    for (const values of [seedValues, testValues]) {
      for (const [key, schema] of Object.entries(talkKoHelpSpec.settingSchemas))
        expect(schema.safeParse(values[key]).success, key).toBe(true);
      expect(talkKoHelpSpec.rulesOf(values, {} as never)).toEqual({
        replyMaxChars: koSpec("talk.ko_ask_reply_max_chars"),
      });
    }
  });

  it("AC-25g 글자 수 상한이 없거나 1 보다 작거나 정수가 아니면 CallSettingError 다", () => {
    for (const value of [undefined, 0, 2.5, "80"]) {
      const values = { ...testValues, [KO_ASK_REPLY_MAX_CHARS_KEY]: value };
      expect(
        () => talkKoHelpSpec.rulesOf(values, {} as never),
        String(value),
      ).toThrow(CallSettingError);
    }
  });
});

describe("AC-25g 한국어 도움 가짜 응답(tests/fixtures/ai/fake-anthropic — 통합 · e2e 가 쓴다)", () => {
  const model = TEST_SETTINGS["ai.model.talk_turn.1-3"].value;
  const textOf = (body: Record<string, unknown>) =>
    JSON.parse(
      ((body.content as { type: string; text?: string }[]).find(
        (b) => b.type === "text",
      )?.text ?? "") as string,
    ) as unknown;

  it("AC-25g 가짜 응답의 내용은 세 칸 모두 있고(쓰지 않으면 빈 글) 엄격 규격을 지나며, 규칙은 규격 제목 talk_ko_help 로 고른다", () => {
    expect(TALK_KO_HELP_PURPOSE).toBe(talkKoHelpSpec.title);
    const expression = textOf(
      talkKoHelpBody({
        model,
        kind: "expression",
        sayKo: "이렇게 말하면 돼. 잘 듣고 따라 해 봐.",
        teachEn: "I like clams.",
      }),
    );
    expect(expression).toEqual({
      kind: "expression",
      say_ko: "이렇게 말하면 돼. 잘 듣고 따라 해 봐.",
      teach_en: "I like clams.",
    });
    const meaning = textOf(
      talkKoHelpBody({
        model,
        kind: "meaning",
        sayKo: "좋아하는 걸 묻는 말이야.",
      }),
    );
    expect(meaning).toMatchObject({ kind: "meaning", teach_en: "" });
    for (const json of [expression, meaning])
      expect(
        talkKoHelpSpec
          .wireSchema(
            {} as never,
            talkKoHelpSpec.rulesOf(testValues, {} as never),
          )
          .safeParse(json).success,
      ).toBe(true);
    const rule = talkKoHelpRule({
      model,
      kind: "meaning",
      sayKo: "좋아하는 걸 묻는 말이야.",
      times: 1,
    });
    expect(rule.when).toEqual({ purpose: TALK_KO_HELP_PURPOSE });
    expect(rule.times).toBe(1);
    expect(rule.reply.kind).toBe("message");
  });
});

describe("speech.lang_ko 의 꼴(코드 검토 묶음 3 M-1)", () => {
  it("AC-N27 speech.lang_ko 가 듣기 요약 lg 의 꼴 밖이면 화면 자료 읽기가 그 키 이름으로 던진다", () => {
    for (const value of ["ko_KR", " ko-KR", "ko-KR ", "한국어"])
      expect(
        () =>
          koAskSettingsFrom(readOf(testValues, { "speech.lang_ko": value })),
        value,
      ).toThrow("speech.lang_ko");
  });
});
