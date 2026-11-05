// 회화 따라 말하기 · 처음 안내 · 마무리 세 장(plan-p13b 파일별 값 14 · 15, 4절 회화 세션 · 회화 마무리 행 · 3.3 · C33 · C39 · C97 ·
// 컨트롤러 결정 '열 때마다 시작! 한 번' · 회화 plan 묶음 11 · 12). 쪽지 차례 · 장 차례 · 친한 정도 칸은 순수 함수, 화면 글은 정적 그림으로
// 본다. 옛 흐름의 오늘 쓸 말 · 말해 보기 차례 시험은 묶음 12 가 지웠다(짧은 준비 쪽지 · 정리 한 번 시험이 새 흐름을 본다).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CLOSING_TEXT,
  ClosingFirst,
  ClosingThird,
  closingCardsOf,
  closingEndOf,
  friendshipCellsOf,
} from "@/components/conversation/closing-cards";
import {
  type FollowEnv,
  LessonWrapUp,
  lessonWrapFollowOf,
  PrepNote,
  prepNoteCardOf,
  prepStepsOf,
  TALK_START_TEXT,
  TalkStart,
} from "@/components/conversation/follow-along";
import {
  LessonChoice,
  lessonAfterEndOf,
  lessonAfterOf,
  lessonBandOf,
  lessonBubbleOf,
  lessonChoiceSpeechOf,
  lessonPlayedLineOf,
  lessonSegmentLabelOf,
  lessonSpokenItemsOf,
  soundlessStepOf,
  TALK_TEXT,
  wrapShineTextsOf,
} from "@/components/conversation/talk-frame";
import {
  lessonShownEnglishOf,
  lessonSoundsOf,
} from "@/components/conversation/tori";
import { talkSpeechSettingsFrom } from "@/core/conversation/listen";
import { speechSettingsFrom } from "@/core/speech/listen";
import { TEACHER_TEXT } from "@/core/teacher/name";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";

// 브라우저 전용 표시 모듈 · 쪽 길잡이 · 서버 액션은 시험(node)에서 빈 모듈로
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));

const HINT_READ_MATCH = TEST_SETTINGS["talk.hint_read_match"].value;
const FRIENDSHIP_MAX = TEST_SETTINGS["talk.friendship_max"].value;

describe("처음 회화 안내 · '시작!'(값 14 · 3.3)", () => {
  it("AC-16c 처음 회화 안내는 3.3 글 그대로 세션 선생님 이름 자리를 채우고 처음이 아니면 안내 글 없이 '시작!'만 있다", () => {
    const first = renderToStaticMarkup(
      createElement(TalkStart, {
        first: true,
        teacherName: "미나",
        onStart: () => {},
      }),
    );
    expect(first).toContain("data-talk-intro");
    for (const line of TEACHER_TEXT.intro("미나"))
      expect(first).toContain(line);
    expect(first).toContain("미나는 앱 속 AI 선생님이에요.");
    expect(first).toContain("미나는 지난 이야기를 조금 기억해요");
    expect(first).toContain("미나와 나눈 이야기는 부모님도 볼 수 있어요");
    // 선생님 그림은 회화 틀의 선생님 창이 맡는다(선생님 화면 plan 값 13 — '시작!' 화면에도 창이 초상으로 있다)
    expect(first).not.toContain('role="img"');
    expect(first).toContain(TALK_START_TEXT.start);
    expect(first).not.toContain("토리");
    // 고르기 전(이름 없음)은 '선생님'
    const before = renderToStaticMarkup(
      createElement(TalkStart, { first: true, onStart: () => {} }),
    );
    expect(before).toContain("선생님은 지난 이야기를 조금 기억해요");
    expect(before).toContain("선생님과 나눈 이야기는 부모님도 볼 수 있어요");
    const again = renderToStaticMarkup(
      createElement(TalkStart, {
        first: false,
        teacherName: "미나",
        onStart: () => {},
      }),
    );
    expect(again).not.toContain("data-talk-intro");
    expect(again).toContain(TALK_START_TEXT.start);
    expect(TEACHER_TEXT.followGuide("미나")).toBe("미나를 따라 말해 봐요");
  });
});

