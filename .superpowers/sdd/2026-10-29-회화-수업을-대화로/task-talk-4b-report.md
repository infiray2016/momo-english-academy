# 보고: 회화 3단계 생성 브리프 고침 — 묶음 4 나(학습 설계자 · Opus 5.5 · xhigh, 2026-11-05)

상태: **DONE_WITH_CONCERNS**. 브리프 `task-talk-4b.md` 의 할 것 1~9 를 모두 했다. 남은 우려는 끝 절에 적었고, 카드 생성을 막는 것은 없다.

## 판

| 칸 | 앞 판 | 새 판(둘째 판) |
|---|---|---|
| 파일 | p13d `seed/prompts/talk-3.md` | 같음 |
| sha256 | 8956f25816b5d8fc0d321e5aea6a5005bbfa0de827e81fdb216d44b54bbf2561 | **ca4c5031847aaf035331269d372c56692a37f5bc5c6e802d056fd0b5826e0eaa** |
| 줄 수 | 774 | **810** |
| README talk-3 행 | '해시 8956f258… — 설계 검토 전' | '둘째 판(2026-11-05 …, 810줄, 해시 ca4c5031…) — 범위 한정 재검토 전'을 덧붙임 |

- 고친 파일은 p13d 의 `talk-3.md` 와 `README.md` 둘뿐이다. `src/` · `tests/` · 규격 파일 · 목표 파일은 건드리지 않았고, 커밋하지 않았다.
- 고치기 직전에 p13d 원본이 앞 판 해시와 같음을 확인했다. 고침은 스크립트로 적용했고, 치환할 원문이 파일에 꼭 한 번만 나오는지 assert 로 확인했다. 시험 사본과 실제 파일은 `cmp` 로 같다.
- diff 전문: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/talk3-brief-fix1/final.diff`(195줄).

## 고친 곳(새 판 줄)

| 할 것 | 절 · 줄 | 고친 것 |
|---|---|---|
| 판 | 0절 11 · 14 | 만든 날에 둘째 판을 더했다. '12절 꼴의 상태'에는 열쇠를 맞춘 검증기(`sameQuestionKeyOf`)로 12절 예시를 다시 돌렸다는 문장을 더했다 |
| M-2 | 0절 13 | '이 판이나 다음 판으로'를 '다음 판으로'로 고쳤다. 까닭은 `VERBS` · `GOAL_OF` 가 단원 1 전용이라는 것이다 |
| I-1 (1) · M-1 | 5절 142 | ○ 예를 `You are tired. What do you do in your bed?` 로 바꿨다. '질문 글은 두 문장까지'는 그대로 두고, 카드 자리에 AI 반응이 앞에 붙는다는 근거(02-2 190줄)를 더했다 |
| I-1 (1) | 5절 146 '같은 질문' 행 | 같은 질문은 **마지막 물음표 문장**으로 본다(대소문자 · 따옴표 · 문장 부호 · 띄어쓰기 · 줄임꼴 무시, 한 카드 2번까지)는 규칙과 그 근거(02-2 200줄 · C172 · 설정값 `talk.same_question_max`)를 적었다. (제안)으로 '카드 안의 마지막 물음표 문장은 모두 다르게, 장면 없는 `What do you do?` 로 끝내지 않음'을 더했다 |
| I-1 (1) · (2) · T-53 | 5절 170 더 이야기할 거리 | ○ 예를 `You are thirsty. What do you do with your cup?` 로 바꿨다. 더 이야기할 거리도 같은 셈에 든다는 규칙과 '(제안) 필수 질문 · 다른 더 이야기할 거리와 꼬리를 겹치지 않음'(C172 · C194 (1) 닫기 뒤 자리)을 더했다 |
| I-1 (2) | 8절 292 | 선생님 질문 행에 '질문 문장 안의 장면 말'과 '장면 없는 `What do you do?` 로 줄이지 않음'을 더했고, 예를 고쳤다 |
| M-4 | 8절 307 | 부정 명령문 `Don't ~` 를 더했다(명령문 3단계 단원 4 · don't 4단계 단원 2, `dont` 검출기와 어휘 검사가 못 잡음 → `It is okay!` 꼴) |
| I-1 (2) · M-1 | 8절 309~337 질문 꼴 표 | 열 칸 '열쇠'를 더했고 스물다섯 줄의 열쇠를 모두 다르게 바꿨다(아래 표). grass 는 두 문장이 되었다 |
| M-3 | 10절 362 | 한국어 칸에서 '준'은 보지 않고 영어 `Jun` 만 피한다. '하나 → 한 개 · 한 번', '소라 → 조개' 안내는 남겼다. 검증기는 명단 칸의 보통 낱말 예외를 쓴다는 근거(C141)를 적었다 |
| I-1 (4) | 12절 425 · 448 · 455 · 457 · 460 · 461 | 확인 문장을 둘째 판 검증으로 갱신했다. 필수 3 · 필수 5 · 더 1 · 더 2 의 질문과 뜻을 고쳤고, 더 1 그림은 sandwich 에서 table 로, 목표 표현 하나는 learn 꼴로 맞췄다 |
| I-1 (1) | 14절 524 확인 4 | 마지막 물음표 문장 규칙 한 줄과 장면 없는 `What do you do?` 금지를 더했다 |
| M-4 · M-3 | 14절 527 확인 7 · 532 확인 12 | 확인 7 에 부정 명령문을 더했고, 확인 12 의 '준'은 영어만 본다고 고쳤다 |
| 규칙 표 | 14절 536 · 551 | `talk-same-question` 행을 '마지막 물음표 문장(실행 셈과 같은 열쇠) 2번까지'로 고치고 대조 날짜를 더했다 |
| I-1 (3) · M-3 | 14절 560 · 591 · 594~608 · 612 · 694~705 · 742 | 스스로 확인 명령에 다음을 더했다: `question_key`(마지막 물음표 문장 + 줄임꼴 펼침, 앱 `CONTRACTIONS` 와 같은 꼴), 상한 `SAME_MAX`(`<뿌리>/settings.json` 의 `talk.same_question_max`), 카드마다 인사 · 필수 · 더 · 쉬운 질문의 `en` 열쇠 셈(상한을 넘으면 걸림), 장면 없는 'what do you do' 걸림, 카드마다 가장 많은 수 출력. 또 `TEACHER_KO` 에서 '준'을 뺐고, `offband` 는 두 낱말 표제어(ice cream)를 토큰 전에 맞춘다 |
| 보고 꼴 · 제안 | 16절 780 · 17절 794 · 805 | 같은 질문 보고 줄을 열쇠 기준으로 고쳤다. 제안 표에 두 행(열쇠 · 뒤 명단 한국어)을 더했다 |

