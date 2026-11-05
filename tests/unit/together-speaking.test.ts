// 같이 해 보기 말하기 · 말하기 가르치는 수업 세션 틀(가르치고 배우는 수업 plan 묶음 라-3 · 델타 spec 설계 1 '같이 해 보기의 꼴과 수' 말하기 · 5 화면 표 ·
// 9 활동 차례, 정본 15절 AC-22c · AC-3k · AC-4d · AC-5d). 입력은 정규 시드 셋의 승인 말하기 수업(seed/lessons/speaking/3/1.json) 그대로다.
// 판정은 공용 순수 함수(togetherTryRight — 허용 답 두 묶음과 speaking.answer_match_pass, C170 (12))이고, 조각 · 세션 틀은 renderToStaticMarkup 으로
// 그린다(효과 · 누름은 돌지 않음 — 누름 흐름은 e2e teach.spec.ts).
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
vi.mock("@/server/actions/writing", () => ({}));
vi.mock("@/server/actions/speaking", () => ({
  evaluateSpeakingAnswer: async () => ({ ok: false, reason: "unavailable" }),
}));
vi.mock("@/server/actions/teacher", () => ({}));
vi.mock("@/server/actions/conversation", () => ({}));

import { SessionFrame } from "@/app/(child)/session/[id]/session-frame";
import {
  SPEAKING_TEXT,
  type SpeakingEnv,
  SpeakingTogetherInput,
  type SpeakingTogetherTry,
} from "@/components/session/speaking";
import { TEACH_TEXT } from "@/components/session/teach/teacher-line";
import { LessonFileSchema, type LessonOf } from "@/core/seed/schema/lesson";
import {
  parseAttemptInput,
  questionJudgeContextOf,
  soloOutcomeOf,
} from "@/core/session/attempt";
import { type Activity, activitiesOf } from "@/core/session/preview";
import { outcomeContextOf } from "@/core/session/spares";
import {
  savedQuestionInputOf,
  spareChoiceOnDevice,
  togetherTryRight,
} from "@/core/session/teach-frame";
import {
  judgeSpeakingQuestion,
  questionTextsOf,
  type SpeakingJudgement,
} from "@/core/speaking/judge";
import { type MeaningWord, meaningWordsFor } from "@/core/speaking/meaning";
import { speechSettingsFrom } from "@/core/speech/listen";
import type { SessionView } from "@/server/session";
import { testSettingValues } from "../fixtures/settings";

const ROOT = process.cwd();
const lesson = (() => {
  const file = LessonFileSchema.parse(
    JSON.parse(
      readFileSync(
        join(ROOT, "seed", "lessons", "speaking", "3", "1.json"),
        "utf8",
      ),
    ),
  );
  return file.lessons[0] as LessonOf["speaking"];
})();
const together = lesson.teach?.together ?? [];
const [s5, s6] = together;
if (!s5?.choices || s5.answerNo === undefined || !s6)
  throw new Error("승인 수업 같이 해 보기 꼴(S5 고르기 · S6 틀만)");
const settings = testSettingValues();
const vocab: MeaningWord[] = JSON.parse(
  readFileSync(join(ROOT, "seed", "vocab.json"), "utf8"),
).vocab;
const meaningWords = meaningWordsFor(questionTextsOf(lesson), vocab);
const activities: Activity[] = activitiesOf({
  area: "speaking",
  level: 3,
  content: lesson.content,
  ...(lesson.teach ? { teach: lesson.teach } : {}),
} as Parameters<typeof activitiesOf>[0]);
const ctx = outcomeContextOf({
  config: {
    speaking: {
      answerMatchPass: settings["speaking.answer_match_pass"] as number,
    },
    ui: {
      matchPhraseLevels: settings["ui.match_phrase_levels"] as [number, number],
    },
  },
  homophones: [],
  lemmaEntries: [],
  appJudged: false,
  lesson,
  meaningWords,
});
const togetherActivity = (index: number) => {
  const a = activities.find((x) => x.kind === "together" && x.index === index);
  if (a?.kind !== "together") throw new Error("같이 해 보기 활동");
  return a;
};
const rightOf = (index: number, attempt: SpeakingTogetherTry) =>
  togetherTryRight(togetherActivity(index), lesson, attempt, ctx);
const noOf = (match: (a: Activity) => boolean) =>
  activities.findIndex(match) + 1;

