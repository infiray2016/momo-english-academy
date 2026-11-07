# 화면 검토: P11b 차례 5 — AI 길 · 쓰기 4~5 확인 · 기다림 표시 · 안전 상한 안내(design-reviewer des-p11c · Fable · max, 2026-10-22)

## 판정: Changes requested — Critical 0 · Important 1 · Minor 6

쓰기 4~5 의 흐름(과제 → 문장 전부 한 화면 → '다 썼어요' → 같은 화면 확인 → 고칠 곳 하나 → 보기 2~3 → '잘 고쳤어요!' → 내 문장 듣고 따라 말하기), 기다림 표시(즉시 점 셋 · 둘째 값 뒤 '확인하고 있어요' · 타임아웃 뒤 넘어감), 안전 상한 안내('토리가 잠깐 쉬어요. 다른 공부를 해 볼까요' + '홈' 하나)는 정본 3.3 · 4절 · 8절 · C50 (2) · C77 (6) · C80 · plan 값 6 · 7 · 문구 표 b 행과 맞는다. 글자 크기(안내 20 · 영어 24 · 단추 24 · 안내 제목 28 · 따라 말할 글 36px)와 누르는 곳(56px)은 화소로 재어 모두 안이고, 사진 36장 모두 보는 창 크기 그대로다(두 방향 넘침 없음). 고칠 것은 하나다 — 5단계 문장 쓰기 화면에 예시문이 없다(4절 '예시문 아래 바꿀 칸만'). 지난 재검토의 N-1 은 닫혔고 N-2 는 12px 로 다시 재어 Minor 로 남긴다.

대조 자료: CI 10차 사진 `scratchpad/p11-photos-8`(109장 — 이번 몫 `p11-writing-4-*` · `-5-*` 24장 · `p11-wait-*` 6장 · `p11-ai-rest-list-*` 2장 · `p11-speaking-listening-on-*` · `-repeat-close-*` · `-together-*` 6장, 세로 1640 × 2360 · 가로 2360 × 1640 — 쪽 전체 찍기 `tests/e2e/photos.ts:27` 라 쪽이 보는 창보다 길지 않음) · 워크트리 p11(HEAD 726198f + 미커밋) `src/components/session/{writing-guided,wait-hint,ai-rest,speaking}.tsx` · `src/components/answer/speak-button.tsx` · `src/components/activities/{common,writing}.tsx` · `src/components/board/board.tsx` · `src/app/(child)/session/[id]/session-frame.tsx` · `src/app/(child)/[area]/lessons/{lesson-board,past/page,past/past-lessons}.tsx` · `src/app/(child)/result/[id]/result-view.tsx` · `src/server/writing/index.ts` · `src/core/ai/calls/writing.ts` · `src/core/seed/structure.ts` · `tests/e2e/{writing,timeout}.spec.ts` · `tests/fixtures/seed/builders.ts` · 정본 4절(`specs/03-화면.md` 7 · 18 · 43 · 63행) · 3.3(`specs/02-2-세션과-단계표.md` 33~34 · 47~48 · 57행) · 6.2(`specs/05-AI-호출.md:50`) · 8절(`specs/07-음성과-오류.md` 43 · 49 · 56행) · 13절 C16 · C50 · C77 · C78 · C80 · C82 · plan-p11b 값 6 · 7 · 'AI 실패 갈래별 화면 길' 표 · 정할 것 ㄴ · ㄷ · plan-p11a 정본 밖 문구 표 b 행(185~187행) · 목업 `docs/media/mockups/B_Writing.dc.html` · `B_Writing2.dc.html`(확인 화면) · 구현 보고 '차례 5' 절 · `review-p11-4-design.md` · `review-p11-fix4-design.md` · `ledger-open.md`. 글자 · 단추 크기는 사진을 BMP 로 바꿔(sips) 표준 라이브러리로 화소를 세어 쟀다(CSS px = 화소 ÷ 2). 보조 스킬(`ui-ux-pro-max` 접근성 · 터치 항목, `design-taste-frontend` critique · tells)은 '참고' 절에만 적었다.

## Important

