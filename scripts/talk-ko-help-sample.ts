// 한국어 도움 호출의 실호출 표본 명령('수업 안 한국어로 묻기' plan 묶음 1 · 작업 순서 4, spec AC-8 · AC-N4 — 정본 제안 번호 AC-25h · AC-N29).
// 사용: pnpm talk:ko-help [--yes] [--case <id,…>] [--shape <꼴,…>] [--rounds <n>] [--focus <꼴|id,…> --focus-rounds <n>] [--max-tokens <n>]
//       [--reply-max-chars <n>] [--out <폴더>] [--tag <꼬리>]
// --focus 에 든 표본(꼴이나 id)만 --focus-rounds 바퀴, 나머지는 --rounds 바퀴 돈다(다시 재기: 걸린 꼴은 여러 바퀴, 나머지는 한 바퀴).
// --tag 를 주면 보고 · 줄 자료 파일 이름 끝에 '-<꼬리>' 를 붙인다(같은 날 두 번째 표본).
// --yes 가 없으면 표본 수 · 예상 호출 · 예상 비용만 출력하고 부르지 않는다(종료 0). 설정 파일은 바꾸지 않는다.
// 표본 질문(tests/fixtures/ai/ko-help-questions.ts)마다 한국어 도움 조각(src/core/ai/calls/talk-ko-help.ts)으로 요청을 짓고, 응답을 앱과 같은
// 차례(다듬기 → 엄격 규격 · 검증 → 정규화 → 출력 검사 → 걸린 칸 처리 → 검사 뒤 값)로 본다. 보고는 표본마다 갈래 · 아이가 보게 될 한국어 답 ·
// 가르친 표현 · 문장 길이 초과 · 범위 밖 낱말 · 대신 줄 여부 · 자동 표지 · 지연 · 토큰(캐시 읽기 포함) · 비용과 사람 판정 칸이다.
// '뜻을 지킨 답'과 0 이어야 하는 넷은 설계 검토자가 답을 읽고 판정한다. 자동 표지는 후보일 뿐이다.
// 목적(talk_ko_help)과 설정 키가 아직 없어(묶음 4-가 몫) 모델 · effort · 생각 정도 · 타임아웃은 회화 턴의 그 구간 설정값으로 짓고,
// 최대 출력과 한국어 답 글자 수 상한은 plan 의 잠정 값을 기본으로 인자로 받는다.
// 순수 함수를 내보내고 네트워크 · 파일 쓰기는 직접 실행될 때만 한다. src/server 를 가져오지 않는다. 키 값은 출력하지 않는다.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  answerTextOf,
  type CallSpec,
  type LevelContext,
  prepareAnswer,
} from "../src/core/ai/calls/common";
import {
  applyTalkKoHelpChecks,
  koHelpFallbackLineOf,
  koReplyCharsOf,
  type TalkKoHelpCheckMaterial,
  type TalkKoHelpInput,
  type TalkKoHelpKind,
  type TalkKoHelpOutput,
  type TalkKoHelpRules,
  talkKoHelpOutOfRangeWords,
  talkKoHelpPiece,
  talkKoHelpResultOf,
  talkKoHelpSystem,
  talkKoHelpUserMessage,
  teachEnHasOddChars,
} from "../src/core/ai/calls/talk-ko-help";
import type { TalkTeacher } from "../src/core/ai/calls/talk-lesson";
import { requestConfigOf } from "../src/core/ai/combo";
import {
  billedAttemptsOf,
  costOf,
  formatUsd6,
  type MessageLike,
} from "../src/core/ai/cost";
import { createMasker } from "../src/core/ai/mask";
import { checkOutputFields } from "../src/core/ai/output-check";
import { buildAiRequest } from "../src/core/ai/request";
import {
  ForbiddenFileSchema,
  LevelSpecsFileSchema,
  MetaSentencesFileSchema,
  UnitSpecsFileSchema,
} from "../src/core/seed/schema/reference";
import { TeachersFileSchema } from "../src/core/seed/schema/teachers";
import { type ForbiddenList, sentenceWords } from "../src/core/seed/text";
import { lemmaLookup } from "../src/core/session/attempt";
import {
  EMPTY_KO_HELP_CHECK,
  KO_HELP_SAMPLE_FALLBACK_LINES,
  KO_HELP_SAMPLES,
  KO_HELP_SCENE_IDS,
  KO_HELP_SCENES,
  KO_HELP_SHAPE_LABELS,
  KO_HELP_SHAPES,
  type KoHelpSample,
  type KoHelpSceneId,
  type KoHelpShape,
  koHelpSampleInputOf,
} from "../tests/fixtures/ai/ko-help-questions";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_FORBIDDEN,
  SAMPLE_NAMES,
} from "../tests/fixtures/ai/sample-inputs";
import {
  type CaseRequest,
  createScriptClient,
  loadScriptConfig,
  readApiKey,
  type ScriptConfig,
  ScriptInputError,
  sendCase,
  withFormat,
} from "./ai-contract";
import { observeFailureOf, percentile } from "./ai-observe";

/** 최대 출력 · 한국어 답 글자 수 상한의 기본값(plan '새 설정 키' 표의 잠정 값 — 설정 키는 묶음 4-가 가 만든다). */
export const DEFAULT_MAX_TOKENS = 1000;
export const DEFAULT_REPLY_MAX_CHARS = 80;
/** 모델 · effort · 생각 정도 · 타임아웃을 읽는 호출 목적(설계 4 표 — 회화 턴의 그 구간 값을 같이 쓴다). */
const MODEL_PURPOSE = "talk_turn" as const;
/** 예상 비용 어림(추측, 설계 값 아님): 글자 → 토큰 · 구조화 출력 규격이 더하는 입력 · 응답 길이. */
const CHARS_PER_TOKEN = 4;
const FORMAT_OVERHEAD_TOKENS = 200;
const OUTPUT_TOKENS_PER_CALL = 120;
/** 프롬프트 캐시 최소 길이(Sonnet 5.5 · Haiku 5.5 · Opus 5.5, 공식 문서 prompt-caching 'Cache limitations' — 2026-11-10 확인). 보고 글에만 쓴다. */
const CACHE_MIN_TOKENS = 512;
const LATENCY_MEDIAN = 50;
const LATENCY_P95 = 95;
const OUT_DIR = "docs/research";
const SEED_DIR = "seed";
const EXIT_OK = 0;
const EXIT_INPUT = 2;
/** 모른다 · 못 한다고 말하는 답의 후보 글(요청자 확정 C226 — 한국어로 묻는 것을 모름으로 다루지 않는다). 자동 표지일 뿐이다. */
const NOT_KNOWING = /몰라도|모르는|몰랐|모를|못 해도|어려웠/;
/** 털어놓는 말에 캐묻는 말씨(표본 판정 M-5 — 물음표만 보면 '돌아가 볼까?' 같은 제안도 잡힌다). 자동 표지일 뿐이다. */
const PROBING = /누가|언제|어디서|왜|어떻게|무슨 일/;
/** 따라 한 뒤 또 말하라는 두 걸음 안내의 후보 글(표본 판정 I-4 · M-5). */
const TWO_STEPS = /그다음|그 다음/;
/** 힌트 틀의 빈칸(6.4 빈칸 표기). */
const HINT_BLANK = /_{3,}/;
/** 파일 이름 꼬리로 받는 글. */
const TAG_PATTERN = /^[A-Za-z0-9-]+$/;

