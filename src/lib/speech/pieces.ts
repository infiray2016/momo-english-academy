// 조각 읽기 감싸기(가르치고 배우는 수업 plan 묶음 라-3 · 델타 spec 설계 1 '틀린 뒤 차례' 따라 말하기 · 듣기 이해 행 · 5 '같은 문제 다시').
// speak(text) 를 부르는 쪽이 정한 조각(piecesOf(text))으로 바꿔 차례로 읽고, 조각 사이에 pauseMs 쉰다(세션 읽어 주기 감싸기 pacedSpeech 와
// 같은 길 — speakInTurn). 따라 말하기는 시드 chunks 로 끊어 들려주고('Dan and Tess / come here.'), 듣기 이해는 대본 뒤에 답 덩어리
// (retryHighlight)를 더 느린 빠르기로 한 번 더 읽는다. 조각마다의 들려준 결과를 모아 돌려준다(R-48 · R-57 — 끊김 · 한국어 줄 skipped 는
// pacedSpeech 와 같게). 멈추거나(cancelSpeaking) 다른 말을 읽으면 남은 조각과 쉼을 끝낸다. 듣기 · 장치 · 마이크는 그대로 넘긴다.
import {
  createSleeper,
  type SpeakHeard,
  speakHeardOfAll,
  speakHeardOutcomeOf,
  speakInTurn,
} from "@/core/speech/pace";
import type { SpeakOptions, SpeakOutcome, SpeechPort } from "./types";

/** 조각 하나: 읽을 글과(있으면) 그 조각의 빠르기(Web Speech rate — 없으면 부르는 쪽 options 그대로). */
export type SpeakPiece = { text: string; rate?: number };

export function piecesSpeech(
  port: SpeechPort,
  piecesOf: (text: string) => readonly SpeakPiece[],
  pauseMs: number,
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
      const pieces = piecesOf(text);
      const first = pieces[0];
      if (first === undefined) return port.speak(text, options);
      const optionsOf = (piece: SpeakPiece): SpeakOptions | undefined =>
        piece.rate === undefined ? options : { ...options, rate: piece.rate };
      if (pieces.length === 1) return port.speak(first.text, optionsOf(first));
      let last: SpeakOutcome = { kind: "ended", heard: "played" };
      const heards: SpeakHeard[] = [];
      let anyEnded = false;
      let cut = false;
      // speakInTurn 은 글마다 차례대로 한 번씩 부른다 — 차례 번호로 그 조각(빠르기)을 꺼낸다
      let at = 0;
      const finished = await speakInTurn(
        pieces.map((p) => p.text),
        {
          speak: async (pieceText) => {
            const piece = pieces[at] ?? { text: pieceText };
            at += 1;
            last = await port.speak(piece.text, optionsOf(piece));
            if (last.kind === "cancelled") cut = true;
            else if (last.kind !== "skipped")
              heards.push(speakHeardOutcomeOf(last));
            if (last.kind === "ended") anyEnded = true;
            return last;
          },
          pauseMs,
          sleeper,
          alive: () => mine === generation && !cut,
        },
      );
      if (!finished) return { kind: "cancelled" };
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
