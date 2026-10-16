# fix 1 보고: P3b 접근 제어(implementer · Opus · high, 같은 워크트리)

브리프 `task-p03b-fix1.md`, 검토 `review-p03b.md`(코드) · `review-p03b-design.md`(화면)를 보고 지적 열을 모두 고쳤다. 증명 표 시험 이름은 그대로 두었고, 새 시험에는 AC 접두를 붙이지 않았다. git 쓰기 명령은 쓰지 않았다.

## 지적별

| 지적 | 판정 | 파일:줄 · 시험 |
|---|---|---|
| 코드 I-1 함수 안 확인 훑기가 내보내기 꼴 둘을 건너뜀 | ADDRESSED | `tests/unit/access-gate.test.ts:138-224`. `asFunctionLiteral` 은 괄호 · `as` · `satisfies` 를 벗긴다. `exportedFunctions` 는 `export { a, b as GET }` 지정자를 같은 파일의 함수 선언이나 함수 리터럴을 담은 변수로 풀어 본문을 따라간다. 함수 리터럴이 아닌 값(`export const GET = handler` · `withLog(…)`), 다른 파일에서 다시 내보낸 것, `export *` 는 '함수 본문을 따라가지 못함' 위반으로 센다(닫힌 쪽). route.ts 는 메서드 이름과 `*` 를 본다. 견본 둘(`:365-` 이름 바꾼 route 처리기 · 다시 내보낸 서버 액션)을 시험 "AC-N5 함수 안 확인: 첫 문장을 빠뜨린 견본(파일 지시 · 함수 안 지시 · route.ts)을 잡는다" 안에 더했다 |
| 코드 M-1 공개 경로의 서버 액션 POST | ADDRESSED | `src/proxy.ts:30-37` · `:52`. `next-action` 머리글이 있으면 `/access` · `/access/submit` · `/api/cron/` 에서도 넘기지 않는다. 유효한 쿠키가 없으면 401 이다. 시험 "AC-N5 proxy: 쿠키 없는 서버 액션 POST(next-action) · /api · 그 밖 메서드는 401 이고 WWW-Authenticate 가 없다"에 사례 셋을 더했다(`access-gate.test.ts:498-501`) |
| 코드 M-2 proxy-stays-light 가 직접 가져오기만 봄 | ADDRESSED | `.dependency-cruiser.cjs:50` `reachable: true`. 견본 `src/server/relay.ts`(→ `@/server/db/index`)를 두고 proxy 가 가져오게 했다(`tests/unit/dependency-rules.test.ts:47-50`). 새 시험 "의존 규칙: src/proxy.ts 가 한 단계 건너(src/server/relay → src/server/db) DB 를 끌어와도 proxy-stays-light 위반"(:208). 기존 막는 예 시험은 대상 이름(`src/server/settings/index.ts`)으로 보게 바꿨다. `pnpm check:deps` 는 지금 코드에서 위반 0 이다 |
| 코드 M-3 같은 IP 동시 제출에서 500 | ADDRESSED | `src/server/access/attempts.ts:75-94`. (나) 행 넣기와 (다) FOR UPDATE 를 `lockRow` 로 묶고, 0행이면 한 번 더 한다. 새 시험 "접근 코드 제출: 같은 IP 의 두 제출이 겹쳐 앞쪽이 행을 지워도 뒤쪽은 wrong · ok 로 처리된다"(`tests/integration/access.test.ts:232-`). 앞쪽 트랜잭션을 손으로 흉내 낸다: 행을 잠근 뒤 `pg_stat_activity` 로 뒤쪽 제출이 잠금을 기다리는 것을 확인하고, 행을 지우고 끝낸다. 이 꼴은 고치기 전 코드에서 `접근 코드 IP 행을 읽지 못했습니다` 로 실패하는 것을 보았다. 처음 짠 `Promise.all` 꼴은 겹침을 만들지 못해 고치기 전에도 통과해서 버렸다 |
| 코드 M-4 폼 응답별 문구 시험 없음 | ADDRESSED | 새 파일 `tests/e2e/access-form.spec.ts`. `page.route` 로 401 · 429 · 503 · 204 를 돌려주고 `route.abort` 로 끊김을 만든다. 시험 여섯: "접근 코드 폼: 틀리면(401) 틀림 문구를 보이고 입력칸을 비운 뒤 초점을 돌린다" · "접근 코드 폼: 잠기면(429) 잠김 문구를 보이고 남은 분을 보이지 않는다" · "접근 코드 폼: 그 밖(503)은 '지금은 들어갈 수 없어요' 문구다" · "접근 코드 폼: 연결이 끊기면 끊김 문구다" · "접근 코드 폼: 맞으면(204) 홈으로 간다" · "접근 코드 폼: 빈 칸(공백만 포함)이면 요청 없이 입력칸에 초점만 둔다" |
| 화면 I1 Chromium 초점 고리 1.5:1 | ADDRESSED | `src/app/(setup)/access/access-code-form.tsx:80` · `:86`. 입력칸 · 버튼에 `focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-neutral-900` 을 달았다. 전역 줄은 그대로다. 사진 `p03b-access-fix1-focus.png` 에서 입력칸 둘레의 굵고 진한 고리가 보인다(WebKit) |
| 화면 M1 테두리 대비 | ADDRESSED | 같은 파일 `:80` `border-neutral-400` → `border-neutral-500` |
| 화면 M2 `required` 말풍선 | ADDRESSED | `required` 를 뺐다. `:25-29` `code.trim()` 이 비면 요청 없이 입력칸에 초점만 둔다(e2e '빈 칸' 시험) |
| 화면 M3 제출 뒤 초점이 body 로 빠짐 | ADDRESSED | `:22` `inputRef`, `:43` 끊김 뒤 · `:60` 204 가 아닌 결과 뒤 `inputRef.current?.focus()`(e2e 401 · 429 · 503 · 끊김 시험이 `toBeFocused` 로 본다) |
| 화면 M4 끊김 문구 출처 주석 | ADDRESSED | `:3` · `:10` '8절' → '7절 네트워크 행' |

