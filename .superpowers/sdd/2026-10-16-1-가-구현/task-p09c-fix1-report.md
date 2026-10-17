# fix 1 보고: P9c AI 흐름 · 계약(implementer impl-p09a 이어 하기, 2026-10-17 13:3x~13:4x)

상태: DONE

검토 `review-p09c.md`(Changes requested, C 0 · I 1 · M 5)의 지적 여섯을 브리프 `task-p09c-fix1.md` 판정대로 모두 고쳤다(M-1 은 컨트롤러 결정 C69).

시험을 먼저 고쳤다. 고치기 전에 넷이 실패했다(I-1 둘 · M-5 · M-1 기대값 바꿈). M-3 · M-4 시험은 지금 코드에서도 통과하는 덮기 시험이라, 코드를 망가뜨린 판에서 깨지는 것을 보고 되돌렸다.

커밋 · 실제 API 호출 · 키는 없다. 공용 파일(package.json · next.config.ts)은 앞 판 그대로다. 바뀐 파일은 run.ts · store.ts(한 줄 형 넓힘) · ai-observe.ts · ai-contract.ts · 시험 넷(ai-errors · safety-cap · ai-schemas, ai-calls 는 그대로)이다.

## 지적마다

| 번호 | 판정 | 파일:줄 | 무엇을 · 시험 |
|---|---|---|---|
| I-1 | ADDRESSED | `scripts/ai-contract.ts:240` withFormat 내보냄 · `scripts/ai-observe.ts:225` groupRequest · `:277~281` rejected · Rejections · `:359` chooseThinking · `:374` rejectedText · `:456` 관찰표 줄 · `:496` 200 아닌 응답 세기 | (1) 관찰 요청에 `withFormat(built.body, built.wireSchema)` 로 형식을 붙인다(앱 흐름 · 계약 명령과 같은 길). (2) 시험 "관찰표: 모든 묶음의 요청에 구조화 출력 형식이 있고 제목이 규격 제목이다"(ai-schemas.test.ts:683)는 off 묶음이 생각 끔인지도 본다. (3) 200 이 아닌 응답을 묶음마다 상태별로 센다. 요약에 `rejected` 칸, 관찰표에 '받지 않음' 열(`받지 않음(400 3회)`)을 둔다. 받지 않은 쪽은 고르지 않으며, 관찰표에 '받지 않은 묶음은 adaptive 를 고른다(위험 11 …)' 줄을 둔다. 응답이 하나도 없는 묶음도 n 0 으로 요약에 남는다. 시험 "관찰표: 200 이 아닌 응답은 묶음마다 '받지 않음'으로 남기고 그 묶음은 adaptive 를 고른다"(:704) |
| M-1 | ADDRESSED(C69) | `src/server/ai/run.ts:357` finish · `:431` 실패 갈래 | 출력 검사 · 결과 만들기를 `finish` 하나로 묶었다. 둘째 시도가 장애 갈래(`countsTowardDown` — 타임아웃 · 연결 · 서버 · 한도 아닌 429)로 끝나고 기억한 `lastPrepared` 가 있으면, 느슨한 규격으로 정규화해 쓴다. 행은 첫 시도 `validation_failed` 와 둘째 실패 행 둘이다. 거절은 그대로 refusal 이다. 시험 '두 시도의 기다림 …' 기대값을 `ok: true · normalized: true`(고칠 곳 1개)와 행 `validation_failed · timeout` 으로 바꿨다. 새 시험 "6.1 흐름: 첫 시도부터 전송 실패면 기억한 값이 없어 실패를 돌려준다"(ai-errors.test.ts:314)는 연결 실패 두 번에 `connection` 과 행 둘을 본다 |
| M-2 | ADDRESSED | `src/server/ai/store.ts:119~123` · `run.ts:317` | `dailyUsage` 의 `profileId` 를 `string \| null` 로 넓히고 'null 이면 호출 수 0 — 확인 호출 · 프로필 없는 호출' 주석을 달았다. SQL 은 그대로다. run.ts 는 `ctx.profileId` 를 그대로 넘기고 `NO_PROFILE_ID` 를 지웠다 |
| M-3 | ADDRESSED | `tests/integration/safety-cap.test.ts:240~250` | 확인 호출 행에 `ai.safety_daily_cost_usd` 만큼의 비용(15.000000)을 실은 행을 더했다. 그래도 상한 수만큼 나가는지 본다. `dailyUsage` 의 `ne(purpose, "probe")` 를 지운 판에서 이 시험이 깨졌고, 되돌렸다 |
| M-4 | ADDRESSED | `tests/integration/ai-errors.test.ts:73~100` touched · afterEach · deleteHouseholdSetting · `:341` | 설정 행 하나(`ai.max_tokens.writing_check`)를 지워 SettingMissingError 갈래로 `config` 와 요청 0 을 본다. 시험이 바꾸거나 지운 집 전체 키를 `touched` 에 모아 afterEach 가 TEST_SETTINGS 값으로 다시 넣는다. 그래서 중간 단언이 실패해도 다음 시험에 남지 않는다. `isConfigError` 에서 SettingMissingError 를 뺀 판에서 시험이 깨졌고, 되돌렸다 |
| M-5 | ADDRESSED | `scripts/ai-contract.ts:885` | 생각 꺼내기 사례는 `done` 이면 그 턴을 마지막으로 보고 멈춘다. 녹화는 보낸 턴까지만 한다. 시험 "AI 계약 명령: 생각 꺼내기는 done 이면 그 턴에서 멈추고 보낸 턴까지만 녹화한다(가짜 클라이언트)"(ai-schemas.test.ts:725)는 `runContract` 의 실제 실행 길을 P9a 가짜 Anthropic 클라이언트로 돌린다. 첫 턴에 done 표본을 받으면 요청 1 · 녹화 파일 1(`thinkout.l6.turn1.json`) · 종료 0 이다 |

