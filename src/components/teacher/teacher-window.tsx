"use client";

// 회화 세션 선생님 창(선생님 화면 plan 값 13, 4절 회화 세션 '선생님 창' 행 · C122 · C130 · C141). 보드에 붙인 사진 꼴(종이 테 · 위 테이프)이고
// 안 바탕은 선생님 방 색, 안에 초상(썸네일이 얼굴 정면 — 꽉 채움), 아래 이름표 '[이름] 선생님'(accent 바탕 · 종이색 글자 — C141). 창의 접근
// 이름도 같다. 초상일 때 상태 표시: 말하기 = 창 둘레 물결, 생각 = 점 셋, 칭찬 = 작은 별 표지(움직임 줄이기면 멈춘 꼴), 쉬기 · 듣기는 표시 없음.
// 넘김 효과(transition)를 두지 않는다. 시제품의 영어 자막 · 상태 이름 띠 · 머리글은 없다(C115).
// 3D(plan 값 14 — d8): 그림 층 보관 조각의 공유 값이 3d 이고 회화 틀이 '시작!'을 누른 뒤(started)면 창 안 칸에 3D 캔버스를 보이고
// 초상 · 상태 표시를 숨긴다('시작!' 화면은 3D 가 먼저 되어도 초상 — 정할 것 8). 칸은 늘 두어 그림 층이 캔버스를 미리 붙인다. 대신
// 표시로 갔으면 초상에 까닭 속성(data-teacher-fallback)을 단다 — 아이에게 오류 글 · 단추는 없다(C122).
import { Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useTeacherLayer } from "@/components/teacher/teacher-layer";
import { TeacherPortrait } from "@/components/teacher/teacher-portrait";
import { TEACHER_TEXT } from "@/core/teacher/name";
import type { TeacherView } from "@/core/teacher/roster";
import type { TeacherState } from "@/core/teacher/state";
import { cn } from "@/lib/utils";

/** 창 크기(px, 화면 꼴 상수 — plan 값 13 제안 값, 화면 검토가 고친다). 가로 화면은 lg 이상(4절 기준 기기 가로 1180). */
export const TEACHER_WINDOW_PX = {
  landscape: { width: 260, height: 300 },
  portrait: { width: 200, height: 240 },
} as const;
/** 위 크기를 글자 그대로(Tailwind 는 소스 글을 훑어 클래스를 만든다 — 템플릿 글로 만들지 않는다, 단위 시험이 같은 수인지 본다). */
export const WINDOW_SIZE_CLASS =
  "h-[240px] w-[200px] lg:h-[300px] lg:w-[260px]";
/** 초상을 읽지 못했을 때 글자 동그라미 지름(px, 화면 꼴 값). */
const INITIAL_PX = 96;
/** 생각 중 점 수 · 점마다 늦춤(화면 꼴 값 — 말풍선 기다림 점과 같은 값). */
const DOTS = [0, 1, 2] as const;
const DOT_DELAY_MS = 150;

/** 초상일 때 상태 표시(쉬기 · 듣기는 없음). */
type Indicator = "speaking" | "thinking" | "praise";
function indicatorOf(state: TeacherState): Indicator | undefined {
  return state === "speaking" || state === "thinking" || state === "praise"
    ? state
    : undefined;
}

export function TeacherWindow({
  teacher,
  state,
  reducedMotion,
  started,
}: {
  teacher: TeacherView;
  state: TeacherState;
  /** 움직임 줄이기(prefers-reduced-motion) — 상태 표시를 멈춘 꼴로. */
  reducedMotion: boolean;
  /** 회화 틀이 '시작!'을 누른 뒤인가(그 앞은 3D 가 되어도 초상). */
  started: boolean;
}) {
  const name = TEACHER_TEXT.windowName(teacher.nameKo);
  const layer = useTeacherLayer();
  const show3d = started && layer?.render === "3d";
  const fallback = show3d ? undefined : layer?.fallback;
  const indicator = show3d ? undefined : indicatorOf(state);
  // 읽기에 실패한 초상 주소(선생님이 바뀌면 새 주소라 다시 그려 본다)
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const motion = (cls: string) => (reducedMotion ? undefined : cls);
  return (
    <figure
      data-teacher-window=""
      data-teacher-key={teacher.key}
      data-teacher-state={state}
      data-teacher-render={show3d ? "3d" : "portrait"}
      data-teacher-fallback={fallback}
      role="img"
      aria-label={name}
      className={cn(
        WINDOW_SIZE_CLASS,
        "relative m-0 flex shrink-0 flex-col bg-paper p-[6px] shadow-postit",
      )}
    >
      {/* 말하기: 창 둘레 물결(멈춘 테 + 퍼지는 테 — 움직임 줄이기면 멈춘 테만) */}
      {indicator === "speaking" ? (
        <span
          aria-hidden
          data-teacher-indicator="speaking"
          className="pointer-events-none absolute -inset-2"
        >
          <span
            className="absolute inset-0 rounded-[6px] border-4"
            style={{ borderColor: teacher.color.accent }}
          />
          <span
            className={cn(
              "absolute inset-0 rounded-[6px] border-4",
              motion("motion-safe:animate-ping"),
            )}
            style={{ borderColor: teacher.color.accent }}
          />
        </span>
      ) : null}
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 z-10 h-7 w-28 -translate-x-1/2 -rotate-2 bg-postit-talk/90"
      />
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        style={{ backgroundColor: teacher.color.room }}
      >
        {layer ? (
          // 3D 칸: 그림 층 보관 조각이 캔버스를 붙인다(초상일 때는 숨김 — 넘김 효과 없음)
          <div
            ref={layer.attach}
            data-teacher-slot=""
            aria-hidden
            className={cn("absolute inset-0", !show3d && "hidden")}
          />
        ) : null}
        {brokenSrc === teacher.portraitPath ? (
          show3d ? null : (
            <TeacherPortrait teacher={null} size={INITIAL_PX} />
          )
        ) : (
          <Image
            data-teacher-portrait-image=""
            src={teacher.portraitPath}
            // 꾸밈 그림 — 이름이 이름표에 있다
            alt=""
            width={TEACHER_WINDOW_PX.landscape.width}
            height={TEACHER_WINDOW_PX.landscape.width}
            unoptimized
            onError={() => setBrokenSrc(teacher.portraitPath)}
            className={cn("size-full object-cover", show3d && "hidden")}
          />
        )}
        {indicator === "thinking" ? (
          <span
            aria-hidden
            data-teacher-indicator="thinking"
            className="absolute top-2 right-2 flex gap-1.5 rounded-full bg-paper px-3 py-2 shadow-postit"
          >
            {DOTS.map((i) => (
              <span
                key={i}
                className={cn(
                  "size-2.5 rounded-full bg-ink",
                  motion("motion-safe:animate-bounce"),
                )}
                style={{ animationDelay: `${i * DOT_DELAY_MS}ms` }}
              />
            ))}
          </span>
        ) : null}
        {indicator === "praise" ? (
          <span
            aria-hidden
            data-teacher-indicator="praise"
            className={cn(
              "absolute top-2 right-2 flex size-12 items-center justify-center rounded-full bg-paper shadow-postit",
              motion("motion-safe:animate-bounce"),
            )}
          >
            <Star
              className="size-8 fill-postit-reading text-ink"
              strokeWidth={2.5}
            />
          </span>
        ) : null}
      </div>
      <figcaption
        className="truncate px-2 py-1 text-center font-heading text-[24px] leading-tight text-paper"
        style={{ backgroundColor: teacher.color.accent }}
      >
        {name}
      </figcaption>
    </figure>
  );
}
