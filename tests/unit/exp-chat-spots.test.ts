// 켜기 전 관문 (나) 자리 재현 도구(scripts/exp/chat-spots.ts)의 가짜 실행 시험(plan 'G 의 차례' (나) · spec 설계 13 '자리 재현 실호출').
// 가짜 응답으로 대본 일곱 벌을 돌려 열여섯 자리마다 그 자리의 조건(마무리 사실 줄 · 조용함 둘 · 알림 세 갈래 · 따라 할 문장 듦 · 어긋남 ·
// {NAME} 가림 …)이 실제로 걸렸는지 본다. 자리에 닿지 못한 대본은 판정이 실패하는지도 본다. AI · DB · 네트워크를 쓰지 않는다.
import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_CALLS,
  livePlanOf,
  MESSAGE_TEXT,
  NAME_SLOT,
  parseSpotArgs,
  planGate,
  runAllSpots,
  runSpotScript,
  SPOT_CHILD_NAME,
  SPOT_DRIFT_CONDITION,
  SPOT_IDS,
  SPOT_LABELS,
  SPOT_SCRIPTS,
  type SpotEnv,
  type SpotId,
  type SpotResult,
  type SpotScript,
  type SpotScriptRun,
  screensOf,
  scriptLogsOf,
  spotEnvOf,
  spotsMarkdown,
  spotsOf,
} from "../../scripts/exp/chat-spots";
import {
  createFakeAnthropic,
  messageBody,
} from "../fixtures/ai/fake-anthropic";
import { SAMPLE_NAMES } from "../fixtures/ai/sample-inputs";

let env: SpotEnv;
let runs: Map<string, SpotScriptRun>;
let spots: SpotResult[];

const spotOf = (id: SpotId) => spots.find((s) => s.id === id) as SpotResult;
const scriptOf = (name: string) =>
  SPOT_SCRIPTS.find((s) => s.name === name) as SpotScript;

beforeAll(async () => {
  env = spotEnvOf();
  runs = await runAllSpots(env);
  spots = spotsOf(runs);
}, 60_000);

