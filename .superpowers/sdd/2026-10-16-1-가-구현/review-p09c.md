# 검토: P9c AI 흐름 · 계약 — Changes requested(C 0 · I 1 · M 5)(rev-p09b 이어 보기 · Opus · xhigh, 2026-10-17 12:2x)

대상: 워크트리 `.claude/worktrees/p09`(feature/1a-p09c-ai-flow, 바탕 P9b 6213662, 커밋 없음)의 새 파일 12 · 자료 29 + `.gitkeep` · 공용 변경 둘. 기준은 plan-p09c(값 1~8 · 작업 · 위험 · 정할 것 판정 · 증명 표), 13절 C63, 정본 6.1(05 39 · 41 · 43줄) · 8절(07 42 · 50 · 56 · 57 · 62 · 63 · 72줄) · 15절 AC-8a · 8b · 8c · 8d · 8n · N2.
재현은 두 길로 했다. 스크래치패드의 tsx 스크립트로 워크트리 함수를 불렀고, 워크트리를 스크래치패드로 복사(node_modules 는 원본을 가리키는 연결)해 갈림을 망가뜨린 뒤 통합 시험 파일 하나씩을 돌렸다. 원본 워크트리 파일은 바꾸지 않았다(git status 같음). 다만 복사본 실행이 연결된 node_modules 의 Vitest 실행 기록 `node_modules/.vite/vitest/*/results.json`(실행 차례용, git 밖)을 12:24 에 덮어썼다. 실제 API 는 부르지 않았다.

## 1. 설계 준수

| plan 값 · 정본 | 판정 | 근거 |
|---|---|---|
| 값 1 structure 상수 둘 | ✅ | `AI_ATTEMPTS_MAX = 2` · `AI_WAIT_TIMEOUT_MULTIPLE = 2` 가 글자 그대로 'AI 출력 꼴' 절 끝에 있다(diff 4줄) |
| 값 2 cost-alert | ✅ | `preCallGate` 는 ≥ 이고 마이크로달러로 견준다(cost-alert.ts:38~49). `dueCostAlerts` 의 기준 키 넷은 `ai.daily_call_alert` · `ai.daily_cost_alert_usd` · `ai.monthly_cost_alert_usd:x<m>:<YYYY-MM>` · `ai.console_alert_ratio:<YYYY-MM>` 이고, once 는 그날 day · 그달 key 다(86~139). `talkSafetyOf` 는 `reachedToday === safetyAlertCount` 일 때만 알린다. `monthKeyOf` 는 Intl 달력 달이다(C63 (1)). 6.1(43줄) '확인 호출은 이 수와 합계에 넣지 않는다'는 P9a `dailyUsage` 가 맡는다 |
| 값 3 seed-lists | ✅ | server-only 다. (root, name) 마다 하나 모아 두고 실패는 모아 두지 않는다(seed-lists.ts:50~79). 오류 메시지는 목록 이름뿐이다. P4a 규격으로 검증하며, RegexSchema 가 `iu` 컴파일을 보므로 masker 의 `giu` 에서도 깨지지 않는다 |
| 값 4 흐름 1~10 | ✅ | 차례 · 행 규칙은 아래 '흐름 대조'. 둘째 시도의 전송 실패 처리는 M-1 |
| 값 5 공개 함수 넷 | ✅ | AiOutcome · AiFailureReason 이 plan 형과 같다(run.ts:95~114, FailureReason 일곱 + safety_cap · refusal · invalid · output_blocked · config). `evaluateSpeaking` 은 mode 를 떼고 고른다. `thinkoutTurn` 은 vocab 의 `band_level ≤ level` 로 allowedWords 를 채운다. 접근 확인은 없다(주석 index.ts:3) |
| 값 6 계약 명령 | ✅ | `src/server` 를 가져오지 않는다(가져오기 grep). `.env.local` 은 `process.loadEnvFile` 로만 읽고 키를 출력하지 않는다. 녹화 머리글은 셋이다(recordOf · 시험). 사례는 기본 15 + console-limit 이다. `models` 는 두 번 묻고, 확인 못 함은 note 로 남는다. 클라이언트는 P9a 값 7 과 같은 선택이다(ai-contract.ts:940~950). 생각 꺼내기 연속 턴은 M-5 |
| 값 7 관찰 명령 | ❌ | 요청 본문에 구조화 출력 형식이 없다 → I-1. 그 밖(예상 비용 · `--yes` · p50 · p95 · p99 · `recommendMaxTokens` · `chooseThinking` · 산출물 경로 · 'H4 첫 실호출' 표)은 값 7 과 같다 |
| 값 8 표본 | ✅ | 29개 모두 `{ case, purpose, title, source: "handmade", response, expect }` 꼴이다. 목적마다 정상 · 개수 · 범위 초과(고칠 곳 2 · 교정 · 채점표 0 · 5 · 2.6 · 3단계 문법 지적 · 'Correct' · 발표 질문 1개) · 거절 · max_tokens · 대체 모델이 있고, 오류 400 · 429 · 404 · 529 와 iteration model null 이 더해졌다 |
| 공용 변경 둘 | ✅ | package.json 두 줄 · next.config.ts 한 줄 + 주석이 plan 글자 그대로다 |
| 의존 · 경계 | ✅ | core-no-io(cost-alert 는 Intl 뿐) · sdk-only-in-ai(SDK 는 run.ts · scripts) · server-only(셋) · 시각 한 시계(run.ts 는 clock 만, sendAttempt 에 `{ now: clock }`) · SQL now() 없음 · 로그는 목적 · 오류 이름 · 요청 번호 · 모델 · 분류 · 단가 표시뿐(run.ts:133~136 · 204~240) |

