// 회화 새 엔진의 아이 말 없는 요청(묶음 S3 — 'Claude 주도' spec 설계 3 · 8 · 13절 C241): 턴 요청 입력 꼴(turn.ts parseTalkTurnRequest)과
// 화면의 판단(talk-frame.tsx lessonMoveActionOf · leadOpenBodyOf), 새 엔진 차례가 흘리는 줄을 지금 말풍선이 받는지(tori.tsx — 바꾸지 않음).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TALK_MODE_TEXT, TalkModePanel } from "@/app/dev/talk-mode/talk-mode";
import {
  leadOpenBodyOf,
  lessonAfterEndOf,
  lessonCloseActionOf,
  lessonMoveActionOf,
  submitPlanOf,
} from "@/components/conversation/talk-frame";
import {
  LESSON_BUBBLE_START,
  type LessonBubbleContent,
  lessonBubbleStep,
  lessonShownEnglishOf,
  lessonSoundsOf,
  lessonSpeakItemsOf,
} from "@/components/conversation/tori";
import { MORE_PROMPT } from "@/core/conversation/spoken";
import {
  sendTalkLessonTurn,
  type TalkLessonStreamHandlers,
  type TalkTurnBody,
} from "@/lib/talk-stream";
import { parseTalkTurnRequest } from "@/server/conversation/turn";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));

const SESSION = "6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f";

/** 지금 화면이 보내는 아이 말 요청(talk-frame onChildSend 꼴). */
const childBody = {
  sessionId: SESSION,
  clientAttemptId: "a1",
  input: { mode: "speech", text: "I like apples." },
  hint: { opened: 0, heard: [] },
  listenEndSeconds: 1.2,
  prevPerceivedWaitMs: 900,
};

describe("턴 요청 입력 꼴(turn.ts parseTalkTurnRequest)", () => {
  it("AC-26c 아이 말 요청은 지금 꼴 그대로 받고 값도 그대로다", () => {
    expect(parseTalkTurnRequest(childBody)).toEqual({
      kind: "child",
      request: childBody,
    });
    const dontKnow = {
      sessionId: SESSION,
      clientAttemptId: "a2",
      input: { mode: "dont_know", nospeech: true },
      hint: { opened: 2, heard: ["two_answers"] },
    };
    expect(parseTalkTurnRequest(dontKnow)).toEqual({
      kind: "child",
      request: dontKnow,
    });
  });

  it("AC-26c 대화 토막의 첫 차례 · '더 이야기하기' 뒤 차례는 수업 id 와 입구 하나로 받는다", () => {
    expect(parseTalkTurnRequest({ sessionId: SESSION, lead: "start" })).toEqual(
      { kind: "open", request: { sessionId: SESSION, open: "start" } },
    );
    expect(parseTalkTurnRequest({ sessionId: SESSION, lead: "more" })).toEqual({
      kind: "open",
      request: { sessionId: SESSION, open: "more" },
    });
  });

  it("AC-26c 아이 말 없는 요청 꼴은 다른 칸 · 다른 입구 · 틀린 수업 id 를 받지 않는다", () => {
    for (const bad of [
      { sessionId: SESSION, lead: "end" },
      { sessionId: SESSION, lead: "more", clientAttemptId: "a1" },
      {
        sessionId: SESSION,
        lead: "start",
        hint: { opened: 0, heard: [] },
      },
      { sessionId: "not-a-uuid", lead: "start" },
      { lead: "start" },
    ])
      expect(parseTalkTurnRequest(bad)).toBeNull();
  });

  it("AC-26c 새 꼴을 더해도 아이 말 요청의 검증은 느슨해지지 않는다", () => {
    const { hint: _hint, ...noHint } = childBody;
    for (const bad of [
      noHint,
      { ...childBody, lead: "start" },
      { ...childBody, input: { mode: "more" } },
      { ...childBody, input: { mode: "speech", text: "x".repeat(10_000) } },
      { ...childBody, extra: true },
      { sessionId: SESSION, clientAttemptId: "a1", lead: "more" },
      null,
      "start",
    ])
      expect(parseTalkTurnRequest(bad)).toBeNull();
  });
});

