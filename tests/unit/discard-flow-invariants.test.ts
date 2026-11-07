// 버리는 듣기 차례 기계의 불변식(U23 · spec 설계 1 · AC-7 기계 몫, plan 묶음 1).
// 파일 안 씨앗 난수(mulberry32, 새 의존 없음)로 사건 차례를 만들고, 효과에 반응하는 가짜 환경(버림 as · end · 읽기 시작 · 끝 · 진짜 결과 ·
// 숨김 · 떠남 · 누름)을 돌린다. 검사기는 기계와 따로, 입력 · 효과만 보고 F6(진짜는 소리 끝 · 버림 end 뒤 gap 에만, speaking 거짓) ·
// F8(진짜 중 · 닫는 중 · 간격에 읽지 않음) · I-1(소리 요청은 걸린 누름 · 다시 말할 차례에만, 회복 표시는 deaf 뒤 auto 누름에만) · 막힘(걸린
// 누름 · 기계가 부른 소리가 소리 없는 안전 상한까지 기다리지 않음, fix 2 · fix 3)을 잰다. 변이 셋(간격 조건 뺌 · 진짜 중 읽기 흘림 · 들려주지
// 못함 뒤 다시 부르지 않음)이 검사기에 걸리는지도 본다.
import { describe, expect, it } from "vitest";
import {
  type DiscardFlowEffect,
  type DiscardFlowInput,
  type DiscardFlowState,
  type DiscardStep,
  type DiscardTimes,
  discardTimesOf,
  type RealEndKind,
  startDiscardFlow,
  stepDiscardFlow,
} from "@/core/speech/discard";
import { speechSettingsFrom } from "@/core/speech/listen";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const speech = speechSettingsFrom((key) => values[key]);
// discard-flow.test.ts 와 같은 시간 묶음(시험용 설정에서 읽고, 없으면 던진다).
function discardValue(key: string): number {
  const value = values[key];
  if (typeof value !== "number")
    throw new Error(`시험용 설정에 ${key} 가 없다`);
  return value;
}
const T: DiscardTimes = discardTimesOf(
  {
    restMs: discardValue("speech.discard_rest_ms"),
    liveAsMs: discardValue("speech.discard_live_as_ms"),
    minMs: discardValue("speech.discard_min_ms"),
    afterSoundMs: discardValue("speech.discard_after_sound_ms"),
    gapMs: discardValue("speech.discard_gap_ms"),
  },
  speech,
);

/** 표본 수와 한 표본의 길이(장면 자료). */
const SEEDS = 160;
const RUN_MS = 240_000;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Machine = (
  state: DiscardFlowState,
  input: DiscardFlowInput,
  now: number,
) => DiscardStep;

const EFFECT_TYPES = new Set<DiscardFlowEffect["type"]>([
  "discard-start",
  "discard-stop",
  "real-start",
  "speak-release",
  "speak-drop",
  "cancel-speaking",
  "need-sound",
  "press-drop",
  "view",
  "note",
]);

// ── 검사기(기계와 따로 · 입력과 효과만 본다) ──

type SeenDiscard = {
  start: number;
  audio?: number;
  stop?: number;
  abort?: number;
  end?: number;
  heard: boolean;
  np: number;
  leaveStop: boolean;
  /** 이 버림이 열린 동안 소리 요청(need-sound)이 나왔나. */
  asked: boolean;
  /** 마지막 소리 요청 시각(부른 소리 STALL 은 그 뒤 afterSoundMs 를 넘긴 때만 센다 — fix 3 재검토 N-4). */
  askedAt?: number;
};

class Checker {
  readonly violations: string[] = [];
  private unlocked = false;
  private realOpen = false;
  private speaking = false;
  private speakingSince: number | undefined;
  private lastCancel: number | undefined;
  private lastSoundEnd: number | undefined;
  private inputType: DiscardFlowInput["type"] = "tick";
  /** 걸린 누름의 시각(진짜 start · 거둠 · 숨김 · 떠남이면 지움) — 막힘 검사. */
  private pressAt: number | undefined;
  private stalled = false;
  /** 마지막 진짜 결과 종류 · 그 뒤 걸린 누름이나 다시 말할 차례(again) · auto 누름 — I-1 검사. */
  private lastRealKind: RealEndKind | undefined;
  private askPending = false;
  private autoPress = false;
  private readonly discards = new Map<number, SeenDiscard>();
  private readonly inflight = new Map<
    number,
    { started: boolean; discard: number | undefined }
  >();