const wrap = {
  lines: [
    {
      en: "Today you said cat.",
      ko: "오늘 그 말을 했어.",
      source: "card" as const,
    },
  ],
  farewell: { en: "Bye! See you soon.", ko: "안녕! 또 만나." },
  aborted: false,
  retry: false,
  kind: "regular" as const,
  starsPerLesson: 1,
  metWords: [
    { word: "cat", meaningKo: "고양이", example: "I see a cat.", inTalk: true },
    { word: "run", meaningKo: "달리다", example: "I can run.", inTalk: false },
  ],
  friendship: { value: 3, max: FRIENDSHIP_MAX },
  nextLesson: {
    lessonId: "00000000-0000-4000-8000-000000000001",
    title: "회화 1단계 대화 2",
  },
};

describe("마무리 세 장(값 15 · 4절 회화 마무리 · C33)", () => {
  it("AC-15t 첫 장 끝난 길(3.3 끝난 길 표): 참여 완료(마무리 물음에 답함 · 참여 있는 '그만하기')는 별, 확인 뒤 그만두기는 '다음에 조금 더 …'이고 별이 없으며, 다시 하기는 '다시 했어요'다", () => {
    expect(closingEndOf(wrap)).toBe("completed");
    expect(closingEndOf({ ...wrap, aborted: true })).toBe("aborted");
    expect(closingEndOf({ ...wrap, retry: true })).toBe("retried");
    const done = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap,
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(done).toContain('data-closing-end="completed"');
    expect(done).not.toContain(CLOSING_TEXT.aborted);
    const stopped = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: { ...wrap, aborted: true },
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(stopped).toContain('data-closing-end="aborted"');
    expect(stopped).toContain(CLOSING_TEXT.aborted);
    // '단어 듣기: <낱말>' 접근 이름(T-4 · L-50) 그대로
    expect(done).toContain('aria-label="단어 듣기: run"');
  });

  it("AC-15e 1~3단계 마무리는 둘째 장 없이 첫 장 · 셋째 장이고 참여 완료 뒤 '홈'은 첫 장만이다", () => {
    expect(closingCardsOf({ lowLevel: true, mode: "full" })).toEqual([
      "first",
      "third",
    ]);
    expect(closingCardsOf({ lowLevel: true, mode: "first" })).toEqual([
      "first",
    ]);
  });

  it("회화 마무리: 친한 정도 막대는 talk.friendship_max 칸 가운데 지금 값만큼 찬다(숫자 없음)", () => {
    const cells = friendshipCellsOf(3, FRIENDSHIP_MAX);
    expect(cells).toHaveLength(FRIENDSHIP_MAX);
    expect(cells.filter(Boolean)).toHaveLength(3);
    expect(
      friendshipCellsOf(FRIENDSHIP_MAX + 2, FRIENDSHIP_MAX).every(Boolean),
    ).toBe(true);
  });

  it("AC-15g 마무리 첫 장의 오늘 만난 단어는 대화에 원형이 안 나온 것에만 듣기 단추가 있고 끝인사 · 숫자 · 퍼센트 · '내일'이 없다", () => {
    const html = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap,
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(html).toContain(CLOSING_TEXT.metWords);
    expect(html).toContain('data-closing-word="cat"');
    expect(html).toContain('data-closing-word="run"');
    expect(html.match(/data-word-listen/g)).toHaveLength(1);
    expect(html).not.toContain(wrap.farewell.en);
    expect(html).not.toContain("내일");
    expect(html).not.toContain("%");
    expect(html.replace(/<[^>]*>/g, "")).not.toMatch(/\d/);
    expect(html).toContain(CLOSING_TEXT.next);
  });

  it("AC-15f · R-54 · R-19 참여 완료 전 그만둔 대화의 첫 장은 '다음에 조금 더 이야기하면 별을 받아요', 다시 하기는 '다시 했어요'이고 오늘 만난 단어가 없다", () => {
    const aborted = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: { ...wrap, aborted: true },
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(aborted).toContain("다음에 조금 더 이야기하면 별을 받아요");
    expect(aborted).not.toContain("다음에 끝까지");
    // 그만둔 대화는 다시 하기가 아니라 오늘 만난 단어가 그대로 보인다
    expect(aborted).toContain(CLOSING_TEXT.metWords);
    const retried = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap: { ...wrap, retry: true, kind: "retry", friendship: null },
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(retried).toContain("다시 했어요");
    expect(retried).not.toContain("다음에 조금 더 이야기하면 별을 받아요");
    // R-19 다시 하기로 한 대화는 오늘 만난 단어를 보이지 않는다([승인 UX1])
    expect(retried).not.toContain(CLOSING_TEXT.metWords);
    expect(retried).not.toContain("data-closing-word");
    expect(retried).not.toContain("data-word-listen");
  });

  it("AC-15e 셋째 장은 친한 정도 막대 · 다음 이야기 · 큰 '다음 이야기' · 작은 '홈'이고 '다음'이 없으며 다음 수업이 없으면 큰 단추는 '수업 목록', 다시 하기는 막대가 없다", () => {
    const props = {
      busy: false,
      onNextStory: () => {},
      onLessons: () => {},
      onHome: () => {},
    };
    const html = renderToStaticMarkup(
      createElement(ClosingThird, { wrap, teacherName: "리오", ...props }),
    );
    expect(html).toContain("data-friendship");
    expect(html).toContain("리오와 친한 정도");
    expect(
      renderToStaticMarkup(createElement(ClosingThird, { wrap, ...props })),
    ).toContain("선생님과 친한 정도");
    expect(html.match(/data-friendship-cell/g)).toHaveLength(FRIENDSHIP_MAX);
    expect(html).toContain(wrap.nextLesson.title);
    expect(html).toContain(CLOSING_TEXT.nextStory);
    expect(html).toContain(CLOSING_TEXT.home);
    expect(html).not.toContain(`>${CLOSING_TEXT.next}<`);
    expect(html).not.toContain("내일");
    expect(html).not.toContain("%");
    // 숫자는 다음 이야기 제목(시드 글)에만 — 친한 정도에 수를 쓰지 않는다
    expect(
      html.replace(wrap.nextLesson.title, "").replace(/<[^>]*>/g, ""),
    ).not.toMatch(/\d/);
    const none = renderToStaticMarkup(
      createElement(ClosingThird, {
        wrap: {
          ...wrap,
          nextLesson: null,
          retry: true,
          kind: "retry",
          friendship: null,
        },
        ...props,
      }),
    );
    expect(none).toContain(CLOSING_TEXT.lessons);
    expect(none).not.toContain(CLOSING_TEXT.nextStory);
    expect(none).not.toContain("data-friendship");
  });
});

