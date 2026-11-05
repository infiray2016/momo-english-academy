// 가르치는 수업 자리 조각(가르치고 배우는 수업 plan 묶음 라-1 · spec 설계 4 · 5 화면 표 · '정본 밖 문구' 표 · 6 시드 칸 · 10 읽어 주기 실패,
// plan 정한 것 15 칩 토큰 · 16 위 띠 자리 이름, 15절 AC-3g · AC-N20). 입력은 정규 시드 셋(seed/lessons/{reading,writing,speaking}/3/1.json)의
// teach 칸을 그대로 쓰고, 조각마다 자료 → 그려지는 것(문구 표 글자 그대로 · 칩 이름 · 이름표 · 단추 상태)을 본다. 단추 상태는 순수 함수
// teachLineStateOf 의 결과를 그림 조각에 넣어 본다(효과는 서버 그림에서 돌지 않는다).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  AskTag,
  CHIP_NAME,
  CHIP_TOKENS,
  CHIP_TONE,
  ChipSentence,
} from "@/components/session/teach/chips";
import {
  ModelView,
  modelPartsOf,
  NewWordsView,
  newWordsPartsOf,
} from "@/components/session/teach/show";
import { FirstLine, firstLineOf } from "@/components/session/teach/spare-intro";
import { StoryScreen, StoryView } from "@/components/session/teach/story";
import {
  LINE_WAITING,
  readTeachLine,
  TEACH_TEXT,
  TeacherLine,
  type TeachLineView,
} from "@/components/session/teach/teacher-line";
import {
  TodayScreen,
  TodayView,
  todayPartsOf,
} from "@/components/session/teach/today";
import {
  TogetherView,
  togetherPartsOf,
} from "@/components/session/teach/together";
import { WhyView } from "@/components/session/teach/why-bubble";
import { contrastRatio } from "@/core/color/contrast";
import { LessonFileSchema } from "@/core/seed/schema/lesson";
import { TEACH_CHIP_ROLES } from "@/core/seed/structure";
import {
  STORY_REPLAYS,
  storyPlaysOf,
  TEACH_SLOT_NAME,
  type TeachLineResult,
  teachLineStateOf,
} from "@/core/session/teach-line";
import { WRITING_WHY_KO } from "@/core/writing/why";
import type { SpeakOptions, SpeechPort } from "@/lib/speech/types";

// 브라우저 전용 모듈 · 쪽 길잡이 · 서버 액션은 시험(node)에서 빈 모듈로(teacher-window 시험과 같음)
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/teacher", () => ({}));

const ROOT = process.cwd();

/** 정규 시드 파일(영역 · 3단계 · 단원 1). */
const fileOf = (area: "reading" | "writing" | "speaking") =>
  LessonFileSchema.parse(
    JSON.parse(
      readFileSync(join(ROOT, "seed", "lessons", area, "3", "1.json"), "utf8"),
    ),
  );
