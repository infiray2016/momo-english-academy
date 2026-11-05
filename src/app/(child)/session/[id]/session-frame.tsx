"use client";

// 세션 틀 화면(3.3 첫 활동 새 단어 미리보기 · 영역별 세션 순서 · 4절 · 5절 · 8절, plan-p10b 파일별 값 7 · plan-p11a 값 7 · 위험 3 · 4 · 8).
// 위 종이 띠(수업 제목 · '<n>단계 · 단원 <u>' · '홈') · 활동 점 · 영역 색 활동 카드. 활동마다 조각을 고르고, 조각은 끝을 onDone(끝 내용)
// 하나로 알린다 → 틀이 끝 시도 { v: 1, kind, step: "final", … } 를 기기 대기열에 넣고 끝 시도가 없는 가장 앞 활동으로 간다.
// 마지막 활동 뒤 queue.idle() · flush() → finishSession → incomplete 면 한 번 더 → 안 되면 7절 끊김 안내와 online 때 다시 →
// /result/<id>. 이어 할 자리는 서버 끝 시도 ∪ 이 기기 대기열의 끝 시도로 다시 세고(값 2), 활동 안 입력은 이 기기에 되살린다(값 6).
// 첫 누름(미리보기 '다음')에서 unlockFromGesture() 를 불러 뒤 활동의 읽기를 연다(위험 8). 읽기(차례 2) · 쓰기 1~3(차례 3) ·
// 말하기 1~2(차례 4 — 따라 말하기 · 듣기 이해 · 앱 판정 질문 답) 활동에 상호작용을 붙이고, 아직 조각이 없는 활동(쓰기 4~12 ·
// 말하기 3~12 AI 활동 — b · c)은 P10 처럼 보기만 하고 '다음'(시도 없음, 마지막 뒤 수업 목록). 활동이 바뀌면 조각을 새로 만든다.
// 말하기 세션(값 7 · 12 · 7절): 열 때 마이크를 쓸 수 없는 기기면 막힘 판('마이크가 필요해요 …' · 큰 '다시 해 볼래요' · 작은 '홈', 세션은 진행으로
// 남음), 처음 말하는 활동에서 기기마다 한 번 마이크 안내, 인식 실패 셈(speakingCounters)이 막힌 안내 셋과 기기 알림을 낸다.
// '홈'은 대기열을 비운 뒤, 첫 활동이고 끝 시도가 없으면 세션 행을 지우게 서버에 알리고 홈으로 간다(AC-2e).
// 쓰기 4~5(plan-p11b 값 7 · 9): 과제 · 문장 쓰기(확인은 서버 액션이 AI 결과와 함께 끝 시도를 저장 — 틀은 대기열에 넣지 않고 다음 활동으로,
// 고친 문장은 진행 시도로) · 내 문장 듣고 따라 말하기(마이크를 쓸 수 없으면 건너뜀). 1-가 하루 안전 상한(C50 (2) · C80)이면 열 때 · 도중에
// '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 큰 '홈' · 작은 '다시 해 볼래요'(세션은 진행, UI · UX 묶음 0-가 [승인 UX4]). 막힌 안내는
// 끝내기 실패보다 먼저 보인다('홈'이 늘 있게). 마이크 막힘은 막힘 판(큰 '다시 해 볼래요' · 작은 '홈' — [승인 UX3]).
// 쓰기 6~12 첫 세션(plan-p11b 값 7 · 9): 과제 · 생각 꺼내기(턴마다 서버 액션이 시도를 저장) · 초고(자동 저장은 진행 시도로 대기열에,
// '다 썼어요'는 대기열을 비운 뒤 초고 제출 서버 액션이 세션을 끝냄 — finishSession 을 부르지 않음) → 결과.
// 쓰기 6~12 둘째 세션(plan-p11b 값 7 · 9 · 11): 칭찬 → 교정 하나씩 → 고쳐 쓰기(서버 액션이 끝 시도 저장 · 모범 답안을 돌려줌) → 모범 답안
// (빈 글이면 건너뜀) → 내 글 소리 내어 읽기(마이크를 쓸 수 없으면 건너뜀) → finishSession(점수 없음).
// 화면 꼴(UI · UX 묶음 5-가 · spec 설계 5.4 세션 행 · D-1 · D-7 · D-10 · D-13): 위 띠 아래 큰 판 하나(영역 색 FamilyBoard — 판 아래 끝 = 보는
// 창 아래 끝), 판 맨 위에 활동 묶음 막대(묶음 이름 · 지금 자리 — 점 대신, core/session/progress), 틀의 '다음' 큰 단추는 판 안 아래(mt-auto).
// 막힘 · 쉼은 같은 판 안 가운데(막힘 판 · 쉬는 안내 fill). 활동 흐름 · 시도 저장 · 돌아갈 길(router.refresh · 같은 활동)은 그대로다.
// 가르치는 수업(teach 칸이 있는 수업 — 가르치고 배우는 수업 plan 묶음 라-2 · 정한 것 1 · 2 · 3 · 16 · 델타 spec 설계 1 · 4 · 5 · 10, 장부 L-34):
// 오늘 배울 것 · 새 단어 · 본보기 · 같이 해 보기에 라-1 자리 조각을 고르고, 위 띠에 자리 이름(teach-line TEACH_SLOT_NAME), 진행 막대는 자리
// 묶음이다. 혼자 해 보기 첫 화면 · 첫 짝 화면에만 초상과 앱 문구 한 줄. 끝 시도는 판 2(INPUT_VERSION)이고 짝 시도는 base 꼴 + slot "spare".
// 낼 짝은 서버가 센 혼자 첫 시도 결과(view.spares.outcomes)와 이 기기에서 낸 첫 끝 시도 결과를 합쳐 고르고(teach-frame spareChoiceOnDevice),
// 이어 할 자리는 내지 않을 짝을 건너뛴다(resumePointOf 셋째 인자). 조각이 알리는 선생님 줄 끝({ notice })을 세어 한 세션에서 두 번째 안내부터
// 아이패드 사파리에 무음 모드 줄(C111 문구)을 더한다. 읽기 도움(지문 · 짝 글마다 읽어 주기 · 뜻 보기)은 기기 입력 저장소에 모아 첫 답의 aid 로
// 보낸다.
// 말하기 가르치는 수업(묶음 라-3 · plan 정한 것 5 · 6 · 7 · 델타 spec 설계 1 · 5 · 8 · 10): 같이 해 보기 말하기(누가 자리 고르기 · 같이 말하기 · 틀만
// 보고 말하기)와 짝(질문 → 듣기 → 문장 → 낱말 차례, 앱 판정)을 기록 활동에 넣고, 혼자 문항 조각에 '왜' · 끊어 들려주기 · 천천히 읽기 · 이야기
// 화면을 잇는다. 3단계부터의 혼자 질문 답은 서버 액션 evaluateSpeakingAnswer(AI — 끝 시도는 서버가 저장, '같이 말해 볼까요' 뒤 말은 같은
// 시도 id 로 다시 불러 서버가 그 끝 시도 행에 합침)이고, 'AI 쉬는 중'(열 때 화면 자료 aiQuestionsResting 또는 판정 응답 ai_resting)이면 남은 혼자 질문을 그 앞 이야기 화면과
// 함께 건너뜀 끝 시도(skipped ai_rest)로 넣고 세션을 끝까지 한다(7절 말하기 3~8 예외 — 쉬는 안내 판 없음, 그 짝도 내지 않음).
// 선생님 고르기(묶음 마-2 · 델타 spec 설계 4 [L3 · C177] · 정본 AC-3i): 가르치는 수업이고 집에 고른 선생님이 없으면 여는 차례의 막힘 · 쉼(말하기는
// 마이크 못 씀) 뒤, 오늘 배울 것 앞에 회화의 '선생님을 골라요' 조각(TeacherChoice)을 그대로 보인다. 저장은 회화의 chooseTeacher 액션이고, 고른 뒤
// router.refresh 로 화면 자료(teaching — 고른 선생님)를 다시 읽어 오늘 배울 것으로 간다. 활동 · 시도 · 지금 활동 번호는 바뀌지 않는다(활동이 아님).
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  NewWordsPreview,
  type PictureLookup,
} from "@/components/activities/common";
import {
  ListeningItem,
  PictureTask,
  PresentationTask,
  RepeatItem,
  SpeakingQuestion,
} from "@/components/activities/speaking";
import {
  WritingComposition,
  WritingGuidedSentence,
  WritingGuidedTask,
  WritingItem,
} from "@/components/activities/writing";
import { TogetherCards } from "@/components/answer/tiles";
import {
  BigButton,
  ChildScreen,
  PaperBand,
  SmallButton,
  StatusLine,
} from "@/components/board/board";
import { ActivityProgress } from "@/components/session/activity-progress";
import { AiRest, useAiRestRetry } from "@/components/session/ai-rest";
import { FamilyBoard } from "@/components/session/family-board";
import {
  MIC_BLOCKED_TEXT,
  MicBlockedPanel,
  useIpadSafari,
} from "@/components/session/mic-blocked";
import {
  PassageActivity,
  type PassageInput,
  QuestionActivity,
  type QuestionInput,
  ReadingTogetherChoices,
  type TogetherMark,
} from "@/components/session/reading";
import {
  JudgedQuestionActivity,
  type JudgedQuestionInput,
  ListeningActivity,
  type ListeningInput,
  MicNotice,
  QuestionAnswerActivity,
  type QuestionAnswerInput,
  RepeatActivity,
  type RepeatInput,
  type SpeakingEnv,
  type SpeakingTeach,
  SpeakingTogetherInput,
} from "@/components/session/speaking";
import {
  ModelScreen,
  type NewWordCard,
  NewWordsScreen,
} from "@/components/session/teach/show";
import { FirstLine } from "@/components/session/teach/spare-intro";
import type { TeachLineEnd } from "@/components/session/teach/teacher-line";
import { TodayScreen } from "@/components/session/teach/today";
import {
  TogetherFrame,
  type TogetherReaction,
} from "@/components/session/teach/together";
import {
  CompositionTaskActivity,
  DraftActivity,
  type DraftInput,
  ThinkoutActivity,
  type ThinkoutInput,
} from "@/components/session/writing-composition";
import {
  type GuidedInput,
  GuidedTaskActivity,
  GuidedWritingActivity,
  OwnRepeatActivity,
} from "@/components/session/writing-guided";
import {
  WritingItemActivity,
  type WritingItemInput,
} from "@/components/session/writing-items";
import {
  FeedbackCorrectionActivity,
  FeedbackPraiseActivity,
  ModelAnswerActivity,
  REWRITE_TEXT,
  RewriteActivity,
  type RewriteInput,
  sentencesOf,
} from "@/components/session/writing-rewrite";
import { TeacherChoice } from "@/components/teacher/teacher-choice";
import {
  INPUT_VERSION,
  type OutcomeContext,
  resumePointOf,
} from "@/core/session/attempt";
import type { Activity, ActivityKind } from "@/core/session/preview";
import { activityGroupsOf } from "@/core/session/progress";
import { outcomeContextOf, type SpareChoice } from "@/core/session/spares";
import {
  aidOf,
  aidUsed,
  aiRestSkipsOf,
  chunksOf,
  firstActivityOfSlot,
  openingScreenOf,
  PASSAGE_AID_KEY,
  progressHiddenOf,
  type ReadingAids,
  readingAidsFrom,
  savedQuestionInputOf,
  slowRateOf,
  spareAidKey,
  spareChoiceOnDevice,
  TEACH_NOTICES_START,
  type TeachNotices,
  type TogetherTry,
  teachNoticesAfter,
  teachSlotAt,
  togetherTryRight,
} from "@/core/session/teach-frame";
import { TEACH_SLOT_NAME } from "@/core/session/teach-line";
import {
  type SpeechEvent,
  type SpeechVerdict,
  speakingCounters,
  speakingCountersStart,
} from "@/core/speaking/judge";
import { speakRateOf } from "@/core/speech/pace";
import type { TeacherView } from "@/core/teacher/roster";
import { type AttemptQueue, createAttemptQueue } from "@/lib/attempt-queue";
import {
  markMicNoticeSeen,
  markMicUnavailable,
  micNoticeSeen,
  micUsable,
  readDeviceVerdict,
} from "@/lib/mic-state";
import { createSessionInputStore } from "@/lib/session-input";
import { createBrowserSpeech } from "@/lib/speech/browser";
import { pacedSpeech } from "@/lib/speech/paced";
import type { SpeechPort } from "@/lib/speech/types";
import {
  finishSession,
  leaveSession,
  recheckAiRest,
  reportSessionMic,
  saveAttempts,
} from "@/server/actions/session";
import { evaluateSpeakingAnswer } from "@/server/actions/speaking";
import {
  checkGuidedWriting,
  submitDraft,
  submitRewrite,
  thinkoutNext,
} from "@/server/actions/writing";
import type { SessionView } from "@/server/session";

