# 코드 검토: P7a 적재 · 판 규칙(rev-p07a · Opus · xhigh, 읽기 전용, 2026-10-17)

판정: **Changes requested** — Critical 0 · Important 1 · Minor 6.

대상은 워크트리 `.claude/worktrees/p07`(브랜치 feature/1a-p07-seed-load, 바탕 01ff0a9, 커밋 없음)다. 기준은 plan-p07a(approved) · 13절 C68 · 정본 5절 · 6.3 · 9절 · 11절 (4) · (4-1) · 12절 머리 · AC-17a · 17b · 7e · 7g · 8i 다.

검토자가 직접 돌린 것(파일을 고치지 않음, 실제 DB 접속 없음, 임시 파일은 스크래치패드):
- 증명 표의 시험 이름 38개를 시험 파일 넷과 글자 그대로 대조했다. 빠진 이름은 0 이다.
- 시험용 시드(loadableSeed)의 칸 종류를 셌다. 수업 88 · 단계 평가 문항 15 · 회화 평가 카드 장 1 · 배치 문항 48 · 토리 이야기 20 으로 다섯 종류가 모두 있다. 12절 기본값 seed.complete_through_level 은 6 이다.
- 바탕 01ff0a9 의 tests 에서 AC 이름을 찾았다. AC-17a · 17b · 7e 는 0 파일, AC-7g(clock.test.ts) · 8i 는 이미 있다.
- 가짜 접속으로 적재 중 DB 오류를 재현했다(I-1).
- P6a 워크트리(agent-a6ef72438a158a2f3, 커밋 전) 의 seed/ 를 읽기만 해 '규격만 적재'의 순수 검사 몫을 돌렸다(6절 끝).
- 단위 · 통합 시험 묶음 · biome · build · check:deps · spec:trace · check:bundle 은 다시 돌리지 않았다. 컨트롤러 13:4x 확인을 그대로 둔다.

## 1. 설계 준수

