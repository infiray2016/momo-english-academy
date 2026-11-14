// 회화 수업 선생님 행의 차례 정보 칸 talk_turns.move(5절 · 3.3 '셋을 가른다' · 회화 plan '이름' 절 move 표 · 정한 것 5 · 6 · 8).
// 이 칸이 학습 기회 제공 · 이월 · 유효 수행 턴(후보 셈)의 셈과 근거 칸(P12)의 출처다. 저장하지 않고 그때그때 센다(정한 것 7).
// 원문을 지울 때(data.text_retention_months · 부모의 대화 지우기)는 소리 줄 글 · 근거 한 줄 · 새 회화 엔진 기록 · 이야기 방식 기록의 글 칸만
// 지우고 나머지는 남긴다(eraseTalkMoveText).
// 순수 모듈이다(시각 · DB 없음).
import { z } from "zod";
import { CHAT_FACT_KINDS } from "@/core/conversation/chat-message";
import {
  TALK_CARD_ITEM_KINDS,
  TALK_NEXT_MOVES,
  TALK_SUPPORTS,
} from "@/core/seed/structure";

/** move 꼴 판. 칸을 바꾸면 판을 올리고 읽기가 옛 판을 받게 한다. */
export const TALK_MOVE_VERSION = 1;
/** 선생님 차례 종류: 대화 첫 질문(앱 · AI 없음) · AI 차례 · 카드 자리 · 마무리 자리(3.3 차례 표). */
export const TALK_MOVE_KINDS = [
  "first_question",
  "ai",
  "card_slot",
  "closing_slot",
] as const;
export type TalkMoveKind = (typeof TALK_MOVE_KINDS)[number];
/**
 * 카드 자리의 까닭(3.3 카드 자리 (1)~(4)): 따라가기 상한 · AI 질문 검사 · 같은 질문 · 받침, 그리고 끊긴 턴 · 실패 길(8절), 되묻기(13절 C218 —
 * 선생님이 못 알아들은 말을 그 질문 자리에서 한 번 더 말해 달라고 하는 차례. 값을 더하기만 해 판은 그대로다, 내용 고침 2 plan 정한 것 4).
 * 인사 토막에서 앱이 카드 인사 질문을 붙인 차례는 까닭이 없다(null).
 */
export const TALK_SLOT_WHYS = [
  "follow_cap",
  "question_check",
  "same_question",
  "support",
  "cut",
  "fail",
  "ask_again",
] as const;
export type TalkSlotWhy = (typeof TALK_SLOT_WHYS)[number];
/**
 * 앞 아이 차례의 까닭: '잘 모르겠어요' 단추 · 막힘으로 볼 말 · 들리지 않음(3.3 막힘 문단 · 기기 쪽) · 되물음(13절 C218 — 선생님이 못 알아들어
 * 되물은 아이 말. 아이 쪽 막힘으로 세지 않는다). 말로 답했으면 null.
 */
export const TALK_CHILD_CAUSES = [
  "button",
  "stuck",
  "nospeech",
  "unclear",
] as const;
export type TalkChildCause = (typeof TALK_CHILD_CAUSES)[number];
/** 서버가 붙인 도움(5절 '서버가 붙인 소리 줄은 앞 선생님 행 move 로 안다', 정한 것 8). */
export const TALK_APP_HELPS = [
  "together",
  "easy_question",
  "choices",
  "model_line",
  "answer_example",
  "listen",
  "floor",
  "prep",
] as const;
export type TalkAppHelp = (typeof TALK_APP_HELPS)[number];
/** 받침 단계 끝(0 없음 · 1 같이 말하기 · 2 쉬운 질문 · 3 닫기, 3.3 막힘 표 세 줄). 설정값이 아닌 표의 줄 수다. */
export const TALK_SUPPORT_STAGE_MAX = 3;
/**
 * 받침 단계 첫째(같이 말하기) · 둘째(쉬운 질문 · 고르기 답) — 3.3 막힘 표의 줄 번호(설정값이 아닌 표의 자리). 흐름(lesson-flow) · 회화 턴
 * 규격(talk-lesson) · 턴 길(lesson-turn) · 들은 도움(hints)이 이 상수 하나를 쓴다('5-다' 우려 · 묶음 12).
 */
export const TALK_SUPPORT_STAGE_TOGETHER = 1;
export const TALK_SUPPORT_STAGE_EASY = 2;

const Ids = z.array(z.string());

