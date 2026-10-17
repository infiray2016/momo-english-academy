# fix 3 보고: P9c AI 흐름 · 계약 — Minor 라운드(implementer impl-p09a 이어 보기, 2026-10-17 15:2x)

상태: DONE

재검토 `review-p09c-3.md`(Approved, C 0 · I 0 · M 1)의 Minor N2-1 과 범위 밖 관찰(H4 전 필수 — 녹화 표본 TypeError)을 브리프 `task-p09c-fix3.md` 판정대로 고쳤다. P9c fix 라운드 3(상한)이다.

워크트리 p09(feature/1a-p09c-ai-flow)에서 했다. 커밋 · 공용 파일 변경 · 실제 API 호출은 없다. 이번 라운드는 망가뜨림을 하지 않았다. 고치기 전 실패는 시험을 먼저 써서 봤다.

## 지적마다

| 번호 | 판정 | 파일:줄 | 무엇을 · 시험 |
|---|---|---|---|
| N2-1(Minor) | ADDRESSED | `scripts/ai-observe.ts` 머리 주석(4~7줄) · `:283~284` configErrors · `:297` ObserveErrors · `:305` observeFailureOf · `:434` configText · `:454` ObserveStop · `:553` 관찰표 끝 문장 · `:623` 멈춤 | 200 아닌 응답을 계약 명령과 같은 8절 분류(`classifyFailure(httpFailureOf(status, body, retry-after))`)로 셋으로 센다(상태 0 은 응답 없음). (1) 400 이고 `same_error`(요청 거부)는 '받지 않음'이고 고르지 않는다(위험 11). (2) `console_limit` · `account` · 그 밖의 `same_error`(404 · 413 …)는 새 열 '설정 · 한도 오류'(오류 코드별)이고 고르기에 쓰지 않는다. 첫 `console_limit` · `account` 에서 남은 묶음을 건너뛰고 그때까지의 산출물 둘을 쓴다. 관찰표에 '실행이 <코드>(콘솔 한도 · 계정)로 막혀 남은 묶음 n개를 건너뛰었다' 줄이 든다. (3) `server` · `rate_limit` · 응답 없음은 '일시 오류'다. 셋 모두 지연 · 위반 통계 밖이다. 머리 주석 · 관찰표 끝 문장을 이 셋에 맞췄다 |
| 범위 밖(H4 전 필수) | ADDRESSED | `tests/contract/ai-schemas.test.ts:111` consoleLimitSamples · checkConsoleLimits · checkRecordedCalls(녹화 표본 대 보기를 함수로) · Sample 형의 expect 주석 | 콘솔 한도 표본 고르기를 둘로 나눴다. 손으로 만든 표본은 `expect?.classify`, 녹화 표본(recordOf 꼴 — 실제 응답 기록이라 `expect` 가 없다)은 H12 사례 id `case === "console-limit"` 으로 고른다. 녹화 표본은 '규격에 맞는지'만 본다(`checkRecordedCalls`). 파일 전체를 훑었다. `s.expect.` 를 읽는 다른 곳(155 · 170 · 178 · 191 · 204 · 231 · 294 근처)은 모두 손으로 만든 표본(`handmade` · `messageSamples`)만 읽어 그대로 두었다 |

새 시험은 다섯이다(모두 `tests/contract/ai-schemas.test.ts` 'fix 3' 묶음).
- **녹화 표본 TypeError**
  - :919 "9절 계약: 녹화 표본(recordOf 꼴, expect 없음)이 있어도 표본 읽기 · 규격 대 보기 · 콘솔 한도 분류가 깨지지 않는다"
  - 임시 폴더에 `recordOf` 로 `writing_check.l4`(200) · `console-limit`(400 워크스페이스 한도) 녹화 둘을 쓴다. 표본 읽기 · 규격 대 보기 1건 · 콘솔 한도 셋(손 둘 + 녹화 하나) 분류가 오류 없이 도는지 본다
- **N2-1**
  - :967 "관찰표: 200 아닌 응답은 8절 분류로 받지 않음(400 거부) · 설정 · 한도 오류(콘솔 한도 · 계정 · 404 · 413, 앞 둘은 멈춤) · 일시 오류(5xx · 한도 아닌 429 · 응답 없음)로 가른다"
    - observeFailureOf 를 단위로 본다(400 거부 · 콘솔 한도 400 · 429 · 401 · 404 · 413 · 500 · 529 · 한도 아닌 429 · 0)
  - :1065 "관찰 명령: 콘솔 한도 400 은 '설정 · 한도 오류'로 세고 남은 묶음을 건너뛰며 그때까지의 산출물 둘을 쓴다(가짜 클라이언트)"
    - 요청 1 · 산출물 2 · 행에 `설정 · 한도 오류 1회(console_limit:400 1회)` · '받지 않음(' 없음 · '남은 묶음 10개를 건너뛰었다'
  - :1086 "관찰 명령: 400 요청 거부는 '받지 않음', 529 는 '일시 오류'로 세고 나머지 묶음을 계속 돈다(가짜 클라이언트)"
    - 요청 11 · adaptive 행 `받지 않음(400 1회)` · off 행 `일시 오류 1회(529 1회)` · 건너뜀 없음 · `- writing_check: off`