/** 화면 글(4절 · 7절 네트워크 행 · 정본 밖 문구 표 세션 틀 행). */
const TEXT = {
  next: "다음",
  home: "홈",
  levelUnit: (level: number, unit: number) => `${level}단계 · 단원 ${unit}`,
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  failed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
  /** 막힌 안내 셋(7절 '마이크를 쓸 수 없음' · '오류' · '감시 타이머' 행 · C22). */
  blocked: {
    needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
    stalled: "마이크가 잘 안 돼요. 부모님께 말해 주세요",
    silent: "말소리가 잘 안 들려요. 부모님께 말해 주세요",
  },
} as const;

type Blocked = keyof typeof TEXT.blocked;
/** 말로 답하는 활동(처음 마이크 안내를 그 앞에 둔다). */
const SPOKEN_KINDS: ReadonlySet<ActivityKind> = new Set([
  "repeat-word",
  "repeat-sentence",
  "question",
  "writing-own-repeat",
  "own-speak",
]);

/** 끝 시도를 보내는 활동(차례 2 읽기 · 차례 3 쓰기 1~3 · 차례 4 말하기 1~2 · 차례 5 쓰기 4~5 · 말하기 질문 답 AI 판정 — 가르치고 라-3). 그 밖은 아직 보기만(b · c 가 더한다). */
const RECORDED_KINDS: ReadonlySet<ActivityKind> = new Set([
  // 가르치는 수업 자리(라-2 — 오늘 배울 것 · 본보기는 세 영역 같은 조각, 같이 해 보기 · 짝은 TEACH_INPUT_AREAS)
  "today",
  "model",
  "preview",
  "reading-passage",
  "reading-question",
  "writing-item",
  "repeat-word",
  "repeat-sentence",
  "listening",
  "question",
  "writing-task",
  "writing-guided",
  "writing-own-repeat",
  "thinkout",
  "draft",
  "feedback-praise",
  "feedback-correction",
  "rewrite",
  "model-answer",
  "own-speak",
]);

/** 같이 해 보기 · 짝을 이 화면이 받는 영역(말하기는 라-3 이 붙였다). */
const TEACH_INPUT_AREAS: ReadonlySet<string> = new Set([
  "reading",
  "writing",
  "speaking",
]);
/** 기기 입력 저장소에서 읽기 도움을 두는 자리(활동 번호는 1부터라 0 은 세션 몫으로 쓴다). */
const READING_AID_SLOT = 0;
const MS_PER_SECOND = 1000;

