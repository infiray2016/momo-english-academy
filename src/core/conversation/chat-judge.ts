// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 8-2 · 8-3 · 8-4, plan 묶음 P4)의 학습 근거 판정 둘 — 기록 전용.
// 이야기 방식 수업의 공식 '말했다'는 동등함이 확인될 때까지 비우고(설계 8-1, C243 (2)), 아이 차례마다 판정 둘을 talk_turns.chat_judge 에 남긴다.
// - 앱 판정(설계 8-3): 앱이 아는 것만(들린 글 · 바로 앞 선생님 행의 say 와 따라 할 문장 · 그 차례에 연 힌트 단 · '잘 모르겠어요' · 조용함 · 한국어
//   도움 · 막힌 뒤 설명)으로 단원 단어마다 갈래 다섯과 고르기 답 표지를 매긴다. 지금 새 방식 후보 판정(lead 후보 모듈, AC-26f 로 src 에서 가져다
//   쓰지 않음)의 갈래를 이 입력으로 다시 쓴 것이다. 되묻기 사슬과 대화 호출의 후보가 없다.
// - 기존 꼴 판정(설계 8-2): 평가 호출(talk_chat_eval)의 출력을 지금 새 방식의 기록 함수에 그대로 넘긴다(leadStuckOf → effectiveStuckOf ·
//   leadTeacherMoveOf → heardHelpsOfMove · hintKindOf · leadChildHelpAfterOf · leadSaidWordsOf → saidWordsOf). 그 함수들은 고치지 않는다.
// 이 값은 said_words · '안다' · 단원 통과 · 승급 · 이어하기 · 흐름 계산의 입력이 아니다(AC-8). 순수 모듈이다(DB · 서버 · SDK 없음).
import { z } from "zod";
import {
  type TalkChatEvalOutput,
  TalkChatEvalOutputSchema,
} from "@/core/ai/calls/talk-chat-eval";
import type { ChatInput } from "@/core/conversation/chat-message";
import { chatAppStuckOf } from "@/core/conversation/chat-turn-core";
import { homophoneHeadOf } from "@/core/conversation/child-kind";
import {
  type HintTier,
  heardHelpOf,
  heardHelpsOfMove,
  hintKindOf,
} from "@/core/conversation/hints";
import {
  hasLeadChoiceQuestion,
  isLeadAskAgain,
  type LeadChildHelp,
  type LeadResponse,
  leadSaidWordsOf,
  leadStuckOf,
  leadTeacherMoveOf,
} from "@/core/conversation/lead-record";
import { leadChildHelpAfterOf } from "@/core/conversation/lead-turn-core";
import {
  TALK_HEARD_HELPS,
  TALK_HINT_KINDS,
  type TalkHintKind,
  type TalkLessonChildTurn,
  type TalkLessonSpec,
} from "@/core/conversation/lesson-turns";
import type { TalkMove } from "@/core/conversation/move";
import { childSameSoundWordsOf } from "@/core/conversation/question-check";
import { metWordsIn, saidWordsOf } from "@/core/conversation/said";
import { normalizeForMatch } from "@/core/speech/match-rate";

// ── 입력 행 ─────────────────────────────────────────────────────────

/** 단원 단어 · 원형 · 동음이의어(지금 판정 saidWordsOf 와 같은 재료)와 기존 꼴 판정의 무름 재료. */
export type ChatJudgeContext = {
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
  homophones: readonly (readonly string[])[];
  /** 지금 새 방식이 막힘 무름에 넘기는 장면 낱말(talkSceneWordsOf — 지금 길과 같은 값). */
  sceneWords: ReadonlySet<string>;
  spec: Pick<TalkLessonSpec, "band">;
  /** 이 수업 선생님의 영어 이름(선생님 시드 nameEn). 앱 판정에서 부름말로 보아 내용 낱말로 세지 않는다(fix 1 M-1). 없으면 null. */
  teacherName: string | null;
};

/** 선생님 행(이야기 방식 선생님 행에서 부르는 쪽이 채운다). */
export type ChatJudgeTeacherRow = {
  role: "teacher";
  /** 나간 say(안전 검사를 지난 글, 1~3단계 소리 줄로 뺀 따라 할 문장도 든 글 — 소리로 나갔다). */
  say: string;
  /** say 에 든 따라 할 문장(listen_sentence — 응답 처리가 say 에서 찾은 것). 없거나 어긋났으면 null. */
  listenSentence: string | null;
  /** 막힌 뒤 한국어 설명(explain_ko)을 이 선생님 말풍선 아래에 보였다(설계 7). */
  explainShown: boolean;
  /** 앱의 마무리 차례(설계 9). */
  closing: boolean;
  /** 대화 토막의 첫 선생님 행. */
  first: boolean;
};

