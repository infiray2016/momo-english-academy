// 가르치는 수업 세션 틀의 순수 함수(가르치고 배우는 수업 plan 묶음 라-2 · 델타 spec 설계 1 · 5 · 9 · 10 · 장부 L-34, 정본 15절 AC-22c · AC-3d ·
// AC-4d · AC-N20). 입력은 정규 시드 셋(seed/lessons/{reading,writing}/3/1.json)의 승인 수업 그대로다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// 세션 틀 그림(효과는 돌지 않음): 쪽 길잡이 · 서버 액션 · 브라우저 전용 모듈은 빈 모듈로
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));
vi.mock("@/server/actions/session", () => ({
  finishSession: async () => ({ ok: false, reason: "unavailable" }),
  leaveSession: async () => ({ ok: true }),
  recheckAiRest: async () => ({ resting: false }),
  reportSessionMic: async () => ({ ok: true }),
  saveAttempts: async () => ({ ok: true, accepted: [], rejected: [] }),
}));
vi.mock("@/server/actions/writing", () => ({
  checkGuidedWriting: async () => ({ ok: false }),
  submitDraft: async () => ({ ok: false }),
  submitRewrite: async () => ({ ok: false }),
  thinkoutNext: async () => ({ ok: false }),
}));
vi.mock("@/server/actions/teacher", () => ({}));
vi.mock("@/server/actions/conversation", () => ({}));

import { SessionFrame } from "@/app/(child)/session/[id]/session-frame";
import { LessonFileSchema, type LessonOf } from "@/core/seed/schema/lesson";
import { type Activity, activitiesOf } from "@/core/session/preview";
import { activityGroupsOf } from "@/core/session/progress";
import { outcomeContextOf } from "@/core/session/spares";
import {
  aidOf,
  aidUsed,
  assembleRolesOf,
  firstActivityOfSlot,
  openingScreenOf,
  PASSAGE_AID_KEY,
  progressHiddenOf,
  readingAidsFrom,
  SILENT_LINE_FROM_NOTICE,
  spareAidKey,
  spareChoiceOnDevice,
  TEACH_NOTICES_START,
  teachNoticesAfter,
  teachSlotAt,
  togetherTryRight,
} from "@/core/session/teach-frame";
import { speechSettingsFrom } from "@/core/speech/listen";
import { type TeacherView, teacherViewOf } from "@/core/teacher/roster";
import type { SessionView } from "@/server/session";
import { teacherRoster } from "../fixtures/seed/builders";
import { testSettingValues } from "../fixtures/settings";

const ROOT = process.cwd();
const approved = <A extends "reading" | "writing">(area: A): LessonOf[A] => {
  const file = LessonFileSchema.parse(
    JSON.parse(
      readFileSync(join(ROOT, "seed", "lessons", area, "3", "1.json"), "utf8"),
    ),
  );
  const lesson = file.lessons[0];
  if (!lesson) throw new Error(`${area} 승인 수업 없음`);
  return lesson as LessonOf[A];
};
const reading = approved("reading");
const writing = approved("writing");
const activitiesFor = (lesson: LessonOf["reading" | "writing"]): Activity[] =>
  activitiesOf({
    area:
      "content" in lesson && "passage" in lesson.content
        ? "reading"
        : "writing",
    level: 3,
    content: lesson.content,
    ...(lesson.teach ? { teach: lesson.teach } : {}),
  } as Parameters<typeof activitiesOf>[0]);
const readingActivities = activitiesFor(reading);
const writingActivities = activitiesFor(writing);

const ctxOf = (lesson: LessonOf["reading" | "writing"]) =>
  outcomeContextOf({
    config: {
      speaking: { answerMatchPass: 0.8 },
      ui: { matchPhraseLevels: [0.8, 0.5] },
    },
    homophones: [],
    lemmaEntries: [],
    appJudged: false,
    lesson,
    meaningWords: [],
  });

/** 읽기 문항 index 의 활동 번호(1부터). */
const questionNo = (index: number) =>
  readingActivities.findIndex(
    (a) => a.kind === "reading-question" && a.index === index,
  ) + 1;
const spareNo = (index: number) =>
  readingActivities.findIndex((a) => a.kind === "spare" && a.index === index) +
  1;
