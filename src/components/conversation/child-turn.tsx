"use client";

// 아이 차례(plan-p13b 파일별 값 9, 4절 회화 세션 '아이 차례' · '힌트' · '인식 확인' 행 · 3.3 · 7절 · C10 · C22 · C23 · C44 · C53 (2)).
// 말하기 단추 하나를 크게(P11a SpeakButton — 고리 틈 연두), 옆에 작은 '힌트' · '잘 모르겠어요'. 듣기는 a talkEndRuleFor(대화). 읽어 주는
// 중에 누르면 읽기를 멈추고 듣는다. '힌트'는 누를 때마다 한 단 — 1~3단계 영어 단은 서버가 미리 내려 주지 않아 연 단만 revealTalkHint 로
// 받는다(영어 문장 단에 작은 듣기 단추 · 단계 구간 빠르기). 같은 질문 둘째 '모름'부터 마지막 단까지 열린 채. 첫 회화 수업에서 '막히면 눌러요' 한 번.
// 인식 확인은 a confirmPlanOf — 바로 보냄 · talk.confirm_seconds 동안 아이 말풍선 + '다시 말하기' · '보내기'(아무것도 안 누르면 보냄).
// '모름'은 단추 · 같은 질문에서 no-speech 로 끝난 듣기 talk.nospeech_dontknow_count 번(7절 말하기 버튼 행(분석 A2 · N3)). 듣는 동안 힌트 문장 듣기는 끈다. 녹음하지
// 않는다(브라우저 인식만).
// 13절 C166(UX 검토 U4-2 · U5-1 · U5-3 · U5-4 · U5-9 · R1): 틀은 선생님이 읽는 중에도 이 차례를 연다(누르면 읽기를 멈추고 듣는다, 7절 C53
// (2)). 듣는 동안 '듣고 있어요' · 소리 들어옴 표시. 말소리 없음이 이어져 '모름'으로 넘어갈 때 '잘 안 들려서 다음으로 가요'를
// speech.skip_notice_seconds 보인 뒤 보낸다.
// 회화 plan 묶음 10(정본 03 4절 '인식 확인 · 아이 말풍선' · '힌트' 행 · 3.3 기기 쪽 · 정한 것 10): 보낸 말은 대화 기록 칸에
// 남고(core/conversation/log childLogEntryOf), ChildBubble 은 인식 글 · '잘 모르겠어요' · 회색 '못 들었어요' 셋을 그린다. 인식이 실패한
// 시도는 그 자리에 회색 '못 들었어요'를 보이고 다음 시도가 덮는다(attemptSaidStep). 들리지 않음 뒤 다음 차례에는 '잘 모르겠어요' 단추를 문구
// 없이 한 번 반짝인다(flashDontKnow). '힌트' 단추는 아이 차례 안에 있고 아이 차례는 끝 줄 뒤에 열리므로, 응답이 끝날 때까지 흐린 단추를
// 따로 두지 않는다(정본 03 4절 '힌트' 행을 끝 줄 전에 단추가 없는 것으로 지킴 — fix 1 M-2 · plan 보정 11-05 (11)). 선생님 쪽 발화 가운데 감시가 끝낸 것은 sp 로 모아 듣기 사건 기록(C149 client_listen)에 싣는다(createSpeakHitchLog · withSpeakHitches).
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import { SpeakButton } from "@/components/answer/speak-button";
import {
  BigButton,
  FOCUS_RING,
  SmallButton,
  StatusLine,
} from "@/components/board/board";
import { fillName } from "@/core/ai/mask";
import {
  CLIENT_LISTENS_MAX,
  type ClientListen,
  type ClientSpeakEntry,
} from "@/core/conversation/client-listen";
import { OPEN_ALL_HINTS_FROM_DONT_KNOW } from "@/core/conversation/hints";
import {
  confirmPlanOf,
  type TalkSpeechSettings,
  talkEndRuleFor,
} from "@/core/conversation/listen";
import type { ChildSaid } from "@/core/conversation/log";
import type { SpeechEvent, SpeechVerdict } from "@/core/speaking/judge";
import { speechEventOf } from "@/core/speaking/judge";
import {
  type ListenOutcome,
  NO_SPEECH_CODE,
  type SpeechSettings,
} from "@/core/speech/listen";
import { josa, TEACHER_TEXT, teacherNameOf } from "@/core/teacher/name";
import type {
  ListenHandle,
  SpeakOutcome,
  SpeechPort,
} from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import type { HintView } from "@/server/conversation";
import { HintLoadingDots } from "./hint-loading-dots";

