// 회화 대본 지표(talk:metrics — 'AI 몫 넓힘' spec 설계 8 · plan 묶음 4-나 · AC-8 (가) · AC-N2 · AC-N3). talk:observe 가 저장한 JSON 보고를
// 다시 세어 지표마다 분자 · 분모를 대본마다 · 합계로 내고(두 바퀴를 합친 셈, 분모 10 아래는 건수), 기술 오류 자리(들리지 않음 · 호출 실패)를
// 따로 세며, '가르는 것' 넷의 자동 보조 셈을 적는다. --baseline 기준선 (가) 보고와 견준 표 · 기준 판정 · 기회 알림(--chance-alert)과 설계
// 검토자가 읽을 차례 목록(걸린 차례 + 첫 바퀴 전문)을 만든다. 수치는 실측 · 검증 기준이고 선생님이 맞출 목표가 아니다(13절 C211 (2)).
// 자동 셈은 사람 판정의 보조이고 사람 판정 칸은 비워 둔다(□).
// 표 끝에는 실제 입력 지표 넷(못 알아들음 · 같은 꼴 반응 · 도움 차례 비율 · 카드 글 그대로 붙임 — 13절 C217 (4) · AC-15zl, 셈은
// talk-replay-metrics)을 붙인다. 재생 대본(대본 칸 replay)은 차례별 선생님 말 표도 함께 낸다.
// 사용: pnpm talk:metrics <보고 json> [--baseline <json>] [--chance-alert <0~1>] [--out <폴더>]
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { soundLinePlacesOf } from "../src/core/conversation/cue-line";
import { NOW_LETS_TALK } from "../src/core/conversation/lesson-flow";
import { CLOSED_CLASS_PASS_WORDS } from "../src/core/conversation/question-check";
import {
  isShortReaction,
  SHORT_REACTION_MAX_WORDS,
} from "../src/core/conversation/situation";
import { MORE_PROMPT, normalizeSpoken } from "../src/core/conversation/spoken";
import { isQuestionSentence } from "../src/core/conversation/stream";
import type { TalkCard } from "../src/core/seed/schema/talk";
import { splitSentences, tokenize } from "../src/core/seed/text";
import { lemmaLookup } from "../src/core/session/attempt";
import {
  CHANCE_ALERT_DEFAULT,
  CHILD_DONT_KNOW_TEXT,
  CHILD_NOSPEECH_TEXT,
  chanceAlertOf,
  isSoundCue,
  type Materials,
  materialsOf,
  type RunReport,
  readSeedFiles,
  type TurnRecord,
} from "./talk-observe";
import {
  type CardLine,
  cardLinesOf,
  replayJson,
  replayMarkdown,
  replayMetricsOf,
} from "./talk-replay-metrics";

// ── 판정 상수(spec 설계 8 표의 잠정 기준 · 판정 단위 — 앱 설정값이 아니라 대본 도구의 판정 문턱) ──

/** 분모가 이보다 작은 지표는 비율 대신 건수로 판정한다(설계 8 '판정 단위'). */
export const COUNT_BELOW = 10;
/** 고정 문장 차례 비율 상한(1/10 이하). */
export const FIXED_MAX = 0.1;
/** 틀에 박힌 맞장구 꼴 비율 상한(절반 이하, 고침 전보다 낮음). */
export const STOCK_MAX = 0.5;
/** 불필요하게 어려운 낱말 비율 상한(1/10 이하, 사람 판정이 가른 낱말에 건다). */
export const OFFBAND_MAX = 0.1;
/** 첫 문장 p95 가 고침 전보다 늦어도 되는 폭(AC-N2, 0.3초). */
export const FIRST_SENTENCE_SLACK_MS = 300;
/** NFR-8 첫 문장 목표(2.5초) — AC-N2 '차이는 따로 적는다'. */
export const NFR8_FIRST_SENTENCE_MS = 2500;
/** 턴 출력 토큰 중앙값 · 턴 비용 중앙값이 기준선보다 이만큼 넘게 늘면 보고 첫머리에 알린다(plan 위험 12, 판정 기준이 아님). */
export const OUTPUT_TOKENS_ALERT = 0.3;
export const TURN_COST_ALERT = 0.2;
/** 짧은 반응 한 문장의 낱말 수 상한(05:38 '네 낱말 안의 짧은 반응'). 틀에 박힌 맞장구 꼴의 자동 셈에 쓴다 — 상황 차례 검사와 같은 core 상수(판정 r2 N-1). */
export { SHORT_REACTION_MAX_WORDS };
/** ㉠ '한두 낱말 답'의 낱말 수 상한. */
export const SHORT_ANSWER_MAX_WORDS = 2;
/** 자기 이야기로 볼 'I … · My …' 문장의 가장 짧은 낱말 수('I see!' 같은 맞장구를 빼려는 자동 보조 문턱). */
export const SELF_LINE_MIN_WORDS = 3;
/** 자기 이야기 빈도 참고값 설정 키(설계 3). */
export const SELF_LINE_KEY = "talk.self_line_every_turns";
/**
 * 일반 맞장구 · 칭찬의 내용어('Nice!' · 'Great!' · 'Good job!' 꼴 — 설계 8 '틀에 박힌 맞장구 꼴'). 기능어(oh · wow · okay · yes …)는 셈에서
 * 빠지므로 여기에는 내용어만 둔다. 자동 보조 셈의 목록이고 판정은 사람이 한다.
 */
export const STOCK_REACTION_WORDS: ReadonlySet<string> = new Set([
  "nice",
  "great",
  "good",
  "cool",
  "awesome",
  "wonderful",
  "excellent",
  "super",
  "yay",
  "job",
  "well",
  "done",
  "amazing",
  "perfect",
  "right",
  "very",
  "sound",
  "sounds",
]);
/** 예 · 아니요 답(내용어가 없는 답 — 이어짐 · 맞장구 셈은 바로 앞 질문의 명사 · 형용사로 뜻을 받았는지 본다). */
const YES_NO_WORDS: ReadonlySet<string> = new Set([
  "yes",
  "no",
  "yeah",
  "yep",
  "nope",
  "okay",
  "ok",
]);
/** 내용어가 아닌 품사(어휘 시드 pos). */
const NON_CONTENT_POS: ReadonlySet<string> = new Set([
  "function",
  "pronoun",
  "number",
]);
const P50 = 0.5;
const P90 = 0.9;
const P95 = 0.95;
const PERCENT = 100;
const EXIT_OK = 0;
const EXIT_INPUT = 2;
/** 프롬프트의 예 문장: 작은따옴표(안의 줄임꼴 ' 는 지남) · 큰따옴표로 감싼 영어 문장. */
const SINGLE_QUOTED = /(?<![A-Za-z])'([A-Z{][^\n]*?[.!?])'(?![A-Za-z])/g;
const DOUBLE_QUOTED = /"([A-Z{][^"\n]*?[.!?])"/g;
const SELF_START = /^(?:i|i'm|i am|my|let's pretend)\b/i;
const ME_TOO = /^me too\b/i;

// ── 입력 ─────────────────────────────────────────────────────────

/** talk:observe JSON 보고(지표가 읽는 칸만 — 나머지 칸은 그대로 둔다). */
export type ObserveJson = {
  date: string;
  effort: string;
  rounds: number;
  runs: RunReport[];
};

const ObserveJsonSchema = z.looseObject({
  date: z.string(),
  effort: z.string(),
  rounds: z.int().min(1),
  runs: z.array(
    z.looseObject({
      script: z.looseObject({
        name: z.string(),
        level: z.int(),
        unit: z.int(),
        lesson: z.int(),
        teacher: z.string(),
      }),
      round: z.int().min(1),
      turns: z.array(z.looseObject({ no: z.int(), teacher: z.string() })),
      opening: z.array(z.string()),
    }),
  ),
});

/** JSON 보고 꼴 확인(지표가 읽는 칸이 없으면 그 까닭). */
export function parseObserveJson(
  raw: unknown,
  where: string,
): { ok: true; json: ObserveJson } | { ok: false; error: string } {
  const parsed = ObserveJsonSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      error: `talk:observe JSON 보고 꼴이 아니다(${where}): ${parsed.error.issues[0]?.path.join(".") ?? ""} ${parsed.error.issues[0]?.message ?? ""}`,
    };
  return { ok: true, json: raw as ObserveJson };
}

// ── 재료(시드 · 프롬프트) ─────────────────────────────────────────

/** 대본 하나를 셀 재료. */
export type MetricsKit = {
  level: number;
  /** 고르기 꼴 단계인가(단계 규격 choices — 소리 줄 자리 셈, 코드 검토 Minor 5). */
  choicesLevel: boolean;
  /** 고정 문장(정규화 글 — 프롬프트 · 정본의 예 문장, 앱 고정 대사, 안전한 대사 · 짧은 칭찬 대사, 상황 줄, 신호 말). */
  fixed: ReadonlySet<string>;
  /** 시드 신호 말 줄(정규화 글). */
  cueLines: ReadonlySet<string>;
  /** 어휘 시드 품사(소문자 낱말 · 원형 → pos, 모르면 undefined). */
  posOf: (word: string) => readonly string[] | undefined;
  lemmaOf: (word: string) => string | undefined;
  /** 그 단계 범위 안인가(어휘 범위 · 이번 단원 단어 · 선생님 이름 · 감탄 · 수업 말 허용 목록 — 아이 낱말은 셈 때 따로 본다). */
  inRange: (word: string) => boolean;
  /** 장면 여는 질문 글(정규화, 카드에 칸이 없으면 null). */
  sceneOpener: string | null;
  /** 카드 질문(필수 · 더 이야기할 거리 · 장면 여는 질문 · 그 쉬운 질문, 정규화)과 답 예시. */
  cardItems: readonly CardItemText[];
  /** 카드 필수 질문 · 더 이야기할 거리 글의 문장(장면 문장 · 질문 문장 — 실제 입력 지표 (라) '카드 글 그대로 붙임', AC-15zl). */
  cardLines: readonly CardLine[];
  /** 자기 이야기 빈도 참고값(talk.self_line_every_turns — 대본 덮음 › 설정 파일, 없으면 null). */
  selfLineEvery: number | null;
};