const pick = (index: number, choice: number) => ({
  activityNo: questionNo(index),
  input: {
    v: 2,
    kind: "reading-question",
    step: "final",
    tries: [choice],
  },
});
const questions = reading.content.questions;
const right = (index: number) => questions[index]?.answerNo ?? 0;
const wrong = (index: number) => (right(index) % 4) + 1;

describe("자리(AC-22c · 정한 것 16)", () => {
  it("AC-22c 활동 번호의 자리와 혼자 해 보기 첫 활동(읽기는 지문, 쓰기는 첫 문항)을 찾고, teach 없는 목록은 자리가 없다", () => {
    expect(teachSlotAt(readingActivities, 1)).toBe("today");
    expect(teachSlotAt(readingActivities, 2)).toBe("show");
    const firstSolo = firstActivityOfSlot(readingActivities, "solo");
    expect(readingActivities[(firstSolo ?? 0) - 1]?.kind).toBe(
      "reading-passage",
    );
    const firstWriting = firstActivityOfSlot(writingActivities, "solo");
    expect(writingActivities[(firstWriting ?? 0) - 1]).toEqual({
      kind: "writing-item",
      index: 0,
    });
    const plain: Activity[] = [
      { kind: "preview" },
      { kind: "reading-passage" },
    ];
    expect(teachSlotAt(plain, 1)).toBeUndefined();
    expect(firstActivityOfSlot(plain, "solo")).toBeUndefined();
  });
});

describe("짝 고르기 — 서버 값 합치기(L-34 · AC-22c)", () => {
  const ctx = ctxOf(reading);
  const empty = { show: [], skip: [], cap: 3, outcomes: [] as const };

  it("AC-22c 이 기기에서 혼자 해 보기를 막 끝내면(서버 결과 없음) 이 기기 첫 끝 시도로 첫 시도에 틀린 문항의 짝만 낸다", () => {
    const choice = spareChoiceOnDevice({
      activities: readingActivities,
      lesson: reading,
      server: empty,
      attempts: [pick(0, wrong(0)), pick(1, right(1)), pick(2, right(2))],
      ctx,
    });
    expect(choice.show).toEqual([spareNo(0)]);
    expect(choice.skip).toEqual([spareNo(1), spareNo(2)]);
  });

  it("AC-22c 다 맞히면 짝 없이 끝난다(낼 짝 없음 · 모두 끝난 것으로)", () => {
    const choice = spareChoiceOnDevice({
      activities: readingActivities,
      lesson: reading,
      server: empty,
      attempts: [pick(0, right(0)), pick(1, right(1)), pick(2, right(2))],
      ctx,
    });
    expect(choice.show).toEqual([]);
    expect(choice.skip).toHaveLength(3);
  });

  it("AC-22c 서버가 센 결과(대기열이 지운 앞 문항)와 이 기기 결과를 합치고, 같은 활동은 서버 값이 이긴다", () => {
    // 앞 두 문항은 서버에만(앱을 다시 열어 대기열에 없음), 마지막은 이 기기에서 막 냄
    const merged = spareChoiceOnDevice({
      activities: readingActivities,
      lesson: reading,
      server: {
        ...empty,
        outcomes: [
          [questionNo(0), "wrong"],
          [questionNo(1), "correct"],
        ],
      },
      attempts: [pick(2, wrong(2))],
      ctx,
    });
    expect(merged.show).toEqual([spareNo(0), spareNo(2)]);
    // 같은 활동이 둘에 다 있으면 서버 값
    const serverWins = spareChoiceOnDevice({
      activities: readingActivities,
      lesson: reading,
      server: { ...empty, outcomes: [[questionNo(0), "correct"]] },
      attempts: [pick(0, wrong(0))],
      ctx,
    });
    expect(serverWins.show).toEqual([]);
  });

  it("AC-22c 낼 짝은 상한(lesson.spares_per_session.<영역> — 서버 값 cap)까지다", () => {
    const capped = spareChoiceOnDevice({
      activities: readingActivities,
      lesson: reading,
      server: { ...empty, cap: 1 },
      attempts: [pick(0, wrong(0)), pick(1, wrong(1)), pick(2, wrong(2))],
      ctx,
    });
    expect(capped.show).toEqual([spareNo(0)]);
    expect(capped.skip).toEqual([spareNo(1), spareNo(2)]);
  });

  it("AC-22c 진행 막대는 혼자 해 보기를 다 끝낸 뒤 내지 않을 짝을 빼고 낸 짝만 센다(정한 것 3), 도중에는 빼지 않는다", () => {
    const solo = readingActivities.flatMap((a, i) =>
      TEACH_SOLO.has(a.kind) ? [i + 1] : [],
    );
    const skip = [spareNo(1), spareNo(2)];
    // 혼자 해 보기 도중: 낼 짝을 아직 모른다 — 빼지 않음
    expect(
      progressHiddenOf(readingActivities, new Set([1, 2, 3]), skip).size,
    ).toBe(0);
    const all = new Set([1, 2, 3, 4, 5, 6, 7, ...solo]);
    const hidden = progressHiddenOf(readingActivities, all, skip);
    expect([...hidden].sort()).toEqual([...skip].sort());
    // 막대의 '스스로 해 보기' 묶음은 낸 짝 하나뿐이다
    const groups = activityGroupsOf(readingActivities, spareNo(0), all, hidden);
    const spare = groups.find((g) => g.key === "spare");
    expect(spare?.size).toBe(1);
    expect(spare?.first).toBe(spareNo(0));
    expect(groups.reduce((n, g) => n + g.size, 0)).toBe(
      readingActivities.length - skip.length,
    );
    // 짝을 하나도 내지 않으면 그 묶음이 없다
    expect(
      activityGroupsOf(
        readingActivities,
        readingActivities.length + 1,
        all,
        progressHiddenOf(readingActivities, all, [
          spareNo(0),
          spareNo(1),
          spareNo(2),
        ]),
      ).some((g) => g.key === "spare"),
    ).toBe(false);
  });
});