export const CHILD_TURN_TEXT = {
  speak: "말하기",
  /** 8단계부터 듣는 동안(C37 — c 가 켬). */
  doneSpeaking: "다 말했어요",
  hint: "힌트",
  nudge: "막히면 눌러요",
  dontKnow: "잘 모르겠어요",
  /** 인식 실패 시도 · 들리지 않음 차례의 회색 아이 말풍선(plan 문구 표 — 정본 밖 문구). */
  notHeard: "못 들었어요",
  again: "다시 말하기",
  send: "보내기",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  listenHint: "힌트 문장 듣기",
  /**
   * 말소리 없음이 이어져 '모름'으로 넘어감(U5-4). '모름' 뒤 선생님이 답 예시를 들려주고 같은 질문을 다시 묻는다(3.3 막힘 문단) — 그 일과
   * 맞게 '도와줄게요'(검토 A I-2 · 컨트롤러 결정, UX 검토 꼴). 이름 · 조사는 문구 표의 이름 채움(선생님 이름 — 없으면 '선생님').
   */
  nospeechMove: (teacherName: string | null | undefined) => {
    const name = teacherNameOf(teacherName);
    return `말소리가 안 들려서 ${name}${josa(name, "이/가")} 도와줄게요`;
  },
} as const;

/** 아이 말풍선 꼴(인식 확인 · 보낸 뒤 남긴 말풍선이 같이 씀). */
const CHILD_BUBBLE_CLASS =
  "rounded-[18px_4px_18px_18px] border-[3px] border-ink bg-postit-reading px-5 py-3 font-en text-2xl font-bold";
/** '잘 모르겠어요' 말풍선(한국어 — 영어 글꼴이 아님). */
const CHILD_BUBBLE_KO_CLASS =
  "rounded-[18px_4px_18px_18px] border-[3px] border-ink bg-postit-reading px-5 py-3 font-heading text-2xl";
/** 회색 '못 들었어요' 말풍선(흐린 단추와 같은 종이 · 테 — 5.2, 글은 읽히게 ink-soft). */
const CHILD_BUBBLE_GRAY_CLASS =
  "rounded-[18px_4px_18px_18px] border-[3px] border-ink-off-edge bg-paper px-5 py-3 font-heading text-2xl text-ink-soft";
/** '잘 모르겠어요' 한 번 반짝임 길이(ms, 화면 꼴 값 — animate-pulse 한 바퀴). */
const FLASH_MS = 2000;

/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;

/**
 * 같은 질문 말소리 없음 셈에 드는 듣기인가(순수): no-speech 로 끝난 듣기만(3.3 막힘 문단 · 7절 오류 행). iPad WebKit 의 'aborted · No speech
 * detected' 는 듣기 층이 no-speech 로 읽으므로 여기 든다(C148). 결과 없음은 들지 않는다.
 */
export function silentListenOf(event: SpeechEvent): boolean {
  return event.type === "error" && event.code === NO_SPEECH_CODE;
}

/**
 * 아이가 말을 멈춘 때(순수, 체감 대기의 시작 — C23 · NFR-8): 들은 결과면 듣기 끝 − 끝 조용함(그 대기는 체감 대기에 든다), 결과 없음 · 오류 ·
 * 멈춤이면 듣기 끝 그대로(말이 없었으므로 끝 조용함을 빼지 않는다).
 */
