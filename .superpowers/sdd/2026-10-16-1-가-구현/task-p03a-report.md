# 구현 보고: P3a DB · 시계 · 설정 읽기(implementer · Opus · high)

브리프 `task-p03a.md` · plan `plan-p03a-DB-시계-설정.md`(approved 18:2x, C55 · C56 · C57). 작업 순서 1~7 과 8 (가)를 했다. 8 (나) 검토 · (다) H3 · (라) 커밋은 하지 않았다. git 쓰기 명령은 쓰지 않았다.
작업 폴더: 격리 워크트리 `.claude/worktrees/agent-a4f928c00fc43a1e8`(바탕 a28ee9f).

## 바뀐 파일

### 새 파일(손으로 쓴 것 16)
| 파일 | 줄 | 내용 |
|---|---|---|
| `drizzle.config.ts` | 1-19 | 파일별 값 1 글자 그대로 |
| `src/db/schema/content.ts` | 1-398 | 열거형 27 · 시드 테이블 8(level_specs · unit_specs · images · vocab · placement_items · lessons · level_test_items · model_prices) |
| `src/db/schema/learning.ts` | 1-340 | 학습 테이블 13 |
| `src/db/schema/operations.ts` | 1-210 | 운영 테이블 8 |
| `drizzle/0001_api_roles_revoke.sql` | 1-13 | `drizzle-kit generate --custom --name=api_roles_revoke` 로 만든 빈 파일에 파일별 값 4 를 글자 그대로 |
| `src/server/db/index.ts` | 1-53 | `POOL_MAX`(3) · `schema` · `DbNotConfiguredError` · `createDb` · `Db` · `getDb`(globalThis 에 주소와 함께, 주소가 바뀌면 앞 연결을 닫고 새로) |
| `src/core/learning-day.ts` | 1-62 | `learningDayOf(instant, timeZone, dayStartHour)` |
| `src/server/settings/index.ts` | 1-112 | `getSettings` · `getSetting` · `SettingMissingError` · `SettingInvalidError` · `appTimezoneSchema` · `appDayStartHourSchema` |
| `src/server/clock/index.ts` | 1-62 | `readShiftDays` · `createClock` · `appClock` · `now` · `ClockConfigError`. 저장소에서 `Date.now()` 를 부르는 유일한 파일 |
| `tests/integration/global-setup.ts` | 1-138 | embedded-postgres · Supabase 역할 · 기본 권한 흉내 · migrate · provide |
| `tests/integration/test-db.ts` | 1-81 | `createTestDatabase` · `seedSettings` |
| `tests/integration/rls-grants.test.ts` | 1-292 | AC-N5 · 마이그레이션 정적 검사 · 스키마 제약 · DB 연결 |
| `tests/integration/settings.test.ts` | 1-198 | 설정 읽기 5 |
| `tests/integration/clock.test.ts` | 1-211 | AC-7g 6 |
| `tests/fixtures/settings.ts` | 1-9 | 파일별 값 11 글자 그대로 |
| `tests/unit/learning-day.test.ts` | 1-170 | AC-N7 5 · 한 시계 정적 검사 1 |

### drizzle-kit 이 만든 파일(손으로 고치지 않음)
`drizzle/0000_initial_schema.sql`(515줄) · `drizzle/meta/_journal.json`(항목 둘) · `drizzle/meta/0000_snapshot.json` · `drizzle/meta/0001_snapshot.json`.