const TEACH_SOLO = new Set(["reading-passage", "reading-question"]);

describe("무음 모드 줄(AC-N20 · UI · UX R-57)", () => {
  it("AC-N20 선생님 줄 안내가 한 세션에서 두 번째로 나면 무음 모드 줄을 켜고, 소리가 난 줄이 끝나면 거둔다", () => {
    let state = TEACH_NOTICES_START;
    state = teachNoticesAfter(state, { notice: true });
    expect(state).toEqual({ count: 1, silent: false, shown: false });
    state = teachNoticesAfter(state, { notice: false });
    expect(state).toEqual({ count: 1, silent: false, shown: false });
    state = teachNoticesAfter(state, { notice: true });
    expect(state).toEqual({
      count: SILENT_LINE_FROM_NOTICE,
      silent: true,
      shown: true,
    });
    // 켜진 동안의 안내는 같은 줄 그대로
    state = teachNoticesAfter(state, { notice: true });
    expect(state.silent).toBe(true);
    state = teachNoticesAfter(state, { notice: false });
    expect(state.silent).toBe(false);
    // 설계 10 '한 번 더한다' — 거둔 뒤 세 번째 · 네 번째 안내에는 다시 붙지 않는다(세션에 한 번)
    state = teachNoticesAfter(state, { notice: true });
    expect(state.silent).toBe(false);
    state = teachNoticesAfter(state, { notice: true });
    expect(state.silent).toBe(false);
    expect(state.shown).toBe(true);
  });

  it("AC-N20 무음 모드 줄은 안내가 세 번째로 나도 거둔 뒤라면 다시 붙지 않는다(안내 · 소리 남 · 안내 · 소리 남 · 안내)", () => {
    const steps = [true, false, true, false, true];
    const silentAt = steps.map(
      (_notice, i) =>
        steps
          .slice(0, i + 1)
          .reduce(
            (state, n) => teachNoticesAfter(state, { notice: n }),
            TEACH_NOTICES_START,
          ).silent,
    );
    expect(silentAt).toEqual([false, false, true, false, false]);
  });
});

