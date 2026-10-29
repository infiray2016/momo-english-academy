# 회화 4단계 · 5단계 표본 셋: 4~5학년 눈높이

2026-10-29 · 학습 설계자 · 브리프 `task-samples-level4-5.md` · 1단계 표본(`samples.md`)은 그대로 두고 같은 꼴로 썼다.

표본의 아이는 학교 영어 2년차 4학년이다. 짧은 문장으로 답하고, 모르는 말은 한국어로 묻는다. 브리프의 학년 대응(4학년 3~4단계, 5학년 4~5단계)은 참고값이고 결정이 아니다.

| 표본 | 단계 · 단원 · 수업 | 흐름 |
|---|---|---|
| A | 4단계 단원 2 '방과 후 활동' 수업 1 '좋아하는 시간'(가상 카드) | 지금 흐름 그대로(정본 3.3 · 6.2) |
| B | A 와 같은 수업 | 대화 중심 |
| C | 5단계 단원 4 '시장에서 계산' 수업 1 '과일 가게'(가상 카드) | 대화 중심 상황극, 선생님이 점원 |

근거: 회화 4단계 can-do 는 [6영02-07] 과 CEFR CV 2020 Conversation(A1) · Information exchange(A1)에, 5단계는 [6영02-07] · [6영02-10] 과 Obtaining goods and services(A1)에 기댄다. 척도 이름은 시드 근거 문서 (2)절 표기 그대로이고, 그 문서처럼 기억에 기댄 추측이다.

## 읽는 법

표기는 `samples.md` 와 같다. 4 · 5단계에서 달라지는 화면 규칙은 정본 3.3 · 6.2 와 level-specs 를 그대로 따랐다.

- **선생님 말:** 영어가 모두 말풍선에 글로 뜬다. 4단계는 〔뜻〕 이 함께 뜨고, 5단계는 영어만 뜬다(C3, level-specs koMeaning). 그래서 이 파일에는 소리로만 내는 〈 〉 가 없다.
- **아이가 할 말:** 미리 보이지 않는다(T2). '힌트'를 누를 때마다 한국어 뜻, 영어 틀, 영어 문장 차례로 한 단씩 열린다. 5단계는 둘째 단에 쓸 수 있는 말 셋이 함께 열린다.
- **그림:** 4단계부터는 턴마다 두는 그림이 없다(level-specs turnImages).
- **'말함' ✓:** 아이가 스스로 썼고, 그 턴에 영어 힌트를 보거나 답 예시를 듣지 않았으며, 선생님의 바로 앞 말에 나온 낱말을 받아 말한 것이 아닐 때만 단다(6.1).
- **선생님 말 범위:** 4단계 단원 2 수업은 1~3단계 요소와 3인칭 단수 -s · do · does 까지만 쓴다. 5단계 단원 4 수업은 4단계 요소와 빈도부사 · want to · would like · but · How many · How much 까지 쓴다(3.6). 대본의 선생님 문장은 시드 형태 표(forms.json) 패턴으로 점검해 범위 밖 꼴이 없음을 확인했다. some · any 와 to 부정사는 패턴이 파이썬에서 돌지 않아 눈으로 보았다.

시간 잣대는 정본 목표(목표 턴 20 에 15분)에 맞춰 1단계보다 길게 잡았다. 세 표본에 같은 잣대를 썼고, 실측한 값이 아니다.

| 턴 꼴 | 어림 |
|---|---|
| 대화 턴(선생님 반응 · 질문과 아이가 스스로 한 문장) | 40초 |
| 오늘 쓸 말 예문 따라 말하기 한 번 | 15초 |
| 선생님이 꺼낸 말이나 답 예시를 한 번 따라 하는 턴, 한국어 도움 뒤 따라 하는 턴 | 20초 |
| '모름' 턴 | 25초 |
| 한국어로 물어보기 한 번 | 45초 |
| 힌트를 연 턴 | 10초 더함 |
| 시작 · 토막 넘김 · 'Do you want to talk more?' 고르기 · 끝인사 | 합쳐 1분 |

## 4단계 가상 카드: 단원 2 '방과 후 활동' 수업 1 '좋아하는 시간'

4단계 시드가 아직 없어서 가상 카드로 정했다. 단원 주제 · 학습 요소(do · does 의문문 · 부정문) · 단원 어휘 30 은 시드 unit-specs 의 회화 4-2 를 그대로 쓰고, 그 가운데 수업 1 새 단어 여섯을 골랐다. 여섯은 모두 vocab 의 4단계 낱말이다.

| 칸 | 값 |
|---|---|
| 새 단어 | math 수학 · science 과학 · art 미술 · easy 쉬운 · difficult 어려운 · hobby 취미 |
| 오늘 쓸 말 예문 | I like math class. · We learn about animals in science. · I draw pictures in art class. · This word is easy. · This story is difficult. · My hobby is soccer. |
| 목표 표현 | I like art class. · Math is difficult. · Does your friend like science? · Yes, she does. / No, he doesn't. · My hobby is soccer. |
| 선생님 첫 말 · 인사 턴 수 | Hi, {NAME}! Nice to see you. How are you today? 〔안녕, {NAME}! 반가워. 오늘 기분 어때?〕 · 2 |
| 정리 대사 · 끝인사 | 오늘 쓸 말 예문 여섯(뜻 함께) · Bye, {NAME}! See you! 〔안녕, {NAME}! 또 보자!〕 |

