// 세션 읽어 주기 감싸기(13절 C125 (1) · (2)): 읽기 지문 읽어 주기 · 말하기 들려주기가 넘긴 글을 문장마다 나눠 단계 구간 빠르기
// (speech.rate.<구간>)로 읽고, 문장이 끝나면 speech.sentence_pause_ms 쉬고 다음 문장을 읽는다. 멈추거나(cancelSpeaking) 다른 말을
// 읽으면 앞 말의 쉼 · 남은 문장도 끝낸다. 듣기 · 장치 · 마이크는 감싼 접점 그대로(소리 통로 꼴은 건드리지 않음 — C109).

import { splitSentences } from "@/core/seed/text";
import {
  createSleeper,
  type SpeakHeard,
  speakHeardOfAll,
  speakHeardOutcomeOf,
  speakInTurn,
} from "@/core/speech/pace";
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
      // 첫 값(문장을 하나도 읽지 않으면 쓰이지 않는다)도 음성 접점과 같은 꼴(R-48 heard)
      let last: SpeakOutcome = { kind: "ended", heard: "played" };
      // 문장마다의 들려준 결과(오류 문장은 speakHeardOutcomeOf 로 바꾼 값). 끝나면 모아서 돌린다(R-48 · R-57 — 검토 M1)
      const heards: SpeakHeard[] = [];
      let anyEnded = false;
      // 문장이 끊기면(앱이나 다른 읽기 · 듣기가 끊음) 거기서 멈추고 끊김을 돌린다
      let cut = false;
      const finished = await speakInTurn(sentences, {
        speak: async (sentence) => {
          last = await port.speak(sentence, withRate);
          if (last.kind === "cancelled") cut = true;
          // 읽지 않은 한국어 줄(skipped)은 소리를 낼 차례가 아니었으니 모으지 않는다
          else if (last.kind !== "skipped")
            heards.push(speakHeardOutcomeOf(last));
          if (last.kind === "ended") anyEnded = true;
          return last;
        },
        pauseMs,
        sleeper,
        alive: () => mine === generation && !cut,
      });
      if (!finished) return { kind: "cancelled" };
      // 한 문장이라도 끝났으면 모은 값, 하나도 끝나지 않았으면 마지막 결과 그대로(오류 자리에 따라 값이 바뀌지 않게)
      return anyEnded
        ? { kind: "ended", heard: speakHeardOfAll(heards) }
        : last;
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