## 시험 수

| 묶음 | fix 전 | fix 뒤 |
|---|---|---|
| 단위 `pnpm test`(unit + contract) | 252 + todo 6 | 255 + todo 6(contract 새 셋) |
| 통합 `pnpm test:int` | 57 | 58(ai-errors 새 하나) |
| spec-trace missing-test | 46 | 46 |

## 명령과 출력

| 명령 | 종료 | 출력 끝 줄 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | `Done in 383ms using pnpm v10.34.7` |
| `pnpm exec biome ci .` | 0 | `Checked 128 files in 81ms. No fixes applied.` |
| `pnpm build` | 0 | `○  (Static)  prerendered as static content` |
| `pnpm test` | 0 | `Tests  255 passed \| 6 todo (261)` |
| `pnpm test:int` | 0 | `Tests  58 passed (58)` |
| `pnpm check:deps` | 0 | `✔ no dependency violations found (56 modules, 170 dependencies cruised)` |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 | `… unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 46` |
| `pnpm check:bundle` | 0 | `check-bundle: … 위반 0` |
| `pnpm ai:contract --dry-run` | 0 | 첫 줄 `ai-contract: 설정 TEST_SETTINGS · 단가표 MODEL_PRICES_FIXTURE(2026-10-17) · 사례 15` |
| `pnpm ai:observe` | 0 | `묶음 11 · 호출 220 · 예상 비용 약 3.24달러(6.6 1회 비용 × 횟수, 추측)` · `--yes 가 없어 부르지 않는다` |
| `grep -rn "sk-ant-" src tests scripts` | — | 바탕의 check-bundle 두 파일 밖 0건 |

## 다르게 한 것

1. **(아래 '보충'으로 바뀜)** **M-1 의 '장애 갈래'를 `countsTowardDown` 으로 읽었다.** 브리프의 '타임아웃 · 연결 · 서버'에 한도 아닌 429(rate_limit)가 함께 든다. 콘솔 한도 · 계정 · 같은 오류는 첫 시도 값으로 돌아가지 않고 그 실패를 돌려준다. 둘째 시도에서 이 갈래가 나오는 일은 드물고, 나오면 AI 를 못 쓰는 상태라 실패를 알리는 쪽이 맞다고 봤다.
2. **M-5 시험이 계약 명령의 실제 실행 길을 처음 덮는다.** 가짜 Anthropic 클라이언트를 `createClient` 로 넘긴다. 앞 보고 '알릴 것 1(실제 호출 길 안 돌림)'의 생각 꺼내기 몫이 가짜로 확인됐다(withResponse · 녹화 · 종료 코드).