| 기준 | 판정 | 근거 |
|---|---|---|
| plan 값 1 `version-pick.ts` | ✅ | 이름 · 규칙 다섯 · 칸 묶음 · latestAfter 가 plan 표와 C68 (2) 문장과 같다(version-pick.ts:177-259). 가져오기 셋을 더했다(다르게 한 것 2) |
| 값 2 `settings-compare.ts` | ✅ | 바꾸는 곳 넷 · 덮어쓰기 허용 키 · 범위 위반 · orphans · 정규 JSON 비교(settings-compare.ts:74-159) |
| 값 3 `load.ts` | ✅ ⚠️ | 차례가 plan 과 같다: 완전성 범위(833) → validateSeed(843) → collectCells(856) → 트랜잭션 첫 문장 자문 잠금(887) → 읽기 → 계획 → 검사(968-989) → 거부 · 미리 돌림 되돌림(991-1043) → images → vocab → model_prices → 시드 표 다섯 → settings → settings_history(1046-1091). 열 대응표 그대로(282-405 · 593-636). SQL now() · JSON null · 행 삭제 · 학습 기록 표 접근은 grep 0. ⚠️ DB 단가 행 풀기가 plan 의 parse 와 다르다(M-2) |
| 값 4 `read.ts` | ✅ | 함수 여섯, 시작 개정 이하를 SQL 로 거르고 고르기는 pickByCell · pickVersion 하나(read.ts:25-180) |
| 값 5 `scripts/seed-load.ts` | ❌ 하나 | 인자 · 첫 줄 꼴 · `--json` version 1 · `MIGRATION_DATABASE_URL` 하나 · 조건 플래그는 맞다. 적재 중 예외의 길이 종료 코드 표와 출력 규칙을 벗어난다(I-1) |
| 값 6 `loadable.ts` | ✅ | loadable.ts:51-274 |
| 5절 첫 문단(판 고르기 · 이전 판 행 · lesson_id · 규격 행도 같은 규칙) | ✅ | read.ts · seed-version.test.ts |
| 5절 둘째 문단(개정 자리는 시드 전체 하나 · 시작 개정) | ✅ | currentSeedRevision 은 다섯 표의 최대(read.ts:25-45). '+ 1' 작성 규칙은 P8 몫 |
| 5절 셋째 문단(한 트랜잭션 · 두 번 같음 · 검증 실패면 0 행) | ✅ | 검증 거부는 DB 전에 돌아간다(load.ts:850-853), 나머지는 한 트랜잭션(886-1093) |
| 5절 넷째 문단(설정값 시드 · 6.1 · 3.2) | ✅ | 견준 뒤 값으로 조합 · 관계를 본다(load.ts:664-728) |
| 5절 목록 넷은 DB 밖 | ✅ | load.ts 에 목록 넣기 없음 |
| 6.3 완전성 | ✅ | mode complete · through · areas |
| 9절 순수 함수 둘 | ✅ | src/core/seed 둘, check:deps 0(컨트롤러) |
| 11절 (4-1) 덮어쓰기 | ✅ | DEV_OVERRIDE_KEYS · load.ts:880-883 |
| 12절 머리(기본 행 · 프로필 행) | ✅ | 프로필 행은 견주지 않고(load.ts:930-932), 설정 판 최대값은 프로필 행까지 센다(926) |
| C68 (1) 규격만 적재 · 영역 | ✅ | load.ts:819 · seed-load.ts:102-113 |
| C68 (2) | ✅ | 판 규칙(값 1) · vocab · images 제자리 고침(load.ts:1048-1058) · model_prices 더하기만(952-965) · 설정 판 하나 · 이력은 고친 행 · 출처 seed_load |
| C68 (3) seed/reviews 안 읽음 | ✅ | load.ts 에 reviews 읽기 없음 |
| C68 (5) 기술 선택 | ✅ | package.json 23줄 글자 그대로 · `SEED_LOAD_LOCK_KEY` |
| AC-17a · 17b · 7e · 7g · 8i 적재 몫 | ✅ | 6절 표 |

## 2. 잘한 점

- **판 규칙이 C68 (2) 문장을 그대로 갈래로 옮겼다.** '같은 판' → '처음 생긴 칸' → '새 개정' → '정정' 차례라 한 칸이 두 규칙에 섞이지 않는다(version-pick.ts:200-250). 단위 시험이 G · G + 1 · G + 2 와 '처음 칸의 정정'까지 고정한다(version-pick.test.ts:188-254).
- **DB 쪽 해시를 칸 객체에서 되살려 cellHash 하나로 견준다.** 새 열 · 마이그레이션 없이 plan 위험 3 을 닫았다. 'AC-17b 같은 판 두 번'이 칸 종류 다섯과 규격 행 둘을 모두 지나 건너뜀 수가 처음 넣은 수와 같음을 본다.
- **거부 · 미리 돌림을 되돌림 신호 하나로 처리하고 보고를 들고 나온다.** 시험마다 '거부 뒤 행 수 그대로'를 실제 행 수로 확인한다.
- **AC-8i 두 번째 길은 5절 '바꾸는 값도'를 정확히 읽었다.** 지킨 고급 값이 끔과 맞지 않으면 바른 시드도 거부한다(seed-load.test.ts:366-383).
- **명령 시험이 실제 프로세스를 띄운다.** 조건 플래그 · `.env.local` 안 읽음 · 접속 문자열 없음을 spawnSync 로 고정한다(seed-load.test.ts:709-723).
- **시험 숫자를 시험용 자료에서 읽는다.** 이름의 '6 → 7' 은 12절 기본값 6 에서 읽고, 관계 시험은 시드 값 + 1 을 쓴다.

## 3. 지적

### Important

