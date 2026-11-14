// 회화 이야기 방식(intent 2026-11-13-회화-대화-구조-R, plan 묶음 S0)의 실호출 표본 도구. 앱의 호출 조각을 그대로 써서 두 가지를 잰다.
//   turns: AC-2 — 3단계 단원 1 · 미나로 대화 호출 열 차례(앱의 흘려 받기 streamTalkChat · 앞 칸 차례의 규격). 차례마다 Zod(엄격 규격) 통과 ·
//          따라 할 문장이 빈 차례와 찬 차례의 첫 문장 시간 · 토큰을 적는다. 대화 기록은 앱처럼 보낸 사용자 메시지 + 기록 글(assistant)로 잇는다.
//   hints: AC-7 — 힌트 호출 표본 열다섯(질문 든 차례 · 질문 없는 차례 · 막힌 뒤 각 다섯). 호출 지연(누름부터 글까지 · 끝 줄부터 설명까지의 어림),
//          만든 단 수와 종류 · 영어 힌트 글을 적는다. --context 4,6,10 이면 talk.chat_hint_context_turns 를 바꿔 한 벌씩(spec 미결 1, M-7).
// 실행(키는 .env.local 의 ANTHROPIC_API_KEY — 값을 출력하지 않는다):
//   node --conditions=react-server --import tsx scripts/exp/chat-call-samples.ts [--live] [--part turns|hints|all] [--context 4,6,10] [--out <폴더>]
// 실제 호출은 --live 를 줄 때만 하고, 부르기 전에 부를 호출 수와 어림 비용을 찍는다(검토 rev-chat-s0 M-6). --live 가 없으면 가짜 응답
// (tests/fixtures/ai/fake-anthropic)으로 한 번 돌려 꼴만 본다(키 · 네트워크 없음, --fake 는 같은 뜻으로 남김). DB 를 쓰지 않는다. 결과(아이 역 글 · 선생님
// 글)는 저장소 밖 폴더(기본: 운영체제 임시 폴더)에 쓰고, 화면에는 요약 수만 낸다. 아이 이름은 쓰지 않는다(가림은 시험용 가짜 이름 목록).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { answerTextOf, prepareAnswer } from "../../src/core/ai/calls/common";
import {
  type TalkChatHistoryEntry,
  type TalkChatInput,
  talkChatTopicOf,
  talkChatTurnSpec,
} from "../../src/core/ai/calls/talk-chat";
import {
  CHAT_HINT_CONTEXT_TURNS_KEY,
  type ChatHintContextEntry,
  type TalkChatHintInput,
  type TalkChatHintOutput,
  talkChatHintSpec,
} from "../../src/core/ai/calls/talk-chat-hint";
import { requestConfigOf } from "../../src/core/ai/combo";
import { createMasker } from "../../src/core/ai/mask";
import { checkOutputFields } from "../../src/core/ai/output-check";
import { buildAiRequest } from "../../src/core/ai/request";
import { chatHintRecordOf } from "../../src/core/conversation/chat-hints";
import {
  type ChatInput,
  chatClockOf,
  chatDayPartHoursOf,
} from "../../src/core/conversation/chat-message";
import type { LessonHintSpec } from "../../src/core/conversation/hints";
import {
  ForbiddenFileSchema,
  MetaSentencesFileSchema,
} from "../../src/core/seed/schema/reference";
import { createAnthropicClient, sendAttempt } from "../../src/server/ai/client";
import { aiOutputFormatOf } from "../../src/server/ai/run";
import {
  streamTalkChat,
  type TalkAttemptRecord,
  talkChatSentUserMessageOf,
} from "../../src/server/ai/talk";
import {
  createFakeAnthropic,
  type FakeRule,
  messageBody,
} from "../../tests/fixtures/ai/fake-anthropic";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
} from "../../tests/fixtures/ai/sample-inputs";
import {
  createScriptClient,
  loadScriptConfig,
  readApiKey,
  type ScriptConfig,
} from "../ai-contract";