  constructor(private readonly t: DiscardTimes) {}

  private fail(at: number, rule: string, detail: string) {
    this.violations.push(`${rule} @${Math.round(at)}: ${detail}`);
  }

  private endOf(d: SeenDiscard, now: number): number | undefined {
    if (d.end !== undefined) return d.end;
    const closedAt = d.stop ?? d.abort;
    if (closedAt !== undefined && now >= closedAt + this.t.endWaitMs) {
      return closedAt + this.t.endWaitMs;
    }
    return undefined;
  }

  private open(now: number): [number, SeenDiscard][] {
    return [...this.discards].filter(
      ([, d]) => this.endOf(d, now) === undefined,
    );
  }

  private latest(): SeenDiscard | undefined {
    let last: SeenDiscard | undefined;
    for (const d of this.discards.values()) {
      if (!last || d.start >= last.start) last = d;
    }
    return last;
  }

  private soundEnded(at: number, discard: number | undefined) {
    this.lastSoundEnd = at;
    const d = discard === undefined ? undefined : this.discards.get(discard);
    if (d) d.heard = true;
  }

  /** 걸린 누름이 이 시간 안에 진짜가 되지 않으면 막힘이다(쉼 + 버림 둘의 안전 상한 · end 상한 + 간격 + 여유). */
  private stallBound() {
    const t = this.t;
    return t.restMs + 2 * (t.capMs + t.endWaitMs) + t.gapMs + t.afterSoundMs;
  }

  observeInput(input: DiscardFlowInput, now: number) {
    this.inputType = input.type;
    if (
      !this.stalled &&
      this.pressAt !== undefined &&
      now - this.pressAt > this.stallBound()
    ) {
      this.stalled = true;
      this.fail(
        now,
        "STALL",
        `누름 ${Math.round(this.pressAt)} 뒤 진짜가 열리지 않음`,
      );
    }
    switch (input.type) {
      case "press":
        if (!this.realOpen) {
          this.pressAt ??= now;
          this.askPending = true;
          if (input.auto) this.autoPress = true;
        }
        break;
      case "again":
        if (!this.realOpen) this.askPending = true;
        break;
      case "dont-know":
      case "hidden":
      case "leave":
      case "check":
        this.pressAt = undefined;
        this.askPending = false;
        this.autoPress = false;
        break;
      case "unlock":
        this.unlocked = true;
        break;
      case "synth":
        if (input.speaking && !this.speaking) this.speakingSince = now;
        this.speaking = input.speaking;
        break;
      case "speak-start": {
        const r = this.inflight.get(input.id);
        if (r) r.started = true;
        break;
      }
      case "speak-end": {
        const r = this.inflight.get(input.id);
        if (!r) break;
        this.inflight.delete(input.id);
        if (input.heard) this.soundEnded(now, r.discard);
        else if (r.discard !== undefined) {
          const d = this.discards.get(r.discard);
          if (d) d.np += 1;
        }
        break;
      }
      case "cut":
        for (const r of this.inflight.values()) {
          if (r.started || input.started) this.soundEnded(now, r.discard);
        }
        this.inflight.clear();
        break;
      case "discard-audio": {
        const d = this.discards.get(input.discard);
        if (d && d.audio === undefined && this.endOf(d, now) === undefined) {
          d.audio = now;
        }
        break;
      }
      case "discard-end": {
        const d = this.discards.get(input.discard);
        if (d && this.endOf(d, now) === undefined) d.end = now;
        break;
      }
      case "real-end":
        this.realOpen = false;
        this.lastRealKind = input.kind;
        break;
      default:
        break;
    }
    if (input.type === "hidden" || input.type === "check") {
      for (const [, d] of this.open(now)) d.abort ??= now;
    }
  }