**I-1. 적재 중 예외가 나면 명령이 종료 1 로 끝나고 넣으려던 칸 내용을 그대로 찍는다.**
- 무엇이: `runSeedLoad` 는 `loadSeed` 를 try/finally 로만 감싼다(seed-load.ts:223-240). `main` 은 `void main().then(…)` 꼴이라 catch 가 없다(270-274). `loadSeed` 는 되돌림 신호 밖의 오류를 그대로 던진다(load.ts:1094-1097). drizzle 0.45.4 는 질의 오류를 DrizzleQueryError 로 감싸 메시지에 SQL 과 params 전체를 넣는다(node_modules/drizzle-orm/errors.js:10-13, pg-core/session.js:41).
- 재현: select 1 은 지나고 transaction 이 DrizzleQueryError 를 던지는 가짜 접속을 만들었다. params 에 표지 글을 넣고 cause 는 CONNECTION_CLOSED 로 두었다. `runSeedLoad` 를 main 과 같은 꼴(`void p.then(…)`)로 돌린 결과는 아래와 같다.

```
exit=1 · 표준 출력 0 줄 · 표준 오류에 표지 글 2번
DrizzleQueryError: Failed query: insert into "lessons" ("content") values ($1)
params: {"passage":"CELL-CONTENT-MARKER"}
  params: [ '{"passage":"CELL-CONTENT-MARKER"}' ],
  cause: Error: Connection terminated unexpectedly … (스택)
```

  실제 적재에서는 묶음 하나(200 행)의 내용 JSON 이 모두 찍힌다.
- 왜: plan 값 5 의 두 규칙을 벗어난다. 하나는 '2 입력 · 환경 오류(… 접속 실패)'이고, 하나는 '접속 문자열 · 키 · 칸 내용을 내지 않는다'다. 종료 1 은 '거부'와 같은 코드라 P7b 작업 로그를 읽는 사람이 검증 · 판 규칙 거부로 오해한다. 이 길은 plan 위험 4(긴 트랜잭션의 연결 끊김 · 시간 상한)가 내다본 실패다. 접속 확인에서는 오류 이름 · 코드만 내도록 막았는데(다르게 한 것 7), 같은 위험이 적재 중에는 열려 있다.
- 어떻게: `runSeedLoad` 에서 `loadSeed` 오류를 잡아 `seed-load: DB 오류로 적재를 되돌렸다(<errorTag(error.cause ?? error)>)` 한 줄과 종료 2 를 돌려준다. 트랜잭션은 이미 되돌아가 있다. `main` 에도 `.catch` 를 달아 오류 이름만 내고 exitCode 2 로 둔다. 명령 시험에 '`openDb` 의 transaction 이 던지면 종료 2 이고 표지 글이 출력에 없다' 단언을 하나 더한다. 스크립트 머리 주석의 종료 코드 2 에 '적재 중 DB 오류'를 적는다.

### Minor

**M-1. 접속 확인이 실패하면 열어 둔 접속을 닫지 않는다.** handle 을 만든 뒤 select 1 이 던지면 close 없이 돌아간다(seed-load.ts:216-222). 지금 시험은 지나지만 postgres.js 클라이언트가 남는다. catch 안에서 handle 이 있으면 닫는다.

**M-2. DB 단가 행의 조합 칸이 규격에 맞지 않으면 그 줄만 말없이 빠진다.** 적재는 safeParse 로 그 줄만 버린다(load.ts:648-660 · 693-695). P9a `loadPriceBook` 은 그 모델의 줄을 모두 빼고 경고한다(src/server/ai/store.ts:90-107). 그래서 적재의 조합 검사는 옛 적용일 줄로 지나는데 앱은 그 모델을 모르는 일이 생긴다. plan 값 3 의 5 는 `ModelCapabilitiesSchema.parse` 였다. 사람이 SQL 로 고친 행에서만 닿는다. 그런 줄을 `price-row-invalid` 위반으로 거부하거나 `loadPriceBook` 처럼 모델째 뺀다.

