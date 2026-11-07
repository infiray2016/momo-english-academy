# 검토 브리프: P11a 차례 2 fix 2 코드 재검토(code-reviewer rev-p11 이어 보기 · Opus · xhigh, 2026-10-18 07:1x 작성 — fix 2 DONE · CI 2차 뒤 보냄)

범위 한정. fix 2 는 화면 검토 지적(I 3 · M 5)을 고친 것이라 코드 검토 A2 Approved 를 깨지 않았는지만 본다 — 워크트리 p11 의 fix 2 diff(컨트롤러가 파일 목록을 메시지에). 볼 것: (1) 공용 조각(`src/components/activities/reading.tsx` · `common.tsx` · `src/components/answer/choice.tsx`)을 고쳤다면 P5b 시드 보기 · P10 배치 · 평가 지문 길의 동작이 그대로인가(선택 속성 · 세션 길에서만). (2) 새 e2e 단언 셋(가로 '다음' 아래 끝 · 그림 대체 · 쪽지 카드 안)이 거짓 초록이 아닌가. (3) 설계 숫자(보기 높이 · 줄 높이 · 쪽지 너비)를 박았으면 구조 상수(C72 꼴)인가 — 화면 크기 상수는 설정이 아니다. (4) `check:deps` · `check:bundle` · `check:ids` 새 줄 없음. CI 2차 결과는 컨트롤러가 전한다.

## 보고
`review-p11-fix2-code.md` — 판정 · 지적(심각도 · 근거) · 끝나면 SendMessage(team-lead) 한 줄.