### 공용 변경(plan '요청하는 공용 변경' 1~7)
| # | 파일:줄 | 바꾼 것 |
|---|---|---|
| 1 | `package.json:51` · `:57-62` · `pnpm-lock.yaml` | dev 의존 `"embedded-postgres": "17.10.0-beta.17"`(`pnpm add -D -E`), `pnpm.onlyBuiltDependencies` 에 `@embedded-postgres/darwin-arm64` · `@embedded-postgres/linux-x64`. lock 에 두 플랫폼 꾸러미가 다 있다(321 · 357행) |
| 2 | `package.json:15-17` | `test:int`(`--passWithNoTests` 뺌) · `db:generate` · `db:migrate` |
| 3 | `vitest.config.mts:1-16` · `:32-33` | 뿌리 `resolve.alias` 의 server-only → 빈 모듈, integration 에 `globalSetup` 과 `testTimeout: INTEGRATION_TEST_TIMEOUT_MS`(30초, 파일 위 상수) |
| 4 | `.github/workflows/ci.yml:81-91` | integration 작업의 `if: ${{ false }}` 를 빼고 준비 네 줄 + `pnpm test:int` |
| 5 | `.env.example:4-5` | `# 마이그레이션 접속 문자열(서버 전용, 세션 풀러 5432) — P3` · `MIGRATION_DATABASE_URL=` |
| 6 | `biome.json:19-20` | `files.includes` 에 `"!drizzle"` |
| 7 | `.dependency-cruiser.cjs:34-41` · `tests/unit/dependency-rules.test.ts:41-44` · `:174-189` · `:229-232` | 규칙 `db-only-from-server`. 시험: 막는 예 한 줄 · 허용 예 한 줄, 정규식 표에 한 칸 |

## 설계와 다르게 한 것과 이유

1. vitest 별칭 값(공용 변경 3). plan 글자는 `"server-only": "server-only/empty.js"` 인데 그대로 두면 Vite 가 꾸러미 exports 를 지켜 `"./empty.js" is not exported under the conditions ["node", "development", "import"]` 로 시험 파일을 읽지 못한다(작업 3 첫 실행에서 확인). 그래서 같은 파일을 경로로 준다: `fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url))`. 뜻(빈 모듈로 바꾸기, 두 프로젝트 공통)은 같다.
2. `db-only-from-server` 의 from 에서 `src/core/` 도 뺐다(`pathNot: "^src/(server|db|core)/"`). `src/core` 는 core-no-framework 가 이미 `src/db` · drizzle-orm · postgres 를 막아, 두 규칙이 같은 줄을 두 번 보고하면 기존 시험(`uses-drizzle.ts` · `uses-db.ts` 가 `["core-no-framework"]` 하나만 기대)이 깨진다. 막히는 범위는 plan 문장('src/server · src/db 밖은 가져오지 않는다')과 같다. 규칙 comment 에 적었다.
3. 의존 규칙 시험에 정규식 표 한 칸(`db-only-from-server`: drizzle-orm · postgres 는 받고 postgres-array · drizzle-zod · zod 는 안 받음)을 더했다. 브리프는 막는 예 · 허용 예 한 줄씩이라 이 한 칸은 넘친 것이다. 기존 표의 꼴을 따라 정규식이 비슷한 이름을 잘못 잡지 않는지 보려고 넣었다.
4. 첫 마이그레이션 이름. plan 은 `pnpm db:generate` 이고 이름은 `0000_<이름>` 이다. 무작위 이름 대신 `pnpm db:generate --name=initial_schema` 로 `0000_initial_schema.sql` 을 만들었다.
5. 확인 제약 범위. 공통 규칙 '`level >= 1` · `unit >= 0` · 시드 판 `>= 0` 만 둔다'를 시드 테이블에 더해 level · unit 열이 있는 학습 테이블(profile_tracks · sessions · level_tests · unit_progress · badges)과 시작 개정 열(level_tests · unit_progress 의 start_revision), vocab.band_level 에도 같은 꼴로 넣었다. 단계 · 단원 수(12 · 5)는 넣지 않았다. 비울 수 있는 열은 NULL 이면 통과한다. 넘친 것으로 보면 빼도 된다(같은 브랜치에서 아직 적용 전이라 0000 을 다시 만들면 된다).
6. 설정 읽기 쪽 Zod 규격 둘(`appTimezoneSchema` · `appDayStartHourSchema`)을 `src/server/settings/index.ts` 에서 내보낸다. plan 은 '키별 Zod 규격은 부르는 쪽이 넘긴다'이고 이 둘을 '이 plan 이 쓰는 키와 규격'으로 적었다. 부르는 쪽(clock 시험 · 뒤의 P10)이 같은 규격을 다시 쓰지 않게 한 곳에 뒀다. 시드 settings.json 규격(P4 · P6)과는 겹치지 않는다.
7. `getSettings` 의 질의 꼴. plan 은 `key = ANY(…)` 인데 Drizzle 의 `inArray`(`key in (…)`)로 썼다. 질의 한 번이고 뜻은 같다. `profileId` 가 없으면 `profile_id IS NULL` 만 읽는다.

