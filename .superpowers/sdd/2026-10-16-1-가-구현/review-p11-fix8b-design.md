# 화면 재검토: P11b 차례 7 fix 8b — M-1(목록 기다림 표시 자리) · X-1(영어 글꼴 Fredoka)(design-reviewer des-p11d 새 세션 · Fable · max, 2026-10-22 19:0x, 범위 한정)

## 판정: Approved — Critical 0 · Important 0 · Minor 3(새 지적 N-1 · N-2 · N-3, 모두 막지 않음). M-1 ADDRESSED · X-1 ADDRESSED

fix 8b 가 M-1 을 (가) '누른 카드 바로 아래'로 고친 것과 X-1 을 `:lang(en)` 한 줄로 고친 것을 CI 19차 사진 158장(`scratchpad/p11-photos-12`)과 워크트리 p11 작업 트리 코드로 다시 봤다. 기다림 점 셋과 '아직 글을 살펴보고 있어요'는 두 방향 모두 누른 카드 바로 아래 · 보는 창 안이고(화소), 영어 글은 열두 화면에서 Fredoka 꼴(한 층 'a' · 둥근 획, 굵게도 가변 굵기로 삶)로 그려지며, Fredoka 가 넓어져 보는 창을 넘긴 화면은 없다(154장 화소 크기 전수). 새로 본 것은 셋 다 Minor 다 — 가로 화면의 안내 줄이 좁은 칸 안에서 세 줄로 접히고 같은 줄 카드가 함께 길어지는 모양(N-1), 오류 줄이 여전히 쪽 맨 아래라 실시드 세로에서 보는 창 밖인 것(N-2, 구현자가 '남은 우려'로 적은 자리), 읽기 지문(낱말 단추 판)에서 Fredoka 로 줄바꿈 자리가 옮겨가 마침표 하나가 줄 머리로 떨어진 것(N-3).

대조 자료: 사진 `p11-lesson-start-wait-{portrait,landscape}` · `p11-lesson-start-still-reading-{portrait,landscape}`(전체 쪽 사진 — `tests/e2e/photos.ts:27` `fullPage: true`, 세로 1640 × 3064 · 3096 화소 = 쪽 1532 · 1548px > 보는 창 1180) · 영어 글 사진 열여섯(아래 표) · 코드 `src/app/(child)/[area]/lessons/lesson-board.tsx`(117~120 · 166~180 · 182~244 · 246~298 · 395행) · `use-lesson-start.ts`(30 · 76~120행) · `src/components/session/wait-hint.tsx` · `src/app/globals.css:30~32 · 152~155` · `src/app/layout.tsx:20~24` · `src/components/activities/reading.tsx:40~65 · 180~245` · `src/components/session/reading.tsx:287` · e2e `tests/e2e/writing.spec.ts:1010~1112` · `font-size.spec.ts:247~300` · `lessons.ts:204~253` · 정본 4절(`specs/03-화면.md` 7 · 9행) · 7절 네트워크 행 · 앞 보고 `review-p11-7-design.md` · 구현 보고 'fix 8b' · 브리프 `task-p11-fix8b.md`. 화소는 사진을 BMP 로 바꿔 표준 라이브러리로 셌고(CSS px = 화소 ÷ 2, `scratchpad/px.py`), 글꼴은 2배로 잘라 봤다(`scratchpad/crop/crop-{own,corr,chips,textarea,passage1,passage-orphan,passage-orphan2}.png`).

## M-1 · X-1 판정

