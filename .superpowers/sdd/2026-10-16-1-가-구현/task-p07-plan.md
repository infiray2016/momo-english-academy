# 브리프: P7 하위 plan 작성(적재 · 판 규칙 · 개발용 DB · CI 작업)

역할: 계획자(general-purpose · Opus · xhigh). 코드를 만들지 않고 plan 파일과 보고만 쓴다. 설치 · 생성 명령(`pnpm add` · `npx` · `pnpm create`)은 실행하지 않는다. 판 확인용 `npm view <패키지> version` 과 공식 문서 읽기(WebFetch · WebSearch)는 된다. 저장소의 다른 파일은 고치지 않는다. 읽기 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH` 를 앞에 둔다(서브에이전트 환경이 `source ~/.nvm/nvm.sh` 와 한글 경로 인자를 막는다). 하위 에이전트 · 커밋 없음.

## 바탕(지금 저장소 상태, 2026-10-17 04:3x)
- 메인 브랜치 `feature/1a-p01b-quality-gates` 끝 1eff00d(문서 · 장부). 구현은 브랜치마다 격리 워크트리에서 했고 커밋은 요청자 지시로 했다. 원격은 아직 없다(H15, 요청자 몫). 브랜치끼리는 '바탕 합치기' 브랜치로만 합쳤다:
  - `feature/1a-base-p3a-p4c` 8791527 = P1a · P1b + P3a 25041d9(DB · 시계 · 설정) + P4a c3f6baf · P4b f27ae15 · P4c 6bd6015(시드 규격 · 검증기 · `seed-validate`). 충돌 없음.
  - `feature/1a-base-p2-p3-p4` e08eaba = 위 + P2b b1b17d7(음성 접점) + P3b a6f8420(접근 제어 — `requireAccess` · `requireCron` · `src/proxy.ts`). ci.yml 충돌을 푼 바탕.
  - 그 밖 끝 커밋: P5a `feature/1a-p05a-seed-check` 2c31bee(풀이 검사 `scripts/seed-check.ts` · `priceBookOf` · `priceRowsOfSeed`, 바탕 P4c), P9a `feature/1a-p09a-ai-client` 01ff0a9(바탕 8791527), P9b `feature/1a-p09b-ai-calls`(커밋 대기, 워크트리 `.claude/worktrees/p09`), P6a `feature/1a-p06a-seed-reference`(규격 파일 — 커밋 없음 · fix 중, 워크트리 `.claude/worktrees/agent-a6ef72438a158a2f3`, `seed/*.json` 의 실제 꼴은 여기서 읽기만), P6b `.claude/worktrees/p06b`(그림 카탈로그, 커밋 대기), P5b `.claude/worktrees/p05b`(시드 보기 화면, fix 중, 바탕 e08eaba).
- **이 plan 의 구현 바탕 브랜치를 plan 머리에 제안한다.** P7 은 배정표에서 P3 · P4 에 의존한다. 후보는 `feature/1a-base-p3a-p4c` 8791527(P3a + P4c)과 `feature/1a-base-p2-p3-p4` e08eaba(+ P2b · P3b). P3b 의 `requireCron`(keepalive · cron 길)이나 `src/proxy.ts` 를 쓰면 e08eaba 를, 아니면 8791527 을 고르고 까닭을 적는다. 다른 P 의 미커밋 파일(P6a 규격 파일 · P9b)은 바탕에 없다 — 이름 · 꼴만 가져다 쓰고, 그 파일이 바탕에 들어온 뒤 돌 수 있는 단계는 '완료 판정'에 그렇게 적는다.
- 코드를 읽을 때는 그 워크트리 또는 `git -C /Users/hikaru/workspace/momo-english-academy show <커밋>:<경로>` 로 본다(예: `git show 8791527:src/db/schema/content.ts`). `git show 8791527 --stat` · `git ls-tree -r --name-only 8791527` 로 파일 목록을 본다.
- 이미 있는 것(이름은 하위 plan 완료 보고 · 코드에서 확인한다): P1b 의존 규칙(core-no-framework · sdk-only-in-ai · db-only-from-server · proxy-stays-light · no-fake-speech-in-app · core-no-io), spec-trace(시험 이름 앞 AC 를 센다, 지금 missing-test 52), check-bundle. P3a: 스키마 29 `src/db/schema/*`(content.ts 의 시드 테이블 · 판 · model_prices, operations.ts, jsonb customType), `src/server/db/index.ts` `getDb` · `createDb` · `Db`, `src/server/settings/index.ts` `getSettings` · `getSetting`, `src/server/clock/index.ts` `now` · `createClock`, `src/core/learning-day.ts`, 시계 당기기 변수 `CLOCK_SHIFT_DAYS`(Preview 만), `drizzle.config.ts`(`process.loadEnvFile(".env.local")`), 통합 시험 `tests/integration/{global-setup,test-db}.ts`(embedded-postgres · `createTestDatabase` · `seedSettings`) · `tests/fixtures/settings.ts`(`TEST_SETTINGS`), `pnpm db:migrate` · `pnpm check:data-api`(스크립트 이름은 package.json 에서 확인). P4: `src/core/seed/structure.ts`(`SEED_FILES` 경로 · 상수), `schema/*.ts` Zod 규격(reference · lesson · talk · assessment · record), `reference-index.ts`, `validate.ts` `validateSeed`, `scripts/seed-validate.ts`(`--json` version 1, summary.failed, stats.ranges), `tests/fixtures/seed/builders.ts` `miniSeed`. P5a: `scripts/seed-check.ts`(풀이 검사 — 실제 API, 로컬 전용 길 C62), `src/core/ai/cost.ts` `priceBookOf` · `priceRowsOfSeed`. P9c(계획만, 미구현): `src/server/seed-lists.ts` 가 실행 때 `seed/` 의 목록 넷(forbidden · homophones · forms · metaSentences)을 빌드 묶음에서 읽는다(`plan-p09c-AI-흐름-계약.md` 값 3 · 공용 변경 2 `outputFileTracingIncludes`) — P7 적재와 겹치지 않게 경계를 적는다(목록은 파일에서, 수업 · 규격 · 평가는 DB 에서 — 5절 그대로인지 확인).
- 결정 기록 13절 C52~C67 을 읽는다(C55 P3 기술 선택 · C56 열 해석 · C58 영어 값 · C61 시드 구성 · C62 로컬 전용 길 · C63 AI · C65 · C66 단원 틀 값 · C67 해석 일곱). 설계를 바꾸지 않는다 — 정본과 다르게 해야 하면 plan '위험 · 정할 것'에 적고 보고의 '컨트롤러가 정할 것'에 올린다.
- 요청자 결정 C52: 기능 작업은 전체 루프(이 plan → 컨트롤러 승인 → implementer → code-reviewer xhigh → fix ≤3). CI 작업 · 명령 같은 도구 성격은 가벼운 루프로 갈 수 있으니 작업마다 어느 루프인지 표시한다. plan 은 PR 하나 분량(파일 열 개 · 단계 여덟 이하) — 넘으면 a · b 로 나누고 각 파일 머리에 서로를 가리킨다. 공용 파일(`package.json` · `vitest.config.mts` · `playwright.config.ts` · `.github/workflows/ci.yml` · `.env.example` · `.dependency-cruiser.cjs` · `next.config.ts` · `biome.json` · `drizzle.config.ts`)을 고쳐야 하면 '요청하는 공용 변경' 절에 글자 그대로 모아 적는다(구현자가 자기 워크트리에서 옮기고 컨트롤러가 합칠 때 푼다).
- 환경 사실: 서브에이전트 도구 층이 `\uXXXX` 를 글자로 바꾸므로 이스케이프는 바이트로 확인한다. 통합 시험은 embedded-postgres(`pnpm test:int`, 첫 시작 약 4초). H3(Supabase 개발용 프로젝트 · 서울 · Data API 끔 · 접속 정보)은 아직 요청자가 하지 않았다 — 개발용 DB 에 실제로 넣는 단계 · CI 의 dev-load · keepalive 는 [사람] H3 · H15 뒤로 가르고, 그 전에 할 수 있는 것(순수 함수 · embedded-postgres 통합 시험 · dry-run)을 먼저 둔다.

## 먼저 읽을 것(공통, 순서대로)
1. `.claude/skills/plan-build/SKILL.md` — 템플릿과 지킬 것. 절 이름 그대로.
2. `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` — 묶음 plan. 배정표 80줄 P7 행, '바뀌는 파일' 45줄(scripts), 작업 순서 · [사람] 단계(87~105줄, H3 · H14 · H15), 위험 · 정할 것 · 제약, 증명 표의 P7 행(AC-17a · 17b · 7e · 7g · 8i).
3. `.claude/CLAUDE.md`, `intent/README.md`, `specs/README.md`, `specs/10-결정-기록.md` 13절(C52~C67).
4. 하위 plan 들의 '완료 보고' · '컨트롤러 결정' · '다른 P 에 넘길 것': `plan-p03a-DB-시계-설정.md` · `plan-p03b-접근-제어.md` · `plan-p04a-규격.md` · `plan-p04b-배정-칸-검사.md` · `plan-p04c-묶음-검사-명령.md` · `plan-p05a-풀이-검사.md` · `plan-p06a-규격-파일.md`(시드 파일 꼴 · 정할 것) · `plan-p09a-AI-호출-바탕.md` · `plan-p09c-AI-흐름-계약.md`(값 3 시드 목록 읽기). 장부 `.superpowers/sdd/2026-10-16-1-가-구현/ledger-open.md` 에서 P7 을 이름 댄 행.

## 지킬 것
- 증명은 시험 · 명령 이름으로. 시험 이름은 증명 표의 AC 로 시작하고(spec-trace 가 센다), 하나가 AC 둘을 덮으면 `AC-17a · AC-17b` 처럼 이어 적는다. 단위 시험은 DB · 네트워크 없이, 통합 시험은 `tests/integration`(embedded-postgres).
- 용어는 영역 · 단계 · 단원 · 활동 · 판. 영어 개발 용어는 알맞은 우리말로. 코드 식별자는 영어.
- 설계 숫자는 `settings` 설정값(12절)에서 읽는다. 꼴 · 구조 수는 `structure.ts`(C54 (2)). 코드 · 시험 상수에 박지 않는다. 키가 12절에 없으면 '컨트롤러가 정할 것'.
- DB 는 서버 Drizzle 로만, RLS 는 anon · authenticated 거부(CLAUDE.md). 시각은 한 시계에서(SQL 안 now() 금지, P3a 메모). 비밀값은 어디에도 적지 않는다(.env.local · GitHub 비밀값 이름만).
- 권한이 필요한 단계는 [사람] 으로 표시하고 묶음 plan H 번호를 단다(H3 · H15 · H14). 커밋 · PR 은 요청자 지시 때(H14).
- 확인한 사실은 출처(파일 · 커밋 · URL · 판 · 확인 날짜)를 표에 적는다. 확인 못 한 것은 '(추측)'.
- 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p07-plan-report.md`: 쓴 파일 · 확인한 사실 · (추측) · 묶음 plan 과 다르게 한 것 · 컨트롤러가 정할 것(권하는 답과 13절 한 줄 필요 여부) · 요청하는 공용 변경 · 다른 P 에 넘길 것 · 제안한 바탕 브랜치. 마지막 메시지는 보고 요지 10줄 안쪽.

## 만들 것
- `intent/2026-10-15-모모-잉글리시-아카데미/plan-p07-적재-판-CI.md`(상태 draft, 메인 저장소에 쓴다). 파일 열 개를 넘으면 a(순수 함수 · 적재 명령 · 완전성 검사 · 통합 시험) · b(CI 작업 셋 · 식별자 대조 · 개발용 DB [사람])로 나눈다. 브랜치 제안 `feature/1a-p07-seed-load`(바탕은 위 '바탕' 절대로 고른다).
- 보고 `task-p07-plan-report.md`.

## 이 P 에서 더 읽을 것
- 정본 `specs/04-데이터.md` 5절(시드 테이블 · 판(version) · 적재 규칙 · 설정값 시드 · 어느 것이 DB 이고 어느 것이 빌드 묶음 파일인지), `specs/06-시드-생성.md` 6.3(완전성 — 영역 × 단계 × 단원 수 · 수업 수 · 카드 수가 설정값 · 규격과 맞는지) · 6.4(신고와 정정 · 정정 판), `specs/08-테스트와-기술.md` 9절(통합 시험 · 적재 시험) · 10절(배포 · 운영 — 개발용 DB · CI 작업 main · dev-load · keepalive · 시각 당기기 변수 · 운영 승격) · 11절 (4) · (4-1)(1-가 적재 · 개발용 DB 작업과 그 완료 판정), `specs/09-설정값.md` 12절(설정값 시드 견주기에 닿는 키 전부 · 기본값), `specs/11-요구사항과-수용-기준.md` AC-17a · AC-17b · AC-7e · AC-7g · AC-8i(저장 거부) 원문, `specs/03-화면.md` 가운데 적재 · 판이 닿는 행(있으면).
- 조사: `docs/research/2026-10-16-reverse-engineering.md` 역분석 제안 6(식별자 대조 `scripts/check-ids.ts` — 코드 ↔ 정본 식별자 · 설정 키 · 테이블 이름 맞대기), `docs/research/2026-10-16-graph-engineering-ai-coding.md` 조사 P5(검증을 선 위에 코드로 — CI 작업 · 게이트), 묶음 plan 7줄의 번호 규칙.
- 코드: P3a 스키마 가운데 시드 · 판 · 설정 테이블(`src/db/schema/content.ts` 등 — 판 열 · 유일 제약 · RLS), 마이그레이션 폴더(`drizzle/`), `tests/integration/test-db.ts` 의 `seedSettings`(설정값 시드 견주기의 바탕), P4a `SEED_FILES` 와 규격 다섯, P4c `scripts/seed-validate.ts` 의 `--json` 꼴(적재 앞 검증 통과 조건으로 쓸 수 있음), P4b `reference-index.ts`, P6a 워크트리의 `seed/` 실제 파일 꼴(읽기만 · 미커밋 · 바뀔 수 있음), P9a `src/server/ai/client.ts` 의 `process.loadEnvFile` · 환경 변수 읽기 꼴, `.github/workflows/ci.yml` 지금 작업 목록(통합 작업 단계 · embedded-postgres), `package.json` scripts, `.env.example`.

## P7 범위(배정표 80줄 그대로)
- 적재 · 판 규칙 · 개발용 DB · CI 작업(11절 (4) · (4-1)). `pnpm seed:load`, 판 고르기 · 설정값 시드 견주기 순수 함수(`src/core/seed/{version-pick,settings-compare}.ts`), 완전성 검사(6.3), CI 작업 셋 main · dev-load · keepalive, 시각 당기기 변수, 식별자 대조(`scripts/check-ids.ts`, 역분석 제안 6 · 조사 P5). 파일 자리 `scripts/seed-load.ts` · `src/server/seed/` · `src/core/seed/{version-pick,settings-compare}.ts` · 작업 셋 · `scripts/check-ids.ts`. 의존 P3 · P4, 다음 P9(P8 은 P5 · P6 · P7 뒤). 완료 판정: 개발용 DB 에 P6 규격과 시험용 수업이 들고 프리뷰가 읽는다. 증명: `tests/integration/{seed-load,seed-version}.test.ts` · `tests/unit/{version-pick,settings-compare}.test.ts` · CI `main / migrate · seed-validate · seed-load` · `dev-load`.
- 범위 밖: 시드 본 생성(P8), 시드 보기 화면(P5b · P5c), 규격 파일 값 자체(P6a), AI 시드 목록 읽기(P9c 값 3 — 경계만 적는다), 운영 배포(1-나 뒤 한 번).

## 꼭 확인할 사실
- 5절의 판 규칙(판 열 · 어느 판을 앱이 읽는가 · 정정 판이 진행 중 단원에 미치는 규칙 — 13절 결정 D3 계열)과 적재가 바꾸지 않는 것(progress · 기록 테이블).
- 설정값 시드 견주기: `seed/settings.json`(P6a) ↔ `settings` 테이블 ↔ 12절 기본값 — 어긋남을 어떻게 보고하고(실패 · 경고) 누가 고치는지(컨트롤러 13절 → P6).
- 완전성 검사가 세는 수(영역 × 단계 × 단원 5 · 단원 틀 구간별 수업 수 · 단원 단어 수 — C66 값, settings 키 이름)와 1-가 범위(1~6단계 시드 뒤 운영 배포 — 7~12 는 2차이므로 '완전'의 범위를 단계 구간으로 매개변수화해야 하는지).
- CI: GitHub Actions 에서 embedded-postgres 가 도는지(P3a 통합 작업 단계가 이미 있는지 ci.yml 로 확인), dev-load 가 쓰는 비밀값 이름(H3 뒤), keepalive 의 대상(Supabase 무료 프로젝트 일시 중지 방지인지 — 10절 원문대로)과 주기, 시각 당기기 변수가 Preview 에만 있는 규칙(P3a · H4).
- Supabase 접속 꼴(연결 풀 · 직접 연결, Drizzle `postgres-js` 인지 P3a 가 고른 드라이버 — plan-p03a 확인한 사실)과 `pnpm db:migrate` 가 이미 있는지.
