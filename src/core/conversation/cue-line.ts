// 회화 1~3단계 신호 말('AI 몫 넓힘' spec 판 4 설계 6 · 13절 C207 · 정본 02-2 212줄, plan 정한 것 6 · 7). 신호 말은 소리 줄 앞에 앱이 붙이는
// 한 줄이다(AI 가 쓰지 않음 — AI 가 쓴 신호 말 문장은 문장 문이 지운다). 자리는 그 선생님 행 move(받침 단계 · 앞 아이 차례의 까닭 · 소리 줄)로,
// 몇 번째인지는 지난 선생님 행 move 로 다시 센다(저장하지 않음 — 같은 시도 id 다시 흘림 · 대본 도구가 같은 줄을 낸다).
// 순수 모듈이다. 서버 턴 길(lesson-turn)과 대본 도구(talk-observe)가 같이 부른다.

import {
  TALK_SUPPORT_STAGE_EASY,
  TALK_SUPPORT_STAGE_MAX,
  TALK_SUPPORT_STAGE_TOGETHER,
  type TalkMove,
} from "@/core/conversation/move";
import { normalizeSpoken } from "@/core/conversation/spoken";
import { bandOf } from "@/core/level-band";
import type {
  TalkCueLinesFile,
  TalkListLine,
} from "@/core/seed/schema/reference";
import {
  LEVEL_MIN,
  type TALK_CUE_BANDS,
  type TALK_CUE_PLACES,
  TALK_LOW_BAND,
} from "@/core/seed/structure";

/** 신호 말 자리: 꺼내기 · 같이 말하기(받침 첫째) · 고르기(선택지). */
export type CuePlace = (typeof TALK_CUE_PLACES)[number];
/** 신호 말 목록의 단계 구간 열쇠(1단계 · 2~3단계). */
export type CueBand = (typeof TALK_CUE_BANDS)[number];
/** 흘림 줄의 add 꼴 kind(화면은 이 줄을 보이고 읽는다 — 기록 · talk_turns 원문 · 다시 쓸 차례에는 넣지 않는다, spec 설계 6 기록 행). */
export const TALK_CUE_LINE_KIND = "cue";

/**
 * AI 가 쓴 소리 줄 신호 말을 알아보는 신호 구('Listen and say!' · 'Let's say it together.' 꼴, 3.3 소리 줄 · 6.1 고정부 예). 정규화한 글에
 * 낱말 경계로 들면 신호 말이다. 시드 신호 말 목록의 줄은 문장 전체가 같을 때만 신호 말로 본다(seedCuePhrasesOf — 'Together!' 같은 짧은
 * 꼴이 'We play together!' 를 지우지 않게).
 */
export const CUE_PHRASES: readonly string[] = [
  "listen and say",
  "listen and repeat",
  "repeat after me",
  "say it with me",
  "say it together",
  "say after me",
].map(normalizeSpoken);

/** 시드 신호 말 목록의 모든 줄(정규화 글, 겹침 없음). */
export function seedCuePhrasesOf(file: TalkCueLinesFile): string[] {
  const out = new Set<string>();
  for (const bands of Object.values(file))
    for (const forms of Object.values(bands))
      for (const line of [...forms.long, ...forms.short]) {
        const n = normalizeSpoken(line.en);
        if (n !== "") out.add(n);
      }
  return [...out];
}

/**
 * 시드 신호 말 꼴 앞뒤에 붙어도 신호 말로 보는 낱말(맞장구 · 이어 주는 말 — 정규화 글, 줄임꼴은 펼친 꼴. 영어 낱말 목록이라 코드 상수다).
 * 'Now it's your turn!' · 'Pick one, okay?' · 'Okay, say it!' 이 신호 말이고, 'I can say it!' · 'Can you try?' · 'Come with me!' 는 아니다(검토 rev-2 M-2).
 */
export const CUE_FILLER_WORDS: ReadonlySet<string> = new Set([
  "now",
  "okay",
  "ok",
  "so",
  "then",
  "it",
  "is",
  "oh",
  "hey",
  "yay",
  "alright",
  "right",
  "and",
]);

