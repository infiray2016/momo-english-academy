"use client";

// 음성 관찰 페이지 본체(plan-p02 '파일별 값' 9). 어른이 기기에서 음성 접점을 시험하고 기록을 대본으로
// 내보낸다. 아이 화면이 아니다. 소리를 저장하지 않고 서버로 보내지 않는다.
import { useEffect, useMemo, useRef, useState } from "react";
import type { DeviceVerdict } from "@/core/speech/device";
import {
  type AnswerShape,
  type EndRule,
  endRuleFor,
  type ListenOutcome,
  SPEECH_SETTING_KEYS,
  type SpeechSettings,
  speechSettingsFrom,
} from "@/core/speech/listen";
import { bestMatchRate } from "@/core/speech/match-rate";
import {
  parseSpeechScript,
  type RecognitionRun,
  type ScriptEvent,
  type SpeechScript,
  type UtteranceRun,
} from "@/core/speech/script";
import { createBrowserSpeech, pickVoice } from "@/lib/speech/browser";
import type {
  ListenHandle,
  MicrophoneCheck,
  RecognitionCtor,
  RecognitionLike,
  SpeechPort,
  SpeechTraceEntry,
} from "@/lib/speech/types";

type Props = {
  settingsFixture: Record<string, unknown>;
  homophones: string[][];
  sentences: string[];
  speechText: string;
};

const LEVELS = Array.from({ length: 12 }, (_, i) => i + 1);
const PAUSE_MARK = /\[쉼\]/g;

type ObjectMode = "fresh" | "same";

// ── 인식 생성자 감싸기(관찰 페이지만) ──

/** '같은 객체 되풀이': 새로 만들 때마다 같은 인식 객체를 돌려준다(WebKit 321436 재현). */
function sameObjectCtor(Base: RecognitionCtor): RecognitionCtor {
  let shared: RecognitionLike | undefined;
  return function SameObject() {
    shared ??= new Base();
    return shared;
  } as unknown as RecognitionCtor;
}

/** '이벤트 무시': 인식은 돌지만 앱에 이벤트가 하나도 오지 않는다(멈춤 흉내). */
function ignoringCtor(Base: RecognitionCtor): RecognitionCtor {
  return class IgnoreEvents implements RecognitionLike {
    lang = "";
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onstart = null;
    onaudiostart = null;
    onsoundstart = null;
    onspeechstart = null;
    onspeechend = null;
    onsoundend = null;
    onaudioend = null;
    onnomatch = null;
    onresult = null;
    onerror = null;
    onend = null;
    private readonly inner = new Base();
    start() {
      this.inner.lang = this.lang;
      this.inner.continuous = this.continuous;
      this.inner.interimResults = this.interimResults;
      this.inner.maxAlternatives = this.maxAlternatives;
      this.inner.start();
    }
    stop() {
      this.inner.stop();
    }
    abort() {
      this.inner.abort();
    }
  };
}

function nativeCtor(): RecognitionCtor | undefined {
  const w = window as Window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  const ctor =
    typeof w.SpeechRecognition === "function"
      ? w.SpeechRecognition
      : w.webkitSpeechRecognition;
  return typeof ctor === "function" ? (ctor as RecognitionCtor) : undefined;
}

// ── 기록 → 대본(plan-p02 값 4 꼴) ──

type Session = { listen: number; label: string; rule: EndRule };

const ms = (value: number) => Math.max(0, Math.round(value));

