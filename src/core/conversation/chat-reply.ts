// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 4 · 5 · 9 · 데이터 move 행, plan 묶음 P2)의 응답 처리.
// 대화 호출 응답(talk-chat.ts TalkChatOutput)을 화면 글 · 소리 줄 · 뜻 줄 · 선생님 행 move 로 옮긴다. 글을 바꾸는 것은 셋뿐이다(FR-4):
// (가) 1~3단계에서 say 에 문장째 든 따라 할 문장(listen_sentence)을 글에서 빼 소리 줄로, (나) 앱이 아는 막힘 뒤의 or 물음 문장을 글에서 빼 소리
// 줄로(lead-low-band 의 함수를 그대로 씀), (다) say_ko 의 영어 문장 거르기. listen_sentence 어긋남 · 수준 검사 · 지어낸 경험 꼴 검사는 기록만
// 하고(C242 — 고정 규칙으로 대화를 고치지 않음), 인사 · 첫 말 · 돌아옴 차례의 wrap_up 참은 거짓으로 다루고 그 자리를 기록한다.
// 입력의 say 는 문장 문(안전 검사)을 지난 글, listen_sentence 는 6.4 출력 검사를 지난 글이다 — 6.4 가 비운 따라 할 문장은 빼지 않는다(코드 검토
// rev-chat-p1 H2). 검사를 언제 부르는지는 서버(묶음 S0 · S1)의 몫이다. 순수 모듈이다(DB · SDK · 시각 없음, 설정값은 인자로 받는다).
import type { TalkChatOutput } from "@/core/ai/calls/talk-chat";
import { isLowBandLevel } from "@/core/ai/calls/talk-lesson";
import type { ChatFact, ChatInput } from "@/core/conversation/chat-message";
import {
  type LeadWideInput,
  leadWideCheckOf,
} from "@/core/conversation/lead-level";
import {
  leadKoLineOf,
  leadLowBandShownOf,
} from "@/core/conversation/lead-low-band";
import { leadChoicesOf } from "@/core/conversation/lead-record";
import { madeUpHit } from "@/core/conversation/made-up";
import {
  readTalkMove,
  type TalkChat,
  type TalkChatWrapHeld,
  type TalkMove,
  type TalkMoveKind,
  talkMoveOf,
} from "@/core/conversation/move";
import { normalizeSpoken } from "@/core/conversation/spoken";
import { isQuestionSentence } from "@/core/conversation/stream";
import { splitSentences } from "@/core/seed/text";

// ── 따라 할 문장 대조(정규화 · 글자 그대로의 조각) ──────────────────────

/** 낱말 글자(정규화 뒤 낱말이 되는 글자 · {NAME} 자리의 괄호). 조각의 앞뒤를 자를 때 쓴다. */
const WORD_EDGE = /[\p{L}\p{N}{}]/u;
/** 문장 끝 부호(조각 끝에 붙여 둔다 — 소리 줄 문장과 글 빼기의 문장 경계가 이것으로 맞는다). */
const SENTENCE_END = /[.!?]/;

/** say 를 띄어쓰기로 나눈 덩이와 그 덩이의 정규화 낱말. 줄임꼴은 덩이 안에서 펼친다('I'm' → i am). */
type Chunk = { start: number; end: number; words: string[] };

function chunksOf(text: string): Chunk[] {
  const out: Chunk[] = [];
  for (const m of text.matchAll(/\S+/g)) {
    const normalized = normalizeSpoken(m[0]);
    out.push({
      start: m.index,
      end: m.index + m[0].length,
      words: normalized === "" ? [] : normalized.split(" "),
    });
  }
  return out;
}

/** 덩이들[from..to] 의 글자 그대로 조각: 앞의 따옴표 · 괄호를 떼고, 끝은 마지막 낱말 글자 뒤에 바로 붙은 문장 끝 부호까지. */
function literalOf(text: string, from: Chunk, to: Chunk): string {
  let start = from.start;
  while (start < from.end && !WORD_EDGE.test(text.charAt(start))) start++;
  let end = to.end;
  while (end > to.start && !WORD_EDGE.test(text.charAt(end - 1))) end--;
  while (end < to.end && SENTENCE_END.test(text.charAt(end))) end++;
  return text.slice(start, end);
}

