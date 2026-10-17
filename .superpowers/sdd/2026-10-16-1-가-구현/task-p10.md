# 구현 브리프: P10 첫 실행 · 배치 · 홈 · 수업 목록 · 세션 틀 — 차례 1부터(implementer impl-p10 · Opus · high)

plan 둘 `intent/2026-10-15-모모-잉글리시-아카데미/plan-p10a-첫-실행-배치.md` · `plan-p10b-홈-목록-세션-틀.md`(approved, C70~C73)대로 **'화면을 보는 차례'** 순서로 구현한다. 한 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p10`, 브랜치 `feature/1a-p10-first-run-home`(바탕 `feature/1a-base-p2-p3-p4-p5b-p7` **596137a** = P5b 7644d0f + P7a df8445e, 가지 · 워크트리 · node_modules 준비됨 — lint 0 · 단위 294 · deps 0 확인). 커밋하지 않는다(H14). 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 설계 숫자는 `TEST_SETTINGS` · `loadableSettings()` · 12절 설정에서 읽는다.

## 먼저 읽을 것
1. plan-p10a 전부(앞당긴 까닭과 가정 · 화면을 보는 차례 · 바탕 브랜치 · 바뀌는 파일 · 공용 변경 · 파일별 값 · 정본 밖 문구 · 작업 순서 · 위험 · 정할 것(권함대로 승인) · 확인한 사실) 와 plan-p10b 전부. `specs/10-결정-기록.md` 13절 C70~C73(순서 · 시험용 시드 범위 · 배치 적응 규칙 일반화 · 정본 밖 문구 · PIN 구조 상수 · 문장 조립 대문자 · 쓴 답 비교).
2. 정본 4절(`specs/03-화면.md` 첫 실행 · 홈 · 수업 목록 · 배치 · 세션 공통), 3.2(`specs/02-1`) 배치 · 수업 목록, 3.5 세션 틀, 5절 테이블, 7절 마이크, 8절 네트워크 · 동시 사용 · 오래 멈춘 세션, 12절 P10 키, CLAUDE.md(아이 화면 원칙 · 포스트잇 보드 · 용어).
3. 이미 있는 코드: P3b `requireAccess` · `src/proxy.ts` · `(setup)/access`, P3a 스키마 · `getSettings` · 시계, P7a `src/server/seed/{load,read}.ts` · `tests/fixtures/seed/loadable.ts` · `scripts/seed-load.ts`, P5b `src/components/activities/*` · `src/app/dev/seed-viewer/*`, P2 음성 접점, P1b 의존 규칙 · spec-trace · check-bundle, `tests/integration/{global-setup,test-db}.ts`, `tests/e2e/access-cookie.ts`.

## 이번 몫(차례 1 — 가벼운 루프, 검토 묶음 T)
plan-p10a 작업 1: 공용 변경 1~4(package.json `db:dev` · `.gitignore` `/.dev/` · playwright.config.ts DB webServer 배열 · workers 1 · `tests/fixtures/settings.ts` P10 키) → `tests/unit/dev-tree.test.ts` → `tests/fixtures/seed/dev-tree.ts`(`devSeedTree()`: loadableSeed + 말하기 배치 본 문항 따라 말하기 + P10 설정 키) → `scripts/dev-db.ts`(`pnpm db:dev` 처음 · 다시 · `--reset`, 내장 Postgres persistent · Supabase 역할 흉내 · 마이그레이션 · 설정 · devSeedTree 적재(`loadSeed`) · `.env.local` 의 DATABASE_URL 은 로컬 주소일 때만 고치고 값은 출력하지 않음 — plan 위험 15 · 컨트롤러 검증본 참고 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/devdb/dev-pg.mts`) → `tests/e2e/db.ts`. 실기: `pnpm db:dev` 처음 · 다시 · `--reset`, `pnpm dev` 로 `/access` 제출 204, `pnpm e2e` 가 DB 를 띄워 기존 e2e 전부 초록. **완료: 실기 출력(값 없음)이 보고에 있고 접근 코드 제출 → `/` 가 된다.** 끝나면 보고 `task-p10-report.md`(워크트리 장부) '차례 1' 절 + 상태 · 요지 5줄 SendMessage → 컨트롤러 검토(Opus high · 범위 한정) 뒤 차례 2 브리프.

## 지킬 것
- C70~C73 · 12절 설정값 · 구조 상수(`structure.ts`) · 아이 이름 · 비밀값 어디에도 안 적음 · 경계 규칙 `pnpm check:deps` · spec-trace(시험 이름 AC 접두) · check-bundle(화면 묶음에 서버 변수 금지) · 한 시계 · RLS · 가족 접근 쿠키.
- 공용 파일 변경은 보고에 따로 표시. 계획과 다르게 하면 보고 '다르게 한 것'에 까닭.
