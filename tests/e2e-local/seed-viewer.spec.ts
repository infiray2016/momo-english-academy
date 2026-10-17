// 로컬 전용 시드 보기 화면 시험(plan-p05b 증명 표, AC-7f 보기 · 보기 화면 · 4절 크기, fix 1 화면 · 코드 지적).
// 개발 서버(next dev)는 SEED_VIEWER_ROOT 로 시험용 시드 뿌리를 읽는다(playwright.local.config.ts).
// 기대 글은 견본 시드 객체에서 읽는다(시험에 박지 않는다). 견본 나무 밖에 더 쓰는 칸(풀이 기록 · 검토 행 · 깨진 칸 ·
// 쓰기 · 말하기 평가 · 7~9 구간 이야기)도 이 파일의 객체에서 읽는다.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test as base, type Locator, type Page } from "@playwright/test";
import { SEED_VIEWER_E2E_ROOT } from "../../playwright.local.config";
import type {
  LevelTestFile,
  StoryFile,
} from "../../src/core/seed/schema/assessment";
import type {
  ReadingLesson,
  SpeakingLesson,
  WritingLesson,
} from "../../src/core/seed/schema/lesson";
import type { CheckFile, ReviewFile } from "../../src/core/seed/schema/records";
import {
  cellKey,
  checksFilePath,
  lessonFilePath,
  levelTestFilePath,
  parseSeedPath,
  reviewFilePath,
  STORY_KO_BANDS,
  storyFilePath,
} from "../../src/core/seed/structure";
import { cellHash, collectCells, itemsOf } from "../../src/core/seed/validate";
import { expect, test } from "../e2e/fixtures";
import {
  defaultSettings,
  referenceSet,
  sampleSeedTree,
  seedTreeFiles,
  storyFile,
  writeSeedTree,
} from "../fixtures/seed/builders";

const VIEWER_PATH = "/dev/seed-viewer";
/** 4절 접근 코드 화면 제목(C57). */
const ACCESS_TITLE = "부모님이 코드를 넣어 주세요";
/** 4절 아이 화면 글자 · 누르는 곳 기준(잠정, 10.9형). AC-N9 는 P10~P12 의 font-size 시험이 맡는다(plan 위험 9). */
const MIN_GUIDE_PX = 20;
const MIN_ENGLISH_PX = 24;
const MIN_BUTTON_TEXT_PX = 22;
const MIN_TARGET_PX = 56;
/** 지문 위 단어 그림 상한(C67 (6), common.tsx 의 같은 이름 상수와 같은 값). */
const PASSAGE_PICTURE_MAX = 4;
/** 이 환경 변수가 있으면 아이 화면 틀 사진을 그 폴더에 남긴다(화면 검토용, plan-p05b 작업 6). */
const SCREENSHOT_ENV = "E2E_SEED_VIEWER_SCREENSHOTS";
/** 칸 127개를 모두 여는 시험의 시간 상한(개발 서버 컴파일 포함, 기술 값). */
const ALL_CELLS_TIMEOUT_MS = 300_000;
/** 내용 파일 종류(목록에 보이는 것). */
const CONTENT_KINDS = new Set([
  "lessons",
  "level-tests",
  "placement",
  "stories",
]);

const tree = sampleSeedTree(referenceSet(defaultSettings()));
const files = seedTreeFiles(tree);
const collected = collectCells(files);
const contentPaths = [...files.keys()]
  .filter((path) => CONTENT_KINDS.has(parseSeedPath(path)?.kind ?? ""))
  .sort();
const vocab = new Map(tree.reference.vocab.vocab.map((v) => [v.word, v]));

function fileUrl(path: string): string {
  return `${VIEWER_PATH}?file=${encodeURIComponent(path)}`;
}
function cellUrl(path: string, key: string): string {
  return `${fileUrl(path)}&cell=${encodeURIComponent(key)}`;
}
function cellsOf(path: string) {
  return collected.cells.filter((cell) => cell.file === path);
}
function lessonOf<T>(
  area: string,
  level: number,
): { path: string; key: string; lesson: T } {
  const file = tree.lessons.find((l) => l.area === area && l.level === level);
  const lesson = file?.lessons[0];
  if (!file || !lesson) throw new Error(`견본 수업 없음: ${area} ${level}`);
  const path = lessonFilePath(file.area, level, file.unit);
  const key = cellKey({
    type: "lesson",
    area: file.area,
    level,
    unit: file.unit,
    kind: lesson.kind,
    lessonNo: lesson.lessonNo,
    variant: lesson.variant,
  });
  return { path, key, lesson: lesson as T };
}
function childScreen(page: Page, n: number) {
  return page.getByRole("region", { name: `아이 화면 ${n}`, exact: true });
}
function extrasOf(page: Page, n: number) {
  return page.getByRole("region", { name: `덧붙임 ${n}`, exact: true });
}
const childScreens = (page: Page) =>
  page.getByRole("region", { name: /^아이 화면 \d+$/ });
