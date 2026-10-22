// 풀이 검사(6.4, plan-p05a 'solve-check.ts'): 검증을 통과한 칸의 풀이 대상 문항을 정답 · 허용 정답 · 해설을 뺀 문제 보기로 만들고,
// 풀이 모델의 응답을 읽어 판정하고, 칸 내용 해시와 함께 seed/checks 기록(P4a CheckFileSchema)을 만든다.
// 해시 · 문항 번호 · 풀이 대상 · 상태는 P4c 의 cellHash · itemsOf · solveTargets · solveStatus 그대로다(plan-p04c 위험 5).
// SDK · 파일 · 네트워크 · 시계를 가져오지 않는 순수 모듈이다(시각은 인자). API 호출은 scripts/seed-check.ts 가 한다.
import { z } from "zod";
import type { CheckFile, CheckRecord } from "@/core/seed/schema/records";
import type { ModelPrice } from "@/core/seed/schema/reference";
import {
  type Area,
  bandInfo,
  type Effort,
  parseCellKey,
  parseSeedPath,
  READING_QUESTION_TYPES,
} from "@/core/seed/structure";
import {
  type CollectedCell,
  type CollectedSeed,
  cellHash,
  collectCells,
  itemsOf,
  type SeedCell,
  solveTargets,
  validateSeed,
} from "@/core/seed/validate";

/** 비용 소수 자리(달러, 기술 값). */
export const COST_DECIMALS = 6;
/** 단가는 100만 토큰당(5절 model_prices). */
export const TOKENS_PER_MTOK = 1_000_000;

// ── 풀이 요청(정답을 뺀 문제 보기) ───────────────────────────────

export type SolveTextTask =
  | "copy-tiles"
  | "build-tiles"
  | "fill-letters"
  | "dictation"
  | "assemble-phrase"
  | "assemble-sentence"
  | "fill-blank"
  | "fix-sentence";

/** 보기를 고르는 문항(읽기 · 듣기 · 토리 이야기 · 그림 보고 고르기). */
export type SolveChoiceView = {
  no: number;
  answer: "choice";
  prompt?: string;
  /** 읽어 줄 글(듣기). */
  listen?: string;
  /** 그림(`그림: <한국어 뜻>`). */
  picture?: string;
  options: string[];
};
/** 글로 답하는 문항(쓰기 1~3단계 · 쓰기 앱 채점 문항). */
export type SolveTextView = {
  no: number;
  answer: "text";
  task: SolveTextTask;
  prompt?: string;
  listen?: string;
  word?: string;
  meaningKo?: string;
  pattern?: string;
  tiles?: string[];
  cards?: string[];
  /** 같이 맞는 다른 답을 alternatives 로 받는다(조립 · 받아쓰기, 6.4). */
  listAlternatives: boolean;
};
export type SolveItemView = SolveChoiceView | SolveTextView;

/** 칸 하나의 풀이 요청(칸 키 · 해시는 API 에 보내지 않는다). */
export type SolveRequest = {
  cell: string;
  contentHash: string;
  area: Area;
  level: number;
  context: { passage?: string; story?: string };
  items: SolveItemView[];
};

/** 그림 뜻을 찾는 vocab(ReferenceIndex 의 일부). */
export type SolveIndex = {
  vocab: ReadonlyMap<string, { meaningKo: string }>;
};

