// 회화 Claude 주도 묶음 S1 CI 고침(의존 방향 검사 no-circular, 15절 AC-26a): lesson-turn.ts 는 lead-turn.ts 를 불러오지 않고, 새 엔진 수업의
// 아이 차례 뒤 처리기(leadTurnAfterChild)는 운영에서 지금 턴 길을 부르는 단 한 곳(turn.ts runTalkTurnRequest)이 인자로 넘긴다. 처리기 없이
// 새 엔진 수업의 대화 차례에 닿으면 error 줄로 끝나는 것은 통합 시험 talk-lead-turn 이 본다. 이 파일은 DB 없이 입구의 배선만 본다(턴 길과
// 입구가 읽는 것들은 가짜로 바꾼다).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/server/db";

const lessonTurn = vi.fn(async (..._args: unknown[]) => {});

vi.mock("@/server/conversation/lesson-turn", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/server/conversation/lesson-turn")
  >()),
  runTalkLessonTurn: (...args: unknown[]) => lessonTurn(...args),
}));
vi.mock("@/server/profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/profile")>()),
  readHouseholdProfile: async () => ({ id: "profile-1" }),
}));
vi.mock("@/server/seed-lists", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/seed-lists")>()),
  getOutputCheckLists: () => ({ forbidden: { patterns: [] } }),
}));
vi.mock("@/server/ai/run", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/ai/run")>()),
  maskerFor: async () => ({}),
}));
vi.mock("@/server/settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/settings")>()),
  getSettings: async () => ({}),
}));
vi.mock("@/server/session/ai-gate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/session/ai-gate")>()),
  aiRestingToday: async () => false,
}));
vi.mock("@/core/seed/schema/talk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/seed/schema/talk")>()),
  talkCardKindOf: () => "new",
}));

const { runTalkTurnRequest } = await import("@/server/conversation/turn");
const { leadTurnAfterChild } = await import("@/server/conversation/lead-turn");

/** 세션 행 읽기(select → from → innerJoin → where) 하나만 받는 가짜 DB — 카드 꼴은 위 가짜 talkCardKindOf 가 정한다. */
function sessionRowDb(): Db {
  const rows = [{ content: { card: {} } }];
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "from", "innerJoin"]) chain[name] = () => chain;
  chain.where = async () => rows;
  return chain as unknown as Db;
}

/** 규격을 지나는 아이 말 요청. */
const CHILD_REQUEST = {
  sessionId: "00000000-0000-4000-8000-000000000001",
  clientAttemptId: "attempt-1",
  input: { mode: "speech", text: "I like apples." },
  hint: { opened: 0, heard: [] },
};

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

beforeEach(() => {
  lessonTurn.mockClear();
});

describe("회화 Claude 주도 묶음 S1 CI 고침: 지금 턴 길과 새 엔진 턴 길의 불러오기 방향", () => {
  it("AC-26a 회화 턴 입구(runTalkTurnRequest)는 아이 말 요청을 지금 턴 길(runTalkLessonTurn)로 보낼 때 새 엔진의 처리기 leadTurnAfterChild 를 넷째 인자로 넘긴다", async () => {
    const lines: unknown[] = [];
    await runTalkTurnRequest(CHILD_REQUEST, {
      db: sessionRowDb(),
      now: () => new Date("2026-11-13T00:00:00Z"),
      write: (line) => lines.push(line),
    });
    expect(lines).toEqual([]);
    expect(lessonTurn).toHaveBeenCalledTimes(1);
    const args = lessonTurn.mock.calls[0] ?? [];
    expect(args).toHaveLength(4);
    expect(args[0]).toMatchObject({ sessionId: CHILD_REQUEST.sessionId });
    expect(args[3]).toBe(leadTurnAfterChild);
  });

  it("AC-26a lesson-turn.ts 는 lead-turn.ts 를 형으로도 값으로도 불러오지 않는다(의존 방향 검사 no-circular)", () => {
    const text = readFileSync(
      join(SRC, "server/conversation/lesson-turn.ts"),
      "utf8",
    );
    expect(text).not.toMatch(
      /from\s+["'](?:\.\/lead-turn|@\/server\/conversation\/lead-turn)["']/,
    );
    expect(text).not.toMatch(/import\(\s*["'][^"']*lead-turn["']\s*\)/);
  });

  it("AC-26a 운영 코드에서 지금 턴 길(runTalkLessonTurn)을 부르는 곳은 turn.ts 한 곳이다(그곳이 처리기를 넘기는 것은 위 시험이 지킨다)", () => {
    const callers = sourceFiles(SRC)
      .filter((path) => !path.endsWith("lesson-turn.ts"))
      .filter((path) =>
        /\brunTalkLessonTurn\s*\(/.test(readFileSync(path, "utf8")),
      )
      .map((path) => relative(SRC, path));
    expect(callers).toEqual(["server/conversation/turn.ts"]);
  });
});