### I-1. 5단계 문장 쓰기 화면에 예시문이 없다
- 근거(사진): `p11-writing-5-write-portrait` · `-landscape` — 첫 줄 과제 글('그림을 보고 단어 상자에서 골라 문장을 완성해요.') 아래 문장 틀 셋(입력란)뿐이다. 예시 'I like the madeba.'는 앞 활동 `p11-writing-5-task-*` 에만 있어, 아이가 자판으로 쓰는 동안에는 보이지 않는다.
- 정본: 4절 쓰기 세션 행(`specs/03-화면.md:18`) "4단계는 문장 틀과 단어 상자, 5단계는 예시문 아래 바꿀 칸만 기기 자판으로 입력". 3.3 과제 표 5단계(`02-2:48`) "예시문을 보고 바꿀 칸만 써서 문장 완성", 3.3 세션 순서(`02-2:34`) "예시문의 바꿀 칸만 자판으로 쓰기". 세 곳 모두 아이가 쓰는 동안 예시문을 보는 꼴이다.
- 코드: `src/components/session/writing-guided.tsx:122-152` `GuidedWritingActivity` 는 `example` 을 받지 않고, `:309` 첫 줄은 과제 글이다. `session-frame.tsx:640-660` 연결도 예시문을 넘기지 않는다. plan-p11b 값 7(79행)도 문장 쓰기 화면에 예시문을 적지 않아 plan 의 빈틈이다 — 정본이 이긴다(4절 둘째 문단 "목업과 이 문서가 다르면 이 문서가 이긴다", plan 은 정본 아래). 컨트롤러가 받은 '다르게 한 것 3'(첫 줄은 과제 글)은 첫 줄에 대한 것이지 예시문을 빼도 된다는 뜻이 아니다.
- 왜 중요한가: 5단계는 아이가 처음으로 기기 자판으로 낱말을 직접 쓰는 단계다. 4단계는 단어 상자가 빈칸에 들어갈 말을 보여 주지만, 5단계에서 그 몫은 예시문(빈칸 자리에 어떤 종류의 말 — 이름 · 수 · 음식 — 이 들어가는지 보여 주는 본보기)이다. 지금은 앞 화면의 기억에 기대야 한다.
- 고치는 법: `input === "slot"` 이면 문장 틀 위에 '예시'(문구 표 b 행 글자 그대로, `writing.tsx:151` 과 같은 꼴) + `EnglishLine` 예시문을 둔다(write · checking 단계. result 단계는 과제 줄처럼 숨겨도 된다). 4단계도 목업 B_Writing(예시 쪽지가 문장 틀과 한 화면, 57행)대로 함께 보여도 된다(선택 — 4절은 4단계에 요구하지 않음). 선 위 검증: `tests/e2e/writing.spec.ts` 5단계 쓰기 화면에서 `content.example` 보임 단언(412~433행 자리)과 그 뒤 `fitsBothWays` 그대로.

## Minor

### M-1. 5단계 입력란 폭이 160px 로 고정돼 긴 답이 가려진다
- 근거(사진 · 측정): `p11-writing-5-write-portrait` 입력란 폭 320화소 = 160px, 'madeba' 여섯 글자가 150화소 = 75px. 코드 `writing-guided.tsx:353` `w-40` 고정. 4단계 칸은 `:119` `min-w-36` 이라 글에 맞춰 늘어난다. 목업 `B_Writing.dc.html:68 · 80 · 92` 의 빈칸은 `min-width: 170px` 로 늘어나는 칸이다.
- 영향: 3.3 5단계의 바꿀 칸이 두 낱말 이상이면('ten years old' 13자, 24px Fredoka 로 약 160px) 안쪽 폭 136px(px-3)을 넘어 앞 글자가 가려진 채 스크롤된다. 아이가 자기가 쓴 말을 한눈에 못 본다.
- 고치는 법: `min-w-40` 으로 바꾸고 글 길이에 따라 늘린다(`field-sizing: content`, 또는 `size={Math.max(8, value.length + 2)}`).

