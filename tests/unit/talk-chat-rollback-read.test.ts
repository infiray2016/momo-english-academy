// 회화 이야기 방식(intent 2026-11-13-회화-대화-구조-R plan 위험 3 · 묶음 S2 · fix 1 M-3)의 되돌림 읽기 점검: 코드만 고치기 전 커밋(e72c403)으로
// 되돌렸을 때(설정 값 chat · 새 열거 값 input_mode quiet · ai_purpose talk_chat_hint · talk_chat_eval · 새 열 talk_turns.chat_judge 가 DB 에 남은 채)
// 옛 코드가 그 값을 읽는 자리의 목록과, 모르는 값에서 어떻게 되는지를 적는다(검토 task-rev-chat-cd-report.md 4절 3 이 확인한 사실을 고정).
// (가) 목록: 기준 커밋에서 뜬 고정 파일(tests/fixtures/talk-chat-rollback/e72c403-read-sites.json — git show 로 뜬 파일 · 줄 · 글)과 아래 표를 대조한다.
//      CI 의 얕은 체크아웃에는 기준 커밋이 없어도 돈다. 기준 커밋 객체가 있는 저장소에서는 고정 파일이 그 커밋과 같은지도 본다.
// (나) 표의 설명: 표의 옛 식을 글자 그대로 옮겨 모르는 값을 넣어 본다(옛 코드 자체를 돌리는 것은 아니다 — 설명이 식과 맞는지만 본다).
// 결론(표의 onUnknown): 던지는 자리는 설정 값 chat 하나뿐이다(회화 수업이 열리지 않음 — plan 위험 3 의 차례: 값 app → 30분 → 열린 chat 세션 0 확인 →
// 코드 되돌림). quiet 행은 옛 읽기에서 던지지 않고 말한 차례(인사 끝 판정은 단추)로 조용히 읽힌다(그래서 열린 chat 세션이 0 일 때만 되돌린다). 새 목적
// 행은 SQL 조건으로 걸러지거나 하루 호출 셈에 든다. 새 열은 옛 스키마가 고르지 않는다.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const BASELINE = "e72c403";
const ROOT = process.cwd();

type FixtureSite = { file: string; line: number; text: string };
type Fixture = {
  commit: string;
  sites: Record<
    "inputMode" | "purpose" | "leadMode" | "inputCause" | "inputModeEnum",
    FixtureSite[]
  >;
  schema: {
    learningHasChatJudge: boolean;
    contentHasTalkChatPurposes: boolean;
  };
};

const FIXTURE: Fixture = JSON.parse(
  readFileSync(
    join(ROOT, "tests/fixtures/talk-chat-rollback/e72c403-read-sites.json"),
    "utf8",
  ),
);

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

const baselineAvailable =
  git(["cat-file", "-e", `${BASELINE}^{commit}`]) !== null;

type ReadSite = {
  file: string;
  /** 기준 커밋 그 파일의 줄(앞뒤 빈칸을 뺀 글 그대로). */
  line: string;
  /** 모르는 값을 읽었을 때. */
  onUnknown: string;
};

/** 옛 코드가 talk_turns.input_mode 를 읽는 자리(git grep "inputMode ??" — 쓰는 자리 lesson-turn.ts `inputMode: mode,` 는 읽기가 아님). */
const INPUT_MODE_READS: ReadSite[] = [
  {
    file: "src/server/conversation/index.ts",
    line: 'input: row.inputMode ?? "speech",',
    onUnknown:
      "대화 기록 행의 input 이 'quiet' 그대로 화면에 간다(던지지 않음 — 화면은 '잘 모르겠어요'가 아니면 말 행으로 그림)",
  },
  {
    file: "src/server/conversation/index.ts",
    line: 'mode: orphan.inputMode ?? "speech",',
    onUnknown:
      "다시 보낼 자료의 mode 가 'quiet' — 화면은 dont_know 가 아니면 말(빈 글)로 다시 보낸다(던지지 않음)",
  },
  {
    file: "src/server/conversation/lead-turn.ts",
    line: 'const mode = (child?.inputMode ?? "speech") as TalkInputMode;',
    onUnknown:
      "형 단언만 — 'quiet' 는 speech 가 아니라 모름 쪽으로 읽힌다(던지지 않음)",
  },
  {
    file: "src/server/conversation/lesson-turn.ts",
    line: 'const mode = (child.inputMode ?? "speech") as TalkInputMode;',
    onUnknown:
      "형 단언만 — 흐름은 === 'dont_know' 로만 가르므로 말한 차례로 읽힌다(던지지 않음)",
  },
  {
    file: "src/server/conversation/state.ts",
    line: 'input: row.inputMode ?? "speech",',
    onUnknown:
      "흐름 꼴 input 이 'quiet' — 말 주고받기 셈 · 참여 판정은 말한 차례로 세고, 인사 끝 판정(inputCauseOf)은 단추로 읽는다(던지지 않음)",
  },
];

