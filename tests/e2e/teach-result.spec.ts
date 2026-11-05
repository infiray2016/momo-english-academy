// 결과 첫머리 되짚기 e2e(가르치고 배우는 수업 plan 묶음 라-4 · 정본 03:26 세션 결과 행 · 03:80 세션 결과(되짚기) 행 · 델타 spec 설계 5 ·
// 15절 AC-6f). 3단계 단원 1 세 영역 정규 시드의 첫 수업(teach 칸이 든 수업)을 lessons 행으로 넣고, 끝낸 세션 하나와 그 세션 미리보기 시도
// (보인 단어)를 바로 넣어 결과 화면을 연다. 혼자 문항 시도가 없으니 유효 문항 0 — 마무리 줄은 closeKoPracticed 다(AC-6g 셈은 단위 시험 몫).
// 보는 것: 본 열 맨 위 초상 · 이름표 · 마무리 한 줄, '오늘 만난 말' 칸의 단원 단어(보인 차례) · 소리 단추, 칩을 단 문장 틀 · '다시 듣기',
// 들리는 차례(마무리 → 단원 단어 → 문장 틀), 다시 하기 결과에는 되짚기 · 오늘 만난 말이 없음. 가짜 음성은 ko-KR 목소리가 있는 대본이다.
// 상태: '작성됨'(tsc · lint) — 이 Mac 에서는 돌릴 수 없고(내장 Postgres, plan 위험 7) 11-01 뒤 CI e2e 첫 실행에서 확인한다.
import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import type { Area } from "../../src/core/seed/structure";
import { LEVEL_MAX } from "../../src/core/seed/structure";
import { attempts } from "../../src/db/schema/learning";
import { teachSeedLessons } from "../fixtures/seed/builders";
import {
  closeE2eDb,
  e2eDb,
  insertSessions,
  resetHousehold,
  withHouseholdSetting,
} from "./db";
import { expect, loadSpeechScript, test } from "./fixtures";
import { insertHousehold } from "./household";
import { E2E_LESSON_NO, insertSampleLesson } from "./lessons";
import { photo } from "./photos";
import { speechRecord } from "./talk";

/** 화면 글(정본 · 델타 spec 설계 5 문구 표 · 4절 단추 글 그대로). */
const T = {
  done: "수업을 끝냈어요!",
  metWords: "오늘 만난 말",
  talkMetWords: "오늘 만난 단어",
  listenAgain: "다시 듣기",
  listenWord: "단어 듣기",
  retried: "다시 했어요",
  home: "홈",
  minaTag: "미나 선생님",
} as const;
/** 가르치는 수업 견본 칸(정규 시드 3단계 단원 1). */
const TEACH_LEVEL = 3;
const TEACH_UNIT = 1;
/** 가르치는 수업의 미리보기 활동 번호(오늘 배울 것 다음 — 결과는 시도 꼴 kind 로 찾으므로 번호는 기록용). */
const PREVIEW_ACTIVITY = 2;
/** 시도 꼴 판(core/session/attempt INPUT_VERSION). */
const INPUT_V2 = 2;
/** 잠금 풀기 발화(음성 접점이 누름 처리에서 읽는 빈 글). */
const UNLOCK_TEXT = " ";
/** 되짚기를 다 읽을 때까지의 여유(마무리 · 단어 · 문장 틀 — 가짜 발화 1.2초씩, 시험 값). */
const READ_ALL_MS = 40_000;

type TeachArea = Exclude<Area, "talk">;

test.use({ speechScript: loadSpeechScript("ko-voice") });
test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

/** 3단계에서 시작한 집(미나를 고름)에서 fn 을 돌린다(시드 범위 끝을 그동안만 마지막 단계로). */
async function atTeachLevel<T>(
  area: TeachArea,
  fn: (profileId: string) => Promise<T>,
): Promise<T> {
  return withHouseholdSetting(
    "seed.complete_through_level",
    LEVEL_MAX,
    async () => {
      const { profileId } = await insertHousehold({
        startLevels: { [area]: TEACH_LEVEL },
        teacherKey: "mina",
      });
      return fn(profileId);
    },
  );
}

