// 읽어 주기 뒤 듣기 쉼 지킴이(장부 T-125 · core/speech/listen-gap). 따라 말하기 조각의 읽기가 시작 · 멈출 때 알려 주면, 멈춘 뒤 쉼이
// 지날 때까지 '아직'(말하기 단추 흐림)을 알리고 쉼이 지나면 '켬'을 알린다. 차례는 읽기 멈춤 → 쉼 → (아이가 누름) 듣기다. 듣기를 늦게
// 시작하지 않는다(버리는 듣기를 켜지 않은 길의 누름 처리 안 동기 start 를 지킴 — 켠 기기에서 첫 누름의 잠금 풀기 뒤 누름 밖 start 는 층이
// 맡는다, 기록 7 · 8 · iPad 버리는 듣기 spec 설계 2 · I-4). window 를 읽지 않는다(단위 시험이 돈다 — 시계 · 타이머는 넘겨받음).
import { listenReadyOf } from "@/core/speech/listen-gap";

type Timers = {
  set: (run: () => void, ms: number) => unknown;
  clear: (id: unknown) => void;
};

const defaultTimers: Timers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export type SpeakSettle = {
  /** 읽기를 시작함(단추를 흐린다). */
  began(): void;
  /** 읽기가 멈춤(끝 · 끊음 · 감시 상한 — 쉼을 센다). */
  stopped(): void;
  /** 지금 말하기 단추를 켤 수 있는가. */
  ready(): boolean;
  /**
   * 쉼 타이머를 거둔다(조각이 사라질 때). 그 뒤에도 began · stopped 는 다시 쓸 수 있다(React 개발 모드의 효과 두 번 돌림에서 지킴이가 죽지
   * 않게). 사라진 뒤 늦게 온 stopped 의 알림은 사라진 조각의 상태 바꿈이라 아무 일도 하지 않는다.
   */
  dispose(): void;
};

export function createSpeakSettle({
  gapMs,
  onReady,
  now = () => performance.now(),
  timers = defaultTimers,
}: {
  /** 쉼(ms, 설정값 — 부를 때마다 지금 값). */
  gapMs: () => number;
  /** 켤 수 있음이 바뀔 때. */
  onReady: (ready: boolean) => void;
  now?: () => number;
  timers?: Timers;
}): SpeakSettle {
  let speaking = false;
  let quietSince: number | undefined;
  let timer: unknown;
  let last = true;
  const tell = (ready: boolean) => {
    if (ready === last) return;
    last = ready;
    onReady(ready);
  };
  const clear = () => {
    if (timer !== undefined) timers.clear(timer);
    timer = undefined;
  };
  const check = () => {
    clear();
    const state = listenReadyOf({
      speaking,
      quietSince,
      now: now(),
      gapMs: gapMs(),
    });
    tell(state.ready);
    if (!state.ready && !speaking)
      timer = timers.set(check, Math.max(0, state.leftMs));
  };
  return {
    began() {
      speaking = true;
      check();
    },
    stopped() {
      if (!speaking) return;
      speaking = false;
      quietSince = now();
      check();
    },
    ready: () =>
      listenReadyOf({ speaking, quietSince, now: now(), gapMs: gapMs() }).ready,
    dispose: clear,
  };
}
