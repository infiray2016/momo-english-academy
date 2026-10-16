# 구현 보고: P3b 접근 제어(implementer · Opus · high, P3a 워크트리 이어 하기)

브리프는 `task-p03b.md`, plan 은 메인 저장소의 `plan-p03b-접근-제어.md`(approved 18:2x, 21:0x 구현 시작 문단 포함)다. 작업 1~7 과 8 (가)를 했다. P3a 파일은 고치지 않았다. git 쓰기 명령은 쓰지 않았다.

## 바뀐 파일

### 새 파일(plan 표 열여섯)
| 파일 | 줄 | 내용 |
|---|---|---|
| `src/core/access-token.ts` | 182 | 상수(`ACCESS_COOKIE_NAME` · `ACCESS_TOKEN_VERSION` · `COOKIE_KEY_INFO` · `IP_KEY_INFO` · `ACCESS_CODE_MAX_LENGTH`)와 `ACCESS_CODE_MIN_LENGTH`(:16) · `ACCESS_CODE_PATTERN` · `isValidAccessCode`. `accessKeyMaterial`, HKDF-SHA256 열쇠 파생(Map 캐시), `issueAccessToken` · `verifyAccessToken`(`crypto.subtle.verify`), `hashIp`, `encodeAccessCodeHash` · `decodeAccessCodeHash`, base64url 도우미 |
| `src/server/access/code.ts` | 51 | `server-only`. 규칙 상수를 다시 내보내고 `AccessCodeRuleError` · `AccessNotConfiguredError` · `hashAccessCode`(argon2 기본값) · `verifyAccessCode` |
| `src/server/access/attempts.ts` | 138 | `server-only`. `ACCESS_IP_RETENTION_MS`(:19, 하루) · `submitAccessCode`. 한 트랜잭션 안에서 차례로: 하루 지난 행 지우기 → onConflictDoNothing → FOR UPDATE → 잠금 확인 → 코드 확인 → 성공 때 행 삭제, 실패 때 failed_count · locked_until. 시각은 모두 매개변수로 넘기고 질의 SQL 에 `now()` 가 없다 |
| `src/server/access/guard.ts` | 81 | `server-only`. `hasValidAccess` · `requireAccess` · `requireCron` · `clientIp` · `accessCookieOptions` · `isSameOrigin` |
| `scripts/access-code-hash.ts` | 108 | `pnpm access:hash`. 종료 코드 0 · 1 · 2 |
| `scripts/check-data-api.ts` | 244 | `pnpm check:data-api`. `schemaTableNames` · `classifyResponse` · `summarize` · `exitCode` · `runDataApiCheck`. 직접 실행할 때만 본문이 돈다 |
| `src/proxy.ts` | 61 | 요청 거르기(값 5 그대로). 가져오는 것은 `@/core/access-token` 과 `@/server/clock` 둘뿐이다 |
| `src/app/(setup)/access/page.tsx` | 10 | `hasValidAccess` 면 `redirect("/")`, 아니면 `unauthorized()` |
| `src/app/(setup)/access/unauthorized.tsx` | 15 | `<main>` + 제목 '부모님이 코드를 넣어 주세요' + 입력 폼 |
| `src/app/(setup)/access/access-code-form.tsx` | 86 | `'use client'`. 입력칸 속성은 값 8 그대로이고 `required` 를 더했다. 버튼 '들어가기', `role="status"` 한 줄, 문구 넷 |
| `src/app/(setup)/access/submit/route.ts` | 85 | 응답: 같은 출처가 아니면 403, 꼴이 어긋나면 400, 맞으면 204 + Set-Cookie, 틀리면 401, 잠기면 429 + Retry-After, 설정이 없으면 503 |
| `tests/unit/access-token.test.ts` | 211 | AC-1a 넷 + 토큰 · 해시 값 꼴 · IP 해시 |
| `tests/unit/access-gate.test.ts` | 487 | 함수 안 확인 훑기(TypeScript 구문 트리) · requireAccess · requireCron · proxy 여섯 |
| `tests/integration/access.test.ts` | 414 | AC-1a 일곱 + 제출 함수 셋 |
| `tests/unit/check-data-api.test.ts` | 184 | AC-N5 Data API 다섯 + 테이블 목록 |
| `tests/e2e/access-cookie.ts` | 40 | `addAccessCookie(context, baseURL)`, 쿠키 유효 시간은 이름 붙인 상수 `E2E_COOKIE_TTL_SECONDS` |

