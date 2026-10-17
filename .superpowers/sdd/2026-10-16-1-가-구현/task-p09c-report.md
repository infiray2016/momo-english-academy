# 구현 보고: P9c AI 흐름 · 계약(implementer impl-p09a 이어 하기, 2026-10-17 04:3x~06:2x)

상태: DONE_WITH_CONCERNS

plan-p09c(approved)의 파일 열둘(새 11 · 고침 1)과 자료(응답 표본 JSON 29 · `recorded/.gitkeep`)를 만들었다. 공용 변경 둘(package.json scripts · next.config.ts outputFileTracingIncludes)도 글자 그대로 옮겼다. 작업 7 (가) 명령은 모두 종료 0 이다. (나) 빌드 추적은 서버 경로 셋 모두에 목록 파일이 든다.

커밋 · 하위 에이전트 · 실제 API 호출 · 키 · 아이 이름은 없다. 견본은 P9b `sample-inputs.ts` 의 지어낸 것만 썼다.

우려는 '검토자에게 알릴 것' 1 · 2 다. 두 명령의 실제 호출 길은 키가 없어 돌려 보지 못했다. 프로필이 없을 때 하루 호출 수를 세는 자리는 nil uuid 로 메웠다.

## 바뀐 파일

| 파일 | 신규 / 수정 | 무엇(줄) |
|---|---|---|
| `src/core/seed/structure.ts` | 수정 | 'AI 출력 꼴' 절 끝에 `AI_ATTEMPTS_MAX = 2` · `AI_WAIT_TIMEOUT_MULTIPLE = 2`(값 1 글자 그대로) |
| `src/core/ai/cost-alert.ts` | 신규 | 8 AI_ALERT_KINDS · 38 preCallGate · 86 dueCostAlerts · 147 talkSafetyOf · 163 monthKeyOf. 금액은 마이크로달러 정수, '닿으면'은 ≥ |
| `src/server/seed-lists.ts` | 신규 | `server-only`. 35 SeedListError · 55 loadSeedList((root, name)마다 하나 모아 둠, 실패는 모아 두지 않음, 메시지에 내용 없음) · 85 getOutputCheckLists |
| `src/server/ai/run.ts` | 신규 | `server-only`. 95 AiFailureReason · 103 AiOutcome · 116 AiCallContext · 122 AiDeps · 192 allowedWordsOf · 246 runAiCall(차례 1~10) |
| `src/server/ai/index.ts` | 신규 | `server-only`. 45 checkWriting · 57 writeFeedback · 76 evaluateSpeaking(mode) · 102 thinkoutTurn(allowedWords 를 vocab 에서 채움), 결과 형 다시 내보내기 |
| `scripts/ai-contract.ts` | 신규 | 순수 함수 parseArgs · loadScriptConfig · contractCases · recordOf · compareModelInfo · fetchModelInfo · runContract(+ sendCase · evaluateCall · createScriptClient · readApiKey). 직접 실행 때만 네트워크 · 파일 쓰기. `src/server` 안 가져옴 |
| `scripts/ai-observe.ts` | 신규 | parseArgs · observePlan · groupRequest · percentile · summarize · recommendMaxTokens · chooseThinking · reportMarkdown. `--yes` 없이는 예상 비용만 |
| `tests/unit/cost-alert.test.ts` | 신규 | AC-8a · AC-N2 여섯 |
| `tests/integration/ai-calls.test.ts` | 신규 | AC-8c 셋 · 6.1 · 6.4 흐름 일곱 + 표 밖 셋(아래) = 13 |
| `tests/integration/ai-errors.test.ts` | 신규 | AC-8d 하나 · AC-8n 둘 · 8절 · 6.1 흐름 다섯 + 표 밖 하나 = 9 |
| `tests/integration/safety-cap.test.ts` | 신규 | AC-8b 다섯 |
| `tests/contract/ai-schemas.test.ts` | 신규 | 9절 계약 · 두 명령 · 관찰표 11 + 표 밖 하나 = 12, todo 6(녹화 표본 없는 규격) |
| `package.json` | 수정(공용 변경 1) | `ai:contract` · `ai:observe` 두 줄 |
| `next.config.ts` | 수정(공용 변경 2) | `outputFileTracingIncludes: { "/*": ["./seed/lists/**/*.json"] }` 와 plan 주석 |
| 자료 | 신규 | `tests/fixtures/ai/samples/*.json` 29개와 `tests/fixtures/ai/recorded/.gitkeep`. samples 는 `source: "handmade"`, 목적마다 정상 · 개수 · 범위 초과 · 거절 · max_tokens 잘림 · 대체 모델 iterations · iteration model null, 그리고 오류 400 · 429 · 404 · 529 |