describe("같이 해 보기 말하기 판정(AC-4d · C170 (12))", () => {
  it("AC-4d S5 누가 자리: 맞은 보기만 고른 시도는 맞음(말하기 전 단계), 고르고 같이 말한 허용 답은 맞음, 틀린 보기 · 뜻이 틀린 말은 맞음이 아니다", () => {
    const right = s5.answerNo ?? 0;
    const wrongChoice = right === 1 ? 2 : 1;
    expect(rightOf(0, { choice: right })).toBe(true);
    expect(rightOf(0, { choice: wrongChoice })).toBe(false);
    for (const answer of s5.accepted)
      expect(rightOf(0, { choice: right, heard: answer })).toBe(true);
    expect(rightOf(0, { choice: right, heard: "Yes, they eat cake." })).toBe(
      false,
    );
    // 보기를 틀리면 말이 맞아도 그 시도는 맞음이 아니다(고르고 같이 말하는 문항)
    expect(
      rightOf(0, { choice: wrongChoice, heard: s5.modelAnswer ?? "" }),
    ).toBe(false);
  });

  it("AC-4d S6 틀만 보고 말하기: 허용 답 두 묶음 가운데 하나와 맞으면 맞음, 질문 글을 되풀이한 말은 맞음이 아니다", () => {
    for (const answer of [...s6.accepted, ...(s6.acceptedMeaning ?? [])])
      expect(rightOf(1, { heard: answer })).toBe(true);
    expect(rightOf(1, { heard: "Yes, they go home." })).toBe(false);
  });
});

const env: SpeakingEnv = {
  speech: undefined,
  speechSettings: speechSettingsFrom((key) => settings[key]),
  level: 3,
  homophones: [],
  onSpeech: () => "heard",
};
const inputHtml = (
  index: number,
  tries: SpeakingTogetherTry[],
  lineDone = true,
) => {
  const item = together[index];
  if (!item) throw new Error("같이 해 보기 문항");
  return renderToStaticMarkup(
    createElement(SpeakingTogetherInput, {
      item,
      env: { ...env, speech: undefined },
      tries,
      choiceRight: (no: number) => rightOf(index, { choice: no }),
      tryRight: (t: SpeakingTogetherTry) => rightOf(index, t),
      lineDone,
      onTry: () => {},
      onSkip: () => {},
    }),
  );
};

describe("같이 해 보기 말하기 화면(AC-4d · AC-5d)", () => {
  it("AC-4d S5 는 누가 자리 보기 둘을 먼저 고르고(말하기 단추 없음), 틀린 보기는 ✕ 로 남는다", () => {
    const first = inputHtml(0, []);
    expect(first).toContain("data-together-choices");
    for (const choice of s5.choices ?? []) expect(first).toContain(choice);
    expect(first).not.toContain("data-speak=");
    const wrongChoice = s5.answerNo === 1 ? 2 : 1;
    const wrong = inputHtml(0, [{ choice: wrongChoice }]);
    expect(wrong).toMatch(
      new RegExp(
        `data-answer-choice="${wrongChoice}"[^>]*data-choice-state="picked-wrong"`,
      ),
    );
    expect(wrong).not.toContain("data-speak=");
  });

  it("AC-4d 고른 뒤 말이 맞지 않으면 틀 반응 뒤 바른 답을 보이며 '같이 말해 볼까요'와 말하기 단추(판정 글자 없음)", () => {
    const right = s5.answerNo ?? 0;
    const out = inputHtml(0, [{ choice: right, heard: "Yes, they eat cake." }]);
    expect(out).toContain("data-together-echo");
    expect(out).toContain(s5.modelAnswer ?? "");
    expect(out).toContain(SPEAKING_TEXT.together);
    expect(out).toContain("data-speak=");
    expect(out).toMatch(/data-heard=""[^>]*>Yes, they eat cake\.</);
    expect(out).not.toMatch(/맞음|틀림|\d+\s*%/);
    // 맞으면 단추 없음(틀이 칭찬 뒤 넘어간다)
    expect(
      inputHtml(0, [{ choice: right, heard: s5.modelAnswer ?? "" }]),
    ).not.toContain("data-speak=");
  });

  it("AC-4d S6 은 영어 틀만 보고 바로 말하고, 선생님 줄이 끝나기 전에는 말하기 단추가 흐리다(R2)", () => {
    const reading = inputHtml(1, [], false);
    expect(reading).not.toContain("data-together-choices");
    expect(reading).toContain("data-speak-waiting");
    expect(inputHtml(1, [], true)).not.toContain("data-speak-waiting");
  });
});

// ── 세션 틀(말하기 가르치는 수업) ──

