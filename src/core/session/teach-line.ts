// 가르치는 수업 자리 조각의 순수 함수(가르치고 배우는 수업 plan 묶음 라-1 · spec 설계 5 · 10 · 15절 AC-N20). DB · 화면 · 음성 접점 없음.
// - 선생님 줄 단추 상태: 선생님 말 화면(오늘 배울 것 · 보여 주기 · '왜')의 단추는 읽어 주기가 끝나면 밝아진다. 감시가 넘긴 들려주지 못함이면
//   읽기를 멈추고 단추를 밝히며 '소리가 안 나와서 글로 봐요.'를 띄운다. ko-KR 목소리가 없거나 speech.read_ko 끔(skipped)이면 글로만 보이고
//   단추가 바로 밝으며 안내가 없다(마-1 검토 M3). 저절로 넘어가지는 않는다. 들림은 pace speakHeardOutcomeOf 로만 본다(0-라).
// - 이야기 들려주기 셈: 저절로 한 번 · '다시 듣기' 한 번. 소리 없이 넘어간 들려주기는 횟수에 세지 않는다(설계 10 · C179 (2)).
// - 칩: 문장에서 칩 글 자리를 나누고, 선생님 한 줄에 칩 이름이 나오는 차례 · 자리로 켜질 때를 정한다(표본 R3 '말에 맞춰 칩이 켜진다').
// - 띠: 같이 해 보기 글에서 띠 칠 말(highlight)을 나눈다.
import type { SpeechSettings } from "@/core/speech/listen";
import { type SpokenOutcome, speakHeardOutcomeOf } from "@/core/speech/pace";
import type { SpeakSkipReason } from "@/core/teacher/voice";

/**
 * 위 띠 자리 이름(spec 설계 5 '정본 밖 문구' 표 '위 띠 자리 이름', plan 정한 것 16). 진행 막대 이름(core/session/progress.ts)은 묶음 라-2 가
 * 이 표를 가리키게 바꾼다. 되짚기는 결과 화면 첫머리라 위 띠 이름이 없다.
 */
export const TEACH_SLOT_NAME = {
  today: "오늘 배울 것",
  show: "살펴보기",
  together: "같이 해 보기",
  solo: "혼자 해 보기",
  spare: "스스로 해 보기",
} as const;

/** 선생님 줄 한 토막을 읽은 결과(음성 접점 SpeakOutcome 과 같은 갈래). skipped 는 한국어 줄을 읽지 않음(마-1). */
export type TeachLineResult =
  | SpokenOutcome
  | { kind: "skipped"; reason: SpeakSkipReason };

/** 단추 밝음 · 안내 줄 · 다음에 읽을 토막 번호(없으면 그만 읽음). */
export type TeachLineState = {
  bright: boolean;
  notice: boolean;
  next: number | undefined;
};

/** 들려주지 못함인가(skipped 는 소리를 낼 차례가 아니었으니 아님). */
function soundless(result: TeachLineResult): boolean {
  return (
    result.kind !== "skipped" && speakHeardOutcomeOf(result) === "not_played"
  );
}

/**
 * 선생님 줄(토막 total 개 — 예: 한국어 줄 → 영어 토막)의 지금 상태. results 는 지금까지 읽은 토막의 결과(차례대로).
 * - 들려주지 못함이 하나라도 있으면: 멈춤 · 밝음 · 안내.
 * - 다른 읽기가 끊으면(cancelled): 그 줄은 끝 · 밝음 · 안내 없음(아이가 다른 소리를 골랐다).
 * - 다 읽었으면: 밝음.
 * - 아직이면: 다음 토막을 읽고, 읽지 않은 한국어 줄(skipped)이 있으면 그때부터 밝음.
 */
export function teachLineStateOf(
  total: number,
  results: readonly TeachLineResult[],
): TeachLineState {
  if (results.some(soundless))
    return { bright: true, notice: true, next: undefined };
  if (results.some((r) => r.kind === "cancelled") || results.length >= total)
    return { bright: true, notice: false, next: undefined };
  return {
    bright: results.some((r) => r.kind === "skipped"),
    notice: false,
    next: results.length,
  };
}

/** 이야기 '다시 듣기' 횟수(spec 설계 5 '저절로 한 번 · 다시 듣기 한 번', 표본 S11 · S14). */
export const STORY_REPLAYS = 1;

/** 이야기 화면 상태: 들었나 · 다시 들었나(시도 꼴 story.replayed) · '다시 듣기'가 남았나 · '다음'이 밝은가. */
export type StoryPlays = {
  heard: boolean;
  replayed: boolean;
  replayLeft: boolean;
  nextBright: boolean;
};

/**
 * 이야기 들려주기 셈(results 는 들려줄 때마다의 결과, playing 은 지금 들려주는 중). 소리가 난 들려주기만 세어 처음 한 번 +
 * STORY_REPLAYS 번까지 듣는다. '다시 듣기'는 저절로 들려주기가 끝난 뒤부터이고, 소리 없이 넘어간 것은 세지 않으므로 살아 있다. '다음'은 한 번이라도 들려주기가 끝난 뒤
 * 밝다(소리 없이 넘어가도 — 막다른 화면이 없게, 그 답은 부르는 쪽이 기술 오류 U 로 적는다).
 */
export function storyPlaysOf(
  results: readonly TeachLineResult[],
  playing: boolean,
): StoryPlays {
  const heardPlays = results.filter((r) => !soundless(r)).length;
  return {
    heard: heardPlays >= 1,
    replayed: heardPlays >= 2,
    replayLeft:
      !playing && results.length >= 1 && heardPlays < 1 + STORY_REPLAYS,
    nextBright: !playing && results.length >= 1,
  };
}

