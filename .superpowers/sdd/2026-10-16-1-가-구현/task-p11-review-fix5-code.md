# 재검토 브리프: P11b 차례 5 fix 5 — 코드(code-reviewer rev-p11b 이어 보기 · Opus · xhigh, 2026-10-22 15:2x, 범위 한정)

대상: 워크트리 p11 작업 트리(HEAD 726198f + 미커밋, CI 가지 ci/p11-c2 = 60e4858 과 같음). fix 5 브리프 `task-p11-fix5.md`(15 항목)와 구현자 보고 `task-p11-report.md` 'fix 5' 절을 읽고, **지적마다 ADDRESSED · NOT ADDRESSED** 를 근거(파일:줄 · 시험 이름)와 함께 판정한다. 새 지적은 fix 5 가 건드린 자리에서 생긴 것만(심각도 · 근거 필수).

볼 것: (1) 코드 I-1 `{NAME}` 채움 — `outcomeOf` 자리에서 praise · original · corrected · distractors 모두, 저장은 가린 글, 통합 시험 사례. 차례 6 이 같은 함수를 쓸 수 있는 꼴인지. (2) M-1 `markMicUnavailable`. (3) M-2 지난 수업 띠 링크. (4) M-3 은 컨트롤러 결정으로 '고치지 않음' — 보고 '다르게 한 것'에 적혔는지만. (5) 범위 밖 maxLength 상수가 시도 꼴 상한 안인지. (6) Codex 2 대기열 `add()` 합침 + 단위 시험(한 저장소 · 대기열 둘). (7) Codex 3 `screenOf(tx)` — 트랜잭션 안 셋 모두 tx, 타입 넓힘이 바깥 호출을 깨지 않는지, 통합 시험(풀 작게). (8) C86 이유 줄의 데이터 길(`GuidedFix.reason` → 화면)과 이름 채움이 reason 에도 걸리는지. (9) 구현자가 브리프와 다르게 한 셋(11 `-mx-3` 그 줄 단추에만 · 7 `size` 속성 · 6 예시문을 결과 단계에도) — 받을 만한지 판정. (10) 새 e2e 단언 · 사진 넷이 거짓 초록이 아닌지.

CI 11차는 도는 중(컨트롤러가 결과를 알린다). 보고 `review-p11-fix5-code.md`, 끝나면 SendMessage 한 줄(ADDRESSED 수 · 새 지적 수).
