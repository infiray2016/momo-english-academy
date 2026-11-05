// 회화 수업 실호출 표본 평가 명령(회화 plan 묶음 13 · AC-15o · 9절 실시간 호출 표본 평가의 회화 몫, 컨트롤러 T-131 로 앞당김).
// 사용: pnpm talk:observe [--yes] [--script <이름>] [--level <단계>] [--effort low|medium] [--out <폴더>]
// --yes 가 없으면 대본 · 아이 차례 수 · 예상 호출 · 예상 비용만 출력하고 부르지 않는다(종료 0). 설정 파일은 바꾸지 않는다.
// 턴 흐름은 앱의 순수 함수(src/core/conversation/* · src/core/ai/calls/talk-lesson.ts)를 그대로 쓰고, 세션 · 행 · 기록은 DB 없이 메모리
// 상태로 흉내 낸다. 서버의 턴 끝 처리(src/server/conversation/lesson-turn.ts settleLessonTurn · 문장 문 · 카드 자리)는 server-only 라
// 가져올 수 없어 이 파일에 줄여 옮겼다(이번 패치 판 — 2026-11-05 밤 작업 트리, f4ec058 위 C202 고침). 흉내 낸 것과 못 낸 것은 보고 task-talk-13-report.md 다.
// 아이 말은 대본의 글(인식 결과 흉내)이다. 보고는 턴마다 선생님 말 · 뜻 · 소리 줄 · 갈래 · 카드 자리 까닭 · 되돌림 · 같은 질문 ·
// 사람 판정 칸 · 토큰 · 첫 문장 시간 · 비용과, 끝에 대본의 설계 예시 · 기대 옆에 실제를 둔 '나란히' 표다.
// 순수 함수를 내보내고 네트워크 · 파일 쓰기는 직접 실행될 때만 한다. src/server 를 가져오지 않는다. 키 값은 출력하지 않는다.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import { APIError } from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  answerTextOf,
  type LevelContext,
  prepareAnswer,
} from "../src/core/ai/calls/common";
import {
  applyTalkLessonChecks,
  isLowBandLevel,
  type TalkCallTurn,
  type TalkLessonContext,
  type TalkLessonInput,
  type TalkLessonOutput,
  type TalkLessonRules,
  type TalkTeacher,
  talkCallTurnOf,
  talkLessonCheckFields,
  talkLessonContextDelta,
  talkLessonRewriteOf,
  talkLessonTurnSpec,
  talkLessonUserMessage,
} from "../src/core/ai/calls/talk-lesson";
import { requestConfigOf, settingKeysOf } from "../src/core/ai/combo";
import {
  billedAttemptsOf,
  type ContentBlockLike,
  costOf,
  formatUsd6,
  type MessageLike,
} from "../src/core/ai/cost";
import { inlineJsonSchemaRefs } from "../src/core/ai/inline-refs";
import { createMasker } from "../src/core/ai/mask";
import { checkOutputFields } from "../src/core/ai/output-check";
import { buildAiRequest } from "../src/core/ai/request";
import {
  cardItemOf,
  oldestMoreOf,
  slotChanceOf,
  startPrepWordsOf,
} from "../src/core/conversation/chances";
import { createRewriteHold } from "../src/core/conversation/child-kind";
import {
  heardHelpOf,
  heardHelpsOfMove,
  hintKindOf,
  OPEN_ALL_HINTS_FROM_DONT_KNOW,
} from "../src/core/conversation/hints";
import {
  type LessonArgs,
  lessonTurnSegmentOf,
  nextTeacherTurnOf,
  reaskWordsOf,
  type TeacherAttachLine,
  type TeacherMoveAi,
  type TeacherTurnPlan,
  talkLessonPositionOf,
  teacherMoveOf,
  teacherTurnPlansOf,
} from "../src/core/conversation/lesson-flow";
import {
  TALK_HINT_KINDS,
  type TalkHeardHelp,
  type TalkHintKind,
  type TalkInputMode,
  type TalkLessonChildTurn,
  type TalkLessonTurn,
  type TalkTurnSegment,
  talkLessonSettingsFrom,
} from "../src/core/conversation/lesson-turns";
import {
  NO_CARD_ITEM,
  type TalkAppHelp,
  type TalkMove,
  type TalkSlotWhy,
  talkMoveOf,
} from "../src/core/conversation/move";
import {
  checkLowLevelQuestion,
  type LowLevelLineOptions,
  questionKeyOf,
  sameQuestionKeyHit,
  turnQuestionOf,
} from "../src/core/conversation/question-check";
import {
  type HeldQuestionFail,
  heldQuestionFailOf,
  mergeQuestionRetry,
  questionRetryNoteOf,
  stuckRewriteNoteOf,
} from "../src/core/conversation/question-retry";
import { metWordsIn } from "../src/core/conversation/said";
import {
  type AppendLine,
  normalizeSpoken,
  sayingAnswer,
  shownTurnOf,
  toriKoShownOf,
} from "../src/core/conversation/spoken";
import {
  createToriEnReader,
  createToriSentenceGate,
  isQuestionSentence,
  safeLineOf,
} from "../src/core/conversation/stream";
import {
  ForbiddenFileSchema,
  LevelSpecsFileSchema,
  ListFormsFileSchema,
  MetaSentencesFileSchema,
  type TalkLevelSpec,
  UnitSpecsFileSchema,
} from "../src/core/seed/schema/reference";
import { type TalkCard, TalkCardSchema } from "../src/core/seed/schema/talk";
import { TeachersFileSchema } from "../src/core/seed/schema/teachers";
import { bandOf } from "../src/core/seed/structure";
import { type FormRule, splitSentences, tokenize } from "../src/core/seed/text";
import { lemmaLookup } from "../src/core/session/attempt";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
} from "../tests/fixtures/ai/sample-inputs";
import {
  createScriptClient,
  loadScriptConfig,
  readApiKey,
  type ScriptConfig,
  ScriptInputError,
  withFormat,
} from "./ai-contract";
import { observeFailureOf } from "./ai-observe";

/** 대본 폴더(시험용 자료 — 단위 시험도 같은 파일을 읽는다). */
export const SCRIPT_DIR = "tests/fixtures/talk-observe";
const SEED_DIR = "seed";
/** --effort 로 견줄 값(D7: low vs medium). */
export const OBSERVE_EFFORTS = ["low", "medium"] as const;
export type ObserveEffort = (typeof OBSERVE_EFFORTS)[number];
/** 예상 비용 어림(추측, 설계 값 아님): 글자 → 토큰 · 턴마다 늘어나는 앞 턴 전문 · 응답 JSON 길이. 캐시는 셈하지 않는다(위쪽 어림). */
const CHARS_PER_TOKEN = 4;
const HISTORY_TOKENS_PER_TURN = 400;
const OUTPUT_TOKENS_PER_CALL = 600;
/** 재질문 요청에 더해지는 앞 tori_en · 다시 쓰기 메시지(추측). */
const RETRY_NOTE_TOKENS = 150;
const PRICE4_PER_MICRO = 10_000;
const EXIT_OK = 0;
const EXIT_INPUT = 2;
const PURPOSE = "talk_turn" as const;

// ── 인자 ─────────────────────────────────────────────────────────

export type TalkObserveArgs = {
  yes: boolean;
  script: string | null;
  level: number | null;
  effort: ObserveEffort | null;
  out: string | null;
};

export function parseArgs(
  argv: readonly string[],
): { ok: true; args: TalkObserveArgs } | { ok: false; error: string } {
  const args: TalkObserveArgs = {
    yes: false,
    script: null,
    level: null,
    effort: null,
    out: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === "--yes") {
      args.yes = true;
      continue;
    }
    if (
      arg !== "--script" &&
      arg !== "--level" &&
      arg !== "--effort" &&
      arg !== "--out"
    )
      return { ok: false, error: `모르는 인자: ${arg}` };
    if (value === undefined || value.startsWith("--"))
      return { ok: false, error: `${arg} 뒤에 값이 없다` };
    i += 1;
    if (arg === "--script") args.script = value;
    else if (arg === "--out") args.out = value;
    else if (arg === "--level") {
      const level = Number(value);
      if (!Number.isInteger(level) || level < 1)
        return { ok: false, error: "--level 은 1 이상 정수다" };
      args.level = level;
    } else {
      const effort = OBSERVE_EFFORTS.find((e) => e === value);
      if (!effort)
        return {
          ok: false,
          error: `--effort 는 ${OBSERVE_EFFORTS.join(" · ")} 가운데 하나다`,
        };
      args.effort = effort;
    }
  }
  return { ok: true, args };
}

// ── 대본 ─────────────────────────────────────────────────────────

/** 사람 판정 칸(브리프 할 것 2 · AC-15o (나) 되돌림). 값은 설계대로라면 어떠해야 하는가(기대)다. */
export const JUDGE_KEYS = [
  "followUp",
  "contextlessCard",
  "answerFirst",
  "koMeaning",
  "sceneAssert",
  "sameSoundTwice",
  "returns",
  "stuckRight",
  "ownReaction",
] as const;
export type JudgeKey = (typeof JUDGE_KEYS)[number];
export const JUDGE_LABELS: Readonly<Record<JudgeKey, string>> = {
  followUp: "이어 묻기였는가",
  contextlessCard: "카드 질문을 맥락 없이 끼웠는가",
  answerFirst: "답을 먼저 들려줬는가",
  koMeaning: "한국어 뜻 있는가",
  sceneAssert: "장면 단정 문장",
  sameSoundTwice: "같은 소리 두 번",
  returns: "오늘 이야기로 돌아왔는가",
  stuckRight: "막힘 판정 맞음",
  ownReaction: "선생님 자기 반응 한마디 있음",
};

const ExpectSchema = z.strictObject({
  ...Object.fromEntries(JUDGE_KEYS.map((k) => [k, z.boolean().optional()])),
  /** 낱말 답 턴: recast 가 이 낱말을 담은 바른 문장이어야 한다(AC-15o (가)). */
  recastWord: z.string().min(1).optional(),
}) as z.ZodType<Partial<Record<JudgeKey, boolean>> & { recastWord?: string }>;

const StepSchema = z
  .strictObject({
    /** 아이 말(인식 결과 흉내). */
    say: z.string().trim().min(1).optional(),
    /** '잘 모르겠어요' 단추 · 말소리 없음(기기 쪽). */
    input: z.enum(["dont_know", "nospeech"]).optional(),
    /** 아이가 연 힌트(없으면 앞 선생님 차례에서 들은 도움으로 앱처럼 정한다). */
    hint: z.enum(TALK_HINT_KINDS).optional(),
    hintTier: z.int().min(0).optional(),
    /** 설계된 대화의 그 차례 선생님 말(사람이 나란히 볼 예). */
    design: z.string().optional(),
    note: z.string().optional(),
    expect: ExpectSchema.optional(),
  })
  .refine((s) => (s.say === undefined) !== (s.input === undefined), {
    message: "차례마다 say 와 input 가운데 하나만 둔다",
  });
export type ObserveStep = z.infer<typeof StepSchema>;

const ScriptSchema = z.strictObject({
  name: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  level: z.int().min(1),
  unit: z.int().min(1),
  lesson: z.int().min(1),
  teacher: z.string().min(1),
  source: z.string().optional(),
  note: z.string().optional(),
  /** 짧은 준비에서 인식 실패로 건너뛴 낱말(보고에만 — 서버도 보인 낱말 전부를 만난 것으로 넘긴다, 분석 A9). */
  prep: z.strictObject({ skipped: z.array(z.string()) }).optional(),
  steps: z.array(StepSchema).min(1),
});
export type ObserveScript = z.infer<typeof ScriptSchema>;

export function parseObserveScript(
  raw: unknown,
  file: string,
): { ok: true; script: ObserveScript } | { ok: false; error: string } {
  const parsed = ScriptSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `${file}: ${first?.path.join(".") ?? ""} ${first?.message ?? "꼴이 틀렸다"}`,
    };
  }
  if (`${parsed.data.name}.json` !== file)
    return { ok: false, error: `${file}: name 이 파일 이름과 다르다` };
  return { ok: true, script: parsed.data };
}

/** 이름 · 단계로 대본을 고른다. */
export function selectScripts(
  scripts: readonly ObserveScript[],
  args: Pick<TalkObserveArgs, "script" | "level">,
): ObserveScript[] {
  return scripts.filter(
    (s) =>
      (args.script === null || s.name === args.script) &&
      (args.level === null || s.level === args.level),
  );
}

// ── 자료(시드 파일 → 메모리) ──────────────────────────────────────

/** 시드 파일 JSON(읽은 그대로). 회화 수업 파일이 없으면 lessonFile 은 null. */
export type SeedFiles = {
  lessonFile: unknown;
  levelSpecs: unknown;
  unitSpecs: unknown;
  teachers: unknown;
  vocab: unknown;
  forms: unknown;
  forbidden: unknown;
  meta: unknown;
};

