"use client";

// 수업 고르기 → 세션 시작(5절 '세션을 여는 서버 액션은 고른 수업을 다시 판정' · 13절 '하던 수업이 있을 때 다른 수업을 고르면',
// plan-p10b 파일별 값 6 · 7). 수업 목록과 지난 수업 쪽이 같이 쓴다. 서버가 열면 /session/<id> 로, 다른 하던 수업이 있으면
// 확인을 받고(서버가 needs_confirm 을 돌려준 때도 — 다른 기기에서 시작한 수업), 거부면 목록을 다시 그린다(서버 판정이 이긴다).
// 1-가 하루 안전 상한에 닿은 학습일의 AI 가 필요한 수업(ai_resting)이면 resting 을 켠다 — 쓰는 화면이 '토리가 잠깐 쉬어요'와
// '홈'을 보인다(13절 C50 (2) · C80, plan-p11b 정할 것 ㄴ · 값 9).
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { startLesson } from "@/server/actions/session";

/** 확인 쪽지 · 오류 문구(4절 '다른 수업 고르기' · plan-p10b 정본 밖 문구 표 · C72 · 7절 네트워크 행). */
export const LESSON_START_TEXT = {
  confirm: "하던 수업은 처음부터 다시 해야 해요. 새 수업을 할까요?",
  newLesson: "새 수업 할래요",
  keepGoing: "하던 수업 할래요",
  failed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
} as const;

export function useLessonStart() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  /** 확인을 기다리는 수업(쪽지가 열린 동안). */
  const [asking, setAsking] = useState<string | undefined>();
  /** 1-가 하루 안전 상한으로 열지 못함(안내 화면). */
  const [resting, setResting] = useState(false);
  // 같은 그리기 안의 두 번 누름도 막는다(상태 값은 다음 그리기에야 바뀐다 — 검토 review-p10-5-6-code M-1)
  const inFlight = useRef(false);

  async function start(lessonId: string, confirmAbort = false) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setStatus("");
    try {
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
      inFlight.current = false;
      setBusy(false);
    }
  }

  return { start, busy, status, asking, setAsking, resting };
}
