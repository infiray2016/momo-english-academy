# 구현 보고: P5a 풀이 검사 명령(impl-p05a, 2026-10-16 23:5x)

상태: DONE_WITH_CONCERNS(구현 · 시험 · CI 순서 명령 전부 0. 우려는 아래 '검토자에게 알릴 것' 1 — SDK 가 status enum 을 API 에 싣지 않는다)

자리: 워크트리 `.claude/worktrees/agent-a0ffe8037fa827af6`, 브랜치 feature/1a-p05a-seed-check(바탕 6bd6015), 커밋 없음.
기준: 브리프 `task-p05a.md`, plan `plan-p05a-풀이-검사.md`(approved 23:2x, 컨트롤러 결정 문단까지), C62.

## 바뀐 파일

| 파일 | 신규 / 수정 | 줄 | 내용 |
|---|---|---|---|
| `src/core/seed/solve-check.ts` | 신규 | 749 | 순수 함수. 문제 보기 `buildSolveRequest`(255) · `solveUserMessage`(317) · `seedAnswerOf`(327) · `SOLVE_INSTRUCTIONS`(349) · `SolveOutputSchema`(362) · `interpretSolveMessage`(400) · `judgeSolve`(455) · `tokensOf`(522) · `buildCheckRecord`(539) · `mergeCheckFile`(571) · `withHumanDecisions`(605) · `priceOf`(639) · `costOf`(653) · `roundCost`(664) · `solveCallAccepted`(670) · `isContentFilePath`(700) · `selectSolveTargets`(714) · `cellLevel`(244). 타입 `Solver` · `SolveMessage`(구조 타입)도 여기(392 · 385). SDK · 파일 · 네트워크 · 시계를 가져오지 않는다 |
| `scripts/seed-check.ts` | 신규 | 916 | 명령. 호출 설정 상수 SOLVE_*(72~85) · `PROBE_CELL`(94) · `parseArgs`(141) · `checkEnvironment`(265) · `fileStore`(294, 임시 파일 → 이름 바꾸기) · `redact`(319) · `runCheck`(605) · `runProbe`(765) · `createAnthropicSolver`(841) · 직접 실행 `main`. `@anthropic-ai/sdk` 를 값으로 가져오는 유일한 파일 |
| `tests/fixtures/seed/fake-solver.ts` | 신규 | 158 | 가짜 풀이(정답대로 · different · multiple · none · alternatives · refusal · broken · max_tokens · missing-item · api-error), `answerOutput` · `solveMessage` · `FAKE_USAGE`. 네트워크 없음. P5c 도 쓸 수 있다 |
| `tests/unit/solve-check.test.ts` | 신규 | 791 | 순수 함수 시험 13 |
| `tests/unit/seed-check-cli.test.ts` | 신규 | 647 | 명령 시험 8(spawn 4회 포함, 키 없이) |
| `package.json` | 수정(공용 변경 1) | scripts 한 줄 | `"seed:check": "node --env-file-if-exists=.env.local --import tsx scripts/seed-check.ts"` |

정본 · plan · 다른 공용 파일(.dependency-cruiser.cjs · biome.json · CI)은 고치지 않았다. P5b · P5c 파일 · `src/server/ai` · 12절 키는 만들지 않았다. 해시 · 문항 번호 · 대상 · 상태는 P4c 의 `cellHash` · `itemsOf` · `solveTargets` · `solveStatus` · `collectCells` 를 그대로 부른다.

## 시험 수

바탕 159 → 180(+21: solve-check 13 · seed-check-cli 8). 시험 이름 21개는 plan 증명 표 글자 그대로다(스크립트로 대조, 빠짐 0). spec-trace 'AC 이름 시험' 52 → 60(AC-7d 8), missing-test 58 그대로.

시험 숫자는 견본(`smallReferenceSet` · `referenceSet(defaultSettings())` · `miniSeed` · 견본 단가 행 · `FAKE_USAGE`)에서 읽는다. 실행 시각은 견본 단가 행의 `effectiveFrom` 날의 정오(UTC)다.

