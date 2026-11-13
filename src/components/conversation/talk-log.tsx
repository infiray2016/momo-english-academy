"use client";

// 회화 대화 기록 칸(회화 plan 묶음 10 · 정본 03 4절 '대화 기록' 행 · C119 · C164 · T2). 인사 · 대화 토막(더 이야기하기 포함)의 말풍선 칸이다.
// 지난 턴이 위로 쌓이고 지금 턴(틀이 children 으로 넘기는 선생님 말풍선 · 아이 차례)은 맨 아래에 있으며, 위로 넘겨 다시 본다. 줄은
// core/conversation/log 의 talkLogOf(이어 하기 — talk_turns) · liveTeacherEntryOf · childLogEntryOf(살아 있는 턴)가 고른다. 지난 선생님 말을
// 누르면 그 말만 다시 읽는다(onReplay — 틀의 읽기 줄이 선생님 목소리 · 단계 빠르기 · 문장 사이 쉼으로 읽는다, 7절 · C125. 소리 줄은 기록에
// 없으므로 다시 들려주지 않는다). 짧은 준비 · 바닥선 듣기 활동 화면에는 이 칸이 없다. 자유 대화 (나)가 같은 조각을 다시 쓴다(C120).
import { type ReactNode, useEffect, useRef } from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import { FOCUS_RING } from "@/components/board/board";
import { ChildBubble } from "@/components/conversation/child-turn";
import { BUBBLE_CLASS, BUBBLE_WIDTH } from "@/components/conversation/tori";
import { fillName } from "@/core/ai/mask";
import {
  type TalkLogEntry,
  type TalkLogReplayItem,
  talkLogReplayOf,
} from "@/core/conversation/log";
import { TEACHER_TEXT } from "@/core/teacher/name";
import { cn } from "@/lib/utils";

/** 지난 선생님 말 한 줄(누르면 그 말만 다시 읽음). */
function PastTeacher({
  entry,
  englishName,
  teacherName,
  listening,
  onReplay,
}: {
  entry: Extract<TalkLogEntry, { who: "teacher" }>;
  englishName: string;
  teacherName?: string | undefined;
  listening: boolean;
  onReplay: (items: TalkLogReplayItem[]) => void;
}) {
  const ko = entry.lines.flatMap((l) => (l.ko ? [l.ko] : []));
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        data-talk-log-teacher=""
        aria-label={TEACHER_TEXT.replay(teacherName)}
        // 듣는 동안은 끈다(누르면 듣기가 안내 없이 끝남 — 7절 말하기 버튼 행)
        disabled={listening}
        onClick={() => onReplay(talkLogReplayOf(entry))}
        className={cn(
          FOCUS_RING,
          CHILD_SIZE.target,
          BUBBLE_CLASS,
          BUBBLE_WIDTH,
          "text-left",
        )}
      >
        <span
          lang="en"
          className={cn(
            CHILD_SIZE.english,
            "flex flex-col gap-1 font-en font-bold leading-snug",
          )}
        >
          {entry.lines.map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 화면 글 차례가 곧 열쇠다
            <span key={i} className="block">
              {fillName(line.en, englishName)}
            </span>
          ))}
        </span>
      </button>
      {ko.length > 0 ? (
        <p data-talk-log-ko="" className={cn(CHILD_SIZE.guide, "px-2")}>
          {ko.map((line) => fillName(line, englishName)).join(" ")}
        </p>
      ) : null}
    </div>
  );
}

/** 맨 아래에 붙어 있다고 볼 남은 넘김 거리(px, 화면 꼴 값 — 소수 화소 반올림만큼). */
export const TALK_LOG_PIN_SLACK_PX = 2;

/** 기록 칸이 맨 아래에 붙어 있는가(순수): 남은 넘김 거리가 TALK_LOG_PIN_SLACK_PX 안. 넘치지 않는 칸은 늘 붙어 있다. */
export function talkLogPinnedOf({
  scrollTop,
  scrollHeight,
  clientHeight,
}: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}): boolean {
  return scrollHeight - scrollTop - clientHeight <= TALK_LOG_PIN_SLACK_PX;
}

/** 손가락이 touchstart 뒤 아래로 이만큼 넘게 가 있어야 위로 넘기려는 손짓이다(px, 화면 꼴 값 — 누르기만 한 손의 떨림은 세지 않는다). */
export const TALK_LOG_PULL_PX = 8;

