// 선생님 말풍선의 보이는 영어 · 읽어 줄 차례(plan-p13b 파일별 값 8 · 회화 plan 묶음 10 · 12, 4절 회화 세션 '선생님 차례' 행 · 3.3 · T2 · 검토 I-3).
// 1~3단계 아이가 말할 영어(따라 할 말 · 선택지 · 받침의 답 — 소리 줄)는 읽어 주기만 하고 말풍선 글에 넣지 않는다. 옛 말풍선 시험은 묶음 12 가
// 새 꼴 말풍선(LessonToriBubble)으로 옮겼다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  attemptSaidStep,
  ChildTurn,
  type ChildTurnProps,
  childHeardOf,
  createSpeakHitchLog,
  shouldMarkNudge,
  speakHitchOf,
  withSpeakHitches,
} from "@/components/conversation/child-turn";
import {
  perceivedWaitOf,
  talkCounterLimits,
} from "@/components/conversation/talk-frame";
import {
  answersLine,
  BUBBLE_TEXT,
  LESSON_BUBBLE_START,
  type LessonBubbleContent,
  LessonToriBubble,
  lessonBubbleStep,
  lessonShownEnglishOf,
  lessonSpeakItemsOf,
  lessonSpokenOf,
  playedSoundsOf,
  SILENT_MODE_FROM_SOUNDLESS,
  soundlessNoticeLeftMs,
  soundlessOf,
  TORI_BUBBLE_MAX_PX,
  turnPictureShown,
  waitLineDelayMs,
} from "@/components/conversation/tori";
import { TEACH_TEXT } from "@/components/session/teach/teacher-line";
import { choicesLine } from "@/core/ai/calls/talk-lesson";
import { CLIENT_LISTENS_MAX } from "@/core/conversation/client-listen";
import { talkSpeechSettingsFrom } from "@/core/conversation/listen";
import { speakingCounters, speakingCountersStart } from "@/core/speaking/judge";
import { speechSettingsFrom } from "@/core/speech/listen";
import type { SpeechPort } from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

// 브라우저 전용 표시 모듈 · 쪽 길잡이 · 서버 액션은 시험(node)에서 빈 모듈로
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));

/** 3단계 AI 차례 한 턴(반응 → 신호 말 → 따라 할 말 소리 줄 → 붙인 카드 질문). */
const LESSON_LINES = [
  { t: "s", en: "Nice!" },
  { t: "s", en: "Listen and say!" },
  { t: "ko", ko: "좋아! 듣고 말해 봐!" },
  { t: "sound", kind: "model", say: "I play soccer." },
  {
    t: "add",
    kind: "question",
    en: "What do you do on Sunday?",
    ko: "일요일에 뭐 해?",
  },
] as const;

function lessonContent(
  lines: readonly Parameters<typeof lessonBubbleStep>[1][],
  done = true,
): LessonBubbleContent {
  const out = lines.reduce(lessonBubbleStep, LESSON_BUBBLE_START);
  return { ...out, done };
}

// ── 말풍선 렌더(옛 말풍선 시험을 새 꼴 LessonToriBubble 로 옮김 — 회화 plan 묶음 12) ──

/** 글 줄만 든 새 꼴 말풍선 내용. */
const textContent = (sentences: string[], done = true) =>
  lessonContent(
    sentences.map((en) => ({ t: "s", en }) as const),
    done,
  );

describe("답 두 개 잇기", () => {
  it("회화 화면: 답 두 개(선택지)를 잇는 말은 회화 턴 규격의 이음(다시 쓸 선생님 차례)과 같다", () => {
    const pair: [string, string] = ["I'm nine.", "I'm ten."];
    expect(answersLine(pair)).toBe(choicesLine(pair));
  });
});