카드 질문 목록은 표본에 쓰는 여덟만 적었다. 실제 카드는 목표 턴에서 인사 턴을 뺀 18개 이상이어야 한다(6.4). 질문에는 그 질문이 노리는 낱말을 넣지 않았다.

| 번호 | 질문 〔뜻〕 | 노리는 단어 | 힌트(한국어 뜻 / 영어 틀 / 영어 문장) |
|---|---|---|---|
| 1 | What class do you like? 〔무슨 시간이 좋아?〕 | art | 나는 미술 시간이 좋아. / I like ___ class. / I like art class. |
| 2 | Is math easy for you? 〔수학은 쉬워?〕 | difficult | 아니, 수학은 어려워. / No, math is ___. / No, math is difficult. |
| 3 | Where do you learn about animals? 〔동물은 어디서 배워?〕 | science | 과학 시간에 배워. / In ___ class. / In science class. |
| 4 | Does your friend like science? 〔친구도 과학 좋아해?〕 | math | 아니, 수학을 좋아해. / No, he doesn't. He likes ___. / No, he doesn't. He likes math. |
| 5 | What do you do after school? 〔방과 후에 뭐 해?〕 | hobby | 내 취미는 축구야. / My ___ is soccer. / My hobby is soccer. |
| 6 | Is English hard for you? 〔영어는 어려워?〕 | easy | 아니, 영어는 쉬워. / No, English is ___. / No, English is easy. |
| 7 | What do you draw at school? 〔학교에서 뭘 그려?〕 | art | 미술 시간에 고양이를 그려. / I draw cats in ___ class. / I draw cats in art class. |
| 8 | What is hard for you? 〔뭐가 어려워?〕 | difficult | 수학이 어려워. / Math is ___. / Math is difficult. |

## 4단계 표본 A: 지금 흐름 그대로

정본 3.3 · 6.2 대로 인사 두 턴, 오늘 쓸 말 여섯, 대화, 정리를 한다. 4단계는 1단계와 달리 AI 가 반응 뒤 다음 질문까지 쓴다(C19). 낱말 하나로 답하면 세 턴에 한 번까지 문장으로 다시 묻고, 세 턴에 하나 이상은 아이 말에 이어 묻는다(6.1). 선생님은 카드 주제 밖 것을 묻지 않는다(6.2).

| 토막 | 어림 시간 | 아이 턴 | 새 단어 나온 자리 | 앱이 '말함'으로 세는 단어 |
|---|---|---|---|---|
| 인사 | 1분 20초 | 2(스스로 2) | 없음 | 없음 |
| 오늘 쓸 말 | 1분 30초 | 6(따라, 예문) | 여섯 다(쪽지에 낱말 · 뜻 · 예문) | 없음 |
| 대화 | 12분 35초 | 19(스스로 17 · 모름 1 · 따라 1) | 없음(이미 소개함) | art 턴 9 · easy 턴 11 · difficult 턴 13 · science 턴 14 · hobby 턴 20 · math 턴 22 |
| 정리 | 40초 | 0(4단계는 따라 말하지 않음) | 없음 | 없음 |
| 합 | 약 17분(고정 1분 포함) | 27, 목표 턴 20(모름 턴은 뺌) | 여섯 다 대화 전 | 여섯 다 |

