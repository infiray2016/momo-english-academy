// 결과 첫머리 되짚기(가르치고 배우는 수업 plan 묶음 라-4 · 정본 03:26 세션 결과 행 · 03:80 세션 결과(되짚기) 행 · 델타 spec 설계 5 · UI · UX
// spec 설계 5.4 결과 판 배치, 15절 AC-6f · AC-6g). 서버의 되짚기 화면 자료(recapViewOf — 순수)가 서버가 고른 줄(recap.line)에 맞는 시드 글을
// 싣는지, 다시 하기 · 되짚기 없는 결과에서 빠지는지, 결과 화면이 본 열 맨 위에 초상 · 마무리 한 줄을 두고 오늘 만난 말 칸에 단어 카드
// (소리 단추) · 칩을 단 문장 틀을 두는지를 본다. 화면은 renderToStaticMarkup 으로 그린다(효과는 돌지 않음).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/writing", () => ({}));
vi.mock("@/server/actions/teacher", () => ({}));

import { RESULT_TEXT, ResultView } from "@/app/(child)/result/[id]/result-view";
import { REWARD_TEXT } from "@/components/session/reward";
import { TEACH_TEXT } from "@/components/session/teach/teacher-line";
import { LessonFileSchema } from "@/core/seed/schema/lesson";
import type { RecapResult } from "@/core/session/recap";
import { speechSettingsFrom } from "@/core/speech/listen";
import {
  type ResultView as ResultData,
  recapViewOf,
} from "@/server/session/result";

const ROOT = process.cwd();

/** 정규 시드 첫 수업의 teach.recap · 미리보기(읽기 3단계 단원 1). */
function seedLesson(area: "reading" | "writing" | "speaking") {
  const file = LessonFileSchema.parse(
    JSON.parse(
      readFileSync(join(ROOT, "seed", "lessons", area, "3", "1.json"), "utf8"),
    ),
  );
  const lesson = file.lessons[0];
  if (!lesson || !("teach" in lesson) || !lesson.teach)
    throw new Error(`${area} 첫 수업에 teach 없음`);
  const preview = "preview" in lesson ? (lesson.preview ?? []) : [];
  return {
    recap: lesson.teach.recap,
    metWords: preview.map((p: { word: string; meaningKo: string }) => ({
      word: p.word,
      meaningKo: p.meaningKo,
    })),
  };
}

