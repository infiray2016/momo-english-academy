# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P3b 접근 제어

spec: `specs/` 정본(10절 기술 구성의 접근 제어 행 · 4절 접근 코드 화면 · 5절 parent_auth · 5.1 접근 쿠키 · 9절 통합(접근 제어 401) · CI 검사 · 11절 1-가 (1) · 12절 access.cookie_days · parent.pin_max_attempts · parent.lock_minutes · 15절 AC-1a · AC-N5, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P3 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: in-progress(구현 시작 21:0x, 브리프 `task-p03b.md`)
승인: 컨트롤러 2026-10-16 18:2x(결정 C55 · C56 · C57, 요청자는 PR 병합 때 본다 — H14) · 브랜치 · 워크트리: `feature/1a-p03b-access`(P3a 가 끝난 같은 워크트리에서 이어 간다. 구현 브리프는 P3a 검토 뒤 컨트롤러가 쓴다) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P3 의 뒤 절반이다. 앞 절반(스키마 · 마이그레이션 · RLS · 권한 회수 · 트랜잭션 풀러 · 한 시계 · 학습일 · 설정 읽기 · 시험용 Postgres)은 같은 폴더의 `plan-p03a-DB-시계-설정.md` 이고, 이 plan 은 그것이 끝난 브랜치 끝에서 시작한다. parent_auth 테이블 · 설정 읽기 · 한 시계 · `tests/integration/test-db.ts` · `tests/fixtures/settings.ts` 를 P3a 에서 가져다 쓴다.
손으로 쓰는 파일이 열일곱이라 PR 하나 기준(열 개)을 넘는다. 작업 3 뒤에서 PR 을 둘(B1 서버 · B2 proxy · 화면 · 확인 도구)로 끊을 수 있게 순서를 짰다(정할 것 가). 정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다. 판과 출처는 2026-10-16 에 확인했다(위험 절 끝 '확인한 사실과 출처').

## 목표 (Goal)

- 기기를 처음 쓸 때 부모가 가족 접근 코드를 넣으면 장기 httpOnly 쿠키(`access.cookie_days`, 365일)를 준다. 코드는 영문 · 숫자 12자 이상이고 서버 환경 변수 `ACCESS_CODE_HASH` 에 해시로 둔다. 코드를 바꾸면 모든 기기의 쿠키가 무효가 된다(10절, 5.1).
- 접근 코드 실패 횟수와 잠금은 요청 IP 마다 센다. 한 IP 에서 `parent.pin_max_attempts`(5)회 연속 틀리면 그 IP 만 `parent.lock_minutes`(15)분 잠근다. IP 는 해시로 parent_auth 에 두고 하루 뒤 지운다(5절). 이미 등록된 기기(유효한 쿠키)는 잠금과 관계없이 쓴다(10절, AC-1a).
- proxy.ts 가 요청을 먼저 거른다. 쿠키 없는 페이지 요청은 401 과 접근 코드 화면('부모님이 코드를 넣어 주세요', 4절)을 받는다. 쿠키 없는 서버 액션 · Route Handler 요청은 401 이다. 모든 서버 액션 · Route Handler 는 첫 줄에서 같은 확인 함수를 다시 부르고, Cron 경로는 CRON_SECRET 으로 확인한다(10절, NFR-5, AC-N5).
- publishable 키(있으면 레거시 anon 키도)로 Data API 를 조회하면 모든 테이블에서 권한 오류이거나 0행인지 `pnpm check:data-api` 로 본다(AC-N5).
- P1a 의 첫 화면 e2e 를 접근 코드 화면 기준으로 고친다. 맞는 코드를 넣은 뒤 가는 곳은 홈(`/`)이다. 홈에서 첫 실행으로 보내는 것은 P10 이다(AC-1a 의 '첫 실행 화면으로 간다'는 P10 이 마저 증명한다).
- 완료 판정: 쿠키 없는 요청이 401 이다(로컬 e2e 와 프리뷰). 개발용 프로젝트에서 `pnpm check:data-api` 가 0 으로 끝난다(H3).

## 바뀌는 파일 (Files that change)

손으로 쓰는 파일은 열일곱이다(새 파일 열여섯 · 고치는 파일 하나). 공용 파일 변경 요청은 따로 적고 세지 않는다.

| 파일 | 신규 / 수정 | 무엇을 | PR |
|---|---|---|---|
| `src/core/access-token.ts` | 신규 | 순수 함수. 접근 쿠키 토큰 만들기 · 확인(Web Crypto HMAC), 열쇠 파생(HKDF), IP 해시, `ACCESS_CODE_HASH` 값 꼴 감싸기 · 풀기, 쿠키 이름 상수(아래 '파일별 값' 1). 묶음 plan 의 P3 파일 묶음 밖이다(위험 6) | B1 |
| `src/server/access/code.ts` | 신규 | `server-only`. argon2id 해시 · 확인, 접근 코드 꼴 규칙(아래 2) | B1 |
| `src/server/access/attempts.ts` | 신규 | `server-only`. 접근 코드 제출: IP 행 잠그기 · 실패 세기 · 잠금 · 하루 지난 행 지우기(아래 3) | B1 |
| `src/server/access/guard.ts` | 신규 | `server-only`. `requireAccess` · `hasValidAccess` · `requireCron` · `clientIp` · 쿠키 속성 · 같은 출처 확인(아래 4) | B1 |
| `scripts/access-code-hash.ts` | 신규 | `pnpm access:hash`. 숨긴 입력으로 코드를 받아 `ACCESS_CODE_HASH` 값을 낸다(H4, 아래 10) | B1 |
| `tests/unit/access-token.test.ts` | 신규 | AC-1a(12자 규칙 · 코드 바꾸면 쿠키 무효) · 토큰 · IP 해시 | B1 |
| `tests/unit/access-gate.test.ts` | 신규 | AC-N5 함수 안 확인 훑기 · `requireAccess` · `requireCron`(B1), proxy 사례(B2 에서 더함) | B1 · B2 |
| `tests/integration/access.test.ts` | 신규 | AC-1a 실패 · 잠금 · IP · 쿠키 있는 기기(B1), 제출 Route Handler 사례(B2 에서 더함) | B1 · B2 |
| `src/proxy.ts` | 신규 | 요청 거르기(아래 5) | B2 |
| `src/app/(setup)/access/page.tsx` | 신규 | 쿠키가 유효하면 홈으로, 아니면 `unauthorized()`(아래 6) | B2 |
| `src/app/(setup)/access/unauthorized.tsx` | 신규 | 401 화면 = 접근 코드 화면(아래 7) | B2 |
| `src/app/(setup)/access/access-code-form.tsx` | 신규 | `'use client'`. 입력 · 제출 · 안내 한 줄(아래 8) | B2 |
| `src/app/(setup)/access/submit/route.ts` | 신규 | POST 접근 코드 제출(아래 9) | B2 |
| `scripts/check-data-api.ts` | 신규 | `pnpm check:data-api`(아래 11) | B2 |
| `tests/unit/check-data-api.test.ts` | 신규 | AC-N5 Data API 확인 | B2 |
| `tests/e2e/smoke.spec.ts` | 수정 | 첫 화면 = 401 과 접근 코드 화면. 쿠키가 있으면 홈(아래 13) | B2 |
| `tests/e2e/access-cookie.ts` | 신규 | e2e 도우미. 유효한 접근 쿠키를 브라우저 문맥에 넣는다(P2 · P10 이 같이 씀, 아래 12) | B2 |

### 요청하는 공용 변경(컨트롤러가 합친다)

| # | 파일 | 바꿀 것 | 까닭 |
|---|---|---|---|
| 1 | `next.config.ts` | `experimental: { authInterrupts: true }` | `unauthorized()` 로 페이지 · 서버 액션 · Route Handler 가 401 을 낸다(정할 것 나). P2 도 개발용 경로 때문에 이 파일을 고칠 수 있어 공용으로 올린다 |
| 2 | `package.json` scripts | `"access:hash": "tsx scripts/access-code-hash.ts"` · `"check:data-api": "tsx scripts/check-data-api.ts"` | 새 스크립트 둘 |
| 3 | `.env.example` | `ACCESS_CODE_HASH` 주석을 '가족 접근 코드의 해시(서버 전용, 쿠키 서명 열쇠의 바탕이라 비밀값으로 다룬다) — P3' 로 고치고, '# Data API 닫힘 확인(pnpm check:data-api) — 개발용 Supabase 프로젝트 주소와 키 — P3' 아래 `SUPABASE_URL=` · `SUPABASE_PUBLISHABLE_KEY=` · `SUPABASE_LEGACY_ANON_KEY=`(있을 때만) | 이름만 둔다. 앱은 이 셋을 쓰지 않는다 |
| 4 | `playwright.config.ts` | 설정을 읽을 때 시험용 접근 코드와 그 해시를 실행 때 만들어 `process.env.E2E_ACCESS_CODE` · `E2E_ACCESS_CODE_HASH` 에 둔다(이미 있으면 그대로). 해시는 `@node-rs/argon2` 의 `hashSync` 와 `src/core/access-token.ts` 의 감싸기로 만든다. `webServer.env` 에 `{ ...process.env, ACCESS_CODE_HASH: process.env.E2E_ACCESS_CODE_HASH }` | e2e 서버와 시험이 같은 열쇠를 쓴다. 값은 저장소에 없다 |
| 5 | `tests/e2e/fixtures.ts`(P2 가 만드는 파일) | P2 의 `test` 가 문맥을 만들 때 `addAccessCookie(context, baseURL)` 를 부르게 한 줄. P2 · P3b 가운데 나중에 병합하는 쪽에서 컨트롤러가 더한다 | P3b 가 들어오면 관찰 페이지 e2e 도 쿠키가 있어야 열린다(정할 것 사) |
| 6 | `.dependency-cruiser.cjs` · `tests/unit/dependency-rules.test.ts`(권함) | 규칙 `proxy-stays-light`: `src/proxy.ts` 는 `src/server/{db,settings}` · `src/server/access/{code,attempts}` · `@node-rs/argon2` · `postgres` · `drizzle-orm` 을 가져오지 않는다. 시험 표에 막는 예 하나 | proxy 는 모든 요청에서 돈다. DB · 네이티브 해시가 끌려 들어오면 느려지고 빌드가 깨질 수 있다(위험 5) |

### 파일별 값(구현자가 옮겨 쓸 것)

1. `src/core/access-token.ts`(순수 함수, Web Crypto 만. 현재 시각 · 난수는 인자로 받는다).
   - 상수: `ACCESS_COOKIE_NAME = "momo_access"` · `ACCESS_TOKEN_VERSION = "v1"` · `COOKIE_KEY_INFO = "momo/access-cookie/v1"` · `IP_KEY_INFO = "momo/access-ip/v1"` · `ACCESS_CODE_MAX_LENGTH = 128`(입력 상한, 기술 값).
   - `accessKeyMaterial(env)`: `env.ACCESS_CODE_HASH` 를 다듬어 돌려주고 없거나 비면 `null`.
   - 열쇠 파생: `crypto.subtle` 의 HKDF-SHA256(입력 = 키 재료의 UTF-8 바이트, salt 빈 값, info = 위 상수)로 HMAC-SHA256 열쇠를 만든다. 쿠키용과 IP 용 info 가 달라 열쇠가 서로 다르다. 같은 키 재료는 Map 에 담아 다시 쓴다.
   - `issueAccessToken({ keyMaterial, now, ttlSeconds, nonce })` → `v1.<만료 초>.<nonce base64url>.<서명 base64url>`. 만료 초는 `floor(now / 1000) + ttlSeconds`, 서명은 앞 세 칸을 점으로 이은 글의 HMAC.
   - `verifyAccessToken(token, { keyMaterial, now })` → boolean. 값이 없거나 · 키 재료가 없거나 · 칸이 넷이 아니거나 · 판이 다르거나 · 만료 초가 지났거나 · 서명이 다르면 false. 서명 비교는 `crypto.subtle.verify`(상수 시간).
   - `hashIp(ip, keyMaterial)` → base64url(HMAC(IP 열쇠, ip)). 원래 IP 를 되돌릴 수 없다.
   - `encodeAccessCodeHash(phc)` = base64url(UTF-8 PHC 문자열). `decodeAccessCodeHash(value)` 는 풀어서 `$argon2id$` 로 시작하면 PHC 를, 아니면 `null` 을 돌려준다. 환경 변수 값에 `$` 가 없게 감싼다(Next 는 `.env*` 의 `$` 를 펼친다, 확인함).
2. `src/server/access/code.ts`.
   - `ACCESS_CODE_MIN_LENGTH = 12` · 글자 규칙 `/^[A-Za-z0-9]+$/`(10절 '영문 · 숫자 12자 이상'. 둘 다 섞여야 한다는 뜻으로 읽지 않는다). 상수의 자리는 정할 것 마. 구현 때 바로잡음(21:3x): 이 둘은 `src/core/access-token.ts` 에 두고 `code.ts` 가 다시 내보낸다 — `code.ts` 는 `server-only` 라 tsx 로 도는 `pnpm access:hash` 가 가져올 수 없다.
   - `hashAccessCode(code)`: 꼴이 어긋나면 `AccessCodeRuleError`. 맞으면 `@node-rs/argon2` 의 `hash(code)` 를 기본값(Argon2id · 19456 KiB · 2회 · 병렬 1 = OWASP 최소 권고)으로 부르고 `encodeAccessCodeHash` 로 감싼다. `Algorithm` 은 `const enum` 이라 `isolatedModules` 에서 가져오지 않는다(기본값이 Argon2id 다, 설치판 확인).
   - `verifyAccessCode(code, keyMaterial)`: `decodeAccessCodeHash` 가 `null` 이면 `AccessNotConfiguredError`. 꼴이 어긋난 입력은 argon2 를 부르지 않고 false. 맞으면 `verify(phc, code)`.
3. `src/server/access/attempts.ts`. `submitAccessCode({ code, ip, now, db = getDb(), env = process.env })` → `{ kind: "ok", token, maxAgeSeconds }` · `{ kind: "wrong" }` · `{ kind: "locked", retryAfterSeconds }` · `{ kind: "not_configured" }`.
   - 키 재료가 없거나 풀리지 않으면 DB 를 건드리지 않고 `not_configured`(실패로 세지 않는다).
   - 설정 `access.cookie_days` · `parent.pin_max_attempts` · `parent.lock_minutes` 를 `getSettings` 로 한 번에 읽는다(양의 정수 규격). 설정 행이 없으면 `SettingMissingError` 가 그대로 나간다(제출 끝점이 503 으로 바꾼다).
   - 한 트랜잭션: (가) `kind = 'access_ip'` 이고 `updated_at` 이 `now - ACCESS_IP_RETENTION_MS` 보다 앞선 행을 지운다(5절 '하루 뒤 지운다', 상수의 자리는 정할 것 마). (나) 그 IP 해시 행을 `failed_count 0` · `updated_at now` 로 넣되 이미 있으면 그대로 둔다(`onConflictDoNothing` 대상 `ip_hash`). (다) 그 행을 `FOR UPDATE` 로 읽는다. (라) `locked_until > now` 면 코드를 보지 않고 `locked`(`retryAfterSeconds` = 남은 초 올림). (마) 코드를 확인한다. 맞으면 그 행을 지우고 토큰(`ttlSeconds` = `access.cookie_days` × 하루 초, nonce 는 `crypto.getRandomValues`)을 만들어 `ok`. (바) 틀리면 실패 수 = (잠금이 지난 행이면 0, 아니면 `failed_count`) + 1. 그 수가 `parent.pin_max_attempts` 이상이면 `failed_count 0` · `locked_until = now + parent.lock_minutes 분` 으로 두고 `locked`, 아니면 `failed_count` 를 올리고 `wrong`. 어느 쪽이든 `updated_at = now`.
   - argon2 확인이 트랜잭션 안에서 돈다(수십 ms, 추측). 같은 IP 의 동시 제출은 행 잠금으로 줄을 선다.
4. `src/server/access/guard.ts`.
   - `hasValidAccess()`: `next/headers` 의 `cookies()` 에서 `ACCESS_COOKIE_NAME` 을 읽어 `verifyAccessToken(값, { keyMaterial: accessKeyMaterial(process.env), now: now() })`.
   - `requireAccess()`: `hasValidAccess()` 가 false 면 `next/navigation` 의 `unauthorized()` 를 부른다(401). 모든 서버 액션 · Route Handler 의 첫 문장이 `await requireAccess()` 다(접근 코드 제출 끝점과 Cron 만 예외).
   - `requireCron(request)`: `CRON_SECRET` 이 비었거나, `authorization` 머리글이 `Bearer <CRON_SECRET>` 와 다르면 `unauthorized()`. 비교는 길이가 같을 때만 `timingSafeEqual`. Cron 처리기(1-나)의 첫 문장이다.
   - `clientIp(headers)`: `x-real-ip` → 없으면 `x-forwarded-for` 의 첫 값 → 없으면 `"unknown"`. Vercel 은 이 머리글을 덮어써 위조를 막는다(확인함).
   - `accessCookieOptions({ maxAgeSeconds, secure })` = `{ httpOnly: true, sameSite: "lax", path: "/", maxAge, secure }`. `secure` 는 요청이 https 일 때만 켠다(로컬 http e2e 의 WebKit 이 Secure 쿠키를 받지 않을 수 있다, 추측).
   - `isSameOrigin(request)`: `origin` 머리글이 있고 그 host 가 `host` 머리글과 같을 때만 true.
5. `src/proxy.ts`. 위치는 `src` 안(App Router 와 같은 층), 실행은 Node 런타임 기본이다(설치판 문서). DB · 설정 · argon2 를 가져오지 않는다. 가져오는 것은 `@/core/access-token` 과 `@/server/clock` 의 `now` 뿐이다.

```ts
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest|woff2?)$).*)",
  ],
};
```

   - `/access` 와 `/access/submit` 은 그대로 넘긴다. `/api/cron/` 으로 시작하는 경로도 넘긴다(그 처리기의 첫 문장 `requireCron` 이 확인한다).
   - 쿠키가 유효하면 `NextResponse.next()`. 잠금 상태를 보지 않는다(이미 등록된 기기는 잠금과 관계없이 쓴다).
   - 쿠키가 없거나 무효이고, GET · HEAD 이며 `next-action` 머리글이 없고 `/api/` 가 아니면 `NextResponse.rewrite(new URL("/access", request.url))`. 401 은 `/access` 페이지가 낸다(아래 6).
   - 그 밖(서버 액션 POST · `/api/` · 다른 메서드)은 `new NextResponse(null, { status: 401 })`. `WWW-Authenticate` 머리글을 붙이지 않는다(브라우저 인증 창을 띄우지 않게).
   - `ACCESS_CODE_HASH` 가 없으면 모든 쿠키가 무효다(닫힌 쪽). 이 일은 서버 기록에 한 번만 남긴다.
6. `src/app/(setup)/access/page.tsx`(서버 컴포넌트): `if (await hasValidAccess()) redirect("/");` 다음 `unauthorized();`. 쿠키 없는 페이지 요청은 모두 이곳으로 다시 쓰이고, 스트리밍 전에 `unauthorized()` 가 불리므로 401 이다(설치판 문서).
7. `src/app/(setup)/access/unauthorized.tsx`(서버 컴포넌트): `<main>` 안에 제목 '부모님이 코드를 넣어 주세요'(4절 문구 그대로)와 `<AccessCodeForm />`. 한 화면 한 행동이다. 글자는 Tailwind 기본 단위로 4절 기준을 넘긴다(안내 `text-xl` 이상 = 20px, 버튼 글자 `text-2xl` = 24px, 입력칸 · 버튼 `min-h-14` = 56px). 포스트잇 보드 꾸밈과 글꼴은 P5 · P10 몫이고, 크기 시험은 P10 의 `font-size.spec.ts` 가 아이 화면 전부를 볼 때 이 화면을 넣는다.
8. `src/app/(setup)/access/access-code-form.tsx`(`'use client'`). 서버 액션을 쓰지 않는다(위험 3).
   - 입력칸: `type="password"` · `name="code"` · `autoComplete="off"` · `autoCapitalize="none"` · `autoCorrect="off"` · `spellCheck={false}`, 보이는 이름표 '가족 접근 코드'(정할 것 라).
   - 버튼 하나 '들어가기'(정할 것 라). 누르면 버튼을 잠그고 `fetch("/access/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) })`.
   - 응답별: 204 → `window.location.assign("/")`. 401 → '코드가 맞지 않아요. 다시 넣어 주세요' · 입력칸 비우기. 429 → '잠시 뒤에 다시 넣어 주세요'. fetch 가 실패(연결 끊김) → '인터넷이 끊겼어요. 연결되면 다시 해요'(8절 문구). 그 밖 → '지금은 들어갈 수 없어요. 잠시 뒤에 다시 해 주세요'. 안내는 `role="status"` 한 줄이다. 문구 넷은 정본 밖이라 정할 것 라.
9. `src/app/(setup)/access/submit/route.ts`. `export async function POST(request: NextRequest)`. 쿠키 없는 기기가 쓰는 유일한 입구라 `requireAccess` 를 부르지 않는다(훑기 시험의 허용 목록에 까닭과 함께 적는다).
   - `isSameOrigin` 이 아니면 403. 본문은 Zod `{ code: z.string().max(ACCESS_CODE_MAX_LENGTH) }`, 어긋나면 400(실패로 세지 않음). 코드는 앞뒤 공백을 다듬는다.
   - `submitAccessCode({ code, ip: clientIp(request.headers), now: now() })` 결과별: ok → 204 + `Set-Cookie`(`accessCookieOptions({ maxAgeSeconds, secure: https 여부 })`). wrong → 401 `{ result: "wrong" }`. locked → 429 `{ result: "locked" }` + `Retry-After`. not_configured 또는 `SettingMissingError` → 503 `{ result: "not_configured" }`(서버 기록에 까닭 한 줄, 값은 남기지 않음).
10. `scripts/access-code-hash.ts`(`pnpm access:hash`). 터미널이면 숨긴 입력을 두 번 받아(같아야 함) 표준 출력에 `ACCESS_CODE_HASH` 값 한 줄만 낸다. 터미널이 아니면(파이프 · 시험) 표준 입력 첫 줄 하나를 쓴다. 안내 · 오류는 표준 오류로. 코드를 어디에도 출력하지 않는다. 종료 코드 0 성공 · 1 규칙 위반 또는 두 입력 다름 · 2 입력 없음(P1b 스크립트와 같은 꼴). 요청자는 자기 터미널에서 돌린다(대화창 `!` 로 돌리면 출력이 대화에 남는다).
11. `scripts/check-data-api.ts`(`pnpm check:data-api`). 순수 함수(`classifyResponse` · `summarize` · `exitCode`, 이름은 제안)를 내보내고 직접 실행될 때만 본문을 돈다(P1b 꼴).
   - 입력: `SUPABASE_URL` · `SUPABASE_PUBLISHABLE_KEY` · (있으면) `SUPABASE_LEGACY_ANON_KEY`. `process.env` 와, 있으면 `.env.local` 을 `node:util` 의 `parseEnv` 로 읽는다(`process.env` 를 바꾸지 않는다, check-bundle 과 같은 꼴).
   - 테이블 목록: P3a 의 스키마 세 파일에서 `is(값, PgTable)` 인 것의 `getTableName`(29개). 스키마 파일은 `server-only` 가 없어 tsx 로 바로 읽힌다.
   - 키마다 · 테이블마다 `GET <SUPABASE_URL>/rest/v1/<테이블>?select=*&limit=1` 에 `apikey: <키>` 머리글(레거시 anon 키는 `Authorization: Bearer <키>` 도). 요청마다 시간 상한(파일 위 이름 붙인 상수).
   - 분류: 2xx 이고 빈 배열 → '0행'. 2xx 이고 행이 있음 → '행 있음'(위반). 2xx 인데 배열이 아님 → '모름'(위반). 2xx 가 아님 → '닫힘'(권한 오류 또는 Data API 꺼짐. 상태 코드와 PostgREST 오류 코드가 있으면 센다). 요청이 실패 → '닿지 않음'.
   - 출력: 첫 줄 요약(테이블 수 · 키 수 · 닫힘 · 0행 · 행 있음 · 모름 · 닿지 않음), 다음 줄부터 위반마다 `테이블 키종류 분류`. 키 값 · 응답 본문은 앞 몇 글자도 내지 않는다.
   - 종료 코드: 0 위반 없음, 1 '행 있음' · '모름'이 하나라도, 2 입력 없음 · 테이블 0개 · '닿지 않음'이 하나라도.
12. `tests/e2e/access-cookie.ts`. `addAccessCookie(context, baseURL)`: `process.env.E2E_ACCESS_CODE_HASH` 로(없으면 'playwright.config 가 만든다'는 오류) `issueAccessToken` 을 불러 `momo_access` 쿠키(httpOnly · SameSite Lax)를 넣는다. 시험 쿠키 유효 시간은 파일 위 이름 붙인 상수. `src/core/access-token.ts` 를 상대 경로로 가져온다(`server-only` 가 없는 모듈이라 Playwright 에서 읽힌다).
13. `tests/e2e/smoke.spec.ts`. P1a 의 뷰포트 · 창 크기 · `lang` 확인은 그대로 두고 아래 셋으로 바꾼다(이름은 '증명' 표).

## 작업 순서 (Order of work)

시작 전(구현자 — 승인 때 바꿈). P3a 가 끝난 워크트리에서 이어 가며 '요청하는 공용 변경' 1~4 · 6 을 구현자가 먼저 옮긴다(5 는 병합 때 컨트롤러). 구현자(implementer · Opus · high) 하나가 차례로 한다. 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null &&` 로 시작한다. Next 코드는 설치판 문서 `node_modules/next/dist/docs/` 를 먼저 본다(proxy · unauthorized · authInterrupts · route). proxy 시험 도구는 설치판 이름 `unstable_doesMiddlewareMatch` · `isRewrite` · `getRewrittenUrl`(`next/experimental/testing/server`)이다(문서의 `unstable_doesProxyMatch` 는 설치판에 없다, 확인함).

1. [서버] 접근 토큰과 코드 해시(시험 먼저). `access-token.test.ts` → `src/core/access-token.ts`(1) · `src/server/access/code.ts`(2) · `scripts/access-code-hash.ts`(10). 완료: 시험 통과. 실행 때 만든 견본 코드를 파이프로 넣어 스크립트가 0 과 출력 한 줄을, `ACCESS_CODE_MIN_LENGTH` 보다 짧은 견본에 1 을 내는 것을 본다(출력값은 보고에 적지 않는다).
2. [DB][서버] 실패 · 잠금(시험 먼저). `access.test.ts` 의 B1 사례 → `src/server/access/attempts.ts`(3). 완료: AC-1a 잠금 · IP · 하루 지난 행 · 설정 안 됨 시험 통과(시각은 인자로 넘긴다).
3. [서버] 함수 안 확인(시험 먼저). `access-gate.test.ts` 의 훑기 · `requireAccess` · `requireCron` 사례 → `src/server/access/guard.ts`(4). 완료: 시험 통과. 지금 저장소의 실제 `src` 훑기는 대상이 없어 통과하고, 견본 파일 시험이 빠뜨림을 잡는다. 여기까지가 PR B1 이다(정할 것 가).
4. [서버] proxy(시험 먼저). `access-gate.test.ts` 의 proxy 사례 → `src/proxy.ts`(5). 완료: 시험 통과. `pnpm build` 가 proxy 묶음(시계 모듈의 `server-only`, P3a 위험 8)과 함께 성공한다. `pnpm check:deps` 0.
5. [화면] 접근 코드 화면과 제출(시험 먼저). `access.test.ts` 의 Route Handler 사례 → `page.tsx`(6) · `unauthorized.tsx`(7) · `access-code-form.tsx`(8) · `submit/route.ts`(9). 완료: 시험 통과, `pnpm build` 성공, `pnpm check:bundle` 위반 0.
6. [화면][검증] 첫 화면 e2e(시험 고치기 먼저). `smoke.spec.ts`(13) → `access-cookie.ts`(12). 완료: `pnpm e2e` 3 통과(WebKit 10.9형). 스크린숏 한 장을 장부 폴더에 남긴다(화면 검토용).
7. [검증] Data API 확인(시험 먼저). `check-data-api.test.ts` → `scripts/check-data-api.ts`(11). 완료: 시험 통과. 환경 변수 없이 돌리면 2 로 끝난다.
8. [검증][사람] 마무리 · H4 · H3 확인 · H14. (가) 구현자: CI 와 같은 순서로 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm e2e` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, 비밀값 grep 0건. (나) code-reviewer(Opus · xhigh) 검토와 fix ≤3. 이어 design-reviewer(Opus · xhigh)가 작업 6 의 스크린숏을 4절 문구 · 크기 기준과 견준다(목업 없음, 정할 것 하). (다) [사람] H4 와 H3 확인: 아래 표대로. (라) 요청자 지시로 컨트롤러가 커밋한다(H14). 완료: 출력이 구현 보고에 있고, 요청자가 프리뷰에서 접근 코드 화면을 보았다는 것과 `pnpm check:data-api` 종료 코드(0)를 알려 준다. spec-trace 의 missing-test 는 63 → 62(AC-1a).

### H3 · H4 전에 할 수 있는 것과 뒤에 할 것

| 때 | 할 수 있는 것 |
|---|---|
| H3 · H4 전(지금) | 작업 1~7 전부와 8 (가) · (나). 시험용 Postgres · 실행 때 만든 시험용 해시 · 로컬 e2e 서버로 접근 제어 전부를 증명한다. 개발용 프로젝트 · Vercel 값이 필요 없다 |
| H4 뒤 | 프리뷰 배포에서 쿠키 없는 요청이 접근 코드 화면(401)인지 브라우저로 본다. 설정 행이 생긴 뒤(P7 적재, 또는 P3a 정할 것 사의 다른 길) 실제 코드로 제출해 홈이 열리는지 본다. 이것이 트랜잭션 풀러(prepare 끔) 연결의 첫 실사용 증명이다 |
| H3 뒤 | `pnpm check:data-api` 를 개발용 프로젝트에 돌린다(Data API 를 끈 뒤) |

### [사람] H4 의 할 일(요청자)

| 순서 | 할 일 | 비고 |
|---|---|---|
| 1 | 가족 접근 코드를 정한다(영문 · 숫자 12자 이상, 집 밖 사람이 짐작하지 못하는 것) | 코드는 저장소 · 장부 · 대화 어디에도 적지 않는다 |
| 2 | 요청자 터미널에서 `pnpm access:hash` 를 돌려(대화창 `!` 로 돌리지 않는다) 나온 한 줄을 Vercel Preview 환경 변수 `ACCESS_CODE_HASH` 에 Sensitive 로 넣는다. 운영(Production)은 운영 배포 때 따로 만든다 | 이 값은 쿠키 서명 열쇠의 바탕이라 비밀값이다(정할 것 차) |
| 3 | `CRON_SECRET` 을 16자 이상 무작위 값으로 만들어 Vercel 에 넣는다. Cron 은 1-나지만 확인 함수는 지금 있다 | Vercel 권고 16자 이상(확인함) |
| 4 | `CLOCK_SHIFT_DAYS` 는 Preview 에만 두고 처음에는 비운다. 운영에는 넣지 않는다 | P3a 의 시계 규칙 |
| 5 | 프로젝트 설정 'Enable access to System Environment Variables' 가 켜졌는지 본다 | VERCEL_ENV(P3a 위험 14) |
| 6 | 프리뷰를 다시 배포하고 브라우저(Vercel 로그인 상태)로 연다. 접근 코드 화면이 보이면 된다. 설정 행이 생긴 뒤 코드를 넣어 홈이 열리는지 본다 | 프리뷰 보호가 앞에서 401 을 내므로 curl 로는 가릴 수 없다 |
| 7 | 코드를 바꿀 때는 새 해시로 바꾸고 다시 배포한다. 모든 기기가 접근 코드를 다시 넣는다 | 10절 '바꾸면 모든 기기의 쿠키가 무효' |
| 8(H3 끝) | `.env.local` 에 `SUPABASE_URL` · `SUPABASE_PUBLISHABLE_KEY`(레거시 anon 키가 켜져 있으면 `SUPABASE_LEGACY_ANON_KEY` 도)를 넣고 요청자 터미널에서 `pnpm check:data-api`. 첫 줄 요약과 종료 코드만 컨트롤러에게 알린다 | publishable 키도 대화에 붙이지 않는다 |

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | `NextResponse.rewrite(url, { status: 401 })` 는 상태를 받지만, 다시 쓴 페이지를 그릴 때 그 상태가 남는지는 렌더 경로 · 캐시 · Vercel 라우팅에 따라 다르다(원본을 읽었으나 확정 못 함, 추측) | 홈이 200 으로 접근 코드 화면을 보여 AC-N5 '홈 401' 이 깨진다 | proxy 는 상태를 정하지 않고 `/access` 로 다시 쓰기만 한다. 401 은 `/access` 페이지가 스트리밍 전에 부르는 `unauthorized()` 가 낸다(설치판 문서 · 원본 확인). e2e 가 실제 서버에서 401 을 본다 |
| 2 | `unauthorized()` 는 실험 기능이고 `experimental.authInterrupts` 를 켜야 한다(16.4.2 문서 'experimental'). 안정판에서도 켜지는 것은 설정 원본으로 확인했다 | Next 17 에서 이름 · 동작이 바뀔 수 있다 | 판을 올릴 때 바꿀 곳은 `guard.ts` 와 `page.tsx` 둘이다. 안정 API 만 쓰는 다른 길은 정할 것 나 |
| 3 | 다시 쓴 화면의 브라우저 주소는 `/` 그대로다. 서버 액션은 지금 주소로 POST 되므로 제출을 서버 액션으로 하면 proxy 가 401 로 막는다 | 접근 코드를 넣을 수 없다 | 제출은 `/access/submit` Route Handler 로 한다. proxy 는 쿠키 없는 서버 액션 POST 를 모든 경로에서 401 로 막는다 |
| 4 | 서버 액션은 id 만 알면 어느 경로에서나 부를 수 있다(proxy 가 통과시킨 `/access` 경로 포함). 설치판 문서도 'proxy 에만 기대지 말라'고 적었다 | proxy 만으로는 쿠키 없는 서버 액션을 다 막지 못한다 | 모든 서버 액션 · Route Handler 첫 문장 `requireAccess()`(10절). 훑기 시험이 첫 문장을 TypeScript 구문 트리로 확인하고, 빠뜨린 견본을 잡는 것도 시험한다(묶음 위험 5) |
| 5 | proxy 는 모든 요청에서 돈다. DB · 설정 · argon2(네이티브 모듈)를 가져오면 느려지고 proxy 묶음 빌드가 깨질 수 있다 | 모든 화면이 느려지거나 배포가 실패한다 | proxy 는 순수 토큰 함수와 시계만 가져온다. 공용 변경 6 의 의존 규칙으로 막는다(권함) |
| 6 | 토큰 · IP 해시 함수를 `src/core` 에 둔 것은 묶음 plan 파일 묶음 밖이다. e2e 도우미(Playwright)와 `playwright.config.ts` 가 `server-only` 없는 모듈을 가져와야 하기 때문이다 | — | `src/core/access-token.ts` 는 Web Crypto 만 쓰고 시각 · 난수를 인자로 받는 순수 함수다(의존 규칙 통과). 묶음 plan 과 다르게 한 것으로 보고한다 |
| 7 | 키 재료가 곧 `ACCESS_CODE_HASH` 라서, 해시가 새면 코드를 몰라도 쿠키를 위조할 수 있다 | 공개 주소의 가족 데이터 | 해시를 비밀값으로 다룬다(Vercel Sensitive, 대화 · 저장소 금지). DB 접속 문자열과 같은 자리에 있어 새는 경우가 같다. 따로 열쇠를 두는 길은 정할 것 차 |
| 8 | 집 공유기 하나에 기기가 여럿이면 IP 가 같다 | 한 기기에서 다섯 번 틀리면 같은 집의 새 기기도 15분 잠긴다 | 정본 동작이다(IP 마다 센다). 이미 등록된 기기는 영향이 없다 |
| 9 | 다른 사이트가 아이 기기 브라우저로 제출 끝점에 틀린 코드를 보내 잠그게 할 수 있다 | 새 기기 등록이 잠깐 막힌다 | 제출 끝점은 같은 출처(`Origin` = `Host`)만 받는다. 쿠키는 SameSite=Lax |
| 10 | 로컬 http e2e 에서 Secure 쿠키를 WebKit 이 버릴 수 있다(추측) | e2e 의 쿠키 있는 기기 시험이 깨진다 | Secure 는 https 요청에만 붙인다. Vercel 은 늘 https 다 |
| 11 | 쿠키 365일은 Chrome 의 쿠키 수명 상한(400일로 알려짐, 추측) 안이다. Safari 는 서버가 HTTP 응답으로 준 쿠키를 줄이지 않는다(추측) | 예상보다 일찍 접근 코드를 다시 넣을 수 있다 | `access.cookie_days` 는 설정값이라 사용 시험 뒤 고칠 수 있다 |
| 12 | 접근 코드 화면의 문구는 정본에 한 줄('부모님이 코드를 넣어 주세요')뿐이고 목업이 없다 | 구현자가 실패 · 잠금 문구를 지어낸다 | 정할 것 라의 문구로 고정해 브리프에 옮긴다 |
| 13 | P2 의 관찰 페이지 e2e 와 프리뷰 실기(H2)는 P3b 가 들어오면 쿠키가 있어야 열린다 | P2 시험이 401 로 깨지거나, iPad 실기가 접근 코드에서 막힌다 | e2e 도우미와 공용 변경 4 · 5, H4 를 H2 앞에 둔다(정할 것 사) |
| 14 | 개발용 DB 에 설정 행이 없으면 제출이 503 이다(P3a 위험 11) | 프리뷰에서 코드를 넣어도 들어갈 수 없다 | P3a 정할 것 사. 401 과 접근 코드 화면 확인은 설정 행 없이도 된다 |
| 15 | Vitest 의 한 작업자(worker) 안에서 시험 파일이 이어 돌면 `getDb()` 가 `globalThis` 에 둔 연결이 앞 파일의 지운 DB 를 가리킬 수 있다(추측) | 통합 시험이 엉뚱한 DB 로 붙는다 | `getDb()` 는 `DATABASE_URL` 이 바뀌면 새 연결을 만든다(주소를 함께 기억한다). P3a 파일별 값 5 와 그 시험 'DB 연결: DATABASE_URL 이 바뀌면 새 연결을 만든다'에 넣었다 |
| 16 | `check:data-api` 가 Data API 꺼짐을 어떤 상태 코드로 받는지 모른다. 끄면 노출 스키마가 `pg_pgrst_no_exposed_schemas` 로 바뀌고 PostgREST 는 계속 돈다(확인함) | 꺼진 것을 '모름'으로 잘못 셀 수 있다 | 2xx 가 아닌 응답은 모두 '닫힘'으로 센다. 첫 실행의 상태 코드 분포를 보고에 적고 필요하면 분류를 고친다 |
| 17 | 프리뷰 보호(Vercel 로그인)가 접근 코드 앞에서 따로 401 을 낸다 | curl 로 앱의 401 을 가릴 수 없다 | 프리뷰 확인은 로그인한 브라우저로 화면을 본다. 앱의 401 은 로컬 e2e 가 증명한다 |

### 정할 것(컨트롤러)

- 가. PR 나눔. 손으로 쓰는 파일이 열일곱이다. 권하는 것은 작업 3 뒤에서 끊어 PR 둘로 검토하는 것이다. B1(서버: 토큰 · 코드 해시 · 잠금 · 함수 안 확인, 파일 여덟)과 B2(proxy · 화면 · e2e · Data API 확인, 파일 아홉 + B1 시험 둘에 사례를 더함)다.
- 나. 401 을 내는 법. 권하는 것은 `experimental.authInterrupts` 를 켜고 `unauthorized()` 를 쓰는 것이다. 페이지(`/access` 가 스트리밍 전에 부름) · 서버 액션 · Route Handler 가 모두 401 이 되는 것을 설치판 문서와 원본(`action-handler.js` · `app-route/module.js`)으로 확인했다. 대가는 실험 기능 하나다(Next 17 이행 때 다시 본다, C51 의 Cache Components 판단과 같은 자리). 다른 길은 안정 API 만 쓰는 것이다. proxy 가 `rewrite(…, { status: 401 })` 로 상태를 정하고(남는지 추측, 위험 1), 함수 안 확인은 오류를 던진다(쿠키 없는 서버 액션은 proxy 가 401 로 막고, 우회한 호출은 500 이 된다). 기술 선택이라 13절 한 줄(C51 처럼)을 권한다.
- 다. 접근 코드 해시. 권하는 것은 argon2id(`@node-rs/argon2` 기본값 = OWASP 최소 권고)다. P1a 가 이미 설치했고, 4절 PIN 과 같은 방식이며, Next 가 서버 외부 패키지로 자동 처리한다(확인함). 다른 길은 `node:crypto` scrypt(N=2^17, r=8, p=1, OWASP 둘째 권고)로 네이티브 모듈 없이 가는 것이다. 브리프가 예로 든 scrypt 와 다르게 권하는 까닭은 OWASP 가 Argon2id 를 먼저 권하고 PIN 과 한 방식으로 두기 위해서다.
- 라. 접근 코드 화면의 정본 밖 문구. 제안: 입력칸 이름표 '가족 접근 코드', 버튼 '들어가기', 틀림 '코드가 맞지 않아요. 다시 넣어 주세요', 잠김 '잠시 뒤에 다시 넣어 주세요', 그 밖 '지금은 들어갈 수 없어요. 잠시 뒤에 다시 해 주세요'. 끊김은 8절 '인터넷이 끊겼어요. 연결되면 다시 해요'를 쓴다. 잠김 문구에 남은 분을 넣지 않는다(숫자 없는 해요체 한 줄).
- 마. 정본 숫자 둘의 자리. 10절 '12자 이상'과 5절 'IP 는 … 하루 뒤 지운다'는 12절 키가 없다. 권하는 것은 이름 붙인 상수(`ACCESS_CODE_MIN_LENGTH` · `ACCESS_IP_RETENTION_MS`)로 두고, 사용 시험 뒤 조정하는 값이 아닌 보안 · 개인정보 규칙이라는 13절 한 줄을 넣는 것이다(P7 check-ids 의 허용 목록에도 같은 까닭). 12자 규칙은 DB 가 없는 해시 스크립트가 쓰므로 설정값으로 읽을 수 없다. 다른 길은 12절에 키 둘을 새로 두는 것이다(해시 스크립트는 고정 규칙으로 남는다).
- 바. parent_auth 안의 IP 행 꼴(묶음 위험 18 의 추측을 확정). 5절은 '접근 코드 실패는 요청 IP 마다 따로 센다(IP 는 해시로 두고 하루 뒤 지운다)'만 적었다. P3a 스키마가 `kind`(pin · access_ip) · `ip_hash` · `failed_count` · `locked_until` · `updated_at` 로 같은 테이블에 IP 행을 둔다(테이블 수 29 그대로). 해석이라 13절 한 줄을 권한다.
- 사. 개발용 경로와 쿠키. 권하는 것은 `/dev/*`(P2 관찰 페이지 · P5 시드 보기)도 쿠키를 요구하는 것이다(NFR-5 '모든 페이지' 그대로). 대신 (1) e2e 도우미와 공용 변경 4 · 5 로 P2 의 e2e 가 쿠키를 넣고, (2) H4 를 H2(iPad 실기) 앞에 두거나 P3b 병합을 H2 뒤로 미룬다. 다른 길은 `next dev` 에서만 `/dev/*` 를 proxy 확인에서 빼는 것이다(프리뷰에서는 여전히 쿠키 필요).
- 아. `check:data-api` 를 언제 돌리나. 권하는 것은 H3 뒤 요청자가 한 번 돌리고, P7 의 dev-load 작업 끝에 같은 명령을 넣는 것이다(P7 브리프로). CI 의 PR 작업에는 넣지 않는다(개발용 프로젝트 비밀값이 필요하다).
- 자. 접근 쿠키 꼴 확인. 이름 `momo_access`, 값 `v1.<만료 초>.<난수>.<서명>`, HttpOnly · SameSite=Lax · Path=/ · Max-Age = `access.cookie_days` 일, Secure 는 https 일 때만, 쓸 때마다 늘리지 않는다(정본에 연장 규칙이 없다).
- 차. 쿠키 서명 열쇠의 바탕. 권하는 것은 `ACCESS_CODE_HASH` 에서 파생하는 것이다. H4 가 값 하나로 끝나고 '코드를 바꾸면 모든 쿠키 무효'(10절)가 저절로 된다. 다른 길은 `ACCESS_COOKIE_SECRET` 을 따로 두고 서명에 해시의 지문을 섞는 것이다(해시가 새도 쿠키 위조는 못 한다. 공용 변경 · H4 하나씩 늘어난다, 위험 7).
- 카. Cron 경로. proxy 는 `/api/cron/` 아래를 쿠키 없이 넘기고, 그 처리기 첫 문장 `requireCron(request)` 이 확인한다. 1-나 Cron 이 이 접두를 따른다. 확인.
- 타. 제출 끝점은 서버 액션이 아니라 Route Handler 다(위험 3). 확인.
- 하. 화면 검토. 접근 코드 화면은 아이가 처음 보는 화면이라 design-reviewer 를 한 번 거친다. 목업이 없어 4절 문구 · 크기 · 한 화면 한 행동 기준으로만 본다(권함). 보드 꾸밈은 P10 에서 다시 본다.

### 컨트롤러 결정(승인 때, 2026-10-16 18:2x)

- 가 PR 나눔: P3a 와 같은 방식 — 브랜치(P3a 와 같은 워크트리에서 이어 감) · 구현자는 하나, 코드 검토는 B1 · B2 묶음 둘 나란히. PR 은 H15 뒤 한 번.
- 나 authInterrupts + unauthorized() · 다 argon2id · 자 쿠키 꼴 · 차 ACCESS_CODE_HASH 파생 · 카 /api/cron/ + requireCron · 타 Route Handler: 확정(13절 C55 (4)~(8)).
- 라 문구 · 마 상수 둘 · 사 /dev/* 도 쿠키(H4 를 H2 앞에) · 하 design-reviewer 한 번: 확정(13절 C57, 4절 반영).
- 바 parent_auth 의 IP 행 꼴: 확정(13절 C56 (3), 5절 반영).
- 아 check:data-api 때: 권함대로(H3 뒤 요청자 한 번, P7 dev-load 끝에 같은 명령 — P7 브리프로).
- 공용 변경: P3a 와 같이 구현자가 자기 워크트리에서 1~4 · 6 을 옮기고, 5(`tests/e2e/fixtures.ts` 의 addAccessCookie 한 줄)는 P2b 와 P3b 가운데 나중에 병합하는 쪽에서 컨트롤러가 더한다. 브리프는 P3a 검토 뒤 컨트롤러가 쓴다.
- 구현 시작(2026-10-16 21:0x, `task-p03b.md`): P3a 검토에서 넘어온 규칙 둘 — 질의 SQL 안에 now() · CURRENT_TIMESTAMP 를 쓰지 않고 시각은 한 시계 값을 매개변수로 넘긴다(잠금 해제 시각 · IP 행 갱신 시각 · 하루 지난 행 지우기 기준), 새 jsonb 열이 생기면 `src/db/schema/jsonb.ts` 의 customType 을 쓴다(이 plan 엔 없음). 명령은 PATH 접두 꼴. 시드 · DB 영어 값은 C60 까지 반영된 P3a 스키마 그대로.
- 구현 뒤(2026-10-16 21:3x, `task-p03b-report.md` DONE_WITH_CONCERNS): 단위 83 · 통합 33 · e2e 3, 전 명령 0, missing-test 63 → 62. 다르게 한 것(12자 상수 · 글자 규칙을 `access-token.ts` 로, `code.ts` 재내보내기) 수용 — 값 2 고침. 작은 변경(입력칸 required · 128자 상한 · 접두 없는 보조 시험 · 화면 사진은 `E2E_ACCESS_SCREENSHOT` 때만)은 검토자 판정. 우려(프리뷰 401 은 H4 뒤 · 브라우저 제출 흐름은 통합 시험으로만 · authInterrupts 실험 기능)는 plan 위험 2 · 17 · H4 표대로. 검토는 code-reviewer(rev-p03a-a1 이어 보기, `task-p03b-review.md`)와 design-reviewer(`task-p03b-design-review.md`, 화면 사진) 둘 나란히.

### 제약

- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 이 절에 적고 보고의 '컨트롤러가 정할 것'에 올린다. 컨트롤러가 13절에 한 줄 먼저 넣은 뒤 구현한다.
- 설계 숫자는 settings 에서 읽는다(`access.cookie_days` · `parent.pin_max_attempts` · `parent.lock_minutes`). 시험도 `tests/fixtures/settings.ts` 에서 읽는다. 정본 고정 규칙 둘은 정할 것 마.
- 시각은 한 시계(`now()`)에서 읽고, 순수 함수에는 인자로 넘긴다.
- 비밀값 · 아이 이름은 어디에도 적지 않는다. 시험의 접근 코드 · 해시 · 쿠키 · CRON_SECRET 은 실행 때 만든다. 출력 · 기록에 코드 · 해시 · 토큰 · 키를 내지 않는다.
- 아이 화면 문구는 정본 그대로이고, 정본에 없는 문구는 정할 것 라로 정한 뒤 옮긴다. 해요체 · 한 화면 한 행동 · 퍼센트 없음.
- 용어는 영역 · 단계 · 단원 · 활동이다. 코드 식별자와 브랜치 이름은 영어 ASCII 다.
- 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer · design-reviewer Opus · xhigh).
- 커밋 · PR 은 요청자 지시 때만 한다(H14).

### 확인한 사실과 출처(2026-10-16)

| 사실 | 출처 · 판 |
|---|---|
| proxy 파일은 프로젝트 뿌리 또는 `src` 안(app 과 같은 층)에 두고, 함수 하나(`proxy` 또는 기본 내보내기)와 `config.matcher` 를 내보낸다. Node 런타임이 기본이고 `runtime` 옵션은 오류다. matcher 가 없으면 정적 파일까지 탄다 | 설치판 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`(16.4.2) |
| 서버 함수는 따로 경로가 아니라 쓰인 경로로 가는 POST 다. matcher 를 바꾸거나 함수를 옮기면 proxy 보호가 조용히 빠지므로 함수 안에서 확인하라 | 같은 문서 'Execution order' |
| proxy 에서 `Response` · `NextResponse` 를 바로 돌려줄 수 있다(401 예). `waitUntil` · `after()` 를 쓸 수 있다 | 같은 문서 · `04-functions/after.md` |
| 설치판 시험 도구는 `unstable_doesMiddlewareMatch` · `isRewrite` · `getRewrittenUrl` · `getRedirectUrl` 이다. 문서의 `unstable_doesProxyMatch` 는 설치판에 없다 | 설치판 `node_modules/next/dist/experimental/testing/server/*.d.ts` |
| `NextResponse.rewrite(destination, init)` 은 init 의 상태를 응답에 담는다. 라우터는 proxy 응답 상태를 `res.statusCode` 에 넣지만 렌더 · 캐시 결과가 그 값을 다시 정한다 | 설치판 `next/dist/server/web/spec-extension/response.js` · `server/lib/router-utils/resolve-routes.js` · `build/templates/app-page-runtime.js` |
| `unauthorized()` 는 실험 기능이고 `experimental.authInterrupts` 가 필요하다. 서버 컴포넌트 · 서버 함수 · Route Handler 에서 부를 수 있고, 스트리밍 전에 부르면 401 이며, 루트 레이아웃에서는 못 부른다. 가까운 `unauthorized.js` 가 화면을 그린다 | 설치판 `04-functions/unauthorized.md` · `03-file-conventions/unauthorized.md` · `05-config/01-next-config-js/authInterrupts.md` |
| `unauthorized()` 는 `__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS` 가 없으면 오류를 던지고, 있으면 digest `NEXT_HTTP_ERROR_FALLBACK;401` 오류를 던진다. 서버 액션 처리기와 Route Handler 모듈이 그 오류를 상태 코드로 바꾼다. 16.4.2 설정 규격은 `authInterrupts` 를 캐너리 제한 없이 받는다 | 설치판 `next/dist/client/components/unauthorized.js` · `server/app-render/action-handler.js` · `server/route-modules/app-route/module.js` · `server/config-schema.js` |
| 인증 안내: 쿠키는 서버에서 HttpOnly · Secure · SameSite · Max-Age · Path 로 두고, proxy 는 쿠키만 읽는 낙관적 확인에 쓰고 DB 를 보지 말라 | 설치판 `01-app/02-guides/authentication.md` |
| Next 의 서버 외부 패키지 기본 목록에 `@node-rs/argon2` 가 있다 | 설치판 `next/dist/lib/server-external-packages.jsonc` |
| `@node-rs/argon2` 2.2.2 의 기본값은 Argon2id · memoryCost 19456 KiB · timeCost 2 · parallelism 1 이고 `Algorithm` 은 `const enum` 이다. 잠금 파일에 darwin-arm64 · linux-x64-gnu 바이너리가 있다 | 설치판 `node_modules/@node-rs/argon2/index.d.ts` · `pnpm-lock.yaml` |
| OWASP: Argon2id 최소 m=19 MiB · t=2 · p=1, scrypt 최소 N=2^17 · r=8 · p=1, Argon2id 를 먼저 쓰고 없을 때 scrypt | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html |
| Vercel 은 `X-Forwarded-For` 를 덮어써 위조를 막고 외부 IP 를 넘기지 않는다. `x-real-ip` 는 같은 값이다 | https://vercel.com/docs/headers/request-headers (last_updated 2025-12-13) |
| Vercel Cron 은 `CRON_SECRET` 이 있으면 `Authorization: Bearer <값>` 으로 부른다. 16자 이상 무작위를 권하고, 아니면 401 을 돌려주는 예를 든다. Cron 은 리다이렉트를 따르지 않는다 | https://vercel.com/docs/cron-jobs/manage-cron-jobs (last_updated 2026-08-11) |
| Supabase publishable 키는 `sb_publishable_…` 꼴이고 `apikey` 머리글로 보내며 로그인 없이는 anon 역할이 된다. 레거시 anon 키는 끄기 전까지 유효하고 2026년 말까지 없어진다 | https://supabase.com/docs/guides/api/api-keys |
| Data API 를 끄면 자동 REST 끝점이 응답하지 않는다. 실제로는 PostgREST 가 계속 돌고 노출 스키마가 `pg_pgrst_no_exposed_schemas` 로 바뀐다(상태 코드는 문서에 없음) | https://supabase.com/docs/guides/database/hardening-data-api · https://supabase.com/docs/guides/troubleshooting/schema-pg_pgrst_no_exposed_schemas-does-not-exist |
| Next 는 `.env*` 의 `$` 를 다른 변수로 펼친다(값에 쓰려면 `\$`) | 설치판 `01-app/02-guides/environment-variables.md` |
| spec-trace 는 시험 이름 맨 앞 AC 토큰과 공백 · '·' · ',' · '/' 뒤에 이어진 AC 토큰을 센다 | `scripts/spec-trace.ts`(P1b) |

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름 · 검사) | 파일 · 명령 |
|---|---|---|
| AC-1a(P3 몫: 접근 코드 · 쿠키 · IP 잠금 · 12자) | 단위 "AC-1a 12자보다 짧거나 영문 · 숫자 밖 글자가 든 접근 코드는 해시를 만들지 않는다" · "AC-1a 접근 코드 해시는 argon2id 이고 같은 코드도 매번 다른 값이며 $ 가 없다" · "AC-1a 맞는 코드만 확인을 통과한다" · "AC-1a 접근 코드(ACCESS_CODE_HASH)를 바꾸면 전에 받은 쿠키가 모두 무효다". 견본 코드는 실행 때 만든다 | `tests/unit/access-token.test.ts` |
| AC-1a | 통합 "AC-1a 맞는 코드를 넣으면 access.cookie_days 일짜리 쿠키 토큰을 받는다" · "AC-1a 한 IP 에서 틀린 코드를 parent.pin_max_attempts 회 넣으면 그 IP 만 parent.lock_minutes 분 잠긴다(다른 IP 는 그대로)" · "AC-1a 잠긴 동안에는 맞는 코드도 받지 않고 잠금이 지나면 다시 받는다" · "AC-1a 맞는 코드를 넣으면 그 IP 의 실패 수가 지워진다" · "AC-1a 이미 쿠키가 있는 기기는 그 IP 가 잠겨도 requireAccess 를 통과한다" · "AC-1a 제출 끝점: 맞으면 204 와 HttpOnly · SameSite=Lax · Path=/ · Max-Age 쿠키, https 일 때만 Secure" · "AC-1a 제출 끝점: 틀림 401 · 잠김 429(Retry-After) · 다른 출처 403 · 꼴 깨짐 400 · 설정 안 됨 503" | `tests/integration/access.test.ts` · `pnpm test:int` |
| AC-1a · AC-N5 | e2e "AC-1a · AC-N5 쿠키 없이 홈을 열면 401 과 접근 코드 화면('부모님이 코드를 넣어 주세요')이 10.9형 화면에 ko 로 열린다" · "AC-1a 유효한 접근 쿠키가 있는 기기는 접근 코드 화면 없이 홈이 열린다". 첫 실행 PIN 은 P10 의 `first-run.spec.ts` | `tests/e2e/smoke.spec.ts` · `pnpm e2e` |
| AC-N5(P3b 몫: 401 · 함수 안 확인) | 단위 "AC-N5 proxy: 쿠키 없는 페이지 요청(GET · HEAD)은 /access 로 다시 쓴다" · "AC-N5 proxy: 쿠키 없는 서버 액션 POST(next-action) · /api · 그 밖 메서드는 401 이고 WWW-Authenticate 가 없다" · "AC-N5 proxy: /access · /access/submit · /api/cron/ 은 쿠키 없이 넘긴다" · "AC-1a proxy: 유효한 쿠키가 있으면 잠금 상태와 관계없이 넘긴다(DB 를 보지 않는다)" · "AC-N5 proxy: ACCESS_CODE_HASH 가 없으면 모든 쿠키를 거부한다" · "proxy matcher: 정적 파일 · 그림 · favicon 은 proxy 를 타지 않고 페이지 · /api 는 탄다" · "AC-N5 함수 안 확인: 모든 'use server' 함수와 route.ts 처리기의 첫 문장이 requireAccess() 다(Cron 은 requireCron, 허용 목록 밖)" · "AC-N5 함수 안 확인: 첫 문장을 빠뜨린 견본(파일 지시 · 함수 안 지시 · route.ts)을 잡는다" · "AC-N5 requireAccess: 쿠키가 없거나 무효면 unauthorized() 를 부르고 유효하면 부르지 않는다" · "AC-N5 requireCron: Authorization 이 'Bearer CRON_SECRET' 과 다르거나 CRON_SECRET 이 비면 unauthorized()" | `tests/unit/access-gate.test.ts` · `pnpm test` |
| AC-N5 | e2e "AC-N5 쿠키 없이 /api 요청과 서버 액션 꼴 POST 는 401 이다" | `tests/e2e/smoke.spec.ts` |
| AC-N5(Data API) | 단위 "AC-N5 Data API 확인: 모든 테이블이 닫힘 · 권한 오류 · 0행이면 0" · "AC-N5 Data API 확인: 행이 돌아온 테이블이 있으면 1 과 그 테이블 이름" · "AC-N5 Data API 확인: 레거시 anon 키가 있으면 그 키로도 모든 테이블을 본다" · "AC-N5 Data API 확인: 주소 · 키가 없거나 닿지 않으면 2" · "AC-N5 Data API 확인: 출력에 키 값 · 응답 본문이 없다" + [사람] 개발용 프로젝트에 `pnpm check:data-api` 0 | `tests/unit/check-data-api.test.ts` · `pnpm check:data-api` |
| AC-N4 에 미치는 것 | `pnpm build && pnpm check:bundle` 위반 0(`ACCESS_CODE_HASH` · `CRON_SECRET` · 새 Supabase 이름이 클라이언트 묶음에 없음, `.env.local` 값이 있으면 값 대조까지) | `scripts/check-bundle.ts`(P1b) |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm e2e` · `pnpm check:deps` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(missing-test 63 → 62) · `pnpm check:bundle` 초록, 비밀값 grep 0건. CI 는 P3a 의 integration 까지(e2e 작업은 P10) | `.github/workflows/ci.yml` |

## 완료 보고 (Done)

구현 뒤 채운다.
