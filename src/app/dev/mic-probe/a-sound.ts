// 마이크 점검 쪽 '자동 A 라운드'의 브라우저 몫(브리프 task-probe 2026-11-10): 받아 온 소리 파일을 내는 두 길 — Web Audio(fetch →
// decodeAudioData → AudioBufferSourceNode)와 오디오 요소(HTMLAudioElement 의 src · play). 둘 다 러너의 RoundSpeech 꼴(speak · state · cancel)에
// 맞춰 갈아 끼우고, 길 열기(open) · 형식 측정(measure) · 닫기(close)를 더한다. 소리는 부를 때마다 새 주소로 다시 받아 온다(캐시를 거치지
// 않게 — 받기 시작 → 첫 소리 ms 를 잰다). speechSynthesis 는 여기서 건드리지 않는다(읽기 길은 쪽 본체의 roundSpeechOf).
// 녹음하지 않는다(getUserMedia · MediaRecorder 없음, 재생만). 브라우저 API 를 직접 쓰는 얇은 몫이라 단위 시험은 러너(a-round.ts)를 가짜로 덮고,
// 이 파일은 데스크톱 크롬 · 요청자 iPad 에서 직접 돌려 확인한다.
import type { AOpenResult } from "./a-round";
import {
  A_AUDIO_URL,
  A_FORMAT_MIME,
  type AFormat,
  type AMeasure,
  type AReplay,
} from "./probe-log";
import {
  errorFields,
  type RoundSpeakHandlers,
  type RoundSpeakOptions,
  type RoundSpeech,
  tryCall,
} from "./w-round";

/** 형식 측정: 첫 소리 뒤 이만큼 더 재생해 시간이 흐르는지(정말 재생 중인지) 본 뒤 멈춘다. */
const MEASURE_HOLD_MS = 150;
/** 길 열기: AudioContext 의 시간이 흐르기 시작하는지 보는 간격과 그만 보는 때. */
const OPEN_POLL_MS = 50;
const OPEN_POLL_MAX_MS = 10_000;
/** 다시 재생(M6): 끝 알림이 소리 길이 뒤 이만큼 더 지나도 없으면 끊고 '끝 없음'으로 답한다(오디오 요소는 길이를 몰라 통째 상한). */
const REPLAY_TAIL_MS = 1_500;
/** 재운 AudioContext 를 소리 앞에 깨울 때(resume) 기다리는 상한. 넘으면 'resume-blocked' 로 알린다(누름 밖이라 못 깨움). */
const RESUME_WAIT_MS = 1_000;
const REPLAY_ELEMENT_MAX_MS = 5_000;

type OpenReply = (result: AOpenResult, detail: string) => void;

let serial = 0;
let salt: string | null = null;
/** 받을 때마다 다른 주소(브라우저 · CDN 캐시를 거치지 않게). 쪽을 열 때마다 다른 무작위 머리 + 차례 번호. */
function freshUrl(url: string): string {
  salt ??= Math.random().toString(36).slice(2, 10);
  serial += 1;
  return `${url}?n=${salt}-${serial}`;
}

