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
// iPad 버리는 듣기(13절 C213 · C214 · C215, spec 설계 3 · FR-2 · FR-3, 정본 03 97줄 · 07 26 · 29 · 31줄): 틀이 discard 를 넘긴 때만(버리는 듣기를 켠
// 기기) 누름은 손잡이를 바로 받고, 진짜가 실제로 열린 때(on.started) '듣는 중'을 켠다. 그 전에는 단추 글 '준비 중이에요'와 점 셋이고, 기다린
// 누름 · 회복으로 열린 진짜면 '말해 보세요'를 보였다가 소리가 들어오면 지운다. 마이크 안 잡힘은 '잠깐만요, 마이크를 다시 켤게요'와 누름 없는
// 듣기(listenAuto)로 잇고, 누름 없이 다시 말할 차례만 보이는 때(못 들었어요 안내)는 again 을 알린다. 넘김 · 건너뜀에는 알리지 않는다.
// discard 가 없으면(끔 · 켜지 않은 기기) 지금 그대로다.
// 화면 · 문구 판정(2026-11-07): 켠 기기의 말하기 단추는 세 상태 글을 겹쳐 너비가 그대로(I-1, SpeakButton steady)이고, 안내 줄은 단추 묶음 바로
// 아래(단추 쪽 정렬, M-3)이며, 짧은 말 말풍선이나 안내 줄이 나타나면 아이 차례를 움직임 없이 화면 안으로 옮긴다(I-2 — 방향이 바뀌어도).
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
import type { DiscardView } from "@/core/speech/discard";
import {
  type ListenOutcome,
  NO_SPEECH_CODE,
  type SpeechSettings,
} from "@/core/speech/listen";
import { josa, TEACHER_TEXT, teacherNameOf } from "@/core/teacher/name";
import type { DiscardLayer } from "@/lib/speech/discard-layer";
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
  /**
   * 마이크 안 잡힘(듣기 deaf — iPad WebKit 326069 · 321436 꼴, 잠정 11-06 · 정본 밖 문구): 아이의 말소리 없음이 아니므로 '못 들었어요' ·
   * 셈 없이 이 한 줄과 말하기 단추 그대로. 대화 차례 · 짧은 준비 쪽지 · 정리가 같이 쓴다.
   */
  micDeaf: "마이크가 안 잡혔어요. 한 번 더 눌러 주세요",
  /**
   * 같은 자리에서 마이크 안 잡힘이 speech.deaf_skip_after 번 이어짐(잠정 11-06 fix 2, 13절 C210 보완 · 정본 밖 문구). 쪽지 · 정리는 이 줄 뒤 기술
   * 사유로 다음 항목, 대화 차례는 '잘 모르겠어요'가 길이라 이 줄만 보인다.
   */
  micDeafSkip: "마이크가 계속 안 잡혀서 다음으로 넘어가요",
  /** 대화 차례에서 마이크 안 잡힘이 speech.deaf_skip_after 번 이어짐 — 넘어가지 않으므로 '잘 모르겠어요'로 안내한다(fix 3 · 정본 밖 문구). */
  micDeafStuck: "마이크가 계속 안 잡혀요. '잘 모르겠어요'를 눌러 넘어가 주세요",
  /** 버리는 듣기: 기다린 누름 · 회복으로 진짜가 열림 — 소리가 들어오면 지운다(iPad 버리는 듣기 spec 설계 3 · 정본 밖 문구). */
  sayNow: "말해 보세요",
  /** 버리는 듣기: 마이크 안 잡힘 뒤 누름 없이 다시 듣는 동안(F10 · spec 설계 3 · 정본 밖 문구). */
  micRecover: "잠깐만요, 마이크를 다시 켤게요",
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
 * 마이크 안 잡힘으로 끝난 듣기인가(순수, speech.deaf_* — 잠정 11-06). 이런 듣기는 셈의 일이 없고(speechEventOf → 없음) 같은 질문 말소리 없음
 * 셈(talk.nospeech_dontknow_count)에도 들지 않으며 턴을 보내지 않는다.
 */
export function deafListenOf(outcome: ListenOutcome): boolean {
  return outcome.kind === "deaf";
}