function storageOrUndefined(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** 보기만 하는 활동 몸통(P5b 표시 조각). 미리보기와 아직 상호작용이 없는 활동. */
function DisplayBody({
  view,
  activity,
  pictures,
}: {
  view: SessionView;
  activity: Activity;
  pictures: PictureLookup;
}) {
  switch (activity.kind) {
    case "preview":
      return (
        <NewWordsPreview
          entries={view.preview.map(({ word, meaningKo, example }) => ({
            word,
            meaningKo,
            example,
          }))}
        />
      );
    case "writing-item": {
      if (view.area !== "writing" || view.lesson.content.shape !== "items")
        return null;
      const item = view.lesson.content.items[activity.index];
      return item ? <WritingItem item={item} pictures={pictures} /> : null;
    }
    case "writing-task":
      if (view.area !== "writing" || view.lesson.content.shape !== "guided")
        return null;
      return (
        <WritingGuidedTask
          task={view.lesson.content.task}
          example={view.lesson.content.example}
        />
      );
    // 쓰기 4~12 · 말하기 활동은 b · c · 차례 3 · 4 가 상호작용을 붙일 때까지 P10 자리 표시 그대로(보기만)
    case "writing-guided":
      if (view.area !== "writing" || view.lesson.content.shape !== "guided")
        return null;
      return (
        <>
          {view.lesson.content.sentences.map((sentence, i) => (
            <WritingGuidedSentence
              // 같은 틀이 두 번 나올 수 있어 문장 번호가 열쇠다(검토 review-p11-1-code M-5)
              // biome-ignore lint/suspicious/noArrayIndexKey: 시드 문장 차례가 곧 자리다
              key={i}
              frame={sentence.frame}
              wordBox={sentence.wordBox}
            />
          ))}
        </>
      );
    case "draft":
      if (
        view.area !== "writing" ||
        view.lesson.content.shape !== "composition"
      )
        return null;
      return (
        <WritingComposition
          task={view.lesson.content.task}
          example={view.lesson.content.example}
          hints={view.lesson.content.hints}
        />
      );
    case "repeat-word":
    case "repeat-sentence": {
      if (view.area !== "speaking") return null;
      const { repeat } = view.lesson.content;
      const text =
        activity.kind === "repeat-word"
          ? repeat.words[activity.index]
          : repeat.sentences[activity.index];
      return text ? <RepeatItem text={text} /> : null;
    }
    case "listening": {
      if (view.area !== "speaking") return null;
      const item = view.lesson.content.listening[activity.index];
      return item ? <ListeningItem item={item} pictures={pictures} /> : null;
    }
    case "question": {
      if (view.area !== "speaking") return null;
      const question = view.lesson.content.questions[activity.index];
      return question ? (
        <SpeakingQuestion question={question} showKo={view.showKo} />
      ) : null;
    }
    case "picture-task":
      if (view.area !== "speaking" || !view.lesson.content.pictureTask)
        return null;
      return (
        <PictureTask
          task={view.lesson.content.pictureTask}
          pictures={pictures}
        />
      );
    case "presentation":
      if (view.area !== "speaking" || !view.lesson.content.presentation)
        return null;
      return (
        <PresentationTask
          topic={view.lesson.content.presentation.topic}
          prepWords={view.lesson.content.presentation.prepWords}
        />
      );
    default:
      // b · c 몫 활동(자리 표시 없음)
      return null;
  }
}

/**
 * 같이 해 보기 한 문항(델타 spec 설계 1 '같이 해 보기의 꼴과 수' · 5 화면 표, 표본 R6 · R7 · W6 · W7 · S5~S7): 라-1 같이 해 보기 틀 안에 영역 입력(읽기 보기
 * 둘 · 쓰기 남은 카드와 대문자 단추 · 말하기 누가 자리 고르기와 말하기 단추 — 묶음 라-3)을 붙인다. 시도마다 공용 함수(togetherTryRight)로 정오를 보고, 맞으면 rightKo 를 읽으며 칭찬 표지를
 * talk.teacher_praise_seconds 동안 켠 뒤(둘 다 끝나면) 넘어가고, 틀리면 wrongKo 를 읽고 맞힐 때까지 다시 한다(연습 — 점수 · 정오 · 근거 밖).
 * 끝 시도는 { index, tries }(쓰기는 빈칸 차례 카드, 대문자 단추는 빈 시도 — L-34 계약).
 */
function TogetherSlot({
  view,
  activity,
  ctx,
  teacher,
  praiseSeconds,
  speech,
  env,
  onLineEnd,
  onComplete,
}: {
  view: SessionView;
  activity: Extract<Activity, { kind: "together" }>;
  ctx: OutcomeContext;
  teacher: TeacherView | null;
  praiseSeconds: number;
  speech: SpeechPort | undefined;
  /** 말하기 같이 해 보기의 듣기 자료(인식 셈은 틀의 것 — 묶음 라-3). */
  env?: SpeakingEnv;
  onLineEnd: (end: TeachLineEnd) => void;
  onComplete: (tries: TogetherTry[]) => void;
}) {
  const [tries, setTries] = useState<TogetherTry[]>([]);
  const [lineDone, setLineDone] = useState(false);
  const [praiseDone, setPraiseDone] = useState(false);
  const sent = useRef(false);
  const rightOf = (attempt: TogetherTry) =>
    togetherTryRight(activity, view.lesson, attempt, ctx);
  const last = tries.at(-1);
  const lastRight = last !== undefined && rightOf(last);
  const wrongTries = tries.filter((t) => !rightOf(t)).length;
  const item = view.lesson.teach?.together[activity.index];
  const reaction: TogetherReaction | undefined =
    last === undefined || !item
      ? undefined
      : lastRight
        ? { kind: "right", ko: item.rightKo }
        : { kind: "wrong", ko: item.wrongKo };

  // 맞음: 칭찬 표지 시간이 지나야 넘어간다(소리 없이 바로 끝난 줄에서도 맞음 반응을 볼 틈)
  useEffect(() => {
    if (!lastRight) return;
    const timer = setTimeout(
      () => setPraiseDone(true),
      praiseSeconds * MS_PER_SECOND,
    );
    return () => clearTimeout(timer);
  }, [lastRight, praiseSeconds]);
  useEffect(() => {
    if (!lastRight || !lineDone || !praiseDone || sent.current) return;
    sent.current = true;
    onComplete(tries);
  });

  const add = (attempt: TogetherTry) => {
    if (lastRight) return;
    speech?.unlockFromGesture();
    setLineDone(false);
    setTries([...tries, attempt]);
  };
  let input: React.ReactNode = null;
  let data: Parameters<typeof TogetherFrame>[0]["data"] = {};
  if (view.area === "reading") {
    const t = view.lesson.teach?.together[activity.index];
    if (t) {
      const marks: Record<number, TogetherMark> = {};
      for (const attempt of tries)
        if (attempt.choice !== undefined)
          marks[attempt.choice] = rightOf(attempt) ? "right" : "wrong";
      data = {
        lineKo: t.lineKo,
        textEn: t.textEn,
        highlight: t.highlight,
        prompt: t.prompt,
        askRole: t.askRole,
      };
      input = (
        <ReadingTogetherChoices
          choices={t.choices}
          marks={marks}
          disabled={lastRight}
          onPick={(no) => add({ choice: no })}
        />
      );
    }
  } else if (view.area === "writing") {
    const t = view.lesson.teach?.together[activity.index];
    if (t) {
      data = {
        lineKo: t.lineKo,
        meaningKo: "meaningKo" in t ? t.meaningKo : undefined,
      };
      input = t.filled ? (
        // 틀리면 카드가 돌아오고 다시 놓는다(틀이 새로 그림), 맞으면 놓인 채 남는다
        <TogetherCards
          cards={t.filled.cards}
          choices={t.choices ?? []}
          capital={t.filled.capital}
          capitalOnly={t.slot === "capital"}
          disabled={lastRight}
          onTry={(attempt) =>
            add(attempt.pieces ? { pieces: attempt.pieces } : {})
          }
        />
      ) : null;
    }
  } else if (view.area === "speaking" && env) {
    const t = view.lesson.teach?.together[activity.index];
    if (t) {
      data = {
        lineKo: t.lineKo,
        storyEn: t.storyEn,
        questionEn: t.en,
        questionKo: t.ko,
        prompt: t.filled,
      };
      input = (
        <SpeakingTogetherInput
          item={t}
          env={env}
          tries={tries}
          choiceRight={(no) => rightOf({ choice: no })}
          tryRight={rightOf}
          lineDone={lineDone}
          teacher={teacher}
          onTry={add}
          onSkip={() => {
            // 인식이 끝내 안 되면 그때까지의 시도로 끝낸다(연습 — 점수 · 근거 밖)
            if (sent.current) return;
            sent.current = true;
            onComplete(tries);
          }}
        />
      );
    }
  }
  return (
    <TogetherFrame
      // 틀릴 때마다 새로 그려 반응 줄을 다시 읽고(같은 wrongKo 도) 카드 · 보기 입력이 처음으로 돌아간다. 맞음은 반응 글이 바뀌어 그 줄을 읽고,
      // 놓인 카드는 그대로 남는다
      key={wrongTries}
      data={data}
      reaction={reaction}
      teacher={teacher}
      speech={speech}
      speechSettings={view.config.speech}
      praise={lastRight && !praiseDone}
      onLineEnd={(end) => {
        onLineEnd(end);
        // 줄이 멈춘 때(처음 줄 · 반응 모두 — 말하기는 틀린 말 반응 뒤 바른 답을 들려준다). 넘어가기는 맞음일 때만(아래 효과)
        setLineDone(true);
      }}
    >
      {input}
    </TogetherFrame>
  );
}

export function SessionFrame({ view }: { view: SessionView }) {
  const router = useRouter();
  const [current, setCurrent] = useState(view.current);
  const [finals, setFinals] = useState<ReadonlySet<number>>(
    () => new Set(view.finals),
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  /** 끝내기가 막혀 다시 해야 하는가('다음'과 online 이 다시 부른다). */
  const [finishPending, setFinishPending] = useState(false);
  const [speech, setSpeech] = useState<SpeechPort | undefined>();
  const queue = useRef<AttemptQueue | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);
  const finishing = useRef(false);
  const inputs = useMemo(
    () =>
      createSessionInputStore(
        typeof window === "undefined" ? undefined : storageOrUndefined(),
      ),
    [],
  );
  // 하이드레이션 끝 표시(e2e 가 누르기 전에 기다린다) — 기기 저장소의 활동 안 입력은 그 뒤에만 읽는다(서버 그림과 같게)
  const [hydrated, setHydrated] = useState(false);
  const total = view.activities.length;
  const activity = view.activities[current - 1];
  // 질문 답은 1~2단계 앱 판정 · 3단계부터 AI 판정(서버 액션 — 가르치고 라-3 이 plan-p11c 질문 답 몫을 당김), 과제는 쓰기 4~5 · 6~12 첫 세션,
  // 같이 해 보기 · 짝은 세 영역(라-2 · 라-3)
  const recorded = (a: Activity) =>
    a.kind === "together" || a.kind === "spare"
      ? TEACH_INPUT_AREAS.has(view.area)
      : RECORDED_KINDS.has(a.kind) &&
        (a.kind !== "writing-task" ||
          view.guided !== null ||
          view.composition !== null);
  // ── 가르치는 수업(라-2) ──
  const teaching = view.teaching;
  /** 짝 고르기 · 같이 해 보기 판정 맥락(기기 — 서버 scoringOf 와 같은 outcomeContextOf). */
  const outcomeCtx = useMemo(
    () => (view.teaching ? outcomeContextOf(view) : undefined),
    [view],
  );
  /** 이 기기에서 낸 끝 시도(대기열에 남은 것 + 이 화면에서 낸 것, 낸 차례) — 짝 고르기의 기기 몫. */
  const localAttempts = useRef<{ activityNo: number; input: unknown }[]>([]);
  /** 낼 짝 · 내지 않을 짝(서버 값으로 시작해 이 기기 결과를 합쳐 다시 고름). */
  const [spareChoice, setSpareChoice] = useState<SpareChoice | undefined>(
    view.spares
      ? { show: view.spares.show, skip: view.spares.skip }
      : undefined,
  );
  const [notices, setNotices] = useState<TeachNotices>(TEACH_NOTICES_START);
  const onLineEnd = (end: TeachLineEnd) =>
    setNotices((before) => teachNoticesAfter(before, end));
  /** 글마다 읽기 도움(지문 · 짝 글 — 기기 입력 저장소 세션 몫 자리에 둠). */
  const aids = useRef<ReadingAids>({});
  function recordAid(
    key: string,
    use: { readAloud: true } | { gloss: string },
  ) {
    aids.current = aidUsed(aids.current, key, use);
    inputs.write(view.sessionId, READING_AID_SLOT, aids.current);
  }
  /** 낼 짝(L-34 서버 값 합치기). 고를 수 없으면(짝 없는 수업 · 맥락 오류) undefined — 부르는 쪽이 앞 값을 쓴다. */
  function deviceSpares(): SpareChoice | undefined {
    if (!view.spares || !outcomeCtx) return undefined;
    try {
      return spareChoiceOnDevice({
        activities: view.activities,
        lesson: view.lesson,
        server: view.spares,
        attempts: localAttempts.current,
        ctx: outcomeCtx,
      });
    } catch {
      return undefined;
    }
  }
  const allRecorded = view.activities.every(recorded);
  const [blocked, setBlocked] = useState<Blocked | undefined>();
  const ipadSafari = useIpadSafari();
  /** 1-가 하루 안전 상한 — 열 때(서버 화면 자료) · 쓰기 확인 도중(서버 액션)에 켜진다. */
  const [resting, setResting] = useState(view.aiResting);
  /** 말하기 AI 판정 질문을 건너뛸 때인가('AI 쉬는 중' — 열 때 화면 자료 · 판정 응답 ai_resting, 설계 10). 세션은 끝까지 한다. */
  const [aiQuestionsResting, setAiQuestionsResting] = useState(
    view.aiQuestionsResting,
  );
  // 쉬는 화면 '다시 해 볼래요'([승인 UX4] · N-5): 같은 판정 함수를 다시 읽어 풀리면 같은 활동으로(세션은 진행으로 남아 있다 — 서버 화면
  // 자료도 다시 읽는다)
  const restRetry = useAiRestRetry({
    recheck: recheckAiRest,
    onReleased: () => {
      setResting(false);
      router.refresh();
    },
  });
  /** 내 문장 듣고 따라 말하기의 문장(확인을 낸 뒤 — 고쳤으면 고친 문장). */
  const [ownSentences, setOwnSentences] = useState<string[] | null>(
    view.guided?.sentences ?? null,
  );
  const [noticeSeen, setNoticeSeen] = useState(true);
  /** 쓰기 6~12: 생각 꺼내기 결과(초고 화면이 씀 — 서버 화면 자료 또는 방금 끝낸 턴). */
  const [thinkoutResult, setThinkoutResult] = useState(
    view.composition?.thinkout ?? null,
  );
  /** 쓰기 둘째 세션: 낸 고쳐 쓰기 글 · 모범 답안(서버 화면 자료 또는 방금 낸 것 — 낸 뒤에만 있음). */
  const [rewritten, setRewritten] = useState<{
    text: string;
    modelAnswer: string | null;
  } | null>(
    view.rewrite?.rewriteText
      ? {
          text: view.rewrite.rewriteText,
          modelAnswer: view.rewrite.modelAnswer,
        }
      : null,
  );
  /** 초고 조각이 맡긴 '홈' 앞 저장. */
  const draftFlush = useRef<(() => void) | undefined>(undefined);
  const counters = useRef(speakingCountersStart());
  const limits = {
    maxRetries: view.config.maxRetries,
    silentItemsMax: view.config.silentItemsMax,
  };

  // 말하기 세션: 마이크를 쓸 수 없는 기기면 막힌 안내(세션은 진행으로 남음), 처음 마이크 안내를 봤는지(기기마다 한 번 — 쓰기
  // '내 문장 듣고 따라 말하기'도 같은 안내를 쓴다. 쓰기는 마이크가 없어도 막지 않고 그 활동만 건너뛴다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 세션을 열 때 한 번만 본다
  useEffect(() => {
    if (view.area === "reading") return;
    if (view.area === "speaking" && !micUsable()) setBlocked("needsMic");
    setNoticeSeen(micNoticeSeen());
  }, []);

  /** 기기 알림(코드 · 브라우저 이름만 — 인식 글 없음). 닿지 않아도 화면은 그대로 막힌 안내다. */
  function report(
    kind: "mic_unavailable" | "mic_stalled" | "speech_silent",
    code: string,
  ) {
    void reportSessionMic({
      kind,
      code: code || kind,
      browser: readDeviceVerdict().name,
    }).catch(() => {});
  }

  /** 인식 결과를 셈에 넣는다(7절 오류 행 · C22). 막힌 판정이면 안내 · 알림, 판정을 조각에 돌려준다. */
  function onSpeech(event: SpeechEvent): SpeechVerdict {
    const step = speakingCounters(counters.current, event, limits);
    counters.current = step.state;
    const code =
      event.type === "error"
        ? event.code
        : event.type === "stalled"
          ? "stalled"
          : event.type === "no-result" || event.type === "heard"
            ? "no-result"
            : "";
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

  // 기기 대기열(8절): 남은 시도를 먼저 보내고, 다시 연결되면 또 보낸다. 대기열의 끝 시도를 합쳐 이어 할 자리를 다시 센다
  // biome-ignore lint/correctness/useExhaustiveDependencies: 세션 하나에 한 번만 만든다
  useEffect(() => {
    const created = createAttemptQueue({
      storage: storageOrUndefined(),
      send: async (batch) => {
        const out = await saveAttempts(batch);
        if (!out.ok) throw new Error(out.reason);
        return { accepted: out.accepted, rejected: out.rejected };
      },
      onlineTarget: window,
    });
    queue.current = created;
    // 이 기기의 활동 안 입력에서 그 프로필의 진행 세션이 아닌 줄을 지운다(검토 review-p11-2-code M-1)
    inputs.prune(view.openSessionIds);
    const merged = new Set([...view.finals, ...created.finals(view.sessionId)]);
    setFinals(merged);
    // 가르치는 수업: 대기열에 남은 이 세션 시도 · 읽기 도움을 되살리고, 서버 결과와 합쳐 낼 짝을 다시 고른다(L-34)
    localAttempts.current = created
      .pending()
      .filter((a) => a.sessionId === view.sessionId)
      .map(({ activityNo, input }) => ({ activityNo, input }));
    aids.current = readingAidsFrom(
      inputs.read(view.sessionId, READING_AID_SLOT),
    );
    const choice = deviceSpares() ?? spareChoice;
    setSpareChoice(choice);
    const point = resumePointOf(view.activities, merged, choice?.skip ?? []);
    if ("next" in point) setCurrent(point.next);
    setHydrated(true);
    void created.flush();
    if ("done" in point && allRecorded) void finish();
    return () => created.dispose();
  }, []);

  // 음성 접점은 렌더 뒤에 만든다(SpeechPort.device 는 useEffect 에서만, P2b). 읽기 지문 읽어 주기 · 말하기 들려주기는 문장마다
  // 단계 구간 빠르기로 읽고 문장 사이에 쉰다(C125 — 쓰기는 그대로)
  useEffect(() => {
    const created = createBrowserSpeech({ settings: view.config.speech });
    setSpeech(
      view.area === "writing"
        ? created
        : pacedSpeech(created, {
            rate: speakRateOf(view.level, view.config.speech),
            pauseMs: view.config.speech.sentencePauseMs,
          }),
    );
    return () => created.dispose();
  }, [view.config.speech, view.area, view.level]);

  // 끝내기가 막혔으면 다시 연결될 때 다시 해 본다(7절 네트워크 행)
  // biome-ignore lint/correctness/useExhaustiveDependencies: finish 는 매 그림 새로 만들어진다
  useEffect(() => {
    if (!finishPending) return;
    const again = () => void finish();
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [finishPending]);

  // 쓰기 '내 문장 듣고 따라 말하기' · '내 글 소리 내어 읽기'(선택): 마이크를 쓸 수 없는 기기면 건너뛰고(쓰기 세션은 막지 않음),
  // 문장이 없으면(다른 기기에서 냈고 글이 아직 닿지 않음 등) 빈 끝 시도로 넘어간다(plan-p11a 정할 것 마 (6)). 모범 답안이 빈 글이면
  // 그 활동을 건너뛴다(값 3 — 걸린 칸 바꾸기 뒤 빈 모범 답안은 보이지 않는다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 그 활동에 들어올 때 한 번 본다
  useEffect(() => {
    if (!hydrated) return;
    if (activity?.kind === "model-answer" && !rewritten?.modelAnswer) {
      complete({});
      return;
    }
    const spoken =
      activity?.kind === "writing-own-repeat"
        ? ownSentences
        : activity?.kind === "own-speak"
          ? rewritten
            ? sentencesOf(rewritten.text)
            : null
          : undefined;
    if (spoken === undefined) return;
    if (!micUsable()) complete({ skipped: "no_mic" });
    else if (!spoken || spoken.length === 0) complete({});
  }, [hydrated, current]);

  // 'AI 쉬는 중'을 열 때 알았으면 AI 판정 혼자 질문에 닿을 때 그 앞 이야기 화면과 함께 건너뛴다(설계 10 — 응답 ai_resting 은 조각이 알린다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 그 활동에 들어올 때 한 번 본다
  useEffect(() => {
    if (!hydrated || !aiQuestionsResting || view.appJudged) return;
    if (activity?.kind === "question") skipAiQuestions();
  }, [hydrated, current]);

  // 활동이 바뀌면 활동 카드로 초점을 옮긴다(보조 기술이 새 활동을 읽게)
  useEffect(() => {
    if (current > 0) cardRef.current?.focus();
  }, [current]);

  const pictures: PictureLookup = {
    ofWord: (word) =>
      view.wordPictures[word] ?? { meaningKo: word, catalogued: false },
    ofKey: (key) =>
      view.keyPictures[key] ?? { meaningKo: key, catalogued: false },
  };

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    setStatus("");
    try {
      let out: Awaited<ReturnType<typeof finishSession>> | undefined;
      for (let round = 0; round < 2; round += 1) {
        await queue.current?.idle();
        await queue.current?.flush();
        try {
          out = await finishSession({ sessionId: view.sessionId });
        } catch {
          out = undefined;
        }
        if (out?.ok || out?.reason !== "incomplete") break;
      }
      if (out?.ok) {
        inputs.clear(view.sessionId);
        router.push(`/result/${view.sessionId}`);
        return;
      }
      if (
        out?.reason === "incomplete" &&
        (queue.current?.finals(view.sessionId).length ?? 0) === 0
      ) {
        // 이 기기에도 없는 활동(다른 기기에서 하다 만 것) — 그 활동에서 다시
        const missing = new Set(out.missing);
        setFinals(
          (before) => new Set([...before].filter((n) => !missing.has(n))),
        );
        setCurrent(out.missing[0] ?? current);
        setFinishPending(false);
        return;
      }
      if (
        out &&
        !out.ok &&
        ["not_found", "closed", "invalid", "no_profile"].includes(out.reason)
      ) {
        inputs.clear(view.sessionId);
        router.push(`/${view.area}/lessons`);
        return;
      }
      setStatus(navigator.onLine ? TEXT.failed : TEXT.offline);
      setFinishPending(true);
    } finally {
      finishing.current = false;
      setBusy(false);
    }
  }

  /**
   * 활동 끝: 끝 시도를 대기열에 넣고(저장소에 바로 쌓임 — 보내기는 기다리지 않음) 끝 시도가 없는 가장 앞 활동으로. 시도 꼴은 판 2
   * (INPUT_VERSION — 판 2 전용 종류 · 칸이 거부되지 않게, UI · UX 5-나 요청 1)이고, 짝은 base 종류 꼴에 slot "spare" 를 단다(정한 것 2).
   */
  function complete(content: Record<string, unknown>) {
    if (!activity) return;
    const spare = activity.kind === "spare";
    const input = {
      v: INPUT_VERSION,
      kind: spare ? activity.base : activity.kind,
      step: "final",
      ...(spare ? { slot: "spare" } : {}),
      ...content,
    };
    localAttempts.current.push({ activityNo: current, input });
    void queue.current?.add({
      clientAttemptId: crypto.randomUUID(),
      sessionId: view.sessionId,
      activityNo: current,
      input,
    });
    advance();
  }

  /**
   * 지금 활동을 끝낸 것으로 두고 다음으로(끝 시도는 complete 가 대기열에, AI 활동은 서버 액션이 이미 저장). also 는 함께 끝낸 것으로 둘 활동
   * (AI 쉬는 중에 건너뛴 질문 — 끝 시도는 부르는 쪽이 대기열에 넣었다).
   */
  function advance(also: readonly number[] = []) {
    const no = current;
    inputs.clear(view.sessionId, no);
    for (const n of also) inputs.clear(view.sessionId, n);
    // 새 활동 — 활동 몫 셈을 지운다(세션 몫 '여섯 번' · 말소리 없음 이어짐은 이어진다)
    counters.current = speakingCounters(
      counters.current,
      { type: "next-activity" },
      limits,
    ).state;
    const next = new Set(finals);
    next.add(no);
    for (const n of also) next.add(n);
    setFinals(next);
    // 내지 않을 짝은 끝난 것으로(혼자 해 보기를 막 끝냈으면 이 기기 첫 시도 결과를 합쳐 다시 고른 값 — L-34)
    const choice = deviceSpares() ?? spareChoice;
    if (choice) setSpareChoice(choice);
    const point = resumePointOf(view.activities, next, choice?.skip ?? []);
    if ("next" in point) {
      setCurrent(point.next);
      return;
    }
    void finish();
  }

  /**
   * 'AI 쉬는 중'(설계 10 · plan-p11c 값 4): 지금부터 남은 AI 판정 혼자 질문을 그 앞 이야기 화면과 함께 건너뜀 끝 시도(skipped ai_rest)로 대기열에
   * 넣고 다음 남은 활동으로(세션은 끝까지 — 7절 말하기 3~8 예외). 건너뛴 질문은 U 라 그 짝도 내지 않는다.
   */
  function skipAiQuestions() {
    setAiQuestionsResting(true);
    const skipped = aiRestSkipsOf(view.activities, finals, current);
    for (const activityNo of skipped) {
      const input = {
        v: INPUT_VERSION,
        kind: "question",
        step: "final",
        heard: [],
        failures: 0,
        skipped: "ai_rest",
      };
      localAttempts.current.push({ activityNo, input });
      void queue.current?.add({
        clientAttemptId: crypto.randomUUID(),
        sessionId: view.sessionId,
        activityNo,
        input,
      });
    }
    advance(skipped);
  }

  /** 아직 상호작용이 없는 활동의 '다음'(P10 그대로 — 시도 없음, 마지막 뒤 수업 목록으로, 세션은 진행으로 남음). */
  async function showNext() {
    if (current < total) {
      setCurrent(current + 1);
      return;
    }
    setBusy(true);
    await queue.current?.idle();
    router.push(`/${view.area}/lessons`);
  }

  async function onFrameNext() {
    if (busy) return;
    if (finishPending) {
      void finish();
      return;
    }
    if (activity?.kind === "preview") {
      // 첫 누름에서 뒤 활동의 읽기를 연다(iOS — 위험 8). 보인 단어는 그때 만난 것으로 기록한다(3.2, 정할 것 ㄹ)
      speech?.unlockFromGesture();
      complete({ shownWords: view.preview.map((w) => w.word) });
      return;
    }
    await showNext();
  }

  async function home() {
    setBusy(true);
    // 초고를 쓰던 중이면 마지막 글을 먼저 대기열에(plan-p11b 값 7 · 위험 3)
    draftFlush.current?.();
    try {
      await queue.current?.idle();
      await queue.current?.flush();
      await leaveSession({
        sessionId: view.sessionId,
        // 막힌 안내 · 안전 상한 안내의 '홈'은 세션을 진행으로 남긴다(7절 · C50 (2) — 첫 활동이어도 지우지 않음, 검토 review-p11-4-code M-1)
        onFirstActivity:
          !blocked && !resting && current === 1 && finals.size === 0,
      });
    } catch {
      // 닿지 않으면 세션은 진행으로 남는다(다음 목록 요청 · 오래 멈춤 닫기가 정리)
    }
    router.push("/");
  }

  const registerDraftFlush = useMemo(
    () => (flush: (() => void) | undefined) => {
      draftFlush.current = flush;
    },
    [],
  );
  const restored = hydrated
    ? (inputs.read(view.sessionId, current) as
        | Record<string, unknown>
        | undefined)
    : undefined;
  const save = (value: unknown) => inputs.write(view.sessionId, current, value);
  /** 말하기 조각이 함께 받는 것(인식 셈은 틀의 것 — 막힌 안내 · 알림). */
  const speakingEnv: SpeakingEnv = {
    speech,
    speechSettings: view.config.speech,
    level: view.level,
    homophones: view.homophones,
    onSpeech,
  };
  const micNotice = (
    <MicNotice
      onOk={() => {
        speech?.unlockFromGesture();
        markMicNoticeSeen();
        setNoticeSeen(true);
      }}
    />
  );
  /** 말로 답하는 활동인가(처음 마이크 안내를 그 앞에 둔다 — 짝은 base 종류로, 같이 해 보기는 말하기 영역). */
  const spokenActivity = (a: Activity) =>
    SPOKEN_KINDS.has(a.kind) ||
    (a.kind === "spare" && SPOKEN_KINDS.has(a.base)) ||
    (a.kind === "together" && view.area === "speaking");
  /** 말하기 가르치는 수업 조각의 자료(혼자 · 짝 — 묶음 라-3). 가르치는 수업이 아니면 undefined(지금 화면 그대로). */
  const speakingTeach = view.teaching
    ? (mode: "solo" | "spare"): SpeakingTeach => ({
        mode,
        teacher: view.teaching?.teacher ?? null,
        speechSettings: view.config.speech,
        onLineEnd,
      })
    : undefined;
  /** 듣기 이해의 가르치는 수업 자료: 답 덩어리 빠르기(speech.rate.<구간> × speech.slow_rate_factor) · 조각 사이 쉼. */
  const listeningTeach = (mode: "solo" | "spare") => ({
    ...(speakingTeach?.(mode) ?? {
      mode,
      teacher: null,
      speechSettings: view.config.speech,
    }),
    slowRate: slowRateOf(
      speakRateOf(view.level, view.config.speech),
      view.config.speaking.slowRateFactor,
    ),
    pauseMs: view.config.speech.sentencePauseMs,
  });

  let body: React.ReactNode = null;
  let ownButtons = false;
  const teachLesson = view.lesson.teach;
  /** 가르치는 수업 문항 · 짝 조각의 선생님 자료(초상 · 음성 설정 · 줄 끝 셈). */
  const teachLine = teaching
    ? {
        teacher: teaching.teacher,
        speechSettings: view.config.speech,
        onLineEnd,
      }
    : undefined;
  if (teaching && teachLesson && activity?.kind === "today") {
    ownButtons = true;
    body = (
      <TodayScreen
        today={{ todayKo: teachLesson.todayKo, todayEn: teachLesson.todayEn }}
        teacher={teaching.teacher}
        speech={speech}
        speechSettings={view.config.speech}
        onLineEnd={onLineEnd}
        onStart={() => complete({})}
      />
    );
  } else if (teaching && activity?.kind === "preview") {
    // 새 단어 카드(낱말 · 뜻 · 소리 · 그림 · parts 띄움, 예문 없음 — C170 (3))
    const cards: NewWordCard[] = view.preview.map(({ word, meaningKo }) => {
      const parts = view.lesson.preview.find((p) => p.word === word)?.parts;
      const picture = pictures.ofWord(word);
      return {
        word,
        meaningKo,
        ...(parts ? { parts } : {}),
        ...(picture.src ? { picture } : {}),
      };
    });
    ownButtons = true;
    body = (
      <NewWordsScreen
        cards={cards}
        teacher={teaching.teacher}
        speech={speech}
        speechSettings={view.config.speech}
        onLineEnd={onLineEnd}
        onNext={() => {
          speech?.unlockFromGesture();
          // 보인 단어는 그때 만난 것으로 기록한다(3.2, 정할 것 ㄹ)
          complete({ shownWords: view.preview.map((w) => w.word) });
        }}
      />
    );
  } else if (teaching && teachLesson && activity?.kind === "model") {
    const model = teachLesson.models[activity.index];
    const index = activity.index;
    if (model) {
      const picture = model.picture ? pictures.ofKey(model.picture) : undefined;
      ownButtons = true;
      body = (
        <ModelScreen
          model={model}
          picture={picture?.src ? picture : undefined}
          teacher={teaching.teacher}
          speech={speech}
          speechSettings={view.config.speech}
          onLineEnd={onLineEnd}
          onNext={() => complete({ index })}
        />
      );
    }
  } else if (
    teaching &&
    outcomeCtx &&
    activity?.kind === "together" &&
    TEACH_INPUT_AREAS.has(view.area)
  ) {
    const index = activity.index;
    ownButtons = true;
    // 말하기 같이 해 보기는 처음 마이크를 쓰는 자리라 그 앞에 마이크 안내(기기마다 한 번)
    body =
      view.area === "speaking" && !noticeSeen ? (
        micNotice
      ) : (
        <TogetherSlot
          view={view}
          activity={activity}
          ctx={outcomeCtx}
          teacher={teaching.teacher}
          praiseSeconds={teaching.praiseSeconds}
          speech={speech}
          {...(view.area === "speaking" ? { env: speakingEnv } : {})}
          onLineEnd={onLineEnd}
          onComplete={(tries) => complete({ index, tries })}
        />
      );
  } else if (
    teachLine &&
    activity?.kind === "spare" &&
    activity.base === "reading-question" &&
    view.area === "reading"
  ) {
    // 짝(다른 예시): 짝 글 + 빈칸 문장 + 보기(띠 없음), 처음 맞으면 '혼자 해냈어요!', 틀리면 바른 답과 '왜'(다시 없음)
    const spare = view.lesson.content.questions[activity.index]?.spare;
    const key = spareAidKey(current);
    if (spare) {
      ownButtons = true;
      body = (
        <QuestionActivity
          question={spare}
          passage={spare.textEn}
          pictures={pictures}
          speech={speech}
          initial={restored as QuestionInput | undefined}
          onChange={save}
          onDone={(input) => complete(input)}
          teach={{
            mode: "spare",
            ...teachLine,
            aidNow: () => aidOf(aids.current, key),
            onReadAloud: () => recordAid(key, { readAloud: true }),
          }}
        />
      );
    }
  } else if (
    teachLine &&
    activity?.kind === "spare" &&
    activity.base === "writing-item" &&
    view.area === "writing" &&
    view.lesson.content.shape === "items"
  ) {
    const spare = view.lesson.content.items[activity.index]?.spare;
    if (spare) {
      ownButtons = true;
      body = (
        <WritingItemActivity
          item={spare}
          level={view.level}
          pictures={pictures}
          speech={speech}
          initial={restored as WritingItemInput | undefined}
          onChange={save}
          onDone={(input) => complete(input)}
          teach={{ mode: "spare", ...teachLine }}
        />
      );
    }
  } else if (activity?.kind === "reading-passage" && view.area === "reading") {
    ownButtons = true;
    body = (
      <PassageActivity
        passage={view.lesson.content.passage}
        glossary={view.lesson.content.glossary}
        markWords={[
          ...view.lesson.newWords,
          ...view.lesson.content.targetWords,
        ]}
        pictureWords={view.lesson.newWords}
        level={view.level}
        pictures={pictures}
        speech={speech}
        initial={restored as PassageInput | undefined}
        onChange={(input) => {
          save(input);
          // 가르치는 수업: 뜻을 연 낱말은 뒤 문항들의 첫 답 전 도움이다(지문이 늘 함께 보임 — 설계 9)
          if (teaching)
            for (const word of input.tappedWords)
              recordAid(PASSAGE_AID_KEY, { gloss: word });
        }}
        onDone={(input) => complete(input)}
        {...(teaching
          ? {
              onReadAloud: () =>
                recordAid(PASSAGE_AID_KEY, { readAloud: true }),
            }
          : {})}
      />
    );
  } else if (activity?.kind === "reading-question" && view.area === "reading") {
    const question = view.lesson.content.questions[activity.index];
    if (question) {
      ownButtons = true;
      body = (
        <QuestionActivity
          question={question}
          passage={view.lesson.content.passage}
          pictures={pictures}
          speech={speech}
          initial={restored as QuestionInput | undefined}
          onChange={save}
          onDone={(input) => complete(input)}
          {...(teachLine
            ? {
                teach: {
                  mode: "solo" as const,
                  ...teachLine,
                  aidNow: () => aidOf(aids.current, PASSAGE_AID_KEY),
                  onReadAloud: () =>
                    recordAid(PASSAGE_AID_KEY, { readAloud: true }),
                },
              }
            : {})}
        />
      );
    }
  } else if (
    activity?.kind === "writing-item" &&
    view.area === "writing" &&
    view.lesson.content.shape === "items"
  ) {
    const item = view.lesson.content.items[activity.index];
    if (item) {
      ownButtons = true;
      body = (
        <WritingItemActivity
          item={item}
          level={view.level}
          pictures={pictures}
          speech={speech}
          initial={restored as WritingItemInput | undefined}
          onChange={save}
          onDone={(input) => complete(input)}
          {...(teachLine
            ? { teach: { mode: "solo" as const, ...teachLine } }
            : {})}
        />
      );
    }
  } else if (
    view.area === "writing" &&
    view.lesson.content.shape === "guided" &&
    view.guided &&
    activity?.kind === "writing-task"
  ) {
    const content = view.lesson.content;
    ownButtons = true;
    body = (
      <GuidedTaskActivity
        task={content.task}
        example={content.example}
        {...(view.guided.input === "word-box"
          ? {
              wordBox: [
                ...new Set(content.sentences.flatMap((s) => s.wordBox ?? [])),
              ],
            }
          : {})}
        onDone={() => complete({})}
      />
    );
  } else if (
    view.area === "writing" &&
    view.lesson.content.shape === "guided" &&
    view.guided &&
    activity?.kind === "writing-guided"
  ) {
    const activityNo = current;
    ownButtons = true;
    body = (
      <GuidedWritingActivity
        task={view.lesson.content.task}
        example={view.lesson.content.example}
        sentences={view.lesson.content.sentences}
        input={view.guided.input}
        waitHintSeconds={view.config.ui.waitHintSeconds}
        initial={restored as GuidedInput | undefined}
        onChange={save}
        check={(req) =>
          checkGuidedWriting({
            sessionId: view.sessionId,
            activityNo,
            ...req,
          })
        }
        onResting={() => setResting(true)}
        onLeave={() => {
          inputs.clear(view.sessionId);
          router.push(`/${view.area}/lessons`);
        }}
        onDone={(sentences, fixed) => {
          // 끝 시도는 서버 액션이 저장했다. 고친 문장은 진행 시도로(내 문장 듣기 · 다시 열 때)
          if (fixed)
            void queue.current?.add({
              clientAttemptId: crypto.randomUUID(),
              sessionId: view.sessionId,
              activityNo,
              input: {
                v: 1,
                kind: "writing-guided-fix",
                step: "progress",
                fixed: sentences,
              },
            });
          setOwnSentences(sentences);
          advance();
        }}
      />
    );
  } else if (
    view.area === "writing" &&
    view.lesson.content.shape === "composition" &&
    view.composition &&
    activity?.kind === "writing-task"
  ) {
    ownButtons = true;
    body = (
      <CompositionTaskActivity
        task={view.lesson.content.task}
        example={view.lesson.content.example}
        onDone={() => complete({})}
      />
    );
  } else if (
    view.area === "writing" &&
    view.composition &&
    activity?.kind === "thinkout"
  ) {
    const activityNo = current;
    ownButtons = true;
    body = (
      <ThinkoutActivity
        initialTurn={view.composition.thinkoutTurn}
        waitHintSeconds={view.config.ui.waitHintSeconds}
        initial={restored as ThinkoutInput | undefined}
        onChange={save}
        step={(req) =>
          thinkoutNext({ sessionId: view.sessionId, activityNo, ...req })
        }
        onDone={(result) => {
          // 끝 시도는 서버 액션이 저장했다
          setThinkoutResult(
            result ? { state: "done", ...result } : { state: "failed" },
          );
          advance();
        }}
        onResting={() => setResting(true)}
        onLeave={() => {
          inputs.clear(view.sessionId);
          router.push(`/${view.area}/lessons`);
        }}
      />
    );
  } else if (
    view.area === "writing" &&
    view.lesson.content.shape === "composition" &&
    view.composition &&
    activity?.kind === "draft"
  ) {
    const activityNo = current;
    const content = view.lesson.content;
    ownButtons = true;
    body = (
      <DraftActivity
        task={content.task}
        example={content.example}
        hints={content.hints}
        thinkout={thinkoutResult}
        amount={view.composition.amount}
        speech={speech}
        initialText={view.composition.draftText}
        initial={restored as DraftInput | undefined}
        onChange={save}
        autosave={(text) =>
          void queue.current?.add({
            clientAttemptId: crypto.randomUUID(),
            sessionId: view.sessionId,
            activityNo,
            input: { v: 1, kind: "draft", step: "progress", text },
          })
        }
        registerFlush={registerDraftFlush}
        submit={async (req) => {
          // 앞 활동의 끝 시도를 먼저 보낸 뒤 낸다(서버가 앞 활동이 다 있어야 받는다 — 빠졌으면 한 번 더)
          let out: Awaited<ReturnType<typeof submitDraft>> | undefined;
          for (let round = 0; round < 2; round += 1) {
            await queue.current?.idle();
            await queue.current?.flush();
            out = await submitDraft({
              sessionId: view.sessionId,
              activityNo,
              ...req,
            });
            if (out.ok || out.reason !== "incomplete") break;
          }
          if (!out) throw new Error("초고를 내지 못했다");
          if (out.ok) {
            inputs.clear(view.sessionId);
            router.push(out.resultPath);
            return out;
          }
          if (out.reason === "incomplete") {
            // 서버에도 이 기기 대기열에도 없는 앞 활동(서버가 버린 시도 · 다른 기기) — 끝내기와 같은 꼴로 그 활동으로 돌아간다.
            // 쓴 초고는 기기 입력에 남아 다시 오면 그대로다(코드 검토 review-p11-6-code M-3)
            const queued = new Set(queue.current?.finals(view.sessionId) ?? []);
            const lost = out.missing.filter((no) => !queued.has(no));
            const back = lost[0];
            if (back !== undefined) {
              setFinals(
                (before) =>
                  new Set([...before].filter((n) => !lost.includes(n))),
              );
              setCurrent(back);
            }
          }
          return out;
        }}
        onLeave={() => {
          inputs.clear(view.sessionId);
          router.push(`/${view.area}/lessons`);
        }}
      />
    );
  } else if (view.area === "writing" && view.rewrite && activity) {
    const rv = view.rewrite;
    const activityNo = current;
    if (activity.kind === "feedback-praise") {
      ownButtons = true;
      body = (
        <FeedbackPraiseActivity
          praise={rv.praise}
          onDone={() => complete({})}
        />
      );
    } else if (activity.kind === "feedback-correction") {
      const correction = rv.corrections[activity.index];
      if (correction) {
        ownButtons = true;
        body = (
          <FeedbackCorrectionActivity
            correction={correction}
            onDone={() => complete({})}
          />
        );
      }
    } else if (activity.kind === "rewrite") {
      ownButtons = true;
      body = (
        <RewriteActivity
          draftText={rv.draftText}
          corrections={rv.corrections}
          initial={restored as RewriteInput | undefined}
          onChange={save}
          submit={(req) =>
            submitRewrite({ sessionId: view.sessionId, activityNo, ...req })
          }
          onDone={(text, modelAnswer) => {
            // 끝 시도는 서버 액션이 저장했다 — 모범 답안은 이제 보인다(AC-4c)
            setRewritten({ text, modelAnswer });
            advance();
          }}
          onLeave={() => {
            inputs.clear(view.sessionId);
            router.push(`/${view.area}/lessons`);
          }}
        />
      );
    } else if (activity.kind === "model-answer" && rewritten?.modelAnswer) {
      ownButtons = true;
      body = (
        <ModelAnswerActivity
          text={rewritten.modelAnswer}
          onDone={() => complete({})}
        />
      );
    } else if (activity.kind === "own-speak" && rewritten) {
      ownButtons = true;
      body = !noticeSeen ? (
        <MicNotice
          onOk={() => {
            speech?.unlockFromGesture();
            markMicNoticeSeen();
            setNoticeSeen(true);
          }}
        />
      ) : (
        <OwnRepeatActivity
          sentences={sentencesOf(rewritten.text)}
          guide={REWRITE_TEXT.ownSpeak}
          env={{
            speech,
            speechSettings: view.config.speech,
            level: view.level,
            homophones: view.homophones,
          }}
          phraseLevels={view.config.ui.matchPhraseLevels}
          autoNextSeconds={view.config.ui.autoNextSeconds}
          limits={limits}
          onDone={(result) => complete(result)}
        />
      );
    } else {
      ownButtons = true;
    }
  } else if (
    view.area === "writing" &&
    activity?.kind === "writing-own-repeat"
  ) {
    ownButtons = true;
    body =
      !noticeSeen && ownSentences && ownSentences.length > 0 ? (
        <MicNotice
          onOk={() => {
            speech?.unlockFromGesture();
            markMicNoticeSeen();
            setNoticeSeen(true);
          }}
        />
      ) : ownSentences && ownSentences.length > 0 ? (
        <OwnRepeatActivity
          sentences={ownSentences}
          env={{
            speech,
            speechSettings: view.config.speech,
            level: view.level,
            homophones: view.homophones,
          }}
          phraseLevels={view.config.ui.matchPhraseLevels}
          autoNextSeconds={view.config.ui.autoNextSeconds}
          limits={limits}
          onDone={(result) => complete(result)}
        />
      ) : null;
  } else if (
    view.area === "speaking" &&
    activity &&
    recorded(activity) &&
    activity.kind !== "preview"
  ) {
    const env = speakingEnv;
    const c = view.lesson.content;
    ownButtons = true;
    if (!noticeSeen && spokenActivity(activity)) {
      body = micNotice;
    } else if (
      activity.kind === "repeat-word" ||
      activity.kind === "repeat-sentence"
    ) {
      const word = activity.kind === "repeat-word";
      const text = word
        ? c.repeat.words[activity.index]
        : c.repeat.sentences[activity.index];
      body = text ? (
        <RepeatActivity
          text={text}
          env={env}
          phraseLevels={view.config.ui.matchPhraseLevels}
          autoNextSeconds={view.config.ui.autoNextSeconds}
          initial={restored as RepeatInput | undefined}
          {...(speakingTeach
            ? {
                teach: {
                  ...speakingTeach("solo"),
                  // 문장은 시드 chunks 로 끊어 들려주고, 낱말은 끊는 자리가 없어 하나 그대로(시드 규격 '낱말은 없음')
                  chunks: word
                    ? [text]
                    : chunksOf(text, c.repeat.chunks?.[activity.index]),
                },
              }
            : {})}
          onChange={save}
          onDone={(input) => complete(input)}
        />
      ) : null;
    } else if (activity.kind === "listening") {
      const item = c.listening[activity.index];
      body = item ? (
        <ListeningActivity
          item={item}
          level={view.level}
          pictures={pictures}
          speech={speech}
          initial={restored as ListeningInput | undefined}
          {...(speakingTeach ? { teach: listeningTeach("solo") } : {})}
          onChange={save}
          onDone={(input) => complete(input)}
        />
      ) : null;
    } else if (activity.kind === "question") {
      const question = c.questions[activity.index];
      const activityNo = current;
      body = !question ? null : view.appJudged && !speakingTeach ? (
        // 1~2단계 지금 화면(앱 판정 — C38 · C77 (5))
        <QuestionAnswerActivity
          question={question}
          showKo={view.showKo}
          env={env}
          answerShape={view.answerShapes[current - 1] ?? "one-sentence"}
          capSeconds={view.config.speaking.answerMaxSeconds}
          pass={view.config.speaking.answerMatchPass}
          initial={restored as QuestionAnswerInput | undefined}
          onChange={save}
          onDone={(input) => complete(input)}
        />
      ) : (
        <JudgedQuestionActivity
          question={question}
          showKo={view.showKo}
          env={env}
          answerShape={view.answerShapes[current - 1] ?? "one-sentence"}
          capSeconds={view.config.speaking.answerMaxSeconds}
          judge={
            view.appJudged
              ? { by: "app", pass: view.config.speaking.answerMatchPass }
              : {
                  // 3단계부터 AI 판정(plan-p11c 값 4 · 정한 것 5 — 서버 액션만 AI 를 부른다)
                  by: "ai",
                  evaluate: (request) =>
                    evaluateSpeakingAnswer({
                      sessionId: view.sessionId,
                      activityNo,
                      ...request,
                    }),
                  waitHintSeconds: view.config.ui.waitHintSeconds,
                }
          }
          {...(speakingTeach ? { teach: speakingTeach("solo") } : {})}
          initial={restored as JudgedQuestionInput | undefined}
          onChange={save}
          onDone={(input) => complete(input)}
          onServerSaved={(saved) => {
            // 끝 시도는 서버 액션이 저장했다('같이 말해 볼까요' 뒤 말도 서버가 그 행에 합침 — fix 1 I1). 이 기기의 짝 고르기에는 같은 내용과
            // 서버와 같은 판정 함수(합친 판정을 넣으면 서버 judge 와 같은 갈래 · 같은 final)로 만든 판정을 남긴다(L-34 기기 몫 — 서버 값이 정본)
            localAttempts.current.push({
              activityNo,
              input: savedQuestionInputOf(question, saved, outcomeCtx),
            });
            advance();
          }}
          onAiResting={() => skipAiQuestions()}
        />
      );
    } else if (activity.kind === "spare" && speakingTeach) {
      // 짝(다른 예시 — 질문 → 듣기 → 문장 → 낱말 차례, 앱 판정): 혼자 문항과 같은 화면, 처음 맞으면 '혼자 해냈어요!', 틀리면 바른 답을 들려주고 끝
      const { base, index } = activity;
      if (base === "question") {
        const spare = c.questions[index]?.spare;
        body = spare ? (
          <JudgedQuestionActivity
            question={spare}
            showKo={view.showKo}
            env={env}
            answerShape={view.answerShapes[current - 1] ?? "one-sentence"}
            capSeconds={view.config.speaking.answerMaxSeconds}
            judge={{
              by: "meaning",
              pass: view.config.speaking.answerMatchPass,
              words: view.meaningWords,
            }}
            teach={speakingTeach("spare")}
            initial={restored as JudgedQuestionInput | undefined}
            onChange={save}
            onDone={(input) => complete(input)}
          />
        ) : null;
      } else if (base === "listening") {
        const spare = c.listening[index]?.spare;
        body = spare ? (
          <ListeningActivity
            item={spare}
            level={view.level}
            pictures={pictures}
            speech={speech}
            initial={restored as ListeningInput | undefined}
            teach={listeningTeach("spare")}
            onChange={save}
            onDone={(input) => complete(input)}
          />
        ) : null;
      } else if (base === "repeat-sentence" || base === "repeat-word") {
        const spares = c.repeat.spares;
        const text =
          base === "repeat-word"
            ? spares?.words[index]
            : spares?.sentences[index];
        body = text ? (
          <RepeatActivity
            text={text}
            env={env}
            phraseLevels={view.config.ui.matchPhraseLevels}
            autoNextSeconds={view.config.ui.autoNextSeconds}
            initial={restored as RepeatInput | undefined}
            teach={{ ...speakingTeach("spare"), chunks: [text] }}
            onChange={save}
            onDone={(input) => complete(input)}
          />
        ) : null;
      }
    }
  } else if (activity) {
    body = <DisplayBody view={view} activity={activity} pictures={pictures} />;
  }
  // 가르치는 수업: 혼자 해 보기 첫 화면 · 첫 짝 화면에만 초상과 앱 문구 한 줄(설계 4 · 5 — 문항을 푸는 다음 화면부터는 초상이 없다)
  const firstLine = teaching
    ? current === firstActivityOfSlot(view.activities, "solo")
      ? "solo"
      : current === spareChoice?.show[0]
        ? "spare"
        : undefined
    : undefined;
  if (teaching && firstLine && body) {
    body = (
      <div className="flex flex-1 flex-col gap-6">
        <FirstLine
          kind={firstLine}
          area={view.area}
          teacher={teaching.teacher}
          speech={speech}
          speechSettings={view.config.speech}
          onLineEnd={onLineEnd}
        />
        {body}
      </div>
    );
  }
  // 가르치는 수업의 선생님 고르기(묶음 마-2 · AC-3i): 막힘 · 쉼 뒤, 오늘 배울 것 앞(여는 차례 — openingScreenOf). 큰 단추는 조각 안에 있다.
  // 조각 안 누름마다 이 세션 음성 접점의 읽어 주기 제약도 푼다(고른 뒤 오늘 배울 것의 첫 줄이 iPad 에서도 읽히게 — 정한 것 11 의 보탬)
  if (
    teaching &&
    openingScreenOf({ blocked: Boolean(blocked), resting, teaching }) ===
      "choose-teacher"
  ) {
    ownButtons = true;
    body = (
      <div
        data-teach-choose=""
        className="contents"
        onClickCapture={() => speech?.unlockFromGesture()}
      >
        <TeacherChoice
          choices={teaching.teacherChoices}
          speech={speech}
          rate={speakRateOf(view.level, view.config.speech)}
          // 새 화면 자료(teaching — 고른 선생님)를 다시 읽는다. 세션 틀은 그대로 남아 지금 활동(오늘 배울 것)을 그린다
          onChosen={() => router.refresh()}
        />
      </div>
    );
  }
  // 1-가 하루 안전 상한(한 화면 — 안내 · 큰 '홈' · 작은 '다시 해 볼래요', 세션은 진행으로 남음, C50 (2) · C80 · [승인 UX4])
  if (resting && !blocked) {
    ownButtons = true;
    body = (
      <AiRest fill busy={busy} onHome={() => void home()} retry={restRetry} />
    );
  }
  // 막힘 판(한 화면 — 안내 · 큰 '다시 해 볼래요' · 작은 '홈', 세션은 진행으로 남음, 7절 '막힘 화면' · [승인 UX3])
  if (blocked) {
    ownButtons = true;
    body = (
      <div data-blocked={blocked} className="flex flex-1 flex-col">
        {/* 아이패드 사파리면 둘째 줄 무음 모드(C111). '다시 해 볼래요'(C166 R6 · U4-5): 마이크가 되면 실패 셈을 비우고 같은 자리로.
            '홈'은 종이 띠의 '홈'을 숨기고 같은 길(대기열 비우기 · 세션은 진행으로) */}
        <MicBlockedPanel
          fill
          kind={blocked}
          ipadSafari={ipadSafari}
          busy={busy}
          retry={{
            speech,
            disabled: busy,
            onRecovered: () => {
              counters.current = speakingCountersStart();
              setBlocked(undefined);
            },
          }}
          home={{ onClick: () => void home() }}
        />
      </div>
    );
  }
  // 끝내기가 막힌 동안은 마지막 활동 자리에 안내와 '다음'(다시 해 봄)만. 막힌 안내 · 안전 상한 안내가 먼저다('홈'이 늘 보이게 —
  // 마지막 활동이 말소리 없음으로 막힌 채 끝내기가 실패한 때, 검토 review-p11-fix4-code M-2)
  const stopped = Boolean(blocked) || resting;
  const showFinishRetry = finishPending && !stopped;
  if (showFinishRetry) ownButtons = false;
  /** 위 띠 자리 이름(설계 5 '정본 밖 문구' 표 글자 그대로 — 가르치는 수업만). */
  const slot = teaching ? teachSlotAt(view.activities, current) : undefined;
  /** 진행 막대에서 뺄 칸(가르치는 수업은 혼자 해 보기를 다 끝낸 뒤 내지 않을 짝 — 낸 짝만 센다, 정한 것 3). */
  const progressHidden = teaching
    ? progressHiddenOf(view.activities, finals, spareChoice?.skip ?? [])
    : undefined;

  return (
    <ChildScreen>
      <PaperBand
        heading
        title={view.title}
        detail={
          slot ? (
            <>
              {TEXT.levelUnit(view.level, view.unit)}
              <span data-teach-slot-name={slot}>
                {" · "}
                {TEACH_SLOT_NAME[slot]}
              </span>
            </>
          ) : (
            TEXT.levelUnit(view.level, view.unit)
          )
        }
        right={
          stopped ? undefined : (
            <SmallButton disabled={busy} onClick={() => void home()}>
              {TEXT.home}
            </SmallButton>
          )
        }
      />
      <div
        ref={cardRef}
        tabIndex={-1}
        data-activity={activity?.kind ?? "none"}
        data-hydrated={hydrated ? "" : undefined}
        data-activity-no={current}
        className="flex flex-1 flex-col outline-none"
      >
        <FamilyBoard
          kind="session"
          tone={view.area}
          fill
          paperKey={`session:${view.area}`}
          data-activity-card=""
        >
          <ActivityProgress
            area={view.area}
            groups={activityGroupsOf(
              view.activities,
              current,
              finals,
              progressHidden,
            )}
          />
          {showFinishRetry ? null : (
            // 기기 저장소를 읽은 뒤 한 번 다시 그린다(되살린 입력으로)
            <div
              key={`${current}:${hydrated ? "h" : "s"}`}
              className="contents"
            >
              {body}
            </div>
          )}
          {/* 알림 줄은 늘 두어 읽기 도구가 끊김 안내를 읽게 하고, 글이 없으면 화면 배치에서만 뺀다(카드 간격도 안 남김 — 화면 검토 M-5 · 재검토 N-1) */}
          <StatusLine tone="error" className={status ? undefined : "sr-only"}>
            {status}
          </StatusLine>
          {/* 선생님 줄을 두 번째로 들려주지 못하면 아이패드 사파리에 무음 모드 줄(C111 문구 — UI · UX R-57 · 설계 10) */}
          {teaching && notices.silent && ipadSafari && !stopped ? (
            <div data-teach-silent="">
              <StatusLine>{MIC_BLOCKED_TEXT.ipadSilentMode}</StatusLine>
            </div>
          ) : null}
          {/* 틀의 '다음'은 판 안 아래(설계 5.4 · D-10 — 책상 위에 홀로 뜨지 않게) */}
          {ownButtons ? null : (
            <div data-frame-next="" className="mt-auto flex justify-end">
              <BigButton disabled={busy} onClick={() => void onFrameNext()}>
                {TEXT.next}
              </BigButton>
            </div>
          )}
        </FamilyBoard>
      </div>
    </ChildScreen>
  );
}