function audioContextCtor(): (new () => AudioContext) | undefined {
  const w = window as unknown as {
    AudioContext?: new () => AudioContext;
    webkitAudioContext?: new () => AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

/** decodeAudioData 는 옛 Safari 가 콜백 꼴만 받았다: 둘 다 건다. */
function decode(ctx: AudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    const pending = ctx.decodeAudioData(bytes, resolve, reject) as
      | Promise<AudioBuffer>
      | undefined;
    if (pending !== undefined && typeof pending.then === "function") {
      pending.then(resolve, reject);
    }
  });
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(freshUrl(url), {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new HttpError(response.status);
  return response.arrayBuffer();
}

class HttpError extends Error {
  constructor(status: number) {
    super(`http ${status}`);
    this.name = `Http${status}`;
  }
}

const failed = (
  via: AMeasure["via"],
  format: AFormat,
  error: string,
): AMeasure => ({
  via,
  format,
  ok: false,
  firstSoundMs: null,
  fetchMs: null,
  decodeMs: null,
  error,
});

const now = () => performance.now();

/** Web Audio 길: 누름 안에서 AudioContext 를 만들어 resume 하고, 소리마다 받아 와 풀어서 버퍼로 재생한다. */
export class WebAudioPath implements RoundSpeech {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private loading = false;
  private playing = false;
  private turn = 0;
  private parked = false;

  /** AudioContext 상태(없으면 null). */
  audioState(): string | null {
    return this.ctx?.state ?? null;
  }

  /**
   * AudioContext 를 만들고(쉬게 해 둔 것이 있으면 그것을) resume. running 이 되고 시간이 흐르기 시작하면 ok — 상태만 running 이고 장치가
   * 아직 안 켜진 때 재면 '재생 안 됨'으로 잘못 적힌다(데스크톱 크롬 첫 실행에서 봄). 누름 밖이라 안 되면 답이 없고 러너의 상한이 가른다.
   */
  open(inGesture: boolean, reply: OpenReply) {
    const Ctor = audioContextCtor();
    if (Ctor === undefined) {
      reply("failed", "unsupported");
      return;
    }
    try {
      const ctx = this.ctx ?? new Ctor();
      this.ctx = ctx;
      const reused = this.parked;
      this.parked = false;
      let told = false;
      let seen: number | null = null;
      const began = now();
      const quit = () => {
        told = true;
        window.clearInterval(poll);
        ctx.removeEventListener("statechange", check);
      };
      const check = () => {
        if (told) return;
        if (this.ctx !== ctx || now() - began > OPEN_POLL_MAX_MS) {
          quit();
          return;
        }
        if (ctx.state !== "running") return;
        seen ??= ctx.currentTime;
        if (ctx.currentTime <= seen) return;
        quit();
        const latency = Math.round(
          ((ctx.baseLatency ?? 0) + (ctx.outputLatency ?? 0)) * 1000,
        );
        reply(
          "ok",
          `running${reused ? " reused" : ""} after=${Math.round(now() - began)}ms latency=${latency}ms rate=${ctx.sampleRate}`,
        );
      };
      const poll = window.setInterval(check, OPEN_POLL_MS);
      ctx.addEventListener("statechange", check);
      ctx.resume().then(check, (error: unknown) => {
        if (told) return;
        quit();
        reply(inGesture ? "failed" : "need-gesture", errorFields(error).code);
      });
      check();
    } catch (error) {
      reply("failed", errorFields(error).code);
    }
  }

  /**
   * 길을 떠날 때: 소리를 멈추고 AudioContext 를 닫지 않고 쉬게 한다(suspend). 읽기 뒤 다시 재생(M6)이 같은 AudioContext 로 재생해 본다 —
   * 앱이라면 수업 내내 하나를 쓰기 때문이다. 라운드가 끝나면 close() 로 닫는다.
   */
  park() {
    this.cancel();
    const ctx = this.ctx;
    if (ctx === null) return;
    this.parked = true;
    void ctx.suspend().catch(() => undefined);
  }

  /**
   * 재우는 꼴: 소리가 끝난 뒤 AudioContext 를 suspend 하고 그 뒤 상태를 답한다. suspend 가 안 되면 닫는다(closed).
   * 다음 소리는 speak 가 resume 으로 깨운다.
   */
  sleep(reply: (state: string) => void) {
    const ctx = this.ctx;
    if (ctx === null) {
      reply("none");
      return;
    }
    ctx.suspend().then(
      () => reply(ctx.state),
      () => {
        if (this.ctx === ctx) this.ctx = null;
        void ctx.close().catch(() => undefined);
        reply("closed");
      },
    );
  }

  /** 다시 재생(M6): 받아 와 풀고 끝까지 재생한다. 시작 · 끝 때의 상태와 재생 동안 흐른 AudioContext 시간을 답한다. */
  replay(format: AFormat, reply: (result: AReplay) => void) {
    const ctx = this.ctx;
    const base = {
      via: "webaudio" as const,
      format,
      started: false,
      ended: false,
      stateAtStart: ctx?.state ?? null,
      stateAtEnd: null,
      flowedMs: null,
      error: null,
    };
    if (ctx === null) {
      reply({ ...base, error: "no-context" });
      return;
    }
    this.halt();
    this.turn += 1;
    const turn = this.turn;
    fetchBytes(A_AUDIO_URL[format])
      .then((bytes) => decode(ctx, bytes))
      .then(
        (buffer) => {
          if (turn !== this.turn) return;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          void ctx.resume().catch(() => undefined);
          source.start();
          const stateAtStart = ctx.state;
          const from = ctx.currentTime;
          this.source = source;
          this.playing = true;
          let told = false;
          const finish = (ended: boolean) => {
            if (told) return;
            told = true;
            window.clearTimeout(cap);
            const mine = turn === this.turn;
            if (mine) this.halt();
            reply({
              ...base,
              started: true,
              ended,
              stateAtStart,
              stateAtEnd: ctx.state,
              flowedMs: Math.round((ctx.currentTime - from) * 1000),
            });
          };
          source.onended = () => finish(true);
          const cap = window.setTimeout(
            () => finish(false),
            buffer.duration * 1000 + REPLAY_TAIL_MS,
          );
        },
        (error: unknown) => {
          if (turn !== this.turn) return;
          reply({ ...base, error: errorFields(error).code });
        },
      );
  }

  state() {
    return { speaking: this.playing, pending: this.loading };
  }

  /** options.text 는 소리 파일 주소다. 받아 와 풀고 재생을 시작한 때 시작 알림(그때 AudioContext 상태), 재생이 끝나면 끝 알림. */
  speak(options: RoundSpeakOptions, handlers: RoundSpeakHandlers) {
    const ctx = this.ctx;
    if (ctx === null) {
      handlers.error("no-context");
      return;
    }
    this.halt();
    this.turn += 1;
    const turn = this.turn;
    this.loading = true;
    fetchBytes(options.text)
      .then((bytes) => decode(ctx, bytes))
      .then(
        (buffer) => {
          if (turn !== this.turn) return;
          this.loading = false;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.onended = () => {
            if (this.source !== source) return;
            this.source = null;
            this.playing = false;
            tryCall(() => source.disconnect());
            handlers.end();
          };
          this.source = source;
          this.playing = true;
          const begin = (note: string) => {
            source.start();
            handlers.start(`${ctx.state}${note}`);
          };
          if (ctx.state === "running") {
            begin("");
            return;
          }
          // 재워 뒀거나 인식 세션이 끼어 멈춘 때: 깨운 뒤에 낸다. 누름 밖이라 못 깨우면 소리 없이 오류로 알린다(러너가 '깨우기'로 적는다)
          const from = ctx.state;
          const began = now();
          let settled = false;
          const fail = (code: string) => {
            if (settled || turn !== this.turn) return;
            settled = true;
            window.clearTimeout(cap);
            this.halt();
            handlers.error(code);
          };
          const cap = window.setTimeout(
            () => fail(`resume-blocked(${ctx.state})`),
            RESUME_WAIT_MS,
          );
          ctx.resume().then(
            () => {
              if (settled || turn !== this.turn) return;
              if (ctx.state !== "running") {
                fail(`resume-blocked(${ctx.state})`);
                return;
              }
              settled = true;
              window.clearTimeout(cap);
              begin(` resumed=${Math.round(now() - began)}ms from=${from}`);
            },
            (error: unknown) =>
              fail(`resume-blocked(${errorFields(error).code})`),
          );
        },
        (error: unknown) => {
          if (turn !== this.turn) return;
          this.loading = false;
          handlers.error(errorFields(error).code);
        },
      );
  }

  cancel() {
    this.turn += 1;
    this.halt();
  }

  private halt() {
    this.loading = false;
    this.playing = false;
    const source = this.source;
    this.source = null;
    if (source === null) return;
    source.onended = null;
    tryCall(() => source.stop());
    tryCall(() => source.disconnect());
  }

  /** 형식 하나: 받기 → 풀기 → 재생 시작(첫 소리) ms. 그 뒤 잠깐 재생해 AudioContext 시간이 흐르는지 보고 멈춘다. */
  measure(format: AFormat, reply: (result: AMeasure) => void) {
    const ctx = this.ctx;
    if (ctx === null) {
      reply(failed("webaudio", format, "no-context"));
      return;
    }
    const t0 = now();
    let t1 = t0;
    fetchBytes(A_AUDIO_URL[format])
      .then((bytes) => {
        t1 = now();
        return decode(ctx, bytes);
      })
      .then(
        (buffer) => {
          const t2 = now();
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          void ctx.resume().catch(() => undefined);
          source.start();
          const t3 = now();
          const startedAt = ctx.currentTime;
          window.setTimeout(() => {
            const ok = ctx.state === "running" && ctx.currentTime > startedAt;
            tryCall(() => source.stop());
            tryCall(() => source.disconnect());
            reply({
              via: "webaudio",
              format,
              ok,
              firstSoundMs: ok ? Math.round(t3 - t0) : null,
              fetchMs: Math.round(t1 - t0),
              decodeMs: Math.round(t2 - t1),
              error: ok ? null : `not-playing(${ctx.state})`,
            });
          }, MEASURE_HOLD_MS);
        },
        (error: unknown) => {
          reply(failed("webaudio", format, errorFields(error).code));
        },
      );
  }

  close() {
    this.cancel();
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx !== null) void ctx.close().catch(() => undefined);
  }
}

/** 오디오 요소 길: 요소 하나를 누름 안(또는 허락되면 누름 밖)에서 한 번 재생해 열고, 그 요소의 src 를 바꿔 가며 재생한다. */
export class ElementPath implements RoundSpeech {
  private el: HTMLAudioElement | null = null;
  private loading = false;
  private playing = false;
  private detach: (() => void) | null = null;

  /** canPlayType 값('' · maybe · probably). 재생용 요소를 만들지 않고 묻는다. */
  static canPlay(format: AFormat): string {
    return document.createElement("audio").canPlayType(A_FORMAT_MIME[format]);
  }

  /** 요소의 첫 재생(WAV 파일을 playing 알림까지). 누름 밖이라 막히면(NotAllowedError) need-gesture. */
  open(inGesture: boolean, reply: OpenReply) {
    try {
      const el = this.el ?? new Audio();
      el.preload = "auto";
      this.el = el;
      this.run(A_AUDIO_URL.wav, {
        playing: () => {
          this.cancel();
          reply("ok", "playing");
        },
        ended: () => reply("ok", "ended"),
        error: (code) =>
          reply(
            code === "NotAllowedError" && !inGesture
              ? "need-gesture"
              : "failed",
            code,
          ),
      });
    } catch (error) {
      reply("failed", errorFields(error).code);
    }
  }

  state() {
    return { speaking: this.playing, pending: this.loading };
  }

  /** options.text 는 소리 파일 주소다. playing 알림이 첫 소리(시작 알림), ended 가 끝 알림. */
  speak(options: RoundSpeakOptions, handlers: RoundSpeakHandlers) {
    if (this.el === null) {
      handlers.error("no-element");
      return;
    }
    const el = this.el;
    this.run(options.text, {
      playing: () => handlers.start(`readyState=${el.readyState}`),
      ended: () => handlers.end(),
      error: (code) => handlers.error(code),
    });
  }

  cancel() {
    this.detach?.();
    this.detach = null;
    this.loading = false;
    this.playing = false;
    const el = this.el;
    if (el !== null) tryCall(() => el.pause());
  }

  /** 형식 하나: src 를 둔 때 → playing 알림(첫 소리) ms. 그 뒤 잠깐 재생해 재생 자리가 나아가는지 보고 멈춘다. */
  measure(format: AFormat, reply: (result: AMeasure) => void) {
    const el = this.el;
    if (el === null) {
      reply(failed("element", format, "no-element"));
      return;
    }
    const t0 = now();
    this.run(A_AUDIO_URL[format], {
      playing: () => {
        const t1 = now();
        window.setTimeout(() => {
          const ok = !el.paused && el.currentTime > 0;
          this.cancel();
          reply({
            via: "element",
            format,
            ok,
            firstSoundMs: ok ? Math.round(t1 - t0) : null,
            fetchMs: null,
            decodeMs: null,
            error: ok ? null : "not-playing",
          });
        }, MEASURE_HOLD_MS);
      },
      ended: () => undefined,
      error: (code) => reply(failed("element", format, code)),
    });
  }

  /** 다시 재생(M6): 파일을 끝까지 재생한다. playing · ended 알림과 재생 자리가 나아간 ms 를 답한다. */
  replay(format: AFormat, reply: (result: AReplay) => void) {
    const el = this.el;
    const base = {
      via: "element" as const,
      format,
      started: false,
      ended: false,
      stateAtStart: null,
      stateAtEnd: null,
      flowedMs: null,
      error: null,
    };
    if (el === null) {
      reply({ ...base, error: "no-element" });
      return;
    }
    let started = false;
    let told = false;
    const finish = (ended: boolean, error: string | null) => {
      if (told) return;
      told = true;
      window.clearTimeout(cap);
      const flowedMs = Math.round(el.currentTime * 1000);
      this.cancel();
      reply({ ...base, started, ended, flowedMs, error });
    };
    const cap = window.setTimeout(
      () => finish(false, null),
      REPLAY_ELEMENT_MAX_MS,
    );
    this.run(A_AUDIO_URL[format], {
      playing: () => {
        started = true;
      },
      ended: () => finish(true, null),
      error: (code) => finish(false, code),
    });
  }

  /** 길을 떠날 때: 소리를 멈추되 요소는 둔다(한 번 연 요소라 읽기 뒤 다시 재생이 누름 없이 쓸 수 있다). */
  park() {
    this.cancel();
  }

  close() {
    this.cancel();
    const el = this.el;
    this.el = null;
    if (el === null) return;
    tryCall(() => {
      el.removeAttribute("src");
      el.load();
    });
  }

  /** 요소에 새 주소를 두고 재생한다. 알림은 한 번씩만 넘기고, 다음 재생 · 멈춤 때 뗀다. */
  private run(
    url: string,
    on: {
      playing: () => void;
      ended: () => void;
      error: (code: string) => void;
    },
  ) {
    const el = this.el;
    if (el === null) return;
    this.cancel();
    let started = false;
    let over = false;
    const onPlaying = () => {
      if (started || over) return;
      started = true;
      this.loading = false;
      this.playing = true;
      on.playing();
    };
    const finish = (tell: () => void) => {
      if (over) return;
      over = true;
      off();
      if (this.detach === off) this.detach = null;
      this.loading = false;
      this.playing = false;
      tell();
    };
    const onEnded = () => finish(on.ended);
    const onError = () =>
      finish(() => on.error(`MediaError${el.error?.code ?? ""}`));
    const off = () => {
      over = true;
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
    el.addEventListener("playing", onPlaying);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    this.detach = off;
    this.loading = true;
    el.src = freshUrl(url);
    el.play().catch((error: unknown) => {
      // 멈춤(pause · 새 src)으로 끊긴 play() 의 AbortError 는 알림을 뗀 뒤라 여기서 걸러진다
      if (over) return;
      finish(() => on.error(errorFields(error).code));
    });
  }
}
