판정: Approved (C 0 · I 0 · M 2)

# 재검토: P3b fix 1 — 코드(code-reviewer · Opus · xhigh, 읽기 전용, 범위 한정)

대상은 같은 워크트리(`feature/1a-p03b-access`)에서 fix 1 이 고친 줄이다. 기준은 `review-p03b.md` 의 '고치는 법', plan-p03b 값 5 · 공용 변경 6, fix 1 보고다.

검토자가 직접 돌린 것.
- `pnpm test`: 84 통과.
- `pnpm test:int`: 34 통과.
- `pnpm check:deps`: 위반 0(35 modules · 59 dependencies). 지금 코드에서 `reachable` 규칙의 거짓 양성이 없다.
- `playwright test access-form.spec.ts smoke.spec.ts --repeat-each=10`: 90 통과(WebKit 10.9형). 반복해도 흔들림이 없다.
- `git status` · `git diff --stat 25041d9`: 허용 파일 밖 변화 0, P3a 파일 변화 0, 접속 문자열 꼴 비밀값 0.

## 지적 다섯
| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 훑기가 내보내기 꼴 둘을 건너뜀 | ADDRESSED | tests/unit/access-gate.test.ts:138-224. `exportedFunctions` 가 `export { a, b as GET }` 를 같은 파일의 함수 선언 · 함수 리터럴 변수로 풀고, `export default 식별자` 도 푼다. 함수 리터럴이 아닌 값 · 다른 파일 다시 내보내기 · `export *` 는 fn null 이라 위반(닫힌 쪽)이다. 견본(:357-379)이 실제로 잡는 것: 이름 바꾼 GET · `PUT = handler` · `DELETE = withLog(…)` · `PATCH = guarded`(식별자 값은 따라가지 않음, 보고의 '다르게 한 것' 둘째대로) · `save` · `removeItem` · `wrapped` · 다른 파일의 `other`. 정상 꼴은 잘못 잡지 않는다: `export async function good`(:325), 지정자로 푼 `ok` · `guarded as POST`, route.ts 의 `export const dynamic` 은 메서드 이름이 아니라 건너뛴다(:279) |
| M-1 공개 경로의 서버 액션 POST | ADDRESSED | src/proxy.ts:30-37 은 `next-action` 머리글이 있으면 공개 경로 · Cron 접두에서도 넘기지 않는다. :52 의 페이지 판정도 같은 값을 쓴다. 사례 셋은 access-gate.test.ts:496-500 에 있다. `/access/submit` 의 정상 POST(머리글 없음)는 기존 시험 "AC-N5 proxy: /access · /access/submit · /api/cron/ 은 쿠키 없이 넘긴다"가 그대로 통과해 막히지 않는다. 쿠키가 유효하면 공개 경로에서도 next() 다 |
| M-2 proxy-stays-light 직접만 봄 | ADDRESSED | .dependency-cruiser.cjs:50 `reachable: true`. 견본 src/proxy.ts → src/server/relay.ts → src/server/db/index.ts(tests/unit/dependency-rules.test.ts:45-50)를 새 시험 "의존 규칙: src/proxy.ts 가 한 단계 건너(src/server/relay → src/server/db) DB 를 끌어와도 proxy-stays-light 위반"(:208-217)이 잡는다. 건너는 모듈 relay 자체는 막는 대상이 아님도 단언한다. 기존 막는 예 시험은 대상 이름으로 보게 바뀌었고 뜻은 같다 |
| M-3 동시 제출 0행 → 500 | ADDRESSED | src/server/access/attempts.ts:75-94 는 (나) 넣기 · (다) FOR UPDATE 를 `lockRow` 로 묶고, 0행이면 한 번 더 한다. 다시 넣은 행은 failed_count 0 이고 이는 앞쪽의 성공이 실패 수를 지운 결과와 같다. (가) 는 한 번, (라)~(바) 는 그대로라 plan 값 3 을 어기지 않는다. 새 시험 "접근 코드 제출: 같은 IP 의 두 제출이 겹쳐 앞쪽이 행을 지워도 뒤쪽은 wrong · ok 로 처리된다"(tests/integration/access.test.ts:232-265)는 손으로 행을 FOR UPDATE 로 잡는다. 이어 `pg_stat_activity` 로 뒤쪽이 잠금을 기다리는 것을 확인한 뒤 지운다. 그래서 고치기 전 코드의 `:90` 에서 던지는 길을 실제로 지난다(보고의 '고치기 전 실패'와 맞는 구조) |
| M-4 폼 응답별 문구 시험 없음 | ADDRESSED | 새 tests/e2e/access-form.spec.ts 여섯. `page.route` 로 401 · 429 · 503 · 204 를, `route.abort` 로 끊김을 만들어 DB 없이 돈다. 단언 범위: 문구 넷이 C57 · 7절 그대로, 401 의 입력칸 비움, 204 의 주소 `/` 이동과 요청 한 번, 빈 칸 · 공백만일 때 요청 0 · 안내 빈 줄 · 초점(:88-104). 폼 고침(access-code-form.tsx:25-29 빈 칸 처리, :43 · :60 초점 복귀)은 제출 본문 · 응답 갈래를 바꾸지 않는다. 서버는 여전히 앞뒤 공백을 다듬고 실패를 센다 |