| 번호 | 판정 | 근거 |
|---|---|---|
| M-1 기다림 표시 · '아직 글을 살펴보고 있어요'가 쪽 맨 아래 | **ADDRESSED** | `lesson-board.tsx:168-180` `waitBelow(key)` 가 `waitAt === key` 인 칸 안 카드 아래에 `data-lesson-wait` 묶음(WaitHint · StatusLine)을 그리고(`:241 · :295`), 쪽 맨 아래 두 줄은 없다(`:395` 는 오류 줄만). 사진 `p11-lesson-start-wait-portrait`: 수업 24장 판이 쪽 1532px(3064화소)로 보는 창 1180px 을 넘는 집에서 누른 카드 1(83~427 × 312~575화소, 아래 끝 288px) 바로 아래 점 셋 y 600~669화소(300~335px, 카드와 12px 사이) — 보는 창 안. 점 각 32화소(16px, `wait-hint.tsx` size-4) · 간격 24화소(12px, gap-3). 가로 `-landscape`: 카드 1 아래 끝 558화소(279px), 점 594~628화소(297~314px)/820. `p11-lesson-start-still-reading-portrait`: 안내 두 줄 603~639 · 660~696화소(글자 높이 37화소 = 18.5px → 20px Gowun, 4절 안내 20px) · 카드 가운데(글 중심 253 vs 카드 중심 255화소) · 아래 끝 348px/1180. 가로: 세 줄 587~736화소, 아래 끝 368px/820. 문구 `use-lesson-start.ts:30` '아직 글을 살펴보고 있어요' 글자 그대로 · 해요체. e2e `writing.spec.ts:1036-1046 · 1070-1073 · 1103-1105`(쪽이 보는 창보다 길다 전제 + `[data-lesson-wait] [data-wait-hint]` 1 + y·높이 ≤ 보는 창). 남은 모양 문제는 N-1(가로 세 줄 · 이웃 카드 늘어남) · N-2(오류 줄)로 따로 |
| X-1 영어 글이 Fredoka 가 아님 | **ADDRESSED** | `globals.css:152-155` `@layer base` `:lang(en) { font-family: var(--font-en); }`(토큰 `:32` Fredoka → Gowun → sans-serif 그대로). 글자 꼴(2배 잘라냄): `crop-own.png`(`p11-writing-6-own-speak-portrait` 'I have a dog.' 36px 굵게) · `crop-corr.png`(`-rewrite-correction-portrait` 'I love it.' 줄 그음 보통 · 'I love my dog.' 굵게) · `crop-chips.png`(`-restored-portrait` 칩 'safaba' · 'sefaba' 굵게) · `crop-textarea.png`(같은 사진 입력란 'I have a dog. We play in the park' 보통) · `crop-passage1.png`(`p11-reading-passage-portrait` 'Tori has a mideba madeba.' 보통 + 낱말 단추 굵게) 모두 'a' 가 한 층(single-story)이고 획 끝이 둥글다 — Fredoka. 앞 보고가 본 Gowun 라틴의 두 층 'a' 는 어디에도 없다. 굵게는 Fredoka 가변 굵기(`layout.tsx:20-24` weight 지정 없음 → 가변 축)로 살아 칩 · 문장의 획이 보통 글과 뚜렷이 다르다. e2e `font-size.spec.ts:251-300`(computed font-family 첫 이름 /fredoka/ · fallback 아님 · 한국어 줄은 Fredoka 아님 · `document.fonts.ready` 뒤 실린 글꼴에 Fredoka · Gowun). 정본 4절 둘째 문단 |

## 새 지적(fix 8b 가 건드린 자리에서 생긴 것 — 모두 Minor)

### N-1(Minor). 가로 화면에서 '아직 글을 살펴보고 있어요'가 좁은 칸 안에서 세 줄로 접히고, 같은 줄 이웃 카드 넷이 함께 92px 길어진다
- 근거(사진 · 화소): `p11-lesson-start-still-reading-landscape` — 칸 너비 130px(260화소, `LESSON_GRID` 가로 `minmax(112px,1fr)` `lesson-board.tsx:42`)이라 안내가 '아직 글을 / 살펴보고 / 있어요' 세 줄(587~623 · 644~678 · 700~736화소, 글 상자 폭 155화소 = 78px). 같은 줄 카드 2~5 는 313~743화소(215px)로 둘째 줄 카드(792~1038화소, 123px)보다 92px 길다(`flex-1` `:202 · :285` 가 칸 높이를 채움). 세로 `-portrait` 도 두 줄(폭 156px)에 이웃 131 → 195px(313~703 vs 760~1023화소). 기다림 점 셋 상태는 +48px(세로 313~671 vs 728~991화소, 가로 313~655 vs 704~950화소)라 1~5초짜리로는 괜찮다.
- 영향: 첨삭 대기가 다른 부름에 잡힌 드문 집(`claimed`)에서만, 세션이 열리지 않은 채 목록에 남는 상태다. 글은 20px 그대로라 읽히고 자리는 누른 카드 아래라 M-1 의 목적은 이뤘다. 다만 아이 눈에는 첫 줄 카드 넷이 아래 1/3 이 빈 채 늘어나 '왜 저 카드만 길지'가 되고, 가로 세 줄 접힘은 한 줄 안내가 아니다(4절 '해요체 한 줄').
- 고치는 법(둘 가운데 하나, 권함은 (가)): **(가) 안내를 칸 밖 한 줄로** — 격자에 `grid-auto-flow: dense` 를 주고 누른 카드 바로 뒤에 `col-span-full` 칸(`data-lesson-wait`)을 끼운다. 자동 배치가 그 줄 아래에 한 줄 전체로 놓고 뒤 카드가 빈 칸을 채우므로 같은 줄 카드는 늘어나지 않고 글도 한 줄이다(점 셋도 같은 길). 읽기 도구에는 `role="status"` 라 자리와 무관하게 들린다. **(나) 두기** — 드문 상태라 두고 전체 디자인 리뷰에서 본다. 세로 두 줄 · 가로 세 줄 접힘은 (가)로 함께 풀린다.
- 선 위 검증: 지금 e2e(`writing.spec.ts:1090-1112`)에 안내 줄의 `boundingBox().height` 가 한 줄(≤ 줄 높이 × 1.5)이라는 단언과 이웃 카드 높이가 둘째 줄 카드와 같다는 단언을 더하면 (가)가 지켜진다. 가로 사진도 함께.