/** 텍스트 칸이 붙지 않게 값이 있을 때만 넣는다. */
function maybe<K extends string, V>(
  key: K,
  value: V | undefined,
): Partial<Record<K, V>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
function texts(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

/** 칸 객체에서 문항 경로(itemsOf 의 path)의 값을 꺼낸다. */
function valueAt(cell: SeedCell, path: string): unknown {
  let value: unknown = cell.value;
  for (const key of path.split(".").filter((k) => k !== "")) {
    value = Array.isArray(value) ? value[Number(key)] : record(value)[key];
  }
  return value;
}

function picture(index: SolveIndex, word: string): string {
  return `그림: ${index.vocab.get(word)?.meaningKo ?? word}`;
}

const READING_TYPES = new Set<string>(READING_QUESTION_TYPES);

/** 쓰기 1~3단계 문항 · 쓰기 앱 채점 문항의 보기. 모르는 유형이면 undefined. */
function writingView(
  no: number,
  item: Record<string, unknown>,
  index: SolveIndex,
): SolveItemView | undefined {
  const type = text(item.type);
  switch (type) {
    case "pick-word":
      return {
        no,
        answer: "choice",
        picture: picture(index, text(item.picture) ?? ""),
        options: texts(item.options),
      };
    case "copy-tiles":
      return {
        no,
        answer: "text",
        task: type,
        ...maybe("word", text(item.word)),
        tiles: texts(item.tiles),
        listAlternatives: false,
      };
    case "build-tiles":
      return {
        no,
        answer: "text",
        task: type,
        ...maybe("meaningKo", text(item.meaningKo)),
        tiles: texts(item.tiles),
        listAlternatives: false,
      };
    case "fill-letters":
      return {
        no,
        answer: "text",
        task: type,
        ...maybe("pattern", text(item.pattern)),
        tiles: texts(item.tiles),
        listAlternatives: false,
      };
    case "dictation":
      return {
        no,
        answer: "text",
        task: type,
        ...maybe("listen", text(item.audioText)),
        listAlternatives: true,
      };
    case "assemble-phrase":
    case "assemble-sentence":
      return {
        no,
        answer: "text",
        task: type,
        cards: texts(item.cards),
        ...maybe("meaningKo", text(item.meaningKo)),
        listAlternatives: true,
      };
    case "fill-blank":
    case "fix-sentence":
      return {
        no,
        answer: "text",
        task: type,
        ...maybe("prompt", text(item.prompt)),
        listAlternatives: false,
      };
    default:
      return undefined;
  }
}

/** 듣기 문항(말하기 수업 · 평가 · 배치)의 보기: 읽어 줄 글 · 질문(있으면) · 보기. */
function listeningView(
  no: number,
  item: Record<string, unknown>,
  index: SolveIndex,
): SolveChoiceView {
  const options = texts(item.options);
  return {
    no,
    answer: "choice",
    ...maybe("listen", text(item.script)),
    ...maybe("prompt", item.kind === "text" ? text(item.prompt) : undefined),
    options:
      item.kind === "picture" ? options.map((o) => picture(index, o)) : options,
  };
}

/** 읽기 문항(수업 · 평가 · 배치)의 보기: 질문 · 보기(그림 문제는 그림 넷). */
function readingView(
  no: number,
  item: Record<string, unknown>,
  index: SolveIndex,
): SolveChoiceView {
  const options = texts(item.options);
  return {
    no,
    answer: "choice",
    ...maybe("prompt", text(item.prompt)),
    options:
      item.type === "picture" ? options.map((o) => picture(index, o)) : options,
  };
}

/** 평가 · 배치 문항 칸 하나의 보기. */
function testItemView(
  no: number,
  item: Record<string, unknown>,
  index: SolveIndex,
): SolveItemView | undefined {
  const type = text(item.type) ?? "";
  if (READING_TYPES.has(type)) return readingView(no, item, index);
  if (type === "listening") return listeningView(no, item, index);
  return writingView(no, item, index);
}

/** 칸 키의 단계(토리 이야기는 구간 첫 단계). 칸 키가 아니면 undefined. */
export function cellLevel(key: string): number | undefined {
  const ref = parseCellKey(key);
  if (!ref) return undefined;
  return ref.type === "story" ? bandInfo(ref.band).first : ref.level;
}

/**
 * 칸 하나의 풀이 요청(plan-p05a '풀이 요청'). 문항은 solveTargets 것만, 번호는 itemsOf 번호다.
 * 정답 번호 · 허용 정답 · 해설 · 바른 답 · 받아쓰기 낱말 · 글로서리 · 미리보기 · 한국어 뜻 글은 넣지 않는다(위험 1).
 * 풀이 대상이 없으면 null.
 */
export function buildSolveRequest(
  cell: SeedCell,
  index: SolveIndex,
): SolveRequest | null {
  const targets = new Set(solveTargets(cell));
  const level = cellLevel(cell.key);
  if (targets.size === 0 || level === undefined) return null;
  const context: SolveRequest["context"] = {};
  const items: SolveItemView[] = [];
  for (const { no, path } of itemsOf(cell)) {
    if (!targets.has(no)) continue;
    const item = record(valueAt(cell, path));
    let view: SolveItemView | undefined;
    switch (cell.kind) {
      case "lesson":
        if (cell.area === "reading") view = readingView(no, item, index);
        else if (cell.area === "speaking")
          view = listeningView(no, item, index);
        else if (cell.area === "writing") view = writingView(no, item, index);
        break;
      case "test-item":
      case "placement": {
        view = testItemView(no, item, index);
        const passage = READING_TYPES.has(text(item.type) ?? "")
          ? text(item.passage)
          : undefined;
        if (passage !== undefined) context.passage = passage;
        break;
      }
      case "story":
        view = {
          no,
          answer: "choice",
          ...maybe("prompt", text(item.prompt)),
          options: texts(item.options),
        };
        break;
      case "talk-sheet":
        break;
    }
    if (view) items.push(view);
  }
  if (cell.kind === "lesson" && cell.area === "reading") {
    const passage = text(record(record(cell.value).content).passage);
    if (passage !== undefined) context.passage = passage;
  }
  if (cell.kind === "story") {
    const story = text(record(cell.value).textEn);
    if (story !== undefined) context.story = story;
  }
  if (items.length === 0) return null;
  return {
    cell: cell.key,
    contentHash: cellHash(cell.key, cell.value),
    area: cell.area ?? "talk",
    level,
    context,
    items,
  };
}

/** API 에 보내는 사용자 메시지: 영역 · 단계 · 지문 · 문항만의 JSON(칸 키 · 해시는 보내지 않는다). */
export function solveUserMessage(request: SolveRequest): string {
  return JSON.stringify({
    area: request.area,
    level: request.level,
    context: request.context,
    items: request.items,
  });
}

/** 칸의 그 문항 시드 정답(보기 번호 · 허용 정답). 판정과 가짜 풀이(시험)가 쓴다. */
export function seedAnswerOf(
  cell: SeedCell,
  no: number,
): { answerNo?: number; accepted?: string[] } {
  const item = itemsOf(cell).find((i) => i.no === no);
  if (!item) return {};
  const value = record(valueAt(cell, item.path));
  return {
    ...maybe(
      "answerNo",
      typeof value.answerNo === "number" ? value.answerNo : undefined,
    ),
    ...maybe(
      "accepted",
      Array.isArray(value.accepted) ? texts(value.accepted) : undefined,
    ),
  };
}

// ── 지시문 · 응답 규격 ───────────────────────────────────────────

/** 풀이 검사 시스템 지시문(plan-p05a '지시문' 규칙 1~6). 고치면 기록을 다시 풀지 정한다(정할 것 카). */
export const SOLVE_INSTRUCTIONS = [
  "너는 초등학생용 영어 문제를 검토하는 사람이다. 정답을 모르는 채로 문제를 직접 푼다.",
  "입력은 JSON 하나다. area 는 영역, level 은 단계(1~12), context 는 문항들이 함께 보는 지문(passage)이나 이야기(story), items 는 문항 목록이다.",
  "문항마다 답만 JSON 으로 낸다. 받은 no 를 그대로 쓰고, 받은 문항마다 한 번씩만 답한다.",
  'answer 가 "choice" 인 문항: 보기 번호(1부터) 하나를 choice 에 쓰고 text 는 null 로 둔다. 맞는 보기가 하나면 status 는 "one", 둘 이상이면 "multiple", 없으면 "none" 이다.',
  'answer 가 "text" 인 문항: 아이가 써야 할 답 글을 대소문자 · 문장 부호까지 text 에 쓰고 choice 는 null 로 둔다. copy-tiles 는 word 를 tiles 로 그대로 쓴 글, build-tiles 는 meaningKo 뜻의 낱말을 tiles 로 만든 글, fill-letters 는 pattern 의 밑줄을 tiles 로 채운 낱말 전체, dictation 은 listen 을 듣고 받아 쓴 글, assemble-phrase · assemble-sentence 는 cards 를 모두 한 번씩 써서 만든 글, fill-blank · fix-sentence 는 prompt 가 묻는 글이다. 타일 · 카드 문항은 주어진 타일 · 카드만으로 만든다. 맞는 답이 둘 이상이면 status 는 "multiple", 없으면 "none" 이다.',
  'listAlternatives 가 true 인 문항(조립 · 받아쓰기)은 맞는 답이 여럿이어도 status 를 "one" 으로 하고 하나를 text 에 쓴 뒤, 같이 맞는 다른 답을 모두 alternatives 에 적는다. 다른 답이 없으면 빈 목록이고, 맞는 답이 없으면 status 는 "none" 이다. 그 밖의 문항은 alternatives 를 빈 목록으로 둔다.',
  "listen 은 아이에게 소리로 읽어 주는 글이다. 아이는 이 글을 보지 못하고 듣기만 한다.",
  '그림은 "그림: <한국어 뜻>" 꼴로 주어진다. 그 뜻을 나타내는 그림으로 본다.',
  "풀이 과정이나 이유는 쓰지 않는다. 답만 낸다.",
].join("\n");

/** 응답 규격(plan-p05a '응답 규격'). 수 · 길이 제약은 API 에 실리지 않으므로 번호 모음 · 범위는 판정이 본다. */
export const SolveOutputSchema = z.strictObject({
  items: z.array(
    z.strictObject({
      no: z.int(),
      status: z.enum(["one", "multiple", "none"]),
      choice: z.int().nullable(),
      text: z.string().nullable(),
      alternatives: z.array(z.string()),
    }),
  ),
});
export type SolveOutput = z.infer<typeof SolveOutputSchema>;

// ── 응답 읽기 ────────────────────────────────────────────────────

/** SDK Usage 가운데 셈에 쓰는 칸. */
export type SolveUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};
/** SDK Message 가운데 읽는 칸(stop_reason · content · usage · model, 구조 타입). */
export type SolveMessage = {
  model: string;
  stop_reason: string | null;
  content: readonly { type: string; text?: string }[];
  usage: SolveUsage;
};
/** 풀이 함수: 요청 하나를 불러 SDK 응답을 돌려준다. API 오류 · 시간 넘김은 예외로 던진다. */
export type Solver = (request: SolveRequest) => Promise<SolveMessage>;