// ── 새 흐름(회화 plan 묶음 11): 짧은 준비 쪽지 · 정리 한 번(3.3 짧은 준비 · 정리 문단 · 4절 짧은 준비 · 정리 행) ──

const prepWord = (
  over: Partial<Parameters<typeof prepNoteCardOf>[0]> = {},
) => ({
  word: "beach",
  meaningKo: "바닷가",
  example: "I go to the beach.",
  modelLine: "The beach.",
  imageKey: "beach",
  source: "card" as const,
  ...over,
});

const SETTING_VALUES = testSettingValues();

const lessonEnv = (level: number, lowLevel: boolean): FollowEnv => ({
  sessionId: "00000000-0000-4000-8000-000000000009",
  speech: undefined,
  level,
  lowLevel,
  englishName: "Momo",
  teacherName: "미나",
  rate: 1,
  homophones: [],
  settings: {
    speech: speechSettingsFrom((key) => SETTING_VALUES[key]),
    talkSpeech: talkSpeechSettingsFrom((key) => SETTING_VALUES[key]),
    matchPhraseLevels: [0.5, 0.8],
    autoNextSeconds: 2,
    hintReadMatch: HINT_READ_MATCH,
    waitHintSeconds: [1, 5],
  },
  onSpeech: () => "heard",
  onNextItem: () => {},
  onListening: () => {},
  onPraise: () => {},
  clientListen: () => ({ br: "test", r3d: false, listens: [], mf: 0 }),
  saveFollow: () => {},
});

