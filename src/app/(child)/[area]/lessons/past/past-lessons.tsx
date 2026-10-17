"use client";

// 지난 단원의 수업 고르기(4절 수업 목록 표 '지난 수업' 행 · 3.2, plan-p10b 값 7). 고르면 세션을 연다(수업 목록과 같은 useLessonStart —
// 서버가 다시 판정, 하던 수업이 있으면 서버가 needs_confirm 을 돌려주고 쪽지로 한 번 묻는다).
import { useEffect, useState } from "react";
import { ConfirmSheet, PostIt, StatusLine } from "@/components/board/board";
import type { PastItem } from "@/core/lesson-list/state";
import type { Area } from "@/core/seed/structure";
import { LESSON_START_TEXT, useLessonStart } from "../use-lesson-start";

const UNTRIED = "안 해 본 수업";

export function PastLessons({
  area,
  items,
}: {
  area: Exclude<Area, "talk">;
  items: PastItem[];
}) {
  const { start, busy, status, asking, setAsking } = useLessonStart();
  // 하이드레이션 끝 표시(e2e 가 누르기 전에 기다린다)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return (
    <>
      <section
        data-past-lessons=""
        data-hydrated={hydrated ? "" : undefined}
        className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-6"
      >
        {items.map((item, i) => (
          <PostIt
            key={`${item.ref.kind}-${item.ref.lessonNo}`}
            tone={area}
            tilt={i % 2 === 0 ? "left" : "slight"}
            onClick={() => {
              if (!busy) void start(item.lessonId);
            }}
            className="min-h-36 gap-2 p-4 pt-8"
          >
            <span
              data-lesson={`${item.ref.kind}-${item.ref.lessonNo}`}
              className="contents"
            >
              <span className="font-heading text-4xl leading-none">
                {item.ref.lessonNo}
              </span>
              <span>{item.title}</span>
              {item.mark === "untried" ? (
                <span className="self-start rounded-md border-2 border-ink px-2 font-heading text-[22px]">
                  {UNTRIED}
                </span>
              ) : null}
            </span>
          </PostIt>
        ))}
      </section>
      <StatusLine tone="error">{status}</StatusLine>
      <ConfirmSheet
        open={asking !== undefined}
        message={LESSON_START_TEXT.confirm}
        confirmLabel={LESSON_START_TEXT.newLesson}
        cancelLabel={LESSON_START_TEXT.keepGoing}
        onConfirm={() => {
          const lessonId = asking;
          setAsking(undefined);
          if (lessonId) void start(lessonId, true);
        }}
        onCancel={() => setAsking(undefined)}
      />
    </>
  );
}
