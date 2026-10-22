"use client";

// 회화 틀(plan-p13b 파일별 값 7, 4절 회화 세션 표 · 3.3 회화 문단 · 7절 · 8절 · 13절 C30 · C34 · C53 (2) · C92 · C100 · C103 · 재검토 N-1).
// 위 종이 띠(오늘 이야기 제목 · '회화 · n단계 · 단원 u' · '말 주고받기 n / 목표 턴'(목표 턴 뒤 '다 했어요! 더 이야기하기 n / …') · '홈'),
// 구석 작은 '그만하기'(대화 · 더 이야기하기 동안), 옆 칸 하나(오늘 이야기 목록 — 카드 todayTopicsKo), 아래 '토리의 약속' 한 줄(4절 글 그대로).
// 열 때 차례: 마이크를 쓸 수 없는 기기면 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈'만(세션 진행 — 7절) → (처음 회화 안내 —
// 차례 6 의 따라 말하기 조각이 이 자리에 든다) → 처음 마이크 안내(기기마다 한 번, P10 MIC_NOTICE_KEY — 그 누름이 첫 읽어 주기를 연다) →
// 1-가 하루 안전 상한이면 '토리가 잠깐 쉬어요'(P11b AiRest). 한 턴: 토리 말풍선(흘러 받은 문장 · 뜻 · 붙인 말, 바로 읽기) → 아이 차례 →
// 턴 요청(talk-stream) → … . 인사 끝 턴 뒤 토막 넘김(advanceTalk — 대화 첫 질문을 붙임), 목표 턴 뒤 '더 이야기하기' · '그만하기'.
// stale · 끊김은 talk-stream 의 되풀이(같은 시도 id — 기다렸다 자료를 다시 읽고 판이 같으면 다시 보냄 · 온라인 끊김은 기다렸다 다시)가
// 다루고, 그래도 안 되면 '인터넷이 끊겼어요 …' + '다시 해 보기' · online 때 다시(I-1). 턴 요청은 다음 턴 · '홈' · '그만하기' · 틀
// 사라짐에서 끊는다(I-2). 토리의 말이 없는
// 마지막 아이 행(view.retryTurn)은 열 때 같은 시도 id 로 다시 보낸다(8절 · AC-15f). 판정 · 점수 · 퍼센트를 보이지 않는다(R2). 녹음 없음.
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import {
  AREA_LABEL,
  BigButton,
  ChildScreen,
  ConfirmSheet,
  PaperBand,
  SmallButton,
  StatusLine,
} from "@/components/board/board";
import { AiRest } from "@/components/session/ai-rest";
import { MicNotice } from "@/components/session/speaking";
import { talkSpeakRateOf } from "@/core/conversation/listen";
import {
  type SpeechEvent,
  type SpeechVerdict,
  speakingCounters,
  speakingCountersStart,
} from "@/core/speaking/judge";
import {
  markMicNoticeSeen,
  markMicUnavailable,
  micNoticeSeen,
  micUsable,
  readDeviceVerdict,
} from "@/lib/mic-state";
import { createBrowserSpeech } from "@/lib/speech/browser";
import type { SpeechPort } from "@/lib/speech/types";
import { sendTalkTurnRetrying, type TalkTurnBody } from "@/lib/talk-stream";
import { cn } from "@/lib/utils";
import {
  advanceTalk,
  chooseMoreTalk,
  leaveTalk,
  markTalkNotice,
  revealTalkHint,
  stopTalk,
} from "@/server/actions/conversation";
import { reportSessionMic } from "@/server/actions/session";
import type { AddLineOut, TalkView, TurnNext } from "@/server/conversation";
import { type ChildSend, ChildTurn } from "./child-turn";
import {
  type BubbleContent,
  spokenOf,
  ToriBubble,
  ToriFigure,
  type ToriState,
  useSpeakQueue,
} from "./tori";

