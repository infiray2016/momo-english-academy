// 마이크 점검 쪽(/dev/mic-probe, 브리프 task-mic-probe 2026-11-06). 운영 배포 빌드에서는 빠지는 이름이다(next.config.ts 의
// pageExtensions — 단위 tests/unit/next-config.test.ts). 가족 접근 쿠키 뒤에 있다(proxy). DB 를 읽거나 쓰지 않는다.
// fix 2: 전략 I(앱 첫 차례 재현)가 읽을 선생님 말 — 명단(seed/teachers.json) 첫 선생님의 영어 인사 · 목소리 높이 · 목소리 순서를 넘긴다.
// 명단을 못 읽으면 null(I 는 짧은 기본 문장을 읽는다).
import type { Metadata } from "next";
import { rosterOf } from "@/server/teacher";
import { MicProbe, type TeacherLine } from "./mic-probe";

export const metadata: Metadata = {
  title: "마이크 점검",
  robots: { index: false, follow: false },
};

function firstTeacherLine(): TeacherLine | null {
  try {
    const teacher = rosterOf()[0];
    if (teacher === undefined) return null;
    return {
      text: teacher.greetingEn,
      pitch: teacher.voice.pitch,
      prefer: [...teacher.voice.prefer],
    };
  } catch {
    return null;
  }
}

export default function MicProbePage() {
  return <MicProbe teacherLine={firstTeacherLine()} />;
}