### 고친 파일(plan 표)
- `tests/e2e/smoke.spec.ts`(72줄): P1a 의 뷰포트 · 창 크기 · `lang` · `main` 하나 확인은 그대로 두고, 증명 표의 시험 셋으로 바꿨다. 화면 사진은 환경 변수 `E2E_ACCESS_SCREENSHOT` 이 있을 때만 그 경로에 남긴다.

### 공용 변경(1~4 · 6, 이 워크트리에서 옮김)
| # | 파일:줄 | 바꾼 것 |
|---|---|---|
| 1 | `next.config.ts:6-7` | `experimental: { authInterrupts: true }` |
| 2 | `package.json:21-23` | `access:hash` · `check:data-api` |
| 3 | `.env.example:6` · `:14-18` | ACCESS_CODE_HASH 주석은 plan 글자 그대로. Data API 머리 주석 아래 `SUPABASE_URL=` · `SUPABASE_PUBLISHABLE_KEY=`, 그리고 주석 '# 레거시 anon 키(프로젝트에서 켜져 있을 때만)' 아래 `SUPABASE_LEGACY_ANON_KEY=` |
| 4 | `playwright.config.ts:1-2` · `:4-7` · `:14-32` · `:50` | 실행 때 시험용 코드(24자)를 만들고 `hashSync` + `encodeAccessCodeHash` 로 해시한다. 값은 `process.env.E2E_ACCESS_CODE` · `E2E_ACCESS_CODE_HASH` 에 둔다(이미 있으면 그대로). `webServer.env` = process.env 의 값 있는 항목 + `ACCESS_CODE_HASH` |
| 6 | `.dependency-cruiser.cjs:42-51` · `tests/unit/dependency-rules.test.ts:45-47` · `:193-196` | 규칙 `proxy-stays-light`. 막는 예 하나(src/proxy.ts → @/server/settings) |
| 5 | — | `tests/e2e/fixtures.ts` 는 손대지 않았다(병합 때 컨트롤러) |

### P3a 파일 변경 절
없음. `server-only` 를 가진 시계 모듈을 proxy 가 가져와도 `pnpm build`(Turbopack)가 성공했다. 빌드 출력에 `ƒ Proxy (Middleware)` 가 있다. P3a 위험 8 은 닫힌다.

## 설계와 다르게 한 것과 이유
1. **`ACCESS_CODE_MIN_LENGTH` · 글자 규칙 · `isValidAccessCode` 의 자리.** plan 값 2 는 `src/server/access/code.ts` 에 두라고 한다. 그런데 이 파일은 `server-only` 라서 `pnpm access:hash`(tsx, Node, react-server 조건 없음)가 가져오면 오류가 난다. 그래서 정의는 `src/core/access-token.ts:10-27` 로 옮겼고, `code.ts` 가 같은 이름으로 다시 내보낸다. 해시 스크립트는 core 규칙에 `@node-rs/argon2` 의 `hash` 와 `encodeAccessCodeHash` 를 붙여 쓴다. 그래서 `hashAccessCode` 의 두 줄이 스크립트에 한 번 더 있다. 규칙 상수는 한 곳뿐이다.
2. `isValidAccessCode` 는 길이 상한 `ACCESS_CODE_MAX_LENGTH`(128, 기술 값)도 본다. 끝점의 Zod 상한과 같은 값이다. 128자를 넘는 코드는 해시를 만들지 않는다.
3. 입력칸에 `required` 를 더했다. 빈 값을 보내면 실패 한 번으로 세어지는 것을 브라우저에서 먼저 막는다.
4. proxy 는 ACCESS_CODE_HASH 가 없을 때 `console.error` 를 프로세스마다 한 번 남긴다. 단위 시험에서는 이 기록을 `vi.spyOn` 으로 받는다. Vitest 에서는 Next 가 바꿔 둔 console 이 AsyncLocalStorage 를 찾다가 오류를 내기 때문이다(실제 서버와는 상관없다).
5. 증명 표 밖에 더한 시험(접두 없음): 해시 값 꼴, 토큰 꼴 · 만료, 고친 토큰, 열쇠 재료, IP 해시, 하루 지난 IP 행 지우기, not_configured, 설정 행 없음 → SettingMissingError, 테이블 목록 29.
6. 화면 사진을 남기는 일은 환경 변수가 있을 때만 한다. 매 e2e 실행이 장부 파일을 덮어쓰지 않게 하려는 것이다.

