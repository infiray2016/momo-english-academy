// 이야기 방식 서버 배선을 core 로 옮긴 것의 기준 파일(baseline.json) 생성기(13절 C243 보완 10 (1), 코드 검토 task-rev-g-core-report M-1).
// 짝 시험 tests/unit/chat-core-move-baseline.test.ts 가 이 파일이 만든 값과 옮긴 core 함수의 값을 JSON 글자까지 맞댄다.
// 만든 판: 옮기기 전 커밋 2433e9c 의 깨끗한 사본에서, 옮기기 전 서버 함수(server/ai/talk.ts · server/conversation/index.ts · chat-hint.ts ·
// chat-eval.ts)를 이 꼴의 생성기로 불러 baseline.json 을 쓰고 biome 형식을 입혔다(그때는 시험 꼴 생성기였다 — 사본
// .superpowers/sdd/2026-11-13-회화-대화-품질/task-g-core-baseline-generator.test.ts.txt). 옮긴 뒤에도 서버가 같은 이름으로 다시 내보내므로
// 이 파일은 지금 판에서도 서버 이름으로 부르며, 지금 판에서 만든 값은 기준 파일과 JSON 으로 같다(구현 보고 task-tool-bp-report 4절).
// 돌리는 법(저장소 뿌리에서, AI · DB 를 부르지 않고 환경 파일을 읽지 않는다 — server-only 는 react-server 조건으로 빈 모듈이 된다):
//   node --conditions=react-server --import tsx tests/fixtures/chat-core-move-baseline/build.ts [쓸 파일]
//   pnpm biome format --write <쓸 파일>
// 쓸 파일을 주지 않으면 baseline.json 을 덮어쓴다. 기준 파일은 뜻을 갖고 함수를 고친 때만 다시 만든다 — 다르게 나오면 이야기 방식 길의 동작이
// 바뀐 것이다(켜기 전 관문 (가)를 다시 돌리지 않는 조건이 깨짐).
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TalkChatOutput } from "@/core/ai/calls/talk-chat";
import { talkChatHintSpec } from "@/core/ai/calls/talk-chat-hint";
import { createMasker } from "@/core/ai/mask";
import type { ChatOpen } from "@/core/conversation/chat-turn-plan";
import { chatJudgeContextFrom } from "@/core/conversation/chat-unit-words";
import { TALK_LEAD_MODE_KEY } from "@/core/conversation/lead-mode";
import { talkMoveOf } from "@/core/conversation/move";
import { bandOf } from "@/core/seed/structure";
import {
  chatListenCheckedOf,
  chatSayChangesOf,
  TALK_CHAT_READER_KEYS,
  talkChatSentUserMessageOf,
} from "@/server/ai/talk";
import {
  chatEvalEntriesOf,
  chatEvalFailureOf,
  chatEvalInputFor,
  chatEvalPendingOf,
  chatEvalStateOf,
  chatEvalWritesOf,
  chatJudgeRowsOf,
  chatLessonSayLostOf,
} from "@/server/conversation/chat-eval";
import {
  CHAT_DIALOG_SEGMENTS,
  type ChatTurnRowLike,
  chatChildInputOf,
  chatDialogRowsOf,
  chatHintInputOf,
  chatSaidSayLostOf,
  chatSaidSayOf,
  chatSayFromRowOf,
  levelCallSpecOf,
  levelInputOf,
} from "@/server/conversation/chat-hint";
import { chatUnitWordsOf } from "@/server/conversation/chat-unit-words";
import { lessonStartModeOf } from "@/server/conversation/index";
import { seedHomophones } from "@/server/seed-lists";
import { loadScriptConfig } from "../../../scripts/ai-contract";
import {
  type CallResult,
  type ChatSimEntry,
  createTalkSim,
  type Materials,
  materialsOf,
  type ObserveStep,
  readSeedFiles,
  type TalkSim,
} from "../../../scripts/talk-observe";
import { SAMPLE_CONTACT_PATTERNS, SAMPLE_NAMES } from "../ai/sample-inputs";