export type CardItemText = {
  kind: "required" | "more" | "scene";
  no: number;
  questions: string[];
  answer: string;
};

/** 시드에서 한 번 읽는 것(대본마다 재료를 만들 때 쓴다). */
export type MetricsSeed = {
  materialsOf: (where: RunReport["script"]) => Materials | null;
  allowed: readonly string[];
  situationLines: readonly string[];
  cueLines: readonly string[];
  posOf: (word: string) => readonly string[] | undefined;
  settings: ReadonlyMap<string, unknown>;
};

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** 목록 JSON 의 en 글 전부(forbidden 칸 밖, 깊이 상관없이). */
export function englishLinesIn(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(englishLinesIn);
  if (value === null || typeof value !== "object") return [];
  const out: string[] = [];
  for (const [key, inner] of Object.entries(value)) {
    if (key === "forbidden") continue;
    if (key === "en" && typeof inner === "string") out.push(inner);
    else out.push(...englishLinesIn(inner));
  }
  return out;
}

const ListAllowed = z.looseObject({ allowed: z.array(z.string()) });
const VocabPos = z.looseObject({
  vocab: z.array(
    z.looseObject({
      word: z.string(),
      pos: z.array(z.string()),
      forms: z.array(z.string()),
    }),
  ),
});
const SettingsRows = z.looseObject({
  settings: z.array(z.looseObject({ key: z.string(), value: z.unknown() })),
});

/** 시드 읽기(목록 파일이 아직 없으면 빈 목록 — 기준선 워크트리에서도 돈다). */
export function loadMetricsSeed(root: string): MetricsSeed {
  const at = (...p: string[]) => join(root, "seed", ...p);
  const optional = (path: string): unknown =>
    existsSync(path) ? readJson(path) : null;
  const vocab = VocabPos.parse(readJson(at("vocab.json"))).vocab;
  const lemma = lemmaLookup(vocab);
  const pos = new Map(vocab.map((v) => [v.word.toLowerCase(), v.pos]));
  const allowed = ListAllowed.safeParse(
    optional(at("lists", "talk-allowed-words.json")),
  );
  const settings = SettingsRows.parse(readJson(at("settings.json"))).settings;
  const cache = new Map<string, Materials | null>();
  return {
    materialsOf: (where) => {
      const key = `${where.level}-${where.unit}-${where.lesson}-${where.teacher}`;
      if (!cache.has(key)) {
        const m = materialsOf(
          readSeedFiles(root, where.level, where.unit),
          where,
        );
        cache.set(key, m.ok ? m.materials : null);
      }
      return cache.get(key) ?? null;
    },
    allowed: allowed.success ? allowed.data.allowed : [],
    situationLines: englishLinesIn(
      optional(at("lists", "talk-situation-lines.json")),
    ),
    cueLines: englishLinesIn(optional(at("lists", "talk-cue-lines.json"))),
    posOf: (word) => {
      const lower = word.toLowerCase();
      return pos.get(lower) ?? pos.get(lemma(lower)?.toLowerCase() ?? "");
    },
    settings: new Map(settings.map((r) => [r.key, r.value])),
  };
}

/** 정규화한 문장들(빈 것 뺌). */
function normalizedSentences(text: string): string[] {
  return splitSentences(text)
    .map(normalizeSpoken)
    .filter((s) => s !== "");
}

/** 시스템 프롬프트의 예 문장(따옴표로 감싼 영어 문장 — 문장마다 정규화). */
export function promptExampleSentences(systemPrompt: string): string[] {
  const out = new Set<string>();
  for (const re of [SINGLE_QUOTED, DOUBLE_QUOTED])
    for (const m of systemPrompt.matchAll(re))
      for (const s of normalizedSentences(m[1] ?? "")) out.add(s);
  return [...out];
}

function cardItemsOf(card: TalkCard): CardItemText[] {
  const items: CardItemText[] = [
    ...card.required.map((r) => ({
      kind: "required" as const,
      no: r.no,
      questions: [normalizeSpoken(r.en), normalizeSpoken(r.easyQuestion.en)],
      answer: r.answerExample,
    })),
    ...card.more.map((r) => ({
      kind: "more" as const,
      no: r.no,
      questions: [normalizeSpoken(r.en), normalizeSpoken(r.easyQuestion.en)],
      answer: r.answerExample,
    })),
  ];
  if (card.sceneOpener)
    items.push({
      kind: "scene",
      no: 0,
      questions: [
        normalizeSpoken(card.sceneOpener.question.en),
        normalizeSpoken(card.sceneOpener.easyQuestion.en),
      ],
      answer: card.sceneOpener.answerExample,
    });
  return items.map((i) => ({
    ...i,
    questions: i.questions.filter((q) => q !== ""),
  }));
}

/** 대본 하나를 셀 재료(시드에 카드가 없으면 null — 그 대본은 건너뛴다). */
export function kitOf(
  seed: MetricsSeed,
  run: Pick<RunReport, "script" | "systemPrompt" | "overrides">,
): MetricsKit | null {
  const m = seed.materialsOf(run.script);
  if (!m) return null;
  const card = m.card;
  const fixedLines = [
    ...promptExampleSentences(run.systemPrompt ?? ""),
    ...[
      ...card.safeLines.map((l) => l.en),
      ...card.praiseLines,
      ...card.closingLines.map((l) => l.en),
      card.farewell.en,
      card.safetyFarewell.en,
      MORE_PROMPT.en,
      NOW_LETS_TALK,
      ...seed.situationLines,
      ...seed.cueLines,
    ].flatMap(normalizedSentences),
  ];
  const allowed = new Set(seed.allowed.map((w) => w.toLowerCase()));
  const unit = new Set(m.ctx.unitWords.map((w) => w.toLowerCase()));
  const teacher = m.teacher.nameEn.toLowerCase();
  const override = (run.overrides ?? []).findLast(
    (o) => o.key === SELF_LINE_KEY,
  );
  const every = override ? override.value : seed.settings.get(SELF_LINE_KEY);
  return {
    level: m.level,
    choicesLevel: m.spec.choices,
    fixed: new Set(fixedLines),
    cueLines: new Set(seed.cueLines.map(normalizeSpoken)),
    posOf: seed.posOf,
    lemmaOf: m.lemmaOf,
    inRange: (word) => {
      const w = word.toLowerCase();
      return (
        m.allowedWords.has(w) ||
        unit.has(w) ||
        allowed.has(w) ||
        w === teacher ||
        w === `${teacher}s`
      );
    },
    sceneOpener: card.sceneOpener
      ? normalizeSpoken(card.sceneOpener.question.en)
      : null,
    cardItems: cardItemsOf(card),
    cardLines: cardLinesOf(card),
    selfLineEvery: typeof every === "number" && every > 0 ? every : null,
  };
}

// ── 낱말 ─────────────────────────────────────────────────────────

/** 낱말 토큰 수(틀 자리 · 수 뺌). */
export function wordCount(text: string): number {
  return tokenize(text).filter((t) => t.kind === "word").length;
}

/** 낱말(소문자 · 줄임꼴을 펼침 — that's → that is, 6.2 일치율 정규화와 같은 표). 틀 자리 · 수는 뺀다. */
export function wordsOf(text: string): string[] {
  return tokenize(text)
    .filter((t) => t.kind === "word")
    .flatMap((t) => normalizeSpoken(t.text).split(" "))
    .filter((w) => w !== "");
}

function isContent(kit: MetricsKit, word: string): boolean {
  const pos = kit.posOf(word);
  return pos === undefined || !pos.every((p) => NON_CONTENT_POS.has(p));
}

/** 낱말의 견줄 열쇠(소문자 · 원형). */
function keysOf(kit: MetricsKit, word: string): string[] {
  const lemma = kit.lemmaOf(word)?.toLowerCase();
  return lemma && lemma !== word ? [word, lemma] : [word];
}

function contentKeys(kit: MetricsKit, text: string): Set<string> {
  const out = new Set<string>();
  for (const w of wordsOf(text))
    if (isContent(kit, w)) for (const k of keysOf(kit, w)) out.add(k);
  return out;
}

function hasKey(kit: MetricsKit, text: string, keys: ReadonlySet<string>) {
  return wordsOf(text).some((w) => keysOf(kit, w).some((k) => keys.has(k)));
}

/** 예 · 아니요 답인가(내용어 없이 yes · no 꼴만). */
function isYesNo(kit: MetricsKit, text: string): boolean {
  const words = wordsOf(text);
  return (
    words.some((w) => YES_NO_WORDS.has(w)) &&
    words.every((w) => !isContent(kit, w))
  );
}

/** 명사 · 형용사 내용어(예 · 아니요 답이 받은 질문의 뜻). */
function nounKeys(kit: MetricsKit, text: string): Set<string> {
  const out = new Set<string>();
  for (const w of wordsOf(text)) {
    const pos = kit.posOf(w);
    if (pos?.some((p) => p === "noun" || p === "adjective"))
      for (const k of keysOf(kit, w)) out.add(k);
  }
  return out;
}

/** 자기 이야기 문장('I like …' · 'My …' · 'Me too!' · 'Let's pretend …' — 자동 보조, 판정은 사람). */
export function isSelfLine(sentence: string): boolean {
  const t = sentence.trim().replace(/[’‘]/g, "'");
  if (isQuestionSentence(t)) return false;
  if (ME_TOO.test(t)) return true;
  return SELF_START.test(t) && wordCount(t) >= SELF_LINE_MIN_WORDS;
}

/** 신호 말 문장(서버 신호 구 사본 · 시드 신호 말 줄). */
function isCue(kit: MetricsKit, sentence: string): boolean {
  return isSoundCue(sentence) || kit.cueLines.has(normalizeSpoken(sentence));
}

// ── 차례 셈 ──────────────────────────────────────────────────────

