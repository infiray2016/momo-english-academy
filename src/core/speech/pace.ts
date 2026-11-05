// 읽어 주기 빠르기 · 문장 사이 쉼(13절 C125 (1) · (2) — 12절 speech.rate.<구간> · speech.sentence_pause_ms). 회화 토리의 말 ·
// 읽기 지문 읽어 주기 · 말하기 들려주기가 같이 쓴다. 쉼은 문장이 끝난(ended) 뒤에만 두고, 멈추거나 다른 말을 고르면 쉼도
// 끝낸다. 시계는 쉼 하나(setTimeout)뿐이고 화면 · 음성 접점에 기대지 않는다.
import { bandOf } from "@/core/level-band";
import type { SpeechSettings } from "@/core/speech/listen";
import { isKoreanLang } from "@/core/teacher/voice";

/** 그 단계의 읽어 주기 빠르기(Web Speech rate — speech.rate.<구간>). */
export function speakRateOf(
  level: number,
  speech: Pick<SpeechSettings, "rate">,
): number {
  return speech.rate[bandOf(level)];
}

/** Web Speech 읽어 주기 rate 의 기본값(빠르기를 넘기지 않은 발화 — Web Speech API 규격의 기본값, 설계 숫자 아님). */
const WEB_SPEECH_DEFAULT_RATE = 1;
const MS_PER_SECOND = 1000;

/**
 * 읽어 주기 감시 상한(순수, 13절 C166 R1 — UX 검토 U5-1). WebKit 은 발화가 사건 없이 사라지기도 해서 음성 접점이 상한을 둔다.
 * startMs: speak 를 부른 뒤 시작 알림을 기다리는 상한(speech.speak_start_timeout_seconds).
 * endMs: 시작 알림 뒤 끝 알림을 기다리는 상한 — 글 길이 ÷ (1초 글자 수 × 빠르기) + speech.speak_end_timeout_extra_seconds. 1초 글자 수는
 * 한국어 lang 이면 speech.speak_chars_per_second_ko, 그 밖은 speech.speak_chars_per_second(가르치고 spec 설계 10).
 * 글자 수는 넉넉히 느리게 잡아 제대로 읽는 기기에서 먼저 끊지 않게 한다.
 */
export function speakWatchOf(
  {
    text,
    rate,
    lang,
  }: { text: string; rate?: number | undefined; lang?: string | undefined },
  speech: Pick<
    SpeechSettings,
    | "speakStartTimeoutMs"
    | "speakEndExtraMs"
    | "speakCharsPerSecond"
    | "speakCharsPerSecondKo"
  >,
): { startMs: number; endMs: number } {
  const charsPerSecond = isKoreanLang(lang)
    ? speech.speakCharsPerSecondKo
    : speech.speakCharsPerSecond;
  const perSecond = charsPerSecond * (rate ?? WEB_SPEECH_DEFAULT_RATE);
  return {
    startMs: speech.speakStartTimeoutMs,
    endMs:
      Math.ceil((text.length / perSecond) * MS_PER_SECOND) +
      speech.speakEndExtraMs,
  };
}

/**
 * 읽어 주기 감시 결과(UI · UX spec R-48 · 설계 3). played 는 시작 · 끝 알림이 다 온 발화(들려줌), no_end 는 시작 알림은 왔으나
 * 끝 알림 없이 감시가 넘긴 발화(끝 알림 없음 — 소리는 난 것으로 본다), not_played 는 시작 알림이 없는 발화(들려주지 못함 — 소리가
 * 나지 않은 것으로 본다).
 */
export type SpeakHeard = "played" | "no_end" | "not_played";

/**
 * 끝난(ended) 발화가 들렸나(순수, R-48). 시작 알림(onstart)과 끝 알림(onend)이 왔는지만 본다. 시작 알림이 없으면 끝 알림이
 * 왔어도 들려주지 못함이다(소리가 났다는 알림이 없다).
 */
export function speakHeardOf({
  started,
  endNotified,
}: {
  started: boolean;
  endNotified: boolean;
}): SpeakHeard {
  if (!started) return "not_played";
  return endNotified ? "played" : "no_end";
}

/**
 * 여러 문장을 나눠 읽은 결과 모으기(순수, R-48 · R-57). 모두 들려줌이면 들려줌, 모두 들려주지 못함이면 들려주지 못함, 그 밖(섞임 ·
 * 끝 알림 없음 포함)은 끝 알림 없음(들려준 것으로 보되 표시). 빈 목록은 읽을 문장이 없었으니 들려줌이다. R-57 '한 번도 들려주지
 * 못함'은 not_played 만 해당한다.
 */
