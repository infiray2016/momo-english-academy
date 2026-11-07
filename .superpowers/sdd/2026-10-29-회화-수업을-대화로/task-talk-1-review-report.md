# 검토 보고: 회화 plan 묶음 1 · 2(설정 키 · p13d 정본 사본 · seed:load --partial)

검토자 rev-talk-1(Opus), 2026-10-30 08시대, 가벼운 루프의 범위 한정 검토입니다. 코드는 고치지 않았습니다. 파일 경로는 따로 적지 않으면 워크트리 `.claude/worktrees/p13d` 기준입니다.

**판정: Approved.** Critical 0 · Important 0 · Minor 3 입니다. Minor 는 컨트롤러가 직접 고치는 몫입니다.

## 1. 설계 준수

| 판정할 것 | 결과 | 근거 |
|---|---|---|
| (1) 24행의 키 · 범위 · 기본값 · 바꾸는 곳 | ✅ | `seed/settings.json:87-110` 의 24행이 정본 `specs/09-설정값.md:75-89` 및 plan 109줄과 글자 그대로 같습니다. 범위는 모두 household(집 전체)이고, 바꾸는 곳은 prep_words 넷 · required_max_ratio 가 seed, floor_after_stuck 가 decision-first, 나머지가 advanced 입니다. talk.valid_turns_ratio 는 고친 82줄대로 advanced 입니다. git diff 로 보면 이 묶음의 몫은 24행 더하기와 83줄 한 줄 바꾸기뿐입니다. |
| (1) 기본값 잠정 표시 | ✅ | settings.json 행에는 잠정을 적을 칸이 없습니다. 잠정은 정본 뜻 칸(75~89줄 모두 '잠정')과 `tests/fixtures/settings.ts:151` 주석에 있습니다. |
| (1) talk.dontknow_max 바꾸는 곳 | ✅ | `seed/settings.json:83` 이 advanced 에서 decision-first 로 바뀌었고 값 3 은 그대로입니다. 정본 `specs/09-설정값.md:72` 의 '결정 기록 먼저'와 맞습니다. DB 에는 바꾸는 곳 열이 없고 적재 비교(`src/core/seed/settings-compare.ts:69`)만 이 칸을 읽으므로, 개발 DB 행을 따로 고칠 일은 없습니다. |
| (1) 시험 고정값 | ✅ | `tests/fixtures/settings.ts:152-175` 의 24행이 settings.json 과 범위 · 값이 같습니다. check:ids 의 fixture-setting 도 0 입니다. |
| (2) 사본 = 정본 | ✅ | 본 저장소 `specs/` 와 사본을 `diff -r` 로 견주었습니다. 다른 곳은 09 사본 70 · 75줄 두 줄뿐이고, 나머지 열네 파일(열세 장 · README · 단일 spec 파일)은 같습니다. 복사 전 사본 15 파일은 스크래치패드 `p13d-specs-before/` 에 있습니다. |
| (2) 사본 전용 줄 표시 | ✅ | `specs/09-설정값.md:70`(talk.practice_rounds) · `:75`(talk.reask_sentence_every_turns) 의 뜻 칸에 굵은 글씨로 '**p13d 사본 전용 줄**'과 지울 때(묶음 12, 정한 것 14) · '정본에 옮기지 않는다'가 적혀 있어 분명합니다. |
| (3) check:ids(ci.yml:42 와 같은 인자) | ✅ | 직접 돌려 종료 0 을 확인했습니다. 결과 줄은 '12절 키 253 · 시드 키 249 · 대조 안 함 13 · spec-setting-missing 0 · seed-setting-unknown 0 · setting-scope 0 · setting-change-via 0 · setting-default 0 · code-setting-unknown 0 · table-mismatch 0 · max-corrections 0 · fixture-setting 0 · design-number 47(상한 49) · design-color 0'입니다. design-number 47 은 묶음 전과 같아서, 새 코드가 설계 숫자를 박지 않았습니다. |
| (3) spec:trace | ✅ | `--fail-on unknown-ac` 와 CI 인자(`unknown-ac,plan-ac-not-in-spec`) 둘 다 종료 0 입니다. 남은 것은 P12 몫의 missing-test 뿐입니다. |
| (3) seed:validate | ✅ | 종료 0 입니다. '칸 925 · 통과 922 · 실패 0 · 빈 칸 3967 · 풀이 검사 안 됨 3 · 사람 확인 0 · 경고 17 · 규격 파일 오류 0'이고, 구현 보고와 같습니다. |
| (4) --reference-only 와 함께 거부 | ✅ | 명령은 `scripts/seed-load.ts:133-138`, 작업 파일은 `.github/workflows/dev-load.yml:67-70` 에서 거부합니다. |
| (4) 완전성 빈 칸만 보고로 | ✅ | `src/server/seed/load.ts:816-822` 의 `loadValidationCode` 는 보고의 `empty` 배열만 비우고 `exitCodeOf` 를 그대로 부릅니다. `exitCodeOf`(`src/core/seed/validate.ts:1311-1318`)는 요약 수가 아니라 `empty` 배열을 보므로 이 방식이 맞습니다. 오류 · 사람 확인 남음 · 완전성 모드의 풀이 검사 안 됨은 그대로 1 입니다. |
| (4) 판 규칙은 그대로 막음 | ✅ | 판 규칙 검사는 검증 뒤 트랜잭션 안에서 그대로 돌고, 검증 뒤 단계는 `through` 를 다시 쓰지 않습니다(`load.ts:896` 뒤에는 `options.completeThrough` 덮어쓰기 하나뿐입니다). |
| (4) 우려 1: `--partial --complete-through N` 덮어쓰기 | ✅ 결함 아님 | 정본 AC-7g(`specs/11-요구사항과-수용-기준.md:107`)가 '개발용 DB 적재 작업은 … 입력한 seed.complete_through_level 로 설정값을 덮어 넣는다'고 정했으므로 정본대로의 동작입니다. dev-load 의 일부 받기 갈래는 늘 `--complete-through "$THROUGH"` 를 넘기고(`dev-load.yml:86`) plan 차례 5 의 컨트롤러 명령도 `--complete-through 1 --areas talk --partial` 이라, 막으면 두 길이 모두 깨집니다. 운영(main.yml)에는 `--partial` 이 없습니다. 다만 빈 칸이 있는 단계를 N 으로 주면 개발 DB 의 시작 단계 화면 · 배치 상한(`src/server/profile/index.ts:229` · `src/server/placement/index.ts:445`)이 N 까지 열리므로, 안내 한 줄은 두는 편이 낫습니다(Minor 3). |
| (4) dev-load 입력은 단계 env 로만 | ✅ | `dev-load.yml:64-65` · `:81` 에서 `PARTIAL: ${{ inputs.partial }}` 를 단계 env 로만 받고, run 글에는 `${{ }}` 를 끼우지 않습니다. 작업 수준 env(38~41줄)는 세 줄 그대로입니다. |
| (4) 우려 3: `--json` 보고의 partial 칸 | ✅ 영향 없음 | 보고를 엄격한 Zod 꼴로 읽는 곳이 없습니다. `scripts/dev-db.ts:487-515` 는 `loadSeed` 와 `summaryLine` 만 쓰고, 기존 통합 시험(`tests/integration/seed-load.test.ts:896-905`)은 `toMatchObject` 라 새 칸에 깨지지 않습니다. P8 확인 거리로 남길 것은 없습니다. |
| (5) 시험이 AC-7a 일부 받기 갈래를 단언하는지 | ✅ · ⚠️ | 통합 시험 둘(`tests/integration/seed-load.test.ts:395-449` · `:1121-1153`)이 거부(일부 받기 아님) → 넣음(일부 받기) → 빈 칸 수 보존 → 검증 오류 거부 · 행 수 그대로 → 판 규칙(version-content-changed) 거부 → 명령 인자 거부 · 사람용 한 줄 · `--json` 칸을 실제로 단언합니다. ⚠️ 통합 시험은 이 Mac 에서 돌지 않아 diff 만으로는 통과를 확인할 수 없습니다. 첫 시험의 전제는 스크래치패드 스크립트(`rev-talk1/partial-check.ts`, DB 없이 순수 함수만)로 확인했습니다: loadableSeed 를 6단계까지 보면 빈 칸 500 · 오류 0 · 풀이 검사 안 됨 0 · 사람 확인 0 이고, `exitCodeOf` 는 1, 빈 칸을 뺀 판정은 0 입니다. |

