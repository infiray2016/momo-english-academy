# 검토 브리프: 회화 plan 묶음 14-가 — 관찰 쪽 '단원 바로 가기' 단계 고르기 · 새 회차 열기(code-reviewer · Opus · high, 가벼운 루프 · 범위 한정, 2026-11-05 20:4x)

## 맥락
- plan `intent/2026-10-29-회화-수업을-대화로/plan.md` 정한 것 21(62줄): 새 개정 카드는 그 개정으로 시작한 회차에서만 보이므로 관찰 쪽 '단원 바로 가기'에 단계 고르기 · '그 단원 새 회차로 열기'(시작 개정 = 지금 최신)를 더한다(관찰 쪽 전용, 운영 빌드에 없음). 구현 브리프 `task-talk-14a.md`, 구현 보고 `task-talk-14a-report.md`(끝 '보탬' 절 포함).
- 왜 지금: 첫 프리뷰가 20:33 에 떠 있고, 요청자가 회화 3단계 단원 1(카드 두 장 개정 3)을 열려면 이 도구가 필요하다. Approved 면 컨트롤러가 커밋 · push 해 재배포한다(요청자 승인 범위 T-117).
- 지키는 설계: 운영 배포(VERCEL_ENV=production)면 아무것도 쓰지 않음(`previewToolsAllowed`), 단원 들기 복사본 · 사건은 `unitEntryOf` 재사용, 아이 이름 · 오류 글 로그 없음, 설계 숫자 설정값. 설정 · 도구 성격이라 검토 한 번 · 범위 한정, Minor 는 컨트롤러가 직접.

## 보는 것
패치 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/diff-14a.patch`(HEAD 87b102d 위 미커밋 전부 = 이 묶음만, 파일 여덟 + session/index.ts 한 줄).
1. 새 회차 규칙이 5절 · 학습 스키마(unit_progress: round · start_revision · settings_snapshot)와 맞는지 — round = 마지막 + 1, start_revision = currentSeedRevision, 복사본 unitEntryOf 그대로, 사건(progress_events) oldValue · source preview_jump. 한 트랜잭션 · for update.
2. 새 회차를 연 뒤 세션 시작 · 수업 목록 · 홈 · 회화 상태가 최신 회차를 읽는지 — 보고 '읽는 회차' 절의 코드 줄(session 661 · home 99 · lesson-list 336 의 JS 내림차순, session 1522 의 orderBy 보탬, conversation/state.ts 721~730)을 직접 대조. 진행 중 세션(옛 회차 개정)이 깨지지 않는지. 열린 옛 회차의 상태(진행 → ?)를 건드리지 않는 것이 맞는지(단원 통과 · 이음매 셈에 영향 없는지, 02-1 · 02-3).
3. 입력 검사: level · unit 이 `isUnitOf` 로, newRound boolean, 꼴 틀린 입력은 invalid, 운영 refused. 액션은 그대로 넘김.
4. 화면: 단계 고르기(1~12) · 단추 둘 · 결과 줄(영역 · 단계 · 단원 · 회차 · 시작 개정 · 새로 열었는지) · 한국어 해요체 · 자료 없는 단원 안내 한 줄. `page.preview.tsx` · `probe-text.ts` 변경이 최소인지.
5. 시험: 단위 `teacher-probe.test.ts`(새 4건) 가 실제로 단언하는지, 통합 `teacher.test.ts`(level 3 · newRound 참 · 거짓 · refused · 보탬 478줄)가 함수를 실제로 부르는지(정적 — 이 Mac 에서 통합 못 돌림), e2e `teacher-choice.spec.ts` 최소 맞춤이 그 시험의 뜻을 잃지 않는지.
6. 관문: biome ci · tsc · 단위 1785 — 보고 수치 대조(출력은 스크래치패드).

## 하지 않을 것
코드 고치기 · 개발 DB 쓰기 · 커밋 · push · 통합 · e2e 실행 · 환경 파일 값 출력. 세션 cd 금지(서브셸 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )`).

## 보고
`task-talk-14a-review.md`: 판정(Approved · Changes requested) 첫 줄, Critical · Important · Minor 표(근거: 파일 · 줄 · 정본 절), 넘길 것. 답은 요지 다섯 줄 안.
