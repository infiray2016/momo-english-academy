# 검토 보고: P10 차례 1 — 개발용 로컬 DB 길 · 시험용 시드 나무 · e2e DB(rev-p10 · 검토 묶음 T, 가벼운 루프, 2026-10-17 22:1x)

**판정: Approved** — Critical 0 · Important 0 · Minor 5(컨트롤러가 직접 고침, 고치는 법은 지적마다).

범위: 워크트리 `.claude/worktrees/p10`(바탕 596137a, 커밋 없음)의 차례 1 파일 넷(`scripts/dev-db.ts` · `tests/fixtures/seed/dev-tree.ts` · `tests/e2e/db.ts` · `tests/unit/dev-tree.test.ts`)과 공용 변경 넷(`package.json` · `.gitignore` · `playwright.config.ts` · `tests/fixtures/settings.ts`). 기준은 plan-p10a(파일별 값 1~3 · 공용 변경 1~4 · 위험 6 · 15 · 정할 것 하 · 서), `task-p10.md`, 13절 C70. 차례 2 파일(`src/core/profile/*` 등)은 보지 않았다.

재현(워크트리 파일은 고치지 않음, 포트 54417~54419):
- 임시 모드를 새 프로세스 묶음으로 띄우고 준비 줄 뒤 묶음 전체에 SIGINT · SIGTERM(터미널 Ctrl+C · Playwright 와 같은 꼴) 5회 → 모두 종료 0 · 0.13초 · 임시 폴더 0 · 포트 닫힘.
- 준비 줄 전(시작 중)에 SIGTERM 7회 → M-2.
- 스크래치패드 복사본(node_modules 는 링크, 비밀 파일은 빼고)에서 개발용 모드 셋 → M-1 · 확인 둘(아래 표).
- 남긴 것: 내 재현이 남긴 OS 임시 폴더 다섯은 지웠다. 남은 프로세스 · 듣는 포트 없음.

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| `pnpm db:dev` 개발용: `.dev/db/data` · 포트 54329 · persistent · `PG_VERSION` 없으면 initialise | ✅ | `scripts/dev-db.ts`:340-346 · 366-377 |
| 비밀번호 `.dev/db/password` 처음 한 번 `randomBytes` · 0600 | ✅ | `dev-db.ts`:302-312. 복사본 실기: `.dev` 0700 · `.dev/db` 0700 · password 0600 |
| e2e 임시: `mkdtemp` · `--port` · `E2E_DB_PASSWORD` 없으면 종료 2 · persistent false · 끌 때 지움 | ✅(준비 뒤) · ⚠️(시작 중 신호, M-2) | `dev-db.ts`:332-338 · 394-401 |
| Supabase 역할 흉내 · DB · 기본 권한 · 늘 migrate — P3a global-setup 과 같은 차례 | ✅(중복은 M-4) | `dev-db.ts`:65-69 · 404-449 ↔ `tests/integration/global-setup.ts`:150-175. SQL 글자 · 차례 같음 |
| 시드: content 테이블이 비면 P7a `loadSeed`(직접 INSERT 없음) · 거부면 종료 1 · 있으면 kept | ✅ | `dev-db.ts`:452-502(`loadSeed(db, { files: filesOf(devSeedTree()), completeThrough, areas, now: now() })`). `loadSeed` 경로에 `getDb()` 기본값 없음 확인(`src/server/seed/load.ts`) — `.env.local` 의 다른 주소가 적재에 끼지 않는다 |
| `.env.local`: 로컬 주소일 때만 · 다른 주소면 둘 다 안 건드림 · 값 출력 없음 · 새 파일 0600(위험 15) | ✅(다른 포트 함정은 M-3) | `dev-db.ts`:168-218 · 505-528. 복사본 실기: 지어낸 원격 주소가 든 파일은 바이트 · 권한(0644) 그대로, 안내 한 줄. 파일이 없으면 새로 0600, 키 둘 |
| 준비 줄 `DEV_DB_READY dev port=<n> seed=<loaded\|kept>` · 다음 할 일 · e2e `DEV_DB_READY e2e` · 접속 문자열 · 비밀번호 없음 | ✅ | `dev-db.ts`:225-261. 오류 글은 비밀번호를 가린다(293-299 · 381-382) |
| 종료 코드 0 · 1 · 2, 시작 실패에 로그 끝 줄 | ✅ | `dev-db.ts`:9 · 380-383 · 489-497 · 592-603 |
| `devSeedTree()`: 말하기 배치 본 문항 → `{ no, revision, correction, type: "repeat", sentence: script }` · 예비 그대로 · 바꾼 칸 풀이 기록 뺌 | ✅ | `tests/fixtures/seed/dev-tree.ts`:26-72. 시험이 완전성 1단계 · 영역 셋 `errors`/`empty`/`unchecked` 빈 값과 본 칸 기록 없음 · 예비 칸 기록 있음을 단언(`tests/unit/dev-tree.test.ts`:66-131) |
| `DEV_SEED_AREAS` 읽기 · 쓰기 · 말하기 · `DEV_SEED_THROUGH = LOADABLE_THROUGH` | ✅ | `dev-tree.ts`:17-23 |
| 적재 수가 시험으로 고정되는가 | ❌(Minor, M-5) | 단위는 `validateSeed` 만 본다. 행 수(lessons 68 · placement_items 48 …)는 보고의 손 실행뿐 |
| `TEST_SETTINGS` P10 키 서른셋 = 12절 기본값 · 범위 집 전체 | ✅ | `tests/fixtures/settings.ts`:67-102 ↔ `specs/09-설정값.md`:16-39 · 60 · 78-85 · 90 · 124 한 줄씩 대조(unit.min_days 4·5·6·7 · end_silence 3·1.5·1.5·1.5 포함). 구간 꼴 `.1-3` 은 `src/core/speech/listen.ts`:21 과 같음. 작은 틀 값이 이기는 것을 시험(`dev-tree.test.ts`:141-144) |
| `tests/e2e/db.ts`: server-only 없이 postgres + drizzle + 스키마 셋 · 주소는 비밀번호 · 포트로 조립 | ✅ | `tests/e2e/db.ts`:7-29 · `playwright.config.ts`:48-54 |
| `resetHousehold` 지우는 범위 | ✅ | 프로필 따라 지움은 스키마 FK 로 확인(settings · progress_events · parent_alerts cascade, ai_calls set null) — `src/db/schema/operations.ts`:49-50 · 112-113 · 166-168 · 180-181 |
| `withHouseholdSetting` · `cloneLessons` · `insertSessions` · `countRows` · `shiftTimes`(SQL 안 now() 없음) | ✅ | `db.ts`:63-216. `cloneLessons` 의 `onConflictDoNothing` 은 `lessons_slot_unique`(topic_variant · revision · correction 포함, `content.ts`:312-323)에 걸려 주석대로 '같은 칸 · 판이면 건너뜀'. 설정 읽기에 캐시가 없어(`src/server/settings/index.ts`) 바꿈 · 되돌림이 바로 보인다 |
| `insertHousehold` | ⚠️ 차례 2 로 미룸 | `db.ts`:6 주석. 다르게 한 것 8 |
| 공용 1 `db:dev`(글자 그대로) · 2 `/.dev/` | ✅ | `package.json`:27 · `.gitignore`:18-19. `git check-ignore` 로 `.env.local`(`.env*`) · `.dev/db/password` · `.dev/db/data/*` 무시 확인 |
| 공용 3 비밀번호 실행 때 · `E2E_DB_PORT` 54339 · webServer 배열(DB 먼저 · `wait.stdout` · 다시 쓰기 끔 · gracefulShutdown SIGTERM · `env`) · Next `DATABASE_URL` URL 속성 조립 · `workers: 1` | ✅ | `playwright.config.ts`:19 · 41-54 · 61 · 75-96. 비밀번호는 환경 변수로만 가고 명령줄에 없다 |
| 공용 4 | ✅ | 위 설정 행 |
| 공용 변경 넷이 보고에 따로 표시 | ✅ | `task-p10-report.md` '공용 파일 변경' 표 |
| 설계 숫자 · 기술 값이 이름 붙은 상수 | ✅ | `dev-db.ts`:30-62 · `playwright.config.ts`:19-23 · `db.ts`:18-20. 화면 수 없음 |
| 경계 규칙 | ✅ | 차례 1 은 `src/` 를 바꾸지 않는다(`check:deps` 는 `src` 만 훑음, `package.json`:20). `scripts → tests/fixtures` 가져오기는 plan 이 정한 꼴 |
| spec-trace 시험 이름 | ✅ | plan 증명 표의 두 이름이 글자 그대로(`dev-tree.test.ts`:66 · 203), AC 접두 없음 |
| 기존 e2e 초록(P3b smoke 포함) | ⚠️ 다시 안 돌림 | 컨트롤러 재확인 e2e 18 · 구현 보고 e2e 18 · e2e:local 7. 차례 1 은 `/` 를 바꾸지 않아 smoke 기대 변경은 차례 2(공용 변경 8) |

