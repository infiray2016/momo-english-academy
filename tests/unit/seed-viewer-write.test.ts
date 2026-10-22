// 시드 보기 화면의 쓰기(plan-p05c 증명 표): 표본 검토 행 더하기 · 사람 확인 · 아이 눈 순회 메모 · 검토 날짜.
// 시험용 시드 나무는 견본(P4 builders)이고 tests/.tmp 아래에 쓰고 지운다. '다르게 풀린' 기록은 P5a 함수와 가짜 풀이로 만든다.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import {
  composeReviewMemo,
  WALKTHROUGH_QUESTIONS,
} from "@/core/seed/review-walkthrough";
import {
  type CheckFile,
  CheckFileSchema,
  type CheckRecord,
  ReviewFileSchema,
  type ReviewRow,
} from "@/core/seed/schema/records";
import type { SettingsFile } from "@/core/seed/schema/reference";
import {
  buildCheckRecord,
  buildSolveRequest,
  interpretSolveMessage,
  judgeSolve,
} from "@/core/seed/solve-check";
import {
  checksFilePath,
  lessonFilePath,
  reviewFilePath,
} from "@/core/seed/structure";
import {
  type CollectedCell,
  cellHash,
  collectCells,
  itemsOf,
  solveStatus,
  solveTargets,
} from "@/core/seed/validate";
import {
  appendReviewRow,
  loadContentFile,
  reviewDateOf,
  reviewPathOf,
  saveHumanDecisions,
} from "@/server/seed-viewer/files";
import {
  defaultSettings,
  referenceSet,
  type SeedTree,
  sampleSeedTree,
  seedTreeFiles,
  writeSeedTree,
} from "../fixtures/seed/builders";
import { fakeSolver } from "../fixtures/seed/fake-solver";
import { TEST_SETTINGS } from "../fixtures/settings";

const REPO_ROOT = join(import.meta.dirname, "../..");
const TMP_ROOT = join(REPO_ROOT, "tests/.tmp");
const TIMEZONE = TEST_SETTINGS["app.timezone"].value;
const MODEL = "claude-sonnet-5-5";
/** 사람 확인 시각(견본, UTC ISO). */
const HUMAN_AT = "2026-10-22T06:00:00.000Z";
/** 견본 검토 날짜. */
const REVIEW_DATE = "2026-10-22";

const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
const tree: SeedTree = sampleSeedTree(ref);
const files = seedTreeFiles(tree);
const collected = collectCells(files);

let root = "";

beforeEach(() => {
  mkdirSync(TMP_ROOT, { recursive: true });
  root = mkdtempSync(join(TMP_ROOT, "seed-viewer-write-"));
  writeSeedTree(root, tree);
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function full(path: string): string {
  return join(root, ...path.split("/"));
}
function readJson(path: string): unknown {
  return JSON.parse(readFileSync(full(path), "utf8"));
}
function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(full(path)), { recursive: true });
  writeFileSync(full(path), `${JSON.stringify(data, null, 2)}\n`);
}

/** 견본 나무에서 그 영역 · 단계 수업 파일의 첫 칸. */
function lessonCell(area: string, level: number): CollectedCell {
  const file = tree.lessons.find((l) => l.area === area && l.level === level);
  if (!file) throw new Error(`견본 수업 없음: ${area} ${level}`);
  const path = lessonFilePath(file.area, file.level, file.unit);
  const cell = collected.cells.find((c) => c.file === path);
  if (!cell) throw new Error(`칸 없음: ${path}`);
  return cell;
}

/** 칸의 첫 풀이 대상 문항을 다르게 푼 기록(P5a 함수 + 가짜 풀이). */
async function differentRecord(
  cell: CollectedCell,
): Promise<{ record: CheckRecord; no: number }> {
  const [no] = solveTargets(cell);
  if (no === undefined) throw new Error(`풀이 대상 없음: ${cell.key}`);
  const request = buildSolveRequest(cell, index);
  if (!request) throw new Error(`풀이 요청 없음: ${cell.key}`);
  const solver = fakeSolver(files, {
    model: MODEL,
    behaviors: { [cell.key]: { kind: "different", no } },
  });
  const message = await solver(request);
  const answer = interpretSolveMessage(message);
  if (answer.kind === "failed") throw new Error(answer.reason);
  const judged = judgeSolve(cell, request, answer);
  if (!judged.ok) throw new Error(judged.reason);
  const record = buildCheckRecord({
    request,
    items: judged.items,
    model: message.model,
    usage: message.usage,
    costUsd: 0,
    at: HUMAN_AT,
  });
  return { record, no };
}