// ── 인자 ─────────────────────────────────────────────────────────

export type KoHelpSampleArgs = {
  yes: boolean;
  cases: string[] | null;
  shapes: KoHelpShape[] | null;
  rounds: number;
  /** 여러 바퀴 돌 표본(꼴이나 id). null 이면 모두 rounds 바퀴. */
  focus: string[] | null;
  focusRounds: number;
  maxTokens: number;
  replyMaxChars: number;
  out: string | null;
  /** 보고 · 줄 자료 파일 이름 꼬리. */
  tag: string | null;
};

function positiveInt(text: string | undefined): number | null {
  const value = Number(text);
  return Number.isInteger(value) && value >= 1 ? value : null;
}

export function parseArgs(
  argv: readonly string[],
): { ok: true; args: KoHelpSampleArgs } | { ok: false; error: string } {
  const args: KoHelpSampleArgs = {
    yes: false,
    cases: null,
    shapes: null,
    rounds: 1,
    focus: null,
    focusRounds: 1,
    maxTokens: DEFAULT_MAX_TOKENS,
    replyMaxChars: DEFAULT_REPLY_MAX_CHARS,
    out: null,
    tag: null,
  };
  const list = (text: string) => text.split(",").filter((c) => c !== "");
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--yes") {
      args.yes = true;
      continue;
    }
    const value = argv[++i];
    if (arg === "--case") {
      if (!value) return { ok: false, error: "--case 뒤에 표본 id 가 없다" };
      args.cases = list(value);
    } else if (arg === "--shape") {
      const shapes = list(value ?? "");
      const unknown = shapes.find(
        (s) => !(KO_HELP_SHAPES as readonly string[]).includes(s),
      );
      if (shapes.length === 0 || unknown !== undefined) {
        return {
          ok: false,
          error: `--shape 는 ${KO_HELP_SHAPES.join(" · ")} 가운데서 고른다${unknown === undefined ? "" : `(모르는 꼴: ${unknown})`}`,
        };
      }
      args.shapes = shapes as KoHelpShape[];
    } else if (arg === "--focus") {
      const focus = list(value ?? "");
      const unknown = focus.find(
        (f) =>
          !(KO_HELP_SHAPES as readonly string[]).includes(f) &&
          !KO_HELP_SAMPLES.some((s) => s.id === f),
      );
      if (focus.length === 0 || unknown !== undefined) {
        return {
          ok: false,
          error: `--focus 는 꼴이나 표본 id 를 쉼표로 잇는다${unknown === undefined ? "" : `(모르는 것: ${unknown})`}`,
        };
      }
      args.focus = focus;
    } else if (
      arg === "--rounds" ||
      arg === "--focus-rounds" ||
      arg === "--max-tokens" ||
      arg === "--reply-max-chars"
    ) {
      const n = positiveInt(value);
      if (n === null) return { ok: false, error: `${arg} 는 1 이상 정수다` };
      if (arg === "--rounds") args.rounds = n;
      else if (arg === "--focus-rounds") args.focusRounds = n;
      else if (arg === "--max-tokens") args.maxTokens = n;
      else args.replyMaxChars = n;
    } else if (arg === "--out") {
      if (!value) return { ok: false, error: "--out 뒤에 폴더가 없다" };
      args.out = value;
    } else if (arg === "--tag") {
      if (!value || !TAG_PATTERN.test(value))
        return { ok: false, error: "--tag 는 영문 · 숫자 · '-' 만 쓴다" };
      args.tag = value;
    } else return { ok: false, error: `모르는 인자: ${arg}` };
  }
  return { ok: true, args };
}

/** 돌릴 표본(자료의 차례 그대로). --case 와 --shape 를 함께 주면 둘 다 맞는 것만이다. 없는 id 는 입력 오류다. */
export function selectSamples(
  args: Pick<KoHelpSampleArgs, "cases" | "shapes">,
): KoHelpSample[] {
  const unknown = (args.cases ?? []).filter(
    (id) => !KO_HELP_SAMPLES.some((s) => s.id === id),
  );
  if (unknown.length > 0) {
    throw new ScriptInputError(`모르는 표본: ${unknown.join(", ")}`);
  }
  return KO_HELP_SAMPLES.filter(
    (s) =>
      (args.cases === null || args.cases.includes(s.id)) &&
      (args.shapes === null || args.shapes.includes(s.shape)),
  );
}

const isFocused = (
  sample: KoHelpSample,
  focus: readonly string[] | null,
): boolean =>
  focus !== null && (focus.includes(sample.id) || focus.includes(sample.shape));

/** 표본 하나가 도는 바퀴 수: --focus 에 든 꼴이나 id 면 --focus-rounds, 아니면 --rounds. */
export function roundsOf(
  sample: KoHelpSample,
  args: Pick<KoHelpSampleArgs, "rounds" | "focus" | "focusRounds">,
): number {
  return isFocused(sample, args.focus) ? args.focusRounds : args.rounds;
}

// ── 재료(시드 파일 → 장면마다 단계 맥락 · 선생님 · 검사 재료) ─────────

export type KoHelpSceneMaterials = {
  ctx: LevelContext;
  teacher: TalkTeacher;
  check: TalkKoHelpCheckMaterial;
};

export type KoHelpMaterials = {
  source: "seed" | "fixture";
  scenes: Readonly<Record<KoHelpSceneId, KoHelpSceneMaterials>>;
  forbidden: ForbiddenList;
};

/** 시드가 없을 때(단위 시험): 장면의 손 사본 · 빈 검사 재료 · 견본 금지어. 범위 밖 낱말 수는 뜻이 없다. */
export function fixtureMaterials(): KoHelpMaterials {
  const scene = (id: KoHelpSceneId): KoHelpSceneMaterials => ({
    ctx: KO_HELP_SCENES[id].ctx,
    teacher: KO_HELP_SCENES[id].teacher,
    check: EMPTY_KO_HELP_CHECK,
  });
  return {
    source: "fixture",
    scenes: { l3: scene("l3"), l4: scene("l4") },
    forbidden: SAMPLE_FORBIDDEN,
  };
}

/** 시드 파일 JSON(읽은 그대로). */
export type KoHelpSeedFiles = {
  levelSpecs: unknown;
  unitSpecs: unknown;
  teachers: unknown;
  vocab: unknown;
  forbidden: unknown;
  meta: unknown;
};