**M-3. 칸 키와 칸 종류가 맞지 않으면 그 칸을 말없이 건너뛴다.** `if (ref?.type !== …) break` 네 곳이다(load.ts:317 · 336 · 372 · 389). collectCells 가 cellKey 로 키를 만들어 지금은 닿지 않는다. 닿으면 검증을 지난 칸이 보고 없이 빠지므로, load.ts:866 처럼 불변식 오류로 던진다.

**M-4. 지킨 키와 시드에 없는 DB 키의 이름이 보고 어디에도 없다.** LoadReport 는 수만 담고(load.ts:1022-1028), 사람용 줄도 '지킴 n'만 낸다(seed-load.ts:138). plan 위험 7 의 되돌리기는 '적재 보고의 kept 줄이 차이를 보인다'이고, 요청자는 어느 행을 지울지 알아야 한다. plan 의 LoadReport 꼴을 그대로 따른 것이라 결함은 아니다. 사람용 출력에 값 없이 이름만 `kept <키>` · `orphan <키>` 줄을 더하길 권한다. `--json` 에 넣으면 version 1 꼴이 바뀌므로 사람용 줄만 권한다.

**M-5. 'AC-17a 정정 3.1 …' 시험의 '다시 하기' 확인은 같은 호출을 한 번 더 부른 것이다.** seed-version.test.ts:173-175 는 아무것도 새로 단언하지 않는다. 성질은 바로 위의 3.1 읽기와 아래 세션 lesson_id 확인으로 이미 증명된다. 두 줄을 빼거나, 끝낸 3.0 세션을 하나 넣고 '그 세션은 3.0, 다시 하기로 새로 읽으면 3.1'로 바꾼다.

**M-6. 배치 문항 answer 열을 단언하는 시험이 없다.** `answerOf`(load.ts:226-233 · 399)를 내보냈는데 시험이 쓰지 않는다. P11 배치 채점이 이 열에 기댄다. 기존 시험 하나에 'placement_items 한 행의 answer 가 칸 객체의 answerNo · accepted · sentence 와 같다' 단언을 더한다.

## 4. 다르게 한 것 1~11 판정

| 번호 | 판정 | 근거 |
|---|---|---|
| 1 작은 틀의 '수업 4 · 5' | 받음 | 5절 우려 1 |
| 2 판 고르기 모듈의 가져오기 셋 더함 | 받음 | 같은 structure 모듈이고 순수하다. check:deps 0 |
| 3 보고 꼴의 빈 값 | 받음 | LoadReport 형과 맞고 첫 줄은 '-→-'. 거부 보고는 counts 0 · 설정 판은 지금 최대값 |
| 4 검증 거부의 위반 줄 | 받음 | 20 줄은 이름 붙인 기술 값이다. 잘린 줄 수 · 빈 칸 줄 · 다시 볼 명령이 함께 나와 충분하다 |
| 5 조합 · 관계 위반의 key 꼴 | 받음 | 정본 이름이 없는 자리의 제안 꼴. settings-incomplete 로 묶은 것도 맞다 |
| 6 orphans 값을 values 에 넣음 | 받음 | 앱이 적재 뒤 읽을 기본 행 전체로 조합 · 관계를 보는 것이 5절 '바꾸는 값도 … 통과해야'에 맞다. 범위가 바뀐 키는 어차피 거부된다 |
| 7 접속 확인 select 1 · 오류 이름과 코드만 | 절반 받음 | 접속 확인 몫은 받는다. '적재 중의 다른 DB 오류는 그대로 던진다'는 받지 않는다(I-1) |
| 8 deps 꼴 · `main().then` | 받음 | tsx 가 CJS 로 돌려 최상위 await 를 못 쓰는 사정과 맞다. catch 없음은 I-1 |
| 9 AC-8i 두 길 | 받음 | (나) 지킨 고급 값의 길이 특히 값어치 있다 |
| 10 관계 시험을 4-6 구간으로 | 받음 | 1-3 구간 값을 바꾸면 시험용 시드의 보강 칸 수가 달라져 검증이 막는다. 4-6 구간은 칸이 없어 관계 표 성질만 본다. 시험 이름의 성질 그대로다 |
| 11 cellValueOf · LOADABLE_THROUGH · answerOf 내보냄 | 받음 | 앞 둘은 시험이 쓴다. answerOf 는 쓰는 곳이 없다(M-6) |