const CONFIG: SessionView["config"] = {
  speech: speechSettingsFrom((key) => settings[key]),
  maxRetries: settings["speech.max_retries"] as number,
  silentItemsMax: settings["speech.silent_items_max"] as number,
  ui: {
    waitHintSeconds: settings["ui.wait_hint_seconds"] as [number, number],
    matchPhraseLevels: settings["ui.match_phrase_levels"] as [number, number],
    autoNextSeconds: settings["ui.auto_next_seconds"] as number,
  },
  speaking: {
    answerMatchPass: settings["speaking.answer_match_pass"] as number,
    answerMaxSeconds: 1,
    prepareSeconds: settings["speaking.prepare_seconds"] as number,
    slowRateFactor: settings["speech.slow_rate_factor"] as number,
  },
};
const spareNos = activities.flatMap((a, i) =>
  a.kind === "spare" ? [i + 1] : [],
);
function speakingView(over: Partial<SessionView> = {}): SessionView {
  return {
    sessionId: "00000000-0000-4000-8000-000000000003",
    area: "speaking",
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
    meaningWords,
    appJudged: false,
    answerShapes: activities.map(() => "one-sentence"),
    openSessionIds: [],
    lesson,
    preview: lesson.preview.map((p) => ({ ...p, added: false })),
    wordPictures: {},
    keyPictures: {},
    showKo: true,
    aiResting: false,
    aiQuestionsResting: false,
    guided: null,
    composition: null,
    rewrite: null,
    spares: {
      show: [],
      skip: spareNos,
      cap: settings["lesson.spares_per_session.speaking"] as number,
      outcomes: [],
    },
    teaching: {
      teacher: null,
      praiseSeconds: settings["talk.teacher_praise_seconds"] as number,
      teacherChoices: [],
    },
    ...over,
  } as SessionView;
}
const frameHtml = (view: SessionView) =>
  renderToStaticMarkup(createElement(SessionFrame, { view }));
const bandOf = (out: string) => out.slice(0, out.indexOf("</header>"));

describe("세션 틀 — 말하기 가르치는 수업(AC-22c · AC-3k)", () => {
  it("AC-22c 말하기 같이 해 보기는 라-1 같이 해 보기 틀 안에 말하기 입력(누가 자리 보기)을 붙이고 위 띠는 '같이 해 보기'다", () => {
    const out = frameHtml(
      speakingView({ current: noOf((a) => a.kind === "together") }),
    );
    expect(out).toContain('data-teach-slot="together"');
    expect(out).toContain("data-together-speaking");
    expect(out).toContain("data-together-choices");
    // 빈 자리 문장(filled — 빈칸은 칸으로 그림)과 질문
    expect(out).toContain("data-blank");
    expect(out).toContain(s5.filled.split("___")[1] ?? "~");
    expect(out).toContain(s5.en);
    expect(bandOf(out)).toContain("같이 해 보기");
    expect(out).not.toContain("data-frame-next");
    expect(out.match(/data-progress-group=/g)).toHaveLength(5);
  });

  it("AC-22c 혼자 해 보기 첫 화면(따라 말하기 낱말)에만 초상과 '이제 혼자 해 봐요.'가 있다", () => {
    const first = noOf((a) => a.kind === "repeat-word");
    const out = frameHtml(speakingView({ current: first }));
    expect(out).toContain('data-teach-first="solo"');
    expect(out).toContain(TEACH_TEXT.soloFirst);
    expect(out).toContain("data-repeat-activity");
    expect(bandOf(out)).toContain("혼자 해 보기");
    const second = frameHtml(speakingView({ current: first + 1 }));
    expect(second).not.toContain("data-teach-first");
  });

  it("AC-22c 혼자 질문(3단계 — AI 판정)은 이야기 화면부터이고, 기록 활동이라 틀의 '다음'이 없다", () => {
    const out = frameHtml(
      speakingView({ current: noOf((a) => a.kind === "question") }),
    );
    expect(out).toContain("data-teach-story");
    expect(out).toContain('data-question-answer-stage="story"');
    expect(out).not.toContain(lesson.content.questions[0]?.storyEn ?? "~");
    expect(out).not.toContain("data-frame-next");
  });

  it("AC-3k 짝 자리: 낸 첫 짝(질문 짝)은 '스스로 해 보기'와 말하기 짝 첫 장 문구('다른 이야기로 혼자 해 봐요.') 뒤 이야기 화면이다", () => {
    const spareQuestion = noOf(
      (a) => a.kind === "spare" && a.base === "question",
    );
    const out = frameHtml(
      speakingView({
        current: spareQuestion,
        spares: {
          show: [spareQuestion],
          skip: spareNos.filter((no) => no !== spareQuestion),
          cap: settings["lesson.spares_per_session.speaking"] as number,
          outcomes: [],
        },
      }),
    );
    expect(bandOf(out)).toContain("스스로 해 보기");
    expect(out).toContain('data-teach-first="spare"');
    expect(out).toContain(TEACH_TEXT.spareFirst.speaking);
    expect(out).toContain("data-teach-story");
  });

  it("AC-22c 짝 차례는 질문 → 듣기 → 문장 → 낱말이고 듣기 · 따라 말하기 짝은 혼자 문항과 같은 화면이다", () => {
    const bases = activities.flatMap((a) =>
      a.kind === "spare" ? [a.base] : [],
    );
    const order = ["question", "listening", "repeat-sentence", "repeat-word"];
    expect(
      [...bases].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    ).toEqual(bases);
    const listening = noOf((a) => a.kind === "spare" && a.base === "listening");
    const out = frameHtml(
      speakingView({
        current: listening,
        spares: {
          show: [listening],
          skip: spareNos.filter((no) => no !== listening),
          cap: 4,
          outcomes: [],
        },
      }),
    );
    expect(out).toContain("data-listening-stage");
    const sentence = noOf(
      (a) => a.kind === "spare" && a.base === "repeat-sentence",
    );
    expect(frameHtml(speakingView({ current: sentence }))).toContain(
      lesson.content.repeat.spares?.sentences[0] ?? "~",
    );
  });

  it("AC-5d 1~2단계 앱 판정 수업(teach 없음)의 질문은 지금 화면 그대로다", () => {
    const { teach: _teach, ...plain } = lesson;
    const plainActivities = activitiesOf({
      area: "speaking",
      level: 3,
      content: plain.content,
    } as Parameters<typeof activitiesOf>[0]);
    const out = frameHtml(
      speakingView({
        lesson: plain as LessonOf["speaking"],
        activities: plainActivities,
        appJudged: true,
        teaching: null,
        spares: null,
        current: plainActivities.findIndex((a) => a.kind === "question") + 1,
      }),
    );
    expect(out).toContain("data-question-answer-stage");
    expect(out).not.toContain("data-teach-story");
    expect(out).not.toContain("data-question-judge");
  });
});

