"use client";

// 아이 차례(plan-p13b 파일별 값 9, 4절 회화 세션 '아이 차례' · '힌트' · '인식 확인' 행 · 3.3 · 7절 · C10 · C22 · C23 · C44 · C53 (2)).
// 말하기 단추 하나를 크게(P11a SpeakButton — 고리 틈 연두), 옆에 작은 '힌트' · '잘 모르겠어요'. 듣기는 a talkEndRuleFor(대화). 읽어 주는
// 중에 누르면 읽기를 멈추고 듣는다. '힌트'는 누를 때마다 한 단 — 1~3단계 영어 단은 서버가 미리 내려 주지 않아 연 단만 revealTalkHint 로
// 받는다(영어 문장 단에 작은 듣기 단추 · 단계 구간 빠르기). 같은 질문 둘째 '모름'부터 마지막 단까지 열린 채. 첫 회화 수업에서 '막히면 눌러요' 한 번.
// 인식 확인은 a confirmPlanOf — 바로 보냄 · talk.confirm_seconds 동안 아이 말풍선 + '다시 말하기' · '보내기'(아무것도 안 누르면 보냄).
// '모름'은 단추 · 같은 질문에서 말소리 없는 듣기 talk.nospeech_dontknow_count 번. 녹음하지 않는다(브라우저 인식만).
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import { SpeakButton } from "@/components/answer/speak-button";
import {
  BigButton,
  FOCUS_RING,
  SmallButton,
  StatusLine,
} from "@/components/board/board";
import { fillName } from "@/core/ai/mask";
import { OPEN_ALL_HINTS_FROM_DONT_KNOW } from "@/core/conversation/hints";
import {
  confirmPlanOf,
  type TalkSpeechSettings,
  talkEndRuleFor,
} from "@/core/conversation/listen";
import type { SpeechEvent, SpeechVerdict } from "@/core/speaking/judge";
import { speechEventOf } from "@/core/speaking/judge";
import type { SpeechSettings } from "@/core/speech/listen";
import type { ListenHandle, SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import type { HintView } from "@/server/conversation";

export const CHILD_TURN_TEXT = {
  speak: "말하기",
  /** 8단계부터 듣는 동안(C37 — c 가 켬). */
  doneSpeaking: "다 말했어요",
  hint: "힌트",
  nudge: "막히면 눌러요",
  dontKnow: "잘 모르겠어요",
  again: "다시 말하기",
  send: "보내기",
  /** 7절 오류 행 회화 문장(인식 실패 — 같은 차례). */
  notHeard: "토리에게 잘 안 들렸어요. 조금 더 크게 말해 볼까요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  listenHint: "힌트 문장 듣기",
} as const;

/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;
/** 말소리 없음 오류 코드(Web Speech). */
const NO_SPEECH = "no-speech";

export type ChildSend = {
  input: { mode: "speech" | "dont_know"; text?: string; nospeech?: boolean };
  hint: { opened: number; heard: ("two_answers" | "answer_example")[] };
  listenEndSeconds?: number;
  confirmSkipped?: boolean;
  /** 아이가 말을 멈춘 때(performance.now() — 인식 결과가 온 때 − 끝 조용함, '모름' 단추는 누른 때). 체감 대기의 시작(C23). */
  listenEndedAt: number;
};

export type ChildTurnProps = {
  sessionId: string;
  speech: SpeechPort | undefined;
  level: number;
  /** 1~3단계 꼴(카드 턴). */
  lowLevel: boolean;
  englishName: string;
  hints: readonly HintView[];
  dontKnowCount: number;
  /** 그 턴에 토리가 읽어 준 답(1단계 답 두 개 · '모름' 뒤 답 예시) — 인식 확인 견줌 · 들은 도움. */
  heard: {
    twoAnswers?: readonly [string, string];
    answerExample?: string;
  };
  settings: {
    speech: SpeechSettings;
    talkSpeech: TalkSpeechSettings;
    confirmSeconds: number;
    hintReadMatch: number;
    nospeechDontknowCount: number;
  };
  /** 힌트 문장 듣기 빠르기(단계 구간마다 speech.rate.<구간>, C125). */
  rate: number;
  homophones: string[][];
  /** '막히면 눌러요'를 보일까(프로필의 첫 회화 수업 — notices_seen). */
  nudge: boolean;
  onNudgeShown: () => void;
  /** 인식 결과를 틀의 셈에 넣고 판정을 받는다(막힌 안내 · 알림은 틀이 한다). */
  onSpeech: (event: SpeechEvent) => SpeechVerdict;
  /** 듣기를 시작한다(읽어 주기를 멈추게 — C53 (2)). */
  onListenStart: () => void;
  onListening: (listening: boolean) => void;
  /** 1~3단계 영어 단의 글(연 단만, 서버 액션). */
  reveal: (tier: number) => Promise<string | undefined>;
  onSend: (send: ChildSend) => void;
};

/** '막히면 눌러요'를 보았다고 남길까 — 힌트 단추가 있어 글이 보인 턴만(AC-15l '한 번 보이고', 검토 M-8). */
export function shouldMarkNudge(nudge: boolean, hintCount: number): boolean {
  return nudge && hintCount > 0;
}

/** 아이 차례 한 턴(턴마다 부르는 쪽이 key 를 바꿔 새로 그린다). */
export function ChildTurn(props: ChildTurnProps) {
  const {
    speech,
    level,
    lowLevel,
    hints,
    dontKnowCount,
    heard,
    settings,
    onSend,
  } = props;
  const [pressed, setPressed] = useState(0);
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [confirm, setConfirm] = useState<{
    text: string;
    bigRetry: boolean;
  } | null>(null);
  const handle = useRef<ListenHandle | undefined>(undefined);
  const nospeech = useRef(0);
  const sent = useRef(false);
  const confirmTimer = useRef<number | undefined>(undefined);
  /** 이 턴에 아이가 말을 멈춘 때(체감 대기 시작). */
  const endedAt = useRef<number | undefined>(undefined);

  const opened =
    dontKnowCount >= OPEN_ALL_HINTS_FROM_DONT_KNOW
      ? hints.length
      : Math.min(pressed, hints.length);
  const heardHelp: ("two_answers" | "answer_example")[] = [
    ...(heard.twoAnswers ? (["two_answers"] as const) : []),
    ...(heard.answerExample ? (["answer_example"] as const) : []),
  ];

  // 연 단 가운데 글이 없는 단(1~3단계 영어)을 그때 받는다
  // biome-ignore lint/correctness/useExhaustiveDependencies: 연 단 수가 늘 때만
  useEffect(() => {
    for (let i = 0; i < opened; i++) {
      const tier = hints[i];
      if (!tier || tier.text !== undefined || revealed[i] !== undefined)
        continue;
      void props.reveal(i).then((text) => {
        if (text !== undefined) setRevealed((r) => ({ ...r, [i]: text }));
      });
    }
  }, [opened]);

  // '막히면 눌러요'를 보인 때만 한 번 남긴다(힌트 단추가 있는 턴 — 다른 기기에서도 한 번, 검토 M-8)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 처음 그릴 때 한 번
  useEffect(() => {
    if (shouldMarkNudge(props.nudge, hints.length)) props.onNudgeShown();
  }, []);

  useEffect(
    () => () => {
      handle.current?.cancel();
      window.clearTimeout(confirmTimer.current);
    },
    [],
  );

  const textOf = (i: number) => hints[i]?.text ?? revealed[i];
  const openedSentence = (() => {
    for (let i = 0; i < opened; i++)
      if (hints[i]?.kind === "sentence") return textOf(i);
    return undefined;
  })();

  function send(payload: Omit<ChildSend, "hint" | "listenEndedAt">) {
    if (sent.current) return;
    sent.current = true;
    window.clearTimeout(confirmTimer.current);
    onSend({
      ...payload,
      hint: { opened, heard: heardHelp },
      listenEndedAt: endedAt.current ?? performance.now(),
    });
  }

  const rule = talkEndRuleFor(
    { level, mode: "dialogue" },
    settings.speech,
    settings.talkSpeech,
  );

  async function speak() {
    if (!speech || sent.current) return;
    if (handle.current) {
      handle.current.press();
      return;
    }
    speech.unlockFromGesture();
    // 읽어 주는 중에 누르면 읽기를 멈추고 듣는다(C53 (2))
    props.onListenStart();
    setMessage(undefined);
    setConfirm(null);
    setListening(true);
    props.onListening(true);
    const current = speech.listen(rule);
    handle.current = current;
    const outcome = await current.outcome;
    // 말을 멈춘 때 = 듣기가 끝난 때 − 끝 조용함(C23 — 체감 대기는 듣기 끝 대기 · 확인 시간을 포함해 잰다)
    endedAt.current = performance.now() - (rule.endSilenceMs ?? 0);
    handle.current = undefined;
    setListening(false);
    props.onListening(false);
    const event = speechEventOf(outcome);
    if (!event) return;
    const verdict = props.onSpeech(event);
    if (verdict === "heard" && event.type === "heard") {
      nospeech.current = 0;
      const text = event.text.trim();
      const plan = confirmPlanOf({
        lowLevel,
        heard: text,
        ...(openedSentence === undefined ? {} : { openedSentence }),
        heardAnswers: [
          ...(heard.twoAnswers ?? []),
          ...(heard.answerExample ? [heard.answerExample] : []),
        ].map((t) => fillName(t, props.englishName)),
        matchPass: settings.hintReadMatch,
        homophones: props.homophones,
        confirmMs: settings.confirmSeconds * MS_PER_SECOND,
      });
      const payload = {
        input: { mode: "speech" as const, text },
        listenEndSeconds: (rule.endSilenceMs ?? 0) / MS_PER_SECOND,
      };
      if (plan.autoSend) {
        send({ ...payload, confirmSkipped: true });
        return;
      }
      setConfirm({ text, bigRetry: plan.bigRetry });
      confirmTimer.current = window.setTimeout(
        () => send({ ...payload, confirmSkipped: false }),
        plan.waitMs,
      );
      return;
    }
    if (verdict === "offline") {
      setMessage(CHILD_TURN_TEXT.offline);
      return;
    }
    if (
      verdict === "mic-unavailable" ||
      verdict === "mic-stalled" ||
      verdict === "speech-silent"
    )
      return;
    // 말소리 없음이 이어지면 '모름'과 같이(C44 — 같은 질문 talk.nospeech_dontknow_count 번)
    const silent =
      event.type === "no-result" ||
      (event.type === "error" && event.code === NO_SPEECH);
    if (silent) {
      nospeech.current += 1;
      if (nospeech.current >= settings.nospeechDontknowCount) {
        send({ input: { mode: "dont_know", nospeech: true } });
        return;
      }
    }
    setMessage(CHILD_TURN_TEXT.notHeard);
  }

  function retry() {
    window.clearTimeout(confirmTimer.current);
    setConfirm(null);
    void speak();
  }

  const showHint = hints.length > 0;
  return (
    <div data-child-turn="" className="flex flex-col gap-3">
      {confirm ? (
        <div
          data-child-confirm=""
          className="flex flex-col items-end gap-3 self-end"
        >
          <p
            lang="en"
            data-child-bubble=""
            className="rounded-[18px_4px_18px_18px] border-[3px] border-ink bg-postit-reading px-5 py-3 font-en text-2xl font-bold"
          >
            {confirm.text}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {confirm.bigRetry ? (
              <BigButton data-retry-size="big" onClick={retry}>
                {CHILD_TURN_TEXT.again}
              </BigButton>
            ) : (
              <SmallButton data-retry-size="small" onClick={retry}>
                {CHILD_TURN_TEXT.again}
              </SmallButton>
            )}
            <SmallButton
              onClick={() =>
                send({
                  input: { mode: "speech", text: confirm.text },
                  listenEndSeconds: (rule.endSilenceMs ?? 0) / MS_PER_SECOND,
                  confirmSkipped: false,
                })
              }
            >
              {CHILD_TURN_TEXT.send}
            </SmallButton>
          </div>
        </div>
      ) : null}
      {/* 가로(넓은 칸)에서는 힌트 단을 왼쪽(넓게) · 단추 묶음을 오른쪽 끝에 — 힌트가 없는 턴에도 단추는 오른쪽(목업 B_Talk1 · 화면 검토 I-1 ·
          전체 디자인 리뷰 M-3) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        {opened > 0 ? (
          <ol data-hint-tiers="" className="flex min-w-0 flex-1 flex-col gap-2">
            {hints.slice(0, opened).map((tier, i) => {
              const text = textOf(i);
              return (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: 단 차례가 곧 열쇠다
                  key={i}
                  data-hint-tier={tier.kind}
                  className="flex items-center gap-3 rounded-xl border-2 border-dashed border-ink bg-paper px-4 py-2"
                >
                  {text === undefined ? null : tier.kind === "ko" ? (
                    <span className={CHILD_SIZE.guide}>{text}</span>
                  ) : (
                    <span
                      lang="en"
                      className={cn(CHILD_SIZE.english, "font-en font-bold")}
                    >
                      {fillName(text, props.englishName)}
                    </span>
                  )}
                  {tier.listen && text !== undefined ? (
                    <button
                      type="button"
                      data-hint-listen=""
                      aria-label={CHILD_TURN_TEXT.listenHint}
                      onClick={() => {
                        speech?.unlockFromGesture();
                        void speech?.speak(fillName(text, props.englishName), {
                          rate: props.rate,
                        });
                      }}
                      className={cn(
                        FOCUS_RING,
                        CHILD_SIZE.target,
                        "inline-flex items-center justify-center rounded-full border-2 border-ink bg-paper",
                      )}
                    >
                      <Volume2 aria-hidden className="size-6" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}
        <div
          data-child-actions=""
          className="flex shrink-0 flex-wrap items-center justify-center gap-4 lg:ml-auto"
        >
          <SpeakButton
            label={CHILD_TURN_TEXT.speak}
            listening={listening}
            capAt={() => handle.current?.capAt}
            gapClassName="bg-postit-talk"
            disabled={!speech || confirm !== null}
            onPress={() => void speak()}
          />
          <div className="flex flex-col items-start gap-2">
            {showHint ? (
              <div className="flex items-center gap-3">
                <SmallButton
                  data-hint-button=""
                  // 인식 확인 중에는 힌트를 열지 않는다(한 화면 한 행동 — 화면 검토 M-4)
                  disabled={
                    opened >= hints.length || listening || confirm !== null
                  }
                  onClick={() => setPressed((n) => n + 1)}
                >
                  {CHILD_TURN_TEXT.hint}
                </SmallButton>
                {props.nudge ? (
                  <span data-hint-nudge="" className={CHILD_SIZE.guide}>
                    {CHILD_TURN_TEXT.nudge}
                  </span>
                ) : null}
              </div>
            ) : null}
            <SmallButton
              data-dont-know=""
              disabled={listening || confirm !== null}
              onClick={() => {
                endedAt.current = performance.now();
                send({ input: { mode: "dont_know" } });
              }}
            >
              {CHILD_TURN_TEXT.dontKnow}
            </SmallButton>
          </div>
        </div>
      </div>
      <StatusLine tone={message ? "error" : "info"}>{message}</StatusLine>
    </div>
  );
}