/** 화면 글(4절 회화 세션 표 · 3.3 · 7절 · C34 · 8절 · 정본 밖 문구 표). */
export const TALK_TEXT = {
  home: "홈",
  stop: "그만하기",
  more: "더 이야기하기",
  levelUnit: (level: number, unit: number) =>
    `${AREA_LABEL.talk} · ${level}단계 · 단원 ${unit}`,
  count: (n: number, target: number) => `말 주고받기 ${n} / ${target}`,
  moreCount: (n: number, round: number) =>
    `다 했어요! 더 이야기하기 ${n} / ${round}`,
  /** 4절 옆 칸 '오늘 이야기 목록'(검토 M-3). */
  topics: "오늘 이야기 목록",
  promiseLabel: "토리의 약속",
  promise: "토리는 집 · 학교 · 전화번호를 묻지 않아요 · 부모님도 볼 수 있어요",
  /** C34 확인 쪽지. */
  stopConfirm:
    "토리와 그만 이야기할까요? 지금 그만두면 이 이야기는 다음에 처음부터 해요",
  stopYes: "그만할래요",
  stopNo: "더 이야기할래요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  failed: "지금은 이야기할 수 없어요. 잠시 뒤에 다시 해 주세요",
  /** 8절 4단계부터 두 번 실패 — 'Oops' 뒤. */
  saved: "여기까지 이야기한 것은 저장했어요. 다음에 이어서 해요",
  lessons: "수업 목록",
  retry: "다시 해 보기",
  blocked: {
    needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
    stalled: "마이크가 잘 안 돼요. 부모님께 말해 주세요",
    silent: "말소리가 잘 안 들려요. 부모님께 말해 주세요",
  },
} as const;

type Blocked = keyof typeof TALK_TEXT.blocked;
const LESSONS_PATH = "/talk/lessons";

/** 화면이 그리는 차례. */
type Phase =
  | "tori" // 토리 말을 받는 중 · 읽는 중
  | "child" // 아이 차례
  | "choice" // 목표 턴 · '더 이야기하기' 한 바퀴 뒤 고르기
  | "break" // 4단계부터 두 번 실패(쉼)
  | "closed" // 대화가 닫힘(안전 상한 · 목표 턴 뒤 1-가 상한)
  | "offline"
  | "failed";

const emptyBubble = (): BubbleContent => ({
  sentences: [],
  adds: [],
  done: false,
});

/** 그 턴에 토리가 읽어 준 답(인식 확인 견줌 · 들은 도움). */
function heardOf(bubble: BubbleContent): {
  twoAnswers?: readonly [string, string];
  answerExample?: string;
} {
  const pair = bubble.adds.find(
    (a): a is Extract<AddLineOut, { kind: "two_answers" }> =>
      a.kind === "two_answers",
  );
  const again = bubble.adds.find(
    (a): a is Extract<AddLineOut, { kind: "again" }> => a.kind === "again",
  );
  return {
    ...(pair ? { twoAnswers: pair.answers } : {}),
    ...(again ? { answerExample: again.say } : {}),
  };
}

/** 인식 실패 셈의 상한 — 회화의 말소리 없음(C22)은 틀이 질문마다 따로 세므로 P11a 셈에는 그 상한을 두지 않는다(검토 M-6). */
export function talkCounterLimits(maxRetries: number) {
  return { maxRetries, silentItemsMax: Number.POSITIVE_INFINITY };
}

/** 체감 대기(ms) = 첫 문장을 그린 때 − 아이가 말을 멈춘 때(C23 — 듣기 끝 대기 · 확인 시간 포함, 검토 M-1). 시작을 모르면 없음. */
export function perceivedWaitOf(
  endedAt: number | undefined,
  firstAt: number,
): number | undefined {
  return endedAt === undefined
    ? undefined
    : Math.max(0, Math.round(firstAt - endedAt));
}

