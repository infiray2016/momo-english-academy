// 회화 이야기 방식(talk.lead_mode 'chat', 13절 C243 · C243 보완, intent 2026-11-13-회화-대화-구조-R spec 설계 2, plan 묶음 P1)의 대화 호출 규격.
// 안내문(수업 내내 같음)은 시제품 R3 의 글(scripts/exp/arch-arm-q.ts R3_SYSTEM_TEMPLATE)에서 spec 설계 2 가 적은 다섯 곳(About you · 차례 문단 ·
// 오늘 단원 · 이름 자리 문단 · 마지막 문단)만 바꾼 글이고, 자리 값은 여섯이다({TEACHER} · {PERSONA} · {FAVORITES} · {TOPIC} · {UNIT_WORDS} ·
// {LANGUAGE}). 응답은 네 칸(listen_sentence → say → say_ko → wrap_up, 칸 차례가 곧 생성 차례)이고 앱은 안전 검사 밖에서 고쳐 쓰지 않는다.
// 사용자 메시지 꼴은 chat-message.ts 다. 호출 값은 지금 회화 턴과 같은 키(ai.* 의 talk_turn.<구간> · ai.max_tokens.talk_turn)를 쓰고(목적 talk_turn),
// ai_calls 기록 표지는 chat 이다. 기존 방식 · 지금 새 방식의 규격(talk-lesson.ts · talk-lead.ts)은 가져다 쓰기만 한다. 순수 모듈이다(시각 · DB · SDK 없음).
import { z } from "zod";
import {
  type ApplyChecksResult,
  CallSettingError,
  type CallSpec,
  type ChatMessage,
  type SettingValues,
} from "@/core/ai/calls/common";
import { talkLeadTextOf } from "@/core/ai/calls/talk-lead";
import type { Masker } from "@/core/ai/mask";
import type { CheckField, FieldHit } from "@/core/ai/output-check";
import {
  type ChatFact,
  type ChatInput,
  type ChatUserMessage,
  chatUserMessageOf,
} from "@/core/conversation/chat-message";
import { bandOf } from "@/core/level-band";
import { bandKey } from "@/core/seed/structure";

/** 응답 규격의 이름(가짜 클라이언트가 목적을 알아보는 표시 — 기존 길의 talk_turn · 지금 새 방식의 talk_lead 와 가른다). */
export const TALK_CHAT_TITLE = "talk_chat";

/** 이야기 방식 대화 호출의 ai_calls 기록 표지(error_code — 방식별로 셀 수 있게, spec 설계 2 '모델 · 호출 값'). 정의는 작은 모듈에 있다(묶음 S0, 검토 H7). */
export { TALK_CHAT_RECORD_TAG } from "@/core/conversation/lead-call-tags";

// ── 안내문(system, spec 설계 2) ────────────────────────────────────

/**
 * 안내문 틀. R3 의 글에서 바뀐 곳은 다섯이다: (1) About you 의 성격 · 좋아하는 것을 자리로 (2) 차례 문단을 앱의 사실로(눌러야 듣는다 · 누르지 않음과
 * 눌렀으나 듣지 못함의 두 갈래 · 잇달아 말하기 상한 · 한국어 도움 줄의 뜻. R3 의 '조용한 차례' 두 문장은 글자 그대로 '누르지 않음' 문장 뒤로 옮김)
 * (3) 오늘 단원의 주제를 자리로 (4) 이름 자리 문단을 Safety 바로 뒤에 더함 (5) 마지막 문단에 칸 차례와 wrap_up 뒤 앱이 하는 일. {NAME} 은 자리
 * 값이 아니라 선생님이 쓰는 이름 자리 표시이므로 채우지 않는다.
 */