## 2. 잘한 점

- **`.env.local` 규칙이 plan 보다 안전하다.** 두 키 가운데 하나라도 다른 주소면 둘 다 그대로 둔다. 주소 꼴이 아닌 값과 주석 줄도 시험이 가른다(`dev-tree.test.ts`:203-271). 복사본 실기에서 다른 주소가 든 파일은 바이트와 권한이 그대로였다.
- **시드 나무 시험이 빈 단언이 아니다.** 완전성 모드의 `errors` · `empty` · `unchecked` · `referenceErrors` 를 모두 0 으로 묶는다. 본 칸 기록은 빠지고 예비 칸 기록은 남는 것까지 칸 키로 본다(`dev-tree.test.ts`:66-131).
- **신호 처리 진단이 정확하다.** embedded-postgres 는 읽힐 때 `AsyncExitHook(gracefulShutdown)` 를 걸고(`node_modules/embedded-postgres/dist/index.js`:394), async-exit-hook 는 첫 등록 때 SIGHUP · SIGINT · SIGTERM 을 128+n 으로 건다(`async-exit-hook/index.js`:85-104). 그래서 '읽은 뒤 새로 걸린 것만 뗌'이 맞는 자리다. 묶음 신호 5회 모두 종료 0 · 정리 끝.
- **비밀값을 내지 않는 길이 촘촘하다.** 접속 문자열은 URL 속성으로만 조립한다. 오류 글은 이름 · 코드 · 메시지만 내고 비밀번호를 가린다. 예상 밖 오류는 스택을 내지 않는다(`dev-db.ts`:598-602).
- **Playwright 의 CommonJS 읽기 문제를 맨 위 기본 모듈만 · 실행 때 동적 가져오기로 풀었다.** 접속 문자열 조립이 한 곳(`databaseUrl`)에 모였다.

