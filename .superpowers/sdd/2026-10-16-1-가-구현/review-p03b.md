판정: Changes requested (C 0 · I 1 · M 4)

# 검토: P3b 접근 제어 — 코드 · 시험 · 보안 몫(code-reviewer · Opus · xhigh, 읽기 전용)

대상은 워크트리 `.claude/worktrees/agent-a4f928c00fc43a1e8`(브랜치 `feature/1a-p03b-access`, P3a 커밋 25041d9 위)의 새 파일 열여섯 · 고친 `tests/e2e/smoke.spec.ts` · 공용 파일 여섯이다. 대조는 plan-p03b(값 2 는 21:3x 고친 판, 결정 문단 넷), 10절 접근 제어 행, 4절 접근 코드 행(C57), 5절 parent_auth(C56 (3)) · 5.1 접근 쿠키, 12절 키 셋, AC-1a · AC-N5 · NFR-5, C55 (4)~(8), 구현 브리프 `task-p03b.md` 로 했다. 화면 자체는 design-reviewer 몫이라 보지 않았다.

검토자가 직접 돌린 것.
- `pnpm test`: 9 파일 · 83 통과.
- `pnpm test:int`: 4 파일 · 33 통과(2.05초).
- `pnpm e2e`: WebKit 10.9형 3 통과.
- `git diff --stat 25041d9`: P3a 파일(스키마 · db · settings · clock · 학습일 · 시험 도구 · 마이그레이션 · vitest · biome · 잠금 파일) 변화 0. 바뀐 추적 파일은 허용된 일곱뿐이다.
- 한글 식별자 grep 0(한글은 문자열 · 주석만).
- build · check:deps · spec-trace · check:bundle · 비밀값 grep 은 컨트롤러 재확인(21:3x)을 따른다.

## 1. 설계 준수
- ✅ proxy(값 5 · C55 (4)). matcher 가 plan 글자 그대로다. `/access` · `/access/submit` · `/api/cron/` 은 넘기고, 쿠키가 유효하면 잠금을 보지 않고 넘긴다. 쿠키가 없을 때 GET · HEAD 이고 next-action 이 없으며 /api 가 아니면 `/access` 로 다시 쓰기만 한다(상태 안 정함). 그 밖은 401 이고 WWW-Authenticate 가 없다. `ACCESS_CODE_HASH` 가 없으면 모든 쿠키가 무효이고 기록은 한 번 남긴다(src/proxy.ts:28-55). 가져오는 것은 `next/server` · `@/core/access-token` · `@/server/clock` 의 `now` 뿐이다.
- ✅ 토큰 · 열쇠(값 1 · C55 (6)). HKDF-SHA256 은 salt 빈 값과 info 둘을 쓴다. 토큰 꼴은 `v1.<만료 초>.<nonce>.<서명>` 이다. `verifyAccessToken` 은 없음 · 키 재료 없음 · 칸 수 · 판 · 만료 · 서명을 모두 거부한다. 서명 비교는 `crypto.subtle.verify` 다(src/core/access-token.ts:154-176). `encode/decodeAccessCodeHash` 는 base64url 이라 `$` 가 없고 `$argon2id$` 를 확인한다. 시각 · 난수는 인자로 받는다.
- ✅ 해시 · 제출(값 2 · 3 · 9 · C55 (5) (7)). argon2 는 기본값이고, 꼴이 어긋난 입력은 argon2 를 부르지 않는다(code.ts:43-51). `submitAccessCode` 의 차례가 plan 값 3 그대로다(attempts.ts:65-137). 설정 셋은 `getSettings` 한 번에 양의 정수 규격으로 읽는다. `not_configured` 때는 `getDb()` 도 부르지 않는다. 질의 SQL 에 now() · CURRENT_TIMESTAMP 가 없고 시각은 매개변수다. 끝점은 같은 출처 403 · Zod 400 · 204 + Set-Cookie · 401 · 429 + Retry-After · 503 을 낸다. 쿠키 속성은 HttpOnly · Lax · Path=/ · Max-Age 이고, Secure 는 https 일 때만 붙는다. 기록에는 설정 키 이름만 남는다.
- ✅ 함수 안 확인(값 4). `requireAccess` · `requireCron`(길이가 같을 때만 timingSafeEqual) · `clientIp` · `accessCookieOptions` · `isSameOrigin` 이 plan 글자대로다.
- ⚠️ 훑기 시험은 흔한 내보내기 꼴 둘을 보지 못한다(I-1).
- ✅ 화면 · 문구(값 6 · 7 · 8). 제목 · 이름표 · 버튼 · 문구 넷이 4절 · C57 · 8절과 글자까지 같다. 입력칸 속성은 값 8 에 `required` 를 더했다. 글자 크기 단위(text-xl · text-2xl · min-h-14)도 값 7 대로다.
- ✅ 스크립트(값 10 · 11). 해시 스크립트는 코드를 내지 않고 종료 0 · 1 · 2 를 낸다. Data API 확인은 테이블 29 를 스키마에서 읽고, 분류 다섯 · 종료 0 · 1 · 2 · `parseEnv` · 시간 상한 상수를 갖추며 키 값과 본문을 내지 않는다.
- ✅ e2e · 공용 변경(값 12 · 13, 공용 1~4 · 6). 아래 표 1 과 '공용 변경' 절.
- ⚠️ Vercel 프리뷰에서의 401(다시 쓰기 + unauthorized)과 실제 Data API 응답은 H4 · H3 뒤에만 볼 수 있다.

