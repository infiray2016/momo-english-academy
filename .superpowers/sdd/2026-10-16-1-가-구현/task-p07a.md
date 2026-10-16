# 브리프: P7a 적재 · 판 규칙(implementer impl-p07a · Opus · high)

역할: implementer(Opus · high). plan-p07a 가 정한 새 파일 열(`src/core/seed/version-pick.ts` · `settings-compare.ts`, `src/server/seed/load.ts` · `read.ts`, `scripts/seed-load.ts`, `tests/fixtures/seed/loadable.ts`, `tests/unit/version-pick.test.ts` · `settings-compare.test.ts`, `tests/integration/seed-load.test.ts` · `seed-version.test.ts`)과 공용 변경 하나(`package.json` scripts `seed:load`, 글자 그대로)만 만들고 고친다. 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 검토는 하지 않는다(code-reviewer 가 따로). 하위 에이전트 · 커밋 없음. 실제 DB(Supabase) 접속 없음 — 시험용 Postgres(embedded-postgres)만. 비밀값 · 아이 이름 없음(출력에 접속 문자열을 내지 않는다).

## 자리
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p07`(브랜치 `feature/1a-p07-seed-load`, 바탕 `feature/1a-p09a-ai-client` 01ff0a9 = P3a + P4c + P9a — 컨트롤러가 만들어 두었다). 모든 파일은 여기에. 시작 전 `pnpm install --frozen-lockfile`.
- 정본 · plan 은 메인 저장소 `/Users/hikaru/workspace/momo-english-academy/` 에서 읽는다: plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p07a-적재-판.md`(approved, 머리 '컨트롤러 결정' — 정할 것 가~파 판정은 13절 C68 (1)~(5)), 13절 C68 · C50 (4) · C56 (4) · C61 (2) · C63 · C66(`specs/10-결정-기록.md`), 정본 5절(`specs/04-데이터.md` 시드 판 · 적재 · 설정값 시드 문단) · 6.3 완전성(`specs/06-시드-생성.md`) · 9절 단위 · 통합(`specs/08-테스트와-기술.md`) · 11절 (4) · (4-1) · 12절 머리 두 문단 · seed.* · ai.*(`specs/09-설정값.md`) · AC-17a · 17b · 7e · 7g · 8i(`specs/11-요구사항과-수용-기준.md`).
- 명령은 워크트리에서 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 한글 경로는 명령 인자로 넘기지 않고 보고는 Write 도구로. 도구 층이 `\uXXXX` 를 글자로 바꾸므로 이스케이프는 바이트로 확인한다. 통합 시험 `pnpm test:int` 는 embedded-postgres(첫 시작 약 4초). Drizzle 코드는 설치판 `node_modules/drizzle-orm` 형 정의를 먼저 본다(트랜잭션 · onConflictDoNothing · 묶어 넣기).

## 먼저 읽을 것
1. plan-p07a 전부 — 목표 · 바뀌는 파일 · 요청하는 공용 변경 1 · 파일별 값 1~6 · 작업 순서 1~7 · 위험 1~13 · 정할 것 가~파(판정은 C68) · 제약 · 다른 P 에 넘길 것 · 확인한 사실과 출처 · 증명 표(시험 이름 글자 그대로).
2. 13절 C68 — (1) 1-가 개발용 적재 범위(영역 셋 · 규격만 적재 `--reference-only`) (2) 판 적재 규칙(같은 칸 · 판 · 다른 내용 실패, 새 개정 · 열린 묶음의 새 칸은 DB 최대 개정 초과, 정정 규칙, vocab · images 제자리 고침, model_prices 더하기만, 설정 판 하나 · 이력은 고친 행 · 출처 seed_load) (3) seed/reviews 는 읽지 않음 (5) 세션 풀러 `MIGRATION_DATABASE_URL` · `node --conditions=react-server --import tsx` · 자문 잠금.
3. 바탕 코드(이 워크트리): P4c `src/core/seed/validate.ts`(`validateSeed` · `exitCodeOf` · `collectCells` · `cellHash` · `canonicalJson` · `readSeedTree` · `REQUIRED_FILES`, `areas: []` = 규격만 검증) · `structure.ts`(SEED_FILES · 상수) · `schema/*.ts` · `tests/fixtures/seed/builders.ts`(`miniSeed`); P3a `src/db/schema/*`(시드 표 다섯의 판 열 · 유일 제약, vocab · images · model_prices · settings · settings_history) · `src/server/db/index.ts`(`getDb` · `createDb`) · `src/server/settings/index.ts` · `src/server/clock/index.ts` · `src/core/learning-day.ts` · `tests/integration/{global-setup,test-db}.ts`(`createTestDatabase` · `seedSettings`) · `tests/fixtures/settings.ts`(`TEST_SETTINGS`); P9a `src/core/ai/combo.ts`(`checkSettingsCombos` · `capabilitiesOf`) · `cost.ts`(`priceRowsOfSeed` · `priceBookOf`) · `src/server/ai/store.ts`(`loadPriceBook`) · `tests/fixtures/ai/*`(`MODEL_PRICES_FIXTURE`).
4. 장부 `ledger-open.md` 의 P7 행(check-ids 허용 목록은 P7b 몫 — 이 plan 에선 읽기만).