describe("화면의 판단(talk-frame.tsx)", () => {
  it("AC-26c 신호가 없는 응답(기존 방식)은 지금처럼 화면에 둔다", () => {
    expect(lessonMoveActionOf({}, null)).toEqual({ kind: "move" });
    expect(lessonMoveActionOf({ leadTurn: undefined }, "more")).toEqual({
      kind: "move",
    });
  });

  it("AC-26c 토막 넘김의 start · '더 이야기하기'의 more 신호면 그 입구를 부른다", () => {
    expect(lessonMoveActionOf({ leadTurn: "start" }, null)).toEqual({
      kind: "lead",
      open: "start",
    });
    expect(lessonMoveActionOf({ leadTurn: "more" }, null)).toEqual({
      kind: "lead",
      open: "more",
    });
  });

  it("AC-26c 같은 입구를 보내는 중이면 다시 보내지 않는다(연타로 액션이 두 번 돌아옴)", () => {
    expect(lessonMoveActionOf({ leadTurn: "more" }, "more")).toEqual({
      kind: "skip",
    });
    expect(lessonMoveActionOf({ leadTurn: "start" }, "start")).toEqual({
      kind: "skip",
    });
  });

  it("AC-26c 아이 말 없는 요청 본문은 서버 꼴과 맞는다", () => {
    for (const open of ["start", "more"] as const) {
      const body = leadOpenBodyOf(SESSION, open);
      expect(body).toEqual({ sessionId: SESSION, lead: open });
      expect(parseTalkTurnRequest(JSON.parse(JSON.stringify(body)))).toEqual({
        kind: "open",
        request: { sessionId: SESSION, open },
      });
    }
  });

  it("AC-26c 새 엔진 차례의 끝 줄도 지금 판단 그대로 다음 할 일을 정한다(마무리 차례면 두 단추, 아니면 아이 차례)", () => {
    const base: Parameters<typeof lessonAfterEndOf>[0] = {
      choice: null,
      prep: null,
      firstQuestionDue: false,
      segment: "talk",
      greetingDone: true,
    };
    expect(lessonAfterEndOf(base)).toEqual({ kind: "child" });
    expect(lessonAfterEndOf({ ...base, choice: "closing" })).toEqual({
      kind: "choice",
    });
    expect(
      lessonAfterEndOf({ ...base, segment: "more_talk", choice: "suggestion" }),
    ).toEqual({ kind: "choice" });
  });
});

describe("턴 요청 보내기의 갈림(talk-frame.tsx submitPlanOf — 검토 rev-s3 M-1 · M-4)", () => {
  const lead = leadOpenBodyOf(SESSION, "more");
  /** 화면이 보내는 아이 말 요청(onChildSend 꼴). */
  const child: TalkTurnBody = {
    sessionId: SESSION,
    clientAttemptId: "a1",
    input: { mode: "speech", text: "I like apples." },
    hint: { opened: 0, heard: [] },
  };

  it("AC-26c 아이 말 요청은 처음 보냄 · 다시 보냄 모두 읽기 줄을 끊고 체감 대기를 잰다(지금 동작 그대로)", () => {
    for (const send of ["first", "again"] as const)
      expect(submitPlanOf(child, send)).toEqual({
        cancelReading: true,
        measurePerceived: true,
      });
  });

  it("AC-26c 아이 말 없는 요청을 신호로 처음 보낼 때는 앞 말풍선을 읽는 중일 수 있어 끊지 않고, 체감 대기를 재지 않는다", () => {
    expect(submitPlanOf(lead, "first")).toEqual({
      cancelReading: false,
      measurePerceived: false,
    });
    expect(submitPlanOf(leadOpenBodyOf(SESSION, "start"), "first")).toEqual({
      cancelReading: false,
      measurePerceived: false,
    });
  });

  it("AC-26c 아이 말 없는 요청을 다시 보낼 때(다시 해 보기 · 연결이 돌아옴 · 쉬는 중이 풀림)는 실패한 시도의 문장을 두 번 듣지 않게 읽기 줄을 끊고, 체감 대기는 재지 않는다", () => {
    expect(submitPlanOf(lead, "again")).toEqual({
      cancelReading: true,
      measurePerceived: false,
    });
  });
});

