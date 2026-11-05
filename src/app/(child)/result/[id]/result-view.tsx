"use client";

// 세션 결과 틀(4절 세션 결과 행 · plan-p11a 값 8 · 정할 것 바 · 13절 C78). 제목 '수업을 끝냈어요!'(정본 밖) · 큰 단추 '다음 수업'
// (수업 목록의 '여기부터 해요'와 같은 수업 — 하던 수업 · 수업 · 연습) · 작은 단추 '홈'. 그런 수업이 없거나 P12 몫(단계 평가 · 복습)
// 이면 큰 단추는 '수업 목록'이다. 점수 · 퍼센트를 보이지 않는다. 단원 막대 · '단원 n을 통과했어요!' · 다시 하기의 '맞힌 단어'는 P12 가
// 더한다. 쓰기 6단계 이상 첫 세션(plan-p11b 값 10 · 4절 세션 결과 행 · AC-4c)은 제목이 '글을 보냈어요. 첨삭이 오면
// 고쳐 쓰고 별을 받아요'이고 큰 단추 자리에 기다림 표시 — 첨삭 상태를 FEEDBACK_POLL_MS 마다 다시 읽어 오면 '첨삭 보기'(그 수업),
// 못 함이거나 낸 뒤 ai.timeout_seconds.feedback 이 지나면 '수업 목록'(작은 '홈'은 띠에).
// 보상(13절 C166 R3 · C167 (5) · UX 검토 3판 U4-1): 별을 받는 세션(홈 별 합과 같은 셈 earnsStar)은 reward.star_complete 개 별(서버가
// 실은 수 — 별 장부는 P12), 다시 하기는 별 · 단어 카드 대신 '다시 했어요'(고쳐 쓰기 전 초고에는 없음), 쓰기 초고는 별이 없다. 그 밖은
// 별 아래 오늘 만난 말 카드. 첨삭 기다림에는 '기다리는 동안 다른 공부를 해도 돼요' 한 줄(U4-8).
// 쉼(UI · UX 묶음 0-가 · N-7 · [승인 UX4]): '다음 수업' · '첨삭 보기'를 열지 못하면 그 큰 단추 자리에 안내 · 큰 '홈' · 작은 '다시 해 볼래요'
// (마지막 고르기를 다시 — 서버가 다시 판정해 풀렸으면 그 수업을 연다, 아니면 '아직 쉬고 있어요 …').
// 결과 판(UI · UX 묶음 5-가 · spec 설계 5.4 결과 판 배치 · AC-23j · D-1 · D-10): 위 띠(영역 · 단계 · 단원) 아래 판 하나에 결과 전부. 가로는 두
// 열 — 왼쪽 (되짚기 첫머리) · 제목 · 수업 제목 · 오늘 만난 말 · (단원 막대 자리, P12) · 단추 줄('다음 수업' 큰 · '홈' 작은, 판 안 아래), 오른쪽 큰 별. 세로는 별 →
// 제목 → 단어 → 막대 → 단추 한 열(같은 차례를 가로에서 뒤집음). 다시 하기는 별 자리에 '다시 했어요', 쓰기 초고 · 별 0 은 별 자리를 접는다
// (resultRewardSideOf). '홈'은 위 띠에서 단추 줄로 옮겼다(설계 5.4 · R-20 '다음 수업'(큰) · '홈'(작은)).
// 되짚기(가르치고 배우는 수업 plan 묶음 라-4 · 정본 03:26 · 03:80 · 15절 AC-6f): 서버가 recapView 를 실은 결과(teach 칸이 든 수업 — 쓰기
// 초고 빼고, 다시 하기는 첫머리만 · 오늘 만난 말 없음 — fix 1 I1)는 본 열 맨 위에 초상과 마무리 한 줄(teach/recap RecapHead)을 두고, 오늘 만난 말 칸(세 영역 이름 '오늘 만난 말' — C173 (1) ·
// C178 UX1) 아래에 칩을 단 문장 틀과 '다시 듣기'(RecapFrame)를 붙인다. 들리는 차례는 마무리 → 단원 단어 → 문장 틀(useRecap)이다. 오늘 만난
// 말의 단어 카드마다 소리 단추가 있고(되짚기 없는 결과도), 되짚기를 읽는 동안 흐리다. 음성 접점은 그려진 뒤 만든다(세션 틀과 같은 길 —
// 선생님 영어는 단계 구간 빠르기 speech.rate.<구간>, 가르치고 spec 설계 4 목소리 표). '다음 수업'은 읽기와 상관없이 늘 누를 수 있다.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AREA_LABEL,
  BigButton,
  BigLink,
  ChildScreen,
  ConfirmSheet,
  PaperBand,
  SmallLink,
  StatusLine,
} from "@/components/board/board";
import { AiRest } from "@/components/session/ai-rest";
import { FamilyBoard } from "@/components/session/family-board";
import {
  MetWordCards,
  REWARD_TEXT,
  RewardStar,
} from "@/components/session/reward";
import {
  RecapFrame,
  RecapHead,
  useRecap,
} from "@/components/session/teach/recap";
import { WaitHint } from "@/components/session/wait-hint";
import { earnsStar } from "@/core/reward/star";
import { speakRateOf } from "@/core/speech/pace";
import { createBrowserSpeech } from "@/lib/speech/browser";
import { pacedSpeech } from "@/lib/speech/paced";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import { draftFeedbackStatus } from "@/server/actions/writing";
import type { ResultView as ResultData } from "@/server/session/result";
import {
  LESSON_START_TEXT,
  useLessonStart,
} from "../../[area]/lessons/use-lesson-start";