/** 위로 넘기려는 입력(휠 · 키 · 키보드 초점 · 아래로 끄는 손의 움직임)에서 이 시간 안의 넘김 사건은 아이가 위로 넘긴 것으로 본다(ms, 화면 꼴 값 — 손을 뗀 뒤 미끄러지는 넘김 포함). */
export const TALK_LOG_UP_INTENT_MS = 300;

/**
 * 손가락이 touchstart 뒤 아래로 간 순거리(순수, S5 fix 6): 바뀐 값을 더하고 0 아래로는 내려가지 않는다. 멈추거나 조금 되돌아도 쌓인 거리를 잃지
 * 않아, 느리게 끌거나 떨며 끄는 손도 문턱(TALK_LOG_PULL_PX)을 넘는다(rev-s5-4 N-1 (나)).
 */
export function talkLogPullOf({
  pull,
  dy,
}: {
  pull: number;
  /** 손가락 세로 자리의 바뀐 값(px, 아래로 가면 양수). */
  dy: number;
}): number {
  return Math.max(0, pull + dy);
}

/** 위로 가는 키인가(순수, S5 fix 5): ArrowUp · PageUp · Home · Shift 와 함께 누른 Space. */
export function talkLogUpKeyOf({
  key,
  shiftKey,
}: {
  key: string;
  shiftKey: boolean;
}): boolean {
  if (key === "ArrowUp" || key === "PageUp" || key === "Home") return true;
  return key === " " && shiftKey;
}

/**
 * 아이가 위로 넘기려는 중인가(순수, S5 fix 6): 위로 넘기려는 입력이 마지막으로 있던 때에서 TALK_LOG_UP_INTENT_MS 안이다(때로만 판단한다 —
 * 손가락이 아래로 충분히 가 있는 동안은 손이 움직일 때마다 그 때를 새로 적는다). 넘김 자리만으로는 아이가 넘긴 것과 브라우저가 자리를 줄인 것(지금
 * 턴이 줄었다가 다시 커짐)을 가를 수 없고, 칸 안을 누르기만 한 것도 넘김이 아니므로 위로 넘기려는 입력으로 가른다(rev-s5-3 I-1 · rev-s5-4 N-1).
 */
export function talkLogUpwardOf({
  now,
  upAt,
}: {
  /** 넘김 사건을 처리하는 때(ms). */
  now: number;
  /** 위로 넘기려는 입력이 마지막으로 있던 때(ms, 없었으면 -Infinity). */
  upAt: number;
}): boolean {
  return now - upAt <= TALK_LOG_UP_INTENT_MS;
}

/**
 * 넘김 사건 뒤 맨 아래에 붙어 있는가(순수, S5 fix 5): 맨 아래(talkLogPinnedOf)에 닿았으면 어떤 넘김이든 다시 붙고(rev-s5-3 M-2), 맨 아래가 아니고
 * 위로 넘기려는 중이면 풀린다. 그 밖(앱이 맞춤 · 브라우저가 자리를 줄임 · 누르기만 함)에는 바꾸지 않는다 — 남은 넘김 거리가 생겨 있어도
 * 따라가기를 잃지 않게. 맨 아래에 닿은 사건은 붙이기만 하고 넘기려는 입력을 지우지 않는다(S5 fix 6 · rev-s5-4 N-1 (가)).
 */
export function talkLogPinnedAfterScrollOf({
  pinned,
  atBottom,
  upward,
}: {
  /** 이 넘김 사건 앞의 붙어 있음. */
  pinned: boolean;
  /** 넘김 자리가 맨 아래(여유 안)인가. */
  atBottom: boolean;
  /** 위로 넘기려는 중인가(talkLogUpwardOf). */
  upward: boolean;
}): boolean {
  if (atBottom) return true;
  if (upward) return false;
  return pinned;
}

/**
 * 기록 칸을 맨 아래로 다시 맞출까(순수, 정본 03 4절 94줄 '지금 턴이 맨 아래' · '위로 넘겨 다시 본다', 화면 검토 C-1 · M-6 · C241 보완 3): 새 차례(줄
 * 수 · 지금 턴 열쇠가 바뀜)면 늘 맞춘다. 그 밖(크기 알림 — 지금 턴 · 지난 줄 영역 · 칸의 크기가 바뀜, 첫 알림 포함)에는 붙어 있을 때만 맞춘다. 아이가
 * 위로 넘겨 지난 말을 보는 중이면 끌어내리지 않는다.
 */
