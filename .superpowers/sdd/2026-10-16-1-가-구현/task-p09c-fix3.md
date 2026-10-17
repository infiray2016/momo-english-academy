# fix 브리프: P9c AI 흐름 · 계약 fix 3 — Minor 라운드(implementer impl-p09a 이어 보기 · Opus · high, 2026-10-17 15:2x) — 마지막 fix 라운드

`review-p09c-3.md`(rev-p09b, **Approved** — C 0 · I 0 · M 1; N-1~N-3 · 덤 ADDRESSED, `runObserve` 받음, '고치기 전엔 둘' 구현자가 맞음)의 Minor 하나와 범위 밖 관찰 하나(H4 전 필수)를 고친다. Minor 만이라 재검토 없이 컨트롤러가 diff 와 시험으로 확인한다(C52). **P9c fix 라운드 3 = 상한.** 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p09`(feature/1a-p09c-ai-flow, 커밋 없음). 커밋하지 않는다. 공용 파일 변경 없음. 실제 API 없음. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴.

## 고칠 것(컨트롤러 판정)
1. **N2-1(Minor) — `scripts/ai-observe.ts:285 · 332~337` 이 200 아닌 응답을 상태 숫자만으로 가른다**(콘솔 한도 400 → '받지 않음', 401 · 404 · 콘솔 한도 429 → '일시 오류'). 판정: `runObserve` 에서 상태가 0 이 아니면 계약 명령과 같이 `classifyFailure(httpFailureOf(status, body, headers.has("retry-after")))` 로 갈래를 보고 **셋**으로 센다 — (1) 400 이고 `same_error`(요청 거부) → '받지 않음'(위험 11 증거), (2) `console_limit` · `account` · 404 · 413 → '설정 · 한도 오류' 열(새 칸, 고르기에 안 씀). 첫 `console_limit` · `account` 에서 남은 묶음을 건너뛰고 그때까지의 산출물을 쓴다(건너뛴 묶음 수를 관찰표에), (3) 5xx · 한도 아닌 429 · 응답 없음(status 0) → '일시 오류'. 머리 주석(4~5줄)과 관찰표 끝 문장을 코드에 맞춘다. 시험(가짜 서버): 400 콘솔 한도 → 설정 · 한도 오류 · 남은 묶음 건너뜀 · 산출물 둘 써짐, 400 거부 → 받지 않음, 529 → 일시 오류.
2. **범위 밖(H4 전 필수) — `tests/contract/ai-schemas.test.ts:280`** 이 `[...handmade, ...recorded].filter((s) => s.expect.classify === "console_limit")` 로 녹화 표본의 없는 `expect` 를 읽어, 녹화 표본이 하나라도 생기면 TypeError 로 깨진다(작업 8 '녹화 → pnpm test' 가 막힘). 판정: 녹화 표본에는 `expect` 가 없는 것이 맞으니(실제 응답 기록) 그 단언은 손으로 만든 표본(handmade)만 보고, 녹화 표본은 '규격에 맞는지'만 본다. 녹화 표본이 있을 때 깨지지 않음을 증명하는 시험 하나(임시 폴더에 `recordOf` 꼴 녹화 파일 하나를 두고 표본 읽기 + 분류가 TypeError 없이 도는지). 같은 꼴(모든 표본에 `s.expect.` 를 읽는 곳)이 더 있는지 파일 전체를 훑어 같이 고친다.
3. **덧붙임** — 지난 보고는 소스 무변경이라 적었지만 `run.ts` · `store.ts` 수정 시각이 바뀌어 있었다(내용 같음). 이번 보고에는 실제 바뀐 파일만 `git diff --stat` · `git status --short` 와 함께 적는다.

## 지킬 것 · 완료 판정
- 비밀값 · 아이 이름 · 응답 본문을 로그 · 산출물에 적지 않는다. 경계 규칙 `pnpm check:deps`.
- 고치기 전 실패를 먼저 본다(TypeError 재현 · 400 콘솔 한도가 '받지 않음'으로 세어짐).
- 완료 판정: biome 0 · `pnpm build` · `pnpm test`(258 → 늘어남) · `pnpm test:int` 59 · check:deps 0 · spec:trace missing-test 46 · check:bundle 0 · `pnpm ai:contract --dry-run` 종료 0 · `pnpm ai:observe`(예상 비용만) 종료 0 · 녹화 표본 시험 통과.

## 보고
`<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p09c-fix3-report.md`: 지적마다 ADDRESSED · 파일:줄 · 시험, 고치기 전 실패 둘, 바뀐 파일(diff --stat · status), 완료 판정 대조. 끝나면 상태와 요지 5줄을 컨트롤러에게 SendMessage 로. 그 뒤 컨트롤러가 확인하고 plan-p09c 완료 보고를 채워 요청자에게 커밋을 요청한다.
