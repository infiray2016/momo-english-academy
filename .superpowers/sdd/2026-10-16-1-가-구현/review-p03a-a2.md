Approved(C 0 · I 0 · M 3)

# 검토 A2: P3a 학습일 · 설정 읽기 · 한 시계(code-reviewer · Opus · xhigh, 읽기 전용)

대상: 워크트리 `.claude/worktrees/agent-a4f928c00fc43a1e8`(브랜치 feature/1a-p03a-db-clock, 바탕 a28ee9f)의 파일 일곱. 브리프 `task-p03a-review-a2.md`, 구현 보고 `task-p03a-report.md`, plan `plan-p03a-DB-시계-설정.md`, 정본 3.1 · 11절 (4-1) · 12절 · AC-N7 · AC-7g · AC-12c · NFR-7 · C55 (3) · C56 (1).
명령: 시험 묶음은 다시 돌리지 않았다(컨트롤러 20:1x 재확인 값: 단위 57 · 통합 22). 의심을 확인하려고 스크래치 폴더에서 두 가지만 돌렸다. (가) `learningDayOf` 를 월말 · 연말 · 윤년 · 일광 절약 시간 경계 16건과 틀린 경계 시각 5건 · 잘못된 날짜 1건에 넣어 봄(모두 맞음). (나) 한 시계 정적 검사 정규식을 표본 문자열에 넣어 봄. 작업 트리는 바꾸지 않았다.

## 1. 설계 준수

- ✅ `learningDayOf`(src/core/learning-day.ts:32-62). plan 값 6(plan:201-204) 그대로다. en-CA · hourCycle h23 의 `formatToParts` 로 벽시계 날짜와 시를 읽고(:14-21, :46-57), 시가 경계보다 작으면 `Date.UTC(year, month - 1, day - shift)` 로 하루를 뺀다(:58-61). `dayStartHour` 는 정수 · 0 이상 · 24 미만이 아니면 RangeError(:37-45), 틀린 시간대는 Intl 의 RangeError, 형식기는 시간대별 Map(:8-25). 가져오기가 하나도 없고 현재 시각을 읽지 않는다. 스크래치 확인: KST 10-31→11-01 · 12-31→01-01 · 윤년 2028-03-01 03:30→02-29 · 평년 2027-03-01 03:30→02-28 · 경계 0 시와 23 시 · America/New_York 봄 앞당김(01:59 EST → 03:00 EDT, 경계 2 · 4)과 가을 되돌림(01:30 EDT · 01:30 EST, 경계 1) 모두 맞다. NaN · Infinity · 4.5 · -1 · 24 는 RangeError, `new Date(NaN)` 도 RangeError.
- ✅ 시계(src/server/clock/index.ts). 첫 줄 `server-only`(:1). `readShiftDays` 는 `VERCEL_ENV === "preview" || NODE_ENV === "test"` 가 아니면 변수를 읽지 않고 0(:30-31), 비었거나 없으면 0(:33), `^\d+$` 밖은 `ClockConfigError`(:12, :34-38). `createClock({ env = process.env, realNow = () => Date.now() })`(:42-55) · 단위 상수 `MS_PER_DAY`(:11) · `appClock`(:57) · `now()`(:60-62). DB · 설정을 가져오지 않는다. 저장소 전체 grep 에서 `Date.now(` 호출은 이 파일 :44 하나뿐이다. C55 (3) · plan 결정 마와 같다.
- ✅ 설정 읽기(src/server/settings/index.ts). 첫 줄 `server-only`. 키 목록을 `inArray` 질의 한 번으로 읽고(:68-83), 키마다 그 프로필 행(scope profile · 같은 profile_id) → profile_id 가 빈 행 차례로 고른다(:86-94, B5-19 · AC-12c 마지막 문장). 없으면 `SettingMissingError(key)`(:95), 규격 어긋남은 `SettingInvalidError(key, issues)`(:96-98), 코드 기본값 없음. `{ profileId = null, db = getDb() }` 꼴(:64), profileId 가 없으면 `profile_id IS NULL` 만(:79-81). settings 는 (key, profile_id) NULLS NOT DISTINCT 유일 제약이 있어(src/db/schema/operations.ts:56-58) `rows.find` 가 늘 같은 행을 고른다.
- ✅ fixture(tests/fixtures/settings.ts:1-9)는 plan 값 11(plan:227-235)과 글자 단위로 같고(diff 0), 12절 행(specs/09-설정값.md:89 · 95 · 96 · 126 · 127 · 130)의 범위 · 기본값 여섯과 같다.
- ✅ 시험 이름 17개가 증명 표(plan:353 · 354 · 359 · 360)와 글자 그대로 같고 빠지거나 넘친 것이 없다(기계 대조). 시험의 설계 숫자는 모두 `TEST_SETTINGS` 에서 읽는다. 시험에 남은 수(기준 날짜 · 10분 · 당기는 날 3 · 0.5 · 나누기 2)는 AC 문장의 예시이거나 임의 입력이다. 실제 시계를 쓰는 시험은 없다.
- ⚠️ diff 만으로 확인 못 하는 것: Turbopack 이 proxy 층에서 `server-only` 를 빈 모듈로 바꾸는지(plan 위험 8, P3b 작업 4 의 build), Vercel 에서 시스템 환경 변수 노출이 켜졌는지(위험 14, H1 · H4), AC-7g 의 나머지 몫(읽기 단원 통과 판정은 P12, 개발용 적재는 P7).