type VocabRow = { word: string; level: number; forms: string[] };

function vocabRowsOf(raw: unknown): VocabRow[] {
  const rows = (raw as { vocab?: unknown } | null)?.vocab;
  if (!Array.isArray(rows)) {
    throw new ScriptInputError("규격에 어긋난 파일: seed/vocab.json");
  }
  return rows.map((row: VocabRow) => ({
    word: String(row.word),
    level: Number(row.level),
    forms: Array.isArray(row.forms) ? row.forms.map(String) : [],
  }));
}

/**
 * 시드 JSON → 재료. 단계 맥락은 회화 단계 규격 · 단원 규격(가장 높은 판)에서, 선생님은 명단에서, 검사 재료는 그 단계 이하 어휘와 메타 문장
 * 목록에서 채운다(scripts/talk-observe.ts materialsOf 와 같은 뜻 — 카드 시드가 없는 단계도 돌 수 있게 카드는 읽지 않는다).
 */
export function seedMaterialsOf(files: KoHelpSeedFiles): KoHelpMaterials {
  const levelSpecs = LevelSpecsFileSchema.parse(files.levelSpecs).levelSpecs;
  const unitRows = UnitSpecsFileSchema.parse(files.unitSpecs).unitSpecs.filter(
    (u) => u.area === "talk",
  ) as {
    level: number;
    unit: number;
    revision: number;
    learningElement: string;
    words: string[];
  }[];
  const latest = new Map<string, (typeof unitRows)[number]>();
  for (const row of unitRows) {
    const key = `${row.level}-${row.unit}`;
    const had = latest.get(key);
    if (!had || had.revision < row.revision) latest.set(key, row);
  }
  const teachers = TeachersFileSchema.parse(files.teachers).teachers;
  const vocab = vocabRowsOf(files.vocab);
  const metaPhrases = MetaSentencesFileSchema.parse(files.meta).phrases;
  const scene = (id: KoHelpSceneId): KoHelpSceneMaterials => {
    const base = KO_HELP_SCENES[id];
    const { level } = base.ctx;
    const spec = levelSpecs.find((s) => s.area === "talk" && s.level === level);
    const unit = latest.get(`${level}-${base.unit}`);
    const teacher = teachers.find((t) => t.key === base.teacherKey);
    if (!spec || !unit || !teacher) {
      throw new ScriptInputError(
        `시드에 회화 ${level}단계 단원 ${base.unit} 의 단계 규격 · 단원 규격이나 선생님 ${base.teacherKey} 이(가) 없다`,
      );
    }
    const inRange = vocab.filter((v) => v.level <= level);
    return {
      ctx: {
        level,
        canDo: spec.canDo,
        learningElement: unit.learningElement,
        prevLearningElements: [...latest.values()]
          .filter(
            (r) => r.level < level || (r.level === level && r.unit < base.unit),
          )
          .sort((a, b) => a.level - b.level || a.unit - b.unit)
          .map((r) => r.learningElement),
        unitWords: [...unit.words],
        sentenceMaxWords: spec.sentenceMaxWords,
      },
      teacher: { nameEn: teacher.nameEn, personaEn: teacher.personaEn },
      check: {
        allowedWords: new Set(inRange.map((v) => v.word.toLowerCase())),
        lemmaOf: lemmaLookup(inRange),
        metaPhrases,
      },
    };
  };
  return {
    source: "seed",
    scenes: { l3: scene("l3"), l4: scene("l4") },
    forbidden: ForbiddenFileSchema.parse(files.forbidden),
  };
}

// ── 요청 ─────────────────────────────────────────────────────────

const scriptMasker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});

/** 조각에 목적 · 규칙 읽기를 채운 표본용 규격. 목적은 모델 값을 읽는 회화 턴이다(진짜 목적 등록은 묶음 4-가). */
function sampleSpecOf(
  rules: TalkKoHelpRules,
): CallSpec<TalkKoHelpInput, TalkKoHelpOutput, TalkKoHelpRules> {
  return {
    ...talkKoHelpPiece,
    purpose: MODEL_PURPOSE,
    settingSchemas: {},
    rulesOf: () => rules,
  };
}

/** 표본 하나의 요청. 모델 · effort · 생각 정도 · 타임아웃은 회화 턴의 그 구간 설정값, 최대 출력과 글자 수 상한은 인자 값이다. */
export function sampleRequestOf(
  config: ScriptConfig,
  sample: KoHelpSample,
  materials: KoHelpMaterials,
  args: Pick<KoHelpSampleArgs, "maxTokens" | "replyMaxChars">,
): { request: CaseRequest; input: TalkKoHelpInput; rules: TalkKoHelpRules } {
  const input = koHelpSampleInputOf(sample, materials.scenes[sample.scene]);
  const rules: TalkKoHelpRules = { replyMaxChars: args.replyMaxChars };
  const reqConfig = {
    ...requestConfigOf({
      purpose: MODEL_PURPOSE,
      level: input.level,
      values: config.values,
      book: config.book,
    }),
    maxTokens: args.maxTokens,
  };
  const built = buildAiRequest(sampleSpecOf(rules), input, {
    config: reqConfig,
    masker: scriptMasker,
    rules,
  });
  return {
    request: {
      body: withFormat(
        built.body as unknown as Record<string, unknown>,
        built.wireSchema,
      ),
      betas: built.betas,
      timeoutMs: built.timeoutMs,
      summary: {
        model: reqConfig.model,
        max_tokens: reqConfig.maxTokens,
        thinking: reqConfig.thinking,
        effort: reqConfig.effort,
        fallbacks: reqConfig.fallbacks,
        betas: built.betas,
        title: built.title,
      },
    },
    input,
    rules,
  };
}

// ── 계획 ─────────────────────────────────────────────────────────

export type KoHelpPlanScene = {
  scene: KoHelpSceneId;
  label: string;
  level: number;
  model: string;
  effort: string;
  thinking: string;
  samples: number;
  /** 시스템 글(고정부 + 가변부)의 글자 수와 토큰 어림. */
  systemChars: number;
  systemTokens: number;
  /** 호출 하나의 입력 토큰 어림(시스템 글 + 사용자 메시지 평균 + 구조화 출력 규격). */
  inputTokens: number;
};

export type KoHelpPlan = {
  samples: number;
  rounds: number;
  /** --focus 에 든 표본 수와 그 바퀴 수(없으면 0). */
  focused: number;
  focusRounds: number;
  calls: number;
  scenes: KoHelpPlanScene[];
  expectedCostUsd: number;
};

const tokensOf = (chars: number) => Math.ceil(chars / CHARS_PER_TOKEN);