describe("짧은 준비 쪽지(새 흐름 · 3.3 쪽지 글)", () => {
  it("AC-15a 짧은 준비 쪽지 글: 1단계는 그림 · 뜻 · 소리만(영어 글 없음), 2~3단계는 낱말 글을 더하고 예문 글이 없으며, 4단계부터 낱말 · 뜻 · 예문 글이다", () => {
    const one = prepNoteCardOf(prepWord(), { level: 1, band: "1-3" });
    expect(one).toEqual({
      meaningKo: "바닷가",
      imageKey: "beach",
      say: "The beach.",
    });
    const three = prepNoteCardOf(prepWord(), { level: 3, band: "1-3" });
    expect(three).toEqual({
      word: "beach",
      meaningKo: "바닷가",
      imageKey: "beach",
      say: "The beach.",
    });
    expect(three.example).toBeUndefined();
    const four = prepNoteCardOf(prepWord(), { level: 4, band: "4-6" });
    expect(four).toEqual({
      word: "beach",
      meaningKo: "바닷가",
      example: "I go to the beach.",
      imageKey: "beach",
      say: "I go to the beach.",
    });
    // 들려줄 말: 1~3단계 짧은 말, 4단계부터 예문(예문이 비면 짧은 말)
    expect(
      prepNoteCardOf(prepWord({ example: "" }), { level: 5, band: "4-6" }).say,
    ).toBe("The beach.");
  });

  it("AC-15a 짧은 준비: 이 자리에서 끝낸 차례는 건너뛰고 남은 낱말을 차례대로 한다(이어 열기)", () => {
    const prep = {
      place: "greeting" as const,
      words: [
        prepWord(),
        prepWord({ word: "sea", meaningKo: "바다", modelLine: "The sea." }),
        prepWord({ word: "sky", meaningKo: "하늘", modelLine: "The sky." }),
      ],
      done: [0],
    };
    expect(prepStepsOf(prep)).toEqual([1, 2]);
    expect(prepStepsOf({ ...prep, done: [0, 1, 2] })).toEqual([]);
  });

  it("AC-15a 짧은 준비 쪽지 화면: 1단계는 영어 글이 없고, 3단계는 낱말 글만, 4단계는 예문 글까지 보이며 모든 단계에 한국어 뜻과 말하기 단추 하나가 있다", () => {
    const prep = { place: "greeting" as const, words: [prepWord()], done: [] };
    const render = (level: number, band: string, lowLevel: boolean) =>
      renderToStaticMarkup(
        createElement(PrepNote, {
          prep,
          band,
          pictures: {},
          env: lessonEnv(level, lowLevel),
          onDone: () => {},
        }),
      );
    const one = render(1, "1-3", true);
    expect(one).toContain("data-prep-note");
    expect(one).toContain("바닷가");
    expect(one).not.toContain('lang="en"');
    expect(one).not.toContain(">beach<");
    expect(one).not.toContain("The beach.");
    const three = render(3, "1-3", true);
    expect(three).toContain("data-prep-word");
    expect(three).toContain(">beach<");
    expect(three).not.toContain("data-prep-example");
    expect(three).not.toContain("I go to the beach.");
    const four = render(4, "4-6", false);
    expect(four).toContain("data-prep-example");
    expect(four).toContain("I go to the beach.");
    for (const html of [one, three, four]) {
      expect(html).toContain("바닷가");
      expect(html.match(/data-speak=""/g)?.length).toBe(1);
    }
  });
});