/** 한 차례(아이 말 → 선생님 응답)의 셈 재료. */
export type TurnFacts = {
  no: number;
  /** 말로 답함(들리지 않음 · '잘 모르겠어요' 아님). */
  spoke: boolean;
  /** 말로 답했고 앱이 막힘으로 보지 않음. */
  answered: boolean;
  nospeech: boolean;
  /** 호출 실패 · 거절 · 읽지 못함 · 재질문 실패(4-가 techError.call). */
  callTech: boolean;
  /** 기술 오류 자리(들리지 않음 · 호출 쪽). */
  tech: boolean;
  /** 상황 차례(인사 끝 · 받침 · 들리지 않음, 설계 1). */
  situation: boolean;
  talkSegment: boolean;
  /** AI 가 쓴 문장(문장 문 · 검사 뒤 남은 것). */
  ai: string[];
  /** ai 가운데 앱이 넣은 상황 줄 문장을 뺀 것(AI 몫 — M-5 (나) 'AI 글이 예문 그대로' 셈). */
  aiOwn: string[];
  /** 앱이 상황 줄을 넣은 차례(상황 검사로 바꿈 · 반응 자리 — M-5 (가) 설계상 교체). */
  appSituation: boolean;
  /** 검사 앞 원문 문장(응답 tori_en). */
  raw: string[];
  /** 앱이 붙인 줄의 문장. */
  attach: string[];
  /** 이 차례 앞 선생님 쪽 글(앞 차례 응답 · 앱 다음 차례, 첫 차례는 앱 첫 차례). */
  before: string;
  /** 아이 말의 내용어 열쇠(예 · 아니요 답이면 바로 앞 질문의 명사 · 형용사). */
  childKeys: Set<string>;
  childWords: number;
  /** 이 차례 선생님 쪽 낱말(AI 글 · 붙인 줄 · 소리 줄 · 앱 다음 차례). */
  teacherWords: number;
  beforeWords: number;
  /** 자동 표시(지표 이름). */
  flags: string[];
};

function responseText(t: TurnRecord): string {
  return [t.teacher, ...t.attach, ...t.appAfter].join(" ");
}

function soundWords(t: TurnRecord): number {
  return [t.sound.model ?? "", ...(t.sound.choices ?? []), t.sound.answer ?? ""]
    .map(wordCount)
    .reduce((a, b) => a + b, 0);
}

function lastQuestionOf(text: string): string {
  return splitSentences(text).filter(isQuestionSentence).at(-1) ?? "";
}

/** 대본 한 바퀴의 차례 재료. */
export function turnFactsOf(run: RunReport, kit: MetricsKit): TurnFacts[] {
  const out: TurnFacts[] = [];
  let before = run.opening.join(" ");
  let beforeWords = wordCount(before);
  for (const t of run.turns) {
    const mark = t.techError ?? null;
    const nospeech = mark?.nospeech === true || t.child === CHILD_NOSPEECH_TEXT;
    const callTech = (mark?.call ?? null) !== null;
    const spoke =
      !nospeech && t.child !== CHILD_DONT_KNOW_TEXT && t.child.trim() !== "";
    const answered = spoke && !(t.stuck?.app ?? false);
    const childKeys = !spoke
      ? new Set<string>()
      : isYesNo(kit, t.child)
        ? nounKeys(kit, lastQuestionOf(before))
        : contentKeys(kit, t.child);
    const ai = callTech ? [] : splitSentences(t.teacher);
    const appLines = situationLinesOfRecord(t);
    const appSentences = new Set(
      appLines.flatMap(splitSentences).map(normalizeSpoken),
    );
    const aiOwn = ai.filter((s) => !appSentences.has(normalizeSpoken(s)));
    out.push({
      no: t.no,
      spoke,
      answered,
      nospeech,
      callTech,
      tech: nospeech || callTech,
      situation:
        t.segment === "greeting_end" || (t.move?.stage ?? 0) > 0 || nospeech,
      talkSegment: t.segment === "talk" || t.segment === "more_talk",
      ai,
      aiOwn,
      appSituation: !callTech && appLines.length > 0,
      raw: t.output ? splitSentences(t.output.tori_en) : [],
      attach: t.attach.flatMap(splitSentences),
      before,
      childKeys,
      childWords: spoke ? wordCount(t.child) : 0,
      teacherWords: wordCount(responseText(t)) + soundWords(t),
      beforeWords,
      flags: [],
    });
    before = responseText(t);
    beforeWords = wordCount(before) + soundWords(t);
  }
  return out;
}

/** 상황 줄로 바꾼 표시 글('상황 줄로 바꿈("AI" → "줄")' · '반응 자리에 상황 줄("줄")') — situationLines 칸이 없는 옛 보고 읽기. */
const SITUATION_FLAG = /(?:→ "|반응 자리에 상황 줄\(")(.+?)"\)?$/;

/** 그 차례에 앱이 넣은 상황 줄 글(보고 칸, 없으면 표시 글에서 — M-5). */
export function situationLinesOfRecord(
  t: Pick<TurnRecord, "flags"> & { situationLines?: string[] },
): string[] {
  if (t.situationLines !== undefined) return t.situationLines;
  return t.flags.flatMap((flag) => {
    if (
      !flag.startsWith("상황 줄로 바꿈") &&
      !flag.startsWith("반응 자리에 상황 줄")
    )
      return [];
    const hit = SITUATION_FLAG.exec(flag);
    return hit?.[1] ? [hit[1]] : [];
  });
}

/** 고정 문장 차례: AI 가 쓴 문장이 모두 고정 문장과 정규화 글이 같다. */
export function isFixedTurn(kit: MetricsKit, ai: readonly string[]): boolean {
  const norm = ai.map(normalizeSpoken).filter((s) => s !== "");
  return norm.length > 0 && norm.every((s) => kit.fixed.has(s));
}

/** 틀에 박힌 맞장구 꼴: 일반 맞장구 · 칭찬 한 문장(아이 말 내용어 없음)뿐이고 질문 하나로 끝난다. */
export function isStockTurn(kit: MetricsKit, f: TurnFacts): boolean {
  const reactions = f.ai.filter((s) => !isQuestionSentence(s));
  const shown = [...f.ai, ...f.attach];
  const questions = shown.filter(isQuestionSentence);
  const only = reactions[0];
  if (reactions.length !== 1 || only === undefined) return false;
  if (questions.length !== 1 || !isQuestionSentence(shown.at(-1) ?? ""))
    return false;
  if (wordCount(only) > SHORT_REACTION_MAX_WORDS) return false;
  if (hasKey(kit, only, f.childKeys)) return false;
  return wordsOf(only)
    .filter((w) => isContent(kit, w))
    .every((w) => STOCK_REACTION_WORDS.has(w));
}

/** 범위 밖 내용어(질문 밖 문장 하나 — 닫힌 품사 한 낱말뿐이면 범위 안, C203 (2)). */
export function offbandIn(
  kit: MetricsKit,
  sentence: string,
  childSaid: ReadonlySet<string>,
): { content: number; off: string[] } {
  const content = wordsOf(sentence).filter((w) => isContent(kit, w));
  const off = content.filter(
    (w) => !keysOf(kit, w).some((k) => kit.inRange(k) || childSaid.has(k)),
  );
  const closedOnly =
    off.length === 1 && CLOSED_CLASS_PASS_WORDS.has(off[0] ?? "");
  return { content: content.length, off: closedOnly ? [] : off };
}

/** 받침 · 들리지 않음 차례의 그 자리 답 예시(앱이 붙인 답 소리, 없으면 앞 질문 글에 든 카드 항목의 답 예시). */
function answerOf(kit: MetricsKit, t: TurnRecord, before: string): string {
  if (t.sound.answer) return t.sound.answer;
  const text = normalizeSpoken(before);
  let best: { at: number; answer: string } | null = null;
  for (const item of kit.cardItems)
    for (const q of item.questions) {
      const at = text.lastIndexOf(q);
      if (at >= 0 && (best === null || at > best.at))
        best = { at, answer: item.answer };
    }
  return best?.answer ?? "";
}

/** 답 글 낱말: 답 예시의 내용어 가운데 질문 글(장면 문장 포함)에 없는 것. */
function answerWordsOf(
  kit: MetricsKit,
  answer: string,
  question: string,
): Set<string> {
  const asked = contentKeys(kit, question);
  const out = new Set<string>();
  for (const k of contentKeys(kit, answer)) if (!asked.has(k)) out.add(k);
  return out;
}

/**
 * 소리 줄 자리(설계 4 표 '남기는 차례' 밖이면 그 줄 수). 자리는 회화 턴 정규화와 같은 core 함수(cue-line soundLinePlacesOf — 판정 r1 I-5)로
 * 본다. 고르기 단계는 1단계다(단계 규격 choices 와 같음).
 */
export function soundOutsideOf(
  t: TurnRecord,
  level: number,
  /** 고르기 꼴 단계인가(단계 규격 choices — 서버 정규화와 같은 재료, 코드 검토 Minor 5). 없으면 1단계로 본다. */
  choicesLevel: boolean = level === 1,
): number {
  const places = soundLinePlacesOf({
    stage: t.move?.stage ?? 0,
    nospeech: t.techError?.nospeech === true,
    next: t.move?.next,
    choicesLevel,
  });
  let n = 0;
  if (t.sound.model !== undefined && !places.model) n++;
  if (t.sound.choices !== undefined && !places.choices) n++;
  if (t.sound.answer !== undefined && !places.answer) n++;
  return n;
}

// ── 모으기 ───────────────────────────────────────────────────────

export type Ratio = { num: number; den: number };

/** 대본 하나(또는 합계)의 셈. 중앙값 · 백분위 재료는 값 목록으로 둔다. */
export type Tally = {
  runs: number;
  /** (나) AI 몫 문장이 모두 고정 문장인 차례(M-5 — 기준 판정). */
  fixed: Ratio;
  /** (가) 앱이 상황 줄을 넣은 차례 수(M-5 — 설계상 교체, 건수로 보임). */
  appSituation: number;
  /** AI 몫이 맞장구 한 문장(들)뿐이고 예문과 같은 차례 수((나)에서 뺌 — 판정 r3 M-r3-5). */
  fixedReaction: number;
  /** 원문(검사 앞 응답, 아이에게 나가지 않은 글 포함)의 범위 밖 낱말 수(판정 r3 M-r3-5 — 보고만). */
  offbandRaw: number;
  repeats: number;
  nospeech: number;
  nospeechFixed: number;
  callTech: number;
  stock: Ratio;
  stockSpoke: Ratio;
  linked: Ratio;
  offband: Ratio;
  offbandWords: Record<string, number>;
  techOffband: Ratio;
  answerSent: number;
  answerRaw: number;
  soundOutside: number;
  cueOverlap: number;
  scene: Ratio;
  teacherWords: number;
  childWords: number;
  techTeacherWords: number;
  before: number[];
  longA: number;
  longB: number;
  longC: number;
  aiTurns: number;
  selfTurns: number;
  calls: number;
  reasks: number;
  techRecalls: number;
  first: number[];
  firstReask: number[];
  required: number;
  more: number;
  contextless: number;
  latency: number[];
  inputTokens: number;
  outputTokens: number;
  outputs: number[];
  costUsd: number;
  costs: number[];
  maxTokens: number;
  checkHits: number;
};

