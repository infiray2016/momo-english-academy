# 구현 보고: P9a AI 호출 바탕(implementer impl-p09a, 2026-10-16 23:5x~00:0x)

상태: DONE_WITH_CONCERNS

계획 판 23:5x 기준. 구현은 계획자 보충이 이미 든 판으로 했다. 그 판에는 값 5 의 `priceBookOf` · `priceRowsOfSeed`, 값 8 의 `loadPriceBook` → `priceBookOf`, 증명 표 '6.1 단가 고르기' 시험 셋, 확인한 사실 12 와 '확인할 사실' · '다른 P 에 넘길 것' 절이 들어 있었다. 컨트롤러 알림(23:5x) 뒤 메인 저장소의 지금 판과 글자로 대조했다. 다른 곳은 '컨트롤러 결정' 문단의 P5a · P9 길 구절 하나다. P5a 는 GA 로 두고 맞추지 않으며, H4 뒤 결과가 다르면 P5a 를 베타로 옮긴다. 이 구절은 P9a 코드에 닿지 않아 고친 코드는 없다.

plan-p09a(approved 23:4x, '컨트롤러 결정' 문단까지)의 파일 열넷(새 11 · 고침 3)과 drizzle-kit 생성 파일 셋을 만들었다. 작업 1~7 (가) 명령이 모두 종료 0 이다. 우려는 아래 '검토자에게 알릴 것'의 셋이고 모두 설계 범위 안의 해석이다. 커밋 · 하위 에이전트 · 실제 API 호출 · 키는 없다.

## 바뀐 파일

| 파일 | 신규 / 수정 | 줄 · 무엇 |
|---|---|---|
| `src/db/schema/operations.ts` | 수정 | 138~143: ai_calls 에 `errorCode: text("error_code")`(비울 수 있음, 주석 값 1 그대로)와 셋째 인자 `index("ai_calls_learning_day_idx").on(t.learningDay)`. 가져오기에 `index` 한 줄 |
| `src/core/seed/schema/reference.ts` | 수정 | 389: `thinkingDefault: z.enum(["adaptive", "none"])` 와 주석(값 4 머리) |
| `tests/fixtures/settings.ts` | 수정 | 10~67: 값 2 의 ai.* · talk.safety_* · writing.max_corrections(단계 → 수 사전) · writing.thinkout_max_turns. 72~76: `testSettingValues()`(키 → 값 사전) |
| `src/core/ai/combo.ts` | 신규 | 14 AI_PURPOSES · 26 REALTIME_PURPOSES · 34 THINKING_SETTINGS · 38/40 머리글 상수 · 64 ModelCapabilitiesSchema · 75 capabilitiesOf · 90 ComboBook · 121 settingKeysOf · 144 aiSettingSchemasOf · 172 checkCombo · 203 checkSettingsCombos · 236 thinkingParamOf · 257 ComboError · 281 requestConfigOf · 318 probeConfigOf |
| `src/core/ai/cost.ts` | 신규 | 8 BILLED_REFUSAL_CATEGORIES · 14 PRICE_MISSING_MODEL · 48 MessageLike(구조로만) · 83 parseUsd4 · 88 formatUsd6 · 99 usdToMicros · 107 sumToMicros · 143 billedAttemptsOf · 182 PriceBook · 202 priceRowsOfSeed · 218 priceBookOf · 265 priceOf · 279 costOf |
| `src/core/ai/failure.ts` | 신규 | 6 CONSOLE_LIMIT_MESSAGE_PREFIX · 8 ENFORCED_SPEND_LIMIT_CODE · 16 AttemptFailure · 38 httpFailureOf · 80 FailureClass · 109 classifyFailure(값 6 표 그대로) |
| `src/server/ai/client.ts` | 신규 | 1 `import "server-only"` · 21 ANTHROPIC_API_BASE_URL · 27 AiConfigError · 41 clientOptionsOf · 59 createAnthropicClient · 73 getAnthropicClient · 87 AttemptBody(temperature · top_p · top_k · metadata 를 형에서 뺌) · 116 toAttemptFailure · 135 sendAttempt |
| `src/server/ai/store.ts` | 신규 | 1 `import "server-only"` · 45 insertAiCall · 77 loadPriceBook · 117 dailyUsage · 140 sameErrorCount · 175 createAlertOnce |
| `tests/fixtures/ai/model-prices.ts` | 신규 | 11 MODEL_PRICES_FIXTURE(값 3 의 여섯 행) · 100 fixturePrice · 110 seedModelPrices |
| `tests/fixtures/ai/fake-anthropic.ts` | 신규 | 93 messageBody · 164 errorBody · 178 consoleLimitBody · 369 createFakeAnthropic · 450 startFakeAnthropicServer(`/v1/messages` · `/__fake/rules` · `/__fake/reset` · `/__fake/requests` · `/health`) |
| `tests/unit/combo.test.ts` | 신규 | AC-8i 다섯 · 6.1 조합 다섯 + 하나(아래) |
| `tests/unit/ai-outcome.test.ts` | 신규 | 6.1 비용 넷 · 단가 고르기 셋 · 8절 분류 다섯 |
| `tests/unit/ai-client.test.ts` | 신규 | 6.1 클라이언트 셋 · 시도 셋 + 하나(아래) · 가짜 하나 |
| `tests/integration/ai-store.test.ts` | 신규 | 증명 표의 통합 여섯 |
| `drizzle/0002_ai_calls_error_code.sql` · `drizzle/meta/0002_snapshot.json` · `drizzle/meta/_journal.json` | 생성 · 수정(drizzle-kit) | 손으로 고치지 않음 |