/** 화면 글(4절 세션 결과 행 · 정본 밖 문구 표 결과 행, C78 · C166). */
export const RESULT_TEXT = {
  done: "수업을 끝냈어요!",
  sent: "글을 보냈어요. 첨삭이 오면 고쳐 쓰고 별을 받아요",
  feedback: "첨삭 보기",
  nextLesson: "다음 수업",
  list: "수업 목록",
  home: "홈",
  levelUnit: (level: number, unit: number) => `${level}단계 · 단원 ${unit}`,
  /** 첨삭 기다림 한 줄(U4-8 — 정본 밖 문구). */
  feedbackWait: "기다리는 동안 다른 공부를 해도 돼요",
} as const;
const TEXT = RESULT_TEXT;

/**
 * 결과의 보상 자리(C166 R3): 다시 하기는 별 대신 '다시 했어요'(쓰기 초고는 고쳐 쓰기 전이라 없음 — 검토 M-5), 그 밖은 홈 별 합과 같은
 * 셈(earnsStar — 3.5 R12)으로 별 · 없음(쓰기 6단계 이상 첫 세션은 첨삭 전이라 없음, 고쳐 쓰기를 끝내면 별).
 */
export function resultRewardOf(
  view: Pick<ResultData, "area" | "kind" | "writingPart">,
): "star" | "retried" | "none" {
  if (view.kind === "retry")
    return view.writingPart === "draft" ? "none" : "retried";
  return earnsStar({
    area: view.area,
    kind: view.kind,
    status: "completed",
    writingPart: view.writingPart,
  })
    ? "star"
    : "none";
}

/**
 * 결과 판의 별 자리(설계 5.4): 별을 받으면 큰 별(서버가 실은 별 수가 1 이상일 때), 다시 하기는 '다시 했어요', 그 밖(쓰기 초고 · 별 0)은 자리를
 * 접는다(null — 한 열).
 */
export function resultRewardSideOf(
  view: Pick<ResultData, "area" | "kind" | "writingPart" | "starsPerLesson">,
): "star" | "retried" | null {
  const reward = resultRewardOf(view);
  if (reward === "retried") return "retried";
  if (reward === "star" && view.starsPerLesson > 0) return "star";
  return null;
}