describe("읽기 도움 모으기(설계 9 · C175 (1))", () => {
  it("AC-3d 글마다 읽어 주기 · 뜻을 연 낱말을 모으고, 쓴 것이 없으면 aid 칸이 없다", () => {
    let aids = {};
    expect(aidOf(aids, PASSAGE_AID_KEY)).toBeUndefined();
    aids = aidUsed(aids, PASSAGE_AID_KEY, { gloss: "wash" });
    aids = aidUsed(aids, PASSAGE_AID_KEY, { gloss: "wash" });
    aids = aidUsed(aids, PASSAGE_AID_KEY, { readAloud: true });
    expect(aidOf(aids, PASSAGE_AID_KEY)).toEqual({
      readAloud: true,
      gloss: ["wash"],
    });
    // 짝 글은 따로 센다
    expect(aidOf(aids, spareAidKey(12))).toBeUndefined();
    aids = aidUsed(aids, spareAidKey(12), { readAloud: true });
    expect(aidOf(aids, spareAidKey(12))).toEqual({ readAloud: true });
    // 기기 저장소 값은 꼴을 보고 읽는다
    expect(readingAidsFrom(JSON.parse(JSON.stringify(aids)))).toEqual(aids);
    expect(readingAidsFrom("x")).toEqual({});
    expect(readingAidsFrom({ passage: { gloss: [1, "go"] } })).toEqual({
      passage: { gloss: ["go"] },
    });
  });
});

describe("쓰기 색 칸(표본 W10 · AC-3d)", () => {
  it("AC-3d 정답 카드 차례마다 칩 자리(무엇 · is · 어때요 · 마침표)를 가리고, 이 꼴이 아니면 없다", () => {
    expect(assembleRolesOf("The bedroom is pink.")).toEqual([
      "thing",
      "thing",
      "is",
      "how",
      "end",
    ]);
    expect(assembleRolesOf("My living room is new.")).toEqual([
      "thing",
      "thing",
      "thing",
      "is",
      "how",
      "end",
    ]);
    expect(assembleRolesOf("We eat lunch.")).toBeUndefined();
    expect(assembleRolesOf("Is it big?")).toBeUndefined();
    // 승인 수업 혼자 문항 다섯은 모두 이 꼴이다
    if (writing.content.shape !== "items") throw new Error("쓰기 꼴");
    for (const item of writing.content.items)
      expect(assembleRolesOf(item.accepted[0] ?? "")).toBeDefined();
  });
});

describe("같이 해 보기 한 시도(AC-4d · 설계 1)", () => {
  const index = (lesson: LessonOf["reading" | "writing"], i: number) => {
    const activities = activitiesFor(lesson);
    const found = activities.find(
      (a): a is Extract<Activity, { kind: "together" }> =>
        a.kind === "together" && a.index === i,
    );
    if (!found) throw new Error("같이 해 보기 없음");
    return found;
  };

  it("AC-4d 쓰기 같이 해 보기는 남은 카드 둘을 빈칸 차례로 맞게 놓아야 맞고, 대문자 단추 문항은 누르면 맞다", () => {
    const ctx = ctxOf(writing);
    const blanks = index(writing, 0);
    expect(
      togetherTryRight(blanks, writing, { pieces: ["is", "cold"] }, ctx),
    ).toBe(true);
    expect(
      togetherTryRight(blanks, writing, { pieces: ["cold", "is"] }, ctx),
    ).toBe(false);
    expect(togetherTryRight(index(writing, 1), writing, {}, ctx)).toBe(true);
  });

  it("AC-3d 읽기 같이 해 보기는 고른 보기가 정답 번호여야 맞다", () => {
    const ctx = ctxOf(reading);
    const first = index(reading, 0);
    const answerNo = reading.teach?.together[0]?.answerNo ?? 0;
    expect(togetherTryRight(first, reading, { choice: answerNo }, ctx)).toBe(
      true,
    );
    expect(
      togetherTryRight(first, reading, { choice: answerNo === 1 ? 2 : 1 }, ctx),
    ).toBe(false);
  });
});

// ── 세션 틀 그림(AC-22c · AC-3g — 자리 조각 고르기 · 위 띠 자리 이름 · 혼자 · 짝 첫 화면 한 줄) ──

