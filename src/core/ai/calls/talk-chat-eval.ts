// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 8-2, plan 묶음 P4)의 평가 호출 조각(talk_chat_eval).
// 기록 전용 호출이다: 이야기 방식 아이 차례 n 을 지금 새 방식(claude)의 평가 칸과 같은 꼴(reading · teacher_move · model_sentence ·
// child_used_on_own)로 읽게 하고, 그 값을 지금 판정 함수에 넘겨 '기존 꼴 said' 를 낸다(chat-judge). 흐름 · 공식 said_words 의 입력이 아니다.
// 입력은 아이 차례 n 앞 talk.chat_eval_context_turns 차례와 n · n+1(대화 호출과 같은 기록 꼴의 글: 선생님의 나간 say · 아이 쪽 사용자 메시지
// — 사실 줄 + 입력 줄) · 단원 단어 · n 표시이고 목표 관리 글은 없다. 아이 이름은 넣지 않는다(가림이 모든 글에 걸림).
// 이 모듈은 요청을 만드는 순수 함수와 응답 Zod 까지다. 호출 실행 · 저장은 묶음 S0 의 몫이다. 순수 모듈이다(시각 · DB · SDK 없음).
import { z } from "zod";
import type {
  ApplyChecksResult,
  CallSpec,
  ChatMessage,
} from "@/core/ai/calls/common";
import type { Masker } from "@/core/ai/mask";
import {
  TALK_LEAD_MOVES,
  TALK_LEAD_READINGS,
  type TalkLeadMove,
  type TalkLeadReading,
} from "@/core/conversation/move";

/** 응답 규격의 이름(가짜 클라이언트가 목적을 알아보는 표시). */
export const TALK_CHAT_EVAL_TITLE = "talk_chat_eval";

// ── 입력(spec 설계 8-2 '입력') ─────────────────────────────────────

/**
 * 대화 차례 하나(대화 호출과 같은 기록 꼴). teacher 는 선생님의 나간 say(안전 검사를 지나 실제로 나간 글), child 는 그 차례에 대화 호출로 보낸
 * 사용자 메시지 글 그대로(사실 줄 + 입력 줄 — chat-message chatUserMessageOf. 입구 start · more · back · 조용함의 줄도 이 꼴이다).
 */
export type ChatEvalEntry =
  | { speaker: "teacher"; say: string }
  | { speaker: "child"; message: string };

/** 평가 호출의 입력. 아이 이름 칸은 없다. */
export type TalkChatEvalInput = {
  unitWords: readonly string[];
  /** 아이 차례 n 앞의 대화 차례(talk.chat_eval_context_turns 개까지, 차례대로). */
  before: readonly ChatEvalEntry[];
  /** 판정할 아이 차례 n 의 사용자 메시지 글. */
  target: string;
  /** 선생님 차례 n+1 의 나간 say. 수업이 닫힐 때 n+1 없이 부르면 null(되묻기 없음으로 봄). */
  after: string | null;
};

/**
 * 기록(entries — 이 수업의 대화 차례, 차례대로)에서 아이 차례 n(at)의 평가 입력을 만든다: n 앞 contextTurns 차례(선생님 · 아이 합침)와 n,
 * n 바로 뒤가 선생님 차례면 그 차례(n+1). 수업 전체를 싣지 않는다(입력이 차례 수의 제곱으로 늘지 않게, I-11). contextTurns 는 설정
 * talk.chat_eval_context_turns 를 부르는 쪽이 읽어 넘긴다. at 이 아이 차례가 아니거나 contextTurns 가 0 이상 정수가 아니면 던진다.
 */
export function talkChatEvalInputOf({
  entries,
  at,
  contextTurns,
  unitWords,
}: {
  entries: readonly ChatEvalEntry[];
  at: number;
  contextTurns: number;
  unitWords: readonly string[];
}): TalkChatEvalInput {
  if (!Number.isInteger(contextTurns) || contextTurns < 0)
    throw new RangeError(
      `평가 호출의 앞 차례 수는 0 이상 정수여야 합니다: ${contextTurns}`,
    );
  const target = entries[at];
  if (!Number.isInteger(at) || target?.speaker !== "child")
    throw new RangeError(`평가할 차례가 아이 차례가 아닙니다: ${at}`);
  const next = entries[at + 1];
  return {
    unitWords: [...unitWords],
    before: entries.slice(Math.max(0, at - contextTurns), at),
    target: target.message,
    after: next?.speaker === "teacher" ? next.say : null,
  };
}

