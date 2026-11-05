"use client";

import { AudioLines, Mic, Star } from "lucide-react";
import Image from "next/image";
import { type CSSProperties, useState } from "react";
// 회화 세션 선생님 창(선생님 화면 plan 값 13, 4절 회화 세션 '선생님 창' 행 · C122 · C130 · C168 · UI · UX spec 설계 5.5 · R-25 · R-27).
// 위가 둥근 창(시안 ②)이다. 창 테는 연두 종이 테(10px)에 먹색 종이 선(--paper-edge)을 안팎으로 두르고, 창 안(유리 칸)은 선생님 방(명단
// color.room 벽 + 아래 바닥 띠)이며 초상은 그 위에 아래 끝을 맞춰 그린다. 테이프는 유리 칸 밖 오른쪽 위 모서리라 머리 · 얼굴을 가리지
// 않는다. 창 바로 아래 흰 종이 이름표 '[이름] 선생님'(먹색 Jua 24px · −2° — accent 바탕 이름표는 대비 6.1~6.8:1 이라 바꿈, C141 이름표
// 줄). 창의 접근 이름도 같다. 초상일 때 상태: 창 오른쪽 아래 둥근 표지 하나(듣기 마이크 · 말하기 accent 물결 · 생각 점 셋 · 칭찬 별)와,
// 말하기 · 듣기는 창 둘레 테(말하기 accent 제자리 깜빡임 · 듣기 연두 테 — 깜빡이지 않음, U5-12 · C166)다. 움직임 줄이기면 멈춘 꼴이고
// 쉬기는 표시 없음. 넘김 효과(transition)를 두지 않는다. 시제품의 영어 자막 · 상태 이름 띠 · 머리글은 없다(C115).
// 3D(plan 값 14 — d8): 그림 층 보관 조각의 공유 값이 3d 이고 회화 틀이 '시작!'을 누른 뒤(started)면 유리 칸에 3D 캔버스를 보이고
// 초상 · 상태 표시를 숨긴다('시작!' 화면은 3D 가 먼저 되어도 초상 — 정할 것 8). 칸은 늘 두어 그림 층이 캔버스를 미리 붙인다. 3D 칸은
// 투명이라 바탕이 같은 방 벽 · 바닥 띠다(캔버스 alpha). 대신 표시로 갔으면 초상에 까닭 속성(data-teacher-fallback)을 단다 — 아이에게
// 오류 글 · 단추는 없다(C122). 이 조각은 그림 파일과 스타일만 쓴다(3D 코드는 그림 층이 따로 불러옴, NFR-U3).
import { ICON_STROKE } from "@/components/board/board";
import { paperLookOf } from "@/components/board/paper-key";
import { useTeacherLayer } from "@/components/teacher/teacher-layer";
import { TeacherPortrait } from "@/components/teacher/teacher-portrait";
import { TEACHER_TEXT } from "@/core/teacher/name";
import type { TeacherView } from "@/core/teacher/roster";
import type { TeacherState } from "@/core/teacher/state";
import { cn } from "@/lib/utils";

/**
 * 창(위가 둥근 유리 칸 + 테) 크기(px, 화면 꼴 상수 — C72 꼴, 설정값이 아니다). 가로는 시안 ② 262 × 288 기준(화면 검토 7-가 가 정함),
 * 세로는 이름표까지 옛 창 높이(200, 화면 검토 1 M-1 — 세로 힌트 화면이 1180 안에) 안에 들게 잡은 잠정 값이다. 가로 화면은 lg 이상.
 */
export const TEACHER_WINDOW_PX = {
  landscape: { width: 262, height: 288 },
  portrait: { width: 176, height: 152 },
} as const;
/** 창 테 · 모양(px · %, 시안 ②): 연두 테 두께 · 아래 모서리 · 둘레 테 간격(창 밖 8px) · 바닥 띠 시작(창 안 높이 %) · 바닥 띠의 방 색 몫(%, 나머지는 먹색). */
export const WINDOW_FRAME = {
  edge: 10,
  bottomRadius: 26,
  ringGap: 8,
  floorTop: 78,
  floorRoom: 90,
} as const;
/** 위 크기 · 모양을 글자 그대로(Tailwind 는 소스 글을 훑어 클래스를 만든다 — 템플릿 글로 만들지 않는다, 단위 시험이 같은 수인지 본다). */
export const WINDOW_SIZE_CLASS =
  "h-[152px] w-[176px] lg:h-[288px] lg:w-[262px]";
/** 위가 반원(너비의 절반)인 창 모서리. */
export const WINDOW_SHAPE_CLASS =
  "rounded-t-[88px] rounded-b-[26px] lg:rounded-t-[131px]";