## 5. 우려 둘 판정

1. **작은 틀 '수업 4 · 5' — 증명으로 충분하다.** AC-17a 의 수업 번호는 '같은 단원의 서로 다른 칸 둘'을 가리키는 예다. 성질(개정은 다음 단원부터, 정정은 진행 중 단원에 바로)은 칸 번호와 무관하다. 큰 틀 miniSeed 는 검증 오류 124 칸으로 적재가 거부된다(구현 보고). spec-trace 는 이름 맨 앞 AC 토큰만 세므로 이름을 바꿀 까닭이 없다. 대응은 seed-version.test.ts:3-4 머리 주석에 보인다. '수업 5 의 정답을 고치면'을 목록 제목 고침으로 대신한 것도 같은 성질이다(해시만 달라지면 된다).
2. **spec-trace 시작 수 54 — 맞다.** 01ff0a9 의 tests 에 AC-17a · 17b · 7e 이름 시험은 0 이고 AC-7g · 8i 는 이미 있다. 51 + 3 = 54 다. 브리프의 52 는 다른 바탕에서 센 값으로 보인다(추측). 줄어든 셋은 plan 완료 판정과 같다.

## 6. 증명 표 행마다 시험

| 행 | 시험(파일:줄) | 판정 |
|---|---|---|
| AC-17a 판 고르기(단위 4) | version-pick.test.ts:111 · 117 · 122 · 129 | ✅ |
| AC-17a 적재와 읽기(통합 6) | seed-version.test.ts:131 · 157 · 184 · 205 · 230 · 264 | ✅ 157 의 다시 하기 두 줄은 M-5 |
| AC-17b(3) | seed-load.test.ts:201 · 232 · 254 | ✅ 실제 행 수로 비교 |
| AC-7e(단위 1 · 통합 1) | settings-compare.test.ts:62 · seed-load.test.ts:288 | ✅ |
| AC-7g(단위 1 · 통합 1) | settings-compare.test.ts:79 · seed-load.test.ts:321 | ✅ |
| AC-8i(1) | seed-load.test.ts:340 | ✅ |
| 5절 판 적재 규칙(6) | version-pick.test.ts:142 · 166 · 188 · 211 · 256 · 300 | ✅ |
| 5절 설정값 시드(단위 5 · 통합 1) | settings-compare.test.ts:121 · 150 · 177 · 200 · 218 · seed-load.test.ts:386 | ✅ |
| 5절 적재(6) | seed-load.test.ts:414 · 456 · 521 · 560 · 624(건너뜀) · seed-version.test.ts:330 | ✅ |
| 명령(2) | seed-load.test.ts:654 · 726 | ✅ 적재 중 오류의 길은 시험이 없다(I-1) |
| 공통 | 컨트롤러 13:4x | ⚠️ 검토자가 다시 돌리지 않음 |

표 밖 시험은 다섯이다: '판 견주기'(version-pick.test.ts:87) · '규칙 이름 다섯'(149) · '칸마다 따로'(285) · '바꾸는 곳 넷과 출처 값'(settings-compare.test.ts:55) · '적재 시험용 자료'(seed-load.test.ts:167). '칸마다 따로'와 '시험용 자료'는 값어치가 크다(작업 3 완료 판정). 이름 · 상수 고정 둘은 가볍지만, `seed_load` 처럼 P9c · 2차가 기대는 글을 고정해 둘 만하다.

