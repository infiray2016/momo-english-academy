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
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createAttemptQueue } from "@/lib/attempt-queue";
import { saveAttempts, startLesson } from "@/server/actions/session";

/** 확인 쪽지 · 오류 문구(4절 '다른 수업 고르기' · plan-p10b 정본 밖 문구 표 · C72 · 7절 네트워크 행). */
export const LESSON_START_TEXT = {
  confirm: "하던 수업은 처음부터 다시 해야 해요. 새 수업을 할까요?",
  newLesson: "새 수업 할래요",
  keepGoing: "하던 수업 할래요",
  failed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  /** 둘째 세션을 열 때 첨삭이 아직 없음(4절 · plan-p11b 값 9). */
  stillReading: "아직 글을 살펴보고 있어요",
} as const;

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

/** waitHintSeconds: ui.wait_hint_seconds(쓰는 쪽이 서버에서 읽어 넘김). */
export function useLessonStart(waitHintSeconds: readonly [number, number]) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  /** 확인을 기다리는 수업(쪽지가 열린 동안). */
  const [asking, setAsking] = useState<string | undefined>();
  /** 1-가 하루 안전 상한으로 열지 못함(안내 화면). */
  const [resting, setResting] = useState(false);
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
      if (out.ok) {
        router.push(`/session/${out.sessionId}`);
        return;
      }
      if (out.reason === "needs_confirm") {
        setAsking(lessonId);
        return;
      }
      if (out.reason === "ai_resting") {
        setResting(true);
        return;
      }
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

  return {
    start,
    busy,
    status,
    asking,
    setAsking,
    resting,
    waitingSince,
    stillReading,
  };
}