### M-2. 5단계 입력란의 초점 표시가 브라우저 기본 2px 파랑이라 하늘 바탕에서 거의 안 보인다
- 근거(사진 · 측정): `p11-writing-5-write-portrait` 셋째 입력란 둘레에 4화소(2px) #4994E9(73 · 148 · 233) 고리. 하늘 바탕 #9FD8FF 와 대비 약 2.1 : 1. 코드 `writing-guided.tsx:116-120` `BLANK_FRAME` 에 초점 꼴이 없다. 단추는 `board.tsx:99-100` `FOCUS_RING`(먹색 4px 점선 · offset 4)을 쓴다.
- 영향: 빈칸이 문장마다 1~2개 × 3~4문장이다. 지금 글자가 어느 칸에 들어가는지 아이가 알기 어렵다(4절 '큰 글자와 큰 버튼' 취지).
- 고치는 법: 입력란에 `focus:outline-4 focus:outline-offset-4 focus:outline-dashed focus:outline-ink`(FOCUS_RING 의 focus 판 — 글 입력란은 늘 focus-visible 이라 같다) 또는 채워진 칸처럼 테를 굵게.
- 참고: WCAG 2.2 focus-appearance 3 : 1(ui-ux-pro-max 접근성 항목).

### M-3. 과제 화면의 단어 상자 칩이 누르는 칩과 같은 꼴인데 눌리지 않는다
- 근거(사진): `p11-writing-4-task-*` 칩(종이 · 먹색 2px 테 · 56px · 24px 굵게) ↔ `p11-writing-4-write-*` 칩(같은 꼴, 누르면 빈칸으로). 코드: 과제 화면은 P5b 표시용 `TileRow`(`common.tsx:238-260`, `aria-disabled="true"`, `writing-guided.tsx:87`), 쓰기 화면은 `button` 칩(`writing-guided.tsx:381-396`).
- 정본: 4절 첫 문단 '한 화면에 행동 하나' — 과제 화면의 행동은 '다음'인데, 누르는 꼴의 칩 일곱이 먼저 눈에 들어와 눌러 봐도 반응이 없다.
- 고치는 법: 과제 화면에서는 테 · 그림자 없는 글 줄(24px `lang="en"`)로 보이거나, 누르면 읽어 주게 한다(목업 `B_Writing.dc.html:124` '단어를 길게 누르면 발음을 들려줘요' — 새 동작이라 컨트롤러 판단).

### M-4. 고칠 곳의 '한 문장 이유'가 화면 어디에도 없다(컨트롤러 판단 요청)
- 근거: 6.2 쓰기 확인 행(`specs/05-AI-호출.md:50`) 출력 "고칠 곳 최대 1개(원문 · 바른 표현 · 헷갈리는 보기 1~2개 · 한 문장 이유)". 규격 `src/core/ai/calls/writing.ts:53` `reason`("Korean, one sentence, 해요체")은 필수 칸이다. 화면 쪽 `GuidedFix`(`src/server/writing/index.ts:42-50`)에 reason 이 없어 사진 `-options` · `-fixed` 어디에도 이유 줄이 없다. 목업 `B_Writing2.dc.html:91` 은 이유 줄('강아지가 여러 마리면 dogs! 뒤에 s 를 붙여요.')을 둔다.
- 3.3 4단계 행과 4절은 이유 표시를 적지 않아 정본 어긋남은 아니다. 다만 아이는 보기를 골라 맞힐 뿐 왜 틀렸는지 듣지 못한다(틀리면 '다시 골라 볼까요'만).
- 컨트롤러 판단: '잘 고쳤어요!' 아래 이유 한 줄(AI 글 · 해요체, 아이 이름 가림은 P9c 몫)을 보일지. 보이면 `GuidedFix` 에 reason 을 더하고 고친 뒤에만 보인다(4절 '한 번에 하나만'). 13절 또는 문구 표에 한 줄.

### M-5. 지난 수업 쪽의 안전 상한 안내에 띠 '수업 목록' 링크가 남는다(코드로만)
- 근거: `src/app/(child)/[area]/lessons/past/page.tsx:53` 띠 오른쪽 `SmallLink` '수업 목록'은 서버에서 늘 그려지고, `past-lessons.tsx:26-31` 은 resting 이면 안내만 바꿔 그린다. 수업 목록(`lesson-board.tsx:235-247`) · 세션(`session-frame.tsx:813-829`) · 결과(`result-view.tsx:49-52`)는 띠 단추를 숨겨 '홈' 하나다.
- 정본: 4절 수업 목록 'AI 쉬는 중' 행(`specs/03-화면.md:63`) "누르면 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 '홈' 버튼을 보인다". 구현자 보고도 '안내 + 홈 하나'.
- 고치는 법: `PastLessons` 가 띠를 함께 그리거나 resting 을 쪽으로 올려 띠 오른쪽을 비운다. 사진 없음(e2e 는 목록만 찍음).