describe("차례 5 fix 1 — 말풍선 렌더 · 아이 차례 · 틀 셈", () => {
  const base = {
    level: 3,
    englishName: "Momo",
    waitSeconds: [1, 5] as const,
    onReplay: () => {},
    onSound: () => {},
  };

  it("회화 화면: 그림 턴 그림은 꾸밈 그림이라 대체 글이 비어 있다(검토 M-4)", () => {
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: textContent(["Look!"]),
        waiting: null,
        picture: {
          meaningKo: "apple",
          src: "/images/apple.svg",
          catalogued: true,
        },
      }),
    );
    expect(html).toContain('data-turn-picture=""');
    expect(html).toContain('alt=""');
    expect(html).not.toContain('alt="apple"');
  });

  it("회화 화면: 문장은 앞 줄이 다 흐른 뒤 다음 줄이 나온다 — 처음 그림에는 첫 줄만 있다(검토 M-5)", () => {
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: textContent(["One.", "Two."], false),
        waiting: null,
      }),
    );
    expect(html.match(/data-tori-line=""/g)).toHaveLength(1);
    expect(html).not.toContain("Two.");
  });

  it("AC-19c 말풍선의 접근 이름은 '[이름] 말 다시 듣기'이고 고르기 전에는 '선생님 말 다시 듣기'다", () => {
    const named = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        teacherName: "미나",
        content: textContent(["Hi!"]),
        waiting: null,
      }),
    );
    expect(named).toContain('aria-label="미나 말 다시 듣기"');
    expect(named).not.toContain("토리");
    const before = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: textContent(["Hi!"]),
        waiting: null,
      }),
    );
    expect(before).toContain('aria-label="선생님 말 다시 듣기"');
  });

  it("회화 화면: 기다림 표시(상태 줄)는 말풍선 단추 밖 칸에 있다(검토 M-9)", () => {
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: textContent([], false),
        waiting: 0,
      }),
    );
    expect(html).toContain('data-tori-waiting=""');
    expect(html).toContain('role="status"');
    expect(html).not.toContain("<button");
  });

  it("회화 화면: '막히면 눌러요'는 힌트 단추가 있어 보인 턴에만 남긴다(검토 M-8)", () => {
    expect(shouldMarkNudge(true, 2)).toBe(true);
    expect(shouldMarkNudge(true, 0)).toBe(false);
    expect(shouldMarkNudge(false, 2)).toBe(false);
  });

  it("회화 화면: 체감 대기는 아이가 말을 멈춘 때부터 첫 문장까지이고 시작을 모르면 없다(검토 M-1)", () => {
    expect(perceivedWaitOf(1000, 3500.4)).toBe(2500);
    expect(perceivedWaitOf(undefined, 3500)).toBeUndefined();
    expect(perceivedWaitOf(4000, 3500)).toBe(0);
  });

  it("회화 화면: 회화의 인식 실패 셈은 말소리 없음 상한을 두지 않아 P11a 셈이 막힌 안내를 따로 내지 않는다(검토 M-6)", () => {
    const limits = talkCounterLimits(3);
    let state = speakingCountersStart();
    const verdicts: string[] = [];
    for (let question = 0; question < 10; question++) {
      for (let i = 0; i < 3; i++) {
        const step = speakingCounters(
          state,
          { type: "error", code: "no-speech" },
          limits,
        );
        state = step.state;
        verdicts.push(step.verdict);
      }
      state = speakingCounters(state, { type: "next-activity" }, limits).state;
    }
    expect(verdicts).not.toContain("speech-silent");
  });
});

