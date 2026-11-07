// 회화 턴 요청에 소리 칸이 없음(회화 AI 몫 넓힘 묶음 0-가 · AC-8 (마) (1) 녹음 안 함, NFR-4 · C211 보완 7항). 요청 규격 TurnRequestSchema 는
// strictObject 이고 input 은 mode · text · nospeech 뿐이라, 소리 칸(audio · recording · blob 꼴)을 더한 요청은 runTalkTurnRequest 가 DB 를 열기
// 전에 error 줄 하나로 끝낸다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  runTalkTurnRequest,
  type TalkLessonLine,
} from "@/server/conversation/turn";
import type { Db } from "@/server/db";

/** 규격을 지나는 요청(소리 칸 없음). */
const BASE = {
  sessionId: "00000000-0000-4000-8000-000000000001",
  clientAttemptId: "attempt-1",
  input: { mode: "speech", text: "I like apples." },
  hint: { opened: 0, heard: [] },
};

/** 건드리면 셈하고 던지는 DB(요청 검사가 DB 앞에서 끝나는지 본다). */
function trapDb() {
  const touched: string[] = [];
  const db = new Proxy(
    {},
    {
      get(_target, prop) {
        touched.push(String(prop));
        throw new Error("DB 를 건드렸다");
      },
    },
  ) as unknown as Db;
  return { db, touched };
}

async function run(raw: unknown) {
  const lines: TalkLessonLine[] = [];
  const { db, touched } = trapDb();
  await runTalkTurnRequest(raw, {
    db,
    now: () => new Date("2026-11-07T00:00:00Z"),
    write: (line) => lines.push(line),
  });
  return { lines, touched };
}

const AUDIO_FIELDS = ["audio", "recording", "blob"] as const;

describe("회화 턴 요청에 소리 칸이 없다(AC-8 (마) (1) 녹음 안 함)", () => {
  it("요청 규격 글(turn.ts TurnRequestSchema)은 strictObject 이고 소리 칸 이름이 없으며, input 은 mode · text · nospeech 뿐이다", () => {
    const source = readFileSync(
      join(process.cwd(), "src/server/conversation/turn.ts"),
      "utf8",
    );
    const start = source.indexOf("const TurnRequestSchema = z.strictObject({");
    expect(start).toBeGreaterThanOrEqual(0);
    const block = source.slice(start, source.indexOf("\n});", start));
    expect(block).not.toMatch(/audio|record|blob|wav|webm|base64|file/i);
    const input = block.slice(
      block.indexOf("input: z.strictObject({"),
      block.indexOf("}),", block.indexOf("input: z.strictObject({")),
    );
    const fields = [...input.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
    expect(fields).toEqual(["mode", "text", "nospeech"]);
  });

  it("규격을 지나는 요청은 요청 검사를 넘어 DB 로 간다(아래 시험의 기준)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { lines, touched } = await run(BASE);
    expect(touched.length).toBeGreaterThan(0);
    expect(lines).toEqual([{ t: "error" }]);
    vi.restoreAllMocks();
  });

  for (const field of AUDIO_FIELDS) {
    it(`요청 맨 위에 소리 칸 ${field} 를 더하면 DB 를 열기 전에 error 줄 하나로 끝난다`, async () => {
      const { lines, touched } = await run({ ...BASE, [field]: "UklGRg==" });
      expect(touched).toEqual([]);
      expect(lines).toEqual([{ t: "error" }]);
    });

    it(`input 안에 소리 칸 ${field} 를 더하면 DB 를 열기 전에 error 줄 하나로 끝난다`, async () => {
      const { lines, touched } = await run({
        ...BASE,
        input: { ...BASE.input, [field]: "UklGRg==" },
      });
      expect(touched).toEqual([]);
      expect(lines).toEqual([{ t: "error" }]);
    });
  }
});
