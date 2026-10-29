// 세션 읽어 주기 감싸기(13절 C125 (1) · (2)): 읽기 지문 읽어 주기 · 말하기 들려주기가 넘긴 글을 문장마다 나눠 단계 구간 빠르기
// (speech.rate.<구간>)로 읽고, 문장이 끝나면 speech.sentence_pause_ms 쉬고 다음 문장을 읽는다. 멈추거나(cancelSpeaking) 다른 말을
// 읽으면 앞 말의 쉼 · 남은 문장도 끝낸다. 듣기 · 장치 · 마이크는 감싼 접점 그대로(소리 통로 꼴은 건드리지 않음 — C109).

import { splitSentences } from "@/core/seed/text";
import { createSleeper, speakInTurn } from "@/core/speech/pace";
import type { SpeakOptions, SpeakOutcome, SpeechPort } from "./types";

export function pacedSpeech(
  port: SpeechPort,
  { rate, pauseMs }: { rate: number; pauseMs: number },
): SpeechPort {
  const sleeper = createSleeper();
  let generation = 0;
  const stopPrevious = () => {
    generation += 1;
    sleeper.cancel();
    return generation;
  };
  return {
    device: () => port.device(),
    unlockFromGesture: () => port.unlockFromGesture(),
    async speak(text: string, options?: SpeakOptions): Promise<SpeakOutcome> {
      const mine = stopPrevious();
      const sentences = splitSentences(text);
      const withRate = { rate, ...options };
      if (sentences.length <= 1) return port.speak(text, withRate);
      let last: SpeakOutcome = { kind: "ended" };
      const finished = await speakInTurn(sentences, {
        speak: async (sentence) => {
          last = await port.speak(sentence, withRate);
          return last;
        },
        pauseMs,
        sleeper,
        alive: () => mine === generation,
      });
      return finished ? last : { kind: "cancelled" };
    },
    cancelSpeaking() {
      stopPrevious();
      port.cancelSpeaking();
    },
    listen: (rule, on) => port.listen(rule, on),
    checkMicrophone: () => port.checkMicrophone(),
    dispose: () => {
      stopPrevious();
      port.dispose();
    },
  };
}