const LEVEL = 3;
const UNIT = 1;
/** 대화 호출 표본의 차례 수(AC-2 '열 차례'). */
const TURNS = 10;
/** 힌트 표본의 갈래마다 수(AC-7 '각 다섯'). */
const HINTS_PER_KIND = 5;
const SAFE_LINE = "Let's talk about something fun!";
const MS_PER_SECOND = 1000;
/**
 * 호출 하나의 어림 비용(달러 — 실행 전 안내에만 쓴다, 앱 설정값이 아님). 출처: spec '회화 대화 구조 R' 설계 14 의 어림(대화 호출 차례당 0.002 ·
 * 힌트 호출 0.003 안팎).
 */
const EST_USD_PER_TURN = 0.002;
const EST_USD_PER_HINT = 0.003;
const P90 = 0.9;
const HALF = 0.5;

// ── 인자 ─────────────────────────────────────────────────────────

type Part = "turns" | "hints" | "all";
type Args = {
  part: Part;
  contexts: number[] | null;
  out: string;
  live: boolean;
};

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    part: "all",
    contexts: null,
    out: join(tmpdir(), `chat-call-samples-${Date.now()}`),
    live: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--live") args.live = true;
    else if (a === "--fake") args.live = false;
    else if (a === "--part") {
      const v = argv[++i];
      if (v !== "turns" && v !== "hints" && v !== "all")
        throw new Error(`--part 는 turns · hints · all: ${v}`);
      args.part = v;
    } else if (a === "--context") {
      const list = (argv[++i] ?? "").split(",").map((s) => Number(s.trim()));
      if (list.length === 0 || list.some((n) => !Number.isInteger(n) || n < 1))
        throw new Error("--context 는 1 이상 정수를 쉼표로");
      args.contexts = list;
    } else if (a === "--out") args.out = argv[++i] ?? args.out;
    else throw new Error(`모르는 인자: ${a}`);
  }
  return args;
}

// ── 재료(시드) ────────────────────────────────────────────────────

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), path), "utf8"));

type Materials = {
  unitWords: string[];
  sentenceMaxWords: number;
  hintSpec: LessonHintSpec;
  teacher: TalkChatInput["teacher"];
  topicEn: string;
};

function materialsOf(): Materials {
  const unit = (
    readJson("seed/unit-specs.json") as {
      unitSpecs: {
        area: string;
        level: number;
        unit: number;
        words: string[];
      }[];
    }
  ).unitSpecs.find(
    (u) => u.area === "talk" && u.level === LEVEL && u.unit === UNIT,
  );
  const spec = (
    readJson("seed/level-specs.json") as {
      levelSpecs: (LessonHintSpec & {
        area: string;
        level: number;
        sentenceMaxWords: number;
      })[];
    }
  ).levelSpecs.find((s) => s.area === "talk" && s.level === LEVEL);
  const mina = (
    readJson("seed/teachers.json") as {
      teachers: {
        key: string;
        nameEn: string;
        chatPersonaEn?: string;
        chatFavoritesEn?: string;
      }[];
    }
  ).teachers.find((t) => t.key === "mina");
  const topicEn = talkChatTopicOf(LEVEL, UNIT);
  if (
    !unit ||
    !spec ||
    !mina?.chatPersonaEn ||
    !mina.chatFavoritesEn ||
    !topicEn
  )
    throw new Error("시드에 3단계 단원 1 · 미나 이야기 방식 재료가 없다");
  return {
    unitWords: unit.words,
    sentenceMaxWords: spec.sentenceMaxWords,
    hintSpec: {
      band: spec.band,
      hintTiers: spec.hintTiers,
      usablePhrases: spec.usablePhrases,
    },
    teacher: {
      nameEn: mina.nameEn,
      chatPersonaEn: mina.chatPersonaEn,
      chatFavoritesEn: mina.chatFavoritesEn,
    },
    topicEn,
  };
}