export function TalkFrame({ view }: { view: TalkView }) {
  const router = useRouter();
  const [speech, setSpeech] = useState<SpeechPort | undefined>();
  const [blocked, setBlocked] = useState<Blocked | undefined>();
  const [noticeSeen, setNoticeSeen] = useState(true);
  const [resting, setResting] = useState(view.resting);
  const [next, setNext] = useState<TurnNext>(view.next);
  const [bubble, setBubble] = useState<BubbleContent>(() =>
    view.lastTori
      ? {
          sentences: view.lastTori.sentences,
          ...(view.lastTori.ko ? { ko: view.lastTori.ko } : {}),
          adds: view.lastTori.add.flatMap((l) => (l.t === "add" ? [l] : [])),
          done: true,
        }
      : emptyBubble(),
  );
  /** 말풍선 열쇠(턴마다 새로 그려 흘러나오기를 처음부터). */
  const [turnKey, setTurnKey] = useState(0);
  const [phase, setPhase] = useState<Phase>("tori");
  /** 말풍선 글이 다 흘러나왔는가(아이 차례는 그 뒤 — 화면 검토 M-1). */
  const [typedDone, setTypedDone] = useState(false);
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [closeLine, setCloseLine] = useState<{
    en: string;
    ko?: string;
  } | null>(null);
  const [nudge, setNudge] = useState(!view.noticesSeen.talk_hint_nudge);
  const nudgeMarked = useRef(false);
  const counters = useRef(speakingCountersStart());
  const silentQuestions = useRef(0);
  /** 다시 보낼 턴(끊김 · 열 때 고아 아이 행). */
  const pendingSend = useRef<TalkTurnBody | null>(null);
  /** '다시 해 보기'가 다시 부를 일(턴 보내기 · 토막 넘김 · 더 이야기하기 — 검토 M-11). */
  const retryAction = useRef<(() => void) | null>(null);
  /** 지금 턴 요청(끊음 손잡이). */
  const inflight = useRef<AbortController | null>(null);
  /** 이 턴에 아이가 말을 멈춘 때(체감 대기 시작 — 아이 차례가 넘김, C23 · 검토 M-1). */
  const listenEndedAt = useRef<number | undefined>(undefined);
  /** 앞 턴 체감 대기(듣기 끝 → 첫 문장, C23 — 다음 턴에 보냄). */
  const perceived = useRef<number | undefined>(undefined);
  const lowLevel = view.spec.cardShape === "turns";
  const rate = talkSpeakRateOf(view.level, view.settings.talkSpeech);
  /** 힌트 문장 듣기는 1~3단계면 천천히(3.3 '영어 문장 힌트 … 천천히' — 토리 말 빠르기는 1~2단계 그대로, 검토 M-2). */
  const hintRate = lowLevel ? view.settings.talkSpeech.slowRate : undefined;
  /** 인식 실패 셈의 상한. 회화의 말소리 없음 셈(C22)은 틀이 질문마다 따로 하므로 P11a 셈에는 상한을 두지 않는다(검토 M-6). */
  const counterLimits = talkCounterLimits(view.settings.maxRetries);
  const queue = useSpeakQueue(speech, {
    ...(rate === undefined ? {} : { rate }),
    englishName: view.englishName,
  });

  // 마이크를 쓸 수 없는 기기면 막힌 안내(세션은 진행으로 남음), 처음 마이크 안내를 봤는지(기기마다 한 번)
  useEffect(() => {
    if (!micUsable()) setBlocked("needsMic");
    setNoticeSeen(micNoticeSeen());
  }, []);

  // 틀이 사라지면 턴 요청을 끊는다(검토 I-2 — 늦게 온 문장이 다른 화면에서 읽히지 않게)
  useEffect(() => () => inflight.current?.abort(), []);

  // 음성 접점은 렌더 뒤에 세션 동안 하나만 만든다(SpeechPort.device 는 useEffect 에서만). 자료 다시 읽기(router.refresh — 판이 같으면
  // 틀이 그대로)가 설정 객체를 새로 줘도 다시 만들지 않는다 — 돌고 있는 처리기가 닫힌 접점으로 읽지 않게(재검토 N-1). 틀이 사라질 때만 닫는다
  const speechSettings = useRef(view.settings.speech);
  useEffect(() => {
    const created = createBrowserSpeech({ settings: speechSettings.current });
    setSpeech(created);
    return () => created.dispose();
  }, []);

  const ready = Boolean(speech) && noticeSeen && !blocked && !resting;

  // 열 때(안내를 지난 뒤): 마지막 토리 말을 읽고, 토리의 말이 없는 아이 행이 있으면 같은 시도 id 로 다시 보낸다
  const opened = useRef(false);
  /** 처음 읽기를 시작하기 전(안내를 지나기 전)에는 아이 차례로 넘기지 않는다. */
  const [opening, setOpening] = useState(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: 안내를 지난 첫 그림에 한 번
  useEffect(() => {
    if (!ready || opened.current) return;
    opened.current = true;
    setOpening(false);
    const retry = view.retryTurn;
    if (retry) {
      void submit({
        sessionId: view.sessionId,
        clientAttemptId: retry.clientAttemptId,
        input:
          retry.mode === "dont_know"
            ? { mode: "dont_know" }
            : { mode: "speech", text: retry.text ?? "" },
        hint: { opened: 0, heard: [] },
      });
      return;
    }
    queue.enqueue(spokenOf(bubble));
    void afterBubble(next);
  }, [ready]);

  // 토리가 다 읽고 끝 줄까지 받았으면 아이 차례(또는 고르기)
  useEffect(() => {
    if (
      opening ||
      phase !== "tori" ||
      !bubble.done ||
      !typedDone ||
      queue.speaking
    )
      return;
    if (next.awaitingChoice) setPhase("choice");
    else if (next.pending) setPhase("child");
  }, [opening, phase, bubble.done, typedDone, queue.speaking, next]);

  // 끊긴 턴은 다시 연결될 때 같은 시도 id 로
  // biome-ignore lint/correctness/useExhaustiveDependencies: 끊긴 동안만
  useEffect(() => {
    if (phase !== "offline") return;
    const again = () => {
      const body = pendingSend.current;
      if (body) void submit(body);
    };
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [phase]);

  /** 인사 끝 턴 뒤면 다음 토막으로(대화 첫 질문을 이 말풍선에 붙인다 — AI 없음). */
  async function afterBubble(current: TurnNext) {
    if (!current.greetingDone || current.segment !== "greeting") return;
    const at = view.flow.indexOf("greeting");
    const to = view.flow[at + 1];
    if (to !== "today_words" && to !== "practice" && to !== "talk") return;
    // 오늘 쓸 말 · 말해 보기 조각은 차례 6(따라 말하기) — 그 토막으로 넘기고 그 조각이 이어 받는다
    const moved = await advanceTalk({ sessionId: view.sessionId, to }).catch(
      () => undefined,
    );
    if (!moved?.ok) {
      retryAction.current = () => {
        setPhase("tori");
        void afterBubble(current);
      };
      setPhase("failed");
      return;
    }
    retryAction.current = null;
    const adds = moved.add.flatMap((l) => (l.t === "add" ? [l] : []));
    setBubble((b) => ({ ...b, adds: [...b.adds, ...adds] }));
    queue.enqueue(spokenOf({ sentences: [], adds }));
    setNext(moved.next);
  }

  /** 인식 결과를 셈에 넣는다(7절 오류 행 · C22). 막힌 판정이면 안내 · 알림. */
  function onSpeech(event: SpeechEvent): SpeechVerdict {
    const step = speakingCounters(counters.current, event, counterLimits);
    counters.current = step.state;
    const code =
      event.type === "error"
        ? event.code
        : event.type === "stalled"
          ? "stalled"
          : "no-result";
    const report = (
      kind: "mic_unavailable" | "mic_stalled" | "speech_silent",
      c: string,
    ) =>
      void reportSessionMic({
        kind,
        code: c || kind,
        browser: readDeviceVerdict().name,
      }).catch(() => {});
    if (step.verdict === "mic-unavailable") {
      markMicUnavailable(code);
      report("mic_unavailable", code);
      setBlocked("needsMic");
    }
    if (step.verdict === "mic-stalled") {
      report("mic_stalled", code);
      setBlocked("stalled");
    }
    if (step.verdict === "speech-silent") {
      report("speech_silent", "no-speech");
      setBlocked("silent");
    }
    return step.verdict;
  }

  /** 지금 턴 요청의 끊음(다음 턴 · '홈' · '그만하기' · 틀 사라짐 — 검토 I-2). */
  function abortInflight() {
    inflight.current?.abort();
    inflight.current = null;
  }

  /**
   * 턴 하나를 보내고 줄을 받는다. 끊김 · stale 은 talk-stream 의 되풀이가 같은 시도 id 로 다룬다(I-1 — 판이 바뀌어 틀이 새로 그려지면
   * 이 요청은 틀 사라짐으로 끊긴다). 끊긴(aborted) 결과는 아무것도 바꾸지 않는다.
   */
  async function submit(body: TalkTurnBody) {
    abortInflight();
    const controller = new AbortController();
    inflight.current = controller;
    pendingSend.current = body;
    retryAction.current = () => void submit(body);
    queue.cancel();
    setPhase("tori");
    let first = true;
    const result = await sendTalkTurnRetrying(
      body,
      {
        onSentence: (en) => {
          if (first) {
            first = false;
            perceived.current = perceivedWaitOf(
              listenEndedAt.current,
              performance.now(),
            );
            setWaitingSince(null);
          }
          setBubble((b) => ({ ...b, sentences: [...b.sentences, en] }));
          queue.enqueue([en]);
        },
        onKo: (ko) => setBubble((b) => ({ ...b, ko })),
        onAdd: (line) => {
          setWaitingSince(null);
          setBubble((b) => ({ ...b, adds: [...b.adds, line] }));
          queue.enqueue(spokenOf({ sentences: [], adds: [line] }));
        },
        onEnd: (n) => {
          pendingSend.current = null;
          retryAction.current = null;
          setWaitingSince(null);
          counters.current = speakingCounters(
            counters.current,
            { type: "next-activity" },
            counterLimits,
          ).state;
          setNext(n);
          setBubble((b) => ({ ...b, done: true }));
          void afterBubble(n);
        },
        onResting: () => {
          pendingSend.current = null;
          retryAction.current = null;
          setResting(true);
        },
        onBreak: (line) => {
          pendingSend.current = null;
          retryAction.current = null;
          setWaitingSince(null);
          setBubble({
            sentences: [line.en],
            ...(line.ko ? { ko: line.ko } : {}),
            adds: [],
            done: true,
          });
          queue.enqueue([line.en]);
          setPhase("break");
        },
        onClose: (line) => {
          pendingSend.current = null;
          retryAction.current = null;
          setWaitingSince(null);
          setCloseLine(line.farewell);
          setBubble({
            sentences: [line.farewell.en],
            ...(line.farewell.ko ? { ko: line.farewell.ko } : {}),
            adds: [],
            done: true,
          });
          queue.enqueue([line.farewell.en]);
          setPhase("closed");
        },
        onError: () => {
          setWaitingSince(null);
          setPhase("failed");
        },
      },
      {
        signal: controller.signal,
        // stale 뒤 자료를 다시 읽는다(판이 바뀌면 쪽이 key 로 틀을 새로 그린다 — N-1)
        refresh: () => router.refresh(),
        // 보내기(다시 보내기)마다 말풍선을 비운다 — 다시 흘림이 같은 줄을 처음부터 보낸다
        onAttempt: () => {
          first = true;
          setTurnKey((k) => k + 1);
          setBubble(emptyBubble());
          setWaitingSince(performance.now());
        },
      },
    );
    if (inflight.current === controller) inflight.current = null;
    if (result === "offline") {
      setWaitingSince(null);
      setPhase("offline");
    }
  }

  function onChildSend(send: ChildSend) {
    if (send.input.mode === "dont_know" && send.input.nospeech) {
      silentQuestions.current += 1;
      if (silentQuestions.current >= view.settings.silentItemsMax) {
        void reportSessionMic({
          kind: "speech_silent",
          code: "no-speech",
          browser: readDeviceVerdict().name,
        }).catch(() => {});
        setBlocked("silent");
      }
    } else silentQuestions.current = 0;
    const body: TalkTurnBody = {
      sessionId: view.sessionId,
      clientAttemptId: crypto.randomUUID(),
      input: send.input,
      hint: send.hint,
      ...(send.listenEndSeconds === undefined
        ? {}
        : { listenEndSeconds: send.listenEndSeconds }),
      ...(send.confirmSkipped === undefined
        ? {}
        : { confirmSkipped: send.confirmSkipped }),
      ...(perceived.current === undefined
        ? {}
        : { prevPerceivedWaitMs: perceived.current }),
    };
    perceived.current = undefined;
    listenEndedAt.current = send.listenEndedAt;
    void submit(body);
  }

  async function home() {
    setBusy(true);
    abortInflight();
    queue.cancel();
    await leaveTalk({ sessionId: view.sessionId }).catch(() => undefined);
    router.push("/");
  }

  async function stop(confirmed: boolean) {
    setBusy(true);
    abortInflight();
    queue.cancel();
    const out = await stopTalk({ sessionId: view.sessionId, confirmed }).catch(
      () => undefined,
    );
    if (out && !out.ok && out.reason === "needs_confirm") {
      setBusy(false);
      setConfirmStop(true);
      return;
    }
    // 정리 · 마무리 조각은 차례 6 — 지금은 수업 목록으로
    router.push(LESSONS_PATH);
  }

  async function more() {
    setBusy(true);
    const moved = await chooseMoreTalk({ sessionId: view.sessionId }).catch(
      () => undefined,
    );
    setBusy(false);
    if (!moved?.ok) {
      retryAction.current = () => void more();
      setPhase("failed");
      return;
    }
    retryAction.current = null;
    const adds = moved.add.flatMap((l) => (l.t === "add" ? [l] : []));
    setBubble((b) => ({ ...b, adds: [...b.adds, ...adds] }));
    queue.enqueue(spokenOf({ sentences: [], adds }));
    setNext(moved.next);
    setPhase("tori");
  }

  const toriState: ToriState =
    waitingSince !== null
      ? "thinking"
      : queue.speaking
        ? "speaking"
        : listening
          ? "listening"
          : "idle";
  const pending = next.pending;
  const picture =
    pending?.imageKey !== undefined
      ? view.pictures[pending.imageKey]
      : undefined;
  const heard = useMemo(() => heardOf(bubble), [bubble]);
  // '그만하기'는 대화 · 더 이야기하기 동안 구석에(4절 목표 턴 행)
  const inDialogue = next.segment === "talk" || next.segment === "more_talk";
  const counter = next.targetReached
    ? TALK_TEXT.moreCount(
        next.segment === "more_talk"
          ? view.settings.talk.moreRoundTurns - next.moreLeft
          : 0,
        view.settings.talk.moreRoundTurns,
      )
    : TALK_TEXT.count(next.talkCount, next.target);

  let body: ReactNode;
  if (blocked) {
    body = (
      <div
        data-blocked={blocked}
        className="flex flex-col items-center gap-8 py-6"
      >
        <p className="text-center font-heading text-[28px] leading-snug">
          {TALK_TEXT.blocked[blocked]}
        </p>
        <BigButton disabled={busy} onClick={() => void home()}>
          {TALK_TEXT.home}
        </BigButton>
      </div>
    );
  } else if (!noticeSeen) {
    body = (
      <MicNotice
        onOk={() => {
          speech?.unlockFromGesture();
          markMicNoticeSeen();
          setNoticeSeen(true);
        }}
      />
    );
  } else if (resting) {
    body = <AiRest busy={busy} onHome={() => void home()} />;
  } else {
    body = (
      <div className="flex flex-col gap-6 lg:flex-row">
        <section
          data-talk-panel=""
          data-talk-phase={phase}
          className="relative flex min-w-0 flex-1 flex-col gap-5 bg-paper px-6 py-6 shadow-postit landscape:gap-3 landscape:py-4"
        >
          <span
            aria-hidden
            className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 bg-postit-talk/90"
          />
          <div className="flex items-start gap-4">
            <ToriFigure state={toriState} />
            <div className="min-w-0 flex-1">
              <ToriBubble
                key={turnKey}
                content={bubble}
                onAllTyped={setTypedDone}
                englishName={view.englishName}
                waiting={waitingSince}
                waitSeconds={view.settings.ui.waitHintSeconds}
                {...(lowLevel && picture ? { picture } : {})}
                {...(next.explanation ? { explanation: next.explanation } : {})}
                onReplay={() => {
                  speech?.unlockFromGesture();
                  queue.replay(spokenOf(bubble));
                }}
                onAnswer={(i) => {
                  const pair = bubble.adds.find(
                    (a) => a.kind === "two_answers",
                  );
                  if (pair?.kind !== "two_answers") return;
                  speech?.unlockFromGesture();
                  queue.replay([pair.answers[i]]);
                }}
              />
            </div>
          </div>
          <div className="mt-auto border-t-2 border-dashed border-ink/30 pt-4">
            {phase === "child" && pending ? (
              <ChildTurn
                key={`${turnKey}:${next.talkCount}:${next.dontKnowCount}`}
                sessionId={view.sessionId}
                speech={speech}
                level={view.level}
                lowLevel={lowLevel}
                englishName={view.englishName}
                hints={next.hints}
                dontKnowCount={next.dontKnowCount}
                heard={heard}
                settings={{
                  speech: view.settings.speech,
                  talkSpeech: view.settings.talkSpeech,
                  confirmSeconds: view.settings.talk.confirmSeconds,
                  hintReadMatch: view.settings.talk.hintReadMatch,
                  nospeechDontknowCount:
                    view.settings.talk.nospeechDontknowCount,
                }}
                {...(hintRate === undefined ? {} : { slowRate: hintRate })}
                homophones={view.homophones}
                nudge={nudge}
                onNudgeShown={() => {
                  if (nudgeMarked.current) return;
                  nudgeMarked.current = true;
                  void markTalkNotice({ kind: "talk_hint_nudge" }).catch(
                    () => {},
                  );
                }}
                onSpeech={onSpeech}
                onListenStart={() => {
                  queue.cancel();
                  setNudge(false);
                }}
                onListening={setListening}
                reveal={async (tier) => {
                  setNudge(false);
                  const out = await revealTalkHint({
                    sessionId: view.sessionId,
                    tier,
                  }).catch(() => undefined);
                  return out?.ok ? out.text : undefined;
                }}
                onSend={onChildSend}
              />
            ) : null}
            {phase === "choice" ? (
              <div
                data-talk-choice=""
                className="flex flex-wrap items-center justify-center gap-4"
              >
                <BigButton disabled={busy} onClick={() => void more()}>
                  {TALK_TEXT.more}
                </BigButton>
                <SmallButton disabled={busy} onClick={() => void stop(true)}>
                  {TALK_TEXT.stop}
                </SmallButton>
              </div>
            ) : null}
            {phase === "break" ? (
              <div
                data-talk-break=""
                className="flex flex-col items-center gap-6"
              >
                <p className={cn(CHILD_SIZE.guide, "text-center")}>
                  {TALK_TEXT.saved}
                </p>
                <BigButton onClick={() => router.push(LESSONS_PATH)}>
                  {TALK_TEXT.lessons}
                </BigButton>
              </div>
            ) : null}
            {phase === "closed" && closeLine ? (
              <div data-talk-closed="" className="flex justify-center">
                <BigButton onClick={() => router.push(LESSONS_PATH)}>
                  {TALK_TEXT.lessons}
                </BigButton>
              </div>
            ) : null}
            {phase === "offline" || phase === "failed" ? (
              <div className="flex flex-col items-center gap-4">
                <StatusLine tone="error">
                  {phase === "offline" ? TALK_TEXT.offline : TALK_TEXT.failed}
                </StatusLine>
                {/* 끊김 · 실패 모두 다시 부를 일이 있으면 '다시 해 보기'(검토 I-1 · M-11) */}
                {retryAction.current ? (
                  <SmallButton
                    data-talk-retry=""
                    onClick={() => retryAction.current?.()}
                  >
                    {TALK_TEXT.retry}
                  </SmallButton>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
        <aside
          data-talk-topics=""
          className="flex flex-col gap-3 bg-postit-talk px-6 py-6 shadow-postit lg:w-80 lg:rotate-[1.5deg]"
        >
          <p className="font-heading text-[24px] leading-tight">
            {TALK_TEXT.topics}
          </p>
          <ul
            className={cn(
              CHILD_SIZE.guide,
              "flex list-disc flex-col gap-2 pl-6",
            )}
          >
            {view.card.todayTopicsKo.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </aside>
      </div>
    );
  }

  const showStop =
    !blocked &&
    !resting &&
    noticeSeen &&
    inDialogue &&
    phase !== "closed" &&
    phase !== "break";
  return (
    <ChildScreen>
      <PaperBand
        heading
        title={view.title}
        detail={TALK_TEXT.levelUnit(view.level, view.unit)}
        right={
          <>
            <span data-talk-count="" className={CHILD_SIZE.guide}>
              {counter}
            </span>
            {/* '그만하기'는 위 띠 오른쪽('홈' 왼쪽) 작은 단추 — 따로 한 줄을 차지하지 않게(plan-p13a 문구 표 · 화면 검토 I-1) */}
            {showStop ? (
              <SmallButton
                data-talk-stop=""
                disabled={busy}
                onClick={() => {
                  if (next.targetReached) void stop(true);
                  else setConfirmStop(true);
                }}
              >
                {TALK_TEXT.stop}
              </SmallButton>
            ) : null}
            {blocked ? null : (
              <SmallButton disabled={busy} onClick={() => void home()}>
                {TALK_TEXT.home}
              </SmallButton>
            )}
          </>
        }
      />
      {body}
      <p
        data-tori-promise=""
        className={cn(
          CHILD_SIZE.guide,
          "mt-auto rounded bg-paper/80 px-4 py-2",
        )}
      >
        <span className="font-heading">{TALK_TEXT.promiseLabel}</span>{" "}
        {TALK_TEXT.promise}
      </p>
      <ConfirmSheet
        open={confirmStop}
        message={TALK_TEXT.stopConfirm}
        confirmLabel={TALK_TEXT.stopYes}
        cancelLabel={TALK_TEXT.stopNo}
        onConfirm={() => {
          setConfirmStop(false);
          void stop(true);
        }}
        onCancel={() => setConfirmStop(false)}
      />
    </ChildScreen>
  );
}