function runsOfListen(
  trace: readonly SpeechTraceEntry[],
  listen: number,
): RecognitionRun[] {
  const starts = trace.filter(
    (e): e is Extract<SpeechTraceEntry, { kind: "recognizer-call" }> =>
      e.kind === "recognizer-call" && e.listen === listen && e.call === "start",
  );
  return starts.map((start) => {
    if (start.threw) return { events: [], startThrows: true };
    const callAt = (call: "stop" | "abort") =>
      trace.find(
        (e) =>
          e.kind === "recognizer-call" &&
          e.listen === listen &&
          e.recognizer === start.recognizer &&
          e.call === call,
      )?.at;
    const stopAt = callAt("stop");
    const abortAt = callAt("abort");
    const events: ScriptEvent[] = [];
    const onStop: ScriptEvent[] = [];
    const onAbort: ScriptEvent[] = [];
    for (const e of trace) {
      if (
        e.kind !== "recognizer-event" ||
        e.listen !== listen ||
        e.recognizer !== start.recognizer
      ) {
        continue;
      }
      if (abortAt !== undefined && e.at >= abortAt) {
        onAbort.push({ ...e.event, at: ms(e.at - abortAt) } as ScriptEvent);
      } else if (stopAt !== undefined && e.at >= stopAt) {
        onStop.push({ ...e.event, at: ms(e.at - stopAt) } as ScriptEvent);
      } else {
        events.push({ ...e.event, at: ms(e.at - start.at) } as ScriptEvent);
      }
    }
    if (events.length + onStop.length + onAbort.length === 0) {
      return { events: [], hang: true };
    }
    return {
      events,
      ...(stopAt === undefined ? {} : { onStop }),
      ...(abortAt === undefined ? {} : { onAbort }),
    };
  });
}

function utteranceRuns(trace: readonly SpeechTraceEntry[]): UtteranceRun[] {
  const runs: UtteranceRun[] = [];
  trace.forEach((entry, index) => {
    if (entry.kind !== "speak") return;
    const nextSpeak = trace.findIndex(
      (e, i) => i > index && e.kind === "speak",
    );
    const own = trace
      .slice(index + 1, nextSpeak === -1 ? undefined : nextSpeak)
      .filter(
        (e): e is Extract<SpeechTraceEntry, { kind: "speak-event" }> =>
          e.kind === "speak-event",
      );
    const start = own.find((e) => e.type === "start");
    const end = own.find((e) => e.type === "end" || e.type === "error");
    if (start === undefined) {
      runs.push({ neverStart: true });
      return;
    }
    const run: UtteranceRun = { startAfter: ms(start.at - entry.at) };
    const cut =
      end?.type === "error" &&
      (end.code === "interrupted" || end.code === "canceled");
    if (end === undefined || cut) run.neverEnd = true;
    else {
      run.endAfter = ms(end.at - start.at);
      if (end.type === "error" && end.code !== undefined) run.error = end.code;
    }
    runs.push(run);
  });
  return runs;
}

/**
 * 기록을 대본으로. 끝까지 들은 듣기(끊김 제외)만, start() 순서대로 recognitions 와 observed 를 둔다
 * (단위 replayObserved 가 이 순서를 전제한다). 마이크 확인의 인식 객체는 넣지 않는다.
 */
function buildScript(
  trace: readonly SpeechTraceEntry[],
  sessions: readonly Session[],
  settings: SpeechSettings,
  device: DeviceVerdict | undefined,
  userAgent: string,
): SpeechScript {
  const recognitions: RecognitionRun[] = [];
  const observed: NonNullable<SpeechScript["observed"]> = [];
  for (const session of sessions) {
    const done = trace.find(
      (e): e is Extract<SpeechTraceEntry, { kind: "listen-done" }> =>
        e.kind === "listen-done" && e.listen === session.listen,
    );
    if (done === undefined || done.outcome.kind === "interrupted") continue;
    const begin = trace.find(
      (e) => e.kind === "listen-begin" && e.listen === session.listen,
    );
    const button = trace.find(
      (e) => e.kind === "button" && e.listen === session.listen,
    );
    recognitions.push(...runsOfListen(trace, session.listen));
    observed.push({
      label: session.label,
      rule: session.rule,
      settings,
      ...(button === undefined || begin === undefined
        ? {}
        : { buttonAt: ms(button.at - begin.at) }),
      outcome: done.outcome,
    });
  }
  const voices =
    typeof window.speechSynthesis === "object" && window.speechSynthesis
      ? window.speechSynthesis.getVoices().map((v) => ({
          name: v.name,
          lang: v.lang,
          localService: v.localService,
          default: v.default,
        }))
      : [];
  const date = new Date().toISOString().slice(0, 10);
  const label = device?.name ?? "기기 모름";
  return {
    name: `recorded-${label.replace(/[^A-Za-z0-9.]+/g, "-")}-${date}`,
    source: `H2 기록 — ${label} · OS 판은 device.userAgent · ${date}`,
    recognitions,
    synthesis: { voices, utterances: utteranceRuns(trace) },
    device: { userAgent, label, verdict: device?.verdict ?? "unknown" },
    observed,
  };
}