## 요청하는 변경
- plan 값 2 의 '상수의 자리'를 위 1 처럼 core 로 고치기(또는 13절 C57 문장의 자리를 'src/core/access-token.ts, code.ts 가 다시 내보냄'으로 적기)를 권한다.
- 그 밖은 없다. 정본과 다르게 한 것은 없다.

## 시험 이름

단위 `tests/unit/access-token.test.ts`
- AC-1a 12자보다 짧거나 영문 · 숫자 밖 글자가 든 접근 코드는 해시를 만들지 않는다
- AC-1a 접근 코드 해시는 argon2id 이고 같은 코드도 매번 다른 값이며 $ 가 없다
- AC-1a 맞는 코드만 확인을 통과한다
- AC-1a 접근 코드(ACCESS_CODE_HASH)를 바꾸면 전에 받은 쿠키가 모두 무효다
- 접근 코드 해시 값 꼴: 감싼 값을 풀면 PHC 이고 argon2id 가 아니면 null
- 접근 쿠키 토큰: v1.<만료 초>.<난수>.<서명> 꼴이고 만료 초가 지나면 무효다
- 접근 쿠키 토큰: 고친 토큰 · 다른 판 · 칸 수가 다른 값 · 빈 값 · 열쇠 없음은 무효다
- 접근 쿠키 토큰: 열쇠 재료는 ACCESS_CODE_HASH 를 다듬은 값이고 없거나 비면 null
- IP 해시: 같은 열쇠 · 같은 IP 는 같은 값, 열쇠나 IP 가 다르면 다른 값이고 IP 가 드러나지 않는다

단위 `tests/unit/access-gate.test.ts`
- AC-N5 함수 안 확인: 모든 'use server' 함수와 route.ts 처리기의 첫 문장이 requireAccess() 다(Cron 은 requireCron, 허용 목록 밖)
- AC-N5 함수 안 확인: 첫 문장을 빠뜨린 견본(파일 지시 · 함수 안 지시 · route.ts)을 잡는다
- AC-N5 requireAccess: 쿠키가 없거나 무효면 unauthorized() 를 부르고 유효하면 부르지 않는다
- AC-N5 requireCron: Authorization 이 'Bearer CRON_SECRET' 과 다르거나 CRON_SECRET 이 비면 unauthorized()
- AC-N5 proxy: 쿠키 없는 페이지 요청(GET · HEAD)은 /access 로 다시 쓴다
- AC-N5 proxy: 쿠키 없는 서버 액션 POST(next-action) · /api · 그 밖 메서드는 401 이고 WWW-Authenticate 가 없다
- AC-N5 proxy: /access · /access/submit · /api/cron/ 은 쿠키 없이 넘긴다
- AC-1a proxy: 유효한 쿠키가 있으면 잠금 상태와 관계없이 넘긴다(DB 를 보지 않는다)
- AC-N5 proxy: ACCESS_CODE_HASH 가 없으면 모든 쿠키를 거부한다
- proxy matcher: 정적 파일 · 그림 · favicon 은 proxy 를 타지 않고 페이지 · /api 는 탄다