  observeEffects(effects: DiscardFlowEffect[], now: number, wakeAt?: number) {
    if (wakeAt !== undefined && !(wakeAt > now)) {
      this.fail(now, "WAKE", `깨울 시각 ${wakeAt} 이 now 이하`);
    }
    for (const e of effects) {
      if (!EFFECT_TYPES.has(e.type)) this.fail(now, "TYPE", e.type);
      switch (e.type) {
        case "discard-start":
          if (!this.unlocked) this.fail(now, "I-4", "잠금 풀기 전 버림 start");
          if (this.realOpen) this.fail(now, "F8", "진짜가 열린 채 버림 start");
          this.discards.set(e.discard, {
            start: now,
            heard: false,
            np: 0,
            leaveStop: false,
            asked: false,
          });
          break;
        case "discard-stop": {
          const d = this.discards.get(e.discard);
          if (!d) break;
          if (d.stop !== undefined)
            this.fail(now, "STOP", "같은 버림에 stop 두 번");
          d.stop = now;
          d.leaveStop = this.inputType === "leave";
          const dead =
            d.audio !== undefined && d.audio - d.start <= this.t.liveAsMs;
          if (
            dead &&
            !d.heard &&
            !d.leaveStop &&
            d.np < 2 &&
            now < d.start + this.t.capMs
          ) {
            this.fail(now, "F4", "소리 없는 죽은 버림을 상한 전에 stop");
          }
          const silentCap =
            dead &&
            !d.heard &&
            !d.leaveStop &&
            d.np < 2 &&
            now >= d.start + this.t.capMs;
          if (
            silentCap &&
            this.pressAt !== undefined &&
            now - this.pressAt > this.t.afterSoundMs
          ) {
            // 걸린 누름이 있으면 기계가 소리를 부르므로(들려주지 못함 뒤 한 번 더) 소리 없는 안전 상한에 닿지 않는다(fix 2). 상한 바로 앞의
            // 누름은 부른 소리가 오기 전이라 세지 않는다(실제로 기다린 누름만, fix 2 재검토 N-2).
            this.fail(
              now,
              "STALL",
              `누름 ${Math.round(this.pressAt)} 이 소리 없는 안전 상한까지 기다림`,
            );
          }
          if (
            silentCap &&
            d.asked &&
            d.askedAt !== undefined &&
            now - d.askedAt > this.t.afterSoundMs
          ) {
            // 기계가 부른 소리는 들려주지 못해도 한 번 더 부르므로(누름 없는 따라 말하기도) 소리 없는 안전 상한에 닿지 않는다(fix 3).
            this.fail(
              now,
              "STALL",
              `버림 ${Math.round(d.start)} 에서 부른 소리가 소리 없는 안전 상한까지 기다림`,
            );
          }
          break;
        }
        case "real-start":
          this.checkRealStart(now);
          this.realOpen = true;
          this.pressAt = undefined;
          this.askPending = false;
          this.autoPress = false;
          break;
        case "need-sound": {
          if (!this.askPending)
            this.fail(now, "I-1", "걸린 누름 · 다시 말할 차례 없이 소리 요청");
          const open = this.open(now).find(
            ([, d]) => d.stop === undefined && d.abort === undefined,
          );
          if (open) {
            open[1].asked = true;
            open[1].askedAt = now;
          }
          break;
        }
        case "view":
          if (
            e.view.recovering &&
            !(this.lastRealKind === "deaf" && this.autoPress)
          ) {
            this.fail(now, "I-1", "deaf 뒤 auto 누름 없이 회복 표시");
          }
          break;
        case "speak-release":
          this.checkRelease(now);
          this.inflight.set(e.id, {
            started: false,
            discard: this.open(now).find(
              ([, d]) => d.stop === undefined && d.abort === undefined,
            )?.[0],
          });
          break;
        case "press-drop":
          this.pressAt = undefined;
          break;
        case "cancel-speaking":
          this.lastCancel = now;
          for (const r of this.inflight.values()) {
            if (r.started) this.soundEnded(now, r.discard);
          }
          this.inflight.clear();
          break;
        default:
          break;
      }
    }
  }

