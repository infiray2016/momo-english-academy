"use client";

// 선생님 말풍선(plan-p13b 파일별 값 8, 4절 회화 세션 '선생님 차례' 행 · 3.3 · 7절 · C32 · C96 · C103 · 검토 I-3). 선생님 그림은 회화 틀의
// 선생님 창(src/components/teacher/teacher-window.tsx — 선생님 화면 plan 값 13)이 맡는다. ToriBubble: 받은 차례대로 문장이 흘러나오듯 보이고(TYPE_MS_PER_CHAR,
// 움직임 줄이기면 바로), 1~4단계 뜻은 영어가 다 흐른 뒤 아래에 한 번에(20px), 붙인 카드 질문은 같은 말풍선 끝에. 1~3단계 아이가 말할
// 영어(답 예시 say · 답 두 개 answers)는 읽어 주기만 하고 글로 보이지 않는다 — 1단계 처음 묻는 턴 · 인사 턴은 글 없는 듣기 단추 둘(원 안 1 · 2).
// 말풍선을 누르면 그 말을 다시 읽는다(답 두 개까지, AC-15l). 기다리는 동안 점 셋(data-wait-hint) → ui.wait_hint_seconds 둘째 값 뒤
// '[이름](이/가) 생각하고 있어요'(data-wait-line). 설명(explanation)은 말풍선 아래 글로만(읽지 않음). 녹음 없음.
// 이름 자리 글은 문구 표(src/core/teacher/name.ts — 선생님 화면 plan 값 9)이고 부르는 쪽이 세션 선생님 이름(teacherName)을 넘긴다.
import { Volume2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import { FOCUS_RING } from "@/components/board/board";
import { fillName } from "@/core/ai/mask";
import type { PictureInfo } from "@/core/answer/display";
import { createSleeper, pauseLeftMs } from "@/core/speech/pace";
import { TEACHER_TEXT } from "@/core/teacher/name";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import type { AddLineOut } from "@/server/conversation";

/** 이름 자리 없는 말풍선 글(이름 자리 글은 TEACHER_TEXT). */
export const BUBBLE_TEXT = {
  answer: (n: number) => `${n === 1 ? "첫째" : "둘째"} 답 듣기`,
} as const;

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
const BUBBLE_WIDTH = "w-fit max-w-[520px]";

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

/** 토리 말풍선 꼴(단추 · 기다림 칸이 같이 쓴다 — 목업 B_Talk1 연두 옅은 바탕 · 먹색 테). */
const BUBBLE_CLASS =
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

/** 말풍선 한 턴의 내용(흘러 받은 문장 · 뜻 · 붙인 말). */
export type BubbleContent = {
  sentences: string[];
  ko?: string;
  adds: AddLineOut[];
  /** 끝 줄까지 받았다(뜻을 보일 때). */
  done: boolean;
};

/** 읽어 줄 글 차례: 문장 → 붙인 말(again 은 답 예시 → 질문, 답 두 개는 'Or' 를 사이에). */
export function spokenOf(
  content: Pick<BubbleContent, "sentences" | "adds">,
): string[] {
  const out = [...content.sentences];
  for (const add of content.adds) {
    if (add.kind === "two_answers") out.push(answersLine(add.answers));
    else if (add.kind === "again") {
      out.push(add.say);
      if (add.en) out.push(add.en);
    } else out.push(add.en);
  }
  return out;
}

/** 말풍선에 글로 보일 영어: 문장 + 토리가 묻는 말(질문 · 다시 묻는 질문 · '더 이야기할래?'). 아이가 말할 영어는 넣지 않는다. */
export function shownEnglishOf(
  content: Pick<BubbleContent, "sentences" | "adds">,
): string[] {
  const out = [...content.sentences];
  for (const add of content.adds) {
    if (add.kind === "two_answers") continue;
    if (add.en) out.push(add.en);
  }
  return out;
}

/** 말풍선에 보일 뜻(반응 뜻 + 붙인 말 뜻). */
function shownKoOf(content: BubbleContent): string[] {
  return [
    ...(content.ko ? [content.ko] : []),
    ...content.adds.flatMap((a) =>
      a.kind !== "two_answers" && a.ko ? [a.ko] : [],
    ),
  ];
}

/** 토리 말풍선. */
export function ToriBubble({
  content,
  englishName,
  teacherName,
  waiting,
  waitSeconds,
  picture,
  explanation,
  listening = false,
  onReplay,
  onAnswer,
  onAllTyped,
}: {
  content: BubbleContent;
  /** {NAME} 을 채울 이름(저장 글은 틀 그대로). */
  englishName: string;
  /** 세션 선생님 한글 이름(접근 이름 '[이름] 말 다시 듣기' · 기다림 글 — 없으면 '선생님'). */
  teacherName?: string | undefined;
  /** 첫 문장을 기다리는 중이면 시작 때(performance.now()). */
  waiting: number | null;
  waitSeconds: readonly [number, number];
  /** 그림 턴(C32 — 파일이 있을 때만). */
  picture?: PictureInfo;
  explanation?: string;
  /** 아이 차례가 듣는 중인가 — 그동안 다시 듣기 · 답 듣기 단추를 끈다(누르면 듣기가 안내 없이 끝남, 7절 말하기 버튼 행(분석 A2 · N3)). */
  listening?: boolean;
  onReplay: () => void;
  onAnswer: (index: 0 | 1) => void;
  /** 받은 글이 다 흘러나왔는가(바뀔 때마다 — 틀이 아이 차례를 그 뒤에 연다, 화면 검토 M-1). */
  onAllTyped?: (done: boolean) => void;
}) {
  const english = shownEnglishOf(content);
  const ko = shownKoOf(content);
  const pair = content.adds.find((a) => a.kind === "two_answers");
  // 턴마다 부르는 쪽이 key 를 바꿔 새로 그린다(흘러나온 수가 처음부터)
  const [typed, setTyped] = useState(0);
  const allTyped = typed >= english.length;
  const empty = english.length === 0;
  const onTyped = useCallback(() => setTyped((n) => n + 1), []);
  const reportTyped = useRef(onAllTyped);
  reportTyped.current = onAllTyped;
  // 글이 없는 말풍선(드묾)도 다 흐른 것으로 본다 — 아이 차례가 막히지 않게(끝 줄이 오기 전에는 틀이 열지 않는다)
  const typedDone = allTyped;
  useEffect(() => {
    reportTyped.current?.(typedDone);
  }, [typedDone]);
  return (
    <div className="flex items-start gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {waiting !== null && empty ? (
          // 기다림 표시는 단추 밖 같은 말풍선 꼴 칸에(상태 줄이 비활성 단추 안에 들지 않게 — 검토 M-9)
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
            disabled={empty || listening}
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
                // 문장은 받은 차례 그대로 쌓이고 바뀌지 않는다
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
        {/* 뜻 줄과 답 두 개 단추는 한 묶음 — 자리를 먼저 잡아 뜻이 늦게 들어도 ①② 가 뛰지 않는다(화면 검토 M-2) */}
        {pair || ko.length > 0 ? (
          <div
            data-tori-under=""
            className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-2"
          >
            {pair ? (
              <div data-two-answers="" className="flex gap-4">
                {ANSWER_MARKS.map((mark, i) => (
                  <button
                    key={mark}
                    type="button"
                    data-answer-listen={i + 1}
                    aria-label={BUBBLE_TEXT.answer(i + 1)}
                    disabled={listening}
                    onClick={() => onAnswer(i as 0 | 1)}
                    className={cn(
                      FOCUS_RING,
                      CHILD_SIZE.target,
                      "inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-5 font-heading text-[26px]",
                    )}
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
                ))}
              </div>
            ) : null}
            {content.done && allTyped && ko.length > 0 ? (
              <p data-tori-ko="" className={CHILD_SIZE.guide}>
                {ko.map((line) => fillName(line, englishName)).join(" ")}
              </p>
            ) : null}
          </div>
        ) : null}
        {explanation ? (
          <p data-tori-explanation="" className={cn(CHILD_SIZE.guide, "px-2")}>
            {fillName(explanation, englishName)}
          </p>
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
  }: { rate: number; pauseMs: number; englishName: string },
) {
  const queue = useRef<string[]>([]);
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
      const text = queue.current.shift() as string;
      const wait = pauseLeftMs({
        endedAt: endedAt.current,
        now: performance.now(),
        pauseMs,
      });
      if (!(await sleeper.sleep(wait)) || mine !== generation.current) return;
      const current = port.current;
      if (!current) break;
      const outcome = await current.speak(fillName(text, englishName), {
        rate,
      });
      endedAt.current =
        outcome.kind === "ended" ? performance.now() : undefined;
    }
    if (mine !== generation.current) return;
    running.current = false;
    setSpeaking(false);
  }, [rate, pauseMs, englishName, sleeper]);

  const enqueue = useCallback(
    (texts: readonly string[]) => {
      if (disposed.current) return;
      queue.current.push(...texts.filter((t) => t.trim() !== ""));
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
    (texts: readonly string[]) => {
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
  return { enqueue, cancel, replay, speaking };
}