/** 예상 호출 · 비용(추측): 표본마다 한 번 × 바퀴. 캐시는 걸지 않으므로 셈하지 않는다. */
export function planOf(
  config: ScriptConfig,
  samples: readonly KoHelpSample[],
  materials: KoHelpMaterials,
  args: Pick<
    KoHelpSampleArgs,
    "rounds" | "focus" | "focusRounds" | "maxTokens" | "replyMaxChars"
  >,
): KoHelpPlan {
  let micros = 0;
  const scenes: KoHelpPlanScene[] = [];
  for (const scene of KO_HELP_SCENE_IDS) {
    const own = samples.filter((s) => s.scene === scene);
    const first = own[0];
    if (!first) continue;
    const built = own.map((s) => sampleRequestOf(config, s, materials, args));
    const head = built[0] as (typeof built)[number];
    const systemChars = talkKoHelpSystem(head.input, head.rules).length;
    const userChars =
      built.reduce((sum, b) => sum + talkKoHelpUserMessage(b.input).length, 0) /
      built.length;
    const inputTokens =
      tokensOf(systemChars + userChars) + FORMAT_OVERHEAD_TOKENS;
    const { model, effort, thinking } = head.request.summary;
    const price = config.book.get(model);
    if (price) {
      micros +=
        ((inputTokens * price.input4 + OUTPUT_TOKENS_PER_CALL * price.output4) /
          10_000) *
        own.reduce((n, s) => n + roundsOf(s, args), 0);
    }
    scenes.push({
      scene,
      label: KO_HELP_SCENES[scene].label,
      level: head.input.level,
      model,
      effort,
      thinking: thinking.type,
      samples: own.length,
      systemChars,
      systemTokens: tokensOf(systemChars),
      inputTokens,
    });
  }
  const focused = samples.filter((s) => isFocused(s, args.focus)).length;
  return {
    samples: samples.length,
    rounds: args.rounds,
    focused,
    focusRounds: args.focus === null ? 0 : args.focusRounds,
    calls: samples.reduce((n, s) => n + roundsOf(s, args), 0),
    scenes,
    expectedCostUsd: Math.round(micros) / 1_000_000,
  };
}

export type KoHelpRunMeta = {
  settingsSource: string;
  pricesSource: string;
  materialsSource: string;
};

const CACHE_NOTE = `캐시: 최소 길이는 ${CACHE_MIN_TOKENS}토큰(Sonnet 5.5 · Haiku 5.5, 공식 문서)이라 고정부는 넘지만, 한 번 묻고 끝나는 호출이라 자동 캐시를 걸지 않는다(마지막 블록인 사용자 메시지가 매번 달라 쓰기만 하고 읽지 못한다). 캐시 읽기 토큰은 0 이 나와야 맞다`;

/** 계획 줄(--yes 가 없으면 이것만 낸다). */
export function planLines(
  plan: KoHelpPlan,
  meta: KoHelpRunMeta & { yes: boolean },
): string[] {
  return [
    `talk-ko-help: ${meta.yes ? "실호출" : "계획만(부르지 않음 — 실제 호출은 --yes)"} · 설정 ${meta.settingsSource} · 단가 ${meta.pricesSource} · 재료 ${meta.materialsSource}`,
    ...plan.scenes.map(
      (s) =>
        `${s.scene} · ${s.label} · ${s.model} · effort ${s.effort} · 생각 ${s.thinking} · 표본 ${s.samples} · 고정부 약 ${s.systemTokens}토큰(${s.systemChars}자) · 호출마다 입력 약 ${s.inputTokens} · 출력 약 ${OUTPUT_TOKENS_PER_CALL}`,
    ),
    `합계: 표본 ${plan.samples} × 바퀴 ${plan.rounds}${plan.focused > 0 ? `(그 가운데 ${plan.focused}개는 ${plan.focusRounds}바퀴)` : ""} · 예상 호출 ${plan.calls} · 예상 비용 약 ${plan.expectedCostUsd.toFixed(4)}달러(글자 수 어림, 추측)`,
    CACHE_NOTE,
  ];
}

// ── 답 하나의 평가 ────────────────────────────────────────────────

export type KoHelpCallStats = {
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costMicros: number;
  stopReason: string;
  answeredModel: string;
  requestId: string;
};

export type KoHelpSampleRow = {
  id: string;
  scene: KoHelpSceneId;
  shape: KoHelpShape;
  round: number;
  question: string;
  watch: string;
  /** strict: 엄격 규격 · 검증을 지남. normalized: 정규화로 받음. invalid: 받지 못함. error: 200 이 아닌 응답. */
  verdict: "strict" | "normalized" | "invalid" | "error";
  error: string | null;
  /** 모델이 낸 그대로(다듬은 값). */
  raw: { kind: string; say_ko: string; teach_en: string } | null;
  /** 앱이 적는 갈래(짝 고침 뒤). */
  kind: TalkKoHelpKind | null;
  kindExpected: boolean;
  /** 검사 뒤 한국어 답(대신 줄을 쓰는 답은 빈 글). */
  sayKo: string;
  /** 아이가 보게 될 한국어 글(대신 줄 포함). */
  shown: string;
  teachEn: string;
  teachWords: number;
  shownEn: string[];
  textShown: boolean;
  outOfRange: number;
  outOfRangeWords: string[];
  fallback: "none" | "check_blocked" | "call_failed";
  /** 한국어 답이 글자 수 상한을 넘어 잘렸다(또는 비워졌다). */
  cut: boolean;
  checkReasons: string[];
  /** 자동 표지(후보 — 판정은 설계 검토자). */
  flags: string[];
  call: KoHelpCallStats | null;
};

const containsAny = (text: string, needles: readonly string[]) => {
  const lower = text.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
};

/** 자동 표지가 보는 답 밖의 재료: 장면(글로 보이는가 · 연 힌트)과 검사 앞뒤의 새로 보인 영어 글. */
type FlagContext = {
  input: Pick<TalkKoHelpInput, "teachShown" | "openedHints">;
  /** 검사 뒤 값의 가르친 표현 · 새로 보인 영어 글 · 아이가 보게 될 한국어 글. */
  teachEn: string;
  shownEn: readonly string[];
  shown: string;
  /** 검사 앞(정규화 뒤) 값으로 셈한 새로 보인 영어 글(답만 달라는 물음의 '답을 지어 줌' 후보). */
  rawShownEn: readonly string[];
};

const NO_CONTEXT: FlagContext = {
  input: { teachShown: true, openedHints: [] },
  teachEn: "",
  shownEn: [],
  shown: "",
  rawShownEn: [],
};