### 흐름 대조(값 4 차례 · 행 규칙)

- **1 · 2** 설정 · 학습일 · 단가표 · 조합: 실패하면 `config` 이고 행이 없다(run.ts:267~288). `isConfigError` 가 SettingMissing · SettingInvalid · ComboError · ZodError · CallSettingError · SeedListError · AiConfigError 를 받는다.
- **3** 호출 앞 판정: 막히면 safety_cap 행 하나(요청 모델 · 토큰 0 · 비용 `0.000000` · 지연 null · error_code null)다(run.ts:318~326). 프로필이 없으면 nil uuid 로 센다(M-2).
- **4 · 5** 목록 · 규칙 · 클라이언트: 셋은 try 안이고, RangeError(턴 번호)는 밖으로 던진다(332~340). 가림은 profiles 세 칸과 vocab `lower(word) IN (…)` 한 질의다(151~189). 형식은 `zodOutputFormat` 의 type · schema 만 붙인다(346~350).
- **6** 기다림: deadline 은 `t0 + 2 × timeout`, 시도 타임아웃은 `min(timeout, 남은 시간)`, 둘째 시도는 남은 시간 ≥ 1초일 때만 나간다(353~374).
- **7** 전송 실패: 행 하나를 남긴다. same_error 는 `sameErrorCount ≥ down_after_failures` 일 때 `createAlertOnce(call_config_check, profileId null, ai.down_after_failures:<목적>, once day)` 를 부른다. 다시 보내기는 `retryConnection && REALTIME_PURPOSES && canRetry` 일 때만이다(377~406).
- **8** 응답: 비용을 iterations 로 센다. 경고는 대체 모델이 답했거나 단가가 없을 때만 낸다. 거절은 refusal 행을 남기고 `refusals: 1` 이며 다시 요청하지 않는다(408~435, C63 (2)).
- **9** 차례: stop_reason → answerTextOf → JSON.parse → prepareAnswer → wireSchema → validate → 엄격 통과도 normalize 다. 실패이고 남은 시도 · 시간이 있으면 validation_failed 행을 남기고 다시 요청한다. 없으면 기억한 다듬은 값으로 정규화하고, null 이면 validation_failed · invalid 다(437~471).
- **10** 출력 검사: `checkOutputFields(input.sentenceMaxWords)` → applyChecks 다. 엄격 통과이고 바뀐 칸이 없으면 success, 아니면 validation_failed 다. fatal 은 output_blocked 다. historyEntry 는 applyChecks 뒤 값으로 만든다(473~492).

## 2. 잘한 점