describe("G (나) 자리 재현 — 가짜 실행에서 열여섯 자리에 닿는다", () => {
  it("자리는 열여섯이고 이름은 spec 설계 13 의 차례다(한국어 도움 뒤는 K 로 미룸)", () => {
    expect(SPOT_IDS).toHaveLength(16);
    expect(spots.map((s) => s.id)).toEqual([...SPOT_IDS]);
    expect(Object.values(SPOT_LABELS).join(" ")).not.toContain("한국어 도움");
  });

  it.each(SPOT_IDS.map((id) => [id]))("%s: 조건이 모두 섰다", (id) => {
    const spot = spotOf(id as SpotId);
    const failed = spot.conditions.filter((c) => !c.ok).map((c) => c.name);
    expect(failed).toEqual([]);
    expect(spot.turns.length).toBeGreaterThan(0);
    expect(spot.reached).toBe(true);
  });

  it("가짜 실행은 실호출을 하지 않는다(모든 호출이 가짜)", () => {
    const calls = [...runs.values()].flatMap((r) => r.calls);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((c) => !c.live)).toBe(true);
    expect(calls.every((c) => c.ok)).toBe(true);
  });

  it("마무리 차례: 마무리 사실 줄이 사용자 메시지에 들고 두 단추 차례이며, 물음 없는 말에는 앱이 물음을 붙인다", () => {
    const t = spotOf("closing").turns[0];
    expect(t?.userMessage).toContain(MESSAGE_TEXT.closing);
    expect(t?.app.turnEnd).toBe("closing");
    expect(t?.lines.some((l) => l.t === "add")).toBe(true);
    expect(t?.shown.some((l) => l.startsWith("두 단추"))).toBe(true);
  });

  it("조용함 입구가 둘 잇달아 가고 셋째는 호출 없는 기다림이다", () => {
    const quiet = spotOf("quiet_twice").turns;
    expect(quiet.map((t) => t.entry)).toEqual(["quiet", "quiet"]);
    expect(quiet[1]?.no).toBe((quiet[0]?.no ?? 0) + 1);
    expect(quiet.every((t) => t.userMessage === MESSAGE_TEXT.quiet)).toBe(true);
    const wait = spotOf("wait_after_cap");
    expect(wait.call).toBe("none");
    expect(wait.liveCalls).toBe(0);
    expect(wait.turns[0]?.calls).toEqual([]);
  });

  it("인식기 알림 줄의 세 갈래: 다른 후보 있음 · 없음 · 중간 결과만(끔이면 없음, 켬이면 첫 꼴)", () => {
    const [alt, low, off, on] = spotOf("recognizer").turns;
    expect(alt?.app.recognizerNote).toBe("alternative");
    expect(alt?.userMessage).toContain(
      `${MESSAGE_TEXT.unsureAlt} "I see the sea."`,
    );
    expect(low?.app.recognizerNote).toBe("unsure");
    expect(off?.script).toBe("partial-off");
    expect(off?.app.recognizerNote).toBeNull();
    expect(on?.script).toBe("partial-on");
    expect(on?.userMessage.endsWith(MESSAGE_TEXT.unsure)).toBe(true);
  });

  it("따라 할 문장: say 에 들면 글에서 빠져 소리 줄, 어긋나면 글 그대로(기록만)", () => {
    const [inSay, miss] = spotOf("listen_sentence").turns;
    expect(inSay?.app.listen).toEqual({
      sentence: "I eat rice with egg.",
      inSay: true,
    });
    expect(inSay?.lines).toContainEqual({
      t: "sound",
      kind: "model",
      say: "I eat rice with egg.",
    });
    expect(
      inSay?.lines.some((l) => l.t === "s" && l.en.includes("I eat rice")),
    ).toBe(false);
    expect(miss?.app.listen?.inSay).toBe(false);
    expect(miss?.lines.some((l) => l.t === "sound")).toBe(false);
  });

  it("막힌 뒤: or 물음은 소리 줄로 빠지고, 설명 요청이 한 번 가서 설명 글이 나온다", () => {
    const choice = spotOf("stuck_choice").turns[0];
    expect(choice?.userMessage).toBe(MESSAGE_TEXT.dontKnow);
    expect(choice?.lines).toContainEqual({
      t: "sound",
      kind: "answer",
      say: "Do you eat rice or bread?",
    });
    const explain = spotOf("stuck_explain");
    expect(explain.call).toBe("explain");
    expect(explain.turns[0]?.calls.map((c) => c.kind)).toEqual([
      "dialog",
      "explain",
    ]);
  });

  it("힌트: 질문 없는 차례에도 힌트가 나오고, 틀 재료가 없는 차례는 두 단(뜻 · 문장)이다", () => {
    const noQ = spotOf("hint_no_question").turns[0];
    expect(noQ?.calls[0]?.kind).toBe("hint");
    expect(noQ?.app.hintTiers).toEqual(["ko", "frame", "sentence"]);
    const noFrame = spotOf("hint_no_frame").turns[0];
    expect(noFrame?.app.hintTiers).toEqual(["ko", "sentence"]);
    // 둘째 단은 저장된 단 — 힌트 호출은 한 번뿐
    expect(noFrame?.calls.filter((c) => c.kind === "hint")).toHaveLength(1);
  });

  it("{NAME} 가림: 보낸 글 · 결과 JSON · 화면 자료 · 읽는 글 어디에도 시험용 가짜 이름이 없다", () => {
    const t = spotOf("name_mask").turns[0];
    expect(t?.userMessage).toBe(
      `Child (speech-to-text): "My name is ${NAME_SLOT}."`,
    );
    const all = JSON.stringify({
      spots,
      screens: screensOf(spots, runs),
      md: spotsMarkdown(spots, false),
    });
    expect(all).not.toContain(SPOT_CHILD_NAME);
    expect(all).not.toContain(SAMPLE_NAMES.displayName);
  });

  it("돌아옴 차례는 선생님 말을 따로 남긴다(m-3)", () => {
    const t = spotOf("back").turns[0];
    expect(t?.userMessage).toBe(MESSAGE_TEXT.back);
    expect(t?.teacherSay).toBe("You did great! What is your name?");
  });

  it("안전 상한 차례: 사실 줄 · 닫는 줄, 마무리 · 짧은 준비 줄은 붙지 않는다", () => {
    const t = spotOf("safety_last").turns[0];
    expect(t?.userMessage).toContain(MESSAGE_TEXT.lastTurn);
    expect(t?.userMessage).not.toContain(MESSAGE_TEXT.closing);
    expect(t?.shown.some((l) => l.startsWith("닫는 줄"))).toBe(true);
    expect(t?.app.signal).toBeNull();
  });
});