## 2. 잘한 점

- '읽지 않는다'를 결과값이 아니라 읽기 기록으로 증명했다. clock.test.ts:34-47 의 Proxy 가 get · has 를 적고, 운영 배포 시험(:99-117)은 틀린 값이 있어도 오류가 나지 않음까지 본다. 구현이 변수를 먼저 읽는 쪽으로 바뀌면 바로 깨진다.
- 질의 한 번을 드라이버의 debug 갈고리로 실제 질의를 세어 증명했고, 첫 연결의 형 조회를 미리 빼서(settings.test.ts:167-179) 우연한 통과가 없다.
- 기본값 시험(clock.test.ts:198-210)이 information_schema 로 public · drizzle 의 열을 보고, 현재 시각 함수 열 가지(now · clock_timestamp · statement_timestamp · transaction_timestamp · timeofday · current_timestamp · current_date · current_time · localtimestamp · localtime)를 잡으며, 열이 0개면 실패하게 막아 빈 통과를 없앴다.
- 정적 검사가 시계 파일을 실제로 찾았는지도 단언해(learning-day.test.ts:168) 훑는 경로가 틀려 아무것도 안 보는 경우를 막았다.
- `SettingInvalidError` 는 Zod 이슈를 담지만 Zod 4.6.7 은 `reportInput` 을 주지 않으면 입력값을 이슈에 넣지 않는다(설치판 zod/v4/core/util.js:602). 설정 값이 오류로 새지 않는다.
- AC-7g 첫 시험(clock.test.ts:84-97)은 학습일을 시험용 DB 의 설정 두 키로 읽어 계산해, plan 이 말한 '설정 읽기 → learningDayOf' 길을 그대로 탄다.

## 3. 지적

### M1 · Minor · 한 시계 정적 검사가 놓치는 꼴 셋
- 파일:줄: tests/unit/learning-day.test.ts:149(`CLOCK_READ`).
- 무엇이: 정규식이 `Date.now(` 호출과 빈 괄호 `new Date()` 만 잡는다. 표본 확인에서 현재 시각을 읽는 꼴 셋을 놓쳤다. 부르지 않고 넘기는 `createClock({ realNow: Date.now })`, 괄호 없는 `new Date;`, `new` 없는 `Date()`(현재 시각 글). 주석 · 문자열 속의 `Date.now()` · `new Date()` 는 잡으므로 거짓 양성은 닫힌 쪽 실패라 괜찮다.
- 근거: 11절 (4-1) '앱의 모든 시각은 한 시계 함수에서 읽는다'(specs/08-테스트와-기술.md:48), plan 값 7 '저장소에서 이 파일만 Date.now() 를 부른다'(plan:207), 묶음 위험 7(plan:360), 브리프 판정 5(거짓 양성 · 음성).
- 고치는 법: 정규식을 아래로 바꾼다. 표본 14건(위 셋은 잡고 `new Date(ms)` · `Date.UTC(` · `toDate(` · 꼴 이름 `Date` · 줄 넘긴 인자는 안 잡음)과 지금의 src/core · src/server · src/db 전체(시계 파일만 잡힘)로 확인했다.
```ts
const CLOCK_READ =
  /\bDate\.now\b|\bnew\s+Date\b(?!\s*\(\s*[^\s)])|(?<!\bnew\s+)(?<![\w.$])Date\s*\(/;
```

