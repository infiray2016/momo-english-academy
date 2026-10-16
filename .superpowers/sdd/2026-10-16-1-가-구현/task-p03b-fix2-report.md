# fix 2 보고: P3b 접근 제어(재검토 `review-p03b-2.md` N-1 · N-2)

허용 파일 두 개와 이 보고만 고쳤다. git 쓰기 명령은 쓰지 않았다.

## 지적별
| 지적 | 판정 | 파일:줄 · 시험 |
|---|---|---|
| N-1 'use server' 파일의 `export type { … }` 를 위반으로 셈(거짓 양성) | ADDRESSED | `tests/unit/access-gate.test.ts:209-210`: `statement.isTypeOnly` 인 내보내기 선언(`export type { … }`, `export type { … } from …`)을 건너뛴다. `:219`: 지정자 하나가 형 전용(`export { type Bar, ok }`)이면 그 지정자만 건너뛴다. 견본 `:400-409` 에 `export type { Foo }` · `export { type Bar, ok }` · `export type { Baz } from "./types"` 가 든 'use server' 파일을 두고 위반 0 을 단언한다. 시험은 "AC-N5 함수 안 확인: 첫 문장을 빠뜨린 견본(파일 지시 · 함수 안 지시 · route.ts)을 잡는다" 안에 있고 이름은 그대로다 |
| N-2 겹침 시험이 풀 연결 셋을 동시에 써서 POOL_MAX 에 숨은 하한을 둠 | ADDRESSED | `tests/integration/access.test.ts:6`(import `postgres`) · `:236-271`. 손으로 잠그는 트랜잭션은 풀 밖의 따로 된 연결 `postgres(testDb.url, { max: 1, onnotice })` 로 열고, `finally` 에서 `client.end()`(:270) 로 닫는다. 이제 시험 풀은 뒤쪽 제출과 잠금 대기 확인에 연결 둘만 쓴다. 시험 뜻과 이름("접근 코드 제출: 같은 IP 의 두 제출이 겹쳐 앞쪽이 행을 지워도 뒤쪽은 wrong · ok 로 처리된다")은 그대로다 |

## 명령 출력(PATH 에 v24.22.0 bin)
| 명령 | 결과 |
|---|---|
| `pnpm exec biome ci --colors=off .` | Checked 56 files. No fixes applied |
| `pnpm test` | Test Files 9 passed · Tests 84 passed |
| `pnpm test:int` | Test Files 4 passed · Tests 34 passed |
| `pnpm check:deps` | no dependency violations found (35 modules, 59 dependencies cruised) |