/**
 * 같은 자리 '마이크 안 잡힘' 이어짐(순수, speech.deaf_skip_after — 잠정 11-06 fix 2): 마이크 안 잡힘이면 하나 늘리고 다른 결과면 0 으로 되돌린다.
 * 늘린 수가 문턱에 닿으면 over — 쪽지 · 정리는 기술 사유로 건너뛰고 대화 차례는 안내 한 줄만. 셈(실패 · 말소리 없음 · 건너뜀)에는 넣지 않는다.
 */
export function deafStreakOf(
  streak: number,
  deaf: boolean,
  skipAfter: number,
): { streak: number; over: boolean } {
  const next = deaf ? streak + 1 : 0;
  return { streak: next, over: deaf && next >= skipAfter };
}

/** 버리는 듣기 층에서 아이 차례 · 따라 말하기가 쓰는 몫(틀이 층이 있을 때만 넘긴다 — 없으면 지금 그대로). */
export type TurnDiscard = Pick<
  DiscardLayer,
  "again" | "dontKnow" | "listenAuto" | "soundEnd"
> & {
  /** 층 view(틀이 subscribe 로 받은 지금 값). */
  view: DiscardView;
};

/**
 * 버리는 듣기의 안내 한 줄(순수, spec 설계 3): 회복 중이면 '잠깐만요, 마이크를 다시 켤게요', 기다린 누름 · 회복으로 열린 진짜를 듣는 중이고 소리가
 * 아직 없으면 '말해 보세요', 그 밖은 없음(부르는 쪽의 지금 안내). 층이 없으면 늘 없음.
 */
export function discardLineOf(
  view: DiscardView | undefined,
  { listening, soundIn }: { listening: boolean; soundIn: boolean },
): string | undefined {
  if (view === undefined) return undefined;
  if (view.recovering) return CHILD_TURN_TEXT.micRecover;
  if (view.sayNow && listening && !soundIn) return CHILD_TURN_TEXT.sayNow;
  return undefined;
}

/**
 * 아이 차례를 화면 안으로 옮길까(순수, 화면 판정 I-2): 버리는 듣기를 켠 기기에서 짧은 말 말풍선이나 안내 줄이 보일 때다(말풍선이 아이 차례 칸을
 * 밀어 단추가 첫 화면 아래로 내려가지 않게). 끈 기기는 지금 그대로 옮기지 않는다.
 */
export function keepTurnInViewOf({
  on,
  discardLine,
  shortLine,
}: {
  on: boolean;
  discardLine: string | undefined;
  shortLine: object | undefined;
}): boolean {
  return on && (discardLine !== undefined || shortLine !== undefined);
}

/** 아이 차례 듣기 하나의 끝(버리는 듣기가 다음에 할 일을 가르는 몫). */
export type TurnListenEnd =
  | "heard"
  | "not-heard"
  | "nospeech-move"
  | "offline"
  | "blocked"
  | "deaf"
  | "deaf-over"
  | "none";

/**
 * 듣기가 끝난 뒤 층에 알릴 것(순수, plan 정한 것 5 · 기계 검토 6절 9 · 층 검토 5절 1): 마이크 안 잡힘이고 이어진 수가 speech.deaf_skip_after 전이면
 * 누름 없는 듣기(recover), 누름 없이 다시 말할 차례 안내만 보이는 때(말소리 없음 · 결과 없음 · 다시 듣는 오류 — 회색 '못 들었어요')는 again, 그 밖
 * (들음 · 넘김 · 건너뜀 · 막힘 · 끊김 · 끊긴 연결)은 없음. '다시 말하기' 누름은 누름만으로 짧은 말이 나오므로 again 을 보내지 않는다.
 */