describe("정리 한 번(새 흐름 · 3.3 정리 문단 · C167 (1))", () => {
  const lines = [
    { en: "You like the beach.", ko: "너는 바닷가를 좋아해." },
    { en: "The sea is blue.", ko: "바다는 파래." },
  ];

  it("AC-15a 정리: 1~3단계는 되짚을 말 전체를 한 번 따라 말하고(차례 0 · 따라 할 글은 줄을 이은 것), 4단계부터 · 되짚을 말이 없으면 따라 말하지 않는다", () => {
    expect(lessonWrapFollowOf(lines, true)).toEqual({
      index: 0,
      target: "You like the beach. The sea is blue.",
    });
    expect(lessonWrapFollowOf(lines, false)).toBeNull();
    expect(lessonWrapFollowOf([], true)).toBeNull();
  });

  it("AC-15a 정리 화면: 1~3단계는 되짚을 말 전체를 한 말풍선에 보이고 말하기 단추는 하나이며, 끝인사는 아직 없다(정리에서 한 번 — C167 (1))", () => {
    const html = renderToStaticMarkup(
      createElement(LessonWrapUp, {
        lines,
        farewell: { en: "Bye!", ko: "안녕!" },
        env: lessonEnv(3, true),
        closingFarewell: async () => undefined,
        onDone: () => {},
      }),
    );
    // 한 말풍선(글은 흘러나오므로 정적 그림에는 첫 줄부터 — 둘째 줄은 같은 말풍선에 이어 흐른다)
    expect(html).toContain("data-wrap-all");
    expect(html.match(/data-talk-wrap=""/g)?.length).toBe(1);
    expect(html).toContain("You like the beach.");
    expect(html).not.toContain("data-wrap-farewell");
    expect(html.match(/data-speak=""/g)?.length).toBe(1);
  });
});

// ── 새 흐름 틀(회화 plan 묶음 11): 위 띠 · 말풍선 · 끝 줄 뒤 할 일 · 고르기 두 버튼 ──

const position = (over: Record<string, unknown> = {}) => ({
  phase: "talk",
  greetingDone: true,
  talkCount: 3,
  moreCount: 0,
  moreRound: 0,
  moreInRound: 0,
  choice: null,
  closingAsked: false,
  closingAnswered: false,
  prepPending: false,
  flashDontKnow: false,
  silentBlocked: false,
  lastCause: null,
  childTurns: 3,
  ...over,
});
const MORE_ROUND = TEST_SETTINGS["talk.more_talk_round_turns"].value;

