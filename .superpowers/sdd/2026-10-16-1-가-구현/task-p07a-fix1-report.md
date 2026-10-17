# fix 1 보고: P7a 적재 · 판 규칙(impl-p07a · Opus · high)

상태: DONE. 검토 review-p07a(Important 1 · Minor 6)와 덤 하나를 모두 고쳤다. 워크트리 `.claude/worktrees/p07`, 커밋 없음, 실제 DB 접속 없음. 공용 파일(package.json)은 그대로다. 바꾼 파일은 `scripts/seed-load.ts` · `src/server/seed/load.ts` · `tests/integration/seed-load.test.ts` · `tests/integration/seed-version.test.ts` 넷이다.

시험을 먼저 고쳤다. 새 시험 넷은 고치기 전에 실패했다(I-1 · M-1 은 종료 1 과 질의 오류 노출, M-2 는 위반 둘, M-4 는 SETTING_KEY_LINES 없음, 덤은 `--areas` 거부). M-5 · M-6 단언은 지금 코드로도 지난다(이미 맞던 성질을 고정).

## 지적마다

| 지적 | 판정 | 파일:줄 | 시험 |
|---|---|---|---|
| I-1 적재 중 DB 오류 | ADDRESSED | `scripts/seed-load.ts:266-270`(catch → `seed-load: DB 오류로 적재를 되돌렸다(<이름 코드>)` · 종료 2, `error.cause ?? error` 의 이름 · 코드만) · `:304-313`(main 에 거부 처리, `seed-load: 예상 밖 오류(<이름 코드>)` · exitCode 2) · 머리 주석 `:6-7` | `seed-load.test.ts:855` "적재 명령: 적재 중 DB 오류는 종료 2 와 오류 이름 · 코드 한 줄이고 칸 내용 · SQL 을 내지 않으며, 접속 확인이 실패하면 접속을 닫는다" — select 1 은 지나고 transaction 이 DrizzleQueryError(params 에 표지 글, cause CONNECTION_CLOSED)를 던지는 가짜 접속. 돌려준 줄 · console.log · error · warn 어디에도 표지 글 · `insert into` · 접속 문자열 없음, close 1 번 |
| M-1 접속 확인 실패 때 닫기 | ADDRESSED | `scripts/seed-load.ts:240-248`(handle 이 있으면 close, 닫기 실패는 삼킴) | 같은 시험 뒤 절반(execute 가 던지는 가짜 접속 → 종료 2 · close 1 번) |
| M-2 DB 단가 행 규격 어긋남 | ADDRESSED(컨트롤러 판정: 적재 전체 거부) | `src/server/seed/load.ts` 단가 계획(`invalidPriceKeys`, 위반 `price-row-invalid` 987 줄 근처, table model_prices · key `<모델> <적용일>` · 값 없음). 그 키의 시드 줄은 price-row-changed 로 다시 세지 않고, 그때는 조합 검사를 건너뛴다(`settingsChecks` 의 `skipCombos`) | `seed-load.test.ts:499` "5절 적재: DB 단가 행의 조합 칸이 규격에 맞지 않으면 price-row-invalid 로 적재 전체를 거부하고 값을 내지 않는다" — 위반 하나뿐 · 보고 JSON 에 표지 값 없음 · 모든 표 행 수 그대로 |
| M-3 칸 종류 불일치 | ADDRESSED | `src/server/seed/load.ts:326 · 345 · 381 · 398` → `throw cellKindMismatch(cell.key)`(메시지에 칸 키만) | 닿지 않는 길이라 시험 없음(검토도 '지금은 닿지 않는다') |
| M-4 지킨 키 · 시드에 없는 DB 키 이름 | ADDRESSED | `src/server/seed/load.ts:833` `loadSeedWithKeys`(보고 + `settingKeys { kept, orphans }`, `loadSeed` 는 보고만 — 꼴 그대로) · `:963` · `scripts/seed-load.ts:33` `SETTING_KEY_LINES = 20` · `keyLines` · `humanLines` 에 `kept <키>` · `orphan <키>` 줄 | `seed-load.test.ts:938` "적재 명령: 사람용 출력은 지킨 키 · 시드에 없는 DB 키를 값 없이 이름만 줄마다 내고 --json 꼴은 그대로다" — 고급 키 하나를 DB 에서 바꾸고 시드에 없는 키 22 개를 넣음 → `kept ai.daily_cost_alert_usd`, `orphan` 20 줄 + `orphan … 외 2`, 값 없음. `--json` 에는 키 이름 없음 · 수만(kept 1 · orphans 22) |
| M-5 '다시 하기' 단언 | ADDRESSED | `seed-version.test.ts` 'AC-17a 정정 3.1 …' — 3.0 으로 끝낸 세션을 넣고, 정정 뒤 그 세션은 3.0 행 · 다시 하기로 새로 읽으면 3.1(행 id 가 3.0 과 다름) · 진행 중 세션은 3.0 그대로 | 시험 이름 그대로 |
| M-6 배치 answer 열 | ADDRESSED | `seed-load.test.ts` 'AC-17b 같은 판을 두 번 …' 안(271 줄 근처) — placement_items 모든 행의 answer 가 칸 객체의 answerNo · accepted · sentence 가운데 있는 것과 같고 `answerOf(칸)` 와 같다(빈 객체가 아님도) | 시험 이름 그대로 |
| 덤 `--areas` 공백 | ADDRESSED | `scripts/seed-load.ts:82-85`(`split(",").map(trim).filter(Boolean)`) | 첫 명령 시험의 인자 줄 `" reading , writing,speaking "` → 셋 |

