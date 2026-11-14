// 이야기 방식 묶음 C(설정 · 방식 값 — spec 판 3 FR-1 · 설계 1 · 설정 표 · AC-1 · AC-19, plan 묶음 표 'C 설정 · 방식 값'): talk.lead_mode 의 셋째 값 chat,
// 처음 스냅숏 칸 · 읽기, 이야기 방식 판단 함수 isChatSession, 스냅숏 조건 넷, isLeadSession 은 chat 에서 거짓, 설정 읽기의 세 값 검증, 새 키(talk.chat_* ·
// ai.* 의 talk_chat_hint · talk_chat_eval)의 시드 · 시험 설정 · 읽기, 개발용 쪽 서버 액션의 두 값 고정(묶음 E 전까지), 변경 앞 기준 파일 대조.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isLowBandLevel } from "@/core/ai/calls/talk-lesson";
import { parseTalkAttemptInput } from "@/core/conversation/attempt";
import {
  chatStartAllowed,
  isChatSession,
  isLeadSession,
  leadModeOf,
  leadModeStartField,
  TALK_LEAD_MODE_KEY,
  TALK_LEAD_MODES,
  talkLeadModeOf,
} from "@/core/conversation/lead-mode";
import {
  TALK_CHAT_KEYS,
  talkLessonSettingsFrom,
} from "@/core/conversation/lesson-turns";
import { TALK_LOW_BAND } from "@/core/seed/structure";
import {
  childInputModeOf,
  lessonStateKeysOf,
} from "@/server/conversation/state";
import { DEV_TALK_MODES, talkModeInputOf } from "@/server/dev/talk-mode";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";
import {
  BASELINE_MODES,
  baselineCompact,
  readBaselineFile,
  talkBaselineOf,
} from "../fixtures/talk-chat-baseline/build";

const seed = JSON.parse(
  readFileSync(join(process.cwd(), "seed/settings.json"), "utf8"),
) as {
  settings: { key: string; scope: string; value: unknown; changeVia: string }[];
};
const seedValues: Record<string, unknown> = Object.fromEntries(
  seed.settings.map((s) => [s.key, s.value]),
);
const testValues = testSettingValues();
const LEVELS = Array.from({ length: 12 }, (_, i) => i + 1);

/** 지금 ensureLessonStarted 가 적는 처음 스냅숏 꼴(판 1) — leadMode 는 주면 더한다. */
const startInput = (leadMode?: unknown): Record<string, unknown> => ({
  v: 1,
  kind: "talk-start",
  step: "final",
  shownWords: [],
  metBefore: ["eat"],
  practiceOrder: [],
  teacherKey: "mina",
  prepWords: ["eat", "go"],
  carry: { goals: [], words: [] },
  ...(leadMode === undefined ? {} : { leadMode }),
});

const startOf = (raw: unknown) => {
  const input = parseTalkAttemptInput(raw);
  if (input?.kind !== "talk-start") throw new Error("처음 스냅숏이 아니다");
  return input;
};

const settingsWith = (key: string, value: unknown, band = "1-3" as const) =>
  talkLessonSettingsFrom((k) => (k === key ? value : testValues[k]), band);

/** spec 설정 표의 잠정 값(12절 행 · 시드 · 시험 설정이 같아야 함). */
const CHAT_VALUES: Record<string, unknown> = {
  "talk.chat_turn_words.1-3": 12,
  "talk.chat_quiet_seconds": 8,
  "talk.chat_teacher_run_max": 2,
  "talk.chat_hint_context_turns": 6,
  "talk.chat_hint_retry_max": 1,
  "talk.chat_eval_context_turns": 6,
  "talk.chat_alternatives": 2,
  "talk.chat_unsure_confidence": 0.5,
  "talk.chat_unsure_on_partial": false,
  "talk.chat_explain_wait_seconds": 6,
  "talk.chat_day_part_hours": [5, 12, 18],
};
const CHAT_CALLS = ["talk_chat_hint", "talk_chat_eval"] as const;
const MAX_TOKENS: Record<(typeof CHAT_CALLS)[number], number> = {
  talk_chat_hint: 600,
  talk_chat_eval: 400,
};

