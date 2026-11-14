"use client";

// 선생님 말풍선(plan-p13b 파일별 값 8, 4절 회화 세션 '선생님 차례' 행 · 3.3 · 7절 · C32 · C96 · C103 · 검토 I-3). 선생님 그림은 회화 틀의
// 선생님 창(src/components/teacher/teacher-window.tsx — 선생님 화면 plan 값 13)이 맡는다. ToriBubble: 받은 차례대로 문장이 흘러나오듯 보이고(TYPE_MS_PER_CHAR,
// 움직임 줄이기면 바로), 1~4단계 뜻은 영어가 다 흐른 뒤 아래에 한 번에(20px), 붙인 카드 질문은 같은 말풍선 끝에. 1~3단계 아이가 말할
// 영어(답 예시 say · 답 두 개 answers)는 읽어 주기만 하고 글로 보이지 않는다 — 1단계 처음 묻는 턴 · 인사 턴은 글 없는 듣기 단추 둘(원 안 1 · 2).
// 말풍선을 누르면 그 말을 다시 읽는다(답 두 개까지, AC-15l). 기다리는 동안 점 셋(data-wait-hint) → ui.wait_hint_seconds 둘째 값 뒤
// '[이름](이/가) 생각하고 있어요'(data-wait-line). 설명(explanation)은 말풍선 아래 글로만(읽지 않음). 녹음 없음.
// 이름 자리 글은 문구 표(src/core/teacher/name.ts — 선생님 화면 plan 값 9)이고 부르는 쪽이 세션 선생님 이름(teacherName)을 넘긴다.
// 불편 1차 묶음(13절 C166 · UX 검토 3판 U5-11): ①② 듣기 단추가 처음 뜰 때 '번호를 누르면 답을 들려줘요' 한 줄. 프로필마다 한 번이고 처음 회화
// 안내 · '막히면 눌러요'와 같이 profiles.notices_seen(talk_answer_tip)에 남긴다(UI · UX 묶음 0-다 · R-29 — 틀이 보일지를 넘기고 본 뒤 기록).
// 회화 plan 묶음 10(정본 03 4절 '선생님 차례' 행 · 3.3 소리 줄 · 7절 읽어 주기 · '들려주지 못함' 행 · C125 · C166 R1 · 정한 것 10 · 20): 새 꼴 줄
// (s · ko · add · sound)을 받은 차례대로 쌓는 LessonToriBubble. 1~3단계 소리 줄(따라 할 말 · 선택지 · 받침의 답)은 글로 보이지 않고 말풍선 아래
// 글 없는 듣기 단추(따라 할 말 하나 · 선택지 ①②)로 그 줄만 다시 읽는다. 1단계 선택지 둘 사이에는 'Or'. 말풍선을 누르면 지금 턴을 소리 줄까지
// 다시 읽는다. 보낸 뒤 talk.wait_line_seconds 안에 첫 문장이 없으면 맞장구 한 줄을 선생님 목소리로 읽고(useWaitLine — 읽기 줄에 먼저 넣으니
// 첫 문장은 그 뒤), 맞장구는 말풍선 글 · 기록에 넣지 않는다. 읽기 줄은 줄마다 무엇을 읽었는지(w)를 받아 감시가 끝낸 발화를 알린다(onSpoken).
import { Volume2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import { FOCUS_RING } from "@/components/board/board";
import { SilentModeNote } from "@/components/conversation/silent-mode-note";
import {
  SOUND_RETRY_TEXT,
  type SoundRetryStep,
} from "@/components/session/sound-retry";
import { fillName } from "@/core/ai/mask";
import type { PictureInfo } from "@/core/answer/display";
import type { ClientSpeakEntry } from "@/core/conversation/client-listen";
import {
  createSleeper,
  pauseLeftMs,
  speakHeardOutcomeOf,
} from "@/core/speech/pace";
import { TEACHER_TEXT } from "@/core/teacher/name";
import type { SpeakOutcome, SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";

/** 이름 자리 없는 말풍선 글(이름 자리 글은 TEACHER_TEXT). */
export const BUBBLE_TEXT = {
  answer: (n: number) => `${n === 1 ? "첫째" : "둘째"} 답 듣기`,
  /** 따라 할 말 · 받침의 답 글 없는 듣기 단추(plan 문구 표 — 정본 밖 문구). */
  model: "따라 할 말 듣기",
  /** 새 엔진 1~3단계 막힌 뒤 고르기 물음의 글 없는 듣기 단추(정본 밖 문구 — 화면 검토 M-1, 묶음 S5). */
  ask: "물어본 말 듣기",
  /** ①② 한 번 안내(U5-11 — 정본 밖 문구). */
  answerTip: "번호를 누르면 답을 들려줘요",
  /**
   * 선생님 문장 · 붙인 줄을 들려주지 못했을 때 말풍선 아래 한 줄(정본 07 34줄 '소리가 안 나와서 글로 봐요' — 세 영역 수업의 선생님 줄과 같은
   * 글이지만 회화 쪽 문구로 둔다, 묶음 10 재검토 N-3).
   */
  soundless: "소리가 안 나와서 글로 봐요.",
} as const;

/**
 * ①② 안내를 이 턴 말풍선에 보일까(순수 함수, R-29): 프로필이 아직 보지 않았고(notices_seen), 이 회화에서 안내한 턴이 아직 없거나 그 턴일 때.
 * 말풍선은 답 두 개(①②)가 있을 때만 그리므로 처음 ①② 가 뜬 턴이 안내한 턴이 되고, 그 말풍선이 있는 동안은 그대로 둔다.
 */
export function answerTipShownOf({
  seen,
  tipTurn,
  turn,
}: {
  seen: boolean;
  tipTurn: number | null;
  turn: number;
}): boolean {
  if (seen) return false;
  return tipTurn === null || tipTurn === turn;
}

/** 한 글자가 흘러나오는 간격(ms, 화면 꼴 값). */
export const TYPE_MS_PER_CHAR = 30;
/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;
/** 생각 중 점 수 · 점마다 늦춤(화면 꼴 값). */
const DOTS = [0, 1, 2] as const;
const DOT_DELAY_MS = 150;
/** 그림 턴 그림 한 변(px, 화면 꼴 값 — 단어 그림보다 크게, C32). */
const TURN_PICTURE_PX = 240;
/** 답 두 개 사이에 읽는 말(3.3 'I'm nine.' · 'Or' · 'I'm ten.' — a TWO_ANSWERS_JOINER 와 같은 글, 단위 시험이 견준다). */
export const ANSWERS_JOINER = "Or";
/** 답 두 개를 읽는 한 줄(회화 턴 규격 모듈을 화면 묶음에 끌어오지 않게 여기 둔다). */
export function answersLine(pair: readonly [string, string]): string {
  return `${pair[0]} ${ANSWERS_JOINER} ${pair[1]}`;
}

/** 말풍선 상한 폭(px, 화면 꼴 값 — 목업 B_Talk1 의 480~520). 글이 짧으면 글 길이만큼(화면 검토 M-3). */
export const TORI_BUBBLE_MAX_PX = 520;
/** 위 상한을 글자 그대로(Tailwind 는 소스 글을 훑어 클래스를 만든다 — 템플릿 글로 만들지 않는다, 단위 시험이 같은 수인지 본다). */
export const BUBBLE_WIDTH = "w-fit max-w-[520px]";

/** 그림 턴 그림을 그릴까: 파일이 있고 깨지지 않았을 때만(깨지면 자리도 접는다 — 화면 검토 I-2). */
export function turnPictureShown(
  picture: PictureInfo | undefined,
  broken: boolean,
): picture is PictureInfo & { src: string } {
  return picture?.src !== undefined && !broken;
}

/** 그림 턴 그림(꾸밈 — alt 비움). 파일을 못 열면 그리지 않는다(P11 SafePicture 와 같은 깨짐 확인). */
function TurnPicture({ picture }: { picture: PictureInfo }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
    if (!picture.src) return;
    const probe = new window.Image();
    probe.onerror = () => setBroken(true);
    probe.src = picture.src;
    return () => {
      probe.onerror = null;
    };
  }, [picture.src]);
  if (!turnPictureShown(picture, broken)) return null;
  return (
    <Image
      data-turn-picture=""
      src={picture.src}
      // 꾸밈 그림 — 그림 키의 낱말(아이가 말할 영어)을 대체 글로 내지 않는다(C32 · T2 · 검토 M-4)
      alt=""
      width={TURN_PICTURE_PX}
      height={TURN_PICTURE_PX}
      unoptimized
      onError={() => setBroken(true)}
      className="size-60 shrink-0 object-contain"
    />
  );
}