/** 아이 차례의 입력 갈래(입구 start · more · back 은 아이 행을 남기지 않는다). */
export type ChatJudgeInputKind = "speech" | "dont_know" | "not_heard" | "quiet";

/** 평가 호출의 상태(설계 8-4: 있음 · 판정 없음 · 기다림 · 부르지 않음). */
export const CHAT_LEGACY_STATUSES = [
  "done",
  "failed",
  "waiting",
  "not_called",
] as const;
export type ChatLegacyStatus = (typeof CHAT_LEGACY_STATUSES)[number];

/** 판정 없음의 까닭(묶음 S0 · 컨트롤러 결정 (A)): 시간 넘음 · 검증 실패(읽지 못함 · 열거 밖) · 그 밖. */
export const CHAT_EVAL_FAILURES = ["timeout", "invalid", "other"] as const;
export type ChatEvalFailure = (typeof CHAT_EVAL_FAILURES)[number];

/** 아이 행의 평가 호출 상태와 출력(있음일 때만 출력, 판정 없음이면 아는 때 그 까닭). */
export type ChatEvalState =
  | { status: "done"; output: TalkChatEvalOutput }
  | { status: "failed"; failure?: ChatEvalFailure }
  | { status: Exclude<ChatLegacyStatus, "done" | "failed"> };

/** 아이 행(talk_turns 아이 행에서 부르는 쪽이 채운다). */
export type ChatJudgeChildRow = {
  role: "child";
  input: ChatJudgeInputKind;
  /** 들린 글(말 입력만, 그 밖은 ''). */
  heard: string;
  /** 이 차례에 실제로 연 힌트 단의 종류(설계 7 — 응답이 만든 단 가운데 연 것, 차례대로. 실패 문구로 끝난 단은 넣지 않음). */
  opened: readonly HintTier["kind"][];
  /** 이 차례 앞의 한국어 도움(합쳐진 뒤). taught 는 알려 준 영어 표현, 뜻만 풀이했으면 null. 없으면 null. */
  koHelp: { taught: string | null } | null;
  eval: ChatEvalState;
};

export type ChatJudgeRow = ChatJudgeTeacherRow | ChatJudgeChildRow;

// ── 저장 꼴(chat_judge 칸, 설계 8-4) ─────────────────────────────────

/**
 * 앱 판정의 갈래(설계 8-3 표 — C243 (2) 4항의 구분). 위에서부터 처음 맞는 하나다.
 * - repeated_model 따라 말하기 요청 뒤 그대로 따라 말함 — 인정하지 않음
 * - echoed_word 완성 문장 제시 뒤 되풀이(선생님 말에 든 낱말만 말함) — 보류(인정하지 않음으로 셈)
 * - helped 도움받은 상황 — 지금 힌트 종류 규칙대로(영어면 인정하지 않음, 뜻만이면 인정 후보)
 * - own_later 뒤에 다른 문맥에서 스스로 씀 — 독립 근거 후보로 따로 적음(인정 후보)
 * - own_sentence 독립 표현 — 인정 후보
 */
export const CHAT_APP_CATEGORIES = [
  "repeated_model",
  "echoed_word",
  "helped",
  "own_sentence",
  "own_later",
] as const;
export type ChatAppCategory = (typeof CHAT_APP_CATEGORIES)[number];

const ChatAppWordSchema = z.strictObject({
  word: z.string(),
  category: z.enum(CHAT_APP_CATEGORIES),
  /** 인정 후보인가(갈래 규칙 — 앱이 아는 막힘이면 거짓). */
  accepted: z.boolean(),
  /** 고르기 물음 뒤의 한 낱말 답(설계 8-3 끝 줄 — 비교에서 넣은 값 · 뺀 값을 따로 냄). */
  choiceAnswer: z.boolean(),
});

const LeadChildHelpSchema = z.strictObject({
  hintKind: z.enum(TALK_HINT_KINDS),
  hintLevel: z.int().min(0),
  heardHelp: z.enum(TALK_HEARD_HELPS).exclude(["none"]).nullable(),
});

/**
 * 기존 꼴 판정에서 앞 선생님 행 move 의 출처(fix 1 I-3 — 비교에서 출처별 불일치를 가르고, 늦게 온 평가 값으로 바뀔 행을 알아보게).
 * - eval 그 앞 아이 차례의 평가 출력(teacher_move · model_sentence · reading. model_sentence 가 비면 앱의 따라 할 문장이 하한)
 * - 그 밖은 앞 평가가 없어 앱의 사실(따라 할 문장이 있으면 model_repeat, 막힌 뒤 고르기는 앞 아이 막힘)로 채운 것이고, 까닭으로 가른다:
 *   app_dont_know 앞 차례가 '잘 모르겠어요' 단추 · app_not_heard 앞 차례가 눌렀으나 듣지 못함(들린 글 없음) · app_no_child 앞 아이 차례가 없음
 *   (수업 첫 말 · 입구 · 조용함 · 선생님이 잇달아 말함) · app_eval_failed 앞 평가가 판정 없음 · app_eval_waiting 앞 평가가 아직 기다림.
 */