/** 옛 코드가 ai_calls.purpose 를 읽는 자리(git grep "aiCalls.purpose"). 모두 SQL 조건이라 모르는 값을 앱이 풀지 않는다. */
const PURPOSE_READS: ReadSite[] = [
  {
    file: "src/server/ai/store.ts",
    line: 'and(eq(aiCalls.learningDay, learningDay), ne(aiCalls.purpose, "probe")),',
    onUnknown: "새 목적 행은 하루 호출 셈 · 비용 합에 든다(던지지 않음)",
  },
  {
    file: "src/server/ai/store.ts",
    line: "eq(aiCalls.purpose, purpose),",
    onUnknown: "부른 목적의 행만 센다 — 새 목적 행은 걸러진다",
  },
  {
    file: "src/server/conversation/lead-turn.ts",
    line: 'eq(aiCalls.purpose, "talk_turn"),',
    onUnknown: "talk_turn 행만 — 새 목적 행은 걸러진다",
  },
  {
    file: "src/server/conversation/lesson-turn.ts",
    line: 'eq(aiCalls.purpose, "talk_turn"),',
    onUnknown: "talk_turn 행만 — 새 목적 행은 걸러진다",
  },
];

/** 옛 코드가 회화 방식 값(설정 talk.lead_mode · 처음 스냅숏 leadMode)을 읽는 자리. */
const LEAD_MODE_READS: ReadSite[] = [
  {
    file: "src/core/conversation/lead-mode.ts",
    line: 'export const TALK_LEAD_MODES = ["app", "claude"] as const;',
    onUnknown: "값 목록이 둘 — 아래 두 읽기의 기준",
  },
  {
    file: "src/core/conversation/lesson-turns.ts",
    line: "z.enum(TALK_LEAD_MODES),",
    onUnknown:
      "설정 값 chat 은 수업 설정 읽기가 던진다 — 회화 수업이 열리지 않는다(되돌리기 전에 값을 app 으로)",
  },
  {
    file: "src/core/conversation/attempt.ts",
    line: "leadMode: z.enum(TALK_LEAD_MODES).optional().catch(undefined),",
    onUnknown:
      "스냅숏의 chat 은 칸이 비어 app 으로 읽힌다 — 진행 중인 chat 수업은 기존 길이 그 행 위에서 돈다",
  },
  {
    file: "src/core/conversation/lead-mode.ts",
    line: 'return value === "claude" ? "claude" : "app";',
    onUnknown: "claude 밖은 app",
  },
];

/** 옛 흐름이 아이 행의 입력을 인사 끝 판정의 까닭으로 바꾸는 자리(검토 rev-chat-s2 M-3). */
const INPUT_CAUSE_READS: ReadSite[] = [
  {
    file: "src/core/conversation/lesson-flow.ts",
    line: "function inputCauseOf(",
    onUnknown: "인사 끝 판정의 입력 까닭",
  },
  {
    file: "src/core/conversation/lesson-flow.ts",
    line: 'if (row.input === "speech") return "speech";',
    onUnknown: "quiet 는 speech 가 아니다",
  },
  {
    file: "src/core/conversation/lesson-flow.ts",
    line: 'return row.nospeech ? "nospeech" : "button";',
    onUnknown:
      "quiet(들리지 않음 표지 없음)는 '단추'로 읽혀 인사 끝 판정의 단추 셈에 든다(던지지 않음)",
  },
];

const key = (s: { file: string; line: string }) => `${s.file} | ${s.line}`;
const fixtureKeys = (sites: readonly FixtureSite[]) => [
  ...new Set(sites.map((s) => key({ file: s.file, line: s.text }))),
];

describe(`되돌림 읽기 점검 (가) 기준 커밋 ${BASELINE} 의 읽는 자리 목록(고정 파일 대조)`, () => {
  it("AC-27a 고정 파일은 기준 커밋 e72c403 에서 뜬 것이다", () => {
    expect(FIXTURE.commit).toBe(BASELINE);
  });

  it("AC-27a 옛 코드가 talk_turns.input_mode 를 읽는 자리는 표의 다섯이다(쓰는 자리 밖)", () => {
    expect(fixtureKeys(FIXTURE.sites.inputMode).sort()).toEqual(
      INPUT_MODE_READS.map(key).sort(),
    );
  });

  it("AC-27a 옛 코드가 ai_calls.purpose 를 읽는 자리는 표의 넷(줄 다섯)이고, 모두 SQL 조건이다", () => {
    expect(fixtureKeys(FIXTURE.sites.purpose).sort()).toEqual(
      PURPOSE_READS.map(key).sort(),
    );
  });

  it("AC-27a 옛 코드의 회화 방식 값 읽기 · 인사 끝 입력 까닭 줄이 표대로 기준 커밋에 있다", () => {
    expect(fixtureKeys(FIXTURE.sites.leadMode).sort()).toEqual(
      [...new Set(LEAD_MODE_READS.map(key))].sort(),
    );
    expect(fixtureKeys(FIXTURE.sites.inputCause).sort()).toEqual(
      INPUT_CAUSE_READS.map(key).sort(),
    );
  });

  it("AC-27a 옛 drizzle 스키마는 chat_judge 열과 새 열거 값을 모른다(고르지 않고 쓰지 않음)", () => {
    expect(FIXTURE.schema).toEqual({
      learningHasChatJudge: false,
      contentHasTalkChatPurposes: false,
    });
    expect(FIXTURE.sites.inputModeEnum.map((s) => s.text)).toEqual([
      'export const inputModeEnum = pgEnum("input_mode", ["speech", "dont_know"]);',
    ]);
  });
});

