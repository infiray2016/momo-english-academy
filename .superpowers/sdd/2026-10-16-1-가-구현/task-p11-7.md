# 구현 브리프: P11b 차례 7 — 둘째 세션(첨삭 보기 · 고쳐 쓰기 · 모범 답안) · 목록 · 홈 · 밀린 첨삭(implementer impl-p11b 이어 보기 · Opus · high, 2026-10-22 16:3x — 차례 6 검토 B2 뒤 보냄)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p11b-쓰기-AI-첨삭.md` **작업 3(차례 7)** 이 요구사항 전부다 — 값 9(세션 서버 둘째 세션 · 대기 · 되살림 · 늦은 초고, `startLesson` 이 첨삭 대기면 한 번 더) · 값 11(writing-rewrite) · 값 12(홈 '첨삭이 왔어요' · 최근 성적에서 점수 없는 세션 · 둘째 세션 빼기 · 밀린 첨삭 `after()`) · 목록 '첨삭 보기'(여기부터 해요 차례 둘째) · '아직 글을 살펴보고 있어요' · 정본 밖 문구 표 · 정할 것 판정. 워크트리 p11(차례 6 커밋 위). 통합 · e2e 는 CI. 시험 먼저. 커밋은 하지 않는다.

## 범위(plan-p11b 작업 3)
`tests/unit/lesson-list-state.test.ts` · `tests/integration/session-start.test.ts`(둘째 세션 · 대기 · 못 함 뒤 새 초고 · 되살림 · 늦은 초고) → `src/core/lesson-list/state.ts` · 목록 서버(`writingDrafts` · `feedbackReady`) · 세션 서버(둘째 세션 · 대기 · 되살림 · 늦은 초고 받기) · `src/server/actions/session.ts`(`startLesson` 대기면 한 번 더) · 쓰기 서버(고쳐 쓰기 `submitRewrite` · 밀린 첨삭) · `src/components/session/writing-rewrite.tsx`(칭찬 1 → 교정 하나씩(원문 · 수정 · 이유) → 고쳐 쓰기 1회(초고를 채워 둔 입력란) → 10~12단계 모범 답안(고쳐 쓰기 뒤에만)) · 목록 화면(`lesson-board.tsx` · `use-lesson-start.ts` — '첨삭 보기' 시작 · '아직 글을 살펴보고 있어요' · 안전 상한 안내 · 대기열 비우기) · 홈 서버 · 홈 화면(`page.tsx` 밀린 첨삭 `after()` · `home-cards.tsx` '첨삭이 왔어요' 포스트잇) → e2e `writing.spec.ts`(AC-4c 둘째 세션 · AC-2e) · `home.spec.ts`(AC-2a '첨삭이 왔어요'). 사진: plan-p11a '화면을 보는 차례' 7 행(첨삭 보기 → 고쳐 쓰기 → 모범 답안 · 홈 '첨삭이 왔어요').

## 지킬 것
피드백 한도(정본 3.3): 6~9단계 교정 최대 2 · 10~12단계 3 + 모범 답안은 고쳐 쓰기 뒤에만. 한 화면에 하나(교정 하나씩). `{NAME}` 채움은 차례 5 함수. 차례 6 의 '첨삭 보기 = 새 첫 세션' 임시 길을 이번에 둘째 세션 판정으로 바꾼다(구현자 정할 것 2). P13(회화)이 `src/server/session/index.ts` · `lesson-list` · `page.tsx` · `home-cards.tsx` · `home/index.ts` · `home.spec.ts` 를 몇 줄 고치므로(plan-p13a '바탕 가지와 겹치는 파일') 쓰기 몫 변경은 작게, 합침은 컨트롤러. 설계 숫자는 설정 키. 해요체 · C82.

## 완료 · 보고
로컬 관문 초록 → 보고 `task-p11-report.md` '차례 7' 절 → SendMessage 한 줄 → 컨트롤러 CI → 검토 B3(code rev-p11b · design des-p11c Fable max, 목업 B_Writing3 · B_Home4) → fix → 커밋 → P11b 완료 보고(plan-p11b done) → 프리뷰에 차례 6 · 7 함께.

## 차례 6 코드 검토가 넘긴 것(review-p11-6-code '차례 7 이 볼 것')
- 되살린 생각 꺼내기 기록(restored)을 지금 코드는 실패로 읽는다 — AC-2e 되살림을 넣을 때 초고 화면이 '이번에는 바로 써 볼까요'로 열리지 않게 두 자리를 함께 고친다.
- AC-8k 의 '빈 새 초고' 단언은 되살림이 없어 지금은 늘 참 — 되살림을 넣은 뒤 참인 단언으로 바꾼다.

