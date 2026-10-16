# 검토 브리프 A1: P3a 스키마 · 마이그레이션 · DB 연결 · 시험용 Postgres · RLS · 공용 변경(code-reviewer · Opus · xhigh, 읽기 전용)

구현자 impl-p03a 가 격리 워크트리에서 끝낸 P3a 가운데 **작업 1~4 의 파일과 공용 변경 일곱**을 설계 준수와 품질로 판정한다. 작업 5~7(학습일 · 설정 읽기 · 시계)은 다른 검토자(A2, `task-p03a-review-a2.md`)가 나란히 본다 — 그 파일은 가져오기 관계를 볼 때만 읽고 지적하지 않는다. 첫 검토라 닫힌 장부는 없다. 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p03a-a1.md`(메인 저장소).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a4f928c00fc43a1e8`(바탕 a28ee9f, 브랜치 `feature/1a-p03a-db-clock`). 새 파일: `drizzle.config.ts` · `src/db/schema/{content,learning,operations}.ts` · `drizzle/0000_initial_schema.sql`(drizzle-kit 생성, 515줄) · `drizzle/0001_api_roles_revoke.sql` · `drizzle/meta/*` · `src/server/db/index.ts` · `tests/integration/{global-setup,test-db}.ts` · `tests/integration/rls-grants.test.ts`. 고친 공용 파일: `package.json` · `pnpm-lock.yaml` · `vitest.config.mts` · `.github/workflows/ci.yml` · `.env.example` · `biome.json` · `.dependency-cruiser.cjs` · `tests/unit/dependency-rules.test.ts`(`git -C <워크트리> diff` 로 본다). `tests/unit/gate-probe.test.ts` 가 잠깐 보이면 컨트롤러의 관문 실기 확인용이라 무시한다.
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p03a-report.md`('설계와 다르게 한 것' 1~7 가운데 1~5 가 이 몫, '남은 우려' 1~4 · 6).
- 명령은 읽기와 시험 실행만. `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm test:int`(embedded-postgres 가 뜬다, 약 1.5초) · `pnpm test` · `pnpm check:deps`. 컨트롤러 재확인(20:1x): biome 0 · 단위 57 · 통합 22 · deps 0 · build · bundle 0 · spec-trace missing-test 63 · 비밀값 grep 0 · 0000 SQL 에 CREATE TABLE 29 · RLS 29 · now() 0.

## 대조할 정본 · plan(메인 저장소 `/Users/hikaru/workspace/momo-english-academy`)
1. plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p03a-DB-시계-설정.md`: 목표, 바뀌는 파일, '요청하는 공용 변경' 1~7(3 은 20:1x 에 경로 꼴로 고침), '파일별 값' 1(drizzle.config) · 2(스키마 공통 규칙 — 특히 vocab 은 `id uuid` 대리 키 + 유니크 `word`, 시각 열 기본값 없음, 외래 키 지울 때 동작, 확인 제약 범위) · 3(열거형 표와 테이블 29 표) · 4(0001 SQL) · 5(db/index) · 9(global-setup) · 10(test-db), 위험 1~8 · 13, '컨트롤러 결정(승인 때)'와 '구현 뒤(20:1x)' 문단, 증명 표(AC-N5 · 더하기만 · 5절 제약 · 10절 DB · 공통).
2. 정본 `specs/04-데이터.md` 5절 테이블 29 행(C54 · C56 반영 뒤 판), `specs/08-테스트와-기술.md` 10절 DB · 접근 제어 행, `specs/10-결정-기록.md` C54 (3) · C55 (1) · (2) · C56, `specs/11-요구사항과-수용-기준.md` AC-N5 · NFR-5.
3. 구현 브리프 `.superpowers/sdd/2026-10-16-1-가-구현/task-p03a.md`.
4. P4a 가 정한 시드 영어 값(워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3/src/core/seed/structure.ts` 의 `LESSON_KINDS` · `ASK_KINDS` · 품사 등)과 DB 열거형이 같은지(C54 (3)).

## 판정할 것
1. 스키마 1:1. 테이블 29 가 plan 표 · 5절 행과 맞는지 — 열 이름 · 꼴 · 비울 수 있음 · 기본값(시각 기본값 0, 상수 기본값만) · 외래 키의 지울 때 동작(따라 · 막음 · 비움) · 유일 · 부분 유일 · NULLS NOT DISTINCT · 확인 제약. vocab 이 `id uuid` + 유일 `word`, vocab_progress.vocab_id uuid, unit_specs.target_vocab text[]. 열거형 27 의 값이 plan 표 · C54 (3) · P4a `structure.ts` 와 같은지. snake_case 열 이름 · camelCase 속성. `.enableRLS()` 29.
2. 마이그레이션. 0000 이 스키마에서 나온 그대로인지(손으로 고친 흔적 없음), statement-breakpoint, 0001 이 plan 값 4 글자 그대로인지, journal 항목 둘, DROP · RENAME 없음(정적 검사 시험이 실제로 파일을 읽는지).
3. 시험용 Postgres(global-setup · test-db). Supabase 흉내(역할 셋 · USAGE · 표 · 시퀀스 · 함수 기본 권한)가 plan 값 9 대로이고 실제 Supabase 기본과 다를 수 있는 곳이 어디인지(남은 우려 3), 본 DB 복사(TEMPLATE) 전 연결 닫기, 파일마다 DB 만들고 지우기, 포트 · 비밀번호를 실행 때 만들고 '사용자:비밀번호@' 꼴을 저장소에 쓰지 않는지, `provide` · `inject` 형, 끝낼 때 stop · 폴더 삭제, 실패 때 자원 누수.
4. rls-grants 시험의 실체. 권한 0 확인이 information_schema 를 보고, 42501 확인이 실제로 `SET ROLE anon` 으로 조회하는지, 기본 권한 회수 확인이 새 표를 만들어 보는지, 회수 전 셋이 실패했다는 보고(3 failed / 8 passed)와 코드가 맞는지, 테이블 목록 29 를 스키마에서 읽는지(하드코딩 아님), `errorCode` 가 cause 를 보는 꼴.
5. DB 연결(db/index). `prepare: false`, `POOL_MAX` 상수, 모듈 읽기 때 연결 안 함, `getDb` 의 globalThis 주소 비교와 앞 연결 `end()`(남은 우려 4), `DbNotConfiguredError`, `Db` 형, 서버 함수가 `{ db = getDb() }` 를 받는 꼴(설정 읽기는 A2 몫이지만 꼴만 확인).
6. 공용 변경 일곱이 plan 글자대로인지. package.json(의존 정확한 판 · onlyBuiltDependencies 둘 · scripts 셋), 잠금 파일에 두 플랫폼 꾸러미, vitest.config(별칭 경로 꼴 — 다르게 한 것 1, globalSetup, testTimeout 상수), ci.yml integration 작업(다른 작업과 같은 준비 네 줄, `if` 제거), .env.example 두 줄, biome `!drizzle`, 의존 규칙 `db-only-from-server`(from 에서 src/core 제외 — 다르게 한 것 2, 막는 범위가 plan 문장과 같은지)와 시험 둘 + 정규식 칸(다르게 한 것 3).
7. 구현자 '다르게 한 것' 1~5 각각 판정(1 · 2 는 컨트롤러 수용 — 맞는지만, 3 · 4 · 5 는 수용 · 고칠 것). 5(확인 제약을 학습 테이블 · vocab.band_level 까지 넓힘)는 plan 공통 규칙('level ≥ 1 · unit ≥ 0 · 시드 판 ≥ 0 만 둔다')의 뜻과 맞는지, 되돌릴 일인지.
8. 품질. TypeScript strict, 한글 식별자 없음, 비밀값 없음, 시험이 느리지 않은지(통합 1.5초), 설계 숫자 박힘 없음(기술 값은 이름 붙인 상수), 남은 우려 1~4 · 6 판정.

## 보고 꼴(`review-p03a-a1.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n).
- 지적마다 번호 · 심각도(Critical · Important · Minor) · 파일:줄 · 근거(정본 절 · plan 줄 · 문장, 외부 사실은 출처와 확인 정도) · 고치는 법 한 줄. 근거 없는 지적은 넣지 않는다.
- 표 하나: 테이블 29 마다 '맞음 · 어긋남(무엇)'. 표 하나: '다르게 한 것' 1~5 · 남은 우려 1~4 · 6 각각 '수용 · 고칠 것(근거)'. 표 하나: 증명 표의 AC-N5 · 더하기만 · 5절 제약 · 10절 DB 행마다 '시험 있음(이름) · 없음'.
- 마지막 메시지 첫 줄은 판정, 그 뒤 요지 8줄 안쪽. fix 뒤 재검토는 따로 브리프.
