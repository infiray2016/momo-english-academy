"use client";

// 회화 마무리 세 장(plan-p13b 파일별 값 15, 4절 회화 마무리 행 · 3.3 정리 문단 · 13절 C33 · 목업 B_TalkEnd 의 포스트잇 · 친한 정도 막대 꼴).
// 첫 장: 미션 성공 자리(5~7단계 — c) · 받은 별 · 정리에서 읽은 끝인사 글 · 오늘 만난 단어(이 세션 오늘 쓸 말 단어 — 대화에 원형이 안 나온 것에 듣기 단추,
// 회11 (12)) · 그만둔 대화(wrap.aborted)는 '다음에 조금 더 이야기하면 별을 받아요'(R-54) · 다시 하기는 '다시 했어요'(오늘 만난 단어 없음 — R-19) ·
// '이 문제 이상해요' 자리(1-나) · '다음'. 둘째 장: 1~3단계는 건너뜀(C33 — 4단계부터 몫은 c). 셋째 장: 친한 정도 막대(다시 하기는 없음) · 다음 이야기(수업 목록 '여기부터
// 해요' 회화 수업의 제목 — 서버가 채움) · 큰 '다음 이야기'(그 수업 startLesson) · 없으면 큰 '수업 목록' · 작은 '홈'. 숫자 · 퍼센트 · '내일'이
// 없다. 참여 완료 뒤 '홈'은 첫 장만 보인 뒤 홈(3.3 · 회11 (10)).
// 새 흐름(회화 plan 묶음 11 · 3.3 끝난 길 표 · C188): 첫 장은 끝난 길(closingEndOf)을 표지 data-closing-end 로 둔다 — 참여 완료(마무리 물음에
// 답함 · 참여 있는 '그만하기' · 바닥선(둘째 묶음 16))는 별, 확인 뒤 그만두기(참여가 거의 없음)는 중단 · '다음에 조금 더 …', 다시 하기는 '다시
// 했어요'. 자료는 새 흐름도 같은 WrapView 꼴이다(readTalkLessonWrap · stopTalkLesson · leaveTalkLesson). 꼴은 UI · UX 묶음 6 이 입힌다.
// 13절 C166 R3 · C167 (1) · (5) · UX 검토 3판 U4-1(불편 장면 14): 첫 장 받은 별 자리에 별(홈 별 합과 같은 셈 earnsStar 에 서버가 실은
// 세션 종류를 넘기고, 별 수는 서버가 실은 reward.star_complete — 별 장부는 P12). 정리에서 읽은 선생님 끝인사를 글로 남기고(다시 읽지
// 않음), 정리를 거치지 않고 첫 장만 보이는 길에는 두지 않는다(틀이 끝인사를 넘기지 않음).
// UI · UX 묶음 0-가(N-7 · [승인 UX4]): '다음 이야기'가 쉼이면 셋째 장은 그대로 두고 큰 단추 자리에 안내 · 큰 '홈' · 작은 '다시 해 볼래요'
// (마지막 고르기를 다시 — 풀리면 그 수업 시작, 아니면 '아직 쉬고 있어요 …').
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
import { AiRest, type AiRestRetry } from "@/components/session/ai-rest";
import { listenWordLabel, RewardStar } from "@/components/session/reward";
import { WaitHint } from "@/components/session/wait-hint";
import { earnsStar } from "@/core/reward/star";
import { TEACHER_TEXT } from "@/core/teacher/name";
import { cn } from "@/lib/utils";
import type { WrapView } from "@/server/conversation";

/** 마무리 화면 글(4절 회화 마무리 행 그대로). 이름 자리 글('[이름](와/과) 친한 정도' — 목업 B_TalkEnd)은 TEACHER_TEXT. */
export const CLOSING_TEXT = {
  metWords: "오늘 만난 단어",
  listenWord: "단어 듣기",
  aborted: "다음에 조금 더 이야기하면 별을 받아요",
  retried: "다시 했어요",
  next: "다음",
  nextStoryTitle: "다음 이야기",
  nextStory: "다음 이야기",
  lessons: "수업 목록",
  home: "홈",
} as const;

