판정: Approved (C 0 · I 0 · M 5)

# 검토 A1: P3a 스키마 · 마이그레이션 · DB 연결 · 시험용 Postgres · RLS · 공용 변경(code-reviewer · Opus · xhigh, 읽기 전용)

대상은 워크트리 `.claude/worktrees/agent-a4f928c00fc43a1e8`(바탕 a28ee9f, `feature/1a-p03a-db-clock`)의 작업 1~4 파일과 공용 변경 일곱이다. 대조는 plan-p03a(20:1x 판), 정본 5절 · 5.1 · 6.1 ai_calls 문장 · 10절 DB · 접근 제어 행, 13절 C54 (3) · C55 (1) (2) · C56, AC-N5 · NFR-5, P4a 워크트리 `src/core/seed/structure.ts` · `schema/reference.ts` 로 했다. 작업 5~7(A2 몫)은 가져오기 관계만 봤다.

검토자가 직접 돌린 것.
- `pnpm test:int`: 3 파일 · 22 통과, 1.80초(시작 731ms). 끝난 뒤 OS 임시 폴더에 `momo-pg-*` 와 postgres 프로세스가 남지 않았다.
- 스크래치 폴더에 스키마 세 파일만 복사해 빈 출력 폴더로 `drizzle-kit generate --name=initial_schema` 를 다시 돌렸다. `drizzle/0000_initial_schema.sql` 과 diff 0, `0000_snapshot.json` 도 같다(id · prevId 빼고). `0001_snapshot.json` 은 0000 과 내용이 같고 prevId 가 0000 의 id 를 가리킨다.
- `biome check`: 검토 파일 10개(drizzle.config.ts 포함) 오류 0. `!drizzle` 가 `drizzle.config.ts` 까지 빼지 않는다.
- 실패 경로 실행(깨진 마이그레이션을 넣은 사본으로 global-setup 돌리기)은 이 세션 권한에서 막혀 원본 읽기로만 판정했다(M-1 · M-2).

## 1. 설계 준수
- ✅ 테이블 29 의 열 이름 · 꼴 · 비울 수 있음 · 기본값 · 외래 키 지울 때 동작(따라 · 막음 · 비움) · 유일 · 부분 유일 · NULLS NOT DISTINCT · 확인 제약이 plan 표와 5절 행에 맞다(표 1). 외래 키 29개를 0000 SQL 에서 하나씩 대조했다. 프로필 쪽 키가 막음으로 가리키는 대상은 시드 행뿐이라 프로필 삭제가 막히지 않는다.
- ✅ 시각 열 기본값 0(SQL 에 now() · CURRENT_TIMESTAMP 0). DEFAULT 는 gen_random_uuid() 와 상수(false · 0 · '{}'::jsonb)뿐이다. `.enableRLS()` 29(SQL `ENABLE ROW LEVEL SECURITY` 29). 열은 snake_case, 속성은 camelCase.
- ✅ vocab 은 `id uuid` 대리 키 + 유일 `word`(content.ts:236-255), vocab_progress.vocab_id 는 uuid · 막음(learning.ts:237-239), unit_specs.target_vocab 은 text[](content.ts:206). C54 (3) · C56 (5) 대로다.
- ✅ 열거형은 plan 표 26행과 값까지 같다(0000 의 CREATE TYPE 26). 보고와 브리프의 '27' 은 셈 착오다. C54 (3) 의 값(영역 · 수업 종류 · first · re_ask · 판 정수 둘 · 벌 정수 · 주제 변형 정수)은 P4a 와 같다. C54 (3) 밖 두 곳은 다르다(M-5).
- ✅ 마이그레이션. 0000 은 생성 그대로이고 statement-breakpoint 115 개로 나뉜다. 0001 은 plan 파일별 값 4 와 글자까지 같고 문장 여섯을 breakpoint 다섯으로 나눴다. journal 항목 둘(0000_initial_schema · 0001_api_roles_revoke), DROP · RENAME 없음.
- ✅ DB 연결(src/server/db/index.ts). `prepare: false`(:27), `POOL_MAX` 이름 붙인 상수(:12), 모듈 읽기 때 연결 없음, `getDb` 의 globalThis 주소 비교와 앞 연결 `end()`(:44-53), `DbNotConfiguredError`(:16-21), `Db` 형(:31). 설정 읽기는 `{ profileId = null, db = getDb() }` 꼴로 받는다(src/server/settings/index.ts:64, 꼴만 봄).
- ✅ 시험용 Postgres. 역할 셋(service_role 은 BYPASSRLS) · USAGE · 표 · 시퀀스 · 함수 기본 권한 · migrate · 본 DB 연결 닫기(global-setup.ts:95-126), 파일마다 복사 DB 만들고 FORCE 로 지우기(test-db.ts:23-49), URL 속성 조립 · 실행 때 포트 · 비밀번호(:30-66), `ProvidedContext` 형(:23-28), 끝낼 때 stop · 폴더 삭제(:131-137)가 plan 값 9 · 10 대로다. 실패 경로 정리는 빠졌다(M-1).
- ✅ 공용 변경 일곱이 plan 글자대로다(아래 '공용 변경' 절).
- ✅ 품질. 한글 식별자 없음(한글은 문자열 · 주석만), 비밀값 없음, 설계 숫자 박힘 없음(POOL_MAX · INTEGRATION_TEST_TIMEOUT_MS · PASSWORD_BYTES · DB_NAME_BYTES 는 이름 붙인 기술 값, 29 는 5절을 인용한 상수), 통합 시험 전체 1.8초. TypeScript strict 는 컨트롤러 재확인(tsc · build 0)을 따른다.
- ⚠️ 실제 Supabase 권한과 흉내의 차이, CI(ubuntu-24.04)에서 embedded-postgres 가 뜨는지는 diff 로 확인할 수 없다(남은 우려 2 · 3, H3 · H15 뒤).