describe("차례 5 fix 2 — 그림 깨짐 · 말풍선 폭 · 뜻 자리", () => {
  const base = {
    level: 3,
    englishName: "Momo",
    waitSeconds: [1, 5] as const,
    onReplay: () => {},
    onSound: () => {},
  };

  it("회화 화면: 그림 턴 그림은 파일이 있고 깨지지 않았을 때만 그리고 깨지면 자리도 접는다(화면 검토 I-2)", () => {
    const ok = {
      meaningKo: "사과",
      src: "/images/apple.svg",
      catalogued: true,
    };
    expect(turnPictureShown(ok, false)).toBe(true);
    expect(turnPictureShown(ok, true)).toBe(false);
    expect(turnPictureShown({ meaningKo: "", catalogued: false }, false)).toBe(
      false,
    );
    expect(turnPictureShown(undefined, false)).toBe(false);
    const none = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: textContent(["Look!"]),
        waiting: null,
        picture: { meaningKo: "", catalogued: false },
      }),
    );
    expect(none).not.toContain("data-turn-picture");
  });

  it("AC-16b 말풍선 아래 설명 줄도 {NAME} 을 영어 이름으로 채워 보인다(결함 E)", () => {
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: textContent(["Nice!"]),
        waiting: null,
        explanation: "{NAME}, 'fine' 은 좋다는 뜻이야.",
      }),
    );
    expect(html).toMatch(/data-tori-explanation=""[^>]*>Momo, /);
    expect(html).not.toContain("{NAME}");
  });

  it("회화 화면: 말풍선은 글 길이만큼이고 상한 폭이 있으며 뜻 줄과 답 두 개(선택지) 단추는 한 묶음 자리에 있다(화면 검토 M-2 · M-3)", () => {
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        ...base,
        content: lessonContent(
          [
            { t: "s", en: "Hi!" },
            {
              t: "sound",
              kind: "choices",
              answers: ["I'm good.", "I'm fine."],
            },
          ],
          false,
        ),
        waiting: null,
      }),
    );
    expect(html).toContain("w-fit");
    expect(html).toContain(`max-w-[${TORI_BUBBLE_MAX_PX}px]`);
    // 뜻이 아직 없어도 묶음 자리(최소 높이)가 먼저 있고 그 안에 ①② 가 있다
    expect(html).toMatch(/data-tori-under=""[^>]*>.*data-answer-listen/);
  });
});

describe("답 두 개 듣기 단추 꼴(전체 디자인 리뷰 M-5)", () => {
  it("회화 화면: 답 두 개(선택지) 듣기 단추는 보드 글꼴(Fredoka) 숫자 1 · 2 를 원 테 안에 그리고 대체 글꼴로 떨어지는 동그라미 숫자 글자가 없으며 이름은 그대로다", () => {
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        content: lessonContent([
          { t: "s", en: "How are you?" },
          {
            t: "sound",
            kind: "choices",
            answers: ["I'm good.", "I'm fine."],
          },
        ]),
        level: 1,
        englishName: "Momo",
        waiting: null,
        waitSeconds: [5, 10],
        onReplay: () => {},
        onSound: () => {},
      }),
    );
    expect(html).not.toMatch(/[①②]/);
    expect(html).toContain('aria-label="첫째 답 듣기"');
    expect(html).toContain('aria-label="둘째 답 듣기"');
    const marks = [...html.matchAll(/data-answer-mark="(\d)"[^>]*>(\d)</g)];
    expect(marks.map((m) => [m[1], m[2]])).toEqual([
      ["1", "1"],
      ["2", "2"],
    ]);
    expect(html).toMatch(/data-answer-mark="1"[^>]*class="[^"]*font-en/);
    expect(html).toMatch(/data-answer-mark="1"[^>]*class="[^"]*rounded-full/);
  });
});

// ── 회화 plan 묶음 10: 새 꼴 줄(s · ko · add · sound)의 말풍선 · 소리 줄 단추 · 맞장구 · 아이 말풍선 · sp 모으기 ──