/** 마무리 장(첫 장 · 둘째 장 · 셋째 장 — 화면 표지 data-closing-card 는 1 · 2 · 3). */
export type ClosingCard = "first" | "second" | "third";

/**
 * 보일 장 차례(순수 함수): 참여 완료 뒤 '홈'은 첫 장만(3.3 '회화 화면에서 홈' 행), 1~3단계는 둘째 장 없이 첫 장 · 셋째 장(C33).
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

/**
 * 첫 장 받은 별 자리(C166 R3 · C167 (5)): 홈 별 합과 같은 셈(earnsStar — 3.5 R12)에 서버가 실은 세션 종류를 그대로 넘긴다(검토 B M-4).
 * 목표 턴까지 한 새 대화(세션 '완료')는 별, 그만둔 대화('다음에 조금 더 …' — 세션 '중단') · 다시 한 대화('다시 했어요')는 없음.
 */
export function closingRewardOf(
  wrap: Pick<WrapView, "aborted" | "kind">,
): "star" | "none" {
  return earnsStar({
    area: "talk",
    kind: wrap.kind,
    status: wrap.aborted ? "aborted" : "completed",
    writingPart: null,
  })
    ? "star"
    : "none";
}

/** 첫 장의 끝난 길(순수 함수, 3.3 끝난 길 표): 다시 하기 · 중단(확인 뒤 그만두기 — 별 없음) · 참여 완료(별). */
export function closingEndOf(
  wrap: Pick<WrapView, "aborted" | "retry">,
): "retried" | "aborted" | "completed" {
  if (wrap.retry) return "retried";
  return wrap.aborted ? "aborted" : "completed";
}

/**
 * 첫 장의 오늘 만난 단어(R-19 · R-40 · [승인 UX1]): 다시 하기로 한 대화에는 두지 않는다(맞힌 단어는 P12). 새 대화 · 그만둔 대화는 서버가 실은
 * 차례 그대로.
 */
export function closingMetWordsOf(
  wrap: Pick<WrapView, "retry" | "metWords">,
): WrapView["metWords"] {
  return wrap.retry ? [] : wrap.metWords;
}

/** 친한 정도 막대 칸(talk.friendship_max 칸 가운데 지금 값만큼 참 — 숫자는 보이지 않는다). */
export function friendshipCellsOf(value: number, max: number): boolean[] {
  return Array.from({ length: Math.max(0, max) }, (_, i) => i < value);
}

