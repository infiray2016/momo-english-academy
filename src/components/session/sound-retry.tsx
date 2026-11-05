"use client";

// 소리를 들려주지 못함(UI · UX spec 2판 R-57 · 설계 4 N-19 · 설계 6 문구 표 · AC-23a (5), 묶음 5-나). 소리가 과제 자극인 자리(말하기 듣기 이해 문항 ·
// 따라 말하기 본보기 · 배치 듣기 · 따라 말하기 문항)에서 읽어 주기가 한 번도 소리를 내지 못하면 그 자리에 안내 한 줄과 큰 '다시 듣기'를 두고,
// 다시도 못 들려주면 아이패드 사파리에는 무음 모드 줄(C111)을 더하고 작은 '다음'을 둔다(배치 예비 문항은 '다음' 없이 기다림 — R-56).
// 저절로 건너뛰지 않는다. 들려준 결과는 음성 층의 speakHeardOutcomeOf 로만 읽는다(0-라 — heard 를 직접 보지 않음). '한 번도 들려주지 못함'은
// not_played 만이고, no_end(끝 알림 없음 · 끊김)는 들려준 것으로 보되 표시(data-sound-heard)만 남긴다. 읽지 않은 한국어 줄(skipped)은 셈에
// 넣지 않는다(가르치고 마-1). 소리를 한 번도 들려주지 못한 채 받은 답은 기술 오류(techError "speak_fail")다. 큰 단추는 판 안 아래 줄(설계 5.4).
import { useMemo, useRef, useState } from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import { BigButton, SmallButton } from "@/components/board/board";
import { MIC_BLOCKED_TEXT } from "@/components/session/stuck-buttons";
import { type SpeakHeard, speakHeardOutcomeOf } from "@/core/speech/pace";
import type { SpeakOutcome, SpeechPort } from "@/lib/speech/types";

/** 설계 6 문구 표(소리를 들려주지 못함 — 소리 자극) 글자 그대로. 무음 모드 줄은 막힘 판과 같은 C111 줄이다. */
export const SOUND_RETRY_TEXT = {
  notice: "소리가 안 나왔어요. 다시 들어 봐요",
  replay: "다시 듣기",
  next: "다음",
  silentMode: MIC_BLOCKED_TEXT.ipadSilentMode,
} as const;

/** 한 자리(문항 · 본보기)의 들려준 결과 셈: 한 번이라도 들려줬나 · 들려주기 전 못 들려준 수 · 마지막 결과(표시용). */
export type SoundTrack = {
  everHeard: boolean;
  failed: number;
  last?: SpeakHeard;
};

export const SOUND_TRACK_START: SoundTrack = { everHeard: false, failed: 0 };

/** 읽어 주기 결과 하나를 셈에 넣는다(순수). skipped 는 소리를 낼 차례가 아니었으니 그대로 둔다. */
export function soundTrackOf(
  track: SoundTrack,
  outcome: SpeakOutcome,
): SoundTrack {
  if (outcome.kind === "skipped") return track;
  const heard = speakHeardOutcomeOf(outcome);
  if (heard !== "not_played")
    return { everHeard: true, failed: track.failed, last: heard };
  return {
    everHeard: track.everHeard,
    failed: track.everHeard ? track.failed : track.failed + 1,
    last: heard,
  };
}

/** 보일 것: 없음 · 안내와 큰 '다시 듣기' · 거기에 작은 '다음'(무음 모드 줄) · '다음' 없이 기다림(배치 예비 문항). */
export type SoundRetryStep = "none" | "retry" | "next" | "wait";

/**
 * 보일 것(순수, N-19): 한 번이라도 들려줬거나 결과가 아직 없으면 없음, 한 번 못 들려주면 다시 듣기, 다시 듣기도 못 들려주면(못 들려준 수 2 이상)
 * canSkip 이면 작은 '다음', 아니면 기다림. '다시 듣기 한 번 뒤 다음'은 차례이지 문턱 값이 아니다(spec 2판 12절 머리 — 새 설정 키 없음).
 */
export function soundRetryStepOf(
  track: SoundTrack,
  { canSkip }: { canSkip: boolean },
): SoundRetryStep {
  if (track.everHeard || track.failed === 0) return "none";
  if (track.failed === 1) return "retry";
  return canSkip ? "next" : "wait";
}