/**
 * say 안에서 따라 할 문장과 정규화(소문자 · 문장 부호 · 축약형 펼침 — normalizeSpoken)로 같은 자리의 글자 그대로 조각들(같은 조각은 한 번).
 * 자리는 띄어쓰기 덩이의 경계에 맞아야 한다('I like cats' 는 'I like catsup' 의 앞이 아니다). 차례는 문장 끝 부호로 끝나는 조각이 먼저이고 그
 * 안에서는 앞에서부터다 — 앞 문장 일부의 부호 없는 조각('I like cats and dogs.' 의 'I like cats')보다 뒤의 온전한 문장('I like cats.')을 먼저
 * 보게 한다(검토 rev-chat-p2 M-2). 문장 경계에 맞는지는 글 빼기(lead-low-band)가 본다.
 */
function listenLiteralsOf(say: string, listen: string): string[] {
  const target = normalizeSpoken(listen);
  if (target === "") return [];
  const want = target.split(" ");
  const chunks = chunksOf(say);
  const flat: { chunk: number; first: boolean; last: boolean; word: string }[] =
    [];
  chunks.forEach((chunk, i) => {
    chunk.words.forEach((word, j) => {
      flat.push({
        chunk: i,
        first: j === 0,
        last: j === chunk.words.length - 1,
        word,
      });
    });
  });
  const out: string[] = [];
  for (let i = 0; i + want.length <= flat.length; i++) {
    const head = flat[i];
    const tail = flat[i + want.length - 1];
    if (head === undefined || tail === undefined) break;
    if (!head.first || !tail.last) continue;
    if (!want.every((w, k) => flat[i + k]?.word === w)) continue;
    const from = chunks[head.chunk];
    const to = chunks[tail.chunk];
    if (from === undefined || to === undefined) continue;
    const literal = literalOf(say, from, to);
    if (literal !== "" && !out.includes(literal)) out.push(literal);
  }
  const ends = (literal: string) =>
    SENTENCE_END.test(literal.charAt(literal.length - 1)) ? 0 : 1;
  return out.sort((a, b) => ends(a) - ends(b));
}

/**
 * 글 빼기(lead-low-band leadLowBandShownOf)가 그 조각을 문장 경계에서 실제로 빼는가 — 본체(chatReplyOf)와 흘림 중 판단(chatListenLiteralOf)이 같은
 * 판정을 쓰게 하는 한 자리. 1~3단계에서만 참일 수 있다(4단계부터는 글 빼기가 아무것도 빼지 않는다).
 */
function listenRemovable(
  level: number,
  text: string,
  literal: string,
): boolean {
  return (
    leadLowBandShownOf({
      level,
      move: "model_repeat",
      say: text,
      modelSentence: literal,
      prevStuck: false,
      closing: true,
    }).model?.removed === true
  );
}

/**
 * 흘려 받는 동안 글 한 조각(문장 하나 등)을 글로 내보내지 않고 잡아 둘지 정하는 판단(서버 턴 길, 묶음 S0 · S1): 본체(chatReplyOf)가 같은 글에서
 * 따라 할 문장을 글에서 빼 소리 줄로 낼 조각이면 그 글자 그대로의 조각을, 아니면 null 을 돌려준다. 판정은 본체와 같다(listenRemovable) — 정규화로
 * 들었어도 문장 경계 밖(문장 일부 · 끝 부호 없는 글 끝)이라 본체가 글에 남기는 조각은 null 이다. 따라 할 문장이 빈 글(없음 · 6.4 가 비움)이거나
 * 4단계부터(본체가 빼지 않음)도 null 이다. 같은 글에서 이 값이 null 이 아님 ⟺ 본체의 move.chat.listen.inSay 참이고, 그 조각은 본체의
 * 소리 줄 model 과 같다(빼낸 or 물음 자리가 품은 때는 소리 줄이 answer 하나다).
 */
export function chatListenLiteralOf(
  text: string,
  listen: string,
  level: number,
): string | null {
  if (!isLowBandLevel(level)) return null;
  return (
    listenLiteralsOf(text, listen).find((literal) =>
      listenRemovable(level, text, literal),
    ) ?? null
  );
}

// ── wrap_up 을 거짓으로 다룰 자리(spec 설계 5) ─────────────────────────

/**
 * 이 선생님 차례에서 응답의 wrap_up 참을 거짓으로 다룰 자리: 수업 첫 말(입구 start) · 짧은 준비 뒤 돌아옴(입구 back) · 인사 토막의 차례.
 * 그 밖(대화 · 더 이야기하기)은 null 이다. greeting 은 이 차례가 인사 토막 안인지(서버가 위치로 안다).
 */
