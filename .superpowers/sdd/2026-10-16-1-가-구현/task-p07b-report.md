# 구현 보고: P7b CI 작업 셋 · 식별자 대조 · 활동 유지 명령(impl-p07b · Opus · high)

상태: **DONE**(처음 보고는 DONE_WITH_CONCERNS — ci.yml 을 브리프대로 두었다가, 컨트롤러 답 'plan 대로 더해라'를 받고 check-ids 작업을 더했다)
워크트리 `.claude/worktrees/p07`, 가지 `feature/1a-p07b-ci-ids`(df8445e 위), 커밋하지 않음(H14).
plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p07b-CI-작업-식별자-대조.md`(approved, C68) 작업 1~4 + 덤.

## 바뀐 파일

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `scripts/check-ids.ts` | 신규 | 식별자 대조 명령. 순수 함수 `parseSettingsTable` · `expandSpecKeys` · `parseSpecDefault` · `parseTableNames` · `schemaTableNames` · `collectCodeKeys` · `settingNumbers` · `collectDesignNumbers` · `checkIds`, 명령 `parseArgs` · `runCheckIds(args, io)`, 상수 `RULES` · `SEED_RULES` · `CI_FAIL_ON` · `DESIGN_NUMBER_ALLOWED_NAMES`(PASSAGE_PICTURE_UNTIL_LEVEL) · `DESIGN_NUMBER_EXCLUDED_FILES`(structure.ts) |
| `tests/unit/check-ids.test.ts` | 신규 | 시험 10 |
| `scripts/db-ping.ts` | 신규 | `ping(url)` · `runPing(env)`, `PING_TIMEOUT_SECONDS` 20 · `CLOSE_TIMEOUT_SECONDS` 5(기술 값) |
| `tests/integration/db-ping.test.ts` | 신규 | 시험 3 |
| `.github/workflows/main.yml` | 신규 | plan 파일별 값 3 글자 그대로(plan 의 yaml 토막을 그대로 옮김) |
| `.github/workflows/dev-load.yml` | 신규 | plan 파일별 값 4 글자 그대로 |
| `.github/workflows/keepalive.yml` | 신규 | plan 파일별 값 5 글자 그대로 |
| `tests/unit/ci-workflows.test.ts` | 신규 | 시험 8 |
| `scripts/seed-load.ts:275-278` | 수정(덤) | `finally` 의 `handle.close()` 실패를 삼킨다(`.catch(() => {})`, 접속 확인 쪽 248줄과 같은 꼴) |
| `tests/integration/seed-load.test.ts:1047-1063` | 수정(덤) | 시험 하나 "적재 명령: 적재 뒤 접속 닫기가 실패해도 적재 결과와 종료 코드는 그대로다" |
| **`.github/workflows/ci.yml`(공용)** | 수정 | 끝에 check-ids 작업 하나(plan '요청하는 공용 변경' 2 글자 그대로) |
| **`package.json` scripts(공용)** | 수정 | `"check:ids": "tsx scripts/check-ids.ts"` · `"db:ping": "node --env-file-if-exists=.env.local --import tsx scripts/db-ping.ts"` 두 줄(브리프 허용) |

## 요청하는 공용 변경(컨트롤러)

공용 변경은 셋이고 모두 이 가지에 옮겼다.

1. `package.json` scripts 두 줄(`check:ids` · `db:ping`).
2. **`.github/workflows/ci.yml` 끝에 check-ids 작업**(plan '요청하는 공용 변경' 2 글자 그대로, 컨트롤러 답 2026-10-17 21:3x). 기존 작업은 고치지 않았다. **P5b 가지의 e2e-local 작업과 같은 자리(파일 끝)라 합칠 때 둘 다 남길 것.** 더한 글:

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

   시험 "식별자 대조 ci / check-ids: …"가 건너뜀 없이 이 작업의 `--fail-on` 이 `CI_FAIL_ON`(design-number 뺀 아홉, 같은 차례)과 같은지 본다. 작업 이름 시험은 check-ids 가 ci.yml 에만 있는지 본다.

## 시험 수

| 묶음 | 앞(df8445e) | 뒤 | 더한 것 |
|---|---|---|---|
| 단위 `pnpm test` | 221 | **239** | check-ids 10 · ci-workflows 8 |
| 통합 `pnpm test:int` | 55 + 1 건너뜀 | **59 + 1 건너뜀** | db-ping 3 · seed-load 1(덤) |

덮는 시험 이름(글자 그대로):
- check-ids: "식별자 대조: 12절 표를 읽어 <구간> 넷 · <영역> 넷 · <호출>(ai.max_tokens 일곱, ai.model · effort · thinking 넷)으로 펼친다" · "식별자 대조: 12절 키와 settings.json 키 · 범위 · 바꾸는 곳이 다르면 낸다(profile.start_level.<영역>은 C61 예외)" · "식별자 대조: 기본값 칸(구간 넷 · 목록 · 단계 사전 · 호출별 수 · 끔 → off)을 풀어 settings.json 값과 맞대고 못 푸는 칸은 대조 안 함으로 센다" · "식별자 대조: 코드의 설정 키 글자와 틀 머리가 12절에 없으면 낸다(파일 이름 꼴 글자는 뺀다)" · "식별자 대조: 5절 테이블 표와 스키마 테이블 이름이 다르면 낸다" · "식별자 대조: 쓰기 단계 규격 maxCorrections 와 writing.max_corrections 가 다르면 낸다" · "식별자 대조: TEST_SETTINGS 의 키 · 범위 · 값이 settings.json 과 다르면 낸다" · "식별자 대조: src 의 수 글자가 설정값과 같으면 보고하고 structure.ts · 맨 위 대문자 이름 상수 · 0 · 1 · 2 는 뺀다" · "식별자 대조: --fail-on 규칙에 위반이 있으면 1, 정본을 못 읽거나 모르는 규칙이면 2, seed/ 가 없으면 시드 규칙을 건너뛰고 0" · "식별자 대조: 저장소의 5절 테이블이 스키마와 같고 코드의 설정 키 글자가 모두 12절에 있다"
- ci-workflows: "AC-17b · AC-7a main 작업: …" · "AC-17b main 작업: …" · "AC-7g dev-load: …" · "AC-7g ci / seed-validate: …" · "AC-7g 작업 파일: …" · "10절 활동 유지(keepalive): …" · "작업 이름: …"(plan 증명 표 글자 그대로) + "식별자 대조 ci / check-ids: PR 마다 --fail-on 으로 돌고 그 규칙이 check-ids 의 CI 규칙 목록(design-number 뺀 아홉)과 같다"(plan 표의 ci.yml 행 둘째 단언을 따로 둠)
- db-ping: "10절 활동 유지: db:ping 은 시험용 DB 의 settings 행 수를 읽고 0 으로 끝나며 출력에 접속 문자열이 없다" · "10절 활동 유지: DATABASE_URL 이 없거나 닿지 않으면 2 다" + "10절 활동 유지: settings 표가 없는 DB 는 질의 실패로 2 이고 오류 원문을 내지 않는다"(더함)

## 작업 4 출력(CI 와 같은 순서, 2026-10-17 21:2x, 워크트리)

| 명령 | 종료 | 첫 줄 · 요지 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | Lockfile is up to date · Already up to date |
| `pnpm exec biome ci .` | 0 | Checked 92 files. No fixes applied(경고 0) |
| `pnpm build` | 0 | Compiled successfully · Generating static pages 3/3(첫 돌림은 db-ping 시험의 spawnSync env 타입으로 실패 → `...process.env` 로 고친 뒤 0) |
| `pnpm test` | 0 | Test Files 24 passed · Tests 239 passed |
| `pnpm test:int` | 0 | Test Files 7 passed · Tests 59 passed · 1 skipped |
| `pnpm check:deps` | 0 | no dependency violations found (46 modules, 132 dependencies cruised) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 | 15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 98 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 51(변화 없음) |
| `pnpm check:bundle` | 0 | 파일 10 · static 10 · 화면 파일 0 · 서버 변수 이름 6 · 대조한 값 0 · 위반 0 |
| `pnpm check:ids --fail-on <CI 아홉>` | 0 | 아래 |

비밀값 꼴 grep(접속 문자열의 비밀번호 칸 · `sk-ant-` · JWT 꼴 · `sb_secret_` · `sb_publishable_`)을 바뀐 파일 열하나에 돌려 0건이다. 작업 파일에는 비밀값 이름만 있다.

그 밖의 종료 코드 실기: `DATABASE_URL` 없이 `scripts/db-ping.ts` → `db-ping: DATABASE_URL 이 없다` 종료 2 · `check:ids --fail-on nope` 2 · `check:ids --specs /nonexistent` 2.

## check:ids 출력

메인 저장소 최신 정본(`--specs /Users/hikaru/workspace/momo-english-academy/specs`, feature/1a-p01b-quality-gates), 워크트리 코드, seed/ 없음:

```
check-ids: 12절 키 184 · 시드 키 0 · 코드 키 글자 184 · 테이블 29/29 · 대조 안 함 8 · spec-setting-missing 0 · seed-setting-unknown 0 · setting-scope 0 · setting-change-via 0 · setting-default 0 · code-setting-unknown 0 · table-mismatch 0 · max-corrections 0 · fixture-setting 0 · design-number 0 · 건너뜀(seed/ 없음)
```

종료 0, 막는 규칙 위반 0. 대조 안 함 8 은 `ai.model.<호출>` 넷 · `ai.effort.<호출>` 넷(기본값 칸 '6.1 표'). 12절 키 184 = settings.json 180 + `profile.start_level.<영역>` 넷(C61 예외).
워크트리의 옛 정본(기본값)으로 돌리면 대조 안 함만 12 로 다르고 나머지는 같다.

참고(컨트롤러 작업 5 의 미리 보기): P6a 시드(워크트리 `agent-a6ef72438a158a2f3`, 커밋 f447bc5)를 `--seed-root` 로 주고 메인 정본으로 돌린 결과다. 종료 0이다.

```
check-ids: 12절 키 184 · 시드 키 180 · 코드 키 글자 184 · 테이블 29/29 · 대조 안 함 8 · spec-setting-missing 0 · seed-setting-unknown 0 · setting-scope 0 · setting-change-via 0 · setting-default 0 · code-setting-unknown 0 · table-mismatch 0 · max-corrections 0 · fixture-setting 0 · design-number 17
```

막는 규칙 위반은 0 이다(쓰기 6~12단계 교정 상한 두 출처 같음, TEST_SETTINGS 가 시드와 같음, 기본값 대조 172키 같음). design-number 17 은 보고만이고 모두 설계 숫자가 아닌 것으로 보인다. 진법 · 소수 자리 · 열 크기 같은 수가 설정값과 우연히 같다.
- `src/core/ai/cost.ts:75 · 92`, `src/core/learning-day.ts:61` 10
- `src/db/schema/content.ts:371~387` 10 · 4
- `src/db/schema/operations.ts:129 · 130` 12 · 6
- `src/core/seed/check-cross.ts:500` 3
- `src/core/seed/version-pick.ts:106 · 107` 3 · 4

차수 경계(묶음 plan 작업 10)에서 막음으로 바꾸기 전에 허용 목록이나 이름 붙인 상수로 정리할 몫이다.

## 계획과 다르게 한 것

1. **`--specs <폴더>` 선택지 더함**(브리프 지시). 기본 `specs`. plan 의 `--seed-root` · `--fail-on` · `--json` 은 그대로다.
2. (처음 보고의 'ci.yml 에 더하지 않음'은 컨트롤러 답으로 거둠 — plan 대로 더했다.)
3. `max-corrections`: 사전(`writing.max_corrections`)에 있는 단계만 맞댄다. 쓰기 4~5단계 규격의 `maxCorrections` 1 은 가벼운 확인(`writing.light_check_until_level`)의 값이라 사전에 없어도 위반으로 보지 않는다. plan 의 '다르거나'를 그렇게 읽었다.
4. `setting-change-via`: 12절 바꾸는 곳이 '첫 실행 화면'인 키가 settings.json 에 있으면 이 규칙으로 낸다(C61 '기본 행을 두지 않는다'). plan 표에 없는 경우라 가장 가까운 규칙에 넣었다.
5. 12절 표의 모르는 범위 · 바꾸는 곳 낱말, 모르는 자리 표시는 '정본 꼴 오류'로 종료 2 다(정본 꼴이 바뀌면 조용히 빠지지 않게).
6. `--json` 의 `skipped` 는 건너뛴 규칙 이름 목록이다(없으면 `[]`). `unparsedDefaults` 는 대조 안 한 펼친 키 목록이다.
7. `db-ping` 은 `sql.reserve()` 로 접속 하나를 먼저 잡아 접속 실패와 질의 실패를 가른다. 보내는 질의는 settings 읽기 하나 그대로다. 질의 실패 시험을 하나 더했다.
8. 설계 숫자 허용에 이름 목록 `DESIGN_NUMBER_ALLOWED_NAMES`(PASSAGE_PICTURE_UNTIL_LEVEL)를 두었다. 그 상수는 맨 위 대문자 상수라 규칙으로도 빠지지만, 컨트롤러 결정대로 이름을 적어 두었다. 그 파일(`src/components/activities/common.tsx`)은 P5b 가지에만 있다.

## 장부 항목 확인

- **fixture-setting 이 시험 파일을 보는지**: `tests/fixtures/settings.ts` 의 `TEST_SETTINGS` 만 맞댄다. P7a 의 `tests/fixtures/seed/loadable.ts`(일부러 값을 바꾼 적재용 설정)와 `tests/unit` · `tests/integration` 의 고정 값은 맞대지 않는다. 다만 `tests/fixtures/**` 의 설정 키 글자는 `code-setting-unknown` 훑기 대상이고 지금 0 이다.
- P7a 의 수는 모두 파일 맨 위 대문자 상수이고 `scripts/` 는 수 훑기 밖이라 허용 목록에 더할 것이 없다(장부 그대로).
- `finally close` 덤: 고쳤고 시험 하나.

## 남긴 것

- ci.yml 을 P5b 가지와 합칠 때 e2e-local · check-ids 두 작업을 모두 남기기(컨트롤러).
- 작업 5(컨트롤러): P6a 가 합쳐진 바탕에서 `pnpm check:ids` 다시. 위 미리 보기로는 막는 위반 0.
- dev-load 의 `pnpm check:data-api` 는 P3b(e08eaba)와 합친 뒤에만 있다(plan 위험 13). 작업 파일 시험은 명령 글만 본다.
- [사람] 단계 6~8(첫 개발용 적재 · H15 · H8)은 요청자 몫.

## 검토자에게 알릴 것

- `check-ids.ts` 는 Biome 줄 바꿈 뒤 약 1,000줄이다. 대조 함수 `checkIds` 하나가 규칙 아홉을 차례로 돈다.
- `code-setting-unknown` 의 첫 마디 걸러내기는 12절 키의 첫 마디(unit · level · placement · profile · writing · speaking · talk · speech · vocab · review · session · ui · streak · app · reward · ai · seed · parent · access · data · backup · db)를 쓴다. `data.` · `db.` · `app.` · `session.` 같은 흔한 낱말이 거짓 양성을 낼 수 있다(plan 위험 10). 지금 저장소에서는 0 이다.
- 틀 글자 머리는 그 글로 시작하는 키가 있으면 알려진 것이다. 끝이 '.' 이 아닌 글 글자는 키와 같거나 `글 + '.'` 로 시작하는 키가 있어야 한다.
- 작업 파일 시험은 글 대조다(plan 위험 7). 단계 이름 · 명령 줄 · 들여쓰기(작업 2칸 · 단계 6칸)에 기댄다.
- db-ping 통합 시험의 subprocess 는 `...process.env` 를 물려받는다(타입 때문에). `DATABASE_URL` 은 시험 값으로 덮는다.

## 고친 뒤(컨트롤러 답 반영, 2026-10-17 21:3x)

ci.yml 에 check-ids 작업을 더하고, 시험의 건너뜀(작업이 없으면 return)을 없앴다. 작업 이름 시험의 대체값도 뺐다.
다시 돌림: `pnpm exec biome ci .` 0(경고 0) · `pnpm test` 24 파일 239 통과 · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` 0(missing-test 51). 그 뒤 `pnpm test:int` 도 다시 돌렸다(컨트롤러 요청).

| 명령 | 종료 | 결과(ci.yml check-ids 작업 · 건너뜀 없는 시험 반영 뒤) |
|---|---|---|
| `pnpm test` | 0 | Test Files 24 passed · Tests 239 passed |
| `pnpm test:int` | 0 | Test Files 7 passed · Tests 59 passed · 1 skipped |

빌드 · check:deps · check:bundle 은 앱 코드가 바뀌지 않아 다시 돌리지 않았다(앞 표의 결과 그대로).

## Minor 라운드(review-p07b Approved · M 5, 브리프 task-p07b-fix1.md, 2026-10-17 22:xx)

시험을 먼저 고쳐 실패를 본 뒤 고쳤다. 모두 ADDRESSED.

| 지적 | 고친 곳 | 시험 | 고치기 전 |
|---|---|---|---|
| M-1 같은 머리 표 둘 이상 | `scripts/check-ids.ts:200-224` `tableRows` 가 파일 전체를 돌며 머리 줄마다 그 표를 모은다. 머리 0 개면 지금처럼 InputError(5절 표도 같은 함수) | `tests/unit/check-ids.test.ts:269-285`(첫 시험 안): 견본 정본 뒤에 같은 머리 표(`talk.extra_key`)를 붙이면 그 키가 표 · 펼친 키에 든다 | 실패(키 13 개만 읽음) |
| M-2 명시한 `--seed-root` 없음 | `CheckIdsArgs.seedRootGiven`(766줄) · `parseArgs` 가 `--seed-root` 를 받으면 참 · `readSeed` 가 적은 뿌리가 없으면 `InputError("<뿌리> 가 없다")` 종료 2. 기본 `seed` 가 없을 때만 건너뜀 | `check-ids.test.ts:664-667`: `--seed-root nowhere` 는 2 와 한 줄 `check-ids: 입력을 못 읽었다: nowhere 가 없다` | 실패(종료 0) |
| M-3 쓰기 1~3단계 교정 값 | `check-ids.ts:693-708`: 시드의 `writing.rule_check_until_level`(상수 `RULE_CHECK_UNTIL_KEY`) 이하 쓰기 규격에 `maxCorrections` 가 있으면 `max-corrections writing:<n>`. 키가 없거나 수가 아니면 건너뜀. 4~5단계는 그대로 뺌(브리프 (가)만, 검토 (나)는 하지 않음) | `check-ids.test.ts:485-503`: 2단계 2 · 4~5단계 1 이면 `writing:2` 한 줄, 경계 키가 없으면 0 줄. 견본 12절 · 시드에 `writing.rule_check_until_level` 3 행을 더함 | 실패(위반 0) |
| M-4 작업 파일 금지 글 꼴 | `tests/unit/ci-workflows.test.ts:102-105` run 블록 꼴 `/^[\|>][-+]?$/` · `131-170` `FORBIDDEN_IN_RUN`(`${{\s*(inputs\|secrets\|github.event.inputs)\b`) · `BULK_SECRETS`(`toJSON(secrets)` · `secrets[` · `secrets: inherit`) · `problemsOf(file, text)`. main · keepalive 밖 파일은 통째 넘김 0 · `PROD_` 0. env 의 비밀값은 점 · 대괄호 꼴 둘 다 본다 | 기존 "AC-7g 작업 파일: …"이 `problemsOf` 로 네 파일 모두 [] 를 단언. 새 시험 "AC-7g 작업 파일 검사: run 의 \|- · > 블록, 공백 없는 식, toJSON(secrets) · secrets[…] · secrets: inherit 도 잡는다(거짓 통과 막기)"(314줄)가 견본 여섯 꼴을 잡고, env 로 넘긴 바른 꼴은 [] 임을 본다 | 도우미를 옛 꼴(`\|` 만 · 공백 한 칸 식 · 점 꼴만)로 잠시 되돌리면 새 시험이 '`run \|-` 블록의 공백 없는 입력 식'에서 실패, 복원 뒤 통과 |
| M-5 시험 증명 범위 | `check-ids.test.ts` 견본 `ROWS` 에 `ai.effort.<호출>` 행 · `goodSettings` 에 ai.effort 넷, 펼침 단언(effort 넷 · 길이 `4 * 3 + 7`) · `unparsedDefaults` 에 effort 넷. 설계 숫자 견본에 함수 안 `const PASSAGE_PICTURE_UNTIL_LEVEL = 4` 와 대조용 `const OTHER_LOCAL = 4` | 첫 시험 · 기본값 시험 · 설계 숫자 시험(앞의 4 는 빠지고 `src/a.ts:10 4` 만 남음, design-number 3 → 4) | 시험 보강이라 코드는 그대로 통과(허용 이름 길이 이제 증명됨) |

### 다시 돌림(워크트리, Minor 라운드 뒤)

| 명령 | 종료 | 결과 |
|---|---|---|
| `pnpm exec biome ci .` | 0 | 92 files, 경고 0 |
| `pnpm build` | 0 | |
| `pnpm test` | 0 | 24 파일 · **240** 통과(239 + 작업 파일 검사 1) |
| `pnpm test:int` | 0 | 7 파일 · 59 통과 · 1 건너뜀 |
| `pnpm check:deps` | 0 | no dependency violations found |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 | AC 이름 시험 99 · missing-test 51(그대로) |
| `pnpm check:bundle` | 0 | 위반 0 |
| `pnpm check:ids --specs <메인 specs> --fail-on <CI 아홉>` | 0 | 12절 키 184 · 코드 키 글자 185(새 상수 글 하나) · 테이블 29/29 · 대조 안 함 8 · 막는 위반 0 · 건너뜀(seed/ 없음) |
| `pnpm check:ids --specs <메인 specs> --seed-root /nonexistent` | **2** | `check-ids: 입력을 못 읽었다: /nonexistent 가 없다` |
| `pnpm check:ids --specs <메인 specs> --seed-root <P6a seed> --fail-on <CI 아홉>` | 0 | 시드 키 180 · 막는 위반 0(1~3단계 교정 값 없음) · design-number 17 그대로 |

비밀값 꼴 grep(바뀐 파일 · 작업 파일) 0건.

남긴 것(검토 6절, 컨트롤러 판단): 쓰기 4~5단계 '고칠 곳 최대 1개'는 설정값이 아니라 대조하지 않는다. 12절에 키를 둘지는 13절 몫이다. `PROD_RELEASE` 를 끌 때 Deployment Checks 의 `main` 도 함께 빼라는 H8 안내 한 줄도 컨트롤러 몫이다.