  private checkRealStart(now: number) {
    const t = this.t;
    if (!this.unlocked) this.fail(now, "I-4", "잠금 풀기 전 진짜 start");
    if (this.open(now).length > 0)
      this.fail(now, "F6", "버림이 열린 채 진짜 start");
    if (this.inflight.size > 0) this.fail(now, "F6", "읽는 중 진짜 start");
    for (const d of this.discards.values()) {
      const end = this.endOf(d, now);
      if (end !== undefined && now < end + t.gapMs) {
        this.fail(now, "F6", `버림 end ${Math.round(end)} + gap 전 진짜 start`);
      }
    }
    if (this.lastSoundEnd !== undefined && now < this.lastSoundEnd + t.gapMs) {
      this.fail(
        now,
        "F6",
        `소리 끝 ${Math.round(this.lastSoundEnd)} + gap 전 진짜 start`,
      );
    }
    if (this.speaking) {
      const stuckOk =
        this.lastCancel !== undefined &&
        this.speakingSince !== undefined &&
        this.lastCancel >= this.speakingSince &&
        now >= this.lastCancel + t.afterSoundMs;
      if (!stuckOk)
        this.fail(now, "F6", "speaking 참인데 굳은 읽기 길 없이 진짜 start");
    }
  }

  private checkRelease(now: number) {
    const t = this.t;
    if (this.realOpen) this.fail(now, "F8", "진짜가 열린 동안 읽기를 흘림");
    const open = this.open(now);
    if (open.some(([, d]) => d.stop !== undefined || d.abort !== undefined)) {
      this.fail(now, "F8", "닫는 중(stop 뒤 end 전)에 읽기를 흘림");
    }
    const live = open.filter(
      ([, d]) => d.stop === undefined && d.abort === undefined,
    );
    for (const [, d] of live) {
      const dead =
        now >= d.start + t.liveAsMs &&
        d.audio !== undefined &&
        d.audio - d.start <= t.liveAsMs;
      if (!dead)
        this.fail(
          now,
          "F8",
          "죽은 버림 판정 전 · 살아 있는 버림 안에서 읽기를 흘림",
        );
    }
    if (open.length === 0) {
      const last = this.latest();
      if (!last || last.stop === undefined) return;
      const dead =
        last.audio !== undefined && last.audio - last.start <= t.liveAsMs;
      const end = this.endOf(last, now);
      if (
        dead &&
        last.heard &&
        last.np < 2 &&
        !last.leaveStop &&
        end !== undefined &&
        now < end + t.gapMs
      ) {
        this.fail(
          now,
          "F8",
          `간격(end ${Math.round(end)} + gap) 안에 읽기를 흘림`,
        );
      }
    }
  }
}

// ── 가짜 환경 · 화면(효과에 반응하고 사건을 낸다) ──

type Ev = { at: number; seq: number; run: () => void };

type Stats = {
  realStarts: number;
  waitedReals: number;
  liveDiscards: number;
  cutPresses: number;
  requestsDuringReal: number;
  stuckCancels: number;
  hiddens: number;
  needSounds: number;
  agains: number;
  recoveries: number;
  /** 부른 소리가 들려주지 못함으로 끝나 한 번 더 부른 수(fix 2). */
  notPlayedRetries: number;
  /** 그중 걸린 누름 없이 한 번 더 부른 수(따라 말하기 꼴, fix 3). */
  notPlayedRetriesNoPress: number;
};

class Sim {
  private readonly q: Ev[] = [];
  private seq = 0;
  private now = 0;
  private step: DiscardStep;
  private nextId = 1;
  private unlocked = false;
  private speaking = false;
  private hidden = false;
  private realOpen = false;
  private realToken = 0;
  private readonly playing = new Map<
    number,
    { token: number; done: () => void }
  >();
  private readonly waitingRelease = new Map<number, () => void>();
  private readonly discOpen = new Set<number>();
  private turnLines = 0;
  private turnActive = false;
  readonly checker: Checker;
  readonly stats: Stats = {
    realStarts: 0,
    waitedReals: 0,
    liveDiscards: 0,
    cutPresses: 0,
    requestsDuringReal: 0,
    stuckCancels: 0,
    hiddens: 0,
    needSounds: 0,
    agains: 0,
    recoveries: 0,
    notPlayedRetries: 0,
    notPlayedRetriesNoPress: 0,
  };

