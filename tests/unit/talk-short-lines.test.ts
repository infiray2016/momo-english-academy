// 회화 짧은 말 목록(C213 · iPad 버리는 듣기 plan 정한 것 6 · 묶음 6 (가)): 규격(자리 again · mic × 구간 넷, 줄마다 en · ko) ·
// 검사(신호 말과 같은 꼴 — 줄 수 · 물음표 · 그 구간 첫 단계의 문장 길이 상한 · 어휘 범위(허용 낱말 포함) · 지어낸 경험 꼴) ·
// seed:validate 등록(SEED_FILES · buildReferenceIndex) · 시드 파일 통과 · 화면 자료 읽기(그 단계 구간 것, 파일이 없으면 빈 목록)를 본다.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  checkTalkLists,
  TALK_SHORT_LINES_MIN,
  type TalkListsContext,
} from "@/core/seed/check-talk-lists";
import type { SeedIssue } from "@/core/seed/issue";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import {
  type TalkShortLinesFile,
  TalkShortLinesFileSchema,
} from "@/core/seed/schema/reference";
import {
  BAND_NAMES,
  SEED_FILES,
  TALK_SHORT_BANDS,
  TALK_SHORT_PLACES,
} from "@/core/seed/structure";
import { buildLexicon } from "@/core/seed/text";
import {
  loadSeedList,
  SeedListError,
  seedTalkShortLines,
  seedTalkShortLinesAt,
} from "@/server/seed-lists";
import { defaultSettings, referenceSet } from "../fixtures/seed/builders";

const REPO = join(import.meta.dirname, "..", "..");
const FILE = SEED_FILES.talkShortLines;

const line = (en: string) => ({ en, ko: "뜻" });
/** 여덟 칸에 같은 줄 하나씩. */
function filled(en: string): TalkShortLinesFile {
  const cells = () =>
    Object.fromEntries(
      TALK_SHORT_BANDS.map((band) => [band, [line(en)]]),
    ) as TalkShortLinesFile["again"];
  return { again: cells(), mic: cells() };
}
const at = (issues: SeedIssue[]) =>
  issues
    .filter((i) => i.rule === "talk-short-lines")
    .map((i) => `${i.file}:${i.path}`);

// 구간 첫 단계(1 · 4 · 7 · 10)가 갈리게 만든 작은 사전과 단계별 문장 길이 상한.
const lexicon = buildLexicon([
  { word: "okay", pos: ["interjection"], level: 1, forms: [] },
  { word: "one", pos: ["number"], level: 1, forms: [] },
  { word: "time", pos: ["noun"], level: 1, forms: ["times"] },
  { word: "more", pos: ["adverb"], level: 4, forms: [] },
  { word: "again", pos: ["adverb"], level: 7, forms: [] },
]);
const MAX_WORDS: Record<number, number> = { 1: 4, 4: 5, 7: 6, 10: 7 };
const ctx: TalkListsContext = {
  lexicon,
  maxWordsAt: (level) => MAX_WORDS[level],
};

describe("짧은 말 목록 규격(plan 정한 것 6)", () => {
  it("자리는 again · mic, 구간은 단계 구간 넷이고 SEED_FILES 에 목록 파일이 든다", () => {
    expect(TALK_SHORT_PLACES).toEqual(["again", "mic"]);
    expect(TALK_SHORT_BANDS).toEqual(BAND_NAMES);
    expect(TALK_SHORT_BANDS).toEqual(["1-3", "4-6", "7-9", "10-12"]);
    expect(FILE).toBe("lists/talk-short-lines.json");
    expect(TALK_SHORT_LINES_MIN).toBe(1);
  });

  it("여덟 칸이 모두 있고 줄마다 en · ko 가 있어야 지난다", () => {
    expect(
      TalkShortLinesFileSchema.safeParse(filled("Okay, one more time."))
        .success,
    ).toBe(true);
    const bads: unknown[] = [];
    const drop = (
      f: (file: Record<string, Record<string, unknown>>) => void,
    ) => {
      const file = structuredClone(filled("Okay.")) as unknown as Record<
        string,
        Record<string, unknown>
      >;
      f(file);
      bads.push(file);
    };
    drop((f) => delete f.mic); // 자리 빠짐
    drop((f) => delete f.again?.["10-12"]); // 구간 빠짐
    drop((f) => {
      f.again = { ...f.again, "2-3": [line("Okay.")] }; // 모르는 구간
    });
    drop((f) => {
      f.reopen = f.again ?? {}; // 모르는 자리
    });
    drop((f) => {
      if (f.mic) f.mic["1-3"] = []; // 빈 칸
    });
    drop((f) => {
      if (f.mic) f.mic["4-6"] = [{ en: "Okay." }]; // 뜻 없음
    });
    drop((f) => {
      if (f.mic) f.mic["7-9"] = [{ en: "Okay.", ko: "" }]; // 빈 뜻
    });
    drop((f) => {
      if (f.again) f.again["1-3"] = [{ en: "Okay.", ko: "응", say: "x" }]; // 모르는 칸
    });
    for (const bad of bads)
      expect(TalkShortLinesFileSchema.safeParse(bad).success).toBe(false);
  });
});

