# 구현 보고: P10 첫 실행 · 배치 · 홈 · 수업 목록 · 세션 틀(impl-p10)

브리프 `task-p10.md`, plan-p10a · plan-p10b(approved, C70~C73). 워크트리 `.claude/worktrees/p10`, 가지 `feature/1a-p10-first-run-home`(바탕 596137a). 커밋하지 않음.

## 차례 1 — 개발용 로컬 DB 길 · 시험용 시드 나무 · e2e DB · 시험용 설정 키(가벼운 루프, 검토 묶음 T)

상태: DONE_WITH_CONCERNS(구현 · 시험 · 실기는 모두 초록. 우려는 아래 '알릴 것' 1 · 2 — 작업 중 컨트롤러 개발 서버를 끈 사고와 `.env.local` 손댐).

### 바뀐 파일

새 파일(손으로 쓴 것 넷):

| 파일 | 무엇 |
|---|---|
| `scripts/dev-db.ts`(604줄) | `pnpm db:dev`. 순수 꼴 `parseArgs`(:80) · `databaseUrl`(:122) · `hasEnvValue`(:162) · `planEnvLocal`(:190) · `readyLines`(:225), 실행 `startCluster`(:323) · `prepareDatabase`(:404, 역할 · DB 는 없을 때만, 기본 권한은 DB 를 만들 때, 마이그레이션은 늘) · `seedIfEmpty`(:452, content 테이블이 모두 비면 `loadSeed(devSeedTree)`) · `syncEnvLocal`(:505) · `main`(:530) · `isDirectRun`(:582). 구조 상수 `DEV_DB_PORT` 54329 · `READY_MARK` · `DB_NAMES`(momo_dev · momo_e2e) · `E2E_PASSWORD_ENV` · `ENV_LOCAL_KEYS` |
| `tests/fixtures/seed/dev-tree.ts`(72줄) | `DEV_SEED_AREAS`(:17, 읽기 · 쓰기 · 말하기) · `DEV_SEED_THROUGH`(:23 = `LOADABLE_THROUGH` 1) · `devSeedTree()`(:26 — 말하기 배치 본 문항을 그 대본 문장의 따라 말하기로, 그 칸의 풀이 검사 기록을 뺌, 예비 문항 그대로) |
| `tests/e2e/db.ts`(216줄) | `e2eDb` · `closeE2eDb` · `resetHousehold` · `withHouseholdSetting` · `cloneLessons` · `insertSessions` · `countRows` · `shiftTimes`. postgres + drizzle-orm/postgres-js + 스키마 세 파일만(server-only 없음) |
| `tests/unit/dev-tree.test.ts`(318줄) | 시험 일곱(아래) |

공용 파일 변경(요청하는 공용 변경 1~4, 글자 그대로 옮김 — 컨트롤러가 합칠 때 확인):

| # | 파일:줄 | 바꾼 것 |
|---|---|---|
| 1 | `package.json`:26~27 | `"db:dev": "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/dev-db.ts"`(seed:load 뒤 한 줄) |
| 2 | `.gitignore`:18~19 | 주석 한 줄 + `/.dev/` |
| 3 | `playwright.config.ts`:1~12 · 18~23 · 40~55 · 61 · 74~96 | `E2E_DB_PORT` 54339(내보냄) · `E2E_DB_PASSWORD` 를 실행 때 만듦(있으면 그대로) · `e2eDatabaseUrl()`(내보냄, `databaseUrl` 로 URL 속성 조립) · `workers: 1` · `webServer` 배열(첫째 `name: "e2e-db"` · `wait.stdout /DEV_DB_READY e2e/` · `reuseExistingServer: false` · `gracefulShutdown SIGTERM 10s` · `env: serverEnv`, 둘째 기존 Next 서버 + `DATABASE_URL` · `reuseExistingServer: false`) |
| 4 | `tests/fixtures/settings.ts`:67~102 | P10 키 서른셋(plan 값 2 의 목록 그대로, 12절 기본값 · 범위 집 전체 — 12절 표와 한 줄씩 대조함) |

### 덮는 시험(`tests/unit/dev-tree.test.ts`, 일곱)

- 개발용 시드 나무: 완전성 1단계 · 영역 셋에서 검증 오류 0 이고 말하기 배치 본 문항은 따라 말하기다
- 개발용 시드 나무의 설정값 시드에는 P10 이 읽는 12절 키가 모두 있고 작은 틀에 이미 있는 키는 작은 틀 값이다
- 인자 없음은 개발용, --reset 은 개발용 처음부터, --ephemeral --port 는 e2e 다
- 모르는 인자 · 포트 없는 --ephemeral · --reset 과 --ephemeral 함께 · 잘못된 포트는 거부한다
- 개발용 DB: `.env.local` 은 비었거나 로컬 주소일 때만 고친다
- 준비 줄은 표지 · 포트 · 시드 상태와 다음 할 일만 내고 접속 문자열 · 비밀번호를 내지 않는다
- 접속 문자열은 URL 속성으로 조립해 비밀번호의 특수 글자를 그대로 싣는다

시험을 먼저 쓰고 실패(모듈 없음)를 본 뒤 구현했다.

### 실행 명령과 출력(값 없음)

