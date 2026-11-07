# 대본 회차 r2 범위 한정 재판정(fix 라운드 1 뒤 · 걸린 대본 일곱 × 2바퀴 + 꺼내기 대본 1 × 2바퀴 · effort low · 2026-11-07)

작성: 설계 · 화면 검토자(Fable · max, 읽기 전용, r1 판정과 같은 검토자) · 맡긴 곳: 컨트롤러 메시지(r2 재판정) · **iPad 검증 전**(C211 (5))

읽는 법. 판정 대상은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-r2/<대본>/`(전문 · 지표 · 검토 목록 · JSON)이고, 견줌은 r1 판정 `task-des-r1-report.md`(I-n · M-n 번호는 그 보고의 것)와 fix 보고 `task-fix-r1-report.md` 다. 'L1 · L2' 는 바퀴, '대본 L1 n' 은 그 대본 첫 바퀴 n차례다. 112호출(8대본 × 2바퀴)의 선생님 말 · 붙인 줄 · 소리 줄 · 뜻 · 표시 칸을 모두 읽었다. 코드 · 시드는 보지도 바꾸지도 않았고 실호출도 하지 않았다. 이번에 새로 본 것과 아직 안 닫힌 것만 적는다.

## 1 판정 한 줄

**조건부 통과(fix 2 뒤 상황 차례 대본 셋 재판정 → iPad 시험 부탁).** r1 의 Important 여섯 가운데 I-2 · I-3 · I-4 · I-5 · I-6 다섯이 닫혔고(대본 근거 아래), 대화 토막은 r1 보다 더 좋아졌다(되묻기 0 · 읽지 못함 0/112 · 따라 할 말 자리 밖 0 · 상황 반응 되풀이 0 · 'Rice.' 이어 받음 · 온전한 이어 묻기 63/80 = 79%). 그러나 I-1 의 고침 (나)(예문 글 · 같은 글 검사 → 상황 줄)가 새 문제 둘을 만들었다: 인사 끝에서 아이 답에 대한 반응이 지워지고 밋밋한 시작 줄만 남은 차례 11/16, 받침에서 상황 줄과 AI 문장이 같은 뜻을 두 번 말하는 차례 7. 여기에 아이가 방금 답한 질문을 AI 가 다시 물은 차례 1 이 남아, Critical 0 · Important 3(새것) · Minor 5. 아이 귀에 '대본 같음' 은 r1 보다 줄었고 '차갑고 두 번 말함' 이 생겼다. 세 Important 는 고정부 · 거름 한 곳씩이라 fix 2 한 번이면 되고, 재판정은 상황 차례가 있는 대본 셋(stuck-three · preview-1 · word-answers) × 2바퀴(≈ 48호출 · 0.45달러)면 된다.

## 2 I-1~I-6 닫힘 판정

| 번호 | 판정 | 근거(대본 · 바퀴 · 차례) |
|---|---|---|
| I-1 (가) 예 하나 돌림 | **효과 없음(해롭지 않음)** | 인사 끝 16차례 가운데 AI 원문이 'Good to hear!' 로 시작한 것이 12(표시 칸 '상황 줄로 바꿈("Good to hear!" → …)': word-answers L1 1 · L2 1, stuck-three L1 1 · L2 1, second-session L1 1 · L2 1, scene-other L1 1 · L2 1, preview-1 L2 1, scene-yes L1 1 · L2 1, recall L2 1). 보인 예가 셋 가운데 하나로 돌아도 AI 는 보인 예가 아니라 제 버릇(고정부 916줄의 반응 예 'Good to hear!')을 썼다 |
| I-1 (나) 같은 글 · 예문 글 검사 | **되풀이는 닫힘 · 베끼기는 모양만 바뀜** | 상황 반응 되풀이 0(8대본 모두), AI 예문 그대로 나간 차례 0. 그러나 걸린 문장을 시드 상황 줄로 바꾸므로 인사 끝 15/16 이 상황 줄('Okay! Let's start!' ×4 · 'Hmm, okay! Let's start now.' ×4 · 'Okay then! Here we go!' ×3 · 'Oh, okay! Let's go!' ×2 …)로 나갔고, 지표의 고정 문장 15/112 는 전부 이 상황 줄이다(인사 끝 9 · 받침 6 · 대화 토막 0). 새 문제 N-1 · N-2(3절) |
| I-2 아이가 먼저 말한 필수 답 '다룸' | **닫힘** | greet-more L1 3 'We eat rice and fish.' → 'Yum, rice and fish! The sun is hot at the lake. What do you do with the juice?'(필수 2), L2 3 → 'What is in your cup at lunch?'(필수 2 자기 말). second-session L1 3 · L2 3 → 'What do you do with the juice?'. recall L2 4 카드 자리가 필수 1 을 건너뛰고 'The sun is hot! What do you do with the juice?'. scene-yes L2 6 'We go home.' 뒤 카드 자리가 필수 3(go) 을 건너뛰고 필수 4. r1 의 되묻는 카드 질문 2 → 0. 잔여 하나는 AI 가 스스로 쓴 질문 쪽(N-3) |
| I-3 읽지 못함 까닭 · 대신 줄 | **닫힘(재현 0 · 대신 줄은 대본 근거 없음)** | 호출 실패 · 읽지 못함 0/112(8대본 지표 '기술 오류 자리' 표 모두 0). r1 · medium 의 여섯이 모두 한 낱말 막힘 꼴 입력 뒤였고, r2 에서 같은 입력('Rice.' ×2 · 'Big.' ×2 · 'Huh?' ×2 · 'Yes.' ×2)이 모두 읽혔다. I-4 가 한 낱말을 막힘으로 보지 않게 해 '막힘 + 빈 tori_en' 길 자체가 줄어든 것으로 본다(fix 보고 추론과 맞음). 안전한 대사 · 받침 둘째 상황 줄 대신 줄은 r2 에서 한 번도 쓰이지 않아 단위 시험 근거만 있다 |
| I-4 한 낱말 장면 답 무름 | **닫힘** | word-answers L1 2 · L2 2 'Rice.' → short_related · 막힘 거짓 · 되풀이 'You eat rice!'(설계된 대화 그대로). L1 7 · L2 7 'Big.' → 'Yes, the lake is big!'. 'Cold.' · 'Lake.' · 'Water.' 모두 답으로 받음. 막힘으로 남은 것은 'Yes.'(wh 질문 뒤, L1 3 · L2 3) · 'Huh?' · 'I don't know.' 뿐이고 모두 맞는 판정 |
| I-5 따라 할 말 거름 core 공유 | **닫힘** | 소리 줄 자리 밖 0(8대본). word-answers L1 8 · recall L2 7 은 갈래 required 라 '따라 할 말을 앱이 바꿈'(버림), word-answers L2 8 · second-session L2 7 은 갈래 introduce 라 〈I wash my hands.〉 + 신호 말을 남김(설계 4 허용). 꺼내기냐 필수냐를 AI 의 next_move 가 가른다는 점은 M-r2-4 |
| I-6 되묻는 고르기 검사 | **닫힘** | word-answers L1 7 'Big.' → 'What is in the lake?', L2 7 → 'What is in the big lake?'(r1 'Is the lake big or small?'). preview-1 L1 5 'Yes I like fish.' → 'Who is at the table with you?', L1 7 'Yes big fish.' → 'Where is the big fish?'(r1 'Do you like the fish?'). 아이 낱말이 든 'A or B' · 'Do you like X' 0/112 |

## 3 고침이 만든 새 문제

**N-1 [Important] 인사 끝에서 아이 답에 대한 반응이 지워진다.** AI 원문의 첫 문장 'Good to hear!' 가 예문 글 검사에 걸려 시작 줄로 바뀌고 'Let's learn some new words!' 는 지워져, 아이가 'I am fine.' 이라 하면 '그래! 시작하자!' · '좋아, 그럼! 가 보자!' · '음, 알겠어! 이제 시작하자.' · '아, 그렇구나! 해 보자!' 가 돌아온다. 반응이 남은 인사 끝은 5/16 뿐이다(greet-more L1 1 'Oh, you play soccer! Fun!' · L2 1 'Yay, you are happy! Soccer is fun! Now, new words time!'(r2 에서 가장 좋은 인사 끝, 바꾸지 않은 유일한 차례) · preview-1 L1 1 'Great, I'm happy too!' · stuck-three L1 1 'I am happy too.' · recall L1 1 'I am happy you are good.' · L2 1 'I like apples too.'). 설계 2 '아이의 인사 답에 먼저 반응한다' 가 r1 보다 뒤로 갔고, 요청자의 '형식적 인사' 는 '매번 같은 문장' 에서 '반응 없는 시작 줄' 로 모양만 바뀌었다. 'Hmm, okay!'(음, 알겠어!) 는 '잘 지내' 에 대한 답으로 시큰둥하게 들린다. 또 recall L1 1 에서 AI 가 사과에 반응한 'Apples are yummy!' 가 어휘 검사(yummy)에 걸려 같은 시작 줄로 바뀌었다 — 아이 말을 받은 유일한 문장이 지워진 경우다. **몫 · 권고(묶음 1 · 2 · 3):** (가) 예문 글 검사에서 네 낱말 안 짧은 반응 문장은 걸지 않는다(지표 정의의 같은 규칙, 설계 8). 'Good to hear!' 는 사람 같은 반응이고 문제는 뒤의 넘김 문장이었다. (나) 인사 끝은 'AI 반응 + 앱 넘김 줄' 로 몫을 가른다: AI 의 넘김 문장(예문 · 'Let's learn …' 꼴)만 지우고 앱이 돌림 상황 줄을 붙인다. 그러면 반응은 매번 아이 말을 받고 넘김만 돌아간다. (다) 인사 끝 상황 줄 시드에서 'Hmm, okay!' 꼴을 빼고 따뜻한 꼴('Nice! Let's start!' 꼴)로 둔다. (라) 허용 낱말에 yummy 를 더한다(yum 과 같은 수업 말).

**N-2 [Important] 받침 차례가 같은 뜻을 두 번 말한다.** 첫 문장이 상황 줄로 바뀌고 AI 의 둘째 문장이 남아 겹친다: stuck-three L1 2 'That's okay! You can do it! You can do it with me.', L1 3 'No problem! Here is an easy one. Let's try an easier one.', L1 4 'It's okay! Now we go on. Then we go on.'(이제 계속하자. 그다음에 같이 넘어가자.), L2 3 'Okay! Here is a new one. Let's try an easier one.', L2 4 'That's okay! Let's go on. I will play the answer and we can go on.', preview-1 L2 2 'Okay! We can do this. We can do it together!', L2 3 'That's okay! Try this one. Let's try an easier one.' — 7차례. 설계 8 의 '말을 위한 말 0' 에 걸리고, stuck-three 의 선생님 말 양이 올랐다(선생님 ÷ 아이 낱말 7.83 → 9.33, 아이 차례 앞 중앙값 · p90 14 · 22 → 15 · 27; 기준 '고침 전 이하' 위반. preview-1 도 11 · 19 → 14 · 20). 또 상황 줄 시드에 r1 에서 요청자가 세 번 들은 'That's okay! You can do it!' 이 그대로 들어 있어(stuck-three L1 2 · L2 7) 수업을 거듭하면 다시 그 말이다. **몫 · 권고(묶음 2 · 3):** 받침 차례에서 첫 문장을 상황 줄로 바꾸면 남은 AI 문장은 지운다(상황 줄이 반응 · 격려를 이미 담는다). N-1 (가)대로 짧은 반응을 걸지 않으면 바꿀 일 자체가 줄어 AI 의 제 말('No problem! I can help. Let's try it together.' 꼴, preview-1 L1 2)이 남는다. 시드 상황 줄에서 'That's okay! You can do it!' 은 뺀다.

**N-3 [Important] AI 가 아이가 방금 답한 질문을 다시 묻는다(1).** stuck-three L1 6: 'I drink juice.' → 첫 시도 'What else do you drink?'(offband else) → 다시 쓰기 'What do you do with the juice?'. 아이가 '주스를 마신다' 고 한 직후 '주스로 뭘 해?' 다. I-2 는 앱 셈(기회 알림 · 카드 자리)에서 그 기회를 뺐지만, 사용자 메시지의 'Chances' 줄에는 남아 있어 다시 쓰기가 그 글을 골랐다. **몫 · 권고(묶음 1):** 아이가 먼저 답한 기회는 사용자 메시지 기회 목록에서도 빼거나 'already answered by the child' 표지를 붙이고, 다시 쓰기 안내에 '아이의 바로 앞 말이 답인 질문은 쓰지 않는다' 한 줄. I-6 의 echo 검사를 wh 질문까지 넓히는 길(질문의 내용 낱말이 모두 아이의 바로 앞 말에 있으면 걸림)도 된다. 같은 대본 L2 6 은 'What juice do you drink?' 로 잘 이었다.

**M-r2-1 [Minor]** 두 질문 한 차례: second-session L2 4 'Oh, apples! Is it apple juice? What do you do with it?'(고정부 '질문 하나' 규칙, 앱은 세지 않음). **M-r2-2 [Minor]** 'easier'(stuck-three L1 3 · L2 3, preview-1 L2 3) · 'yummy' 는 맥락 낱말이고 'easy' 가 허용 목록에 있으니 복수 · 비교급 · 파생 정규화를 검사와 지표가 함께 쓴다(r1 M-5 (4) 그대로). **M-r2-3 [Minor]** 인사 끝에 넘김 문장이 둘 남는 차례: stuck-three L1 1 'Hmm, okay! Let's start now. I am happy too. Let's learn new words now!', L2 1 'Okay! Let's start! Now, let's learn some new words.' — N-1 (나)로 같이 풀린다. **M-r2-4 [Minor]** 꺼내기(소리 줄 허용)를 AI 의 next_move introduce 가 가른다: 같은 질문 'Sand on your hands! What do you do with water?' 가 second-session L1 7 은 follow_up(소리 없음), L2 7 은 introduce(〈I wash my hands.〉 들려줌)다. 아이가 답을 먼저 듣느냐가 AI 의 표지에 달렸으므로, '아직 만나지 않은 단원 단어를 노리는 필수 질문의 첫 물음' 처럼 앱이 정하는 쪽이 C205 에 맞는다(설계 결정 거리). **M-r2-5 [Minor]** stuck-three 첫 문장 p95 3890ms 한 건(지표 칸, 재질문 아님)은 넷 중 한 대본의 한 차례라 NFR-8 판정을 바꾸지 않지만 r3 에서 다시 본다.

## 4 재발 목록 일곱(r2)

| 항목 | r1 | r2 | 근거 |
|---|---|---|---|
| 일방통행 | 있음 1 | **없음** | 'Rice.' → 'Oh, rice! You eat rice!'(word-answers L1 2 · L2 2). 말로 답한 80차례 가운데 반응이 아이 말을 받지 않은 것 0 |
| 같은 질문 반복 | 있음 4 | **있음 1** | stuck-three L1 6(N-3). 앱 길 되묻기 0(I-2), 되묻는 고르기 0(I-6) |
| 두 번 읽기 | 없음 | 없음 | 같은 소리 두 번 0/112 |
| 형식적 인사 | 있음 21/24 | **있음(모양 바뀜) 11/16** | 반응 없는 시작 줄(N-1). 같은 문장 되풀이는 0 |
| 한글 해석(뜻) | 있음 3 | **없음** | 112차례 모두 뜻 있음(읽지 못함 0) |
| 한국어로 묻기 | 없음 | 없음 | 질문 전부 영어 |
| 지어낸 경험 | 없음 | 없음 | 자기 이야기 9(I am happy too · Me too! Bikes are fun · I like apples too · I can help 꼴) 모두 지금 느낌 · 좋아하는 것 |

## 5 꺼내기 대본(`l3-second-session-recall`, greeting_recall 켬 2바퀴)

- **요약 밖 기억 0.** 열여섯 차례 어디에도 '지난번에 · 그때' 꼴이 없다. 사과 · 공은 모두 아이가 이번 대화에서 먼저 말한 뒤에만 나온다(L1 5 'Apple juice, yum! Do you like apple juice?', L2 1 'I like apples too.', L1 3 · L2 3 'Oh, a ball! Who plays with you?').
- **요약을 꺼낸 차례 0.** 인사 답이 'I am good. I like apples!' 로 요약에 닿았는데도 AI 는 요약을 언급하지 않았다. L1 1 원문 'Apples are yummy!' 는 아이 말에 대한 반응이지 요약 꺼내기가 아니고, 그마저 어휘 검사로 지워졌다. L2 1 'I like apples too.' 도 아이 말에 대한 반응이다. 둘째 세션 켬 2바퀴(r1) · 끔 1바퀴 · 꺼내기 켬 2바퀴를 합쳐 켬 4 · 끔 1 에서 요약 밖 기억 0 · 요약 꺼냄 0 이다.
- **켜기 근거.** 해는 없고(0/5) 효과도 없다(0/4). 켜도 아이 귀에 달라지는 것이 없으므로 '요약 밖 기억 0 확인 뒤 켠다' 는 조건은 만족하지만 켤 이유가 아직 없다. 기본 끔을 두고, 고정부의 꺼내기 줄이 실제로 꺼내게 되는 판(예: '요약의 것이 아이 말에 나오면 한 번 짚어도 된다' 꼴 예 하나)을 만든 뒤 다시 보기를 권한다. 요청자 결정 거리이며 13절 한 줄은 그때.

## 6 대본마다 사람 판정(r2)

이어짐 칸은 r1 과 같은 기준(✓ · 반 · ✗ / 말로 답한 뒤 AI 차례, 막힘 말 · 기술 오류 뒤 뺌).

| 대본 | 대화 같다 · 아니다(까닭) | 이어짐 | 맥락 낱말 · 불필요 | 말을 위한 말 | 아이 말 끊음 | 지어낸 경험 | 요약 밖 기억 | 막힘 판정 틀림 | 답 먼저(설계 밖) | 끼움(억지 · 반) |
|---|---|---|---|---|---|---|---|---|---|---|
| l3-word-answers | L1 · L2 **같다**(r1 '아니다' 에서 올라옴: 'Rice.' · 'Big.' 을 받아 되풀이하고 새 물음, 되묻기 0, 읽지 못함 0). 흠: L1 4 · 6 되풀이가 노리는 동사(drink · go)를 말한 직후 그 동사를 노리는 필수 질문을 붙임(답을 모델링한 뒤 묻는 꼴, C205 위반은 아님) | 10 · 2 · 0 / 12 | words 2 · 0 | 0 | 0 | 0 | — | 0('Yes.' 막힘 맞음) | 0(L2 8 introduce 허용) | 0 · 2(L1 2 · L2 6) |
| l3-stuck-three | L1 · L2 **조건부**(받침 흐름 설계대로 · 되풀이 0 이지만 겹친 문장 5차례(N-2), L1 6 되묻기(N-3), 인사 끝 넘김 둘) | 3 · 0 · 1 / 4 | easier 2 · words 2 · 0 | **5**(L1 2 · 3 · 4, L2 3 · 4) | 0 | 0 | — | 0 | 0(받침 설계) | 0 · 0 |
| l3-greet-more | L1 · L2 **같다**(I-2 닫힘의 근거, L2 인사 끝이 r2 에서 가장 사람 같음) | 6 · 0 · 0 / 6 | words 2 · 0 | 0 | 0 | 0(L1 2 'Me too! Bikes are fun.') | — | 0 | 0 | 0 · 0 |
| l3-second-session | L1 · L2 **같다**(되묻기 0, L1 8 'What do you do with the sand?' 처럼 wash 를 말하지 않고 끌어냄) | 11 · 3 · 0 / 14 | words 2 · 0 | 0 | 0 | 0 | **0** | 0 | 0(L2 7 introduce 허용) | 0 · 3(L1 5 · 7, L2 7) |
| l3-scene-other | L1 **같다**(고양이 한 턴 뒤 카드, r1 과 같음) · L2 **같다**(고양이 두 턴 'What is your cat's color?' · 'What is your cat's food?' — 모든 회차 가운데 가장 좋은 고양이 대화) | 9 · 1 · 0 / 10 | words 2 · 0 | 0 | 0(설계 길 1: L1 3) | 0 | — | 0 | 0 | 0 · 1(L1 3) |
| l3-preview-1 | L1 **같다**(4 'Oh, you like bikes! You are hungry. Rice and fish for lunch! …' 배고픔 → 점심 다리가 자연스러움) · L2 **같다(흠)**(받침 2 · 3 겹친 문장 2, N-2) | 7 · 3 · 0 / 10 | easier 2 · words 2 · 0 | **2**(L2 2 · 3) | 0 | 0(L1 1 'I'm happy too') | — | 0(2 · 3 단추) | 0(받침 설계) | 0 · 3(L1 6, L2 5 · 7) |
| l3-scene-yes | L1 **같다**(L1 5 'Where do you drink it?' · 6 'Then what do you do at home?' — r1 의 말 안 되는 문장 · 상태 단정이 사라짐) · L2 **같다** | 8 · 2 · 0 / 10 | words 2 · 0 | 0 | 0 | 0 | — | 0 | 0 | 0 · 2(L2 5 · 6) |
| l3-second-session-recall | L1 · L2 **같다**(5절) | 9 · 5 · 0 / 14 | yummy 1 · words 2 · 0 | 0 | 0 | 0 | **0** | 0 | 0 | 0 · 5(L1 4 · 6 · 8, L2 4 · 7) |
| **합계** | 같다 13바퀴 · 조건부 2(stuck-three) · 흠 1 / 16 | 63 · 16 · 1 / 80 | 맥락 21 · 불필요 0 | 7 | 0(설계 길 1) | 0 | 0 | 0 | 0 | 0 · 16 |

온전한 이어 묻기 63/80(79%, r1 73%) · 반응이 아이 말을 받은 차례 79/80. 지표가 '기준 밖' 으로 적은 선생님 말 양 (1) · (2) 는 대본 하나를 기준선 (가) 전체(4.89 · 10 · 20)와 견준 것이라 r1 의 같은 대본과 견줘야 한다: word-answers 14.38 → 14.13(좋아짐), greet-more 2.78 → 2.93, second-session 3.63 → 3.74, scene-other 2.98 → 2.70, scene-yes 4.28 → 3.58, preview-1 3.98 → 4.44(N-2), stuck-three 7.83 → 9.33(N-2).

## 7 종합 판정과 남은 고칠 것

**조건부 통과.** 대화 토막은 통과다(설계 8 의 0 항목 가운데 막힘 판정 틀림 · 설계 밖 답 먼저 · 억지 끼움 · 지어낸 경험 · 요약 밖 기억 · 아이 말 끊음이 모두 0). 남은 것은 상황 차례의 고침 (나)가 만든 N-1 · N-2 와 기회 목록의 N-3 이고, 셋 다 고정부 · 거름 · 시드 한 곳씩이다. 권고 순서: fix 2(N-1 (가)(나)(다)(라) · N-2 · N-3) → 상황 차례 대본 셋(stuck-three · preview-1 · word-answers) × 2바퀴 재판정(≈ 48호출 · 0.45달러, 이 검토자가 이 보고를 읽고 범위 한정) → iPad 시험 부탁. 컨트롤러가 iPad 시험을 fix 2 와 나란히 두려면 요청자에게 미리 알릴 것 둘: (가) 인사 끝이 '그래! 시작하자!' 처럼 반응 없이 들릴 수 있다, (나) 막혔을 때 선생님이 같은 뜻을 두 번 말할 수 있다. iPad 검증 완료는 마이크 우회 뒤(C210 · C211 (5)).

| 번호 | 심각도 | 묶음 | 고칠 것 | 근거 차례 |
|---|---|---|---|---|
| N-1 | Important | 1 · 2 · 3 | 인사 끝 반응 지워짐: 짧은 반응 문장은 예문 글 검사에서 빼고, 넘김 문장만 지워 앱 돌림 줄을 붙이며, 시드의 'Hmm, okay!' 꼴을 따뜻한 꼴로, 허용 낱말에 yummy | 인사 끝 11/16, recall L1 1 |
| N-2 | Important | 2 · 3 | 받침 겹침: 첫 문장을 상황 줄로 바꾸면 남은 AI 문장을 지움(또는 N-1 (가)로 바꿀 일을 줄임), 시드에서 'That's okay! You can do it!' 뺌 | stuck-three L1 2 · 3 · 4, L2 3 · 4, preview-1 L2 2 · 3 |
| N-3 | Important | 1 | 아이가 먼저 답한 기회를 사용자 메시지 기회 목록 · 다시 쓰기 안내에도 반영(또는 echo 검사를 wh 질문까지) | stuck-three L1 6 |
| M-r2-1~5 | Minor | 1 · 2 · 4-나 | 두 질문 한 차례 · 파생 정규화 · 넘김 문장 둘 · 꺼내기 판단 주체 · p95 한 건 | 3절 |

닫힘 확인(r1 → r2): I-2 · I-3 · I-4 · I-5 · I-6, 상황 반응 되풀이 3 → 0, 읽지 못함 3 → 0, 소리 줄 자리 밖 1 → 0, 되묻는 카드 질문 2 → 0, 되묻는 고르기 2 → 0, 'Rice.' 오판 1 → 0, 한글 뜻 빠짐 3 → 0, 말 안 되는 문장(M-2) · 상태 단정(M-3) 재현 0, 첫 문장 p95 대본 일곱 가운데 여섯이 2.0초 아래, 호출 수 바퀴당 그대로.

## 8 아이 눈 소감(세 줄)

"Rice." 한마디에 "오, 밥이구나! 너는 밥을 먹는구나!" 가 돌아오고, "Big." 에 "맞아, 호수가 크다! 호수에 뭐가 있어?" 로 이어지니 이제 낱말 하나로도 대화가 된다. 고양이 색이 뭐냐, 먹이가 뭐냐고 물어봐 주는 선생님은 r1 보다 가깝다. 그런데 "잘 지내요" 에 "음, 알겠어! 이제 시작하자." 하고, 모르겠다고 하면 "괜찮아! 쉬운 거야. 좀 더 쉬운 걸로 해 보자." 처럼 같은 말을 두 번 하는 건 선생님이 딴생각하는 것 같다.