```
미나(소리): Hi, {NAME}! Nice to see you. How are you today? 〔안녕, {NAME}! 반가워. 오늘 기분 어때?〕 [카드 선생님 첫 말]
아이(말함, 화면에 인식 글): "I'm good. I'm a little tired." · 턴 1 · 스스로
미나(소리): Oh, a little tired. Long day at school? 〔오, 좀 피곤하구나. 학교에서 긴 하루였어?〕 [Claude, 인사 둘째 턴]
아이(말함, 화면에 인식 글): "Yes. I have six classes today." · 턴 2 · 스스로
미나(소리): Six classes! Good job. Let's learn some new words! 〔여섯 시간! 수고했어. 새 낱말을 배워 보자!〕 [Claude, 인사 끝이라 질문 없음]
앱: 오늘 쓸 말 토막. 쪽지에 'math · 수학 · I like math class. · 나는 수학 시간이 좋아.'가 뜬다. [앱 · 카드]
미나(소리): Math. I like math class. [앱이 쪽지를 읽음]
아이(말함, 화면에 인식 글): "I like math class." · 턴 3 · 따라 · 결과 말 '잘했어요' 뒤 1초 만에 다음 쪽지 [앱]
(science · art · easy · difficult · hobby 쪽지도 같은 꼴로 예문을 따라 말한다. 턴 4~8 · 따라)
앱: 대화 토막. 카드 1번 질문을 AI 없이 보이고 읽는다. [앱]
미나(소리): What class do you like? 〔무슨 시간이 좋아?〕 [카드 1번]
아이(말함, 화면에 인식 글): "I like art." · 턴 9 · 스스로 ✓ art
미나(소리): Art! Nice. Do you draw a lot? 〔미술! 좋다. 그림 많이 그려?〕 [Claude 이어 묻기, 카드 번호 0]
아이(말함, 화면에 인식 글): "Yes. I draw cat." · 턴 10 · 스스로(관사 · 복수 빠짐)
미나(소리): You draw cats! Cool. Is art hard for you? 〔고양이를 그리는구나! 멋지다. 미술은 어려워?〕 [Claude 되풀이 + 질문, 노리는 단어 easy]
아이(말함, 화면에 인식 글): "No. Easy." · 턴 11 · 스스로 ✓ easy
미나(소리): Easy! Great. Can you say it in a sentence? 〔쉽구나! 좋아. 문장으로 말해 볼래?〕 [Claude, 낱말 답이라 문장으로 다시 묻기]
아이(말함, 화면에 인식 글): "Art is easy for me." · 턴 12 · 스스로
미나(소리): Art is easy for you. Good sentence! Is math easy, too? 〔미술은 쉽구나. 문장 좋다! 수학도 쉬워?〕 [Claude 칭찬 + 카드 2번]
앱: 아이가 '힌트'를 한 번 누르자 첫 단 '아니, 수학은 어려워.'가 열린다. [앱 · 카드 2번 힌트]
아이(말함, 화면에 인식 글): "No. Math is difficult." · 턴 13 · 스스로(힌트 '뜻만') ✓ difficult
미나(소리): Math is difficult. That's okay! Where do you learn about animals? 〔수학은 어렵구나. 괜찮아! 동물은 어디서 배워?〕 [Claude + 카드 3번]
아이(말함, 화면에 인식 글): "In science. I like dinosaur!" · 턴 14 · 스스로 ✓ science(아이가 공룡 이야기를 꺼냄)
미나(소리): Dinosaurs, cool! Does your friend like science, too? 〔공룡, 멋지다! 친구도 과학 좋아해?〕 [Claude + 카드 4번, 공룡은 카드 주제 밖이라 더 묻지 않음]
아이('잘 모르겠어요'): · 턴 15 · 모름
미나(소리): That's okay! You can say, "No, he doesn't. He likes math." Does your friend like science? [Claude, 답 예시 + 같은 질문]
미나(화면): 친구가 과학을 좋아하는지 묻는 거야. 좋아하면 Yes, he does. 아니면 No, he doesn't. 라고 해. [Claude 설명, 1~4단계는 첫 '모름'부터 글로만]
아이(말함, 화면에 인식 글): "No, he doesn't. He likes math." · 턴 16 · 따라(답 예시를 들은 턴이라 힌트 종류 '영어')
미나(소리): He likes math. Good! What do you do after school? 〔수학을 좋아하는구나. 좋아! 방과 후에는 뭐 해?〕 [Claude + 카드 5번]
아이(말함, 화면에 인식 글): "I go to taekwondo." · 턴 17 · 스스로
미나(소리): Taekwondo! Do you go every day? 〔태권도! 매일 가?〕 [Claude 이어 묻기]
아이(말함, 화면에 인식 글): "No. Two days." · 턴 18 · 스스로
미나(소리): Two days. Can you say it in a sentence? 〔이틀. 문장으로 말해 볼래?〕 [Claude, 문장으로 다시 묻기(세 턴에 한 번까지)]
아이(말함, 화면에 인식 글): "I go two days in a week." · 턴 19 · 스스로
미나(소리): Two days a week. Good! What other fun thing do you do? 〔일주일에 이틀. 좋아! 다른 재미있는 건 뭐 해?〕 [Claude 되풀이 + 질문, 노리는 단어 hobby]
아이(말함, 화면에 인식 글): "My hobby is drawing." · 턴 20 · 스스로 ✓ hobby(오늘 쓸 말에서 들은 꼴)
(턴 21~27: 카드 6~8번과 이어 묻는 질문이 같은 꼴로 이어진다. 턴 22 에서 아이가 "My friend like math." 라고 하면 ✓ math 가 붙고, 선생님은 "Your friend likes math!" 로 되풀이한다.)
미나(소리): ... Do you want to talk more? 〔더 이야기할래?〕 [Claude, 목표 턴 20 에 닿은 턴]
아이: '그만하기'를 누른다. [앱]
앱: 정리 토막. 되짚을 말 여섯 줄을 뜻과 함께 보이고 읽는다. 선생님이 되풀이한 바른 문장 가운데 오늘 쓸 말이 든 것(Art is easy for you. · Math is difficult.)을 먼저 쓰고 카드 정리 대사로 채운다. [앱]
미나(소리): Bye, {NAME}! See you! 〔안녕, {NAME}! 또 보자!〕 [카드 끝인사]
앱: 마무리 세 장으로 간다. 잘한 말 · 다음엔 이렇게는 5단계부터라 없다. [앱]
```