/** 지금 받은 답이 기술 오류인가(순수, R-57): 소리를 한 번도 들려주지 못했다고 안 뒤의 답만. 결과를 아직 모르면 보통 답이다. */
export function soundTechErrorOf(track: SoundTrack): "speak_fail" | undefined {
  return !track.everHeard && track.failed > 0 ? "speak_fail" : undefined;
}

/**
 * 들려준 결과를 듣는 접점: speak 마다 차례를 세어 마지막으로 부른 읽기의 결과만 onOutcome 에 넘긴다(뒤 읽기가 앞 읽기를 끊은 결과는 넘기지
 * 않음). 부르는 쪽에는 결과를 그대로 돌려주고, 그 밖은 그대로 넘긴다(trackedSpeech 와 같은 꼴).
 */
export function heardTrackedSpeech(
  port: SpeechPort,
  onOutcome: (outcome: SpeakOutcome) => void,
): SpeechPort {
  let latest = 0;
  return {
    device: () => port.device(),
    unlockFromGesture: () => port.unlockFromGesture(),
    cancelSpeaking: () => port.cancelSpeaking(),
    listen: (rule, on) => port.listen(rule, on),
    checkMicrophone: () => port.checkMicrophone(),
    dispose: () => port.dispose(),
    speak(text, options) {
      latest += 1;
      const mine = latest;
      return port.speak(text, options).then((outcome) => {
        if (mine === latest) onOutcome(outcome);
        return outcome;
      });
    },
  };
}

/**
 * 한 자리의 들려준 결과(훅): 감싼 접점(그 자리의 읽기 · 다시 듣기를 모두 이 접점으로)과 지금 셈. resetKey(문항 id · 본보기 글)가 바뀌면
 * 처음부터 센다. 접점은 speech 가 같으면 같은 것이라 읽기 효과가 다시 돌지 않는다.
 */
export function useSoundCheck(
  speech: SpeechPort | undefined,
  resetKey: string,
): { port: SpeechPort | undefined; track: SoundTrack } {
  const keyRef = useRef(resetKey);
  keyRef.current = resetKey;
  const [state, setState] = useState<{ key: string; track: SoundTrack }>({
    key: resetKey,
    track: SOUND_TRACK_START,
  });
  const port = useMemo(
    () =>
      speech
        ? heardTrackedSpeech(speech, (outcome) =>
            setState((before) => {
              const key = keyRef.current;
              const base =
                before.key === key ? before.track : SOUND_TRACK_START;
              return { key, track: soundTrackOf(base, outcome) };
            }),
          )
        : undefined,
    [speech],
  );
  return {
    port,
    track: state.key === resetKey ? state.track : SOUND_TRACK_START,
  };
}

/**
 * 안내 줄 · 무음 모드 줄 · 단추 줄(판 안 아래, 설계 5.4): 왼쪽 작은 '다음'(next 만), 오른쪽 큰 '다시 듣기'. 없음이면 그리지 않는다.
 * 표지 data-sound-retry(보일 것) · data-sound-retry-replay · data-sound-retry-next.
 */
export function SoundRetry({
  step,
  ipadSafari,
  disabled = false,
  onReplay,
  onNext,
}: {
  step: SoundRetryStep;
  ipadSafari: boolean;
  disabled?: boolean;
  /** 누름 처리 안에서 그 자리의 소리를 다시 읽는다(감싼 접점으로). */
  onReplay: () => void;
  /** 작은 '다음'(기술 오류로 그 자리를 끝냄). */
  onNext?: () => void;
}) {
  if (step === "none") return null;
  const failedAgain = step === "next" || step === "wait";
  return (
    <div data-sound-retry={step} className="mt-auto flex flex-col gap-3">
      <p role="status" className="font-heading text-2xl leading-snug">
        {SOUND_RETRY_TEXT.notice}
      </p>
      {failedAgain && ipadSafari ? (
        <p data-sound-retry-silent="" className={CHILD_SIZE.guide}>
          {SOUND_RETRY_TEXT.silentMode}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {step === "next" && onNext ? (
          <SmallButton
            data-sound-retry-next=""
            disabled={disabled}
            onClick={onNext}
          >
            {SOUND_RETRY_TEXT.next}
          </SmallButton>
        ) : (
          <span />
        )}
        <BigButton
          data-sound-retry-replay=""
          disabled={disabled}
          onClick={onReplay}
        >
          {SOUND_RETRY_TEXT.replay}
        </BigButton>
      </div>
    </div>
  );
}