describe("방식 값 chat(이야기 방식 묶음 C — FR-1 · 설계 1)", () => {
  it("AC-27a 값 목록은 app · claude · chat 이고 기본값(시드 · 시험 설정)은 app 그대로다", () => {
    expect([...TALK_LEAD_MODES]).toEqual(["app", "claude", "chat"]);
    expect(seedValues[TALK_LEAD_MODE_KEY]).toBe("app");
    expect(TEST_SETTINGS[TALK_LEAD_MODE_KEY].value).toBe("app");
  });

  it("AC-27a 처음 스냅숏 칸: chat 은 { leadMode: chat } 를 적고 app 은 칸이 없으며 claude 는 지금 그대로다", () => {
    expect(leadModeStartField("chat")).toEqual({ leadMode: "chat" });
    expect(leadModeStartField("claude")).toEqual({ leadMode: "claude" });
    expect(leadModeStartField("app")).toEqual({});
    const written = startOf({ ...startInput(), ...leadModeStartField("chat") });
    expect(written.leadMode).toBe("chat");
    expect(leadModeOf(written)).toBe("chat");
  });

  it("AC-27a 스냅숏 읽기: chat · claude 만 그 값이고 그 밖(빠짐 · 모르는 글 · 꼴 밖)은 app 이며 스냅숏의 다른 칸은 그대로 읽힌다", () => {
    expect(talkLeadModeOf("chat")).toBe("chat");
    expect(talkLeadModeOf("claude")).toBe("claude");
    for (const odd of ["Chat", "CHAT", "story", "", 1, true, null, undefined]) {
      expect(talkLeadModeOf(odd), String(odd)).toBe("app");
      const start = startOf(startInput(odd));
      expect(leadModeOf(start), String(odd)).toBe("app");
      expect(start.teacherKey).toBe("mina");
      expect(start.prepWords).toEqual(["eat", "go"]);
    }
    expect(leadModeOf(null)).toBe("app");
    expect(leadModeOf({})).toBe("app");
  });

  it("AC-27a chat 스냅숏은 넷이 설 때만: 설정 · 1~3단계 · 단원 재료 · 선생님 재료가 모두 참일 때만 참이고 열여섯 조합 가운데 하나뿐이다", () => {
    const flags = [true, false];
    let allowed = 0;
    for (const setting of flags)
      for (const lowBand of flags)
        for (const unitMaterial of flags)
          for (const teacherMaterial of flags) {
            const got = chatStartAllowed({
              setting,
              lowBand,
              unitMaterial,
              teacherMaterial,
            });
            expect(
              got,
              JSON.stringify({ setting, lowBand, unitMaterial }),
            ).toBe(setting && lowBand && unitMaterial && teacherMaterial);
            if (got) allowed++;
          }
    expect(allowed).toBe(1);
  });

  it("AC-27a 이야기 방식 판단 isChatSession: 처음 스냅숏이 chat 이고 1~3단계 구간일 때만 참이고(isLowBandLevel 과 같은 판정), 4단계부터 · claude · app · 칸 없음은 거짓이다", () => {
    const chat = { leadMode: "chat" };
    for (const level of LEVELS)
      expect(isChatSession({ start: chat, level }), String(level)).toBe(
        isLowBandLevel(level),
      );
    for (const level of [1, 2, 3])
      expect(isChatSession({ start: chat, level })).toBe(true);
    for (const start of [
      { leadMode: "claude" },
      { leadMode: "app" },
      { leadMode: "CHAT" },
      {},
      null,
      undefined,
    ])
      for (const level of [...LEVELS, 0, 99])
        expect(isChatSession({ start, level })).toBe(false);
  });

  it("AC-27a isLeadSession 은 chat 에서 거짓: chat 스냅숏은 어느 단계에서도 지금 새 방식이 아니고, claude 스냅숏의 판정은 그대로다", () => {
    for (const level of [...LEVELS, 0, 99])
      expect(isLeadSession({ start: { leadMode: "chat" }, level })).toBe(false);
    for (const level of LEVELS)
      expect(isLeadSession({ start: { leadMode: "claude" }, level })).toBe(
        isLowBandLevel(level),
      );
    const written = startOf({ ...startInput(), ...leadModeStartField("chat") });
    expect(isLeadSession({ start: written, level: 3 })).toBe(false);
    expect(isChatSession({ start: written, level: 3 })).toBe(true);
  });

  it("AC-27a 방식은 처음 스냅숏으로만 정한다: chat 으로 연 세션은 설정이 바뀌어도 chat, app 으로 연 세션은 설정이 chat 이어도 app 이다", () => {
    const openedChat = startOf({
      ...startInput(),
      ...leadModeStartField(settingsWith(TALK_LEAD_MODE_KEY, "chat").leadMode),
    });
    expect(settingsWith(TALK_LEAD_MODE_KEY, "app").leadMode).toBe("app");
    expect(isChatSession({ start: openedChat, level: 3 })).toBe(true);
    const openedApp = startOf({
      ...startInput(),
      ...leadModeStartField(settingsWith(TALK_LEAD_MODE_KEY, "app").leadMode),
    });
    expect(isChatSession({ start: openedApp, level: 3 })).toBe(false);
  });
});

