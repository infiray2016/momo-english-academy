"use client";

// '말하기' 단추 한 조각(7절 '말하기 버튼' 행 · 4절 큰 버튼, 화면 검토 review-p11-4-design I-1). 한 번 눌러 듣기를 시작하고,
// 듣는 동안 단추 꼴이 바뀐다 — 단추와 카드색 틈을 두고 그 바깥에 남은 시간이 줄어드는 연두 고리(talk-deep, 종이 위 3:1 이상 · 글자 아님 — spec UI · UX 개선 설계 5.1)(P2b 듣기 손잡이의 상한 시각 capAt —
// speech.max_listen_seconds · 활동 시간 상한에서 온 수, 이 조각은 수를 박지 않는다) + 보이는 상태 data-listening. 듣는 중에 다시 누르면
// 듣기가 바로 끝난다(부르는 쪽이 손잡이 press). 고리가 먹색 단추에 붙으면 단추가 커진 것으로만 보여(요청자 iPad 2026-10-22 '고리 안 보임')
// 틈(gapClassName — 카드색, 기본 말하기 분홍)으로 띄우고 마이크 표시를 깜빡인다(motion-safe). 두 문장 이상 답은 듣는 동안 단추 글이 '다 말했어요'로 바뀐다(C37 — listeningLabel,
// plan-p11c 가 넘김). P10 배치 따라 말하기 · P11 말하기 세션 · 회화가 같이 쓴다.
// 13절 C166(UX 검토 U4-2 · R2): 듣는 동안 단추 글은 '듣고 있어요'(두 문장 이상 답의 '다 말했어요'가 이김), 소리가 들어오면(음성 접점
// listen 의 on.sound — soundstart · speechstart) 마이크 표시가 talk-deep 소리 물결로 바뀐다(data-sound-in, 먹색 단추 위 4.2:1 · 글자 아님). 아이콘 획은 ICON_STROKE(5.2). 따라 말하기에서 선생님이 읽는 동안은
// 흐리게(waiting — 끄지 않음) 두고, 그때 누르면 듣지 않고 '다 읽은 뒤 눌러요' 한 줄을 보인다.
// 13절 C215(iPad 버리는 듣기 spec 설계 3 · FR-2): 버리는 듣기를 켠 기기의 대화 차례에서 누름이 진짜를 열 조건을 기다리는 동안(preparing)
// 단추 글은 '준비 중이에요'이고 글 뒤에 점 셋이 차례로 튄다(표본 쪽 1번). 소리 없음, 단추 크기 · 마이크 표시는 그대로이고 듣는 동안의
// 고리 · 깜빡임 · 소리 물결을 켜지 않는다. 움직임 줄이기면 멈춘 점이다. 넘기지 않는 화면(다른 영역 · 끔)은 지금 그대로다.
// 화면 · 문구 판정(2026-11-07) I-1: 켠 기기의 대화 차례(steady)는 세 상태 글을 한 칸에 겹쳐 두어 단추가 늘 가장 긴 글('준비 중이에요' + 점 셋)의
// 너비다(수를 박지 않음). M-1: 점은 표본 쪽 1번의 뜀(6px · 흐림 바뀜). I-3: '다 읽은 뒤 눌러요'는 듣기가 시작되면 지우고, 회복 중(quiet)에는
// 흐린 누름에도 띄우지 않는다.
import { AudioLines, Mic } from "lucide-react";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import { BigButton, ICON_STROKE } from "@/components/board/board";
import type { SpeakOutcome, SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";

/** 고리 한 바퀴(도). */
const FULL_TURN_DEG = 360;
/** 기다림 점 셋의 점마다 늦춤(화면 꼴 값 — 힌트 받는 점 셋 · 말풍선 기다림 점과 같은 값, C215). */
const PREPARING_DOT_DELAY_MS = 150;
const PREPARING_DOTS = [0, 1, 2] as const;
/** 점 한 번 뜀의 길이(화면 꼴 값 — 표본 쪽 1번 hop 1.1초). */
const PREPARING_DOT_CYCLE_MS = 1100;
/** 점 뜀 키프레임 이름. */
const PREPARING_DOT_HOP = "speak-dot-hop";
/** 점 뜀(표본 쪽 1번 hop 그대로 — 6px 뛰며 흐림이 0.45 → 1, 화면 판정 M-1). React 19 가 한 번만 head 로 올린다. */
export const PREPARING_DOT_KEYFRAMES = `@keyframes ${PREPARING_DOT_HOP}{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-6px);opacity:1}}`;

/** 말하기 단추 둘레 글(브리프 A · C166 — 정본 밖 문구, 해요체 한 줄). */
export const SPEAK_BUTTON_TEXT = {
  /** 듣는 동안의 단추 글(U4-2). */
  listening: "듣고 있어요",
  /** 따라 말하기에서 읽는 중 누름(R2). */
  waitReading: "다 읽은 뒤 눌러요",
  /** 버리는 듣기를 켠 기기의 대화 차례 — 누름이 진짜를 열 조건을 기다림(iPad 버리는 듣기 spec 설계 3 · C215). */
  preparing: "준비 중이에요",
  /** 인식이 speech.max_retries 번 안 돼 다음으로 넘어감(U4-4 — 말하기 · 회화 따라 말하기가 같이 씀). */
  skipped: "이건 다음에 다시 해요",
} as const;

/**
 * 단추 글(순수): 듣는 동안은 넘긴 듣는 중 글(두 문장 이상 답 '다 말했어요'), 없으면 '듣고 있어요'. 듣기 전 기다림(preparing — 버리는 듣기,
 * C215)이면 '준비 중이에요'.
 */
export function speakButtonLabelOf({
  label,
  listeningLabel,
  listening,
  preparing = false,
}: {
  label: string;
  listeningLabel?: string | undefined;
  listening: boolean;
  preparing?: boolean;
}): string {
  if (!listening) return preparing ? SPEAK_BUTTON_TEXT.preparing : label;
  return listeningLabel ?? SPEAK_BUTTON_TEXT.listening;
}

/**
 * 기다림 점 셋(C215 표본 1번): 단추 글 뒤에서 차례로 튄다. 움직임 줄이기면 멈춘 점(motion-safe). 글자가 아니라 읽지 않는다. still 이면 겹친 글의
 * 숨은 칸이 너비만 잡는 자리(움직임 · 표지 없음)다.
 */
function PreparingDots({ still = false }: { still?: boolean }) {
  return (
    <span
      data-speak-dots={still ? undefined : ""}
      aria-hidden
      className="inline-flex items-center gap-1"
    >
      {still ? null : (
        <style href={PREPARING_DOT_HOP} precedence="default">
          {PREPARING_DOT_KEYFRAMES}
        </style>
      )}
      {PREPARING_DOTS.map((i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-full bg-paper",
            !still && "motion-safe:animate-(--speak-dot)",
          )}
          style={
            still
              ? undefined
              : ({
                  "--speak-dot": `${PREPARING_DOT_HOP} ${PREPARING_DOT_CYCLE_MS}ms ease-in-out ${i * PREPARING_DOT_DELAY_MS}ms infinite`,
                } as CSSProperties)
          }
        />
      ))}
    </span>
  );
}