/** 창 둘레 테(창 밖 ringGap) 모서리 — 창 모서리에 간격을 더한 값. */
export const RING_SHAPE_CLASS =
  "rounded-t-[96px] rounded-b-[34px] lg:rounded-t-[139px]";
/** 오른쪽 아래 상태 표지(시안 ② 58px 동그라미 · 먹색 3px 테, 세로는 작게). 표지마다 같은 꼴이고 안 그림만 바뀐다. */
export const STATUS_BADGE_CLASS =
  "absolute right-[6px] bottom-[8px] z-10 flex size-[44px] items-center justify-center rounded-full border-[3px] border-ink bg-paper lg:size-[58px]";
/** 창 테 먹색 선(안 · 밖)과 그림자(시안 ② — 종이 선 2.6px 토큰 · 카드 그림자 토큰). */
const GLASS_EDGE_CLASS =
  "shadow-[0_0_0_var(--paper-edge)_var(--color-ink),var(--shadow-postit)]";
const GLASS_INNER_LINE_CLASS =
  "shadow-[inset_0_0_0_var(--paper-edge)_var(--color-ink)]";
/**
 * 창 밖 테이프(px · °): 크기와, 오른쪽 위 모서리에서 테이프 가운데까지(가로 · 세로 같은 값을 둘 다 — 45° 선 위). 반원 아치 바깥 모서리
 * 빈 곳에 놓여 연두 테에만 걸치고 유리 칸(머리 · 얼굴)에는 닿지 않으며, 끝이 창 위 밖으로 조금 나온다.
 */
export const WINDOW_TAPE = {
  width: 84,
  height: 22,
  angle: 45,
  fromCorner: { portrait: 24, landscape: 34 },
} as const;
/** 위 자리를 글자 그대로(top = 거리 − 두께/2, right = 거리 − 길이/2). */
export const WINDOW_TAPE_CLASS =
  "top-[13px] right-[-18px] lg:top-[23px] lg:right-[-8px]";
/** 이름표 색 토큰(먹색 글자 · 흰 종이 바탕 — NFR-U1 7:1 이상, 단위 시험이 globals.css 값으로 잰다). */
export const NAME_TAG_TONE = { text: "ink", bg: "paper" } as const;
/** 초상을 읽지 못했을 때 글자 동그라미 지름(px, 화면 꼴 값). */
const INITIAL_PX = 96;
/** 생각 중 점 수 · 점마다 늦춤(화면 꼴 값 — 말풍선 기다림 점과 같은 값). */
const DOTS = [0, 1, 2] as const;
const DOT_DELAY_MS = 150;

/** 초상일 때 상태 표지(쉬기는 없음). */
type Indicator = "speaking" | "thinking" | "praise" | "listening";
/** 창 둘레 테가 있는 상태(R-27: 말하기 accent · 듣기 연두). */
type Ring = "speaking" | "listening";

/** 상태 → 오른쪽 아래 표지 하나 · 창 둘레 테(순수). 3D 를 보이는 동안에는 둘 다 없다(몸짓이 상태를 보인다). */
export function windowStatusOf(
  state: TeacherState,
  show3d: boolean,
): { badge: Indicator | undefined; ring: Ring | undefined } {
  if (show3d || state === "idle") return { badge: undefined, ring: undefined };
  return {
    badge: state,
    ring: state === "speaking" || state === "listening" ? state : undefined,
  };
}

/** 방 바탕(순수): 방 색 벽과 아래 바닥 띠(방 색에 먹색을 조금 섞음). 같은 방 색이면 같은 값이다. */
export function roomBackgroundOf(room: string): string {
  const { floorTop, floorRoom } = WINDOW_FRAME;
  return `linear-gradient(${room} 0 ${floorTop}%, color-mix(in oklab, ${room} ${floorRoom}%, var(--color-ink)) ${floorTop}% 100%)`;
}