## 요청하는 변경(공용 파일 · 설계)

- 공용 변경 3 의 plan 글자를 위 1 의 꼴로 고치기를 권한다(다른 워크트리와 합칠 때 같은 문제가 난다).
- 없음(그 밖). 정본과 다르게 한 것은 없다.

## 시험 이름(새로 더한 것 전부)

단위 `tests/unit/learning-day.test.ts`
- AC-N7 자정 앞뒤(23시 50분 · 0시 10분)는 같은 학습일이다
- AC-N7 경계(app.day_start_hour) 10분 뒤는 다음 학습일이다
- AC-N7 경계 10분 앞(새벽 3시 50분)에 끝낸 수업은 전날 학습일이다
- AC-N7 학습일은 app.timezone 의 벽시계로 센다(같은 순간의 UTC 날짜와 다를 수 있다)
- AC-N7 틀린 시간대 · 경계 시각은 RangeError 다
- 한 시계: src/core · src/server · src/db · src/proxy.ts 에서 Date.now() · 인자 없는 new Date() 는 src/server/clock 에만 있다

단위 `tests/unit/dependency-rules.test.ts`(더한 것)
- 의존 규칙: src/app 이 별칭 @/db 를 가져오면 db-only-from-server 위반
- 의존 규칙: src/server 가 src/db · drizzle-orm 을 가져오는 것은 허용
- (기존 '의존 규칙: 패키지 정규식이 …' 의 표에 db-only-from-server 칸)

