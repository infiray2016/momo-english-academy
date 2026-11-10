// 회화 수업 선생님 행의 차례 정보 칸 talk_turns.move(5절 · 3.3 '셋을 가른다' · 회화 plan '이름' 절 move 표 · 정한 것 5 · 6 · 8).
// 이 칸이 학습 기회 제공 · 이월 · 유효 수행 턴(후보 셈)의 셈과 근거 칸(P12)의 출처다. 저장하지 않고 그때그때 센다(정한 것 7).
// 원문을 지울 때(data.text_retention_months · 부모의 대화 지우기)는 소리 줄 글과 근거 한 줄만 지우고 나머지는 남긴다(eraseTalkMoveText).
// 순수 모듈이다(시각 · DB 없음).
import { z } from "zod";
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
  return move;
}

/** move 읽기(talk_turns.move jsonb). 비었거나 꼴이 틀리면 null(옛 행 · 칸이 빈 행). */
export function readTalkMove(value: unknown): TalkMove | null {
  if (value === null || value === undefined) return null;
  const parsed = TalkMoveSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * 원문을 지울 때 남는 move(정한 것 5): 소리 줄 글(sound)은 통째로, 근거 한 줄(suggest.goals[].why)은 그 글만 지운다. 나머지 값
 * (종류 · 갈래 · 카드 항목 · 노린 것 · 받침 · 도움 · 제안의 참 거짓 · 이은 목표)은 남는다. 원문 정리 Cron · 부모의 대화 지우기가 부른다.
 */
export function eraseTalkMoveText(move: TalkMove): TalkMove {
  const { sound: _sound, ...rest } = move;
  return {
    ...rest,
    suggest: {
      ...move.suggest,
      goals: move.suggest.goals.map(({ id }) => ({ id, why: "" })),
    },
  };
}
