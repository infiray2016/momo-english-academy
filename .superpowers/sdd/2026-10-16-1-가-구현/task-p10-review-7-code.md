# 검토 브리프: P10 차례 7 코드 검토(code-reviewer rev-p10 이어 보기 · Opus · high, 2026-10-18 05:5x)

가벼운 검토(시험 · 공용 시험 둘 · 작은 정리 — 설정 · 도구 성격, CLAUDE.md 가벼운 루프: 범위 한정 · Minor 는 컨트롤러가 직접). 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p10`, 비교 기준 커밋 df7f6cd(fix 5) — `git diff df7f6cd` 가 이번 몫 전부다. 구현자 보고 `.claude/worktrees/p10/.superpowers/sdd/2026-10-16-1-가-구현/task-p10-report.md` 의 '차례 7' · '차례 7 덧붙임' 절, 브리프 `task-p10-7.md`. 통합 · e2e 는 CI 로만(ci/p10-c5 재생성, PR #1) — 결과는 컨트롤러가 전한다. 코드를 고치지 않는다.

## 볼 것
1. `tests/e2e/child-size.ts` — plan-p10b 값 9 대로인가: `[data-child-screen]` 안 글 20px 이상 · `lang="en"` 조상 24px · button · a · [role=button] · [data-touch] 글자 22px · 상자 56 × 56 · `[data-parent-info]` 제외 · '%' 없음 · 가로 넘침 없음. 기준 수는 파일 위 이름 붙인 상수이고 P5b e2e-local 과 같은 값 · 꼴인가. 예외 표시 `data-size-exempt` 가 plan-p11a 위험 9(지문 안 낱말 단추)에 쓸 수 있는 꼴인가.
2. `tests/e2e/font-size.spec.ts` — AC-N9 이름이 plan-p10b 증명 표 글자 그대로인가, 훑는 화면(접근 코드 · 홈 · 수업 목록 · 지난 수업 · 회화 준비 중 · 배치 시작 · 문항 · 결과 · 세션 틀)이 다 있나, 세로 820 · 가로 1180 둘 다인가. 시험이 거짓 초록이 될 길(요소가 없을 때 그냥 통과 등)이 있나.
3. `tests/e2e/first-run.spec.ts` AC-1b — plan-p10a 증명 표 이름 글자 그대로인가, 'AI 호출 0회' 단언이 ai_calls 를 실제로 세는가, 3단계 복제의 전제가 시험용 시드 사정(C70)과 맞나.
4. 공용 변경 1 · 2 — `tests/unit/learning-day.test.ts`(한 시계 정적 검사가 `src/app/**` 가운데 'use client' 아닌 파일까지) · `tests/unit/access-gate.test.ts`(첫 문장 `requireAccess` 는 `@/server/access/guard` 에서 + 같은 이름 지역 함수 견본). 거짓 양성(정당한 파일을 잡음) · 거짓 음성(우회를 놓침) 가능성과 변이 확인이 보고에 있나.
5. `src/server/db/safe-error.ts` `isUniqueViolation`(`CAUSE_CHAIN_DEPTH` · `PG_UNIQUE_VIOLATION`) + profile · session · placement 서버의 호출 바꿈 + 단위 시험 — 세 곳의 옛 동작(원인 사슬 깊이 · 코드 비교)과 같은가, `dbErrorTag` 깊이 상수 이름 바꿈이 다른 호출자를 깨지 않나, 오류 글에 아이 이름 · 입력이 안 들어가나(장부 '서버 액션 · 서버 함수의 DB 오류' 규칙).
6. 보고의 숫자 — 단위 366 → 367, check:ids design-number 0(P10 트리 기준), 비밀값 · 아이 이름 grep 0, missing-test 가운데 P10 몫은 AC-6a 하나(P11 로 옮김)인지.

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/review-p10-7-code.md` — 판정(Approved · Changes requested) · 지적마다 심각도(Critical · Important · Minor)와 근거(파일 · 줄 · plan 절 · 정본 절). 근거 없는 지적은 넣지 않는다. Minor 는 목록만(컨트롤러가 직접 처리). 끝나면 SendMessage(team-lead) 한 줄.
