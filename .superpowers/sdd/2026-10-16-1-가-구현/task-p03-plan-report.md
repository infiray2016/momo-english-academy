# 보고: P3 하위 plan 작성(DB · 시계 · 설정 읽기 · 접근 제어)

브리프: `task-p03-plan.md` · 쓴 사람: 계획자(general-purpose · Opus · xhigh) · 일시: 2026-10-16 · 상태: DONE_WITH_CONCERNS(두 plan 모두 파일 열 개를 넘고, 착수 전에 컨트롤러가 정할 것이 있다)

## 쓴 파일

| 파일 | 줄 | 손으로 쓰는 파일 | 작업 수 | PR 나눔 지점 |
|---|---|---|---|---|
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p03a-DB-시계-설정.md` | 354 | 16(새 16, drizzle-kit 생성 파일 뺌) | 8 | 작업 4 뒤: A1(스키마 · 마이그레이션 · DB 연결 · 시험용 Postgres · RLS, 9) · A2(학습일 · 설정 읽기 · 시계, 7) |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p03b-접근-제어.md` | 236 | 17(새 16 · 수정 1) | 8 | 작업 3 뒤: B1(토큰 · 코드 해시 · 잠금 · 함수 안 확인, 8) · B2(proxy · 화면 · e2e · Data API 확인, 9) |
| 이 보고 | — | — | — | — |

두 plan 은 머리에서 서로를 가리킨다. 상태는 둘 다 draft 다. 코드 · 설치 · 생성 명령은 돌리지 않았다. 돌린 명령은 읽기뿐이다(`npm view`, `pnpm spec:trace`, 설치판 `node_modules` 읽기, `which`).

## 요지

- P3a 는 5절 29 테이블(시드 8 · 학습 13 · 운영 8)의 열 · 제약 · 열거형을 표로 정했고, 권한 회수는 사용자 정의 마이그레이션 `0001_api_roles_revoke.sql` 에 SQL 그대로 적었다.
- 이 컴퓨터에 Docker · Postgres 가 없어, 시험용 Postgres 는 npm 의 embedded-postgres 로 로컬 · CI 를 같은 방법으로 띄우기를 권한다. Supabase 의 anon · authenticated 역할과 기본 권한을 흉내 낸 뒤 마이그레이션해 회수가 실제로 듣는지 시험한다.
- 한 시계는 `VERCEL_ENV=preview` 또는 시험일 때만 `CLOCK_SHIFT_DAYS` 를 읽고, 학습일은 `src/core` 의 순수 함수로 둔다. 시계 모듈은 DB 를 가져오지 않는다(proxy 가 가져오므로).
- P3b 는 proxy 가 쿠키 없는 페이지를 `/access` 로 다시 쓰고, 401 은 그 페이지의 `unauthorized()` 가 낸다(`experimental.authInterrupts`). rewrite 의 상태 코드가 남는지는 원본을 읽고도 확정하지 못해 그 길을 피했다.
- 접근 코드 제출은 서버 액션이 아니라 Route Handler 다. 다시 쓴 화면의 주소가 `/` 라서 서버 액션은 proxy 에 막히기 때문이다. 쿠키는 `ACCESS_CODE_HASH` 에서 HKDF 로 파생한 열쇠의 HMAC 토큰이라 코드를 바꾸면 모두 무효가 된다.
- spec-trace 의 missing-test 는 66 → 63(P3a) → 62(P3b)가 된다.

## 확인한 사실(2026-10-16)

