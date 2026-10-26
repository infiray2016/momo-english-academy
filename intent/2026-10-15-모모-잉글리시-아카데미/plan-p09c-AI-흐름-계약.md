# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P9c AI 흐름 · 계약(호출 앞 판정 · 비용 알림 판정 · 실행 흐름 · 공개 함수 · 시드 목록 읽기 · AI 계약 · 관찰표)

spec: `specs/` 정본(6.1 다시 요청 · 기다림 한도 · ai_calls · 비용 알림 · 안전 상한, 6.4 끝 문단, 6.6, 8절 상황 표('AI 호출 하나의 실패 · 지연' · '다시 보내도 같은 오류' · '안전 분류기 거절' · '실시간 응답 검증 실패' · '비용 알림 기준 도달'), 9절 AI 계약 · AI 계약(수동) · 실시간 호출 표본 평가 · 통합, 10절 운영 행, 11절 1-가 (7), 12절 ai.* · talk.safety_*, 15절 AC-8a · AC-8b · AC-8c · AC-8d · AC-8n · AC-N2, 13절 C1 · C15 · C17 · C21 · C28 · C46 · C48 · C50 (2), approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P9 행 · 역분석 제안 5(`docs/research/2026-10-16-reverse-engineering.md`) · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: done
승인: 컨트롤러 2026-10-16 23:4x(C63, P9a '컨트롤러 결정') · 브랜치 · 워크트리: `feature/1a-p09c-ai-flow`(P9b 브랜치 끝에서, P9 워크트리) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P9 셋 가운데 셋째다. `plan-p09a-AI-호출-바탕.md`(요청 구성 · 클라이언트 · 실패 분류 · 비용 · 기록 · 가짜) → `plan-p09b-AI-호출-넷.md`(가림 · 프롬프트 · 규격 · 정규화 · 출력 검사) 다음에 같은 워크트리에서 한다. 확인한 사실은 P9a '확인한 사실과 출처'(번호로 가리킨다)에 있다.
이 plan 이 끝나면 P11 이 쓸 공개 함수 넷(쓰기 확인 · 첨삭 · 말하기 평가 · 생각 꺼내기)이 가짜 클라이언트로 증명되고, 실제 표본(H4 뒤)으로 계약 시험 · 관찰표를 채운다.

컨트롤러 결정(2026-10-16 23:4x): 승인. 정할 것 가~자의 판정은 `plan-p09a-AI-호출-바탕.md` '컨트롤러 결정' 문단(가는 C63 (1), 나는 C63 (2), 라는 C63 (5)). P9b 끝에서 이어 한다. 작업 8 은 H4 뒤 요청자 지시로 컨트롤러가 돈다. 명령은 `PATH=… pnpm …` 꼴(P9a 메모).

## 목표 (Goal)

- 호출 하나의 흐름을 정한다: 설정 읽기 → 학습일 → 단가표 · 조합 → 호출 앞 판정 → 시드 목록 · 이름 가림 → 요청 본문 → 시도(많아야 둘) → 비용 셈 · 기록 → 정규화 · 출력 검사 → 결과. 시도마다 ai_calls 한 행(6.1, AC-8c).
- 다시 보내기는 둘뿐이다. 응답이 `end_turn` 이 아니거나(거절 밖) Zod 검증에 실패하면 1회 다시 요청하고, 다시 실패하면 정규화한 값을 쓴다(6.1 · 8절 '실시간 응답 검증 실패'). 대화형 호출(쓰기 확인 · 말하기 평가 · 생각 꺼내기)은 응답 전 연결 실패에만 1회 다시 보낸다(6.1 · 8절). 타임아웃 · 장애 · 한도 · 계정 · 다시 보내도 같은 오류는 다시 보내지 않는다. 두 시도의 기다림은 타임아웃의 두 배를 넘지 않는다(6.1). 거절은 즉시 다시 요청하지 않는다(정할 것 나).
- 하루 안전 상한: 호출을 보내기 전에 프로필의 그날 호출 수가 ai.safety_daily_calls(1000)에, 집의 그날 비용이 ai.safety_daily_cost_usd(15달러)에 닿았으면 그 학습일의 실시간 호출을 보내지 않는다. 1-가는 막고 안내만 한다(11절 (7), 안내 문구는 C50 (2) — 화면은 P11). 알림 기준(ai.daily_call_alert 150 · ai.daily_cost_alert_usd 1 · ai.monthly_cost_alert_usd 12 와 배수 · 콘솔 한도 근접 56달러)은 호출을 막지 않는다(6.1 · AC-8a · AC-8b). 판정 함수는 1-가, 비용 알림 행을 만드는 일 · 'AI 쉬는 중' 상태 · 확인 호출은 1-나다(11절 · 묶음 위험 8).
- 다시 보내도 같은 오류(한도 아닌 400 · 404 · 413, 모델 은퇴)는 그 호출 하나의 실패이고, 같은 목적에서 한 학습일에 ai.down_after_failures(3)번 나면 부모 알림 '호출 설정 확인 필요'(목적 · 모델 · 오류 코드)를 그날 한 번 만든다(C17 · AC-8n).
- 시드 목록(금지어 · 정규식)은 빌드에 묶인 파일로 읽는다(5절). 없거나 규격에 어긋나면 AI 를 부르지 않는다(검사하지 않은 출력을 아이에게 보이지 않는다).
- AI 계약(9절): 각 호출의 Zod 규격을 녹화된 실제 응답 표본으로 검증하는 계약 시험, 실제 API 에 보내는 수동 명령 `pnpm ai:contract`(호출 넷 · 회화 턴 두 설정 · 확인 호출 세 모델 · 콘솔 한도 표본), 관찰표 · 1-가 실시간 호출 표본 평가 `pnpm ai:observe`(생각 단계 비교 · 출력 p99 → ai.max_tokens, C21, 역분석 제안 5). 실제 호출은 H4 뒤 수동 명령으로만 한다. CI · e2e 는 키가 없다.
- 완료 판정: 가짜 클라이언트로 호출 넷이 기록 · 정규화되고(AC-8c · AC-8n · AC-8b 서버 몫 · AC-8d 서버 몫 · AC-8a), 실제 표본으로 계약 시험이 통과한다(H4 뒤).

## 바뀌는 파일 (Files that change)

손으로 쓰는 파일은 열둘이다(새 파일 열하나 · 고치는 파일 하나, 시험 파일 다섯 포함). 응답 표본 JSON(손으로 만든 것 · 녹화한 것)과 관찰표 산출물은 자료라 세지 않는다. 공용 파일 둘은 아래 '요청하는 공용 변경'.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/seed/structure.ts` | 수정 | 'AI 출력 꼴' 절에 시도 상한 · 기다림 배수(파일별 값 1) |
| `src/core/ai/cost-alert.ts` | 신규 | 호출 앞 판정 · 비용 알림 판정 · 대화 안전 상한 판정 · 달 열쇠 · 알림 종류 값(값 2) |
| `src/server/seed-lists.ts` | 신규 | `server-only`. 시드 목록 넷 읽기(빌드에 묶인 파일, 값 3) |
| `src/server/ai/run.ts` | 신규 | `server-only`. 실행 흐름(값 4) |
| `src/server/ai/index.ts` | 신규 | `server-only`. P11 이 부르는 공개 함수 넷 · 결과 형(값 5) |
| `scripts/ai-contract.ts` | 신규 | AI 계약(수동) 명령(값 6) |
| `scripts/ai-observe.ts` | 신규 | 관찰표 · 실시간 호출 표본 평가 명령(값 7) |
| `tests/unit/cost-alert.test.ts` | 신규 | AC-8a · AC-N2 |
| `tests/integration/ai-calls.test.ts` | 신규 | AC-8c · 흐름(다시 요청 · 정규화 · 출력 검사 · 가림 · 목록 없음) |
| `tests/integration/ai-errors.test.ts` | 신규 | AC-8n · AC-8d(서버 몫) · 8절 실패 흐름 |
| `tests/integration/safety-cap.test.ts` | 신규 | AC-8b(서버 몫). P11 이 세션 몫을 같은 파일에 더한다 |
| `tests/contract/ai-schemas.test.ts` | 신규 | 9절 AI 계약 · 두 명령의 순수 함수 |
| 자료(수에서 뺌) | 신규 | `tests/fixtures/ai/samples/*.json`(손으로 만든 응답 · 오류 표본, 값 8) · `tests/fixtures/ai/recorded/.gitkeep`(H4 뒤 녹화 표본이 들어옴) |

### 요청하는 공용 변경(컨트롤러가 합친다)

격리 워크트리는 띄울 때 HEAD 에서 만들어지므로, 이 plan 의 구현자가 자기 워크트리에서 아래를 글자 그대로 옮기고(작업 2 · 5 앞), 다른 워크트리와 합칠 때 컨트롤러가 충돌을 푼다(P3 · P4 와 같은 길).

| # | 파일 | 바꿀 것 | 까닭 |
|---|---|---|---|
| 1 | `package.json` scripts | `"ai:contract": "tsx scripts/ai-contract.ts"` · `"ai:observe": "tsx scripts/ai-observe.ts"` | 9절 AI 계약(수동) · 역분석 제안 5. 묶음 plan '바뀌는 파일'에 이름이 있다 |
| 2 | `next.config.ts` | `outputFileTracingIncludes: { "/*": ["./seed/lists/**/*.json"] }`(주석: "시드 목록은 빌드에 묶어 배포한다(5절). 서버 함수가 실행 때 읽는다 — plan-p09c 값 3") | Vercel 서버 함수 묶음에 목록 파일이 들어가야 한다(P9a 확인한 사실 9) |

### 파일별 값(구현자가 옮겨 쓸 것)

1. `src/core/seed/structure.ts` 의 'AI 출력 꼴' 절 끝에 더한다.

```ts
/** 6.1 '1회 다시 요청' · 8절 '재시도 1회' — 논리 호출 하나의 시도 상한. */
export const AI_ATTEMPTS_MAX = 2;
/** 6.1 '기다림은 타임아웃의 두 배를 넘지 않게'. */
export const AI_WAIT_TIMEOUT_MULTIPLE = 2;
```

2. `src/core/ai/cost-alert.ts`. 금액은 P9a `usdToMicros` 로 정수(마이크로달러)로 바꿔 견준다. '닿으면'은 같거나 넘음(≥)이다.

| 이름 | 무엇 · 규칙 | 정본 |
|---|---|---|
| `AI_ALERT_KINDS` | parent_alerts.kind 값(C56 (4) 'P9 · 1-나가 정한다', 4절 알림 목록 이름에 대응): `cost`(비용 알림) · `console_near_limit`(콘솔 한도 근접) · `call_config_check`(호출 설정 확인 필요) · `ai_rest`(AI 쉬는 중, 1-나) · `talk_safety_cap`(대화 안전 상한, 1-나) · `feedback_failed`(첨삭 못 함, P11) | 4절 · C56 (4) |
| `preCallGate({ profileCalls, householdCostMicros }, { safetyDailyCalls, safetyDailyCostUsd })` | `{ allowed: true } \| { allowed: false; reason: "safety_calls" \| "safety_cost" }`. 1-나는 셋째 인자로 ai_status 를 더한다(묶음 위험 8) | 6.1 · 8절 '하루 안전 상한은 호출을 보내기 전에 그날 호출 수 · 비용 합계로 판정' · C15 |
| `dueCostAlerts(usage, settings)` | `usage = { profileCallsToday, householdCostTodayMicros, householdCostMonthMicros, learningDay, monthKey }`. 기준에 닿은 알림을 모두 낸다(호출은 막지 않는다): 프로필 하루 호출 ≥ ai.daily_call_alert(기준 키 `ai.daily_call_alert`, 그날) · 집 하루 비용 ≥ ai.daily_cost_alert_usd(그날) · 그달 비용 ≥ 배수 m × ai.monthly_cost_alert_usd(m 은 ai.monthly_alert_multiples 마다, 기준 키에 m 과 달) · 그달 비용 ≥ ai.console_limit_usd × ai.console_alert_ratio(그달). 한 번만 만드는 일은 P9a `createAlertOnce`(그날은 `"day"`, 그달은 `"key"`)가 하고 부르는 쪽은 1-나다 | 6.1 · 8절 '비용 알림 기준 도달' · C6 · C28 · 13절 '부모 알림 …' |
| `talkSafetyOf({ turns, reachedToday }, { safetyMaxTurns, safetyAlertCount })` | `{ close: turns ≥ talk.safety_max_turns, alert: close && reachedToday === talk.safety_alert_count }`(`reachedToday` 는 이번 것을 넣은 그 학습일 닿은 수 — 둘째에만 알림). 회화는 1-나라 판정 함수만 | 3.3 · 8절 '대화 안전 상한' · AC-8a |
| `monthKeyOf(instant, timeZone)` | `"YYYY-MM"` — 호출 시각의 app.timezone 달력 달(정할 것 가). 한국 시간 1일 0시 30분은 새 달 | AC-8a · AC-8e · 12절 · 4절 |

3. `src/server/seed-lists.ts`(`import "server-only"`).

| 이름 | 무엇 · 규칙 |
|---|---|
| `SeedListError` | `{ list, reason: "missing" \| "invalid" }`. 메시지에 파일 내용을 넣지 않는다 |
| `loadSeedList(name, { root = process.cwd() })` | `name` 은 `forbidden · homophones · forms · metaSentences`. `join(root, "seed", SEED_FILES[name])`(P4a 경로)을 읽어 P4a 규격(`ForbiddenFileSchema` 등)으로 검증하고 모듈 안에 (root, name) 마다 하나 모아 둔다(배포가 바뀌어야 바뀌는 파일, 5절). 없으면 `missing`, JSON · 규격이 틀리면 `invalid` |
| `getOutputCheckLists(opts?)` | `{ forbidden }`. P11 의 동음이의어 · 1-나의 메타 문장도 `loadSeedList` 를 쓴다 |

4. `src/server/ai/run.ts`(`import "server-only"`). `runAiCall(spec, input, ctx, deps?)` — `ctx = { profileId: string \| null; sessionId: string \| null; level: number }`, `deps = { db = getDb(), clock = now, client = getAnthropicClient, lists = getOutputCheckLists }`(시험이 바꾼다). 결과는 값 5 의 `AiOutcome`. 차례:

   1. `t0 = clock()`. 설정 읽기 한 번(P3a `getSettings`, profileId 를 넘김): `app.timezone` · `app.day_start_hour` · `ai.safety_daily_calls` · `ai.safety_daily_cost_usd` · `ai.down_after_failures` + P9a `aiSettingSchemasOf(purpose, level)` + `spec.settingSchemas`. 설정이 없거나 틀리면 `config`(행 없음, 서버 오류 기록 — 값 · 아이 글은 넣지 않음).
   2. `learningDay = learningDayOf(t0, …)`. `book = loadPriceBook(db, learningDay)`. `config = requestConfigOf(…)` — 조합 오류면 `config`.
   3. 호출 앞 판정. `dailyUsage(db, { profileId, learningDay })` → `preCallGate`. 막히면 ai_calls 에 `status: "safety_cap"`(요청 모델은 config.model, 토큰 0 · 비용 `0.000000` · 지연 · 답한 모델 · error_code 비움) 한 행을 남기고 `{ ok: false, reason: "safety_cap" }`(정할 것 다). profileId 가 비면 호출 수는 0 으로 본다.
   4. 목록 · 가림. `deps.lists()` — `SeedListError` 면 `config`. profileId 가 있으면 profiles 의 `display_name` · `english_name` · `tori_nickname` 을 읽고, P9b `nameVariantsOf` 의 후보 가운데 vocab 단어인 것을 한 질의(`lower(word) = any($1)`)로 가려 `createMasker`(연락처는 시드 `forbidden.patterns` 의 `category === "contact"` 정규식). 아이 이름은 로그 · 오류 · 기록 어디에도 쓰지 않는다.
   5. `rules = spec.rulesOf(설정 값, input)`(그 단계 교정 상한이 없으면 `config`), `built = buildAiRequest(spec, input, { config, masker, rules })`, `body.output_config.format = zodOutputFormat(built.wireSchema)`(`@anthropic-ai/sdk/helpers/zod`). 클라이언트는 `deps.client()` — 키가 없어 `AiConfigError` 면 `config`(행 없음, 실제로 부르지 않았다).
   6. `deadline = t0 + AI_WAIT_TIMEOUT_MULTIPLE × timeoutMs`. 시도 k = 1 … `AI_ATTEMPTS_MAX`. 둘째 시도는 남은 시간이 `MIN_RETRY_MS`(기술 값 1초, 파일 위 상수)보다 적으면 하지 않는다. 시도의 타임아웃은 `min(timeoutMs, deadline − 지금)`. 보내기는 P9a `sendAttempt`.
   7. 실패면 `classifyFailure` → 한 행(`status` · `errorCode` · 지연, 토큰 0 · 비용 0). `same_error` 면 `sameErrorCount` 가 ai.down_after_failures 이상일 때 `createAlertOnce({ kind: "call_config_check", profileId: null, thresholdKey: "ai.down_after_failures:<목적>", learningDay, value: { purpose, model: config.model, errorCode }, once: "day" })`. 다시 보내는 것은 `retryConnection` 이고 목적이 P9a `REALTIME_PURPOSES` 일 때만이다(첨삭은 응답 뒤 호출이라 다시 보내지 않고 다음 앱 진입에 P11 이 부른다, 8절 '첨삭 대기'). 아니면 `{ ok: false, reason }`.
   8. 응답이면 `billedAttemptsOf` · `costOf`. 대체 모델이 답했거나 단가가 없으면 서버 경고(요청 번호 · 목적 · 요청 · 답한 모델 · 거절 분류만, 본문 없음 — 역분석 제안 5). `stop_reason === "refusal"` 이면 한 행(`refusal`)을 남기고 `{ ok: false, reason: "refusal", refusals: 1 }`(다시 요청하지 않음, 정할 것 나).
   9. 그 밖이면 stop_reason 을 먼저 본다(P5a `interpretSolveMessage` 와 같은 차례 — C62 · P9a 확인한 사실 12). `end_turn` 이 아니면(max_tokens 등) 이 시도는 엄격 실패다. 그다음 `answerTextOf`(마지막 fallback 블록 뒤의 text 블록을 type 으로 찾아 이어 붙임) → `JSON.parse` → `prepareAnswer` → 엄격 규격 `safeParse` + `spec.validate`. `end_turn` 이고 다 통과하면 `spec.normalize`. 아니면 남은 시도 · 시간이 있으면 한 행(`validation_failed`)을 남기고 다시 요청(앞 응답의 다듬은 값은 기억해 둔다). 남은 것이 없으면 느슨한 규격으로 받아 정규화하고, null 이면 한 행(`validation_failed`)과 `{ ok: false, reason: "invalid" }`.
   10. 출력 검사: `checkOutputFields(spec.checkFields(값), { forbidden, sentenceMaxWords: input.sentenceMaxWords })` → `spec.applyChecks`. 이 시도의 행: 엄격 통과이고 걸린 칸이 없으면 `success`, 아니면 `validation_failed`(6.4). `fatal` 이면 `{ ok: false, reason: "output_blocked" }`, 아니면 `{ ok: true, value, normalized, checked, historyEntry }`.

5. `src/server/ai/index.ts`(`import "server-only"`). P11 은 이 파일만 가져온다.

| 이름 | 무엇 · 규칙 |
|---|---|
| `AiFailureReason` | `safety_cap · timeout · connection · server · rate_limit · console_limit · account · same_error · refusal · invalid · output_blocked · config` |
| `AiOutcome<T>` | `{ ok: true; value: T; normalized: boolean; checked: boolean; historyEntry?: string } \| { ok: false; reason: AiFailureReason; refusals: number }` |
| `checkWriting(input, ctx, deps?)` | 쓰기 확인(4~5단계). 실패면 P11 은 확인 없이 넘어가고 점수 없는 세션(8절) |
| `writeFeedback(input, ctx, deps?)` | 쓰기 첨삭. P11 이 초고 제출 서버 액션의 `after()` 안에서 부른다. `ctx.sessionId` 는 그 초고의 첫 세션(둘째 세션에서 다시 불러도 같은 값 — 기록이 초고 하나로 모이게). 거절 · 실패 수는 P11 이 attempts 에 센다(8절 '같은 입력이 거절로 두 번' · ai.feedback_max_attempts) |
| `evaluateSpeaking(input, ctx, deps?)` | `input.mode` 가 `answer · presentation · confirm` 이면 P9b 의 세 규격 가운데 하나. 실패면 판정 없이 다음 문항(8절) |
| `thinkoutTurn(input, ctx, deps?)` | `allowedWords` 를 채워 부른다(vocab 의 `band_level <= level` 낱말, 소문자). 결과의 `historyEntry` 를 P11 이 턴마다 저장해 다음 턴 `history` 로 돌려준다. 실패 · `output_blocked` 면 '이번에는 바로 써 볼까요' 초고 화면(8절) |

6. `scripts/ai-contract.ts`(9절 AI 계약(수동) · C46 (3)). 순수 함수(`parseArgs` · `loadScriptConfig` · `contractCases` · `recordOf` · `compareModelInfo`)를 내보내고 네트워크 · 파일 쓰기는 직접 실행될 때만 한다(P4c `seed-validate` 와 같은 꼴). `src/server` 는 `server-only` 라 가져오지 않는다 — `src/core/ai`(조합 · 규격 · 요청 본문 · 비용 · 분류)와 SDK(`zodOutputFormat` 포함)를 직접 쓴다.
   - 시작: `.env.local` 이 있으면 `process.loadEnvFile(".env.local")`(P3a `drizzle.config.ts` 와 같은 길). `--dry-run` 이 아니면 `ANTHROPIC_API_KEY` 가 없을 때 종료 2(값을 출력하지 않는다). 클라이언트 선택은 P9a 값 7 과 같다(maxRetries 0 · logLevel warn · OpenTelemetry 끔 · 기본 주소).
   - 설정 · 단가표: `seed/settings.json` · `seed/model-prices.json` 이 있으면 그것(P4a 규격으로 검증), 없으면 `TEST_SETTINGS` · `MODEL_PRICES_FIXTURE`(어느 쪽을 썼는지 출력). 단가는 P9a `priceBookOf(priceRowsOfSeed(파일), 실행 시각의 UTC 날짜)`로 고른다(P5a 와 같은 고르기 · 같은 날짜 — plan-p05a 정할 것 하).
   - 사례(기본은 아래 모두, `--case <id,…>` 로 고름):

| id | 무엇 | 기대 |
|---|---|---|
| `writing_check.l4` · `.l5` | 쓰기 확인(설정 조합) | 200 · end_turn · 엄격 통과(아니면 '정규화로 통과'로 적고 실패로 보지 않음) |
| `writing_feedback.l6` · `.l10` | 첨삭(Opus medium adaptive) | 같음 |
| `speaking_eval.answer.l3` · `.answer.l6` · `.presentation.l9` · `.confirm.l9` | 말하기 평가 셋 | 같음. l3 은 문법 지적이 정규화 뒤 0 |
| `thinkout.l6` | 생각 꺼내기 세 턴(앞 턴 응답을 이어 붙이고 견본 아이 답으로) | 턴마다 같음 · 마지막 턴 done |
| `talk_config.haiku` · `talk_config.sonnet` | 회화 턴 두 설정(Haiku 5.5 low · disabled, Sonnet 5.5 low · between_tools + fallbacks)으로 작은 구조화 출력 요청(필드 둘, 모두 필수 — 1-나 회화 턴과 같은 '생각 끔 + 구조화 출력' 조합) | 200(400 이 아님). 생각 끔과 구조화 출력을 함께 받는지는 문서에 없다(추측, plan-p05a 위험 6 과 같은 물음) — 이 사례가 처음 증명한다 |
| `probe.haiku` · `probe.sonnet` · `probe.opus` | P9a `probeConfigOf` 조합, 입력 'ok', 최대 출력 ai.max_tokens.probe | 200 · stop_reason max_tokens(9절 'max_tokens 로 끝난 확인 호출 표본') |
| `models` | 단가표 여섯 모델과 설정의 모델마다 `client.beta.models.retrieve(id, { betas })`(GET `/v1/models/{id}?beta=true`, `betas` 는 `anthropic-beta` 머리글, 토큰 비용 없음, P9a 확인한 사실 11). 먼저 `betas` 없이 묻고, `allowed_fallback_models` 가 null 이면 `betas: ["server-side-fallback-2026-07-01"]` 로 한 번 더 묻는다 — 어느 베타 값이 그 칸을 채우는지는 설치판 · 문서에 없다(추측) | `capabilities.thinking.types` 가 조합 칸과 맞음(thinkingOff 가 between_tools 면 그것이, disabled 면 그것이 supported, null 이면 둘 다 아님) · `capabilities.effort` 가 다섯 단계를 받음 · 주 모델 셋은 `structured_outputs` 받음 · `allowed_fallback_models` 가 모두 단가표에 있음(없으면 그 모델이 답할 때 '단가 없음' — 어긋남으로 출력) · serverFallback 이 그 목록이 비지 않음과 같음 · 설정의 모델이 `lifecycle: active`(deprecated 면 `retires_at` 을 출력, C17 모델 은퇴). 어긋나면 종료 1 과 고칠 칸(P6 의 model-prices.json, plan-p06a 위험 11). 두 번 다 null 이면 '대체 모델 목록 확인 못 함'으로 출력하고 그 칸만 어긋남으로 세지 않는다(나머지 대조는 그대로) |
| `console-limit`(H12 때만, 기본 목록 밖) | Haiku 확인 호출 | 400 또는 429 · `classifyFailure` 가 `console_limit`. 메시지의 풀리는 시각 꼴을 출력 |

   - 기록: 사례마다 `tests/fixtures/ai/recorded/<id>.json` = `{ case, source: "recorded", recordedOn, sdk: "0.135.0", inputCase, request: { model, max_tokens, thinking, effort, fallbacks, betas, title }, response: { status, headers: { "request-id", "content-type", "retry-after"(있으면) }, body } }`. 머리글은 이 셋만 남긴다(키 · 인증 머리글은 처음부터 담지 않는다). 시스템 프롬프트 · 메시지는 견본 입력 id 로만 적는다.
   - 출력: 사례마다 한 줄(상태 · stop_reason · 엄격 · 지연 · 토큰 · 비용 · 요청 번호). 종료 0 모두 기대대로, 1 하나라도 어긋남, 2 입력 · 설정 오류.

7. `scripts/ai-observe.ts`(9절 실시간 호출 표본 평가의 1-가 몫 · 역분석 제안 5 관찰표). `parseArgs` · `observePlan` · `summarize` · `recommendMaxTokens` 를 내보낸다.
   - 계획: 쓰기 확인 · 말하기 평가(질문 답 l3 · l6, 발표 l9) · 생각 꺼내기(첫 턴)를 생각 단계 둘(`adaptive` · `off` — Sonnet 5.5 between_tools, 둘 다 effort low)로, 첨삭은 설정 조합(medium adaptive) 하나로, 묶음마다 `--n`(기본 20, 9절 '표본 20개씩')번. 입력은 P9b `sample-inputs.ts` 의 관찰용 변형을 돌려 쓴다.
   - 부르기 전에 예상 비용(6.6 1회 비용 × 횟수, 기본 약 4달러 — 추측)을 출력하고 `--yes` 가 없으면 부르지 않는다.
   - 응답마다 한 줄: 목적 · 묶음 · 지연 · 입력 · 출력 · 생각 토큰(`usage.output_tokens_details.thinking_tokens`, null 이면 빈칸) · 캐시 읽기 · stop_reason · 첫 시도 엄격 통과 · 정규화로 자른 수 · 출력 검사 걸림 · 언어 · 말투 어긋남(한국어 칸에 한글이 없음 · 영어 칸에 한글) · '추론 같은 글'(메타 문장 목록이 있으면 그것, 없으면 짧은 내장 목록 — the child · the student · I should · Let me) · 비용 · 답한 모델 · 요청 번호.
   - 요약(`summarize`): 묶음마다 n · 지연 p50 · p95 · p99 · 출력 p50 · p95 · p99 · 최대 · 엄격 통과율 · 규칙 위반 수 · 평균 비용, `recommendMaxTokens(p99) = ⌈2 × p99 ÷ 100⌉ × 100`(C21 '출력 p99 의 두 배'), 정할 것 사의 규칙으로 고른 생각 단계 후보.
   - 산출물: `docs/research/<날짜>-ai-observe.md`(표와 권하는 값. 머리에 'H4 첫 실호출' 표를 둔다 — P5a `pnpm seed:check --probe` 줄(모델 · stop_reason · 입력 · 출력 토큰 · 판단)은 명령이 빈칸으로 두고 컨트롤러가 장부(plan-p05a 작업 7)에서 옮겨 적고, 이 명령의 첫 응답 줄은 명령이 채운다) · `docs/research/<날짜>-ai-observe.jsonl`(줄 자료와 아이에게 보일 칸의 글 — 견본 입력이라 아이 정보가 없다). 설정값은 바꾸지 않는다(컨트롤러 13절 → P6).

8. 응답 표본 `tests/fixtures/ai/samples/*.json`(손으로 만든 것, `source: "handmade"`): 목적마다 정상 · 개수 · 범위 초과(고칠 곳 2 · 교정 4 · 채점표 0 · 5 · 2.6 · 3단계 문법 지적 · 판정 대소문자 'Correct' · 발표 질문 1개) · 거절(`cyber`, 출력 0) · max_tokens 로 잘린 JSON · 대체 모델 iterations(문서 예시 꼴) · 오류(콘솔 한도 워크스페이스 400 · 등급 상한 429 · 404 · 529). 꼴은 `{ case, purpose, title, source, response: { status, body }, expect: { strict?, normalized?, classify? } }`.

## 작업 순서 (Order of work)

시작 전(구현자). P9b 가 끝난 같은 워크트리에서 `feature/1a-p09c-ai-flow` 를 만든다. 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null &&` 로 시작한다. 실제 API 는 부르지 않는다(작업 8 은 [사람]).

1. [서버] 판정 함수(시험 먼저). `cost-alert.test.ts` → `structure.ts`(값 1) · `cost-alert.ts`(값 2). 완료: AC-8a · AC-N2 시험 통과.
2. [서버] 시드 목록. 공용 변경 2 → `seed-lists.ts`(값 3). 완료: `ai-calls.test.ts` 의 '목록' 시험(임시 폴더 뿌리)이 통과한다.
3. [서버] 흐름 · 공개 함수(시험 먼저). `ai-calls.test.ts` · `ai-errors.test.ts` · `safety-cap.test.ts` → `run.ts`(값 4) · `index.ts`(값 5). 가짜 응답은 표본 파일(값 8)과 P9a `messageBody` 로. 완료: `pnpm test:int` 통과.
4. [검증] 계약 시험. 표본(값 8) → `tests/contract/ai-schemas.test.ts`. 녹화 표본이 없는 목적은 `it.todo('<목적> 녹화 표본 없음 — H4 뒤 pnpm ai:contract')` 로 둔다(실패로 세지 않음). 완료: `pnpm test` 통과.
5. [검증] 계약 명령. 공용 변경 1 → `scripts/ai-contract.ts`(값 6). 완료: `pnpm ai:contract --dry-run` 이 사례 목록과 요청 꼴을 네트워크 없이 출력하고 종료 0, 키 없이 보통 실행은 종료 2. 계약 시험의 명령 묶음 통과.
6. [검증] 관찰 명령. → `scripts/ai-observe.ts`(값 7). 완료: `pnpm ai:observe` 가 `--yes` 없이 예상 비용만 출력하고 종료 0, 요약 · 권하는 값 시험 통과.
7. [검증] 마무리 · 검토 · H14. (가) CI 순서 명령 전부(P9a 작업 7) · 비밀값 grep 0건. (나) 빌드 추적 확인: P4a 견본의 금지어 목록을 임시로 `seed/lists/forbidden.json` 에 두고 `pnpm build` 뒤 어느 서버 경로의 `.nft.json` 에 그 파일이 드는지 본 다음 임시 파일을 지운다(커밋하지 않음). (다) code-reviewer(Opus · xhigh) 검토와 fix ≤3. (라) 요청자 지시로 커밋(H14). 완료: spec-trace 의 missing-test 가 6 줄어든다(AC-8a · 8b · 8c · 8d · 8n · N2).
8. [사람] H4 · H12 뒤(아래 표). 완료: 녹화 표본으로 계약 시험이 todo 없이 통과하고, `models` 사례가 짚은 어긋남(대체 모델 목록 · 생각 형 · effort · 수명)을 P6 의 `seed/model-prices.json` 에서 고친 뒤 다시 돌린 `pnpm ai:contract --case models` 가 종료 0 이며(`pnpm seed:validate` 오류 0), 관찰표와 컨트롤러의 13절 한 줄(ai.thinking 기본값 · ai.max_tokens 값)이 있다.

### H4 전 · 뒤

| 때 | 할 수 있는 것 |
|---|---|
| H4 전(지금) | 작업 1~7 전부. 흐름 · 판정 · 계약 시험(손으로 만든 표본) · 두 명령의 dry-run 과 순수 함수 시험. P11 은 이 공개 함수와 가짜 클라이언트로 세션을 짤 수 있다 |
| H4 뒤 | 작업 8 의 1~5: `pnpm ai:contract` → 녹화 표본 → 계약 시험이 실제 표본으로 돈다. 같은 실행의 `models` 사례 결과(`allowed_fallback_models` · 생각 형 · effort · 수명)로 P6 의 `seed/model-prices.json` 대체 모델 행(`serverFallback` · 대체 모델 단가 행 · 조합 칸)을 고친다(plan-p06a 위험 11, 컨트롤러 전달 22:3x). `pnpm ai:observe --yes` → 관찰표 → 컨트롤러가 ai.thinking(쓰기 확인 · 말하기 평가 · 생각 꺼내기)과 ai.max_tokens(네 호출)를 정해 13절 한 줄 → P6 settings.json · 12절 기본값 |
| H12(1-나 확인 호출 전) | 작업 8 의 6. 1-가 동작에는 필요 없다(1-가는 콘솔 한도를 '호출 하나의 실패'로만 다룬다) |

### [사람] H4 · H12 의 할 일

| 순서 | 할 일 | 비고 |
|---|---|---|
| 1 | Anthropic 콘솔에 개발용 워크스페이스(운영 워크스페이스와 다름)를 만들고 월 지출 한도를 건다. 금액은 요청자가 정한다(참고: P5 풀이 검사 약 25달러 — 6.6 '첫 운영 배포 범위는 그 절반쯤', 이 plan 의 계약 약 0.3달러 · 관찰 약 4달러 — 추측) | 10절 '개발용 API 호출은 다른 워크스페이스의 키로' · 11절 (4-1) · 묶음 H4 |
| 2 | 그 워크스페이스 범위의 API 키를 만든다 | 값은 저장소 · 장부 · 대화에 적지 않는다 |
| 3 | 요청자 컴퓨터의 `.env.local` 에 `ANTHROPIC_API_KEY`. Vercel Preview 환경 변수에도 넣는다(H1 뒤, P11 프리뷰 사용) | `ANTHROPIC_BASE_URL` · `ANTHROPIC_CUSTOM_HEADERS` · `ANTHROPIC_LOG` · `ANTHROPIC_AUTH_TOKEN` 은 Vercel 에 넣지 않는다(P9a 위험 10) |
| 4 | `pnpm ai:contract`(요청자 터미널, 또는 요청자 지시로 컨트롤러 — 키는 `.env.local` 에서만 읽고 출력하지 않는다) | 대화창의 `!` 로 키를 넘기지 않는다. 녹화 표본 → `pnpm test` → H14 커밋. `models` 사례가 어긋남을 내면 컨트롤러가 P6 몫으로 `seed/model-prices.json` 을 고치고(`pnpm seed:validate` 0) `pnpm ai:contract --case models` 를 다시 돌린다 |
| 5 | `pnpm ai:observe --yes` | 관찰표 → 컨트롤러 결정(정할 것 사) → 13절 한 줄 → P6. 요청자가 먼저 돌려 알린 P5a `pnpm seed:check --probe` 첫 줄(모델 · stop_reason · 토큰, 장부에 있음)을 관찰표 'H4 첫 실호출' 표에 옮긴다 |
| 6(H12) | 개발용 워크스페이스 월 한도를 이번 달 사용액보다 낮게 잠깐 걸고 `pnpm ai:contract --case console-limit` → 한도를 되돌린다 | C46 (3). 그 호출이 콘솔 사용량에 잡히는지 콘솔에서 본다. 다른 개발 호출(P5 풀이 검사)이 그동안 멈춘다(묶음 위험 10) — 짧게 |

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 두 기기에서 같은 때 부르면 호출 앞 판정을 둘 다 지나 상한을 조금 넘는다 | 하루 비용이 상한을 호출 하나만큼 넘는다 | 정본이 받아들인 동작이다('비용 상한을 넘기게 한 호출의 응답도 그대로 쓴다', 8절) |
| 2 | 시드 목록이 아직 없다(P6 전) | 개발 서버 · 프리뷰에서 AI 활동이 모두 '설정 문제'로 실패한다 | 의도한 동작(검사하지 않은 출력을 보이지 않는다). 시험은 목록을 주입한다. P6 목록이 들어오면 풀린다 |
| 3 | `outputFileTracingIncludes` 의 `"/*"` 가 깊은 경로까지 덮는지(문서는 모든 경로라 적음) · Vercel 에서 실행 때 파일이 있는지 확인하지 못했다(추측) | 운영 · 프리뷰에서 목록을 못 읽어 AI 가 멈춘다 | 작업 7 (나)의 `.nft.json` 확인. H1 뒤 첫 프리뷰에서 P11 이 한 번 부른다. 안 되면 `"/**"` 로 넓힌다 |
| 4 | 다시 요청 · 출력 검사 · 정규화가 겹쳐 결과 상태가 헷갈린다 | ai_calls 결과 상태 셈(관찰 · 사용 시험)이 틀린다 | 시도 하나 = 행 하나, 상태는 그 시도에서 본 것(값 4 의 7~10). 흐름 시험이 행 수 · 상태 차례를 본다 |
| 5 | 녹화 표본이 모델 판에 묶인다 | 모델 · SDK 판을 올리면 계약 시험이 옛 표본으로 통과한다 | 9절 '모델 · SDK 판을 올릴 때 AI 계약(수동)을 돌린다'. 녹화 파일에 `sdk` · `recordedOn` 을 적는다 |
| 6 | 관찰 표본 20개가 작다 | p99 가 흔들린다 | C21 이 '두 배'로 여유를 둔다. 사용 시험(9절)의 ai_calls 로 다시 본다 |
| 7 | 개발 키 비용 · 콘솔 한도 시험이 다른 개발 호출을 멈춘다(묶음 위험 10) | 풀이 검사가 멈춘다 | 관찰은 `--yes` 를 요구한다. H12 는 짧게 하고 바로 되돌린다 |
| 8 | 생각 꺼내기의 앞 턴 글을 P11 이 바꿔 저장하면 캐시가 깨진다 | 비용이 늘 뿐 결과는 같다 | `historyEntry` 를 글자 그대로 저장하라고 P11 에 넘긴다. 흐름 시험이 둘째 턴 메시지 머리를 본다 |
| 9 | 콘솔 한도 400 의 풀리는 시각 꼴을 모른다(문서 문구 없음) | 1-나 부모 화면의 풀리는 시각 | 1-가는 쓰지 않는다. H12 표본으로 1-나가 정한다. SDK 의 조직 지출 한도 읽기(`client.beta.organization.spendLimits`, 끝점 `/v1/organizations/spend_limits`, 설치판 0.135.0)는 조직 관리용 끝점이라 앱 서버에서 쓰지 않는다(필요한 키 종류는 추측 — 끝점 경로로 판단) |
| 10 | 첨삭의 '같은 초고' 실패 수를 ai_calls 로 세면 한 논리 호출의 두 시도가 둘로 셈해진다 | '첨삭 못 함'이 일찍 온다 | P9 는 논리 호출 하나의 결과(`reason` · `refusals`)만 돌려주고, 초고마다 세는 일은 P11 이 attempts 에서 한다 |
| 11 | 생각 끔(between_tools · disabled)과 구조화 출력을 함께 보내면 400 일 수 있다(추측 — 문서에 막는 말이 없다) | 관찰의 'off' 묶음 · 1-나 회화 턴이 모두 실패한다 | P5a `pnpm seed:check --probe`(GA 끝점 · Sonnet 5.5 between_tools)가 가장 먼저 보고, 이 plan 의 길(베타 끝점 · 머리글 · Haiku disabled)은 H4 계약의 `talk_config.*` 사례가 확인한다(P9a 확인할 사실 1). 400 이면 관찰은 그 묶음을 '받지 않음'으로 적고 adaptive 를 고르며, 회화 턴 조합은 1-나 전에 컨트롤러가 13절로 다시 정한다 |

### 정할 것(컨트롤러)

- 가. 달의 경계. 6.1 은 "'그달'은 학습일이 속한 한국 시간 달력 달"이고, AC-8e 는 "한국 시간 1일 0시 30분의 호출은 새 달 합계에 들어간다", 12절 ai.monthly_cost_alert_usd · 4절 AI 비용 행은 "한국 시간 달력 달"이다. app.day_start_hour 가 4라서 1일 0시 30분의 학습일은 전달 말일이므로 6.1 과 AC-8e 가 어긋난다. 권하는 것은 호출 시각의 한국 달력 달(AC-8e · 12절 · 4절 · 묶음 plan AC-8a 시험 이름 '1일 0시 30분은 새 달')이고, 6.1 의 '학습일이 속한'을 고친다. 13절 한 줄이 필요하다.
- 나. 거절의 즉시 다시 요청. 6.1 은 'stop_reason 이 end_turn 이 아니면 1회 다시 요청'이라 거절도 들고, 8절 '안전 분류기 거절' 행은 "'AI 호출 하나의 실패'와 같이 처리"(그 행의 다시 보내기는 연결 실패에만)다. 문서는 같은 모델에 다시 보내면 대개 다시 거절된다고 적고, Sonnet · Opus 는 서버 측 대체 모델 재시도가 이미 돌았다(P9a 확인한 사실 2). 권하는 것은 거절을 즉시 다시 요청하지 않는 것(8절)이다. 첨삭의 '같은 입력이 거절로 두 번'은 다음 앱 진입의 밀린 첨삭에서 둘째가 된다(AC-8k 는 그대로 증명된다). 다른 길(6.1 글자대로)이면 값 4 의 8 에서 한 번 더 보낸다. 13절 한 줄로 6.1 문구를 바로잡기를 권한다.
- 다. 안전 상한으로 막은 호출의 기록. 6.1 결과 상태 목록의 '안전 상한'을 써서 막을 때마다 한 행(토큰 · 비용 0)을 남기고, 그 행은 호출 수에서 뺀다. 권함. 13절 불필요(6.1 의 결과 상태 그대로).
- 라. 시드 목록을 실행 때 파일로 읽기(빌드 추적 포함)와, 목록이 없으면 AI 를 부르지 않기. 권함. 다른 길은 정적 import(목록 파일이 생기기 전에는 빌드가 깨짐 — P6 이 먼저 끝나야 함). 13절은 P9a 정할 것 라의 기술 선택 한 줄에 묶는다.
- 마. parent_alerts 종류 값(값 2 `AI_ALERT_KINDS`). C56 (4) 가 P9 · 1-나에 맡긴 값이라 보고만 한다. P11 · P12 · P7 은 자기 알림 종류를 이 꼴(snake_case 영어)로 더한다.
- 바. 비용 알림 행을 만드는 일. 11절은 1-가를 'ai_calls 기록 · 안전 상한 판정 · parent_alerts 테이블', 1-나를 '비용 알림'으로 둔다. 권하는 것은 판정 함수(AC-8a)만 1-가에 두고 행 만들기는 1-나(AC-8e)에 두는 것이다. 브리프 범위 줄의 '비용 알림'은 이 판정 함수로 읽었다.
- 사. 관찰표의 결정 규칙(9절 표본 평가의 1-가 몫). 쓰기 확인 · 말하기 평가 · 생각 꺼내기의 생각 단계는 adaptive 와 off(between_tools) 가운데 지연 p95 가 5초 이하(NFR-6 · AC-N6 대화형 호출)이고 규칙 위반이 적은 쪽, 같으면 평균 비용이 낮은 쪽. ai.max_tokens.<호출> 은 고른 묶음의 출력(생각 포함) p99 의 두 배를 100 단위로 올린 값(C21). 결과는 H4 뒤 컨트롤러가 13절 한 줄로 정한다.
- 아. H4 뒤 명령을 누가 돌리나. 권하는 것은 요청자가 키를 `.env.local` 에 넣은 뒤 요청자 지시로 컨트롤러가 돌리는 것이다(키는 파일에서만 읽고 출력하지 않는다). 다른 길은 요청자 터미널.
- 자. 개발용 워크스페이스의 월 지출 한도 금액(요청자).

### 제약

- 설계를 바꾸지 않는다. 숫자는 settings 에서 읽는다(시험도 `TEST_SETTINGS`). 시도 상한 · 기다림 배수는 `structure.ts`, 1초 같은 기술 값은 파일 위 상수다.
- 시각은 한 시계에서 읽고 SQL 안에 now() 를 쓰지 않는다. 학습일 · 달은 app.timezone · app.day_start_hour 로 센다.
- AI 는 서버에서만 부른다. P11 은 `src/server/ai/index.ts` 만 가져온다(의존 규칙 ai-only-from-server — P11 의 서버 액션은 `src/server/actions/`). 공개 함수는 접근 확인을 하지 않는다 — 부르는 서버 액션의 첫 문장이 `requireAccess()` 다(P3b).
- 실제 API 는 두 명령으로만 부른다. CI · e2e · 시험은 키가 없고 가짜 클라이언트만 쓴다.
- 비밀값 · 아이 이름은 어디에도 적지 않는다. 녹화 · 관찰 산출물에는 견본 입력만 들어간다.
- 커밋 · PR 은 요청자 지시 때만(H14). 화면이 없어 화면 검토는 없다.

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름 · 검사) | 파일 · 명령 |
|---|---|---|
| AC-8a · AC-N2 | 단위 "AC-8a · AC-N2 알림 기준 셋(하루 호출 · 하루 비용 · 월 비용)에 닿으면 알림을 내고 호출은 허용한다" · "AC-8a 하루 안전 상한 둘(호출 수 · 비용)에 닿을 때만 막는다" · "AC-8a 월 비용 알림은 배수 1 · 2 · 4 마다 하나씩이다" · "AC-8a 대화가 80턴에 닿으면 닫고 같은 학습일 둘째에만 알린다" · "AC-8a 그달 비용이 콘솔 한도 × 비율(56달러)에 닿으면 콘솔 한도 근접 알림" · "AC-8a 한국 시간 1일 0시 30분은 새 달이다". 값은 모두 `TEST_SETTINGS` 에서 읽는다. 사용 시험 4주 비교는 운영 뒤 | `tests/unit/cost-alert.test.ts` · `pnpm test` |
| AC-8b(서버 몫) | 통합 "AC-8b 알림 기준(하루 호출 · 하루 비용 · 월 비용)을 넘긴 날에도 실시간 호출이 나간다" · "AC-8b 프로필 하루 호출이 ai.safety_daily_calls 에 닿으면 그 학습일 호출이 0회이고 ai_calls 에 safety_cap 행이 남는다" · "AC-8b 집 하루 비용이 ai.safety_daily_cost_usd 에 닿아도 같다" · "AC-8b 다음 학습일(시계를 넘김)에는 다시 나간다" · "AC-8b 확인 호출 행과 막힌 행은 호출 수에 들지 않는다". 말하기 세션 그대로 · 제한 문구 없음은 P11, 쉬는 상태 부분은 1-나 | `tests/integration/safety-cap.test.ts` · `pnpm test:int` |
| AC-8c | 통합 "AC-8c 네 호출 뒤 ai_calls 에 프로필 · 요청 모델 · 답한 모델 · 토큰 넷 · 단가표 비용 · 결과 상태 · 학습일이 남고 프롬프트 · 응답 본문 열이 없다" · "AC-8c 요청 본문에 temperature · top_p · top_k 가 없고 max_tokens 는 ai.max_tokens.<목적>이다(네 호출)" · "AC-8c 대체 모델이 답하면 답한 모델 열이 바뀌고 비용은 iterations 항목별 단가 합이다". 끝맺음 턴은 1-나 | `tests/integration/ai-calls.test.ts` |
| AC-8d(서버 몫) | 통합 "AC-8d 응답을 늦춘 가짜에서 ai.timeout_seconds.realtime 이 지나면 다시 보내지 않고 타임아웃으로 끝난다"(시험 DB 의 그 설정 행을 작은 값으로 넣어 설정값을 읽는 것을 본다). 화면의 실패 안내는 P11 e2e(`timeout.spec.ts`) | `tests/integration/ai-errors.test.ts` |
| AC-8n(P9 몫) | 통합 "AC-8n 첨삭이 404 를 세 번 받으면 쉬는 상태 행이 생기지 않고 '호출 설정 확인 필요' 알림이 하나 생긴다(넷째에도 하나)" · "AC-8n 다시 보내도 같은 오류(400 · 413)는 그 호출 안에서 다시 보내지 않는다". 다섯 번 실패 → '첨삭 못 함'은 P11, 확인 호출 · 이어진 실패 수는 1-나 | `ai-errors.test.ts` |
| 8절 실패 흐름 | 통합 "8절 흐름: 연결 실패는 대화형 호출에서 1회 다시 보내고 첨삭은 다시 보내지 않는다" · "8절 흐름: 콘솔 한도 400 · 429 는 결과 상태 limit 이고 다시 보내지 않는다(1-가는 호출 하나의 실패)" · "8절 흐름: 401 은 계정 갈래로 남고 다시 보내지 않는다" · "8절 흐름: 거절은 다시 요청하지 않고 거절 수 1 을 돌려준다" · "6.1 흐름: 두 시도의 기다림이 타임아웃의 두 배를 넘지 않는다" | `ai-errors.test.ts` |
| 6.1 · 6.4 흐름 | 통합 "6.1 흐름: 엄격 규격 실패 → 1회 다시 요청 → 행 둘(validation_failed · success)" · "6.1 흐름: 두 번 다 엄격 실패면 정규화한 값을 돌려주고 두 행 모두 validation_failed" · "6.1 흐름: max_tokens 로 끝난 응답은 다시 요청한다" · "6.4 흐름: 출력 검사에 걸리면 바꾼 값을 돌려주고 그 행은 validation_failed" · "6.4 흐름: 시드 금지어 목록이 없거나 틀리면 AI 를 부르지 않는다" · "6.1 흐름: 프로필 이름 · 전화번호가 요청 본문에 없다" · "6.1 흐름: 생각 꺼내기 둘째 턴 요청은 첫 턴 메시지를 글자 그대로 앞에 둔다" | `ai-calls.test.ts` |
| 9절 AI 계약 | 단위 "9절 계약: 손으로 만든 표본(호출 넷 · 말하기 셋)이 엄격 규격을 통과한다" · "9절 계약: 개수 · 범위를 넘는 표본은 엄격 규격에 걸리고 정규화가 고친다" · "9절 계약: 거절 · max_tokens 표본은 규격 밖이다" · "9절 계약: 녹화 표본이 엄격 규격 또는 정규화를 통과한다"(없으면 목적마다 todo) · "9절 계약: 콘솔 한도 표본(손 · H12 녹화)을 8절 분류가 콘솔 한도로 본다" · "9절 계약: 계약 명령의 요청마다 max_tokens 가 ai.max_tokens.<목적>이다" · "AI 계약 명령: 사례 목록이 9절 AI 계약(수동) 행(호출 넷 · 회화 턴 두 설정 · 확인 호출 세 모델 · 콘솔 한도)과 모델 정보 대조를 덮는다 · dry-run 은 네트워크를 쓰지 않는다 · 녹화 파일에 키 · 인증 머리글이 없다" · "AI 계약 명령: 모델 정보 대조는 생각 형 · effort · 대체 모델 목록 · 수명이 단가표와 어긋나면 그 칸을 짚는다(손으로 만든 모델 정보로)" · "AI 계약 명령: 대체 모델 목록이 null 이면 server-side-fallback 머리글로 한 번 더 묻고, 그래도 null 이면 '확인 못 함'으로 적는다" · "관찰표: p99 와 권하는 max_tokens(두 배를 100 단위 올림) · 생각 단계 고르기 규칙" · "관찰표: 'H4 첫 실호출' 표에 P5a 확인 호출 줄(빈칸)과 이 명령의 첫 응답 줄이 있다" | `tests/contract/ai-schemas.test.ts` · `pnpm test` |
| 9절 AI 계약(수동) · 표본 평가(H4 뒤) | `pnpm ai:contract`(종료 0, 녹화 표본) · `pnpm ai:observe --yes`(관찰표) · H12 `pnpm ai:contract --case console-limit` | 수동 명령 · `docs/research/<날짜>-ai-observe.md` |
| 공통 | P9a 증명 표의 공통 행 + 빌드 추적 확인(작업 7 (나)) | CI |

## 완료 보고 (Done)

채움: 컨트롤러 2026-10-17 15:2x. **커밋 dae3afd**(feature/1a-p09c-ai-flow, 파일 50, 요청자 지시 2026-10-17 21:0x "커밋해"). 워크트리 `.claude/worktrees/p09`, 브랜치 `feature/1a-p09c-ai-flow`(바탕 P9b 6213662), 미커밋 22(새 코드 · 시험 · 표본 + 추적 파일 5 수정 + 장부 보고 3). 원격 없음(H15)이라 PR 없음.

| 흐름 | 때 | 결과 |
|---|---|---|
| 구현 impl-p09a(Opus · high) | 13:1x | DONE_WITH_CONCERNS — 단위 234 → 252 + todo 6 · 통합 30 → 57 · missing-test 52 → 46, 다르게 한 것 아홉, 알릴 것 다섯(`task-p09c-report.md`) |
| 검토 rev-p09b(Opus · xhigh) | 13:3x | Changes requested(C 0 · I 1 · M 5) — I-1 관찰 요청에 `output_config.format` 없음, M-1 둘째 시도 실패 처리 · M-2 nil uuid · M-3 확인 호출 몫 · M-4 설정 없음 사례 · M-5 생각 꺼내기 done(`review-p09c.md`) |
| fix 1 + 보충 | 13:4x~13:5x | 모두 ADDRESSED — 관찰 묶음 열하나에 형식, **C69**(둘째 시도가 어떤 실패로 끝나도 첫 값을 느슨한 규격으로 정규화, 거절만 예외), store `profileId: string \| null`(P9a 파일 한 줄 ※), 확인 호출 비용 단언, 설정 없음 사례, done 멈춤. 단위 255 · 통합 59(`task-p09c-fix1-report.md`) |
| 재검토 rev-p09b | 14:0x | Changes requested(C 0 · I 1 · M 2, 모두 fix 1 줄) — N-1 설정 없음 사례가 지운 키 안 되돌려 뒤 사례 빈 단언 · N-2 관찰 고르기 일시 오류 · N-3 dailyUsage(null) 단언(`review-p09c-2.md`) |
| fix 2 | 14:4x | 모두 ADDRESSED + 덤(sendCase 상태 없는 오류 → status 0 실패, `runObserve` 추출) — 망가뜨림 넷 모두 깨짐. 단위 258(`task-p09c-fix2-report.md`) |
| 재검토 rev-p09b | 15:0x | **Approved**(C 0 · I 0 · M 1) — N2-1 관찰이 상태 숫자로만 가름; 범위 밖(첫 판부터): 녹화 표본이 생기면 계약 시험 TypeError(`review-p09c-3.md`) |
| fix 3(Minor 라운드, 재검토 없음 C52) | 15:2x | 관찰 200 아닌 응답을 `classifyFailure` 로 셋(받지 않음 400 거부 · 설정 · 한도 오류 — 첫 console_limit · account 에서 남은 묶음 건너뛰고 산출물 씀 · 일시 오류), 녹화 표본 단언은 handmade 만 + 녹화 표본 있을 때 안 깨지는 시험. 단위 262 + todo 6. 컨트롤러 확인 biome 0 · build · 262 · 59 · deps 0 · spec-trace 46 · bundle 0 · `sk-ant-` 바탕 둘 · `ai:contract --dry-run` 0 · `ai:observe` 예상 비용만 0(`task-p09c-fix3-report.md`) |

실제 바뀐 파일(계획과 다른 것은 ※):

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/seed/structure.ts` | 수정(공용 3) | `AI_ATTEMPTS_MAX = 2` · `AI_WAIT_TIMEOUT_MULTIPLE = 2` |
| `src/core/ai/cost-alert.ts` | 신규 | `AI_ALERT_KINDS` · `preCallGate` · `dueCostAlerts` · `talkSafetyOf` · `monthKeyOf`(마이크로달러 정수, '닿으면' ≥). ※ 하루 호출 · 하루 비용 · 월 비용은 모두 kind `cost` + 기준 키, 콘솔 근접은 `console_near_limit`, `scope` · `value` 칸 |
| `src/server/seed-lists.ts` | 신규 | `loadSeedList`(뿌리 · 이름마다 모아 둠, 실패는 모아 두지 않음, 메시지에 내용 없음) · `getOutputCheckLists` |
| `src/server/ai/run.ts` | 신규 | `runAiCall` 차례 1~10(answerTextOf → JSON.parse → prepareAnswer → wireSchema → validate → normalize(엄격 통과도) → checkOutputFields → applyChecks → historyEntry), `AiOutcome` · `AiFailureReason`(결과 형은 여기 ※1, index 가 다시 내보냄 — 순환 방지) · `isConfigError`(SettingMissing · Invalid · Combo · ZodError · CallSetting · SeedList · AiConfig → config, 행 없음) · C69 둘째 시도(※5 → fix 1 에서 C69 로) · 턴 번호 어긋남 · 목적 불일치 · level 불일치는 RangeError ※3 |
| `src/server/ai/index.ts` | 신규 | `checkWriting` · `writeFeedback` · `evaluateSpeaking(mode)` · `thinkoutTurn`(allowedWords 를 vocab 에서 채움 ※4) |
| `src/server/ai/store.ts` · `tests/integration/ai-store.test.ts` | 수정(P9a 파일 ※ fix 1 M-2) | `dailyUsage(profileId: string \| null)`, null 이면 호출 수 0 · 집 비용 합 유지 + 단언(fix 2 N-3) |
| `scripts/ai-contract.ts` | 신규 | `pnpm ai:contract`(사례 · `recordOf` · `compareModelInfo` · `runContract` · `sendCase`(withResponse, 상태 없는 오류는 status 0 실패) · `evaluateCall` · `createScriptClient` · `readApiKey` 내보냄 ※7, 생각 꺼내기 녹화 `<id>.turnN.json` · done 멈춤 ※6, `--dry-run`) |
| `scripts/ai-observe.ts` | 신규 | `pnpm ai:observe`(`runObserve` · `observePlan` · `groupRequest`(형식 포함) · `summarize` · `recommendMaxTokens` · `chooseThinking`(400 거부만 버림) · 세 갈래 세기 · 관찰표, `--yes` 없이 예상 비용만, 생각 꺼내기는 첫 턴 변형 셋 ※9) |
| `tests/unit/cost-alert.test.ts` | 신규 | AC-8a · AC-N2 6 |
| `tests/integration/ai-calls.test.ts` · `ai-errors.test.ts` · `safety-cap.test.ts` | 신규 | 13 · 9(설정 없음 사례 뒤 키 되돌림 + 갈래별 오류 이름 단언) · 5 |
| `tests/contract/ai-schemas.test.ts` | 신규 | 계약 · 두 명령 · 관찰표 · 끊김 · 녹화 표본 시험, todo 6(녹화 표본 없는 규격) |
| `tests/fixtures/ai/samples/*.json` 29 · `recorded/.gitkeep` | 신규 | 손으로 만든 표본(source handmade) — 정상 · 개수 · 범위 초과 · 거절 · max_tokens 잘림 · 대체 모델 · iteration model null · 오류 400 · 429 · 404 |
| `package.json` · `next.config.ts` | 수정(공용 1 · 2) | `ai:contract` · `ai:observe` 두 줄 · `outputFileTracingIncludes` seed/lists |

증명: AC-8a · 8b · 8c · 8d · 8n · N2(spec-trace missing-test 52 → 46), 9절 계약 시험, 두 명령 dry-run · 예상 비용 종료 0. 검토 메모(review-p09a P9c 1~5 · review-p09b P9c 1~2 · review-p09b-2 P9c 3~4 · P9b 알릴 것 1 · 장부 '생각 끔 + 구조화 출력')은 구현 보고 '검토 메모 반영' 표대로 모두 반영. 13절 **C69**(fix 1 M-1, 괄호는 '종류 무관'으로 넓힘).

남긴 것: (1) 작업 8 — H4 · H12 뒤 실제 호출 · 녹화 · 관찰표 채우기 · model-prices 고침(두 명령의 실제 호출 길은 키가 없어 못 돌림, `withResponse()` · `models.retrieve` 응답 꼴은 첫 실행이 확인). (2) 1-나 — 회화 턴 · 끝맺음 턴 · 확인 호출 · 'AI 쉬는 중' 상태 · 비용 알림 행 만들기(판정 함수와 `AI_ALERT_KINDS` 만 둠), 회화 턴 타임아웃 재시도(스트리밍 길), 메타 문장 시드 목록(관찰의 '언어 · 말투 어긋남'은 거친 셈). (3) `MIN_RETRY_MS` 1초 — 2차 설정 화면의 `ai.timeout_seconds.*` 하한(ledger-open). (4) 열린 장부 '생각 끔 + 구조화 출력 400' 은 H4 뒤 `talk_config.*` 계약 사례가 증명. (5) P11 은 `AiOutcome` 실패 갈래마다 화면 길(ledger-open). (6) 공용 변경 셋(package.json · next.config.ts · structure.ts)과 P9a 파일 둘 수정은 커밋 메시지에 적는다.