describe("G (나) 자리 재현 — 자리에 닿지 못한 대본은 실패한다", () => {
  it("조용함 차례를 뺀 대본은 조용함 둘 · 상한 뒤 기다림에 닿지 못한다", async () => {
    const base = scriptOf("opening");
    const cut: SpotScript = {
      ...base,
      steps: base.steps.filter((s) => s.input !== "quiet"),
    };
    const run = await runSpotScript(env, cut);
    const broken = spotsOf(new Map([...runs, ["opening", run]]));
    const of = (id: SpotId) => broken.find((s) => s.id === id);
    expect(of("quiet_twice")?.reached).toBe(false);
    expect(of("wait_after_cap")?.reached).toBe(false);
    expect(of("first_words")?.reached).toBe(true);
  });

  it("따라 할 문장이 say 에 없는 응답만 있으면 'say 에 듦' 조건이 서지 않는다", async () => {
    const base = scriptOf("help");
    const dialog = base.dialog.map((r) =>
      r.spot === "listen_sentence"
        ? { ...r, answer: { ...r.answer, listen_sentence: "I drink milk." } }
        : r,
    );
    const run = await runSpotScript(env, { ...base, dialog });
    const broken = spotsOf(new Map([...runs, ["help", run]]));
    const listen = broken.find((s) => s.id === "listen_sentence");
    expect(listen?.reached).toBe(false);
    expect(listen?.conditions.find((c) => !c.ok)?.name).toContain("say 에 듦");
  });

  it("wrap_up 이 서지 않아도 그 자리의 차례(사용자 메시지 · 응답 원문)는 결과에 남고 '닿지 못함'과 까닭이 붙는다(검토 I-1)", async () => {
    const base = scriptOf("wrap");
    const dialog = base.dialog.map((r) =>
      r.spot === "wrap_after_suggestion"
        ? { ...r, answer: { ...r.answer, wrap_up: false } }
        : r,
    );
    const run = await runSpotScript(env, { ...base, dialog });
    const broken = spotsOf(new Map([...runs, ["wrap", run]]));
    const wrap = broken.find(
      (s) => s.id === "wrap_after_suggestion",
    ) as SpotResult;
    expect(wrap.reached).toBe(false);
    expect(wrap.turns.length).toBeGreaterThan(0);
    expect(wrap.turns[0]?.userMessage).toContain("I have to go now. Bye!");
    expect(wrap.turns[0]?.raw).toContain("It was fun to talk with you.");
    expect(wrap.why).toContain(
      "선생님이 맺은 차례(wrap_up → 마무리 제안)가 있다",
    );
    // 화면 자료도 닿지 못함으로 내고(빈 화면 통과가 아님), 읽는 글 표에도 까닭이 남는다
    const screen = screensOf(broken, new Map([...runs, ["wrap", run]])).find(
      (s) => s.id === "wrap_after_suggestion",
    );
    expect(screen?.reached).toBe(false);
    expect(screen?.why.length).toBeGreaterThan(0);
    expect(screen?.trigger).not.toBe("none");
    expect(screen?.expect.length).toBeGreaterThan(0);
    expect(spotsMarkdown(broken, false)).toContain(
      "닿지 못함 — 선생님이 맺은 차례",
    );
  });

  it("차례가 하나도 없는 자리의 화면 자료는 trigger missing 이고 닿지 못함이다(장면이 통과로 찍지 않음)", async () => {
    const base = scriptOf("opening");
    const run = await runSpotScript(env, {
      ...base,
      steps: base.steps.filter((s) => s.input !== "quiet"),
    });
    const broken = new Map([...runs, ["opening", run]]);
    const screen = screensOf(spotsOf(broken), broken).find(
      (s) => s.id === "quiet_twice",
    );
    expect(screen?.trigger).toBe("missing");
    expect(screen?.reached).toBe(false);
    expect(screen?.why).toContain("차례 없음");
  });

  it("대본별 호출 기록 전부(갈래 · 자리 · 실호출 여부 · 사용자 메시지 · 응답 원문 · 나간 글)를 결과에 쓴다", () => {
    const logs = scriptLogsOf(runs);
    expect(logs.map((l) => l.script)).toEqual(SPOT_SCRIPTS.map((s) => s.name));
    const callCount = logs.reduce(
      (n, l) => n + l.turns.reduce((m, t) => m + t.calls.length, 0),
      0,
    );
    expect(callCount).toBe(
      [...runs.values()].reduce((n, r) => n + r.calls.length, 0),
    );
    const wrap = logs.find((l) => l.script === "wrap");
    const tagged = wrap?.turns.find((t) =>
      t.calls.some((c) => c.spot === "wrap_after_suggestion"),
    );
    expect(tagged?.calls[0]).toMatchObject({
      kind: "dialog",
      live: false,
      ok: true,
    });
    expect(tagged?.calls[0]?.userMessage).toContain("I have to go now.");
    expect(tagged?.calls[0]?.raw).toContain("wrap_up");
    expect(tagged?.shown.length).toBeGreaterThan(0);
  });

  it("마무리 앞 채움 응답은 되풀이 세 줄이 아니고 서로 다르며, 읽는 글 머리가 앞 차례는 대본 글임을 알린다(검토 M-2)", () => {
    const closing = runs.get("closing") as SpotScriptRun;
    const fills = closing.calls
      .filter((c) => c.kind === "dialog" && c.spot === null)
      .map((c) => c.raw);
    expect(fills.length).toBeGreaterThan(10);
    expect(new Set(fills).size).toBe(fills.length);
    expect(spotsMarkdown(spots, true)).toContain(
      "자리 표지가 없는 앞 차례의 선생님 말은 대본 글(가짜 응답)",
    );
  });

  it("중간 결과만 켬 · 끔을 바꿔 넣으면 인식기 알림 조건이 서지 않는다", () => {
    const swapped = new Map(runs);
    swapped.set("partial-on", runs.get("partial-off") as SpotScriptRun);
    swapped.set("partial-off", runs.get("partial-on") as SpotScriptRun);
    expect(spotsOf(swapped).find((s) => s.id === "recognizer")?.reached).toBe(
      false,
    );
  });
});