const allExtras = (page: Page) =>
  page.getByRole("region", { name: /^덧붙임 \d+$/ });

/** 활동 이름표(어른용, '활동 n · 이름 · 문항 k')로 화면 하나를 찾아 그 아이 화면 틀을 낸다. */
function screenByLabel(page: Page, label: RegExp): Locator {
  return page
    .getByRole("region", { name: label })
    .getByRole("region", { name: /^아이 화면 \d+$/ });
}
function extrasByLabel(page: Page, label: RegExp): Locator {
  return page
    .getByRole("region", { name: label })
    .getByRole("region", { name: /^덧붙임 \d+$/ });
}
function escapeLabel(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** '활동 n · <이름>' 또는 '활동 n · <이름> · 문항 k'. */
function activityLabel(name: string, itemNo?: number): RegExp {
  const tail = itemNo === undefined ? "" : ` · 문항 ${itemNo}`;
  return new RegExp(`^활동 \\d+ · ${escapeLabel(name)}${tail}$`);
}

// ── 견본 나무 밖에 더 쓰는 칸(fix 1 코드 M-5 · 화면 M-7) ─────────────

const reading1 = lessonOf<ReadingLesson>("reading", 1);
const reading1Hash = cellHash(reading1.key, reading1.lesson);
/** 해시를 칸에 맞춘 풀이 기록: 문항 1 같음, 2 다름(사람 확인 정답 맞음), 3 답이 여럿(사람 확인 없음 → 사람 확인). */
const reading1Checks: CheckFile = {
  records: [
    {
      cell: reading1.key,
      contentHash: reading1Hash,
      solve: {
        at: "2026-10-16T09:00:00+09:00",
        model: "claude-sonnet-5-5",
        inputTokens: 1000,
        outputTokens: 60,
        costUsd: 0.004,
        items: reading1.lesson.content.questions.map((q, i) => ({
          no: i + 1,
          verdict: i === 1 ? "different" : i === 2 ? "multiple" : "same",
          solverAnswer: q.answerNo,
        })),
      },
      human: {
        contentHash: reading1Hash,
        at: "2026-10-16T10:00:00+09:00",
        items: [{ no: 2, decision: "correct" }],
      },
    },
  ],
};
const reading1Review: ReviewFile = {
  rows: [
    {
      cell: reading1.key,
      itemNo: 2,
      reason: "error",
      memo: "보기 둘이 비슷해 보여요",
      date: "2026-10-16",
    },
  ],
};
/** 규격이 깨진 수업 하나(내용 칸이 없다). 칸 키는 만들 수 있다. */
const brokenLesson = {
  kind: "assigned",
  lessonNo: 1,
  variant: 1,
  title: "깨진 견본 수업",
};
const brokenPath = lessonFilePath("reading", 2, 1);
const brokenKey = cellKey({
  type: "lesson",
  area: "reading",
  level: 2,
  unit: 1,
  kind: "assigned",
  lessonNo: 1,
  variant: 1,
});
const VERSION = { revision: 1, correction: 0 };
/** 쓰기 4단계 평가(빈칸 채우기 · 문장 고치기 · 작문). */
const writingTest: LevelTestFile = {
  area: "writing",
  level: 4,
  forms: [
    {
      form: 1,
      items: [
        {
          no: 1,
          unit: 1,
          ...VERSION,
          type: "fill-blank",
          prompt: "I ___ a cat.",
          accepted: ["have"],
          explanationKo: "가지고 있다는 have 예요.",
        },
        {
          no: 2,
          unit: 2,
          ...VERSION,
          type: "fix-sentence",
          prompt: "she like dogs.",
          accepted: ["She likes dogs."],
        },
        {
          no: 3,
          unit: 3,
          ...VERSION,
          type: "composition",
          task: "좋아하는 동물을 두 문장으로 써요.",
          example: "I like cats. They are cute.",
          rubric: ["과제 충족", "문법"],
        },
      ],
    },
  ],
};
/** 말하기 6단계 평가(질문 — 시드에 한국어 뜻이 있어도 6단계는 보이지 않는다 · 발표 · 따라 말하기). */
const speakingTest: LevelTestFile = {
  area: "speaking",
  level: 6,
  forms: [
    {
      form: 1,
      items: [
        {
          no: 1,
          unit: 1,
          ...VERSION,
          type: "question",
          en: "What do you do after school?",
          ko: "방과 후에 뭐 해?",
        },
        {
          no: 2,
          unit: 2,
          ...VERSION,
          type: "presentation",
          topic: "My favorite place",
          prepWords: ["park", "weekend", "friends"],
        },
        {
          no: 3,
          unit: 3,
          ...VERSION,
          type: "repeat",
          sentence: "We play in the park.",
        },
      ],
    },
  ],
};
/** 7~9 구간 이야기(한국어 뜻을 보이지 않는 구간, 시드에 뜻이 있어도). */
const lateStories: StoryFile = (() => {
  const file = storyFile(tree.reference, "7-9");
  const [first, ...rest] = file.stories;
  if (!first) throw new Error("7-9 이야기 없음");
  return {
    ...file,
    stories: [
      { ...first, textKo: "토리가 그걸 찾았어. 다 같이 놀아." },
      ...rest,
    ],
  };
})();
const extraFiles: [string, unknown][] = [
  [checksFilePath(reading1.path), reading1Checks],
  [reviewFilePath("reading", 1), reading1Review],
  [brokenPath, { area: "reading", level: 2, unit: 1, lessons: [brokenLesson] }],
  [levelTestFilePath("writing", 4), writingTest],
  [levelTestFilePath("speaking", 6), speakingTest],
  [storyFilePath("7-9"), lateStories],
];
function testCellKey(file: LevelTestFile, no: number): string {
  return cellKey({
    type: "level-test",
    area: file.area,
    level: file.level,
    form: 1,
    no,
  });
}

/** 쪽의 잡히지 않은 오류와 콘솔 오류를 모은다(파비콘 404 는 뺀다). */
function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (message.location().url.endsWith("/favicon.ico")) return;
    errors.push(message.text());
  });
  return errors;
}