export type SolveInterpretation =
  | { kind: "ok"; output: SolveOutput; model: string; usage: SolveUsage }
  | { kind: "refusal"; model: string; usage: SolveUsage }
  | { kind: "failed"; reason: string; model?: string; usage?: SolveUsage };

/** SDK 응답을 읽는다: stop_reason 을 먼저 보고, text 블록을 type 으로 찾아 JSON · 규격을 본다. */
export function interpretSolveMessage(
  message: SolveMessage,
): SolveInterpretation {
  const { model, usage } = message;
  if (message.stop_reason === "refusal")
    return { kind: "refusal", model, usage };
  if (message.stop_reason !== "end_turn") {
    return {
      kind: "failed",
      reason: `stop_reason ${message.stop_reason ?? "null"}`,
      model,
      usage,
    };
  }
  const block = message.content.find(
    (b) => b.type === "text" && typeof b.text === "string",
  );
  if (block?.text === undefined)
    return { kind: "failed", reason: "응답에 text 블록이 없다", model, usage };
  let json: unknown;
  try {
    json = JSON.parse(block.text);
  } catch {
    return { kind: "failed", reason: "응답이 JSON 이 아니다", model, usage };
  }
  const parsed = SolveOutputSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      kind: "failed",
      reason:
        `응답이 규격에 맞지 않는다: ${issue ? `${issue.path.join(".")} ${issue.message}` : ""}`.trim(),
      model,
      usage,
    };
  }
  return { kind: "ok", output: parsed.data, model, usage };
}

