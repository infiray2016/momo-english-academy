# 브리프: P3a DB · 시계 · 설정 읽기(implementer · Opus · high)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p03a-DB-시계-설정.md`(approved 컨트롤러 2026-10-16 18:2x, 결정 C55 · C56 · C57)를 구현한다. plan 이 유일한 설계이고 이 브리프는 범위 · 허용 파일 · 명령 · 보고 자리를 정한다. 코드는 plan '파일별 값' 1~11 과 '정할 것' 뒤의 '컨트롤러 결정(승인 때)' 문단을 글자 그대로 따른다. vocab 은 `id uuid` 대리 키 + 유니크 `word` 다(C54 (3) · C56 (5), plan 표는 고쳐져 있다).

## 작업 폴더 · 바탕
- 이 에이전트의 현재 폴더는 격리 워크트리다(바탕: 브랜치 `feature/1a-p01b-quality-gates` 의 승인 문서 커밋, `git log -1` 로 확인). 모든 경로는 그 폴더 기준이고, 메인 저장소 폴더(`/Users/hikaru/workspace/momo-english-academy`)의 파일은 읽기만 한다.
- 첫 명령: `source ~/.nvm/nvm.sh && nvm use >/dev/null && pnpm install --frozen-lockfile`(워크트리에는 node_modules 가 없다. 끝내기 관문이 node_modules 를 요구한다). 이후 모든 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null && ` 로 시작한다.
- git 쓰기 명령 금지(커밋은 요청자 지시 때 컨트롤러가 한다). 파일 이름 바꾸기는 `mv`.
- 이 실행은 C52 (2) 의 끝내기 관문 실기 확인을 겸한다. 따로 할 일은 없다(끝낼 때 관문이 `biome ci` 와 단위 시험을 돈다. 막히면 고치고 다시 끝낸다).

## 먼저 읽을 것(순서)
1. `.claude/CLAUDE.md`. 2. plan-p03a 전부(특히 '목표', '바뀌는 파일' 표와 '요청하는 공용 변경' 1~7, '파일별 값' 1~11, '작업 순서' 1~8, '위험' 1~14, '컨트롤러 결정(승인 때)' 문단, '증명' 표). 3. `specs/04-데이터.md` 5절(C54 · C56 반영 뒤 판), `specs/08-테스트와-기술.md` 10절 DB · 접근 제어 행, `specs/02-1-영역-단원-승급.md` 3.1 학습일 문단, `specs/09-설정값.md` 의 app.* · access.* · parent.* · session.length_factor 키, `specs/11-요구사항과-수용-기준.md` AC-N5 · AC-N7 · AC-7g, 11절 (4-1) 시각 당기기 문장(`specs/README.md` 지도로 장을 찾는다). 4. `specs/10-결정-기록.md` 13절 C54 · C55 · C56. 5. 설치판 형 정의 `node_modules/drizzle-orm/pg-core/*.d.ts` · `node_modules/drizzle-kit/index.d.ts`(온라인 문서는 1.0 베타 기준이라 설치판이 우선). 6. 기존 꼴 `tests/unit/*.test.ts` · `tests/unit/dependency-rules.test.ts` · `vitest.config.mts` · `.dependency-cruiser.cjs` · `.github/workflows/ci.yml` · `biome.json`.

## 허용 파일
- 새 파일 열여섯(plan '바뀌는 파일' 표 그대로): `drizzle.config.ts` · `src/db/schema/{content,learning,operations}.ts` · `drizzle/0001_api_roles_revoke.sql` · `src/server/db/index.ts` · `src/core/learning-day.ts` · `src/server/settings/index.ts` · `src/server/clock/index.ts` · `tests/integration/{global-setup,test-db}.ts` · `tests/integration/{rls-grants,settings,clock}.test.ts` · `tests/fixtures/settings.ts` · `tests/unit/learning-day.test.ts`.
- drizzle-kit 이 만드는 파일: `drizzle/0000_*.sql` · `drizzle/meta/_journal.json` · `drizzle/meta/*_snapshot.json`. 만든 뒤 손으로 고치지 않는다(0001 은 `--custom` 으로 만든 빈 파일을 채운다).
- 공용 변경(plan '요청하는 공용 변경' 1~7, 글자 그대로. 승인 때 '구현자가 자기 워크트리에서 옮긴다'로 바꿨다): `package.json`(dev 의존 `embedded-postgres@17.10.0-beta.17` 정확한 판 — `pnpm add -D -E embedded-postgres@17.10.0-beta.17`, `pnpm.onlyBuiltDependencies` 에 `@embedded-postgres/darwin-arm64` · `@embedded-postgres/linux-x64`, scripts `test:int`(--passWithNoTests 뺌) · `db:generate` · `db:migrate`) · `pnpm-lock.yaml`(그 결과만) · `vitest.config.mts`(server-only 별칭 · integration globalSetup · testTimeout 상수) · `.github/workflows/ci.yml`(integration 작업: 다른 작업과 같은 준비 네 줄 + `pnpm test:int`, `if: ${{ false }}` 빼기) · `.env.example`(MIGRATION_DATABASE_URL 두 줄) · `biome.json`(`files.includes` 에 `"!drizzle"`) · `.dependency-cruiser.cjs` + `tests/unit/dependency-rules.test.ts`(규칙 `db-only-from-server`, 시험 표에 막는 예 · 허용 예 한 줄씩).
- 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p03a-report.md`.
- 그 밖(`src/app/` · `src/lib/` · `src/proxy.ts` · `next.config.ts` · `playwright.config.ts` · P2 · P4 의 파일)은 손대지 않는다. 다른 새 패키지 없음.

## 지킬 것
- 시험을 먼저 쓰고 실패를 본 뒤 구현한다(plan 작업 순서 1~7). 작업 3 에서는 권한 시험 셋이 회수 전에 실패하는 것을 보고 그 출력을 보고에 적는다(작업 4 뒤 통과).
- 시험 이름은 plan '증명' 표의 이름을 글자 그대로(AC-N5 · AC-N7 · AC-7g 로 시작하는 것, 접두 없는 것 그대로).
- 설계 숫자(시간대 · 경계 시각 · 쿠키 일수 · 횟수 · 분)는 `tests/fixtures/settings.ts` 에서 읽는다. 코드 · 시험에 박지 않는다. 연결 수 · 시간 상한 같은 기술 값은 파일 위 이름 붙인 상수.
- 한 시계: `Date.now()` · 인자 없는 `new Date()` 는 `src/server/clock/index.ts` 에만. DB 열 기본값에 now() · CURRENT_TIMESTAMP 금지. `src/core/learning-day.ts` 는 db · next · react · `src/server` 를 가져오지 않는다(`pnpm check:deps`).
- 스키마 파일은 `server-only` 를 가져오지 않는다. `src/server/**` 는 첫 줄 `import "server-only"`.
- 비밀값 · 아이 이름 없음. 시험 DB 의 비밀번호 · 주소는 실행 때 만들고 '사용자:비밀번호@' 꼴의 문자열 틀을 저장소에 쓰지 않는다(`new URL` 속성으로 조립). `.env.example` 은 이름만.
- 마이그레이션 SQL 은 문장마다 `--> statement-breakpoint`. DROP · RENAME 금지.
- embedded-postgres 가 이 기계에서 뜨지 않으면(설치 스크립트 · 바이너리 · 포트) 우회하지 말고 BLOCKED 로 끝내며 보고에 오류 전문을 적는다.
- 모호하면 지어내지 말고 보고 '요청하는 변경'에 적는다. 정본과 다르게 해야 하면 멈추고 NEEDS_CONTEXT.

## 끝나면
CI 와 같은 순서로 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(missing-test 66 → 63) → `pnpm check:bundle`(build 뒤), 그리고 비밀값 grep(`git grep -nE 'postgres(ql)?://[^/[:space:]]+:[^@[:space:]]+@' -- . ':!pnpm-lock.yaml'` 0건). `drizzle/0000_*.sql` 의 `CREATE TABLE` · `ENABLE ROW LEVEL SECURITY` 수(29 · 29)와 `now()` · `CURRENT_TIMESTAMP` 수(0)를 `grep -c` 로 보고에. 보고 `task-p03a-report.md`: 바뀐 파일:줄(공용 변경 포함), 설계와 다르게 한 것과 이유, 요청하는 변경, 시험 이름 전부, 명령과 출력(통과 수 · spec-trace 요약 · 작업 3 의 회수 전 실패 출력 · embedded-postgres 판과 시작 시간), 남은 우려. 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED, 그 뒤 요지 8줄 안쪽. 끝낼 때 Stop 관문이 `biome ci` 와 단위 시험을 돈다. 실패하면 시험을 지우지 말고 고친다.