### M-6. (fix 4 N-2 이어서, 고르기) '한 번 더 말하기'의 오른쪽 끝이 내용 끝보다 12px 안쪽이다
- 근거(사진 · 측정): `p11-speaking-repeat-close-portrait` 점선 칸 오른쪽 테 x = 1492~1495 ↔ 단추 오른쪽 끝 x = 1471 → 24화소 = 12px(가로 사진도 25화소). 코드 `speak-button.tsx:67-83` 바깥 `p-2`(8px) + 안 `p-1`(4px). `p11-speaking-listening-on-*` 에서 먹색 고리 16화소(8px) · 분홍 틈 8화소(4px)가 양쪽에서 그 자리를 꼭 채운다(x 636~651 · 652~659 · 980~987 · 988~1003). 단추 높이는 듣기 전 · 듣는 중 모두 112화소(56px).
- 지난 검토 6px → 지금 12px. 아이 눈에는 여전히 작지만, 같은 줄의 '다음'(종이 단추)은 내용 끝에 붙어 두 단추 줄이 들쑥날쑥하다.
- 고치는 법(고르기): 바깥 span 에 `-m-3`(고리 자리만큼 음수 여백) + `speaking.tsx:245` 줄의 `gap-4` → `gap-7`. 보이는 간격은 지금과 같은 28px, 단추 끝은 내용 끝에 맞고, 듣는 중 고리는 카드 안쪽 여백(32px)으로 12px 나가며 '다음'과 16px 남는다(구현자 우려 '옆 단추 쪽으로 넘음' 없음). 가운데 놓인 '말하기'(세션 · 쓰기)는 바뀌지 않는다.

## 맞는 것(확인 · 근거)

