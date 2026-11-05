# 구현 보고: 묶음 0-라 fix 1 — heard 필수 칸 · 여러 문장 모으기(2026-10-30 00:3x)

상태: DONE. 워크트리 `.claude/worktrees/p13d`, 커밋 안 함.

## 바뀐 것
- `src/lib/speech/types.ts` SpeakOutcome 'ended' 의 `heard` 를 필수 칸으로 바꿨다. 주석의 '싣지 않으면 played' 문장은 지웠다.
- `src/core/speech/pace.ts` 새 순수 함수 `speakHeardOfAll(list)`를 넣었다. 모두 played 면 played, 모두 not_played 면 not_played, 그 밖은 no_end, 빈 목록은 played 다.
- `src/lib/speech/paced.ts` 끝난 문장마다 heard 를 모으고, 마지막 결과가 ended 면 모은 값으로 돌린다. 끊김 · 오류 · 읽을 수 없는 기기 결과는 그대로다.
- 범위 밖 시험 셋은 `{ kind: "ended" }` 줄에만 `heard: "played"` 를 더했다. teacher-speech 5줄, speech-paced 4줄, speech-feedback 2줄(Edit, 직전에 다시 읽음)이다.
- speech-paced 4줄 가운데 3줄은 손 접점이 아니라 기대값(`toEqual({ kind: "ended" })`)이다. 필수 칸이 된 결과를 비교하려면 같이 고쳐야 해서 더했다.

## 시험(speech-speak 에 더함, 범위 밖 파일에는 새 시험을 넣지 않음)
- 'R-48 모으기: 모두 들려줌이면 들려줌, 모두 들려주지 못함이면 들려주지 못함, 섞이면 끝 알림 없음, 빈 목록은 들려줌이다'
- 'R-48 문장 나눠 읽기: 앞 문장을 들려주지 못하고 뒤 문장을 들려주면 끝 알림 없음으로 돌린다'(고치기 전 실패 확인)
- 'R-57 문장 나눠 읽기: 모든 문장을 들려주지 못했을 때만 들려주지 못함이다'
- 덮는 여섯 파일(speech-speak · fake-web-speech-defaults · speech-paced · speech-pace · teacher-speech · speech-feedback)은 67건 모두 통과한다.

## 관문
| 관문 | 결과 |
|---|---|
| pnpm lint | 통과(460 파일, 고칠 것 없음) |
| tsc --noEmit | 오류 0 |
| pnpm test | 파일 102 통과, 시험 1124 통과 · 6 todo |
| check:deps | 위반 0 |
| check:ids | design-number 49(기준 그대로), 이번 파일에서 나온 것 없음 |
| spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0 · missing-test 16(앞서 있던 몫) |

seed-validator-teach 는 이번 실행에서 lint · tsc · 시험이 모두 통과했다. 다른 손의 fix 가 먼저 들어간 것으로 보이며, 그 파일은 건드리지 않았다.

## 우려
없음.