export function speechStoppedAt(
  outcome: ListenOutcome,
  doneAt: number,
  endSilenceMs: number | undefined,
): number {
  return outcome.kind === "result" ? doneAt - (endSilenceMs ?? 0) : doneAt;
}

export type ChildSend = {
  input: { mode: "speech" | "dont_know"; text?: string; nospeech?: boolean };
  hint: { opened: number; heard: ("two_answers" | "answer_example")[] };
  listenEndSeconds?: number;
  confirmSkipped?: boolean;
  /** 아이가 말을 멈춘 때(performance.now() — 인식 결과가 온 때 − 끝 조용함, '모름' 단추는 누른 때). 체감 대기의 시작(C23). */
  listenEndedAt: number;
};

export type ChildTurnProps = {
  sessionId: string;
  speech: SpeechPort | undefined;
  level: number;
  /** 1~3단계 꼴(카드 턴). */
  lowLevel: boolean;
  englishName: string;
  /** 세션 선생님 한글 이름(7절 '[이름]에게 잘 안 들렸어요 …' — 없으면 '선생님'). */
  teacherName?: string | undefined;
  hints: readonly HintView[];
  dontKnowCount: number;
  /** 그 턴에 토리가 읽어 준 답(1단계 답 두 개 · '모름' 뒤 답 예시) — 인식 확인 견줌 · 들은 도움. */
  heard: {
    twoAnswers?: readonly [string, string];
    answerExample?: string;
  };
  settings: {
    speech: SpeechSettings;
    talkSpeech: TalkSpeechSettings;
    confirmSeconds: number;
    hintReadMatch: number;
    nospeechDontknowCount: number;
  };
  /** 힌트 문장 듣기 빠르기(단계 구간마다 speech.rate.<구간>, C125). */
  rate: number;
  homophones: string[][];
  /** '막히면 눌러요'를 보일까(프로필의 첫 회화 수업 — notices_seen). */
  nudge: boolean;
  onNudgeShown: () => void;
  /** 인식 결과를 틀의 셈에 넣고 판정을 받는다(막힌 안내 · 알림은 틀이 한다). */
  onSpeech: (event: SpeechEvent) => SpeechVerdict;
  /** 듣기를 시작한다(읽어 주기를 멈추게 — C53 (2)). */
  onListenStart: () => void;
  /** 힌트 문장 듣기 전에 틀의 읽기 줄을 멈춘다(검토 A I-1 — 아이 행동이 읽기를 이긴다, C53 (2)). */
  onHintListen: () => void;
  onListening: (listening: boolean) => void;
  /** 1~3단계 영어 단의 글(연 단만, 서버 액션). */
  reveal: (tier: number) => Promise<string | undefined>;
  onSend: (send: ChildSend) => void;
  /** 들리지 않음 차례 뒤 이 차례에 '잘 모르겠어요' 단추를 문구 없이 한 번 반짝인다(3.3 기기 쪽 — 끝 줄 flashDontKnow). */
  flashDontKnow?: boolean;
};

/**
 * 힌트 문장 듣기(검토 A I-1): 틀의 읽기 줄을 먼저 멈추고(stopReading — 줄이 끊긴 발화 뒤 다음 문장을 이어 읽어 힌트를 덮지 않게) 힌트를
 * 단계 구간 빠르기로 읽는다. 누름 처리 안에서 부른다.
 */
export function listenHint({
  speech,
  text,
  rate,
  stopReading,
}: {
  speech: SpeechPort | undefined;
  text: string;
  rate: number;
  stopReading: () => void;
}): void {
  if (!speech) return;
  stopReading();
  speech.unlockFromGesture();
  void speech.speak(text, { rate });
}

