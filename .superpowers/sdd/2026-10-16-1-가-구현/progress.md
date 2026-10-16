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
| 10-16 11:5x | plan-p01a 완료 보고 절 채움(상태 in-progress, 작업 8 대기). 요청자에게 커밋 지시 요청(브랜치 feature/1a-p01a-skeleton). 다음: 커밋 → H15 GitHub 원격 · push → P1b 브리프 `task-p01b.md` | 요청자 지시 11:5x → 커밋 b0b6a46(feature/1a-p01a-skeleton), plan-p01a done |
| 10-16 11:5x | 브랜치 `feature/1a-p01b-quality-gates`(b0b6a46 에서), 구현 브리프 `task-p01b.md` → implementer impl-p01b(Opus · high). 보고 `task-p01b-report.md` → code-reviewer → fix ≤3 → 작업 6 훅 실기 확인(컨트롤러) → 요청자 커밋 | 구현 끝 12:1x(DONE_WITH_CONCERNS, 시험 37 · lint 0 · deps 0 · spec-trace missing 66 · bundle 0). 컨트롤러 재확인 같음, Node 26(x64)에서는 관문이 막음(우려 1 재현) |
| 10-16 12:2x | 구현자 우려 넷 결정(컨트롤러): A 관문을 `.mts` 로 + `.nvmrc` 판의 nvm Node 를 하위 명령 PATH 앞에(우려 1 · 2) · B 명령 상한 120초(우려 3) · C spec-trace 는 이름의 모든 AC 토큰(우려 4). 다름 1~5 는 검토자 판정. 검토 브리프 `task-p01b-review.md` → code-reviewer rev-p01b(Opus · xhigh), 보고 `review-p01b.md` | 끝 13:2x: Changes requested(C 0 · I 4 · M 7). I: 결정 A 의 arch 기준이 이 Mac 에서 x64 v24.16.0 을 고름 · `.mts` 가져오기는 `.mjs` 꼴이어야 빌드 통과 · 상한 240×2 > 300 · 막을 때 stdout 빈 채 'no such file' 이면 Claude Code 가 막음을 풂 |
| 10-16 13:3x | 지적 1~11 모두 수용(1 은 방법 바꿈: `.nvmrc` 접두의 가장 높은 설치 판, 아키텍처 탐침 없음 · 5 는 결정 C 를 이름 앞 토큰으로 좁힘 · 8 `\|\| exit 2`). fix 브리프 `task-p01b-fix1.md` → impl-p01b 이어 부름. plan-p01b `.ts` → `.mts` · command · '정할 것' 끝 fix 1 결정 문단 | 진행 |
| 10-16 13:4x | 요청자 "개발환경 구성하는데 왜이렇게 오래걸려?" → 원인(P1 약 4시간) → 제안 넷 승인(C52): 설정 · 도구 작업은 가벼운 루프, P1b 는 fix 1 뒤 컨트롤러 확인으로 커밋(정식 재검토 · 따로 띄우는 실기 확인 생략, 실기는 P3 구현자 실행으로), P1c 뒤로, P1b 커밋 직후 P2 ∥ P3 ∥ P4 | 반영: 13절 C52 · 묶음 plan(작업 3 · P1c 행 · 루프 문단) · plan-p01b 작업 6 · 7 · CLAUDE.md |
| 10-16 14:1x | impl-p01b fix 1 DONE(13:46, 지적 11 ADDRESSED, 시험 49, 중간 TS2769 빌드 깨짐 고침). 컨트롤러 확인(C52, 재검토 생략): 전체 명령 0 · 관문 x64 Node 26 셸 흉내 0(bin v24.22.0) · ENOENT 시험 2(stdout 1줄) · 지운 뒤 0. plan-p01b 완료 보고 채움(in-progress). 요청자에게 커밋 지시 요청 | 커밋 대기 |