## 3. 지적

### Critical · Important
없음.

### Minor

**M-1. `--reset --port <다른 포트>` 가 켜 둔 db:dev 의 자료 폴더를 지운다(다르게 한 것 3 이 연 길).**
- 무엇이: `--reset` 은 포트 검사(`dev-db.ts`:324)만 보고 `rmSync(databaseDir)`(:342)를 한다. 자료 폴더는 포트와 관계없이 하나라서 다른 포트로 켜 둔 클러스터가 있어도 지운다.
- 재현(복사본): `--port 54418` 로 켜 둔 채 `--reset --port 54419` 를 띄움. 결과는 아래와 같다.
  - 둘째가 같은 폴더에 새 클러스터를 initdb 하고 54419 에서 적재까지 마쳤다(60초 안에 끝나지 않고 켜져 있음).
  - 첫째를 끄니 응답이 없었다(`pg.stop()` 이 오지 않는 'exit' 를 기다림 → SIGKILL).
  - 같은 자료 폴더에 postmaster 둘이 붙은 셈이다.
- 왜: 버리는 DB 라 손실은 작다. 다만 요청자 컴퓨터에서 켜 둔 DB 가 말없이 깨지고 끄기가 멈춘다.
- 어떻게: `startCluster` 의 `rmSync` 앞(:342)에서 `join(databaseDir, "postmaster.pid")` 를 본다. 있으면 첫 줄 pid 에 `process.kill(pid, 0)` 을 해 살아 있을 때 종료 2로 끝낸다. 문구 예: "dev-db: 다른 db:dev 가 이 자료 폴더를 쓰고 있어요. 그것을 끈 뒤 다시 해 주세요". `--reset` 이 아닐 때도 같은 검사를 하면 로그 끝 줄 대신 이 한 줄이 나온다. 순수 판정(`postmasterAlive(text, isAlive)`)으로 빼면 `dev-tree.test.ts` 에 사례 하나로 시험할 수 있다.