  constructor(
    private readonly rand: () => number,
    private readonly machine: Machine,
    machineTimes: DiscardTimes,
  ) {
    this.checker = new Checker(T);
    this.step = startDiscardFlow(machineTimes);
  }

  private r(a: number, b: number) {
    return a + this.rand() * (b - a);
  }

  private later(delay: number, run: () => void) {
    this.q.push({ at: this.now + Math.max(0, delay), seq: this.seq++, run });
  }

  private deliver(input: DiscardFlowInput) {
    if (input.type === "speak-request" && this.realOpen) {
      this.stats.requestsDuringReal += 1;
    }
    this.checker.observeInput(input, this.now);
    const prev = this.step.state;
    this.step = this.machine(prev, input, this.now);
    this.checker.observeEffects(this.step.effects, this.now, this.step.wakeAt);
    if (
      input.type === "press" &&
      prev.inflight.length > 0 &&
      prev.phase !== "real"
    ) {
      this.stats.cutPresses += 1;
    }
    const disc = this.step.state.discard;
    if (
      prev.discard?.asked &&
      disc?.id === prev.discard.id &&
      disc.askNp > prev.discard.askNp &&
      this.step.effects.some((e) => e.type === "need-sound")
    ) {
      this.stats.notPlayedRetries += 1;
      if (prev.press === undefined && input.type !== "press") {
        this.stats.notPlayedRetriesNoPress += 1;
      }
    }
    for (const e of this.step.effects) this.react(e, prev);
  }

  private synthThen(input: DiscardFlowInput) {
    this.deliver({ type: "synth", speaking: this.speaking });
    this.deliver(input);
  }

  run(): void {
    this.later(0, () => this.teacherLines(1, false));
    this.later(this.r(500, 5000), () => this.childPress(false));
    this.later(this.r(2000, 9000), () => this.background());
    for (let guard = 0; guard < 20_000; guard++) {
      this.q.sort((a, b) => a.at - b.at || a.seq - b.seq);
      const next = this.q[0];
      const wake = this.step.wakeAt;
      const at = Math.min(next?.at ?? Infinity, wake ?? Infinity);
      if (!Number.isFinite(at) || at > RUN_MS) return;
      this.now = at;
      if (wake !== undefined && wake <= (next?.at ?? Infinity)) {
        this.synthThen({ type: "tick" });
      } else {
        this.q.shift();
        next.run();
      }
    }
  }

  // ── 화면(틀) ──

  private request(sound: "teacher" | "short", done: () => void) {
    const id = this.nextId++;
    this.waitingRelease.set(id, done);
    this.deliver({ type: "speak-request", id, sound });
  }

  private teacherLines(n: number, server: boolean) {
    this.turnActive = true;
    this.turnLines = n;
    if (server) this.deliver({ type: "server-wait", on: true });
    const nextLine = () => {
      if (!this.turnActive || this.turnLines <= 0) return;
      this.turnLines -= 1;
      if (server && this.turnLines === 0) {
        this.deliver({ type: "server-wait", on: false });
      }
      this.request("teacher", () => {
        if (!this.turnActive) return;
        if (this.turnLines > 0) this.later(this.r(100, 700), nextLine);
        else {
          this.turnActive = false;
          this.deliver({ type: "sound-end" });
        }
      });
    };
    this.later(server ? this.r(300, 4000) : 0, nextLine);
  }

