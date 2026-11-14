// 회화 방식 고르기(회화 Claude 주도 plan 묶음 M · spec 설계 1 · 13절 C233 · C238): 설정 키 talk.lead_mode(고급, "app" · "claude", 시드 "app")와
// 수업 처음 스냅숏(talk-start)의 leadMode 칸 · leadModeOf. 갈림 자체(N 턴 길)는 S1 이 만들고, 여기서는 값이 스냅숏에 남고 읽히는 것까지 본다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isLowBandLevel } from "@/core/ai/calls/talk-lesson";
import {
  parseTalkAttemptInput,
  type TalkAttemptInput,
} from "@/core/conversation/attempt";
import {
  isLeadSession,
  leadModeOf,
  leadModeStartField,
  TALK_LEAD_MODE_KEY,
  TALK_LEAD_MODES,
  talkLeadModeOf,
} from "@/core/conversation/lead-mode";
import { talkLessonSettingsFrom } from "@/core/conversation/lesson-turns";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";

const seed = JSON.parse(
  readFileSync(join(process.cwd(), "seed/settings.json"), "utf8"),
) as {
  settings: { key: string; scope: string; value: unknown; changeVia: string }[];
};
const seedValues: Record<string, unknown> = Object.fromEntries(
  seed.settings.map((s) => [s.key, s.value]),
);
const testValues = testSettingValues();

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

const settingsWith = (value: unknown) =>
  talkLessonSettingsFrom(
    (key) => (key === TALK_LEAD_MODE_KEY ? value : testValues[key]),
    "1-3",
  );

describe("회화 방식 고르기 talk.lead_mode(회화 Claude 주도 묶음 M)", () => {
  it('AC-26a 설정 키 talk.lead_mode 는 시드에 household · advanced · "app" 이고 TEST_SETTINGS 도 "app" 이다', () => {
    expect(TALK_LEAD_MODE_KEY).toBe("talk.lead_mode");
    expect([...TALK_LEAD_MODES]).toEqual(["app", "claude", "chat"]);
    const row = seed.settings.find((s) => s.key === TALK_LEAD_MODE_KEY);
    expect(row).toEqual({
      key: TALK_LEAD_MODE_KEY,
      scope: "household",
      value: "app",
      changeVia: "advanced",
    });
    expect(TEST_SETTINGS[TALK_LEAD_MODE_KEY]).toEqual({
      scope: "household",
      value: "app",
    });
  });

  it('AC-26a 회화 수업 설정이 leadMode 로 읽는다: 시드 · 시험 설정은 app, "claude" 는 claude, "app" 은 app', () => {
    for (const values of [seedValues, testValues])
      for (const band of ["1-3", "4-6", "7-9", "10-12"] as const)
        expect(
          talkLessonSettingsFrom((key) => values[key], band).leadMode,
          band,
        ).toBe("app");
    expect(settingsWith("claude").leadMode).toBe("claude");
    expect(settingsWith("app").leadMode).toBe("app");
  });

  it("AC-26a 설정 talk.lead_mode 가 빠졌거나 app · claude 밖의 값이면 조용히 app 으로 바꾸지 않고 던진다(다른 회화 설정과 같은 검증)", () => {
    for (const odd of ["Claude", "CLAUDE", "n", "", true, 1, null, undefined])
      expect(() => settingsWith(odd), String(odd)).toThrow(/talk\.lead_mode/);
  });

  it("AC-26a 처음 스냅숏에 leadMode 가 남는다: claude 로 연 세션은 claude, app 으로 연 세션은 app 으로 읽는다", () => {
    const claude = startOf(startInput("claude"));
    expect(claude.leadMode).toBe("claude");
    expect(leadModeOf(claude)).toBe("claude");
    const app = startOf(startInput("app"));
    expect(leadModeOf(app)).toBe("app");
    // 서버가 적는 꼴(설정 읽은 값을 leadModeStartField 로 펼침)이 시도 꼴 규격을 지난다
    const written = {
      ...(startInput() as TalkAttemptInput),
      ...leadModeStartField(settingsWith("claude").leadMode),
    } as TalkAttemptInput;
    expect(leadModeOf(startOf(written))).toBe("claude");
  });

  it("AC-26a 서버가 적는 처음 스냅숏: app 세션은 leadMode 칸이 없어 이 묶음 전과 글자까지 같고, claude 세션에만 칸이 있다", () => {
    expect(leadModeStartField("app")).toEqual({});
    expect(leadModeStartField("claude")).toEqual({ leadMode: "claude" });
    const before = startInput();
    const appWritten = {
      ...before,
      ...leadModeStartField(settingsWith("app").leadMode),
    };
    expect(appWritten).not.toHaveProperty("leadMode");
    expect(JSON.stringify(appWritten)).toBe(JSON.stringify(before));
    expect(leadModeOf(startOf(appWritten))).toBe("app");
    const claudeWritten = {
      ...before,
      ...leadModeStartField(settingsWith("claude").leadMode),
    };
    expect(claudeWritten).toHaveProperty("leadMode", "claude");
    expect(leadModeOf(startOf(claudeWritten))).toBe("claude");
  });

  it("AC-26a 칸 없는 옛 스냅숏은 그대로 읽히고 app 이다(마이그레이션 없음), 스냅숏이 없어도 app 이다", () => {
    const old = startOf(startInput());
    expect(old).not.toHaveProperty("leadMode");
    expect(old.teacherKey).toBe("mina");
    expect(old.prepWords).toEqual(["eat", "go"]);
    expect(leadModeOf(old)).toBe("app");
    expect(leadModeOf(null)).toBe("app");
    expect(leadModeOf(undefined)).toBe("app");
    expect(leadModeOf({})).toBe("app");
  });

  it("AC-26a 스냅숏의 모르는 leadMode 값은 app 으로 읽고, 스냅숏의 다른 칸(선생님 키 · 준비 계획)은 그대로 읽힌다", () => {
    for (const odd of ["Claude", "auto", "", 1, true, null]) {
      const start = startOf(startInput(odd));
      expect(leadModeOf(start), String(odd)).toBe("app");
      expect(start.teacherKey).toBe("mina");
      expect(start.prepWords).toEqual(["eat", "go"]);
    }
    expect(talkLeadModeOf("claude")).toBe("claude");
    expect(talkLeadModeOf("CLAUDE")).toBe("app");
  });

  it("AC-26a 진행 중 세션은 설정이 바뀌어도 처음 값이다: claude 로 연 세션은 설정이 app 이어도 claude, 반대도 같다", () => {
    const openedClaude = startOf({
      ...startInput(),
      ...leadModeStartField(settingsWith("claude").leadMode),
    });
    expect(settingsWith("app").leadMode).toBe("app");
    expect(leadModeOf(openedClaude)).toBe("claude");
    const openedApp = startOf({
      ...startInput(),
      ...leadModeStartField(settingsWith("app").leadMode),
    });
    expect(settingsWith("claude").leadMode).toBe("claude");
    expect(leadModeOf(openedApp)).toBe("app");
  });
});

