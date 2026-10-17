"use client";

// 배치 평가 화면(4절 배치 평가 행 · 3.2 · 7절 마이크 · 8절 네트워크, plan-p10a 파일별 값 12 · 정할 것 처).
// 시작 → (말하기, 이 기기에서 처음이면) 마이크 안내 · 권한 화면 → 문항('문제 n' · 답 조각 · '몰라요') → 결과 → 수업 목록.
// 평가 중에는 정오 · 힌트 · 뜻 보기가 없다. 마이크를 쓸 수 없는 기기에서는 말하기 배치를 시작하지 않는다(AC-11c).
// 보낸 답은 시도 id 와 함께 기억해 두고, 닿지 않으면 같은 시도 id 로 다시 보낸다(8절 — 서버는 한 번만 저장).
// (P10b 의 기기 대기열 attempt-queue 가 생기면 그것으로 합친다 — 차례 6.)
import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ActivityCard } from "@/components/activities/common";
import { ChoiceAnswer } from "@/components/answer/choice";
import { type MicProblem, RepeatAnswer } from "@/components/answer/repeat";
import { TileAnswer } from "@/components/answer/tiles";
import { TypingAnswer } from "@/components/answer/typing";
import {
  AREA_LABEL,
  BigButton,
  BigLink,
  ChildScreen,
  PaperBand,
  PostIt,
  SmallButton,
  SmallLink,
  StatusLine,
} from "@/components/board/board";
import type { Answer } from "@/core/answer/check";
import { answerShapeOf } from "@/core/answer/display";
import type { PlacementArea } from "@/core/seed/structure";
import {
  clearMicState,
  markMicNoticeSeen,
  markMicUnavailable,
  micNoticeSeen,
  micUsable,
  readDeviceVerdict,
} from "@/lib/mic-state";
import {
  createBrowserSpeech,
  MIC_CHECK_INTERRUPTED_PREFIX,
} from "@/lib/speech/browser";
import type { SpeechPort } from "@/lib/speech/types";
import {
  answerPlacement,
  reportPlacementMic,
  startPlacement,
} from "@/server/actions/placement";
import type { PlacementConfig, PlacementScreen } from "@/server/placement";

/** 화면 글(4절 배치 평가 행 · 7절 · 정본 밖 문구 표 배치 행 · C72). 수는 설정에서. */
const TEXT = {
  start: (n: number) =>
    `처음이라 내게 맞는 단계를 찾아요. 모르는 문제는 '몰라요'를 눌러요. 많아도 ${n}문제예요`,
  startButton: "시작",
  micNotice:
    "말한 소리는 인터넷으로 보내 글자로 바꿔요. 소리는 저장하지 않아요",
  micCheck: "마이크 확인",
  micRetry: "다시 눌러 확인해 주세요",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  stalled: "마이크가 잘 안 돼요. 부모님께 말해 주세요",
  itemNo: (n: number) => `문제 ${n}`,
  dontKnow: "몰라요",
  result: (area: PlacementArea, level: number) =>
    `${AREA_LABEL[area]}는 ${level}단계에서 시작해요`,
  meetTori: "이제 토리를 만날 수 있어요",
  spares: "말하기 일부는 듣기로 봤어요",
  toLessons: "수업 고르러 가기",
  home: "홈",
  next: "다음",
  saveFailed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
} as const;

type Item = Extract<PlacementScreen, { kind: "item" }>;
type Pending = {
  sessionId: string;
  clientAttemptId: string;
  itemId: string;
  answer: Answer;
};
/** 말하기 배치의 마이크 길: 판정 전 · 첫 안내 화면 · 준비됨. */
type MicGate = "pending" | "notice" | "ready";
type Blocked = "needsMic" | "stalled";

