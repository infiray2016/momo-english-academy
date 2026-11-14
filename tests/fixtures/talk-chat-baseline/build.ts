// 이야기 방식 '변경 앞 기준'(spec 판 3 AC-19 · NFR-5 · plan 묶음 C 첫 걸음): 기존 방식(app) · 지금 새 방식(claude)의 회화 턴 요청 본문과 저장 행을
// 모의 실행기(scripts/talk-observe.ts createTalkSim)로 떠서 고정 파일(app.json · claude.json)과 맞댄다. 고정 파일은 이 변경 앞 커밋(e72c403,
// 가지 feature/1a-p13d-teacher)의 깨끗한 사본에서 이 함수를 tsx 로 불러 baselineText 로 쓰고 biome 형식을 입혔다. 맞댈 때는 둘 다 공백 없는 JSON
// 글(baselineCompact — 값 · 키 차례 · 글자 그대로, 줄바꿈 · 들여쓰기만 무시)로 바꿔 견준다. 뒤 묶음은 이 파일을 다시 쓰지 않는다 —
// 같지 않으면 app · claude 의 동작이 바뀐 것이다(spec FR-1 '글자까지 같다').
// 대본: 3단계 단원 1 수업 1 · 미나(새 방식이 열리는 단원), 가짜 응답(AI 를 부르지 않음). app 은 인사 한 차례 → 대화 세 차례(말 · 모름 · 말),
// claude 는 인사를 지금 길로 마친 뒤 입구 start → 아이 차례 셋(말 · 모름 · 말). 차례마다 요청(본문 · 머리글 · 모델 · effort · 생각 · 시간 상한)을
// 남기고, 끝에 메모리 세션의 행 전부를 남긴다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TALK_LEAD_MODE_KEY } from "@/core/conversation/lead-mode";
import { splitSentences } from "@/core/seed/text";
import { loadScriptConfig } from "../../../scripts/ai-contract";
import {
  type CallResult,
  createTalkSim,
  type LeadSimEntry,
  type Materials,
  materialsOf,
  type ObserveStep,
  type PreparedTurn,
  readSeedFiles,
  type SimRow,
} from "../../../scripts/talk-observe";

/** 기준을 뜨는 두 방식. */
export const BASELINE_MODES = ["app", "claude"] as const;
export type BaselineMode = (typeof BASELINE_MODES)[number];

/** 고정 파일 자리(저장소 뿌리 기준). */
export const BASELINE_DIR = "tests/fixtures/talk-chat-baseline";

type RequestShot = {
  /** 이 요청을 만든 차례(대본 차례 · 입구 · 다시 쓰기). */
  at: string;
  body: Record<string, unknown>;
  betas: string[];
  model: string;
  effort: string;
  thinking: string;
  timeoutMs: number;
};

export type TalkBaseline = {
  mode: BaselineMode;
  requests: RequestShot[];
  rows: SimRow[];
};

const usage = {
  input_tokens: 5000,
  output_tokens: 400,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

/** 지금 방식 회화 턴 가짜 응답(출력 칸 전부 — 빈 값 + 덮어쓴 칸, talk-observe.test fakeMessage 와 같은 꼴). */
function appResult(over: Record<string, unknown>): CallResult {
  const sentences = splitSentences(String(over.tori_en ?? ""));
  const body = {
    stuck: false,
    tori_en: "",
    model_line: "",
    choices: [],
    tori_ko: sentences.map(() => "뜻"),
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
    ...over,
  };
  return {
    ok: true,
    message: {
      model: "claude-sonnet-5-5",
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify(body) }],
      usage,
    },
    latencyMs: 2100,
    firstSentenceMs: 900,
    requestId: "req_baseline",
  };
}

/** 새 엔진 가짜 응답(아홉 칸 — talk-observe-parity.test leadResult 와 같은 꼴). */
function leadResult(over: Record<string, unknown>): CallResult {
  const body = {
    reading: "clear_answer",
    move: "react_and_follow_up",
    say: "Nice!",
    say_ko: "",
    model_sentence: "",
    hint_ko: "",
    hint_en: "",
    goal_words_i_said: [],
    child_used_on_own: [],
    ...over,
  };
  return {
    ok: true,
    message: {
      model: "claude-sonnet-5-5",
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify(body) }],
      usage,
    },
    latencyMs: 1800,
    firstSentenceMs: 700,
    requestId: "req_baseline_lead",
  };
}

const shot = (at: string, request: PreparedTurn["request"]): RequestShot => ({
  at,
  body: request.body,
  betas: request.betas,
  model: request.model,
  effort: request.effort,
  thinking: request.thinking,
  timeoutMs: request.timeoutMs,
});

function materials(root: string): Materials {
  const m = materialsOf(readSeedFiles(root, 3, 1), {
    level: 3,
    unit: 1,
    lesson: 1,
    teacher: "mina",
  });
  if (!m.ok) throw new Error(m.missing);
  return m.materials;
}

