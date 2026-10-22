// 회화 듣기 끝 규칙 · 인식 확인 · 이름 묻기 턴 가림(7절 '듣기를 끝내는 때' · '인식 결과 확인' · 4절 인식 확인 행 · 6.1 이름 가림 ·
// C7 · C23 · C37, plan-p13a 파일별 값 11). P2a endRuleFor 는 고치지 않는다(말하기 · 배치가 회화 키 없이 돈다). 순수 모듈이다.
import { z } from "zod";
import { BANDS, type Band, bandOf } from "@/core/level-band";
import { PLACEHOLDER_NAME } from "@/core/seed/structure";
import type { EndRule, SpeechSettings } from "@/core/speech/listen";
import {
  bestMatchRate,
  NAME_SLOT,
  normalizeForMatch,
} from "@/core/speech/match-rate";

/** 회화 대화에서 두세 문장으로 답하는 턴이 시작되는 단계(3.3 단계표 8단계 · 7절 · C37 — 화면 구조 수, 12절 키가 아니다). */
export const TALK_LONG_ANSWER_FROM_LEVEL = 8;
/** 토리의 말을 천천히 읽는 마지막 단계(3.3 · 4절 '1~2단계는 천천히 읽는다' — 화면 구조 수, 빠르기 값은 12절 speech.slow_rate). */
export const TALK_SLOW_READ_UNTIL_LEVEL = 2;
const MS_PER_SECOND = 1000;

export type TalkSpeechSettings = {
  /** speech.end_silence_seconds.talk.<구간>(ms). */
  endSilenceMs: Readonly<Record<Band, number>>;
  /** speech.end_silence_seconds.talk_long(ms). */
  longSilenceMs: number;
  /** talk.max_answer_seconds(ms). */
  maxAnswerMs: number;
  /** speech.slow_rate — 1~2단계 읽어 주기 빠르기(Web Speech rate, C96). */
  slowRate: number;
};

const talkSilenceKey = (band: Band) =>
  `speech.end_silence_seconds.talk.${band}`;
const LONG_KEY = "speech.end_silence_seconds.talk_long";
const MAX_ANSWER_KEY = "talk.max_answer_seconds";
const SLOW_RATE_KEY = "speech.slow_rate";

function positive(read: (key: string) => unknown, key: string): number {
  const parsed = z.number().positive().safeParse(read(key));
  if (!parsed.success)
    throw new Error(`회화 음성 설정 '${key}' 가 없거나 꼴이 틀렸다`);
  return parsed.data;
}

function seconds(read: (key: string) => unknown, key: string): number {
  return positive(read, key) * MS_PER_SECOND;
}

/** 회화 듣기 설정. 키가 하나라도 없거나 0 이하이면 던진다. */
export function talkSpeechSettingsFrom(
  read: (key: string) => unknown,
): TalkSpeechSettings {
  return {
    endSilenceMs: Object.fromEntries(
      BANDS.map((band) => [band, seconds(read, talkSilenceKey(band))]),
    ) as Record<Band, number>,
    longSilenceMs: seconds(read, LONG_KEY),
    maxAnswerMs: seconds(read, MAX_ANSWER_KEY),
    slowRate: positive(read, SLOW_RATE_KEY),
  };
}

/** 그 단계 회화의 읽어 주기 빠르기: 1~2단계는 speech.slow_rate, 그 밖은 undefined(브라우저 기본 빠르기 — 읽어 주기에 넘기지 않음). */
export function talkSpeakRateOf(
  level: number,
  talk: Pick<TalkSpeechSettings, "slowRate">,
): number | undefined {
  return level <= TALK_SLOW_READ_UNTIL_LEVEL ? talk.slowRate : undefined;
}

/**
 * 회화 듣기 끝 규칙(7절 · C7 · C37): 따라 말하기(오늘 쓸 말 · 말해 보기 · 정리 · 한 번 더) · 평가 대화 · 1~7단계 대화는 한 문장 답 —
 * 구간의 회화 조용함 · speech.max_listen_seconds. 8단계부터 대화는 talk_long 조용함 · 말하기 단추('다 말했어요') ·
 * talk.max_answer_seconds 이고 speech.max_listen_seconds 마다 끊어 듣는다.
 */
export function talkEndRuleFor(
  { level, mode }: { level: number; mode: "dialogue" | "follow" | "test" },
  speech: Pick<SpeechSettings, "maxListenMs">,
  talk: TalkSpeechSettings,
): EndRule {
  if (mode === "dialogue" && level >= TALK_LONG_ANSWER_FROM_LEVEL)
    return {
      endSilenceMs: talk.longSilenceMs,
      capMs: talk.maxAnswerMs,
      chunkMs: speech.maxListenMs,
    };
  return {
    endSilenceMs: talk.endSilenceMs[bandOf(level)],
    capMs: speech.maxListenMs,
    chunkMs: speech.maxListenMs,
  };
}