export function emptyTally(): Tally {
  const r = (): Ratio => ({ num: 0, den: 0 });
  return {
    runs: 0,
    fixed: r(),
    appSituation: 0,
    fixedReaction: 0,
    offbandRaw: 0,
    repeats: 0,
    nospeech: 0,
    nospeechFixed: 0,
    callTech: 0,
    stock: r(),
    stockSpoke: r(),
    linked: r(),
    offband: r(),
    offbandWords: {},
    techOffband: r(),
    answerSent: 0,
    answerRaw: 0,
    soundOutside: 0,
    cueOverlap: 0,
    scene: r(),
    teacherWords: 0,
    childWords: 0,
    techTeacherWords: 0,
    before: [],
    longA: 0,
    longB: 0,
    longC: 0,
    aiTurns: 0,
    selfTurns: 0,
    calls: 0,
    reasks: 0,
    techRecalls: 0,
    first: [],
    firstReask: [],
    required: 0,
    more: 0,
    contextless: 0,
    latency: [],
    inputTokens: 0,
    outputTokens: 0,
    outputs: [],
    costUsd: 0,
    costs: [],
    maxTokens: 0,
    checkHits: 0,
  };
}

/** 두 셈을 더한다(대본 → 합계). */
export function addTally(a: Tally, b: Tally): Tally {
  const out = emptyTally();
  for (const key of Object.keys(out) as (keyof Tally)[]) {
    const x = a[key];
    const y = b[key];
    if (typeof x === "number" && typeof y === "number")
      (out[key] as number) = x + y;
    else if (Array.isArray(x) && Array.isArray(y))
      (out[key] as number[]) = [...x, ...y];
    else if (key === "offbandWords") {
      const words: Record<string, number> = { ...a.offbandWords };
      for (const [w, n] of Object.entries(b.offbandWords))
        words[w] = (words[w] ?? 0) + n;
      out.offbandWords = words;
    } else {
      const rx = x as Ratio;
      const ry = y as Ratio;
      (out[key] as Ratio) = { num: rx.num + ry.num, den: rx.den + ry.den };
    }
  }
  return out;
}

/** 대본 한 바퀴를 센다. 차례 재료의 flags 에 걸린 지표를 적는다(설계 검토자 목록). */
export function tallyRun(
  run: RunReport,
  kit: MetricsKit,
): { tally: Tally; facts: TurnFacts[] } {
  const t = emptyTally();
  t.runs = 1;
  const facts = turnFactsOf(run, kit);
  const seenSituation = new Set<string>();
  const childSaid = new Set<string>();
  let aiIndex = 0;
  let lastSelf: number | null = null;
  const items = new Set<string>();
  const cardKeyOf = (text: string) => {
    const n = normalizeSpoken(text);
    for (const item of kit.cardItems)
      if (
        item.kind !== "scene" &&
        item.questions[0] &&
        n.includes(item.questions[0])
      )
        items.add(`${item.kind}:${item.no}`);
  };
  for (const line of run.opening) cardKeyOf(line);
  t.teacherWords += wordCount(run.opening.join(" "));
  for (const [i, f] of facts.entries()) {
    const rec = run.turns[i] as TurnRecord;
    if (f.spoke)
      for (const w of wordsOf(rec.child))
        for (const k of keysOf(kit, w)) childSaid.add(k);
    // 기술 오류 자리는 따로 센다
    if (f.nospeech) t.nospeech++;
    if (f.callTech) t.callTech++;
    // 고정 문장 차례(M-5): (나) AI 몫 문장(앱 상황 줄을 뺀 것)이 모두 고정 문장 — 기준 판정 · (가) 앱이 상황 줄을 넣은 차례 — 건수로 보임
    // 맞장구만 예문과 같은 차례(N-1 (가)가 남기기로 정한 문장)는 (나)에서 빼고 건수로(판정 r3 M-r3-5)
    const sameAsExample = isFixedTurn(kit, f.aiOwn);
    const reactionOnly =
      sameAsExample && f.aiOwn.every((s) => isShortReaction(s));
    const fixed = sameAsExample && !reactionOnly;
    // 들리지 않음 표(판정 없는 보조 셈)는 맞장구 빼기 없이 예문과 같은 차례를 센다
    if (f.nospeech && sameAsExample) t.nospeechFixed++;
    if (!f.tech && f.ai.length > 0) {
      t.fixed.den++;
      if (fixed) {
        t.fixed.num++;
        f.flags.push("고정 문장 차례(AI 가 예문 그대로)");
      }
      if (reactionOnly) {
        t.fixedReaction++;
        f.flags.push("맞장구만 예문과 같음");
      }
      if (f.appSituation) {
        t.appSituation++;
        f.flags.push("앱이 상황 줄로 바꾼 차례");
      }
    }
    // 되풀이: 한 대화에서 상황 차례 반응 전체가 같은 글(들리지 않음 차례 포함)
    if (f.situation && !f.callTech && f.ai.length > 0) {
      const key = f.ai.map(normalizeSpoken).join(" ");
      if (seenSituation.has(key)) {
        t.repeats++;
        f.flags.push("상황 반응 되풀이");
      }
      seenSituation.add(key);
    }
    // 틀에 박힌 맞장구 꼴
    const shownQuestion = [...f.ai, ...f.attach].some(isQuestionSentence);
    if (f.talkSegment && !f.tech && f.ai.length > 0 && shownQuestion) {
      const stock = isStockTurn(kit, f);
      t.stock.den++;
      if (f.answered) t.stockSpoke.den++;
      if (stock) {
        t.stock.num++;
        if (f.answered) t.stockSpoke.num++;
        f.flags.push("틀에 박힌 맞장구 꼴");
      }
    }
    // 이어짐(자동 보조): 아이 말 내용어가 선생님 말에 다시 나옴
    const linked = f.ai.some((s) => hasKey(kit, s, f.childKeys));
    if (f.answered && !f.tech) {
      t.linked.den++;
      if (linked) t.linked.num++;
    }
    // 범위 밖 낱말(질문 밖 문장 — 아이에게 나간 글 기준, 원문의 범위 밖 낱말 수는 따로 보임 · 판정 r3 M-r3-5)
    const target = f.tech ? t.techOffband : t.offband;
    const turnOff: string[] = [];
    if (!f.callTech) {
      for (const s of f.ai.filter((x) => !isQuestionSentence(x))) {
        const { content, off } = offbandIn(kit, s, childSaid);
        target.den += content;
        target.num += off.length;
        if (!f.tech) turnOff.push(...off);
      }
      if (!f.tech)
        for (const s of f.raw.filter((x) => !isQuestionSentence(x)))
          t.offbandRaw += offbandIn(kit, s, childSaid).off.length;
    }
    for (const w of turnOff) t.offbandWords[w] = (t.offbandWords[w] ?? 0) + 1;
    if (turnOff.length > 0)
      f.flags.push(`범위 밖 낱말(${[...new Set(turnOff)].join(", ")})`);
    // 답 글(받침 · 들리지 않음 차례)
    if (!f.callTech && ((rec.move?.stage ?? 0) > 0 || f.nospeech)) {
      const answer = answerOf(kit, rec, f.before);
      const words = answerWordsOf(kit, answer, f.before);
      if (words.size > 0) {
        const raw = f.raw.filter((s) => hasKey(kit, s, words)).length;
        const sent = f.ai.filter((s) => hasKey(kit, s, words)).length;
        t.answerRaw += raw;
        t.answerSent += sent;
        if (sent > 0) f.flags.push("나간 답 글");
      }
    }
    // 소리 줄 자리 · 신호 말 겹침
    const outside = soundOutsideOf(rec, kit.level, kit.choicesLevel);
    t.soundOutside += outside;
    if (outside > 0) f.flags.push("소리 줄 자리 밖");
    const cues = [...f.ai, ...f.attach].filter((s) => isCue(kit, s)).length;
    if (cues >= 2) {
      t.cueOverlap++;
      f.flags.push("신호 말 겹침");
    }
    // 장면 여는 질문 뒤(건수)
    if (
      kit.sceneOpener !== null &&
      normalizeSpoken(f.before).includes(kit.sceneOpener) &&
      f.answered
    ) {
      t.scene.den++;
      const followed =
        rec.judge?.followUp?.auto === true ||
        f.ai.some((s) => isQuestionSentence(s) && hasKey(kit, s, f.childKeys));
      if (followed) t.scene.num++;
      else f.flags.push("장면 여는 질문 뒤 이어 묻지 않음(자동)");
    }
    // 선생님 말 양 · 아이 말 기회
    t.teacherWords += f.teacherWords;
    t.childWords += f.childWords;
    if (f.tech) t.techTeacherWords += f.teacherWords;
    t.before.push(f.beforeWords);
    if (!f.tech && f.ai.length > 0) {
      t.aiTurns++;
      const reactions = f.ai.filter(
        (s) => !isQuestionSentence(s) && !isCue(kit, s),
      );
      const self = f.ai.some(isSelfLine);
      if (
        f.answered &&
        f.childWords <= SHORT_ANSWER_MAX_WORDS &&
        reactions.length >= 2 &&
        reactions
          .slice(1)
          .some((s) => isSelfLine(s) || !hasKey(kit, s, f.childKeys))
      ) {
        t.longA++;
        f.flags.push("긴 차례 ㉠(자동 후보)");
      }
      const childTopic =
        rec.output?.child_topic === true || rec.childKind === "new_topic";
      const askedBack = f.ai.some(
        (s) => isQuestionSentence(s) && hasKey(kit, s, f.childKeys),
      );
      if (f.answered && childTopic && self && !askedBack) {
        t.longB++;
        f.flags.push("긴 차례 ㉡(자동 후보)");
      }
      if (self) {
        t.selfTurns++;
        if (
          kit.selfLineEvery !== null &&
          lastSelf !== null &&
          aiIndex - lastSelf < kit.selfLineEvery
        ) {
          t.longC++;
          f.flags.push("긴 차례 ㉢(자동 후보)");
        }
        lastSelf = aiIndex;
      }
      aiIndex++;
    }
    // 호출 수 · 첫 문장 · 운영 값
    if (rec.usage !== null || rec.failure !== null) t.calls++;
    if (rec.reask) {
      t.reasks++;
      if (f.tech) t.techRecalls++;
    }
    const u = rec.usage;
    if (u) {
      if (u.firstSentenceMs !== null)
        (rec.reask ? t.firstReask : t.first).push(u.firstSentenceMs);
      t.latency.push(u.latencyMs);
      t.inputTokens += u.inputTokens;
      t.outputTokens += u.outputTokens;
      t.outputs.push(u.outputTokens);
      const cost = u.costUsd + (rec.reask?.usage?.costUsd ?? 0);
      t.costUsd += cost;
      t.costs.push(cost);
      if (u.stopReason === "max_tokens") t.maxTokens++;
      t.checkHits += u.checkHits;
    }
    // 기회 · 끼움
    if (rec.move && rec.move.item.kind !== "none" && shownQuestion)
      items.add(`${rec.move.item.kind}:${rec.move.item.no}`);
    for (const line of rec.appAfter) cardKeyOf(line);
    if (rec.judge?.contextlessCard?.auto === true) t.contextless++;
    if (f.tech) f.flags.push("기술 오류 자리");
  }
  t.required = [...items].filter((k) => k.startsWith("required:")).length;
  t.more = [...items].filter((k) => k.startsWith("more:")).length;
  return { tally: t, facts };
}

