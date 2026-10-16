# fix 1 보고: P3a DB · 시계 · 설정 읽기(implementer · Opus · high, 같은 워크트리)

브리프 `task-p03a-fix1.md`, 검토 `review-p03a-a1.md` · `review-p03a-a2.md`, plan(메인 저장소 판, 20:5x 고침). A1 M-1 ~ M-4 와 A2 M1 · M2 를 고쳤다. A1 M-5 와 A2 M3 은 브리프대로 손대지 않았다. `drizzle/` 은 손으로 고치지 않았고 git 쓰기 명령도 쓰지 않았다.

## 지적별

| 지적 | 판정 | 파일:줄 · 시험 |
|---|---|---|
| A1 M-1 실패 경로 정리 | ADDRESSED | `tests/integration/global-setup.ts:86-107`. `initialise()` 부터 `provide` 까지(새 함수 `prepareCluster`, :110-182)를 try 로 감쌌다. catch 는 `cleanUp()`(시작에 성공했으면 `pg.stop()`, 그 뒤 언제나 `rmSync(databaseDir, …)`)을 한 뒤 다시 던진다. 정상 경로는 같은 `cleanUp` 을 정리 함수로 돌려준다. 실행으로도 확인했다: 깨진 마이그레이션(`CREATE TABL broken (;`)을 담은 스크래치 폴더에서 setup 을 돌리면 `Failed query: CREATE TABL broken (;` 로 던지고, `momo-pg-*` 임시 폴더가 남지 않으며 `pgrep` 에 Postgres 프로세스가 없다 |
| A1 M-2 시작 실패 원인 | ADDRESSED | `global-setup.ts:23`(`LOG_TAIL_LINES = 40`), `:72-84`(onLog 가 빈 줄을 빼고 끝 40줄을 모음, 성공 때는 내지 않음), `:121-129`(`start()` 가 거부하면 `시험용 Postgres 를 띄우지 못했다. 로그 끝 N줄:\n…` 에 `cause` 를 단 Error 로 다시 던짐). 시작 실패 경로는 실행으로 만들지 못했다(원본 읽기만) |
| A1 M-3 jsonb 다시 풀기 | ADDRESSED | 새 파일 `src/db/schema/jsonb.ts:1-18`(`customType`, `dataType` 은 `"jsonb"`, `toDriver` 는 `JSON.stringify`, `fromDriver` 는 받은 값 그대로). `content.ts:18` · `learning.ts:38` · `operations.ts:34` 가 pg-core 의 jsonb 대신 이것을 가져온다(jsonb 열 27개 전부). `pnpm db:generate` 결과는 `No schema changes, nothing to migrate 😴` 이고 새 파일은 생기지 않았다(`notices_seen` 의 `default({})` 도 같은 SQL). 새 시험 "DB 연결: jsonb 의 최상위 문자열 · 수 · 불 · null 값은 그대로 읽힌다"(`rls-grants.test.ts:286-`): `"12"` · `12` · `true` · `null` · `"1.0"` · `"true"` · `"null"` 을 넣고 Drizzle 로 읽어 `toStrictEqual`, 같은 행의 `jsonb_typeof` 가 string · number · boolean · null · string · string · string 인지 본다. `settings.test.ts:140-143` 의 '규격에 어긋나면' 사례는 원래 뜻(글자 `"4"`)으로 되돌렸다 |
| A1 M-4 더하기만 검사 | ADDRESSED | `rls-grants.test.ts:178`. 시험 이름을 "마이그레이션: drizzle/*.sql 에 DROP TABLE · DROP COLUMN · DROP TYPE · DROP SCHEMA · RENAME · SET DATA TYPE · SET NOT NULL 이 없다" 로 바꿨다. `:181-` 정규식에 `\bSET\s+DATA\s+TYPE\b` · `\bSET\s+NOT\s+NULL\b` 를 더했다. 표본 단언 셋도 넣었다: drizzle-kit 꼴 `ALTER COLUMN … SET DATA TYPE` · `SET NOT NULL` 은 잡고 `ADD COLUMN … NOT NULL` 은 잡지 않는다 |
| A2 M1 한 시계 정규식 | ADDRESSED | `tests/unit/learning-day.test.ts:150-151` 을 검토 보고의 대체 식 그대로 바꿨다. 표본 단언(`:152-165`, 시험 안 `:173-178`): 잡는 것 다섯(`Date.now()` · `realNow: Date.now` · `new Date()` · `new Date;` · `Date()`), 안 잡는 것 다섯(`new Date(ms)` · `new Date(Date.UTC(…))` · `toDate(` · 꼴 이름 `Date` · 줄 넘긴 인자). 시험 이름은 그대로다 |
| A2 M2 기준 날짜 | ADDRESSED | `learning-day.test.ts:12` 를 `BASE_DAY = "2026-12-31"` 로 바꿨다. AC-N7 다섯이 그대로 통과한다('자정 앞뒤' · '경계 10분 앞'은 01-01 → 12-31 로 달과 해를 함께 넘는다) |
| A1 M-5 · A2 M3 | 바꾸지 않음 | 브리프대로(C60 · 수용) |