const SPEECH = (() => {
  const raw = JSON.parse(
    readFileSync(
      join(ROOT, "tests", "fixtures", "speech", "settings.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  return speechSettingsFrom((key) => raw[key]);
})();

const MINA = {
  key: "mina",
  nameKo: "미나",
  introKo: "안녕",
  traitsKo: ["밝음", "다정함", "꼼꼼함"],
  greetingEn: "Hi!",
  color: { room: "#f6e7d8", accent: "#b23a6b" },
  modelPath: "/teachers/mina.1a2b3c4d.vrm",
  portraitPath: "/teachers/mina.fdc5f7f2.webp",
  voice: { pitch: 1.08, prefer: [] },
};

const can: RecapResult = {
  line: "closeKo",
  evidence: { valid: 3, done: 3, ratio: 1 },
};
const practiced: RecapResult = {
  line: "closeKoPracticed",
  evidence: { valid: 1, done: 1, ratio: 1 },
};

const reading = seedLesson("reading");

const resultData = (over: Partial<ResultData> = {}): ResultData => ({
  sessionId: "00000000-0000-4000-8000-000000000001",
  area: "reading",
  level: 3,
  unit: 1,
  kind: "regular",
  writingPart: null,
  title: "점심 먹기",
  next: { kind: "lesson", lessonId: "00000000-0000-4000-8000-000000000003" },
  metWords: reading.metWords,
  waitHintSeconds: [1, 5],
  starsPerLesson: 1,
  speech: SPEECH,
  ...over,
});

const withRecap = (over: Partial<ResultData> = {}) =>
  resultData({
    recap: can,
    recapView: recapViewOf({
      kind: "regular",
      recap: can,
      teach: reading.recap,
      teacher: MINA,
    }),
    ...over,
  });

const render = (view: ResultData) =>
  renderToStaticMarkup(createElement(ResultView, { view }));

describe("되짚기 화면 자료(서버 recapViewOf · AC-6g 화면 몫)", () => {
  it("AC-6g 결과 화면 자료는 서버가 고른 줄(recap.line)의 시드 글을 싣는다: closeKo 면 teach.recap.closeKo, closeKoPracticed 면 closeKoPracticed", () => {
    for (const area of ["reading", "writing", "speaking"] as const) {
      const { recap } = seedLesson(area);
      expect(
        recapViewOf({
          kind: "regular",
          recap: can,
          teach: recap,
          teacher: MINA,
        })?.lineKo,
        area,
      ).toBe(recap.closeKo);
      expect(
        recapViewOf({
          kind: "regular",
          recap: practiced,
          teach: recap,
          teacher: MINA,
        })?.lineKo,
        area,
      ).toBe(recap.closeKoPracticed);
    }
  });

  it("AC-6f 되짚기 자료의 문장 틀 · 칩은 시드 teach.recap 그대로(글 · role)이고, 선생님은 넘긴 값(고르기 전 null)이다", () => {
    const view = recapViewOf({
      kind: "regular",
      recap: practiced,
      teach: reading.recap,
      teacher: null,
    });
    expect(view?.frame?.frameEn).toBe(reading.recap.frameEn);
    expect(view?.frame?.chips).toEqual(
      reading.recap.chips.map((c) => ({ text: c.text, role: c.role })),
    );
    expect(view?.teacher).toBeNull();
  });

  it("AC-6f 다시 하기 결과의 되짚기 자료는 고른 마무리 줄 · 선생님만 있고 문장 틀이 없다(오늘 만난 말을 두지 않음 — 정본 03:26)", () => {
    for (const recap of [can, practiced]) {
      const view = recapViewOf({
        kind: "retry",
        recap,
        teach: reading.recap,
        teacher: MINA,
      });
      expect(view, recap.line).toEqual({
        lineKo: reading.recap[recap.line],
        frame: null,
        teacher: MINA,
      });
    }
  });

  it("AC-6f 줄을 고르지 않은 결과(teach 없는 수업 · 쓰기 6~12 첫 세션)에는 되짚기 자료가 없다", () => {
    expect(
      recapViewOf({
        kind: "regular",
        recap: undefined,
        teach: reading.recap,
        teacher: MINA,
      }),
    ).toBeUndefined();
    expect(
      recapViewOf({
        kind: "regular",
        recap: can,
        teach: undefined,
        teacher: MINA,
      }),
    ).toBeUndefined();
  });
});

describe("결과 첫머리 되짚기 화면(정본 03:26 · 03:80 · 설계 5.4 · AC-6f)", () => {
  it("AC-6f 본 열 맨 위에 초상 · 마무리 한 줄이 있고, 그 뒤 '수업을 끝냈어요!' → 오늘 만난 말(단어 카드 → 칩을 단 문장 틀 · '다시 듣기') → 단추 줄 차례다", () => {
    const html = render(withRecap());
    const head = html.indexOf("data-recap-head");
    const done = html.indexOf(RESULT_TEXT.done);
    const words = html.indexOf("data-met-words");
    const firstWord = html.indexOf("data-met-word=");
    const frame = html.indexOf("data-recap-frame");
    const buttons = html.indexOf("data-result-buttons");
    expect(head).toBeGreaterThan(-1);
    expect(head).toBeLessThan(done);
    expect(done).toBeLessThan(words);
    expect(words).toBeLessThan(firstWord);
    expect(firstWord).toBeLessThan(frame);
    expect(frame).toBeLessThan(buttons);
    expect(html).toContain(reading.recap.closeKo);
    expect(html).not.toContain(reading.recap.closeKoPracticed);
    expect(html).toContain("미나 선생님");
    expect(html).toContain(REWARD_TEXT.metWords);
    expect(html).toContain(TEACH_TEXT.listenAgain);
    expect(html.match(/data-met-word-listen=/g)).toHaveLength(
      reading.metWords.length,
    );
    expect(html.match(/data-chip-role=/g)).toHaveLength(
      reading.recap.chips.length,
    );
  });

  it("AC-6f 되짚기는 본 열 안이고 별 자리는 그 앞(세로 첫째) · 가로 오른쪽 열이며, 판 꼴(두 열 · flex-row-reverse · 단추 줄 '다음 수업' 큰 · '홈' 작은)은 그대로다", () => {
    const html = render(withRecap());
    const star = html.indexOf("data-result-reward");
    const head = html.indexOf("data-recap-head");
    expect(star).toBeGreaterThan(-1);
    expect(star).toBeLessThan(head);
    expect(html).toContain('data-result-columns="two"');
    expect(html).toContain("landscape:flex-row-reverse");
    const row = html.slice(html.indexOf("data-result-buttons"));
    expect(row).toContain(RESULT_TEXT.nextLesson);
    expect(row).toMatch(/<a[^>]*href="\/"[^>]*>홈<\/a>/);
    // 첫 그림(읽기 전)에서 '다음 수업'은 흐리지 않다 — 되짚기 읽기는 행동을 막지 않는다
    expect(row).not.toMatch(/<button[^>]*data-result-next[^>]*\sdisabled=""/);
  });

  it("AC-6f 첫 그림(읽기 전)에는 소리 단추 · '다시 듣기'가 흐리고 '소리가 안 나와서 글로 봐요.'는 없다", () => {
    const html = render(withRecap());
    expect(html.match(/<button[^>]*data-met-word-listen[^>]*>/g)).toHaveLength(
      reading.metWords.length,
    );
    for (const button of html.match(
      /<button[^>]*data-(met-word-listen|recap-listen)[^>]*>/g,
    ) ?? [])
      expect(button).toMatch(/\sdisabled=""/);
    expect(html).not.toContain(TEACH_TEXT.soundless);
  });

  it("AC-6f 되짚기 없는 결과(teach 없는 수업)는 첫머리 · 문장 틀이 없고, 오늘 만난 말 카드에 소리 단추가 있으며 바로 누를 수 있다", () => {
    const html = render(resultData());
    expect(html).not.toContain("data-recap-head");
    expect(html).not.toContain("data-recap-frame");
    expect(html).toContain(REWARD_TEXT.metWords);
    const listens = html.match(/<button[^>]*data-met-word-listen[^>]*>/g) ?? [];
    expect(listens).toHaveLength(reading.metWords.length);
    for (const button of listens) expect(button).not.toMatch(/\sdisabled=""/);
  });

  it("AC-6f 다시 하기('다시 했어요') 결과도 첫머리에 초상 · 마무리 한 줄이 있고, 오늘 만난 말(단어 카드 · 문장 틀)은 없다", () => {
    const retried = render(
      resultData({
        kind: "retry",
        recap: can,
        recapView: recapViewOf({
          kind: "retry",
          recap: can,
          teach: reading.recap,
          teacher: MINA,
        }),
      }),
    );
    expect(retried).toContain(REWARD_TEXT.retried);
    const head = retried.indexOf("data-recap-head");
    expect(head).toBeGreaterThan(-1);
    expect(head).toBeLessThan(retried.indexOf(RESULT_TEXT.done));
    expect(retried).toContain(reading.recap.closeKo);
    expect(retried).toContain("미나 선생님");
    expect(retried).not.toContain("data-met-words");
    expect(retried).not.toContain(REWARD_TEXT.metWords);
    expect(retried).not.toContain("data-recap-frame");
    expect(retried).not.toContain("data-met-word-listen");
  });

  it("AC-6f 쓰기 6단계 이상 첫 세션(초고) 결과는 '글을 보냈어요 …'이고 되짚기 첫머리 · 문장 틀이 없다(되짚기는 둘째 세션 결과에만 — 정본 03:26)", () => {
    const draft = render(
      resultData({
        area: "writing",
        level: 6,
        writingPart: "draft",
        draft: {
          state: "pending",
          submittedAt: new Date(0).toISOString(),
          waitSeconds: 60,
          lessonId: "00000000-0000-4000-8000-000000000002",
        },
      }),
    );
    expect(draft).toContain(RESULT_TEXT.sent);
    expect(draft).not.toContain("data-recap-head");
    expect(draft).not.toContain("data-recap-frame");
  });

  it("AC-6f 아이 화면에 점수 · 퍼센트 · 근거 수가 없다(마무리 줄 근거는 화면에 내지 않는다)", () => {
    const html = render(withRecap());
    // 보이는 글(꼬리표 밖)에 퍼센트가 없다 — 클래스 글의 % 는 색 섞기 · 위치 값이다
    expect(html.replace(/<[^>]*>/g, " ")).not.toContain("%");
    expect(html).not.toContain("evidence");
    expect(html).not.toContain("ratio");
  });
});