// ── 값 · 견줌 ────────────────────────────────────────────────────

function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] ??
    null
  );
}

const rate = (r: Ratio): number | null => (r.den === 0 ? null : r.num / r.den);

/** 지표 값(JSON 보고 · 표의 재료). */
export type MetricValues = {
  runs: number;
  fixed: Ratio;
  appSituation: number;
  fixedReaction: number;
  offbandRaw: number;
  repeats: number;
  stock: Ratio;
  stockAfterAnswer: Ratio;
  linkedAuto: Ratio;
  offband: Ratio;
  offbandWords: { word: string; count: number }[];
  answerText: { sent: number; raw: number };
  soundOutside: number;
  cueOverlap: number;
  sceneAfter: Ratio;
  teacherTalk: {
    teacherWords: number;
    childWords: number;
    ratio: number | null;
    beforeMedian: number | null;
    beforeP90: number | null;
    longTurns: { a: number; b: number; c: number; den: number };
    selfTurns: number;
  };
  calls: { calls: number; perRound: number; reasks: number };
  firstSentence: {
    p50: number | null;
    p95: number | null;
    n: number;
    withoutReask: { p50: number | null; p95: number | null };
    reask: { p50: number | null; p95: number | null; n: number };
  };
  chances: {
    required: number;
    requiredPerRound: number;
    more: number;
    contextlessAuto: number;
  };
  tech: {
    nospeech: number;
    nospeechFixed: number;
    callFails: number;
    teacherWords: number;
    recalls: number;
    offband: Ratio;
  };
  ops: {
    latencyP50: number | null;
    latencyP95: number | null;
    inputTokens: number;
    outputTokens: number;
    outputMedian: number | null;
    costUsd: number;
    costMedian: number | null;
    maxTokens: number;
    checkHits: number;
  };
};

const perRound = (n: number, runs: number) =>
  runs === 0 ? 0 : Math.round((n / runs) * PERCENT) / PERCENT;

export function valuesOf(t: Tally): MetricValues {
  const all = [...t.first, ...t.firstReask];
  return {
    runs: t.runs,
    fixed: t.fixed,
    appSituation: t.appSituation,
    fixedReaction: t.fixedReaction,
    offbandRaw: t.offbandRaw,
    repeats: t.repeats,
    stock: t.stock,
    stockAfterAnswer: t.stockSpoke,
    linkedAuto: t.linked,
    offband: t.offband,
    offbandWords: Object.entries(t.offbandWords)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)),
    answerText: { sent: t.answerSent, raw: t.answerRaw },
    soundOutside: t.soundOutside,
    cueOverlap: t.cueOverlap,
    sceneAfter: t.scene,
    teacherTalk: {
      teacherWords: t.teacherWords,
      childWords: t.childWords,
      ratio:
        t.childWords === 0
          ? null
          : Math.round((t.teacherWords / t.childWords) * PERCENT) / PERCENT,
      beforeMedian: percentile(t.before, P50),
      beforeP90: percentile(t.before, P90),
      longTurns: { a: t.longA, b: t.longB, c: t.longC, den: t.aiTurns },
      selfTurns: t.selfTurns,
    },
    calls: {
      calls: t.calls,
      perRound: perRound(t.calls, t.runs),
      reasks: t.reasks,
    },
    firstSentence: {
      p50: percentile(all, P50),
      p95: percentile(all, P95),
      n: all.length,
      withoutReask: {
        p50: percentile(t.first, P50),
        p95: percentile(t.first, P95),
      },
      reask: {
        p50: percentile(t.firstReask, P50),
        p95: percentile(t.firstReask, P95),
        n: t.firstReask.length,
      },
    },
    chances: {
      required: t.required,
      requiredPerRound: perRound(t.required, t.runs),
      more: t.more,
      contextlessAuto: t.contextless,
    },
    tech: {
      nospeech: t.nospeech,
      nospeechFixed: t.nospeechFixed,
      callFails: t.callTech,
      teacherWords: t.techTeacherWords,
      recalls: t.techRecalls,
      offband: t.techOffband,
    },
    ops: {
      latencyP50: percentile(t.latency, P50),
      latencyP95: percentile(t.latency, P95),
      inputTokens: t.inputTokens,
      outputTokens: t.outputTokens,
      outputMedian: percentile(t.outputs, P50),
      costUsd: Math.round(t.costUsd * 1e6) / 1e6,
      costMedian: percentile(t.costs, P50),
      maxTokens: t.maxTokens,
      checkHits: t.checkHits,
    },
  };
}

export type ScriptMetrics = { name: string; values: MetricValues };
export type ReportMetrics = {
  total: MetricValues;
  scripts: ScriptMetrics[];
  /** 시드에 카드가 없어 세지 못한 대본. */
  skipped: string[];
  /** 걸린 차례 · 첫 바퀴 전문의 재료. */
  turns: {
    script: string;
    round: number;
    facts: TurnFacts[];
    run: RunReport;
  }[];
};

/** 보고 하나를 센다(대본마다 두 바퀴를 합친 분자 ÷ 분모 · 합계). */
export function metricsOf(
  json: ObserveJson,
  kitFor: (run: RunReport) => MetricsKit | null,
): ReportMetrics {
  const byScript = new Map<string, Tally>();
  const skipped = new Set<string>();
  const turns: ReportMetrics["turns"] = [];
  for (const run of json.runs) {
    const kit = kitFor(run);
    if (!kit) {
      skipped.add(run.script.name);
      continue;
    }
    const { tally, facts } = tallyRun(run, kit);
    byScript.set(
      run.script.name,
      addTally(byScript.get(run.script.name) ?? emptyTally(), tally),
    );
    turns.push({ script: run.script.name, round: run.round, facts, run });
  }
  const names = [...byScript.keys()].sort();
  const total = names.reduce(
    (sum, n) => addTally(sum, byScript.get(n) ?? emptyTally()),
    emptyTally(),
  );
  return {
    total: valuesOf(total),
    scripts: names.map((name) => ({
      name,
      values: valuesOf(byScript.get(name) ?? emptyTally()),
    })),
    skipped: [...skipped].sort(),
    turns,
  };
}

/** 판정 줄(합계 표 한 줄). */
export type VerdictRow = {
  key: string;
  label: string;
  value: string;
  criterion: string;
  baseline: string;
  verdict: string;
};

const PASS = "통과";
const FAIL = "기준 밖";
const HUMAN = "사람 판정";
const NO_BASE = "기준선 없음";
const NONE = "해당 없음";

/** 분자 · 분모 글: 분모 10 아래는 건수, 아니면 백분율을 함께. */
export function ratioText(r: Ratio): string {
  if (r.den === 0) return "0/0";
  if (r.den < COUNT_BELOW) return `${r.num}건/${r.den}(건수)`;
  return `${r.num}/${r.den}(${Math.round((r.num / r.den) * PERCENT)}%)`;
}

/** 비율 상한 판정: 분모 10 아래는 건수(num ≤ ⌊den × 상한⌋). */
export function withinMax(r: Ratio, max: number): boolean | null {
  if (r.den === 0) return null;
  if (r.den < COUNT_BELOW) return r.num <= Math.floor(r.den * max);
  return r.num / r.den <= max;
}

const msText = (v: number | null) => (v === null ? "—" : `${v}ms`);
const numText = (v: number | null) => (v === null ? "—" : String(v));
const yesNo = (ok: boolean | null): string =>
  ok === null ? NONE : ok ? PASS : FAIL;

/** 기회 알림: 대본마다 다룬 필수 질문(바퀴당)이 고침 전 × 문턱 아래인 대본. */
export function chanceAlertsOf(
  current: readonly ScriptMetrics[],
  baseline: readonly ScriptMetrics[],
  threshold: number,
): string[] {
  const base = new Map(baseline.map((s) => [s.name, s.values]));
  return current.flatMap((s) => {
    const b = base.get(s.name);
    if (!b) return [];
    const now = s.values.chances.requiredPerRound;
    const before = b.chances.requiredPerRound;
    return now < before * threshold
      ? [
          `${s.name}: 다룬 필수 질문 바퀴당 ${now} < 고침 전 ${before} × ${threshold}`,
        ]
      : [];
  });
}