describe("G (나) 자리 재현 — 실호출의 문 · 화면 자료", () => {
  it("실호출 계획은 자리 표지 호출만 센다(대화 17 · 힌트 · 설명 3) — 기본 상한 안", () => {
    const plan = livePlanOf(runs);
    expect(plan).toMatchObject({ dialog: 17, help: 3, total: 20 });
    expect(plan.usd).toBeGreaterThan(0);
    expect(plan.total).toBeLessThanOrEqual(DEFAULT_MAX_CALLS);
    expect(spots.reduce((n, s) => n + s.liveCalls, 0)).toBe(plan.total);
  });

  it("인자: 기본은 가짜 · 상한 30, --max-calls 는 0 이상 정수만, 모르는 인자는 던진다", () => {
    expect(parseSpotArgs([])).toMatchObject({
      live: false,
      maxCalls: DEFAULT_MAX_CALLS,
    });
    expect(parseSpotArgs(["--live", "--max-calls", "5"])).toMatchObject({
      live: true,
      maxCalls: 5,
    });
    expect(() => parseSpotArgs(["--max-calls", "-1"])).toThrow();
    expect(() => parseSpotArgs(["--yes"])).toThrow();
  });

  it("저장소의 가짜 결과 묶음(브라우저 점검 장면 chat-spots 의 기본 자료)은 가짜 실행의 화면 자료와 같다", () => {
    const fixture = JSON.parse(
      readFileSync(
        `${process.cwd()}/tests/browser-check/fixtures/chat-spots-fake.json`,
        "utf8",
      ),
    ) as { live: boolean; screens: unknown };
    expect(fixture.live).toBe(false);
    expect(fixture.screens).toEqual(
      JSON.parse(JSON.stringify(screensOf(spots, runs))),
    );
  });

  it("가짜 실행의 화면 자료는 모두 닿음이고, 들리지 않음 자리는 말소리 없음으로 연다(대역 모름 단추가 아님 — 검토 M-3)", () => {
    const screens = screensOf(spots, runs);
    expect(screens.every((s) => s.reached && s.why.length === 0)).toBe(true);
    expect(screens.find((s) => s.id === "not_heard")?.trigger).toBe("nospeech");
  });

  it("화면 자료는 자리마다 차례를 여는 방법과 화면에 보여야 할 글이 있다", () => {
    const screens = screensOf(spots, runs);
    expect(screens.map((s) => s.id)).toEqual([...SPOT_IDS]);
    for (const s of screens) expect(s.expect.length).toBeGreaterThan(0);
    const of = (id: SpotId) => screens.find((s) => s.id === id);
    expect(of("first_words")?.trigger).toBe("initial");
    expect(of("quiet_twice")?.replies).toHaveLength(2);
    expect(of("wait_after_cap")?.trigger).toBe("none");
    expect(of("hint_no_frame")?.hints).toHaveLength(2);
    // 힌트 자리는 앞 선생님 차례에서 단만 연다(아이 말 · 새 차례 없음 — 앱과 같은 차례)
    expect(of("hint_no_question")?.trigger).toBe("hint");
    expect(of("hint_no_frame")?.trigger).toBe("hint");
    expect(of("hint_no_frame")?.replies).toEqual([]);
    expect(of("hint_no_frame")?.before.lines).toContainEqual({
      t: "s",
      en: "What do you drink?",
    });
    expect(of("stuck_explain")?.explain).toMatchObject({ ok: true });
    expect(of("wrap_after_suggestion")?.wrap?.length).toBeGreaterThan(0);
    expect(of("safety_last")?.replies[0]?.close?.en).toContain(NAME_SLOT);
    expect(of("name_mask")?.heard).toBe(`My name is ${NAME_SLOT}.`);
  });
});

