# fix 1 브리프: P3b 접근 제어(implementer impl-p03a · Opus · high, 같은 워크트리)

검토 둘 — 코드 `review-p03b.md`(rev-p03a-a1, Changes requested C 0 · I 1 · M 4)와 화면 `review-p03b-design.md`(drev-p03b, Changes requested C 0 · I 1 · M 4) — 의 지적 가운데 아홉을 고친다. 두 보고의 '고치는 법'을 그대로 따른다(자리 · 근거는 보고에 있다). 컨트롤러 결정은 메인 저장소 plan-p03b 의 '검토 뒤(21:5x)' 문단과 값 5 · 8, 공용 변경 6 에 있다: `/Users/hikaru/workspace/momo-english-academy/intent/2026-10-15-모모-잉글리시-아카데미/plan-p03b-접근-제어.md`(워크트리 사본은 옛 판).

## 작업 폴더 · 명령
- 지금 있는 격리 워크트리(브랜치 `feature/1a-p03b-access`). git 쓰기 금지. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴.
- 허용 파일: `tests/unit/access-gate.test.ts`(I-1 · M-1 사례) · `src/proxy.ts`(M-1) · `.dependency-cruiser.cjs` + `tests/unit/dependency-rules.test.ts`(M-2) · `src/server/access/attempts.ts` + `tests/integration/access.test.ts`(M-3) · `tests/e2e/smoke.spec.ts` 또는 새 `tests/e2e/access-form.spec.ts`(M-4) · `src/app/(setup)/access/access-code-form.tsx`(I1 · M1 · M2 · M3 · 주석 M4) · 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p03b-fix1-report.md` · 새 화면 사진 `.superpowers/sdd/2026-10-16-1-가-구현/p03b-access-fix1.png`(초점이 입력칸에 있는 장면 하나 더: `p03b-access-fix1-focus.png`). 그 밖은 손대지 않는다. 증명 표 시험 이름은 그대로, 새 시험에 AC 접두 없음(AC-N5 · AC-1a 는 이미 있는 것만).

## 코드 지적(`review-p03b.md`)
1. **I-1 Important**(함수 안 확인 훑기 시험). `export { handler as GET }` 와 `export const GET = handler` 처럼 이름을 바꿔 내보내거나 변수에 담은 처리기 · 서버 액션을 훑기가 건너뛰어 조용히 통과한다. 구문 트리 훑기가 그 꼴들의 실제 함수 본문(선언 · 변수에 담긴 함수 · 화살표 함수 · 다시 내보내기)을 따라가 첫 문장을 확인하게 고치고, 빠뜨린 견본에 두 꼴을 더해 잡히는지 시험한다(보고 '고치는 법' 그대로).
2. **M-1**(`src/proxy.ts`, 값 5 보완). 공개 경로(`/access` · `/access/submit`)라도 `next-action` 머리글이 있는 POST 는 401 로 둔다(깊이 방어). proxy 시험에 사례 하나.
3. **M-2**(`.dependency-cruiser.cjs` `proxy-stays-light`). `to` 에 `reachable: true` 를 두어 시계 모듈을 거쳐 DB · 설정 · argon2 가 끌려 오는 것도 막는다(설치판 18.6.0 이 받는다). 의존 규칙 시험 견본에 한 단계 건너 가져오는 예(proxy → clock → settings 꼴)를 더한다. 규칙이 지금 코드에서 위반 0 인지 `pnpm check:deps` 로 본다.
4. **M-3**(`attempts.ts`). 같은 IP 의 두 제출이 겹쳐 앞쪽이 맞아 행을 지우면 뒤쪽의 FOR UPDATE 가 0행을 받아 500 이 된다. 0행이면 (나) 행 넣기 · (다) FOR UPDATE 를 한 번 더 한다(그 사이 지워진 행은 새로 넣는다). 통합 시험 사례 하나(행이 없을 때 제출이 wrong · ok 로 정상 처리됨).
5. **M-4**(폼 응답별 문구 e2e). Playwright `page.route("**/access/submit", …)` 로 401 · 429 · 503 · 204 를 돌려주고 `route.abort()` 로 끊김을 만들어, `role="status"` 문구(C57 넷 + 끊김) · 입력칸 비움(401) · 주소 이동(204) 을 단언한다. DB 없이 된다. 시험 이름에 AC 접두는 붙이지 않는다.

## 화면 지적(`review-p03b-design.md`)
6. **I1 Important**(`access-code-form.tsx` 입력칸 · 버튼). 전역 `outline-ring/50` 때문에 Chromium 에서 초점 고리가 1.5:1 이다. 둘에 `focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-neutral-900` 같은 진한 실선 고리를 단다(전역 줄은 그대로).
7. **M1** 입력칸 테두리를 `border-neutral-500`(약 4.7:1) 이상으로.
8. **M2** `required` 를 빼고, 제출 첫머리에서 `code.trim()` 이 비면 요청 없이 입력칸에 초점만 두고 돌아간다(새 문구 없음).
9. **M3** 입력칸에 ref 를 달고 204 가 아닌 모든 결과 뒤 `inputRef.current?.focus()`.
10. **M4(주석만)** 끊김 문구 출처 주석 '8절' → '7절 네트워크 행'(정본 4절 · C57 은 컨트롤러가 고쳤다).

## 끝나면
`pnpm exec biome ci --colors=off .` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm e2e` · `pnpm check:deps` · `pnpm spec:trace`(missing-test 62 그대로) · `pnpm check:bundle` · 비밀값 grep 0. 새 화면 사진 둘(기본 · 입력칸 초점, `E2E_ACCESS_SCREENSHOT`). 보고 `task-p03b-fix1-report.md`: 지적 열마다 ADDRESSED(파일:줄 · 시험 이름) · 설계와 다르게 한 것 · 바뀐 파일:줄 · 명령 출력(시험 수 · e2e 수). 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED.