- **1단계 지금 흐름보다 나은 점:** 선생님이 아이 답을 받아 이어 묻는다(턴 10 · 17 · 18). 힌트 첫 단이 한국어 뜻이라 혼자 풀 길이 있다(턴 13). '말함'은 대화 앞쪽 여섯 턴 안에 넷이 붙는다.
- **걸리는 점:** 대화 전에 예문 여섯을 1분 30초 동안 따라 말한다. 공룡 이야기는 한마디 반응으로 끊긴다. 낱말 답에 '문장으로 말해 볼래?'를 두 번 듣는다. '모름'에는 답 예시를 듣고 그대로 따라 하게 되어, 그 턴은 연습이 아니라 받아 말하기가 된다.

## 4단계 표본 B: 대화 중심

같은 수업이다. 오늘 쓸 말 토막 없이 인사에서 바로 대화로 간다. 새 단어는 필요할 때 선생님이 꺼내고 아이가 한 번 따라 하거나, 아이가 한국어로 묻거나, 아이가 먼저 쓴다. 선생님은 아이가 꺼낸 이야기를 두 턴 따라가고(C145), 낱말 답은 다시 묻지 않고 바른 문장으로 넓혀 되풀이한다. 교정 피드백은 5단계부터라 틀린 말은 되풀이만 한다.

| 토막 | 어림 시간 | 아이 턴 | 새 단어 나온 자리 | 앱이 '말함'으로 세는 단어 |
|---|---|---|---|---|
| 인사 | 1분 20초 | 2(스스로 2) | 없음 | 없음 |
| 대화 | 11분 45초 | 19(스스로 15 · 따라 2 · 한국어 1 · 도움 1) | art 턴 4(한국어 도움) · math 턴 6(선생님 질문) · difficult 턴 7(선생님이 꺼냄) · easy 턴 8 · science 턴 9(아이가 먼저) · hobby 턴 13(선생님이 꺼냄) | easy 턴 8 · science 턴 9 · art 턴 11 · hobby 턴 17 · math 턴 20 · difficult 턴 21 |
| 정리 | 30초 | 0 | 없음 | 없음 |
| 합 | 약 14분 35초(고정 1분 포함) | 21, 목표 턴 20(한국어 턴은 뺌) | 여섯 다 대화 안 | 여섯 다 |

