"use client";

// 회화 틀(plan-p13b 파일별 값 7, 4절 회화 세션 표 · 3.3 회화 문단 · 7절 · 8절 · 13절 C30 · C34 · C53 (2) · C92 · C100 · C103 · 재검토 N-1).
// 위 종이 띠(오늘 이야기 제목 · '회화 · n단계 · 단원 u' · '말 주고받기 n / 목표 턴'(목표 턴 뒤 '다 했어요! 더 이야기하기 n / …') · '홈'),
// 구석 작은 '그만하기'(대화 · 더 이야기하기 동안), 옆 칸 하나(오늘 이야기 목록 — 카드 todayTopicsKo), 아래 '선생님의 약속' 한 줄(4절 글 그대로).
// 이름 자리 글(약속 · 그만하기 확인 · 쉼 · 처음 안내 · 기다림 · 말풍선 접근 이름 …)은 문구 표(TEACHER_TEXT)에 세션 선생님
// (view.teacher — 처음 스냅숏)의 한글 이름을 넘긴다(선생님 화면 plan 값 9, 고르기 전 '선생님').
// 열 때 차례: 마이크를 쓸 수 없는 기기면 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈'만(세션 진행 — 7절) → 1-가 하루 안전 상한이면
// '[이름](이/가) 잠깐 쉬어요'(P11b AiRest) → 고른 선생님이 없으면 '선생님을 골라요'(선생님 화면 plan 값 10 — 고른 뒤 자료를 다시 읽어
// 처음 스냅숏 · 토리 행 1 이 들고 아이 화면 틀의 집 선생님도 새로) → '시작!'(처음 회화면 3.3 안내 글과 함께 — 열 때마다 한 번, 그 누름이 첫 읽어 주기를 연다, 컨트롤러
// 결정) → 처음 마이크 안내(기기마다 한 번, P10 MIC_NOTICE_KEY). 토막: 인사 → 오늘 쓸 말 · 말해 보기(따라 말하기 조각 — follow-along) →
// 대화 → 정리(WrapUp) → 마무리 세 장(closing-cards). 한 턴: 토리 말풍선(흘러 받은 문장 · 뜻 · 붙인 말, 바로 읽기) → 아이 차례 →
// 턴 요청(talk-stream) → … . 토막 넘김은 advanceTalk(대화에 들어갈 때 대화 첫 질문을 붙임), 목표 턴 뒤 '더 이야기하기' · '그만하기'.
// '그만하기'(목표 턴 전 확인 쪽지) · 목표 턴 뒤 고르기의 '그만하기'는 정리 → 마무리 세 장(차례 5 정할 것 2), 목표 턴 뒤 '홈'은 마무리 첫 장
// 뒤 홈, 목표 턴 뒤 1-가 하루 안전 상한 닫힘은 정리 → 마무리(8절 '목표 턴 뒤의 회화'), 대화 안전 상한 닫힘은 끝인사 뒤 '수업 목록'.
// stale · 끊김은 talk-stream 의 되풀이(같은 시도 id — 기다렸다 자료를 다시 읽고 판이 같으면 다시 보냄 · 온라인 끊김은 기다렸다 다시)가
// 다루고, 그래도 안 되면 '인터넷이 끊겼어요 …' + '다시 해 보기' · online 때 다시(I-1). 턴 요청은 다음 턴 · '홈' · '그만하기' · 틀
// 사라짐에서 끊는다(I-2). 토리의 말이 없는
// 마지막 아이 행(view.retryTurn)은 열 때 같은 시도 id 로 다시 보낸다(8절 · AC-15f). 판정 · 점수 · 퍼센트를 보이지 않는다(R2). 녹음 없음.
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  MicBlockedText,
  useIpadSafari,
} from "@/components/session/mic-blocked";
import { MicNotice } from "@/components/session/speaking";
import { TeacherChoice } from "@/components/teacher/teacher-choice";
import { useTeacherLayer } from "@/components/teacher/teacher-layer";
import { TeacherWindow } from "@/components/teacher/teacher-window";
import {
  type SpeechEvent,
  type SpeechVerdict,
  speakingCounters,
  speakingCountersStart,
} from "@/core/speaking/judge";
import { speakRateOf } from "@/core/speech/pace";
import { TEACHER_TEXT } from "@/core/teacher/name";
import { praiseUntilOf, teacherStateOf } from "@/core/teacher/state";
import {
  markMicNoticeSeen,
  markMicUnavailable,
  micNoticeSeen,
  micUsable,
  readDeviceVerdict,
} from "@/lib/mic-state";
import { createBrowserSpeech } from "@/lib/speech/browser";
import { teacherSpeech } from "@/lib/speech/teacher";
import type { SpeechPort } from "@/lib/speech/types";
import { sendTalkTurnRetrying, type TalkTurnBody } from "@/lib/talk-stream";
import { cn } from "@/lib/utils";
import {
  advanceTalk,
  chooseMoreTalk,
  leaveTalk,
  markTalkNotice,
  readTalkWrap,
  revealTalkHint,
  stopTalk,
  talkClosingStatus,
} from "@/server/actions/conversation";
import { reportSessionMic } from "@/server/actions/session";
import type {
  AddLineOut,
  TalkView,
  TurnNext,
  WrapView,
} from "@/server/conversation";
import { type ChildSend, ChildTurn } from "./child-turn";
import { ClosingCards } from "./closing-cards";
import {
  FollowAlong,
  type FollowEnv,
  followStepsOf,
  TalkPaper,
  TalkStart,
  WrapUp,
} from "./follow-along";
import {
  type BubbleContent,
  spokenOf,
  ToriBubble,
  useReducedMotion,
  useSpeakQueue,
} from "./tori";