작업 3 (나) `seed/model-prices.json` 은 이 바탕에 `seed/` 가 없어 건너뛰었다(P6 이 이 plan 이 합쳐진 뒤 opus-4-8 행을 'none' 으로).

## 0002 SQL 전문

`pnpm exec drizzle-kit generate --name=ai_calls_error_code` 출력 파일. plan 값 1 의 기대와 글자까지 같다.

```sql
ALTER TABLE "ai_calls" ADD COLUMN "error_code" text;--> statement-breakpoint
CREATE INDEX "ai_calls_learning_day_idx" ON "ai_calls" USING btree ("learning_day");
```

## 시험 수

| 묶음 | 바탕(8791527) | 지금 | 늘어난 것 |
|---|---|---|---|
| 단위 `pnpm test` | 167 | 198 | +31(combo 11 · ai-outcome 12 · ai-client 8) |
| 통합 `pnpm test:int` | 23 | 29 | +6(ai-store 6) |
| spec-trace missing-test | 55 | 54 | AC-8i 가 빠짐 |

증명 표의 이름은 글자 그대로 썼다. 표 밖에 AC 를 붙이지 않은 시험 둘을 더했다: "6.1 호출 목적은 DB 열거형 ai_purpose 와 같은 값 · 차례다"(combo), "6.1 시도: SDK 오류 갈래 넷(타임아웃 · 연결 · 500 · 400)이 8절 분류대로 나온다"(ai-client, 작업 5 완료 조건).

## 작업 7 (가) 명령과 출력