건너뛴 시험(seed-load.test.ts:624)의 조건 `seed/settings.json 있음`은 readSeedTree 뿌리와 같은 자리라 바르다. P6a 합친 뒤 돌 수 있다. P6a 워크트리의 지금 seed/ 로 같은 검사의 순수 몫을 돌린 결과는 아래와 같다. DB 몫은 돌리지 않았고, P6a 가 그 사이 바뀌면 다시 봐야 한다.

```
validateSeed(complete · through 1 · areas []) 종료 0 · 오류 0 · 규격 파일 오류 0
compareSettings(빈 DB · 덮어쓰기 seed.complete_through_level 1) 위반 0
checkSettingsCombos 위반 0 · checkFrameRelations 위반 0
```

## 7. 열린 장부(ledger-open.md 의 P7 관련 행)

| 행 | 판정 | 근거 |
|---|---|---|
| 12 opus-4-8 thinkingDefault 'none' | 아직 열림 | P6a 워크트리 seed/model-prices.json 은 지금도 여섯 행 모두 'adaptive'. 첫 개발용 적재 전 P6 몫 |
| 24 `PASSAGE_PICTURE_UNTIL_LEVEL` 허용 목록 | 아직 열림 | plan-p07b 9줄이 차의 허용 목록에 넣기로 했다. P7b 구현 몫 |
| 26 P8 메모 | 아직 열림 | P8 몫. 내용은 구현과 맞다(inserted 꼴 table · cell · revision · correction) |
| 27 P10~P12 읽기 함수 | 아직 열림 | read.ts 여섯 함수가 장부 글과 맞다. 쓰는 쪽 몫 |
| 28 P6 판 올리기 | 아직 열림 | 첫 개발용 적재 전 |
| 29 1-나 메모 | 아직 열림 | 토리 이야기 title · generation 이 없으면 거부하는 동작을 확인했다(load.ts:339-352) |
| 36 P7b 허용 목록 후보 | 아직 열림 | 아래 8절의 고침 메모를 반영하길 권한다 |

## 8. 넘길 메모

**P7b**
- 명령 꼴 · 입력 · 접속 변수는 plan-p07b 의 작업 파일 글(main 136줄 `pnpm seed:load`, dev-load 210 · 212줄)과 맞다.
- I-1 을 고치면 '적재 중 DB 오류'도 종료 2 다. 작업 파일은 0 이 아닌지만 보므로 바뀌지 않는다.
- `--areas` 는 공백을 다듬지 않는다(seed-load.ts:75). dev-load 입력 기본값을 공백 없이 두거나 작업 파일에서 공백을 지운다.
- 허용 목록 후보 대부분은 따로 넣지 않아도 된다. P7a 의 수는 모두 파일 맨 위 대문자 상수라 plan-p07b 78줄 규칙이 이미 뺀다. `CONNECTIONS` 는 scripts/ 라 src 훑기 밖이다. 시험 고정 값(NOW · 2026-11-01 · tori-extra)도 design-number 대상(src 만)이 아니다. fixture-setting 규칙이 시험 파일을 보는지는 P7b 가 확인한다.

**P8**
- 적재 보고 `--json` 의 inserted 를 seed/manifest 판 기록에 옮긴다.
- 행이 있는 단원 · 벌에 새로 생긴 칸(보강 수를 늘림 등)은 적재 앞 DB 의 가장 큰 개정을 넘어야 한다(new-cell-in-open-group).

**P10~P12**
- read.ts 로 읽고 start_revision 에 `currentSeedRevision()` 을 남긴다. content · item · spec 은 P4a 규격 Zod 로 푼다.
- 배치 answer 열은 answerNo · accepted · sentence 가운데 문항에 있는 것만 담는다. 회화 평가 카드 장의 item_type 은 'talk-sheet' 다.

**1-나**
- 토리 이야기 title · generation 을 필수로 하기 전까지 회화 적재는 story-field-missing 으로 거부된다.
- 옛 개정 행의 정정을 싣는 자리, seed/reviews → seed_reports, 회화 적재 때 `--areas` 에 talk 를 더하는 일이 남았다.
