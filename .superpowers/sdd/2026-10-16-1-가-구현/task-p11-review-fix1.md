# 검토 브리프: P11a 차례 1 fix 1 재검토(code-reviewer rev-p11 이어 보기 · Opus · xhigh, 2026-10-18 06:2x 작성 — fix 1 DONE 뒤 보냄)

범위 한정 재검토. 네 보고 `review-p11-1-code.md` 의 I-1 · M-1 · M-2 · M-3 · M-4 가 ADDRESSED 인지만 가른다(M-5 는 차례 2 가 틀을 다시 쓰며 닫기로 했다 — 보지 않음). 워크트리 p11, **HEAD 6e09901**(P10 78db3a2 합침 — 네 검토 뒤 바뀐 바탕이다. 합친 것은 P10 차례 7 · fix 6 · 7 파일이고 차례 1 파일과 겹치지 않는다). 구현자 보고 `task-p11-report.md` '차례 1 fix 1' 절. 13절 C83(7절 · 12절 '다시 듣기' 글을 구현에 맞춤 — 코드 변화 없음)도 참고.

## 가를 것
- I-1: `attempt.ts` repeat-* · question 갈래가 `skipped` 를 보고 점수 null · 단어별 정오 [] 를 내는가. 단어 수 · `englishSentencesOf` 는 그대로인가. 시험 — heard + skipped 사례(따라 말하기 · 질문 답) · 문장 수 사례 · 이름에서 '인식 글 없이' 뺌.
- M-1: 하이픈 · 따옴표 단원 단어가 따라 말하기 · 조립 · 질문 답 정오에서 맞춰지는가(단원 단어 쪽 정규화 · forms). 시험 'yo-yo'.
- M-2: 경계 사례 둘(= PASS → 맞음 · k − 1 → 틀림), 기대값이 구현을 베끼지 않았는가.
- M-3: 결정 2 사례 둘(heard 뒤 aborted × max_retries → skip · start-failed · 모르는 코드 × max_retries × 2 → mic-stalled).
- M-4: failures 가 `TEST_SETTINGS` 에서, 171 단언 지움, 246 이름.
- 새로 생긴 결함이 있으면 심각도 · 근거와 함께(범위 안에서만).

## 보고
`review-p11-fix1-code.md` — 지적별 ADDRESSED · NOT ADDRESSED(근거) · 새 지적 · 판정(Approved 면 차례 2 로). 끝나면 SendMessage(team-lead) 한 줄.