## 2. 잘한 점
- 잠금 흐름이 한 트랜잭션 안에서 `onConflictDoNothing` 다음 `FOR UPDATE` 로 줄을 세운다. 그래서 같은 IP 의 처음 두 제출이 겹쳐도 실패 수가 빠지지 않는다. 시각은 모두 한 시계 값을 매개변수로 넘긴다(attempts.ts:65-137).
- 끝점 시험이 403 두 번과 400 네 번(합 여섯, 잠금 기준 다섯 초과) 뒤에 같은 IP 의 맞는 코드가 204 인지 본다. 이것으로 '세지 않는다'를 실제로 증명한다(tests/integration/access.test.ts:355-372). 기록에 코드 · 해시가 없는지도 단언한다(:395-399).
- proxy 시험이 공개 경로와 이름이 비슷한 경로(`/accessx` · `/api/cronjob` · `/access/other`)는 넘기지 않는지까지 본다(access-gate.test.ts:396-400).
- 훑기 시험이 구문 트리로 파일 지시 · 함수 안 지시 · route.ts · Cron 을 가르고, 빠뜨린 견본 다섯 꼴과 허용 목록 파일이 실제로 있는지를 단언한다(access-gate.test.ts:227-292).
- `requireCron` 시험이 대소문자 · 한 글자 모자람 · 한 글자 넘침 · 빈 비밀값을 모두 넣는다(:316-341).
- `not_configured` 시험은 `db` 에 `undefined as never` 를 넘긴다. 그래서 DB 를 건드리지 않음을 형과 실행 양쪽에서 막는다(access.test.ts:235-248).

## 3. 지적

### I-1 Important — 함수 안 확인 훑기가 흔한 내보내기 꼴 둘을 건너뛰고 조용히 통과한다
- 위치: tests/unit/access-gate.test.ts:133-160(`exportedFunctions`), :174-181('use server' 파일), :205-214(route.ts).
- 무엇이: 검사 대상은 `export function` · `export const x = (화살표 · function 식)` · `export default (화살표 · function 식)` 뿐이다. 다음 두 꼴은 아예 보지 않아 위반이 0 으로 나온다.
  - `export { save }` 와 `export { handler as GET, handler as POST }` 같은 지정자 내보내기.
  - 함수 리터럴이 아닌 초기값. 예: `export const GET = handler`, `export const save = withLog(async () => …)`.