정적 · 시험(명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …`):

| 명령 | 결과 |
|---|---|
| `pnpm exec biome ci .` | 149 파일, 고칠 것 없음 |
| `pnpm exec tsc --noEmit -p .` | 오류 0 |
| `pnpm test` | 30 파일 · 301 통과(바탕 294 + 7) |
| `pnpm test:int` | 7 파일 · 66 통과 · 1 건너뜀(바탕과 같음 — TEST_SETTINGS 키를 더해도 깨지지 않음) |
| `pnpm e2e` | 18 통과(13.3s) — DB 를 먼저 띄우고(wait DEV_DB_READY) 기존 e2e 전부 초록. 끝난 뒤 임시 폴더 0 · 54339 · 3100 듣는 곳 0 |
| `pnpm e2e:local` | 7 통과(설정이 playwright.config 를 가져오므로 다시 돌림) |
| `pnpm check:deps` | 위반 0(87 모듈) |
| `pnpm check:bundle` | 위반 0 |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0(missing-test 줄은 바탕과 같음, 차례 1 은 AC 시험 없음) |

`pnpm db:dev` 실기(기본 포트 54329 는 컨트롤러가 띄운 DB 가 쓰고 있어 실기는 `--port 54401`, 출력 그대로):

```
== 기본 포트(쓰이는 중)
dev-db: 포트 54329 이 이미 쓰이고 있어요. 켜 둔 db:dev 가 있는지 보거나 --port 로 다른 포트를 주세요
exit=2
== 모르는 인자
dev-db: 모르는 인자예요: --wipe
exit=2
== e2e 비밀번호 없음
dev-db: E2E_DB_PASSWORD 이 없어요
exit=2

== 처음(pnpm db:dev --port 54401, 6초)
DEV_DB_READY dev port=54401 seed=loaded
.env.local 의 DATABASE_URL · MIGRATION_DATABASE_URL 을 이 로컬 DB 로 맞췄어요
다음: 다른 터미널에서 pnpm dev 를 띄우고 http://localhost:3000 을 열어요. 끄려면 Ctrl+C
  .dev/db 0700 · .dev/db/password 0600 · .env.local 0600
  DB 행 수: settings 132 · level_specs 48 · unit_specs 242 · vocab 280 · images 182 · lessons 68(읽기 24 · 쓰기 24 · 말하기 20, 회화 0)
            placement_items 48 · level_test_items 15 · model_prices 6 · profiles 0
  1단계 배치: 읽기 본 picture 1 · 쓰기 본 copy-tiles 1 · 말하기 본 repeat 1 · 말하기 예비 listening 1
  설정: placement.items_per_level 1 · placement.start_level 3 · seed.complete_through_level 1 · talk.placement_cap 4
  역할: anon · authenticated(rolbypassrls false) · service_role(true)
  SIGINT → 포트 닫힘

== 다시(2초)
DEV_DB_READY dev port=54401 seed=kept
시드가 이미 있어 그대로 두었어요. 시험용 시드 꼴이 바뀌었으면 pnpm db:dev --reset 으로 처음부터 만들어요
.env.local 의 DATABASE_URL · MIGRATION_DATABASE_URL 이 이미 이 로컬 DB 를 가리켜요
다음: 다른 터미널에서 pnpm dev 를 띄우고 http://localhost:3000 을 열어요. 끄려면 Ctrl+C
  SIGINT → exit=0

== --reset(3초, 자료 폴더 새로 만듦 21:16:24 → 21:18:36)
DEV_DB_READY dev port=54401 seed=loaded
.env.local 의 DATABASE_URL · MIGRATION_DATABASE_URL 이 이미 이 로컬 DB 를 가리켜요
다음: 다른 터미널에서 pnpm dev 를 띄우고 http://localhost:3000 을 열어요. 끄려면 Ctrl+C
  행 수 처음과 같음 · SIGTERM → exit=0

== e2e 임시(--ephemeral --port 54339)
DEV_DB_READY e2e
  SIGTERM → exit=0 · 표준 오류 없음 · 임시 폴더 지워짐 · 포트 닫힘
```

`pnpm dev` 로 접근 코드(실행 때 만든 시험용 코드와 해시를 환경 변수로만 넘김, `.env.local` 의 DATABASE_URL 은 db:dev 가 채운 값 그대로, 포트 3300):

```
GET / 쿠키 없이: 401
POST /access/submit 맞는 코드: 204
set-cookie: momo_access=<값 가림>; Path=/; Max-Age=31536000; HttpOnly; SameSite=lax   (access.cookie_days 365 를 DB 에서 읽음)
POST /access/submit 틀린 코드: 401   (parent_auth access_ip 한 행 · failed_count 1)
GET / 쿠키로: 200
GET /access 쿠키로: 307 → /
```

e2e 서버가 실제로 임시 DB 를 쓰는지(기존 e2e 의 제출은 모두 route 가로채기라 DB 에 닿지 않음): 한 번만 쓰고 지운 확인 시험(`tests/e2e/zz-p10-db-probe.spec.ts`)이 맞는 코드 204 · 틀린 코드 401 · access_ip 행 1 · `resetHousehold` 뒤 0 으로 1 통과. `tests/e2e/db.ts` 도우미는 같은 임시 DB 에서 따로 돌려 봄 — `shiftTimes` 세션 · 시도 24시간 · `withHouseholdSetting` 값 바꿈 · 되돌림 · 판 올림 · 없던 키 넣고 지움 · `cloneLessons` 1단계 단원 1 의 4행을 3단계로 · 변형 2 로 · 다시 하면 0 · `resetHousehold` 뒤 프로필 · 인증 · 알림 · 세션 · 시도 0, 설정 132 · 수업은 남음.

완료 판정(브리프): 실기 출력(값 없음)이 위에 있고 접근 코드 제출 → `/` 가 된다.

### 다르게 한 것과 까닭

1. **`scripts/dev-db.ts` 는 `import.meta` 를 쓰지 않는다.** Playwright 가 설정을 CommonJS 로 읽어 `import.meta` 가 구문 오류였다(첫 `pnpm e2e` 실패). 뿌리는 `process.cwd()`(pnpm · webServer 모두 뿌리에서 띄움, `drizzle/` 이 없으면 종료 2), 직접 실행 판정은 `argv[1]` 과 `<뿌리>/scripts/dev-db.ts` 의 실제 경로 비교. P1b · P7a 의 `isDirectRun` 꼴과 판정 기준만 다르다.
2. **맨 위 정적 가져오기는 Node 기본 모듈만**, DB · 시드 · embedded-postgres 는 실행 때 동적으로. playwright.config 와 `tests/e2e/db.ts` 가 `databaseUrl` · `DB_NAMES` 를 같이 쓰게 해 접속 문자열 조립을 한 곳에 두려는 것(plan 은 파일 이름만 정함).
3. **`--port` 를 개발용에서도 받는다**(기본 54329). 기본 포트가 쓰이고 있을 때 쓰려는 것이고, 실기도 그렇게 했다. `.env.local` 의 '로컬 개발용 주소'는 54329 나 그 실행의 포트다.
4. **`.env.local` 은 두 키를 함께 다룬다.** 하나라도 다른 주소면 둘 다 손대지 않는다(plan 은 키마다로 읽힐 수 있음 — 섞인 접속을 만들지 않으려고). 주소 꼴이 아닌 값도 다른 주소로 본다.
5. **'시드 테이블 다섯이 비었으면' → content 스키마 테이블 여덟이 모두 비었으면.** plan 의 다섯이 어느 테이블인지 글에 없어서 시드가 쓰는 테이블 전부로 했다. `loadSeed` 는 한 트랜잭션이라 반쯤 찬 경우가 없다.
6. **신호 처리.** embedded-postgres 가 읽힐 때 async-exit-hook 로 SIGINT · SIGTERM · SIGHUP 처리기를 걸어 128 + 신호 번호로 끝내 종료 코드가 0 · 143 으로 흔들렸다. 읽은 뒤 새로 걸린 신호 처리기만 떼고 자기 처리기(DB 끄고 e2e 임시 폴더 지운 뒤 0)를 클러스터 시작 바로 뒤에 건다. 위의 실기에서 SIGINT · SIGTERM 모두 0.
7. **시드 거부 출력**은 `summaryLine` 첫 줄 + 위반의 규칙 · 테이블 · 칸 키(메시지 없이, 20줄까지) + 한 줄 안내. plan '보고 첫 줄'보다 조금 많다.
8. **`insertHousehold` 는 아직 없다.** `src/core/profile/start.ts` 의 행 만들기 함수(차례 2)를 써야 하므로 차례 2 에서 더한다(파일 머리 주석에 적음).
9. **`shiftTimes(table, id, hours)`** 의 table 은 `"sessions" | "level_tests"`. sessions 는 그 세션의 시도 시각도 함께 당긴다. 시각은 읽어서 JS 로 빼 다시 쓴다(SQL 안 now() 없음). `cloneLessons` 는 `fromVariant`(기본 1)도 받고 같은 칸 · 판이 있으면 건너뛴다.

### 알릴 것

1. **사고: 컨트롤러의 p05b `next dev`(포트 3000, next-server pid 56510)를 21:20 무렵 내가 껐다.** 내 시험 서버(포트 3300)를 끄며 `pkill -f "next-server.*" -P <pid>` 를 썼는데 부모 pid 가 비어 모든 next-server 에 맞았다. 다시 띄우기는 권한 분류기가 막아 띄우지 않았고, 곧바로 SendMessage 로 알렸다. 내장 DB(54329, pid 56348)는 건드리지 않았다. 그 뒤로는 내가 띄운 프로세스만 확인한 pid 로 끈다. 요청자 화면이 다시 필요하면 p05b 에서 `pnpm dev` 를 다시 띄워 주세요.
2. **워크트리 `.env.local`(컨트롤러가 21:13 에 만듦)의 `DATABASE_URL` · `MIGRATION_DATABASE_URL` 을 내 실기가 채웠다**(그 사이 컨트롤러가 파일을 다시 쓴 것으로 보임 — 지금 여섯 줄). 끝에 두 줄 값만 빈 값으로 되돌렸다(실기 포트 54401 을 가리키면 다음 `pnpm db:dev`(54329)가 '다른 주소'로 보고 고치지 않으므로). 다른 줄 · 권한(0600)은 그대로이고 값은 읽거나 내지 않았다. 내가 만든 `.dev/` 와 `tests/.tmp/p10-check/` 는 지웠다 — 요청자 컴퓨터에서 `pnpm db:dev` 는 '처음'으로 돈다.
3. **MIGRATION_DATABASE_URL 도 로컬로 채운다**(plan 값 1 대로). 그 파일의 주석은 그 줄을 'Supabase 세션 풀러'로 적어 두었다. H3 뒤 Supabase 주소를 넣으면 dev-db 는 그 두 줄을 더 고치지 않는다(다른 주소 규칙). 로컬 DB 에 `pnpm seed:load` 를 쓰려면 지금 꼴이 맞다.
4. 요청자 길: 컨트롤러가 띄운 54329 DB 를 끈 뒤 이 워크트리에서 `pnpm db:dev`(켜 둠) → `pnpm dev`. `ACCESS_CODE_HASH` 는 그 파일에 이미 있다. 지금은 `/` 가 아직 빈 화면이다(차례 2 몫).
5. check-ids 허용 목록(P7b 몫)에 넣을 이름 붙인 상수: `DEV_DB_PORT` · `E2E_DB_PORT` · 비밀번호 바이트 · 포트 범위 · 종료 대기 ms · `LOG_TAIL_LINES` · `VIOLATION_LINES`(모두 기술 값).
6. CI(H15 뒤): e2e 작업이 embedded-postgres linux 로 54339 를 띄운다. `pnpm.onlyBuiltDependencies` 에 linux-x64 가 이미 있다.

## 차례 2 — 보드 · 첫 실행 · 마이크 상태(전체 루프, 검토 묶음 A1)

상태: DONE_WITH_CONCERNS(구현 · 시험 · 실기는 모두 초록. 우려는 '알릴 것' — 정본 밖 문구 둘을 더 제안 · 아바타 색 둘과 묶음 대표 낱말을 내가 고름 · 쓰기 6단계 이상 복사본).
차례 1 파일(`scripts/dev-db.ts` · `tests/e2e/db.ts` · `tests/fixtures/seed/dev-tree.ts` · `tests/unit/dev-tree.test.ts`)은 검토 중이라 고치지 않았다. `insertHousehold` 는 그래서 새 파일 `tests/e2e/household.ts` 에 두었다.

### 바뀐 파일

새 파일(열넷):

| 파일 | 무엇 |
|---|---|
| `src/core/profile/romanize.ts` | `romanizeGivenName` — 표기 일람 · 제3장 제4항(이름 음운 변화 반영 안 함) · ㄹㄹ → ll · 성 빼기(세 글자 · 두 글자 성 넉 자), `TWO_SYLLABLE_SURNAMES` |
| `src/core/profile/start.ts` | 구조 상수 `PIN_LENGTH` 6 · `NAME_MAX_LENGTH` 20 · `TOPIC_BUNDLES` · `AVATARS`, `trackStartsOf` · `unitSnapshotOf` · `placementSnapshotOf` · `rangeEndAlertDue` · `checkFirstRunInput`(Zod `FirstRunInputSchema` · `MicResultSchema`) · `englishNamePieces` · `canDoExample` · `isEnglishName` · `isPin` · `firstRunSettingKeys` · `householdRowsOf` |
| `src/server/profile/index.ts` | `server-only`. `readHouseholdProfile` · `isVocabName`(lower(word) 비교) · `saveFirstRun`(확인 → 별명 규칙 → argon2id 해시(트랜잭션 밖) → 한 트랜잭션: 프로필 있음이면 already_done · 행 넣기, 유일 위반 23505 도 already_done) · `readFirstRunView`(설정 · can-do 예시 줄 · 묶음 그림 · 음성 설정) |
| `src/server/actions/first-run.ts` | `'use server'`. `checkEnglishName` · `completeFirstRun`, 첫 문장 `await requireAccess()` |
| `src/app/(setup)/first-run/page.tsx` | `connection()` 뒤 프로필 있으면 `/`, 아니면 화면 값을 읽어 넘김 |
| `src/app/(setup)/first-run/first-run-flow.tsx` | `'use client'`. 여덟 화면 · 화면 메모리 상태 · '다음' 조건 · 이전 · 마이크 확인(`unlockFromGesture` → `checkMicrophone`, 끊김은 not_checked, mic-unavailable 갈래면 `markMicUnavailable`, 성공이면 `clearMicState`) · iPad 면 Siri · 받아쓰기 도식 먼저 · 마지막 한 번 저장 → `location.assign("/")` |
| `src/app/(child)/layout.tsx` | 아이 화면 묶음(코르크 바탕 · 본문 글꼴) |
| `src/app/(child)/page.tsx` | `src/app/page.tsx` 를 옮김. 프로필 없으면 `/first-run`, 있으면 빈 보드(종이 띠 '<한글 이름>의 공부 보드', 목업 B_Home4 제목 꼴) |
| `src/components/board/board.tsx` | `ChildScreen` · `PaperBand` · `PostIt` · `BigButton` · `SmallButton` · `ConfirmSheet` · `AvatarCircle` · `AREA_LABEL` · `AVATAR_TONE`(훅 없음) |
| `src/lib/mic-state.ts` | `'use client'`. `momo.mic.v1` · `readMicState` · `markMicUnavailable` · `clearMicState` · `readDeviceVerdict` · `micUsable` · `isIpad` |
| `tests/unit/first-run.test.ts` | 단위 열다섯 |
| `tests/integration/first-run.test.ts` | 통합 아홉 |
| `tests/e2e/first-run.spec.ts` | e2e 일곱(AC-1a 하나 · AC-1c 여섯) |
| `tests/e2e/household.ts` | `insertHousehold` · `householdChoices` · `randomPin`(서버와 같은 `householdRowsOf`) |

지운 파일: `src/app/page.tsx`(`(child)/page.tsx` 로 옮김, 색인에 올리지 않음).

공용 파일 변경(요청하는 공용 변경 5 · 6 · 7 · 8):

| # | 파일 | 바꾼 것 |
|---|---|---|
| 5 | `src/app/layout.tsx` | `next/font/google` Jua(400) · Gowun_Dodum(400) · Fredoka(가변), `--font-jua` · `--font-gowun` · `--font-fredoka` 를 `<html>` 에, `display: "swap"` · `subsets: ["latin"]` |
| 6 | `src/app/globals.css` | `@theme` 보드 토큰(cork #D2A86B · cork-frame #8A6134 · paper · ink · ink-soft · tape · postit-reading/writing/speaking/talk · avatar-orange/purple · shadow-postit · shadow-band, 목업 B_Home4 · B_Profile 값), `@theme inline` 의 `--font-sans`/`--font-heading`/`--font-en`, body `word-break: keep-all` · `overflow-wrap: break-word` |
| 7 | `src/components/activities/common.tsx` | `AREA_TONE.*.className` → `bg-postit-<영역>`, `PAPER` → `bg-paper`(값 · 이름 · 내보내기 그대로) |
| 8 | `tests/e2e/smoke.spec.ts` | 'AC-1a 유효한 접근 쿠키가 있는 기기는 …'(이름 그대로): 프로필이 없으면 `/first-run`(PIN 제목), `insertHousehold` 뒤 `/` 는 홈, `/access` 는 `/`. `beforeEach(resetHousehold)` · `afterAll(closeE2eDb)` |

공용 변경 9(선택, `structure.ts` 의 `bandOf` 를 `level-band.ts` 로 하나로)는 하지 않았다 — 새 코드는 `level-band.ts` 만 쓴다.

### 덮는 시험

- 단위(`tests/unit/first-run.test.ts`, 15): "AC-1c 로마자: 이름의 음운 변화를 반영하지 않고(한복남 → Boknam · 홍빛나 → Bitna) 세 글자 · 두 글자 성 넉 자 이름은 성을 뺀다" · 표기 일람 · 트랙 시작값 넷(고른 영역 · "AC-11b 회화를 고르지 않으면 …" · "AC-1c 회화를 고르면 talk.placement_cap 을 쓰지 않고 …" · 알파벳 · 범위 밖 던짐) · 단원 복사본 · 배치 복사본 · 범위 끝 · 입력 규칙 · vocab 조각 · can-do 해요체 · 집 행 셋.
- 통합(`tests/integration/first-run.test.ts`, 9): "AC-1a 첫 실행 저장은 PIN 이 6자리 숫자가 아니면 거부되고 PIN 은 argon2id 해시로 parent_auth 한 행에 남는다" · "AC-1c 회화를 5단계로 고르면 회화 트랙은 5단계 단원 1이고 talk.placement_cap 을 쓰지 않는다" · "AC-11b 부모가 말하기만 시작 단계를 고르면 회화는 고른 단계와 talk.placement_cap 가운데 낮은 값에서 시작한다" · 범위 밖 거부 · 두 기기 함께(already_done, 프로필 · PIN 하나) · vocab 이름 별명 · 행 전부(설정 판 · 시작 개정 · 복사본 · 알림) · 마이크 알림 없음 · 화면 값.
- e2e(`tests/e2e/first-run.spec.ts`, 7): plan 증명 표의 이름 그대로 — AC-1a 하나, AC-1c 여섯(순서 · 로마자와 홈 한글 이름 · 두 번째 기기 · 마이크 확인 실패와 알림 · 1~through 와 회화 5 · vocab 별명). 'AC-1c 고른 관심 주제 묶음의 주제 변형 수업이 열린다'와 AC-1b 는 차례 7.

### 실행 명령과 출력

| 명령 | 결과 |
|---|---|
| `pnpm exec biome ci .` | 162 파일, 고칠 것 없음 |
| `pnpm build` | 성공. Google Fonts 내려받기 됨(위험 5 의 local 길은 필요 없음). `/` · `/first-run` 은 ƒ(요청 때) |
| `pnpm test` | 31 파일 · 316 통과(차례 1 끝 301 + 15) |
| `pnpm test:int` | 75 통과 · 1 건너뜀(66 + 9) |
| `pnpm e2e` | 25 통과(18 + 첫 실행 7, smoke 바뀐 기대 포함) |
| `pnpm e2e:local` | 7 통과 — 글꼴 · 토큰을 입힌 뒤 P5b 크기 · 색 시험 초록(장부 '글꼴 입힌 뒤 크기 시험 다시'). 처음엔 같은 워크트리의 컨트롤러 `next dev`(3001)가 있어 돌지 못했고 그 서버가 내려간 뒤 돌림 |
| `pnpm check:deps` | 위반 0(97 모듈) |
| `pnpm check:bundle` | 위반 0 |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0, missing-test 48 → 46 |

시험 먼저: 통합 · e2e 는 구현 전에 돌려 빨강(모듈 없음)을 봤다. 단위 `first-run.test.ts` 는 구현 앞에 썼으나 그 사이에 돌리지 않아 빨강을 보지 못했다(구현 뒤 첫 실행에서 15 통과).

### 실기(값 없음)

`pnpm dev` 대신 `next start`(포트 3302)와 임시 DB(`dev-db.ts --ephemeral --port 54402`, 시험용 시드)로 했다 — 같은 워크트리에 컨트롤러 `next dev` 가 떠 있어 둘째 dev 서버가 막히고, 54329 · 54331 · 3000 · 3001 을 피하라는 지시 때문. 접근 코드 · 해시 · DB 비밀번호는 실행 때 만들어 환경 변수로만 넘겼다. Playwright WebKit(iPad Pro 11, 820 × 1180 · 1180 × 820):

```
접근 코드 → /first-run
여덟 화면(PIN · PIN 다름 · 이름 · 별명 · 아바타 · 알파벳 · 주제 묶음 · 시작 단계 · 음성 인식 안내 · 확인 뒤 · 넘겨주기) + 홈: 세로 · 가로 모두 가로 넘침 없음 · 한 화면
  (첫 판은 시작 단계 화면이 가로에서 1000/820 으로 넘쳐 영역 이름과 단추를 한 줄로 고침 → 한 화면)
마이크 확인(Playwright WebKit): 마이크를 쓸 수 없었어요. 그래도 다음으로 넘어갈 수 있어요   (앞선 판에서는 '마이크가 잘 돼요' — WebKit 가짜 매체에 따라 갈림)
넘기기 → / · 제목 '모모의 공부 보드'
프로필 있음에서 /first-run → /
DB: 프로필 1 · PIN 1 · 트랙 4 · unit_progress 1 · 알림 mic_unavailable, seed_range_end_near · 별명 없음
둘째 기기: 접근 코드 → / · '모모의 공부 보드'
시작 단계 1~6(seed.complete_through_level 6 으로 올려 한 번 더) · 알파벳 모름: 읽기 · 쓰기는 '알파벳 · 소리 단원에서 시작해요', 말하기 6 · 회화 5 고름 — 세로 · 가로 한 화면
```

사진(이 폴더, 스물여섯): `p10-first-run-{1-pin, 1-pin-mismatch, 2-name, 2-name-nickname, 3-avatar, 4-alphabet, 5-topic, 6-level, 6-level-through6-alphabet, 7-mic, 7-mic-checked, 8-handoff, 9-home}-{portrait,landscape}.png`. iPad UA 라 음성 인식 안내에 Siri · 받아쓰기 도식이 먼저 보인다.

### 다르게 한 것과 까닭

1. **구조 상수 자리**: `PIN_LENGTH` · `NAME_MAX_LENGTH` · `TOPIC_BUNDLES` · `AVATARS` 는 plan 값 7 대로 `src/core/profile/start.ts` 에 두었다. C72 글은 '(structure.ts, 12절 키 아님)'이라 적었으나 C57 의 12자도 `access-token.ts` 에 있어 '구조 상수'의 뜻으로 읽었다. 옮겨야 하면 컨트롤러가 정한다.
2. **`insertHousehold` 는 새 파일 `tests/e2e/household.ts`**(차례 1 `db.ts` 를 고치지 말라는 지시). 합칠 때 db.ts 로 옮겨도 된다.
3. **알림 넣기**: 범위 끝 알림은 `createAlertOnce` 를 부르지 않고 같은 기준 키 꼴(`seed.range_end_alert_margin:<영역>`)로 트랜잭션 안에서 바로 넣는다 — 새 프로필이라 앞선 행이 없고, `createAlertOnce` 는 자기 트랜잭션을 연다. 마이크 알림 · 범위 끝 알림 모두 `profile_id` 는 새 프로필(집 전체 null 이 아님).
4. **`isVocabName`** 은 `lower(word)` 를 조각과 견준다(시드 낱말이 대문자로 시작해도 잡게).
5. **`mic-state.ts` 의 기기 사실 모으기**는 P2b `browser.ts` 의 `device()` 와 같은 여섯 줄을 따로 둔다(plan 값 4 — 공용 파일을 고치지 않으려고). 합칠 때 browser.ts 에서 내보내 하나로 할 수 있다.
6. **마이크 확인 결과 꼴**: `{ result: "ok" | "not_checked" | "failed", code, browser }`. 끊김 · 누르지 않음은 not_checked(알림 없음), 성공이면 `clearMicState`.
7. **화면 꼴**: 고르기 화면(아바타 · 알파벳 · 묶음 · 단계)은 '골라 두고 다음'으로 맞췄다(누르면 바로 넘어가는 꼴 아님 — 이전으로 돌아와도 고른 값이 보이게).
8. 묶음 그림은 서버가 카탈로그 경로를 주고 화면이 `<img onError>` 로 읽기 실패를 받아 이름표만 남긴다(정할 것 파). 그래서 `next/image` 대신 `img` 이고 biome 예외 한 줄을 달았다. 시험용 시드에는 대표 낱말이 없어 이름표만 보인다.

### 알릴 것

1. **정본 밖 문구 둘을 더 제안**(C72 표에 없음, 화면에 '(제안)' 주석): 이름 화면 제목 '아이 이름을 알려 주세요', 저장 실패 '지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요'(C57 꼴). 끊김은 7절 '인터넷이 끊겼어요. 연결되면 다시 해요'. 시작 단계 안내 문장은 표의 두 문장을 제목(h1)과 본문으로 나눠 썼다.
2. **내가 고른 시각 값**(표본 쪽 결정 규칙 대상일 수 있음): 아바타 색 여섯 가운데 주황 #FFC98B · 보라 #D9C6F5(나머지 넷은 포스트잇 색), 묶음 대표 낱말 dog · tree · apple · family / toy · ball · game · rocket · bus 와 이름표. 선택 표시는 먹색 테두리.
3. **쓰기 6단계 이상의 단원 복사본**: 12절은 쓰기 6~12 의 정규 수업 · k · 최소 수업 수를 level_specs 에서 덮는다. `unitSnapshotOf` 는 plan 대로 단계 구간 키만 담는다. P12 가 판정 때 level_specs 덮기를 함께 보거나, 복사본에 덮은 값을 담도록 바꿔야 한다(P12 브리프에).
4. P3a 메모의 '한 시계 정적 검사를 서버 컴포넌트(src/app)까지 넓히기'는 공용 시험 파일이라 하지 않았다. 새 서버 코드는 `now()` 만 쓰고, 클라이언트 `mic-state.ts` 만 기기 시각으로 이 브라우저 기록을 남긴다(서버 판정에 안 씀).
5. 차례 2 실기는 `next start` 였다. 요청자 길(`pnpm db:dev` + `pnpm dev`)도 같은 코드라 같게 돌 것으로 본다(추측 — dev 서버로는 돌려 보지 못함).

### 차례 1 Minor 정리(review-p10-1 M-1~M-5, 차례 2 라운드에 함께)

| 지적 | 고친 곳 | 시험 · 실기 |
|---|---|---|
| M-1 `--reset` 이 켜 둔 인스턴스의 자료 폴더를 지움 | `scripts/dev-db.ts`:129 `postmasterAlive(pidFileText, isAlive)`(순수) · :391 `rmSync` 앞에서 `postmaster.pid` 첫 줄 pid 가 살아 있으면(`process.kill(pid, 0)`, EPERM 도 살아 있음) 종료 2 '다른 db:dev 가 이 자료 폴더를 쓰고 있어요. 그것을 끈 뒤 다시 해 주세요'. `--reset` 이 아닐 때도 같은 검사(덧붙지 않게) | 단위 '--reset 은 켜 둔 인스턴스(postmaster.pid 의 pid 가 살아 있음)의 자료 폴더를 지우지 않게 막는다'(사례 다섯). 실기(스크래치패드 저장소 복사본 — 컨트롤러 DB 54331 은 건드리지 않음): A 를 `--port 54420` 로 켠 채 `--reset --port 54421` → 종료 2 · 같은 줄, `--port 54421` → 종료 2, 자료 폴더 만든 시각 그대로 · A 계속 들음. A 를 끈 뒤 `--reset` → `DEV_DB_READY dev port=54421 seed=loaded` |
| M-2 시작 중 신호 | `dev-db.ts`:579 신호 처리기를 `startCluster` 앞에 건다(상태 `Running { pg?, tempDir? }` 를 시작이 채움, embedded-postgres 가 나중에 건 처리기만 뗌) · :352 `shutdown` 은 `pg.stop()` 을 `STOP_WAIT_MS`(:68, 5초 — Playwright SIGKILL 대기 10초보다 짧게)까지 기다리고 finally 에서 임시 폴더를 늘 지움 · 시작 뒤 · 준비 뒤 `stopping` 이면 더 가지 않음 · (덤) 개발용 시작 실패에 '`pnpm db:dev --reset` 으로 처음부터' 한 줄(:434) | 실기(복사본, 프로세스 묶음에 SIGTERM): 0.5초 → 종료 0 · 0.06초, 0.8초 → 0 · 0.08초, 1.0초 → 0 · 5.16초(상한에 걸림), 1.5초 → 0 · 0.13초. 넷 모두 임시 폴더 0 · 포트 닫힘(검토 재현의 '-15 · 폴더 남음 · 10.2초'가 없어짐) |
| M-3 예전 `--port` 주소를 다른 주소로 봄 | `dev-db.ts` `isLocalDbAddress` — 로컬 호스트이고 포트가 DEV_DB_PORT · 이번 포트이거나 **경로가 `/momo_dev`** 이면 우리 주소. 원격 호스트의 momo_dev · 로컬의 다른 DB 이름은 그대로 다른 주소 | 단위 '개발용 DB: `.env.local` 은 비었거나 로컬 주소일 때만 고친다'에 사례 둘(127.0.0.1:54331/momo_dev → 새 주소로 바꿈 · db.example.com/momo_dev → 다른 주소) |
| M-4 Supabase 흉내 · URL 조립 두 벌 | 새 파일 `scripts/pg-local.ts`(Node 기본 모듈도 안 가져오는 순수 조각: `PG_ADMIN_USER` · `PG_ADMIN_DB` · `LOG_TAIL_LINES` · `SUPABASE_ROLES` · `supabaseDefaultPrivilegeSql()` · `pgUrl` · `createLogTail`). `dev-db.ts`:123 `databaseUrl = pgUrl` · :478 권한 SQL · 로그 끝, `tests/integration/global-setup.ts`(공용 파일 — 지적이 정한 변경):16-22 · 72 · 147 · 159 가 같은 조각을 씀. `freePort`(빈 포트 받기)와 `portFree`(그 포트가 비었나)는 하는 일이 달라 그대로 | 통합 76 + 1 건너뜀(global-setup 이 공용 조각으로 클러스터 · 역할 · 권한을 만들고 RLS 시험 포함 전부 통과) |
| M-5 적재 수 · 가림 시험 | 새 통합 `tests/integration/dev-seed.test.ts` '개발용 시드 나무: loadSeed 로 넣으면 loaded 이고 테이블별 행 수가 나무에서 센 수와 같다'(lessons · placement_items · level_test_items · level_specs · unit_specs · vocab · settings, 기대 수는 나무에서 셈 · 0 이 아님도 단언). `describeError` 를 내보내고(:300) 단위 '오류 글은 이름 · 코드 · 메시지를 내고 비밀번호는 가린다' | 통합 1 · 단위 1 통과 |

새 시험 이름의 빨강 먼저: M-1 · M-5 의 함수 · 파일은 시험보다 먼저 고쳤고(작은 정리 라운드), M-3 사례는 고친 뒤 더해 빨강을 보지 못했다.

실행(Minor 정리 뒤 전부 다시):

| 명령 | 결과 |
|---|---|
| `pnpm exec biome ci .` | 164 파일, 고칠 것 없음 |
| `pnpm exec tsc --noEmit -p .` | 오류 0 |
| `pnpm build` | 성공 |
| `pnpm test` | 318 통과(316 + 2) |
| `pnpm test:int` | 76 통과 · 1 건너뜀(75 + 1) |
| `pnpm e2e` | 25 통과(DB 먼저 띄움 · 끈 뒤 임시 폴더 0) |
| `pnpm e2e:local` | 차례 2 끝에 7 통과. Minor 뒤에는 컨트롤러가 p10 에 `next dev`(PID 50628)를 다시 띄워 둘째 dev 서버를 열 수 없어 돌리지 못했다 — 설정이 바뀐 `dev-db.ts`(→ `pg-local.ts`)를 읽는지만 `playwright test --config playwright.local.config.ts --list` 로 확인(7개 목록). Minor 는 e2e:local 시험이 그리는 화면을 바꾸지 않는다 |
| `pnpm check:deps` | 위반 0 |
| `pnpm check:bundle` | 위반 0 |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0, missing-test 46 |

### 차례 2 화면 지적 반영(review-p10-2-design I 2 · M 10, task-p10-3 (1))

| 지적 | 고친 것 | 시험 · 사진 |
|---|---|---|
| I-1 별명 거절 표시 없음 | 별명도 vocab 낱말이면 칸 아래 상태 줄(role=status, 경고 표 · 굵게)에 4절 문장 '토리가 부를 다른 영어 이름(별명)을 골라 주세요'를 보이고, 칸은 `aria-invalid` 와 굵은 점선 테(새 문구 없음). 칸이 상태 줄을 `aria-describedby` 로 가리킴 | e2e 'AC-1c 영어 이름 칸에 vocab 의 낱말을 넣으면 …'에 상태 줄 · aria-invalid 단언 — **빨강 먼저 봄**(상태 줄 없음으로 실패) → 초록. 사진 `p10-first-run-2-name-nickname-rejected-*` |
| I-2 묶음 2 대표 낱말 | 아래 표대로 바꿈(rocket · toy · game 뺌, kite · star 넣음). 서버는 그림을 `images.word` 로 찾는다 — **P6a vocab 에는 그림 키가 없어 예전 길(vocab.image_key ↔ images.key)로는 실시드에서 그림이 하나도 안 나왔다**(검토가 짚은 것보다 큼). 그림이 없거나 읽지 못한 칩은 그리지 않는다(제목이 이름을 보임) | 통합 '첫 실행 화면 값: 묶음 대표 낱말 그림은 그림 카탈로그(images.word)에서 찾고 …' — **빨강 먼저 봄** → 초록 |
| M-1 예시 줄 | 시작 단계 화면을 영역 단추 넷(탭)과 그 영역 칸으로 바꾸고, 칸에는 '고르지 않음'과 단계 선택지마다 그 단계 예시 줄을 옆에 둔다(고른 것만이 아님, 컨트롤러 확정). 탭 이름은 영역 이름(고르면 '읽기 · 3단계'). 가로 화면은 두 줄씩 놓아 6단계도 한 화면 | e2e 'AC-1c 시작 단계 화면에는 1~…'을 탭으로 고침 · 칸마다 예시 줄 수 단언. 사진 `6-level` · `6-level-talk`(seed.complete_through_level 6) |
| M-2 고른 표시 통일 | 새 `ChoiceButton`(굵은 테 + 체크 표, 먹색 채움 아님) — 알파벳 · 영역 · 단계. 포스트잇 · 아바타는 실선 고리 + 체크 표(`SELECTED_RING` · `SelectedMark`). 먹색 채움은 행동 단추(다음 · 넘기기 · 마이크 확인)에만 | 사진 3 · 4 · 5 · 6 |
| M-3 키보드 초점 | `FOCUS_RING`(점선 고리) — 큰 · 작은 · 고르기 단추 · 포스트잇 · 아바타가 같이 씀(고른 표시는 실선이라 다름). PIN 화면 첫 초점은 첫 칸(`autoFocus` + 화면 바뀔 때) | 실기: PIN 화면 첫 초점 = 'PIN' 칸 |
| M-4 iPad 안내 길 | 아이콘 셋 → 메뉴 이름 도식 두 줄 '설정 › 일반 › 키보드 › 받아쓰기' · '설정 › Siri 및 검색'(iPadOS 고유 이름 — 실제 기기 확인은 H1 · H4) | 사진 7-mic(iPad UA) |
| M-5 영역 색 | 주제 묶음 포스트잇은 종이색 + 옅은 테, iPad 안내 상자는 점선 테(영역 색 안 씀) | 사진 5 · 7 |
| M-6 오류 · 결과 줄 | 새 `StatusLine`(오류 = 경고 표 + 굵게, 잘 됨 = 체크 표, 안내 = 표 없음) — PIN 다름 · 별명 · 마이크 결과 · 저장 실패 | 사진 1-pin-mismatch · 7-mic-checked |
| M-7 마이크 확인 단추 | 확인 전에는 '마이크 확인'이 큰 단추 · '다음'이 곁 단추, 결과가 나오면 바뀜 | 사진 7-mic · 7-mic-checked |
| M-8 묶음 제목 줄바꿈 | 항목마다 줄을 끊지 않음(가운뎃점이 줄 끝에 남지 않게) | 사진 5 세로 |
| M-9 아바타 제목 | C72 표 문구라 그대로(컨트롤러 판단) | — |
| M-10 이름 확인 실패 | 이름 확인 요청이 닿지 않은 때는 7절 끊김 문장 '인터넷이 끊겼어요. 연결되면 다시 해요'(저장 실패 문장을 쓰지 않음). 브리프는 '4절 별명 문장(I-1 과 같은 줄)'이라 적었으나, 별명 칸이 없는 때(영어 이름 확인)에도 날 수 있어 별명 문장은 까닭이 맞지 않는다 — 별명 거절만 그 문장(I-1). 다르게 읽은 것이면 컨트롤러가 바로잡는다 | — |

묶음 대표 낱말 대조(P6a vocab f447bc5 · P6b 카탈로그 워크트리 p06b `seed/images.json` 207장, 낱말 칸으로 맞댐):

| 묶음 | 칸 | 낱말 | vocab 단계 | 카탈로그 그림 |
|---|---|---|---|---|
| 1 | 동물 | dog | 1 | images/vocab/dog.svg |
| 1 | 자연 | tree | 1 | images/vocab/tree.svg |
| 1 | 음식 | apple | 1 | images/vocab/apple.svg |
| 1 | 가족 | family | 2 | images/vocab/family.svg |
| 2 | 놀이 | kite(전 toy — 그림 없음) | 1 | images/vocab/kite.svg |
| 2 | 운동 | ball | 1 | images/vocab/ball.svg |
| 2 | 우주 | star(전 rocket — vocab 에 없음) | 1 | images/vocab/star.svg |
| 2 | 탈것 | bus | 1 | images/vocab/bus.svg |
| 2 | 게임 | (뺌 — game 은 vocab 1 이나 그림 없음) | — | — |

두 묶음 모두 그림 넷(6.3 '4~5개'). 이 워크트리에는 그림 파일(`public/images/vocab`, P6b 커밋 전)이 없어 실기 사진의 묶음은 제목만 보인다.

실행: biome ci 0 · tsc 0 · test 318 · test:int 77 + 1 건너뜀 · e2e 25 · deps 0 · bundle 0. 실기는 `next start` 3302 + 임시 DB 54402(3001 · 54331 은 건드리지 않음), 바뀐 화면 세로 · 가로 모두 가로 넘침 없음 · 한 화면.

## 차례 3 — 홈(plan-p10b 작업 1 · 2, 검토 묶음 B1)

상태: DONE_WITH_CONCERNS(구현 · 시험 · 실기 초록. 우려는 '알릴 것').

### 바뀐 파일

| 파일 | 신규 / 수정 | 무엇 |
|---|---|---|
| `src/core/today/done.ts` | 신규 | `todayDone`(새 수업 = 정규 · 보강 · 연습 · 안 해 본 수업, 단계 평가 하나, 새 수업이 없는 날의 다시 하기 · 복습, 복습할 카드가 있으면 그날 복습도) · `thisWeekDays`(월요일 시작 주의 오늘까지 서로 다른 학습일) · `weekStartOf` |
| `src/server/home/index.ts` | 신규 | `server-only`. `readHome({ now })` — 영역 카드 넷(gate · 단계 · 단원 · 단원 주제 · 단원 5칸 · 아는 단어 · 단원 단어 수 · 최근 성적 칸 · 회화 끝낸 대화 · 이번 주 · 오늘 완료) · 별 합 · 부모 점 · 이름. 기준(unit.recent_window · unit.recent_score · unit.min_lessons)은 단원 복사본, 학습일은 app.* |
| `src/app/(child)/page.tsx` | 수정(차례 2 의 자리) | 프로필 없으면 첫 실행, 있으면 종이 띠(h1 '<이름>의 공부 보드' · '별 n개' · 부모 꼬리표와 점) · 카드 넷 |
| `src/app/(child)/home-cards.tsx` | 신규 | 'use client'. 카드 넷 — 차례: 마이크 닫힘(말하기 · 회화) → 배치 전('내 단계 찾기' · 회화 '말하기에서 단계를 찾으면 …') → 보통. 홈에 들어올 때마다 `micUsable()` 다시 판정 |
| `src/app/(child)/talk/page.tsx` | 신규 | '토리가 준비 중이에요. 곧 만나요' · '홈'(C50 (1)) |
| `tests/unit/today-done.test.ts` | 신규 | 단위 3(AC-2a 1 · AC-N7 2) |
| `tests/integration/home.test.ts` | 신규(plan 표 밖 — 더함) | 통합 2(홈 자료: gate · 단원 칸 · 빈 최근 성적 · 부모 점 / 오늘 완료 · 이번 주 · pass/miss · passed 칸) |
| `tests/e2e/home.spec.ts` | 신규 | e2e 4(AC-2a 2 · AC-5c 2, plan 증명 표 이름 그대로) |

공용 파일 변경: `src/components/board/board.tsx` 에 `BigLink`(큰 단추 꼴 링크 — 링크 안에 단추를 넣지 않게), `src/app/globals.css` 에 토큰 `--color-kraft`(부모 꼬리표, 목업 #C8B48E).

### 빨강 먼저

- 단위 `today-done.test.ts`: **빨강 먼저 봄**(모듈 없음) → 초록.
- 통합 `home.test.ts` · e2e `home.spec.ts`: 서버 · 화면을 먼저 짜서 빨강을 먼저 보지 못했다. 대신 e2e 는 변이 확인을 했다 — 카드 문구 셋('시작!' · '오늘 다 했어요' · '마이크가 필요해요 …')을 잠깐 바꾸니 home.spec 4 개 모두 실패, 되돌리고(`cmp` 같음) 초록.

### 실행

| 명령 | 결과 |
|---|---|
| `pnpm exec biome ci .` · `tsc` | 0 · 0 |
| `pnpm test` | 321(318 + 3) |
| `pnpm test:int` | 79 + 1 건너뜀(77 + 2) |
| `pnpm e2e` | 29(25 + 4) |
| `pnpm build` | 성공 |
| `pnpm check:deps` · `check:bundle` | 0 · 0(화면 파일 20) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0, missing-test 46 → 44(AC-2a · AC-5c) |
| `pnpm e2e:local` | 컨트롤러 `next dev`(3001)가 p10 에 떠 있어 돌리지 못함 — 홈은 e2e:local 시험 범위 밖 |

### 실기 · 사진

`next start` 3302 + 임시 DB 54339(e2e 자리, e2e 를 돌리지 않을 때), 3001 · 54331 은 건드리지 않음. 사진 `p10-home-{placed, mic-closed, placement, talk-soon}-{portrait,landscape}.png`(여덟 장): 모두 가로 넘침 없음 · 한 화면. 처음 판은 세로에서 1244/1180 으로 넘쳐 부모 꼬리표를 종이 띠 오른쪽으로 옮겨 맞췄다.
- placed: 네 영역 1단계(시험용 시드) — 단계 · '단원 1 · <주제>' · 5칸(지금 칸 굵은 테) · 아는 단어 0/4 · 최근 성적 칸 다섯 · 이번 주 0일 · '오늘 아직이에요' · '시작!'(회화 '이야기 고르기', 끝낸 대화 0/2).
- mic-closed: 저장된 '쓸 수 없음' — 말하기 · 회화 카드는 '마이크가 필요해요. 부모님께 말해 주세요'와 누를 수 없음(흐림).
- placement: 단계를 고르지 않은 집 — '내 단계 찾기' 셋(차례 5 전까지 누를 수 없음) · 회화 '말하기에서 단계를 찾으면 토리를 만날 수 있어요'.
- talk-soon: 회화 카드 → '/talk'.

사진 도구 메모: tsx 로 띄운 스크립트에서는 가짜 음성 함수(`installFakeWebSpeech`)에 `__name` 이 붙어 쪽에 들어가지 못해, Playwright WebKit 의 진짜 webkitSpeechRecognition 이 남는다(localhost 에서 있음). 그래서 마이크 닫힘 사진은 저장 상태로 만들었다. e2e(Playwright 변환)는 가짜가 제대로 든다.

### 다르게 한 것과 까닭

1. **부모 메뉴 꼬리표를 종이 띠 안으로**(목업 B_Home4 는 오른쪽 아래 구석). 세로 820 에서 한 화면에 들어가게. 1-가는 점만 보이고 누를 수 없다(정할 것 ㅊ). 글 '부모'(목업)는 `data-parent-info`(부모용 작은 글 18px).
2. **'내 단계 찾기' · 회화 '말하기에서 …' 카드는 차례 5(배치 평가 화면) 전까지 누를 수 없다**(`home-cards.tsx` `PLACEMENT_OPEN = false`, 브리프 '비활성'). 가는 곳은 `/<영역>/placement`(회화는 `/speaking/placement`)로 둬 차례 5 에서 상수만 바꾼다.
3. **수업 목록(`/<영역>/lessons`)은 차례 4** — 지금 카드를 누르면 아직 없는 쪽(404)이다. 요청자에게 알려야 한다(알릴 것 1).
4. **이번 주 n일에서 배치 평가 세션은 뺐다**(정할 것 ㄴ '그 영역 세션(복습 포함)'의 해석 — 배치는 공부한 날이 아니라고 봄). 오늘 완료도 배치를 세지 않는다.
5. **아는 단어 · 최근 성적 · 끝낸 대화는 지금 실제 질의로 센다**(vocab_progress known · 이 단원 회차의 끝낸 정규 세션). 행이 없어 0 · 빈 칸이지만 P11 · P12 가 행을 넣으면 그대로 채워진다. 단원 단어 수는 그 단원 unit_specs(시작 개정)의 target_vocab 수.
6. **카드 전체가 링크 하나**(R14 — 카드와 '시작!' · '이야기 고르기'가 같은 곳). '시작!'은 링크 안의 단추 꼴 글(따로 누르는 요소가 아님).
7. 회화 카드의 토리 얼굴 · 친한 정도 · 오늘 이야기 제목, 연속 학습 일수, 복습 포스트잇, '첨삭이 왔어요'는 1-나 · P11 · P12 몫이라 그리지 않았다.

### 알릴 것

1. 요청자가 3001 에서 카드를 누르면 수업 목록이 없어 404 다(차례 4 에서 생김). '내 단계 찾기'는 흐리게 누를 수 없다(차례 5).
2. 마이크 판정 전(첫 그리기) 말하기 · 회화 카드는 이름만 보이는 누를 수 없는 꼴이다가 판정 뒤 바뀐다(깜빡임 한 번). 서버는 기기 상태를 모르므로(7절 '기기 상태는 브라우저에만') 이 꼴이 가장 안전하다고 봤다.
3. 닫힌 · 비활성 카드는 `opacity-60` 으로 흐려 글 대비가 낮아진다 — 화면 검토에서 볼 것.
4. 회화 '끝낸 대화 n/<최소 수업 수>'의 최소 수업 수는 그 단원 복사본의 unit.min_lessons(시험용 작은 틀 2)다.

### fix 1(review-p10-2-code — I 1 · M 3 · 7절 2)

차례 3 파일(done.ts · home/index.ts · (child)/page.tsx · home-cards.tsx · talk/page.tsx · 홈 시험 셋 · board.tsx · globals.css)은 고치지 않았다. 첫 실행 화면은 `submitName` 의 오류 처리만 고쳤다.

| 지적 | 고친 곳 | 시험 · 빨강 먼저 |
|---|---|---|
| I-1 DB 오류 글에 이름 · PIN 해시 | 새 `src/server/db/safe-error.ts` — `dbErrorTag(error)`(오류 이름 + 원인 사슬의 첫 코드만) · `safeDbError(error)`(그 글만 담은 새 Error, cause 없음). `saveFirstRun` 을 감싸 유일 위반 → already_done, 그 밖 → `console.error('첫 실행 저장 실패(<이름 코드>)')` + `{ ok: false, reason: "unavailable" }`(본문은 `saveFirstRunUnsafe`). 새 `checkVocabName` → `{ ok: true, vocabWord } \| { ok: false, reason: "unavailable" }`, 서버 액션 `checkEnglishName` 이 그것을 돌려준다. 화면 `submitName`: unavailable → C72 '지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요', catch → `navigator.onLine` 이 거짓이면 7절 끊김 문장 · 아니면 C72 문장(저장 catch 와 같은 꼴) | 통합 셋 — '첫 실행 저장 중 profiles 넣기가 DB 오류로 실패하면 unavailable 이고 오류 · 로그 글에 이름 · PIN 해시가 없다' · 같은 꼴 parent_auth(BEFORE INSERT 트리거) · '이름 확인 중 DB 오류가 나면 unavailable 이고 로그 글에 영어 이름이 없다'(vocab 테이블 이름을 잠깐 바꿈). 앱 안 이름 토리 · Tori 와 `$argon2id$` 가 던진 글 · console.error 글에 없음을 단언. **빨강 먼저 봄**(저장은 던져서 undefined, checkVocabName 없음) → 초록 |
| M-1 알파벳 앞섬 시험 | `tests/unit/first-run.test.ts` '알파벳을 아직 모르면 …'에 `chosen { reading: 3, writing: 2 }` + 알파벳 모름 → 둘 다 1단계 단원 0 사례 | 코드는 이미 맞아 처음부터 초록(시험 빈틈이었다 — 검토 변이 표본이 이 사례로 잡힌다) |
| M-2 마이크 칸 상한 | `start.ts` 맨 위 `MIC_CODE_MAX` 64 · `MIC_BROWSER_MAX` 120(기술 값), `MicResultSchema` 는 `.transform(slice)` 로 잘라 받음(저장을 막지 않음) | 단위 '마이크 확인 실패의 코드 · 브라우저 글은 저장을 막지 않고 MIC_CODE_MAX · MIC_BROWSER_MAX 까지 잘라 받는다' — **빨강 먼저 봄** → 초록 |
| M-3 두 벌 | (가) `src/lib/speech/browser.ts`(P2 공용)에서 `deviceFacts()` 를 내보내 음성 접점 `device()` 와 `src/lib/mic-state.ts` `readDeviceVerdict()` 가 같이 씀. (나) 새 `src/db/schema/seed-revision.ts` `SEED_REVISION_TABLES`(server-only 아님, drizzle.config schema 목록 밖)를 `src/server/seed/read.ts`(P7a 공용) `currentSeedRevision` 과 `tests/e2e/household.ts` 가 같이 씀 | 기존 시험(통합 first-run · dev-seed · seed-load, e2e first-run · home) 초록 |
| 7절 2 beforeEach 중복 | `tests/e2e/first-run.spec.ts` 의 `plain.beforeEach` 를 지움(같은 파일 묶음이라 `test.beforeEach` 하나가 둘 다 덮음) | e2e 29 초록(plain AC-1a 시험도 프로필 0 단언 통과) |

공용 파일 변경: `src/lib/speech/browser.ts`(P2 — `deviceFacts` 내보냄, 동작 같음) · `src/server/seed/read.ts`(P7a — 목록을 상수로).

실행: biome ci 0 · tsc 0 · test 322(321 + 1 M-2, M-1 은 기존 시험 안 사례) · test:int 82 + 1 건너뜀(79 + 3) · e2e 29 · deps 0 · bundle 0.

다르게 한 것: `submitName` 은 두 갈래(영어 이름 · 별명)의 확인 호출을 하나로 합쳐 unavailable 처리를 한 자리에 뒀다(오류 처리 줄 밖의 변화는 이것뿐). `safeDbError` 는 지금 쓰는 곳이 없다(첫 실행은 reason 으로 돌려준다) — P11 · 1-나가 던져야 할 때 쓰도록 두었다.

## 차례 4 — 먼저 시작한 순수 함수(브리프 전, 새 파일만)

- `src/core/lesson-list/state.ts`(plan-p10b 값 1): `lessonListState`(지금 단원 묶음 — 앞줄 발급된 보강 · 배정 · 알파벳, 뒷줄 다지기 · 끝냄 · 하던 중 · 맨 위 하던 수업 → 첨삭 보기 → 단계 평가 · '여기부터 해요' 4절 차례 · 잠긴 다음 단원 한 줄(수업 수 → 학습일 → 단어 → 성적) · '지난 수업 다시 하기' · 안내) · `pastUnits`(retry · untried) · `judgeLessonStart`(같은 입력으로 재판정 — 종류 · 변형 규칙 · 처음 변형 · 처음 개정 · resume · abort).
- `tests/unit/lesson-list-state.test.ts` 7: plan 증명 표의 단위 이름 다섯(AC-2b 1 · AC-2d 4) + '세션 틀: 목록에서 고를 수 있는 수업은 모두 재판정을 지나고 …'(위험 3 맞대기) + 부모 확인 대기 · 다음 단계 준비 중. **빨강 먼저 봄**(모듈 없음) → 7 통과.
- plan 과 다르게 한 것: (가) 입력에 `roundStartedAt`(지금 단원 회차 시작 시각)을 더했다 — '이 회차에서 끝낸 정규 수업'을 가르려면 회차가 필요하고 세션 행에는 회차가 없다. 지난 단원은 회차와 관계없이 '끝낸 적'. (나) 재판정 까닭에 `paused` 를 더했다 — 부모 확인 대기 · 다음 단계 준비 중 · 졸업 상태에서 지금 단원의 아직 하지 않은 수업은 목록에 열리지 않으므로(4절) 재판정도 거부한다(끝낸 수업 다시 하기 · 지난 단원은 열림). (다) 재판정이 retry 의 `firstVariant` · `firstRevision`(그 칸을 처음 끝낸 세션)을 함께 돌려준다 — 서버가 판 · 변형을 고를 때 쓴다.
- 실행: biome 0 · tsc 0 · test 329(322 + 7).

## 차례 4 — 수업 목록(plan-p10b 작업 3, 검토 묶음 B2)

상태: DONE_WITH_CONCERNS(구현 · 시험 · 실기 초록. 우려는 '알릴 것'). 차례 3 파일은 고치지 않았다.

### 바뀐 파일

| 파일 | 신규 / 수정 | 무엇 |
|---|---|---|
| `src/core/lesson-list/state.ts` | 신규(먼저 시작한 순수 함수 — 위 절) | `lessonListState` · `pastUnits` · `judgeLessonStart` |
| `tests/unit/lesson-list-state.test.ts` | 신규 | 단위 7 |
| `src/server/lesson-list/index.ts` | 신규 | `server-only`. `closeStaleSessions`(배치 밖 진행 세션 가운데 started_at < now − session.resume_hours → aborted · learning_day = 지금 학습일, 정할 것 ㄷ) · `readLessonList`(no_profile · placement · list — 트랙 · 지금 단원 회차 · 통과한 단원 · `readLessonsOfUnit`(회차의 시작 개정)에서 프로필 묶음 변형 · 없으면 가장 낮은 변형(정할 것 ㅂ) · 이 단계 세션(칸을 이어 ref) · gate 수(최소 수업 수 = max(배정 · 알파벳 수, 복사본 unit.min_lessons), 쓰기 6단계 이상은 level_specs `frame.minLessons` · 학습일 = 복사본 unit.min_days − 정규 · 보강 · 연습 · 다시 하기를 끝낸 서로 다른 학습일) · 상태(parent_check pending · next_level_pending · graduated)) |
| `src/app/(child)/[area]/lessons/page.tsx` | 신규 | 영역 넷만(나머지 notFound) · 회화 → `/talk` · 프로필 없음 → `/first-run` · 배치 전 → `/<영역>/placement` · `LessonBoard` 에 view 와 칸 제목 |
| `src/app/(child)/[area]/lessons/lesson-board.tsx` | 신규 | 'use client'. 종이 띠(영역 · 'n단계 · 단원 u' · '홈') · 다음 단계 준비 중 안내 · 맨 위 차례 · 지금 단원 묶음(앞줄 보강 · 배정, 뒷줄 다지기, 번호 · 제목 · 끝냄 ✓ 그림 · '보강') · '여기부터 해요' 하나 · 부모 확인 대기 안내 · 잠긴 다음 단원 한 장과 한 줄 · '지난 수업 다시 하기' · 고르기(고른 표시) · 하던 수업이 있으면 확인 쪽지. `SESSION_START_OPEN = false`(차례 6). 가로 화면은 오른쪽 칸에 잠긴 단원 · 지난 수업 |
| `src/app/(child)/[area]/lessons/past/page.tsx` | 신규 | 단원 고르기('단원 n') → `?unit=n` 그 단원 수업(번호 · 제목 · '안 해 본 수업'). 통과 안 한 단원 값은 되돌림, 지난 단원이 없으면 수업 목록으로 |
| `tests/integration/lesson-list.test.ts` | 신규(plan 표 밖 — 더함) | 통합 4 |
| `tests/e2e/lesson-list.spec.ts` | 신규 | e2e 5(AC-2b 1 · AC-2d 1 · 지난 수업 · 리다이렉트 · 안내와 확인) |

### 시험 · 빨강 먼저

- 단위 `lesson-list-state.test.ts` 7: 빨강 먼저 봄(앞 절).
- 통합 `lesson-list.test.ts` 4 — '수업 목록 자료: 배치 전 영역은 배치로, …' · '수업 목록 자료: 이 회차에서 끝낸 정규 수업이 수업 수 줄을 줄이고, …' · '세션 틀: session.resume_hours 가 지난 진행 세션은 수업 목록 요청 때 중단으로 닫히고 배치 평가는 닫히지 않는다'(plan 증명 표 이름 — 차례 6 의 session-start.test 에는 다시 두지 않는다) · '수업 목록 자료: 통과한 단원이 있으면 …'. **빨강 먼저 봄**(모듈 없음) → 초록.
- e2e `lesson-list.spec.ts` 5 — 'AC-2b 홈의 읽기 포스트잇을 누르면 세션이 아니라 읽기 수업 목록이 열리고 셋째 수업을 먼저 고를 수 있으며 다음 단원 묶음은 눌러도 열리지 않는다' · 'AC-2d 수업 포스트잇마다 번호와 한국어 제목이 있고 '여기부터 해요'는 하나다' · 지난 수업 · 리다이렉트(배치 · 회화 · 404) · 부모 확인 안내와 하던 수업 확인 쪽지. **빨강 먼저 봄**(5 실패) → 초록(첫 판의 실패 하나는 시험 쪽 위치 잡기 — 고른 표시가 포스트잇 단추에 있음).

### 실행

| 명령 | 결과 |
|---|---|
| `pnpm exec biome ci .` · `tsc` | 0 · 0 |
| `pnpm build` | 성공(`/[area]/lessons` · `/[area]/lessons/past` ƒ) |
| `pnpm test` | 329 |
| `pnpm test:int` | 86 + 1 건너뜀(82 + 4) |
| `pnpm e2e` | 34(29 + 5) |
| `pnpm check:deps` · `check:bundle` | 0 · 0 |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0, missing-test 44 → 42(AC-2b · AC-2d) |

### 실기 · 사진

`next start` 3302 + 임시 DB 54339(3001 · 54331 은 건드리지 않음). 사진 `p10-lessons-{normal, resume, confirm, unit2-with-past, past-units, past-lessons, parent-check}-{portrait,landscape}.png`(열넷): 모두 가로 넘침 없음 · 한 화면. `/writing/lessons`(배치 전) → `/writing/placement`. 처음 판은 가로에서 843/820 으로 넘쳐 카드 높이 · 틈을 줄이고, 가로 화면은 잠긴 단원 · 지난 수업을 오른쪽 칸으로 옮겨 맞췄다(실시드는 단원마다 정규 10~15 수업이라 오른쪽 칸이 더 낫다고 봄). 시험용 시드의 수업 제목은 'reading 1단계 수업 n' 같은 지어낸 글이다.

### 다르게 한 것과 까닭

1. `ListInput.roundStartedAt` · 재판정 까닭 `paused` · retry 의 `firstVariant` · `firstRevision`(앞 절).
2. 세션 시작은 `SESSION_START_OPEN = false` — 고르면 고른 표시(aria-pressed), 하던 수업이 있고 다른 수업이면 4절 확인 쪽지('새 수업 할래요' · '하던 수업 할래요')까지 보이고 시작은 하지 않는다. 지난 수업 쪽의 수업 포스트잇은 아직 누를 수 없는 글 상자다(차례 6 에서 같은 고르기).
3. 맨 위 차례 '단계 평가' 이름은 '<n>단계 평가'(4절 세션 결과의 'n단계 평가 보기'에서 '보기'를 뺀 꼴, 정본 밖) — 자료는 P12 가 채우므로 지금 화면에 나오지 않는다.
4. '홈' 단추 · '수업 목록' 단추(지난 수업 쪽 오른쪽)는 board 의 작은 단추 꼴을 화면 파일에서 링크로 그렸다(board.tsx 를 이번에 고치지 않으려고 — 바람 목록 1).
5. 가로 화면 두 칸 배치(위 실기).
6. 통합 시험 파일 하나를 plan 표 밖에 더했다(서버 자료 · 오래 멈춘 세션 닫기).

### 알릴 것

1. 요청자가 3001 에서 수업 포스트잇을 누르면 고른 표시만 생기고 세션이 열리지 않는다(차례 6). 배치 전 영역 카드 → `/placement` 은 아직 없는 쪽(차례 5).
2. 끝낸 수업 ✓ 는 그림만이라 보조 기술에는 읽히지 않는다(정본 밖 문구 표 '끝낸 수업은 ✓ 그림(글 없음)' 그대로) — 화면 검토에서 볼 것.
3. 오래 멈춘 세션 닫기는 목록 요청 때만 돈다(5절 글자대로, plan 위험 8) — 홈은 진행 세션을 보이지 않는다.

### 차례 4 가 바라는 차례 3 변경(fix 2 때)

1. `board.tsx` 에 작은 단추 꼴 링크(`SmallLink`)를 더해 '홈' · '수업 목록' 링크를 화면 파일에서 꾸미지 않게.
2. 홈 카드의 '내 단계 찾기'(`PLACEMENT_OPEN`)와 수업 목록의 `SESSION_START_OPEN` 을 차례 5 · 6 에서 켤 때 함께 볼 것(지금은 각 파일 맨 위 상수).

### fix 2(B1 — review-p10-3-code · review-p10-3-design, 더함 review-p10-fix1 N-1 · N-2)

| 지적 | 고친 곳 | 시험 · 빨강 먼저 |
|---|---|---|
| 코드 I-1 AC-5c 둘째 e2e | `tests/e2e/home.spec.ts`: 첫 AC-5c 의 `denied` 쪽에 가짜 음성(default-ok)을 넣어 닫힘 까닭을 저장 상태 하나로 고정. 둘째 AC-5c 를 `audio-capture` 대본(새 `tests/fixtures/speech/scripts/audio-capture.json`) 묶음으로: (1) 말하기 1단계를 고른 첫 실행 '마이크 확인'이 audio-capture 로 실패 → 홈의 말하기 · 회화 카드가 열림 · `momo.mic.v1` 비어 있음 (2) 저장된 '쓸 수 없음' + 가짜(인식 API 있음) → 배치 전이어도 말하기 · 회화 마이크 문구 (3) 인식 API 없는 새 문맥 → 닫힘 · 저장 없음, 다음 쪽(API 있음) → 열림 | 코드는 이미 그렇게 돌아 처음부터 초록(시험이 이름의 두 절을 이제 증명함) |
| 코드 M-1 | `tests/integration/home.test.ts` 둘째 시험에 단원 3 회차(통과 시각 없음) → 셋째 칸 `upcoming` · 복사본 `unit.recent_window` 를 원래 값 − 2 로 바꿔 칸 수가 그 수 | 처음부터 초록(시험 빈틈) |
| 코드 M-2 (가) | `src/server/home/index.ts`: '이번 주 n일'은 배치 세션도 센다, 배치 빼기는 오늘 완료 쪽에만 | 통합 '홈 자료: '이번 주 n일'은 배치 평가 세션을 끝낸 날도 세고 오늘 완료는 배치 평가로 켜지지 않는다' — **빨강 먼저 봄** → 초록 |
| 코드 M-3 · 화면 H-M3 | `home-cards.tsx`: 카드에 `label` 을 넘기지 않음 — 안의 글(영역 · 단계 · 단원 · 상태 · 닫힘 까닭 · '내 단계 찾기')이 읽히는 이름 | e2e 그대로 초록 |
| 화면 I-1 흐린 카드 대비 | 공용 `PostIt`(`board.tsx`) 비활성 꼴: `opacity-60` 대신 바탕만 영역 색 45% + 종이 55% 섞음(`color-mix`), 글은 먹색 그대로 · `cursor-not-allowed` | 화소 측정(가로 1180, WebKit 사진): 마이크 닫힘 문구 **11.18:1**(글 #2b2b2b · 바탕 #ffdce1), '이번 주 n일'(내 단계 찾기 카드) **12.56:1**(바탕 #fff2b6). 수업 목록에는 비활성 포스트잇이 없어(잠긴 단원은 종이색 · 지난 수업 쪽은 글 상자) 같은 꼴이 쓰일 자리가 아직 없다 |
| 화면 H-M1 카드 높이 | 카드 격자 `items-start`, 카드 `h-full` 뺌 — 내용 높이 · 위쪽 정렬, 아래로 코르크 | 사진 `p10-home-{placed,mic-closed,placement}-2-*`(세로 · 가로 한 화면 · 넘침 없음) |
| 화면 H-M2 판정 전 | 마이크 판정 전에는 말하기 · 회화 카드를 링크 없이 틀(영역 · 단계 · 단원 · 칸 · 막대 · 이번 주 · 오늘)만 그리고 행동 자리(단추)는 같은 높이로 비움, 닫힘 문구는 판정이 '쓸 수 없음'일 때만 | e2e 그대로 초록 |
| 화면 H-M4 부모 점 | 점을 먹색으로(목업 #8A6134 에서 벗어남) | 점 대 꼬리표 바탕 **7.00:1**(#2b2b2b · #c8b48e) |
| 차례 2 N-1 | 시작 단계 화면 영역 단추: '보는 중'은 아래 굵은 줄(`border-b-8`), 체크 없음(체크는 고름에만) | 사진 `p10-first-run-6-level-2-*` |
| 차례 2 N-2 | 단계 칸: 선택지마다 '단추 + 예시 줄' 한 묶음, 가로는 두 열 열 우선(`grid-flow-col` · 줄 수 = ⌈(단계 수 + 1) / 2⌉) — 왼쪽 고르지 않음 · 1 · 2 · 3, 오른쪽 4 · 5 · 6 | 같은 사진 |
| 차례 2 N-3 | 거절된 별명 칸은 굵은 실선 테(점선 뺌), iPad 안내 상자는 테 없이 옅은 코르크 바탕, 메뉴 이름표는 테 없는 굵은 글 | 사진 `p10-first-run-7-mic-2-*` |
| 더함 N-1 | `saveFirstRun` 이 `SettingMissingError` 를 받으면 로그 '첫 실행 저장 실패(설정 <키> 가 없습니다)'(P3b 꼴) · unavailable | 통합 '첫 실행 저장에 쓰는 설정이 없으면 unavailable 이고 로그 글에 그 설정 키 이름은 남고 이름 · PIN 해시는 없다' — **빨강 먼저 봄** → 초록 |
| 더함 N-2 | `safe-error.ts` 주석 보기 → 'Error P0001' | — |
| 그 밖 | `src/core/lesson-list/state.ts` 의 안 쓰는 매개변수 경고(`_c`) | — |

e2e 추가 단언(컨트롤러 핫픽스 확인): AC-1c 차례 시험에 '이름 화면에 들어오면 두 칸이 비어 있다' — 초록. first-run e2e 는 한글 이름 칸이 비제어(`defaultValue`)여도 `fill` 로 그대로 통과한다.

실행: biome ci 0 · tsc 0 · test 329 · test:int 88 + 1 건너뜀(86 + 2) · e2e 34 · deps 0 · bundle 0 · spec-trace 종료 0(missing-test 42). 실기는 `next start` 3302 + 임시 DB 54339(3001 · 54331 은 그대로 떠 있음 — 건드리지 않음). 사진 여덟 장(`-2`): 홈 placed · mic-closed · placement × 세로 · 가로, 시작 단계(1~6, 읽기 3 고름) · 마이크 화면 × 세로 · 가로 — 모두 한 화면 · 넘침 없음. talk-soon 화면은 바뀐 것이 없어 다시 찍지 않았다.

다르게 한 것:
1. **컨트롤러 핫픽스 둘(first-run-flow.tsx, 덮어쓰지 않음)**: (가) 한글 이름 칸 `value` → `defaultValue`(비제어) — 요청자 브라우저(Safari 추정)에서 조합 중 글자가 모이지 않던 것. (나) 화면 본문을 `<Fragment key={step}>` 로 감싸 단계마다 입력 요소를 새로 만듦 — 비제어로 바꾸자 PIN 칸 요소가 이름 칸으로 이어져 처음 값이 PIN 이 되던 것. 원인(조합 중 값 되돌림)은 요청자 브라우저 답을 기다리는 중이라 확인되면 적는다.
2. **영어 이름 칸(제어 유지)의 한글 입력기 문제**: 자동화로는 재현하지 못했다 — Playwright WebKit 은 조합(IME) 흉내 API 가 없고, 컨트롤러가 본 Chromium CDP 조합은 정상이었다. 영어 이름 칸은 로마자만 받는 칸(한글을 치면 '다음'이 눌리지 않음)이고 한글 이름에서 자동으로 채우려면 제어가 필요해 그대로 두었다. 요청자 기기에서 같은 증상이 보이면 조합 끝(compositionend)까지 상태를 늦추는 꼴로 고친다(추측).
3. 판정 전 말하기 · 회화 카드는 링크가 아니다(판정 전에 눌러 들어가지 않게) — 닫힘 꼴(흐림)도 아니고 보통 색 틀이다.
4. 부모 점 색은 목업에서 벗어났다(H-M4 — 먹색).
5. 잠긴 다음 단원 포스트잇(수업 목록, 차례 4)의 점선 테는 이번 N-3 범위(첫 실행 화면) 밖이라 그대로 두었다 — '점선은 초점에만'을 수업 목록에도 맞출지는 B2 검토에서 볼 것.

#### fix 2 덧붙임(컨트롤러 동결 알림 뒤)

- fix 2 는 동결 알림 전에 끝났다. 그때 `src/core/lesson-list/state.ts` 의 안 쓰는 매개변수 이름을 `_c` 로 바꿨는데(린트 경고), B2 가 읽는 중이라 **되돌렸다**(B2 가 읽는 판과 같음). biome 경고 하나(`noUnusedFunctionParameters`, 실패 아님)가 남는다 — fix 3 에서 고친다.
- 바라는 변경 1: `board.tsx` 에 `SmallLink`(작은 단추 꼴 링크)를 더했다. 수업 목록 · 지난 수업 쪽의 '홈' · '수업 목록' 링크를 이것으로 바꾸는 일은 **B2 뒤 fix 3** 으로 둔다.
- 다시 돌림: biome ci 0(경고 1) · tsc 0 · test 329.

### fix 3(B2 · 로마자 — review-p10-4-code · review-p10-4-design)

| 지적 | 고친 곳 | 시험 · 빨강 먼저 |
|---|---|---|
| 코드 I-1 통과한 지금 단원 | `src/core/lesson-list/state.ts:66` `ListInput.currentPassed`. `:162` 통과했으면 지금 단원도 회차 경계 없이 '끝낸 적 있음'으로 봄 → 끝낸 수업 `retry`. `:394` 지금 단원이고 통과 전일 때만 `regular`(부모 확인 대기면 `paused` 안전망 `:396`), 통과 뒤 안 한 수업은 `untried` · '안 해 본 수업' 표시(`:192`). `:248` 통과 상태면 잠긴 줄 숨김 · '여기부터 해요'는 하던 수업만. 서버 `src/server/lesson-list/index.ts:293` `currentPassed: current.passedAt !== null` | 단위 '세션 틀: 지금 단원을 통과한 상태(다음 단계 준비 중 · 졸업 · 단계 평가 대기)에서 목록의 수업은 모두 재판정을 지나고 안 한 수업은 안 해 본 수업이다'(맞대기 표: next_level_pending · graduated · level_test 대기 · parent_check(통과 뒤) × 끝낸 · 안 한 수업) · '세션 틀: 부모 확인 대기(지금 단원 통과 전)면 …' — **빨강 먼저 봄** |
| 코드 M-1 잠긴 줄 수 규칙 다섯 | 순수 함수로 뺌: `state.ts:439` `minLessonsOf`(배정 수와 복사본 `unit.min_lessons` 의 max, 쓰기 `WRITING_FRAME_FROM`(:429) 단계부터 level_specs `frame.minLessons`), `:460` `unitGateOf`(수업 수는 이 회차의 정규 수업만, 학습일은 정규 · 보강 · 연습 · 다시 하기의 서로 다른 날, 회차 경계는 끝낸 시각). 서버 `index.ts:249~277` 가 두 함수를 부름 | 단위 '잠긴 단원 수: 최소 수업 수는 배정 수와 …' · '잠긴 단원 수: 남은 수업 수는 이 회차에서 끝낸 정규 수업만 빼고 …' — **빨강 먼저 봄**. 통합 '수업 목록 자료: 남은 수업 수는 이 회차에서 끝낸 정규 수업만 빼고 다시 하기는 학습일에만 들며 …' · '수업 목록 자료: 복사본 unit.min_lessons 가 배정 수보다 작으면 …' — **빨강 먼저 봄**. 통합 '수업 목록 자료: 쓰기 6단계부터는 남은 수업 수를 level_specs frame.minLessons 에서 세고 …'는 구현 뒤에 더해 처음엔 초록 — 서버의 frame 값 넘김을 잠시 빼 빨강(기대 4 · 실제 2)을 확인하고 되돌림 |
| 코드 M-2 practice | `state.ts:288` 단어 익히기 상태면 잠긴 줄 `line: null` | 단위 '단어 익히기(practice) 상태에서는 잠긴 다음 단원 한 줄을 다시 쓰지 않는다' — **빨강 먼저 봄** |
| 코드 M-3 회차 경계 | `state.ts:155` `inRound` = 끝낸 시각(없으면 시작 시각) ≥ 회차 시작. 서버 세션 요약에 `completedAt` · `unit`(`index.ts:242`) | 단위 '이 회차에서 끝냄은 끝낸 시각으로 가른다 …' — **빨강 먼저 봄**. 통합은 M-1 첫 통합 시험의 '회차 전에 시작해 뒤에 끝낸 수업은 든다' |
| 코드 M-4 · 화면 ✓ | `lesson-board.tsx` 수업 포스트잇에서 고정 `label` 을 뺌. 안의 글(번호 · 제목 · '여기부터 해요' · '보강' · '안 해 본 수업')이 이름이고 끝낸 수업은 ✓ 그림 + 숨은 글 '끝낸 수업'(:173). e2e 위치 잡기는 `data-lesson` | e2e '수업 목록: 확인 쪽지가 열리면 …, 끝낸 수업은 이름에 '끝낸 수업'이 읽힌다' — **빨강 먼저 봄** |
| 화면 I-1 '여기부터 해요' 크기 | `lesson-board.tsx:148` `col-span-2` + 굵은 먹색 테 | 사진 `p10-lessons-normal-2-*` · `twelve-2-*` |
| 화면 세로 빈칸 | 감싼 격자 `content-start`(:240) — 위에서부터 쌓고 아래는 코르크 | 사진 전부 |
| 화면 앞줄 · 뒷줄 경계 | 뒷줄 앞에 이름표 '다지기'(:253, 정본 3절 용어) | 사진 `twelve-2-*` · `fifteen-2-*` |
| 화면 실시드 수 넘침 | 가로: 카드 최소 너비 128 → 112px(:35), 잠긴 단원 칸 240~300 → 200~240px(:240), 카드 높이 `min-h-24` · 안쪽 여백 줄임(:146). 세로는 그대로 | 12장 흉내(배정 6 · 다지기 6)와 15장 흉내(다지기 9) 모두 세로 · 가로 한 화면 · 가로 넘침 없음. 첫 판(128px)은 12장 가로가 세로 858/820 으로 넘쳐 고침 |
| 화면 부모 확인 대기 어긋남 | I-1 과 같음: 잠긴 줄 숨김, '여기부터 해요'는 하던 수업만 | 사진 `p10-lessons-parent-check-2-*` |
| 화면 확인 쪽지 초점 | 공용 `ConfirmSheet`(`board.tsx:379` Esc 로 닫힘, `:389` 첫 단추 '아니요'에 autoFocus). 수업 목록이 연 포스트잇을 기억해 쪽지가 닫히면 초점을 되돌림(`lesson-board.tsx:109~122`) | e2e 위와 같은 시험 — **빨강 먼저 봄** |
| 바라는 변경 1(fix 2 덧붙임) | 수업 목록 '홈'(:231) · 지난 수업 쪽 '수업 목록' 링크를 `SmallLink` 로 바꿈 | e2e 그대로 초록 |
| 그 밖 | `state.ts` 안 쓰는 매개변수 `_c`(fix 2 덧붙임에서 미룬 경고) | biome 경고 0 |

로마자 제안: fix 3 시작(00:1x) 때 조사 보고 `docs/research/2026-10-17-korean-given-name-romanization-common-spellings.md` 가 없었다. 브리프대로 **fix 4 로 미룸**. 보고 파일은 00:30 에 본 저장소에 생겼다(워크트리에는 없음).

실행: biome ci 0(경고 0) · tsc 0 · test 334 · test:int 91 + 1 건너뜀 · e2e 35 · deps 0 · bundle 0 · spec-trace 종료 0. 실기는 `next start` 3302 + 임시 DB 54339(3001 · 54331 은 건드리지 않음, 끝나고 3302 · 54339 닫힘 확인).

사진 열여덟 장(`-2`, 세로 820×1180 · 가로 1180×820, WebKit): 수업 목록 normal · resume · confirm · unit2-with-past · past-units · past-lessons · parent-check, 그리고 12장 흉내 twelve · 15장 흉내 fifteen. 모두 한 화면이고 가로 넘침이 없다. 12 · 15장 흉내는 임시 DB 의 읽기 1단계 단원 1 에 수업 칸을 복사해 넣었다.

다르게 한 것:
1. **잠긴 다음 단원 포스트잇은 남기고 한 줄만 숨김**: 통과 상태 · 부모 확인 대기 · 단어 익히기에서 '단원 n+1' 잠긴 칸은 그대로 두고 조건 줄만 뺐다. 다음 단원이 있다는 것은 보이되 열 조건은 말하지 않는 꼴이다. 칸까지 숨길지는 검토에서 볼 것.
2. **'여기부터 해요' 차례**: 통과 상태에서는 지금 단원 정규 수업을 가리키지 않는다. 하던 수업이 없을 때 첨삭 보기 · 단계 평가 차례는 원래대로 둔다(브리프의 '하던 수업만'을 '남은 배정 · 다지기를 가리키지 않음'으로 읽음).
3. **'끝낸 수업' 숨은 글은 새 문구**: C72 정본 밖 문구 표에 더하는 일은 컨트롤러 몫이다(plan 은 고치지 않음).
4. 가로 카드 크기를 줄였다(위 표). 세로 카드 크기는 그대로다.

남은 우려:
- parent-check 사진의 하던 수업은 지난 단원(단원 1)의 진행 세션이다. 지난 단원 수업을 이어 하는 것도 '여기부터 해요'가 붙는지는 검토에서 볼 것.
- 쓰기 6단계 frame 통합 시험은 시드 수업 칸이 1단계까지라 읽기 칸을 복사해 넣고 규격 행 값을 바꿨다가 되돌린다.
