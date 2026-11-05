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
import { CHILD_TURN_TEXT, ChildBubble } from "./child-turn";
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
};

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
  skipped?: "recognition",
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
  env: Pick<FollowEnv, "speech" | "rate" | "englishName" | "settings">,
) {
  const port = useRef(env.speech);
  port.current = env.speech;
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
  return { say, cancel, speaking, waiting };
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
  async function listen(): Promise<SpeechEvent | undefined> {
    if (!env.speech) return undefined;
    if (handle.current) {
      handle.current.press();
      return undefined;
    }
    env.speech.unlockFromGesture();
    setSoundIn(false);
    setListening(true);
    env.onListening(true);
    const current = env.speech.listen(rule, { sound: () => setSoundIn(true) });
    handle.current = current;
    const outcome = await current.outcome;
    handle.current = undefined;
    setListening(false);
    setSoundIn(false);
    env.onListening(false);
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
  async function tryOnce(
    target: string,
  ): Promise<
    | { kind: "heard"; text: string; rate: number; phrase: ResultPhrase }
    | { kind: "skip" }
    | { kind: "retry" }
    | undefined
  > {
    const event = await listen();
    if (!event) return undefined;
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
    if (verdict === "offline") setMessage(FOLLOW_TEXT.offline);
    return undefined;
  }
  return { tryOnce, listening, soundIn, capAt, message, setMessage };
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
  const { tryOnce, listening, soundIn, capAt, message } = useFollowTry(env);
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
    const out = await tryOnce(target);
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
              phrase === "good" ? "ok" : message && !skipping ? "error" : "info"
            }
          >
            {phrase && !message ? (
              <span data-follow-result="">{RESULT_PHRASES[phrase]}</span>
            ) : skipping ? (
              <span data-follow-skipped="">{message}</span>
            ) : (
              message
            )}
          </StatusLine>
          <SpeakButton
            label={FOLLOW_TEXT.speak}
            listening={listening}
            soundIn={soundIn}
            // 토리 글이 흐르거나 읽는 동안 · 읽기 뒤 듣기 쉼 동안 흐리게(누르면 '다 읽은 뒤 눌러요' — C166 R2, 화면 검토 b3 M-1 의 '글이 다 흐른 뒤'를 포함, T-125)
            waiting={!typed || sayer.waiting}
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
 * 짧은 준비 쪽지(3.3 짧은 준비 · 4절 짧은 준비 행): 쪽지 한 장에 낱말 하나, 남은 낱말을 차례대로. 다 하면(건너뛴 낱말이 있어도 — 다 하지 않아도
 * 대화로 넘길 수 있다, 서버 advanceTalkLesson) onDone. 짧은 준비 화면에는 대화 기록 칸이 없다(4절 대화 기록 행).
 */
export function PrepNote({
  prep,
  band,
  pictures,
  env,
  onDone,
}: {
  prep: TalkLessonPrep;
  /** 단계 구간(1~3단계 쪽지 꼴 — TALK_LOW_BAND). */
  band: string;
  pictures: Record<string, PictureInfo>;
  env: FollowEnv;
  onDone: () => void;
}) {
  const steps = prepStepsOf(prep);
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
  onNext,
}: {
  place: TalkLessonPrep["place"];
  index: number;
  card: PrepNoteCard;
  picture?: PictureInfo;
  env: FollowEnv;
  onNext: () => void;
}) {
  const sayer = useSayer(env);
  const { tryOnce, listening, soundIn, capAt, message } = useFollowTry(env);
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
    const out = await tryOnce(card.say);
    if (!out) return;
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
      moveOn(env.settings.speech.skipNoticeMs);
      return;
    }
    tried.current.heard.push(out.text);
    setHeard(out.text);
    setPhrase(out.phrase);
    if (out.phrase === "good") env.onPraise();
    env.saveFollow(at, tried.current);
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
          phrase === "good" ? "ok" : message && !skipping ? "error" : "info"
        }
      >
        {phrase && !message ? (
          <span data-follow-result="">{RESULT_PHRASES[phrase]}</span>
        ) : skipping ? (
          <span data-follow-skipped="">{message}</span>
        ) : (
          message
        )}
      </StatusLine>
      <SpeakButton
        label={FOLLOW_TEXT.speak}
        listening={listening}
        soundIn={soundIn}
        // 선생님이 읽는 동안과 읽기 뒤 듣기 쉼 동안 흐리게(누르면 '다 읽은 뒤 눌러요', R2 · 7절), 쉼이 지나면 켬(T-125 — iPad 읽기 직후 듣기 no-speech)
        waiting={sayer.waiting}
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
