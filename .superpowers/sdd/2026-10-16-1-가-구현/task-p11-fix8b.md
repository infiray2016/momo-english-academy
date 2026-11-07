# fix 브리프: P11b 차례 7 fix 8b — 화면 검토 B3 M-1 + 범위 밖 X-1(영어 글꼴)(implementer impl-p11b · Opus · high, 2026-10-22 18:3x)

`review-p11-7-design.md`(Approved, M 1 · 범위 밖 Important 1)를 읽고 둘을 고친다. 워크트리 p11 작업 트리(차례 7 + fix 7 · 8). 시험 먼저. 커밋은 하지 않는다.

| 번호 | 지적 | 컨트롤러 결정 | 할 일 · 선 위 검증 |
|---|---|---|---|
| M-1 | 수업 목록의 기다림 표시 · '아직 글을 살펴보고 있어요'가 쪽 맨 아래(lesson-board.tsx:356-361)라 실시드 세로 화면에서 보는 창 밖일 수 있음 | 보는 창 안에 둔다 — 누른 카드 바로 아래(또는 목록 머리 띠 아래 고정) | 수업이 많은 판(시험용 틀로 안 되면 견본 10개 넣기)에서 위쪽 카드를 누른 뒤 표시가 보는 창 안인지 e2e 단언 + 사진 `p11-lesson-start-wait`(세로) |
| X-1(범위 밖, 바탕 P10) | 영어 글에 Fredoka 가 어디에도 적용되지 않음 — `globals.css:32` 토큰만 있고 `:lang(en)` 규칙 없음, `font-en` 은 영어 이름 입력란뿐 | **지금 고친다**(한 줄 CSS, 정본 4절 글꼴 규칙 Jua · Gowun Dodum · Fredoka) | `globals.css` 에 `:lang(en) { font-family: var(--font-en), … }`(기존 토큰 그대로, 한국어 글꼴로 되돌아가는 fallback 포함) + e2e 글꼴 단언 하나(`lang="en"` 요소의 computed font-family 첫 글꼴이 Fredoka) — 기존 e2e · 크기 시험이 그대로 초록인지(글꼴 바뀌면 글 너비가 바뀌어 넘침 단언이 흔들릴 수 있음 — 흔들리면 그 화면을 보고에 적음) |

끝나면 로컬 관문 뒤 보고 'fix 8b' 줄 · SendMessage 한 줄 → 컨트롤러 CI 19차 → 화면 재검토(M-1 · X-1 사진) → 차례 7 커밋 → P11b 완료 보고.
