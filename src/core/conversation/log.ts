// 회화 대화 기록 고르기(회화 plan 묶음 10 · 정본 03 4절 '대화 기록' · '인식 확인 · 아이 말풍선' 행 · 3.3 소리 줄 · 요청자 결정 T2 · C119 · C164).
// 인사 · 대화 토막(더 이야기하기 포함)의 말풍선 칸이 대화 기록 칸이다. 남기는 것: 화면에 글로 나온 선생님 말(영어와 1~4단계 한국어 뜻, 앱이 붙인
// 카드 질문 · 받침 줄 · 마무리 물음 · 쉼 · 닫기 대사)과 아이가 보낸 말 · '잘 모르겠어요' · 회색 '못 들었어요'. 남기지 않는 것: 1~3단계 소리 줄
// (따라 할 말 · 선택지 · 받침의 답) · 소리로만 준 답 예시 · 연 힌트 글 · 앱 맞장구 · '다시 말하기'로 버린 글 · 그림. 짧은 준비 · 정리 토막에는
// 기록 칸이 없다. 입력은 서버 화면 자료(TalkLessonView.log — 묶음 9 lessonLogOf)와 같은 꼴이고, 살아 있는 턴은 지금 말풍선 줄에서 만든다.
// 자유 대화 (나)가 같은 고르기를 다시 쓴다(C120). 화면 · 서버가 함께 쓰는 순수 모듈이다(서버 모듈을 가져오지 않는다).
// fix 1(검토 M-1): 기록 줄은 앱이 붙인 줄인지(app)를 남기고, 지난 말 다시 읽기(talkLogReplayOf)는 문장마다 나눠 읽기 줄에 넣는다(C125 문장 사이
// 쉼, 붙인 줄은 감시 기록 w card).
import { TALK_CUE_LINE_KIND } from "@/core/conversation/cue-line";
import { splitSentences } from "@/core/seed/text";

/** 기록 칸이 있는 토막(정본 03 4절 — 인사 · 대화 · 더 이야기하기). */
export const TALK_LOG_SEGMENTS = ["greeting", "talk", "more_talk"] as const;

/** 화면 자료의 선생님 화면 글 한 줄(서버 TalkLessonLogLine 과 같은 꼴). */
export type TalkLogSourceLine = { en: string; ko?: string; app: boolean };

/** 화면 자료의 기록 행(서버 TalkLessonLogRow 와 같은 꼴 — 구조로 받는다). */
export type TalkLogSourceRow =
  | {
      speaker: "teacher";
      turnNo: number;
      segment: string;
      lines: readonly TalkLogSourceLine[];
    }
  | {
      speaker: "child";
      turnNo: number;
      segment: string;
      text: string | null;
      input: "speech" | "dont_know";
      nospeech: boolean;
    };

/** 아이 말풍선에 남는 것: 인식 글 · '잘 모르겠어요' · 회색 '못 들었어요'. */
export type ChildSaid =
  | { kind: "speech"; text: string }
  | { kind: "dont_know" }
  | { kind: "not_heard" };

/** 기록 칸 선생님 쪽 한 줄: 화면 글 · 뜻(1~4단계) · 앱이 붙인 줄인가(카드 질문 · 받침 줄 · 마무리 물음 · 넘어가는 말). */
export type TalkLogLine = { en: string; ko?: string; app: boolean };

/** 기록 칸 한 줄. key 는 그리기 열쇠이자 살아 있는 턴을 두 번 넣지 않는 열쇠다. */
export type TalkLogEntry =
  | {
      who: "teacher";
      key: string;
      turnNo: number;
      lines: TalkLogLine[];
    }
  | { who: "child"; key: string; turnNo: number; said: ChildSaid };

/** 보낸 아이 입력 → 남길 말(빈 인식 글은 없음). '모름'은 말소리 없음 출처면 '못 들었어요', 단추면 '잘 모르겠어요'. */
export function childSaidOfInput(input: {
  mode: "speech" | "dont_know";
  text?: string | null | undefined;
  nospeech?: boolean | undefined;
}): ChildSaid | null {
  if (input.mode === "dont_know")
    return input.nospeech === true
      ? { kind: "not_heard" }
      : { kind: "dont_know" };
  const text = input.text?.trim() ?? "";
  return text === "" ? null : { kind: "speech", text };
}

function keyOf(who: TalkLogEntry["who"], turnNo: number): string {
  return `${who}:${turnNo}`;
}

function lineOf(
  en: string,
  ko: string | undefined,
  koMeaning: boolean,
  app: boolean,
): TalkLogLine {
  const k = koMeaning ? ko?.trim() : undefined;
  return k ? { en, ko: k, app } : { en, app };
}

/**
 * 화면 자료 → 기록 칸 줄(이어 하기 때 talk_turns 로 다시 그리기, AI 없음). 기록 칸 토막의 행만, 글이 빈 선생님 줄 · 빈 인식 글은 빼고,
 * 뜻은 koMeaning(1~4단계)일 때만 둔다. 선생님 행 text 에는 화면 글 줄만 있으므로(plan 정한 것 5) 소리 줄은 이 입력에 없다(T2).
 */