- 공격 경로: 이 꼴로 쓴 서버 액션이 `requireAccess()` 를 빠뜨려도 시험이 통과한다. 그러면 proxy 가 쿠키 없이 넘기는 `POST /access`(Next-Action 머리글)로 쿠키 없는 사람이 그 액션을 부를 수 있다(plan 위험 4).
- 근거: 10절 '모든 서버 액션 · Route Handler(회화 스트리밍 포함)는 첫 줄에서 같은 확인 함수를 다시 부르고', NFR-5, plan 위험 4 '훑기 시험이 첫 문장을 TypeScript 구문 트리로 확인하고, 빠뜨린 견본을 잡는 것도 시험한다', 시험 이름의 '모든'. 지금 저장소에는 서버 액션이 없어 열린 길은 없다. 하지만 P9~P12 가 이 시험 하나에 기댄다.
- 고치는 법:
  - 'use server' 파일과 route.ts 에서 `export { … }` 지정자를 같은 파일의 선언으로 풀어 첫 문장을 본다.
  - 함수 리터럴이 아닌 내보낸 값은 위반으로 센다(닫힌 쪽).
  - 견본에 두 꼴을 더한다.
  - 선택: `requireAccess` 식별자가 `@/server/access/guard` 에서 가져온 것인지도 보면 같은 이름의 지역 함수도 막힌다.

### M-1 Minor — proxy 가 `/access` 로 가는 서버 액션 POST 도 쿠키 없이 넘긴다(깊이 방어)
- 위치: src/proxy.ts:30-32.
- 무엇이: 공개 경로 확인이 메서드 · `next-action` 확인보다 앞선다. 그래서 `POST /access` + `Next-Action` 이 proxy 를 지난다. 접근 코드 화면은 서버 액션을 쓰지 않는다(값 8, fetch 로 제출).
- 공격 경로: 확인을 빠뜨린 서버 액션이 하나라도 생기면(I-1) 쿠키 없는 사람이 액션 id 로 `POST /access` 를 보내 실행한다.
- 근거: plan 위험 4 '서버 액션은 id 만 알면 어느 경로에서나 부를 수 있다(proxy 가 통과시킨 /access 경로 포함)'. 구현은 plan 값 5 '/access 와 /access/submit 은 그대로 넘긴다' 글자대로라 plan 몫이다.
- 고치는 법: 공개 경로라도 `next-action` 머리글이 있으면 401 로 두고 proxy 시험에 한 사례를 더한다(컨트롤러 판단, 값 5 한 줄).

### M-2 Minor — `proxy-stays-light` 가 직접 가져오기만 본다
- 위치: .dependency-cruiser.cjs:43-51, tests/unit/access-gate.test.ts:436-441(가져오기 줄 정규식도 직접만 봄).
- 무엇이: 규칙은 src/proxy.ts 에서 나가는 선 하나만 본다. proxy 가 가져오는 `@/server/clock` 이 뒤에 설정 · DB 를 가져와도 이 규칙과 `db-only-from-server`(src/server 안은 허용)가 막지 못한다.
- 근거: plan 위험 5 'DB · 설정 · argon2(네이티브 모듈)를 가져오면 느려지고 proxy 묶음 빌드가 깨질 수 있다', P3a plan 값 7 '이 모듈은 DB · 설정을 가져오지 않는다. P3b 의 proxy 가 모든 요청에서 이 모듈을 가져오기 때문이다'.
- 고치는 법: 같은 규칙의 `to` 에 `reachable: true` 를 둔다. 설치판 dependency-cruiser 18.6.0 의 `types/restrictions.d.mts:161-166` 이 받는다. 확인 정도는 형 정의만 봤고 실행은 하지 않았다. 의존 규칙 시험 견본에 한 단계 건너 가져오는 예(src/proxy.ts → src/server/clock → src/server/settings)를 더한다.

