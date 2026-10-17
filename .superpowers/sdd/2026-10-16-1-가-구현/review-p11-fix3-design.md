# 화면 재검토: P11a 차례 3 fix 3(design-reviewer des-p11 · Opus · xhigh, 2026-10-18, 범위 한정)

## 판정: Approved — I-1 · I-2 · M-1~M-4 모두 ADDRESSED · 새 지적 Minor 1(막지 않음)

대조 자료: CI 5차 사진 45장(`scratchpad/p11-photos-4`, 전체 쪽 사진 — 새로 `p11-writing-1-copy-tiles-*` · `-fill-letters-*`) · 워크트리 p11 fix 3 코드 · 구현 보고 '차례 3 fix 3' 절 · 이전 보고 `review-p11-3-design.md` · 컨트롤러 결정(받아쓰기 내기 '다 썼어요', 그림 고르기는 고르면 바로 채점, 조립 뜻은 제목 글꼴로 크게). 사진 45장 모두 보는 창 크기 그대로다(세로 820 × 1180 · 가로 1180 × 820).

## 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 조립 빈 칸 너비가 섞인 카드 차례를 닮음 | ADDRESSED | `p11-writing-3-assemble-sentence-*` 빈 칸 다섯이 모두 같은 너비(가장 긴 카드 'kabuba' 만큼, 약 108px). `p11-resume-writing-*`(카드 둘 놓음) 남은 칸 셋도 같은 너비. 코드 `src/components/answer/tiles.tsx:255-271` 숨은 글이 `widest`. e2e `emptySlotsEven` 이 처음 · 하나 놓은 뒤를 단언 |
| I-2 '다 놓았어요'가 하나에도 켜짐 | ADDRESSED | `p11-resume-writing-*` 카드 둘 놓고 빈 칸 셋일 때 꺼짐(흐린 단추). 코드: 쓰기 조각이 정답 조각 수를 `needed` 로 넘김(`src/components/session/writing-items.tsx:219-222`) → 다 찼을 때만 켜지고 더 놓을 수 없음(`tiles.tsx:108-122`). `p11-writing-1-copy-tiles-*` · `-fill-letters-*` 처음에도 꺼짐. 배치(P10)는 `needed` 를 넘기지 않아 그대로 |
| M-1 가로 넘침 | ADDRESSED | `p11-writing-1-right-landscape.png`(전 857) · `p11-reading-right-landscape.png` · `p11-reading-reveal-landscape.png`(전 821) 모두 1180 × 820. 쓰기 그림 고르기는 가로에서 그림이 보기 왼쪽(`p11-writing-1-pick-word-landscape.png`), 읽기 문항 칸 가로 틈 16px. e2e `fitsBothWays` |
| M-2 '다음' 두 번 | ADDRESSED | `p11-writing-1-pick-word-*` 내기 단추 없음 — 고르면 바로 채점(`src/components/answer/choice.tsx:256` `instant`), 결과 뒤 '다음' 하나(`-right-*`). 받아쓰기 내기 '다 썼어요'(`typing.tsx` `submitLabel`, plan-p11a 정본 밖 문구 표 183행에 더해짐) — 1단계 시드에 받아쓰기가 없어 사진 없음, 코드로만 |
| M-3 조립 뜻 크기 · 중복 | ADDRESSED | `p11-writing-3-assemble-sentence-*` 뜻 '나는 그것이 좋아.'가 제목 글꼴 32px(`tiles.tsx:166-167`), 안내 두 줄은 20px. `p11-writing-3-right-portrait.png` 맞음 단계에 뜻이 한 번만(위 제목) — 아래 중복 줄 없음 |
| M-4 '대문자' 자리 · 카드 틈 | ADDRESSED(남은 몫은 아래 N-1) | `p11-resume-writing-*` '대문자'가 놓는 줄 오른쪽 끝(`tiles.tsx:272-283` `ml-auto`), 첫 카드 'the'가 줄 왼쪽에 붙고 카드 틈이 고르다. 가로는 한 줄. 세로는 단추가 둘째 줄로 내려가 줄이 두 겹이 되는 것이 남았다 |

## 새 지적(Minor — 막지 않음)

### N-1. 세로 화면에서 첫 카드를 놓는 순간 남은 카드가 아래로 약 68px 밀린다
- 근거: 세로 `p11-writing-3-assemble-sentence-portrait.png` 에서 카드 줄이 y 약 489~543px 인데, 카드 둘을 놓은 `p11-resume-writing-portrait.png` 에서는 남은 카드가 y 약 557~611px 다. 첫 카드를 놓을 때 '대문자'가 생기고, 세로에서는 빈 칸 다섯 뒤에 자리가 없어 둘째 줄로 내려가 놓는 줄이 두 겹이 되기 때문이다(`tiles.tsx:272-283`). 가로(`p11-resume-writing-landscape.png`)는 한 줄이라 밀림이 없다.
- 왜: 아이가 다음 카드를 누르려는 바로 그때 카드와 '처음부터' · '다 놓았어요'가 밑으로 움직여 잘못 누르기 쉽다. 이전 M-4 의 '줄이 두 겹이 된다' 몫이다.
- 고치는 법: '대문자' 자리를 처음부터 잡아 둔다(첫 카드를 놓기 전에는 꺼진 단추로 보이기). 또는 '처음부터' 옆 단추 줄로 옮긴다. 어느 쪽이든 놓는 줄 높이가 바뀌지 않는다.

## 범위 안에서 더 본 것(문제 없음)
- 새 사진 `p11-writing-1-copy-tiles-*`: 안내 '단어를 보고 글자를 차례대로 놓아요'(plan 표 글자 그대로) · 낱말 'bebaba' 24px 굵게 · 글자 타일 여섯 56 × 56 · '처음부터' · '다 놓았어요'(꺼짐). `p11-writing-1-fill-letters-*`: 안내 '빈칸에 들어갈 글자를 놓아요' · 그림 자리 · '다시 듣기'(글 보이는 단추) · 무늬 'b _ b a b a'(빈칸 점선 56px) · 타일 'a' · 'z'. 하늘 쓰기 카드 · 글자 크기 · 가로 넘침 없음.
- `p11-writing-1-wrong-landscape.png`: 그림 왼쪽 꼴에서도 정답 ✓ · 고른 오답 ✕ · '정답은 이거예요' · '한 번 더 풀기'가 보는 창 안.