function row(cell: string, over: Partial<ReviewRow> = {}): ReviewRow {
  return {
    cell,
    itemNo: null,
    reason: "error",
    memo: "견본 메모",
    date: REVIEW_DATE,
    ...over,
  };
}

/** 뿌리 안 파일 목록(쓰기 거부 뒤 아무것도 생기지 않았는지 본다). */
function listTree(dir: string, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listTree(join(dir, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`],
  );
}

describe("아이 눈 순회", () => {
  it("아이 눈 순회: '아니오'인 질문 이름을 [순회 아니오: …] 머리로 붙이고 없으면 메모 그대로다", () => {
    expect(WALKTHROUGH_QUESTIONS.map((q) => q.id)).toEqual([
      "try",
      "notice",
      "connect",
      "progress",
      "one-action",
      "no-instructions",
      "no-unknown-words",
      "explanation",
    ]);
    const short = (id: string) =>
      WALKTHROUGH_QUESTIONS.find((q) => q.id === id)?.short ?? "-";
    // 고른 차례와 상관없이 표 차례로, 메모 앞뒤 공백은 뺀다
    expect(
      composeReviewMemo(["explanation", "notice"], "  보기가 헷갈려요 "),
    ).toBe(
      `[순회 아니오: ${short("notice")} · ${short("explanation")}] 보기가 헷갈려요`,
    );
    expect(composeReviewMemo(["notice", "notice"], "메모")).toBe(
      `[순회 아니오: ${short("notice")}] 메모`,
    );
    // 메모가 비면 머리만
    expect(composeReviewMemo(["try"], "  ")).toBe(
      `[순회 아니오: ${short("try")}]`,
    );
    // 고른 질문이 없으면 메모 그대로
    expect(composeReviewMemo([], " 그대로 ")).toBe(" 그대로 ");
    // 모르는 id 는 거부
    expect(() => composeReviewMemo(["unknown"], "메모")).toThrow();
  });
});

describe("시드 보기 쓰기", () => {
  it("시드 보기 쓰기: 표본 검토 행을 더하면 없던 파일을 만들고 있던 행을 지우지 않으며 ReviewFileSchema 를 지킨다", () => {
    // 없던 파일(말하기 6단계)
    const speaking = lessonCell("speaking", 6);
    const speakingReview = reviewPathOf(speaking.key);
    expect(speakingReview).toBe(reviewFilePath("speaking", 6));
    if (!speakingReview) throw new Error("검토 경로 없음");
    expect(existsSync(full(speakingReview))).toBe(false);
    const first = row(speaking.key, { itemNo: 1 });
    expect(appendReviewRow(root, { file: speaking.file, row: first })).toEqual({
      ok: true,
    });
    expect(readJson(speakingReview)).toEqual({ rows: [first] });
    expect(readFileSync(full(speakingReview), "utf8")).toBe(
      `${JSON.stringify({ rows: [first] }, null, 2)}\n`,
    );

    // 있던 파일(읽기 4단계, 견본 검토 행 하나)
    const reading = lessonCell("reading", 4);
    const readingReview = reviewFilePath("reading", 4);
    const before = ReviewFileSchema.parse(readJson(readingReview));
    expect(before.rows.length).toBeGreaterThan(0);
    const added = row(reading.key, { reason: "hard", memo: "" });
    expect(appendReviewRow(root, { file: reading.file, row: added })).toEqual({
      ok: true,
    });
    const after = ReviewFileSchema.parse(readJson(readingReview));
    expect(after.rows).toEqual([...before.rows, added]);

    // 보기 화면이 다시 읽으면 그 칸의 표본 검토 행에 보인다
    const loaded = loadContentFile(root, reading.file);
    expect(
      loaded?.cells.find((c) => c.key === reading.key)?.reviews.at(-1),
    ).toEqual(added);
    // 임시 파일이 남지 않는다
    expect(listTree(root).filter((p) => p.endsWith(".tmp"))).toEqual([]);
  });

  it("시드 보기 쓰기: 뿌리 밖(..) · 배치에 없는 경로 · 파일에 없는 칸 · 범위 밖 문항 번호는 거부한다", () => {
    const reading = lessonCell("reading", 4);
    const writing = lessonCell("writing", 1);
    const before = listTree(root);
    const outside = join(root, "..", "outside.json");
    const rejected = [
      // 뿌리 밖 · 절대 경로 · 역슬래시
      { file: "../outside.json", row: row(reading.key) },
      { file: `lessons/../../${reading.file}`, row: row(reading.key) },
      { file: full(reading.file), row: row(reading.key) },
      { file: reading.file.replaceAll("/", "\\"), row: row(reading.key) },
      // 배치에 없는 경로 · 내용 파일이 아닌 배치 경로 · 없는 내용 파일
      { file: "lessons/reading/99/1.json", row: row(reading.key) },
      { file: reviewFilePath("reading", 4), row: row(reading.key) },
      { file: lessonFilePath("reading", 7, 1), row: row(reading.key) },
      // 파일에 없는 칸(다른 파일의 칸 · 칸 키 꼴이 아님)
      { file: reading.file, row: row(writing.key) },
      { file: reading.file, row: row("not-a-cell") },
      // 범위 밖 문항 번호
      {
        file: reading.file,
        row: row(reading.key, {
          itemNo: itemsOf(reading).length + 1,
        }),
      },
      // 행 규격(날짜 꼴)
      { file: reading.file, row: row(reading.key, { date: "2026/10/22" }) },
    ];
    for (const input of rejected) {
      const result = appendReviewRow(root, input);
      expect(result.ok, JSON.stringify(input)).toBe(false);
      if (!result.ok) expect(result.message).not.toMatch(/ENOENT|Error|at /);
    }
    expect(existsSync(outside)).toBe(false);
    expect(listTree(root)).toEqual(before);

    // 사람 확인도 같은 길로 거부한다
    const hash = cellHash(reading.key, reading.value);
    for (const file of [
      "../outside.json",
      "lessons/reading/99/1.json",
      writing.file,
    ]) {
      const result = saveHumanDecisions(root, {
        file,
        cell: reading.key,
        contentHash: hash,
        at: HUMAN_AT,
        items: [{ no: 1, decision: "correct" }],
      });
      expect(result.ok, file).toBe(false);
    }
    expect(listTree(root)).toEqual(before);
  });

  it("시드 보기 쓰기: 규격이 깨진 검토 · 풀이 기록 파일은 덮어쓰지 않는다", async () => {
    const reading = lessonCell("reading", 4);
    const readingReview = reviewFilePath("reading", 4);
    writeFileSync(full(readingReview), "{ not json");
    expect(
      appendReviewRow(root, { file: reading.file, row: row(reading.key) }).ok,
    ).toBe(false);
    expect(readFileSync(full(readingReview), "utf8")).toBe("{ not json");
    writeJson(readingReview, { rows: "none" });
    expect(
      appendReviewRow(root, { file: reading.file, row: row(reading.key) }).ok,
    ).toBe(false);
    expect(readJson(readingReview)).toEqual({ rows: "none" });

    const writing = lessonCell("writing", 1);
    const { no } = await differentRecord(writing);
    const checks = checksFilePath(writing.file);
    writeJson(checks, { records: "none" });
    const result = saveHumanDecisions(root, {
      file: writing.file,
      cell: writing.key,
      contentHash: cellHash(writing.key, writing.value),
      at: HUMAN_AT,
      items: [{ no, decision: "correct" }],
    });
    expect(result.ok).toBe(false);
    expect(readJson(checks)).toEqual({ records: "none" });
  });

  it("시드 보기 쓰기: 검토 날짜는 seed/settings.json 의 app.timezone 달력 날짜이고 키가 없으면 남기지 않는다", () => {
    const withTimezone: SettingsFile = {
      settings: [
        ...defaultSettings().settings,
        {
          key: "app.timezone",
          scope: "household",
          value: TIMEZONE,
          changeVia: "seed",
        },
      ],
    };
    // 그 시간대의 날짜 경계 앞뒤(UTC 로는 같은 날)
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const instants = [
      new Date("2026-10-22T14:59:59.000Z"),
      new Date("2026-10-22T15:00:00.000Z"),
    ];
    for (const instant of instants) {
      expect(reviewDateOf(instant, withTimezone)).toEqual({
        ok: true,
        date: formatter.format(instant),
      });
    }
    expect(formatter.format(instants[0] as Date)).not.toBe(
      formatter.format(instants[1] as Date),
    );
    // 키가 없으면 코드 기본값 없이 거부
    const missing = reviewDateOf(instants[0] as Date, defaultSettings());
    expect(missing).toEqual({
      ok: false,
      message: "설정값 시드에 app.timezone 이 없어요",
    });
    expect(reviewDateOf(instants[0] as Date, undefined).ok).toBe(false);
    const wrong = reviewDateOf(instants[0] as Date, {
      settings: withTimezone.settings.map((r) =>
        r.key === "app.timezone" ? { ...r, value: "Mars/Base" } : r,
      ),
    });
    expect(wrong.ok).toBe(false);
  });
});

describe("6.4 사람 확인", () => {
  it("6.4 사람 확인: 화면을 연 때의 내용 해시가 지금 해시와 다르거나 그 해시의 풀이 기록이 없으면 남기지 않는다", async () => {
    const writing = lessonCell("writing", 1);
    const { record, no } = await differentRecord(writing);
    const checks = checksFilePath(writing.file);
    const items = [{ no, decision: "correct" as const }];
    const hash = cellHash(writing.key, writing.value);

    // 풀이 기록 파일이 없으면 남기지 않는다
    expect(existsSync(full(checks))).toBe(false);
    const noRecord = saveHumanDecisions(root, {
      file: writing.file,
      cell: writing.key,
      contentHash: hash,
      at: HUMAN_AT,
      items,
    });
    expect(noRecord.ok).toBe(false);
    expect(existsSync(full(checks))).toBe(false);

    const checkFile: CheckFile = { records: [record] };
    writeJson(checks, checkFile);
    // 화면을 연 때의 해시가 지금 해시와 다르다
    const stale = saveHumanDecisions(root, {
      file: writing.file,
      cell: writing.key,
      contentHash: "0".repeat(64),
      at: HUMAN_AT,
      items,
    });
    expect(stale).toEqual({
      ok: false,
      message: "내용이 바뀌었어요. 다시 열어 주세요",
    });
    expect(readJson(checks)).toEqual(checkFile);

    // 풀이 뒤 내용을 고쳤다: 지금 해시로 보내도 그 해시의 풀이 기록이 없다
    const lessonFile = tree.lessons.find(
      (l) => lessonFilePath(l.area, l.level, l.unit) === writing.file,
    );
    if (!lessonFile) throw new Error("수업 파일 없음");
    const edited = {
      ...lessonFile,
      lessons: lessonFile.lessons.map((l, i) =>
        i === 0 ? { ...l, title: `${l.title} 고침` } : l,
      ),
    };
    writeJson(writing.file, edited);
    const reloaded = loadContentFile(root, writing.file)?.cells.find(
      (c) => c.key === writing.key,
    );
    if (!reloaded) throw new Error("다시 읽은 칸 없음");
    expect(reloaded.hash).not.toBe(hash);
    for (const contentHash of [reloaded.hash, hash]) {
      const result = saveHumanDecisions(root, {
        file: writing.file,
        cell: writing.key,
        contentHash,
        at: HUMAN_AT,
        items,
      });
      expect(result.ok, contentHash).toBe(false);
    }
    expect(readJson(checks)).toEqual(checkFile);

    // 칸에 없는 문항 번호 · 겹친 번호는 거부
    writeJson(writing.file, lessonFile);
    for (const bad of [
      [{ no: itemsOf(writing).length + 1, decision: "correct" as const }],
      [
        { no, decision: "correct" as const },
        { no, decision: "fixed" as const },
      ],
    ]) {
      const result = saveHumanDecisions(root, {
        file: writing.file,
        cell: writing.key,
        contentHash: hash,
        at: HUMAN_AT,
        items: bad,
      });
      expect(result.ok).toBe(false);
    }
    expect(readJson(checks)).toEqual(checkFile);
  });

  it("6.4 사람 확인: '고침'은 통과가 아니다(pending-human 그대로)", async () => {
    const writing = lessonCell("writing", 1);
    const { record, no } = await differentRecord(writing);
    const checks = checksFilePath(writing.file);
    writeJson(checks, { records: [record] } satisfies CheckFile);
    const hash = cellHash(writing.key, writing.value);
    expect(solveStatus(writing, record)).toBe("pending-human");

    const fixed = saveHumanDecisions(root, {
      file: writing.file,
      cell: writing.key,
      contentHash: hash,
      at: HUMAN_AT,
      items: [{ no, decision: "fixed" }],
    });
    expect(fixed).toEqual({ ok: true });
    const afterFixed = CheckFileSchema.parse(readJson(checks)).records[0];
    expect(afterFixed?.human).toEqual({
      contentHash: hash,
      at: HUMAN_AT,
      items: [{ no, decision: "fixed" }],
    });
    expect(afterFixed?.solve).toEqual(record.solve);
    expect(solveStatus(writing, afterFixed)).toBe("pending-human");

    // 같은 문항에 '정답 맞음'을 남기면 바뀌고 통과로 센다
    const correct = saveHumanDecisions(root, {
      file: writing.file,
      cell: writing.key,
      contentHash: hash,
      at: HUMAN_AT,
      items: [{ no, decision: "correct" }],
    });
    expect(correct).toEqual({ ok: true });
    const afterCorrect = CheckFileSchema.parse(readJson(checks)).records[0];
    expect(afterCorrect?.human?.items).toEqual([{ no, decision: "correct" }]);
    expect(solveStatus(writing, afterCorrect)).toBe("passed");
    expect(listTree(root).filter((p) => p.endsWith(".tmp"))).toEqual([]);
  });
});
