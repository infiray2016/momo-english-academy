import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ENV_EXAMPLE_URL = new URL("../../.env.example", import.meta.url);
const NAME_ONLY_LINE = /^[A-Z][A-Z0-9_]*=$/;
const COMMENTED_ASSIGNMENT = /^#\s*[A-Z][A-Z0-9_]*=\S/;

function readLines(): string[] {
  return readFileSync(ENV_EXAMPLE_URL, "utf8").split(/\r?\n/);
}

function isCommentOrBlank(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("#");
}

describe(".env.example", () => {
  it("환경 변수 견본: 모든 줄이 주석 · 빈 줄 · '이름=' 꼴이고 값이 없다", () => {
    const lines = readLines();
    const offending = lines.filter((line) =>
      isCommentOrBlank(line)
        ? COMMENTED_ASSIGNMENT.test(line.trim())
        : !NAME_ONLY_LINE.test(line),
    );
    expect(offending).toEqual([]);
    expect(lines.some((line) => NAME_ONLY_LINE.test(line))).toBe(true);
  });

  it("환경 변수 견본: 이름이 겹치지 않는다", () => {
    const names = readLines()
      .filter((line) => NAME_ONLY_LINE.test(line))
      .map((line) => line.slice(0, -1));
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });
});