  private childPress(auto: boolean) {
    if (this.hidden) {
      this.later(this.r(500, 3000), () => this.childPress(auto));
      return;
    }
    if (this.rand() < 0.05 && !auto) {
      this.deliver({ type: "dont-know" });
      this.later(this.r(1000, 6000), () => this.childPress(false));
      return;
    }
    if (!this.unlocked) {
      this.unlocked = true;
      this.deliver({ type: "unlock" });
    }
    this.synthThen({ type: "press", auto });
    // 누름 때 틀의 읽기 줄을 비우고, 줄이 비었으니 소리 끝을 알린다.
    if (this.turnActive) {
      this.turnActive = false;
      this.turnLines = 0;
      this.deliver({ type: "sound-end" });
    }
    if (this.rand() < 0.15)
      this.later(this.r(10, 900), () => this.synthThen({ type: "press" }));
  }

  private afterRealEnd(kind: RealEndKind) {
    if (kind === "result" && this.rand() < 0.8) {
      this.teacherLines(1 + Math.floor(this.rand() * 3), true);
    }
    // 화면이 다시 말할 차례(못 들었어요 안내)를 보이면 again 을 보낸다. 넘김 · 건너뜀(나머지)은 아무것도 보내지 않는다(I-1).
    if (
      (kind === "no-result" || kind === "error" || kind === "stalled") &&
      this.rand() < 0.7
    ) {
      this.stats.agains += 1;
      this.deliver({ type: "again" });
    }
    if (kind === "deaf" && this.rand() < 0.7) {
      this.stats.recoveries += 1;
      this.later(this.r(20, 400), () => this.childPress(true));
    } else {
      this.later(this.r(200, 9000), () => this.childPress(false));
    }
  }

  private background() {
    const roll = this.rand();
    if (roll < 0.03 && !this.hidden) {
      this.hidden = true;
      this.stats.hiddens += 1;
      this.deliver({ type: "hidden" });
      for (const id of this.discOpen) this.endDiscardSoon(id, this.r(5, 80));
      if (this.realOpen) this.interruptReal("hidden");
      this.later(this.r(500, 60_000), () => {
        this.hidden = false;
        this.deliver({ type: "visible" });
      });
    } else if (roll < 0.045) {
      this.deliver({ type: "leave" });
      if (this.realOpen) this.interruptReal("leave");
    } else if (roll < 0.05) {
      this.deliver({ type: "check" });
      for (const id of this.discOpen) this.endDiscardSoon(id, this.r(5, 80));
    } else if (roll < 0.35) {
      // 다시 듣기 · 힌트 듣기 · 말풍선 누르기(아무 때나 — 진짜 · 닫는 중 · 간격에도 온다)
      this.request("teacher", () => this.deliver({ type: "sound-end" }));
    }
    this.later(this.r(2000, 9000), () => this.background());
  }

  private interruptReal(why: "hidden" | "leave") {
    this.realToken += 1;
    this.later(5, () => {
      if (!this.realOpen) return;
      this.realOpen = false;
      this.deliver({ type: "real-end", kind: "interrupted", why });
      this.afterRealEnd("interrupted");
    });
  }

  // ── 음성 접점(효과에 반응) ──

  private endDiscardSoon(id: number, delay: number) {
    this.later(delay, () => {
      if (!this.discOpen.delete(id)) return;
      this.deliver({ type: "discard-end", discard: id });
    });
  }