## 작업 4 실기(키 없이, `tests/.tmp/seed-check-AgyARl/` 에 miniSeed 나무(풀이 기록 뺌), 공용 변경 전 `node --import tsx scripts/seed-check.ts`)

```
--- --dry-run (exit 0)
seed-check: 대상 151 · 푼 칸 0 · 통과 0 · 사람 확인 0 · 실패 0 · 건너뜀 0 · 남음 0 · 거절 0 · 호출 0 · 입력 0 · 출력 0 토큰 · 비용 -달러
미리 보기: 대상 칸 151 · 문항 427 · 어림 비용 -달러(기록 0칸 평균)
--- CI=true (exit 2)
seed-check: CI 환경(CI 변수)에서는 풀이 검사가 API 를 부르지 않는다. 저장 결과는 seed:validate 가 읽는다(--dry-run 은 된다)
--- 키 없음 (exit 2)
seed-check: 개발용 키(.env.local, H4)가 없다
--- 뿌리 없음 --dry-run (exit 2)
seed-check: 시드 뿌리 폴더가 없다: tests/.tmp/no-such-root
--- CI=true --dry-run --json (exit 0) 첫 줄들
{ "version": 1, "mode": "dry-run", "model": "claude-sonnet-5-5", "effort": "low", "thinking": "between_tools", ...
```

실행 뒤 뿌리에 checks/ 가 생기지 않았다(쓰기 없음). 공용 변경 1 뒤 `pnpm -s seed:check` 로 같은 셋을 다시 봤다(dry-run 0 · `--probe` 키 없음 2 · CI 2). 작업 3 완료 조건 '키 없이 `pnpm seed:check --probe` 가 2' 도 이것이다. 이 워크트리에는 `.env.local` 이 없어 Node 가 `.env.local not found. Continuing without it.` 한 줄을 먼저 낸다(Node 의 안내, 종료 코드와 상관없음).

## 작업 5 CI 순서(공용 변경 1 뒤, 워크트리)

| 명령 | 종료 | 출력 첫 줄 · 요지 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | Done in 383ms using pnpm v10.34.7 |
| `pnpm exec biome ci .` | 0 | Checked 55 files … No fixes applied. |
| `pnpm build` | 0 | ✓ Compiled successfully · Finished TypeScript(scripts/ 도 tsconfig 에 들어 타입 검사됨) |
| `pnpm test` | 0 | Test Files 18 passed (18) · Tests 180 passed (180) |
| `pnpm check:deps` | 0 | ✔ no dependency violations found (23 modules, 69 dependencies cruised) — 바탕 22 모듈에서 solve-check.ts 가 더해짐 |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 | spec-trace: 15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 60 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 58 |
| `pnpm check:bundle` | 0 | check-bundle: 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0 |
| 비밀값 grep(`sk-ant-…` · `ANTHROPIC_API_KEY=값` · `ANTHROPIC_AUTH_TOKEN=값`, 바뀐 파일 여섯) | 0건 | 시험의 키 자리 값은 `test-only-placeholder-key-value`(키 꼴 아님) |

## 계획과 다르게 한 것(또는 plan 이 정하지 않아 정한 것)

