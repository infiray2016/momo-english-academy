# 구현 보고: P7a 적재 · 판 규칙(impl-p07a · Opus · high)

상태: DONE_WITH_CONCERNS(우려는 아래 '검토자에게 알릴 것' 1 · 2 — 시험 이름의 '수업 4 · 5' 대응, spec-trace 시작 수가 브리프와 다름)
자리: 워크트리 `.claude/worktrees/p07`, 브랜치 `feature/1a-p07-seed-load`, 바탕 01ff0a9. 커밋 없음 · 하위 에이전트 없음 · 실제 DB 접속 없음(embedded-postgres 만).

## 바뀐 파일

| 파일 | 신규 / 수정 | 줄 · 핵심 |
|---|---|---|
| `src/core/seed/version-pick.ts` | 신규 259줄 | `compareVersions` · `formatVersion` · `pickVersion`(34) · `pickByCell`(47) · `latestRevision` · `SEED_TABLES` · `levelSpecCell` · `unitSpecCell` · `cellGroupOf`(121) · `VERSION_RULES`(140) · `planVersionRows`(177) |
| `src/core/seed/settings-compare.ts` | 신규 177줄 | `SEED_LOAD_SOURCE = "seed_load"`(14) · `COMPARED_CHANGE_VIA` · `INSERT_ONLY_CHANGE_VIA` · `DEV_OVERRIDE_KEYS` · `compareSettings`(74) · `sameSettingValue` · `SettingsIncompleteError`(162) · `numberReader`(169) |
| `src/server/seed/load.ts` | 신규 1098줄(Biome 줄 바꿈) | `SEED_LOAD_LOCK_KEY = "momo.seed-load"`(78) · `INSERT_CHUNK_ROWS = 200` · `VALIDATION_ERROR_LINES = 20` · `LoadReport`(126) · `buildIncoming`(story-field-missing 346) · `readVersionRows` · `settingsChecks`(664, 조합 · 관계) · 자문 잠금(888) · `loadSeed`(814) |
| `src/server/seed/read.ts` | 신규 180줄 | `currentSeedRevision`(25) · `readLessonsOfUnit`(58) · `readLevelSpec`(92) · `readUnitSpec`(110) · `readLevelTestForm`(131) · `readPlacementForm`(154) |
| `scripts/seed-load.ts` | 신규 274줄 | `parseArgs`(42) · `summaryLine`(128) · `runSeedLoad(args, deps)`(196) · 직접 실행 때만 `main` |
| `tests/fixtures/seed/loadable.ts` | 신규 274줄 | `LOADABLE_THROUGH` · `loadableSettings`(51) · `loadableSeed`(68) · `withSetting` · `withoutSetting` · `cellValueOf` · `withCellVersion`(164) · `withLevelSpecVersion` · `withUnitSpecVersion` · `filesOf` · `insertProfileSession` |
| `tests/unit/version-pick.test.ts` | 신규 | 13 시험 |
| `tests/unit/settings-compare.test.ts` | 신규 | 8 시험 |
| `tests/integration/seed-load.test.ts` | 신규 | 15 시험(1 건너뜀) |
| `tests/integration/seed-version.test.ts` | 신규 | 7 시험 |
| `package.json` | 수정(공용 변경 1, 23줄) | `"seed:load": "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/seed-load.ts"` 글자 그대로 |

P3a 스키마 · 마이그레이션, P4 `src/core/seed/*` 기존 파일 · `builders.ts`, P9a 파일은 고치지 않았다. 새 마이그레이션 없음.

## 시험 수

| 묶음 | 시작 | 지금 |
|---|---|---|
| 단위 `pnpm test` | 200 | 221(+21) |
| 통합 `pnpm test:int` | 30 | 52(51 통과 · 1 건너뜀, +22) |
| spec-trace missing-test | 54(이 바탕에서 셈) | 51(−3: AC-17a · AC-17b · AC-7e) |

증명 표의 시험 이름은 글자 그대로 넣었다(AC-17a 단위 4 · 통합 6, AC-17b 3, AC-7e 단위 1 · 통합 1, AC-7g 단위 1 · 통합 1, AC-8i 1, 5절 줄 · 명령 줄 모두). 이름 없는 보조 시험 넷(판 견주기 · 규칙 이름 · 칸마다 따로 보고 · 시험용 자료 고정)을 더했다.