/** 가르치는 수업 하나를 넣고, 끝낸 세션과 그 미리보기 시도(보인 단어)를 넣는다. */
async function insertTeachResult(
  area: TeachArea,
  profileId: string,
  kind: "regular" | "retry" = "regular",
) {
  const lesson = teachSeedLessons()[area];
  const row = await insertSampleLesson({
    sample: { area, level: TEACH_LEVEL, unit: TEACH_UNIT, lesson },
    lessonNo: E2E_LESSON_NO.teach,
  });
  const at = new Date();
  const [sessionId] = await insertSessions([
    {
      profileId,
      area,
      level: TEACH_LEVEL,
      unit: TEACH_UNIT,
      lessonId: row.id,
      kind,
      status: "completed",
      startedAt: at,
      completedAt: at,
      learningDay: at.toISOString().slice(0, 10),
      seedRevision: row.revision,
      seedCorrection: row.correction,
      score: 1,
    },
  ]);
  if (!sessionId) throw new Error("끝낸 세션 없음");
  const words = lesson.preview.map((p) => p.word);
  await e2eDb()
    .insert(attempts)
    .values({
      sessionId,
      clientAttemptId: randomUUID(),
      activityNo: PREVIEW_ACTIVITY,
      input: {
        v: INPUT_V2,
        kind: "preview",
        step: "final",
        shownWords: words,
      },
      attemptedAt: at,
      status: "done",
    });
  const recap = lesson.teach?.recap;
  if (!recap) throw new Error(`${area} 견본 수업에 teach.recap 없음`);
  return { sessionId, words, recap };
}

/** 읽어 준 글(잠금 풀기 빈 글 뺌). */
async function spokenTexts(page: Page): Promise<string[]> {
  return (await speechRecord(page)).spoken.filter((t) => t !== UNLOCK_TEXT);
}

for (const area of ["reading", "writing", "speaking"] as const) {
  test(`AC-6f ${area} 결과 첫머리: 초상 · 마무리 한 줄 · 오늘 만난 말(단원 단어 · 소리 단추 · 칩을 단 문장 틀 · '다시 듣기')이고 마무리 → 단원 단어 → 문장 틀 차례로 읽는다`, async ({
    page,
  }) => {
    test.setTimeout(READ_ALL_MS * 2);
    await atTeachLevel(area, async (profileId) => {
      const { sessionId, words, recap } = await insertTeachResult(
        area,
        profileId,
      );
      await page.goto(`/result/${sessionId}`);
      await expect(page.locator("[data-result][data-hydrated]")).toHaveCount(1);
      const board = page.locator('[data-family-board="result"]');
      const head = board.locator("[data-recap-head]");
      // 첫머리: 초상 · 이름표 · 마무리 한 줄(근거가 없으니 '배우고 연습했어요' 줄)
      await expect(head).toBeVisible();
      await expect(head.locator("[data-teacher-line]")).toBeVisible();
      await expect(head.getByText(T.minaTag)).toBeVisible();
      await expect(head.getByText(recap.closeKoPracticed)).toBeVisible();
      await expect(head.getByText(recap.closeKo)).toHaveCount(0);
      // 세로: 첫머리가 '수업을 끝냈어요!' 위(본 열 맨 위)
      const title = board.getByRole("heading", { name: T.done });
      const h = await head.boundingBox();
      const t = await title.boundingBox();
      if (!h || !t) throw new Error("상자 없음");
      expect(h.y + h.height).toBeLessThanOrEqual(t.y);
      // 오늘 만난 말: 이름 · 단원 단어(보인 차례) · 소리 단추
      const met = board.locator("[data-met-words]");
      await expect(met.getByText(T.metWords, { exact: true })).toBeVisible();
      await expect(page.getByText(T.talkMetWords)).toHaveCount(0);
      const cards = met.locator("[data-met-word]");
      await expect(cards).toHaveCount(words.length);
      expect(
        await cards.evaluateAll((els) =>
          els.map((el) => el.getAttribute("data-met-word")),
        ),
      ).toEqual(words);
      await expect(met.getByRole("button", { name: T.listenWord })).toHaveCount(
        words.length,
      );
      // 칩을 단 문장 틀 · '다시 듣기'
      const frame = met.locator("[data-recap-frame]");
      await expect(frame).toBeVisible();
      await expect(frame.locator("[data-chip-role]")).toHaveCount(
        recap.chips.length,
      );
      const listenAgain = frame.getByRole("button", { name: T.listenAgain });
      // 들리는 차례: 마무리(한국어) → 단원 단어 → 문장 틀. 다 읽으면 단추가 밝다
      await expect
        .poll(async () => (await spokenTexts(page)).includes(recap.frameEn), {
          timeout: READ_ALL_MS,
        })
        .toBe(true);
      await expect(listenAgain).toBeEnabled();
      const spoken = await spokenTexts(page);
      const lineAt = spoken.findIndex(
        (s) => s.trim() !== "" && recap.closeKoPracticed.includes(s.trim()),
      );
      const wordAt = words.map((w) => spoken.indexOf(w));
      const frameAt = spoken.indexOf(recap.frameEn);
      expect(lineAt).toBeGreaterThanOrEqual(0);
      for (const at of wordAt) expect(at).toBeGreaterThan(lineAt);
      expect(wordAt).toEqual([...wordAt].sort((a, b) => a - b));
      expect(frameAt).toBeGreaterThan(Math.max(...wordAt));
      // '다시 듣기'는 문장 틀을, 소리 단추는 그 낱말을 다시 읽는다
      await listenAgain.click();
      await expect
        .poll(async () => (await spokenTexts(page)).at(-1))
        .toBe(recap.frameEn);
      const first = words[0];
      if (first) {
        await met
          .locator(`[data-met-word="${first}"]`)
          .getByRole("button", { name: T.listenWord })
          .click();
        await expect
          .poll(async () => (await spokenTexts(page)).at(-1))
          .toBe(first);
      }
      // 판 꼴은 그대로: 단추 줄에 '홈'(작은)
      await expect(
        board
          .locator("[data-result-buttons]")
          .getByRole("link", { name: T.home }),
      ).toBeVisible();
      await photo(page, `teach-result-${area}`);
    });
  });
}

