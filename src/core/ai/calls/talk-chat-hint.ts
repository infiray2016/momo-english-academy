// 회화 이야기 방식(talk.lead_mode 'chat', 13절 C243 · C243 보완, intent 2026-11-13-회화-대화-구조-R spec 설계 7, plan 묶음 P5)의 힌트 호출 규격
// (talk_chat_hint). 아이가 힌트 단추를 누를 때(또는 앱이 아는 막힘 뒤 설명을 청할 때) 선생님 행 하나에 한 번 부르고, '지금 할 수 있는 말'의
// 한국어 · 영어(hint_ko · hint_en)와 선생님 말의 한국어 설명(explain_ko)을 받는다. 입력은 나간 say · 그 앞 talk.chat_hint_context_turns 차례 ·
// 회화 단계와 그 단계의 힌트 단 · 1~3단계 글 규칙 · 이름 자리 규칙이고, 단원 단어와 목표는 싣지 않는다(C243 보완 (2)). 단 목록 만들기 · 화면
// 응답 · 저장 꼴은 chat-hints.ts 다. 호출 실행 · 표지 행 · 다시 받기의 저장은 서버 몫이다. 순수 모듈이다(시각 · DB · SDK 없음).
import { z } from "zod";
import {
  type ApplyChecksResult,
  CallSettingError,
  type CallSpec,
  type ChatMessage,
  type SettingValues,
} from "@/core/ai/calls/common";
import type { Masker } from "@/core/ai/mask";
import type { CheckField, FieldHit } from "@/core/ai/output-check";
import {
  type ChatInput,
  chatInputLineOf,
} from "@/core/conversation/chat-message";
import { bandOf } from "@/core/level-band";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import { TALK_LOW_BAND } from "@/core/seed/structure";

/** 응답 규격의 이름(가짜 클라이언트가 목적을 알아보는 표시). */
export const TALK_CHAT_HINT_TITLE = "talk_chat_hint";

/** 힌트 호출에 싣는 앞 대화 차례 수(선생님 · 아이 차례를 합친 수, 12절 · spec 설정 표). */
export const CHAT_HINT_CONTEXT_TURNS_KEY = "talk.chat_hint_context_turns";

/** 이 규격이 읽는 설정 키의 규격(ai.* 밖). 턴 길의 설정 읽기(lesson-turns talkChatSettingsFrom)와 같은 꼴(1 이상 정수)이다. */
export const TALK_CHAT_HINT_SETTING_SCHEMAS: Readonly<
  Record<string, z.ZodType>
> = {
  [CHAT_HINT_CONTEXT_TURNS_KEY]: z.int().min(1),
};

/** 단계 규격의 힌트 단 하나(level_specs 회화 행 hintTiers 의 값). */
export type ChatHintTierKind = TalkLevelSpec["hintTiers"][number];

/** 앞 대화의 아이 차례(말함 · 모름 단추 · 누르지 않음 · 눌렀으나 듣지 못함). 글은 대화 호출의 입력 줄과 같다(chatInputLineOf). */
export type ChatHintChildInput = Extract<
  ChatInput,
  { kind: "speech" | "dont_know" | "quiet" | "not_heard" }
>;

/** 앞 대화 한 차례(오래된 것부터). 선생님 차례는 그때 나간 say 다. */
export type ChatHintContextEntry =
  | { speaker: "teacher"; say: string }
  | { speaker: "child"; input: ChatHintChildInput };

/**
 * 힌트 호출의 입력(spec 설계 7 '호출 입력'). 단원 단어 · 목표 글 칸은 두지 않는다. 아이 이름은 넣지 않는다(지금 말 · 앞 대화의 글은 mask 가
 * 가린다). context 는 지금 말 앞의 대화이고, 싣는 차례 수는 규칙(talk.chat_hint_context_turns)이 자른다.
 */
export type TalkChatHintInput = {
  /** 회화 단계(이야기 방식은 1~3단계 구간에서만 돈다). */
  level: number;
  /** 그 단계의 문장 낱말 상한(level_specs sentenceMaxWords — 6.4 검사와 같은 값). */
  sentenceMaxWords: number;
  /** 그 단계의 힌트 단(level_specs hintTiers, C31 차례). */
  hintTiers: readonly ChatHintTierKind[];
  /** 선생님 영어 이름(선생님 시드 nameEn). */
  teacherNameEn: string;
  /** 선생님의 지금 말(나간 say). */
  say: string;
  context: readonly ChatHintContextEntry[];
};

