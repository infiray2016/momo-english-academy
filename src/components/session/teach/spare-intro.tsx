"use client";

// 혼자 해 보기 첫 화면 · 다른 예시 첫 장의 선생님 한 줄(가르치고 배우는 수업 plan 묶음 라-1 · spec 설계 4 초상 자리 '혼자 해 보기 · 짝의 첫 화면
// 한 줄' · 5 화면 표 · 정본 밖 문구 '혼자 해 보기 첫 화면' · '다른 예시 첫 장', 표본 R8 · W8 · S8 · R14 · W11 · S14). 그 화면의 첫 문항 위에
// 초상과 앱 문구 한 줄을 두고 선생님이 읽는다. 단추는 문항 조각의 것이라 이 조각은 단추가 없다. 문항을 푸는 다음 화면부터는 초상이 없다
// (AC-3g — 부르는 쪽이 첫 화면에만 놓는다).
import {
  TEACH_TEXT,
  type TeachArea,
  TeacherLine,
  type TeachLineEnd,
  type TeachSpeechSettings,
  useTeachLine,
} from "@/components/session/teach/teacher-line";
import type { TeacherView } from "@/core/teacher/roster";
import type { SpeechPort } from "@/lib/speech/types";

/** 첫 장 갈래: 혼자 해 보기 · 다른 예시(짝). */
export type FirstLineKind = "solo" | "spare";

/** 첫 장 한 줄(정본 밖 문구 표 그대로): 혼자는 세 영역 같은 글, 짝은 영역마다 하나. */
export function firstLineOf(kind: FirstLineKind, area: TeachArea): string {
  return kind === "solo" ? TEACH_TEXT.soloFirst : TEACH_TEXT.spareFirst[area];
}

export function FirstLine({
  kind,
  area,
  teacher,
  speech,
  speechSettings,
  onLineEnd,
}: {
  kind: FirstLineKind;
  area: TeachArea;
  teacher: TeacherView | null;
  speech: SpeechPort | undefined;
  speechSettings: TeachSpeechSettings;
  /** 선생님 줄이 멈춘 때 한 번(notice — 세션 틀이 무음 모드 줄 셈에 쓴다, 설계 10). */
  onLineEnd?: (end: TeachLineEnd) => void;
}) {
  const lineKo = firstLineOf(kind, area);
  const line = useTeachLine({
    parts: [{ text: lineKo, voice: "teacher_ko" }],
    speech,
    teacher,
    skipNoticeMs: speechSettings.skipNoticeMs,
    onEnd: onLineEnd,
  });
  return (
    <div data-teach-first={kind}>
      <TeacherLine teacher={teacher} lineKo={lineKo} line={line} />
    </div>
  );
}