export function chatWrapUpHeldAtOf({
  input,
  greeting,
}: {
  input: ChatInput["kind"];
  greeting: boolean;
}): TalkChatWrapHeld | null {
  if (input === "start") return "start";
  if (input === "back") return "back";
  return greeting ? "greeting" : null;
}

// ── 응답 처리 ─────────────────────────────────────────────────────

/**
 * 기록 전용 검사의 재료(spec 설계 4). 수준 검사는 지금 넓은 검사(lead-level leadWideCheckOf)에 문장 수 자(sentenceMax)와 물음 수 자
 * (questionMax)를 더해 센다 — 두 자는 안내문 글의 'one or two short sentences' · 'At most one question' 과 같은 수를 부르는 쪽이 넘긴다(설계 2,
 * 미결 8). 지어낸 경험 꼴 목록은 시드 목록(seedTalkMadeUpPhrases, 끝맺음 끝인사 검사와 같은 목록)이다.
 */
export type ChatReplyCheck = Pick<LeadWideInput, "range" | "extra"> & {
  sentenceMax: number;
  questionMax: number;
  madeUpPhrases: readonly string[];
};

export type ChatReplyInput = {
  /** 회화 단계(1~12). 글 빼기 · 뜻 줄 거르기는 1~3단계에서만 한다. */
  level: number;
  /** 응답: say 는 문장 문을 지난 글(안전 대사로 바뀐 문장 포함), listen_sentence 는 6.4 출력 검사를 지난 글(걸렸으면 빈 글). */
  output: TalkChatOutput;
  /** 바로 앞 아이 차례가 앱이 아는 막힘인가(묶음 P3 chatAppStuckOf — 이 모듈은 판단하지 않는다). */
  appStuck: boolean;
  /** 앱의 마무리 차례(참고 턴 · 한 바퀴 끝). */
  closingSlot: boolean;
  /** wrap_up 참을 거짓으로 다룰 자리(chatWrapUpHeldAtOf), 아니면 null. */
  wrapUpHeldAt: TalkChatWrapHeld | null;
  check: ChatReplyCheck;
};

/** 응답 처리가 정하는 move.chat 칸(나머지 칸은 서버가 채운다 — ChatMoveExtra). */
export type ChatReplyRecord = Pick<
  TalkChat,
  | "listen"
  | "choices"
  | "removed"
  | "soundMoved"
  | "soundAt"
  | "level"
  | "madeUp"
  | "wrapUpHeld"
>;

export type ChatReply = {
  /** 말풍선 글(1~3단계에서 소리 줄로 뺀 문장 밖). 선생님 행 text. */
  text: string;
  /** 뜻 줄(1~3단계는 영어 문장 거르개를 지난 글). 선생님 행 tori_ko. */
  sayKo: string;
  /** 소리 줄(글 없는 듣기 단추): model 은 say 에 든 따라 할 문장, answer 는 막힌 뒤 고르기 물음(둘 이상이면 이은 한 줄). */
  sound: { model?: string; answer?: string };
  /** 처리한 wrap_up(거짓으로 다룬 자리면 거짓). 차례 끝 갈래(chatTurnEndOf)에 넘긴다. */
  wrapUp: boolean;
  record: ChatReplyRecord;
};

/** 기록 전용 수준 검사 수치: 지금 넓은 검사 + 물음 수 · 물음 수 자 넘음(참 · 거짓은 1 · 0). */
function levelRecordOf(say: string, check: ChatReplyCheck): TalkChat["level"] {
  const wide = leadWideCheckOf(say, {
    range: check.range,
    extra: check.extra,
    sentenceMax: check.sentenceMax,
  });
  const questions = splitSentences(say).filter((s) =>
    isQuestionSentence(s),
  ).length;
  return {
    ...wide,
    questions,
    overQuestionMax: questions > check.questionMax ? 1 : 0,
  };
}

/** 지어낸 경험 꼴에 걸린 문장마다 걸린 꼴(기록 전용 — 문장을 고치지 않는다). */
function madeUpRecordOf(say: string, phrases: readonly string[]): string[] {
  const out: string[] = [];
  for (const sentence of splitSentences(say)) {
    const hit = madeUpHit(sentence, phrases);
    if (hit !== null) out.push(hit);
  }
  return out;
}