/** 한 대본을 돌릴 재료(서버 state · 단계 맥락 · 질문 검사 범위를 시드로 채운 것). */
export type Materials = {
  level: number;
  unit: number;
  lessonNo: number;
  card: TalkCard;
  spec: TalkLevelSpec;
  newWords: string[];
  ctx: LevelContext;
  goalTexts: { id: string; ko: string }[];
  teacher: TalkTeacher;
  lemmaOf: (surface: string) => string | undefined;
  allowedWords: ReadonlySet<string>;
  forms: readonly FormRule[];
  allowedForms: ReadonlySet<string>;
  forbidden: z.infer<typeof ForbiddenFileSchema>;
  metaPhrases: readonly string[];
};

const LessonFileLite = z.object({
  area: z.literal("talk"),
  level: z.int(),
  unit: z.int(),
  lessons: z.array(
    z.object({
      lessonNo: z.int(),
      newWords: z.array(z.string()),
      card: z.unknown(),
    }),
  ),
});
const VocabLite = z.object({
  vocab: z.array(
    z.object({ word: z.string(), level: z.int(), forms: z.array(z.string()) }),
  ),
});

/** 시드 JSON → 재료. 카드 · 단계 규격 · 단원 규격 · 선생님이 없으면 그 까닭(돌리지 않고 계획에서 건너뜀). */
export function materialsOf(
  files: SeedFiles,
  where: Pick<ObserveScript, "level" | "unit" | "lesson" | "teacher">,
): { ok: true; materials: Materials } | { ok: false; missing: string } {
  const { level, unit, lesson, teacher } = where;
  const lessonPath = `seed/lessons/talk/${level}/${unit}.json`;
  if (files.lessonFile === null)
    return { ok: false, missing: `카드 시드 없음(${lessonPath})` };
  const lessons = LessonFileLite.safeParse(files.lessonFile);
  const row = lessons.success
    ? lessons.data.lessons.find((l) => l.lessonNo === lesson)
    : undefined;
  if (!row) return { ok: false, missing: `수업 ${lesson} 없음(${lessonPath})` };
  const card = TalkCardSchema.safeParse(row.card);
  if (!card.success)
    return { ok: false, missing: `새 꼴 카드가 아님(${lessonPath})` };
  const levelSpec = LevelSpecsFileSchema.parse(
    files.levelSpecs,
  ).levelSpecs.find((s) => s.area === "talk" && s.level === level);
  if (!levelSpec)
    return { ok: false, missing: `회화 ${level}단계 단계 규격 없음` };
  const spec = levelSpec as TalkLevelSpec;
  const unitRows = UnitSpecsFileSchema.parse(files.unitSpecs).unitSpecs.filter(
    (u) => u.area === "talk",
  ) as {
    level: number;
    unit: number;
    revision: number;
    learningElement: string;
    words: string[];
    goals?: { id: string; ko: string }[];
  }[];
  // 칸마다 가장 높은 판(서버 levelContextOf 의 pickByCell 과 같은 뜻 — 세션 시작 판은 없으니 시드의 마지막 판)
  const latest = new Map<string, (typeof unitRows)[number]>();
  for (const r of unitRows) {
    const key = `${r.level}-${r.unit}`;
    const had = latest.get(key);
    if (!had || had.revision < r.revision) latest.set(key, r);
  }
  const unitSpec = latest.get(`${level}-${unit}`);
  if (!unitSpec)
    return { ok: false, missing: `회화 ${level}단계 단원 ${unit} 규격 없음` };
  const prevLearningElements = [...latest.values()]
    .filter((r) => r.level < level || (r.level === level && r.unit < unit))
    .sort((a, b) => a.level - b.level || a.unit - b.unit)
    .map((r) => r.learningElement);
  const teacherRow = TeachersFileSchema.parse(files.teachers).teachers.find(
    (t) => t.key === teacher,
  );
  if (!teacherRow) return { ok: false, missing: `선생님 ${teacher} 없음` };
  const vocab = VocabLite.parse(files.vocab).vocab.filter(
    (v) => v.level <= level,
  );
  const unitWords = [...unitSpec.words];
  const unitSet = new Set(unitWords);
  const unitLemma = lemmaLookup(vocab.filter((v) => unitSet.has(v.word)));
  const rangeLemma = lemmaLookup(vocab);
  const formsFile = ListFormsFileSchema.parse(files.forms);
  const allowedForms = new Set(
    formsFile.forms
      .filter(({ introducedAt }) => {
        const at = introducedAt.rst;
        return (
          at !== null &&
          at !== undefined &&
          (at.level < level || (at.level === level && at.unit <= unit))
        );
      })
      .map(({ id }) => id),
  );
  return {
    ok: true,
    materials: {
      level,
      unit,
      lessonNo: lesson,
      card: card.data,
      spec,
      newWords: [...row.newWords],
      ctx: {
        level,
        canDo: spec.canDo,
        learningElement: unitSpec.learningElement,
        prevLearningElements,
        unitWords,
        sentenceMaxWords: spec.sentenceMaxWords,
      },
      goalTexts: (unitSpec.goals ?? []).map(({ id, ko }) => ({ id, ko })),
      teacher: { nameEn: teacherRow.nameEn, personaEn: teacherRow.personaEn },
      lemmaOf: (s) => unitLemma(s) ?? rangeLemma(s),
      allowedWords: new Set(vocab.map((v) => v.word.toLowerCase())),
      forms: formsFile.forms,
      allowedForms,
      forbidden: ForbiddenFileSchema.parse(files.forbidden),
      metaPhrases: MetaSentencesFileSchema.parse(files.meta).phrases,
    },
  };
}

// ── 요청 구성 ────────────────────────────────────────────────────

/**
 * 회화 턴 요청 본문: 구조화 출력 형식을 붙이고 응답 규격의 $defs · $ref 를 펼친다(서버 src/server/ai/talk.ts talkOutputFormatOf 와 같은 꼴 —
 * $ref 꼴은 API 가 'compiled grammar is too large' 로 거부한다, 대본 3회차 400). 서버 함수는 server-only 라 같은 core 함수로 펼친다.
 */
export function talkBodyOf(
  body: Record<string, unknown>,
  wireSchema: z.ZodType,
): Record<string, unknown> {
  const withSchema = withFormat(body, wireSchema);
  const output = withSchema.output_config as Record<string, unknown> & {
    format: { type: string; schema: Record<string, unknown> };
  };
  return {
    ...withSchema,
    output_config: {
      ...output,
      format: {
        type: output.format.type,
        schema: inlineJsonSchemaRefs(output.format.schema),
      },
    },
  };
}

/** 이 단계 회화 턴의 설정값(--effort 면 그 구간 effort 키만 바꾼 사본 — 설정 파일은 바꾸지 않는다). */
export function observeValues(
  values: Readonly<Record<string, unknown>>,
  level: number,
  effort: ObserveEffort | null,
): Record<string, unknown> {
  if (effort === null) return { ...values };
  return { ...values, [settingKeysOf(PURPOSE, level).effort]: effort };
}

// ── 메모리 대화 ──────────────────────────────────────────────────

/** 메모리 행(talk_turns 의 흉내 — 흐름 · 앞 턴 전문 · 보고가 읽는 칸만). */
export type SimRow =
  | {
      speaker: "tori";
      turnNo: number;
      text: string;
      rewrite: string;
      move: TalkMove;
      answerExample: string | null;
    }
  | {
      speaker: "child";
      turnNo: number;
      segment: TalkTurnSegment;
      text: string | null;
      input: TalkInputMode;
      nospeech: boolean;
      stuck: boolean;
      targets: string[];
      sentUserMessage: string | null;
    };

/** 차례 하나를 부르기 전 준비(요청 본문 · 계획 · 입력). */
export type PreparedTurn = {
  stepIndex: number;
  step: ObserveStep;
  childText: string | null;
  mode: TalkInputMode;
  nospeech: boolean;
  segment: TalkTurnSegment;
  ifAnswered: TeacherTurnPlan;
  ifStuck: TeacherTurnPlan | null;
  turn: TalkCallTurn;
  input: TalkLessonInput;
  rules: TalkLessonRules;
  userMessage: string;
  request: {
    body: Record<string, unknown>;
    betas: string[];
    timeoutMs: number;
    model: string;
    effort: string;
    thinking: string;
  };
  /** 부르기 전 흐름 값(보고). */
  before: {
    followRun: number;
    asked: ReadonlyMap<string, number>;
    silentBlocked: boolean;
    stuckInSlot: number;
  };
  hintKind: TalkHintKind;
  hintTier: number;
  heardHelp: TalkHeardHelp;
  /** 이번 아이 말이 노린 단어(지금 질문 자리의 낱말 — 서버 lessonChildLiteOf 의 targets). */
  targets: string[];
  /** 이번 사용자 메시지를 만든 때의 '바뀐 값' 재료(다음 턴의 비교 기준 — 서버 talkLessonInputOf 의 prev). */
  context: TalkLessonContext;
};

/** 응답 메시지(text 블록의 글을 읽는 꼴 — 서버 talk.ts 의 TalkMessage 와 같다). */
export type TalkMessage = Omit<MessageLike, "content"> & {
  content: readonly (ContentBlockLike & { text?: string })[];
};

/** 한 시도의 결과(실호출 · 시험의 가짜 응답이 같은 꼴로 넘긴다). */
export type CallResult =
  | {
      ok: true;
      message: TalkMessage;
      latencyMs: number;
      firstSentenceMs: number | null;
      requestId: string;
    }
  | { ok: false; status: number; detail: string; latencyMs: number };

export type TurnUsage = {
  model: string;
  stopReason: string;
  verdict: "strict" | "normalized" | "invalid";
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  latencyMs: number;
  firstSentenceMs: number | null;
  requestId: string;
  checkHits: number;
};

export type JudgeCell = { expect: boolean | null; auto: boolean | null };

/** 보고 한 줄(아이 차례 하나 → 선생님 차례 하나). */
export type TurnRecord = {
  no: number;
  child: string;
  segment: TalkTurnSegment;
  plan: string;
  teacher: string;
  attach: string[];
  toriKo: string | null;
  sound: { model?: string; choices?: [string, string]; answer?: string };
  recast: string;
  explanation: string;
  move: Pick<TalkMove, "kind" | "next" | "why" | "item" | "app" | "stage">;
  replaced: TalkSlotWhy | null;
  dropped: { en: string; reason: string }[];
  returned: string | null;
  sameQuestion: string | null;
  judge: Record<JudgeKey, JudgeCell>;
  recastCheck: { word: string; ok: boolean } | null;
  usage: TurnUsage | null;
  failure: string | null;
  flags: string[];
  design: string | null;
  /** 정규화 · 검사 뒤 AI 출력(JSON 보고에만). */
  output: TalkLessonOutput | null;
  /** 이 턴의 사용자 메시지(JSON 보고에만 — 앞 턴 전문 재료). */
  userMessage: string;
  /** 뒤따른 앱 차례(대화 첫 질문 등). */
  appAfter: string[];
  /**
   * 재질문(13절 C203 (3) — 1~3단계 질문 검사에 걸린 AI 되묻기를 카드 자리로 바꾸기 전에 AI 에 한 번 다시 쓰게 하는 재호출). 재호출 턴이면
   * 그 시도의 사용량(본 호출과 따로)과 결과, 아니면 null. 판정 · 입력 · 잇기는 core question-retry 의 함수다.
   */
  /** 응답 첫 칸 아이 말 갈래(13절 C204, 정규화 뒤 — 읽지 못했으면 null). */
  childKind: string | null;
  /** AI 의 stuck(정규화 전) · 앱이 본 막힘(effectiveStuckOf 뒤) · 앱이 막힘을 무름. */
  stuck: { ai: boolean | null; app: boolean; overridden: boolean };
  reask: {
    usage: TurnUsage | null;
    outcome: string;
    /** 첫 시도의 tori_en(정규화 뒤 — 걸린 질문이 든 글). */
    firstToriEn: string;
    /** 첫 시도의 걸림(retryOf 의 heldQuestionFailOf). */
    firstFail: QuestionFailNote;
    /** 다시 쓴 시도의 tori_en(응답을 읽지 못했으면 null). */
    retryToriEn: string | null;
    /** 다시 쓴 시도의 걸림(이은 질문의 질문 검사 · 같은 질문, 통과했거나 잇지 못했으면 null). */
    retryFail: QuestionFailNote | null;
  } | null;
};

/** 1~3단계 소리 줄 신호 말(서버 lesson-turn.ts CUE_PHRASES 사본 — 서버 파일은 server-only 라 가져올 수 없다). */
const CUE_PHRASES = [
  "listen and say",
  "listen and repeat",
  "repeat after me",
  "say it with me",
  "say it together",
  "say after me",
].map(normalizeSpoken);