const settingValues = testSettingValues();
const CONFIG: SessionView["config"] = {
  speech: speechSettingsFrom((key) => settingValues[key]),
  maxRetries: settingValues["speech.max_retries"] as number,
  silentItemsMax: settingValues["speech.silent_items_max"] as number,
  ui: {
    waitHintSeconds: settingValues["ui.wait_hint_seconds"] as [number, number],
    matchPhraseLevels: settingValues["ui.match_phrase_levels"] as [
      number,
      number,
    ],
    autoNextSeconds: settingValues["ui.auto_next_seconds"] as number,
  },
  speaking: {
    answerMatchPass: settingValues["speaking.answer_match_pass"] as number,
    answerMaxSeconds: 1,
    prepareSeconds: settingValues["speaking.prepare_seconds"] as number,
    slowRateFactor: settingValues["speech.slow_rate_factor"] as number,
  },
};

/** 가르치는 수업 화면 자료(서버 loadSessionView 꼴 — 승인 수업 그대로). */
function teachView(
  lesson: LessonOf["reading" | "writing"],
  over: Partial<SessionView> = {},
): SessionView {
  const reading = "passage" in lesson.content;
  const activities = activitiesFor(lesson);
  return {
    sessionId: "00000000-0000-4000-8000-000000000001",
    area: reading ? "reading" : "writing",
    level: 3,
    unit: 1,
    lessonNo: 1,
    title: lesson.title,
    activities,
    current: 1,
    finals: [],
    config: CONFIG,
    homophones: [],
    lemmaEntries: [],
    meaningWords: [],
    appJudged: false,
    answerShapes: activities.map(() => null),
    openSessionIds: [],
    lesson,
    preview: lesson.preview.map((p) => ({ ...p, added: false })),
    wordPictures: {},
    keyPictures: {},
    showKo: false,
    aiResting: false,
    aiQuestionsResting: false,
    guided: null,
    composition: null,
    rewrite: null,
    spares: {
      show: [],
      skip: activities.flatMap((a, i) => (a.kind === "spare" ? [i + 1] : [])),
      cap: settingValues[
        `lesson.spares_per_session.${reading ? "reading" : "writing"}`
      ] as number,
      outcomes: [],
    },
    teaching: {
      teacher: null,
      praiseSeconds: settingValues["talk.teacher_praise_seconds"] as number,
      teacherChoices: [],
    },
    ...over,
  } as SessionView;
}
const frameHtml = (view: SessionView) =>
  renderToStaticMarkup(createElement(SessionFrame, { view }));
/** 위 띠(header) 부분. */
const bandOf = (out: string) => out.slice(0, out.indexOf("</header>"));