export function speakHeardOfAll(list: readonly SpeakHeard[]): SpeakHeard {
  if (list.every((heard) => heard === "played")) return "played";
  if (list.every((heard) => heard === "not_played")) return "not_played";
  return "no_end";
}

/** 들려준 결과로 바꿀 읽어 주기 결과의 꼴(음성 접점 SpeakOutcome 과 같은 갈래, 오류 코드는 보지 않는다). */
export type SpokenOutcome =
  | { kind: "ended"; heard: SpeakHeard }
  | { kind: "error"; code: string; started: boolean }
  | { kind: "cancelled" }
  | { kind: "unsupported" };

/**
 * 읽어 주기 결과를 들려준 결과 셋으로 바꾼다(순수, R-48 · R-57 — 검토 M2). 끝남은 heard 그대로, 오류는 시작 알림 전이면 들려주지
 * 못함 · 뒤면 끝 알림 없음, 끊김(앱이나 다른 읽기 · 듣기가 끊음)은 끝 알림 없음, 읽을 수 없는 기기는 소리가 나지 않았으니 들려주지
 * 못함이다. 화면은 heard 를 직접 보지 않고 이 함수를 쓴다(R-57 '한 번도 들려주지 못함'은 not_played 만).
 */
export function speakHeardOutcomeOf(outcome: SpokenOutcome): SpeakHeard {
  switch (outcome.kind) {
    case "ended":
      return outcome.heard;
    case "error":
      return outcome.started ? "no_end" : "not_played";
    case "cancelled":
      return "no_end";
    case "unsupported":
      return "not_played";
  }
}

/** 앞 문장이 끝난 때부터 쉼이 얼마나 남았나(ms). 앞 문장이 없거나 다 지났으면 0. */
export function pauseLeftMs({
  endedAt,
  now,
  pauseMs,
}: {
  endedAt: number | undefined;
  now: number;
  pauseMs: number;
}): number {
  if (endedAt === undefined) return 0;
  return Math.max(0, endedAt + pauseMs - now);
}

/** 끊을 수 있는 쉼. cancel 은 기다리는 쉼을 모두 바로 false 로 끝낸다(그 뒤 sleep 은 다시 쓸 수 있다). */
export type Sleeper = {
  sleep: (ms: number) => Promise<boolean>;
  cancel: () => void;
};

export function createSleeper(): Sleeper {
  const pending = new Map<ReturnType<typeof setTimeout>, () => void>();
  return {
    sleep(ms) {
      if (ms <= 0) return Promise.resolve(true);
      return new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          pending.delete(timer);
          resolve(true);
        }, ms);
        pending.set(timer, () => resolve(false));
      });
    },
    cancel() {
      for (const [timer, stop] of pending) {
        clearTimeout(timer);
        stop();
      }
      pending.clear();
    },
  };
}

/** 읽어 주기 결과의 꼴(음성 접점 SpeakOutcome 의 kind). skipped 는 선생님 한국어 줄을 읽지 않음(가르치고 spec 설계 10). */
export type SpokenKind = {
  kind: "ended" | "cancelled" | "error" | "unsupported" | "skipped";
};

/**
 * 문장을 차례대로 읽는다. 문장이 끝나면(ended) pauseMs 쉬고 다음. 쉼이 끊기거나 alive 가 거짓이면(멈춤 · 다른 말을 고름) 거기서
 * 멈추고 false. 끝나지 않은 문장(끊김 · 오류 · 읽을 수 없는 기기) 뒤에는 쉬지 않고 다음으로 간다 — 멈춤은 alive 로만 본다(쉼을
 * 넣기 전 읽기 줄과 같은 길). 끝까지 가면 true.
 */
export async function speakInTurn(
  texts: readonly string[],
  {
    speak,
    pauseMs,
    sleeper,
    alive = () => true,
  }: {
    speak: (text: string) => Promise<SpokenKind>;
    pauseMs: number;
    sleeper: Sleeper;
    alive?: () => boolean;
  },
): Promise<boolean> {
  let ended = false;
  for (const text of texts) {
    if (!alive()) return false;
    if (ended && !(await sleeper.sleep(pauseMs))) return false;
    if (!alive()) return false;
    ended = (await speak(text)).kind === "ended";
  }
  return alive();
}