/** 문장 안 이름(첫 낱말이 아닌 대문자 낱말 — 'Your turn, Mina!' 의 부르는 말). 정규화 글 낱말 꼴. */
function namesIn(sentence: string): Set<string> {
  const words = sentence.match(/[A-Za-z][A-Za-z']*/g) ?? [];
  return new Set(
    words
      .slice(1)
      .filter((w) => /^[A-Z][a-z]/.test(w))
      .map((w) => normalizeSpoken(w)),
  );
}

/** 낱말 둘 이상인 시드 꼴이 문장 앞 · 끝에 오고 나머지 낱말이 모두 맞장구 · 이어 주는 말 · 이름인가. */
function edgeCue(
  normalized: string,
  seed: string,
  names: Set<string>,
): boolean {
  if (!seed.includes(" ")) return false;
  const filler = (rest: string) =>
    rest
      .split(" ")
      .filter((w) => w !== "")
      .every((w) => CUE_FILLER_WORDS.has(w) || names.has(w));
  if (normalized.startsWith(`${seed} `))
    return filler(normalized.slice(seed.length + 1));
  if (normalized.endsWith(` ${seed}`))
    return filler(normalized.slice(0, normalized.length - seed.length - 1));
  return false;
}

/**
 * 소리 줄 신호 말인가: 정규화한 글에 신호 구(CUE_PHRASES)가 낱말 경계로 들거나, 정규화한 문장 전체가 시드 신호 말 줄(seedCuePhrasesOf 꼴) 하나와
 * 같거나, 낱말 둘 이상인 시드 꼴이 문장 앞 · 끝에 오고 나머지가 맞장구 · 이어 주는 말 · 이름뿐이다(정본 06:221 '시드 신호 말 목록과 같은 꼴의
 * 신호 구'). 낱말 하나 꼴('Together!')은 문장 전체가 같을 때만이다('We play together!' 를 지우지 않게).
 */
export function isSoundCue(
  sentence: string,
  seedCues: readonly string[] = [],
): boolean {
  const n = normalizeSpoken(sentence);
  if (n === "") return false;
  const padded = ` ${n} `;
  if (CUE_PHRASES.some((p) => p !== "" && padded.includes(` ${p} `)))
    return true;
  if (seedCues.includes(n)) return true;
  const names = namesIn(sentence);
  return seedCues.some((p) => edgeCue(n, p, names));
}

/** 신호 말 구간(1단계 '1' · 2~3단계 '2-3'). 4단계부터는 신호 말이 없다(null). */
export function cueBandOf(level: number): CueBand | null {
  if (bandOf(level) !== TALK_LOW_BAND) return null;
  return level === LEVEL_MIN ? "1" : "2-3";
}

/**
 * 그 선생님 행의 신호 말 자리(spec 설계 6 자리 행 · AC-6 (가)): 소리 줄이 있는 차례만이다. 선택지 둘이 있으면 고르기, 받침 첫째(같이 말하기)에
 * 답 소리 · 따라 할 말이 있으면 같이 말하기, 그 밖의 따라 할 말은 꺼내기다. 받침 셋째(닫기) · 들리지 않음 · 소리 줄 없는 차례는 없다(C204 (5)).
 * 1~3단계 행에만 쓴다(부르는 쪽이 cueBandOf 로 가른다).
 */
export function cuePlaceOf(
  move: Pick<TalkMove, "stage" | "cause" | "sound"> | null | undefined,
): CuePlace | null {
  const sound = move?.sound;
  if (!move || !sound) return null;
  if (move.stage >= TALK_SUPPORT_STAGE_MAX || move.cause === "nospeech")
    return null;
  if (sound.choices !== undefined) return "choices";
  if (move.stage === TALK_SUPPORT_STAGE_TOGETHER)
    return sound.answer !== undefined || sound.model !== undefined
      ? "together"
      : null;
  return sound.model !== undefined ? "introduce" : null;
}

/**
 * 1~3단계 소리 줄을 남기는 자리(13절 C205 · spec 판 4 설계 4 표 '남기는 차례' — 판정 r1 I-5): 따라 할 말은 받침 첫째 · 셋째 · 들리지 않음과
 * 새 단어를 꺼내는 차례(갈래 introduce)만, 선택지는 받침 둘째와 1단계(고르기 단계)의 꺼내기 · 필수 질문 차례만, 답 소리는 받침 첫째 · 셋째 ·
 * 들리지 않음만이다. 필수 질문 · 이어 묻기 차례의 따라 할 말은 '꺼낼 새 단어'를 담아도 자리 밖이다(질문 바로 뒤 답이 들림). 회화 턴
 * 정규화(서버 · 대본 도구)와 대본 지표(talk-metrics soundOutsideOf)가 이 함수 하나를 쓴다.
 */
export function soundLinePlacesOf({
  stage,
  nospeech,
  next,
  choicesLevel,
}: {
  /** 그 차례의 받침 단계(0 없음). */
  stage: number;
  /** 들리지 않음 차례인가. */
  nospeech: boolean;
  /** 그 차례 다음 질문의 갈래(move.next · 정규화한 next_move). */
  next: TalkMove["next"] | undefined;
  /** 고르기 꼴 단계인가(단계 규격 choices — 1단계). */
  choicesLevel: boolean;
}): { model: boolean; choices: boolean; answer: boolean } {
  const close =
    stage === TALK_SUPPORT_STAGE_TOGETHER ||
    stage >= TALK_SUPPORT_STAGE_MAX ||
    nospeech;
  const introduce = next === "introduce";
  return {
    model: close || introduce,
    choices:
      stage === TALK_SUPPORT_STAGE_EASY ||
      (choicesLevel && (introduce || next === "required")),
    answer: close,
  };
}

/** 이 대화에서 그 자리 신호 말이 앞서 몇 번 붙었나(지난 선생님 행 move 로 다시 센다 — 0 이면 그 자리의 첫 신호 말). */
export function cueOrdinalOf(
  prior: readonly (Pick<TalkMove, "stage" | "cause" | "sound"> | null)[],
  place: CuePlace,
): number {
  return prior.filter((m) => cuePlaceOf(m) === place).length;
}

/** 목록을 at 번째부터 한 바퀴 돌린 차례(빈 목록은 빈 목록). */
function rotate(list: readonly TalkListLine[], at: number): TalkListLine[] {
  const n = list.length;
  if (n === 0) return [];
  const start = ((Math.trunc(at) % n) + n) % n;
  return list.map((_, i) => list[(start + i) % n] as TalkListLine);
}

/**
 * 신호 말 한 줄 고르기(spec 설계 6 여러 꼴 행): 그 자리의 첫 신호 말(ordinal 0)은 긴 꼴, 뒤는 짧은 꼴을 차례로 돌린다. 긴 꼴이 여럿이면
 * 그 행의 선생님 차례 순번(turn — 대화의 몇 번째 선생님 행인가)으로 돌려 대화마다 첫 신호 말이 달라지게 한다(묶음 3 이 긴 꼴을 둘로 늘린 뜻,
 * 설계 검토 des-3 M-2). 바로 앞 신호 말과 같은 줄(정규화 글)은 건너뛰고 다음 꼴을 쓴다. 고를 줄이 없으면(목록이 비었거나 모두 바로 앞과 같음)
 * null — 신호 말 없이 소리 줄만 읽는다.
 */
export function cueLineOf({
  lines,
  ordinal,
  previous,
  turn = 0,
}: {
  lines: { long: readonly TalkListLine[]; short: readonly TalkListLine[] };
  ordinal: number;
  previous: string | null;
  /** 그 행이 대화의 몇 번째 선생님 행인가(0부터 — 첫 신호 말의 긴 꼴 돌림). */
  turn?: number;
}): TalkListLine | null {
  const long = rotate(lines.long, turn);
  const rotated = rotate(lines.short, Math.max(0, ordinal - 1));
  const order = ordinal === 0 ? [...long, ...rotated] : [...rotated, ...long];
  const last = previous === null ? null : normalizeSpoken(previous);
  return order.find((line) => normalizeSpoken(line.en) !== last) ?? null;
}

/**
 * 한 대화의 선생님 행 차례대로 신호 말을 다시 고른다(저장하지 않는 신호 말을 같은 시도 id 다시 흘림 · 대본 도구가 같은 줄로 내게, plan 정한 것 6).
 * moves 는 그 대화의 선생님 행 move 차례(옛 행은 null). 돌려준 목록의 i 번째가 moves[i] 행의 신호 말이다(자리가 없으면 null).
 */
export function cueLinesOfMoves({
  moves,
  band,
  file,
}: {
  moves: readonly (Pick<TalkMove, "stage" | "cause" | "sound"> | null)[];
  band: CueBand;
  file: TalkCueLinesFile;
}): (TalkListLine | null)[] {
  const counts = new Map<CuePlace, number>();
  let previous: string | null = null;
  return moves.map((move, turn) => {
    const place = cuePlaceOf(move);
    if (place === null) return null;
    const ordinal = counts.get(place) ?? 0;
    counts.set(place, ordinal + 1);
    const lines = file[place]?.[band];
    if (!lines) return null;
    const line = cueLineOf({ lines, ordinal, previous, turn });
    if (line !== null) previous = line.en;
    return line;
  });
}

/** 마지막 행(지금 차례)의 신호 말 — cueLinesOfMoves 의 끝 값. */
export function cueLineForTurn(args: {
  prior: readonly (Pick<TalkMove, "stage" | "cause" | "sound"> | null)[];
  move: Pick<TalkMove, "stage" | "cause" | "sound">;
  band: CueBand;
  file: TalkCueLinesFile;
}): TalkListLine | null {
  return (
    cueLinesOfMoves({
      moves: [...args.prior, args.move],
      band: args.band,
      file: args.file,
    }).at(-1) ?? null
  );
}