describe("세션 틀 — 가르치는 수업 자리 조각(AC-22c · AC-3g)", () => {
  it("AC-22c 첫 활동은 오늘 배울 것 조각('시작')이고 위 띠에 자리 이름, 진행 막대는 자리 다섯이다", () => {
    const out = frameHtml(teachView(reading));
    expect(out).toContain('data-teach-slot="today"');
    expect(out).toContain(">시작<");
    expect(bandOf(out)).toContain('data-teach-slot-name="today"');
    expect(bandOf(out)).toContain("오늘 배울 것");
    for (const name of [
      "오늘 배울 것",
      "살펴보기",
      "같이 해 보기",
      "혼자 해 보기",
      "스스로 해 보기",
    ])
      expect(out).toContain(name);
    expect(out.match(/data-progress-group=/g)).toHaveLength(5);
    // 조각 안 큰 단추가 있으니 틀의 '다음'은 없다(겹치지 않게 — 설계 5.4)
    expect(out).not.toContain("data-frame-next");
    expect(reading.teach?.todayKo).toBeDefined();
    expect(out).toContain(reading.teach?.todayKo ?? "");
  });

  it("AC-22c 새 단어 · 본보기 · 같이 해 보기에 라-1 조각을 고르고 위 띠 이름은 살펴보기 · 같이 해 보기다", () => {
    const words = frameHtml(teachView(reading, { current: 2 }));
    expect(words).toContain('data-teach-show="words"');
    expect(words).toContain("새 낱말 다섯이에요. 누르면 다시 들려요.");
    expect(bandOf(words)).toContain("살펴보기");
    // 예문은 없다(C170 (3))
    expect(words).not.toContain(reading.preview[0]?.example ?? "");
    const model = frameHtml(teachView(reading, { current: 3 }));
    expect(model).toContain('data-teach-show="model"');
    expect(model).toContain("data-chip-sentence");
    const together = frameHtml(teachView(reading, { current: 6 }));
    expect(together).toContain('data-teach-slot="together"');
    expect(together).toContain("data-together-choices");
    expect(together).toContain("data-highlight");
    expect(bandOf(together)).toContain("같이 해 보기");
    const writingTogether = frameHtml(
      teachView(writing, {
        current: writingActivities.findIndex((a) => a.kind === "together") + 1,
      }),
    );
    expect(writingTogether).toContain("data-together-cards");
  });

  it("AC-3g 혼자 해 보기 첫 화면에만 초상과 '이제 혼자 해 봐요.'이고 다음 문항 화면에는 초상이 없다", () => {
    const firstSolo = firstActivityOfSlot(readingActivities, "solo") ?? 0;
    const first = frameHtml(teachView(reading, { current: firstSolo }));
    expect(first).toContain('data-teach-first="solo"');
    expect(first).toContain("이제 혼자 해 봐요.");
    expect(bandOf(first)).toContain("혼자 해 보기");
    expect(first).toContain("data-passage-activity");
    const question = frameHtml(teachView(reading, { current: questionNo(0) }));
    expect(question).not.toContain("data-teach-first");
    expect(question).not.toContain("data-teacher-line");
    expect(question).toContain("data-passage-always");
  });

  it("AC-22c 낼 짝의 첫 화면에 '다른 글에서 혼자 해 봐요.'와 위 띠 '스스로 해 보기', 쓰기 짝은 '다른 문장도 혼자 놓아 봐요.'다", () => {
    const view = teachView(reading, {
      current: spareNo(1),
      spares: {
        show: [spareNo(1)],
        skip: [spareNo(0), spareNo(2)],
        cap: 3,
        outcomes: [[questionNo(1), "wrong"]],
      },
    });
    const out = frameHtml(view);
    expect(out).toContain('data-teach-first="spare"');
    expect(out).toContain("다른 글에서 혼자 해 봐요.");
    expect(bandOf(out)).toContain("스스로 해 보기");
    expect(out).toContain(questions[1]?.spare?.textEn ?? "");
    const writingSpare =
      writingActivities.findIndex((a) => a.kind === "spare") + 1;
    const w = frameHtml(
      teachView(writing, {
        current: writingSpare,
        spares: { show: [writingSpare], skip: [], cap: 3, outcomes: [] },
      }),
    );
    expect(w).toContain("다른 문장도 혼자 놓아 봐요.");
  });

  it("AC-22c teach 없는 수업은 위 띠에 자리 이름이 없고 지금 차례 그대로다(정한 것 1)", () => {
    const plainActivities: Activity[] = [
      { kind: "preview" },
      { kind: "reading-passage" },
      ...reading.content.questions.map(
        (_, index): Activity => ({ kind: "reading-question", index }),
      ),
    ];
    const { teach: _teach, ...plainLesson } = reading;
    const out = frameHtml(
      teachView(plainLesson as LessonOf["reading"], {
        activities: plainActivities,
        answerShapes: plainActivities.map(() => null),
        spares: null,
        teaching: null,
      }),
    );
    expect(out).not.toContain("data-teach-slot-name");
    expect(out).not.toContain("data-teach-slot=");
    expect(out).toContain("data-frame-next");
    expect(out).toContain("새 단어");
  });
});

// ── 여는 차례 — 선생님 고르기(묶음 마-2 · 델타 spec 설계 4 [L3 · C177] · 정본 AC-3i) ──

const choices: TeacherView[] = teacherRoster().teachers.map(teacherViewOf);
const [mina] = choices;
if (!mina) throw new Error("견본 명단에 선생님이 없다");
/** 그림 글의 따옴표 꼴(renderToStaticMarkup 이 ' 를 &#x27; 로 쓴다). */
const html = (text: string | undefined) =>
  (text ?? "(없음)").replaceAll("'", "&#x27;");