function isSoundCue(sentence: string): boolean {
  const n = ` ${normalizeSpoken(sentence)} `;
  return CUE_PHRASES.some((p) => p !== "" && n.includes(` ${p} `));
}

/** 장면 단정 문장(아이 상태 · 행동을 단정 — 분석 A6 · 5.1 3): 'You are thirsty.' 꼴. 사람 판정의 자동 힌트다. */
const SCENE_ASSERT = /^(?:you are|you're|you look|you feel)\b[^?]*[.!]$/i;

export function isSceneAssert(sentence: string): boolean {
  return SCENE_ASSERT.test(sentence.trim());
}

function lessonTextOf(
  kept: readonly string[],
  attach: readonly TeacherAttachLine[],
): string {
  return [
    kept.join(" "),
    ...attach
      .filter((l) => l.kind !== "sound")
      .flatMap((l) => ("en" in l ? [l.en] : [])),
  ].join("\n");
}

function toAppend(line: TeacherAttachLine): AppendLine | null {
  if (line.kind === "question")
    return {
      kind: "question",
      en: line.en,
      ...(line.ko ? { ko: line.ko } : {}),
    };
  if (line.kind === "closing")
    return {
      kind: "more_prompt",
      en: line.en,
      ...(line.ko ? { ko: line.ko } : {}),
    };
  if (line.kind === "answer_example")
    return { kind: "answer_example", en: line.en };
  return null;
}

/** 겹침 없애기(서버 shownAttachOf 사본, C125 (3)). */
function shownAttachOf(
  kept: readonly string[],
  attach: readonly TeacherAttachLine[],
): TeacherAttachLine[] {
  const text = attach.flatMap((l) => {
    const a = toAppend(l);
    return a ? [a] : [];
  });
  const left = [...shownTurnOf(kept, text).append];
  return attach.filter((l) => {
    const a = toAppend(l);
    if (!a) return true;
    const at = left.findIndex(
      (s) => s.kind === a.kind && "en" in s && s.en === l.en,
    );
    if (at < 0) return false;
    left.splice(at, 1);
    return true;
  });
}

function questionLineOf(
  card: TalkCard,
  koMeaning: boolean,
  ref: TeacherTurnPlan["item"],
  role: "card" | "easy",
): TeacherAttachLine | null {
  const item = cardItemOf(card, ref);
  if (!item) return null;
  const text = role === "easy" ? item.easyQuestion : item;
  return {
    kind: "question",
    role,
    en: text.en,
    ...(koMeaning && text.ko ? { ko: text.ko } : {}),
    item: { ...ref },
  };
}

/** 질문이 지워진 AI 차례 → 카드 자리(서버 lessonCardSlotOf 사본, 3.3 카드 자리 (2) · (3) · C194 (1)). */
function cardSlotOf(
  chosen: TeacherTurnPlan,
  why: TalkSlotWhy,
  ctx: {
    card: TalkCard;
    turns: readonly TalkLessonTurn[];
    asked: ReadonlyMap<string, number>;
    max: number;
    low: boolean;
    koMeaning: boolean;
    dropped: readonly string[];
  },
): TeacherTurnPlan | null {
  const blocked = [
    ...new Set([...chosen.blocked, ...ctx.dropped.map(questionKeyOf)]),
  ];
  const guard = { blocked, asked: ctx.asked, max: ctx.max };
  const base: TeacherTurnPlan = {
    ...chosen,
    kind: "card_slot",
    callsAi: true,
    aiAsks: false,
    why,
    attach: [],
    app: [],
  };
  const afterStuck = chosen.cause === "button" || chosen.cause === "stuck";
  if (
    afterStuck &&
    chosen.stage === 2 &&
    chosen.easyFallback &&
    chosen.item.kind !== "none"
  ) {
    const line = questionLineOf(ctx.card, ctx.koMeaning, chosen.item, "easy");
    if (line) return { ...base, attach: [line], app: ["easy_question"] };
  }
  const attach: TeacherAttachLine[] = [];
  const app: TalkAppHelp[] = [];
  const answer =
    afterStuck || chosen.cause === "nospeech" ? chosen.answerFallback : null;
  if (answer) {
    attach.push(
      ctx.low
        ? { kind: "sound", role: "answer", en: answer }
        : { kind: "answer_example", en: answer },
    );
    app.push("answer_example");
  }
  const ref =
    slotChanceOf({ card: ctx.card, chances: chosen.chances, ...guard }) ??
    oldestMoreOf({ card: ctx.card, turns: ctx.turns, ...guard });
  const line = ref
    ? questionLineOf(ctx.card, ctx.koMeaning, ref, "card")
    : null;
  if (line) attach.push(line);
  if (attach.length === 0) return null;
  const item = ref ? cardItemOf(ctx.card, ref) : undefined;
  return {
    ...base,
    attach,
    app,
    ...(item && ref
      ? { item: { ...ref }, words: [...item.targets], goals: [...item.goals] }
      : {}),
  };
}

type Entry = {
  en: string;
  question: boolean;
  cue: boolean;
  state: "sent" | "held" | "dropped";
  reason?: "question" | "same" | "overlap" | "rewrite";
};

/** 선생님 문장 문(서버 createLessonSentenceFlow 의 accept 사본 — 흘려 받는 대신 응답 끝에 문장마다 차례로 넣는다). */
function sentenceEntriesOf(
  sentences: readonly string[],
  plan: TeacherTurnPlan,
  {
    low,
    asked,
    max,
  }: { low: boolean; asked: ReadonlyMap<string, number>; max: number },
): Entry[] {
  const list: Entry[] = [];
  let holding = false;
  let sameDropped = false;
  const answers = plan.attach.flatMap((l) =>
    l.kind === "sound" ? [l.en] : [],
  );
  const asks = plan.kind === "ai" && plan.aiAsks;
  for (const en of sentences) {
    const question = isQuestionSentence(en);
    const cue = low && isSoundCue(en);
    const entry: Entry = { en, question, cue, state: "sent" };
    if (
      answers.length > 0 &&
      sayingAnswer(
        en,
        answers.map((a) => [a, a] as const),
      )
    ) {
      entry.state = "dropped";
      entry.reason = "overlap";
    } else if (holding) entry.state = "held";
    else if (question && !asks) {
      entry.state = "dropped";
      entry.reason = "question";
    } else if (question && low) {
      holding = true;
      entry.state = "held";
    } else if (question && sameDropped) {
      entry.state = "dropped";
      entry.reason = "question";
    } else if (question) {
      const hit = sameQuestionKeyHit({
        key: questionKeyOf(en),
        blocked: plan.blocked,
        asked,
        max,
      });
      if (hit) {
        entry.state = "dropped";
        entry.reason = "same";
        sameDropped = true;
      }
    } else if (cue) {
      if (plan.kind === "ai") {
        holding = true;
        entry.state = "held";
      } else if (answers.length === 0) {
        entry.state = "dropped";
        entry.reason = "question";
      }
    }
    list.push(entry);
  }
  return list;
}

/** 걸림 한 건의 글: "질문" 까닭(걸린 낱말). */
function failText(f: QuestionFailNote): string {
  if (f.reason === "stuck_overridden")
    return "막힘 무름(AI stuck → 앱이 무름) — 통째로 다시 쓰기";
  return `"${f.question}" ${f.reason}${f.words.length > 0 ? `(${f.words.join(", ")})` : ""}`;
}

/** 뜻 칸(옛 한 글 꼴 · 문장마다 목록 꼴)이 비었으면 null. */
function koOrNull(
  ko: string | readonly string[],
): string | readonly string[] | null {
  if (typeof ko === "string") return ko.trim() === "" ? null : ko;
  return ko.some((k) => k.trim() !== "") ? ko : null;
}

export type Settled = {
  plan: TeacherTurnPlan;
  replaced: TalkSlotWhy | null;
  kept: string[];
  dropped: { en: string; reason: string }[];
  attach: TeacherAttachLine[];
  ko: string | null;
  sound: { model?: string; choices?: [string, string] };
  move: TalkMove;
  text: string;
  rewrite: string;
  answerExample: string | null;
};

/**
 * 회화 턴 결과 → 선생님 행(서버 settleLessonTurn 이번 패치 판을 줄여 옮김 — 정한 것 5 · 18 · 19). 1~3단계 잡아 둔 물음표 문장의 질문 검사 · 같은 질문,
 * 질문이 지워진 AI 차례의 카드 자리, 1~3단계 소리 줄(카드 자리면 버림), 신호 말 · 겹침 지우기, 겹침 없애기, 뜻 줄, move.
 * 응답이 없으면(실패) 카드 안전한 대사 한 줄로 반응 자리를 채운다(서버의 '한 줄' 길을 줄인 것).
 */
export function settleTurn({
  chosen,
  value,
  sentences,
  soundFixed,
  blockedSentences = 0,
  entries: givenEntries,
  needsQuestion = false,
  materials,
  turns,
  asked,
  max,
  lineOptions,
}: {
  chosen: TeacherTurnPlan;
  value: TalkLessonOutput | null;
  sentences: readonly string[];
  soundFixed: boolean;
  /** 문장 문(검사)에 걸려 바뀌거나 빠진 선생님 문장 수(서버 LessonOutcomeView.blocked). */
  blockedSentences?: number;
  /** 문장 문을 지난 문장(재질문을 이은 것 — 주면 sentences 대신 쓴다, 서버 withQuestionRetry 의 flow). */
  entries?: readonly Entry[];
  /** 통째 다시 쓰기에 실패해 앞 문장을 모두 지운 턴(서버 view.needsQuestion) — 질문이 없으면 카드 자리(fail). */
  needsQuestion?: boolean;
  materials: Pick<Materials, "card" | "spec">;
  turns: readonly TalkLessonTurn[];
  asked: ReadonlyMap<string, number>;
  max: number;
  lineOptions: LowLevelLineOptions;
}): Settled {
  const { card, spec } = materials;
  const low = spec.band === "1-3";
  const koMeaning = spec.koMeaning;
  const asks = chosen.kind === "ai" && chosen.aiAsks;
  const entries = givenEntries
    ? givenEntries.map((e) => ({ ...e }))
    : sentenceEntriesOf(sentences, chosen, { low, asked, max });
  let why: TalkSlotWhy | null = null;
  const dropped: string[] = entries
    .filter((e) => e.state === "dropped" && e.reason === "same")
    .map((e) => e.en);
  if (dropped.length > 0) why = "same_question";
  const heldQuestions = entries.filter((e) => e.state === "held" && e.question);
  if (heldQuestions.length > 0) {
    let fail: TalkSlotWhy | null = null;
    if (!value) fail = "fail";
    else {
      const ranged = heldQuestions.every(
        (q) =>
          checkLowLevelQuestion(q.en, {
            ...lineOptions,
            targets: value.next_targets,
          }).ok,
      );
      const same = sameQuestionKeyHit({
        key: questionKeyOf(heldQuestions.at(-1)?.en ?? ""),
        blocked: chosen.blocked,
        asked,
        max,
      });
      fail = !ranged ? "question_check" : same ? "same_question" : null;
    }
    if (fail) {
      for (const q of heldQuestions) {
        q.state = "dropped";
        q.reason = fail === "same_question" ? "same" : "question";
        dropped.push(q.en);
      }
      why = why ?? fail;
    }
  }
  const keptQuestion = entries.some(
    (e) => e.state !== "dropped" && e.question && !e.cue,
  );
  if (asks && !why && (!value || needsQuestion) && !keptQuestion) why = "fail";
  let plan = chosen;
  let replaced: TalkSlotWhy | null = null;
  // 재질문(C203 (3))은 부르는 쪽이 먼저 했다(retryOf → 재호출 → mergeQuestionRetry 로 이은 entries) — 여기서 다시 걸리면 카드 자리다
  if (asks && why) {
    const slot = cardSlotOf(chosen, why, {
      card,
      turns,
      asked,
      max,
      low,
      koMeaning,
      dropped,
    });
    if (slot) {
      plan = slot;
      replaced = why;
    }
  }
  const questionDropped = asks && (dropped.length > 0 || replaced !== null);
  const sound: Settled["sound"] = {};
  if (value && low && plan.kind === "ai") {
    if (value.model_line !== "") sound.model = value.model_line;
    if (!questionDropped && value.choices.length === 2)
      sound.choices = [value.choices[0] ?? "", value.choices[1] ?? ""];
  }
  const hasSound =
    sound.model !== undefined ||
    sound.choices !== undefined ||
    plan.attach.some((l) => l.kind === "sound");
  // 소리 줄의 답 짝(서버 server/ai/talk.ts soundPairsOf 이번 패치 판): 따라 할 말이 선택지 하나와 같은 말이면 따라 할 말 짝은 넣지 않는다
  const choicePairs: (readonly [string, string])[] = sound.choices
    ? [sound.choices]
    : [];
  const model = sound.model ?? "";
  const modelInChoices =
    model !== "" && choicePairs.length > 0 && sayingAnswer(model, choicePairs);
  const pairs: (readonly [string, string])[] = [
    ...(model !== "" && !modelInChoices ? [[model, model] as const] : []),
    ...choicePairs,
  ];
  for (const e of entries) {
    if (e.state !== "held") continue;
    if (e.cue && !hasSound) {
      e.state = "dropped";
      e.reason = "question";
    } else if (!e.cue && pairs.length > 0 && sayingAnswer(e.en, pairs)) {
      e.state = "dropped";
      e.reason = "overlap";
    }
  }
  // 실패 길: 카드 안전한 대사 한 줄(턴 번호로 돌려 고름)
  const all: Entry[] = value
    ? entries
    : [
        {
          en: safeLineOf(card.safeLines, turns.length),
          question: false,
          cue: false,
          state: "held",
        },
      ];
  const kept = all.filter((e) => e.state !== "dropped").map((e) => e.en);
  const attach = shownAttachOf(kept, plan.attach);
  // 뜻은 옛 한 글 꼴 · 문장마다 목록 꼴(13절 C202 (5)) 모두 받는다 — 빈 값이면 없음
  // 문장 문에 걸린 문장이 있는 응답은 걸린 문장의 뜻을 가려낼 수 없어 뜻을 보이지 않는다(서버 lesson-turn.ts 이번 패치 판, 13절 C202 (5))
  const koRaw =
    value && blockedSentences === 0 ? koOrNull(value.tori_ko) : null;
  const ko =
    !koMeaning || koRaw === null
      ? null
      : toriKoShownOf({
          ko: koRaw,
          sent: all.map((e) => e.en),
          shown: kept,
          lowBand: low,
        });
  const keepNext = plan.kind === "ai" && !questionDropped;
  const ai: TeacherMoveAi = value
    ? {
        next: keepNext ? value.next_move : "none",
        ...(keepNext
          ? {
              item: { ...value.card_item },
              words: [...value.next_targets],
              goals: [...value.next_goal],
            }
          : { item: { ...NO_CARD_ITEM }, words: [], goals: [] }),
        intro: replaced
          ? value.new_words.filter((w) =>
              kept.some((s) =>
                tokenize(s).some(
                  (t) =>
                    t.kind === "word" &&
                    t.text.toLowerCase() === w.toLowerCase(),
                ),
              ),
            )
          : [...value.new_words],
        suggest: {
          fit: value.response_fit,
          topic: value.child_topic,
          asked: value.child_asked,
          goals: value.goal_suggest.map((g) => ({ id: g.goal, why: g.why_ko })),
        },
        ai: replaced ? "none" : value.support,
      }
    : {};
  const moveBase = teacherMoveOf(plan, ai);
  const move = talkMoveOf({
    ...moveBase,
    ...(soundFixed &&
    sound.model !== undefined &&
    !moveBase.app.includes("model_line")
      ? { app: [...moveBase.app, "model_line"] }
      : {}),
    ...(sound.model !== undefined || sound.choices !== undefined
      ? {
          sound: {
            ...(moveBase.sound ?? {}),
            ...(sound.model !== undefined ? { model: sound.model } : {}),
            ...(sound.choices !== undefined ? { choices: sound.choices } : {}),
          },
        }
      : {}),
  });
  const text = lessonTextOf(kept, attach);
  const turnQuestion = turnQuestionOf(text, move.kind);
  return {
    plan,
    replaced,
    kept,
    dropped: all
      .filter((e) => e.state === "dropped")
      .map((e) => ({ en: e.en, reason: e.reason ?? "" })),
    attach,
    ko,
    sound,
    move,
    text,
    rewrite: talkLessonRewriteOf({
      sentSentences: kept,
      sound: {
        ...(sound.model !== undefined ? { modelLine: sound.model } : {}),
        ...(sound.choices !== undefined ? { choices: sound.choices } : {}),
      },
      appended: attach.flatMap((l) => ("en" in l ? [l.en] : [])),
    }),
    answerExample:
      value && keepNext && turnQuestion !== null
        ? value.next_answer_example
        : null,
  };
}

/** 응답 → 정규화 값(서버 parsedAnswer · ai-contract evaluateCall 과 같은 길). raw 는 정규화 전(소리 줄 바뀜 판정). */
export function evaluateLessonMessage(
  message: CallResult & { ok: true },
  input: TalkLessonInput,
  rules: TalkLessonRules,
): {
  verdict: "strict" | "normalized" | "invalid";
  value: TalkLessonOutput | null;
  raw: unknown;
} {
  const spec = talkLessonTurnSpec;
  const content = message.message.content as readonly {
    type: string;
    text?: string;
  }[];
  const joined = content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  let prepared: unknown;
  for (const text of [joined, answerTextOf({ content })]) {
    try {
      prepared = prepareAnswer(JSON.parse(text), spec.enumPaths);
      break;
    } catch {
      // 다음 글로
    }
  }
  if (prepared === undefined)
    return { verdict: "invalid", value: null, raw: null };
  const wire = spec.wireSchema(input, rules).safeParse(prepared);
  if (
    message.message.stop_reason === "end_turn" &&
    wire.success &&
    spec.validate(wire.data, input, rules).length === 0
  )
    return {
      verdict: "strict",
      value: spec.normalize(wire.data, input, rules),
      raw: prepared,
    };
  const value = spec.normalize(prepared, input, rules);
  return {
    verdict: value === null ? "invalid" : "normalized",
    value,
    raw: prepared,
  };
}

const lightOf = (row: SimRow): TalkLessonTurn =>
  row.speaker === "tori"
    ? {
        speaker: "teacher",
        text: row.text,
        move: row.move,
        answerExample: row.answerExample,
      }
    : {
        speaker: "child",
        segment: row.segment,
        input: row.input,
        stuck: row.stuck,
        nospeech: row.nospeech,
        targets: [...row.targets],
      };

const masker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});

