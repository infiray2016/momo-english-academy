"use client";

// 집 선생님 공유 값(선생님 화면 plan 값 9, 4절 머리 문단 '[이름]'). (child) 틀이 서버에서 읽은 집 프로필의 선생님(TeacherView)을 아이
// 화면 조각에 나눈다. 고르기 전 · 읽기 실패면 null 이고, 문구 표가 이름 자리를 '선생님'으로 채운다. 회화 세션 안 글은 이 값이 아니라
// 그 세션의 선생님(처음 스냅숏 — TalkView.teacher)을 쓴다. 틀(layout)은 쪽을 옮겨도 다시 그려지지 않으므로, 고르기 뒤에는
// router.refresh() 로 다시 읽는다(d6).
import { createContext, type ReactNode, useContext } from "react";
import type { TeacherView } from "@/core/teacher/roster";

const TeacherContext = createContext<TeacherView | null>(null);

export function TeacherProvider({
  value,
  children,
}: {
  value: TeacherView | null;
  children: ReactNode;
}) {
  return <TeacherContext value={value}>{children}</TeacherContext>;
}

/** 집 선생님(고르기 전 · 공유 값 밖이면 null). */
export function useTeacher(): TeacherView | null {
  return useContext(TeacherContext);
}

/** 집 선생님의 한글 이름(없으면 undefined — 문구 표가 '선생님'). */
export function useTeacherName(): string | undefined {
  return useTeacher()?.nameKo;
}