/**
 * 응답 하나의 처리(spec 설계 4 표 · 설계 5):
 * - 따라 할 문장: 비지 않았고 say 에 정규화로 문장째 들면(1~3단계는 글 빼기가 문장 경계에서 뺄 수 있을 때) 맞음, 아니면 어긋남. 1~3단계에서
 *   맞으면 그 글자 그대로의 조각을 글에서 빼 소리 줄 model 로 낸다. 어긋나면 글을 바꾸지 않는다. 정규화로는 들었으나 문장 경계 밖이라 글에 남은
 *   차례(문장 일부 · 끝 부호 없는 글 끝)는 listen.partial 표지로 따로 센다(검토 rev-chat-p2 M-1). 빼낸 or 물음 자리가 따라 할 문장의 조각을 품으면
 *   소리 줄은 그 자리 하나(answer)이고 model 로 겹쳐 내지 않는다(M-3).
 * - 고르기 물음: 바로 앞 아이 차례가 앱이 아는 막힘이면 or 물음 문장을 글에서 빼 소리 줄 answer 로(마무리 차례 · wrap_up 차례는 빼지 않음 —
 *   lead-record leadChoicesOf 와 lead-low-band leadLowBandShownOf 를 그대로 부른다).
 * - 뜻 줄: 1~3단계 영어 문장 거르개(leadKoLineOf).
 * - wrap_up: 거짓으로 다룰 자리면 거짓이고 참이었으면 그 자리를 기록한다.
 * - 수준 검사 · 지어낸 경험 꼴: say 전체에 걸어 기록만 한다.
 */
export function chatReplyOf(input: ChatReplyInput): ChatReply {
  const { level, output, appStuck, closingSlot, wrapUpHeldAt, check } = input;
  const say = output.say;
  const wrapUp = output.wrap_up && wrapUpHeldAt === null;
  const closing = closingSlot || wrapUp;
  const listen = output.listen_sentence.trim();
  const literals = listenLiteralsOf(say, listen);

  // 첫 조각 · 같은 문장의 다른 글자 조각(줄임꼴 · 대소문자)과 고르기 물음을 한 번에 뺀다(move model_repeat 는 leadChoicesOf 에서 '앞 차례 막힘일
  // 때만 고르기'와 같은 판정이다). 자리는 모두 say 위에서 정한다 — 소리 줄의 제자리를 잃지 않게(13절 C241 보완 7)
  const first = leadLowBandShownOf({
    level,
    move: "model_repeat",
    say,
    modelSentence: literals[0] ?? "",
    prevStuck: appStuck,
    closing,
    moreModels: literals.slice(1),
  });
  const text = first.text;
  const removed = [...first.removed];
  const listenRemoved: string[] = [
    ...(first.model?.removed === true ? [first.model.sentence] : []),
    ...first.moreRemoved,
  ];
  const soundMoved = first.soundMoved;

  // 이야기 방식은 1~3단계에서만 열린다(spec 설계 1). 4단계부터는 글 빼기가 문장 경계를 보지 않고 아무것도 빼지 않으므로, inSay 는 정규화로 든
  // 것만 본다(문장 일부 꼴도 참). 1~3단계와 같은 판정으로 맞추려면 lead-low-band 의 문장 경계 판정을 고치거나 베껴야 해서 두었다(검토 M-4).
  const low = first.model !== null;
  const inSay = low ? listenRemoved.length > 0 : literals.length > 0;
  const partial = low && literals.length > 0 && !inSay;
  const choices = leadChoicesOf({
    move: "model_repeat",
    say,
    prevStuck: appStuck,
    closing,
  });
  // 소리 줄: 따라 할 문장 조각과 글자째 같은 빼낸 자리는 model(글자는 첫 조각 — 흘림 판단 chatListenLiteralOf 가 잡는 조각과 같다. 같은 문장이
  // 두 자리면 소리 줄은 마지막 자리 하나에서 읽는다 — C241 보완 7, chat-turn-result), 나머지 자리(or 물음 — 따라 할 문장을 품은 자리 포함)는 answer
  const model = removed.find((r) => listenRemoved.includes(r));
  const answers = removed.filter((r) => !listenRemoved.includes(r));
  const record: ChatReplyRecord = {
    ...(listen === ""
      ? {}
      : {
          listen: {
            sentence: listen,
            inSay,
            ...(partial ? { partial: true as const } : {}),
          },
        }),
    ...(choices ? { choices: true as const } : {}),
    ...(removed.length === 0 ? {} : { removed }),
    ...(soundMoved ? { soundMoved: true as const } : {}),
    level: levelRecordOf(say, check),
    madeUp: madeUpRecordOf(say, check.madeUpPhrases),
    ...(output.wrap_up && wrapUpHeldAt !== null
      ? { wrapUpHeld: wrapUpHeldAt }
      : {}),
  };
  return {
    text,
    sayKo: leadKoLineOf(level, output.say_ko),
    sound: {
      ...(model === undefined ? {} : { model }),
      ...(answers.length === 0 ? {} : { answer: answers.join(" ") }),
    },
    wrapUp,
    record,
  };
}

