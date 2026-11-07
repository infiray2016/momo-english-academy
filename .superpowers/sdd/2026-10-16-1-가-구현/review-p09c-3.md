# 재검토: P9c AI 흐름 · 계약 fix 2 — Approved(C 0 · I 0 · M 1, 새 지적) · 범위 밖 관찰 1(H4 전 고칠 것)(rev-p09b · Opus · xhigh, 2026-10-17 15:0x)

범위: `review-p09c-2.md` 의 N-1 · N-2 · N-3 과 범위 밖 관찰 2(덤), fix 2 가 바꾼 줄. 워크트리 `.claude/worktrees/p09`(커밋 없음)를 직접 읽었다. 망가뜨림은 워크트리 복사본(node_modules 연결, `--cache=false`)에서 했고 끝나고 지웠다. 원본은 바꾸지 않았다(git status 21줄 = fix 2 보고의 20줄 + 그 보고 파일). 실제 API 는 부르지 않았다. P9c fix 라운드 2(상한 3)다.

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| N-1 '설정 문제' 빈 단언 | ADDRESSED | 설정 없음 사례 바로 뒤에 지운 `ai.max_tokens.writing_check` 를 `seedSettings` 로 되돌린다(ai-errors.test.ts:408 근처). 사례마다 서버 오류 기록 한 줄 `[ai] writing_check: 설정 문제(<오류 이름>)` 를 단언한다(381~395, 감시는 try/finally 로 되돌림). 복사본에서 `isConfigError` 의 네 갈래를 하나씩 지운 판을 재현했다 — SettingMissingError · ComboError · SettingInvalidError · AiConfigError 모두 `1 failed`. 로그 단언은 목적 · 오류 이름뿐이고 값 · 아이 글이 없다 |
| N-2 일시 오류로 묶음을 버림 | ADDRESSED(새 Minor N2-1 을 남김) | 묶음을 버리는 것은 `REJECTED_STATUS = 400` 뿐이다(ai-observe.ts:285 · 332~337). 그 밖의 200 아닌 응답과 상태 0 은 `transientErrors` 로 따로 세고(관찰표 '일시 오류' 열, 389~399), 줄이 아니어서 지연 · 위반 통계에서도 빠진다. `chooseThinking` 은 `rejected` 만 본다(372~373). 관찰표 끝 문장도 고쳤다. 시험 ai-schemas.test.ts:763 은 529 · 429 · 0 이 n 2 통계 밖이고, 고르기가 위반 수로 되고, '받지 않음(' 이 없음을 본다. 400 밖 4xx 를 같은 열에 넣은 선택은 N2-1 |
| N-3 dailyUsage(null) 단언 | ADDRESSED | ai-store.test.ts:320 이 프로필이 비어 있는 실시간 호출 행을 더하고, 334~337 이 `{ profileCalls: 0, householdCostMicros: 3500 }` 를 단언한다. 복사본에서 SQL 을 `is not distinct from` 으로 바꾸니 이 시험이 `profileCalls: 1` 로 깨졌다 |
| 덤 sendCase 상태 없는 오류 | ADDRESSED | `sendCase`(ai-contract.ts:736 근처)가 상태 없는 APIError 를 `status: 0` · 본문 `{ type: "error", error: { type: <오류 클래스 이름> } }` 로 돌려준다. 메시지 · 요청 내용은 없다. 계약 명령은 그 사례를 어긋남으로 적고 다음 사례로 간다(시험 :852 — 요청 2 · 줄 둘이 ` · 0 · ` · '어긋남 2' · 'fetch failed' 없음 · 종료 1). 관찰 명령은 실행부를 `runObserve(args, io)` 로 꺼냈다. 시험 :793 이 그 실제 길을 가짜 Anthropic 으로 돌린다. 첫 요청이 끊겨도 묶음마다 하나씩 다 보내고(요청 11), 산출물 둘을 쓰며(jsonl 10줄), 관찰표에 '일시 오류 1회'가 있고, 줄 출력에 오류 메시지가 없다 |

## 2. 다르게 한 것 판정

- **'고치기 전엔 둘(ComboError · AiConfigError)만 안 깨졌다'** — 구현자 설명이 맞다. 지난 검토(review-p09c-2 N-1)의 '뒤 사례 셋'은 지나친 말이었다. 복사본에서 되돌림을 빼고 사례마다 남는 오류 이름을 찍었다:
  ```
  want=SettingMissingError  got=SettingMissingError
  want=ComboError           got=SettingMissingError
  want=SettingInvalidError  got=SettingInvalidError
  want=AiConfigError        got=SettingMissingError
  ```
  설정 읽기가 꼴이 틀린 `ai.effort.writing_check` 를 지운 `ai.max_tokens.writing_check` 보다 먼저 보아 SettingInvalidError 를 낸다. 그래서 고치기 전에도 effort 사례는 그 갈래를 실제로 지났고, 지금은 로그 단언으로 그것이 증명된다(그 갈래를 지운 판에서 깨짐). 지난 검토의 망가뜨림(ComboError · AiConfigError 를 지움)은 이 둘에 대해서는 맞았다.
- **'일시 오류'에 400 밖 4xx(401 · 404 등)를 넣음** — 고침 권함(N2-1).
- **`runObserve` 꺼내기** — 받음. 명령 동작이 그대로다. 예상 비용 줄을 먼저 출력하고, `--yes` 가 없으면 클라이언트를 만들기 전에 종료 0 이다. 키가 없으면 `createClient` 의 ScriptInputError 를 main 이 같은 문구 `ai-observe: ANTHROPIC_API_KEY 가 없습니다(.env.local)` 와 종료 2 로 바꾼다. 산출물 둘의 경로 · 파일마다 mkdir 도 같다. 시험이 실제 실행 길을 덮게 된 것이 이득이다.
- **N-1 갈래 단언을 서버 오류 기록으로 함** — 받음. 결과 꼴을 바꾸지 않고, 기록 내용이 목적 · 오류 이름뿐임을 같이 증명한다.