/** 값이 있어야 한다(없으면 시드 꼴이 바뀐 것). */
function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} 없음`);
  return value;
}

const readingFile = fileOf("reading");
const writingFile = fileOf("writing");
const speakingFile = fileOf("speaking");
if (
  readingFile.area !== "reading" ||
  writingFile.area !== "writing" ||
  speakingFile.area !== "speaking"
)
  throw new Error("시드 영역이 다르다");
const writing = must(writingFile.lessons[0], "쓰기 수업");
const readingTeach = must(
  must(readingFile.lessons[0], "읽기 수업").teach,
  "읽기 teach",
);
const writingTeach = must(writing.teach, "쓰기 teach");
const speakingTeach = must(
  must(speakingFile.lessons[0], "말하기 수업").teach,
  "말하기 teach",
);

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

const SPEECH_SETTINGS = {
  skipNoticeMs: 1500,
  speakCharsPerSecondKo: 6,
  rateKo: 1,
};

const html = (element: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(element);

/** 순수 함수 결과로 만든 줄 상태(그림 조각에 넣는다). */
function lineAfter(total: number, results: TeachLineResult[]): TeachLineView {
  const state = teachLineStateOf(total, results);
  return {
    ...LINE_WAITING,
    bright: state.bright,
    notice: state.notice,
    done: results.length,
  };
}

/** 단추(data-teach-action)가 흐린가(disabled). */
function actionDisabled(markup: string, action: string): boolean {
  const tag = new RegExp(
    `<button[^>]*data-teach-action="${action}"[^>]*>`,
  ).exec(markup)?.[0];
  if (!tag) throw new Error(`단추 ${action} 없음`);
  return /\sdisabled=""/.test(tag);
}

const played: TeachLineResult = { kind: "ended", heard: "played" };
const notPlayed: TeachLineResult = { kind: "ended", heard: "not_played" };

describe("정본 밖 문구 · 위 띠 자리 이름(AC-3g)", () => {
  it("AC-3g 조각 글이 spec 설계 5 '정본 밖 문구' 표 글자 그대로다", () => {
    expect(TEACH_TEXT.start).toBe("시작");
    expect(TEACH_TEXT.soloFirst).toBe("이제 혼자 해 봐요.");
    expect(TEACH_TEXT.spareFirst).toEqual({
      reading: "다른 글에서 혼자 해 봐요.",
      writing: "다른 문장도 혼자 놓아 봐요.",
      speaking: "다른 이야기로 혼자 해 봐요.",
    });
    expect(TEACH_TEXT.spareRight).toBe("혼자 해냈어요!");
    expect(TEACH_TEXT.whyRepeat).toBe("끊어서 다시 들어 봐요.");
    expect(TEACH_TEXT.retry).toEqual({
      solve: "한 번 더 풀기",
      do: "한 번 더 하기",
      speak: "한 번 더 말하기",
    });
    expect(TEACH_TEXT.recapWords).toBe("오늘 만난 말");
    expect(TEACH_TEXT.soundless).toBe("소리가 안 나와서 글로 봐요.");
    expect(TEACH_TEXT.newWords(5)).toBe(
      "새 낱말 다섯이에요. 누르면 다시 들려요.",
    );
    // 쓰기 '왜'는 판정 함수 쪽 표(core/writing/why.ts)가 정본 밖 문구 표 글자 그대로
    expect(WRITING_WHY_KO).toEqual({
      capital: "첫 글자를 대문자 단추로 바꿔요.",
      period: "마침표는 맨 끝에 놓아요.",
    });
  });

  it("AC-3g 새 단어 한 줄의 수는 그 수업 새 단어 수를 우리말로 읽고 조사를 맞춘다", () => {
    expect(TEACH_TEXT.newWords(1)).toBe(
      "새 낱말 하나예요. 누르면 다시 들려요.",
    );
    expect(TEACH_TEXT.newWords(3)).toBe(
      "새 낱말 셋이에요. 누르면 다시 들려요.",
    );
    expect(TEACH_TEXT.newWords(10)).toBe(
      "새 낱말 열이에요. 누르면 다시 들려요.",
    );
    // 열을 넘어도 우리말 수(문구 표 꼴 — 리뷰 M4)
    expect(TEACH_TEXT.newWords(11)).toBe(
      "새 낱말 열하나예요. 누르면 다시 들려요.",
    );
    expect(TEACH_TEXT.newWords(20)).toBe(
      "새 낱말 스물이에요. 누르면 다시 들려요.",
    );
    expect(TEACH_TEXT.newWords(23)).toBe(
      "새 낱말 스물셋이에요. 누르면 다시 들려요.",
    );
  });

  it("AC-3g 위 띠 자리 이름 다섯이 표 글자 그대로다(plan 정한 것 16)", () => {
    expect(Object.values(TEACH_SLOT_NAME)).toEqual([
      "오늘 배울 것",
      "살펴보기",
      "같이 해 보기",
      "혼자 해 보기",
      "스스로 해 보기",
    ]);
  });
});

describe("선생님 줄 · 오늘 배울 것(AC-3g · AC-N20)", () => {
  it("AC-3g 오늘 배울 것은 고른 선생님 초상 · 이름표 · 말풍선(todayKo) · 그 아래 영어 토막(todayEn) · '시작'을 그린다", () => {
    const markup = html(
      createElement(TodayView, {
        today: readingTeach,
        teacher: MINA,
        line: LINE_WAITING,
        onStart: () => {},
      }),
    );
    expect(markup).toContain('data-teach-slot="today"');
    expect(markup).toContain('data-teacher-portrait="mina"');
    expect(markup).toContain("미나 선생님");
    expect(markup).toContain(readingTeach.todayKo);
    expect(markup).toMatch(
      new RegExp(
        `<p lang="en" class="[^"]*text-2xl[^"]*">${readingTeach.todayEn}</p>`,
      ),
    );
    expect(markup.indexOf(readingTeach.todayKo)).toBeLessThan(
      markup.indexOf(readingTeach.todayEn ?? ""),
    );
    expect(markup).toContain(">시작</button>");
    // 3D 칸 · 선생님 창은 없다(초상만, NFR-11)
    expect(markup).not.toContain("data-teacher-window");
    expect(markup).not.toContain("<canvas");
  });

  it("AC-3g 고르기 전(선생님 없음)이면 글자 동그라미 '선'과 이름표 '선생님'이다", () => {
    const markup = html(
      createElement(TodayView, {
        today: writingTeach,
        teacher: null,
        line: LINE_WAITING,
        onStart: () => {},
      }),
    );
    expect(markup).toContain('data-teacher-portrait="initial"');
    expect(markup).toMatch(/data-teacher-name-tag=""[^>]*>선생님</);
  });

  it("AC-N20 오늘 배울 것은 한국어 줄 → 영어 토막(선생님 영어)을 읽는다", () => {
    expect(todayPartsOf(speakingTeach)).toEqual([
      { text: speakingTeach.todayKo, voice: "teacher_ko" },
      { text: speakingTeach.todayEn, voice: "teacher_en" },
    ]);
    expect(todayPartsOf({ todayKo: "한 줄" })).toEqual([
      { text: "한 줄", voice: "teacher_ko" },
    ]);
  });

  it("AC-N20 '시작'은 읽는 중 흐리고, 다 읽으면 밝으며 안내가 없다", () => {
    const view = (line: TeachLineView) =>
      html(
        createElement(TodayView, {
          today: readingTeach,
          teacher: MINA,
          line,
          onStart: () => {},
        }),
      );
    expect(actionDisabled(view(lineAfter(2, [])), "start")).toBe(true);
    expect(actionDisabled(view(lineAfter(2, [played])), "start")).toBe(true);
    const done = view(lineAfter(2, [played, played]));
    expect(actionDisabled(done, "start")).toBe(false);
    expect(done).not.toContain(TEACH_TEXT.soundless);
  });

  it("AC-N20 읽어 주기가 시작하지 않으면(감시가 넘김) '시작'이 밝고 안내 줄 '소리가 안 나와서 글로 봐요.'가 보인다", () => {
    const markup = html(
      createElement(TodayView, {
        today: readingTeach,
        teacher: MINA,
        line: lineAfter(2, [notPlayed]),
        onStart: () => {},
      }),
    );
    expect(actionDisabled(markup, "start")).toBe(false);
    expect(markup).toMatch(/role="status"[^>]*>소리가 안 나와서 글로 봐요\./);
  });

  it("AC-N20 ko-KR 목소리가 없거나 read_ko 끔이면 '시작'이 바로 밝고 안내 줄이 없으며 한국어 줄은 글로 보인다", () => {
    for (const reason of ["no_ko_voice", "read_ko_off"] as const) {
      const markup = html(
        createElement(TodayView, {
          today: readingTeach,
          teacher: MINA,
          line: lineAfter(2, [{ kind: "skipped", reason }]),
          onStart: () => {},
        }),
      );
      expect(actionDisabled(markup, "start"), reason).toBe(false);
      expect(markup, reason).not.toContain(TEACH_TEXT.soundless);
      expect(markup, reason).toContain(readingTeach.todayKo);
    }
  });

  it("AC-N20 화면이 처음 그려질 때(읽기 전)는 '시작'이 흐리다", () => {
    const markup = html(
      createElement(TodayScreen, {
        today: readingTeach,
        teacher: MINA,
        speech: undefined,
        speechSettings: SPEECH_SETTINGS,
        onStart: () => {},
      }),
    );
    expect(actionDisabled(markup, "start")).toBe(true);
  });

  it("AC-3g 말하는 중 · 칭찬 때 초상 오른쪽 아래에 표지 하나(4-가 꼴), 글 자료를 들려주는 동안은 초상 대신 듣기 표시다", () => {
    const speakingMarkup = html(
      createElement(TeacherLine, {
        teacher: MINA,
        lineKo: "한 줄",
        line: { speaking: true, material: false, notice: false },
      }),
    );
    expect(speakingMarkup).toContain('data-teacher-badge="speaking"');
    const praise = html(
      createElement(TeacherLine, {
        teacher: MINA,
        lineKo: "한 줄",
        line: { speaking: false, material: false, notice: false },
        praise: true,
      }),
    );
    expect(praise).toContain('data-teacher-badge="praise"');
    const material = html(
      createElement(TeacherLine, {
        teacher: MINA,
        lineKo: "한 줄",
        line: { speaking: false, material: true, notice: false },
      }),
    );
    expect(material).toContain("data-listening-mark");
    expect(material).not.toContain('data-teacher-portrait="mina"');
    expect(material).toContain("미나 선생님");
  });
});

describe("보여 주기(AC-3g · AC-N20)", () => {
  const writingCards = writing.preview.map((entry) => ({
    word: entry.word,
    meaningKo: entry.meaningKo,
    parts: entry.parts,
  }));

  it("AC-3g 새 단어 카드는 낱말 · 뜻 · 소리 표시이고 parts 는 띄워 보이며, 예문은 없다", () => {
    const markup = html(
      createElement(NewWordsView, {
        cards: writingCards,
        teacher: MINA,
        line: LINE_WAITING,
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(markup).toContain("새 낱말 다섯이에요. 누르면 다시 들려요.");
    for (const entry of writing.preview) {
      expect(markup).toContain(`data-new-word="${entry.word}"`);
      expect(markup).toContain(entry.meaningKo);
      // 예문 없음(C170 (3))
      if (entry.example) expect(markup).not.toContain(entry.example);
    }
    expect(markup).toContain('data-word-parts="bed·room"');
    expect(markup).toContain('<span class="sr-only">bedroom</span>');
    expect(markup).toContain('data-word-parts="bath·room"');
    expect(actionDisabled(markup, "next")).toBe(true);
  });

  it("AC-3g 새 단어 카드에 그림이 있으면 그림을 붙인다", () => {
    const markup = html(
      createElement(NewWordsView, {
        cards: [
          {
            word: "bed",
            meaningKo: "침대",
            picture: {
              meaningKo: "침대",
              src: "/images/vocab/bed.svg",
              catalogued: true,
            },
          },
        ],
        teacher: MINA,
        line: lineAfter(1, [played]),
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(markup).toContain('src="/images/vocab/bed.svg"');
    expect(markup).toContain("새 낱말 하나예요.");
  });

  it("AC-N20 새 단어는 낱말 차례로(선생님 영어) 읽고 선생님 한 줄로 끝나며, 다 읽으면 '다음'이 밝다", () => {
    expect(newWordsPartsOf(writingCards).map((p) => p.voice)).toEqual([
      "teacher_en",
      "teacher_en",
      "teacher_en",
      "teacher_en",
      "teacher_en",
      "teacher_ko",
    ]);
    const markup = html(
      createElement(NewWordsView, {
        cards: writingCards,
        teacher: MINA,
        line: lineAfter(6, Array(6).fill(played)),
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(actionDisabled(markup, "next")).toBe(false);
  });

  it("AC-3g 읽기 본보기는 칩 이름(누가 · 하는 일 · 무엇 · 어디) · 뜻 · 선생님 한 줄을 그리고, 칩은 lit 대로 켜진다", () => {
    const model = readingTeach.models[0];
    if (!model) throw new Error("본보기");
    const off = html(
      createElement(ModelView, {
        model,
        teacher: MINA,
        line: LINE_WAITING,
        chipLit: [false, false, false],
        storyShown: false,
        onNext: () => {},
      }),
    );
    expect(off).toContain('data-teach-show="model"');
    expect(off).toContain(model.lineKo);
    expect(off).toContain(model.ko);
    for (const name of ["누가", "하는 일", "무엇"]) expect(off).toContain(name);
    expect(off).not.toContain("data-chip-lit");
    const on = html(
      createElement(ModelView, {
        model,
        teacher: MINA,
        line: lineAfter(2, [played, played]),
        chipLit: [true, true, true],
        storyShown: true,
        onNext: () => {},
      }),
    );
    expect(on.match(/data-chip-lit=""/g)).toHaveLength(3);
    expect(on).toContain("bg-chip-who");
    expect(on).toContain("bg-chip-do");
    expect(on).toContain("bg-chip-what");
    expect(actionDisabled(on, "next")).toBe(false);
    // 어디 칩(본보기 3)
    const where = readingTeach.models[2];
    if (!where) throw new Error("본보기 3");
    expect(
      html(
        createElement(ChipSentence, { sentence: where.en, chips: where.chips }),
      ),
    ).toContain('data-chip-role="where"');
  });

  it("AC-3g 쓰기 본보기는 앞 꼴(fromEn) 위에 문장과 칸 이름표(무엇 · is · 어때요 · 마침표)를 그린다", () => {
    const model = writingTeach.models[0];
    if (!model) throw new Error("본보기");
    const markup = html(
      createElement(ModelView, {
        model,
        teacher: MINA,
        line: LINE_WAITING,
        chipLit: [true, true, true, true],
        storyShown: false,
        onNext: () => {},
      }),
    );
    expect(markup).toContain(model.fromEn ?? "");
    for (const role of ["thing", "is", "how", "end"])
      expect(markup).toContain(`data-chip-role="${role}"`);
    for (const name of ["무엇", "is", "어때요", "마침표"])
      expect(markup).toContain(`>${name}</span>`);
    expect(modelPartsOf(model).map((p) => p.text)).toEqual([
      model.fromEn,
      model.en,
      model.lineKo,
    ]);
  });

  it("AC-3g 말하기 본보기는 이야기(들은 뒤에만 보임) · 질문 · 낱말 답 · 문장 답 차례이고, 질문에는 칩이 온 자리(from)를 단다", () => {
    const first = speakingTeach.models[0];
    const second = speakingTeach.models[1];
    if (!first || !second) throw new Error("본보기");
    expect(modelPartsOf(first)).toEqual([
      { text: first.storyEn, voice: "material" },
      { text: first.questionEn, voice: "teacher_en" },
      { text: first.wordAnswerEn, voice: "teacher_en" },
      { text: first.en, voice: "teacher_en" },
      { text: first.lineKo, voice: "teacher_ko" },
    ]);
    const before = html(
      createElement(ModelView, {
        model: first,
        teacher: MINA,
        line: LINE_WAITING,
        chipLit: [false, false, false],
        storyShown: false,
        onNext: () => {},
      }),
    );
    expect(before).not.toContain(first.storyEn ?? "");
    expect(before).toContain(first.questionEn ?? "");
    expect(before).toContain(first.wordAnswerEn ?? "");
    const after = html(
      createElement(ModelView, {
        model: first,
        teacher: MINA,
        line: LINE_WAITING,
        chipLit: [false, false, false],
        storyShown: true,
        onNext: () => {},
      }),
    );
    expect(after).toContain(first.storyEn ?? "");
    const moved = html(
      createElement(ModelView, {
        model: second,
        teacher: MINA,
        line: LINE_WAITING,
        chipLit: [false, false, false],
        storyShown: true,
        onNext: () => {},
      }),
    );
    // 질문 칩(Max and Gus · drink · milk)은 켜져 있고 답 칩은 꺼져 있다
    expect(moved).toMatch(
      /data-chip-role="who" data-chip-lit=""[^>]*><span[^>]*>Max and Gus</,
    );
    expect(moved).toMatch(
      /data-chip-role="what" data-chip-lit=""[^>]*><span[^>]*>milk</,
    );
    expect(moved).toMatch(/data-chip-role="who" class[^>]*><span[^>]*>they</);
  });
});

describe("칩 · 문항 이름표 · 칩 토큰(AC-3g · plan 정한 것 15)", () => {
  const css = readFileSync(join(ROOT, "src", "app", "globals.css"), "utf8");
  const raw = (name: string) =>
    new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
  /** var(--x) 를 따라가 끝 값(#hex)까지. */
  const resolve = (name: string): string | undefined => {
    const value = raw(name);
    const ref = /^var\(--([a-z0-9-]+)\)$/.exec(value ?? "")?.[1];
    return ref ? resolve(ref) : value;
  };
  const PALETTE = [
    "color-postit-reading",
    "color-postit-writing",
    "color-postit-speaking",
    "color-postit-talk",
    "color-kraft",
    "color-tape-1",
    "color-tape-2",
    "color-tape-3",
    "color-tape-4",
    "color-tape-5",
    "color-avatar-orange",
    "color-avatar-purple",
  ];

  it("AC-3g 칩 이름이 role 에서 나오고 정본 밖 문구 표 글자 그대로다", () => {
    expect(CHIP_NAME).toEqual({
      who: "누가",
      do: "하는 일",
      what: "무엇",
      where: "어디",
      thing: "무엇",
      is: "is",
      how: "어때요",
      end: "마침표",
    });
    expect(Object.keys(CHIP_NAME).sort()).toEqual([...TEACH_CHIP_ROLES].sort());
  });

  it("AC-3g 칩 토큰 여덟이 globals.css 에 있고 값은 ② 팔레트 토큰을 가리키며 먹색 글자 7:1 이상이다", () => {
    expect(CHIP_TOKENS).toHaveLength(8);
    const ink = resolve("color-ink") ?? "";
    for (const token of CHIP_TOKENS) {
      const ref = /^var\(--([a-z0-9-]+)\)$/.exec(
        raw(`color-${token}`) ?? "",
      )?.[1];
      expect(PALETTE, token).toContain(ref);
      expect(
        contrastRatio(ink, resolve(`color-${token}`) ?? ""),
        token,
      ).toBeGreaterThanOrEqual(7);
    }
    for (const tone of Object.values(CHIP_TONE))
      expect(CHIP_TOKENS).toContain(tone.replace(/^bg-/, ""));
  });

  it("AC-3g 한 화면에 함께 나오는 칩(읽기 · 말하기 넷, 쓰기 넷)은 색이 겹치지 않는다", () => {
    const colorOf = (role: keyof typeof CHIP_TONE) =>
      resolve(`color-${CHIP_TONE[role].replace(/^bg-/, "")}`);
    for (const group of [
      ["who", "do", "what", "where"],
      ["thing", "is", "how", "end"],
    ] as const) {
      const values = group.map(colorOf);
      expect(new Set(values).size, group.join(",")).toBe(group.length);
    }
  });

  it("AC-3g 문항 이름표는 askRole 에서 나온 '누가' · '무엇' · '어디'다", () => {
    for (const [role, name] of [
      ["who", "누가"],
      ["what", "무엇"],
      ["where", "어디"],
    ] as const) {
      const markup = html(createElement(AskTag, { role }));
      expect(markup).toContain(`data-ask-role="${role}"`);
      expect(markup).toContain(`>${name}</span>`);
    }
  });
});

describe("같이 해 보기 틀(AC-3g)", () => {
  it("AC-3g 읽기 같이 해 보기는 짧은 글에 띠(highlight) · 이름표 · 빈 자리 문장 · 선생님 한 줄을 그리고, 입력은 children 이다", () => {
    const item = readingTeach.together[0];
    if (!item) throw new Error("같이 해 보기");
    const markup = html(
      createElement(
        TogetherView,
        {
          data: item,
          teacher: MINA,
          line: LINE_WAITING,
          storyShown: false,
        },
        createElement("div", { "data-area-input": "" }),
      ),
    );
    expect(markup).toContain('data-teach-slot="together"');
    expect(markup).toContain(item.lineKo ?? "");
    expect(markup).toMatch(/<mark data-highlight=""[^>]*>come<\/mark>/);
    expect(markup).toContain('data-ask-role="who"');
    expect(markup).toContain("data-area-input");
    expect(markup).toContain('data-teacher-portrait="mina"');
    expect(togetherPartsOf(item, undefined)).toEqual([
      { text: item.textEn, voice: "teacher_en" },
      { text: item.lineKo, voice: "teacher_ko" },
    ]);
  });

  it("AC-3g 틀림 · 맞음 반응은 말풍선이 그 반응 한 줄(wrongKo · rightKo)로 바뀌고 그 줄만 읽는다", () => {
    const item = readingTeach.together[1];
    if (!item) throw new Error("같이 해 보기");
    const reaction = { kind: "wrong" as const, ko: item.wrongKo };
    const markup = html(
      createElement(TogetherView, {
        data: item,
        reaction,
        teacher: MINA,
        line: LINE_WAITING,
        storyShown: true,
      }),
    );
    expect(markup).toContain(item.wrongKo);
    expect(markup).toContain('data-together-reaction="wrong"');
    expect(togetherPartsOf(item, reaction)).toEqual([
      { text: item.wrongKo, voice: "teacher_ko" },
    ]);
  });

  it("AC-3g 말하기 같이 해 보기는 이야기(들은 뒤) · 질문 · 뜻 · 답 틀을 그리고, 이야기(글 자료) → 질문 → 선생님 한 줄 차례로 읽는다", () => {
    const item = speakingTeach.together[0];
    if (!item) throw new Error("같이 해 보기");
    const data = {
      lineKo: item.lineKo,
      storyEn: item.storyEn,
      questionEn: item.en,
      questionKo: item.ko,
      prompt: typeof item.filled === "string" ? item.filled : undefined,
    };
    const markup = html(
      createElement(TogetherView, {
        data,
        teacher: MINA,
        line: LINE_WAITING,
        storyShown: false,
      }),
    );
    expect(markup).not.toContain(item.storyEn);
    expect(markup).toContain(item.en);
    expect(markup).toContain(item.ko);
    expect(togetherPartsOf(data, undefined).map((p) => p.voice)).toEqual([
      "material",
      "teacher_en",
      "teacher_ko",
    ]);
  });
});

describe("'왜' 말풍선(AC-3g · AC-N20)", () => {
  it("AC-3g '왜'는 초상 · 이름표 · 한 줄과 틀린 뒤 단추 하나다(읽기 · 듣기 풀기 · 쓰기 하기 · 말하기 말하기)", () => {
    for (const [retry, text] of [
      ["solve", "한 번 더 풀기"],
      ["do", "한 번 더 하기"],
      ["speak", "한 번 더 말하기"],
    ] as const) {
      const markup = html(
        createElement(WhyView, {
          whyKo: "come 을 찾아요. 바로 앞에 Ben and Meg 가 있어요.",
          retry,
          teacher: MINA,
          line: LINE_WAITING,
        }),
      );
      expect(markup).toContain('data-teacher-portrait="mina"');
      expect(markup).toContain("미나 선생님");
      expect(markup).toContain(`>${text}</button>`);
    }
  });

  it("AC-N20 '왜' 단추는 읽는 중 흐리고, 다 읽거나 · 감시가 넘기거나(안내 줄) · 읽지 않음(안내 없음)이면 밝다", () => {
    const view = (line: TeachLineView) =>
      html(
        createElement(WhyView, {
          whyKo: WRITING_WHY_KO.capital,
          retry: "do",
          teacher: MINA,
          line,
        }),
      );
    expect(actionDisabled(view(lineAfter(1, [])), "retry")).toBe(true);
    expect(actionDisabled(view(lineAfter(1, [played])), "retry")).toBe(false);
    const soundless = view(lineAfter(1, [notPlayed]));
    expect(actionDisabled(soundless, "retry")).toBe(false);
    expect(soundless).toContain(TEACH_TEXT.soundless);
    const skipped = view(
      lineAfter(1, [{ kind: "skipped", reason: "no_ko_voice" }]),
    );
    expect(actionDisabled(skipped, "retry")).toBe(false);
    expect(skipped).not.toContain(TEACH_TEXT.soundless);
  });

  it("AC-3g 다시가 없는 '왜'(짝도 틀림)는 한 줄만 보이고 단추가 없다", () => {
    const markup = html(
      createElement(WhyView, {
        whyKo: TEACH_TEXT.whyRepeat,
        teacher: MINA,
        line: LINE_WAITING,
      }),
    );
    expect(markup).toContain(TEACH_TEXT.whyRepeat);
    expect(markup).not.toContain("data-teach-action");
  });
});

describe("이야기 화면 · 첫 장 한 줄(AC-3g · AC-N20)", () => {
  it("AC-3g 이야기 화면은 글자 없이 듣기 표시 · '다시 듣기' · '다음'이다", () => {
    const story = "Max and Gus drink water.";
    const markup = html(
      createElement(StoryScreen, {
        storyEn: story,
        speech: undefined,
        onNext: () => {},
      }),
    );
    expect(markup).toContain("data-teach-story");
    expect(markup).not.toContain(story);
    expect(markup).toContain("다시 듣기");
    expect(markup).toContain(">다음</button>");
    // 들려주기 전에는 둘 다 흐리다
    expect(actionDisabled(markup, "next")).toBe(true);
    expect(actionDisabled(markup, "listen-again")).toBe(true);
  });

  it("AC-N20 '다시 듣기'는 한 번 쓰면 흐리고, 소리 없이 넘어간 들려주기 뒤에는 살아 있다", () => {
    const view = (results: TeachLineResult[]) =>
      html(
        createElement(StoryView, {
          plays: storyPlaysOf(results, false),
          playing: false,
          onReplay: () => {},
          onNext: () => {},
        }),
      );
    expect(STORY_REPLAYS).toBe(1);
    expect(actionDisabled(view([played]), "listen-again")).toBe(false);
    expect(actionDisabled(view([played, played]), "listen-again")).toBe(true);
    expect(actionDisabled(view([notPlayed]), "listen-again")).toBe(false);
    expect(actionDisabled(view([notPlayed]), "next")).toBe(false);
  });

  it("AC-3g 혼자 해 보기 첫 화면 · 다른 예시 첫 장은 초상과 앱 문구 한 줄이다", () => {
    expect(firstLineOf("solo", "writing")).toBe("이제 혼자 해 봐요.");
    expect(firstLineOf("spare", "reading")).toBe("다른 글에서 혼자 해 봐요.");
    expect(firstLineOf("spare", "writing")).toBe("다른 문장도 혼자 놓아 봐요.");
    expect(firstLineOf("spare", "speaking")).toBe(
      "다른 이야기로 혼자 해 봐요.",
    );
    const markup = html(
      createElement(FirstLine, {
        kind: "spare",
        area: "speaking",
        teacher: MINA,
        speech: undefined,
        speechSettings: SPEECH_SETTINGS,
      }),
    );
    expect(markup).toContain('data-teach-first="spare"');
    expect(markup).toContain('data-teacher-portrait="mina"');
    expect(markup).toContain("다른 이야기로 혼자 해 봐요.");
    expect(markup).not.toContain("data-teach-action");
  });
});

describe("3D 없음(AC-3g · NFR-11)", () => {
  it("AC-3g 자리 조각 소스는 3D 모듈(three · avatar-3d · 그림 층)을 가져오지 않는다", () => {
    const dir = join(ROOT, "src", "components", "session", "teach");
    for (const name of [
      "chips.tsx",
      "show.tsx",
      "spare-intro.tsx",
      "story.tsx",
      "teacher-line.tsx",
      "today.tsx",
      "together.tsx",
      "why-bubble.tsx",
    ]) {
      const source = readFileSync(join(dir, name), "utf8");
      expect(source, name).not.toMatch(
        /from "(three|@pixiv\/three-vrm[^"]*|@\/components\/teacher\/avatar-3d|@\/components\/teacher\/teacher-layer)"/,
      );
    }
  });
});

/** 결과를 차례로 돌려주는 가짜 음성 접점(시작 알림은 소리가 난 결과에서만). 부른 글 · 선택 칸을 남긴다. */
function fakeSpeech(outcomes: TeachLineResult[]) {
  const calls: { text: string; options: SpeakOptions | undefined }[] = [];
  let next = 0;
  const port: SpeechPort = {
    device: () => ({ ok: true }) as unknown as ReturnType<SpeechPort["device"]>,
    unlockFromGesture: () => {},
    speak: async (text, options) => {
      calls.push({ text, options });
      const outcome = outcomes[next++] ?? { kind: "ended", heard: "played" };
      if (outcome.kind === "ended" && outcome.heard !== "not_played")
        options?.onStart?.();
      return outcome;
    },
    cancelSpeaking: () => {},
    listen: () => {
      throw new Error("듣기 없음");
    },
    checkMicrophone: async () => ({ ok: true }),
    dispose: () => {},
  };
  return { port, calls };
}

describe("선생님 줄이 멈춘 때 알림(AC-N20 · 설계 10 무음 모드 줄 셈 — 리뷰 I1)", () => {
  const whyParts = [
    { text: WRITING_WHY_KO.capital, voice: "teacher_ko" } as const,
  ];

  it("AC-N20 오늘 배울 것이 들려주지 못함(not_played)이면 onLineEnd 가 notice true 로 한 번 불리고 영어 토막은 읽지 않는다", async () => {
    const { port, calls } = fakeSpeech([notPlayed]);
    const ends: { notice: boolean }[] = [];
    await readTeachLine({
      parts: todayPartsOf(readingTeach),
      speech: port,
      teacher: MINA,
      onEnd: (end) => ends.push(end),
    });
    expect(ends).toEqual([{ notice: true }]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.options?.lang).toBe("ko-KR");
  });

  it("AC-N20 오늘 배울 것을 다 읽으면(played) onLineEnd 가 notice false 로 한 번 불리고, 한국어 줄 → 영어 토막 차례다", async () => {
    const { port, calls } = fakeSpeech([played, played]);
    const ends: { notice: boolean }[] = [];
    await readTeachLine({
      parts: todayPartsOf(readingTeach),
      speech: port,
      teacher: MINA,
      onEnd: (end) => ends.push(end),
    });
    expect(ends).toEqual([{ notice: false }]);
    expect(calls.map((c) => c.text)).toEqual([
      readingTeach.todayKo,
      readingTeach.todayEn,
    ]);
    // 영어 토막은 선생님 음성 감싸기(높이)로, lang 없이
    expect(calls[1]?.options?.lang).toBeUndefined();
    expect(calls[1]?.options?.pitch).toBe(MINA.voice.pitch);
  });

  it("AC-N20 '왜'가 들려주지 못함이면 notice true, 다 읽으면 notice false, 읽지 않음(skipped)이면 notice false 로 한 번씩 불린다", async () => {
    for (const [outcome, notice] of [
      [notPlayed, true],
      [played, false],
      [{ kind: "skipped", reason: "read_ko_off" }, false],
    ] as const) {
      const { port } = fakeSpeech([outcome]);
      const ends: { notice: boolean }[] = [];
      await readTeachLine({
        parts: whyParts,
        speech: port,
        teacher: MINA,
        onEnd: (end) => ends.push(end),
      });
      expect(ends, outcome.kind).toEqual([{ notice }]);
    }
  });

  it("AC-N20 화면이 바뀌면(alive 거짓) 알림 없이 그만둔다", async () => {
    const { port } = fakeSpeech([played, played]);
    const ends: { notice: boolean }[] = [];
    await readTeachLine({
      parts: todayPartsOf(readingTeach),
      speech: port,
      teacher: MINA,
      alive: () => false,
      onEnd: (end) => ends.push(end),
    });
    expect(ends).toEqual([]);
  });

  it("AC-N20 선생님 줄을 읽는 조각 여섯(오늘 배울 것 · 새 단어 · 본보기 · 같이 해 보기 · '왜' · 첫 장)이 onLineEnd 를 읽기 끝에 잇는다", () => {
    const dir = join(ROOT, "src", "components", "session", "teach");
    const wired = (name: string) =>
      readFileSync(join(dir, name), "utf8").match(/onEnd: onLineEnd,/g)
        ?.length ?? 0;
    expect(wired("today.tsx")).toBe(1);
    expect(wired("show.tsx")).toBe(2);
    expect(wired("together.tsx")).toBe(1);
    expect(wired("why-bubble.tsx")).toBe(1);
    expect(wired("spare-intro.tsx")).toBe(1);
  });
});

describe("칩 문장의 언어 표시(AC-3g — 리뷰 M3)", () => {
  it("AC-3g 영어 덩어리만 lang en 이고 칩 이름표는 lang ko 다", () => {
    const model = readingTeach.models[0];
    if (!model) throw new Error("본보기");
    const markup = html(
      createElement(ChipSentence, { sentence: model.en, chips: model.chips }),
    );
    expect(markup).not.toMatch(/<p[^>]*lang="en"/);
    expect(markup).toMatch(/<span lang="ko"[^>]*>누가<\/span>/);
    expect(markup).toMatch(/<span lang="en"[^>]*>We<\/span>/);
  });
});