describe("새 흐름 틀(네 토막 · 위 띠 · 고르기)", () => {
  it("AC-15a 위 띠: 토막 이름은 인사 · 짧은 준비 · 대화 · 정리이고 '말 주고받기 n' 에 분모가 없으며(참고 턴을 보이지 않음), 마무리 물음 뒤에는 '다 했어요! 더 이야기하기 n / talk.more_talk_round_turns' 다", () => {
    expect(
      ["greeting", "prep", "talk", "more_talk", "wrap_up"].map((s) =>
        lessonSegmentLabelOf(s as Parameters<typeof lessonSegmentLabelOf>[0]),
      ),
    ).toEqual(["인사", "짧은 준비", "대화", "대화", "정리"]);
    const talk = lessonBandOf({
      stage: "talk",
      segment: "talk",
      inPrep: false,
      position: position(),
      moreRoundTurns: MORE_ROUND,
    });
    expect(talk).toEqual({
      segment: "대화",
      countShown: true,
      counter: "말 주고받기 3",
    });
    expect(talk.counter).not.toContain("/");
    expect(TALK_TEXT.talkCount(0)).toBe("말 주고받기 0");
    const more = lessonBandOf({
      stage: "talk",
      segment: "more_talk",
      inPrep: false,
      position: position({ closingAsked: true, moreInRound: 1 }),
      moreRoundTurns: MORE_ROUND,
    });
    expect(more.counter).toBe(`다 했어요! 더 이야기하기 1 / ${MORE_ROUND}`);
    // 짧은 준비(인사 뒤 · 대화 중)는 셈을 숨기고 토막 이름은 '짧은 준비'
    for (const band of [
      lessonBandOf({
        stage: "talk",
        segment: "prep",
        inPrep: true,
        position: position(),
        moreRoundTurns: MORE_ROUND,
      }),
      lessonBandOf({
        stage: "talk",
        segment: "talk",
        inPrep: true,
        position: position(),
        moreRoundTurns: MORE_ROUND,
      }),
    ])
      expect(band).toMatchObject({ segment: "짧은 준비", countShown: false });
    expect(
      lessonBandOf({
        stage: "wrap",
        segment: "wrap_up",
        inPrep: false,
        position: position(),
        moreRoundTurns: MORE_ROUND,
      }),
    ).toMatchObject({ segment: "정리", countShown: false });
    expect(
      lessonBandOf({
        stage: "closing",
        segment: "wrap_up",
        inPrep: false,
        position: position(),
        moreRoundTurns: MORE_ROUND,
      }),
    ).toMatchObject({ segment: undefined, countShown: false });
  });

  it("AC-15q · AC-15f 이어 하기 말풍선: 마지막 선생님 행을 AI 글 → 뜻 → 소리 줄 → 받침의 답 → 붙인 카드 줄 차례로 다시 만들고, 1~3단계 소리 줄은 글로 보이지 않는다(T2)", () => {
    const bubble = lessonBubbleOf({
      turnNo: 4,
      kind: "card_slot",
      lines: [
        {
          en: "That's okay! Let's say it together.",
          ko: "괜찮아! 같이 말해 보자.",
          app: false,
        },
        { en: "Do you like the sea?", ko: "바다 좋아해?", app: true },
      ],
      sound: { model: "I like the beach.", answer: "Yes, I do." },
      app: [],
      item: null,
      hints: [],
    });
    expect(bubble.done).toBe(true);
    expect(bubble.ko).toBe("괜찮아! 같이 말해 보자.");
    expect(bubble.lines.map((l) => l.t)).toEqual([
      "s",
      "sound",
      "sound",
      "add",
    ]);
    expect(lessonShownEnglishOf(bubble)).toEqual([
      "That's okay! Let's say it together.",
      "Do you like the sea?",
    ]);
    expect(lessonSoundsOf(bubble)).toHaveLength(2);
    expect(JSON.stringify(lessonShownEnglishOf(bubble))).not.toContain(
      "I like the beach.",
    );
    // 선택지는 소리 줄 하나(①②)
    const choices = lessonBubbleOf({
      turnNo: 2,
      kind: "first_question",
      lines: [{ en: "Do you like apples?", app: true }],
      sound: { choices: ["Yes.", "No."] },
      app: [],
      item: null,
      hints: [],
    });
    expect(lessonSoundsOf(choices)).toEqual([
      { t: "sound", kind: "choices", answers: ["Yes.", "No."] },
    ]);
    expect(lessonBubbleOf(null)).toEqual({ lines: [], done: true });
  });

  it("AC-15f · AC-15t 토막 넘김: 끝 줄이 고르기면 두 버튼, 대화 중 짧은 준비 · 대화 첫 질문 차례 · 인사 끝이면 자료를 다시 읽어 서버의 할 일(토막 넘김 · 쪽지)을 따르고, 아니면 아이 차례다", () => {
    const end = (over: Record<string, unknown> = {}) => ({
      segment: "talk" as const,
      greetingDone: true,
      talkCount: 3,
      choice: null,
      closingAsked: false,
      moreRound: 0,
      moreInRound: 0,
      targets: [],
      hints: [],
      flashDontKnow: false,
      silentBlocked: false,
      prep: null,
      firstQuestionDue: false,
      completed: false,
      ...over,
    });
    expect(lessonAfterEndOf(end())).toEqual({ kind: "child" });
    expect(lessonAfterEndOf(end({ choice: "closing" }))).toEqual({
      kind: "choice",
    });
    expect(lessonAfterEndOf(end({ choice: "suggestion" }))).toEqual({
      kind: "choice",
    });
    expect(lessonAfterEndOf(end({ prep: ["beach"] }))).toEqual({
      kind: "reload",
    });
    expect(lessonAfterEndOf(end({ firstQuestionDue: true }))).toEqual({
      kind: "reload",
    });
    expect(
      lessonAfterEndOf(end({ segment: "greeting", greetingDone: true })),
    ).toEqual({ kind: "reload" });
    expect(
      lessonAfterEndOf(end({ segment: "greeting", greetingDone: false })),
    ).toEqual({ kind: "child" });
    // 화면 자료의 할 일
    expect(lessonAfterOf({ kind: "advance", to: "prep" })).toEqual({
      kind: "advance",
      to: "prep",
    });
    expect(lessonAfterOf({ kind: "prep", place: "talk" })).toEqual({
      kind: "prep",
    });
    expect(lessonAfterOf({ kind: "choice", choice: "closing" })).toEqual({
      kind: "choice",
    });
    expect(lessonAfterOf({ kind: "child" })).toEqual({ kind: "child" });
    expect(lessonAfterOf({ kind: "closed" })).toEqual({ kind: "wrap" });
  });

  it("AC-15t 고르기: 마무리 물음 · 마무리 제안 뒤 '더 이야기하기'(큰 단추) · '그만하기' 두 버튼이고 앱 고정 대사 · 숫자가 없다(정한 것 11)", () => {
    const html = renderToStaticMarkup(
      createElement(LessonChoice, {
        busy: false,
        onMore: () => {},
        onStop: () => {},
      }),
    );
    expect(html).toContain("data-talk-choice");
    expect(html).toContain(TALK_TEXT.more);
    expect(html).toContain(TALK_TEXT.stop);
    expect(html).not.toContain("Do you want to talk more?");
    // 보이는 글에 숫자가 없다(class 이름은 빼고 본다)
    expect(html.replace(/<[^>]+>/g, " ")).not.toMatch(/\d/);
  });
});