/** 토리 말풍선 꼴(단추 · 기다림 칸 · 대화 기록 칸의 지난 말이 같이 쓴다 — 목업 B_Talk1 연두 옅은 바탕 · 먹색 테). */
export const BUBBLE_CLASS =
  "flex flex-col gap-2 rounded-[4px_18px_18px_18px] border-[3px] border-ink bg-[color-mix(in_srgb,var(--color-postit-talk)_30%,var(--color-paper))] px-5 py-4 text-ink";

/** 답 두 개 단추 표(글 없는 번호). */
/** 답 두 개 듣기 단추의 차례 숫자(보드 글꼴 Fredoka 숫자를 원 테 안에 — 동그라미 숫자 글자는 Jua 에 없어 대체 글꼴로 떨어짐, 전체 디자인 리뷰 M-5). */
const ANSWER_MARKS = [1, 2] as const;

/** 움직임 줄이기(prefers-reduced-motion). 렌더 뒤에 읽는다(말풍선 흘림 · 선생님 창 표시가 같이 쓴다). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const on = () => setReduced(query.matches);
    query.addEventListener("change", on);
    return () => query.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** 문장 하나가 흘러나오듯(움직임 줄이기면 바로). 다 흐르면 onDone. */
function TypedText({ text, onDone }: { text: string; onDone?: () => void }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (reduced) {
      setShown(text.length);
      done.current?.();
      return;
    }
    setShown(0);
    let n = 0;
    const timer = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= text.length) {
        window.clearInterval(timer);
        done.current?.();
      }
    }, TYPE_MS_PER_CHAR);
    return () => window.clearInterval(timer);
  }, [text, reduced]);
  return (
    <>
      <span aria-hidden>{text.slice(0, shown)}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}

