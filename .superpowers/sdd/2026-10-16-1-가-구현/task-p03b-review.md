# 검토 브리프: P3b 접근 제어(code-reviewer rev-p03a-a1 이어 보기 · Opus · xhigh, 읽기 전용)

impl-p03a 가 P3a 와 같은 워크트리에서 끝낸 P3b(가족 접근 코드 · proxy · 함수 안 확인 · Cron 확인 · 접근 코드 화면 · 제출 끝점 · 첫 화면 e2e · Data API 확인 도구)를 설계 준수 · 보안 · 품질로 판정한다. 화면 자체(문구 · 글자 크기 · 한 화면 한 행동)는 design-reviewer 가 사진으로 따로 본다(`task-p03b-design-review.md`) — 이 검토는 코드 · 시험 · 보안 몫이다. 첫 검토라 닫힌 장부는 없다. 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p03b.md`(메인 저장소).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a4f928c00fc43a1e8`(브랜치 `feature/1a-p03b-access`, P3a 커밋 25041d9 위). 새 파일: `src/core/access-token.ts` · `src/server/access/{code,attempts,guard}.ts` · `src/proxy.ts` · `src/app/(setup)/access/{page.tsx,unauthorized.tsx,access-code-form.tsx}` · `src/app/(setup)/access/submit/route.ts` · `scripts/access-code-hash.ts` · `scripts/check-data-api.ts` · `tests/unit/{access-token,access-gate,check-data-api}.test.ts` · `tests/integration/access.test.ts` · `tests/e2e/access-cookie.ts`, 수정 `tests/e2e/smoke.spec.ts`. 고친 공용 파일: `next.config.ts` · `package.json` · `.env.example` · `playwright.config.ts` · `.dependency-cruiser.cjs` · `tests/unit/dependency-rules.test.ts`(`git -C <워크트리> diff`).
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p03b-report.md`('plan 과 다르게 한 것' 하나 — 12자 상수를 `access-token.ts` 로, 컨트롤러 수용 · '작은 변경' · '우려' 셋). 화면 사진 `p03b-access.png`(참고만).
- 명령은 읽기와 시험 실행만: `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm test` · `pnpm test:int` · `pnpm e2e`. 컨트롤러 재확인(21:3x): biome 0 · 단위 83 · 통합 33 · e2e 3 · check:deps 0 · spec-trace missing-test 62 · build(Proxy 포함) · check:bundle 0 · 비밀값 grep 0 · `check:data-api` 환경 없이 2.

## 대조할 정본 · plan(메인 저장소 `/Users/hikaru/workspace/momo-english-academy`)
1. plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p03b-접근-제어.md`: 목표, 바뀌는 파일 표, '요청하는 공용 변경' 1~6(5 는 병합 때), '파일별 값' 1~13(값 2 는 21:3x 고침), '작업 순서' 1~8, 위험 1~17, '정할 것' 가~하와 '컨트롤러 결정' 문단 넷(승인 때 · 구현 시작 · 구현 뒤), 증명 표(AC-1a · AC-N5 · AC-N4 · 공통).
2. 정본 `specs/08-테스트와-기술.md` 10절 접근 제어 행 · 9절 통합(접근 제어 401) · CI, `specs/03-화면.md` 4절 접근 코드 행(C57 문구), `specs/04-데이터.md` 5절 parent_auth(C56 (3)) · 5.1 접근 쿠키, `specs/09-설정값.md` access.cookie_days · parent.pin_max_attempts · parent.lock_minutes, `specs/07-음성과-오류.md` 8절 끊김 문구, `specs/11-요구사항과-수용-기준.md` AC-1a · AC-N5 · NFR-5, `specs/10-결정-기록.md` C55 (4)~(8) · C56 (3) · C57.
3. 구현 브리프 `.superpowers/sdd/2026-10-16-1-가-구현/task-p03b.md`('지킬 것': SQL 안 now() 금지 · 시각은 한 시계 값을 매개변수로 등).
4. P3a 코드(같은 워크트리, 커밋 25041d9): `src/server/{db,settings,clock}/index.ts` · `src/db/schema/operations.ts`(parent_auth) · `tests/integration/{global-setup,test-db}.ts`.