AC 를 붙이지 않은 표 밖 시험은 다음 다섯이다.
- **ai-calls**
  - "시드 목록: 임시 폴더 뿌리에서 금지어 목록을 읽고, 없으면 missing · JSON 이 틀리면 invalid"
  - "6.1 흐름: 엄격 규격을 지난 응답도 정규화를 거친다(한국어 피드백은 첫 문장)"
  - "흐름: 턴 번호 어긋남은 호출부 결함이라 서버 오류로 던지고 ai_calls 행이 없다"
- **ai-errors**
  - "설정 문제: 설정이 없거나 조합이 틀리거나 키가 없으면 config 이고 AI 를 부르지 않으며 ai_calls 행이 없다"
- **contract**
  - "9절 계약: 거절한 대체 홉의 iteration model 이 null 이면 요청 모델 단가로 센다(fallback 블록 from.model 이 그 모델)"

## 시험 수

| 묶음 | 바탕(6213662) | 지금 |
|---|---|---|
| 단위 `pnpm test`(unit + contract) | 234 | 252 + todo 6(cost-alert 6 · contract 12) |
| 통합 `pnpm test:int` | 30 | 57(ai-calls 13 · ai-errors 9 · safety-cap 5) |
| spec-trace missing-test | 52 | 46(AC-8a · 8b · 8c · 8d · 8n · N2) |

시험을 먼저 쓰고 import 실패를 본 뒤 구현했다. 흐름 시험은 구현 뒤 한 번에 통과했다. 그래서 `run.ts` 의 갈림 여섯을 하나씩 망가뜨려 봤고, 모두 시험이 깨진 뒤 되돌렸다.

| 망가뜨린 갈림 | 깨진 시험 수 |
|---|---|
| 엄격 실패 다시 요청 | 4 |
| 대화형만 다시 보내기 | 1 |
| 같은 오류 알림 | 1 |
| 안전 상한 | 4 |
| 검사 걸림 행 상태 | 2 |
| 엄격 통과 값 정규화 | 1 |

## 작업 7 (가) 명령과 출력

| 명령 | 종료 | 출력 끝 줄 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | `Done in 468ms using pnpm v10.34.7` |
| `pnpm exec biome ci .` | 0 | `Checked 128 files in 99ms. No fixes applied.` |
| `pnpm build` | 0 | `○  (Static)  prerendered as static content` |
| `pnpm test` | 0 | `Tests  252 passed \| 6 todo (258)` |
| `pnpm test:int` | 0 | `Tests  57 passed (57)` |
| `pnpm check:deps` | 0 | `✔ no dependency violations found (56 modules, 170 dependencies cruised)` |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 | `… AC 이름 시험 105 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 46` |
| `pnpm check:bundle` | 0 | `check-bundle: … 위반 0` |
| `grep -rn "sk-ant-" src tests scripts` | — | 2건 모두 바탕 P1 파일이다(`tests/unit/check-bundle.test.ts:58` 주석 · `scripts/check-bundle.ts:28` 검사 정규식). 이 작업 파일 0건 |
| `pnpm ai:contract --dry-run` | 0 | 사례 15줄(기본 목록, console-limit 제외)과 요청 꼴. 네트워크 · 파일 쓰기 없음 |
| `pnpm ai:contract`(키 없음) | 2 | `ai-contract: ANTHROPIC_API_KEY 가 없습니다(.env.local)`. 값 출력 없음 |
| `pnpm ai:observe` | 0 | `묶음 11 · 호출 220 · 예상 비용 약 3.24달러(6.6 1회 비용 × 횟수, 추측)` · `--yes 가 없어 부르지 않는다` |

dry-run 의 `talk_config.sonnet` 줄은 `thinking between_tools · effort low · fallbacks default · betas [server-side-fallback-2026-07-01, structured-outputs-2025-12-15] · 제목 talk_config` 이다. `talk_config.haiku` 는 `thinking disabled · fallbacks 없음` 이다. 장부의 열린 항목 '생각 끔 + 구조화 출력 400 인지'를 H4 뒤 이 두 사례가 처음 증명한다.

이스케이프는 바이트로 확인했다. `scripts/ai-observe.ts:64` 의 한글 범위가 도구 층에서 글자로 바뀌어 `가-힣` 으로 되돌렸다.

## 작업 7 (나) 빌드 추적

