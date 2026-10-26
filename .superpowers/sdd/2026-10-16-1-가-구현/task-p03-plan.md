# 브리프: P3 하위 plan 작성(DB · 시계 · 설정 읽기 · 접근 제어)

역할: 계획자(general-purpose · Opus · xhigh). 코드를 만들지 않고 plan 파일과 보고만 쓴다. 설치 · 생성 명령(`pnpm add` · `npx` · `pnpm create`)은 실행하지 않는다. 판 확인용 `npm view <패키지> version` 과 공식 문서 읽기(WebFetch · WebSearch)는 된다. 저장소의 다른 파일은 고치지 않는다. 읽기 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null && ` 로 시작한다.

## 바탕(지금 저장소 상태, 2026-10-16 14:2x)
- 브랜치 `feature/1a-p01b-quality-gates` 끝 08cce00 이 바탕이다(P1a 뼈대 b0b6a46 · P1b 품질 관문 cf97f62 · 문서 08cce00). 원격은 아직 없다(H15, 요청자 몫). 이 하위 plan 의 구현 브랜치는 08cce00 에서 가지 치고 워크트리 하나씩이다(컨트롤러가 만든다). 브랜치 이름은 ASCII.
- 이미 있는 것은 하위 plan 둘을 읽어 안다: `intent/2026-10-15-모모-잉글리시-아카데미/plan-p01a-뼈대.md`(폴더 규약 `src/{app,core,server,lib,components,db}` · `tests/{unit,integration,e2e,…}` · Biome · Vitest unit · integration 프로젝트 · Playwright 10.9형 · `.env.example` 이름만) · `plan-p01b-품질-관문.md`(의존 규칙: `src/core` 는 db · next · react · `src/server` 금지 · 순환 금지, `src/server/ai` 안의 SDK; spec-trace: 시험 이름은 `AC-<번호>` 로 시작하고 15절에 있어야 하며 묶음 plan 증명 표 AC 마다 시험이 있어야 함(지금 missing-test 66); check-bundle; 구현자 끝내기 관문이 끝낼 때마다 `biome ci` 와 단위 시험 전체를 다시 돌림 — 단위 시험은 빠르고 DB · 네트워크 없이, 통합 시험은 `tests/integration` 에 두고 `pnpm test:int` 로).
- P2 · P3 · P4 가 동시에 돈다. 파일 묶음은 배정표 행 그대로이고, 그 밖의 공용 파일(`package.json` · `vitest.config.mts` · `playwright.config.ts` · `.github/workflows/ci.yml` · `.env.example` · `.dependency-cruiser.cjs`)을 고쳐야 하면 plan 에 '요청하는 공용 변경' 절을 두고 모아 적는다(셋이 동시에 고치면 충돌하므로 컨트롤러가 합친다). 다른 P 의 파일 묶음은 손대지 않는다.
- 요청자 결정 C52(13절): 기능 작업은 전체 루프(이 plan → 컨트롤러 승인 → implementer → code-reviewer xhigh → fix ≤3). plan 은 PR 하나 분량(파일 열 개 · 단계 여덟 이하), 넘으면 a · b 로 나누고 각 파일 머리에 서로를 가리킨다(묶음 plan 위험 12).

## 먼저 읽을 것(공통, 순서대로)
1. `.claude/skills/plan-build/SKILL.md` — 템플릿과 지킬 것. 절 이름 그대로.
2. `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` — 묶음 plan. 배정표(69~86줄)의 이 P 행, 작업 순서 3(56줄), [사람] 단계(87~105줄), 위험(136~159줄) · 정할 것(160~170줄, C50 으로 정해짐) · 제약(171~185줄), 증명 절 머리(186~193줄: 공통 명령 · CI 작업 이름 · 시험 이름 규칙)와 증명 표의 이 P 행들.
3. `.claude/CLAUDE.md`(Conventions · Architecture · Things Claude gets wrong), `intent/README.md`(하위 plan 규약), `specs/README.md`(지도), `specs/10-결정-기록.md` 13절의 C49 · C50 · C51 · C52 와 이 P 에 닿는 결정 행.
4. 하위 plan 둘(위 '바탕').

## 만들 것
- P3 는 파일 열 개를 넘으므로(묶음 plan 위험 12) 둘로 나눈다. `intent/2026-10-15-모모-잉글리시-아카데미/plan-p03a-DB-시계-설정.md`(스키마 · 마이그레이션 · RLS · 권한 회수 · 트랜잭션 풀러 · 한 시계 · 학습일 · 설정 읽기)와 `plan-p03b-접근-제어.md`(가족 접근 코드 · proxy.ts · 함수 안 확인 · CRON_SECRET · 접근 코드 화면 · 첫 화면 e2e 고치기). 상태 draft, 머리에 서로를 가리킨다. 브랜치 제안 `feature/1a-p03a-db-clock` · `feature/1a-p03b-access`(p03b 는 p03a 뒤에 가지 친다).
- 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p03-plan-report.md`: 쓴 파일 · 확인한 사실(출처 URL · 판) · (추측) · 묶음 plan 과 다르게 한 것 · 컨트롤러가 정할 것 · 요청하는 공용 변경.

