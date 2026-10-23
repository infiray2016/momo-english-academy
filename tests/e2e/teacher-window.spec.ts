// 회화 세션 선생님 창 e2e(선생님 화면 plan 차례 7 — 증명 표 AC-19c 창 · 말풍선 접근 이름 · AC-19g · AC-19h 초상 몫 · AC-19j 화면 몫, 4절 회화
// 세션 '선생님 창' 행 · 7절 읽어 주기 행). 기본 프로젝트는 WebGL 을 끈 채(fixtures webgl off) 돌아 창이 늘 초상이다 — 3D 는 d9.
// 차례 8(d8): 대신 표시 AC-19i 기본 몫 — WebGL 없음(no-webgl) · 설정(talk.teacher_render=portrait → setting)에서 초상 · 까닭 속성 ·
// 오류 글 · 새 단추 없음 · 모델(.vrm) 요청 0 · 그만하기 → 정리 → 마무리까지, 관찰 쪽 '3D 보기'의 까닭 칸.
// 선생님 상태는 쪽 안 기록(MutationObserver — data-teacher-state 바뀜)과 가짜 읽어 주기의 시작 · 끝 · 오류 사건을 같은 시계로 남겨 견준다.
// 회화 턴은 가짜 Anthropic SSE(talkReply), 듣기는 가짜 Web Speech 대본. 숫자는 시험용 설정 · 명단에서 읽는다. 아이 이름은 지어낸 값이다.
// 녹음하지 않는다. 화면 검토 사진은 E2E_PHOTOS 때만(teacher-window-…).
import type { BrowserContext, Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import teachersFile from "../../seed/teachers.json";
import { PROBE_TEXT } from "../../src/app/dev/teacher-probe/probe-text";
import { MORE_PROMPT } from "../../src/core/conversation/flow";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import type { TalkCard } from "../../src/core/seed/schema/talk";
import { RESULT_PHRASES } from "../../src/core/speaking/judge";
import type {
  RecognitionRun,
  SpeechScript,
  UtteranceRun,
} from "../../src/core/speech/script";
import type { TeacherLayerSignal } from "../../src/core/teacher/layer";
import { lessons } from "../../src/db/schema/content";
import { TEST_SETTINGS } from "../fixtures/settings";
import { CHILD_VIEWPORTS } from "./child-size";
import {
  closeE2eDb,
  e2eDb,
  insertSessions,
  resetHousehold,
  withHouseholdSetting,
} from "./db";
import { fakeAiRequests, pushFakeAi, resetFakeAi } from "./fake-ai";
import { expect, speechPage, test } from "./fixtures";
import { insertHousehold } from "./household";
import { photo } from "./photos";
import {
  fullTalkLesson,
  insertTalkLesson,
  openTalkSession,
  reachSafetyCap,
  saidRun,
  speechRecord,
  TURN_MARK,
  talkHousehold,
  talkReply,
  talkScript,
} from "./talk";

/** 화면 글(문구 표 TEACHER_TEXT 와 같은 글 — 회화 시험 집의 선생님은 미나). */
const T = {
  start: "시작!",
  micOk: "알겠어요",
  window: "미나 선생님",
  replay: "미나 말 다시 듣기",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  rest: "미나가 잠깐 쉬어요",
  next: "다음",
  stopYes: "그만할래요",
} as const;
const MINA = teachersFile.teachers.find((t) => t.key === "mina");
if (!MINA) throw new Error("명단에 미나가 없다");
const MS = 1000;
const PRAISE_MS = TEST_SETTINGS["talk.teacher_praise_seconds"].value * MS;
/** 1~3단계 읽어 주기 빠르기(speech.rate.1-3, C125). */
const LOW_BAND_RATE = TEST_SETTINGS["speech.rate.1-3"].value;
/** talkScript 의 가짜 목소리(명단 voice.prefer 가 비어 pickVoice 가 고름). */
const TEST_VOICE = "Test English (US)";
/** 잠금 풀기 읽어 주기 글(src/lib/speech/browser.ts UNLOCK_TEXT 와 같은 글 — 모듈 상수라 다시 적음). */
const UNLOCK_TEXT = " ";
/** 한 시험 시간(듣기 끝 조용함 · 인식 확인 · 느린 읽어 주기를 여럿 기다림). */
const LONG = 180_000;
/** 느린 흘려 받기 · 읽기가 끝날 때까지의 여유(시험 값). */
const STREAM_END_MS = 30_000;
/** 읽어 주기 결과 뒤 선생님 상태가 말하기를 벗어날 때까지 주는 틈(ms, 시험 값 — React 가 다시 그리는 시간). */
const SETTLE_STATE_MS = 400;
/** 들어올 때의 읽기가 듣기보다 먼저 돌 틈(회화 e2e 와 같은 값). */
const SETTLE_MS = 250;
const MIC_STATE_KEY = "momo.mic.v1";
/** 긴 흐름 시험의 듣기 끝 조용함 · 인식 확인(초, 시험 값 — 회화 e2e withFastTurns 와 같은 값). */
const FAST_SILENCE_SECONDS = 0.3;
const FAST_CONFIRM_SECONDS = 0.2;

test.beforeEach(async () => {
  await resetHousehold();
  await resetFakeAi();
});
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

// ── 쪽 안 기록: 선생님 상태 바뀜 · 읽어 주기 사건(같은 시계 performance.now) ──

type LogEntry =
  | { at: number; kind: "state"; value: string }
  | { at: number; kind: "speak"; id: number; text: string }
  | { at: number; kind: "start" | "end" | "error"; id: number; text: string };

/**
 * 쪽 시작 스크립트(밖 이름을 쓰지 않는다 — Playwright 가 함수 글을 옮김). 선생님 창의 data-teacher-state 가 바뀔 때마다, 가짜
 * speechSynthesis 의 speak · 발화 start · end · error 마다 한 줄. 가짜 음성은 다른 시작 스크립트라 쪽 글이 읽힌 뒤(DOMContentLoaded) 감싼다.
 */
function installTeacherLog(): void {
  type Entry =
    | { at: number; kind: "state"; value: string }
    | { at: number; kind: "speak"; id: number; text: string }
    | {
        at: number;
        kind: "start" | "end" | "error";
        id: number;
        text: string;
      };
  const log: Entry[] = [];
  (window as unknown as { __teacherLog: Entry[] }).__teacherLog = log;
  // 그림 층 사건(momo:teacher — d8)
  const signals: unknown[] = [];
  (window as unknown as { __teacherSignals: unknown[] }).__teacherSignals =
    signals;
  window.addEventListener("momo:teacher", (event) =>
    signals.push((event as CustomEvent).detail),
  );
  let last: string | null = null;
  const look = () => {
    const el = document.querySelector("[data-teacher-window]");
    const value = el ? el.getAttribute("data-teacher-state") : null;
    if (value === last) return;
    last = value;
    log.push({ at: performance.now(), kind: "state", value: value ?? "none" });
  };
  new MutationObserver(look).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-teacher-state"],
  });
  let n = 0;
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const synth = window.speechSynthesis as unknown as
        | { speak(u: EventTarget & { text: string }): void }
        | undefined;
      if (!synth) return;
      const speak = synth.speak.bind(synth);
      synth.speak = (u) => {
        n += 1;
        const id = n;
        log.push({ at: performance.now(), kind: "speak", id, text: u.text });
        for (const kind of ["start", "end", "error"] as const)
          u.addEventListener(kind, () =>
            log.push({ at: performance.now(), kind, id, text: u.text }),
          );
        speak(u);
      };
    },
    { once: true },
  );
}