**M-2. 시작 중(준비 줄 전)의 신호는 정리 없이 끝나거나 10초 걸린다.**
- 무엇이: 내장 처리기를 뗀 때(`dev-db.ts`:361-365)부터 자기 처리기를 거는 때(:550, `startCluster` 가 끝난 뒤)까지 SIGINT · SIGTERM 처리기가 없다. 또 `stopCluster` 는 `pg.stop()` 이 끝나야 임시 폴더를 지운다(:394-401). 그런데 embedded-postgres `stop()` 은 이미 끝난 자식 프로세스에도 `on('exit')` 를 걸고 기다린다(`embedded-postgres/dist/index.js`:236-266).
- 재현(임시 모드, 묶음 SIGTERM 7회):

  | 보낸 때 | 종료 | 걸린 시간 | 임시 폴더 |
  |---|---|---|---|
  | 0.6 · 0.8 · 1.0초 | -15(처리기 없음) | 0초 | 남음 |
  | 0.9초 · 0.9초 | 0 | 10.2초(async-exit-hook 의 beforeExit 시간 상한) | 남음 |
  | 1.1 · 1.2초 | 0 | 0.13초 | 지움 |
- 왜: Playwright 는 끝날 때만 SIGTERM 을 보내 보통 길에는 닿지 않는다. 그러나 `pnpm e2e` 나 `pnpm db:dev` 를 띄우자마자 Ctrl+C 하면 OS 임시 폴더에 initdb 자료(수십 MB)가 남는다. 개발용 모드는 반쯤 만든 클러스터가 남아 다음 실행이 '띄우지 못했어요'로 끝날 수 있다(그때 `--reset` 안내가 없음).
- 어떻게:
  1. `stopCluster` 에서 `await Promise.race([cluster.pg.stop(), delay(STOP_WAIT_MS)])` 로 기다림에 상한을 둔다. 그러면 finally 의 임시 폴더 지우기가 늘 돈다. `STOP_WAIT_MS` 는 이름 붙인 기술 값이고 `E2E_DB_SHUTDOWN_TIMEOUT_MS`(10초)보다 짧게 둔다.
  2. 신호 처리기를 처리기를 뗀 바로 뒤(:365)에 건다. 클러스터가 아직 없으면 그때까지 정해진 `tempDir` 만 지우고 0 으로 끝낸다. 그러려면 `cluster` 를 `let` 상태로 두거나 `startCluster` 가 `tempDir` 를 먼저 알리는 꼴로 바꾼다.
  3. (덤) 시작 실패 문구(:381)에 개발용이면 '`pnpm db:dev --reset` 으로 처음부터 만들 수 있어요' 한 줄을 붙인다.

**M-3. 예전 `--port` 실행이 남긴 로컬 주소를 '다른 DB 주소'로 본다.**
- 무엇이: `planEnvLocal` 은 54329 와 이번 포트만 로컬 개발용으로 친다(`dev-db.ts`:194 · 168-179). 컨트롤러 재확인대로 지금 워크트리 `.env.local` 은 `--port 54331` 실행의 주소다. 이 상태에서 요청자 길대로 기본 `pnpm db:dev`(54329)를 띄우면 고치지 않는다. '다른 DB 주소가 있어 고치지 않았어요'가 나오고, `pnpm dev` 는 꺼진 54331 에 붙는다. 보고의 알릴 것 2 도 같은 함정을 피하려고 값을 손으로 비웠다.
- 왜: 우리 DB 를 남의 DB 로 보는 안내라 사람이 헷갈린다. 고치는 길은 `.env.local` 을 손으로 비우는 것뿐이다.
- 어떻게: `isLocalDbAddress` 에 '로컬 호스트이고 경로가 `/${DB_NAMES.dev}`이면 포트와 관계없이 우리 주소' 갈래를 더한다. 사용자 이름 `postgres` 까지 보면 더 좁다. `dev-tree.test.ts` 의 `.env.local` 시험에 사례 둘을 더한다. 하나는 '127.0.0.1:54331/momo_dev 는 새 주소로 바꾼다'이다. 다른 하나는 '127.0.0.1:5432/mine 은 그대로 다른 주소'이고, 이 사례는 이미 있다.
- 그 전까지: 요청자 길에 넘어가기 전에 워크트리 `.env.local` 의 두 줄을 비우거나 54331 로 계속 띄운다(컨트롤러 판단).