| 사실 | 출처 · 판 |
|---|---|
| drizzle-orm 0.45.4 · drizzle-kit 0.31.11 · postgres 3.4.9 가 npm 최신(P1a 고정판). embedded-postgres 최신 18.4.0-beta.17, 17 계열 끝 17.10.0-beta.17 | `npm view` |
| 설치판 drizzle-orm 의 RLS 는 `pgTable(...).enableRLS()`. 온라인 문서는 1.0 베타 이름 `pgTable.withRLS` | `node_modules/drizzle-orm/pg-core/table.d.ts` · https://orm.drizzle.team/docs/rls |
| `drizzle-kit generate --custom --name=` · 실행기는 journal 순서로 `--> statement-breakpoint` 로 나눠 한 트랜잭션에서 마지막 적용 뒤 것만 돌림 · 기록 표 `drizzle.__drizzle_migrations` | https://orm.drizzle.team/docs/kit-custom-migrations · `node_modules/drizzle-orm/migrator.js` · `pg-core/dialect.js` · `drizzle-kit/bin.cjs` |
| drizzle-orm 0.45.4 는 NULLS NOT DISTINCT · 부분 색인 · check · numeric number 꼴 · date 문자열 꼴을 지원. drizzle-kit 설정은 `dbCredentials` 가 형상 필수 | 설치판 `pg-core/*.d.ts` · `drizzle-kit/index.d.ts` |
| Supabase 트랜잭션 모드 6543 은 prepared statement 미지원(postgres-js `prepare: false`), 세션 모드 5432, 공유 풀러 IPv4 전용 · 직접 연결 IPv6, 사용자 이름 `postgres.[PROJECT-REF]` | https://supabase.com/docs/guides/database/connecting-to-postgres · https://orm.drizzle.team/docs/connect-supabase |
| Data API 끄기 위치(Integrations → Data API → Enable Data API)와 효과, public 새 표의 기본 권한, 회수 SQL 예. 끄면 노출 스키마가 `pg_pgrst_no_exposed_schemas` 로 바뀌고 PostgREST 는 계속 돈다 | https://supabase.com/docs/guides/database/hardening-data-api · https://supabase.com/docs/guides/troubleshooting/schema-pg_pgrst_no_exposed_schemas-does-not-exist |
| publishable 키 `sb_publishable_…` 는 `apikey` 머리글, 로그인 없으면 anon 역할. 레거시 키는 끄기 전까지 유효, 2026년 말 폐지 예정 | https://supabase.com/docs/guides/api/api-keys |
| embedded-postgres 의 옵션 · 메서드, root 금지, pnpm 설치 스크립트 승인 필요, 플랫폼 꾸러미 postinstall(심볼릭 링크) | https://github.com/leinelissen/embedded-postgres · `npm view @embedded-postgres/darwin-arm64@17.10.0-beta.17 scripts` |
| `server-only` 기본 내보내기는 Node 에서 오류(Vitest 별칭 필요). Next webpack 은 middleware(proxy) 층에서 빈 모듈로 바꿈 | `node_modules/server-only/package.json` · `next/dist/build/create-compiler-aliases.js` · `next/dist/lib/constants.js` |
| proxy: `src` 안 위치, Node 런타임 기본, 서버 함수는 쓰인 경로의 POST 이므로 함수 안에서도 확인하라, 직접 401 응답 가능 | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`(16.4.2) |
| 설치판 proxy 시험 도구 이름은 `unstable_doesMiddlewareMatch`(문서의 `unstable_doesProxyMatch` 는 없음) · `isRewrite` · `getRewrittenUrl` | `node_modules/next/dist/experimental/testing/server/*.d.ts` |
| `unauthorized()` 는 실험 기능(`experimental.authInterrupts`), 스트리밍 전이면 401, 서버 액션 · Route Handler 에서도 401(처리기 원본 확인), 16.4.2 설정 규격이 캐너리 제한 없이 받음 | `04-functions/unauthorized.md` · `next/dist/client/components/unauthorized.js` · `server/app-render/action-handler.js` · `server/route-modules/app-route/module.js` · `server/config-schema.js` |
| `NextResponse.rewrite(url, init)` 은 상태를 담지만, 렌더 · 캐시가 상태를 다시 정한다(남는지는 확정 못 함) | `next/dist/server/web/spec-extension/response.js` · `server/lib/router-utils/resolve-routes.js` · `build/templates/app-page-runtime.js` |
| `after()` 는 서버 컴포넌트 · 서버 함수 · Route Handler · proxy 에서 쓴다(P3 은 쓰지 않음) | `04-functions/after.md` |
| Next 는 `.env*` 의 `$` 를 펼침(`\$`). 도구는 `@next/env` 를 권하지만 이 저장소 뿌리에 없음(pnpm 엄격 배치) | `01-app/02-guides/environment-variables.md` · `ls node_modules/@next` |
| `@node-rs/argon2` 2.2.2 기본값 = Argon2id · 19456 KiB · 2회 · 병렬 1, `Algorithm` 은 const enum, Next 서버 외부 패키지 목록에 있음, 잠금 파일에 linux-x64-gnu 바이너리 | `node_modules/@node-rs/argon2/index.d.ts` · `next/dist/lib/server-external-packages.jsonc` · `pnpm-lock.yaml` |
| OWASP: Argon2id(19 MiB · 2 · 1) 먼저, 없으면 scrypt(N=2^17 · r=8 · p=1) | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html |
| Vercel 은 X-Forwarded-For 를 덮어써 위조를 막음, x-real-ip 같은 값 | https://vercel.com/docs/headers/request-headers (2025-12-13) |
| Vercel Cron 은 `Authorization: Bearer <CRON_SECRET>`, 16자 이상 권고, 리다이렉트를 따르지 않음 | https://vercel.com/docs/cron-jobs/manage-cron-jobs (2026-08-11) |
| VERCEL_ENV 는 빌드 · 실행 모두에 있고 production · preview · development, 시스템 변수 노출 설정이 켜져야 함 | https://vercel.com/docs/environment-variables/system-environment-variables (2026-07-15) |
| Vitest 5 globalSetup 의 `provide` · 시험의 `inject` · `ProvidedContext` | `node_modules/vitest/dist/chunks/*.d.ts` |
| 로컬에 docker · podman · colima · orbstack · psql · postgres 없음 | `which` |
| spec-trace 기준: AC 116 · 증명 표 67 · AC 이름 시험 8 · missing-test 66. 시험 이름 앞 AC 토큰과 '·' 등으로 이어진 토큰을 셈 | `pnpm spec:trace` · `scripts/spec-trace.ts` |

## (추측)으로 둔 것

1. rewrite 에 준 401 이 다시 쓴 페이지 응답에 남는지(`next start` · Vercel 모두). 그래서 401 을 `/access` 의 `unauthorized()` 로 냈다(P3b 위험 1).
2. Turbopack 도 proxy 층에서 `server-only` 를 빈 모듈로 바꾸는지. P3b 작업 4 의 빌드가 증명한다(P3a 위험 8).
3. drizzle-kit generate 가 빈 `dbCredentials.url` 로 도는지. 안 되면 옵션 명령으로 바꾼다.
4. drizzle-kit migrate 가 쓰는 연결의 prepared 설정. 그래서 migrate 는 세션 풀러 주소를 쓴다.
5. drizzle-kit 의 `drizzle/meta/*.json` 이 Biome 꼴과 다른지(그래서 `!drizzle` 요청).
6. 한 마이그레이션 덩이에 여러 문장을 넣으면 드라이버가 받지 못하는지(그래서 문장마다 breakpoint).
7. Vitest 작업자 하나에서 시험 파일이 이어 돌 때 `globalThis` 의 연결이 남는지(그래서 `getDb()` 가 주소 바뀜을 알아챈다).
8. 로컬 http 의 WebKit 이 Secure 쿠키를 버리는지(그래서 https 일 때만 Secure).
9. Chrome 쿠키 수명 상한 400일 · Safari 가 서버 응답 쿠키를 줄이지 않음.
10. argon2 확인이 트랜잭션 안에서 수십 ms.
11. GitHub Actions 러너에 IPv6 가 없음(풀러를 쓰는 까닭의 하나).
12. Supabase 새 프로젝트의 기본 Postgres 가 17(검색 요약만 봄).
13. Data API 를 끈 뒤 REST 응답의 상태 코드(그래서 2xx 가 아니면 모두 '닫힘').
14. Playwright `webServer.env` 를 주면 `process.env` 를 대신하는지(그래서 펼쳐 넣는다).
15. embedded-postgres 가 GitHub 러너(ubuntu, root 아님)에서 그대로 뜨는지.

## 묶음 plan 과 다르게 한 것

1. P3 를 둘로 나눴지만 둘 다 파일 열 개를 넘는다(16 · 17). 각 plan 안에 PR 을 둘로 끊는 지점을 적었다.
2. 배정표 P3 파일 묶음(`src/db/schema/` · `drizzle/` · `src/server/{clock,settings,access}` · `src/proxy.ts` · `src/app/(setup)/access/`) 밖의 파일을 더했다. `src/core/learning-day.ts`(core 판정 함수가 server 를 못 가져옴) · `src/core/access-token.ts`(Playwright 가 `server-only` 없는 모듈을 가져와야 함) · `src/server/db/index.ts`(DB 연결 자리) · `drizzle.config.ts` · `scripts/{check-data-api,access-code-hash}.ts` · 시험 도우미(`tests/integration/{global-setup,test-db}.ts` · `tests/fixtures/settings.ts` · `tests/e2e/access-cookie.ts`).
3. 증명 칸의 시험 파일 넷은 그대로 쓰고 더했다: `tests/integration/settings.test.ts` · `tests/unit/{access-token,access-gate,check-data-api}.test.ts` · `tests/e2e/smoke.spec.ts`(수정). 더하기만 정적 검사 · 스키마 제약 · DB 연결 시험은 `rls-grants.test.ts` 에 함께 둔다.
4. 시험용 Postgres 는 브리프의 'CI services 와 로컬 같은 방법' 대신 컨테이너 없는 embedded-postgres(로컬 · CI 같음)를 권했다.
5. `check:data-api` 는 P3b 에 두었다(AC-N5 를 P3b 가 마저 증명).
6. 접근 코드 해시는 브리프 예시 scrypt 대신 argon2id 를 권했다(OWASP 첫 권고 · PIN 과 한 방식 · 이미 설치).
7. 401 은 `experimental.authInterrupts` 의 `unauthorized()` 로 낸다(묶음 plan 에 없던 기술 선택). proxy 는 쿠키 없는 페이지를 다시 쓰기만 한다.
8. 접근 코드 제출은 서버 액션이 아니라 Route Handler 다.
9. 해석으로 정한 것: sessions.learning_day = 끝낸 학습일, ai_calls 에 learning_day · price_missing 열, 시각 당기기 조건(preview 또는 test), parent_auth 안의 IP 행 꼴(묶음 위험 18 의 추측을 그대로 확정).
10. P4 초안과 값을 맞췄다: 열거형 · 시드 판 열은 같고, 배치 벌 · 주제 변형을 정수(int2)로 바꿨다. vocab 은 `id` · `word` 둘을 두되 P4 규격대로 같은 값을 넣는다.

## 컨트롤러가 정할 것

P3a(파일 머리 '정할 것' 가~자)

| 항목 | 권함 | 13절 한 줄 |
|---|---|---|
| 가. PR 나눔(16 파일) | 작업 4 뒤에서 둘 | — |
| 나. 시험용 Postgres | embedded-postgres(로컬 · CI 같음). 다른 길은 컨테이너 런타임 [사람] 설치 + CI services | 기술 선택(아래 묶음 한 줄) |
| 다. sessions 의 '학습일' | 끝낸 학습일(진행 중 비움) | 권함(해석) |
| 라. ai_calls 의 learning_day · price_missing | 넣기 | — |
| 마. 시각 당기기 조건 | VERCEL_ENV=preview 또는 NODE_ENV=test | — |
| 바. 열린 값 셋(부모 확인 · 알림 종류 · 설정 출처)은 text | 그대로 | — |
| 사. 시험 설정값 자리와 개발용 DB 설정 행 | fixture 는 P6 settings.json 이 생기면 바꿈. 프리뷰 실사용 확인은 P7 적재 뒤로 | — |
| 아. 한 시계 정적 검사 범위 | `src/{core,server,db}` · `src/proxy.ts` | — |
| 자. P4 와 값 맞추기 | P3a 를 P4 초안에 맞춘 지금 꼴 | — |

P3b(파일 머리 '정할 것' 가~하)

| 항목 | 권함 | 13절 한 줄 |
|---|---|---|
| 가. PR 나눔(17 파일) | 작업 3 뒤에서 둘 | — |
| 나. 401 내는 법 | authInterrupts + `unauthorized()` | 기술 선택(아래 묶음 한 줄) |
| 다. 접근 코드 해시 | argon2id(라이브러리 기본값) | 기술 선택 |
| 라. 접근 코드 화면의 정본 밖 문구 | 이름표 '가족 접근 코드' · 버튼 '들어가기' · 틀림 '코드가 맞지 않아요. 다시 넣어 주세요' · 잠김 '잠시 뒤에 다시 넣어 주세요' · 그 밖 '지금은 들어갈 수 없어요. 잠시 뒤에 다시 해 주세요' · 끊김은 8절 문구 | 권함(아이 화면 문구) |
| 마. 정본 숫자 둘(12자 · 하루)의 자리 | 이름 붙인 상수 + 보안 · 개인정보 고정 규칙이라는 한 줄 | 권함 |
| 바. parent_auth 안 IP 행 꼴 | P3a 스키마 꼴 | 권함(해석) |
| 사. `/dev/*` 도 쿠키 요구 | 요구(NFR-5 그대로). e2e 도우미 · 공용 변경 4 · 5, H4 를 H2 앞에 | — |
| 아. check:data-api 실행 때 | H3 뒤 요청자 한 번 + P7 dev-load 끝 | — |
| 자. 쿠키 꼴 | `momo_access` · `v1.<만료>.<난수>.<서명>` · HttpOnly · Lax · https 일 때 Secure · 연장 없음 | 기술 선택 |
| 차. 쿠키 서명 열쇠 | `ACCESS_CODE_HASH` 에서 파생(해시를 비밀값으로) | 기술 선택 |
| 카. Cron 경로 `/api/cron/` · `requireCron` | 확인 | — |
| 타. 제출은 Route Handler | 확인 | 기술 선택 |
| 하. 화면 검토 | design-reviewer 한 번(4절 기준, 목업 없음) | — |

기술 선택(P3a 나 · P3b 나 · 다 · 자 · 차 · 타)은 C51 처럼 한 줄로 묶어 13절에 남기기를 권한다.

## 요청하는 공용 변경(컨트롤러가 합친다)

| # | 파일 | 바꿀 것 | 낸 plan | 다른 P 와 겹침 |
|---|---|---|---|---|
| 1 | `package.json` · `pnpm-lock.yaml` | dev `embedded-postgres@17.10.0-beta.17`(-E) · `pnpm.onlyBuiltDependencies` 에 `@embedded-postgres/darwin-arm64` · `@embedded-postgres/linux-x64` | P3a | P4 도 scripts 를 더한다(잠금 파일은 P3 만 바꾼다) |
| 2 | `package.json` scripts | `test:int`(--passWithNoTests 뺌) · `db:generate` · `db:migrate` · `access:hash` · `check:data-api` | P3a · P3b | P4c 의 `seed:validate` 와 같은 자리 |
| 3 | `vitest.config.mts` | `server-only` 별칭(두 프로젝트) · integration 의 `globalSetup` · `testTimeout` | P3a | — |
| 4 | `.github/workflows/ci.yml` | `integration` 작업 채우기(`pnpm test:int`, 서비스 없음) | P3a | P4c 의 `seed-validate` 작업 |
| 5 | `.env.example` | `MIGRATION_DATABASE_URL` · `SUPABASE_URL` · `SUPABASE_PUBLISHABLE_KEY` · `SUPABASE_LEGACY_ANON_KEY`(이름만), `ACCESS_CODE_HASH` 주석 고침 | P3a · P3b | — |
| 6 | `biome.json` | `files.includes` 에 `!drizzle` | P3a | P4a 가 `!seed/**/*.json` 을 권함(같은 줄 목록) |
| 7 | `next.config.ts` | `experimental: { authInterrupts: true }` | P3b | P2 가 `pageExtensions`(VERCEL_ENV)로 같은 파일을 고친다. 내용은 부딪히지 않는다. P2 는 기본 확장자를 함께 적어 `proxy.ts` · `unauthorized.tsx` 가 그대로 잡힌다 |
| 8 | `playwright.config.ts` | 시험용 접근 코드 · 해시를 실행 때 만들어 `webServer.env` 에 `ACCESS_CODE_HASH` | P3b | P2 는 고치지 않는다고 적었다 |
| 9 | `tests/e2e/fixtures.ts`(P2 파일) | `addAccessCookie(context, baseURL)` 한 줄 | P3b | P2 다-4 와 같은 합의(나중에 병합하는 쪽에서 더함) |
| 10 | `.dependency-cruiser.cjs` · `tests/unit/dependency-rules.test.ts`(권함) | `db-only-from-server` · `proxy-stays-light` | P3a · P3b | — |

## 다른 하위 plan 과 맞춘 것

- P2(`plan-p02-음성-접점.md`): 관찰 페이지를 proxy 에서 빼지 않는다는 판단이 같다(P2 위험 16). e2e 준비 파일에 P3b 가 쿠키 준비를 더하는 것도 P2 다-4 와 같다. P2 는 시험 설정을 `tests/fixtures/speech/settings.json` 에 두고, P3 는 `tests/fixtures/settings.ts` 에 둔다. P6 의 `seed/settings.json` 이 생기면 한곳으로 모으기를 권한다. P2 는 브라우저 쪽에서 `performance.now()` 를 쓰므로 한 시계 정적 검사 범위(`src/{core,server,db}`)와 부딪히지 않는다.
- P4(`plan-p04a-규격.md` 등): 열거형 값 · 시드 판 열이 같다. 배치 벌 · 주제 변형은 P3a 를 P4 의 정수 꼴로 바꿨다. P4 의 '정할 것 ㅁ' 셋 가운데 vocab 하나만 남는다(P3a 는 id · word 둘에 같은 값).
- 구간(1-3 등)을 붙인 설정 키는 P3 의 설정 읽기가 키 이름 그대로 받는다. 단계 → 구간 바꾸기는 부르는 쪽 몫이다(P2 다-6 과 같은 자리).

## 남은 우려

1. 두 plan 다 PR 하나 기준을 넘는다. 나눔 지점을 따르지 않으면 검토 한 번의 분량이 크다.
2. 401 의 길을 안정 API 만으로 정하면 AC-N5 '홈 401' 이 확인하지 못한 동작(추측 1)에 기댄다.
3. embedded-postgres 의 CI 첫 실행은 원격이 생긴 뒤(H15)에야 본다. 로컬에서는 구현자가 바로 확인한다.
4. 개발용 DB 에는 P7 적재 전까지 설정 행이 없어 프리뷰의 접근 코드 제출이 503 이다(401 과 화면 확인은 된다).
5. `ACCESS_CODE_HASH` 가 쿠키 서명 열쇠의 바탕이라 그 값 자체가 비밀값이다. H4 에서 요청자 터미널로만 다뤄야 한다.
6. P3b 가 H2(iPad 실기)보다 먼저 프리뷰에 들어가면 관찰 페이지 앞에서 접근 코드를 넣어야 한다. H4 를 H2 앞에 두거나 병합 순서를 정해야 한다.
7. C52(2)의 훅 실기 확인은 P3a 첫 구현자 실행 로그로 하고, '막음' 줄이 없으면 짧은 원래 절차를 한 번 더 돈다(P3a 작업 순서 머리).