/** 그림 층 사건(momo:teacher) 기록. */
async function teacherSignals(page: Page): Promise<TeacherLayerSignal[]> {
  return page.evaluate(
    () =>
      (window as unknown as { __teacherSignals: TeacherLayerSignal[] })
        .__teacherSignals,
  );
}

/** 모델(.vrm) 요청 수를 센다(쪽을 열기 전에 단다). */
function countModelRequests(page: Page): () => number {
  let n = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith(".vrm")) n += 1;
  });
  return () => n;
}

/** 아이 화면에 3D 오류 글 · 다시 불러오기 단추가 없다(C122). */
async function expectNoLayerError(page: Page) {
  await expect(page.getByText(/불러오|오류|3D|WebGL/)).toHaveCount(0);
  await expect(teacherWindow(page).getByRole("button")).toHaveCount(0);
}

async function teacherLog(page: Page): Promise<LogEntry[]> {
  return page.evaluate(
    () => (window as unknown as { __teacherLog: LogEntry[] }).__teacherLog,
  );
}

/**
 * 말하기 상태가 실제로 시작한 발화 동안에만 있는가(AC-19g): (1) 상태가 speaking 으로 바뀐 때 시작했고 아직 결과가 없는 발화(잠금 풀기 빼고)가
 * 있어야 하고, (2) 시작한 발화가 모두 결과(끝 · 취소 · 오류)를 낸 뒤 SETTLE_STATE_MS 안에 새 시작이 없으면 그때 상태는 speaking 이 아니다.
 * 어긋난 곳을 글로 돌려준다(비면 통과).
 */
