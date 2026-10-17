"use client";

// 따라 말하기 답 조각(plan-p10a 파일별 값 11 · 3.2 배치 표 · 7절 오류 행 · AC-11c · AC-5e · 정할 것 처).
// 문장을 보이고 읽어 준다. '말하기' → 한 문장 끝 규칙으로 듣는다(P2a endRuleFor · P2b SpeechPort, 녹음 없음).
// 결과면 일치율을 세어 기준 이상이면 그 시도로 끝, 아래면 첫 시도 뒤 인식 글 없이 '한 번 더 말해 볼까요?'.
// 다시 듣기 갈래(no-speech · aborted · 결과 없음 · audio-capture)는 실패 하나를 세고 '다시 한 번 말해 볼까요'로 다시 듣고,
// 두 시도를 합쳐 speech.max_retries 번이면 repeat-failed 로 넘긴다. network 는 세지 않는다. audio-capture 가 이어서
// MIC_CAPTURE_STREAK 번이면 '마이크를 쓸 수 없음'이 먼저다(예비 문항보다). mic-unavailable · stalled 는 부르는 쪽이 안내한다.
// 채점은 서버가 같은 인식 글로 다시 한다 — 여기의 일치율은 '한 번 더'를 정하는 데만 쓴다.
import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EnglishLine } from "@/components/activities/common";
import { BigButton, StatusLine } from "@/components/board/board";
import type { Answer } from "@/core/answer/check";
import { MIC_CAPTURE_STREAK } from "@/core/speaking/judge";
import { endRuleFor, type SpeechSettings } from "@/core/speech/listen";
import { bestMatchRate } from "@/core/speech/match-rate";
import type { ListenHandle, SpeechPort } from "@/lib/speech/types";
import { SoundButton } from "./choice";

const AUDIO_CAPTURE = "audio-capture";

/** 조각 글(3.2 · 7절 · 정본 밖 문구 표 배치 행). */
export const REPEAT_TEXT = {
  speak: "말하기",
  oneMore: "한 번 더 말해 볼까요?",
  retry: "다시 한 번 말해 볼까요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
} as const;

export type MicProblem =
  | { kind: "unavailable"; code: string }
  | { kind: "stalled"; code: string };

export function RepeatAnswer({
  sentence,
  level,
  speech,
  speechSettings,
  repeat,
  maxRetries,
  homophones,
  disabled = false,
  onAnswer,
  onMicProblem,
}: {
  sentence: string;
  level: number;
  speech: SpeechPort | undefined;
  speechSettings: SpeechSettings;
  /** placement.repeat_pass · placement.repeat_tries(배치 복사본). */
  repeat: { pass: number; tries: number };
  /** speech.max_retries */
  maxRetries: number;
  homophones: string[][];
  disabled?: boolean;
  onAnswer: (answer: Answer) => void;
  onMicProblem: (problem: MicProblem) => void;
}) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const heard = useRef<string[]>([]);
  const failures = useRef(0);
  const captureStreak = useRef(0);
  const handle = useRef<ListenHandle | undefined>(undefined);

  // 화면을 떠나면 듣기를 끊는다
  useEffect(() => () => handle.current?.cancel(), []);

  async function listen() {
    if (!speech) return;
    if (handle.current) {
      // 듣는 중에 다시 누르면 듣기를 끝낸다(7절 '말하기 버튼은 어느 규칙에서나 듣기를 끝낸다')
      handle.current.press();
      return;
    }
    speech.unlockFromGesture();
    setMessage("");
    setListening(true);
    const current = speech.listen(
      endRuleFor(
        { area: "placement", level, answer: "one-sentence" },
        speechSettings,
      ),
    );
    handle.current = current;
    const outcome = await current.outcome;
    handle.current = undefined;
    setListening(false);

    const failed = (code: string | undefined) => {
      failures.current += 1;
      captureStreak.current =
        code === AUDIO_CAPTURE ? captureStreak.current + 1 : 0;
      if (captureStreak.current >= MIC_CAPTURE_STREAK) {
        onMicProblem({ kind: "unavailable", code: AUDIO_CAPTURE });
        return;
      }
      if (failures.current >= maxRetries) {
        onAnswer({ kind: "repeat-failed" });
        return;
      }
      setMessage(REPEAT_TEXT.retry);
    };

    switch (outcome.kind) {
      case "result": {
        const text = outcome.text.trim();
        if (text === "") {
          failed(undefined);
          return;
        }
        captureStreak.current = 0;
        heard.current = [...heard.current, text];
        const rate = bestMatchRate([sentence], text, {
          homophones,
          nameSlot: "any-word",
        });
        if (rate >= repeat.pass || heard.current.length >= repeat.tries) {
          onAnswer({ kind: "repeat", heard: heard.current });
          return;
        }
        // 인식 글은 보이지 않는다(3.2)
        setMessage(REPEAT_TEXT.oneMore);
        return;
      }
      case "no-result":
        failed(undefined);
        return;
      case "error":
        if (outcome.group === "network") {
          setMessage(REPEAT_TEXT.offline);
          return;
        }
        if (outcome.group === "mic-unavailable") {
          onMicProblem({ kind: "unavailable", code: outcome.code });
          return;
        }
        failed(outcome.code);
        return;
      case "stalled":
        onMicProblem({ kind: "stalled", code: "stalled" });
        return;
      case "interrupted":
        return;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SoundButton speech={speech} text={sentence} />
      <EnglishLine className="font-bold">{sentence}</EnglishLine>
      <StatusLine>{message}</StatusLine>
      <BigButton
        className="self-center"
        data-speak=""
        aria-pressed={listening}
        disabled={disabled || !speech}
        onClick={() => void listen()}
      >
        <Mic aria-hidden className="size-7" />
        {REPEAT_TEXT.speak}
      </BigButton>
    </div>
  );
}
