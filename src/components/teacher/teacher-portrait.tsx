"use client";

// 선생님 초상(선생님 화면 plan 값 10, 4절 머리 문단 '글자 동그라미' · '선생님을 골라요'). 명단 초상(같은 출처 정적 자산 — public/teachers/,
// 이름에 내용 해시)을 둥글게 그리고 바탕은 그 선생님의 방 색이다. 이름이 늘 옆에 있어 꾸밈 그림이다(alt ""). 선생님이 없거나(고르기 전)
// 초상을 읽지 못하면 글자 동그라미 '선'(Jua · 연두 · 먹색 테 — 옛 토리 동그라미 꼴). 회화 고르는 화면이 쓰고, P13c 의 홈 회화 카드 ·
// 선생님 이야기 · 평가 대화도 이 조각을 쓴다.
import Image from "next/image";
import { useState } from "react";
import { TEACHER_TEXT } from "@/core/teacher/name";
import type { TeacherView } from "@/core/teacher/roster";
import { cn } from "@/lib/utils";

const RING = "shrink-0 rounded-full border-[3px] border-ink";

export function TeacherPortrait({
  teacher,
  size,
  className,
}: {
  teacher: TeacherView | null;
  /** 지름(px). */
  size: number;
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
      src={teacher.portraitPath}
      // 꾸밈 그림 — 이름이 옆에 있다
      alt=""
      width={size}
      height={size}
      unoptimized
      onError={() => setBrokenSrc(teacher.portraitPath)}
      className={cn(RING, "object-cover", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: teacher.color.room,
      }}
    />
  );
}