## 설계와 다르게 한 것
- jsonb 왕복 시험의 `null` 표본은 `sql\`'null'::jsonb\`` 로 넣었다. Drizzle 은 JS `null` 을 `toDriver` 에 넘기지 않고 SQL NULL 로 보낸다. 그래서 그대로 넣으면 `settings.value` 의 NOT NULL 에 걸린다(23502, 첫 실행에서 확인). 읽을 때는 JSON null 이 JS `null` 로 그대로 온다. 이 점은 아래 '남은 우려' 1 에 적었다.
- M-1 의 정리는 '시작에 성공한 때만 `stop()`' 이다. 설치판 `embedded-postgres` 의 `stop()` 은 `this.process` 가 있으면 그 프로세스의 'exit' 를 기다린다. 그런데 `start()` 가 거부되는 것은 프로세스가 이미 닫힌 뒤('close')라서, 그때 `stop()` 을 부르면 오지 않을 'exit' 를 기다리며 멈출 수 있다(dist/index.js:223-225 · 236-246 을 읽고 판단). 브리프의 '시작 전이면 그냥 돌아오게'와 뜻은 같다.

## 바뀐 파일
- 새 파일: `src/db/schema/jsonb.ts`(18줄)
- 고친 파일:
  - `src/db/schema/content.ts` · `learning.ts` · `operations.ts`: import 한 줄씩. pg-core 의 `jsonb` 를 빼고 `./jsonb` 를 가져온다. 열 정의는 그대로다
  - `tests/integration/global-setup.ts`(182줄)
  - `tests/integration/rls-grants.test.ts`: import `inArray` · `sql`, :178-200 · :286-
  - `tests/integration/settings.test.ts:140-143`
  - `tests/unit/learning-day.test.ts:11-12` · `:149-165` · `:173-178`
- 공용 파일 · `drizzle/` 은 그대로다.

## 명령 출력(PATH 에 v24.22.0 bin)
| 명령 | 결과 |
|---|---|
| `pnpm exec biome ci --colors=off .` | Checked 39 files. No fixes applied |
| `pnpm build` | Compiled successfully · TypeScript 끝(오류 0). `pnpm exec tsc --noEmit` 도 0 |
| `pnpm test` | Test Files 6 passed · Tests 57 passed |
| `pnpm test:int` | Test Files 3 passed · Tests 23 passed(22 + jsonb 왕복 1), Postgres 시작 444ms |
| `pnpm check:deps` | no dependency violations found (20 modules, 28 dependencies cruised) |
| `pnpm spec:trace` | `15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 24 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 63`(그대로) |
| `pnpm check:bundle` | 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 6 · 대조한 값 0 · 위반 0 |
| `pnpm db:generate` | `No schema changes, nothing to migrate 😴`. `drizzle/` 은 0000 · 0001 · meta 그대로 |
| 비밀값 grep | 추적 파일은 `git grep` 0건, 새 파일은 `grep -rnE` 로 src · tests · drizzle · 설정 파일 0건 |

## 남은 우려
1. Drizzle 은 jsonb 열에 JS `null` 을 쓰면 SQL NULL 로 보낸다(JSON null 이 아니다). 비울 수 있는 jsonb 열에서는 'JSON null' 과 'NULL' 이 구별되지 않고, NOT NULL 열에는 JS `null` 을 쓸 수 없다. 최상위 null 이 뜻을 갖는 값(예: 설정값이 null)이 생기면 그 하위 plan 이 정해야 한다.
2. M-2 의 시작 실패 경로(로그 끝 줄을 붙여 던지기)는 실행으로 확인하지 못했다. 실패 경로 확인은 M-1 의 마이그레이션 실패로만 했다.
3. 끝내기 관문 실기 확인: gate-probe 시험을 둔 채 끝냈을 때 막힘 메시지가 이 실행에 돌아오지 않았다. 컨트롤러가 파일을 지웠다고 해서 2단계(막힘 메시지 기록)는 하지 못했다. 관문 판단은 컨트롤러가 `.claude/state/implementer-stop-gate.log` 에서 확인하기 바란다.