/** 견줄 낱말이 있는 틀만({NAME} 하나뿐인 힌트는 견주지 않는다). */
function comparable(text: string): boolean {
  return normalizeForMatch(text, []).some((w) => w !== NAME_SLOT);
}

/**
 * 인식 확인(4절 · C23): 1~3단계는 인식 글이 그 턴에 연 영어 문장 힌트나 들려준 답과 talk.hint_read_match 이상 맞으면({NAME} 자리 뺌)
 * 바로 보냄, 연 힌트 · 들은 답과 맞지 않으면 talk.confirm_seconds 보이며 '다시 말하기'를 크게. 연 힌트 · 들은 답이 없거나 4단계부터는
 * talk.confirm_seconds 보이고 두 단추 같은 크기.
 */
export function confirmPlanOf({
  lowLevel,
  heard,
  openedSentence,
  heardAnswers,
  matchPass,
  homophones,
  confirmMs,
}: {
  /** 1~3단계 꼴(카드 턴). */
  lowLevel: boolean;
  heard: string;
  openedSentence?: string;
  heardAnswers?: readonly string[];
  matchPass: number;
  homophones: readonly (readonly string[])[];
  confirmMs: number;
}): { autoSend: boolean; bigRetry: boolean; waitMs: number } {
  const refs = [
    ...(openedSentence === undefined ? [] : [openedSentence]),
    ...(heardAnswers ?? []),
  ];
  if (!lowLevel || refs.length === 0)
    return { autoSend: false, bigRetry: false, waitMs: confirmMs };
  const usable = refs.filter(comparable);
  const rate =
    usable.length === 0
      ? 0
      : bestMatchRate(usable, heard, { homophones, nameSlot: "excluded" });
  return rate >= matchPass
    ? { autoSend: true, bigRetry: false, waitMs: 0 }
    : { autoSend: false, bigRetry: true, waitMs: confirmMs };
}

type Piece = { word: string; tokens: string[] };

function piecesOf(text: string): Piece[] {
  return text
    .split(/\s+/)
    .filter((w) => w !== "")
    .map((word) => ({ word, tokens: normalizeForMatch(word, []) }));
}

function indexOfSequence(
  haystack: readonly string[],
  needle: readonly string[],
  from: number,
): number {
  for (let i = from; i + needle.length <= haystack.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return i;
  }
  return -1;
}

/** 낱말 앞뒤 문장 부호(이름 자리를 바꿀 때 남긴다). */
const LEADING_PUNCTUATION = /^[^A-Za-z0-9{]*/;
const TRAILING_PUNCTUATION = /[^A-Za-z0-9}]*$/;

/**
 * 이름 묻기 턴 가림(6.1 · AC-16b): 그 턴의 영어 문장 힌트 · 답 두 개 · 답 예시 가운데 {NAME} 을 든 틀과 인식 글을 맞대어
 * {NAME} 자리에 온 낱말을 {NAME} 하나로 바꾼다. 틀의 앞 낱말 · 뒤 낱말이 인식 글에 차례대로 있고 그 사이(뒤 낱말이 없으면 끝까지)에
 * 낱말이 있을 때만이고, 맞는 틀이 없으면 그대로 둔다. 낱말 경계에 맞지 않는 자리는 바꾸지 않는다.
 */
export function maskNameAnswer(
  heard: string,
  { templates }: { templates: readonly string[] },
): string {
  const pieces = piecesOf(heard);
  // 낱말 토큰 → 인식 글 낱말 차례
  const owner: number[] = [];
  const flat: string[] = [];
  pieces.forEach((piece, i) => {
    for (const token of piece.tokens) {
      flat.push(token);
      owner.push(i);
    }
  });
  const startsPiece = (t: number) => t === 0 || owner[t] !== owner[t - 1];
  const endsPiece = (t: number) =>
    t === flat.length || owner[t] !== owner[t - 1];
  for (const template of templates) {
    if (!template.includes(PLACEHOLDER_NAME)) continue;
    const tokens = normalizeForMatch(template, []);
    const slot = tokens.indexOf(NAME_SLOT);
    if (slot < 0) continue;
    const before = tokens.slice(0, slot);
    const after = tokens.slice(slot + 1);
    const at = indexOfSequence(flat, before, 0);
    if (at < 0) continue;
    const start = at + before.length;
    if (!startsPiece(start) || start >= flat.length) continue;
    const end =
      after.length === 0
        ? flat.length
        : indexOfSequence(flat, after, start + 1);
    if (end < 0 || end <= start || !endsPiece(end)) continue;
    const first = owner[start] as number;
    const last = owner[end - 1] as number;
    const head = LEADING_PUNCTUATION.exec(pieces[first]?.word ?? "")?.[0] ?? "";
    const tail = TRAILING_PUNCTUATION.exec(pieces[last]?.word ?? "")?.[0] ?? "";
    return [
      ...pieces.slice(0, first).map((p) => p.word),
      `${head}${PLACEHOLDER_NAME}${tail}`,
      ...pieces.slice(last + 1).map((p) => p.word),
    ].join(" ");
  }
  return heard;
}
