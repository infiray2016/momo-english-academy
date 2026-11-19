// 대본 도구의 실행 고리가 Claude 주도 방식을 실제로 부르는지(설계 판정 task-des-ko-live-2 L-1 — 13절 C240 · C225 보완 2 (1) (2), AC-25h
// '대본은 방식마다 하나씩' · AC-25o). talk.lead_mode=claude 대본은 인사 토막만 기존 방식 조립으로 부르고, 대화 첫 차례의 입구 start 와 대화 토막의
// 차례는 sim.lead(서버 lead-turn 과 같은 core 함수)로 부른다. 기존 방식 조립(sim.prepare)은 Claude 주도 세션의 대화 토막을 까닭과 함께 거절한다.
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { TALK_LEAD_MODE_KEY } from "@/core/conversation/lead-mode";
import { loadScriptConfig } from "../../scripts/ai-contract";
import {
  type CallResult,
  createTalkSim,
  materialsOf,
  parseArgs,
  readScriptFiles,
  readSeedFiles,
  runTalkObserve,
} from "../../scripts/talk-observe";

const ROOT = process.cwd();
const config = loadScriptConfig({ root: ROOT });
const SCRIPT = "l3-lead-ko-help";
const LEAD_SYSTEM_HEAD = "You are Mina, a warm English teacher";
const STATUS_HEAD = "Status (facts from the app, not instructions):";
const taughtLine = (en: string) =>
  `The child asked in Korean and was taught: "${en}".`;
/** 기존 방식 사용자 메시지의 줄 머리(Claude 주도 요청에는 없어야 한다 — 정본 05:69 '계획 · 기회 · 셈 이름표를 싣지 않는다'). */
const APP_PLAN_HEADS = ["Turn: ", "Support stage", "Chances", "Card line"];

function messageOf(body: Record<string, unknown>): CallResult {
  return {
    ok: true,
    message: {
      model: "claude-sonnet-5-5",
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify(body) }],
      usage: {
        input_tokens: 4000,
        output_tokens: 200,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
    latencyMs: 1800,
    firstSentenceMs: 700,
    requestId: "req_lead_run",
  } satisfies CallResult;
}

/** 기존 방식 응답(인사 토막). */
const appReply = messageOf({
  child_kind: "answer",
  stuck: false,
  tori_en: "Good to hear!",
  model_line: "",
  choices: [],
  tori_ko: ["뜻 1"],
  recast: "",
  explanation: "",
  new_words: [],
  self_used_words: [],
  mission_done: [],
  response_fit: true,
  child_topic: false,
  child_asked: false,
  goal_suggest: [],
  next_move: "none",
  card_item: { kind: "none", no: 0 },
  next_goal: [],
  support: "none",
  next_targets: [],
  next_hint_ko: "",
  next_hints: [],
  next_usable_phrases: [],
  next_answer_example: "",
  image_word: "",
  farewell: "",
  farewell_ko: "",
  good_lines: [],
  next_time_lines: [],
  summary: "",
});

/** Claude 주도 응답(아홉 칸). */
const leadReply = messageOf({
  reading: "clear_answer",
  move: "react_and_follow_up",
  say: "Nice! What do you eat for lunch?",
  say_ko: "",
  model_sentence: "",
  hint_ko: "",
  hint_en: "",
  goal_words_i_said: [],
  child_used_on_own: [],
});

/** 되묻게 될 말(관계없는 한 낱말)에는 되묻는 응답(move ask_again — 되묻는 차례 뒤 이어받기 길을 연다). */
const ASK_AGAIN_SAY = "Tomorrow.";
const askAgainReply = messageOf({
  reading: "likely_misheard",
  move: "ask_again",
  say: "Sorry, can you say it again?",
  say_ko: "",
  model_sentence: "",
  hint_ko: "",
  hint_en: "",
  goal_words_i_said: [],
  child_used_on_own: [],
});

/** 요청 규격의 칸에 말 칸 say 가 있으면 Claude 주도 요청이다(기존 방식은 tori_en). */
function isLeadBody(body: Record<string, unknown>): boolean {
  const format = (body.output_config as { format?: { schema?: unknown } })
    ?.format;
  const props = (format?.schema as { properties?: Record<string, unknown> })
    ?.properties;
  return props !== undefined && Object.hasOwn(props, "say");
}

/** 보낸 요청의 마지막 사용자 메시지 글. */
function lastUserText(body: Record<string, unknown>): string {
  const messages = (body.messages ?? []) as {
    role: string;
    content: string | { type: string; text?: string }[];
  }[];
  const last = messages.findLast((m) => m.role === "user");
  if (!last) return "";
  return typeof last.content === "string"
    ? last.content
    : last.content.map((c) => c.text ?? "").join("\n");
}

