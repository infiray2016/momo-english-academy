# 1-가 구현 장부

묶음 plan: `intent/2026-10-15-모모-잉글리시-아카데미/plan.md`(approved 요청자 2026-10-16 09:3x, 커밋 575cf59). 하위 plan 은 같은 폴더의 `plan-pNN-<이름>.md`(컨트롤러 승인, 요청자는 PR 때).
파일 규칙: 브리프 `task-*.md` · 보고 `task-*-report.md` · 검토 `review-*.md` · 열린 지적 `ledger-open.md` · 닫힌 지적 `ledger-closed.md`. 비밀값 · 아이 이름은 적지 않는다.

| 때 | 일 | 상태 |
|---|---|---|
| 10-16 09:4x | P1(뼈대 · 품질 관문) 하위 plan 작성 브리프 `task-p01-plan.md` → 계획자(general-purpose · Opus · xhigh) | 끝 10:2x(보고 `task-p01-plan-report.md`) |
| 10-16 10:2x | 계획자 보고: P1 을 P1a(파일 9 · 작업 8) · P1b(파일 10 · 작업 7)로 나눔. 확인한 사실 47 · 추측 15 · 묶음 plan 과 다르게 한 것 18 | 끝 |
| 10-16 10:3x | 컨트롤러 검토 · 승인(P1a · P1b approved). 정할 것 열하나 → 13절 C51. 묶음 plan 에 P1c · H15 행. 도구 준비는 컨트롤러가 함: nvm Node v24.22.0(기본 26.8.2 그대로), 그 Node 에 pnpm 10.34.7 | 끝 |
| 10-16 10:3x | 브랜치 `feature/1a-p01a-skeleton`(main 에서), 구현 브리프 `task-p01a.md` → implementer(Opus · high). 보고 `task-p01a-report.md` → code-reviewer(Opus · xhigh) `review-p01a.md` → fix ≤3 → 요청자 커밋 · H15 push · PR | 구현 끝 11:2x(DONE_WITH_CONCERNS, 보고 `task-p01a-report.md`). 컨트롤러 재확인: lint 0 · test 2 · int 0 · build 성공 · 판 표 일치 |
| 10-16 11:2x | 구현자 우려 넷 결정(컨트롤러): 가 `turbopack.root` 저장소 뿌리 · 나 `vitest.config.mts` 로 이름 바꿈 · 다 Geist 글꼴 제거(빌드가 Google Fonts 에 안 닿게) · 라 `.claude` 는 Biome 범위에 둠. 검토 브리프 `task-p01a-review.md` → code-reviewer rev-p01a(Opus · xhigh), 보고 `review-p01a.md` | 끝 11:3x: Changes requested, C 0 · I 2 · M 4, plan 값 13 중 ✓ 11 · 다름 2 |
| 10-16 11:3x | 검토 지적 1~6 모두 받아들임(Geist 제거 + globals.css 9줄 · settings.local.json 무시 · turbopack.root import.meta.dirname · vitest.config.mts · e2e innerWidth 단언 · 견본 주석 값 검사). fix 1 브리프 `task-p01a-fix1.md` → impl-p01a 이어 부름. plan-p01a · 묶음 plan 의 파일 이름 · next.config 블록을 컨트롤러가 맞춤 | fix 1 끝 11:5x(DONE, 1~6 ADDRESSED, 보고 '## fix 라운드 1'). 컨트롤러 재확인: lint 0 · test 2 · build 경고 0 · vitest.config.ts 없음 |
| 10-16 11:5x | rev-p01a 에게 범위 한정 재검토(지적 1~6 ADDRESSED · NOT ADDRESSED, e2e 포함) 요청 → `review-p01a.md` '## 재검토 1' | 끝 11:5x: Approved, 1~6 ADDRESSED, 새 지적 0, e2e 1 통과 |
| 10-16 11:5x | plan-p01a 완료 보고 절 채움(상태 in-progress, 작업 8 대기). 요청자에게 커밋 지시 요청(브랜치 feature/1a-p01a-skeleton). 다음: 커밋 → H15 GitHub 원격 · push → P1b 브리프 `task-p01b.md` | 요청자 대기 |