/** 설정값에서 읽는 규칙. */
export type TalkChatHintRules = {
  /** talk.chat_hint_context_turns — 싣는 앞 대화 차례 수. */
  contextTurns: number;
};

/**
 * 규칙을 읽는다. 단계가 1~3단계 구간 밖이면 RangeError(이야기 방식은 그 구간에서만 돈다), 키가 없거나 꼴이 틀리면 CallSettingError 를 던진다.
 */
export function talkChatHintRulesOf(
  values: SettingValues,
  input: Pick<TalkChatHintInput, "level">,
): TalkChatHintRules {
  if (bandOf(input.level) !== TALK_LOW_BAND)
    throw new RangeError(
      `이야기 방식 힌트 호출은 1~3단계 구간에서만 조립한다: ${input.level}단계`,
    );
  const parsed = TALK_CHAT_HINT_SETTING_SCHEMAS[
    CHAT_HINT_CONTEXT_TURNS_KEY
  ]?.safeParse(values[CHAT_HINT_CONTEXT_TURNS_KEY]);
  if (!parsed?.success)
    throw new CallSettingError(
      CHAT_HINT_CONTEXT_TURNS_KEY,
      "없거나 꼴이 틀렸다",
    );
  return { contextTurns: parsed.data as number };
}

// ── 안내문(system) ────────────────────────────────────────────────

/** 힌트 단마다 안내문에 적는 말(화면이 단을 여는 차례 — 틀 단은 앱이 재료가 있을 때만 만든다). 틀 단이 앞에 있으면 문장 단은 'whole'. */
function tierWordsOf(
  tier: ChatHintTierKind,
  tiers: readonly ChatHintTierKind[],
): string {
  switch (tier) {
    case "ko":
      return "the Korean meaning (hint_ko)";
    case "frame":
      return "the English sentence with one word left blank (only on some turns)";
    case "sentence":
      return tiers.includes("frame")
        ? "the whole English sentence (hint_en)"
        : "the English sentence (hint_en)";
  }
}

/** 힌트 단의 차례 글: 'first …, then …, then ….' 단이 없으면 던진다. */
export function chatHintStepsLineOf(
  tiers: readonly ChatHintTierKind[],
): string {
  if (tiers.length === 0)
    throw new RangeError("힌트 단이 없는 단계는 힌트 호출을 조립하지 않는다");
  return `${tiers
    .map(
      (tier, i) => `${i === 0 ? "first" : "then"} ${tierWordsOf(tier, tiers)}`,
    )
    .join(", ")}.`;
}

function required(value: string, what: string): string {
  const trimmed = value.trim();
  if (trimmed === "")
    throw new RangeError(`이야기 방식 힌트 호출의 ${what}이(가) 비었다`);
  return trimmed;
}

/**
 * 안내문 전문. 1~3단계 글 규칙(영어 문장 한 개 · 그 단계 문장 낱말 상한 · 뜻에 영어 문장을 쓰지 않음 · explain_ko 에 선생님의 영어 문장을 옮겨
 * 적지 않음, m-4 (가)) · 말투(hint_ko 는 아이 말투의 반말, explain_ko 는 선생님 목소리의 반말 — 정본 03 4절 7줄 · 13절 C243 보완 7 (6))와 이름 자리 규칙(대화 호출 안내문의 이름 자리 문단과 같은 꼴)을 싣는다. 문장 낱말 상한이 1 이상의 정수가 아니면 던진다.
 */