```
미나(소리): Hi, {NAME}! Nice to see you. How are you today? 〔안녕, {NAME}! 반가워. 오늘 기분 어때?〕 [카드 선생님 첫 말]
아이(말함, 화면에 인식 글): "I'm good. I'm a little tired." · 턴 1 · 스스로
미나(소리): Oh, a little tired. Long day at school? 〔오, 좀 피곤하구나. 학교에서 긴 하루였어?〕 [Claude]
아이(말함, 화면에 인식 글): "Yes. I have six classes today." · 턴 2 · 스스로
미나(소리): Six classes! Good job. [Claude] / What class do you like? 〔무슨 시간이 좋아?〕 [카드 1번, 넘어가는 말 없이 앱이 붙임]
아이('한국어로 물어보기', 화면에 인식 글): "미술을 영어로 뭐라고 해요?" · 턴 3 · 한국어
미나(화면): '미술'은 art 라고 해. 이렇게 말해 봐. I like art. [Claude 한국어 도움]
아이(말함, 화면에 인식 글): "I like art." · 턴 4 · 도움
미나(소리): Art! Nice. Do you draw a lot? 〔미술! 좋다. 그림 많이 그려?〕 [Claude 이어 묻기]
아이(말함, 화면에 인식 글): "Yes. I draw cat every day." · 턴 5 · 스스로(관사 · 복수 빠짐)
미나(소리): You draw cats every day! Cool. Is math hard for you? 〔매일 고양이를 그리는구나! 멋지다. 수학은 어려워?〕 [Claude 되풀이 + 카드 2번을 바꿔 물음]
아이(말함, 화면에 인식 글): "Yes. Math is very hard." · 턴 6 · 스스로
미나(소리): Hard? We can say difficult. Say it with me: Math is difficult. 〔어려워? difficult 라고도 해. 같이 말해 보자.〕 [Claude, 새 단어 꺼냄]
아이(말함, 화면에 인식 글): "Math is difficult." · 턴 7 · 따라
미나(소리): Great! Is art hard, too? 〔좋아! 미술도 어려워?〕 [Claude, 노리는 단어 easy]
아이(말함, 화면에 인식 글): "No! Easy." · 턴 8 · 스스로 ✓ easy
미나(소리): Art is easy for you! Where do you learn about animals? 〔미술은 쉽구나! 동물은 어디서 배워?〕 [Claude, 다시 묻지 않고 문장으로 넓혀 되풀이 + 카드 3번]
아이(말함, 화면에 인식 글): "In science class. I like dinosaurs!" · 턴 9 · 스스로 ✓ science(아이가 공룡 이야기를 꺼냄)
미나(소리): Dinosaurs! Cool. Do you have a favorite dinosaur? 〔공룡! 멋지다. 제일 좋아하는 공룡 있어?〕 [Claude, 아이 이야기 따라가기(C145)]
아이(말함, 화면에 인식 글): "T-rex! It is very big and strong." · 턴 10 · 스스로
미나(소리): Yes, T-rex is so big! Can you draw a T-rex? 〔맞아, 티라노는 정말 커! 티라노 그릴 수 있어?〕 [Claude, 아이 이야기에서 오늘 이야기로 돌아옴]
아이(말함, 화면에 인식 글): "Yes! I draw T-rex in art class." · 턴 11 · 스스로 ✓ art
미나(소리): Cool! A T-rex in art class. What do you do after school? 〔멋지다! 미술 시간에 티라노. 방과 후엔 뭐 해?〕 [Claude + 카드 5번]
아이(말함, 화면에 인식 글): "I go to taekwondo. Yesterday I go there too." · 턴 12 · 스스로(시제)
미나(소리): Taekwondo! It is your hobby. Say it: My hobby is taekwondo. 〔태권도! 그게 네 취미구나. 이렇게 말해 봐.〕 [Claude, 새 단어 꺼냄. 과거형은 4단계 범위 밖이라 되풀이하지 않음]
아이(말함, 화면에 인식 글): "My hobby is taekwondo." · 턴 13 · 따라
미나(소리): Great! Do you go every day? 〔좋아! 매일 가?〕 [Claude 이어 묻기]
아이(말함, 화면에 인식 글): "No. Two days in a week." · 턴 14 · 스스로
미나(소리): Two days a week! Is taekwondo difficult? 〔일주일에 이틀! 태권도는 어려워?〕 [Claude 되풀이 + 이어 묻기]
아이(말함, 화면에 인식 글): "A little. Kicks are difficult." · 턴 15 · 스스로(difficult 는 바로 앞 말에 있어 세지 않음)
미나(소리): Kicks are difficult. They look cool! Does your friend go, too? 〔발차기는 어렵지. 멋있잖아! 친구도 다녀?〕 [Claude, does 묻기]
아이(말함, 화면에 인식 글): "No, he don't. He play piano." · 턴 16 · 스스로(does · -s 빠짐)
미나(소리): He doesn't. He plays the piano! Do you play the piano, too? 〔안 다니는구나. 피아노를 치는구나! 너도 피아노 쳐?〕 [Claude 되풀이 + 이어 묻기]
아이(말함, 화면에 인식 글): "No, I don't. Mina, what is your hobby?" · 턴 17 · 스스로 ✓ hobby(아이가 선생님에게 물음)
미나(소리): Good question! I am an AI teacher. I like stories. Do you like stories? 〔좋은 질문! 나는 AI 선생님이야. 이야기를 좋아해. 너도 이야기 좋아해?〕 [Claude, 사람의 삶을 지어내지 않음(6.2)]
아이(말함, 화면에 인식 글): "Yes. I read comic books every night." · 턴 18 · 스스로
미나(소리): Comic books! What comic do you read? 〔만화책! 무슨 만화 읽어?〕 [Claude 이어 묻기]
아이(말함, 화면에 인식 글): "I read Why books. They are science comics." · 턴 19 · 스스로
미나(소리): Science comics, fun! What class does your friend like? 〔과학 만화, 재밌겠다! 친구는 무슨 시간을 좋아해?〕 [Claude, 카드 4번 노리는 단어 math 를 바꿔 물음]
아이(말함, 화면에 인식 글): "He likes math. He is very smart." · 턴 20 · 스스로 ✓ math
미나(소리): He likes math! How is math for you? 〔수학을 좋아하는구나! 너한테 수학은 어때?〕 [Claude, 노리는 단어 difficult]
아이(말함, 화면에 인식 글): "Math is difficult for me. But science is easy." · 턴 21 · 스스로 ✓ difficult
미나(소리): Math is difficult. Science is easy. I see! Do you want to talk more? 〔수학은 어렵고 과학은 쉽구나. 알겠어! 더 이야기할래?〕 [Claude, 목표 턴 20]
아이: '그만하기'를 누른다. [앱]
앱: 정리 토막. '나눈 대화' 칸에서 아이가 스스로 한 문장 가운데 오늘 쓸 말이 든 셋(I draw T-rex in art class. · They are science comics. · Math is difficult for me.)이 반짝이고, 미나가 한 번 읽는다. [앱 되짚을 말]
미나(소리): Bye, {NAME}! See you! 〔안녕, {NAME}! 또 보자!〕 [카드 끝인사] · 앱: 마무리 세 장 [앱]
```

'모름'이면 이렇게 받는다(제안). 첫 '모름'에는 "Let's say it together. In science class." 처럼 답을 한 번 들려주고, 아이가 따라 하면 그대로 이어 간다. 같은 질문에서 또 '모름'이면 다시 묻지 않고 다음 이야기로 간다. 한국어 설명은 지금처럼 첫 '모름'부터 글로만 붙인다.

## 5단계 가상 카드: 단원 4 '시장에서 계산' 수업 1 '과일 가게'

5단계 시드도 아직 없어서 가상 카드로 정했다. 단원 주제 · 학습 요소(How many · How much) · 단원 어휘 30 은 시드 unit-specs 의 회화 5-4 를 그대로 쓰고, 새 단어 여섯은 모두 vocab 의 5단계 낱말이다. '가게'를 빵집(5-2)이 아니라 시장(5-4)으로 고른 까닭은, 값 묻기(How much)가 5-4 학습 요소라서 5-2 수업에서는 선생님이 쓸 수 없기 때문이다.