// ── 판정 ─────────────────────────────────────────────────────────

export type SolveItems = CheckRecord["solve"]["items"];
export type SolveJudgement =
  | { ok: true; items: SolveItems }
  | { ok: false; reason: string };

/** 글 답 견주기: 앞뒤 공백 · 대소문자만 무시(P4c solveStatus 의 후보 견주기와 같다, 정할 것 바). */
function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * 판정(plan-p05a '판정'): 거절은 대상 문항 모두 none, 응답 문항 번호 모음이 대상과 다르면 실패.
 * 사람 확인 여부는 정하지 않는다 — 기록을 쓴 뒤 solveStatus 가 정한다.
 */
export function judgeSolve(
  cell: SeedCell,
  request: SolveRequest,
  answer: Exclude<SolveInterpretation, { kind: "failed" }>,
): SolveJudgement {
  if (answer.kind === "refusal")
    return {
      ok: true,
      items: request.items.map((i) => ({ no: i.no, verdict: "none" })),
    };
  const wanted = request.items.map((i) => i.no);
  const got = answer.output.items.map((i) => i.no);
  const missing = wanted.filter((no) => !got.includes(no));
  const extra = got.filter((no) => !wanted.includes(no));
  const repeated = got.filter((no, i) => got.indexOf(no) !== i);
  if (missing.length + extra.length + repeated.length > 0) {
    return {
      ok: false,
      reason: `응답 문항 번호가 대상과 다르다(빠짐 ${missing.join(",") || "-"} · 더함 ${extra.join(",") || "-"} · 겹침 ${repeated.join(",") || "-"})`,
    };
  }
  const items: SolveItems = request.items.map((view) => {
    const out = answer.output.items.find((i) => i.no === view.no);
    const seed = seedAnswerOf(cell, view.no);
    const given = view.answer === "choice" ? out?.choice : out?.text;
    const solverAnswer =
      given === null || given === undefined ? {} : { solverAnswer: given };
    if (!out || out.status === "none") return { no: view.no, verdict: "none" };
    if (out.status === "multiple")
      return { no: view.no, verdict: "multiple", ...solverAnswer };
    if (view.answer === "choice") {
      return {
        no: view.no,
        verdict:
          out.choice !== null && out.choice === seed.answerNo
            ? "same"
            : "different",
        ...solverAnswer,
      };
    }
    const answerText = out.text;
    const same =
      answerText !== null &&
      (seed.accepted ?? []).some((a) => sameText(a, answerText));
    const extraAccepted: string[] = [];
    if (view.listAlternatives) {
      for (const raw of out.alternatives) {
        const candidate = raw.trim();
        if (candidate === "") continue;
        if (answerText !== null && sameText(candidate, answerText)) continue;
        if (extraAccepted.some((e) => sameText(e, candidate))) continue;
        extraAccepted.push(candidate);
      }
    }
    return {
      no: view.no,
      verdict: same ? "same" : "different",
      ...solverAnswer,
      ...(extraAccepted.length > 0 ? { extraAccepted } : {}),
    };
  });
  return { ok: true, items };
}