/** 선생님을 기다리는 동안(점 셋 → 둘째 값 뒤 '[이름](이/가) 생각하고 있어요'). */
export function ToriWaiting({
  startedAt,
  seconds,
  teacherName,
}: {
  startedAt: number;
  /** ui.wait_hint_seconds. */
  seconds: readonly [number, number];
  /** 세션 선생님 한글 이름(없으면 '선생님'). */
  teacherName?: string | undefined;
}) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    const left = seconds[1] * MS_PER_SECOND - (performance.now() - startedAt);
    if (left <= 0) {
      setLate(true);
      return;
    }
    setLate(false);
    const timer = window.setTimeout(() => setLate(true), left);
    return () => window.clearTimeout(timer);
  }, [startedAt, seconds]);
  return (
    <div data-wait-hint="" role="status" className="flex flex-col gap-2">
      <span aria-hidden className="flex gap-3 py-2">
        {DOTS.map((i) => (
          <span
            key={i}
            className="size-4 rounded-full bg-ink motion-safe:animate-bounce"
            style={{ animationDelay: `${i * DOT_DELAY_MS}ms` }}
          />
        ))}
      </span>
      {late ? (
        <p data-wait-line="" className={CHILD_SIZE.guide}>
          {TEACHER_TEXT.thinking(teacherName)}
        </p>
      ) : null}
    </div>
  );
}

/** 정리 말풍선의 내용(되짚을 말 · 끝인사 문장과 뜻). */
export type BubbleContent = {
  sentences: string[];
  ko?: string;
  /** 끝 줄까지 받았다(뜻을 보일 때). */
  done: boolean;
};

/**
 * 정리 말풍선(LessonWrapUp 의 한 장 — 되짚을 말 · 끝인사): 문장이 흘러나오듯 보이고 1~4단계 뜻은 영어가 다 흐른 뒤 아래에 한 번에.
 * 말풍선을 누르면 다시 읽는다. 대화 턴 말풍선은 LessonToriBubble 이다.
 */
