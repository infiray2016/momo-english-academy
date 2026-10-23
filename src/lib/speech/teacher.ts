// 회화 선생님 음성 감싸기(plan 회화-선생님-캐릭터 값 12, AC-19g). 회화 틀의 음성 접점 하나를 감싸서
// speak 마다 선생님 높이 · 목소리 순서를 넣고, 말하기 상태를 알린다: 실제 시작 알림에 켬, 시작했던 발화의 결과
// (끝 · 취소 · 오류 · 미지원)에 끔. 시작한 발화 수를 세어 겹쳐도 마지막 발화가 끝날 때 끈다.
// 빠르기는 부르는 쪽 값 그대로(선생님이 바꾸지 않음 — C125). 듣기 · 장치 · 잠금 풀기 · 마이크 · 닫기는 그대로 넘긴다.
// 오디오 세션 꼴(Safari Audio Session API)은 건드리지 않는다(C109).
import type { SpeakOptions, SpeakOutcome, SpeechPort } from "./types";

export type TeacherVoiceOptions = {
  /** 명단 voice.pitch(미나 1.08 · 리오 0.97). */
  pitch: number;
  /** 명단 voice.prefer(이름 조각 차례). 비면 음성 접점이 pickVoice. */
  voicePrefer: readonly string[];
  /** 말하기 켬(true) · 끔(false). 켬과 끔이 번갈아 온다. */
  onSpeaking: (speaking: boolean) => void;
};

export function teacherSpeech(
  port: SpeechPort,
  teacher: TeacherVoiceOptions,
): SpeechPort {
  let active = 0;

  function speak(text: string, options?: SpeakOptions): Promise<SpeakOutcome> {
    let started = false;
    let settled = false;
    return port
      .speak(text, {
        ...options,
        pitch: teacher.pitch,
        voicePrefer: teacher.voicePrefer,
        onStart: () => {
          // 결과가 난 뒤의 늦은 알림 · 두 번째 알림은 세지 않는다.
          if (!settled && !started) {
            started = true;
            active += 1;
            if (active === 1) teacher.onSpeaking(true);
          }
          options?.onStart?.();
        },
      })
      .finally(() => {
        // 결과(끝 · 취소 · 오류 · 미지원)와 드문 거절 모두에서 센 것을 되돌린다.
        settled = true;
        if (started) {
          active -= 1;
          if (active === 0) teacher.onSpeaking(false);
        }
      });
  }

  return {
    device: () => port.device(),
    unlockFromGesture: () => port.unlockFromGesture(),
    speak,
    cancelSpeaking: () => port.cancelSpeaking(),
    listen: (rule, on) => port.listen(rule, on),
    checkMicrophone: () => port.checkMicrophone(),
    dispose: () => port.dispose(),
  };
}