/** 첫 장: 받은 별(설정 수만큼) · 그만둠 · 다시 함 줄 · 정리에서 읽은 끝인사 글 · 오늘 만난 단어 · '다음'. */
export function ClosingFirst({
  wrap,
  farewell,
  onListen,
  onNext,
}: {
  wrap: WrapView;
  /** 정리에서 읽은 끝인사(이름을 채운 글 — 끝맺음 끝인사가 왔으면 그것, 아니면 카드 끝인사). 정리를 거치지 않은 길은 없음 → 줄 없음. */
  farewell?: { en: string; ko?: string } | undefined;
  onListen: (word: string) => void;
  onNext: () => void;
}) {
  const metWords = closingMetWordsOf(wrap);
  const end = closingEndOf(wrap);
  const status =
    end === "retried"
      ? CLOSING_TEXT.retried
      : end === "aborted"
        ? CLOSING_TEXT.aborted
        : undefined;
  return (
    <section
      data-closing-card="1"
      data-closing-end={end}
      className="relative flex flex-col gap-6 bg-paper px-8 pt-10 pb-8 shadow-postit"
    >
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 h-7 w-32 -translate-x-1/2 -rotate-2 bg-postit-talk/90"
      />
      {/* 받은 별 자리(C166 R3 — 보이기만, 장부는 P12) · 미션 성공 자리(5~7단계 — c) */}
      <div data-closing-stars="" className="contents">
        {closingRewardOf(wrap) === "star" ? (
          <RewardStar count={wrap.starsPerLesson} />
        ) : null}
      </div>
      {status ? (
        <p
          data-closing-status={wrap.retry ? "retry" : "aborted"}
          className="font-heading text-[30px] leading-snug"
        >
          {status}
        </p>
      ) : null}
      {farewell ? (
        <div
          data-closing-farewell=""
          className="flex flex-col gap-1 rounded-[4px_18px_18px_18px] border-[3px] border-ink bg-[color-mix(in_srgb,var(--color-postit-talk)_30%,var(--color-paper))] px-5 py-4"
        >
          <span
            lang="en"
            className="font-en text-[28px] font-bold leading-snug"
          >
            {farewell.en}
          </span>
          {farewell.ko ? (
            <span className={CHILD_SIZE.guide}>{farewell.ko}</span>
          ) : null}
        </div>
      ) : null}
      {metWords.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="font-heading text-[26px] leading-tight">
            {CLOSING_TEXT.metWords}
          </p>
          <ul className="flex flex-wrap gap-5">
            {metWords.map((w, i) => (
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
                    aria-label={listenWordLabel(w.word)}
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
  teacherName,
  busy,
  rest,
  onNextStory,
  onLessons,
  onHome,
}: {
  wrap: WrapView;
  /** 세션 선생님 한글 이름('[이름](와/과) 친한 정도' — 없으면 '선생님'). */
  teacherName?: string | undefined;
  busy: boolean;
  /** '다음 이야기'를 열지 못한 쉼(있으면 큰 단추 자리에 안내 · 큰 '홈' · 작은 '다시 해 볼래요' — N-7 · [승인 UX4]). */
  rest?: AiRestRetry | undefined;
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
              {TEACHER_TEXT.friendship(teacherName)}
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
      {rest ? (
        <AiRest
          busy={busy}
          teacherName={teacherName}
          onHome={onHome}
          retry={rest}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-6">
          {next ? (
            <BigButton
              disabled={busy}
              onClick={() => onNextStory(next.lessonId)}
            >
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
      )}
    </section>
  );
}

/** 마무리 세 장(장마다 '다음'). 다음 이야기는 수업 목록과 같은 시작 길(재판정 · 하던 수업 확인 · 1-가 하루 안전 상한). */
export function ClosingCards({
  wrap,
  farewell,
  teacherName,
  lowLevel,
  mode,
  waitHintSeconds,
  onListen,
  onHome,
  onLessons,
}: {
  wrap: WrapView;
  /** 첫 장에 남길 끝인사(이름을 채운 글 — C166 R3). */
  farewell?: { en: string; ko?: string } | undefined;
  /** 세션 선생님 한글 이름(이름 자리 글 — 없으면 '선생님'). */
  teacherName?: string | undefined;
  lowLevel: boolean;
  mode: "full" | "first";
  waitHintSeconds: readonly [number, number];
  onListen: (word: string) => void;
  onHome: () => void;
  onLessons: () => void;
}) {
  const cards = closingCardsOf({ lowLevel, mode });
  const [at, setAt] = useState(0);
  const {
    start,
    busy,
    status,
    asking,
    setAsking,
    resting,
    restAgain,
    retryRest,
    waitingSince,
  } = useLessonStart(waitHintSeconds);
  const card = cards[at];
  const onNext = () => {
    if (at + 1 < cards.length) setAt(at + 1);
    else onHome();
  };
  return (
    <div data-talk-closing="" className="flex flex-col gap-6">
      {card === "first" ? (
        <ClosingFirst
          wrap={wrap}
          farewell={farewell}
          onListen={onListen}
          onNext={onNext}
        />
      ) : (
        <ClosingThird
          wrap={wrap}
          teacherName={teacherName}
          busy={busy}
          // 1-가 하루 안전 상한 — '다음 이야기'를 열지 못하면 셋째 장은 그대로, 큰 단추 자리에 쉼(N-7)
          rest={
            resting
              ? { onRetry: retryRest, checking: busy, still: restAgain }
              : undefined
          }
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
