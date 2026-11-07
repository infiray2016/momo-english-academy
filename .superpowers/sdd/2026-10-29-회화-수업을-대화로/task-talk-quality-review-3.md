# 회화 대본 5회차 재판정(talk:observe 5a preview-1 · 5b word-answers, 고침 3 코드, 2026-11-06 실호출)

작성: 설계 · 화면 검토자(Fable · max, 읽기 전용, 2 · 4회차 판정과 같은 검토자) · 2026-11-06 · 맡긴 곳: 컨트롤러 브리프(대본 5회차 재판정)

읽는 법. 판정 대상은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/talk-observe-5a/` · `talk-observe-5b/`(markdown + json)이고 견줌은 같은 자리의 `talk-observe-4/` 와 지난 판정 `task-talk-quality-review-2.md`(번호 N-n · I-n 은 그 보고의 것) · 고침 3 보고 `task-talk-prompt-2-report.md` '고침 3' 절이다. 줄 표기(`02-2:196` · '규칙 n' = `.claude/worktrees/p13d/src/core/ai/calls/talk-lesson.ts` n줄)는 지난 보고와 같다. '5a n' 은 preview-1 n차례, '5b n' 은 word-answers n차례다. 코드 · 시드는 보지도 바꾸지도 않았고 실호출도 하지 않았다. 이번에 새로 본 것과 아직 안 닫힌 것만 적는다.

## 1 판정 한 줄

**통과(iPad 시험 부탁 가능).** 열여섯 차례에서 막힘 판정 틀림 0, 아이가 방금 한 말을 되묻는 고르기 0, 같은 질문 2번째 0, 카드 자리 대체 0 이고, 4회차에 걸렸던 다섯 자리가 모두 설계 예시 꼴로 바뀌었다. 남은 것은 시험을 막지 않는 것들이다(되풀이가 노리는 동사 대신 'like' 를 쓰는 일 N-10, 카드 답 뒤 되돌림이 이름표뿐인 N-2 (b), 대본으로 못 본 두 낱말 규칙과 들리지 않음 문구). 6절에 요청자에게 미리 알릴 것 셋과 함께 적었다.

## 2 (1) 지난 항목의 닫힘 판정

| 항목 | 판정 | 근거(대본 · 차례 · 문장) |
|---|---|---|
| N-1 짧은 답 뒤 방금 한 말을 되묻는 고르기 · 같은 질문 | **닫힘** | 4회차에 걸린 다섯 자리가 모두 새 질문이 됐다. 5a 5 'Yes I like fish.' → 'Yum, fish! The sun is hot. Cold juice for you! What do you do with the juice?'(4회차 'Do you like fish or rice?' 〈I like fish.〉), 5a 7 'Yes big fish.' → 'Oh, a big fish! Do you eat the big fish?'(4회차 'Is the fish big or small?' 〈It is big.〉), 5b 5 'Cold.' → 'Cold juice, yum! It is cold. What do you do with it?'(4회차 'Is it cold or hot?' 〈It is cold.〉), 5b 7 'Big.' → 'Oh, a big lake! The lake is big. Do you like the lake?'(4회차 'Is the lake big or small?'), 5b 6 'Lake.' → 카드 필수 3 한 번(4회차는 같은 질문 2번째). 선택지는 5b 4 'Is it cold or hot?' 〈It is cold.〉〈It is hot.〉 하나뿐이고 아이 말('Juice.')이 들지 않은 새 물음이다. 02-2:196 · 184. 앱 거름(choicesEchoChild)은 AI 가 되묻는 선택지를 내지 않아 이번엔 쓰이지 않았다(단위 시험만) |
| N-2 (a) 늦은 카드 답 뒤 다음 카드 질문 | **닫힘**(표본 1) | 5a 8 'I drink the juice.'(5a 5 에서 물은 필수 2 의 늦은 답) 에 사용자 메시지 'Previous turn was a card chance: yes' 가 붙었고(lateCardAnswerOf), 선생님 말은 'Yum, the juice! Is your family at the lake too?' 로 카드 질문 글을 그대로 붙이지 않았다. 4회차 같은 자리는 'Yum, the juice! With your family, what do you do?' 였다 |
| N-2 (b) follow_up 이름표에 card_item 만 required | **이름표만 닫힘**(고침 3 보고 우려 1 그대로) | 5a 8 · 5b 3 · 5b 6 세 턴이 'Previous turn was a card chance: yes' 에 card_item required 라 chained 판정이 걸렸지만 글은 그대로 나갔다. 5b 3 'Me too! Fish is yummy. The sun is hot! What do you do with the juice?' 와 5a 8 은 다리가 있어 대화로 들리고, 5b 6 'Oh, the lake! You like the lake. With your family, what do you do?' 는 반응 · 되풀이 뒤 카드 글 그대로다. 아이 눈에 연쇄로 들리는 턴은 0 이라 시험을 막지 않는다. 실효를 두려면 고침 3 보고 우려 1 의 길(chained 턴을 C203 다시 쓰기로 한 번 이어 묻기, D8 (나))을 컨트롤러가 정한다 |
| 두 낱말 관련 말('Big fish.') 무름 | **대본 근거 없음** | 두 대본에 두 낱말 장면 말이 없다. 'Yes big fish.'(5a 7)는 세 낱말이고 AI 가 애초에 막힘이라 하지 않았다(new_topic). 단위 시험 세 건뿐이므로 다음 대본에 'Big fish.' · 'Cold juice.' 를 넣어 본다(지난 보고 7절 3) |
| N-3 질문 검사 두 번 걸림 뒤 다리 없는 카드 질문 | **닫힘**(표본 2) | 재질문 둘 다 한 번에 통과. 5b 2 첫 시도 'Do you eat fish too?'(eat) → 'Do you like fish?'(설계 예시와 같은 글), 5b 5 'What do you do with the cold juice?'(too_long) → 'What do you do with it?'. 두 번 걸림 0, 카드 자리 대체 0. 첫 시도가 노리는 단어를 넣는 버릇은 남았다(5b 2) |
| N-5 들리지 않음 첫 턴 'I couldn't hear you.' | **대본 근거 없음** | 이번 대본 둘에 들리지 않음 차례가 없다 |
| N-6 뜻을 한 덩이로 씀 | **닫힘** | AI 차례 14 모두 문장 수와 뜻 수가 같다(5a 5 네 문장 → 네 뜻, 5b 3 네 문장 → 네 뜻). 서버 나누기(koPerSentenceOf)는 쓰일 일이 없었다 |
| N-8 설명이 묻지 않은 낱말을 풀이 · 관사 되풀이 없음 | **닫힘**(설명) · **근거 없음**(되풀이) | 5a 2 · 3 설명 "'eat'은 '먹다'라는 뜻이야." 는 노린 낱말이다. 'I drink juice.' 꼴 입력은 이번 대본에 없다 |
| I-3 막힌 질문을 같은 글로 다시 묻기(설계 결정 대기) | 이번엔 재현 안 됨 | 5a 4 'Yes I am hungry' → 'Me too! Rice and fish are yummy. Do you like fish?'(4회차는 필수 1 원문 2번째). 규칙이 생긴 것이 아니라 이번 표본에서 AI 가 이어 묻기를 골랐을 뿐이다. 설계 결정은 그대로 열려 있다 |

## 3 (2) 5a 2 · 3 차례가 카드 자리로 간 것

**맞는 자리다.** 두 차례 모두 아이가 '잘 모르겠어요' 단추를 눌렀다(사용자 메시지 Reason: button). 정본은 단추를 아이 쪽 막힘으로 두고(02-2:255) 같은 질문 자리의 첫째 막힘은 같이 말하기('That's okay! Let's say it together.' 뒤 카드 답 예시를 소리로), 둘째는 카드 쉬운 질문으로 바꿔 묻기다(02-2:259 · 260). 받침 단계가 카드 줄을 쓰는 때는 카드 자리이고 선생님은 반응과 연결 말만 쓴다(02-2:190 (4)). 5a 2 는 'That's okay! Let's say it together.' 〈We eat rice and fish.〉, 5a 3 은 'That's okay! Let's try an easier one.' + 'Are you hungry?' 로 그대로다. 첫 프리뷰 기록 4 · 5턴(preview-1-session-transcript.md 36 · 46줄)과 설계된 대화(task-talk-design-gap.md 4.2)도 같은 꼴이다. C203 은 1~3단계 AI 질문이 6.4 검사에 걸린 턴을 카드 자리로 바꾸지 않고 다시 쓰게 하는 규칙이라 이 두 차례(까닭 support, 걸린 질문 없음)에는 닿지 않는다. 설명도 둘 다 노린 낱말 하나와 뜻("'eat'은 '먹다'라는 뜻이야.")이라 C204 (4) 안이다. 작은 것 하나: 둘째 막힘의 설명이 첫째와 같은 글이다(N-13).

## 4 턴별 사람 판정(요지)

칸: 막힘 판정 · 이어 묻기 · 카드 끼움 · 답 먼저 · 자기 반응. 뜻은 열여섯 차례 모두 있고 자연스럽다(예 '나도야! 밥이랑 생선은 맛있어. 너는 생선 좋아해?').

| 대본 · 차례 | 아이 | 선생님 말 | 막힘 | 이어 묻기 | 끼움 | 답 먼저 | 자기 반응 | 한 줄 평 |
|---|---|---|---|---|---|---|---|---|
| 5a 2 · 3 | (잘 모르겠어요) ×2 | 받침 1 · 2(3절) | — | — | 아니요(설계대로) | 설계대로 | — | 설계대로 |
| 5a 4 | Yes I am hungry | Me too! Rice and fish are yummy. Do you like fish? | 맞음 | 예 | — | 아니요 | Me too | 설계 예시('You are hungry! Rice and fish, yum! Do you like fish?')와 같은 결 |
| 5a 5 | Yes I like fish. | Yum, fish! The sun is hot. Cold juice for you! What do you do with the juice? | 맞음 | 아니요(필수 2) | 아니요(다리 둘) | 아니요 | Yum | 'Cold juice for you!' 가 설계 예시의 'Oh, juice for you.' 꼴. 네 문장이라 상한 3 을 넘는다(N-11) |
| 5a 6 | We eat rice and fish. | Oh, rice and fish! Is the juice cold or hot? | 맞음(갈래 new_topic 은 오기) | 반(아이 답이 아니라 자기 질문을 이어 물음) | — | 아니요(선택지 없음) | — | 되묻는 고르기이지만 아이 말과 무관한 새 물음이고 소리 선택지가 없다. 'eat' 스스로 씀으로 기록 |
| 5a 7 | Yes big fish. | Oh, a big fish! Do you eat the big fish? | 맞음(AI 도 막힘 아님) | 예(따라가기) | — | 아니요 | — | 4회차의 'big or small?' 되묻기가 없어졌다. 되풀이 칸은 비었다(대본 기대 fish) |
| 5a 8 | I drink the juice. | Yum, the juice! Is your family at the lake too? | 맞음 | 반(주스 이야기를 잇지 않고 가족으로) | 아니요('too' 로 이음) | 아니요 | Yum | 늦은 카드 답을 앱이 알아봤다(N-2 (a)). card_item required 3 을 적었지만 질문은 'go' 를 끌어내지 않는다(N-15) |
| 5b 2 | Rice. | Yum, rice! You eat rice. Do you like fish? | 맞음 | 예 | — | 아니요 | Yum | 설계 예시('We eat rice! Yum. Do you like fish?')와 같다. 재질문 1회 |
| 5b 3 | Yes. | Me too! Fish is yummy. The sun is hot! What do you do with the juice? | 맞음 | 아니요(필수 2) | 아니요(다리 둘) | 아니요 | Me too | 'Yes.' 가 'Do you like fish?' 의 답으로 바르게 읽혔다(4회차는 막힘). 네 문장(N-11) |
| 5b 4 | Juice. | Yes, the juice! You like juice. Is it cold or hot? 〈It is cold.〉〈It is hot.〉 | 맞음 | 예 | — | 선택지(허용, 아이 말 없음) | — | 되풀이가 'drink' 대신 'like'(N-10) |
| 5b 5 | Cold. | Cold juice, yum! It is cold. What do you do with it? | 맞음 | 아니요(drink 기회를 바꿔 물음) | 아니요 | 아니요 | Yum | 설계 예시 'Cold juice, yum!' 그대로. 재질문 1회 |
| 5b 6 | Lake. | Oh, the lake! You like the lake. With your family, what do you do? | 맞음 | 아니요(필수 3) | 반(반응 · 되풀이 뒤 카드 글 그대로) | 아니요 | — | 되풀이가 'go' 대신 'like'(N-10). 대본 탓('Lake.' 는 주스 질문의 답이 아님)이라 카드로 간 것 자체는 자연스럽다 |
| 5b 7 | Big. | Oh, a big lake! The lake is big. Do you like the lake? | 맞음 | 예 | — | 아니요 | — | 바로 앞에서 'You like the lake.' 라 해 놓고 'Do you like the lake?' 를 묻는다(N-10). 카드 쉬운 질문과 같은 글이기도 하다 |
| 5b 8 | Water. | Yes, the lake has water! Sand on your hands! What do you do with water? 〈I wash my hands.〉 | 맞음 | 아니요(필수 4 · wash 꺼내기) | 반(카드 장면 문장이 다리) | 따라 할 말(꺼내기, 02-2:180 허용) | — | 신호 말 'Listen and say!' 가 또 없다(N-7, 2/2) |

합계(사람): AI 질문 차례 14 가운데 진짜 이어 묻기 6, 반 2, 카드 · 다시 쓰기 기회 6(그중 다리 없음 0, 반 2). 막힘 판정 틀림 0, 되묻는 고르기 0, 같은 질문 0, 카드 자리 대체 0, 같은 소리 두 번 0, 장면 단정(AI) 0, 자기 반응 한마디 8/14. 첫 문장 p50 1.3~1.5초(5a 첫 호출만 3.2초), 재질문 2(모두 한 번에 통과, 턴 전체 약 6초).

## 5 (3) 새로 보이는 어긋남

**N-10 [Important, 시험을 막지 않음] 낱말 답의 되풀이가 질문의 동사 대신 'like' 를 쓴다.** 5b 4 'Juice.'(물음 'What do you do with the juice?') → 'You like juice.', 5b 6 'Lake.'(물음 'With your family, what do you do?') → 'You like the lake.', 이어서 5b 7 'Do you like the lake?' 로 자기가 단정한 것을 되묻는다. 넓혀 들려주기는 '그 말을 담은 바른 문장'(02-2:196)이고 아이 말의 뜻을 바꾸지 않아야 하며(02-2:198), 설계 예시는 'You drink juice!' · 'You go to the lake!' 다. 이 되풀이는 노리는 동사(drink · go)를 들려줄 기회라 학습에 닿는다. 4회차 같은 자리는 'You drink the juice.' · 'We go to the lake.' 로 맞았으니 흔들림이다. 몫: 프롬프트(규칙 747 · 784 에 '낱말 답의 되풀이는 아이가 답한 질문의 동사를 담는다 — 물음이 what do you do 면 하는 일로' 와 예 둘). 앱이 recast 에 노린 단어가 없으면 되풀이를 버릴 수도 있으나(코드 Minor) 프롬프트가 먼저다.

**N-11 [Minor] 선생님 문장 수가 상한을 넘는다.** 5a 5 · 5b 3 이 네 문장이고 1~3단계 상한은 3 이다(규칙 773, talk.teacher_sentences_max.1-3 = 3). 앱은 세지 않는다(첫 프리뷰 분석 A7 그대로). 둘 다 다리 문장 둘을 넣다가 넘겼고 아이에게 해롭지는 않다. 몫: 앱이 길이 초과로 기록(변경 spec 263줄)하거나 상한을 4 로(설정값, 요청자 결정).

**N-13 [Minor] 둘째 막힘의 설명이 첫째와 같은 글.** 5a 2 · 3 모두 "eat은 '먹다'라는 뜻이야." 둘째부터는 힌트 마지막 단이 열리므로(02-2:263) 설명은 쉬운 질문 쪽('hungry' 는 배고프다는 뜻)이 맞다. 몫: 프롬프트.

**N-15 [Minor, 범위 밖 관찰] AI 의 card_item 이 질문 글과 맞지 않을 때 앱이 그 필수 질문을 다룬 것으로 센다.** 5a 8 은 card_item required 3 인데 질문 'Is your family at the lake too?' 는 'go' 를 끌어내지 않는다. fix 1 E 대로면 필수 3 이 다룬 것으로 세어져 'go' 의 처음 묻는 기회가 이 수업에서 사라질 수 있다(3.8 셈). 대화 품질이 아니라 기회 셈의 문제라 컨트롤러 확인용이다.

열려 있는 것(새것 아님): N-7 꺼내기 턴 신호 말 없음(5b 8, 4회차 8 — 규칙 819 가 있어도 AI 가 질문과 함께 쓸 때 빼먹는다. 앱이 model_line 이 있으면 붙이는 쪽이 확실하다, 코드 Minor), I-3 · D11 · D3 · M-5(카드 'Sand on your hands!') · M-8.

## 6 (4) 판정과 조건

**통과 — 요청자에게 iPad 시험을 부탁해도 된다.** 조건이 아니라 함께 할 일 셋이다.

1. 요청자에게 미리 알릴 것: (가) 인사 끝 말은 매번 같은 글이고(설계 고정, D3) 뜻만 다르다. (나) 낱말로 답하면 선생님이 문장으로 되풀이하는데 가끔 'like' 로 바꿔 말한다(N-10, 고치는 중). (다) 막혔던 질문을 그대로 다시 물을 수 있다(I-3) — 이것은 요청자가 정할 것이다('막힌 질문은 같은 글로 다시 묻지 않기' 를 원하는지).
2. 시험과 나란히 대본으로 메울 것: 두 낱말 관련 말('Big fish.' · 'Cold juice.'), 들리지 않음 첫 턴 문구(N-5), 아이가 꺼낸 이야기 대본(child-topic 은 고침 3 뒤 돌리지 않았다). 세 대본 한 바퀴면 약 24호출, 0.2달러 안쪽이다.
3. N-10 · N-11 · N-13 · N-7 은 프롬프트 · 앱 한 줄씩이라 시험 뒤 fix 로 모아도 된다.

## 7 (5) 아이 눈 소감

낱말 하나만 말해도 선생님이 문장으로 받아 주고('Yum, rice! You eat rice.'), 내 이야기(큰 생선)를 물어봐 주고('Do you eat the big fish?'), 'Me too!' · 'Yum!' 처럼 사람 같은 한마디가 붙어 이제 대화 같다. 같은 말을 되묻거나 답을 먼저 들려주는 일이 없어져 1단계 따라 말하기 느낌이 사라졌다. 재미는 아직 선생님의 감탄 한마디 수준이라 놀이 한 줄(D11)이 들어가면 더 살아날 것이다.

## 8 6회차 확인(고침 3 fix 1 코드, `talk-observe-6a/` preview-1 · `talk-observe-6b/` word-answers, 2026-11-06)

**판정: 통과 유지.** '6a n' · '6b n' 은 그 대본의 n차례다. 실호출 · 코드 수정 없음.

### 8.1 N-10(낱말 답 되풀이가 질문의 동사를 쓰는가): 닫힘

| 차례 | 아이 | 앞 질문 | 되풀이(recast) | 판정 |
|---|---|---|---|---|
| 6b 2 | Rice. | What do you do at the table? | You eat rice! | 맞음(5b 도 맞았음) |
| 6b 4 | Juice. | What do you do with the juice? | You drink juice! | 맞음(5b 는 'You like juice.') |
| 6b 5 | Cold. | Do you like cold juice? | Yes, the juice is cold! | 맞음(5b 와 같음) |
| 6b 8 | Water. | (앞 차례 받침 뒤) | The lake has water! | 맞음 |

세 자리 모두 질문의 동사를 담았고(02-2:196 · 198) 'like' 로 바꾼 되풀이는 0 이다. 남은 작은 빈틈 하나: 6b 6 'Lake.' 는 되풀이 없이 'Oh, the lake!' 반응만 하고 카드 질문으로 갔다(기대 'You go to the lake!'). 뒤이어 'With your family, what do you do?' 를 물어 'go' 의 기회는 살아 있으므로 Minor 로만 적는다.

### 8.2 6b 7 'Big.' 의 막힘 판정: 규칙 안이고 앱이 무를 자리는 아니다

차례: 6b 6 선생님 'Oh, the lake! With your family, what do you do?' → 아이 'Big.' → AI 갈래 unrelated_words · 막힘 참 → 받침 1 'That's okay! Let's say it together.' 〈We go to the lake.〉, 설명 "여기서 go는 '가다'라는 뜻이야."

- 규칙 대조. 02-2:251 은 막힘으로 볼 말을 '질문과 관계없는 한두 낱말'로 두고, C204 (2) 는 낱말 하나도 '질문에 닿으면' 답으로 받으라 한다. 'Big.' 은 질문('가족이랑 뭐 해?')에 닿지 않고, 카드 글(주제 · 쓸 표현 · 오늘 쓸 말 · 필수 · 더 이야기할 거리 · 흐름 · 단원 단어)에 big 이 없어 오늘 장면 낱말도 아니다. child_kind 설명(규칙 534)대로면 unrelated_words 가 맞다. 받침 1 로 간 것과 설명이 노린 낱말(go)인 것도 02-2:259 · C204 (4) 그대로다.
- 앱 무름 대조. C204 (3) 의 앱 안전망은 영어 낱말 셋 이상, 또는 두 낱말 가운데 하나가 장면 낱말일 때만 무르고(child-kind.ts effectiveStuckOf · touchesScene), 한 낱말은 AI 갈래에 맡긴다. 'Big.' 은 한 낱말이고 장면 표에도 없어 앱이 무를 근거가 없다. 장면 표를 '선생님이 직전에 말한 낱말'로 넓혀도 big 은 들지 않는다(직전 말은 'the lake'). 그러므로 앱이 무를 자리가 아니다.
- 사람 눈. 5b 7 은 같은 입력을 short_related 로 받아 'Oh, a big lake! The lake is big.' 으로 이었고, 6b 7 은 막힘으로 받았다. 아이가 '호수' 말을 듣고 'Big.' 이라 했다면 호수를 꾸민 조각일 가능성이 커서 5b 쪽이 더 따뜻하다. 고침 3 보고 우려 2 가 적은 대로 '막힘이 아닌데 막힘으로 보는 쪽이 더 해롭다'는 비대칭이 있으니, 프롬프트의 child_kind 설명에 예 하나를 더하는 것을 권한다(Minor): "선생님이 방금 말한 것을 꾸미는 한 낱말('Oh, the lake!' 뒤 'Big.')은 short_related 다". 다만 이번 턴 자체는 틀린 판정이 아니고, 아이 귀에는 '괜찮아! 같이 말해 보자' 한 번이라 해롭지 않다.

### 8.3 6a 6 의 재질문 두 번 걸림 → 카드 자리: C203 설계대로

차례: 아이 'We eat rice and fish.' → AI 첫 시도 'Yum, rice and fish! Who eats with you?'(꼴 검사 form 걸림) → 다시 쓰기 'Is it a sunny day?'(범위 밖 sunny · day) → 카드 자리: 'Yum, rice and fish!' + 앱 붙임 'The sun is hot! What do you do with the juice?'(남은 기회 가운데 가장 앞인 필수 2).

- 설계 대조. C203 (3) 은 걸린 AI 질문을 한 번 다시 쓰게 하고 다시 쓴 것도 걸리면 카드 자리로 두며, 02-2:192 는 그때 가장 앞의 남은 기회를 붙인다. 그대로다. 첫 시도 'Who eats with you?' 는 사람 눈엔 좋은 이어 묻기지만 3인칭 꼴이 3단계 범위 밖이라(카드도 'What do they do at the lake?' 꼴을 쓴다) 걸린 것이 맞다.
- 아이 귀. 반응 '맛있겠다, 밥이랑 생선!' 이 약 1.8초에 나오고, 재질문이 끝나는 약 3.3초 뒤 카드 소리로 '해가 뜨거워! 주스로 뭐 해?' 가 붙는다(턴 전체 약 7.2초, 맞장구는 첫 문장이 3초 안이라 들지 않음). 들리는 글은 5a 5 의 AI 글('Yum, fish! The sun is hot. Cold juice for you! What do you do with the juice?')에서 'Cold juice for you!' 다리 하나가 빠진 꼴이라 어색하지 않다. 다만 아이가 방금 한 카드 답(eat)에 이어 묻는 턴은 없어졌다. 범위 밖 낱말 sunny · day 가 3단계 어휘 밴드 밖인 것은 시드(vocab.json)의 몫이라 여기서 판정하지 않는다.

### 8.4 그 밖에 본 것

- 6b 의 재질문 셋(2 · 5 · 8)은 모두 첫 시도가 노리는 단어(eat · drink · go)를 질문에 넣고 다시 쓰기에서 통과했다(N-3 의 버릇 그대로, 두 번 걸림 0). 호출 하나씩이 더 들지만 결과는 설계 예시 꼴이다.
- 6a 7 'Yes big fish.' → 'Oh, a big fish! Is the fish red or blue?' 〈It is red.〉〈It is blue.〉: 되묻기가 아닌 새 물음이라 N-1 안이고, 막힘 판정도 맞다.
- 6a 4 의 같은 질문 2번째는 I-3(설계 결정 대기)이라 판정하지 않았다.

### 8.5 소감(세 줄)

낱말 하나에 '너는 주스를 마시는구나!' 처럼 동사가 든 문장이 돌아와 아이가 자기 말이 문장이 되는 것을 듣는다. 막힘으로 받은 'Big.' 한 번도 '괜찮아! 같이 말해 보자' 한 번이라 거슬리지 않는다. 통과를 유지한다.