1. `runCheck(args, deps)` 의 deps 에 기록 읽기 · 쓰기 `store`(`read` · `write`)를 둔다. 시험은 파일 묶음 Map 을 store 로 써서 `validateSeed` 로 끝을 보고, 직접 실행은 `fileStore(root)`(임시 파일 → 이름 바꾸기)다. 칸 하나를 풀 때마다 그 기록 파일을 다시 읽어 그 칸만 바꿔 바로 쓴다(위험 8). 한 프로세스 안에서는 읽기 · 쓰기가 동기라 동시 호출에서도 섞이지 않는다. 시험 하나는 실제 폴더(`tests/.tmp`)에 `fileStore` 로 쓰고 임시 파일이 남지 않음을 본다.
2. `Solver` · `SolveMessage` 타입은 core(solve-check.ts)에 둔다(타입만). 가짜 풀이 fixture 가 스크립트(SDK)를 가져오지 않게 하려는 것이다.
3. plan 함수 표 밖으로 내보낸 것: `seedAnswerOf`(판정과 가짜 풀이가 함께 씀) · `solveUserMessage`(보낼 JSON, 시험이 정답 샘을 봄) · `cellLevel` · `tokensOf` · `roundCost` · `isContentFilePath`(--file 확인).
4. '건너뜀'은 (1) 풀이 대상이 있고 (3) 거르기에 맞는 칸 가운데 검증에 걸린 칸이다(기록 해시가 그대로여도 센다). 검증 실패는 `validateSeed(PR).errors[].cell` 과 `collectCells` 의 `failedKeys` · `brokenKeys` 를 합쳐 본다.
5. `--dry-run` 의 사람 출력은 첫 줄 뒤에 `미리 보기: 대상 칸 n · 문항 n · 어림 비용 x달러(기록 n칸 평균)` 한 줄을 더한다(plan 의 '문항 수'). `--json` 꼴은 plan 그대로 두어 문항 수는 싣지 않았다. 기록이 없으면 비용은 사람 출력 `-`, JSON `null` 이다. 단가 행 · 조합 확인(2)은 `--dry-run` 에도 한다.
6. 실패한 호출도 응답 토큰이 있으면(max_tokens · 규격 깨짐 · 번호 어긋남) 요약의 호출 · 토큰 · 비용에 센다(과금된다). SDK 예외는 호출 1 · 토큰 0 으로 센다.
7. 실패 까닭에 SDK 예외의 상태 · 이름 · 글(한 줄, 300자까지 `REASON_MAX_CHARS`)을 싣는다. 위험 6(400)을 `--probe` 첫 줄에서 바로 보려는 것이다. 키 값은 실행에 쓴 키를 `***` 로 바꿔 가린다(runCheck 줄 · probe 줄 · main 출력 세 겹). 시험이 키가 섞인 오류 글로 확인한다.
8. 클라이언트는 `apiKey` 와 함께 `authToken: null` 을 넘긴다. SDK 0.135 는 authToken 을 안 넘기면 `ANTHROPIC_AUTH_TOKEN` 을 읽어 함께 보내므로(설치판 `client.js` 118줄), plan 의 '다른 자격 증명이 끼어들지 않게'를 지키려고 더했다. `apiKey` 를 넘기면 프로필 · credentials 해석도 건너뛴다(같은 파일 188~190줄).
9. `--probe` 는 `--root` 만 본다(나머지 거르기 · `--json` 은 쓰지 않는다). `--probe` 와 `--dry-run` 을 함께 주면 2. 첫 줄은 `seed-check probe: 모델 <m> · stop_reason <s> · 입력 <n> · 출력 <n> 토큰 · 판단 <same|different|multiple|none|거절(none)|실패 까닭>[ · 비용 <x>달러]`. 호출이 되고 응답을 읽었으면 판단이 different 이거나 거절이어도 0, API 오류 · 응답 실패는 1. 고정 문항은 `PROBE_CELL`(칸 키 `level-test:reading:1:1:1` 꼴의 읽기 사실 문항, 정답 2, 시드에 쓰지 않는다).
10. `--max-calls` · `--concurrency` 는 1 이상 정수(동시는 8까지). `--levels` 의 JSON 꼴은 `{ min, max }`. 남은 칸은 사람 출력에 줄을 내지 않고 첫 줄 '남음' 과 JSON `remaining` 으로만 낸다. 사람 출력 줄 차례는 사람 확인 → 실패 → 건너뜀이다.
11. 지시문(`SOLVE_INSTRUCTIONS`)은 한국어로 썼다. plan 규칙 1~6 에 task 마다 답 꼴 한 줄과 'listen 은 아이가 듣기만 한다'를 더했다.