describe("짧은 말 검사(신호 말과 같은 꼴)", () => {
  it("어휘 · 길이는 그 구간 첫 단계로 본다: 4단계 낱말은 1-3 에서만 걸리고, 7단계 낱말은 1-3 · 4-6 에서 걸린다", () => {
    expect(
      checkTalkLists({ talkShortLines: filled("Okay, one time.") }, ctx),
    ).toEqual([]);
    const more = checkTalkLists(
      { talkShortLines: filled("Okay, one more time.") },
      ctx,
    );
    expect(at(more)).toEqual([
      `${FILE}:again.1-3.0.en`,
      `${FILE}:mic.1-3.0.en`,
    ]);
    expect(more.map((i) => i.message).join("\n")).toContain("more");
    const again = checkTalkLists(
      { talkShortLines: filled("Okay, again.") },
      ctx,
    );
    expect(at(again)).toEqual([
      `${FILE}:again.1-3.0.en`,
      `${FILE}:again.4-6.0.en`,
      `${FILE}:mic.1-3.0.en`,
      `${FILE}:mic.4-6.0.en`,
    ]);
    // 허용 낱말(감탄 · 수업 말)에 있으면 범위 안이다
    expect(
      checkTalkLists(
        {
          talkShortLines: filled("Okay, again."),
          talkAllowedWords: { allowed: ["again"], feeling: ["happy"] },
        },
        ctx,
      ),
    ).toEqual([]);
  });

  it("문장 길이는 그 구간 첫 단계 상한(1 · 4 · 7 · 10 단계 값)으로 문장마다 센다", () => {
    const levels: number[] = [];
    const counted: TalkListsContext = {
      lexicon,
      maxWordsAt: (level) => {
        levels.push(level);
        return MAX_WORDS[level];
      },
    };
    // 다섯 낱말 한 문장: 1단계 상한 4 만 넘는다
    const five = checkTalkLists(
      { talkShortLines: filled("Okay, okay, one time, okay.") },
      counted,
    );
    expect(at(five)).toEqual([
      `${FILE}:again.1-3.0.en`,
      `${FILE}:mic.1-3.0.en`,
    ]);
    expect(five[0]?.message).toContain("상한 4");
    expect([...new Set(levels)].sort((a, b) => a - b)).toEqual([1, 4, 7, 10]);
    // 문장을 나누면 문장마다 센다
    expect(
      checkTalkLists(
        { talkShortLines: filled("Okay, okay. One time, okay.") },
        ctx,
      ),
    ).toEqual([]);
  });

  it("물음표 · 지어낸 경험 꼴에 걸린 줄을 거부한다", () => {
    const file = filled("Okay, one time.");
    file.again["7-9"] = [line("Okay, one time."), line("One more time?")];
    file.mic["10-12"] = [line("Okay. I remember one time.")];
    const issues = checkTalkLists(
      {
        talkShortLines: file,
        talkMadeUpPhrases: { phrases: ["i remember"] },
      },
      { ...ctx, lexicon: undefined },
    );
    expect(at(issues)).toEqual([
      `${FILE}:again.7-9.1.en`,
      `${FILE}:mic.10-12.0.en`,
    ]);
    const messages = issues.map((i) => i.message).join("\n");
    expect(messages).toContain("물음표");
    expect(messages).toContain("i remember");
    expect(issues.every((i) => i.severity === "error")).toBe(true);
  });

  it("규격을 거치지 않은 빈 칸은 줄 수 하한으로 거부한다", () => {
    const file = filled("Okay.");
    file.mic["4-6"] = [];
    expect(at(checkTalkLists({ talkShortLines: file }, ctx))).toEqual([
      `${FILE}:mic.4-6`,
    ]);
  });

  it("사전이 없으면 어휘 검사는 건너뛰고 물음표 · 길이는 그대로 본다", () => {
    const issues = checkTalkLists(
      { talkShortLines: filled("Okay, more, more, more, more?") },
      { maxWordsAt: (level) => MAX_WORDS[level] },
    );
    const messages = issues.map((i) => i.message).join("\n");
    expect(messages).toContain("물음표");
    expect(messages).toContain("상한");
    expect(messages).not.toContain("어휘 범위");
  });
});