| 볼 것 | 판정 | 근거 |
|---|---|---|
| 1 과제 화면 | 맞음(M-3 빼고) | `p11-writing-4-task-*` · `-5-task-*`: '과제' · '예시' 이름표 20px 굵게(35화소, `writing.tsx:146 · 151`), 과제 글 20px(37화소), 예시 영어 24px(37화소 — 확인 화면의 24px 문장과 같음), 4단계 '단어 상자' 칩 일곱 = 모든 문장 낱말 한 상자(컨트롤러 받음 — 다르게 한 것 2), 5단계 상자 없음(e2e 404~406행). 시드 hints · rubric 없음(e2e 407~408행). '다음' 56px(112화소). 글꼴 Jua(제목) · Gowun Dodum(안내) · Fredoka(영어) |
| 2 문장 쓰기 | 맞음(I-1 · M-1 · M-2 빼고) | `-4-write-*`: 문장 전부 한 화면 · 한 제출(C77 (6)), 빈칸 칸 144 × 56px(288 × 112화소, `:119` min-w-36 · min-h-14), 칩 56px, 칩 → 그 문장의 첫 빈칸(`:191-195`), 놓인 낱말 누르면 돌아감(`:356-369`), 가로는 문장 옆 상자(`:323`). `-5-write-*`: 입력란 56px, autoComplete · autoCorrect · autoCapitalize off · spellCheck false · lang en(`:340-354`, e2e 423~428행), 4단계엔 기기 자판 요소 없음(e2e 420행). '다 썼어요'는 다 채워야 켜짐(`:476`, e2e 417~431행). 두 방향 모두 보는 창 크기(사진 36장 전부 1640 × 2360 · 2360 × 1640) |
| 3 확인 결과 | 맞음(M-4 빼고) | `-4-check-*` · `-5-check-*`: 같은 화면(`data-activity` 그대로, e2e 438행), 칭찬 한 줄(✓ 표 `StatusLine tone ok`), 고칠 곳 하나만 색칠(노랑 칸 100 × 60px, `:286-297`), '색칠한 곳을 눌러 고쳐 봐요', '다음' 없음. `-options-*`: '알맞은 말을 골라요' + 보기 셋(바른 표현 + 거리 보기 — `structure.ts:646-648` FIX_MAX 1 · DISTRACTORS 1~2 → 2~3개, 차례는 시도 id `rotationOf` `index.ts:70-74`). `-fixed-*`: 고친 낱말 굵게 밑줄(`data-fix-done`) · '잘 고쳤어요!' · '다음'. 퍼센트 · 문장별 맞음 표시 없음(6.2 '화면에는 고칠 곳 1개만'). 쓰기 4~5 피드백 한도(3.3 '고칠 곳 최대 1개'): 서버 `fixes.find` 하나(`index.ts:82-87`) + 규격 `fixes.max(1)`(`writing.ts:64-67`) |
| 4 내 문장 듣고 따라 말하기 | 맞음 | `-4-own-*` · `-5-own-*`: '내 문장을 듣고 따라 말해 봐요' 20px, '다시 듣기', 고친 문장 36px 굵게(57화소 — 따라 말하기 목표와 같은 크기), '말하기' 56px 가운데, '건너뛰기' 작은 단추 56px(활동 전체 건너뜀 — 다르게 한 것 9, 컨트롤러 받음). 고리 틈은 하늘(`WRITING_CARD_GAP` `:60 · 551`, 코드로만). 마이크 막힘은 이 활동만 건너뜀(`session-frame.tsx:405-406`). 처음 마이크 안내는 `p11-wait-timeout-next-*` 에 하늘 카드로 보임('말한 소리는 인터넷으로 보내 글자로 바꿔요. 소리는 저장하지 않아요' 28px + '알겠어요') |
| 5 기다림 표시 | 맞음 | `p11-wait-hint-*`: 점 셋(16px 먹색, bounce · motion-reduce 멈춤 `wait-hint.tsx:47-55`) 즉시, 한 줄 없음(e2e 92~95행), '다 썼어요' 사라짐. `p11-wait-line-*`: 둘째 값 뒤 '확인하고 있어요' 20px(38화소 = 과제 줄과 같음, `:57`). `p11-wait-timeout-next-*`: 타임아웃 뒤 넷째 활동으로 넘어감 · 고칠 곳 없음(e2e 124~132행) — plan 'AI 실패 갈래별 화면 길' 쓰기 확인 행 · 8절 56행 · 4절 첫 문단 글자 그대로 |
| 6 안전 상한 안내 | 맞음(M-5 빼고) | `p11-ai-rest-list-*`: '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요' 28px 제목 글꼴(49화소), '홈' 하나 56px(112화소) 가운데, 띠 '홈' 없음(e2e 574~577행), 세션 안 열림 · AI 호출 0(e2e 580~583행). 세션 도중(`session-frame.tsx:789-791`, 띠 '홈' 숨김 `:813-829`, '홈'이 세션을 진행으로 남김 `:541`) · 결과(`result-view.tsx:66-68`)는 코드로만. C50 (2) · C80 · 8절 43 · 49행('버튼이 없다' = 다시 시도 단추 없음, '오늘은 끝' 없음) 글자 그대로 |
| 7 N-1 · N-2 다시 재기 | N-1 닫힘 · N-2 열림(M-6) | `p11-speaking-together-portrait`: 바른 답 'I see a bababa.' 57화소(36px) > 질문 'What do you see?' 53화소(28px, 디센더 포함) — `speaking.tsx:476 · 484-486`. N-2 는 M-6(12px) |
| 8 크기 · 색 · 틀 · 문구 · 이름 | 맞음 | 하늘 쓰기 카드 · 끝낸 활동 점 하늘 · 현재 점 먹색(큰). 문구는 `WRITING_GUIDED_TEXT`(`:42-55`) · `WAIT_TEXT`(`wait-hint.tsx:10`) · `AI_REST_TEXT`(`ai-rest.tsx:8-11`)가 plan-p11a 문구 표 b 행 · 4절 · C50 (2) 글자 · 토씨 그대로, 해요체. '다시 골라 볼까요'는 코드로만(`:451`). 아이 이름 없음 — 'Momo' 는 견본 틀의 글자(`builders.ts:1558` "We can ___ with Momo.")이지 아이 이름이 아니고, '쓰기 4단계 첫 수업' · 'madeba…' 는 알려진 견본 |

## 열린 장부 판정(`ledger-open.md`, 화면 몫)