### M2 · Minor · 학습일 시험이 달 · 해를 넘는 하루 빼기를 한 번도 지나지 않는다
- 파일:줄: tests/unit/learning-day.test.ts:12(`BASE_DAY = "2026-10-15"`), 대상 src/core/learning-day.ts:59.
- 무엇이: 다섯 시험이 모두 16일에서 15일로 빼므로 `Date.UTC(year, month - 1, day - shift)` 가 0일을 전달 말일로 넘기는 길이 시험되지 않는다. 날짜를 글로 다루는 꼴로 바뀌어도 다섯 시험이 다 통과한다. 지금 코드는 맞다(위 스크래치 확인).
- 근거: plan 값 6 'Date.UTC 로 날짜만 셈'(plan:202), 브리프 판정 1(월말 · 연말 · 윤년 경계).
- 고치는 법: `BASE_DAY` 를 `"2026-12-31"` 로 바꾼다. 다섯 시험의 기대값은 그대로 성립하고, '자정 앞뒤'와 '경계 10분 앞'이 01-01 → 12-31 로 달과 해를 함께 넘는다.

### M3 · Minor · 오류 메시지 둘에 값이 들어간다
- 파일:줄: src/server/clock/index.ts:36(`JSON.stringify(raw)`), src/core/learning-day.ts:43(`${dayStartHour}`).
- 무엇이: 브리프 기준은 '키 이름 포함, 값은 안 넣음'인데 두 메시지가 받은 값을 붙인다. 설정 오류 둘(settings/index.ts:15 · :25)은 기준대로다. 두 값 모두 비밀값이 아니라 새는 위험은 낮다.
- 근거: 브리프 판정 7.
- 고치는 법: 값 대신 무엇이 틀렸는지만 적거나(예: '0 이상의 정수가 아닙니다'), 비밀값이 아닌 설정 값은 넣어도 된다고 컨트롤러가 예외로 닫는다.