/** 겹친 글의 칸(I-1): 누르기 전 · 기다림 · 듣는 중. */
type SpeakLabelKey = "rest" | "preparing" | "listening";
const SPEAK_LABEL_KEYS: readonly SpeakLabelKey[] = [
  "rest",
  "preparing",
  "listening",
];

/** 지금 단추 글의 칸(순수, speakButtonLabelOf 와 같은 갈래). */
function speakLabelKeyOf({
  listening,
  preparing,
}: {
  listening: boolean;
  preparing: boolean;
}): SpeakLabelKey {
  if (listening) return "listening";
  return preparing ? "preparing" : "rest";
}

/**
 * 흐린 누름의 '다 읽은 뒤 눌러요'를 보이는가(순수, R2 · 화면 판정 I-3): 누른 적이 있고 아직 흐리며 듣는 중이 아니고, 회복 중(quiet — 위 안내 줄
 * '잠깐만요, 마이크를 다시 켤게요' 하나만 둠)이 아닐 때.
 */
export function speakWaitNoteShownOf({
  noted,
  waiting,
  listening,
  quiet,
}: {
  noted: boolean;
  waiting: boolean;
  listening: boolean;
  quiet: boolean;
}): boolean {
  return noted && waiting && !listening && !quiet;
}

/** 누름의 뜻(순수): 선생님이 읽는 중(듣기 전)이면 안내 한 줄, 그 밖(듣는 중 누름 = 듣기 끝 포함)은 누름. */
export function speakPressOf({
  waiting,
  listening,
}: {
  waiting: boolean;
  listening: boolean;
}): "press" | "wait-note" {
  return waiting && !listening ? "wait-note" : "press";
}

