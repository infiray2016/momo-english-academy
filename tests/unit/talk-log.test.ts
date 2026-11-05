// 회화 대화 기록 고르기 · 기록 칸(회화 plan 묶음 10 — 정본 03 4절 '대화 기록' · '인식 확인 · 아이 말풍선' 행 · 3.3 소리 줄 · T2 · C119 · C164).
// 증명: AC-15q 단위 몫(1~3단계 기록에 따라 할 말 · 선택지 · 받침의 답 글이 없음, '잘 모르겠어요' · 회색 '못 들었어요'가 남음, 이어 하기 때
// talk_turns 로 다시 그림 — 화면 자료 lessonLogOf → talkLogOf). 기록 칸 그림은 정적 그림(renderToStaticMarkup)으로 본다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChildBubble } from "@/components/conversation/child-turn";
import { TalkLog } from "@/components/conversation/talk-log";
import {
  childLogEntryOf,
  childSaidOfInput,
  liveTeacherEntryOf,
  type TalkLogEntry,
  talkLogAppend,
  talkLogOf,
  talkLogReplayOf,
} from "@/core/conversation/log";
import { talkMoveOf } from "@/core/conversation/move";
import { lessonLogOf, type TalkLessonLogRow } from "@/server/conversation";
import type { TalkTurnRow } from "@/server/conversation/state";
import { CARD3 } from "../fixtures/talk-lesson";

vi.mock("client-only", () => ({}));

const teacherRow = (
  turnNo: number,
  lines: { en: string; ko?: string; app: boolean }[],
  segment: TalkLessonLogRow["segment"] = "talk",
): TalkLessonLogRow => ({
  speaker: "teacher",
  turnNo,
  segment,
  kind: "ai",
  lines,
});
const childRow = (
  turnNo: number,
  over: Partial<Extract<TalkLessonLogRow, { speaker: "child" }>> = {},
  segment: TalkLessonLogRow["segment"] = "talk",
): TalkLessonLogRow => ({
  speaker: "child",
  turnNo,
  segment,
  text: "I like soccer.",
  input: "speech",
  nospeech: false,
  stuck: false,
  ...over,
});

