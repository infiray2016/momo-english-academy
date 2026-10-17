# 재검토: P9c AI 흐름 · 계약 fix 1(+ 보충) — Changes requested(C 0 · I 1 · M 2, 모두 새 지적)(rev-p09b · Opus · xhigh, 2026-10-17 14:0x)

범위: `review-p09c.md` 의 I-1 · M-1~M-5 와 fix 1 · 보충이 바꾼 줄. 워크트리 `.claude/worktrees/p09`(커밋 없음)를 직접 읽었다. 재현은 두 길로 했다. 스크래치패드의 tsx 스크립트로 워크트리 함수를 불렀고, 워크트리 복사본(node_modules 연결, `--cache=false`)에서 코드를 망가뜨려 통합 시험을 돌렸다. 원본 파일은 바꾸지 않았다(git status 같음). 실제 API 는 부르지 않았다.

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 관찰 요청 형식 | ADDRESSED | `groupRequest` 가 `withFormat(built.body, built.wireSchema)` 로 보낸다(ai-observe.ts:224~228, withFormat 은 ai-contract.ts:240 에서 내보냄 — 계약 명령과 같은 함수). 재현: 묶음 열하나 모두 `json_schema` 이고 제목이 규격 제목이며, off 묶음은 `between_tools` 다. 계약 시험 'fix 1 › 관찰표: 모든 묶음의 요청에 …'(ai-schemas.test.ts:683)가 묶음마다 형식 · 제목 · off 의 생각 끔을 단언한다. 200 이 아닌 응답은 묶음 · 상태별로 세어(ai-observe.ts:496~500) 요약 `rejected` · 관찰표 '받지 않음' 열에 남는다. 응답 0 인 묶음도 n 0 으로 남고 나눗셈은 `max(1, n)` 이다. 위험 11 문장은 관찰표 끝에 있다. 고르기 규칙은 N-2 |
| M-1 둘째 시도 실패(C69) | ADDRESSED | run.ts:428~434: 둘째 시도가 응답 전 어떤 실패로 끝나도 `lastPrepared` 가 있으면 느슨한 규격으로 정규화해 `finish(value, false)` 결과를 돌려준다. 행은 첫 `validation_failed` · 둘째 그 실패 갈래 둘이다(실패 행은 위 377~384 에서 이미 남김). 같은 오류 알림 세기도 그대로 돈다. 거절은 응답 갈래(445~449)라 refusal 그대로다. 첫 시도부터 응답이 없으면 `lastPrepared` 가 없어 실패다. 정규화가 null 이면 그 실패 갈래를 돌려준다(434, 시험 없음 — 단순한 갈림이라 지적하지 않는다). 시험: 타임아웃(ai-errors.test.ts '두 시도의 기다림' — `ok · normalized` · 고칠 곳 1 · 행 `validation_failed · timeout`), 콘솔 한도 400 · 같은 오류 404(행 `[validation_failed, null]` · `[limit, console_limit:400]` / `[error, same_error:404]`), 첫 시도부터 연결 실패 두 번(`connection` · 행 둘) |
| M-2 nil uuid | ADDRESSED | store.ts:119~120 형 한 줄 + 주석(SQL 그대로 — `= NULL` 은 참이 되지 않아 호출 수 0, 비용 합 유지). run.ts:317 은 `ctx.profileId` 를 그대로 넘기고 `NO_PROFILE_ID` 는 0건이다. 프로필 없는 호출은 ai-calls · ai-errors 의 `profileId: null` 시험들이 이 SQL 로 돈다. 0 을 직접 단언하는 시험은 없다(N-3) |
| M-3 확인 호출 몫 | ADDRESSED | 확인 호출 행에 `ai.safety_daily_cost_usd` 만큼의 비용을 실은 행을 더했다(safety-cap.test.ts:241~247). 복사본에서 `ne(aiCalls.purpose, "probe")` 를 지우니 이 시험이 깨졌다(`× AC-8b 확인 호출 행과 막힌 행은 …`, 1 failed · 4 passed) |
| M-4 설정 없음 · 되돌리기 | ADDRESSED(새 문제 N-1 을 만듦) | 설정 없음 사례가 있고(ai-errors.test.ts:353~363), `touched` 와 afterEach(73~86)가 바꾸거나 지운 키를 TEST_SETTINGS 값으로 다시 넣어 중간 실패가 다음 시험에 남지 않는다. 다만 지운 설정을 그 시험 안에서 되돌리지 않아 뒤 사례 셋이 빈 단언이 됐다 → N-1 |
| M-5 생각 꺼내기 done | ADDRESSED | ai-contract.ts:871 · 885: done 이면 ok 로 보고 멈춘다. 녹화는 보낸 턴마다 `save` 라 보낸 턴까지다. 새 시험(ai-schemas.test.ts:725)이 `runContract` 의 실제 실행 길을 P9a 가짜 Anthropic 으로 돌려 요청 1 · 녹화 `thinkout.l6.turn1.json` 하나 · 종료 0 · '어긋남 0' 을 본다. `withResponse()` · 녹화 · 종료 코드를 처음 덮는 시험이라 지난 보고의 '알릴 것 1' 몫을 줄인다 |

