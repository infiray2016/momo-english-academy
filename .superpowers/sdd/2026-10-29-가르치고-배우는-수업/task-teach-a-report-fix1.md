# 구현 보고 fix 1: 묶음 아(검토 I1 · M3 · M4) — 2026-10-30 02:0x, 구현자 Opus · high

상태 DONE_WITH_CONCERNS. 자기 파일 셋만 고쳤고 커밋하지 않았다. M1 · M2 · M5 · M6 은 손대지 않았다.

- I1 `src/core/session/teach-metrics.ts` togetherOutcomeOf: input.judge 가 있으면 judge.final 이 correct 일 때만 맞음으로 판정한다. 판정 칸이 없을 때만 지금 셈(보기 · 카드 · 허용 답 일치율 · 시도 수)을 쓴다. 짝 판정과 같은 차례다.
- 시험: 'AC-22o 수업 설계 지표: 같이 해 보기에 판정 칸(judge)이 있으면 일치율이 문턱 위여도 judge.final 로 판정한다'를 더했다. 허용 답 그대로의 인식 글에 retry 면 틀림이고, correct 면 맞음이다. 고치기 전에 실패하는 것을 확인했다.
- M3 · M4 `scripts/teach-metrics.ts`: 머리 주석에 '읽는 법' 문단을 더했다. 출력 머리 글 두 줄도 고쳤다. 스스로 해냄에는 읽기 도움을 쓴 짝 맞음과 의사소통 정답이 들어 독립 해냄보다 넓다고 적었다. 짝 시도 없음과 U 는 분모에서 뺀다고 적었다. 시도 시각은 서버가 묶음을 받은 시각이라 오프라인 묶음은 0 근처로 나오고, 사람이 거른다고 적었다.

## 관문(p13d, 02:0x)
lint 종료 1(오류 4, 모두 다른 손의 파일: src/app/globals.css · src/components/board/paper-key.ts · src/components/session/mic-blocked.tsx · tests/unit/ux-tokens.test.ts, 이 묶음 파일 셋은 오류 0) · tsc 종료 0 · test 종료 1(109 파일 · 1219 통과 · 1 실패 · 6 todo. 실패는 ux-tokens.test.ts 'AC-23e (1)', board.tsx 가 코르크 바탕 토큰을 씀. teach-metrics 시험 14 통과) · check:deps 종료 0 · check:ids 종료 0(design-number 49) · spec:trace --fail-on unknown-ac 종료 0(unknown-ac 0).

## 우려(1)
1. lint · test 실패 둘은 UI · UX 묶음이 고치는 중인 파일에서 난다. 지시대로 고치지 않았고, 그 묶음이 끝난 뒤 관문을 다시 돌려야 한다.
