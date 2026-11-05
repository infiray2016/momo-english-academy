// 되짚기 조각(가르치고 배우는 수업 plan 묶음 라-4 · 정본 03:26 세션 결과 행 · 03:80 세션 결과(되짚기) 행 · 델타 spec 설계 5 화면 표 · 문구 표
// '결과 칸 이름' · 설계 10 읽어 주기 실패, 15절 AC-6f). 입력은 정규 시드 셋(seed/lessons/{reading,writing,speaking}/3/1.json)의 teach.recap 을
// 그대로 쓴다. 읽는 차례는 React 밖 함수 readTeachLine 에 가짜 음성 접점을 넣어 보고, 그림은 renderToStaticMarkup 으로 본다(효과는 돌지 않음).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLOSING_TEXT } from "@/components/conversation/closing-cards";
import {
  listenWordLabel,
  MetWordCards,
  REWARD_TEXT,
} from "@/components/session/reward";
import { CHIP_NAME } from "@/components/session/teach/chips";
import {
  RecapFrame,
  RecapHead,
  recapPartsOf,
} from "@/components/session/teach/recap";
import {
  LINE_WAITING,
  readTeachLine,
  TEACH_TEXT,
  type TeachLineView,
} from "@/components/session/teach/teacher-line";
import { LessonFileSchema } from "@/core/seed/schema/lesson";
import {
  type TeachLineResult,
  teachLineStateOf,
} from "@/core/session/teach-line";
import type { SpeakOptions, SpeechPort } from "@/lib/speech/types";

// 브라우저 전용 모듈 · 쪽 길잡이 · 서버 액션은 시험(node)에서 빈 모듈로(teach-pieces 시험과 같음)
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/teacher", () => ({}));

const ROOT = process.cwd();
const AREAS = ["reading", "writing", "speaking"] as const;

/** 정규 시드 첫 수업의 teach.recap(영역 · 3단계 · 단원 1). */
function seedRecapOf(area: (typeof AREAS)[number]) {
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
    words: preview.map((p: { word: string }) => p.word),
  };
}

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

const played: TeachLineResult = { kind: "ended", heard: "played" };
const notPlayed: TeachLineResult = { kind: "ended", heard: "not_played" };

