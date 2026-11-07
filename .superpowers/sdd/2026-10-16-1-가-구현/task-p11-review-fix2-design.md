# 검토 브리프: P11a 차례 2 fix 2 화면 재검토(design-reviewer des-p11 이어 보기 · Opus · xhigh, 2026-10-18 07:1x 작성 — fix 2 DONE · CI 2차 사진 뒤 보냄)

범위 한정 재검토. 네 보고 `review-p11-2-design.md` 의 I-1 · I-2 · I-3 · M-1~M-5 가 ADDRESSED 인지 가른다. 사진은 CI 2차 아티팩트를 내려 둔 폴더 /private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/p11-photos-2(같은 이름 열아홉 + 새로 `p11-reading-retry-<방향>` · `p11-reading-word-note-right-<방향>`). 코드: 워크트리 p11 의 fix 2 diff(컨트롤러가 메시지에 파일 목록). 구현자 보고 `task-p11-report.md` '차례 2 fix 2' 절.

## 가를 것
- I-1: 가로 1단계 그림 문항(`level1-question-landscape` · `retry-landscape` · `reveal-landscape`)의 '다음' · '한 번 더 풀기' 아래 끝이 820 안인가(사진 높이 ≤ 820). 보기 56 × 56 · 글자 24 유지.
- I-2: `level1-passage-*` 그림 줄이 깨진 그림 표 대신 뜻 글 점선 상자인가. 평가 지문 길(코드)은 깨지면 안 그리나.
- I-3: `word-note-right-*` 에서 오른쪽 끝 낱말의 쪽지가 카드 안에 다 보이는가.
- M-1 `reveal-*` 오답 둘 ✕ · M-2 `retry-*` 해설 보임 · M-3 지문 줄 높이 약 48px(`passage-*`) · M-4 쪽지 밖 누르면 닫힘(코드) · M-5 `right-landscape` · `reveal-landscape` 높이 ≤ 820.
- 새로 생긴 화면 결함이 있으면 심각도 · 근거와 함께(범위 안에서만).

## 보고
`review-p11-fix2-design.md` — 지적별 ADDRESSED · NOT ADDRESSED(근거: 사진 이름 · 코드 줄) · 새 지적 · 판정. 끝나면 SendMessage(team-lead) 한 줄.
