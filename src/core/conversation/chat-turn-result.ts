// 회화 이야기 방식 선생님 차례의 응답 갈래 조립(intent 2026-11-13-회화-대화-구조-R plan 묶음 S1 fix 1 — 검토 rev-chat-s1 I-2 · M-1 · M-2 · M-6).
// 대화 호출의 결과(응답 · 첫 문장 뒤 끊김 · 실패)와 흘리는 동안 내보낸 문장 · 잡아 둔 문장으로, 흘림 뒤에 낼 줄(남은 문장 · 뜻 · 소리 줄) · 선생님 행 초안 ·
// 안전 상한 차례의 끝인사 · 만남 낱말 · 받침 단계와 끝 줄 신호를 정한다. 서버 턴 길(chat-turn.ts)과 대본 도구(묶음 T1)가 같은 함수를 부른다(NFR-4 ·
// AC-18). 순수 모듈이다(DB · 서버 · SDK · 시각 없음). 줄을 쓰고 행을 저장하는 일은 부르는 쪽이 한다.
import type { TalkChatOutput } from "@/core/ai/calls/talk-chat";
import {
  type ChatReply,
  type ChatReplyCheck,
  chatReplyOf,
} from "@/core/conversation/chat-reply";
import {
  type ChatReplayLine,
  type ChatTurnPlan,
  chatCardGreetingLineOf,
  chatFallbackReplyOf,
  chatTeacherRowMoveOf,
  chatTurnFinishOf,
} from "@/core/conversation/chat-turn-plan";
import type { TalkMove } from "@/core/conversation/move";
import { metWordsIn } from "@/core/conversation/said";
import { safeLineOf } from "@/core/conversation/stream";
import { splitSentences } from "@/core/seed/text";

/**
 * 대화 호출 결과(서버 talkChatTurn 의 결과 · 대본 도구의 가짜 응답을 옮긴 꼴): ok 는 응답(value 는 문장 문 · 6.4 뒤 값, assistant 는 대화 기록 글,
 * blocked 는 문장 문 걸림 갈래, listenBlocked 는 6.4 가 따라 할 문장을 비움), cut 은 첫 문장 뒤 끊김(sentSentences 는 문장 문을 지난 문장 — 잡아 둔
 * 것 포함), failed 는 응답이 없는 차례(reason 은 실패 갈래 — 'safety_cap' 은 'AI 쉬는 중', 'refusal' 은 거절).
 */
export type ChatCallResult =
  | {
      kind: "ok";
      value: TalkChatOutput;
      assistant: string;
      blocked: readonly string[];
      listenBlocked: boolean;
      overLength: number;
      sentSentences: readonly string[];
      firstSentenceMs: number | null;
    }
  | {
      kind: "cut";
      sentSentences: readonly string[];
      overLength: number;
      firstSentenceMs: number | null;
    }
  | { kind: "failed"; reason: string };

/** 'AI 쉬는 중'(하루 안전 상한)으로 끝난 호출의 실패 갈래(서버 AiFailureReason 의 값). */
export const CHAT_RESTING_REASON = "safety_cap";
/** 거절(두 모델)의 실패 갈래 — 그 차례의 안전한 대사를 쓴다(지금 실패 규칙). */
const REFUSAL_REASON = "refusal";
/** 6.4 가 따라 할 문장을 비운 차례를 move.chat.gate 에 적는 이름(서버 talk.ts CHAT_LISTEN_BLOCKED_GATE 와 같은 값 — 짝 시험이 묶음). */
export const CHAT_LISTEN_BLOCKED_GATE_NAME = "listen_check";

/** 선생님 행 초안(저장 앞 — 보낸 사용자 메시지 · 행 번호는 부르는 쪽이 붙인다). */
export type ChatTeacherDraft = {
  text: string;
  toriRewrite: string | null;
  toriKo: string | null;
  overLength: boolean;
  move: TalkMove;
};

type Line = { en: string; ko?: string };

/** 카드 대사 한 줄(뜻은 withKo 일 때만 — 지금 길의 lineOf 와 같은 꼴). */
function lineOf(
  line: { en: string; ko?: string | undefined },
  withKo: boolean,
): Line {
  return {
    en: line.en,
    ...(withKo && line.ko !== undefined ? { ko: line.ko } : {}),
  };
}

/** 길이 초과(지금 길 lessonOverLengthOf 와 같은 판정): 길이를 넘은 문장이 있거나 문장 수가 상한을 넘음. */
function overLengthOf(words: number, sentences: number, max: number): boolean {
  return words > 0 || sentences > max;
}

