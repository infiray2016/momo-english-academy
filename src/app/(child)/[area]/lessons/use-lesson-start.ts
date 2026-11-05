"use client";

// 수업 고르기 → 세션 시작(5절 '세션을 여는 서버 액션은 고른 수업을 다시 판정' · 13절 '하던 수업이 있을 때 다른 수업을 고르면',
// plan-p10b 파일별 값 6 · 7). 수업 목록과 지난 수업 쪽이 같이 쓴다. 서버가 열면 /session/<id> 로, 다른 하던 수업이 있으면
// 확인을 받고(서버가 needs_confirm 을 돌려준 때도 — 다른 기기에서 시작한 수업), 거부면 목록을 다시 그린다(서버 판정이 이긴다).
// 1-가 하루 안전 상한에 닿은 학습일의 AI 가 필요한 수업(ai_resting)이면 resting 을 켠다 — 쓰는 화면이 '토리가 잠깐 쉬어요'와
// '홈'을 보인다(13절 C50 (2) · C80, plan-p11b 정할 것 ㄴ · 값 9).
// 쓰기 6~12(plan-p11b 값 9 · 위험 3): 고르기 전에 이 기기의 시도 대기열을 비운다(쓰던 초고가 중단 전에 서버에 닿게). 서버가 첨삭을
// 한 번 더 부를 수 있어(첨삭 대기 칸 — 많아야 AI 기다림 상한) '첨삭 보기'로 열 때는 바로, 그 밖 고르기는 ui.wait_hint_seconds 첫 값이
// 지나도 돌아오지 않으면 기다림 표시를 켠다(waitingSince — 4절 '모든 AI 기다림은 첫 값 안에', 코드 검토 review-p11-7-code I-1 (가)).
// 그래도 첨삭이 없으면 '아직 글을 살펴보고 있어요'.
// UI · UX 묶음 0-가(3절 R-11 · R-15 · 8절 R-49 · R-50): 쉼은 화면을 떠나지 않는 상태다. 고르기마다 다시 판정하고(서버의 같은 판정 함수),
// 쉬지 않으면 쉼을 지운다. 같은 수업을 다시 골라도 쉬면 again('아직 쉬고 있어요 …'), retryRest 는 마지막 고르기를 그대로 다시 한다
// (결과 '다음 수업' · 마무리 '다음 이야기'의 작은 '다시 해 볼래요' — 풀리면 그 수업 시작).
// 첫 화면 읽어 주기(가르치고 배우는 수업 plan 정한 것 11 · 묶음 마-2): 고르기마다 누름 처리 안(첫 await 앞)에서 문서 단위 읽어 주기 잠금 풀기를
// 부른다 — 클라이언트 이동으로 연 세션의 오늘 배울 것 첫 줄이 iPad 사파리에서도 읽히게. 새로 고침 · 이어 하기로 연 세션은 감시 길(설계 10)이 받는다.
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createAttemptQueue } from "@/lib/attempt-queue";
import { unlockSpeechInDocument } from "@/lib/speech/unlock";
import { saveAttempts, startLesson } from "@/server/actions/session";

/** 확인 쪽지 · 오류 문구(4절 '다른 수업 고르기' · plan-p10b 정본 밖 문구 표 · C72 · 7절 네트워크 행). */
export { LESSON_START_TEXT } from "@/components/session/lesson-start-text";

import { LESSON_START_TEXT } from "@/components/session/lesson-start-text";

/** 이 기기에 남은 시도를 서버로 보낸다(닿지 않아도 막지 않음 — 다음에 다시). */
export async function flushAttempts(): Promise<void> {
  let storage: Storage | undefined;
  try {
    storage = window.localStorage;
  } catch {
    storage = undefined;
  }
  const queue = createAttemptQueue({
    storage,
    send: async (batch) => {
      const out = await saveAttempts(batch);
      if (!out.ok) throw new Error(out.reason);
      return { accepted: out.accepted, rejected: out.rejected };
    },
  });
  try {
    await queue.flush();
  } finally {
    queue.dispose();
  }
}

/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;

/**
 * 고르기 하나의 결과 뒤 쉼 상태(순수): 쉬면(rested) 쉼을 켜고 바로 앞에 쉰 수업과 같으면 again, 쉬지 않으면 쉼을 지운다.
 */