## 만들 것(plan 작업 순서 1~7)
1. [검증] 판 고르기 · 판 적재 규칙(시험 먼저): `tests/unit/version-pick.test.ts` → `src/core/seed/version-pick.ts`(값 1). 완료: 시험 통과 · `pnpm check:deps` 0.
2. [검증] 설정값 시드 견주기(시험 먼저): `tests/unit/settings-compare.test.ts` → `src/core/seed/settings-compare.ts`(값 2).
3. [검증] 적재 시험용 자료: `tests/fixtures/seed/loadable.ts`(값 6 — miniSeed + 모든 설정 + P9a 시험용 단가표, `withCellVersion` · 풀이 기록 해시 다시 셈 · 프로필 · 세션 넣기 도우미). 완료: `loadableSeed()` 가 `validateSeed(… complete, through 1)` 오류 0 · 빈 칸 0(시험 하나로 고정).
4. [DB][서버] 적재 함수(시험 먼저): `tests/integration/seed-load.test.ts` 의 AC-17b · AC-7e · AC-7g · AC-8i · 5절 줄 → `src/server/seed/load.ts`(값 3 `loadSeed`: 검증 → 계획 → 조합 · 관계 검사 → 한 트랜잭션 → 보고). 완료: `pnpm test:int` 전체 통과.
5. [DB][서버] 판 고르기 읽기(시험 먼저): `tests/integration/seed-version.test.ts`(AC-17a) → `src/server/seed/read.ts`(값 4, 읽기 함수 여섯 · `currentSeedRevision`).
6. [검증] 명령: 공용 변경 1 을 `package.json` 에 옮긴 뒤 `scripts/seed-load.ts`(값 5). 실기 (가) 시험 안에서 `tests/.tmp/` 의 `loadableSeed` 나무로 `--dry-run` · 실제 · 다시 한 번 돌린 첫 줄을 보고에 (나) 터미널에서 `MIGRATION_DATABASE_URL` 없이 `pnpm seed:load --root tests/.tmp/<나무>` 가 2 로 끝나고 접속 문자열 · 값을 내지 않는지(조건 플래그로 `server-only` 를 넘는지도 이것으로). 바탕에 `seed/`(P6a)가 없으므로 '규격만 적재' 시험은 건너뜀으로 보고.
7. [검증] 마무리: `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, `grep -rn "sk-ant-\|postgres://\|postgresql://" src tests scripts` 가 이 작업 파일에서 접속 문자열 값 0건(시험이 만드는 주소는 실행 때). 완료: 출력이 보고에 있고 missing-test 가 시작 때보다 셋 적다(AC-17a · 17b · 7e).
하지 않는 것: 작업 8(검토 · 커밋 — 컨트롤러 · 요청자), P7b(CI 작업 셋 · check-ids · db-ping · 개발용 DB), 마이그레이션, P4 · P9a 파일 수정, 공용 파일은 위 하나 밖, 정본 · plan 수정, seed/reviews 읽기, 실제 DB 접속.

## 지킬 것
- 시험 이름은 plan 증명 표 글자 그대로(spec-trace 가 AC-17a · 17b · 7e · 7g · 8i 를 센다). 설계 숫자는 시험용 자료(`loadableSettings` · `TEST_SETTINGS` · `MODEL_PRICES_FIXTURE`)에서 읽는다. 묶음 행 수 · 잠금 이름 같은 기술 값은 파일 위 이름 붙인 상수.
- `src/core/seed` 는 순수(core-no-framework · core-no-io). `src/server/seed` 는 `import "server-only"`, DB 는 `getDb` 로만(db-only-from-server). 시각은 한 시계에서 읽어 순수 함수에 인자로, SQL 안 now() 금지.
- 적재는 행을 지우지 않는다(5절). 검증 실패 칸이 하나라도 있으면 한 행도 넣지 않는다. 같은 판 두 번은 행 수가 같다. 보고 꼴 `--json` version 1.
- 코드 식별자 영어(브랜치 · 파일 이름 ASCII), 주석 · 보고 한국어(용어: 영역 · 단계 · 단원 · 활동 · 판 · 칸 · 개정 · 정정).

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/task-p07a-report.md`(워크트리, Write 도구): 상태 · 바뀐 파일 · 시험 수(단위 200 · 통합 30 → 새 수, spec-trace 52 → 49) · 작업 7 명령과 출력 첫 줄 · 작업 6 실기 출력 · 계획과 다르게 한 것 · 남긴 것 · 검토자에게 알릴 것 · P7b 에 넘길 것. 마지막 메시지는 상태(DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED) + 요약 한 줄.