/** 카드 항목(필수 질문 · 더 이야기할 거리의 번호, 아니면 none · 0). */
export const TalkCardItemRefSchema = z.strictObject({
  kind: z.enum(TALK_CARD_ITEM_KINDS),
  no: z.int().min(0),
});
export type TalkCardItemRef = z.infer<typeof TalkCardItemRefSchema>;
/** 카드 항목 없음. */
export const NO_CARD_ITEM: TalkCardItemRef = { kind: "none", no: 0 };

/**
 * 새 회화 엔진 응답의 읽기 칸(reading) 값(spec '회화 Claude 주도' 설계 2 작은 응답 표). 응답 규격(R1)과 기록(lead)이 같은 목록을 쓴다.
 * 막힘 값 · 아이 말 갈래로 옮기는 표는 lead-record.ts 에 있다(설계 4).
 */
export const TALK_LEAD_READINGS = [
  "clear_answer",
  "likely_misheard",
  "does_not_fit",
  "new_topic",
  "asks_teacher",
  "does_not_know",
  "repeated_my_model",
] as const;
export type TalkLeadReading = (typeof TALK_LEAD_READINGS)[number];
/** 새 회화 엔진 응답의 차례 갈래(move) 값(설계 2 작은 응답 표). */
export const TALK_LEAD_MOVES = [
  "react_and_follow_up",
  "react_only",
  "share_about_me",
  "ask_again",
  "easier_or_choices",
  "model_repeat",
  "bridge_to_goal",
  "wrap_up",
] as const;
export type TalkLeadMove = (typeof TALK_LEAD_MOVES)[number];

/**
 * 새 회화 엔진 선생님 행의 기록 묶음 move.lead(spec 데이터 절 move 행). 지금 판정의 입력이 아니라 기록이다 — 판정 입력은 같은 행의
 * 기존 칸(kind · next · stage · cause · ai · sound)에 채운다(lead-record.ts). 글 칸(따라 할 문장 · 다시 받은 문장 · 뺀 문장)은 원문을 지울
 * 때 비운다(eraseTalkMoveText).
 */
/**
 * 1~3단계 소리 줄을 글 사이(선생님 말 칸의 제자리)에서 읽은 차례의 자리(13절 C241 보완 7): 갈래마다 행 글 첫 줄(말풍선 글)에서 그 소리 줄 앞에 오는
 * 글자 수. 같은 시도 다시 흘림 · 이어 하기 · 대본 도구가 이 자리에서 글을 나눠 같은 줄 차례를 낸다. 뒤에 글이 남는 소리 줄만 적고, 칸이 없는 소리
 * 줄(지난 행 포함)은 지금 차례(글 뒤)로 읽는다. 글이 아니라 수라 원문을 지울 때 남는다.
 */
export const LowBandSoundAtSchema = z.strictObject({
  model: z.int().min(0).optional(),
  answer: z.int().min(0).optional(),
});

export const TalkLeadSchema = z.strictObject({
  reading: z.enum(TALK_LEAD_READINGS),
  move: z.enum(TALK_LEAD_MOVES),
  /** 따라 할 문장 대조(설계 4): 확인한 문장과 나간 말 칸에 그대로 들었는지(맞음 · 어긋남). 문장이 빈 model_repeat 는 칸이 없다. */
  model: z
    .strictObject({ sentence: z.string(), inSay: z.boolean() })
    .optional(),
  /** 막힌 뒤 고르기 답을 들려준 차례(설계 4 둘째 줄). */
  choices: z.literal(true).optional(),
  /** 물음 문장에 든 단원 단어 · 말 칸에서 찾은 단원 단어(원형, 만남과 같은 대조). */
  asked: Ids,
  said: Ids,
  /** 좁은 정의 걸림(설계 6, 묶음 R4 · S1 이 채움): 항목 · 다시 받은 문장 · 다시 걸림 · 걸린 시간(밀리초). */
  narrow: z
    .strictObject({
      item: z.string(),
      retry: z.string(),
      again: z.boolean(),
      ms: z.int().min(0),
    })
    .optional(),
  /** 넓은 검사 수치(기록 전용, 묶음 R4 의 이름 그대로). */
  wide: z.record(z.string(), z.number()).optional(),
  /** 문장 문 걸림(걸린 검사 이름). */
  gate: z.array(z.string()).optional(),
  /** 마무리 차례에 앱이 상수 물음을 붙였다(설계 3 마무리 물음). */
  closingAdded: z.literal(true).optional(),
  /** 1~3단계에서 보이는 글에서 뺀 문장(설계 8, 묶음 R5). */
  removed: z.array(z.string()).optional(),
  /** 소리 줄 뒤에 글이 남아 글 뒤의 듣기 단추 자리가 원래 문장 차례(소리 줄을 읽는 제자리)와 다르다(plan 확인할 것 4 · 13절 C241 보완 7). */
  soundMoved: z.literal(true).optional(),
  /** 글 사이에서 읽은 소리 줄의 자리(LowBandSoundAtSchema). 칸이 없으면 글 뒤다. */
  soundAt: LowBandSoundAtSchema.optional(),
});
export type TalkLead = z.infer<typeof TalkLeadSchema>;