### N-2(Minor). 오류 줄(`StatusLine tone="error"`)은 여전히 쪽 맨 아래라, 실시드 세로 화면에서 수업 열기가 실패하면 안내가 보는 창 밖이고 누른 카드는 고른 표시가 남은 채다
- 근거(코드): `lesson-board.tsx:395` `<StatusLine tone="error">{status}</StatusLine>` 이 `data-lesson-board` 판 뒤에 있다. `use-lesson-start.ts:104-109`(unavailable → '지금은 저장할 수 없어요…' · '인터넷이 끊겼어요…') · `:115-118`(예외) 가 이 줄에 쓴다. `selected`(`:161 · :274`) 는 실패 뒤 되돌리지 않아 고른 테두리 · 체크 표가 남는다.
- 근거(사진 · 화소): `p11-lesson-start-wait-portrait` 에서 판 아래 잠긴 단원 카드가 y 2628~2870화소(1314~1435px)이고 쪽 높이 1532px 이므로, 오류 줄은 1459px(gap-6) 아래 — 세로 보는 창 1180px 보다 279px 이상 아래다. 같은 집에서 fix 8b 는 기다림 표시만 올렸다(구현 보고 'fix 8b' "오류 줄은 … 그대로 맨 아래 — 남은 우려").
- 영향: 끊김 · 서버 오류 때만이지만, 그때 아이가 보는 것은 '고른' 카드 하나와 아무 일 없음이다. 7절 네트워크 행('인터넷이 끊겼어요. 연결되면 다시 해요')은 보여야 안내다. 홈 · 결과는 단추 바로 아래라 괜찮다.
- 고치는 법: `status` 도 `waitBelow` 묶음에 넣는다(`waiting || status !== ""` 일 때 그 카드 아래, 오류는 `tone="error"`). 카드 없이 생기는 오류는 없으므로 맨 아래 줄은 지운다. N-1 (가)를 하면 같은 한 줄 칸에 들어간다. 선 위 검증: `startLesson` 을 unavailable 로 흉내 낸 e2e 한 개 — 오류 줄이 `[data-lesson-wait]` 안 · 보는 창 안.

### N-3(Minor). 읽기 지문(낱말 단추 판)에서 Fredoka 로 줄바꿈 자리가 옮겨가, 세로 화면 여섯째 줄이 마침표로 시작한다
- 근거(사진): `p11-reading-passage-portrait` 다섯째 줄 끝 'It is mideba and nadeba'(마침표 없음) → 여섯째 줄 '. Tori can mudeba the pideba too.'(`crop-passage-orphan.png` · `crop-passage-orphan2.png`). 같은 지문이 글 한 덩어리인 '지문 보기' 쪽지(`p11-reading-passage-sheet-portrait`, `session/reading.tsx:287`)와 가로(`p11-reading-passage-landscape`)에서는 'nadeba. Tori can' 으로 붙어 있다.
- 근거(코드): 누르는 낱말은 `relative inline-block` 상자(`activities/reading.tsx:195`) 안의 단추이고, 뒤따르는 글 '. Tori can …' 은 따로 `<span>`(`:242`, `splitPassage` `:40-65` 가 표기형 경계로만 가른다)이다. 크롬은 inline-block(원자 인라인) 뒤를 줄바꿈 자리로 보므로 마침표 앞에서 줄을 바꿀 수 있다. Gowun 라틴(좁음)에서는 줄바꿈이 다른 자리였고, Fredoka(넓음)에서 이 자리가 됐다 — 글꼴이 바뀌면 다른 지문 · 다른 줄에서도 같은 꼴이 난다.
- 영향: 읽기를 배우는 아이가 '마침표로 시작하는 줄'을 본다. 뜻은 안 바뀌고 24px 규칙도 그대로라 Minor.
- 고치는 법: 낱말 뒤 토막이 문장부호(`[.,!?;:]+`)로 시작하면 그 문장부호를 낱말 상자(`:195` span) 안 단추 뒤에 넣어 함께 묶는다(단추 글은 표기형만, 쪽지 자리도 그대로). 또는 상자와 뒤 문장부호를 `whitespace-nowrap` 으로 감싼다. 선 위 검증: `splitPassage` 단위 시험에 '표기형 뒤 문장부호는 같은 토막' 한 줄, 또는 지문 e2e 에 '글줄 첫 글자가 문장부호가 아님'(각 줄 첫 `Range` 의 글자) 단언.