/**
 * 읽는 중 알림을 붙인 음성 접점(R2): speak 마다 세어 첫 읽기가 시작될 때 켬, 마지막 읽기의 결과(끝 · 취소 · 오류 · 미지원)에 끔.
 * 감시 상한(C166 R1)이 있어 결과는 반드시 온다. 그 밖은 그대로 넘긴다.
 */
export function trackedSpeech(
  port: SpeechPort,
  onSpeaking: (speaking: boolean) => void,
): SpeechPort {
  let active = 0;
  return {
    device: () => port.device(),
    unlockFromGesture: () => port.unlockFromGesture(),
    cancelSpeaking: () => port.cancelSpeaking(),
    listen: (rule, on) => port.listen(rule, on),
    checkMicrophone: () => port.checkMicrophone(),
    dispose: () => port.dispose(),
    speak(text, options): Promise<SpeakOutcome> {
      active += 1;
      if (active === 1) onSpeaking(true);
      return port.speak(text, options).finally(() => {
        active -= 1;
        if (active === 0) onSpeaking(false);
      });
    },
  };
}

/** 읽는 중 알림을 붙인 접점과 지금 읽는 중인가(따라 말하기 조각 — 들어올 때 읽기 · '다시 듣기'를 모두 센다). */
export function useSpeakingPort(speech: SpeechPort | undefined): {
  port: SpeechPort | undefined;
  speaking: boolean;
} {
  const [speaking, setSpeaking] = useState(false);
  const port = useMemo(
    () => (speech ? trackedSpeech(speech, setSpeaking) : undefined),
    [speech],
  );
  return { port, speaking };
}