통합 `tests/integration/rls-grants.test.ts`
- AC-N5 public 의 테이블 29개가 모두 RLS 켜짐이고 스키마의 테이블 목록과 같다
- AC-N5 anon · authenticated 는 public · drizzle 의 테이블 · 시퀀스 · 함수 권한이 없다
- AC-N5 anon · authenticated 로 바꿔 조회하면 모든 테이블이 권한 오류(42501)다
- AC-N5 기본 권한도 회수되어 새로 만든 테이블에 anon · authenticated 권한이 붙지 않는다
- 마이그레이션: drizzle/*.sql 에 DROP TABLE · DROP COLUMN · DROP TYPE · DROP SCHEMA · RENAME 이 없다
- 스키마: 프로필 × 영역마다 진행 중 세션은 하나다(부분 유일 색인)
- 스키마: 집 전체 설정 행은 profile_id 가 비어 있다(확인 제약)
- 스키마: PIN 행은 하나뿐이다
- DB 연결: 트랜잭션 풀러용으로 prepare 를 끈다
- DB 연결: DATABASE_URL 이 없으면 DbNotConfiguredError
- DB 연결: DATABASE_URL 이 바뀌면 새 연결을 만든다

통합 `tests/integration/settings.test.ts`
- 설정 읽기: 집 전체 키는 profile_id 가 빈 행을 읽는다
- 설정 읽기: 프로필 키는 그 프로필 행을 먼저, 없으면 기본 행을 읽는다(B5-19)
- 설정 읽기: 없는 키는 SettingMissingError 이고 코드 기본값으로 메우지 않는다
- 설정 읽기: 값이 규격에 어긋나면 SettingInvalidError 다
- 설정 읽기: 여러 키를 질의 한 번으로 읽는다

통합 `tests/integration/clock.test.ts`
- AC-7g 프리뷰(VERCEL_ENV=preview)는 CLOCK_SHIFT_DAYS 만큼 시계와 학습일이 넘어간다
- AC-7g 운영 배포(VERCEL_ENV=production)는 CLOCK_SHIFT_DAYS 를 읽지 않는다
- AC-7g VERCEL_ENV 없는 next start · next dev 도 당기지 않는다
- AC-7g 잘못된 CLOCK_SHIFT_DAYS(음수 · 소수 · 글자)는 시계를 만들 때 오류다
- AC-7g 기록 시각 · 학습일은 앱 시계 값 그대로 sessions 에 저장된다
- AC-7g 어느 열의 기본값에도 현재 시각 함수(now() · CURRENT_TIMESTAMP 등)가 없다

## 명령과 출력

명령 앞머리: 이 워크트리의 샌드박스가 `source ~/.nvm/nvm.sh` 를 '검증할 수 없는 문자열 실행'으로 막아서, `nvm use` 와 같은 판(.nvmrc 24 → 설치된 v24.22.0)의 bin 을 `export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH` 로 앞에 붙여 돌렸다. node v24.22.0 · pnpm 10.34.7.

embedded-postgres: `embedded-postgres@17.10.0-beta.17` · `@embedded-postgres/darwin-arm64@17.10.0-beta.17`. 설치 때 `postinstall$ node scripts/hydrate-symlinks.js … Done`, 꾸러미 폴더 `native/bin` 에 initdb · pg_ctl · postgres 가 있다. 시작 시간(initialise + start): 처음 4049ms, 그 뒤 492~579ms(global-setup 이 `[global-setup] 시험용 Postgres 시작 …ms` 로 찍는다).

작업 1 — `pnpm db:generate --name=initial_schema`: `29 tables` … `[✓] Your SQL migration file ➜ drizzle/0000_initial_schema.sql`. 빈 `MIGRATION_DATABASE_URL` 로 generate 는 멈추지 않았다(plan 의 추측대로).
`grep -c` (`drizzle/0000_initial_schema.sql`): `CREATE TABLE` 29 · `ENABLE ROW LEVEL SECURITY` 29 · `now()` 0 · `CURRENT_TIMESTAMP` 0.

작업 3 — 회수 전 `pnpm test:int`(rls-grants 만 있던 때, Supabase 흉내 기본 권한이 붙은 상태):
```
[global-setup] 시험용 Postgres 시작 503ms
 ❯ |integration| tests/integration/rls-grants.test.ts (11 tests | 3 failed) 276ms
   ❯ AC-N5 DB 접근 제어 (4)
     × AC-N5 anon · authenticated 는 public · drizzle 의 테이블 · 시퀀스 · 함수 권한이 없다 11ms
     × AC-N5 anon · authenticated 로 바꿔 조회하면 모든 테이블이 권한 오류(42501)다 27ms
     × AC-N5 기본 권한도 회수되어 새로 만든 테이블에 anon · authenticated 권한이 붙지 않는다 3ms
 FAIL … 권한이 없다: AssertionError: expected [ Array(464) ] to deeply equal []
   + { "grantee": "anon", "name": "public.level_specs" }, …
 FAIL … 권한 오류(42501)다: AssertionError: expected [ 'anon ai_calls null', …(57) ] to deeply equal [ 'anon ai_calls 42501', …(57) ]
 FAIL … 기본 권한도 회수되어 …: AssertionError: expected [ Array(24) ] to deeply equal []
   + { "grantee": "anon", "name": "grant_probe" }, …
      Tests  3 failed | 8 passed (11)
```
(그 앞 실행 둘은 시험 쪽 문제였다: server-only 별칭 — 위 '다르게 한 것' 1, Drizzle 이 드라이버 오류를 `cause` 에 감싸 오류 코드를 못 읽음 — 시험의 `errorCode` 가 cause 도 보게 고침.)

작업 4 뒤 `pnpm test:int`: `Tests  11 passed (11)`.
작업 5 — 구현 전 `learning-day.test.ts` 는 모듈이 없어 실패, 구현 뒤 AC-N7 다섯 통과(한 시계 정적 검사는 시계 파일이 생긴 작업 7 뒤 통과).
작업 6 — 구현 전 settings 시험은 모듈이 없어 실패, 구현 뒤 5 통과. 작업 7 — 구현 전 clock 시험은 모듈이 없어 실패, 구현 뒤 통과.

작업 8 (가) CI 순서:
| 명령 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | Done |
| `pnpm exec biome ci .` | Checked 38 files. No fixes applied(오류 0) |
| `pnpm build` | 성공(`/` · `/_not-found` 정적). 덧붙여 `pnpm exec tsc --noEmit` 도 오류 0 |
| `pnpm test` | Test Files 6 passed · Tests 57 passed |
| `pnpm test:int` | Test Files 3 passed · Tests 22 passed(시작 579ms, 전체 1.44s) |
| `pnpm check:deps` | no dependency violations found (19 modules, 24 dependencies cruised) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0. `15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 24 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 63`(66 → 63, AC-N5 · AC-N7 · AC-7g 줄이 빠짐) |
| `pnpm check:bundle` | 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 6 · 대조한 값 0 · 위반 0 |
| `git grep -nE 'postgres(ql)?://[^/[:space:]]+:[^@[:space:]]+@' -- . ':!pnpm-lock.yaml'` | 0건. 아직 추적되지 않은 새 파일은 같은 정규식을 `grep -rnE` 로 src · tests · drizzle · 설정 파일에 돌려 0건 |

## 남은 우려

1. Drizzle 의 jsonb 읽기는 문자열 값이 JSON 으로 읽히면 한 번 더 푼다(설치판 `pg-core/columns/jsonb.js` `mapFromDriverValue`). 그래서 settings 에 문자열 `"4"` 를 넣으면 숫자 4 로 읽힌다(시험 '규격에 어긋나면'을 처음에 문자열로 짰다가 이 때문에 정수 아닌 수로 바꿨다). 지금 키(시간대 이름 등)는 영향이 없지만, 숫자처럼 보이는 문자열 값을 갖는 키가 생기면 규격 검사를 빠져나갈 수 있다. P6 · P7(settings.json 적재) 때 알아 둘 것.
2. CI(ubuntu-24.04)에서 embedded-postgres 가 뜨는지는 원격이 없어 보지 못했다(추측: GitHub 러너는 root 가 아니라 뜬다). H15 뒤 첫 `ci / integration` 이 증명한다.
3. 실제 Supabase 의 기본 권한은 global-setup 의 흉내(`public` 의 표 · 시퀀스 · 함수 기본 권한 + 스키마 USAGE)와 다를 수 있다. H3 뒤 개발용 DB 에서 P3b 의 Data API 확인이 실물로 본다.
4. `getDb` 는 주소가 바뀌면 앞 연결을 `end()` 로 닫는다. 실제 서버에서는 주소가 바뀌지 않지만, 바뀌는 순간 앞 연결로 돌던 질의는 끝날 때까지 기다린 뒤 닫힌다.
5. `appClock` 은 모듈을 읽을 때 만들어지므로 프리뷰에서 `CLOCK_SHIFT_DAYS` 가 틀리면 시계를 가져오는 모든 요청이 실패한다(plan '시계를 만들 때 오류'의 뜻대로). H13 안내에 적을 것.
6. Turbopack 이 proxy 층에서 `server-only` 를 빈 모듈로 바꾸는지는 이 plan 에서 보지 않았다(시계를 가져오는 곳이 아직 없다). P3b 작업 4 의 `pnpm build` 가 본다(plan 위험 8).