/** 호출 수가 고침 전과 다른 대본(바퀴당). */
export function callDiffsOf(
  current: readonly ScriptMetrics[],
  baseline: readonly ScriptMetrics[],
): string[] {
  const base = new Map(baseline.map((s) => [s.name, s.values]));
  return current.flatMap((s) => {
    const b = base.get(s.name);
    return b && b.calls.perRound !== s.values.calls.perRound
      ? [
          `${s.name}: 바퀴당 ${s.values.calls.perRound}(고침 전 ${b.calls.perRound})`,
        ]
      : [];
  });
}

/** 운영 알림(plan 위험 12 — 판정 기준이 아님): 출력 토큰 · 턴 비용 중앙값이 기준선보다 문턱 넘게 늘었는가. */
export function opsAlertsOf(now: MetricValues, base: MetricValues): string[] {
  const out: string[] = [];
  const grew = (a: number | null, b: number | null, by: number) =>
    a !== null && b !== null && b > 0 && a > b * (1 + by);
  if (grew(now.ops.outputMedian, base.ops.outputMedian, OUTPUT_TOKENS_ALERT))
    out.push(
      `턴 출력 토큰 중앙값 ${now.ops.outputMedian} > 기준선 ${base.ops.outputMedian} × ${1 + OUTPUT_TOKENS_ALERT}`,
    );
  if (grew(now.ops.costMedian, base.ops.costMedian, TURN_COST_ALERT))
    out.push(
      `턴 비용 중앙값 ${now.ops.costMedian} > 기준선 ${base.ops.costMedian} × ${1 + TURN_COST_ALERT}`,
    );
  return out;
}

/** 합계 판정 줄(설계 8 표의 차례). 기준선이 없으면 '고침 전' 꼴 기준은 '기준선 없음'. */
export function verdictRows(
  now: ReportMetrics,
  base: ReportMetrics | null,
  chanceAlert: number,
): VerdictRow[] {
  const v = now.total;
  const b = base?.total ?? null;
  const baseText = (f: (x: MetricValues) => string) => (b ? f(b) : "—");
  const stockOk = withinMax(v.stock, STOCK_MAX);
  const stockRate = rate(v.stock);
  const baseStock = b ? rate(b.stock) : null;
  const stockVerdict =
    stockOk === null
      ? NONE
      : !stockOk
        ? FAIL
        : b === null || baseStock === null
          ? NO_BASE
          : stockRate === 0 || (stockRate ?? 1) < baseStock
            ? PASS
            : FAIL;
  const talk = v.teacherTalk;
  const lte = (x: number | null, y: number | null) =>
    x === null || y === null ? null : x <= y;
  const ratioOk = b ? lte(talk.ratio, b.teacherTalk.ratio) : null;
  const beforeOk = b
    ? lte(talk.beforeMedian, b.teacherTalk.beforeMedian) !== false &&
      lte(talk.beforeP90, b.teacherTalk.beforeP90) !== false
    : null;
  const long = talk.longTurns;
  const longSum = long.a + long.b + long.c;
  const calls = base ? callDiffsOf(now.scripts, base.scripts) : [];
  const alerts = base
    ? chanceAlertsOf(now.scripts, base.scripts, chanceAlert)
    : [];
  const p95 = v.firstSentence.p95;
  const baseP95 = b?.firstSentence.p95 ?? null;
  return [
    {
      key: "fixed",
      label: "고정 문장 차례 (나) AI 글이 예문 · 고정 문장 그대로",
      value: ratioText(v.fixed),
      criterion: `${FIXED_MAX * COUNT_BELOW}/${COUNT_BELOW} 이하`,
      baseline: baseText((x) => ratioText(x.fixed)),
      verdict: yesNo(withinMax(v.fixed, FIXED_MAX)),
    },
    {
      key: "appSituation",
      label: "고정 문장 차례 (가) 앱이 상황 줄로 바꾼 차례(설계상 교체, 건수)",
      value: `${v.appSituation}건 / ${v.fixed.den} · 맞장구만 예문과 같은 차례 ${v.fixedReaction}건((나)에서 뺌)`,
      criterion: "판정 없음(건수로 보임)",
      baseline: baseText((x) => `${x.appSituation}건`),
      verdict: "—",
    },
    {
      key: "repeats",
      label: "상황 반응 되풀이(건수)",
      value: String(v.repeats),
      criterion: "0",
      baseline: baseText((x) => String(x.repeats)),
      verdict: yesNo(v.repeats === 0),
    },
    {
      key: "stock",
      label: "틀에 박힌 맞장구 꼴",
      value: `${ratioText(v.stock)} · 말로 답한 뒤 ${ratioText(v.stockAfterAnswer)}`,
      criterion: "절반 이하, 고침 전보다 낮음",
      baseline: baseText((x) => ratioText(x.stock)),
      verdict: stockVerdict,
    },
    {
      key: "linked",
      label: "이어짐(자동 보조: 아이 말 내용어가 다시 나옴)",
      value: ratioText(v.linkedAuto),
      criterion: "고침 전보다 낮지 않음(사람 판정)",
      baseline: baseText((x) => ratioText(x.linkedAuto)),
      verdict: HUMAN,
    },
    {
      key: "offband",
      label:
        "범위 밖 낱말(자동: 아이에게 나간 글 · 맥락 낱말 · 불필요하게 어려운 낱말을 아직 가르지 않은 전체)",
      value: `${ratioText(v.offband)} · 원문(나가지 않은 글 포함) ${v.offbandRaw}`,
      criterion: `불필요하게 어려운 낱말 ${OFFBAND_MAX * COUNT_BELOW}/${COUNT_BELOW} 이하(사람 판정이 가름)`,
      baseline: baseText((x) => ratioText(x.offband)),
      verdict: HUMAN,
    },
    {
      key: "answerText",
      label: "답 글(받침 · 들리지 않음 차례 문장 수)",
      value: `나간 ${v.answerText.sent} · 원문 ${v.answerText.raw}`,
      criterion: "나간 답 글 0(원문 수는 보고)",
      baseline: baseText(
        (x) => `나간 ${x.answerText.sent} · 원문 ${x.answerText.raw}`,
      ),
      verdict: yesNo(v.answerText.sent === 0),
    },
    {
      key: "sound",
      label: "소리 줄 자리 밖 · 신호 말 겹침(건수)",
      value: `${v.soundOutside} · ${v.cueOverlap}`,
      criterion: "0 · 0",
      baseline: baseText((x) => `${x.soundOutside} · ${x.cueOverlap}`),
      verdict: yesNo(v.soundOutside === 0 && v.cueOverlap === 0),
    },
    {
      key: "scene",
      label: "장면 여는 질문 뒤 이어 물음(자동 보조, 건수)",
      value: ratioText(v.sceneAfter),
      criterion: "전부(사람 판정 — 이어짐과 같은 판정)",
      baseline: "없음(고침 전에는 장면 여는 질문이 없다)",
      verdict: v.sceneAfter.den === 0 ? NONE : HUMAN,
    },
    {
      key: "talkRatio",
      label: "선생님 말 양 (1) 선생님 낱말 ÷ 아이 낱말",
      value: `${talk.teacherWords} ÷ ${talk.childWords} = ${numText(talk.ratio)}`,
      criterion: "고침 전 이하",
      baseline: baseText(
        (x) =>
          `${x.teacherTalk.teacherWords} ÷ ${x.teacherTalk.childWords} = ${numText(x.teacherTalk.ratio)}`,
      ),
      verdict: ratioOk === null ? NO_BASE : yesNo(ratioOk),
    },
    {
      key: "talkBefore",
      label: "선생님 말 양 (2) 아이 차례 앞 선생님 낱말 중앙값 · p90",
      value: `${numText(talk.beforeMedian)} · ${numText(talk.beforeP90)}`,
      criterion: "고침 전 이하",
      baseline: baseText(
        (x) =>
          `${numText(x.teacherTalk.beforeMedian)} · ${numText(x.teacherTalk.beforeP90)}`,
      ),
      verdict: beforeOk === null ? NO_BASE : yesNo(beforeOk),
    },
    {
      key: "longTurns",
      label: "선생님 혼자 긴 차례 (3) ㉠ · ㉡ · ㉢ ÷ AI 차례(자동 후보)",
      value: `${long.a} · ${long.b} · ${long.c} / ${long.den}`,
      criterion: "0(후보는 사람이 확인)",
      baseline: baseText(
        (x) =>
          `${x.teacherTalk.longTurns.a} · ${x.teacherTalk.longTurns.b} · ${x.teacherTalk.longTurns.c} / ${x.teacherTalk.longTurns.den}`,
      ),
      verdict: longSum === 0 ? PASS : `${HUMAN}(후보 ${longSum})`,
    },
    {
      key: "selfTurns",
      label: "자기 이야기가 든 차례 (4)(보고만)",
      value: String(talk.selfTurns),
      criterion: "하한 없음",
      baseline: baseText((x) => String(x.teacherTalk.selfTurns)),
      verdict: "보고만",
    },
    {
      key: "calls",
      label: "호출 수(대본마다 바퀴당 · 재질문 따로)",
      value: `${v.calls.calls}(재질문 ${v.calls.reasks})`,
      criterion: "고침 전과 같음",
      baseline: baseText((x) => `${x.calls.calls}(재질문 ${x.calls.reasks})`),
      verdict:
        base === null
          ? NO_BASE
          : calls.length === 0
            ? PASS
            : `${FAIL}(${calls.join(" / ")})`,
    },
    {
      key: "firstSentence",
      label: "첫 문장 p50 · p95(재질문 차례 p50 · p95 따로)",
      value: `${msText(v.firstSentence.p50)} · ${msText(p95)}(재질문 ${v.firstSentence.reask.n}차례 ${msText(v.firstSentence.reask.p50)} · ${msText(v.firstSentence.reask.p95)}) · NFR-8 ${NFR8_FIRST_SENTENCE_MS}ms 와 차이 ${p95 === null ? "—" : `${p95 - NFR8_FIRST_SENTENCE_MS}ms`}`,
      criterion: `p95 가 고침 전 + ${FIRST_SENTENCE_SLACK_MS}ms 이하`,
      baseline: baseText(
        (x) =>
          `${msText(x.firstSentence.p50)} · ${msText(x.firstSentence.p95)}`,
      ),
      verdict:
        baseP95 === null || p95 === null
          ? NO_BASE
          : yesNo(p95 <= baseP95 + FIRST_SENTENCE_SLACK_MS),
    },
    {
      key: "chances",
      label: "기회 · 끼움(다룬 필수 질문 · 더 이야기할 거리 · 끼움 자동 의심)",
      value: `${v.chances.required} · ${v.chances.more} · ${v.chances.contextlessAuto}`,
      criterion: `끼움 0(사람 판정). 다룬 필수 질문이 고침 전 × ${chanceAlert} 아래인 대본은 알림(판정이 아님)`,
      baseline: baseText(
        (x) =>
          `${x.chances.required} · ${x.chances.more} · ${x.chances.contextlessAuto}`,
      ),
      verdict:
        base === null
          ? `${HUMAN} · ${NO_BASE}`
          : `${HUMAN} · 알림 ${alerts.length}`,
    },
    {
      key: "human",
      label: "사람 판정(대본마다 '대화 같다 · 아니다')",
      value: "□",
      criterion: "대본 전부 통과",
      baseline: "(나) task-talk-quality-review-3.md",
      verdict: HUMAN,
    },
  ];
}