/** 실호출 흉내: 두 번째 가짜 클라이언트를 live 로 넘긴다(네트워크 없음 — 검토 M-4, 검토용 흉내 live-sim.mts 바탕). */
function liveFakeOf(opts: { hintFailOnce?: boolean } = {}) {
  const fake = createFakeAnthropic([]);
  const help = {
    when: { bodyIncludes: '"hint_ko"' },
    reply: {
      kind: "stream" as const,
      body: messageBody({
        model: "claude-sonnet-5-5",
        json: {
          hint_ko: "나는 우유를 마셔요.",
          hint_en: "I drink milk.",
          explain_ko: "선생님이 물었어요.",
        },
      }),
      chunks: 2,
    },
  };
  // 힌트 · 설명은 같은 꼴의 요청이다 — help 대본의 첫 요청(차례 2 의 설명)은 받고, 둘째(차례 4 의 첫 힌트)만 한 번 실패시킨다
  if (opts.hintFailOnce === true) {
    fake.push({ ...help, times: 1 });
    fake.push({
      when: help.when,
      reply: {
        kind: "error",
        status: 500,
        body: { type: "error", error: { type: "api_error", message: "x" } },
      },
      times: 1,
    });
  }
  fake.push(help);
  fake.push({
    reply: {
      kind: "stream",
      body: messageBody({
        model: "claude-sonnet-5-5",
        json: {
          listen_sentence: "",
          say: "Okay. What do you like to do?",
          say_ko: "좋아. 뭐 하는 거 좋아해?",
          wrap_up: false,
        },
      }),
      chunks: 2,
    },
  });
  const client = new Anthropic({
    apiKey: "fake-key",
    authToken: null,
    maxRetries: 0,
    fetch: fake.fetch as unknown as typeof fetch,
  });
  return { fake, client };
}