// ── 기록 ─────────────────────────────────────────────────────────

/** 기록의 토큰: 입력 = 입력 + 캐시 쓰기 + 캐시 읽기(null 이면 0), 출력 = 출력. */
export function tokensOf(usage: SolveUsage): {
  inputTokens: number;
  outputTokens: number;
} {
  return {
    inputTokens:
      usage.input_tokens +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0),
    outputTokens: usage.output_tokens,
  };
}

/**
 * 기록 하나(plan-p05a '기록'). 앞 기록의 사람 확인은 해시가 같을 때만 남긴다(같은 내용을 --force 로 다시 푼 때).
 * at 은 실행 시각 ISO(UTC), model 은 응답 model(실제로 답한 모델).
 */
export function buildCheckRecord(input: {
  request: SolveRequest;
  items: SolveItems;
  model: string;
  usage: SolveUsage;
  costUsd: number;
  at: string;
  previous?: CheckRecord;
}): CheckRecord {
  const { request, previous } = input;
  const human =
    previous?.human && previous.human.contentHash === request.contentHash
      ? { human: previous.human }
      : {};
  return {
    cell: request.cell,
    contentHash: request.contentHash,
    solve: {
      at: input.at,
      model: input.model,
      ...tokensOf(input.usage),
      costUsd: input.costUsd,
      items: input.items,
    },
    ...human,
  };
}

