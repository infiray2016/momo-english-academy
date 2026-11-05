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

/**
 * 대화 기록 칸. entries 가 늘거나 지금 턴(children)이 바뀌면 맨 아래로 넘긴다(bottomKey). 칸 높이는 부르는 쪽 배치가 정하고(className),
 * 기본은 화면 높이의 상한 안에서 넘겨 보는 칸이다.
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: 줄 수 · 지금 턴 열쇠가 바뀔 때만 맨 아래로
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length, bottomKey]);
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
      <div role="log" className="flex flex-col gap-4">
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
      {children ? (
        <div data-talk-log-now="" aria-live="off">
          {children}
        </div>
      ) : null}
    </div>
  );
}
