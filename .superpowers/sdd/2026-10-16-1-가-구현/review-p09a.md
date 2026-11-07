Approved(C 0 · I 0 · M 7)

# 코드 검토: P9a AI 호출 바탕(code-reviewer rev-p09a · Opus · xhigh, 2026-10-17)

대상은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p09`(브랜치 `feature/1a-p09a-ai-client`, 바탕 8791527, 커밋 없음)다. 코드 파일:줄은 이 워크트리 기준이고, plan · 정본 줄은 메인 저장소 기준이다. 첫 검토라 닫힌 장부는 없다.

확인 방법은 이렇다.
- 새 파일 열하나 · 고친 파일 넷(`git diff`)을 모두 읽었다. 구현 보고는 주장으로 보고 코드와 대조했다.
- 마이그레이션은 워크트리를 건드리지 않고 스크래치패드 사본(스키마 · drizzle/ · 설정 · node_modules 연결)에서 `drizzle-kit generate` 를 돌려 "No schema changes" 와 `drizzle-kit check` "Everything's fine" 을 봤다. 0001 · 0002 snapshot 을 키 정렬로 견주면 다른 것은 `error_code` 열과 `ai_calls_learning_day_idx` 색인뿐이고, 0002 의 prevId 가 0001 의 id 다.
- SDK 0.135.0 설치판에서 이름 붙일 위험이 있는 곳만 읽었다: 생성자 크리덴셜 · baseURL · logLevel 차례(`src/client.ts` 870~990줄), 오류 본문 만들기(1577~1590줄), 빈 betas 머리글(`lib/internal/beta-messages-request.ts` 22줄), 대체 응답 iterations 꼴(`resources/beta/messages/messages.ts` 5211~5218 · 5438 · 6038줄).
- 시험은 다시 돌리지 않았다(컨트롤러 재확인 단위 198 · 통합 29). 증명 표 이름 35개는 plan 과 스크립트로 글자 대조했다(빠짐 0, 표 밖 더함 2).
- 이 환경에 Write 도구가 없어 보고는 스크래치패드에 쓴 뒤 이 자리로 옮겼다(파일 하나, 다른 파일은 건드리지 않음).

## 1. 설계 준수

| 갈래 | 판정 | 근거 |
|---|---|---|
| 빠진 것 | 없음 | 값 1~9 의 이름 · 규칙이 모두 있다. 작업 3 (나) `seed/model-prices.json` 고침은 바탕에 `seed/` 가 없어 건너뛰었고 plan 45줄이 이 경우를 P6 몫으로 둔다 |
| 넘친 것 | 해 없음 | `invalid-setting`(다르게 한 것 1) · `costMicros`(4) · `testSettingValues` · `TestSettingKey` · `fixturePrice` · `FIXTURE_EFFECTIVE_FROM` · 가짜 서버의 `requests` · `AttemptBody` 형 빼기 · 표 밖 시험 둘. 모두 더하기이고 plan 취지 안이다 |
| 잘못 이해한 것 | 없음 | 다르게 한 것 2 의 까닭 설명은 SDK 설명과 다르지만 결과는 plan 규칙과 같다(4절 표) |
| diff 만으로 확인 못 함 | 셋 | 베타 끝점에서 구조화 출력 머리글을 받는지(plan 위험 1), 대체 응답의 실제 iterations · fallback 블록 꼴(위험 3 · 확인할 사실 4), 'off' 와 구조화 출력의 조합(확인할 사실 1). 모두 P9c H4 몫이다 |

### 볼 것 1~11

| 번호 | 판정 | 근거 |
|---|---|---|
| 1 마이그레이션 | 맞음 | SQL 두 문장이 plan 51~54줄 글자 그대로다. 열은 비울 수 있고 기본값이 없다(operations.ts:138~140). 주석이 값 1 문구와 C63 (3) 을 단다. snapshot · journal 은 drizzle-kit 재생성 결과와 같다(위 확인). '더하기만' 정적 검사는 `drizzle/` 의 `.sql` 을 모두 읽는다(rls-grants.test.ts:178~182) |
| 2 조합 | 맞음 | `AI_PURPOSES` 가 `aiPurposeEnum` 과 값 · 차례가 같고 시험이 본다(combo.test.ts:359~361). 키 이름은 12절 98~106줄과 같다: `talk_turn.<구간>`(combo.ts:117), `ai.max_tokens.talk_closing`(:130), feedback 은 writing_feedback · talk_closing(:56~59, 12절 105줄). `checkCombo` 이유는 셋이고 `invalid-setting` 은 `SettingsComboViolation` 에만 있다(:160~163 · 188~191). '끔' 변환 · fallbacks · betas · 확인 호출 구성이 6.1 표 17 · 23~25 · 37줄과 같다(:236~244 · 268~275 · 318~337). AC-8i 다섯이 이름 그대로이고 값은 `TEST_SETTINGS` 에서 읽는다 |
| 3 비용 | 맞음, 시험 하나 모자람 | 과금 목록 · 정수 셈 · 반 올림(cost.ts:112~116) · 한 번만 반올림(:308) · 단가 고르기(:218~249, 미래 줄 빼기 · 같은 (모델, 날짜) 던짐) · `priceOf` 대체 · `costOf` 토큰도 과금 시도만이 값 5 와 같다. 손셈 주석(ai-outcome.test.ts:91 의 8460.5 → 0.008461, :117 의 0.5 → 1)이 맞다. 홉 셋 사슬 시험이 없다(M-2) |
| 4 실패 분류 | 맞음 | 표 여덟 줄이 failure.ts:109~147 과 1:1 이다. `errorCode` 는 `timeout` · `connection` · `<갈래>:<상태>`(:101), `retryConnection` 은 연결 실패만(:125), `countsTowardDown` 은 rate_limit · server · timeout · connection(:103 · 116 · 126), `rest` 는 console_limit · account(:104). 값은 DB 열거형 `ai_call_status` · `ai_rest_reason` 과 맞는다 |
| 5 클라이언트 | 맞음, 시험 하나 약함 | apiKey 다듬기 · 빈 키 `AiConfigError`(값 없음) · `authToken: null` · VERCEL_ENV 면 기본 주소 · maxRetries 0 · logLevel warn · OpenTelemetry 끔(client.ts:41~56). SDK 생성자는 apiKey 가 있으면 크리덴셜 사슬을 풀지 않고(설치판 client.ts 974줄), 옵션 logLevel 이 `ANTHROPIC_LOG` 를 이긴다(927~928줄). `sendAttempt` 는 베타 create · 빈 betas 안 넘김 · timeout 옵션이다(:143~150). 본문 금지 칸은 형에서 빼지만 그 형을 시험이 보지 않는다(M-1). `toAttemptFailure` 의 차례(타임아웃 → 연결 → 상태 있는 API 오류 → 던짐)가 SDK 상속 관계와 맞다(:116~132) |
| 6 기록 | 맞음, 덧 하나 | `insertAiCall` 열이 6.1 41줄 · C56 (2) · C63 (3) 과 같다(store.ts:45~70). `loadPriceBook` 은 줄을 모두 읽고 조합 칸을 검증해 그 모델 줄을 모두 빼며 모델 이름만 경고한다(:77~109). `dailyUsage` 는 한 질의로 probe 밖 · safety_cap 밖 프로필 호출 수와 집 전체 비용을 낸다(:117~137, 6.1 43줄). `createAlertOnce` 는 트랜잭션 자문 잠금 · `IS NULL` 비교 · JSON null 안 씀이다(:175~219). SQL 안 now() 가 없다. `sameErrorCount` 의 LIKE 밑줄(M-5) |
| 7 가짜 | 맞음 | 규칙 차례 · times(복사본에서 줄임, fake-anthropic.ts:288 · 326~329) · bodyIncludes · purpose(= 규격 title) · 501 · 요청 기록 · push · reset. `hang` · `delayMs` 는 signal 을 따른다(:246~275). 서버는 끝점 다섯과 `closeAllConnections` 뒤 close 다(:450~538). `src/` 는 이 파일을 가져오지 않는다(grep 0건) |
| 8 의존 · 구조 | 맞음 | `src/core/ai` 는 zod · seed 규격 · structure · 서로만 가져온다. `src/server/ai/*` 첫 줄이 `import "server-only"` 다. `@anthropic-ai/sdk` 가져오기는 `src/server/ai/client.ts` 하나다. `ComboBook` 은 4절 표 5 |
| 9 시험 | 맞음, 덧 넷 | 이름 35 글자 그대로(6절 표). 오류 갈래 넷이 실제 SDK 를 지난다(ai-client.test.ts:242~271 은 가짜 fetch, ai-store.test.ts:479~488 은 가짜 HTTP 서버로 404 · 끊김 · 붙잡힘). 알림 한 번 시험은 알릴 것 1 판정대로 쓸모 있다. 약한 시험 · 빠진 분기는 M-1 · M-2 · M-3 · M-6 |
| 10 다르게 한 것 | 4절 표 | 아홉 모두 받는다 |
| 11 품질 | 덧 셋 | 경계(iterations null · 빈 목록, 캐시 칸 null → 0, 빈 단가표 → 0 · 단가 없음, 빈 시도 → 0)가 맞다. 기술 값은 이름 붙인 상수다(MS_PER_SECOND · HTTP 상태 · 자리 수 · MAX_RETRIES). 한국어 주석 · 영어 식별자를 지킨다. 덧은 M-4 · M-6 · M-7 |

## 2. 잘한 점

- 알림 한 번 시험에 이빨을 달았다. 같은 풀(기본 3 연결, `src/server/db/index.ts` 12줄)로 둘을 동시에 부르는 처음 꼴은 잠금을 빼도 통과했다. 연결 여덟의 따로 된 DB 로 여덟 번 부르게 바꾸고(ai-store.test.ts:341~351) 잠금을 지운 판에서 실패를 확인했다.
- SDK 함정 둘을 설치판에서 찾아 막았다. 빈 betas 가 빈 `anthropic-beta` 머리글로 나가는 것(client.ts:146)과, 환경 변수 `ANTHROPIC_LOG=debug` · `ANTHROPIC_AUTH_TOKEN` 이 있어도 굳힌 값이 이기는지를 SDK 인스턴스 값으로 확인했다(ai-client.test.ts:126~147).
- 비용 셈이 끝까지 정수다. 시도별 단가4 × 토큰을 모아 한 번만 반올림하고(cost.ts:291~308), 0.5 마이크로달러 경계와 `0.1 + 0.2` 를 시험으로 박았다(ai-outcome.test.ts:108 · 117~123).
- 단가 고르기를 순수 함수 하나에 모았다. 시드의 수와 DB 의 글을 같은 길로 읽고(cost.ts:195~199), 두 길이 같은 단가표가 되는 것을 시험이 본다(ai-outcome.test.ts:320~333).
- 마이그레이션이 깨끗하다. drizzle-kit 생성물 그대로이고 SQL 이 plan 과 글자까지 같다.

## 3. 지적

Critical 과 Important 는 없다.

### Minor

**M-1. 본문 금지 칸 시험이 그 까닭으로는 실패할 수 없다.** client.ts:86~90 · ai-client.test.ts:168~218.
- 무엇이: 시험의 본문은 시험이 직접 만든다(ai-client.test.ts:43~60). 그래서 이 시험은 `sendAttempt` 가 temperature 등을 더하지 않는다는 것만 증명한다. 실제로 막는 것은 `AttemptBody` 의 `Omit` 이고, 그 형을 보는 시험이 없다.
- 왜: plan 값 7(153줄)은 '형으로 막을 수 없으니 시험이 본다'고 적었다. 구현은 형으로 막았지만 그 형이 풀려도 아무 시험도 깨지지 않는다.
- 어떻게: 같은 시험에 `// @ts-expect-error` 한 줄로 temperature 가 든 본문을 `AttemptBody` 에 넣어 본다. `pnpm build` 가 tsconfig 의 `**/*.ts` 로 시험 파일도 형 검사하므로(tsconfig.json include) 형이 풀리면 빌드가 깨진다.

**M-2. 홉 셋 사슬 시험이 없다.** cost.ts:143~169 · ai-outcome.test.ts:246~274.
- 무엇이: 보고는 '대체 모델이 다시 거절한 사슬(홉 셋)도 짝이 맞는다'고 하지만(task-p09a-report.md 71줄) 시험은 홉 둘뿐이다.
- 왜: plan 위험 3(208줄) · 확인할 사실 4(267줄)가 이 짝짓기를 (추측)으로 둔다. SDK 설명으로는 거절한 홉은 모두 `message`, 답한 마지막 홉만 `fallback_message` 다(설치판 messages.ts 5211~5218줄).
- 어떻게: iterations `[message(요청 모델, 출력 0), message(대체 A, 출력 0), fallback_message(대체 B)]` 와 fallback 블록 둘(분류 cyber · bio)로, 첫 홉은 빠지고 둘째 홉은 남는 것을 본다.

**M-3. 분기 둘에 시험이 없다.** combo.ts:218~221 · store.ts:90~107.
- 무엇이: `checkSettingsCombos` 의 `invalid-setting`(키 없음 · 꼴 틀림)과, `loadPriceBook` 의 '한 모델에 맞는 줄과 어긋난 줄이 섞이면 그 모델 줄을 모두 뺀다'다. 지금 시험은 줄 하나뿐인 어긋난 모델만 넣는다(ai-store.test.ts:232~247).
- 왜: 앞은 P7 적재의 거부 근거가 되는 새 이유(다르게 한 것 1)이고, 뒤는 plan 값 8(163줄)의 '그 모델의 줄을 모두 빼고'다. 둘 다 지금 고쳐도 아무 시험도 깨지지 않는다.
- 어떻게: combo.test.ts 에 `ai.model.thinkout` 을 지운 값과 `ai.thinking.writing_check: "on"` 을 넣어 `invalid-setting` 을 본다. ai-store.test.ts 에 같은 모델 이름으로 다른 날짜의 어긋난 줄을 하나 더 넣어 그 모델이 단가표에서 빠지는 것을 본다.

**M-4. `seedModelPrices` 는 넘기지 않아도 적용일을 덮는다.** tests/fixtures/ai/model-prices.ts:110~125.
- 무엇이: 셋째 인자에 기본값(`FIXTURE_EFFECTIVE_FROM`, :113)이 있어 줄마다의 `effectiveFrom` 이 늘 무시된다(:119). 보고의 '넘기면 … 우선'(task-p09a-report.md 78줄)과 다르다.
- 왜: plan 값 3(79줄)의 서명 그대로라 지금 시험에는 해가 없다. 다만 줄마다 날짜가 다른 파일을 넘긴 시험이 소리 없이 한 날짜로 눌린다.
- 어떻게: 인자를 선택으로 두고 `effectiveFrom ?? entry.effectiveFrom` 으로 쓴다. 또는 함수 주석에 '늘 덮는다'를 적는다.

**M-5. `sameErrorCount` 의 LIKE 에서 밑줄이 한 글자 와일드카드다.** store.ts:19 · 152.
- 무엇이: `'same_error:%'` 의 `_` 는 아무 한 글자와 맞는다.
- 왜: 지금 만들어지는 코드(failure.ts:101 의 갈래 일곱)로는 틀린 결과가 없다. plan 값 8(165줄)은 `same_error:` 접두를 센다고 적었다.
- 어떻게: `'same\_error:%'` 로 이스케이프하거나 `left(error_code, 11) = 'same_error:'` 로 쓴다.

**M-6. `getAnthropicClient` 의 캐시 규칙에 시험이 없다.** client.ts:73~84.
- 무엇이: 보고가 남긴 것으로 적었다. 감싼 것뿐이 아니라 '키 · VERCEL_ENV · ANTHROPIC_BASE_URL 이 바뀌면 새로 만든다'는 규칙이 있다.
- 왜: P9c 의 실행 흐름이 이 함수를 기본 의존으로 쓴다(plan-p09c 79줄). 이 규칙이 깨지면 키를 바꾼 뒤에도 옛 클라이언트가 남는다.
- 어떻게: `vi.stubEnv` 로 같은 환경이면 같은 인스턴스, `ANTHROPIC_BASE_URL` 을 바꾸면 다른 인스턴스인지 보는 단위 시험 하나를 더한다.

**M-7. 시험의 `env.ANTHROPIC_BASE_URL` 은 읽히지 않는다.** ai-client.test.ts:81 · client.ts:50.
- 무엇이: `clientOptionsOf(env)` 는 `env` 에서 키와 VERCEL_ENV 만 읽는다. VERCEL_ENV 가 없을 때의 주소는 SDK 가 `process.env.ANTHROPIC_BASE_URL` 에서 읽는다. 그래서 `clientWith` 가 넘긴 `FAKE_BASE` 는 쓰이지 않는다.
- 왜: plan 값 7(151줄) 그대로의 동작이라 결함은 아니다. 다만 시험을 읽는 사람은 가짜 주소로 붙는다고 오해한다. 실제로는 가짜 fetch 가 받아서 네트워크가 없을 뿐이다.
- 어떻게: 시험의 그 칸을 지운다. 또는 `clientOptionsOf` 에 '주소는 process.env 에서 SDK 가 읽는다'는 주석을 더한다.

## 4. '계획과 다르게 한 것' 1~9 판정

| 번호 | 판정 | 근거 |
|---|---|---|
| 1 `invalid-setting` | 받음 | 적재 · 고급 화면이 키 없는 값을 걸러야 하므로 필요하다. `checkCombo` 이유는 셋 그대로다(combo.ts:160~163). 시험 없음은 M-3 |
| 2 합친 홉 차례 | 받음 | 결과가 plan 규칙과 같다. SDK 설명상 거절한 홉은 모두 `message` 이고 `fallback_message` 는 답한 마지막 항목뿐이다(설치판 messages.ts 5211~5218줄). 그래서 합친 차례의 앞 i 개는 곧 message 의 앞 i 개다. 보고의 까닭('둘째 거절이 fallback_message')은 이 설명과 다르다. 도구 반복이 없는 이 앱에서는 차이가 없다. 마지막 거절 규칙을 iterations 없는 응답에도 거는 것은 plan 값 5(116줄) 문장과 같다. 시험은 M-2 |
| 3 price null → 0 | 받음 | core 는 기록할 수 없다. P9c 흐름 8 이 단가 없음이면 서버 경고를 남긴다(plan-p09c 88줄). 8절 P9c 메모 2 |
| 4 `costMicros` | 받음 | 더하기만이고 합 비교의 글 풀기를 없앤다 |
| 5 `ComboBook` | 받음 | `no-circular` 규칙(.dependency-cruiser.cjs:31)이 cost → combo → cost 형 순환을 잡는다. `PriceBook` 이 구조로 `ComboBook` 에 들어맞는다(cost.ts:182, combo.ts:90) |
| 6 단계 인자 선택 | 받음 | 회화 목적에 빠지면 RangeError 다(combo.ts:114~116). 시험이 본다(combo.test.ts:289). 형으로 강제하지 않는 것은 감수할 만하다 |
| 7 빈 betas 안 넘김 | 받음 | SDK 는 `betas?.toString() != null` 이면 머리글을 단다(설치판 beta-messages-request.ts 22줄). 빈 목록이 빈 머리글이 된다. Haiku 요청에 머리글이 없는 것을 시험이 본다(ai-client.test.ts:213) |
| 8 value null → 칸 빼기 | 받음 | P3a 메모 그대로이고 시험이 본다(ai-store.test.ts:387~388) |
| 9 effectiveFrom 덮기 | 받음 | plan 값 3 서명 그대로다. 보고 문구와 동작의 차이는 M-4 |

## 5. '검토자에게 알릴 것' 1~5 판정

| 번호 | 판정 | 근거 |
|---|---|---|
| 1 알림 한 번 시험의 이빨 | 받음 | 잠금이 있으면 늘 한 행이라 거짓 실패가 없다. 잠금이 없으면 여덟 연결이 겹쳐 '확인 뒤 넣기' 경쟁이 난다. 실패는 확률이지만 구현자가 세 번 모두 실패를 봤다 |
| 2 501 → server:501 | 받음 | plan 값 9 의 '규칙 없음 501' 과 값 6 '500 이상' 의 결과다. e2e 에서의 무게는 8절 P11 메모 |
| 3 시험의 숫자 | 받음 | 손셈 둘을 다시 셌다(1절 볼 것 3). 50 · 200ms · 5초 · 8 은 기술 값 상수로 이름이 붙어 있다 |
| 4 알림 종류 글 | 받음 | 시험 안의 이름뿐이다. P9c 는 `call_config_check` 를 쓴다(plan-p09c 87줄) |
| 5 `console.warn` | 받음 | 모델 이름만 남기고 값 · 키가 없다(store.ts:100~104) |

## 6. 증명 표 행마다 시험

| 증명 표 행 | 시험 이름 | 있음 · 없음 |
|---|---|---|
| AC-8i | ai.effort.talk_turn 을 xhigh(또는 max)로 … | 있음 combo.test.ts:57 |
| AC-8i | 쓰기 확인 모델을 Opus 5.5 로 두고 '끔' … | 있음 :83 |
| AC-8i | 4~6 구간 회화 모델을 Haiku 5.5 로 … | 있음 :109 |
| AC-8i | 1-3 구간 effort 를 medium 으로 … | 있음 :133 |
| AC-8i | 확인 호출 구성은 … 6.1 표의 조합이다 | 있음 :159 |
| 6.1 조합 | '끔'은 Sonnet 5.5 between_tools … | 있음 :194 |
| 6.1 조합 | Sonnet · Opus 는 fallbacks default … | 있음 :213 |
| 6.1 조합 | 최대 출력은 ai.max_tokens.<목적> … | 있음 :241 |
| 6.1 조합 | 첨삭 · 끝맺음 턴은 feedback 타임아웃 … | 있음 :292 |
| 6.1 조합 | 시험용 단가표(여섯 행)가 … 'none'(Opus 4.8)을 받는다 | 있음 :334 |
| 6.1 비용 | 단가표 단가로 토큰 넷을 센다 … | 있음 ai-outcome.test.ts:68 |
| 6.1 비용 | 대체 모델이 답하면 iterations 항목마다 … | 있음 :126 |
| 6.1 비용 | 단가표에 없는 모델은 claude-opus-4-8 … | 있음 :175 |
| 6.1 비용 | 출력 전 거절은 bio · frontier_llm … | 있음 :215 |
| 6.1 비용 | 단가 고르기: … 미래 줄은 뺀다 … | 있음 :293 |
| 6.1 비용 | 단가 고르기: 같은 모델 · 같은 날짜 줄이 둘이면 던진다 | 있음 :314 |
| 6.1 비용 | 단가 고르기: 시드 파일을 priceRowsOfSeed 로 … | 있음 :320 |
| 8절 분류 | 한도 머리 400(조직 · 워크스페이스)과 … | 있음 :343 |
| 8절 분류 | 401 · 402 · 403 은 계정 확인 필요 | 있음 :383 |
| 8절 분류 | 한도 아닌 429 · 5xx · 529 · 타임아웃 · 연결 실패는 장애 … | 있음 :398 |
| 8절 분류 | 한도 아닌 400 · 404 · 413 과 정본 밖 4xx … | 있음 :441 |
| 8절 분류 | 연결 실패만 다시 보내기 대상이다 | 있음 :467 |
| 6.1 클라이언트 · 시도 | 키가 없으면 만들지 않는다 … | 있음 ai-client.test.ts:92 |
| 6.1 클라이언트 · 시도 | Vercel 배포(VERCEL_ENV 있음)는 … | 있음 :111 |
| 6.1 클라이언트 · 시도 | maxRetries 0 · logLevel warn … | 있음 :126 |
| 6.1 클라이언트 · 시도 | 시도: 500 을 받으면 요청은 한 번뿐이다 … | 있음 :151 |
| 6.1 클라이언트 · 시도 | 시도: 요청 본문에 temperature … 없고 … | 있음 :168(약함, M-1) |
| 6.1 클라이언트 · 시도 | 시도: 가짜가 답을 늦추면 timeoutMs 뒤 … | 있음 :220 |
| 6.1 클라이언트 · 시도 | 가짜: 규칙 차례 · times · bodyIncludes · 요청 기록 | 있음 :275 |
| 6.1 · 5절 기록 | 기록: ai_calls 한 행에 … error_code 가 그대로 남는다 | 있음 ai-store.test.ts:120 |
| 6.1 · 5절 기록 | 단가표: 학습일보다 늦은 적용일 줄은 … | 있음 :203 |
| 6.1 · 5절 기록 | 하루 사용량: 확인 호출 밖 … | 있음 :250 |
| 6.1 · 5절 기록 | C17 같은 오류 세기 … | 있음 :299 |
| 6.1 · 5절 기록 | 알림 한 번: … 동시에 두 번 불러도 한 행 | 있음 :329 |
| 6.1 · 5절 기록 | 가짜 HTTP 서버: SDK 가 baseURL 로 … | 있음 :394 |
| 5절 더하기만 | 마이그레이션: drizzle/*.sql 에 DROP … 이 없다 | 있음(P3a) rls-grants.test.ts:178, 0002 를 읽음 |
| 공통 | biome · build · test · test:int · check:deps · spec:trace · check:bundle | 컨트롤러 재확인(브리프 9줄) |

표 밖 시험 둘: "6.1 호출 목적은 DB 열거형 ai_purpose 와 같은 값 · 차례다"(combo.test.ts:359), "6.1 시도: SDK 오류 갈래 넷 …"(ai-client.test.ts:242). AC 를 붙이지 않아 spec-trace 에 닿지 않는다.

## 7. 판정

Approved. Critical · Important 가 없고 Minor 일곱은 시험 보강 다섯(M-1 · M-2 · M-3 · M-6 · M-7)과 작은 고침 둘(M-4 · M-5)이다. 컨트롤러가 직접 고치거나 P9b 첫 손질에 함께 넣어도 된다.

## 8. 다른 P 에 넘길 메모

- **P9c 1. 시계 꼴이 다르다.** plan-p09c 79줄의 의존은 `clock = now`(함수)인데 `sendAttempt` 의 셋째 인자는 `{ now(): Date }` 꼴이다(client.ts:138). P9c 가 `{ now }` 로 감싸 넘긴다.
- **P9c 2. 단가 0 경우를 경고에 드러낸다.** opus-4-8 줄마저 없으면 `costOf` 는 비용 0 과 단가 없음만 돌려준다(cost.ts:268 · 294). 흐름 8 의 서버 경고에 `book.has(PRICE_MISSING_MODEL)` 결과를 같이 남기면 '0 으로 셌다'가 보인다.
- **P9c 3. 거절한 대체 홉의 모델.** `BetaMessageIterationUsage.model` 은 null 일 수 있고(설치판 messages.ts 6038줄), 그러면 그 홉을 요청 모델 단가로 센다(cost.ts:154, plan 값 5 그대로). 거절한 모델은 짝지은 fallback 블록의 `from.model` 에 있다(설치판 5040~5047줄). 확인할 사실 4 의 표본이 오면 견준다.
- **P9c 4. 설정 꼴이 틀리면 ZodError 다.** `requestConfigOf` 는 조합이 틀리면 `ComboError`, 값 꼴이 틀리면 ZodError 를 던진다(combo.ts:293~300). 흐름 1 이 `getSettings(aiSettingSchemasOf(…))` 로 먼저 거르므로 닿지 않지만, 둘 다 '설정 문제'로 받는다.
- **P9c · 1-나 5. 회화 턴은 타임아웃도 한 번 다시 부른다.** 8절 '회화 턴 실패'(specs/07-음성과-오류.md 58줄)는 첫 문장 전의 연결 오류 · 타임아웃에 다시 부른다. `classifyFailure` 의 `retryConnection` 은 타임아웃에 false 다(plan 값 6 그대로). 스트리밍 길은 plan 값 7 의 '첫 text 경계'로 정하고 `retryConnection` 만 보지 않는다.
- **P11 6. 가짜에 규칙이 없으면 장애로 센다.** 규칙 없음은 501 → `server:501` → `countsTowardDown: true` 다. 1-나 뒤 e2e 에서 규칙 빠짐 세 번이면 'AI 쉬는 중'에 들 수 있다. e2e 끝에 `GET /__fake/requests` 와 응답 상태로 501 이 없는지 본다.
- **P5 7.** plan '다른 P 에 넘길 것'(241줄) 그대로 `priceBookOf` · `priceRowsOfSeed` 로 바꾼다. 셈이 같은 곳에서 끝나 부동소수 차이가 없어진다.