export function turnDiscardAfterOf(
  end: TurnListenEnd,
): "recover" | "again" | "none" {
  if (end === "deaf") return "recover";
  if (end === "not-heard") return "again";
  return "none";
}

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
  /** 버리는 듣기 층(켠 기기에서만 틀이 넘긴다 — iPad 버리는 듣기 spec 설계 3). 없으면 지금 그대로다. */
  discard?: TurnDiscard | undefined;
  /** 이 아이 차례 위에 보이는 짧은 말 말풍선(틀의 값 — 새 줄마다 새 값, 화면 판정 I-2). 없으면 없음. */
  shortLine?: object | undefined;
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
  onSpoken,
}: {
  speech: SpeechPort | undefined;
  text: string;
  rate: number;
  stopReading: () => void;
  /** 그 읽기가 끝난 뒤(끝 · 끊김 · 오류 모두) — 버리는 듣기의 소리 끝 알림(spec 설계 2 '힌트 듣기' 행). */
  onSpoken?: () => void;
}): void {
  if (!speech) return;
  stopReading();
  speech.unlockFromGesture();
  const spoken = speech.speak(text, { rate });
  if (onSpoken) void spoken.then(onSpoken, onSpoken);
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
  /** 아이 차례 칸 · 동작 줄(화면 안으로 옮김 — I-2). */
  const turnRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const nospeech = useRef(0);
  /** 이 차례에서 마이크 안 잡힘이 이어진 수(deafStreakOf). */
  const deafStreak = useRef(0);
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

  /** 듣기 하나. auto 는 회복(마이크 안 잡힘 뒤 누름 없는 듣기 — 버리는 듣기 층이 있을 때만, plan 정한 것 5). */
  async function speak(auto = false) {
    if (!speech || sent.current || moving) return;
    if (handle.current) {
      handle.current.press();
      return;
    }
    const discard = props.discard;
    if (!auto) {
      speech.unlockFromGesture();
      // 읽어 주는 중에 누르면 읽기를 멈추고 듣는다(C53 (2))
      props.onListenStart();
    }
    setMessage(undefined);
    setAttemptSaid((c) => attemptSaidStep(c, { kind: "listen" }));
    setConfirm(null);
    setSoundIn(false);
    // 듣는 중 표시: 층이 없으면 누른 때, 있으면 진짜가 실제로 열린 때(on.started — 버림 동안은 켜지 않음, spec 설계 3 '버림 동안의 화면')
    const opened = () => {
      setListening(true);
      props.onListening(true);
    };
    const sound = () => setSoundIn(true);
    let current: ListenHandle;
    if (!discard) {
      opened();
      current = speech.listen(rule, { sound });
    } else if (auto) {
      current = discard.listenAuto(rule, { sound, started: opened });
    } else {
      current = speech.listen(rule, { sound, started: opened });
    }
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
    const end = listenEnded(outcome);
    if (!discard) return;
    // 버리는 듣기: 회복은 누름 없는 듣기, 못 들었어요 안내는 again(기계 검토 6절 9), 넘김 · 건너뜀은 알리지 않는다
    const next = turnDiscardAfterOf(end);
    if (next === "recover") void speak(true);
    else if (next === "again") discard.again();
  }

  /** 듣기 결과를 안내 · 보냄으로 옮기고 그 끝의 갈래를 돌려준다. */
  function listenEnded(outcome: ListenOutcome): TurnListenEnd {
    const deaf = deafStreakOf(
      deafStreak.current,
      deafListenOf(outcome),
      settings.speech.deafSkipAfter,
    );
    deafStreak.current = deaf.streak;
    if (deafListenOf(outcome)) {
      if (props.discard && !deaf.over) {
        // 버리는 듣기: 선생님 한마디 뒤 '잠깐만요, 마이크를 다시 켤게요'(층 view — discardLineOf)로 누름 없이 다시 듣는다(F10)
        return "deaf";
      }
      // 마이크 안 잡힘(기기 쪽): '못 들었어요' · 같은 질문 말소리 없음 셈 · 틀의 실패 셈 없이 한 줄 안내, 턴을 보내지 않는다(잠정 11-06).
      // speech.deaf_skip_after 번 이어지면 안내만 바꾼다 — 대화 차례의 길은 '잘 모르겠어요'(fix 2, C210 보완)
      setMessage(
        deaf.over ? CHILD_TURN_TEXT.micDeafStuck : CHILD_TURN_TEXT.micDeaf,
      );
      return deaf.over ? "deaf-over" : "deaf";
    }
    const event = speechEventOf(outcome);
    if (!event) return "none";
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
        return "heard";
      }
      setConfirm({ text, bigRetry: plan.bigRetry });
      confirmTimer.current = window.setTimeout(
        () => send({ ...payload, confirmSkipped: false }),
        plan.waitMs,
      );
      return "heard";
    }
    if (verdict === "offline") {
      setMessage(CHILD_TURN_TEXT.offline);
      return "offline";
    }
    if (
      verdict === "mic-unavailable" ||
      verdict === "mic-stalled" ||
      verdict === "speech-silent"
    )
      return "blocked";
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
        return "nospeech-move";
      }
    }
    setMessage(TEACHER_TEXT.notHeard(props.teacherName));
    setAttemptSaid((c) => attemptSaidStep(c, { kind: "failed" }));
    return "not-heard";
  }

  function retry() {
    window.clearTimeout(confirmTimer.current);
    setConfirm(null);
    void speak();
  }

  const showHint = hints.length > 0;
  const discardLine = discardLineOf(props.discard?.view, {
    listening,
    soundIn,
  });
  const keepInView = keepTurnInViewOf({
    on: props.discard !== undefined,
    discardLine,
    shortLine: props.shortLine,
  });
  // 짧은 말 말풍선 · 안내 줄이 나타날 때(새 줄마다)와 방향이 바뀔 때 동작 줄 · 맨 아래 알림 줄을 움직임 없이 화면 안으로(I-2). 이미 보이면 그대로다.
  // 줄이 사라질 때(소리가 들어와 '말해 보세요'가 지워질 때 등)는 옮기지 않는다 — 아이가 올려 둔 쪽을 되돌리지 않게(코드 확인 m-1)
  const shownRef = useRef<{ line: unknown; short: unknown }>({
    line: undefined,
    short: undefined,
  });
  useEffect(() => {
    const prev = shownRef.current;
    shownRef.current = { line: discardLine, short: props.shortLine };
    if (!keepInView) return;
    const keep = () => {
      actionsRef.current?.scrollIntoView({ block: "nearest" });
      turnRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
    };
    const appeared =
      (discardLine !== undefined && discardLine !== prev.line) ||
      (props.shortLine !== undefined && props.shortLine !== prev.short);
    if (appeared) keep();
    const turned = window.matchMedia("(orientation: portrait)");
    turned.addEventListener("change", keep);
    return () => turned.removeEventListener("change", keep);
  }, [keepInView, discardLine, props.shortLine]);
  return (
    <div ref={turnRef} data-child-turn="" className="flex flex-col gap-3">
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
                          // 버리는 듣기: 힌트 읽기가 끝나면 소리 끝(spec 설계 2 '힌트 듣기' 행)
                          ...(props.discard
                            ? { onSpoken: props.discard.soundEnd }
                            : {}),
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
          ref={actionsRef}
          data-child-actions=""
          className="flex shrink-0 flex-wrap items-center justify-center gap-4 lg:ml-auto"
        >
          <SpeakButton
            label={CHILD_TURN_TEXT.speak}
            listening={listening}
            soundIn={soundIn}
            // 버리는 듣기: 누름이 진짜를 기다리는 동안 '준비 중이에요'와 점 셋(C215), 세 상태 글을 겹쳐 너비 그대로(I-1)
            preparing={props.discard?.view.waiting === true}
            steady={props.discard !== undefined}
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
                // 버리는 듣기: 걸린 누름 · 회복 · 다시 말할 차례를 거둔다(층이 걸린 손잡이를 끊김으로 끝낸다)
                props.discard?.dontKnow();
                send({ input: { mode: "dont_know" } });
              }}
            >
              {CHILD_TURN_TEXT.dontKnow}
            </SmallButton>
          </div>
          {/* 버리는 듣기 안내 줄: 단추 묶음 바로 아래 — 세로는 가운데, 가로는 단추 쪽(M-3). 그동안 아래 알림 줄은 비운다(한 줄) */}
          {discardLine && !moving ? (
            <StatusLine className="w-full justify-center lg:justify-end">
              <span data-discard-line="">{discardLine}</span>
            </StatusLine>
          ) : null}
        </div>
      </div>
      <StatusLine tone={message && !moving && !discardLine ? "error" : "info"}>
        {moving ? (
          <span data-nospeech-move="">{message}</span>
        ) : discardLine ? undefined : (
          message
        )}
      </StatusLine>
    </div>
  );
}
