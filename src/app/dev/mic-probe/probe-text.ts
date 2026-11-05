// 마이크 점검 쪽(/dev/mic-probe)의 글(브리프 task-mic-probe 2026-11-06). 어른(요청자)이 iPad 로 15분 안에 쓰는 관찰 도구라 아이 화면
// 원칙 밖이다(선생님 관찰 쪽과 같음). e2e 가 같은 글을 읽도록 React 없는 모듈로 둔다. 순수 모듈이다.
import type { Strategy } from "./probe-log";

export const MIC_TEXT = {
  title: "마이크 점검(프리뷰 전용)",
  guide:
    "A~G 단추마다 세 번씩 눌러 'apple' 처럼 한 낱말만, 다른 말 없이 말해 주세요. E 는 '사과'.",
  pressGuide:
    "F 는 읽기가 끝난 뒤, G 는 읽는 도중에 '지금 눌러 말하기'를 눌러 말해 주세요.",
  reloadGuide:
    "안 되면 새로 고침 뒤 A 를 다시 눌러 보세요(새로 고침으로 회복되는지도 알고 싶어요)",
  envHeading: "이 기기",
  userAgent: "UA",
  visibility: "화면",
  audioSession: "audioSession.type",
  recognition: "인식",
  load: "쪽 연 횟수",
  none: "없음",
  strategy: {
    A: "A 그냥 듣기",
    B: "B 빠른 시작이면 다시 듣기",
    C: "C 누르자마자 듣기",
    D: "D 읽기 끝 뒤 자동 시작(누름 밖)",
    E: "E 한국어 듣기",
    F: "F 읽기 끝 뒤 누름",
    G: "G 읽는 중 누름",
  } satisfies Record<Strategy, string>,
  idle: "단추를 눌러 주세요",
  speaking: (strategy: Strategy) => `${strategy} 읽어 주는 중이에요`,
  speakingPressable: (strategy: Strategy) =>
    `${strategy} 읽어 주는 중이에요 · 읽는 동안 '지금 눌러 말하기'를 눌러 주세요`,
  awaitPress: "지금 눌러 말하세요",
  pressNow: "지금 눌러 말하기",
  listening: (strategy: Strategy, attempt: number) =>
    `${strategy} 듣는 중이에요 · 시도 ${attempt}`,
  stop: "멈추기",
  lastHeard: (text: string) => `들은 글: ${text}`,
  lastNothing: "들은 글이 없어요",
  noRecognition: "이 브라우저에는 음성 인식이 없어요",
  summaryHeading: "전략별 성공률",
  summaryColumns: ["전략", "누름", "성공", "성공률"] as const,
  recordsHeading: "기록",
  recordsNote:
    "ms 는 그 시도의 start 호출 기준이에요. as audiostart · ss soundstart · sp speechstart",
  noRecords: "아직 기록이 없어요",
  copy: "기록 복사",
  copied: "복사했어요 · 대화창에 붙여 넣어 주세요",
  copyFailed:
    "복사하지 못했어요 · 아래 글을 길게 눌러 전체 선택 뒤 복사해 주세요",
  clear: "기록 지우기",
  cleared: "기록을 지웠어요",
  saveFailed:
    "기록을 이 기기에 저장하지 못했어요 · 새로 고침 전에 '기록 복사'를 먼저 눌러 주세요",
} as const;