/**
 * 이야기 방식(talk.lead_mode chat)에서 응답의 wrap_up 참을 거짓으로 다룬 차례의 자리(spec '회화 대화 구조 R' 설계 5): 수업 첫 말 · 인사 토막 ·
 * 짧은 준비 뒤 돌아옴.
 */
export const TALK_CHAT_WRAP_HELD = ["start", "greeting", "back"] as const;
export type TalkChatWrapHeld = (typeof TALK_CHAT_WRAP_HELD)[number];

/**
 * 이야기 방식 선생님 행의 기록 묶음 move.chat(spec '회화 대화 구조 R' 데이터 절 move 행 · 설계 4). 지금 판정의 입력이 아니라 기록이다 — 판정 입력은
 * 같은 행의 기존 칸(kind · next · ai · sound)에 채운다(chat-reply.ts). 글 칸(따라 할 문장 · 뺀 문장)은 원문을 지울 때 비운다(eraseTalkMoveText).
 */
export const TalkChatSchema = z.strictObject({
  /** 따라 할 문장(6.4 를 지난 listen_sentence) 대조: 그 문장과 say 에 정규화로 문장째 들었는지(맞음 · 어긋남). 빈 문장이면 칸이 없다. */
  listen: z
    .strictObject({
      sentence: z.string(),
      inSay: z.boolean(),
      /** 정규화로는 say 에 들었으나 문장 경계 밖이라 글에 남은 차례(어긋남의 한 꼴 — 글은 바꾸지 않음). 참일 때만 싣는다. */
      partial: z.literal(true).optional(),
    })
    .optional(),
  /** 앱이 아는 막힘 뒤 고르기 물음을 들려준 차례(1~3단계는 글에서 빼 소리 줄로). */
  choices: z.literal(true).optional(),
  /** 1~3단계에서 보이는 글에서 뺀 문장(소리 줄). */
  removed: z.array(z.string()).optional(),
  /** 소리 줄 뒤에 글이 남아 글 뒤의 듣기 단추 자리가 원래 문장 차례(소리 줄을 읽는 제자리)와 다르다(13절 C241 보완 7). */
  soundMoved: z.literal(true).optional(),
  /** 글 사이에서 읽은 소리 줄의 자리(LowBandSoundAtSchema). 칸이 없으면 글 뒤다. */
  soundAt: LowBandSoundAtSchema.optional(),
  /** 수준 검사 수치(기록 전용 — 문장 수 · 물음 수 · 문장 길이 · 범위 밖 낱말 · 범위 밖 형태). */
  level: z.record(z.string(), z.number()),
  /** 지어낸 경험 꼴에 걸린 문장마다 걸린 꼴(정규화 글, 기록 전용). 수는 길이다. */
  madeUp: z.array(z.string()),
  /** 문장 문 걸림(걸린 검사 이름). */
  gate: z.array(z.string()).optional(),
  /** 이 차례 사용자 메시지에 붙인 사실 줄의 갈래. */
  facts: z.array(z.enum(CHAT_FACT_KINDS)),
  /** 조용함 입구(quiet)로 연 차례. */
  quiet: z.literal(true).optional(),
  /** 이 차례까지 선생님이 아이 말 없이 잇달아 말한 수. */
  run: z.int().min(0),
  /** 첫 문장 시간(밀리초). */
  firstMs: z.int().min(0).optional(),
  /** 막힌 뒤 설명을 보였는지. */
  explain: z.boolean().optional(),
  /** 응답의 wrap_up 참을 거짓으로 다룬 자리. */
  wrapUpHeld: z.enum(TALK_CHAT_WRAP_HELD).optional(),
});
export type TalkChat = z.infer<typeof TalkChatSchema>;