/** 기준 파일 자리(저장소 뿌리 기준). */
export const CHAT_CORE_BASELINE_FILE =
  "tests/fixtures/chat-core-move-baseline/baseline.json";

const ROOT = process.cwd();
const config = loadScriptConfig({ root: ROOT });
const CHAT_VALUES: Record<string, unknown> = {
  ...config.values,
  [TALK_LEAD_MODE_KEY]: "chat",
};
const CHAT_AT = new Date("2026-11-14T01:00:00.000Z");
const VOCAB_ROWS = (
  JSON.parse(readFileSync(`${ROOT}/seed/vocab.json`, "utf8")) as {
    vocab: { word: string; forms: string[] }[];
  }
).vocab;
const TEACHERS = (
  JSON.parse(readFileSync(`${ROOT}/seed/teachers.json`, "utf8")) as {
    teachers: {
      key: string;
      chatPersonaEn?: string;
      chatFavoritesEn?: string;
    }[];
  }
).teachers;
const sampleMasker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});

function materialsAt(level: number): Materials {
  const m = materialsOf(readSeedFiles(ROOT, level, 1), {
    level,
    unit: 1,
    lesson: 1,
    teacher: "mina",
  });
  if (!m.ok) throw new Error(m.missing);
  return m.materials;
}
function chatAnswerOf(over: Partial<TalkChatOutput> = {}): TalkChatOutput {
  return {
    listen_sentence: "",
    say: "Oh, nice!",
    say_ko: "",
    wrap_up: false,
    ...over,
  };
}
function chatResult(answer: TalkChatOutput | string): CallResult {
  return {
    ok: true,
    message: {
      model: "claude-sonnet-5-5",
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: typeof answer === "string" ? answer : JSON.stringify(answer),
        },
      ],
      usage: {
        input_tokens: 3200,
        output_tokens: 90,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 2800,
      },
    },
    latencyMs: 1500,
    firstSentenceMs: 600,
    requestId: "req_chat",
  } as CallResult;
}
const chatChild = (step: ObserveStep): ChatSimEntry => ({
  kind: "child",
  step,
  stepIndex: 0,
});
const chatOpen = (open: ChatOpen): ChatSimEntry => ({ kind: "open", open });
function turn(sim: TalkSim, entry: ChatSimEntry, answer: TalkChatOutput) {
  const ready = sim.chat.prepare(entry);
  if (!ready.ok) throw new Error(ready.reason);
  sim.chat.finish(ready.turn, chatResult(answer));
  return ready.turn;
}
function talking(m: Materials): TalkSim {
  const sim = createTalkSim(m, CHAT_VALUES, config.book, {
    chatAt: CHAT_AT,
    rotationKey: "t1",
  });
  turn(
    sim,
    chatOpen("start"),
    chatAnswerOf({ say: "Hi! How are you today?", say_ko: "안녕! 오늘 어때?" }),
  );
  for (let i = 0; i < 4 && sim.chat.openDue() !== "back"; i++)
    turn(
      sim,
      chatChild({ say: "I am fine." }),
      chatAnswerOf({ say: "Good! Let's look at some words." }),
    );
  turn(
    sim,
    chatOpen("back"),
    chatAnswerOf({ say: "Great job! What do you do on weekends?" }),
  );
  return sim;
}
const roundTrip = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const mv = (kind: "ai" | "first_question" | "closing_slot", over = {}) => ({
  ...talkMoveOf({ kind }),
  ...over,
});
const chat = (over = {}) => ({
  level: {},
  madeUp: [],
  facts: [],
  run: 0,
  ...over,
});
const lead = (over = {}) => ({
  reading: "clear_answer",
  move: "react_and_follow_up",
  asked: [],
  said: [],
  ...over,
});