describe("묶음 10 — 새 꼴 말풍선(소리 줄은 글로 보이지 않음, T2)", () => {
  it("AC-15q 받은 줄을 차례대로 쌓고 끝 줄 · 쉬는 줄 같은 화면 밖 줄은 쌓지 않는다", () => {
    const c = lessonContent([
      ...LESSON_LINES,
      { t: "end" } as unknown as Parameters<typeof lessonBubbleStep>[1],
    ]);
    expect(c.lines.map((l) => l.t)).toEqual(["s", "s", "sound", "add"]);
    expect(c.ko).toBe("좋아! 듣고 말해 봐!");
  });

  it("AC-15q 1~3단계 말풍선 글은 선생님 문장과 붙인 카드 줄뿐이고 따라 할 말 · 선택지 · 받침의 답은 없다", () => {
    const c = lessonContent([
      ...LESSON_LINES,
      { t: "sound", kind: "choices", answers: ["I play games.", "I swim."] },
      { t: "sound", kind: "answer", say: "I go to the park." },
    ]);
    const shown = lessonShownEnglishOf(c);
    expect(shown).toEqual([
      "Nice!",
      "Listen and say!",
      "What do you do on Sunday?",
    ]);
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        content: c,
        level: 3,
        englishName: "Momo",
        waiting: null,
        waitSeconds: [1, 5],
        onReplay: () => {},
        onSound: () => {},
      }),
    );
    for (const said of [
      "I play soccer.",
      "I play games.",
      "I swim.",
      "I go to the park.",
    ])
      expect(html).not.toContain(said);
  });

  it("AC-15q 글 없는 듣기 단추: 따라 할 말 · 받침의 답은 '따라 할 말 듣기' 하나씩, 선택지는 ①② 둘이다", () => {
    const c = lessonContent([
      ...LESSON_LINES,
      { t: "sound", kind: "choices", answers: ["I play games.", "I swim."] },
    ]);
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        content: c,
        level: 1,
        englishName: "Momo",
        waiting: null,
        waitSeconds: [1, 5],
        onReplay: () => {},
        onSound: () => {},
      }),
    );
    expect(html).toContain(`aria-label="${BUBBLE_TEXT.model}"`);
    expect(html).toContain('data-sound-listen="model"');
    expect(html).toContain('aria-label="첫째 답 듣기"');
    expect(html).toContain('aria-label="둘째 답 듣기"');
    expect(html.match(/data-answer-listen=/g)).toHaveLength(2);
  });

  it("AC-15q 듣는 동안 말풍선 다시 듣기와 소리 줄 단추는 꺼진다(7절 말하기 버튼 행)", () => {
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        content: lessonContent(LESSON_LINES),
        level: 3,
        englishName: "Momo",
        waiting: null,
        waitSeconds: [1, 5],
        listening: true,
        onReplay: () => {},
        onSound: () => {},
      }),
    );
    expect(html).toMatch(/data-tori-bubble=""[^>]*disabled=""/);
    expect(html).toMatch(/data-sound-listen="model"[^>]*disabled=""/);
  });

  it("AC-15q 4단계부터 붙인 답 글(add answer)은 말풍선 글로 보이고 소리 줄 단추가 없다", () => {
    const c = lessonContent([
      { t: "s", en: "That's okay!" },
      { t: "add", kind: "answer", en: "I play soccer on Sunday." },
      { t: "add", kind: "question", en: "What do you do on Sunday?" },
    ]);
    expect(lessonShownEnglishOf(c)).toEqual([
      "That's okay!",
      "I play soccer on Sunday.",
      "What do you do on Sunday?",
    ]);
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        content: c,
        level: 4,
        englishName: "Momo",
        waiting: null,
        waitSeconds: [1, 5],
        onReplay: () => {},
        onSound: () => {},
      }),
    );
    expect(html).not.toContain("data-sound-listen");
    expect(html).not.toContain("data-answer-listen");
  });

  it("AC-15q 소리를 들려주지 못한 소리 줄에는 '소리가 안 나왔어요. 다시 들어 봐요' 한 줄과 큰 다시 듣기가 있다(7절 '들려주지 못함' 행 · C179 (2))", () => {
    const html = renderToStaticMarkup(
      createElement(LessonToriBubble, {
        content: lessonContent(LESSON_LINES),
        level: 3,
        englishName: "Momo",
        waiting: null,
        waitSeconds: [1, 5],
        soundRetry: "retry",
        onReplay: () => {},
        onSound: () => {},
      }),
    );
    expect(html).toContain("소리가 안 나왔어요. 다시 들어 봐요");
    expect(html).toContain('data-sound-retry="retry"');
    expect(html).toMatch(/data-sound-listen="model"[^>]*data-size="big"/);
  });
});