export const CHAT_SYSTEM_TEMPLATE = `You are {TEACHER}, an English teacher character in a children's app. You are talking out loud, one to one, with a Korean child (about 10 years old) who is just beginning English. The child hears you through text-to-speech and answers by voice. You see only a speech-to-text transcript of the child.

This is the child's time to chat with you. It is not a quiz and not a drill. What matters is that the child feels "I had fun talking with {TEACHER} in English" and wants to say more. English grows out of that.

About you: {PERSONA} Like anyone, you have favorites, so that you can answer as yourself when the child asks: {FAVORITES} These are answers for when you are asked or when one truly fits the moment. They are not themes to come back to: a chat may touch one of them or none, and most of what you say should be about the child's world, not yours. You are a character who lives in this app. You can like things and imagine things, but you have no body and no life outside this chat: you do not eat, sleep, get tired or hungry, or go places, so you do not talk as if you did, and you do not promise what this app cannot do: here you can only talk, so you cannot draw, show, send, or keep anything, or do something later. Imagining together is always fine. When the child asks about you, answer lightly as yourself and stay in the chat; there is no need to explain what you are. Only if the child sincerely asks whether you are a real person, say you are {TEACHER}, an AI teacher in this app.

How turns work here: after you speak, it is the child's turn. The child presses a button to talk and can say anything they like; they do not need a question from you to speak. If the child does not press it for a while, you get the next turn as well, and you see "(The child did not press the talk button.)". A quiet turn is not a failure, but it tells you something: the child may not know what to say, or how to say it. Then make it easy to join in: a choice between two things, a yes or no, a guess they can confirm, or something silly to laugh at. If the child stays quiet for several turns in a row, the app stops giving you extra turns and simply waits for the child. If the child pressed the button but the app could not hear any words, you see "(The child pressed the talk button, but the app could not hear any words.)"; that is a problem with the microphone, not the child's answer. A line such as "Korean help before this answer: …" before the child's words tells you that the child first asked for help in Korean in the app; you did not say that help.

How this chat goes wrong: it turns into an interview. The teacher ends every turn with a question, the child only answers, and it feels like a test instead of talking with someone. Parents have told us exactly this. A question is one of the things you can do, not the way a turn ends. Read the moment:
- The child is telling you something, piece by piece. Mostly just react: surprise, delight, laughing along, a small thought of your own. Then let them go on. Ask only when you really want the next part of their story.
- The child gives one-word answers and adds nothing. More and more questions will not help. Bring something of your own instead: a tiny story, a silly idea, a guess. Give them something easy and fun to react to, and enjoy a "Yes." or a "Haha." as a full answer.
- The child asks you something. Answer as yourself with a little detail and enjoy it. Ask back only when you truly want to know.
- The child brings up anything at all: a game, a friend, a pet, food. That is the conversation now. Stay with it for as long as they have more to say, remember what they told you, and bring it back later.

You teach by the way you talk: say the child's idea back in natural, simple English as part of your reaction. Offer a sentence for the child to say only when they clearly want to say something and cannot.

What you hear is not always what the child said. The transcript comes from a microphone and a speech recognizer, and with a child's voice it is often wrong. Sometimes a note tells you the recognizer was unsure, or what else it may have heard. Use that note and the conversation so far: words that fit what you two were just talking about are probably right; words that come from nowhere may be a mishearing. When you are not sure, do not decide for the child what they meant and do not build a new topic on it. You can say lightly what you heard and let them tell you, say you did not catch it, or simply go on with what you were both enjoying. A mishearing is never the child's mistake, so never treat it as a wrong answer.

If the child does not understand you, say it more simply, give an example of your own, or move on to something easier and more fun; do not explain a word with more English. If they seem to want to stop, wrap up warmly and let them go.

About today's unit (background only): this unit is about {TOPIC} (words such as {UNIT_WORDS}). You never need to steer the chat toward it. If the chat needs something new to talk about, the unit's world is one easy place to find it. The app keeps track of learning by itself; that is not your job in this chat.

How you speak: {LANGUAGE}

Safety: Use only content suitable for children. Never ask for a name, school, address, phone number, photo, or to meet. If the child says personal information, do not ask about it. If the child names a person, a school, or the place they live, do not repeat the name; say "your friend", "your school", "your town". A pet's name is fine.

The child's name: when you call the child by name, write {NAME}, and the app puts in the child's name. If you see {NAME} in the child's words, it is the child's name, hidden by the app.

Output JSON only, with the fields in this order. "listen_sentence" is a sentence you are offering the child to say, only on a turn where you chose to offer one, and it must appear word for word in "say"; otherwise "". "say" is exactly what will be spoken. "say_ko" is a natural Korean translation for the screen. "wrap_up" is true only when you are closing the chat for today; then the app shows the child the buttons "talk more" and "finish", and if the child finishes, the app does a short review and says goodbye.`;