function speakingProblems(log: readonly LogEntry[]): string[] {
  const problems: string[] = [];
  const started = new Set<number>();
  const stateAt = (t: number) =>
    [...log]
      .filter((e) => e.kind === "state" && e.at <= t)
      .map((e) => (e.kind === "state" ? e.value : ""))
      .at(-1) ?? "none";
  for (const [i, e] of log.entries()) {
    if (e.kind === "start" && e.text !== UNLOCK_TEXT) started.add(e.id);
    if ((e.kind === "end" || e.kind === "error") && started.delete(e.id)) {
      if (started.size > 0) continue;
      const nextStart = log
        .slice(i + 1)
        .find((x) => x.kind === "start" && x.text !== UNLOCK_TEXT);
      const check = e.at + SETTLE_STATE_MS;
      if (nextStart && nextStart.at <= check) continue;
      const lastAt = log.at(-1)?.at ?? 0;
      if (check > lastAt) continue; // 기록이 그만큼 이어지지 않음(부르는 쪽이 기다린 뒤 읽는다)
      if (stateAt(check) === "speaking")
        problems.push(`발화 ${e.id}(${e.kind}) 뒤에도 말하기`);
    }
    if (e.kind === "state" && e.value === "speaking" && started.size === 0)
      problems.push(`시작한 발화 없이 말하기(${Math.round(e.at)}ms)`);
  }
  return problems;
}

const statesOf = (log: readonly LogEntry[]) =>
  log.flatMap((e) => (e.kind === "state" ? [e.value] : []));

// ── 여는 길 ──

const teacherWindow = (page: Page) => page.locator("[data-teacher-window]");
const bubble = (page: Page) => page.locator("[data-tori-bubble]");
const childTurn = (page: Page) => page.locator("[data-child-turn]");

/** 회화 e2e 대본에 읽어 주기 꼴(발화마다 차례, 모자라면 마지막을 되풀이)을 바꿔 넣는다. */
function withUtterances(
  script: SpeechScript,
  utterances: UtteranceRun[],
): SpeechScript {
  if (!script.synthesis) throw new Error("talkScript 꼴");
  return { ...script, synthesis: { ...script.synthesis, utterances } };
}

type Opened = { page: Page; sessionId: string; card: TalkCard };

/** 회화 견본 수업의 진행 세션을 열고(쪽 안 기록을 단 쪽) 그 쪽으로 간다. '시작!'은 누르지 않는다. */
async function openWindowTalk(
  context: BrowserContext,
  runs: RecognitionRun[],
  {
    lesson,
    utterances,
    beforeGoto,
  }: {
    lesson?: TalkLesson;
    utterances?: UtteranceRun[];
    beforeGoto?: (page: Page) => Promise<void>;
  } = {},
): Promise<Opened> {
  const profileId = await talkHousehold(1);
  const row = await insertTalkLesson(
    lesson ? { level: 1, lesson } : { level: 1 },
  );
  const sessionId = await openTalkSession(profileId, row);
  const script = talkScript(runs);
  const page = await speechPage(
    context,
    utterances ? withUtterances(script, utterances) : script,
  );
  await page.addInitScript(installTeacherLog);
  await beforeGoto?.(page);
  await page.goto(`/session/${sessionId}`);
  return { page, sessionId, card: (row.content as TalkLesson).card };
}

/** '시작!' → 처음 마이크 안내 '알겠어요'. */
async function pastStart(page: Page) {
  await expect(page.locator("[data-talk-start]")).toBeVisible();
  await page.getByRole("button", { name: T.start }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
}

async function untilChildTurn(page: Page) {
  await expect(childTurn(page)).toBeVisible({ timeout: STREAM_END_MS });
  await page.waitForTimeout(SETTLE_MS);
}

/** 회화 턴 요청 수(끝맺음 턴은 뺀다). */
async function turnRequests(): Promise<number> {
  return (await fakeAiRequests()).filter(
    (r) =>
      r.bodyText.includes(TURN_MARK) && !r.bodyText.includes("\\nClosing: yes"),
  ).length;
}

/** 아이 차례에서 '말하기' 한 번(인식 확인이 뜨면 talk.confirm_seconds 뒤 저절로 보냄) → 턴 요청이 하나 늘 때까지. */
async function talkTurn(page: Page) {
  const before = await turnRequests();
  await untilChildTurn(page);
  await page.locator("[data-child-turn] [data-speak]").click();
  await expect.poll(turnRequests, { timeout: STREAM_END_MS }).toBe(before + 1);
}

/** 목표 턴 수(인사 턴 + 카드 대화 턴 — 회화 e2e targetOf 와 같은 셈). */
function targetOf(card: TalkCard): number {
  return card.greetingTurns + (card.turns?.length ?? 0);
}

async function boxOf(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`${selector} 상자 없음`);
  return box;
}