describe("닫는 줄을 받은 화면의 처리(talk-frame.tsx lessonCloseActionOf)", () => {
  /** S1 고침 2 의 입구 more + 'AI 쉬는 중'이 내는 닫는 줄(lead-turn.ts — 수업을 정리로 닫은 뒤 정리 줄 · 끝인사). */
  const moreRestingClose = {
    t: "close",
    reason: "resting",
    lines: [
      {
        en: "You talked about cats today.",
        ko: "오늘 고양이 이야기를 했어요.",
      },
    ],
    farewell: { en: "See you next time!", ko: "다음에 또 만나요!" },
  } as const;

  it("AC-26c '더 이야기하기' 뒤 입구가 쉬는 중이면 오는 닫는 줄(close resting · 정리 줄 있음)을 화면 처리기가 받아 정리로 간다", async () => {
    const closed: unknown[] = [];
    const fetchImpl = (async () =>
      new Response(`${JSON.stringify(moreRestingClose)}\n`)) as typeof fetch;
    await sendTalkLessonTurn(
      leadOpenBodyOf(SESSION, "more"),
      {
        onSentence: () => {},
        onKo: () => {},
        onAdd: () => {},
        onSound: () => {},
        onEnd: () => {},
        onResting: () => {},
        onBreak: () => {},
        onClose: (line) => closed.push(line),
        onError: () => {},
      },
      { fetchImpl },
    );
    expect(closed).toEqual([moreRestingClose]);
    expect(
      lessonCloseActionOf(
        closed[0] as Parameters<typeof lessonCloseActionOf>[0],
      ),
    ).toBe("wrap");
  });

  it("AC-26c 정리 줄이 없는 쉬는 중 닫기 · 안전 닫기는 지금처럼 끝인사로 닫는다", () => {
    const farewell = { en: "Bye!" };
    expect(
      lessonCloseActionOf({ t: "close", reason: "resting", farewell }),
    ).toBe("closed");
    expect(
      lessonCloseActionOf({
        t: "close",
        reason: "resting",
        lines: [],
        farewell,
      }),
    ).toBe("closed");
    expect(
      lessonCloseActionOf({
        t: "close",
        reason: "safety",
        lines: [{ en: "x" }],
        farewell,
      }),
    ).toBe("closed");
  });
});

describe("새 엔진 차례의 줄을 지금 말풍선이 받는다(tori.tsx 그대로)", () => {
  /** 서버가 흘리는 차례대로 쌓는다(talk-frame submit 의 처리기와 같은 쌓기). */
  function bubbleOf(
    lines: readonly ({ t: string } & Record<string, unknown>)[],
  ): LessonBubbleContent {
    return lines.reduce(
      (b, l) => lessonBubbleStep(b, l),
      LESSON_BUBBLE_START as LessonBubbleContent,
    );
  }

  it("AC-26m 1~3단계 따라 할 문장은 글에 없고 소리 줄 하나로 받아 눌러 들을 수 있다(글 뒤 자리)", () => {
    const b = bubbleOf([
      { t: "s", en: "Grass, yes!" },
      { t: "ko", ko: "그래, 풀!" },
      { t: "sound", kind: "model", say: "I see grass." },
    ]);
    expect(lessonShownEnglishOf(b)).toEqual(["Grass, yes!"]);
    expect(lessonShownEnglishOf(b).join(" ")).not.toContain("I see grass");
    expect(lessonSoundsOf(b)).toEqual([
      { t: "sound", kind: "model", say: "I see grass." },
    ]);
    // 소리 줄은 글 뒤(첫 판 자리 — plan 확인할 것 4)
    expect(b.lines.map((l) => l.t)).toEqual(["s", "sound"]);
    expect(lessonSpeakItemsOf(b.lines[1] as never, 3, 1)).toEqual([
      { text: "I see grass.", w: "sound", line: 1 },
    ]);
  });

  it("AC-26m 막힌 뒤 고르기 물음은 소리 줄(answer) 하나로 받아 듣기 단추 하나가 된다", () => {
    const b = bubbleOf([
      { t: "s", en: "Okay!" },
      { t: "sound", kind: "answer", say: "Watch TV, or go outside?" },
    ]);
    expect(lessonShownEnglishOf(b)).toEqual(["Okay!"]);
    expect(lessonSoundsOf(b)).toHaveLength(1);
    expect(lessonSpeakItemsOf(b.lines[1] as never, 2, 1)).toEqual([
      { text: "Watch TV, or go outside?", w: "sound", line: 1 },
    ]);
  });

  it("AC-26m 마무리 차례의 상수 물음은 지금 붙인 화면 글 줄로 받고 읽는다", () => {
    const b = bubbleOf([
      { t: "s", en: "You did great today." },
      { t: "add", kind: "more_prompt", en: MORE_PROMPT.en },
    ]);
    expect(lessonShownEnglishOf(b)).toEqual([
      "You did great today.",
      MORE_PROMPT.en,
    ]);
    expect(lessonSpeakItemsOf(b.lines[1] as never, 3)).toEqual([
      { text: MORE_PROMPT.en, w: "card" },
    ]);
  });
});