## 맞는 것(확인 · 근거)

| 볼 것 | 판정 | 근거 |
|---|---|---|
| 기다림 표시가 누른 카드 바로 아래 · 보는 창 안(세로) | 맞음 | 위 M-1 행. 판이 보는 창을 넘는 집(수업 24장, `CROWDED_LESSONS` `writing.spec.ts:1015`)에서 찍힘 — 앞 보고가 요구한 '실시드 수 흉내' 그대로 |
| 가로 방향도 같음 | 맞음 | `p11-lesson-start-wait-landscape` 점 셋 297~314px/820, `-still-reading-landscape` 세 줄 아래 끝 368px/820 — 누른 카드 1 바로 아래 · 가운데 |
| 점 셋 · 안내 줄 크기 · 문구 · 해요체 | 맞음 | 점 16px × 3 · 간격 12px(`wait-hint.tsx` DOTS · size-4 · gap-3), 안내 20px(Gowun, 글자 높이 37화소), 문구 `LESSON_START_TEXT.stillReading` 글자 그대로(앞 보고 '아직 글을 살펴보고 있어요' 행 · plan 값 9), 한 화면 한 행동(수업 고르기) 그대로 |
| '여기부터 해요' 카드 폭 그대로 | 맞음 | `col-span-2` 를 칸으로 옮겨도(`lesson-board.tsx:193`) 세로 722화소 = 361px(두 칸 172 × 2 + 16) · 가로 546화소 = 273px(131 × 2 + 12). 나머지 카드 세로 344화소(172px) 네 칸 · 가로 260화소(130px) 여섯 칸 — 격자 변화 없음. 띠 · 굵은 테 그대로 |
| 쪽지를 거친 고르기 | 맞음(코드로만) | `askedAt`(`:120 · :157 · :276`) → 확인 뒤 `setWaitAt(askedAt.current)`(`:406`) — 하던 수업을 묻고 새 수업을 열 때도 그 카드 아래. 사진 없음 |
| 첨삭이 오면 둘째 세션 | 맞음 | e2e `writing.spec.ts:1079-1088`(`/session/` · `feedback-praise`, 첨삭 요청 1). `claimed` 집은 요청 0 · 목록에 머묾(`:1107-1111`) |
| 영어 글 Fredoka — 화면별 | 맞음 | 2배 잘라냄 다섯(위 X-1 행) + 눈으로 본 사진: `p11-reading-level1-passage-portrait`('This is bababa and bebaba.') · `p11-reading-passage-sheet-portrait`(쪽지 글 7줄) · `p11-reading-word-note-portrait`(낱말 쪽지 '가상 낱말 4-1' 은 `lang="ko"` `reading.tsx:212` 라 Gowun — 맞음) · `p11-speaking-repeat-portrait`('bababa' 36px 굵게) · `p11-speaking-question-portrait`('What do you see?' 굵게) · `p11-writing-1-copy-tiles-portrait`('bebaba' + 글자 타일 a · b · e) · `p11-writing-3-assemble-sentence-portrait`(낱말 카드 the · kabuba · like · i · .) · `p11-writing-4-task-portrait`('I like the madeba.' + 단어 상자 7) · `p11-writing-5-write-portrait`(빈칸 줄 셋, 입력란 글 Fredoka) · `p11-writing-6-rewrite-{portrait,landscape}`(교정 칩 '원문 → 수정' 둘 한 줄 · 입력란) · `p11-writing-6-draft-long-landscape`(45단어 8줄) — 모두 한 층 'a' |
| Fredoka 로 넘침 · 줄바꿈 변화 | 맞음(N-3 빼고) | 158장 화소 크기 전수: 보는 창(1640 × 2360 · 2360 × 1640)과 다른 사진은 목록 넷(전제상 긴 쪽)뿐 — 영어 화면 154장은 두 방향 모두 보는 창 안(앞 보고 참고 7 닫힘). 긴 초고 가로 8줄 안에 다 보이고 안에서 넘기지 않음, 4단계 단어 상자 6 + 1 두 줄, 교정 칩 둘 한 줄(세로 736px 안), 글자 · 낱말 타일 56px 그대로(크기 고정) |
| `lang="en"` 안 한국어 | 맞음(없음) | 아이 화면 `lang="en"` 29곳(`src/components` · `src/app/(child)` · `(setup)`)을 훑어 한국어 글이 든 곳 없음(주석뿐). 낱말 쪽지는 `lang="ko"` 로 되돌림. 구현자 말대로 개발용 시드 보기만 |
| 영어 이름 입력란(`font-en`) 과 겹침 | 맞음(코드로만) | `first-run-flow.tsx:449 · 463 · 471 · 486` — `lang="en"` + `font-en` 이 같은 토큰 `--font-en`(`globals.css:32`)이라 값이 같다. 사진 없음(첫 실행은 이번 세트 밖) |
| `:lang(en)` 과 글꼴 유틸리티 충돌 | 맞음(없음) | `lang="en"` 요소에 `font-heading` · `font-sans` 를 함께 쓴 곳 없음(grep). `font-bold` 는 굵기라 무관 |
| 시험용 제목 'reading 1단계 수업 1' 의 라틴 글자 | 맞음(규칙대로) | 제목은 `lang` 없는 한국어 띠(Jua)라 영어 낱말도 Jua 로 — 시험용 시드 제목이고 실시드 제목은 한국어 |