| 칸 | 값 |
|---|---|
| 새 단어 | watermelon 수박 · tomato 토마토 · carrot 당근 · fresh 신선한 · sweet 달콤한 · twenty 스물 |
| 미션 셋(화면 체크 목록) | 사고 싶은 것을 말해요 · 몇 개인지 말해요 · 값을 묻고 돈을 내요 |
| 쓸 수 있는 말 셋(힌트 둘째 단) | I would like ___, please. · How much is it? · Here you are. |
| 선생님 첫 말 · 인사 턴 수 | Hi, {NAME}! How are you today? · 1 |
| 대화 첫 질문(카드 1번) | Hello! Come in! What would you like?(노리는 단어 watermelon, 힌트 '수박 하나 주세요.' / I would like a ___, please. / I would like a watermelon, please.) |
| 끝인사 | Bye, {NAME}! See you! |

## 5단계 표본 C: 대화 중심 상황극(과일 가게)

B 와 같은 대화 중심 꼴을 상황극에 썼다. 선생님이 점원 역을 맡고, 미션 셋을 해낸 뒤에는 아이와 역할을 바꿔 배운 말을 다른 자리에서 쓰게 한다. 예상 밖 대답은 7단계부터라 넣지 않았다. 지금 흐름이라면 대화 앞에 오늘 쓸 말 여섯(약 1분 30초)이 붙고, 한국어 단추와 아이 이야기 따라가기가 없다. 5단계는 선생님 말의 뜻이 보이지 않으므로 〔〕 를 적지 않았다.

| 토막 | 어림 시간 | 아이 턴 | 새 단어 나온 자리 | 앱이 '말함'으로 세는 단어 |
|---|---|---|---|---|
| 인사 | 40초 | 1(스스로) | 없음 | 없음 |
| 대화(상황극) | 13분 40초 | 21(스스로 17 · 모름 1 · 힌트 연 턴 1 · 한국어 1 · 도움 1) | watermelon 턴 2(아이가 먼저) · sweet 턴 2 뒤 · tomato · fresh 턴 5 뒤 · carrot 턴 7 뒤 · twenty 턴 10 뒤(모두 점원 말) | watermelon 턴 2 · twenty 턴 13 · sweet 턴 16 · tomato · carrot 턴 17 · fresh 턴 18 |
| 정리 · 마무리 | 1분 | 0 | 없음 | 없음 |
| 합 | 약 16분 20초(고정 1분 포함) | 22, 목표 턴 20(모름 · 한국어 턴은 뺌) | 여섯 다 대화 안 | 여섯 다 |