### M-3 Minor — 같은 IP 의 동시 제출에서 앞쪽이 맞으면 뒤쪽이 500 이다
- 위치: src/server/access/attempts.ts:81-90.
- 무엇이: 행이 이미 있는 IP 에서 두 제출이 `FOR UPDATE` 로 줄을 선다. 앞 트랜잭션이 맞는 코드로 그 행을 지우고 끝나면, 뒤 트랜잭션의 `FOR UPDATE` 는 지워진 행을 건너뛰어 0행을 받는다. 그러면 :90 이 던지고, 끝점(route.ts:53)이 다시 던져 500 이 된다. 화면은 '지금은 들어갈 수 없어요'를 보인다.
- 근거: plan 값 3 '(다) 그 행을 FOR UPDATE 로 읽는다 … 같은 IP 의 동시 제출은 행 잠금으로 줄을 선다'. 줄은 서지만 뒤쪽 결과가 정해지지 않는다. Postgres READ COMMITTED 에서 잠금을 기다린 행이 지워지면 돌려주지 않는다는 동작은 Postgres 문서 'Transaction Isolation' 기준이다. 이 검토에서 원문을 열지 않아 확인 정도는 중간이다.
- 영향: 같은 공유기 뒤 두 기기가 같은 때 넣을 때만 생기고, 다시 누르면 된다.
- 고치는 법: 0행이면 (나) · (다)를 한 번 더 한다(그 사이 지워진 행은 새로 넣는다).

### M-4 Minor — 접근 코드 입력 폼의 응답별 문구 · 동작을 보는 시험이 없다
- 위치: src/app/(setup)/access/access-code-form.tsx:28-51.
- 무엇이: 아래 갈래를 보는 시험이 없다. e2e 는 빈 안내 줄만 보고, 통합은 끝점만 본다. 구현자 우려 2 가 남긴 빈칸이다.
  - 204 → 홈.
  - 401 → 틀림 문구와 입력칸 비우기.
  - 429 → 잠김.
  - 그 밖 → 그 밖 문구.
  - fetch 실패 → 끊김.
- 근거: 4절 · C57 의 정본 밖 문구 넷과 8절 끊김 문구, plan 값 8 '응답별'. design-reviewer 는 빈 상태 사진만 본다.
- 고치는 법: e2e 에서 Playwright `page.route("**/access/submit", …)` 로 401 · 429 · 503 · 204 를 돌려주고 `route.abort()` 로 끊김을 만든다. 그 뒤 `role="status"` 문구, 입력칸 비우기, 주소 이동을 단언한다. DB 없이 된다.

## 4. 판정
Changes requested. I-1 하나를 고친 뒤 재검토한다. M-1 · M-2 는 I-1 과 같은 보안 줄(쿠키 없는 서버 액션 · proxy 무게)의 깊이 방어라 같은 fix 에 묶기를 권한다. M-3 · M-4 는 작은 수정이다. 보안 관점(브리프 판정 4)의 나머지는 아래 '보안 관점' 절대로 문제가 없다.

## 보안 관점(브리프 판정 4)
- **시간 공격:** 쿠키 서명은 `crypto.subtle.verify` 로 비교한다. CRON_SECRET 은 길이가 같을 때만 `timingSafeEqual` 로 비교한다. 길이만 드러나며, 이는 plan 값 4 가 받아들인 대가다. 형식 검사(빠름)와 argon2(느림)의 시간 차이는 공개된 형식 규칙만 드러낸다.
- **IP 위조:** `x-real-ip` 와 `x-forwarded-for` 첫 값을 믿는다. Vercel 은 이 머리글을 덮어쓴다(plan 확인한 사실 표, Vercel 문서). Vercel 밖(로컬 `next start`)에서는 머리글을 바꿔 IP 마다 잠금을 피할 수 있고, 머리글이 없으면 모두 `"unknown"` 한 행을 나눈다. 배포가 Vercel 하나(10절)라 받아들인다.
- **쿠키 위조:** `ACCESS_CODE_HASH` 가 새면 코드를 몰라도 쿠키를 만들 수 있다. 이는 C55 (6) · plan 위험 7 의 알려진 대가다. 코드에서 해시 · 토큰을 기록하거나 응답에 싣는 곳은 없다.
- **잠금 우회:** 같은 IP 의 동시 요청은 행 잠금으로 줄을 선다. 처음 행을 넣는 두 요청은 유일 색인에서 기다린 뒤 이어진다. 꼴이 어긋난 코드도 128자 안이면 실패로 센다. 128자를 넘거나 JSON 이 깨진 요청은 세지 않지만 맞을 수도 없다. 잠금이 풀리면 다섯 번을 다시 받는 것은 plan 값 3 (바) 대로다.
- **같은 출처:** Origin 이 없거나 `null` 이면 403 이다. host 는 포트까지 견준다. 스킴은 견주지 않지만 같은 host 를 가진 쪽만 통과하므로 문제가 없다.
- **argon2 비용:** 확인이 트랜잭션 안에서 돌아 그동안 연결 하나(POOL_MAX 3)와 행 잠금을 쥔다. 맨 앞의 '하루 지난 행 지우기'도 지울 행이 있을 때만 잠깐 줄을 세운다. 가족 앱 규모에서 문제 없다.
- **로그 노출:** 기록되는 것은 proxy 한 줄과 끝점의 설정 키 이름 · 까닭 한 줄뿐이다. 해시 스크립트는 코드를 내지 않는다. Data API 확인은 키 값 · 본문을 내지 않는다(시험 :151-176).

