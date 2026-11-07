# 구현 보고: 묶음 0-라 fix 2 — 검토 M1 · M2(2026-10-30 01시)

상태: DONE. 워크트리 `.claude/worktrees/p13d`, 커밋 안 함. 음성 층 파일과 그 시험만 고쳤다.

## 바뀐 것
- M2: `src/lib/speech/types.ts` 오류 결과를 `{ kind: "error", code, started }` 로 바꿨다. `browser.ts` onerror 는 그 발화의 시작 알림 여부를 싣는다.
- M2: `src/core/speech/pace.ts` 에 순수 함수 `speakHeardOutcomeOf(outcome)` 를 더했다. 끝남은 heard 그대로, 오류는 시작 전이면 not_played · 뒤면 no_end, 끊김은 no_end 를 돌린다.
- 결정에 없던 갈래가 하나 있다. 읽을 수 없는 기기(unsupported)는 소리가 나지 않았으므로 not_played 로 두었다.
- M1: `src/lib/speech/paced.ts` 는 끊긴 문장에서 멈추고 끊김을 돌린다. 오류 문장도 위 함수로 바꿔 모은다. 끝난 문장이 하나라도 있으면 `{ kind: "ended", heard: speakHeardOfAll(모은 값) }`, 하나도 없으면 마지막 결과 그대로다.
- 동작 변화가 하나 있다. 접점이 문장을 끊김으로 돌려도 전에는 다음 문장을 읽었지만, 이제는 거기서 멈춘다(결정대로).
- 범위 밖 `teacher-speech.test.ts:94` 오류 기대값에 `started: true` 한 칸만 Edit 로 더했다. 시작 알림 뒤에 결과를 내는 시험이라 참이다.

## 시험
- speech-speak: 'AC-19g … 시작하지 않은 발화(오류로 끝남)…' 기대값에 started: false 를 더했다. 'R-48 음성 접점: 시작 뒤 오류는 시작 여부가 참이고, 끊은 발화는 끊김 그대로다' 는 이름과 기대값을 고쳤다.
- speech-speak 새 하나: 'R-57 결과 바꾸기: 끝남은 heard 그대로, 시작 전 오류는 들려주지 못함, …'(일곱 갈래).
- speech-paced 새 셋: '오류 문장이 앞이든 뒤든 … 끝 알림 없음' · '가운데 문장이 끊기면 거기서 멈추고 끊김' · '끝난 문장이 하나도 없으면 마지막 결과 그대로'.
- 고치기 전에 다섯 시험이 실패하는 것을 확인했다. 덮는 여섯 파일은 71건 모두 통과한다.

## 관문
| 관문 | 결과 |
|---|---|
| pnpm lint | 오류 2: `use-lesson-start.ts:22` · `ai-rest.tsx:11` 가져오기 차례(다른 손의 화면 파일, 안 고침) |
| tsc --noEmit | 오류 0 |
| pnpm test | 파일 103 통과, 시험 1139 통과 · 6 todo |
| check:deps · check:ids | 위반 0 · design-number 49(기준 그대로) |
| spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0 · missing-test 16(앞서 있던 몫) |

## 우려
없음.
