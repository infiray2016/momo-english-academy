# 코드 검토 브리프: P13d 검토 4 — d8(3D 선생님 그림 층)(code-reviewer · Opus · xhigh, 2026-10-23 14:5x)

C142 검토 묶기의 마지막 코드 검토. 이번에 보는 것: d8 — 3D 그림 층(판정 순수 함수 · 동적 조각 · 보관 조각 · 선생님 창 3D 칸 · 대신 표시 다섯 · 캐시 머리 · proxy 거르기 제외 · 의존 규칙 · 관찰 쪽 '3D 보기' · 시험).

## 볼 것
- diff: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d` 에서 `git diff 1174e13..123d7bc`(커밋 하나).
- 근거: plan `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(approved — C141 · C142, d8 차례 · 값 13~17 · 위험 5 · '구현하며 확인할 것'), spec(같은 폴더 spec.md, 정본 번호 AC-19c · AC-19i · AC-N12), 정본 4절 회화 세션 선생님 창(`specs/03-화면.md`), 8절 기술(`specs/08-테스트와-기술.md`), `.claude/CLAUDE.md`(접근 확인 · 설정값 · 녹음 안 함).
- 구현 보고: `task-teacher-d8-report.md`(같은 폴더) — 'plan 으로 풀리지 않아 정한 것' 열하나와 '남은 우려' 여섯.

## 특히 볼 곳
1. 3D 는 동적 조각 하나에만: 회화 밖 쪽과 회화 세션 첫 JS 에 three 가 들지 않는지, 의존 규칙 두 줄(three-only-in-avatar · avatar-only-dynamic)이 실제로 막는지(정규식 · 갈래 이름).
2. 판정과 자원: 대신 표시 까닭 다섯, 한 번 초상이면 세션 끝까지, 늦게 온 결과 · 닫은 뒤 결과 버림, 시간 넘김(AbortController), 맥락 잃음, 풀기 한 번(forceContextLoss 포함), rAF · ResizeObserver · 쪽 숨김, 개발 모드 효과 두 번 돌기, 보관 조각이 마지막 상태 · 움직임 줄이기를 기억하는 길.
3. 접근 · 캐시: `/teachers/` 를 proxy 거르기에서 뺀 것이 정본 접근 규칙(모든 요청 가족 접근 쿠키)과 plan 에서 정한 범위 안인지, immutable 캐시가 해시 붙은 파일 이름에만 닿는지.
4. 선생님 창: 3D 칸 · data-teacher-render/fallback 속성, '시작!' 화면 초상, 3D 일 때 초상 상태 표시 숨김(구현자 정함 5), 움직임 줄이기.
5. 시험: 단위 17 + 더한 것, e2e AC-19i 기본 셋(이 Mac 에서 못 돌려 CI 첫 실행 — 단언이 실제 DOM 속성 · 사건과 맞는지 코드로 대조), 시험 이름에 AC 번호.
6. 구현자 우려 3(막힘 · 쉼 화면에서도 약 5MB 모델을 받음)에 대한 의견 — 고칠지(심각도와 근거)만.

## 보고
- **보고는 파일로 쓴다**: `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-teacher-4-code.md`(지난 검토 3 답장이 잘렸다). 코드는 고치지 않는다.
- 판정 한 줄, 지적마다 심각도(Critical · Important · Minor)와 근거(파일:줄 · plan · spec · 정본 절). 근거 없는 지적은 넣지 않는다. 구현자가 정한 열하나마다 받음 · 고침 판정.
- 답장은 판정 한 줄 + 지적 제목 목록 + 파일 경로만. `ledger-closed.md` 는 읽지 않는다.
