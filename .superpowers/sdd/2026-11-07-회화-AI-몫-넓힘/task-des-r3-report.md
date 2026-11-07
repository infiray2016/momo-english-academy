# 대본 회차 r3b 설계 재판정(fix 라운드 2 · 2 더함 뒤 · 상황 차례 대본 다섯 × 2바퀴 · effort low · 2026-11-07)

작성: 설계 · 화면 검토자 대체(Opus · max, 읽기 전용). 맡긴 곳: 컨트롤러 브리프 `task-des-r3.md`. 정해진 판정자(Fable · max)가 사용 한도에 닿아, 이 판정자가 r1 · r2 보고와 fix 보고('fix 2' · 'fix 2 더함')를 읽고 같은 기준으로 봤다. **iPad 검증 전**이다(C211 (5): 이 판정은 대화 논리 검증이고 iPad 회화 품질 검증 완료가 아니다).

읽는 법. 대상은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-r3b/<대본>/`(전문 md · 지표 · 검토 목록 · JSON)이다. 68호출(stuck-three · preview-1 · word-answers 각 16, greet-more 8, scene-other 12)의 AI 원문(output.tori_en) · 최종 말 · 붙인 줄 · 소리 줄 · 지운 문장 · 표시 칸을 모두 대조했고, 대조표는 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/des-r3-work/turns.txt` 에 두었다. 'L1 · L2' 는 바퀴, '대본 L1 n' 은 그 대본 첫 바퀴 n차례다. I-n · M-n 은 r1 보고, N-n · M-r2-n 은 r2 보고의 번호다. 코드는 상황 줄 고르기(`.claude/worktrees/p13d/src/core/conversation/situation.ts` 109~193 · 419~474), 되묻기 검사(`question-check.ts` 372~472), 질문 하나 남기기(`question-retry.ts` 28~40), 막힘 무름(`child-kind.ts` 90~113), 대본 도구의 문장 문(`scripts/talk-observe.ts` 1340~1389)과 시드 `seed/lists/talk-situation-lines.json` 만 읽었고 바꾸지 않았다. 실호출은 하지 않았다.

## 1 판정 한 줄

**조건부 통과. 조건은 Important 하나(I-r3-1, 앱의 상황 줄 고르기 한 곳)이고, 고친 뒤 단위 시험으로 확인되면 실호출 재판정 없이 iPad 시험을 부탁할 수 있다(iPad 검증 전).** r2 의 Important 셋(N-1 · N-2 · N-3)은 모두 닫혔다. 인사 끝에서 아이 답에 대한 반응이 10/10 남았고, 받침에서 같은 뜻을 두 번 말한 차례는 0/15 이며, 아이가 방금 답한 질문을 되물은 차례는 0/43 이다. 대본 열 바퀴가 모두 '대화 같다'(흠 있는 바퀴 넷)이고 재발 목록 일곱은 모두 '없음'이다. 남은 Important 는 fix 2 의 '앞 차례 문장이 든 상황 줄 건너뜀'(권고 밖 둘째)이 세 줄짜리 시드 목록을 빨리 다 걸리게 만들고, 다 걸리면 돌림 차례 줄로 돌아가서 이미 통째로 쓴 줄을 다시 내는 길이다(stuck-three L2 5 · 7 "It's okay! Let's try." 두 번). 상황 반응 되풀이가 r2 0 에서 r3b 1 로 다시 열렸다. Critical 0 · Important 1 · Minor 8(열린 r2 Minor 둘을 더하면 10).

## 2 r2 지적의 닫힘 판정