## 2. 새 지적(fix 1 이 바꾼 줄)

### Important

**N-1. '설정 문제' 시험이 지운 설정을 되돌리지 않아 뒤 사례 셋(조합 오류 · 꼴이 틀린 effort · 키 없음)이 빈 단언이 됐다.**
- 무엇이: ai-errors.test.ts:353 이 `ai.max_tokens.writing_check` 를 지운 뒤 같은 시험 안에서 다시 넣지 않는다. 그래서 364~ 의 세 사례도 모두 첫 단계의 SettingMissingError 로 `config` 가 된다.
- 재현: 복사본에서 run.ts `isConfigError` 의 `ComboError` 와 `AiConfigError` 줄을 지웠다. '설정 문제' 시험이 통과했고 통합 시험 전부도 통과했다.
  ```
  Tests  1 passed | 10 skipped (11)   (-t "설정 문제")
  Tests  59 passed (59)               (통합 전부)
  ```
  fix 1 전에는 이 시험이 조합 오류 · 키 없음 갈래를 실제로 지났다(설정 행이 다 있었다). fix 보고의 망가뜨림 확인은 SettingMissingError 한 갈래만 지워 봐서 놓쳤다.
- 왜: plan 값 4 의 1 · 5(조합 오류 · 키 없음 → config, 행 없음, AI 를 부르지 않음)를 증명하는 시험이 이것 하나다. 지금은 두 갈래를 지워도 아무 시험도 깨지지 않는다.
- 어떻게: 설정 없음 사례 바로 뒤에 지운 키를 다시 넣거나(`seedSettings` 로 TEST_SETTINGS 값), 설정 없음 사례를 시험 맨 끝으로 옮긴다(afterEach 는 그대로). 고친 뒤 `isConfigError` 에서 SettingMissing · ComboError · SettingInvalid · AiConfigError 를 하나씩 지운 판에서 각각 깨지는지 본다.

### Minor

**N-2. 관찰 생각 단계 고르기가 일시적 오류 하나에도 그 묶음을 '받지 않음'으로 버린다.** `chooseThinking`(ai-observe.ts:338~343)은 `rejected` 에 상태가 하나라도 있으면 그 묶음을 고르지 않는다. 200 이 아닌 응답이면 529 과부하 · 500 · 한도 아닌 429 도 든다. 위험 11 이 말하는 '받지 않음'은 조합을 받지 않는 400 이다. 스무 번 가운데 529 한 번이 adaptive 묶음에 나오면 지연 · 위반과 무관하게 off 를 권한다. 고르기에서 버리는 것은 400(invalid_request)으로 좁히고, 5xx · 429 는 '받지 않음' 열에 횟수만 남긴다. 관찰표 끝 문장 '받지 않은 묶음은 adaptive 를 고른다'도 코드(adaptive 가 받지 않으면 off)와 맞게 '받지 않은 쪽은 고르지 않는다'로 쓴다.

