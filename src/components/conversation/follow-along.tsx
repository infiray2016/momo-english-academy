"use client";

// 회화 따라 말하기 · 처음 안내(plan-p13b 파일별 값 14, 4절 회화 세션 '오늘 쓸 말' · '말해 보기' · '정리' · '처음 회화' 행 · 3.3 오늘 쓸 말 ·
// 말해 보기 · 정리 문단 · 7절 · 13절 C33 · C39 · C41 · C97 · 컨트롤러 결정 '열 때마다 시작! 한 번'(차례 5 정할 것 1)).
// - 처음 안내: 처음 회화면 3.3 안내 글 + '시작!', 처음이 아니어도 열 때마다 '시작!' 한 번(그 누름이 첫 읽어 주기를 연다 — iPad Safari).
// - 오늘 쓸 말: 단어마다 카드 한 장(단어 · 뜻 · 예문 — 모든 단계 뜻), 들어올 때 토리가 단어 → 예문을 읽고(회11 (1)), 말하기 단추로 따라
//   말함(1~3단계 단어 · 4단계부터 예문) → 결과 말을 ui.auto_next_seconds 보인 뒤 결과와 관계없이 다음(C39), 인식 실패가 speech.max_retries 면
//   건너뜀.
// - 말해 보기(1~3단계): 예문 카드 한 장씩, 첫 바퀴 영어 + 뜻(읽어 준 뒤 말함), 둘째 바퀴부터 뜻만 — 일치율이 talk.hint_read_match 아래면
//   영어를 보이고 들려준 뒤 다음(회11 (2)).
// - 정리: 되짚을 말을 토리 말풍선으로 보이고 읽음(1~3단계 뜻 함께), 1~3단계는 문장마다 한 번 따라 말함(결과 말만) → 끝인사(끝맺음
//   끝인사가 와 있으면 그것 — talkClosingStatus 한 번) → 마무리.
// 따라 말한 것은 점수 · '말했다'에 들지 않는다(서버 saveFollowAlong — 인식 글이 있는 발화만 영어로 말한 문장 수에). 인식 글은 화면에
// 보이지 않는다(결과 말로만, 4절). 녹음하지 않는다.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHILD_SIZE,
  EnglishLine,
  GuideLine,
} from "@/components/activities/common";
import { SpeakButton } from "@/components/answer/speak-button";
import { BigButton, StatusLine } from "@/components/board/board";
import { fillName } from "@/core/ai/mask";
import {
  type TalkSpeechSettings,
  talkEndRuleFor,
} from "@/core/conversation/listen";
import {
  RESULT_PHRASES,
  type ResultPhrase,
  resultPhraseOf,
  type SpeechEvent,
  type SpeechVerdict,
  speechEventOf,
} from "@/core/speaking/judge";
import type { SpeechSettings } from "@/core/speech/listen";
import { bestMatchRate } from "@/core/speech/match-rate";
import type { ListenHandle, SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import { saveTalkFollowAlong } from "@/server/actions/conversation";
import { CHILD_TURN_TEXT } from "./child-turn";
import { type BubbleContent, ToriBubble, ToriFigure } from "./tori";

/** 처음 회화 안내(3.3 글 그대로 — 문장마다 한 줄) · 시작 단추. */
export const TALK_START_TEXT = {
  intro: [
    "토리는 앱 속 AI 친구예요.",
    "토리는 오늘 이야기에 나오는 것만 물어요.",
    "집 주소, 학교 이름, 전화번호는 묻지 않아요.",
    "토리는 지난 이야기를 조금 기억해요.",
    "토리와 나눈 이야기는 부모님도 볼 수 있어요",
  ],
  start: "시작!",
} as const;

/** 따라 말하기 화면 글(4절 · 3.3 · plan-p13b 값 14 제안 문구). */
export const FOLLOW_TEXT = {
  guide: "토리를 따라 말해 봐요",
  practiceSee: "보고 말해 봐요",
  practiceMeaning: "뜻을 보고 영어로 말해 봐요",
  speak: "말하기",
  notHeard: CHILD_TURN_TEXT.notHeard,
  offline: CHILD_TURN_TEXT.offline,
} as const;

/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;

export type FollowSegment = "today_words" | "practice";

/** 따라 말하기 한 차례(오늘 쓸 말 단어 하나 · 말해 보기 바퀴의 예문 하나). */
export type FollowStep = {
  segment: FollowSegment;
  round: number;
  index: number;
  /** 따라 말할 글(일치율 견줌 · 저장). */
  target: string;
  /** 들어올 때 토리가 읽을 차례(말해 보기 둘째 바퀴부터는 없음 — 뜻만 보고 말함). */
  read: string[];
  /** 오늘 쓸 말 단어(말해 보기는 없음). */
  word?: string;
  /** 보일 한국어 뜻(단어 뜻 · 예문 뜻). */
  meaningKo: string;
  /** 보일 영어 예문(말해 보기 둘째 바퀴부터는 다시 보임 때만). */
  example: string;
  /** 영어를 처음부터 보이는가(오늘 쓸 말 · 말해 보기 첫 바퀴). */
  showEnglish: boolean;
};

/**
 * 남은 따라 말하기 차례(순수 함수): 오늘 쓸 말은 단어 차례, 말해 보기는 바퀴마다 정한 차례(처음 스냅숏 practiceOrder — 첫 바퀴 카드 차례,
 * 둘째부터 섞음). 따라 말할 것은 1~3단계 오늘 쓸 말 단어 · 4단계부터 예문, 말해 보기는 예문. 이미 저장한 차례는 뺀다(이어 열기).
 */
export function followStepsOf({
  todayWords,
  practice,
  done,
  lowLevel,
}: {
  todayWords: readonly { word: string; meaningKo: string; example: string }[];
  practice: {
    items: readonly { word: string; example: string; exampleKo: string }[];
    order: readonly (readonly number[])[];
  };
  done: {
    today: readonly number[];
    practice: readonly { round: number; index: number }[];
  };
  /** 1~3단계 꼴(카드 턴). */
  lowLevel: boolean;
}): { today: FollowStep[]; practice: FollowStep[] } {
  const today = todayWords.flatMap((w, index): FollowStep[] =>
    done.today.includes(index)
      ? []
      : [
          {
            segment: "today_words",
            round: 0,
            index,
            target: lowLevel ? w.word : w.example,
            read: [w.word, w.example].filter((t) => t.trim() !== ""),
            word: w.word,
            meaningKo: w.meaningKo,
            example: w.example,
            showEnglish: true,
          },
        ],
  );
  const steps: FollowStep[] = [];
  practice.order.forEach((round, r) => {
    for (const index of round) {
      const item = practice.items[index];
      if (!item) continue;
      if (done.practice.some((d) => d.round === r && d.index === index))
        continue;
      steps.push({
        segment: "practice",
        round: r,
        index,
        target: item.example,
        read: r === 0 ? [item.example] : [],
        meaningKo: item.exampleKo,
        example: item.example,
        showEnglish: r === 0,
      });
    }
  });
  return { today, practice: steps };
}

/** 말해 보기 둘째 바퀴부터 맞지 않으면(일치율 < talk.hint_read_match) 영어를 보이고 들려준다(3.3 · 회11 (2)). 첫 바퀴는 이미 보임. */
export function practiceRevealOf({
  round,
  rate,
  hintReadMatch,
}: {
  round: number;
  rate: number;
  hintReadMatch: number;
}): boolean {
  return round > 0 && rate < hintReadMatch;
}

/** 열 때마다 한 번 누르는 '시작!'(처음 회화면 3.3 안내 글과 함께). 그 누름이 첫 읽어 주기를 연다(7절). */
export function TalkStart({
  first,
  disabled = false,
  onStart,
}: {
  /** 프로필의 처음 회화(안내 글을 보인다 — 회17). */
  first: boolean;
  disabled?: boolean;
  onStart: () => void;
}) {
  return (
    <div
      data-talk-start=""
      className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-8 bg-paper px-8 py-10 shadow-postit"
    >
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 bg-postit-talk/90"
      />
      <ToriFigure state="idle" />
      {first ? (
        <div data-talk-intro="" className="flex flex-col gap-2">
          {TALK_START_TEXT.intro.map((line) => (
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
    </div>
  );
}

/** 따라 말하기 조각이 함께 쓰는 환경(틀이 넘김). */
export type FollowEnv = {
  sessionId: string;
  speech: SpeechPort | undefined;
  level: number;
  lowLevel: boolean;
  englishName: string;
  /** 토리 말 빠르기(1~2단계 천천히 — C96). */
  rate?: number;
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
};

/** 토리 말 읽기(차례대로 · 끝날 때까지 기다림 · 끊으면 거기서 멈춤). 음성 접점은 늘 지금 것으로(재검토 N-1). */
function useSayer(env: Pick<FollowEnv, "speech" | "rate" | "englishName">) {
  const port = useRef(env.speech);
  port.current = env.speech;
  const generation = useRef(0);
  const speakingRef = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const { rate, englishName } = env;
  const say = useCallback(
    async (texts: readonly string[]): Promise<boolean> => {
      generation.current += 1;
      const mine = generation.current;
      speakingRef.current = true;
      setSpeaking(true);
      for (const text of texts) {
        const current = port.current;
        if (!current || mine !== generation.current) break;
        await current.speak(
          fillName(text, englishName),
          rate === undefined ? undefined : { rate },
        );
      }
      if (mine !== generation.current) return false;
      speakingRef.current = false;
      setSpeaking(false);
      return true;
    },
    [rate, englishName],
  );
  const cancel = useCallback(() => {
    generation.current += 1;
    if (speakingRef.current) port.current?.cancelSpeaking();
    speakingRef.current = false;
    setSpeaking(false);
  }, []);
  // 조각이 사라질 때 이 조각이 읽던 것만 멈춘다(틀의 읽기 큐는 건드리지 않음)
  useEffect(
    () => () => {
      generation.current += 1;
      if (speakingRef.current) port.current?.cancelSpeaking();
    },
    [],
  );
  return { say, cancel, speaking };
}

/** 한 번 듣기(따라 말하기 — 끝 조용함은 회화 따라 말하기 규칙). 듣는 중에 다시 누르면 듣기를 끝낸다. */
function useFollowListen(env: FollowEnv) {
  const handle = useRef<ListenHandle | undefined>(undefined);
  const [listening, setListening] = useState(false);
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
    setListening(true);
    env.onListening(true);
    const current = env.speech.listen(rule);
    handle.current = current;
    const outcome = await current.outcome;
    handle.current = undefined;
    setListening(false);
    env.onListening(false);
    return speechEventOf(outcome);
  }
  return { listen, listening, capAt: () => handle.current?.capAt };
}

/** 따라 말하기 한 차례의 결과(저장 몫). */
type Tried = { heard: string[]; failures: number };

/** 따라 말하기 시도 id — 같은 차례는 같은 id(다시 열어도 한 번만 저장). */
function followAttemptId(
  sessionId: string,
  segment: "today_words" | "practice" | "wrap_up",
  round: number,
  index: number,
): string {
  return `talk-follow:${sessionId}:${segment}:${round}:${index}`;
}

function saveFollow(
  env: Pick<FollowEnv, "sessionId">,
  at: {
    segment: "today_words" | "practice" | "wrap_up";
    round: number;
    index: number;
    target: string;
  },
  tried: Tried,
  skipped?: "recognition",
) {
  void saveTalkFollowAlong({
    sessionId: env.sessionId,
    clientAttemptId: followAttemptId(
      env.sessionId,
      at.segment,
      at.round,
      at.index,
    ),
    segment: at.segment,
    index: at.index,
    ...(at.segment === "practice" ? { round: at.round } : {}),
    target: at.target,
    heard: tried.heard,
    failures: tried.failures,
    ...(skipped ? { skipped } : {}),
  }).catch(() => {});
}

/**
 * 따라 말하기 한 번(듣기 → 판정 → 결과 말). 들음이면 결과 말을 돌려주고, 건너뜀(인식 실패 상한)이면 "skip", 다시면 undefined.
 * 막힌 판정(마이크 · 말소리)은 틀이 안내를 그린다.
 */
function useFollowTry(env: FollowEnv) {
  const { listen, listening, capAt } = useFollowListen(env);
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
    if (verdict === "skip") return { kind: "skip" };
    if (verdict === "retry") {
      setMessage(FOLLOW_TEXT.notHeard);
      return { kind: "retry" };
    }
    if (verdict === "offline") setMessage(FOLLOW_TEXT.offline);
    return undefined;
  }
  return { tryOnce, listening, capAt, message, setMessage };
}

/** 오늘 쓸 말 · 말해 보기(한 토막의 남은 차례). 다 하면 onDone. */
export function FollowAlong({
  segment,
  steps,
  env,
  onDone,
}: {
  segment: FollowSegment;
  steps: readonly FollowStep[];
  env: FollowEnv;
  onDone: () => void;
}) {
  const [at, setAt] = useState(0);
  const step = steps[at];
  // 차례마다 새로 그린다(결과 말 · 실패 수 · 다시 보임이 처음부터)
  return step ? (
    <FollowCard
      key={`${step.segment}:${step.round}:${step.index}`}
      segment={segment}
      step={step}
      env={env}
      onNext={() => {
        env.onNextItem();
        if (at + 1 < steps.length) setAt(at + 1);
        else onDone();
      }}
    />
  ) : (
    <FollowEnd onDone={onDone} />
  );
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

function FollowCard({
  segment,
  step,
  env,
  onNext,
}: {
  segment: FollowSegment;
  step: FollowStep;
  env: FollowEnv;
  onNext: () => void;
}) {
  const sayer = useSayer(env);
  const { tryOnce, listening, capAt, message } = useFollowTry(env);
  const [phrase, setPhrase] = useState<ResultPhrase | undefined>();
  const [revealed, setRevealed] = useState(false);
  const [failures, setFailures] = useState(0);
  const tried = useRef<Tried>({ heard: [], failures: 0 });
  const moved = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const next = useRef(onNext);
  next.current = onNext;

  // 들어올 때 토리가 읽는다(오늘 쓸 말 단어 → 예문, 말해 보기 첫 바퀴 예문)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 차례마다 한 번(key 로 새로 그림)
  useEffect(() => {
    if (step.read.length > 0) void sayer.say(step.read);
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

  async function speak() {
    if (moved.current) return;
    sayer.cancel();
    const out = await tryOnce(step.target);
    if (!out) return;
    if (out.kind === "retry") {
      tried.current.failures += 1;
      setFailures(tried.current.failures);
      return;
    }
    if (out.kind === "skip") {
      tried.current.failures += 1;
      setFailures(tried.current.failures);
      saveFollow(env, { ...step, segment }, tried.current, "recognition");
      moveOn(0);
      return;
    }
    tried.current.heard.push(out.text);
    setPhrase(out.phrase);
    saveFollow(env, { ...step, segment }, tried.current);
    const autoMs = env.settings.autoNextSeconds * MS_PER_SECOND;
    if (
      practiceRevealOf({
        round: step.round,
        rate: out.rate,
        hintReadMatch: env.settings.hintReadMatch,
      })
    ) {
      // 맞지 않으면 영어를 보이고 들려준 뒤 다음(3.3 말해 보기)
      setRevealed(true);
      moved.current = true;
      await sayer.say([step.example]);
      moved.current = false;
      moveOn(autoMs);
      return;
    }
    // 결과 말을 ui.auto_next_seconds 보인 뒤 결과와 관계없이 다음(C39)
    moveOn(autoMs);
  }

  const guide =
    segment === "today_words"
      ? FOLLOW_TEXT.guide
      : step.showEnglish
        ? FOLLOW_TEXT.practiceSee
        : FOLLOW_TEXT.practiceMeaning;
  const englishShown = step.showEnglish;
  return (
    <div
      data-follow={segment}
      data-follow-step={`${segment}:${step.round}:${step.index}`}
      data-follow-failures={failures}
      className="flex flex-col gap-5"
    >
      <div className="flex items-center gap-4">
        <ToriFigure
          state={sayer.speaking ? "speaking" : listening ? "listening" : "idle"}
        />
        <GuideLine className="font-heading text-[26px]">{guide}</GuideLine>
      </div>
      <div
        data-follow-card=""
        className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-3 bg-postit-talk px-8 pt-9 pb-7 text-center shadow-postit"
      >
        <span
          aria-hidden
          className="absolute -top-3 left-1/2 h-6 w-28 -translate-x-1/2 -rotate-3 bg-tape"
        />
        {step.word !== undefined ? (
          <p
            data-follow-word=""
            lang="en"
            className="font-en text-[44px] font-bold leading-tight"
          >
            {step.word}
          </p>
        ) : null}
        <p data-follow-meaning="" className={cn(CHILD_SIZE.guide)}>
          {step.meaningKo}
        </p>
        {englishShown && step.example ? (
          <EnglishLine
            className={cn(
              "font-en font-bold",
              step.word === undefined && "text-[32px] leading-tight",
            )}
          >
            <span data-follow-example="">
              {fillName(step.example, env.englishName)}
            </span>
          </EnglishLine>
        ) : null}
        {!englishShown && revealed ? (
          <EnglishLine className="font-en text-[32px] font-bold leading-tight">
            <span data-follow-reveal="">
              {fillName(step.example, env.englishName)}
            </span>
          </EnglishLine>
        ) : null}
      </div>
      <StatusLine
        className="justify-center"
        tone={phrase === "good" ? "ok" : message ? "error" : "info"}
      >
        {phrase && !message ? (
          <span data-follow-result="">{RESULT_PHRASES[phrase]}</span>
        ) : (
          message
        )}
      </StatusLine>
      <SpeakButton
        label={FOLLOW_TEXT.speak}
        listening={listening}
        capAt={capAt}
        gapClassName="bg-paper"
        disabled={!env.speech || phrase !== undefined}
        onPress={() => void speak()}
      />
    </div>
  );
}

/** 정리 한 줄(되짚을 말 · 끝인사). */
export type WrapLine = { en: string; ko?: string };

/**
 * 정리 토막(3.3 정리 문단 · C33): 되짚을 말을 토리 말풍선으로 하나씩 보이고 읽는다. 1~3단계는 문장마다 한 번 따라 말한다(결과 말만 —
 * '말했다' 아님). 다 하면 끝맺음 상태를 한 번 보고(와 있으면 그 끝인사, 아니면 카드 끝인사) 끝인사를 보이고 읽은 뒤 마무리로.
 */
export function WrapUp({
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
  const [at, setAt] = useState(0);
  const [bye, setBye] = useState<WrapLine | null>(null);
  const asked = useRef(false);
  const ask = useRef(closingFarewell);
  ask.current = closingFarewell;

  // 되짚을 말을 다 하면 끝인사를 고른다(한 번)
  useEffect(() => {
    if (at < lines.length || asked.current) return;
    asked.current = true;
    void ask
      .current()
      .catch(() => undefined)
      .then((closing) => setBye(closing ?? farewell));
  }, [at, lines.length, farewell]);

  const line = lines[at];
  if (line)
    return (
      <WrapCard
        key={at}
        index={at}
        line={line}
        env={env}
        follow={env.lowLevel}
        onNext={() => {
          env.onNextItem();
          setAt(at + 1);
        }}
      />
    );
  return bye ? (
    <WrapCard
      key="farewell"
      index={-1}
      line={bye}
      env={env}
      follow={false}
      farewell
      onNext={onDone}
    />
  ) : (
    <div data-talk-wrap="" className="flex items-start gap-4">
      <ToriFigure state="thinking" />
    </div>
  );
}

function WrapCard({
  index,
  line,
  env,
  follow,
  farewell = false,
  onNext,
}: {
  index: number;
  line: WrapLine;
  env: FollowEnv;
  /** 따라 말하기(1~3단계 되짚을 말). */
  follow: boolean;
  farewell?: boolean;
  onNext: () => void;
}) {
  const sayer = useSayer(env);
  const { tryOnce, listening, capAt, message } = useFollowTry(env);
  const [phrase, setPhrase] = useState<ResultPhrase | undefined>();
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
    void sayer.say([line.en]).then((ok) => {
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
    const out = await tryOnce(line.en);
    if (!out || out.kind === "retry") {
      if (out) tried.current.failures += 1;
      return;
    }
    const at = {
      segment: "wrap_up" as const,
      round: 0,
      index,
      target: line.en,
    };
    if (out.kind === "skip") {
      tried.current.failures += 1;
      saveFollow(env, at, tried.current, "recognition");
      moveOn(0);
      return;
    }
    tried.current.heard.push(out.text);
    setPhrase(out.phrase);
    saveFollow(env, at, tried.current);
    moveOn(autoMs);
  }

  const content: BubbleContent = {
    sentences: [line.en],
    ...(line.ko ? { ko: line.ko } : {}),
    adds: [],
    done: true,
  };
  return (
    <div
      data-talk-wrap=""
      data-wrap-farewell={farewell ? "" : undefined}
      className="flex flex-col gap-5"
    >
      <div className="flex items-start gap-4">
        <ToriFigure
          state={sayer.speaking ? "speaking" : listening ? "listening" : "idle"}
        />
        <div className="min-w-0 flex-1">
          <ToriBubble
            content={content}
            englishName={env.englishName}
            waiting={null}
            waitSeconds={env.settings.waitHintSeconds}
            onAllTyped={setTyped}
            onReplay={() => {
              env.speech?.unlockFromGesture();
              // 다시 읽기가 처음 읽기를 끊어도 그 끝에서 '다 읽음'을 세운다 — 따라 말하지 않는 장이 저절로 넘어가게(검토 b3 I-1)
              void sayer.say([line.en]).then((ok) => {
                if (ok) setRead(true);
              });
            }}
            onAnswer={() => {}}
          />
        </div>
      </div>
      {follow ? (
        <div className="flex flex-col items-center gap-3 border-t-2 border-dashed border-ink/30 pt-4">
          <GuideLine>{FOLLOW_TEXT.guide}</GuideLine>
          <StatusLine
            tone={phrase === "good" ? "ok" : message ? "error" : "info"}
          >
            {phrase && !message ? (
              <span data-follow-result="">{RESULT_PHRASES[phrase]}</span>
            ) : (
              message
            )}
          </StatusLine>
          <SpeakButton
            label={FOLLOW_TEXT.speak}
            listening={listening}
            capAt={capAt}
            gapClassName="bg-paper"
            // 토리 글이 다 흐른 뒤에 연다(차례 5 화면 검토 M-1 결정과 같은 꼴 — 읽는 중 누르면 읽기를 멈추고 듣는 것은 그대로, 화면 검토 b3 M-1)
            disabled={!env.speech || phrase !== undefined || !typed}
            onPress={() => void speak()}
          />
        </div>
      ) : null}
    </div>
  );
}
