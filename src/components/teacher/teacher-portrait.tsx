"use client";

// 선생님 초상(선생님 화면 plan 값 10, 4절 머리 문단 '글자 동그라미' · '선생님을 골라요'). 명단 초상(같은 출처 정적 자산 — public/teachers/,
// 이름에 내용 해시)을 둥글게 그리고 바탕은 그 선생님의 방 색이다. 이름이 늘 옆에 있어 꾸밈 그림이다(alt ""). 선생님이 없거나(고르기 전)
// 초상을 읽지 못하면 글자 동그라미 '선'(Jua · 연두 · 먹색 테 — 옛 토리 동그라미 꼴). 회화 고르는 화면이 쓰고, P13c 의 홈 회화 카드 ·
// 선생님 이야기 · 평가 대화도 이 조각을 쓴다. 모양 갈래(UI · UX spec 설계 5.5 · R-8, plan 묶음 4-가): 'window' 는 회화 선생님 창을 줄인
// 꼴(위가 반원인 둥근 모서리 · 방 색 바탕 · 연두 테와 먹색 선)이고 홈 회화 카드 작은 초상(56px 안팎) · '선생님을 골라요' 장이 쓴다. 모양을
// 주지 않으면 지금 꼴(동그라미)이라 다른 화면의 입력 꼴은 그대로다. 그림 파일과 스타일만 쓴다(3D 없음, NFR-U3).
import Image from "next/image";
import { useState } from "react";
import { TEACHER_TEXT } from "@/core/teacher/name";
import type { TeacherView } from "@/core/teacher/roster";
import { cn } from "@/lib/utils";

const RING = "shrink-0 rounded-full border-[3px] border-ink";
/** 둥근 창 꼴: 연두 테 · 먹색 종이 선(창 테를 줄인 꼴). 그림은 아래 끝을 맞춰 담는다(머리 위는 방 색). */
const WINDOW =
  "shrink-0 border-[3px] border-postit-talk object-contain object-bottom shadow-[0_0_0_var(--paper-edge)_var(--color-ink)]";
/** 둥근 창 꼴 모양(화면 꼴 상수, 시안 ② 창 262 의 아래 모서리 26 비율): 아래 모서리 = 지름 × 비율. */
export const PORTRAIT_WINDOW = { bottomRatio: 0.1 } as const;

/** 둥근 창 꼴 모서리(순수): 위 둘은 지름의 절반(반원), 아래 둘은 지름 × 비율. CSS border-radius 값. */
export function windowCornersOf(size: number): string {
  const top = size / 2;
  const bottom = size * PORTRAIT_WINDOW.bottomRatio;
  return `${top}px ${top}px ${bottom}px ${bottom}px`;
}

export function TeacherPortrait({
  teacher,
  size,
  shape = "circle",
  className,
}: {
  teacher: TeacherView | null;
  /** 지름(px). 둥근 창 꼴도 너비 · 높이가 이 값이다. */
  size: number;
  /** 모양: 동그라미(기본) · 둥근 창 꼴(홈 작은 초상 · '선생님을 골라요'). 고르기 전 글자 동그라미는 모양과 관계없이 동그라미다. */
  shape?: "circle" | "window";
  className?: string;
}) {
  // 읽기에 실패한 초상 주소(선생님이 바뀌면 새 주소라 다시 그려 본다)
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  if (!teacher || brokenSrc === teacher.portraitPath) {
    return (
      <span
        aria-hidden
        data-teacher-portrait="initial"
        className={cn(
          RING,
          "flex items-center justify-center bg-postit-talk font-heading leading-none text-ink",
          className,
        )}
        style={{ width: size, height: size, fontSize: size / 2 }}
      >
        {TEACHER_TEXT.initial}
      </span>
    );
  }
  return (
    <Image
      data-teacher-portrait={teacher.key}
      data-portrait-shape={shape}
      src={teacher.portraitPath}
      // 꾸밈 그림 — 이름이 옆에 있다
      alt=""
      width={size}
      height={size}
      unoptimized
      onError={() => setBrokenSrc(teacher.portraitPath)}
      className={cn(
        shape === "window" ? WINDOW : cn(RING, "object-cover"),
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: teacher.color.room,
        ...(shape === "window" ? { borderRadius: windowCornersOf(size) } : {}),
      }}
    />
  );
}
