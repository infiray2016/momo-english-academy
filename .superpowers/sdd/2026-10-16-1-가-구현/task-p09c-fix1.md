# fix 1 브리프: P9c AI 흐름 · 계약(implementer impl-p09a 이어 하기 · Opus · high, 2026-10-17 13:3x)

코드 검토 `review-p09c.md`(rev-p09b)는 Changes requested(C 0 · I 1 · M 5)다. 아래 컨트롤러 판정대로 고친다. 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p09`(feature/1a-p09c-ai-flow). 커밋 없음. 실제 API 없음. 공용 파일은 그대로(둘 밖 수정 금지). 시험을 먼저 고치고 실패를 본 뒤 구현한다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴.

## 지적과 판정
- **I-1 관찰 명령 요청에 `output_config.format` 이 없음**(ai-observe.ts:195~236 groupRequest). 판정: 검토 권고 셋 그대로 — (1) `withFormat` 을 ai-contract.ts 에서 내보내 `groupRequest` 가 `withFormat(built.body, built.wireSchema)` 로 보낸다(앱 흐름 run.ts:346~350 과 같은 길) (2) 계약 시험의 관찰표 묶음에 '모든 묶음의 요청에 형식이 있고 제목이 규격 제목' 단언 (3) 200 이 아닌 응답(ai-observe.ts:457)을 묶음마다 세어 요약 · 관찰표에 '받지 않음(400 n회)'으로 남기고, 위험 11 대로 그 묶음은 adaptive 를 고른다는 줄을 관찰표에 적는다.
- **M-1 둘째 시도 전송 실패 때 첫 응답의 정규화 값을 버림**(run.ts:377~406, 다르게 한 것 5). 판정(컨트롤러, 13절 C69): **바꾼다** — 둘째 시도가 타임아웃 · 연결 · 서버 실패로 끝나도 기억한 `lastPrepared`(첫 시도의 다듬은 값)가 있으면 값 4 의 9 '남은 것이 없으면' 길로 보내 느슨한 규격으로 받아 정규화해 쓴다(6.1 '다시 실패하면 … 잘라 쓴다' 취지, 아이 쪽은 결과를 받는다). 거절은 지금처럼 refusal(C63 (2)). 행은 `validation_failed`(첫 시도) · 실패 갈래(둘째 시도) 둘. 시험 ai-errors.test.ts:269~292 기대값을 `ok: true · normalized: true` 와 행 `validation_failed · timeout` 으로 바꾸고, lastPrepared 가 없는 경우(첫 시도부터 전송 실패)는 지금처럼 실패를 돌려주는 사례를 하나 둔다.
- **M-2 프로필 없는 호출의 nil uuid**(run.ts:79 · 319). 판정: 받음 — P9a `src/server/ai/store.ts:117~119` `dailyUsage` 의 `profileId: string` 을 `string | null` 로 넓히고(SQL 그대로, 주석 'null 이면 호출 수 0 — 확인 호출 · 프로필 없는 호출'), run.ts 는 `ctx.profileId` 를 그대로 넘기며 `NO_PROFILE_ID` 를 지운다. P9a 파일 한 줄 수정은 이번 fix 에 허용한다(같은 워크트리 · 공용 파일 아님).
- **M-3 AC-8b '확인 호출 행' 몫이 빈 단언**(safety-cap.test.ts:238~258). 판정: 확인 호출 행에 `ai.safety_daily_cost_usd` 만큼의 비용을 실어 넣고 '그래도 나간다'를 단언한다(6.1 43줄 '이 수와 합계에 넣지 않는다'). `ne(purpose, "probe")` 를 지우면 깨지는 시험이어야 한다(확인 뒤 되돌림).
- **M-4 '설정 문제' 시험에 '설정이 없거나' 사례 없음**(ai-errors.test.ts:296~353). 판정: 설정 행 하나를 지웠다 되돌리는 사례(SettingMissingError 갈래)를 더하고, 되돌리기는 `afterEach` 또는 `try/finally` 로 옮긴다.
- **M-5 계약 명령 생각 꺼내기가 done 뒤에도 턴을 보냄**(ai-contract.ts:870). 판정: `done` 이면 그 턴을 마지막으로 보고 멈춘다(엄격 · 정규화 통과면 ok). 녹화 파일은 보낸 턴까지만.

## 완료 판정
CI 순서 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(missing-test 46) → `pnpm check:bundle`, 비밀값 grep 0(바뀐 파일) · `pnpm ai:contract --dry-run` 종료 0 · `pnpm ai:observe` 종료 0(예상 비용만). 바뀐 파일은 I-1 · M-1~M-5 가 가리키는 것만(run.ts · ai-observe.ts · ai-contract.ts · store.ts 한 줄 · 시험 셋 · 계약 시험).

## 보고
`<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p09c-fix1-report.md`(Write 도구): 지적마다 ADDRESSED · 파일:줄 · 시험, 시험 수(252 + todo 6 · 57 → 새 수), 명령 출력 첫 줄, 다르게 한 것 · 알릴 것. 마지막 메시지는 상태 + 요약 한 줄.