## 2. 잘한 점

- **종료 코드의 뜻을 한 곳에 두었습니다.** `loadValidationCode` 가 새 판정 규칙을 만들지 않고 `exitCodeOf` 에 빈 칸 배열만 비워 넘기므로, 검증 모드 표(plan-p04c)가 바뀌어도 적재와 검증의 판정이 갈라지지 않습니다.
- **거부를 두 겹으로 막았습니다.** `--partial` 과 `--reference-only` 를 명령 인자와 작업 파일 양쪽에서 거부해, 작업 파일을 우회해 명령을 직접 부르는 길도 막힙니다.
- **통합 시험이 '넣지 않음'을 행 수로 단언합니다.** 거부 뒤 `rowCounts()` 가 앞과 같은지 보아, 보고만 거부하고 일부를 넣는 결함을 잡을 수 있습니다. 일부 받기에서도 판 규칙이 그대로임을 같은 시험이 보입니다.
- **설정 파일을 더하기만 했습니다.** git diff 에서 이 묶음의 몫은 24행과 83줄 하나이고, 없앤 키 두 행은 정한 것 14 대로 묶음 12 까지 남겼습니다.
- **위험 3 의 순서를 지켰습니다.** 정본 82줄 꼴 고침 → 키 적재 → 전용 줄 둘 순서로 복사해, 사본을 덮은 뒤에도 check:ids 가 0 입니다.

