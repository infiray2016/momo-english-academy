# fix 2 보고: P9c AI 흐름 · 계약(implementer impl-p09a 이어 보기, 2026-10-17 14:3x~14:4x)

상태: DONE

재검토 `review-p09c-2.md`(Changes requested — C 0 · I 1 · M 2)의 새 지적 N-1~N-3 과 범위 밖 관찰 2(덤)를 브리프 `task-p09c-fix2.md` 판정대로 고쳤다. 지난 I-1 · M-1~M-5 는 건드리지 않았다.

워크트리 p09(feature/1a-p09c-ai-flow)에서 했다. 커밋 · 공용 파일 변경 · 실제 API 호출은 없다. P9c 의 fix 라운드 2(상한 3)다.

## 지적마다

| 번호 | 판정 | 파일:줄 | 무엇을 · 시험 |
|---|---|---|---|
| N-1(Important) | ADDRESSED | `tests/integration/ai-errors.test.ts:369` '설정 문제' 시험 · `:381` 오류 이름 단언 · `:408` 지운 키 되돌리기 | 설정 없음 사례 바로 뒤에서 지운 `ai.max_tokens.writing_check` 를 `seedSettings` 로 TEST_SETTINGS 값으로 다시 넣는다(afterEach 되돌리기는 그대로). 뒤 사례 셋이 다시 각자의 갈래를 지난다. 결과 꼴을 바꾸지 않고 갈래를 구분하는 단언도 더했다. 사례마다 서버 오류 기록(`[ai] writing_check: 설정 문제(<오류 이름>)` — 목적 · 오류 이름만)이 SettingMissingError · ComboError · SettingInvalidError · AiConfigError 로 각각 한 줄인지 본다. try/finally 로 console.error 감시를 되돌린다 |
| N-2(Minor) | ADDRESSED | `scripts/ai-observe.ts` 머리 주석 · `:281` transientErrors · `:285` REJECTED_STATUS · `:389` transientText · `:496` 관찰표 문장 | 묶음을 '받지 않음'으로 버리는 것은 400(invalid_request)만이다. 그 밖의 200 아닌 응답(5xx · 한도 아닌 429 · 401 등)과 응답 없음(상태 0 — 덤)은 `transientErrors` 로 따로 센다. 관찰표 '일시 오류' 열에 `일시 오류 3회(0 → 응답 없음 1회 · 429 1회 · 529 1회)` 꼴로 남기고, 고르기에는 쓰지 않는다. 줄이 아니므로 지연 · 위반 통계에서도 빠진다. 관찰표 끝 문장은 '받지 않은 쪽은 고르지 않는다(400 — 위험 11 …). 일시 오류는 고르기에 쓰지 않고 횟수만 적는다.'로 고쳤다. 앞 시험의 문장 단언도 맞췄다. 새 시험 "관찰표: 일시 오류(5xx · 한도 아닌 429 · 응답 없음)는 묶음을 버리지 않고 '일시 오류 n회'로 따로 센다"(ai-schemas.test.ts:763) |
| N-3(Minor) | ADDRESSED | `tests/integration/ai-store.test.ts:320` · `:334` | '6.1 하루 사용량' 시험에 두 가지를 더했다. 하나는 프로필이 비어 있는 실시간 호출 행 하나(비용 0 — 프로필 삭제 뒤 비워진 행 꼴)다. 다른 하나는 `dailyUsage({ profileId: null })` 가 `{ profileCalls: 0, householdCostMicros: 3500 }`(프로필 있을 때와 같은 집 합)인지의 단언이다 |
| 덤(범위 밖 관찰 2) | ADDRESSED | `scripts/ai-contract.ts:98` NO_RESPONSE_STATUS · `:736` sendCase · `scripts/ai-observe.ts:518` runObserve | `sendCase` 는 상태 없는 APIError(타임아웃 · 연결)를 던지지 않고 `status: 0` 실패로 돌려준다. 본문은 `{ type: "error", error: { type: <오류 이름> } }` 이고 메시지 · 요청 내용이 없다. 계약 명령은 그 사례를 어긋남으로 적고 다음 사례로 간다. 관찰 명령은 실행부를 `runObserve(args, io)` 로 꺼냈다(계약 명령의 `runContract` 와 같은 꼴, main 이 키 · 파일 쓰기를 넘긴다). 그래서 응답 없음을 묶음의 일시 오류로 세고 다음 사례로 가며 산출물 둘을 끝까지 쓴다. 새 시험은 둘이다. "관찰 명령: 실행 중 연결이 한 번 끊겨도 일시 오류로 세고 다음 사례로 가며 산출물을 끝까지 쓴다(가짜 클라이언트)"(:793)는 요청 11 · 산출물 2 · jsonl 10줄 · 관찰표에 '일시 오류 1회' · 줄 출력에 오류 메시지 없음을 본다. "AI 계약 명령: 응답 없는 오류(연결 · 타임아웃)는 다시 던지지 않고 status 0 실패로 그 사례를 어긋남으로 적는다"(:852) |

## 망가뜨림 표

N-1 — 복사본에서 `src/server/ai/run.ts` `isConfigError` 의 갈래를 하나씩 지우고 `-t "설정 문제"` 를 돌렸다.