/**
 * 한 차례에 같은 소리가 두 번 들리는가(자동 힌트, 검토 M-2): 읽는 줄 전부 — AI 선생님 문장 · 앱이 붙인 글 줄(카드 질문 · 답 예시 · 앱 대사,
 * 문장마다) · 소리 줄(따라 할 말 · 선택지 · 답 소리) — 가운데 정규화한 문장이 같은 것이 있거나, AI 문장이 소리 줄의 답을 담으면 참.
 */
export function sameSoundTwiceOf({
  kept,
  attach,
  sound,
}: {
  kept: readonly string[];
  attach: readonly TeacherAttachLine[];
  sound: Settled["sound"];
}): boolean {
  const soundLines = [
    ...(sound.model !== undefined ? [sound.model] : []),
    ...(sound.choices ?? []),
    ...attach.flatMap((l) => (l.kind === "sound" ? [l.en] : [])),
  ];
  const textLines = attach.flatMap((l) =>
    l.kind !== "sound" && "en" in l ? [l.en] : [],
  );
  const spoken = [...kept, ...textLines, ...soundLines]
    .flatMap(splitSentences)
    .map(normalizeSpoken)
    .filter((n) => n !== "");
  if (new Set(spoken).size < spoken.length) return true;
  const pairs = soundLines.map((l) => [l, l] as const);
  return pairs.length > 0 && kept.some((k) => sayingAnswer(k, pairs));
}

/** 선택 판정의 기대 값(대본) · 자동 힌트(이 턴의 사실로 셀 수 있는 것만, 나머지는 null — 사람이 본다). */
export function judgeOf({
  expect,
  move,
  kept,
  attach,
  ko,
  sound,
  spec,
  prevTeacher,
  lastChildSpoke,
  returned,
}: {
  expect: ObserveStep["expect"];
  move: TalkMove;
  kept: readonly string[];
  attach: readonly TeacherAttachLine[];
  ko: string | null;
  sound: Settled["sound"];
  spec: Pick<TalkLevelSpec, "koMeaning">;
  prevTeacher: TalkMove | null;
  lastChildSpoke: boolean;
  returned: string | null;
}): Record<JudgeKey, JudgeCell> {
  const text = lessonTextOf(kept, attach);
  const question = turnQuestionOf(text, move.kind);
  const answerSound = attach.flatMap((l) =>
    l.kind === "sound" || l.kind === "answer_example" ? [l.en] : [],
  );
  const soundLines = [
    ...(sound.model !== undefined ? [sound.model] : []),
    ...(sound.choices ?? []),
    ...answerSound,
  ].map(normalizeSpoken);
  const shown = [
    ...kept,
    ...attach.flatMap((l) => (l.kind === "question" ? [l.en] : [])),
  ];
  const cardQuestion =
    question !== null &&
    move.item.kind !== "none" &&
    (move.kind === "ai" || move.kind === "card_slot");
  const prevCard =
    prevTeacher !== null &&
    prevTeacher.item.kind !== "none" &&
    prevTeacher.stage === 0;
  const koLines = attach.filter((l) => l.kind === "question");
  const auto: Record<JudgeKey, boolean | null> = {
    followUp:
      move.kind === "ai" &&
      question !== null &&
      (move.next === "follow_up" || move.next === "follow_child"),
    // 앞 선생님 차례도 카드 질문이었고 아이가 말로 답했는데 이어 묻지 않고 카드 질문을 꺼낸 턴 — 사람이 맥락을 본다(의심 표시)
    contextlessCard:
      cardQuestion && prevCard && lastChildSpoke && move.stage === 0
        ? true
        : null,
    answerFirst: soundLines.length > 0,
    koMeaning: spec.koMeaning
      ? (kept.length === 0 || ko !== null) &&
        koLines.every((l) => l.kind === "question" && l.ko !== undefined)
      : null,
    sceneAssert: shown.some(isSceneAssert),
    sameSoundTwice: sameSoundTwiceOf({ kept, attach, sound }),
    returns: returned !== null,
    // 사람만 본다(검토 task-talk-quality-review-1 149줄 5): 막힘 판정은 턴 표 '갈래' 칸의 child_kind · 막힘 · 무름을 보고 적는다
    stuckRight: null,
    ownReaction: null,
  };
  return Object.fromEntries(
    JUDGE_KEYS.map((k) => [k, { expect: expect?.[k] ?? null, auto: auto[k] }]),
  ) as Record<JudgeKey, JudgeCell>;
}

export type TalkSim = {
  readonly rows: readonly SimRow[];
  /** 다음 대본 차례를 부를 준비. 흐름이 AI 를 부르지 않는 자리(마무리 고르기 · 닫힘 등)면 멈춘 까닭. */
  prepare(
    step: ObserveStep,
    stepIndex: number,
  ): { ok: true; turn: PreparedTurn } | { ok: false; reason: string };
  /**
   * 재질문(13절 C203 (3), 서버 withQuestionRetry 와 같은 판정): 성공 응답 · 질문을 쓰는 AI 차례 · 1~3단계에서 잡아 둔 질문이 검사에 걸리면
   * 다시 쓰게 할 요청(같은 입력 + 앞 tori_en · 다시 쓰기 메시지). 아니면 null. 한 턴에 한 번만 부른다.
   */
  retryOf(prepared: PreparedTurn, result: CallResult): RetryAsk | null;
  /** 결과(와 재질문 응답)를 받아 아이 행 · 선생님 행(과 뒤따르는 앱 차례)을 더하고 보고 한 줄을 돌려준다. */
  finish(
    prepared: PreparedTurn,
    result: CallResult,
    retry?: { ask: RetryAsk; result: CallResult },
  ): TurnRecord;
};

/** 걸림 한 건(까닭 · 걸린 낱말 — 질문 검사 까닭이거나 같은 질문 same_question). */
export type QuestionFailNote = {
  question: string;
  reason: string;
  words: string[];
};

/** 재질문 요청 하나(retryOf). */
export type RetryAsk = {
  /** question: 걸린 질문만 다시(C203 (3)) · rewrite: 막힘을 무른 턴을 통째로 다시(C204 (3), stuckRewriteNoteOf). */
  kind: "question" | "rewrite";
  fail: HeldQuestionFail | null;
  note: string;
  input: TalkLessonInput;
  request: PreparedTurn["request"];
};

/** 응답 하나를 읽은 값(정규화 · 출력 검사 · 걸린 칸 바꾸기 · 문장 문 — 서버 streamCore 끝 처리 흉내). */
type Evaluated = {
  value: TalkLessonOutput | null;
  /** 정규화 전 AI 의 stuck(앱이 무르기 전 — 정규화 effectiveStuckOf 뒤 값은 value.stuck). 읽지 못했으면 null. */
  aiStuck: boolean | null;
  sentences: string[];
  blocked: number;
  soundFixed: boolean;
  failure: string | null;
  usage: TurnUsage | null;
};