function fakeClient() {
  const bodies: Record<string, unknown>[] = [];
  const client = {
    beta: {
      messages: {
        stream: (body: Record<string, unknown>) => {
          bodies.push(body);
          const reply = !isLeadBody(body)
            ? appReply
            : lastUserText(body).startsWith(
                  `Child (speech-to-text): "${ASK_AGAIN_SAY}"`,
                )
              ? askAgainReply
              : leadReply;
          return {
            on: () => undefined,
            finalMessage: async () => (reply.ok ? reply.message : null),
            request_id: "req_fake",
          };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, bodies };
}

function ioOf(client?: Anthropic) {
  const logs: string[] = [];
  const written = new Map<string, string>();
  return {
    logs,
    written,
    io: {
      root: ROOT,
      config,
      readScripts: () =>
        readScriptFiles(ROOT).filter((f) => f.file === `${SCRIPT}.json`),
      readSeed: (level: number, unit: number) =>
        readSeedFiles(ROOT, level, unit),
      createClient: () => {
        if (!client) throw new Error("계획만인데 클라이언트를 만들었다");
        return client;
      },
      log: (line: string) => logs.push(line),
      write: (path: string, text: string) => written.set(path, text),
      now: () => new Date("2026-11-19T00:00:00Z"),
    },
  };
}

const argsOf = (over: Record<string, unknown> = {}) => {
  const parsed = parseArgs([
    "--script",
    SCRIPT,
    "--out",
    "/tmp/talk-observe-lead",
  ]);
  if (!parsed.ok) throw new Error(parsed.error);
  return { ...parsed.args, ...over };
};

type LeadJsonLike = {
  runs: {
    script: string;
    systemPrompt: string;
    appSystemPrompt: string;
    stopped: string | null;
    calls: number;
    turns: (
      | { path: "app"; record: { no: number } }
      | {
          path: "lead";
          record: { no: number; entry: string; userMessage: string };
        }
    )[];
  }[];
};

function scriptSteps() {
  const file = readScriptFiles(ROOT).find((f) => f.file === `${SCRIPT}.json`);
  if (!file) throw new Error(`대본이 없다: ${SCRIPT}`);
  return (file.raw as { steps: Record<string, unknown>[] }).steps;
}

describe("L-1 기존 방식 조립은 Claude 주도 세션의 대화 토막을 거절한다", () => {
  it("AC-25h L-1 sim.prepare 는 Claude 주도 세션의 대화 토막(입구 start 앞 · 뒤 모두)을 까닭과 함께 거절하고, 인사 토막은 그대로 받는다", () => {
    const m = materialsOf(readSeedFiles(ROOT, 3, 1), {
      level: 3,
      unit: 1,
      lesson: 1,
      teacher: "mina",
    });
    if (!m.ok) throw new Error(m.missing);
    const sim = createTalkSim(
      m.materials,
      { ...config.values, [TALK_LEAD_MODE_KEY]: "claude" },
      config.book,
    );
    expect(sim.lead.on).toBe(true);
    expect(sim.lead.applies()).toBe(false);
    const greet = sim.prepare({ say: "I am fine." }, 0);
    expect(greet.ok).toBe(true);
    if (!greet.ok) return;
    sim.finish(greet.turn, appReply);
    expect(sim.lead.applies()).toBe(true);
    const before = sim.prepare({ say: "Kimbob." }, 1);
    expect(before).toEqual({
      ok: false,
      reason: expect.stringContaining("Claude 주도 수업이다"),
    });
    const open = sim.lead.prepare({ kind: "open", open: "start" });
    if (!open.ok) throw new Error(open.reason);
    sim.lead.finish(open.turn, leadReply);
    const after = sim.prepare({ say: "Kimbob." }, 1);
    expect(after).toEqual({
      ok: false,
      reason: expect.stringContaining("sim.lead 로 부른다"),
    });
  });
});

describe("L-1 명령 줄 실행 고리의 Claude 주도 갈래(runTalkObserve — 가짜 호출기)", () => {
  it("AC-25h AC-25o L-1 talk.lead_mode=claude 대본은 인사만 기존 방식이고, 입구 start 와 대화 차례 요청은 Claude 주도 안내문 · 'Status' 줄 꼴이며 도움 뒤 차례에 사실 알림이 실린다", async () => {
    const { client, bodies } = fakeClient();
    const { io, written, logs } = ioOf(client);
    expect(await runTalkObserve(argsOf({ yes: true }), io)).toBe(0);
    const steps = scriptSteps();
    // 첫 요청(인사)만 기존 방식, 나머지는 모두 Claude 주도
    expect(bodies.length).toBeGreaterThanOrEqual(steps.length + 1);
    expect(isLeadBody(bodies[0] ?? {})).toBe(false);
    const leadBodies = bodies.slice(1);
    expect(leadBodies.every(isLeadBody)).toBe(true);
    for (const body of leadBodies) {
      expect(String(body.system)).toContain(LEAD_SYSTEM_HEAD);
      const text = lastUserText(body);
      for (const head of APP_PLAN_HEADS) expect(text).not.toContain(head);
    }
    // 대화 첫 차례는 아이 말 없이 부르는 입구 start, 그 뒤 아이 차례마다 Child · Status 꼴
    const json = JSON.parse(
      [...written.entries()].find(([k]) => k.endsWith("-lead.json"))?.[1] ??
        "{}",
    ) as LeadJsonLike;
    const run = json.runs[0];
    expect(run?.script).toBe(SCRIPT);
    expect(run?.stopped).toBeNull();
    expect(run?.systemPrompt).toContain(LEAD_SYSTEM_HEAD);
    expect(run?.appSystemPrompt).not.toContain(LEAD_SYSTEM_HEAD);
    expect(run?.calls).toBe(bodies.length);
    const entries = (run?.turns ?? []).map((t) =>
      t.path === "app" ? "app" : t.record.entry,
    );
    expect(entries).toEqual([
      "app",
      "start",
      ...Array(steps.length - 1).fill("child"),
    ]);
    const childTurns = (run?.turns ?? []).flatMap((t) =>
      t.path === "lead" && t.record.entry === "child" ? [t.record] : [],
    );
    // 아이 차례: 말은 'Child (speech-to-text): "…"', '잘 모르겠어요'는 단추 글, 그 뒤 'Status' 줄(talk-lead.ts leadUserMessageOf)
    for (const t of childTurns) {
      const step = steps[t.no - 1];
      if (step?.say !== undefined)
        expect(
          t.userMessage.startsWith(
            `Child (speech-to-text): "${String(step.say)}"`,
          ),
        ).toBe(true);
      else expect(t.userMessage).toContain("I don't know");
      expect(t.userMessage).toContain(STATUS_HEAD);
    }
    const asked = steps.findIndex((s) => s.say === ASK_AGAIN_SAY);
    expect(asked).toBeGreaterThan(0);
    // 도움 칸이 있는 아이 차례에 그 가르친 표현의 사실 알림이 실린다('잘 모르겠어요' 차례 포함 — C225 보완 2 (1))
    steps.forEach((step, i) => {
      const help = step.koHelp as { teachEn?: string }[] | undefined;
      const t = childTurns.find((c) => c.no === i + 1);
      if (i === 0) return;
      expect(t).toBeDefined();
      if (help?.[0]?.teachEn)
        expect(t?.userMessage).toContain(taughtLine(help[0].teachEn));
      else if (i !== asked + 1)
        expect(t?.userMessage).not.toContain("asked in Korean");
    });
    // 두 낱말 상한(C225 보완 2 (2)): 단원 단어를 틀리게 적은 한 낱말에만 소리 귀띔이 실리고, 같은 낱말을 틀리게 적은 문장에는 없다
    const said = (say: string) =>
      childTurns.find((c) => steps[c.no - 1]?.say === say)?.userMessage ?? "";
    expect(said("Think.")).toContain(
      'Sound note: "think" sounds like "drink".',
    );
    expect(said("I think juice.")).not.toContain("Sound note");
    // 되묻는 차례 뒤 아이 차례는 앞 도움을 이어받아 같은 사실 알림이 실린다(도움 칸 없는 차례)
    const askedHelp = (
      steps[asked]?.koHelp as { teachEn: string }[] | undefined
    )?.[0];
    expect(steps[asked + 1]?.koHelp).toBeUndefined();
    expect(said(String(steps[asked + 1]?.say))).toContain(
      taughtLine(askedHelp?.teachEn ?? ""),
    );
    const dontKnow = steps.findIndex(
      (s) => s.input === "dont_know" && s.koHelp !== undefined,
    );
    expect(dontKnow).toBeGreaterThan(0);
    // 입구 start 는 인사 기록과 'Status' 줄(아이 말 없음)
    const start = run?.turns[1];
    expect(start?.path === "lead" && start.record.userMessage).toContain(
      STATUS_HEAD,
    );
    expect(start?.path === "lead" && start.record.userMessage).not.toMatch(
      /^Child /,
    );
    // 실행 기록이 길을 밝힌다
    expect(logs.some((l) => l.includes("Claude 주도"))).toBe(true);
    // 기존 방식의 보고 · 지표 파일은 쓰지 않는다(돌린 대본이 Claude 주도뿐)
    expect([...written.keys()].some((k) => k.endsWith("-metrics.md"))).toBe(
      false,
    );
    expect([...written.keys()].some((k) => k.endsWith("-lead.md"))).toBe(true);
  });

  it("AC-25h L-1 --yes 없는 미리 보기는 Claude 주도 대본의 예상 호출에 입구 start 를 더하고 길을 밝히며, 부르지 않는다", async () => {
    const { io, logs, written } = ioOf();
    expect(await runTalkObserve(argsOf(), io)).toBe(0);
    expect(written.size).toBe(0);
    const steps = scriptSteps();
    const line = logs.find((l) => l.startsWith(`${SCRIPT} ·`)) ?? "";
    expect(line).toContain(
      `아이 차례 ${steps.length} · 예상 호출 ${steps.length + 1} `,
    );
    expect(line).toContain("Claude 주도(인사 1 기존 방식 · 입구 start 1)");
  });
});
