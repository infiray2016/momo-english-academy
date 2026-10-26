# 검토 브리프 A2: P3a 학습일 · 설정 읽기 · 한 시계(code-reviewer · Opus · xhigh, 읽기 전용)

구현자 impl-p03a 가 격리 워크트리에서 끝낸 P3a 가운데 **작업 5~7 의 파일**을 설계 준수와 품질로 판정한다. 작업 1~4(스키마 · 마이그레이션 · DB 연결 · 시험용 Postgres)와 공용 변경은 다른 검토자(A1, `task-p03a-review-a1.md`)가 나란히 본다 — 그 파일은 가져오기 관계를 볼 때만 읽고 지적하지 않는다. 첫 검토라 닫힌 장부는 없다. 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p03a-a2.md`(메인 저장소).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a4f928c00fc43a1e8`(바탕 a28ee9f, 브랜치 `feature/1a-p03a-db-clock`). 파일 일곱: `src/core/learning-day.ts` · `src/server/settings/index.ts` · `src/server/clock/index.ts` · `tests/fixtures/settings.ts` · `tests/unit/learning-day.test.ts` · `tests/integration/settings.test.ts` · `tests/integration/clock.test.ts`. `tests/unit/gate-probe.test.ts` 가 잠깐 보이면 컨트롤러의 관문 실기 확인용이라 무시한다.
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p03a-report.md`('설계와 다르게 한 것' 6 · 7, '남은 우려' 1 · 5).
- 명령은 읽기와 시험 실행만. `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm test` · `pnpm test:int`(embedded-postgres, 약 1.5초). 컨트롤러 재확인(20:1x): biome 0 · 단위 57 · 통합 22 · deps 0 · spec-trace missing-test 63(AC-N5 · AC-N7 · AC-7g 빠짐).

## 대조할 정본 · plan(메인 저장소 `/Users/hikaru/workspace/momo-english-academy`)
1. plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p03a-DB-시계-설정.md`: 목표(학습일 · 설정 읽기 · 한 시계 문단), '파일별 값' 6(learning-day) · 7(clock) · 8(settings) · 11(fixtures), 위험 10 · 11 · 12 · 14, '컨트롤러 결정(승인 때)'(마 preview 또는 test, 아 정적 검사 범위)와 '구현 뒤(20:1x)' 문단, 증명 표(AC-N7 · AC-7g · 12절 설정 읽기 · 묶음 위험 7 한 시계).
2. 정본 `specs/02-1-영역-단원-승급.md` 3.1 학습일 문단(33줄), `specs/01-개요.md` 또는 `specs/README.md` 지도로 11절 (4-1) 시각 당기기 문장, `specs/09-설정값.md` 12절 `app.timezone` · `app.day_start_hour` · `access.cookie_days` · `parent.pin_max_attempts` · `parent.lock_minutes` · `session.length_factor` 행(fixture 값 대조) · 범위 '프로필' 키의 기본 행 규칙(AC-12c '프로필 범위 키는 그 프로필의 행이 없으면 기본 행 값을 읽는다'), `specs/11-요구사항과-수용-기준.md` AC-N7 · AC-7g · NFR-7, `specs/10-결정-기록.md` C55 (3) · C56 (1).
3. 구현 브리프 `.superpowers/sdd/2026-10-16-1-가-구현/task-p03a.md`('지킬 것': 한 시계 · 설계 숫자는 fixture · server-only 첫 줄).

## 판정할 것
1. `learningDayOf`. Intl `formatToParts`(en-CA · hourCycle h23)로 벽시계 날짜 · 시를 읽고 경계 앞이면 `Date.UTC` 로 하루 빼는 꼴이 plan 값 6 대로이고 일광 절약 시간 · 월말 · 연말 · 윤년 경계에서 맞는지, `dayStartHour` 0~23 정수 검사 · 틀린 시간대의 RangeError, 형식기 Map 캐시, 현재 시각을 읽지 않음, db · next · react · `src/server` 가져오기 없음.
2. 시계(`src/server/clock/index.ts`). `readShiftDays` 가 `VERCEL_ENV === "preview"` 또는 `NODE_ENV === "test"` 일 때만 변수를 읽고(환경 객체의 읽기를 기록하는 시험이 실제로 '읽지 않음'을 증명하는지), 비었거나 없으면 0, `^\d+$` 밖은 `ClockConfigError`, `createClock({ env, realNow })` · `MS_PER_DAY` · `appClock` · `now()`, 이 파일만 `Date.now()`, DB · 설정 가져오기 없음, `server-only` 첫 줄. 남은 우려 5(모듈 읽기 때 appClock 생성 → 틀린 값이면 모든 요청 실패)가 plan 뜻대로인지.
3. 설정 읽기(`src/server/settings/index.ts`). 키 목록을 질의 한 번(`inArray`, 다르게 한 것 7)으로 읽고 프로필 행 → 기본 행 차례(B5-19), 없으면 `SettingMissingError(key)` · 규격 어긋남 `SettingInvalidError(key)`, 코드 기본값 없음, 키별 Zod 규격은 부르는 쪽이 넘기되 `appTimezoneSchema` · `appDayStartHourSchema` 를 내보낸 것(다르게 한 것 6), `{ db = getDb() }` 꼴, `profileId` 없을 때 `profile_id IS NULL` 만, `server-only`.
4. fixture(`tests/fixtures/settings.ts`)가 12절 기본값과 글자대로 같은지(여섯 키). 시험이 숫자를 fixture 에서 읽는지(코드 · 시험에 박힌 설계 숫자 0).
5. 시험의 실체와 이름. AC-N7 다섯 · AC-7g 여섯 · 설정 읽기 다섯 · 한 시계 정적 검사 하나가 증명 표 이름과 글자 그대로인지, 각 시험이 이름대로 단언하는지(예: 'CLOCK_SHIFT_DAYS 를 읽지 않는다'가 읽기 추적으로, '질의 한 번'이 질의 수 셈으로, '기본값에 now() 없음'이 information_schema 또는 SQL 파일로), 한 시계 정적 검사가 `src/{core,server,db}` · `src/proxy.ts` 를 훑어 주석 · 문자열 속 `Date.now` 를 어떻게 다루는지(거짓 양성 · 음성), 통합 시험이 test-db 의 파일별 DB 를 쓰고 설정 행을 `seedSettings` 로 넣는지, 시각 민감성(실제 시계를 쓰는 곳이 있는지).
6. 구현자 '다르게 한 것' 6 · 7 판정, '남은 우려' 1(Drizzle jsonb 가 숫자 꼴 문자열을 숫자로 풂 — 설정 규격 검사를 빠져나갈 길이 지금 키에 있는지) · 5 판정.
7. 품질. TypeScript strict, 오류 클래스 이름 · 메시지(키 이름 포함, 값은 안 넣음), 한글 식별자 없음, 비밀값 없음.

## 보고 꼴(`review-p03a-a2.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n).
- 지적마다 번호 · 심각도(Critical · Important · Minor) · 파일:줄 · 근거(정본 절 · plan 줄 · 문장, 외부 사실은 출처와 확인 정도) · 고치는 법 한 줄. 근거 없는 지적은 넣지 않는다.
- 표 하나: '다르게 한 것' 6 · 7 · 남은 우려 1 · 5 각각 '수용 · 고칠 것(근거)'. 표 하나: 증명 표의 AC-N7 · AC-7g · 12절 설정 읽기 · 한 시계 행마다 '시험 있음(이름) · 없음'.
- 마지막 메시지 첫 줄은 판정, 그 뒤 요지 8줄 안쪽. fix 뒤 재검토는 따로 브리프.