describe("새 엔진 세션인가 isLeadSession(묶음 S2 고침 1 · 검토 I-3 — S1 · S2 · S3 가 같은 함수를 부름)", () => {
  const claude = { leadMode: "claude" };
  const LEVELS = Array.from({ length: 12 }, (_, i) => i + 1);

  it("AC-26a 처음 스냅숏이 claude 이고 단계가 1~3단계 구간이면 새 엔진이고, 4~12단계는 claude 여도 기존 방식이다", () => {
    for (const level of [1, 2, 3])
      expect(isLeadSession({ start: claude, level })).toBe(true);
    for (const level of [4, 5, 6, 7, 8, 9, 10, 11, 12])
      expect(isLeadSession({ start: claude, level })).toBe(false);
  });

  it("AC-26a 단계 구간은 기존 함수 isLowBandLevel 과 같은 판정이다(1~12단계 전부)", () => {
    for (const level of LEVELS)
      expect(isLeadSession({ start: claude, level })).toBe(
        isLowBandLevel(level),
      );
  });

  it("AC-26a 칸 없는(app) · 모르는 값 · 없는 스냅숏은 어느 단계든 기존 방식이고, 그때는 단계 값을 읽지 않는다(범위 밖 단계도 던지지 않음)", () => {
    for (const start of [{}, { leadMode: "app" }, { leadMode: "CLAUDE" }, null])
      for (const level of [...LEVELS, 0, 99])
        expect(isLeadSession({ start, level })).toBe(false);
    expect(isLeadSession({ start: undefined, level: 1 })).toBe(false);
  });

  it("AC-26a 방식은 처음 스냅숏으로만 정한다: 지금 설정이 claude 여도 칸 없이 연 세션은 기존 방식이다", () => {
    const openedApp = startOf({
      ...startInput(),
      ...leadModeStartField(settingsWith("app").leadMode),
    });
    expect(settingsWith("claude").leadMode).toBe("claude");
    expect(isLeadSession({ start: openedApp, level: 1 })).toBe(false);
    const openedClaude = startOf({
      ...startInput(),
      ...leadModeStartField(settingsWith("claude").leadMode),
    });
    expect(isLeadSession({ start: openedClaude, level: 1 })).toBe(true);
  });
});