## 새 질문 꼴 표(8절, 배정 차례)

모두 7낱말 이하이고, 질문 두 문장 이하다. 질문에는 노리는 단어가 활용형까지 없다(A4-03). 어휘는 그 낱말의 배정 수업에서 열린 범위(1~2단계 + we · they + 열린 단원 단어 + where) 안이다. 스물다섯 열쇠는 서로 겹치지 않는다. 모두 스크래치패드 시험 스크립트로 확인했다.

| 낱말 | 질문 | 답 예시 | 열쇠(마지막 물음표 문장) | 앞 판과 |
|---|---|---|---|---|
| eat | You are hungry. What do you do at the table? | I eat a sandwich. | what do you do at the table | 바뀜 |
| drink | You are thirsty. What do you do with your cup? | I drink water. | what do you do with your cup | 바뀜 |
| go | With your family, what do you do? | We go to the lake. | with your family what do you do | 같음 |
| come | The sun is down. What do you do now? | We come home. | what do you do now | 바뀜 |
| wash | Sand on your hands! What do you do with water? | I wash my hands. | what do you do with water | 바뀜 |
| sleep | You are tired. What do you do in your bed? | I sleep in my bed. | what do you do in your bed | 바뀜 |
| study | What do you do at your desk? | I study at my desk. | what do you do at your desk | 같음 |
| learn | What do you do with new games? | I learn new games. | what do you do with new games | 바뀜 |
| watch | What do you do at home? | We watch a soccer game. | what do you do at home | 같음 |
| listen | In the car, what do you do? | I listen to songs. | in the car what do you do | 같음 |
| look | Birds in the tree! What do you do with your eyes? | I look at the birds. | what do you do with your eyes | 바뀜 |
| see | At the lake, what do you do? | I see ducks. | at the lake what do you do | 같음 |
| make | You have sand. What do you do with it? | I make a sand house. | what do you do with it | 같음 |
| sky | The sun is up. Where is it? | It is in the sky. | where is it | 같음 |
| sea | Fish and whales! Where are they? | They are in the sea. | where are they | 같음 |
| cloud | What is white in the sky? | It is a cloud. | what is white in the sky | 같음 |
| rain | You have an umbrella. What do you see? | I see rain. | what do you see | 같음 |
| snow | It is very cold. What is on the trees? | I see snow. | what is on the trees | 바뀜(배정 4 rain 과 겹침) |
| wind | You have a kite. What do you need? | I need the wind. | what do you need | 바뀜(흔한 꼴 'what do you like') |
| river | Where do ducks swim? | They swim in the river. | where do ducks swim | 같음 |
| mountain | With your family, where do you go? | We go to the mountain. | with your family where do you go | 같음 |
| beach | Sand and shells! Where do you play? | We play at the beach. | where do you play | 바뀜(배정 5 forest 와 겹침) |
| grass | Cows and sheep! What do they eat? | They eat grass. | what do they eat | 바뀜(M-1 세 문장) |
| forest | Many trees! Where are you? | I am in the forest. | where are you | 같음 |
| air | You are on a mountain. How is it? | The air is good. | how is it | 같음 |