## 이 P 에서 더 읽을 것
- 정본 `specs/04-데이터.md` 5절 전부(29 테이블 · 열 · 제약 · '더하기만' 마이그레이션 원칙 · parent_auth), `specs/08-테스트와-기술.md` 10절(기술 구성: Supabase · Drizzle · 트랜잭션 풀러 · RLS · 접근 제어 · proxy.ts · CRON_SECRET · Data API 끔) · 11절 (1) 과 (4-1) 시계 · 9절(통합 시험 · 시험용 Postgres · RLS 시험 · 401 훑기), `specs/02-1-영역-단원-승급.md` 3.1(프로필 · 영역 · 단계가 데이터에 미치는 것), `specs/03-화면.md` 접근 코드 화면(문구 · 한 화면 한 행동 · 실패 처리; 첫 실행 화면은 P10), `specs/09-설정값.md` 12절 전부(설정 읽기 함수가 읽는 키 · 프로필 행 → 기본 행 규칙), `specs/11-요구사항과-수용-기준.md` AC-1a · AC-N5 · AC-N7 · AC-7g 와 그 FR, 13절의 '데이터 · 운영 세부' 행과 C26(개발용 Supabase 는 다른 조직).
- 묶음 plan 위험 5(RLS · 쿠키 확인 누락) · 6(마이그레이션 순서, CI 가 DROP · RENAME 막음) · 15(시험용 Postgres 의 두 역할) · 18(접근 코드 실패 IP 기록 자리, 추측) · 19(Next 16 proxy.ts · after()). [사람] H3(Supabase 개발용 · Data API 끄기 · 접속 정보) · H4(접근 코드 해시 · CRON_SECRET · 개발용 키). 둘이 없으면 통합 시험 · 프리뷰를 못 하므로 plan 에 'H3 · H4 전에 할 수 있는 것(스키마 · 순수 함수 · 로컬 Postgres 통합 시험)'과 '뒤에 할 것'을 가른다.
- P1a 의 `tests/e2e/smoke.spec.ts` 는 첫 화면을 확인한다. P3b 에서 첫 화면이 접근 코드 화면이 되므로 그 시험을 고치는 작업을 p03b 에 넣는다(허용 파일에 포함).

## P3 범위(배정표 76줄 그대로)
- `src/db/schema/`(29 테이블 Drizzle 스키마) · `drizzle/`(마이그레이션 SQL, RLS 켜기 · anon · authenticated 권한 회수 포함) · `src/server/{clock,settings,access}` · `src/proxy.ts` · `src/app/(setup)/access/`. 완료 판정: 개발용 DB 에 마이그레이션 적용, 쿠키 없는 요청 401. 증명: `tests/integration/{access,rls-grants,clock}.test.ts` · `tests/unit/learning-day.test.ts` · `pnpm test:int` · `pnpm check:data-api`(스크립트 이름 · 무엇을 호출하는지 정한다).
- 범위 밖: 첫 실행 · 배치 평가(P10), 시드 적재 · dev-load(P7), 부모 화면 · 알림(1-나), Cron 작업 자체(1-나, CRON_SECRET 확인 함수만).

## 꼭 확인할 사실(공식 문서 · npm. 출처와 판을 plan 에)
- Drizzle ORM · drizzle-kit 최신 안정판, `generate` · `migrate` 흐름(`push` 금지), Postgres 드라이버 선택(`postgres` 또는 `pg`)과 Supabase 트랜잭션 풀러(포트 · `prepare: false`) 설정, 마이그레이션 SQL 에 RLS · REVOKE 를 넣는 방법.
- Supabase: RLS 켜기와 anon · authenticated 권한 회수 SQL, Data API 끄기 설정과 꺼졌는지 확인하는 방법(`check:data-api` 가 부를 끝점과 기대 응답), 개발용 프로젝트 지역 서울.
- Next.js 16: `proxy.ts`(위치 · matcher · 쿠키 읽기 · 401 응답), 서버 액션 · Route Handler 안에서 쿠키 확인 함수 호출 규약, `after()`. 설치된 판의 문서 `node_modules/next/dist/docs/` 를 먼저 본다.
- 접근 코드 해시 방식(`node:crypto` scrypt 등)과 쿠키 속성(HttpOnly · Secure · SameSite · 만료), 시각 당기기(Preview 만, H4) 가 시계 함수에 들어가는 꼴.
- 시험용 Postgres: CI(GitHub Actions `services`) 와 로컬에서 같은 방법으로 띄우는 길, anon · authenticated 역할 만들기(위험 15), Vitest integration 프로젝트에서 접속 문자열을 받는 환경 변수 이름(`.env.example` 에 이름만).

## 지킬 것
- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 plan '위험' 절에 적고 보고의 '컨트롤러가 정할 것'에 올린다. 컨트롤러가 13절에 한 줄 먼저 넣은 뒤 구현한다.
- 증명은 시험 · 명령 이름으로. 시험 이름은 증명 표의 AC 로 시작하고(spec-trace 가 센다), 시험 하나가 AC 둘을 덮으면 이름 앞에 `AC-1a · AC-1b` 처럼 이어 적는다. "충분히 테스트한다"는 증명이 아니다.
- 용어는 영역 · 단계 · 단원 · 활동. 영어 개발 용어는 알맞은 우리말로(직역 금지). 코드 식별자는 영어. 아이 화면 문구는 정본 · 목업 그대로(해요체).
- 설계 숫자는 `settings` 설정값(12절 키)에서 읽는다. 코드 · 시험 상수에 박지 않는다. 설정 키가 12절에 없으면 '컨트롤러가 정할 것'.
- 권한이 필요한 단계는 [사람] 으로 표시하고 묶음 plan H 번호를 단다. 커밋 · PR 은 요청자 지시 때(H14).
- 비밀값 · 아이 이름은 어디에도 적지 않는다. 가짜 값도 꼴 그대로는 저장소에 두지 않는다(실행 때 조립).
- 확인한 사실은 출처 URL · 판 · 확인 날짜를 plan '정할 것' 또는 '위험' 절의 표에 적는다. 확인 못 한 것은 '(추측)'.
- 마지막 메시지는 보고 파일의 요지 10줄 안쪽.