```
미나(소리): Hi, {NAME}! How are you today? [카드 선생님 첫 말]
아이(말함, 화면에 인식 글): "I'm fine. Today is very hot." · 턴 1 · 스스로
미나(소리): Yes, very hot! Let's try a shop talk. I have a fruit shop. [Claude, 인사 끝]
앱: 미션 쪽지 셋이 뜬다. '사고 싶은 것을 말해요 · 몇 개인지 말해요 · 값을 묻고 돈을 내요' [앱 · 카드 미션]
미나(소리): Hello! Come in! What would you like? [카드 1번, 앱이 붙임]
아이(말함, 화면에 인식 글): "I would like watermelon, please." · 턴 2 · 스스로 ✓ watermelon(관사 빠짐)
앱: 첫 미션에 체크가 붙는다. [앱 · Claude 미션 체크 갱신]
미나(소리): A watermelon! Good choice. It is very sweet. Do you like watermelon? [Claude 되풀이 + sweet 꺼냄 + 이어 묻기]
아이(말함, 화면에 인식 글): "Yes! My mom like watermelon very much." · 턴 3 · 스스로(-s 빠짐, 아이가 엄마 이야기를 꺼냄)
미나(소리): Your mom likes watermelon! Do you eat it in summer? [Claude 되풀이 + 아이 이야기 따라가기]
아이(말함, 화면에 인식 글): "Yes. We eat watermelon every summer at my grandma's house." · 턴 4 · 스스로
미나(소리): Sounds fun! Okay. How many do you want? [Claude, 가족 이야기는 더 묻지 않고 가게로 돌아옴]
아이(말함, 화면에 인식 글): "One, please. It is very big." · 턴 5 · 스스로
앱: 둘째 미션에 체크가 붙는다. [앱]
미나(소리): One big watermelon! We have fresh tomatoes, too. What else would you like? [Claude, tomato · fresh 꺼냄]
아이(말함, 화면에 인식 글): "Three tomato, please." · 턴 6 · 스스로(복수 빠짐. tomato 는 바로 앞 말에 있어 세지 않음)
미나(소리): Three tomatoes! Sure. What do you make with tomatoes? [Claude 되풀이 + 이어 묻기]
아이(말함, 화면에 인식 글): "My dad makes spaghetti." · 턴 7 · 스스로
미나(소리): Yum, spaghetti! Carrots are on sale today. Do you like vegetables? [Claude, carrot 꺼냄]
아이(말함, 화면에 인식 글): "No. I hate carrots." · 턴 8 · 스스로
미나(소리): Ha ha, that's okay! A watermelon and three tomatoes. Now, ask me the price! [Claude, 셋째 미션으로 이끔]
아이('잘 모르겠어요'): · 턴 9 · 모름
미나(소리): That's okay! You want to know about the money. What do you ask me? [Claude, 5단계 첫 '모름'이라 쉬운 영어로 바꿔 물음. 한국어 설명은 둘째 '모름'부터]
앱: 아이가 '힌트'를 두 번 누른다. 첫 단 '얼마예요?', 둘째 단 영어 틀 'How ___ is it?' 과 쓸 수 있는 말 셋이 열린다. [앱 · Claude 힌트]
아이(말함, 화면에 인식 글): "How much is it?" · 턴 10 · 스스로(힌트 '영어')
미나(소리): The watermelon is fifteen dollars. The tomatoes are five dollars. It is twenty dollars. [Claude, twenty 꺼냄]
아이('한국어로 물어보기', 화면에 인식 글): "'깎아 주세요'는 영어로 뭐예요?" · 턴 11 · 한국어
미나(화면): 깎아 달라는 말 대신 세일하는지 물어봐. 이렇게. Is there a sale? [Claude 한국어 도움]
아이(말함, 화면에 인식 글): "Is there a sale?" · 턴 12 · 도움
미나(소리): Ha ha! Okay, a sale for you. Eighteen dollars, please. [Claude]
아이(말함, 화면에 인식 글): "Wow, cheap! Here you are. Twenty dollars." · 턴 13 · 스스로 ✓ twenty
앱: 셋째 미션에 체크가 붙는다. 미션 셋을 다 했다. [앱]
미나(소리): Thank you! Here are two dollars. The watermelon is heavy. Can you carry it? [Claude 이어 묻기]
아이(말함, 화면에 인식 글): "No. It is too heavy!" · 턴 14 · 스스로
미나(소리): Ha ha! Do you want a bag? [Claude]
아이(말함, 화면에 인식 글): "Yes, please. A big bag." · 턴 15 · 스스로
미나(소리): Here you are. Great shopping! Now I am Mina again. What fruit do you like in summer? [Claude, 역에서 나와 오늘 말을 다시 쓰게 함]
아이(말함, 화면에 인식 글): "Watermelon! It is very sweet." · 턴 16 · 스스로 ✓ sweet(watermelon 은 이미 셈)
미나(소리): Me too! Do you usually eat vegetables? [Claude, 빈도부사(5-1)]
아이(말함, 화면에 인식 글): "Sometimes. I eat tomatoes, but I don't eat carrots." · 턴 17 · 스스로 ✓ tomato · carrot
미나(소리): Tomatoes, yes. Carrots, no! How are my tomatoes? [Claude, 노리는 단어 fresh]
아이(말함, 화면에 인식 글): "They are fresh and red." · 턴 18 · 스스로 ✓ fresh
미나(소리): Very fresh! Now you sell, and I buy. Hello! I would like two carrots, please. [Claude, 역할 바꾸기]
아이(말함, 화면에 인식 글): "Here you are. Two carrots." · 턴 19 · 스스로
미나(소리): Thank you! How much is it? [Claude]
아이(말함, 화면에 인식 글): "It is four dollars." · 턴 20 · 스스로
미나(소리): Four dollars? Cheap! Here you are. Are your carrots sweet? [Claude]
아이(말함, 화면에 인식 글): "Yes! My carrots are very sweet." · 턴 21 · 스스로
미나(소리): Ha ha, I like sweet carrots! Do you want to sell fruit? [Claude]
아이(말함, 화면에 인식 글): "Yes! I want to sell watermelons." · 턴 22 · 스스로
미나(소리): A watermelon shop! Cool. Do you want to talk more? [Claude, 목표 턴 20]
아이: '그만하기'를 누른다. 앱: 정리 토막. 되짚을 말을 영어로만 보이고 읽는다. 5단계는 아이가 따라 말하지 않는다. [앱]
미나(소리): Bye, {NAME}! See you! [카드 끝인사]
앱: 마무리 첫 장은 별, 둘째 장은 끝맺음 턴이 낸 잘한 말 둘과 다음엔 이렇게 하나, 셋째 장은 다음 이야기다. [앱 · Claude 끝맺음 턴]
  잘한 말 1: "Here you are. Twenty dollars." 돈을 내면서 알맞게 말했어요.
  잘한 말 2: "It is four dollars." 점원이 되어 값을 바로 말했어요.
  다음엔 이렇게: "My mom like watermelon." 보다 "My mom likes watermelon." 엄마처럼 한 사람이면 likes 처럼 s 를 붙여요.
```

## 4단계 A 대 B 견줌

