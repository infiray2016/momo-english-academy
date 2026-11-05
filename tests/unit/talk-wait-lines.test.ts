// 회화 맞장구 목록(회화 plan 정한 것 20 · 묶음 9): seed/lists/talk-wait-lines.json 첫 안 다섯 줄 · 규격 · 목록 검사(금지어 · 선생님 이름 ·
// 물음표 · 1단계 문장 길이 상한) · 턴 번호로 돌려 고르기(safeLineOf 꼴) · 서버 읽기. 요청자가 프리뷰에서 듣고 고친다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { waitLineOf } from "@/core/conversation/wait-line";
import { teacherNamesOf } from "@/core/seed/check-teacher";
import { checkTalkWaitLines } from "@/core/seed/check-wait-lines";
import {
  type ForbiddenFile,
  TalkWaitLinesFileSchema,
} from "@/core/seed/schema/reference";
import { SEED_FILES } from "@/core/seed/structure";
import { loadSeedList, seedTalkWaitLines } from "@/server/seed-lists";

const REPO = join(import.meta.dirname, "..", "..");
const FIRST_DRAFT = [
  "Hmm, let me see.",
  "Let me think.",
  "Oh, I see.",
  "Okay!",
  "Hmm.",
];
const FORBIDDEN: ForbiddenFile = {
  words: { en: ["stupid"], ko: [] },
  patterns: [],
};
const NAMES = teacherNamesOf({
  teachers: [
    {
      nameEn: "Mina",
      nameKo: "미나",
      nameKoWordExceptions: ["미나리"],
    },
  ],
} as unknown as Parameters<typeof teacherNamesOf>[0]);

describe("맞장구 목록(정한 것 20)", () => {
  it("seed/lists/talk-wait-lines.json 은 첫 안 다섯 줄이고 규격을 지난다(SEED_FILES 에 든다)", () => {
    expect(SEED_FILES.talkWaitLines).toBe("lists/talk-wait-lines.json");
    const raw = JSON.parse(
      readFileSync(join(REPO, "seed", SEED_FILES.talkWaitLines), "utf8"),
    );
    const file = TalkWaitLinesFileSchema.parse(raw);
    expect(file.lines).toEqual(FIRST_DRAFT);
    expect(
      checkTalkWaitLines(file, {
        forbidden: FORBIDDEN,
        teacherNames: NAMES,
        maxWords: 5,
      }),
    ).toEqual([]);
  });

  it("빈 목록 · 빈 줄은 규격에서 걸린다", () => {
    expect(TalkWaitLinesFileSchema.safeParse({ lines: [] }).success).toBe(
      false,
    );
    expect(TalkWaitLinesFileSchema.safeParse({ lines: [""] }).success).toBe(
      false,
    );
  });

  it("목록 검사: 금지어 · 선생님 이름 · 물음표 · 1단계 문장 길이 상한 · 겹친 줄을 오류로 낸다", () => {
    const issues = checkTalkWaitLines(
      {
        lines: [
          "Okay!",
          "You are stupid.",
          "Mina is thinking.",
          "What do you mean?",
          "Hmm, let me see what we can do.",
          "okay!",
        ],
      },
      { forbidden: FORBIDDEN, teacherNames: NAMES, maxWords: 5 },
    );
    expect(issues.map((i) => i.path)).toEqual([
      "lines.1",
      "lines.2",
      "lines.3",
      "lines.4",
      "lines.5",
    ]);
    expect(issues.every((i) => i.rule === "talk-wait-lines")).toBe(true);
    expect(issues.every((i) => i.severity === "error")).toBe(true);
    expect(issues.every((i) => i.file === SEED_FILES.talkWaitLines)).toBe(true);
  });

  it("1단계 문장 길이 상한을 모르면(단계 규격 없음) 길이는 보지 않는다", () => {
    expect(
      checkTalkWaitLines(
        { lines: ["Hmm, let me see what we can do."] },
        { forbidden: FORBIDDEN, teacherNames: NAMES },
      ),
    ).toEqual([]);
  });

  it("고르기는 턴 번호로 돌린다(같은 줄이 턴마다 되풀이되지 않음, 빈 목록은 null)", () => {
    expect(
      [0, 1, 2, 3, 4, 5, 6].map((n) => waitLineOf(FIRST_DRAFT, n)),
    ).toEqual([
      "Hmm, let me see.",
      "Let me think.",
      "Oh, I see.",
      "Okay!",
      "Hmm.",
      "Hmm, let me see.",
      "Let me think.",
    ]);
    expect(waitLineOf(FIRST_DRAFT, -1)).toBe("Hmm.");
    expect(waitLineOf([], 3)).toBeNull();
  });

  it("서버는 빌드에 묶인 목록을 읽고, 파일이 없는 길은 빈 목록이다", () => {
    expect(loadSeedList("talkWaitLines", { root: REPO }).lines).toEqual(
      FIRST_DRAFT,
    );
    expect(seedTalkWaitLines({ root: REPO })).toEqual(FIRST_DRAFT);
    expect(seedTalkWaitLines({ root: join(REPO, "no-such-root") })).toEqual([]);
  });
});
