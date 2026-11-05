"use client";

// 말하기 1~2 세션 조각(3.3 말하기 · 4절 말하기 세션 행 · 7절 인식 규칙 · AC-5b · 5c · 5e · 5f · N3, plan-p11a 값 12 · 정할 것 마 (3)~(5) ·
// 13절 C38 · C39 · C53 · C77). 따라 말하기 · 듣기 이해 · 1~2단계 질문 답(앱 판정)과 처음 마이크 안내. 녹음하지 않는다(브라우저 인식만,
// P2b SpeechPort). 판정은 서버와 같은 순수 함수(judge.ts · match-rate.ts — 위험 2), 결과 말 경계 · 저절로 넘김 초 · 허용 답 기준 ·
// 재시도 수는 설정(틀이 넘김). 인식 실패 셈은 틀이 쥔 speakingCounters 에 맡긴다(onSpeech — 막힌 안내 · 알림도 틀이 한다).
// 조각은 끝을 onDone(끝 내용) 하나로 알린다(값 2: heard · failures · skipped? · echo? · tries). 정본 밖 문구는 plan 표(C78) 글자 그대로.
// 13절 C166(UX 검토 U4-2 · U4-3 · U4-4 · R2): 듣는 동안 단추 글 '듣고 있어요' · 소리 들어옴 표시, 따라 말하기는 들어올 때 읽기 · '다시 듣기'가
// 도는 동안 단추를 흐리게(누르면 '다 읽은 뒤 눌러요'), 인식이 speech.max_retries 번 안 돼 건너뛸 때 '이건 다음에 다시 해요'를
// speech.skip_notice_seconds 보인 뒤 넘어간다.
// UI · UX 묶음 5-나(spec 2판 R-57 · 설계 4 N-19 · AC-23a (5)): 듣기 이해 문항 · 따라 말하기 본보기를 한 번도 들려주지 못하면 그 자리에 안내 한 줄과
// 큰 '다시 듣기', 다시도 못 들려주면 무음 모드 줄(아이패드 사파리)과 작은 '다음'(sound-retry). 들려주지 못한 채 받은 답 · '다음'은 끝 시도에
// 기술 오류(techError "speak_fail", 시도 꼴 판 2 — speakFailFields)를 단다. 질문 답도 인식 글을 따라 말하기와 같은 줄(HeardLine — data-heard)로
// 다음 활동까지 남긴다(정본 4절 인식 결과 표시 · AC-23f · L-33).
// 가르치는 수업(가르치고 배우는 수업 plan 묶음 라-3 · 정한 것 5 · 6 · 7 · 델타 spec 설계 1 '틀린 뒤 차례' 말하기 행 · 같이 해 보기 S5~S7 · 5 화면 표 ·
// 8 · 10, 정본 4절 말하기 세션 행 · AC-5d): 조각마다 teach(혼자 · 짝)를 받으면 — 따라 말하기는 첫 시도 결과 말이 '잘 말했어요'가 아니면 '왜'
// (앱 문구 '끊어서 다시 들어 봐요.') → '한 번 더 말하기' → 시드 chunks 로 끊어 들려준 뒤 다시(상한 없음 · 점수는 가장 높은 일치율). 듣기 이해는
// 처음 틀리면 '왜'(시드) → '한 번 더 풀기' → 대본을 다시 들려주고 답 덩어리(retryHighlight)를 speech.slow_rate_factor 만큼 천천히, 둘째 틀림은
// 정답. 질문 답(JudgedQuestionActivity)은 이야기 화면(글자 없이 소리만 · 저절로 한 번 · '다시 듣기' 한 번 · 소리가 안 나면 sound-retry) 뒤 영어
// 질문과 뜻, 판정은 앱(1~2단계 혼자 · 질문 짝 — 의미 검사와 허용 답 두 묶음) 또는 서버 액션 evaluateSpeakingAnswer(3단계부터 혼자 — AI, 기다림
// 표시, 같은 시도 id 다시 보냄). 부분 · 다시면 '왜'(시드) → 바른 답 들려주기 → '같이 말해 볼까요' → 한 번 말하면 결과 말 없이 다음(틀린 곳을
// 짚지 않음 · 판정 글자 없음). 짝은 혼자 문항과 같은 화면이고 처음 맞으면 '혼자 해냈어요!', 틀리면 바른 답을 들려주고 끝(같은 문제 다시 없음).
// 같이 해 보기 말하기(SpeakingTogetherInput)는 라-1 같이 해 보기 틀의 children 이다. 1~3단계는 바른 답 들려주기만 하고 발음을 고치지 않는다.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  EnglishLine,
  GuideLine,
  type PictureLookup,
} from "@/components/activities/common";
import { ChoiceAnswer, SoundButton } from "@/components/answer/choice";
import {
  SPEAK_BUTTON_TEXT,
  SpeakButton,
  useSpeakingPort,
} from "@/components/answer/speak-button";
import { BigButton, SmallButton, StatusLine } from "@/components/board/board";
import { useIpadSafari } from "@/components/session/mic-blocked";
import {
  ReadingTogetherChoices,
  type TogetherMark,
  teachQuestionStageOf,
} from "@/components/session/reading";
import {
  SoundRetry,
  soundRetryStepOf,
  soundTechErrorOf,
  useSoundCheck,
} from "@/components/session/sound-retry";
import { StoryScreen } from "@/components/session/teach/story";
import {
  TEACH_TEXT,
  type TeachLineEnd,
  type TeachSpeechSettings,
  voicedSpeech,
} from "@/components/session/teach/teacher-line";
import { WhyBubble } from "@/components/session/teach/why-bubble";
import { WaitHint } from "@/components/session/wait-hint";
import type { DisplayItem } from "@/core/answer/display";
import type { Listening } from "@/core/seed/schema/lesson";
import { speakFailFields } from "@/core/session/attempt";
import {
  judgedQuestionStageOf,
  type QuestionVerdict,
  type RepeatTeachStage,
  repeatTeachStageOf,
} from "@/core/session/teach-frame";
import {
  judgeAppAnswer,
  judgeableQuestion,
  judgeSpeakingQuestion,
  RESULT_PHRASES,
  type ResultPhrase,
  resultPhraseOf,
  type SpeakingJudgement,
  type SpeechEvent,
  type SpeechVerdict,
  speechEventOf,
} from "@/core/speaking/judge";
import type { MeaningWord } from "@/core/speaking/meaning";
import {
  type AnswerShape,
  endRuleFor,
  type SpeechSettings,
} from "@/core/speech/listen";
import { bestMatchRate } from "@/core/speech/match-rate";
import type { TeacherView } from "@/core/teacher/roster";
import { piecesSpeech } from "@/lib/speech/pieces";
import type { ListenHandle, SpeechPort } from "@/lib/speech/types";

/** 조각 글(4절 · 7절 · 3.3 · 정본 밖 문구 표 a 행, C78). */
export const SPEAKING_TEXT = {
  speak: "말하기",
  oneMore: "한 번 더 말하기",
  next: "다음",
  retry: "다시 한 번 말해 볼까요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  together: "같이 말해 볼까요",
  listenAgain: "한 번 더 듣기",
  right: "맞았어요!",
  answerIs: "정답은 이거예요",
  micNotice:
    "말한 소리는 인터넷으로 보내 글자로 바꿔요. 소리는 저장하지 않아요",
  micOk: "알겠어요",
  /** 인식이 speech.max_retries 번 안 돼 건너뜀(U4-4). */
  skipped: SPEAK_BUTTON_TEXT.skipped,
  /** 활동 첫 줄 안내(plan-p11a 정본 밖 문구 표 a 행 — 컨트롤러 2026-10-18 fix 4 · review-p11-4-design M-3). */
  guide: {
    repeat: "잘 듣고 따라 말해 봐요",
    listening: "잘 듣고 알맞은 것을 골라요",
    question: "질문을 듣고 영어로 대답해 봐요",
  },
} as const;

/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;
/** 끊어 들려줄 조각 목록을 한 글로 이을 때의 구분(접점을 다시 만들지 판단하는 열쇠 — 시드 글에 없는 글자). */
const CHUNK_JOIN = "\u0000";

/** 실패 갈래(셈이 그 활동을 건너뛰게 한 판정 · 다시 듣기 판정). */
const FAILURE_VERDICTS: ReadonlySet<SpeechVerdict> = new Set([
  "retry",
  "skip",
  "speech-silent",
]);

/** 말하기 조각이 함께 받는 것(틀이 view.config 에서 넘김). */
export type SpeakingEnv = {
  speech: SpeechPort | undefined;
  speechSettings: SpeechSettings;
  level: number;
  homophones: string[][];
  /** 인식 결과를 틀의 셈에 넣고 판정을 받는다(막힌 안내 · 알림은 틀이 한다). */
  onSpeech: (event: SpeechEvent) => SpeechVerdict;
};

/**
 * 가르치는 수업 말하기 조각의 자료(세션 틀이 준다 — 묶음 라-3). solo 혼자 문항 · spare 짝(다른 예시). 없으면 지금 C77 흐름 그대로다.
 * '왜' 한 줄은 선생님 줄이라 초상 · 음성 설정 · 줄 끝 셈(무음 모드 줄 — 설계 10)을 함께 받는다.
 */