/** 손으로 만든 갈래 행(짝 시험 재료에 없는 갈래 — 토막 거름 · 같은 차례 번호 · 기록 글 꼴 · 입력 갈래 · 지운 표지). */
function edgeRows(): ChatTurnRowLike[] {
  const base = {
    text: null,
    inputMode: null,
    hintLevel: null,
    clientListen: null,
    sentUserMessage: null,
    toriRewrite: null,
    aiQuestion: null,
    move: null,
    chatJudge: null,
  };
  const r = (
    id: string,
    turnNo: number,
    segment: string,
    speaker: "child" | "tori",
    over: Partial<ChatTurnRowLike> = {},
  ): ChatTurnRowLike => ({ ...base, id, turnNo, segment, speaker, ...over });
  return [
    r("t-0", 0, "talk", "tori", {
      text: "Lost line.",
      move: mv("ai", {
        chat: chat({ listen: { sentence: "", inSay: false } }),
      }),
    }),
    r("t-1", 1, "greeting", "tori", {
      text: "Hi! How are you?",
      toriRewrite: JSON.stringify({ say: "Hi! How are you?", say_ko: "" }),
      sentUserMessage: "(Lesson starts.)",
      move: mv("first_question"),
    }),
    r("c-1", 1, "greeting", "child", {
      text: "I am good.",
      inputMode: "speech",
      sentUserMessage: "Child: I am good.",
    }),
    r("t-p", 2, "prep", "tori", { text: "Look at these words." }),
    r("t-2", 2, "talk", "tori", {
      text: "Say: Do you like it?\nDo you want to talk more?",
      toriRewrite: "not json",
      move: mv("ai", { chat: chat({ removed: ["I like it."] }) }),
    }),
    r("c-2", 3, "talk", "child", { inputMode: "quiet" }),
    r("t-3", 3, "talk", "tori", {
      text: "Okay!",
      move: mv("ai", { lead: lead({ removed: ["I play soccer."] }) }),
    }),
    r("c-3", 4, "talk", "child", {
      inputMode: "dont_know",
      clientListen: { src: "nospeech" },
      hintLevel: 2,
    }),
    r("t-4", 4, "talk", "tori", {
      text: "That's fine.",
      toriRewrite: JSON.stringify({ say: 7 }),
      move: mv("ai", { chat: chat({ removed: [] }) }),
    }),
    r("c-4", 5, "talk", "child", { inputMode: "dont_know", hintLevel: 1 }),
    r("t-5", 5, "more_talk", "tori", {
      text: "  Great talk!  ",
      move: mv("closing_slot", {
        chat: chat({
          listen: { sentence: "I play.", inSay: true },
          explain: true,
        }),
      }),
    }),
    r("c-5", 6, "more_talk", "child", { inputMode: "speech", text: "   " }),
    r("t-6", 6, "more_talk", "tori", {
      text: "Bye!",
      move: mv("ai", { lead: lead({ model: { sentence: "", inSay: false } }) }),
    }),
    r("c-6", 7, "more_talk", "child", {
      inputMode: null,
      text: "Yes I do.",
      sentUserMessage: null,
    }),
    r("t-w", 8, "wrap_up", "tori", { text: "See you!" }),
  ];
}

/** Map 은 [키, 값] 목록으로 적는다. */
const judgedJson = (j: ReturnType<typeof chatJudgeRowsOf>) => ({
  rows: j.rows,
  ids: j.ids,
  stored: [...j.stored.entries()],
});