- 시도 하나 = 행 하나가 모든 갈래에서 지켜진다. 막힘 · 전송 실패 · 거절 · 엄격 실패 · 출력 검사 행의 상태가 그 시도에서 본 것이다. 흐름 시험이 행 수와 상태 차례를 직접 단언한다(위험 4).
- 갈림이 시험에 묶여 있다. 대화형만 다시 보내기를 지운 복사본에서 '8절 흐름: 연결 실패는 …' 시험이 `expected length 1 but got 2` 로 깨졌다(구현 보고의 망가뜨림 표 1줄 재현).
- AC-8d 시험이 시험 DB 의 `ai.timeout_seconds.realtime` 행을 0.3초로 바꿔 '설정값을 읽는 것'을 보이고, 안전 상한 시험은 프로필 범위 설정 행(3회)으로 프로필 덮어쓰기까지 지난다.
- 계약 명령은 순수 함수와 직접 실행을 가르고, dry-run 이 클라이언트 · 파일 쓰기를 부르면 던지는 가짜로 시험한다. 녹화 파일에 키 · 인증 · 조직 머리글이 들지 않음을 단언한다.
- 지난 검토 메모(P9a 1~4 · P9b 1~4)가 모두 코드 자리와 시험으로 반영됐다(반영 표 대조, 7절).

## 3. 지적

### Important

**I-1. 관찰 명령의 요청에 구조화 출력 형식(`output_config.format`)이 없다.**
- 무엇이: scripts/ai-observe.ts:195~236 의 `groupRequest` 는 `built.body` 를 그대로 보낸다. 계약 명령은 `withFormat`(ai-contract.ts:239)으로 형식을 붙이고, 앱 흐름은 run.ts:346~350 에서 붙인다. 재현:
  ```
  observe writing_check.adaptive {"effort":"low"} …
  observe writing_check.off      {"effort":"low"} …
  contract [ 'effort', 'format' ]
  ```
- 왜: 관찰표는 `ai.thinking`(정할 것 사)과 `ai.max_tokens`(C21 '출력 p99 의 두 배')를 고르는 근거이고, 결과는 13절 한 줄 → P6 설정값이 된다. 형식이 없으면 실제 호출과 다른 요청을 잰다. 모델이 JSON 문법 밖 글(설명 · 코드 울타리)을 낼 수 있어 첫 시도 엄격 통과율 · 출력 토큰 · 지연이 운영과 다르다. 위험 11 의 '생각 끔 + 구조화 출력' 조합도 관찰의 off 묶음에서 시험되지 않는다. 한 번 도는 데 약 3.24달러(예상 비용 출력)이고 H4 뒤 한 번이 목적이라, 틀린 자료로 설정값이 정해진다. 계약 시험은 `groupRequest` 의 본문을 보지 않아 놓쳤다.
- 어떻게:
  1. `withFormat` 을 내보내 `groupRequest` 가 `withFormat(built.body, built.wireSchema)` 로 보내게 한다(계약 명령과 같은 길).
  2. 계약 시험의 관찰표 묶음에 '모든 묶음의 요청에 형식이 있고 제목이 규격 제목'을 단언한다.
  3. 같은 김에 200 이 아닌 응답(ai-observe.ts:457)을 묶음마다 세어 요약 · 관찰표에 '받지 않음(400 n회)'으로 남긴다. 위험 11 의 '400 이면 그 묶음을 받지 않음으로 적고 adaptive' 가 지금은 줄 출력에만 남고 관찰표에서 묶음이 조용히 빠진다.

### Minor

**M-1. 둘째 시도가 전송 실패면 첫 응답의 정규화 값을 버린다(다르게 한 것 5).** run.ts:377~406 은 둘째 시도의 타임아웃 · 연결 · 서버 실패를 그대로 돌려준다. ai-errors.test.ts:269~292 가 이것을 굳힌다: 첫 응답 `writing_check.over`(정규화하면 쓸 수 있음) 뒤 타임아웃 → `timeout`. plan 값 4 의 7(전송 실패 → `{ ok: false, reason }`) 글자대로라 어긋남은 아니다. 다만 6.1(39줄) '다시 실패하면 개수 초과분은 앞에서부터 잘라 쓰고'의 취지와 아이 쪽 결과(쓰기 확인이면 8절 56줄 '점수 없는 세션')로는 기억한 `lastPrepared` 를 정규화해 쓰는 편이 낫다. 정본이 이 경우를 정하지 않으므로 컨트롤러가 정한다. 바꾸면 거절은 지금처럼 refusal 로 두고(C63 (2)), 전송 실패 갈래에서만 `lastPrepared` 가 있으면 9 의 '남은 것이 없으면' 길로 보낸다. 시험 기대값은 `ok: true · normalized: true` 와 행 `validation_failed · timeout` 이다.