describe("묶음 10 — 읽어 줄 차례(C125 · 7절 읽어 주기 행)", () => {
  it("AC-15q 받은 줄마다 읽을 것: 선생님 문장 · 붙인 카드 줄 · 소리 줄(1단계 선택지는 'Or' 를 사이에 둔 한 줄)", () => {
    expect(lessonSpeakItemsOf({ t: "s", en: "Hi!" }, 3)).toEqual([
      { text: "Hi!", w: "tori" },
    ]);
    expect(
      lessonSpeakItemsOf(
        { t: "add", kind: "question", en: "What do you like?" },
        3,
      ),
    ).toEqual([{ text: "What do you like?", w: "card" }]);
    expect(
      lessonSpeakItemsOf({ t: "sound", kind: "model", say: "I like it." }, 3),
    ).toEqual([{ text: "I like it.", w: "sound" }]);
    expect(
      lessonSpeakItemsOf(
        { t: "sound", kind: "choices", answers: ["I'm nine.", "I'm ten."] },
        1,
      ),
    ).toEqual([{ text: "I'm nine. Or I'm ten.", w: "sound" }]);
    // 2~3단계 선택지는 'Or' 없이 둘을 차례로(문장 사이 쉼, C125)
    expect(
      lessonSpeakItemsOf(
        { t: "sound", kind: "choices", answers: ["I'm nine.", "I'm ten."] },
        2,
      ),
    ).toEqual([
      { text: "I'm nine.", w: "sound" },
      { text: "I'm ten.", w: "sound" },
    ]);
  });

  it("AC-15q 지금 턴 말풍선을 누르면 소리 줄까지 받은 차례대로 다시 읽는다", () => {
    expect(lessonSpokenOf(lessonContent(LESSON_LINES), 3)).toEqual([
      { text: "Nice!", w: "tori" },
      { text: "Listen and say!", w: "tori" },
      { text: "I play soccer.", w: "sound", line: 2 },
      { text: "What do you do on Sunday?", w: "card" },
    ]);
  });

  it("AC-N10 맞장구는 보낸 뒤 talk.wait_line_seconds 에 읽고(남은 ms), 이미 지났으면 바로다", () => {
    expect(waitLineDelayMs(1000, 1500, 1.5)).toBe(1000);
    expect(waitLineDelayMs(1000, 3000, 1.5)).toBe(0);
  });
});

