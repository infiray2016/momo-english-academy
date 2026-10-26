# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P3a DB · 시계 · 설정 읽기

spec: `specs/` 정본(5절 데이터 · 10절 기술 구성의 DB · 접근 제어 행 · 11절 1-가 (1) · (4-1) · 3.1 학습일 · 12절 설정값 · 15절 AC-N5 · AC-N7 · AC-7g, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P3 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: done(커밋 25041d9 21:1x, PR 은 H15 뒤. H3 의 db:migrate 는 요청자 몫)
승인: 컨트롤러 2026-10-16 18:2x(결정 C55 · C56 · C57, 요청자는 PR 병합 때 본다 — H14) · 브랜치 · 워크트리: `feature/1a-p03a-db-clock`(승인 문서 커밋 끝에서 격리 워크트리로 가지 침 — `Agent(isolation: worktree)` 가 만들고, 끝난 뒤 컨트롤러가 브랜치 이름을 바꾼다) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P3 은 파일 열 개를 넘어 둘로 나눴다(묶음 plan 위험 12). 이 파일은 앞 절반(DB · 한 시계 · 학습일 · 설정 읽기)이다. 뒤 절반(가족 접근 코드 · proxy.ts · 함수 안 확인 · CRON_SECRET · 접근 코드 화면 · 첫 화면 e2e 고치기 · Data API 확인)은 같은 폴더의 `plan-p03b-접근-제어.md` 이고, 이 plan 이 끝난 브랜치 끝에서 가지 친다(`feature/1a-p03b-access`).
나눈 뒤에도 손으로 쓰는 파일이 열여섯이라 PR 하나 기준(열 개)을 넘는다. 작업 4 뒤에서 PR 을 둘(A1 · A2)로 끊을 수 있게 순서를 짰다(정할 것 가). drizzle-kit 이 만든 파일은 수에서 뺐다. 정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다. 판과 출처는 2026-10-16 에 확인했다(위험 절 끝 '확인한 사실과 출처').

## 목표 (Goal)

- 5절의 Postgres 테이블 29개를 Drizzle 스키마로 만든다. 마이그레이션은 drizzle-kit 의 generate → migrate 로만 하고 push 를 쓰지 않는다(10절 'Drizzle Kit 한 곳에서만'). 마이그레이션은 열 · 테이블을 더하기만 한다(5절).
- 모든 테이블은 RLS 를 켜고, 마이그레이션이 anon · authenticated 의 권한을 회수한다. 시험용 Postgres 에서 RLS 켜짐 · 권한 0 · anon 으로 조회하면 권한 오류를 시험으로 증명한다(10절 접근 제어, AC-N5 의 DB 몫, 묶음 위험 5 · 15).
- 서버 DB 연결은 Supabase 트랜잭션 풀러(포트 6543)에 prepared statement 를 끄고(`prepare: false`) 붙는다. DB 접근은 서버의 Drizzle 연결로만 한다(10절 DB · 접근 제어).
- 앱의 모든 시각은 한 시계 함수에서 읽는다. 기록하는 시각과 학습일도 그렇고 DB 기본값 now() 를 쓰지 않는다. 프리뷰 배포에서만 시계에 `CLOCK_SHIFT_DAYS` 날 수를 더하고, 운영 배포에서는 그 변수를 읽지 않는다(11절 (4-1), AC-7g 의 P3 몫).
- 학습일은 `app.timezone`(Asia/Seoul) 기준 `app.day_start_hour`(4)시에 바뀐다. 계산은 시각을 인자로 받는 순수 함수다(3.1, NFR-7, AC-N7 의 P3 몫).
- 설정 읽기 함수는 settings 에서 키를 읽는다. 범위가 '프로필'인 키는 그 프로필 행을, 없으면 profile_id 가 빈 기본 행을 쓴다(12절, 검토 5회차 B5-19). 키가 없으면 오류이고 코드에 기본값을 두지 않는다(묶음 위험 4).
- 완료 판정: 개발용 Supabase DB 에 마이그레이션 두 개가 적용된다(H3). CI `ci / integration` 이 시험용 Postgres 로 돈다.

## 바뀌는 파일 (Files that change)

손으로 쓰는 파일은 열여섯이다(모두 새 파일). drizzle-kit 이 만든 파일과 공용 파일 변경 요청은 따로 적고 세지 않는다.

| 파일 | 신규 / 수정 | 무엇을 | PR |
|---|---|---|---|
| `drizzle.config.ts` | 신규 | drizzle-kit 설정. 스키마 세 파일 · 출력 `drizzle/` · 마이그레이션 기록 표(아래 '파일별 값' 1) | A1 |
| `src/db/schema/content.ts` | 신규 | 공용 열거형과 시드 테이블 8(아래 2 · 3) | A1 |
| `src/db/schema/learning.ts` | 신규 | 학습 기록 테이블 13(아래 3) | A1 |
| `src/db/schema/operations.ts` | 신규 | 설정 · 인증 · AI · 알림 · 신고 테이블 8(아래 3) | A1 |
| `drizzle/0001_api_roles_revoke.sql` | 신규(빈 사용자 정의 마이그레이션을 만들어 채움) | anon · authenticated 권한 회수와 기본 권한 바꾸기(아래 4) | A1 |
| `src/server/db/index.ts` | 신규 | `server-only`. postgres.js 연결(prepare 끔)과 Drizzle(아래 5) | A1 |
| `tests/integration/global-setup.ts` | 신규 | 시험용 Postgres 를 띄우고 Supabase 역할 · 기본 권한을 흉내 낸 뒤 마이그레이션을 본 DB 하나에 적용(아래 9) | A1 |
| `tests/integration/test-db.ts` | 신규 | 시험 파일마다 본 DB 를 복사한 DB 를 만들고 지우는 도우미 · 설정 행 넣기(아래 10) | A1 |
| `tests/integration/rls-grants.test.ts` | 신규 | AC-N5 의 DB 몫 · 더하기만 정적 검사 · 스키마 제약 · DB 연결(아래 '증명') | A1 |
| `src/core/learning-day.ts` | 신규 | 학습일 순수 함수(아래 6). 묶음 plan 의 P3 파일 묶음 밖이다(위험 9) | A2 |
| `src/server/settings/index.ts` | 신규 | `server-only`. 설정 읽기(아래 8) | A2 |
| `src/server/clock/index.ts` | 신규 | `server-only`. 한 시계 · 시각 당기기. DB · 설정을 가져오지 않는다(아래 7) | A2 |
| `tests/fixtures/settings.ts` | 신규 | 시험용 설정값(12절 기본값을 옮긴 것, 아래 11) | A2 |
| `tests/unit/learning-day.test.ts` | 신규 | AC-N7 · 한 시계 정적 검사 | A2 |
| `tests/integration/settings.test.ts` | 신규 | 설정 읽기 | A2 |
| `tests/integration/clock.test.ts` | 신규 | AC-7g | A2 |
| drizzle-kit 이 만든 파일(수에서 뺌) | 생성 | `drizzle/0000_<이름>.sql`(열거형 · CREATE TABLE 29 · 색인 · 외래 키 · RLS 켜기 29) · `drizzle/meta/_journal.json` · `drizzle/meta/0000_snapshot.json` · `drizzle/meta/0001_snapshot.json`. 적용한 뒤에는 손으로 고치지 않는다(위험 3) | A1 |

### 요청하는 공용 변경(컨트롤러가 합친다)

P2 · P4 와 같이 돈다. 격리 워크트리는 띄울 때 HEAD 에서 만들어지므로 컨트롤러가 미리 넣을 수 없다. 그래서 이 plan 의 구현자가 자기 워크트리에서 아래 1~7 을 글자 그대로 옮기고(작업 1 앞), 다른 워크트리와 합칠 때 컨트롤러가 충돌을 푼다(컨트롤러 결정, 승인 때. 7 도 넣는다).

| # | 파일 | 바꿀 것 | 까닭 |
|---|---|---|---|
| 1 | `package.json` · `pnpm-lock.yaml` | dev 의존 `embedded-postgres@17.10.0-beta.17`(정확한 판 `-E`). `pnpm.onlyBuiltDependencies` 에 `@embedded-postgres/darwin-arm64` · `@embedded-postgres/linux-x64` | 시험용 Postgres(정할 것 나). 플랫폼 꾸러미의 설치 스크립트(라이브러리 심볼릭 링크 만들기)가 돌아야 하는데 pnpm 10 은 기본으로 막는다(확인함) |
| 2 | `package.json` scripts | `"test:int": "vitest run --project integration"`(`--passWithNoTests` 뺌, P1a 가 예고함) · `"db:generate": "drizzle-kit generate"` · `"db:migrate": "drizzle-kit migrate"` | 첫 통합 시험 · 마이그레이션 명령 |
| 3 | `vitest.config.mts` | 뿌리 `resolve.alias` 에 `server-only` → 그 꾸러미의 `empty.js` 를 경로로(`fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url))` — 꾸러미 exports 가 그 파일을 이름으로 내보내지 않아 `server-only/empty.js` 는 Vite 가 풀지 못한다, 구현 때 바로잡음 20:1x)(두 프로젝트 공통). integration 프로젝트에 `globalSetup: ['tests/integration/global-setup.ts']` 와 `testTimeout`(파일 위 이름 붙인 상수) | `server-only` 의 기본 내보내기는 Node 에서 오류를 던진다(확인함). 시험용 Postgres |
| 4 | `.github/workflows/ci.yml` | `integration` 작업의 `if: ${{ false }}` 를 빼고 준비 네 줄 + `pnpm test:int` | CI `ci / integration`(묶음 plan 증명 절 머리). 컨테이너 서비스는 쓰지 않는다 |
| 5 | `.env.example` | `# 마이그레이션 접속 문자열(서버 전용, 세션 풀러 5432) — P3` 와 `MIGRATION_DATABASE_URL=` 두 줄 | drizzle-kit migrate 는 세션 풀러로 붙는다(위험 2) |
| 6 | `biome.json` | `files.includes` 에 `"!drizzle"` | drizzle-kit 이 만든 JSON 은 Biome 꼴과 달라 `biome ci`(구현자 끝내기 관문)를 깬다(위험 4) |
| 7 | `.dependency-cruiser.cjs` · `tests/unit/dependency-rules.test.ts`(권함) | 규칙 `db-only-from-server`: `src/` 가운데 `src/server/` · `src/db/` 밖은 `src/db/` · drizzle-orm · postgres 를 가져오지 않는다. 시험 표에 막는 예 · 허용 예 한 줄씩 | 10절 'DB 접근은 서버의 Drizzle 연결로만'을 선 위 검사로 둔다. 없어도 이 plan 은 돈다 |

### 파일별 값(구현자가 옮겨 쓸 것)

1. `drizzle.config.ts`. `.env.local` 이 있으면 Node 내장 `process.loadEnvFile` 로 읽는다(Next 문서는 `@next/env` 를 권하지만 pnpm 이 뿌리 `node_modules` 에 두지 않아 가져올 수 없다, 확인함). generate 는 DB 가 필요 없고 migrate 만 `MIGRATION_DATABASE_URL` 을 쓴다.

```ts
import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./src/db/schema/content.ts",
    "./src/db/schema/learning.ts",
    "./src/db/schema/operations.ts",
  ],
  out: "./drizzle",
  // migrate 만 쓴다. 세션 풀러(5432) 주소다. 트랜잭션 풀러는 prepared statement 를 받지 않는다(10절 · 위험 2)
  dbCredentials: { url: process.env.MIGRATION_DATABASE_URL ?? "" },
  migrations: { table: "__drizzle_migrations", schema: "drizzle" },
  strict: true,
  verbose: true,
});
```

generate 가 빈 url 로 멈추면(추측: 멈추지 않는다) `db:generate` 를 옵션만 쓰는 꼴(`drizzle-kit generate --dialect postgresql --schema … --out drizzle`)로 바꾸고 완료 보고에 적는다.

2. 스키마 공통 규칙.
   - 스키마 파일은 `server-only` 를 가져오지 않는다. drizzle-kit · `scripts/` · 시험이 Node 에서 바로 읽는다.
   - 모든 테이블은 `pgTable(...).enableRLS()` 로 만든다. 설치판 drizzle-orm 0.45.4 의 API 다. 온라인 문서의 `pgTable.withRLS(...)` 는 다음 큰 판(1.0 베타) 이름이라 쓰지 않는다(확인함). 정책(policy)은 두지 않는다. 앱은 테이블 소유자(postgres)로 붙으므로 RLS 를 FORCE 하지 않는다.
   - 기본 키는 `id uuid` 에 `defaultRandom()`(gen_random_uuid)이다. 예외는 둘이다. images 는 `key text`, ai_status 는 `id smallint`(값 1 하나). vocab 도 `id uuid` 대리 키이고 시드 키 `word` 는 유니크 열이다(C54 (3) · C56 (5), 승인 때 바꿈).
   - 시각 열은 `timestamp(…, { withTimezone: true, mode: "date" })` 이고 기본값을 두지 않는다. `defaultNow()` 와 now() SQL 을 쓰지 않는다(11절 (4-1)). 값은 한 시계(아래 7)에서 받는다. 학습일 열은 `date(…, { mode: "string" })`('YYYY-MM-DD').
   - 상수 기본값(false · 0 · 빈 JSON 객체)은 쓸 수 있다. 시각 기본값만 막는다.
   - jsonb 열은 `src/db/schema/jsonb.ts` 의 customType 하나를 쓴다(dataType 'jsonb', toDriver 는 JSON.stringify, fromDriver 는 받은 값 그대로). Drizzle 의 기본 jsonb 는 드라이버가 이미 푼 최상위 문자열("12")을 한 번 더 JSON.parse 해 수로 바꾼다(검토 A1 M-3, 20:5x). 생성 SQL 은 같다(`pnpm db:generate` 변화 없음을 fix 1 보고에).
   - 열 이름은 snake_case 를 열 정의에 그대로 적는다(Drizzle `casing` 옵션을 쓰지 않는다). TS 속성 이름은 camelCase.
   - 단계 · 단원 수(12 · 5)를 확인 제약에 넣지 않는다. `level >= 1` · `unit >= 0` · 시드 판 `>= 0` 만 둔다.
   - 시드 판 '개정.정정'(5절)은 정수 열 둘 `revision` · `correction` 이다. '개정 자리가 시작 개정 이하인 행 가운데 가장 높은 판'(5절) 고르기를 정렬 하나로 하려는 꼴이다.
   - 외래 키의 지울 때 동작. 프로필 쪽 행은 프로필을 따라 지운다(5.1 '프로필 삭제는 그 프로필의 모든 행을 지운다'). 예외로 `ai_calls.profile_id` 는 비운다(5.1). 시드 행을 가리키는 키(lesson_id · vocab_id · 평가 문항 id · image_key)는 지우기를 막는다(이전 판 행은 지우지 않는다, 5절). 같은 프로필 안에서 서로 가리키는 키(sessions → level_tests 등)는 따라 지우거나 비운다. 막으면 프로필 삭제가 실패한다.
   - 색인은 기본 키 · 유일 제약 · 부분 유일 색인만 둔다. 조회용 색인은 그 조회를 만드는 하위 plan 이 더하기 마이그레이션으로 더한다.

3. 테이블 29개. 표기: `?` 는 비울 수 있음, `→T(따라)` 는 ON DELETE CASCADE, `(막음)` 은 RESTRICT, `(비움)` 은 SET NULL. 꼴: `int2` smallint · `int4` integer · `int8` bigint(number 꼴) · `float8` double precision · `num(p,s)` numeric(문자열 꼴) · `tstz` timestamptz · `date` 문자열 날짜. 열의 뜻은 5절 표의 같은 칸이다. 정본에 없던 열 이름 · 꼴은 모두 (제안)이다.

열거형(`content.ts` 에 두고 다른 두 파일이 가져온다. 값은 영어 식별자, 괄호는 정본 낱말).

| 열거형 | 값 |
|---|---|
| `area` | reading(읽기) · writing(쓰기) · speaking(말하기) · talk(회화) |
| `lesson_kind` | assigned(배정) · reinforce(다지기) · remedial(보강) · alphabet(알파벳) · tori_story(토리 이야기) |
| `session_kind` | regular(정규) · remedial(보강) · practice(연습) · untried(안 해 본 수업) · retry(다시 하기) · review(복습) · level_test(단계 평가) · placement(배치 평가) |
| `session_status` | in_progress(진행) · completed(완료) · archived(보관) · aborted(중단) |
| `writing_part` | draft(초고) · rewrite(고쳐 쓰기) |
| `talk_segment` | greeting(인사) · today_words(오늘 쓸 말) · practice(말해 보기) · talk(대화) · more_talk(더 이야기하기) · wrap_up(정리) |
| `attempt_status` | done(완료) · awaiting_feedback(첨삭 대기) · feedback_failed(첨삭 못 함) |
| `speaker` | tori · child |
| `input_mode` | speech(말) · dont_know(모름) |
| `hint_kind` | english(영어) · meaning_only(뜻만) · none(없음) |
| `heard_help` | two_answers(답 두 개) · answer_example(답 예시) |
| `ask_kind` | first(처음 묻는 턴) · re_ask(다시 묻는 턴) |
| `vocab_state` | recognize(알아봄) · write(씀) · say(말함) |
| `level_test_kind` | level_test(단계 평가) · placement(배치 평가) · re_placement(재배치 평가) |
| `star_reason` | new_lesson(새 수업 완주) · untried_lesson(안 해 본 수업 처음 끝냄) |
| `image_license` | cc0 · cc_by · generated(자체 생성) |
| `setting_scope` | household(집 전체) · profile(프로필) |
| `parent_auth_kind` | pin · access_ip(접근 코드 실패를 세는 IP 행, P3b) |
| `ai_purpose` | writing_feedback · writing_check · speaking_eval · thinkout · talk_turn(12절 `ai.model.<호출>` 이름) · talk_closing(끝맺음 턴) · probe(확인 호출) |
| `ai_call_status` | success(성공) · refusal(거절) · validation_failed(검증 실패) · timeout(타임아웃) · error(오류) · limit(한도) · safety_cap(안전 상한) |
| `ai_rest_reason` | daily_cap(하루 안전 상한) · console_limit(콘솔 한도) · connection(연결 장애) · account(계정 확인 필요) |
| `progress_event_kind` | auto_judgement(자동 판정) · parent_adjustment(부모 조정) · revert(되돌림) · promoted_without_pass(평가 미통과 진급) · next_level_pending(다음 단계 준비 중) · seed_correction_recalc(시드 정정에 따른 다시 계산) · recalc_takeback(다시 계산으로 거둘 일이 생김) |
| `event_actor` | app · parent · developer |
| `report_source` | child · parent · developer |
| `report_reason` | wrong_answer(정답 틀림) · both_correct(보기 둘 다 맞음) · inappropriate(부적절) · too_hard(너무 어려움) · other(기타) · review_ok(알맞음) · review_easy(쉬움) · review_hard(어려움) · review_error(오류) |
| `report_status` | received(접수) · confirmed(확인) · no_issue(문제 없음) · corrected(정정 적재) |

값 묶음이 정본에서 아직 열린 셋(부모 확인 상태 · 부모 알림 종류 · 설정 변경 출처)은 `text` 로 두고, 그 기능을 만드는 하위 plan 이 값을 정한다(정할 것 바).

`content.ts` — 시드 테이블 8

| 테이블 | 열 | 유일 · 확인 제약 |
|---|---|---|
| level_specs | id · area · level int2 · cefr text · band text(단계 구간 '1-3' 등) · can_do text · spec jsonb(단계표 규격) · revision int4 · correction int4 | 유일(area, level, revision, correction) |
| unit_specs | id · area · level int2 · unit int2(0 은 알파벳 · 소리 단원) · learning_points jsonb · topic text · target_vocab text[](vocab.word) · revision · correction | 유일(area, level, unit, revision, correction) |
| vocab | id(uuid 대리 키) · word text(시드 키, 유일. P4 규격은 단어 자체가 id 이고 적재 P7 이 word 로 잇는다 — C54 (3) · C56 (5)) · meaning text · parts_of_speech text[] · example text? · band_level int2(단계 어휘 범위) · forms jsonb?(활용형) · image_key text? →images.key(막음) | 유일(word) |
| images | key text 기본 키 · path text · source text · license image_license · attribution text? · word text?(대응 단어) | — |
| placement_items | id · area · level int2 · form int2(벌, 1 = 가 · 2 = 나, P4 규격과 같은 꼴) · item_no int2 · is_spare bool(예비 여부) · item_type text · item jsonb · answer jsonb · revision · correction | 유일(area, level, form, item_no, is_spare, revision, correction) |
| lessons | id · area · level int2 · unit int2?(토리 이야기는 비움) · kind lesson_kind · lesson_no int2 · topic_variant int2?(주제 변형 번호, P4 규격과 같은 꼴) · list_title text · content jsonb · new_words text[] · unit_words text[] · generation jsonb(생성 기록) · revision · correction | 유일 NULLS NOT DISTINCT(area, level, unit, kind, lesson_no, topic_variant, revision, correction) |
| level_test_items | id · area · level int2 · form int2(벌) · item_no int2(회화는 카드 장 번호) · item_type text · item jsonb(지문 · 보기 · 정답 · 해설 · 연결 단원, 회화 카드는 턴 목록) · revision · correction | 유일(area, level, form, item_no, revision, correction) |
| model_prices | id · model text · effective_from date · input_usd_per_mtok · output_usd_per_mtok · cache_write_usd_per_mtok · cache_read_usd_per_mtok(넷 다 num(10,4)) · capabilities jsonb(생각 끄는 값 · 받는 effort · 서버 측 대체 모델 재시도 지원) | 유일(model, effective_from) |

`learning.ts` — 학습 기록 테이블 13

| 테이블 | 열 | 유일 · 확인 제약 |
|---|---|---|
| profiles | id · display_name text(한글 이름) · english_name text · tori_nickname text?(영어 이름이 vocab 단어와 같을 때의 별명, FR-1) · avatar text · topic_bundle text · alphabet_start bool(알파벳 단원 여부) · notices_seen jsonb(안내 종류 → 보인 시각, 기본 빈 객체) | — |
| profile_tracks | id · profile_id →profiles(따라) · area · level int2? · unit int2?(배치 전 비움) · placement_level int2? · chosen_start_level int2? · graduated bool(기본 false) · next_level_pending bool(기본 false) · friendship int2?(회화 행) · tori_stories_opened int2?(회화 행) | 유일(profile_id, area) |
| sessions | id · profile_id →profiles(따라) · area · level int2? · unit int2? · lesson_id uuid? →lessons(막음) · level_test_id uuid? →level_tests(따라) · kind session_kind · writing_part writing_part? · talk_segment talk_segment? · status session_status · score float8? · english_sentences int4(기본 0, C12 · C41) · started_at tstz · completed_at tstz? · learning_day date?(끝낸 학습일, 정할 것 다) · seed_revision int4? · seed_correction int4? | 부분 유일(profile_id, area) WHERE status = 'in_progress'(5절 '프로필 × 영역마다 진행 중 세션은 하나') |
| attempts | id · session_id →sessions(따라) · client_attempt_id text(기기가 만든 시도 id) · activity_no int2 · input jsonb? · attempted_at tstz · ai_feedback jsonb? · score float8? · word_results jsonb?(단어별 정오) · word_count int4? · status attempt_status | 유일(client_attempt_id) |
| talk_turns | id · session_id →sessions(따라) · turn_no int2 · segment talk_segment · client_attempt_id text? · speaker · text text? · input_mode? · hint_kind? · hint_level int2? · heard_help? · target_words text[]? · ask_kind? · self_used_words text[]? · stuck_phrase text?(C36) · card_question_no int2?(C19) · said_words text[]? · recast text?(되풀이한 바른 문장) · explanation text? · new_words text[]? · mission_checks jsonb? · within_target bool? · over_length bool? · word_count int4? · sent_user_message text? · tori_rewrite text?(다시 쓸 토리 차례) · perceived_wait_ms int4? · listen_end_seconds float8? · confirm_skipped bool?(C23) · recorded_at tstz | 부분 유일(client_attempt_id) WHERE client_attempt_id IS NOT NULL |
| talk_summaries | id · profile_id →profiles(따라) · session_id →sessions(따라) · learning_day date · summary text · recorded_at tstz | — |
| vocab_progress | id · profile_id →profiles(따라) · vocab_id uuid →vocab(막음) · state vocab_state · streak int2(기본 0) · next_review_day date? · known bool(기본 false) · first_area area · met_areas area[] · first_met_day date · said_days date[]?('말함' 행만) | 유일(profile_id, vocab_id, state) |
| unit_progress | id · profile_id →profiles(따라) · area · level int2 · unit int2 · round int2(회차) · started_at tstz · start_revision int4 · settings_version int8 · settings_snapshot jsonb · remedial_count int2(기본 0) · parent_check text?(값은 P12) · last_judgement jsonb? · last_judged_at tstz? · passed_at tstz? | 유일(profile_id, area, level, unit, round) |
| level_tests | id · profile_id →profiles(따라) · kind level_test_kind · area · level int2? · round int2 · form int2(벌) · start_revision int4 · settings_snapshot jsonb · item_ids jsonb · answers jsonb? · item_scores jsonb? · total_score float8? · passed bool? · placement_start_level int2? · started_at tstz · completed_at tstz? | — |
| star_ledger | id · profile_id →profiles(따라) · learning_day date · area · session_id uuid? →sessions(비움) · reason star_reason · count int2 | — |
| badges | id · profile_id →profiles(따라) · area · level int2 · unit int2 · earned_at tstz | — |
| rewards | id · profile_id →profiles(따라) · name text · stars_required int4 · unlocked_at tstz? · given_at tstz? | — |
| daily_sentences | id · profile_id →profiles(따라) · learning_day date · area · sentence text · attempt_id uuid? →attempts(비움) | — |

`operations.ts` — 테이블 8

| 테이블 | 열 | 유일 · 확인 제약 |
|---|---|---|
| settings | id · key text · scope setting_scope · profile_id uuid? →profiles(따라) · value jsonb · version int8(설정 판) | 유일 NULLS NOT DISTINCT(key, profile_id). 확인: scope = 'household' 이면 profile_id IS NULL |
| settings_history | id · key text · profile_id uuid? →profiles(따라) · old_value jsonb? · new_value jsonb · changed_at tstz · applies_from text?(적용 시작 단원) · source text(값은 P7, '시드 적재' 등) | — |
| parent_auth | id · kind parent_auth_kind · pin_hash text? · ip_hash text? · failed_count int2(기본 0) · locked_until tstz? · updated_at tstz | 유일(ip_hash)(NULL 끼리는 겹쳐도 된다) · 부분 유일(kind) WHERE kind = 'pin'(PIN 은 집에 하나, 10절) · 확인: (kind = 'pin' AND ip_hash IS NULL) OR (kind = 'access_ip' AND ip_hash IS NOT NULL AND pin_hash IS NULL) |
| ai_calls | id · profile_id uuid? →profiles(비움) · session_id uuid? →sessions(비움) · called_at tstz · learning_day date(정할 것 라) · purpose ai_purpose · requested_model text · answered_model text? · input_tokens · output_tokens · cache_write_tokens · cache_read_tokens(넷 다 int4) · cost_usd num(12,6) · price_missing bool(기본 false, 6.1 '단가 없음', 정할 것 라) · latency_ms int4? · first_sentence_ms int4? · status ai_call_status | — |
| ai_status | id int2 기본 키 · resting bool · reason ai_rest_reason? · started_at tstz? · resumes_at tstz? · next_check_at tstz? · check_step int2(기본 0) · check_model text? · consecutive_failures int2(기본 0) | 확인: id = 1(집 전체 한 행, 5절) |
| progress_events | id · profile_id →profiles(따라) · kind progress_event_kind · target jsonb · old_value jsonb? · new_value jsonb? · actor event_actor · occurred_at tstz | — |
| parent_alerts | id · profile_id uuid? →profiles(따라) · kind text(4절 알림 목록, 값은 P9 · 1-나) · threshold_key text? · value jsonb? · learning_day date · created_at tstz · acknowledged_at tstz? | — |
| seed_reports | id · profile_id uuid? →profiles(따라) · lesson_id uuid? →lessons(막음) · level_test_item_id uuid? →level_test_items(막음) · placement_item_id uuid? →placement_items(막음) · item_ref text?(문항 번호, 회화는 '(장, 턴)') · reporter report_source · reason report_reason · memo text? · status report_status · resolution_note text?(확인 사유) · corrected_version text?(정정 판) · reported_at tstz | — |

세 파일 합 29개다(시드 8 · 학습 13 · 운영 8, 5절 표의 행과 같다).

4. `drizzle/0001_api_roles_revoke.sql`. `pnpm exec drizzle-kit generate --custom --name=api_roles_revoke` 로 빈 파일과 journal 항목을 만든 뒤 아래를 넣는다. 실행기는 `--> statement-breakpoint` 로 문장을 나눠 하나씩 보낸다(설치판 `drizzle-orm/migrator.js` 확인). 한 덩이에 여러 문장을 넣지 않는다(드라이버가 한 요청에 여러 문장을 받지 못할 수 있다, 추측). 회수 대상은 정본 문장대로 anon · authenticated 둘이다(service_role 은 위험 7).

```sql
-- 10절 접근 제어: 앱은 Data API 를 쓰지 않는다. anon · authenticated 의 권한을 모두 회수한다.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
-- 뒤 마이그레이션이 만드는 표 · 시퀀스 · 함수에도 Supabase 기본 권한이 붙지 않게 한다.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
```

5. `src/server/db/index.ts`.
   - `createDb(url, { max })` 는 `postgres(url, { prepare: false, max })` 위에 `drizzle({ client, schema })` 를 만든다. schema 는 세 스키마 파일을 합친 객체다. `max` 기본은 파일 위 이름 붙인 상수 `POOL_MAX`(3, 기술 값이고 설계 숫자가 아니다, 위험 2).
   - `getDb()` 는 처음 부를 때 `DATABASE_URL` 로 한 번 만들고 다시 쓴다. 개발 서버의 모듈 다시 읽기에도 연결이 늘지 않게 `globalThis` 에 주소와 함께 둔다. 주소가 바뀌면 새로 만든다(시험 작업자 하나에서 파일이 이어 돌 때 앞 파일의 지운 DB 를 가리키지 않게, P3b 위험 15). 값이 없으면 `DbNotConfiguredError`. 모듈을 읽을 때는 연결하지 않는다(빌드가 DB 를 요구하지 않게).
   - 서버 함수는 `{ db = getDb() }` 꼴의 선택 인자로 연결을 받는다. 시험은 시험용 DB 연결을 넘긴다.
   - `export type Db = ReturnType<typeof createDb>`.
6. `src/core/learning-day.ts`. `learningDayOf(instant: Date, timeZone: string, dayStartHour: number): string`('YYYY-MM-DD').
   - `Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(instant)` 로 그 시간대 벽시계의 날짜와 시를 읽는다. 시가 `dayStartHour` 보다 작으면 달력 날짜에서 하루를 뺀다(`Date.UTC` 로 날짜만 셈). 순간에서 시간을 빼고 형식화하는 꼴보다 일광 절약 시간에도 맞다.
   - `dayStartHour` 가 0~23 정수가 아니면 `RangeError`. 틀린 시간대는 Intl 이 `RangeError` 를 던진다. 시간대별 형식기는 Map 에 담아 다시 쓴다.
   - 현재 시각을 읽지 않는다(`Date.now()` · 인자 없는 `new Date()` 금지, 묶음 위험 7). DB · Next · React 를 가져오지 않는다(의존 규칙 core-no-framework).
7. `src/server/clock/index.ts`.
   - `readShiftDays(env)`: `env.VERCEL_ENV === "preview"` 이거나 `env.NODE_ENV === "test"` 일 때만 `env.CLOCK_SHIFT_DAYS` 를 읽는다(정할 것 마). 그 밖(운영 배포, VERCEL_ENV 없는 `next start`, `next dev`)은 그 변수를 아예 읽지 않고 0 이다. 비었거나 없으면 0. `^\d+$` 가 아니면 `ClockConfigError`(음수 · 소수 · 글자).
   - `createClock({ env = process.env, realNow = () => Date.now() })` → `{ now(): Date, shiftDays }`. 하루 길이는 단위 바꿈 상수 `MS_PER_DAY`. 저장소에서 이 파일만 `Date.now()` 를 부른다.
   - `export const appClock = createClock()` 과 `export function now(): Date`.
   - 이 모듈은 DB · 설정을 가져오지 않는다. P3b 의 proxy 가 모든 요청에서 이 모듈을 가져오기 때문이다. 오늘 학습일은 부르는 쪽이 설정 `app.timezone` · `app.day_start_hour` 를 읽어(아래 8) `learningDayOf(now(), …)` 로 센다. 이 꼴을 감싼 도우미가 필요하면 그것을 쓰는 하위 plan(P10)이 서버 쪽에 둔다.
   - P3b 의 proxy 가 이 모듈의 `now()` 를 가져온다. `server-only` 는 proxy 층에서 빈 모듈로 바뀐다(webpack 원본 확인, Turbopack 은 추측 — `pnpm build` 가 증명한다, 위험 8).
8. `src/server/settings/index.ts`.
   - `getSettings(schemas, { profileId, db })`: 키 목록을 질의 한 번으로 읽는다(`key = ANY(…) AND (profile_id IS NULL OR profile_id = $profileId)`). 키마다 프로필 행(scope 'profile' 이고 그 profile_id)이 있으면 그것을, 없으면 profile_id 가 빈 행을 쓴다. 값은 키마다 넘긴 Zod 규격으로 검증한다.
   - `getSetting(key, schema, opts)` 는 하나짜리 줄임이다.
   - 행이 없으면 `SettingMissingError(key)`, 규격에 어긋나면 `SettingInvalidError(key)`. 코드에 기본값을 두지 않는다. 키별 Zod 규격은 부르는 쪽이 넘긴다(시드 settings.json 의 규격은 P4 · P6 몫이라 겹치지 않게 한다).
   - 이 plan 이 쓰는 키와 규격: `app.timezone` 은 비지 않은 글자이고 `Intl.DateTimeFormat` 이 받는 이름, `app.day_start_hour` 는 0~23 정수. P3b 가 `access.cookie_days` · `parent.pin_max_attempts` · `parent.lock_minutes`(양의 정수)를 더 쓴다.
9. `tests/integration/global-setup.ts`(Vitest globalSetup). 컨테이너 없이 embedded-postgres 로 로컬 · CI 가 같은 방법이다(정할 것 나).
   - 운영 체제 임시 폴더 아래 새 폴더와 빈 포트(`node:net` 으로 0 번 포트를 받아 닫음)로 `new EmbeddedPostgres({ databaseDir, port, user: "postgres", password, persistent: false, onLog: () => {} })` → `initialise()` → `start()`. 비밀번호는 실행 때 `randomBytes` 로 만든다.
   - 접속 주소는 `new URL("postgres://127.0.0.1")` 에 사용자 · 비밀번호 · 포트 · DB 이름을 속성으로 넣어 만든다. '사용자:비밀번호@' 꼴의 문자열 틀을 저장소에 쓰지 않는다(P1a 의 비밀값 grep 이 그 꼴을 잡는다).
   - 역할 만들기(Supabase 흉내, 묶음 위험 15): `CREATE ROLE anon NOLOGIN` · `CREATE ROLE authenticated NOLOGIN` · `CREATE ROLE service_role NOLOGIN BYPASSRLS`.
   - 본 DB `momo_template` 을 만들고 그 안에서 Supabase 기본 권한을 흉내 낸다. `GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role` 과, 표 · 시퀀스 · 함수마다 `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON <종류> TO anon, authenticated, service_role`. 그 뒤 `drizzle-orm/postgres-js/migrator` 의 `migrate(db, { migrationsFolder: "drizzle" })` 로 마이그레이션을 적용한다(drizzle-kit migrate 와 같은 파일 · journal · 기록 표). 연결을 모두 닫는다(본 DB 를 복사하려면 연결이 없어야 한다).
   - `project.provide("pgAdminUrl", …)` 와 `project.provide("pgTemplateDb", "momo_template")`. 형은 `declare module "vitest" { interface ProvidedContext { … } }` 로 적는다.
   - 끝낼 때 `stop()` 하고 폴더를 지운다.
10. `tests/integration/test-db.ts`. `createTestDatabase()` 는 `inject` 로 받은 주소로 `CREATE DATABASE "t_<난수>" TEMPLATE momo_template` 을 해 시험 파일마다 깨끗한 DB 를 만들고 `{ db, url, drop }` 을 돌려준다(`db` 는 `createDb(url)`). 본 DB 복사라 마이그레이션 · 기본 권한이 그대로다. 시험 파일끼리 나란히 돌아도 섞이지 않는다. `seedSettings(db, entries)` 는 settings 행을 넣는다(version 은 1부터 차례).
11. `tests/fixtures/settings.ts`. 시험이 읽는 설정값을 한 곳에 둔다. 12절 기본값을 옮긴 것이고, P6 의 `seed/settings.json` 이 생기면 그것을 읽게 바꾼다(정할 것 사).

```ts
/** 시험용 설정값(12절 기본값). 숫자를 시험 안에 다시 적지 않고 여기서 읽는다(묶음 위험 4) */
export const TEST_SETTINGS = {
  "app.timezone": { scope: "household", value: "Asia/Seoul" },
  "app.day_start_hour": { scope: "household", value: 4 },
  "access.cookie_days": { scope: "household", value: 365 },
  "parent.pin_max_attempts": { scope: "household", value: 5 },
  "parent.lock_minutes": { scope: "household", value: 15 },
  "session.length_factor": { scope: "profile", value: 1.0 },
} as const;
```

## 작업 순서 (Order of work)

시작 전(구현자 — 승인 때 바꿈). 격리 워크트리(승인 문서 커밋 끝)에서 `pnpm install --frozen-lockfile` 뒤 '요청하는 공용 변경' 1~7 을 먼저 옮긴다. `pnpm add -D -E embedded-postgres@17.10.0-beta.17` 과 `pnpm.onlyBuiltDependencies` 를 넣은 뒤 설치 스크립트가 돌아 플랫폼 꾸러미 폴더에 Postgres 바이너리가 있는지 본다. 구현자(implementer · Opus · high) 하나가 차례로 하고 ∥ 는 없다(같은 시험 도구를 차례로 쌓는다). 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null &&` 로 시작한다. Drizzle 코드는 온라인 문서보다 설치판 `node_modules/drizzle-orm` · `drizzle-kit` 의 형 정의를 먼저 본다(온라인 문서는 1.0 베타 기준이다, 확인함).
이 plan 의 첫 구현자 실행이 C52(2)의 훅 실기 확인을 겸한다. 구현자가 끝낸 뒤 컨트롤러가 워크트리의 `.claude/state/implementer-stop-gate.log` 에서 그 실행의 '허락' 줄과 (있으면) '막음' 줄을 장부에 옮긴다. '막음' 줄이 없으면 plan-p01b 작업 6 의 원래 절차(일부러 깨지는 시험 → DONE → 막음 → BLOCKED → 허락)를 이 워크트리에서 짧게 한 번 돌고 시험 파일을 지운다.

1. [DB] 스키마와 첫 마이그레이션. `src/db/schema/{content,learning,operations}.ts`(파일별 값 2 · 3) → `drizzle.config.ts`(1) → `pnpm db:generate`. 완료: `drizzle/0000_*.sql` 에 CREATE TABLE 29 · ENABLE ROW LEVEL SECURITY 29 가 있고 now() · CURRENT_TIMESTAMP 가 없다(`grep -c` 출력을 보고에). `pnpm build` · `pnpm check:deps` 통과.
2. [서버] DB 연결. `src/server/db/index.ts`(5). 완료: `pnpm build` 통과, `DATABASE_URL` 없이도 빌드가 DB 에 붙지 않는다.
3. [검증] 시험용 Postgres 와 RLS · 권한 시험(시험 먼저). `global-setup.ts`(9) · `test-db.ts`(10) → `rls-grants.test.ts`. 완료: `pnpm test:int` 가 시험용 Postgres 를 띄운다. RLS · 스키마 · DB 연결 시험은 통과하고, 권한 시험 셋('권한이 없다' · '권한 오류' · '기본 권한')은 실패하는 것을 본다(회수 전이고 Supabase 흉내 기본 권한이 있어서). 실패 출력을 보고에 적는다.
4. [DB] 권한 회수 마이그레이션. `pnpm exec drizzle-kit generate --custom --name=api_roles_revoke` → `0001_api_roles_revoke.sql` 채우기(4). 완료: rls-grants 시험 전부 통과. 여기까지가 PR A1 이다(정할 것 가).
5. [서버] 학습일 순수 함수(시험 먼저). `learning-day.test.ts` → `src/core/learning-day.ts`(6). 완료: `pnpm test` 의 AC-N7 시험과 한 시계 정적 검사 통과, `pnpm check:deps` 위반 0.
6. [서버] 설정 읽기(시험 먼저). `tests/fixtures/settings.ts`(11) → `settings.test.ts` → `src/server/settings/index.ts`(8). 완료: 설정 읽기 시험 통과.
7. [서버] 한 시계(시험 먼저). `clock.test.ts` → `src/server/clock/index.ts`(7). 완료: AC-7g 시험 통과. 여기까지가 PR A2 다.
8. [검증][사람] 마무리 · H3 · H14. (가) 구현자: CI 와 같은 순서로 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, 그리고 P1a 의 비밀값 grep 0건. (나) code-reviewer(Opus · xhigh) 검토와 fix ≤3. (다) [사람] H3: 아래 표대로 개발용 DB 를 만들고 요청자 터미널에서 `pnpm db:migrate`. (라) 요청자 지시로 컨트롤러가 커밋한다(H14). 완료: 명령 출력이 구현 보고에 있고, 요청자가 적용된 마이그레이션 수(2)를 알려 준다. spec-trace 의 missing-test 는 66 → 63(AC-N5 · AC-N7 · AC-7g).

### H3 · H4 전에 할 수 있는 것과 뒤에 할 것

| 때 | 할 수 있는 것 |
|---|---|
| H3 전(지금) | 작업 1~7 전부와 8 (가) · (나). 스키마 · 마이그레이션 생성 · 시험용 Postgres 의 통합 시험 · 순수 함수 · 시계 · 설정 읽기는 개발용 DB 없이 끝난다 |
| H3 뒤 | 작업 8 (다): 개발용 DB 에 `pnpm db:migrate`. Vercel Preview · GitHub 개발용 비밀값의 `DATABASE_URL` 은 P3b 의 프리뷰 확인과 P7 적재 작업이 쓴다 |
| H4 | 이 plan 은 H4 값을 쓰지 않는다(`CLOCK_SHIFT_DAYS` 는 이름만 P1a 가 두었다). Preview 값 넣기는 P3b 작업 8 |

### [사람] H3 의 할 일(요청자)

| 순서 | 할 일 | 비고 |
|---|---|---|
| 1 | Supabase 에 운영과 다른 조직을 만들고 그 안에 개발용 프로젝트를 만든다. 지역은 Northeast Asia (Seoul) | C26 · 10절. Postgres 판은 그때 기본값(17로 보인다, 확인한 사실 표) |
| 2 | DB 비밀번호를 정한다. 접속 문자열에 넣을 때 특수 문자는 URL 인코딩한다(`$` 는 `%24` 등) | `.env.local` 의 `$` 는 Next 가 다른 변수로 펼친다(확인함) |
| 3 | Integrations → Data API 에서 'Enable Data API' 를 끈다 | 10절 '가능하면 끈다'. 끄면 자동 REST 끝점이 응답하지 않는다(확인함). 확인은 P3b 의 `pnpm check:data-api` |
| 4 | Connect 화면에서 접속 정보 둘을 얻는다. 트랜잭션 풀러(포트 6543, 사용자 이름 `postgres.<프로젝트 ref>`)는 `DATABASE_URL`, 세션 풀러(포트 5432, 같은 사용자 이름)는 `MIGRATION_DATABASE_URL` | 공유 풀러는 IPv4 만 받고 직접 연결은 IPv6 다(확인함). IPv6 가 없는 곳(GitHub Actions 러너로 보임, 추측)에서도 풀러로 붙는다 |
| 5 | 두 값을 요청자 컴퓨터의 `.env.local` 에 넣는다. `DATABASE_URL` 은 Vercel Preview 환경 변수(H1 뒤)에도, 둘 다 GitHub 개발용 비밀값(H15 뒤)에도 넣는다 | 값은 저장소 · 장부 · 대화에 적지 않는다 |
| 6 | 요청자 터미널에서 `pnpm db:migrate` 를 한 번 돌린다(대화창의 `!` 로 돌리지 않는다) | 출력에 접속 문자열이 나오지 않는지 본다. 적용된 마이그레이션 수만 컨트롤러에게 알린다 |

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 이 컴퓨터에 Docker · Podman · Colima · Postgres 가 없다(2026-10-16 확인) | 통합 시험을 로컬에서 못 돌린다. 구현자가 시험 없이 끝낸다 | embedded-postgres 로 로컬 · CI 가 같은 방법(정할 것 나). 이 패키지가 어느 기계에서 안 뜨면 그때 컨테이너 런타임 설치를 [사람] 단계로 올린다 |
| 2 | 트랜잭션 풀러는 prepared statement 를 받지 않는다(확인함). drizzle-kit migrate 가 쓰는 연결의 prepared 설정은 모른다(추측) | migrate 가 풀러에서 실패한다. 서버리스 인스턴스가 늘면 연결이 쌓인다 | 앱은 `prepare: false`. migrate 는 세션 풀러(5432)의 `MIGRATION_DATABASE_URL` 을 쓴다. 인스턴스마다 연결 상한 `POOL_MAX`. 프리뷰에서 실제 풀러 연결은 P3b 작업 8 의 접근 코드 제출이 처음 증명한다 |
| 3 | drizzle-kit 은 이름 바꾸기를 지우기 · 더하기로 만들 수 있다. 실행기는 마지막으로 적용한 마이그레이션 뒤의 것만 돌리고, 적용한 파일의 내용이 바뀌어도 다시 대조하지 않는다(설치판 원본 확인) | 옛 코드가 도는 동안 깨지거나, 적용한 파일을 고쳐도 반영되지 않는다(5절 '더하기만') | rls-grants 의 정적 검사가 `drizzle/*.sql` 의 `DROP TABLE` · `DROP COLUMN` · `DROP TYPE` · `DROP SCHEMA` · `RENAME` · `SET DATA TYPE` · `SET NOT NULL` 을 막는다(뒤 둘은 검토 A1 M-4, 20:5x — 열 꼴 바꾸기 · NOT NULL 조이기도 옛 코드의 쓰기를 깬다). 적용한 마이그레이션 파일은 고치지 않고 새 파일을 더한다. 지우기는 13절 승인 뒤 다음 배포에서 따로(묶음 위험 6) |
| 4 | drizzle-kit 이 만든 `drizzle/meta/*.json` 은 Biome 꼴(배열 접기 · 끝 줄바꿈)과 다르다(추측) | 구현자 끝내기 관문의 `biome ci .` 가 막는다 | 공용 변경 6(`!drizzle`). 이 변경이 들어오기 전에 관문이 막으면 구현자는 NEEDS_CONTEXT 로 컨트롤러에게 올린다 |
| 5 | 하위 plan 여럿이 동시에 마이그레이션을 만들면 `drizzle/meta/_journal.json` 과 번호(0002 …)가 부딪힌다(P7 · P9 · P10~P12) | 병합 뒤 journal 이 깨지거나 같은 번호가 둘 | 마이그레이션을 만드는 하위 plan 은 앞 것이 병합된 브랜치에서 `db:generate` 를 다시 돌린다. 컨트롤러가 병합 순서를 정한다 |
| 6 | Supabase 는 public 의 새 표에 anon · authenticated 권한을 기본으로 준다(확인함). 시험용 Postgres 에는 그 역할 · 권한이 없다(묶음 위험 15) | 회수 SQL 이 시험에서 'role does not exist' 로 깨지거나, 회수를 빠뜨려도 시험이 통과한다 | global-setup 이 역할과 기본 권한을 Supabase 처럼 만든 뒤 마이그레이션한다. 작업 3 에서 회수 전 권한 시험이 실패하는 것을 본다 |
| 7 | service_role 의 표 권한은 정본 문장(anon · authenticated) 밖이라 그대로 둔다 | service_role · secret 키가 새면 Data API 로 읽힌다 | 앱은 그 키를 쓰지 않고 저장소 · Vercel 에 두지 않는다. Data API 를 끄면(H3) REST 경로가 닫힌다. 더 막으려면 13절 한 줄 뒤 회수 대상에 더한다 |
| 8 | P3b 의 proxy 가 이 plan 의 시계 모듈(`server-only`)을 가져온다. webpack 이 proxy 층에서 `server-only` 를 빈 모듈로 바꾸는 것은 원본으로 확인했고 Turbopack 은 추측이다 | proxy 묶음 빌드가 실패한다 | P3b 작업 4 의 `pnpm build` 가 증명한다. 실패하면 시계 모듈에서만 `server-only` 를 뺀다(비밀값이 없는 모듈이다) |
| 9 | 학습일 함수는 `src/core` 에 있어야 한다. `src/core` 의 판정 함수(P10 · P12)는 `src/server` 를 가져올 수 없다(의존 규칙 core-no-framework). 묶음 plan 배정표의 P3 파일 묶음에는 `src/core` 가 없다 | 학습일 계산이 두 곳에 생긴다 | `src/core/learning-day.ts` 를 P3 몫으로 더한다(묶음 plan 과 다르게 한 것). P2 · P4 의 `src/core/{speech,seed,vocab}` 와 겹치지 않는다 |
| 10 | 한 시계 정적 검사는 `src/{core,server,db}` 와 `src/proxy.ts` 만 본다. 브라우저 코드(`src/lib/speech` 의 감시 타이머 등)는 경과 시간을 재야 해서 넣지 않았다 | 화면 쪽 서버 컴포넌트가 `new Date()` 로 기록 시각을 만들 수 있다 | `src/core` 는 시각을 인자로 받는다는 규칙을 P2 의 `src/core/speech` 에도 그대로 둔다(묶음 위험 7). 서버 컴포넌트까지 넓히는 것은 P10(정할 것 아) |
| 11 | settings 에 행이 없으면 설정 읽기는 오류다. 개발용 DB 에는 P7 적재 전까지 설정 행이 없다 | 프리뷰에서 학습일 계산 · 접근 코드 제출(P3b)이 실패한다 | 의도한 동작이다(코드 기본값 금지). P3b 의 프리뷰 확인 전에 컨트롤러가 정할 것 사의 길을 고른다 |
| 12 | `CLOCK_SHIFT_DAYS` 를 크게 하면 접근 쿠키 만료(P3b)도 당긴 시계로 본다 | 프리뷰에서 접근 코드를 다시 넣어야 할 수 있다 | 의도한 동작(한 시계). H13 안내에 적는다 |
| 13 | embedded-postgres 판 이름에 beta 가 붙는다(꾸러미 판 규칙). 플랫폼마다 135MB 안팎을 받는다(npm 확인) | 첫 설치가 느리다 | 정확한 판 고정. 문제가 나면 정할 것 나의 다른 길 |
| 14 | Vercel 의 시스템 환경 변수(VERCEL_ENV)는 프로젝트 설정 'Enable access to System Environment Variables' 가 켜져야 들어온다(확인함) | 꺼지면 프리뷰에서 시각 당기기가 안 된다. 운영은 영향이 없다(읽는 조건이 preview 일치라 안전한 쪽으로 닫힌다) | H1 · H4 때 그 설정이 켜졌는지 본다 |

### 정할 것(컨트롤러)

- 가. PR 나눔. 손으로 쓰는 파일이 열여섯이다. 권하는 것은 작업 4 뒤에서 끊어 PR 둘(A1 파일 아홉 · A2 파일 일곱)로 검토하는 것이다. 브랜치와 plan 은 하나다. 다른 길은 한 PR 로 두고 검토만 두 번에 나누는 것이다.
- 나. 시험용 Postgres. 이 컴퓨터에는 컨테이너 런타임이 없다. 권하는 것은 embedded-postgres(실제 Postgres 17.10 바이너리를 npm 으로 받아 시험 때 띄움)다. 로컬과 CI 가 같은 방법이고 요청자 할 일이 없다. 대가는 dev 의존 하나와 설치 스크립트 승인이다. 다른 길은 요청자가 컨테이너 런타임(OrbStack · Colima 등)을 설치하고(새 [사람] 단계) CI 는 `services: postgres:17` 로 두는 것이다. 브리프의 'CI services' 와 다르게 권하는 까닭은 로컬에 런타임이 없는데 같은 방법이어야 하기 때문이다.
- 다. sessions 의 '학습일'(5절 열 목록)의 뜻. 권하는 것은 '끝낸 학습일'(완료 · 중단 때 시계로 채우고 진행 중에는 비움)이다. 최소 학습일 수는 '수업을 하나 이상 끝낸 서로 다른 학습일'(12절 unit.min_days)이고, 오늘 완료도 끝낸 시각으로 센다(AC-N7 '새벽 3시 50분에 끝낸 새 수업'). 다른 길은 시작 학습일이다. 해석이라 정본 장은 그대로 두고 13절 한 줄로 남기기를 권한다.
- 라. ai_calls 의 `learning_day` · `price_missing` 두 열. 6.1 의 열 목록에는 없지만 '하루 안전 상한은 학습일로 센다'(3.1)와 '단가 없음으로 표시한다'(6.1)에서 끌어냈다. 권하는 것은 넣기다(P9 가 마이그레이션을 다시 만들지 않게).
- 마. 시각 당기기를 읽는 조건. 정본은 '프리뷰 배포에서만'이다. 권하는 것은 `VERCEL_ENV === "preview"` 또는 시험(`NODE_ENV === "test"`)이다. `next dev` 와 VERCEL_ENV 없는 `next start` 는 읽지 않는다. P12 의 e2e 가 당기기를 쓰려면 그 e2e 서버 환경에 `VERCEL_ENV=preview` 를 준다.
- 바. 값 묶음이 정본에서 열린 열 셋(unit_progress.parent_check · parent_alerts.kind · settings_history.source)은 text 로 두고 만드는 하위 plan(P12 · P9 · P7)이 값을 정한다. 권하는 것은 그대로다. 지금 열거형으로 박으면 뒤 하위 plan 이 열거형을 고치는 마이그레이션부터 해야 한다.
- 사. 시험 설정값과 개발용 DB 의 설정 행. 시험은 `tests/fixtures/settings.ts`(12절 값을 옮김)를 읽는다. P6 의 `seed/settings.json` 이 생기면 그것을 읽게 바꾸고 P7 의 check-ids 가 맞댄다. 개발용 DB 에는 P7 적재 전까지 설정 행이 없어 프리뷰의 접근 코드 제출(P3b)이 실패한다. 권하는 것은 P3b 의 프리뷰 실사용 확인을 P7 적재 뒤로 미루는 것이다(401 과 접근 코드 화면은 설정 행 없이도 보인다). 다른 길은 요청자가 Supabase SQL 편집기로 접근에 쓰는 세 키를 넣는 것이다.
- 아. 한 시계 정적 검사 범위(위험 10). 권하는 것은 지금 범위다. 서버 컴포넌트까지 넓히는 것은 P10 브리프에 넣는다.
- 자. P4 시드 규격과 값 맞추기(P4a 정할 것 ㅁ). 열거형 값 · 시드 판 열은 P4 초안과 같다. 배치 벌과 주제 변형은 P4 초안대로 정수(int2)로 맞췄다. vocab 은 `id`(시드 키)와 `word` 를 따로 두되 P4 규격대로 같은 값을 넣는다. 컨트롤러가 P4 를 다르게 정하면 이 표를 그쪽에 맞춘다(구현 전이라 고칠 곳은 스키마 표 셋뿐이다).

### 컨트롤러 결정(승인 때, 2026-10-16 18:2x)

- 가 PR 나눔: 브랜치 · plan · 구현자는 하나다. 코드 검토는 A1(작업 1~4 의 파일) · A2(작업 5~7 의 파일) 묶음 둘로 나눠 code-reviewer 둘을 나란히 띄운다. PR 은 H15 뒤 브랜치 하나로 한 번.
- 나 embedded-postgres · 마 preview 또는 test: 확정(13절 C55 (1) · (3)).
- 다 끝낸 학습일 · 라 ai_calls 열 둘 · 바 text 열 셋: 확정(13절 C56 (1) · (2) · (4), 5절 · 6.1 반영).
- 사 시험 설정값 · 개발용 DB 설정 행: 권함대로. fixture 는 P6 settings.json 이 생기면 바꾸고, 프리뷰 실사용 확인은 P7 적재 뒤.
- 아 한 시계 정적 검사 범위: 권함대로. 서버 컴포넌트까지 넓히는 것은 P10 브리프에.
- 자 P4 와 값 맞추기: 열거형 · 판 열 · 배치 벌 · 주제 변형은 그대로. vocab 만 C54 (3) 대로 바꾼다 — DB 는 `id uuid` 대리 키와 유니크 `word`(시드 키). vocab_progress.vocab_id 는 uuid, unit_specs.target_vocab 은 word 목록. 위 표와 공통 규칙을 그에 맞게 고쳤다(13절 C56 (5)).
- 공용 변경: 격리 워크트리는 띄울 때 HEAD 에서 만들어지므로 컨트롤러가 미리 넣을 수 없다. 구현자가 자기 워크트리에서 1~7 을 옮기고(브리프 `task-p03a.md`), 다른 워크트리와 합칠 때 컨트롤러가 푼다. 7(의존 규칙 db-only-from-server)도 넣는다.
- 훅 실기 확인(C52 (2)): 구현자는 따로 할 일이 없다. 끝난 뒤 컨트롤러가 워크트리의 `.claude/state/implementer-stop-gate.log` 를 본다.
- 구현 뒤(2026-10-16 20:1x, 구현자 보고 '다르게 한 것' 1~7): 1(vitest 별칭을 경로로 — 위 공용 변경 3 고침) · 2(`db-only-from-server` 의 from 에서 `src/core` 도 뺌, core-no-framework 와 겹침 방지) 수용. 3(의존 규칙 시험 정규식 칸) · 4(`--name=initial_schema`) · 5(확인 제약을 학습 테이블 · vocab.band_level 까지) · 6(설정 Zod 규격 둘 내보내기) · 7(`inArray`)은 검토자 판정 뒤 확정. 우려 1(Drizzle jsonb 가 숫자 꼴 문자열을 숫자로 풂)은 P6 · P7 브리프 메모, 우려 5(appClock 이 모듈 읽기 때 만들어져 CLOCK_SHIFT_DAYS 가 틀리면 모든 요청 실패)는 H13 안내에. 검토는 A1(작업 1~4 + 공용 변경) · A2(작업 5~7) 둘 나란히(`task-p03a-review-a1.md` · `-a2.md`).
- A2 검토(2026-10-16 20:3x, `review-p03a-a2.md` Approved C 0 · I 0 · M 3): 다르게 한 것 6 · 7 수용. M1(한 시계 정적 검사 정규식이 `Date.now` 넘기기 · `new Date;` · `Date()` 를 놓침) · M2(학습일 시험 기준 날짜가 달 · 해 넘김을 지나지 않음 — 12월 31일로)는 A1 결과와 묶어 fix 1 로, M3(오류 메시지에 받은 값 — 비밀값 아님)은 수용. 범위 밖 관찰 '질의 SQL 안 now() 는 어느 검사도 못 잡음'은 P3b · P9 브리프에 '시각은 한 시계 값을 매개변수로 넘긴다' 로 적는다.
- A1 검토(2026-10-16 20:5x, `review-p03a-a1.md` Approved C 0 · I 0 · M 5): 다르게 한 것 1~5 · 남은 우려 2 · 3 · 4 · 6 수용(확인 제약 넓힘은 '만 둔다'가 위 한계를 막는 뜻). fix 1(`task-p03a-fix1.md`): A1 M-1(global-setup 실패 경로에서 stop · 폴더 삭제) · M-2(Postgres 로그 끝 줄 보존해 시작 실패 원인 남김) · M-3(다시 풀지 않는 jsonb customType 한 곳 — 위 공통 규칙) · M-4(더하기만 검사에 SET DATA TYPE · SET NOT NULL) + A2 M1(정적 검사 정규식) · M2(시험 기준 날짜 12월 31일). A1 M-5(회화 토막 · 그림 라이선스 영어 값)는 시드 쪽이 DB 값을 따른다(C60, P4c 먼저 할 것) — P3a 는 그대로. A2 M3 수용. Minor 만이라 fix 1 뒤 컨트롤러 확인으로 닫는다(M-3 은 스키마 전체에 닿으므로 `db:generate` 변화 없음과 jsonb 왕복 시험을 본다).

### 제약

- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 이 절에 적고 보고의 '컨트롤러가 정할 것'에 올린다. 컨트롤러가 13절에 한 줄 먼저 넣은 뒤 구현한다.
- 설계 숫자는 settings 에서 읽는다. 시험도 `tests/fixtures/settings.ts` 에서 읽는다. 연결 수 · 시간 같은 기술 값은 파일 위 이름 붙인 상수다.
- 시각은 한 시계에서 읽는다. DB 기본값 now() 금지.
- 비밀값 · 아이 이름은 어디에도 적지 않는다. 시험의 접속 주소 · 비밀번호는 실행 때 만든다. `.env.example` 은 이름만 둔다.
- 용어는 영역 · 단계 · 단원 · 활동이다. 코드 식별자와 브랜치 이름은 영어 ASCII 다.
- 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer Opus · xhigh). 아이 화면이 없어 화면 검토는 없다.
- 커밋 · PR 은 요청자 지시 때만 한다(H14).

### 확인한 사실과 출처(2026-10-16)

| 사실 | 출처 · 판 |
|---|---|
| drizzle-orm 0.45.4 · drizzle-kit 0.31.11 · postgres 3.4.9 가 npm 최신이다(P1a 가 고정한 판). embedded-postgres 최신은 18.4.0-beta.17, 17 계열 끝은 17.10.0-beta.17 | `npm view <패키지> version` · `npm view embedded-postgres versions` |
| Drizzle 의 Supabase 연결: 트랜잭션 풀 모드면 postgres-js 에 `prepare: false`, 서버리스는 풀러로 붙는다 | https://orm.drizzle.team/docs/connect-supabase |
| 설치판 drizzle-orm 0.45.4 의 RLS 는 `pgTable(...).enableRLS()` 다. 온라인 문서는 `pgTable.withRLS(...)` 를 보여 준다(다음 큰 판 문서로 보임). `drizzle-orm/supabase` 에 anonRole · authenticatedRole · serviceRole 이 있다 | 설치판 `node_modules/drizzle-orm/pg-core/table.d.ts` · `supabase/rls.d.ts` · https://orm.drizzle.team/docs/rls |
| `drizzle-kit generate --custom --name=<이름>` 이 빈 마이그레이션 파일을 만들고 `drizzle-kit migrate` 가 적용한다 | https://orm.drizzle.team/docs/kit-custom-migrations · 설치판 `drizzle-kit/bin.cjs`('Prepare empty migration file for custom SQL') |
| 실행기는 `meta/_journal.json` 의 항목 순서로 `<tag>.sql` 을 읽어 `--> statement-breakpoint` 로 나누고, 기록 표 기본은 `drizzle.__drizzle_migrations`, 마지막으로 적용한 것보다 뒤(`when`)인 것만 한 트랜잭션에서 돌린다 | 설치판 `node_modules/drizzle-orm/migrator.js` · `pg-core/dialect.js` |
| drizzle-kit 설정 꼴: postgresql 은 `dbCredentials` 가 형상 필수, `migrations.{table,schema,prefix}` · `casing` · `entities.roles` | 설치판 `node_modules/drizzle-kit/index.d.ts` |
| drizzle-orm 0.45.4 는 `unique().nullsNotDistinct()` · 색인 `.where()` · `check()` · `numeric({ mode })` · `date({ mode: "string" })` · `timestamp({ withTimezone, mode })` 를 지원한다 | 설치판 `pg-core/unique-constraint.d.ts` · `indexes.d.ts` · `checks.d.ts` · `columns/*.d.ts` |
| Supabase 연결: 트랜잭션 모드는 풀러 6543(공유 Supavisor), prepared statement 미지원, 서버리스 권장. 세션 모드는 5432. 공유 풀러는 IPv4 만, 직접 연결은 IPv6. 공유 풀러 사용자 이름은 `postgres.[PROJECT-REF]` | https://supabase.com/docs/guides/database/connecting-to-postgres |
| Data API 끄기는 대시보드 Integrations → Data API 의 'Enable Data API'. 끄면 자동 REST 끝점이 권한 · RLS 와 관계없이 응답하지 않는다. 기존 프로젝트는 public 의 새 표에 기본 권한이 붙는다. 회수 SQL 예(`alter default privileges for role postgres in schema public revoke …`) | https://supabase.com/docs/guides/database/hardening-data-api |
| Supabase 플랫폼의 현재 기본은 Postgres 17 이다(2026-05 changelog 문장, 검색 요약으로만 확인 — 원문은 열지 않음) | https://supabase.com/changelog/46080-self-hosted-supabase-upgrading-from-pg-15-to-17-breaking-change |
| embedded-postgres: 생성자 옵션(databaseDir · port · user · password · persistent · onLog), `initialise` · `start` · `stop`, root 로는 돌지 않음, pnpm 은 설치 스크립트를 승인해야 함, 플랫폼 꾸러미의 postinstall 은 심볼릭 링크 만들기(`hydrate-symlinks.js`), 17.10 바이너리 제공 | https://github.com/leinelissen/embedded-postgres · `npm view @embedded-postgres/darwin-arm64@17.10.0-beta.17 scripts dist.unpackedSize` |
| `server-only@0.0.1` 은 `react-server` 조건에 빈 파일, 기본에 오류를 던지는 파일이다. Vitest(Node)에서 그대로 가져오면 오류다 | 설치판 `node_modules/server-only/package.json` · `index.js` |
| Next 의 webpack 설정은 serverOnly 층 묶음(RSC · action · instrument · middleware)에서 `server-only` 를 빈 모듈로 바꾼다 | 설치판 `next/dist/build/create-compiler-aliases.js` · `next/dist/lib/constants.js`(16.4.2) |
| Next 는 `.env*` 의 `$` 를 다른 변수로 펼치고, 값에 `$` 를 쓰려면 `\$`. 도구에서는 `@next/env` 의 `loadEnvConfig` 를 권한다. 이 저장소의 뿌리 `node_modules` 에는 `@next/env` 가 없다(pnpm 엄격 배치) | 설치판 `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`(16.4.2) · 2026-10-16 `ls node_modules/@next` |
| Vitest 5: globalSetup 이 받는 프로젝트에 `provide`, 시험에서 `inject`, `ProvidedContext` 늘리기, `globalSetup` · `fileParallelism` 옵션 | 설치판 `node_modules/vitest/dist/chunks/plugin.d.*.d.ts` · `config.d.*.d.ts` |
| VERCEL_ENV 는 빌드 · 실행 때 모두 있고 값은 production · preview · development 다. 시스템 환경 변수는 프로젝트 설정의 'Enable access to System Environment Variables' 로 켠다 | https://vercel.com/docs/environment-variables/system-environment-variables (last_updated 2026-07-15) |
| 로컬: docker · podman · colima · orbstack · psql · postgres 명령이 없다 | 2026-10-16 이 컴퓨터에서 `which` |
| spec-trace 기준값: 15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 8 · missing-test 66 | 2026-10-16 `pnpm spec:trace` |

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름 · 검사) | 파일 · 명령 |
|---|---|---|
| AC-N7(P3 몫: 학습일 경계) | 단위 "AC-N7 자정 앞뒤(23시 50분 · 0시 10분)는 같은 학습일이다" · "AC-N7 경계(app.day_start_hour) 10분 뒤는 다음 학습일이다" · "AC-N7 경계 10분 앞(새벽 3시 50분)에 끝낸 수업은 전날 학습일이다" · "AC-N7 학습일은 app.timezone 의 벽시계로 센다(같은 순간의 UTC 날짜와 다를 수 있다)" · "AC-N7 틀린 시간대 · 경계 시각은 RangeError 다". 시간대 · 경계 시각은 `TEST_SETTINGS` 에서 읽고 경계 앞뒤 시각은 그 값에서 계산한다. 오늘 완료 · 이번 주 n일은 P10 | `tests/unit/learning-day.test.ts` · `pnpm test` |
| AC-7g(P3 몫: 시계) | 통합 "AC-7g 프리뷰(VERCEL_ENV=preview)는 CLOCK_SHIFT_DAYS 만큼 시계와 학습일이 넘어간다"(학습일은 시험용 DB 의 설정 app.timezone · app.day_start_hour 를 읽어 learningDayOf 로 센다) · "AC-7g 운영 배포(VERCEL_ENV=production)는 CLOCK_SHIFT_DAYS 를 읽지 않는다"(환경 객체의 읽기를 기록해 그 이름을 읽지 않았음을 본다) · "AC-7g VERCEL_ENV 없는 next start · next dev 도 당기지 않는다" · "AC-7g 잘못된 CLOCK_SHIFT_DAYS(음수 · 소수 · 글자)는 시계를 만들 때 오류다" · "AC-7g 기록 시각 · 학습일은 앱 시계 값 그대로 sessions 에 저장된다" · "AC-7g 어느 열의 기본값에도 현재 시각 함수(now() · CURRENT_TIMESTAMP 등)가 없다". 단원 통과 판정이 도는 것은 P12, 개발용 적재 작업은 P7 | `tests/integration/clock.test.ts` · `pnpm test:int` |
| AC-N5(DB 몫) | 통합 "AC-N5 public 의 테이블 29개가 모두 RLS 켜짐이고 스키마의 테이블 목록과 같다" · "AC-N5 anon · authenticated 는 public · drizzle 의 테이블 · 시퀀스 · 함수 권한이 없다" · "AC-N5 anon · authenticated 로 바꿔 조회하면 모든 테이블이 권한 오류(42501)다" · "AC-N5 기본 권한도 회수되어 새로 만든 테이블에 anon · authenticated 권한이 붙지 않는다". 홈 · 서버 액션 · Route Handler 401 과 Data API 확인은 P3b | `tests/integration/rls-grants.test.ts` |
| 5절 더하기만 · 묶음 위험 6 | 통합(정적) "마이그레이션: drizzle/*.sql 에 DROP TABLE · DROP COLUMN · DROP TYPE · DROP SCHEMA · RENAME · SET DATA TYPE · SET NOT NULL 이 없다" | `rls-grants.test.ts` |
| 5절 제약 | 통합 "스키마: 프로필 × 영역마다 진행 중 세션은 하나다(부분 유일 색인)" · "스키마: 집 전체 설정 행은 profile_id 가 비어 있다(확인 제약)" · "스키마: PIN 행은 하나뿐이다" | `rls-grants.test.ts` |
| 10절 DB | 통합 "DB 연결: 트랜잭션 풀러용으로 prepare 를 끈다" · "DB 연결: DATABASE_URL 이 없으면 DbNotConfiguredError" · "DB 연결: DATABASE_URL 이 바뀌면 새 연결을 만든다" | `rls-grants.test.ts` |
| 12절 설정 읽기 · 묶음 위험 4 | 통합 "설정 읽기: 집 전체 키는 profile_id 가 빈 행을 읽는다" · "설정 읽기: 프로필 키는 그 프로필 행을 먼저, 없으면 기본 행을 읽는다(B5-19)" · "설정 읽기: 없는 키는 SettingMissingError 이고 코드 기본값으로 메우지 않는다" · "설정 읽기: 값이 규격에 어긋나면 SettingInvalidError 다" · "설정 읽기: 여러 키를 질의 한 번으로 읽는다" | `tests/integration/settings.test.ts` |
| 묶음 위험 7(한 시계) | 단위(정적) "한 시계: src/core · src/server · src/db · src/proxy.ts 에서 Date.now() · 인자 없는 new Date() 는 src/server/clock 에만 있다" + 위 AC-7g 의 기본값 시험 | `learning-day.test.ts` |
| 완료 판정 | [사람] H3 의 `pnpm db:migrate` 가 마이그레이션 2개를 적용한다 | 요청자 터미널 |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm check:deps` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(missing-test 66 → 63) · `pnpm check:bundle` 초록, 비밀값 grep 0건. CI `ci / lint · build · unit · integration · depcruise · spec-trace · bundle-secrets`(원격이 생긴 뒤, H15) | `.github/workflows/ci.yml`(공용 변경 4) |

## 완료 보고 (Done)

- 구현: impl-p03a(implementer · Opus · high), 격리 워크트리 `.claude/worktrees/agent-a4f928c00fc43a1e8`(바탕 a28ee9f), 브랜치 `feature/1a-p03a-db-clock`. 보고 `task-p03a-report.md` · fix 1 `task-p03a-fix1-report.md`(워크트리의 장부 폴더). 약 1시간 40분 + fix 5분.
- 실제 바뀐 파일: 손으로 쓴 새 파일 16 + `src/db/schema/jsonb.ts`(fix 1) + drizzle-kit 생성 4(`drizzle/0000_initial_schema.sql` · `0001_api_roles_revoke.sql` · `meta/*`) + 공용 변경 7(`package.json` · `pnpm-lock.yaml` · `vitest.config.mts` · `ci.yml` · `.env.example` · `biome.json` · `.dependency-cruiser.cjs` + `dependency-rules.test.ts`). 공용 변경은 구현자가 자기 워크트리에서 옮겼다(승인 때 바꾼 방식).
- 계획과 다르게 한 것: vitest `server-only` 별칭은 경로로(꾸러미 exports), `db-only-from-server` 의 from 에서 `src/core` 제외, 첫 마이그레이션 이름 `initial_schema`, 확인 제약을 학습 테이블 · vocab.band_level 까지, 설정 Zod 규격 둘 내보내기, `inArray`, 더하기만 검사에 SET DATA TYPE · SET NOT NULL, 모든 jsonb 열은 다시 풀지 않는 customType(A1 M-3).
- 시험 · 명령: 단위 57 · 통합 23(embedded-postgres 17.10, 첫 시작 약 4초 뒤 0.5초), biome 0 · build · check:deps 0 · check:bundle 0 · spec-trace missing-test 66 → 63(AC-N5 · AC-N7 · AC-7g) · 비밀값 grep 0 · `db:generate` 변화 없음. 회수 전 권한 시험 셋 실패 → 0001 뒤 통과.
- 검토: A1 `review-p03a-a1.md` Approved(C 0 · I 0 · M 5) · A2 `review-p03a-a2.md` Approved(C 0 · I 0 · M 3) → fix 1(A1 M-1~M-4 · A2 M1 · M2) → 컨트롤러 확인 21:0x(C52, Minor 만). A1 M-5 는 C60(시드가 DB 값을 따름), A2 M3 수용.
- 남긴 것: [사람] H3(개발용 Supabase · Data API 끔 · 접속 문자열 둘 → 요청자 터미널 `pnpm db:migrate`, 적용 2개). CI(linux)의 embedded-postgres 는 H15 뒤 첫 `ci / integration` 이 증명. 실제 Supabase 기본 권한은 H3 뒤 P3b `check:data-api`. 메모 — P7 · P9 · P10 · P12: 비울 수 있는 jsonb 열에서 JSON null 과 SQL NULL 이 구별되지 않으니 JSON null 을 뜻으로 쓰지 않는다(fix 1 보고). P3b · P9: 질의 SQL 안에 now() 를 쓰지 않고 시각은 한 시계 값을 매개변수로. H13 안내: appClock 은 모듈 읽기 때 만들어져 `CLOCK_SHIFT_DAYS` 가 틀리면 모든 요청이 실패. 끝내기 관문은 기록용(C59).
- 커밋: 25041d9(브랜치 `feature/1a-p03a-db-clock`, 요청자 지시 21:1x). 공용 파일 `package.json` · `.env.example` 은 P3b 가 더한 줄을 빼고 P3a 몫만 스테이징했다(해시 객체로). P3b 는 `feature/1a-p03b-access` 로 이어 간다. PR 은 H15 뒤.