/** 빈칸을 모은 글(흘린 줄과 본체 글을 견줄 때). */
const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** 조각을 뺀 뒤 남은 글이 낱말 없이 부호 · 빈 따옴표 · 괄호뿐인가. */
const NO_WORD = /^[\s"“”‘’'()[\].,!?:;-]*$/;

/**
 * 끝 쉼표를 쌍점으로 바꿀 따라 말하게 하는 안내 말(글 빼기 lead-low-band 의 GUIDE_TRAILING_COMMA 와 같은 식 — 그 파일은 다듬기를 내보내지 않아 같은
 * 식을 둔다. 잡아 둔 글은 say 의 끝 조각이라 '글 끝'이 본체와 같은 자리다).
 */
const GUIDE_TRAILING_COMMA =
  /(\b(?:say|repeat)(?:\s+(?:it|after me|with me|again|together))*)\s*,\s*$/i;

/**
 * 잡아 둔 글(잡아 둔 문장들을 빈칸으로 이은 say 의 끝 조각)에서 본체가 뺀 조각을 지운 글(검토 M-2 · 재검토 N-1 — 두 문장에 걸친 조각(두 문장으로 나뉜
 * 고르기 물음)도 한 번에 지운다. 본체 글을 다시 나누지 않는다). 다듬기는 글 빼기와 같은 뜻이다: 속이 빈 따옴표 쌍 · 괄호와 홀로 남은 부호를 지우고
 * 빈칸을 모은 뒤, 안내 말 뒤 끝 쉼표는 쌍점으로 · 그 밖의 끝 쉼표는 지운다. 낱말이 하나도 남지 않으면 빈 글이다.
 */
function strippedOf(held: string, pieces: readonly string[]): string {
  let text = held;
  for (const piece of pieces) if (piece !== "") text = text.replace(piece, " ");
  if (text === held) return squash(text);
  const out = squash(
    text
      .replace(/(^|[\s:,])["“‘'][\s.,!?]*["”’'](?=$|[\s.,!?])/g, "$1")
      .replace(/\(\s*\)/g, " ")
      .replace(/(^|\s)[.!?]+(?=\s|$)/g, "$1"),
  )
    .replace(GUIDE_TRAILING_COMMA, "$1:")
    .replace(/\s*,\s*$/, "");
  return NO_WORD.test(out) ? "" : out;
}

/** 낱말만 남긴 글(문장 부호 · 빈칸 차이는 갈림으로 세지 않음 — 재검토 N-2). {NAME} 자리는 낱말로 둔다. */
const wordsOnly = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}{}']+/gu, " ")
    .trim();

/**
 * 이미 글로 나간 조각을 응답 처리 결과에서 거둔다: 그 조각은 move.chat.removed 에서 빼고 소리 줄로 내지 않는다(따라 할 문장이면 model, 고르기 물음이면
 * answer — 남은 answer 가 없으면 고르기 표시도 뺀다). 나간 조각이 없으면 그대로다.
 */
function withoutSent(reply: ChatReply, sent: readonly string[]): ChatReply {
  const removed = reply.record.removed ?? [];
  const out = removed.filter((piece) =>
    sent.some((sentence) => sentence.includes(piece)),
  );
  if (out.length === 0) return reply;
  const kept = removed.filter((piece) => !out.includes(piece));
  const model =
    reply.sound.model !== undefined && kept.includes(reply.sound.model)
      ? reply.sound.model
      : undefined;
  const answers = kept.filter((piece) => piece !== reply.sound.model);
  const {
    removed: _removed,
    choices: _choices,
    soundMoved: _moved,
    ...rest
  } = reply.record;
  return {
    ...reply,
    sound: {
      ...(model === undefined ? {} : { model }),
      ...(answers.length === 0 ? {} : { answer: answers.join(" ") }),
    },
    record: {
      ...rest,
      ...(kept.length === 0 ? {} : { removed: kept }),
      ...(answers.length > 0 && reply.record.choices
        ? { choices: true as const }
        : {}),
      ...(kept.length > 0 && reply.record.soundMoved
        ? { soundMoved: true as const }
        : {}),
    },
  };
}

/**
 * 안전 상한 차례의 응답 처리 꼴(검토 I-2): 글을 바꾸지 않았으므로(나간 say 전체가 끝인사) 뺀 문장 · 소리 차례 바뀜 · 고르기 표시를 남기지 않는다.
 * 따라 할 문장 대조(listen)는 say 에 들었으므로 그대로 둔다.
 */
function unchangedOf(reply: ChatReply, say: string): ChatReply {
  const {
    removed: _removed,
    choices: _choices,
    soundMoved: _moved,
    ...rest
  } = reply.record;
  return { ...reply, text: say, sound: {}, record: rest };
}

export type ChatTurnResult = {
  /** 흘림 뒤에 낼 줄(남은 문장 · 뜻 · 소리 줄 — 실패 차례는 대신 줄 · 뜻). 안전 상한 차례는 빈 목록(닫는 줄 하나는 부르는 쪽이 farewell 로 낸다). */
  lines: ChatReplayLine[];
  /** 선생님 행 초안. 안전 상한 차례가 응답 없이(실패 · 끊김) 끝나면 null(지금 길과 같이 선생님 행을 남기지 않음). */
  teacher: ChatTeacherDraft | null;
  /** 안전 상한 차례의 닫는 줄 글(응답이 있으면 나간 say 전체, 없으면 카드 안전 끝인사). 다른 차례에서는 쓰지 않는다. */
  farewell: Line;
  /** 만남(met) 낱말 — 나간 말에서 단원 단어를 찾음(spec 8-1). */
  met: string[];
  /** 받침 단계 · 잇달아 말한 수 · 끝 줄 신호(chatTurnFinishOf). */
  finish: ReturnType<typeof chatTurnFinishOf>;
  /**
   * 흘린 줄과 본체 글이 갈렸다(이미 나간 문장에 본체가 뺀 조각이 있거나, 흘린 줄을 이은 글이 본체 글과 다름 — 검토 M-2). 부르는 쪽이 로그 한 줄을 남겨
   * 켜기 전 관문이 센다.
   */
  diverged: boolean;
};

/**
 * 응답 갈래 하나의 조립:
 * - ok: 응답 처리(chatReplyOf) → 이미 나간 조각 거두기 → 남은 문장(잡아 둔 문장에서 본체가 뺀 조각을 지운 글) · 뜻 · 소리 줄(model · answer).
 *   선생님 행 글은 흘린 줄을 이은 글이다. 안전 상한 차례는 모두 잡아 두었으므로 줄을 내지 않고 say 전체를 끝인사 · 행 글로 둔다(move 에 뺀 조각 없음).
 * - cut(첫 문장 뒤 끊김): 잡아 둔 문장도 글로 내고 문장 문을 지난 문장으로 닫는다. 안전 상한 차례는 아이가 아무것도 보지 않았으므로 응답 없는 차례와
 *   같이 카드 안전 끝인사로 닫고 선생님 행을 남기지 않는다(검토 M-1).
 * - failed: 안전 상한 차례는 카드 안전 끝인사(선생님 행 없음), 수업 첫 말은 카드 인사 첫 줄(spec 설계 5), 그 밖은 지금 실패 규칙(거절은 그 차례의 안전한
 *   대사 — 뜻 함께, 그 밖은 턴 번호로 돌린 안전한 대사 — 뜻은 koMeaning 일 때).
 */
export function chatTurnResultOf({
  plan,
  call,
  flow,
  level,
  koMeaning,
  check,
  card,
  safeLine,
  turnNo,
  sentenceMax,
  prevStage,
  rowsAfter,
  settings,
  lexicon,
}: {
  plan: ChatTurnPlan;
  call: ChatCallResult;
  /** 흘리는 동안 내보낸 문장 · 잡아 둔 문장(createChatSentenceFlow). */
  flow: { sent: readonly string[]; held: readonly string[] };
  level: number;
  koMeaning: boolean;
  check: ChatReplyCheck;
  card: {
    safeLines: readonly { en: string; ko?: string | undefined }[];
    safetyFarewell: { en: string; ko?: string | undefined };
    greeting: Parameters<typeof chatCardGreetingLineOf>[0]["greeting"];
  };
  /** 이 차례의 안전한 대사(문장 문의 첫 걸림 대사 — 거절 차례도 같은 대사). */
  safeLine: string;
  /** 실패 차례 안전한 대사를 돌리는 턴 번호(지금 실패 규칙). */
  turnNo: number;
  /** 그 단계의 선생님 문장 수 상한(teacherSentencesMaxOf — 길이 초과 기록). */
  sentenceMax: number;
  prevStage: number;
  rowsAfter: Parameters<typeof chatTurnFinishOf>[0]["rowsAfter"];
  settings: Parameters<typeof chatTurnFinishOf>[0]["settings"];
  lexicon: Parameters<typeof metWordsIn>[1];
}): ChatTurnResult {
  const finishOf = (wrapUp: boolean, aiResting: boolean) =>
    chatTurnFinishOf({
      plan,
      wrapUp,
      prevStage,
      rowsAfter,
      aiResting,
      settings,
    });
  const moveOf = (
    reply: ChatReply,
    text: string,
    finish: ReturnType<typeof finishOf>,
    gate: readonly string[],
    firstMs: number | null,
  ) =>
    chatTeacherRowMoveOf({
      plan,
      reply,
      text,
      stage: finish.stage,
      run: finish.run,
      gate,
      firstMs,
    });
  const cardFarewell = lineOf(card.safetyFarewell, koMeaning);

  if (call.kind === "ok") {
    const value = call.value;
    const processed = chatReplyOf({
      level,
      output: value,
      appStuck: plan.appStuck,
      closingSlot: plan.closing,
      wrapUpHeldAt: plan.wrapUpHeldAt,
      check,
    });
    const gate = [
      ...call.blocked,
      ...(call.listenBlocked ? [CHAT_LISTEN_BLOCKED_GATE_NAME] : []),
    ];
    const ko = koMeaning ? processed.sayKo.trim() : "";
    const finish = finishOf(processed.wrapUp, false);
    const met = metWordsIn(value.say, lexicon);
    const draft = (reply: ChatReply, text: string): ChatTeacherDraft => ({
      text,
      toriRewrite: call.assistant,
      toriKo: ko === "" ? null : ko,
      overLength: overLengthOf(
        call.overLength,
        call.sentSentences.length,
        sentenceMax,
      ),
      move: moveOf(reply, text, finish, gate, call.firstSentenceMs),
    });
    if (plan.lastTurn) {
      const reply = unchangedOf(processed, value.say);
      return {
        lines: [],
        teacher: draft(reply, value.say),
        farewell: { en: value.say, ...(ko === "" ? {} : { ko }) },
        met,
        finish,
        diverged: false,
      };
    }
    const reply = withoutSent(processed, flow.sent);
    const pieces = reply.record.removed ?? [];
    const rest = strippedOf(flow.held.join(" "), pieces);
    const release = rest === "" ? [] : splitSentences(rest);
    const text = [...flow.sent, ...release].join(" ");
    const lines: ChatReplayLine[] = release.map((en) => ({ t: "s", en }));
    if (ko !== "") lines.push({ t: "ko", ko });
    if (reply.sound.model !== undefined)
      lines.push({ t: "sound", kind: "model", say: reply.sound.model });
    if (reply.sound.answer !== undefined)
      lines.push({ t: "sound", kind: "answer", say: reply.sound.answer });
    return {
      lines,
      teacher: draft(reply, text),
      farewell: { en: text, ...(ko === "" ? {} : { ko }) },
      met,
      finish,
      diverged:
        reply !== processed || wordsOnly(text) !== wordsOnly(processed.text),
    };
  }

  const aiResting =
    call.kind === "failed" && call.reason === CHAT_RESTING_REASON;
  const finish = finishOf(false, aiResting);
  if (plan.lastTurn)
    return {
      lines: [],
      teacher: null,
      farewell: cardFarewell,
      met: [],
      finish,
      diverged: false,
    };

  if (call.kind === "cut") {
    const text = call.sentSentences.join(" ");
    return {
      lines: flow.held.map((en) => ({ t: "s", en })),
      teacher: {
        text,
        toriRewrite: null,
        toriKo: null,
        overLength: overLengthOf(
          call.overLength,
          call.sentSentences.length,
          sentenceMax,
        ),
        move: moveOf(
          chatFallbackReplyOf({ en: text }),
          text,
          finish,
          [],
          call.firstSentenceMs,
        ),
      },
      farewell: { en: text },
      met: metWordsIn(text, lexicon),
      finish,
      diverged: false,
    };
  }

  let line: Line;
  if (plan.input.kind === "start")
    line = lineOf(chatCardGreetingLineOf(card), koMeaning);
  else if (call.reason === REFUSAL_REASON)
    line = lineOf(
      card.safeLines.find((l) => l.en === safeLine) ?? { en: safeLine },
      true,
    );
  else {
    const en = safeLineOf(card.safeLines, turnNo);
    line = lineOf(card.safeLines.find((l) => l.en === en) ?? { en }, koMeaning);
  }
  const lines: ChatReplayLine[] = [{ t: "s", en: line.en }];
  if (line.ko !== undefined) lines.push({ t: "ko", ko: line.ko });
  return {
    lines,
    teacher: {
      text: line.en,
      toriRewrite: null,
      toriKo: line.ko ?? null,
      overLength: false,
      move: moveOf(chatFallbackReplyOf(line), line.en, finish, [], null),
    },
    farewell: cardFarewell,
    met: metWordsIn(line.en, lexicon),
    finish,
    diverged: false,
  };
}