export type SpeakingTeach = {
  mode: "solo" | "spare";
  teacher: TeacherView | null;
  speechSettings: TeachSpeechSettings;
  onLineEnd?: (end: TeachLineEnd) => void;
};

/**
 * 선생님이 보이는 영어(델타 spec 설계 4 목소리 표 — 따라 말하기 본보기 · 질문 · 바른 답, 마-1 voiceFor teacher_en)를 읽는 접점: 가르치는 수업이면
 * 고른 선생님의 영어 목소리(voicedSpeech — 높이 · 목소리 순서, 고르기 전이면 기본 목소리), 아니면 세션 접점 그대로다. 글 자료(듣기 대본 · 이야기)는
 * 이 접점을 쓰지 않는다(지금 목소리 — fix 1 M1).
 */
export function teacherEnglishSpeech(
  speech: SpeechPort | undefined,
  teach: { teacher: TeacherView | null } | undefined,
): SpeechPort | undefined {
  if (!speech || !teach) return speech;
  return voicedSpeech(speech, teach.teacher);
}

/** teacherEnglishSpeech 를 그림마다 새로 만들지 않는다(접점 · 선생님 키가 같으면 같은 접점 — 읽기 효과가 다시 돌지 않게). */
function useTeacherEnglish(
  speech: SpeechPort | undefined,
  teach: { teacher: TeacherView | null } | undefined,
): SpeechPort | undefined {
  const teaching = teach !== undefined;
  const teacherKey = teach?.teacher?.key;
  const teachRef = useRef(teach);
  teachRef.current = teach;
  // biome-ignore lint/correctness/useExhaustiveDependencies: 선생님은 ref 로 읽고 고유 키가 바뀔 때만 새로 감싼다
  return useMemo(
    () => teacherEnglishSpeech(speech, teaching ? teachRef.current : undefined),
    [speech, teaching, teacherKey],
  );
}

/** 한 번 듣기. 듣는 중에 다시 부르면 듣기를 끝낸다(7절 '말하기 버튼은 어느 규칙에서나 듣기를 끝낸다'). */
function useListen(speech: SpeechPort | undefined) {
  const handle = useRef<ListenHandle | undefined>(undefined);
  const [listening, setListening] = useState(false);
  /** 이 듣기에서 소리가 들어왔는가(단추의 소리 들어옴 표시 — U4-2). */
  const [soundIn, setSoundIn] = useState(false);
  useEffect(() => () => handle.current?.cancel(), []);
  async function listen(
    rule: ReturnType<typeof endRuleFor>,
  ): Promise<SpeechEvent | undefined> {
    if (!speech) return undefined;
    if (handle.current) {
      handle.current.press();
      return undefined;
    }
    speech.unlockFromGesture();
    // 읽어 주는 중에 누르면 읽어 주기를 멈추고 듣는다(C53 (2))
    speech.cancelSpeaking();
    setSoundIn(false);
    setListening(true);
    const current = speech.listen(rule, { sound: () => setSoundIn(true) });
    handle.current = current;
    const outcome = await current.outcome;
    handle.current = undefined;
    setListening(false);
    setSoundIn(false);
    return speechEventOf(outcome);
  }
  /** 지금 듣기의 상한 시각(남은 시간 고리 — P2b ListenHandle.capAt). */
  const capAt = () => handle.current?.capAt;
  return { listen, listening, soundIn, capAt };
}