**M-4. Supabase 역할 흉내 · 접속 문자열 조립 · 빈 포트 · 로그 끝 줄이 통합 시험 global-setup 과 두 벌이다.**
- 무엇이: `dev-db.ts`:65-69(역할 SQL) · 434-441(기본 권한) · 122-134(`databaseUrl`) · 284-290(`portFree`) · 347-354(로그 끝)이 `tests/integration/global-setup.ts`:150-171 · 51-62(`buildPgUrl`) · 33-47(`freePort`) · 70-83 과 같은 일이다. 글자 · 차례가 지금은 같다.
- 왜: Supabase 흉내를 바꾸면(예: `pgrst` 역할 · 권한 줄) 한쪽만 바뀔 수 있다. 개발용 DB 와 통합 시험 DB 의 권한이 갈라지면 RLS 시험이 실제와 어긋난다.
- 어떻게: global-setup 이 `scripts/dev-db.ts` 의 `databaseUrl` 과 역할 · 권한 SQL 을 가져다 쓴다. `dev-db.ts` 맨 위는 Node 기본 모듈뿐이라 Vitest 에서 가져와도 된다. 그러려면 `SUPABASE_ROLES` 와 `DEFAULT_PRIVILEGE_SQL`(제안)을 export 한다. 손이 크면 두 파일 머리 주석에 서로를 가리키는 한 줄만 두어도 된다.

**M-5. 적재 수가 시험으로 고정되지 않고, 가림 시험은 빈 길을 본다.**
- 무엇이:
  - `devSeedTree()` 를 실제 `loadSeed` 로 넣는 시험이 없다. 단위는 `validateSeed` 만 본다(`dev-tree.test.ts`:68-77). `loadSeed` 에는 검증기 밖의 검사가 있다(설정값 견주기 `compareSettings` · 판 규칙 · 단가표). 행 수(lessons 68 · placement_items 48 …)는 보고의 손 실행뿐이다. 지금은 `pnpm e2e` 가 매번 넣어 보므로(거부면 dev-db 종료 1 → e2e 실패) '넣힌다'까지는 간접으로 지켜진다.
  - 준비 줄 시험의 '비밀번호 없음' 단언(:303-306)은 `readyLines` 가 비밀번호를 받지 않아 늘 참이다. 실제로 비밀번호가 닿는 곳은 `describeError` 와 로그 끝 줄 가림(:293-299 · 381-382)이고 시험이 없다.
- 어떻게:
  1. 통합 시험 하나를 더한다(P7a 적재 시험 옆). `loadSeed(devSeedTree())` 의 `outcome` 이 `"loaded"` 이고 테이블별 행 수가 나무에서 센 수와 같은지 본다. 기대 수는 `filesOf(devSeedTree())` 에서 세어 숫자를 박지 않는다.
  2. `describeError` 를 export 한다. 비밀번호가 든 메시지가 `***` 로 바뀌는 사례 하나를 단위 시험에 더한다.

## 4. 다르게 한 것 판정(구현 보고 '다르게 한 것과 까닭' 아홉)