export function talkChatHintSystem(
  input: TalkChatHintInput,
  _rules: TalkChatHintRules,
): string {
  const teacher = required(input.teacherNameEn, "선생님 이름");
  if (!Number.isInteger(input.sentenceMaxWords) || input.sentenceMaxWords < 1)
    throw new RangeError(
      `문장 낱말 상한은 1 이상의 정수여야 한다: ${input.sentenceMaxWords}`,
    );
  return `You help a Korean child (about 10 years old) who is chatting out loud in English with ${teacher}, a teacher character in a children's app. The child is just beginning English (conversation level ${input.level}). The child pressed the hint button: they want to say something but do not know what to say or how.

Read the teacher's latest turn and the chat before it. Then write one thing the child could say next, as the child: if the teacher asked something, an answer to it; if not, something that goes on from what the teacher said, such as a reaction, a small thing about the child, or a question back to the teacher.

The app shows your hint step by step, one step each time the child presses: ${chatHintStepsLineOf(input.hintTiers)}

Rules:
- "hint_ko": that thing in natural Korean, one sentence, as the child would say it, in casual 반말 (the child talking to a friend, not polite 해요체). Do not write English sentences in it.
- "hint_en": the same thing in English, exactly one short sentence of at most ${input.sentenceMaxWords} words, with only very easy words.
- "explain_ko": what the teacher's latest turn means, in one or two short Korean sentences in casual 반말 in the teacher's own voice, as the teacher would say it to the child (not polite 해요체), for a child who did not understand it. Do not copy the teacher's English sentences into it; tell the meaning in Korean.
- Use only content suitable for children. Never write or ask for a name, school, address, phone number, or photo.

The child's name: if you see {NAME} in the chat, it is the child's name, hidden by the app. If your hint needs the child's name, write {NAME}; never write any other name for the child.

Output JSON only, with the fields in this order: "hint_ko", "hint_en", "explain_ko".`;
}

// ── 사용자 메시지 ───────────────────────────────────────────────────

/** 앞 대화 한 차례의 줄: 선생님은 'Teacher: "…"', 아이는 대화 호출의 입력 줄(말함은 들린 글 한 줄, 인식기 알림은 싣지 않음). */
function contextLineOf(entry: ChatHintContextEntry): string {
  if (entry.speaker === "teacher") return `Teacher: "${entry.say}"`;
  const input: ChatHintChildInput =
    entry.input.kind === "speech"
      ? { kind: "speech", heard: entry.input.heard }
      : entry.input;
  return chatInputLineOf(input);
}

/**
 * 보낼 메시지 하나: 앞 대화(뒤에서 contextTurns 차례, 오래된 것부터) → 빈 줄 → 지금 말. 앞 대화가 없으면 지금 말 한 줄뿐이다.
 */
export function talkChatHintMessages(
  input: TalkChatHintInput,
  rules: TalkChatHintRules,
): ChatMessage[] {
  const latest = `The teacher's latest turn: "${input.say}"`;
  const context =
    rules.contextTurns > 0 ? input.context.slice(-rules.contextTurns) : [];
  const content =
    context.length === 0
      ? latest
      : [
          "The chat so far (oldest first):",
          ...context.map(contextLineOf),
          "",
          latest,
        ].join("\n");
  return [{ role: "user", content }];
}

// ── 응답(구조화 출력) ─────────────────────────────────────────────────

/** 응답 세 칸(칸 차례가 곧 생성 차례). 칸 설명 글은 두지 않는다(안내문 Rules 가 설명). */
export const TalkChatHintOutputSchema = z.object({
  hint_ko: z.string(),
  hint_en: z.string(),
  explain_ko: z.string(),
});
export type TalkChatHintOutput = z.infer<typeof TalkChatHintOutputSchema>;

/** 응답 칸 이름(생성 차례). */
export const TALK_CHAT_HINT_OUTPUT_FIELDS = Object.keys(
  TalkChatHintOutputSchema.shape,
) as readonly (keyof TalkChatHintOutput)[];

const str = z.string().catch("");

/** 느슨한 규격(엄격 규격을 못 지난 응답을 받아 볼 때 — 빠지거나 글이 아닌 칸은 ''). */
const talkChatHintLoose = z.object({
  hint_ko: str,
  hint_en: str,
  explain_ko: str,
});

const allEmpty = (value: TalkChatHintOutput) =>
  TALK_CHAT_HINT_OUTPUT_FIELDS.every((field) => value[field].trim() === "");

