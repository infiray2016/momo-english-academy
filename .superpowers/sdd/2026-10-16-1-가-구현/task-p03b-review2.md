# 재검토 브리프: P3b fix 1 — 코드(code-reviewer rev-p03a-a1 · Opus · xhigh, 읽기 전용, 범위 한정)

`review-p03b.md`(C 0 · I 1 · M 4)의 지적 다섯을 impl-p03a 가 fix 1 로 고쳤다. 지적마다 ADDRESSED · NOT ADDRESSED 를 가르고, 고친 줄에서 새로 생긴 결함만 본다. 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p03b-2.md`(메인 저장소).

## 대상
- 같은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a4f928c00fc43a1e8`(브랜치 `feature/1a-p03b-access`). fix 1 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p03b-fix1-report.md`(지적별 자리 · 시험).
- 바뀐 곳(보고 기준): `tests/unit/access-gate.test.ts`(I-1 훑기 — 지정자 내보내기를 선언으로 풀기, 함수 리터럴 아닌 값 · 다른 파일 다시 내보내기 · `export *` 는 위반, 견본 둘), `src/proxy.ts`(M-1 next-action 머리글이면 공개 경로도 401), `.dependency-cruiser.cjs` + `tests/unit/dependency-rules.test.ts`(M-2 `reachable: true`, proxy → relay → db 견본), `src/server/access/attempts.ts` + `tests/integration/access.test.ts`(M-3 0행이면 다시 넣고 한 번 더 — 손으로 행을 잠근 트랜잭션으로 겹침을 만든 시험), 새 `tests/e2e/access-form.spec.ts`(M-4 여섯), `src/app/(setup)/access/access-code-form.tsx`(화면 I1 · M1~M4 — 코드 몫은 `required` 제거 뒤 빈 값 처리와 초점 복귀가 제출 흐름을 바꾸지 않는지만).
- 기준: 메인 저장소 plan-p03b 의 '검토 뒤(21:5x)' 문단 · 값 5 · 공용 변경 6, `review-p03b.md` 의 '고치는 법'. 컨트롤러 재확인(21:5x): biome 0 · 단위 84 · 통합 34 · e2e 9 · deps 0 · spec 62 · build · bundle 0 · 비밀값 0. 시험은 `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm test` · `pnpm test:int` · `pnpm e2e`.

## 판정할 것
1. I-1 · M-1 · M-2 · M-3 · M-4 각각 ADDRESSED · NOT ADDRESSED(근거: 파일:줄 · 시험 이름). I-1 은 두 꼴의 견본이 실제로 잡히는지와 '함수 리터럴이 아닌 값은 위반(닫힌 쪽)' 이 정상 꼴(`export async function` · `export const x = async () =>`)을 잘못 잡지 않는지, 구현자가 범위 밖으로 둔 선택 항목(`requireAccess` 식별자가 guard 에서 가져온 것인지 확인)이 지금 남은 빈칸으로 적을 만한지(지적이 아니라 메모).
2. 고친 줄의 새 결함: M-1 이 `/access/submit` 의 정상 POST(next-action 없음)를 막지 않는지, M-2 의 `reachable` 규칙이 지금 코드에서 거짓 양성 없이 0 인지와 견본이 맞는지, M-3 의 다시 넣기가 잠금 · 셈 규칙(plan 값 3 (가)~(바))을 어기지 않는지와 겹침 시험이 고치기 전 코드에서 실패했다는 보고가 맞는지, M-4 e2e 가 `page.route` 로 DB 없이 돌고 문구 · 입력칸 비움 · 주소 이동 · 빈 칸 요청 없음을 단언하는지.
3. 기존 시험 이름 그대로(증명 표), 새 시험에 AC 접두 없음, 허용 파일 밖 변화 0, P3a 파일 변화 0, 비밀값 0.

## 보고 꼴(`review-p03b-2.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n). 표 하나: 지적 다섯마다 ADDRESSED · NOT ADDRESSED 와 근거. 새 지적은 번호 · 심각도 · 파일:줄 · 근거 · 고치는 법. 마지막 메시지 첫 줄은 판정, 그 뒤 요지 6줄 안쪽.