describe("G (나) 자리 재현 — 실호출 길(두 번째 가짜 클라이언트로 흉내)", () => {
  let live: Map<string, SpotScriptRun>;
  let liveSpots: SpotResult[];
  let liveRequests: number;

  beforeAll(async () => {
    const { fake, client } = liveFakeOf();
    live = await runAllSpots(env, { live: client });
    liveSpots = spotsOf(live);
    liveRequests = fake.requests.length;
  }, 60_000);

  it("실호출 클라이언트로 간 요청 수가 계획 수와 같고, 자리 표지 호출만 실호출이다", () => {
    expect(liveRequests).toBe(livePlanOf(runs).total);
    for (const r of live.values())
      for (const c of r.calls) expect(c.live).toBe(c.spot !== null);
  });

  it("표지 차례의 (대본 · 차례 · 입구 · 갈래)가 가짜 실행과 같다(자리 밀림 조건이 선다)", () => {
    const tagsOf = (m: Map<string, SpotScriptRun>) =>
      scriptLogsOf(m).flatMap((l) =>
        l.turns.flatMap((t) =>
          t.calls
            .filter((c) => c.spot !== null)
            .map((c) => `${l.script}#${t.no}${t.entry}:${c.kind}:${c.spot}`),
        ),
      );
    expect(tagsOf(live)).toEqual(tagsOf(runs));
    for (const s of liveSpots)
      expect(
        s.conditions.find((c) => c.name === SPOT_DRIFT_CONDITION)?.ok,
      ).toBe(true);
  });

  it("실호출 응답이 자리 조건을 세우지 않아도 그 자리의 차례 · 실호출 응답이 결과에 남는다(I-1)", () => {
    const wrap = liveSpots.find(
      (s) => s.id === "wrap_after_suggestion",
    ) as SpotResult;
    expect(wrap.reached).toBe(false);
    expect(wrap.turns[0]?.calls).toEqual([
      { kind: "dialog", live: true, ok: true },
    ]);
    expect(wrap.turns[0]?.raw).toContain("What do you like to do?");
    const screen = screensOf(liveSpots, live).find(
      (s) => s.id === "wrap_after_suggestion",
    );
    expect(screen?.reached).toBe(false);
    expect(screen?.trigger).toBe("speech");
  });

  it("힌트가 한 번 실패해 다시 받기를 해도 다음 자리의 표지를 먹지 않는다(검토 M-1)", async () => {
    const { fake, client } = liveFakeOf({ hintFailOnce: true });
    const help = await runSpotScript(env, scriptOf("help"), { live: client });
    const ref = runs.get("help") as SpotScriptRun;
    // 다시 받기 한 번만큼 요청이 더 간다(계획의 최악 수 안)
    const helpPlan = livePlanOf(new Map([["help", ref]]), 1);
    expect(fake.requests.length).toBe(helpPlan.total + 1);
    expect(fake.requests.length).toBeLessThanOrEqual(helpPlan.worst);
    const at = (r: SpotScriptRun, spot: SpotId) =>
      r.run.turns.find((_, i) =>
        (r.turnCalls[i] ?? []).some((c) => c.spot === spot),
      )?.no;
    expect(at(help, "hint_no_frame")).toBe(at(ref, "hint_no_frame"));
    expect(at(help, "hint_no_question")).toBe(at(ref, "hint_no_question"));
    const noQ = help.turnCalls.find((cs) =>
      cs.some((c) => c.spot === "hint_no_question"),
    );
    expect(
      noQ?.filter((c) => c.kind === "hint").map((c) => [c.spot, c.ok]),
    ).toEqual([
      ["hint_no_question", false],
      ["hint_no_question", true],
    ]);
  });

  it("상한 문: 최악 수(다시 받기 포함)가 --max-calls 를 넘으면 부르지 않는다", () => {
    const plan = livePlanOf(runs, 1);
    expect(plan.worst).toBe(plan.total + plan.retryExtra);
    expect(plan.retryExtra).toBe(2);
    expect(planGate(plan, plan.worst).ok).toBe(true);
    expect(planGate(plan, plan.worst - 1).ok).toBe(false);
    expect(planGate(plan, DEFAULT_MAX_CALLS).ok).toBe(true);
  });
});