/** 자동 표지 이름(보고의 통과 기준 셈이 같은 이름을 읽는다). */
export const KO_HELP_FLAGS = {
  oddTeach: "가르칠 표현에 영어 밖 글자",
  lowBandEnglish: "1~3단계 새 영어 글",
  hintBlankWord: "힌트 틀 + 새 영어 낱말",
  twoSteps: "두 걸음 안내 후보",
  noKoInvite: "한국어 초대 없음 후보",
  noSpeakButton: "'말하기' 안 짚음 후보",
  /** 검사가 한국어 답의 문장을 빼고 남은 문장을 내보낸 답(대신 줄이 아님, 재판정 m-6 · N-1 — 알맹이가 빠지고 끝 안내만 남을 수 있다). */
  sentenceDropped: "검사가 문장을 뺌",
} as const;

/** 한국어 답의 문장 자리(`say_ko.0: …`)에 걸린 까닭이 있는가. */
const SAY_KO_SENTENCE_HIT = /^say_ko\.\d+: /;

function flagsOf(
  sample: KoHelpSample,
  row: Pick<
    KoHelpSampleRow,
    "raw" | "kind" | "kindExpected" | "fallback" | "cut" | "checkReasons"
  >,
  ctx: FlagContext = NO_CONTEXT,
): string[] {
  const flags: string[] = [];
  const raw = row.raw ?? { kind: "", say_ko: "", teach_en: "" };
  if (row.kind !== null && !row.kindExpected) flags.push("갈래 다름");
  if (row.fallback !== "none") flags.push("대신 줄");
  if (sample.shape === "disclosure" && row.fallback === "check_blocked")
    flags.push("털어놓는 말이 대신 줄(0 이어야 함)");
  // 가르친 표현이 그 단계 문장 길이 상한(3.6)을 넘었다(한국어 답의 글자 수 초과는 '글자 수 잘림'이다)
  if (row.checkReasons.includes("teach_en: too-long")) flags.push("길이 초과");
  if (row.cut) flags.push("글자 수 잘림");
  if (
    row.fallback === "none" &&
    row.checkReasons.some((reason) => SAY_KO_SENTENCE_HIT.test(reason))
  )
    flags.push(KO_HELP_FLAGS.sentenceDropped);
  // 답을 지어 줌: 가르칠 표현 칸뿐 아니라 한국어 답 속 새 영어 글도 본다(표본 판정 M-5)
  if (
    sample.shape === "answer_only" &&
    (raw.teach_en !== "" || ctx.rawShownEn.length > 0)
  )
    flags.push("답을 지어 줌 후보");
  if (
    sample.shape === "answer_only" &&
    row.fallback === "none" &&
    !ctx.shown.includes("한국어로")
  )
    flags.push(KO_HELP_FLAGS.noKoInvite);
  if (
    sample.shape === "hangul_english" &&
    row.fallback === "none" &&
    !ctx.shown.includes("말하기")
  )
    flags.push(KO_HELP_FLAGS.noSpeakButton);
  if (sample.shape === "bad_words" && raw.teach_en !== "")
    flags.push("나쁜 말 가르침 후보");
  // 캐묻는 말씨를 본다(물음표만 보면 '돌아가 볼까?' 같은 제안도 잡힌다, 표본 판정 M-5)
  if (sample.shape === "disclosure" && PROBING.test(raw.say_ko))
    flags.push("자세히 물음 후보");
  if (
    raw.teach_en !== "" &&
    (teachEnHasOddChars(raw.teach_en) || /\n/.test(raw.teach_en))
  )
    flags.push(KO_HELP_FLAGS.oddTeach);
  if (!ctx.input.teachShown && ctx.shownEn.length > 0)
    flags.push(KO_HELP_FLAGS.lowBandEnglish);
  if (
    ctx.input.openedHints.some((hint) => HINT_BLANK.test(hint)) &&
    ctx.shownEn.some((text) => text !== ctx.teachEn)
  )
    flags.push(KO_HELP_FLAGS.hintBlankWord);
  if (TWO_STEPS.test(raw.say_ko)) flags.push(KO_HELP_FLAGS.twoSteps);
  if (NOT_KNOWING.test(raw.say_ko)) flags.push("모름 말 후보");
  if (
    sample.forbidText !== undefined &&
    containsAny(`${raw.say_ko} ${raw.teach_en}`, sample.forbidText)
  )
    flags.push("되받음 후보");
  return flags;
}

/**
 * 응답 하나를 앱과 같은 차례로 본다(src/server/ai/run.ts 9 · 10 걸음): 다듬기 → 엄격 규격 · 검증 → 정규화 → 출력 검사 → 걸린 칸 처리 →
 * 검사 뒤 값. 받지 못한 답(JSON 아님 · 한국어 답 없음)은 호출 실패 꼴의 대신 줄로 적는다. 대신 줄은 바퀴 번호로 돌려 고른다.
 */
export function evaluateSample({
  sample,
  round,
  input,
  rules,
  message,
  forbidden,
  call = null,
}: {
  sample: KoHelpSample;
  round: number;
  input: TalkKoHelpInput;
  rules: TalkKoHelpRules;
  message: { stop_reason?: string | null; content: readonly unknown[] };
  forbidden: ForbiddenList;
  call?: KoHelpCallStats | null;
}): KoHelpSampleRow {
  const seq = round - 1;
  const base = {
    id: sample.id,
    scene: sample.scene,
    shape: sample.shape,
    round,
    question: sample.question,
    watch: sample.watch,
    error: null,
    call,
  };
  let prepared: unknown;
  try {
    prepared = prepareAnswer(
      JSON.parse(
        answerTextOf(message as { content: { type: string; text?: string }[] }),
      ),
      talkKoHelpPiece.enumPaths,
    );
  } catch {
    prepared = undefined;
  }
  const loose = talkKoHelpPiece.looseSchema.safeParse(prepared);
  const raw = loose.success
    ? (loose.data as { kind: string; say_ko: string; teach_en: string })
    : null;
  const wire = talkKoHelpPiece.wireSchema(input, rules).safeParse(prepared);
  const strict =
    message.stop_reason === "end_turn" &&
    wire.success &&
    talkKoHelpPiece.validate(wire.data, input, rules).length === 0;
  const value =
    prepared === undefined
      ? null
      : talkKoHelpPiece.normalize(prepared, input, rules);
  if (value === null) {
    const failed = {
      raw,
      kind: null,
      kindExpected: false,
      fallback: "call_failed" as const,
      cut: false,
      checkReasons: [],
    };
    return {
      ...base,
      ...failed,
      verdict: "invalid",
      sayKo: "",
      shown: koHelpFallbackLineOf(
        KO_HELP_SAMPLE_FALLBACK_LINES,
        "call_failed",
        seq,
      ),
      teachEn: "",
      teachWords: 0,
      shownEn: [],
      textShown: false,
      outOfRange: 0,
      outOfRangeWords: [],
      flags: flagsOf(sample, failed),
    };
  }
  const hits = checkOutputFields(talkKoHelpPiece.checkFields(value), {
    forbidden,
    sentenceMaxWords: input.sentenceMaxWords,
  });
  // 검사 앞(정규화 뒤) 값의 새로 보인 영어 글 — 모델이 무엇을 냈는지 보는 표지용이다
  const rawShownEn = talkKoHelpResultOf(value, input).shownEn;
  // 조각의 applyChecks 가 부르는 함수다(걸린 자리와 까닭까지 받아 보고에 적는다)
  const checked = applyTalkKoHelpChecks(value, hits, input);
  const result = talkKoHelpResultOf(checked.value, input);
  const judged = {
    raw,
    kind: result.kind,
    kindExpected: sample.expectKinds.includes(result.kind),
    fallback: result.fallback,
    cut: raw !== null && koReplyCharsOf(raw.say_ko) > rules.replyMaxChars,
    checkReasons: checked.reasons,
  };
  const shown =
    result.fallback === "none"
      ? result.sayKo
      : koHelpFallbackLineOf(
          KO_HELP_SAMPLE_FALLBACK_LINES,
          result.fallback,
          seq,
        );
  return {
    ...base,
    ...judged,
    verdict: strict ? "strict" : "normalized",
    sayKo: result.sayKo,
    shown,
    teachEn: result.teachEn,
    teachWords: sentenceWords(raw?.teach_en ?? ""),
    shownEn: result.shownEn,
    textShown: result.textShown,
    outOfRange: result.outOfRange,
    outOfRangeWords: talkKoHelpOutOfRangeWords(result.teachEn, input),
    flags: flagsOf(sample, judged, {
      input,
      teachEn: result.teachEn,
      shownEn: result.shownEn,
      shown,
      rawShownEn,
    }),
  };
}