describe("AI 판정 혼자 질문의 기기 몫 짝 고르기(AC-22c · L-34)", () => {
  const q0 = lesson.content.questions[0];
  if (!q0?.accepted?.[0]) throw new Error("승인 질문 꼴");
  const accepted0 = q0.accepted[0];
  const qNo = noOf((a) => a.kind === "question");
  const qActivity = activities[qNo - 1];
  const spareNo = noOf(
    (a) => a.kind === "spare" && a.base === "question" && a.index === 0,
  );
  if (!qActivity) throw new Error("질문 활동");

  it("AC-22c 서버가 저장한 끝 시도를 합친 판정으로 다시 셈한 사본은 서버 판정과 같은 결과(맞음 · 틀림)이고, 틀리면 이 기기에서 그 짝을 고른다", () => {
    const cases: [string, SpeakingJudgement][] = [
      ["Yes, they eat rice.", "correct"],
      [accepted0, "partial"],
      [accepted0, "correct"],
      ["They have pizza.", "correct"],
      ["They have pizza.", "partial"],
      ["zzz qqq", "retry"],
    ];
    for (const [heard, ai] of cases) {
      const server = judgeSpeakingQuestion(
        q0,
        heard,
        questionJudgeContextOf(ctx),
        ai,
      );
      const input = parseAttemptInput(
        savedQuestionInputOf(
          q0,
          { final: { heard: [heard], failures: 0 }, judgement: server.final },
          ctx,
        ),
      );
      expect(input).toBeDefined();
      if (input?.kind !== "question") throw new Error("시도 꼴");
      expect(input.judge?.final).toBe(server.final);
      expect(soloOutcomeOf(qActivity, lesson, input, ctx)).toBe(
        server.final === "correct" ? "correct" : "wrong",
      );
      const choice = spareChoiceOnDevice({
        activities,
        lesson,
        server: { show: [], skip: spareNos, cap: 4, outcomes: [] },
        attempts: [{ activityNo: qNo, input }],
        ctx,
      });
      expect(choice.show.includes(spareNo)).toBe(server.final !== "correct");
    }
  });

  it("AC-N20 판정 없이 넘어간 시도(AI 실패 · 소리를 못 들은 답)는 판정 칸이 없어 U 이고 짝을 내지 않는다", () => {
    const input = parseAttemptInput(
      savedQuestionInputOf(
        q0,
        {
          final: {
            heard: [accepted0],
            failures: 0,
            v: 2,
            techError: "speak_fail",
          },
        },
        ctx,
      ),
    );
    if (input?.kind !== "question") throw new Error("시도 꼴");
    expect(input.judge).toBeUndefined();
    expect(soloOutcomeOf(qActivity, lesson, input, ctx)).toBe("unscored");
  });
});