describe("대화 기록 고르기 talkLogOf", () => {
  it("AC-15q 선생님 화면 글 줄 · 뜻 · 아이 말 · '잘 모르겠어요' · '못 들었어요'를 차례대로 남긴다", () => {
    const log = talkLogOf(
      [
        teacherRow(
          1,
          [{ en: "How are you today?", ko: "오늘 기분 어때?", app: true }],
          "greeting",
        ),
        childRow(1, { text: "I'm good." }, "greeting"),
        teacherRow(2, [
          { en: "Great!", ko: "좋아!", app: false },
          { en: "What do you do on Sunday?", ko: "일요일에 뭐 해?", app: true },
        ]),
        childRow(2, { text: null, input: "dont_know" }),
        teacherRow(3, [{ en: "That's okay!", app: false }]),
        childRow(3, { text: null, input: "dont_know", nospeech: true }),
      ],
      { koMeaning: true },
    );
    expect(log.map((e) => e.who)).toEqual([
      "teacher",
      "child",
      "teacher",
      "child",
      "teacher",
      "child",
    ]);
    expect(log[0]).toMatchObject({
      who: "teacher",
      turnNo: 1,
      lines: [{ en: "How are you today?", ko: "오늘 기분 어때?" }],
    });
    expect(log[1]).toMatchObject({
      who: "child",
      said: { kind: "speech", text: "I'm good." },
    });
    expect(log[2]).toMatchObject({
      lines: [
        { en: "Great!", ko: "좋아!" },
        { en: "What do you do on Sunday?", ko: "일요일에 뭐 해?" },
      ],
    });
    expect(log[3]).toMatchObject({ said: { kind: "dont_know" } });
    expect(log[5]).toMatchObject({ said: { kind: "not_heard" } });
  });

  it("AC-15q 뜻은 1~4단계(koMeaning)만 남기고 5단계부터는 영어 줄만이다", () => {
    const log = talkLogOf(
      [teacherRow(2, [{ en: "Great!", ko: "좋아!", app: false }])],
      { koMeaning: false },
    );
    expect(log[0]).toMatchObject({ lines: [{ en: "Great!" }] });
    expect(
      (log[0] as Extract<TalkLogEntry, { who: "teacher" }>).lines[0],
    ).not.toHaveProperty("ko");
  });

  it("AC-15q 짧은 준비 · 정리 토막의 행은 기록 칸에 들지 않는다(정본 03 4절 '짧은 준비 · 바닥선 듣기 활동 화면에는 기록 칸이 없다')", () => {
    const log = talkLogOf(
      [
        teacherRow(1, [{ en: "Hi!", app: true }], "greeting"),
        teacherRow(2, [{ en: "Sunday.", app: true }], "prep"),
        teacherRow(3, [{ en: "Do you want to talk more?", app: true }]),
        childRow(3, {}, "more_talk"),
        teacherRow(4, [{ en: "Today we talked.", app: true }], "wrap_up"),
      ],
      { koMeaning: true },
    );
    expect(
      log.flatMap((e) =>
        e.who === "teacher" ? e.lines.map((l) => l.en) : [e.who],
      ),
    ).toEqual(["Hi!", "Do you want to talk more?", "child"]);
  });

  it("AC-15q 글이 빈 선생님 줄 · 빈 인식 글은 그리지 않고 같은 턴 번호가 겹쳐도 열쇠가 겹치지 않는다", () => {
    const log = talkLogOf(
      [
        teacherRow(2, [{ en: "  ", app: false }]),
        childRow(2, { text: " " }),
        childRow(2, { text: null, input: "dont_know" }),
        childRow(2, { text: null, input: "dont_know", nospeech: true }),
      ],
      { koMeaning: true },
    );
    expect(log.map((e) => e.who)).toEqual(["child", "child"]);
    expect(new Set(log.map((e) => e.key)).size).toBe(log.length);
  });

  it("AC-15q 이어 하기: talk_turns → 화면 자료(lessonLogOf) → 기록에 1~3단계 소리 줄(따라 할 말 · 선택지 · 받침의 답)이 글로 없다(T2)", () => {
    const row = (over: Partial<TalkTurnRow>): TalkTurnRow =>
      ({
        sessionId: "s",
        turnNo: 1,
        segment: "talk",
        speaker: "tori",
        text: "",
        inputMode: null,
        toriKo: null,
        clientListen: null,
        move: null,
        ...over,
      }) as TalkTurnRow;
    const rows = lessonLogOf(
      [
        row({
          turnNo: 2,
          text: "Good job! Listen and say!\nWhat do you do on Sunday?",
          toriKo: "잘했어! 듣고 말해 봐!",
          move: talkMoveOf({
            kind: "card_slot",
            item: { kind: "required", no: 1 },
            sound: {
              model: "I play soccer.",
              choices: ["I play soccer.", "I play games."],
              answer: "I go to the park.",
            },
          }),
        }),
        row({
          turnNo: 2,
          speaker: "child",
          text: "I play soccer.",
          inputMode: "speech",
        }),
      ],
      { card: CARD3, koMeaning: true },
    );
    const log = talkLogOf(rows, { koMeaning: true });
    const words = JSON.stringify(log);
    expect(words).not.toContain("I play games.");
    expect(words).not.toContain("I go to the park.");
    // 아이가 스스로 한 말(인식 글)은 남는다 — 선생님 쪽 줄에는 따라 할 말이 없다
    const teacher = log.filter((e) => e.who === "teacher");
    expect(JSON.stringify(teacher)).not.toContain("I play soccer.");
    expect(log.at(-1)).toMatchObject({
      who: "child",
      said: { kind: "speech", text: "I play soccer." },
    });
  });
});