describe("설정 읽기(이야기 방식 묶음 C — 설계 1 · 설정 표)", () => {
  it("AC-27a 설정 읽기는 세 값 밖에서 던짐: app · claude · chat 은 그 값으로 읽고, 빠졌거나 그 밖의 값이면 세 값을 적은 글로 던진다", () => {
    for (const mode of ["app", "claude", "chat"])
      expect(settingsWith(TALK_LEAD_MODE_KEY, mode).leadMode).toBe(mode);
    for (const odd of ["Chat", "CHAT", "story", "", true, 1, null, undefined])
      expect(() => settingsWith(TALK_LEAD_MODE_KEY, odd), String(odd)).toThrow(
        /talk\.lead_mode.*app · claude · chat/,
      );
  });

  it("AC-27a 새 키 talk.chat_* 는 시드 · 시험 설정에 household · advanced 로 spec 설정 표의 값이고, 수업 설정이 chat 칸으로 읽는다(모든 구간)", () => {
    expect(Object.values(TALK_CHAT_KEYS).sort()).toEqual(
      Object.keys(CHAT_VALUES).sort(),
    );
    expect(TALK_CHAT_KEYS.turnWords).toBe(
      `talk.chat_turn_words.${TALK_LOW_BAND}`,
    );
    for (const [key, value] of Object.entries(CHAT_VALUES)) {
      const row = seed.settings.find((s) => s.key === key);
      expect(row, key).toEqual({
        key,
        scope: "household",
        value,
        changeVia: "advanced",
      });
      expect(
        (TEST_SETTINGS as Record<string, { scope: string; value: unknown }>)[
          key
        ],
        key,
      ).toEqual({ scope: "household", value });
    }
    for (const values of [seedValues, testValues])
      for (const band of ["1-3", "4-6", "7-9", "10-12"] as const)
        expect(
          talkLessonSettingsFrom((k) => values[k], band).chat,
          band,
        ).toEqual({
          turnWords: 12,
          quietSeconds: 8,
          teacherRunMax: 2,
          hintContextTurns: 6,
          hintRetryMax: 1,
          evalContextTurns: 6,
          alternatives: 2,
          unsureConfidence: 0.5,
          unsureOnPartial: false,
          explainWaitSeconds: 6,
          dayPartHours: [5, 12, 18],
        });
  });

  it("AC-27a 새 키의 꼴: 기다림 시간 0 은 끔으로 받고, 빠짐 · 음수 · 꼴 밖은 조용한 기본값 없이 던진다", () => {
    expect(settingsWith(TALK_CHAT_KEYS.quietSeconds, 0).chat.quietSeconds).toBe(
      0,
    );
    expect(settingsWith(TALK_CHAT_KEYS.hintRetryMax, 0).chat.hintRetryMax).toBe(
      0,
    );
    expect(
      settingsWith(TALK_CHAT_KEYS.unsureOnPartial, true).chat.unsureOnPartial,
    ).toBe(true);
    const bad: [string, unknown][] = [
      [TALK_CHAT_KEYS.turnWords, 0],
      [TALK_CHAT_KEYS.turnWords, 1.5],
      [TALK_CHAT_KEYS.quietSeconds, -1],
      [TALK_CHAT_KEYS.quietSeconds, "8"],
      [TALK_CHAT_KEYS.teacherRunMax, 0],
      [TALK_CHAT_KEYS.hintContextTurns, 0],
      [TALK_CHAT_KEYS.hintRetryMax, -1],
      [TALK_CHAT_KEYS.evalContextTurns, 0],
      [TALK_CHAT_KEYS.alternatives, 0],
      [TALK_CHAT_KEYS.unsureConfidence, 1.5],
      [TALK_CHAT_KEYS.unsureConfidence, -0.1],
      [TALK_CHAT_KEYS.unsureOnPartial, "off"],
      [TALK_CHAT_KEYS.explainWaitSeconds, -1],
      [TALK_CHAT_KEYS.dayPartHours, [5, 12]],
      [TALK_CHAT_KEYS.dayPartHours, [12, 5, 18]],
      [TALK_CHAT_KEYS.dayPartHours, [5, 12, 24]],
      [TALK_CHAT_KEYS.dayPartHours, [5, 12.5, 18]],
    ];
    for (const key of Object.values(TALK_CHAT_KEYS)) bad.push([key, undefined]);
    for (const [key, value] of bad)
      expect(
        () => settingsWith(key, value),
        `${key}=${JSON.stringify(value)}`,
      ).toThrow(new RegExp(key.replaceAll(".", "\\.")));
  });

  it("AC-27a 힌트 · 평가 호출의 ai.* 키는 목적별 꼴(구간 없음)로 시드 · 시험 설정에 있고 값은 회화 턴 1~3단계 구간과 같으며 최대 출력은 600 · 400 이다", () => {
    for (const values of [seedValues, testValues])
      for (const call of CHAT_CALLS) {
        for (const head of ["ai.model", "ai.effort", "ai.thinking"])
          expect(values[`${head}.${call}`], `${head}.${call}`).toBe(
            values[`${head}.talk_turn.${TALK_LOW_BAND}`],
          );
        expect(values[`ai.max_tokens.${call}`]).toBe(MAX_TOKENS[call]);
      }
    for (const call of CHAT_CALLS)
      for (const head of [
        "ai.model",
        "ai.effort",
        "ai.thinking",
        "ai.max_tokens",
      ])
        expect(
          seed.settings.find((s) => s.key === `${head}.${call}`),
        ).toMatchObject({ scope: "household", changeVia: "advanced" });
  });

  it("AC-27a 수업 상태가 읽는 키 목록에 새 talk.chat_* 키가 모두 있다(빠진 DB 는 다른 키처럼 드러남, 코드 배포 전에 적재)", () => {
    const keys = lessonStateKeysOf("1-3");
    for (const key of Object.values(TALK_CHAT_KEYS))
      expect(keys).toContain(key);
    expect(keys).toContain(TALK_LEAD_MODE_KEY);
  });
});

