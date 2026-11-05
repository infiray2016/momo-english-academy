// 읽어 주기 뒤 듣기 쉼(13절 C109 · C166 R2 · 장부 T-125 — iPad 사파리 27 짧은 준비 쪽지 no-speech). 따라 말하기는 선생님이 읽는 동안
// 말하기 단추를 흐리게 두는데(7절 말하기 버튼 행), 읽기가 멈춘 바로 그때(0.7초 안) 누른 듣기는 iPad WebKit 에서 소리를 받지 못했다
// (as 116~142ms · snd false). C109 가 확인한 것은 '읽기 끝 0.7~2.1초 뒤 누름'뿐이라 그 아래 빈 곳을 쉼으로 메운다. 쉼 동안은 단추를
// 흐리게 둘 뿐 듣기를 늦게 시작하지 않는다 — 듣기는 늘 누름 처리 안에서 동기로 시작한다(누름 밖 start 는 iOS 에서 되는지 확인되지
// 않음, task-talk-speech-analysis-report N0' · (다)). DB 없는 순수 함수.
import type { SpeechSettings } from "./listen";
import { pauseLeftMs } from "./pace";

/**
 * 듣기 쉼 길이(ms, 설정값). 이 뜻의 12절 키가 아직 없어 speech.sentence_pause_ms(읽어 주기 문장 사이 쉼 — 선생님 말 뒤 다음 말까지의 쉼과
 * 같은 결, 기본 700 은 C109 가 인식을 확인한 '읽기 끝 0.7초 뒤'의 아래 끝)를 잠정으로 쓴다. 새 키(speech.listen_after_speak_ms 제안)가
 * 생기면 이 함수만 바꾼다.
 */
export function listenGapMsOf(
  speech: Pick<SpeechSettings, "sentencePauseMs">,
): number {
  return speech.sentencePauseMs;
}

/** 말하기 단추를 켤 수 있는가와 남은 쉼(ms). 읽는 중이면 쉼 전체가 남았다. */
export type ListenReady = { ready: boolean; leftMs: number };

/**
 * 읽어 주기 뒤 듣기 쉼(순수): 읽는 중이면 아직 아님(쉼 전체 남음), 읽기가 멈춘 때(quietSince)부터 gapMs 가 지나야 켠다. 읽은 적이 없으면
 * 바로 켠다.
 */
export function listenReadyOf({
  speaking,
  quietSince,
  now,
  gapMs,
}: {
  speaking: boolean;
  /** 마지막 읽기가 멈춘 때(끝 · 끊음 · 감시 상한). 읽은 적이 없으면 없음. */
  quietSince: number | undefined;
  now: number;
  gapMs: number;
}): ListenReady {
  if (speaking) return { ready: false, leftMs: Math.max(0, gapMs) };
  const leftMs = pauseLeftMs({ endedAt: quietSince, now, pauseMs: gapMs });
  return { ready: leftMs === 0, leftMs };
}