**M-2. 프로필 없는 호출의 nil uuid 는 형만 넓히면 없어진다(다르게 한 것 2 · 알릴 것 2).** run.ts:79 · 319 가 `00000000-…` 를 넘긴다. store.ts:117~119 의 `profileId: string` 을 `string | null` 로만 바꾸면 SQL 은 그대로 맞는다. `filter (where profile_id = $1 …)` 에 NULL 이 들어가면 참이 되지 않아 호출 수가 0 이고, 비용 합은 그대로다. 복사본에서 store 형 한 줄과 run.ts 인자(`ctx.profileId`)만 바꿔 tsc 오류 0 과 흐름 시험 세 파일 27 통과를 확인했다. 판정은 P9c fix 에 넣는 것이다. 같은 P9 워크트리 · 같은 브랜치 줄기이고 공용 파일이 아니며, 설계 변경 없이 마법 값을 없앤다. store 주석에 'null 이면 호출 수 0(확인 호출 · 프로필 없는 호출)'을 단다. `NO_PROFILE_ID` 를 지운다.

**M-3. AC-8b '확인 호출 행' 몫이 아무것도 증명하지 않는다.** safety-cap.test.ts:238~258 은 확인 호출 행을 `profileId: null` · 비용 0 으로 넣는다. 그래서 `dailyUsage` 의 `ne(purpose, "probe")` 를 지운 복사본에서도 안전 상한 시험 다섯이 모두 통과했다. 코드는 맞다. P9a 의 ai-store.test.ts 는 같은 망가뜨림에서 '6.1 하루 사용량: 확인 호출 밖 …' 하나가 깨진다. 6.1(43줄)은 확인 호출을 '이 수와 합계에 넣지 않는다'이니, 확인 호출 행에 `ai.safety_daily_cost_usd` 만큼의 비용을 실어 '그래도 나간다'를 보이면 시험 이름대로 증명된다.

**M-4. '설정 문제' 시험이 '설정이 없거나'를 지나지 않는다.** ai-errors.test.ts:296~353 은 조합 오류 · 꼴이 틀린 effort · 키 없음 셋만 본다. SettingMissingError 갈래(설정 행 없음 — P6 전 개발 DB 에서 가장 먼저 만날 길)는 시험이 없다. 설정 행 하나를 지웠다 되돌리는 사례를 더한다. 같은 시험이 설정을 바꾼 뒤 본문 안에서 되돌리므로, 중간 단언이 실패하면 다음 시험에 바뀐 설정이 남는다. 되돌리기를 afterEach 나 try/finally 로 옮긴다.

**M-5. 계약 명령의 생각 꺼내기는 일찍 끝나도 다음 턴을 보낸다.** ai-contract.ts:870 은 마지막 턴 전이면 `done` 이어도 ok 로 보고 기록을 이어 다음 턴을 보낸다. 앱은 done 에서 멈추므로(6.2 '종료 여부') 끝난 대화 뒤 턴은 운영에 없는 요청이고 호출 하나를 더 쓴다. `done` 이면 그 턴을 마지막으로 보고 멈춘다(엄격 · 정규화 통과면 ok).

## 4. 다르게 한 것 1~9 판정