describe("살아 있는 턴을 기록에 더하기", () => {
  it("AC-15q 지금 선생님 말풍선을 기록 줄로 바꿀 때 소리 줄은 빼고 화면 글 줄과 뜻만 남긴다(T2)", () => {
    const entry = liveTeacherEntryOf({
      turnNo: 4,
      koMeaning: true,
      content: {
        lines: [
          { t: "s", en: "Nice!" },
          { t: "s", en: "Listen and say!" },
          { t: "sound", kind: "model", say: "I play soccer." },
          {
            t: "sound",
            kind: "choices",
            answers: ["I play soccer.", "I play games."],
          },
          {
            t: "add",
            kind: "question",
            en: "What do you do on Sunday?",
            ko: "일요일에 뭐 해?",
          },
        ],
        ko: "좋아! 듣고 말해 봐!",
        done: true,
      },
    });
    expect(entry).toEqual({
      who: "teacher",
      key: "teacher:4",
      turnNo: 4,
      lines: [
        { en: "Nice! Listen and say!", ko: "좋아! 듣고 말해 봐!", app: false },
        { en: "What do you do on Sunday?", ko: "일요일에 뭐 해?", app: true },
      ],
    });
    expect(JSON.stringify(entry)).not.toContain("I play");
  });

  it("AC-15q 소리 줄뿐인 말풍선은 기록 줄이 없고 5단계부터는 뜻을 남기지 않는다", () => {
    expect(
      liveTeacherEntryOf({
        turnNo: 1,
        koMeaning: true,
        content: {
          lines: [{ t: "sound", kind: "answer", say: "I'm fine." }],
          done: true,
        },
      }),
    ).toBeNull();
    expect(
      liveTeacherEntryOf({
        turnNo: 1,
        koMeaning: false,
        content: { lines: [{ t: "s", en: "Hi!" }], ko: "안녕!", done: true },
      }),
    ).toEqual({
      who: "teacher",
      key: "teacher:1",
      turnNo: 1,
      lines: [{ en: "Hi!", app: false }],
    });
  });

  it("AC-15q 보낸 아이 말: 말은 인식 글, '잘 모르겠어요' 단추는 dont_know, 말소리 없음 '모름'은 not_heard, 빈 글은 없음", () => {
    expect(childSaidOfInput({ mode: "speech", text: " I like it. " })).toEqual({
      kind: "speech",
      text: "I like it.",
    });
    expect(childSaidOfInput({ mode: "dont_know" })).toEqual({
      kind: "dont_know",
    });
    expect(childSaidOfInput({ mode: "dont_know", nospeech: true })).toEqual({
      kind: "not_heard",
    });
    expect(childSaidOfInput({ mode: "speech", text: "" })).toBeNull();
  });

  it("AC-15q 1~3단계에서 기다리지 않고 바로 보낸 턴도 확인한 턴과 같이 기록 줄이 된다(정본 03 4절 '인식 확인' 행 '필수')", () => {
    const sent = { mode: "speech" as const, text: "I play soccer." };
    expect(childLogEntryOf(3, sent)).toEqual({
      who: "child",
      key: "child:3",
      turnNo: 3,
      said: { kind: "speech", text: "I play soccer." },
    });
    expect(childLogEntryOf(3, { mode: "dont_know", nospeech: true })).toEqual({
      who: "child",
      key: "child:3",
      turnNo: 3,
      said: { kind: "not_heard" },
    });
    expect(childLogEntryOf(3, { mode: "speech", text: " " })).toBeNull();
  });

  it("AC-15q 더하기는 같은 열쇠를 두 번 넣지 않는다(다시 흘림 · 다시 보내기)", () => {
    const a: TalkLogEntry = {
      who: "child",
      key: "child:2",
      turnNo: 2,
      said: { kind: "dont_know" },
    };
    const once = talkLogAppend([], a);
    expect(talkLogAppend(once, a)).toBe(once);
    expect(talkLogAppend(once, { ...a, key: "child:3" })).toHaveLength(2);
  });
});

