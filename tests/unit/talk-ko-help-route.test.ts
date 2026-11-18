// 수업 안 한국어 질문 끝점 POST /api/talk/ko-help 와 한국어 질문 길의 DB 없는 몫(수업 안 한국어로 묻기 plan 묶음 4-나 · 접점 다).
// 앞머리(같은 출처 403 · 본문 크기 413 · JSON 400)는 회화 턴 끝점과 같은 차례다. 접근 확인 자체는 access-gate.test.ts 가 본다.
// 길 전체(세션 상태 · 같은 시도 id · 행 하나 · 끄는 스위치 · ai_calls 행)는 통합 시험 tests/integration/talk-ko-help.test.ts(CI)가 본다.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TalkKoHelpOutput } from "@/core/ai/calls/talk-ko-help";
import type { AiOutcome } from "@/server/ai";
import { HINT_TIERS_MAX, TALK_TEXT_MAX } from "@/server/conversation";

const sameOrigin = vi.fn(() => true);
const access = vi.fn(async () => {});
const run = vi.fn(async (_raw: unknown): Promise<unknown> => ({ t: "stale" }));
vi.mock("@/server/access/guard", () => ({
  requireAccess: () => access(),
  isSameOrigin: () => sameOrigin(),
}));
vi.mock("@/server/conversation/ko-help", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/conversation/ko-help")>()),
  runTalkKoHelpRequest: (raw: unknown) => run(raw),
}));

const { POST } = await import("@/app/api/talk/ko-help/route");
const real = await vi.importActual<
  typeof import("@/server/conversation/ko-help")
>("@/server/conversation/ko-help");
const {
  koHelpAnswerOf,
  koHelpTeacherWordsOf,
  parseKoHelpRequest,
  runTalkKoHelpRequest,
} = real;

/** 본문 크기 상한보다 큰 머리글 값(시험 값). */
const TOO_LARGE = 1_000_000;
const SESSION = "00000000-0000-4000-8000-000000000001";
/** 시험용 질문 글(아이 이름 없음 — 로그에 새지 않는지 본다). */
const QUESTION = "조개는 영어로 뭐야?";

function request(headers: Record<string, string>, body = "{}") {
  return new Request("http://localhost/api/talk/ko-help", {
    method: "POST",
    headers: { origin: "http://localhost", host: "localhost", ...headers },
    body,
  }) as unknown as Parameters<typeof POST>[0];
}

const valid = {
  sessionId: SESSION,
  clientAttemptId: "ko-1",
  question: QUESTION,
  hint: { opened: 0 },
};

beforeEach(() => {
  sameOrigin.mockReturnValue(true);
  access.mockReset();
  access.mockResolvedValue(undefined);
  run.mockReset();
  run.mockResolvedValue({ t: "stale" });
});