describe("아이 행 입력 방식 좁히기(묶음 D 의 열거 값 quiet 뒤 — 컨트롤러 결정)", () => {
  it("AC-27a 아이 행 입력 방식: 빈 값은 speech, speech · dont_know 는 그대로이고 quiet 는 말한 차례로 읽지 않고 던진다", () => {
    expect(childInputModeOf(null)).toBe("speech");
    expect(childInputModeOf("speech")).toBe("speech");
    expect(childInputModeOf("dont_know")).toBe("dont_know");
    expect(() => childInputModeOf("quiet")).toThrow(/quiet/);
  });
});

describe("개발용 쪽 서버 액션(묶음 E 전까지 두 값)", () => {
  it("AC-27a 개발용 쪽 서버 액션은 묶음 E 전까지 app · claude 둘만 받고 chat 은 받지 않는다", () => {
    expect([...DEV_TALK_MODES]).toEqual(["app", "claude"]);
    expect(talkModeInputOf("app")).toBe("app");
    expect(talkModeInputOf("claude")).toBe("claude");
    expect(talkModeInputOf("chat")).toBeNull();
  });
});

describe("변경 앞 기준(AC-19 · NFR-5 — 고치기 전 커밋 e72c403 에서 뜬 고정 파일)", () => {
  it.each(BASELINE_MODES)(
    "AC-27s 모의 실행기의 %s 회화 턴 요청 본문 · 저장 행이 기준 파일과 글자까지 같다",
    (mode) => {
      expect(baselineCompact(talkBaselineOf(mode))).toBe(
        readBaselineFile(mode),
      );
    },
  );
});