/** 힌트 단 하나의 꼴(순수, U5-10 · 검토 A M-6): 글이 있으면 글, 받는 중이면 점 셋, 받기에 실패하면 빈 단(전과 같음). */
export function hintTierStateOf(
  text: string | undefined,
  failed: boolean,
): "text" | "loading" | "empty" {
  if (text !== undefined) return "text";
  return failed ? "empty" : "loading";
}

/**
 * 아이 말풍선(U5-3 · U5-9): said 는 대화 기록 칸 · 지금 시도 자리의 인식 글 · '잘 모르겠어요' · 회색 '못 들었어요'(묶음 10 — 표지
 * data-child-said 의 값이 그 종류), text 는 짧은 준비 쪽지에서 따라 말한 인식 글(표지 값은 빔).
 */
export function ChildBubble(
  props:
    | { text: string; said?: undefined }
    | { said: ChildSaid; text?: undefined },
) {
  if (props.said === undefined)
    return (
      <div data-child-said="" className="flex justify-end">
        <p lang="en" className={CHILD_BUBBLE_CLASS}>
          {props.text}
        </p>
      </div>
    );
  const { said } = props;
  return (
    <div data-child-said={said.kind} className="flex justify-end">
      {said.kind === "speech" ? (
        <p lang="en" className={CHILD_BUBBLE_CLASS}>
          {said.text}
        </p>
      ) : said.kind === "dont_know" ? (
        <p className={CHILD_BUBBLE_KO_CLASS}>{CHILD_TURN_TEXT.dontKnow}</p>
      ) : (
        <p className={CHILD_BUBBLE_GRAY_CLASS}>{CHILD_TURN_TEXT.notHeard}</p>
      )}
    </div>
  );
}

/**
 * 지금 시도 자리의 아이 말풍선(순수, 정본 03 4절 '인식 확인 · 아이 말풍선' 행): 인식이 실패한 시도 · 말소리 없음으로 '모름'으로 넘어감은 회색
 * '못 들었어요', 다음 시도(듣기 시작)가 덮는다.
 */
export function attemptSaidStep(
  _current: ChildSaid | undefined,
  event: { kind: "failed" | "nospeech_move" | "listen" },
): ChildSaid | undefined {
  return event.kind === "listen" ? undefined : { kind: "not_heard" };
}

/** 1~3단계 소리 줄 꼴(tori.tsx LessonSoundLine 과 같은 꼴 — 구조로 받는다). */
type HeardSoundLine =
  | { t: "sound"; kind: "model" | "answer"; say: string }
  | { t: "sound"; kind: "choices"; answers: readonly [string, string] };

/**
 * 그 턴에 들려준 소리 줄 → 아이 차례의 들은 답(순수): 선택지는 답 두 개, 따라 할 말 · 받침의 답은 답 예시(마지막 것). 인식 확인 견줌 ·
 * 들은 도움(정한 것 8 — two_answers · answer_example)이 된다. 들려주지 못한 소리 줄은 부르는 쪽이 넘기지 않는다(7절 '들려주지 못함' 행).
 */
export function childHeardOf(
  sounds: readonly HeardSoundLine[],
): ChildTurnProps["heard"] {
  let twoAnswers: readonly [string, string] | undefined;
  let answerExample: string | undefined;
  for (const s of sounds) {
    if (s.kind === "choices") twoAnswers = s.answers;
    else answerExample = s.say;
  }
  return {
    ...(twoAnswers ? { twoAnswers } : {}),
    ...(answerExample !== undefined ? { answerExample } : {}),
  };
}

/** 선생님 쪽 발화의 종류(정한 것 10 — client_listen sp 의 w). */
export type TalkSpeakWhat = ClientSpeakEntry["w"];

/**
 * 읽어 주기 결과 → sp 한 줄(순수, 정한 것 10 · 7절 읽어 주기 행): 감시가 끝낸 발화만(끝 알림 없음 no_end · 들려주지 못함 not_played).
 * 들려줌 · 끊김(앱이나 아이 누름이 멈춤) · 읽지 않음 · 오류는 남기지 않는다. 글은 남기지 않는다.
 */