describe("묶음 10 — 아이 말풍선 · 반짝임 · 힌트 흐림 · sp 모으기", () => {
  const values = testSettingValues();
  const read = (key: string) => values[key];
  const speech = speechSettingsFrom(read);
  const talkSpeech = talkSpeechSettingsFrom(read);
  const props = (over: Partial<ChildTurnProps> = {}): ChildTurnProps => ({
    sessionId: "s",
    speech: {} as SpeechPort,
    level: 3,
    lowLevel: true,
    englishName: "Momo",
    hints: [{ kind: "ko", text: "뭐 해?", listen: false }],
    dontKnowCount: 0,
    heard: {},
    settings: {
      speech,
      talkSpeech,
      confirmSeconds: values["talk.confirm_seconds"] as number,
      hintReadMatch: values["talk.hint_read_match"] as number,
      nospeechDontknowCount: values["talk.nospeech_dontknow_count"] as number,
    },
    rate: speech.rate["1-3"],
    homophones: [],
    nudge: false,
    onNudgeShown: () => {},
    onSpeech: () => "heard",
    onListenStart: () => {},
    onHintListen: () => {},
    onListening: () => {},
    reveal: async () => undefined,
    onSend: () => {},
    ...over,
  });

  it("AC-15q 들리지 않음 뒤 다음 아이 차례에 '잘 모르겠어요' 단추를 문구 없이 한 번 반짝인다", () => {
    const flashing = renderToStaticMarkup(
      createElement(ChildTurn, props({ flashDontKnow: true })),
    );
    expect(flashing).toMatch(/data-dont-know=""[^>]*data-flash=""/);
    const plain = renderToStaticMarkup(createElement(ChildTurn, props()));
    expect(plain).not.toContain("data-flash");
    // 문구를 더하지 않는다(단추 글은 그대로)
    expect(flashing.replace(/data-flash=""/, "")).toContain("잘 모르겠어요");
  });

  it("AC-15q 인식이 실패한 시도는 그 자리에 회색 '못 들었어요'를 보이고 다음 시도(듣기 시작)가 덮는다", () => {
    expect(attemptSaidStep(undefined, { kind: "failed" })).toEqual({
      kind: "not_heard",
    });
    expect(
      attemptSaidStep({ kind: "not_heard" }, { kind: "listen" }),
    ).toBeUndefined();
    expect(attemptSaidStep(undefined, { kind: "nospeech_move" })).toEqual({
      kind: "not_heard",
    });
  });

  it("AC-15q 들은 소리 줄은 인식 확인의 견줌 · 들은 도움이 된다(선택지 → 답 두 개, 따라 할 말 · 받침의 답 → 답 예시)", () => {
    expect(
      childHeardOf([
        { t: "sound", kind: "choices", answers: ["A.", "B."] },
        { t: "sound", kind: "model", say: "C." },
      ]),
    ).toEqual({ twoAnswers: ["A.", "B."], answerExample: "C." });
    expect(childHeardOf([])).toEqual({});
  });

  it("정한 것 10 감시가 끝낸 발화만 sp 로 남긴다(들려줌 · 끊김은 없음)", () => {
    expect(speakHitchOf("tori", { kind: "ended", heard: "played" })).toBe(
      undefined,
    );
    expect(speakHitchOf("wait", { kind: "ended", heard: "no_end" })).toEqual({
      w: "wait",
      h: "no_end",
    });
    expect(
      speakHitchOf("sound", { kind: "ended", heard: "not_played" }),
    ).toEqual({ w: "sound", h: "not_played" });
    expect(speakHitchOf("card", { kind: "cancelled" })).toBe(undefined);
  });

  it("정한 것 10 sp 는 앞 기록 뒤 것만 최근 CLIENT_LISTENS_MAX 개를 꺼내고, 없으면 칸을 두지 않는다", () => {
    const log = createSpeakHitchLog();
    for (let i = 0; i < CLIENT_LISTENS_MAX + 3; i++)
      log.record({ w: "tori", h: "no_end" });
    const first = log.take();
    expect(first).toHaveLength(CLIENT_LISTENS_MAX);
    expect(log.take()).toEqual([]);
    const base = { br: "Chrome", r3d: false, listens: [], mf: 0 };
    expect(withSpeakHitches(base, [])).toEqual(base);
    expect(withSpeakHitches(base, first.slice(0, 1))).toEqual({
      ...base,
      sp: [{ w: "tori", h: "no_end" }],
    });
  });
});

