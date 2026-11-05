# 회화 대본 4회차 재판정(talk:observe 4회차, 2026-11-06 00:51 실호출 · 고침 2 = 13절 C204 잠정)

작성: 설계 · 화면 검토자(Fable · max, 읽기 전용, 2회차 판정과 같은 검토자) · 2026-11-06 · 맡긴 곳: 컨트롤러 브리프(대본 4회차 재판정)

읽는 법. 판정 대상은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/talk-observe-4/`(markdown + json)이고 비교용은 같은 자리의 `talk-observe-3/`(고침 2, fix 1 전)과 2회차 판정 `task-talk-quality-review-1.md` 다. 줄 표기(`02-2:196`, '규칙 n' = `.claude/worktrees/p13d/src/core/ai/calls/talk-lesson.ts` n줄)는 지난 보고와 같다. 번호 C-1 · I-n · M-n 은 지난 보고 번호이고 N-n 은 이번에 새로 본 것이다. 코드 · 시드 · 설정은 바꾸지 않았고 실호출도 하지 않았다.

## 1 판정 한 줄

**조건부 통과.** 막힘 판정 틀림은 0 이고(AI 오판 1 을 앱이 물렀다) 2회차의 Critical · I-1 · I-4 · Minor 대부분이 닫혀, 아이가 자기 이야기를 꺼내거나 낱말 하나로 답해도 대화가 이어진다. 남은 것은 두 가지다. 짧은 답 뒤에 아이가 방금 한 말을 되묻는 고르기 질문(N-1, Important)과, 한 턴 늦게 온 카드 답 뒤에 다음 카드 질문으로 건너뛰는 자리(N-2, Important 아래)다. 둘 다 프롬프트 한두 줄과 앱 되돌림 한 줄 크기라, 그것을 고치고 대본 둘(preview-1 · word-answers)만 한 번 더 돌린 뒤 요청자 시험을 부탁하는 것을 권한다. 그 전에 시험한다면 '방금 한 말을 되묻는 질문'이 나올 수 있다고 미리 알리면 된다.

## 2 (가) 막힘 판정: 말 입력 39턴 가운데 AI 가 막힘이라 한 턴

| 대본 · 턴 | 아이 말 | AI 갈래 · 막힘 | 앱 | 사람 판정 | 근거 |
|---|---|---|---|---|---|
| preview-1 7 | Yes big fish. | unrelated_words · 참 | **무름**(영어 낱말 셋 이상, C204 (3)) → 통째로 다시 써 'Oh, a big fish! Is the fish big or small?' | 무름이 맞다. AI 갈래는 틀렸다(물고기는 오늘 장면 안이라 short_related) | 02-2:251 · C204 (2) |
| stuck-three 5 | Huh? | not_understood · 참 | 그대로 → 받침 1 | 맞다 | 02-2:251 |
| stuck-three 7 | I don't know. | not_understood · 참 | 그대로 → 받침 1 | 맞다 | 02-2:251 |
| word-answers 3 | Yes. | unrelated_words · 참 | 그대로 → 받침 1 〈I drink the juice.〉 | 맞다고 본다. 'What do you do with the juice?' 에 'Yes.' 는 질문과도 장면과도 닿지 않는 한 낱말이다. 사람 선생님도 답을 들려줄 자리다. 다만 이 턴은 대본의 아이 말이 설계 대화에 고정된 탓(5절)이라 실제 아이에게 자주 생길 꼴은 아니다 | 02-2:251 · 259 |

2회차에 틀렸던 다섯 자리는 모두 바로 받았다: child-topic 2 'I have a dog.' → 'Oh, a dog! Is your dog big or small?', child-topic 4 'My dog is big.' → 'Wow, big dog! What is your dog's color?', preview-1 7(위), word-answers 2 'Rice.' → 'Yum, rice! We eat rice.', word-answers 5 'Cold.' → 'Yes, the juice is cold!'. 3회차도 틀림 0 이었다(같은 입력을 두 바퀴 돌려 둘 다 맞음).

**남은 위험(다음 대본에서 볼 것).** 앱 안전망은 영어 낱말 셋 이상일 때만 무르므로, 'Big fish.' 같은 두 낱말 관련 말은 AI 갈래에만 기댄다. 4회차의 한 낱말 답 일곱('Rice.' · 'Juice.' · 'Cold.' · 'Lake.' · 'Big.' · 'Water.' 와 'Fine.')은 모두 answer · short_related 로 맞게 갈랐고, 'Yes big fish' 만 unrelated_words 로 틀렸다. 갈래가 답인 문장을 new_topic · short_related 로 적은 턴이 셋(child-topic 5 · 8, preview-1 5) 있으나 막힘 갈래가 아니라 영향이 없다(N-9).

## 3 (나) 지난 보고 항목의 닫힘 판정

| 번호 | 지난 지적 | 판정 | 근거(4회차 · 3회차) |
|---|---|---|---|
| C-1 | 뜻이 통하는 아이 말을 막힘으로 봄 | **ADDRESSED** | 2절. 막힘 틀림 0(2회차 5). AI 오판 1 을 앱이 무름 |
| I-1 | 3단계 받침 닫기에서 '같이 말해 보자' 꼴 + 새 질문 | **ADDRESSED** | 닫기 · 들리지 않음 자리 여섯(stuck-three 4, nospeech 2 · 4 · 5 · 6, 3회차 같은 자리) 모두 'Let's move on.'. 다만 word-answers 가 이번엔 받침 3 에 이르지 않아 2회차의 바로 그 자리(word-answers 4 · 7)는 재현되지 않았다 |
| I-2 | 카드 답 바로 뒤에 다음 카드 질문 | **부분 ADDRESSED** | 바로 앞 턴이 카드 기회인 턴에서 AI 가 required 를 적어 앱이 되돌린 일 0, 연쇄 0. 남은 둘은 N-2: (a) 한 턴 늦게 온 카드 답(child-topic 5 'I drink the juice.' → 'With your family, what do you do?', preview-1 8 같은 꼴)은 'Previous turn was a card chance' 가 '아니요'라 규칙 779 와 cardChainGuardOf(talk-lesson.ts 1406) 밖이다. (b) word-answers 4 는 AI 가 next_move 를 follow_up 으로 적고 card_item 만 required 3 으로 두어 되돌림이 걸리지 않았다(되돌림이 next_move 만 본다) |
| I-3 | 막힌 질문을 같은 글로 다시 물음 | **아직 열림**(설계 결정 대기) | preview-1 4 'Me too! Rice and fish for lunch! What do you do at the table?' 같은 질문 2번째 그대로. 3회차도 같다. 'Me too!' 가 붙어 2회차보다 부드럽다 |
| I-4 | 한국어 설명에 영어 답 문장 | **ADDRESSED** | 설명 11건 모두 낱말 하나 + 뜻("'eat'는 '먹다'라는 뜻이야.") 꼴, 영어 문장 0, 규칙 815 · spoken.ts 거름 |
| I-5 | 재미 · 선생님 자기 말 없음 | 열림(D11) | 반응이 Oh · Yes 둘에서 Yum(6) · Wow · Fun · Me too · Nice 로 늘어 AI 질문 차례 20 가운데 10 에 자기 반응 한마디가 있다. 놀이 · 선생님 자신의 말은 'Me too!' 하나 |
| M-1 | 인사 끝 같은 글 · 뜻 '듣기 좋네!' | 뜻 **ADDRESSED**, 글은 D3 | 뜻 다섯 모두 '다행이다' 계열('잘 지낸다니 다행이다!' · '좋다니 다행이다!'). 영어는 다섯 번 같은 글(설계 고정, D3) |
| M-2 | nospeech 6 뜻 빠짐 · 'The sun is down.' 두 번 | 4회차 **ADDRESSED**, 3회차 재발 | 4회차 nospeech 6 뜻 있음 · 겹침 없음. 3회차 nospeech 5 는 AI 가 'Sand on your hands!' 를 tori_en 끝에 써 카드 질문과 두 번 들리고 뜻이 빠졌다. 서버 겹침 검사가 붙임 카드 줄을 견주지 않는다(코드 Minor, N-6 과 함께) |
| M-3 | 설명에 '틀렸다'는 말 | **ADDRESSED** | 0건 |
| M-4 | 바른 아이 말을 단원 단어로 바꿔 되풀이 | 4회차 **ADDRESSED**, 3회차 재발 | 4회차 nospeech 7 'We go home.' 되풀이 없음. 3회차 같은 자리 'We come home.' 재발 |
| M-5 | 카드 'Sand on your hands!' | **아직**(카드 몫) | child-topic 7 · nospeech 5 · word-answers 8 에 그대로 |
| M-6 | 재질문 기록 빈칸 | **ADDRESSED** | json 에 firstToriEn · firstFail · retryToriEn · retryFail |
| M-7 | 힌트가 질문과 안 맞음 | **ADDRESSED** | 불일치 0 |
| M-8 | '만났다' 셈에 learn · listen | **아직**(범위 밖) | 사용자 메시지 'Already met among them: eat, drink, go, learn' 그대로 |

## 4 대본별 사람 판정(요지)

칸: 막힘 판정(AI → 앱 → 사람) · 이어 묻기 · 카드 끼움 · 답 먼저 · 자기 반응. 뜻은 AI 차례 25 모두 있어 칸을 뺐다(한 덩이로 쓴 턴은 N-6).

### 4.1 아이가 꺼낸 이야기(`l3-child-topic`)

| 턴 | 아이 | 선생님 말 | 막힘 | 이어 묻기 | 끼움 | 답 먼저 | 자기 반응 | 한 줄 평 |
|---|---|---|---|---|---|---|---|---|
| 2 | I have a dog. | Oh, a dog! Is your dog big or small? 〈My dog is big.〉〈My dog is small.〉 | 맞음 | 예(따라가기) | — | 선택지(허용) | — | 2회차의 '같이 말해 보자' 가 강아지 질문이 됐다. 좋다 |
| 3 | My dog eats rice. | Yum, rice! / 앱: The sun is hot! What do you do with the juice? | 맞음 | 아니요 | **예** | 아니요 | Yum | AI 첫 시도 'Does your dog drink water too?' 가 노리는 단어(drink) 검사, 둘째 'What does your dog do with water?' 가 꼴 검사에 걸려 카드 자리. 강아지 밥 → 뜨거운 해 · 주스 비약(N-3) |
| 4 | My dog is big. | Wow, big dog! What is your dog's color? | 맞음 | 예(따라가기) | — | 아니요 | Wow | 좋다. 'What color is your dog?' 가 더 자연스럽지만 아이에겐 문제없다 |
| 5 | I drink the juice. | Nice, you drink the juice! With your family, what do you do? | 맞음(갈래 new_topic 은 오기) | 아니요 | 반 | 아니요 | Nice | 한 턴 늦게 온 카드 답 뒤 바로 필수 3(N-2 (a)). 반응은 있으나 다리가 없다 |
| 6 | I like soccer. | Oh, soccer! Do you play soccer with your family? | 맞음 | 예 | — | 아니요 | — | 좋다 |
| 7 | Yes I play with my dad. | Fun, with your dad! Sand on your hands! What do you do with water? | 맞음 | 아니요(돌아옴 1턴 뒤) | 반 | 아니요 | Fun | 축구 → 손에 모래. 이야기 장면으로는 이어지나 아이에겐 건너뜀. 뜻을 한 덩이로 씀(N-6) |
| 8 | We go to the lake. | Oh, the lake! Do you swim at the lake? | 맞음 | 예 | — | 아니요 | — | 좋다 |

3회차 같은 대본은 3턴 'Yum, rice! Your dog eats rice! Do you eat rice too?' 와 4턴 'Wow, a big dog! Let's go to the lake now.'(따라가기 상한 뒤 다리 한 줄 + 카드 질문)처럼 더 매끄러웠다. 같은 프롬프트라도 바퀴마다 결이 달라, 4회차를 대표로 보되 두 바퀴 모두 막힘 틀림 0 인 점이 핵심이다.

### 4.2 말소리 없음(`l3-nospeech`)

| 턴 | 아이 | 선생님 말 | 막힘 | 이어 묻기 | 끼움 | 답 먼저 | 자기 반응 | 한 줄 평 |
|---|---|---|---|---|---|---|---|---|
| 2 | (말소리 없음) | That's okay! Let's move on. 〈We eat rice and fish.〉 / 카드 필수 2 | — | — | 아니요(설계대로) | 설계대로 | — | 'I couldn't hear you.' 가 빠졌다(규칙 765, N-5). 4 · 5 · 6턴은 있다 |
| 3 | I drink the juice. | Yum, cold juice! Is it apple juice or orange juice? 〈It is apple juice.〉〈It is orange juice.〉 | 맞음 | 예 | — | 선택지(허용) | Yum | 좋다. 새 물음(어떤 주스)이라 N-1 이 아니다 |
| 4~6 | (말소리 없음) | I couldn't hear you. That's okay! Let's move on. 〈답〉 / 다음 카드 질문 | — | — | 아니요(설계대로) | 설계대로 | — | 설계대로. 6턴 뜻 있음 · 겹침 없음(M-2 닫힘) |
| 7 | We go home. | Yes, you go home! Car or bus? | 맞음 | 예 | — | 아니요 | — | 재질문 1회('Do you go home by car or by bus?' too_long → 'Car or bus?'). 되풀이로 come 을 끼우지 않았다(M-4 닫힘) |

### 4.3 첫 프리뷰 기록 장면(`l3-preview-1`)

| 턴 | 아이 | 선생님 말 | 막힘 | 이어 묻기 | 끼움 | 답 먼저 | 자기 반응 | 한 줄 평 |
|---|---|---|---|---|---|---|---|---|
| 2 · 3 | (잘 모르겠어요) ×2 | 받침 1 · 2 | — | — | — | 설계대로 | — | 설계대로. 설명 "'eat'는 '먹다'라는 뜻이야."(I-4 닫힘) |
| 4 | Yes I am hungry | Me too! Rice and fish for lunch! What do you do at the table? | 맞음 | 아니요(같은 질문 2번째) | — | 아니요 | Me too | I-3 그대로. 'Me too!' 로 2회차보다 사람 같다 |
| 5 | Yes I like fish. | Oh, you like fish! Do you like fish or rice? 〈I like fish.〉〈I like rice.〉 | 맞음 | 약함 | — | 선택지 | — | 방금 '생선 좋아해' 한 아이에게 '생선이야 밥이야?'(N-1 꼴) |
| 6 | We eat rice and fish. | Yum, rice and fish! The sun is hot! What do you do with the juice? | 맞음 | 아니요 | 반 | 아니요 | Yum | 두 턴 전 카드 질문의 답이라 되돌림 밖(N-2 (a)). 'The sun is hot!' 이 다리 노릇을 해 2회차보다 낫다 |
| 7 | Yes big fish. | Oh, a big fish! Is the fish big or small? 〈It is big.〉〈It is small.〉 | AI 틀림 → 앱 무름 → 맞음 | 약함 | — | 선택지 | — | 무름은 됐으나 다시 쓴 질문이 아이가 방금 한 말(big)을 되묻는다(N-1). 통째로 다시 써 약 5.7초 동안 선생님 말이 없다(N-4) |
| 8 | I drink the juice. | Yum, the juice! With your family, what do you do? | 맞음 | 아니요(돌아옴) | **예** | 아니요 | Yum | 늦게 온 카드 답 뒤 바로 필수 3, 다리 없음(N-2 (a)) |

### 4.4 막힘 셋과 못 알아들은 말(`l3-stuck-three`)

| 턴 | 아이 | 선생님 말 | 막힘 | 이어 묻기 | 끼움 | 답 먼저 | 자기 반응 | 한 줄 평 |
|---|---|---|---|---|---|---|---|---|
| 2~4 | (잘 모르겠어요) ×3 | 받침 1 · 2 · 3('Let's move on.') | — | — | 아니요(설계대로) | 설계대로 | — | 설계대로(I-1 닫힘). 설명 "'hungry'는 배고프다는 뜻이야." |
| 5 | Huh? | That's okay! Let's say it together. 〈I drink the juice.〉 | 맞음 | — | — | 설계대로 | — | 설계대로 |
| 6 | I drink juice. | Yum, juice! What juice do you drink? | 맞음 | 예 | — | 아니요 | Yum | 좋다. 'I drink the juice.' 되풀이가 없다(N-8) |
| 7 | I don't know. | That's okay! Let's say it together. 〈I drink apple juice.〉 | 맞음 | — | — | 설계대로 | — | 설명이 묻지 않은 낱말(juice)을 풀이(N-8) |
| 8 | We go to the lake. | Oh, the lake! Who do you go with? | 맞음 | 예 | — | 아니요 | — | 좋다. 힌트 'I go with my family.' 가 질문과 맞는다(M-7 닫힘) |

### 4.5 낱말 하나로 답하기(`l3-word-answers`)

대본의 아이 말이 설계 대화에 고정된 영향(5절): 3턴 'Yes.' 는 실제 질문('What do you do with the juice?')과 맞지 않아 생긴 막힘이고, 5 · 6 · 7 · 8턴의 낱말도 실제 질문과 어긋난다. 그래도 AI 는 한 번도 받침으로 가지 않고 장면 낱말로 받아 냈다(2회차는 일곱 턴 모두 받침). 되묻는 고르기(N-1)는 대본과 관계없이 나오는 꼴이다.

| 턴 | 아이 | 선생님 말 | 막힘 | 이어 묻기 | 끼움 | 답 먼저 | 자기 반응 | 한 줄 평 |
|---|---|---|---|---|---|---|---|---|
| 2 | Rice. | Yum, rice! We eat rice. / 앱: The sun is hot! What do you do with the juice? | 맞음 | 아니요 | **예** | 아니요 | Yum | 넓혀 들려주기 'We eat rice.' 좋다(02-2:196). 첫 시도 'Do you eat rice or fish?' 가 노리는 단어(eat), 둘째 'Rice or fish, which one?' 이 범위 밖(which)에 걸려 카드 자리(N-3) |
| 3 | Yes. | That's okay! Let's say it together. 〈I drink the juice.〉 | 맞음(2절) | — | — | 설계대로 | — | 대본 탓. 설명 "drink는 '마시다'라는 뜻이야." |
| 4 | Juice. | Yes, juice! You drink the juice. With your family, what do you do? | 맞음 | 아니요 | 반 | 아니요 | — | 되풀이 좋다. 뒤는 필수 3 을 follow_up 이름표로 붙여 되돌림을 비껴감(N-2 (b)) |
| 5 | Cold. | Yes, the juice is cold! Is it cold or hot? 〈It is cold.〉〈It is hot.〉 | 맞음 | 약함 | — | 선택지 | — | 되풀이 좋다. 뒤 질문이 방금 한 말(cold)을 되묻는다(N-1) |
| 6 | Lake. | Yes, the lake! We go to the lake. With your family, what do you do? | 맞음 | 아니요(같은 질문 2번째) | 반 | 아니요 | — | 아이가 'Lake.' 로 이미 답한 필수 3 을 같은 글로 다시 묻는다(N-1) |
| 7 | Big. | Yes, the lake is big! Is the lake big or small? 〈It is big.〉〈It is small.〉 | 맞음 | 약함 | — | 선택지 | — | N-1 |
| 8 | Water. | Yes, water! Sand on your hands! What do you do with water? 〈I wash my hands.〉 | 맞음 | 아니요 | 반 | 따라 할 말(꺼내기, 허용) | — | wash 를 꺼내는 자리라 따라 할 말은 설계 안(02-2:180). 'Listen and say!' 신호 말이 없다(N-7). 되풀이 'You see the water!' 는 억지 |

### 4.6 합계(사람 판정)

| 항목 | 4회차 | 2회차 | 비고 |
|---|---|---|---|
| 아이 차례 · 카드 자리 턴 | 39 · 14 | 39 · 22 | 14 가운데 설계대로(단추 · 들리지 않음 · 맞는 막힘) 12, 질문 검사 2, AI 막힘 오판 0 |
| AI 가 막힘이라 본 턴 · 틀림 | 4 · 0(앱이 무른 1 포함) | 12 · 5 | 2절 |
| 나간 AI 질문 차례 · 진짜 이어 묻기 · 되묻는 고르기 · 카드로 건너뜀 | 20 · 9 · 4 · 7 | 12 · 8 · 0 · 4 | 자동은 14/25(인사 다섯 포함). 되묻는 고르기는 N-1, 건너뜀 7 가운데 다리 없음 3(child-topic 3, preview-1 8, word-answers 2) |
| 답을 먼저 들려준 AI 질문 차례 | 7(선택지 6 · 꺼내기 1) | 1 | 모두 C202 (1) · 02-2:180 허용 범위이나 선택지 6 가운데 4 가 N-1 꼴이다. N-1 을 고치면 2쯤으로 준다 |
| 자기 반응 한마디 있는 AI 차례 | 10/20 | 2/17 | Yum 6 · Wow · Fun · Me too · Nice |
| 한국어 뜻 없는 AI 차례 · 같은 소리 두 번 · 장면 단정(AI) | 0 · 0 · 0 | 1 · 1 · 0 | 3회차 nospeech 5 는 두 번 · 뜻 없음 재발 |
| 재질문 | 4턴(통과 2 · 두 번 걸림 2) · 0.019달러 | 3턴 | 재질문 턴 전체 5.6~6.3초, 막힘 무름 턴은 그동안 선생님 말 없음 |
| 첫 문장 p50 · p95 | 1441 · 2216 ms | 1386 · 2251 ms | 같다 |

## 5 (다) 아이 눈 소감의 변화

**대화하는 느낌.** 크게 좋아졌다. 강아지 · 축구를 꺼내면 그 이야기를 묻고(Is your dog big or small? · What is your dog's color? · Do you play soccer with your family? · Who do you go with?), 낱말 하나로 답해도 문장으로 받아 준다(Yum, rice! We eat rice. · Yes, the juice is cold!). '같이 말해 보자' 는 39턴 가운데 7턴이고 모두 아이가 모른다고 했거나 못 들은 자리다. 2회차의 '내 말을 안 듣는다' 느낌은 사라졌다. 남은 어색함은 둘이다. 방금 한 말을 되묻는 고르기 질문 네 턴('Cold.' → '차가워, 뜨거워?', 'Yes big fish.' → '커, 작아?')은 아이가 '나 방금 말했는데?' 하게 만들고, 반응 한마디 뒤 카드 질문으로 건너뛰는 일곱 턴 가운데 셋은 다리가 없다.

**1단계와 다른 점.** 열린 질문('What juice do you drink?' · 'Who do you go with?' · 'Car or bus?') · 틀 힌트 · 되풀이가 중심이 됐고, 아이가 꺼낸 이야기를 두 턴 따라간다. 선택지 소리는 AI 질문 20 가운데 6 인데 그중 4 가 되묻기라, N-1 을 고치면 3단계 결('한 문장으로 답하게 묻고', 02-2:328)이 선다.

**재미.** 반응 어휘가 늘어(Yum · Wow · Fun · Me too · Nice) 기계적인 느낌이 줄었다. 놀이와 선생님 자신의 말은 'Me too!' 하나뿐이라 D11 그대로다.

## 6 새로 본 것과 고칠 것(심각도 · 근거 · 몫)

**N-1 [Important] 짧은 답 뒤에 아이가 방금 한 말을 되묻는다.** preview-1 5('Yes I like fish.' → 'Do you like fish or rice?' 〈I like fish.〉), preview-1 7('Yes big fish.' → 'Is the fish big or small?' 〈It is big.〉), word-answers 5('Cold.' → 'Is it cold or hot?' 〈It is cold.〉), word-answers 7('Big.' → 'Is the lake big or small?' 〈It is big.〉), word-answers 6('Lake.' 로 답한 필수 3 을 같은 글로 다시). 정본은 낱말 · 짧은 답에 바른 문장을 한 번 들려주고 '문장으로 다시 말하게 묻지 않는다'(02-2:196)고 하는데, 선택지 하나가 아이 말과 같은 고르기 질문은 그 말을 문장으로 다시 하라는 것과 같다. 이어 묻기는 아이 말에 새로 묻는 질문이다(02-2:184). AC-15o (가)의 자동 검사는 '문장으로 말해 봐' 꼴만 보므로 통과시켰다. 원인은 C202 (1)(선택지는 이어 묻는 고르기에만)과 C204 (2)(짧은 답은 되풀이)가 합쳐져, AI 가 되풀이 뒤 질문을 '그 낱말 or 반대말' 로 가장 쉽게 만드는 데 있다. 몫: **프롬프트**(짧은 답을 되풀이한 뒤의 질문은 새 것을 묻는다 — 다른 물건 · 누구와 · 어디서 · 좋아하는지. 선택지 둘 가운데 하나가 아이가 방금 한 말이면 안 된다. 아이가 낱말로 답한 질문은 같은 글로 다시 묻지 않는다) + **앱**(선택지 가운데 아이 말의 낱말이 든 것이 있으면 선택지를 버린다, 코드 Minor. 같은 질문 상한을 '아이가 말로 답한 질문'에는 1 로 두는 설정도 길이다).

**N-2 [Important 아래] 카드 답 뒤 건너뜀의 남은 두 길(I-2 잔여).** (a) 한 턴 늦게 온 카드 답: child-topic 5, preview-1 6 · 8. 'Previous turn was a card chance' 가 바로 앞 선생님 차례만 보므로 규칙 779 와 되돌림(talk-lesson.ts 1406)이 걸리지 않는다. (b) word-answers 4: AI 가 next_move 를 follow_up 으로 적고 card_item 만 required 로 두면 되돌림(next_move 만 봄)을 비껴간다. 근거 02-2:184 · 192, C204 (6). 몫: **앱**(되돌림이 card_item.kind === required 도 보게, 그리고 '앞 카드 기회' 를 '아이가 가장 최근 카드 질문의 노리는 단어를 스스로 썼다(self_used_words ∩ 그 질문 targets)' 로 넓힘 — 설계 숫자 아님) + 프롬프트 한 줄('늦게라도 카드 질문에 답하면 그 답에 먼저 이어 묻는다').

**N-3 [Minor] 질문 검사에 두 번 걸린 뒤 카드 질문이 다리 없이 붙는다.** child-topic 3, word-answers 2. 두 번 다 첫 시도가 노리는 단어를 질문에 넣었다('Does your dog drink water too?' · 'Do you eat rice or fish?', A4-03 · 규칙 756)고 둘째 시도가 범위 밖 낱말(which) · 3인칭 꼴(does)에 걸렸다. 몫: 프롬프트(다시 쓰게 할 낱말은 질문에 넣지 말고 그 물건 · 상대를 묻는 예 'Do you like fish?' 를 756 에 붙임) · D7(effort) 참고. 걸린 뒤의 카드 자리 자체는 설계대로(02-2:202)다.

**N-4 [Minor] 막힘 무름 턴은 통째로 다시 써 약 5.7초 동안 선생님 말이 없다**(preview-1 7: 2699 + 2998 ms). 맞장구(talk.wait_line_seconds 3)가 한 번 든다. 빈도가 낮고(39 가운데 1) 안전망이라 두되 횟수를 기록해 둔다. 관찰 도구 몫.

**N-5 [Minor] 들리지 않음 첫 턴에 'I couldn't hear you.' 가 빠짐**(nospeech 2, 규칙 765 · 02-2:269). 1/5.

**N-6 [Minor] tori_ko 를 문장마다가 아니라 한 덩이로 쓴 턴 넷**(child-topic 7, nospeech 4 · 5 · 6, 규칙 783). 이번엔 지워진 문장이 없어 뜻이 다 보였지만, 문장 하나가 걸리면 뜻 전체가 빠지는 길이다(3회차 nospeech 5 가 그 예). 몫: 서버가 한 덩이면 문장 수로 나눠 맞추거나, 겹침 검사에 붙임 카드 줄을 더한다(M-2 와 함께).

**N-7 [Minor] 꺼내기 턴에 신호 말이 없음**(word-answers 8: 따라 할 말 〈I wash my hands.〉 앞에 'Listen and say!' 없음, 규칙 819 · 02-2:204). 되풀이 'You see the water!' 도 억지다.

**N-8 [Minor] 되풀이 · 설명의 작은 빈틈.** stuck-three 6 'I drink juice.' 에 관사 되풀이 없음(AC-15o (가) recastWord juice 기대). stuck-three 7 설명이 묻지 않은 낱말(juice)을 풀이. 몫: 프롬프트.

**N-9 [Minor] child_kind 가 답인 문장을 new_topic · short_related 로 적음**(child-topic 5 · 8, preview-1 5). 막힘 갈래가 아니라 영향이 없다. 기록 통계에만 영향.

열린 설계 결정: I-3(막힌 질문을 같은 글로 다시 묻지 않기 — preview-1 4 그대로), D11(재미), D3(인사 고정), M-5(카드 장면 문장).

## 7 다음 대본에서 볼 것

1. N-1 · N-2 고침 뒤 preview-1 · word-answers 두 대본만 다시 돌려(약 16호출) 되묻는 고르기 0 · 같은 질문 2번째 0 · 늦은 카드 답 뒤 required 0 을 본다. 사람 판정 칸에 '선택지에 아이 말이 들었는가' 를 더한다.
2. word-answers 대본의 아이 말을 실제 질문에 맞게 고친다(지난 보고 5절 2). 지금은 3턴 'Yes.' 가 대본 탓 막힘이다.
3. 두 낱말 관련 말('Big fish.' · 'Cold juice.')을 대본에 넣어 AI 갈래(short_related)가 맞는지 본다 — 앱 안전망(영어 낱말 셋 이상) 밖의 자리다.
4. 같은 프롬프트로 두 바퀴 돌려 재발 항목(M-2 · M-4 · N-5)의 빈도를 센다. 한 바퀴 0 은 닫힘의 증거로 약하다.
5. 요청자 시험 때 함께 물을 것: I-3(막힌 질문을 같은 글로 다시 묻지 않을지), 선택지 소리가 3단계에 얼마나 있어도 되는지(D1).