## 작업 7 명령과 출력(첫 줄)

```
pnpm install --frozen-lockfile        → Done in 460ms using pnpm v10.34.7 (exit 0)
pnpm exec biome ci .                  → Checked 87 files … No fixes applied. (exit 0)
pnpm build                            → exit 0 (┌ ○ / · └ ○ /_not-found)
pnpm test                             → Test Files 22 passed (22) · Tests 221 passed (221)
pnpm test:int                         → Test Files 6 passed (6) · Tests 51 passed | 1 skipped (52)
pnpm check:deps                       → ✔ no dependency violations found (46 modules, 132 dependencies cruised)
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec
                                      → spec-trace: 15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 92 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 51 (exit 0)
pnpm check:bundle                     → check-bundle: 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 6 · 대조한 값 0 · 위반 0 (exit 0)
grep -rn "sk-ant-\|postgres://\|postgresql://" src tests scripts
                                      → 이 작업 파일 0건(나온 세 줄은 바탕의 check-bundle.test.ts:58 주석 · global-setup.ts:57 · check-bundle.ts:28)
```

`tsc --noEmit` 은 바탕에 있던 `src/app/layout.tsx` 의 `LayoutProps`(Next 생성 형) 한 줄만 내고 이 작업 파일 오류는 0 이다(`pnpm build` 는 통과).

## 작업 6 실기 출력

(가) 시험 안(`적재 명령: 첫 줄 요약 꼴과 --json …`)에서 `tests/.tmp/seed-load-<난수>/` 에 쓴 loadableSeed 나무로 `runSeedLoad`:

```
[seed-load 실기] --dry-run: seed-load: 미리 돌림 · 칸 넣음 462 · 건너뜀 0 · 낱말 넣음 280 고침 0 · 그림 넣음 182 고침 0 · 단가 넣음 6 · 설정 넣음 100 고침 0 지킴 0 · 이력 0 · 최신 개정 0→1 · 위반 0
[seed-load 실기] 실제: seed-load: 넣음 · 칸 넣음 462 · 건너뜀 0 · 낱말 넣음 280 고침 0 · 그림 넣음 182 고침 0 · 단가 넣음 6 · 설정 넣음 100 고침 0 지킴 0 · 이력 0 · 최신 개정 0→1 · 위반 0
[seed-load 실기] 다시 한 번: seed-load: 넣음 · 칸 넣음 0 · 건너뜀 462 · 낱말 넣음 0 고침 0 · 그림 넣음 0 고침 0 · 단가 넣음 0 · 설정 넣음 0 고침 0 지킴 0 · 이력 0 · 최신 개정 1→1 · 위반 0
```

칸 462 = 내용 칸 172 + 단계 규격 48 + 단원 규격 242. 미리 돌림 뒤 모든 표 행 수 0 을 시험이 확인한다.

(나) 터미널(셸 환경에 `MIGRATION_DATABASE_URL` · `DATABASE_URL` 없음 0건, 워크트리에 `.env.local` 없음 확인 뒤):

```
$ pnpm seed:load --root tests/.tmp/seed-load-manual
.env.local not found. Continuing without it.
seed-load: MIGRATION_DATABASE_URL 이 없다
 ELIFECYCLE  Command failed with exit code 2.          (exit=2)
$ node --conditions=react-server --import tsx scripts/seed-load.ts --root tests/.tmp/seed-load-manual
seed-load: MIGRATION_DATABASE_URL 이 없다                (exit=2)
$ node --import tsx scripts/seed-load.ts --root …       (조건 플래그 없음)
…/server-only/index.js:1 throw new Error(               (server-only 가 던짐 — 플래그가 필요함을 확인)
$ pnpm seed:load --reference-only
seed-load: --reference-only 는 --complete-through 와 함께만 쓴다   (exit=2)
```

접속 문자열 · 값은 어느 출력에도 없다. 같은 확인을 통합 시험 하나가 `spawnSync(node --conditions=react-server --import tsx scripts/seed-load.ts)`(MIGRATION_DATABASE_URL · DATABASE_URL 를 뺀 환경, `.env.local` 플래그 없이)로 고정한다. 손으로 쓴 `tests/.tmp/seed-load-manual` 은 지웠다.

