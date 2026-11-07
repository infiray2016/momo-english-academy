# 검토 브리프: P11a 차례 4 fix 4 화면 재검토(design-reviewer des-p11 이어 보기 · Opus · xhigh, 2026-10-18 09:0x 작성 — fix 4 · CI 8차 사진 뒤 보냄)

범위 한정 재검토. 네 보고 `review-p11-4-design.md` 의 I-1 · M-1 · M-2 · M-3 가 ADDRESSED 인지 가른다. 사진 /private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/p11-photos-6(`p11-speaking-*` 다시 찍힘 + 새 `p11-speaking-listening-on-*` · `p11-speaking-listening-{right,wrong,reveal}-*`; 배치 말하기 단추 사진은 `p10-*` 꼴이 없으니 코드로). 컨트롤러 결정: 안내 줄 셋(따라 말하기 '잘 듣고 따라 말해 봐요' · 듣기 이해 '잘 듣고 알맞은 것을 골라요' · 질문 답 '질문을 듣고 영어로 대답해 봐요', plan 문구 표 a 행) · 따라 말하기 목표 글 36px · 영어 질문 28px · 막힌 안내는 몸통 '홈' 하나.

## 가를 것
- I-1 `listening-on-*`: 듣는 동안 단추 꼴(분홍 테 · 남은 시간 고리) 보이는가. 코드: 배치 단추도 같은 조각인가.
- M-1 `needs-mic-*` · `stalled-*` · `silent-*`: 띠 '홈' 없고 몸통 '홈' 하나인가.
- M-2 `listening-right · wrong · reveal-landscape` 높이 ≤ 820.
- M-3 세 활동 첫 줄 안내 글자 그대로 · 목표 글 36px(사진에서 재기) · 질문 28px.
- 새로 생긴 화면 결함(범위 안).

## 보고
`review-p11-fix4-design.md` — 지적별 ADDRESSED · NOT ADDRESSED(근거) · 새 지적 · 판정. SendMessage 한 줄.