## 알릴 것

1. **관찰 명령의 실제 응답 꼴은 여전히 H4 뒤 첫 실행이 확인한다.** 형식을 붙인 요청 꼴은 시험이 본다.
2. **M-1 의 결과 상태.** 첫 시도 값으로 돌아간 결과는 `normalized: true` 이고, 출력 검사에 걸렸는지는 `checked` 로 돌려준다. 그 시도의 행은 따로 남기지 않는다. 행은 둘이고, 출력 검사 결과는 결과 값에만 있다.

## 보충(컨트롤러 지시 2026-10-17 13:4x — M-1 범위를 C69 대로)

상태: DONE

13절 C69 는 "둘째 시도의 실패 종류와 무관하게 아이는 결과를 받는다 — 거절만 예외(C63 (2))"다. 앞의 '다르게 한 것 1'(장애 갈래로만 좁힘)을 없앴다.

- **바꾼 것.** `src/server/ai/run.ts:432` 의 조건을 `failure.countsTowardDown && lastPrepared !== undefined` 에서 `lastPrepared !== undefined` 로 바꿨다. 둘째 시도가 응답 전에 어떤 실패로 끝나든 기억한 첫 응답 값이 있으면 느슨한 규격으로 정규화해 돌려준다. 실패 갈래는 타임아웃 · 연결 · 서버 · 한도 · 콘솔 한도 · 계정 · 같은 오류 가운데 무엇이어도 된다.
- **행.** ai_calls 둘째 행에는 그 실패 갈래(status · error_code)를 그대로 남긴다. 같은 오류면 '호출 설정 확인 필요' 알림 세기도 그대로 돈다. 1-나의 쉬는 중 판정은 행으로 하므로 영향이 없다.
- **거절.** 거절(refusal)은 응답이 온 갈래라 지금처럼 실패다.
- **시험(먼저 쓰고 실패를 봄).** 새 시험은 "6.1 흐름: 둘째 시도가 콘솔 한도 · 같은 오류로 끝나도 첫 응답 값을 정규화해 돌려주고 둘째 행에는 그 실패 갈래가 남는다"(ai-errors.test.ts:314)다. 첫 시도는 `writing_check.over`, 둘째는 콘솔 한도 400(워크스페이스) · 같은 오류 404 두 사례다. 각각 `ok: true · normalized: true`(고칠 곳 1개) · 요청 2 · 행 `[validation_failed, null]` · `[limit, console_limit:400]` / `[error, same_error:404]` 를 단언한다. 고치기 전에는 실패했다.

| 묶음 | 보충 전 | 보충 뒤 |
|---|---|---|
| 단위 `pnpm test` | 255 + todo 6 | 255 + todo 6 |
| 통합 `pnpm test:int` | 58 | 59 |
| spec-trace missing-test | 46 | 46 |

| 명령 | 종료 | 출력 첫 줄 · 끝 줄 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | `Done in 354ms using pnpm v10.34.7` |
| `pnpm exec biome ci .` | 0 | `Checked 128 files in 65ms. No fixes applied.` |
| `pnpm build` | 0 | `○  (Static)  prerendered as static content` |
| `pnpm test` | 0 | `Tests  255 passed \| 6 todo (261)` |
| `pnpm test:int` | 0 | `Tests  59 passed (59)` |
| `pnpm check:deps` | 0 | `✔ no dependency violations found (56 modules, 170 dependencies cruised)` |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 | `… unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 46` |
| `pnpm check:bundle` | 0 | `check-bundle: … 위반 0` |
| `pnpm ai:contract --dry-run` | 0 | `ai-contract: 설정 TEST_SETTINGS · 단가표 MODEL_PRICES_FIXTURE(2026-10-17) · 사례 15` |
| `pnpm ai:observe` | 0 | `묶음 11 · 호출 220 · 예상 비용 약 3.24달러(…)` · `--yes 가 없어 부르지 않는다` |
| `grep -rn "sk-ant-" src tests scripts` | — | 바탕의 check-bundle 두 파일 밖 0건 |
