# 브리프: P1b 품질 관문 구현

역할: implementer(Opus · high). plan 이 정본이다: `intent/2026-10-15-모모-잉글리시-아카데미/plan-p01b-품질-관문.md`(approved 컨트롤러 2026-10-16 10:3x). plan 의 '파일별 값' 1~9 와 '작업 순서' 1~5 를 그대로 따른다. 작업 6(훅 실기 확인)은 컨트롤러가, 작업 7(커밋 · PR)은 요청자 지시 때 컨트롤러가 한다.

## 환경(컨트롤러가 준비함)
- 브랜치 `feature/1a-p01b-quality-gates`(P1a 커밋 b0b6a46 끝에서 가지 침)가 체크아웃돼 있다. 바꾸지 않는다.
- Node 24(nvm) · pnpm 10.34.7. 저장소에 `.nvmrc` 가 있으니 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null && …` 로 시작한다(기본 Node 는 26).
- P1a 결과가 있다: `package.json`(스크립트 dev · build · start · lint · format · test · test:int · e2e, 판 고정), `vitest.config.mts`(P1a plan 의 `.ts` 는 fix 1 에서 `.mts` 가 됐다. P1b plan 본문에 `vitest.config.ts` 라 적힌 곳이 있으면 `.mts` 로 읽는다), `biome.json`(tests/** 의 noFocusedTests · noSkippedTests 가 오류), `tsconfig.json`(exclude 에 tests/.tmp), `.github/workflows/ci.yml`(lint · build · unit + 자리 셋), `.gitignore`(tests/.tmp · .claude/state 포함), `src/app` 만 있는 `src`.
- 원격이 없어 CI 는 돌지 않는다. 완료 판정은 plan 작업 5 의 로컬 명령이다.
- 임시 폴더는 저장소 밖 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/p01b/`. 시험이 쓰는 임시 프로젝트는 plan 대로 `tests/.tmp/`(gitignore 됨, 시험 뒤 지움).

## 컨트롤러 결정(plan '정할 것' 가~사, 13절 C51)
- 가 maxTurns 100. 나 NEEDS_CONTEXT · BLOCKED 첫 줄로 끝내기를 둔다. 다 `sdk-only-in-ai` 규칙을 넣는다(규칙 넷). 라 CI 의 spec-trace 는 `--fail-on unknown-ac,plan-ac-not-in-spec`, missing-test 는 보고만. 마 조사 P3 나머지 규칙은 P1c(이 plan 범위 밖). 바 Vercel 빌드 명령은 H1 때(범위 밖). 사 `implementer.md` 의 '테스트를 먼저 쓰고(Vitest 단위 · 컴포넌트, …)' 에서 '· 컴포넌트' 를 뺀다(작업 4 의 같은 편집에서).

## 허용 파일(plan '바뀌는 파일' 표 그대로)
- 새로 쓰는 것: `.dependency-cruiser.cjs` · `tests/unit/dependency-rules.test.ts` · `scripts/spec-trace.ts` · `tests/unit/spec-trace.test.ts` · `scripts/check-bundle.ts` · `tests/unit/check-bundle.test.ts` · `.claude/hooks/implementer-stop-gate.ts` · `tests/unit/implementer-stop-gate.test.ts`.
- 고치는 것: `.claude/agents/implementer.md`(프런트매터 두 필드 + 본문 세 줄 + '· 컴포넌트' 삭제) · `.github/workflows/ci.yml`(작업 셋 추가) · `package.json`(스크립트 셋만. 의존을 더하지 않는다).
- 그 밖은 읽기만. `specs/` · `intent/` 의 정본 · plan 은 고치지 않는다(spec-trace 가 읽기만 한다).

## 순서 · 지킬 것
- plan 작업 1~5 를 차례로. 시험 먼저 쓰고 실패를 본 뒤 통과시킨다. 시험을 건너뛰거나 지우지 않는다.
- 작업 4 의 직접 실행 확인(깨지는 단위 시험 파일을 잠깐 두고 관문이 2, 지우면 0, 로그 줄 생김)을 보고에 적고 탐침 파일은 반드시 지운다. 기본 Node 26 으로도 관문을 한 번 돌려(`nvm use 26`) Node 24 · 26 둘 다에서 도는지 적는다.
- Stop 훅 스크립트는 `node:*` 만 쓴다(외부 패키지 없음). `implementer.md` 프런트매터는 plan 파일별 값 6 의 철자 그대로다.
- spec-trace 의 경로 상수는 NFC 한글로 적는다. 기대 요약: `--fail-on` 없이 종료 0, unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 67 → 작업 3(AC-N4 시험) 뒤 66.
- 비밀값 · 가짜 키 꼴을 저장소에 적지 않는다(시험의 가짜 키 · 접속 문자열은 실행 때 조각을 잇는다). 검사 출력에 값 원문을 내지 않는다.
- git 쓰기 명령 금지(`git status` · `git diff` 는 됨). 아이 화면 문구를 짓지 않는다. 용어는 영역 · 단계 · 단원 · 활동, 코드 식별자는 영어.
- 설계 · plan 을 바꾸지 않는다. plan 대로 안 되는 것은 가장 가까운 길을 택하고 보고에 까닭을 적는다.

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/task-p01b-report.md`: 바뀐 파일(계획과 다른 것 표시) · 명령 결과(`pnpm lint` · `pnpm build` · `pnpm test` 통과 수 · `pnpm check:deps` · `pnpm spec:trace` 요약 줄 · `pnpm check:bundle` 요약(파일 수 · 이름 수 · 대조한 값 수, 값 원문 없이) · 관문 직접 실행 2 / 0 · Node 26 실행) · 계획과 다르게 한 것 · 남긴 것 · 우려. 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED 가운데 하나, 그 뒤 요지 10줄 안쪽.
