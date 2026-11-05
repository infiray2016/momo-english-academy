"use client";

// 배치 평가 화면(4절 배치 평가 행 · 3.2 · 7절 마이크 · 8절 네트워크, plan-p10a 파일별 값 12 · 정할 것 처).
// 시작 → (말하기, 이 기기에서 처음이면) 마이크 안내 · 권한 화면 → 문항('문제 n' · 답 조각 · '몰라요') → 결과 → 수업 목록.
// 평가 중에는 정오 · 힌트 · 뜻 보기가 없다. 마이크를 쓸 수 없는 기기에서는 말하기 배치를 시작하지 않는다(AC-11c).
// 보낸 답은 시도 id 와 함께 기억해 두고, 닿지 않으면 같은 시도 id 로 다시 보낸다(8절 — 서버는 한 번만 저장).
// (P10b 의 기기 대기열 attempt-queue 가 생기면 그것으로 합친다 — 차례 6.)
// 화면 꼴(UI · UX 묶음 5-가 · spec 설계 5.4 세션 · 결과 · 막힘 행 · D-1 · D-10): 위 띠 아래 큰 판 하나(FamilyBoard — 판 아래 끝 = 보는 창 아래
// 끝). 시작 · 마이크 안내 · 막힘 · 결과는 판 안 가운데, 문항은 영역 색 판에 답 조각과 판 안 아래 단추 줄('몰라요' 작은 · 다시 보내는 '다음'
// 큰). 문항 흐름 · 시도 다시 보냄 · 마이크 길 · 단추 차례 · 문구는 그대로다.
// 소리를 들려주지 못함(묶음 5-나 · spec 2판 R-56 · R-57 · N-19): 듣기 · 따라 말하기 문항의 소리를 한 번도 들려주지 못하면 판 안 아래에 안내 한 줄과
// 큰 '다시 듣기'(sound-retry), 다시도 못 들려주면 무음 모드 줄(아이패드 사파리)과 작은 '다음'. 그동안 받은 답 · '다음'은 techError 로 보내
// 같은 번호의 예비 문항을 받는다. 예비로 넘길 수 없는 문항(예비 문항 — 서버의 techSpare 거짓)은 '다음' 없이 답을 막고 다시 듣기를 기다린다.
import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ICON_STROKE } from "@/components/activities/common";
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
  SmallButton,
  SmallLink,
  StatusLine,
} from "@/components/board/board";
import { FamilyBoard } from "@/components/session/family-board";
import {
  MicBlockedPanel,
  useIpadSafari,
} from "@/components/session/mic-blocked";
import {
  SoundRetry,
  soundRetryStepOf,
  soundTechErrorOf,
  useSoundCheck,
} from "@/components/session/sound-retry";
import type { Answer } from "@/core/answer/check";
import { answerShapeOf } from "@/core/answer/display";
import type { PlacementArea } from "@/core/seed/structure";
import { TEACHER_TEXT } from "@/core/teacher/name";
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
  /** 마이크 확인 단추 아래 안내(C72 — 확인은 소리가 들어와야 성공, fix 5). */
  micSpeakHint: "단추를 누른 뒤 아무 말이나 한마디 해 주세요",
  micRetry: "다시 눌러 확인해 주세요",
  itemNo: (n: number) => `문제 ${n}`,
  dontKnow: "몰라요",
  result: (area: PlacementArea, level: number) =>
    `${AREA_LABEL[area]}는 ${level}단계에서 시작해요`,
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
  /** 답(기술 오류로 답 없이 넘긴 '다음'만 없다). */
  answer?: Answer;
  /** 소리를 한 번도 들려주지 못한 채 받은 답 · '다음'(R-56). */
  techError?: "speak_fail";
};
/** 말하기 배치의 마이크 길: 판정 전 · 첫 안내 화면 · 준비됨. */
type MicGate = "pending" | "notice" | "ready";
type Blocked = "needsMic" | "stalled";