워크트리에서 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH` 로 차례로.

| 명령 | 종료 | 출력 끝 줄 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | `Done in 357ms using pnpm v10.34.7` |
| `pnpm exec biome ci .` | 0 | `Checked 77 files in 50ms. No fixes applied.` |
| `pnpm build` | 0 | `Route (app) ┌ ○ / └ ○ /_not-found` |
| `pnpm test` | 0 | `Tests  198 passed (198)` |
| `pnpm test:int` | 0 | `Tests  29 passed (29)` |
| `pnpm check:deps` | 0 | `✔ no dependency violations found (42 modules, 107 dependencies cruised)` |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 | `spec-trace: 15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 74 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 54` |
| `pnpm check:bundle` | 0 | `check-bundle: 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 6 · 대조한 값 0 · 위반 0` |
| `grep -rn "sk-ant-" src tests` | — | 1건: `tests/unit/check-bundle.test.ts:58` 의 주석(바탕 8791527 에 이미 있는 P1 시험 글, 키 아님). 이 작업의 파일에는 0건 |

작업 1 의 '더하기만' · RLS 시험은 `pnpm test:int` 29 건 안에서 통과했다(`rls-grants.test.ts` 가 0002 도 본다).

## 계획과 다르게 한 것(이유)

1. `checkSettingsCombos` 의 이유에 `invalid-setting` 하나를 더했다. 값 4 표의 이유는 셋이지만, 적재 · 고급 화면이 넘긴 값에 키가 없거나 꼴이 틀리면 조합을 볼 수 없어서다. 조합 검사 자체(`checkCombo`)의 이유는 표대로 셋이다.
2. `billedAttemptsOf` 의 거절 홉 짝짓기는 'i 번째 `message` 항목'이 아니라 'message · fallback_message 를 합친 i 번째 홉 ↔ i 번째 fallback 블록'이다. 한 홉짜리(문서 예시)는 같고, 대체 모델이 다시 거절한 사슬(홉 셋)도 짝이 맞는다. 마지막 응답이 거절일 때의 규칙은 iterations 가 없는 응답(Haiku 등)에도 똑같이 건다(6.1 '출력 전 거절은 … 일 때만').
3. `priceOf` 는 `{ price: PriceEntry | null, missing }` 를 돌려준다. opus-4-8 줄마저 없으면 `price: null` 이고 `costOf` 가 0 단가로 센다. 값 5 의 '서버 경고 기록'은 core 가 기록하지 않으므로 부르는 쪽(P9c)이 `price === null` 을 보고 남긴다.
4. `costOf` 의 결과에 `costMicros`(정수)를 더했다. P9c 의 하루 · 월 합 비교가 글을 다시 풀지 않게.
5. `ComboBook`(조합 검사가 보는 최소 꼴)을 combo.ts 에 두고 cost.ts 의 `PriceBook` 이 그 꼴을 넓힌다. PriceBook 형을 combo 가 가져오면 cost → combo → cost 형 순환이 생기고 dependency-cruiser(tsPreCompilationDeps)가 순환으로 잡기 때문이다.
6. `settingKeysOf` · `aiSettingSchemasOf` · `requestConfigOf` 의 단계 인자는 선택이다. 회화 턴 · 끝맺음 턴만 쓰고, 없으면 던진다.
7. `sendAttempt` 는 `betas` 가 비면 `betas` 를 넘기지 않는다. SDK 가 빈 목록을 빈 `anthropic-beta` 머리글로 보내기 때문이다(설치판 `lib/internal/beta-messages-request.ts` 22줄).
8. `createAlertOnce` 의 `value` 가 없거나 null 이면 그 칸을 빼서 SQL NULL 로 둔다(JSON null 을 뜻으로 쓰지 않음). 시험이 이것을 본다.
9. `seedModelPrices` 의 `effectiveFrom` 인자는 넘기면 모든 줄의 적용일을 그것으로 둔다(시드 줄의 날짜보다 우선). 단가표 시험이 같은 모델을 여러 날짜로 넣는 데 쓴다.

## 남긴 것

- P9b · P9c 파일 전부(입력 가림 · 프롬프트 · 응답 규격 · 정규화 · 출력 검사 · 호출 앞 판정 · 실행 흐름 · 공개 함수 · 계약). `STRUCTURED_OUTPUTS_BETA` 는 상수만 두고 붙이는 일은 P9b.
- 스트리밍 `sendStreamingAttempt` 와 가짜의 SSE 응답(1-나).
- `getAnthropicClient`(모듈 안 하나, 키 · 주소가 바뀌면 새로)는 단위 시험이 없다. 증명 표에 없고 `createAnthropicClient` 를 감싼 것뿐이다.
- `seed/model-prices.json` opus-4-8 행(작업 3 (나)) — 바탕에 seed/ 가 없음.
- 공용 파일 · 정본 · plan 은 고치지 않았다. 요청하는 공용 변경은 없다.

## 검토자에게 알릴 것

1. **알림 한 번 시험의 이빨.** 처음 꼴(같은 DB 연결 풀로 두 번 동시)은 자문 잠금을 빼도 통과했다. 연결 여덟 개짜리 따로 된 DB(`createDb(url, { max: 8 })`)로 여덟 번 동시에 부르게 바꿨고, 잠금 줄을 지운 판에서 세 번 모두 실패 · 되돌린 판에서 세 번 모두 통과를 확인했다.
2. **8절 분류의 (추측) 둘은 plan 그대로다.** 정본 밖 4xx(409 · 422)는 같은 오류, 501(가짜의 '규칙 없음')은 500 이상이라 장애(server:501)로 나온다. 실제 API 는 501 을 쓰지 않는다.
3. **combo 시험의 숫자.** 기대값은 TEST_SETTINGS · MODEL_PRICES_FIXTURE 에서 읽는다. 비용 시험의 토큰 수와 '0.008461' 같은 기대 글은 시험 입력과 손셈 결과이고(주석에 셈을 적음), 시험의 짧은 타임아웃(50 · 200ms) · 늦춤(5초) · 동시 호출 수(8)는 설정값이 아닌 기술 값 상수다.
4. 통합 시험의 알림 종류 글(`ai_config_check` · `monthly_cost`)은 시험용 이름이다. 실제 종류 값은 P9c · 1-나가 정한다(C63 그 밖, c 마).
5. `loadPriceBook` 은 조합 칸이 어긋난 모델을 빼며 `console.warn` 한 줄(모델 이름만)을 남긴다.