const masker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});

// ── 수 ──────────────────────────────────────────────────────────

function quantile(values: readonly number[], q: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] ??
    null
  );
}

// ── 대화 호출 열 차례(AC-2) ─────────────────────────────────────────

/** 아이 역의 열 차례(첫 차례는 수업 시작 입구, 이름 없음). */
const CHILD_LINES: readonly (ChatInput | null)[] = [
  null,
  { kind: "speech", heard: "Hello!" },
  { kind: "speech", heard: "I go to the beach." },
  { kind: "speech", heard: "I like the sea." },
  { kind: "dont_know" },
  { kind: "speech", heard: "I see fish." },
  { kind: "quiet" },
  { kind: "speech", heard: "Yes, I swim." },
  { kind: "speech", heard: "I eat ice cream." },
  { kind: "speech", heard: "It is fun." },
];

type TurnSample = {
  turn: number;
  input: string;
  ok: boolean;
  /** 엄격 규격(Zod)을 지났다. */
  zod: boolean;
  listen: "empty" | "filled";
  firstSentenceMs: number | null;
  sentences: number;
  sayChanges: number;
  say: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: string;
};

async function runTurns(
  client: Anthropic,
  config: ScriptConfig,
  m: Materials,
  lists: {
    forbidden: ReturnType<typeof ForbiddenFileSchema.parse>;
    meta: readonly string[];
  },
): Promise<TurnSample[]> {
  const history: TalkChatHistoryEntry[] = [];
  const out: TurnSample[] = [];
  for (let turn = 0; turn < TURNS; turn += 1) {
    const now = new Date();
    const childInput: ChatInput = CHILD_LINES[turn] ?? {
      kind: "start",
      clock: chatClockOf(
        now,
        config.values["app.timezone"] as string,
        chatDayPartHoursOf(config.values),
      ),
      met: 0,
    };
    const input: TalkChatInput = {
      level: LEVEL,
      unitWords: m.unitWords,
      teacher: m.teacher,
      topicEn: m.topicEn,
      history,
      message: { facts: [], input: childInput },
    };
    const rows: TalkAttemptRecord[] = [];
    let listen = "";
    const sent: string[] = [];
    const result = await streamTalkChat({
      spec: talkChatTurnSpec,
      input,
      rules: talkChatTurnSpec.rulesOf(config.values, input),
      config: requestConfigOf({
        purpose: "talk_turn",
        level: LEVEL,
        values: config.values,
        book: config.book,
      }),
      otherModelConfig: null,
      masker,
      forbidden: lists.forbidden,
      metaPhrases: lists.meta,
      book: config.book,
      client,
      clock: () => new Date(),
      startedAt: now,
      requestReceivedAt: now,
      safeLine: SAFE_LINE,
      sentenceMaxWords: m.sentenceMaxWords,
      onListen: (l) => {
        listen = l;
      },
      onSentence: (s) => sent.push(s),
      record: async (row) => {
        rows.push(row);
      },
    });
    const last = rows.at(-1);
    const user = talkChatSentUserMessageOf(input, masker);
    out.push({
      turn: turn + 1,
      input: user,
      ok: result.ok,
      zod: result.ok && !result.normalized,
      listen: listen === "" ? "empty" : "filled",
      firstSentenceMs: result.ok
        ? result.firstSentenceMs
        : result.reason === "cut_after_first"
          ? result.firstSentenceMs
          : null,
      sentences: sent.length,
      sayChanges: result.ok ? result.sayChanges.length : 0,
      say: sent.join(" "),
      inputTokens: last?.inputTokens ?? 0,
      outputTokens: last?.outputTokens ?? 0,
      cacheReadTokens: last?.cacheReadTokens ?? 0,
      costUsd: last?.costUsd ?? "0",
    });
    // 다음 차례의 대화 기록: 앱처럼 보낸 사용자 메시지(가린 글) + 기록 글(응답 JSON 에서 문장 문이 바꾼 문장만 나간 글로)
    const assistant = result.ok
      ? result.assistant
      : JSON.stringify({
          listen_sentence: "",
          say: sent.join(" "),
          say_ko: "",
          wrap_up: false,
        });
    history.push({ user, assistant });
  }
  return out;
}