/**
 * 막힘 화면 '다시 해 볼래요'로 마이크가 다시 된 뒤의 마이크 길(순수, 13절 C166 R6 · 검토 A M-8): 판정 전(쓸 수 없는 기기로 막혀 시작도 못
 * 함)이면 처음 마이크 안내를 봤는지에 따라 안내 · 준비, 이미 지났으면 그대로(같은 자리 — 하던 문항).
 */
export function micGateAfterRecovery(
  mic: MicGate,
  noticeSeen: boolean,
): MicGate {
  if (mic !== "pending") return mic;
  return noticeSeen ? "ready" : "notice";
}

/** 소리가 과제 자극인 배치 문항인가(듣기 · 따라 말하기 — R-56). */
function isSoundItem(current: Item): boolean {
  return current.item.type === "listening" || current.item.type === "repeat";
}

/** 그 문항에서 들려줄 글(듣기 대본 · 따라 말할 문장). */
function soundTextOf(current: Item): string {
  const item = current.item;
  if (item.type === "listening") return item.script;
  if (item.type === "repeat") return item.sentence;
  return "";
}

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
  const ipadSafari = useIpadSafari();
  const [wantStart, setWantStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [micStatus, setMicStatus] = useState("");
  const [resend, setResend] = useState<Pending | undefined>();
  const focusRef = useRef<HTMLDivElement>(null);
  // 소리 문항의 들려준 결과(R-57 — 문항마다 처음부터 센다). 보기 · 따라 말하기 조각은 이 접점으로 읽는다
  const sound = useSoundCheck(
    port,
    screen.kind === "item" ? screen.itemId : screen.kind,
  );
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

  /** 답 보내기. 소리 문항을 한 번도 들려주지 못한 채 받은 답은 기술 오류로(실패 3회는 마이크 쪽 일이라 그대로 — R-57). */
  function answer(current: Item, value: Answer | undefined) {
    const tech =
      isSoundItem(current) && value?.kind !== "repeat-failed"
        ? soundTechErrorOf(sound.track)
        : undefined;
    void send({
      sessionId: current.sessionId,
      clientAttemptId: crypto.randomUUID(),
      itemId: current.itemId,
      ...(value ? { answer: value } : {}),
      ...(tech ? { techError: tech } : {}),
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
        <FamilyBoard
          kind="stuck"
          tone={area}
          fill
          center
          paperKey={`placement:${area}`}
        >
          {/* 막힘 판(7절 '막힘 화면' · [승인 UX3]): 아이패드 사파리면 둘째 줄 무음 모드(C111), 큰 '다시 해 볼래요'(C166 R6 · 검토 A M-8 —
              마이크가 되면 그 문항, 판정 전이면 마이크 안내), 작은 '홈' */}
          <MicBlockedPanel
            fill
            kind={blocked}
            ipadSafari={ipadSafari}
            busy={busy}
            retry={{
              speech: port,
              disabled: busy,
              onRecovered: () => {
                setMic((m) => micGateAfterRecovery(m, micNoticeSeen()));
                setBlocked(undefined);
              },
            }}
            home={{ href: "/" }}
          />
        </FamilyBoard>
      </>
    );
  } else if (screen.kind === "done") {
    body = (
      <>
        {band(undefined, false)}
        <FamilyBoard
          kind="result"
          tone={area}
          fill
          center
          paperKey={`placement:${area}`}
        >
          <p
            data-placement-result=""
            className="font-heading text-[32px] leading-snug"
          >
            {TEXT.result(area, screen.start)}
          </p>
          {area === "speaking" ? (
            <p className="text-2xl">{TEACHER_TEXT.meetTeacher}</p>
          ) : null}
          {screen.usedSpares ? <p className="text-xl">{TEXT.spares}</p> : null}
          <BigLink href={`/${area}/lessons`}>{TEXT.toLessons}</BigLink>
        </FamilyBoard>
      </>
    );
  } else if (mic === "pending") {
    // 말하기 마이크 판정 전(첫 그리기) — 띠와 빈 판(판정 뒤 판이 뛰지 않게)
    body = (
      <>
        {band()}
        <FamilyBoard
          kind="session"
          tone={area}
          fill
          paperKey={`placement:${area}`}
        />
      </>
    );
  } else if (screen.kind === "ready" && !(wantStart && mic === "notice")) {
    body = (
      <>
        {band()}
        <FamilyBoard
          kind="session"
          tone={area}
          fill
          center
          paperKey={`placement:${area}`}
          className="gap-8"
        >
          <p className="max-w-2xl text-center font-heading text-[28px] leading-snug">
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
        </FamilyBoard>
      </>
    );
  } else if (mic === "notice") {
    body = (
      <>
        {band()}
        <FamilyBoard
          kind="session"
          fill
          center
          paperKey={`placement:${area}`}
          className="gap-8"
        >
          <p
            data-mic-notice=""
            className="max-w-2xl text-center font-heading text-[28px] leading-snug"
          >
            {TEXT.micNotice}
          </p>
          <BigButton disabled={busy || !port} onClick={() => void checkMic()}>
            <Mic aria-hidden className="size-7" strokeWidth={ICON_STROKE} />
            {TEXT.micCheck}
          </BigButton>
          <p data-mic-speak-hint="" className="text-center">
            {TEXT.micSpeakHint}
          </p>
          <StatusLine>{micStatus}</StatusLine>
          <StatusLine tone="error">{status}</StatusLine>
        </FamilyBoard>
      </>
    );
  } else if (screen.kind === "item") {
    const current = screen;
    const onAnswer = (value: Answer) => answer(current, value);
    const shape = answerShapeOf(current.item);
    const item = current.item;
    const soundItem = isSoundItem(current);
    const soundStep = soundItem
      ? soundRetryStepOf(sound.track, { canSkip: current.techSpare })
      : "none";
    // 예비로 넘길 수 없는 문항은 소리를 들려주기 전에 답을 받지 않는다(같은 자리에서 다시 듣기를 기다림 — R-56)
    const held =
      soundItem &&
      !current.techSpare &&
      soundTechErrorOf(sound.track) !== undefined;
    const answerOff = busy || held;
    const itemSpeech = soundItem ? sound.port : port;
    body = (
      <>
        {band(TEXT.itemNo(current.itemNo))}
        <FamilyBoard
          kind="session"
          tone={area}
          fill
          paperKey={`placement:${area}`}
          data-activity-card=""
        >
          <div key={current.itemId} data-placement-item={current.itemId}>
            {shape === "choice" &&
            (item.type === "reading" ||
              item.type === "pick-word" ||
              item.type === "listening") ? (
              <ChoiceAnswer
                item={item}
                level={current.level}
                speech={itemSpeech}
                disabled={answerOff}
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
                speech={itemSpeech}
                speechSettings={config.speech}
                repeat={current.repeat}
                maxRetries={config.maxRetries}
                homophones={config.homophones}
                disabled={answerOff}
                onAnswer={onAnswer}
                onMicProblem={onMicProblem}
              />
            ) : null}
          </div>
          {/* 판 안 아래(설계 5.4 · D-10): 소리를 들려주지 못함(N-19)과 단추 줄 '몰라요'(작은) · 안내 줄 · 다시 보내는 '다음'(큰) */}
          <div className="mt-auto flex flex-col gap-4">
            <SoundRetry
              step={soundStep}
              ipadSafari={ipadSafari}
              disabled={busy}
              onReplay={() => {
                if (!soundItem || !sound.port) return;
                sound.port.unlockFromGesture();
                void sound.port.speak(soundTextOf(current));
              }}
              onNext={() => answer(current, undefined)}
            />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <SmallButton
                data-dont-know=""
                disabled={answerOff}
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
          </div>
        </FamilyBoard>
      </>
    );
  } else {
    body = (
      <>
        {band()}
        <FamilyBoard
          kind="session"
          tone={area}
          fill
          paperKey={`placement:${area}`}
        />
      </>
    );
  }

  return (
    <ChildScreen>
      <div
        ref={focusRef}
        tabIndex={-1}
        data-placement-screen={blocked ?? screen.kind}
        data-hydrated={hydrated ? "" : undefined}
        className="flex flex-1 flex-col gap-6 outline-none"
      >
        {body}
      </div>
    </ChildScreen>
  );
}