/**
 * 메모리 세션(서버 TalkLessonState 의 흉내): 첫 인사(앱) 행으로 시작해 대본 차례마다 흐름 계획 → 호출 입력 → (결과) → 행을 더한다.
 * 인사 끝 차례 뒤에는 짧은 준비를 지난 것으로 보고(1~3단계 늘 — 카드 prep 낱말 전부를 보인 낱말로) 대화 첫 질문(앱) 행을 더한다.
 * 아이는 새 아이다: '안다' 단어 없음 · 친한 정도 0 · 지난 대화 요약 없음 · 이월 없음.
 */
export function createTalkSim(
  materials: Materials,
  values: Readonly<Record<string, unknown>>,
  book: ScriptConfig["book"],
  options: {
    /** 인사 뒤 짧은 준비에서 건너뛴 낱말(대본 prep.skipped — 만난 낱말에서 뺀다, 서버 lesson-input.ts skippedPrepWordsOf · 분석 A9). */
    skippedPrep?: readonly string[];
  } = {},
): TalkSim {
  const { card, spec, level } = materials;
  const band = bandOf(level);
  const low = isLowBandLevel(level);
  const settings = talkLessonSettingsFrom((k) => values[k], band);
  const rules = talkLessonTurnSpec.rulesOf(values, {
    level,
  } as TalkLessonInput);
  const reqConfig = requestConfigOf({ purpose: PURPOSE, level, values, book });
  const rows: SimRow[] = [];
  let segment: LessonArgs["segment"] = "greeting";
  let prepWords: string[] = [];
  // 처음 스냅숏의 짧은 준비 계획(서버 index.ts talk-start prepPlan — 늘 모드만, 새 아이라 '안다' · 이월 없음)
  const prepPlan =
    settings.prepMode === "always"
      ? startPrepWordsOf({
          card,
          carryWords: [],
          unitWords: materials.newWords,
          known: [],
          count: settings.prepWords,
        })
      : [];
  let prevContext: TalkLessonContext | null = null;

  const lightTurns = () => rows.map(lightOf);
  const argsOf = (): LessonArgs => ({
    spec,
    card,
    newWords: materials.newWords,
    turns: lightTurns(),
    segment,
    settings,
    prepWords,
  });
  const lastTori = () =>
    rows.findLast((r) => r.speaker === "tori") as
      | (SimRow & { speaker: "tori" })
      | undefined;
  const nextToriNo = () => (rows.at(-1)?.turnNo ?? 0) + 1;

  /** 앱 차례(첫 인사 · 대화 첫 질문 — AI 없음) 행을 더한다. 더한 글을 돌려준다. */
  const appendAppTurns = (): string[] => {
    const added: string[] = [];
    for (;;) {
      const plan = nextTeacherTurnOf(argsOf());
      if (plan.kind !== "first_question" || plan.callsAi) return added;
      const text = lessonTextOf([], plan.attach);
      rows.push({
        speaker: "tori",
        turnNo: nextToriNo(),
        text,
        rewrite: talkLessonRewriteOf({
          sentSentences: [],
          appended: plan.attach.flatMap((l) => ("en" in l ? [l.en] : [])),
        }),
        move: teacherMoveOf(plan),
        answerExample: null,
      });
      added.push(text.trim());
    }
  };
  appendAppTurns();

  const historyOf = () =>
    rows.flatMap((child) => {
      if (child.speaker !== "child" || child.sentUserMessage === null)
        return [];
      const tori = rows.find(
        (r) => r.speaker === "tori" && r.turnNo === child.turnNo + 1,
      );
      return tori && tori.speaker === "tori"
        ? [{ user: child.sentUserMessage, assistant: tori.rewrite }]
        : [];
    });
  const openingLine = () => {
    const first = rows.find((r) => r.speaker === "tori" && r.turnNo === 1);
    return first?.speaker === "tori"
      ? first.rewrite
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l !== "")
          .join(" ")
      : undefined;
  };
  const childWords = (extra: string) => {
    const out = new Set<string>();
    for (const text of [
      ...rows.flatMap((r) => (r.speaker === "child" && r.text ? [r.text] : [])),
      extra,
    ])
      for (const t of tokenize(text))
        if (t.kind === "word") out.add(t.text.toLowerCase());
    return [...out];
  };
  const contextNow = (): TalkLessonContext => {
    // 만난 낱말: 보인 준비 낱말 가운데 건너뛴 것은 뺀다(서버 lessonContextAt 이번 패치 판). 다시 묻는 낱말(reaskWordsOf)에는 그대로 둔다
    const skipped = options.skippedPrep ?? [];
    const met = new Set(prepWords.filter((w) => !skipped.includes(w)));
    for (const r of rows)
      if (r.speaker === "tori")
        for (const w of metWordsIn(r.text, {
          unitWords: materials.ctx.unitWords,
          lemmaOf: materials.lemmaOf,
        }))
          met.add(w);
    const unknownWords = [...materials.ctx.unitWords];
    return {
      unknownWords,
      metUnknownWords: unknownWords.filter((w) => met.has(w)),
      newWords: [...materials.newWords],
      friendship: 0,
      missionsDone: [],
    };
  };
  const lineOptionsOf = (words: string[]): LowLevelLineOptions => ({
    sentenceMaxWords: materials.ctx.sentenceMaxWords,
    allowedWords: materials.allowedWords,
    unitWords: materials.ctx.unitWords,
    childWords: words,
    teacherName: materials.teacher.nameEn,
    lemmaOf: materials.lemmaOf,
    forms: materials.forms,
    allowedForms: materials.allowedForms,
  });

  /** 회화 턴 요청 본문(앱 흐름과 같은 길 — 구조화 출력 형식 · 자동 캐시). */
  const requestOf = (input: TalkLessonInput): PreparedTurn["request"] => {
    const built = buildAiRequest(talkLessonTurnSpec, input, {
      config: reqConfig,
      masker,
      rules,
    });
    return {
      body: talkBodyOf(
        built.body as unknown as Record<string, unknown>,
        built.wireSchema,
      ),
      betas: built.betas,
      timeoutMs: built.timeoutMs,
      model: reqConfig.model,
      effort: reqConfig.effort,
      thinking: reqConfig.thinking.type,
    };
  };
  /** 응답 첫 칸 stuck 으로 고른 계획(말 입력이고 막힘이면 막힘 계획). */
  const chosenOf = (
    p: PreparedTurn,
    value: TalkLessonOutput | null,
  ): TeacherTurnPlan =>
    value?.stuck === true && p.mode === "speech" && p.ifStuck
      ? p.ifStuck
      : p.ifAnswered;
  /**
   * 앱이 막힘을 무른 말 입력 턴(13절 C204 (3)): AI 는 stuck 참이었는데 정규화(effectiveStuckOf)가 거짓으로 무름. 1~3단계면 서버처럼 이 응답
   * 문장을 하나도 보내지 않고 모두 잡아 두며(holdAll), 질문을 쓰는 차례면 통째로 다시 쓰게 한다(withQuestionRetry rewrite).
   */
  const overriddenOf = (p: PreparedTurn, e: Evaluated): boolean =>
    p.mode === "speech" && e.aiStuck === true && e.value?.stuck === false;
  /**
   * 통째 다시 쓰기로 잡아 두는 턴인가(서버와 같은 core createRewriteHold — 앱이 막힘을 물렀고 · 보낸 문장이 없고 · 1~3단계 범위를 읽었고 ·
   * 고른 계획이 질문을 쓰는 차례). 도구는 stuck 칸이 tori_en 앞이라 늘 '보낸 문장 없음'이다.
   */
  const holdsOf = (
    p: PreparedTurn,
    e: Evaluated,
    chosen: TeacherTurnPlan,
  ): boolean => {
    const hold = createRewriteHold({ low, rangeOk: true });
    hold.onStuck(overriddenOf(p, e), chosen.kind === "ai" && chosen.aiAsks);
    return hold.holding();
  };
  /** 다시 쓰기에 실패한 잡아 둔 턴: 앞 응답 문장을 모두 지운다(서버 withQuestionRetry fallback droppedAll — 끝 처리가 카드 자리를 만든다). */
  const droppedAll = (list: readonly Entry[]): Entry[] =>
    list.map((e) => ({ ...e, state: "dropped" as const, reason: "rewrite" }));
  const heldAll = (list: readonly Entry[]): Entry[] =>
    list.map((e) =>
      e.state === "dropped" ? { ...e } : { ...e, state: "held" as const },
    );
  /** 응답 하나 읽기: 정규화 · 출력 검사 · 걸린 칸 바꾸기 · 문장 문(서버는 시도마다 새 문장 문). */
  const evaluateResult = (
    input: TalkLessonInput,
    model: string,
    result: CallResult,
  ): Evaluated => {
    if (!result.ok)
      return {
        value: null,
        aiStuck: null,
        sentences: [],
        blocked: 0,
        soundFixed: false,
        failure: `호출 실패 ${result.status} · ${result.detail}`,
        usage: null,
      };
    const evaluated = evaluateLessonMessage(result, input, rules);
    const cost = costOf(billedAttemptsOf(result.message, model), book);
    let hits = 0;
    let value: TalkLessonOutput | null = null;
    let sentences: string[] = [];
    let blocked = 0;
    let soundFixed = false;
    if (evaluated.value !== null) {
      const checks = checkOutputFields(talkLessonCheckFields(evaluated.value), {
        forbidden: materials.forbidden,
        sentenceMaxWords: materials.ctx.sentenceMaxWords,
      });
      hits = checks.size;
      value = applyTalkLessonChecks(evaluated.value, checks, input).value;
      const raw = (evaluated.raw ?? {}) as { model_line?: unknown };
      const rawModel =
        typeof raw.model_line === "string" ? raw.model_line.trim() : "";
      soundFixed = rawModel !== "" && rawModel !== value.model_line;
      const gate = createToriSentenceGate({
        forbidden: materials.forbidden,
        metaPhrases: materials.metaPhrases,
        safeLine: safeLineOf(card.safeLines, input.history.length + 1),
        sentenceMaxWords: materials.ctx.sentenceMaxWords,
      });
      sentences = splitSentences(value.tori_en).flatMap((one) => {
        const out = gate.accept(one);
        return out === null ? [] : [out];
      });
      blocked = gate.blocked().length;
    }
    const rawStuck = (evaluated.raw as { stuck?: unknown } | null)?.stuck;
    return {
      value,
      aiStuck: typeof rawStuck === "boolean" ? rawStuck : null,
      sentences,
      blocked,
      soundFixed,
      failure:
        evaluated.value === null
          ? `응답을 읽지 못함(${evaluated.verdict})`
          : null,
      usage: {
        model: result.message.model,
        stopReason: result.message.stop_reason ?? "",
        verdict: evaluated.verdict,
        inputTokens: cost.tokens.input,
        outputTokens: cost.tokens.output,
        cacheReadTokens: cost.tokens.cacheRead,
        cacheWriteTokens: cost.tokens.cacheWrite,
        costUsd: Number(formatUsd6(cost.costMicros)),
        latencyMs: result.latencyMs,
        firstSentenceMs: result.firstSentenceMs,
        requestId: result.requestId,
        checkHits: hits,
      },
    };
  };

  return {
    rows,
    prepare(step, stepIndex) {
      const args = argsOf();
      const position = talkLessonPositionOf(args);
      if (position.closed) return { ok: false, reason: "대화가 닫혔다" };
      if (position.choice !== null)
        return {
          ok: false,
          reason: `고르기 차례(${position.choice === "closing" ? "마무리 물음" : "마무리 제안"})에 닿아 멈춘다`,
        };
      if (position.lastRow !== "teacher")
        return { ok: false, reason: "선생님 차례 뒤가 아니다" };
      const mode: TalkInputMode =
        step.say === undefined ? "dont_know" : "speech";
      const nospeech = step.input === "nospeech";
      const cause =
        mode === "speech" ? "speech" : nospeech ? "nospeech" : "button";
      const childSegment = lessonTurnSegmentOf(position, cause, settings);
      const lite: TalkLessonChildTurn = {
        speaker: "child",
        segment: childSegment,
        input: mode,
        stuck: false,
        nospeech,
        targets: [...(position.slot?.words ?? [])],
      };
      const plans =
        mode === "speech"
          ? teacherTurnPlansOf(args, lite)
          : {
              ifAnswered: nextTeacherTurnOf({
                ...args,
                turns: [...args.turns, lite],
              }),
              ifStuck: null,
            };
      const { ifAnswered } = plans;
      if (!ifAnswered.callsAi || ifAnswered.kind === "none")
        return {
          ok: false,
          reason: `흐름이 회화 턴을 부르지 않는다(${ifAnswered.kind})`,
        };
      const prev = lastTori();
      const heard = [...new Set(heardHelpsOfMove(prev?.move ?? null, spec))];
      const allOpen = position.stuckInSlot >= OPEN_ALL_HINTS_FROM_DONT_KNOW;
      const englishTiers = spec.hintTiers.filter((t) => t !== "ko");
      const hintTier = allOpen ? spec.hintTiers.length : (step.hintTier ?? 0);
      const hintKind: TalkHintKind =
        step.hint ??
        (allOpen && englishTiers.length > 0
          ? "english"
          : hintKindOf({ opened: [], heard }));
      const heardHelp = heardHelpOf(heard);
      const childText = mode === "speech" ? masker(step.say ?? "").text : null;
      const planned = talkCallTurnOf({
        plan: ifAnswered,
        ifStuck: plans.ifStuck,
        child: childText ?? "",
        input: mode,
        hintKind,
        hintTier,
        heardHelp,
      });
      // 인사 끝 턴은 다음 토막을 알린다(서버 lesson-turn.ts 이번 패치 판 — 처음 스냅숏의 짧은 준비 계획이 있으면 준비)
      const turn: TalkCallTurn =
        planned.segment === "greeting_end"
          ? {
              ...planned,
              nextPart: prepPlan.length > 0 ? "prep" : "talk",
            }
          : planned;
      const now = contextNow();
      const history = historyOf();
      const opening = history.length === 0 ? openingLine() : undefined;
      const input: TalkLessonInput = {
        ...materials.ctx,
        spec,
        teacher: materials.teacher,
        card,
        goalTexts: materials.goalTexts,
        carryGoals: [],
        summaries: [],
        history,
        turn: { ...turn, context: talkLessonContextDelta(prevContext, now) },
        lineRange: {
          allowedWords: low ? materials.allowedWords : new Set(),
          forms: low ? materials.forms : [],
          allowedForms: low ? materials.allowedForms : new Set(),
          childWords: low ? childWords(childText ?? "") : [],
          reaskWords: reaskWordsOf({
            turns: args.turns,
            prepWords,
            metBefore: [],
          }),
        },
        ...(opening !== undefined ? { openingLine: opening } : {}),
        lemmaOf: materials.lemmaOf,
      };
      const userMessage = talkLessonUserMessage(
        input.turn,
        opening !== undefined
          ? { line: opening, teacherNameEn: materials.teacher.nameEn }
          : undefined,
      );
      return {
        ok: true,
        turn: {
          stepIndex,
          step,
          childText,
          mode,
          nospeech,
          segment: childSegment,
          ifAnswered,
          ifStuck: plans.ifStuck,
          turn,
          input,
          rules,
          userMessage,
          request: requestOf(input),
          before: {
            followRun: position.followRun,
            asked: new Map(position.askedQuestions),
            silentBlocked: position.silentBlocked,
            stuckInSlot: position.stuckInSlot,
          },
          hintKind,
          hintTier,
          heardHelp,
          targets: [...lite.targets],
          context: now,
        },
      };
    },
    retryOf(p, result) {
      if (!low) return null;
      const first = evaluateResult(p.input, p.request.model, result);
      if (!first.value) return null;
      const chosen = chosenOf(p, first.value);
      if (!(chosen.kind === "ai" && chosen.aiAsks)) return null;
      const rewrite = holdsOf(p, first, chosen);
      const listed = sentenceEntriesOf(first.sentences, chosen, {
        low,
        asked: p.before.asked,
        max: settings.sameQuestionMax,
      });
      const entries = rewrite ? heldAll(listed) : listed;
      const options = lineOptionsOf(childWords(p.childText ?? ""));
      const targets = first.value.next_targets;
      let fail: HeldQuestionFail | null = null;
      let note: string;
      if (rewrite) note = stuckRewriteNoteOf(p.childText ?? "");
      else {
        fail = heldQuestionFailOf({ entries, targets, options });
        if (fail === null) return null;
        note = questionRetryNoteOf(fail, {
          sentenceMaxWords: materials.ctx.sentenceMaxWords,
          targets,
          childWords: options.childWords,
        });
      }
      const input: TalkLessonInput = {
        ...p.input,
        retry: { previous: entries.map((e) => e.en).join(" "), note },
      };
      return {
        kind: rewrite ? "rewrite" : "question",
        fail,
        note,
        input,
        request: requestOf(input),
      };
    },
    finish(p, result, retry) {
      const turnNo = lastTori()?.turnNo ?? 0;
      const first = evaluateResult(p.input, p.request.model, result);
      const usage = first.usage;
      // 재호출로 이은 턴은 다시 쓴 응답의 따라 할 말 바뀜 표시를 쓴다(서버 N-4 와 같음, 검토 T-2)
      let soundFixed = first.soundFixed;
      const failure = first.failure;
      let value = first.value;
      let blockedSentences = first.blocked;
      const stuck = value?.stuck === true && p.mode === "speech";
      const chosen = chosenOf(p, value);
      const asked = p.before.asked;
      const stuckOverridden = overriddenOf(p, first);
      // 막힘을 무른 1~3단계 질문 차례는 보낸 문장이 없다 — 통째로 다시 쓰고, 못 하면 앞 문장을 모두 지워 카드 자리로(서버 withQuestionRetry fallback)
      const listed = value
        ? sentenceEntriesOf(first.sentences, chosen, {
            low,
            asked,
            max: settings.sameQuestionMax,
          })
        : undefined;
      const holding = holdsOf(p, first, chosen);
      let entries: Entry[] | undefined =
        listed && holding ? heldAll(listed) : listed;
      // 재질문(C203 (3)): 다시 쓴 응답의 첫 물음표 문장부터를 앞 응답의 반응 뒤에 잇는다. 끝 처리가 같은 검사를 다시 해 걸리면 카드 자리
      let reask: {
        usage: TurnUsage | null;
        outcome: string;
        firstToriEn: string;
        firstFail: QuestionFailNote;
        retryToriEn: string | null;
      } | null = null;
      let merged = false;
      const lineOptions = lineOptionsOf(childWords(p.childText ?? ""));
      if (retry) {
        const second = evaluateResult(
          retry.ask.input,
          retry.ask.request.model,
          retry.result,
        );
        const firstToriEn = value?.tori_en ?? "";
        const firstFail: QuestionFailNote = retry.ask.fail
          ? { ...retry.ask.fail, words: [...retry.ask.fail.words] }
          : { question: "", reason: "stuck_overridden", words: [] };
        let outcome = `첫 시도 ${failText(firstFail)} → `;
        if (value && entries && second.value) {
          const joined = mergeQuestionRetry({
            first: value,
            firstEntries: entries,
            retry: second.value,
            retryEntries: sentenceEntriesOf(second.sentences, chosen, {
              low,
              asked,
              max: settings.sameQuestionMax,
            }),
            whole: retry.ask.kind === "rewrite",
          });
          if (joined) {
            entries = joined.entries;
            value = joined.value;
            blockedSentences += second.blocked;
            merged = true;
            soundFixed = second.soundFixed;
          } else
            outcome += holding
              ? "다시 쓴 응답에 질문 없음 → 앞 문장을 모두 지우고 카드 자리"
              : "다시 쓴 응답에 질문 없음 → 앞 응답으로 카드 자리";
        } else
          outcome += `재호출 실패(${second.failure ?? "응답 없음"}) → 앞 응답으로 카드 자리`;
        reask = {
          usage: second.usage,
          outcome,
          firstToriEn,
          firstFail,
          retryToriEn: second.value?.tori_en ?? null,
        };
      }
      const needsQuestion = holding && !merged && listed !== undefined;
      if (needsQuestion) entries = droppedAll(listed);
      const child: SimRow = {
        speaker: "child",
        turnNo,
        // talk_turns.segment 에 greeting_end 가 없어 저장된 행은 greeting 이다(되짚기가 인사 끝을 스스로 안다)
        segment: p.segment === "greeting_end" ? "greeting" : p.segment,
        text: p.childText,
        input: p.mode,
        nospeech: p.nospeech,
        stuck,
        targets: [...p.targets],
        sentUserMessage: p.userMessage,
      };
      const turnsWithChild = [...lightTurns(), lightOf(child)];
      const settled = settleTurn({
        chosen,
        value,
        sentences: first.sentences,
        soundFixed,
        blockedSentences,
        ...(entries ? { entries } : {}),
        needsQuestion,
        materials,
        turns: turnsWithChild,
        asked,
        max: settings.sameQuestionMax,
        lineOptions,
      });
      // 다시 쓴 시도의 걸림: 이은 질문을 같은 질문 검사에 다시 대 본다(끝 처리와 같은 재료). 같은 질문으로 바뀌었으면 그 까닭
      let retryFail: QuestionFailNote | null = null;
      if (reask && merged && settled.replaced !== null) {
        const fail =
          entries && value
            ? heldQuestionFailOf({
                entries,
                targets: value.next_targets,
                options: lineOptions,
              })
            : null;
        retryFail = fail
          ? { ...fail, words: [...fail.words] }
          : {
              question:
                entries?.findLast((e) => e.question && !e.cue)?.en ?? "",
              reason: settled.replaced,
              words: [],
            };
      }
      const reaskRecordOf = (
        r: NonNullable<typeof reask>,
        f: QuestionFailNote | null,
      ): NonNullable<TurnRecord["reask"]> => ({
        ...r,
        retryFail: f,
        outcome: merged
          ? `${r.outcome}${f === null ? `다시 쓴 질문 통과("${entries?.findLast((e) => e.question && !e.cue)?.en ?? ""}")` : `다시 써도 걸림 ${failText(f)} → 카드 자리(${settled.replaced})`}`
          : r.outcome,
      });
      rows.push(child);
      const prevTeacher = lastTori()?.move ?? null;
      rows.push({
        speaker: "tori",
        turnNo: turnNo + 1,
        text: settled.text,
        rewrite: settled.rewrite,
        move: settled.move,
        answerExample: settled.answerExample,
      });
      prevContext = p.context;
      if (p.segment === "greeting_end") {
        // 인사 끝 뒤 짧은 준비(1~3단계 늘 · 4단계부터 필요할 때만 — 첫 묶음 흉내는 늘 모드만)
        segment = "talk";
        prepWords = [...prepPlan];
      }
      const appAfter = appendAppTurns();

      const question = turnQuestionOf(settled.text, settled.move.kind);
      let sameQuestion: string | null = null;
      if (question !== null) {
        const key = questionKeyOf(question);
        const n = (p.before.asked.get(key) ?? 0) + 1;
        if (chosen.blocked.includes(key)) sameQuestion = "막힌 뒤 같은 질문";
        else if (n >= 2) sameQuestion = `같은 질문 ${n}번째`;
      }
      if (settled.dropped.some((d) => d.reason === "same"))
        sameQuestion = `${sameQuestion ?? ""}${sameQuestion ? " · " : ""}앱이 같은 질문을 지움`;
      const m = settled.move;
      const supportMove = m.stage > 0 || m.cause !== null;
      const returned =
        p.before.followRun > 0 &&
        !supportMove &&
        m.next !== "follow_child" &&
        (m.kind === "card_slot" ||
          m.next === "required" ||
          m.next === "more" ||
          m.next === "introduce")
          ? `돌아옴(따라가기 ${p.before.followRun}턴 뒤)`
          : null;
      const flags: string[] = [];
      if (talkLessonPositionOf(argsOf()).silentBlocked)
        flags.push("들리지 않음이 이어져 막힘 화면(speech.silent_items_max)");
      if (stuck) flags.push("응답이 막힘 말로 봄(stuck)");
      if (stuckOverridden)
        flags.push("막힘 무름(AI stuck → 앱이 무름, C204 (3))");
      if ((usage?.checkHits ?? 0) > 0)
        flags.push(`출력 검사 걸림 ${usage?.checkHits}칸`);
      if (soundFixed) flags.push("따라 할 말을 앱이 바꿈");
      const recastWord = p.step.expect?.recastWord;
      const recast = value?.recast ?? "";
      return {
        no: p.stepIndex + 1,
        child:
          p.mode === "speech"
            ? (p.step.say ?? "")
            : p.nospeech
              ? "(말소리 없음)"
              : "(잘 모르겠어요)",
        segment: p.segment,
        plan: `${chosen.kind}${chosen.aiAsks ? " · 질문" : ""}${chosen.stage > 0 ? ` · 받침 ${chosen.stage}` : ""}`,
        teacher: settled.kept.join(" "),
        attach: settled.attach.flatMap((l) =>
          l.kind === "sound" ? [] : "en" in l ? [l.en] : [],
        ),
        toriKo: settled.ko,
        sound: {
          ...settled.sound,
          ...(settled.attach.some((l) => l.kind === "sound")
            ? {
                answer: settled.attach
                  .flatMap((l) => (l.kind === "sound" ? [l.en] : []))
                  .join(" "),
              }
            : {}),
        },
        recast,
        explanation: value?.explanation ?? "",
        move: {
          kind: m.kind,
          next: m.next,
          why: m.why,
          item: m.item,
          app: m.app,
          stage: m.stage,
        },
        replaced: settled.replaced,
        dropped: settled.dropped,
        returned,
        sameQuestion,
        judge: judgeOf({
          expect: p.step.expect,
          move: m,
          kept: settled.kept,
          attach: settled.attach,
          ko: settled.ko,
          sound: settled.sound,
          spec,
          prevTeacher,
          lastChildSpoke: p.mode === "speech" && !stuck,
          returned,
        }),
        recastCheck:
          recastWord === undefined
            ? null
            : {
                word: recastWord,
                ok: tokenize(recast).some(
                  (t) =>
                    t.kind === "word" &&
                    (t.text.toLowerCase() === recastWord.toLowerCase() ||
                      materials.lemmaOf(t.text) === recastWord.toLowerCase()),
                ),
              },
        usage,
        failure,
        flags,
        design: p.step.design ?? null,
        output: value,
        userMessage: p.userMessage,
        appAfter,
        childKind: first.value?.child_kind ?? null,
        stuck: {
          ai: first.aiStuck,
          app: stuck,
          overridden: stuckOverridden,
        },
        reask: reask === null ? null : reaskRecordOf(reask, retryFail),
      };
    },
  };
}