/** 기준 값(서버 이름으로 부른다 — 옮기기 전 판에서는 서버 함수, 지금 판에서는 서버가 다시 내보내는 core 함수). */
export function buildChatCoreBaseline() {
  const m = materialsAt(3);

  // ── 시작 방식(index.ts lessonStartModeOf) ──
  const teachers: Record<
    string,
    { chatPersonaEn?: string; chatFavoritesEn?: string } | null
  > = { none: null };
  for (const t of TEACHERS)
    teachers[t.key] = {
      ...(t.chatPersonaEn === undefined
        ? {}
        : { chatPersonaEn: t.chatPersonaEn }),
      ...(t.chatFavoritesEn === undefined
        ? {}
        : { chatFavoritesEn: t.chatFavoritesEn }),
    };
  const startMode: unknown[] = [];
  for (const mode of ["app", "claude", "chat"] as const)
    for (const level of [1, 2, 3, 4, 5])
      for (const unit of [1, 2, 3, 4, 5])
        for (const teacher of Object.keys(teachers))
          startMode.push({
            args: { mode, level, unit, teacher },
            out: lessonStartModeOf({
              mode,
              level,
              unit,
              teacher: (teachers[teacher] ?? null) as never,
            }),
          });
  // 단원 표 출처를 바꾼 꼴(빈칸만 든 주제 · 표 없음)
  const blankTopic = lessonStartModeOf({
    mode: "chat",
    level: 3,
    unit: 1,
    teacher: teachers.mina as never,
    leadText: () =>
      ({ chatTopicEn: "  " }) as unknown as ReturnType<
        NonNullable<Parameters<typeof lessonStartModeOf>[0]["leadText"]>
      >,
  });
  const noText = lessonStartModeOf({
    mode: "chat",
    level: 3,
    unit: 1,
    teacher: teachers.mina as never,
    leadText: () => null,
  });

  // ── 흘려 받기(talk.ts) ──
  const listenInputs = [
    "I like cats.",
    "You are stupid.",
    "",
    "the beach",
    "I play soccer with my friends every Sunday morning at the park.",
  ];
  const listen = [3, 7].flatMap((max) =>
    listenInputs.map((text) => ({
      args: { text, sentenceMaxWords: max },
      out: chatListenCheckedOf(text, m.forbidden, max),
    })),
  );
  const sayInputs = [
    "Hi! You are stupid. Bye.",
    "I am an AI model. Let's play.",
    "Nice!",
    "",
    "Call me at 010-1234-5678. What do you like?",
    "Wow! I play soccer every day with my best friends in the big park. Do you?",
  ];
  const sayChanges = [
    { safeLine: "Let's talk!", sentenceMaxWords: 7 },
    { safeLine: "Okay!", sentenceMaxWords: 12 },
  ].flatMap((g) =>
    sayInputs.map((say) => ({
      args: { say, ...g },
      out: chatSayChangesOf(say, {
        forbidden: m.forbidden,
        metaPhrases: m.metaPhrases,
        ...g,
      }),
    })),
  );

  // ── 수업 행(짝 시험 재료: AC-27r 서버 배선 사본 · M-2 직접 맞대지 않던 사본 · M-2 이어진 막힘) ──
  const simA = talking(m);
  turn(
    simA,
    chatChild({ say: "I play soccer." }),
    chatAnswerOf({
      listen_sentence: "I play soccer.",
      say: 'Soccer! Say "I play soccer." Who do you play with?',
    }),
  );
  turn(
    simA,
    chatOpen("quiet"),
    chatAnswerOf({ say: "I play with my friends." }),
  );
  turn(
    simA,
    chatChild({ say: "Friend." }),
    chatAnswerOf({ say: "Friends are great! What do you play?" }),
  );
  const ready = simA.chat.prepare(
    chatChild({ say: `I am ${SAMPLE_NAMES.englishName ?? "Ganada"}.` }),
  );
  if (!ready.ok) throw new Error(ready.reason);
  const chatInput = roundTrip(ready.turn.chatInput);
  const rowsA = roundTrip(simA.chat.serverRows()) as ChatTurnRowLike[];

  const simB = talking(m);
  for (const say of ["I play soccer.", "With my dad."])
    turn(simB, chatChild({ say }), chatAnswerOf({ say: "Nice! Who else?" }));
  const rowsB = roundTrip(simB.chat.serverRows()) as ChatTurnRowLike[];

  const simC = talking(m);
  for (let i = 0; i < 3; i++) {
    turn(
      simC,
      chatChild({ input: "dont_know" }),
      chatAnswerOf({ say: "That's okay. Do you like the sea or the sky?" }),
    );
    const ask = simC.chat.hintAsk("explain");
    if (ask.kind !== "call") throw new Error(ask.kind);
    simC.chat.hintFinish(
      ask,
      chatResult(
        JSON.stringify({
          hint_ko: "바다가 좋아요.",
          hint_en: "I like the sea.",
          explain_ko: "바다랑 하늘 가운데 뭐가 좋은지 물었어요.",
        }),
      ),
    );
  }
  turn(
    simC,
    chatChild({ say: "Sea." }),
    chatAnswerOf({ say: "The sea is nice!" }),
  );
  const rowsC = roundTrip(simC.chat.serverRows()) as ChatTurnRowLike[];
  const rowsE = roundTrip(edgeRows());

  const ctx = chatJudgeContextFrom(
    { card: m.card, spec: { band: bandOf(3) }, teacher: m.teacher },
    chatUnitWordsOf({
      unitWords: m.ctx.unitWords,
      lemmaEntries: VOCAB_ROWS.filter((v) =>
        new Set(m.ctx.unitWords).has(v.word),
      ),
    }),
    seedHomophones(),
  );
  const states = [
    {
      status: "done" as const,
      output: {
        reading: "clear_answer" as const,
        teacher_move: "react_and_follow_up" as const,
        model_sentence: "",
        child_used_on_own: ["soccer"],
      },
    },
    { status: "failed" as const, failure: "timeout" as const },
    { status: "failed" as const },
  ];

  const rowSets: Record<string, ChatTurnRowLike[]> = {
    A: rowsA,
    B: rowsB,
    C: rowsC,
    E: rowsE,
    F: rowsE.filter((r) => r.id !== "t-0" && r.id !== "t-6"),
  };
  const perSet: Record<string, unknown> = {};
  for (const [name, rows] of Object.entries(rowSets)) {
    const perRow = rows.map((row) => ({
      id: row.id,
      sayFromRow: chatSayFromRowOf(row),
      saidSayLost: chatSaidSayLostOf(row),
      saidSay: chatSaidSayOf(row),
      childInput: chatChildInputOf(row),
      evalState: chatEvalStateOf(row),
      evalPending: chatEvalPendingOf(row),
    }));
    const hint = rows
      .filter((r) => r.speaker === "tori")
      .map((r) => ({
        teacherRowId: r.id,
        out: chatHintInputOf({
          rows,
          teacherRowId: r.id,
          level: 3,
          sentenceMaxWords: m.ctx.sentenceMaxWords,
          hintTiers: m.spec.hintTiers,
          teacherNameEn: m.teacher.nameEn,
        }),
      }));
    const evalInput = rows.flatMap((r) =>
      [2, 6].map((contextTurns) => ({
        childRowId: r.id,
        contextTurns,
        out: chatEvalInputFor({
          rows,
          childRowId: r.id,
          contextTurns,
          unitWords: m.ctx.unitWords,
        }),
      })),
    );
    const entries = chatEvalEntriesOf(chatDialogRowsOf(rows));
    const writes = rows
      .filter((r) => r.speaker === "child")
      .flatMap((r) =>
        states.map((state, stateIndex) => {
          const out = chatEvalWritesOf({
            rows,
            childRowId: r.id,
            state,
            ctx,
          });
          return {
            childRowId: r.id,
            stateIndex,
            out,
            readBack: (out ?? []).map((w) =>
              chatEvalStateOf({
                ...(rows.find((x) => x.id === w.id) as ChatTurnRowLike),
                chatJudge: w.judge,
              }),
            ),
          };
        }),
      );
    perSet[name] = {
      rows,
      dialogIds: chatDialogRowsOf(rows).map((r) => r.id),
      perRow,
      hint,
      evalInput,
      evalEntries: {
        entries: entries.entries,
        childAt: [...entries.childAt.entries()],
      },
      lessonSayLost: chatLessonSayLostOf(rows),
      judgeRows: judgedJson(chatJudgeRowsOf(rows, { band: bandOf(3) })),
      judgeRowsOverride: rows
        .filter((r) => r.speaker === "child")
        .map((r) => ({
          id: r.id,
          out: judgedJson(
            chatJudgeRowsOf(
              rows,
              { band: bandOf(3) },
              { id: r.id, state: states[0] as never },
            ),
          ),
        })),
      writes,
    };
  }

  // ── 실패 갈래 · 단계 맥락 칸(chat-eval.ts · chat-hint.ts) ──
  const failure = [
    "timeout",
    "invalid",
    "output_blocked",
    "server",
    "refusal",
    "safety_cap",
    "connection",
    "config",
  ].map((reason) => ({
    reason,
    out: chatEvalFailureOf(reason as never),
  }));
  const hintInputA = chatHintInputOf({
    rows: rowsA,
    teacherRowId: rowsA.findLast((r) => r.speaker === "tori")?.id ?? "",
    level: 3,
    sentenceMaxWords: m.ctx.sentenceMaxWords,
    hintTiers: m.spec.hintTiers,
    teacherNameEn: m.teacher.nameEn,
  });
  if (hintInputA === null) throw new Error("힌트 입력 없음");
  const levelInputs = [
    { input: hintInputA, level: 3, sentenceMaxWords: 7 },
    {
      input: { unitWords: ["sea"], note: "x" },
      level: 2,
      sentenceMaxWords: 5,
    },
    { input: {}, level: 1, sentenceMaxWords: 4 },
  ].map((x) => ({
    ...x,
    out: levelInputOf(x.input, {
      level: x.level,
      sentenceMaxWords: x.sentenceMaxWords,
    }),
  }));
  const leveledSpec = levelCallSpecOf(talkChatHintSpec);
  const leveledHint = levelInputOf(hintInputA, {
    level: 3,
    sentenceMaxWords: 7,
  });
  const levelSpec = {
    keys: Object.keys(leveledSpec).sort(),
    sameExceptMask: Object.keys(talkChatHintSpec).every(
      (k) =>
        k === "mask" ||
        (leveledSpec as unknown as Record<string, unknown>)[k] ===
          (talkChatHintSpec as unknown as Record<string, unknown>)[k],
    ),
    masked: leveledSpec.mask(leveledHint, sampleMasker),
  };

  const out = {
    note: "C243 보완 10 (1) 옮기기 전 서버 함수(server/ai/talk.ts · server/conversation/index.ts · chat-hint.ts · chat-eval.ts)로 만든 기준 값",
    dialogSegments: CHAT_DIALOG_SEGMENTS,
    readerKeys: TALK_CHAT_READER_KEYS,
    startMode,
    startModeBlankTopic: blankTopic,
    startModeNoText: noText,
    teachers,
    listen,
    sayChanges,
    sentUserMessage: {
      chatInput,
      out: talkChatSentUserMessageOf(chatInput, sampleMasker),
    },
    sets: perSet,
    failure,
    levelInputs,
    levelSpec,
  };
  return out;
}

/** 쓸 글(biome 형식은 쓴 뒤 따로 입힌다 — 맞댈 때는 JSON 값으로 견주므로 들여쓰기는 상관없다). */
export function chatCoreBaselineText(
  baseline: ReturnType<typeof buildChatCoreBaseline>,
): string {
  return `${JSON.stringify(baseline, null, 2)}\n`;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  const target = process.argv[2] ?? join(ROOT, CHAT_CORE_BASELINE_FILE);
  writeFileSync(target, chatCoreBaselineText(buildChatCoreBaseline()), "utf8");
  console.log(`기준 파일을 썼습니다: ${target}`);
}