## 4. 다르게 한 것 · 남은 우려 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| 다르게 한 것 6: `appTimezoneSchema` · `appDayStartHourSchema` 를 설정 모듈에서 내보냄 | 수용 | 부르는 쪽이 규격을 넘기는 계약(plan:214)은 그대로이고 규격 내용은 plan:215 문장 그대로다(settings/index.ts:40-50). P4a 의 settings.json 규격은 값 꼴만 넓게 받고 키별 규격이 없어(P4a 워크트리 src/core/seed/schema/reference.ts:106-113) 겹치지 않는다. 뒤에 시드 검증(src/core)이 같은 키별 규격을 쓰게 되면 core-no-framework 때문에 규격을 src/core 로 옮기고 설정 모듈이 다시 내보내야 한다. P6 브리프 메모로 충분하다 |
| 다르게 한 것 7: `key = ANY(…)` 대신 `inArray` | 수용 | `in ($1, …)` 와 `= ANY($1)` 는 같은 행을 돌려준다. 질의 한 번은 settings.test.ts:157-197 의 질의 셈이 증명한다 |
| 남은 우려 1: Drizzle jsonb 가 숫자 꼴 글을 숫자로 풂 | 수용(P6 · P7 메모 그대로) | 설치판으로 확인했다. drizzle-orm 0.45.4 의 `pg-core/columns/jsonb.js:24-33` 은 글이면 한 번 더 JSON 으로 풀고, `postgres-js/driver.js:21-22` 는 jsonb 쓰기만 그대로 넘겨 읽기는 postgres-js 가 이미 한 번 푼다. 지금 여섯 키 가운데 글 값은 app.timezone 하나이고 'Asia/Seoul' 은 JSON 으로 풀리지 않아 영향이 없다. 빠져나가는 방향은 수 키에 글 '4' 가 들어온 경우로, 4 로 읽혀 수 규격을 통과한다. P4a 규격도 글을 받으므로 시드 검증도 못 잡지만 뜻한 값으로 동작해 해는 작다. 반대 방향('123' · 'true' · 'null' 같은 글 값 키)은 SettingInvalidError 로 닫힌 쪽 실패다. 고칠 때는 `value: sql<unknown>` 로 열을 골라 Drizzle 의 열 변환을 건너뛰면 한 번만 푼다(drizzle `sql/sql.js:52` 기본 decoder 가 그대로 넘김, `utils.js:14-15`) |
| 남은 우려 5: appClock 을 모듈 읽기 때 만들어 틀린 CLOCK_SHIFT_DAYS 면 모든 요청 실패 | 수용(H13 안내) | plan 값 7 `export const appClock = createClock()`(plan:208)과 AC-7g 이름 '시계를 만들 때 오류다'가 뜻한 동작이다. 운영 배포는 변수를 읽지 않아 이 길이 없다(clock/index.ts:30-31). 프리뷰 · 시험에서만 일어나고, Node 는 모듈 평가 오류를 그 프로세스 동안 남기므로 값을 고친 뒤 다시 배포해야 풀린다. 이 점을 H13 안내에 함께 적는다 |

## 5. 증명 표 대조

| 증명 표 행 | 시험 | 위치 |
|---|---|---|
| AC-N7(P3 몫: 학습일 경계) | 있음, 다섯 이름 그대로 | tests/unit/learning-day.test.ts:64 · 81 · 96 · 109 · 127 |
| AC-7g(P3 몫: 시계) | 있음, 여섯 이름 그대로 | tests/integration/clock.test.ts:84 · 99 · 119 · 132 · 152 · 198 |
| 12절 설정 읽기 · 묶음 위험 4 | 있음, 다섯 이름 그대로 | tests/integration/settings.test.ts:70 · 85 · 110 · 137 · 157 |
| 묶음 위험 7(한 시계) | 있음, 정적 검사 하나 + AC-7g 기본값 시험 | tests/unit/learning-day.test.ts:159, tests/integration/clock.test.ts:198 |

## 6. 범위 밖 관찰(지적 아님)

- 질의 SQL 안에서 `now()` · `CURRENT_TIMESTAMP` 를 쓰는 길은 정적 검사도 기본값 시험도 잡지 않는다(표본 확인). plan 결정 아(plan:310)로 정한 범위라 이번 지적은 아니다. P3b(잠금 해제 시각 · IP 행 갱신 시각)와 P9(ai_calls) 브리프에 '시각은 한 시계 값을 매개변수로 넘긴다'를 적기를 권한다. 앱 함수 이름이 `now()` 라 단순 정규식으로 막으면 거짓 양성이 난다.
- 나란히 도는 P2a(agent-a0ffe8037fa827af6) · P4a(agent-a6ef72438a158a2f3) 워크트리의 src · scripts 에 `Date.now(` · `new Date()` 가 없어, 합칠 때 한 시계 정적 검사와 부딪히지 않는다(2026-10-16 확인).

## 7. 판정

Approved. Critical · Important 는 없다. Minor 셋(M1 정적 검사 정규식, M2 기준 날짜, M3 오류 메시지의 값)은 각각 한두 줄이라 컨트롤러가 직접 고치거나 수용으로 닫으면 된다. '다르게 한 것' 6 · 7 은 수용, 남은 우려 1 · 5 는 plan 의 메모 처리 그대로 수용이다.