P4a 견본의 금지어 목록(`referenceSet(defaultSettings()).forbidden`)을 `seed/lists/forbidden.json` 에 두고 `pnpm build` 를 돌렸다(종료 0). 그 뒤 `.next` 의 `.nft.json` 을 읽었다.

| 서버 경로 | 든 파일 |
|---|---|
| `.next/server/app/page.js.nft.json` | `../../../seed/lists/forbidden.json` |
| `.next/server/app/_not-found/page.js.nft.json` | `../../../../seed/lists/forbidden.json` |
| `.next/server/app/_global-error/page.js.nft.json` | `../../../../seed/lists/forbidden.json` |

지금 있는 서버 경로 셋 모두에 들어 `"/*"` 가 덮는다. 깊은 경로(P11 의 서버 액션 경로)는 아직 없어 보지 못했다(plan 위험 3, H1 뒤 첫 프리뷰에서 P11 이 확인). 임시 `seed/` 는 지웠고 `git status` 에 남지 않았다.

## 계획과 다르게 한 것(이유)

1. **결과 형을 `run.ts` 에 두고 `index.ts` 가 다시 내보낸다**(값 5 는 index.ts). index 가 run 을 가져오므로 반대 방향 형 가져오기가 순환이 되고, dependency-cruiser(tsPreCompilationDeps)가 순환으로 잡는다. P11 은 그대로 `@/server/ai` 에서 가져온다.
2. **프로필이 없는 호출의 하루 호출 수는 nil uuid 로 센다.** P9a `dailyUsage` 가 `profileId: string` 이고 store.ts 는 이 plan 의 파일이 아니다. 어떤 행과도 맞지 않는 uuid 를 넘겨 호출 수 0 · 집 비용 합만 얻는다(`run.ts:79` 주석). store 의 형을 `string | null` 로 넓히는 한 줄이 더 깔끔하다(P9a 몫 고침, 컨트롤러 판단).
3. **`ctx.level` 과 `input.level` 이 다르면 RangeError 다.** 호출부 결함으로 보고 '설정 문제'로 세지 않는다(review-p09b-2 P9c 3 과 같은 길, 행 없음).
4. **`thinkoutTurn` 은 넘긴 `allowedWords` 를 쓰지 않고 vocab 에서 채운다.** 입력 형에서 그 칸은 선택이다.
5. **둘째 시도가 전송 실패(타임아웃 등)면 첫 시도의 다듬은 값으로 돌아가지 않고 그 실패를 돌려준다.** 값 4 의 7 을 글자대로 따랐다. 첫 시도의 값으로 정규화하는 길은 9(둘째 응답이 왔으나 엄격 실패)에서만 쓴다.
6. **계약 명령의 녹화 파일 이름.** 생각 꺼내기는 턴마다 `<id>.turnN.json` 으로 남긴다. `models` 사례는 녹화 파일을 쓰지 않고 줄 출력만 한다. 모델 정보는 응답 본문 계약이 아니라 대조 결과라서다.
7. **두 명령이 같이 쓰는 함수를 `ai-contract.ts` 에서 더 내보낸다.** `sendCase`(withResponse 로 상태 · 머리글을 받음) · `evaluateCall` · `createScriptClient` · `readApiKey` 이고, 관찰 명령이 가져다 쓴다.
8. **비용 알림 판정의 꼴.** `dueCostAlerts` 는 하루 호출 · 하루 비용 · 월 비용을 모두 kind `cost` 로 내고 기준 키로 가른다(`ai.daily_call_alert` · `ai.daily_cost_alert_usd` · `ai.monthly_cost_alert_usd:x<m>:<YYYY-MM>`). 콘솔 근접은 `console_near_limit` · `ai.console_alert_ratio:<YYYY-MM>` 다. `scope` 칸(profile · household)과 `value`(기준 · 실제, 마이크로달러)를 더했다.
9. **관찰 계획의 생각 꺼내기 묶음은 첫 턴 변형 셋만 돌린다**(`THINKOUT_VARIANTS` 가운데 turn 1). 값 7 '생각 꺼내기(첫 턴)'을 따랐다.

## 검토 메모 반영

