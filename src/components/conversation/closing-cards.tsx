"use client";

// 회화 마무리 세 장(plan-p13b 파일별 값 15, 4절 회화 마무리 행 · 3.3 정리 문단 · 13절 C33 · 목업 B_TalkEnd 의 포스트잇 · 친한 정도 막대 꼴).
// 첫 장: 미션 성공 자리(5~7단계 — c) · 받은 별 자리(P12) · 오늘 얻은 단어(이 세션 오늘 쓸 말 단어 — 대화에 원형이 안 나온 것에 듣기 단추,
// 회11 (12)) · 목표 턴 전 그만둔 대화는 '다음에 끝까지 이야기하면 별을 받아요' · 다시 하기는 '다시 했어요' · '이 문제 이상해요' 자리(1-나) ·
// '다음'. 둘째 장: 1~3단계는 건너뜀(C33 — 4단계부터 몫은 c). 셋째 장: 친한 정도 막대(다시 하기는 없음) · 다음 이야기(수업 목록 '여기부터
// 해요' 회화 수업의 제목 — 서버가 채움) · 큰 '다음 이야기'(그 수업 startLesson) · 없으면 큰 '수업 목록' · 작은 '홈'. 끝인사는 정리에서 이미
// 했으므로 첫 장에 다시 쓰지 않는다. 숫자 · 퍼센트 · '내일'이 없다. 목표 턴 뒤 '홈'은 첫 장만 보인 뒤 홈(3.3 · 회11 (10)).
import { Volume2 } from "lucide-react";
import { useState } from "react";
import {
  LESSON_START_TEXT,
  useLessonStart,
} from "@/app/(child)/[area]/lessons/use-lesson-start";
import { CHILD_SIZE } from "@/components/activities/common";
import {
  BigButton,
  ConfirmSheet,
  FOCUS_RING,
  SmallButton,
  StatusLine,
} from "@/components/board/board";
import { AiRest } from "@/components/session/ai-rest";
import { WaitHint } from "@/components/session/wait-hint";
import { cn } from "@/lib/utils";
import type { WrapView } from "@/server/conversation";

/** 마무리 화면 글(4절 회화 마무리 행 그대로 · 목업 B_TalkEnd '토리와 친한 정도'). */
export const CLOSING_TEXT = {
  gotWords: "오늘 얻은 단어",
  listenWord: "단어 듣기",
  aborted: "다음에 끝까지 이야기하면 별을 받아요",
  retried: "다시 했어요",
  next: "다음",
  friendship: "토리와 친한 정도",
  nextStoryTitle: "다음 이야기",
  nextStory: "다음 이야기",
  lessons: "수업 목록",
  home: "홈",
} as const;

/** 마무리 장(첫 장 · 둘째 장 · 셋째 장 — 화면 표지 data-closing-card 는 1 · 2 · 3). */
export type ClosingCard = "first" | "second" | "third";

/**
 * 보일 장 차례(순수 함수): 목표 턴 뒤 '홈'은 첫 장만(3.3 '회화 화면에서 홈' 행), 1~3단계는 둘째 장 없이 첫 장 · 셋째 장(C33).
 * 4단계부터 둘째 장(잘한 말 · 다음엔 이렇게 · 한 번 더 말해 보기)은 plan-p13c 가 더한다 — 그때까지 같은 차례.
 */
export function closingCardsOf({
  lowLevel,
  mode,
}: {
  lowLevel: boolean;
  mode: "full" | "first";
}): ClosingCard[] {
  if (mode === "first") return ["first"];
  return lowLevel ? ["first", "third"] : ["first", "third"];
}

/** 친한 정도 막대 칸(talk.friendship_max 칸 가운데 지금 값만큼 참 — 숫자는 보이지 않는다). */
export function friendshipCellsOf(value: number, max: number): boolean[] {
  return Array.from({ length: Math.max(0, max) }, (_, i) => i < value);
}

