# 화면 재검토: P11a 차례 4 fix 4 — 말하기 1~2 · 마이크 안내(design-reviewer des-p11b · Opus · xhigh, 2026-10-22 — des-p11 이어 보기)

## 판정: Approved — Critical 0 · Important 0 · Minor 2(새 지적, 막지 않음)

앞 보고 `review-p11-4-design.md` 의 I-1 · M-1 · M-2 · M-3 네 개 모두 ADDRESSED. 이번 고침이 낳은 작은 어긋남 둘(N-1 · N-2)은 Minor 다.

대조 자료: CI 8차 사진 `scratchpad/p11-photos-6`(`p11-speaking-*` 32장 — 세로 1640 × 2360 · 가로 2360 × 1640, 2배 화소) · 견줌용 CI 7차 `scratchpad/p11-photos-5` · 워크트리 p11(바탕 b648c8c, 커밋 전 변경) `src/components/answer/speak-button.tsx` · `src/components/session/speaking.tsx` · `src/app/(child)/session/[id]/session-frame.tsx` · `src/components/answer/repeat.tsx` · `src/components/answer/choice.tsx` · `tests/e2e/speaking.spec.ts` · `tests/e2e/photos.ts` · 정본 7절 '말하기 버튼' · '오류' · '마이크를 쓸 수 없음' 행 · plan-p11a 정본 밖 문구 표 184행 · 목업 `docs/media/mockups/B_Speaking.dc.html` · 구현 보고 '차례 4 fix 4' 절. 글자 · 단추 크기는 표준 라이브러리 PNG 읽기로 화소를 세어 쟀다(CSS px = 사진 화소 ÷ 2).

## 지적별

### I-1 듣는 동안 단추 꼴 — ADDRESSED
- 사진 `p11-speaking-listening-on-portrait` · `-landscape`: '말하기' 단추 둘레에 먹색 고리(6px)와 단추 안쪽 분홍 테(4px)가 보인다. 고리 맨 위 가운데에 종이색 몫(지난 시간)이 이미 생겨 있다 — 남은 시간이 줄어드는 표시가 그려진다. 같은 자리의 듣기 전 사진 `p11-speaking-repeat-*` 와 견주면 꼴이 분명히 다르다.
- 잰 값: 단추 높이는 듣기 전 · 듣는 중 모두 56px(4절 56 × 56 지킴). 폭은 160 → 168px 로 테 4px 만큼 바깥으로 커지고, 글 · 아이콘 자리는 그대로다(가운데 놓임). 고리 자리 6px 는 듣기 전에도 비워 두어(`speak-button.tsx:65` `p-1.5`) 듣기를 시작해도 아래 내용이 밀리지 않는다.
- 코드: `speak-button.tsx:62-85` — 듣는 동안 conic-gradient 고리(먹색 몫 = 남은 비율, P2b `capAt` 와 누른 시각으로만 셈, 박힌 수 없음) · `border-4 border-postit-speaking` · `data-listening` · `aria-pressed`. 목업 B_Speaking 마이크 단추의 분홍 4px 테와 같은 결이다. 정본 7절 '말하기 버튼' 행(둘레의 남은 시간 표시)과 맞다. '다 말했어요' 자리(`listeningLabel`)는 c 몫으로 비어 있다.
- 배치도 같은 조각: `repeat.tsx:155-161` 이 `SpeakButton` 을 쓴다(세로 줄 가운데 `self-center` 그대로). 배치 사진은 없어 코드로만 봤다.
- 선 위 검증: `speaking.spec.ts:286-296` — 누른 뒤 `[data-speak][data-listening]` 보임 · 고리 style 에 conic-gradient · 결과 뒤 듣는 중 표시 없음.

### M-1 막힌 안내 '홈' 하나 — ADDRESSED
- 사진 `p11-speaking-needs-mic-*` · `-stalled-*` · `-silent-*`(여섯 장): 종이 띠 오른쪽 '홈'이 없고, 안내 아래 큰 '홈' 하나뿐이다. 안내 글 셋은 7절 글자 그대로다.
- 코드: 띠 오른쪽 자리는 막힌 동안 비운다(`session-frame.tsx:679`). 큰 '홈'은 `BigButton` 으로 띠의 '홈'과 같은 `home()` 를 부른다(`:663`). `home()` 은 막힌 동안 첫 활동 지움을 끈다(`:503`) — 7절 '세션을 진행으로 둔 채'와 맞다.

### M-2 가로 듣기 이해 고른 뒤 높이 — ADDRESSED
- 사진 `p11-speaking-listening-wrong-landscape` · `-reveal-landscape` · `-right-landscape`: 모두 1640 화소(= 820px)다. 사진은 쪽 전체를 찍으므로(`photos.ts:25-28` `fullPage: true`) 쪽이 보는 창보다 길지 않다. '한 번 더 듣기' · '다음'이 카드 안에 보이고, 카드 아래 끝은 가로 776px 근처다.
- 코드: 세션(`instant`) 그림 보기만 가로에서 그림 칸 112px · 위아래 여백 줄임(`choice.tsx:141-143`, `:265`). 배치는 그대로다.
- 선 위 검증: `fitsBothWays`(`speaking.spec.ts:174-185`)가 처음 틀림 · 정답 보기 · 맞음 뒤(`:326` · `:342` · `:348`)에 돈다. 그 뒤 차례의 사진(`-question` · `-result`)이 있으니 단언을 지나갔다. 세로 세 장도 1180px 안이다.

