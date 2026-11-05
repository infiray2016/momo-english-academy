// 회화 턴 요청 · NDJSON 읽기(plan-p13b 파일별 값 10 · C92 · 재검토 N-1 · 회화 plan 묶음 11 · 12). 가짜 fetch 로 줄을 조각 경계에서 나눠 흘린다.
// 묶음 12 가 옛 이름(sendTalkTurn · sendTalkTurnRetrying)을 지우며 읽기 · 되풀이 시험을 새 이름(sendTalkLessonTurn(Retrying))과 새 꼴 끝 줄로 옮겼다.
import { describe, expect, it, vi } from "vitest";
import {
  OFFLINE_RETRIES_MAX,
  OFFLINE_RETRY_MS,
  STALE_RESENDS_MAX,
  STALE_RETRY_MS,
  sendTalkLessonTurn,
  sendTalkLessonTurnRetrying,
  type TalkLessonStreamHandlers,
  type TalkTurnBody,
} from "@/lib/talk-stream";

const BODY: TalkTurnBody = {
  sessionId: "00000000-0000-4000-8000-000000000001",
  clientAttemptId: "turn-1",
  input: { mode: "speech", text: "I like it." },
  hint: { opened: 0, heard: [] },
};

function streamOf(chunks: string[], { cutAtEnd = false } = {}) {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[i];
      i += 1;
      if (chunk !== undefined) controller.enqueue(encoder.encode(chunk));
      else if (cutAtEnd) controller.error(new TypeError("network error"));
      else controller.close();
    },
  });
}

function fetchOf(response: Response | Error) {
  return vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
}

function handlers() {
  const seen: string[] = [];
  const h: TalkLessonStreamHandlers = {
    onSentence: (en) => seen.push(`s:${en}`),
    onKo: (ko) => seen.push(`ko:${ko}`),
    onAdd: (line) => seen.push(`add:${line.kind}`),
    onSound: (line) => seen.push(`sound:${line.kind}`),
    onEnd: (next) => seen.push(`end:${next.talkCount}`),
    onResting: () => seen.push("resting"),
    onBreak: (line) => seen.push(`break:${line.en}`),
    onClose: (line) => seen.push(`close:${line.reason}`),
    onError: () => seen.push("error"),
  };
  return { h, seen };
}

/** 끝 줄(새 꼴 lesson 칸 — '말 주고받기 2'). */
const END = JSON.stringify({
  t: "end",
  lesson: {
    segment: "talk",
    greetingDone: true,
    talkCount: 2,
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
  },
});