export function SpeakButton({
  label,
  listeningLabel,
  listening,
  soundIn = false,
  waiting = false,
  quietWait = false,
  preparing = false,
  steady = false,
  capAt,
  disabled = false,
  className,
  gapClassName = "bg-postit-speaking",
  onPress,
}: {
  label: string;
  /** 듣는 동안의 단추 글(없으면 '듣고 있어요'). */
  listeningLabel?: string;
  listening: boolean;
  /** 이 듣기에서 소리가 들어왔는가(음성 접점 on.sound — U4-2). 듣는 동안만 보인다. */
  soundIn?: boolean;
  /** 선생님이 읽는 중(따라 말하기 — R2): 흐리게 두고 누르면 듣지 않고 안내 한 줄. */
  waiting?: boolean;
  /** 흐린 누름에도 '다 읽은 뒤 눌러요'를 띄우지 않음(버리는 듣기 회복 중 — 위 안내 줄 하나만, 화면 판정 I-3). */
  quietWait?: boolean;
  /**
   * 누름이 진짜를 열 조건을 기다림(버리는 듣기 대화 차례 — C215): '준비 중이에요'와 점 셋. 흐리지 않고 누름도 그대로 넘긴다(다시 누른 것은
   * 층이 하나로 센다). 듣는 동안이면 보이지 않는다.
   */
  preparing?: boolean;
  /** 세 상태 글을 겹쳐 두어 단추 너비가 상태마다 그대로(버리는 듣기를 켠 기기의 대화 차례 — C215 '단추 크기 그대로', 화면 판정 I-1). */
  steady?: boolean;
  /** 듣기 전체 상한의 시각(performance.now() 기준 ms). 읽을 때마다 지금 값(P2b ListenHandle.capAt). 없으면 고리를 꽉 채운다. */
  capAt?: () => number | undefined;
  disabled?: boolean;
  className?: string;
  /** 고리와 단추 사이 틈의 색(바탕 카드색). 기본은 말하기 분홍. */
  gapClassName?: string;
  onPress: () => void;
}) {
  const [left, setLeft] = useState(1);
  /** 읽는 중 누름 안내를 보이는가(읽기가 끝나면 지운다). */
  const [waitNote, setWaitNote] = useState(false);
  useEffect(() => {
    // 읽기가 끝나거나 듣기가 시작되면 지운다(I-3 — 저절로 열린 듣기 동안 남지 않게)
    if (!waiting || listening) setWaitNote(false);
  }, [waiting, listening]);
  const heard = listening && soundIn;
  const prepared = preparing && !listening;
  const startedAt = useRef<number | undefined>(undefined);
  const capOf = useRef(capAt);
  capOf.current = capAt;

  // 듣는 동안 남은 시간 비율을 그림마다 다시 잰다
  useEffect(() => {
    if (!listening) {
      startedAt.current = undefined;
      setLeft(1);
      return;
    }
    startedAt.current = performance.now();
    let frame = 0;
    const tick = () => {
      const cap = capOf.current?.();
      const start = startedAt.current ?? performance.now();
      if (cap !== undefined && cap > start)
        setLeft(
          Math.min(1, Math.max(0, (cap - performance.now()) / (cap - start))),
        );
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [listening]);

  const MicMark = heard ? AudioLines : Mic;
  const ring = (
    <span
      data-speak-ring=""
      className={cn("inline-flex self-center rounded-[1.25rem] p-2", className)}
      style={
        listening
          ? {
              background: `conic-gradient(var(--color-talk-deep) ${left * FULL_TURN_DEG}deg, var(--color-paper) 0)`,
            }
          : undefined
      }
    >
      <span
        className={cn(
          "inline-flex rounded-2xl p-1",
          listening ? gapClassName : "bg-transparent",
        )}
      >
        <BigButton
          data-speak=""
          data-listening={listening ? "" : undefined}
          data-sound-in={heard ? "" : undefined}
          data-speak-waiting={waiting && !listening ? "" : undefined}
          data-speak-preparing={prepared ? "" : undefined}
          aria-pressed={listening}
          disabled={disabled}
          className={cn(waiting && !listening && "opacity-50")}
          onClick={() => {
            if (speakPressOf({ waiting, listening }) === "wait-note") {
              if (!quietWait) setWaitNote(true);
              return;
            }
            onPress();
          }}
        >
          {/* 소리가 들어오면 마이크 표시가 소리 물결로(깜빡임 멈춤 — 들리고 있음을 보임) */}
          <MicMark
            aria-hidden
            strokeWidth={ICON_STROKE}
            className={cn(
              "size-7",
              heard && "text-talk-deep",
              listening && !heard && "motion-safe:animate-pulse",
            )}
          />
          {steady ? (
            // 세 글을 한 칸에 겹쳐 가장 긴 글의 너비를 늘 차지한다(지금 글이 아닌 칸은 읽지 않고 보이지 않음 — I-1)
            <span data-speak-steady="" className="inline-grid">
              {SPEAK_LABEL_KEYS.map((key) => {
                const now = key === speakLabelKeyOf({ listening, preparing });
                return (
                  <span
                    key={key}
                    data-speak-label={now ? "" : undefined}
                    aria-hidden={now ? undefined : true}
                    className={cn(
                      "col-start-1 row-start-1 inline-flex items-center justify-center gap-2",
                      !now && "invisible",
                    )}
                  >
                    {speakButtonLabelOf({
                      label,
                      listeningLabel,
                      listening: key === "listening",
                      preparing: key === "preparing",
                    })}
                    {key === "preparing" ? (
                      <PreparingDots still={!now} />
                    ) : null}
                  </span>
                );
              })}
            </span>
          ) : (
            <>
              {speakButtonLabelOf({
                label,
                listeningLabel,
                listening,
                preparing,
              })}
              {prepared ? <PreparingDots /> : null}
            </>
          )}
        </BigButton>
      </span>
    </span>
  );
  if (
    !speakWaitNoteShownOf({
      noted: waitNote,
      waiting,
      listening,
      quiet: quietWait,
    })
  )
    return ring;
  return (
    <span className="inline-flex flex-col items-center gap-2 self-center">
      {ring}
      <span data-speak-wait-note="" role="status" className={CHILD_SIZE.guide}>
        {SPEAK_BUTTON_TEXT.waitReading}
      </span>
    </span>
  );
}