export const CHAT_PREV_MOVE_SOURCES = [
  "eval",
  "app_dont_know",
  "app_not_heard",
  "app_no_child",
  "app_eval_failed",
  "app_eval_waiting",
] as const;
export type ChatPrevMoveSource = (typeof CHAT_PREV_MOVE_SOURCES)[number];

/** chat_judge 칸(talk_turns 아이 행 jsonb, 이야기 방식에서만 채움 — 그 밖은 null). */
export const ChatJudgeSchema = z.strictObject({
  app: z.strictObject({
    /** 앱이 아는 막힘('잘 모르겠어요' 단추 · C36 모름 말 — chatAppStuckOf). */
    stuck: z.boolean(),
    /** 앱이 아는 힌트 종류(연 힌트 단 · 한국어 도움 · 막힌 뒤 설명). */
    hintKind: z.enum(TALK_HINT_KINDS),
    words: z.array(ChatAppWordSchema),
    /** 앱 said: 인정 후보 가운데 saidWordsOf 의 낱말 규칙을 지난 것. */
    said: z.array(z.string()),
  }),
  legacy: z
    .strictObject({
      status: z.enum(CHAT_LEGACY_STATUSES),
      /** 평가 호출 출력(검증을 지난 값). 있음이 아니면 null. */
      output: TalkChatEvalOutputSchema.nullable(),
      /** 기존 꼴 said(있음이 아니면 빈 목록). */
      said: z.array(z.string()),
      /** 기존 꼴 막힘 · 되묻기 · 힌트 칸(있음이 아니면 null). */
      stuck: z.boolean().nullable(),
      askAgain: z.boolean().nullable(),
      /**
       * 앞 선생님 차례의 기존 꼴 행동이 되묻기(ask_again)였다 — 되물은 뒤의 답 차례(spec 8-3 둘째 줄: 앱은 되묻기를 모름, 비교의 까닭 표지
       * ask_again_unknown). 있음이 아니면 null.
       */
      afterAskAgain: z.boolean().nullable(),
      help: LeadChildHelpSchema.nullable(),
      /** 들은 도움을 본 앞 선생님 행 move 의 출처(CHAT_PREV_MOVE_SOURCES). 있음이 아니면 null. */
      prevMove: z.enum(CHAT_PREV_MOVE_SOURCES).nullable(),
      /** 판정 없음의 까닭(묶음 S0). 판정 없음 행에서 까닭을 알 때만 있고, 그 밖의 행에 있으면 꼴이 틀린 값이다. */
      failure: z.enum(CHAT_EVAL_FAILURES).optional(),
    })
    .refine(
      (legacy) => legacy.failure === undefined || legacy.status === "failed",
      {
        message: "판정 없음이 아닌 행에는 까닭이 없다",
      },
    ),
});
export type ChatJudge = z.infer<typeof ChatJudgeSchema>;
export type ChatAppWord = z.infer<typeof ChatAppWordSchema>;