describe.runIf(baselineAvailable)(
  `되돌림 읽기 점검 (가') 고정 파일이 기준 커밋 ${BASELINE} 과 같다(기준 커밋 객체가 있는 저장소에서만)`,
  () => {
    it("AC-27a 고정 파일의 줄마다 기준 커밋의 그 파일 · 그 줄 글과 같고, 검색 결과에 빠진 줄이 없다", () => {
      for (const sites of Object.values(FIXTURE.sites))
        for (const site of sites) {
          const text = git(["show", `${BASELINE}:${site.file}`]);
          expect(text, site.file).not.toBeNull();
          expect(text?.split("\n")[site.line - 1]?.trim(), site.file).toBe(
            site.text,
          );
        }
      const grepCount = (pattern: string) =>
        (git(["grep", "-n", "-F", pattern, BASELINE, "--", "src"]) ?? "")
          .split("\n")
          .filter((l) => l !== "" && !l.includes(":src/db/schema/")).length;
      expect(grepCount("inputMode ??")).toBe(FIXTURE.sites.inputMode.length);
      expect(grepCount("aiCalls.purpose")).toBe(FIXTURE.sites.purpose.length);
    });
  },
);

describe("되돌림 읽기 점검 (나) 표의 설명(표의 옛 식을 글자 그대로 옮겨 모르는 값을 넣음)", () => {
  it("AC-27a 입력 방식: 옛 읽기(`?? \"speech\"`)는 quiet 에서 던지지 않고 그대로 넘겨, 흐름의 === 'dont_know' 가 거짓이라 말한 차례로 읽는다", () => {
    const row = { inputMode: "quiet" as string | null };
    const input = row.inputMode ?? "speech";
    expect(input).toBe("quiet");
    expect(input === "dont_know").toBe(false);
    expect(
      INPUT_MODE_READS.every((s) => s.onUnknown.includes("던지지 않음")),
    ).toBe(true);
  });

  it("AC-27a 인사 끝 입력 까닭: 옛 inputCauseOf 는 quiet 를 단추로 읽는다(던지지 않음)", () => {
    // lesson-flow.ts inputCauseOf(e72c403:304-309) 그대로
    const oldInputCauseOf = (row: { input: string; nospeech: boolean }) => {
      if (row.input === "speech") return "speech";
      return row.nospeech ? "nospeech" : "button";
    };
    expect(oldInputCauseOf({ input: "quiet", nospeech: false })).toBe("button");
  });

  it("AC-27a 회화 방식: 옛 설정 읽기는 chat 을 받지 않고(던짐), 옛 스냅숏 읽기는 chat 을 app 으로 읽는다", () => {
    const OLD_MODES = ["app", "claude"] as const;
    // lesson-turns.ts readValue(..., z.enum(TALK_LEAD_MODES), ...) — 꼴 밖이면 던진다
    expect(z.enum(OLD_MODES).safeParse("chat").success).toBe(false);
    // attempt.ts 스냅숏 칸 — 칸만 비운다
    expect(
      z.enum(OLD_MODES).optional().catch(undefined).parse("chat"),
    ).toBeUndefined();
    // lead-mode.ts talkLeadModeOf
    const oldTalkLeadModeOf = (value: unknown) =>
      value === "claude" ? "claude" : "app";
    expect(oldTalkLeadModeOf("chat")).toBe("app");
    expect(oldTalkLeadModeOf(undefined)).toBe("app");
  });

  it("AC-27a 던지는 자리는 설정 값 읽기 하나뿐이다(되돌리기 전에 값을 app 으로 — plan 위험 3)", () => {
    const throwing = [
      ...INPUT_MODE_READS,
      ...PURPOSE_READS,
      ...LEAD_MODE_READS,
      ...INPUT_CAUSE_READS,
    ].filter((s) => s.onUnknown.includes("던진다"));
    expect(throwing.map((s) => s.file)).toEqual([
      "src/core/conversation/lesson-turns.ts",
    ]);
  });
});