  private react(e: DiscardFlowEffect, prev: DiscardFlowState) {
    switch (e.type) {
      case "discard-start": {
        const id = e.discard;
        this.discOpen.add(id);
        const roll = this.rand();
        if (roll < 0.6) {
          this.later(this.r(10, 80), () => {
            if (this.discOpen.has(id))
              this.deliver({ type: "discard-audio", discard: id });
          });
        } else if (roll < 0.85) {
          this.stats.liveDiscards += 1;
          this.later(this.r(260, 1160), () => {
            if (this.discOpen.has(id))
              this.deliver({ type: "discard-audio", discard: id });
          });
        } else {
          this.stats.liveDiscards += 1;
        }
        if (this.rand() < 0.08) this.endDiscardSoon(id, this.r(50, 4000));
        if (this.rand() < 0.3) {
          this.later(this.r(300, 3000), () => {
            if (this.discOpen.has(id))
              this.deliver({ type: "discard-result", discard: id });
          });
        }
        break;
      }
      case "discard-stop":
        if (this.rand() < 0.9) this.endDiscardSoon(e.discard, this.r(20, 400));
        break;
      case "real-start": {
        this.stats.realStarts += 1;
        if (
          prev.press !== undefined &&
          (prev.press.auto || this.now > prev.press.at)
        ) {
          this.stats.waitedReals += 1;
        }
        this.realOpen = true;
        const token = ++this.realToken;
        const roll = this.rand();
        const kind: RealEndKind =
          roll < 0.5
            ? "result"
            : roll < 0.65
              ? "no-result"
              : roll < 0.7
                ? "error"
                : roll < 0.75
                  ? "stalled"
                  : roll < 0.95
                    ? "deaf"
                    : "unavailable";
        this.later(this.r(400, 6000), () => {
          if (!this.realOpen || token !== this.realToken) return;
          this.realOpen = false;
          this.deliver({ type: "real-end", kind });
          this.afterRealEnd(kind);
        });
        break;
      }
      case "speak-release": {
        const done = this.waitingRelease.get(e.id) ?? (() => {});
        this.waitingRelease.delete(e.id);
        const token = this.seq;
        this.playing.set(e.id, { token, done });
        const alive = () => this.playing.get(e.id)?.token === token;
        if (this.rand() < 0.88) {
          const startAt = this.r(10, 250);
          this.later(startAt, () => {
            if (!alive()) return;
            this.speaking = true;
            this.deliver({ type: "speak-start", id: e.id });
          });
          this.later(startAt + this.r(300, 2500), () => {
            if (!alive()) return;
            this.playing.delete(e.id);
            this.deliver({ type: "speak-end", id: e.id, heard: true });
            this.settleSpeaking();
            done();
          });
        } else {
          this.later(this.r(500, 2000), () => {
            if (!alive()) return;
            this.playing.delete(e.id);
            this.deliver({ type: "speak-end", id: e.id, heard: false });
            done();
          });
        }
        break;
      }
      case "speak-drop": {
        const done = this.waitingRelease.get(e.id);
        this.waitingRelease.delete(e.id);
        done?.();
        break;
      }
      case "cancel-speaking":
        if (this.playing.size === 0) this.stats.stuckCancels += 1;
        this.playing.clear();
        this.settleSpeaking();
        break;
      case "need-sound":
        this.stats.needSounds += 1;
        this.later(this.r(0, 30), () =>
          this.request("short", () => this.deliver({ type: "sound-end" })),
        );
        break;
      default:
        break;
    }
  }

  /** 읽기가 끝나면 speaking 이 곧 거짓이 된다. 가끔 굳어 오래 참으로 남는다. */
  private settleSpeaking() {
    const stuck = this.rand() < 0.06;
    this.later(stuck ? this.r(400, 2500) : this.r(0, 150), () => {
      if (this.playing.size === 0) this.speaking = false;
    });
  }
}

function runSeeds(machine: Machine, machineTimes: DiscardTimes) {
  const violations: string[] = [];
  const total: Stats = {
    realStarts: 0,
    waitedReals: 0,
    liveDiscards: 0,
    cutPresses: 0,
    requestsDuringReal: 0,
    stuckCancels: 0,
    hiddens: 0,
    needSounds: 0,
    agains: 0,
    recoveries: 0,
    notPlayedRetries: 0,
    notPlayedRetriesNoPress: 0,
  };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const sim = new Sim(mulberry32(seed), machine, machineTimes);
    sim.run();
    for (const v of sim.checker.violations)
      violations.push(`씨앗 ${seed} ${v}`);
    for (const key of Object.keys(total) as (keyof Stats)[]) {
      total[key] += sim.stats[key];
    }
  }
  return { violations, total };
}

/** 변이 1: 간격 조건 뺌 — 기계는 gap 0 으로 돌고 검사기는 설정의 gap 으로 잰다. */
const NO_GAP: DiscardTimes = { ...T, gapMs: 0 };

