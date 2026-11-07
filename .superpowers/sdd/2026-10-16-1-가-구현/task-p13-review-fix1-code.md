# 재검토 브리프: P13a 차례 1 + 3 fix 1 — 코드(code-reviewer rev-p13 이어 보기 · Opus · xhigh, 2026-10-22 17:0x, 범위 한정)

대상: 워크트리 p13 작업 트리(차례 1 · 3 + fix 1, CI 가지 ci/p13-c1 = f9690a1 과 같음, CI 2차 도는 중). fix 브리프 `task-p13-fix1.md`(I1 C99 · I2 (가) · M1 C100 · M2~M6) · 구현자 보고 'fix round 1' 절과 고친 '요청 2'(토리 행 네 칸 cardQuestionNo · moreTalkFallback · aiQuestion · moreChosen, 1~3단계 aiQuestionSlot 은 nextQuestionIsAi) · 다르게 한 것 하나(실린 AI 질문에 선택 힌트 칸).

**지적마다 ADDRESSED · NOT ADDRESSED** 를 근거(파일:줄 · 시험 이름)와 함께. 특히 (1) I1 — `metWordsIn` 이 동음이의어를 안 쓰고 '회화 만남' 시험 둘째 단언이 뒤집혔는지, `saidWordsOf` 는 그대로인지(C99 글과 맞게). (2) I2 (가) — 흐름이 스스로 고르기 차례를 판정하는지, 4단계 목표 턴 · '더 이야기하기' 두 바퀴 시험이 참인지, 네 칸 꼴이 b 에 무리 없는지(네 재현 스크립트로 다시). (3) M1 — C100 대로 AI 자리 턴에서 next_question_en 이 오고 사용자 메시지에 그 사실이 가는지. (4) M3 다르게 한 것(선택 힌트 칸)이 정본 3.3 힌트 두 단 규칙과 어긋나지 않는지. (5) M4 이름 바꿈 뒤 spec-trace 가 AC-15b 를 '시험 없음'으로 바로 세는지. 새 지적은 fix 자리만(심각도 · 근거). 보고 `review-p13-fix1-code.md`, 끝나면 SendMessage 한 줄.