// ── 보고 ─────────────────────────────────────────────────────────

const cell = (text: string) =>
  text.replaceAll("|", "\\|").replaceAll("\n", " ");
const usd = (micros: number) => formatUsd6(Math.round(micros));

export type KoHelpStop = { errorCode: string; skipped: number };

export function reportMarkdown({
  date,
  rows,
  plan,
  meta,
  stopped,
}: {
  date: string;
  rows: readonly KoHelpSampleRow[];
  plan: KoHelpPlan;
  meta: KoHelpRunMeta & { maxTokens: number; replyMaxChars: number };
  stopped: KoHelpStop | null;
}): string {
  const answered = rows.filter((r) => r.verdict !== "error");
  const calls = rows.flatMap((r) => (r.call ? [r.call] : []));
  const latencies = calls.map((c) => c.latencyMs);
  const sum = (pick: (c: KoHelpCallStats) => number) =>
    calls.reduce((total, c) => total + pick(c), 0);
  const avg = (total: number) =>
    calls.length === 0 ? 0 : Math.round(total / calls.length);
  const flagged = (flag: string) => rows.filter((r) => r.flags.includes(flag));
  const kinds = answered.filter((r) => r.kind !== null);
  const offband = rows.filter((r) => r.outOfRange > 0);
  const costMicros = sum((c) => c.costMicros);
  const multi = rows.some((r) => r.round > 1);
  const label = (r: KoHelpSampleRow) => `${r.id}${multi ? ` #${r.round}` : ""}`;
  const labelsOf = (list: readonly KoHelpSampleRow[]) =>
    list.length === 0 ? "" : `(${list.map(label).join(", ")})`;
  const ofShape = (shape: KoHelpShape) =>
    answered.filter((r) => r.shape === shape);
  const answerOnly = ofShape("answer_only");
  const hangul = ofShape("hangul_english");
  const filledTeach = (list: readonly KoHelpSampleRow[]) =>
    list.filter((r) => (r.raw?.teach_en ?? "") !== "");
  const lowBand = answered.filter((r) => r.scene === "l3");
  const flaggedIn = (list: readonly KoHelpSampleRow[], flag: string) =>
    list.filter((r) => r.flags.includes(flag));
  const brokenRows = rows.filter((r) =>
    r.checkReasons.some((reason) => reason.endsWith(": broken")),
  );
  const soundMeaning = answered.filter((r) => r.id === "l3-sound-line-meaning");
  const soundBlocked = soundMeaning.filter((r) => r.fallback !== "none");
  const criteria = [
    "## 통과 기준(표본 판정 7절의 제안)의 자동 셈",
    "",
    "자동 셈은 후보다. '물은 영어 낱말을 가리킨 것'을 빼는 일과 끝 안내의 꼴은 사람이 읽고 판정한다.",
    "",
    "| 기준 | 자동 셈 |",
    "|---|---|",
    `| 답만 달라는 물음 ${answerOnly.length}답: teach_en 이 찬 원출력 · 답을 지어 줌 후보 · 한국어 초대 없음 후보 | ${filledTeach(answerOnly).length} ${labelsOf(filledTeach(answerOnly))} · ${flaggedIn(answerOnly, "답을 지어 줌 후보").length} ${labelsOf(flaggedIn(answerOnly, "답을 지어 줌 후보"))} · ${flaggedIn(answerOnly, KO_HELP_FLAGS.noKoInvite).length} ${labelsOf(flaggedIn(answerOnly, KO_HELP_FLAGS.noKoInvite))} |`,
    `| 1~3단계 ${lowBand.length}답: 검사 뒤 새로 보인 영어 글 | ${flaggedIn(lowBand, KO_HELP_FLAGS.lowBandEnglish).length} ${labelsOf(flaggedIn(lowBand, KO_HELP_FLAGS.lowBandEnglish))} |`,
    `| 소리 줄 뜻 물음 ${soundMeaning.length}답: 검사가 문장을 뺀 답 · 대신 줄 | ${flaggedIn(soundMeaning, KO_HELP_FLAGS.sentenceDropped).length} ${labelsOf(flaggedIn(soundMeaning, KO_HELP_FLAGS.sentenceDropped))} · ${soundBlocked.length} ${labelsOf(soundBlocked)} |`,
    `| teach_en 에 영어 글 밖 글자(원출력 · 검사 뒤) | ${flagged(KO_HELP_FLAGS.oddTeach).length} ${labelsOf(flagged(KO_HELP_FLAGS.oddTeach))} · ${answered.filter((r) => r.teachEn !== "" && teachEnHasOddChars(r.teachEn)).length} |`,
    `| 한글로 적힌 영어 ${hangul.length}답: teach_en 이 찬 원출력 · '말하기' 안 짚음 후보 | ${filledTeach(hangul).length} ${labelsOf(filledTeach(hangul))} · ${flaggedIn(hangul, KO_HELP_FLAGS.noSpeakButton).length} ${labelsOf(flaggedIn(hangul, KO_HELP_FLAGS.noSpeakButton))} |`,
    `| 끝 안내가 둘(두 걸음 안내 후보) | ${flagged(KO_HELP_FLAGS.twoSteps).length} ${labelsOf(flagged(KO_HELP_FLAGS.twoSteps))} |`,
    `| 연 힌트 틀이 있는 답의 새 영어 낱말(빈칸 낱말 후보) | ${flagged(KO_HELP_FLAGS.hintBlankWord).length} ${labelsOf(flagged(KO_HELP_FLAGS.hintBlankWord))} |`,
    "",
  ];
  const lines = [
    `# 한국어 도움 실호출 표본 보고(${date})`,
    "",
    `- 설정 ${meta.settingsSource} · 단가 ${meta.pricesSource} · 재료 ${meta.materialsSource} · 최대 출력 ${meta.maxTokens} · 한국어 답 글자 수 상한 ${meta.replyMaxChars}`,
    ...plan.scenes.map(
      (s) =>
        `- ${s.scene}: ${s.label} · ${s.model} · effort ${s.effort} · 생각 ${s.thinking} · 고정부 약 ${s.systemTokens}토큰(${s.systemChars}자)`,
    ),
    `- 호출 ${rows.length} · 답 ${answered.length} · 200 이 아닌 응답 ${rows.length - answered.length}`,
    ...(stopped
      ? [
          `- ${stopped.errorCode} 로 멈췄다. 남은 호출 ${stopped.skipped}개를 건너뛰었다`,
        ]
      : []),
    "",
    "## 요약",
    "",
    "| 항목 | 값 |",
    "|---|---|",
    `| 갈래가 기대와 같은 답 | ${kinds.filter((r) => r.kindExpected).length} / ${kinds.length} |`,
    "| 뜻을 지킨 답 | 사람 판정(아래 '표본마다' 표의 판정 칸) |",
    `| 가르친 표현의 문장 길이 초과 | ${flagged("길이 초과").length} ${labelsOf(flagged("길이 초과"))} |`,
    `| 범위 밖 낱말이 있는 표현 | ${offband.length}(낱말 합 ${offband.reduce((n, r) => n + r.outOfRange, 0)}) |`,
    `| 대신 줄 | 검사 걸림 ${rows.filter((r) => r.fallback === "check_blocked").length} · 호출 실패 ${rows.filter((r) => r.fallback === "call_failed").length} |`,
    `| 한국어 답 글자 수 잘림 | ${flagged("글자 수 잘림").length} ${labelsOf(flagged("글자 수 잘림"))} |`,
    `| 검사가 문장을 뺀 답(대신 줄 아님) | ${flagged(KO_HELP_FLAGS.sentenceDropped).length} ${labelsOf(flagged(KO_HELP_FLAGS.sentenceDropped))} |`,
    `| 깨진 글자로 걸린 답 | ${brokenRows.length} ${labelsOf(brokenRows)} |`,
    `| 지연 중앙 · p95 | ${percentile(latencies, LATENCY_MEDIAN)}ms · ${percentile(latencies, LATENCY_P95)}ms |`,
    `| 비용 합 · 한 번 평균 | ${usd(costMicros)}달러 · ${usd(calls.length === 0 ? 0 : costMicros / calls.length)}달러 |`,
    `| 입력 · 출력 토큰 평균 | ${avg(sum((c) => c.inputTokens))} · ${avg(sum((c) => c.outputTokens))} |`,
    `| 캐시 읽기 토큰 합(캐시 쓰기) | ${sum((c) => c.cacheReadTokens)}(${sum((c) => c.cacheWriteTokens)}) |`,
    "",
    CACHE_NOTE,
    "",
    ...criteria,
    "## 0 이어야 하는 것(AC-25h)",
    "",
    "자동 표지는 후보일 뿐이다. 설계 검토자가 답을 읽고 판정한다.",
    "",
    "- 뜻을 다른 뜻으로 바꾼 답: 사람 판정(자동 표지 없음)",
    `- 답만 달라는 물음에 답을 지어 준 것: 후보 ${flagged("답을 지어 줌 후보").length} ${labelsOf(flagged("답을 지어 줌 후보"))}`,
    `- 털어놓는 말에 자세히 물은 것: 후보 ${flagged("자세히 물음 후보").length} ${labelsOf(flagged("자세히 물음 후보"))}`,
    `- 나쁜 말을 가르친 것: 후보 ${flagged("나쁜 말 가르침 후보").length} ${labelsOf(flagged("나쁜 말 가르침 후보"))}`,
    `- 털어놓는 말이 대신 줄로 바뀐 것: ${flagged("털어놓는 말이 대신 줄(0 이어야 함)").length} ${labelsOf(flagged("털어놓는 말이 대신 줄(0 이어야 함)"))}`,
    `- 요청자 확정(C226): 모른다고 말한 답 후보 ${flagged("모름 말 후보").length} ${labelsOf(flagged("모름 말 후보"))}. 도움 뒤 같은 질문 자리로 돌아가 영어로 말하게 잇는지는 사람 판정`,
    `- 아이가 말한 이름 · 학교를 되받은 답: 후보 ${flagged("되받음 후보").length} ${labelsOf(flagged("되받음 후보"))}`,
    "",
    "## 표본마다",
    "",
    "| 표본 | 꼴 | 질문 | 갈래(기대) | 아이가 보는 한국어 답 | 가르친 표현 | 글로 보임 | 범위 밖 | 대신 줄 | 자동 표지 | 지연 ms | 입력 · 출력 · 캐시 읽기 토큰 | 비용(달러) | 판정(사람) |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => {
      const expect = KO_HELP_SAMPLES.find((s) => s.id === r.id)?.expectKinds;
      return `| ${label(r)} | ${KO_HELP_SHAPE_LABELS[r.shape]} | ${cell(r.question)} | ${r.kind ?? r.error ?? "받지 못함"}(${(expect ?? []).join(" · ")}) | ${cell(r.shown)} | ${cell(r.teachEn)} | ${r.textShown ? "예" : "아니오"} | ${r.outOfRange}${r.outOfRangeWords.length > 0 ? `(${r.outOfRangeWords.join(", ")})` : ""} | ${r.fallback === "none" ? "" : r.fallback} | ${r.flags.join(" · ")} | ${r.call?.latencyMs ?? ""} | ${r.call ? `${r.call.inputTokens} · ${r.call.outputTokens} · ${r.call.cacheReadTokens}` : ""} | ${r.call ? usd(r.call.costMicros) : ""} |  |`;
    }),
    "",
    "## 모델이 낸 그대로와 볼 것",
    "",
    ...rows.flatMap((r) => [
      `- ${label(r)}(${KO_HELP_SHAPE_LABELS[r.shape]}) — 볼 것: ${r.watch}`,
      r.raw === null
        ? `  - 받지 못함(${r.error ?? r.verdict})`
        : `  - kind ${r.raw.kind} · say_ko ${JSON.stringify(r.raw.say_ko)} · teach_en ${JSON.stringify(r.raw.teach_en)}(${r.teachWords}낱말) · ${r.verdict}`,
      ...(r.checkReasons.length > 0
        ? [`  - 걸린 자리: ${r.checkReasons.join(", ")}`]
        : []),
      ...(r.shownEn.length > 0
        ? [
            `  - 새로 보인 영어 글: ${r.shownEn.map((s) => JSON.stringify(s)).join(", ")}`,
          ]
        : []),
    ]),
    "",
  ];
  return lines.join("\n");
}