describe("개발용 전환 쪽의 안내(talk-mode.tsx)", () => {
  it("AC-26o 새 방식이 도는 단원의 안내 한 줄이 보이고 단원 번호를 적지 않는다(13절 C241 보완)", () => {
    for (const mode of ["app", "claude", null] as const) {
      const html = renderToStaticMarkup(
        createElement(TalkModePanel, {
          mode,
          busy: false,
          line: null,
          onPick: () => {},
        }),
      );
      expect(html).toContain(TALK_MODE_TEXT.scope);
      expect(html).toContain(TALK_MODE_TEXT.notice);
    }
    expect(TALK_MODE_TEXT.scope).not.toMatch(/[0-9]/);
    expect(TALK_MODE_TEXT.scope).toContain("안내문");
    expect(TALK_MODE_TEXT.scope).toContain("기존 방식");
  });

  it("AC-26o 안내는 고른 값을 드러낸다(새 방식을 골라도 안내문이 없는 단원은 기존 방식 — 검토 rev-s3 M-2)", () => {
    expect(TALK_MODE_TEXT.scope).toBe(
      "새 방식은 안내문이 준비된 단원에서만 돌아요. 그 밖의 단원 수업은 새 방식을 골라도 기존 방식으로 열려요.",
    );
    expect(TALK_MODE_TEXT.scope).not.toContain("새 방식이어도");
  });
});

describe("턴 요청 보내기(talk-stream.ts — 형만 넓힘)", () => {
  const handlers: TalkLessonStreamHandlers = {
    onSentence: () => {},
    onKo: () => {},
    onAdd: () => {},
    onSound: () => {},
    onEnd: () => {},
    onResting: () => {},
    onBreak: () => {},
    onClose: () => {},
    onError: () => {},
  };
  /** 끝 줄 하나만 흘리는 가짜 fetch(보낸 본문을 받아 둔다). */
  function fakeFetch() {
    const sent: string[] = [];
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      sent.push(String(init?.body));
      return new Response(`${JSON.stringify({ t: "stale" })}\n`);
    }) as typeof fetch;
    return { sent, fetchImpl };
  }

  it("AC-26c 아이 말 요청의 본문은 지금과 같고, 아이 말 없는 요청은 수업 id 와 입구 하나만 보낸다", async () => {
    const child: TalkTurnBody = {
      sessionId: SESSION,
      clientAttemptId: "a1",
      input: { mode: "speech", text: "I like apples." },
      hint: { opened: 0, heard: [] },
    };
    const a = fakeFetch();
    await sendTalkLessonTurn(child, handlers, { fetchImpl: a.fetchImpl });
    expect(a.sent).toEqual([JSON.stringify(child)]);
    const b = fakeFetch();
    await sendTalkLessonTurn(leadOpenBodyOf(SESSION, "more"), handlers, {
      fetchImpl: b.fetchImpl,
    });
    expect(b.sent).toEqual([
      JSON.stringify({ sessionId: SESSION, lead: "more" }),
    ]);
  });
});
