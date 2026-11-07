**판정: Approved — Critical 0 · Important 0 · Minor 6.** 지난 fix 묶음 #1~#5 · #7~#11 은 전부 ADDRESSED, 덧 #12~#18 도 ADDRESSED(단 #15 의 '빈 띠 40px' 은 배치 전 카드에서 145px 로 남아 구현자가 '정할 것'으로 둔 그대로 — N-2). C114(같은 종류 종이 크기 · 같은 줄 아래 끝 · 한 판 한 간격)는 홈 두 방향 · 목록 · 지난 수업 · 24장 집에서 측정으로 맞음. 새 Minor 여섯은 고침이 낸 것 셋(N-1 홈 세로 섞인 줄 높이 · N-3 회화 세로 띠 빈 줄 · N-4 지난 수업 가로 시작점)과 새 사진에서 처음 보인 것 셋(N-2 배치 전 빈 띠 — 정할 것 · N-5 첫 실행 스크린 타임 길 꼴 · N-6 배치 문항 가로 '몰라요' 보는 창 밖)이며 어느 것도 막지 않는다. 다음 작은 묶음 하나로 간다.

# 화면 재검토: 전체 디자인 리뷰 2 — 디자인 fix 1~1d 범위 한정(des-all · design-reviewer · Fable · max · 2026-10-23 05:xx)