## 새 지적(고친 줄에서 생긴 것)

### N-1 Minor — 훑기가 'use server' 파일의 형만 내보내기(`export type { … }`)를 위반으로 센다
- 위치: tests/unit/access-gate.test.ts:204-217(`ts.isExportDeclaration` 갈래).
- 무엇이: 아래 두 꼴은 함수 본문으로 풀리지 않아 fn 이 null 이 된다. 그래서 '파일 지시 'use server'(함수 본문을 따라가지 못함)' 위반이 난다.
  - `export type { FormState } from "./types"` 와 `export { type FormState }`.
  - 같은 파일의 `type FormState = …; export type { FormState };`.
- 근거: 형은 컴파일 때 지워져 서버 액션이 아니다. `export type X = …` 와 `export interface` 는 이미 건너뛴다(형 선언이라 이 갈래에 오지 않음). 닫힌 쪽 거짓 양성이라 보안 빈칸은 아니지만, 서버 액션 파일에서 흔한 꼴을 막는다. 시험 이름의 '모든 'use server' 함수'와도 범위가 어긋난다.
- 고치는 법: `statement.isTypeOnly || element.isTypeOnly` 면 건너뛰고, 견본에 형만 내보내기 한 줄을 더한다.

### N-2 Minor — 겹침 시험이 연결 셋을 동시에 써서 POOL_MAX 3 에 몰래 기댄다
- 위치: tests/integration/access.test.ts:253-262(앞쪽 `client.begin` · 뒤쪽 `submit` 의 트랜잭션 · `waitForLockWaiter` 의 조회).
- 무엇이: 세 연결 모두 같은 `testDb.db.$client` 를 쓴다. 이 풀의 상한은 `createDb` 기본값 `POOL_MAX`(3)다(src/server/db/index.ts). 그래서 상한을 1~2 로 낮추면 뒤쪽이나 조회가 연결을 기다리며 서로 막는다. 그 결과 시험이 30초 상한으로 실패하고, 메시지('행 잠금을 기다리는 제출이 보이지 않는다' 또는 시간 초과)가 원인을 가리키지 않는다.
- 근거: P3a plan 위험 2 · 값 5 에서 `POOL_MAX` 는 서버리스 연결 수를 위해 조정할 수 있는 기술 값이다. 시험이 그 값에 숨은 하한을 건다.
- 고치는 법: 앞쪽 트랜잭션과 잠금 대기 조회에 `postgres(testDb.url, { max: 1 })` 같은 따로 된 연결을 쓰고 끝에서 닫는다.

## 메모(지적 아님)
- `requireAccess` 식별자 출처 확인(구현자가 범위 밖으로 둠). 지금 남은 빈칸은 같은 파일에 `requireAccess` 라는 이름의 지역 함수를 두면 훑기를 지난다는 것뿐이다. 이는 실수보다는 일부러 피하는 꼴이고, 코드 검토가 잡을 수 있다. 서버 액션을 처음 만드는 하위 plan(P10)에서 '가져온 곳이 `@/server/access/guard` 인지'를 훑기에 더할지 정하면 된다.
- 204 시험(access-form.spec.ts:80-86)은 `submitWith` 가 클릭 직후 돌려준 호출 수(값 복사)를 단언한다. Playwright 의 클릭이 시작된 이동을 기다려 지금은 늘 1 이다(반복 10회 통과). 다만 빈 칸 시험처럼 닫힌 변수를 끝에서 읽는 꼴이 더 단단하다.

## 3. 이름 · 범위
- 증명 표 시험 이름은 그대로다. M-1 사례와 I-1 견본은 기존 시험 안에 더했다. 새 시험(겹침 · 한 단계 건너 의존 · 폼 여섯)에는 AC 접두가 없다. spec-trace missing-test 는 62 그대로다(컨트롤러 재확인).
- 허용 파일 밖 변화 0, P3a 파일 변화 0, 비밀값 0(시험의 견본 코드 `SampleCode0000` 은 흉내 끝점용 가짜다).

## 라운드 판정
Approved. 지적 다섯이 모두 ADDRESSED 이고, 고친 줄에서 새로 생긴 것은 Minor 둘(N-1 거짓 양성 · N-2 시험의 숨은 풀 하한)이다. 둘 다 시험 파일 몇 줄이라 컨트롤러가 직접 고치거나 P10 브리프로 넘겨도 된다.
