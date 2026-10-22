"use client";

// 세션 결과 틀(4절 세션 결과 행 · plan-p11a 값 8 · 정할 것 바 · 13절 C78). 제목 '수업을 끝냈어요!'(정본 밖) · 큰 단추 '다음 수업'
// (수업 목록의 '여기부터 해요'와 같은 수업 — 하던 수업 · 수업 · 연습) · 작은 단추 '홈'. 그런 수업이 없거나 P12 몫(단계 평가 · 복습)
// 이면 큰 단추는 '수업 목록'이다. 숫자 · 퍼센트를 보이지 않는다. 별 · 오늘 얻은 단어 · 단원 막대 · '단원 n을 통과했어요!' ·
// '다시 했어요'는 P12 가 더한다. 쓰기 6단계 이상 첫 세션(plan-p11b 값 10 · 4절 세션 결과 행 · AC-4c)은 제목이 '글을 보냈어요. 첨삭이 오면
// 고쳐 쓰고 별을 받아요'이고 큰 단추 자리에 기다림 표시 — 첨삭 상태를 FEEDBACK_POLL_MS 마다 다시 읽어 오면 '첨삭 보기'(그 수업),
// 못 함이거나 낸 뒤 ai.timeout_seconds.feedback 이 지나면 '수업 목록'(작은 '홈'은 띠에).
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
import { WaitHint } from "@/components/session/wait-hint";
import { draftFeedbackStatus } from "@/server/actions/writing";
import type { ResultView as ResultData } from "@/server/session/result";
import {
  LESSON_START_TEXT,
  useLessonStart,
} from "../../[area]/lessons/use-lesson-start";

/** 화면 글(4절 세션 결과 행 · 정본 밖 문구 표 결과 행, C78). */
const TEXT = {
  done: "수업을 끝냈어요!",
  sent: "글을 보냈어요. 첨삭이 오면 고쳐 쓰고 별을 받아요",
  feedback: "첨삭 보기",
  nextLesson: "다음 수업",
  list: "수업 목록",
  home: "홈",
  levelUnit: (level: number, unit: number) => `${level}단계 · 단원 ${unit}`,
} as const;

/** 첨삭 상태를 다시 읽는 간격(기술 값 — plan-p11b 값 10 FEEDBACK_POLL_MS). */
const FEEDBACK_POLL_MS = 3000;
/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;

type DraftShown = "waiting" | "ready" | "list";

/** 쓰기 6~12 첫 세션 결과의 큰 단추 자리 상태: 오면 '첨삭 보기', 못 함 · 상한 지남은 '수업 목록', 그 밖 기다림. */
function useDraftFeedback(
  sessionId: string,
  draft: ResultData["draft"],
): DraftShown | undefined {
  const [state, setState] = useState(draft?.state);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!draft || state !== "pending") return;
    const deadline =
      Date.parse(draft.submittedAt) + draft.waitSeconds * MS_PER_SECOND;
    const left = deadline - Date.now();
    if (left <= 0) {
      setExpired(true);
      return;
    }
    const until = window.setTimeout(() => setExpired(true), left);
    const poll = window.setInterval(() => {
      void draftFeedbackStatus({ sessionId })
        .then((out) => {
          if (out.ok) setState(out.state);
        })
        .catch(() => {});
    }, FEEDBACK_POLL_MS);
    return () => {
      window.clearTimeout(until);
      window.clearInterval(poll);
    };
  }, [draft, state, sessionId]);
  if (!draft) return undefined;
  if (state === "ready") return "ready";
  if (state === "failed" || expired) return "list";
  return "waiting";
}

export function ResultView({ view }: { view: ResultData }) {
  const router = useRouter();
  const { start, busy, status, asking, setAsking, resting } = useLessonStart();
  // 하이드레이션 끝 표시(e2e 가 누르기 전에 기다린다)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const { next } = view;
  const draftShown = useDraftFeedback(view.sessionId, view.draft);
  const [waitStarted] = useState(() =>
    typeof performance === "undefined" ? 0 : performance.now(),
  );
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
            {view.draft ? TEXT.sent : TEXT.done}
          </h2>
          <p>{view.title}</p>
        </PostIt>
        <div className="flex flex-col items-center gap-4">
          {resting ? (
            // 1-가 하루 안전 상한 — '다음 수업'을 열지 못하면 안내와 '홈'(C50 (2) · C80)
            <AiRest />
          ) : view.draft && draftShown === "waiting" ? (
            <div data-result-next="waiting">
              <WaitHint
                startedAt={waitStarted}
                seconds={view.draft.waitHintSeconds}
              />
            </div>
          ) : view.draft && draftShown === "ready" ? (
            <BigButton
              data-result-next="feedback"
              disabled={busy}
              onClick={() => {
                if (view.draft) void start(view.draft.lessonId);
              }}
            >
              {TEXT.feedback}
            </BigButton>
          ) : view.draft || next.kind === "list" ? (
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