| 메모 | 반영 | 자리 · 시험 |
|---|---|---|
| review-p09a P9c 1 시계 꼴 | `sendAttempt` 셋째 인자에 `{ now: clock }` | run.ts:371 |
| review-p09a P9c 2 '0 으로 셌다' | 서버 경고에 `priceMissingModelInBook: book.has(PRICE_MISSING_MODEL)` | run.ts:237 |
| review-p09a P9c 3 거절한 대체 홉 모델 | 표본 `writing_feedback.fallback-null-model`(iteration model null, fallback 블록 from.model = 요청 모델)과 계약 시험. 경고에는 홉마다 from · to · 분류를 적는다 | samples · contract 시험 · run.ts warnAnswer |
| review-p09a P9c 4 ComboError · ZodError | `isConfigError` 가 둘 다(와 SettingMissing · Invalid · CallSettingError · SeedListError · AiConfigError) `config` 로 받는다. 행 없음 | run.ts:285 · 337, '설정 문제' 시험 |
| review-p09a P9c 5 회화 턴 타임아웃 재시도 | 1-나 스트리밍 길 몫이라 짜지 않았다. 머리 주석에 남김 | run.ts 머리 |
| review-p09b P9c 1 흐름 차례 · 엄격 통과도 normalize | answerTextOf → JSON.parse → prepareAnswer → wireSchema.safeParse → validate → normalize(엄격 통과도) → checkOutputFields(input.sentenceMaxWords) → applyChecks → historyEntry. changed 면 `validation_failed`, fatal 은 `output_blocked` | run.ts:440~492, 시험 '엄격 규격을 지난 응답도 정규화를 거친다' · '출력 검사에 걸리면 …' |
| review-p09b P9c 2 SettingValues 이름 겹침 | `type SettingValues as CallSettingValues` 별칭 | run.ts 가져오기 |
| review-p09b-2 P9c 3 호출부 결함 | 턴 번호 어긋남 · 목적 불일치 RangeError 는 잡지 않고 던진다(isConfigError 밖). 행 없음 | 시험 '턴 번호 어긋남은 호출부 결함 …' |
| review-p09b-2 P9c 4 앱 연락처 정규식 | `createMasker` · `checkOutputFields` 를 그대로 쓰고 다시 짜지 않았다 | run.ts maskerFor · 10 |
| P9b 보고 알릴 것 1 | 위 P9c 1 과 같다 | 같음 |
| 장부 '생각 끔 + 구조화 출력' | 계약 사례 `talk_config.haiku` · `.sonnet` 이 dry-run 에 요청 꼴을 보인다 | 위 dry-run 줄 |

## 남긴 것

- 작업 7 (다) 검토 · (라) 커밋, 작업 8(H4 · H12 뒤 실제 호출 · 녹화 · 관찰표 채우기 · model-prices 고침).
- 회화 턴 · 끝맺음 턴 · 확인 호출 · 'AI 쉬는 중' 상태 · 비용 알림 행 만들기(1-나). 판정 함수와 `AI_ALERT_KINDS` 만 두었다.
- 정본 · plan 은 고치지 않았다. 공용 변경은 위 둘만이다.

## 검토자에게 알릴 것

1. **두 명령의 실제 호출 길은 돌려 보지 못했다(키 없음).** 순수 함수(사례 · 요청 꼴 · 녹화 머리글 · 모델 대조 · 두 번 묻기 · 요약 · 권하는 값 · 고르기 규칙 · 관찰표 머리)와 dry-run · 키 없는 종료 2 · `--yes` 없는 종료 0 만 시험했다. `sendCase` 의 `withResponse()` 와 `client.beta.models.retrieve` 응답 꼴은 H4 뒤 첫 실행이 확인한다.
2. **프로필이 없을 때의 nil uuid.** '다르게 한 것' 2 다. P9a store 의 형을 넓히는 쪽을 권한다.
3. **둘째 시도의 최소 남은 시간은 1초(`MIN_RETRY_MS`)다.** 타임아웃 설정이 아주 작으면(예: 0.3초) 엄격 실패 뒤 다시 요청하지 않는다. 그래서 '두 시도 기다림' 시험은 타임아웃 1.2초 · 첫 응답 1초 늦춤으로 짰다(약 2.3초 걸림). 기본 설정(10 · 60초)에서는 늘 둘째 시도가 나간다.
4. **흐름 시험이 서버 경고 줄을 출력한다**(대체 모델 표본). 내용은 요청 번호 · 목적 · 모델 · 분류 · 단가 없음 여부뿐이고 본문 · 이름은 없다.
5. **관찰 명령의 '언어 · 말투 어긋남'은 거친 셈이다.** 한국어 칸에 한글이 없거나 영어 칸에 한글이 있는 칸 수만 센다. '추론 같은 글'은 내장 목록 넷(the child · the student · I should · Let me)이다. 메타 문장 시드 목록(1-나)이 생기면 그것으로 바꾼다.