describe("seed:validate 등록과 시드 파일", () => {
  const ref = referenceSet(defaultSettings());

  it("규격 파일 정합(buildReferenceIndex)이 짧은 말 검사를 부르고, 견본은 지난다", () => {
    expect(buildReferenceIndex(ref).issues).toEqual([]);
    const bad = structuredClone(ref);
    bad.talkShortLines.mic["7-9"] = [line("Okay?")];
    expect(at(buildReferenceIndex(bad).issues)).toEqual([
      `${FILE}:mic.7-9.0.en`,
    ]);
  });

  it("시드 파일은 규격을 지나고 여덟 칸에 줄이 있으며, loadSeedList 가 같은 값을 읽는다", () => {
    const raw: unknown = JSON.parse(
      readFileSync(join(REPO, "seed", FILE), "utf8"),
    );
    const parsed = TalkShortLinesFileSchema.parse(raw);
    for (const place of TALK_SHORT_PLACES)
      for (const band of TALK_SHORT_BANDS)
        expect(parsed[place][band].length).toBeGreaterThanOrEqual(
          TALK_SHORT_LINES_MIN,
        );
    expect(loadSeedList("talkShortLines", { root: REPO })).toEqual(parsed);
    expect(parsed.again["7-9"]).toContainEqual(
      expect.objectContaining({ en: "Okay, one more time." }),
    );
  });

  it("화면 자료는 그 단계 구간의 줄을 자리마다 내린다", () => {
    const file = seedTalkShortLines({ root: REPO });
    for (const [level, band] of [
      [1, "1-3"],
      [3, "1-3"],
      [5, "4-6"],
      [9, "7-9"],
      [12, "10-12"],
    ] as const) {
      const view = seedTalkShortLinesAt(level, { root: REPO });
      expect(Object.keys(view)).toEqual([...TALK_SHORT_PLACES]);
      for (const place of TALK_SHORT_PLACES)
        expect(view[place]).toEqual(file[place][band]);
    }
  });

  describe("파일이 없는 길(개발용 · e2e)", () => {
    const empty = mkdtempSync(join(tmpdir(), "talk-short-lines-"));
    afterAll(() => rmSync(empty, { recursive: true, force: true }));

    it("loadSeedList 는 missing 으로 던지고, 읽기 함수는 빈 칸을 내며 경고를 한 번만 남긴다", () => {
      expect(() => loadSeedList("talkShortLines", { root: empty })).toThrow(
        SeedListError,
      );
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        for (let i = 0; i < 2; i++) {
          const file = seedTalkShortLines({ root: empty });
          for (const place of TALK_SHORT_PLACES)
            for (const band of TALK_SHORT_BANDS)
              expect(file[place][band]).toEqual([]);
          expect(seedTalkShortLinesAt(4, { root: empty })).toEqual({
            again: [],
            mic: [],
          });
        }
        expect(
          warn.mock.calls.filter((call) => String(call[0]).includes(FILE)),
        ).toHaveLength(1);
      } finally {
        warn.mockRestore();
      }
    });
  });
});