**N-3. 프로필 없는 하루 사용량이 0 이라는 계약을 직접 단언하는 시험이 없다.** store.ts:119 주석은 'null 이면 호출 수 0, 비용 합은 그대로'를 약속하지만, ai-store.test.ts 의 `dailyUsage` 시험은 프로필 id 만 넘긴다(327~333). 같은 시험에 `profileId: null` 한 줄(호출 수 0 · 집 비용 합이 프로필 있을 때와 같음)을 더하면 SQL 을 `IS NOT DISTINCT FROM` 꼴로 바꾸는 실수를 막는다. 컨트롤러가 직접 더해도 되는 크기다.

## 3. 다르게 한 것 판정

- **보충 전 '장애 갈래(countsTowardDown)로 좁힘'** — 보충으로 해소됐다. run.ts:432 조건은 `lastPrepared !== undefined` 하나다. 콘솔 한도 400 · 같은 오류 404 사례가 C69 '둘째 시도의 실패 종류와 무관하게'를 시험한다.
- **M-5 시험이 계약 명령 실제 실행 길을 가짜로 덮음** — 받음. 생각 꺼내기 몫에 한정되지만, `sendCase` 의 `withResponse()` 와 녹화 쓰기가 처음 시험에 들었다.

## 4. 범위 밖 관찰(지적 수에 넣지 않음)

- **C69 원문의 괄호.** 13절 C69 는 '응답 전 실패(타임아웃 · 연결 · 서버)'라 적고 이어 '실패 종류와 무관하게'라 적는다. 구현은 컨트롤러 지시대로 한도 · 계정 · 같은 오류까지 넓다. 뒤에 읽는 사람이 괄호를 범위로 읽지 않게 13절 괄호를 '(타임아웃 · 연결 · 서버 · 한도 · 계정 · 같은 오류 등)'으로 고치는 것을 컨트롤러 판단에 둔다.
- **H4 실행 중 연결 오류가 명령을 멈춘다.** `sendCase`(ai-contract.ts:702~735, fix 1 이 바꾸지 않음)는 상태 없는 오류(타임아웃 · 연결)를 다시 던진다. 관찰 명령은 산출물을 끝에서 한 번에 쓴다(ai-observe.ts:552~566). 그래서 약 3.24달러 실행의 중간에 타임아웃 하나가 나면 그때까지의 줄을 잃는다. H4 전에 `sendCase` 가 상태 없는 오류를 `status: 0` 같은 실패로 돌려주거나, 줄을 실행 중에 이어 쓰기를 권한다.

## 5. 열린 장부 판정

| 행 | 판정 | 근거 |
|---|---|---|
| P9: `dailyUsage(profileId: string)` → `string \| null` · MIN_RETRY_MS | 닫힘 | M-2 ADDRESSED(store.ts:119~120 · run.ts:317). MIN_RETRY_MS 는 지난 검토에서 받음. 직접 단언 시험은 N-3(Minor) |
| between_tools(생각 끔) + 구조화 출력 400 인지 | 아직 열림 | H4 뒤 `talk_config.*` 계약 사례가 증명한다. 이제 관찰의 off 묶음도 형식을 붙여 같은 물음을 잰다(I-1 ADDRESSED) |

## 6. 판정

Changes requested. N-1 을 고치고 갈래마다 망가뜨림 확인을 보이면 Approved 로 본다. N-2 · N-3 은 컨트롤러가 직접 고쳐도 되는 크기다. 이번이 P9c 의 fix 라운드 1 → 2 다.