## 설계와 다르게 한 것
- 검토 보고의 '선택'은 하지 않았다: `requireAccess` 식별자가 `@/server/access/guard` 에서 가져온 것인지는 보지 않는다. 견본들이 import 줄 없이 짜여 있고 브리프 범위 밖이라서다. 같은 이름의 지역 함수로 피해 갈 수 있는 빈칸은 남는다.
- `export const GET = handler` 처럼 식별자를 담은 변수는 그 식별자를 따라가지 않고 위반으로 센다. 코디네이터 지시('함수 리터럴이 아닌 내보낸 값은 위반')를 따랐다. 지정자 `export { handler as GET }` 는 선언으로 풀어 본다.
- 공개 경로의 서버 액션 차단(M-1)은 `/api/cron/` 에도 같이 걸었다. Cron 은 Vercel 의 GET 이라 next-action 이 없다.
- 화면 사진 둘은 같은 환경 변수 `E2E_ACCESS_SCREENSHOT` 하나로 남긴다. 초점 장면은 그 이름 끝에 `-focus` 를 붙인다(`tests/e2e/smoke.spec.ts` 첫 시험).

## 바뀐 파일
- `tests/unit/access-gate.test.ts`: 훑기(:131-260), 견본(:365-), proxy 사례(:498-501)
- `src/proxy.ts`: :30-37, :52
- `.dependency-cruiser.cjs`: :45, :50
- `tests/unit/dependency-rules.test.ts`: :45-50, :196-217
- `src/server/access/attempts.ts`: :75-94
- `tests/integration/access.test.ts`: 상수 `LOCK_WAIT_TIMEOUT_MS` · `LOCK_POLL_MS`, `waitForLockWaiter`(:130), import `hashIp`, 새 시험(:232-)
- `tests/e2e/access-form.spec.ts`: 새 파일
- `tests/e2e/smoke.spec.ts`: 초점 사진 몇 줄
- `src/app/(setup)/access/access-code-form.tsx`: :3, :10, :12, :22-29, :43, :58-60, :77-86
- 사진: `.superpowers/sdd/2026-10-16-1-가-구현/p03b-access-fix1.png` · `p03b-access-fix1-focus.png`

## 명령 출력(PATH 에 v24.22.0 bin)
| 명령 | 결과 |
|---|---|
| `pnpm exec biome ci --colors=off .` | Checked 56 files. No fixes applied |
| `pnpm build` | Compiled successfully · TypeScript 끝 · `ƒ Proxy (Middleware)`. `tsc --noEmit` 오류 0 |
| `pnpm test` | Test Files 9 passed · Tests 84 passed |
| `pnpm test:int` | Test Files 4 passed · Tests 34 passed |
| `pnpm e2e` | 9 passed(WebKit 10.9형: smoke 3 + access-form 6) |
| `pnpm check:deps` | no dependency violations found (35 modules, 59 dependencies cruised) |
| `pnpm spec:trace` | `… AC 이름 시험 53 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 62`(그대로) |
| `pnpm check:bundle` | 파일 26 · static 11 · 화면 파일 15 · 서버 변수 이름 9 · 대조한 값 0 · 위반 0 |
| 비밀값 grep | `git grep`(추적 파일) 0건, 새 파일 `grep -rnE` 0건 |

## 남은 우려
- 초점 고리 사진은 WebKit 으로만 찍었다. Chromium 에서 대비가 3:1 을 넘는지는 design-reviewer 가 다시 재야 한다(outline 색 neutral-900 은 흰 바탕에서 대략 17:1 로 추정).
- 위 '설계와 다르게 한 것' 첫째의 빈칸(같은 이름 지역 함수)은 남아 있다.
