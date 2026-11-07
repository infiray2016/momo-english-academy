# 화면 재검토: P11a 차례 2 fix 2(design-reviewer des-p11 · Opus · xhigh, 2026-10-18, 범위 한정)

## 판정: Approved — 지적 여덟 모두 ADDRESSED · 새 지적 Minor 2(막지 않음)

대조 자료: CI 2차 사진 25장(`scratchpad/p11-photos-2`, 전체 쪽 사진) · 워크트리 p11 fix 2 코드 · 구현 보고 '차례 2 fix 2' 절 · 이전 보고 `review-p11-2-design.md`. 사진 크기와 단추 자리는 사진 픽셀을 풀어 CSS px 로 쟀다. 사진 25장 모두 보는 창 크기 그대로다(세로 820 × 1180 · 가로 1180 × 820 — 세로 · 가로 넘침 없음).

## 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 가로 1단계 그림 문항 단추 잘림 | ADDRESSED | `p11-reading-level1-question-landscape.png` 1180 × 820(전에는 969), '다음' y 673~728. `retry-landscape` · `reveal-landscape` · `right-landscape` 모두 820, '다음' y 681~736. 가로 그림 보기 높이 약 131px, 그림 칸 112px(`src/components/session/reading.tsx:363` 의 `landscape:` 꾸밈 — 세로 `level1-question-portrait` 는 그대로 큼). 누르는 곳 56 이상 · 보기 글 24px 그대로. 1단계 문항 1 가로 '한 번 더 풀기' · 다시 맞힘 '다음' · 문항 2 '다음' 아래 끝 ≤ 820 을 e2e 가 단언(`tests/e2e/session.spec.ts:125-132` · `:144`) |
| I-2 지문 그림 줄 깨진 그림 표 | ADDRESSED | `p11-reading-level1-passage-portrait.png` · `-landscape.png` 에 뜻 글 점선 상자 둘('가상 낱말 1-1' · '1-2'), 깨진 그림 표 없음. 세션 지문만 `SafePicture`(`session/reading.tsx:100-128`, P10 `AnswerPicture` 와 같은 미리 열어 보기)를 `renderPicture` 로 넘긴다. 꾸밈 그림 길은 깨지면 그리지 않는다(`:118`). 지금 열린 평가 길(배치 평가)은 `NO_PICTURES` 라 그림 줄 자체가 없다(`src/components/answer/choice.tsx:163-169`). e2e 가 그림 줄마다 '열린 img 또는 뜻 글 상자'를 단언(`session.spec.ts:107-121`) |
| I-3 오른쪽 끝 낱말 쪽지 잘림 | ADDRESSED | `p11-reading-word-note-right-portrait.png` — 첫 줄 끝 낱말 'modeba'(x 587~674)의 쪽지가 낱말 오른쪽 끝에 맞춰(x 약 529~673) 카드(오른쪽 끝 780) 안에 다 보인다. 가로 사진도 카드 안. 코드: 낱말 가운데가 카드 오른쪽 반이면 `right-0`, 넘치면 카드 안으로 당김(`session/reading.tsx:169-195`), 화면 크기가 바뀌면 다시 잼(`:199-216`). 세로 카드 너비 약 740px 에서 반쪽이 370px 라 최대 256px 쪽지는 두 맞춤 어느 쪽으로도 카드를 넘지 않는다 — 당김은 안전장치다. e2e 가 쪽지 상자 ⊂ 활동 카드를 사진 앞뒤로 단언(`reading.spec.ts:84-106`) |
| M-1 정답 보기에서 처음 오답 ✕ 사라짐 | ADDRESSED | `p11-reading-reveal-*.png` — 처음 오답 'a modeba' · 둘째 오답 'a nedeba' 둘 다 ✕, 정답 ✓. `stateOf`(`session/reading.tsx:421-426`)가 고른 보기를 끝까지 표시 |
| M-2 다시 고를 때 해설 사라짐 | ADDRESSED | 새 사진 `p11-reading-retry-portrait.png` · `-landscape.png` — '한 번 더 풀기' 뒤 처음 오답 ✕ · 누를 수 없음, 해설 '첫 문장에 나와요.' 보임, 단추 없음(고르기 기다림). 코드 `tries.length > 0`(`:491`) |
| M-3 세션 지문 줄 높이 | ADDRESSED | `p11-reading-passage-portrait.png` — 줄 간격 약 48px, 새 단어 단추 높이 약 45~47px(전 36~39px). 세션 지문만 `leading-[2]`(`src/components/activities/reading.tsx:184`), 평가 · 시드 보기 지문은 그대로 |
| M-4 쪽지 닫기 | ADDRESSED(코드 · e2e) | 쪽지가 열린 동안 `document` pointerdown — 낱말 단추 · 쪽지 밖이면 닫음(`session/reading.tsx:203-209`). 같은 낱말 다시 누르기 · 다른 낱말 누르기는 그대로. e2e 가 안내 줄을 눌러 쪽지 0 을 단언(`reading.spec.ts:107-109`) |
| M-5 빈 상태 줄 | ADDRESSED | `right-landscape` · `reveal-landscape` 1180 × 820(전에는 865). `session-frame.tsx:501` 이 상태 글이 있을 때만 줄을 그린다 |

## 새 지적(Minor — 막지 않음)

### N-1. 상태 줄을 글이 생길 때 새로 붙여, 읽기 도구가 끊김 안내를 못 읽을 수 있다
- 근거: M-5 고침이 `role="status"` 줄을 글과 함께 새로 붙인다(`src/app/(child)/session/[id]/session-frame.tsx:501`). 알림 영역(live region)은 글이 바뀌기 전에 DOM 에 있어야 바뀐 글을 읽는 것이 정석이다(MDN 'ARIA live regions' — 확인 정도: 널리 알려진 지침). `StatusLine` 이 '글이 비면 자리만 둔다'로 만든 까닭과도 같다(`src/components/board/board.tsx:317-320` 주석).
- 고치는 법: 줄은 늘 두고 글이 빌 때만 높이를 없앤다(예: 비었을 때 `min-h-0` · `hidden` 대신 높이 0). 그러면 M-5(빈 자리 없음)와 알림이 함께 된다.

### N-2. 정답 보기에서 표시된 보기 셋이 이어지면 고리가 서로 붙는다
- 근거: `p11-reading-reveal-portrait.png` · `-landscape.png` — ✓ 정답 · ✕ 오답 · ✕ 오답이 이어진 세 보기의 바깥 고리가 위아래로 맞닿아 두꺼운 띠 하나처럼 보인다. 보기 사이 틈 16px(`gap-4`)가 고리 둘(바깥 띄움 4 + 굵기 4, `board.tsx:102`)과 같아서다. M-1 로 표시가 남게 되면서 처음 보인다.
- 읽기에는 지장이 없다(보기마다 안쪽 테 · ✓ · ✕ 가 따로 보임). 고칠 때는 보기 목록 틈을 `gap-5` 이상으로 넓히거나 고른 오답 고리를 가늘게 한다. 선택 사항.

## 넘길 것(장부)
- P12 단계 평가 화면: 1~4단계 평가 지문 그림 줄을 그릴 때 `renderPicture` 로 `SafePicture`(꾸밈 그림)를 넘겨야 '깨지면 안 그림'이 된다. 지금은 세션 지문만 넘긴다(구현 보고 다르게 한 것). ledger-open 35행(평가 지문 그림 줄 규칙)에 덧붙이면 된다.
