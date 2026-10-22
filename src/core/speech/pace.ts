// 읽어 주기 빠르기 · 문장 사이 쉼(13절 C125 (1) · (2) — 12절 speech.rate.<구간> · speech.sentence_pause_ms). 회화 토리의 말 ·
// 읽기 지문 읽어 주기 · 말하기 들려주기가 같이 쓴다. 쉼은 문장이 끝난(ended) 뒤에만 두고, 멈추거나 다른 말을 고르면 쉼도
// 끝낸다. 시계는 쉼 하나(setTimeout)뿐이고 화면 · 음성 접점에 기대지 않는다.
import { bandOf } from "@/core/level-band";
import type { SpeechSettings } from "@/core/speech/listen";

/** 그 단계의 읽어 주기 빠르기(Web Speech rate — speech.rate.<구간>). */
export function speakRateOf(
  level: number,
  speech: Pick<SpeechSettings, "rate">,
): number {
  return speech.rate[bandOf(level)];
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

/** 읽어 주기 결과의 꼴(음성 접점 SpeakOutcome 의 kind). */
export type SpokenKind = {
  kind: "ended" | "cancelled" | "error" | "unsupported";
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