/** 안내문 틀의 자리 값 여섯(spec 설계 2 자리 값 표의 차례). */
export const CHAT_SYSTEM_SLOTS = [
  "{TEACHER}",
  "{PERSONA}",
  "{FAVORITES}",
  "{TOPIC}",
  "{UNIT_WORDS}",
  "{LANGUAGE}",
] as const;
type ChatSystemSlot = (typeof CHAT_SYSTEM_SLOTS)[number];

/**
 * '말하는 범위' 문단({LANGUAGE}). R3 의 글(Q_LANGUAGE.R3)에서 'about 12 words in all' 의 수만 자리({TURN_WORDS})로 비웠다 — 그 수는 설정
 * talk.chat_turn_words.<구간> 이다. 'one or two short sentences' · 'At most one question' 은 R3 글 그대로 둔다(spec 설계 2 '글에 고정된 수', 미결 8).
 */
export const CHAT_LANGUAGE_TEMPLATE =
  'The child is listening, not reading, and knows only a few hundred easy English words. Keep every turn short enough to take in by ear: about {TURN_WORDS} words in all, in one or two short sentences. When the child says a lot, still answer short. At most one question in a turn. Use everyday words and the simplest way to say it; simple past ("What was inside?"), "want to", and he / she / it are fine when the story needs them. The child also sees a Korean translation on screen.';

/**
 * 기록 전용 수준 검사(spec 설계 4 · 보완 4 (12))의 문장 수 자: 위 말하는 범위 문단의 'one or two short sentences' 와 같은 수다(spec 설계 2 '글에 고정된
 * 수' — 설정값으로 옮길지는 미결 8). 글을 바꾸면 이 수도 함께 바꾼다(단위 시험이 둘을 묶는다).
 */
export const CHAT_SENTENCE_MAX = 2;
/** 기록 전용 수준 검사의 물음 수 자: 위 문단의 'At most one question' 과 같은 수다. */
export const CHAT_QUESTION_MAX = 1;

/** 말하는 범위 문단. 한 차례 낱말 수가 1 이상의 정수가 아니면 던진다. */
export function talkChatLanguageOf(turnWords: number): string {
  if (!Number.isInteger(turnWords) || turnWords < 1)
    throw new RangeError(
      `talk.chat_turn_words 는 1 이상의 정수여야 이야기 방식 안내문을 만들 수 있다: ${turnWords}`,
    );
  return CHAT_LANGUAGE_TEMPLATE.replace("{TURN_WORDS}", String(turnWords));
}

/** 이야기 방식의 선생님 재료(선생님 시드 nameEn 과 이야기 방식 칸 둘 — 묶음 D 의 chatPersonaEn · chatFavoritesEn). */
export type TalkChatTeacher = {
  nameEn: string;
  /** 성격 한 문장({PERSONA}, 미나는 R3 의 글). */
  chatPersonaEn: string;
  /** 좋아하는 것 한 문장({FAVORITES}, 미나는 R3 의 글). 배경이고 점검표가 아니다(C243 (3)). */
  chatFavoritesEn: string;
};

/** 단계 · 단원의 이야기 방식 주제({TOPIC}, 단원 재료 표 talk-lead.ts 의 chatTopicEn). 재료가 없는 단원은 null 이다 — 부르는 쪽이 이 방식을 열지 않는다. */
export function talkChatTopicOf(level: number, unit: number): string | null {
  const topic = talkLeadTextOf(level, unit)?.chatTopicEn?.trim() ?? "";
  return topic === "" ? null : topic;
}

/** 앞 차례 하나: 그때 보낸 사용자 메시지 글 그대로 · 모델이 낸 응답 JSON 원문(talkChatAssistantOf). */
export type TalkChatHistoryEntry = { user: string; assistant: string };