/** chat_judge 칸을 읽는다(null · 꼴이 틀린 값은 null). */
export function readChatJudge(value: unknown): ChatJudge | null {
  if (value === null || value === undefined) return null;
  const parsed = ChatJudgeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// ── 앱 판정(설계 8-3) ─────────────────────────────────────────────────

/**
 * 내용 낱말을 가리는 기능어(관사 · 대명사 · be · 조동사 · 전치사 · 접속사 · yes/no)와 감탄사 · 맞장구. 지금 새 방식 후보 판정과 같은 목록이다
 * (그 모듈은 src 에서 가져다 쓰지 않으므로 — AC-26f — 여기 같은 값을 둔다). 영어 낱말 목록이라 코드 상수다.
 */
const CHAT_FUNCTION_WORDS: ReadonlySet<string> = new Set([
  // 관사
  "a",
  "an",
  "the",
  // 대명사
  "i",
  "me",
  "my",
  "mine",
  "myself",
  "you",
  "your",
  "yours",
  "yourself",
  "he",
  "him",
  "his",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "it",
  "its",
  "itself",
  "we",
  "us",
  "our",
  "ours",
  "ourselves",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "this",
  "that",
  "these",
  "those",
  "what",
  "who",
  "whom",
  "whose",
  "which",
  "someone",
  "somebody",
  "something",
  "anyone",
  "anybody",
  "anything",
  "everyone",
  "everybody",
  "everything",
  "nobody",
  "nothing",
  // be
  "be",
  "am",
  "is",
  "are",
  "was",
  "were",
  "been",
  "being",
  // 조동사
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "can",
  "could",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "not",
  // 전치사
  "about",
  "above",
  "across",
  "after",
  "against",
  "along",
  "around",
  "at",
  "before",
  "behind",
  "below",
  "beside",
  "between",
  "by",
  "down",
  "during",
  "for",
  "from",
  "in",
  "inside",
  "into",
  "near",
  "of",
  "off",
  "on",
  "onto",
  "out",
  "outside",
  "over",
  "through",
  "to",
  "toward",
  "under",
  "until",
  "up",
  "with",
  "without",
  // 접속사
  "and",
  "or",
  "but",
  "so",
  "because",
  "if",
  "when",
  "while",
  "than",
  // yes/no
  "yes",
  "no",
  "yeah",
  "yep",
  "nope",
  // 감탄사 · 맞장구
  "oh",
  "okay",
  "ok",
  "wow",
  "um",
]);

/**
 * 앱 판정에서 아이 말의 내용 낱말로 세지 않는 군말 · 부름말(fix 1 M-1, 컨트롤러 결정): 'Uh, sea.' · 'Sea, please.' 가 고르기 물음 뒤의 한 낱말
 * 답으로 보이게. 기능어 목록(위)은 넓히지 않고 아이 말의 셈에만 쓴다. 선생님 이름은 ctx.teacherName 으로 더한다. 영어 낱말 목록이라 코드 상수다.
 */
const CHAT_CHILD_FILLER_WORDS: readonly string[] = [
  "uh",
  "um",
  "hmm",
  "ah",
  "oh",
  "er",
  "well",
  "please",
];

/** 내용 낱말 하나: 대표 낱말(원형의 같은 소리 대표)과 견줌 열쇠(글자 · 원형 · 같은 소리 대표 낱말). */
type ContentWord = { rep: string; keys: string[] };

/** 글의 내용 낱말. skip 은 더 뺄 낱말(아이 말의 군말 · 부름말). */
function contentKeysOf(
  text: string,
  ctx: ChatJudgeContext,
  head: (word: string) => string,
  skip: ReadonlySet<string> = new Set(),
): ContentWord[] {
  const out: ContentWord[] = [];
  for (const token of normalizeForMatch(text, [])) {
    const lemma = ctx.lemmaOf(token)?.toLowerCase();
    if (
      CHAT_FUNCTION_WORDS.has(token) ||
      skip.has(token) ||
      (lemma !== undefined && CHAT_FUNCTION_WORDS.has(lemma))
    )
      continue;
    const word = lemma ?? token;
    out.push({
      rep: head(word),
      keys: [...new Set([token, word, head(token), head(word)])],
    });
  }
  return out;
}

/**
 * 아이 말에서 더 뺄 낱말: 군말 · please · 선생님 이름(정규화한 낱말). 그 수업의 단원 낱말(글자 또는 원형)인 낱말은 빼지 않는다(fix 2 N-2 —
 * 회화 4단계 단원 1 의 well 처럼 군말 목록과 겹치는 단원 낱말이 내용 낱말에서 지워지지 않게).
 */
export function childSkipOf(ctx: ChatJudgeContext): Set<string> {
  const unit = new Set(ctx.unitWords);
  const isUnit = (w: string) =>
    unit.has(w) || unit.has(ctx.lemmaOf(w)?.toLowerCase() ?? w);
  const words = [...CHAT_CHILD_FILLER_WORDS];
  if (ctx.teacherName !== null)
    words.push(...normalizeForMatch(ctx.teacherName, []));
  return new Set(words.filter((w) => !isUnit(w)));
}

/**
 * 앱 판정의 W(들린 글의 단원 단어, fix 1 I-1): 글자 · 원형으로 든 단원 단어(metWordsIn)에, 영어 낱말 둘 이하의 말이면 같은 소리 낱말
 * (childSameSoundWordsOf — 기능어 · 대답 말 · 맞장구는 넓히지 않음)을 원형으로 바꾼 단원 단어를 더한 뒤, saidWordsOf 의 잇기(글자로 먼저 잇고
 * 남은 낱말만 같은 소리로, 들린 낱말 하나는 단원 단어 하나에만)를 지난 것이다. 그래서 단원에 see · sea 가 함께 있어도 'Sea.' 는 sea 만,
 * 'See.' 는 see 만이고, see 가 없는 단원에서 'See.' 는 sea 다.
 */
function appWordsOf(heard: string, ctx: ChatJudgeContext): string[] {
  const unit = new Set(ctx.unitWords);
  const candidates = metWordsIn(heard, ctx);
  // 넓히는 것은 한두 낱말 말(childSameSoundWordsOf 의 조건)의, 글자 · 원형으로 단원 단어가 아닌 낱말뿐이다('Sea sea!' 의 둘째 sea 가 see 로
  // 이어지지 않게 — 글자로 이은 낱말은 남은 낱말이 아니다)
  if (childSameSoundWordsOf([heard], ctx.homophones).length > 0)
    for (const token of normalizeForMatch(heard, [])) {
      if (unit.has(ctx.lemmaOf(token)?.toLowerCase() ?? token)) continue;
      for (const mate of childSameSoundWordsOf([token], ctx.homophones)) {
        const lemma = ctx.lemmaOf(mate)?.toLowerCase() ?? mate;
        if (unit.has(lemma) && !candidates.includes(lemma))
          candidates.push(lemma);
      }
    }
  if (candidates.length === 0) return [];
  return saidWordsOf({
    ...ctx,
    aiWords: candidates,
    heard,
    hintKind: "none",
  });
}

/** 아이 말의 내용 낱말이 모두 이 글의 내용 낱말에 드는가(내용 낱말이 없으면 거짓 — 단원 단어가 든 말은 내용 낱말이 있다). */
function allContentWithin(
  child: readonly ContentWord[],
  text: string,
  ctx: ChatJudgeContext,
  head: (word: string) => string,
): boolean {
  const keys = new Set(contentKeysOf(text, ctx, head).flatMap((w) => w.keys));
  return (
    child.length > 0 && child.every((w) => w.keys.some((k) => keys.has(k)))
  );
}

/**
 * 글에 든 단원 단어(만남과 같은 대조 — metWordsIn)의 같은 소리 대표 낱말. W 가 이 글에 있는지는 같은 소리까지 본다: 들린 'See.' 가 선생님 말의
 * sea 를 되풀이한 말일 수 있으므로 '선생님 말에 있음' 쪽(인정하지 않는 쪽)으로 본다(보수 쪽 — 소리가 같다는 이유로 독립 표현이 되지 않게).
 */
function unitHeadsIn(
  text: string,
  ctx: ChatJudgeContext,
  head: (word: string) => string,
): Set<string> {
  return new Set(metWordsIn(text, ctx).map((w) => head(w)));
}

/** 앱이 아는 힌트 종류: 연 단의 종류(hintKindOf) · 한국어 도움(영어를 알려 줬으면 '영어', 뜻만이면 '뜻만') · 막힌 뒤 설명(뜻). */
function appHintKindOf(
  row: ChatJudgeChildRow,
  explainShown: boolean,
): TalkHintKind {
  const tiers = hintKindOf({ opened: tiersOf(row.opened), heard: [] });
  const taught = row.koHelp?.taught?.trim() ?? "";
  if (tiers === "english" || taught !== "") return "english";
  if (tiers === "meaning_only" || row.koHelp !== null || explainShown)
    return "meaning_only";
  return "none";
}

function tiersOf(kinds: readonly HintTier["kind"][]): HintTier[] {
  return kinds.map((kind) => ({ kind, text: "" }));
}

function chatInputOf(row: ChatJudgeChildRow): ChatInput {
  switch (row.input) {
    case "speech":
      return { kind: "speech", heard: row.heard };
    case "dont_know":
      return { kind: "dont_know" };
    case "not_heard":
      return { kind: "not_heard" };
    case "quiet":
      return { kind: "quiet" };
  }
}

type AppTurn = ChatJudge["app"];

/**
 * 아이 차례 하나의 앱 판정. prev 는 바로 앞 선생님 행(없으면 null — 되묻기 사슬을 앱이 모르므로 거슬러 보지 않는다), history 는 이 수업 앞에서
 * repeated_model · echoed_word 로 적힌 단원 단어다(이 함수가 더한다). W 는 appWordsOf(영어 낱말 둘 이하의 말만 같은 소리로 넓힘)이고, '선생님
 * 말 · 따라 할 문장에 있음'은 같은 소리 대표 낱말로 본다. 아이 말의 내용 낱말에서 군말 · please · 선생님 이름은 뺀다(M-1).
 */
function appTurnOf(
  row: ChatJudgeChildRow,
  prev: ChatJudgeTeacherRow | null,
  history: Set<string>,
  ctx: ChatJudgeContext,
  head: (word: string) => string,
): AppTurn {
  const stuck = chatAppStuckOf(chatInputOf(row));
  const hintKind = appHintKindOf(row, prev?.explainShown === true);
  if (row.input !== "speech" || row.heard.trim() === "")
    return { stuck, hintKind, words: [], said: [] };
  const say = prev?.say ?? "";
  const model = prev?.listenSentence?.trim() ?? "";
  const child = contentKeysOf(row.heard, ctx, head, childSkipOf(ctx));
  const sayHeads = unitHeadsIn(say, ctx, head);
  const modelHeads = unitHeadsIn(model, ctx, head);
  // 소리로만 이은 W(들린 낱말의 글자 · 원형이 그 단원 낱말이 아닌 것 — 'See.' → sea)는 선생님 말 · 따라 할 문장의 모든 내용 낱말의 같은 소리
  // 대표 낱말까지 본다(fix 2 N-1 — 선생님이 말한 see 를 되풀이한 말이 소리만으로 sea 의 독립 표현이 되지 않게, C217 요청자 확인). 글자로 든
  // W 는 단원 낱말의 대표 낱말만 본다('What can you see?' 뒤 'Sea.' 는 독립 표현 그대로)
  const literal = new Set(metWordsIn(row.heard, ctx));
  const sayKeys = new Set(contentKeysOf(say, ctx, head).flatMap((w) => w.keys));
  const modelKeys = new Set(
    contentKeysOf(model, ctx, head).flatMap((w) => w.keys),
  );
  const helped = hintKind !== "none";
  // 고르기 답은 고르기 물음 뒤 서로 다른 대표 낱말이 하나인 말이다('Sea sea!' 도 한 낱말, fix 1 M-2)
  const oneWord = new Set(child.map((w) => w.rep)).size === 1;
  const choiceAnswer = hasLeadChoiceQuestion(say) && oneWord;
  const words: ChatAppWord[] = appWordsOf(row.heard, ctx).map((word) => {
    const of = (category: ChatAppCategory, accepted: boolean) => ({
      word,
      category,
      accepted: accepted && !stuck,
      choiceAnswer: false,
    });
    const key = head(word);
    const soundOnly = !literal.has(word);
    const inModel = modelHeads.has(key) || (soundOnly && modelKeys.has(key));
    if (inModel && allContentWithin(child, model, ctx, head))
      return of("repeated_model", false);
    const inSay = sayHeads.has(key) || (soundOnly && sayKeys.has(key));
    if (inSay && allContentWithin(child, say, ctx, head))
      return {
        ...of("echoed_word", false),
        choiceAnswer,
      };
    if (helped) return of("helped", hintKind !== "english");
    if (!inSay && history.has(word)) return of("own_later", true);
    return of("own_sentence", true);
  });
  for (const w of words)
    if (w.category === "repeated_model" || w.category === "echoed_word")
      history.add(w.word);
  const candidates = words.filter((w) => w.accepted).map((w) => w.word);
  const said =
    candidates.length === 0
      ? []
      : saidWordsOf({
          ...ctx,
          aiWords: candidates,
          heard: row.heard,
          hintKind: "none",
        });
  return { stuck, hintKind, words, said };
}

// ── 기존 꼴 판정(설계 8-2) ────────────────────────────────────────────

type LegacyTurn = ChatJudge["legacy"];

/** 앞 아이 차례의 흐름 꼴(leadTeacherMoveOf · leadPrevStuckOf 의 입력): 말은 기존 꼴 막힘(없으면 앱이 아는 막힘), 단추 · 들리지 않음은 dont_know. */
type FlowChild = Pick<TalkLessonChildTurn, "input" | "stuck" | "nospeech">;

/** 바로 앞 아이 차례(조용함 밖)에서 다음 선생님 행이 읽는 것: 흐름 꼴 · 평가 출력(있음일 때만) · 평가 출력이 없을 때의 출처 까닭 · 힌트 칸. */
type PrevChild = {
  flow: FlowChild;
  output: TalkChatEvalOutput | null;
  source: Exclude<ChatPrevMoveSource, "eval" | "app_no_child">;
  help: LeadChildHelp;
};

/**
 * 선생님 행의 기존 꼴 move(지금 새 방식 leadTeacherMoveOf 그대로). 그 앞 아이 차례의 평가 출력이 있으면 그 teacher_move · model_sentence ·
 * reading 을 응답으로 넘긴다(eval). 평가의 model_sentence 가 비었고 이 선생님 행에 대화 호출이 낸 따라 할 문장(listen_sentence)이 있으면 그
 * 문장을 하한으로 넘긴다(fix 1 — 지금 새 방식의 model_sentence 는 말을 만든 호출 자신의 기록이고, 이야기 방식에서 그 짝은 listen_sentence 다).
 * 평가 출력이 없으면 앱의 사실로 채우고(따라 할 문장이 있으면 model_repeat 과 그 문장, 없으면 react_only. 막힌 뒤 고르기는 leadChoicesOf 가
 * 앞 아이 막힘으로 본다) 출처를 까닭으로 적는다(CHAT_PREV_MOVE_SOURCES).
 */
function legacyTeacherMoveOf(
  teacher: ChatJudgeTeacherRow,
  prevChild: PrevChild | null,
  ctx: ChatJudgeContext,
): { move: TalkMove; from: ChatPrevMoveSource } {
  const output = prevChild?.output ?? null;
  const listen = teacher.listenSentence?.trim() ?? "";
  const response: LeadResponse =
    output !== null
      ? {
          reading: output.reading,
          move: output.teacher_move,
          say: teacher.say,
          model_sentence:
            output.model_sentence.trim() === "" && listen !== ""
              ? listen
              : output.model_sentence,
        }
      : {
          reading: "clear_answer",
          move: listen !== "" ? "model_repeat" : "react_only",
          say: teacher.say,
          model_sentence: listen,
        };
  return {
    move: leadTeacherMoveOf({
      response,
      prevChild: prevChild?.flow ?? null,
      spec: ctx.spec,
      closingSlot: teacher.closing,
      firstQuestion: teacher.first,
      unitWords: ctx.unitWords,
      lemmaOf: ctx.lemmaOf,
    }),
    from: output !== null ? "eval" : (prevChild?.source ?? "app_no_child"),
  };
}

/** 평가 출력이 없을 때의 출처 까닭(아이 행의 입력 갈래와 평가 상태). 들린 글이 빈 말 입력은 듣지 못함과 같다. */
function prevSourceOf(row: ChatJudgeChildRow): PrevChild["source"] {
  if (row.input === "dont_know") return "app_dont_know";
  if (row.input !== "speech" || row.heard.trim() === "") return "app_not_heard";
  // 말 입력에 'not_called' 가 저장된 행은 부르는 쪽의 어긋남이다 — 평가가 없었던 것으로 보아 판정 없음과 같이 둔다
  return row.eval.status === "waiting" ? "app_eval_waiting" : "app_eval_failed";
}

/** 이 아이 차례의 힌트 칸(지금 lessonChildRowOf 의 규칙: 연 단 · 앞 선생님 move 로 본 들은 도움 → hintKindOf · heardHelpOf). */
function ownHelpOf(
  row: ChatJudgeChildRow,
  prevMove: TalkMove | null,
  ctx: ChatJudgeContext,
): LeadChildHelp {
  const heard = heardHelpsOfMove(prevMove, ctx.spec);
  const help = heardHelpOf(heard);
  return {
    hintKind: hintKindOf({ opened: tiersOf(row.opened), heard }),
    hintLevel: row.opened.length,
    heardHelp: help === "none" ? null : help,
  };
}

const EMPTY_LEGACY = (status: ChatLegacyStatus): LegacyTurn => ({
  status,
  output: null,
  said: [],
  stuck: null,
  askAgain: null,
  afterAskAgain: null,
  help: null,
  prevMove: null,
});

// ── 수업 하나 ───────────────────────────────────────────────────────

/**
 * 한 수업의 행(대화 차례대로 — 선생님 행 · 아이 행)에서 아이 행마다 chat_judge 를 낸다(row 는 입력 행 번호). 판정은 앞 행의 판정에 기대므로
 * (뒤에 스스로 씀 · 들은 도움 · 되물은 뒤 이어 받기) 늘 수업 전체를 다시 센다 — 늦게 온 평가 값을 고쳐 쓸 때도 같은 함수를 부른다.
 * 되묻기(n+1 의 teacher_move ask_again)는 아이 행 바로 뒤가 선생님 행일 때만 본다(수업이 닫혀 n+1 없이 부른 차례는 되묻기 없음).
 */
export function chatJudgesOf(
  rows: readonly ChatJudgeRow[],
  ctx: ChatJudgeContext,
): { row: number; judge: ChatJudge }[] {
  const head = homophoneHeadOf(ctx.homophones);
  const history = new Set<string>();
  const out: { row: number; judge: ChatJudge }[] = [];
  // 바로 앞 선생님 행과 그 기존 꼴 move · 그 선생님 행 바로 앞 아이 차례의 힌트 칸(되물은 뒤 이어 받기의 '되물은 아이 차례')
  let prevTeacher: ChatJudgeTeacherRow | null = null;
  let prevMove: { move: TalkMove; from: ChatPrevMoveSource } | null = null;
  let askedHelp: LeadChildHelp | null = null;
  // 바로 앞 행이 아이 행(조용함 밖)이면 그 차례의 흐름 꼴 · 평가 출력 · 힌트 칸. 선생님 행 · 조용함 행 뒤에는 null 이다 — 그 뒤 선생님 행은
  // 아이 입력 없이 연 차례(입구 · 조용함 · 잇달아 말함)라 앞 아이 차례가 없다
  let justBefore: PrevChild | null = null;
  rows.forEach((row, at) => {
    if (row.role === "teacher") {
      prevMove = legacyTeacherMoveOf(row, justBefore, ctx);
      askedHelp = justBefore?.help ?? null;
      prevTeacher = row;
      justBefore = null;
      return;
    }
    const app = appTurnOf(row, prevTeacher, history, ctx, head);
    const own = ownHelpOf(row, prevMove?.move ?? null, ctx);
    const { help } = leadChildHelpAfterOf({
      own,
      prevMove: prevMove?.move ?? null,
      asked: askedHelp,
    });
    const finalHelp = help ?? own;
    const speech = row.input === "speech" && row.heard.trim() !== "";
    let legacy: LegacyTurn;
    let legacyStuck: boolean | null = null;
    if (!speech) {
      legacy = EMPTY_LEGACY("not_called");
    } else if (row.eval.status === "failed") {
      legacy = {
        ...EMPTY_LEGACY("failed"),
        ...(row.eval.failure === undefined
          ? {}
          : { failure: row.eval.failure }),
      };
    } else if (row.eval.status !== "done") {
      legacy = EMPTY_LEGACY(row.eval.status);
    } else {
      const output = row.eval.output;
      legacyStuck = leadStuckOf({
        reading: output.reading,
        child: row.heard,
        input: "speech",
        sceneWords: ctx.sceneWords,
        homophones: ctx.homophones,
      }).stuck;
      const askAgain =
        output.teacher_move === "ask_again" && rows[at + 1]?.role === "teacher";
      legacy = {
        status: "done",
        output,
        said: leadSaidWordsOf({
          candidates: output.child_used_on_own,
          heard: row.heard,
          hintKind: finalHelp.hintKind,
          speech: true,
          stuck: legacyStuck,
          askAgain,
          unitWords: ctx.unitWords,
          lemmaOf: ctx.lemmaOf,
          homophones: ctx.homophones,
        }),
        stuck: legacyStuck,
        askAgain,
        afterAskAgain: isLeadAskAgain(prevMove?.move ?? null),
        help: finalHelp,
        prevMove: prevMove?.from ?? "app_no_child",
      };
    }
    out.push({ row: at, judge: { app, legacy } });
    // 조용함 행은 흐름 행이 아니다(chatFlowRowsOf 가 빼는 행) — 그 뒤 선생님 행은 앞 아이 차례 없이 연 차례로 본다
    justBefore =
      row.input === "quiet"
        ? null
        : {
            flow: {
              input: row.input === "speech" ? "speech" : "dont_know",
              stuck: speech ? (legacyStuck ?? app.stuck) : false,
              nospeech: row.input === "not_heard",
            },
            output: row.eval.status === "done" ? row.eval.output : null,
            source: prevSourceOf(row),
            help: finalHelp,
          };
  });
  return out;
}

// ── 늦게 온 평가 값의 다시 세기(fix 1 I-3) ─────────────────────────────

/** 순서 없는 깊은 같음(jsonb 를 거친 값은 열쇠 차례가 바뀐다). */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false;
    return a.every((v, i) => sameValue(v, b[i]));
  }
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  )
    return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  const ob = b as Record<string, unknown>;
  return ka.every(
    (k) => k in ob && sameValue((a as Record<string, unknown>)[k], ob[k]),
  );
}