export const TalkMoveSchema = z.strictObject({
  v: z.literal(TALK_MOVE_VERSION),
  kind: z.enum(TALK_MOVE_KINDS),
  why: z.enum(TALK_SLOT_WHYS).nullable(),
  /** 이 차례 질문의 갈래(회화 턴 출력 next_move, 앱 차례는 none). */
  next: z.enum(TALK_NEXT_MOVES),
  /** 이 차례 질문의 카드 항목(카드 자리는 붙인 항목). */
  item: TalkCardItemRefSchema,
  /** 노린 목표 · 노린 단원 단어(원형). */
  goals: Ids,
  words: Ids,
  /** 이 차례에 준 받침 단계. */
  stage: z.int().min(0).max(TALK_SUPPORT_STAGE_MAX),
  cause: z.enum(TALK_CHILD_CAUSES).nullable(),
  /** 질문 자리와 관계없이 이어진 아이 쪽 막힘(이 차례 앞까지, 들리지 않음은 셈 밖). */
  streak: z.int().min(0),
  /** 서버가 붙인 도움 · AI 가 준 도움(회화 턴 출력 support). */
  app: z.array(z.enum(TALK_APP_HELPS)),
  ai: z.enum(TALK_SUPPORTS),
  /** 이 차례에 꺼낸 새 단어(앱 확인 뒤). */
  intro: Ids,
  /** 앞 아이 말에 대한 AI 제안(기록 전용 — 화면 · 흐름 · 점수에 쓰지 않는다). why 는 원문과 같이 지운다. */
  suggest: z.strictObject({
    fit: z.boolean(),
    topic: z.boolean(),
    asked: z.boolean(),
    goals: z.array(z.strictObject({ id: z.string(), why: z.string() })),
  }),
  /** 앱 확인으로 이은 목표 · 확인 보류(둘째 묶음). */
  linked: Ids,
  held: Ids,
  /** 1~3단계 소리 줄 글(따라 할 말 · 선택지 둘 · 받침의 답). 화면 글이 아니라 text 에 두지 않는다(T2). 원문과 같이 지운다. */
  sound: z
    .strictObject({
      model: z.string().optional(),
      choices: z.tuple([z.string(), z.string()]).optional(),
      answer: z.string().optional(),
    })
    .optional(),
  /** 바닥선에 든 차례(둘째 묶음). */
  floor: z.literal(true).optional(),
  /** 대화 중 연 짧은 준비 낱말(3.3 짧은 준비 (나)). */
  prep: z.strictObject({ words: Ids }).optional(),
  /**
   * 새 회화 엔진(Claude 가 이끄는 대화, talk.lead_mode claude)의 기록 묶음(spec '회화 Claude 주도' 데이터 절 · 설계 4). 그 엔진의 선생님 행에만
   * 있고, 지금 길의 행과 옛 행에는 칸이 없다(선택 칸이라 판은 그대로다 — plan 되돌림 4).
   */
  lead: TalkLeadSchema.optional(),
  /**
   * 이야기 방식(talk.lead_mode chat)의 기록 묶음(spec '회화 대화 구조 R' 데이터 절). 그 방식의 선생님 행에만 있고, 다른 방식의 행과 옛 행에는
   * 칸이 없다(선택 칸이라 판은 그대로다).
   */
  chat: TalkChatSchema.optional(),
});
export type TalkMove = z.infer<typeof TalkMoveSchema>;

/** 만들기 입력: 종류만 반드시, 나머지는 빈 값이 기본이다(판은 늘 지금 판). */
export type TalkMoveInput = Partial<Omit<TalkMove, "v">> &
  Pick<TalkMove, "kind">;

/** move 만들기(빈 칸은 기본값 — 소리 줄 · 바닥선 · 짧은 준비는 값이 있을 때만 칸을 둔다). */
export function talkMoveOf(input: TalkMoveInput): TalkMove {
  const move: TalkMove = {
    v: TALK_MOVE_VERSION,
    kind: input.kind,
    why: input.why ?? null,
    next: input.next ?? "none",
    item: input.item ? { ...input.item } : { ...NO_CARD_ITEM },
    goals: [...(input.goals ?? [])],
    words: [...(input.words ?? [])],
    stage: input.stage ?? 0,
    cause: input.cause ?? null,
    streak: input.streak ?? 0,
    app: [...(input.app ?? [])],
    ai: input.ai ?? "none",
    intro: [...(input.intro ?? [])],
    suggest: input.suggest
      ? {
          ...input.suggest,
          goals: input.suggest.goals.map((g) => ({ ...g })),
        }
      : { fit: false, topic: false, asked: false, goals: [] },
    linked: [...(input.linked ?? [])],
    held: [...(input.held ?? [])],
  };
  if (input.sound !== undefined) move.sound = { ...input.sound };
  if (input.floor !== undefined) move.floor = input.floor;
  if (input.prep !== undefined) move.prep = { words: [...input.prep.words] };
  if (input.lead !== undefined) move.lead = copyLead(input.lead);
  if (input.chat !== undefined) move.chat = copyChat(input.chat);
  return move;
}