export function speakHitchOf(
  what: TalkSpeakWhat,
  outcome: SpeakOutcome,
): ClientSpeakEntry | undefined {
  if (outcome.kind !== "ended" || outcome.heard === "played") return undefined;
  return { w: what, h: outcome.heard };
}

export type SpeakHitchLog = {
  record(entry: ClientSpeakEntry): void;
  /** 앞 기록 뒤 모은 것을 꺼낸다(최근 CLIENT_LISTENS_MAX 개) — 꺼낸 것은 비운다. */
  take(): ClientSpeakEntry[];
};

/** 감시 기록 하나(회화 틀이 세션 동안 하나 — 아이 행 · 따라 말하기 시도를 보낼 때 꺼낸다). */
export function createSpeakHitchLog(): SpeakHitchLog {
  let kept: ClientSpeakEntry[] = [];
  return {
    record(entry) {
      kept.push(entry);
      if (kept.length > CLIENT_LISTENS_MAX)
        kept = kept.slice(kept.length - CLIENT_LISTENS_MAX);
    },
    take() {
      const out = kept;
      kept = [];
      return out;
    },
  };
}

/** 듣기 사건 기록에 sp 싣기(순수): 모은 것이 없으면 칸을 두지 않는다(옛 기록과 같은 꼴). */
export function withSpeakHitches(
  clientListen: ClientListen,
  sp: readonly ClientSpeakEntry[],
): ClientListen {
  return sp.length === 0
    ? clientListen
    : { ...clientListen, sp: sp.slice(-CLIENT_LISTENS_MAX) };
}

/** '막히면 눌러요'를 보았다고 남길까 — 힌트 단추가 있어 글이 보인 턴만(AC-15l '한 번 보이고', 검토 M-8). */
export function shouldMarkNudge(nudge: boolean, hintCount: number): boolean {
  return nudge && hintCount > 0;
}

