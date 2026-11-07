"use client";

// 회화 따라 말하기 · 처음 안내(plan-p13b 파일별 값 14 · 회화 plan 묶음 11 · 12, 4절 회화 세션 짧은 준비 · 정리 · '처음 회화' 행 · 3.3 짧은
// 준비 · 정리 문단 · 7절 · 13절 C33 · C39 · C41 · C97 · C161 · C167 (1) · 컨트롤러 결정 '열 때마다 시작! 한 번').
// - 처음 안내: 처음 회화면 3.3 안내 글 + '시작!', 처음이 아니어도 열 때마다 '시작!' 한 번(그 누름이 첫 읽어 주기를 연다 — iPad Safari).
// - 짧은 준비 쪽지(PrepNote — 쪽지 한 장에 낱말 하나, 1단계 그림 · 뜻 · 소리 · 2~3단계 낱말 글 · 4단계부터 예문 글): 들려줄 말을 읽고 한 번
//   따라 말함 → 아이 말풍선에 인식 글 · 그 아래 결과 말 → ui.auto_next_seconds 뒤 다음, 다 하지 않아도 끝나면 대화로.
// - 정리 한 번(LessonWrapUp): 되짚을 말을 선생님 말풍선으로 보이고 읽음(1~3단계 뜻 함께), 1~3단계는 되짚을 말 전체를 한 번 따라 말함(결과
//   말만) → 끝인사(끝맺음 끝인사가 와 있으면 그것 — talkClosingStatus 한 번) → 마무리.
// 저장은 틀이 넘긴 env.saveFollow(saveLessonFollowAlong — 활동 번호는 서버). 따라 말한 것은 점수 · '말했다'에 들지 않는다. 녹음하지 않는다.
// 선생님 그림은 회화 틀의 선생님 창이 맡는다(이 조각에는 그림이 없다). 결과 말이 '잘 말했어요'(C39)면 틀의 칭찬을 부른다(env.onPraise).
// 13절 C166(UX 검토 U4-2 · U4-4 · U5-2 · R2): 선생님이 읽는 동안 말하기 단추를 흐리게 두고(누르면 '다 읽은 뒤 눌러요') 읽기가 끝나면 켠다.
// 듣는 동안 '듣고 있어요' · 소리 들어옴 표시, 인식이 speech.max_retries 번 안 돼 건너뛸 때 '이건 다음에 다시 해요'를
// speech.skip_notice_seconds 보인 뒤 다음.
// iPad 버리는 듣기(13절 C213 · C214, spec 설계 2 · 3 · FR-2 · FR-3, 정본 03 90 · 92줄 · 07 26 · 29 · 31줄): 틀이 env.discard 를 넘긴 때만(켠 기기)
// 흐림을 진짜를 열 수 있을 때(층 view.canListen)까지 늘리고 문구는 '다 읽은 뒤 눌러요' 하나다. 읽기가 끝나면(say 가 참) 소리 끝을 알리고, 다시
// 말할 차례(못 들었어요 · 끊긴 연결)에는 그 낱말 · 줄의 들려줄 말을 층이 버림 안에서 한 번 더 읽게 한다(again). '버림부터'에서 쉬는 중이면
// (view.reopenIdle) 들려줄 말을 같은 쉼에서 한 번만 다시 읽는다. 마이크 안 잡힘은 '잠깐만요, 마이크를 다시 켤게요'와 누름 없는 듣기로 잇는다.
// env.discard 가 없으면(끔 · 켜지 않은 기기) 지금 그대로다.
import { Volume2 } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CHILD_SIZE,
  EnglishLine,
  GuideLine,
  VocabPicture,
} from "@/components/activities/common";
import {
  SPEAK_BUTTON_TEXT,
  SpeakButton,
} from "@/components/answer/speak-button";
import { BigButton, FOCUS_RING, StatusLine } from "@/components/board/board";
import { fillName } from "@/core/ai/mask";
import type { PictureInfo } from "@/core/answer/display";
import type { ClientListen } from "@/core/conversation/client-listen";
import {
  type TalkSpeechSettings,
  talkEndRuleFor,
} from "@/core/conversation/listen";
import { LEVEL_MIN, TALK_LOW_BAND } from "@/core/seed/structure";
import {
  RESULT_PHRASES,
  type ResultPhrase,
  resultPhraseOf,
  type SpeechEvent,
  type SpeechVerdict,
  speechEventOf,
} from "@/core/speaking/judge";
import type { DiscardView } from "@/core/speech/discard";
import type { SpeechSettings } from "@/core/speech/listen";
import { listenGapMsOf } from "@/core/speech/listen-gap";
import { bestMatchRate } from "@/core/speech/match-rate";
import { createSleeper, speakInTurn } from "@/core/speech/pace";
import { TEACHER_TEXT } from "@/core/teacher/name";
import { createSpeakSettle } from "@/lib/speech/speak-settle";
import type { ListenHandle, SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import { saveLessonFollowAlong } from "@/server/actions/conversation";
import type { PrepWordView, TalkLessonPrep } from "@/server/conversation";
import {
  CHILD_TURN_TEXT,
  ChildBubble,
  deafListenOf,
  deafStreakOf,
  discardLineOf,
  type TurnDiscard,
} from "./child-turn";
import { SilentModeNote } from "./silent-mode-note";
import { type BubbleContent, ToriBubble } from "./tori";

/** 시작 단추(처음 회화 안내 글은 이름 자리라 TEACHER_TEXT.intro — 3.3 글 그대로, 문장마다 한 줄). */
export const TALK_START_TEXT = {
  start: "시작!",
} as const;

/** 따라 말하기 화면 글(4절 · 3.3 · plan-p13b 값 14 제안 문구). 이름 자리 글(안내 · 잘 안 들림)은 TEACHER_TEXT. */
export const FOLLOW_TEXT = {
  speak: "말하기",
  offline: CHILD_TURN_TEXT.offline,
  /** 인식이 speech.max_retries 번 안 돼 건너뜀(U4-4). */
  skipped: SPEAK_BUTTON_TEXT.skipped,
  /** 마이크 안 잡힘(듣기 deaf, 잠정 11-06) — 건너뜀 셈 · '잘 안 들렸어요' 없이 이 한 줄. */
  micDeaf: CHILD_TURN_TEXT.micDeaf,
  /** 마이크 안 잡힘이 speech.deaf_skip_after 번 이어져 기술 사유로 다음(fix 2, C210 보완). */
  micDeafSkip: CHILD_TURN_TEXT.micDeafSkip,
} as const;

/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;

/** 회화 종이 판(코르크 위 종이 · 연두 테이프 — 시작 · 막힘 · 쉼 안내가 같이 씀, 4절 '글은 종이 위에' · 전체 디자인 리뷰 M-1). */
export function TalkPaper({
  children,
  ...data
}: { children: ReactNode } & Record<`data-${string}`, string | undefined>) {
  return (
    <div
      {...data}
      className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-8 bg-paper px-8 py-10 shadow-postit"
    >
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 bg-postit-talk/90"
      />
      {children}
    </div>
  );
}

/** 열 때마다 한 번 누르는 '시작!'(처음 회화면 3.3 안내 글과 함께). 그 누름이 첫 읽어 주기를 연다(7절). 선생님은 틀의 선생님 창(초상). */
export function TalkStart({
  first,
  teacherName,
  disabled = false,
  onStart,
}: {
  /** 프로필의 처음 회화(안내 글을 보인다 — 회17). */
  first: boolean;
  /** 세션 선생님 한글 이름(안내 글의 이름 자리 — 없으면 '선생님'). */
  teacherName?: string | undefined;
  disabled?: boolean;
  onStart: () => void;
}) {
  return (
    <TalkPaper data-talk-start="">
      {first ? (
        <div data-talk-intro="" className="flex flex-col gap-2">
          {TEACHER_TEXT.intro(teacherName).map((line) => (
            <p
              key={line}
              className="text-center font-heading text-[26px] leading-snug"
            >
              {line}
            </p>
          ))}
        </div>
      ) : null}
      <BigButton disabled={disabled} onClick={onStart}>
        {TALK_START_TEXT.start}
      </BigButton>
      {/* 아이패드 사파리면 무음 모드 한 줄(U5-8 — B 조각) */}
      <SilentModeNote />
    </TalkPaper>
  );
}

/** 따라 말하기 조각이 함께 쓰는 환경(틀이 넘김). */
export type FollowEnv = {
  sessionId: string;
  speech: SpeechPort | undefined;
  level: number;
  lowLevel: boolean;
  englishName: string;
  /** 세션 선생님 한글 이름(이름 자리 글 — 없으면 '선생님'). */
  teacherName: string | undefined;
  /** 토리 말 빠르기(단계 구간마다 speech.rate.<구간>, C125). */
  rate: number;
  homophones: string[][];
  settings: {
    speech: SpeechSettings;
    talkSpeech: TalkSpeechSettings;
    matchPhraseLevels: readonly [number, number];
    autoNextSeconds: number;
    hintReadMatch: number;
    waitHintSeconds: readonly [number, number];
  };
  /** 인식 결과를 틀의 셈에 넣고 판정을 받는다(막힌 안내 · 알림은 틀이 한다). */
  onSpeech: (event: SpeechEvent) => SpeechVerdict;
  /** 차례가 바뀜(틀이 인식 실패 셈을 비움). */
  onNextItem: () => void;
  onListening: (listening: boolean) => void;
  /** 따라 말하기 결과 말이 '잘 말했어요'(C39) — 틀이 선생님 칭찬을 talk.teacher_praise_seconds 동안 켠다. */
  onPraise: () => void;
  /** 앞 기록 뒤 끝난 듣기의 요약(C149 — 시도에 싣는다, 글 · 소리 없음). 부를 때마다 그 뒤 듣기부터 다시 모은다. */
  clientListen: () => ClientListen;
  /** 따라 말하기 한 차례 저장(lessonFollowSaver). */
  saveFollow: FollowSaver;
  /** 버리는 듣기 층(켠 기기에서만 틀이 넘긴다 — iPad 버리는 듣기 spec 설계 3). 없으면 지금 그대로다. */
  discard?: FollowDiscard | undefined;
};

/**
 * 따라 말하기가 쓰는 층 몫. again 은 그 낱말 · 줄의 들려줄 말을 넘긴다 — 틀이 소리 공급에서 그 말을 버림 안에서 읽힌다(짧은 말 대신, plan
 * 정한 것 6 · 층 보고 5절 3).
 */
export type FollowDiscard = Omit<TurnDiscard, "again" | "dontKnow"> & {
  again(word: string): void;
  /** 장이 들어옴: 그 장의 들려줄 말을 틀의 소리 공급에 둔다(묶음 3 fix 1 M-1 — 앞 장의 말이 남지 않게). 돌림값은 장을 떠날 때 부른다. */
  card(word: string): () => void;
};

/** 지금 장의 들려줄 말을 층 몫에 알린다(층이 있을 때 · 말이 바뀔 때마다, 장을 떠나면 비움). 층이 없으면 아무것도 하지 않는다. */
function useFollowCardWord(env: Pick<FollowEnv, "discard">, word: string) {
  const discard = useRef(env.discard);
  discard.current = env.discard;
  const on = env.discard !== undefined;
  useEffect(() => {
    if (!on) return;
    return discard.current?.card(word);
  }, [on, word]);
}

/**
 * 따라 말하기 단추를 버리는 듣기 때문에 더 흐리게 둘까(순수, spec 설계 2 '따라 말하기 흐림' · M-5): 층이 있고 진짜를 바로 열 수 없으면 흐림.
 * 다만 '버림부터'에서 쉬는 중인데 그 쉼의 다시 읽기를 이미 냈으면(읽지 못해 쉼이 이어짐) 켠다 — 누르면 층이 버림을 다시 열어 들려줄 말 뒤 듣는다.
 */
export function followDiscardDimOf(
  view: DiscardView | undefined,
  rereadDone: boolean,
): boolean {
  if (view === undefined || view.canListen) return false;
  return !(view.reopenIdle && rereadDone);
}

/** 같은 '버림부터' 쉼의 다시 읽기 셈(재검토 범위 밖 관찰 — 같은 쉼에서 한 번만). */
export type FollowReread = { done: boolean };
export const FOLLOW_REREAD_START: FollowReread = { done: false };

/**
 * view.reopenIdle 이 바뀔 때의 다시 읽기(순수, 기계 fix 1 · reopenIdle): 쉼이 새로 서면 한 번 읽는다. 이미 읽는 중(busy — 들어올 때 읽기 ·
 * 다시 듣기)이면 그 읽기를 이 쉼의 읽기로 친다. 쉼이 끝나면(버림이 열림) 셈을 되돌린다. 읽기가 들려주지 못함으로 끝나 쉼이 이어져도 다시 읽지 않는다.
 */
export function followRereadStep(
  state: FollowReread,
  { reopenIdle, busy }: { reopenIdle: boolean; busy: boolean },
): { state: FollowReread; reread: boolean } {
  if (!reopenIdle) return { state: FOLLOW_REREAD_START, reread: false };
  if (state.done) return { state, reread: false };
  return { state: { done: true }, reread: !busy };
}

/** 따라 말하기 한 번의 끝 뒤 층에 알릴 것(순수): 다시 말할 차례(못 들었어요 · 끊긴 연결)는 again, 회복은 누름 없는 듣기, 그 밖은 없음. */
export function followDiscardAfterOf(
  kind:
    | "heard"
    | "retry"
    | "offline"
    | "skip"
    | "deaf-skip"
    | "recover"
    | "none",
): "again" | "recover" | "none" {
  if (kind === "retry" || kind === "offline") return "again";
  if (kind === "recover") return "recover";
  return "none";
}

/** 따라 말하기 한 차례의 자리(저장 몫). place 는 짧은 준비 쪽지의 자리(인사 뒤 · 대화 중). */
export type FollowSaveAt = {
  segment: "wrap_up" | "prep";
  round: number;
  index: number;
  target: string;
  place?: TalkLessonPrep["place"];
};

/** 따라 말하기 한 차례를 저장한다(기다리지 않음 — 실패해도 진행은 막지 않는다). */
export type FollowSaver = (
  at: FollowSaveAt,
  tried: Tried,
  skipped?: "recognition" | "mic_deaf",
) => void;

/**
 * 새 흐름 저장(saveLessonFollowAlong — 짧은 준비는 talk-prep, 정리는 talk-wrapup, 활동 번호는 서버). 같은 차례는 같은 시도 id 라 다시 열어도
 * 한 번만 저장된다.
 */
export function lessonFollowSaver(
  env: Pick<FollowEnv, "sessionId" | "clientListen">,
): FollowSaver {
  return (at, tried, skipped) => {
    void saveLessonFollowAlong({
      sessionId: env.sessionId,
      clientAttemptId: `talk-lesson-follow:${env.sessionId}:${at.segment}:${at.place ?? at.round}:${at.index}`,
      segment: at.segment,
      index: at.index,
      target: at.target,
      heard: tried.heard,
      failures: tried.failures,
      ...(skipped ? { skipped } : {}),
      clientListen: env.clientListen(),
    }).catch(() => {});
  };
}

/**
 * 토리 말 읽기(차례대로 · 끝날 때까지 기다림 · 끊으면 거기서 멈춤). 문장이 끝나면 speech.sentence_pause_ms 쉬고 다음(C125 — 끊으면
 * 쉼도 끝남). 음성 접점은 늘 지금 것으로(재검토 N-1). 읽기가 멈춘 뒤 듣기 쉼(listenGapMsOf) 동안도 waiting 이다 — 말하기 단추를 그만큼
 * 더 흐리게 두어 읽기 멈춤 → 쉼 → 누름 → 듣기 차례를 지킨다(장부 T-125, iPad 사파리 읽기 직후 듣기 no-speech). 듣기는 늦추지 않는다.
 */
function useSayer(
  env: Pick<
    FollowEnv,
    "speech" | "rate" | "englishName" | "settings" | "discard"
  >,
) {
  const port = useRef(env.speech);
  port.current = env.speech;
  const discard = useRef(env.discard);
  discard.current = env.discard;
  const generation = useRef(0);
  const speakingRef = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const [sleeper] = useState(createSleeper);
  const gapMs = useRef(listenGapMsOf(env.settings.speech));
  gapMs.current = listenGapMsOf(env.settings.speech);
  /** 듣기 쉼이 지나 말하기 단추를 켤 수 있는가. */
  const [settled, setSettled] = useState(true);
  const [settle] = useState(() =>
    createSpeakSettle({ gapMs: () => gapMs.current, onReady: setSettled }),
  );
  const { rate, englishName } = env;
  const pauseMs = env.settings.speech.sentencePauseMs;
  const say = useCallback(
    async (texts: readonly string[]): Promise<boolean> => {
      generation.current += 1;
      sleeper.cancel();
      const mine = generation.current;
      speakingRef.current = true;
      setSpeaking(true);
      settle.began();
      await speakInTurn(texts, {
        speak: async (text) => {
          const current = port.current;
          if (!current) return { kind: "cancelled" };
          return current.speak(fillName(text, englishName), { rate });
        },
        pauseMs,
        sleeper,
        alive: () => mine === generation.current,
      });
      if (mine !== generation.current) return false;
      speakingRef.current = false;
      setSpeaking(false);
      settle.stopped();
      // 버리는 듣기: 이 조각이 넣은 줄을 다 읽음 — 소리 끝(spec 설계 2, 접점 표 '소리 끝')
      discard.current?.soundEnd();
      return true;
    },
    [rate, englishName, pauseMs, sleeper, settle],
  );
  const cancel = useCallback(() => {
    generation.current += 1;
    sleeper.cancel();
    if (speakingRef.current) port.current?.cancelSpeaking();
    speakingRef.current = false;
    setSpeaking(false);
    settle.stopped();
  }, [sleeper, settle]);
  // 조각이 사라질 때 이 조각이 읽던 것만 멈춘다(틀의 읽기 큐는 건드리지 않음)
  useEffect(
    () => () => {
      generation.current += 1;
      sleeper.cancel();
      settle.dispose();
      if (speakingRef.current) port.current?.cancelSpeaking();
    },
    [sleeper, settle],
  );
  /** 읽는 중이거나 읽기 뒤 듣기 쉼 중(말하기 단추를 흐리게 — 누르면 '다 읽은 뒤 눌러요'). */
  const waiting = speaking || !settled;
  /** 지금 읽는 중인가(렌더를 기다리지 않는 값 — 다시 읽기 셈이 읽는다). */
  const busy = useCallback(() => speakingRef.current, []);
  return { say, cancel, speaking, waiting, busy };
}

/** 한 번 듣기(따라 말하기 — 끝 조용함은 회화 따라 말하기 규칙). 듣는 중에 다시 누르면 듣기를 끝낸다. */
function useFollowListen(env: FollowEnv) {
  const handle = useRef<ListenHandle | undefined>(undefined);
  const [listening, setListening] = useState(false);
  /** 이 듣기에서 소리가 들어왔는가(U4-2). */
  const [soundIn, setSoundIn] = useState(false);
  useEffect(() => () => handle.current?.cancel(), []);
  const rule = talkEndRuleFor(
    { level: env.level, mode: "follow" },
    env.settings.speech,
    env.settings.talkSpeech,
  );
  /** 듣기 결과를 셈의 일로. 마이크 안 잡힘이면 "deaf"(셈의 일이 아님 — speechEventOf 는 없음을 돌려준다). */
  async function listen(
    auto = false,
  ): Promise<SpeechEvent | "deaf" | undefined> {
    if (!env.speech) return undefined;
    if (handle.current) {
      handle.current.press();
      return undefined;
    }
    const discard = env.discard;
    if (!auto) env.speech.unlockFromGesture();
    setSoundIn(false);
    // 듣는 중 표시: 층이 없으면 누른 때, 있으면 진짜가 실제로 열린 때(on.started — 버림 동안은 켜지 않음)
    const opened = () => {
      setListening(true);
      env.onListening(true);
    };
    const sound = () => setSoundIn(true);
    let current: ListenHandle;
    if (!discard) {
      opened();
      current = env.speech.listen(rule, { sound });
    } else if (auto) {
      current = discard.listenAuto(rule, { sound, started: opened });
    } else {
      current = env.speech.listen(rule, { sound, started: opened });
    }
    handle.current = current;
    const outcome = await current.outcome;
    handle.current = undefined;
    setListening(false);
    setSoundIn(false);
    env.onListening(false);
    if (deafListenOf(outcome)) return "deaf";
    return speechEventOf(outcome);
  }
  return { listen, listening, soundIn, capAt: () => handle.current?.capAt };
}

/** 따라 말하기 한 차례의 결과(저장 몫). */
type Tried = { heard: string[]; failures: number };

/**
 * 따라 말하기 한 번(듣기 → 판정 → 결과 말). 들음이면 결과 말을 돌려주고, 건너뜀(인식 실패 상한)이면 "skip", 다시면 undefined.
 * 막힌 판정(마이크 · 말소리)은 틀이 안내를 그린다.
 */
function useFollowTry(env: FollowEnv) {
  const { listen, listening, soundIn, capAt } = useFollowListen(env);
  const [message, setMessage] = useState("");
  /** 이 차례에서 마이크 안 잡힘이 이어진 수(deafStreakOf — 차례마다 새 카드라 새로 센다). */
  const deafStreak = useRef(0);
  async function tryOnce(
    target: string,
    auto = false,
  ): Promise<
    | { kind: "heard"; text: string; rate: number; phrase: ResultPhrase }
    | { kind: "skip" }
    | { kind: "retry" }
    /** 마이크 안 잡힘이 speech.deaf_skip_after 번 이어짐 — 기술 사유 건너뜀(셈 없음). */
    | { kind: "deaf-skip" }
    /** 버리는 듣기: 마이크 안 잡힘 뒤 누름 없이 다시 듣는다(F10). */
    | { kind: "recover" }
    /** 버리는 듣기: 끊긴 연결 — 다시 누를 수 있게 들려줄 말을 다시 읽힌다. */
    | { kind: "offline" }
    | undefined
  > {
    const event = await listen(auto);
    if (!event) return undefined;
    const deaf = deafStreakOf(
      deafStreak.current,
      event === "deaf",
      env.settings.speech.deafSkipAfter,
    );
    deafStreak.current = deaf.streak;
    if (event === "deaf") {
      // 마이크 안 잡힘: 틀의 셈 · 이 차례의 실패 수(건너뜀)에 넣지 않고 같은 차례를 이어 간다(잠정 11-06). 이어지면 기술 사유로 다음(fix 2)
      if (deaf.over) {
        setMessage(FOLLOW_TEXT.micDeafSkip);
        return { kind: "deaf-skip" };
      }
      if (env.discard) {
        // 버리는 듣기: 안내는 층 view 의 '잠깐만요, 마이크를 다시 켤게요'(discardLineOf)
        setMessage("");
        return { kind: "recover" };
      }
      setMessage(FOLLOW_TEXT.micDeaf);
      return undefined;
    }
    const verdict = env.onSpeech(event);
    if (verdict === "heard" && event.type === "heard") {
      setMessage("");
      const text = event.text.trim();
      const rate = bestMatchRate([target], text, {
        homophones: env.homophones,
        nameSlot: "any-word",
      });
      return {
        kind: "heard",
        text,
        rate,
        phrase: resultPhraseOf(rate, env.settings.matchPhraseLevels),
      };
    }
    if (verdict === "skip") {
      // 말없이 휙 넘어가지 않게 한 줄 안내(U4-4 — 부르는 쪽이 speech.skip_notice_seconds 뒤 넘김)
      setMessage(FOLLOW_TEXT.skipped);
      return { kind: "skip" };
    }
    if (verdict === "retry") {
      setMessage(TEACHER_TEXT.notHeard(env.teacherName));
      return { kind: "retry" };
    }
    if (verdict === "offline") {
      setMessage(FOLLOW_TEXT.offline);
      if (env.discard) return { kind: "offline" };
    }
    return undefined;
  }
  /**
   * 한 번 따라 말하기(버리는 듣기의 회복 포함): 회복이면 누름 없이 다시 듣고, 다시 말할 차례면 층에 들려줄 말(따라 할 글)을 다시 읽힌다(again). 층이 없으면
   * tryOnce 한 번과 같다.
   */
  async function tryFollow(target: string) {
    let auto = false;
    for (;;) {
      const out = await tryOnce(target, auto);
      const next = followDiscardAfterOf(out?.kind ?? "none");
      if (next === "recover") {
        auto = true;
        continue;
      }
      if (next === "again") env.discard?.again(target);
      if (out?.kind === "recover" || out?.kind === "offline") return undefined;
      return out;
    }
  }
  return { tryFollow, listening, soundIn, capAt, message, setMessage };
}

/**
 * 버리는 듣기의 따라 말하기 흐림(spec 설계 2 · M-5): '버림부터'에서 쉬는 중이면 들려줄 말을 같은 쉼에서 한 번만 다시 읽고(followRereadStep),
 * 진짜를 열 수 있을 때까지 흐림을 돌려준다(followDiscardDimOf). 층이 없거나 듣지 않는 장이면 흐림 없음 · 다시 읽기 없음.
 */
function useFollowDiscardDim(
  env: Pick<FollowEnv, "discard">,
  {
    follow,
    busy,
    reread,
  }: { follow: boolean; busy: () => boolean; reread: () => void },
): boolean {
  const view = follow ? env.discard?.view : undefined;
  const reopenIdle = view?.reopenIdle === true;
  const step = useRef(FOLLOW_REREAD_START);
  const [done, setDone] = useState(false);
  const again = useRef(reread);
  again.current = reread;
  useEffect(() => {
    const next = followRereadStep(step.current, {
      reopenIdle,
      busy: busy(),
    });
    step.current = next.state;
    setDone(next.state.done);
    if (next.reread) again.current();
  }, [reopenIdle, busy]);
  return followDiscardDimOf(view, done);
}

/** 남은 차례가 없으면(이어 열기 — 다 저장됨) 바로 다음 토막. */
function FollowEnd({ onDone }: { onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  const called = useRef(false);
  useEffect(() => {
    if (called.current) return;
    called.current = true;
    done.current();
  }, []);
  return null;
}

/** 정리 한 줄(되짚을 말 · 끝인사). */
export type WrapLine = { en: string; ko?: string };

function WrapCard({
  index,
  lines,
  env,
  follow,
  farewell = false,
  all = false,
  onNext,
}: {
  index: number;
  /** 한 말풍선에 보이고 읽을 줄(1~3단계는 되짚을 말 전체, 4단계부터 · 끝인사는 한 줄). */
  lines: readonly WrapLine[];
  env: FollowEnv;
  /** 따라 말하기(1~3단계 되짚을 말). 따라 할 글은 줄을 이은 것이다. */
  follow: boolean;
  farewell?: boolean;
  /** 되짚을 말 전체를 한 번에(새 흐름 — 화면 표지 data-wrap-all). */
  all?: boolean;
  onNext: () => void;
}) {
  const texts = lines.map((l) => l.en);
  const target = texts.join(" ");
  const sayer = useSayer(env);
  const { tryFollow, listening, soundIn, capAt, message } = useFollowTry(env);
  useFollowCardWord(env, target);
  const [phrase, setPhrase] = useState<ResultPhrase | undefined>();
  const [skipping, setSkipping] = useState(false);
  const [typed, setTyped] = useState(false);
  const [read, setRead] = useState(false);
  const tried = useRef<Tried>({ heard: [], failures: 0 });
  const moved = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const next = useRef(onNext);
  next.current = onNext;
  const autoMs = env.settings.autoNextSeconds * MS_PER_SECOND;

  // biome-ignore lint/correctness/useExhaustiveDependencies: 줄마다 한 번(key 로 새로 그림)
  useEffect(() => {
    void sayer.say(texts).then((ok) => {
      if (ok) setRead(true);
    });
    return () => {
      window.clearTimeout(timer.current);
      sayer.cancel();
    };
  }, []);
  // 들어올 때 읽기(위 효과)가 먼저 돌아 그 읽기를 첫 쉼의 읽기로 센다
  const discardDim = useFollowDiscardDim(env, {
    follow,
    busy: sayer.busy,
    reread: () => void sayer.say(texts),
  });
  const discardLine = discardLineOf(env.discard?.view, { listening, soundIn });

  function moveOn(delayMs: number) {
    if (moved.current) return;
    moved.current = true;
    timer.current = window.setTimeout(() => next.current(), delayMs);
  }

  // 따라 말하지 않는 줄(4단계부터 · 끝인사)은 다 흐르고 읽은 뒤 저절로 다음
  // biome-ignore lint/correctness/useExhaustiveDependencies: 흐름 · 읽기가 끝난 때 한 번
  useEffect(() => {
    if (!follow && typed && read) moveOn(autoMs);
  }, [follow, typed, read]);

  async function speak() {
    if (moved.current) return;
    sayer.cancel();
    const out = await tryFollow(target);
    if (!out || out.kind === "retry") {
      if (out) tried.current.failures += 1;
      return;
    }
    const at = {
      segment: "wrap_up" as const,
      round: 0,
      index,
      target,
    };
    if (out.kind === "deaf-skip") {
      // 기술 사유 건너뜀: 실패 수를 올리지 않고 사유(mic_deaf)만 남긴 뒤 안내 시간 뒤 다음(fix 2)
      setSkipping(true);
      env.saveFollow(at, tried.current, "mic_deaf");
      moveOn(env.settings.speech.skipNoticeMs);
      return;
    }
    if (out.kind === "skip") {
      tried.current.failures += 1;
      setSkipping(true);
      env.saveFollow(at, tried.current, "recognition");
      moveOn(env.settings.speech.skipNoticeMs);
      return;
    }
    tried.current.heard.push(out.text);
    setPhrase(out.phrase);
    if (out.phrase === "good") env.onPraise();
    env.saveFollow(at, tried.current);
    moveOn(autoMs);
  }

  const ko = lines.flatMap((l) => (l.ko ? [l.ko] : [])).join(" ");
  const content: BubbleContent = {
    sentences: texts,
    ...(ko ? { ko } : {}),
    done: true,
  };
  return (
    <div
      data-talk-wrap=""
      data-wrap-farewell={farewell ? "" : undefined}
      data-wrap-all={all ? "" : undefined}
      className="flex flex-col gap-5"
    >
      <div className="min-w-0">
        <ToriBubble
          content={content}
          englishName={env.englishName}
          teacherName={env.teacherName}
          onAllTyped={setTyped}
          onReplay={() => {
            env.speech?.unlockFromGesture();
            // 다시 읽기가 처음 읽기를 끊어도 그 끝에서 '다 읽음'을 세운다 — 따라 말하지 않는 장이 저절로 넘어가게(검토 b3 I-1)
            void sayer.say(texts).then((ok) => {
              if (ok) setRead(true);
            });
          }}
        />
      </div>
      {follow ? (
        <div className="flex flex-col items-center gap-3 border-t-2 border-dashed border-ink/30 pt-4">
          <GuideLine>{TEACHER_TEXT.followGuide(env.teacherName)}</GuideLine>
          <StatusLine
            tone={
              phrase === "good"
                ? "ok"
                : message && !skipping && !discardLine
                  ? "error"
                  : "info"
            }
          >
            {phrase && !message ? (
              <span data-follow-result="">{RESULT_PHRASES[phrase]}</span>
            ) : skipping ? (
              <span data-follow-skipped="">{message}</span>
            ) : discardLine ? (
              <span data-discard-line="">{discardLine}</span>
            ) : (
              message
            )}
          </StatusLine>
          <SpeakButton
            label={FOLLOW_TEXT.speak}
            listening={listening}
            soundIn={soundIn}
            // 토리 글이 흐르거나 읽는 동안 · 읽기 뒤 듣기 쉼 동안 흐리게(누르면 '다 읽은 뒤 눌러요' — C166 R2, 화면 검토 b3 M-1 의 '글이 다 흐른 뒤'를 포함, T-125)
            // 버리는 듣기: 진짜를 열 수 있을 때까지 더 흐리게(문구는 같은 '다 읽은 뒤 눌러요' — spec 설계 2 · M-5)
            waiting={!typed || sayer.waiting || discardDim}
            capAt={capAt}
            gapClassName="bg-paper"
            disabled={!env.speech || phrase !== undefined || skipping}
            onPress={() => void speak()}
          />
        </div>
      ) : null}
    </div>
  );
}

// ── 새 흐름: 짧은 준비 쪽지 · 정리 한 번(회화 plan 묶음 11) ─────────────────────

/** 짧은 준비 쪽지 한 장의 글(word · example 이 없으면 그 글을 그리지 않음). say 는 선생님이 들려줄 말이자 따라 할 글이다. */
export type PrepNoteCard = {
  word?: string;
  meaningKo: string;
  example?: string;
  imageKey?: string;
  say: string;
};

/**
 * 짧은 준비 쪽지 글(순수 함수, 3.3 짧은 준비 '쪽지 글' · '말하기' · 4절 짧은 준비 행): 1단계는 그림 · 한국어 뜻 · 소리만(영어 글 없음),
 * 2~3단계는 낱말 글을 더하고 예문 글이 없으며, 4단계부터 낱말 · 뜻 · 예문 글이다. 들려줄 말은 1~3단계 짧은 말(서버가 고른 modelLine —
 * 'An apple.' 꼴), 4단계부터 예문(비면 짧은 말). 모든 단계에서 한국어 뜻을 보인다. 짧은 준비는 대화 토막 밖의 연습이라 T2 에 어긋나지 않는다.
 */
export function prepNoteCardOf(
  w: Pick<
    PrepWordView,
    "word" | "meaningKo" | "example" | "modelLine" | "imageKey"
  >,
  { level, band }: { level: number; band: string },
): PrepNoteCard {
  const image = w.imageKey === undefined ? {} : { imageKey: w.imageKey };
  if (band === TALK_LOW_BAND)
    return {
      ...(level === LEVEL_MIN ? {} : { word: w.word }),
      meaningKo: w.meaningKo,
      ...image,
      say: w.modelLine,
    };
  const example = w.example.trim();
  return {
    word: w.word,
    meaningKo: w.meaningKo,
    ...(example === "" ? {} : { example: w.example }),
    ...image,
    say: example === "" ? w.modelLine : w.example,
  };
}

/** 짧은 준비의 남은 차례(순수 함수 — 이 자리에서 끝낸 차례를 뺀 낱말 번호, 이어 열기). */
export function prepStepsOf(
  prep: Pick<TalkLessonPrep, "words" | "done">,
): number[] {
  return prep.words.flatMap((_, i) => (prep.done.includes(i) ? [] : [i]));
}

/**
 * 쪽지에서 끝낸(저장한 — 들음 · 건너뜀) 낱말을 끝낸 차례에 더한다(순수). 막힘 판이 쪽지를 내렸다 다시 그려도 막힌 그 낱말부터 잇게(7절 막힘
 * 화면 '막힌 그 낱말' · e2e 분류 N1). 이미 있으면 그대로 돌려준다.
 */
export function prepWithDone<P extends Pick<TalkLessonPrep, "done">>(
  prep: P,
  index: number,
): P {
  return prep.done.includes(index)
    ? prep
    : { ...prep, done: [...prep.done, index] };
}

/**
 * 짧은 준비 쪽지(3.3 짧은 준비 · 4절 짧은 준비 행): 쪽지 한 장에 낱말 하나, 남은 낱말을 차례대로. 다 하면(건너뛴 낱말이 있어도 — 다 하지 않아도
 * 대화로 넘길 수 있다, 서버 advanceTalkLesson) onDone. 짧은 준비 화면에는 대화 기록 칸이 없다(4절 대화 기록 행).
 */
export function PrepNote({
  prep,
  band,
  pictures,
  env,
  onDone,
  onWordDone,
}: {
  prep: TalkLessonPrep;
  /** 단계 구간(1~3단계 쪽지 꼴 — TALK_LOW_BAND). */
  band: string;
  pictures: Record<string, PictureInfo>;
  env: FollowEnv;
  onDone: () => void;
  /** 낱말 하나를 끝내 저장함(들음 · 건너뜀) — 틀이 prep.done 에 더해 다시 그릴 때 그 뒤 낱말부터(prepWithDone). */
  onWordDone?: (index: number) => void;
}) {
  // 남은 차례는 쪽지를 그린 때 한 번 정한다(그리는 동안 틀이 done 을 늘려도 차례가 밀리지 않게 — 다시 그리면 늘어난 done 으로 다시 센다)
  const [steps] = useState(() => prepStepsOf(prep));
  const [at, setAt] = useState(0);
  const index = steps[at];
  const word = index === undefined ? undefined : prep.words[index];
  if (index === undefined || !word) return <FollowEnd onDone={onDone} />;
  const card = prepNoteCardOf(word, { level: env.level, band });
  const picture =
    card.imageKey === undefined ? undefined : pictures[card.imageKey];
  return (
    <PrepCard
      key={`${prep.place}:${index}`}
      place={prep.place}
      index={index}
      card={card}
      {...(picture?.src ? { picture } : {})}
      env={env}
      {...(onWordDone ? { onSaved: () => onWordDone(index) } : {})}
      onNext={() => {
        env.onNextItem();
        if (at + 1 < steps.length) setAt(at + 1);
        else onDone();
      }}
    />
  );
}

function PrepCard({
  place,
  index,
  card,
  picture,
  env,
  onSaved,
  onNext,
}: {
  place: TalkLessonPrep["place"];
  index: number;
  card: PrepNoteCard;
  picture?: PictureInfo;
  env: FollowEnv;
  /** 이 낱말을 저장함(들음 · 건너뜀). */
  onSaved?: () => void;
  onNext: () => void;
}) {
  const sayer = useSayer(env);
  const { tryFollow, listening, soundIn, capAt, message } = useFollowTry(env);
  useFollowCardWord(env, card.say);
  const [phrase, setPhrase] = useState<ResultPhrase | undefined>();
  const [heard, setHeard] = useState<string | undefined>();
  const [skipping, setSkipping] = useState(false);
  const [failures, setFailures] = useState(0);
  const tried = useRef<Tried>({ heard: [], failures: 0 });
  const moved = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const next = useRef(onNext);
  next.current = onNext;

  // 들어올 때 선생님이 들려줄 말을 읽는다(3.3 짧은 준비 '말하기')
  // biome-ignore lint/correctness/useExhaustiveDependencies: 차례마다 한 번(key 로 새로 그림)
  useEffect(() => {
    void sayer.say([card.say]);
    return () => {
      window.clearTimeout(timer.current);
      sayer.cancel();
    };
  }, []);
  // 들어올 때 읽기(위 효과)가 먼저 돌아 그 읽기를 첫 쉼의 읽기로 센다
  const discardDim = useFollowDiscardDim(env, {
    follow: true,
    busy: sayer.busy,
    reread: () => void sayer.say([card.say]),
  });
  const discardLine = discardLineOf(env.discard?.view, { listening, soundIn });

  function moveOn(delayMs: number) {
    if (moved.current) return;
    moved.current = true;
    timer.current = window.setTimeout(() => next.current(), delayMs);
  }

  const at: FollowSaveAt = {
    segment: "prep",
    round: 0,
    index,
    target: card.say,
    place,
  };

  async function speak() {
    if (moved.current) return;
    sayer.cancel();
    const out = await tryFollow(card.say);
    if (!out) return;
    if (out.kind === "deaf-skip") {
      // 기술 사유 건너뜀: 실패 수를 올리지 않고 사유(mic_deaf)만 남긴 뒤 안내 시간 뒤 다음 낱말(fix 2)
      setSkipping(true);
      env.saveFollow(at, tried.current, "mic_deaf");
      onSaved?.();
      moveOn(env.settings.speech.skipNoticeMs);
      return;
    }
    if (out.kind === "retry") {
      tried.current.failures += 1;
      setFailures(tried.current.failures);
      return;
    }
    if (out.kind === "skip") {
      tried.current.failures += 1;
      setFailures(tried.current.failures);
      setSkipping(true);
      env.saveFollow(at, tried.current, "recognition");
      onSaved?.();
      moveOn(env.settings.speech.skipNoticeMs);
      return;
    }
    tried.current.heard.push(out.text);
    setHeard(out.text);
    setPhrase(out.phrase);
    if (out.phrase === "good") env.onPraise();
    env.saveFollow(at, tried.current);
    onSaved?.();
    // 결과 말을 ui.auto_next_seconds 보인 뒤 결과와 관계없이 다음(C39)
    moveOn(env.settings.autoNextSeconds * MS_PER_SECOND);
  }

  return (
    <div
      data-prep-note=""
      data-prep-step={`${place}:${index}`}
      data-follow-failures={failures}
      data-skipping={skipping ? "" : undefined}
      className="flex flex-col gap-5"
    >
      <GuideLine className="font-heading text-[26px]">
        {TEACHER_TEXT.followGuide(env.teacherName)}
      </GuideLine>
      <div
        data-prep-card=""
        className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-3 bg-postit-talk px-8 pt-9 pb-7 text-center shadow-postit"
      >
        <span
          aria-hidden
          className="absolute -top-3 left-1/4 h-6 w-28 -translate-x-1/2 -rotate-3 bg-tape"
        />
        {picture ? <VocabPicture picture={picture} /> : null}
        {card.word !== undefined ? (
          <p
            data-prep-word=""
            lang="en"
            className="font-en text-[44px] font-bold leading-tight"
          >
            {card.word}
          </p>
        ) : null}
        <p data-prep-meaning="" className={CHILD_SIZE.guide}>
          {card.meaningKo}
        </p>
        {card.example !== undefined ? (
          <EnglishLine className="font-en font-bold">
            <span data-prep-example="">
              {fillName(card.example, env.englishName)}
            </span>
          </EnglishLine>
        ) : null}
        {/* 들려줄 말 다시 듣기(1단계는 글이 없어 소리만 — 글 없는 듣기 단추, 접근 이름은 말풍선 다시 듣기와 같음) */}
        <button
          type="button"
          data-prep-replay=""
          aria-label={TEACHER_TEXT.replay(env.teacherName)}
          disabled={listening}
          onClick={() => {
            env.speech?.unlockFromGesture();
            void sayer.say([card.say]);
          }}
          className={cn(
            FOCUS_RING,
            CHILD_SIZE.target,
            "inline-flex items-center justify-center rounded-full border-2 border-ink bg-paper disabled:opacity-50",
          )}
        >
          <Volume2 aria-hidden className="size-6" />
        </button>
      </div>
      {/* 아이 말풍선에 인식 글, 그 아래 결과 말(3.3 짧은 준비 '말하기' · 4절) */}
      {heard ? <ChildBubble text={heard} /> : null}
      <StatusLine
        className="justify-center"
        tone={
          phrase === "good"
            ? "ok"
            : message && !skipping && !discardLine
              ? "error"
              : "info"
        }
      >
        {phrase && !message ? (
          <span data-follow-result="">{RESULT_PHRASES[phrase]}</span>
        ) : skipping ? (
          <span data-follow-skipped="">{message}</span>
        ) : discardLine ? (
          <span data-discard-line="">{discardLine}</span>
        ) : (
          message
        )}
      </StatusLine>
      <SpeakButton
        label={FOLLOW_TEXT.speak}
        listening={listening}
        soundIn={soundIn}
        // 선생님이 읽는 동안과 읽기 뒤 듣기 쉼 동안 흐리게(누르면 '다 읽은 뒤 눌러요', R2 · 7절), 쉼이 지나면 켬(T-125 — iPad 읽기 직후 듣기 no-speech)
        // 버리는 듣기: 진짜를 열 수 있을 때까지 더 흐리게(같은 문구 — spec 설계 2 · M-5)
        waiting={sayer.waiting || discardDim}
        capAt={capAt}
        gapClassName="bg-paper"
        disabled={!env.speech || phrase !== undefined || skipping}
        onPress={() => void speak()}
      />
    </div>
  );
}

/** 정리 따라 말하기(순수 함수, 3.3 정리 문단): 1~3단계는 되짚을 말 전체를 한 번(차례 0, 줄을 이은 글), 4단계부터 · 되짚을 말이 없으면 없음. */
export function lessonWrapFollowOf(
  lines: readonly WrapLine[],
  lowLevel: boolean,
): { index: number; target: string } | null {
  if (!lowLevel || lines.length === 0) return null;
  return { index: 0, target: lines.map((l) => l.en).join(" ") };
}

/**
 * 새 흐름 정리(3.3 정리 문단 · 4절 정리 행 · C167 (1)): 되짚을 말 전체를 한 말풍선으로 보이고 읽는다. 1~3단계는 말하기 단추 하나로 한 번 따라
 * 말한다(결과 말만 — '말했다' 아님). 다 하면 끝맺음 상태를 한 번 보고(와 있으면 그 끝인사, 아니면 카드 끝인사) 끝인사를 한 번 읽은 뒤 마무리로.
 */
export function LessonWrapUp({
  lines,
  farewell,
  env,
  closingFarewell,
  onDone,
}: {
  lines: readonly WrapLine[];
  farewell: WrapLine;
  env: FollowEnv;
  /** 끝맺음 끝인사(와 있으면 — talkClosingStatus 한 번). */
  closingFarewell: () => Promise<WrapLine | undefined>;
  onDone: () => void;
}) {
  const [linesDone, setLinesDone] = useState(lines.length === 0);
  const [bye, setBye] = useState<WrapLine | null>(null);
  const asked = useRef(false);
  const ask = useRef(closingFarewell);
  ask.current = closingFarewell;

  // 되짚을 말을 다 하면 끝인사를 고른다(한 번)
  useEffect(() => {
    if (!linesDone || asked.current) return;
    asked.current = true;
    void ask
      .current()
      .catch(() => undefined)
      .then((closing) => setBye(closing ?? farewell));
  }, [linesDone, farewell]);

  if (!linesDone) {
    const follow = lessonWrapFollowOf(lines, env.lowLevel);
    return (
      <WrapCard
        key="lines"
        index={follow?.index ?? 0}
        lines={lines}
        env={env}
        follow={follow !== null}
        all
        onNext={() => {
          env.onNextItem();
          setLinesDone(true);
        }}
      />
    );
  }
  return bye ? (
    <WrapCard
      key="farewell"
      index={-1}
      lines={[bye]}
      env={env}
      follow={false}
      farewell
      onNext={onDone}
    />
  ) : (
    <div data-talk-wrap="" />
  );
}