/**
 * 기록 파일 합치기: 새 기록이 같은 칸의 옛 기록을 바꾼다. 차례는 cellOrder(내용 파일의 칸 차례)이고,
 * cellOrder 에 없는 칸의 기록(지금 내용에 없는 옛 기록)은 뒤에 원래 차례로 둔다(지우지 않는다).
 */
export function mergeCheckFile(
  existing: CheckFile | undefined,
  records: readonly CheckRecord[],
  cellOrder: readonly string[],
): CheckFile {
  const byCell = new Map<string, CheckRecord>();
  for (const r of existing?.records ?? []) byCell.set(r.cell, r);
  for (const r of records) byCell.set(r.cell, r);
  const ordered = new Set(cellOrder);
  const out: CheckRecord[] = [];
  for (const key of cellOrder) {
    const r = byCell.get(key);
    if (r) out.push(r);
  }
  const tail = new Set<string>();
  for (const r of [...(existing?.records ?? []), ...records]) {
    if (ordered.has(r.cell) || tail.has(r.cell)) continue;
    tail.add(r.cell);
    out.push(byCell.get(r.cell) ?? r);
  }
  return { records: out };
}

export type HumanDecisionInput = {
  cell: string;
  contentHash: string;
  at: string;
  items: { no: number; decision: "correct" | "fixed" }[];
};

/**
 * 사람 확인 합치기(6.4, P5c 보기 화면이 부른다): 그 칸 기록이 있고 해시가 같을 때만 human 을 둔다.
 * 같은 해시의 앞 결정은 문항 번호마다 새 결정으로 바꾸고 나머지는 둔다(번호 차례). 파일을 바꾸지 않고 새 파일을 돌려준다.
 */
export function withHumanDecisions(
  file: CheckFile,
  input: HumanDecisionInput,
): { ok: true; file: CheckFile } | { ok: false; reason: string } {
  const at = file.records.findIndex((r) => r.cell === input.cell);
  const current = file.records[at];
  if (!current || current.contentHash !== input.contentHash)
    return { ok: false, reason: "풀이 기록이 없거나 내용이 바뀌었다" };
  const decisions = new Map<number, "correct" | "fixed">();
  if (current.human?.contentHash === input.contentHash) {
    for (const i of current.human.items) decisions.set(i.no, i.decision);
  }
  for (const i of input.items) decisions.set(i.no, i.decision);
  const updated: CheckRecord = {
    ...current,
    human: {
      contentHash: input.contentHash,
      at: input.at,
      items: [...decisions]
        .sort(([a], [b]) => a - b)
        .map(([no, decision]) => ({ no, decision })),
    },
  };
  return {
    ok: true,
    file: {
      records: file.records.map((r, i) => (i === at ? updated : r)),
    },
  };
}

// ── 단가 · 비용 · 조합 ───────────────────────────────────────────

/** 그 모델의 단가 행 가운데 effectiveFrom ≤ 날짜(YYYY-MM-DD)인 가장 늦은 행. */
export function priceOf(
  models: readonly ModelPrice[],
  model: string,
  onDate: string,
): ModelPrice | undefined {
  let best: ModelPrice | undefined;
  for (const row of models) {
    if (row.model !== model || row.effectiveFrom > onDate) continue;
    if (!best || row.effectiveFrom > best.effectiveFrom) best = row;
  }
  return best;
}