## 표 1. 값 1~13
| 값 | 판정 |
|---|---|
| 1 access-token | 맞음 |
| 2 code(상수는 core, code.ts 재내보내기 — 21:3x 고친 판) | 맞음 |
| 3 attempts | 맞음(차례 · 매개변수 시각 · not_configured 때 DB 안 건드림). 동시 제출 한 갈래는 M-3 |
| 4 guard | 맞음 |
| 5 proxy | 맞음(plan 글자). 깊이 방어는 M-1 |
| 6 page | 맞음 |
| 7 unauthorized | 맞음(제목 4절 그대로, 크기 단위) |
| 8 form | 맞음(`required` 더함). 시험 빈칸은 M-4 |
| 9 submit route | 맞음 |
| 10 access-code-hash | 맞음(TTY 숨긴 입력 두 번 · 파이프 첫 줄 · 표준 출력 한 줄 · 0 · 1 · 2) |
| 11 check-data-api | 맞음 |
| 12 access-cookie(e2e) | 맞음(`E2E_ACCESS_CODE_HASH` · 상대 경로 · 이름 붙인 TTL 상수) |
| 13 smoke.spec | 맞음(P1a 뷰포트 · 창 · lang · main 하나 유지, 증명 표 셋) |

## 표 2. 다르게 한 것 · 작은 변경 넷 · 우려
| 항목 | 판정 | 근거 |
|---|---|---|
| 다르게 한 것: 12자 상수 · 글자 규칙을 access-token.ts 로, code.ts 재내보내기 | 수용(컨트롤러 수용, 맞음) | 정의는 한 곳(access-token.ts:16-26)이다. code.ts:14-18 이 다시 내보내고 스크립트 · playwright.config 가 core 를 읽는다. 해시 호출 두 줄이 스크립트에 한 번 더 있는 것은 server-only 때문이라 받아들인다 |
| 작은 변경 1: 입력칸 `required` | 수용 | 빈 값 제출이 실패 한 번으로 세어지는 것을 브라우저에서 먼저 막는다. 서버는 그대로 센다 |
| 작은 변경 2: `isValidAccessCode` 의 128자 상한 | 수용 | 값 1 의 `ACCESS_CODE_MAX_LENGTH`(입력 상한)와 끝점 Zod 상한이 같은 값이다 |
| 작은 변경 3: 접두 없는 보조 시험 | 수용 | 모두 구체적으로 단언한다(토큰 꼴 · 만료 · 고친 토큰 · 열쇠 재료 · IP 해시 · 하루 지난 행 · not_configured · 설정 없음 · 테이블 29) |
| 작은 변경 4: 사진은 `E2E_ACCESS_SCREENSHOT` 때만 | 수용 | 매 e2e 가 장부 파일을 덮어쓰지 않는다. 작업 6 의 사진 한 장은 남았다 |
| (보고 다르게 한 것 4) proxy 기록 한 번 · 시험에서 spyOn | 수용 | 값 5 '서버 기록에 한 번만' 그대로이고 시험이 횟수 · 값 없음을 단언한다 |
| 우려 1: 프리뷰 401 은 H4 뒤 | 수용 | plan 위험 1 · 17, H4 표 6. 로컬 `next start` 에서 401 은 e2e 로 확인했다 |
| 우려 2: 브라우저 제출 흐름은 통합으로만 | 수용하되 폼 갈래 시험은 더함 | 끝까지(DB 포함)는 P7 뒤 프리뷰 몫이 맞다. 폼의 응답별 문구는 DB 없이 시험할 수 있다(M-4) |
| 우려 3: base64url 비정규 꼴 | 수용 | 이미 받은 토큰의 다른 철자만 만들 수 있고 새 토큰 위조는 안 된다. 토큰은 원래 들고 있으면 쓰는 값이다 |
| 우려 4: `reuseExistingServer` | 수용 | P1a 설정이다. 다른 해시로 뜬 서버가 있으면 쿠키 시험이 크게 실패하므로 조용히 틀리지 않는다 |
| 우려 5: authInterrupts 실험 기능 | 수용 | C55 (4) · plan 위험 2. 바꿀 곳은 guard.ts · page.tsx 둘이다 |