export function talkLogFollowOf({
  newTurn,
  pinned,
}: {
  newTurn: boolean;
  pinned: boolean;
}): boolean {
  return newTurn || pinned;
}

/**
 * 대화 기록 칸. entries 가 늘거나 지금 턴(children)이 바뀌면 맨 아래로 넘긴다(bottomKey). 그 밖에는 지금 턴 영역 · 지난 줄 영역 · 칸의 크기가 바뀔
 * 때마다(첫 알림 포함) 맨 아래에 붙어 있으면 다시 맨 아래로 맞춘다(talkLogFollowOf — 움직임 없이). 붙어 있음은 아이가 위로 넘기려는 입력이 있을 때만
 * 풀리고(talkLogUpwardOf), 어떤 넘김이든 맨 아래에 닿으면 다시 붙는다(talkLogPinnedAfterScrollOf · S5 fix 5 · S5 fix 6). 칸 높이는 부르는 쪽 배치가 정하고(className), 기본은 화면 높이의 상한 안에서 넘겨 보는 칸이다.
 */
export function TalkLog({
  entries,
  englishName,
  teacherName,
  listening = false,
  onReplay,
  bottomKey,
  className,
  children,
}: {
  entries: readonly TalkLogEntry[];
  englishName: string;
  /** 세션 선생님 한글 이름(접근 이름 '[이름] 말 다시 듣기' — 없으면 '선생님'). */
  teacherName?: string | undefined;
  /** 아이 차례가 듣는 중인가. */
  listening?: boolean;
  /** 지난 선생님 말 누름 — 그 말을 문장마다 다시 읽는다(talkLogReplayOf — 읽기 줄 replay 에 그대로 넘긴다). */
  onReplay: (items: TalkLogReplayItem[]) => void;
  /** 지금 턴이 바뀐 열쇠(바뀌면 맨 아래로). */
  bottomKey?: string | number;
  className?: string;
  /** 지금 턴(선생님 말풍선 · 아이 차례). */
  children?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const now = useRef<HTMLDivElement>(null);
  /** 지난 줄 영역(role log) — 글꼴이 늦게 바뀌거나 너비만 바뀌어 지난 줄이 자라도 지금 턴이 칸 아래로 밀리지 않게 함께 지켜본다(검토 rev-s5 M-2). */
  const past = useRef<HTMLDivElement>(null);
  /** 맨 아래에 붙어 있는가(위로 넘기려는 입력이 있는 넘김에서만 풀림 — 글이 자라거나 브라우저가 자리를 줄이는 것으로는 풀리지 않는다). */
  const pinned = useRef(true);
  /** 닿아 있는 손가락의 마지막 세로 자리(px, 닿아 있지 않으면 null). */
  const lastY = useRef<number | null>(null);
  /** 손가락이 touchstart 뒤 아래로 간 순거리(px, talkLogPullOf). */
  const pull = useRef(0);
  /** 위로 넘기려는 입력이 마지막으로 있던 때(ms). */
  const upAt = useRef(Number.NEGATIVE_INFINITY);
  const hasNow = Boolean(children);
  /** 맞출 때면 맨 아래로(움직임 없이). */
  const follow = useRef((el: HTMLDivElement, newTurn: boolean) => {
    if (!talkLogFollowOf({ newTurn, pinned: pinned.current })) return;
    pinned.current = true;
    if (newTurn) {
      upAt.current = Number.NEGATIVE_INFINITY;
      pull.current = 0;
    }
    el.scrollTop = el.scrollHeight;
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: 줄 수 · 지금 턴 열쇠가 바뀔 때만 맨 아래로(새 차례)
  useEffect(() => {
    const el = box.current;
    if (el) follow.current(el, true);
  }, [entries.length, bottomKey]);
  // 위로 넘기려는 입력(손가락을 아래로 끎 · 위로 가는 휠 · 위로 가는 키 · 키보드로 옮긴 초점)의 때를 적고, 넘김 사건에 맨 아래면 다시 붙이고 위로
  // 넘기려는 중이면 푼다. 지금 턴 영역 · 지난 줄 영역 · 칸의 크기가 바뀔 때마다(첫 알림 포함, 커졌든 줄었든) 붙어 있으면 다시 맨 아래로
  // (C-1 · M-6 · rev-s5 M-2 · S5 fix 5 · S5 fix 6)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 지금 턴 영역이 생기거나 없어지면(now.current 가 바뀜) 다시 지켜본다
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const markUp = () => {
      upAt.current = performance.now();
    };
    // 합성 사건으로도 점검하므로 손가락 자리는 touches[0].clientY 로만 읽는다
    const onTouchStart = (event: Event) => {
      lastY.current = (event as TouchEvent).touches?.[0]?.clientY ?? null;
      pull.current = 0;
    };
    // 손가락이 아래로 충분히 가 있는 동안은 움직일 때마다 넘기려는 때를 새로 적는다(손을 뗀 뒤 미끄러지는 넘김도 그 때에서 잰다 · S5 fix 6)
    const onTouchMove = (event: Event) => {
      const y = (event as TouchEvent).touches?.[0]?.clientY;
      if (y === undefined) return;
      if (lastY.current !== null)
        pull.current = talkLogPullOf({
          pull: pull.current,
          dy: y - lastY.current,
        });
      lastY.current = y;
      if (pull.current > TALK_LOG_PULL_PX) markUp();
    };
    // 칸에서만 받는다. 손이 닿은 요소가 사라져 오지 않아도 넘기려는 때가 지나면 넘기려는 중이 아니게 되고, 다음 touchstart 에서 0 이 된다(rev-s5-4 N-2)
    const onTouchEnd = () => {
      lastY.current = null;
      pull.current = 0;
    };
    const onWheel = (event: Event) => {
      if ((event as WheelEvent).deltaY < 0) markUp();
    };
    const onKeyDown = (event: Event) => {
      const { key, shiftKey } = event as KeyboardEvent;
      if (talkLogUpKeyOf({ key, shiftKey })) markUp();
    };
    // 키보드로 옮긴 초점만 센다(눌러서 생긴 초점은 넘기려는 입력이 아니다)
    const onFocusIn = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      let keyboard = false;
      try {
        keyboard = target.matches(":focus-visible");
      } catch {
        keyboard = false;
      }
      if (keyboard) markUp();
    };
    // 맨 아래면 붙이기만 한다 — 넘기려는 입력을 지우지 않는다(부드럽게 시작하는 넘김의 첫 사건은 아직 맨 아래에 있다 · rev-s5-4 N-1 (가))
    const onScroll = () => {
      pinned.current = talkLogPinnedAfterScrollOf({
        pinned: pinned.current,
        atBottom: talkLogPinnedOf({
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        }),
        upward: talkLogUpwardOf({
          now: performance.now(),
          upAt: upAt.current,
        }),
      });
    };
    const listeners: [string, (event: Event) => void][] = [
      ["touchstart", onTouchStart],
      ["touchmove", onTouchMove],
      ["touchend", onTouchEnd],
      ["touchcancel", onTouchEnd],
      ["wheel", onWheel],
      ["keydown", onKeyDown],
      ["focusin", onFocusIn],
      ["scroll", onScroll],
    ];
    for (const [type, fn] of listeners)
      el.addEventListener(type, fn, { passive: true });
    const unlisten = () => {
      for (const [type, fn] of listeners) el.removeEventListener(type, fn);
    };
    if (typeof ResizeObserver === "undefined") return unlisten;
    const observer = new ResizeObserver(() => follow.current(el, false));
    observer.observe(el);
    if (past.current) observer.observe(past.current);
    if (now.current) observer.observe(now.current);
    return () => {
      observer.disconnect();
      unlisten();
    };
  }, [hasNow]);
  return (
    <div
      ref={box}
      data-talk-log=""
      className={cn(
        "flex max-h-[60dvh] min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-1 py-2",
        className,
      )}
    >
      {/* 알림 칸(role log = aria-live polite)은 지난 줄만 — 흘러나오는 지금 턴은 넣지 않는다(검토 M-4) */}
      <div ref={past} role="log" className="flex flex-col gap-4">
        {entries.map((entry) =>
          entry.who === "teacher" ? (
            <PastTeacher
              key={entry.key}
              entry={entry}
              englishName={englishName}
              teacherName={teacherName}
              listening={listening}
              onReplay={onReplay}
            />
          ) : (
            <ChildBubble key={entry.key} said={entry.said} />
          ),
        )}
      </div>
      {hasNow ? (
        <div ref={now} data-talk-log-now="" aria-live="off">
          {children}
        </div>
      ) : null}
    </div>
  );
}