/** 창 밖 테이프 꼴(크기 · 각도 · 색). 색은 선생님 키로 고른 tape-1~5 토큰(같은 선생님은 늘 같은 색). 자리는 WINDOW_TAPE_CLASS. */
function windowTapeStyle(teacherKey: string): CSSProperties {
  const { width, height, angle } = WINDOW_TAPE;
  return {
    "--tape-tone": `var(--color-${paperLookOf(`teacher-window:${teacherKey}`).tapeTone})`,
    width,
    height,
    rotate: `${angle}deg`,
  } as CSSProperties;
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
  const { badge, ring } = windowStatusOf(state, show3d);
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
      className="relative m-0 flex shrink-0 flex-col items-center"
    >
      <div data-teacher-frame="" className={cn(WINDOW_SIZE_CLASS, "relative")}>
        {/* 창 둘레 테(R-27): 말하기는 accent 색 제자리 깜빡임(창 밖 8px 안 — 퍼지는 물결은 위 띠 제목을 지나서 쓰지 않음, 화면 검토 1
            M-3), 듣기는 연두 테(깜빡이지 않아 말하기와 다르다, U5-12). 움직임 줄이기면 멈춘 테 */}
        {ring === "speaking" ? (
          <span
            aria-hidden
            data-teacher-ring="speaking"
            className={cn(
              RING_SHAPE_CLASS,
              "pointer-events-none absolute -inset-2 border-4",
              motion("motion-safe:animate-pulse"),
            )}
            style={{ borderColor: teacher.color.accent }}
          />
        ) : null}
        {ring === "listening" ? (
          <span
            aria-hidden
            data-teacher-ring="listening"
            className={cn(
              RING_SHAPE_CLASS,
              "pointer-events-none absolute -inset-2 border-4 border-postit-talk",
            )}
          />
        ) : null}
        {/* 테이프는 유리 칸 밖(앞 형제) — 머리 · 얼굴을 가리지 않는다 */}
        <span
          aria-hidden
          data-tape="window"
          className={cn(
            WINDOW_TAPE_CLASS,
            "paper-tape pointer-events-none z-10",
          )}
          style={windowTapeStyle(teacher.key)}
        />
        <div
          data-teacher-glass=""
          className={cn(
            WINDOW_SHAPE_CLASS,
            GLASS_EDGE_CLASS,
            "relative size-full overflow-hidden border-[10px] border-postit-talk",
          )}
          style={{ background: roomBackgroundOf(teacher.color.room) }}
        >
          {layer ? (
            // 3D 칸: 그림 층 보관 조각이 캔버스를 붙인다(투명 캔버스라 방 벽 · 바닥 띠가 바탕, 초상일 때는 숨김 — 넘김 효과 없음)
            <div
              ref={layer.attach}
              data-teacher-slot=""
              aria-hidden
              className={cn("absolute inset-0", !show3d && "hidden")}
            />
          ) : null}
          {brokenSrc === teacher.portraitPath ? (
            show3d ? null : (
              <span className="absolute inset-0 flex items-center justify-center">
                <TeacherPortrait teacher={null} size={INITIAL_PX} />
              </span>
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
              // 아래 끝을 창 아래에 맞춰 담는다(머리 위는 방 벽 — 어깨가 잘리지 않게)
              className={cn(
                "absolute inset-0 size-full object-contain object-bottom",
                show3d && "hidden",
              )}
            />
          )}
          {/* 창 테 안쪽 먹색 선(그림 위) */}
          <span
            aria-hidden
            className={cn(
              GLASS_INNER_LINE_CLASS,
              "pointer-events-none absolute inset-0 rounded-[inherit]",
            )}
          />
        </div>
        {badge === "speaking" ? (
          <span
            aria-hidden
            data-teacher-indicator="speaking"
            className={STATUS_BADGE_CLASS}
          >
            <AudioLines
              className="size-6 lg:size-8"
              strokeWidth={ICON_STROKE}
              style={{ color: teacher.color.accent }}
            />
          </span>
        ) : null}
        {badge === "listening" ? (
          <span
            aria-hidden
            data-teacher-indicator="listening"
            className={STATUS_BADGE_CLASS}
          >
            <Mic
              className="size-6 text-ink lg:size-8"
              strokeWidth={ICON_STROKE}
            />
          </span>
        ) : null}
        {badge === "thinking" ? (
          <span
            aria-hidden
            data-teacher-indicator="thinking"
            className={cn(STATUS_BADGE_CLASS, "gap-1")}
          >
            {DOTS.map((i) => (
              <span
                key={i}
                className={cn(
                  "size-2 rounded-full bg-ink lg:size-2.5",
                  motion("motion-safe:animate-bounce"),
                )}
                style={{ animationDelay: `${i * DOT_DELAY_MS}ms` }}
              />
            ))}
          </span>
        ) : null}
        {badge === "praise" ? (
          <span
            aria-hidden
            data-teacher-indicator="praise"
            className={cn(
              STATUS_BADGE_CLASS,
              motion("motion-safe:animate-bounce"),
            )}
          >
            <Star
              className="size-6 fill-postit-reading text-ink lg:size-8"
              strokeWidth={ICON_STROKE}
            />
          </span>
        ) : null}
      </div>
      <figcaption
        // 색은 NAME_TAG_TONE 과 같은 글자(템플릿으로 만들지 않는다 — 단위 시험이 같은지 본다)
        className="mt-1 -rotate-2 truncate rounded-card border-(length:--paper-edge) border-ink bg-paper px-5 py-1 text-center font-heading text-[24px] text-ink leading-tight shadow-postit lg:mt-[14px]"
      >
        {name}
      </figcaption>
    </figure>
  );
}
