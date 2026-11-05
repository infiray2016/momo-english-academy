"use client";

// 지난 단원의 수업 고르기(4절 수업 목록 표 '지난 수업' 행 · 3.2, plan-p10b 값 7). 고르면 세션을 연다(수업 목록과 같은 useLessonStart —
// 서버가 다시 판정, 하던 수업이 있으면 서버가 needs_confirm 을 돌려주고 쪽지로 한 번 묻는다).
// 쉼(UI · UX 묶음 0-가 · 3절 R-15 · N-8): 쪽과 띠의 링크를 그대로 두고 누른 카드 아래 한 줄 칸에 쉼 글, 다시 누르면 다시 판정한다.
import { Fragment, useEffect, useState } from "react";
import {
  ConfirmSheet,
  PaperBand,
  PostIt,
  SmallLink,
  StatusLine,
} from "@/components/board/board";
import { AiRestLine } from "@/components/session/ai-rest";
import { WaitHint } from "@/components/session/wait-hint";
import type { PastItem } from "@/core/lesson-list/state";
import type { Area } from "@/core/seed/structure";
import {
  LESSON_BADGE,
  LESSON_CARD,
  LESSON_GRID,
  LESSON_NO,
  LESSON_ROW,
  LESSON_TITLE,
} from "../lesson-card";
import { LESSON_START_TEXT, useLessonStart } from "../use-lesson-start";

const UNTRIED = "안 해 본 수업";

export function PastLessons({
  area,
  items,
  band,
  waitHintSeconds,
}: {
  area: Area;
  items: PastItem[];
  /** 종이 띠(쪽이 정함) — 안전 상한 안내 동안은 오른쪽 링크를 숨긴다. */
  band: {
    title: string;
    detail: string;
    back: { href: string; label: string };
  };
  /** ui.wait_hint_seconds(고른 뒤 서버가 늦으면 기다림 표시). */
  waitHintSeconds: readonly [number, number];
}) {
  const {
    start,
    busy,
    status,
    asking,
    setAsking,
    resting,
    restAgain,
    waitingSince,
  } = useLessonStart(waitHintSeconds);
  // 하이드레이션 끝 표시(e2e 가 누르기 전에 기다린다)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  /** 쉼 글을 그릴 카드(누른 카드 바로 아래 한 줄 칸 — 수업 목록과 같은 꼴). */
  const [restAt, setRestAt] = useState<string | undefined>();
  return (
    <>
      <PaperBand
        heading
        title={band.title}
        detail={band.detail}
        right={<SmallLink href={band.back.href}>{band.back.label}</SmallLink>}
      />
      <section
        data-past-lessons=""
        data-hydrated={hydrated ? "" : undefined}
        // 수업 목록과 같은 카드 격자 · 크기(같은 종류 종이 — C114 · 전체 디자인 리뷰 #14)
        className={LESSON_GRID}
      >
        {items.map((item, i) => {
          const key = `${item.ref.kind}-${item.ref.lessonNo}`;
          return (
            <Fragment key={key}>
              <PostIt
                tone={area}
                tilt={i % 2 === 0 ? "left" : "slight"}
                onClick={() => {
                  if (busy) return;
                  setRestAt(key);
                  void start(item.lessonId);
                }}
                className={LESSON_CARD}
              >
                <span
                  data-lesson={`${item.ref.kind}-${item.ref.lessonNo}`}
                  className="contents"
                >
                  {/* '안 해 본 수업'은 카드 위 끝 표지(카드 높이를 늘이지 않음 — 같은 크기, C114) */}
                  {item.mark === "untried" ? (
                    <span data-lesson-badge="" className={LESSON_BADGE}>
                      {UNTRIED}
                    </span>
                  ) : null}
                  <span data-lesson-no="" className={LESSON_NO}>
                    {item.ref.lessonNo}
                  </span>
                  {/* 수업 제목은 보조 줄 — 안내 글 20px(13절 C82), 두 줄까지 */}
                  <span data-size-guide="" className={LESSON_TITLE}>
                    {item.title}
                  </span>
                </span>
              </PostIt>
              {/* 1-가 하루 안전 상한 — 누른 카드 아래 한 줄 칸(R-15, 판정이 끝난 뒤) */}
              {resting && !busy && restAt === key ? (
                <div data-lesson-wait="" className={LESSON_ROW}>
                  <AiRestLine again={restAgain} />
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </section>
      {waitingSince !== undefined ? (
        <WaitHint startedAt={waitingSince} seconds={waitHintSeconds} />
      ) : null}
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