## 3. 지적

Critical · Important 는 없습니다.

### Minor

**M-1. 일부 받기가 거부될 때 '다시 볼 명령'이 완전성 모드 검증을 권합니다.**
- 자리: `scripts/seed-load.ts:203-209`.
- 왜: `--partial` 로 돌다가 검증 오류로 거부되면, 출력이 `pnpm seed:validate --complete-through N --areas …` 를 권합니다. 이 명령은 빈 칸까지 실패로 세므로, 일부 받기에서 막지 않은 빈 칸이 오류와 섞여 보입니다. 같은 출력의 '일부 받기(--partial): … 보고만 했다' 줄과도 어긋납니다.
- 어떻게: `report.partial` 이면 PR 모드 명령(`pnpm seed:validate --areas …`)을 권하거나, 끝에 '빈 칸은 일부 받기에서 막지 않는다'를 붙입니다.

**M-2. 새 판정 코드가 로컬에서 실행된 시험이 없고, 일부 받기에서도 막는 두 갈래는 어느 시험도 단언하지 않습니다.**
- 자리: `src/server/seed/load.ts:816-822`(`loadValidationCode`) · `scripts/seed-load.ts:133-138`(인자 거부) · `load.ts:104-108`(주석의 주장).
- 왜: 새 코드는 통합 시험에서만 단언되고, 통합 시험은 11-01 뒤 CI 에서 처음 돕니다. 단위 시험 둘 가운데 `tests/unit/seed-validate-cli.test.ts:267` 은 같은 파일 58 · 73줄 시험(PR 모드 빈 칸 0 · 실패 칸 1)과 거의 같은 기존 동작을 다시 보며, 새 코드를 지나지 않습니다. 또 '풀이 검사 안 됨 · 사람 확인 남음은 일부 받기에서도 막는다'는 구현 보고 '고른 것 1'의 주장은 어떤 시험도 단언하지 않습니다.
- 어떻게: `tests/unit` 은 이미 `@/server/` 를 부르므로, `loadValidationCode` 의 네 갈래(빈 칸만 → 0, unchecked → 1, pendingHuman → 1, errors → 1)와 seed-load `parseArgs` 의 거부를 단위 시험 하나로 둡니다. 그러면 11-01 전에도 로컬 `pnpm test` 가 새 판정을 지킵니다. 267줄 시험은 dev-load 검증 갈래의 회귀 지킴으로 남겨도 됩니다.

**M-3. `--partial --complete-through N` 이 개발 DB 의 완전성 끝을 N 으로 덮는다는 점이 작업 파일 입력 설명에 없습니다.**
- 자리: `.github/workflows/dev-load.yml:23`(입력 partial 설명) · `scripts/seed-load.ts:181-187`(일부 받기 출력 줄).
- 왜: 동작은 AC-7g 대로라 결함이 아닙니다(1절 표). 그러나 일부 받기에서는 N 단계까지 빈 칸이 있어도 넣으므로, N 을 크게 주면 개발 DB 의 시작 단계 화면 · 배치 상한이 빈 단계까지 열립니다.
- 어떻게: 입력 설명에 'complete_through 는 그대로 개발 DB 에 덮어 넣는다(AC-7g). 빈 칸 없는 마지막 단계를 넣는다'를 더하거나, 일부 받기 출력 줄에 덮어쓴 값을 함께 적습니다.

## 4. 판정

**Approved.** 판정할 것 (1)~(5)는 모두 충족합니다. 관문 셋(check:ids CI 인자 · spec:trace · seed:validate)은 검토자가 직접 돌려 모두 종료 0 이었습니다. 우려 1 은 정본 AC-7g 대로의 동작이라 막지 않고, 우려 3 은 읽는 쪽이 없어 닫습니다. 남은 것은 Minor 셋과, 통합 시험 둘의 실제 실행(11-01 뒤 CI, 차례 12)입니다. `tests/unit/ci-workflows.test.ts` 에 partial 을 더하자는 구현자 요청은 허용 밖 파일이라 이 검토 범위 밖입니다.