## 시험 수

| 묶음 | fix 전 | 지금 |
|---|---|---|
| 단위 | 221 | 221 |
| 통합 | 51 + 건너뜀 1 | 54 + 건너뜀 1(+3: M-2 · I-1 · M-4) |
| spec-trace missing-test | 51 | 51 |

## 명령 출력 첫 줄

```
pnpm install --frozen-lockfile        → Done in 385ms using pnpm v10.34.7 (exit 0)
pnpm exec biome ci .                  → Checked 87 files … No fixes applied. (exit 0)
pnpm build                            → exit 0
pnpm test                             → Test Files 22 passed (22) · Tests 221 passed (221)
pnpm test:int                         → Test Files 6 passed (6) · Tests 54 passed | 1 skipped (55)
pnpm check:deps                       → ✔ no dependency violations found (46 modules, 132 dependencies cruised)
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec
                                      → … unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 51 (exit 0)
pnpm check:bundle                     → check-bundle: 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 6 · 대조한 값 0 · 위반 0
비밀값 grep(바뀐 파일 넷)             → 0 건
pnpm seed:load --root tests/.tmp      → seed-load: 꼭 있어야 하는 규격 파일이 없다: settings.json · ELIFECYCLE exit code 2 · 접속 문자열 없음
                                        (셸에 MIGRATION_DATABASE_URL · DATABASE_URL 0 건, .env.local 없음 확인 뒤)
```

## 다르게 한 것 · 알릴 것

1. M-4 의 키 이름은 보고 꼴을 바꾸지 않으려고 `loadSeedWithKeys` 하나를 더해 따로 돌려준다. `loadSeed` 의 이름 · 꼴 · 동작은 그대로다(시험 · P7b 가 쓰는 꼴).
2. M-2 에서 DB 단가 행이 하나라도 규격에 어긋나면 조합 검사를 건너뛴다. 믿을 수 없는 단가표로 `unknown-model` 같은 덧붙은 위반을 내지 않으려는 것이고, 거부는 `price-row-invalid` 로 이미 된다. 그 키의 시드 줄은 `price-row-changed` 로도 세지 않는다.
3. I-1 의 줄은 원인이 있으면 원인의 이름 · 코드(`Error CONNECTION_CLOSED`), 없으면 오류 자체의 이름 · 코드다. 질의 오류 메시지 · SQL · params 는 어디에도 내지 않는다. `main` 의 거부 처리도 이름 · 코드만 낸다.
4. 머리 주석의 종료 코드 2 에 '적재 중 DB 오류'를 더했다. 1(거부)과 2(입력 · 환경 · DB 오류)의 뜻은 plan 값 5 그대로다.