export function PlacementFlow({
  area,
  initial,
  config,
}: {
  area: PlacementArea;
  initial: PlacementScreen;
  config: PlacementConfig;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<PlacementScreen>(initial);
  const [port, setPort] = useState<SpeechPort | undefined>();
  const [mic, setMic] = useState<MicGate>(
    area === "speaking" ? "pending" : "ready",
  );
  const [blocked, setBlocked] = useState<Blocked | undefined>();
  const [wantStart, setWantStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [micStatus, setMicStatus] = useState("");
  const [resend, setResend] = useState<Pending | undefined>();
  const focusRef = useRef<HTMLDivElement>(null);
  // 하이드레이션 끝 표시(e2e 가 누르기 전에 기다린다 — 그 전 누름은 처리기가 없어 사라진다)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // 서버가 화면을 새로 그리면(오래된 차례 — stale) 그 화면으로
  useEffect(() => setScreen(initial), [initial]);

  // 음성 접점은 렌더 뒤에 만든다(SpeechPort.device 는 useEffect 에서만, P2b)
  useEffect(() => {
    const created = createBrowserSpeech({ settings: config.speech });
    setPort(created);
    return () => created.dispose();
  }, [config.speech]);

  // 말하기: 마이크를 쓸 수 없는 기기는 시작하지 않는다(AC-11c), 처음이면 마이크 안내 화면을 먼저(4절)
  useEffect(() => {
    if (area !== "speaking") return;
    if (!micUsable()) {
      setBlocked("needsMic");
      return;
    }
    setMic(micNoticeSeen() ? "ready" : "notice");
  }, [area]);

  // 화면이 바뀌면 새 화면으로 초점을 옮긴다(보조 기술이 새 문항을 읽게)
  const screenKey =
    screen.kind === "item" ? screen.itemId : `${screen.kind}:${wantStart}`;
  useEffect(() => {
    if (screenKey) focusRef.current?.focus();
  }, [screenKey]);

  function failMessage() {
    setStatus(navigator.onLine ? TEXT.saveFailed : TEXT.offline);
  }

  async function begin() {
    setBusy(true);
    setStatus("");
    try {
      const out = await startPlacement(area);
      if (out.ok) {
        setScreen(out.screen);
        return;
      }
      if (out.reason === "not_pending") router.replace(`/${area}/lessons`);
      else if (out.reason === "no_profile") router.replace("/first-run");
      else failMessage();
    } catch {
      failMessage();
    } finally {
      setBusy(false);
    }
  }

  async function send(body: Pending) {
    setBusy(true);
    setStatus("");
    try {
      const out = await answerPlacement(body);
      if (out.ok) {
        setResend(undefined);
        setScreen(out.screen);
        return;
      }
      setResend(undefined);
      if (out.reason === "stale") router.refresh();
      else if (out.reason === "not_pending") router.replace(`/${area}/lessons`);
      else if (out.reason === "unavailable") {
        setResend(body);
        failMessage();
      } else failMessage();
    } catch {
      // 요청이 닿지 않음 — 같은 시도 id 로 다시 보낼 수 있게 둔다
      setResend(body);
      failMessage();
    } finally {
      setBusy(false);
    }
  }

  function answer(current: Item, value: Answer) {
    void send({
      sessionId: current.sessionId,
      clientAttemptId: crypto.randomUUID(),
      itemId: current.itemId,
      answer: value,
    });
  }

  function onMicProblem(problem: MicProblem) {
    const browser = readDeviceVerdict().name;
    if (problem.kind === "unavailable") {
      markMicUnavailable(problem.code);
      void reportPlacementMic({
        kind: "mic_unavailable",
        code: problem.code,
        browser,
      }).catch(() => undefined);
      setBlocked("needsMic");
      return;
    }
    void reportPlacementMic({
      kind: "mic_stalled",
      code: problem.code,
      browser,
    }).catch(() => undefined);
    setBlocked("stalled");
  }

  async function checkMic() {
    if (!port || busy) return;
    // 누름 처리 안에서 동기로 부른다(iOS 첫 소리 제약, P2b)
    port.unlockFromGesture();
    setBusy(true);
    setMicStatus("");
    const result = await port.checkMicrophone();
    setBusy(false);
    if (result.ok) {
      clearMicState();
      markMicNoticeSeen();
      setMic("ready");
      if (screen.kind === "ready") await begin();
      return;
    }
    if (
      !result.code.startsWith(MIC_CHECK_INTERRUPTED_PREFIX) &&
      result.group === "mic-unavailable"
    ) {
      onMicProblem({ kind: "unavailable", code: result.code });
      return;
    }
    // 끊김 · 다시 듣기 갈래(audio-capture 한 번 등)는 다시 누르게(7절 — 한 번으로는 닫지 않음)
    setMicStatus(TEXT.micRetry);
  }

  const band = (detail?: string, home = true) => (
    <PaperBand
      heading
      title={AREA_LABEL[area]}
      detail={detail}
      right={home ? <SmallLink href="/">{TEXT.home}</SmallLink> : undefined}
    />
  );

  let body: React.ReactNode;
  if (blocked) {
    body = (
      <>
        {band(undefined, false)}
        <PostIt
          tone={area}
          tilt="slight"
          className="mx-auto mt-8 w-full max-w-xl items-center gap-8 p-10"
        >
          <p className="font-heading text-[28px] leading-snug">
            {blocked === "needsMic" ? TEXT.needsMic : TEXT.stalled}
          </p>
          <BigLink href="/">{TEXT.home}</BigLink>
        </PostIt>
      </>
    );
  } else if (screen.kind === "done") {
    body = (
      <>
        {band(undefined, false)}
        <PostIt
          tone={area}
          tilt="slight"
          className="mx-auto mt-8 w-full max-w-xl items-center gap-6 p-10 text-center"
        >
          <p
            data-placement-result=""
            className="font-heading text-[32px] leading-snug"
          >
            {TEXT.result(area, screen.start)}
          </p>
          {area === "speaking" ? (
            <p className="text-2xl">{TEXT.meetTori}</p>
          ) : null}
          {screen.usedSpares ? <p className="text-xl">{TEXT.spares}</p> : null}
          <BigLink href={`/${area}/lessons`}>{TEXT.toLessons}</BigLink>
        </PostIt>
      </>
    );
  } else if (mic === "pending") {
    // 말하기 마이크 판정 전(첫 그리기) — 띠만
    body = band();
  } else if (screen.kind === "ready" && !(wantStart && mic === "notice")) {
    body = (
      <>
        {band()}
        <PostIt
          tone={area}
          tilt="slight"
          className="mx-auto mt-8 w-full max-w-2xl items-center gap-8 p-10"
        >
          <p className="text-center font-heading text-[28px] leading-snug">
            {TEXT.start(screen.maxItems)}
          </p>
          <BigButton
            disabled={busy}
            onClick={() => {
              port?.unlockFromGesture();
              if (mic === "notice") setWantStart(true);
              else void begin();
            }}
          >
            {TEXT.startButton}
          </BigButton>
          <StatusLine tone="error">{status}</StatusLine>
        </PostIt>
      </>
    );
  } else if (mic === "notice") {
    body = (
      <>
        {band()}
        <PostIt
          tone="paper"
          tilt="slight"
          className="mx-auto mt-8 w-full max-w-2xl items-center gap-8 p-10"
        >
          <p className="text-center font-heading text-[28px] leading-snug">
            {TEXT.micNotice}
          </p>
          <BigButton disabled={busy || !port} onClick={() => void checkMic()}>
            <Mic aria-hidden className="size-7" />
            {TEXT.micCheck}
          </BigButton>
          <StatusLine>{micStatus}</StatusLine>
          <StatusLine tone="error">{status}</StatusLine>
        </PostIt>
      </>
    );
  } else if (screen.kind === "item") {
    const current = screen;
    const onAnswer = (value: Answer) => answer(current, value);
    const shape = answerShapeOf(current.item);
    const item = current.item;
    body = (
      <>
        {band(TEXT.itemNo(current.itemNo))}
        <ActivityCard area={area} className="shadow-postit">
          <div key={current.itemId} data-placement-item={current.itemId}>
            {shape === "choice" &&
            (item.type === "reading" ||
              item.type === "pick-word" ||
              item.type === "listening") ? (
              <ChoiceAnswer
                item={item}
                level={current.level}
                speech={port}
                disabled={busy}
                onAnswer={onAnswer}
              />
            ) : null}
            {shape === "tiles" &&
            (item.type === "copy-tiles" ||
              item.type === "build-tiles" ||
              item.type === "fill-letters" ||
              item.type === "assemble-phrase" ||
              item.type === "assemble-sentence") ? (
              <TileAnswer
                item={item}
                speech={port}
                disabled={busy}
                onAnswer={onAnswer}
              />
            ) : null}
            {shape === "typing" &&
            (item.type === "dictation" ||
              item.type === "fill-blank" ||
              item.type === "fix-sentence") ? (
              <TypingAnswer
                item={item}
                speech={port}
                disabled={busy}
                onAnswer={onAnswer}
              />
            ) : null}
            {item.type === "repeat" && current.repeat ? (
              <RepeatAnswer
                sentence={item.sentence}
                level={current.level}
                speech={port}
                speechSettings={config.speech}
                repeat={current.repeat}
                maxRetries={config.maxRetries}
                homophones={config.homophones}
                disabled={busy}
                onAnswer={onAnswer}
                onMicProblem={onMicProblem}
              />
            ) : null}
          </div>
        </ActivityCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SmallButton
            data-dont-know=""
            disabled={busy}
            onClick={() => onAnswer({ kind: "dont-know" })}
          >
            {TEXT.dontKnow}
          </SmallButton>
          <StatusLine tone="error">{status}</StatusLine>
          {resend ? (
            <BigButton disabled={busy} onClick={() => void send(resend)}>
              {TEXT.next}
            </BigButton>
          ) : null}
        </div>
      </>
    );
  } else {
    body = band();
  }

  return (
    <ChildScreen>
      <div
        ref={focusRef}
        tabIndex={-1}
        data-placement-screen={blocked ?? screen.kind}
        data-hydrated={hydrated ? "" : undefined}
        className="flex flex-col gap-6 outline-none"
      >
        {body}
      </div>
    </ChildScreen>
  );
}