## 14절 명령 실행 결과(스크래치패드 시드 사본, 실제 판에서 뽑은 명령 그대로)

- 사본 자리: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/talk3-brief-fix1/`. 시드 사본은 `seed/`, 뽑은 명령은 `final/`, 검증 출력은 `validate-final.txt` 에 있다. 명령 덩어리 셋은 시험 판과 실제 판에서 `cmp` 로 같았다.

| 명령 | 입력 | 결과 |
|---|---|---|
| 스스로 확인(`python3 -I`, 뿌리 · 단원 1 · k 5) | 둘째 판 12절 예시 | '스스로 확인 걸림 없음', 같은 질문 열쇠 카드 최대 1, 인물 n=0 · m=0 |
| 같은 명령(음성 시험) | 앞 판 12절 예시 | 'what do you do' 4번(상한 2) 걸림 + 장면 없는 꼴 걸림, 경로 필수 3 · 필수 5 · 더 1 · 더 2 |
| 같은 명령(M-3 시험) | 예시에 '준비됐어?' · '하나 더' · 'ice cream(s)' · flow 'Jun' 을 넣은 변형 | '준비'와 'ice cream' 은 넘어가고, '하나'와 'Jun' 은 걸림(뜻대로) |
| 붙이기 | 고정 카드 1(예시) + 새 카드 둘 + 같은 자리 중복 사본 | '붙임: 카드 3 · 고정 1 · 해시 같음'. 중복 사본이 고정 카드로 바뀌었고 (변형, 정규 → 보강, 번호) 차례로 정렬되었다. 해시를 다르게 주면 AssertionError 로 멈춘다 |
| 검증(Node 24 서브셸, `pnpm -s seed:validate --root <사본>/seed --areas talk --json` + 브리프의 거르기) | 둘째 판 12절 예시 | cells 27 · passed 27 · failed 0 · warnings 5. 이 파일의 경고는 `talk-unit-incomplete` 하나다(예고된 것) |
| 검증(앞 판 예시, 기준 확인) | 앞 판 12절 예시 | `talk-same-question` 오류 1: "'what do you do' 가 4번(마지막 물음표 문장 기준, 2번까지)". 지금 p13d 검증기(`check-talk.ts`, 11-05 13:58 수정)가 새 열쇠로 센다는 것을 확인했다 |
| 옛 열쇠(항목 글 전체) 셈 | 둘째 판 12절 예시 | 가장 많은 수 1(질문 21). 브리프 할 것 9 대로 어느 열쇠로 세어도 오류 0 이다 |

## 설계(검토 보고 제안)와 다르게 한 것

1. **eat**: 검토 예 'Lunch time! What do you do now?' 의 time 은 vocab 4단계라 7절 '쓰지 않음'이다. 그래서 `… What do you do at the table?` 로 썼다(table 2단계, 그림 키 있음). now 꼴은 come 이 쓴다.
2. **drink · wash**: 검토 예는 drink 가 'with water' 이고 wash 가 'with your hands'(hands 되풀이 · 'Your hands have sand.' 가 어색함)였다. 그래서 drink 는 'with your cup', wash 는 `Sand on your hands! … with water?` 로 바꿨다.
3. **learn**: 'What do you do with a new game?' 은 8낱말이라 7낱말 한도를 넘는다. 'A new game! … with it?' 은 make 와 열쇠가 겹친다. 그래서 `What do you do with new games?` → `I learn new games.` 로 썼다.
4. **명사 넷도 바꿨다**: 같은 배정 수업 안에서 열쇠가 겹치는 snow(rain 과 'what do you see', 배정 4)와 beach(forest 와 'where are you', 배정 5), 흔한 꼴인 wind('what do you like'), M-1 의 grass 다. 할 것 2 는 동사 일곱만 들었지만, '열쇠가 서로 다르게'를 표 전체에 적용했다.
5. **12절 예시의 필수 5 도 고쳤다**: 할 것 4 는 필수 3 · 더 1 · 더 2 만 들었다. 그런데 새 (제안) '장면 없는 `What do you do?` 금지'를 스스로 확인이 걸기 때문에 필수 5('A new game! What do you do?')도 8절 learn 꼴로 맞췄다. 더 1 그림은 질문이 가리키는 table 로 바꿨다(9절 '그림과 질문이 맞게').
6. **(제안) 둘을 더했다**: 하나는 '카드 안의 마지막 물음표 문장을 모두 다르게'이고, 다른 하나는 '장면 없는 `What do you do?` 로 끝내지 않음'이다. 규칙(2번까지)만으로는 한 카드에 같은 꼬리 둘과 AI 질문이 겹쳐 셋이 될 수 있다. 02-2 200줄은 카드와 AI 질문을 함께 센다. 스스로 확인은 둘째 것만 걸고, 첫째 것은 셈 출력으로 보인다.
7. **M-3 은 둘째 안을 골랐다**: 한국어 칸은 '준'만 빼고 계속 본다. 뒤 명단 이름이 들어올 때 '나비' · '하나' 처럼 이름 자체인 낱말은 명단 예외로 뺄 수 없어 카드를 다시 만들어야 하기 때문이다. 두 낱말 표제어는 7절에 '쓰지 않음'으로 적지 않고 명령에서 맞췄다.
8. **스스로 확인 상한은 `<뿌리>/settings.json` 의 `talk.same_question_max` 에서 읽는다**: 검증기는 구조 상수 `TALK_SAME_QUESTION_MAX`(2, `structure.ts:278`)를 쓴다. 지금 두 값은 같다.

## 우려

1. **앱의 카드 자리 고르기는 아직 항목 글 전체로 견준다**: 지금 p13d `chances.ts` 의 `usable` 이 `sameQuestionHit({ question: item.en … })` 로 글 전체 열쇠를 쓴다. 그래서 막힌 질문 · AI 질문과 꼬리가 같은 항목도 붙일 수 있다. 카드 항목끼리는 이제 꼬리가 겹치지 않지만, AI 가 같은 꼬리를 먼저 쓴 경우는 앱 몫으로 남는다(검토 보고 '구현하며 확인할 것 1'의 실행 쪽). 이번 차례에는 확인만 했고 고치지 않았다.
2. **끌어내기 약한 낱말이 남는다**: come(`We go home.` 이 더 자연스러울 수 있음) · see · wind · air 는 질문만으로 그 낱말이 나오기 어렵다. 앞 판과 같은 약점이고, 브리프의 꺼내기 · 받침 줄 지침이 받친다. 프리뷰에서 볼 곳이다.
3. **'하나' 걸림**: 한국어 칸에서 '하나'는 여전히 걸린다(10절 안내 '한 개 · 한 번'). 영어만 보기로 바꾸려면 14절 `TEACHER_KO` 줄과 10절 362줄만 고치면 된다.
4. **0절 14줄 '코드 검토 중이다'**: 이 문구는 10-30 의 상태다(README 는 fix 1 Approved). 브리프 범위 밖이라 고치지 않았다.
5. **검증기가 진행 중이다**: 검증은 p13d `check-talk.ts`(수정 시각 11-05 13:58) 기준이다. 컨트롤러가 더 고치면 마지막 검증을 다시 돌려야 한다.
6. **I-2**(expression 확인 방식)는 그대로 요청자 · P12 몫이다. 답 예시 규칙(I · We · They + 동사 원형)은 바꾸지 않았다.

## 장부에 줄 판정(제안)

- **T-36**: I-1 고칠 것 1~4 와 판 · 해시 · README 갱신을 반영했다. 범위 한정 재검토에서 닫을 수 있다.
- **T-53**: 5절 170줄 ○ 예를 반영했다.
- **T-18**: 요청자 몫이라 그대로 열려 있다.
