# fix 1 보고: P9a AI 호출 바탕(implementer impl-p09a, 2026-10-17 00:3x)

상태: DONE

검토 `review-p09a.md`(Approved, C 0 · I 0 · M 7)의 Minor 일곱을 모두 고쳤다. 계획 판은 23:5x 기준이다. 시험을 먼저 더했다. M-4 · M-5 시험은 고치기 전에 실패했다. 이미 맞던 동작을 덮는 시험(M-1 · M-2 · M-3 · M-6)은 코드를 일부러 망가뜨려 시험이 깨지는 것을 보고 되돌렸다. 검토가 받은 '다르게 한 것' 1~9 와 '알릴 것' 1~5 는 그대로 두었다. 보고 8절의 P9c 메모는 고치지 않았다. 커밋 · 실제 API 호출 · 키는 없다.

## 지적마다

| 번호 | 판정 | 파일:줄 | 무엇을 · 실패 확인 |
|---|---|---|---|
| M-1 | ADDRESSED | `tests/unit/ai-client.test.ts:211~217` | 본문 금지 칸 시험 안에서 temperature 가 든 본문을 `AttemptBody` 에 넣고 `// @ts-expect-error` 를 단다. `client.ts` 의 `Omit` 에서 temperature 를 빼 보니 `tsc` 가 `TS2578: Unused '@ts-expect-error' directive`(214줄)로 깨졌고, 되돌렸다 |
| M-2 | ADDRESSED | `tests/unit/ai-outcome.test.ts:276~308` | 홉 셋 사슬을 넣었다. 요청 모델 message(출력 0) · 대체 A message(출력 0) · 대체 B fallback_message 와 fallback 블록 둘(cyber · bio)이다. 첫 홉은 빠지고 둘째 홉과 답한 홉이 남는다. 짝짓기를 늘 첫 블록으로 바꿔 보니 시험이 깨졌고, 되돌렸다 |
| M-3 | ADDRESSED | `tests/unit/combo.test.ts:359~366` · `tests/integration/ai-store.test.ts:248~262` | 앞은 `ai.model.thinkout` 을 지우고 `ai.thinking.writing_check: "on"` 을 넣어 두 구간이 invalid-setting 인지 본다. 뒤는 Sonnet 5.5 에 다른 날짜(2026-03-01)의 어긋난 줄을 더해, 맞는 줄이 있어도 그 모델이 단가표에서 빠지는지 본다. invalid-setting push 를 지운 판과 `broken` 거르기를 지운 판에서 각각 시험이 깨졌고, 되돌렸다 |
| M-4 | ADDRESSED | `tests/fixtures/ai/model-prices.ts:106~119` · 시험 `tests/integration/ai-store.test.ts:264~286` | 셋째 인자를 선택으로 바꾸고 `effectiveFrom ?? entry.effectiveFrom` 으로 쓴다. 함수 주석도 고쳤다. 새 시험은 고치기 전에 실패했다(두 날짜가 한 날짜로 눌림) |
| M-5 | ADDRESSED | `src/server/ai/store.ts:18~19` · 시험 `tests/integration/ai-store.test.ts:350` | 패턴을 `"same\\_error:%"` 로 바꿨다. 실제 값은 `same\_error:%` 이고 바이트로 확인했다. C17 시험에 `sameXerror:400` 행을 더했고, 고치기 전에는 3 으로 세어 실패했다 |
| M-6 | ADDRESSED | `tests/unit/ai-client.test.ts:152~180` | 시험 "6.1 클라이언트: getAnthropicClient 는 같은 환경이면 같은 인스턴스, 키 · VERCEL_ENV · ANTHROPIC_BASE_URL 이 바뀌면 새로 만든다"를 더했다. `vi.stubEnv` 로 주소 · 키 · VERCEL_ENV 를 차례로 바꾸고, 키가 비면 AiConfigError 인지도 본다. 캐시 서명에서 주소를 빼 보니 시험이 깨졌고, 되돌렸다 |
| M-7 | ADDRESSED | `tests/unit/ai-client.test.ts:83` · `src/server/ai/client.ts:40` | `clientWith` 의 읽히지 않던 `ANTHROPIC_BASE_URL` 칸을 지웠다. `clientOptionsOf` 주석에 'env 에서는 키와 VERCEL_ENV 만 읽고, 주소는 SDK 가 process.env 에서 읽는다'를 더했다 |

AC 를 붙이지 않은 새 시험 셋의 이름은 다음과 같다(spec-trace 수는 그대로).
- "6.1 조합 검사: 설정값이 없거나 꼴이 틀리면 invalid-setting 이다"
- 위 M-6 시험
- "시험용 자료: seedModelPrices 는 셋째 인자가 없으면 줄마다의 적용일을 쓰고, 넘기면 모든 줄을 덮는다"

나머지는 기존 시험 안에 더했다.

## 시험 수

| 묶음 | fix 전 | fix 뒤 |
|---|---|---|
| 단위 `pnpm test` | 198 | 200 |
| 통합 `pnpm test:int` | 29 | 30 |
| spec-trace missing-test | 54 | 54 |

## CI 순서 명령

| 명령 | 종료 | 출력 끝 줄 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | `Done in 344ms using pnpm v10.34.7` |
| `pnpm exec biome ci .` | 0 | `Checked 77 files in 72ms. No fixes applied.` |
| `pnpm build` | 0 | `○  (Static)  prerendered as static content` |
| `pnpm test` | 0 | `Tests  200 passed (200)` |
| `pnpm test:int` | 0 | `Tests  30 passed (30)` |
| `pnpm check:deps` | 0 | `✔ no dependency violations found (42 modules, 107 dependencies cruised)` |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 | `… unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 54` |
| `pnpm check:bundle` | 0 | `check-bundle: … 위반 0` |
| `grep -rn "sk-ant-" src tests` | — | 1건으로 바탕과 같다. `tests/unit/check-bundle.test.ts:58` 의 P1 주석이고, 이 작업의 파일에는 0건이다 |

## 남은 우려

없다. 처음 묶어서 망가뜨림을 돌렸을 때 M-3b 판의 종료 코드가 0 으로 찍혔다. 그 판만 따로 다시 돌리니 시험이 `expected true to be false` 로 깨졌다. 앞의 0 은 묶어 돌린 셸 함수가 종료 코드를 잘못 읽은 것으로 본다. 망가뜨린 코드는 모두 되돌렸고, `tsc` 와 위 CI 가 깨끗하다.
