"use client";

// 말하기 1~2 세션 조각(3.3 말하기 · 4절 말하기 세션 행 · 7절 인식 규칙 · AC-5b · 5c · 5e · 5f · N3, plan-p11a 값 12 · 정할 것 마 (3)~(5) ·
// 13절 C38 · C39 · C53 · C77). 따라 말하기 · 듣기 이해 · 1~2단계 질문 답(앱 판정)과 처음 마이크 안내. 녹음하지 않는다(브라우저 인식만,
// P2b SpeechPort). 판정은 서버와 같은 순수 함수(judge.ts · match-rate.ts — 위험 2), 결과 말 경계 · 저절로 넘김 초 · 허용 답 기준 ·
// 재시도 수는 설정(틀이 넘김). 인식 실패 셈은 틀이 쥔 speakingCounters 에 맡긴다(onSpeech — 막힌 안내 · 알림도 틀이 한다).
// 조각은 끝을 onDone(끝 내용) 하나로 알린다(값 2: heard · failures · skipped? · echo? · tries). 정본 밖 문구는 plan 표(C78) 글자 그대로.
import { useEffect, useRef, useState } from "react";
import {
  EnglishLine,
  GuideLine,
  type PictureLookup,
} from "@/components/activities/common";
import { ChoiceAnswer, SoundButton } from "@/components/answer/choice";
import { SpeakButton } from "@/components/answer/speak-button";
import { BigButton, SmallButton, StatusLine } from "@/components/board/board";
import type { DisplayItem } from "@/core/answer/display";
import type { Listening } from "@/core/seed/schema/lesson";
import {
  judgeAppAnswer,
  RESULT_PHRASES,
  type ResultPhrase,
  resultPhraseOf,
  type SpeechEvent,
  type SpeechVerdict,
  speechEventOf,
} from "@/core/speaking/judge";
import {
  type AnswerShape,
  endRuleFor,
  type SpeechSettings,
} from "@/core/speech/listen";
import { bestMatchRate } from "@/core/speech/match-rate";
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
  /** 활동 첫 줄 안내(plan-p11a 정본 밖 문구 표 a 행 — 컨트롤러 2026-10-18 fix 4 · review-p11-4-design M-3). */
  guide: {
    repeat: "잘 듣고 따라 말해 봐요",
    listening: "잘 듣고 알맞은 것을 골라요",
    question: "질문을 듣고 영어로 대답해 봐요",
  },
} as const;

/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;

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

/** 한 번 듣기. 듣는 중에 다시 부르면 듣기를 끝낸다(7절 '말하기 버튼은 어느 규칙에서나 듣기를 끝낸다'). */
function useListen(speech: SpeechPort | undefined) {
  const handle = useRef<ListenHandle | undefined>(undefined);
  const [listening, setListening] = useState(false);
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
    setListening(true);
    const current = speech.listen(rule);
    handle.current = current;
    const outcome = await current.outcome;
    handle.current = undefined;
    setListening(false);
    return speechEventOf(outcome);
  }
  /** 지금 듣기의 상한 시각(남은 시간 고리 — P2b ListenHandle.capAt). */
  const capAt = () => handle.current?.capAt;
  return { listen, listening, capAt };
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

export type RepeatInput = { heard: string[]; failures: number };

/**
 * 따라 말하기(C77 (4)): 목표 · 들어올 때 한 번 읽기 · '다시 듣기' · '말하기' → 인식 글(틀린 낱말 표시 없음) · 결과 말 셋.
 * '잘 말했어요'면 ui.auto_next_seconds 뒤 저절로 다음, 아니면 '한 번 더 말하기'(큰) · '다음'(작은), 횟수 상한 없음.
 */