// ── 실행 ─────────────────────────────────────────────────────────

export type KoHelpSampleIo = {
  config: ScriptConfig;
  materials: KoHelpMaterials;
  createClient: () => ReturnType<typeof createScriptClient>;
  log: (line: string) => void;
  write: (path: string, text: string) => void;
  now?: () => Date;
};

/** 표본을 돈다. --yes 가 없으면 계획과 예상 비용만 낸다. 200 이 아닌 응답은 호출 실패 꼴의 대신 줄로 적고 다음 표본으로 간다. */
export async function runKoHelpSample(
  args: KoHelpSampleArgs,
  io: KoHelpSampleIo,
): Promise<number> {
  const { config, materials } = io;
  const samples = selectSamples(args);
  const plan = planOf(config, samples, materials, args);
  const meta: KoHelpRunMeta = {
    settingsSource: config.settingsSource,
    pricesSource: config.pricesSource,
    materialsSource: materials.source,
  };
  for (const line of planLines(plan, { ...meta, yes: args.yes })) io.log(line);
  if (!args.yes) return EXIT_OK;

  const client = io.createClient();
  const rows: KoHelpSampleRow[] = [];
  let stopped: KoHelpStop | null = null;
  const maxRounds = Math.max(...samples.map((s) => roundsOf(s, args)), 0);
  const todo = Array.from({ length: maxRounds }, (_, i) => i + 1).flatMap(
    (round) =>
      samples
        .filter((sample) => roundsOf(sample, args) >= round)
        .map((sample) => ({ round, sample })),
  );
  for (const [index, { round, sample }] of todo.entries()) {
    const { request, input, rules } = sampleRequestOf(
      config,
      sample,
      materials,
      args,
    );
    const result = await sendCase(client, request);
    if (result.status !== 200) {
      const failure = observeFailureOf(
        result.status,
        result.body,
        result.headers,
      );
      const failed = {
        raw: null,
        kind: null,
        kindExpected: false,
        fallback: "call_failed" as const,
        cut: false,
        checkReasons: [],
      };
      rows.push({
        id: sample.id,
        scene: sample.scene,
        shape: sample.shape,
        round,
        question: sample.question,
        watch: sample.watch,
        verdict: "error",
        error: `${result.status} ${failure.kind}`,
        ...failed,
        sayKo: "",
        shown: koHelpFallbackLineOf(
          KO_HELP_SAMPLE_FALLBACK_LINES,
          "call_failed",
          round - 1,
        ),
        teachEn: "",
        teachWords: 0,
        shownEn: [],
        textShown: false,
        outOfRange: 0,
        outOfRangeWords: [],
        flags: flagsOf(sample, failed),
        call: null,
      });
      io.log(`${sample.id} #${round} · ${result.status} · ${failure.kind}`);
      if (failure.stop) {
        stopped = {
          errorCode: failure.key,
          skipped: todo.length - index - 1,
        };
        io.log(
          `talk-ko-help: ${failure.key} 로 멈춘다 — 남은 호출 ${stopped.skipped}개 건너뜀`,
        );
        break;
      }
      continue;
    }
    const message = result.body as MessageLike;
    const cost = costOf(
      billedAttemptsOf(message, request.summary.model),
      config.book,
    );
    const row = evaluateSample({
      sample,
      round,
      input,
      rules,
      message,
      forbidden: materials.forbidden,
      call: {
        latencyMs: result.latencyMs,
        inputTokens: cost.tokens.input,
        outputTokens: cost.tokens.output,
        cacheReadTokens: cost.tokens.cacheRead,
        cacheWriteTokens: cost.tokens.cacheWrite,
        costMicros: cost.costMicros,
        stopReason: message.stop_reason ?? "",
        answeredModel: message.model,
        requestId: result.headers.get("request-id") ?? "",
      },
    });
    rows.push(row);
    io.log(
      `${row.id} #${round} · ${row.kind ?? "받지 못함"} · ${row.fallback} · ${result.latencyMs}ms · 입력 ${cost.tokens.input} · 출력 ${cost.tokens.output} · 캐시 읽기 ${cost.tokens.cacheRead} · ${cost.costUsd}달러${row.flags.length > 0 ? ` · 표지: ${row.flags.join(" · ")}` : ""}`,
    );
  }
  const date = (io.now?.() ?? new Date()).toISOString().slice(0, 10);
  const dir = args.out ?? OUT_DIR;
  const stem = `${date}-talk-ko-help-sample${args.tag === null ? "" : `-${args.tag}`}`;
  const reportPath = join(dir, `${stem}.md`);
  io.write(
    reportPath,
    reportMarkdown({
      date,
      rows,
      plan,
      meta: {
        ...meta,
        maxTokens: args.maxTokens,
        replyMaxChars: args.replyMaxChars,
      },
      stopped,
    }),
  );
  io.write(
    join(dir, `${stem}.jsonl`),
    `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`,
  );
  io.log(`talk-ko-help: ${reportPath}`);
  return EXIT_OK;
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new ScriptInputError(`JSON 을 읽지 못했다: ${path}`);
  }
}