const ESCAPE = /[.*+?^${}()|[\]\\]/g;
const escapeRegExp = (text: string) => text.replace(ESCAPE, "\\$&");
const LATIN = /[A-Za-z]/;
/**
 * 낱말 경계로 찾는 꼴: 글이 로마자로 시작하면 앞이, 로마자로 끝나면 뒤가 로마자가 아니어야 한다('This' 안의 'is' 는 아님). 마침표 '.' ·
 * 한글 이름은 경계 없이 찾는다.
 */
function wordPattern(text: string, flags: string): RegExp {
  const before = LATIN.test(text.at(0) ?? "") ? "(?<![A-Za-z])" : "";
  const after = LATIN.test(text.at(-1) ?? "") ? "(?![A-Za-z])" : "";
  return new RegExp(`${before}${escapeRegExp(text)}${after}`, flags);
}

/** 문장 조각 하나. at 은 문장 안 시작 자리(그림 열쇠), chip 은 그 조각이 몇째 칩인가(칩이 아니면 undefined). */
export type ChipSegment = {
  at: number;
  text: string;
  chip: number | undefined;
};

/**
 * 문장을 칩 자리로 나눈다(칩 글을 앞에서부터 차례로, 낱말 경계 · 대소문자 무시 — 'They' 칩과 'No, they …'). 조각 글은 문장의 글자 그대로다.
 * 칩 글 하나라도 차례대로 찾지 못하면 undefined(조각이 문장과 칩 줄을 따로 그린다).
 */
export function chipSegmentsOf(
  sentence: string,
  chips: readonly { text: string }[],
): ChipSegment[] | undefined {
  const segments: ChipSegment[] = [];
  let at = 0;
  for (const [index, chip] of chips.entries()) {
    if (chip.text === "") return undefined;
    const pattern = wordPattern(chip.text, "gi");
    pattern.lastIndex = at;
    const found = pattern.exec(sentence)?.index ?? -1;
    if (found < 0) return undefined;
    if (found > at)
      segments.push({ at, text: sentence.slice(at, found), chip: undefined });
    segments.push({
      at: found,
      text: sentence.slice(found, found + chip.text.length),
      chip: index,
    });
    at = found + chip.text.length;
  }
  if (at < sentence.length)
    segments.push({ at, text: sentence.slice(at), chip: undefined });
  return segments;
}

/**
 * 칩마다 켜질 때(선생님 한 줄에서 그 칩 이름이 처음 나오는 자리 ÷ 줄 길이, 0~1). 이름이 줄에 없는 칩은 1(줄 끝에 켜짐).
 * nameOf 는 칩 role → 화면 이름(정본 밖 문구 표).
 */
export function chipLightOf(
  chips: readonly { role: string }[],
  lineKo: string,
  nameOf: (role: string) => string,
): number[] {
  return chips.map((chip) => {
    const at = lineKo.search(wordPattern(nameOf(chip.role), ""));
    return at < 0 || lineKo.length === 0 ? 1 : at / lineKo.length;
  });
}

/** 칩마다 켜졌나. progress 는 한 줄을 읽은 몫(0~1), 읽기 전이면 undefined, 끝났거나 읽지 않으면 "done"(모두 켬). */
export function chipsLitOf(
  marks: readonly number[],
  progress: number | "done" | undefined,
): boolean[] {
  return marks.map((mark) =>
    progress === undefined ? false : progress === "done" || mark <= progress,
  );
}

const MS_PER_SECOND = 1000;

/**
 * 선생님 한국어 줄을 읽은 몫(0~1). 시작 알림 시각부터 지난 시간을 글 길이 ÷ (speech.speak_chars_per_second_ko × speech.rate_ko) 로
 * 나눈다(감시 상한과 같은 셈 — 넉넉히 느린 값이라 칩은 말보다 조금 늦게 켜질 수 있고, 줄이 끝나면 모두 켜진다). 시작 전이면 undefined.
 */
export function lineProgressOf({
  text,
  startedAt,
  now,
  speech,
}: {
  text: string;
  startedAt: number | undefined;
  now: number;
  speech: Pick<SpeechSettings, "speakCharsPerSecondKo" | "rateKo">;
}): number | undefined {
  if (startedAt === undefined) return undefined;
  const lineMs =
    (text.length / (speech.speakCharsPerSecondKo * speech.rateKo)) *
    MS_PER_SECOND;
  if (lineMs <= 0) return 1;
  return Math.min(1, Math.max(0, (now - startedAt) / lineMs));
}

/** 띠 조각 하나(at 은 글 안 시작 자리 — 그림 열쇠). */
export type HighlightSegment = { at: number; text: string; marked: boolean };

/** 글에서 띠 칠 말(로마자 낱말 경계, 대소문자 그대로)을 모두 찾아 나눈다. 겹치는 자리는 하나로 합친다. */
export function highlightSegmentsOf(
  text: string,
  highlight: readonly string[],
): HighlightSegment[] {
  const ranges: [number, number][] = [];
  for (const phrase of highlight) {
    if (phrase === "") continue;
    for (const match of text.matchAll(wordPattern(phrase, "g")))
      ranges.push([match.index, match.index + phrase.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of ranges) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  const segments: HighlightSegment[] = [];
  let at = 0;
  for (const [start, end] of merged) {
    if (start > at)
      segments.push({ at, text: text.slice(at, start), marked: false });
    segments.push({ at: start, text: text.slice(start, end), marked: true });
    at = end;
  }
  if (at < text.length || segments.length === 0)
    segments.push({ at, text: text.slice(at), marked: false });
  return segments;
}