## 2. 잘한 점
- 권한 0 시험이 ACL 항목(aclexplode)과 실제로 쓸 수 있는 권한(has_table_privilege · has_sequence_privilege — PUBLIC 과 역할 상속까지 셈)을 둘 다 본다(rls-grants.test.ts:85-118). 브리프가 적은 information_schema 보다 넓게 잡는다.
- 42501 시험은 트랜잭션 안에서 `SET LOCAL ROLE` 로 바꿔 표 29 × 역할 둘을 실제로 조회한다(:121-141).
- 보고된 회수 전 실패 출력이 코드와 정확히 맞는다. 권한 464 는 표 29 × 역할 2 × PG17 표 권한 8 이다. 새 객체 24 는 표 16 + 시퀀스 6 + 함수 2 다. 조회 결과 'anon ai_calls null' 은 회수 전에는 조회가 됐다는 뜻이다.
- 기본 권한 시험은 표 · 시퀀스 · 함수를 실제로 만들고 되돌린다(:143-174). 되돌림 오류와 다른 오류를 가려 다른 오류를 삼키지 않는다(:172).
- 테이블 목록은 스키마 모듈에서 `is(value, PgTable)` 로 읽어 DB 와 맞대고, 29 는 5절 상수로 따로 본다(:16-31, :80-81). `errorCode` 는 Drizzle 이 감싼 cause 의 코드도 본다(:49-57).
- 부분 유일 시험은 '완료 행은 겹쳐도 되고 다른 영역은 따로'까지 넣어 색인 조건이 맞는지 본다(:190-210).
- 주소를 '사용자:비밀번호@' 꼴 문자열 없이 `new URL` 속성으로 만들고 비밀번호를 실행 때 만든다(global-setup.ts:48-66).

## 3. 지적

### M-1 Minor — global-setup 이 실패 경로에서 Postgres 와 데이터 폴더를 정리하지 않는다
- 위치: tests/integration/global-setup.ts:64-129.
- 무엇이: `pg.start()` 뒤의 역할 · DB 만들기 · 기본 권한 · migrate 가 던지면 정리 함수(:131-137)를 돌려주기 전이라 Vitest 가 부르지 않는다. 남은 정리는 embedded-postgres 의 종료 훅에 기댄다(설치판 dist/index.js:397 `AsyncExitHook(gracefulShutdown)`). 그 훅은 SIGINT 를 동기로 보내지만, 데이터 폴더 지우기(`fs.rm`, 같은 파일 :263-266)는 비동기라 프로세스 'exit' 에서 끝나지 못할 수 있다. `initialise()` 가 실패하면 mkdtemp 폴더(:64)는 그대로 남는다.
- 근거: 브리프 판정 3 '실패 때 자원 누수', plan 파일별 값 9 '끝낼 때 stop() 하고 폴더를 지운다'. 마이그레이션을 더하는 하위 plan(plan 위험 5 의 P7 · P9 · P10~P12)이 깨진 SQL 로 돌릴 때마다 임시 폴더에 클러스터가 쌓일 수 있다.
- 확인 정도: 원본 읽기. 실패 경로 실행은 권한에서 막혔다. 정상 실행 뒤에 남는 것이 없음은 확인했다.
- 고치는 법: `initialise()` 부터 `provide` 까지를 try 로 감싸고, catch 에서 `await pg.stop()`(시작 전이면 그냥 돌아온다)과 `rmSync(databaseDir, …)` 를 한 뒤 다시 던진다.