// ── 계획 · 비용 어림 ─────────────────────────────────────────────

export type PlanRun = {
  name: string;
  title: string;
  level: number;
  childTurns: number;
  calls: number;
  /** 첫 턴 요청의 시스템 프롬프트 · 응답 규격 글자 수(어림 재료). 건너뛴 대본은 0. */
  promptChars: number;
  expectedTokens: { input: number; output: number };
  expectedCostUsd: number;
  model: string;
  effort: string;
  thinking: string;
  skipped: string | null;
  /** 재질문(C203 (3)) 상한: 1~3단계에서 질문을 쓸 수 있는 말 입력 차례마다 1회(첫 차례 인사 끝은 질문이 없어 뺌). 4단계부터 0. */
  reaskMax: number;
  reaskMaxCostUsd: number;
};

/**
 * 예상 호출 · 비용(추측): 대본의 아이 차례마다 회화 턴 한 번(인사 첫 말 · 대화 첫 질문은 앱). 호출 i 의 입력은 첫 요청의 프롬프트 글자 /
 * CHARS_PER_TOKEN + i × HISTORY_TOKENS_PER_TURN, 출력은 OUTPUT_TOKENS_PER_CALL. 캐시 읽기 할인은 셈하지 않는다(위쪽 어림).
 * 재질문은 상한만 따로 적는다: 같은 차례 입력 + 앞 tori_en · 다시 쓰기 메시지(RETRY_NOTE_TOKENS).
 */