// ── 선생님 행 move(spec 데이터 move 행) ─────────────────────────────

/** 서버 턴 길(묶음 S1)이 채우는 move.chat 칸: 문장 문 걸림 · 붙인 사실 줄 · 조용함으로 연 차례 · 잇달아 말한 수 · 첫 문장 시간 · 막힌 뒤 설명. */
export type ChatMoveExtra = Pick<
  TalkChat,
  "gate" | "quiet" | "run" | "firstMs" | "explain"
> & { facts: readonly ChatFact["kind"][] };

/**
 * 이야기 방식 선생님 행의 move(spec 데이터 move 행): kind(앱의 마무리 차례 closing_slot · 대화 토막 첫 선생님 행 first_question · 그 밖 ai) ·
 * next(처리한 wrap_up 이 참이면 closing — 마무리 제안 길) · ai(막힌 뒤 고르기면 choices) · sound(소리 줄) · stage(받침 단계) 를 채우고 chat
 * 묶음을 더한다. 받침 단계는 판단하지 않고 받은 값(묶음 P3 chatSupportStageOf)을 적기만 하며, 지금 새 방식(lead-record leadTeacherMoveOf)과
 * 같이 kind ai 행에만 적는다(마무리 자리 · 대화 첫 선생님 행은 0). 1 · 2 이면 받침 행(chances isSupportMove)이 되어 위치 되짚기가 자리 막힘 수를
 * 잇는다. 카드 항목 · 노린 단어 · 까닭은 채우지 않는다(이 방식에 카드 질문과 응답의 갈래 칸이 없다).
 */
export function chatTeacherMoveOf({
  reply,
  closingSlot,
  firstQuestion,
  stage,
  extra,
}: {
  reply: ChatReply;
  closingSlot: boolean;
  firstQuestion: boolean;
  /** 받침 단계(0 없음 · 1 같이 말하기 · 2 쉬운 질문 · 3 닫기 — chatSupportStageOf 의 값). */
  stage: number;
  extra: ChatMoveExtra;
}): TalkMove {
  const { facts, ...rest } = extra;
  const chat: TalkChat = { ...reply.record, ...rest, facts: [...facts] };
  if (chat.gate === undefined) delete chat.gate;
  if (chat.quiet === undefined) delete chat.quiet;
  if (chat.firstMs === undefined) delete chat.firstMs;
  if (chat.explain === undefined) delete chat.explain;
  const hasSound =
    reply.sound.model !== undefined || reply.sound.answer !== undefined;
  const kind: TalkMoveKind = closingSlot
    ? "closing_slot"
    : firstQuestion
      ? "first_question"
      : "ai";
  return talkMoveOf({
    kind,
    next: reply.wrapUp ? "closing" : "none",
    stage: kind === "ai" ? stage : 0,
    ai: reply.record.choices === true ? "choices" : "none",
    ...(hasSound ? { sound: { ...reply.sound } } : {}),
    chat,
  });
}

// ── 정리 되짚을 말의 출처(spec 설계 5 정리) ───────────────────────────

/**
 * 정리 토막 되짚을 말의 문장 출처: 이 수업에서 say 에 든 것으로 확인된 따라 할 문장(move.chat.listen 이 맞음인 선생님 행)을 차례대로 돌려준다.
 * 부르는 쪽(정리 · 쉬는 중 닫기)이 wrapUpLinesOf 의 recasts 자리에 넘기고, 모자라면 지금 고르기대로 카드 정리 대사로 간다(lead-record
 * leadWrapSourcesOf 와 같은 꼴). 어긋난 문장 · chat 칸 없는 행 · move 없는 행은 뺀다.
 */
export function chatWrapSourcesOf(
  rows: readonly { move?: unknown }[],
): string[] {
  const out: string[] = [];
  for (const row of rows) {
    const listen = readTalkMove(row.move)?.chat?.listen;
    if (listen?.inSay === true && listen.sentence.trim() !== "")
      out.push(listen.sentence);
  }
  return out;
}