/** 결과를 차례로 돌려주는 가짜 음성 접점(시작 알림은 소리가 난 결과에서만). 부른 글 · 선택 칸을 남긴다. */
function fakeSpeech(outcomes: TeachLineResult[]) {
  const calls: { text: string; options: SpeakOptions | undefined }[] = [];
  let next = 0;
  const port: SpeechPort = {
    device: () => ({ ok: true }) as unknown as ReturnType<SpeechPort["device"]>,
    unlockFromGesture: () => {},
    speak: async (text, options) => {
      calls.push({ text, options });
      const outcome = outcomes[next++] ?? played;
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

const html = (element: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(element);

describe("되짚기 읽는 차례(정본 03:80 들리는 것 · AC-6f)", () => {
  it("AC-6f 읽는 차례는 마무리 한 줄(한국어 ko-KR) → 오늘 만난 말의 단원 단어(보인 차례, 선생님 영어 목소리) → 문장 틀이다", async () => {
    for (const area of AREAS) {
      const { recap, words } = seedRecapOf(area);
      const parts = recapPartsOf({
        lineKo: recap.closeKo,
        words,
        frame: { frameEn: recap.frameEn, chips: recap.chips },
      });
      expect(
        parts.map((p) => p.voice),
        area,
      ).toEqual(["teacher_ko", ...words.map(() => "teacher_en"), "teacher_en"]);
      const { port, calls } = fakeSpeech([]);
      const ends: { notice: boolean }[] = [];
      await readTeachLine({
        parts,
        speech: port,
        teacher: MINA,
        onEnd: (end) => ends.push(end),
      });
      expect(
        calls.map((c) => c.text),
        area,
      ).toEqual([recap.closeKo, ...words, recap.frameEn]);
      // 마무리 줄은 한국어 목소리(lang ko-KR), 단어 · 문장 틀은 선생님 영어 목소리(높이 · 목소리 순서, lang 없음)
      expect(calls[0]?.options?.lang, area).toBe("ko-KR");
      for (const call of calls.slice(1)) {
        expect(call.options?.lang, area).toBeUndefined();
        expect(call.options?.pitch, area).toBe(MINA.voice.pitch);
      }
      expect(ends, area).toEqual([{ notice: false }]);
    }
  });

  it("AC-6f 고르기 전(선생님 null)이면 기본 목소리로 읽는다(높이를 얹지 않는다, C130)", async () => {
    const { recap, words } = seedRecapOf("reading");
    const { port, calls } = fakeSpeech([]);
    await readTeachLine({
      parts: recapPartsOf({
        lineKo: recap.closeKoPracticed,
        words,
        frame: { frameEn: recap.frameEn, chips: recap.chips },
      }),
      speech: port,
      teacher: null,
    });
    expect(calls.map((c) => c.options?.pitch)).toEqual(
      calls.map(() => undefined),
    );
  });

  it("AC-6f 마무리 줄을 들려주지 못하면(not_played) 거기서 멈추고 단추가 밝아지며 '소리가 안 나와서 글로 봐요.'를 보인다", async () => {
    const { recap, words } = seedRecapOf("speaking");
    const parts = recapPartsOf({
      lineKo: recap.closeKo,
      words,
      frame: { frameEn: recap.frameEn, chips: recap.chips },
    });
    const { port, calls } = fakeSpeech([notPlayed]);
    const ends: { notice: boolean }[] = [];
    await readTeachLine({
      parts,
      speech: port,
      teacher: MINA,
      onEnd: (end) => ends.push(end),
    });
    expect(calls).toHaveLength(1);
    expect(ends).toEqual([{ notice: true }]);
    const line = lineAfter(parts.length, [notPlayed]);
    expect(line.bright).toBe(true);
    const head = html(
      createElement(RecapHead, { teacher: MINA, lineKo: recap.closeKo, line }),
    );
    expect(head).toContain(TEACH_TEXT.soundless);
    // 단추는 밝다(읽기가 멈췄으므로 다시 듣기를 누를 수 있다)
    const frame = html(
      createElement(RecapFrame, {
        frameEn: recap.frameEn,
        chips: recap.chips,
        listenOff: !line.bright,
        onListen: () => {},
      }),
    );
    expect(frame).not.toMatch(/<button[^>]*\sdisabled=""/);
  });

  it("AC-6f 한국어 줄을 읽지 않는 기기(skipped — ko-KR 없음 · read_ko 끔)도 단원 단어 → 문장 틀은 이어 읽는다", async () => {
    const { recap, words } = seedRecapOf("writing");
    const parts = recapPartsOf({
      lineKo: recap.closeKo,
      words,
      frame: { frameEn: recap.frameEn, chips: recap.chips },
    });
    const { port, calls } = fakeSpeech([
      { kind: "skipped", reason: "read_ko_off" } as TeachLineResult,
    ]);
    await readTeachLine({ parts, speech: port, teacher: MINA });
    expect(calls.map((c) => c.text)).toEqual([
      recap.closeKo,
      ...words,
      recap.frameEn,
    ]);
  });

  it("AC-6f 다시 하기 결과(오늘 만난 말 없음 — 단어 비움 · 문장 틀 null)는 마무리 한 줄만 읽는다", async () => {
    const { recap } = seedRecapOf("reading");
    const parts = recapPartsOf({
      lineKo: recap.closeKo,
      words: [],
      frame: null,
    });
    expect(parts).toEqual([{ text: recap.closeKo, voice: "teacher_ko" }]);
    const { port, calls } = fakeSpeech([]);
    const ends: { notice: boolean }[] = [];
    await readTeachLine({
      parts,
      speech: port,
      teacher: MINA,
      onEnd: (end) => ends.push(end),
    });
    expect(calls.map((c) => c.text)).toEqual([recap.closeKo]);
    expect(ends).toEqual([{ notice: false }]);
  });

  it("AC-6f 되짚기 자료가 없으면(되짚기 없는 결과) 읽을 것이 없고 바로 밝다", () => {
    expect(recapPartsOf(undefined)).toEqual([]);
    expect(teachLineStateOf(0, []).bright).toBe(true);
  });
});

describe("되짚기 그림(정본 03:26 · 03:80 보이는 것 · AC-6f)", () => {
  it("AC-6f 첫머리는 초상 · 이름표 '[이름] 선생님' · 말풍선의 마무리 한 줄(시드 글 그대로)이다", () => {
    const { recap } = seedRecapOf("reading");
    const out = html(
      createElement(RecapHead, {
        teacher: MINA,
        lineKo: recap.closeKoPracticed,
        line: LINE_WAITING,
      }),
    );
    expect(out).toContain("data-recap-head");
    expect(out).toContain("data-teacher-line");
    expect(out).toContain("data-teacher-bubble");
    expect(out).toContain(recap.closeKoPracticed);
    expect(out).toContain("미나 선생님");
    // 읽는 중이 아니면 안내 줄은 비어 있다
    expect(out).not.toContain(TEACH_TEXT.soundless);
  });

  it("AC-6f 문장 틀은 칩을 단 문장(영어 덩어리 lang en · 칩 이름)과 '다시 듣기' 단추이고, 읽는 동안 단추가 흐리다", () => {
    for (const area of AREAS) {
      const { recap } = seedRecapOf(area);
      const reading = html(
        createElement(RecapFrame, {
          frameEn: recap.frameEn,
          chips: recap.chips,
          listenOff: true,
          onListen: () => {},
        }),
      );
      expect(reading, area).toContain("data-recap-frame");
      expect(reading, area).toContain("data-chip-sentence");
      expect(reading.match(/data-chip-role=/g), area).toHaveLength(
        recap.chips.length,
      );
      for (const chip of recap.chips)
        expect(reading, area).toContain(CHIP_NAME[chip.role]);
      expect(reading, area).toContain(TEACH_TEXT.listenAgain);
      expect(reading, area).toMatch(/<button[^>]*data-recap-listen[^>]*>/);
      expect(reading, area).toMatch(/<button[^>]*\sdisabled=""[^>]*>/);
      const done = html(
        createElement(RecapFrame, {
          frameEn: recap.frameEn,
          chips: recap.chips,
          listenOff: false,
          onListen: () => {},
        }),
      );
      expect(done, area).not.toMatch(/<button[^>]*\sdisabled=""/);
    }
  });

  it("AC-6f 오늘 만난 말 카드는 onListen 이 있으면 낱말마다 소리 단추(접근 이름 '단어 듣기: 낱말')를 두고, 없으면 두지 않으며 카드 꼴은 같다", () => {
    const words = [
      { word: "eat", meaningKo: "먹다" },
      { word: "drink", meaningKo: "마시다" },
    ];
    const plain = html(createElement(MetWordCards, { words }));
    expect(plain).toContain(REWARD_TEXT.metWords);
    expect(plain).not.toContain("data-met-word-listen");
    const withSound = html(
      createElement(MetWordCards, {
        words,
        onListen: () => {},
        listenOff: false,
      }),
    );
    expect(withSound.match(/data-met-word-listen=/g)).toHaveLength(2);
    // 접근 이름에 낱말을 잇는다(화면 읽기 기능이 어느 낱말의 단추인지 안다 — fix 1 M4)
    expect(withSound).toContain(`aria-label="${listenWordLabel("eat")}"`);
    expect(withSound).toContain(`aria-label="${listenWordLabel("drink")}"`);
    expect(listenWordLabel("eat")).toBe("단어 듣기: eat");
    // 카드 꼴(노랑 둥근 종이 · 종이 테 · 기울기)은 그대로
    for (const out of [plain, withSound]) {
      expect(out).toContain("bg-postit-reading");
      expect(out).toContain("rounded-card");
      expect(out).toContain("-rotate-1");
      expect(out).toContain('lang="en"');
    }
    const off = html(
      createElement(MetWordCards, {
        words,
        onListen: () => {},
        listenOff: true,
      }),
    );
    expect(off.match(/<button[^>]*\sdisabled=""/g)).toHaveLength(2);
  });

  it("AC-6f 오늘 만난 말 칸은 단어가 없어도 문장 틀(children)이 있으면 그리고, 둘 다 없으면 그리지 않는다", () => {
    expect(html(createElement(MetWordCards, { words: [] }))).toBe("");
    const { recap } = seedRecapOf("reading");
    const frameOnly = html(
      createElement(
        MetWordCards,
        { words: [] },
        createElement(RecapFrame, {
          frameEn: recap.frameEn,
          chips: recap.chips,
          listenOff: false,
          onListen: () => {},
        }),
      ),
    );
    expect(frameOnly).toContain(REWARD_TEXT.metWords);
    expect(frameOnly).toContain("data-recap-frame");
    expect(frameOnly).not.toContain("data-met-word=");
  });

  it("AC-6f 칸 이름은 둘로 갈린다: 세 영역 결과 '오늘 만난 말'(문구 표 '결과 칸 이름'), 회화 마무리 '오늘 만난 단어'(정본 03:24), 소리 단추 이름은 회화 마무리와 같은 '단어 듣기'다", () => {
    expect(REWARD_TEXT.metWords).toBe("오늘 만난 말");
    expect(REWARD_TEXT.metWords).toBe(TEACH_TEXT.recapWords);
    expect(REWARD_TEXT.metWordsTalk).toBe("오늘 만난 단어");
    expect(CLOSING_TEXT.metWords).toBe(REWARD_TEXT.metWordsTalk);
    expect(REWARD_TEXT.listenWord).toBe(CLOSING_TEXT.listenWord);
  });

  it("AC-6f 되짚기 조각 소스는 3D 모듈(three · avatar-3d · 그림 층)을 가져오지 않고, 줄 고르기를 다시 셈하지 않는다(recapLineOf · 문턱 설정을 읽지 않음)", () => {
    const source = readFileSync(
      join(ROOT, "src", "components", "session", "teach", "recap.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(
      /from "(three|@pixiv\/three-vrm[^"]*|@\/components\/teacher\/avatar-3d|@\/components\/teacher\/teacher-layer)"/,
    );
    expect(source).not.toContain("recapLineOf");
    expect(source).not.toContain("recap_can_ratio");
    expect(source).not.toContain("recap_min_evidence");
  });
});