// ── 힌트 표본 열다섯(AC-7) ──────────────────────────────────────────

type HintKind = "question" | "no_question" | "after_stuck";

/** 앞 대화(열두 차례 — 맥락 4 · 6 · 10 을 견줄 수 있게 길게). 이름 없음. */
const BASE_CONTEXT: readonly ChatHintContextEntry[] = [
  {
    speaker: "teacher",
    say: "Hi! It's so nice to see you. How are you today?",
  },
  { speaker: "child", input: { kind: "speech", heard: "I'm good." } },
  { speaker: "teacher", say: "Good! It's Saturday. Do you like weekends?" },
  { speaker: "child", input: { kind: "speech", heard: "Yes." } },
  { speaker: "teacher", say: "Me too. I go to the park on weekends." },
  { speaker: "child", input: { kind: "quiet" } },
  { speaker: "teacher", say: "The park has big trees. Trees or flowers?" },
  { speaker: "child", input: { kind: "speech", heard: "Flowers." } },
  { speaker: "teacher", say: "Flowers are pretty! I like yellow ones." },
  { speaker: "child", input: { kind: "speech", heard: "I like red." } },
  { speaker: "teacher", say: "Red is a warm color." },
  { speaker: "child", input: { kind: "speech", heard: "I go to the beach." } },
];

const HINT_SAYS: Readonly<Record<HintKind, readonly string[]>> = {
  question: [
    "Oh, the beach! What do you do there?",
    "Do you like the sea or the mountain?",
    "What do you eat on weekends?",
    "Who do you go with?",
    "Is the water cold?",
  ],
  no_question: [
    "Wow, the beach! I love the sound of the waves.",
    "I went to the mountain last week. It was windy.",
    "That sounds like so much fun.",
    "Cats don't like water. My cat hides from it!",
    "Sunny days are the best for the beach.",
  ],
  after_stuck: [
    "That's okay! Do you play in the sand or swim?",
    "No problem. I like to swim. Do you swim?",
    "It's okay. Maybe you eat ice cream there?",
    "That's fine. Is the beach big or small?",
    "Okay! Let's talk about the sea. Is it blue?",
  ],
};

type HintSample = {
  kind: HintKind;
  contextTurns: number;
  say: string;
  ok: boolean;
  latencyMs: number;
  tiers: string[];
  hintEn: string;
  explain: boolean;
  blocked: string[];
  inputTokens: number;
};