### M-3 안내 줄 셋 · 목표 글 36px · 질문 28px — ADDRESSED
- 안내 줄 글자: 따라 말하기 '잘 듣고 따라 말해 봐요'(`-repeat-*`) · 듣기 이해 '잘 듣고 알맞은 것을 골라요'(`-listening-*`) · 질문 답 '질문을 듣고 영어로 대답해 봐요'(`-question-*`). plan 표 184행과 글자 · 토씨까지 같다. 셋 다 첫 줄 20px(`GuideLine`)로 읽기 · 쓰기 활동과 같은 꼴이다.
- 크기(CI 7차 24px 사진과 같은 글의 폭 비):

| 글 | CI 7차 폭 | CI 8차 폭 | 비 | 크기 |
|---|---|---|---|---|
| 따라 말하기 목표 'bababa' | 70px | 105px | 1.50 | 36px |
| 질문 'What do you see?' | 181px | 212px | 1.17 | 28px |

- 코드: `speaking.tsx:214`(`text-[36px] leading-tight` 굵게) · `:468`(`text-[28px]` 굵게). 4절 '영어 24px 이상' 안이다. 20낱말 시험 문장(`-repeat-close-*`)도 두 방향 모두 보는 창 안이다.

## 새 지적(범위 안)

### N-1(Minor). '같이 말해 볼까요'의 바른 답이 그 위 질문보다 작다
- 근거(사진): `p11-speaking-together-portrait` — 질문 'What do you see?'는 28px 인데, 아이가 따라 말할 바른 답 'I see a bababa.'는 24px 다(글자 높이 화소가 24px 'bababa'와 같다). M-3 에서 질문만 키워 크기 차례가 뒤집혔다.
- 코드: `speaking.tsx:476` `<EnglishLine className="font-bold">`(기본 24px) · `:468` 질문 28px. 같은 파일 `:213` 의 주석은 '따라 말할 글은 화면의 할 일이라 크게'라며 따라 말하기 목표를 36px 로 키웠다. 이 단계의 할 일도 바른 답을 따라 말하는 것이다(3.3 · 4절 '같이 말해 볼까요').
- 고치는 법: 바른 답 줄을 따라 말하기 목표와 같은 크기(36px)로, 적어도 질문(28px) 이상으로 키운다. 1~2단계 바른 답은 짧은 한 문장이라 두 방향 높이에 걸리지 않을 것이다(`fitsBothWays` 를 together 사진 뒤에 더하면 선 위에서 확인된다).

### N-2(Minor, 고르기). '한 번 더 말하기'의 오른쪽 끝이 다른 오른쪽 단추보다 6px 안쪽이다
- 근거(사진): `p11-speaking-repeat-close-portrait` — '한 번 더 말하기' 먹색 끝이 내용 오른쪽 끝(점선 칸 끝)보다 6px 안쪽이다. 같은 자리의 다른 큰 단추('다음' · '한 번 더 듣기' — `-listening-right-portrait` · `-wrong-portrait`)는 내용 끝에 붙는다.
- 코드: 고리 자리를 늘 비워 두는 `speak-button.tsx:65` `p-1.5` 때문이다. 밀림을 막으려는 뜻은 맞다.
- 고치는 법(고르기): 감싸개에 같은 크기의 음수 여백(`-m-1.5`)을 주면 밀림 없이 끝이 맞는다. 아이 눈에는 거의 안 보이는 차이라 두어도 된다.

## 맞는 것(이번에 다시 본 것)

| 볼 것 | 판정 | 근거 |
|---|---|---|
| 처음 마이크 안내(새 사진) | 맞음 | `p11-speaking-mic-notice-*` '말한 소리는 인터넷으로 보내 글자로 바꿔요. 소리는 저장하지 않아요'(28px 제목 글꼴, 세로는 두 줄) + '알겠어요' 큰 단추 하나. 4절 · plan 표 글자 그대로 |
| 듣는 동안 '다시 듣기' | 맞음(화면 결함 아님) | 듣는 중에도 눌리지만, 읽어 주기가 먼저 듣기를 끊는다(`src/lib/speech/browser.ts:415-416`) — 앱 소리를 인식하지 않음(7절 첫 문단) |
| 따라 말하기 결과 · 끊김 | 맞음 | `-repeat-good-*` 아이 말 칸 + '잘 말했어요', 단추 없음. `-repeat-close-*` '거의 다 맞았어요' · '다음'(작은) · '한 번 더 말하기'(큰, 세로 가운데 맞음). `-offline-*` 끊김 글 · '말하기' 그대로 |
| 질문 답 · '같이 말해 볼까요' | 맞음(N-1 빼고) | `-question-*` 안내 줄 · '다시 듣기' · 질문 28px · '말하기'. `-together-*` 뜻 '뭐가 보여?' · 바른 답 · '같이 말해 볼까요'. 판정 글자 없음 |
| 색 · 틀 · 넘침 | 맞음 | 분홍 말하기 카드 · 분홍 활동 점. 말하기 사진 32장 모두 보는 창 크기 그대로(쪽 전체 찍기) |
| 문구 · 아이 이름 | 맞음 | 아이 이름 없음. 'speaking 1단계 수업 1' · '말하기 1단계 첫 수업' · '가상 낱말 1-1' · 'word1…word20' 은 알려진 시험용 시드 |

## 사진 없음 — 코드로만 본 것
- 배치 따라 말하기의 듣는 중 꼴(`repeat.tsx:155-161`, 세션과 같은 조각).
- 남은 시간 고리가 상한에 가까워진 모습(사진은 누른 직후라 종이색 몫이 아주 작다). 다음 CI 에서 상한 절반쯤에 한 장 더 찍으면 고리가 줄어드는 것이 사진으로 남는다(권함, 막지 않음).