| 지운 갈래 | 고치기 전 판 | 고친 뒤 |
|---|---|---|
| SettingMissingError | 깨짐 | 깨짐 |
| ComboError | **통과(빈 단언)** | 깨짐 |
| SettingInvalidError | 깨짐 | 깨짐 |
| AiConfigError | **통과(빈 단언)** | 깨짐 |

고치기 전 판은 넷 가운데 **둘**(ComboError · AiConfigError)이 안 깨졌다. 브리프는 '셋'으로 적었으나 실측은 둘이다. 꼴이 틀린 effort 사례는 설정 읽기 차례에서 `ai.effort.writing_check` 가 지운 `ai.max_tokens.writing_check` 보다 앞서, SettingMissingError 가 아니라 SettingInvalidError 를 먼저 낸다. 그래서 고치기 전에도 그 갈래만은 실제로 지났다. 고친 뒤 넷 모두 깨지고, 매번 원본으로 되돌렸다(`diff -q` 같음).

| 그 밖 | 고치기 전 판(또는 망가뜨린 판) | 고친 뒤 |
|---|---|---|
| N-3: store.ts SQL `profile_id = $1` → `IS NOT DISTINCT FROM $1` | '6.1 하루 사용량' 이 깨짐(`profileCalls: 1` ≠ 0) | 원본 SQL 에서 통과, 되돌림 확인 |
| 덤: 가짜가 한 번 끊는(network-error) 사례 | 관찰 · 계약 시험이 `Error: Connection error.`(cause `TypeError: fetch failed`)로 던져 멈춤 | 두 시험 통과(일시 오류 · status 0 어긋남) |
| N-2: 일시 오류 시험 | 고치기 전 `rejected` 에 0 · 429 · 529 가 들어 실패 | 통과 |

## 바뀐 파일

- `tests/integration/ai-errors.test.ts`(N-1)
- `tests/integration/ai-store.test.ts`(N-3, P9a 시험 파일에 한 사례)
- `scripts/ai-observe.ts`(N-2 · 덤 — runObserve 꺼내기)
- `scripts/ai-contract.ts`(덤 — sendCase · NO_RESPONSE_STATUS)
- `tests/contract/ai-schemas.test.ts`(N-2 · 덤 시험 셋, 앞 시험의 문장 단언 하나 맞춤)

`src/` 는 바뀐 것이 없다(망가뜨림은 복사본에서 하고 되돌렸다).

## 다르게 한 것

1. **N-1 의 갈래 단언은 서버 오류 기록으로 했다.** 결과 꼴(`{ ok: false, reason: "config" }`)을 바꾸지 않고 오류 이름을 볼 수 있는 곳이 `logConfigProblem` 의 한 줄이다(목적 · 오류 이름만, 값 · 아이 글 없음). 그 줄을 단언했다.
2. **'일시 오류'에 400 밖 4xx(401 · 404 등)도 든다.** 브리프의 구분은 '400 이면 받지 않음, 그 밖은 버리지 않음'이다. 계정 · 같은 오류는 일시가 아니지만, 묶음을 버리지 않고 횟수로 남긴다는 처리는 같아 한 열에 둔다. 열 이름은 브리프대로 '일시 오류'다.
3. **관찰 명령의 실행부를 `runObserve` 로 꺼냈다.** 끊김 사례를 파일 · 네트워크 없이 시험하려면 꺼내야 했다. 키가 없으면 `createClient` 가 ScriptInputError 를 내고 main 이 종료 2 로 바꾼다(앞과 같은 동작).

## 완료 판정 대조

| 판정 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | 0 — `Done in 349ms using pnpm v10.34.7` |
| `pnpm exec biome ci .` | 0 — `Checked 128 files in 61ms. No fixes applied.` |
| `pnpm build` | 0 |
| `pnpm test` | 0 — `Tests  258 passed \| 6 todo (264)`(255 → 258) |
| `pnpm test:int` | 0 — `Tests  59 passed (59)`(N-1 · N-3 은 기존 시험 안의 사례라 수는 그대로) |
| `pnpm check:deps` | 0 — `✔ no dependency violations found (56 modules, 170 dependencies cruised)` |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 — missing-test 46 그대로 |
| `pnpm check:bundle` | 0 — 위반 0 |
| `pnpm ai:contract --dry-run` | 0 — `ai-contract: 설정 TEST_SETTINGS · 단가표 MODEL_PRICES_FIXTURE(2026-10-17) · 사례 15` |
| `pnpm ai:observe` | 0 — 예상 비용만(`묶음 11 · 호출 220 · 예상 비용 약 3.24달러 …` · `--yes 가 없어 부르지 않는다`) |
| 비밀값 grep | 바탕 둘뿐(`tests/unit/check-bundle.test.ts:58` · `scripts/check-bundle.ts:28`) |

## `git status --short`

```
 M next.config.ts
 M package.json
 M src/core/seed/structure.ts
 M src/server/ai/store.ts
 M tests/integration/ai-store.test.ts
?? ".superpowers/sdd/2026-10-16-1-\352\260\200-\352\265\254\355\230\204/task-p09c-fix1-report.md"
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

P9c 전체가 아직 커밋 전이라 P9c 파일이 모두 보인다. 이 보고 파일도 아직 목록에 없는데, 쓴 뒤에 생긴다.