단위 `tests/unit/dependency-rules.test.ts`(더한 것)
- 의존 규칙: src/proxy.ts 가 src/server/settings 를 가져오면 proxy-stays-light 위반

단위 `tests/unit/check-data-api.test.ts`
- AC-N5 Data API 확인: 모든 테이블이 닫힘 · 권한 오류 · 0행이면 0
- AC-N5 Data API 확인: 행이 돌아온 테이블이 있으면 1 과 그 테이블 이름
- AC-N5 Data API 확인: 레거시 anon 키가 있으면 그 키로도 모든 테이블을 본다
- AC-N5 Data API 확인: 주소 · 키가 없거나 닿지 않으면 2
- AC-N5 Data API 확인: 출력에 키 값 · 응답 본문이 없다
- Data API 확인: 테이블 목록은 스키마의 테이블 29개다

통합 `tests/integration/access.test.ts`
- AC-1a 맞는 코드를 넣으면 access.cookie_days 일짜리 쿠키 토큰을 받는다
- AC-1a 한 IP 에서 틀린 코드를 parent.pin_max_attempts 회 넣으면 그 IP 만 parent.lock_minutes 분 잠긴다(다른 IP 는 그대로)
- AC-1a 잠긴 동안에는 맞는 코드도 받지 않고 잠금이 지나면 다시 받는다
- AC-1a 맞는 코드를 넣으면 그 IP 의 실패 수가 지워진다
- AC-1a 이미 쿠키가 있는 기기는 그 IP 가 잠겨도 requireAccess 를 통과한다
- 접근 코드 제출: 하루 지난 IP 행은 제출 때 지운다
- 접근 코드 제출: ACCESS_CODE_HASH 가 없거나 풀리지 않으면 DB 를 건드리지 않고 not_configured 다
- 접근 코드 제출: 설정 행이 없으면 SettingMissingError 가 그대로 나간다(제출 끝점이 503 으로 바꾼다)
- AC-1a 제출 끝점: 맞으면 204 와 HttpOnly · SameSite=Lax · Path=/ · Max-Age 쿠키, https 일 때만 Secure
- AC-1a 제출 끝점: 틀림 401 · 잠김 429(Retry-After) · 다른 출처 403 · 꼴 깨짐 400 · 설정 안 됨 503

e2e `tests/e2e/smoke.spec.ts`(WebKit 10.9형)
- AC-1a · AC-N5 쿠키 없이 홈을 열면 401 과 접근 코드 화면('부모님이 코드를 넣어 주세요')이 10.9형 화면에 ko 로 열린다
- AC-1a 유효한 접근 쿠키가 있는 기기는 접근 코드 화면 없이 홈이 열린다
- AC-N5 쿠키 없이 /api 요청과 서버 액션 꼴 POST 는 401 이다

