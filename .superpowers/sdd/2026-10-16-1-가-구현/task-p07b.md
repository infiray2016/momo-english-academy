# 구현 브리프: P7b CI 작업 셋 · 식별자 대조 · 활동 유지 명령(implementer impl-p07b · Opus · high) — 가벼운 루프

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p07b-CI-작업-식별자-대조.md`(approved, C68)대로 작업 1~4 를 한다. 가벼운 루프(C52 — 도구 성격): 끝나면 code-reviewer(Opus · high, 범위 한정) 한 번, Minor 는 컨트롤러가 직접. 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p07`, **새 가지 `feature/1a-p07b-ci-ids` 를 P7a 커밋 df8445e(feature/1a-p07-seed-load 끝) 위에 만들어** 작업한다(`git -C <워크트리> checkout -b feature/1a-p07b-ci-ids df8445e`). 커밋하지 않는다(H14). 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 시험을 먼저 쓰고 실패를 본 뒤 구현한다.

## 먼저 읽을 것
plan-p07b 전부(목표 · 바뀌는 파일 · 파일별 값 1~6 · 작업 순서 · 위험 · 정할 것 · 증명), plan-p07a '다른 P 에 넘길 것'(명령 · 종료 코드 · 첫 줄 꼴 · dev-load 입력 `--complete-through <n> --areas reading,writing,speaking` · 수업 전 `--reference-only` · 접속은 `MIGRATION_DATABASE_URL` 하나 · check-ids 허용 목록 후보 7 · 시험 고정 값), `.superpowers/sdd/2026-10-16-1-가-구현/ledger-open.md` 의 P7b 행(허용 규칙 · fixture-setting 규칙이 시험 파일을 보는지 · `finally close` 덤), 13절 C68 · C70(개발용 로컬 DB 길은 P10a 로 옮김 — P7b 에서 만들지 않는다). 정본 `specs/08-테스트와-기술.md` 9~10절(CI · 운영) · `specs/09-설정값.md` 12절 · `specs/README.md`.

## 할 것
1. 작업 1 식별자 대조 `scripts/check-ids.ts`(`pnpm check:ids`) + `tests/unit/check-ids.test.ts`. **정본은 메인 저장소의 최신 `specs/`**(`/Users/hikaru/workspace/momo-english-academy/specs`, 브랜치 feature/1a-p01b-quality-gates — 워크트리의 specs 는 옛 판)를 읽어야 하므로 정본 뿌리를 선택지(예 `--specs <경로>`, 기본은 저장소의 `specs/`)로 받게 하고, 보고에는 메인 저장소 specs 로 돌린 출력을 적는다. 막는 규칙 위반이 나오면 고칠 쪽(정본 — 컨트롤러 13절 · seed — P6 · 코드 — 그 P)을 보고에 적고 이 plan 에서 고치지 않는다. seed/ 가 없으면 시드 규칙은 건너뜀(P6a 합친 바탕에서 다시 돌리는 것은 작업 5 컨트롤러 몫).
2. 작업 2 활동 유지 명령 `scripts/db-ping.ts`(`pnpm db:ping`, `server-only` 없이 postgres 바로) + `tests/integration/db-ping.test.ts`.
3. 작업 3 작업 파일 셋 `.github/workflows/{main,dev-load,keepalive}.yml` + `tests/unit/ci-workflows.test.ts`(차례 · 비밀값 이름 DEV_ · PROD_ · 입력 · 이름). 운영 비밀값은 dev-load 가 읽지 않는다. 기존 `ci.yml` 은 고치지 않는다(P5b 의 e2e-local 작업은 P5b 가지에 있어 이 가지에는 없다 — 그대로 둔다).
4. 작업 4 마무리 — CI 와 같은 순서 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle` → `pnpm check:ids --fail-on …`(ci.yml 과 같은 규칙), 비밀값 grep 0건. 출력을 보고에.
5. **덤**(ledger-open, review-p07a-2 4절): `scripts/seed-load.ts` 의 `finally { await handle.close() }` 가 던지면 적재 결과를 덮어 '예상 밖 오류' 종료 2 가 되므로, 접속 확인 쪽처럼 닫기 실패를 삼킨다(결과 · 종료 코드는 적재 결과대로). 시험 한 줄.

## 지킬 것
수(기술 값)는 파일 맨 위 대문자 상수 · 설정은 12절 키, 비밀값 이름만(값 없음), 경계 규칙 `pnpm check:deps`, 시험 이름 AC 접두(spec-trace), 공용 파일 변경은 package.json scripts 두 줄(check:ids · db:ping)뿐 — 보고에 따로 표시. 계획과 다르게 하면 까닭.

## 보고
`<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p07b-report.md`: 바뀐 파일 · 시험 수 · 작업 4 출력(첫 줄) · check:ids 출력(메인 specs 기준, 위반이 있으면 고칠 쪽) · 다르게 한 것 · 남긴 것 · 검토자에게 알릴 것. 끝나면 상태(DONE · DONE_WITH_CONCERNS · BLOCKED)와 요지 5줄을 컨트롤러에게 SendMessage 로.