export function planRunOf(
  script: ObserveScript,
  info:
    | {
        ok: true;
        promptChars: number;
        model: string;
        effort: string;
        thinking: string;
        price: { input4: number; output4: number } | undefined;
      }
    | { ok: false; missing: string },
): PlanRun {
  const base = {
    name: script.name,
    title: script.title,
    level: script.level,
    childTurns: script.steps.length,
  };
  if (!info.ok)
    return {
      ...base,
      calls: 0,
      promptChars: 0,
      expectedTokens: { input: 0, output: 0 },
      expectedCostUsd: 0,
      model: "",
      effort: "",
      thinking: "",
      skipped: info.missing,
      reaskMax: 0,
      reaskMaxCostUsd: 0,
    };
  const calls = script.steps.length;
  const first = Math.ceil(info.promptChars / CHARS_PER_TOKEN);
  let input = 0;
  for (let i = 0; i < calls; i++) input += first + i * HISTORY_TOKENS_PER_TURN;
  const output = calls * OUTPUT_TOKENS_PER_CALL;
  const microsOf = (inTokens: number, outTokens: number) =>
    info.price
      ? (inTokens * info.price.input4 + outTokens * info.price.output4) /
        PRICE4_PER_MICRO
      : 0;
  const micros = microsOf(input, output);
  const reaskAt = isLowBandLevel(script.level)
    ? script.steps.flatMap((step, i) =>
        i > 0 && step.say !== undefined ? [i] : [],
      )
    : [];
  const reaskMicros = reaskAt.reduce(
    (sum, i) =>
      sum +
      microsOf(
        first + i * HISTORY_TOKENS_PER_TURN + RETRY_NOTE_TOKENS,
        OUTPUT_TOKENS_PER_CALL,
      ),
    0,
  );
  return {
    ...base,
    calls,
    promptChars: info.promptChars,
    expectedTokens: { input, output },
    expectedCostUsd: Math.round(micros) / 1_000_000,
    model: info.model,
    effort: info.effort,
    thinking: info.thinking,
    skipped: null,
    reaskMax: reaskAt.length,
    reaskMaxCostUsd: Math.round(reaskMicros) / 1_000_000,
  };
}

export function planLines(
  runs: readonly PlanRun[],
  meta: { settingsSource: string; pricesSource: string; out: string },
): string[] {
  const live = runs.filter((r) => r.skipped === null);
  const calls = live.reduce((s, r) => s + r.calls, 0);
  const cost = live.reduce((s, r) => s + r.expectedCostUsd, 0);
  const reask = live.reduce((s, r) => s + r.reaskMax, 0);
  const reaskCost = live.reduce((s, r) => s + r.reaskMaxCostUsd, 0);
  return [
    `talk-observe: 계획만(부르지 않음 — 실제 호출은 --yes) · 설정 ${meta.settingsSource} · 단가 ${meta.pricesSource}`,
    ...runs.map((r) =>
      r.skipped !== null
        ? `${r.name} · ${r.level}단계 · 아이 차례 ${r.childTurns} · 건너뜀: ${r.skipped}`
        : `${r.name} · ${r.level}단계 · ${r.model} · effort ${r.effort} · 생각 ${r.thinking} · 아이 차례 ${r.childTurns} · 예상 호출 ${r.calls} · 입력 약 ${r.expectedTokens.input} · 출력 약 ${r.expectedTokens.output} 토큰 · 약 ${r.expectedCostUsd.toFixed(4)}달러 · 재질문 최대 +${r.reaskMax}회(약 ${r.reaskMaxCostUsd.toFixed(4)}달러)`,
    ),
    `합계: 대본 ${runs.length}(돌릴 것 ${live.length}) · 예상 호출 ${calls} · 예상 비용 약 ${cost.toFixed(4)}달러 · 재질문 최대 +${reask}회(한 턴에 1회 상한, 1~3단계 질문 검사에 걸리거나 막힘을 무른 턴만 — 약 ${reaskCost.toFixed(4)}달러 더) · 캐시 할인을 셈하지 않은 위쪽 어림`,
    `보고 자리: ${meta.out}`,
  ];
}

// ── 보고 ─────────────────────────────────────────────────────────

export type RunReport = {
  script: Pick<
    ObserveScript,
    | "name"
    | "title"
    | "level"
    | "unit"
    | "lesson"
    | "teacher"
    | "source"
    | "note"
    | "prep"
  >;
  model: string;
  effort: string;
  thinking: string;
  turns: TurnRecord[];
  opening: string[];
  stopped: string | null;
};

const cell = (text: string) =>
  text.replaceAll("|", "\\|").replaceAll("\n", " / ").trim() || "—";
const yn = (v: boolean | null) => (v === null ? "—" : v ? "예" : "아니요");

/** 갈래 칸: child_kind · 막힘(AI → 앱, 무름 표시). 말 입력이 아니면 갈래가 없다. */
function childKindCell(t: TurnRecord): string {
  const kind = t.childKind ?? "—";
  const ai = t.stuck.ai === null ? "—" : t.stuck.ai ? "참" : "거짓";
  return t.stuck.overridden
    ? `${kind} · 막힘 ${ai} → 무름`
    : `${kind} · 막힘 ${t.stuck.app ? "참" : "거짓"}`;
}

function soundCell(s: TurnRecord["sound"]): string {
  return [
    s.model !== undefined ? `따라 할 말 〈${s.model}〉` : "",
    s.choices ? `선택지 〈${s.choices[0]}〉〈${s.choices[1]}〉` : "",
    s.answer !== undefined ? `답 소리 〈${s.answer}〉` : "",
  ]
    .filter((x) => x !== "")
    .join(" · ");
}

function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] ??
    null
  );
}

export type ObserveTotals = {
  turns: number;
  calls: number;
  failures: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  firstSentenceP50: number | null;
  firstSentenceP95: number | null;
  followUps: number;
  aiTurns: number;
  replaced: Record<string, number>;
  sameQuestion: number;
  /** 재질문 턴 수 · 그 비용(본 호출 비용과 따로). */
  reaskTurns: number;
  reaskCostUsd: number;
  sceneAssert: number;
  answerFirst: number;
  expectMismatch: number;
};

export function totalsOf(runs: readonly RunReport[]): ObserveTotals {
  const turns = runs.flatMap((r) => r.turns);
  const used = turns.flatMap((t) => (t.usage ? [t.usage] : []));
  const first = used.flatMap((u) =>
    u.firstSentenceMs === null ? [] : [u.firstSentenceMs],
  );
  const replaced: Record<string, number> = {};
  for (const t of turns)
    if (t.replaced) replaced[t.replaced] = (replaced[t.replaced] ?? 0) + 1;
  return {
    turns: turns.length,
    calls: used.length,
    failures: turns.filter((t) => t.failure !== null).length,
    inputTokens: used.reduce((s, u) => s + u.inputTokens, 0),
    outputTokens: used.reduce((s, u) => s + u.outputTokens, 0),
    cacheReadTokens: used.reduce((s, u) => s + u.cacheReadTokens, 0),
    costUsd: Math.round(used.reduce((s, u) => s + u.costUsd, 0) * 1e6) / 1e6,
    reaskTurns: turns.filter((t) => t.reask !== null).length,
    reaskCostUsd:
      Math.round(
        turns.reduce((s, t) => s + (t.reask?.usage?.costUsd ?? 0), 0) * 1e6,
      ) / 1e6,
    firstSentenceP50: percentile(first, 0.5),
    firstSentenceP95: percentile(first, 0.95),
    followUps: turns.filter((t) => t.judge.followUp.auto === true).length,
    aiTurns: turns.filter((t) => t.move.kind === "ai").length,
    replaced,
    sameQuestion: turns.filter((t) => t.sameQuestion !== null).length,
    sceneAssert: turns.filter((t) => t.judge.sceneAssert.auto === true).length,
    answerFirst: turns.filter((t) => t.judge.answerFirst.auto === true).length,
    expectMismatch: turns.reduce(
      (s, t) =>
        s +
        JUDGE_KEYS.filter((k) => {
          const c = t.judge[k];
          return c.expect !== null && c.auto !== null && c.expect !== c.auto;
        }).length,
      0,
    ),
  };
}

