# fix 1 보고: 묶음 나 검토 M1 · M3 · M4(2026-10-30 01:4x, 구현자 Opus · high) — DONE_WITH_CONCERNS

- **M1** `src/core/session/attempt.ts`: V2_FIELDS(slot · aid · story · judge · techError)를 두고, 꼴 전체에 superRefine 을 걸어 판 1 시도에 그 칸이 있으면 거부한다. 꼴을 판마다 나누면 다른 묶음의 teach-metrics.ts 가 타입에서 깨져서, 타입(AttemptInput)은 그대로 두고 읽기에서만 거른다. 시험: session-attempt '판 1 시도에 판 2 칸 … 거부하고 같은 칸의 판 2 시도는 받는다'(여덟 갈래).
- **M3** `src/server/writing/index.ts:219` · `composition.ts:170 · 729`: 세 곳의 활동 차례 호출에 lesson.teach 를 넘긴다. 시험: writing-check 'teach 칸이 든 수업은 쓰기 확인도 세션과 같은 여섯 자리 활동 번호로 받는다'(통합, 정적 작성).
- **M4** `src/core/session/spares.ts`: outcomeContextOf(화면 자료의 config · homophones · lemmaEntries · appJudged → OutcomeContext) · firstFinalsOf(시도 목록 → 첫 끝 시도) · spareInputOf(화면 자료 + 시도 목록 → sparesFromFinals 입력, 짝 없는 수업은 undefined)를 더했다. 시험: session-spares '기기 쪽 짝 입력'(서버 입력과 같은 짝, 진행 시도 · 둘째 끝 시도 뺌).
- **같이 고친 것(브리프 밖 시험 한 줄):** `tests/integration/writing-check.test.ts:323` 은 서버가 저장한 쓰기 확인 시도를 `v: 1` 로 기대했다. 첫 라운드에서 판이 2 로 올라 CI 에서 실패했을 줄이라, 기대 값을 INPUT_VERSION 으로 바꿨다. 같은 꼴의 다른 기대는 grep 해 보니 없었다.
## 관문(p13d, 01:4x)
| 명령 | 결과 |
|---|---|
| lint | 종료 0 |
| tsc | 종료 0 |
| test | 종료 1, 1220 통과 · 1 실패. 실패한 ux-tokens 는 01:44 에 다른 손이 고친 globals.css 의 color-mix 줄바꿈 때문이고 이 묶음과 상관없다 |
| check:deps | 종료 0 |
| check:ids | 종료 0(design-number 47 · fixture-setting 0) |
| spec:trace --fail-on unknown-ac | 종료 0 |

## 우려(3)
1. 서버 scoringOf(`src/server/session/index.ts`)는 아직 outcomeContextOf 를 부르지 않는다. 이번 fix 허용 파일 밖이라 손대지 않았다. 값은 같지만, 한 함수로 모으려면 index.ts 한 줄을 고쳐야 한다.
2. 기기는 이 기기에서 낸 첫 시도만 안다. 다른 기기에서 이어 하면 view.spares(서버 값)를 써야 하고, 이 조건은 spareInputOf 주석에 적었다. 라-2 가 지켜야 한다.
3. 통합 시험(M3 · 판 기대 고침)은 정적으로만 썼다.