## 3. 새 지적(fix 2 가 바꾼 줄)

**N2-1(Minor). 관찰 명령이 200 아닌 응답을 상태 숫자만으로 가른다. 콘솔 한도 400 이 '받지 않음'이 되고, 401 · 404 · 콘솔 한도 429 가 '일시 오류'가 된다.**
- 무엇이: ai-observe.ts:285 · 332~337 은 `status === 400` 이면 받지 않음, 그 밖이면 일시 오류다. 머리 주석(4~5줄)은 '5xx · 한도 아닌 429 · 응답 없음'만 일시 오류라 적어 코드와 다르다.
- 왜: H4 관찰은 한도를 건 개발용 워크스페이스에서 돈다([사람] 1). 실행 중 한도에 닿으면 그 뒤 묶음이 모두 400 콘솔 한도인데, 관찰표가 '받지 않음(400 n회)'로 적어 위험 11(생각 끔 + 구조화 출력 거부)의 증거처럼 보인다. 고르기도 먼저 돈 묶음 쪽으로 기운다. 401(키) · 404(모델 이름)는 실행 전체 또는 그 모델의 설정 문제인데 '일시 오류 20회'로 보여 다시 돌리면 될 일로 읽힌다.
- 어떻게: runObserve 에서 상태가 0 이 아니면 계약 명령과 같이 `classifyFailure(httpFailureOf(status, body, headers.has("retry-after")))` 로 갈래를 보고 셋으로 센다.
  1. `same_error` 이고 400 → 받지 않음(위험 11).
  2. `console_limit` · `account` · `same_error` 404 · 413 → '설정 · 한도 오류' 열(새 칸). 고르기에는 쓰지 않는다. 실행 전체가 막힌 것이니 첫 `console_limit` · `account` 에서 남은 묶음을 건너뛰고 그때까지의 산출물을 쓰는 편이 낫다.
  3. `server` · `rate_limit` · 상태 0 → 일시 오류.
  
  머리 주석과 관찰표 끝 문장을 이 셋에 맞춘다. 시험 :763 에 콘솔 한도 400(`consoleLimitBody("workspace")`)이 받지 않음이 아닌 칸으로 가는 사례 하나를 더한다. 컨트롤러가 직접 고칠 크기다.

## 4. 범위 밖 관찰(지적 수에 넣지 않음 — H4 전에 고칠 것)

**녹화 표본이 하나라도 생기면 계약 시험이 TypeError 로 깨진다.** 이 코드는 P9c 첫 판부터 있었고, 첫 검토에서 내가 놓쳤다.
- 무엇이: `recordOf`(ai-contract.ts)가 쓰는 녹화 파일에는 `expect` 칸이 없다. 그런데 ai-schemas.test.ts:280 은 `[...handmade, ...recorded].filter((s) => s.expect.classify === "console_limit")` 로 모든 표본의 `expect` 를 읽는다.
- 재현: 복사본에서 `recordOf` 로 `writing_check.l4.json` 녹화 하나를 만들고 계약 시험을 돌렸다.
  ```
  × 9절 계약: 콘솔 한도 표본(손 · H12 녹화)을 8절 분류가 콘솔 한도로 본다
  TypeError: Cannot read properties of undefined (reading 'classify')
  ```
- 왜: plan 작업 8 의 4('녹화 표본 → `pnpm test` → H14 커밋')가 H4 첫 실행 뒤 곧바로 막힌다. 같은 시험이 노리는 H12 녹화(`console-limit`)도 `expect` 가 없어 콘솔 한도로 세어지지 않는다.
- 어떻게: 녹화 표본은 `s.expect?.classify` 로 읽고, 콘솔 한도 녹화는 `s.case === "console-limit"` 으로 골라 분류를 단언한다. 녹화 파일에 `expect` 를 적지 않는 것은 그대로 둔다(기대값은 사례 표에 있다).
- 관찰 하나 더: fix 2 보고는 'src/ 는 바뀐 것이 없다'인데, `src/server/ai/run.ts` · `store.ts` 의 수정 시각이 14:38 이다. 내용은 fix 1 과 같았다. store.ts 는 git blob `2e5e6b1` 이 같고, run.ts 는 `isConfigError` 일곱 갈래 · `lastPrepared !== undefined` 조건 · NO_PROFILE_ID 0건이 그대로다. 망가뜨림을 원본에서 하고 되돌린 것으로 보인다. 다음부터는 복사본에서 한다.

## 5. 열린 장부

- '생각 끔 + 구조화 출력 400' 행 — H4 뒤까지 아직 열림(그대로). N2-1 을 고치면 콘솔 한도 400 이 이 행의 증거로 잘못 읽히지 않는다.
- 범위 밖 관찰(녹화 표본 TypeError)은 H4 전에 닫을 항목으로 장부 '구현하며 확인할 것'에 올리기를 권한다.

## 6. 판정

Approved. N-1 · N-2 · N-3 · 덤이 모두 ADDRESSED 다. 새 Minor N2-1 과 범위 밖 관찰(녹화 표본 TypeError)은 컨트롤러가 직접 고칠 크기이고, 후자는 H4 실행 전에 고쳐야 한다.