export function talkLogOf(
  rows: readonly TalkLogSourceRow[],
  { koMeaning }: { koMeaning: boolean },
): TalkLogEntry[] {
  const out: TalkLogEntry[] = [];
  const seen = new Map<string, number>();
  const uniqueKey = (base: string) => {
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}#${n}`;
  };
  for (const row of rows) {
    if (!(TALK_LOG_SEGMENTS as readonly string[]).includes(row.segment))
      continue;
    if (row.speaker === "teacher") {
      const lines = row.lines
        .filter((l) => l.en.trim() !== "")
        .map((l) => lineOf(l.en.trim(), l.ko, koMeaning, l.app));
      if (lines.length === 0) continue;
      out.push({
        who: "teacher",
        key: uniqueKey(keyOf("teacher", row.turnNo)),
        turnNo: row.turnNo,
        lines,
      });
      continue;
    }
    const said = childSaidOfInput({
      mode: row.input,
      text: row.text,
      nospeech: row.nospeech,
    });
    if (!said) continue;
    out.push({
      who: "child",
      key: uniqueKey(keyOf("child", row.turnNo)),
      turnNo: row.turnNo,
      said,
    });
  }
  return out;
}

/** 살아 있는 말풍선 줄(화면이 받은 새 꼴 줄 가운데 말풍선에 쌓는 것 — tori.tsx LessonBubbleLine 과 같은 꼴). */
export type LiveBubbleLine =
  | { t: "s"; en: string }
  | { t: "add"; kind: string; en: string; ko?: string }
  | { t: "sound"; kind: "model" | "answer"; say: string }
  | { t: "sound"; kind: "choices"; answers: readonly [string, string] };

/**
 * 지금 선생님 말풍선 → 기록 줄(다음 턴으로 넘어갈 때 틀이 기록에 더한다). 선생님 문장은 한 줄로 잇고 뜻(ko)을 붙이며, 붙인 화면 글 줄은 줄마다
 * 뜻과 함께 둔다. 소리 줄과 1~3단계 신호 말(add · kind cue — 지금 턴 말풍선에만, 'AI 몫 넓힘' spec 설계 6 기록 행 · AC-6 (가))은 넣지 않는다
 * (T2 · 지난 턴 다시 읽기에서 소리 줄 없이 신호 말만 읽히지 않게). 글 줄이 하나도 없으면 null.
 */
export function liveTeacherEntryOf({
  turnNo,
  content,
  koMeaning,
}: {
  turnNo: number;
  /** 지금 말풍선(tori.tsx LessonBubbleContent 를 그대로 넘긴다 — done 은 보지 않는다). */
  content: {
    lines: readonly LiveBubbleLine[];
    ko?: string | undefined;
    done?: boolean;
  };
  koMeaning: boolean;
}): TalkLogEntry | null {
  const sentences = content.lines
    .flatMap((l) => (l.t === "s" ? [l.en.trim()] : []))
    .filter((en) => en !== "");
  const lines: TalkLogLine[] = [];
  if (sentences.length > 0)
    lines.push(lineOf(sentences.join(" "), content.ko, koMeaning, false));
  for (const l of content.lines)
    if (l.t === "add" && l.kind !== TALK_CUE_LINE_KIND && l.en.trim() !== "")
      lines.push(lineOf(l.en.trim(), l.ko, koMeaning, true));
  if (lines.length === 0) return null;
  return { who: "teacher", key: keyOf("teacher", turnNo), turnNo, lines };
}

/** 보낸 아이 입력 → 기록 줄(바로 보낸 1~3단계 턴도 같다). 남길 말이 없으면 null. */
export function childLogEntryOf(
  turnNo: number,
  input: Parameters<typeof childSaidOfInput>[0],
): TalkLogEntry | null {
  const said = childSaidOfInput(input);
  return said
    ? { who: "child", key: keyOf("child", turnNo), turnNo, said }
    : null;
}

/** 기록에 한 줄 더하기(같은 열쇠가 이미 있으면 그대로 — 다시 흘림 · 같은 시도 id 다시 보내기). */
export function talkLogAppend(
  entries: readonly TalkLogEntry[],
  entry: TalkLogEntry | null,
): readonly TalkLogEntry[] {
  if (!entry || entries.some((e) => e.key === entry.key)) return entries;
  return [...entries, entry];
}

/** 다시 읽기 한 항목(tori.tsx SpeakItem 과 같은 꼴 — 선생님 문장 tori · 앱이 붙인 줄 card). */
export type TalkLogReplayItem = { text: string; w: "tori" | "card" };

/**
 * 지난 선생님 말을 누를 때 읽을 차례(순수, 정본 03 4절 '지난 턴은 그 말만' · C125 · 정한 것 10): 줄마다 문장으로 나눠 읽기 줄의 항목으로
 * 넣어 문장 사이 쉼(speech.sentence_pause_ms)이 들게 하고, 앱이 붙인 줄은 card 로 적는다. 소리 줄은 기록에 없으므로 다시 들려주지 않는다.
 */
export function talkLogReplayOf(
  entry: Extract<TalkLogEntry, { who: "teacher" }>,
): TalkLogReplayItem[] {
  return entry.lines.flatMap((line) =>
    splitSentences(line.en).map((text) => ({
      text,
      w: line.app ? ("card" as const) : ("tori" as const),
    })),
  );
}
