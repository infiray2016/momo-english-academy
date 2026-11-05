# 구현 보고: UI · UX plan 묶음 0-라 — 음성 층 감시 결과 셋(2026-10-30 00:1x)

상태: DONE_WITH_CONCERNS. 워크트리 `.claude/worktrees/p13d`, 커밋 안 함.

## 바뀐 파일
- `src/core/speech/pace.ts:47` 형 `SpeakHeard = "played" | "no_end" | "not_played"`, `:53` 순수 함수 `speakHeardOf({ started, endNotified })` — 시작 알림이 없으면 not_played, 시작만 있으면 no_end, 둘 다 있으면 played.
- `src/lib/speech/types.ts:18` SpeakOutcome 'ended' 에 `heard?: SpeakHeard`(주석: 음성 접점은 늘 싣고, 싣지 않은 손 접점 값은 played 로 읽는다).
- `src/lib/speech/browser.ts:470 · 506` 발화마다 시작 알림 여부를 들고, `:497` 감시 끝냄(giveUp no-start · no-end)은 `endNotified: false`, `:515` 정상 끝(onend)은 `endNotified: true` 로 heard 를 싣는다. 감시 상한 · 기록(timeout 줄)은 그대로다. 끊김 · 오류 결과는 바꾸지 않았다.
- `src/lib/speech/paced.ts:29` 첫 값도 `{ kind: "ended", heard: "played" }`.
- 가짜 음성(`src/lib/speech/fake-web-speech.ts`)은 고치지 않았다. 대본 칸 neverStart · neverEnd 로 세 갈래가 이미 만들어진다.
- 설정 키는 지금 것(speakWatchOf 가 읽는 감시 상한 셋)을 그대로 쓰고 새 숫자는 없다.

## 설계와 다르게 한 것
1. heard 를 선택 칸(`?`)으로 두었다. 필수로 하면 범위 밖 시험 셋(teacher-speech · speech-paced · 다른 손의 새 파일 speech-feedback)의 손 접점 `{ kind: "ended" }` 가 tsc 에서 깨진다. 필수로 바꾸려면 그 셋에 `heard: "played"` 를 더하는 허용이 필요하다(요청).
2. 시작 알림 없이 끝 알림만 온 발화도 R-48 문장('시작 알림이 없는 발화는 들려주지 못함')대로 not_played 로 했다. 지금까지는 그냥 ended 였다(값만 더해지고 화면 동작은 그대로).

## 시험(전부 통과)
- speech-speak: 기존 '음성 접점: 넘긴 빠르기…' · 'AC-19g … 결과보다 앞에 온다' · 'U5-1 … 시작 알림이 …' · 'U5-1 … 끝 알림이 …' · 'U5-1 … 감시가 남지 않는다' 의 기대값에 heard 를 더함.
- speech-speak 새 셋: 'R-48 감시 결과: 시작 · 끝 알림이 다 오면 들려줌…' · 'R-48 음성 접점: 시작 알림 없이 끝 알림만 온 발화는 들려주지 못함이다' · 'R-48 음성 접점: 끊은 발화 · 오류로 끝난 발화에는 들려준 결과를 싣지 않는다'.
- fake-web-speech-defaults 새 하나: 'R-48 가짜 음성: 대본의 보통 발화 · neverEnd · neverStart 가 음성 접점에서 들려줌 · 끝 알림 없음 · 들려주지 못함이 된다'.
- 덮는 시험 다섯 파일(speech-speak · fake-web-speech-defaults · speech-paced · speech-pace · teacher-speech): 46 통과.

## 관문
| 관문 | 결과 |
|---|---|
| pnpm lint | 실패 1: `tests/unit/seed-validator-teach.test.ts` 형식(다른 손의 새 파일, 안 고침) |
| tsc --noEmit | 오류 1: 같은 파일 1543 줄 `goalsBlocking` 이 ValidateOptions 에 없음(다른 손) |
| pnpm test | 파일 101 통과 · 1 실패, 시험 1098 통과 · 19 실패 · 6 todo. 실패 19 는 모두 seed-validator-teach |
| check:deps | 위반 0 |
| check:ids | design-number 49(기준 49 그대로), 이번 파일에서 나온 것 없음 |
| spec:trace --fail-on unknown-ac | 통과, unknown-ac 0 · missing-test 16(앞서 있던 P12 몫) |

## 우려
1. paced.ts 는 여러 문장을 읽으면 마지막 문장의 heard 를 돌린다. 앞 문장이 들려주지 못함이고 마지막만 들려줌이어도 played 가 된다. R-57 '한 번도 들려주지 못함'을 지문 · 들려주기에 쓰려면 문장 결과를 모으는 규칙이 필요하다(5-나 앞에서 정할 것).
2. heard 가 선택 칸이라 새 접점이 빠뜨려도 tsc 가 잡지 않는다(위 '다르게 한 것' 1).