export function reportMarkdown({
  date,
  runs,
  skipped,
}: {
  date: string;
  runs: readonly RunReport[];
  skipped: readonly PlanRun[];
}): string {
  const out: string[] = [
    `# 회화 수업 실호출 표본 평가(talk:observe · ${date})`,
    "",
    "읽는 법. 아이 말은 대본의 글(인식 결과 흉내)이고 흐름은 앱의 순수 함수를 메모리 상태로 돌린 것이다. 〈 〉 는 글 없이 소리로만 나가는 줄이다. '자동'은 이 턴의 사실로 센 힌트이고 판정은 '사람' 칸에 적는다(□ 를 예 · 아니요로). '—' 는 값 없음이다.",
    "",
  ];
  for (const r of runs) {
    const s = r.script;
    out.push(
      `## ${s.title}(\`${s.name}\` · ${s.level}단계 단원 ${s.unit} 수업 ${s.lesson} · 선생님 ${s.teacher} · ${r.model} · effort ${r.effort} · 생각 ${r.thinking})`,
      "",
    );
    if (s.source) out.push(`출처: ${s.source}`, "");
    if (s.note) out.push(s.note, "");
    if (s.prep?.skipped.length)
      out.push(
        `짧은 준비에서 건너뜀(인식 실패 흉내): ${s.prep.skipped.join(" · ")} — 다시 묻는 낱말(reaskWords)에는 보인 낱말 전부가 들고, 이미 만난 낱말(사용자 메시지 'Already met')에서는 뺀다(서버와 같음, 분석 A9).`,
        "",
      );
    if (r.opening.length > 0)
      out.push(`앱 첫 차례: ${r.opening.map(cell).join(" / ")}`, "");
    out.push(
      "| 차례 | 아이(대본) | 갈래(child_kind · 막힘) | 계획 | 선생님 말 | 붙인 줄 | tori_ko | 소리 줄 | recast | 갈래 | 카드 자리 까닭 | 되돌림 | 같은 질문 | 토큰(입력 · 출력 · 캐시 읽기) | 첫 문장 · 전체 ms | 비용 | 표시 |",
      "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    );
    for (const t of r.turns) {
      const u = t.usage;
      out.push(
        `| ${t.no} | ${cell(t.child)} | ${cell(childKindCell(t))} | ${cell(t.plan)} | ${cell(t.teacher)} | ${cell(t.attach.join(" / "))} | ${cell(t.toriKo ?? "")} | ${cell(soundCell(t.sound))} | ${cell(t.recast)}${t.recastCheck ? ` (${t.recastCheck.word} ${t.recastCheck.ok ? "담음" : "없음"})` : ""} | ${t.move.kind} · ${t.move.next} | ${cell(t.replaced ?? t.move.why ?? "")} | ${cell(t.returned ?? "")} | ${cell(t.sameQuestion ?? "")} | ${u ? `${u.inputTokens} · ${u.outputTokens} · ${u.cacheReadTokens}` : "—"} | ${u ? `${u.firstSentenceMs ?? "—"} · ${u.latencyMs}` : "—"} | ${u ? u.costUsd.toFixed(6) : "—"}${t.reask ? ` · 재질문 ${t.reask.usage ? t.reask.usage.costUsd.toFixed(6) : "—"}` : ""} | ${cell([...(t.failure ? [t.failure] : []), ...(t.reask ? [`재질문: ${t.reask.outcome}`] : []), ...t.flags, ...(t.appAfter.length > 0 ? [`앱 다음 차례: ${t.appAfter.join(" / ")}`] : [])].join(" · "))} |`,
      );
    }
    if (r.stopped) out.push("", `멈춤: ${r.stopped}`);
    out.push(
      "",
      "### 나란히(설계 예시 · 기대 옆에 실제)",
      "",
      `| 차례 | 설계된 대화(대본) | 실제 선생님 말 | ${JUDGE_KEYS.map((k) => `${JUDGE_LABELS[k]}: 기대 · 자동 · 사람`).join(" | ")} |`,
      `|---|---|---|${JUDGE_KEYS.map(() => "---").join("|")}|`,
    );
    for (const t of r.turns) {
      const actual = [t.teacher, ...t.attach, soundCell(t.sound)]
        .filter((x) => x !== "")
        .join(" / ");
      out.push(
        `| ${t.no} | ${cell(t.design ?? "")} | ${cell(actual)} | ${JUDGE_KEYS.map((k) => `${yn(t.judge[k].expect)} · ${yn(t.judge[k].auto)} · □`).join(" | ")} |`,
      );
    }
    out.push("");
  }
  for (const s of skipped)
    out.push(`- 건너뜀: \`${s.name}\`(${s.level}단계) — ${s.skipped}`);
  const t = totalsOf(runs);
  out.push(
    "",
    "## 합계",
    "",
    "| 항목 | 값 |",
    "|---|---|",
    `| 아이 차례 · 호출 · 실패 | ${t.turns} · ${t.calls} · ${t.failures} |`,
    `| 토큰(입력 · 출력 · 캐시 읽기) | ${t.inputTokens} · ${t.outputTokens} · ${t.cacheReadTokens} |`,
    `| 비용(달러, 본 호출) | ${t.costUsd.toFixed(6)} |`,
    `| 재질문 턴 · 비용(달러, 따로) | ${t.reaskTurns} · ${t.reaskCostUsd.toFixed(6)} |`,
    `| 첫 문장 p50 · p95(ms) | ${t.firstSentenceP50 ?? "—"} · ${t.firstSentenceP95 ?? "—"} |`,
    `| 이어 묻기(자동) · AI 차례 | ${t.followUps} · ${t.aiTurns} |`,
    `| 카드 자리로 바꾼 턴(까닭별) | ${
      Object.entries(t.replaced)
        .map(([k, v]) => `${k} ${v}`)
        .join(" · ") || "0"
    } |`,
    `| 같은 질문 표시 턴 | ${t.sameQuestion} |`,
    `| 장면 단정(자동) · 답을 먼저 들려줌(자동) | ${t.sceneAssert} · ${t.answerFirst} |`,
    `| 기대와 자동 힌트가 다른 칸 | ${t.expectMismatch} |`,
    `| 카드 질문을 맥락 없이 끼운 턴(사람 판정, AC-15o (라)) | □ |`,
    "",
  );
  return out.join("\n");
}

// ── 실행 ─────────────────────────────────────────────────────────

export type TalkObserveIo = {
  root: string;
  config: ScriptConfig;
  readScripts: () => { file: string; raw: unknown }[];
  readSeed: (level: number, unit: number) => SeedFiles;
  createClient: () => Anthropic;
  log: (line: string) => void;
  write: (path: string, text: string) => void;
  now?: () => Date;
};

/** 흘려 받기 시도 하나(베타 stream · maxRetries 0). tori_en 의 첫 문장이 끝난 시각을 잰다(서버 첫 문장 시간과 같은 뜻 — 문장 문 앞). */
async function streamTurn(
  client: Anthropic,
  request: PreparedTurn["request"],
): Promise<CallResult> {
  const started = Date.now();
  const reader = createToriEnReader();
  let firstSentenceMs: number | null = null;
  const stream = client.beta.messages.stream(
    {
      ...request.body,
      ...(request.betas.length > 0 ? { betas: request.betas } : {}),
    } as never,
    { timeout: request.timeoutMs },
  );
  stream.on("text", (delta) => {
    if (reader.push(delta).length > 0 && firstSentenceMs === null)
      firstSentenceMs = Date.now() - started;
  });
  try {
    const message = await stream.finalMessage();
    return {
      ok: true,
      message: message as unknown as Extract<
        CallResult,
        { ok: true }
      >["message"],
      latencyMs: Date.now() - started,
      firstSentenceMs,
      requestId: stream.request_id ?? "",
    };
  } catch (error) {
    const status =
      error instanceof APIError && typeof error.status === "number"
        ? error.status
        : 0;
    // 오류 본문의 message 도 200자까지 남긴다(원인 가리기 — 2026-11-06 3회차 400 전부 실패 뒤 보탬). 키 · 비밀값은 본문에 없다
    const apiError =
      error instanceof APIError
        ? (
            error.error as
              | { error?: { type?: string; message?: string } }
              | undefined
          )?.error
        : undefined;
    const detail =
      error instanceof APIError
        ? `${apiError?.type ?? error.constructor.name}${apiError?.message ? ` — ${apiError.message.slice(0, 200)}` : ""}`
        : error instanceof Error
          ? error.name
          : "Error";
    return { ok: false, status, detail, latencyMs: Date.now() - started };
  }
}

function loadScripts(io: Pick<TalkObserveIo, "readScripts">): ObserveScript[] {
  const scripts: ObserveScript[] = [];
  for (const { file, raw } of io.readScripts()) {
    const parsed = parseObserveScript(raw, file);
    if (!parsed.ok) throw new ScriptInputError(parsed.error);
    scripts.push(parsed.script);
  }
  return scripts;
}

export async function runTalkObserve(
  args: TalkObserveArgs,
  io: TalkObserveIo,
): Promise<number> {
  const scripts = selectScripts(loadScripts(io), args);
  if (scripts.length === 0)
    throw new ScriptInputError("고른 대본이 없다(--script · --level 을 보라)");
  const out = args.out ?? join(tmpdir(), "talk-observe");
  const prepared = scripts.map((script) => {
    const m = materialsOf(io.readSeed(script.level, script.unit), script);
    if (!m.ok) return { script, materials: null, run: planRunOf(script, m) };
    const values = observeValues(io.config.values, script.level, args.effort);
    const sim = createTalkSim(m.materials, values, io.config.book, {
      skippedPrep: script.prep?.skipped ?? [],
    });
    const first = sim.prepare(script.steps[0] as ObserveStep, 0);
    const promptChars = first.ok
      ? String(first.turn.request.body.system ?? "").length +
        JSON.stringify(
          (first.turn.request.body.output_config as { format?: unknown })
            .format ?? {},
        ).length
      : 0;
    const config = requestConfigOf({
      purpose: PURPOSE,
      level: script.level,
      values,
      book: io.config.book,
    });
    const price = io.config.book.get(config.model);
    return {
      script,
      materials: m.materials,
      values,
      run: planRunOf(script, {
        ok: true,
        promptChars,
        model: config.model,
        effort: config.effort,
        thinking: config.thinking.type,
        price,
      }),
    };
  });
  const runs = prepared.map((p) => p.run);
  for (const line of planLines(runs, {
    settingsSource: io.config.settingsSource,
    pricesSource: io.config.pricesSource,
    out,
  }))
    io.log(line);
  if (!args.yes) return EXIT_OK;

  const client = io.createClient();
  const reports: RunReport[] = [];
  let stopAll: string | null = null;
  for (const p of prepared) {
    if (!p.materials || stopAll) continue;
    const sim = createTalkSim(
      p.materials,
      p.values ?? io.config.values,
      io.config.book,
      { skippedPrep: p.script.prep?.skipped ?? [] },
    );
    const opening = sim.rows.flatMap((r) =>
      r.speaker === "tori" ? [r.text.trim()] : [],
    );
    const turns: TurnRecord[] = [];
    let stopped: string | null = null;
    for (const [i, step] of p.script.steps.entries()) {
      const ready = sim.prepare(step, i);
      if (!ready.ok) {
        stopped = ready.reason;
        break;
      }
      const result = await streamTurn(client, ready.turn.request);
      if (!result.ok) {
        const f = observeFailureOf(result.status, {}, new Headers());
        if (f.stop) {
          stopAll = `${f.key} — 실행 전체를 멈춘다(콘솔 한도 · 계정)`;
          stopped = stopAll;
          break;
        }
      }
      // 재질문(C203 (3)): 걸린 1~3단계 질문이면 한 번 더 부른다(한 턴에 1회 — 서버 withQuestionRetry 와 같음)
      const ask = sim.retryOf(ready.turn, result);
      const again = ask ? await streamTurn(client, ask.request) : null;
      const record = sim.finish(
        ready.turn,
        result,
        ask && again ? { ask, result: again } : undefined,
      );
      turns.push(record);
      io.log(
        `${p.script.name} · ${record.no} · ${record.move.kind}/${record.move.next} · ${record.usage ? `${record.usage.firstSentenceMs ?? "-"}ms · 입력 ${record.usage.inputTokens} · 출력 ${record.usage.outputTokens} · ${record.usage.costUsd}달러` : (record.failure ?? "")}${record.reask ? ` · 재질문 ${record.reask.usage?.costUsd ?? "-"}달러 · ${record.reask.outcome}` : ""}`,
      );
    }
    reports.push({
      script: p.script,
      model: p.run.model,
      effort: p.run.effort,
      thinking: p.run.thinking,
      turns,
      opening,
      stopped,
    });
  }
  const date = (io.now?.() ?? new Date()).toISOString().slice(0, 10);
  const effort = args.effort ?? "settings";
  const base = join(out, `${date}-talk-observe-${effort}`);
  const skipped = runs.filter((r) => r.skipped !== null);
  io.write(`${base}.md`, reportMarkdown({ date, runs: reports, skipped }));
  io.write(
    `${base}.json`,
    `${JSON.stringify({ date, effort, totals: totalsOf(reports), runs: reports, skipped }, null, 2)}\n`,
  );
  io.log(`talk-observe: ${base}.md · ${base}.json`);
  return EXIT_OK;
}

function readJsonFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new ScriptInputError(`JSON 을 읽지 못했다: ${path}`);
  }
}

/** 시드 파일 읽기(회화 수업 파일이 없으면 lessonFile null). */
export function readSeedFiles(
  root: string,
  level: number,
  unit: number,
): SeedFiles {
  const at = (...p: string[]) => join(root, SEED_DIR, ...p);
  const lessonPath = at("lessons", "talk", String(level), `${unit}.json`);
  return {
    lessonFile: existsSync(lessonPath) ? readJsonFile(lessonPath) : null,
    levelSpecs: readJsonFile(at("level-specs.json")),
    unitSpecs: readJsonFile(at("unit-specs.json")),
    teachers: readJsonFile(at("teachers.json")),
    vocab: readJsonFile(at("vocab.json")),
    forms: readJsonFile(at("lists", "forms.json")),
    forbidden: readJsonFile(at("lists", "forbidden.json")),
    meta: readJsonFile(at("lists", "meta-sentences.json")),
  };
}

/** 대본 파일 읽기(이름 차례). */
export function readScriptFiles(
  root: string,
): { file: string; raw: unknown }[] {
  const dir = join(root, SCRIPT_DIR);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({ file, raw: readJsonFile(join(dir, file)) }));
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`talk-observe: ${parsed.error}`);
    return EXIT_INPUT;
  }
  const root = process.cwd();
  try {
    return await runTalkObserve(parsed.args, {
      root,
      config: loadScriptConfig({ root }),
      readScripts: () => readScriptFiles(root),
      readSeed: (level, unit) => readSeedFiles(root, level, unit),
      createClient: () => {
        const key = readApiKey();
        if (key === null)
          throw new ScriptInputError(
            "ANTHROPIC_API_KEY 가 없습니다(.env.local)",
          );
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
      console.error(`talk-observe: ${error.message}`);
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
