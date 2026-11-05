"use client";

// 오늘 배울 것(가르치고 배우는 수업 plan 묶음 라-1 · spec 설계 1 자리 1 · 5 화면 표 '오늘 배울 것' · 정본 밖 문구 '시작', 표본 R1 · W1 · S1).
// 초상과 말풍선(teach.todayKo), 그 아래 영어 토막(teach.todayEn, 24px). 선생님이 한국어 한 줄 → 영어 토막을 읽고, 읽기가 끝나면 '시작'이
// 밝아진다(감시가 넘기면 밝음 + 안내, 읽지 않음이면 바로 밝음 — 설계 10, AC-N20). 위 띠(자리 이름)는 세션 틀 몫이다.
import { BigButton } from "@/components/board/board";
import {
  type LinePart,
  TEACH_TEXT,
  TeacherLine,
  type TeachLineEnd,
  type TeachLineView,
  type TeachSpeechSettings,
  useTeachLine,
} from "@/components/session/teach/teacher-line";
import type { TeacherView } from "@/core/teacher/roster";
import type { SpeechPort } from "@/lib/speech/types";

/** 오늘 배울 것 시드 칸(teach.todayKo · teach.todayEn). */
export type TodayData = { todayKo: string; todayEn?: string | undefined };

/** 읽을 토막: 한국어 줄 → 영어 토막(선생님 영어). */
export function todayPartsOf(today: TodayData): LinePart[] {
  return [
    { text: today.todayKo, voice: "teacher_ko" },
    ...(today.todayEn
      ? [{ text: today.todayEn, voice: "teacher_en" } as const]
      : []),
  ];
}

/** 그림만(시험 · 상태 주입용). */
export function TodayView({
  today,
  teacher,
  line,
  onStart,
}: {
  today: TodayData;
  teacher: TeacherView | null;
  line: TeachLineView;
  onStart: () => void;
}) {
  return (
    <section data-teach-slot="today" className="flex flex-1 flex-col gap-6">
      <TeacherLine
        teacher={teacher}
        lineKo={today.todayKo}
        en={today.todayEn}
        line={line}
      />
      <BigButton
        className="mt-auto self-end"
        data-teach-action="start"
        disabled={!line.bright}
        onClick={onStart}
      >
        {TEACH_TEXT.start}
      </BigButton>
    </section>
  );
}

/** 오늘 배울 것 화면. onStart 는 '시작'을 누른 때. */
export function TodayScreen({
  today,
  teacher,
  speech,
  speechSettings,
  onLineEnd,
  onStart,
}: {
  today: TodayData;
  teacher: TeacherView | null;
  speech: SpeechPort | undefined;
  speechSettings: TeachSpeechSettings;
  /** 선생님 줄이 멈춘 때 한 번(notice — 세션 틀이 무음 모드 줄 셈에 쓴다, 설계 10). */
  onLineEnd?: (end: TeachLineEnd) => void;
  onStart: () => void;
}) {
  const line = useTeachLine({
    parts: todayPartsOf(today),
    speech,
    teacher,
    skipNoticeMs: speechSettings.skipNoticeMs,
    onEnd: onLineEnd,
  });
  return (
    <TodayView
      today={today}
      teacher={teacher}
      line={line}
      onStart={() => {
        speech?.unlockFromGesture();
        onStart();
      }}
    />
  );
}