/** 비용(달러): 입력 · 출력 · 캐시 쓰기 · 캐시 읽기 토큰 × 단가 ÷ 100만, 소수 COST_DECIMALS 자리 반올림. */
export function costOf(usage: SolveUsage, price: ModelPrice): number {
  const raw =
    (usage.input_tokens * price.inputUsdPerMTok +
      usage.output_tokens * price.outputUsdPerMTok +
      (usage.cache_creation_input_tokens ?? 0) * price.cacheWriteUsdPerMTok +
      (usage.cache_read_input_tokens ?? 0) * price.cacheReadUsdPerMTok) /
    TOKENS_PER_MTOK;
  return roundCost(raw);
}

/** 비용 반올림(소수 COST_DECIMALS 자리). */
export function roundCost(usd: number): number {
  const scale = 10 ** COST_DECIMALS;
  return Math.round(usd * scale) / scale;
}

/** 단가 행이 이 호출 설정(생각 끔 단계 · effort)을 받는가(6.1 조합 표를 model_prices 시드에서 읽음). */
export function solveCallAccepted(
  price: ModelPrice,
  call: { thinking: string; effort: Effort },
): boolean {
  return (
    price.thinkingOff === call.thinking &&
    price.thinkingOffEfforts.includes(call.effort)
  );
}

// ── 대상 칸 ──────────────────────────────────────────────────────

export type SolveTargetOptions = {
  areas?: readonly Area[];
  /** 단계 거르기(칸 키의 단계, 토리 이야기는 구간 첫 단계). */
  levels?: { min: number; max: number } | null;
  /** 내용 파일 하나(seed/ 뿌리 기준 경로). */
  file?: string | null;
  /** 해시가 그대로인 칸도 다시 푼다. */
  force?: boolean;
};
export type SolveTargets = {
  seed: CollectedSeed;
  /** 풀 칸(걷기 차례). */
  targets: CollectedCell[];
  /** 검증에 걸려 건너뛴 칸. */
  skipped: CollectedCell[];
};

/** 내용 파일 경로인가(lessons · level-tests · placement · stories). */
export function isContentFilePath(path: string): boolean {
  const parsed = parseSeedPath(path);
  return (
    parsed !== null &&
    parsed.kind !== "reference" &&
    parsed.kind !== "checks" &&
    parsed.kind !== "reviews"
  );
}

/**
 * 대상 칸(plan-p05a '대상 칸'): (1) 풀이 대상 문항이 있고 (3) 단계 · 파일 거르기에 맞는 칸 가운데,
 * (2) PR 모드 검증에 걸린 칸은 건너뛰고, (4) --force 이거나 기록이 없거나 기록 해시가 지금 해시와 다른 칸을 고른다.
 */
export function selectSolveTargets(
  files: ReadonlyMap<string, string>,
  options: SolveTargetOptions,
): SolveTargets {
  const areas = options.areas ? { areas: options.areas } : {};
  const seed = collectCells(files, areas);
  const report = validateSeed(files, { mode: "pr", ...areas });
  const failed = new Set<string>([...seed.failedKeys, ...seed.brokenKeys]);
  for (const e of report.errors) if (e.cell) failed.add(e.cell);
  const targets: CollectedCell[] = [];
  const skipped: CollectedCell[] = [];
  for (const cell of seed.cells) {
    if (solveTargets(cell).length === 0) continue;
    const level = cellLevel(cell.key);
    if (
      options.levels &&
      (level === undefined ||
        level < options.levels.min ||
        level > options.levels.max)
    )
      continue;
    if (options.file && cell.file !== options.file) continue;
    if (failed.has(cell.key)) {
      skipped.push(cell);
      continue;
    }
    const existing = seed.records.get(cell.key);
    if (
      options.force ||
      !existing ||
      existing.contentHash !== cellHash(cell.key, cell.value)
    )
      targets.push(cell);
  }
  return { seed, targets, skipped };
}
