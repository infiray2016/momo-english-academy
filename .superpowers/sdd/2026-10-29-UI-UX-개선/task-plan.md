# 브리프: UI · UX 개선 plan(계획자 · Opus · xhigh, 2026-10-29 22:4x)

승인된 델타 spec `intent/2026-10-29-UI-UX-개선/spec.md`(2판 approved — 요청자 C179 · 컨트롤러 C178, 보완 넷 반영)와 intent(2판 approved C173)를 받아 `intent/2026-10-29-UI-UX-개선/plan.md` 를 쓴다. 절차 · 템플릿은 `.claude/skills/plan-build/SKILL.md`. 정본은 본 저장소 `specs/`(편집자가 spec 1판을 반영했고 2판 델타를 반영 중 — 13절 C180). 코드는 `.claude/worktrees/p13d`(머리 0c664c3 위에 커밋 전 64파일 = 불편 1차 묶음, 검토 A · B Approved; 거기에 시드 규격 · 검증기 확장이 더해지는 중). 코드 · 정본 · 시드는 읽기만 하고 고치지 않는다. 쓰는 파일은 plan.md 하나다.

## 입력(절대 경로 /Users/hikaru/workspace/momo-english-academy)
- spec 2판 · 바뀐 자리 `.superpowers/sdd/2026-10-29-UI-UX-개선/fix1-changes.md`(F-1~F-68, 맨 위 AC 변경 모음) · 요청자 원문 `docs/research/2026-10-29-UI-UX-spec-1판-요청자-승인-원문.md` · 13절 C166 · C167 · C168 · C173 · C178 · C179 · C180.
- UX 검토 3판 `ux-review-report.md`(불편 장면 열다섯 · D-1~D-15) · 장부 `ledger-open.md`(L-2 통합 · e2e 미실행, L-3, L-8 감시 잠정값, L-9 화면 검토, L-12 배선 e2e, L-19 커밋은 회화 적용과 함께, L-20, L-21) · `ledger-closed.md`.
- 1차 묶음 구현 보고 `task-ux-fix-a-report.md` · `task-ux-fix-b-report.md`(바뀐 파일 · 시험) · 코드 검토 보고 넷.
- 디자인 시안 ② `design-samples.html`(`.th-desk` · `.cs-b` 토큰 값, 홈 · 회화 대화 · 결과 세 화면 구성).
- 코드 현황(읽기만): `src/app/globals.css`(토큰 101) · `src/components/board.tsx` · 홈 카드 · 수업 목록 · `src/components/teacher/teacher-window.tsx` · `teacher-portrait.tsx` · `src/components/session/reward.tsx` · `src/components/conversation/closing-cards.tsx` · 막힘 · 쉼 화면 조각 · `src/app/(child)/` 라우트(앱 오류 화면 없음) · `tests/e2e/` · `tests/unit/ux-*.test.ts` · `public/teachers/`(초상 webp · vrm) · `scripts/`(설계 숫자 검사 · 식별자 검사).
- 같은 시기 변경 단위: 회화 spec 3판(최종 승인 대기 — 겹치는 파일: 회화 틀 · 아이 차례 · 따라 말하기 · 말풍선 · 선생님 창, spec 설계 8 차례 0 · 5 · 6) · 가르치고 배우는 수업 spec 3판(세션 새 자리 여섯은 그쪽 plan, 이 plan 의 토큰 위에 얹음) · 평가 체계(P12 별 장부 · 단원 막대).

## plan 에 꼭 담을 것
1. **묶음** — spec 설계 8 차례 2~8 을 묶음으로(차례 1 정본 반영은 끝남): 디자인 ② 바탕(토큰 · 책상 · 종이 테 · 카드 · 단추 · 테이프 · 흐린 단추 · 아이콘) → 홈 카드 넷 · 수업 목록 위 띠 · 홈 작은 초상(UX2) → 둥근 창 · 흰 이름표 · 초상 다시 찍기(512 WebP · 방 색 바탕 · 머리 여유) · 3D 바탕 방 색 → 화면 가족 손질(세션 · 결과 · 막힘 · 쉼 · 오류 · 첫 실행, 필수 (나)의 남은 화면, 앱 오류 화면 새로, UX3 큰 단추 · UX4 쉬는 화면 '다시 해 볼래요', 복구 예외 표) → 회화 대화 화면 꼴(회화 spec 구현 뒤) → 화면 검토(Fable max) → iPad 재시험. 1차 묶음과 다른 자리 넷(spec 우려 5: 막힘 단추 크기 · 쉬는 화면 '다시 해 볼래요' · 홈 · 목록 쉼 한 줄 칸 · 회화 끊김 단추 글)을 어느 묶음에 넣을지 정한다.
2. **묶음마다** 바뀌는 파일(만들기 · 고치기, 겹치는 파일은 회화 plan 과의 차례), 작업 순서, 증명(단위 · Playwright 사진 · 화면 검토 · CI 검사 — 토큰 밖 색 값 검사와 설계 숫자 경고 수, 대비 7:1 검사), 위험(겹치는 파일 · 초상 자산 · 한 단 밝은 색의 하늘 · 분홍 · 감시 잠정값 · e2e 못 돌림)과 되돌리는 길.
3. **필수 둘의 증명** — 발화 표시 유지(AC-U6)와 오류 복귀(AC-U7)는 Playwright e2e 로만 잠기고, 요청자 결정대로 '실제 실행 결과를 확인해야 완료'다. 이 Mac 은 내장 Postgres 가 뜨지 않고(L-2) 11-01 전에는 CI push 를 하지 않으므로, 정적 작성 → 11-01 뒤 CI 실행 확인의 차례와, 그 전에 '완료'로 적지 않는 규칙을 plan 에 둔다. 복구 예외 표(수업 목록을 거치는 화면)의 e2e 도 같다.
4. **커밋 · 프리뷰** — 1차 묶음 64파일과 이 plan 의 묶음은 회화 재설계 적용과 함께 커밋 · push 한다(L-19, [skip ci] 는 11-01 전). 묶음마다 '커밋 후보' 경계를 적되 push 는 하지 않는다. p13d specs 사본 맞추기(정본 복사)를 커밋 전 일에 넣는다.
5. **D-2 · D-6** 은 관련 변경 단위(마스코트 캐릭터 표본 · 회화 대화 기록 칸)가 끝날 때까지 미완료로 두고, plan 의 '끝' 조건에서 뺀다. 마스코트 표본은 이 plan 밖(별도 브리프)이라고만 적는다.
6. **설정값** — 12절 키(감시 넷 · R4 둘 · reward.star_complete)는 정본 반영됐으니 코드 · settings.json 과의 식별자 대조(check:ids)만 확인 항목으로.
7. **plan 밖 · 정할 것** — R2 따라 말하기 읽는 중 단추 최종 꼴(iPad N0 뒤), R8 맞장구(회화 spec), 별 규칙과 P12, 한국어 목소리(가르치고 spec) 등은 '다른 plan 몫'으로 표에.

## 지키는 것
plan-build 템플릿(바뀌는 파일 · 작업 순서 · 위험 · 증명) 그대로. 250~400줄 한국어, 영어 개발 용어 직역 금지, 용어(영역 · 단계 · 단원 · 활동 · 화면 가족 · 토큰). 설계 숫자는 설정값 또는 토큰. 아이 이름 · 비밀값 없음. 마지막 답은 파일 경로 · 줄 수 · 묶음 수 · 위험 수만.