/**
 * 늦게 온 평가 값을 반영할 때 고쳐 쓸 아이 행: rows(그 평가 값을 넣은 이 수업의 행, chatJudgesOf 와 같은 꼴 · 차례)로 수업 전체를 다시 세고,
 * 저장된 chat_judge(stored — 행 번호 → 저장값, jsonb 그대로)와 다른 아이 행을 차례대로 돌려준다. 그 평가의 행뿐 아니라 그 값에 기대는 뒤 행
 * (들은 도움 · 되물은 뒤 이어 받기 · 출처)도 든다. 저장값이 없거나 꼴이 틀린 행도 돌려준다. 실제로 쓰는 일과 거래는 부르는 쪽(S0)의 몫이고,
 * 돌려준 행을 한 거래에서 고쳐 쓴다.
 */
export function chatJudgeChangesOf({
  rows,
  stored,
  ctx,
}: {
  rows: readonly ChatJudgeRow[];
  stored: ReadonlyMap<number, unknown>;
  ctx: ChatJudgeContext;
}): { row: number; judge: ChatJudge }[] {
  return chatJudgesOf(rows, ctx).filter(({ row, judge }) => {
    const before = readChatJudge(stored.get(row) ?? null);
    return before === null || !sameValue(before, judge);
  });
}