// ── 표 ───────────────────────────────────────────────────────────

const cell = (text: string) =>
  text.replaceAll("|", "\\|").replaceAll("\n", " / ").trim() || "—";

/** 사람 판정 칸(설계 8 '사람 판정' · plan 작업 순서 12). */
export const HUMAN_COLUMNS = [
  "대화 같다 · 아니다(까닭)",
  "이어짐",
  "맥락 낱말 · 불필요하게 어려운 낱말",
  "말을 위한 말",
  "아이 말 끊음",
  "지어낸 경험",
  "요약 밖 기억",
  "막힘 판정 틀림",
  "답 먼저",
  "카드 질문 억지 끼움",
] as const;

export type MetricsMeta = {
  source: string;
  date: string;
  effort: string;
  rounds: number;
  baseline: string | null;
  chanceAlert: number;
};

export function metricsMarkdown(
  now: ReportMetrics,
  base: ReportMetrics | null,
  meta: MetricsMeta,
): string {
  const rows = verdictRows(now, base, meta.chanceAlert);
  const alerts = base
    ? [
        ...opsAlertsOf(now.total, base.total),
        ...chanceAlertsOf(now.scripts, base.scripts, meta.chanceAlert).map(
          (a) => `기회 알림 — ${a}`,
        ),
      ]
    : [];
  const out: string[] = [
    `# 회화 대본 지표(talk:metrics · ${meta.date} · effort ${meta.effort} · 바퀴 ${meta.rounds})`,
    "",
    `보고: ${meta.source} · 기준선 (가): ${meta.baseline ?? "없음"} · 기회 알림 문턱 ${meta.chanceAlert}`,
    "",
    "읽는 법. 수치는 실측 · 검증 기준이고 선생님이 맞출 목표가 아니다(13절 C211 (2)). 고정 문장 차례는 둘로 가른다: (나) AI 가 쓴 문장(앱이 넣은 상황 줄을 뺀 것)이 모두 예문 · 고정 문장 그대로인 차례(원치 않는 베끼기 — 기준 판정), (가) 앱이 상황 줄로 바꾸거나 반응 자리에 둔 차례(설계상 교체 — 건수만). 비율은 바퀴를 합친 분자 ÷ 분모이고 분모가 10 아래면 건수로 판정한다. 기술 오류 자리(들리지 않음 · 호출 실패)는 분자 · 분모에서 빼고 아래에 따로 센다. '자동'은 사람 판정의 보조 셈이고 □ 는 설계 검토자가 채운다. 수치가 기준 밖이어도 까닭이 기술 오류 · 맥락 낱말이면 실패로 치기 전에 요청자에게 보인다.",
    "",
  ];
  if (alerts.length > 0)
    out.push("알림(판정이 아님):", "", ...alerts.map((a) => `- ${a}`), "");
  if (now.skipped.length > 0)
    out.push(
      `세지 못한 대본(시드에 카드 없음): ${now.skipped.join(" · ")}`,
      "",
    );
  out.push(
    "## 합계",
    "",
    "| 지표 | 지금(분자 · 분모) | 기준(잠정) | 기준선 (가) | 판정 |",
    "|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${cell(r.label)} | ${cell(r.value)} | ${cell(r.criterion)} | ${cell(r.baseline)} | ${cell(r.verdict)} |`,
    ),
    "",
    "## 대본마다",
    "",
    "| 대본 | 바퀴 | 고정 문장 (나) · 앱 바꿈 (가) | 되풀이 | 맞장구 꼴 | 이어짐(자동) | 범위 밖 낱말 | 답 글(나간 · 원문) | 소리 줄 밖 · 신호 말 겹침 | 장면 여는 질문 뒤 | 선생님 ÷ 아이 낱말 | 차례 앞 중앙 · p90 | 긴 차례 ㉠ · ㉡ · ㉢ | 자기 이야기 차례 | 호출(바퀴당) · 재질문 | 첫 문장 p50 · p95 | 필수 질문(바퀴당) · 더 이야기 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const s of now.scripts) {
    const v = s.values;
    const t = v.teacherTalk;
    out.push(
      `| ${s.name} | ${v.runs} | ${ratioText(v.fixed)} · ${v.appSituation}건 | ${v.repeats} | ${ratioText(v.stock)} | ${ratioText(v.linkedAuto)} | ${ratioText(v.offband)} | ${v.answerText.sent} · ${v.answerText.raw} | ${v.soundOutside} · ${v.cueOverlap} | ${ratioText(v.sceneAfter)} | ${t.teacherWords} ÷ ${t.childWords} = ${numText(t.ratio)} | ${numText(t.beforeMedian)} · ${numText(t.beforeP90)} | ${t.longTurns.a} · ${t.longTurns.b} · ${t.longTurns.c} / ${t.longTurns.den} | ${t.selfTurns} | ${v.calls.calls}(${v.calls.perRound}) · ${v.calls.reasks} | ${msText(v.firstSentence.p50)} · ${msText(v.firstSentence.p95)} | ${v.chances.required}(${v.chances.requiredPerRound}) · ${v.chances.more} |`,
    );
  }
  if (base) {
    const b = new Map(base.scripts.map((s) => [s.name, s.values]));
    out.push(
      "",
      "## 기준선 대비(대본마다 — 지금 · 고침 전)",
      "",
      "| 대본 | 고정 문장 (나) | 맞장구 꼴 | 이어짐(자동) | 선생님 ÷ 아이 낱말 | 호출 바퀴당 | 필수 질문 바퀴당 | 첫 문장 p95 |",
      "|---|---|---|---|---|---|---|---|",
    );
    for (const s of now.scripts) {
      const v = s.values;
      const x = b.get(s.name);
      const pair = (a: string, y: string | undefined) => `${a} · ${y ?? "—"}`;
      out.push(
        `| ${s.name} | ${pair(ratioText(v.fixed), x && ratioText(x.fixed))} | ${pair(ratioText(v.stock), x && ratioText(x.stock))} | ${pair(ratioText(v.linkedAuto), x && ratioText(x.linkedAuto))} | ${pair(numText(v.teacherTalk.ratio), x && numText(x.teacherTalk.ratio))} | ${pair(String(v.calls.perRound), x && String(x.calls.perRound))} | ${pair(String(v.chances.requiredPerRound), x && String(x.chances.requiredPerRound))} | ${pair(msText(v.firstSentence.p95), x && msText(x.firstSentence.p95))} |`,
      );
    }
  }
  const tech = now.total.tech;
  out.push(
    "",
    "## 기술 오류 자리(따로 셈 — 지표 분자 · 분모 밖)",
    "",
    "| 항목 | 값 |",
    "|---|---|",
    `| 들리지 않음 차례 · 그중 고정 문장 차례 | ${tech.nospeech} · ${tech.nospeechFixed} |`,
    `| 호출 실패 · 거절 · 읽지 못함 · 재질문 실패 차례 | ${tech.callFails} |`,
    `| 기술 오류 자리의 선생님 낱말((1) · (2) 에는 들어 있음) | ${tech.teacherWords} |`,
    `| 기술 오류 자리의 다시 부르기(재질문) | ${tech.recalls} |`,
    `| 들리지 않음 차례의 범위 밖 낱말 | ${ratioText(tech.offband)} |`,
    "",
    "## 범위 밖 낱말(사람 판정: 맥락 낱말 · 불필요하게 어려운 낱말)",
    "",
    "| 낱말 | 수 | 가름 |",
    "|---|---|---|",
    ...(now.total.offbandWords.length === 0
      ? ["| — | 0 | — |"]
      : now.total.offbandWords.map(
          (w) => `| ${cell(w.word)} | ${w.count} | □ |`,
        )),
    "",
    "## 운영 값(effort 견주기 · 위험 12)",
    "",
    "| 항목 | 지금 | 기준선 |",
    "|---|---|---|",
  );
  const ops = now.total.ops;
  const bo = base?.total.ops ?? null;
  const opRow = (label: string, a: string, y: string | null) =>
    `| ${label} | ${a} | ${y ?? "—"} |`;
  out.push(
    opRow(
      "턴 전체 시간 p50 · p95",
      `${msText(ops.latencyP50)} · ${msText(ops.latencyP95)}`,
      bo && `${msText(bo.latencyP50)} · ${msText(bo.latencyP95)}`,
    ),
    opRow(
      "토큰 입력 · 출력(합계)",
      `${ops.inputTokens} · ${ops.outputTokens}`,
      bo && `${bo.inputTokens} · ${bo.outputTokens}`,
    ),
    opRow(
      "턴 출력 토큰 중앙값",
      numText(ops.outputMedian),
      bo && numText(bo.outputMedian),
    ),
    opRow(
      "비용(달러, 재질문 포함) · 턴 중앙값",
      `${ops.costUsd} · ${numText(ops.costMedian)}`,
      bo && `${bo.costUsd} · ${numText(bo.costMedian)}`,
    ),
    opRow(
      "최대 출력에 닿은 차례",
      String(ops.maxTokens),
      bo && String(bo.maxTokens),
    ),
    opRow(
      "재질문 · 검사 걸림 칸",
      `${now.total.calls.reasks} · ${ops.checkHits}`,
      base ? `${base.total.calls.reasks} · ${bo?.checkHits ?? 0}` : null,
    ),
    "",
    "## 사람 판정(설계 검토자 — 비워 둠)",
    "",
    `| 대본 | ${HUMAN_COLUMNS.join(" | ")} |`,
    `|---|${HUMAN_COLUMNS.map(() => "---").join("|")}|`,
    ...now.scripts.map(
      (s) => `| ${s.name} | ${HUMAN_COLUMNS.map(() => "□").join(" | ")} |`,
    ),
    "",
  );
  return out.join("\n");
}