export function restAfterStartOf(
  restedBefore: string | undefined,
  lessonId: string,
  rested: boolean,
): { resting: boolean; again: boolean; restedLesson: string | undefined } {
  if (!rested) return { resting: false, again: false, restedLesson: undefined };
  return {
    resting: true,
    again: restedBefore === lessonId,
    restedLesson: lessonId,
  };
}

/** waitHintSeconds: ui.wait_hint_seconds(쓰는 쪽이 서버에서 읽어 넘김). */
export function useLessonStart(waitHintSeconds: readonly [number, number]) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  /** 확인을 기다리는 수업(쪽지가 열린 동안). */
  const [asking, setAsking] = useState<string | undefined>();
  /** 1-가 하루 안전 상한으로 열지 못함(쓰는 화면이 고른 자리에 쉼 글). */
  const [resting, setResting] = useState(false);
  /** 같은 수업을 다시 골랐는데 또 쉼('아직 쉬고 있어요 …'). */
  const [restAgain, setRestAgain] = useState(false);
  /** 바로 앞에 쉰 수업 · 마지막 고르기(retryRest 가 그대로 다시 함). */
  const restedLesson = useRef<string | undefined>(undefined);
  const lastStart = useRef<
    { lessonId: string; confirmAbort: boolean; feedback: boolean } | undefined
  >(undefined);
  /** 기다림 표시를 켠 고르기의 누른 시각(performance.now — WaitHint 둘째 줄이 그때부터 잼). 없으면 표시 없음. */
  const [waitingSince, setWaitingSince] = useState<number | undefined>();
  /** 첨삭이 아직 없음('아직 글을 살펴보고 있어요' · '수업 목록'). */
  const [stillReading, setStillReading] = useState(false);
  // 같은 그리기 안의 두 번 누름도 막는다(상태 값은 다음 그리기에야 바뀐다 — 검토 review-p10-5-6-code M-1)
  const inFlight = useRef(false);

  async function start(
    lessonId: string,
    confirmAbort = false,
    { feedback = false }: { feedback?: boolean } = {},
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    // 누름 처리 안(첫 await 앞)이어야 iOS 가 읽어 주기 제약을 푼다(정한 것 11)
    unlockSpeechInDocument();
    lastStart.current = { lessonId, confirmAbort, feedback };
    setBusy(true);
    setStatus("");
    setStillReading(false);
    const pressedAt = performance.now();
    if (feedback) setWaitingSince(pressedAt);
    // 첫 값이 지나도 돌아오지 않으면(서버가 첨삭을 기다리는 중 등) 기다림 표시
    const late = window.setTimeout(
      () => setWaitingSince(pressedAt),
      waitHintSeconds[0] * MS_PER_SECOND,
    );
    try {
      await flushAttempts().catch(() => {});
      const out = await startLesson({ lessonId, confirmAbort });
      const rest = restAfterStartOf(
        restedLesson.current,
        lessonId,
        !out.ok && out.reason === "ai_resting",
      );
      restedLesson.current = rest.restedLesson;
      setResting(rest.resting);
      setRestAgain(rest.again);
      if (out.ok) {
        router.push(`/session/${out.sessionId}`);
        return;
      }
      if (out.reason === "needs_confirm") {
        setAsking(lessonId);
        return;
      }
      if (out.reason === "ai_resting") return;
      if (out.reason === "feedback_pending") {
        setStillReading(true);
        return;
      }
      if (out.reason === "unavailable") {
        setStatus(
          navigator.onLine
            ? LESSON_START_TEXT.failed
            : LESSON_START_TEXT.offline,
        );
        return;
      }
      // 거부(잠김 · 범위 밖 · 배치 전 …) — 화면이 낡았다. 서버 판정으로 목록을 다시 그린다
      router.refresh();
    } catch {
      setStatus(
        navigator.onLine ? LESSON_START_TEXT.failed : LESSON_START_TEXT.offline,
      );
    } finally {
      window.clearTimeout(late);
      inFlight.current = false;
      setBusy(false);
      setWaitingSince(undefined);
    }
  }

  /** 마지막 고르기를 그대로 다시(쉬는 안내의 '다시 해 볼래요' — 서버가 다시 판정해 풀렸으면 그 수업을 연다). */
  function retryRest() {
    const last = lastStart.current;
    if (last)
      void start(last.lessonId, last.confirmAbort, { feedback: last.feedback });
  }

  return {
    start,
    busy,
    status,
    asking,
    setAsking,
    resting,
    restAgain,
    retryRest,
    waitingSince,
    stillReading,
  };
}