export function RepeatActivity({
  text,
  env,
  phraseLevels,
  autoNextSeconds,
  guide = SPEAKING_TEXT.guide.repeat,
  ringGapClassName,
  initial,
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
  onChange: (input: RepeatInput) => void;
  onDone: (input: RepeatInput & { skipped?: "recognition" | "silent" }) => void;
}) {
  const [heard, setHeard] = useState<string[]>(initial?.heard ?? []);
  const [failures, setFailures] = useState(initial?.failures ?? 0);
  const [message, setMessage] = useState("");
  const { listen, listening, capAt } = useListen(env.speech);
  const last = heard.at(-1);
  const phrase: ResultPhrase | undefined =
    last === undefined
      ? undefined
      : resultPhraseOf(
          bestMatchRate([text], last, {
            homophones: env.homophones,
            nameSlot: "any-word",
          }),
          phraseLevels,
        );
  const finished = useRef(false);
  const finish = (input: Parameters<typeof onDone>[0]) => {
    if (finished.current) return;
    finished.current = true;
    onDone(input);
  };

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
      onChange({ heard: next, failures: nextFailures });
      return;
    }
    if (verdict === "retry") setMessage(SPEAKING_TEXT.retry);
    if (verdict === "offline") setMessage(SPEAKING_TEXT.offline);
    if (verdict === "skip")
      finish({ heard, failures: nextFailures, skipped: "recognition" });
    if (verdict === "speech-silent")
      finish({ heard, failures: nextFailures, skipped: "silent" });
  }

  return (
    <div
      data-repeat-activity=""
      data-phrase={phrase ?? ""}
      data-failures={failures}
      data-listening={listening ? "" : undefined}
      className="flex flex-col gap-5"
    >
      <GuideLine>{guide}</GuideLine>
      <SoundButton speech={env.speech} text={text} />
      {/* 따라 말할 글은 화면의 할 일이라 크게(36px — 화면 검토 M-3, 4절 '영어 24px 이상') */}
      <EnglishLine className="font-bold text-[36px] leading-tight">
        {text}
      </EnglishLine>
      {last !== undefined ? (
        <p
          data-heard=""
          lang="en"
          className="rounded-xl border-2 border-dashed border-ink bg-paper px-5 py-3 text-2xl"
        >
          {last}
        </p>
      ) : null}
      <StatusLine tone={phrase === "good" ? "ok" : "info"}>
        {message || (phrase ? RESULT_PHRASES[phrase] : "")}
      </StatusLine>
      {phrase === undefined || message ? (
        <SpeakButton
          label={SPEAKING_TEXT.speak}
          listening={listening}
          capAt={capAt}
          disabled={!env.speech}
          {...(ringGapClassName ? { gapClassName: ringGapClassName } : {})}
          onPress={() => void speak()}
        />
      ) : phrase !== "good" ? (
        // '한 번 더 말하기'의 고리 자리(바깥 12px)를 가로로만 걷어 단추 끝을 내용 끝에 맞추고, 그만큼 틈을 넓혀 보이는 간격은 그대로
        // (화면 검토 review-p11-5-design M-6 · fix 4 N-2 — 위아래 간격 · 가운데 놓인 '말하기'는 그대로)
        <div className="flex flex-wrap items-center justify-end gap-7">
          <SmallButton onClick={() => finish({ heard, failures })}>
            {SPEAKING_TEXT.next}
          </SmallButton>
          <SpeakButton
            className="-mx-3"
            label={SPEAKING_TEXT.oneMore}
            listening={listening}
            capAt={capAt}
            disabled={!env.speech}
            {...(ringGapClassName ? { gapClassName: ringGapClassName } : {})}
            onPress={() => void speak()}
          />
        </div>
      ) : null}
    </div>
  );
}

export type ListeningInput = { tries: number[]; retrying?: boolean };

/** 듣기 이해(C77 (3)): 대본을 들어올 때 한 번 읽기 · '다시 듣기' · 보기. 처음 틀리면 '한 번 더 듣기' 한 번 뒤 정답. 대본 글은 안 보인다. */
export function ListeningActivity({
  item,
  level,
  pictures,
  speech,
  initial,
  onChange,
  onDone,
}: {
  item: Listening;
  level: number;
  pictures: PictureLookup;
  speech: SpeechPort | undefined;
  initial?: ListeningInput;
  onChange: (input: ListeningInput) => void;
  onDone: (input: { tries: number[] }) => void;
}) {
  const [tries, setTries] = useState<number[]>(initial?.tries ?? []);
  const [retrying, setRetrying] = useState(initial?.retrying ?? false);
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
  const stage =
    tries.length === 0 || (retrying && tries.length === 1)
      ? "ask"
      : right
        ? "right"
        : tries.length >= 2
          ? "reveal"
          : "wrong";
  const reveal =
    stage === "ask"
      ? undefined
      : stage === "wrong"
        ? { picked: tries[0] }
        : { answerNo: item.answerNo, picked: tries.at(-1) };
  // 처음 고른 오답은 다시 고를 때 · 정답 보기에서도 ✕ 로 남는다(컨트롤러 결정 — 읽기 문항과 같은 꼴)
  const struck =
    tries.length > 0 && tries[0] !== item.answerNo ? [tries[0] ?? 0] : [];
  return (
    <div data-listening-stage={stage} className="flex flex-col gap-5">
      <GuideLine>{SPEAKING_TEXT.guide.listening}</GuideLine>
      <ChoiceAnswer
        // 다시 들을 때 새로(대본을 다시 한 번 읽음)
        key={retrying || tries.length >= 2 ? "again" : "first"}
        item={display as Extract<DisplayItem, { type: "listening" }>}
        level={level}
        speech={speech}
        instant
        onChange={() => {}}
        reveal={reveal}
        struck={struck}
        onAnswer={(answer) => {
          if (answer.kind !== "choice") return;
          const next = [...tries, answer.no];
          setTries(next);
          setRetrying(false);
          onChange({ tries: next, retrying: false });
        }}
      />
      {stage === "right" ? (
        <StatusLine tone="ok">{SPEAKING_TEXT.right}</StatusLine>
      ) : null}
      {stage === "reveal" ? (
        <StatusLine>{SPEAKING_TEXT.answerIs}</StatusLine>
      ) : null}
      {stage === "wrong" ? (
        <BigButton
          className="self-end"
          onClick={() => {
            setRetrying(true);
            onChange({ tries, retrying: true });
          }}
        >
          {SPEAKING_TEXT.listenAgain}
        </BigButton>
      ) : null}
      {stage === "right" || stage === "reveal" ? (
        <BigButton className="self-end" onClick={() => onDone({ tries })}>
          {SPEAKING_TEXT.next}
        </BigButton>
      ) : null}
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
  const { listen, listening, capAt } = useListen(env.speech);
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
    if (verdict === "skip")
      onDone({ heard, failures: nextFailures, skipped: "recognition" });
    if (verdict === "speech-silent")
      onDone({ heard, failures: nextFailures, skipped: "silent" });
  }

  return (
    <div
      data-question-answer-stage={stage}
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
      ) : (
        <SpeakButton
          label={SPEAKING_TEXT.speak}
          listening={listening}
          capAt={capAt}
          disabled={!env.speech}
          onPress={() => void speak()}
        />
      )}
    </div>
  );
}