대상: 워크트리 p13 작업 트리(CI 17차 스냅숏 dc82db2 와 같음 — 디자인 fix 1 · 1a · 1b · 1c · 1d + 회화 느낌 고침). 사진: CI 17차 e2e 227장 `scratchpad/p13-photos-7`(지난 리뷰 p13-photos-4 194장 + 새 33장: 첫 실행 8 × 2 · 배치 4 × 2 · 홈 기본 2 · 목록 기본 2 · 지난 수업 2 · 가로 15장 집 1). 브리프 `task-design-review-all-2.md`, 고침 브리프 `task-design-fix-1.md`(#1~#5 · #7~#11 · 덧 #12~#18), 구현 보고 `task-p13-report.md` '디자인 fix 1' · '1a' · '1b' · '1c' · '1d' 절. 기준: 정본 4절 · 13절 C82 · C111 · C112 · C114 · plan-p11a 정본 밖 문구 표(184~185행) · 포스트잇 보드 · 아이 화면 원칙이 먼저, 보조 스킬(taste `app-screens.md` §4.1 · §4.2 · §11, ui-ux-pro-max §1 · §2 · §3 `content-jumping` · §7)은 그와 부딪치지 않는 것만. 스크립트는 돌리지 않았다.

방법: 227장 크기 전수(`scratchpad/p13-measure-all/dims.py`), 사진 47장을 눈으로(홈 6 · 목록 7 · 지난 수업 2 · 회화 19 · 말하기 막힘 3 · 읽기 지문 · 쓰기 5단계 · 첫 실행 5 · 배치 3 · 쉼 1), 카드 크기 · 줄 끝 · 틈 · 빈 띠는 BMP 로 바꿔 표준 라이브러리로 쟀다(`scratchpad/p13-measure-all/v7meas3.py` — 카드 색 화소의 bbox · 중간 줄 폭 · 아래 변 기울기로 기울기 보정한 폭 · 높이 · 회전 전 네 변, 단추는 먹색 세로 띠, 빈 띠는 단추 위 ±20px 띠의 어두운 화소; 기기 px ÷ 2 = CSS px, 오차 ±1px, 기울기 ±2° 카드의 위 여백만 ±7px). 글자 꼴은 2배 잘라냄 다섯(`v7/crops/badge-landscape.png` · `badge-portrait.png` · `answers-marks.png` · `w5-focus.png` · `firstrun-box.png`). 코드 · 사진 · 문서는 고치지 않았다.

## 0. 전수와 셈

| 볼 것 | 결과 | 근거 |
|---|---|---|
| 두 방향 넘침(227장) | 가로 넘침 0. 보는 창보다 긴 사진 아홉 — 목록 24장 집 넷(`p11-lesson-start-wait` 세로 +296 · 가로 +148, `-still-reading` 세로 +288 · 가로 +140: 24장이라 전제상 긴 쪽, 지난 리뷰보다 세로 −56 · −80), `p11-home-feedback-portrait` +16(새 — 알림 포스트잇 + 두 줄 492 · 400), `p13-talk-confirm-landscape` +32 · `p13-talk-hint-portrait` +8(지난 리뷰 0절과 같음, 고침과 무관), `first-run-mic-landscape` +24(부모용 상자 줄 둘 더함), **`placement-item-landscape` +96(새 — N-6)** | `dims.py` 출력 |
| 격자 셈(#18) — 보고의 셈 줄 ↔ 사진 | 다섯 모두 맞음(아래 표) | `v7meas3.py` |

| 판 | 보고의 셈 | 측정(CSS px, 회전 전 왼쪽 끝) | 판정 |
|---|---|---|---|
| 홈 세로 | 358 × 2 + 24 = 740 | 카드 폭 358.0 · 왼쪽 끝 39.8 · 421.8(틈 24.0) · 오른쪽 끝 779.8 → 판 40~780 | 맞음 |
| 홈 가로 | 257 × 4 + 72 = 1100 | 폭 257.0 · 왼쪽 끝 39.8 · 320.8 · 601.8 · 882.8(틈 24.0) · 오른쪽 끝 1139.8 → 40~1140 | 맞음 |
| 목록 세로 | 168 × 4 + 16 × 3 = 720(여백 10 · 10) | 폭 168.0 · 왼쪽 끝 49.8 · 233.8 · 417.8 · 601.8(틈 16.0) · 오른쪽 끝 769.8(`p11-lesson-start-wait-portrait` 네 칸) → 여백 9.8 · 10.2 | 맞음 |
| 목록 가로 | 130 × 6 + 12 × 5 = 840(여백 2 · 2) | 폭 130.0 · 왼쪽 끝 41.8 … 751.8(틈 12.0) · 오른쪽 끝 881.8(`lesson-list-landscape-15-landscape` 여섯 칸) → 여백 1.8 · 2.2 | 맞음 |
| 지난 수업 세로 · 가로 | 720(10 · 10) · 130 × 7 + 12 × 6 = 982(59 · 59) | 세로 168.0 · 49.8 · 233.8 · 417.8(틈 16); 가로 130.0 · 98.8 · 240.8 · 382.8(틈 12) → 왼쪽 여백 58.8 | 맞음(가로 시작점은 N-4) |

## 1. 지난 fix 묶음 #1~#5 · #7~#11 판정

| # | 지적 | 판정 | 근거(사진 · 파일:줄) |
|---|---|---|---|
| 1 | M-1 회화 막힘 · 쉼 안내가 코르크 위 | **ADDRESSED** | `p13-talk-needs-mic-portrait`: 종이 판(40~780) + 연두 테이프 위에 28px 안내 · 20px 둘째 줄 · '홈'. 코드 `follow-along.tsx` `TalkPaper`(`mx-auto max-w-2xl bg-paper px-8 py-10 shadow-postit` + 연두 테이프), `talk-frame.tsx` blocked → `<TalkPaper data-blocked>`, resting → `<TalkPaper data-talk-rest>`(쉼은 사진 없음 — 코드만) |
| 2 | M-2 세로 띠가 대화 토막에서 두 줄로 늘어 판이 56px 뜀 | **ADDRESSED**(띠 높이 고정 — 대신 N-3) | `probe.py` x=400 세로줄: greeting · dialogue · needs-mic · intro · closing-3 · today-words 모두 띠 paper 40~176(136px) 같음, 가로 여섯 장 40~120(80px) 같음. 코드 `talk-frame.tsx:1029-1036`(셈을 `detail` 로) · `:1043-1065`(그만하기 · 홈 자리를 `invisible` 로 잡아 둠), e2e `conversation.spec.ts:190-211` 띠 높이 단언 |
| 3 | M-3 가로 단추 묶음이 판 왼쪽 끝 | **ADDRESSED** | `p13-talk-greeting-landscape` · `-dialogue-` · `-resume-` · `-hint-landscape`: '말하기' + 힌트 · 잘 모르겠어요 묶음이 판 오른쪽 끝(힌트 단은 왼쪽 — `-hint-landscape` 점선 카드 둘 왼쪽). 코드 `child-turn.tsx` `lg:flex-row lg:items-start lg:justify-between lg:gap-6` · 단추 묶음 `lg:ml-auto` |
| 4 | M-4 테이프 겹침 · 색 | **ADDRESSED** | `p13-talk-today-words-portrait` · `-say-it-portrait`: 카드 테이프가 왼쪽 1/4(`follow-along.tsx` FollowCard `left-1/4`), 판 테이프는 가운데 — 위아래 겹침 없음. `p13-talk-closing-3-*` 친한 정도 카드 테이프 연두(`closing-cards.tsx` `bg-postit-talk/90`; `probe.py` x=410 세로줄 196~208px 띠가 green 으로 읽힘) · `-closing-1-*` 연두 — 회화 안 테이프 색 하나 |
| 5 | M-5 ①② 대체 글꼴 | **ADDRESSED** | `v7/crops/answers-marks.png`: 원 테(`size-8 border-2`) 안 굵은 산세리프 숫자 1 · 2(Fredoka bold) — Jua · Gowun 획과 어울림. 코드 `tori.tsx` `ANSWER_MARKS = [1, 2]` · `font-en text-[20px] font-bold` |
| 7 | M-7 문장부호 떨어짐 | **ADDRESSED** | `p11-reading-passage-portrait`: 일곱 줄 어느 줄도 문장부호로 시작하지 않음('[madeba]. The' · '[modeba]. Momo has' 처럼 상자 뒤에 붙음). `p11-writing-5-write-portrait`: 'and the [modeba].' · 'It is very [nadeba].' 마침표가 입력란에 붙음. 코드 `core/text/punctuation.ts` `splitLeadingPunctuation`, `activities/reading.tsx` tail 을 낱말 상자 안 `whitespace-nowrap`, `core/writing/guided.ts` `frameSegments` · `writing-guided.tsx` 빈칸+부호 `whitespace-nowrap` · `mr-0` |
| 8 | M-8 목록 기다림 · 안내 · 오류 줄 | **ADDRESSED** | `p11-lesson-start-wait-portrait`: 점 셋이 누른 줄 아래 한 줄 칸(줄 간격 232 = 160 + 칸), `-still-reading-landscape`: '아직 글을 살펴보고 있어요' 한 줄 칸, 같은 줄 카드 여섯 높이 159.6~160.0(1번 155 — 체크 표시가 모서리를 가려 측정 한계) — 이웃 카드 늘지 않음. 코드 `lesson-board.tsx:129`(`waitAt` 은 `selected` 와 따로) · `:179-180`(실패 때 `selected` 되돌림) · `:186-198`(기다림 · 안내 · 오류를 `LESSON_ROW` 한 줄 칸에) · `:413`(판 아래 오류 줄은 `waitAt` 없을 때만), `lesson-card.ts` `grid-flow-row-dense`. 오류 줄은 사진 없음 — e2e `lesson-list.spec.ts:540-570`(한 줄 칸이 보는 창 안 · 같은 글 한 번 · aria-pressed 되돌림 · 카드 높이 그대로) |
| 9 | I-1 · M-9 무음 모드 안내 · 스크린 타임 길 | **ADDRESSED**(문구 C111 그대로) | `p11-speaking-silent-portrait` · `-needs-mic-portrait` · `-stalled-portrait` · `p13-talk-needs-mic-portrait`: 둘째 줄 '아이패드 제어 센터에서 무음 모드를 꺼 주세요'(20px Gowun, plan-p11a 184행 글자 그대로; CI 가 iPad Pro 11 WebKit 이라 보임). `first-run-mic-portrait` · `v7/crops/firstrun-box.png`: '무음 모드를 끄면 소리가 들리고 말을 들을 수 있어요' · '스크린 타임을 쓰면 설정 → 스크린 타임 → 콘텐츠 및 개인정보 보호 제한 → Siri 및 받아쓰기를 허용해 주세요'(185행 그대로 — 꼴은 N-5). 코드 `components/session/mic-blocked.tsx`(`micBlockedLinesOf(kind, ipadSafari)` · `useIpadSafari`) · `core/speech/device.ts` `isIpadSafari` · `first-run-flow.tsx` `data-ipad-silent` · `data-ipad-screen-time`. 배치 막힘(`placement-flow.tsx` `MicBlockedText`)은 사진 없음 — 코드만 |
| 10 | M-10 aborted + 'Dictation' | **ADDRESSED**(코드만) | `core/speech/listen.ts` `DICTATION_DISABLED_CODE` · `recognitionErrorCodeOf(error, message)`(aborted + /dictation/i) · `MIC_UNAVAILABLE_CODES`, `lib/speech/browser.ts` `onerror` 가 message 를 넘김, 단위 `tests/unit/listen-end.test.ts:882-883` |
| 11 | M-11 시험 · 사진 보강 | **ADDRESSED** | (1) `writing.spec.ts` AC-4c 둘째 세션에 `fitsBothWays` 넷 (2) `p11-writing-5-task/write-portrait` 과제 글 '예시문을 보고 빈칸에 알맞은 낱말을 자판으로 써서 문장을 완성해요.' + '예시 I like the madeba.'(`lessons.ts:142`) (3) `conversation.spec.ts:190-211` 띠 높이, `lesson-list.spec.ts:238-243 · 318 · 540-570` (4) 새 사진 33장(0절) |

## 2. 덧 #12~#18 · C114 판정

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| 12 | C114 홈 영역 카드 넷 같은 높이, 목록 카드 같은 크기 | **ADDRESSED**(세로 섞인 줄은 N-1) | 홈 세로 기본 네 장 h 491.6~491.9 · 줄 1 위 132.0/131.8 아래 623.5/623.7 · 줄 2 647.9/647.8 ~ 1139.6/1139.7; 가로 네 장 519.4~520.7 · 위 131.4~132.0 아래 651.5~652.1; 배치 전 두 방향 399.4~400.6(`HOME_CARD_MIN_H` 400); 첨삭 가로 네 장 519.4~520.7(배치 전 셋이 활성 하나에 맞춰 늘어남). 목록 카드 168 × 159~160(세로) · 130 × 158.3~160(가로, 24장 · 15장 집 전부) — 줄 · 상태(여기부터 · 끝냄 · 안 해 본 · 보통)와 관계없이 같음. 코드 `home-cards.tsx:225` `items-stretch` · `:35`, `lesson-card.ts` `LESSON_CARD` `h-40` |
| 12 (fix 1a a) | '여기부터 해요' 카드도 같은 크기 — 표지 · 테두리로만 구별 | **ADDRESSED** | 세로 168 × 159.0(이웃 159.6 · 160.2) · 가로 130 × 159.5 — `col-span-2` 없음; 구별은 먹색 고리 4px(`ring-4 ring-ink`) + 표지 + 테이프 없음. 4절 55행 바뀐 글('크기는 다른 카드와 같고 표지 · 테두리로 구별')과 맞음 |
| 12 (fix 1a b) | 배치 전 홈 카드 '내 단계 찾기' 아래 끝 단추 | **ADDRESSED** | `home-find-level-*` · `p11-home-feedback-*`: 먹색 단추(54~55px — 기울기 보정 전, 56) 카드 아래 끝 21~27px 위(p-6 24 ± 기울기), 네 장 같은 줄 같은 자리. 코드 `home-cards.tsx` `GateBody` `mt-auto … min-h-14` `data-find-level` |
| 13 | C112 회화 1~3단계 Sonnet | **ADDRESSED**(코드만) | `server/ai/talk.ts:82` `model: "claude-sonnet-5-5"` 하나 — 단계별 다른 모델 없음 |
| 14 | 목록 카드 = 지난 수업 카드 크기 · 간격 | **ADDRESSED** | 지난 수업 세로 168.0 × 160.0 · 틈 16.0, 가로 130.0 × 159.5~159.7 · 틈 12.0 — 목록과 같음(0절 표). 코드 `lesson-card.ts` 상수 여섯을 `lesson-board.tsx` · `past-lessons.tsx:72` 가 함께 씀, e2e `lesson-list.spec.ts:318` |
| 15 | 같은 줄 아래 끝 · 내용 위 · 단추 아래 · 빈 띠 40px 안 | **부분** — 같은 줄 아래 끝 ✓ · 내용 위(pt-9 36: 오른쪽으로 기운 카드 36~38) ✓ · 단추 아래 끝 ✓; **빈 띠는 활성 카드 12~13px ✓, 배치 전 카드 144~146px(회화 가로 116) ✗, 섞인 줄의 배치 전 카드 237~265px ✗** — 구현자가 '배치 전 홈이라 고치지 않았다(정할 것)'로 남긴 그대로 → N-2 | `v7meas3.py` band 열, `home.spec.ts:419-435`(값을 annotation 으로 남김) |
| 16 | 빠른 두 번 누름에 화면 안 커짐 | **ADDRESSED**(코드만) | `globals.css` `button, a, [role="button"], label, summary { touch-action: manipulation }`, e2e `home.spec.ts` 계산된 스타일 단언 |
| 17 | 움직임 줄이기 | **ADDRESSED**(코드만) | `board.tsx` PostIt `transition-transform motion-reduce:transition-none` |
| 18 | 격자 셈 | **ADDRESSED** | 0절 표 — 다섯 셈 모두 사진과 맞음, 판 바깥 여백 양쪽 같음(9.8/10.2 · 1.8/2.2 · 58.8/58.8) |
| C114 | 같은 종류 종이 크기 일관 · 같은 줄 아래 끝 · 한 판 한 간격 | **맞음**(N-1 · N-4 빼고) | 위 행들 + 한 판 한 간격: 홈 24 · 목록 세로 16 · 가로 12 · 지난 수업 같음 |

## 3. 지적(새 Minor 여섯)

| 번호 | 심각도 | 묶음 | 무엇 | 왜(근거) | 어떻게 |
|---|---|---|---|---|---|
| N-1 | Minor | 홈(고침이 낸 것) | **세로에서 상태가 섞이면 줄끼리 높이가 다르다** — C114 '한 줄 · **한 판** 안에서 같은 높이' 가운데 '한 판' 이 세로에서 안 맞음 | `p11-home-feedback-portrait`: 줄 1(읽기 배치 전 · 쓰기 6단계) 491.6 · 491.9, 줄 2(말하기 · 회화 배치 전) 399.7 · 399.9 — 92px 차이. 코드 `home-cards.tsx:225` `grid grid-cols-2 items-stretch gap-6 landscape:grid-cols-4` — `items-stretch` 는 줄 안만 맞춤 | `auto-rows-fr` 한 단어(두 줄이 가장 긴 줄 높이로) — 가로는 한 줄이라 영향 없음. e2e `home.spec.ts:412 · 469` 높이 퍼짐 단언을 섞인 상태 세로에도 |
| N-2 | Minor · **정할 것** | 홈(새 사진) | **배치 전 카드 안 빈 띠 145px** — '이번 주 0일' 아래 · '내 단계 찾기' 위가 비어 '빈 포스트잇'으로 읽힘(#15 기준 40px 의 3.6배). 섞인 줄에서는 237~265px(C114 로 활성 카드 높이에 맞춰 늘어난 몫 — 피할 수 없음) | `home-find-level-portrait` 네 장 144~146, `-landscape` 144~146(회화 116 — 설명이 세 줄), `p11-home-feedback-*` 배치 전 카드 237~265. 코드 `home-cards.tsx:35` `HOME_CARD_MIN_H = "min-h-[400px]"` 가 배치 전 카드에도. 구현 보고 fix 1a '정할 것' | 컨트롤러 · 요청자 몫. 권고: 배치 전 카드만 최소 높이를 내용 + 단추(≈300px, 빈 띠 ≈45px)로 — 네 장 다 배치 전이면 네 장이 같은 300 이라 C114 유지, 활성 카드와 섞인 줄은 C114 대로 늘어남(그때 빈 띠는 받아들임). 바꾸면 fix 1a 의 400 기록과 `home.spec.ts` annotation 값 갱신 |
| N-3 | Minor | 회화(고침이 낸 것) | **세로 띠가 늘 두 줄(136px)이고, 단추 없는 화면(마이크 못 씀 · 마무리 셋째 장)에서 아래 줄이 빈 채 남는다** — M-2 의 '자리 잡아 두기(invisible)' 가 세로에서는 띠를 두 줄로 접은 채 고정했고, 숨긴 단추 줄(56px)이 빈 띠로 보임. 가로는 한 줄 80px 이라 문제 없음 | `probe.py`: 세로 여섯 장 띠 40~176(136px). `p13-talk-needs-mic-portrait` · `-closing-3-portrait`: 제목 줄 아래 56px 이상 빈 종이(단추 둘 invisible). `p13-talk-greeting-portrait`: 제목 · 셈 한 줄(≈560px) + 단추 묶음(≈230px) > 안쪽 732px 라 `board.tsx:82` `flex-wrap` 이 단추를 둘째 줄로 내림. 코드 `talk-frame.tsx:1043-1065` | 띠 왼쪽 묶음(`board.tsx:84`)을 `min-w-0 flex-1` 로 — 제목 · 셈이 묶음 안에서 두 줄로 접히고 단추 묶음은 같은 줄 오른쪽 세로 가운데. 띠 높이는 글 두 줄(≈100px)로 두 방향 모두 토막과 무관하게 고정되고 숨긴 단추가 빈 줄을 남기지 않음(invisible 자리 잡기는 그대로 둬도 됨). e2e 띠 높이 단언은 그대로. 네 영역 세션 띠(`PaperBand` 공용)도 같은 코드라 사진 다시 한 번 |
| N-4 | Minor | 지난 수업(고침이 낸 것) | **가로에서 카드 셋이 왼쪽 59px 에서 시작한다** — 목록(2px)과 다르고, 셋뿐이라 가운데도 왼쪽도 아닌 자리 | 측정 0절: 지난 수업 가로 왼쪽 끝 98.8(판 40) ↔ 목록 41.8. 원인: `LESSON_GRID` `auto-fill 8.125rem` + `justify-center` — 지난 수업은 판 전체 1100px 에 일곱 칸(982)이 가운데 맞춰지고 카드는 그 첫 세 칸에 놓임(목록은 옆 칸 때문에 844px 에 여섯 칸 840 이라 2px). `past-lessons.tsx:72` | 지난 수업 격자에 `landscape:justify-start`(또는 목록과 같은 844px 칸 안에 두기). 세로(네 칸 720, 여백 10)는 그대로 |
| N-5 | Minor | 첫 실행(새 사진) | **iPad 상자의 스크린 타임 길이 '→' 글줄로 그려져 바로 위 두 길(받아쓰기 · Siri 및 검색 — 톱니 · 칩 · '>' 꼴)과 꼴이 다르다** | `v7/crops/firstrun-box.png` · `first-run-mic-portrait`: '설정 > 일반 > 키보드 > 받아쓰기' · 'Siri 및 검색' 은 `SettingsPath` 칩 두 줄, 그 아래 '스크린 타임을 쓰면 설정 → 스크린 타임 → … 허용해 주세요' 는 Gowun 20px 두 줄 글. 코드 `first-run-flow.tsx` `<p data-ipad-screen-time>`(문구 표 185행 글자 그대로 — 꼴만 다름). 지난 리뷰 M-9 권고 '같은 `SettingsPath` 꼴로' | 낱말은 문구 표 그대로 두고 꼴만: '스크린 타임을 쓰면' + `SettingsPath(["설정", "스크린 타임", "콘텐츠 및 개인정보 보호 제한", "Siri 및 받아쓰기"])` + '허용해 주세요' — 메뉴 이름은 셋째 길도 같은 칩. 부모용 상자라 아이 글자 규칙 밖 |
| N-6 | Minor | 배치 평가(새 사진) | **가로에서 '몰라요' 가 보는 창 아래로 내려간다**(세로는 안) — 모르는 아이가 누를 단추가 안 보임 | `placement-item-landscape` 2360 × 1832(쪽 916px > 820): '몰라요' 823~873px(기기 1646~1746 ÷ 2). 보기 넷이 2 × 2, 보기마다 그림 자리 136px 로 카드 150px, 그 위 영어 두 줄 + 아래 '다음'. `placement-item-portrait` 는 1180 안(823~873) | 가로에서 보기 카드 그림 자리를 줄이거나(136 → 100) 보기 넷을 한 줄(4칸)로, 또는 '몰라요' 를 카드 안 '다음' 왼쪽에(한 화면 한 행동은 '보기 고르기' 하나 — 몰라요 · 다음은 그 결과). e2e `placement.spec.ts` 가로 `fitsBothWays` |

## 4. 참고(지적 아님 — 근거만 남김)

| 출처 | 참고 | 근거 |
|---|---|---|
| 쓰기 5단계 | 초점 고리(점선 4px, 상자 밖)가 앞 낱말 'very' 에 닿아 보임(고침과 무관, 예전부터 — 초점 있을 때만) | `v7/crops/w5-focus.png`('It is very[nadeba].' 고리 왼쪽 변이 'y' 에 붙음, 다른 줄은 낱말 ↔ 입력란 10px) |
| 목록 가로 | 모든 카드가 표지 자리 `pt-14`(56px)를 비워 두어 번호가 56px 아래에서 시작 — 표지 있는 카드와 없는 카드의 글 자리가 같아 '같은 줄 같은 자리' 가 유지되고, 위 12px 은 테이프가 채움 | `lesson-list-landscape-15-landscape` · `lesson-card.ts` `landscape:pt-14`, 표지 두 줄 128~187px(카드 위 144 · 번호 200) |
| 표지 22px 두 줄 | 가로 '여기부터 해요' · '안 해 본 수업' 두 줄 접힘은 C82(누르는 것의 이름표 22px)에 맞고 글자 잘림 · 겹침 없음 — 세로는 한 줄(128~158px, 번호 위 18px 여유) | `v7/crops/badge-landscape.png` · `badge-portrait.png` |
| 첫 실행 여덟 장 | 종이 카드가 화면 높이를 채우고 내용은 위 1/4(PIN · 단계 · 주제 · 넘기기 모두) — 부모용 마법사라 아이 화면 기준 밖, 고침 범위 밖 | `first-run-pin-portrait` · `-level-portrait` · `-topic-landscape` · `-handoff-portrait` |
| 회화 | `p13-talk-confirm-landscape` +32 · `-hint-portrait` +8 은 지난 리뷰 0절 값 그대로(고침이 바꾸지 않음) | `dims.py` |
| 범위 밖 | 회화 말풍선 글 내용 · CI 17차 e2e 빨강 2(AC-15g 기대) · 시드 내용 · #6(세션 활동 카드 둥근 모서리 — 요청자 표본) | 브리프 |

## 5. 열린 장부 판정(`ledger-open.md`)

| 행 | 판정 | 근거 |
|---|---|---|
| 84 요청자 지적 카드 폭 | **아직 열림** — 요청자 확인(기종 · 방향 · 확대) · #6 표본 뒤 | 이번 범위 밖(지난 리뷰 3절 (가) 그대로) |
| 86 (2) `guidedSample(5)` 5단계 과제 글 | **닫힘** | 1절 #11 (2) — 사진 `p11-writing-5-task/write-portrait` · `lessons.ts:142` |
| 89 (2) · 90 (1) · (2) H2 실측 앱 할 일 | **닫힘** | 1절 #9 · #10 — C111 문구 두 방향 사진 · `listen.ts` Dictation 갈래 + 단위 |
| 93 fix 8b N-1 · N-2 · N-3 | **닫힘** | 1절 #7 · #8 — 사진 · 코드 · e2e |
| 110 전체 디자인 리뷰 fix 묶음 1 | **닫힘**(이 보고) — 남는 것: #6(요청자 표본) · N-2 정할 것 · 새 Minor N-1 · N-3~N-6 작은 묶음 | 1 · 2 · 3절 |
| 112 요청자 지적 '포스트잇 크기가 서로 다른 게 안 보이나' | **닫힘**(홈 가로 · 세로 같은 상태 · 목록 · 지난 수업 측정으로) — 세로 섞인 상태의 줄 차이만 N-1 로 | 2절 #12 |
| 60 · 51 · 50 · 77 | 그대로(지난 리뷰 7절) | — |

## 6. 사진 없음 — 코드로만 본 것

회화 쉬는 안내 종이 판(`talk-frame.tsx` `<TalkPaper data-talk-rest>`), 배치 막힘 둘째 줄(`placement-flow.tsx` `MicBlockedText`), 목록 오류 줄(e2e `lesson-list.spec.ts:540` 만), Dictation 갈래, `touch-action` · `motion-reduce`, 회화 모델. 사진이 필요하면 다음 CI 에 `p13-talk-rest` · `placement-blocked` · `lesson-list-error` 셋.