## 표 3. 증명 표
| 증명 표 행 | 시험 |
|---|---|
| AC-1a(단위) | 있음 4(access-token.test.ts, 이름 글자 그대로) |
| AC-1a(통합) | 있음 7(access.test.ts, 이름 글자 그대로. 잠금 뒤 맞는 코드 거부 · 다른 IP 그대로 · 쿠키 있는 기기 · 503 · 400 · 403 을 단언) |
| AC-1a · AC-N5(e2e) | 있음 2(smoke.spec.ts, 401 · 제목 · ko · 10.9형 · 쿠키 있는 기기 홈 200 · /access → /) |
| AC-N5(단위, 401 · 함수 안 확인) | 있음 10(access-gate.test.ts: proxy 6 · 훑기 2 · requireAccess · requireCron). 훑기의 빈칸은 I-1 |
| AC-N5(e2e) | 있음 1(/api 401 · 서버 액션 꼴 POST 401, WWW-Authenticate 없음) |
| AC-N5(Data API) | 있음 5(check-data-api.test.ts) + [사람] H3 뒤 실행 |
| AC-N4 에 미치는 것 | 검사 있음(build + check:bundle 위반 0, 컨트롤러 재확인) |

## 공용 변경
1. next.config.ts `experimental: { authInterrupts: true }` 이다. ✅
2. package.json scripts `access:hash` · `check:data-api` 이다. ✅
3. .env.example: ACCESS_CODE_HASH 주석이 plan 글자 그대로이고, Data API 머리 주석 아래 이름 셋이 있다(레거시 키에는 '켜져 있을 때만' 주석). ✅
4. playwright.config.ts: 24자 코드와 `hashSync` + 감싸기로 만든 해시를 실행 때 만들어 `process.env` 에 둔다(이미 있으면 그대로). `webServer.env` 는 process.env 의 값 있는 항목 + `ACCESS_CODE_HASH` 다. 저장소에 값은 없다. ✅
5. tests/e2e/fixtures.ts 는 손대지 않았다(병합 때 컨트롤러). ✅
6. `proxy-stays-light` 는 plan 의 목록(src/server/{db,settings} · access/{code,attempts} · @node-rs/argon2 · postgres · drizzle-orm)을 막고, 막는 예 시험 하나가 있다. ✅ 가져오기를 건너 끌려 들어오는 것은 M-2 다.

## 범위 밖 관찰(지적 아님)
- IP 마다 잠금은 IPv6 주소를 그대로 해시한다. Vercel 이 IPv6 클라이언트 주소를 `x-real-ip` 로 넘긴다면, 한 가입자가 가진 /64 안에서 주소를 바꿔 잠금을 피할 수 있다(추측, 확인 안 함). 주된 막이는 12자 이상 코드와 argon2 라 지금 고칠 일은 아니다. 사용 시험 뒤 '/64 로 묶어 해시'를 13절 한 줄로 볼 수 있다.
- `check-data-api` 는 '닿지 않음'과 '행 있음'이 함께 나오면 종료 2 를 낸다. 첫 줄 요약에 '행 있음 n' 이 있으므로 요청자가 첫 줄을 그대로 전하면 놓치지 않는다.