/** 건너뜀 안내 뒤 넘김(U4-4): 안내를 speech.skip_notice_seconds 보인 뒤 한 번 부른다. 조각이 사라지면 타이머를 지운다. */
function useSkipNotice(noticeMs: number) {
  const [skipping, setSkipping] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function skipThen(done: () => void) {
    setSkipping(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(done, noticeMs);
  }
  return { skipping, skipThen };
}

/** 처음 마이크를 쓸 때 기기마다 한 번(P10 MIC_NOTICE_KEY 를 같이 씀 — 틀이 본 표시를 남김). */
export function MicNotice({ onOk }: { onOk: () => void }) {
  return (
    <div data-mic-notice="" className="flex flex-col items-center gap-8 py-6">
      <p className="text-center font-heading text-[28px] leading-snug">
        {SPEAKING_TEXT.micNotice}
      </p>
      <BigButton onClick={onOk}>{SPEAKING_TEXT.micOk}</BigButton>
    </div>
  );
}

/**
 * 인식 글 한 줄(정본 4절 '인식 결과 표시' · AC-23f): 따라 말하기 · 질문 답이 같이 쓰고 다음 활동까지 남긴다(틀린 낱말 표시 없음). 표지 data-heard.
 * 가르치고 라-3 이 AI 질문 · 같이 해 보기 말하기 화면을 다시 만들 때도 이 줄(같은 표지)을 다음 문항까지 둔다(L-33).
 */
export function HeardLine({ text }: { text: string | undefined }) {
  if (text === undefined) return null;
  return (
    <p
      data-heard=""
      lang="en"
      className="rounded-xl border-2 border-dashed border-ink bg-paper px-5 py-3 text-2xl"
    >
      {text}
    </p>
  );
}

export type RepeatInput = {
  heard: string[];
  failures: number;
  /** '왜' 뒤 '한 번 더 말하기'를 눌렀나(가르치는 수업 — 되살릴 때 끊어 들려주기 단계로). */
  retrying?: boolean;
};

/**
 * 따라 말하기(C77 (4)): 목표 · 들어올 때 한 번 읽기 · '다시 듣기' · '말하기' → 인식 글(틀린 낱말 표시 없음) · 결과 말 셋.
 * '잘 말했어요'면 ui.auto_next_seconds 뒤 저절로 다음, 아니면 '한 번 더 말하기'(큰) · '다음'(작은), 횟수 상한 없음.
 * 가르치는 수업(teach — 묶음 라-3): 혼자 문항은 첫 시도 결과 말이 '잘 말했어요'가 아니면 '왜'(앱 문구 '끊어서 다시 들어 봐요.')와
 * '한 번 더 말하기' → 시드 chunks 로 끊어 들려준 뒤 다시(그 뒤는 지금 규칙, '다시 듣기'도 끊어 읽음). 짝은 처음 '잘 말했어요'면
 * '혼자 해냈어요!' 뒤 저절로 다음, 아니면 바른 답(따라 말할 글)을 들려주고 '다음'(같은 문제 다시 없음).
 */
export function RepeatActivity({
  text,
  env,
  phraseLevels,
  autoNextSeconds,
  guide = SPEAKING_TEXT.guide.repeat,
  ringGapClassName,
  initial,
  teach,
  onChange,
  onDone,
}: {
  text: string;
  env: SpeakingEnv;
  phraseLevels: readonly number[];
  autoNextSeconds: number;
  /** 첫 줄 안내(없으면 따라 말하기 안내 — 쓰기 '내 문장 듣고 따라 말하기'가 바꿈, plan-p11b 값 7). */
  guide?: string;
  /** 말하기 단추 고리 틈 색(바탕 카드색 — 없으면 말하기 분홍, 쓰기 카드는 하늘). */
  ringGapClassName?: string;
  initial?: RepeatInput;
  /** 가르치는 수업(chunks 는 끊어 들려줄 조각 — 낱말 · 짝은 글 하나). */
  teach?: SpeakingTeach & { chunks: readonly string[] };
  onChange: (input: RepeatInput) => void;
  onDone: (
    input: { heard: string[]; failures: number } & {
      skipped?: "recognition" | "silent";
    } & Partial<typeof speakFailFields>,
  ) => void;
}) {
  const [heard, setHeard] = useState<string[]>(initial?.heard ?? []);
  const [failures, setFailures] = useState(initial?.failures ?? 0);
  const [retrying, setRetrying] = useState(initial?.retrying ?? false);
  const [message, setMessage] = useState("");
  const { listen, listening, soundIn, capAt } = useListen(env.speech);
  // 따라 말하기 본보기는 선생님이 보이는 영어(가르치는 수업 — 설계 4 목소리 표)
  const english = useTeacherEnglish(env.speech, teach);
  // 들어올 때 읽기 · '다시 듣기'가 도는 동안(R2 — 단추를 흐리게)
  const { port: readPort, speaking: reading } = useSpeakingPort(english);
  // 본보기를 들려줬는가(R-57 — 들어올 때 읽기 · '다시 듣기' · 큰 '다시 듣기'를 모두 이 접점으로)
  const { port: soundPort, track } = useSoundCheck(readPort, text);
  const trackNow = useRef(track);
  trackNow.current = track;
  const ipadSafari = useIpadSafari();
  const { skipping, skipThen } = useSkipNotice(env.speechSettings.skipNoticeMs);
  const phraseOf = (said: string | undefined): ResultPhrase | undefined =>
    said === undefined
      ? undefined
      : resultPhraseOf(
          bestMatchRate([text], said, {
            homophones: env.homophones,
            nameSlot: "any-word",
          }),
          phraseLevels,
        );
  const last = heard.at(-1);
  const phrase = phraseOf(last);
  const teachStage: RepeatTeachStage | undefined = teach
    ? repeatTeachStageOf({
        mode: teach.mode,
        heardCount: heard.length,
        firstGood: phraseOf(heard[0]) === "good",
        retrying,
      })
    : undefined;
  // 끊어 들려주는 접점(같은 문제 다시 — 조각 사이 speech.sentence_pause_ms). 조각 글이 같으면 같은 접점이라 읽기 효과가 다시 돌지 않는다
  const chunkKey = teach?.chunks.join(CHUNK_JOIN) ?? "";
  const pauseMs = env.speechSettings.sentencePauseMs;
  // biome-ignore lint/correctness/useExhaustiveDependencies: 조각 목록은 그림마다 새 배열이라 이은 글(chunkKey)로 본다
  const chunkPort = useMemo(() => {
    const chunks = teach?.chunks ?? [];
    if (!soundPort || chunks.length < 2) return soundPort;
    return piecesSpeech(
      soundPort,
      () => chunks.map((chunk) => ({ text: chunk })),
      pauseMs,
    );
  }, [soundPort, chunkKey, pauseMs]);
  /** 지금 들려주는 접점: 같은 문제 다시부터는 끊어 들려준다(바뀌면 '다시 듣기' 단추가 저절로 한 번 읽는다). */
  const playPort = retrying ? chunkPort : soundPort;
  const finished = useRef(false);
  const finish = (input: Parameters<typeof onDone>[0]) => {
    if (finished.current) return;
    finished.current = true;
    // 본보기를 한 번도 들려주지 못한 채 끝낸 시도는 기술 오류(R-57 — 한 번이라도 들려줬으면 보통대로)
    onDone(
      soundTechErrorOf(trackNow.current)
        ? { ...input, ...speakFailFields }
        : input,
    );
  };
  const soundStep = soundRetryStepOf(track, { canSkip: true });

  // '잘 말했어요'면 저절로 다음(4절 · C39) — 새 인식 글이 올 때마다 한 번 잰다
  // biome-ignore lint/correctness/useExhaustiveDependencies: 시도(인식 글 수)마다 한 번만 잰다
  useEffect(() => {
    if (phrase !== "good") return;
    const timer = window.setTimeout(
      () => finish({ heard, failures }),
      autoNextSeconds * MS_PER_SECOND,
    );
    return () => window.clearTimeout(timer);
  }, [phrase, heard.length]);

  // 짝도 틀리면 바른 답(따라 말할 글)을 들려주고 끝(설계 1 '다른 예시' — 같은 문제 다시 없음)
  const spareWrong = teachStage === "spare-wrong";
  // biome-ignore lint/correctness/useExhaustiveDependencies: 짝 틀림 단계에 들어올 때 한 번만 읽는다
  useEffect(() => {
    if (spareWrong) void soundPort?.speak(text);
  }, [spareWrong]);

  async function speak() {
    const event = await listen(
      endRuleFor(
        { area: "speaking", level: env.level, answer: "one-sentence" },
        env.speechSettings,
      ),
    );
    if (!event) return;
    const verdict = env.onSpeech(event);
    const nextFailures = FAILURE_VERDICTS.has(verdict)
      ? failures + 1
      : failures;
    setFailures(nextFailures);
    if (verdict === "heard" && event.type === "heard") {
      const next = [...heard, event.text.trim()];
      setHeard(next);
      setMessage("");
      onChange({ heard: next, failures: nextFailures, retrying });
      return;
    }
    if (verdict === "retry") setMessage(SPEAKING_TEXT.retry);
    if (verdict === "offline") setMessage(SPEAKING_TEXT.offline);
    if (verdict === "skip") {
      // 말없이 휙 넘어가지 않게 한 줄 안내 뒤(U4-4)
      setMessage(SPEAKING_TEXT.skipped);
      skipThen(() =>
        finish({ heard, failures: nextFailures, skipped: "recognition" }),
      );
    }
    if (verdict === "speech-silent")
      finish({ heard, failures: nextFailures, skipped: "silent" });
  }

  const speakButton = (label: string, className?: string) => (
    <SpeakButton
      {...(className ? { className } : {})}
      label={label}
      listening={listening}
      soundIn={soundIn}
      waiting={reading}
      capAt={capAt}
      disabled={!env.speech}
      {...(ringGapClassName ? { gapClassName: ringGapClassName } : {})}
      onPress={() => void speak()}
    />
  );
  const spareRight = teachStage === "spare-right";
  let action: React.ReactNode = null;
  if (skipping) action = null;
  else if (teachStage === "why" && teach)
    // '왜'는 화면을 바꾸지 않고 같은 문항에(초상은 이때만 — 설계 4 · 5). 큰 단추는 판 안 아래
    action = (
      <WhyBubble
        whyKo={TEACH_TEXT.whyRepeat}
        retry="speak"
        teacher={teach.teacher}
        speech={env.speech}
        speechSettings={teach.speechSettings}
        onLineEnd={teach.onLineEnd}
        onRetry={() => {
          setRetrying(true);
          onChange({ heard, failures, retrying: true });
        }}
      />
    );
  else if (spareWrong)
    action = (
      <BigButton
        className="self-end"
        onClick={() => finish({ heard, failures })}
      >
        {SPEAKING_TEXT.next}
      </BigButton>
    );
  else if (phrase === undefined || message)
    action = speakButton(SPEAKING_TEXT.speak);
  else if (phrase !== "good")
    // '한 번 더 말하기'의 고리 자리(바깥 12px)를 가로로만 걷어 단추 끝을 내용 끝에 맞추고, 그만큼 틈을 넓혀 보이는 간격은 그대로
    // (화면 검토 review-p11-5-design M-6 · fix 4 N-2 — 위아래 간격 · 가운데 놓인 '말하기'는 그대로)
    action = (
      <div className="flex flex-wrap items-center justify-end gap-7">
        <SmallButton onClick={() => finish({ heard, failures })}>
          {SPEAKING_TEXT.next}
        </SmallButton>
        {speakButton(SPEAKING_TEXT.oneMore, "-mx-3")}
      </div>
    );

  return (
    <div
      data-repeat-activity=""
      data-skipping={skipping ? "" : undefined}
      data-phrase={phrase ?? ""}
      data-failures={failures}
      data-listening={listening ? "" : undefined}
      data-sound-heard={track.last}
      data-teach-stage={teachStage}
      data-chunked={retrying && chunkPort !== soundPort ? "" : undefined}
      className="flex flex-1 flex-col gap-5"
    >
      <GuideLine>{guide}</GuideLine>
      <SoundButton speech={playPort} text={text} />
      {/* 따라 말할 글은 화면의 할 일이라 크게(36px — 화면 검토 M-3, 4절 '영어 24px 이상') */}
      <EnglishLine className="font-bold text-[36px] leading-tight">
        {text}
      </EnglishLine>
      <HeardLine text={last} />
      <StatusLine tone={phrase === "good" ? "ok" : "info"}>
        {message ||
          (spareRight
            ? TEACH_TEXT.spareRight
            : phrase
              ? RESULT_PHRASES[phrase]
              : "")}
      </StatusLine>
      {/* 가르치는 수업은 큰 단추 줄을 판 안 아래에(설계 5.4), 지금 화면은 그대로(검토된 배치) */}
      {teach && action ? (
        <div className="mt-auto flex flex-col">{action}</div>
      ) : (
        action
      )}
      {/* 본보기를 들려주지 못함(N-19 — 판 안 아래 줄, 저절로 넘기지 않음) */}
      {/* (건너뜀 안내 · '잘 말했어요' 저절로 넘김 · '왜' 중에는 두지 않고, 조각의 '다음'이 이미 있으면 작은 '다음'을 겹쳐 두지 않는다) */}
      {skipping || phrase === "good" || teachStage === "why" ? null : (
        <SoundRetry
          step={soundStep}
          ipadSafari={ipadSafari}
          onReplay={() => {
            playPort?.unlockFromGesture();
            void playPort?.speak(text);
          }}
          {...((phrase === undefined || message) && !spareWrong
            ? { onNext: () => finish({ heard, failures }) }
            : {})}
        />
      )}
    </div>
  );
}

export type ListeningInput = {
  tries: number[];
  retrying?: boolean;
  /** 첫 답을 대본을 한 번도 들려주지 못한 채 골랐다(R-57 — 되살릴 때도 남김). */
  techError?: "speak_fail";
};

/** 듣기 이해 문항(시드 듣기 꼴 + 가르치는 수업 칸 — '왜' · 천천히 읽을 답 덩어리. 짝은 retryHighlight 가 없다). */
export type ListeningItemOf = Listening & {
  whyKo?: string | undefined;
  retryHighlight?: string | undefined;
};

/** 듣기 이해의 가르치는 수업 자료: 답 덩어리를 천천히 읽는 빠르기(speech.rate.<구간> × speech.slow_rate_factor) · 조각 사이 쉼. */
export type ListeningTeach = SpeakingTeach & {
  slowRate: number;
  pauseMs: number;
};

/**
 * 듣기 이해(C77 (3)): 대본을 들어올 때 한 번 읽기 · '다시 듣기' · 보기. 처음 틀리면 '한 번 더 듣기' 한 번 뒤 정답. 대본 글은 안 보인다.
 * 가르치는 수업(teach — 묶음 라-3 · 설계 1 듣기 이해 행): 처음 틀리면 '왜'(시드 whyKo)와 '한 번 더 풀기' → 같은 문제 다시에서 대본을 다시
 * 들려주고 답 덩어리(retryHighlight)를 천천히 읽는다 → 둘째 틀림은 정답. 짝은 처음 맞으면 '혼자 해냈어요!', 틀리면 정답과 짝의 '왜' 한 줄로 끝.
 */
export function ListeningActivity({
  item,
  level,
  pictures,
  speech,
  initial,
  teach,
  onChange,
  onDone,
}: {
  item: ListeningItemOf;
  level: number;
  pictures: PictureLookup;
  speech: SpeechPort | undefined;
  initial?: ListeningInput;
  teach?: ListeningTeach;
  onChange: (input: ListeningInput) => void;
  onDone: (
    input: { tries: number[] } & Partial<typeof speakFailFields>,
  ) => void;
}) {
  const [tries, setTries] = useState<number[]>(initial?.tries ?? []);
  const [retrying, setRetrying] = useState(initial?.retrying ?? false);
  const [techError, setTechError] = useState(initial?.techError);
  /** 짝도 틀린 '왜' 줄이 멈췄나('다음'은 선생님이 줄을 읽은 뒤 밝다 — 라-2 fix 1 과 같은 꼴). */
  const [spareWhyDone, setSpareWhyDone] = useState(false);
  // 대본을 들려줬는가(R-57 — 보기 조각의 읽기 · '다시 듣기' · 큰 '다시 듣기'를 모두 이 접점으로)
  const { port: soundPort, track } = useSoundCheck(speech, item.script);
  const ipadSafari = useIpadSafari();
  const slowAnswer = teach?.mode === "solo" ? item.retryHighlight : undefined;
  const slowRate = teach?.slowRate;
  const pauseMs = teach?.pauseMs ?? 0;
  // 같은 문제 다시: 대본 뒤 답 덩어리를 천천히 한 번 더(설계 1 — 대본은 단계 구간 빠르기 그대로)
  const retryPort = useMemo(() => {
    if (!soundPort || slowAnswer === undefined || slowRate === undefined)
      return soundPort;
    return piecesSpeech(
      soundPort,
      (script) => [{ text: script }, { text: slowAnswer, rate: slowRate }],
      pauseMs,
    );
  }, [soundPort, slowAnswer, slowRate, pauseMs]);
  const done = (list: number[]) =>
    onDone(techError ? { tries: list, ...speakFailFields } : { tries: list });
  const display: DisplayItem = {
    type: "listening",
    script: item.script,
    ...(item.kind === "text" && item.prompt ? { prompt: item.prompt } : {}),
    choices: item.options.map((option) =>
      item.kind === "picture"
        ? { kind: "picture", picture: pictures.ofWord(option) }
        : { kind: "text", text: option },
    ),
  };
  const right = tries.at(-1) === item.answerNo;
  const plainStage =
    tries.length === 0 || (retrying && tries.length === 1)
      ? "ask"
      : right
        ? "right"
        : tries.length >= 2
          ? "reveal"
          : "wrong";
  const teachStage = teach
    ? teachQuestionStageOf(teach.mode, tries, item.answerNo, retrying)
    : undefined;
  // 가르치는 수업의 단계를 지금 화면 단계로(짝이 틀린 때도 정답을 보인다)
  const stage =
    teachStage === undefined
      ? plainStage
      : teachStage === "ask"
        ? "ask"
        : teachStage === "right" || teachStage === "spare-right"
          ? "right"
          : teachStage === "why"
            ? "wrong"
            : "reveal";
  const whyKo = teach ? item.whyKo : undefined;
  const reveal =
    stage === "ask"
      ? undefined
      : stage === "wrong"
        ? { picked: tries[0] }
        : { answerNo: item.answerNo, picked: tries.at(-1) };
  // 처음 고른 오답은 다시 고를 때 · 정답 보기에서도 ✕ 로 남는다(컨트롤러 결정 — 읽기 문항과 같은 꼴)
  const struck =
    tries.length > 0 && tries[0] !== item.answerNo ? [tries[0] ?? 0] : [];
  const soundStep =
    stage === "ask" ? soundRetryStepOf(track, { canSkip: true }) : "none";
  const again = retrying || tries.length >= 2;
  // 큰 단추 자리: 가르치는 수업은 판 안 아래(설계 5.4), 지금 화면은 그대로(검토된 배치)
  const actionClass = teach ? "mt-auto self-end" : "self-end";
  const playPort = teach?.mode === "solo" && again ? retryPort : soundPort;
  const retry = () => {
    setRetrying(true);
    onChange({
      tries,
      retrying: true,
      ...(techError ? { techError } : {}),
    });
  };
  return (
    <div
      data-listening-stage={stage}
      data-teach-stage={teachStage}
      data-sound-heard={track.last}
      data-slow-answer={again && playPort !== soundPort ? "" : undefined}
      className="flex flex-1 flex-col gap-5"
    >
      <GuideLine>{SPEAKING_TEXT.guide.listening}</GuideLine>
      <ChoiceAnswer
        // 다시 들을 때 새로(대본을 다시 한 번 읽음 — 가르치는 수업은 답 덩어리를 천천히 더함)
        key={again ? "again" : "first"}
        item={display as Extract<DisplayItem, { type: "listening" }>}
        level={level}
        speech={playPort}
        instant
        onChange={() => {}}
        reveal={reveal}
        struck={struck}
        onAnswer={(answer) => {
          if (answer.kind !== "choice") return;
          const next = [...tries, answer.no];
          // 점수는 첫 답 — 첫 답을 들려주지 못한 채 골랐으면 기술 오류(R-57)
          const tech = tries.length === 0 ? soundTechErrorOf(track) : techError;
          setTries(next);
          setRetrying(false);
          setTechError(tech);
          onChange({
            tries: next,
            retrying: false,
            ...(tech ? { techError: tech } : {}),
          });
        }}
      />
      {stage === "right" ? (
        <StatusLine tone="ok">
          {teachStage === "spare-right"
            ? TEACH_TEXT.spareRight
            : SPEAKING_TEXT.right}
        </StatusLine>
      ) : null}
      {stage === "reveal" ? (
        <StatusLine>{SPEAKING_TEXT.answerIs}</StatusLine>
      ) : null}
      {/* '왜'(시드)는 화면을 바꾸지 않고 같은 문항에, 단추는 판 안 아래(설계 5 · 5.4) */}
      {teach && stage === "wrong" && whyKo ? (
        <div className="mt-auto">
          <WhyBubble
            whyKo={whyKo}
            retry="solve"
            teacher={teach.teacher}
            speech={speech}
            speechSettings={teach.speechSettings}
            onLineEnd={teach.onLineEnd}
            onRetry={retry}
          />
        </div>
      ) : null}
      {stage === "wrong" && !whyKo ? (
        <BigButton className={actionClass} onClick={retry}>
          {SPEAKING_TEXT.listenAgain}
        </BigButton>
      ) : null}
      {/* 짝도 틀리면 정답과 짝의 '왜' 한 줄만(다시 없음 — 설계 1) */}
      {teach && teachStage === "spare-wrong" && whyKo ? (
        <WhyBubble
          whyKo={whyKo}
          teacher={teach.teacher}
          speech={speech}
          speechSettings={teach.speechSettings}
          onLineEnd={(end) => {
            teach.onLineEnd?.(end);
            setSpareWhyDone(true);
          }}
        />
      ) : null}
      {stage === "right" || stage === "reveal" ? (
        <BigButton
          className={actionClass}
          data-teach-next={teachStage === "spare-wrong" ? "" : undefined}
          disabled={
            teachStage === "spare-wrong" && Boolean(whyKo) && !spareWhyDone
          }
          onClick={() => done(tries)}
        >
          {SPEAKING_TEXT.next}
        </BigButton>
      ) : null}
      {/* 대본을 들려주지 못함(N-19 — 판 안 아래 줄, 저절로 넘기지 않음). 답 없이 '다음'이면 기술 오류 끝 시도 */}
      <SoundRetry
        step={soundStep}
        ipadSafari={ipadSafari}
        onReplay={() => {
          playPort?.unlockFromGesture();
          void playPort?.speak(item.script);
        }}
        onNext={() =>
          tries.length === 0
            ? onDone({ tries, ...speakFailFields })
            : done(tries)
        }
      />
    </div>
  );
}

export type QuestionAnswerInput = {
  heard: string[];
  failures: number;
  echo?: string;
};

/**
 * 1~2단계 질문 답(앱 판정 — C38 · C77 (5)): 영어 질문을 읽은 뒤(읽기가 안 되는 기기면 바로) 1~4단계 한국어 뜻(showKo, C39).
 * '말하기' → 허용 답 판정. 맞으면 '잘 말했어요' + '다음'(저절로 넘기지 않음). 다시면 바른 답 문장을 영어 줄로 보이며 들려주고
 * '같이 말해 볼까요' → 한 번 말하면 결과 말 없이 다음. 판정 글자(맞음 · 틀림 · 일치율)는 보이지 않는다(AC-5d).
 */
export function QuestionAnswerActivity({
  question,
  showKo,
  env,
  answerShape,
  capSeconds,
  pass,
  initial,
  onChange,
  onDone,
}: {
  question: {
    en: string;
    ko?: string;
    modelAnswer?: string;
    accepted?: string[];
  };
  showKo: boolean;
  env: SpeakingEnv;
  answerShape: AnswerShape;
  capSeconds: number;
  pass: number;
  initial?: QuestionAnswerInput;
  onChange: (input: QuestionAnswerInput) => void;
  onDone: (
    input: QuestionAnswerInput & { skipped?: "recognition" | "silent" },
  ) => void;
}) {
  const [heard, setHeard] = useState<string[]>(initial?.heard ?? []);
  const [failures, setFailures] = useState(initial?.failures ?? 0);
  const [message, setMessage] = useState("");
  const [koShown, setKoShown] = useState(false);
  const { listen, listening, soundIn, capAt } = useListen(env.speech);
  const { skipping, skipThen } = useSkipNotice(env.speechSettings.skipNoticeMs);
  const accepted = question.accepted ?? [];
  const first = heard[0];
  const correct =
    first !== undefined && accepted.length > 0
      ? judgeAppAnswer(first, accepted, { pass, homophones: env.homophones })
          .correct
      : undefined;
  const stage = first === undefined ? "ask" : correct ? "right" : "echo";
  const model = question.modelAnswer ?? accepted.at(-1) ?? "";
  const rule = endRuleFor(
    { area: "speaking", level: env.level, answer: answerShape, capSeconds },
    env.speechSettings,
  );

  // 영어 질문을 읽은 뒤 한국어 뜻(읽기가 안 되는 기기면 바로)
  useEffect(() => {
    if (!env.speech) {
      setKoShown(true);
      return;
    }
    let live = true;
    void env.speech.speak(question.en).then(() => {
      if (live) setKoShown(true);
    });
    return () => {
      live = false;
    };
  }, [env.speech, question.en]);

  // '같이 말해 볼까요' 단계에 들어가면 바른 답 문장을 들려준다
  useEffect(() => {
    if (stage === "echo" && model) void env.speech?.speak(model);
  }, [stage, model, env.speech]);

  async function speak() {
    const event = await listen(rule);
    if (!event) return;
    const verdict = env.onSpeech(event);
    const nextFailures = FAILURE_VERDICTS.has(verdict)
      ? failures + 1
      : failures;
    setFailures(nextFailures);
    if (verdict === "heard" && event.type === "heard") {
      const text = event.text.trim();
      setMessage("");
      if (stage === "echo") {
        // 한 번 말하면 결과 말 없이 다음
        onDone({ heard, failures: nextFailures, echo: text });
        return;
      }
      const next = [...heard, text];
      setHeard(next);
      onChange({ heard: next, failures: nextFailures });
      return;
    }
    if (verdict === "retry") setMessage(SPEAKING_TEXT.retry);
    if (verdict === "offline") setMessage(SPEAKING_TEXT.offline);
    if (verdict === "skip") {
      setMessage(SPEAKING_TEXT.skipped);
      skipThen(() =>
        onDone({ heard, failures: nextFailures, skipped: "recognition" }),
      );
    }
    if (verdict === "speech-silent")
      onDone({ heard, failures: nextFailures, skipped: "silent" });
  }

  return (
    <div
      data-question-answer-stage={stage}
      data-skipping={skipping ? "" : undefined}
      data-failures={failures}
      data-listening={listening ? "" : undefined}
      className="flex flex-col gap-5"
    >
      <GuideLine>{SPEAKING_TEXT.guide.question}</GuideLine>
      <SoundButton speech={env.speech} text={question.en} autoPlay={false} />
      <EnglishLine className="font-bold text-[28px]">{question.en}</EnglishLine>
      {showKo && question.ko && koShown ? (
        <div data-question-ko="">
          <GuideLine>{question.ko}</GuideLine>
        </div>
      ) : null}
      {/* 인식 글(L-33 · AC-23f — 따라 말하기와 같은 줄 · 표지, 다음 활동까지 남김) */}
      <HeardLine text={first} />
      {stage === "echo" ? (
        <div data-model-answer="" className="flex flex-col gap-3">
          {/* 아이가 따라 말할 글 — 따라 말하기 목표와 같은 36px(질문 28px 보다 크게, 화면 재검토 review-p11-fix4-design N-1) */}
          <EnglishLine className="font-bold text-[36px] leading-tight">
            {model}
          </EnglishLine>
          <GuideLine>{SPEAKING_TEXT.together}</GuideLine>
        </div>
      ) : null}
      <StatusLine tone={stage === "right" ? "ok" : "info"}>
        {message || (stage === "right" ? RESULT_PHRASES.good : "")}
      </StatusLine>
      {stage === "right" ? (
        <BigButton
          className="self-end"
          onClick={() => onDone({ heard, failures })}
        >
          {SPEAKING_TEXT.next}
        </BigButton>
      ) : skipping ? null : (
        <SpeakButton
          label={SPEAKING_TEXT.speak}
          listening={listening}
          soundIn={soundIn}
          capAt={capAt}
          disabled={!env.speech}
          onPress={() => void speak()}
        />
      )}
    </div>
  );
}

// ── 가르치는 수업 · AI 판정 질문 답(묶음 라-3) ──

/** 이야기 화면이 넘기는 사실(라-1 StoryScreen 결과 + 다시 해 보기 안내로 들려준 것). */
export type StoryHeard = { heard: boolean; replayed: boolean };

/**
 * 이야기 화면(델타 spec 설계 5 혼자 해 보기 · 다른 예시 행, 표본 S11 · S14 · 설계 10 · AC-N20): 라-1 StoryScreen(글자 없이 소리만 · 저절로 한 번 ·
 * '다시 듣기' 한 번 · '다음')에 소리를 못 들려준 때의 다시 해 보기 안내(UI · UX 5-나 sound-retry — 안내 · 큰 '다시 듣기' · 두 번째부터 무음 모드 줄)를
 * 붙인다. 이야기는 글 자료라 세션 접점(지금 목소리)으로 읽는다. 들었는지는 StoryScreen 셈과 감싼 접점 셈 가운데 하나라도 소리가 났으면 참이다.
 * '다음'은 StoryScreen 의 것 하나라 다시 해 보기 안내에는 작은 '다음'을 두지 않는다.
 */
export function TeachStory({
  storyEn,
  speech,
  onNext,
}: {
  storyEn: string;
  speech: SpeechPort | undefined;
  onNext: (result: StoryHeard) => void;
}) {
  const { port, track } = useSoundCheck(speech, storyEn);
  const ipadSafari = useIpadSafari();
  return (
    <div
      data-teach-story-slot=""
      data-sound-heard={track.last}
      className="flex flex-1 flex-col gap-6"
    >
      <StoryScreen
        storyEn={storyEn}
        speech={port}
        onNext={(result) =>
          onNext({
            heard: result.heard || track.everHeard,
            replayed: result.replayed,
          })
        }
      />
      <SoundRetry
        step={soundRetryStepOf(track, { canSkip: true })}
        ipadSafari={ipadSafari}
        onReplay={() => {
          port?.unlockFromGesture();
          void port?.speak(storyEn);
        }}
      />
    </div>
  );
}

/** 판정하는 질문 하나(혼자 질문 · 질문 짝 공통 칸 — 시드 그대로). */
export type JudgedQuestion = {
  en: string;
  ko?: string | undefined;
  modelAnswer?: string | undefined;
  accepted?: readonly string[] | undefined;
  acceptedMeaning?: readonly string[] | undefined;
  storyEn?: string | undefined;
  whyKo?: string | undefined;
};

/** AI 판정 요청(서버 액션 evaluateSpeakingAnswer 의 세션 · 활동 번호 밖 칸 — 같은 시도 id 는 다시 보내도 저장한 결과). */
export type AiAnswerRequest = {
  clientAttemptId: string;
  transcript: string;
  failures: number;
  story?: { replayed: boolean };
  techError?: "speak_fail";
  /** '같이 말해 볼까요' 뒤 말(같은 시도 id 로 다시 부를 때 — 저장된 끝 시도에 합친다). */
  echo?: string;
};

/** AI 판정 결과(서버 액션의 돌려줌 꼴 — 판정은 반응을 고르는 데만 쓰고 글로 그리지 않는다, AC-5d). */
export type AiAnswerOutcome =
  | {
      ok: true;
      judgement: SpeakingJudgement;
      feedback: string | null;
      correctSentence: string;
      grammarNotes: string[];
    }
  | { ok: false; reason: string };
type AiAnswer = Extract<AiAnswerOutcome, { ok: true }>;

/**
 * 판정 길: 앱(1~2단계 혼자 질문 — 허용 답 일치율, 서버 questionResult 와 같은 함수) · 의미(질문 짝 — 의미 검사와 허용 답 두 묶음,
 * spareQuestionResult 와 같은 함수 · 화면 자료 view.meaningWords) · AI(3단계부터 혼자 질문 — 서버 액션, 기다림 표시 ui.wait_hint_seconds).
 */
export type QuestionJudgeBy =
  | { by: "app"; pass: number }
  | { by: "meaning"; pass: number; words: readonly MeaningWord[] }
  | {
      by: "ai";
      evaluate: (request: AiAnswerRequest) => Promise<AiAnswerOutcome>;
      waitHintSeconds: readonly [number, number];
    };

/** 되살릴 활동 안 입력(기기 저장소). attemptId 는 AI 판정 시도 id(다시 보낼 때 같은 id). */
export type JudgedQuestionInput = {
  heard: string[];
  failures: number;
  story?: StoryHeard;
  retrying?: boolean;
  attemptId?: string;
};

/**
 * AI 길에서 서버 액션이 저장한 끝 시도(세션 틀이 이 기기의 짝 고르기에 같은 함수로 넣는다 — L-34 의 기기 몫): 저장한 내용, 합친 판정(판정 없이
 * 넘어갔으면 없음), '같이 말해 볼까요' 뒤 말.
 */
export type ServerSavedQuestion = {
  final: QuestionFinal;
  judgement?: SpeakingJudgement;
  echo?: string;
};

/** 대기열로 보내는 끝 시도 내용(시도 꼴 question 칸 그대로 — 판정 칸은 서버가 다시 쓴다). */
export type QuestionFinal = {
  heard: string[];
  failures: number;
  skipped?: "recognition" | "silent";
  echo?: string;
  story?: { replayed: boolean };
} & Partial<typeof speakFailFields>;

/**
 * 질문 답 끝 시도 내용(대기열 길 — 시도 꼴 question 칸, 판정 칸은 서버가 다시 쓴다): 이야기 다시 듣기(story.replayed — 델타 spec 설계 9),
 * 이야기를 소리로 듣지 못했으면 기술 오류(판 2 techError speak_fail — 설계 10 · C179 (2)).
 */
export function questionFinalOf(
  input: { heard: string[]; failures: number; story?: StoryHeard | undefined },
  extra: Partial<QuestionFinal> = {},
): QuestionFinal {
  return {
    heard: input.heard,
    failures: input.failures,
    ...(input.story ? { story: { replayed: input.story.replayed } } : {}),
    ...(input.story && !input.story.heard ? speakFailFields : {}),
    ...extra,
  };
}

/**
 * 판정하는 질문 답(정본 4절 말하기 세션 행 · plan-p11c 값 4 의 질문 답 몫 · 델타 spec 설계 1 · 5 · 8 · 10). 가르치는 수업이면 이야기 화면부터,
 * 다음 화면에서 영어 질문(읽어 줌)과 1~4단계 뜻(이야기 글 없음) · '말하기' → 인식 글(HeardLine, 다음 활동까지) → 판정. 맞으면 '잘 말했어요'
 * (짝은 '혼자 해냈어요!')와 '다음'(AI 피드백 한 문장은 맞음이고 합친 판정이 AI 와 같을 때만 — 정한 것 6). 맞음이 아니면 혼자는 '왜'(시드) → '한 번 더
 * 말하기' → 바른 답(시드)을 보이며 들려주고 '같이 말해 볼까요' → 한 번 말하면 결과 말 없이 다음, 짝은 '왜'와 바른 답을 들려주고 '다음'으로 끝.
 * 판정 글자(맞음 · 틀림 · 일치율)는 보이지 않는다(AC-5d). 이야기를 소리로 듣지 못한 채 낸 답은 판정 없이 기술 오류(U)로 끝낸다(설계 10).
 * AI 길은 서버 액션이 끝 시도를 저장하므로 끝을 onServerSaved(저장된 내용 · 합친 판정 · 같이 말해 볼까요 뒤 말)로 알리고, 'AI 쉬는 중'이면
 * onAiResting.
 */
export function JudgedQuestionActivity({
  question,
  showKo,
  env,
  answerShape,
  capSeconds,
  judge,
  teach,
  initial,
  onChange,
  onDone,
  onServerSaved,
  onAiResting,
}: {
  question: JudgedQuestion;
  showKo: boolean;
  env: SpeakingEnv;
  answerShape: AnswerShape;
  capSeconds: number;
  judge: QuestionJudgeBy;
  teach?: SpeakingTeach;
  initial?: JudgedQuestionInput;
  onChange: (input: JudgedQuestionInput) => void;
  /** 대기열 길의 끝(앱 · 의미 판정, 건너뜀). */
  onDone: (input: QuestionFinal) => void;
  /** AI 길의 끝(서버 액션이 끝 시도를 저장함 · 판정 없이 넘어감). echo 는 '같이 말해 볼까요' 뒤 말. */
  onServerSaved?: (saved: ServerSavedQuestion) => void;
  /** AI 길에서 하루 안전 상한('AI 쉬는 중') — 틀이 남은 AI 질문을 건너뛴다(설계 10). */
  onAiResting?: () => void;
}) {
  const [heard, setHeard] = useState<string[]>(initial?.heard ?? []);
  const [failures, setFailures] = useState(initial?.failures ?? 0);
  const [story, setStory] = useState<StoryHeard | undefined>(initial?.story);
  const [retrying, setRetrying] = useState(initial?.retrying ?? false);
  const [attemptId, setAttemptId] = useState(initial?.attemptId);
  const [ai, setAi] = useState<AiAnswer | undefined>();
  const [sendFailed, setSendFailed] = useState(false);
  /** AI 길 '같이 말해 볼까요' 뒤 말(보내는 중 · 보내지 못함 — 같은 시도 id 로 다시 보냄). */
  const [echoSending, setEchoSending] = useState<
    { text: string; failed: boolean } | undefined
  >();
  /** 판정을 보낸 때(기다림 표시 — ui.wait_hint_seconds 를 이때부터 잰다). */
  const [sentAt, setSentAt] = useState(() => performance.now());
  const [message, setMessage] = useState("");
  const [koShown, setKoShown] = useState(false);
  /** 바른 답을 들려준 뒤인가(짝 틀림의 '다음'을 밝힌다). */
  const [modelPlayed, setModelPlayed] = useState(false);
  const { listen, listening, soundIn, capAt } = useListen(env.speech);
  // 질문 · 바른 답은 선생님이 보이는 영어(가르치는 수업 — 설계 4 목소리 표), 이야기는 글 자료라 세션 접점 그대로
  const english = useTeacherEnglish(env.speech, teach);
  const { port: readPort, speaking: reading } = useSpeakingPort(english);
  const { skipping, skipThen } = useSkipNotice(env.speechSettings.skipNoticeMs);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  const first = heard[0];
  const accepted = question.accepted ?? [];
  const storyPending =
    teach !== undefined && question.storyEn !== undefined && !story;
  // 이야기를 소리로 듣지 못했으면 그 답은 기술 오류(U — 설계 10 · C179 (2))
  const techError: "speak_fail" | undefined =
    story && !story.heard ? "speak_fail" : undefined;
  const appCorrect = (said: string): boolean => {
    if (judge.by === "app")
      return (
        accepted.length > 0 &&
        judgeAppAnswer(said, accepted, {
          pass: judge.pass,
          homophones: env.homophones,
        }).correct
      );
    if (judge.by === "meaning")
      return (
        judgeableQuestion(question) &&
        judgeSpeakingQuestion(question, said, {
          pass: judge.pass,
          homophones: env.homophones,
          words: judge.words,
        }).final === "correct"
      );
    return false;
  };
  const verdict: QuestionVerdict =
    first === undefined
      ? "none"
      : techError
        ? "unscored"
        : judge.by === "ai"
          ? sendFailed
            ? "failed"
            : ai
              ? ai.judgement === "correct"
                ? "correct"
                : "wrong"
              : "pending"
          : appCorrect(first)
            ? "correct"
            : "wrong";
  const stage = judgedQuestionStageOf({
    mode: teach?.mode,
    storyPending,
    verdict,
    why: question.whyKo !== undefined,
    retrying,
  });
  /** 들려줄 바른 답: 가르치는 수업은 시드 바른 답(설계 1 '바른 답(시드)'), AI 길(지금 화면)은 서버가 고른 바른 답. */
  const model =
    judge.by === "ai" && ai && !(teach && question.modelAnswer)
      ? ai.correctSentence
      : (question.modelAnswer ??
        (judge.by === "app" ? accepted.at(-1) : accepted[0]) ??
        "");
  const rule = endRuleFor(
    { area: "speaking", level: env.level, answer: answerShape, capSeconds },
    env.speechSettings,
  );
  const storyField = story ? { story: { replayed: story.replayed } } : {};
  const finalOf = (extra: Partial<QuestionFinal> = {}): QuestionFinal =>
    questionFinalOf({ heard, failures, story }, extra);
  const save = (patch: Partial<JudgedQuestionInput>) =>
    onChange({
      heard,
      failures,
      ...(story ? { story } : {}),
      ...(retrying ? { retrying } : {}),
      ...(attemptId ? { attemptId } : {}),
      ...patch,
    });

  async function send(id: string, transcript: string, fails: number) {
    if (judge.by !== "ai") return;
    setSendFailed(false);
    setSentAt(performance.now());
    let out: AiAnswerOutcome;
    try {
      out = await judge.evaluate({
        clientAttemptId: id,
        transcript,
        failures: fails,
        ...storyField,
        ...(techError ? { techError } : {}),
      });
    } catch {
      out = { ok: false, reason: "unavailable" };
    }
    if (!alive.current) return;
    if (out.ok) setAi(out);
    else if (out.reason === "ai_resting") onAiResting?.();
    else if (out.reason === "unavailable") setSendFailed(true);
    // 판정 없이 넘어감(AI 실패 · 소리 없음 — 서버가 점수 없는 끝 시도를 저장함, 8절) · 받을 수 없는 요청
    else
      onServerSaved?.({
        final: questionFinalOf({ heard: [transcript], failures: fails, story }),
      });
  }

  /**
   * '같이 말해 볼까요' 뒤 말을 같은 시도 id 로 보낸다: 서버가 AI 를 다시 부르지 않고 저장된 그 끝 시도 행에 echo 를 한 번만 합친다(델타 spec
   * 설계 8 · 정본 3.8 '같은 행의 도움받은 시도' — 영어로 말한 문장 셈 · 근거 echo 가 그 행을 읽는다). 닿지 않으면 다시 보낸다.
   */
  async function sendEcho(text: string) {
    if (judge.by !== "ai" || !attemptId || first === undefined) {
      onServerSaved?.({ final: finalOf({ echo: text }), echo: text });
      return;
    }
    setEchoSending({ text, failed: false });
    let out: AiAnswerOutcome;
    try {
      out = await judge.evaluate({
        clientAttemptId: attemptId,
        transcript: first,
        failures,
        ...storyField,
        echo: text,
      });
    } catch {
      out = { ok: false, reason: "unavailable" };
    }
    if (!alive.current) return;
    if (!out.ok && out.reason === "unavailable") {
      setEchoSending({ text, failed: true });
      return;
    }
    onServerSaved?.({
      final: finalOf({ echo: text }),
      ...(ai ? { judgement: ai.judgement } : {}),
      echo: text,
    });
  }
  // '같이 말해 볼까요' 뒤 말을 보내지 못했으면 다시 연결될 때 같은 시도 id 로
  // biome-ignore lint/correctness/useExhaustiveDependencies: 보내지 못한 동안만 듣는다
  useEffect(() => {
    if (!echoSending?.failed) return;
    const again = () => void sendEcho(echoSending.text);
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [echoSending?.failed]);

  // 되살린 답이 아직 판정을 받지 못했으면 같은 시도 id 로 다시 보낸다(서버는 저장한 결과를 돌려준다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 화면을 열 때 한 번만 본다
  useEffect(() => {
    if (judge.by === "ai" && first !== undefined && attemptId)
      void send(attemptId, first, failures);
  }, []);
  // 보내지 못했으면 다시 연결될 때 같은 시도 id 로(7절 네트워크 행)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 보내지 못한 동안만 듣는다
  useEffect(() => {
    if (!sendFailed || first === undefined || !attemptId) return;
    const again = () => void send(attemptId, first, failures);
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [sendFailed]);

  // 영어 질문을 읽은 뒤 한국어 뜻(읽기가 안 되는 기기면 바로). 이야기 화면이 있으면 그 뒤
  useEffect(() => {
    if (storyPending) return;
    if (!english) {
      setKoShown(true);
      return;
    }
    let live = true;
    void english.speak(question.en).then(() => {
      if (live) setKoShown(true);
    });
    return () => {
      live = false;
    };
  }, [english, question.en, storyPending]);

  // '같이 말해 볼까요' 단계 · 짝 틀림('왜' 줄이 없으면 바로)에 들어가면 바른 답 문장을 들려준다
  const playModel = () => {
    if (!model) {
      setModelPlayed(true);
      return;
    }
    void (readPort ?? english)?.speak(model).then(() => {
      if (alive.current) setModelPlayed(true);
    });
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: 그 단계에 들어올 때 한 번만 읽는다
  useEffect(() => {
    if (stage === "echo") playModel();
    if (stage === "spare-wrong" && question.whyKo === undefined) playModel();
  }, [stage]);

  // 판정 없는 답(이야기를 못 들은 채 낸 답)은 결과 말 없이 끝(앱 길 — AI 길은 서버가 U 끝 시도를 저장한 뒤 넘어간다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 그 단계에 들어올 때 한 번만
  useEffect(() => {
    if (stage === "unscored" && judge.by !== "ai") onDone(finalOf());
  }, [stage]);

  async function speak() {
    const event = await listen(rule);
    if (!event) return;
    const verdictNow = env.onSpeech(event);
    const nextFailures = FAILURE_VERDICTS.has(verdictNow)
      ? failures + 1
      : failures;
    setFailures(nextFailures);
    // '같이 말해 볼까요' 뒤에는 첫 답이 이미 있다 — 건너뛰어도 그 답이 시도다(건너뜀 표시를 달지 않음)
    const finishEcho = (echo: string | undefined) => {
      if (judge.by === "ai") {
        // 말이 있으면 서버가 저장된 그 끝 시도 행에 합친다(같은 시도 id — 같은 행의 도움받은 시도, fix 1 I1)
        if (echo !== undefined) void sendEcho(echo);
        else
          onServerSaved?.({
            final: finalOf(),
            ...(ai ? { judgement: ai.judgement } : {}),
          });
      } else
        onDone(
          finalOf({
            failures: nextFailures,
            ...(echo === undefined ? {} : { echo }),
          }),
        );
    };
    if (verdictNow === "heard" && event.type === "heard") {
      const text = event.text.trim();
      setMessage("");
      if (stage === "echo") {
        // 한 번 말하면 결과 말 없이 다음
        finishEcho(text);
        return;
      }
      const next = [...heard, text];
      setHeard(next);
      if (judge.by === "ai") {
        const id = attemptId ?? crypto.randomUUID();
        setAttemptId(id);
        save({ heard: next, failures: nextFailures, attemptId: id });
        void send(id, text, nextFailures);
        return;
      }
      save({ heard: next, failures: nextFailures });
      return;
    }
    if (verdictNow === "retry") setMessage(SPEAKING_TEXT.retry);
    if (verdictNow === "offline") setMessage(SPEAKING_TEXT.offline);
    if (verdictNow === "skip") {
      setMessage(SPEAKING_TEXT.skipped);
      skipThen(() =>
        stage === "echo"
          ? finishEcho(undefined)
          : onDone(finalOf({ failures: nextFailures, skipped: "recognition" })),
      );
    }
    if (verdictNow === "speech-silent") {
      if (stage === "echo") finishEcho(undefined);
      else onDone(finalOf({ failures: nextFailures, skipped: "silent" }));
    }
  }

  if (stage === "story" && question.storyEn !== undefined)
    return (
      <div
        data-question-answer-stage="story"
        className="flex flex-1 flex-col gap-5"
      >
        <TeachStory
          storyEn={question.storyEn}
          speech={env.speech}
          onNext={(result) => {
            env.speech?.unlockFromGesture();
            setStory(result);
            save({ story: result });
          }}
        />
      </div>
    );

  const speakButton = (
    <SpeakButton
      label={SPEAKING_TEXT.speak}
      listening={listening}
      soundIn={soundIn}
      waiting={stage === "echo" && reading}
      capAt={capAt}
      disabled={!env.speech}
      onPress={() => void speak()}
    />
  );
  const next = (onClick: () => void, disabled = false) => (
    <BigButton className="self-end" disabled={disabled} onClick={onClick}>
      {SPEAKING_TEXT.next}
    </BigButton>
  );
  const finishRight = () =>
    judge.by === "ai"
      ? onServerSaved?.({
          final: finalOf(),
          ...(ai ? { judgement: ai.judgement } : {}),
        })
      : onDone(finalOf());
  // AI 피드백 한 문장: 맞음이고 합친 판정이 AI 와 같을 때만(서버가 다르면 null), 지금 화면(가르치는 수업 밖)은 부분 · 다시에도(plan-p11c 값 4).
  // 1~3단계 가르치는 수업의 부분 · 다시는 '왜'(시드)와 바른 답만이다(틀린 곳을 짚지 않음 — 6.2)
  const feedback =
    ai && (stage === "right" || (stage === "echo" && !teach))
      ? ai.feedback
      : null;
  const grammarNotes =
    ai && (stage === "right" || (stage === "echo" && !teach))
      ? ai.grammarNotes
      : [];

  let action: React.ReactNode = null;
  if (skipping) action = null;
  else if (stage === "ask") action = speakButton;
  else if (stage === "waiting")
    action =
      judge.by === "ai" ? (
        <WaitHint startedAt={sentAt} seconds={judge.waitHintSeconds} />
      ) : null;
  else if (stage === "failed")
    action = (
      <div className="flex flex-col gap-4">
        <StatusLine>{SPEAKING_TEXT.offline}</StatusLine>
        {next(() => {
          if (first !== undefined && attemptId)
            void send(attemptId, first, failures);
        })}
      </div>
    );
  else if (stage === "right" || stage === "spare-right")
    action = next(finishRight);
  else if (stage === "why" && teach && question.whyKo !== undefined)
    action = (
      <WhyBubble
        whyKo={question.whyKo}
        retry="speak"
        teacher={teach.teacher}
        speech={env.speech}
        speechSettings={teach.speechSettings}
        onLineEnd={teach.onLineEnd}
        onRetry={() => {
          setRetrying(true);
          save({ retrying: true });
        }}
      />
    );
  else if (stage === "echo")
    action = !echoSending ? (
      speakButton
    ) : echoSending.failed ? (
      <div className="flex flex-col gap-4">
        <StatusLine>{SPEAKING_TEXT.offline}</StatusLine>
        {next(() => void sendEcho(echoSending.text))}
      </div>
    ) : null;
  else if (stage === "spare-wrong")
    action = (
      <div className="flex flex-col gap-4">
        {teach && question.whyKo !== undefined ? (
          <WhyBubble
            whyKo={question.whyKo}
            teacher={teach.teacher}
            speech={env.speech}
            speechSettings={teach.speechSettings}
            onLineEnd={(end) => {
              teach.onLineEnd?.(end);
              // '왜' 뒤에 바른 답을 들려준다(설계 1 — 짝도 틀리면 바른 답을 들려주고 끝)
              playModel();
            }}
          />
        ) : null}
        {next(() => onDone(finalOf()), !modelPlayed)}
      </div>
    );

  return (
    <div
      data-question-answer-stage={stage}
      data-question-judge={judge.by}
      data-skipping={skipping ? "" : undefined}
      data-failures={failures}
      data-listening={listening ? "" : undefined}
      className="flex flex-1 flex-col gap-5"
    >
      <GuideLine>{SPEAKING_TEXT.guide.question}</GuideLine>
      <SoundButton speech={english} text={question.en} autoPlay={false} />
      <EnglishLine className="font-bold text-[28px]">{question.en}</EnglishLine>
      {showKo && question.ko && koShown ? (
        <div data-question-ko="">
          <GuideLine>{question.ko}</GuideLine>
        </div>
      ) : null}
      {/* 인식 글(L-33 · AC-23f — 따라 말하기와 같은 줄 · 표지, 다음 활동까지 남김) */}
      <HeardLine text={first} />
      {stage === "echo" || (stage === "spare-wrong" && model) ? (
        <div data-model-answer="" className="flex flex-col gap-3">
          {/* 아이가 따라 말할 바른 답 — 따라 말하기 목표와 같은 36px */}
          <EnglishLine className="font-bold text-[36px] leading-tight">
            {model}
          </EnglishLine>
          {stage === "echo" ? (
            <GuideLine>{SPEAKING_TEXT.together}</GuideLine>
          ) : null}
        </div>
      ) : null}
      {feedback ? (
        <div data-ai-feedback="">
          <GuideLine>{feedback}</GuideLine>
        </div>
      ) : null}
      {grammarNotes.map((note) => (
        <div key={note} data-grammar-note="">
          <GuideLine>{note}</GuideLine>
        </div>
      ))}
      <StatusLine
        tone={stage === "right" || stage === "spare-right" ? "ok" : "info"}
      >
        {message ||
          (stage === "right"
            ? RESULT_PHRASES.good
            : stage === "spare-right"
              ? TEACH_TEXT.spareRight
              : "")}
      </StatusLine>
      {/* 큰 단추 · '왜'는 판 안 아래(설계 5.4) */}
      <div className="mt-auto flex flex-col gap-4">{action}</div>
    </div>
  );
}

// ── 같이 해 보기 말하기(묶음 라-3 · 델타 spec 설계 1 '같이 해 보기의 꼴과 수' 말하기 · 표본 S5~S7) ──

/** 같이 해 보기 시도 하나(시도 꼴 together.tries 의 칸 — 고른 보기 · 인식 글). */
export type SpeakingTogetherTry = { choice?: number; heard?: string };

/**
 * 같이 해 보기 말하기 입력(라-1 같이 해 보기 틀의 children). S5 는 누가 자리(보기 둘)를 고른 뒤 같이 말하고, S6 · S7 은 영어 틀만 보고 말한다.
 * 채점은 부르는 쪽(togetherTryRight — 허용 답 두 묶음과 speaking.answer_match_pass, C170 (12))이다. 보기를 틀리면 틀린 보기 시도 하나를 내고
 * (틀 반응 wrongKo), 맞은 보기는 말한 글과 함께 한 시도로 낸다. 말이 맞지 않으면 틀 반응(wrongKo)이 끝난 뒤 바른 답을 보이며 들려주고 '같이 말해
 * 볼까요'로 맞힐 때까지(연습 — 점수 · 근거 밖). 인식이 끝내 안 되면(건너뜀 · 말소리 없음) 그때까지의 시도로 끝낸다.
 */
export function SpeakingTogetherInput({
  item,
  env,
  tries,
  choiceRight,
  tryRight,
  lineDone,
  teacher,
  onTry,
  onSkip,
}: {
  item: {
    choices?: readonly string[] | undefined;
    modelAnswer?: string | undefined;
    accepted: readonly string[];
  };
  env: SpeakingEnv;
  tries: readonly SpeakingTogetherTry[];
  /** 고른 보기 하나가 맞는가(보기만 든 시도). */
  choiceRight: (no: number) => boolean;
  /** 시도 하나가 맞는가. */
  tryRight: (attempt: SpeakingTogetherTry) => boolean;
  /** 같이 해 보기 틀의 선생님 줄(처음 줄 · 반응)이 멈췄나. */
  lineDone: boolean;
  /** 고른 선생님(바른 답을 선생님 영어 목소리로 — 설계 4 목소리 표, 고르기 전이면 null). */
  teacher?: TeacherView | null;
  onTry: (attempt: SpeakingTogetherTry) => void;
  onSkip: () => void;
}) {
  const [picked, setPicked] = useState<number | undefined>();
  const [failures, setFailures] = useState(0);
  const [message, setMessage] = useState("");
  const { listen, listening, soundIn, capAt } = useListen(env.speech);
  const english = useTeacherEnglish(
    env.speech,
    teacher === undefined ? undefined : { teacher },
  );
  const { port: readPort, speaking: reading } = useSpeakingPort(english);
  const { skipping, skipThen } = useSkipNotice(env.speechSettings.skipNoticeMs);
  const last = tries.at(-1);
  const lastRight = last !== undefined && tryRight(last);
  // 맞은 보기: 이 화면에서 고른 것, 없으면 앞 시도(말이 틀려 다시 하는 때)의 맞은 보기
  const rightChoice =
    picked ??
    tries.findLast((t) => t.choice !== undefined && choiceRight(t.choice))
      ?.choice;
  const choices = item.choices ?? [];
  const needPick = choices.length > 0 && rightChoice === undefined;
  /** 말이 맞지 않은 뒤(같이 말해 볼까요 — 바른 답을 보이며 들려줌). */
  const echo = last?.heard !== undefined && !lastRight;
  const model = item.modelAnswer ?? item.accepted[0] ?? "";
  const lastHeard = tries.findLast((t) => t.heard !== undefined)?.heard;
  const marks: Record<number, TogetherMark> = {};
  for (const t of tries)
    if (t.choice !== undefined)
      marks[t.choice] = choiceRight(t.choice) ? "right" : "wrong";
  if (rightChoice !== undefined) marks[rightChoice] = "right";

  // 틀 반응(wrongKo)을 다 읽은 뒤 바른 답을 한 번 들려준다
  const playEcho = echo && lineDone && model !== "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: 틀린 말 하나마다 반응이 끝난 때 한 번
  useEffect(() => {
    if (playEcho) void readPort?.speak(model);
  }, [playEcho, tries.length]);

  async function speak() {
    const event = await listen(
      endRuleFor(
        { area: "speaking", level: env.level, answer: "one-sentence" },
        env.speechSettings,
      ),
    );
    if (!event) return;
    const verdict = env.onSpeech(event);
    if (FAILURE_VERDICTS.has(verdict)) setFailures(failures + 1);
    if (verdict === "heard" && event.type === "heard") {
      setMessage("");
      onTry({
        ...(rightChoice === undefined ? {} : { choice: rightChoice }),
        heard: event.text.trim(),
      });
      return;
    }
    if (verdict === "retry") setMessage(SPEAKING_TEXT.retry);
    if (verdict === "offline") setMessage(SPEAKING_TEXT.offline);
    if (verdict === "skip") {
      setMessage(SPEAKING_TEXT.skipped);
      skipThen(onSkip);
    }
    if (verdict === "speech-silent") onSkip();
  }

  return (
    <div
      data-together-speaking=""
      data-together-echo={echo ? "" : undefined}
      data-failures={failures}
      className="flex flex-1 flex-col gap-5"
    >
      {choices.length > 0 ? (
        <ReadingTogetherChoices
          choices={choices}
          marks={marks}
          disabled={!needPick || lastRight}
          onPick={(no) => {
            if (choiceRight(no)) setPicked(no);
            else onTry({ choice: no });
          }}
        />
      ) : null}
      <HeardLine text={lastHeard} />
      {echo ? (
        <div data-model-answer="" className="flex flex-col gap-3">
          <EnglishLine className="font-bold text-[36px] leading-tight">
            {model}
          </EnglishLine>
          <GuideLine>{SPEAKING_TEXT.together}</GuideLine>
        </div>
      ) : null}
      <StatusLine>{message}</StatusLine>
      {/* 말하기 단추는 판 안 아래(설계 5.4). 선생님 줄 · 바른 답을 읽는 동안은 흐리게(R2) */}
      {needPick || lastRight || skipping ? null : (
        <div className="mt-auto flex justify-center">
          <SpeakButton
            label={SPEAKING_TEXT.speak}
            listening={listening}
            soundIn={soundIn}
            waiting={!lineDone || reading}
            capAt={capAt}
            disabled={!env.speech}
            onPress={() => void speak()}
          />
        </div>
      )}
    </div>
  );
}