describe("지난 선생님 말 다시 읽기(fix 1 M-1 — C125 · 정한 것 10)", () => {
  it("C125 지난 말은 문장마다 나눠 읽기 줄에 넣어 문장 사이 쉼이 들고, 앱이 붙인 줄은 card · 선생님 문장은 tori 다", () => {
    expect(
      talkLogReplayOf({
        who: "teacher",
        key: "teacher:4",
        turnNo: 4,
        lines: [
          { en: "Nice! Listen and say!", app: false },
          { en: "What do you do on Sunday?", app: true },
        ],
      }),
    ).toEqual([
      { text: "Nice!", w: "tori" },
      { text: "Listen and say!", w: "tori" },
      { text: "What do you do on Sunday?", w: "card" },
    ]);
  });

  it("AC-15q 다시 읽기에는 소리 줄이 없다 — 기록 줄에 소리 줄 글이 없기 때문이다(T2)", () => {
    const entry = liveTeacherEntryOf({
      turnNo: 2,
      koMeaning: true,
      content: {
        lines: [
          { t: "s", en: "Listen and say!" },
          { t: "sound", kind: "model", say: "I play soccer." },
        ],
      },
    });
    expect(entry).not.toBeNull();
    const texts = talkLogReplayOf(
      entry as Extract<TalkLogEntry, { who: "teacher" }>,
    ).map((i) => i.text);
    expect(texts).toEqual(["Listen and say!"]);
  });
});

describe("대화 기록 칸 TalkLog", () => {
  const entries: TalkLogEntry[] = [
    {
      who: "teacher",
      key: "teacher:1",
      turnNo: 1,
      lines: [{ en: "Hi, {NAME}!", ko: "안녕, {NAME}!", app: false }],
    },
    {
      who: "child",
      key: "child:1",
      turnNo: 1,
      said: { kind: "speech", text: "Hi!" },
    },
    { who: "child", key: "child:1#1", turnNo: 1, said: { kind: "dont_know" } },
    { who: "child", key: "child:1#2", turnNo: 1, said: { kind: "not_heard" } },
  ];
  const html = () =>
    renderToStaticMarkup(
      createElement(
        TalkLog,
        {
          entries,
          englishName: "Momo",
          teacherName: "미나",
          onReplay: () => {},
        },
        createElement("div", { "data-now": "" }, "지금 턴"),
      ),
    );

  it("AC-15q 기록 칸 표지(data-talk-log)가 있고 위로 넘겨 보는 칸이며 지금 턴은 맨 아래다", () => {
    const out = html();
    expect(out).toContain("data-talk-log");
    expect(out).toContain("overflow-y-auto");
    expect(out.indexOf("data-now")).toBeGreaterThan(out.lastIndexOf("Hi!"));
    expect(out.indexOf("data-now")).toBeGreaterThan(
      out.lastIndexOf("data-child-said"),
    );
  });

  it("fix 1 M-4 알림 칸(role log)은 지난 줄만 감싸고 흘러나오는 지금 턴은 알림 밖(aria-live off)이다", () => {
    const out = html();
    expect(out).not.toMatch(/data-talk-log=""[^>]*role="log"/);
    expect(out).toContain('role="log"');
    expect(out).toMatch(/data-talk-log-now=""[^>]*aria-live="off"/);
    // 지금 턴은 알림 칸이 닫힌 뒤에 온다
    const logClose = out.indexOf("</div>", out.lastIndexOf("data-child-said"));
    expect(out.indexOf("data-talk-log-now")).toBeGreaterThan(logClose);
  });

  it("AC-15q 지난 선생님 말은 누르는 단추('[이름] 말 다시 듣기')이고 {NAME} 은 영어 이름으로 채운다", () => {
    const out = html();
    expect(out).toContain('aria-label="미나 말 다시 듣기"');
    expect(out).toContain("data-talk-log-teacher");
    expect(out).toContain("Hi, Momo!");
    expect(out).toContain("안녕, Momo!");
    expect(out).not.toContain("{NAME}");
  });

  it("AC-15q 아이 말 · '잘 모르겠어요' · 회색 '못 들었어요'가 말풍선으로 남는다", () => {
    const out = html();
    expect(out).toContain('data-child-said="speech"');
    expect(out).toContain('data-child-said="dont_know"');
    expect(out).toContain("잘 모르겠어요");
    expect(out).toContain('data-child-said="not_heard"');
    expect(out).toContain("못 들었어요");
  });

  it("AC-15q '못 들었어요'는 회색 말풍선이고 영어 글 꼴이 아니다", () => {
    const out = renderToStaticMarkup(
      createElement(ChildBubble, { said: { kind: "not_heard" } }),
    );
    expect(out).toContain("border-ink-off-edge");
    expect(out).toContain("text-ink-soft");
    expect(out).not.toContain('lang="en"');
  });
});