| 번호 | 판정 | 근거 |
|---|---|---|
| 1 결과 형을 run.ts 에 두고 index 가 다시 내보냄 | 받음 | 형 순환 회피. P11 은 `@/server/ai` 하나만 가져온다 |
| 2 프로필 없는 호출 nil uuid | 고침 권함(M-2) | 동작은 맞지만 형 한 줄로 없어진다(재현) |
| 3 ctx.level ≠ input.level → RangeError | 받음 | 호출부 결함은 서버 오류(review-p09b-2 P9c 3 과 같은 길), 행 없음 |
| 4 thinkoutTurn 이 allowedWords 를 vocab 에서 채움 | 받음 | 정할 것 마의 범위를 서버가 정한다. 넘긴 값을 버리므로 형의 선택 칸을 빼면 P11 이 덜 헷갈린다(선택) |
| 5 둘째 시도 전송 실패면 그 실패 | 받음(plan 글자대로) · 컨트롤러 판단 권함(M-1) | 값 4 의 7 글자대로, 6.1 취지로는 첫 값을 쓰는 편이 낫다 |
| 6 녹화 파일 이름(turnN · models 기록 없음) | 받음 | 모델 정보는 응답 본문 계약이 아니라 대조 결과다 |
| 7 두 명령이 쓰는 함수 더 내보냄 | 받음 | I-1 고칠 때 `withFormat` 도 같은 길로 내보낸다 |
| 8 dueCostAlerts 꼴(kind cost 셋 · scope · value) | 받음 | 값 2 의 기준 키 꼴 그대로이고, scope 는 1-나가 profileId 를 고를 자리다(P9a createAlertOnce 와 맞음) |
| 9 관찰 생각 꺼내기는 첫 턴 변형 셋 | 받음 | 값 7 '생각 꺼내기(첫 턴)' |

## 5. 알릴 것 1~5 판정

1. **실제 호출 길 미실행** — 받음. `withResponse()` · `beta.models.retrieve` 응답 꼴은 H4 첫 실행이 확인한다. I-1 을 고친 뒤에야 관찰 실행이 뜻이 있다.
2. **nil uuid** — M-2 로 고침 권함.
3. **MIN_RETRY_MS 1초** — 받음. 기본값(10 · 60초)에서는 늘 둘째 시도가 나가고, 1초는 둘째 시도가 의미 있을 최소 시간이다. 타임아웃 설정을 1초 아래로 내리면 다시 요청이 사라진다는 것을 12절 ai.timeout_seconds.* 의 바꾸는 사람(2차 설정 화면)에게 넘긴다(1-나 메모).
4. **흐름 시험의 경고 줄** — 받음. 내용이 요청 번호 · 목적 · 모델 · 홉 분류 · 단가 표시뿐임을 run.ts:228~239 에서 확인했다.
5. **언어 · 말투 어긋남은 거친 셈** — 받음. 1-가 관찰의 목적(생각 단계 · 최대 토큰 고르기)에는 충분하고, 메타 문장 목록은 1-나에서 바꾼다.

## 6. 증명 표 행마다 시험

증명 표의 이름 40개가 시험 파일에 글자 그대로 하나씩 있다(기계 대조, 빠진 이름 0).

| 행 | 수 | 있음 | 비고 |
|---|---|---|---|
| AC-8a · AC-N2 | 6 | 모두(cost-alert.test.ts) | 값은 TEST_SETTINGS. 56달러 단언은 정본 값 대조 |
| AC-8b(서버 몫) | 5 | 모두(safety-cap.test.ts) | '확인 호출 행' 몫은 빈 단언(M-3) |
| AC-8c | 3 | 모두(ai-calls.test.ts) | 본문 열 없음 · iterations 합 단언 |
| AC-8d(서버 몫) | 1 | 있음(ai-errors.test.ts:114) | 시험 DB 설정 행 0.3초 |
| AC-8n(P9 몫) | 2 | 모두 | 넷째에도 하나 · aiStatus 빈 행 |
| 8절 실패 흐름 | 5 | 모두 | 두 시도 기다림 2.4초 상한 안 |
| 6.1 · 6.4 흐름 | 7 | 모두 | |
| 9절 AI 계약 | 11 | 모두(contract) + todo 6 | 관찰표 묶음은 형식을 보지 않음(I-1) |

표 밖 다섯은 가치가 있다. '시드 목록 missing · invalid'는 값 3 계약이고, '엄격 통과도 정규화'와 '턴 번호 어긋남 서버 오류'는 review-p09b 메모 P9c 1 · 3 이다. '설정 문제'는 값 4 의 1 · 5 이고(M-4 보강), 'iteration model null' 은 review-p09a P9c 3 이다.

