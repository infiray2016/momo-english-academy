// 마이크 점검 쪽(/dev/mic-probe)의 글(브리프 task-mic-probe 2026-11-06, fix 1 · fix 2 · fix 7 '자동 W 라운드' — 진짜 세션을 열 때만 크게
// '지금 apple 이라고 말해요', 그 밖에는 '기다려요'만, 분석 10.18.3 X-2). 어른(요청자)이 iPad 로 15분 안에 쓰는 관찰
// 도구라 아이 화면 원칙 밖이다(선생님 관찰 쪽과 같음). e2e 가 같은 글을 읽도록 React 없는 모듈로 둔다. 순수 모듈이다.
import type { ResetStep, Strategy } from "./probe-log";

export const MIC_TEXT = {
  title: "마이크 점검(프리뷰 전용)",
  roundStart: "자동 W 라운드",
  roundGuide:
    "'자동 W 라운드' 단추를 한 번 누르고, iPad 를 앞에 둔 채 기다려요. 화면에 큰 글씨로 '지금 apple 이라고 말해요'가 나올 때만 'apple' 이라고 말해요. 마지막에 '이제 banana 라고 말해요'가 한 번 나와요. 그 밖에는 말하지 않고, 선생님 목소리가 나와도 따라 하지 않아요. 화면에 '끝났어요'가 나오면 끝이에요.",
  roundWait: "기다려요",
  roundRest: (seconds: number) => `준비 중 · 남은 ${seconds}초`,
  roundSay: "지금 apple 이라고 말해요",
  roundSayNext: "이제 banana 라고 말해요",
  roundDone: (n: number, m: number) => `끝났어요 · 진짜 살아남 ${n}/${m}`,
  autoStart: "자동 측정 시작(혼자 4분쯤)",
  autoGuide:
    "한 번 누르면 쪽이 혼자 순서를 돌려요. 말하지 않아도 돼요. 화면을 켜 둔 채 이 쪽에 머물러 주세요(결과는 서버 기록으로 가요).",
  autoStep: (index: number, total: number, label: string) =>
    `자동 측정 ${index}/${total} · ${label}`,
  autoRunning: "도는 중이에요",
  autoWait: (seconds: number) => `다음까지 ${seconds}초`,
  autoWebAudioOff: "무음 WebAudio 끄기",
  autoDone: "끝났어요. 이제 한 낱말 확인",
  logStats: (sent: number, failed: number) =>
    `서버 기록: 보냄 ${sent} · 실패 ${failed}`,
  guide:
    "단추를 누를 때마다 'apple' 처럼 한 낱말만, 다른 말 없이 말해 주세요. E 는 '사과'.",
  pressGuide:
    "F · G · H · I 는 '지금 눌러 말하세요'가 보이면 '지금 눌러 말하기'를 눌러 말해 주세요(G 는 읽는 도중에 눌러요).",
  reloadGuide:
    "안 되면 새로 고침 뒤 '지금 한 일'을 고르고 A 를 다시 눌러 보세요(새로 고침으로 회복되는지도 알고 싶어요)",
  newTabMark: "새 탭",
  newTabGuide:
    "새 탭이에요. 'M 새 탭에서 듣기'를 세 번 눌러 주세요. 끝나면 이 탭을 닫고 처음 탭에서 '기록 복사'를 눌러 주세요.",
  envHeading: "이 기기",
  userAgent: "UA",
  device: "기기",
  touchPoints: "터치 점",
  platform: "platform",
  micPermission: "마이크 권한",
  tab: "탭 표지",
  tabFirst: "이 쪽에서 첫 듣기",
  tabNote:
    "새 탭 · 사파리 종료 뒤가 아니면 탭 상태는 몰라요(같은 탭에서 앱이 먼저 음성 인식을 썼는지는 가르지 못해요)",
  navigation: "연 방법",
  openedAt: "연 때",
  visibility: "화면",
  audioSession: "audioSession.type",
  webAudio: "무음 WebAudio",
  webAudioOff: "꺼짐",
  webAudioStop: "무음 WebAudio 끄기",
  recognition: "인식",
  load: "쪽 연 횟수",
  yes: "예",
  no: "아니요",
  none: "없음",
  resetLabel: "지금 한 일(다음 기록부터 붙어요)",
  reset: {
    "as-is": "그대로",
    reload: "새로 고침 뒤",
    "new-tab": "새 탭 뒤",
    "safari-quit": "사파리 종료 뒤",
    reboot: "재시동 뒤",
    dictation: "받아쓰기 확인 뒤",
    "pause-45": "45초 쉼 뒤",
    "pause-90": "90초 쉼 뒤",
  } satisfies Record<ResetStep, string>,
  strategy: {
    A: "A 그냥 듣기",
    B: "B 빠른 시작이면 다시 듣기",
    C: "C 누르자마자 듣기",
    D: "D 읽기 끝 뒤 자동 시작(누름 밖)",
    E: "E 한국어 듣기",
    F: "F 읽기 끝 뒤 누름",
    G: "G 읽는 중 누름",
    H: "H 무음 읽기 뒤 누름",
    I: "I 앱 첫 차례 재현(무음 읽기 · 선생님 인사 · 쉼 뒤 누름)",
    K: "K 무음 WebAudio 켜 둔 채 듣기",
    "L-transient": "L transient 로 두고 듣기",
    "L-transient-solo": "L transient-solo 로 두고 듣기",
    "L-ambient": "L ambient 로 두고 듣기",
    "L-playback": "L playback 으로 두고 듣기",
    M: "M 새 탭에서 첫 듣기(새 탭을 열어요)",
    S: "S 한 세션 계속 듣기(10초 간격으로 세 번 말하기)",
    S2: "S2 세션 중 읽기(한 번 말한 뒤 읽기, 두 번 더 말하기)",
    T: "T abort 로 끝낸 뒤 한 번 더",
    "T-next": "T 뒤 한 번 더(A 꼴)",
    W3: "W3 버림 3초 → 진짜",
    W10: "W10 버림 10초 → 진짜",
    W25: "W25 버림 25초 → 진짜",
    WR: "WR 자동 W 라운드",
  } satisfies Record<Strategy, string>,
  newTabListen: "M 새 탭에서 듣기",
  newTabOpened:
    "새 탭을 열었어요 · 새 탭에서 'M 새 탭에서 듣기'를 눌러 주세요. 안 열렸으면 팝업 차단을 끄거나, 새 탭에 이 주소 끝에 #newtab 을 붙여 열어 주세요",
  idle: "단추를 눌러 주세요",
  speaking: (strategy: Strategy) => `${strategy} 읽어 주는 중이에요`,
  speakingPressable: (strategy: Strategy) =>
    `${strategy} 읽어 주는 중이에요 · 읽는 동안 '지금 눌러 말하기'를 눌러 주세요`,
  pausing: (strategy: Strategy) => `${strategy} 잠깐 쉬는 중이에요`,
  awaitPress: "지금 눌러 말하세요",
  awaitFollowUp:
    "이어서 '지금 눌러 말하기'를 눌러 한 번 더 말해 주세요(T 뒤 A)",
  pauseNone: "아직 끝난 듣기가 없어요",
  pause: (seconds: number) => `앞 듣기 끝난 뒤 ${seconds}초`,
  pauseNote:
    "이 쪽에서 앞 듣기가 끝난 뒤 지난 시간이에요(기록의 '앞 끝 뒤'와 같은 기준). 45초 · 90초 쉼을 셀 때 써요",
  pressNow: "지금 눌러 말하기",
  speakInSession: "세션 중 읽기(줄을 비우고 읽어요, 듣기는 그대로)",
  unlock: "읽기 제약 풀기(무음 읽기만, 듣기 없음)",
  unlockLine: (started: boolean, ended: boolean, error: string | null) =>
    `읽기 제약 풀기: 시작 알림 ${started ? "예" : "아니요"} · 끝 알림 ${ended ? "예" : "아니요"}${error === null ? "" : ` · 오류 ${error}`}`,
  decoySpeakToggle: (on: boolean) =>
    `W 읽기: ${on ? "켬(버림 중 2초 때 읽어요)" : "끔"} · 눌러서 바꿔요`,
  decoyRunning: "기다려요",
  decoyReal: "지금 apple 이라고 말해요",
  beep: "WebAudio 소리 1초",
  beepLine: (state: string) => `WebAudio 소리: ${state}`,
  listening: (strategy: Strategy, attempt: number) =>
    `${strategy} 듣는 중이에요 · 시도 ${attempt}`,
  stop: "멈추기",
  lastHeard: (text: string) => `들은 글: ${text}`,
  lastNothing: "들은 글이 없어요",
  noRecognition: "이 브라우저에는 음성 인식이 없어요",
  summaryHeading: "전략별 성공률",
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
    "기록을 이 기기에 저장하지 못했어요 · 새로 고침 · 탭 닫기 전에 '기록 복사'를 먼저 눌러 주세요",
} as const;
