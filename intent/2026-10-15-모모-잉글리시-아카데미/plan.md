# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1차 구현 1-가(묶음)

spec: `specs/` 정본 열세 장(지도 `specs/README.md`, approved 2026-10-16 06:2x) · 델타 `intent/2026-10-16-말하기-수업-분량과-단어-카드/spec.md` · `intent/2026-10-16-AI-쉬는-중-자동-해제/spec.md`(1-가 몫) · `intent/2026-10-16-회화-선생님-수업/spec.md`(데이터 · 설정만) · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: approved(요청자 2026-10-16 09:3x, 컨트롤러 검토 06:5x)
승인: 요청자, 2026-10-16 09:3x · 브랜치 · 워크트리: 하위 plan 마다 `feature/1a-pNN-<이름>`(1a 는 1-가), ∥ 로 함께 도는 하위 plan 은 git worktree 하나씩 · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

이 파일은 묶음 plan 이다. 하위 plan P1~P12 는 배정표대로 plan-build 로 따로 쓴다(`plan-pNN-<이름>.md`, 이 폴더). 컨트롤러가 검토 · 승인하고 요청자는 PR 병합(H14) 때 본다. 요청자가 원하면 하위 plan 도 되읽기한다.
그래프 엔지니어링 조사의 제안은 '조사 P3'처럼, 리버스 엔지니어링 조사의 제안은 '역분석 제안 4'처럼 적어 하위 plan 번호와 가른다.
앱 코드가 없으므로 경로 · 스크립트 이름은 새로 정한 제안이다. 정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다.

## 목표 (Goal)

1-가는 11절 구현 차수 표의 1-가 줄이다. 끝나면 요청자가 개발용 DB 의 프리뷰 배포에서 배치 평가부터 읽기 · 쓰기 · 말하기 단원 통과와 단계 평가까지 써 본다(11절).
학습 규칙은 처음부터 본 규칙이다(S4). 단원 통과는 단원 단어 unit.vocab_mastery(0.80) '안다'와 최근 unit.recent_window(5)회 평균 unit.recent_score(0.80)이다. 최소 수업 수 · 최소 학습일 수는 아래 한계일 뿐이다(3.2).
승급은 단계 평가 문항 점수 합이 ⌈문항 수 × level.pass_score⌉ 이상일 때다. seed.complete_through_level(6)을 넘으면 '다음 단계 수업을 준비하고 있어요. 지난 수업을 다시 해 봐요'가 된다(3.2).
앱은 시드를 읽기만 한다(6.3). 서버에서 실시간 호출 넷(쓰기 확인 · 첨삭 · 말하기 평가 · 생각 꺼내기)만 부르고 모두 ai_calls 에 남긴다(6.1).
하루 안전 상한(ai.safety_daily_calls 1000 · ai.safety_daily_cost_usd 15)에 닿으면 그 학습일의 실시간 호출만 막고 안내한다. 'AI 쉬는 중' 상태 · 확인 호출 · 부모 화면 · 비용 알림 · 회화 · 신고는 1-나다(11절).
시드는 6.3 순서 (0)~(3)을 끝내고 (4-가)를 시작한다. 회화 카드 본 생성 (4-나)는 1-나 회화 턴 뒤다.

## 바뀌는 파일 (Files that change)

2026-10-16 `ls` 로 보면 저장소에는 `.claude` · `docs` · `intent` · `specs` · `.superpowers` 뿐이다. 아래는 모두 새로 만드는 뼈대 · 공통 모듈이고 경로는 Next.js 16 App Router 관례의 제안이다. 세부 파일은 하위 plan 이 정한다.