## 남긴 것

- 작업 6(검토 · 커밋)과 작업 7(H4 뒤 요청자 터미널의 첫 실호출 `pnpm seed:check --probe`)은 하지 않았다. 구현자는 키가 없고 실제 API 를 부르지 않았다.
- 위험 6(between_tools + 구조화 출력 400)은 작업 7 결과를 기다린다. 400 이면 probe 첫 줄에 `실패 API 오류 400 …` 과 API 글이 나온다.
- 위험 10(실행마다 전체 검증 시간): `selectSolveTargets` 가 `collectCells` 를 두 번 돈다(자기 걷기 + `validateSeed` 안). miniSeed small(칸 172)에서 걷기 약 40ms · 검증 약 70ms 였다. 실시드 시간은 P8 표본에서 잰다.

## 검토자에게 알릴 것

1. (우려) SDK 0.135 의 `zodOutputFormat` 이 JSON 스키마를 바꿀 때 `enum`(status 의 one · multiple · none)과 `z.int()` 범위를 API 에 싣지 않고 description 글로 옮긴다(설치판 `lib/transform-json-schema.js`, 실제로 만든 스키마를 찍어 확인: `"status":{"type":"string","description":"{enum: [\"one\",\"multiple\",\"none\"]}"}`). 그래서 API 는 status 값을 강제하지 않는다. 우리 쪽 `SolveOutputSchema.safeParse` 가 다른 값을 막아 그 칸은 '규격 깨짐' 실패가 되고 다음 실행이 다시 푼다. 지시문에도 세 값을 적었다. plan 의 '수 · 길이 제약은 API 에 실리지 않는다'(확인한 사실 2)와 같은 갈래이고 설계는 바꾸지 않았다. 실패가 잦으면 작업 7 · P8 표본에서 보인다.
2. 거절 처리는 C62 (3) 그대로다(대상 문항 모두 none → solveStatus 가 pending-human). 거절 칸도 기록을 쓰고 '거절' 수를 센다.
3. 판정의 글 답 견주기는 `trim().toLowerCase()` 로 `solveStatus` 후보 견주기와 같다. 후보(extraAccepted)는 앞뒤 공백을 지운 글을 적고, 빈 글 · 답 글과 같은 것 · 서로 겹친 것을 대소문자 무시로 뺀다. `listAlternatives` 가 거짓인 문항의 alternatives 는 버린다.
4. 문제 보기에서 그림은 vocab 한국어 뜻(`그림: 뜻`)이다. 견본 vocab 의 뜻은 '가상 낱말 1-1' 꼴이라 견본 칸을 실제로 풀면 그림 문제가 풀리지 않는다(시험은 가짜 풀이라 상관없다). 받아쓰기는 `listen`(읽어 줄 글)만 주고 `word` 칸을 넣지 않는다. 받아쓰기 읽어 줄 글이 정답과 같은 글인 것은 문항의 본래 꼴이다.
5. 기록 파일 안 차례는 `collectCells` 의 그 내용 파일 칸 차례(PR 검증 실패 칸 · 대상이 아닌 칸 포함)이고, 지금 내용에 없는 칸의 옛 기록은 뒤에 남긴다. 기록 파일이 JSON 이 아니거나 규격에 맞지 않으면 덮어쓰지 않고 그 칸을 실패로 둔다.
6. `scripts/seed-check.ts` 는 `./seed-validate` 의 `readSeedTree` · `REQUIRED_FILES` · `DEFAULT_ROOT` 를 가져온다. `isDirectRun` 은 seed-validate 가 내보내지 않아 같은 꼴로 옮겨 적었다.
7. 시험의 spawn 은 `tsx` 로 직접 띄우고 `ANTHROPIC_API_KEY` 를 빈 값으로 덮어 `.env.local` · 환경의 키가 쓰이지 않게 했다(CI 에서 `CI=true` 가 있어도 시험 값이 덮는다).
