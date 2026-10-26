# 브리프: P5a 풀이 검사 명령 구현(implementer impl-p05a, 2026-10-16 23:2x)

역할: implementer(Opus · high). plan-p05a 가 정한 파일 다섯과 공용 변경 하나만 만들고 고친다. 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 검토는 하지 않는다(code-reviewer 가 따로 본다). 하위 에이전트 · 커밋 없음. 실제 API 를 부르지 않고 API 키도 없다. 비밀값 · 아이 이름을 어디에도 적지 않는다.

## 자리
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a0ffe8037fa827af6`(브랜치 feature/1a-p05a-seed-check, 바탕 P4c 6bd6015, node_modules 설치됨). 모든 파일은 여기에 쓴다.
- 정본 · plan 은 메인 저장소 `/Users/hikaru/workspace/momo-english-academy/` 에서 읽는다(워크트리의 specs/ · intent/ 는 낡았다): plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p05a-풀이-검사.md`(approved 23:2x — 머리의 '컨트롤러 결정' 문단까지), 13절 C51 · C62(`specs/10-결정-기록.md`), 6.1 · 6.6(`specs/05-AI-호출.md`) · 6.4(`specs/06-시드-생성.md`).
- 명령은 워크트리에서 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴(서브에이전트 환경이 `source ~/.nvm/nvm.sh` 를 막는다). 한글 경로를 명령 인자로 넘기지 않는다(`pnpm spec:trace` 는 인자 없이, 보고 파일은 Write 도구로). 도구 층이 `\uXXXX` 를 글자로 바꾸므로 이스케이프는 바이트로 확인한다.

## 먼저 읽을 것(순서)
1. 메인 저장소 `.claude/CLAUDE.md`.
2. plan-p05a 전부 — 함수 표 · 풀이 요청 · 지시문 규칙 · 응답 규격 · 판정 · 기록 · 대상 칸 · 명령(인자 · 환경 확인 · 종료 코드 · 첫 줄 · --json) · 호출 설정 상수 · 공용 변경 · 작업 순서 · 위험 · 정할 것 · 확인한 사실 · 증명(시험 이름).
3. 워크트리의 P4 코드: `src/core/seed/validate.ts`(collectCells · cellHash · itemsOf · solveTargets · solveStatus · validateSeed) · `structure.ts` · `schema/records.ts`(CheckFileSchema · CheckRecordSchema) · `schema/reference.ts`(ModelPriceSchema) · `scripts/seed-validate.ts`(readSeedTree · REQUIRED_FILES · DEFAULT_ROOT · isDirectRun 꼴 · --json) · `tests/fixtures/seed/builders.ts`(miniSeed · sampleSeedTree · smallReferenceSet · 견본 단가 표) · `.dependency-cruiser.cjs` · `scripts/spec-trace.ts`.
4. 설치판 SDK `node_modules/@anthropic-ai/sdk`(`resources/messages/messages.d.ts` 의 create · output_config · thinking · Usage, `helpers/zod` 의 zodOutputFormat).

## 만들 것(plan 작업 순서 1~5)
1. `tests/unit/solve-check.test.ts` → `src/core/seed/solve-check.ts`(순수 — SDK · 파일 · 네트워크 · 시계를 가져오지 않는다, 시각은 인자). 완료: 시험 통과 · `pnpm check:deps` 0.
2. `tests/fixtures/seed/fake-solver.ts` · `tests/unit/seed-check-cli.test.ts` → `scripts/seed-check.ts` 의 순수 꼴(parseArgs · checkEnvironment · runCheck)과 쓰기. 완료: 시험 통과.
3. SDK 를 부르는 얇은 함수(`createAnthropicSolver`)와 `--probe`. 시험은 SDK 를 부르지 않는다. 완료: `pnpm build` 통과, 키 없이 `--probe` 가 2.
4. 실기(키 없이): `tests/.tmp/seed-check-<무작위>/` 에 `miniSeed` 나무(풀이 기록 뺀 것)를 쓰고 `--dry-run`, `CI=true`(2), 키 없음(2), 뿌리 없음(2). 공용 변경 1 전에는 `node --import tsx scripts/seed-check.ts`. 완료: 출력이 보고에.
5. 공용 변경 1(`package.json` scripts `"seed:check": "node --env-file-if-exists=.env.local --import tsx scripts/seed-check.ts"`)을 옮긴 뒤 CI 와 같은 순서 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, 비밀값 grep 0건. 완료: 출력이 보고에 있고 missing-test 가 바탕과 같다(58).
하지 않는 것: P5b · P5c 파일, `src/server/ai`, CI 작업 추가, 12절 키, 해시 · 문항 번호 · 대상 · 상태 다시 짜기(P4c 함수 그대로 — plan-p04c 위험 5), 정본 · plan · 다른 공용 파일 수정.

## 지킬 것
- 시험의 숫자 · 글은 견본(builders)에서 읽고 박지 않는다. 시험 이름은 증명 표 글자 그대로(spec-trace 가 AC-7d 로 시작하는 이름을 센다).
- 의존 규칙: `@anthropic-ai/sdk` 를 값으로 가져오는 파일은 `scripts/seed-check.ts` 하나만. `src/core` 는 I/O · 프레임워크 없음(core-no-io · core-no-framework).
- 요청에 temperature · top_p · top_k · fallbacks · 베타 헤더 · cache_control · metadata 를 보내지 않는다(C62 (2)). 키는 `ANTHROPIC_API_KEY` 로만 넘기고 어떤 출력 · 오류 · 기록에도 키 값을 내지 않는다.
- 기록 꼴(`CheckFileSchema`) · 해시 · 번호 · 통과 판정은 P4 함수 그대로. 호출 설정은 plan 표의 이름 붙인 상수(SOLVE_*). 설계 숫자를 코드에 새로 박지 않는다.
- 코드 식별자는 영어, 주석 · 출력 문구 · 보고는 한국어(용어: 영역 · 단계 · 단원 · 활동 · 칸).

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/task-p05a-report.md`(워크트리, Write 도구): 상태 · 바뀐 파일 · 시험 수(바탕 159 → 새 수) · 작업 4 · 5 의 명령과 출력 첫 줄 · 계획과 다르게 한 것 · 남긴 것 · 검토자에게 알릴 것. 마지막 메시지는 상태(DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED) + 요약 한 줄.