## 명령과 출력(PATH 에 v24.22.0 bin)
| 명령 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | Done |
| `pnpm exec biome ci --colors=off .` | Checked 55 files. No fixes applied |
| `pnpm build` | Compiled successfully · TypeScript 끝. 경로 `/` ○ · `/access` ƒ · `/access/submit` ƒ · `ƒ Proxy (Middleware)`. 덧붙여 `tsc --noEmit` 오류 0 |
| `pnpm test` | Test Files 9 passed · Tests 83 passed |
| `pnpm test:int` | Test Files 4 passed · Tests 33 passed(Postgres 시작 503ms) |
| `pnpm e2e` | 3 passed(WebKit, tablet-10-9-webkit) |
| `pnpm check:deps` | no dependency violations found (35 modules, 59 dependencies cruised) |
| `pnpm spec:trace` | `15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 53 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 62`(63 → 62) |
| `pnpm check:bundle` | 파일 26 · static 11 · 화면 파일 15 · 서버 변수 이름 9 · 대조한 값 0 · 위반 0 |
| 비밀값 grep | `git grep`(추적 파일) 0건. 새 파일은 `grep -rnE` 로 접속 문자열 · publishable 키 꼴 · 실제 argon2 PHC 꼴을 찾아 0건(시험의 PHC 는 'salt' · 'hash' 를 base64 한 가짜다) |
| `pnpm check:data-api`(환경 변수 없음) | `check-data-api: SUPABASE_URL · SUPABASE_PUBLISHABLE_KEY 가 없습니다`, 종료 2 |
| `pnpm access:hash` | 실행 때 만든 16자 견본을 파이프로 넣으면 종료 0, 출력 한 줄(130자, `$` 없음, 코드가 들어 있지 않음). 11자 견본은 종료 1, 빈 입력은 종료 2. 출력값은 적지 않는다. 확인 스크립트는 스크래치 폴더에 두었다 |

작업 순서의 시험 먼저: 작업 1 · 2 의 시험은 구현 전에 모듈이 없어 실패하는 것을 보았다. 훑기 시험의 '허용 목록 파일이 있다' 단언은 작업 5 의 route.ts 가 생기기 전까지 실패했다.

## 화면 사진
`.superpowers/sdd/2026-10-16-1-가-구현/p03b-access.png`(e2e 첫 시험, WebKit 820 × 1180 2배율). 흰 바탕에 제목 · 이름표 · 입력칸 · 버튼 하나가 있다. 안내 줄은 비어 있다. 보드 꾸밈 · 글꼴은 P5 · P10 몫이다.

## P10 · 1-나가 쓸 이름
- `requireAccess()`(`@/server/access/guard`): 모든 서버 액션 · Route Handler 의 첫 문장 `await requireAccess();`. 훑기 시험이 TypeScript 구문 트리로 본다.
- `requireCron(request)`(같은 곳, 동기): `/api/cron/` 아래 route.ts 처리기의 첫 문장.
- `hasValidAccess()`(같은 곳): 화면에서 분기가 필요할 때 쓴다.
- `addAccessCookie(context, baseURL)`(`tests/e2e/access-cookie.ts`): e2e 문맥에 유효한 쿠키를 넣는다. P2 의 `tests/e2e/fixtures.ts` 한 줄(공용 변경 5)은 병합 때.
- 그 밖: `submitAccessCode`, `ACCESS_COOKIE_NAME`, `issueAccessToken` · `verifyAccessToken`.

## 남은 우려
1. 로컬 e2e 서버(`next start`, http)에서 401 · 다시 쓰기 · 쿠키를 보았다. Vercel 프리뷰에서 다시 쓰기 + `unauthorized()` 가 같은 401 을 내는지는 H4 뒤 브라우저 확인이 본다(위험 1 · 17).
2. e2e 는 접근 코드 제출(브라우저에서 입력 → 204 → 홈)을 지나지 않는다. e2e 서버에 DB 가 없어서다. 제출 경로는 통합 시험이 Route Handler 를 직접 불러 증명한다. 브라우저에서의 끝까지 확인은 P7 적재 뒤 프리뷰에서 한다(plan H4 6).
3. `fromBase64Url` 은 끝 글자의 채움 비트가 다른 비정규 꼴도 같은 바이트로 받는다. 이미 유효한 토큰의 다른 철자를 만들 수 있다는 뜻이지만 새 토큰을 위조할 수는 없다.
4. `reuseExistingServer` 가 로컬에서 켜져 있다. 3100 포트에 다른 해시로 뜬 서버가 남아 있으면 쿠키 시험이 실패할 수 있다(P1a 설정 그대로).
5. Next 의 `unauthorized()` · `authInterrupts` 는 실험 기능이다(위험 2, Next 17 이행 때 다시 본다).