test.describe("회화 세션 선생님 창(차례 7)", () => {
  test.setTimeout(LONG);

  test("AC-19c 선생님 창은 '시작!' 화면부터 초상(WebGL 없는 쪽은 까닭 no-webgl)이고 접근 이름 · 이름표가 '미나 선생님', 말풍선 접근 이름이 '미나 말 다시 듣기'이며 가로는 말풍선 왼쪽 · 세로는 위 띠 아래에 있고 인사 → 대화로 토막이 바뀌어도 같은 창이다", async ({
    context,
  }) => {
    const { page, card } = await openWindowTalk(context, [
      saidRun("I'm good."),
    ]);
    // WebGL 을 끈 쪽(기본 프로젝트 — fixtures webgl off)
    expect(
      await page.evaluate(
        () => document.createElement("canvas").getContext("webgl2") === null,
      ),
    ).toBe(true);
    // '시작!' 화면: 창이 초상으로 있다(4절 '처음 회화')
    await expect(page.locator("[data-talk-start]")).toBeVisible();
    const win = teacherWindow(page);
    await expect(win).toHaveCount(1);
    await expect(win).toHaveAttribute("data-teacher-key", "mina");
    await expect(win).toHaveAttribute("data-teacher-render", "portrait");
    // WebGL 이 없어 그림 층이 '시작!' 화면에서 바로 대신 표시로 간다(d8 — 3D 를 기다리지 않음)
    await expect(win).toHaveAttribute("data-teacher-fallback", "no-webgl");
    await expect(win).toHaveAttribute("data-teacher-state", "idle");
    await expect(page.getByRole("img", { name: T.window })).toHaveCount(1);
    await expect(win.locator("figcaption")).toHaveText(T.window);
    await expect(page.locator("canvas")).toHaveCount(0);
    // 이름표는 accent 바탕 · 종이색 글자(C141)
    const label = await win.locator("figcaption").evaluate((el) => {
      const style = getComputedStyle(el);
      return { bg: style.backgroundColor, color: style.color };
    });
    expect(label.color).toBe("rgb(255, 253, 247)");
    expect(label.bg).not.toBe("rgba(0, 0, 0, 0)");
    const handle = await win.elementHandle();
    await pastStart(page);
    await expect(bubble(page)).toBeVisible();
    await expect(page.getByRole("button", { name: T.replay })).toBeVisible();
    // 인사 토막: 세로는 위 띠 아래 한 줄(창 | 오늘 이야기 목록) · 그 아래 대화 판
    await page.setViewportSize(CHILD_VIEWPORTS.portrait);
    await expect(page.locator("[data-talk-topics]")).toBeVisible();
    {
      const band = await boxOf(page, "[data-paper-band]");
      const w = await boxOf(page, "[data-teacher-window]");
      const panel = await boxOf(page, "[data-talk-panel]");
      const topics = await boxOf(page, "[data-talk-topics]");
      expect(w.y).toBeGreaterThanOrEqual(band.y + band.height);
      expect(w.y + w.height).toBeLessThanOrEqual(panel.y);
      expect(topics.x).toBeGreaterThanOrEqual(w.x + w.width);
    }
    await photo(page, "teacher-window-greeting");
    // 가로는 말풍선 왼쪽 칸(창 + 그 아래 목록)
    await page.setViewportSize(CHILD_VIEWPORTS.landscape);
    {
      const w = await boxOf(page, "[data-teacher-window]");
      const panel = await boxOf(page, "[data-talk-panel]");
      const topics = await boxOf(page, "[data-talk-topics]");
      expect(w.x + w.width).toBeLessThanOrEqual(panel.x);
      expect(topics.y).toBeGreaterThanOrEqual(w.y + w.height);
    }
    // 인사 → 대화: 같은 창(다시 만들지 않음)
    await pushFakeAi([talkReply({ tori_en: "Great! Let's talk." })]);
    await untilChildTurn(page);
    await page.locator("[data-child-turn] [data-speak]").click();
    const first = card.turns?.[0];
    if (!first) throw new Error("견본 꼴");
    await expect(bubble(page)).toContainText(first.question.en, {
      timeout: STREAM_END_MS,
    });
    expect(await handle?.evaluate((el) => el.isConnected)).toBe(true);
    await expect(teacherWindow(page)).toHaveCount(1);
    await untilChildTurn(page);
    await photo(page, "teacher-window-talk");
  });

  test("AC-19c 선생님 창은 마이크를 쓸 수 없는 기기의 막힌 안내 · 1-가 하루 안전 상한의 쉼 안내에는 없다", async ({
    context,
  }) => {
    const blocked = await openWindowTalk(context, [], {
      beforeGoto: async (p) => {
        await p.addInitScript((key) => {
          localStorage.setItem(
            key,
            JSON.stringify({
              state: "unavailable",
              code: "not-allowed",
              at: "2026-10-17T00:00:00Z",
            }),
          );
        }, MIC_STATE_KEY);
      },
    });
    await expect(blocked.page.getByText(T.needsMic)).toBeVisible();
    await expect(teacherWindow(blocked.page)).toHaveCount(0);
    await blocked.page.close();

    await resetHousehold();
    const profileId = await talkHousehold(1);
    await reachSafetyCap(profileId);
    const row = await insertTalkLesson({ level: 1 });
    const sessionId = await openTalkSession(profileId, row);
    const page = await speechPage(context, talkScript([]));
    await page.goto(`/session/${sessionId}`);
    await expect(page.getByText(T.rest)).toBeVisible();
    await expect(teacherWindow(page)).toHaveCount(0);
  });

  test("AC-19g 선생님 창 말하기는 가짜 읽어 주기의 시작 알림 뒤에만 켜지고 끝 · 취소(말풍선 다시 듣기) 뒤에는 꺼지며 문장 사이 쉼에는 말하기가 아니다", async ({
    context,
  }) => {
    const { page } = await openWindowTalk(context, [saidRun("I'm good.")], {
      utterances: [{ startAfter: 600, endAfter: 900 }],
    });
    await pastStart(page);
    // 첫 문장이 시작하면 말풍선을 눌러 다시 듣기(읽던 발화가 취소된다)
    await expect
      .poll(async () =>
        (await teacherLog(page)).some(
          (e) => e.kind === "start" && e.text !== UNLOCK_TEXT,
        ),
      )
      .toBe(true);
    await expect(teacherWindow(page)).toHaveAttribute(
      "data-teacher-state",
      "speaking",
    );
    await expect(
      page.locator('[data-teacher-indicator="speaking"]'),
    ).toBeVisible();
    await page.getByRole("button", { name: T.replay }).click();
    await untilChildTurn(page);
    await page.waitForTimeout(SETTLE_STATE_MS * 2);
    await expect(teacherWindow(page)).toHaveAttribute(
      "data-teacher-state",
      "idle",
    );
    const log = await teacherLog(page);
    expect(speakingProblems(log)).toEqual([]);
    // 취소된 발화가 있었다(시작 뒤 error) · 말하기가 여러 번 켜졌다 꺼졌다(문장마다)
    const startedIds = new Set(
      log.flatMap((e) => (e.kind === "start" ? [e.id] : [])),
    );
    expect(log.some((e) => e.kind === "error" && startedIds.has(e.id))).toBe(
      true,
    );
    expect(
      statesOf(log).filter((s) => s === "speaking").length,
    ).toBeGreaterThan(1);
  });

  test("AC-19g 읽어 주기가 오류로 끝나면 말하기가 꺼지고 아이 차례가 열린다", async ({
    context,
  }) => {
    const { page } = await openWindowTalk(context, [saidRun("I'm good.")], {
      utterances: [
        { startAfter: 300, endAfter: 600, error: "synthesis-failed" },
      ],
    });
    await pastStart(page);
    await untilChildTurn(page);
    await page.waitForTimeout(SETTLE_STATE_MS * 2);
    await expect(teacherWindow(page)).toHaveAttribute(
      "data-teacher-state",
      "idle",
    );
    const log = await teacherLog(page);
    expect(log.some((e) => e.kind === "error")).toBe(true);
    expect(statesOf(log)).toContain("speaking");
    expect(speakingProblems(log)).toEqual([]);
  });

  test("AC-19g 잠금 풀기 읽어 주기와 시작 알림이 오지 않는 발화(neverStart)에서는 말하기가 아니다", async ({
    context,
  }) => {
    const { page, card } = await openWindowTalk(context, [], {
      // 첫 발화(잠금 풀기)는 시작해서 1.5초 읽고, 그 뒤 발화는 시작 알림이 없다
      utterances: [{ startAfter: 0, endAfter: 1500 }, { neverStart: true }],
    });
    await page.getByRole("button", { name: T.start }).click();
    await expect(page.locator("[data-mic-notice]")).toBeVisible();
    // 잠금 풀기 발화가 읽히는 동안
    await expect
      .poll(async () =>
        (await teacherLog(page)).some(
          (e) => e.kind === "start" && e.text === UNLOCK_TEXT,
        ),
      )
      .toBe(true);
    await page.waitForTimeout(SETTLE_STATE_MS);
    await expect(teacherWindow(page)).toHaveAttribute(
      "data-teacher-state",
      "idle",
    );
    await page.getByRole("button", { name: T.micOk }).click();
    const g = "questions" in card.greeting ? card.greeting.questions[0] : null;
    if (!g) throw new Error("견본 꼴");
    await expect
      .poll(async () => (await speechRecord(page)).spoken)
      .toContain(g.question.en);
    await page.waitForTimeout(2 * MS);
    expect(statesOf(await teacherLog(page))).not.toContain("speaking");
    await expect(teacherWindow(page)).toHaveAttribute(
      "data-teacher-state",
      "idle",
    );
  });

  test("AC-19g 듣는 동안 선생님은 듣기, 회화 턴 첫 문장을 기다리는 동안 생각(점 셋)이다", async ({
    context,
  }) => {
    const { page } = await openWindowTalk(context, [saidRun("I'm good.")]);
    await pastStart(page);
    await pushFakeAi([
      talkReply({ tori_en: "Great! Let's talk." }, { firstDelayMs: 5000 }),
    ]);
    await untilChildTurn(page);
    await page.locator("[data-child-turn] [data-speak]").click();
    await expect
      .poll(async () => statesOf(await teacherLog(page)))
      .toContain("listening");
    await expect(teacherWindow(page)).toHaveAttribute(
      "data-teacher-state",
      "thinking",
      { timeout: STREAM_END_MS },
    );
    await expect(
      page.locator('[data-teacher-indicator="thinking"]'),
    ).toBeVisible();
    await photo(page, "teacher-window-thinking");
    await expect(teacherWindow(page)).not.toHaveAttribute(
      "data-teacher-state",
      "thinking",
      { timeout: STREAM_END_MS },
    );
  });

  test("AC-19g 오늘 쓸 말 따라 말하기 결과가 '잘 말했어요'면 선생님이 칭찬(작은 별)을 talk.teacher_praise_seconds 동안 보인다", async ({
    context,
  }) => {
    const lesson = fullTalkLesson(1);
    const w0 = lesson.card.todayWords[0];
    if (!w0) throw new Error("견본 꼴 — 오늘 쓸 말");
    const { page } = await openWindowTalk(
      context,
      [saidRun("I'm good."), saidRun(w0.word)],
      { lesson },
    );
    await pastStart(page);
    await pushFakeAi([talkReply({ tori_en: "Great! Let's learn words." })]);
    await untilChildTurn(page);
    await page.locator("[data-child-turn] [data-speak]").click();
    await expect(
      page.locator('[data-follow-step="today_words:0:0"]'),
    ).toBeVisible({ timeout: STREAM_END_MS });
    await page.waitForTimeout(SETTLE_MS);
    await page.locator("[data-follow] [data-speak]").click();
    await expect(page.locator("[data-follow-result]")).toHaveText(
      RESULT_PHRASES.good,
    );
    await expect
      .poll(async () => statesOf(await teacherLog(page)))
      .toContain("praise");
    await photo(page, "teacher-window-praise");
    // 칭찬은 talk.teacher_praise_seconds 뒤 끝난다(다음 단어를 읽는 말하기가 앞이 이길 수도 있다)
    await page.waitForTimeout(PRAISE_MS + SETTLE_STATE_MS);
    await expect(teacherWindow(page)).not.toHaveAttribute(
      "data-teacher-state",
      "praise",
    );
  });

  test("AC-19g 대화 아이 턴 뒤에는 목표 턴 전까지 칭찬이 없고 목표 턴에 닿은 턴은 그 읽어 주기가 끝난 뒤 칭찬한다", async ({
    context,
  }) => {
    await withHouseholdSetting(
      "speech.end_silence_seconds.talk.1-3",
      FAST_SILENCE_SECONDS,
      () =>
        withHouseholdSetting(
          "talk.confirm_seconds",
          FAST_CONFIRM_SECONDS,
          async () => {
            const probe = (await insertTalkLesson({ level: 1 }))
              .content as TalkLesson;
            const target = targetOf(probe.card);
            const dialogue = target - probe.card.greetingTurns;
            const { page } = await openWindowTalk(context, [
              saidRun("I'm good."),
              ...Array.from({ length: dialogue }, () => saidRun("I like it.")),
            ]);
            await pastStart(page);
            await pushFakeAi(
              Array.from({ length: 1 + dialogue }, () =>
                talkReply({ tori_en: "Nice!" }),
              ),
            );
            // 인사 턴 + 목표 턴 바로 앞까지
            await talkTurn(page);
            for (let i = 0; i < dialogue - 1; i++) await talkTurn(page);
            await untilChildTurn(page);
            expect(statesOf(await teacherLog(page))).not.toContain("praise");
            // 목표 턴
            await talkTurn(page);
            await expect(page.locator("[data-talk-choice]")).toBeVisible({
              timeout: STREAM_END_MS,
            });
            await expect
              .poll(async () => statesOf(await teacherLog(page)))
              .toContain("praise");
            const log = await teacherLog(page);
            const praiseAt = log.find(
              (e) => e.kind === "state" && e.value === "praise",
            )?.at;
            const promptEnd = log.findLast(
              (e) =>
                (e.kind === "end" || e.kind === "error") &&
                e.text === MORE_PROMPT.en,
            )?.at;
            expect(praiseAt).toBeDefined();
            expect(promptEnd).toBeDefined();
            expect(praiseAt ?? 0).toBeGreaterThanOrEqual(promptEnd ?? 0);
          },
        ),
    );
  });

  test("AC-19h 움직임 줄이기 흉내에서 초상 상태 표시(물결 · 점 셋)는 멈춘 꼴로 보이고 창에는 넘김 효과가 없다", async ({
    context,
  }) => {
    const { page } = await openWindowTalk(context, [saidRun("I'm good.")], {
      utterances: [{ startAfter: 0, endAfter: 2500 }],
      beforeGoto: (p) => p.emulateMedia({ reducedMotion: "reduce" }),
    });
    await pastStart(page);
    const ring = page.locator('[data-teacher-indicator="speaking"]');
    await expect(ring).toBeVisible({ timeout: STREAM_END_MS });
    const stopped = (selector: string) =>
      page
        .locator(selector)
        .evaluate((root) =>
          [root, ...root.querySelectorAll("*")].every(
            (el) => getComputedStyle(el).animationName === "none",
          ),
        );
    expect(await stopped('[data-teacher-indicator="speaking"]')).toBe(true);
    const noTransition = await teacherWindow(page).evaluate((root) =>
      [root, ...root.querySelectorAll("*")].every((el) =>
        getComputedStyle(el)
          .transitionDuration.split(",")
          .every((d) => Number.parseFloat(d) === 0),
      ),
    );
    expect(noTransition).toBe(true);
    // 생각(점 셋)도 멈춘 꼴
    await pushFakeAi([
      talkReply({ tori_en: "Great! Let's talk." }, { firstDelayMs: 5000 }),
    ]);
    await untilChildTurn(page);
    await page.locator("[data-child-turn] [data-speak]").click();
    await expect(
      page.locator('[data-teacher-indicator="thinking"]'),
    ).toBeVisible({ timeout: STREAM_END_MS });
    expect(await stopped('[data-teacher-indicator="thinking"]')).toBe(true);
  });

  test("AC-19j 회화 읽어 주기는 선생님 높이(미나 — 명단 값) · speech.rate.1-3 · 순서가 비면 pickVoice 목소리이고, 집 선생님이 있어도 말하기 세션 읽어 주기는 높이 1 이다", async ({
    context,
  }) => {
    const { page, card } = await openWindowTalk(context, [
      saidRun("I'm good."),
    ]);
    await pastStart(page);
    const g = "questions" in card.greeting ? card.greeting.questions[0] : null;
    if (!g) throw new Error("견본 꼴");
    await untilChildTurn(page);
    const talk = await speechRecord(page);
    const at = talk.spoken.indexOf(g.question.en);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(talk.pitches[at]).toBeCloseTo(MINA.voice.pitch);
    expect(talk.rates[at]).toBeCloseTo(LOW_BAND_RATE);
    expect(talk.voices[at]).toBe(TEST_VOICE);
    await page.close();

    // 말하기 세션(같은 집 · 선생님 미나): 감싸지 않아 높이는 브라우저 기본 1
    await resetHousehold();
    const { profileId } = await insertHousehold({
      startLevels: { speaking: 1 },
      teacherKey: "mina",
    });
    const [lesson] = await e2eDb()
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.area, "speaking"),
          eq(lessons.level, 1),
          eq(lessons.unit, 1),
          eq(lessons.kind, "assigned"),
          eq(lessons.lessonNo, 1),
          eq(lessons.topicVariant, 1),
        ),
      );
    if (!lesson) throw new Error("말하기 수업 없음");
    const [sessionId] = await insertSessions([
      {
        profileId,
        area: "speaking",
        level: lesson.level,
        unit: 1,
        lessonId: lesson.id,
        kind: "regular",
        status: "in_progress",
        startedAt: new Date(),
        seedRevision: lesson.revision,
        seedCorrection: lesson.correction,
      },
    ]);
    const speaking = await speechPage(context, talkScript([]));
    await speaking.goto(`/session/${sessionId}`);
    await expect(
      speaking.locator("[data-activity][data-hydrated]"),
    ).toHaveCount(1);
    await speaking.getByRole("button", { name: T.next }).click();
    await expect(speaking.locator("[data-mic-notice]")).toBeVisible();
    await speaking.getByRole("button", { name: T.micOk }).click();
    await expect
      .poll(async () =>
        (await speechRecord(speaking)).spoken.some((t) => t !== UNLOCK_TEXT),
      )
      .toBe(true);
    const record = await speechRecord(speaking);
    const read = record.spoken.flatMap((t, i) =>
      t === UNLOCK_TEXT
        ? []
        : [{ pitch: record.pitches[i], voice: record.voices[i] }],
    );
    expect(read.length).toBeGreaterThan(0);
    for (const r of read) {
      expect(r.pitch).toBe(1);
      expect(r.voice).toBe(TEST_VOICE);
    }
  });
});

