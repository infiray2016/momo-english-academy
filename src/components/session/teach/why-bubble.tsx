"use client";

// '왜' 말풍선(가르치고 배우는 수업 plan 묶음 라-1 · spec 설계 1 '틀린 뒤 차례' · 4 초상 자리 · 5 화면 표 ''왜' 한 줄' · 정본 밖 문구 '틀린 뒤 단추',
// 표본 R12 · W9 · S12). 화면을 바꾸지 않고 같은 문항 위에 초상과 말풍선(한 줄)이 나온다 — 부르는 쪽이 문항 위에 놓는다. 한 줄은 시드
// whyKo, 쓰기 대문자 · 마침표는 core/writing/why.ts 앱 문구, 따라 말하기는 '끊어서 다시 들어 봐요.'(TEACH_TEXT.whyRepeat)다. 선생님이
// 한 줄을 읽고, 읽기가 끝나면 틀린 뒤 단추('한 번 더 풀기' 읽기 · 듣기 · '한 번 더 하기' 쓰기 · '한 번 더 말하기' 말하기) 하나가 밝아진다
// (설계 5 · 10, AC-N20). 짝도 틀린 때처럼 다시가 없으면 retry 를 주지 않아 단추 없이 한 줄만 보인다(다음은 부르는 쪽).
import { BigButton } from "@/components/board/board";
import {
  TEACH_TEXT,
  TeacherLine,
  type TeachLineEnd,
  type TeachLineView,
  type TeachSpeechSettings,
  useTeachLine,
} from "@/components/session/teach/teacher-line";
import type { TeacherView } from "@/core/teacher/roster";
import type { SpeechPort } from "@/lib/speech/types";

/** 틀린 뒤 단추 갈래: 풀기(읽기 · 듣기) · 하기(쓰기) · 말하기(말하기). */
export type WhyRetry = keyof typeof TEACH_TEXT.retry;

export function WhyView({
  whyKo,
  retry,
  teacher,
  line,
  onRetry,
}: {
  whyKo: string;
  retry?: WhyRetry | undefined;
  teacher: TeacherView | null;
  line: TeachLineView;
  onRetry?: () => void;
}) {
  return (
    <div data-teach-why="" className="flex flex-col gap-4">
      <TeacherLine teacher={teacher} lineKo={whyKo} line={line} />
      {retry ? (
        <BigButton
          className="self-end"
          data-teach-action="retry"
          data-teach-retry={retry}
          disabled={!line.bright}
          onClick={onRetry}
        >
          {TEACH_TEXT.retry[retry]}
        </BigButton>
      ) : null}
    </div>
  );
}

/** '왜' 말풍선. onRetry 는 틀린 뒤 단추를 누른 때(같은 문제 다시). */
export function WhyBubble({
  whyKo,
  retry,
  teacher,
  speech,
  speechSettings,
  onLineEnd,
  onRetry,
}: {
  whyKo: string;
  retry?: WhyRetry | undefined;
  teacher: TeacherView | null;
  speech: SpeechPort | undefined;
  speechSettings: TeachSpeechSettings;
  /** 선생님 줄이 멈춘 때 한 번(notice — 세션 틀이 무음 모드 줄 셈에 쓴다, 설계 10). */
  onLineEnd?: (end: TeachLineEnd) => void;
  onRetry?: () => void;
}) {
  const line = useTeachLine({
    parts: [{ text: whyKo, voice: "teacher_ko" }],
    speech,
    teacher,
    skipNoticeMs: speechSettings.skipNoticeMs,
    onEnd: onLineEnd,
  });
  return (
    <WhyView
      whyKo={whyKo}
      retry={retry}
      teacher={teacher}
      line={line}
      onRetry={() => {
        speech?.unlockFromGesture();
        onRetry?.();
      }}
    />
  );
}
