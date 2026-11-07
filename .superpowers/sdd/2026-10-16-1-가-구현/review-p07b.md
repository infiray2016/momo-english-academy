# 검토: P7b CI 작업 셋 · 식별자 대조 · 활동 유지 명령(rev-p07b · Opus, 범위 한정 — 가벼운 루프, 2026-10-17)

판정: **Approved** — Critical 0 · Important 0 · Minor 5. Minor 는 컨트롤러가 직접 고친다(고치는 법은 3절).

대상은 워크트리 `.claude/worktrees/p07`, 가지 `feature/1a-p07b-ci-ids`(바탕 df8445e, 커밋 없음)다. 기준은 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p07b-CI-작업-식별자-대조.md`(메인 저장소 최신 판) · 브리프 `task-p07b.md` · 검토 브리프 `task-p07b-review.md` 다. 구현 보고의 주장은 아래처럼 직접 확인했다.

검토자가 직접 돌린 것(워크트리 · 저장소는 고치지 않음, 재현은 스크래치패드 복사본):
- 작업 파일 셋을 plan '파일별 값' 3~5 의 yaml 토막과 글자 대조했다. 셋 다 차이 0 이다. ci.yml 에 더한 작업도 plan '요청하는 공용 변경' 2 와 글자가 같다.
- `pnpm check:ids` 를 메인 정본으로 돌렸다. 보고의 두 출력(시드 없음 · P6a 시드 f447bc5)을 그대로 재현했고 종료 0 이다.
- 인자 길: `--help` · `--specs=<경로>` 는 '모르는 인자' 종료 2 다. 없는 `--seed-root` 는 '건너뜀(seed/ 없음)' 종료 0 이다(M-2).
- 재현 둘: 12절 표 뒤 같은 머리의 둘째 표(M-1), 쓰기 2 · 4단계 maxCorrections 2 시드(M-3). 둘 다 막는 위반 0 · 종료 0 이다.
- 시험은 다시 돌리지 않았다.

```
재현                                              check:ids                       결과
메인 정본 · 시드 없음 · --fail-on CI 아홉         막는 위반 0 · 대조 안 함 8      종료 0(보고와 같음)
메인 정본 · P6a 시드                              막는 위반 0 · design-number 17  종료 0(보고와 같음)
12절 표 뒤 둘째 표(새 키 talk.new_key_for_repro)  12절 키 184 그대로 · 0          종료 0 — 새 키를 못 봄(M-1)
--seed-root /nonexistent-seed                     건너뜀(seed/ 없음)              종료 0(M-2)
쓰기 2 · 4단계 maxCorrections 2(P6a 시드 복사)    max-corrections 0               종료 0, seed:validate 도 규격 파일 오류 0(M-3)
```

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| check-ids 함수 · 명령 꼴(순수 함수 + `runCheckIds(args, io)` → `{ code, lines }`, `isDirectRun`) | ✅ | `scripts/check-ids.ts:218` · `244` · `297` · `360` · `400` · `481` · `538` · `819` · `985` |
| 규칙 열(글자) | ✅ | `RULES`(107-118)가 plan 규칙 표 열 글자와 같다 |
| CI 막는 규칙 | ✅ | `CI_FAIL_ON`(132-134, design-number 뺀 아홉) = ci.yml 119줄 `--fail-on` 글. `tests/unit/ci-workflows.test.ts:249-257` 이 건너뜀 없이 같음을 단언한다 |
| 12절 표 읽기 | ✅(M-1) | 머리 정규식이 정확한 꼴이라 열을 더하거나 키를 백틱으로 감싸면 종료 2 다. 모르는 범위 · 바꾸는 곳 · 자리 표시도 2 다(222-232 · 261-265). 같은 머리의 둘째 표는 못 읽는다 |
| 펼침 | ✅ | 메인 정본 121행 → 184키. 구간 15행 · 영역 1행 · 호출 넷(model · effort · thinking 각 4, max_tokens 7, `callsFor` 238-241)이 plan 과 같다 |
| 기본값 풀기 · 대조 안 함 8 | ✅ | 대조 안 함 8 은 12절 98 · 100줄 `ai.model.<호출>` · `ai.effort.<호출>` 의 '6.1 표'다. plan '못 푸는 칸은 대조 안 함'대로 수만 내고 `--json` 에 키 목록을 낸다. 나머지 172키는 모두 풀린다(`0.80` · `1.00` · 단계 사전 · 호출별 수 · `나머지 '적응'` · `끔`) |
| 코드 글자 훑기 | ✅ | 구문 트리로 글 글자 · 틀 머리만 모은다(413-423). 확장자 · 첫 마디 거르기가 plan 과 같다 |
| 수 글자 훑기 | ✅ | P6a 시드로 낸 17 줄을 모두 열어 봤다. 모두 설계 숫자가 아니다(아래 표본) |
| 5절 ↔ 스키마 | ✅ | `is(값, PgTable)` · `getTableName`(373-381), 29/29 |
| seed/ 읽기 · 건너뜀 | ✅(M-2) | P4a 규격으로 풀고 틀리면 2(791-817). 기본 뿌리가 없으면 시드 규칙 여덟을 건너뛴다 |
| 출력 · 종료 코드 | ✅ | 첫 줄 꼴 · 위반 줄 `<규칙> <곳> <설명>` · `--json` `{ version: 1, counts, violations, skipped, unparsedDefaults }` · 0 / 1 / 2 가 plan 과 같다 |
| `--specs` 선택지(브리프 지시) | ✅ | 메인 정본으로 실제 먹는다. 모르는 인자는 조용히 넘기지 않는다(776) |
| db-ping | ✅ | `server-only` 없음 · `postgres` 바로 · `prepare: false` · `max: 1` · `connect_timeout`(22-49). 질의는 settings 행 수 하나다. 출력은 `db-ping: settings <n>행` / `실패(접속|질의)` 뿐이고, 예상 밖 오류도 이름만 낸다(85-87) |
| main · dev-load · keepalive | ✅ | plan 토막과 글자 차이 0. dev-load 는 `DEV_` 만 읽는다. 운영 비밀값은 main · keepalive 만 읽는다(C68 (4)) |
| main 운영 승격 보류(`PROD_RELEASE`) | ✅ / ⚠️ | C68 (5) '저장소 변수 PROD_RELEASE 가 on 일 때만'과 같다. 10절 37줄 '첫 배포에서 보류 확인'은 [사람] 8 이 한다. 변수를 끈 채 Deployment Checks 에 `main` 을 걸었을 때 Vercel 이 건너뛴 작업을 어떻게 보는지는 diff 로 확인할 수 없다(plan 위험 3, 6절) |
| ci-workflows 시험 | ✅(M-4) | plan 증명 표의 이름 · 보는 것이 모두 있다. 금지 글 꼴이 좁다 |
| 덤(seed-load 닫기 실패) | ✅ | 2절 · 5절 |
| 공용 변경 표시 | ✅ | 보고 '요청하는 공용 변경'에 package.json 두 줄 · ci.yml 작업을 따로 적고, P5b e2e-local 과 같은 자리라 둘 다 남기라고 적었다 |
| 경계 · 비밀값 · 로그 | ✅ | 바뀐 파일 비밀값 꼴 grep 0. check-ids 출력은 키 · 파일:줄뿐이다. 작업 파일은 비밀값을 쓰는 단계의 env 에만 둔다 |
| 넘친 것 | 없음 | `--specs`(브리프 지시), 질의 실패 시험 하나, `DESIGN_NUMBER_ALLOWED_NAMES`(컨트롤러 결정) 모두 까닭이 있다 |

design-number 17 표본(P6a 시드 · 메인 정본):

| 곳 | 수 | 무엇 |
|---|---|---|
| `src/core/ai/cost.ts:75` · `92` | 10 | 진법 `10 ** scale` |
| `src/core/learning-day.ts:61` | 10 | ISO 날짜 앞 10글자 `.slice(0, 10)` |
| `src/core/seed/check-cross.ts:500` | 3(두 번) | 소수 자리 `toFixed(3)` |
| `src/core/seed/version-pick.ts:106` · `107` | 3 · 4 | 칸 키 마디 수 |
| `src/db/schema/content.ts:371-387` | 10 · 4 | `numeric` precision · scale |
| `src/db/schema/operations.ts:129` · `130` | 12 · 6 | `numeric` precision · scale |

모두 거짓 양성이다. 보고만 하는 규칙이라 지금 막는 것은 없다. 차수 경계에서 막음으로 바꿀 때 정리할 몫이라는 보고의 판단에 동의한다.

## 2. 잘한 점

- **정본 꼴이 바뀌면 조용히 빠지지 않게 했다.** 머리 정규식 · 키 칸 꼴 · 모르는 범위 · 바꾸는 곳 · 자리 표시를 모두 종료 2 로 만들었다(`scripts/check-ids.ts:206` · `222-232` · `261-265`). plan 위험 8 의 '대조가 빠진다'를 대부분 큰 소리로 바꿨다.
- **기본값 풀기가 정본 121행을 '6.1 표' 둘만 빼고 다 푼다.** 호출별 수의 '이름 없는 수는 다음 수를 받는다'(325-334)와 단계 사전의 '다시 이어 붙여 원문과 같아야 한다'(342-343)가 반쯤 맞는 풀이를 막는다.
- **db-ping 이 접속 실패와 질의 실패를 가른다.** `sql.reserve()` 로 접속을 먼저 잡았다(`scripts/db-ping.ts:30-45`). 질의 실패 시험은 오류 원문이 나오지 않음까지 단언한다(`tests/integration/db-ping.test.ts:76-83`).
- **명령 길까지 시험한다.** 성공 시험은 subprocess 로 띄워 표준 출력 글 · 접속 문자열 · 비밀번호 칸이 없음을 본다(46-55). 접속 실패 시험은 비밀번호 표지가 나오지 않음을 본다(67-73).
- **작업 파일 시험이 plan 표보다 한 걸음 더 본다.** `needs:` 를 막고(`tests/unit/ci-workflows.test.ts:161`), 비밀값 확인 단계가 마이그레이션 앞에서 실패함을 보며(166), 시드 검증 단계 env 가 비었음(187)과 dev-load 글에 `PROD_` 가 아예 없음(236)을 단언한다.
- **덤 시험이 고치기 전 코드에서 실패한다.** 닫기가 던지면 예전 `finally` 는 반환값을 덮고 거부된다. 새 시험은 종료 0 · 첫 줄 '넣음' · close 한 번 · settings 행이 남음을 본다(`tests/integration/seed-load.test.ts:1047-1063`).

## 3. 지적

### Critical · Important

없음.

### Minor(컨트롤러가 고친다)

**M-1. 12절 표가 같은 머리로 둘 이상이면 뒤 표를 읽지 않는다.**
- 무엇이: `tableRows`(`scripts/check-ids.ts:199-215`)가 첫 머리 줄만 찾고(`findIndex`) 첫 표 밖 줄에서 멈춘다.
- 왜: 12절이 커져 소절별 표로 나뉘면 뒤 표의 키가 펼친 키에서 빠진다. 시드에 이미 있는 키는 seed-setting-unknown 으로 막힌다. 하지만 새 키만 담은 표는 spec-setting-missing 이 보지 못해 조용히 통과한다. 그 규칙의 plan 실패 예 '12절에 키를 더하고 settings.json 은 그대로'가 바로 이 경우다.
- 재현: 메인 정본 복사본 133줄 뒤에 같은 머리 표 하나(`talk.new_key_for_repro`)를 더했다. P6a 시드로 `--fail-on spec-setting-missing` 을 돌리면 12절 키 184 그대로 · 종료 0 이다.
- 어떻게: `tableRows` 가 파일 전체를 돌며 머리 줄을 만날 때마다 그 표의 줄을 모으게 한다. 머리 0 개면 지금처럼 InputError 다. 5절 `| 테이블 | 역할 |` 도 같은 함수라 함께 고쳐진다. 시험 한 줄: `specText()` 뒤에 둘째 표를 붙이면 `parseSettingsTable` 의 키가 늘어난다.

**M-2. 명시한 `--seed-root` 가 없으면 시드 규칙을 조용히 건너뛰고 0 이다.**
- 무엇이: `readSeed`(791-792)가 뿌리가 없으면 기본값이든 명시한 값이든 `null` 이다.
- 왜: 오타 난 경로(작업 5 의 P6a 대조처럼 다른 워크트리를 가리킬 때)가 '막는 위반 0 · 종료 0'으로 보인다. 첫 줄 끝 '건너뜀(seed/ 없음)'만 다르다. plan '뿌리가 없으면 건너뜀'은 기본 `seed` 의 1-가 초반 사정이다.
- 재현: `pnpm check:ids --specs <메인 specs> --seed-root /nonexistent-seed` 는 '건너뜀(seed/ 없음)' · 종료 0 이다.
- 어떻게: `CheckIdsArgs` 에 `seedRootGiven: boolean` 을 두고 `parseArgs` 가 `--seed-root` 를 받으면 참으로 둔다. `readSeed` 는 `!dirExists && seedRootGiven` 이면 `InputError(\`${seedRoot} 가 없다\`)`(종료 2)로 한다. 시험 한 줄: `memoryIo(specs)` 에 `--seed-root nowhere` 면 2 다.

**M-3. max-corrections 해석(사전에 있는 단계만)이 1~3단계 교정 값도 놓친다.**
- 무엇이: `checkIds` 의 교정 상한 대조(646-683)는 `writing.max_corrections` 사전의 단계(6~12)만 본다.
- 왜: 4~5단계를 빼야 한다는 판단은 맞다(4절). 하지만 plan 글자('그 단계 값과 다르거나')라면 잡혔을 'AI 없는 1~3단계 규격에 maxCorrections 가 있음'도 함께 빠졌다. 다른 검사도 이 칸을 보지 않는다. 스키마는 선택 칸이고(`src/core/seed/schema/reference.ts:220`) 시드 검증기도 통과시킨다. 지금 P6a 시드 값(1~3 없음 · 4~5 1 · 6~9 2 · 10~12 3)은 맞다. 앞으로 시드를 고칠 때만 생기는 빈틈이다.
- 재현: P6a 시드 복사본에서 쓰기 2단계 · 4단계 `maxCorrections` 를 2로 바꿨다. `check:ids --fail-on max-corrections` 는 종료 0 이다. `seed:validate --root <복사본>` 도 규격 파일 오류 0 이다.
- 어떻게: 설정값으로만 경계를 잡는다(수를 코드에 박지 않음). settings 의 `writing.rule_check_until_level`(R) · `writing.light_check_until_level`(L)을 읽는다. (가) 단계 ≤ R 인 쓰기 규격에 `maxCorrections` 가 있으면 `max-corrections writing:<n> AI 없는 단계에 교정 상한이 있다` 다. (나) R < 단계 ≤ L 인데 값이 없으면 위반이다. 두 키가 시드에 없으면 (가) · (나)를 건너뛴다(견본 시험의 `goodSettings` 에는 없다). 시험 한 줄: `writingSpecs({ 2: 2, 4: 1, 5: 1, 6: 2, … })` 면 `writing:2` 한 줄이다. 4~5단계 값 자체('고칠 곳 최대 1개')는 12절 `writing.light_check_until_level` 뜻 칸의 수라 설정값이 아니다. 이것까지 맞대려면 정본에 키를 둘지 정해야 한다(6절, 컨트롤러 판단).

**M-4. 작업 파일 시험의 금지 글 꼴이 좁다(plan 위험 7 의 거짓 통과 쪽).**
- 무엇이:
  - `stepsOf` 는 `run: |` 만 블록으로 읽는다(`tests/unit/ci-workflows.test.ts:96-99`). `run: |-` · `run: >` 는 run 글이 `|-` 한 낱말로 남아 속을 보지 않는다.
  - 금지 글은 공백 한 칸 꼴 `${{ inputs.` · `${{ secrets.` 만 본다(279-288). `${{inputs.x}}` 는 통과한다.
  - 운영 비밀값 검사는 `secrets.PROD_` 점 꼴만 센다(118-119 · 291-297). `toJSON(secrets)` · `secrets['PROD_…']` · `secrets: inherit` 는 main · keepalive 밖 파일(ci.yml 등)에서 통과한다. dev-load 는 236줄 `not.toContain("PROD_")` 로 막힌다.
- 왜: plan 정할 것 바 (1)의 약점 '같은 저장소의 다른 작업 파일이 PROD_ 를 읽을 수 있음'을 '시험 · 검토가 막는다'고 했다. 그 시험이 흔한 다른 꼴을 놓친다.
- 어떻게:
  - run 블록 조건을 `/^[|>][-+]?$/.test(value)` 로 한다.
  - 금지 글을 정규식 `/\$\{\{\s*(inputs|secrets|github\.event\.inputs)\b/` 로 본다.
  - main · keepalive 밖 파일에서 주석 뺀 글에 `/toJSON\(\s*secrets\s*\)|secrets\s*\[|secrets:\s*inherit/` 0 건, `PROD_` 0 건을 단언한다.

**M-5. check-ids 시험 둘이 이름 · 목록만큼 증명하지 않는다.**
- 무엇이:
  - 첫 시험 이름(`tests/unit/check-ids.test.ts:223`)은 'ai.model · effort · thinking 넷'으로 펼친다고 말한다. 그런데 견본 `ROWS`(33-61)에 `ai.effort.<호출>` 행이 없다.
  - 설계 숫자 시험의 `PASSAGE_PICTURE_UNTIL_LEVEL`(480)은 맨 위 대문자 상수라 다른 규칙으로도 빠진다. 그래서 이름 목록 길(`scripts/check-ids.ts:472-478`)은 증명되지 않는다.
- 왜: 시험 이름이 증명 표의 글이다(spec-trace). 허용 목록은 장부 24행을 닫는 근거다.
- 어떻게:
  - `ROWS` 에 `["ai.effort.<호출>", "집 전체", "6.1 표", "고급"]` 을 더한다. `goodSettings` 에 `ai.effort.<넷>` 행을 더하고, 길이 식을 `4 * 3` 으로, `unparsedDefaults` 기대에 ai.effort 넷을 더한다.
  - 설계 숫자 견본에 `function g() { const PASSAGE_PICTURE_UNTIL_LEVEL = 4; return PASSAGE_PICTURE_UNTIL_LEVEL; }` 을 넣는다. 그 4 가 보고에 없음을 단언한다(지금 견본의 4 는 `review.intervals_days` 값이라 걸린다).

## 4. 다르게 한 것 판정

| 보고 항목 | 판정 | 근거 |
|---|---|---|
| 1. `--specs <폴더>` | 타당 | 브리프 지시. 메인 정본으로 실제 먹고 잘못 쓴 꼴은 2 다 |
| 3. max-corrections 는 사전에 있는 단계만 | 타당(빈틈 M-3) | 4~5단계 '1'은 12절 42줄 뜻 칸 '(고칠 곳 최대 1개)'의 수이고 `writing.max_corrections` 는 '6~9단계 2, 10~12단계 3'(43줄)이다. plan 글자대로면 맞는 P6a 시드(4 · 5단계 1)가 CI 에서 막힌다. plan-p06a 정할 것 바 '둘 다 같은 값'의 물음(두 출처)에는 이 해석이 답한다 |
| 4. '첫 실행 화면' 키가 시드에 있으면 setting-change-via | 타당 | 그 키는 12절에 있어 seed-setting-unknown 이 아니다. 시드의 바꾸는 곳 값으로는 '첫 실행 화면'을 적을 수 없다. C61 (2) '기본 행을 두지 않는다'를 어기는 것은 바꾸는 곳의 어긋남으로 읽는 것이 가장 가깝다. CI 막는 규칙이라 결과도 같다 |
| 5. 모르는 범위 · 바꾸는 곳 · 자리 표시는 2 | 타당 | plan '정본 파일을 못 읽음 → 2'의 확장이다. 조용한 누락을 막는다 |
| 6. `--json` 의 skipped · unparsedDefaults 꼴 | 타당 | plan 꼴 그대로 |
| 7. db-ping `sql.reserve()` | 타당 | 질의는 settings 읽기 하나 그대로다. 접속 · 질의 실패를 plan 출력 낱말 '접속|질의'대로 가른다 |
| 8. `DESIGN_NUMBER_ALLOWED_NAMES` | 타당 | 컨트롤러 결정(plan 9줄). 증명은 M-5 |

## 5. 열린 장부 행 판정(`ledger-open.md`)

| 행 | 판정 | 근거 |
|---|---|---|
| 9줄 P7a `finally { await handle.close() }` 덮음 | 닫힘 | `scripts/seed-load.ts:276-277` 이 접속 확인 쪽(248줄)과 같은 꼴로 삼킨다. 시험(`tests/integration/seed-load.test.ts:1047-1063`)이 결과 · 종료 코드가 그대로임을 증명한다 |
| 24줄 허용 목록 `PASSAGE_PICTURE_UNTIL_LEVEL = 4`(common.tsx) | 닫힘 | 이름 목록(`scripts/check-ids.ts:47`)에 있다. P5b `src/components/activities/common.tsx:31` 이 맨 위 `export const` 라 규칙으로도 빠진다. 이름 길의 시험은 M-5 |
| 36줄 P7b(허용 목록 · fixture-setting · dev-load 입력 · 접속) | 닫힘 | `fixture-setting` 은 `tests/fixtures/settings.ts` 의 `TEST_SETTINGS` 만 맞댄다(686-704 · 950 · 978). 시험 고정 값과 `tests/fixtures/seed/loadable.ts` 의 값은 보지 않는다. P7a 의 수는 맨 위 대문자 상수이고 `scripts/` 는 수 훑기 밖이다(`DESIGN_DIRS` 38). dev-load 는 `--complete-through "$THROUGH" --areas "$AREAS"` · 수업 전 `--reference-only --complete-through "$THROUGH"` 이고 접속은 `MIGRATION_DATABASE_URL` 하나다 |

## 6. 범위 밖 관찰

- **`PROD_RELEASE` 를 끈 채 Deployment Checks 를 걸면 승격이 열릴 수 있다(⚠️).** GitHub Actions 문서는 `if` 로 건너뛴 작업이 'Success' 로 보고되고 필수 검사여도 막지 않는다고 적는다(검토자 기억, 이번에 원문은 열지 않음). Vercel 이 이 결론을 그대로 읽으면 plan 위험 3 의 '적재 없이 운영 승격'이 된다. [사람] 7 이 변수를 먼저 켜는 차례라 지금은 막혀 있다. H8 안내에 '변수를 끄면 Deployment Checks 의 main 도 함께 뺀다'를 한 줄 두면 좋다.
- **대조 안 함 8키의 값은 이 명령이 보지 않는다.** `ai.model.<호출>` · `ai.effort.<호출>` 시드 값이 6.1 표와 같은지는 plan 대로 check-ids 밖이다. 다른 검사가 보는지는 이번 범위에서 확인하지 않았다. 차수 경계 점검 때 6.1 표를 읽는 규칙을 더할지 컨트롤러가 정한다.
- **4~5단계 '고칠 곳 최대 1개'는 설정값이 아니다.** 12절 뜻 칸에만 있다. 쓰기 4~5단계 규격 값이 1을 넘는지는 지금 어느 자동 검사도 보지 않는다(M-3 재현). 정본에 키를 둘지는 13절 몫이다.
- **10절 37줄 글은 '운영 환경 비밀값'으로 남아 있다.** C68 (4)가 13절에서 '보완'으로 적었으니 결함은 아니다. 정본 장 반영 때 함께 고치면 읽는 사람이 헷갈리지 않는다.

## 7. 판정

**Approved** — Critical 0 · Important 0 · Minor 5(M-1 12절 둘째 표 · M-2 명시한 시드 뿌리 · M-3 1~3단계 교정 값 · M-4 작업 파일 금지 글 꼴 · M-5 시험 증명 범위). 설계 준수는 모두 ✅ 이다(⚠️ 하나는 Vercel 동작, diff 밖). 열린 장부 P7b 행 셋은 닫힘이다.