## 7. 열린 장부 판정(`ledger-open.md` 의 P9 행)

| 행 | 판정 | 근거 |
|---|---|---|
| between_tools(생각 끔) + 구조화 출력 400 인지 | 아직 열림 | dry-run 에 `talk_config.haiku`(disabled) · `.sonnet`(between_tools + fallbacks) 요청 꼴이 있으나 증명은 H4 뒤 실호출이다. I-1 을 고치면 관찰의 off 묶음도 같은 물음을 잰다 |
| P9c 에 넘길 메모 일곱(review-p09a 8절) | P9c 몫 닫힘 · 둘은 옮김 | 1 시계 꼴 run.ts:371, 2 단가 0 경고 run.ts:237, 3 거절 홉 표본 · 계약 시험 · warnAnswer hops, 4 ComboError · ZodError → config(isConfigError) — 닫힘. 5 회화 턴 첫 문장 전 타임아웃 재시도는 1-나 스트리밍 길(run.ts 머리 주석)로, 6 e2e 501 은 P11 행으로 옮긴다. 7 은 'P5a priceOf → cost.ts' 행 그대로 |
| opus-4-8 `thinkingDefault` 'none' | 아직 열림 | P6 몫(첫 개발용 적재 전). P9c 는 seed 파일을 만들지 않는다 |
| P9c: 흐름 차례 · SettingValues 이름 겹침 · P9c 3 · 4 | 닫힘 | 차례 run.ts:437~492, 별칭 run.ts:14, RangeError 행 없음 시험 ai-calls.test.ts:529, createMasker · checkOutputFields 재사용 run.ts:344 · 474 |
| P9: dailyUsage 넓히기 · MIN_RETRY_MS | dailyUsage 는 아직 열림(M-2 fix 뒤 닫힘) · MIN_RETRY_MS 는 닫힘 | 알릴 것 3 받음 |

## 8. 넘길 메모

- **P11 1.** `AiOutcome` 실패 갈래마다 화면 길을 정한다. `config`(P6 목록 전 개발 · 프리뷰에서 늘 남)는 '호출 하나의 실패'와 같은 화면이다. `safety_cap` 은 C50 (2) 안내다. `output_blocked` 는 생각 꺼내기 '이번에는 바로 써 볼까요'다. 공개 함수가 던지는 RangeError(턴 번호 · 단계 어긋남)는 서버 액션이 AI 실패로 삼키지 말고 서버 오류로 남긴다.
- **P11 2.** 첨삭의 `refusals` 와 실패는 초고마다 attempts 에 더한다(위험 10). 둘째 세션에서 다시 부를 때 `ctx.sessionId` 는 첫 세션 값이다(index.ts:53~56).
- **P11 3.** `"/*"` 빌드 추적은 지금 경로 셋에서만 확인됐다. 서버 액션 경로가 생긴 첫 프리뷰에서 목록 읽기를 한 번 본다(plan 위험 3). 안 되면 `"/**"`.
- **1-나 1.** `dueCostAlerts` 결과를 `createAlertOnce` 로 옮길 때 `scope: "profile"` 은 그 profileId, `household` 는 null, `once` 는 그대로다. 콘솔 근접 · 월 배수는 `once: "key"` 라 기준 키의 달이 그달 한 번을 보장한다.
- **1-나 2.** `preCallGate` 셋째 인자(ai_status)를 더할 때, 막힘 행 safety_cap 과 쉬는 중 막힘을 다른 상태로 남길지 정한다(지금 결과 상태 목록에는 '안전 상한'만 있다).
- **1-나 3.** `MIN_RETRY_MS` 1초 때문에 `ai.timeout_seconds.*` 를 1초 아래로 내리면 다시 요청이 없어진다. 2차 설정 화면의 범위 검사에 하한을 둔다.
- **P6.** `seed/lists/forbidden.json` 이 없거나 규격에 어긋나면 모든 AI 활동이 `config` 로 멈춘다(위험 2, 의도한 동작). 첫 개발용 적재 전에 목록 넷을 P4a 규격 · `iu` 컴파일로 통과시킨다.