/** 화면 글(4절 회화 세션 표 · 3.3 · 7절 · C34 · 8절 · 정본 밖 문구 표). 이름 자리 글(약속 · 그만하기 확인)은 TEACHER_TEXT. */
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
  /** C34 확인 쪽지 단추(물음 글은 TEACHER_TEXT.stopConfirm). */
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

/** 대화 밖 큰 차례(토막 정리 · 마무리 세 장). 오늘 쓸 말 · 말해 보기는 view.next.segment 로 고른다. */
type Stage = "talk" | "wrap" | "closing";
type FollowSegment = "today_words" | "practice";
const isFollowSegment = (segment: string): segment is FollowSegment =>
  segment === "today_words" || segment === "practice";

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

/** 말소리 없음 셈(C22): 말소리 없이 '모름'으로 넘어간 질문이 이어진 수 · 지금 질문이 지금까지 말소리 없음 '모름'뿐인가. */
export type SilentCount = {
  passed: number;
  current: "silent" | "mixed" | null;
};
export const SILENT_COUNT_START: SilentCount = { passed: 0, current: null };

/**
 * 말소리 없음 셈 한 걸음(순수 함수, C22 · 7절 오류 행 'no-speech 로만 끝난 질문(회화에서 모름으로 넘어간 질문)이 같은 세션에서
 * speech.silent_items_max 개 이어지면'). 보냄: 말한 턴이면 처음부터, 말소리 없음 '모름'은 그 질문을 '말소리 없음'으로(단추 '모름'이 이미
 * 끼었으면 그대로 섞임), 단추 '모름'은 섞임. 끝 줄: '모름' 뒤 같은 질문 '모름' 수가 0 이면 질문이 넘어간 것 — 말소리 없음뿐이었으면
 * 하나 더, 아니면 이어짐이 끊겨 0. 넘어가지 않았으면 그대로.
 */
