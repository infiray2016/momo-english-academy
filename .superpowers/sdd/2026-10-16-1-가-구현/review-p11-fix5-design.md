# 화면 재검토: P11b 차례 5 fix 5 · 5b · 5c — 쓰기 4~5 · 안전 상한 안내 · 말하기 단추(design-reviewer des-p11c 이어 보기 · Fable · max, 2026-10-22, 범위 한정)

## 판정: Approved — Critical 0 · Important 0 · Minor 0(새 지적 없음)

앞 보고 `review-p11-5-design.md` 의 I-1 · M-1~M-6 일곱 개 모두 ADDRESSED. 새로 본 C86 이유 줄 · 새 사진 넷 · fix 5c(결과 단계에서 과제 줄 · 예시문 숨김, 문장 간격 8px)도 정본 · 결정과 맞고 한 화면(가로 820) 안이다. fix 5 가 건드린 자리에서 생긴 새 어긋남은 없다. 아래 '참고'는 지적이 아니다.

대조 자료: CI 13차 사진 `scratchpad/p11-photos-9`(121장 전부 1640 × 2360 · 2360 × 1640 — 쪽 전체 찍기라 넘침 없음을 치수로 확인) 가운데 `p11-writing-4-*` · `-5-*`(task · blank · write · check · options · pick-again · fixed · own) · `p11-wait-line-*` · `p11-ai-rest-{list,past,session}-*` · `p11-speaking-repeat-close-*` · `-listening-on-*` · 워크트리 p11 작업 트리(= CI 가지 ac62bcd) `src/components/session/writing-guided.tsx` · `src/components/answer/speak-button.tsx` · `src/components/session/speaking.tsx` · `src/app/(child)/[area]/lessons/past/{page,past-lessons}.tsx` · `src/server/writing/index.ts` · `src/core/writing/guided.ts` · `tests/e2e/writing.spec.ts` · 13절 C86(`specs/10-결정-기록.md:236`) · 4절 쓰기 세션 행(`specs/03-화면.md:18`) · 구현 보고 '차례 5 fix 5' 절(fix 5b · 5c 덧 포함). 크기는 BMP 로 바꿔 표준 라이브러리로 화소를 세어 쟀다(CSS px = 화소 ÷ 2).

## 지적별 판정

### I-1 5단계 문장 쓰기 화면의 예시문 — ADDRESSED
- 사진 `p11-writing-5-blank-portrait` · `-landscape`(채우기 전) · `p11-writing-5-write-portrait` · `-landscape`(채운 뒤): 과제 줄 아래 '예시'(굵게, 35화소 ≈ 20px) + 'I like the madeba.'(37화소 = 24px, 확인 화면 24px 문장과 같은 높이) 가 문장 틀 위에 있다. 4단계 사진에는 없다(`-4-blank-*` · `-4-write-*`).
- 코드 `writing-guided.tsx:343-351` `input === "slot" && phase !== "result"` — 쓰기 · 기다림 동안 보임(브리프 덧 기준). 틀이 `example` 을 넘김(`session-frame.tsx:647`). e2e 429~435행 `[data-guided-example]` 5단계 1 · 4단계 0 과 예시문 보임.
- 결과 단계(칭찬 · 고칠 곳 · 보기 · 이유)에서 숨긴 것(fix 5c)은 4절 "5단계는 예시문 아래 바꿀 칸만 기기 자판으로 입력"이 '입력' 때를 말하므로 어긋남이 아니다.

### M-1 5단계 입력란 고정 폭 — ADDRESSED(늘어남은 코드로만)
- 코드 `writing-guided.tsx:400-410` `size={max(8, 글자 수 + 1)}` · `w-auto min-w-40 max-w-full` · `maxLength={BLANK_TEXT_MAX}`(`guided.ts:12` 60). `field-sizing` 대신 `size` 를 고른 까닭(iPad Safari 지원 미확인)은 받을 만하다.
- 사진 `p11-writing-5-write-portrait` 입력란 폭 320화소 = 160px(여섯 글자 'madeba' 는 size 7 < 8 이라 최소 폭) — 긴 글에서 늘어나는 모습은 사진이 없다(견본 낱말이 모두 여섯 글자). `max-w-full` 로 문장 줄 너비를 넘지 않는다.