describe("회화 턴 요청(talk-stream)", () => {
  it("회화 턴 요청: 조각 경계에서 나뉜 NDJSON 줄을 차례대로 갈래마다 넘기고 같은 출처 POST 로 보낸다", async () => {
    const lines = [
      JSON.stringify({ t: "s", en: "Nice!" }),
      JSON.stringify({ t: "ko", ko: "좋아!" }),
      JSON.stringify({ t: "add", kind: "question", en: "What is it?" }),
      END,
    ].join("\n");
    const cut = Math.floor(lines.length / 3);
    const fetchImpl = fetchOf(
      new Response(
        streamOf([
          lines.slice(0, cut),
          lines.slice(cut, cut * 2),
          `${lines.slice(cut * 2)}\n`,
        ]),
      ),
    );
    const { h, seen } = handlers();
    expect(await sendTalkLessonTurn(BODY, h, { fetchImpl })).toBe("done");
    expect(seen).toEqual(["s:Nice!", "ko:좋아!", "add:question", "end:2"]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/talk/turn");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(BODY);
  });

  it("회화 턴 요청: 줄을 하나도 받기 전에 끊기거나 끝 줄 없이 끊기면 offline 이다(같은 시도 id 로 다시 보낼 차례)", async () => {
    const { h, seen } = handlers();
    expect(
      await sendTalkLessonTurn(BODY, h, {
        fetchImpl: fetchOf(new TypeError("x")),
      }),
    ).toBe("offline");
    expect(
      await sendTalkLessonTurn(BODY, h, {
        fetchImpl: fetchOf(
          new Response(
            streamOf([`${JSON.stringify({ t: "s", en: "Hi!" })}\n`], {
              cutAtEnd: true,
            }),
          ),
        ),
      }),
    ).toBe("offline");
    expect(seen).toEqual(["s:Hi!"]);
  });

  it("회화 턴 요청: 끝 줄 갈래(쉼 · 쉬어 감 · 닫힘 · 다시 읽기 · 오류)를 넘기고 HTTP 오류는 error 다", async () => {
    for (const [line, mark] of [
      [{ t: "resting" }, "resting"],
      [
        { t: "break", en: "Oops, I need a little break!" },
        "break:Oops, I need a little break!",
      ],
      [
        { t: "close", reason: "safety", farewell: { en: "Bye!" } },
        "close:safety",
      ],
      [{ t: "error" }, "error"],
    ] as const) {
      const { h, seen } = handlers();
      expect(
        await sendTalkLessonTurn(BODY, h, {
          fetchImpl: fetchOf(
            new Response(streamOf([`${JSON.stringify(line)}\n`])),
          ),
        }),
      ).toBe("done");
      expect(seen).toEqual([mark]);
    }
    const { h, seen } = handlers();
    expect(
      await sendTalkLessonTurn(BODY, h, {
        fetchImpl: fetchOf(new Response("{}", { status: 403 })),
      }),
    ).toBe("done");
    expect(seen).toEqual(["error"]);
  });
});

/** 응답 차례대로 돌려주는 가짜 fetch(Error 면 던짐). */
function fetchSeq(responses: (() => Response | Error)[]) {
  let i = 0;
  return vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const next = responses[Math.min(i, responses.length - 1)];
    i += 1;
    if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
    const out = next?.();
    if (out instanceof Error) throw out;
    if (!out) throw new Error("응답 없음");
    return out;
  });
}
const lineResponse = (line: unknown) => () =>
  new Response(streamOf([`${JSON.stringify(line)}\n`]));