describe("한국어 질문 끝점 앞머리(회화 턴 끝점과 같은 차례)", () => {
  it("한국어 질문 끝점: 접근 확인이 첫 문장이다 — 쿠키가 없어 던지면 출처 · 본문을 보지 않고 길을 부르지 않는다", async () => {
    access.mockRejectedValue(new Error("401"));
    const req = request({ "content-length": String(TOO_LARGE) });
    const read = vi.spyOn(req, "text");
    await expect(POST(req)).rejects.toThrow("401");
    expect(read).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("한국어 질문 끝점: 같은 출처가 아니면 403 이고 길을 부르지 않는다", async () => {
    sameOrigin.mockReturnValue(false);
    const response = await POST(request({}));
    expect(response.status).toBe(403);
    expect(run).not.toHaveBeenCalled();
  });

  it("한국어 질문 끝점: content-length 가 상한을 넘으면 본문을 읽기 전에 413 이다", async () => {
    const req = request({ "content-length": String(TOO_LARGE) });
    const read = vi.spyOn(req, "text");
    const response = await POST(req);
    expect(response.status).toBe(413);
    expect(read).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("한국어 질문 끝점: 본문이 JSON 이 아니면 400 이다", async () => {
    const response = await POST(request({}, "not json"));
    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it("한국어 질문 끝점: 함수 실행 시간 상한(maxDuration)은 회화 턴 끝점과 같다 — 호출 기다림 2 × realtime + 저장보다 넉넉히(검토 rev-b4b M-1)", async () => {
    const koHelp = await import("@/app/api/talk/ko-help/route");
    const turn = await import("@/app/api/talk/turn/route");
    expect(koHelp.maxDuration).toBeTypeOf("number");
    expect(koHelp.maxDuration).toBe(turn.maxDuration);
  });

  it("한국어 질문 끝점: 길의 응답을 JSON 한 번으로 그대로 돌려준다(흘려 받지 않는다)", async () => {
    run.mockResolvedValue({ t: "off" });
    const response = await POST(request({}, JSON.stringify(valid)));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ t: "off" });
    expect(run).toHaveBeenCalledWith(valid);
  });

  it("AC-N27 한국어 질문 끝점: 길이 던지면 error 이고 로그에는 오류 이름만 남는다(질문 글 없음)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    run.mockRejectedValue(new TypeError(QUESTION));
    const response = await POST(request({}, JSON.stringify(valid)));
    expect(await response.json()).toEqual({ t: "error" });
    const lines = log.mock.calls.map((c) => c.join(" "));
    expect(lines.join("\n")).toContain("TypeError");
    expect(lines.join("\n")).not.toContain(QUESTION);
    log.mockRestore();
  });
});

describe("한국어 질문 요청의 꼴(접점 다)", () => {
  it("한국어 질문 요청: 세션 · 시도 id · 질문 · 연 힌트 단 수 · 듣기 요약(선택)만 받는다", () => {
    expect(parseKoHelpRequest(valid)).toEqual(valid);
    expect(parseKoHelpRequest({ ...valid, extra: 1 })).toBeNull();
    expect(parseKoHelpRequest({ ...valid, sessionId: "x" })).toBeNull();
    expect(parseKoHelpRequest({ ...valid, question: "  " })).toBeNull();
    expect(parseKoHelpRequest({ ...valid, hint: { opened: -1 } })).toBeNull();
    expect(parseKoHelpRequest({ ...valid, hint: {} })).toBeNull();
  });

  it("한국어 질문 요청: 질문 글자 수 상한은 회화 턴의 아이 글(TALK_TEXT_MAX)과 같다", () => {
    expect(
      parseKoHelpRequest({ ...valid, question: "가".repeat(TALK_TEXT_MAX) }),
    ).not.toBeNull();
    expect(
      parseKoHelpRequest({
        ...valid,
        question: "가".repeat(TALK_TEXT_MAX + 1),
      }),
    ).toBeNull();
  });

  it("한국어 질문 요청: 연 힌트 단 수 상한은 회화 턴 요청과 같은 HINT_TIERS_MAX 다(상한 + 1 이면 받지 않는다 — 검토 rev-b4b I-1)", () => {
    expect(
      parseKoHelpRequest({ ...valid, hint: { opened: HINT_TIERS_MAX } }),
    ).not.toBeNull();
    expect(
      parseKoHelpRequest({ ...valid, hint: { opened: HINT_TIERS_MAX + 1 } }),
    ).toBeNull();
    expect(
      parseKoHelpRequest({ ...valid, hint: { opened: 4_000_000_000 } }),
    ).toBeNull();
  });

  it("AC-N27 한국어 질문 길: DB 가 실패하면 error 이고 로그에는 오류 이름만 남는다(질문 글 없음)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = new Proxy(
      {},
      {
        get: () => () => {
          throw new RangeError(QUESTION);
        },
      },
    ) as never;
    const reply = await runTalkKoHelpRequest(valid, {
      db,
      now: () => new Date(),
    });
    expect(reply).toEqual({ t: "error" });
    const lines = log.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(lines).toContain("RangeError");
    expect(lines).not.toContain(QUESTION);
    log.mockRestore();
  });

  it("한국어 질문 길: 꼴이 틀린 요청은 DB 에 닿지 않고 error 다", async () => {
    const db = new Proxy(
      {},
      {
        get: () => {
          throw new Error("DB 에 닿았다");
        },
      },
    ) as never;
    expect(
      await runTalkKoHelpRequest(
        { sessionId: SESSION },
        { db, now: () => new Date() },
      ),
    ).toEqual({ t: "error" });
  });
});

describe("선생님의 지금 말 · 소리 줄(세 방식 공통 — lessonCurrentOf 에서)", () => {
  const line = (en: string) => ({ en, app: false });

  it("한국어 도움 입력: 화면 글 줄 전체를 선생님의 지금 말로, 1~3단계 소리 줄(따라 할 말 · 선택지 · 답)을 소리 줄로 싣는다", () => {
    expect(
      koHelpTeacherWordsOf({
        lines: [line("Nice!"), { en: "What do you like?", app: true }],
        sound: { choices: ["I like cats.", "I like dogs."] },
      }),
    ).toEqual({
      teacherLine: "Nice! What do you like?",
      soundLine: "I like cats. / I like dogs.",
    });
  });

  it("한국어 도움 입력: 새 엔진 · 이야기 방식 행의 소리 줄(leadSound)은 그 줄의 말을 쓴다", () => {
    expect(
      koHelpTeacherWordsOf({
        lines: [line("Say it with me.")],
        sound: null,
        leadSound: [{ t: "sound", kind: "model", say: "I went to the beach." }],
      }),
    ).toEqual({
      teacherLine: "Say it with me.",
      soundLine: "I went to the beach.",
    });
  });

  it("AC-27m 한국어 도움 입력: 물음이 없는 차례에서도 선생님의 지금 말(화면 글)이 빈 글이 아니다", () => {
    expect(
      koHelpTeacherWordsOf({ lines: [line("Cool, me too.")], sound: null })
        .teacherLine,
    ).toBe("Cool, me too.");
  });

  it("한국어 도움 입력: 화면 글이 빈 차례에는 선생님의 지금 말도 비우고 소리 줄은 소리 줄로만 싣는다(이미 보인 글로 치지 않는다 — 설계 4 [N-4], 검토 rev-b4b M-2)", () => {
    expect(
      koHelpTeacherWordsOf({ lines: [], sound: { model: "I like it." } }),
    ).toEqual({ teacherLine: "", soundLine: "I like it." });
    expect(
      koHelpTeacherWordsOf({
        lines: [line("  ")],
        sound: null,
        leadSound: [{ t: "sound", kind: "model", say: "I went to the beach." }],
      }),
    ).toEqual({ teacherLine: "", soundLine: "I went to the beach." });
  });
});

describe("호출 결과 → 채울 값(설계 4 검사와 대신 처리)", () => {
  const lines = {
    call_failed: ["실패 줄 하나", "실패 줄 둘"],
    check_blocked: ["걸림 줄 하나", "걸림 줄 둘"],
  };
  const input = {
    teachShown: false,
    teacherLine: "What did you find at the beach?",
    openedHints: [],
    check: {
      allowedWords: new Set(["i", "found", "a"]),
      lemmaOf: () => undefined,
      metaPhrases: [],
    },
    unitWords: ["beach"],
    teacher: { nameEn: "Mina", personaEn: "" },
    sentenceMaxWords: 6,
  } as Parameters<typeof koHelpAnswerOf>[1];
  const ok = (value: TalkKoHelpOutput): AiOutcome<TalkKoHelpOutput> => ({
    ok: true,
    value,
    normalized: false,
    checked: false,
  });

  it("AC-25g 호출 실패 · 거절 · 타임아웃 · 설정 문제는 호출 실패 꼴의 대신 줄이고 갈래가 없으며, 줄은 그 차례의 순번으로 돌린다", () => {
    for (const reason of ["timeout", "refusal", "config", "invalid"] as const) {
      const answer = koHelpAnswerOf({ ok: false, reason, refusals: 0 }, input, {
        lines,
        seq: 1,
      });
      expect(answer).toEqual({
        kind: null,
        sayKo: "실패 줄 둘",
        teachEn: "",
        shownEn: [],
        textShown: false,
        outOfRange: 0,
        fallback: "call_failed",
      });
    }
    expect(
      koHelpAnswerOf({ ok: false, reason: "timeout", refusals: 0 }, input, {
        lines,
        seq: 2,
      }).sayKo,
    ).toBe("실패 줄 하나");
  });

  it("AC-25g 검사가 답을 비운 값은 검사 걸림 꼴의 대신 줄이고 모델이 낸 갈래는 남긴다", () => {
    const answer = koHelpAnswerOf(
      ok({ kind: "expression", say_ko: "", teach_en: "" }),
      input,
      { lines, seq: 1 },
    );
    expect(answer).toMatchObject({
      kind: "expression",
      sayKo: "걸림 줄 둘",
      teachEn: "",
      fallback: "check_blocked",
    });
  });

  it("AC-25g 지난 답은 검사 뒤 값 그대로다(1~3단계 표현은 글로 보이지 않고 가르친 표현은 읽기 재료로만 남는다)", () => {
    const answer = koHelpAnswerOf(
      ok({
        kind: "expression",
        say_ko: "이렇게 말하면 돼. 잘 듣고 따라 해 봐.",
        teach_en: "I found a shell.",
      }),
      input,
      { lines, seq: 1 },
    );
    expect(answer).toEqual({
      kind: "expression",
      sayKo: "이렇게 말하면 돼. 잘 듣고 따라 해 봐.",
      teachEn: "I found a shell.",
      shownEn: [],
      textShown: false,
      outOfRange: 1,
      fallback: "none",
    });
  });
});