| | A 지금 흐름 | B 대화 중심 |
|---|---|---|
| 대화 느낌 | 이어 묻기가 있어 1단계보다 훨씬 대화에 가깝다. 다만 카드 질문 차례가 뚜렷하고, 아이 이야기는 한마디로 끊긴다 | 아이 이야기(공룡 · 태권도 · 친구)를 따라가다 오늘 이야기로 돌아온다. 아이가 선생님에게 먼저 묻는 턴이 생긴다 |
| 받침 | 오늘 쓸 말 예문 여섯 · 힌트 3단 · '모름'에 답 예시와 같은 질문 · 한국어 설명 글 | 힌트 3단 · 한국어 단추 · 필요할 때 꺼내는 새 단어 · '모름'은 같이 해 보기 한 번 뒤 이어 감 |
| 시간(아이 턴) | 약 17분(27, 목표 턴 20) | 약 14분 35초(21, 목표 턴 20) |
| '말함'이 쌓이는 자리 | 여섯 다. 오늘 쓸 말에서 들은 뒤 대화 앞쪽에 몰린다 | 여섯 다. 대화 곳곳에서 아이가 먼저 쓰거나 다른 이야기 속에서 다시 쓴다 |
| 구현 난이도 | 없다(정본대로) | 중간. 4단계는 이미 AI 가 질문을 쓰므로 프롬프트 규칙과 앱 흐름을 고치는 일이 많다. 한국어 인식은 C144 대로 iPad 확인 뒤다 |
| 정본에서 바뀌는 줄 | 없다 | 토막 표 '오늘 쓸 말' 행(4단계부터 빼거나 1분 선택), 6.2 '카드 주제 밖 것을 묻지 않는다'(C145 로), 6.1 '낱말 답이면 문장으로 다시 묻기'를 '바른 문장으로 넓혀 되풀이'로, 3.3 막힘 문단 '답 예시 + 같은 질문 · 세 번이면 넘어감'을 '같이 해 보기 한 번 뒤 이어 감'으로, 아이 차례에 한국어 단추(C144) |

## 1단계와 무엇이 다른가

- **단계 때문인 것:** 아이가 문장으로 답하고, 4단계부터는 정본에서도 AI 가 질문까지 쓴다. 힌트가 세 단이고, 말해 보기 · 답 두 개 · 턴마다 그림이 없다. 5단계부터는 선생님 말의 뜻이 보이지 않고, 미션과 잘한 말 · 다음엔 이렇게가 붙는다. 선생님 말은 그 단계 학습 요소 안에 묶여서, 4단계 선생님은 과거형 · on Monday 를 쓸 수 없다.
- **설계 때문인 것:** 오늘 쓸 말을 대화 앞에 몰아 하느냐, 대화 안에서 필요할 때 꺼내느냐가 1단계 표본 1 · 2 · 3 과 같은 갈림이다. 아이 이야기 따라가기 · 한국어 단추 · '모름' 받기도 1단계와 같은 결정이다.
- **판단에 도움이 되는 점:** 1단계 지금 흐름이 드릴처럼 들린 큰 까닭은 1~3단계 AI 가 반응만 쓰는 규칙(S5)이다. 4단계 지금 흐름(A)은 그 규칙이 없어서 1단계만큼 기계적이지 않다. 그래서 A 와 B 의 차이는 1단계 표본 1 과 3 의 차이보다 작다.

## 표본에서 가정한 것과 정할 것

1. **범위 밖 꼴의 되풀이:** 아이가 과거형(턴 12 의 "Yesterday I go")처럼 그 단계 범위 밖 꼴을 쓰면, 되풀이할 바른 말이 범위 밖이 된다. 표본은 되풀이하지 않고 내용으로만 받았다. 되풀이에는 범위 예외를 둘지 정해야 한다.
2. **한국어 도움의 범위:** 아이가 한국어로 묻는 말이 범위 밖 꼴(but · to 부정사 · 과거형)을 요구할 수 있다. 표본은 범위 안에서 바꿔 말하는 답을 골랐다('깎아 주세요' 대신 Is there a sale?).
3. **카드 질문 목록의 크기:** 6.4 는 4단계부터 카드 질문을 18개 이상 요구하지만, B 와 C 는 카드 질문을 서너 개만 쓰고 나머지는 Claude 가 묻는다. 대화 중심이면 카드 질문 수를 줄일지 정해야 한다.
4. **목표 턴 셈:** 표본은 한국어로 물어본 턴을 목표 턴에 세지 않았다. 1단계 표본과 같은 가정이다.
5. **역할 바꾸기:** C 의 턴 19~22 는 아이가 점원이 된다. 정본은 5단계를 '선생님이 상대역'으로 적고 있어, 미션을 다 한 뒤의 역할 바꾸기를 허용할지 정해야 한다.
6. **가상 카드의 근거:** 단원 주제 · 학습 요소 · 어휘는 시드 unit-specs 와 vocab 의 단계 배정을 따랐다. 교육부 기본 어휘 목록의 초등 표시와는 이 자리에서 대조하지 못했다(근거 약함). 시드를 만들 때 수업 배정은 달라질 수 있다.

요청자에게 물을 한 줄은 다음과 같다.

> 4~5학년 눈높이로 보면 회화 수업을 A(지금 흐름)와 B(대화 중심) 가운데 어느 쪽으로 갈까요? 5단계 C 는 B 꼴을 가게 상황극에 쓴 모습이에요.
