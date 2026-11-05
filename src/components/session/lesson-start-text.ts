// 수업 시작 · 저장 안내 문구(4절 · plan-p11b 값 9 · C72 꼴). 공용 조각(ai-rest · closing-cards)이 쪽 폴더의 훅 파일에 기대지 않게
// components 쪽에 둔다(UI · UX 0-가 재검토 권고, L-26). 쪽 쪽은 use-lesson-start 가 다시 내보내는 같은 값을 읽는다.
export const LESSON_START_TEXT = {
  confirm: "하던 수업은 처음부터 다시 해야 해요. 새 수업을 할까요?",
  newLesson: "새 수업 할래요",
  keepGoing: "하던 수업 할래요",
  failed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  /** 둘째 세션을 열 때 첨삭이 아직 없음(4절 · plan-p11b 값 9). */
  stillReading: "아직 글을 살펴보고 있어요",
} as const;