'규격만 적재' 저장소 시험(`5절 적재: 저장소 seed/ 규격 파일을 규격만 적재로 넣을 수 있다(seed/ 가 있을 때만)`)은 바탕에 `seed/`(P6a)가 없어 건너뜀이다(`it.skipIf`).

## 계획과 다르게 한 것

1. 시험 이름의 '수업 4 · 5'(AC-17a 통합). 시험용 시드는 작은 틀(정규 3 · 보강 1)이라 수업 번호 4 · 5 가 없다. 이름은 글자 그대로 두고, 안에서 '수업 4' 는 단원 1 의 다지기 수업 3, '수업 5' 는 단원 1 의 보강 수업 1 로 두었다(`seed-version.test.ts` 머리 주석). 큰 틀(`frame: "default"`)의 miniSeed 는 검증 오류 124 칸(level-test-forms-overlap 등)이라 적재가 거부된다.
2. 판 고르기 모듈의 가져오기. plan 은 `parseCellKey` · `bandInfo` · 형만 적었는데, 규격 행 칸 키(`level-spec:` · `unit-spec:`)를 `cellGroupOf` 에서 확인하려고 `AREAS` · `isLevel` · `isUnitOf` 도 가져온다(같은 structure 모듈, 의존 규칙 0).
3. 보고 꼴의 빈 값. `validation` 은 완전성 범위가 1~12 가 아니어서 검증 전에 거부하면 `null`, `latestRevision` 은 DB 를 읽기 전(그 경우와 검증 거부)에 `null` 이다(명령 첫 줄은 `최신 개정 -→-`). 거부 보고의 `counts` 는 0 이고(넣은 것이 없음), 미리 돌림은 넣을 수를 낸다. 거부 때 `latestRevision` 은 `{ before: G, after: G }`.
4. 검증 거부의 위반 줄. `rule: "validate"` 로 오류 앞 20 줄(`VALIDATION_ERROR_LINES`, 기술 값) + 잘린 줄 수 + '빈 칸 · 풀이 검사 안 됨 · 사람 확인' 한 줄. 명령은 그 뒤에 seed-validate 요약 줄과 `다시 볼 명령: pnpm seed:validate --complete-through <n> --areas …` 를 낸다.
5. 조합 위반의 `key` 는 `ai.model.<keyBase>`, 관계 위반의 `key` 는 구간(쓰기 단계 틀이면 `table: level_specs`). 완전성 범위 · 학습일 설정 · 관계 표 키가 없거나 꼴이 틀리면 `settings-incomplete`.
6. `compareSettings` 의 `values` 에 시드에 없는 DB 키(orphans)의 값도 넣었다(적재 뒤 DB 기본 행의 값 전체). 시드에서 범위가 바뀐 키는 고치지 않고 DB 값을 둔다.
7. 명령의 접속 실패 판정. 적재 전에 `select 1` 한 번으로 접속을 보고, 실패하면 오류 이름 · 코드만 낸다(메시지에 주소가 들 수 있어서). 적재 중의 다른 DB 오류는 그대로 던진다(트랜잭션은 되돌아간다).
8. `runSeedLoad(args, deps)` 의 `deps` 는 `{ files, databaseUrl, now, openDb? }` 꼴(시험이 시험 DB 주소를 넘긴다). 직접 실행 때 시각은 `@/server/clock` 의 `now`. tsx 가 이 꾸러미의 .ts 를 CJS 로 돌려 최상위 await 를 못 써 `main().then(…)` 꼴이다.
9. AC-8i 통합은 두 길을 본다 — (가) 빈 DB 에 끔과 맞지 않는 시드 → 거부 · 모든 표 0 행, (나) 적재 뒤 고급 키를 DB 에서 바꾼 값(지킨 값)이 맞지 않으면 바른 시드라도 거부 · settings 그대로. ai.* 는 '고급'이라 처음 넣은 뒤로는 시드 값이 DB 에 닿지 않기 때문이다.
10. '5절 설정값 시드: DB 의 unit.max_remedial …' 은 4-6 구간으로 본다(시험용 시드에 칸이 없는 구간). 첫 적재에서 seed.remedial_per_unit.4-6 · unit.max_remedial.4-6 을 함께 올리고, 새 시드가 둘을 함께 내리면 고급인 unit.max_remedial 은 DB 값을 지켜 frame-remedial 로 거부된다.
11. 시험용 자료에 `cellValueOf` · `LOADABLE_THROUGH` 를 더 내보냈다(시험이 칸 객체 · 범위를 읽는다). `answerOf` 를 load.ts 에서 내보낸다(배치 정답 칸, 제안 꼴).