/** 첫 장: 그만둠 · 다시 함 줄 · 오늘 얻은 단어 · '다음'. */
export function ClosingFirst({
  wrap,
  onListen,
  onNext,
}: {
  wrap: WrapView;
  onListen: (word: string) => void;
  onNext: () => void;
}) {
  const status = wrap.retry
    ? CLOSING_TEXT.retried
    : wrap.aborted
      ? CLOSING_TEXT.aborted
      : undefined;
  return (
    <section
      data-closing-card="1"
      className="relative flex flex-col gap-6 bg-paper px-8 pt-10 pb-8 shadow-postit"
    >
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 h-7 w-32 -translate-x-1/2 -rotate-2 bg-postit-talk/90"
      />
      {/* 받은 별 자리(P12) · 미션 성공 자리(5~7단계 — c) */}
      <div data-closing-stars="" className="contents" />
      {status ? (
        <p
          data-closing-status={wrap.retry ? "retry" : "aborted"}
          className="font-heading text-[30px] leading-snug"
        >
          {status}
        </p>
      ) : null}
      {wrap.gotWords.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="font-heading text-[26px] leading-tight">
            {CLOSING_TEXT.gotWords}
          </p>
          <ul className="flex flex-wrap gap-5">
            {wrap.gotWords.map((w, i) => (
              <li
                key={w.word}
                data-closing-word={w.word}
                className={cn(
                  "flex min-w-48 items-center gap-4 bg-postit-reading px-5 py-4 shadow-postit",
                  i % 2 === 0 ? "-rotate-1" : "rotate-1",
                )}
              >
                <span className="flex flex-col gap-1">
                  <span lang="en" className="font-en text-[28px] font-bold">
                    {w.word}
                  </span>
                  <span className={CHILD_SIZE.guide}>{w.meaningKo}</span>
                </span>
                {w.inTalk ? null : (
                  <button
                    type="button"
                    data-word-listen=""
                    aria-label={CLOSING_TEXT.listenWord}
                    onClick={() => onListen(w.word)}
                    className={cn(
                      FOCUS_RING,
                      CHILD_SIZE.target,
                      "ml-auto inline-flex items-center justify-center rounded-full border-2 border-ink bg-paper",
                    )}
                  >
                    <Volume2 aria-hidden className="size-6" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {/* '이 문제 이상해요' 자리(1-나) */}
      <div className="flex justify-center">
        <BigButton onClick={onNext}>{CLOSING_TEXT.next}</BigButton>
      </div>
    </section>
  );
}

/** 셋째 장: 친한 정도 막대 · 다음 이야기 · 큰 '다음 이야기'(없으면 '수업 목록') · 작은 '홈'. '다음'은 없다. */
export function ClosingThird({
  wrap,
  busy,
  onNextStory,
  onLessons,
  onHome,
}: {
  wrap: WrapView;
  busy: boolean;
  onNextStory: (lessonId: string) => void;
  onLessons: () => void;
  onHome: () => void;
}) {
  const next = wrap.nextLesson;
  return (
    <section data-closing-card="3" className="flex flex-col gap-8 py-2">
      <div className="grid gap-8 lg:grid-cols-2">
        {wrap.friendship ? (
          <div
            data-friendship=""
            className="relative flex flex-col gap-4 bg-postit-talk px-6 pt-9 pb-6 shadow-postit lg:rotate-1"
          >
            <span
              aria-hidden
              // 회화 안 테이프는 연두 하나(회화 영역 표시 — 전체 디자인 리뷰 M-4)
              className="absolute -top-3 left-1/2 h-6 w-28 -translate-x-1/2 rotate-3 bg-postit-talk/90"
            />
            <p className="font-heading text-[26px] leading-tight">
              {CLOSING_TEXT.friendship}
            </p>
            <div className="flex gap-1.5" aria-hidden>
              {friendshipCellsOf(
                wrap.friendship.value,
                wrap.friendship.max,
              ).map((on, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: 칸 차례가 곧 열쇠다
                  key={i}
                  data-friendship-cell=""
                  data-on={on ? "" : undefined}
                  className={cn(
                    "h-5 flex-1 rounded-sm border-2 border-ink",
                    on ? "bg-ink" : "bg-paper",
                  )}
                />
              ))}
            </div>
          </div>
        ) : null}
        {next ? (
          <div
            data-next-story=""
            className="relative flex flex-col gap-3 bg-paper px-6 pt-9 pb-6 shadow-postit lg:-rotate-1"
          >
            <span
              aria-hidden
              className="absolute -top-2.5 left-1/2 size-5 -translate-x-1/2 rounded-full bg-ink/70"
            />
            <p className="font-heading text-[26px] leading-tight">
              {CLOSING_TEXT.nextStoryTitle}
            </p>
            <p className={CHILD_SIZE.guide}>{next.title}</p>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6">
        {next ? (
          <BigButton disabled={busy} onClick={() => onNextStory(next.lessonId)}>
            {CLOSING_TEXT.nextStory}
          </BigButton>
        ) : (
          <BigButton disabled={busy} onClick={onLessons}>
            {CLOSING_TEXT.lessons}
          </BigButton>
        )}
        <SmallButton disabled={busy} onClick={onHome}>
          {CLOSING_TEXT.home}
        </SmallButton>
      </div>
    </section>
  );
}

/** 마무리 세 장(장마다 '다음'). 다음 이야기는 수업 목록과 같은 시작 길(재판정 · 하던 수업 확인 · 1-가 하루 안전 상한). */
export function ClosingCards({
  wrap,
  lowLevel,
  mode,
  waitHintSeconds,
  onListen,
  onHome,
  onLessons,
}: {
  wrap: WrapView;
  lowLevel: boolean;
  mode: "full" | "first";
  waitHintSeconds: readonly [number, number];
  onListen: (word: string) => void;
  onHome: () => void;
  onLessons: () => void;
}) {
  const cards = closingCardsOf({ lowLevel, mode });
  const [at, setAt] = useState(0);
  const { start, busy, status, asking, setAsking, resting, waitingSince } =
    useLessonStart(waitHintSeconds);
  const card = cards[at];
  const onNext = () => {
    if (at + 1 < cards.length) setAt(at + 1);
    else onHome();
  };
  if (resting) return <AiRest />;
  return (
    <div data-talk-closing="" className="flex flex-col gap-6">
      {card === "first" ? (
        <ClosingFirst wrap={wrap} onListen={onListen} onNext={onNext} />
      ) : (
        <ClosingThird
          wrap={wrap}
          busy={busy}
          onNextStory={(lessonId) => void start(lessonId)}
          onLessons={onLessons}
          onHome={onHome}
        />
      )}
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
    </div>
  );
}