test.beforeAll(() => {
  rmSync(SEED_VIEWER_E2E_ROOT, { recursive: true, force: true });
  mkdirSync(SEED_VIEWER_E2E_ROOT, { recursive: true });
  writeSeedTree(SEED_VIEWER_E2E_ROOT, tree);
  for (const [path, data] of extraFiles) {
    const full = join(SEED_VIEWER_E2E_ROOT, ...path.split("/"));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`);
  }
});

test("AC-7f 시드 보기: 읽기 수업 칸을 열면 아이 화면 모습에 정답 · 해설 · 새 단어가 붙어 보인다", async ({
  page,
}) => {
  const { path, key, lesson } = lessonOf<ReadingLesson>("reading", 4);
  await page.goto(VIEWER_PATH);
  await page.getByRole("link", { name: path, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(path);
  await page.getByRole("link", { name: key, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(key);
  expect(new URL(page.url()).searchParams.get("cell")).toBe(key);

  // 화면 차례: 새 단어 미리보기(1) → 지문(2) → 문항 1..n(3..)
  for (const entry of lesson.preview) {
    await expect(childScreen(page, 1)).toContainText(entry.word);
    await expect(childScreen(page, 1)).toContainText(entry.meaningKo);
  }
  const newWords = extrasOf(page, 1);
  await expect(newWords).toContainText("새 단어");
  for (const word of lesson.newWords)
    await expect(newWords).toContainText(word);
  await expect(childScreen(page, 2)).toContainText(lesson.content.passage);
  for (const entry of lesson.content.glossary) {
    await expect(extrasOf(page, 2)).toContainText(entry.meaningKo);
  }

  for (const [i, question] of lesson.content.questions.entries()) {
    const n = 3 + i;
    const child = childScreen(page, n);
    await expect(child).toContainText(question.prompt);
    for (const option of question.options)
      await expect(child).toContainText(option);
    const answer = question.options[question.answerNo - 1] ?? "";
    await expect(child.locator('[data-correct="true"]')).toHaveCount(1);
    await expect(child.locator('[data-correct="true"]')).toContainText(answer);
    const extras = extrasOf(page, n);
    await expect(extras).toContainText("정답");
    await expect(extras).toContainText(`${question.answerNo}. ${answer}`);
    await expect(extras).toContainText("해설");
    await expect(extras).toContainText(question.explanationKo);
  }
  await expect(childScreens(page)).toHaveCount(
    2 + lesson.content.questions.length,
  );
  // 정답 · 해설은 아이 화면 틀 밖(덧붙임)에만 있다
  for (const question of lesson.content.questions) {
    await expect(
      childScreens(page).filter({ hasText: question.explanationKo }),
    ).toHaveCount(0);
  }
});

test("시드 보기: 견본 시드의 내용 파일(쓰기 · 말하기 · 회화 카드 · 단계 평가 · 배치 · 토리 이야기)이 모두 화면 오류 없이 열리고 칸마다 머리가 보인다", async ({
  page,
}) => {
  test.setTimeout(ALL_CELLS_TIMEOUT_MS);
  const errors = collectPageErrors(page);
  await page.goto(VIEWER_PATH);
  for (const path of contentPaths) {
    await expect(
      page.getByRole("link", { name: path, exact: true }),
    ).toHaveCount(1);
  }
  // 목록에는 내용 파일만 있다
  await expect(
    page.getByRole("link", { name: /^(checks|reviews)\// }),
  ).toHaveCount(0);

  for (const path of contentPaths) {
    const response = await page.goto(fileUrl(path));
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(path);
    await expect(
      page.getByText("이 파일의 규격 · 배치 오류는 없어요"),
    ).toHaveCount(1);
    const cells = cellsOf(path);
    expect(cells.length, path).toBeGreaterThan(0);
    for (const cell of cells) {
      await expect(
        page.getByRole("link", { name: cell.key, exact: true }),
      ).toHaveCount(1);
    }
    // 첫 칸은 브라우저로 열어 화면 오류가 없는지 본다
    const [first] = cells;
    if (!first) continue;
    const firstResponse = await page.goto(cellUrl(path, first.key));
    expect(firstResponse?.status(), first.key).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(first.key);
    await expect(page.getByText("규격이 깨진 칸이에요")).toHaveCount(0);
    // 나머지 칸은 요청으로 머리가 그려지는지 본다
    for (const cell of cells) {
      const html = await (
        await page.request.get(cellUrl(path, cell.key))
      ).text();
      expect(html, cell.key).toContain(`data-cell-head="${cell.key}"`);
      expect(html, cell.key).not.toContain("규격이 깨진 칸이에요");
    }
  }
  expect(errors).toEqual([]);
});

test("시드 보기: 듣기 대본 · 그림 장면 설명은 아이 화면 밖 덧붙임에만 보인다", async ({
  page,
}) => {
  const { path, key, lesson } = lessonOf<SpeakingLesson>("speaking", 6);
  const hidden = [
    ...lesson.content.listening.map((item) => item.script),
    lesson.content.pictureTask?.scene ?? "",
  ].filter((text) => text !== "");
  expect(hidden.length).toBeGreaterThan(1);
  await page.goto(cellUrl(path, key));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(key);
  await expect(childScreens(page).first()).toBeVisible();
  for (const text of hidden) {
    await expect(childScreens(page).filter({ hasText: text })).toHaveCount(0);
    await expect(allExtras(page).filter({ hasText: text })).toHaveCount(1);
  }
  // 그림 보고 말하기 화면에는 그림 자리가 있고, 듣기 화면에는 소리 자리('다시 듣기')가 있다
  await expect(
    childScreens(page).getByRole("button", { name: "다시 듣기" }).first(),
  ).toBeVisible();
});

base(
  "시드 보기: 접근 쿠키가 없으면 /dev/seed-viewer 도 접근 코드 화면(401)이다(C57)",
  async ({ page }) => {
    const response = await page.goto(VIEWER_PATH);
    expect(response?.status()).toBe(401);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      ACCESS_TITLE,
    );
    await expect(
      page.getByText(tree.lessons[0]?.lessons[0]?.title ?? "-"),
    ).toHaveCount(0);
  },
);

/** 크기 시험 · 화면 사진이 여는 칸(영역 · 활동 갈래마다 하나). 사진은 활동 이름표로 고른 화면, 이름은 p05b-<갈래>.png. */
function sizeTargets(): {
  path: string;
  key: string;
  shot?: { name: string; label: RegExp };
}[] {
  const lesson = (
    area: string,
    level: number,
    shot?: { name: string; label: RegExp },
  ) => {
    const { path, key } = lessonOf(area, level);
    return { path, key, shot };
  };
  const firstCell = (path: string, shot?: { name: string; label: RegExp }) => {
    const [cell] = cellsOf(path);
    if (!cell) throw new Error(`칸 없음: ${path}`);
    return { path, key: cell.key, shot };
  };
  const writing1 = lessonOf<WritingLesson>("writing", 1).lesson;
  const fillNo =
    writing1.content.shape === "items"
      ? writing1.content.items.findIndex((i) => i.type === "fill-letters") + 1
      : 0;
  const placementCells = cellsOf("placement/speaking.json");
  const spare = placementCells.find((cell) => cell.key.endsWith(":spare"));
  if (!spare) throw new Error("배치 예비 문항 없음");
  const levelTestPaths = (file: LevelTestFile) =>
    file.forms.flatMap((form) =>
      "items" in form
        ? form.items.map((item) => ({
            path: levelTestFilePath(file.area, file.level),
            key: testCellKey(file, item.no),
          }))
        : [],
    );
  return [
    lesson("reading", 1),
    lesson("reading", 4, { name: "reading", label: activityLabel("지문") }),
    lesson("writing", 1, {
      name: "writing",
      label: activityLabel("문항", fillNo),
    }),
    lesson("writing", 3),
    lesson("writing", 4, {
      name: "writing-blank",
      label: activityLabel("문장", 1),
    }),
    lesson("writing", 6),
    lesson("speaking", 1, {
      name: "speaking",
      label: /^활동 \d+ · 질문 · 문항 \d+$/,
    }),
    lesson("speaking", 6),
    lesson("speaking", 10),
    firstCell("level-tests/reading/4.json", {
      name: "level-test",
      label: activityLabel("문항", 1),
    }),
    firstCell("placement/speaking.json"),
    { path: "placement/speaking.json", key: spare.key },
    firstCell("stories/1-3.json", {
      name: "story",
      label: activityLabel("이야기"),
    }),
    ...levelTestPaths(writingTest),
    ...levelTestPaths(speakingTest),
    {
      path: storyFilePath("7-9"),
      key: cellKey({ type: "story", band: "7-9", no: 1 }),
    },
  ];
}

test("활동 표시: 아이 화면의 안내 20px · 영어 24px · 버튼 글자 22px 이상, 누르는 곳 56px 이상, '%' 가 없다", async ({
  page,
}) => {
  test.setTimeout(ALL_CELLS_TIMEOUT_MS);
  const screenshotDir = process.env[SCREENSHOT_ENV];
  const limits = {
    guide: MIN_GUIDE_PX,
    english: MIN_ENGLISH_PX,
    button: MIN_BUTTON_TEXT_PX,
    target: MIN_TARGET_PX,
  };
  for (const target of sizeTargets()) {
    await page.goto(cellUrl(target.path, target.key));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      target.key,
    );
    await expect(childScreens(page).first()).toBeVisible();
    const report = await page.evaluate((min) => {
      const out: string[] = [];
      const regions = document.querySelectorAll(
        'section[aria-label^="아이 화면 "]',
      );
      for (const region of regions) {
        const label = region.getAttribute("aria-label") ?? "";
        if ((region.textContent ?? "").includes("%")) out.push(`${label}: '%'`);
        for (const el of region.querySelectorAll("*")) {
          const size = Number.parseFloat(getComputedStyle(el).fontSize);
          const ownText = [...el.childNodes]
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent ?? "")
            .join("")
            .trim();
          if (ownText !== "") {
            const english = el.closest("[lang]")?.getAttribute("lang") === "en";
            const inChoice = el.closest("[data-choice]") !== null;
            const need = Math.max(
              english ? min.english : min.guide,
              inChoice ? min.button : 0,
            );
            if (size < need)
              out.push(`${label}: '${ownText}' ${size}px < ${need}px`);
          }
          if (el.matches("[data-choice]")) {
            const box = el.getBoundingClientRect();
            if (box.width < min.target || box.height < min.target) {
              out.push(`${label}: 누르는 곳 ${box.width}x${box.height}`);
            }
          }
          if (el.matches("[data-blank]")) {
            const box = el.getBoundingClientRect();
            if (box.height < min.target) {
              out.push(`${label}: 빈칸 높이 ${box.height}`);
            }
          }
        }
      }
      const root = document.documentElement;
      if (root.scrollWidth > root.clientWidth) {
        out.push(`가로 넘침 ${root.scrollWidth} > ${root.clientWidth}`);
      }
      return { regions: regions.length, out };
    }, limits);
    expect(report.regions, target.key).toBeGreaterThan(0);
    expect(report.out, target.key).toEqual([]);
    if (screenshotDir && target.shot) {
      // 개발 서버의 Next 개발 도구 단추가 사진에 겹치지 않게 숨긴다
      await page.addStyleTag({
        content: "nextjs-portal { display: none !important; }",
      });
      await screenByLabel(page, target.shot.label)
        .first()
        .screenshot({
          path: join(screenshotDir, `p05b-${target.shot.name}.png`),
        });
    }
  }
});

test("시드 보기: 풀이 검사 표 · 표본 검토 행 · 규격이 깨진 칸 · 쓰기 · 말하기 평가 문항이 그려진다", async ({
  page,
}) => {
  // 풀이 검사 표(해시가 맞는 기록)와 사람 확인, 표본 검토 행
  await page.goto(cellUrl(reading1.path, reading1.key));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    reading1.key,
  );
  await expect(page.locator("header[data-cell-head]")).toContainText(
    "사람 확인",
  );
  const solve = page.getByRole("table", { name: "풀이 검사" });
  await expect(solve.getByRole("row")).toHaveCount(
    1 + reading1.lesson.content.questions.length,
  );
  for (const text of ["같음", "다름", "답이 여럿", "정답 맞음"]) {
    await expect(solve).toContainText(text);
  }
  const reviewRow = reading1Review.rows[0];
  const reviews = page.getByRole("table", { name: "표본 검토" });
  await expect(reviews.getByRole("row")).toHaveCount(2);
  await expect(reviews).toContainText("오류");
  await expect(reviews).toContainText(reviewRow?.memo ?? "-");
  await expect(reviews).toContainText(reviewRow?.date ?? "-");

  // 해시가 다른 기록 · 칸 전체 검토 행(견본 나무의 읽기 4단계)
  const reading4 = lessonOf<ReadingLesson>("reading", 4);
  await page.goto(cellUrl(reading4.path, reading4.key));
  await expect(
    page.getByText("내용이 바뀌어 풀이 검사가 안 됐어요"),
  ).toBeVisible();
  const reviews4 = page.getByRole("table", { name: "표본 검토" });
  await expect(reviews4).toContainText("알맞음");
  await expect(reviews4).toContainText("칸 전체");

  // 규격이 깨진 칸은 날 JSON 과 그 칸의 규격 오류
  await page.goto(fileUrl(brokenPath));
  await expect(
    page.getByRole("link", { name: brokenKey, exact: true }),
  ).toHaveCount(1);
  await page.goto(cellUrl(brokenPath, brokenKey));
  await expect(page.getByText("규격이 깨진 칸이에요")).toBeVisible();
  await expect(page.locator("pre")).toContainText(brokenLesson.title);
  await expect(childScreens(page)).toHaveCount(0);

  // 쓰기 평가: 빈칸 채우기 · 문장 고치기 · 작문(AI 과제)
  const writingPath = levelTestFilePath("writing", 4);
  const [fill, fix, composition] = writingTest.forms[0]?.items ?? [];
  if (
    fill?.type !== "fill-blank" ||
    fix?.type !== "fix-sentence" ||
    composition?.type !== "composition"
  ) {
    throw new Error("쓰기 평가 견본 꼴");
  }
  await page.goto(cellUrl(writingPath, testCellKey(writingTest, fill.no)));
  await expect(childScreen(page, 1)).toContainText("a cat.");
  await expect(childScreen(page, 1).locator("[data-blank]")).toHaveCount(1);
  await expect(
    childScreen(page, 1).locator('[data-correct="true"]'),
  ).toContainText(fill.accepted[0] ?? "-");
  await expect(extrasOf(page, 1)).toContainText("아니오(앱 채점)");
  await page.goto(cellUrl(writingPath, testCellKey(writingTest, fix.no)));
  await expect(childScreen(page, 1)).toContainText(fix.prompt);
  await page.goto(
    cellUrl(writingPath, testCellKey(writingTest, composition.no)),
  );
  await expect(childScreen(page, 1)).toContainText(composition.task);
  await expect(childScreen(page, 1)).toContainText(composition.example ?? "-");
  await expect(extrasOf(page, 1)).toContainText("예(실시간 채점)");

  // 말하기 평가: 질문(6단계라 한국어 뜻을 보이지 않음, AI 과제) · 발표(쓸 말은 글 줄)
  const speakingPath = levelTestFilePath("speaking", 6);
  const [question, presentation] = speakingTest.forms[0]?.items ?? [];
  if (question?.type !== "question" || presentation?.type !== "presentation") {
    throw new Error("말하기 평가 견본 꼴");
  }
  await page.goto(
    cellUrl(speakingPath, testCellKey(speakingTest, question.no)),
  );
  await expect(childScreen(page, 1)).toContainText(question.en);
  await expect(childScreen(page, 1)).not.toContainText(question.ko ?? "-");
  await expect(extrasOf(page, 1)).toContainText("예(실시간 채점)");
  await page.goto(
    cellUrl(speakingPath, testCellKey(speakingTest, presentation.no)),
  );
  await expect(childScreen(page, 1).getByRole("listitem")).toHaveCount(
    presentation.prepWords.length,
  );
  await expect(childScreen(page, 1).getByRole("button")).toHaveCount(0);

  // 이름표의 '문항 k' 는 itemsOf 번호와 같다(말하기 1단계 수업)
  const speaking1 = lessonOf<SpeakingLesson>("speaking", 1);
  const cell = cellsOf(speaking1.path).find((c) => c.key === speaking1.key);
  if (!cell) throw new Error("말하기 1단계 칸 없음");
  await page.goto(cellUrl(speaking1.path, speaking1.key));
  const labels = await page
    .getByRole("region", { name: /^활동 \d+ · .+ · 문항 \d+$/ })
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const id = node.getAttribute("aria-labelledby") ?? "";
        return document.getElementById(id)?.textContent ?? "";
      }),
    );
  expect(labels.map((label) => Number(/문항 (\d+)$/.exec(label)?.[1]))).toEqual(
    itemsOf(cell).map((item) => item.no),
  );
});

test("활동 표시: 지문 그림 · 새 단어 표시 · 소리 자리 · 글자 채우기 단서 · 한국어 뜻 단계 · 쓸 말 글 줄 · 정답 표시", async ({
  page,
}) => {
  // 읽기 4단계 지문: 새 단어 가운데 그림 카탈로그에 있는 것 최대 4개, 새 단어만 표시, '읽어 주기'
  const reading4 = lessonOf<ReadingLesson>("reading", 4);
  const pictured = reading4.lesson.newWords
    .filter((word) => vocab.get(word)?.imageKey !== undefined)
    .slice(0, PASSAGE_PICTURE_MAX);
  expect(pictured.length).toBeGreaterThan(0);
  await page.goto(cellUrl(reading4.path, reading4.key));
  const passage = screenByLabel(page, activityLabel("지문"));
  await expect(passage.locator("[data-passage-picture]")).toHaveCount(
    pictured.length,
  );
  for (const word of pictured) {
    await expect(passage.locator("[data-passage-picture]")).toContainText([
      vocab.get(word)?.meaningKo ?? "-",
    ]);
  }
  await expect(passage.getByRole("button", { name: "읽어 주기" })).toHaveCount(
    1,
  );
  const marked = new Set([
    ...reading4.lesson.newWords,
    ...reading4.lesson.content.targetWords,
  ]);
  const markable = new Set(
    reading4.lesson.content.glossary
      .filter((g) => !g.proper && marked.has(g.lemma))
      .map((g) => g.surface),
  );
  const shown = await passage.locator("[data-new-word]").allTextContents();
  expect(shown.length).toBeGreaterThan(0);
  for (const text of shown) expect(markable.has(text), text).toBe(true);
  // 새 단어 미리보기: 낱말마다 '다시 듣기'
  await expect(
    screenByLabel(page, activityLabel("새 단어 미리보기")).getByRole("button", {
      name: "다시 듣기",
    }),
  ).toHaveCount(reading4.lesson.preview.length);
  // 정답 표시: ✓ 는 '정답' 그림, 바탕은 카드(영역 색)와 다르다
  const question = screenByLabel(page, activityLabel("문항", 1));
  const correct = question.locator('[data-correct="true"]');
  await expect(correct.getByRole("img", { name: "정답" })).toHaveCount(1);
  const colors = await correct.evaluate((el) => {
    let card: Element | null = el.parentElement;
    while (card && !card.hasAttribute("data-activity-card")) {
      card = card.parentElement;
    }
    return {
      choice: getComputedStyle(el).backgroundColor,
      card: card ? getComputedStyle(card).backgroundColor : "",
    };
  });
  expect(colors.card).not.toBe("");
  expect(colors.choice).not.toBe(colors.card);

  // 그림 보기: 정답 칸도 그림이 다른 칸과 같은 자리(✓ 는 모서리에 겹침)
  const reading1Lesson = reading1.lesson;
  await page.goto(cellUrl(reading1.path, reading1.key));
  const pictureQuestion = screenByLabel(page, activityLabel("문항", 1));
  const offsets = await pictureQuestion
    .locator("[data-choice]")
    .evaluateAll((buttons) =>
      buttons.map((button) => {
        const picture = button.querySelector(
          "[data-picture-missing], img",
        ) as HTMLElement | null;
        const a = button.getBoundingClientRect();
        const b = picture?.getBoundingClientRect();
        return b ? Math.round(b.left - a.left) : -1;
      }),
    );
  expect(offsets.length).toBe(
    reading1Lesson.content.questions[0]?.options.length,
  );
  expect(new Set(offsets).size).toBe(1);
  // 읽기 1단계 지문에도 그림 줄이 있다
  await expect(
    screenByLabel(page, activityLabel("지문")).locator(
      "[data-passage-picture]",
    ),
  ).not.toHaveCount(0);

  // 수업 지문에는 '읽어 주기'가 하나 있다
  await page.goto(cellUrl(reading4.path, reading4.key));
  await expect(
    screenByLabel(page, activityLabel("지문")).getByRole("button", {
      name: "읽어 주기",
    }),
  ).toHaveCount(1);
  // 단계 평가 · 배치 읽기 지문(4절 '평가 화면은 B_LevelTest', '평가 중에는 힌트와 뜻 보기가 없다'):
  // '읽어 주기' 없음, 그림은 파일이 있는 것만 꾸밈 그림(alt 비움)으로 — 견본은 그림 파일이 없어 그림 자리 · 뜻 글이 없다
  const [testCell] = cellsOf("level-tests/reading/4.json");
  if (!testCell) throw new Error("읽기 평가 칸 없음");
  await page.goto(cellUrl(testCell.file, testCell.key));
  const testScreen = childScreen(page, 1);
  await expect(
    testScreen.getByRole("button", { name: "읽어 주기" }),
  ).toHaveCount(0);
  await expect(testScreen.locator("[data-passage-picture]")).toHaveCount(0);
  await expect(testScreen.locator("[data-picture-missing]")).toHaveCount(0);
  expect(await testScreen.textContent()).not.toMatch(/[가-힣]/);

  // 쓰기 1단계 글자 채우기: 단어 그림(없으면 뜻)과 '다시 듣기'
  const writing1 = lessonOf<WritingLesson>("writing", 1);
  await page.goto(cellUrl(writing1.path, writing1.key));
  if (writing1.lesson.content.shape !== "items")
    throw new Error("쓰기 1단계 꼴");
  const fills = writing1.lesson.content.items
    .map((item, i) => ({ item, no: i + 1 }))
    .filter(({ item }) => item.type === "fill-letters");
  expect(fills.length).toBeGreaterThan(0);
  for (const { item, no } of fills) {
    if (item.type !== "fill-letters") continue;
    const screen = screenByLabel(page, activityLabel("문항", no));
    await expect(screen).toContainText(vocab.get(item.word)?.meaningKo ?? "-");
    await expect(screen.getByRole("button", { name: "다시 듣기" })).toHaveCount(
      1,
    );
  }

  // 한국어 뜻: 말하기 1단계 질문은 보이고(C39), 토리 이야기 1~3 구간은 보이고 7~9 구간은 보이지 않는다
  const speaking1 = lessonOf<SpeakingLesson>("speaking", 1);
  const firstQuestion = speaking1.lesson.content.questions[0];
  await page.goto(cellUrl(speaking1.path, speaking1.key));
  await expect(
    screenByLabel(page, /^활동 \d+ · 질문 · 문항 \d+$/).first(),
  ).toContainText(firstQuestion?.ko ?? "-");
  const earlyStory = tree.stories[0]?.stories[0];
  expect(STORY_KO_BANDS).toContain("1-3");
  await page.goto(
    cellUrl(
      storyFilePath("1-3"),
      cellKey({ type: "story", band: "1-3", no: 1 }),
    ),
  );
  await expect(screenByLabel(page, activityLabel("이야기"))).toContainText(
    earlyStory?.textKo ?? "-",
  );
  await expect(
    screenByLabel(page, activityLabel("이야기")).locator(
      "[data-passage-picture]",
    ),
  ).toHaveCount(0);
  expect(STORY_KO_BANDS).not.toContain("7-9");
  await page.goto(
    cellUrl(
      storyFilePath("7-9"),
      cellKey({ type: "story", band: "7-9", no: 1 }),
    ),
  );
  await expect(screenByLabel(page, activityLabel("이야기"))).not.toContainText(
    lateStories.stories[0]?.textKo ?? "-",
  );
  await expect(extrasByLabel(page, activityLabel("이야기"))).toContainText(
    lateStories.stories[0]?.textKo ?? "-",
  );

  // 문장 틀 빈칸: 바탕이 보이는 상자이고 밑줄(상자 바닥)이 글 바닥과 나란하다(56px 높이는 크기 시험)
  const writing4 = lessonOf<WritingLesson>("writing", 4);
  await page.goto(cellUrl(writing4.path, writing4.key));
  const sentence = screenByLabel(page, activityLabel("문장", 1));
  const blankFit = await sentence
    .locator("[data-blank]")
    .first()
    .evaluate((blank) => {
      const line = blank.parentElement;
      const text = [...(line?.children ?? [])].find(
        (el) =>
          el !== blank &&
          !el.hasAttribute("data-blank") &&
          (el.textContent ?? "").trim() !== "",
      );
      const style = getComputedStyle(blank);
      return {
        background: style.backgroundColor,
        gap: text
          ? Math.abs(
              blank.getBoundingClientRect().bottom -
                text.getBoundingClientRect().bottom,
            )
          : -1,
        fontPx: Number.parseFloat(getComputedStyle(line ?? blank).fontSize),
      };
    });
  expect(blankFit.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(blankFit.gap).toBeGreaterThanOrEqual(0);
  // 글 상자 바닥과의 차이가 글자 크기의 1/4 보다 작다(지난번 약 22px 처짐)
  expect(blankFit.gap).toBeLessThan(blankFit.fontPx / 4);

  // 발표 생각 화면의 쓸 말은 누르는 버튼이 아니라 글 줄이다
  const speaking10 = lessonOf<SpeakingLesson>("speaking", 10);
  await page.goto(cellUrl(speaking10.path, speaking10.key));
  const prep = screenByLabel(page, /^활동 \d+ · 발표 · 문항 \d+$/);
  await expect(prep.getByRole("button")).toHaveCount(0);
  await expect(prep.getByRole("listitem")).toHaveCount(
    speaking10.lesson.content.presentation?.prepWords.length ?? -1,
  );
});