- **앞 라운드 시험 둘의 입력 꼴 맞춤.** fix 1 · fix 2 의 summarize 시험 둘은 입력 꼴(`{ 400: 3 }` → `{ rejected: { 400: 3 } }`, `{ 529: … }` → `{ transient: { 529: … } }`)만 새 꼴로 바꿨다. 단언은 그대로다.

## 고치기 전 실패 둘

| 사례 | 고치기 전 | 고친 뒤 |
|---|---|---|
| 녹화 표본이 하나 있을 때(:919) | `TypeError: Cannot read properties of undefined (reading 'classify')` | 통과 |
| 콘솔 한도 400 관찰(:1065) | 요청 11번(남은 묶음을 건너뛰지 않음) — 콘솔 한도 400 이 상태 숫자로 '받지 않음'에 세어짐 | 통과(요청 1, 설정 · 한도 오류) |

함께 처음 돌린 :967(observeFailureOf 없음 — `is not a function`)과 summarize 꼴 바뀐 시험 둘도 고치기 전 실패했다. :1086(400 거부 · 529)은 고치기 전 코드도 같은 결과를 내는 덮기 시험이라 처음부터 통과했다.

## 바뀐 파일

이번 라운드에 손댄 파일은 둘이다. 둘 다 아직 추적 전 파일이라 `git diff --stat` 에 나오지 않는다. 수정 시각은 `scripts/ai-observe.ts` 15:24 · `tests/contract/ai-schemas.test.ts` 15:23 이다.
- `scripts/ai-observe.ts`
- `tests/contract/ai-schemas.test.ts`

`src/` 는 이번 라운드에 바뀌지 않았다. `src/server/ai/run.ts` · `store.ts` 의 수정 시각은 14:38(fix 2 때) 그대로다. 아래 `git diff --stat` 은 바탕 커밋(P9b 6213662) 대비 P9c 전체에서 추적 파일이 바뀐 몫이다.

```
$ git diff --stat
 next.config.ts                     | 2 ++
 package.json                       | 4 +++-
 src/core/seed/structure.ts         | 4 ++++
 src/server/ai/store.ts             | 3 ++-
 tests/integration/ai-store.test.ts | 6 ++++++
 5 files changed, 17 insertions(+), 2 deletions(-)

$ git status --short
 M next.config.ts
 M package.json
 M src/core/seed/structure.ts
 M src/server/ai/store.ts
 M tests/integration/ai-store.test.ts
?? ".superpowers/sdd/2026-10-16-1-\352\260\200-\352\265\254\355\230\204/task-p09c-fix1-report.md"
?? ".superpowers/sdd/2026-10-16-1-\352\260\200-\352\265\254\355\230\204/task-p09c-fix2-report.md"
?? ".superpowers/sdd/2026-10-16-1-\352\260\200-\352\265\254\355\230\204/task-p09c-report.md"
?? scripts/ai-contract.ts
?? scripts/ai-observe.ts
?? src/core/ai/cost-alert.ts
?? src/server/ai/index.ts
?? src/server/ai/run.ts
?? src/server/seed-lists.ts
?? tests/contract/
?? tests/fixtures/ai/recorded/
?? tests/fixtures/ai/samples/
?? tests/integration/ai-calls.test.ts
?? tests/integration/ai-errors.test.ts
?? tests/integration/safety-cap.test.ts
?? tests/unit/cost-alert.test.ts
```

이 보고 파일은 위 목록 뒤에 생긴다.

## 다르게 한 것

1. **건너뛴 묶음 수는 '시작하지 않은 묶음'만 센다.** 멈춘 묶음의 남은 시도는 그 묶음 행의 n · 오류 수에 드러나므로 따로 세지 않는다.
2. **'설정 · 한도 오류'의 열쇠는 오류 코드다**(`console_limit:400` · `account:401` · `same_error:404`). '받지 않음' · '일시 오류'는 상태 숫자다.

## 완료 판정 대조

| 판정 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | 0 — `Done in 340ms using pnpm v10.34.7` |
| `pnpm exec biome ci .` | 0 — `Checked 128 files in 58ms. No fixes applied.` |
| `pnpm build` | 0 |
| `pnpm test` | 0 — `Tests  262 passed \| 6 todo (268)`(258 → 262) |
| `pnpm test:int` | 0 — `Tests  59 passed (59)` |
| `pnpm check:deps` | 0 — `✔ no dependency violations found (56 modules, 170 dependencies cruised)` |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 — missing-test 46 |
| `pnpm check:bundle` | 0 — 위반 0 |
| `pnpm ai:contract --dry-run` | 0 — `ai-contract: 설정 TEST_SETTINGS · 단가표 MODEL_PRICES_FIXTURE(2026-10-17) · 사례 15` |
| `pnpm ai:observe` | 0 — 예상 비용만(`묶음 11 · 호출 220 · 예상 비용 약 3.24달러 …` · `--yes 가 없어 부르지 않는다`) |
| 녹화 표본 시험 | 통과(:919) |
| 비밀값 grep | 바탕 둘뿐(`tests/unit/check-bundle.test.ts:58` · `scripts/check-bundle.ts:28`) |