// ── 화면 ──

function describeOutcome(outcome: ListenOutcome): string {
  switch (outcome.kind) {
    case "result":
      return `결과 · 끝난 까닭 ${outcome.endedBy} · 다시 시작 ${outcome.restarts} · 감시 다시 시작 ${outcome.watchdogRestarts}`;
    case "no-result":
      return "결과 없음";
    case "error":
      return `오류 ${outcome.code} · 갈래 ${outcome.group}`;
    case "stalled":
      return "멈춤";
    case "interrupted":
      return `끊김(${outcome.reason})`;
  }
}

const outcomeText = (outcome: ListenOutcome) =>
  outcome.kind === "result"
    ? outcome.text
    : "partialText" in outcome
      ? outcome.partialText
      : "";

function Section({
  title,
  children,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <section
      data-testid={testId}
      className="space-y-3 rounded-lg border border-neutral-300 bg-white p-4"
    >
      <h2 className="font-semibold text-lg">{title}</h2>
      {children}
    </section>
  );
}

const buttonClass =
  "rounded-md border border-neutral-400 bg-neutral-100 px-3 py-1.5 text-sm disabled:opacity-40";

type Turn = {
  /** 그 턴의 듣기 번호(목록 열쇠). */
  listen: number;
  sentence: string;
  heard: string;
  rate: number;
  outcome: ListenOutcome;
};