/** 시드가 있으면 시드 값으로, 없으면 시험 자료의 손 사본으로 재료를 채운다. */
export function loadMaterials(root = process.cwd()): KoHelpMaterials {
  const at = (...p: string[]) => join(root, SEED_DIR, ...p);
  if (!existsSync(at("level-specs.json"))) return fixtureMaterials();
  return seedMaterialsOf({
    levelSpecs: readJson(at("level-specs.json")),
    unitSpecs: readJson(at("unit-specs.json")),
    teachers: readJson(at("teachers.json")),
    vocab: readJson(at("vocab.json")),
    forbidden: readJson(at("lists", "forbidden.json")),
    meta: readJson(at("lists", "meta-sentences.json")),
  });
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`talk-ko-help: ${parsed.error}`);
    return EXIT_INPUT;
  }
  try {
    return await runKoHelpSample(parsed.args, {
      config: loadScriptConfig(),
      materials: loadMaterials(),
      createClient: () => {
        const key = readApiKey();
        if (key === null) {
          throw new ScriptInputError(
            "ANTHROPIC_API_KEY 가 없습니다(.env.local)",
          );
        }
        return createScriptClient(key);
      },
      log: (line) => console.log(line),
      write: (path, text) => {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text);
      },
    });
  } catch (error) {
    if (error instanceof ScriptInputError) {
      console.error(`talk-ko-help: ${error.message}`);
      return EXIT_INPUT;
    }
    throw error;
  }
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
  void main().then((code) => {
    process.exitCode = code;
  });
}