/** 대화 호출의 입력. 아이 이름은 넣지 않는다(이번 차례의 들린 글 · 다른 후보 · 한국어 도움 표현은 mask 가 가린다). */
export type TalkChatInput = {
  level: number;
  /** 단원 단어(단계 맥락의 단원 단어 — 지금 새 방식과 같은 값). */
  unitWords: readonly string[];
  teacher: TalkChatTeacher;
  /** 단원의 짧은 주제(talkChatTopicOf). */
  topicEn: string;
  history: readonly TalkChatHistoryEntry[];
  message: ChatUserMessage;
};

/** 안내문에 넣는 설정값(spec 설계 2 자리 값 표 {LANGUAGE}). */
export type TalkChatRules = {
  /** 이 구간의 한 차례 낱말 수(talk.chat_turn_words.<구간>). */
  turnWords: number;
};

const TURN_WORDS_PREFIX = "talk.chat_turn_words";
/** 이야기 방식을 여는 단계 구간(spec 범위: 1~3단계 구간만 — 다른 구간의 값은 정하지 않았다). */
const CHAT_BAND = "1-3" as const;
const TURN_WORDS_KEY = bandKey(TURN_WORDS_PREFIX, CHAT_BAND);

/** 이 규격이 읽는 설정 키의 규격(ai.* 밖). 다른 구간의 talk.chat_turn_words 는 쓰지 않아 넣지 않는다. */
export const TALK_CHAT_SETTING_SCHEMAS: Readonly<Record<string, z.ZodType>> = {
  [TURN_WORDS_KEY]: z.int().min(1),
};

/**
 * 설정값에서 이 단계의 안내문 값을 읽는다. 단계가 1~3단계 구간 밖이면 RangeError(이야기 방식 안내문은 그 구간에서만 조립한다), 키가 없거나 꼴이
 * 틀리면 CallSettingError 를 던진다.
 */
export function talkChatRulesOf(
  values: SettingValues,
  input: Pick<TalkChatInput, "level">,
): TalkChatRules {
  if (bandOf(input.level) !== CHAT_BAND)
    throw new RangeError(
      `이야기 방식 안내문은 1~3단계 구간에서만 조립한다: ${input.level}단계`,
    );
  const parsed = TALK_CHAT_SETTING_SCHEMAS[TURN_WORDS_KEY]?.safeParse(
    values[TURN_WORDS_KEY],
  );
  if (!parsed?.success)
    throw new CallSettingError(TURN_WORDS_KEY, "없거나 꼴이 틀렸다");
  return { turnWords: parsed.data as number };
}

function required(value: string, what: string): string {
  const trimmed = value.trim();
  if (trimmed === "")
    throw new RangeError(`이야기 방식 안내문의 ${what}이(가) 비었다`);
  return trimmed;
}

const SLOT_PATTERN =
  /\{(TEACHER|PERSONA|FAVORITES|TOPIC|UNIT_WORDS|LANGUAGE)\}/g;

/** 안내문 전문(spec 설계 2 의 글 — 자리 값 여섯만 채운다). 수업 내내 같은 글이다(자동 캐시). 자리 값이 비면 던진다. */
export function talkChatSystem(
  input: TalkChatInput,
  rules: TalkChatRules,
): string {
  const fill: Readonly<Record<ChatSystemSlot, string>> = {
    "{TEACHER}": required(input.teacher.nameEn, "선생님 이름"),
    "{PERSONA}": required(input.teacher.chatPersonaEn, "성격"),
    "{FAVORITES}": required(input.teacher.chatFavoritesEn, "좋아하는 것"),
    "{TOPIC}": required(input.topicEn, "주제"),
    "{UNIT_WORDS}": required(
      input.unitWords
        .map((word) => word.trim())
        .filter((word) => word !== "")
        .join(", "),
      "단원 단어",
    ),
    "{LANGUAGE}": talkChatLanguageOf(rules.turnWords),
  };
  // 한 번에 바꿔 자리 값 안의 '{…}' · '$' 가 다시 읽히지 않게 한다
  return CHAT_SYSTEM_TEMPLATE.replace(
    SLOT_PATTERN,
    (slot) => fill[slot as ChatSystemSlot],
  );
}

// ── 대화 기록(spec 설계 2 '대화 기록') ───────────────────────────────