const TARGET_MARK = ">>> CHILD TURN TO JUDGE";

function entryLineOf(entry: ChatEvalEntry): string {
  return entry.speaker === "teacher"
    ? `Teacher: "${entry.say}"`
    : `App/child:\n${entry.message}`;
}

/** 사용자 메시지 글: 단원 단어 → 앞 차례 → n 표시와 n → n+1(없으면 그 사실). */
export function talkChatEvalUserMessage(input: TalkChatEvalInput): string {
  const lines: string[] = [
    `Unit words: ${input.unitWords.join(", ")}`,
    "",
    "Earlier turns:",
    ...(input.before.length === 0
      ? ["(none)"]
      : input.before.map((entry) => entryLineOf(entry))),
    "",
    `${TARGET_MARK}:`,
    input.target,
    "",
    "Teacher's next turn:",
    input.after === null
      ? "(No teacher turn follows. The chat ended after this child turn.)"
      : `Teacher: "${input.after}"`,
  ];
  return lines.join("\n");
}

// ── 안내문 ──────────────────────────────────────────────────────────

/**
 * 알아듣기 문장(fix 1 M-4): 지금 새 방식 안내문(talk-lead.ts talkLeadSystem)의 같은 소리 문장과 같은 글이다. 그 글은 함수 안의 글이라 가져다
 * 쓸 수 없어 같은 글을 두고, 두 글이 같음을 시험(talk-chat-eval-prompt)으로 묶는다. 평가의 reading 이 공식보다 '잘못 들림' 쪽으로 기울지 않게 한다.
 */
export const TALK_CHAT_EVAL_SAME_SOUND_LINE =
  "If a word that sounds the same would fit (see/sea, teach/beach), take that meaning.";

/**
 * 안내문(수업 내내 같음). 칸의 뜻은 지금 새 방식의 안내문 Output 문단(talk-lead.ts talkLeadSystem)과 같게 적는다: model_sentence 는 따라 할
 * 문장, child_used_on_own 은 그 아이 차례에 아이가 스스로(선생님을 따라 하지 않고) 말한 단원 단어. reading 은 아이 차례 n 을, teacher_move 는
 * 선생님 차례 n+1 을 읽는다(되묻기 · 고르기 · 따라 말하기 요청을 이 값으로 가린다).
 */
export const TALK_CHAT_EVAL_SYSTEM = `You read a record of a spoken English chat between a teacher character and a Korean child (about 10 years old) who is just beginning English. The child speaks; you see only a speech-to-text transcript, and it is often wrong. Lines in parentheses and lines before the child's words are notes from the app, not things anyone said.

One child turn is marked "${TARGET_MARK}". Judge only that turn and the teacher's turn right after it. Use the earlier turns only as context. When a word in the transcript does not fit, it is probably a hearing mistake, not the child's mistake. ${TALK_CHAT_EVAL_SAME_SOUND_LINE}

Output JSON only:
- "reading": how a good teacher would read the marked child turn. One of: ${TALK_LEAD_READINGS.join(", ")}. clear_answer: the child answered or said something that makes sense here. likely_misheard: the words probably are a hearing mistake. does_not_fit: the words do not fit the talk. new_topic: the child started something new. asks_teacher: the child asked the teacher something. does_not_know: the child does not know or did not understand. repeated_my_model: the child repeated a sentence the teacher gave to repeat.
- "teacher_move": what the teacher did in the next turn. One of: ${TALK_LEAD_MOVES.join(", ")}. ask_again: the teacher asked the child to say it again because they did not catch it. easier_or_choices: an easier question or two choices to pick from. model_repeat: a short sentence for the child to repeat. If no teacher turn follows, use react_only.
- "model_sentence": the sentence the teacher asked the child to repeat in the next turn, otherwise "".
- "child_used_on_own": unit words the child said in the marked turn by themselves (not repeating the teacher). Use the unit words as listed. [] if none.`;

// ── 응답(구조화 출력, 칸 차례가 곧 생성 차례) ──────────────────────────

/** 응답 네 칸(spec 설계 8-2 '출력'). 칸 설명 글은 두지 않는다(안내문이 설명). */
export const TalkChatEvalOutputSchema = z.object({
  reading: z.enum(TALK_LEAD_READINGS),
  teacher_move: z.enum(TALK_LEAD_MOVES),
  model_sentence: z.string(),
  child_used_on_own: z.array(z.string()),
});
export type TalkChatEvalOutput = z.infer<typeof TalkChatEvalOutputSchema>;

