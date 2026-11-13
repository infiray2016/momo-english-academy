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

/**
 * 넘김 사건 뒤 맨 아래에 붙어 있는가(순수): 앱이 맨 아래로 맞춘 자리(setAt) 그대로면 그 사이 글이 자라 남은 거리가 생겼어도 붙어 있다(앱이 낸
 * 넘김 사건이 늦게 와 다음 자람을 아이의 넘김으로 읽지 않게). 그 밖(아이가 넘김 · 브라우저가 자리를 줄임)은 talkLogPinnedOf 다.
 */
export function talkLogPinnedAfterScrollOf({
  scrollTop,
  scrollHeight,
  clientHeight,
  setAt,
}: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  /** 앱이 마지막으로 맨 아래로 맞춘 scrollTop(그 뒤 아이가 넘겼으면 null). */
  setAt: number | null;
}): boolean {
  if (setAt !== null && Math.abs(scrollTop - setAt) <= TALK_LOG_PIN_SLACK_PX)
    return true;
  return talkLogPinnedOf({ scrollTop, scrollHeight, clientHeight });
}

/**
 * 기록 칸을 맨 아래로 다시 맞출까(순수, 정본 03 4절 94줄 '지금 턴이 맨 아래' · '위로 넘겨 다시 본다', 화면 검토 C-1 · M-6): 새 차례(줄 수 ·
 * 지금 턴 열쇠가 바뀜)면 늘 맞춘다. 그 밖에는 마지막으로 넘김이 멈춘 때 맨 아래에 붙어 있었고(pinned), 지금 턴 영역이 자랐거나(글이 흐름 · 뜻 줄
 * · 듣기 단추 · 막힌 뒤 뜻 · 기다림 줄) 칸 자체의 높이가 바뀌었을 때(기기를 돌림)만 맞춘다. 아이가 위로 넘겨 지난 말을 보는 중이면 끌어내리지
 * 않는다.
 */
export function talkLogFollowOf({
  newTurn,
  pinned,
  nowGrew,
  boxResized,
}: {
  newTurn: boolean;
  pinned: boolean;
  nowGrew: boolean;
  boxResized: boolean;
}): boolean {
  if (newTurn) return true;
  return pinned && (nowGrew || boxResized);
}

/**
 * 대화 기록 칸. entries 가 늘거나 지금 턴(children)이 바뀌면 맨 아래로 넘긴다(bottomKey). 그 뒤 지금 턴 영역 · 지난 줄 영역이 자라거나 칸 높이가 바뀌면,
 * 맨 아래에 붙어 있던 때만 다시 맨 아래로 맞춘다(talkLogFollowOf — 움직임 없이). 칸 높이는 부르는 쪽 배치가 정하고(className), 기본은 화면
 * 높이의 상한 안에서 넘겨 보는 칸이다.
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
  /** 마지막으로 넘김이 멈춘 때 맨 아래에 붙어 있었나(넘김 사건마다 다시 잼 — 글이 자라는 것만으로는 바뀌지 않는다). */
  const pinned = useRef(true);
  /** 앱이 마지막으로 맨 아래로 맞춘 자리(talkLogPinnedAfterScrollOf). */
  const setAt = useRef<number | null>(null);
  const hasNow = Boolean(children);
  /** 맞출 때면 맨 아래로(움직임 없이 — 넘김 사건이 pinned 를 다시 잰다). */
  const follow = useRef(
    (
      el: HTMLDivElement,
      change: { newTurn: boolean; nowGrew: boolean; boxResized: boolean },
    ) => {
      if (!talkLogFollowOf({ ...change, pinned: pinned.current })) return;
      pinned.current = true;
      el.scrollTop = el.scrollHeight;
      setAt.current = el.scrollTop;
    },
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: 줄 수 · 지금 턴 열쇠가 바뀔 때만 맨 아래로(새 차례)
  useEffect(() => {
    const el = box.current;
    if (el)
      follow.current(el, { newTurn: true, nowGrew: false, boxResized: false });
  }, [entries.length, bottomKey]);
  // 지금 턴 영역 · 지난 줄 영역이 자라거나 칸 높이가 바뀌면(기기를 돌림) 붙어 있던 때만 다시 맨 아래로(C-1 · M-6 · rev-s5 M-2 — 지난 줄
  // 영역의 자람은 지금 턴 영역의 자람과 같게 nowGrew 로 넘긴다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 지금 턴 영역이 생기거나 없어지면(now.current 가 바뀜) 다시 지켜본다
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onScroll = () => {
      pinned.current = talkLogPinnedAfterScrollOf({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        setAt: setAt.current,
      });
      // 앱이 맞춘 자리를 떠났으면(아이가 넘김) 그 자리는 더 보지 않는다
      if (
        setAt.current !== null &&
        Math.abs(el.scrollTop - setAt.current) > TALK_LOG_PIN_SLACK_PX
      )
        setAt.current = null;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    if (typeof ResizeObserver === "undefined")
      return () => el.removeEventListener("scroll", onScroll);
    const heights = new Map<Element, number>();
    const observer = new ResizeObserver((records) => {
      let nowGrew = false;
      let boxResized = false;
      for (const record of records) {
        const height = record.contentRect.height;
        const before = heights.get(record.target);
        heights.set(record.target, height);
        if (before === undefined) continue;
        if (record.target === el) boxResized ||= height !== before;
        else nowGrew ||= height > before;
      }
      follow.current(el, { newTurn: false, nowGrew, boxResized });
    });
    observer.observe(el);
    if (past.current) observer.observe(past.current);
    if (now.current) observer.observe(now.current);
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", onScroll);
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
