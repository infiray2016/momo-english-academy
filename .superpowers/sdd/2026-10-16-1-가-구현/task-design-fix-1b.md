# 구현 브리프: 디자인 fix 1b — CI 15차 e2e 실패 일곱(implementer impl-p13-2 이어 보기 · Opus · high, 2026-10-23 03:2x)

CI 15차 run 39825956259(059dfbd): e2e 만 실패(7 failed · 132 passed), 나머지 작업 전부 초록. 로그 정리본 /private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/2062272a-c008-4a43-ba20-a78543fbd511/scratchpad/ci15-e2e.clean.log. 같은 작업 트리, 커밋 없음, 시험 먼저.

| # | 실패 | 원인(컨트롤러 판정) | 할 일 |
|---|---|---|---|
| a | home 375 · home 435(세로 카드 높이 차 6.02 · 6.06px) · lesson-list 154(세로 너비 차 2.71px) · lesson-list 201(1.36px) · writing 1099(높이 차 5.77px) | 카드 기울기(`board.tsx` TILT −2° · 1.5° · −1° · 0°)가 `getBoundingClientRect` 에 들어감 — 358px 카드가 2° 기울면 상자 높이가 약 12px 늘어난다. 실제 크기는 같다 | 같은 크기 · 같은 아래 끝 단언은 **기울기 없는 레이아웃 크기**로 잰다(`offsetWidth` · `offsetHeight` · 격자 안 `offsetTop + offsetHeight` 같은 꼴 — 도우미 하나로 묶어 다섯 시험이 같이 씀). 기울기 · 포스트잇 꼴은 그대로 둔다(4절 보드) |
| b | font-size 90(AC-N9): '여기부터 해요' · '안 해 본 수업' 20px < 22px | fix 1a 에서 표지를 카드 안에 넣으려고 20px 로 줄임 — C82 이름표 22px 규칙 위반 | 표지는 22px 로 되돌리고, 표지가 카드 안에 들도록 칸 너비를 정한다(가로 목록 · 지난 수업도). 22px 표지 너비를 재어 칸 너비 상수를 그 값 이상으로(`lesson-card.ts`), 한 줄 장 수는 셈 뒤 그대로 두 방향 다 보는 창 안 · 가로 넘침 없음. e2e: 표지 `scrollWidth ≤` 카드 안쪽 너비(두 방향). #18 셈 표 고침 |
| c | reading 73(AC-3a): `wouldOverflowLeftAligned` 가 false | #7 문장부호 붙임 뒤 시험이 고른 낱말의 자리가 바뀌어, '왼쪽 맞춤이면 넘친다'는 시험의 전제가 사라짐(제품 결함 아님) | 시험이 지문의 낱말 단추 가운데 **카드 오른쪽 끝에 가까워 왼쪽 맞춤이면 넘칠 낱말**을 찾아 누르게 바꾼다(없으면 시험 실패로 — 전제를 단언). 뜻 상자가 카드 안에 드는 단언은 그대로 |

관문은 앞과 같음. 보고: `task-p13-report.md` '디자인 fix 1b' 절 · SendMessage 한 줄 → 컨트롤러 CI 16차 → des-all 재검토.