## 열린 장부 판정(`ledger-open.md`)

| 항목 | 판정 | 근거 |
|---|---|---|
| 98행 영어 글꼴 Fredoka 미적용(fix 8b 로 고침, 전체 디자인 리뷰 때 전수 확인) | **닫힘(fix 8b 몫)** | `globals.css:152-155` + 글자 꼴 다섯 잘라냄 + 영어 화면 열여섯 사진 + e2e `font-size.spec.ts:251-300`. 꼬리 '전수 확인'은 이번에 읽기 · 말하기 · 쓰기 1 · 3 · 4 · 5 · 6 · 둘째 세션 화면을 봤으니 남은 것은 첫 실행 영어 이름 입력란(사진 없음)과 회화 화면(P13)뿐 — 전체 디자인 리뷰 때 그 둘만 |
| 앞 보고 M-1(장부 행 없음 — 차례 7 Minor) | **닫힘** | 위 M-1 행. N-1 · N-2 는 새 Minor 로 따로 적음(fix 묶음 또는 전체 디자인 리뷰) |
| 89행 요청자 지적 카드 폭 · 90행 전체 디자인 리뷰 | 아직 열림(범위 밖) | 이번 범위 아님. 아래 참고 |

## 참고(전체 디자인 리뷰로 넘길 관찰 — 지적 아님)
1. 앞 보고 참고 1~6 그대로. 참고 7(Fredoka 뒤 넘침 다시 보기)은 이번에 확인해 닫힘.
2. **쓰기 5단계 빈칸 줄의 마침표가 입력 상자와 떨어져 보인다**(`p11-writing-5-write-portrait` 'and the [modeba] .') — 토막 사이 간격이 문장부호 앞에도 들어간다. 글꼴과 무관(Gowun 때도 같은 구조). N-3 과 같은 '문장부호는 앞 낱말에 붙임' 규칙으로 함께 보면 좋다.
3. **수업 고르기 실패 뒤 고른 표시가 남는다**(N-2 에 적음) — 오류 줄을 카드 아래로 옮길 때 `selected` 도 되돌릴지 함께.
4. **첫 줄 카드가 늘어나는 꼴**(N-1)은 기다림 점 셋 상태(+48px)에서는 두어도 되지만, 전체 리뷰에서 '카드 높이는 내용이 정한다'는 원칙을 세우면 N-1 (가)가 자연스럽다.