async function runHints(
  client: Anthropic,
  config: ScriptConfig,
  m: Materials,
  forbidden: ReturnType<typeof ForbiddenFileSchema.parse>,
  contexts: readonly number[],
): Promise<HintSample[]> {
  const out: HintSample[] = [];
  for (const contextTurns of contexts) {
    const values = {
      ...config.values,
      [CHAT_HINT_CONTEXT_TURNS_KEY]: contextTurns,
    };
    const reqConfig = requestConfigOf({
      purpose: "talk_chat_hint",
      level: LEVEL,
      values,
      book: config.book,
    });
    for (const kind of ["question", "no_question", "after_stuck"] as const) {
      for (const say of HINT_SAYS[kind].slice(0, HINTS_PER_KIND)) {
        const context: ChatHintContextEntry[] =
          kind === "after_stuck"
            ? [
                ...BASE_CONTEXT,
                { speaker: "teacher", say: "What do you see at the beach?" },
                { speaker: "child", input: { kind: "dont_know" } },
              ]
            : [...BASE_CONTEXT];
        const input: TalkChatHintInput = {
          level: LEVEL,
          sentenceMaxWords: m.sentenceMaxWords,
          hintTiers: m.hintSpec.hintTiers,
          teacherNameEn: m.teacher.nameEn,
          say,
          context,
        };
        const rules = talkChatHintSpec.rulesOf(values, input);
        const built = buildAiRequest(talkChatHintSpec, input, {
          config: reqConfig,
          masker,
          rules,
        });
        const result = await sendAttempt(client, {
          body: {
            ...built.body,
            output_config: {
              ...built.body.output_config,
              format: aiOutputFormatOf(built.wireSchema),
            },
          },
          betas: built.betas,
          timeoutMs: built.timeoutMs,
        });
        if (!result.ok) {
          out.push({
            kind,
            contextTurns,
            say,
            ok: false,
            latencyMs: result.latencyMs,
            tiers: [],
            hintEn: "",
            explain: false,
            blocked: [],
            inputTokens: 0,
          });
          continue;
        }
        let output: TalkChatHintOutput | null = null;
        try {
          const prepared = prepareAnswer(
            JSON.parse(answerTextOf(result.message)),
            talkChatHintSpec.enumPaths,
          );
          output = talkChatHintSpec.normalize(prepared, input, rules);
        } catch {
          output = null;
        }
        const hits =
          output === null
            ? new Map()
            : checkOutputFields(talkChatHintSpec.checkFields(output), {
                forbidden,
                sentenceMaxWords: m.sentenceMaxWords,
              });
        const checked =
          output === null
            ? null
            : talkChatHintSpec.applyChecks(output, hits, input).value;
        const record =
          checked === null
            ? null
            : chatHintRecordOf({
                output: checked,
                spec: m.hintSpec,
                unitWords: m.unitWords,
                lemmaOf: () => undefined,
              });
        out.push({
          kind,
          contextTurns,
          say,
          ok: record !== null && record.tiers.length > 0,
          latencyMs: result.latencyMs,
          tiers: record?.tiers.map((t) => t.kind) ?? [],
          hintEn: checked?.hint_en ?? "",
          explain: (record?.explainKo ?? "") !== "",
          blocked: [...hits.keys()],
          inputTokens:
            (result.message as unknown as { usage?: { input_tokens?: number } })
              .usage?.input_tokens ?? 0,
        });
      }
    }
  }
  return out;
}

// ── 가짜 응답(--fake) ───────────────────────────────────────────────

function fakeClient(): Anthropic {
  const chat: FakeRule = {
    when: { bodyIncludes: "How turns work here" },
    reply: {
      kind: "stream",
      body: messageBody({
        model: "claude-sonnet-5-5",
        json: {
          listen_sentence: "I go to the beach.",
          say: "Oh, the beach! Say it with me: I go to the beach. What do you do there?",
          say_ko: "오, 바다! 거기서 뭐 해?",
          wrap_up: false,
        },
      }),
    },
  };
  const hint: FakeRule = {
    reply: {
      kind: "message",
      body: messageBody({
        model: "claude-sonnet-5-5",
        json: {
          hint_ko: "나는 바다에서 수영해.",
          hint_en: "I swim at the beach.",
          explain_ko: "선생님이 바다에서 뭘 하는지 물었어요.",
        },
      }),
    },
  };
  const fake = createFakeAnthropic([chat, hint]);
  return createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "fake-key" },
    fetch: fake.fetch,
  });
}

