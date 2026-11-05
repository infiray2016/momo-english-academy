# 검토 브리프 B: 불편 1차 묶음 — 화면 피드백 · 보상 · 표시(code-reviewer · Opus · xhigh, 2026-10-29 18:5x)

작업 자리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(머리 0c664c3 위, 커밋 전 변경). 같은 작업 트리에 구현자 A(음성 · 듣기 피드백)의 변경이 함께 있고 그쪽은 다른 검토자(rev-ux-a)가 본다. **이 검토의 범위는 B 의 파일이다**(아래 목록). 쉘 작업 디렉터리를 옮기지 말고 `git -C <작업 자리>` · 절대 경로로 읽는다. 고치지 않는다.

## 읽을 것(차례대로)
1. 구현 브리프 `.superpowers/sdd/2026-10-29-UI-UX-개선/task-ux-fix-b.md` 와 구현 보고 `task-ux-fix-b-report.md`(1판 + 끝의 'fix round 1' 절: 홈 별 합을 결과 · 마무리와 같은 순수 함수 `src/core/reward/star.ts` earnsStar 로 맞춤, 홈 합은 reward.star_complete 곱).
2. 근거: UX 검토 3판 `ux-review-report.md` 의 2절 ② ③ ④ ⑤, 4절 (나), 5절 R3 · R4 · R7, 불편 장면 1 · 3 · 8 · 12 · 13 · 14 · 15. 13절 C166(`specs/10-결정-기록.md`) · C33(정리 · 끝인사) · R12(별, `specs/02-3-어휘-복습-동기-점수.md` 34줄) · C2. 정본 4절(`specs/03-화면.md`) 홈 표 · 세션 결과 행 · 회화 마무리 행 · 위 띠 행 · 처음 회화 행 · 쓰기 세션 행, 12절(`specs/09-설정값.md`) ui.auto_next_seconds · talk.teacher_praise_seconds · reward.star_complete.
3. 열린 장부 `ledger-open.md`(L-1 · L-6 · 정본 변경 행 · 잠정 값). 닫힌 장부는 없다.

## B 의 파일(검토 범위)
src/server/home/index.ts(firstLesson), src/app/(child)/home-cards.tsx, src/core/reward/star.ts(새), src/components/session/reward.tsx(새), src/server/session/result.ts · index.ts(gotWords · PREVIEW_ACTIVITY), src/app/(child)/result/[id]/result-view.tsx, src/components/conversation/closing-cards.tsx, talk-frame.tsx(B 몫: 위 띠 토막 이름 · 끝인사 전달 · 무음 모드 줄은 걷어 냄), src/components/board/board.tsx(ConfirmSheet), src/components/conversation/tori.tsx(①② 안내), silent-mode-note.tsx(새) · hint-loading-dots.tsx(새), src/components/teacher/teacher-window.tsx(듣기 표시), src/components/session/reading.tsx(다른 답 안내), writing-composition.tsx(분량 아래 쪽지), src/app/(setup)/first-run/first-run-flow.tsx, seed/settings.json · specs/09-설정값.md · tests/fixtures/settings.ts(값 둘), tests/unit/ux-screen-feedback.test.ts · teacher-window.test.ts · silent-mode-note.test.ts · hint-loading-dots.test.ts · 별 함수 시험, tests/integration/home.test.ts · session-flow.test.ts, tests/e2e/home.spec.ts · conversation.spec.ts(B 몫) · teacher-choice.spec.ts · reading.spec.ts · session.spec.ts · writing.spec.ts · resume.spec.ts · first-run.spec.ts.

## 판정할 것
- 설계 준수: 브리프 항목 1~8 이 빠짐 · 넘침 · 잘못 이해 없이 됐는가. R7(홈 첫 사용 꼴 — 0 · 빈 막대 숨김, '첫 수업을 해 봐요', '여기부터') · R3(결과 · 마무리 별 하나 + 오늘 얻은 단어) · R4(설정값 둘, 코드에 숫자 없음) · U5-5 띠 · U5-6 · U3-3 쪽지 단추(계속하기 큼 · 파괴적 작음, Tab 차례 그대로) · U5-11 ①② 한 번(기기 저장 실패 때도 그려짐) · U5-8(아이패드 사파리 판별) · U5-12 · U4-7 · U5-10 · U4-8 · U4-6(분량 셈이 검증기와 같음) · U1-1 · U1-3 · U2-3.
- 별 규칙(fix 1): earnsStar 가 3.5 R12 '끝낸 새 수업 하나에 1개'(정규 · 보강 · 연습, 배치 · 단계 평가 · 다시 하기 제외, 회화는 목표 턴까지 끝낸 대화, 쓰기 6단계 이상은 첨삭 뒤)를 맞게 세는가, 홈 합 · 결과 · 마무리 셋이 같은 함수를 쓰는가, 끝낸 세션 셈이 DB 질의 비용(홈 자료 한 번 읽기)에서 알맞은가, 숫자를 코드에 박지 않았는가(reward.star_complete).
- 정본과 어긋난 곳의 처리: 회화 마무리 첫 장 끝인사 글(C33 반대 — 장부 L-6, 정본 변경 행으로 가는 것이 맞는지), '오늘 얻은 단어'를 미리보기 단어로 둔 것(P12 전), '여기부터 해요' 규칙, 첫 사용 판정(배치 평가 말고 끝낸 세션 없음)이 아이에게 맞는지(예: 다시 하기만 한 영역).
- 아이 화면 원칙(한 화면 한 행동 · 해요체 · 큰 글자 · 접근성): 새 문구 전부, 쪽지 단추 크기 · 초점, 홈 첫 사용 꼴 카드가 다른 카드와 크기 · 단추 자리가 같은가.
- 시험: 먼저 쓴 시험이 실제로 그 행동을 잠그는가(통과만 하는 시험 · 구현을 되읽는 시험은 지적). 통합 둘 · e2e 아홉 파일은 돌리지 못했으니 정적으로 읽어 깨질 곳을 짚는다(이 Mac 에서는 내장 Postgres 가 뜨지 않으니 돌리지 않는다). 기존 e2e 의 'not.toContain(farewell)' 셋을 뒤집은 것이 정본 변경과 맞는지.

## 보고
`.superpowers/sdd/2026-10-29-UI-UX-개선/review-b-report.md` 에 한국어로. 지적마다 심각도(Critical · Important · Minor)와 근거(파일:줄 · 정본 절 · 줄 · 결정 번호)를 적는다. 근거 없는 지적은 넣지 않는다. 장부 L-1 · L-6 은 닫힘 · 아직 열림을 판정한다. 맨 위에 판정(Approved · Changes requested)과 Critical · Important · Minor 수. 마지막 답은 판정과 보고 경로만.