### M-2 5단계 입력란 초점 표시 — ADDRESSED
- 사진 `p11-writing-5-write-portrait` 셋째 입력란(마지막으로 채운 칸) 둘레 먹색 점선 고리: 두께 8화소 = 4px, 입력란 테에서 8화소 = 4px 띄움(측정 x 325~332 · 341 / 660 · 669~676). 하늘 바탕에서 뚜렷하다. 앞 낱말 'very' 끝(x 309)과 고리(x 325) 사이 16화소 = 8px 로 닿지 않는다.
- 코드 `writing-guided.tsx:138-146` `BLANK_FRAME` 에 `FOCUS_RING`(누르는 칸 — focus-visible) + 입력란 `INPUT_FOCUS`(`focus:` 판 — 손가락 초점에도 늘 보임). 단추의 `board.tsx:99-100` 과 같은 꼴.

### M-3 과제 화면 단어 상자 칩 — ADDRESSED
- 사진 `p11-writing-4-task-portrait` · `-landscape`: '단어 상자' 이름표 아래 테 · 그림자 없는 굵은 글 줄(낱말 높이 37화소 = 24px, 행 885 에 종이색 칩 배경 0 · 세로 x=150 에 테 선 없음). 누르는 꼴이 아니라 과제 화면의 행동은 '다음' 하나다.
- 코드 `writing-guided.tsx:98-109` `<p lang="en">` 낱말 span, `TileRow` 안 씀. 새 동작 없음.

### M-4 고칠 곳의 한 문장 이유 — ADDRESSED(13절 C86)
- 사진 `p11-writing-4-fixed-portrait` · `-landscape` · `-5-fixed-*`: '✓ 잘 고쳤어요!' 아래 '이 자리에는 다른 낱말이 알맞아요.'(가짜 AI 이유, 해요체) 한 줄, 글자 37화소 = 20px(안내 크기), 두 줄 사이 55화소. `-check-*` · `-options-*` · `-pick-again-*` 에는 없다(e2e 476 · 486행 0, 492행 고친 뒤 `FAKE_REASON`).
- 코드 `writing-guided.tsx:515-526`(`fixDone` 이고 `fix.reason` 일 때만, `data-fix-reason` p 20px) · `src/server/writing/index.ts:50-52 · 110`(`GuidedFix.reason`, 이름 채움 뒤). C86 "고친 뒤에만 · '잘 고쳤어요!' 아래 한 줄 · 해요체 · 이름 가림을 영어 이름으로 채운 뒤" 글자 그대로. 4절 '한 번에 하나만'과 맞음(고르기 전에는 없음).

### M-5 지난 수업 쪽의 띠 '수업 목록' 링크 — ADDRESSED
- 사진 `p11-ai-rest-past-portrait` · `-landscape`: 띠 '지난 수업 다시 하기 · 쓰기 · 5단계 · 단원 1' 오른쪽에 링크 없음(행 140, x 1300~1560 에 먹색 0), 종이 포스트잇 안 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요' + '홈' 하나.
- 코드 `past/page.tsx` 가 띠 자료 `band` 를 넘기고 `past-lessons.tsx:37-48` 이 resting 이면 오른쪽 없이 띠를 그린다(단원 고르기 쪽은 쪽이 그대로 그림). e2e 616~619행 '수업 목록' 링크 0 · '홈' 1.

### M-6 '한 번 더 말하기' 오른쪽 끝(fix 4 N-2) — ADDRESSED
- 사진 `p11-speaking-repeat-close-portrait`: 점선 칸 오른쪽 테 x = 1495 ↔ 단추 오른쪽 끝 x = 1495(모서리 1494) — 안쪽 0px(앞 보고 24화소 = 12px). '다음' 오른쪽 테(x 958)와 단추 왼쪽(x 1015) 사이 56화소 = 28px 로 보이는 간격은 그대로. 가로 `-landscape`: 단추 끝 x = 2215, 내용 끝 2216.
- 코드 `speaking.tsx:247` `gap-7` · `:252` `className="-mx-3"`(그 줄의 단추에만, 가로만) — 공용 조각 기본값 · 가운데 '말하기' · 위아래 간격은 그대로(`p11-speaking-listening-on-*` 고리 8px · 틈 4px · 단추 56px 전과 같음). 듣는 중 고리는 카드 안쪽 여백(32px)으로 12px 나가고 '다음'과 16px 남는다(계산, 사진 없음).