| 파일 · 폴더 | 신규 / 수정 | 무엇을 | P |
|---|---|---|---|
| `package.json` · `pnpm-lock.yaml` | 신규 | Node 24 · pnpm. next 16.4 · react 19 · typescript · tailwindcss 4 · shadcn/ui · motion · drizzle-orm · drizzle-kit · postgres · @anthropic-ai/sdk · zod 4 · @biomejs/biome 2 · vitest · @playwright/test · dependency-cruiser · argon2 해시 패키지(추측: @node-rs/argon2) | P1 |
| `package.json` scripts | 신규 | dev · lint · test · e2e · build(CLAUDE.md) · seed:load(5절)에 더해 test:int · e2e:local · seed:validate · seed:check · spec:trace · check:bundle · check:ids · check:data-api · ai:contract · ai:observe(제안) | P1~P9 |
| `tsconfig.json` · `next.config.ts` · `biome.json` | 신규 | strict, React Compiler, Turbopack, 린트 · 포맷 하나 | P1 |
| `vitest.config.mts` · `playwright.config.ts` | 신규 | Vitest 프로젝트 둘(unit · integration). Playwright 는 10.9형 태블릿 화면 · 가짜 음성 · 가짜 AI | P1 |
| `.dependency-cruiser.cjs` | 신규 | `src/core` 는 db · next · react 를 못 가져온다. 순환 금지. `src/server/ai` 는 `src/server` 안에서만(조사 P8) | P1 |
| `vercel.json` | 신규 | 함수 지역 서울(icn1, 10절). Cron 은 1-나 | P1 |
| `.env.example` · `.gitignore` | 신규 · 수정 | 변수 이름만 둔다(값 없음). .gitignore 에 `seed/reports/inbox.json` · `playwright-report` · `test-results` · `.vercel` | P1 |
| `.github/workflows/ci.yml` | 신규 | lint · build · unit · integration · e2e · depcruise · spec-trace · bundle-secrets · seed-validate 작업 | P1(뒤 하위 plan 이 늘림) |
| `.github/workflows/main.yml` · `dev-load.yml` · `keepalive.yml` | 신규 | main: migrate → seed-validate → seed-load(1-나에 판단 기록 단계). dev-load: 수동, complete_through_level 입력. keepalive: 개발용 | P7 |
| `.claude/agents/implementer.md` | 수정 | Stop 훅(biome · vitest 실패면 끝내기 거부) · maxTurns(조사 F3) | P1 |
| `.claude/agents/seed-generator.md` | 신규(이름 제안) | 브리프만 읽는 본 생성용 정의(6.3 (2)) | P8 |
| `src/proxy.ts` | 신규 | 페이지 요청을 가족 접근 쿠키로 먼저 거른다(10절) | P3 |
| `src/db/schema/*.ts` · `drizzle/` | 신규 | 29 테이블(5절). 마이그레이션은 더하기만, RLS 켜기와 anon · authenticated 권한 회수 SQL | P3 |
| `src/core/` | 신규 | 순수 함수(5절 목록). 현재 시각은 인자로 받는다(3.1) | P2 · P4 · P7 · P9~P12 |
| `src/server/` | 신규 | `server-only`. DB 연결 · 한 시계 · 설정 읽기 · 접근 확인 · AI 호출 · 서버 액션 · 시드 적재 | P3 · P7 · P9~P12 |
| `src/lib/speech/` | 신규 | 인식 · 읽어 주기 인터페이스와 브라우저 · 가짜 구현(7절) | P2 |
| `src/components/{ui,board,activities}` | 신규 | shadcn/ui, 포스트잇 보드 공용, 활동 표시(시드 보기 · 아이 화면이 같이 씀) | P5 · P10 |
| `src/app/(setup)` · `(child)` · `dev` | 신규 | 접근 코드 · 첫 실행 / 홈 · 수업 목록 · 세션 · 복습 · 평가 · 결과 / 시드 보기(로컬만) · 음성 관찰(프리뷰) | P2 · P3 · P5 · P10~P12 |
| `seed/` | 신규 | settings.json · level-specs · unit-specs · vocab · images · model-prices · lists/(동음이의어 · 금지어 · 형태 표 · 메타 문장) · lessons/<영역>/<단계>/<단원>.json · level-tests · placement · stories · prompts · manifest · checks · reviews | P4 · P6 · P8 |
| `public/images/vocab/` | 신규 | 단어 그림, 한 장 100KB 이하(5절) | P6 |
| `scripts/` | 신규 | seed-validate · seed-check · seed-load · spec-trace · check-bundle · check-ids(역분석 제안 6) · check-data-api · ai-contract · ai-observe(역분석 제안 5) | P1~P9 |
| `tests/{unit,integration,e2e,e2e-local,contract,fixtures}` | 신규 | 시험 이름은 AC 번호로 시작한다(조사 P4) | 전부 |
| `docs/checklists/speech-check.md` | 신규 | 음성 점검표와 실기 결과(9절) | P2 |
| `docs/media/mockups/*.dc.html` · 목업 캔버스 | 수정 | 11절 목업 표대로 고치고 새로 그린다 | P6 |
| `specs/10-결정-기록.md` · `04-데이터.md` · `06-시드-생성.md` | 수정(승인 뒤) | 유형별 문항 수 · 정할 것 결정 · 표본에서 잰 수업 크기와 시간(5절 · 6.3 이 '이 문단에 적는다') | 착수 전 · P6 · P8 |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-pNN-<이름>.md` | 신규(자리 제안) | 하위 plan | 각 P |

## 작업 순서 (Order of work)

1. [문서] 착수 준비. 위험 절 '정할 것' ①~⑥ 가운데 다음 하위 plan 에 닿는 것을 먼저 정한다. 설계면 13절에 한 줄 먼저. 장부 폴더를 만든다. 완료: P1 plan 승인(H14).
2. [검증] P1. 11절은 실기 확인을 첫 작업으로 둔다. 관찰 페이지를 올릴 빈 앱이 있어야 하므로 P1 을 짧게 먼저 한다. 완료: 빈 앱의 `pnpm lint · build · test` 와 CI 가 초록.
3. [화면][사람] P2 ∥ [DB] P3 ∥ [검증] P4. P1b 커밋 직후 바로 시작한다(C52, P1c 는 뒤로). H1 → 관찰 페이지 프리뷰 → H2. H3 · H4. 완료: 실기 결과표(실패면 S7 결정), 개발용 DB 마이그레이션, 검증기 시험 통과.
4. [검증] P5 ∥ [문서][사람] P6 ∥ [서버] P9. H5 · H6 · H7 · H12. 완료: 풀이 검사와 시드 보기 화면, 규격 확정과 목업 승인, AI 호출 층 시험 통과.
5. [DB][검증] P7. H8. 완료: dev-load 한 번, 프리뷰가 규격을 읽음, main 작업이 운영 승격을 보류함.
6. [검증][사람] P8 시작. H9 · H10 · H11. 따로 연 생성 세션에서 1-나까지 이어 간다(6.3, 2~3세션). 완료(1-가 몫): 표본 확정 · effort 결정 · 배치 가 벌 · 정할 것 ④의 묶음이 개발용 DB 에 있음.
7. [화면] P10. 완료: 접근 코드 → 첫 실행 → 배치 → 홈 → 수업 목록 → 세션 시작 e2e.
8. [화면][서버] P11. 완료: 세 영역 세션 e2e.
9. [화면][서버] P12. 순수 함수는 작업 4부터 ∥. 완료: 시각 당기기로 단원 통과와 단계 평가 통과 e2e.
10. [검증] 차수 경계 점검. `pnpm spec:trace`(증명 표 AC 마다 시험 있음) · `pnpm check:ids` · 전체 `pnpm e2e` · dev-load. 완료: 1-가 AC 중 시험 없는 것 0, 설계 숫자 박힘 0.
11. [사람] H13. 완료: 요청자가 프리뷰에서 끝까지 써 봄.
12. [문서] 완료 보고를 채우고 done. 1-나 plan 으로 간다.

구현 세션의 서브에이전트는 동시에 셋까지다(CLAUDE.md). 시드 생성 세션은 따로 센다(판단). 설정 · 도구 성격의 하위 plan(P1 류)은 가벼운 루프 — 계획자 없이 컨트롤러 브리프, 검토 Opus high · 범위 한정, Minor 는 컨트롤러가 직접 고침. 기능 하위 plan 은 전체 루프(C52, 요청자 2026-10-16 13:4x).

### 배정표

| P | 범위(한 줄) | 정본 절 · AC | 파일 묶음 | 의존 | ∥ | 완료 판정 | 증명 |
|---|---|---|---|---|---|---|---|
| P1 | 뼈대 · 품질 관문(P1a 뼈대 · P1b 품질 관문 둘로 나눔, 컨트롤러 승인 10:3x). 스택 설치, 폴더 규약, CI, spec 추적 검사(F2 = 조사 P3, AC ↔ 시험 조사 P4 포함), implementer Stop 훅 · maxTurns(F3), 의존 규칙(조사 P8) | 10절, 9절 CI 검사 · AC-N4(번들) · 공통 | 설정 파일들 · `ci.yml` · `scripts/spec-trace.ts` · `scripts/check-bundle.ts` · `implementer.md` | — | — | 빈 앱 CI 초록. spec-trace 는 정본 위반을 보고만 하다가 위반 0 이 되면 막는 검사로 | `pnpm lint` · `pnpm build` · `tests/unit/spec-trace.test.ts` · CI `ci / lint · build · unit · depcruise · spec-trace · bundle-secrets` |
| P1c | spec 자료 그래프의 나머지 규칙(조사 P3: 모든 FR 에 AC · AC 가 가리키는 FR · 결정 번호가 있음 · 13절 '없어진 것'이 본문에 되살아나지 않음)을 spec-trace 규칙 셋으로 더한다(C51 마). 설정 키 대조는 P7 check-ids. **C52 로 뒤로 미룸 — P2~P4 뒤 틈에 가벼운 루프로** | 9절 CI 검사 · 14 · 15절 · 13절 | `scripts/spec-trace.ts` · `tests/unit/spec-trace.test.ts` | P1b | P2 · P3 · P4 | 새 규칙 셋 위반 0 → CI `--fail-on` 에 더함 | `tests/unit/spec-trace.test.ts` · CI `ci / spec-trace` |
| P2 | 음성 접점과 실기 확인(11절 첫 작업). **둘로 나눔(plan-p02 안의 P2a 판정 함수 · P2b 접점 · 관찰 페이지, 컨트롤러 14:4x, C53)**. 인식 · 읽어 주기 인터페이스, 듣기 끝 · 감시 타이머 · 이어 붙이기, 일치율 순수 함수, 관찰 페이지와 가짜 대본(역분석 제안 4) | 7절, 6.2 일치율, 9절 음성 점검 · AC-5a · 5e(말하기 · 배치) · N3(수동) | `src/lib/speech/` · `src/core/speech/` · `src/app/dev/speech-probe/` · `tests/fixtures/speech/` · `docs/checklists/speech-check.md` | P1 | P3 · P4 | H2 결과표가 남는다. 실패면 S7 결정이 13절에 있다 | `tests/unit/match-rate.test.ts` · `listen-end.test.ts` · 점검표 |
| P3 | DB · 시계 · 설정 읽기 · 접근 제어. **둘로 나눔(plan-p03a DB · 시계 · 설정 읽기 · plan-p03b 접근 제어 · 첫 화면 e2e, 컨트롤러 18:2x, C55~C57)**. 29 테이블 · RLS · 권한 회수, 트랜잭션 풀러(prepare 끔), 한 시계 · 학습일, 설정 읽기(프로필 행 → 기본 행), 가족 접근 코드 · proxy.ts · 함수 안 확인 · CRON_SECRET, 접근 코드 화면 | 5절, 10절 접근 제어 · DB, 3.1, 11절 (1) · (4-1) 시계 · AC-1a(접근) · N5 · N7 · 7g(시계) | `src/db/schema/` · `drizzle/` · `src/server/{clock,settings,access}` · `src/proxy.ts` · `src/app/(setup)/access/` | P1 | P2 · P4 | 개발용 DB 에 마이그레이션 적용, 쿠키 없는 요청 401 | `tests/integration/{access,rls-grants,clock}.test.ts` · `tests/unit/learning-day.test.ts` · `pnpm test:int` · `pnpm check:data-api` |
| P4 | 시드 규격 · 검증기 · 어휘 배정(6.3 순서 (0)). **셋으로 나눔(plan-p04a 규격 · p04b 배정 · 칸 검사 · p04c 묶음 검사 · 명령, 컨트롤러 15:5x, C54)**. 모든 시드 Zod 규격(회화 카드 · 평가 카드 포함), 6.4 검사 전부 · 완전성 · 단계 분포 경고 · 칸 사이 관계 경고(조사 P6) | 6.3 출력 규격, 6.4, 3.2 배정 · 관계 표, 3.6 · AC-3a · 3b · 5g · 5h · 7a · 7c · 7d | `src/core/seed/` · `src/core/vocab/allocate.ts` · `scripts/seed-validate.ts` · `tests/fixtures/seed/` | P1 | P2 · P3 | 시험용 시드로 6.4 행마다 통과 · 거부 사례가 있다 | `tests/unit/seed-validator-*.test.ts` · `vocab-allocate.test.ts` · `pnpm seed:validate` |
| P5 | 풀이 검사 · 시드 보기 화면(6.3 (0) 끝, 11절 (2-1)). claude-sonnet-5-5 low · between_tools, 수업 하나 한 호출, 칸 내용 해시로 seed/checks/. 로컬 전용 보기 화면 · 활동 표시 컴포넌트 · 아이 눈 순회 질문 칸(역분석 제안 9 의 네 질문) | 6.3 사람 표본 검토, 6.4 풀이 검사 · AC-7d · 7f | `scripts/seed-check.ts` · `src/app/dev/seed-viewer/` · `src/components/activities/` · `seed/{checks,reviews}/` | P4 | P6 · P9 | 시험용 칸이 풀리고 CI 는 API 0회로 저장 결과만 읽는다 | `tests/unit/solve-check.test.ts` · `tests/e2e-local/seed-viewer.spec.ts` · `pnpm e2e:local` |
| P6 | 시드 확정 · 목업 맞추기(6.3 (1), 11절 (3)). **셋으로 나눔(plan-p06a 규격 파일 · p06b 그림 카탈로그 · p06c 목업 맞추기, 컨트롤러 22:3x, C61)**. curriculum-designer(Opus · xhigh)가 can-do 48 · level_specs 48 · unit_specs 240 + 알파벳 2 · 구간별 단원 틀 · vocab · 배정표 · 그림 카탈로그 · model_prices 와 조합 표 · settings.json · 목록 넷 · 평가 유형별 문항 수. design-reviewer 검토 | 3.1~3.6, 6.1 조합 표, 6.3 (1), 12절, 11절 목업 표 · AC-7a · 7c(실데이터) | `seed/*.json` · `seed/lists/` · `public/images/vocab/` · `docs/media/mockups/` · 13절 한 줄 | P4 | P5 · P9 | 규격 파일 검증 오류 0, H5 · H6 · H7 | `pnpm seed:validate` · design-reviewer 보고(심각도 · 근거) |
| P7 | 적재 · 판 규칙 · 개발용 DB · CI 작업(11절 (4) · (4-1)). `pnpm seed:load`, 판 고르기 · 설정값 시드 견주기 순수 함수, 완전성 검사, main · dev-load · keepalive, 시각 당기기 변수, 식별자 대조(역분석 제안 6 · 조사 P5) | 5절 판 · 적재, 6.3 완전성, 10절 배포 · 운영 · AC-17a · 17b · 7e(설정) · 7g · 8i(저장 거부) | `scripts/seed-load.ts` · `src/server/seed/` · `src/core/seed/{version-pick,settings-compare}.ts` · 작업 셋 · `scripts/check-ids.ts` | P3 · P4 | P9 | 개발용 DB 에 P6 규격과 시험용 수업이 들고 프리뷰가 읽는다 | `tests/integration/{seed-load,seed-version}.test.ts` · `tests/unit/{version-pick,settings-compare}.test.ts` · CI `main / migrate · seed-validate · seed-load` · `dev-load` |
| P8 | 시드 표본 · 본 생성(6.3 (2) · (3) · (4-가)). 본 생성용 정의, 생성 브리프, 묶음 워크플로, manifest, xhigh 대 high, 배치 가 벌 144, 읽기 · 쓰기 · 말하기 1~6 과 단계 평가 1,080 | 6.3 전부, 9절 시드 표본 생성 평가 · FR-7 · AC-7a(실시드) | `seed-generator.md` · `seed/prompts/` · 워크플로 스크립트(자리 추측) · `seed/{lessons,level-tests,placement,manifest}/` | P5 · P6 · P7 | P9~P12, 1-나까지 | 1-가 몫: 표본 · effort 결정 · 배치 가 벌 · 정할 것 ④의 묶음 | 묶음마다 `pnpm seed:validate --complete-through <n>` · manifest 해시 대조 · seed/reviews/ |
| P9 | AI 호출 층. 서버 전용 클라이언트(max_retries 0, effort · max_tokens 명시, '끔' 변환, Sonnet · Opus 에 fallbacks 와 베타 헤더 server-side-fallback-2026-07-01), 호출 넷 Zod · 정규화 · 실시간 출력 검사, 조합 검사, ai_calls · 비용, 비용 알림 · 안전 상한 판정, 호출 앞 판정, 오류 분류, 가림, 가짜 클라이언트, AI 계약(수동) · 관찰표(역분석 제안 5) · 1-가 호출 표본 평가(9절: 생각 단계 기본값을 정하고 ai.max_tokens 를 출력 p99 의 두 배로, C21) | 6.1 · 6.2(호출 넷) · 6.4 끝 문단 · 6.6, 8절 상황 표, 9절 AI 계약 · AC-4b · 5d · 8a · 8b · 8c · 8i · 8n · N2 · N4(가림) | `src/server/ai/` · `src/core/ai/` · `scripts/{ai-contract,ai-observe}.ts` · `tests/fixtures/ai/` | P3 | P5 · P6 · P7 | 가짜 클라이언트로 호출 넷이 기록 · 정규화되고, 실제 표본으로 Zod 계약 시험 통과 | `tests/unit/{normalize,combo,cost-alert,mask}.test.ts` · `tests/contract/ai-schemas.test.ts` · `tests/integration/{ai-calls,ai-errors}.test.ts` · `pnpm ai:contract` |
| P10 | 첫 실행 · 배치 평가 · 홈 · 수업 목록 · 세션 틀(11절 (6), 진행 저장은 (8)에서 당김). PIN(argon2) · 이름 둘 · 시작 단계 · 마이크 확인, 배치 적응 규칙 · 예비 문항 · 이어 보기, 홈 카드 · 오늘 완료, 목록 상태 · '여기부터 해요', 세션 시작 재판정 · 판 · 주제 변형 · 전이 · 시도 id | 3.2 배치 · 목록, 3.5, 4절 해당 행, 5절 전이, 8절 네트워크 · 동시 사용 · 오래 멈춘 세션 · AC-1a~1c · 2a · 2b · 2d~2f · 5c · 6a · 11a~11d · N7 · N9 | `src/app/(setup)/first-run/` · `src/app/(child)/{page.tsx,[area]/lessons,placement}` · `src/core/{placement,lesson-list,today}/` · `src/server/actions/` · `src/components/board/` | P2 · P3 · P7 | P12 순수 함수 | 접근 코드 → 첫 실행 → 배치 → 홈 → 목록 → 세션 시작이 돈다 | `tests/e2e/{first-run,placement,home,lesson-list,resume}.spec.ts` · `tests/unit/{placement,lesson-list-state,today-done}.test.ts` · `tests/integration/session-start.test.ts` |
| P11 | 읽기 · 쓰기 · 말하기 세션(11절 (7)). 읽기 흐름, 쓰기 1~3 타일 · 앱 안 영문 자판, 4~5 쓰기 확인, 6~12 생각 꺼내기 · 초고 · after() 첨삭 · 둘째 세션 · 밀린 첨삭, 말하기 1~12, 점수 · 결과 말 셋, 마이크 · 인식 오류, 안전 상한 안내, 기다림 표시 | 3.3, 3.7, 4절 세션 행, 6.2, 7절, 8절 첨삭 · 실패 · AC-2c · 2e · 3a · 4a · 4c · 5b~5g · 6c · 8d · 8k · 8n · N3 · N6 · N10 | `src/app/(child)/session/` · `src/components/activities/` · `src/core/{scoring,speaking}/` · `src/server/actions/` | P2 · P9 · P10 | P12 순수 함수 | 세 영역 세션이 가짜 AI · 가짜 음성으로 끝까지 돌고 점수 · 단어별 정오가 남는다 | `tests/e2e/{reading,writing,speaking,timeout,font-size}.spec.ts` · `tests/unit/{score,speaking-judge}.test.ts` · `tests/integration/{writing-feedback,safety-cap,retry}.test.ts` |
| P12 | 단어장 · 복습 · 단원 통과 · 단계 평가 · 결과(11절 (8)). 세 상태 · 간격 반복 · 카드 꼴과 속하는 영역(C45 · C47) · 15장, 숙달 · 단원 통과(복사한 설정값) · 보강 · 단어 익히기 연습 · 부모 확인 판정과 표시, 단계 평가(벌 · 재응시 · AI 과제 채점 · 준비 중 · 졸업), 세션 결과, 별 · 연속 일수 | 3.2, 3.4, 3.5, 3.7, 4절 복습 · 단계 평가 · 세션 결과 · AC-2d · 6b · 6d · 6e · 7b · 7e · 9a~9c · 9f · 9g · 10a~10d · 10f~10h | `src/core/{review,mastery,unit-pass,level-test,stars,streak,practice-pick}/` · `src/app/(child)/{review,level-test,result}/` · `src/server/actions/` | P10 · P11(순수 함수는 P4) | 순수 함수는 P5~P11 과 | 프리뷰에서 시각 당기기로 단원 통과 · 단계 평가 통과 | `tests/unit/{spaced-review,review-card,unit-pass,level-test,stars,streak,practice-pick}.test.ts` · `tests/integration/unit-progress.test.ts` · `tests/e2e/{review,level-test,result}.spec.ts` |

### [사람] 단계

| 번호 | 하는 일 | 때 | 막히면 |
|---|---|---|---|
| H1 | Vercel 프로젝트 연결 · GitHub 연동 · 프리뷰 배포 · 함수 지역 서울 · 프리뷰 보호 확인 | P2 시작 | 관찰 페이지를 기기에서 못 연다 |
| H2 | 실기 확인. iPad Safari(읽어 주기 → 인식 교대 10턴, Siri · 받아쓰기 끈 채 막힘, 켠 뒤 다시 됨, 마이크 거부 뒤 다시 허용, 감시 타이머) · Android Chrome(쉼 세 번 든 1분 발표) · Windows Edge. 어른이 시험 문장을 읽는다 | P2 | 실패면 서버형 음성 인식을 붙일지 요청자가 정한다(S7). 13절 한 줄 뒤 P10 · P11 을 다시 계획 |
| H3 | Supabase 개발용 프로젝트(서울, 운영과 다른 조직, C26) · Data API 끄기 · 접속 정보를 Vercel Preview 와 GitHub 개발용 비밀값에 | P3 | 통합 시험 · 프리뷰 불가 |
| H4 | 비밀값. 가족 접근 코드(영문 · 숫자 12자 이상) 해시 · CRON_SECRET · 시각 당기기 날 수(Preview 만) · 개발용 Anthropic 워크스페이스와 키 · 그 월 지출 한도 | P3 · P5 · P9 | 값은 저장소 · 장부 · 대화에 적지 않는다 |
| H5 | 단원 틀 값 확인(6.3 순서 (1), C49 의 남은 하나)과 단계 평가 유형별 문항 수 13절 한 줄 승인 | P6 | 본 생성 (4-가) 못 함 |
| H6 | 고친 목업 · 새 목업 승인(11절 목업 표) | P6 | 화면 검토 기준이 없다 |
| H7 | 그림 카탈로그. 공개 그림 묶음 고르기 · 라이선스 확인 · 모자란 단어 그림 생성 승인 | P6 | 그 단어를 그림 문제에 못 낸다 |
| H8 | Supabase 운영 프로젝트 · GitHub 운영 환경 비밀값 · Vercel Deployment Checks 에 main 작업을 필수 검사로 | P7 | 운영 승격 보류를 확인 못 함 |
| H9 | 볼트 기록 훅에서 seed/ 를 뺄지 승인(첫 표본 전, 6.3) | P8 | 생성 세션이 턴마다 기록 |
| H10 | xhigh · high 네 단원 비교로 본 생성 effort 결정(S10). high 면 CLAUDE.md 서브에이전트 줄에 예외 한 줄 | P8 | 본 생성 못 함 |
| H11 | 묶음마다 표본 검토(수업 2개, 오류면 5개) · 사람 확인('정답 맞음 · 고침') · 분포 경고 '그대로 · 다시 만들기' | P8 묶음마다 | 다음 묶음 못 감 |
| H12 | 콘솔 한도 오류 표본. 개발용 워크스페이스에 아주 낮은 월 한도를 짧게 걸고 Haiku 1토큰 호출, 표본 고정, 한도 되돌림(C46) | P9(1-나 확인 호출 전) | 8절 분류가 가정으로 남는다 |
| H13 | 1-가 끝 사용. 프리뷰에서 배치 평가 → 단원 통과 → 단계 평가(시각 당기기) | 작업 11 | 1-나로 못 감 |
| H14 | 하위 plan 승인 · 커밋 · PR 병합 지시 | P마다 | — |
| H15 | GitHub 저장소 만들기 · 원격 추가 · 첫 push(CI 가 돌려면). 로컬 도구 준비(nvm Node 24 · pnpm 10.34.7)는 컨트롤러가 했다(C51) | P1a 작업 8 | CI 가 돌지 않아 작업 7 의 로컬 명령으로만 판정 |

### 시드 묶음 워크플로(P8, 영역 × 단계 하나에 한 번)

스크립트 API · 저장 자리는 workflow-authoring 스킬을 먼저 읽고 정한다. 생성 점은 본 생성용 정의다(학습 설계자 정의에서 갈라 브리프만 읽게 한 것, 6.3 (2)). 브리프 · 규격 고정은 curriculum-designer(Opus · xhigh)가 한다.

| 점 | 하는 쪽 | 들어오는 것 | 나가는 것 | 다음 조건 · 게이트 |
|---|---|---|---|---|
| 브리프 고정 | 컨트롤러(코드) | `seed/prompts/<영역>-<단계>.md` · 정의 파일 | 두 해시 · 답한 모델 ID → manifest 첫 줄 | 해시 기록(코드) |
| 단원 생성 | 본 생성용 정의 · Opus · effort(H10). 단원마다 하나, `pipeline` 동시 3(`CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS=3`) | 브리프 · 단원 규격 · 배정표 · 같은 단원 앞 수업 주제 | lessons JSON | 파일 생김 |
| 검증 | `pnpm seed:validate`(코드) | 칸 | 통과 · 실패 칸 | 실패 칸만 seed.max_retries(2)회까지 생성으로 되돌림(코드) |
| 풀이 검사 | `pnpm seed:check`(Sonnet 5.5 low) | 정답 숨긴 문항 | seed/checks/ | 다르게 풀린 칸은 사람 확인 목록(모델) |
| 모아 받기 | 워크플로 schema | 칸별 결과 | 칸 수 · 실패 · 사람 확인 수 · 걸린 시간 | 단원 다섯이라 에이전트 25개 경고 밑 |
| manifest 기록 | 컨트롤러 하나(쓰는 점) | 결과 · 해시 · 모델 ID 대조 | seed/manifest | 바뀌었으면 그 묶음 처음부터(코드) |
| 묶음 게이트 | 요청자(H11) | 시드 보기 화면 | seed/reviews/ · 사람 확인 · 경고 결정 | 오류면 표본 5개, 같은 오류 둘이면 브리프 고쳐 다시(사람) |

### 화면 구현 · 검토 루프(P5 · P10~P12, 화면 없는 P 는 화면 검토만 뺀다)

| 점 | 하는 쪽 · 모델 | 나가는 것 | 다음 조건 |
|---|---|---|---|
| 브리프 | 컨트롤러 | `task-N.md`(허용 파일 · 정본 절 · 문구 · 설정 키 · 시험 이름) | 허용 파일이 안 겹침. 동시에 셋까지 |
| 구현 | implementer · Opus · high, 시험 먼저 | diff · `task-N-report.md` | Stop 훅(biome · vitest) 통과 |
| 코드 검토 | code-reviewer · Opus · xhigh | `review-N.md`(심각도 · 근거) | Critical · Important 0 |
| fix 라운드 | implementer → code-reviewer 범위 한정 재검토 | 지적별 ADDRESSED · NOT ADDRESSED | 3회 넘으면 요청자에게 |
| 화면 검토 | design-reviewer · Opus · xhigh | Playwright 스크린샷 · 목업 · 4절 문구 · 크기 대조 | Approved |
| 커밋 | 요청자 지시(H14) | 커밋 · PR | — |

열린 지적은 `ledger-open.md`, 닫힌 지적은 `ledger-closed.md` 에 둔다. 검토 브리프에는 새로 볼 것과 안 닫힌 것만 담는다.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 | P |
|---|---|---|---|---|
| 1 | 음성 인식 기기 차이. iPad Safari 는 webkit 접두사이고 Siri · 받아쓰기가 켜져야 한다. Chrome Android 는 continuous 를 무시하고 첫 쉼에서 끝낸다. `language-not-supported` 는 7절 오류 행에 없다(역분석 조사) | 실기 전 가짜 API 는 가정이다. 말하기 세션 · 배치가 기기에서 깨진다 | H2 기록을 가짜 대본으로 옮긴 뒤 P10 말하기 배치 · P11 말하기를 확정한다. 실패면 S7 결정 뒤 다시 계획 | P2 · P10 · P11 |
| 2 | 마이크는 HTTPS 에서만 열린다(추측) | 로컬 http 로는 iPad 시험이 안 된다 | 관찰 페이지를 프리뷰로 먼저 올린다(H1) | P2 |
| 3 | 시드 생성 시간과 사람 병목. 1차 단원 122개, 세 세션 약 21~42시간(합 63~126시간). 표본 읽기 · 사람 확인 · 경고 결정이 요청자 몫 | 1-나 · 운영 배포가 늦어진다. 구독 한도 | P5 · P6 뒤 바로 시작해 P10~P12 · 1-나와 나란히. 표본에서 하루 단원 수 · 묶음 시간 · 요청자 시간을 재어 6.3 문단을 고친다. 묶음 게이트는 줄이지 않는다 | P8 |
| 4 | 설정값을 코드에 박는 실수(0.8 · 150 · 15 등) | 사용 시험 뒤 값을 바꿀 때 코드가 따로 논다 | 설정 읽기 함수 하나만 쓴다. 단위 시험도 시험용 settings 에서 읽는다. check-ids 가 12절 키 ↔ settings.json ↔ 코드 문자열을 맞대고 설계 숫자를 찾는다(CI). 검토 점검 항목 | 전부 |
| 5 | RLS · 쿠키 확인 누락. 새 서버 액션 · Route Handler 가 첫 줄 확인을 빠뜨리거나 새 테이블 RLS 가 빠진다 | 공개 주소에서 데이터가 샌다 | 통합 시험이 `'use server'` 파일과 `route.ts` 를 훑어 모두 401 인지 본다. 마이그레이션 시험이 relrowsecurity 와 anon · authenticated 권한 0 을 본다. Data API 끔(H3) | P3~ |
| 6 | 마이그레이션 순서. drizzle-kit 이 이름 바꾸기를 지우기 · 더하기로 만들 수 있다 | 옛 코드가 도는 동안 깨진다(5절 '더하기만') | CI 가 `drizzle/*.sql` 의 DROP · RENAME 을 막는다. 지우기는 다음 배포에서 따로 승인. migrate 만 쓰고 push 금지 | P3 · P7 |
| 7 | 순수 함수와 DB 경계. `src/core` 가 db · next 를 가져오거나 Date.now() 를 부른다 | 판정 시험 불가, 학습일 어긋남 | dependency-cruiser 규칙(CI). 시각은 인자. 한 시계 함수, 스키마의 defaultNow · now() 금지(시험) | 전부 |
| 8 | 'AI 쉬는 중' 경계. 1-가는 판정 · 기록만이고 상태 · 확인 호출은 1-나 | 1-가 호출 앞 판정을 1-나가 다시 짠다 | 호출 앞 판정을 순수 함수 하나(학습일 호출 수 · 비용 · 설정)로 두고 1-나가 ai_status 입력을 더한다. 콘솔 한도 · 연결 장애는 1-가에서 '호출 하나의 실패'로만 | P9 |
| 9 | Anthropic 제약. 모델 ID 셋, Opus 는 생각 단계를 못 끔, Sonnet between_tools · Haiku disabled, xhigh · max 와 끄기는 400, temperature · top_p · top_k 는 400, 생각 토큰이 max_tokens 에 듦, 구조화 출력은 개수 · 길이를 강제 않음, refusal · max_tokens 면 스키마가 깨질 수 있음 | 400 · 잘림 · 검증 실패 | 실제 응답 표본(역분석 제안 5)을 먼저 받고 계약 시험을 그것으로 짠다. 정규화가 제약을 맡는다. 조합은 model_prices 시드 표로 검사. SDK 판 고정, 올릴 때 AI 계약(수동) | P9 |
| 10 | 개발용 키 비용. 풀이 검사 약 50달러 이하(1차 절반쯤) · 표본 평가 · 계약 · 관찰 | 월 한도 초과. 낮은 한도 시험 중 다른 개발 호출이 멈춤 | 워크스페이스 월 한도(H4). CI · e2e 는 키가 없고 가짜 클라이언트만 쓴다. 가짜는 운영 빌드에서 못 고른다. 풀이 검사는 해시가 바뀐 칸만. H12 는 짧게 | P5 · P9 |
| 11 | 1-가 동안 main 병합이 Vercel 운영 배포를 만든다 | H8 전에는 검사 없이 덜 찬 앱이 운영 주소로 간다 | H1 에서 H8 까지 운영 승격을 막는 길(운영 갈래를 따로 두기 · 수동 승격)을 요청자가 고른다. H8 뒤에는 main 작업이 완전성 실패로 승격을 보류한다(10절 '첫 배포에서 보류 확인'). 운영 도메인은 H8 뒤에 붙인다 | P1 · P7 |
| 12 | 하위 plan 크기. P3 · P10 · P11 · P12 는 파일 열 개를 넘는다 | 검토가 느슨해진다 | 하위 plan 을 쓸 때 a · b 로 나눈다(예: P10a 첫 실행 · 배치, P10b 홈 · 목록 · 세션 틀). 생성기가 만든 파일은 수에서 뺀다 | P3 · P10~P12 |
| 13 | 시드 보기 화면이 아이 화면보다 먼저다(11절 (2-1) 이 (6) · (7) 앞) | 같은 그림을 두 번 짠다 | 활동 표시 컴포넌트를 P5 가 만들고 P11 이 상호작용만 더한다. 2차 단원 미리보기도 이것을 쓴다(4절) | P5 · P11 |
| 14 | Supabase 무료는 1주 비활성이면 멈춘다 | 프리뷰 · 적재 작업 실패 | keepalive 를 P7 에 둔다(10절 운영 행, 차수 표시 없음 — 판단) | P7 |
| 15 | 시험용 Postgres 에는 anon · authenticated 역할이 없다 | RLS · 권한 회수 SQL 시험 실패 | 시험 준비 스크립트가 두 역할을 만든다(추측). Data API 확인은 개발용 프로젝트에 check-data-api | P3 |
| 16 | seed/manifest · 장부를 여러 에이전트가 동시에 고친다 | 해시 · 결과 덮어쓰기 | 쓰는 점은 컨트롤러 하나. 워크플로 결과는 schema 로 돌려받는다 | P8 |
| 17 | 회화 시드 (4-나)는 1-나 회화 턴 · 표본 평가 뒤다 | 완전성 검사가 1-나 끝까지 실패한다 | 1-가 CI 는 빈 칸을 보고만 한다(9절 B5-20). main 실패는 1-나 끝까지 예상된 상태로 적어 둔다 | P7 · P8 |
| 18 | 접근 코드 실패의 IP 기록 자리. 5절은 parent_auth 행에 적고 열 꼴은 없다. '하루 뒤 지운다'의 Cron 은 1-나 | 구현자가 꼴을 지어낸다 | parent_auth 안에 IP 해시 · 실패 수 · 시각을 두고 읽을 때 하루 지난 것을 지운다(추측). 다르면 5절 먼저 | P3 |
| 19 | 프레임워크 판 차이. Next.js 16 은 middleware 대신 proxy.ts, 응답 뒤 작업은 after() | 옛 판 예제로 짠다 | 하위 plan 마다 공식 문서로 확인하고 브리프에 판을 적는다 | P1 · P3 |

### 정할 것(정본에 없던 것, 컨트롤러가 정함)

| 번호 | 무엇 | 왜 | 결정(컨트롤러 2026-10-16 06:5x) |
|---|---|---|---|
| ① | 1-가 프리뷰의 회화 카드. 회화 시드는 (4-나), 회화 세션은 1-나다. 말하기 배치 뒤 회화 카드를 누를 때 무엇을 보일지 정본에 없다 | 구현자가 지어내게 된다 | C50 (1): '토리가 준비 중이에요. 곧 만나요'와 '홈'만 보이고 세션을 열지 않는다 |
| ② | 1-가 안전 상한 안내 문구. 11절은 '안내만 보인다'뿐이다. 4절 'AI 쉬는 중' 문구('토리가 잠깐 쉬어요. 다른 공부를 해 볼까요')를 쓰자는 제안 | 아이 화면 문구는 정본에서 옮긴다 | C50 (2): 4절 'AI 쉬는 중' 문구 그대로 |
| ③ | AC-8j(DB 크기 검사 · 옛 개정 정리 작업)의 차수. 11절 1-가 · 1-나 어디에도 없다. Cron(1-나)과 함께 두자는 제안 | 증명할 차수가 없다 | C50 (3): 1-나(Cron 과 함께). 15절 AC-8j 에 적음 |
| ④ | 1-가 안에 만들 실시드 범위. 11절은 '(5) 본 생성 시작'뿐이다. H13 에는 배치 가 벌과 영역마다 한 묶음 이상 · 그 단계 평가가 필요하다(추측) | 1-가 끝 판정이 서지 않는다 | C50 (4): 배치 가 벌 전부 + 읽기 · 쓰기 · 말하기 1단계 단원 5개 전부 + 1단계 단계 평가 1벌 이상. 나머지는 1-나와 나란히 |
| ⑤ | 하위 plan 파일 자리. 변경 폴더 규약에 하위 plan 자리가 없다. `plan-pNN-<이름>.md` 를 이 폴더에 두자는 제안 | 감사 기록이 흩어진다 | `plan-pNN-<이름>.md` 를 이 폴더에 둔다. intent/README 규약에 더함 |
| ⑥ | 시드 생성 점의 정의. 그래프 엔지니어링 스킬 · 조사는 agentType 을 curriculum-designer 로, 정본 6.3 (2)는 본 생성용 정의를 따로 둔다 | 정본이 이긴다. 스킬 문구가 어긋난다 | 정본대로(본 생성용 정의). 스킬과 볼트 쪽 문구를 고쳤다(06:5x) |

### 제약

- 설계를 바꾸지 않는다. 다르게 해야 하면 13절 한 줄 → 정본 장 → plan · 코드 순서다.
- 1-가 범위는 11절 그대로다. 회화 · 부모 화면 · 'AI 쉬는 중' 상태와 확인 호출 · 비용 알림 · '이 문제 이상해요'와 신고 · 원문 삭제 · Cron 은 1-나다. 부모 확인은 판정과 표시까지다. 홈의 부모 메뉴 점은 1-가에 두고 PIN 화면은 1-나다(11절을 읽은 경계).
- 숫자는 settings(12절)에서 읽는다. 단원 시작 때 unit.* · level.* · talk.said_ratio · talk.known_days 를 unit_progress 에, 평가 시작 때 판정 키를 level_tests 에 복사한다.
- 시각은 한 시계 함수에서 읽는다. 학습일은 app.timezone(Asia/Seoul) · app.day_start_hour(4)다. DB now() 를 쓰지 않는다. 시각 당기기는 프리뷰만이다.
- AI 는 서버에서만 부른다. 키는 서버 환경 변수에만 둔다. 응답은 Zod 로 검증하고 정규화한다. temperature · top_p · top_k 를 보내지 않고 max_retries 0 이다. CI · e2e 는 실제 API 를 부르지 않는다.
- 모든 요청은 가족 접근 쿠키를 본다(없으면 401). 서버 액션 · Route Handler 는 첫 줄에서 다시 본다. 모든 테이블은 RLS 로 anon · authenticated 를 거부한다. DB 는 서버 Drizzle 로만.
- 녹음하지 않는다. 생각 꺼내기 · 쓰기 입력의 전화번호 · 주소 형태는 보내기 전에 가린다(6.1).
- 아이 화면은 한 화면 한 행동 · 해요체 · 안내 20px · 영어 24px · 버튼 22px · 누르는 곳 56 × 56px · 퍼센트 없음이다. 기다림 표시는 ui.wait_hint_seconds(1 · 5)다(4절).
- 용어는 영역 · 단계 · 단원 · 활동 · 토막이다. '트랙' · '유닛'을 쓰지 않는다. 코드 식별자는 영어다.
- 서브에이전트는 호출마다 model · effort 를 적는다. implementer Opus · high, code-reviewer · design-reviewer · analyst Opus · xhigh, 규격 설계 curriculum-designer Opus · xhigh, 본 생성은 H10 결정, 단순 작업 Sonnet · low. 구현자와 검토자를 나눈다. 커밋은 요청자 지시 때만.
- 비밀값 · 아이 이름은 저장소 · 장부 · 대화에 적지 않는다. `.env.example` 은 이름만 둔다.
- 1-가 프리뷰의 학습 기록은 운영 DB 로 옮기지 않는다(11절).

## 증명 (Proof)

모든 하위 plan 은 `pnpm lint`(Biome) · `pnpm build`(next build) · `pnpm test`(단위) · `pnpm test:int`(통합, 시험용 Postgres) · `pnpm e2e`(Playwright, 가짜 AI · 가짜 음성)를 통과한다.
시드는 `pnpm seed:validate` 를 통과한다. PR 의 CI 는 있는 칸의 검증만 막고 빈 칸 수는 보고하며, main · dev-load 는 `--complete-through <n>` 으로 빈 칸도 막는다(9절).
CI 작업은 `ci / lint · build · unit · integration · e2e · depcruise · spec-trace · bundle-secrets · seed-validate`, `main / migrate · seed-validate · seed-load`, `dev-load` 다(이름 제안).
시험 이름은 AC 번호로 시작한다. `pnpm spec:trace` 가 아래 표의 AC 마다 이름이 맞는 시험이 있는지 센다(조사 P4). 회화 사례는 순수 함수 시험에만 넣는다(6b · 6d · 7b · 10a). 회화 데이터를 채우는 서버 · 화면은 1-나다.

| 수용 기준 | 증명(시험 이름 · 검사) | 파일 · 명령 | P |
|---|---|---|---|
| AC-1a | 통합 "AC-1a 맞는 코드 쿠키 · IP 5회 15분 잠금 · 쿠키 있는 기기 계속 · 12자 미만 거부", e2e "AC-1a 접근 코드 → 첫 실행 PIN 필수" | `tests/integration/access.test.ts` · `tests/e2e/first-run.spec.ts` | P3 · P10 |
| AC-1b | e2e "AC-1b 읽기 3단계 고름 → 단원 1 수업 1, 쓰기 · 말하기 배치", 통합 "AC-1b 세션 열기 AI 0회" | `first-run.spec.ts` · `session-start.test.ts` | P10 |
| AC-1c | e2e "AC-1c 여덟 화면 순서 · 로마자 채움 · 묶음 변형 · 둘째 기기 홈 · 마이크 확인 실패 알림 행 · 1~6단계만 · 회화 5 · Joy 별명" | `first-run.spec.ts` | P10 |
| AC-2a | e2e "AC-2a 카드 넷 · 막대 둘 · 이번 주 · 오늘 완료(부모 확인 대기 · 평가 세션) · '첨삭이 왔어요'". 회화 카드의 친한 정도 · 제목은 1-나 | `home.spec.ts` | P10 · P11 |
| AC-2b | e2e "AC-2b 셋째 수업 먼저 · 다음 단원 잠김 · 새 수업 셋 → 횟수 3 · 별 3", 통합 "AC-2b 잠긴 lesson_id 시작 거부" | `lesson-list.spec.ts` · `session-start.test.ts` · `lesson-list-state.test.ts` | P10 · P12 |
| AC-2c | 통합 "AC-2c 다시 하기 별 · 횟수 · 최근 성적 그대로 · attempts 정오 · 같은 변형 · 말하기 평가 호출 · 성적 제외". 회화 턴 부분 1-나 | `retry.test.ts` | P11 · P12 |
| AC-2d | 단위 · e2e "AC-2d 첫 화면 셋 · '여기부터 해요' 하나 · 안 해 본 수업 별 1 · 둘째는 없음 · 단어 익히기 '복습하기' · 학습일 문구 · 단계 평가 맨 위" | `lesson-list-state.test.ts` · `lesson-list.spec.ts` | P10 · P12 |
| AC-2e | 통합 · e2e "AC-2e 확인 문구 · 중단 · 진행 하나 · 별 없음 · 6단계 초고 채움 · 첫 활동 '홈' 행 없음" | `session-start.test.ts` · `writing.spec.ts` | P10 · P11 |
| AC-2f | 단위 · e2e "AC-2f 배정 8 건너뛴 다지기 9 · 배정 3 건너뛴 4 → 첫 활동에 단어 더함". 1단계 회화 부분 1-나 | `lesson-list-state.test.ts` | P10 |
| AC-3a | 단위 "AC-3a 길이 · 5% · 글로서리 거부", e2e "AC-3a 4단계 55~80단어 · 4문제 · 즉시 해설" | `seed-validator-reading.test.ts` · `reading.spec.ts` | P4 · P11 |
| AC-3b | 단위 "AC-3b 카탈로그 밖 그림 키 거부" | `seed-validator-image.test.ts` | P4 |
| AC-4a | 단위 · e2e "AC-4a 1 · 3단계 AI 0회 · 허용 정답 · 대문자 · 마침표 카드 · 기기 자판 안 뜸 · 첫 활동 미리보기" | `score.test.ts` · `writing.spec.ts` | P11 |
| AC-4b | 단위 "AC-4b 고칠 곳 2 → 1 · 6단계 교정 3 → 2 · 10단계 4 → 3 · 채점표 1~4" | `normalize.test.ts` | P9 |
| AC-4c | e2e(고정 표본) · 통합 "AC-4c 생각 꺼내기 3턴 · 제출 즉시 · 결과 문구와 기다림 · '첨삭 보기' · 첨삭 → 고쳐 쓰기 → 모범 답안" | `writing.spec.ts` · `writing-feedback.test.ts` | P11 |
| AC-5a | 단위 "AC-5a 'i have 2 dogs.' 100% · 'I have dogs' 75% · 덧붙임 감점 없음" | `match-rate.test.ts` | P2 |
| AC-5b | 단위 · e2e "AC-5b 1 · 6 · 10단계 분량 · 5~8단계 대화 활동 없음 · 생각 화면 30초 → 발표 → 피드백 → 확인 질문 · 예비 확인 질문 · 듣기 AI 0회" | `seed-validator-speaking.test.ts` · `speaking.spec.ts` | P4 · P11 |
| AC-5c | e2e "AC-5c 인식 API 없음 · 권한 거부 → 두 카드 닫힘 · 배치 전 회화 문구 · audio-capture 한 번은 안 닫힘 · 도중 거부 → 진행 · 홈 진입마다 다시 확인". 부모 화면 · '마이크 다시 확인'은 1-나 | `home.spec.ts` · `speaking.spec.ts` | P10 · P11 |
| AC-5d | 단위 · e2e "AC-5d 3단계 문법 지적 지움 · 판정 글자 없음 · 부분 · 다시 → 바른 답 재생" | `normalize.test.ts` · `speaking.spec.ts` | P9 · P11 |
| AC-5e | 단위 · e2e "AC-5e 1단계 3초 · 4단계 1.5초 · 6단계 2초 쉼 둘 안 끊김 · '다 말했어요' · 첫 쉼 끝 → 이어 붙임 · 배치 실패 3번 → 예비". 회화 부분 1-나 | `listen-end.test.ts` · `speaking.spec.ts` · `placement.spec.ts` | P2 · P10 · P11 |
| AC-5f | 단위 · e2e "AC-5f 1단계 질문 답 AI 0회 · 0.8 · 3단계 한국어 뜻 · 0.95 · 0.7 · 0.5 결과 말 · '같이 말해 볼까요' 뒤 넘어감 · 안전 상한에도 1~2단계 답 됨". 쉬는 상태 쪽은 1-나 | `speaking-judge.test.ts` · `speaking.spec.ts` | P11 |
| AC-5g | 단위 · e2e "AC-5g 그림 2~3장 · 요청에 장면 설명 · 키 · 설명 없음 거부" | `seed-validator-speaking.test.ts` · `speaking.spec.ts` | P4 · P11 |
| AC-5h | 단위 "AC-5h 1단계 문장 4 · 5단계 질문 4 · 허용 답 둘 · 한국어 뜻 없음 · 예비 확인 질문 둘 거부" | `seed-validator-speaking.test.ts` | P4 |
| AC-6a | e2e "AC-6a 닫았다 열면 같은 활동 · 같은 입력" | `resume.spec.ts` | P10 |
| AC-6b | 단위 "AC-6b 새 · 안 해 본 · 처음부터 1개, 다시 하기 · 복습 · 평가 0, 하루 다섯 → 5, 회화 사례, 쓰기 6단계는 고쳐 쓰기 때" | `stars.test.ts` | P12 |
| AC-6c | 단위 "AC-6c 3.7 경계 · 쓰기 4단계 0.67 · a 0.5 · L 0.2 · 점수 없는 세션 제외" | `score.test.ts` | P11 |
| AC-6d | 단위 "AC-6d 쉬는 날 2일 · 3일째 '다시 1일째'와 최고 기록 · 목표 턴 전 회화만 한 날" | `streak.test.ts` | P12 |
| AC-6e | e2e "AC-6e '다음 수업'(큰) · '홈'(작은) · '수업 목록' · '단원 n을 통과했어요!'" | `result.spec.ts` | P12 |
| AC-7a | 단위 "AC-7a 칸 지움 · 사람 확인 남음 → 실패 · 평가 지문 겹침 · 단원별 4 아님 · 회화 평가 카드 장 규칙 거부", CI `main / seed-validate`. 실시드 전체 통과는 (4-나) 뒤라 1-나 | `seed-validator-complete.test.ts` | P4 · P7 · P8 |
| AC-7b | 통합 · 단위 "AC-7b 읽기 세션 AI 0회 · 단어 익히기 → 다른 변형 연습 · 별만 · 같은 날 다시 하기 별 없음 · 회화 연습 고르기" | `unit-progress.test.ts` · `practice-pick.test.ts` | P12 |
| AC-7c | 단위 "AC-7c k5 6+4 · k4 8+5 · k3 10+5 · 최소 수업 수는 큰 값" | `vocab-allocate.test.ts` | P4 |
| AC-7d | 단위 "AC-7d 분포 경고는 CI 통과 · 다르게 풀림 → 사람 확인 · CI API 0회" | `seed-validator-distribution.test.ts` · `solve-check.test.ts` | P4 · P5 |
| AC-7e | 통합 "AC-7e 6단계 통과 → 준비 중 · 알림 하나 · 다른 영역 열림 · 시드 7 적재 → settings_history '시드 적재' → 7단계 단원 1 · 5단계 시작 범위 끝 알림" | `seed-load.test.ts` · `unit-progress.test.ts` | P7 · P12 |
| AC-7f | e2e(로컬) "AC-7f 아이 화면 모습 + 정답 · 해설 · 새 단어 · '오류' 메모 → seed/reviews/ 한 행 · 프리뷰 · 운영 빌드에서 안 열림" | `tests/e2e-local/seed-viewer.spec.ts` · `pnpm e2e:local` | P5 |
| AC-7g | 통합 "AC-7g 시각 당기기 → 학습일 넘어감 → 판정 · 운영 빌드 무시", CI "dev-load 운영 비밀값 없음 · 빈 칸 PR 은 보고만" | `clock.test.ts` · `dev-load` · `ci / seed-validate` | P3 · P7 |
| AC-8a | 단위 "AC-8a 알림 기준 셋은 허용 · 안전 상한 둘만 막음 · 80턴 닫기 · 둘째에만 알림 · 56달러 근접 · 1일 0시 30분은 새 달" | `cost-alert.test.ts` | P9 |
| AC-8b | 통합 · e2e "AC-8b 기준 넘겨도 말하기 세션 그대로 · 제한 문구 없음". 쉬는 상태 부분 1-나 | `safety-cap.test.ts` · `speaking.spec.ts` | P9 · P11 |
| AC-8c | 통합 "AC-8c ai_calls 열 · 본문 없음 · temperature · top_p · top_k 없음 · max_tokens = ai.max_tokens.<호출>". 끝맺음 턴 1-나 | `ai-calls.test.ts` | P9 |
| AC-8d | e2e "AC-8d 늦춘 표본 10초 → '이번에는 바로 써 볼까요' · 예시 · 시드 힌트 초고 화면" | `timeout.spec.ts` | P9 · P11 |
| AC-8i | 단위 · 통합 "AC-8i xhigh · Opus '끔' 설정 저장 안 됨 · 구간 키 독립 · Haiku 구간은 disabled". 회화 턴 · 확인 호출 요청은 1-나 | `combo.test.ts` · `seed-load.test.ts` | P7 · P9 |
| AC-8k | 통합 "AC-8k 거절 둘 → '첨삭 못 함' · 알림 · 다시 고르면 새 초고" | `writing-feedback.test.ts` | P11 |
| AC-8n | 통합 "AC-8n 첨삭 404 셋 → 쉬지 않음 · '호출 설정 확인 필요' 하나 · 다섯 번 실패 → '첨삭 못 함'". 확인 호출 · 이어진 실패 수 1-나 | `ai-errors.test.ts` · `writing-feedback.test.ts` | P9 · P11 |
| AC-9a | 단위 "AC-9a 0~5 → 1 · 2 · 4 · 30 · 60 · 120 · 3회 '안다' · 틀리면 0" | `spaced-review.test.ts` | P12 |
| AC-9b | 단위 · e2e "AC-9b 버튼 없음 · 철자 타일 · 말하기 소리만 · 두 단계 · 겹침 한 장 · '씀' 먼저 · 글자 가림 · 다시 낸 카드 첫 단계 · 알파벳 중 철자 없음 · 16번째 미룸 · 순서 · '맞힌 카드 n장' · '다음 복습'" | `review-card.test.ts` · `review.spec.ts` | P12 |
| AC-9c | 단위 "AC-9c 다시 하기 · 연습에서 틀림 → 다음 학습일, 맞음 → 그대로" | `spaced-review.test.ts` | P12 |
| AC-9f | 단위 · e2e "AC-9f 말하기만 카드 첫 단계 틀림 → 철자 없음 · '씀' 행 안 생김 · 겹침은 '씀' 먼저 · 처음 만난 영역 15장" | `review-card.test.ts` · `review.spec.ts` | P12 |
| AC-9g | 단위 "AC-9g 말하기 '알아봄' 24개 → 단어 조건 충족(철자 · '씀' 무관)" | `unit-pass.test.ts` | P12 |
| AC-10a | 단위 "AC-10a 80% · 80% · 6회 · 4학습일 / 10회 · 7학습일 · 다시 하기 · 연습 학습일 · 회화 갈래 · 복사한 값" | `unit-pass.test.ts` | P12 |
| AC-10b | 단위 · 통합 "AC-10b 16/20 · 12/15 · 2.6 → 0.65 · 부분 0.5 · 1~2단계 0/1 · 다른 벌 · 같은 학습일 재응시 막음 · 거절 둘 → 19문항 · 60초 문구 · '평가 결과 보기' · 따라 말하기 0.8" | `level-test.test.ts` · `unit-progress.test.ts` | P12 |
| AC-10c | 단위 · 통합 "AC-10c 보강 상한 넘음 → 확인 필요 · 사흘 → 다음 단원 · progress_events" | `unit-pass.test.ts` · `unit-progress.test.ts` | P12 |
| AC-10d | 통합 "AC-10d 12단계 통과 → 졸업 · 새 수업 없음"(시험용 시드 12단계) | `unit-progress.test.ts` | P12 |
| AC-10f | 단위 "AC-10f 안 한 보강 → 다른 변형 → 가장 오래전 것 별 없이 · '평가 전 보강' 묶음" | `level-test.test.ts` | P12 |
| AC-10g | 통합 "AC-10g 시작 뒤 unit.min_days 바꿔도 복사한 값 · 단계 내림 · 처음부터는 새 회차 · 평가 중 pass_score 바꿔도 복사한 값". 바꾸는 화면은 1-나 · 2차라 서버 함수를 직접 부른다 | `unit-progress.test.ts` | P12 |
| AC-10h | e2e · 단위 "AC-10h 시작 문구 · '반을 했어요' · 통과 · 범위 끝 문구 · 15 '거의 다 왔어요' · 10 '조금 더 연습해요' · 숫자 없음 · 'n단계 평가 보기' · '나중에 할래요'". 회화 평가 문구 1-나 | `level-test.spec.ts` · `level-test.test.ts` | P12 |
| AC-11a | 단위 "AC-11a 3/3 → 5 2/3 → 6 1/3 → 시작 4 · 두 문항 틀림 → 못 넘음 · 1단계 못 넘음 → 알파벳" | `placement.test.ts` | P10 |
| AC-11b | e2e · 통합 "AC-11b '말하기는 n단계' · '이제 토리를 만날 수 있어요' · 버튼 하나 · 회화는 n 과 4 중 낮은 값 · 부모가 말하기만 고른 경우" | `placement.spec.ts` | P10 |
| AC-11c | e2e · 단위 "AC-11c 0.6 → 0.85 맞음 · 첫 시도 뒤 문구만 · 실패 3번 → 예비 · '말하기 일부는 듣기로 봤어요' · 마이크 없으면 말하기 배치 안 함" | `placement.spec.ts` · `placement.test.ts` | P10 |
| AC-11d | e2e · 단위 "AC-11d 시작 문구 · '몰라요'는 틀림 · 24시간 뒤 멈춘 문항부터" | `placement.spec.ts` | P10 |
| AC-17a | 통합 "AC-17a 3.0 · 4.0 · 3.1 · 2.1 판 고르기 · 멈춘 배치 · 옛 행 남음 · 개정 5 목표 턴 수 무시" | `seed-version.test.ts` · `version-pick.test.ts` | P7 |
| AC-17b | 통합 · CI "AC-17b 두 번 적재 같은 행 수 · 실패 칸이면 0행 · main 순서와 앞 실패면 뒤 멈춤". 신고 판단 기록 단계 1-나 | `seed-load.test.ts` · `main` | P7 |
| AC-N2 | 1-가 몫은 AC-8a 단위다. 사용 시험 4주 비교는 운영 뒤 | `cost-alert.test.ts` | P9 |
| AC-N3 | 수동 점검표(iPad Safari · Android Chrome · Windows Edge · Firefox 닫힘) + e2e "AC-N3 감시 타이머 두 번 · aborted 여섯 → 안내 · '마이크가 멈춤' 알림 행 · network 문구". 회화 no-speech 부분 1-나 | `docs/checklists/speech-check.md` · `speaking.spec.ts` | P2 · P11 |
| AC-N4 | CI `bundle-secrets`(키 · 접속 문자열 · 접근 코드 없음) + 단위 "AC-N4 생각 꺼내기 전화번호 가림". 원문 삭제 · 백업 복원은 1-나 · 운영 | `scripts/check-bundle.ts` · `mask.test.ts` | P1 · P9 |
| AC-N5 | 통합 "AC-N5 쿠키 없는 홈 · 모든 서버 액션 · Route Handler 401" · "RLS 켜짐 · anon · authenticated 권한 0" + publishable 키 조회가 권한 오류 또는 0행 | `access.test.ts` · `rls-grants.test.ts` · `pnpm check:data-api` | P3 |
| AC-N6 | 1-가 몫은 AC-8d 다. p95 5초는 사용 시험 | `timeout.spec.ts` | P11 |
| AC-N7 | 단위 "AC-N7 23:50 · 0:10 같은 학습일 · 4:10 다음 · 3:50 끝낸 수업은 전날 오늘 완료 · 이번 주 n일" | `learning-day.test.ts` · `today-done.test.ts` | P3 · P10 |
| AC-N9 | e2e "AC-N9 아이 화면 글자 20 · 24 · 22px · 누르는 곳 56px · '%' 없음"(10.9형, 아이 화면 전부) | `font-size.spec.ts` | P10~P12 |
| AC-N10 | e2e "AC-N10 늦춘 표본 1초 안 기다림 표시 · 5초 뒤 해요체 한 줄" | `timeout.spec.ts` | P11 |
| 공통 | 위 명령과 CI 작업 전부 | `ci` | 전부 |

1-가 몫이 아닌 AC: AC-8e · 8f · 8g · 8h · 8l · 8m · 8p · 9d · 9e · 10e · 12a~12h · 15a~15p · 16a~16d · 17c 는 1-나다. AC-11e · 11f · 13a · 13b 는 2차, 14a · 14b 는 3차다. AC-8o · N1 · N8 은 사용 시험(N8 은 1-나 회화)이다. AC-8j 는 1-나다(정할 것 ③, C50).

## 완료 보고 (Done)

구현 뒤 채운다.