describe("회화 턴 되풀이(재검토 N-1 · 코드 검토 I-1 · I-2)", () => {
  it("회화 턴 요청: 끊겼는데 브라우저가 온라인이면 기다렸다 같은 시도 id 로 다시 보내고 오프라인이면 online 을 기다리게 돌려준다", async () => {
    const waits: number[] = [];
    const fetchImpl = fetchSeq([
      () => new TypeError("cut"),
      lineResponse({ t: "s", en: "Hi!" }),
      () => new Response(streamOf([END, "\n"])),
    ]);
    const { h, seen } = handlers();
    const attempts: number[] = [];
    const out = await sendTalkLessonTurnRetrying(BODY, h, {
      fetchImpl,
      isOnline: () => true,
      wait: async (ms) => {
        waits.push(ms);
      },
      refresh: () => {},
      onAttempt: (n) => attempts.push(n),
    });
    expect(out).toBe("done");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    for (const [, init] of fetchImpl.mock.calls as unknown as [
      string,
      RequestInit,
    ][])
      expect(JSON.parse(String(init.body)).clientAttemptId).toBe(
        BODY.clientAttemptId,
      );
    expect(waits).toEqual([OFFLINE_RETRY_MS, OFFLINE_RETRY_MS]);
    expect(attempts).toEqual([0, 1, 2]);
    expect(seen).toEqual(["s:Hi!", "end:2"]);

    const offline = await sendTalkLessonTurnRetrying(BODY, handlers().h, {
      fetchImpl: fetchSeq([() => new TypeError("cut")]),
      isOnline: () => false,
      wait: async () => {},
      refresh: () => {},
    });
    expect(offline).toBe("offline");
  });

  it("회화 턴 요청: 온라인 끊김 다시 보내기는 상한까지이고 그 뒤 offline 이다", async () => {
    const fetchImpl = fetchSeq([() => new TypeError("cut")]);
    const out = await sendTalkLessonTurnRetrying(BODY, handlers().h, {
      fetchImpl,
      isOnline: () => true,
      wait: async () => {},
      refresh: () => {},
    });
    expect(out).toBe("offline");
    expect(fetchImpl).toHaveBeenCalledTimes(OFFLINE_RETRIES_MAX + 1);
  });

  it("회화 턴 요청: stale 이면 바로 되풀이하지 않고 기다렸다 자료를 다시 읽고 판이 같으면(틀이 그대로면) 같은 시도 id 로 다시 보낸다", async () => {
    const order: string[] = [];
    const fetchImpl = fetchSeq([
      lineResponse({ t: "stale" }),
      lineResponse({ t: "stale" }),
      () =>
        new Response(
          streamOf([`${JSON.stringify({ t: "s", en: "Ok!" })}\n${END}\n`]),
        ),
    ]);
    const { h, seen } = handlers();
    const out = await sendTalkLessonTurnRetrying(BODY, h, {
      fetchImpl,
      isOnline: () => true,
      wait: async (ms) => {
        order.push(`wait:${ms}`);
      },
      refresh: () => order.push("refresh"),
    });
    expect(out).toBe("done");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(order).toEqual([
      `wait:${STALE_RETRY_MS}`,
      "refresh",
      `wait:${STALE_RETRY_MS}`,
      `wait:${STALE_RETRY_MS}`,
      "refresh",
      `wait:${STALE_RETRY_MS}`,
    ]);
    // stale 은 처리기로 가지 않는다(되풀이가 다룸)
    expect(seen).toEqual(["s:Ok!", "end:2"]);
  });

  it("회화 턴 요청: 자료를 다시 읽어 틀이 바뀌면(끊음 신호) 되풀이를 멈추고 stale 되풀이는 상한까지다", async () => {
    const controller = new AbortController();
    const fetchImpl = fetchSeq([lineResponse({ t: "stale" })]);
    const out = await sendTalkLessonTurnRetrying(BODY, handlers().h, {
      fetchImpl,
      signal: controller.signal,
      isOnline: () => true,
      wait: async () => {},
      refresh: () => controller.abort(),
    });
    expect(out).toBe("aborted");
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const many = fetchSeq([lineResponse({ t: "stale" })]);
    const gaveUp = await sendTalkLessonTurnRetrying(BODY, handlers().h, {
      fetchImpl: many,
      isOnline: () => true,
      wait: async () => {},
      refresh: () => {},
    });
    expect(gaveUp).toBe("offline");
    expect(many).toHaveBeenCalledTimes(STALE_RESENDS_MAX + 1);
  });

  it("회화 턴 요청: 끊음 신호로 멈춘 요청은 offline 이 아니라 aborted 이고 처리기를 더 부르지 않는다", async () => {
    const controller = new AbortController();
    const seen: string[] = [];
    const h: TalkLessonStreamHandlers = {
      ...handlers().h,
      onSentence: (en) => {
        seen.push(`s:${en}`);
        // 화면이 떠남('홈') — 뒤 줄은 처리기로 가지 않는다
        controller.abort();
      },
      onAdd: (line) => seen.push(`add:${line.kind}`),
      onEnd: () => seen.push("end"),
    };
    const out = await sendTalkLessonTurnRetrying(BODY, h, {
      fetchImpl: fetchSeq([
        () =>
          new Response(
            streamOf([
              `${JSON.stringify({ t: "s", en: "One." })}\n`,
              `${JSON.stringify({ t: "add", kind: "question", en: "Two?" })}\n`,
              `${END}\n`,
            ]),
          ),
      ]),
      signal: controller.signal,
      isOnline: () => true,
      wait: async () => {},
      refresh: () => {},
    });
    expect(out).toBe("aborted");
    expect(seen).toEqual(["s:One."]);
  });
});

// ── 새 꼴 턴 줄(회화 plan 묶음 11 — TalkLessonLine: sound 줄 · 끝 줄 lesson 칸) ──