| 번호 | 판정 | 근거(대본 · 바퀴 · 차례) |
|---|---|---|
| N-1 인사 끝 반응 지워짐 | **닫힘** | 인사 끝 10차례 모두 반응이 남았다. 'fine' 답 여덟은 'Good to hear!' 7 · 'Great to hear!' 1(preview-1 L2 1)이고, 덧붙인 말 둘은 greet-more L1 1 'Yay, soccer! That sounds fun.' · L2 1 'Oh, you play soccer! That is fun.' 이다(AC-2 (다): 축구에 닿고 질문 없음). 밋밋한 시작 줄만 남은 차례 0/10(r2 11/16), 'Hmm, okay!' 꼴 0. 넘김은 앱 줄 일곱('Let's start now.' 3 · 'Now, let's learn new words!' 2 · 'Let's start!' 1 · 'Here we go!' 1)과 AI 글 셋('Now, let's learn some new words.' 2 · 'Now, let's learn new words!' 1)이고, 'fine' 여덟의 인사 끝 전체 글은 여섯 가지다(r1 은 24 가운데 20 이 같은 글). 넘김 문장이 둘 남은 차례 0(M-r2-3 닫힘). yummy 는 아이에게 나갔다(preview-1 L2 8 'Yummy juice!') |
| N-2 받침 같은 뜻 두 번 | **닫힘** | 받침 15차례(stuck-three 10 · preview-1 4 · word-answers 1)에서 같은 뜻을 두 번 말한 차례 0(r2 7). 앱이 지운 AI 문장 여덟이 모두 r2 의 겹침 꼴이다: 상황 줄 뒤 지움 6('You can do it.' · 'We can do it!' · "Let's try an easier one." · 'I will play the answer.' · "Then let's go on." · 'You can do it!'), 신호 말과 겹쳐 지움 2('We can say it together.' · "Let's say it together."). 시드에서 뺀 'That's okay! You can do it!' 은 앱 줄로 0번 나갔다. AI 가 제 말로 쓴 'That's okay! You can do it.' 이 stuck-three L1 2 에 한 번 남았고, 같은 버릇이 든 L1 5 · L2 5 원문은 지워져 되풀이가 없다. stuck-three 의 선생님 줄은 바퀴당 76 → 50 이고 그 가운데 AI 몫은 31.5 다(기준선 54, 6.2절) |
| N-3 방금 답한 질문 되물음 | **닫힘** | 말로 답한 뒤 AI 차례 43 에서 아이가 방금 답한 질문을 되물은 차례 0. 근거 차례는 stuck-three L1 6 · L2 6 'I drink juice.' → 'What juice do you like?'(r2 'What do you do with the juice?')다. 되묻기 검사 (다)는 r3b 에서 한 번도 걸리지 않았으므로(재질문 까닭은 target_word · form · offband · too_long 뿐) 닫힘은 고정부 금지 줄과 AI 쪽 덕이다. AI 원문에 되묻기가 하나 있었으나 아이에게 닿지 않았다: preview-1 L2 4 'Yes I am hungry' 뒤 'Are you hungry now?' 는 질문 하나 남기기(M-r2-1 고침)로 지워졌고, 이 질문은 되묻기 검사 (나)도 비껴간다(M-r3-2) |
| M-r2-1 두 질문 한 차례 | 닫힘 | 아이에게 나간 두 질문 차례 0. 부작용 하나는 M-r3-2 |
| M-r2-3 넘김 문장 둘 | 닫힘 | 위 N-1 |
| M-r2-5 첫 문장 p95 한 건 | 닫힘 | stuck-three 첫 문장 p95 1648ms(r2 3890ms 한 건), 다섯 대본 모두 1.9초 아래 |
| M-r2-2 파생 정규화 | 아직 열림 | 6.3절. 'words' 가 시드 줄 'Now, let's learn new words!' 에서도 나온다(preview-1 L1 1 · scene-other L2 1) |
| M-r2-4 꺼내기 판단 주체 | 아직 열림 | 같은 카드 질문 'Sand on your hands! What do you do with water?' 가 word-answers L1 8 · L2 8 은 갈래 introduce 라 바로 뒤 〈I wash my hands.〉 를 들려줬고, scene-other L2 6 은 follow_up 이라 앱이 소리 줄을 지웠다. 아이가 답을 먼저 듣느냐가 아직 AI 표지에 달려 있다(설계 결정 거리 그대로) |

## 3 권고 밖 둘과 넘김 낱말 표

**(1) 같은 턴 같은 뜻 지움(echoesTurnSentence): 대본 근거로는 해도 효과도 없다.** r3b 에서 지운 문장 열둘은 상황 줄 뒤 지움 6 · 신호 말 겹침 2 · 질문 하나 남기기와 카드 자리 4 다. 대본 도구의 문장 문(talk-observe.ts 1368~1379)은 '첫 문장을 상황 줄로 바꾼 뒤'와 '같은 뜻'을 같은 까닭 'situation' 으로 적는데, 지움 6 이 모두 첫 문장을 바꾼 차례에서 나왔으므로 같은 뜻 문만으로 지운 문장은 0 이다. 효과는 단위 시험 근거뿐이다.

**필요한 말이 지워진 차례는 0 이다.** 지운 말의 뜻은 남은 상황 줄 · 신호 말이 담았다(예: stuck-three L2 4 원문 'No worries! I will play the answer. Then let's go on.' → 'No problem! Here is the answer.'). 뜻이 조금 바뀐 것은 둘이고 해는 없다: stuck-three L2 3 은 "Let's try an easier one." 이 지워지고 'Okay! Here is a new one.' 이 나갔으며, preview-1 L2 3 은 'Here is an easy one.' 이 'Here is a new one.' 으로 바뀌었다. 두 차례 모두 뒤 질문 'Do you like bikes?' 가 실제로 쉬워서 아이가 어긋남을 느낄 자리가 아니다.

**(2) 앞 차례 문장이 든 상황 줄 건너뜀(situationLineOf 의 saidBefore): 효과 하나와 해 하나가 있다.**
- 효과: stuck-three L1 의 받침 다섯이 모두 다른 말이 됐다. L1 5 는 L1 3 의 "It's okay!" 되풀이를 피해 'No problem! I can help.' 로, L1 7 은 'Okay! We can do this.' 로 갔다.
- 해(I-r3-1): 받침 첫째(together) 목록은 세 줄이고 첫 문장이 "It's okay!" · 'No problem!' · 'Okay!' 다. 이 반응들은 쉬운 질문 · 닫기 목록과 AI 의 제 말에도 쓰인다. stuck-three L2 는 7차례 앞에서 'Okay!'(3) · 'No problem!'(4) · "It's okay!"(5)가 이미 나와 세 줄이 모두 걸렸고, 고르기는 '모두 걸리면 돌림 차례 줄'(situation.ts 472~473)로 돌아가 5차례에 통째로 쓴 "It's okay! Let's try." 를 다시 냈다.
- 같은 규칙으로 두 차례를 짚어 관찰과 같은 결과를 얻었다(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/des-r3-work/sim_pick.py`, 돌림 차례 = 차례 번호 − 1 로 두면 L1 5 · 7 · L2 5 · 7 의 고른 줄이 모두 맞는다). 통째 검사만 있던 r2 규칙이었다면 5 · 7 은 'No problem! I can help.' · "It's okay! Let's try." 로 통째 되풀이가 없었다. 되돌아갈 때 통째로 쓴 줄을 먼저 피하면 7 은 'No problem! I can help.' 다.

**(3) 넘김 낱말 표(MOVE_ON_WORDS, 15낱말 코드 상수): 해가 없다.** 앱이 상황 줄을 쓴 15차례 가운데 넘김 문장을 바꾼 것이 9(인사 끝 7 · 닫기 꼬리 stuck-three L1 4 · 쉬운 질문 꼬리 preview-1 L2 3)이다. 반응을 바꾼 6 은 같은 대화 안 되풀이 4 와 범위 밖 낱말 'worries' 2 때문이어서 표와 상관이 없다. 표가 맞장구를 넘김으로 잘못 본 차례 0, 맞장구가 지워진 인사 끝 0/10 이다. 표에 든 낱말('time' · 'go' · 'here')이 든 짧은 반응('Fun time!' 꼴)은 넘김으로 보이지만, 그때도 예문과 글이 같아야 바뀌므로 해는 작다(fix 보고 남은 우려 1 과 같은 판단). 바꾸기가 예문과 글이 같을 때만 돌기 때문에 AI 가 넘김을 조금 바꿔 쓴 'Now, let's learn some new words.' 는 그대로 나간다(stuck-three L2 1 · word-answers L2 1). 지금 해는 없고 M-r3-4 에 적었다.

## 4 대본마다 사람 판정(r2 표 꼴)

이어짐 칸은 r1 · r2 와 같은 기준이다(말로 답한 뒤 AI 차례가 분모이고, 인사 끝 · 막힘 말 뒤 차례는 뺀다). ✓ 는 반응과 질문이 모두 아이 말을 잇는 차례, 반은 반응은 아이 말을 받았으나 질문이 카드 · 딴 것인 차례, ✗ 는 둘 다 아닌 차례다. 맥락 낱말은 아이에게 나간 글에서만 셌다(6.3절).

| 대본 | 대화 같다 · 아니다(까닭) | 이어짐(✓ · 반 · ✗ / 분모) | 맥락 낱말 · 불필요하게 어려운 낱말 | 말을 위한 말 | 아이 말 끊음 | 지어낸 경험 | 요약 밖 기억 | 막힘 판정 틀림 | 답 먼저(설계 밖) | 끼움(억지 · 반) |
|---|---|---|---|---|---|---|---|---|---|---|
| l3-stuck-three | L1 **같다**(받침 다섯이 모두 다른 말, 막힘 뒤 'What juice do you like?' · 'Who do you go with?' 로 이어 물음. 흠: 2 'That's okay! You can do it.' 은 r1 버릇 문장이 한 번 남음) · L2 **같다(흠)**(5 · 7 같은 상황 줄 통째 되풀이 I-r3-1, 7 "Let's try." 와 신호 말 "Let's say it together!" 의 권유 두 번 M-r3-7) | 4 · 0 · 0 / 4 | easier 1 · words 1 · 0 | 0 | 0 | 0 | — | 0('Huh?' · 'I don't know.' 막힘 맞음) | 0(받침 설계) | 0 · 0 |
| l3-preview-1 | L1 **같다**(배고픔 → 음식 → 생선 → 같이 먹는 사람 → 주스. 흠: 6 'Who is with you?' 가 form 뒤 다시 쓰기로 흐려짐 M-r3-6) · L2 **같다(흠)**(4 'What do you want?' 는 앞 질문이 지워져 뜻이 흐려짐 M-r3-2, 6 → 7 'What do you do with juice?' 두 번 M-r3-3) | 5 · 5 · 0 / 10 | words 1 · easier 1 · 0 | 0 | 0 | 0 | — | 0(2 · 3 단추) | 0 | 0 · 3(L1 7, L2 6 · 7) |
| l3-word-answers | L1 **같다(흠)**('Rice.' · 'Yes.' · 'Juice.' · 'Cold.' · 'Lake.' · 'Big.' · 'Water.' 를 모두 받아 되풀이하고 새로 물음. 흠: 4 'You drink juice!' 다음 차례 5 가 drink 를 노리는 필수 질문 M-r3-1) · L2 **같다(흠)**(2 · 4 는 선생님이 되풀이로 노리는 동사를 말한 차례에 그 동사를 노리는 질문 M-r3-1, 8 꺼내기 소리 줄 M-r2-4) | 9 · 4 · 0 / 13(L2 3 'Yes.' 막힘은 분모 밖) | words 1 · 0 | 0 | 0 | 0 | — | 0(경계: L1 3 'Yes.' 답 · L2 3 막힘, M-r3-8) | 0(L1 8 · L2 8 introduce 허용) | 0 · 2(L1 3, L2 2) |
| l3-greet-more | L1 · L2 **같다**(인사 끝이 축구에 닿고 질문 없음, L2 2 'Me too, bikes are fun!' 은 좋아하는 것의 자기 이야기) | 5 · 1 · 0 / 6 | sounds 1 · words 1 · 0 | 0 | 0 | 0 | — | 0 | 0 | 0 · 1(L1 3) |
| l3-scene-other | L1 · L2 **같다**(고양이 색을 묻고 한 턴 뒤 카드로 돌아옴, 'Who cooks the fish?' · 'What juice do you drink?' 이어 물음. AI 의 다리 'Does your cat like fish?' 가 form 으로 두 바퀴 다 지워져 다리 없는 카드 질문 M-r3-6) | 8 · 2 · 0 / 10 | words 1 · 0 | 0 | 0(설계 길 2: L1 3 · L2 3) | 0 | — | 0 | 0 | 0 · 2(L1 3 · L2 3) |
| **합계** | 같다 10바퀴(흠 넷) / 10 | 31 · 12 · 0 / 43 | 맥락 8 · 불필요 0 | 0 | 0(설계 길 2) | 0 | —(둘째 세션 대본 없음) | 0 | 0 | 0 · 8 |

온전한 이어 묻기 31/43(72%)이고, 반응이 아이 말을 받은 차례는 43/43 이다. 같은 다섯 대본의 r2 값은 35 · 6 · 1 / 42(83%), r1 값은 29 · 8 · 3 / 40(73%)이다. r3b 의 '반' 열둘은 AI 가 스스로 고른 카드 질문 넷(장면 다리 · 식사 맥락이 있음: preview-1 L1 7 · L2 6 · 7, greet-more L1 3), 검사 두 번 걸림 뒤 카드 자리 셋(scene-other L1 3 · L2 3, word-answers L2 2), 아이 낱말 대신 장면을 물은 질문 셋(word-answers L1 4 · L2 5, preview-1 L2 8), wh 질문 뒤 'Yes.' 를 답으로 받은 길 하나(word-answers L1 3), 질문 하나 남기기 하나(preview-1 L2 4)다. ✗ 는 0 이고, 어느 것도 fix 2 가 닿은 자리(상황 차례)에서 생기지 않았다. 같은 다섯 대본 r2 보다 ✓ 이 넷 적은 것은 두 바퀴 표본의 흔들림 폭 안으로 보고 판정에 넣지 않는다. 다음 회차 · iPad 시험에서 같은 꼴이 늘어나는지 본다.

## 5 재발 목록 일곱(r3b)

| 항목 | r2 | r3b | 근거 |
|---|---|---|---|
| 일방통행 | 없음 | **없음** | 말로 답한 43차례 모두 반응이 아이 말을 받았다('Rice.' → 'Yum, rice! You like rice!', 'Big.' → 'Wow, big! The lake is big!') |
| 같은 질문 반복 | 있음 1 | **없음**(약한 꼴 둘은 Minor) | 아이가 답한 질문 되물음 0/43. 아이가 답하지 않은 질문을 다음 차례에 글자 그대로 한 번 더 물은 것 1(preview-1 L2 6 · 7, 같은 질문 상한 안 02-2:204, M-r3-3). 선생님이 되풀이로 답을 먼저 말하고 그 답을 묻는 꼴 3(word-answers L1 4 → 5 · L2 2 · L2 4, M-r3-1) |
| 두 번 읽기 | 없음 | **없음** | 같은 소리 두 번은 받침 첫째 · 셋째의 같은 답 소리뿐이다(stuck-three L1 2 · 4, L2 2 · 4 〈Yes, I ride a bike.〉, 02-2:259~261 설계) |
| 형식적 인사 | 있음(모양 바뀜) 11/16 | **없음** | 인사 끝 반응 10/10, 반응 없는 시작 줄 0. 'fine' 답 반응이 'Good to hear!' 로 7/8 몰린 것은 M-r3-4 |
| 한글 해석(뜻) | 없음 | **없음** | 68차례 모두 뜻이 있다. 영어와 뜻이 어긋난 것 1(preview-1 L2 4 'What do you want?' · '뭐 먹고 싶어?', M-r3-2) |
| 한국어로 묻기 | 없음 | **없음** | 질문은 전부 영어다. 설명에도 영어 문장이 없고 낱말 뜻만 있다(예: "'ride'는 '타다'라는 뜻이야.") |
| 지어낸 경험 | 없음 | **없음** | 자기 이야기는 좋아하는 것 · 지금 느낌뿐이다('Me too, bikes are fun!' · 'No problem! I can help.') |

## 6 지표 해석

### 6.1 (나) AI 베끼기 8/68 과 (가) 앱 교체 15/68

- **(나) 8/68(12%, 기준 1/10 밖)은 모두 네 낱말 안 맞장구다.** 'Good to hear!' 5(stuck-three L1 1 · preview-1 L1 1 · word-answers L1 1 · scene-other L1 1 · L2 1), "That's okay!" 2(stuck-three L2 2 · preview-1 L2 3), 'Oh, okay!' 1(word-answers L2 3). 앱이 넘김 문장을 상황 줄로 바꾸면 AI 몫에는 맞장구만 남고, 그 맞장구가 예문과 같으면 (나)로 세어진다. N-1 (가)가 남기기로 정한 바로 그 문장이므로 원치 않는 베끼기는 0 이다. 지표 정의가 결정과 부딪히는 자리이고(M-r3-5), 기준 밖을 실패로 보지 않는다.
- **(가) 15/68 은 설계상 교체다.** 인사 끝 7 · 받침 8 이다. stuck-three 가 8/16 으로 높은 것은 막힌 차례의 AI 반응이 네 꼴('That's okay!' · "It's okay!" · 'No problem!' · 'No worries!')에 몰려 같은 대화에서 되풀이되기 때문이다(교체 까닭: 되풀이 4 · 범위 밖 'worries' 2 · 넘김 예문 2). 막힘이 많은 수업에서는 앱의 세 줄짜리 목록이 다양함을 떠맡고 있어서, 그 목록이 다 걸릴 때의 고르기가 중요해진다(I-r3-1).

### 6.2 선생님 말 양: stuck-three 7.6 과 word-answers 15.56 은 '선생님 혼자 긴 말'이 아니다

바퀴당 선생님 낱말을 자리별로 갈라 셌다(첫 인사 'Hello, {NAME}! How are you?' 4낱말은 뺐다. 셈 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/des-r3-work/talk_volume.py`). '선생님 줄'은 AI 글과 그 자리에 앱이 넣은 상황 줄을 합친 최종 줄이다. r2 옛 보고에는 상황 줄 칸이 없어서, 세 회차를 같은 꼴로 견주려고 이 칸을 쓰고 r3b 만 AI 몫을 따로 적는다.

| 대본 · 바퀴당 낱말 | 기준선 | r2 | r3b |
|---|---|---|---|
| stuck-three 선생님 줄 | 54 | 76 | 50(앱 상황 줄 18.5 · AI 몫 31.5) |
| stuck-three 붙인 줄(신호 말 · 닫기 뒤 카드 질문) | 14 | 30 | 30 |
| stuck-three 소리 줄(답 소리) | 17 | 19 | 19 |
| stuck-three 장면 여는 질문 · 인사 뒤 첫 질문 | 12 | 11 | 11 |
| word-answers 선생님 줄 | 89 | 77 | 88(앱 상황 줄 1 · AI 몫 87) |
| word-answers 붙인 줄 · 소리 줄 | 0(+선택지 소리 18) | 21 | 21.5 |

- **AI 몫은 기준선 이하이거나 거의 같다.** r3b AI 몫과 기준선을 견주면 stuck-three 31.5 · 54, preview-1 62.5 · 68, word-answers 87 · 89, scene-other 44 · 51 이다. greet-more 만 35.5 · 33 으로 2.5낱말 많은데, 인사 끝이 축구에 반응한 말('That sounds fun.' · 'That is fun.')이다(기준선 인사 끝은 'Yay, soccer! Let's learn some new words!'). r2 에서 N-2 로 늘었던 선생님 줄(stuck-three 76 · preview-1 85.5)은 사라졌다.
- **늘어난 몫은 앱의 설계 줄이다.** stuck-three 는 신호 말(C207: 'Listen, then say it with me!' · 'Say it with me!' · "Let's say it together!", 바퀴당 약 14낱말)이 늘었고, 기준선에서는 AI 가 'Let's say it together.' 로 그 몫을 제 말 안에서 했다. 지표의 대본별 기준선(stuck-three 7.13 · word-answers 15.38)에는 고침으로 없어진 자리 밖 선택지 소리(〈It is cold.〉〈It is hot.〉, stuck-three 6 · word-answers 18낱말)가 들어 있다. 그것을 빼고 견주면 word-answers 는 전체 말 양도 기준선과 같다(바퀴당 120.5 · 119).
- **아이 차례 앞 가장 긴 말**은 stuck-three L1 4 · L2 4 의 23낱말(받침 셋째 닫기: 반응 + 답 소리 + 다음 카드 질문, 기준선 같은 자리 21)과 word-answers L1 8 의 25낱말(반응 · 되풀이 + 카드 질문 + 신호 말 + 따라 할 말, 꺼내기)이다. 앞의 둘에서 AI 몫은 'That's fine!' 2낱말과 0낱말이고, 뒤의 하나는 AI 몫 15낱말 가운데 10낱말이 카드 질문 글이다. 비율이 높은 까닭은 아이 말이 적은 대본(막힘 다섯 · 낱말 하나 답)이라 분모가 작은 데 있다.
- **긴 차례 후보 word-answers 6 → 사람 0** 이다. 인사 끝 2(L1 1 · L2 1)는 넘김 · 장면 여는 질문 셈의 오탐이고, 넷(L1 5 · L1 8 · L2 4 · L2 8)의 장면 문장 'The sun is hot!' · 'Sand on your hands!' 는 카드 필수 질문 글의 일부다(r1 5절 기준).

### 6.3 범위 밖 낱말

지표는 아이에게 나가지 않은 원문 낱말까지 센다. stuck-three 6 가운데 넷(worries 2 · easier 1 · words 1)은 바꾸기 · 지우기로 아이에게 닿지 않았다. 다섯 대본에서 아이에게 나간 범위 밖 낱말은 words 5 · easier 2 · sounds 1 이고 모두 수업 말 · 관용 반응인 맥락 낱말이다. 불필요하게 어려운 낱말은 0 이다. words 는 시드 넘김 줄 'Now, let's learn new words!' 에서도 나오므로(preview-1 L1 1 · scene-other L2 1) 정규화(M-r2-2)가 열려 있는 한 앱 줄이 스스로 지표에 걸린다.

### 6.4 그 밖

첫 문장 p95 는 1498~1865ms 로 다섯 대본 모두 1.9초 아래다. 호출 실패 · 읽지 못함 0/68, 호출 수는 바퀴당 그대로(8 · 8 · 8 · 4 · 6), 소리 줄 자리 밖 0, 신호 말 겹침 0 이다. 실행 기록(run.log 다섯)에 실패 · 경고 줄은 없다.

## 7 종합 판정과 남은 고칠 것

**조건부 통과.** 설계 8 의 사람 판정 0 항목(막힘 판정 틀림 · 설계 밖 답 먼저 · 억지 끼움 · 지어낸 경험 · 아이 말 끊음 · 말을 위한 말)이 모두 0 이고, r2 Important 셋이 닫혔으며, 아이 귀에 '대본 같음'과 '두 번 말함'이 r2 보다 뚜렷이 줄었다. 남은 Important 는 앱의 결정 논리 한 곳이라 프롬프트 · AI 몫이 바뀌지 않는다. 고친 뒤 단위 시험(stuck-three L2 차례 열 재현)과 코드 검토만으로 확인하고, 실호출 재판정 없이 iPad 시험을 부탁해도 된다(iPad 검증 전, C210 · C211 (5)). 대본으로도 보고 싶으면 stuck-three 한 대본 두 바퀴(16호출)면 된다.

| 번호 | 심각도 | 묶음 | 고칠 것 | 근거 차례 |
|---|---|---|---|---|
| I-r3-1 | **Important** | 2(앱 상황 줄 고르기) · 5(단위 · 짝 시험) | **상황 줄 목록이 모두 걸리면 돌림 차례 줄로 돌아가 이미 통째로 쓴 줄을 다시 낸다.** 고칠 곳은 situation.ts 472~473 의 되돌아감이다: (가) 돌림 순서로 통째로 쓴 적 없는 줄을 먼저 고르고, (나) 그것도 없으면 이 턴 AI 반응이 되풀이가 아닐 때 반응을 두고 넘김 꼬리만 붙이며, (다) 그래도 안 되면 지금처럼 한다. 단위 시험에 stuck-three L2 2~7 의 앞 행 글을 넣어 7차례 줄이 5차례 줄과 다름을 단언하고, 서버 · 도구가 같은 함수를 쓰는지 짝 시험에 둔다. Important 로 둔 까닭: 설계 8 '상황 반응 되풀이 0' 과 r1 I-1 (나) '아직 안 쓴 상황 줄로 바꾼다 · 되풀이 0 을 앱이 보장' 이 깨지고, 요청자가 r1 에서 들은 '반응이 일관적'이 같은 꼴로 들린다. fix 2 가 만든 길이다(r2 규칙이었다면 통째 되풀이가 없었다, 3절 (2)). iPad 에서는 마이크 문제(C210)로 모름 단추 · 들리지 않음 차례가 늘어 세 줄 · 네 줄 목록이 더 빨리 다 걸린다. 들리지 않음 목록도 같은 고르기를 쓰고(situationPlaceOf 'nospeech' · lesson-turn.ts 828 의 texts), 'Let's go on.' · 'Here is the answer.' 를 닫기 목록과 나눠 써서 같은 길이 있다(코드 근거이고, r3b 에 들리지 않음 대본이 없어 대본 근거는 없다) | stuck-three L2 5 · 7 |
| M-r3-1 | Minor | 1(고정부) · 2(되묻기 검사 (다)) | 선생님이 되풀이로 노리는 동사를 먼저 말하고 같은 차례 · 다음 차례에 그 동사를 노리는 필수 질문을 붙인다(r2 흠이 이어짐). 설계된 대화는 'You drink juice! Is it cold?' 처럼 아이 낱말에 이어 묻는다. 권고: 되묻기 검사 (다)의 '아이가 이번 말에서 말한 노리는 단어'에 '이 턴 선생님이 남긴 문장(되풀이)에 든 노리는 단어'를 더하거나, 되풀이에 노리는 단어가 들면 그 필수 질문은 다음 차례로 미루라는 고정부 한 줄을 둔다. 답을 쉽게 만드는 받침 효과도 있으므로 끌지 말지는 컨트롤러 결정 거리다 | word-answers L2 4(같은 차례 'You drink juice! … What do you do with the juice?') · L2 2('You eat rice.' + 카드 'What do you do at the table?') · L1 4 → 5 |
| M-r3-2 | Minor | 2(질문 하나 남기기) · 1(되묻기 검사 (나)) | 두 질문 가운데 마지막만 남겨 'Oh, you like bikes! What do you want?' 가 됐다. 뜻을 받치던 앞 질문이 사라져 질문이 흐려지고 영어와 뜻('뭐 먹고 싶어?')이 어긋난다. 지워진 'Are you hungry now?' 는 아이가 방금 'I am hungry' 라 한 것을 되묻는 질문인데, 되묻기 검사 (나)는 내용 낱말이 모두 아이 말에 있어야 걸어서(question-check.ts 463~471) 'now' 한 낱말로 비껴간다. 권고: (나)의 건너뛰는 낱말에 때 · 곳 부사(now · today · here)를 더하고, 질문이 둘이면 남길 쪽을 정하기 전에 되묻기를 먼저 지운다 | preview-1 L2 4 |
| M-r3-3 | Minor | 1(다시 쓰기 안내) | 다시 쓰기가 앞 차례 질문을 글자 그대로 되풀이했다(첫 시도 'Who eats the big fish?' 가 form 에 걸림 → 'What do you do with juice?'). 아이가 앞 질문에 답하지 않았고 같은 질문 상한(02-2:204) 안이라 설계 위반은 아니다. 다시 쓰기 안내에 '앞 차례 질문을 그대로 쓰지 않는다(다시 물을 때는 짧게 바꾼다)' 한 줄을 둔다 | preview-1 L2 6 · 7 |
| M-r3-4 | Minor | 1(고정부 인사 줄) · 2(넘김 바꾸기) | 'fine' 답 반응 7/8 이 'Good to hear!' 다. 고정부 인사 줄의 첫 예('React like a person (e.g. 'Good to hear!', 'Me too!')')를 그대로 쓴 것이다. 반응이 아이 답을 받으므로 N-1 은 닫혔으나, 아이가 매일 'I'm fine.' 이라 하면 매일 같은 첫마디가 된다. 넘김 바꾸기는 예문과 글이 같을 때만 돌아 'Now, let's learn some new words.' 는 AI 글 그대로 나간다. iPad 시험에서 요청자가 첫마디가 늘 같다고 느끼면, 인사 줄 예를 답 꼴별(기분 좋음 · 피곤 · 덧붙인 말)로 바꾸고 인사 끝 넘김은 넘김 낱말이 든 문장을 모두 앱 줄로 바꾼다 | 인사 끝 'fine' 여덟, stuck-three L2 1 · word-answers L2 1 |
| M-r3-5 | Minor | 4-나(지표) | (나)가 맞장구만 남은 차례를 베끼기로 세어 N-1 (가) 결정과 기준(1/10)이 부딪힌다(8/68 모두 네 낱말 안 맞장구). 맞장구만 예문과 같은 차례는 따로 건수로 보이고 (나)에서 뺀다. 범위 밖 낱말도 아이에게 나가지 않은 원문 낱말(worries 2 · easier 1 · today 1 · words 5)을 세므로 나간 글 기준으로 가른다 | 6.1 · 6.3절 |
| M-r3-6 | Minor | 1(다시 쓰기 안내, M-7 연장) | 3인칭 단수 · does 의문문은 4단계 문법이라(02-3:55) form 걸림은 맞다. 그러나 다시 쓰기가 'Who is with you?' 처럼 흐려지거나 'Do you like the juice?' · 'Do you like the fish?' 로 떨어진다. 고양이에서 생선으로 가는 다리 'Does your cat like fish?' 는 두 바퀴 다 지워져 다리 없는 카드 질문이 됐다. 다시 쓰기 안내에 'Who eats …?' 는 'Who do you eat with?'(아이가 그 낱말을 이미 말한 뒤), 'Does your cat …?' 는 'Do you …?' 나 be 동사 꼴로 바꾸라는 예 한 줄을 둔다 | preview-1 L1 6 · greet-more L1 3 · L2 3 · scene-other L1 3 · L2 3 · L2 4 |
| M-r3-7 | Minor | 3(시드) | together 줄 "It's okay! Let's try." 뒤에 신호 말 "Let's say it together!" 가 붙으면 '해 보자 · 같이 말해 보자'로 권유가 두 번이다. together 줄의 둘째 문장을 권유가 아닌 말로 둔다(다른 두 줄 'I can help.' · 'We can do this.' 꼴) | stuck-three L2 5 · 7 |
| M-r3-8 | Minor | 결정 거리(C204 경계) | wh 질문 뒤 'Yes.' 가 L1 은 답(short_related), L2 는 막힘으로 갈렸다. C204 (1) 글자로는 막힘이 아니고(단추 · 침묵 · 한국어만 · 조각), r2 판정은 막힘을 맞다고 봤다. 앱의 막힘 판정은 AI 의 막힘을 무르기만 해서(child-kind.ts 108~112) 갈림이 AI 몫으로 남는다. 두 길 모두 아이에게 해는 없으므로 경계를 한 줄로 정하면 된다 | word-answers L1 3 · L2 3 |
| M-r2-2 · M-r2-4 | Minor | 4-나 · 설계 결정 | 2절 표대로 아직 열림 | 2절 |

확인한 것(닫힘 · 유지): N-1 · N-2 · N-3 · M-r2-1 · M-r2-3 · M-r2-5 닫힘, 지어낸 경험 0, 말을 위한 말 0, 억지 끼움 0, 막힘 판정 틀림 0, 설계 밖 답 먼저 0, 소리 줄 자리 밖 0, 신호 말 겹침 0, 한글 뜻 빠짐 0, 불필요하게 어려운 낱말 0, 호출 실패 · 읽지 못함 0/68, 첫 문장 p95 다섯 대본 모두 1.9초 아래, 호출 수 바퀴당 그대로, AI 몫 말 양은 네 대본이 기준선 이하이고 greet-more 만 2.5낱말 많음(인사 끝 축구 반응).

## 8 아이 눈 소감(세 줄)

"주스 마셔요" 하면 "어떤 주스 좋아해?", "고양이 있어요" 하면 "무슨 색이야?" 하고 물어봐 주고, "축구 했어요" 하면 "우와, 축구! 재미있겠다" 해 준다. 모르겠다고 할 때마다 "괜찮아! 더 쉽게 물어볼게" · "괜찮아! 내가 도와줄게" · "그래! 우리는 할 수 있어" 처럼 다른 말로 달래 주니 선생님이 내 말을 듣는 것 같다. 그런데 모르겠다를 다섯 번쯤 하면 "괜찮아! 해 보자" 가 또 나오고, "주스!" 하면 "너는 주스를 마시는구나! … 주스로 뭘 해?" 처럼 선생님이 방금 한 말을 나한테 다시 물을 때가 있다.