## 판정할 것
1. proxy(값 5 · C55 (4)). matcher 가 정적 파일 · 그림을 빼고 페이지 · /api 를 타는지, `/access` · `/access/submit` · `/api/cron/` 통과, 쿠키 유효면 next(잠금 안 봄), 쿠키 없음 + GET · HEAD + next-action 없음 + /api 아님 → `/access` rewrite(상태 안 정함), 그 밖 → 401(WWW-Authenticate 없음), `ACCESS_CODE_HASH` 없으면 모든 쿠키 무효(기록 한 번), 가져오기가 `@/core/access-token` 과 `@/server/clock` 의 `now` 만인지(공용 변경 6 규칙과 시험), `server-only` 가 proxy 묶음에서 빈 모듈로(빌드 통과 — Turbopack 간접 증거).
2. 토큰 · 열쇠(값 1 · C55 (6)). HKDF-SHA256 두 info, 토큰 꼴 `v1.<만료 초>.<nonce>.<서명>`, `verifyAccessToken` 의 모든 거부 길(없음 · 키 재료 없음 · 칸 수 · 판 · 만료 · 서명)과 `crypto.subtle.verify`(상수 시간), `hashIp`, `encode/decodeAccessCodeHash`(base64url, `$` 없음, `$argon2id$` 확인), 시각 · 난수를 인자로 받는 순수성, 12자 · 글자 규칙 상수의 자리(다르게 한 것 — `code.ts` 재내보내기).
3. 해시 · 제출(값 2 · 3 · 9 · C55 (5) · (7)). argon2id 기본값, 꼴 어긋남은 argon2 를 부르지 않음, `submitAccessCode` 의 한 트랜잭션 차례(하루 지난 행 삭제 → 행 넣기 onConflictDoNothing → FOR UPDATE → 잠금 → 확인 → 성공 삭제 · 실패 셈 · 잠금), 설정 셋을 `getSettings` 한 번(양의 정수 규격), `not_configured` 때 DB 안 건드림, **질의 SQL 안에 now() · CURRENT_TIMESTAMP 없음(시각은 매개변수)**, 끝점의 같은 출처 확인 · Zod · 204/401/429(+Retry-After)/503 · Set-Cookie 속성(HttpOnly · Lax · Path=/ · Max-Age · Secure 는 https 때만) · 서버 기록에 값 안 남김.
4. 보안 관점. 시간 공격(서명 · CRON_SECRET 비교), IP 위조(x-real-ip · x-forwarded-for 첫 값 신뢰 — Vercel 밖에서의 뜻, `"unknown"` 묶음이 한 행을 공유하는 결과), 쿠키 위조 경로(해시 유출 = 열쇠 유출, C55 (6) 의 알려진 대가), 잠금 우회(IP 바꾸기 · 동시 요청 · 코드 꼴 어긋남을 실패로 안 세는 것), 같은 출처 확인의 빈틈(Origin 없음 · 포트 · 프록시), argon2 를 트랜잭션 안에서 돌리는 비용(동시 제출), 오류 · 로그에 코드 · 해시 · 토큰 노출 0, `access-code-hash.ts` 가 코드를 출력하지 않음, `check-data-api.ts` 가 키 값 · 응답 본문을 출력하지 않음.
5. 함수 안 확인(값 4 · AC-N5). `requireAccess` · `requireCron` · `clientIp` · `accessCookieOptions` · `isSameOrigin`, 훑기 시험이 `'use server'` 파일과 `route.ts` 처리기의 첫 문장을 구문 트리로 보는지(견본으로 빠뜨림을 잡는지, 허용 목록에 제출 끝점 · Cron 까닭), 지금 저장소에서 대상이 없어도 통과하는 꼴.
6. e2e · 공용 변경. `smoke.spec.ts` 셋이 증명 표 이름 글자 그대로이고 실제로 401 · 접근 코드 화면 · 쿠키 있는 기기 홈 · /api 와 서버 액션 꼴 POST 401 을 단언하는지, `access-cookie.ts` 가 `E2E_ACCESS_CODE_HASH` 로 토큰을 만드는지, `playwright.config.ts` 가 코드 · 해시를 실행 때 만들어 `webServer.env` 에 넣고 저장소에 값이 없는지, `next.config.ts` authInterrupts, `package.json` scripts 둘, `.env.example` 이름만, 의존 규칙 `proxy-stays-light` + 시험.
7. Data API 확인 도구(값 11). 29 테이블을 P3a 스키마에서 `getTableName` 으로, 분류 다섯 · 종료 0 · 1 · 2, `parseEnv` 로 `.env.local`, 시간 상한 상수, 단위 시험 다섯이 증명 표 이름대로.
8. 시험의 실체. 증명 표 AC-1a(단위 넷 · 통합 일곱) · AC-N5(단위 열 · e2e) · Data API(단위 다섯) 이름이 글자 그대로이고 이름대로 단언하는지(잠금 뒤 맞는 코드도 거부 · 다른 IP 는 그대로 · 쿠키 있는 기기는 잠금과 무관 · 설정 안 됨 503 · 꼴 깨짐 400 · 다른 출처 403), 통합 시험이 test-db 의 파일별 DB 와 `seedSettings` 를 쓰고 시각을 인자로 넘기는지, 숫자가 `tests/fixtures/settings.ts` 에서만 오는지, '작은 변경'(required · 128자 상한 · 보조 시험 · 사진 조건)이 plan 과 어긋나지 않는지.
9. 우려 셋 판정(프리뷰 401 은 H4 뒤 · 브라우저 제출 흐름은 통합으로만 · authInterrupts 실험) · 허용 파일 밖 변화 0 · P3a 파일 변화 0 · 비밀값 0 · 한글 식별자 없음.

## 보고 꼴(`review-p03b.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n).
- 지적마다 번호 · 심각도 · 파일:줄 · 근거(정본 절 · plan 줄 · 문장, 외부 사실은 출처와 확인 정도) · 고치는 법 한 줄. 보안 지적은 공격 경로를 한 줄로 적는다. 근거 없는 지적은 넣지 않는다.
- 표 하나: 값 1~13 마다 '맞음 · 어긋남(무엇)'. 표 하나: 다르게 한 것 · 작은 변경 넷 · 우려 셋 각각 '수용 · 고칠 것(근거)'. 표 하나: 증명 표 행마다 '시험 있음(이름 수) · 없음'.
- 마지막 메시지 첫 줄은 판정, 그 뒤 요지 8줄 안쪽. fix 뒤 재검토는 따로 브리프.