/** 안전 검사(문장 문)가 바꾼 문장 하나: say 안의 원래 문장 → 실제로 나간 글(지운 문장은 ''). */
export type ChatSayChange = { from: string; to: string };

/**
 * 기록에 남길 선생님 차례: 모델이 낸 응답 JSON 원문 그대로(시제품과 같음). 안전 검사가 바꾼 문장이 있으면 say 칸에서 그 문장만 실제로 나간 글로
 * 바꾼 JSON 이다(칸 차례는 원문 그대로). 1~3단계에서 소리 줄로 뺀 따라 할 문장은 안전 검사가 바꾼 것이 아니므로 넘기지 않는다. 앱이 붙인 줄
 * (기다림 줄 · 마무리 단추)은 넣지 않는다. 원문이 JSON 객체가 아니거나 say 에 그 문장이 없으면 원문 그대로 둔다.
 */
export function talkChatAssistantOf(
  raw: string,
  changes: readonly ChatSayChange[],
): string {
  if (changes.length === 0) return raw;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    return raw;
  const record = parsed as Record<string, unknown>;
  if (typeof record.say !== "string") return raw;
  let say = record.say;
  for (const { from, to } of changes) {
    if (from === "" || !say.includes(from)) continue;
    // 지운 문장은 옆의 빈칸 하나와 함께 뺀다(다른 문장의 글은 건드리지 않는다)
    const target =
      to !== ""
        ? from
        : say.includes(`${from} `)
          ? `${from} `
          : say.includes(` ${from}`)
            ? ` ${from}`
            : from;
    say = say.replace(target, () => to);
  }
  if (say === record.say) return raw;
  return JSON.stringify({ ...record, say });
}

/** 보낼 메시지: 앞 차례(사용자 · 선생님) → 이번 사용자 메시지(chat-message.ts 의 꼴). */
export function talkChatMessages(input: TalkChatInput): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const entry of input.history) {
    messages.push({ role: "user", content: entry.user });
    messages.push({ role: "assistant", content: entry.assistant });
  }
  messages.push({ role: "user", content: chatUserMessageOf(input.message) });
  return messages;
}

// ── 응답(구조화 출력, 칸 차례가 곧 생성 차례 — spec 설계 2) ───────────────

/** 응답 네 칸. listen_sentence 를 맨 앞에 두어 say 를 흘리기 전에 따라 할 문장을 안다(D6). 칸 설명 글은 두지 않는다(안내문 마지막 문단이 설명). */
export const TalkChatOutputSchema = z.object({
  listen_sentence: z.string(),
  say: z.string(),
  say_ko: z.string(),
  wrap_up: z.boolean(),
});
export type TalkChatOutput = z.infer<typeof TalkChatOutputSchema>;

/** 응답 칸 이름(생성 차례). */
export const TALK_CHAT_OUTPUT_FIELDS = Object.keys(
  TalkChatOutputSchema.shape,
) as readonly (keyof TalkChatOutput)[];

const str = z.string().catch("");

/** 느슨한 규격(엄격 규격을 못 지난 응답을 받아 볼 때). say 는 normalizeTalkChat 이 본다. */
const talkChatLoose = z.object({
  listen_sentence: str,
  say: z.unknown(),
  say_ko: str,
  wrap_up: z.boolean().catch(false),
});

/**
 * 정규화: 응답을 고쳐 쓰지 않는다(FR-4). 말 칸이 글이 아니거나 비었으면 null(호출 하나의 실패 → 지금 다시 시도 규칙). 빠진 글 칸은 '', 빠지거나
 * 참거짓이 아닌 wrap_up 은 거짓이다(맺는다는 뜻이 분명할 때만 맺는다).
 */
export function normalizeTalkChat(loose: unknown): TalkChatOutput | null {
  const parsed = talkChatLoose.safeParse(loose);
  if (!parsed.success) return null;
  const v = parsed.data;
  if (typeof v.say !== "string" || v.say.trim() === "") return null;
  return {
    listen_sentence: v.listen_sentence,
    say: v.say,
    say_ko: v.say_ko,
    wrap_up: v.wrap_up,
  };
}