const say = (text: string): ObserveStep => ({ say: text }) as ObserveStep;
const dontKnow = { input: "dont_know" } as ObserveStep;

/** 지금 방식 대화 차례(말 · 모름 · 말)의 응답. */
const APP_TALK: readonly [ObserveStep, CallResult][] = [
  [
    say("I play outside."),
    appResult({
      tori_en: "Nice! What do you do outside?",
      recast: "I play outside.",
    }),
  ],
  [dontKnow, appResult({ stuck: true, tori_en: "That is okay." })],
  [
    say("I ride a bike."),
    appResult({ tori_en: "Cool! I like bikes too.", recast: "I ride a bike." }),
  ],
];

/** 새 엔진 아이 차례(말 · 모름 · 말)의 응답. */
const LEAD_TALK: readonly [ObserveStep, CallResult][] = [
  [
    say("I play outside."),
    leadResult({ say: "Nice! What do you do outside?" }),
  ],
  [
    dontKnow,
    leadResult({
      reading: "stuck",
      move: "explain_and_model",
      say: "That is okay. You can say: I play soccer.",
      model_sentence: "I play soccer.",
      hint_ko: "밖에서 하는 놀이를 말해 봐요.",
    }),
  ],
  [say("I ride a bike."), leadResult({ say: "Cool! I like bikes too." })],
];

/** 한 방식의 기준을 뜬다(모의 실행기 — DB · AI 없음). */
export function talkBaselineOf(
  mode: BaselineMode,
  root: string = process.cwd(),
): TalkBaseline {
  const config = loadScriptConfig({ root });
  const values = { ...config.values, [TALK_LEAD_MODE_KEY]: mode };
  const sim = createTalkSim(materials(root), values, config.book);
  const requests: RequestShot[] = [];
  let index = 0;
  // 인사(두 방식 모두 지금 길): 새 엔진은 대화 토막에 들 때까지, 지금 방식은 한 차례
  for (let i = 0; i < 4; i++) {
    if (mode === "claude" && sim.lead.applies()) break;
    const ready = sim.prepare(say("I am fine."), index);
    if (!ready.ok) throw new Error(ready.reason);
    requests.push(shot(`greeting ${index}`, ready.turn.request));
    sim.finish(
      ready.turn,
      appResult({ tori_en: "Good to hear! Let's learn some new words!" }),
    );
    index++;
    if (mode === "app") break;
  }
  if (mode === "app") {
    for (const [step, result] of APP_TALK) {
      const ready = sim.prepare(step, index);
      if (!ready.ok) throw new Error(ready.reason);
      requests.push(shot(`talk ${index}`, ready.turn.request));
      const ask = sim.retryOf(ready.turn, result);
      if (ask) throw new Error(`기준 대본에 다시 쓰기가 끼었다: ${index}`);
      sim.finish(ready.turn, result);
      index++;
    }
    return { mode, requests, rows: [...sim.rows] };
  }
  if (!sim.lead.on) throw new Error("새 엔진 수업이 열리지 않았다");
  const leadStep = (at: string, entry: LeadSimEntry, result: CallResult) => {
    const ready = sim.lead.prepare(entry);
    if (!ready.ok) throw new Error(ready.reason);
    requests.push(shot(at, ready.turn.request));
    const ask = sim.lead.retryOf(ready.turn, result);
    if (ask) throw new Error(`기준 대본에 다시 말하기가 끼었다: ${at}`);
    sim.lead.finish(ready.turn, result);
  };
  leadStep(
    "open start",
    { kind: "open", open: "start" },
    leadResult({ say: "Let's talk about weekends. What do you do?" }),
  );
  for (const [step, result] of LEAD_TALK) {
    leadStep(
      `lead ${index}`,
      { kind: "child", step, stepIndex: index },
      result,
    );
    index++;
  }
  return { mode, requests, rows: [...sim.rows] };
}

/** 고정 파일 글(쓸 때와 맞댈 때 같은 꼴). */
export function baselineText(baseline: TalkBaseline): string {
  return `${JSON.stringify(baseline, null, 2)}\n`;
}

/** 맞댈 꼴: 공백 없는 JSON 글(키 차례 · 값 · 글자는 그대로 — biome 형식의 줄바꿈 · 들여쓰기만 지운다). */
export function baselineCompact(value: unknown): string {
  return JSON.stringify(value);
}

/** 고정 파일을 읽어 맞댈 꼴로. */
export function readBaselineFile(
  mode: BaselineMode,
  root: string = process.cwd(),
): string {
  return baselineCompact(
    JSON.parse(
      readFileSync(join(root, BASELINE_DIR, `${mode}.json`), "utf8"),
    ) as unknown,
  );
}