describe("묶음 10 fix 1 — 회화 말풍선 '소리가 안 나와서 글로 봐요'(I-2 · 정본 07 34줄 · C179 (2))", () => {
  const values = testSettingValues();
  const speech = speechSettingsFrom((key: string) => values[key]);
  const props = (over: Record<string, unknown> = {}) => ({
    content: lessonContent(LESSON_LINES),
    level: 3,
    englishName: "Momo",
    waiting: null,
    waitSeconds: [1, 5] as const,
    onReplay: () => {},
    onSound: () => {},
    ...over,
  });

  it("C179 (2) 선생님 문장 · 붙인 줄을 들려주지 못했을 때만 안내 대상이다(소리 줄은 다시 듣기 안내, 끊김 · 읽지 않음 · 들려줌은 아님)", () => {
    const notPlayed = { kind: "ended", heard: "not_played" } as const;
    expect(soundlessOf({ text: "Hi!", w: "tori" }, notPlayed)).toBe(true);
    expect(soundlessOf({ text: "Q?", w: "card" }, notPlayed)).toBe(true);
    expect(
      soundlessOf(
        { text: "Q?", w: "card" },
        { kind: "error", code: "x", started: false },
      ),
    ).toBe(true);
    expect(soundlessOf({ text: "A.", w: "sound" }, notPlayed)).toBe(false);
    expect(soundlessOf({ text: "Hmm.", w: "wait" }, notPlayed)).toBe(false);
    expect(
      soundlessOf(
        { text: "Hi!", w: "tori" },
        { kind: "ended", heard: "played" },
      ),
    ).toBe(false);
    expect(soundlessOf({ text: "Hi!", w: "tori" }, { kind: "cancelled" })).toBe(
      false,
    );
  });

  it("C179 (2) 안내는 speech.skip_notice_seconds 동안만이고 지나면 없다", () => {
    expect(soundlessNoticeLeftMs(1000, 1500, 3000)).toBe(2500);
    expect(soundlessNoticeLeftMs(1000, 5000, 3000)).toBe(0);
    expect(soundlessNoticeLeftMs(null, 5000, 3000)).toBe(0);
  });

  it("C179 (2) 말풍선 아래에 '소리가 안 나와서 글로 봐요'를 보이고 글은 그대로이며, 한 세션 둘째부터 무음 모드 줄 자리를 둔다", () => {
    const once = renderToStaticMarkup(
      createElement(
        LessonToriBubble,
        props({
          soundless: {
            at: performance.now(),
            count: 1,
            noticeMs: speech.skipNoticeMs,
          },
        }),
      ),
    );
    expect(once).toContain("data-tori-soundless");
    expect(once).toContain(BUBBLE_TEXT.soundless);
    // 세 영역 수업 선생님 줄과 같은 글이다(정본 07 34줄 — 회화는 제 문구 표에 둔다, 묶음 10 재검토 N-3)
    expect(BUBBLE_TEXT.soundless).toBe(TEACH_TEXT.soundless);
    expect(once).toContain("data-tori-line");
    expect(once).not.toContain("data-silent-mode");
    const twice = renderToStaticMarkup(
      createElement(
        LessonToriBubble,
        props({
          soundless: {
            at: performance.now(),
            count: SILENT_MODE_FROM_SOUNDLESS,
            noticeMs: speech.skipNoticeMs,
          },
        }),
      ),
    );
    expect(twice).toContain('data-silent-mode=""');
    const expired = renderToStaticMarkup(
      createElement(
        LessonToriBubble,
        props({
          soundless: {
            at: performance.now() - speech.skipNoticeMs - 1000,
            count: 1,
            noticeMs: speech.skipNoticeMs,
          },
        }),
      ),
    );
    expect(expired).not.toContain("data-tori-soundless");
  });
});

describe("묶음 10 fix 1 — 들려준 소리 줄만 들은 도움으로(M-5 · 7절 34줄)", () => {
  it("AC-15q 읽기 항목에 말풍선 줄 차례(line)가 실리고, 들려준 차례의 소리 줄만 childHeardOf 로 넘긴다", () => {
    const c = lessonContent([
      ...LESSON_LINES,
      { t: "sound", kind: "choices", answers: ["I swim.", "I run."] },
    ]);
    const items = lessonSpokenOf(c, 2);
    expect(items.filter((i) => i.w === "sound")).toEqual([
      { text: "I play soccer.", w: "sound", line: 2 },
      { text: "I swim.", w: "sound", line: 4 },
      { text: "I run.", w: "sound", line: 4 },
    ]);
    // 따라 할 말(2)은 못 들려주고 선택지(4)만 들려줌
    const played = playedSoundsOf(c, new Set([4]));
    expect(childHeardOf(played)).toEqual({ twoAnswers: ["I swim.", "I run."] });
    expect(playedSoundsOf(c, new Set())).toEqual([]);
  });
});