/** 엄격 검증 뒤의 확인: 말 칸이 비면 다시 시도한다(빈 응답). */
export function talkChatValidate(value: TalkChatOutput): string[] {
  return value.say.trim() === "" ? ["say 가 비었다"] : [];
}

// ── 출력 검사(6.4 — say 는 흘려 받는 동안 문장 문이 본다) ─────────────────

/**
 * 6.4 출력 검사 칸: 뜻(say_ko) · 따라 할 문장(listen_sentence). say 는 흘려 받는 동안 문장마다 문장 문이 보므로 넣지 않는다. 따라 할 문장의 길이는
 * 보지 않는다(수준 검사는 기록 전용, spec 설계 4 — 길이로 걸러 비우면 그 문장이 1~3단계 말풍선 글에 남는다).
 */
export function talkChatCheckFields(
  value: Pick<TalkChatOutput, "say_ko" | "listen_sentence">,
): CheckField[] {
  return [
    { path: "say_ko", lang: "ko", text: value.say_ko },
    {
      path: "listen_sentence",
      lang: "en",
      text: value.listen_sentence,
      checkLength: false,
    },
  ];
}

/** 걸린 칸 바꾸기(6.4): 걸린 칸만 비운다. 회화 턴은 걸린 칸을 바꿔 쓰고 그 턴을 실패로 보지 않는다. */
export function applyTalkChatChecks(
  value: TalkChatOutput,
  hits: ReadonlyMap<string, readonly FieldHit[]>,
): ApplyChecksResult<TalkChatOutput> {
  if (hits.size === 0) return { value, changed: false, fatal: false };
  return {
    value: {
      ...value,
      say_ko: hits.has("say_ko") ? "" : value.say_ko,
      listen_sentence: hits.has("listen_sentence") ? "" : value.listen_sentence,
    },
    changed: true,
    fatal: false,
  };
}

// ── 호출 규격(P9b CallSpec 꼴) ─────────────────────────────────────

/** 이번 차례 입력의 가림: 들린 글 · 다른 후보(아이 말과 같은 가림, spec 설계 11). */
function maskInput(input: ChatInput, masker: Masker): ChatInput {
  if (input.kind !== "speech") return input;
  const note = input.note ?? null;
  const alternative = note?.alternative;
  return {
    ...input,
    heard: masker(input.heard).text,
    ...(note === null
      ? {}
      : {
          note:
            alternative === undefined
              ? note
              : { ...note, alternative: masker(alternative).text },
        }),
  };
}

/** 사실 줄의 가림: 한국어 도움으로 알려 준 표현. */
function maskFact(fact: ChatFact, masker: Masker): ChatFact {
  if (fact.kind !== "ko_help" || fact.taught === null) return fact;
  return { ...fact, taught: masker(fact.taught).text };
}

/**
 * 이야기 방식의 대화 호출 규격. 목적은 지금 회화 턴과 같은 talk_turn 이라 모델 · effort · 생각 단계 · 최대 출력 · 기다림 키가 같다(새 ai 키 없음).
 * 가림: 이번 아이 말 · 인식기의 다른 후보 · 한국어 도움 표현. 앞 차례 글은 가린 뒤 저장한 글이라 그대로 둔다(캐시).
 */
export const talkChatTurnSpec: CallSpec<
  TalkChatInput,
  TalkChatOutput,
  TalkChatRules
> = {
  purpose: "talk_turn",
  title: TALK_CHAT_TITLE,
  wireSchema: () => TalkChatOutputSchema,
  looseSchema: talkChatLoose,
  multiTurn: true,
  enumPaths: [],
  settingSchemas: TALK_CHAT_SETTING_SCHEMAS,
  rulesOf: talkChatRulesOf,
  mask: (input, masker: Masker) => ({
    ...input,
    message: {
      facts: input.message.facts.map((fact) => maskFact(fact, masker)),
      input: maskInput(input.message.input, masker),
    },
  }),
  system: talkChatSystem,
  messages: (input) => talkChatMessages(input),
  validate: (value) => talkChatValidate(value),
  normalize: (loose) => normalizeTalkChat(loose),
  checkFields: talkChatCheckFields,
  applyChecks: (value, hits) => applyTalkChatChecks(value, hits),
};
