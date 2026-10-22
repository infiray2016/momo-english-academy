"use client";

// 세션 결과 틀(4절 세션 결과 행 · plan-p11a 값 8 · 정할 것 바 · 13절 C78). 제목 '수업을 끝냈어요!'(정본 밖) · 큰 단추 '다음 수업'
// (수업 목록의 '여기부터 해요'와 같은 수업 — 하던 수업 · 수업 · 연습) · 작은 단추 '홈'. 그런 수업이 없거나 P12 몫(단계 평가 · 복습)
// 이면 큰 단추는 '수업 목록'이다. 숫자 · 퍼센트를 보이지 않는다. 별 · 오늘 얻은 단어 · 단원 막대 · '단원 n을 통과했어요!' ·
// '다시 했어요'는 P12 가, 쓰기 6단계 이상 첫 세션 문구 · '첨삭 보기'는 b 가 더한다.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AREA_LABEL,
  BigButton,
  BigLink,
  ChildScreen,
  ConfirmSheet,
  PaperBand,
  PostIt,
  SmallLink,
  StatusLine,
} from "@/components/board/board";
import { AiRest } from "@/components/session/ai-rest";
import type { ResultView as ResultData } from "@/server/session/result";
import {
  LESSON_START_TEXT,
  useLessonStart,
} from "../../[area]/lessons/use-lesson-start";

/** 화면 글(4절 세션 결과 행 · 정본 밖 문구 표 결과 행, C78). */
const TEXT = {
  done: "수업을 끝냈어요!",
  nextLesson: "다음 수업",
  list: "수업 목록",
  home: "홈",
  levelUnit: (level: number, unit: number) => `${level}단계 · 단원 ${unit}`,
} as const;

export function ResultView({ view }: { view: ResultData }) {
  const router = useRouter();
  const { start, busy, status, asking, setAsking, resting } = useLessonStart();
  // 하이드레이션 끝 표시(e2e 가 누르기 전에 기다린다)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const { next } = view;
  return (
    <ChildScreen>
      <PaperBand
        heading
        title={AREA_LABEL[view.area]}
        detail={TEXT.levelUnit(view.level, view.unit)}
        right={
          // 안전 상한 안내가 큰 '홈'을 가진다(한 화면에 '홈' 하나)
          resting ? undefined : <SmallLink href="/">{TEXT.home}</SmallLink>
        }
      />
      <div
        data-result=""
        data-hydrated={hydrated ? "" : undefined}
        className="flex flex-1 flex-col items-center justify-center gap-8"
      >
        <PostIt tone={view.area} tilt="slight" className="max-w-xl gap-4 p-8">
          <h2 className="font-heading text-[32px] leading-tight">
            {TEXT.done}
          </h2>
          <p>{view.title}</p>
        </PostIt>
        <div className="flex flex-col items-center gap-4">
          {resting ? (
            // 1-가 하루 안전 상한 — '다음 수업'을 열지 못하면 안내와 '홈'(C50 (2) · C80)
            <AiRest />
          ) : next.kind === "list" ? (
            <BigLink href={`/${view.area}/lessons`} data-result-next="list">
              {TEXT.list}
            </BigLink>
          ) : (
            <BigButton
              data-result-next={next.kind}
              disabled={busy}
              onClick={() => {
                if (next.kind === "resume")
                  router.push(`/session/${next.sessionId}`);
                else void start(next.lessonId);
              }}
            >
              {TEXT.nextLesson}
            </BigButton>
          )}
          <StatusLine tone={status ? "error" : "info"}>{status}</StatusLine>
        </div>
      </div>
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
    </ChildScreen>
  );
}