export function SpeechProbe({
  settingsFixture,
  homophones,
  sentences,
  speechText,
}: Props) {
  const settings = useMemo(
    () => speechSettingsFrom((key) => settingsFixture[key]),
    [settingsFixture],
  );
  const matchOptions = useMemo(
    () => ({ homophones, nameSlot: "any-word" as const }),
    [homophones],
  );

  const [objectMode, setObjectMode] = useState<ObjectMode>("fresh");
  const [ignoreEvents, setIgnoreEvents] = useState(false);
  const [port, setPort] = useState<SpeechPort>();
  const [device, setDevice] = useState<DeviceVerdict>();
  const [facts, setFacts] = useState<{
    userAgent: string;
    secure: boolean;
    visibility: string;
    microphone: string;
    voices: string[];
    chosenVoice: string;
  }>();
  // 렌더는 trace 상태를, 누름 처리 안의 동기 조회는 traceRef 를 쓴다.
  const traceRef = useRef<SpeechTraceEntry[]>([]);
  const [traceRows, setTraceRows] = useState<
    { seq: number; entry: SpeechTraceEntry }[]
  >([]);
  const trace = useMemo(() => traceRows.map((row) => row.entry), [traceRows]);
  const sessionsRef = useRef<Session[]>([]);
  const [origin, setOrigin] = useState(0);

  const [level, setLevel] = useState(1);
  const [answer, setAnswer] = useState<AnswerShape>("one-sentence");
  const selectedRule = useMemo(
    () => endRuleFor({ area: "speaking", level, answer }, settings),
    [level, answer, settings],
  );

  const [micResult, setMicResult] = useState<MicrophoneCheck>();

  const [altStatus, setAltStatus] = useState<
    "idle" | "speaking" | "ready" | "listening" | "done"
  >("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [liveText, setLiveText] = useState("");
  const handleRef = useRef<ListenHandle>(undefined);
  const turnRef = useRef(0);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [altInterrupted, setAltInterrupted] = useState<string>();

  const [longListening, setLongListening] = useState(false);
  const [longLive, setLongLive] = useState("");
  const [longOutcome, setLongOutcome] = useState<ListenOutcome>();
  const [longListen, setLongListen] = useState<number>();

  const [watchdogListening, setWatchdogListening] = useState(false);
  const [watchdogOutcome, setWatchdogOutcome] = useState<ListenOutcome>();
  const [watchdogListen, setWatchdogListen] = useState<number>();

  const [exported, setExported] = useState("");
  const [exportCheck, setExportCheck] = useState("");

  useEffect(() => {
    setOrigin(performance.now());
    const native = nativeCtor();
    let ctor: RecognitionCtor | undefined;
    if (native !== undefined) {
      const base = objectMode === "same" ? sameObjectCtor(native) : native;
      ctor = ignoreEvents
        ? ignoringCtor(base)
        : objectMode === "same"
          ? base
          : undefined;
    }
    const created = createBrowserSpeech({
      settings,
      recognitionCtor: ctor,
      onTrace(entry) {
        traceRef.current.push(entry);
        const seq = traceRef.current.length;
        setTraceRows((rows) => [...rows, { seq, entry }]);
      },
    });
    setPort(created);
    setDevice(created.device());
    return () => created.dispose();
  }, [settings, objectMode, ignoreEvents]);

  useEffect(() => {
    const synth =
      typeof window.speechSynthesis === "object"
        ? window.speechSynthesis
        : undefined;
    const readFacts = (microphone: string) => {
      const voices = synth?.getVoices() ?? [];
      const english = voices.filter((v) =>
        v.lang.toLowerCase().startsWith("en"),
      );
      setFacts({
        userAgent: navigator.userAgent,
        secure: window.isSecureContext,
        visibility: document.visibilityState,
        microphone,
        voices: english.map(
          (v) =>
            `${v.name} (${v.lang}${v.default ? " · 기본" : ""}${v.localService ? " · 기기 안" : ""})`,
        ),
        chosenVoice:
          pickVoice(voices, settings.lang)?.name ?? "고르지 않음(lang 만)",
      });
    };
    let microphone = "조회 못 함";
    readFacts(microphone);
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((status) => {
        microphone = status.state;
        readFacts(microphone);
      })
      .catch(() => {});
    const onVoices = () => readFacts(microphone);
    synth?.addEventListener?.("voiceschanged", onVoices);
    const onVisibility = () => readFacts(microphone);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      synth?.removeEventListener?.("voiceschanged", onVoices);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [settings.lang]);

  const lastListenId = () =>
    traceRef.current.findLast((e) => e.kind === "listen-begin")?.listen;

  const startListen = (
    rule: EndRule,
    label: string,
    onText: (text: string) => void,
  ) => {
    if (port === undefined) return undefined;
    const handle = port.listen(rule, { text: onText });
    const listen = lastListenId();
    if (listen !== undefined) sessionsRef.current.push({ listen, label, rule });
    return { handle, listen };
  };

  // 교대 시험: 읽어 주기 → 말하기 버튼 → 듣기 → 다음 문장은 누름 없이 읽어 준다.
  const altRule = useMemo(
    () =>
      endRuleFor({ area: "speaking", level, answer: "one-sentence" }, settings),
    [level, settings],
  );

  const speakTurn = (index: number) => {
    if (port === undefined) return;
    const sentence = sentences[index];
    if (sentence === undefined) {
      setAltStatus("done");
      return;
    }
    turnRef.current = index;
    setCurrentTurn(index);
    setAltStatus("speaking");
    port.speak(sentence).then(() => {
      setAltStatus((status) => (status === "speaking" ? "ready" : status));
    });
  };

  const onAltStart = () => {
    if (port === undefined) return;
    port.unlockFromGesture();
    setTurns([]);
    setAltInterrupted(undefined);
    speakTurn(0);
  };

  const onAltSpeak = () => {
    if (altStatus === "listening") {
      handleRef.current?.press();
      return;
    }
    const index = turnRef.current;
    const sentence = sentences[index] ?? "";
    const started = startListen(
      altRule,
      `교대 ${index + 1}턴 · ${level}단계 한 문장 답 · ${objectMode === "same" ? "같은 객체" : "새 객체"}`,
      setLiveText,
    );
    if (started === undefined) return;
    handleRef.current = started.handle;
    setLiveText("");
    setAltStatus("listening");
    started.handle.outcome.then((outcome) => {
      handleRef.current = undefined;
      // 끊김(쪽 숨김 · 다른 듣기 · 떠남)은 턴으로 세지 않고 같은 문장에 머물러 말하기 버튼을 다시 보인다
      // (plan 값 2 갈래 표 interrupted 줄 · 나-4, 검토 p02b M-1). 까닭은 기록 표의 cancel 줄에도 남는다.
      if (outcome.kind === "interrupted") {
        setAltInterrupted(outcome.reason);
        setAltStatus("ready");
        return;
      }
      setAltInterrupted(undefined);
      const heard = outcomeText(outcome);
      setTurns((list) => [
        ...list,
        {
          listen: started.listen ?? list.length,
          sentence,
          heard,
          rate:
            heard === "" ? 0 : bestMatchRate([sentence], heard, matchOptions),
          outcome,
        },
      ]);
      if (index + 1 < sentences.length) speakTurn(index + 1);
      else setAltStatus("done");
    });
  };

  // 긴 말 시험: 두 문장 이상 규칙(상한 없음), '다 말했어요'로 끝낸다.
  const longRule = useMemo(
    () =>
      endRuleFor(
        { area: "speaking", level, answer: "multi-sentence" },
        settings,
      ),
    [level, settings],
  );
  const longHandleRef = useRef<ListenHandle>(undefined);
  const onLongStart = () => {
    const started = startListen(
      longRule,
      `긴 말 · ${level}단계 두 문장 이상 답`,
      setLongLive,
    );
    if (started === undefined) return;
    longHandleRef.current = started.handle;
    setLongListen(started.listen);
    setLongOutcome(undefined);
    setLongLive("");
    setLongListening(true);
    started.handle.outcome.then((outcome) => {
      longHandleRef.current = undefined;
      setLongListening(false);
      setLongOutcome(outcome);
    });
  };

  // 감시 타이머 흉내: '이벤트 무시'를 켜고 한 문장 답으로 듣는다.
  const watchdogHandleRef = useRef<ListenHandle>(undefined);
  const onWatchdogListen = () => {
    if (watchdogListening) {
      watchdogHandleRef.current?.press();
      return;
    }
    const started = startListen(
      altRule,
      `감시 타이머 · ${level}단계 한 문장 답${ignoreEvents ? " · 이벤트 무시" : ""}`,
      () => {},
    );
    if (started === undefined) return;
    watchdogHandleRef.current = started.handle;
    setWatchdogListen(started.listen);
    setWatchdogOutcome(undefined);
    setWatchdogListening(true);
    started.handle.outcome.then((outcome) => {
      watchdogHandleRef.current = undefined;
      setWatchdogListening(false);
      setWatchdogOutcome(outcome);
    });
  };

  const onMicCheck = () => {
    setMicResult(undefined);
    port?.checkMicrophone().then(setMicResult);
  };

  const onExport = () => {
    const script = buildScript(
      traceRef.current,
      sessionsRef.current,
      settings,
      device,
      navigator.userAgent,
    );
    const text = JSON.stringify(script, null, 2);
    setExported(text);
    try {
      parseSpeechScript(JSON.parse(text));
      setExportCheck("대본 규격 통과");
    } catch (error) {
      setExportCheck(`대본 규격 실패: ${String(error)}`);
    }
  };

  const downloadHref = exported
    ? `data:application/json;charset=utf-8,${encodeURIComponent(exported)}`
    : undefined;

  const startsOf = (listen: number | undefined) =>
    trace.filter(
      (e) =>
        e.kind === "recognizer-call" &&
        e.call === "start" &&
        e.listen === listen,
    ).length;

  const longGaps = (() => {
    if (longListen === undefined) return [];
    const gaps: number[] = [];
    const starts = trace.filter(
      (e): e is Extract<SpeechTraceEntry, { kind: "recognizer-call" }> =>
        e.kind === "recognizer-call" &&
        e.call === "start" &&
        e.listen === longListen,
    );
    for (const start of starts) {
      if (start.recognizer === 1) continue;
      const previousEnd = trace.findLast(
        (e) =>
          e.kind === "recognizer-event" &&
          e.listen === longListen &&
          e.recognizer === start.recognizer - 1 &&
          (e.event.type === "end" || e.event.type === "error"),
      );
      if (previousEnd !== undefined)
        gaps.push(Math.round(start.at - previousEnd.at));
    }
    return gaps;
  })();

  const spokenSpeech = speechText.replace(PAUSE_MARK, " ");

  return (
    <main
      data-testid="speech-probe"
      data-ready={port === undefined ? undefined : "true"}
      className="mx-auto max-w-3xl space-y-4 bg-neutral-50 p-4 text-neutral-900 text-sm"
    >
      <h1 className="font-bold text-xl">음성 관찰 페이지(개발용)</h1>
      <p>
        음성 인식 · 읽어 주기를 기기에서 시험하고 기록을 대본으로 내보낸다.
        소리는 저장하지 않고 서버로 보내지 않는다. 시험 문장은 어른이 읽고, 사람
        이름을 말하지 않는다.
      </p>

      <Section title="1. 기기" testId="probe-device">
        <dl className="grid grid-cols-[10rem_1fr] gap-1">
          <dt>판정</dt>
          <dd data-testid="device-verdict">{device?.verdict ?? "…"}</dd>
          <dt>이름</dt>
          <dd data-testid="device-name">{device?.name ?? "…"}</dd>
          <dt>지원 목록(7절 표)</dt>
          <dd>
            {device === undefined ? "…" : device.listed ? "목록 안" : "목록 밖"}
          </dd>
          <dt>읽어 주기</dt>
          <dd>
            {device === undefined ? "…" : device.synthesis ? "있음" : "없음"}
          </dd>
          <dt>안전한 출처</dt>
          <dd>{facts === undefined ? "…" : facts.secure ? "예" : "아니오"}</dd>
          <dt>보이는 상태</dt>
          <dd>{facts?.visibility ?? "…"}</dd>
          <dt>마이크 권한</dt>
          <dd>{facts?.microphone ?? "…"}</dd>
          <dt>영어 음성</dt>
          <dd>
            {facts === undefined
              ? "…"
              : facts.voices.length === 0
                ? "없음"
                : facts.voices.join(", ")}
          </dd>
          <dt>고른 음성</dt>
          <dd data-testid="chosen-voice">{facts?.chosenVoice ?? "…"}</dd>
          <dt>UA</dt>
          <dd className="break-all">{facts?.userAgent ?? "…"}</dd>
        </dl>
      </Section>

      <Section title="2. 설정(시험용, 읽기만)" testId="probe-settings">
        <table className="w-full">
          <tbody>
            {SPEECH_SETTING_KEYS.map((key) => (
              <tr key={key}>
                <td className="pr-4 font-mono">{key}</td>
                <td>{String(settingsFixture[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            단계
            <select
              data-testid="level"
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="border"
            >
              {LEVELS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            답 꼴
            <select
              value={answer}
              onChange={(e) => setAnswer(e.target.value as AnswerShape)}
              className="border"
            >
              <option value="one-sentence">한 문장 답</option>
              <option value="multi-sentence">두 문장 이상 답</option>
            </select>
          </label>
        </div>
        <pre data-testid="end-rule" className="bg-neutral-100 p-2">
          {JSON.stringify(selectedRule)}
        </pre>
      </Section>

      <Section title="3. 마이크 확인" testId="probe-mic">
        <button
          type="button"
          data-testid="mic-check"
          className={buttonClass}
          onClick={onMicCheck}
        >
          마이크 확인
        </button>
        <p data-testid="mic-result">
          {micResult === undefined
            ? "아직 안 함"
            : micResult.ok
              ? "성공"
              : `실패 · 코드 ${micResult.code} · 갈래 ${micResult.group}`}
        </p>
      </Section>

      <Section
        title="4. 교대 시험(읽어 주기 → 인식)"
        testId="probe-alternation"
      >
        <fieldset className="flex gap-4">
          <legend className="sr-only">인식 객체</legend>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="object-mode"
              checked={objectMode === "fresh"}
              onChange={() => setObjectMode("fresh")}
            />
            새 객체(앱 기본)
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="object-mode"
              data-testid="object-same"
              checked={objectMode === "same"}
              onChange={() => setObjectMode("same")}
            />
            같은 객체 되풀이(참고)
          </label>
        </fieldset>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="alt-start"
            className={buttonClass}
            onClick={onAltStart}
            disabled={port === undefined}
          >
            시작
          </button>
          <button
            type="button"
            data-testid="alt-speak"
            className={buttonClass}
            onClick={onAltSpeak}
            disabled={
              altStatus !== "speaking" &&
              altStatus !== "ready" &&
              altStatus !== "listening"
            }
          >
            {altStatus === "listening" ? "그만 듣기" : "말하기"}
          </button>
        </div>
        <p>
          상태 <span data-testid="alt-status">{altStatus}</span> · 턴{" "}
          <span data-testid="alt-turn-count">{turns.length}</span> /{" "}
          {sentences.length} · 지금 문장 {sentences[currentTurn]}
        </p>
        {altInterrupted !== undefined && (
          <p data-testid="alt-interrupted">
            끊김({altInterrupted}) — 턴으로 세지 않고 같은 문장에 머문다.
            '말하기'를 다시 누른다
          </p>
        )}
        <p>듣는 중 글: {liveText}</p>
        <ol data-testid="alt-turns" className="list-decimal space-y-1 pl-5">
          {turns.map((turn) => (
            <li key={turn.listen} data-testid="alt-turn">
              <div>문장: {turn.sentence}</div>
              <div>들은 글: {turn.heard}</div>
              <div>
                일치율 {turn.rate.toFixed(2)} · {describeOutcome(turn.outcome)}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="5. 긴 말 시험(두 문장 이상 답, '다 말했어요'로 끝)"
        testId="probe-long"
      >
        <p className="whitespace-pre-wrap rounded bg-neutral-100 p-2">
          {speechText}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="long-start"
            className={buttonClass}
            onClick={onLongStart}
            disabled={port === undefined || longListening}
          >
            듣기 시작
          </button>
          <button
            type="button"
            data-testid="long-done"
            className={buttonClass}
            onClick={() => longHandleRef.current?.press()}
            disabled={!longListening}
          >
            다 말했어요
          </button>
        </div>
        <p>듣는 중 글: {longLive}</p>
        {longOutcome !== undefined && (
          <div className="space-y-1">
            <p data-testid="long-outcome">{describeOutcome(longOutcome)}</p>
            <p>
              인식 객체{" "}
              <span data-testid="long-objects">{startsOf(longListen)}</span>개 ·
              조각 사이 틈(앞 객체 끝 → 새 객체 시작, ms){" "}
              <span data-testid="long-gaps">
                {longGaps.join(", ") || "없음"}
              </span>
            </p>
            {longOutcome.kind === "result" && (
              <>
                <ol data-testid="long-pieces" className="list-decimal pl-5">
                  {longOutcome.pieces.map((piece, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: 한 결과의 조각 목록은 순서가 바뀌지 않고 같은 글이 되풀이될 수 있다
                    <li key={i}>{piece}</li>
                  ))}
                </ol>
                <p>
                  이어 붙인 글:{" "}
                  <span data-testid="long-text">{longOutcome.text}</span>
                </p>
                <p>
                  원문과 일치율{" "}
                  {bestMatchRate(
                    [spokenSpeech],
                    longOutcome.text,
                    matchOptions,
                  ).toFixed(2)}
                </p>
              </>
            )}
          </div>
        )}
      </Section>

      <Section title="6. 감시 타이머 흉내" testId="probe-watchdog">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            data-testid="watchdog-ignore"
            checked={ignoreEvents}
            onChange={(e) => setIgnoreEvents(e.target.checked)}
          />
          이벤트 무시(인식은 돌지만 앱에 이벤트가 오지 않음)
        </label>
        <button
          type="button"
          data-testid="watchdog-listen"
          className={buttonClass}
          onClick={onWatchdogListen}
          disabled={port === undefined}
        >
          {watchdogListening ? "그만 듣기" : "듣기"}
        </button>
        <p>
          결과{" "}
          <span data-testid="watchdog-outcome">
            {watchdogOutcome === undefined
              ? watchdogListening
                ? "듣는 중"
                : "아직 안 함"
              : describeOutcome(watchdogOutcome)}
          </span>{" "}
          · 인식 객체{" "}
          <span data-testid="watchdog-objects">{startsOf(watchdogListen)}</span>
          개
        </p>
      </Section>

      <Section title="7. 기록" testId="probe-log">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="export"
            className={buttonClass}
            onClick={onExport}
          >
            대본으로 내보내기
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={exported === ""}
            onClick={() => navigator.clipboard?.writeText(exported)}
          >
            복사
          </button>
          {downloadHref !== undefined && (
            <a
              className={buttonClass}
              href={downloadHref}
              download="speech-script.json"
            >
              .json 내려받기
            </a>
          )}
        </div>
        <p className="text-neutral-600">
          내보내기는 끝까지 들은 듣기(끊김 제외)만 start() 순서대로 담는다.
          마이크 확인의 인식 객체는 넣지 않는다.
        </p>
        <p data-testid="export-check">{exportCheck}</p>
        <textarea
          data-testid="export-text"
          readOnly
          value={exported}
          className="h-40 w-full border font-mono text-xs"
        />
        <table className="w-full font-mono text-xs [&_td]:pr-3 [&_th]:pr-3">
          <thead>
            <tr className="text-left">
              <th>ms</th>
              <th>듣기 · 객체</th>
              <th>종류</th>
              <th>내용</th>
            </tr>
          </thead>
          <tbody data-testid="trace-rows">
            {traceRows.map(({ seq, entry }) => (
              <tr key={seq}>
                <td>{Math.round(entry.at - origin)}</td>
                <td>
                  {"listen" in entry ? entry.listen : ""}
                  {"recognizer" in entry ? ` · ${entry.recognizer}` : ""}
                </td>
                <td>{entry.kind}</td>
                <td className="break-all">{traceDetail(entry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </main>
  );
}

function traceDetail(entry: SpeechTraceEntry): string {
  switch (entry.kind) {
    case "listen-begin":
      return JSON.stringify(entry.rule);
    case "recognizer-call":
      return `${entry.call}${entry.threw ? " (던짐)" : ""}`;
    case "recognizer-event": {
      const { event } = entry;
      if (event.type === "result") {
        return `result ${event.results.map((r) => `${r.transcript}${r.isFinal ? "(확정)" : ""}`).join(" | ")}`;
      }
      if (event.type === "error")
        return `error ${event.error} ${event.message ?? ""}`;
      return event.type;
    }
    case "button":
      return "말하기 버튼";
    case "cancel":
      return entry.reason;
    case "listen-done":
      return `${describeOutcome(entry.outcome)} · ${outcomeText(entry.outcome)}`;
    case "speak":
      return `${JSON.stringify(entry.text)} · 음성 ${entry.voice ?? "없음"}`;
    case "speak-event":
      return `${entry.type}${entry.code ? ` ${entry.code}` : ""}`;
    case "mic-check":
      return entry.result.ok
        ? "성공"
        : `실패 ${entry.result.code} · ${entry.result.group}`;
  }
}