// ── 실행 ─────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const config = loadScriptConfig();
  let client: Anthropic;
  const contexts = args.contexts ?? [
    config.values[CHAT_HINT_CONTEXT_TURNS_KEY] as number,
  ];
  if (!args.live) {
    console.log(
      "chat-call-samples: 가짜 응답으로 꼴만 봅니다(실제 호출은 --live)",
    );
    client = fakeClient();
  } else {
    const turnCalls = args.part === "hints" ? 0 : TURNS;
    const hintCalls =
      args.part === "turns"
        ? 0
        : contexts.length * Object.keys(HINT_SAYS).length * HINTS_PER_KIND;
    const usd = turnCalls * EST_USD_PER_TURN + hintCalls * EST_USD_PER_HINT;
    console.log(
      `chat-call-samples: 실제 호출 — 대화 ${turnCalls} · 힌트 ${hintCalls} 번(다시 시도 밖), 어림 ${usd.toFixed(2)}달러`,
    );
    const key = readApiKey();
    if (key === null) {
      console.error(
        "chat-call-samples: ANTHROPIC_API_KEY 가 없습니다(.env.local)",
      );
      return 2;
    }
    client = createScriptClient(key) as unknown as Anthropic;
  }
  const m = materialsOf();
  const forbidden = ForbiddenFileSchema.parse(
    readJson("seed/lists/forbidden.json"),
  );
  const meta = MetaSentencesFileSchema.parse(
    readJson("seed/lists/meta-sentences.json"),
  ).phrases;
  mkdirSync(args.out, { recursive: true });
  const summary: Record<string, unknown> = {
    fake: !args.live,
    settingsSource: config.settingsSource,
    level: LEVEL,
    unit: UNIT,
    teacher: m.teacher.nameEn,
  };

  if (args.part !== "hints") {
    const turns = await runTurns(client, config, m, { forbidden, meta });
    writeFileSync(
      join(args.out, "turns.jsonl"),
      `${turns.map((t) => JSON.stringify(t)).join("\n")}\n`,
    );
    const first = (listen: "empty" | "filled") =>
      turns
        .filter((t) => t.listen === listen && t.firstSentenceMs !== null)
        .map((t) => t.firstSentenceMs as number);
    summary.turns = {
      count: turns.length,
      zodPassed: turns.filter((t) => t.zod).length,
      ok: turns.filter((t) => t.ok).length,
      listenFilled: turns.filter((t) => t.listen === "filled").length,
      firstSentenceMedianMs: {
        empty: quantile(first("empty"), HALF),
        filled: quantile(first("filled"), HALF),
      },
    };
    console.log(
      `turns: ${turns.length} 차례 · Zod 통과 ${turns.filter((t) => t.zod).length} · 따라 할 문장 찬 차례 ${turns.filter((t) => t.listen === "filled").length}`,
    );
  }

  if (args.part !== "turns") {
    const hints = await runHints(client, config, m, forbidden, contexts);
    writeFileSync(
      join(args.out, "hints.jsonl"),
      `${hints.map((h) => JSON.stringify(h)).join("\n")}\n`,
    );
    const groups: Record<string, unknown> = {};
    for (const context of contexts)
      for (const kind of ["question", "no_question", "after_stuck"] as const) {
        const list = hints.filter(
          (h) => h.contextTurns === context && h.kind === kind,
        );
        const ms = list.map((h) => h.latencyMs);
        groups[`${context}:${kind}`] = {
          count: list.length,
          ok: list.filter((h) => h.ok).length,
          medianSeconds: (quantile(ms, HALF) ?? 0) / MS_PER_SECOND,
          p90Seconds: (quantile(ms, P90) ?? 0) / MS_PER_SECOND,
          meanInputTokens:
            list.length === 0
              ? 0
              : Math.round(
                  list.reduce((a, h) => a + h.inputTokens, 0) / list.length,
                ),
        };
      }
    summary.hints = groups;
    console.log(
      `hints: ${hints.length} 표본 · 단을 만든 표본 ${hints.filter((h) => h.ok).length}`,
    );
  }

  writeFileSync(
    join(args.out, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(`결과: ${args.out}`);
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(
      `chat-call-samples: ${error instanceof Error ? error.message : "실패"}`,
    );
    process.exitCode = 1;
  },
);