function lessonHandlers() {
  const seen: string[] = [];
  const h: TalkLessonStreamHandlers = {
    onSentence: (en) => seen.push(`s:${en}`),
    onKo: (ko) => seen.push(`ko:${ko}`),
    onAdd: (line) => seen.push(`add:${line.kind}:${line.en}`),
    onSound: (line) =>
      seen.push(
        `sound:${line.kind}:${line.kind === "choices" ? line.answers.join("|") : line.say}`,
      ),
    onEnd: (next) => seen.push(`end:${next.talkCount}:${next.segment}`),
    onResting: () => seen.push("resting"),
    onBreak: (line) => seen.push(`break:${line.en}`),
    onClose: (line) => seen.push(`close:${line.reason}`),
    onError: () => seen.push("error"),
  };
  return { h, seen };
}

const LESSON_END = JSON.stringify({
  t: "end",
  lesson: {
    segment: "talk",
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
  },
});

describe("새 꼴 회화 턴 요청(talk-stream — 묶음 11)", () => {
  it("AC-15q 새 꼴 턴 줄: 문장 · 뜻 · 소리 줄(따라 할 말 · 선택지 · 받침의 답) · 붙인 줄 · 끝 줄(lesson)을 받은 차례대로 넘긴다", async () => {
    const lines = [
      JSON.stringify({ t: "s", en: "Good job!" }),
      JSON.stringify({ t: "ko", ko: "잘했어!" }),
      JSON.stringify({ t: "sound", kind: "model", say: "The beach." }),
      JSON.stringify({ t: "sound", kind: "choices", answers: ["Yes.", "No."] }),
      JSON.stringify({ t: "sound", kind: "answer", say: "I like the sea." }),
      JSON.stringify({
        t: "add",
        kind: "question",
        en: "Do you like the sea?",
      }),
      LESSON_END,
    ].join("\n");
    const cut = Math.floor(lines.length / 2);
    const fetchImpl = fetchOf(
      new Response(streamOf([lines.slice(0, cut), `${lines.slice(cut)}\n`])),
    );
    const { h, seen } = lessonHandlers();
    expect(await sendTalkLessonTurn(BODY, h, { fetchImpl })).toBe("done");
    expect(seen).toEqual([
      "s:Good job!",
      "ko:잘했어!",
      "sound:model:The beach.",
      "sound:choices:Yes.|No.",
      "sound:answer:I like the sea.",
      "add:question:Do you like the sea?",
      "end:3:talk",
    ]);
  });

  it("새 꼴 턴 줄: 끝 줄 갈래(쉼 · 쉬어 감 · 닫힘 · 오류)를 넘기고 끝 줄 없이 끊기면 offline, stale 은 되풀이가 같은 시도 id 로 다시 보낸다", async () => {
    for (const [line, want] of [
      [{ t: "resting" }, "resting"],
      [{ t: "break", en: "Oops!" }, "break:Oops!"],
      [
        { t: "close", reason: "safety", farewell: { en: "Bye!" } },
        "close:safety",
      ],
      [{ t: "error" }, "error"],
    ] as const) {
      const { h, seen } = lessonHandlers();
      const fetchImpl = fetchOf(
        new Response(streamOf([`${JSON.stringify(line)}\n`])),
      );
      expect(await sendTalkLessonTurn(BODY, h, { fetchImpl })).toBe("done");
      expect(seen).toEqual([want]);
    }
    const cut = lessonHandlers();
    expect(
      await sendTalkLessonTurn(BODY, cut.h, {
        fetchImpl: fetchOf(
          new Response(streamOf([`${JSON.stringify({ t: "s", en: "Hi" })}\n`])),
        ),
      }),
    ).toBe("offline");
    // stale → 기다렸다 자료를 다시 읽고 같은 본문으로 다시 → 끝 줄
    const responses = [
      new Response(streamOf([`${JSON.stringify({ t: "stale" })}\n`])),
      new Response(streamOf([`${LESSON_END}\n`])),
    ];
    const fetchImpl = vi.fn(async () => responses.shift() as Response);
    const refresh = vi.fn();
    const { h, seen } = lessonHandlers();
    expect(
      await sendTalkLessonTurnRetrying(BODY, h, {
        fetchImpl,
        refresh,
        isOnline: () => true,
        wait: async () => {},
      }),
    ).toBe("done");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(seen).toEqual(["end:3:talk"]);
  });
});