/** 아이 차례 한 턴(턴마다 부르는 쪽이 key 를 바꿔 새로 그린다). */
export function ChildTurn(props: ChildTurnProps) {
  const {
    speech,
    level,
    lowLevel,
    hints,
    dontKnowCount,
    heard,
    settings,
    onSend,
  } = props;
  const [pressed, setPressed] = useState(0);
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [listening, setListening] = useState(false);
  /** 이 듣기에서 소리가 들어왔는가(U4-2). */
  const [soundIn, setSoundIn] = useState(false);
  /** 글 받기에 실패한 힌트 단(점 셋을 거둔다 — 검토 A M-6). */
  const [failedTiers, setFailedTiers] = useState<Record<number, true>>({});
  /** 말소리 없음 '모름'으로 넘어가는 안내 중(U5-4 — 그동안 단추를 끈다). */
  const [moving, setMoving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  /** 지금 시도 자리의 회색 '못 들었어요'(다음 시도가 덮는다). */
  const [attemptSaid, setAttemptSaid] = useState<ChildSaid | undefined>();
  /** '잘 모르겠어요' 한 번 반짝임(처음 그릴 때 켜고 FLASH_MS 뒤 끔). */
  const [flashing, setFlashing] = useState(props.flashDontKnow === true);
  const [confirm, setConfirm] = useState<{
    text: string;
    bigRetry: boolean;
  } | null>(null);
  const handle = useRef<ListenHandle | undefined>(undefined);
  const nospeech = useRef(0);
  const sent = useRef(false);
  const confirmTimer = useRef<number | undefined>(undefined);
  const moveTimer = useRef<number | undefined>(undefined);
  /** 이 턴에 아이가 말을 멈춘 때(체감 대기 시작). */
  const endedAt = useRef<number | undefined>(undefined);

  const opened =
    dontKnowCount >= OPEN_ALL_HINTS_FROM_DONT_KNOW
      ? hints.length
      : Math.min(pressed, hints.length);
  const heardHelp: ("two_answers" | "answer_example")[] = [
    ...(heard.twoAnswers ? (["two_answers"] as const) : []),
    ...(heard.answerExample ? (["answer_example"] as const) : []),
  ];

  // 연 단 가운데 글이 없는 단(1~3단계 영어)을 그때 받는다
  // biome-ignore lint/correctness/useExhaustiveDependencies: 연 단 수가 늘 때만
  useEffect(() => {
    for (let i = 0; i < opened; i++) {
      const tier = hints[i];
      if (!tier || tier.text !== undefined || revealed[i] !== undefined)
        continue;
      void props
        .reveal(i)
        .catch(() => undefined)
        .then((text) => {
          if (text !== undefined) setRevealed((r) => ({ ...r, [i]: text }));
          // 받기에 실패하면 점 셋을 거둔다(검토 A M-6)
          else setFailedTiers((f) => ({ ...f, [i]: true }));
        });
    }
  }, [opened]);

  // '막히면 눌러요'를 보인 때만 한 번 남긴다(힌트 단추가 있는 턴 — 다른 기기에서도 한 번, 검토 M-8)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 처음 그릴 때 한 번
  useEffect(() => {
    if (shouldMarkNudge(props.nudge, hints.length)) props.onNudgeShown();
  }, []);

  useEffect(() => {
    if (!flashing) return;
    const timer = window.setTimeout(() => setFlashing(false), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flashing]);

  useEffect(
    () => () => {
      handle.current?.cancel();
      window.clearTimeout(confirmTimer.current);
      window.clearTimeout(moveTimer.current);
    },
    [],
  );

  const textOf = (i: number) => hints[i]?.text ?? revealed[i];
  const openedSentence = (() => {
    for (let i = 0; i < opened; i++)
      if (hints[i]?.kind === "sentence") return textOf(i);
    return undefined;
  })();

  function send(payload: Omit<ChildSend, "hint" | "listenEndedAt">) {
    if (sent.current) return;
    sent.current = true;
    window.clearTimeout(confirmTimer.current);
    onSend({
      ...payload,
      hint: { opened, heard: heardHelp },
      listenEndedAt: endedAt.current ?? performance.now(),
    });
  }

  const rule = talkEndRuleFor(
    { level, mode: "dialogue" },
    settings.speech,
    settings.talkSpeech,
  );

  async function speak() {
    if (!speech || sent.current || moving) return;
    if (handle.current) {
      handle.current.press();
      return;
    }
    speech.unlockFromGesture();
    // 읽어 주는 중에 누르면 읽기를 멈추고 듣는다(C53 (2))
    props.onListenStart();
    setMessage(undefined);
    setAttemptSaid((c) => attemptSaidStep(c, { kind: "listen" }));
    setConfirm(null);
    setSoundIn(false);
    setListening(true);
    props.onListening(true);
    const current = speech.listen(rule, { sound: () => setSoundIn(true) });
    handle.current = current;
    const outcome = await current.outcome;
    // 말을 멈춘 때 = 들은 결과면 듣기가 끝난 때 − 끝 조용함(C23 — 체감 대기는 듣기 끝 대기 · 확인 시간을 포함해 잰다), 결과 없음 · 오류면 듣기 끝
    endedAt.current = speechStoppedAt(
      outcome,
      performance.now(),
      rule.endSilenceMs,
    );
    handle.current = undefined;
    setListening(false);
    setSoundIn(false);
    props.onListening(false);
    const event = speechEventOf(outcome);
    if (!event) return;
    const verdict = props.onSpeech(event);
    if (verdict === "heard" && event.type === "heard") {
      nospeech.current = 0;
      const text = event.text.trim();
      const plan = confirmPlanOf({
        lowLevel,
        heard: text,
        ...(openedSentence === undefined ? {} : { openedSentence }),
        heardAnswers: [
          ...(heard.twoAnswers ?? []),
          ...(heard.answerExample ? [heard.answerExample] : []),
        ].map((t) => fillName(t, props.englishName)),
        matchPass: settings.hintReadMatch,
        homophones: props.homophones,
        confirmMs: settings.confirmSeconds * MS_PER_SECOND,
      });
      const payload = {
        input: { mode: "speech" as const, text },
        listenEndSeconds: (rule.endSilenceMs ?? 0) / MS_PER_SECOND,
      };
      if (plan.autoSend) {
        send({ ...payload, confirmSkipped: true });
        return;
      }
      setConfirm({ text, bigRetry: plan.bigRetry });
      confirmTimer.current = window.setTimeout(
        () => send({ ...payload, confirmSkipped: false }),
        plan.waitMs,
      );
      return;
    }
    if (verdict === "offline") {
      setMessage(CHILD_TURN_TEXT.offline);
      return;
    }
    if (
      verdict === "mic-unavailable" ||
      verdict === "mic-stalled" ||
      verdict === "speech-silent"
    )
      return;
    // no-speech 로 끝난 듣기가 이어지면 '모름'과 같이(C44 — 같은 질문 talk.nospeech_dontknow_count 번, 결과 없음은 세지 않음 C148)
    if (silentListenOf(event)) {
      nospeech.current += 1;
      if (nospeech.current >= settings.nospeechDontknowCount) {
        // 말없이 '모름'이 가지 않게 한 줄 안내 뒤 보낸다(U5-4)
        setMessage(CHILD_TURN_TEXT.nospeechMove(props.teacherName));
        setAttemptSaid((c) => attemptSaidStep(c, { kind: "nospeech_move" }));
        setMoving(true);
        moveTimer.current = window.setTimeout(
          () => send({ input: { mode: "dont_know", nospeech: true } }),
          settings.speech.skipNoticeMs,
        );
        return;
      }
    }
    setMessage(TEACHER_TEXT.notHeard(props.teacherName));
    setAttemptSaid((c) => attemptSaidStep(c, { kind: "failed" }));
  }

  function retry() {
    window.clearTimeout(confirmTimer.current);
    setConfirm(null);
    void speak();
  }

  const showHint = hints.length > 0;
  return (
    <div data-child-turn="" className="flex flex-col gap-3">
      {attemptSaid && !confirm ? (
        <div data-child-attempt="">
          <ChildBubble said={attemptSaid} />
        </div>
      ) : null}
      {confirm ? (
        <div
          data-child-confirm=""
          className="flex flex-col items-end gap-3 self-end"
        >
          <p lang="en" data-child-bubble="" className={CHILD_BUBBLE_CLASS}>
            {confirm.text}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {confirm.bigRetry ? (
              <BigButton data-retry-size="big" onClick={retry}>
                {CHILD_TURN_TEXT.again}
              </BigButton>
            ) : (
              <SmallButton data-retry-size="small" onClick={retry}>
                {CHILD_TURN_TEXT.again}
              </SmallButton>
            )}
            <SmallButton
              onClick={() =>
                send({
                  input: { mode: "speech", text: confirm.text },
                  listenEndSeconds: (rule.endSilenceMs ?? 0) / MS_PER_SECOND,
                  confirmSkipped: false,
                })
              }
            >
              {CHILD_TURN_TEXT.send}
            </SmallButton>
          </div>
        </div>
      ) : null}
      {/* 가로(넓은 칸)에서는 힌트 단을 왼쪽(넓게) · 단추 묶음을 오른쪽 끝에 — 힌트가 없는 턴에도 단추는 오른쪽(목업 B_Talk1 · 화면 검토 I-1 ·
          전체 디자인 리뷰 M-3) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        {opened > 0 ? (
          <ol data-hint-tiers="" className="flex min-w-0 flex-1 flex-col gap-2">
            {hints.slice(0, opened).map((tier, i) => {
              const text = textOf(i);
              return (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: 단 차례가 곧 열쇠다
                  key={i}
                  data-hint-tier={tier.kind}
                  className="flex items-center gap-3 rounded-xl border-2 border-dashed border-ink bg-paper px-4 py-2"
                >
                  {text === undefined ? (
                    // 서버에서 글을 받는 동안 점 셋(U5-10 — B 조각), 받기에 실패하면 빈 단(검토 A M-6)
                    hintTierStateOf(text, failedTiers[i] === true) ===
                    "loading" ? (
                      <HintLoadingDots />
                    ) : null
                  ) : tier.kind === "ko" ? (
                    <span className={CHILD_SIZE.guide}>{text}</span>
                  ) : (
                    <span
                      lang="en"
                      className={cn(CHILD_SIZE.english, "font-en font-bold")}
                    >
                      {fillName(text, props.englishName)}
                    </span>
                  )}
                  {tier.listen && text !== undefined ? (
                    <button
                      type="button"
                      data-hint-listen=""
                      aria-label={CHILD_TURN_TEXT.listenHint}
                      // 듣는 동안은 끈다(누르면 듣기가 안내 없이 끝남 — 7절 말하기 버튼 행(분석 A2 · N3))
                      disabled={listening}
                      onClick={() =>
                        listenHint({
                          speech,
                          text: fillName(text, props.englishName),
                          rate: props.rate,
                          // 선생님이 읽는 중이면 읽기 줄을 멈춘다(검토 A I-1)
                          stopReading: props.onHintListen,
                        })
                      }
                      className={cn(
                        FOCUS_RING,
                        CHILD_SIZE.target,
                        "inline-flex items-center justify-center rounded-full border-2 border-ink bg-paper",
                      )}
                    >
                      <Volume2 aria-hidden className="size-6" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}
        <div
          data-child-actions=""
          className="flex shrink-0 flex-wrap items-center justify-center gap-4 lg:ml-auto"
        >
          <SpeakButton
            label={CHILD_TURN_TEXT.speak}
            listening={listening}
            soundIn={soundIn}
            capAt={() => handle.current?.capAt}
            gapClassName="bg-postit-talk"
            disabled={!speech || confirm !== null || moving}
            onPress={() => void speak()}
          />
          <div className="flex flex-col items-start gap-2">
            {showHint ? (
              <div className="flex items-center gap-3">
                <SmallButton
                  data-hint-button=""
                  // 인식 확인 중에는 힌트를 열지 않는다(한 화면 한 행동 — 화면 검토 M-4)
                  disabled={
                    opened >= hints.length ||
                    listening ||
                    confirm !== null ||
                    moving
                  }
                  onClick={() => setPressed((n) => n + 1)}
                >
                  {CHILD_TURN_TEXT.hint}
                </SmallButton>
                {props.nudge ? (
                  <span data-hint-nudge="" className={CHILD_SIZE.guide}>
                    {CHILD_TURN_TEXT.nudge}
                  </span>
                ) : null}
              </div>
            ) : null}
            <SmallButton
              data-dont-know=""
              // 들리지 않음 뒤 한 번 반짝임(문구 없음 — 움직임 줄이기면 테만 굵게, 3.3 기기 쪽)
              {...(flashing ? { "data-flash": "" } : {})}
              className={
                flashing
                  ? "ring-4 ring-postit-talk motion-safe:animate-pulse"
                  : undefined
              }
              disabled={listening || confirm !== null || moving}
              onClick={() => {
                endedAt.current = performance.now();
                send({ input: { mode: "dont_know" } });
              }}
            >
              {CHILD_TURN_TEXT.dontKnow}
            </SmallButton>
          </div>
        </div>
      </div>
      <StatusLine tone={message && !moving ? "error" : "info"}>
        {moving ? <span data-nospeech-move="">{message}</span> : message}
      </StatusLine>
    </div>
  );
}