## 새로 본 것

| 볼 것 | 판정 | 근거 |
|---|---|---|
| fix 5c 결과 단계 한 화면 | 맞음 | `p11-writing-5-fixed-landscape` 카드 아래 끝 y = 1311화소 = 656px(820 안, 164px 여유), `-4-fixed-landscape` · `-options-landscape` · `-pick-again-landscape` 모두 카드가 보는 창 안. 문장 간격 8px(`writing-guided.tsx:353`)에서도 색칠 칸(60px)과 이웃 문장이 겹치지 않음(`-4-pick-again-portrait` 색칠 칸 아래 ↔ 다음 문장 글 약 30px). 글자 20 · 24px · 누르는 곳 56px('다음' 112화소) 그대로 |
| 결과가 오면 문장 줄이 위로 뜀 | 지적 아님(컨트롤러 결정 fix 5c) | `p11-wait-line-portrait` 첫 문장 ↔ `-4-check-portrait` 첫 문장 약 60px 차 — 한 화면에 드는 쪽을 고른 결과 |
| 새 사진 `-4-blank-*` · `-5-blank-*` | 맞음 | 4단계 빈칸: 흰 칸 + 아래 점선 4px(행 664 에 24 · 24화소 번갈아), 56px(112화소), 칩 줄 전부 보임, '다 썼어요' 꺼짐. 5단계 빈 입력란: 흰 칸 + 아래 실선, 160 × 56px, 예시문 보임, '다 썼어요' 꺼짐. 두 방향 모두 보는 창 안 |
| 새 사진 `-4-pick-again-*` · `-5-pick-again-*` | 맞음 | 틀린 보기 ✕ 표 + 흐림(disabled) · '다시 골라 볼까요'(아이콘 없는 안내 줄) · 이유 줄 없음. 색만으로 가르지 않음(✕) |
| 새 사진 `p11-ai-rest-session-*` | 맞음 | 하늘 카드 안 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요' 28px(49화소) + '홈' 단추 하나 56px(112화소), 띠 오른쪽 '홈' 없음, 활동 점은 첫 점 먹색(하던 세션 다시 엶). e2e 633행 '홈' 단추 1, 세션은 진행으로 남음 |
| 입력란 · 빈칸 단추 보조 기술 이름 | 맞음 | `writing-guided.tsx:61-62` '문장 n 빈칸 m'(`:387-390` 입력란 · `:416-419` 빈 칸 단추, 채운 칸은 낱말) |
| 문구 · 색 · 이름 | 맞음 | 새 글은 '예시'(문구 표 b 행)와 AI 이유뿐. 하늘 카드 · 먹색 단추 그대로. 'Momo' 는 견본 틀 글자 |

## 참고(지적 아님)
- '한 번 더 말하기' 듣는 중 사진은 없다(e2e 는 가운데 '말하기' 듣는 중만 찍음). `-mx-3` 로 고리가 왼쪽 12px 나가 '다음'과 16px 남는 것은 코드 계산이다.
- 5단계 입력란이 긴 글(13자 이상)에서 늘어나는 모습은 사진이 없다. e2e 에 긴 값을 넣고 폭을 재는 단언을 더하면 선 위에서 확인된다(막지 않음).
- 5단계 빈 입력란은 아래 테가 실선이고 4단계 빈칸은 점선이다(`writing-guided.tsx:424` 는 단추에만). 빈 상태 꼴을 맞추려면 입력란도 값이 비면 점선으로 — 선택.
- 앞 보고 '참고'의 과제 줄 사라짐(문장 줄 뜀)은 fix 5c 로 다시 생겼고 컨트롤러가 받았다. 색칠 칸 토큰(`bg-postit-reading`) · 기다리는 동안 꺼진 칸 꼴은 그대로(지적 아님).

## 장부
- `review-p11-5-design.md` I-1 · M-1~M-6 → 모두 닫힘. fix 4 N-2(ledger 열린 항목) → 닫힘(위 M-6).
- 13절 C86 이유 줄 → 화면 반영 확인.