## 남긴 것

- 1-나 몫(plan 정할 것 마 · 타 · 파): seed/reviews → seed_reports(적재는 읽지 않음), 토리 이야기 title · generation 필수화(지금은 없으면 `story-field-missing` 거부, 시험용 시드에는 둘 다 있음), 옛 개정 행의 정정을 싣는 자리.
- 저장소 seed/ 규격만 적재 시험은 P6a 합친 뒤 돈다.
- 첫 운영 범위의 적재 시간(plan 위험 2)은 재지 않았다. 잰 것은 시험용 시드(칸 462)로 적재를 여러 번 돌리는 `seed-load.test.ts` 15 시험이 5.5초라는 것뿐이다.

## 검토자에게 알릴 것

1. '수업 4 · 5' 대응(다르게 한 것 1). 다른 칸 둘이면 AC 의 성질은 그대로 증명되지만, 이름과 칸 번호가 다르다.
2. 브리프는 spec-trace 를 '52 → 49' 로 적었는데, 이 바탕(01ff0a9)에서 시작 수가 54 였고 지금 51 이다(−3 은 같다).
3. jsonb 왕복(plan 위험 3): 'AC-17b 같은 판 두 번'이 모든 칸 종류(수업 · 이야기 · 단계 평가 문항 · 회화 평가 카드 장 · 배치 문항 · 단계 · 단원 규격)를 지나며 건너뜀 수 = 처음 넣은 수(462)를 확인한다.
4. 단원 규격 해시는 `{ area, level, unit, learningElement, topic, words }`(판 뺀 시드 객체와 같은 칸)로 시드 쪽 · DB 쪽을 같은 꼴로 센다. 단계 규격은 `spec` 열(행 전체)을 그대로 센다.
5. `readLessonsOfUnit` 은 `tori_story` · 변형이 빈 행을 SQL 에서 뺀다. 칸 고르기는 `pickByCell` 하나다.
6. 시험의 '시각'은 고정 값(`2026-10-17T03:00:00Z`)을 `now` 로 넘긴다. src/server/seed 에 `Date.now()` · 인자 없는 `new Date()` 없음(한 시계 정적 검사 통과).

## P7b 에 넘길 것

- 명령 `pnpm seed:load`(package.json 23줄)와 종료 코드 0 · 1 · 2, 첫 줄 꼴(`seed-load: <넣음|미리 돌림|거부> · …`), `--json` version 1. dev-load 작업 입력은 `--complete-through <n> --areas reading,writing,speaking`, 수업 시드 전에는 `--reference-only --complete-through <n>`(`--areas` 와 함께 못 씀).
- 접속은 `MIGRATION_DATABASE_URL` 하나만 읽는다(`DATABASE_URL` 은 읽지 않는다). 작업 env 로 넘긴다.
- check-ids 허용 목록 후보(새 상수 · 기술 값): `INSERT_CHUNK_ROWS` 200 · `VALIDATION_ERROR_LINES` 20 · `PRICE_DIGITS` 4 · `CONNECTIONS` 1 · `STORY_TOPIC_VARIANT` 1 · `TALK_SHEET_ITEM_TYPE` · `SEED_LOAD_LOCK_KEY`. 시험의 고정 값: `NOW`, 새 적용일 `2026-11-01`, 낱말 `tori-extra`.
- 장부: P8 은 적재 보고 `inserted` 를 seed/manifest 판 기록에 옮긴다. P10~P12 는 `src/server/seed/read.ts` 로 읽고 시작 개정에 `currentSeedRevision()` 을 남긴다.