export function silentCountStep(
  state: SilentCount,
  event:
    | { kind: "send"; mode: "speech" | "dont_know"; nospeech: boolean }
    | { kind: "end"; afterDontKnow: boolean; dontKnowCount: number },
): SilentCount {
  if (event.kind === "send") {
    if (event.mode === "speech") return { passed: 0, current: null };
    if (!event.nospeech) return { ...state, current: "mixed" };
    return {
      ...state,
      current: state.current === "mixed" ? "mixed" : "silent",
    };
  }
  if (!event.afterDontKnow || event.dontKnowCount > 0) return state;
  return {
    passed: state.current === "silent" ? state.passed + 1 : 0,
    current: null,
  };
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

/**
 * 선생님 창을 그리는가(선생님 화면 plan 값 13 · 4절 '처음 회화' · '회화 마무리 — 초상만'): 고른 선생님이 있고 막힘 · 쉼 · 마무리 세 장이
 * 아닐 때. 고르는 화면에는 없고 '시작!' 화면 · 처음 마이크 안내 · 토막 · 정리에는 있다.
 */
export function teacherWindowShown(s: {
  hasTeacher: boolean;
  blocked: boolean;
  resting: boolean;
  stage: Stage;
}): boolean {
  return s.hasTeacher && !s.blocked && !s.resting && s.stage !== "closing";
}

/** 목표 턴 칭찬(4절 '선생님 창' 칭찬 행 · R2): 목표 턴이 이번 턴 끝 줄에서 처음 참이 됐는가(이미 닿은 뒤 · 닿기 전은 아님). */
export function targetReachedNow(before: boolean, after: boolean): boolean {
  return !before && after;
}

/**
 * 회화 틀. 선생님이 바뀌면(고르는 화면에서 고른 뒤 판이 같아도 — 옛 스냅숏에 키가 없을 때) 틀을 새로 그려 음성 접점을 그 선생님 목소리로
 * 다시 감싼다. 판(version)이 바뀌면 세션 쪽이 key 로 새로 그린다.
 */
export function TalkFrame({ view }: { view: TalkView }) {
  return <TalkFrameBody key={view.teacher?.key ?? ""} view={view} />;
}

function TalkFrameBody({ view }: { view: TalkView }) {
  const router = useRouter();
  // 이름 자리(세션 선생님 — 처음 스냅숏, 고르기 전이면 undefined → 문구 표가 '선생님')
  const teacherName = view.teacher?.nameKo;
  const [speech, setSpeech] = useState<SpeechPort | undefined>();
  const [blocked, setBlocked] = useState<Blocked | undefined>();
  const [noticeSeen, setNoticeSeen] = useState(true);
  /** 마이크 막힘 판정이 끝났는가(렌더 뒤 효과에서 정함 — 그 앞 첫 그림에는 창이 잠깐 보여도 3D 를 원하지 않는다, 검토 4 M-1). */
  const [micChecked, setMicChecked] = useState(false);
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
  /** 선생님 말하기(읽어 주기가 실제로 시작한 알림부터 그 문장의 결과까지 — 선생님 음성 감싸기가 알린다, 4절 · AC-19g). */
  const [speakingNow, setSpeakingNow] = useState(false);
  /** 칭찬 끝 시각과 그 상태를 잰 때(performance.now ms — 타이머가 끝에서 다시 그린다). */
  const [praiseClock, setPraiseClock] = useState<{
    until: number;
    now: number;
  } | null>(null);
  /** 목표 턴에 닿은 턴의 읽어 주기가 끝나면 칭찬(끝 줄에서 세우고 읽기 줄이 비면 켬). */
  const [praiseAfterReading, setPraiseAfterReading] = useState(false);
  const reducedMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [closeLine, setCloseLine] = useState<{
    en: string;
    ko?: string;
  } | null>(null);
  const [nudge, setNudge] = useState(!view.noticesSeen.talk_hint_nudge);
  const ipadSafari = useIpadSafari();
  /** 프로필의 처음 회화(안내 글 — 회17). '시작!'은 처음이 아니어도 열 때마다 한 번(컨트롤러 결정). */
  const introFirst = !view.noticesSeen.talk_intro;
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState<Stage>("talk");
  const [wrap, setWrap] = useState<WrapView | null>(null);
  const [closingMode, setClosingMode] = useState<"full" | "first">("full");
  /** 오늘 쓸 말 · 말해 보기 조각을 그리는가(인사 끝 토리 말을 다 읽은 뒤 — 이어 열면 바로). */
  const [followShown, setFollowShown] = useState(false);
  const nudgeMarked = useRef(false);
  const counters = useRef(speakingCountersStart());
  const silent = useRef<SilentCount>(SILENT_COUNT_START);
  /** 이번 턴이 '모름'(단추 · 말소리 없음)이었는가 — 끝 줄에서 질문이 넘어갔는지 본다. */
  const sentDontKnow = useRef(false);
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
  /** 지난 끝 줄까지 목표 턴에 닿았는가(목표 턴 칭찬은 처음 닿은 턴만). */
  const reachedBefore = useRef(view.next.targetReached);
  const praiseTimer = useRef<number | undefined>(undefined);
  const lowLevel = view.spec.cardShape === "turns";
  /** 토리 말 · 힌트 문장 듣기 · 따라 말하기의 읽어 주기 빠르기(단계 구간마다 speech.rate.<구간>, C125). */
  const rate = speakRateOf(view.level, view.settings.speech);
  /** 인식 실패 셈의 상한. 회화의 말소리 없음 셈(C22)은 틀이 질문마다 따로 하므로 P11a 셈에는 상한을 두지 않는다(검토 M-6). */
  const counterLimits = talkCounterLimits(view.settings.maxRetries);
  const queue = useSpeakQueue(speech, {
    rate,
    pauseMs: view.settings.speech.sentencePauseMs,
    englishName: view.englishName,
  });

  // 마이크를 쓸 수 없는 기기면 막힌 안내(세션은 진행으로 남음), 처음 마이크 안내를 봤는지(기기마다 한 번)
  useEffect(() => {
    if (!micUsable()) setBlocked("needsMic");
    setNoticeSeen(micNoticeSeen());
    setMicChecked(true);
  }, []);

  // 틀이 사라지면 턴 요청을 끊는다(검토 I-2 — 늦게 온 문장이 다른 화면에서 읽히지 않게)
  useEffect(() => () => inflight.current?.abort(), []);

  // 음성 접점은 렌더 뒤에 세션 동안 하나만 만든다(SpeechPort.device 는 useEffect 에서만). 자료 다시 읽기(router.refresh — 판이 같으면
  // 틀이 그대로)가 설정 객체를 새로 줘도 다시 만들지 않는다 — 돌고 있는 처리기가 닫힌 접점으로 읽지 않게(재검토 N-1). 틀이 사라질 때만 닫는다.
  // 고른 선생님이 있으면 바로 선생님 음성 감싸기로 싼다(선생님 화면 plan 값 13): 회화 틀 · 따라 말하기 · 아이 차례 힌트 듣기 · 마무리 단어
  // 듣기가 모두 이 접점이라 선생님 높이 · 목소리 순서 · 시작 알림이 한 곳에서 나온다. 고르기 전(고르는 화면)은 감싸지 않는다 — '인사 듣기'가
  // 장마다 그 선생님 높이를 넘긴다. 선생님은 틀의 key 라 바뀌면 틀이 새로 그려진다
  const speechSettings = useRef(view.settings.speech);
  const teacherVoice = useRef(view.teacher?.voice);
  useEffect(() => {
    const created = createBrowserSpeech({ settings: speechSettings.current });
    const voice = teacherVoice.current;
    setSpeech(
      voice
        ? teacherSpeech(created, {
            pitch: voice.pitch,
            voicePrefer: voice.prefer,
            onSpeaking: setSpeakingNow,
          })
        : created,
    );
    return () => created.dispose();
  }, []);

  /** 칭찬을 talk.teacher_praise_seconds 동안 켠다(끝나면 다시 그린다). 5~7단계 미션 체크(P13c)도 이것을 부른다. */
  const praiseSeconds = view.teacherSettings.praiseSeconds;
  const praise = useCallback(() => {
    const at = performance.now();
    const until = praiseUntilOf(at, praiseSeconds);
    setPraiseClock({ until, now: at });
    window.clearTimeout(praiseTimer.current);
    praiseTimer.current = window.setTimeout(
      () => setPraiseClock({ until, now: until }),
      until - at,
    );
  }, [praiseSeconds]);
  useEffect(() => () => window.clearTimeout(praiseTimer.current), []);

  // 선생님을 고르기 전에는 열지 않는다(고르는 화면은 처음 스냅숏 앞 — 값 10)
  const ready =
    Boolean(speech) &&
    view.teacher !== null &&
    started &&
    noticeSeen &&
    !blocked &&
    !resting;
  const inFollow = isFollowSegment(next.segment);

  // 열 때(안내를 지난 뒤): 마지막 토리 말을 읽고, 토리의 말이 없는 아이 행이 있으면 같은 시도 id 로 다시 보낸다
  const opened = useRef(false);
  /** 처음 읽기를 시작하기 전(안내를 지나기 전)에는 아이 차례로 넘기지 않는다. */
  const [opening, setOpening] = useState(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: 안내를 지난 첫 그림에 한 번
  useEffect(() => {
    if (!ready || opened.current) return;
    opened.current = true;
    setOpening(false);
    // 오늘 쓸 말 · 말해 보기에서 이어 열면 인사 끝 토리 말을 다시 읽지 않고 그 조각부터(남은 차례 — 저장한 차례는 건너뜀)
    if (isFollowSegment(next.segment)) {
      setFollowShown(true);
      return;
    }
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

  // 인사 끝 토리 말을 다 흘리고 읽은 뒤 오늘 쓸 말 · 말해 보기 조각
  useEffect(() => {
    if (opening || !inFollow || followShown) return;
    if (bubble.done && typedDone && !queue.speaking) setFollowShown(true);
  }, [opening, inFollow, followShown, bubble.done, typedDone, queue.speaking]);

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

  // 목표 턴에 닿은 턴의 읽어 주기가 끝나면(끝 줄까지 받고 읽기 줄이 빔) 칭찬(4절 '선생님 창' · R2 — 대화 턴의 맞고 틀림과 무관)
  useEffect(() => {
    if (!praiseAfterReading || !bubble.done || queue.speaking) return;
    setPraiseAfterReading(false);
    praise();
  }, [praiseAfterReading, bubble.done, queue.speaking, praise]);

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

  /** 인사 끝 턴 뒤면 다음 토막으로(대화로 바로 가면 대화 첫 질문을 이 말풍선에 붙인다 — AI 없음). */
  async function afterBubble(current: TurnNext) {
    if (!current.greetingDone || current.segment !== "greeting") return;
    const at = view.flow.indexOf("greeting");
    const to = view.flow[at + 1];
    if (to !== "today_words" && to !== "practice" && to !== "talk") return;
    await moveTo(to, false);
  }

  /** 오늘 쓸 말 · 말해 보기 조각을 다 함 → 흐름의 다음 토막(대화면 대화 첫 질문을 새 말풍선으로). */
  function afterFollow(segment: FollowSegment) {
    const at = view.flow.indexOf(segment);
    const to = view.flow[at + 1];
    if (to !== "practice" && to !== "talk") return;
    void moveTo(to, true);
  }

  /** 토막 넘김(advanceTalk — 차례대로만). 실패면 '다시 해 보기'. */
  async function moveTo(
    to: "today_words" | "practice" | "talk",
    fromFollow: boolean,
  ) {
    const moved = await advanceTalk({ sessionId: view.sessionId, to }).catch(
      () => undefined,
    );
    if (!moved?.ok) {
      retryAction.current = () => {
        setPhase("tori");
        void moveTo(to, fromFollow);
      };
      setPhase("failed");
      return;
    }
    retryAction.current = null;
    const adds = moved.add.flatMap((l) => (l.t === "add" ? [l] : []));
    if (fromFollow && to === "talk") {
      // 따라 말하기 뒤 대화 첫 질문은 새 말풍선(흘러나오기부터)
      setTurnKey((k) => k + 1);
      setBubble({ sentences: [], adds, done: true });
      setFollowShown(false);
      setPhase("tori");
    } else setBubble((b) => ({ ...b, adds: [...b.adds, ...adds] }));
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

  /** 끝인사로 대화가 닫힘(대화 안전 상한 — 끝인사 뒤 '수업 목록'). */
  function showClosed(farewell: { en: string; ko?: string }) {
    setCloseLine(farewell);
    setBubble({
      sentences: [farewell.en],
      ...(farewell.ko ? { ko: farewell.ko } : {}),
      adds: [],
      done: true,
    });
    queue.enqueue([farewell.en]);
    setPhase("closed");
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
          countSilent(n);
          counters.current = speakingCounters(
            counters.current,
            { type: "next-activity" },
            counterLimits,
          ).state;
          if (targetReachedNow(reachedBefore.current, n.targetReached))
            setPraiseAfterReading(true);
          reachedBefore.current = n.targetReached;
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
          if (line.reason === "resting" && (line.lines?.length ?? 0) > 0) {
            // 목표 턴 뒤 1-가 하루 안전 상한: 정리(되짚을 말 · 카드 끝인사) → 마무리 첫 장 · 셋째 장(8절 '목표 턴 뒤의 회화'). 마무리 자료를
            // 못 읽으면 끝인사와 '수업 목록'(대화 안전 상한과 같은 꼴)
            void readTalkWrap({ sessionId: view.sessionId })
              .catch(() => undefined)
              .then((out) => {
                if (out?.ok) {
                  setWrap(out.wrap);
                  setStage("wrap");
                  return;
                }
                showClosed(line.farewell);
              });
            return;
          }
          showClosed(line.farewell);
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

  /** 끝 줄: 말소리 없이 '모름'으로 넘어간 질문이 speech.silent_items_max 개 이어지면 막힌 안내 · 알림(C22). */
  function countSilent(n: TurnNext) {
    silent.current = silentCountStep(silent.current, {
      kind: "end",
      afterDontKnow: sentDontKnow.current,
      dontKnowCount: n.dontKnowCount,
    });
    sentDontKnow.current = false;
    if (silent.current.passed < view.settings.silentItemsMax) return;
    void reportSessionMic({
      kind: "speech_silent",
      code: "no-speech",
      browser: readDeviceVerdict().name,
    }).catch(() => {});
    setBlocked("silent");
  }

  function onChildSend(send: ChildSend) {
    sentDontKnow.current = send.input.mode === "dont_know";
    silent.current = silentCountStep(silent.current, {
      kind: "send",
      mode: send.input.mode,
      nospeech: send.input.mode === "dont_know" && send.input.nospeech === true,
    });
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

  /**
   * '홈': 대화 중이면 leaveTalk — 목표 턴 전은 그대로(진행), 목표 턴 뒤는 닫히고 마무리 첫 장을 보인 뒤 홈(3.3 · 회11 (10)). 막힌 안내 ·
   * 쉬는 안내의 '홈'은 첫 장 없이 바로 홈. 정리 · 마무리 중이면 이미 닫혔으므로 바로 홈.
   */
  async function home({ firstCard = true }: { firstCard?: boolean } = {}) {
    setBusy(true);
    abortInflight();
    queue.cancel();
    if (stage !== "talk") {
      router.push("/");
      return;
    }
    const out = await leaveTalk({ sessionId: view.sessionId }).catch(
      () => undefined,
    );
    if (firstCard && out?.ok && out.closed && out.wrap) {
      setBusy(false);
      setWrap(out.wrap);
      setClosingMode("first");
      setStage("closing");
      return;
    }
    router.push("/");
  }

  /** '그만하기': 목표 턴 전이면 확인 쪽지(C34) 뒤. AI 를 기다리지 않고 정리 → 마무리(끝맺음은 응답 뒤 — C33 · AC-8c). */
  async function stop(confirmed: boolean) {
    setBusy(true);
    abortInflight();
    queue.cancel();
    const out = await stopTalk({ sessionId: view.sessionId, confirmed }).catch(
      () => undefined,
    );
    setBusy(false);
    if (out && !out.ok && out.reason === "needs_confirm") {
      setConfirmStop(true);
      return;
    }
    if (out && !out.ok && out.reason === "not_found") {
      // 다른 기기에서 이미 닫혔다
      router.push(LESSONS_PATH);
      return;
    }
    if (!out?.ok) {
      retryAction.current = () => {
        setPhase("tori");
        void stop(true);
      };
      setPhase("failed");
      return;
    }
    retryAction.current = null;
    setWrap(out.wrap);
    setStage("wrap");
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

  const followEnv: FollowEnv = {
    sessionId: view.sessionId,
    speech,
    level: view.level,
    lowLevel,
    englishName: view.englishName,
    teacherName,
    rate,
    homophones: view.homophones,
    settings: {
      speech: view.settings.speech,
      talkSpeech: view.settings.talkSpeech,
      matchPhraseLevels: view.settings.ui.matchPhraseLevels,
      autoNextSeconds: view.settings.ui.autoNextSeconds,
      hintReadMatch: view.settings.talk.hintReadMatch,
      waitHintSeconds: view.settings.ui.waitHintSeconds,
    },
    onSpeech,
    onNextItem: () => {
      counters.current = speakingCounters(
        counters.current,
        { type: "next-activity" },
        counterLimits,
      ).state;
    },
    onListening: setListening,
    onPraise: praise,
  };
  const followSteps = useMemo(
    () =>
      followStepsOf({
        todayWords: view.follow.todayWords,
        practice: view.follow.practice,
        done: view.follow.done,
        lowLevel,
      }),
    [view.follow, lowLevel],
  );

  // 선생님 상태 하나(듣기 → 생각 → 말하기 → 칭찬 → 쉬기, 앞이 이긴다 — 4절 '선생님 창')
  const teacherState = teacherStateOf({
    listening,
    thinking: waitingSince !== null,
    speaking: speakingNow,
    praiseUntil: praiseClock?.until ?? null,
    now: praiseClock?.now ?? 0,
  });
  // 선생님 칸(4절 '선생님 창' · plan 값 13): 고른 선생님이 있고 막힘 · 쉼 · 마무리가 아닐 때
  const windowShown = teacherWindowShown({
    hasTeacher: view.teacher !== null,
    blocked: blocked !== undefined,
    resting,
    stage,
  });
  // 그림 층(세션 쪽 보관 조각 — 선생님 화면 plan 값 14): 막힘 판정이 끝난 뒤 창이 처음 보이면 3D 를 원하고('시작!' 화면부터 — 막힘 ·
  // 쉼 화면에서는 받지 않음, 검토 4 M-1), 상태 · 움직임 줄이기를 넘기고, 마무리 세 장에 들어가면 닫는다(4절 '회화 마무리 — 초상만',
  // 메모리를 일찍 풂)
  const layer = useTeacherLayer();
  useEffect(() => {
    if (micChecked && windowShown) layer?.want();
  }, [layer, micChecked, windowShown]);
  useEffect(() => {
    layer?.setPose(teacherState, reducedMotion);
  }, [layer, teacherState, reducedMotion]);
  useEffect(() => {
    if (stage === "closing") layer?.close();
  }, [layer, stage]);
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
  /** 대화 판이 보이는가(오늘 이야기 목록은 그때만 — 창 칸 아래 · 옆). */
  let panelShown = false;
  if (blocked) {
    // 막힘 · 쉼 안내도 종이 판 위에(코르크 위에 글을 두지 않음 — 전체 디자인 리뷰 M-1), 아이패드 사파리면 무음 모드 줄(C111)
    body = (
      <TalkPaper data-blocked={blocked}>
        <MicBlockedText kind={blocked} ipadSafari={ipadSafari} />
        <BigButton
          disabled={busy}
          onClick={() => void home({ firstCard: false })}
        >
          {TALK_TEXT.home}
        </BigButton>
      </TalkPaper>
    );
  } else if (resting) {
    body = (
      <TalkPaper data-talk-rest="">
        <AiRest
          busy={busy}
          teacherName={teacherName}
          onHome={() => void home({ firstCard: false })}
        />
      </TalkPaper>
    );
  } else if (!view.teacher) {
    body = (
      <TeacherChoice
        choices={view.teacherChoices}
        speech={speech}
        rate={rate}
        // 새 자료(선생님 · 처음 스냅숏)와 아이 화면 틀의 집 선생님(쉼 안내 등의 이름)을 다시 읽는다 — 틀은 쪽을 옮겨도 다시 그려지지 않는다
        onChosen={() => router.refresh()}
      />
    );
  } else if (!started) {
    body = (
      <TalkStart
        first={introFirst}
        teacherName={teacherName}
        disabled={!speech}
        onStart={() => {
          // 이 누름이 첫 읽어 주기를 연다(iPad Safari — 7절)
          speech?.unlockFromGesture();
          setStarted(true);
          if (introFirst)
            void markTalkNotice({ kind: "talk_intro" }).catch(() => {});
        }}
      />
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
  } else if (stage === "closing" && wrap) {
    body = (
      <ClosingCards
        wrap={wrap}
        teacherName={teacherName}
        lowLevel={lowLevel}
        mode={closingMode}
        waitHintSeconds={view.settings.ui.waitHintSeconds}
        onListen={(word) => {
          speech?.unlockFromGesture();
          queue.replay([word]);
        }}
        onHome={() => router.push("/")}
        onLessons={() => router.push(LESSONS_PATH)}
      />
    );
  } else {
    let main: ReactNode;
    if (stage === "wrap" && wrap)
      main = (
        <WrapUp
          lines={wrap.lines}
          farewell={wrap.farewell}
          env={followEnv}
          closingFarewell={async () => {
            const status = await talkClosingStatus({
              sessionId: view.sessionId,
            });
            return status.state === "ready" ? status.farewell : undefined;
          }}
          onDone={() => {
            setClosingMode("full");
            setStage("closing");
          }}
        />
      );
    else if (inFollow && followShown && isFollowSegment(next.segment)) {
      const segment = next.segment;
      main = (
        <FollowAlong
          key={segment}
          segment={segment}
          steps={
            segment === "today_words" ? followSteps.today : followSteps.practice
          }
          env={followEnv}
          onDone={() => afterFollow(segment)}
        />
      );
    }
    panelShown = true;
    body = (
      <section
        data-talk-panel=""
        data-talk-phase={phase}
        className="relative flex min-w-0 flex-1 flex-col gap-5 bg-paper px-6 py-6 shadow-postit landscape:gap-3 landscape:py-4"
      >
        <span
          aria-hidden
          className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 bg-postit-talk/90"
        />
        {main ? (
          <>
            {main}
            {phase === "offline" || phase === "failed" ? (
              <TroubleLine phase={phase} retry={retryAction.current} />
            ) : null}
          </>
        ) : (
          <>
            <div className="min-w-0">
              <ToriBubble
                key={turnKey}
                content={bubble}
                onAllTyped={setTypedDone}
                englishName={view.englishName}
                teacherName={teacherName}
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
            <div className="mt-auto border-t-2 border-dashed border-ink/30 pt-4">
              {phase === "child" && pending ? (
                <ChildTurn
                  key={`${turnKey}:${next.talkCount}:${next.dontKnowCount}`}
                  sessionId={view.sessionId}
                  speech={speech}
                  level={view.level}
                  lowLevel={lowLevel}
                  englishName={view.englishName}
                  teacherName={teacherName}
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
                  rate={rate}
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
                <TroubleLine phase={phase} retry={retryAction.current} />
              ) : null}
            </div>
          </>
        )}
      </section>
    );
  }

  // 선생님 칸(4절 '선생님 창' · plan 값 13 · 정할 것 7): 몸 밖 늘 같은 자리 — 토막 · 정리로 바뀌어도 창을 다시 만들지 않는다. 가로는 왼쪽 칸
  // (창 + 그 아래 오늘 이야기 목록) · 오른쪽 대화 판, 세로는 위 띠 아래 한 줄(창 | 오늘 이야기 목록) · 그 아래 대화 판
  const shown =
    windowShown && view.teacher ? (
      <div data-talk-layout="" className="flex flex-col gap-6 lg:flex-row">
        <div
          data-teacher-column=""
          className="flex shrink-0 flex-row items-start gap-6 lg:w-[260px] lg:flex-col lg:items-stretch"
        >
          <TeacherWindow
            key="teacher-window"
            teacher={view.teacher}
            state={teacherState}
            reducedMotion={reducedMotion}
            started={started}
          />
          {panelShown ? (
            <aside
              data-talk-topics=""
              className="flex min-w-0 flex-1 flex-col gap-3 bg-postit-talk px-6 py-6 shadow-postit lg:flex-none lg:rotate-[1.5deg]"
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
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">{body}</div>
      </div>
    ) : (
      body
    );

  const showStop =
    !blocked &&
    !resting &&
    started &&
    noticeSeen &&
    stage === "talk" &&
    inDialogue &&
    phase !== "closed" &&
    phase !== "break";
  // 셈은 대화 단계에서만 보이고(안내 · 막힘 · 마무리에는 없음), 자리는 늘 잡아 띠 높이가 토막 · 화면마다 바뀌지 않게 한다(전체 디자인 리뷰 M-2)
  const showCount = started && !blocked && !resting && stage === "talk";
  const showHome = !blocked && !resting && stage !== "closing";
  return (
    <ChildScreen>
      <PaperBand
        heading
        title={view.title}
        detail={
          <span className="flex flex-wrap gap-x-4">
            <span>{TALK_TEXT.levelUnit(view.level, view.unit)}</span>
            <span
              data-talk-count={showCount ? "" : undefined}
              aria-hidden={showCount ? undefined : true}
              className={cn(!showCount && "invisible")}
            >
              {counter}
            </span>
          </span>
        }
        right={
          <>
            {/* '그만하기'는 위 띠 오른쪽('홈' 왼쪽) 작은 단추 — 자리는 늘 잡아 두고 대화 · 더 이야기하기 동안만 보인다(띠가 두 줄로 접혀 판이 뛰지 않게, M-2) */}
            <SmallButton
              data-talk-stop={showStop ? "" : undefined}
              aria-hidden={showStop ? undefined : true}
              tabIndex={showStop ? undefined : -1}
              className={cn(!showStop && "invisible")}
              disabled={busy || !showStop}
              onClick={() => {
                if (next.targetReached) void stop(true);
                else setConfirmStop(true);
              }}
            >
              {TALK_TEXT.stop}
            </SmallButton>
            {/* 막힌 안내 · 쉬는 안내 · 마무리 셋째 장은 제 '홈'이 있다(한 화면 '홈' 하나 — 띠 자리는 잡아 둠) */}
            <SmallButton
              aria-hidden={showHome ? undefined : true}
              tabIndex={showHome ? undefined : -1}
              className={cn(!showHome && "invisible")}
              disabled={busy || !showHome}
              onClick={() => void home()}
            >
              {TALK_TEXT.home}
            </SmallButton>
          </>
        }
      />
      {shown}
      <p
        data-tori-promise=""
        className={cn(
          CHILD_SIZE.guide,
          "mt-auto rounded bg-paper/80 px-4 py-2",
        )}
      >
        <span className="font-heading">{TEACHER_TEXT.promiseLabel}</span>{" "}
        {TEACHER_TEXT.promise(teacherName)}
      </p>
      <ConfirmSheet
        open={confirmStop}
        message={TEACHER_TEXT.stopConfirm(teacherName)}
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

/** 끊김 · 실패 줄(다시 부를 일이 있으면 '다시 해 보기' — 검토 I-1 · M-11). */
function TroubleLine({
  phase,
  retry,
}: {
  phase: "offline" | "failed";
  retry: (() => void) | null;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <StatusLine tone="error">
        {phase === "offline" ? TALK_TEXT.offline : TALK_TEXT.failed}
      </StatusLine>
      {retry ? (
        <SmallButton data-talk-retry="" onClick={() => retry()}>
          {TALK_TEXT.retry}
        </SmallButton>
      ) : null}
    </div>
  );
}