### M-2 Minor — Postgres 가 뜨지 못하면 원인이 버려진다
- 위치: tests/integration/global-setup.ts:73(`onLog: () => {}`).
- 무엇이: embedded-postgres 의 `start()` 는 서버 프로세스가 일찍 끝나면 인자 없이 `reject()` 한다(설치판 dist/index.js:223-225). 원인은 stderr 로 와서 onLog 로만 넘어오는데 global-setup 이 버린다. 그래서 시작 실패는 원인 없는 오류(undefined)로만 보인다. `initialise()` 실패는 오류 문장에 stderr 를 붙인다(같은 파일 :176).
- 근거: 남은 우려 2(CI 에서 뜨는지 못 봄). H15 뒤 첫 `ci / integration` 이 실패하면 원인을 찾을 단서가 없다.
- 고치는 법: onLog 로 끝 몇십 줄을 배열에 모은다(성공 때는 출력하지 않는다). start 가 거부하면 그 줄을 붙인 Error 로 다시 던진다. 담을 줄 수는 이름 붙인 상수로 둔다.

### M-3 Minor — jsonb '두 번 풀기'는 settings 만이 아니라 모든 jsonb 열에 닿는다(남은 우려 1 의 범위)
- 위치: src/db/schema/*.ts 의 jsonb 열 전부. 예를 들면 learning.ts:165 attempts.input, :100-101 level_tests.answers · item_scores, operations.ts:51 settings.value, :162-163 progress_events.old_value · new_value, :177 parent_alerts.value.
- 무엇이: 설치판 `drizzle-orm/postgres-js/driver.js:21-22` 는 json(114) · jsonb(3802) 의 serializer 만 바꾸고, parser 는 postgres.js 기본(JSON 풀기)으로 둔다. 그 위에서 `pg-core/columns/jsonb.js:24-27` 의 `mapFromDriverValue` 가 값이 문자열이면 다시 `JSON.parse` 한다. 그래서 최상위 값이 문자열 "12" · "true" · "null" · "1.0" 인 jsonb 는 Drizzle 로 읽을 때 수 · 불 · null 로 바뀐다. 구현자가 settings 시험에서 실제로 겪었다(보고 남은 우려 1).
- 근거: 컨트롤러 결정(20:1x)은 이것을 P6 · P7 메모로 뒀다. 하지만 5절 attempts '입력(답 · 글 · 생각 꺼내기 대화 · 인식 텍스트)'처럼 아이 답이 최상위 문자열로 들 수 있는 열이 있다. P10 이 답을 그대로 넣으면 아이가 쓴 "12" 가 12 로 읽혀 채점 · 표시가 어긋날 수 있다.
- 고치는 법(컨트롤러가 고름):
  - (가) 지금 스키마에 다시 풀지 않는 jsonb 를 한 곳에 둔다(`customType`, dataType 'jsonb', toDriver 는 JSON.stringify, fromDriver 는 받은 값 그대로). 세 파일이 그것을 쓴다. 생성 SQL 이 바뀌는지는 `db:generate` 로 본다. H3 전이라 0000 을 다시 만들 수 있다.
  - (나) 메모를 jsonb 를 쓰는 하위 plan 전부(P7 · P9 · P10 · P12)로 넓히고, 'jsonb 최상위에 문자열을 두지 않는다(객체로 감싼다)'를 규칙으로 둔다.

### M-4 Minor — '더하기만' 정적 검사가 열 꼴 바꾸기와 NOT NULL 조이기를 잡지 못한다
- 위치: tests/integration/rls-grants.test.ts:181.
- 무엇이: 정규식은 plan 위험 3 의 다섯(DROP TABLE · COLUMN · TYPE · SCHEMA · RENAME) 그대로다. 설치판 drizzle-kit(bin.cjs)은 열 꼴을 바꾸면 `ALTER COLUMN "…" SET DATA TYPE` 을, 비울 수 있음을 없애면 `ALTER COLUMN "…" SET NOT NULL` 을 만든다. 둘 다 이 검사를 지난다.
- 근거: 5절 '마이그레이션은 열 · 테이블을 더하기만 한다 … 그래서 옛 코드가 도는 동안 먼저 적용해도 된다'. 꼴 바꾸기와 NOT NULL 조이기는 옛 코드의 쓰기를 깰 수 있다. 구현은 plan 글자대로이므로 plan 몫의 빈칸이다.
- 고치는 법: 정규식에 `SET DATA TYPE` · `SET NOT NULL` 을 더하고 시험 이름 · plan 위험 3 · 증명 표를 같이 고친다. 아니면 plan 위험 3 에 '이 둘은 코드 검토가 본다'고 적는다(컨트롤러 판단).

### M-5 Minor — 시드와 DB 의 영어 값이 C54 (3) 밖 두 곳에서 다르다(H3 전에 정할 것)
- 위치: src/db/schema/content.ts:52-59(talk_segment 의 today_words · talk · wrap_up)와 P4a `src/core/seed/structure.ts:209`(TALK_SEGMENTS 의 today-words · dialogue · wrap-up). content.ts:91-95(image_license 의 cc0 · cc_by)와 P4a `src/core/seed/schema/reference.ts:351`("CC0" · "CC-BY").
- 무엇이: 두 쪽 다 자기 승인 plan 글자대로다(plan-p03a 열거형 표, plan-p04a:140 · :163). C54 (3) 은 영역 · 수업 종류 · 묻는 턴 · 판 · 벌 · 주제 변형만 맞췄다.
- 근거: C54 (3) 의 뜻(시드와 DB 의 영어 값을 같게)과 어긋난다. 그대로 두면 적재(P7)와 회화(P11)에 바꿔 끼우는 표가 생긴다. H3 에서 `db:migrate` 를 한 뒤에는 열거형 값을 바꾸려면 `ALTER TYPE … RENAME VALUE` 가 필요한데, 이 plan 의 정적 검사가 RENAME 을 막는다. 그래서 H3 전에 정하는 것이 싸다.
- 고치는 법: 컨트롤러가 한쪽으로 맞춘다. DB 쪽이면 content.ts 를 고치고 0000 을 다시 만든다(아직 어디에도 적용 전이다). 시드 쪽이면 P4a 규격을 고친다. 그대로 두려면 13절 C54 (3) 에 바꿔 끼우는 곳을 한 줄 적는다.

## 4. 판정
Approved. Critical · Important 는 없다. Minor 다섯은 작업 1~4 의 결과를 믿지 못하게 하는 결함이 아니다. M-5 는 H3 전에, M-3 은 P10 전에 컨트롤러가 고르기를 권한다. M-1 · M-2 는 시험 도구 다듬기이고, M-4 는 plan 위험 3 의 목록을 넓힐지의 판단이다.

## 표 1. 테이블 29
| # | 파일 | 테이블 | 판정 |
|---|---|---|---|
| 1 | content | level_specs | 맞음 |
| 2 | content | unit_specs | 맞음(target_vocab text[]) |
| 3 | content | vocab | 맞음(id uuid · 유일 word · image_key 막음). band_level ≥ 1 확인을 더함(다르게 한 것 5) |
| 4 | content | images | 맞음(key text 기본 키) |
| 5 | content | placement_items | 맞음(유일 7열, is_spare 포함) |
| 6 | content | lessons | 맞음(유일 NULLS NOT DISTINCT 8열, unit · topic_variant 비울 수 있음) |
| 7 | content | level_test_items | 맞음 |
| 8 | content | model_prices | 맞음(numeric(10,4) 넷 · 유일(model, effective_from)) |
| 9 | learning | profiles | 맞음(notices_seen 기본 '{}') |
| 10 | learning | profile_tracks | 맞음(유일(profile_id, area)). level ≥ 1 · unit ≥ 0 확인을 더함(다르게 한 것 5) |
| 11 | learning | sessions | 맞음(부분 유일 WHERE status = 'in_progress', lesson_id 막음, level_test_id 따라, english_sentences 기본 0, learning_day 비울 수 있음). level · unit 확인을 더함 |
| 12 | learning | attempts | 맞음(유일 client_attempt_id) |
| 13 | learning | talk_turns | 맞음(열 29, 부분 유일 client_attempt_id IS NOT NULL) |
| 14 | learning | talk_summaries | 맞음 |
| 15 | learning | vocab_progress | 맞음(met_areas area[] · said_days date[], 유일(profile_id, vocab_id, state)) |
| 16 | learning | unit_progress | 맞음(유일 5열, settings_version int8). level · unit · start_revision 확인을 더함 |
| 17 | learning | level_tests | 맞음. level · start_revision 확인을 더함 |
| 18 | learning | star_ledger | 맞음(session_id 비움) |
| 19 | learning | badges | 맞음. level · unit 확인을 더함 |
| 20 | learning | rewards | 맞음 |
| 21 | learning | daily_sentences | 맞음(attempt_id 비움) |
| 22 | operations | settings | 맞음(유일 NULLS NOT DISTINCT(key, profile_id), 확인 `scope <> 'household' OR profile_id IS NULL` 은 plan 문장과 같은 뜻) |
| 23 | operations | settings_history | 맞음(source text, C56 (4)) |
| 24 | operations | parent_auth | 맞음(유일 ip_hash, 부분 유일 kind WHERE 'pin', 확인 식이 plan 글자 그대로) |
| 25 | operations | ai_calls | 맞음(profile_id · session_id 비움, learning_day · price_missing, 6.1 의 열 목록과도 맞음) |
| 26 | operations | ai_status | 맞음(id int2 기본 키, 확인 id = 1) |
| 27 | operations | progress_events | 맞음 |
| 28 | operations | parent_alerts | 맞음(profile_id 비울 수 있음 · 따라, kind text) |
| 29 | operations | seed_reports | 맞음(시드 키 셋 막음, profile_id 따라) |

## 표 2. 다르게 한 것 1~5 · 남은 우려 1~4 · 6
| 항목 | 판정 | 근거 |
|---|---|---|
| 다르게 한 것 1(vitest 별칭을 경로로) | 수용(컨트롤러 수용, 맞음) | plan 공용 변경 3 의 고친 글자와 같다(vitest.config.mts:12-16). server-only 는 package.json:36 직접 의존이라 뿌리 node_modules 경로가 있다. 통합 시험이 src/server/db 를 읽고 통과하므로 두 프로젝트 모두에 걸린다 |
| 2(from 에서 src/core 뺌) | 수용(맞음) | core-no-framework(.dependency-cruiser.cjs:10-18)가 src/core 에서 `^src/(db|server)/` · drizzle-orm · postgres 를 이미 막는다. 그래서 'src/server · src/db 밖은 막는다'는 plan 문장과 범위가 같다. src/proxy.ts 도 막힌다 |
| 3(정규식 칸) | 수용 | 합친 정규식(`^src/db/` 와 npm 꼴)이 postgres-array · drizzle-zod 를 잘못 받지 않는지 보는 칸이라 쓸모가 있다. 기존 표 꼴을 따른다 |
| 4(`--name=initial_schema`) | 수용 | plan '0000_<이름>' 의 이름 자리다. journal tag 와 파일 이름이 같고, 다시 생성해도 같은 이름이 나온다 |
| 5(확인 제약을 학습 테이블 · vocab.band_level 까지) | 수용, 되돌리지 않음 | plan 공통 규칙의 '만 둔다'는 위 한계(12 · 5)를 넣지 말라는 뜻이고 테이블 범위를 정한 문장이 아니다. 넓힌 값이 P4a(LEVEL_MIN 1, 알파벳 단원 0)와 맞고, 비울 수 있는 열은 NULL 이면 지난다 |
| 남은 우려 1(jsonb 두 번 풀기) | 수용하되 범위를 넓힘 | M-3 |
| 2(CI 에서 embedded-postgres) | 수용 | H15 뒤 첫 실행이 증명한다. 실패 때 원인이 남도록 M-2 |
| 3(Supabase 기본 권한과 흉내의 차이) | 수용 | 흉내는 plan 값 9 와 같다. 다를 수 있는 곳은 둘이다. (가) 시험 Postgres 의 postgres 는 superuser 이고 Supabase 의 postgres 는 superuser 가 아니다(Supabase 문서 'Postgres Roles' 기준, 이 검토에서 원문은 열지 않음, 확인 정도 중간). superuser 가 필요한 문장이 뒤 마이그레이션에 들어오면 시험만 통과한다. 지금 0000 · 0001 에는 그런 문장이 없다. (나) 함수 EXECUTE 는 Postgres 기본으로 PUBLIC 에 붙어 anon 이 상속한다. 시험의 함수 권한 확인은 anon · authenticated 의 ACL 항목만 본다(rls-grants.test.ts:95-102). 지금 public · drizzle 에 함수가 없어 영향은 없다. 실물 확인은 H3 뒤 P3b 의 Data API 확인이 한다 |
| 4(getDb 의 앞 연결 end()) | 수용 | 운영에서 DATABASE_URL 은 바뀌지 않는다. 바뀌는 경우는 시험뿐이다 |
| 6(Turbopack 의 server-only) | 수용 | 시계를 가져오는 곳이 아직 없다. P3b 작업 4 의 build 가 본다(plan 위험 8) |

## 표 3. 증명 표(A1 몫)
| 증명 표 행 | 시험 |
|---|---|
| AC-N5(DB 몫) | 있음 4: "AC-N5 public 의 테이블 29개가 모두 RLS 켜짐이고 스키마의 테이블 목록과 같다" · "AC-N5 anon · authenticated 는 public · drizzle 의 테이블 · 시퀀스 · 함수 권한이 없다" · "AC-N5 anon · authenticated 로 바꿔 조회하면 모든 테이블이 권한 오류(42501)다" · "AC-N5 기본 권한도 회수되어 새로 만든 테이블에 anon · authenticated 권한이 붙지 않는다" |
| 5절 더하기만 · 묶음 위험 6 | 있음 1: "마이그레이션: drizzle/*.sql 에 DROP TABLE · DROP COLUMN · DROP TYPE · DROP SCHEMA · RENAME 이 없다". 실제 파일을 읽고, 파일이 0개면 실패한다(:179-180). 빈칸은 M-4 |
| 5절 제약 | 있음 3: "스키마: 프로필 × 영역마다 진행 중 세션은 하나다(부분 유일 색인)" · "스키마: 집 전체 설정 행은 profile_id 가 비어 있다(확인 제약)" · "스키마: PIN 행은 하나뿐이다" |
| 10절 DB | 있음 3: "DB 연결: 트랜잭션 풀러용으로 prepare 를 끈다" · "DB 연결: DATABASE_URL 이 없으면 DbNotConfiguredError" · "DB 연결: DATABASE_URL 이 바뀌면 새 연결을 만든다" |

## 공용 변경 일곱
1. package.json:51 `"embedded-postgres": "17.10.0-beta.17"`(정확한 판), :59-61 `pnpm.onlyBuiltDependencies` 둘. pnpm-lock.yaml 에 두 플랫폼 꾸러미가 있다(321 · 357 · 4264 · 4282행). ✅
2. package.json:15-17 scripts 셋, `--passWithNoTests` 뺌. ✅
3. vitest.config.mts:12-16 별칭 경로 꼴(다르게 한 것 1), integration 에 `globalSetup`, `testTimeout: INTEGRATION_TEST_TIMEOUT_MS`(:5 상수). ✅
4. .github/workflows/ci.yml integration 작업: 다른 작업과 같은 준비 네 줄(checkout · pnpm · node · install) + `pnpm test:int`, `if: ${{ false }}` 제거. ✅
5. .env.example 두 줄이 plan 글자 그대로다. ✅
6. biome.json `"!drizzle"`. `drizzle.config.ts` 는 계속 검사된다. ✅
7. .dependency-cruiser.cjs:35-41 `db-only-from-server`(다르게 한 것 2), 시험 둘(막는 예 src/app → @/db, 허용 예 src/server/db → src/db · drizzle-orm), 정규식 칸(다르게 한 것 3). ✅ drizzle.config.ts 는 plan 파일별 값 1 과 글자까지 같다.

## 범위 밖 관찰(지적 아님)
- 의존 규칙은 tsPreCompilationDeps 때문에 형만 가져오는 것도 센다. src/app 이 행 형(`typeof sessions.$inferSelect` 등)을 쓰려면 src/server 가 형을 다시 내보내야 한다. P10 화면 작업 때 알아 둘 것이다.
- 보고와 브리프의 '열거형 27' 은 26 이다(plan 표 26행, SQL CREATE TYPE 26).