/** 설계 검토자가 읽을 차례 목록: 걸린 차례(모든 바퀴) + 첫 바퀴 전문. */
export function reviewMarkdown(now: ReportMetrics, meta: MetricsMeta): string {
  const lineOf = (t: TurnRecord) =>
    [
      t.sound.model !== undefined ? `따라 할 말 〈${t.sound.model}〉` : "",
      t.sound.choices ? `선택지 〈${t.sound.choices.join("〉〈")}〉` : "",
      t.sound.answer !== undefined ? `답 소리 〈${t.sound.answer}〉` : "",
    ]
      .filter((x) => x !== "")
      .join(" · ");
  const out: string[] = [
    `# 설계 검토자가 읽을 차례(talk:metrics · ${meta.date} · effort ${meta.effort})`,
    "",
    `보고: ${meta.source}. 걸린 차례는 자동 표시가 하나라도 붙은 차례이고(모든 바퀴), 판정은 사람이 한다. 〈 〉 는 글 없이 소리로만 나가는 줄이다.`,
    "",
    "## 걸린 차례",
    "",
    "| 대본 · 바퀴 · 차례 | 아이 | 선생님 말 | 붙인 줄 | 소리 줄 | 자동 표시 |",
    "|---|---|---|---|---|---|",
  ];
  let any = false;
  for (const r of now.turns)
    for (const [i, f] of r.facts.entries()) {
      if (f.flags.length === 0) continue;
      const t = r.run.turns[i] as TurnRecord;
      any = true;
      out.push(
        `| ${r.script} · ${r.round} · ${f.no} | ${cell(t.child)} | ${cell(t.teacher)} | ${cell(t.attach.join(" / "))} | ${cell(lineOf(t))} | ${cell(f.flags.join(" · "))} |`,
      );
    }
  if (!any) out.push("| — | — | — | — | — | 걸린 차례 없음 |");
  out.push("", "## 첫 바퀴 전문", "");
  for (const r of now.turns.filter((x) => x.round === 1)) {
    out.push(
      `### ${r.script}`,
      "",
      `앱 첫 차례: ${r.run.opening.map(cell).join(" / ") || "—"}`,
      "",
      "| 차례 | 아이 | 선생님 말 | 붙인 줄 | 소리 줄 | 앱 다음 차례 | 자동 표시 |",
      "|---|---|---|---|---|---|---|",
    );
    for (const [i, f] of r.facts.entries()) {
      const t = r.run.turns[i] as TurnRecord;
      out.push(
        `| ${f.no} | ${cell(t.child)} | ${cell(t.teacher)} | ${cell(t.attach.join(" / "))} | ${cell(lineOf(t))} | ${cell(t.appAfter.join(" / "))} | ${cell(f.flags.join(" · "))} |`,
      );
    }
    out.push("");
  }
  return out.join("\n");
}

/** JSON 보고(차례 재료는 빼고 값 · 판정만). */
export function metricsJson(
  now: ReportMetrics,
  base: ReportMetrics | null,
  meta: MetricsMeta,
) {
  return {
    ...meta,
    alerts: base
      ? [
          ...opsAlertsOf(now.total, base.total),
          ...chanceAlertsOf(now.scripts, base.scripts, meta.chanceAlert),
        ]
      : [],
    rows: verdictRows(now, base, meta.chanceAlert),
    total: now.total,
    scripts: now.scripts,
    skipped: now.skipped,
    baselineTotal: base?.total ?? null,
    baselineScripts: base?.scripts ?? null,
    human: Object.fromEntries(
      now.scripts.map((s) => [
        s.name,
        Object.fromEntries(HUMAN_COLUMNS.map((c) => [c, null])),
      ]),
    ),
  };
}

/** 보고 · 기준선 → 표 · JSON · 검토 목록(talk:observe 끝과 talk:metrics 가 같이 쓴다). */
export function metricsFilesOf({
  json,
  baseline,
  meta,
  kitFor,
}: {
  json: ObserveJson;
  baseline: ObserveJson | null;
  meta: MetricsMeta;
  kitFor: (run: RunReport) => MetricsKit | null;
}): {
  markdown: string;
  json: string;
  review: string;
  metrics: ReturnType<typeof metricsJson> & {
    replay: ReturnType<typeof replayJson>;
  };
} {
  const now = metricsOf(json, kitFor);
  const base = baseline ? metricsOf(baseline, kitFor) : null;
  // 실제 입력 지표 넷(AC-15zl): 같은 보고 · 같은 재료로 따로 세어 표 끝에 붙인다(앞 지표의 셈 · 판정 줄은 그대로)
  const replayNow = replayMetricsOf(json.runs, kitFor);
  const replayBase = baseline ? replayMetricsOf(baseline.runs, kitFor) : null;
  const metrics = {
    ...metricsJson(now, base, meta),
    replay: replayJson(replayNow, replayBase),
  };
  return {
    markdown: `${metricsMarkdown(now, base, meta)}\n${replayMarkdown(replayNow, replayBase)}`,
    json: `${JSON.stringify(metrics, null, 2)}\n`,
    review: reviewMarkdown(now, meta),
    metrics,
  };
}

/** 시드 재료로 대본마다 재료를 만드는 함수(카드 · 단원 재료는 대본 칸으로 한 번씩). */
export function seedKitFor(
  root: string,
): (run: RunReport) => MetricsKit | null {
  const seed = loadMetricsSeed(root);
  return (run) => kitOf(seed, run);
}

// ── 명령 ─────────────────────────────────────────────────────────

export type TalkMetricsArgs = {
  report: string;
  baseline: string | null;
  chanceAlert: number;
  out: string | null;
};

export function parseMetricsArgs(
  argv: readonly string[],
): { ok: true; args: TalkMetricsArgs } | { ok: false; error: string } {
  let report: string | null = null;
  const args: Omit<TalkMetricsArgs, "report"> = {
    baseline: null,
    chanceAlert: CHANCE_ALERT_DEFAULT,
    out: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (!arg.startsWith("--")) {
      if (report !== null)
        return { ok: false, error: `보고 JSON 은 하나다: ${arg}` };
      report = arg;
      continue;
    }
    const value = argv[i + 1];
    if (arg !== "--baseline" && arg !== "--chance-alert" && arg !== "--out")
      return { ok: false, error: `모르는 인자: ${arg}` };
    if (value === undefined || value.startsWith("--"))
      return { ok: false, error: `${arg} 뒤에 값이 없다` };
    i += 1;
    if (arg === "--baseline") args.baseline = value;
    else if (arg === "--out") args.out = value;
    else {
      const n = chanceAlertOf(value);
      if (n === null)
        return { ok: false, error: "--chance-alert 는 0 초과 1 이하 수다" };
      args.chanceAlert = n;
    }
  }
  if (report === null)
    return {
      ok: false,
      error: "보고 JSON 경로가 없다(pnpm talk:metrics <보고 json>)",
    };
  return { ok: true, args: { report, ...args } };
}

export type TalkMetricsIo = {
  readJson: (path: string) => unknown;
  write: (path: string, text: string) => void;
  log: (line: string) => void;
  kitFor: (run: RunReport) => MetricsKit | null;
};

/** 파일 이름 앞부분(보고 JSON 이름에서 .json 을 뗀 것). */
export function metricsBaseOf(report: string, out: string | null): string {
  const stem = basename(report).replace(/\.json$/, "");
  return join(out ?? dirname(report), stem);
}

export function runTalkMetrics(
  args: TalkMetricsArgs,
  io: TalkMetricsIo,
): number {
  const read = (path: string, what: string) => {
    let raw: unknown;
    try {
      raw = io.readJson(path);
    } catch {
      return {
        ok: false as const,
        error: `${what} JSON 을 읽지 못했다: ${path}`,
      };
    }
    return parseObserveJson(raw, path);
  };
  const report = read(args.report, "보고");
  if (!report.ok) {
    io.log(`talk-metrics: ${report.error}`);
    return EXIT_INPUT;
  }
  let baseline: ObserveJson | null = null;
  if (args.baseline !== null) {
    const b = read(args.baseline, "기준선");
    if (!b.ok) {
      io.log(`talk-metrics: ${b.error}`);
      return EXIT_INPUT;
    }
    baseline = b.json;
  }
  const files = metricsFilesOf({
    json: report.json,
    baseline,
    meta: {
      source: args.report,
      date: report.json.date,
      effort: report.json.effort,
      rounds: report.json.rounds,
      baseline: args.baseline,
      chanceAlert: args.chanceAlert,
    },
    kitFor: io.kitFor,
  });
  const base = metricsBaseOf(args.report, args.out);
  io.write(`${base}-metrics.md`, files.markdown);
  io.write(`${base}-metrics.json`, files.json);
  io.write(`${base}-review.md`, files.review);
  io.log(files.markdown);
  io.log(
    `talk-metrics: ${base}-metrics.md · ${base}-metrics.json · ${base}-review.md`,
  );
  return EXIT_OK;
}

function main(): number {
  const parsed = parseMetricsArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`talk-metrics: ${parsed.error}`);
    return EXIT_INPUT;
  }
  for (const path of [parsed.args.report, parsed.args.baseline])
    if (path !== null && !existsSync(path)) {
      console.error(`talk-metrics: 파일이 없다: ${path}`);
      return EXIT_INPUT;
    }
  return runTalkMetrics(parsed.args, {
    readJson,
    write: (path, text) => {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    },
    log: (line) => console.log(line),
    kitFor: seedKitFor(process.cwd()),
  });
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

if (isDirectRun()) process.exitCode = main();