/** chat 묶음 깊은 사본(값이 있는 선택 칸만 둔다). */
function copyChat(chat: TalkChat): TalkChat {
  const out: TalkChat = {
    level: { ...chat.level },
    madeUp: [...chat.madeUp],
    facts: [...chat.facts],
    run: chat.run,
  };
  if (chat.listen !== undefined) out.listen = { ...chat.listen };
  if (chat.choices !== undefined) out.choices = chat.choices;
  if (chat.removed !== undefined) out.removed = [...chat.removed];
  if (chat.soundMoved !== undefined) out.soundMoved = chat.soundMoved;
  if (chat.soundAt !== undefined) out.soundAt = { ...chat.soundAt };
  if (chat.gate !== undefined) out.gate = [...chat.gate];
  if (chat.quiet !== undefined) out.quiet = chat.quiet;
  if (chat.firstMs !== undefined) out.firstMs = chat.firstMs;
  if (chat.explain !== undefined) out.explain = chat.explain;
  if (chat.wrapUpHeld !== undefined) out.wrapUpHeld = chat.wrapUpHeld;
  return out;
}

/** lead 묶음 깊은 사본(값이 있는 선택 칸만 둔다). */
function copyLead(lead: TalkLead): TalkLead {
  const out: TalkLead = {
    reading: lead.reading,
    move: lead.move,
    asked: [...lead.asked],
    said: [...lead.said],
  };
  if (lead.model !== undefined) out.model = { ...lead.model };
  if (lead.choices !== undefined) out.choices = lead.choices;
  if (lead.narrow !== undefined) out.narrow = { ...lead.narrow };
  if (lead.wide !== undefined) out.wide = { ...lead.wide };
  if (lead.gate !== undefined) out.gate = [...lead.gate];
  if (lead.closingAdded !== undefined) out.closingAdded = lead.closingAdded;
  if (lead.removed !== undefined) out.removed = [...lead.removed];
  if (lead.soundMoved !== undefined) out.soundMoved = lead.soundMoved;
  if (lead.soundAt !== undefined) out.soundAt = { ...lead.soundAt };
  return out;
}

/** move 읽기(talk_turns.move jsonb). 비었거나 꼴이 틀리면 null(옛 행 · 칸이 빈 행). */
export function readTalkMove(value: unknown): TalkMove | null {
  if (value === null || value === undefined) return null;
  const parsed = TalkMoveSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * 원문을 지울 때 남는 move(정한 것 5): 소리 줄 글(sound)은 통째로, 근거 한 줄(suggest.goals[].why)과 새 회화 엔진 기록(lead)의 글 칸은
 * 그 글만 지운다. 나머지 값
 * (종류 · 갈래 · 카드 항목 · 노린 것 · 받침 · 도움 · 제안의 참 거짓 · 이은 목표)은 남는다. 원문 정리 Cron · 부모의 대화 지우기가 부른다.
 */
export function eraseTalkMoveText(move: TalkMove): TalkMove {
  const { sound: _sound, lead, chat, ...rest } = move;
  return {
    ...rest,
    suggest: {
      ...move.suggest,
      goals: move.suggest.goals.map(({ id }) => ({ id, why: "" })),
    },
    ...(lead === undefined ? {} : { lead: eraseLeadText(lead) }),
    ...(chat === undefined ? {} : { chat: eraseChatText(chat) }),
  };
}

/** 이야기 방식 기록 묶음의 글 칸(따라 할 문장 · 뺀 문장)만 비운다. 값(맞음 · 걸림 · 수치 · 지어낸 경험 꼴)은 남는다. */
function eraseChatText(chat: TalkChat): TalkChat {
  const out = copyChat(chat);
  if (out.listen !== undefined) out.listen.sentence = "";
  if (out.removed !== undefined) out.removed = [];
  return out;
}

/** 새 회화 엔진 기록 묶음의 글 칸(따라 할 문장 · 다시 받은 문장 · 뺀 문장)만 비운다. 값(맞음 · 걸림 · 수치 · 단원 단어)은 남는다. */
function eraseLeadText(lead: TalkLead): TalkLead {
  const out = copyLead(lead);
  if (out.model !== undefined) out.model.sentence = "";
  if (out.narrow !== undefined) out.narrow.retry = "";
  if (out.removed !== undefined) out.removed = [];
  return out;
}