// ── 차례 8: 대신 표시(AC-19i 기본 프로젝트 몫) ──

/** 회화 견본 카드의 정리 되짚을 말(1~3단계 — 따라 말함). */
function wrapLineOf(card: TalkCard) {
  const line = card.closingLines[0];
  if (!line) throw new Error("견본 꼴 — 정리 대사");
  return line;
}

test.describe("선생님 창 대신 표시(차례 8)", () => {
  test.setTimeout(LONG);

  test("AC-19i WebGL 이 없는 기기에서는 선생님 창이 no-webgl 까닭의 초상이고 오류 글 · 새 단추 없이 대화 → 그만하기 → 정리 → 마무리까지 가며 모델(.vrm)을 받지 않는다", async ({
    context,
  }) => {
    const probe = (await insertTalkLesson({ level: 1 })).content as TalkLesson;
    const line = wrapLineOf(probe.card);
    let models = () => 0;
    const { page } = await openWindowTalk(
      context,
      [saidRun("I'm good."), saidRun(line.en)],
      {
        beforeGoto: async (p) => {
          models = countModelRequests(p);
        },
      },
    );
    const win = teacherWindow(page);
    await expect(page.locator("[data-talk-start]")).toBeVisible();
    await expect(win).toHaveAttribute("data-teacher-fallback", "no-webgl");
    await expect(win).toHaveAttribute("data-teacher-render", "portrait");
    await expectNoLayerError(page);
    await pastStart(page);
    // 인사 턴 하나 → 대화 첫 아이 차례(초상에서도 상태가 바뀐다)
    await pushFakeAi([talkReply({ tori_en: "Great! Let's talk." })]);
    await talkTurn(page);
    await untilChildTurn(page);
    await expect(win).toHaveAttribute("data-teacher-fallback", "no-webgl");
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(statesOf(await teacherLog(page))).toEqual(
      expect.arrayContaining(["idle", "listening"]),
    );
    await expectNoLayerError(page);
    // 그만하기 → 정리(따라 말하기) → 끝인사 → 마무리 첫 장
    await page.locator("[data-paper-band] [data-talk-stop]").click();
    await page.getByRole("button", { name: T.stopYes }).click();
    await expect(page.locator("[data-talk-wrap]")).toBeVisible();
    await expect(win).toHaveAttribute("data-teacher-fallback", "no-webgl");
    await page.locator("[data-talk-wrap] [data-speak]").click();
    await expect(page.locator('[data-closing-card="1"]')).toBeVisible({
      timeout: STREAM_END_MS,
    });
    // 마무리 세 장에는 창이 없다(초상만 — 4절)
    await expect(win).toHaveCount(0);
    await expect(page.getByText(/불러오|오류|3D|WebGL/)).toHaveCount(0);
    // 그림 층 사건은 대신 표시 한 번(불러오기 시작 · 첫 장 없음), 모델 요청 0
    const signals = await teacherSignals(page);
    expect(signals).toEqual([{ type: "fallback", reason: "no-webgl" }]);
    expect(models()).toBe(0);
  });

  test("AC-19i talk.teacher_render=portrait 면 선생님 창이 setting 까닭의 초상이고 모델(.vrm) 요청이 0 이며 대화가 이어진다", async ({
    context,
  }) => {
    await withHouseholdSetting("talk.teacher_render", "portrait", async () => {
      let models = () => 0;
      const { page } = await openWindowTalk(context, [saidRun("I'm good.")], {
        beforeGoto: async (p) => {
          models = countModelRequests(p);
        },
      });
      const win = teacherWindow(page);
      // 설정이 WebGL 검사보다 먼저다(3D 코드 조각도 받지 않음)
      await expect(win).toHaveAttribute("data-teacher-fallback", "setting");
      await pastStart(page);
      await pushFakeAi([talkReply({ tori_en: "Great! Let's talk." })]);
      await talkTurn(page);
      await untilChildTurn(page);
      await expect(win).toHaveAttribute("data-teacher-render", "portrait");
      await expect(win).toHaveAttribute("data-teacher-fallback", "setting");
      await expectNoLayerError(page);
      expect(await teacherSignals(page)).toEqual([
        { type: "fallback", reason: "setting" },
      ]);
      expect(models()).toBe(0);
    });
  });

  test("AC-19i 관찰 쪽 '3D 보기'는 WebGL 없는 쪽에서 선생님 창을 no-webgl 초상으로 두고 대신 표시 까닭 칸에 적는다", async ({
    page,
  }) => {
    await talkHousehold(1);
    const models = countModelRequests(page);
    await page.goto("/dev/teacher-probe");
    await expect(page.getByTestId("teacher-probe")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await expect(page.getByTestId("render-setting")).toHaveText(
      PROBE_TEXT.renderSetting(TEST_SETTINGS["talk.teacher_render"].value),
    );
    await page
      .getByRole("button", { name: PROBE_TEXT.view3dPick(MINA.nameKo) })
      .click();
    await expect(teacherWindow(page)).toHaveAttribute(
      "data-teacher-fallback",
      "no-webgl",
    );
    await expect(page.locator('[data-measure="fallback"]')).toHaveText(
      "no-webgl",
    );
    expect(models()).toBe(0);
  });
});