export function ToriBubble({
  content,
  englishName,
  teacherName,
  onReplay,
  onAllTyped,
}: {
  content: BubbleContent;
  /** {NAME} 을 채울 이름(저장 글은 틀 그대로). */
  englishName: string;
  /** 세션 선생님 한글 이름(접근 이름 '[이름] 말 다시 듣기' — 없으면 '선생님'). */
  teacherName?: string | undefined;
  onReplay: () => void;
  /** 받은 글이 다 흘러나왔는가(바뀔 때마다). */
  onAllTyped?: (done: boolean) => void;
}) {
  const english = content.sentences;
  const ko = content.ko ? [content.ko] : [];
  // 부르는 쪽이 장마다 key 를 바꿔 새로 그린다(흘러나온 수가 처음부터)
  const [typed, setTyped] = useState(0);
  const allTyped = typed >= english.length;
  const empty = english.length === 0;
  const onTyped = useCallback(() => setTyped((n) => n + 1), []);
  const reportTyped = useRef(onAllTyped);
  reportTyped.current = onAllTyped;
  useEffect(() => {
    reportTyped.current?.(allTyped);
  }, [allTyped]);
  return (
    <div className="flex items-start gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <button
          type="button"
          data-tori-bubble=""
          aria-label={TEACHER_TEXT.replay(teacherName)}
          disabled={empty}
          onClick={onReplay}
          className={cn(
            FOCUS_RING,
            CHILD_SIZE.target,
            BUBBLE_CLASS,
            BUBBLE_WIDTH,
            "text-left",
          )}
        >
          <span
            lang="en"
            className="flex flex-col gap-1 font-en text-[28px] font-bold leading-snug"
          >
            {/* 받은 차례대로 앞 줄이 다 흐른 뒤 다음 줄(검토 M-5) */}
            {english.slice(0, typed + 1).map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 흘러 받은 차례가 곧 열쇠다
              <span key={i} data-tori-line="" className="block">
                <TypedText
                  text={fillName(line, englishName)}
                  onDone={onTyped}
                />
              </span>
            ))}
          </span>
        </button>
        {ko.length > 0 ? (
          <div
            data-tori-under=""
            className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-2"
          >
            {content.done && allTyped ? (
              <p data-tori-ko="" className={CHILD_SIZE.guide}>
                {ko.map((line) => fillName(line, englishName)).join(" ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── 새 꼴 말풍선(회화 plan 묶음 10) ─────────────────────────────

/** 선생님 쪽 발화의 종류(정한 것 10 — client_listen sp 의 w). */
export type SpeakWhat = ClientSpeakEntry["w"];
/**
 * 읽기 줄 한 항목: 읽을 글과 무엇을 읽는지(감시 기록용). 글만 넘기면 선생님 말(tori)이다. line 은 지금 말풍선 줄 차례(소리 줄을 들려줬는지
 * 되찾는 열쇠 — fix 1 M-5, playedSoundsOf).
 */
export type SpeakItem = { text: string; w: SpeakWhat; line?: number };

/**
 * 1~3단계 소리 줄(서버 TalkLessonLine 의 sound 와 같은 꼴). lead 는 새 엔진만 싣는 표지다(core lead-turn-core LeadSoundMark): ask 는 고르기
 * 물음(접근 이름), kept 는 되묻는 차례에 그대로 둔 앞 차례의 소리 줄(저절로 읽지 않고 말풍선 다시 읽기에도 넣지 않음 — 단추를 누르면 들림).
 */
export type LessonSoundLine =
  | {
      t: "sound";
      kind: "model" | "answer";
      say: string;
      lead?: { ask?: true; kept?: true };
    }
  | { t: "sound"; kind: "choices"; answers: readonly [string, string] };

/** 되묻는 차례에 그대로 둔 앞 차례의 소리 줄인가(순수 — 저절로 읽는 차례 · 말풍선 다시 읽기에서 뺀다, 정본 03 4절 98줄 · 화면 검토 I-1). */
export function isKeptSoundLine(line: { t: string; lead?: unknown }): boolean {
  return (
    line.t === "sound" &&
    typeof line.lead === "object" &&
    line.lead !== null &&
    (line.lead as { kept?: unknown }).kept === true
  );
}

/** 따라 할 말 · 받침의 답 · 고르기 물음 듣기 단추의 접근 이름(순수, 화면 검토 M-1 — 새 엔진의 고르기 물음은 따라 할 말이 아니다). */
export function soundListenLabelOf(line: {
  lead?: { ask?: true } | undefined;
}): string {
  return line.lead?.ask === true ? BUBBLE_TEXT.ask : BUBBLE_TEXT.model;
}
/** 말풍선에 쌓는 새 꼴 줄: 선생님 문장 · 붙인 화면 글 줄(카드 질문 · 마무리 물음 · 4단계부터 답 글) · 소리 줄. */
export type LessonBubbleLine =
  | { t: "s"; en: string }
  | {
      t: "add";
      kind: "question" | "more_prompt" | "answer";
      en: string;
      ko?: string;
    }
  | LessonSoundLine;

/** 새 꼴 말풍선 한 턴(받은 차례 그대로의 줄 · 선생님 문장 뜻 · 끝 줄을 받았나). */
export type LessonBubbleContent = {
  lines: LessonBubbleLine[];
  ko?: string;
  done: boolean;
};

export const LESSON_BUBBLE_START: LessonBubbleContent = {
  lines: [],
  done: false,
};

/** 받은 줄 하나를 말풍선에 쌓는다(순수). 뜻은 ko 에, 그 밖의 줄(끝 · 쉼 · 닫기 · 오류)은 틀이 다루므로 그대로 둔다. */
export function lessonBubbleStep(
  content: LessonBubbleContent,
  line: { t: string } & Partial<Record<string, unknown>>,
): LessonBubbleContent {
  switch (line.t) {
    case "s":
    case "add":
    case "sound":
      return {
        ...content,
        lines: [...content.lines, line as unknown as LessonBubbleLine],
      };
    case "ko":
      return typeof line.ko === "string"
        ? { ...content, ko: line.ko }
        : content;
    default:
      return content;
  }
}

/** 말풍선에 글로 보일 영어(순수): 선생님 문장과 붙인 화면 글 줄. 소리 줄은 넣지 않는다(T2). */
export function lessonShownEnglishOf(
  content: Pick<LessonBubbleContent, "lines">,
): string[] {
  return content.lines.flatMap((l) =>
    l.t === "s" || l.t === "add" ? [l.en] : [],
  );
}

/** 말풍선 아래에 보일 뜻(순수): 선생님 문장 뜻 + 붙인 줄 뜻. */
function lessonShownKoOf(content: LessonBubbleContent): string[] {
  return [
    ...(content.ko ? [content.ko] : []),
    ...content.lines.flatMap((l) => (l.t === "add" && l.ko ? [l.ko] : [])),
  ];
}

/** 이 턴의 소리 줄(순수). */
export function lessonSoundsOf(
  content: Pick<LessonBubbleContent, "lines">,
): LessonSoundLine[] {
  return content.lines.filter((l): l is LessonSoundLine => l.t === "sound");
}

/**
 * 받은 줄 하나에서 읽을 것(순수, 7절 읽어 주기 행 · 3.3 소리 줄): 선생님 문장은 tori, 붙인 화면 글 줄은 card, 소리 줄은 sound. 1단계 선택지는
 * 'Or' 를 사이에 둔 한 줄, 2~3단계는 둘을 차례로 읽는다(문장 사이 쉼, C125).
 */
export function lessonSpeakItemsOf(
  line: LessonBubbleLine,
  level: number,
  /** 말풍선 줄 차례(소리 줄 항목에만 싣는다 — 들려줬는지 되찾기, playedSoundsOf). 받은 줄이면 쌓기 전 content.lines.length. */
  index?: number,
): SpeakItem[] {
  switch (line.t) {
    case "s":
      return [{ text: line.en, w: "tori" }];
    case "add":
      return [{ text: line.en, w: "card" }];
    case "sound": {
      const at = index === undefined ? {} : { line: index };
      if (line.kind !== "choices")
        return [{ text: line.say, w: "sound", ...at }];
      return level === 1
        ? [{ text: answersLine(line.answers), w: "sound", ...at }]
        : line.answers.map((text) => ({ text, w: "sound" as const, ...at }));
    }
  }
}

/**
 * 들려준 소리 줄(순수, fix 1 M-5 · 7절 34줄 '들려주지 못한 소리는 들은 도움으로 적지 않는다'): played 는 읽기 결과가 들려주지 못함이 아니었던
 * 소리 항목의 line 차례(틀이 onSpoken 에서 모은다). 2~3단계 선택지처럼 한 줄이 두 항목이면 하나라도 들려줬으면 들려준 줄이다.
 */
export function playedSoundsOf(
  content: Pick<LessonBubbleContent, "lines">,
  played: ReadonlySet<number>,
): LessonSoundLine[] {
  return content.lines.flatMap((l, i) =>
    l.t === "sound" && played.has(i) ? [l] : [],
  );
}

/** 한 세션에서 '소리가 안 나와서 글로 봐요'가 이 번째부터 아이패드 사파리 무음 모드 줄을 더한다(정본 07 33줄 '두 번 나오면' — 차례이지 설정값이 아님). */
export const SILENT_MODE_FROM_SOUNDLESS = 2;

/**
 * '소리가 안 나와서 글로 봐요' 대상인가(순수, 정본 07 34줄 '글이 함께 보이는 설명 자리 … 회화 말풍선' · C179 (2)): 글로 보이는 선생님 문장
 * (tori) · 붙인 화면 글 줄(card)을 들려주지 못했을 때(speakHeardOutcomeOf not_played — 시작 전 오류 · 읽을 수 없는 기기 포함). 소리 줄은
 * 소리가 과제 자극이라 다시 듣기 안내(soundRetry)가 맡고, 맞장구는 글이 없으며, 읽지 않음(skipped) · 끊김 · 들려줌은 아니다.
 */
export function soundlessOf(item: SpeakItem, outcome: SpeakOutcome): boolean {
  if (item.w !== "tori" && item.w !== "card") return false;
  if (outcome.kind === "skipped") return false;
  return speakHeardOutcomeOf(outcome) === "not_played";
}

/** 안내를 더 보일 ms(순수): 마지막으로 들려주지 못한 때(at)부터 speech.skip_notice_seconds, 없거나 지났으면 0. */
export function soundlessNoticeLeftMs(
  at: number | null,
  now: number,
  noticeMs: number,
): number {
  if (at === null) return 0;
  return Math.max(0, at + noticeMs - now);
}

/**
 * 지금 턴 말풍선을 누를 때 읽을 차례(순수): 받은 차례 그대로 소리 줄까지(정본 03 4절 '지금 턴은 소리 줄까지'). 되묻는 차례에 그대로 둔 앞 차례의
 * 소리 줄(isKeptSoundLine)은 이 차례의 말이 아니므로 넣지 않는다(그 단추를 눌러야 들림).
 */
export function lessonSpokenOf(
  content: Pick<LessonBubbleContent, "lines">,
  level: number,
): SpeakItem[] {
  return content.lines.flatMap((l, i) =>
    isKeptSoundLine(l) ? [] : lessonSpeakItemsOf(l, level, i),
  );
}

/** 맞장구를 읽을 때까지 남은 ms(순수): 보낸 때부터 talk.wait_line_seconds, 이미 지났으면 0. */
export function waitLineDelayMs(
  startedAt: number,
  now: number,
  seconds: number,
): number {
  return Math.max(0, startedAt + seconds * MS_PER_SECOND - now);
}

/**
 * 맞장구 한 줄(정본 03 4절 '선생님 차례' · AC-N10): 기다리기 시작한 때(waitingSince)부터 talk.wait_line_seconds 안에 첫 문장이 오지 않으면
 * 한 번 onDue(line). 틀은 onDue 에서 읽기 줄에 { text, w: "wait" } 로 넣는다 — 줄이 차례대로 읽으므로 뒤에 온 첫 문장은 맞장구가 끝난 뒤
 * 읽힌다. 첫 문장이 와서 waitingSince 가 null 이 되면 타이머를 거둔다. 목록이 비었으면(line null) 읽지 않는다.
 */
export function useWaitLine({
  waitingSince,
  seconds,
  line,
  onDue,
}: {
  waitingSince: number | null;
  seconds: number;
  line: string | null;
  onDue: (line: string) => void;
}): void {
  const due = useRef(onDue);
  due.current = onDue;
  useEffect(() => {
    if (waitingSince === null || line === null) return;
    const timer = window.setTimeout(
      () => due.current(line),
      waitLineDelayMs(waitingSince, performance.now(), seconds),
    );
    return () => window.clearTimeout(timer);
  }, [waitingSince, seconds, line]);
}

/** 소리 줄 단추 꼴(답 두 개 단추와 같은 종이 원 — 들려주지 못한 뒤 다시 듣기는 크게). */
const SOUND_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-5 font-heading text-[26px]";
const SOUND_BUTTON_BIG_CLASS = "min-h-16 px-7";

/**
 * 말풍선 자리의 기다림 칸(순수): 말풍선이 비어 있고 소리 줄도 없으면 그 자리에(in-place — 보통 선생님 차례), 이야기 방식 조용함 요청 뒤
 * (quietWait)에 지금 말풍선이 있으면 그 아래에(below — 13절 C243 보완 7 (3)), 그 밖에는 없다. 제자리 칸이 있으면 아래 칸은 더 그리지 않는다.
 */
export function lessonBubbleWaitOf({
  waiting,
  quietWait,
  empty,
  sounds,
}: {
  waiting: number | null;
  quietWait: number | null;
  empty: boolean;
  sounds: number;
}): "in-place" | "below" | "none" {
  if (waiting !== null && empty && sounds === 0) return "in-place";
  return quietWait !== null ? "below" : "none";
}

/**
 * 새 꼴 선생님 말풍선(회화 plan 묶음 10). 글은 선생님 문장과 붙인 화면 글 줄(받은 차례대로 앞 줄이 다 흐른 뒤 다음 줄), 1~4단계 뜻은 끝 줄을
 * 받고 영어가 다 흐른 뒤 한 번에. 소리 줄은 글 없는 듣기 단추(onSound 로 그 줄만 다시 읽음). 들려주지 못한 소리 줄이 있으면(soundRetry —
 * sound-retry soundRetryStepOf) 안내 한 줄과 큰 다시 듣기, 다시도 못 들려주면 아이패드 사파리 무음 모드 줄을 더한다(저절로 건너뛰지 않음 —
 * 아이 차례 말하기 단추는 그대로 열려 있다).
 */
export function LessonToriBubble({
  content,
  level,
  englishName,
  teacherName,
  waiting,
  waitSeconds,
  quietWait = null,
  explainSlot = false,
  picture,
  explanation,
  listening = false,
  soundRetry = "none",
  soundless,
  onReplay,
  onSound,
  onAllTyped,
  answerTip,
  onAnswerTipShown,
}: {
  content: LessonBubbleContent;
  level: number;
  englishName: string;
  teacherName?: string | undefined;
  waiting: number | null;
  waitSeconds: readonly [number, number];
  /**
   * 이야기 방식 조용함 요청 뒤 첫 줄까지의 기다림 시작 때(talk-frame chatQuietWaitOf). 있으면 지금 말풍선은 그대로 두고 그 아래에 보통 차례와
   * 같은 기다림 칸(점 셋 → 둘째 값 뒤 '[이름](이/가) 생각하고 있어요')을 둔다. 없으면(기존 두 방식) 그리지 않는다.
   */
  quietWait?: number | null;
  /**
   * 이야기 방식 설명 기다림 차례(talk-frame chatExplainSlotOf): 설명이 아직 없으면 그 자리에 글 없는 한 줄을 잡아 둔다(늦게 붙는 설명이 아이 차례
   * 단추 묶음을 밀지 않게 — 기다리는 표시가 아님, C243 보완 7 (4)).
   */
  explainSlot?: boolean;
  picture?: PictureInfo;
  explanation?: string | undefined;
  listening?: boolean;
  /** 들려주지 못한 소리 줄의 다음 할 일(sound-retry soundRetryStepOf — 없음이면 안내 없음). */
  soundRetry?: SoundRetryStep;
  /**
   * 선생님 문장 · 붙인 줄을 들려주지 못함(soundlessOf — 틀이 onSpoken 에서 센다): 마지막 때(performance.now) · 이 세션의 번째 ·
   * speech.skip_notice_seconds(ms). 그동안 '소리가 안 나와서 글로 봐요'를 보이고, 둘째부터 아이패드 사파리 무음 모드 줄을 더한다.
   */
  soundless?: { at: number | null; count: number; noticeMs: number };
  /** 말풍선 누름 — 지금 턴을 소리 줄까지 다시 읽는다(lessonSpokenOf). */
  onReplay: () => void;
  /** 소리 줄 단추 누름 — 그 줄만 다시 읽는다. */
  onSound: (items: SpeakItem[]) => void;
  onAllTyped?: (done: boolean) => void;
  answerTip?: boolean;
  onAnswerTipShown?: () => void;
}) {
  const english = lessonShownEnglishOf(content);
  const ko = lessonShownKoOf(content);
  const sounds = lessonSoundsOf(content);
  const choices = sounds.find(
    (s): s is Extract<LessonSoundLine, { kind: "choices" }> =>
      s.kind === "choices",
  );
  const models = sounds.filter(
    (s): s is Extract<LessonSoundLine, { kind: "model" | "answer" }> =>
      s.kind !== "choices",
  );
  const tipShown = choices !== undefined && answerTip === true;
  const reportTip = useRef(onAnswerTipShown);
  reportTip.current = onAnswerTipShown;
  useEffect(() => {
    if (tipShown) reportTip.current?.();
  }, [tipShown]);
  const [typed, setTyped] = useState(0);
  const allTyped = typed >= english.length;
  const empty = english.length === 0;
  const onTyped = useCallback(() => setTyped((n) => n + 1), []);
  const reportTyped = useRef(onAllTyped);
  reportTyped.current = onAllTyped;
  useEffect(() => {
    reportTyped.current?.(allTyped);
  }, [allTyped]);
  const retrying = soundRetry !== "none";
  // '소리가 안 나와서 글로 봐요'(정본 07 34줄): 그린 때 남은 시간이 있으면 보이고, 남은 시간 뒤 거둔다 — 글은 그대로 이어 간다
  const [soundlessShown, setSoundlessShown] = useState(
    () =>
      soundlessNoticeLeftMs(
        soundless?.at ?? null,
        performance.now(),
        soundless?.noticeMs ?? 0,
      ) > 0,
  );
  const soundlessAt = soundless?.at ?? null;
  const soundlessMs = soundless?.noticeMs ?? 0;
  useEffect(() => {
    const left = soundlessNoticeLeftMs(
      soundlessAt,
      performance.now(),
      soundlessMs,
    );
    setSoundlessShown(left > 0);
    if (left <= 0) return;
    const timer = window.setTimeout(() => setSoundlessShown(false), left);
    return () => window.clearTimeout(timer);
  }, [soundlessAt, soundlessMs]);
  const silentModeLine = (soundless?.count ?? 0) >= SILENT_MODE_FROM_SOUNDLESS;
  const sized = (base: string) =>
    cn(
      FOCUS_RING,
      CHILD_SIZE.target,
      base,
      retrying ? SOUND_BUTTON_BIG_CLASS : undefined,
    );
  const sizeMark = retrying ? { "data-size": "big" } : {};
  // 소리 줄은 선생님 문장 뒤에 오므로(3.3 · 묶음 8 lessonAfterLinesOf) 받은 때 단추를 둔다 — 자리를 먼저 잡아 뜻이 늦게 들어도 뛰지 않는다
  const soundShown = sounds.length > 0;
  const wait = lessonBubbleWaitOf({
    waiting,
    quietWait,
    empty,
    sounds: sounds.length,
  });
  return (
    <div className="flex items-start gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {wait === "in-place" && waiting !== null ? (
          <div data-tori-waiting="" className={cn(BUBBLE_CLASS, BUBBLE_WIDTH)}>
            <ToriWaiting
              startedAt={waiting}
              seconds={waitSeconds}
              teacherName={teacherName}
            />
          </div>
        ) : (
          <button
            type="button"
            data-tori-bubble=""
            aria-label={TEACHER_TEXT.replay(teacherName)}
            disabled={(empty && sounds.length === 0) || listening}
            onClick={onReplay}
            className={cn(
              FOCUS_RING,
              CHILD_SIZE.target,
              BUBBLE_CLASS,
              BUBBLE_WIDTH,
              "text-left",
            )}
          >
            <span
              lang="en"
              className="flex flex-col gap-1 font-en text-[28px] font-bold leading-snug"
            >
              {english.slice(0, typed + 1).map((line, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 흘러 받은 차례가 곧 열쇠다
                <span key={i} data-tori-line="" className="block">
                  <TypedText
                    text={fillName(line, englishName)}
                    onDone={onTyped}
                  />
                </span>
              ))}
            </span>
          </button>
        )}
        {sounds.length > 0 || ko.length > 0 ? (
          <div
            data-tori-under=""
            className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-2"
          >
            {soundShown ? (
              <div data-sound-lines="" className="flex flex-wrap gap-4">
                {models.map((line, i) => (
                  <button
                    // biome-ignore lint/suspicious/noArrayIndexKey: 받은 차례가 곧 열쇠다
                    key={i}
                    type="button"
                    data-sound-listen={line.kind}
                    {...(isKeptSoundLine(line)
                      ? { "data-sound-kept": "" }
                      : {})}
                    {...sizeMark}
                    aria-label={soundListenLabelOf(line)}
                    disabled={listening}
                    onClick={() => onSound(lessonSpeakItemsOf(line, level))}
                    className={sized(SOUND_BUTTON_CLASS)}
                  >
                    <Volume2 aria-hidden className="size-7" />
                  </button>
                ))}
                {choices
                  ? ANSWER_MARKS.map((mark, i) => (
                      <button
                        key={mark}
                        type="button"
                        data-answer-listen={i + 1}
                        {...sizeMark}
                        aria-label={BUBBLE_TEXT.answer(i + 1)}
                        disabled={listening}
                        onClick={() =>
                          onSound([
                            {
                              text: choices.answers[i] as string,
                              w: "sound",
                            },
                          ])
                        }
                        className={sized(SOUND_BUTTON_CLASS)}
                      >
                        <span
                          aria-hidden
                          data-answer-mark={mark}
                          className="inline-flex size-8 items-center justify-center rounded-full border-2 border-ink font-en text-[20px] font-bold leading-none"
                        >
                          {mark}
                        </span>
                        <Volume2 aria-hidden className="size-6" />
                      </button>
                    ))
                  : null}
              </div>
            ) : null}
            {tipShown && soundShown ? (
              <p data-answer-tip="" className={CHILD_SIZE.guide}>
                {BUBBLE_TEXT.answerTip}
              </p>
            ) : null}
            {content.done && allTyped && ko.length > 0 ? (
              <p data-tori-ko="" className={CHILD_SIZE.guide}>
                {ko.map((line) => fillName(line, englishName)).join(" ")}
              </p>
            ) : null}
          </div>
        ) : null}
        {retrying && sounds.length > 0 ? (
          <div
            data-sound-retry={soundRetry}
            className="flex flex-col gap-1 px-2"
          >
            <p role="status" className={CHILD_SIZE.guide}>
              {SOUND_RETRY_TEXT.notice}
            </p>
            {soundRetry !== "retry" ? <SilentModeNote /> : null}
          </div>
        ) : null}
        {soundlessShown ? (
          <div
            data-tori-soundless=""
            {...(silentModeLine ? { "data-silent-mode": "" } : {})}
            className="flex flex-col gap-1 px-2"
          >
            <p role="status" className={CHILD_SIZE.guide}>
              {BUBBLE_TEXT.soundless}
            </p>
            {silentModeLine ? <SilentModeNote /> : null}
          </div>
        ) : null}
        {explanation ? (
          <p data-tori-explanation="" className={cn(CHILD_SIZE.guide, "px-2")}>
            {fillName(explanation, englishName)}
          </p>
        ) : explainSlot ? (
          // 글 없는 한 줄 자리(설명과 같은 꼴 · 같은 높이, 읽지 않음)
          <p
            data-tori-explanation-slot=""
            aria-hidden
            className={cn(CHILD_SIZE.guide, "px-2")}
          >
            {"\u00a0"}
          </p>
        ) : null}
        {wait === "below" && quietWait !== null ? (
          <div
            data-tori-waiting=""
            data-tori-waiting-quiet=""
            className={cn(BUBBLE_CLASS, BUBBLE_WIDTH)}
          >
            <ToriWaiting
              startedAt={quietWait}
              seconds={waitSeconds}
              teacherName={teacherName}
            />
          </div>
        ) : null}
      </div>
      {picture ? <TurnPicture picture={picture} /> : null}
    </div>
  );
}

/**
 * 읽어 주기 줄(문장마다 차례대로 — 한 번에 하나, plan 위험 3). 빠르기는 단계 구간의 speech.rate.<구간>, 앞 문장이 끝난 뒤
 * speech.sentence_pause_ms 만큼 쉬고 다음 문장을 읽는다(C125 — 쉼은 앞 문장이 끝난 때부터 재므로 늦게 온 문장은 덜 기다린다).
 * 줄을 비우면 읽기와 쉼을 멈춘다. speaking 은 줄에 남은 글이 있거나 읽는 중 · 쉬는 중이면 참.
 */
export function useSpeakQueue(
  speech: SpeechPort | undefined,
  {
    rate,
    pauseMs,
    englishName,
    onSpoken,
  }: {
    rate: number;
    pauseMs: number;
    englishName: string;
    /** 한 항목을 읽은 결과(묶음 10 — 감시 기록 sp · 들려주지 못함 셈은 틀이 speakHitchOf · soundTrackOf 로). */
    onSpoken?: (item: SpeakItem, outcome: SpeakOutcome) => void;
  },
) {
  const queue = useRef<SpeakItem[]>([]);
  const spoken = useRef(onSpoken);
  spoken.current = onSpoken;
  const generation = useRef(0);
  /** 늘 지금 음성 접점으로 읽는다(처리기가 보낸 때의 함수를 쥐고 있어도 — 재검토 N-1). */
  const port = useRef(speech);
  port.current = speech;
  /** 틀이 사라진 뒤 늦게 온 문장은 읽지 않는다(검토 I-2). */
  const disposed = useRef(false);
  const running = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  /** 문장 사이 쉼(멈추면 함께 끝남). */
  const [sleeper] = useState(createSleeper);
  /** 이 줄에서 앞 문장이 끝난 때(performance.now — 끝나지 않았거나 끊겼으면 없음). */
  const endedAt = useRef<number | undefined>(undefined);

  const pump = useCallback(async () => {
    if (running.current || !port.current) return;
    running.current = true;
    setSpeaking(true);
    const mine = generation.current;
    while (queue.current.length > 0 && mine === generation.current) {
      const item = queue.current.shift() as SpeakItem;
      const wait = pauseLeftMs({
        endedAt: endedAt.current,
        now: performance.now(),
        pauseMs,
      });
      if (!(await sleeper.sleep(wait)) || mine !== generation.current) return;
      const current = port.current;
      if (!current) break;
      const outcome = await current.speak(fillName(item.text, englishName), {
        rate,
      });
      endedAt.current =
        outcome.kind === "ended" ? performance.now() : undefined;
      spoken.current?.(item, outcome);
    }
    if (mine !== generation.current) return;
    running.current = false;
    setSpeaking(false);
  }, [rate, pauseMs, englishName, sleeper]);

  const enqueue = useCallback(
    (texts: readonly (string | SpeakItem)[]) => {
      if (disposed.current) return;
      queue.current.push(
        ...texts
          .map((t) =>
            typeof t === "string" ? { text: t, w: "tori" as const } : t,
          )
          .filter((t) => t.text.trim() !== ""),
      );
      void pump();
    },
    [pump],
  );
  const cancel = useCallback(() => {
    generation.current += 1;
    queue.current = [];
    running.current = false;
    endedAt.current = undefined;
    sleeper.cancel();
    setSpeaking(false);
    port.current?.cancelSpeaking();
  }, [sleeper]);
  const replay = useCallback(
    (texts: readonly (string | SpeakItem)[]) => {
      cancel();
      enqueue(texts);
    },
    [cancel, enqueue],
  );
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      generation.current += 1;
      queue.current = [];
      sleeper.cancel();
    };
  }, [sleeper]);
  /**
   * 지금 읽기 줄이 읽는 중인가(그림을 기다리지 않는 값 — 같은 처리 안에서 막 넣은 줄도 셈). speaking 은 그린 뒤의 값이라, 흘림 줄과 끝 줄이 한 덩이로
   * 와 처리기가 한 번에 돌면 아직 거짓이다(이야기 방식 조용함 타이머의 열림 · 걸린 때 — 코드 검토 rev-chat-w I-2).
   */
  const isSpeaking = useCallback(
    () => running.current || queue.current.length > 0,
    [],
  );
  return { enqueue, cancel, replay, speaking, isSpeaking };
}
