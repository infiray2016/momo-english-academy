# 회화 대본 2회차 대화 품질 판정(talk:observe 2회차, 2026-11-05 23:56 실호출)

작성: 설계 · 화면 검토자(Fable · max, 읽기 전용) · 2026-11-06 · 맡긴 곳: 컨트롤러 브리프(회화 대본 2회차 대화 품질 판정)

읽는 법. 판정 대상은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/talk-observe-2/2026-11-05-talk-observe-settings.md` 와 같은 폴더의 json(턴마다 AI 원 응답 · 사용자 메시지)이다. 비교용 1회차는 `…/talk-observe-1/`(C203 전)이다. `02-2:251` 은 `specs/02-2-세션과-단계표.md` 251줄이고, '규칙 n' 은 워크트리 `.claude/worktrees/p13d/src/core/ai/calls/talk-lesson.ts` 의 n줄(프롬프트 고정부)이다. '카드'는 `seed/lessons/talk/3/1.json` 배정 1 이다. 턴 번호는 대본 보고의 '차례' 번호다. 〈 〉 는 글 없이 소리로만 나가는 줄이다. 코드 · 시드 · 설정은 바꾸지 않았고 실호출도 하지 않았다.

## 1 판정 한 줄

**아직.** 답을 먼저 들려주기 · 한국어 뜻 · 같은 소리 두 번 · 지연은 고쳐졌고 이어 묻기도 살아났지만, AI 가 뜻이 통하는 아이 말을 '막힘'으로 보는 과판정이 다섯 대본 가운데 셋에서 되풀이되어(12턴, 1회차 8턴) 요청자가 지적한 '일방통행 · 1단계와 똑같다' 경험이 그대로 재현된다. 이것 하나(Critical)와 받침 닫기 꼴(Important)을 고친 뒤 3회차 대본으로 확인하고 요청자 시험을 부탁하는 것이 맞다.

## 2 대본별 사람 판정 표

칸 차례: 이어 묻기였는가 · 카드 질문을 맥락 없이 끼웠는가 · 답을 먼저 들려줬는가 · 한국어 뜻 · 장면 단정 · 같은 소리 두 번 · 오늘 이야기로 돌아왔는가. '—' 는 그 턴에 해당 없음이다. '막힘 판정' 은 AI 의 stuck 칸이 맞았는지에 대한 내 판정이다(정본 02-2:251 '못 알아들었다는 뜻이거나 질문과 관계없는 한두 낱말').

### 2.1 아이가 꺼낸 이야기(`l3-child-topic`)

| 턴 | 아이 | 실제 선생님 말 | 이어 묻기 | 맥락 없이 끼움 | 답 먼저 | 뜻 | 장면 단정 | 두 번 | 돌아옴 | 막힘 판정 | 한 줄 평 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | I am good. | Good to hear! Let's learn some new words! | — | — | 아니요 | 예(뜻 '듣기 좋네!' 는 어색) | — | 아니요 | — | — | 정본 02-2:169 예문 그대로. 다섯 대본 모두 같은 글이다 |
| 2 | I have a dog. | That's okay! Let's say it together. 〈We eat rice and fish.〉 | 아니요(기대 예) | — | 예(기대 아니요) | 예 | 아니요 | 아니요 | — | **틀림**(네 낱말 문장, 아이가 꺼낸 이야기) | 아이 눈에는 강아지 얘기를 못 들은 척하고 '같이 말해 보자'로 넘어간 턴. 설명 글에 'I eat rice.' 영어 문장이 글로 보임 |
| 3 | My dog eats rice. | Oh, your dog eats rice! / 앱 붙임: The sun is hot! What do you do with the juice? | 아니요(AI 는 'What does your dog like?' 를 썼으나 검사에 걸려 재질문 뒤에도 걸림) | **예**(강아지 → 해가 뜨거워 · 주스) | 아니요 | 예 | 아니요(카드 장면 문장) | 아니요 | 아니요(강제) | 맞음(child_topic 참 · follow_child) | AI 의 판단은 설계 예시와 같았고 앱의 질문 검사와 재질문 실패가 비약을 만들었다. 첫 시도 글과 둘째 걸림 까닭이 기록에 없다 |
| 4 | My dog is big. | That's okay! Let's say it together. 〈I drink the juice.〉 | 아니요 | — | 예(기대 아니요) | 예 | 아니요 | 아니요 | 아니요(기대 예) | **틀림**(문장) | 같은 오판 두 번째. 설계 예시 'A big dog! Oh, juice for you. What do you do with it?' 와 가장 멀다 |
| 5 | I drink the juice. | Yes, juice! Do you like juice? | 예 | — | 아니요 | 예 | — | 아니요 | — | 맞음 | 자연스럽다. 재질문 1회(too_long → 통과). 'Do you like juice?' 는 필수 2 의 카드 쉬운 질문과 같은 글이라 뒤에 막히면 되풀이될 수 있다(잠재) |
| 6 | I like soccer. | Oh, soccer! Do you play soccer with your family? | 예(따라가기) | — | 아니요 | 예 | — | 아니요 | — | 맞음 | 좋다. 설계 예시와 거의 같고 가족으로 다리를 놓았다 |
| 7 | Yes I play with my dad. | Oh, with your dad! With your family, what do you do? | 아니요(필수 3 으로 돌아옴) | 반(dad → family 다리는 있으나 방금 '아빠랑 축구한다'고 한 아이에게 '가족이랑 뭐 해?' 는 되묻는 느낌) | 아니요 | 예 | — | 아니요 | 예(따라가기 1턴 뒤, 상한 2 안) | 맞음 | 되풀이 'I play with my dad.' 좋다. 카드 질문을 자기 말로 바꿔 물었으면 더 자연스러웠다 |
| 8 | We go to the lake. | Oh, the lake! Is the lake big? | 예 | — | 아니요 | 예 | — | 아니요 | — | 맞음 | 좋다 |

### 2.2 말소리 없음(`l3-nospeech`)

| 턴 | 아이 | 실제 선생님 말 | 이어 묻기 | 맥락 없이 끼움 | 답 먼저 | 뜻 | 장면 단정 | 두 번 | 돌아옴 | 막힘 판정 | 한 줄 평 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | I am fine. | Good to hear! Let's learn some new words! | — | — | 아니요 | 예 | — | 아니요 | — | — | 위와 같다 |
| 2 | (말소리 없음) | I couldn't hear you. That's okay! 〈We eat rice and fish.〉 / The sun is hot! What do you do with the juice? | — | 아니요(닫고 다음 이야기, 설계대로) | 예(설계대로) | 예 | 아니요 | 아니요 | — | — | 설계대로. 설명에 영어 문장이 들었으나 들리지 않음 차례는 설명을 보이지 않으므로(hints.ts koExplanationShownOf) 화면에 안 나간다 |
| 3 | I drink the juice. | Yes, you drink the juice! Is it cold or hot? | 예 | — | 아니요 | 예('그건 차가워 아니면 뜨거워?' 는 번역투) | — | 아니요 | — | 맞음 | 좋다. 1회차의 'apple juice or orange juice' 보다 범위 안이다 |
| 4 | (말소리 없음) | I couldn't hear you. That's okay! 〈It is cold.〉 / With your family, what do you do? | — | 아니요(설계대로) | 예 | 예 | — | 아니요 | — | — | 설계대로 |
| 5 | (말소리 없음) | I couldn't hear you. That's okay! 〈We go to the lake.〉 / Sand on your hands! What do you do with water? | — | 아니요 | 예 | 예 | 반(카드 'Sand on your hands!' 는 아이 상태 서술) | 아니요 | — | — | 설계대로 |
| 6 | (말소리 없음) | I couldn't hear you. That's okay! The sun is down. 〈I wash my hands.〉 / The sun is down. What do you do now? | — | 아니요 | 예 | **아니요**(AI 가 tori_ko 를 한 덩이로 써서 뜻 전부 빠짐) | — | **예**('The sun is down.' 이 AI 문장과 카드 질문에서 연달아, 자동은 아니요) | — | — | AI 가 tori_en 에 답과 질문을 써 앱이 지웠다(규칙 815 · 783 어김). 막힘 화면 직전이라 실제 영향은 작다 |
| 7 | We go home. | Oh, home! We come home! Is it far or near? | 예 | — | 아니요 | 예 | — | 아니요 | — | 맞음 | 질문은 좋다. 아이의 바른 문장 'We go home.' 을 'We come home.' 으로 되풀이해 단원 단어를 끼워 넣었다(02-2:184 '틀린 말은' · 198 '뜻을 바꾸지 않으며') |

### 2.3 첫 프리뷰 기록 장면(`l3-preview-1`)

| 턴 | 아이 | 실제 선생님 말 | 이어 묻기 | 맥락 없이 끼움 | 답 먼저 | 뜻 | 장면 단정 | 두 번 | 돌아옴 | 막힘 판정 | 한 줄 평 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | I am fine I am fine | Good to hear! Let's learn some new words! | — | — | 아니요 | 예('듣던 중 반가운 말이네!' 는 어른 말투) | 아니요 | 아니요 | — | — | 인식이 두 번 붙은 말을 되받지 않았다(좋음) |
| 2 | (잘 모르겠어요) | That's okay! Let's say it together. 〈We eat rice and fish.〉 | — | — | 예(설계대로) | 예 | — | 아니요 | — | — | 설계대로. 설명 "'eat'는 '먹다'" 는 낱말 뜻이라 괜찮다 |
| 3 | (잘 모르겠어요) | No problem! Let's try an easy one. / Are you hungry? | — | — | 아니요 | 예 | — | 아니요 | — | — | 설계대로 |
| 4 | Yes I am hungry | Oh, hungry! Rice and fish for lunch! What do you do at the table? | **아니요**(자동 예. AI 는 follow_up 이라 적었지만 카드 필수 1 원문을 토씨 그대로, 같은 질문 2번째) | — | 아니요(프리뷰의 따라 할 말 · 선택지가 없어졌다) | 예 | 아니요 | 아니요 | — | 맞음 | 두 번 막힌 질문을 같은 글로 다시 물었다. 소리 줄이 없어 프리뷰보다 낫지만 아이 눈에는 '아까 그 질문'. 설계 예시는 'Do you like fish?' |
| 5 | Yes I like fish. | Oh, you like fish! Do you like fish with rice? | 예 | — | 아니요 | 예 | — | 아니요 | — | 맞음 | 좋다. child_topic 참은 오판(생선은 카드 주제)이나 영향 없음 |
| 6 | We eat rice and fish. | Yes, you eat rice and fish! The sun is hot! What do you do with the juice? | **아니요**(기대 예. 규칙 752 '카드 답 뒤엔 이어 묻기' 를 어김) | **예**(주스가 갑자기) | 아니요 | 예 | 아니요(장면 문장) | 아니요 | — | 맞음 | 카드 필수 2 를 카드 글 그대로 붙여 말했다. 설계 예시는 'Is the fish big?' 뒤에 'Oh, cold juice, too.' 로 다리를 놓는다 |
| 7 | Yes big fish. | Oh, a big fish! The juice is cold. 〈I drink the juice.〉 | 아니요 | — | 예(기대 아니요) | 예 | 아니요('The juice is cold.' 는 물건 말) | 아니요 | — | **틀림**(세 낱말, 앞 이야기에 닿음) | AI 의 tori_en 은 설계 예시와 거의 같았다('… What do you do with it?'). stuck 참 때문에 질문이 지워지고 답 소리로 갔다. 설명 "'마셔요'라고 말하면 돼" 는 답을 한국어로 준 것 |
| 8 | I drink the juice. | Yes, you drink the juice! Do you like cold juice? | 예 | — | 아니요 | 예 | — | 아니요 | — | 맞음 | 좋다 |

### 2.4 막힘 셋과 못 알아들은 말(`l3-stuck-three`)

| 턴 | 아이 | 실제 선생님 말 | 이어 묻기 | 맥락 없이 끼움 | 답 먼저 | 뜻 | 장면 단정 | 두 번 | 돌아옴 | 막힘 판정 | 한 줄 평 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | I am fine. | Good to hear! Let's learn some new words! | — | — | 아니요 | 예 | — | 아니요 | — | — | 위와 같다 |
| 2 | (잘 모르겠어요) | That's okay! Let's say it together. 〈We eat rice and fish.〉 | — | — | 예(설계대로) | 예 | — | 아니요 | — | — | 설계대로. 설명 '모를 때는 괜찮아…' 좋다 |
| 3 | (잘 모르겠어요) | That's okay! Let's try an easier one. / Are you hungry? | — | — | 아니요 | 예 | — | 아니요 | — | — | 설계대로 |
| 4 | (잘 모르겠어요) | That's okay! Let's move on. 〈We eat rice and fish.〉 / The sun is hot! What do you do with the juice? | — | 아니요(닫기 뒤 다음 카드, 설계대로) | 예(설계대로) | 예 | — | 아니요 | — | — | 닫기 꼴이 맞다('Let's move on.'). 설명 "'I'm hungry.'는 '나 배고파.'" 는 쉬운 질문 답의 영어 노출 |
| 5 | Huh? | That's okay! Let's say it together. 〈I drink the juice.〉 | — | — | 예(설계대로) | 예 | — | 아니요 | — | 맞음 | 설계대로. 설명 "'Huh?'는 잘 이해하지 못했다는 뜻이야" 는 아이 말을 평하는 말이라 불필요 |
| 6 | I drink juice. | You drink juice! Is it cold or hot? Listen and say! 〈It is cold.〉〈It is hot.〉 | 예 | — | 예(선택지, C202 (1) 이 허용한 이어 묻는 고르기) | 예 | — | 아니요 | — | 맞음 | 되풀이 'I drink the juice.' 좋다. 재질문 1회(offband 'warm' → 통과). 3단계인데 선택지 소리가 붙어 1단계 결이 난다 |
| 7 | I don't know. | That's okay! Let's say it together. 〈It is cold.〉 | — | — | 예(설계대로) | 예 | — | 아니요 | — | 맞음 | 설계대로. 설명 '차가우면 cold, 뜨거우면 hot이야' 좋다 |
| 8 | We go to the lake. | You go to the lake! What do you do with your family? | **아니요**(자동 예. 필수 3 과 같은 뜻의 질문을 AI 가 follow_up 으로 적음) | 반 | 아니요 | 예 | — | 아니요 | — | 맞음 | 방금 '가족이랑 호수에 간다'고 한 아이에게 '가족이랑 뭐 해?'. next_hints 가 'We eat rice and fish.' 라 힌트를 열면 질문과 맞지 않는다 |

### 2.5 낱말 하나로 답하기(`l3-word-answers`)

이 대본은 2턴에서 어긋난 뒤 아이 말이 실제 질문과 맞지 않게 되므로(대본이 설계된 대화의 아이 말을 고정해 둔 탓) 3~8턴은 '막힘이 이어질 때 앱이 버티는가' 를 보는 자료다.

| 턴 | 아이 | 실제 선생님 말 | 이어 묻기 | 맥락 없이 끼움 | 답 먼저 | 뜻 | 장면 단정 | 두 번 | 돌아옴 | 막힘 판정 | 한 줄 평 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Fine. | Good to hear! Let's learn some new words! | — | — | 아니요 | 예 | 아니요 | 아니요 | — | — | 위와 같다 |
| 2 | Rice. | That's okay! Let's say it together. 〈We eat rice and fish.〉 | 아니요(기대 예) | — | 예(기대 아니요) | 예 | 아니요 | 아니요 | — | **틀림**(질문에 든 낱말, 넓혀 들려주기 자리 02-2:196) | 1회차는 같은 입력을 'Oh, rice! You eat rice.' 로 받았다. 판정이 흔들린다. 설명에 'I eat rice.' 영어 노출 |
| 3 | Yes. | That's okay! Let's try an easy one. / Are you hungry? | 아니요 | — | 아니요 | 예 | — | 아니요 | — | 반(같이 말하자 했는데 'Yes') | AI 가 tori_en 에 'Do you eat rice at lunch?' 를 써 지워졌다(규칙 815). 설명 "'Yes'는 질문에 맞는 대답이 아니었어" 는 틀렸다고 말하는 것(02-2:253) |
| 4 | Juice. | That's okay! Let's say it together. 〈We eat rice and fish.〉 / The sun is hot! What do you do with the juice? | 아니요 | 아니요(닫기 뒤 다음 카드) | 예 | 예 | — | 아니요 | — | 반 | **닫기인데 '같이 말해 보자' 꼴**. 따라 할지 새 질문에 답할지 아이가 헷갈린다(02-2:261 · 규칙 762 '답을 한 번 말해 주고 다음 이야기'). 설명 "'Juice.'는 질문에 맞는 답이 아니라서" 도 틀렸다는 말 |
| 5 | Cold. | That's okay! Let's say it together. 〈I drink the juice.〉 | 아니요(기대 예) | — | 예 | 예 | — | 아니요 | — | **틀림**(장면에 닿는 낱말, 설계 'Cold juice, yum!') | 1회차는 'Oh, cold juice! Nice.' 로 받았다 |
| 6 | Lake. | That's okay! Let's try an easy one. / Do you like juice? | 아니요 | — | 아니요 | 예 | — | 아니요 | — | 반 | AI 가 쉬운 질문을 tori_en 에도 써 지워졌다 |
| 7 | Big. | That's okay! Let's say it together. 〈I drink the juice.〉 / With your family, what do you do? | 아니요 | 아니요 | 예 | 예 | — | 아니요 | — | 맞음(관계없는 한 낱말) | 4턴과 같은 닫기 꼴 문제 |
| 8 | Water. | That's okay! Let's say it together. 〈We go to the lake.〉 | 아니요 | — | 예 | 예 | — | 아니요 | — | 맞음 | 이 대본은 AI 질문 차례가 0 이다. 2턴 오판 하나가 수업 전체를 받침 일곱 번으로 무너뜨렸다 |

### 2.6 합계(사람 판정)

| 항목 | 2회차 | 1회차 | 비고 |
|---|---|---|---|
| 아이 차례 · 카드 자리 턴 | 39 · 22 | 39 · 24 | 카드 자리 22 가운데 설계대로(단추 막힘 · 들리지 않음 · 닫기)는 10, AI 의 막힘 판정 때문은 12 |
| AI 가 막힘이라 본 턴 · 그 가운데 틀림 | 12 · 5(반 3 · 맞음 4) | 8 · 3 | 틀림: child-topic 2 · 4, preview-1 7, word-answers 2 · 5 |
| 실제로 나간 AI 질문 차례 · 그 가운데 진짜 이어 묻기 | 12 · 8 | 자동 15 · 5 | 아닌 넷: child-topic 7(돌아옴, 설계 안) · preview-1 4(막힌 질문 재질문) · preview-1 6(카드 필수 2) · stuck-three 8(필수 3 변형) |
| 카드 질문을 맥락 없이 끼운 턴(AC-15o (라)) | 2(child-topic 3 · preview-1 6), 반 2 | 7 | 설계대로 닫은 뒤 붙는 카드 질문(nospeech 2 · 4 · 5 · 6, stuck-three 4, word-answers 4 · 7)은 세지 않았다 |
| AI 차례에 답을 먼저 들려준 턴 | 1(stuck-three 6 선택지, 허용 범위) | — | 프리뷰의 Critical 1 은 닫혔다 |
| 한국어 뜻 빠진 AI 차례 | 1(nospeech 6) | 0 | 뜻 칸 한 덩이 쓰기 |
| 장면 단정(AI) | 0 | 0 | 카드 'Sand on your hands!' 만 남음 |
| 같은 소리 두 번 | 1(nospeech 6, 자동 놓침) | 0 | 소리 줄 겹침은 없어졌다 |
| 재질문 | 3턴(통과 2 · 실패 1) | — | 4절 ④ |
| 첫 문장 p50 · p95 | 1386 · 2251 ms | 1347 · 2925 ms | 재질문 턴은 전체 5.6~6.6초 |

## 3 아이 눈 소감

**대화하는 느낌.** 아이가 카드 질문에 답하거나 막히는 길에서는 이제 대화가 된다. 'Do you like fish with rice?' → 'Do you like cold juice?', 'Oh, soccer! Do you play soccer with your family?' → 'Oh, the lake! Is the lake big?' 처럼 아이 말을 받아 다음을 묻고, 답을 먼저 들려주지 않으며, 뜻이 붙는다. 반응이 첫 문장 1.4초에 나와 맞장구가 끼어들 틈도 줄었다. 그런데 아이가 자기 이야기를 꺼내는 순간('I have a dog.' · 'My dog is big.' · 'Yes big fish.' · 'Rice.' · 'Cold.') 선생님이 '괜찮아! 같이 말해 보자' 하고 답 소리를 틀어 준다. 초등 4학년 아이에게 이것은 '내 말을 안 듣는다' 로 들린다. 설계가 가장 살리려던 자리(따라가기 · 넓혀 들려주기)가 가장 자주 무너진다.

**1단계와 무엇이 다른가.** 다른 점은 보인다. 선택지 소리 없이 열린 질문('What do you do with the juice?' · 'Is it cold or hot?')을 하고, 힌트는 틀('I ___ the juice.')이며, 아이 문장을 바른 문장으로 되풀이한다('I play with my dad.'). 그러나 39턴 가운데 22턴이 '괜찮아! 같이 말해 보자 + 답 소리' 였고, 그 가운데 12턴은 AI 의 막힘 판정이 만든 것이라, 아이가 말을 많이 할수록 오히려 1단계의 따라 말하기 꼴로 떨어진다. 낱말 하나로 답하는 대본은 AI 질문 차례가 0 이었다.

**재미.** 거의 없다. 반응은 'Oh, X!' · 'Yes, you X!' 두 꼴이 AI 차례 열일곱 가운데 열다섯이고, 설계 예시에 있는 'Yum!' · 'Me too!' 같은 선생님의 자기 반응이나 표본 2 의 놀이(소에게 먹이 주기)가 한 번도 없다. 카드의 praiseLines('Wow!')도 쓰이지 않았다. 틀린 말은 없지만 사람 같은 한마디가 없다. 인사 끝도 다섯 번 모두 같은 글이다.

## 4 고칠 것(심각도 · 근거 · 몫)

### 4.1 Critical

**C-1. 뜻이 통하는 아이 말을 막힘으로 본다(막힘 과판정).** 근거: child-topic 2 · 4('I have a dog.' · 'My dog is big.'), preview-1 7('Yes big fish.'), word-answers 2 · 5('Rice.' · 'Cold.'). 정본은 막힘으로 볼 말을 '못 알아들었다는 뜻이거나 질문과 관계없는 한두 낱말'로 좁히고(02-2:251), 카드 주제 밖의 문장은 따라가기(02-2:194), 질문에 닿는 낱말 답은 넓혀 들려주기(02-2:196)로 둔다. 프롬프트는 stuck 칸 설명 한 줄(talk-lesson.ts 515 'did not understand, or one or two words unrelated to the question')이 경계의 전부이고, '막힘을 먼저 정하라'(규칙 761)와 말 입력 턴마다 늘 붙는 'If stuck' 다섯 줄이 막힘 쪽으로 기울인다. 따라가기(규칙 755)와 막힘의 우선순위를 말하는 문장이 없다. 1회차 같은 입력('Rice.' · 'Cold.')을 다르게 판정한 것은 effort low · 생각 끔(C112)에서 첫 칸을 숙고 없이 쓰기 때문이다. 요청자 소감 (1) '일방통행 · 1단계와 똑같다' 의 남은 원인이다.
- 몫: **프롬프트(주)**. (가) stuck 설명을 '못 알아들었다는 말(Huh? · What? · I don't know)이거나, 질문과도 오늘 장면과도 관계없는 한두 낱말일 때만 참. 뜻이 통하는 영어 문장은 다른 이야기여도 막힘이 아니라 child_topic(따라가기)이고, 질문이나 장면에 든 낱말 하나는 막힘이 아니라 그 낱말을 담은 문장으로 되풀이한다' 로 바꾸고 예를 둘씩 붙인다. (나) 판정을 참 · 거짓 하나가 아니라 아이 말의 갈래(answer · new_topic · short_related · not_understood · unrelated_words) 한 칸으로 받고 앱이 not_understood · unrelated_words 만 막힘으로 세는 쪽이 더 단단하다(코드 몫, 설계 숫자 아님. 스키마 · 흐름 한 곳). 
- 몫: **설계(작게)**. 02-2:251 '막힘으로 볼 말' 행에 경계 한 문장('뜻이 통하는 문장과 질문 · 장면에 닿는 낱말 답은 막힘이 아니다. 앞은 따라가기, 뒤는 넓혀 들려주기')을 더한다. 13절 한 줄이 먼저다. 정본에 이 경계가 암묵적이라 설계 빈틈이기도 하지만, 프롬프트가 정본 문장을 그대로 옮기고도 틀리므로 프롬프트 결함이 주다.

### 4.2 Important

**I-1. 3단계 받침 닫기(셋째)에서 '같이 말해 보자' 꼴.** word-answers 4 · 7: 'That's okay! Let's say it together. 〈답〉 + 다음 카드 질문'. 닫기는 답을 한 번 말해 주고 다음 이야기로 가는 자리이고(02-2:261, 규칙 762 '3 = the answer once and then the next topic') 따라 말할 차례가 없다. 아이는 따라 할지 새 질문에 답할지 모른다(한 화면 한 행동). 같은 자리에서 stuck-three 4 는 'Let's move on.' 으로 맞게 썼다. 원인은 규칙 815 가 받침 카드 자리의 예를 단계 구분 없이 'That's okay! Let's say it together.' 로만 둔 것. 몫: 프롬프트(815 예를 받침 1 · 3 으로 나눠 적음). 앱이 받침 3 에서 'say it together' 문장을 지우는 거름을 두면 더 단단하다(코드 Minor).

**I-2. 카드 답 뒤 이어 묻기 규칙(C202 (2))이 한 번 어긋났다.** preview-1 6: 아이가 'We eat rice and fish.' 로 필수 1 에 답하자 바로 필수 2 를 카드 글 그대로('The sun is hot! What do you do with the juice?') 물었다. 사용자 메시지는 'Previous turn was a card chance: yes' 였고 규칙 752 는 이어 묻기를 요구했다. 1회차의 연쇄 7 → 2회차 1 로 줄었지만 요청자가 프리뷰에서 본 바로 그 자리다. 몫: 프롬프트(752 를 '이때 next_move 는 required 가 될 수 없다' 로 더 세게) 와 D8 (나)(앱이 'Previous turn was a card chance: yes' 턴의 required 갈래를 되돌려 한 번 다시 쓰게 하는 규칙, C203 의 재질문 길을 그대로 씀). 대본 한 바퀴 더 보고 연쇄가 남으면 (나)를 권한다.

**I-3. 막힌 질문을 같은 글로 다시 묻는다.** preview-1 4: 두 번 막힌 필수 1 을 쉬운 질문 답 뒤에 토씨 그대로('Rice and fish for lunch! What do you do at the table?') 다시 물었다(같은 질문 2번째, talk.same_question_max 2 안). 정본은 막힌 차례 '바로 뒤' 턴만 막고(02-2:200) '닫은' 질문만 다시 묻지 않으므로(02-2:263) 규칙 위반은 아니다. 그러나 받침의 뜻('질문을 바꾸거나 돕는다')과 설계 예시('Do you like fish?')에 어긋나고, 요청자의 '두 번씩 말한다' 소감의 한 갈래다. 규칙 762 는 Reason 이 button · stuck 인 턴에만 걸려 이 턴(Reason '-')에는 힘이 없다. 몫: **설계 결정**(막힌 질문은 같은 대화에서 같은 글로 다시 묻지 않고, 그 낱말은 다시 쓰기 기회로 다른 질문에서 노린다. 02-2:200 한 문장 · 13절 한 줄) + 프롬프트 한 줄. 앱의 같은 질문 셈에서 막혔던 질문의 상한을 1 로 두는 설정(설정값)도 길이다.

**I-4. 한국어 설명에 영어 답 문장이 글로 보인다.** child-topic 2("'I eat rice.'처럼"), word-answers 2 · 5 · 7 · 8, stuck-three 4 등 일곱 턴. 설명은 막힘 턴에 말풍선 아래 글로 보이며(02-2:263, hints.ts koExplanationShownOf 가 button · stuck 이면 보임) '뜻 힌트' 다. 1~3단계 대화에서 영어 문장은 미리 보이지 않고(02-2:164, 요청자 결정 T2), 아이가 말할 영어는 소리로만(02-2:204), 영어 문장 힌트는 3단 힌트의 셋째 단(02-2:235)이다. 설명이 첫 막힘에 답 문장을 글로 주면 힌트 사다리를 건너뛰고 '보이는 걸 읽는' 턴이 된다. 몫: 프롬프트(explanation 설명에 '영어 문장을 쓰지 않는다. 낱말 하나와 뜻까지만') + 서버 거름(영어 문장이 든 설명은 그 문장을 지움, 코드 Minor).

**I-5. 재미 · 선생님의 자기 말이 없다.** AI 차례 열일곱 가운데 열다섯이 'Oh, X!' · 'Yes, you X!' 꼴이고 'Me too!' · 'Yum!' · 놀이가 0 이다. 요청자 의도 문서 3.1 '기계적인 대화 지양'(requester-wishes.md), 설계 예시(task-talk-design-gap.md 4.2 'Rice and fish, yum!' · 'Me too!'), 표본 2 턴 11~18(samples.md 182~198, 말 · 소 놀이). 프롬프트는 반응을 네 낱말 안(규칙 744)으로 두고 예를 'Oh, soccer!' 하나만 준다. 선생님이 사람의 삶을 지어내지 않는 규칙(778)은 나이 · 가족 · 집 · 학교에 한하므로 '나도 주스 좋아해' 같은 한마디는 막지 않는다. 몫: 프롬프트(반응 예를 대여섯 꼴로 — 'Yum!' · 'Me too!' · 'Wow, a big fish!' · 'Splash!' — 하고 '가끔 선생님 자신의 짧은 반응 한마디를 더해도 된다'를 둔다) + **설계 결정**(재미 요소를 카드에 둘지: 카드 praiseLines 처럼 '놀이 한 줄' 칸을 둘지는 D 항목으로). 요청자 소감 (5)에 닿는 고침이 이번 묶음에 없었다.

### 4.3 Minor

- **M-1. 인사 끝이 다섯 번 모두 'Good to hear! Let's learn some new words!'** 정본 예문(02-2:169)을 그대로 옮긴 것이고 설계상 1~3단계 인사는 고정이라(D3) 규칙 위반은 아니다. 뜻은 '듣기 좋네!' · '듣던 중 반가운 말이네!' 로 아이 말투가 아니다('다행이다!' · '잘 지냈다니 좋다!'). 몫: 프롬프트(예 둘 셋, 뜻은 자연스러운 우리말) · D3.
- **M-2. nospeech 6: AI 가 tori_en 에 답과 질문을 쓰고 tori_ko 를 한 덩이로 써서 뜻 전부가 빠지고 'The sun is down.' 이 두 번 들린다.** 규칙 783 · 815 어김. 자동 '같은 소리 두 번' 검사가 앱 붙임 줄과 AI 문장을 견주지 않아 놓쳤다(관찰 도구 몫). 막힘 화면 직전이라 실제 영향은 작다.
- **M-3. 설명에 '틀렸다'는 말.** word-answers 3("'Yes'는 질문에 맞는 대답이 아니었어"), 4("'Juice.'는 질문에 맞는 답이 아니라서"), stuck-three 5("'Huh?'는 잘 이해하지 못했다는 뜻이야"). 02-2:253 '틀렸다고 하지 않고'. 몫: 프롬프트(설명 칸에 '아이 말을 평하지 않는다').
- **M-4. 바른 아이 말을 단원 단어로 바꿔 되풀이.** nospeech 7 'We go home.' → recast 'We come home.'. 02-2:184(틀린 말만) · 198(뜻을 바꾸지 않는다). 몫: 프롬프트.
- **M-5. 카드 'Sand on your hands!'(필수 4)는 아이 상태 서술이 남은 것.** C202 (7) 뒤에도 그대로다. 몫: 카드.
- **M-6. 재질문 기록에 첫 시도 글과 둘째 걸림 까닭이 없다.** child-topic 3 의 'What does your dog like?' 가 왜 걸렸는지 알 수 없다('does' 가 3단계 어휘 범위 밖이라 추정). 몫: 관찰 도구(json 에 첫 시도 tori_en 과 두 번의 걸림 까닭을 남김).
- **M-7. stuck-three 8 의 next_hints('We eat rice and fish.')가 질문('What do you do with your family?')과 맞지 않는다.** 힌트를 열면 엉뚱하다. 몫: 프롬프트(힌트는 자기 질문의 답).
- **M-8. '만났다' 셈에 선생님 대사의 learn · listen 이 든다**(사용자 메시지 'Already met among them: … learn, listen'). 02-2:246 은 앞 세션의 선생님 질문에 나온 것만 든다. 범위 밖 관찰이라 컨트롤러 확인용.

### 4.4 브리프가 특히 짚은 자리의 답

- **① preview-1 7 'Yes big fish.'**: AI 의 말은 설계 예시대로였고 stuck 칸만 틀렸다. C-1 로 닫힌다.
- **② child-topic 2 · 4 와 따라가기 · 막힘의 경계**: 프롬프트는 경계를 stuck 설명 한 줄로만 두고 '막힘을 먼저 정하라' 와 늘 붙는 'If stuck' 계획으로 막힘 쪽에 기울어 있다. 설계는 02-2:251 · 194 · 196 으로 경계를 암묵적으로 두었을 뿐 '뜻이 통하는 문장은 막힘이 아니다' 를 말하지 않는다. 판정: **프롬프트 결함이 주, 설계 빈틈이 종**(C-1).
- **③ 카드 질문이 끼어드는 자리**: preview-1 6 과 child-topic 3 은 부자연(I-2, 앱 대체). child-topic 7 과 stuck-three 8 은 낱말 다리는 있으나 아이가 방금 한 말을 되묻는 결이다. 닫기 뒤 붙는 카드 질문(nospeech 2 · 4 · 5)은 설계대로이고 카드 장면 문장이 다리 노릇을 한다.
- **④ 재질문(C203) 셋**: child-topic 5(too_long → 통과, 결과 좋음), stuck-three 6(offband 'warm' → 통과, 결과 좋음), child-topic 3(두 번 걸림 → 카드 자리, 결과 나쁨 · 비약). 지연은 재호출 2.8~3.2초가 더해져 턴 전체 5.6~6.6초이고, 반응 첫 문장은 1.3초에 먼저 나가므로 아이가 듣는 공백은 반응 뒤 약 3초로 어림한다(스트리밍 순서는 코드로 확인하지 않았다). 비용은 턴당 약 0.005달러. 1회차 question_check 7 → 2회차 1. **유지할 만하다.**
- **⑤ 인사 · 뜻 · 장면 문장**: 인사 반응은 되받기가 없어져 사람 같아졌으나 다섯 번 같은 글(M-1). 뜻은 반말이며(C117 · 02-2:154 친구 말투라 해요체 요구와 부딪치지 않는다) 대체로 자연스럽고 번역투 셋('그건 차가워 아니면 뜨거워?' · '응, 너는 주스를 마시는구나!' · '듣기 좋네!'). AI 의 장면 단정은 0 이고 'The juice is cold.' 는 물건 말이라 괜찮다.

## 5 다음 대본에서 볼 것

1. C-1 고침 뒤 같은 다섯 대본을 다시 돌려 '막힘 판정 틀림' 이 0 인지, 특히 child-topic 2 · 4, preview-1 7, word-answers 2 · 5 다섯 자리를 본다. 같은 입력을 두 번 돌려(판정 흔들림) 둘 다 맞는지도 본다.
2. 낱말 하나로 답하기 대본은 아이 말을 실제 질문에 맞게 고쳐야 한다(2턴 뒤 아이 말이 설계 대화에 고정돼 3~8턴이 뜻 없는 비교가 됐다). 아이 말을 '선생님의 직전 질문에 낱말 하나로 답한다' 꼴로 두거나, 2턴 결과에 따라 갈라지는 대본으로 둔다.
3. 카드 답 뒤 required 갈래가 0 인지(I-2), 막힌 질문이 같은 글로 다시 나오는 턴이 0 인지(I-3).
4. 받침 3 턴의 선생님 말이 'say it together' 꼴이 아닌지(I-1), 설명에 영어 문장이 없는지(I-4).
5. 사람 판정 칸에 '막힘 판정 맞음 · 틀림' 과 '선생님 자기 반응 한마디 있음' 두 칸을 더하고, 자동 '같은 소리 두 번' 이 앱 붙임 줄과 AI 문장을 견주게 한다(M-2 · M-6).
6. 재질문 json 에 첫 시도 글과 걸림 까닭 둘을 남겨 child-topic 3 같은 실패를 가려낸다.
7. D7(effort low · medium 견주기)은 C-1 이 프롬프트로 닫히는지 먼저 보고 결정한다. 막힘 과판정이 프롬프트 고침 뒤에도 남으면 그때 medium 한 바퀴를 같은 대본으로 견준다.