test("AC-6f 다시 하기 결과는 '다시 했어요'이고 첫머리에 초상 · 마무리 한 줄이 있으며(그 줄만 읽음), 오늘 만난 말이 없다", async ({
  page,
}) => {
  test.setTimeout(READ_ALL_MS * 2);
  await atTeachLevel("reading", async (profileId) => {
    const { sessionId, words, recap } = await insertTeachResult(
      "reading",
      profileId,
      "retry",
    );
    await page.goto(`/result/${sessionId}`);
    await expect(page.locator("[data-result][data-hydrated]")).toHaveCount(1);
    await expect(page.getByText(T.retried)).toBeVisible();
    // 정본 03:26 이 다시 하기에서 바꾸는 것은 '별 대신 다시 했어요' · '오늘 만난 말 없음' 둘뿐 — 첫머리 되짚기는 있다(fix 1 I1)
    const head = page.locator("[data-recap-head]");
    await expect(head).toBeVisible();
    await expect(head.getByText(T.minaTag)).toBeVisible();
    await expect(head.getByText(recap.closeKoPracticed)).toBeVisible();
    await expect(page.locator("[data-met-words]")).toHaveCount(0);
    await expect(page.locator("[data-recap-frame]")).toHaveCount(0);
    await expect(page.getByText(T.metWords)).toHaveCount(0);
    // 읽는 것은 마무리 한 줄뿐(단원 단어 · 문장 틀을 읽지 않는다)
    await expect
      .poll(
        async () =>
          (await spokenTexts(page)).some(
            (s) => s.trim() !== "" && recap.closeKoPracticed.includes(s.trim()),
          ),
        { timeout: READ_ALL_MS },
      )
      .toBe(true);
    const spoken = await spokenTexts(page);
    expect(spoken).not.toContain(recap.frameEn);
    for (const word of words) expect(spoken).not.toContain(word);
  });
});