/** 변이 2: 진짜 중 읽기 흘림 — 진짜 동안 온 읽기 요청을 그 자리에서 흘린다. */
const leakDuringReal: Machine = (state, input, now) => {
  const step = stepDiscardFlow(state, input, now);
  if (input.type !== "speak-request" || state.phase !== "real") return step;
  return {
    ...step,
    state: {
      ...step.state,
      held: step.state.held.filter((h) => h.id !== input.id),
    },
    effects: [...step.effects, { type: "speak-release", id: input.id }],
  };
};

/** 변이 3: 들려주지 못함 뒤 다시 부르지 않음 — 부른 소리가 들려주지 못함으로 끝난 뒤 낸 cancel · 소리 요청을 지운다(fix 2 전 기계). */
const noRetry: Machine = (state, input, now) => {
  const step = stepDiscardFlow(state, input, now);
  const before = state.discard;
  const after = step.state.discard;
  const retry =
    before?.asked === true &&
    after?.id === before.id &&
    after.askNp > before.askNp &&
    step.effects.some((e) => e.type === "need-sound");
  if (!retry) return step;
  return {
    ...step,
    effects: step.effects.filter(
      (e) => e.type !== "need-sound" && e.type !== "cancel-speaking",
    ),
  };
};

describe("버리는 듣기 차례 기계 불변식(U23 · AC-7 기계 몫)", () => {
  const base = runSeeds(stepDiscardFlow, T);

  it("버림 F6 · F8 · I-1 무작위 사건 차례 표본에서 진짜는 버림 end · 소리 끝 + gap 뒤 speaking 거짓(굳은 읽기 길 빼고)에만 열리고, 진짜 · 닫는 중 · 간격에는 읽지 않으며, 소리 요청 · 회복 표시는 걸린 누름 · 다시 말할 차례에만 나온다", () => {
    expect(base.violations.slice(0, 10)).toEqual([]);
  });

  it("버림 불변식 표본은 기다린 누름 · 살아 있는 버림 · 읽는 중 누름 · 진짜 중 읽기 요청 · 굳은 읽기 · 숨김 · 소리 요청 · 들려주지 못함 뒤 다시 부름 길을 모두 지난다", () => {
    const t = base.total;
    expect(t.realStarts).toBeGreaterThan(SEEDS * 5);
    for (const key of [
      "waitedReals",
      "liveDiscards",
      "cutPresses",
      "requestsDuringReal",
      "stuckCancels",
      "hiddens",
      "needSounds",
      "agains",
      "recoveries",
      "notPlayedRetries",
    ] as const) {
      expect(t[key], key).toBeGreaterThan(SEEDS / 4);
    }
    // 누름 없이 한 번 더 부르는 길은 아이 누름보다 드물어(again 뒤 누름 전 들려주지 못함) 따로 잰다(fix 3).
    expect(t.notPlayedRetriesNoPress).toBeGreaterThan(SEEDS / 10);
  });

  it("버림 변이 1(간격 조건 뺌)은 검사기의 F6 에 걸린다", () => {
    const mutant = runSeeds(stepDiscardFlow, NO_GAP);
    expect(mutant.violations.some((v) => v.includes(" F6 @"))).toBe(true);
  });

  it("버림 변이 2(진짜 중 읽기 흘림)는 검사기의 F8 에 걸린다", () => {
    const mutant = runSeeds(leakDuringReal, T);
    expect(
      mutant.violations.some((v) => v.includes("진짜가 열린 동안 읽기를 흘림")),
    ).toBe(true);
  });

  it("버림 변이 3(들려주지 못함 뒤 다시 부르지 않음)은 걸린 누름 · 누름 없이 부른 소리 둘 다 검사기의 막힘에 걸린다(fix 2 · fix 3)", () => {
    const mutant = runSeeds(noRetry, T);
    expect(
      mutant.violations.some((v) =>
        v.includes("이 소리 없는 안전 상한까지 기다림"),
      ),
    ).toBe(true);
    expect(
      mutant.violations.some((v) =>
        v.includes("에서 부른 소리가 소리 없는 안전 상한까지 기다림"),
      ),
    ).toBe(true);
  });
});