| 항목 | 판정 | 근거 |
|---|---|---|
| 34행 'P11b · c: … 4~5단계 제출 단위' | **4~5단계 제출 단위 닫힘** | `-4-write-*` · `-5-write-*` 문장 전부 한 화면 · '다 썼어요' 한 번(C77 (6)). 같은 행의 생각 꺼내기 historyEntry · 쓰기 6단계 생각 꺼내기 결과 자리 · 말하기 6 · 8 그림 차례 → 아직 열림(차례 6 · c) |
| 45행 'P11 은 AiOutcome 실패 갈래마다 화면 길' | **쓰기 확인 행 닫힘** | timeout → 확인 없이 넘어감(`p11-wait-timeout-next-*`), safety_cap → 안내(`p11-ai-rest-list-*`), 코드 skipped · ai_resting · not_found · unavailable 갈래(`writing-guided.tsx:231-245`), 끊김은 online 때 같은 시도 id(`:248-256`). 생각 꺼내기 · 첨삭 행 → 아직 열림(차례 6 · 7) |
| 22행 '고칠 곳 최대 1 을 넘는 시드 값 검사 없음' | 아직 열림(2차 · P8) | 화면은 `WRITING_CHECK_FIX_MAX = 1` 과 `fixes.find` 로 1개 상한이라 넘칠 수 없음 — 시드 · 설정 키 쪽만 남음 |
| review-p11-fix4-design N-1(바른 답 36px) | 닫힘 | 위 표 7 |
| review-p11-fix4-design N-2(오른쪽 끝 안쪽) | 아직 열림(M-6, 6 → 12px) | 위 M-6 |
| 57행 수업 목록 넘침 · 52행 배치 전 카드 누름 표시 | 이번 범위 밖 | 그대로 |

## 사진 없음 — 코드로만 본 것
- 빈칸이 빈 상태(아래 테 점선 `writing-guided.tsx:364`, 사진은 모두 채운 뒤) · '다 썼어요' 꺼진 상태 · 틀린 보기 ✕ + '다시 골라 볼까요'(`:438-452`) · 고칠 곳 없는 확인(칭찬 + '다음' `:458-465`) · 끊김 안내 · 저장 실패 줄(`:217-221 · 244`) · 세션 도중 · 결과 · 지난 수업의 안전 상한 안내 · 쓰기 카드 위 듣는 중(하늘 틈).
- 다음 CI 에서 빈칸 빈 상태(채우기 전) · 틀린 보기 뒤 · 세션 도중 안전 상한을 한 장씩 더 찍기를 권한다(막지 않음).

## 참고(보조 스킬 · 목업 — 지적 아님)
- 확인 결과가 오면 과제 줄이 사라져(`:309`) 문장 줄이 약 60px 위로 뛴다(`p11-wait-line-*` ↔ `-check-*` 비교; ui-ux-pro-max content-jumping). 과제 줄을 결과 단계에도 두면 멈춘다.
- 기다리는 동안 빈칸 칸이 꺼지지만(`:360`) 꼴이 그대로다 — 5초 안이라 작음(loading-buttons).
- 색칠 칸이 읽기 포스트잇 토큰(`bg-postit-reading`, `:293`)을 쓴다. 보이는 색은 목업의 노랑과 같아 화면 문제는 아니고 토큰 이름만이다(`highlight` 같은 이름으로 나누면 뜻이 맞음).
- 입력란 aria-label 이 모두 '빈칸'(`:343`) — 보조 기술이 칸을 가르지 못한다(문장 n · 빈칸 m).
- 실시드(5단계 3~4문장 · 긴 틀)의 두 방향 높이는 P8 뒤 다시(견본은 3문장 · 빈칸 넷).
- 목업 B_Writing2 의 '두 문장 맞았어요! 하나만 바꾸면 별 3개' · '별 받기' · '새로 만난 단어 … 단어장' · B_Writing 의 '자판으로 써도 돼요'(4단계)는 정본(6.2 '화면에는 고칠 곳 1개만' · 4절 퍼센트 금지 · 4단계 단어 상자만 · 3.3 순서)이 이겨 안 보이는 것이 맞다. 칩의 한국어 뜻(목업 `B_Writing.dc.html:114-120`)은 정본에 없어 지적하지 않는다.
- design-taste 'tells' 목록(그라디언트 · 번호 라벨 · 모노 캡션 · 얇은 선 등)에 걸리는 것 없음. 포스트잇 보드 · 정본 4절이 우선.