/** 결과 판 별 열의 너비(가로 두 열 — 화면 꼴 값, 클래스와 같은 글). */
const REWARD_COLUMN = "landscape:w-72";

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
  const {
    start,
    busy,
    status,
    asking,
    setAsking,
    resting,
    restAgain,
    retryRest,
    stillReading,
    waitingSince,
  } = useLessonStart(view.waitHintSeconds);
  // 하이드레이션 끝 표시(e2e 가 누르기 전에 기다린다)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const { next } = view;
  const draftShown = useDraftFeedback(view.sessionId, view.draft);
  const [waitStarted] = useState(() =>
    typeof performance === "undefined" ? 0 : performance.now(),
  );
  const side = resultRewardSideOf(view);
  // 음성 접점은 렌더 뒤에 만든다(SpeechPort.device 는 useEffect 에서만, P2b) — 오늘 만난 말 소리 단추 · 되짚기 읽기
  const [speech, setSpeech] = useState<SpeechPort | undefined>();
  useEffect(() => {
    const created = createBrowserSpeech({ settings: view.speech });
    setSpeech(
      pacedSpeech(created, {
        rate: speakRateOf(view.level, view.speech),
        pauseMs: view.speech.sentencePauseMs,
      }),
    );
    return () => created.dispose();
  }, [view.speech, view.level]);
  const { recapView } = view;
  const recap = useRecap({
    // 다시 하기 결과는 오늘 만난 말이 없어 마무리 한 줄만 읽는다(서버가 frame 을 null 로 싣는다 — 정본 03:26, fix 1 I1)
    data: recapView
      ? {
          lineKo: recapView.lineKo,
          words: view.kind === "retry" ? [] : view.metWords.map((w) => w.word),
          frame: recapView.frame,
        }
      : undefined,
    teacher: recapView?.teacher ?? null,
    speech,
    speechSettings: view.speech,
  });
  return (
    <ChildScreen>
      <PaperBand
        heading
        title={AREA_LABEL[view.area]}
        detail={TEXT.levelUnit(view.level, view.unit)}
      />
      <FamilyBoard
        kind="result"
        fill
        paperKey={`result:${view.area}`}
        data-result=""
        data-hydrated={hydrated ? "" : undefined}
      >
        <div
          data-result-columns={side ? "two" : "one"}
          className="flex flex-1 flex-col gap-8 landscape:flex-row-reverse"
        >
          {side ? (
            // 별 자리(세로는 맨 위, 가로는 오른쪽 열 위 — AC-23j '앞쪽', 마스코트 자리는 캐릭터 표본 뒤에 채운다)
            <div
              data-result-reward={side}
              className={cn(
                "flex flex-col items-center justify-center gap-4 landscape:shrink-0 landscape:justify-start",
                REWARD_COLUMN,
              )}
            >
              {side === "star" ? (
                <RewardStar count={view.starsPerLesson} size="big" />
              ) : (
                <p
                  data-reward-retried=""
                  className="text-center font-heading text-[30px] leading-snug"
                >
                  {REWARD_TEXT.retried}
                </p>
              )}
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {recapView ? (
              // 결과 첫머리 되짚기(정본 03:26 '첫머리') — 초상과 마무리 한 줄
              <RecapHead
                teacher={recapView.teacher}
                lineKo={recapView.lineKo}
                line={recap.line}
              />
            ) : null}
            <h2 className="font-heading text-[32px] leading-tight">
              {view.draft ? TEXT.sent : TEXT.done}
            </h2>
            <p>{view.title}</p>
            {/* 다시 하기에는 오늘 만난 말을 두지 않는다(정본 03:26 · R-40 · [승인 UX1] · 검토 M-5 — 맞힌 단어는 P12) */}
            {view.kind === "retry" ? null : (
              <MetWordCards
                words={view.metWords}
                onListen={recap.listen}
                listenOff={!recap.line.bright}
              >
                {recapView?.frame ? (
                  <RecapFrame
                    frameEn={recapView.frame.frameEn}
                    chips={recapView.frame.chips}
                    listenOff={!recap.line.bright}
                    onListen={recap.listen}
                  />
                ) : null}
              </MetWordCards>
            )}
            {/* 단원 진행 막대 변화 자리(P12 평가 체계가 여기에 더한다) */}
            <div
              data-result-buttons=""
              className="mt-auto flex flex-wrap items-center gap-4"
            >
              {resting ? (
                // 1-가 하루 안전 상한 — '다음 수업'을 열지 못하면 큰 단추 자리에 안내 · 큰 '홈' · 작은 '다시 해 볼래요'(C50 (2) · C80 · N-7)
                <div className="w-full">
                  <AiRest
                    busy={busy}
                    retry={{
                      onRetry: retryRest,
                      checking: busy,
                      still: restAgain,
                    }}
                  />
                </div>
              ) : view.draft && draftShown === "waiting" ? (
                <div data-result-next="waiting" className="flex flex-col gap-2">
                  <WaitHint
                    startedAt={waitStarted}
                    seconds={view.waitHintSeconds}
                  />
                  <p data-feedback-wait-line="">{TEXT.feedbackWait}</p>
                </div>
              ) : view.draft && draftShown === "ready" ? (
                <BigButton
                  data-result-next="feedback"
                  disabled={busy}
                  onClick={() => {
                    if (view.draft)
                      void start(view.draft.lessonId, false, {
                        feedback: true,
                      });
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
              {stillReading ? (
                // 둘째 세션을 열 때 첨삭이 아직 없음 — '아직 글을 살펴보고 있어요'와 '수업 목록'(4절 · plan-p11b 값 9)
                <>
                  <StatusLine>{LESSON_START_TEXT.stillReading}</StatusLine>
                  <BigLink
                    href={`/${view.area}/lessons`}
                    data-result-next="list"
                  >
                    {TEXT.list}
                  </BigLink>
                </>
              ) : null}
              {/* 안전 상한 안내가 큰 '홈'을 가진다(한 화면에 '홈' 하나) */}
              {resting ? null : <SmallLink href="/">{TEXT.home}</SmallLink>}
            </div>
            {waitingSince !== undefined ? (
              <WaitHint
                startedAt={waitingSince}
                seconds={view.waitHintSeconds}
              />
            ) : null}
            <StatusLine tone={status ? "error" : "info"}>{status}</StatusLine>
          </div>
        </div>
      </FamilyBoard>
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
