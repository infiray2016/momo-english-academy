# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P7a 적재 · 판 규칙

spec: `specs/` 정본(5절 시드 판 · 적재 · 설정값 시드 · 시드 테이블, 6.3 완전성 · 사람 표본 검토 문단, 9절 단위(시드 판 고르기 · 설정값 시드 적재의 값 견주기) · 통합(시드 적재의 반복 실행과 검증 실패 판 거부 · 설정값 시드 적재와 settings_history · 시드 판 고르기), 11절 1-가 (4) · (4-1), 12절 머리 두 문단 · seed.* · ai.*, 13절 R5 · '시드 판과 설정값 시드' 잠정 행 · C50 · C54 (3) · C56 (4) · (5) · C61 (2) · C63 · C66, 15절 AC-17a · AC-17b · AC-7e · AC-7g · AC-8i, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P7 행 · 증명 표 · 공통 사실 `plan-p04a-규격.md`(시드 파일 배치 · 영어 값 · 칸 키) · `plan-p04c-묶음-검사-명령.md`(validateSeed · collectCells · cellHash · 완전성 표) · `plan-p09a-AI-호출-바탕.md`(checkSettingsCombos · capabilitiesOf · priceRowsOfSeed · priceBookOf) · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-17 · 상태: done
승인: 컨트롤러 2026-10-17 05:4x(C68) · 브랜치 · 워크트리: `feature/1a-p07-seed-load`(바탕 `feature/1a-p09a-ai-client` 01ff0a9, 격리 워크트리 하나. b 는 이 브랜치 끝에서 이어 간다) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P7 은 파일 열 개를 넘어 둘로 나눴다(묶음 plan 위험 12). 이 파일은 앞 절반(판 규칙 · 설정값 시드 견주기 · 적재 함수 · 판 고르기 읽기 · 적재 명령 · 통합 시험)이고 전체 루프(C52, 기능 작업)다. 뒤 절반(CI 작업 셋 main · dev-load · keepalive · 활동 유지 명령 · 식별자 대조 · 개발용 DB [사람])은 같은 폴더의 `plan-p07b-CI-작업-식별자-대조.md` 이고 가벼운 루프(C52, 도구 작업)다. 두 plan 이 함께 쓰는 사실(확인한 사실 · 정할 것)은 이 파일에만 적고 b 는 절 이름으로 가리킨다.

바탕 브랜치(제안): `feature/1a-p09a-ai-client` 01ff0a9 = 8791527(P3a 25041d9 DB · 시계 · 설정 + P4c 6bd6015 시드 규격 · 검증기) 위에 P9a(AI 호출 바탕)를 더한 커밋이다. 까닭 셋. (1) 5절 '바꾸는 값도 6.1 조합 검사를 통과해야' 와 AC-8i 의 적재 몫이 P9a 의 `checkSettingsCombos` · `capabilitiesOf`(model_prices.capabilities 꼴) · `priceRowsOfSeed` · `priceBookOf` 를 쓴다. 8791527 에는 이것이 없다. (2) P3b 의 `requireCron` · `src/proxy.ts` 는 쓰지 않는다. 활동 유지는 10절 운영 행대로 GitHub Actions 일정 작업이고 Vercel Cron 이 아니다. 그래서 e08eaba(P2b · P3b)는 필요 없다. dev-load 끝 단계의 `pnpm check:data-api`(P3b)는 합친 뒤에 돈다(b). (3) 마이그레이션 번호: 01ff0a9 에 P9a 의 0002 가 이미 있다. 이 plan 은 스키마를 바꾸지 않는다. 컨트롤러가 e08eaba 까지 담은 바탕을 원하면 e08eaba 와 01ff0a9 를 합쳐도 된다 — 두 줄기는 같은 파일을 고치지 않았다(`git merge-tree 8791527 e08eaba 01ff0a9` 충돌 0, 2026-10-17 확인).
정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다. 판과 출처는 2026-10-17 에 확인했다(위험 절 끝 '확인한 사실과 출처').

컨트롤러 결정(2026-10-17 05:4x): 승인. 정할 것 가~파는 모두 권함대로 — 나 · 다 · 마 · 바 는 13절 C68 (1)~(4), 아 · 사 · 자와 바탕 · 완료 판정 변경은 C68 (5), 라 · 차 · 카 는 13절 없이 그대로, 타 · 파 는 1-나 몫으로 장부에. 묶음 plan 배정표 P7 행(의존 P9a · 다음 P9b ∥ · 완료 판정)과 증명 절 머리 CI 목록(check-ids · keepalive)을 고쳤다. 다르게 한 것 1~4 받음. 구현 브리프 `task-p07a.md`(워크트리 `.claude/worktrees/p07`, 브랜치 feature/1a-p07-seed-load 를 01ff0a9 에서 만듦).

## 목표 (Goal)

- 적재 명령 `pnpm seed:load` 는 시드 검증을 다시 돌린 뒤 한 트랜잭션으로 새 판의 행만 넣는다. 이미 있는 행은 건너뛰므로 두 번 돌려도 결과가 같다. 검증 실패 칸이 하나라도 있으면 한 행도 넣지 않는다(5절, AC-17b). 완전성은 `seed.complete_through_level` 까지 본다(6.3 · 9절). 개발용 적재는 그 키를 작업 입력 값으로 덮어 넣는다(11절 (4-1), AC-7g).
- 판은 칸마다 '개정.정정' 두 자리(정수 열 `revision` · `correction`)다. 앱은 칸마다 개정 자리가 시작 개정 이하인 행 가운데 가장 높은 판을 읽는다. 그래서 같은 개정의 정정은 진행 중 단원에 바로, 새 개정은 다음 단원부터 닿는다(5절, 요청자 결정 R5, AC-17a). 이전 판 행은 지우지 않고 `sessions.lesson_id` 는 그대로 남는다. level_specs · unit_specs 도 같은 규칙이다. 시작 개정은 시작할 때의 시드 전체 최신 개정 번호다.
- 설정값 시드는 행을 더하지 않고 값을 견준다. 바꾸는 곳이 '시드' · '결정 기록 먼저'인 키는 시드 값과 다르면 고치고 settings_history 에 '시드 적재'로 남기며 설정 판을 올린다. '고급' · '기본' 키는 행이 없을 때만 넣고 그 뒤로는 DB 값을 지킨다. 견준 뒤의 값이 6.1 조합 검사와 3.2 관계 표를 통과하지 못하면 적재 전체가 실패한다(5절, AC-7e · AC-8i).
- 판 고르기(순수 함수)와 그것을 쓰는 서버 읽기 함수(단원 수업 · 단계 규격 · 단원 규격 · 단계 평가 벌 · 배치 벌 · 시드 최신 개정)를 둔다. P10 · P11 · P12 가 이 읽기 함수로 시드를 읽는다(묶음 plan 배정표 '시드 판 고르기').
- 경계: 목록 넷(동음이의어 · 금지어 · 형태 표 · 메타 문장)은 DB 에 넣지 않는다. 5절 '시드 파일로 두고 빌드에 묶어 배포'이고 P9c `src/server/seed-lists.ts` 가 실행 때 파일로 읽는다(plan-p09c 값 3 · `outputFileTracingIncludes`). 적재는 검증 때만 목록을 읽는다. DB 에 드는 것은 5절 첫 문단의 시드 데이터(단계 규격 · 단원 규격 · 어휘 · 그림 카탈로그 · 수업 · 단계 평가 문항 · 배치 평가 문항 · 모델 단가표 · 설정값)다. 범위 밖: 시드 본 생성(P8), 시드 보기 화면(P5b · P5c), 규격 파일 값(P6a), seed/reviews → seed_reports(1-나, 정할 것 마), 운영 배포(1-나 뒤 한 번).
- 완료 판정: 단위 · 통합 시험(embedded-postgres)이 AC-17a · 17b · 7e · 7g · 8i 의 적재 몫을 증명한다. `pnpm spec:trace` 의 missing-test 가 셋 줄어든다(AC-17a · 17b · 7e). 개발용 DB 에 실제로 넣는 일은 b 의 [사람] 단계다(H3 · H15).

## 바뀌는 파일 (Files that change)

손으로 쓰는 파일은 열이다(모두 새 파일). 공용 파일 변경 요청은 아래 따로 적고 세지 않는다. 바꾸지 않는 것: P3a 스키마 · 마이그레이션(새 마이그레이션 없음), P4 의 `src/core/seed/*` · `tests/fixtures/seed/builders.ts`, P9a 의 `src/core/ai/*` · `tests/fixtures/*`.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/seed/version-pick.ts` | 신규 | 순수 함수. 판 견주기 · 판 고르기 · 시드 최신 개정 · 칸 묶음 · 규격 행 칸 키 · 적재 판 규칙(아래 '파일별 값' 1) |
| `src/core/seed/settings-compare.ts` | 신규 | 순수 함수. 설정값 시드 견주기 · 개발용 덮어쓰기 · 결과 값 · 3.2 관계 표 읽개(아래 2) |
| `src/server/seed/load.ts` | 신규 | `server-only`. 적재 함수 `loadSeed`: 검증 → 계획(판 규칙 · 설정 · 단가 · 낱말 · 그림) → 조합 · 관계 검사 → 한 트랜잭션에 넣기 → 보고(아래 3) |
| `src/server/seed/read.ts` | 신규 | `server-only`. 판 고르기 읽기 함수 여섯(아래 4) |
| `scripts/seed-load.ts` | 신규 | 명령 `pnpm seed:load`. 인자 · 환경 · 출력 · 종료 코드(아래 5) |
| `tests/fixtures/seed/loadable.ts` | 신규 | 적재 시험용 시드 나무(miniSeed + 모든 설정 + P9a 시험용 단가표)와 판 바꾸기 · 풀이 기록 해시 다시 셈 · 프로필 · 세션 넣기 도우미(아래 6) |
| `tests/unit/version-pick.test.ts` | 신규 | AC-17a(판 고르기) · 5절 판 적재 규칙 |
| `tests/unit/settings-compare.test.ts` | 신규 | AC-7e · AC-7g(견주기 몫) · 5절 설정값 시드 |
| `tests/integration/seed-load.test.ts` | 신규 | AC-17b · AC-7e · AC-7g · AC-8i(적재 몫) · 5절 적재 · 명령 |
| `tests/integration/seed-version.test.ts` | 신규 | AC-17a(적재와 읽기) · 시드 최신 개정 |

### 요청하는 공용 변경(컨트롤러가 합친다)

격리 워크트리는 띄울 때 HEAD 에서 만들어지므로, 이 plan 의 구현자가 자기 워크트리에서 아래를 글자 그대로 옮기고(작업 1 앞), 다른 워크트리(P5b · P6a · P9b)와 합칠 때 컨트롤러가 충돌을 푼다(P3 · P4 · P9 와 같은 길).

| # | 파일 | 바꿀 것 | 까닭 |
|---|---|---|---|
| 1 | `package.json` scripts | `"seed:load": "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/seed-load.ts"` | 5절 적재 명령. `--conditions=react-server` 는 `server-only` 를 빈 모듈로 풀어 tsx 스크립트가 `src/server/{db,clock,seed}` 를 가져오게 한다(확인한 사실 9). `.env.local` 은 요청자 컴퓨터의 개발용 접속 문자열이다(P5a 와 같은 꼴) |

### 파일별 값(구현자가 옮겨 쓸 것)

1. `src/core/seed/version-pick.ts`. DB · 파일 · 시계를 가져오지 않는다(의존 규칙 core-no-framework · core-no-io). 가져오는 것은 `@/core/seed/structure`(`parseCellKey` · `bandInfo` · 형) 뿐이다.

| 이름 | 무엇 · 규칙 | 정본 |
|---|---|---|
| `SeedVersion` | `{ revision: number; correction: number }` | 5절 '개정.정정' |
| `compareVersions(a, b)` | 개정 먼저, 같으면 정정으로 견준다(음수 · 0 · 양수) | 5절 |
| `formatVersion(v)` | `"3.1"` 꼴 글(출력 · 메시지용) | 5절 |
| `pickVersion(rows, startRevision)` | 한 칸의 행들 가운데 `revision ≤ startRevision` 인 행에서 판이 가장 높은 행. 없으면 `undefined`(뒤 개정에 생긴 칸은 열지 않는다) | 5절 '시작 개정 이하인 행 가운데 가장 높은 판' |
| `pickByCell(rows, cellOf, startRevision)` | 칸마다 `pickVersion` 한 결과 `Map<칸, 행>` | 5절 |
| `latestRevision(rows)` | 행들의 가장 큰 `revision`, 행이 없으면 0 | 5절 '시드 전체 최신 개정 번호' |
| `SEED_TABLES` | `level_specs · unit_specs · lessons · level_test_items · placement_items`(판 열이 있는 표 다섯, 차례가 넣는 차례) · 형 `SeedTable` | 5절 |
| `levelSpecCell(area, level)` · `unitSpecCell(area, level, unit)` | 규격 행의 칸 키 `level-spec:<영역>:<단계>` · `unit-spec:<영역>:<단계>:<단원>`(제안 — P4a 칸 키 표는 수업 · 평가 · 배치 · 이야기만 두어 판 규칙 쪽에서만 쓴다) | 5절 'level_specs · unit_specs 도 같은 규칙' |
| `cellGroupOf(cell)` | 칸이 속한 묶음: 수업 칸 → `lesson:<영역>:<단계>:<단원>`, 토리 이야기 → `story:<구간>`, 단계 평가 문항 · 회화 평가 카드 장 → `level-test:<영역>:<단계>:<벌>`, 배치 문항 → `placement:<영역>:<벌>`, 규격 행 → 그 칸 자신. 꼴을 모르는 칸은 던진다 | 아래 판 적재 규칙 |
| `VersionRow` | `{ table: SeedTable; cell: string; revision; correction; hash: string }`. `hash` 는 P4c `cellHash(칸 키, 칸 객체)`(판 · 생성 기록을 뺀 정규 JSON 의 sha256) | 6.4 '칸의 내용 해시' |
| `planVersionRows(incoming, existing)` | 판 적재 계획 `{ latestBefore, latestAfter, insert, skip, violations }`. 아래 규칙 표. `existing` 은 다섯 표의 모든 행(넣는 칸과 관계없이 최신 개정을 세려고) | 5절 · R5 |
| `VERSION_RULES` | 아래 표의 규칙 이름 다섯 | — |

판 적재 규칙(G = 적재 앞 DB 다섯 표의 가장 큰 개정, 정할 것 다):

| 규칙 | 기준 | 실패 예 |
|---|---|---|
| (같음) | DB 에 같은 칸 · 같은 판(개정 · 정정)이 있고 해시가 같으면 건너뛴다 | — |
| `version-content-changed` | 같은 칸 · 같은 판인데 해시가 다르다(판을 올리지 않고 내용을 고침) | 1.0 으로 넣은 수업 4 의 지문을 고치고 판을 1.0 그대로 둠 |
| `revision-not-new` | 이미 행이 있는 칸의 새 개정(정정 0)인데 개정이 G 이하다. G 를 넘으면 받는다(작성은 5절대로 G + 1, 환경마다 적재 간격이 달라 건너뛴 번호는 받는다) | G = 4 인 DB 에 칸 X 의 3.0 을 새로 넣음 → 개정 3 에서 시작한 단원에 새 개정이 새어 든다 |
| `new-cell-in-open-group` | DB 에 행이 없는 새 칸인데 그 칸 묶음(단원 · 벌 · 배치 벌)에 이미 행이 있고 개정이 G 이하다. 빈 묶음의 새 칸은 개정과 관계없이 받는다(아직 아무도 그 묶음을 시작하지 못했다) | 단원 1 에 보강 수업 4 를 1.0 으로 더함(seed.remedial_per_unit 이 늘어 생긴 칸) → 진행 중 단원에 보인다 |
| `correction-without-revision` | 정정(정정 ≥ 1)인데 DB 에 그 칸의 그 개정 행이 하나도 없다. 칸 자체가 처음이면(DB 에 그 칸 행이 없음) 위 새 칸 규칙을 따른다 | DB 에 2.0 · 4.0 만 있는 칸에 3.1 을 넣음 |
| `correction-not-new` | 그 칸 · 그 개정에서 DB 의 가장 큰 정정 이하인데 같은 판이 없다(낮은 정정이 뒤늦게 옴) | DB 에 2.2 가 있는데 파일이 2.1 로 되돌아감 |

   `latestAfter` 는 `max(latestBefore, 넣는 행의 가장 큰 개정)` 이다. 규칙은 칸마다 따로 보고 한 칸에서 여럿 걸리면 모두 낸다. 하나라도 걸리면 적재 전체가 실패한다(아래 3).

2. `src/core/seed/settings-compare.ts`. DB · 파일을 가져오지 않는다. P4a 규격의 `SettingRow` 형 · `SettingValueSchema` 에서 뽑은 값 형과 P4c `canonicalJson` 을 쓴다.

| 이름 | 무엇 · 규칙 | 정본 |
|---|---|---|
| `SEED_LOAD_SOURCE` | `"seed_load"` — settings_history.source 의 '시드 적재' 값(snake_case 영어, P9c 알림 종류 값과 같은 꼴. 2차 고급 · 기본 화면이 자기 값을 더한다) | C56 (4) 'P7 이 값을 정한다' · 정할 것 라 |
| `COMPARED_CHANGE_VIA` · `INSERT_ONLY_CHANGE_VIA` | `seed` · `decision-first` / `advanced` · `basic` | 5절 · 12절 바꾸는 곳 |
| `DEV_OVERRIDE_KEYS` | `["seed.complete_through_level"]` — 개발용 적재가 덮어 넣을 수 있는 키 | 11절 (4-1) |
| `DbDefaultSetting` | `{ key, scope, value }` — profile_id 가 빈 행만(프로필 행은 부모가 바꾼 값이라 견주지 않는다) | 12절 머리 · B5-19 |
| `compareSettings(seed, db, overrides = {})` | `SettingsPlan = { inserts, updates, kept, orphans, violations, values }`. 규칙: 시드 키가 DB 에 없으면 넣기(바꾸는 곳 모두). 있으면 `seed` · `decision-first` 는 값이 다를 때 고치기(이전 값 · 새 값), `advanced` · `basic` 은 DB 값을 지키고 다르면 `kept` 에 적기. 범위(`household` · `profile`)가 DB 행과 다르면 `setting-scope-changed`. 시드에 없는 DB 키는 지우지 않고 `orphans`. `overrides` 는 `DEV_OVERRIDE_KEYS` 이고 시드 바꾸는 곳이 `seed` 인 키만 받는다(아니면 `override-not-allowed`). `values` 는 견준 뒤 기본 행의 값(넣을 값 · 고칠 값 · 지킨 DB 값) | 5절 · 12절 |
| `sameSettingValue(a, b)` | `canonicalJson(a) === canonicalJson(b)` — 사전 키 차례(`writing.max_corrections`)와 `1` · `1.0` 을 같게 본다 | 5절 '시드 값과 다르면' |
| `numberReader(values)` | P4b `SettingsReader`(키 → 수). 키가 없거나 수가 아니면 `SettingsIncompleteError(key)` | 3.2 관계 표 검사 입력 |

3. `src/server/seed/load.ts`(`import "server-only"`). 시각은 부르는 쪽이 한 시계 값을 `now` 로 넘긴다. 질의 SQL 안에 `now()` 를 쓰지 않는다(P3a 메모). 비울 수 있는 jsonb 에 JSON null 을 넣지 않는다(P3a 메모).

   - `loadSeed(db: Db, options: LoadOptions): Promise<LoadReport>`. `LoadOptions = { files: ReadonlyMap<string, string>; completeThrough?: number; areas?: readonly Area[]; referenceOnly?: boolean; dryRun?: boolean; now: Date }`. `files` 는 seed/ 뿌리 기준 경로 → 글(P4c `readSeedTree` · 만들기 함수 `seedTreeFiles` 와 같은 꼴). `areas` 기본은 넷(main), `referenceOnly` 면 칸 영역은 비운다(정할 것 나).
   - 차례:
     1. 완전성 범위 `through` = `completeThrough` ?? settings.json 의 `seed.complete_through_level`(1~12 정수가 아니면 거부 `settings-incomplete`).
     2. 검증: P4c `validateSeed(files, { mode: "complete", through, areas: referenceOnly ? [] : areas })` → `exitCodeOf(report) !== 0` 이면 거부(단계 `validate`, 보고에 요약 · 오류 첫 몇 줄). 한 행도 넣지 않는다(AC-17b). `areas: []` 는 규격 파일 완전성 · 오류만 본다(P4c 완전성 표의 '규격 파일 — 범위와 상관없이 늘 본다').
     3. 칸 모으기: P4c `collectCells(files, { areas })` 의 `cells` 와 `reference`. 칸 객체를 아래 표대로 행으로 바꾼다(손으로 다시 걷지 않는다, P4c 위험 11).
     4. 한 트랜잭션(`db.transaction`): 첫 문장 `select pg_advisory_xact_lock(hashtext($1))`(`SEED_LOAD_LOCK_KEY = "momo.seed-load"`, 동시 적재를 줄 세운다) → 읽기(다섯 표 모든 행의 칸 열 · 판 · 내용 JSON, vocab · images · model_prices 전부, settings 의 profile_id 빈 행) → 계획(`planVersionRows` · `compareSettings` · 단가 계획 · 낱말 · 그림 계획) → 검사(아래) → 위반이 있으면 거부 오류를 던져 되돌린다 → `dryRun` 이면 계획 보고를 담아 되돌린다 → 넣기 → 보고.
     5. 검사: 판 규칙 위반, `setting-scope-changed` · `override-not-allowed`, 단가 `price-row-changed`(같은 (모델, 적용일)에 단가 넷이나 조합 칸이 다름 — 바꾸려면 새 적용일 행을 더한다), 6.1 조합 `checkSettingsCombos(values, book)`(P9a, 위반 `combo:<keyBase>:<이유>`), 3.2 관계 `checkFrameRelations({ settings: numberReader(values), levelSpecs: 시드 level-specs 행 })`(P4b, 위반 `frame-*`), 토리 이야기 칸의 `title` · `generation` 없음(`story-field-missing`, 정할 것 타). `book` = P9a `priceBookOf(DB 단가 행 ∪ 새로 넣을 단가 행, onDay)`, `onDay` = `learningDayOf(now, values["app.timezone"], values["app.day_start_hour"])`(P3a). DB 단가 행은 P9a `loadPriceBook` 과 같은 꼴(`{ model, effectiveFrom, inputUsd: numeric 글 …, caps: ModelCapabilitiesSchema.parse(capabilities) }`)로 바꾼다.
     6. 넣는 차례: images → vocab → model_prices → level_specs → unit_specs → lessons → level_test_items → placement_items → settings → settings_history. 많은 행은 `INSERT_CHUNK_ROWS`(200, 기술 값)씩 묶어 넣는다.
   - 시드 → DB 열(모든 판 열 `revision` · `correction` 은 칸 그대로):

| 시드 | 표 | 열 |
|---|---|---|
| `level-specs.json` 행 | level_specs | area · level · cefr · band · can_do ← canDo · spec ← 행 전체(LevelSpec) |
| `unit-specs.json` 행 | unit_specs | area · level · unit · learning_points ← learningElement(JSON 글) · topic · target_vocab ← words |
| `images.json` 항목 | images | key · path ← file · source · license · attribution(없으면 SQL NULL) · word. 키로 있으면 고치고 없으면 넣는다(판 없음, 정할 것 다) |
| `vocab.json` 항목 | vocab | word · meaning ← meaningKo · parts_of_speech ← pos · example · band_level ← level · forms ← forms(JSON 목록) · image_key ← imageKey(없으면 SQL NULL). word 로 있으면 고치고 없으면 넣는다. `id`(uuid)는 DB 가 처음 만든 것을 그대로 둔다(vocab_progress 가 가리킨다, C54 (3) · C56 (5)) |
| `model-prices.json` 항목 | model_prices | model · effective_from ← effectiveFrom · 단가 넷 ← 수의 `toFixed(4)` 글 · capabilities ← P9a `capabilitiesOf(항목)`. (모델, 적용일)이 없을 때만 넣는다 |
| 수업 칸(kind `lesson`) | lessons | area · level · unit · kind · lesson_no ← lessonNo · topic_variant ← variant · list_title ← title · content ← 수업 객체 전체 · new_words ← newWords · unit_words ← unitWords · generation |
| 토리 이야기 칸(`story`) | lessons | area `talk` · level ← 구간 첫 단계 · unit SQL NULL · kind `tori_story` · lesson_no ← no · topic_variant 1(P4a 칸 키의 변형 1) · list_title ← title · content ← 이야기 객체 전체 · new_words · unit_words 빈 목록 · generation |
| 단계 평가 문항(`test-item`) | level_test_items | area · level · form · item_no ← no · item_type ← type · item ← 문항 객체 전체 |
| 회화 평가 카드 장(`talk-sheet`) | level_test_items | area `talk` · level · form · item_no ← sheet · item_type `talk-sheet`(제안) · item ← 장 객체 전체 |
| 배치 평가 문항(`placement`) | placement_items | area · level · form · item_no ← no · is_spare(칸 키 `spare`) · item_type ← type · item ← 문항 객체 전체 · answer ← `answerOf(문항)`(문항에 있는 `answerNo` · `accepted` · `sentence` 만 담은 객체, 제안) |
| `settings.json` 행 | settings · settings_history | 아래 '설정값' |

   - 내용 JSON 에 칸 객체 전체를 둔다. 그래서 앱(P10~P12)은 `content` · `item` · `spec` 을 P4a 규격(`LESSON_SCHEMAS[영역]` 등)으로 그대로 풀고, 적재는 DB 행에서 칸 객체를 되살려 `cellHash` 로 '같은 판 · 다른 내용'을 가린다(새 열 · 마이그레이션 없음, 위험 2). DB 행의 칸 키는 열에서 만든다(P4a `cellKey`, 이야기는 단계 → 구간, 규격 행은 `levelSpecCell` · `unitSpecCell`). unit_specs 는 `{ area, level, unit, learningElement, topic, words }` 로 되살린다.
   - 설정값: 넣는 행은 `{ key, scope, profileId: null, value, version }`, 고치는 행은 `value` · `version` 을 바꾼다. `version` 은 이번 적재에서 넣거나 고친 행 모두 `(settings 의 가장 큰 version 또는 0) + 1` 하나다(5절 '설정 판은 settings 전체의 변경 일련번호' — 한 번의 적재가 한 번의 변경, 정할 것 라). settings_history 는 고친 행마다 한 줄 `{ key, profileId: null, oldValue, newValue, changedAt: now, appliesFrom: null, source: SEED_LOAD_SOURCE }` 이고 넣은 행은 남기지 않는다(5절 '다르면 고치고 … 남기며').
   - 이 함수는 학습 기록 · 운영 표(profiles · profile_tracks · sessions · attempts · talk_turns · talk_summaries · vocab_progress · unit_progress · level_tests · star_ledger · badges · rewards · daily_sentences · parent_auth · ai_calls · ai_status · progress_events · parent_alerts · seed_reports)를 읽지도 쓰지도 않는다. 행을 지우지 않는다.
   - `LoadReport`(version 1, 명령의 `--json` 꼴): `{ version: 1, outcome: "loaded" | "dry-run" | "refused", completeThrough, areas, referenceOnly, validation: { code, summary }, latestRevision: { before, after }, counts: { cells: { inserted: Record<SeedTable, n>, skipped: Record<SeedTable, n> }, images · vocab: { inserted, updated, unchanged, absentFromSeed }, modelPrices: { inserted, unchanged }, settings: { inserted, updated, kept, orphans, version }, history }, violations: { rule, table?, cell?, key?, message }[], inserted: { table, cell, revision, correction }[] }`. `inserted` 는 seed/manifest 의 판 기록(P8)에 옮겨 쓰는 목록이다.

4. `src/server/seed/read.ts`(`import "server-only"`). 함수마다 `(입력, { db = getDb() } = {})` 꼴(P3a 서버 함수 규약). 시작 개정 이하 행만 SQL 로 걸러 읽고 칸 고르기는 `pickByCell` 하나로 한다(고르기를 SQL 에 두지 않는다). 시작 전 단원(2차 단원 미리보기 · 세션 시작 직전)은 `startRevision` 에 `currentSeedRevision()` 을 넘긴다(4절 단원 미리보기 '시작 전 단원은 가장 높은 판').

| 함수 | 돌려주는 것 |
|---|---|
| `currentSeedRevision()` | 다섯 표의 가장 큰 개정(빈 DB 0). 단원 · 단계 평가 · 배치 평가의 시작 개정에 쓴다(5절) |
| `readLessonsOfUnit({ area, level, unit, startRevision })` | 그 단원 칸마다 고른 lessons 행(종류 차례 assigned · reinforce · alphabet · remedial, 그다음 수업 번호 · 변형) |
| `readLevelSpec({ area, level, startRevision })` · `readUnitSpec({ area, level, unit, startRevision })` | 고른 행 하나 또는 `undefined` |
| `readLevelTestForm({ area, level, form, startRevision })` | 문항(회화는 장) 번호마다 고른 level_test_items 행 |
| `readPlacementForm({ area, form, startRevision })` | (단계, 예비 여부, 문항 번호)마다 고른 placement_items 행 |

   돌려주는 행은 Drizzle 선택 형 그대로이고 내용 JSON 의 Zod 풀기는 부르는 쪽(P10~P12)이 한다. 토리 이야기 읽기는 1-나 회화 plan 이 더한다.

5. `scripts/seed-load.ts`(`pnpm seed:load`). P4c `scripts/seed-validate.ts` 와 같은 꼴 — 순수 꼴(`parseArgs` · `runSeedLoad(args, deps)` → `{ code, lines }`)을 내보내고 파일 걷기 · 접속 · 출력은 직접 실행될 때만 한다(`isDirectRun`, `process.exitCode = await main()`). P4c 의 `readSeedTree` · `REQUIRED_FILES` · `DEFAULT_ROOT` 를 가져다 쓴다.

| 인자 | 뜻 |
|---|---|
| `--root <폴더>` | 시드 뿌리(기본 `seed`) |
| `--complete-through <n>` | 1~12. 개발용 적재의 덮어쓰기(11절 (4-1)). 없으면 settings.json 값(main) |
| `--areas <영역,…>` | 수업 · 평가 · 배치 · 이야기 칸을 넣을 영역(기본 넷) |
| `--reference-only` | 규격 파일만 넣는다(정할 것 나). `--complete-through` 와 함께만, `--areas` 와는 함께 못 쓴다 |
| `--dry-run` | 계획 · 검사만 하고 되돌린다 |
| `--json` | `LoadReport` 하나만 표준 출력에 |

   - 환경: 접속 문자열은 `MIGRATION_DATABASE_URL`(세션 풀러 5432 — 마이그레이션과 같은 배치 작업 접속, 긴 트랜잭션 하나, 정할 것 아). `createDb(url, { max: 1 })`, 끝에 닫는다. 시각은 `@/server/clock` 의 `now()`.
   - 종료 코드: 0 넣음(바뀐 것이 없어도) · 미리 돌림, 1 거부(검증 · 판 규칙 · 설정 · 조합 · 관계 · 단가), 2 입력 · 환경 오류(모르는 인자 · 잘못된 값 · 뿌리 없음 · 꼭 있어야 하는 규격 파일 없음이나 JSON 아님 · 접속 문자열 없음 · 접속 실패).
   - 출력 첫 줄: `seed-load: <넣음|미리 돌림|거부> · 칸 넣음 <n> · 건너뜀 <n> · 낱말 넣음 <n> 고침 <n> · 그림 넣음 <n> 고침 <n> · 단가 넣음 <n> · 설정 넣음 <n> 고침 <n> 지킴 <n> · 이력 <n> · 최신 개정 <앞>→<뒤> · 위반 <n>`. 다음 줄부터 위반마다 `<규칙> <표> <칸 또는 키> <설명>`. 검증 거부면 seed-validate 요약 줄과 다시 볼 명령(`pnpm seed:validate --complete-through <n> --areas …`)을 적는다. 접속 문자열 · 키 · 칸 내용을 내지 않는다.

6. `tests/fixtures/seed/loadable.ts`. 무작위 · 아이 이름 · 연락처 꼴을 쓰지 않는다(P4a 제약). 시각은 고정 값을 넘긴다.

| 함수(제안) | 무엇을 |
|---|---|
| `loadableSettings()` | P4a `smallFrameSettings()` 의 45 키 + `TEST_SETTINGS`(P3a · P9a) 키를 SettingRow 로(바꾸는 곳은 12절대로: `app.*` 시드, `writing.*` 결정 기록 먼저, `session.length_factor` 기본, 나머지 `ai.*` · `access.*` · `parent.*` · `talk.safety_*` 고급). 조합 · 관계 · 학습일 계산에 드는 키가 모두 있다. `seed.complete_through_level` 은 1 이다 — 시험용 시드가 1단계까지라 덮어쓰기 없는 적재(main 꼴)도 완전성을 넘는다 |
| `loadableSeed({ areas? })` | `miniSeed({ areas: 넷, through: 1, frame: "small" })` 에 `loadableSettings()` 와 P9a `MODEL_PRICES_FIXTURE`(실제 조합 칸, P4a 견본의 지어낸 조합 칸이 아님)를 끼운 시드 나무 |
| `withSetting(tree, key, value)` · `withoutSetting(tree, key)` | 설정 행 하나 바꾸기 · 빼기 |
| `withCellVersion(tree, cellKey, version, change?)` | 칸 하나(수업 · 이야기 · 평가 문항 · 회화 평가 카드 장 · 배치 문항)의 판을 바꾸고 `change` 로 내용을 고친 뒤, 그 칸의 풀이 검사 기록 해시를 `cellHash` 로 다시 센다(판정 same 은 그대로) — 그래야 완전성 검사가 '풀이 검사 안 됨'으로 막지 않는다 |
| `withLevelSpecVersion(tree, area, level, version, change?)` · `withUnitSpecVersion(...)` | 규격 행 판 바꾸기 |
| `filesOf(tree)` | P4a `seedTreeFiles` 다시 내보내기(시험은 디스크 없이 `loadSeed` 에 넘긴다. 명령 시험만 `writeSeedTree` 로 `tests/.tmp/` 에 쓴다) |
| `insertProfileSession(db, { lessonId, at })` | 프로필 하나(이름은 앱 안 이름 Tori · Momo 꼴)와 그 수업을 가리키는 진행 중 세션 하나 |

## 작업 순서 (Order of work)

시작 전(구현자). 격리 워크트리(바탕 01ff0a9)에서 `pnpm install --frozen-lockfile` 뒤 '요청하는 공용 변경' 1 을 옮긴다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴이다(서브에이전트 환경이 `source ~/.nvm/nvm.sh` 와 한글 경로 인자를 막는다). Drizzle 코드는 설치판 `node_modules/drizzle-orm` 형 정의를 먼저 본다(트랜잭션 · `onConflictDoNothing` · 묶어 넣기). 구현자(implementer · Opus · high) 하나가 차례로 하고 ∥ 는 없다. 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 시험의 설계 숫자는 시험용 자료(`loadableSettings` · `TEST_SETTINGS` · `MODEL_PRICES_FIXTURE`)에서 읽는다.

1. [검증] 판 고르기 · 판 적재 규칙. `version-pick.test.ts` → `src/core/seed/version-pick.ts`(파일별 값 1). 완료: 시험 통과, `pnpm check:deps` 0.
2. [검증] 설정값 시드 견주기. `settings-compare.test.ts` → `src/core/seed/settings-compare.ts`(2). 완료: 시험 통과.
3. [검증] 적재 시험용 자료. `tests/fixtures/seed/loadable.ts`(6). 완료: `loadableSeed()` 가 `validateSeed(… complete, through 1)` 오류 0 · 빈 칸 0 이고, `withCellVersion` 으로 바꾼 나무도 오류 0(시험 하나로 고정).
4. [DB][서버] 적재 함수. `seed-load.test.ts` 의 AC-17b · AC-7e · AC-7g · AC-8i · 5절 줄 → `src/server/seed/load.ts`(3). 완료: 그 시험 통과, `pnpm test:int` 전체 통과.
5. [DB][서버] 판 고르기 읽기. `seed-version.test.ts`(AC-17a) → `src/server/seed/read.ts`(4). 완료: 시험 통과.
6. [검증] 명령. `seed-load.test.ts` 의 '적재 명령' 줄 → `scripts/seed-load.ts`(5). 실기: (가) 그 시험 안에서 `tests/.tmp/` 에 쓴 `loadableSeed` 나무로 `runSeedLoad` 를 `--dry-run` · 실제 · 다시 한 번 돌린 첫 줄을 보고에 옮긴다. (나) 터미널에서 `MIGRATION_DATABASE_URL` 없이 `pnpm seed:load --root tests/.tmp/<그 나무>` 가 2 로 끝나고 접속 문자열 · 값을 내지 않는지 본다(조건 플래그로 띄워 `server-only` 를 넘는지도 이것으로 확인). 실제 DB 에 넣는 일은 b 의 [사람] 단계. 바탕에 `seed/`(P6a)가 들어와 있으면 '규격만 적재' 시험이 그것을 넣는다(없으면 건너뜀으로 보고). 완료: 시험 통과, 실기 출력이 보고에 있다.
7. [검증] 마무리. CI 와 같은 순서 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, 비밀값 grep 0건. 완료: 출력이 구현 보고에 있고 missing-test 가 시작 때보다 셋 적다(AC-17a · 17b · 7e).
8. [사람] 검토 · 커밋(H14). code-reviewer(Opus · xhigh) 검토와 fix ≤3 뒤 요청자 지시로 컨트롤러가 커밋한다. 완료: 커밋. b 가 이 브랜치 끝에서 시작한다.

### H3 · H15 전에 할 수 있는 것과 뒤에 할 것

| 때 | 할 수 있는 것 |
|---|---|
| H3 · H15 전(지금) | 작업 1~8 전부. 판 규칙 · 설정 견주기는 순수 함수, 적재 · 읽기 · 명령은 시험용 Postgres(embedded-postgres)로 끝난다. 개발용 DB 가 필요 없다 |
| P6a 합침 뒤 | '저장소 seed/ 규격 파일을 규격만 적재로 넣는다' 시험이 실제 규격 파일로 돈다(그 전에는 건너뜀) |
| H3 뒤 | 개발용 DB 에 첫 적재(b 작업 6, 요청자 터미널) |
| H15 뒤 | dev-load 작업(b) |

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 판 적재 규칙(정할 것 다)이 정본 문장('가장 큰 개정 + 1')보다 넓다 — 환경마다 적재 간격이 달라 운영 DB 는 개정 둘을 한 번에 받을 수 있다 | 규칙을 '정확히 + 1'로 두면 운영 적재가 막히고, 너무 느슨하면 새 개정이 진행 중 단원에 새어 든다(R5 위반) | 지켜야 하는 성질 하나(새 개정 · 열린 묶음의 새 칸은 DB 최대 개정 G 를 넘는다)만 막는다. 작성 규칙(+ 1)은 P8 · 1-나 정정 절차의 몫. 단위 시험이 경계(G · G + 1 · G + 2)를 고정한다 |
| 2 | '같은 판 · 다른 내용'을 가리려고 매번 다섯 표의 내용 JSON 을 모두 읽는다 | 첫 운영 범위(수업 약 3,600 · 문항 약 1,300)에서 적재가 수십 초 걸릴 수 있다(추측) | 1-가 범위는 작다. 느리면 시드 표 다섯에 `content_hash` 열을 더하는 길(더하기만 마이그레이션 · 5절 열 · 13절 한 줄)로 바꾼다. 해시 정의는 P4c `cellHash` 하나다 |
| 3 | jsonb 왕복 뒤 칸 객체가 달라 보일 수 있다(수 꼴 · 키 차례 · 최상위 글) | 같은 판을 다시 넣을 때 `version-content-changed` 로 거짓 거부 | 해시는 정규 JSON(키 차례 · `1` 과 `1.0` 같음), jsonb 는 다시 풀지 않는 customType(P3a). 시험 'AC-17b 같은 판 두 번'이 모든 칸 종류를 지난다 |
| 4 | 한 트랜잭션이 길다 | 연결 끊김 · 시간 상한 | 세션 풀러(정할 것 아) · 묶어 넣기 · 자문 잠금. Supabase 의 statement_timeout 은 문장 하나에 걸리고 묶음 하나는 작다(추측). 실패하면 전부 되돌아가므로 다시 돌리면 된다 |
| 5 | tsx 스크립트는 `server-only` 모듈을 가져오지 못한다 | 명령이 시작부터 던진다 | `node --conditions=react-server --import tsx`(확인한 사실 9). 시험은 vitest 별칭으로 같은 일을 한다(P3a). `server-only` 판은 잠금 파일에 고정 |
| 6 | 첫 개발용 적재 뒤에 규격 파일(P6a fix)을 판을 올리지 않고 고친다 | 다음 적재가 `version-content-changed` 로 막힌다 | 의도한 안전망이다. 첫 개발용 적재는 P6a 승인 · 커밋 뒤(b 작업 6). 그 뒤 규격을 고치면 개정(G + 1) 또는 정정(같은 개정 · 정정 + 1)으로 올린다(P6 · P8 에 넘김) |
| 7 | '고급' · '기본' 키는 처음 넣은 뒤 DB 값을 지킨다(5절) | 개발 중 settings.json 의 고급 기본값을 바꿔도 개발용 DB 에 닿지 않는다 | 정본 동작이다. 개발용 DB 에 새 기본값이 필요하면 요청자가 SQL 편집기로 그 행을 지운 뒤 다시 적재한다. 적재 보고의 `kept` 줄이 차이를 보인다 |
| 8 | 판 없는 표(vocab · images)는 제자리에서 고친다 | 낱말 뜻 · 그림을 고치면 진행 중 단원에도 바로 닿는다 | 정정과 같은 성격으로 본다(정할 것 다). 낱말 id 는 그대로라 vocab_progress 는 깨지지 않는다. 빠진 낱말 행은 지우지 않는다 |
| 9 | 토리 이야기 규격(P4a)은 title · generation 이 선택인데 lessons 의 목록 제목 · 생성 기록 열은 비울 수 없다 | 회화 영역 적재가 막힌다 | 없으면 `story-field-missing` 으로 거부한다(조용히 지어내지 않는다). 1-가 개발용 적재는 회화를 넣지 않아 닿지 않는다. P4 · P8 에 넘김(정할 것 타) |
| 10 | 만들기 함수 `miniSeed` 는 1단계까지만 만든다 | `seed.complete_through_level` 6 → 7 같은 큰 값을 적재 전체로 시험할 수 없다 | AC-7e 는 '규격만 적재'(칸 완전성을 보지 않음)로 값 6 → 7 을 넣어 본다. 완전성 몫은 덮어쓰기 1 · 2(AC-7g)로 본다 |
| 11 | 옛 개정 행의 정정(5절 '그 행마다 따로 정정')을 시드 파일 하나로 싣기 어렵다 — 파일은 칸마다 판 하나다 | 2.0 · 4.0 이 함께 쓰이는 칸의 2.1 을 내려면 파일을 잠시 2.1 로 두어야 한다 | 적재 함수는 받은 칸 목록만 본다(파일 배치를 모른다). AC-17a 시험은 시드 나무를 바꿔 2.1 을 넣는다. 운영 절차와 따로 자리(`seed/corrections/` 등)는 1-나 신고 · 정정 plan(정할 것 파) |
| 12 | 공용 파일 겹침(`package.json` scripts — P5b · P6a · P9b · b) | 합칠 때 충돌 | 줄 하나씩이다. 컨트롤러가 합친다 |
| 13 | P6a 의 단가표(opus-4-8 `thinkingDefault` 'adaptive')가 P9a 판('none')과 다르다 | 개발용 DB 에 넣은 뒤 고치면 `price-row-changed` 로 막힌다 | 첫 개발용 적재 전에 P9a 작업 3 (나)의 고침을 seed 에 넣는다(P6 몫, 장부 '구현하며 확인할 것'). 늦으면 그 모델에 새 적용일 행을 더한다 |

### 정할 것(P7 전체, 컨트롤러가 정함 — 보고 `task-p07-plan-report.md` 와 같은 글자)

| 번호 | 무엇 | 왜 | 권함 | 13절 |
|---|---|---|---|---|
| 가 | 바탕 브랜치 | 브리프 후보 둘(8791527 · e08eaba)에는 P9a 조합 검사 · 단가 함수가 없다 | `feature/1a-p09a-ai-client` 01ff0a9(머리 문단). b 는 같은 브랜치 끝에서(가벼운 루프). 식별자 대조만 먼저 하려면 01ff0a9 에서 ∥ 로 띄워도 된다(겹침은 `package.json` scripts 한 줄) | 아니오 |
| 나 | 1-가 개발용 적재 범위(P4a 정할 것 ㅇ). 완전성 표(P4c)는 (1) 회화 · 토리 이야기, (2) 읽기 · 쓰기 1단계 알파벳 · 소리 단원(단원 0), (3) 1단계 단계 평가 level.test_forms(3) 벌 전부를 요구하는데 C50 (4)의 1-가 실시드는 '세 영역 1단계 단원 5개 · 평가 1벌 이상'이다. 또 (4) P8 수업이 오기 전에는 어떤 단계로도 완전성이 차지 않아 P3b 프리뷰 확인(설정 행) · P9 단가표가 P8 끝까지 막힌다 | 그대로면 dev-load 가 늘 실패한다(P4c 위험 3) | (1) dev-load 의 영역은 `reading,writing,speaking`(작업 입력 기본값). (2) · (3) 완전성 규칙은 운영과 같게 두고 1-가 실시드에 단원 0(읽기 · 쓰기 각 정규 10 + 보강 3, 변형 2)과 1단계 평가 3벌을 더한다 — 둘 다 첫 운영 배포 범위에 이미 있어 버리는 일이 아니고, 평가 묶음은 영역 × 단계 하나라 같은 묶음 안이다. (4) 수업이 오기 전 한 번은 '규격만 적재'(`--reference-only`: 규격 파일 완전성 · 오류 0 만 보고 수업 · 평가 · 배치 칸은 넣지 않으며 `seed.complete_through_level` 은 입력값). 다른 길: 개발용만 단원 0 · 벌 수를 완전성에서 빼는 선택지 — 코드 · 정본 예외가 늘고 프리뷰가 운영과 다르게 돈다(재응시의 다른 벌 · 첫 실행 알파벳 고르기) | 예 — C50 (4) 보완과 11절 (4-1) '규격만 적재' 한 줄 |
| 다 | 판 적재 규칙과 판 없는 표의 적재(5절 해석). 5절은 '바뀐 칸은 가장 큰 개정 + 1', '새 판의 행만 넣는다', '이미 있는 행은 건너뛴다'만 적었다 | 같은 판 · 다른 내용, 환경마다 다른 적재 간격, 판 열이 없는 vocab · images · model_prices 의 고침을 구현자가 정하게 된다 | 위 판 적재 규칙 표(같은 칸 · 판 · 다른 내용은 실패 · 새 개정과 열린 묶음의 새 칸은 G 초과 · 정정은 그 개정 행이 있고 정정 자리가 커야 함). vocab · images 는 낱말 · 키로 제자리 고침(정정과 같은 성격, 빠진 행은 남김), model_prices 는 (모델, 적용일) 더하기만(같은 키 · 다른 값은 실패, 바꾸려면 새 적용일) | 예 — 5절 적재 문단 한 줄 |
| 라 | 설정 판 · 이력 · 출처 값 | C56 (4)가 settings_history 출처 값을 P7 에 맡겼다. 넣은 행의 이력 여부와 설정 판을 올리는 단위가 정본에 없다 | 한 번의 적재 = 설정 판 하나(가장 큰 version + 1), 이력은 고친 행만, 출처 `seed_load` | 아니오(값 정하기, C56 (4) 위임) |
| 마 | 표본 검토 파일(seed/reviews)을 seed_reports 에 넣는 일(6.3 '적재 스크립트는 이 파일을 seed_reports 에 신고자 개발자로 넣는다')의 차수 | 11절은 seed_reports · 신고 목록 · 판단 기록을 1-나에 둔다. seed_reports 에는 두 번 넣기를 막을 유일 키가 없고, 검토 행에는 판이 없어 어느 판 행을 가리킬지 정해야 한다 | 1-나 신고 plan 으로 넘긴다. 1-가 적재는 seed/reviews 를 읽지 않는다 | 예 — 차수 배정 한 줄(C50 (3) 처럼) |
| 바 | GitHub 비밀값 자리(b) | GitHub Free 의 비공개 저장소는 환경 비밀값을 못 쓴다(확인한 사실 4). 10절은 '운영 환경 비밀값'이라 적었다 | b 정할 것 바 | b 에서 |
| 사 | main 작업을 켜는 때(b) | H8 전에는 운영 비밀값이 없다 | b 정할 것 사 | 아니오 |
| 아 | 적재의 접속 · 실행 방식 | 앱은 트랜잭션 풀러(6543)다. 적재는 긴 트랜잭션 하나다. tsx 스크립트는 `server-only` 를 못 가져온다 | `MIGRATION_DATABASE_URL`(세션 풀러 5432, 마이그레이션과 같은 배치 작업 접속) · `node --conditions=react-server --import tsx` · 자문 잠금 하나. 기술 선택이라 원하면 C55 처럼 한 줄 | 아니오(원하면 한 줄) |
| 자 | 활동 유지 작업(b) | 10절 '1주 비활성 정지를 막는 활동 유지 요청' | b 정할 것 자 | 아니오 |
| 차 | 식별자 대조의 규칙과 막는 범위(b) | 역분석 제안 6 · 조사 P5 · 묶음 위험 4 | b 정할 것 차 | 아니오 |
| 카 | P3a 정할 것 사의 '시험 설정값을 settings.json 에서 읽게 바꾸기' | 시험이 seed/ 파일에 묶인다 | 바꾸지 않고 식별자 대조의 `fixture-setting` 규칙이 맞댄다(b) | 아니오 |
| 타 | 토리 이야기 칸의 title · generation(5절 lessons 목록 제목 · 생성 기록이 비울 수 없음, P4a 규격은 선택) | 1-나 회화 적재가 막힌다 | 1-나 전에 P4 규격에서 둘을 필수로(P8 브리프에도). 그때까지 적재는 없으면 거부 | 아니오(1-나 몫) |
| 파 | 옛 개정 행의 정정을 싣는 길(위험 11) | 시드 파일은 칸마다 판 하나다 | 1-나 신고 · 정정 plan 에서 정한다. 적재 함수는 칸 목록을 받으므로 따로 자리를 더해도 바뀌지 않는다 | 아니오(1-나 몫) |

### 제약

- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 위 '정할 것'에 올리고 컨트롤러가 13절에 한 줄 넣은 뒤 구현한다.
- 설계 숫자는 settings 에서 읽는다. 시험도 시험용 자료에서 읽는다. 묶음 행 수 · 잠금 이름 같은 기술 값은 파일 위 이름 붙인 상수다.
- 시각은 한 시계에서 읽고 순수 함수에는 인자로 넘긴다. SQL 안에 `now()` 를 쓰지 않는다.
- DB 는 서버 Drizzle 로만. 적재는 행을 지우지 않는다(5절 '이전 판의 행은 지우지 않는다'). 마이그레이션을 만들지 않는다.
- 비밀값 · 아이 이름은 어디에도 적지 않는다. 시험의 접속 주소 · 비밀번호는 실행 때 만든다(P3a 도우미). 출력에 접속 문자열을 내지 않는다.
- 용어는 영역 · 단계 · 단원 · 활동 · 판 · 칸이다. 코드 식별자와 브랜치 이름은 영어 ASCII 다.
- 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer Opus · xhigh). 화면이 없어 화면 검토는 없다. 커밋 · PR 은 요청자 지시 때만(H14).

### 묶음 plan 과 다르게 한 것

1. P7 을 둘(a 적재 · 판 규칙, b CI 작업 · 식별자 대조 · 개발용 DB)로 나눴다. 적재 명령(CLI)은 a 에 두고 명령 시험은 통합 시험 파일 안에 둬 파일 열 개를 지켰다.
2. 바탕에 P9a 를 더했다(배정표 의존 'P3 · P4' → 'P3 · P4 · P9a'). AC-8i 적재 몫이 P9a 조합 검사를 쓴다. 배정표의 '∥ P9' 는 P9a 뒤 · P9b ∥ 로 읽는다.
3. 완료 판정의 '개발용 DB 에 P6 규격과 시험용 수업이 들고'에서 시험용 수업은 개발용 DB 에 넣지 않는다. 지어낸 시험 시드(miniSeed)는 자기 규격 파일을 갖고 있어 실제 규격(P6)과 같은 칸 · 같은 판으로 부딪친다(`version-content-changed`). 대신 b 에서 규격만 적재 → 프리뷰가 설정을 읽음을 확인하고, 수업은 P8 의 1-가 묶음이 차면 dev-load 로 넣는다(P8 완료 판정으로 옮긴다).
4. 판 고르기 읽기 함수(`src/server/seed/read.ts`)를 P7 에 뒀다. 배정표 P10 · P12 가 '시드 판 고르기'를 쓰는데 만드는 P 가 정해지지 않았다.

### 다른 P 에 넘길 것

- P6(P6a fix · 커밋): 첫 개발용 적재 전에 opus-4-8 `thinkingDefault` 'none'(P9a 작업 3 (나)). 첫 개발용 적재 뒤 규격 파일을 고치면 판을 올린다(개정 G + 1 · 정정 + 1).
- P8: 1-가 실시드에 단원 0 과 1단계 평가 3벌(정할 것 나가 권함대로면). 다시 만든 칸(프롬프트 · 규격이 바뀜)은 시드 전체 최대 개정 + 1(파일 기준), 사람 확인 '고침'은 같은 개정의 정정 + 1. 토리 이야기에 title · generation(정할 것 타). 적재 보고 `--json` 의 `inserted` 를 seed/manifest 판 기록에 옮긴다(5절 '판마다 바뀐 칸과 이유'). P7 완료 판정의 '수업 적재'는 P8 1-가 묶음 뒤 dev-load(`areas` 세 영역 · `complete_through` 1).
- P10 · P11 · P12: 시드는 `src/server/seed/read.ts` 로 읽는다. 단원 시작 · 단계 평가 · 배치 평가 시작 때 `currentSeedRevision()` 을 unit_progress.start_revision · level_tests.start_revision 에 남기고, 그 단원 · 평가의 읽기에 그 값을 넘긴다. 진행 중 세션은 `sessions.lesson_id` 의 행을 끝까지 쓴다(5절). 내용 JSON 은 P4a 규격으로 푼다.
- 1-나(신고 · 정정): seed/reviews → seed_reports(정할 것 마), 옛 개정 정정을 싣는 길(파), main 작업의 '신고 판단 기록 · 다시 계산' 단계(b main.yml 의 자리 주석).
- 2차(단원 미리보기): 시작 전 단원은 `startRevision = currentSeedRevision()` 으로 같은 읽기 함수를 쓴다(4절).

### 확인한 사실과 출처(2026-10-17, P7a · b 공통)

| 번호 | 사실 | 출처 · 판 |
|---|---|---|
| 1 | 시드 표 다섯의 판 열 · 유일 제약: level_specs(area, level, revision, correction) · unit_specs(…, unit, …) · lessons NULLS NOT DISTINCT(area, level, unit, kind, lesson_no, topic_variant, revision, correction) · level_test_items(area, level, form, item_no, …) · placement_items(area, level, form, item_no, is_spare, …). 판 확인 제약 `revision >= 0 AND correction >= 0`. vocab 은 uuid id + 유일 word, images 는 key 기본 키, model_prices 유일(model, effective_from) · capabilities jsonb, settings 유일 NULLS NOT DISTINCT(key, profile_id) · version int8, settings_history.source text('값은 P7') | `git show 01ff0a9:src/db/schema/content.ts` · `operations.ts` |
| 2 | P4c `validateSeed(files, { mode, through, areas })` · `exitCodeOf` · `collectCells(files, { areas })`(cells · reference · records) · `cellHash`(판 · 생성 기록 뺀 정규 JSON) · `canonicalJson`. `areas` 는 칸 걷기와 완전성을 함께 거르고, 규격 파일 완전성은 늘 본다. `scripts/seed-validate.ts` 가 `readSeedTree` · `REQUIRED_FILES` · `DEFAULT_ROOT` 를 내보낸다 | `git show 01ff0a9:src/core/seed/validate.ts`(87~160 · 429~466 · 610 · 987~1195줄) · `scripts/seed-validate.ts` |
| 3 | P9a `checkSettingsCombos(values, book)`(`invalid-setting` 이유 포함) · `capabilitiesOf` · `ModelCapabilitiesSchema` · `priceRowsOfSeed` · `priceBookOf(rows, onDay)`(같은 (모델, 날짜) 둘이면 던짐) · `loadPriceBook(db, onDay)` · `MODEL_PRICES_FIXTURE` · `TEST_SETTINGS` 의 ai.* 키. P4b `checkFrameRelations({ settings: SettingsReader, levelSpecs })` | `git show 01ff0a9:src/core/ai/combo.ts` · `cost.ts` · `src/server/ai/store.ts` · `tests/fixtures/ai/model-prices.ts` · `tests/fixtures/settings.ts` · `src/core/vocab/allocate.ts` |
| 4 | GitHub: 환경 비밀값은 GitHub Free 에서 공개 저장소만(비공개는 Pro · Team · Enterprise), 환경 비밀값은 그 환경을 가리키는 작업만 읽는다. 비밀값은 `if:` 에 바로 못 쓰고 작업 env 로 옮겨 쓴다. 저장소 변수(`vars`)는 작업 `if` 에 쓸 수 있다(조직 변수는 Free 비공개 저장소에서 못 읽음) | https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments · …/how-tos/deploy/configure-and-manage-deployments/manage-environments · …/how-tos/write-workflows/choose-what-workflows-do/use-secrets · …/use-variables (2026-10-17) |
| 5 | GitHub 일정 작업: 기본 갈래의 마지막 커밋에서만 돈다, 가장 짧은 간격 5분, 붐빌 때 늦어질 수 있다, 공개 저장소는 60일 동안 저장소 활동이 없으면 일정 작업이 꺼진다. `workflow_dispatch` 는 작업 파일이 기본 갈래에 있어야 돈다, 입력 꼴은 boolean · choice · number · environment · string | https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows · …/workflow-syntax (2026-10-17) |
| 6 | GitHub 작업 문법: `needs` 의 작업이 실패하면 뒤 작업은 조건식(always() 등)이 없는 한 건너뛴다, 단계의 `continue-on-error` 는 실패해도 작업을 통과시킨다, `concurrency` 는 한 무리에 하나만 돌고 `cancel-in-progress: true` 일 때만 도는 것을 끊는다 | https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax (2026-10-17) |
| 7 | Vercel Deployment Checks: 운영 배포는 만들어지지만 필수 검사가 모두 통과하기 전에는 사용자 지정 운영 도메인에 붙지 않는다. GitHub Actions 결과를 작업 이름으로 골라 건다(작업 이름을 바꾸면 설정도 바꿈, 여러 작업 파일에 같은 이름을 쓰지 말 것). 운영 자동 별칭이 켜져 있어야 한다. Force Promote 로 건너뛸 수 있다. 요금제 제한은 문서에 없다 | https://vercel.com/docs/deployment-checks (last_updated 2026-08-11) |
| 8 | Supabase Free 일시 중지: 지난 한 주에 사용자 DB 활동이 모자라면 멈춘다. 보통 그 주 날마다 DB 요청 몇 개면 멈추지 않는다. 경고 메일 → 멈춤 메일, 멈춘 뒤 1년 안에 되살릴 수 있다 | https://supabase.com/docs/guides/platform/free-project-pausing (문서 수정 2026-10-16, 2026-10-17 읽음) |
| 9 | `node --conditions=react-server --import tsx` 로 띄운 스크립트는 `server-only`(react-server 조건 = empty.js)를 거쳐 `src/server/db/index.ts` 를 가져온다. 조건이 없으면 index.js 가 던진다. drizzle-orm · postgres · zod · tsx · @anthropic-ai/sdk 의 package.json 에는 react-server 조건이 없다. 같은 띄우기로 `validate.ts` · `combo.ts` · `scripts/seed-validate.ts` 도 읽힌다 | 2026-10-17 `.claude/worktrees/p09`(01ff0a9, Node 24.22.0 · tsx 4.23.15 · server-only 0.0.1)에서 `node -e` 로 돌려 봄 · 설치판 `server-only/package.json` |
| 10 | P6a 시드(커밋 전 · 고치는 중, 워크트리 `agent-a6ef72438a158a2f3`): settings.json 180행(seed 36 · decision-first 24 · advanced 118 · basic 2), 프로필 키 다섯(review.daily_cards_per_area · session.length_factor · streak.rest_days_per_week · ai.daily_call_alert · ai.safety_daily_calls), profile.start_level 없음, seed.complete_through_level 6. level-specs 48행 · unit-specs 122행(작성 중) · 모두 판 1.0. vocab 965(작성 중) · imageKey 0. model-prices 여섯 행 effectiveFrom 2026-10-16, opus-4-8 thinkingDefault 'adaptive'. 쓰기 6단계 maxCorrections 2 = writing.max_corrections["6"] | 2026-10-17 그 워크트리 `seed/*.json` 을 읽기만 함(node 한 줄) |
| 11 | 바탕 후보: 8791527(P3a + P4c), e08eaba(+ P2b · P3b), 01ff0a9(8791527 + P9a, 마이그레이션 0002 포함). e08eaba 와 01ff0a9 는 같은 파일을 고치지 않았다(병합 기준 8791527, 충돌 0) | `git log` · `git diff --stat` · `git merge-tree 8791527 e08eaba 01ff0a9`(2026-10-17) |
| 12 | 의존 규칙: core-no-framework(src/core → src/db · src/server · next · react · drizzle · postgres 금지) · core-no-io(fs · child_process · http · https · net 금지, node:crypto 허용) · no-circular · ai-only-from-server · db-only-from-server(src/server · src/db · src/core 밖) · sdk-only-in-ai. 한 시계 정적 검사는 src/core · src/server · src/db · src/proxy.ts 의 `Date.now()` · 인자 없는 `new Date()` 를 src/server/clock 에만 둔다 | `git show 01ff0a9:.dependency-cruiser.cjs` · `tests/unit/learning-day.test.ts`(P3a) |
| 13 | ci.yml(e08eaba): 작업 lint · build · unit · depcruise · spec-trace · bundle-secrets · integration(embedded-postgres) · e2e · seed-validate(seed/settings.json 이 있을 때 PR 모드), 작업마다 `name` 없이 키가 이름. P5b 워크트리가 ci.yml 을 고치는 중(e2e-local) | `git show e08eaba:.github/workflows/ci.yml` · `.claude/worktrees/p05b` `git status`(2026-10-17) |
| 14 | 12절 표 121행, 바꾸는 곳: 고급 82 · 시드 18 · 결정 기록 먼저 18 · 기본 2 · 첫 실행 화면 1 | plan-p06a 확인한 사실 14 · `specs/09-설정값.md` 13~133줄 |

(추측): 첫 운영 범위의 적재 시간(위험 2), Supabase 세션 풀러에서 긴 트랜잭션 하나가 끊기지 않는 것과 postgres 역할의 statement_timeout(위험 4), Vercel Deployment Checks 의 Hobby 요금제 지원과 건너뛴(skipped) 검사의 처리(b), 활동 유지 질의 하나(`select count(*) from settings`)가 Supabase 의 '사용자 DB 활동'으로 세어지는 것(b), embedded-postgres 가 GitHub linux 러너에서 도는 것(P3a 가 H15 뒤 첫 `ci / integration` 으로 증명).

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-17a(판 고르기) | 단위 "AC-17a 판 고르기: 시작 개정 3 인 단원은 3.0 · 4.0 가운데 3.0 을, 시작 개정 4 인 단원은 4.0 을 고른다" · "AC-17a 판 고르기: 같은 개정의 정정 3.1 은 시작 개정 3 인 단원에 바로 고른다" · "AC-17a 판 고르기: 2.0 · 4.0 이 있는 칸에 2.1 이 들면 시작 개정 2 · 3 인 단원은 2.1 을, 4 인 단원은 4.0 을 고른다" · "AC-17a 판 고르기: 시작 개정 이하 행이 없는 칸(뒤 개정에 생긴 칸)은 열지 않는다" | `tests/unit/version-pick.test.ts` |
| AC-17a(적재와 읽기) | 통합 "AC-17a 개정 3.0 에서 시작한 단원 1 의 수업 4 는 개정 4.0 적재 뒤에도 3.0 으로, 그 뒤 시작한 단원 2 는 4.0 으로 열린다" · "AC-17a 정정 3.1 을 적재하면 진행 중인 단원 1 의 수업 5 와 그 다시 하기가 3.1 로 열린다" · "AC-17a 개정 4.0 뒤 2.0 행에 2.1 정정을 적재하면 2.0 을 읽던 단원은 2.1, 4.0 을 읽던 단원은 4.0 이다" · "AC-17a 멈춘 배치 평가는 그 사이 적재된 새 개정 문항을 읽지 않는다" · "AC-17a 판을 적재한 뒤에도 이전 판 행과 sessions.lesson_id 는 그대로 남는다" · "AC-17a 개정 3 에서 시작한 단원은 개정 4 · 5 의 칸을 열지 않고 회화 단계 규격의 목표 턴 수도 개정 3 의 값을 읽는다"(회화 단계 규격은 시험용 시드에 카드가 없는 5단계 행을 바꿔 검증이 막지 않게 한다) | `tests/integration/seed-version.test.ts` · `pnpm test:int` |
| AC-17b(적재 몫) | 통합 "AC-17b 같은 판을 두 번 적재하면 시드 테이블 · settings · settings_history 행 수가 같다" · "AC-17b 검증에 실패한 칸이 하나라도 있으면 한 행도 넣지 않는다" · "AC-17b 판 규칙에 어긋난 칸(같은 판 · 다른 내용)이 있으면 한 행도 넣지 않는다". main 순서 · 앞 실패면 뒤 멈춤은 b | `tests/integration/seed-load.test.ts` |
| AC-7e(적재 몫) | 단위 "AC-7e 설정값 시드 견주기: '시드' 키 seed.complete_through_level 6 → 7 은 고침 한 줄(이전 6 · 새 7)이다" + 통합 "AC-7e 설정값 시드의 seed.complete_through_level 을 6 → 7 로 적재하면 settings 가 7 이고 settings_history 에 seed_load 한 행이 생기며 설정 판이 오른다". 준비 중 · 알림 · 7단계 단원 1 열림은 P12 | `tests/unit/settings-compare.test.ts` · `seed-load.test.ts` |
| AC-7g(적재 몫) | 단위 "AC-7g 설정값 시드 견주기: 개발용 적재의 덮어쓰기는 seed.complete_through_level 의 시드 값을 대신하고 다른 키는 받지 않는다" + 통합 "AC-7g 개발용 적재(--complete-through 1)는 settings 의 seed.complete_through_level 을 1 로 덮어 넣고 그 단계까지 완전성을 본다(2 면 빈 칸으로 거부)"(시드 값을 6 으로 바꾼 나무에 덮어쓰기 1 · 2 를 준다). 운영 비밀값 없음 · PR 은 보고만은 b, 시각 당기기는 P3a | `settings-compare.test.ts` · `seed-load.test.ts` |
| AC-8i(적재 몫) | 통합 "AC-8i 설정값 시드에 ai.effort.talk_turn.1-3 xhigh(끔)이나 쓰기 확인 Opus 5.5 '끔'이 있으면 적재 전체가 실패하고 settings 가 바뀌지 않는다" | `seed-load.test.ts` |
| 5절 판 적재 규칙 | 단위 "5절 시드 최신 개정: 행들의 가장 큰 개정이고 행이 없으면 0 이다" · "5절 판 적재: 같은 칸 · 같은 판 · 같은 내용은 건너뛰고 내용이 다르면 version-content-changed 다" · "5절 판 적재: 있는 칸의 새 개정이 DB 의 가장 큰 개정 이하면 revision-not-new 다(크면 받고 건너뛴 번호도 받는다)" · "5절 판 적재: 행이 있는 단원 · 벌 · 배치 벌에 새로 생긴 칸은 가장 큰 개정보다 커야 하고 빈 묶음의 새 칸은 받는다" · "5절 판 적재: 정정은 DB 에 그 개정 행이 있어야 하고(correction-without-revision) 그 개정의 가장 큰 정정보다 커야 한다(correction-not-new)" · "5절 칸 묶음: 수업은 단원, 토리 이야기는 구간, 단계 평가는 벌, 배치는 영역 · 벌, 규격 행은 그 행이다" | `version-pick.test.ts` |
| 5절 설정값 시드 | 단위 "5절 설정값 시드 견주기: '시드' · '결정 기록 먼저' 키는 값이 다르면 고치고 같으면 그대로 둔다" · "5절 설정값 시드 견주기: '고급' · '기본' 키는 행이 없을 때만 넣고 DB 값이 달라도 지킨다" · "5절 설정값 시드 견주기: 값 비교는 정규 JSON 이다(사전 키 차례 · 1 과 1.0 은 같다)" · "5절 설정값 시드 견주기: 범위가 DB 행과 다르면 setting-scope-changed 이고 시드에 없는 DB 키는 지우지 않고 알린다" · "5절 설정값 시드 견주기: 결과 값 읽개는 없는 키 · 수 아닌 값에 SettingsIncompleteError 를 던진다" + 통합 "5절 설정값 시드: DB 의 unit.max_remedial(고급)이 새 seed.remedial_per_unit 보다 크면 3.2 관계 표로 적재 전체가 실패한다" | `settings-compare.test.ts` · `seed-load.test.ts` |
| 5절 적재(판 없는 표 · 범위 · 지키는 표) | 통합 "5절 적재: 단가표는 capabilitiesOf 꼴로 넣고 loadPriceBook 이 시드 파일과 같은 단가표를 읽으며 (모델, 적용일)이 같은데 값이 다르면 실패한다" · "5절 적재: 낱말 · 그림은 word · key 로 있으면 고치고 없으면 넣으며 vocab id 는 그대로, 시드에서 빠진 행은 남긴다" · "5절 적재: --areas 밖 영역의 수업 · 평가 칸은 넣지 않고 규격 파일은 모두 넣으며 규격만 적재는 수업 · 평가 · 배치 칸을 넣지 않는다" · "5절 적재: 학습 기록 · 운영 테이블(profiles · sessions · unit_progress · level_tests · seed_reports 등)은 바꾸지 않는다" · "5절 시드 최신 개정: 적재 뒤 currentSeedRevision 은 시드 테이블 다섯의 가장 큰 개정이다" · "5절 적재: 저장소 seed/ 규격 파일을 규격만 적재로 넣을 수 있다(seed/ 가 있을 때만)" | `seed-load.test.ts` · `seed-version.test.ts` |
| 명령 | 통합 "적재 명령: 모르는 인자 · 뿌리 없음 · 규격 파일 없음 · MIGRATION_DATABASE_URL 없음은 2, 거부는 1, 적재는 0 이고 출력에 접속 문자열이 없다" · "적재 명령: 첫 줄 요약 꼴과 --json(version 1) 꼴 · --dry-run 은 계획만 내고 한 행도 넣지 않는다" + 작업 6 실기 출력 | `seed-load.test.ts` · `scripts/seed-load.ts` |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm check:deps` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(missing-test −3) · `pnpm check:bundle` 초록, 비밀값 grep 0건. CI `ci / lint · build · unit · integration · depcruise · spec-trace · bundle-secrets`(H15 뒤) | 작업 7 |

시험 이름은 글자 그대로 적는다(spec-trace 가 이름 맨 앞 AC 토큰을 센다). 시험 안의 숫자는 시험용 자료에서 읽고, 이름의 3.0 · 4.0 같은 판은 시험이 차례로 적재해 만든다(1.0 → 2.0 → 3.0 → 4.0 → 정정 → 5.0).

## 완료 보고 (Done)

채움: 컨트롤러 2026-10-17 15:0x. **커밋 df8445e**(feature/1a-p07-seed-load, 파일 14, 요청자 지시 2026-10-17 21:0x "커밋해"). 워크트리 `.claude/worktrees/p07`, 브랜치 `feature/1a-p07-seed-load`(바탕 01ff0a9), 미커밋 13(새 코드 · 시험 10 · package.json · 장부 보고 3). 원격 없음(H15)이라 PR 없음.

| 흐름 | 때 | 결과 |
|---|---|---|
| 구현 impl-p07a(Opus · high) | 13:4x | DONE_WITH_CONCERNS — 새 10 + package.json `seed:load` 한 줄, 단위 221 · 통합 51 + 1 건너뜀, 다르게 한 것 열하나, 우려 둘(`task-p07a-report.md`) |
| 검토 rev-p07a(Opus · xhigh) | 14:0x | Changes requested(C 0 · I 1 · M 6) — I-1 적재 중 DB 오류가 종료 1 · 칸 내용 출력, M 접속 안 닫음 · 단가 행 조용히 빠짐 · 칸 종류 건너뜀 · kept · orphan 이름 · 다시 하기 단언 · answer 열(`review-p07a.md`) |
| fix 1 | 14:1x | 모두 ADDRESSED — 종료 2 · 오류 이름 · 코드만, 접속 닫음, `price-row-invalid` 전체 거부(컨트롤러 판정) + 조합 검사 건너뜀, 칸 종류 오류, `loadSeedWithKeys` · `kept` · `orphan` 줄(20 넘으면 외 n), 시험 둘, `--areas` 공백. 통합 54 + 1(`task-p07a-fix1-report.md`) |
| 재검토 rev-p07a | 14:5x | **Approved**(C 0 · I 0 · M 4) — 가짜 접속 재현 종료 2 · 칸 내용 0, 선택 둘 받음(`review-p07a-2.md`) |
| fix 2(Minor 라운드, 재검토 없음 C52) | 15:0x | N-1 `SeedLoadInvariantError`(칸 키 · 파일 이름만, 메시지 그대로 · 나머지 '적재 중 오류(이름 코드)' · 종료 2) · N-2 · N-3 `price-row-invalid` 글('SQL 편집기에서 바로잡는다 · 그때까지 조합 검사 건너뜀') · N-4 sentence 단언. 통합 55 + 1. 컨트롤러 확인 biome 0 · build · 221 · 55 + 1 · deps 0 · spec-trace missing-test 51 · bundle 0 · 비밀값 꼴 없음 · `seed:load --root /nonexistent-root` 종료 2 · 접속 문자열 출력 0(`task-p07a-fix2-report.md`) |

실제 바뀐 파일(계획과 다른 것은 ※):

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/seed/version-pick.ts` | 신규 | `pickVersion` · `pickByCell` · `latestRevision` · `cellGroupOf` · `VERSION_RULES` · `planVersionRows`. ※ `AREAS` · `isLevel` · `isUnitOf` 도 가져옴(규격 행 칸 키 확인) |
| `src/core/seed/settings-compare.ts` | 신규 | `compareSettings` · `SettingsIncompleteError` · `SEED_LOAD_SOURCE` · `DEV_OVERRIDE_KEYS`. ※ `values` 에 시드에 없는 DB 키(orphans)의 값도 넣음 |
| `src/server/seed/load.ts` | 신규 | `loadSeed`(= `loadSeedWithKeys` 한 줄 감싸기 ※ M-4) · 판 규칙 · 설정 견주기 · 한 트랜잭션 · 자문 잠금 `SEED_LOAD_LOCK_KEY` · `INSERT_CHUNK_ROWS` 200 · `VALIDATION_ERROR_LINES` 20 · `SeedLoadInvariantError` ※ fix 2 · `answerOf` · `buildIncoming` 내보냄(시험용) ※. 검증 거부는 오류 앞 20줄 + 요약 ※, 조합 위반 key `ai.model.<keyBase>` ※ |
| `src/server/seed/read.ts` | 신규 | `currentSeedRevision` · `readLessonsOfUnit`(빈 변형 · tori_story 는 SQL 에서 뺌) · `readLevelSpec` · `readUnitSpec` · `readLevelTestForm` · `readPlacementForm` |
| `scripts/seed-load.ts` | 신규 | `pnpm seed:load`(`parseArgs` · `summaryLine` · `runSeedLoad(args, deps)` ※ deps `{ files, databaseUrl, now, openDb? }` · `main().then` — tsx 가 CJS 로 돌려 최상위 await 못 씀). 접속 확인 `select 1` ※, 오류 갈래 둘(불변식은 메시지 그대로 · 나머지 이름 코드) · 종료 0 · 1 · 2 |
| `tests/fixtures/seed/loadable.ts` | 신규 | 시험용 적재 시드(칸 462, 작은 틀 정규 3 · 보강 1) · `withSetting` · `withCellVersion` · `cellValueOf` · `LOADABLE_THROUGH` ※ |
| `tests/unit/version-pick.test.ts` · `settings-compare.test.ts` | 신규 | 13 · 8 시험 |
| `tests/integration/seed-load.test.ts` · `seed-version.test.ts` | 신규 | 16(1 건너뜀 — 저장소 seed/ 규격만 적재는 P6a 합친 뒤) · 7 시험. ※ 시험 이름 '수업 4 · 5' 는 작은 틀이라 단원 1 의 다지기 3 · 보강 1 로 대응(머리 주석). ※ AC-8i 는 두 길(빈 DB 거부 · 지킨 고급 키 불일치 거부) |
| `package.json` | 수정(공용 1) | `"seed:load": "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/seed-load.ts"` |

증명: AC-17a 단위 4 · 통합 6, AC-17b 3, AC-7e 단위 1 · 통합 1, AC-7g 단위 1 · 통합 1, AC-8i 1(이름 글자 그대로, spec-trace missing-test 54 → 51). 적재 보고 `--json` version 1. 한 시계 정적 검사 통과(src/server/seed 에 `Date.now()` · 인자 없는 `new Date()` 없음, 시험은 고정 시각 `2026-10-17T03:00:00Z`).

남긴 것: (1) 1-나 몫 — seed/reviews → seed_reports(적재는 읽지 않음), 토리 이야기 title · generation 필수화(지금은 없으면 `story-field-missing` 거부), 옛 개정 행의 정정 자리. (2) 저장소 `seed/` 규격만 적재 시험(건너뜀 1)은 P6a 를 합친 뒤 돈다. (3) 운영 범위 적재 시간(위험 2)은 재지 않음 — 시험용 시드 462칸 적재 15시험 5.5초뿐. (4) `finally { await handle.close() }` 가 던지면 결과를 덮어 '예상 밖 오류' 종료 2(넣은 것은 그대로, postgres.js end 는 거의 안 던짐) — ledger-open, P7b 덤. (5) C68 완료 판정 변경(규격만 적재 + 프리뷰 접근 코드 제출)은 P7b [사람] 단계(H3 뒤)에서 본다. (6) P7b 에 넘긴 것 — 명령 · 종료 코드 · 첫 줄 꼴 · dev-load 입력(`--complete-through <n> --areas reading,writing,speaking`, 수업 전 `--reference-only`) · 접속은 `MIGRATION_DATABASE_URL` 하나 · check-ids 허용 목록 후보 7 · 장부(P8 inserted → seed/manifest, P10~12 `read.ts` · `currentSeedRevision()`).