/** 응답 칸 이름(생성 차례). */
export const TALK_CHAT_EVAL_OUTPUT_FIELDS = Object.keys(
  TalkChatEvalOutputSchema.shape,
) as readonly (keyof TalkChatEvalOutput)[];

const str = z.string().catch("");
const strs = z
  .array(z.unknown())
  .catch([])
  .transform((list) => list.filter((v): v is string => typeof v === "string"));

/** 느슨한 규격(엄격 규격을 못 지난 응답을 받아 볼 때). 열거 칸은 normalizeTalkChatEval 이 본다. */
const talkChatEvalLoose = z.object({
  reading: str,
  teacher_move: str,
  model_sentence: str,
  child_used_on_own: strs,
});

const READING_SET: ReadonlySet<string> = new Set(TALK_LEAD_READINGS);
const MOVE_SET: ReadonlySet<string> = new Set(TALK_LEAD_MOVES);

/**
 * 정규화: 응답을 고쳐 쓰지 않는다. 열거 칸이 열거 밖이면 null(검증 실패 — 그 차례는 '판정 없음', spec 설계 8-2). 빠진 글 칸은 '', 빠진 목록 칸은
 * 빈 목록, 목록의 글 아닌 값은 뺀다.
 */
export function normalizeTalkChatEval(
  loose: unknown,
): TalkChatEvalOutput | null {
  const parsed = talkChatEvalLoose.safeParse(loose);
  if (!parsed.success) return null;
  const v = parsed.data;
  if (!READING_SET.has(v.reading) || !MOVE_SET.has(v.teacher_move)) return null;
  return {
    reading: v.reading as TalkLeadReading,
    teacher_move: v.teacher_move as TalkLeadMove,
    model_sentence: v.model_sentence,
    child_used_on_own: v.child_used_on_own,
  };
}

// ── 호출 규격(P9b CallSpec 꼴) ─────────────────────────────────────

/** 평가 호출이 읽는 설정(ai.* 밖)은 없다 — 앞 차례 수는 입력을 만들 때 쓴다(talkChatEvalInputOf). */
export type TalkChatEvalRules = Record<string, never>;

function maskEntry(entry: ChatEvalEntry, masker: Masker): ChatEvalEntry {
  return entry.speaker === "teacher"
    ? { speaker: "teacher", say: masker(entry.say).text }
    : { speaker: "child", message: masker(entry.message).text };
}

/**
 * 평가 호출 규격. 목적 talk_chat_eval 이라 모델 · effort · 생각 단계 · 최대 출력은 그 목적의 키(ai.* 의 talk_chat_eval), 기다림은
 * ai.timeout_seconds.feedback 이다(조합 combo.ts). 한 번 묻는 호출이다(기록을 한 사용자 메시지로 싣는다). 아이에게 보이는 칸이 없어 출력
 * 검사 칸이 없다. 가림: 앞 차례 · n · n+1 의 글 모두(저장된 글이 이미 가려졌어도 다시 건다).
 */
export const talkChatEvalSpec: CallSpec<
  TalkChatEvalInput,
  TalkChatEvalOutput,
  TalkChatEvalRules
> = {
  purpose: "talk_chat_eval",
  title: TALK_CHAT_EVAL_TITLE,
  wireSchema: () => TalkChatEvalOutputSchema,
  looseSchema: talkChatEvalLoose,
  multiTurn: false,
  enumPaths: ["reading", "teacher_move"],
  settingSchemas: {},
  rulesOf: () => ({}),
  mask: (input, masker: Masker) => ({
    ...input,
    before: input.before.map((entry) => maskEntry(entry, masker)),
    target: masker(input.target).text,
    after: input.after === null ? null : masker(input.after).text,
  }),
  system: () => TALK_CHAT_EVAL_SYSTEM,
  messages: (input): ChatMessage[] => [
    { role: "user", content: talkChatEvalUserMessage(input) },
  ],
  validate: () => [],
  normalize: (loose) => normalizeTalkChatEval(loose),
  checkFields: () => [],
  applyChecks: (value): ApplyChecksResult<TalkChatEvalOutput> => ({
    value,
    changed: false,
    fatal: false,
  }),
};