/** 정규화: 고쳐 쓰지 않는다. 객체가 아니거나 세 칸이 다 비면 null(호출 하나의 실패). */
export function normalizeTalkChatHint(
  loose: unknown,
): TalkChatHintOutput | null {
  const parsed = talkChatHintLoose.safeParse(loose);
  if (!parsed.success) return null;
  const value = parsed.data;
  return allEmpty(value) ? null : value;
}

/** 엄격 검증 뒤의 확인: 세 칸이 다 비면 다시 시도한다(빈 응답). */
export function talkChatHintValidate(value: TalkChatHintOutput): string[] {
  return allEmpty(value) ? ["hint_ko · hint_en · explain_ko 가 다 비었다"] : [];
}

// ── 출력 검사(6.4) ─────────────────────────────────────────────────

/**
 * 6.4 출력 검사 칸: 뜻(hint_ko) · 영어 문장(hint_en, 그 단계 문장 낱말 상한을 봄 — 지금 새 방식의 힌트 검사와 같음) · 설명(explain_ko).
 */
export function talkChatHintCheckFields(
  value: TalkChatHintOutput,
): CheckField[] {
  return [
    { path: "hint_ko", lang: "ko", text: value.hint_ko },
    { path: "hint_en", lang: "en", text: value.hint_en },
    { path: "explain_ko", lang: "ko", text: value.explain_ko },
  ];
}

/**
 * 걸린 칸 바꾸기(6.4): 걸린 칸만 비운다(그 칸으로 만들 단은 단 목록에서 빠진다 — spec 설계 7). 만들 단이 하나도 없는 때의 실패와 다시 받기는
 * 단 목록을 보고 정하므로(chat-hints.ts) 그 시도를 실패로 보지 않는다.
 */
export function applyTalkChatHintChecks(
  value: TalkChatHintOutput,
  hits: ReadonlyMap<string, readonly FieldHit[]>,
): ApplyChecksResult<TalkChatHintOutput> {
  if (hits.size === 0) return { value, changed: false, fatal: false };
  const kept = (field: keyof TalkChatHintOutput) =>
    hits.has(field) ? "" : value[field];
  return {
    value: {
      hint_ko: kept("hint_ko"),
      hint_en: kept("hint_en"),
      explain_ko: kept("explain_ko"),
    },
    changed: true,
    fatal: false,
  };
}

// ── 호출 규격(P9b CallSpec 꼴) ─────────────────────────────────────

/** 앞 대화 한 차례의 가림(선생님 말 · 아이의 들린 글). */
function maskEntry(
  entry: ChatHintContextEntry,
  masker: Masker,
): ChatHintContextEntry {
  if (entry.speaker === "teacher")
    return { speaker: "teacher", say: masker(entry.say).text };
  if (entry.input.kind !== "speech") return entry;
  return {
    speaker: "child",
    input: { kind: "speech", heard: masker(entry.input.heard).text },
  };
}

/**
 * 이야기 방식의 힌트 호출 규격. 목적 talk_chat_hint(자기 ai.* 키 — 모델 · effort · 생각 단계 · 최대 출력), 한 번 호출(캐시 없음).
 * 가림: 지금 말 · 앞 대화의 선생님 말과 아이의 들린 글(저장된 글이 가린 글이어도 한 번 더 가린다 — 이 호출은 캐시를 쓰지 않는다).
 */
export const talkChatHintSpec: CallSpec<
  TalkChatHintInput,
  TalkChatHintOutput,
  TalkChatHintRules
> = {
  purpose: "talk_chat_hint",
  title: TALK_CHAT_HINT_TITLE,
  wireSchema: () => TalkChatHintOutputSchema,
  looseSchema: talkChatHintLoose,
  multiTurn: false,
  enumPaths: [],
  settingSchemas: TALK_CHAT_HINT_SETTING_SCHEMAS,
  rulesOf: talkChatHintRulesOf,
  mask: (input, masker: Masker) => ({
    ...input,
    say: masker(input.say).text,
    context: input.context.map((entry) => maskEntry(entry, masker)),
  }),
  system: talkChatHintSystem,
  messages: talkChatHintMessages,
  validate: (value) => talkChatHintValidate(value),
  normalize: (loose) => normalizeTalkChatHint(loose),
  checkFields: talkChatHintCheckFields,
  applyChecks: (value, hits) => applyTalkChatHintChecks(value, hits),
};
