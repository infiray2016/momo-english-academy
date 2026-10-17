# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P7b CI 작업 셋 · 식별자 대조 · 개발용 DB

spec: `specs/` 정본(5절 적재 문단 'main 작업은 마이그레이션 → 시드 검증 → 적재', 9절 시드 검증 · CI 검사, 10절 배포 · CI(Deployment Checks) · 운영(활동 유지 요청) · 접근 제어(Data API), 11절 1-가 (4) · (4-1), 12절 표 전부, 13절 C26 · C50 · C51('설정 키 대조는 P7 check-ids') · C54 (2) · C57 · C61 (2) · C62 (2), 15절 AC-17b · AC-7g · AC-7a, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P7 행 · 위험 4 · 11 · 14 · 17 · [사람] H3 · H8 · H14 · H15 · 조사 `docs/research/2026-10-16-reverse-engineering.md`(역분석 제안 6) · `docs/research/2026-10-16-graph-engineering.md`(조사 P5) · 스킬 graph-engineering '자료 그래프' · 앞 절반 `plan-p07a-적재-판.md` · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-17 · 상태: in-progress
승인: 컨트롤러 2026-10-17 05:4x(C68 (4) · (5)) · 브랜치 · 워크트리: `feature/1a-p07b-ci-ids`(P7a 브랜치 `feature/1a-p07-seed-load` 끝에서, 같은 워크트리. 식별자 대조만 먼저 하려면 01ff0a9 에서 ∥) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P7 의 뒤 절반이다. 앞 절반(판 규칙 · 설정값 시드 견주기 · 적재 함수 `loadSeed` · 판 고르기 읽기 · 적재 명령 `pnpm seed:load`)은 같은 폴더의 `plan-p07a-적재-판.md` 이고, 이 plan 은 그 명령을 CI 작업 셋에 걸고, 식별자 대조 명령을 만들고, 개발용 DB 에 처음 넣는 [사람] 단계를 둔다.
도구 성격이라 가벼운 루프(C52)다 — 이 plan 이 브리프를 겸하고, 검토는 code-reviewer Opus · high 범위 한정, Minor 는 컨트롤러가 직접 고친다. 바탕 · 확인한 사실 · 정할 것 가~파 표는 P7a 의 같은 이름 절에 있고, 이 plan 은 그 가운데 바 · 사 · 자 · 차 · 카 를 풀어 적는다. 정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다.

컨트롤러 결정(2026-10-17 05:4x): 승인. 바 (1) 비공개 + 저장소 비밀값 DEV_ · PROD_(C68 (4)), 사 · 자 · 차 · 카 권함대로(C68 (5)). P7a 끝에서 같은 워크트리로 이어 간다(가벼운 루프: 이 plan 이 브리프, code-reviewer Opus · high 범위 한정, Minor 는 컨트롤러). 장부 '구현하며 확인할 것'의 check-ids 허용 목록 항목(PASSAGE_PICTURE_UNTIL_LEVEL = 4, common.tsx)을 차의 허용 목록에 더한다.

## 목표 (Goal)

- `main` 작업(`.github/workflows/main.yml`): main 갈래에 push 되면 운영 DB 에 마이그레이션 → 시드 검증(완전성, `--complete-through settings`) → 적재를 한 작업 안의 차례로 돌린다. 앞 단계가 실패하면 뒤 단계는 돌지 않는다(5절, AC-17b). 이 작업을 Vercel Deployment Checks 의 필수 검사로 걸어 적재가 끝나기 전에는 새 배포가 운영 주소로 승격되지 않는다(5절 · 10절, H8). '신고 판단 기록 · 다시 계산' 단계는 1-나가 적재 다음에 더한다(6.3).
- `dev-load` 작업(`.github/workflows/dev-load.yml`): 수동 실행. 개발용 DB 에 마이그레이션 → 시드 검증 → 적재 → Data API 닫힘 확인을 돌린다. `seed.complete_through_level` 을 작업 입력 값으로 덮어 넣고 그 단계까지 완전성을 본다. 운영 비밀값을 읽지 않는다(11절 (4-1), AC-7g, P3b 정할 것 아).
- `keepalive` 작업(`.github/workflows/keepalive.yml`): 하루 두 번 개발용 · 운영 DB 에 읽기 질의 하나(`pnpm db:ping`)를 보내 Supabase Free 의 1주 비활성 정지를 막는다(10절 운영 행, 묶음 위험 14).
- 식별자 대조 `pnpm check:ids`(`scripts/check-ids.ts`)와 CI 작업 `check-ids`: 12절 키 ↔ seed/settings.json ↔ 코드의 설정 키 글자, 5절 테이블 ↔ 스키마, 쓰기 교정 상한의 두 출처, 시험 설정값 ↔ settings.json 을 맞대고, 설정값과 같은 수가 앱 코드에 박힌 곳을 보고한다(역분석 제안 6 · 조사 P5 · 묶음 위험 4 · C51).
- 개발용 DB [사람]: H3 뒤 요청자 터미널에서 첫 적재(규격만) → 프리뷰가 설정을 읽어 접근 코드 제출이 되는지 본다(P7 완료 판정) → H15 뒤 dev-load · keepalive → H8(요청자가 고르는 때) main 작업이 운영 승격을 보류하는지 본다.

## 바뀌는 파일 (Files that change)

손으로 쓰는 파일은 여덟이다(모두 새 파일). 공용 파일 변경 요청은 아래 따로 적고 세지 않는다.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `scripts/check-ids.ts` | 신규 | 식별자 대조 명령(아래 '파일별 값' 1) |
| `tests/unit/check-ids.test.ts` | 신규 | 식별자 대조의 풀기 · 규칙 · 명령 시험 |
| `scripts/db-ping.ts` | 신규 | 활동 유지 명령 `pnpm db:ping`(2) |
| `tests/integration/db-ping.test.ts` | 신규 | 시험용 Postgres 로 활동 유지 명령 |
| `.github/workflows/main.yml` | 신규 | 운영 적재 작업(3) |
| `.github/workflows/dev-load.yml` | 신규 | 개발용 적재 작업(4) |
| `.github/workflows/keepalive.yml` | 신규 | 활동 유지 작업(5) |
| `tests/unit/ci-workflows.test.ts` | 신규 | 작업 파일 넷의 차례 · 비밀값 · 입력 · 이름 시험(6) |

### 요청하는 공용 변경(컨트롤러가 합친다)

| # | 파일 | 바꿀 것 | 까닭 |
|---|---|---|---|
| 1 | `package.json` scripts | `"check:ids": "tsx scripts/check-ids.ts"` · `"db:ping": "node --env-file-if-exists=.env.local --import tsx scripts/db-ping.ts"` | 새 명령 둘. `db:ping` 은 `server-only` 를 가져오지 않아 조건 플래그가 필요 없다 |
| 2 | `.github/workflows/ci.yml` | 작업 하나를 끝에 더한다(아래 글자 그대로) | 식별자 대조를 PR 마다. 묶음 plan 증명 절 머리의 `ci / …` 목록에 `check-ids` 를 더하는 것은 묶음 plan 갱신 때 |

```yaml
  check-ids: # P7b. 12절 키 · 5절 테이블 ↔ seed/settings.json ↔ 코드(역분석 제안 6 · 조사 P5). 설계 숫자는 보고만(차수 경계에서 막음으로)
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6 # 판은 package.json 의 packageManager 에서 읽는다
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check:ids --fail-on spec-setting-missing,seed-setting-unknown,setting-scope,setting-change-via,setting-default,code-setting-unknown,table-mismatch,max-corrections,fixture-setting
```

### 파일별 값(구현자가 옮겨 쓸 것)

1. `scripts/check-ids.ts`(`pnpm check:ids [--seed-root <폴더>] [--fail-on <규칙,…>] [--json]`). P1b `scripts/spec-trace.ts` 와 같은 꼴 — 순수 함수(`parseSettingsTable` · `expandSpecKeys` · `parseSpecDefault` · `parseTableNames` · `collectCodeKeys` · `collectDesignNumbers` · `checkIds`)와 `runCheckIds(args, io)` → `{ code, lines }` 를 내보내고 파일 읽기 · 출력은 직접 실행될 때만 한다(`isDirectRun`). 그래프 엔지니어링 스킬 '자료 그래프' 절차를 따랐다.

   - 답할 질문: (1) 12절 키(펼친 것)와 settings.json 키가 같은가(범위 · 바꾸는 곳 · 기본값까지) (2) 코드가 쓰는 설정 키 글자가 모두 12절에 있는가 (3) 5절 테이블 29 와 스키마 테이블이 같은가 (4) 쓰기 교정 상한 두 출처(level_specs `maxCorrections` · `writing.max_corrections`, plan-p06a 정할 것 바)가 같은가 (5) 시험 설정값(`TEST_SETTINGS`)이 settings.json 과 같은가 (6) 앱 코드에 설정값과 같은 수가 박혀 있는가.
   - 점 일곱: 12절 키(펼친 것) · settings.json 행 · 코드 글자(키 · 수) · 5절 테이블 이름 · 스키마 테이블 · 쓰기 단계 규격 행 · 시험 설정값. 선: 펼침(12절 행 → 키, 하나 → 여럿) · 같은 키(12절 키 ↔ 시드 행) · 읽음(코드 글자 → 키 또는 키 머리) · 같은 이름(5절 ↔ 스키마) · 같은 값(교정 상한 · 시험 설정값 · 수 글자 ↔ 설정값). 뽑기는 정규식 · 표 풀기 · TypeScript 구문 트리로만 한다(모델 추출 없음).

| 규칙 | 한 줄 | 실패 예 | CI |
|---|---|---|---|
| `spec-setting-missing` | 12절 키(펼친 것)가 settings.json 에 없다. 예외: 바꾸는 곳이 '첫 실행 화면'인 `profile.start_level.<영역>`(C61 (2)) | 12절에 키를 더하고 settings.json 은 그대로 | 막음 |
| `seed-setting-unknown` | settings.json 키가 12절에 없다 | 옛 이름 `unit.min_sessions.1-3` 이 남음 | 막음 |
| `setting-scope` | settings.json 범위가 12절 범위 열(집 전체 → household · 프로필 → profile)과 다르다 | `session.length_factor` 를 household 로 | 막음 |
| `setting-change-via` | settings.json 바꾸는 곳이 12절 열(시드 → seed · 결정 기록 먼저 → decision-first · 고급 → advanced · 기본 → basic)과 다르다 | `unit.min_days.1-3` 을 advanced 로 | 막음 |
| `setting-default` | 12절 기본값 칸을 풀 수 있는 키에서 settings.json 값이 다르다. 못 푸는 칸은 '대조 안 함'으로 수만 낸다 | 12절 `unit.vocab_count` 25 · 30 · 30 · 30 인데 1-3 이 30 | 막음 |
| `code-setting-unknown` | `src/` · `scripts/` · `tests/fixtures/` 의 설정 키 꼴 글자(또는 틀 글자 `ai.model.${…}` 의 머리)가 12절 키도 키 머리도 아니다 | `getSetting("unit.recent_windw", …)` | 막음 |
| `table-mismatch` | 5절 테이블 표의 이름과 스키마의 `pgTable` 이름이 다르다(모자람 · 남음 모두) | 스키마에 표를 더하고 5절은 그대로 | 막음 |
| `max-corrections` | 쓰기 단계 규격의 `maxCorrections` 가 `writing.max_corrections` 의 그 단계 값과 다르거나, 그 사전의 단계에 규격 값이 없다 | 쓰기 10단계 규격 2, 설정 3 | 막음 |
| `fixture-setting` | `tests/fixtures/settings.ts` 의 `TEST_SETTINGS` 키가 settings.json 에 없거나 범위 · 값이 다르다(P3a 정할 것 사 — 시험이 seed/ 를 읽게 바꾸는 대신, 정할 것 카) | 시험값 `ai.max_tokens.writing_check` 4000, 시드 3000 | 막음 |
| `design-number` | `src/` 의 수 글자가 settings.json 의 수 값과 같다(허용 목록 밖) | `if (avg >= 0.8)` | 보고만(묶음 plan 작업 10 차수 경계 점검에서 막음으로) |

   - 12절 표 읽기: `specs/09-설정값.md`(경로는 NFC 로, spec-trace 와 같음)의 `| 키 | 범위 | 기본값 | 뜻 | 바꾸는 곳 |` 표. 펼침: `<구간>` → P4a `BAND_NAMES` 넷, `<영역>` → `AREAS` 넷, `<호출>` → `ai.max_tokens` 는 P9a `AI_PURPOSES` 일곱, `ai.model` · `ai.effort` · `ai.thinking` 은 그 가운데 `talk_turn` · `talk_closing` · `probe` 를 뺀 넷(12절 ai.model 뜻 칸 '회화 턴은 구간 키' 따로 행, 끝맺음 턴 · 확인 호출은 이 키를 쓰지 않음 — 13절 '데이터 · 운영 세부'). 펼친 표는 plan-p06a 의 settings.json 펼침 규칙과 같다(약 180키).
   - 기본값 칸 풀기(`parseSpecDefault`): `<구간>` 키는 ` · ` 로 나눈 넷을 구간 차례로. `a~b단계 v` 가 되풀이되면 단계 → 수 사전(`writing.max_corrections` · `talk.next_time_lines`). `이름 수 · 이름 · 이름 수 …` 꼴은 호출별 수(`ai.max_tokens` — 수가 없는 이름은 다음 수를 받는다). `나머지 '적응'` 꼴은 펼친 키 모두에 그 값. 그 밖의 ` · ` 목록은 모두 수일 때 수 목록. 수 하나(`0.80` → 0.8) · 글 하나(`en-US` · `Asia/Seoul`). 낱말 바꿈 `끔` → `off` · `적응` → `adaptive`. 못 푸는 칸(`6.1 표` 등)은 대조 안 함. 값 견주기는 P4c `canonicalJson`.
   - 코드 글자 훑기(`collectCodeKeys`): `typescript` 의 `createSourceFile` 로 `src/**/*.{ts,tsx}` · `scripts/**/*.ts` · `tests/fixtures/**/*.ts` 를 읽어 글 글자 · 틀 글자 머리를 모은다. 설정 키 꼴 = `^[a-z][a-z0-9_]*(\.[a-z0-9_-]+)+\.?$` 이고 첫 마디가 12절 키의 첫 마디 가운데 하나이며 파일 확장자로 끝나지 않는 것(`.json` · `.ts` · `.tsx` · `.md` · `.sql` · `.svg` · `.png` · `.webp` · `.jpg` · `.css` · `.js` · `.mjs` · `.cjs` · `.yml`). 알려진 것 = 펼친 12절 키(C61 예외 포함) 또는 그 키의 머리(글자 + `.` 로 시작하는 키가 있음, `bandKey("unit.vocab_count", band)` 꼴).
   - 수 글자 훑기(`collectDesignNumbers`): `src/**/*.{ts,tsx}` 의 수 글자 가운데 settings.json 의 수 값(수 · 수 목록 · 사전 값을 펼친 모음, 0 · 1 · 2 는 흔한 수라 뺌)과 같은 것. 뺄 것: `src/core/seed/structure.ts`(C54 (2) 허용 목록), 맨 위 `const 대문자_이름 = …` 의 초기값 안 글자(이름 붙인 기술 값 · C57 의 `ACCESS_CODE_MIN_LENGTH` · `ACCESS_IP_RETENTION_MS` 같은 고정 규칙 — 이름과 주석은 검토자가 본다). 보고 줄: `파일:줄 수 ← 같은 값의 키(셋까지)`.
   - 5절 표 읽기: `specs/04-데이터.md` 의 `| 테이블 | 역할 |` 표 첫 칸. 스키마: `src/db/schema/{content,learning,operations}.ts` 의 내보낸 값 가운데 `is(값, PgTable)` 인 것의 `getTableName`(P3b check-data-api 와 같은 길, 스키마 파일은 `server-only` 가 없다).
   - seed/ 읽기: `--seed-root`(기본 `seed`)의 `settings.json` · `level-specs.json` 을 P4a 규격으로 푼다. 뿌리가 없으면 시드가 드는 규칙(`spec-setting-missing` · `seed-setting-unknown` · `setting-scope` · `setting-change-via` · `setting-default` · `max-corrections` · `fixture-setting` · `design-number`)을 '건너뜀(seed/ 없음)'으로 적고 위반으로 세지 않는다. 있는데 JSON · 규격이 틀리면 2.
   - 출력 첫 줄: `check-ids: 12절 키 <n> · 시드 키 <n> · 코드 키 글자 <n> · 테이블 <5절 n>/<스키마 n> · 대조 안 함 <n> · ` + 규칙마다 `<규칙> <n>` + (있으면) ` · 건너뜀(seed/ 없음)`. 다음 줄부터 위반마다 `<규칙> <곳> <설명>`(곳은 `파일:줄` 또는 키). `--json` 은 `{ version: 1, counts, violations, skipped, unparsedDefaults }`.
   - 종료 코드: 0 보고만(기본) 또는 `--fail-on` 규칙에 위반 없음, 1 `--fail-on` 규칙에 위반, 2 정본 파일을 못 읽음 · 모르는 규칙 · seed/ 가 있는데 풀리지 않음.

2. `scripts/db-ping.ts`(`pnpm db:ping`). `server-only` 를 가져오지 않고 `postgres` 를 바로 쓴다(스크립트는 의존 규칙 대상 밖).
   - `ping(url)`: `postgres(url, { prepare: false, max: 1, connect_timeout: PING_TIMEOUT_SECONDS })`(트랜잭션 풀러용, P3a 와 같은 `prepare: false`) → `select count(*)::int as n from settings`(사용자 표 읽기 하나) → 닫기. `{ ok: true, settingsRows } | { ok: false, reason: "connect" | "query" }`.
   - `runPing(env)`: `DATABASE_URL` 이 없으면 2. 성공이면 첫 줄 `db-ping: settings <n>행` 과 0, 실패면 `db-ping: 실패(접속|질의)` 와 2. 접속 문자열 · 행 내용 · 오류 원문(접속 정보가 섞일 수 있다)을 내지 않는다.
   - `PING_TIMEOUT_SECONDS`(20, 기술 값).

3. `.github/workflows/main.yml`(글자 그대로. 작업 이름 `main` 은 Deployment Checks 가 고르는 이름이라 바꾸지 않는다 — 확인한 사실 7).

```yaml
name: main
# 운영 DB: 마이그레이션 → 시드 검증(완전성) → 적재(5절 · 10절). Vercel Deployment Checks 의 필수 검사로 건다(H8).
# 저장소 변수 PROD_RELEASE 가 on 일 때만 돈다 — H8 전에는 작업을 건너뛴다(plan-p07b 정할 것 사).
# 1-나: seed-load 다음에 '신고 판단 기록 · 다시 계산' 단계를 더한다(6.3). 앞 단계가 실패하면 뒤 단계는 돌지 않는다(AC-17b).
on:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: main-release
  cancel-in-progress: false # 돌고 있는 마이그레이션 · 적재를 끊지 않는다
env:
  NEXT_TELEMETRY_DISABLED: "1"
jobs:
  main:
    if: ${{ vars.PROD_RELEASE == 'on' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6 # 판은 package.json 의 packageManager 에서 읽는다
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: prod-secrets
        env:
          MIGRATION_DATABASE_URL: ${{ secrets.PROD_MIGRATION_DATABASE_URL }}
        run: |
          if [ -z "$MIGRATION_DATABASE_URL" ]; then
            echo "::error::PROD_MIGRATION_DATABASE_URL 이 없다(H8)"
            exit 1
          fi
      - name: migrate
        env:
          MIGRATION_DATABASE_URL: ${{ secrets.PROD_MIGRATION_DATABASE_URL }}
        run: pnpm db:migrate
      - name: seed-validate
        run: pnpm seed:validate --complete-through settings
      - name: seed-load
        env:
          MIGRATION_DATABASE_URL: ${{ secrets.PROD_MIGRATION_DATABASE_URL }}
        run: pnpm seed:load
```

4. `.github/workflows/dev-load.yml`(글자 그대로. 입력은 `env` 로만 넘긴다 — run 글에 `${{ inputs.… }}` 를 바로 넣지 않는다).

```yaml
name: dev-load
# 개발용 DB: 마이그레이션 → 시드 검증 → 적재 → Data API 닫힘 확인(11절 (4-1) · AC-7g · plan-p03b 정할 것 아). 수동 실행.
# 개발용 비밀값(DEV_*)만 읽고 운영 비밀값은 읽지 않는다. 이 파일이 기본 갈래(main)에 있어야 실행할 수 있다.
on:
  workflow_dispatch:
    inputs:
      complete_through:
        description: "개발용 DB 의 seed.complete_through_level — 적재한 단계(1~12)"
        type: number
        required: true
        default: 1
      areas:
        description: "수업 · 평가 · 배치 칸을 넣을 영역(쉼표). 1-가는 reading,writing,speaking"
        type: string
        required: true
        default: reading,writing,speaking
      reference_only:
        description: "규격 파일만 넣기(P8 수업이 오기 전)"
        type: boolean
        required: true
        default: false
permissions:
  contents: read
concurrency:
  group: dev-load
  cancel-in-progress: false
env:
  NEXT_TELEMETRY_DISABLED: "1"
jobs:
  dev-load:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      THROUGH: ${{ inputs.complete_through }}
      AREAS: ${{ inputs.areas }}
      REFERENCE_ONLY: ${{ inputs.reference_only }}
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6 # 판은 package.json 의 packageManager 에서 읽는다
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: dev-secrets
        env:
          MIGRATION_DATABASE_URL: ${{ secrets.DEV_MIGRATION_DATABASE_URL }}
        run: |
          if [ -z "$MIGRATION_DATABASE_URL" ]; then
            echo "::error::DEV_MIGRATION_DATABASE_URL 이 없다(H3 · H15)"
            exit 1
          fi
      - name: migrate
        env:
          MIGRATION_DATABASE_URL: ${{ secrets.DEV_MIGRATION_DATABASE_URL }}
        run: pnpm db:migrate
      - name: seed-validate
        run: |
          if [ "$REFERENCE_ONLY" = "true" ]; then
            pnpm seed:validate
          else
            pnpm seed:validate --complete-through "$THROUGH" --areas "$AREAS"
          fi
      - name: seed-load
        env:
          MIGRATION_DATABASE_URL: ${{ secrets.DEV_MIGRATION_DATABASE_URL }}
        run: |
          if [ "$REFERENCE_ONLY" = "true" ]; then
            pnpm seed:load --reference-only --complete-through "$THROUGH"
          else
            pnpm seed:load --complete-through "$THROUGH" --areas "$AREAS"
          fi
      - name: check-data-api
        env:
          SUPABASE_URL: ${{ secrets.DEV_SUPABASE_URL }}
          SUPABASE_PUBLISHABLE_KEY: ${{ secrets.DEV_SUPABASE_PUBLISHABLE_KEY }}
          SUPABASE_LEGACY_ANON_KEY: ${{ secrets.DEV_SUPABASE_LEGACY_ANON_KEY }}
        run: |
          if [ -z "$SUPABASE_URL" ]; then
            echo "::notice::DEV_SUPABASE_URL 이 없어 Data API 확인을 건너뛴다"
          else
            pnpm check:data-api
          fi
```

5. `.github/workflows/keepalive.yml`(글자 그대로).

```yaml
name: keepalive
# Supabase Free 의 1주 비활성 정지를 막는 활동 유지 요청(10절 운영 행). 하루 두 번 DB 에 읽기 질의 하나를 보낸다.
# 개발용은 H3 · H15 뒤, 운영은 H8 뒤 비밀값이 생기면 돈다. 비밀값이 없는 쪽은 건너뛴다.
on:
  schedule:
    - cron: "17 3,15 * * *" # UTC. 정시를 피한다(붐빌 때 일정 작업이 늦어진다)
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: keepalive
  cancel-in-progress: false
jobs:
  keepalive:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6 # 판은 package.json 의 packageManager 에서 읽는다
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: dev-db
        env:
          DATABASE_URL: ${{ secrets.DEV_DATABASE_URL }}
        run: |
          if [ -z "$DATABASE_URL" ]; then
            echo "::notice::DEV_DATABASE_URL 이 없어 건너뛴다"
          else
            pnpm db:ping
          fi
      - name: prod-db
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
        run: |
          if [ -z "$DATABASE_URL" ]; then
            echo "::notice::PROD_DATABASE_URL 이 없어 건너뛴다"
          else
            pnpm db:ping
          fi
```

6. `tests/unit/ci-workflows.test.ts`. 작업 파일을 글로 읽어 맞댄다(새 개발 의존을 들이지 않는다, 위험 7). 도우미: 주석 줄 빼기, `jobs:` 아래 두 칸 들여쓴 키를 작업 이름으로, `steps:` 아래 `- ` 항목을 단계로 나눠 단계마다 `name` · `run` · `env` · `if` 글을 갖게 한다.

| 시험이 보는 것 | 파일 |
|---|---|
| 한 작업 `main` 안에서 `pnpm db:migrate` → `pnpm seed:validate --complete-through settings` → `pnpm seed:load` 차례. 어느 단계에도 `continue-on-error` 와 `always()` · `failure()` · `cancelled()` 가 없다(기본 `success()` 라 앞이 실패하면 뒤가 돌지 않는다) | main.yml |
| `push` 의 `branches: [main]` · 작업 `if` 가 `vars.PROD_RELEASE == 'on'` · `secrets.` 는 `PROD_` 만 · `cancel-in-progress: false` | main.yml |
| `workflow_dispatch` 입력 `complete_through`(number, 필수) · `areas` · `reference_only` · `secrets.` 는 `DEV_` 만 · 검증 · 적재 단계가 `$THROUGH` · `$AREAS` 를 넘김 · 차례 migrate → seed-validate → seed-load → check-data-api | dev-load.yml |
| PR 의 `seed-validate` 작업은 `pnpm seed:validate` 를 `--complete-through` 없이 돌린다(빈 칸은 보고만) · `check-ids` 작업이 `--fail-on` 으로 돈다 | ci.yml |
| `schedule` 과 `workflow_dispatch` · 단계 둘이 `pnpm db:ping` 을 `DEV_DATABASE_URL` · `PROD_DATABASE_URL` 로 | keepalive.yml |
| 네 파일의 작업 이름이 서로 겹치지 않는다 · `run` 글에 `${{ inputs.` · `${{ secrets.` 가 없다(입력 · 비밀값은 env 로) · 작업 수준 `env` 에 `secrets.` 가 없다(비밀값은 쓰는 단계에만) · 어느 파일에도 `CLOCK_SHIFT_DAYS` 가 없다(시각 당기기는 Vercel Preview 환경 변수에만, P3a · H4) | 넷 |

## 작업 순서 (Order of work)

시작 전(구현자). P7a 가 끝난 워크트리에서 이어 간다(브랜치 `feature/1a-p07b-ci-ids`). '요청하는 공용 변경' 1 · 2 를 먼저 옮긴다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 구현자(implementer · Opus · high) 하나가 차례로 한다. 시험을 먼저 쓴다.

1. [검증] 식별자 대조. `check-ids.test.ts` → `scripts/check-ids.ts`(파일별 값 1). 완료: 시험 통과, 바탕에서 `pnpm check:ids` 출력을 보고에 적는다(seed/ 가 없으면 시드 규칙은 건너뜀). 막는 규칙 위반이 나오면 고칠 쪽(정본 — 컨트롤러 13절 · seed — P6 · 코드 — 그 P)을 보고에 적고 이 plan 에서 고치지 않는다.
2. [검증] 활동 유지 명령. `db-ping.test.ts` → `scripts/db-ping.ts`(2). 완료: 시험 통과.
3. [검증] 작업 파일 셋. `ci-workflows.test.ts` → `main.yml` · `dev-load.yml` · `keepalive.yml`(3~5). 완료: 시험 통과.
4. [검증] 마무리. CI 와 같은 순서 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle` → `pnpm check:ids --fail-on …`(ci.yml 과 같은 규칙), 비밀값 grep 0건. 완료: 출력이 구현 보고에 있다.
5. [사람] 검토 · 커밋(H14). code-reviewer(Opus · high, 범위 한정 — C52) 검토, Minor 는 컨트롤러가 고친다. 요청자 지시로 컨트롤러가 커밋한다. P6a 가 합쳐진 바탕에서 `pnpm check:ids` 를 다시 돌려 막는 규칙 위반 0 을 본다(아니면 고칠 쪽을 장부에). 완료: 커밋.
6. [사람][DB] 첫 개발용 적재(H3 뒤, H15 전에도 된다). 아래 '[사람] 할 일' 1 · 2. 완료: 요청자가 알려 준 첫 줄(넣은 칸 0 · 규격 행 · 설정 넣음 수)과 프리뷰 접근 코드 제출 성공 — P7 완료 판정 '프리뷰가 규격을 읽는다'.
7. [사람] H15 뒤 GitHub 비밀값 · main 합침 · dev-load(규격만) · keepalive 수동 한 번(3~5). 완료: 두 작업 초록, check-data-api 종료 0.
8. [사람] H8(요청자가 고르는 때, 미루면 운영 배포 전까지). 7. 완료: main 작업이 완전성(6)에서 실패하고 운영 배포가 운영 도메인에 붙지 않음(10절 '첫 배포에서 보류 확인'). P8 1-가 묶음이 차면 dev-load(6)는 P8 완료 판정에서.

### [사람] 할 일(요청자)

| 순서 | 할 일 | 때 | 비고 |
|---|---|---|---|
| 1 | 요청자 터미널에서 `pnpm db:migrate` → `pnpm seed:load --reference-only --complete-through 1 --dry-run` → 같은 명령에서 `--dry-run` 을 빼고 한 번 더 | H3 뒤 · P6a 커밋 · 합침 뒤 · 이 plan 합침 뒤 | `.env.local` 의 개발용 `MIGRATION_DATABASE_URL`. 대화창 `!` 로 돌리지 않는다. 첫 줄만 컨트롤러에게. 규격 파일을 그 뒤 고치면 판을 올린다(P7a 위험 6) |
| 2 | 프리뷰(H1 · H4 뒤)에서 접근 코드를 넣어 홈이 열리는지 본다 | 1 뒤 | P3b H4 6 의 '설정 행이 생긴 뒤' 확인과 같다. 503 이면 설정 행이 없는 것 |
| 3 | GitHub 저장소 비밀값: `DEV_DATABASE_URL`(트랜잭션 풀러 6543) · `DEV_MIGRATION_DATABASE_URL`(세션 풀러 5432) · `DEV_SUPABASE_URL` · `DEV_SUPABASE_PUBLISHABLE_KEY`(레거시 anon 키가 켜져 있으면 `DEV_SUPABASE_LEGACY_ANON_KEY`) | H15 | 이름만 장부에. 값은 저장소 · 장부 · 대화에 적지 않는다. 저장소를 공개로 만들거나 Pro 를 쓰면 정할 것 바의 환경 꼴 |
| 4 | 이 plan 의 커밋을 main 에 합친다(H14) | 3 뒤 | dev-load 의 실행 버튼은 작업 파일이 기본 갈래에 있어야 생긴다(확인한 사실 5) |
| 5 | Actions → dev-load → Run workflow(complete_through 1 · reference_only 켬) 한 번, keepalive 수동 한 번 | 4 뒤 | 결과(초록 · 첫 줄)만 컨트롤러에게 |
| 6 | P8 1-가 묶음(정할 것 나)이 차면 dev-load(complete_through 1 · areas 기본값 · reference_only 끔) | P8 | P8 완료 판정 |
| 7 | H8: Supabase 운영 프로젝트(개발용과 다른 조직 · 서울, C26) · Data API 끄기 → 저장소 비밀값 `PROD_DATABASE_URL` · `PROD_MIGRATION_DATABASE_URL` → 저장소 변수 `PROD_RELEASE` = `on` → Vercel 운영 환경 변수 → Vercel Deployment Checks 에 GitHub 검사 `main` → 운영 자동 별칭이 켜져 있는지 → main 에 커밋 하나 | 요청자가 고르는 때 | main 작업이 완전성에서 실패하고 운영 배포가 도메인에 붙지 않으면 된다. 운영 도메인은 그 뒤(묶음 위험 11). `PROD_RELEASE` 를 끄면 main 작업이 건너뛰어져 검사 없이 승격될 수 있다(위험 3) |

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | GitHub Free 의 비공개 저장소는 환경 비밀값을 못 쓴다(확인한 사실 4) | 10절 '운영 환경 비밀값'과 '개발용 적재는 운영 DB 에 접속하지 않는다'를 GitHub 이 막아 주지 못한다 | 비밀값 이름을 `DEV_` · `PROD_` 로 가르고 작업 파일 시험이 dev-load 의 `PROD_` 읽기를 막는다(정할 것 바). 공개 · Pro 면 작업마다 `environment:` 한 줄로 GitHub 이 막게 한다 |
| 2 | dev-load 는 작업 파일이 기본 갈래에 있어야 돈다 | H15 · 합침 전에는 개발용 적재를 CI 로 못 돌린다 | 같은 명령을 요청자 터미널에서 돈다([사람] 1). CI 작업은 같은 명령을 차례로 부를 뿐이다 |
| 3 | `PROD_RELEASE` 가 꺼져 main 작업이 건너뛰어지면 Vercel 이 그 검사를 어떻게 보는지 모른다(추측) | 적재 없이 운영 승격 | H8 에서 변수 · 비밀값 · Deployment Checks 를 함께 켠다. 끄는 것은 요청자가 운영 승격을 따로 막을 때만(H8 안내) |
| 4 | 1-나 끝까지 main 은 완전성(6)에서 실패한다(묶음 위험 17) | H8 뒤 운영 승격이 계속 막힌다 | 의도다. 운영 배포는 1-나와 1~6단계 시드 뒤 한 번(11절). H8 을 그 앞에 하면 '보류 확인'만 미리 한다 |
| 5 | GitHub 일정 작업은 기본 갈래에서만 돌고, 붐빌 때 늦고, 공개 저장소는 60일 무활동이면 꺼진다 | Supabase 가 일시 중지된다 | 하루 두 번 · 수동 실행 · Supabase 의 일주일 전 경고 메일 · 멈춘 뒤 1년 안 되살림(확인한 사실 8). 공개 저장소를 고르면 위험이 커진다(정할 것 바) |
| 6 | 질의 하나가 Supabase 의 '사용자 DB 활동'으로 세어지는지 모른다(추측) | 정지 경고가 온다 | 첫 주에 경고 메일이 없는지 본다. 오면 질의 수 · 표를 늘린다(한 줄) |
| 7 | 작업 파일 시험이 글 대조다 | 작업 파일 꼴을 크게 바꾸면 거짓 실패 · 거짓 통과 | 단계 이름 · 명령 글로 찾고, 작업 파일을 바꿀 때 시험도 같이(검토 점검 항목). YAML 풀기 꾸러미는 새 개발 의존이라 들이지 않았다 |
| 8 | 12절 기본값 풀기가 정본 칸의 글 꼴에 기댄다 | 칸 꼴이 바뀌면 대조가 빠진다 | 못 푸는 칸은 '대조 안 함'으로 수를 내고, 시험이 지금 칸 꼴 몇을 고정한다. 값 전체 대조는 P6a 일회 검사가 했다 |
| 9 | `design-number` 거짓 양성(같은 수가 다른 뜻) | 잡음 | 보고만 · 0 · 1 · 2 · 이름 붙인 상수 · structure.ts 제외. 차수 경계(묶음 plan 작업 10)에서 남은 것을 사람이 본 뒤 막음으로 |
| 10 | `code-setting-unknown` 거짓 양성(설정 키 꼴의 다른 글) | CI 가 막힌다 | 첫 마디를 12절 키의 첫 마디로만, 파일 확장자 글은 뺀다. 남으면 허용 목록 상수(까닭 주석)를 더한다 |
| 11 | 설치 단계에서 비밀값이 환경에 있으면 설치 스크립트가 읽을 수 있다 | 비밀값 노출 | 비밀값은 쓰는 단계의 `env` 에만 둔다(작업 수준 env 에 두지 않음, 시험) |
| 12 | 비공개 저장소의 Actions 분 한도(추측: Free 월 2,000분) | 작업이 멈춘다 | keepalive 하루 두 번 약 2분 · dev-load 가끔. CI 작업이 가장 크다. 넘기 전에 GitHub 이 알린다(추측) |
| 13 | `check:data-api` 는 P3b(e08eaba)와 합친 뒤에만 있다 | dev-load 마지막 단계가 '없는 명령' | dev-load 는 main 합침 뒤에만 돌고 그때는 있다. 작업 파일 시험은 명령 글만 본다 |

### 정할 것(이 plan 몫 — 번호는 P7a 표와 같다)

| 번호 | 무엇 | 배경 · 선택지 | 권함 | 13절 |
|---|---|---|---|---|
| 바 | GitHub 비밀값 자리 | 10절은 '운영 DB 접속 정보는 Vercel Production 환경 변수와 GitHub Actions 의 운영 환경 비밀값에만'이라 적었다. GitHub Free 는 비공개 저장소에서 환경 비밀값을 못 쓴다(공개 저장소 또는 Pro · Team 부터). (1) 비공개 + 저장소 비밀값(`DEV_*` · `PROD_*`) + 작업 파일 시험 (2) 공개 + 환경 `development` · `production` (3) 비공개 + Pro(유료) + 환경 | (1). 돈이 들지 않고 코드가 공개되지 않으며 일정 작업이 60일 규칙에 걸리지 않는다. 약점(같은 저장소의 다른 작업 파일이 `PROD_` 를 읽을 수 있음)은 시험 · 검토가 막는다. 저장소 공개 여부는 요청자가 H15 때 정한다 — (2) · (3)이면 작업마다 `environment:` 한 줄을 더하고 비밀값 이름은 그대로 | (1)이면 예 — 10절 '운영 환경 비밀값'을 '저장소 비밀값 PROD_*(main · keepalive 만 읽음)'로 |
| 사 | main 작업을 켜는 때 | H8 전에는 운영 프로젝트 · 비밀값이 없다. 늘 돌게 두면 1-가 · 1-나 내내 main 에 합칠 때마다 빨간 실패와 실패 메일이 생긴다 | 저장소 변수 `PROD_RELEASE` 가 `on` 일 때만(작업 `if`). 켠 뒤 비밀값이 없으면 실패 | 아니오 |
| 자 | 활동 유지 작업 | 10절 '1주 비활성 정지를 막는 활동 유지 요청을 운영 · 개발용 두 프로젝트에'. Supabase 문서는 '그 주 날마다 DB 요청 몇 개'. Data API 를 끄므로(H3) REST 요청은 DB 에 닿지 않는다 | GitHub 일정 작업 하루 두 번(UTC 03:17 · 15:17), 트랜잭션 풀러로 `select count(*) from settings` 하나. 다른 길: Vercel Cron(1-나 Cron · `requireCron`) — 10절이 GitHub Actions 로 적어 그대로 | 아니오 |
| 차 | 식별자 대조의 규칙 · 막는 범위 · 허용 목록 | 역분석 제안 6('설계 숫자가 박혀 있는지')과 조사 P5('표에 없는 키와 안 쓰는 키') · C51 · C54 (2) · C57 · C62 (2) | 위 규칙 표. 키 · 범위 · 바꾸는 곳 · 기본값 · 코드 키 · 테이블 · 교정 상한 · 시험 설정값은 막고, 설계 숫자는 보고(차수 경계에서 막음으로). 허용: structure.ts · 맨 위 대문자 이름 상수 · 0 · 1 · 2. 조사 P5 의 '안 쓰는 키'는 1-가에 회화 · 부모 화면 키가 많아 보고에서도 뺀다(차수 경계 때 다시). 역분석 제안 6 의 Zod 스키마 이름 · 라우트 대조는 화면이 생긴 뒤(P10 이후) | 아니오 |
| 카 | 시험 설정값과 settings.json | P3a 정할 것 사는 'P6 settings.json 이 생기면 시험이 그것을 읽게 바꾼다'였다. 바꾸면 단위 · 통합 시험이 seed/ 파일에 묶인다 | 바꾸지 않고 `fixture-setting` 규칙이 맞댄다 | 아니오 |

### 제약

- 설계를 바꾸지 않는다. 다르게 해야 하면 P7a '정할 것'과 이 표에 올린다.
- 비밀값 · 아이 이름은 어디에도 적지 않는다. 작업 파일에는 비밀값 이름만, 값은 GitHub 설정에만. 명령 출력에 접속 문자열 · 키를 내지 않는다.
- 운영 비밀값은 main · keepalive 작업만 읽는다. dev-load 는 개발용만.
- 시각 당기기 변수(`CLOCK_SHIFT_DAYS`)는 Vercel Preview 환경 변수에만 둔다(P3a · H4). 작업 파일에 두지 않는다.
- 용어 · 서브에이전트 · 커밋 규칙은 P7a 제약과 같다. 이 plan 은 가벼운 루프(검토 Opus · high 범위 한정, C52).

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름 · 검사) | 파일 · 명령 |
|---|---|---|
| AC-17b(CI 몫) · AC-7a(CI main / seed-validate) | 단위 "AC-17b · AC-7a main 작업: 한 작업(main) 안에서 migrate → seed:validate --complete-through settings → seed:load 차례이고 continue-on-error · always() · failure() 가 없어 앞 단계가 실패하면 뒤 단계가 돌지 않는다" · "AC-17b main 작업: main 갈래 push 로 돌고 저장소 변수 PROD_RELEASE 가 on 일 때만 돌며 운영 비밀값(PROD_)만 읽는다". 신고 판단 기록 단계는 1-나 | `tests/unit/ci-workflows.test.ts` |
| AC-7g(CI 몫) | 단위 "AC-7g dev-load: 수동 실행이고 complete_through · areas 입력을 seed:validate · seed:load 에 그대로 넘기며 운영 비밀값(PROD_)을 읽지 않는다" · "AC-7g ci / seed-validate: PR 은 --complete-through 없이 돌아 빈 칸을 보고만 한다" · "AC-7g 작업 파일: 입력과 비밀값은 env 로만 넘기고 어느 작업도 CLOCK_SHIFT_DAYS 를 두지 않는다" | `ci-workflows.test.ts` |
| 10절 활동 유지 | 통합 "10절 활동 유지: db:ping 은 시험용 DB 의 settings 행 수를 읽고 0 으로 끝나며 출력에 접속 문자열이 없다" · "10절 활동 유지: DATABASE_URL 이 없거나 닿지 않으면 2 다" + 단위 "10절 활동 유지(keepalive): 일정과 수동 실행으로 돌고 개발용 · 운영 DB 에 pnpm db:ping 을 보낸다" | `tests/integration/db-ping.test.ts` · `ci-workflows.test.ts` |
| 작업 이름 | 단위 "작업 이름: main · dev-load · keepalive · check-ids 는 다른 작업 파일의 작업 이름과 겹치지 않는다(Vercel Deployment Checks 는 이름으로 고른다)" | `ci-workflows.test.ts` |
| 식별자 대조(묶음 위험 4 · C51) | 단위 "식별자 대조: 12절 표를 읽어 <구간> 넷 · <영역> 넷 · <호출>(ai.max_tokens 일곱, ai.model · effort · thinking 넷)으로 펼친다" · "식별자 대조: 12절 키와 settings.json 키 · 범위 · 바꾸는 곳이 다르면 낸다(profile.start_level.<영역>은 C61 예외)" · "식별자 대조: 기본값 칸(구간 넷 · 목록 · 단계 사전 · 호출별 수 · 끔 → off)을 풀어 settings.json 값과 맞대고 못 푸는 칸은 대조 안 함으로 센다" · "식별자 대조: 코드의 설정 키 글자와 틀 머리가 12절에 없으면 낸다(파일 이름 꼴 글자는 뺀다)" · "식별자 대조: 5절 테이블 표와 스키마 테이블 이름이 다르면 낸다" · "식별자 대조: 쓰기 단계 규격 maxCorrections 와 writing.max_corrections 가 다르면 낸다" · "식별자 대조: TEST_SETTINGS 의 키 · 범위 · 값이 settings.json 과 다르면 낸다" · "식별자 대조: src 의 수 글자가 설정값과 같으면 보고하고 structure.ts · 맨 위 대문자 이름 상수 · 0 · 1 · 2 는 뺀다" · "식별자 대조: --fail-on 규칙에 위반이 있으면 1, 정본을 못 읽거나 모르는 규칙이면 2, seed/ 가 없으면 시드 규칙을 건너뛰고 0" · "식별자 대조: 저장소의 5절 테이블이 스키마와 같고 코드의 설정 키 글자가 모두 12절에 있다" + `pnpm check:ids`(작업 1 · 5 출력) | `tests/unit/check-ids.test.ts` · CI `ci / check-ids` |
| 실제 돌림 | [사람] 1 · 2(P7 완료 판정), 3~5(H15 뒤), 7(H8) | 요청자 터미널 · GitHub Actions · Vercel |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm check:deps` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(missing-test 변화 없음 — AC-17b · 7g 는 P7a · P3a 가 이미 덮음) · `pnpm check:bundle` · `pnpm check:ids --fail-on …` 초록, 비밀값 grep 0건 | 작업 4 |

시험 이름은 글자 그대로 적는다(spec-trace).

## 완료 보고 (Done)

채움: 컨트롤러 2026-10-17 22:3x. **커밋 대기**(요청자 지시 H14). 워크트리 `.claude/worktrees/p07`, 가지 `feature/1a-p07b-ci-ids`(바탕 P7a df8445e), 미커밋 13(새 8 · 고친 4 · 보고 1). 원격 없음(H15)이라 PR 없음. [사람] 할 일 1~8(첫 개발용 적재 · GitHub 비밀값 · main 합침 · dev-load · keepalive · H8)은 그대로 남는다 — 첫 개발용 적재는 H3 진행 중(Supabase 개발용 프로젝트 ttdolsbczmdruzidmzno 만듦, 접속 문자열 확인 중).

| 흐름 | 때 | 결과 |
|---|---|---|
| 구현 impl-p07b(Opus · high, 가벼운 루프) | 22:1x | DONE_WITH_CONCERNS → ci.yml check-ids 작업 반영 뒤 DONE — 단위 221 → 239 · 통합 55 + 1 → 59 + 1 · missing-test 51 · check:ids(메인 specs) 막는 위반 0(`task-p07b-report.md`) |
| 검토 rev-p07b(Opus · high, 범위 한정) | 21:5x | **Approved**(C 0 · I 0 · M 5) — 작업 파일 셋 · ci.yml 작업 plan 글자 차이 0 · check:ids 재현 종료 0 · design-number 17 거짓 양성 · 해석 둘 타당 · 장부 셋 닫힘(`review-p07b.md`) |
| Minor 라운드(재검토 없음 C52) | 22:2x | M-1 같은 머리 표 모두 읽기 · M-2 명시한 `--seed-root` 없으면 종료 2 · M-3 `writing.rule_check_until_level` 이하 쓰기 규격의 maxCorrections 위반(4~5단계는 뺌) · M-4 run 블록 꼴(`\|-` · `>`) · 공백 없는 식 · `toJSON(secrets)` · `secrets[` · `secrets: inherit` · M-5 견본 ai.effort 행 · 허용 이름 사례. 단위 240 |
| 컨트롤러 확인 | 22:3x | biome 0 · build · 단위 240 · 통합 59 + 1 · check:deps 0 · spec-trace missing-test 51 · check-bundle 0 · `check:ids --specs <메인>` 종료 0(12절 키 184 · 코드 키 글자 185 · 테이블 29/29 · 대조 안 함 8 · 막는 위반 0) · `--seed-root /nonexistent-seed` 종료 2 · P6a 시드(p06b 워크트리) 막는 위반 0 · design-number 보고만 · 비밀값 꼴 없음 · 공용 diff 4 파일 |

실제 바뀐 파일(계획과 다른 것은 ※):

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `scripts/check-ids.ts` | 신규 | 식별자 대조 `pnpm check:ids`(12절 키 펼치기 — 같은 머리 표 모두 ※, 5절 테이블 ↔ 스키마, seed/settings.json, 코드 키 글자, 규칙 spec-setting-missing · seed-setting-unknown · setting-scope · setting-change-via · setting-default · code-setting-unknown · table-mismatch · max-corrections(1~3단계 maxCorrections 위반 ※ · 사전 단계만) · design-number(보고만), `--specs` 정본 뿌리 ※ · `--seed-root`(명시한 뿌리 없으면 종료 2 ※) · `--fail-on`, 모르는 인자 종료 2) |
| `scripts/db-ping.ts` | 신규 | 활동 유지 `pnpm db:ping`(`server-only` 없이 postgres, `sql.reserve()` 로 접속 · 질의 실패 가름, 질의 하나) |
| `.github/workflows/main.yml` · `dev-load.yml` · `keepalive.yml` | 신규 | plan 글자 그대로(DEV_ · PROD_ 비밀값 이름, dev-load 는 운영 비밀값 안 읽음, PROD_RELEASE 보류) |
| `.github/workflows/ci.yml` | 수정(공용 3) | 끝에 check-ids 작업(`--fail-on` 아홉 = CI_FAIL_ON). P5b 가지의 e2e-local 작업과 같은 자리라 합칠 때 둘 다 남긴다 |
| `tests/unit/check-ids.test.ts` · `ci-workflows.test.ts` · `tests/integration/db-ping.test.ts` | 신규 | 10 + 8(+1) · 3 |
| `scripts/seed-load.ts` · `tests/integration/seed-load.test.ts` | 수정(덤) | finally 의 close 실패를 삼켜 적재 결과 · 종료 코드 그대로(review-p07a-2 4절), 시험 1 |
| `package.json` | 수정(공용 1 · 2) | `check:ids` · `db:ping` 두 줄 |

해석 둘(검토 타당): 쓰기 교정 상한은 12절 사전에 있는 단계만 맞대고 4~5단계 '1'은 뜻 칸의 수라 설정값이 아님 · 바꾸는 곳이 '첫 실행 화면'인 키가 시드에 있으면 setting-change-via.

남긴 것: (1) [사람] 1~8 — **첫 개발용 적재는 끝남**(2026-10-17 23:0x, 컨트롤러가 값 없이: 마이그레이션 3 · Data API 닫힘 · 규격만 적재 칸 290 · 설정 180 · 개정 1 — 산출물 H3 기록), 나머지 · 프리뷰 확인(H1 · H4) · GitHub 비밀값 DEV_ 넷(H15) · main 합침 · dev-load · keepalive 수동 · H8. (2) design-number 거짓 양성 17(진법 · 날짜 자르기 · toFixed · 키 마디 수 · numeric 열 크기) — 차수 경계에서 허용 목록 정리. (3) 쓰기 4~5단계 '고칠 곳 최대 1'을 막는 자동 검사 없음(ledger — 2차 설정 키). (4) H8 안내: PROD_RELEASE 끈 채 Deployment Checks 에 main 을 걸면 건너뛴 작업이 성공으로 보일 수 있음(ledger, 미확인). (5) P10 상수(PIN_LENGTH 등) 허용 목록 · fixture-setting 규칙은 P10 커밋 뒤 check:ids 로 확인.