| # | 무엇 | 판정 |
|---|---|---|
| 1 | `import.meta` 를 쓰지 않음(뿌리 = `process.cwd()`, 직접 실행은 실제 경로 비교) | 타당. Playwright 가 설정을 CommonJS 로 읽는다. `e2e:local` 설정도 `playwright.config` 를 가져오므로 같은 문제다(`playwright.local.config.ts`:4). pnpm · webServer 모두 뿌리에서 띄워 뿌리 가정이 맞다 |
| 2 | 맨 위는 Node 기본 모듈만, DB · 시드는 실행 때 동적으로 | 타당. 설정 · 시험 일꾼이 `server-only` 를 읽지 않는다 |
| 3 | 개발용도 `--port` 를 받음 | 받아들임. 기본 포트가 쓰일 때 실기에 필요했다. 다만 M-1(`--reset` 과 함께)과 M-3(남은 주소)을 연다 |
| 4 | `.env.local` 두 키를 함께, 하나라도 다른 주소면 둘 다 안 건드림 · 주소 꼴 아니면 다른 주소 | 타당. plan 위험 15 보다 엄격한 쪽이다(섞인 접속 없음). 시험 있음 |
| 5 | '시드 테이블 다섯' → content 테이블 여덟이 모두 비면 | 타당. `loadSeed` 가 한 트랜잭션이라 반쯤 찬 경우가 없다 |
| 6 | embedded-postgres 신호 처리기를 뗌 | 타당(준비 뒤 5/5 확인). 시작 중 빈틈은 M-2 |
| 7 | 시드 거부 출력: 요약 첫 줄 + 위반의 규칙 · 테이블 · 칸 키(메시지 없음, 20줄) | 타당. 값이 나가지 않는다 |
| 8 | `insertHousehold` 는 차례 2 로 | 타당. `start.ts` 의 행 만들기 함수가 있어야 서버와 같은 행을 만든다. 차례 2 브리프 · 검토 묶음 A1 에서 볼 것 |
| 9 | `shiftTimes(table: "sessions" \| "level_tests", …)` · `cloneLessons` 의 `fromVariant` · 같은 칸이면 건너뜀 | 타당. 시각을 읽어 JS 로 빼고, 유일 제약으로 건너뛴다 |

## 5. 장부 판정(`ledger-open.md` · `ledger-closed.md`)

- **'개발용 로컬 DB 스크립트'**(`ledger-closed.md`:23, C70 으로 P10a 작업 1 에 옮겨 18:3x 에 닫음): **닫힘 유지.** 차례 1 이 그 몫을 만들었다. 실기 · 시험 · 이 검토로 확인했다.
- **열린 장부의 P10 행 다섯은 모두 아직 열림.** 근거는 차례 1 diff 가 `src/` 를 바꾸지 않는다는 것이다.
  - `P4a bandOf ↔ level-band 중복`(:16): 차례 2 공용 변경 9.
  - `화면 방향 · AREA_TONE → board 토큰 · keep-all · 글꼴 뒤 크기 시험`(:23): 차례 2.
  - `read.ts · currentSeedRevision`(:28 · :38): 차례 5 · 6.
  - `ActivityCard 20px …`(:33): 차례 2 이후.
- **새로 둘 만한 행(컨트롤러 판단):**
  1. 'P10 차례 1 Minor M-1~M-5'(컨트롤러가 직접 고친 뒤 닫음).
  2. '차례 2: `tests/e2e/db.ts` `insertHousehold`(start.ts 행 만들기 함수로)'.
  3. '요청자 로컬 DB 는 `TEST_SETTINGS` · 시험용 시드 꼴이 바뀌면 `pnpm db:dev --reset`'. 차례 2 이후 설정 키가 늘면 kept 경로가 새 키를 넣지 않아 `SettingMissingError` 가 날 수 있다(`dev-db.ts`:482). 안내 줄은 이미 있다.

## 6. 범위 밖 관찰

- 구현 보고 알릴 것 1(컨트롤러 `next dev` 를 `pkill -f "next-server.*"` 로 끔)은 코드가 아니라 작업 사고다. 차례 2 브리프에 '내가 띄운 pid 만 끈다'를 한 줄 두면 좋다.
- 처음 `pnpm db:dev`(`.env.local` 없음)에서 Node 가 표준 오류에 `.env.local not found. Continuing without it.` 를 낸다(`--env-file-if-exists`, 복사본 실기). P7a `seed:load` 와 같은 꼴이라 손대지 않아도 된다.
- 합칠 때(P7b · P10): P7b check-ids 는 파일 맨 위 대문자 상수를 이미 뺀다(`ledger-closed` P7b 행). 그래서 `DEV_DB_PORT` · `E2E_DB_PORT` · `CONNECTIONS` 는 허용 목록 없이 지날 것으로 본다(추측 — 합친 뒤 `pnpm check:ids` 한 번).