// ── 묶음 11 fix 1(검토 I-1 · I-4 · I-5 · M-5) ──

describe("새 흐름 틀 fix 1", () => {
  it("AC-15t 마무리 제안(갈래 '마무리') 뒤에는 두 버튼과 함께 말로 답할 수 있고, 마무리 물음 뒤에는 두 버튼만이다(02-2 294 · 295줄 · 정한 것 11)", () => {
    expect(lessonChoiceSpeechOf("suggestion")).toBe(true);
    expect(lessonChoiceSpeechOf("closing")).toBe(false);
    expect(lessonChoiceSpeechOf(null)).toBe(false);
  });

  it("AC-15q 들려준 소리 줄만 들은 도움이다: 소리 줄 항목은 말풍선 줄 차례를 싣고, 들려주지 못함 · 읽지 않음은 들은 줄이 아니다(07절 34줄)", () => {
    const content = lessonBubbleOf({
      turnNo: 3,
      kind: "card_slot",
      lines: [{ en: "Let's say it together.", app: false }],
      sound: { model: "I like the beach." },
      app: [],
      item: null,
      hints: [],
    });
    const items = lessonSpokenItemsOf(content, 3);
    expect(items).toEqual([
      { text: "Let's say it together.", w: "tori" },
      { text: "I like the beach.", w: "sound", line: 1 },
    ]);
    const [tori, sound] = items as [
      (typeof items)[number],
      (typeof items)[number],
    ];
    expect(lessonPlayedLineOf(sound, { kind: "ended", heard: "played" })).toBe(
      1,
    );
    expect(
      lessonPlayedLineOf(sound, { kind: "ended", heard: "not_played" }),
    ).toBeNull();
    expect(lessonPlayedLineOf(sound, { kind: "unsupported" })).toBeNull();
    expect(
      lessonPlayedLineOf(sound, { kind: "skipped", reason: "no_ko_voice" }),
    ).toBeNull();
    expect(
      lessonPlayedLineOf(tori, { kind: "ended", heard: "played" }),
    ).toBeNull();
  });

  it("'소리가 안 나와서 글로 봐요'(07절 34줄): 글로 보이는 선생님 말을 들려주지 못할 때마다 세션 셈이 하나 늘고 그때를 남긴다(소리 줄 · 들려줌은 아님)", () => {
    const start = { at: null, count: 0 };
    const tori = { text: "Hi!", w: "tori" as const };
    const failed = { kind: "ended" as const, heard: "not_played" as const };
    const once = soundlessStepOf(start, tori, failed, 100);
    expect(once).toEqual({ at: 100, count: 1 });
    expect(soundlessStepOf(once, tori, failed, 200)).toEqual({
      at: 200,
      count: 2,
    });
    expect(
      soundlessStepOf(once, tori, { kind: "ended", heard: "played" }, 300),
    ).toBe(once);
    expect(
      soundlessStepOf(once, { text: "Yes.", w: "sound" }, failed, 300),
    ).toBe(once);
  });

  it("정리의 대화 기록 반짝임(03절 92줄): 아이가 말한 줄 가운데 오늘 쓸 말이 든 줄만 고른다(선생님 말 · '잘 모르겠어요' · '못 들었어요'는 아님)", () => {
    const entries = [
      {
        who: "teacher" as const,
        key: "teacher:1",
        turnNo: 1,
        lines: [{ en: "Do you like the beach?", app: false }],
      },
      {
        who: "child" as const,
        key: "child:1",
        turnNo: 1,
        said: { kind: "speech" as const, text: "I like the Beach!" },
      },
      {
        who: "child" as const,
        key: "child:2",
        turnNo: 2,
        said: { kind: "speech" as const, text: "I like pizza." },
      },
      {
        who: "child" as const,
        key: "child:3",
        turnNo: 3,
        said: { kind: "dont_know" as const },
      },
      {
        who: "child" as const,
        key: "child:4",
        turnNo: 4,
        said: { kind: "speech" as const, text: "Two shells." },
      },
    ];
    expect(wrapShineTextsOf(entries, ["beach", "shell"])).toEqual([
      "I like the Beach!",
      "Two shells.",
    ]);
    expect(wrapShineTextsOf(entries, [])).toEqual([]);
  });

  it("묶음 11 재검토 N-4 (나) 정리 반짝임은 단원 단어의 꼴 목록(lemmaEntries — ate · went · came)도 맞추고 다른 낱말 속 글자는 맞추지 않는다", () => {
    const entries = [
      {
        who: "child",
        key: "c:1",
        turnNo: 1,
        said: { kind: "speech", text: "I ate pizza." },
      },
      {
        who: "child",
        key: "c:2",
        turnNo: 2,
        said: { kind: "speech", text: "We went home." },
      },
      {
        who: "child",
        key: "c:3",
        turnNo: 3,
        said: { kind: "speech", text: "He came late." },
      },
      {
        who: "child",
        key: "c:4",
        turnNo: 4,
        said: { kind: "speech", text: "I like eating." },
      },
      {
        who: "child",
        key: "c:5",
        turnNo: 5,
        said: { kind: "speech", text: "Gone!" },
      },
    ] as const;
    const lemmaEntries = [
      { word: "eat", forms: ["ate", "eaten", "eating"] },
      { word: "go", forms: ["went", "gone"] },
      { word: "come", forms: ["came"] },
    ];
    expect(
      wrapShineTextsOf(entries, ["eat", "go", "come"], lemmaEntries),
    ).toEqual([
      "I ate pizza.",
      "We went home.",
      "He came late.",
      "I like eating.",
      "Gone!",
    ]);
    // 꼴 목록이 없으면 원형 · 끝 s · es 만이다(지금 동작 그대로)
    expect(wrapShineTextsOf(entries, ["eat", "go", "come"])).toEqual([]);
    // 다른 단원 단어의 꼴은 맞추지 않는다
    expect(wrapShineTextsOf(entries, ["come"], lemmaEntries)).toEqual([
      "He came late.",
    ]);
  });
});
