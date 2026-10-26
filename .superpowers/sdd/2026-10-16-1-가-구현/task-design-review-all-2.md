# 재검토 브리프: 전체 디자인 리뷰 2 — 디자인 fix 1~1d 범위 한정(design-reviewer des-all 이어 보기 · Fable · max, 2026-10-23 04:4x)

읽기 전용. 고치지 않는다. 대상: 워크트리 p13 작업 트리(CI 17차 스냅숏 dc82db2 와 같음 — 디자인 fix 1 · 1a · 1b · 1c · 1d + 회화 느낌 고침). 사진: **CI 17차 e2e 사진 227장** `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/2062272a-c008-4a43-ba20-a78543fbd511/scratchpad/p13-photos-7`(지난 리뷰의 p13-photos-4 와 견줄 수 있음). 구현 보고: `task-p13-report.md` '디자인 fix 1' · '1a' · '1b' · '1c' · '1d' 절. 기준: 정본 4절 · 포스트잇 보드 · 아이용 원칙이 먼저, 보조 스킬(design-taste-frontend `references/app-screens.md` §4.1 · §4.2 · §11, ui-ux-pro-max Quick Reference §1 · §2 · §3 `content-jumping` · §7)은 그와 부딪치지 않는 것만.

## 이번에 볼 것

| 차례 | 볼 것 | 근거 |
|---|---|---|
| 1 | 지난 리뷰(`review-design-all.md`) fix 묶음의 #1~#5 · #7~#11 이 고쳐졌는지 — 번호마다 ADDRESSED · NOT ADDRESSED(사진 이름 · 파일:줄) | `task-design-fix-1.md` 표 |
| 2 | 컨트롤러 덧 #12~#18 — **같은 종류 종이 크기 일관 · 같은 줄 아래 끝 · 한 판 한 간격**(C114): 홈 영역 카드 넷 같은 높이(가로 · 세로), 수업 목록 카드와 지난 수업 카드 같은 크기 · 같은 간격, '여기부터 해요' 카드도 같은 크기(표지 · 테두리로만 구별, fix 1a a), 배치 전 홈 카드의 '내 단계 찾기' 아래 끝 단추(fix 1a b), 늘인 카드 안 40px 넘는 빈 띠 없음, 격자 셈(보고의 셈 줄과 사진이 맞는지) | 13절 C114 · 4절 55행 '여기부터 해요' |
| 3 | 고침이 새로 낸 어긋남 — 표지 22px 두 줄 접힘(C82), 문장부호 붙임 뒤 줄바꿈, 무음 모드 안내 줄(C111 문구 그대로 · 아이패드 사파리일 때만), 쉼 · 막힘 종이 판, 테이프 색 | 13절 C82 · C111 |
| 4 | 지난 리뷰에서 빼 둔 #6(세션 활동 카드 둥근 모서리)은 보지 않는다 — 요청자 표본 몫 | — |

범위 밖: 회화 말풍선의 글 내용(겹침 없애기는 코드 검토 fix 중 — CI 17차 e2e 빨강 2 는 AC-15g 시험 기대 문제), 시드 내용.

## 보고
`review-design-all-2.md`: 판정(Approved · Changes requested) · 지적마다 심각도(Critical · Important · Minor)와 근거(사진 이름 · 파일:줄 · 정본 절, 외부 기준은 출처와 확인 정도). 근거 없는 지적은 넣지 않는다. 지난 열린 항목마다 '닫힘 · 아직 열림(근거)'. SendMessage 한 줄.