const teachingOf = (
  teacher: TeacherView | null,
  teacherChoices: TeacherView[],
): NonNullable<SessionView["teaching"]> => ({
  teacher,
  teacherChoices,
  praiseSeconds: settingValues["talk.teacher_praise_seconds"] as number,
});

describe("여는 차례 — 선생님 고르기(AC-3i · 설계 4 L3)", () => {
  it("AC-3i 고른 선생님이 없는 집의 가르치는 수업은 막힘 · 쉼이 없으면 '선생님을 골라요'이고, 이미 골랐으면 묻지 않는다", () => {
    expect(
      openingScreenOf({
        blocked: false,
        resting: false,
        teaching: teachingOf(null, choices),
      }),
    ).toBe("choose-teacher");
    expect(
      openingScreenOf({
        blocked: false,
        resting: false,
        teaching: teachingOf(mina, []),
      }),
    ).toBe("lesson");
  });

  it("AC-3i teach 없는 수업은 고르기가 없고, 보일 선생님이 없으면 막다른 화면 없이 수업으로 간다(정한 것 1)", () => {
    expect(
      openingScreenOf({ blocked: false, resting: false, teaching: null }),
    ).toBe("lesson");
    expect(
      openingScreenOf({
        blocked: false,
        resting: false,
        teaching: teachingOf(null, []),
      }),
    ).toBe("lesson");
  });

  it("AC-3i 막힘(말하기 마이크 못 씀) · 쉼이 고르기보다 먼저고, 막힘이 쉼보다 먼저다(여는 차례)", () => {
    const teaching = teachingOf(null, choices);
    expect(openingScreenOf({ blocked: true, resting: false, teaching })).toBe(
      "blocked",
    );
    expect(openingScreenOf({ blocked: false, resting: true, teaching })).toBe(
      "resting",
    );
    expect(openingScreenOf({ blocked: true, resting: true, teaching })).toBe(
      "blocked",
    );
  });

  it("AC-3i 세션 틀: 고른 선생님이 없는 집의 읽기 · 쓰기 가르치는 수업은 오늘 배울 것 앞에 '선생님을 골라요'(회화 조각 · 문구 그대로)이고 오늘 배울 것 조각은 아직 없다", () => {
    for (const lesson of [reading, writing]) {
      const out = frameHtml(
        teachView(lesson, { teaching: teachingOf(null, choices) }),
      );
      expect(out).toContain("data-teacher-choice");
      expect(out).toContain("data-teach-choose");
      expect(out).toContain("선생님을 골라요");
      expect(out).toContain("인사 듣기");
      expect(out).toContain("고른 선생님은 부모님이 바꿀 수 있어요");
      // 고르기 전 큰 단추는 흐린 '선생님과 할래요'(TEACHER_TEXT.chooseGo)
      expect(out).toContain(">선생님과 할래요<");
      for (const t of choices)
        expect(out).toContain(`data-teacher-card="${t.key}"`);
      expect(out).not.toContain('data-teach-slot="today"');
      expect(out).not.toContain(html(lesson.teach?.todayKo));
      // 틀의 '다음'은 없다(큰 단추는 조각 안)
      expect(out).not.toContain("data-frame-next");
      // 고르기는 활동이 아니다 — 지금 활동은 그대로 오늘 배울 것
      expect(out).toContain('data-activity="today"');
      expect(out).toContain('data-activity-no="1"');
    }
  });

  it("AC-3i 세션 틀: 이미 고른 집은 다른 영역 가르치는 수업을 처음 열어도 고르기 없이 오늘 배울 것이다", () => {
    for (const lesson of [reading, writing]) {
      const out = frameHtml(
        teachView(lesson, { teaching: teachingOf(mina, []) }),
      );
      expect(out).not.toContain("data-teacher-choice");
      expect(out).toContain('data-teach-slot="today"');
      expect(out).toContain(html(lesson.teach?.todayKo));
    }
  });

  it("AC-3i 세션 틀: 쉬는 중이면 고르기보다 쉼 안내가 먼저다", () => {
    const out = frameHtml(
      teachView(reading, {
        aiResting: true,
        teaching: teachingOf(null, choices),
      }),
    );
    expect(out).not.toContain("data-teacher-choice");
    expect(out).toContain("data-ai-rest");
  });
});
