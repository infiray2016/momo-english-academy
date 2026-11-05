# 보고: 회화 3단계 단원 1 카드 두 장 글 고침 — 장면 단정 문장(학습 설계자, 2026-11-05 23:1x)

상태: **DONE_WITH_CONCERNS**. 장면 문장 12개를 고쳤고 검증 결과는 고치기 전과 같습니다. 우려는 6절의 판단 셋과 결정 필요 셋입니다.

## 1. 고친 파일(모두 p13d 작업 트리 `.claude/worktrees/p13d/`)

| 파일 | 고친 것 |
|---|---|
| `seed/lessons/talk/3/1.json` | 배정 1 의 7곳 · 다지기 6 의 5곳에서 앞 문장(en · ko)을 고쳤습니다. 두 카드 모두 `revision` 을 3 에서 4 로 올렸습니다 |
| `seed/prompts/talk-3.md` | 처방 16줄을 고쳤습니다(3절). 넷째 판이며 810줄, sha256 은 `1f72e4ff…` 입니다 |
| `seed/prompts/README.md` | `talk-3.md` 행 끝에 넷째 판 기록을 더했습니다 |

질문 문장(마지막 물음표 문장) · 노리는 단어 · 쉬운 질문 · 힌트 · 답 예시 · 칸 구조 · `generation` 은 바꾸지 않았습니다. diff 전문은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/cards-fix-1/diff.txt` 에 있습니다(192줄).

## 2. 고친 문장 전후 표

| 카드 · 칸 | 노림 | 전(en / ko) | 후(en / ko) |
|---|---|---|---|
| 배정 1 필수 1(대화 첫 질문) | eat | Lunch is ready! What do you do at the table? / 점심 다 됐어! 식탁에서 뭐 해? | Rice and fish for lunch! What do you do at the table? / 점심은 밥이랑 생선이야! 식탁에서 뭐 해? |
| 배정 1 필수 2 | drink | You are thirsty. What do you do with the juice? / 목마르구나. 주스로 뭐 해? | The sun is hot! What do you do with the juice? / 햇볕이 뜨거워! 주스로 뭐 해? |
| 배정 1 더 1 | eat | Your family is hungry. What do they do at the lake? / 가족이 배고파. 가족은 호수에서 뭐 해? | Sandwiches for your family! What do they do at the lake? / 가족을 위한 샌드위치야! 가족은 호수에서 뭐 해? |
| 배정 1 더 2 | drink | You play in the hot sun. What do you do with your cup? / 뜨거운 해 아래에서 놀아. 컵으로 뭐 해? | Oh, cold water! What do you do with your cup? / 오, 시원한 물이야! 컵으로 뭐 해? |
| 배정 1 더 3 | go | You are very sleepy. What do you do in your room? / 많이 졸리구나. 네 방에서 뭐 해? | The stars are out! What do you do in your room? / 별이 떴어! 네 방에서 뭐 해? |
| 배정 1 더 4 | wash | You help your family. What do you do with the dishes? / 가족을 돕는구나. 그릇으로 뭐 해? | Many dishes on the table! What do you do with the dishes? / 식탁에 그릇이 많아! 그릇으로 뭐 해? |
| 배정 1 더 5 | come | You have food for the ducks. What do the ducks do? / 오리 먹이가 있어. 오리들은 뭐 해? | Food for the ducks! What do the ducks do? / 오리 먹이야! 오리들은 뭐 해? |
| 다지기 6 필수 1 | eat | You are hungry. What do you do on the mountain? / 배고프구나. 산에서 뭐 해? | Sandwiches for lunch! What do you do on the mountain? / 점심은 샌드위치야! 산에서 뭐 해? |
| 다지기 6 필수 6 | mountain | You walk up and up. Where are you? / 위로, 위로 걸어 올라가. 너는 어디에 있어? | Up, up, to the top! Where are you? / 위로, 위로, 꼭대기까지! 너는 어디에 있어? |
| 다지기 6 더 1 | go | Your bag is ready! What do you do with your family? / 가방 다 챙겼어! 가족이랑 뭐 해? | Bags in the car! What do you do with your family? / 가방이 차에 있어! 가족이랑 뭐 해? |
| 다지기 6 더 2 | come | You are cold and tired. What do you do now? / 춥고 피곤하구나. 이제 뭐 해? | Oh, the sun is down! What do you do now? / 오, 해가 졌어! 이제 뭐 해? |
| 다지기 6 더 5 | beach | You have a kite. Where do you run? / 연이 있어. 어디에서 달려? | Oh, a red kite! Where do you run? / 오, 빨간 연이야! 어디에서 달려? |

- **그대로 둔 앞 문장**은 이미 물건 · 장면 말입니다. 배정 1 필수 4 'Sand on your hands!' · 필수 5 'The sun is down.', 다지기 6 필수 2 'Whales and dolphins!' · 필수 3 'Sand on your feet!' · 필수 4 'Sand and shells!' · 필수 5 'It is hot at the beach.' · 더 3 · 더 4 가 여기에 듭니다. 배정 1 필수 3 은 앞 문장이 없습니다.
- **쉬운 질문**은 모두 한 문장 물음이라 고칠 앞 문장이 없습니다. 검토 참고에 있던 '장면을 되묻는 쉬운 질문'(Are you hungry? 등)은 앞 문장이 바뀌어 되묻는 꼴이 아니게 되었습니다.
- **'You have ~'**(더 5 두 곳)는 분석의 줄 목록에 없었습니다. 아이가 가진 것을 단정하는 꼴이라 같은 뜻으로 보고 고쳤습니다.
- **'Your bag is ready!'** 는 'Lunch is ready!' 와 같은 알림 꼴이고, 한국어가 '가방 다 챙겼어'로 아이 행동을 단정해서 고쳤습니다.
- **묻는 꼴은 쓰지 않았습니다.** 한 턴에 물음이 둘이면 3단계 아이가 어느 물음에 답할지 헷갈립니다. 예 · 아니요로 받쳐 주는 몫은 쉬운 질문이 이미 맡고 있습니다.
- **낱말 범위**: 후보였던 moon(6) · night(4) · dark(3단계 단원 2) · dirty · yum(vocab 밖) · bread(4) · wet(6) 은 범위 밖이라 뺐습니다. 새로 쓴 낱말은 모두 1~2단계 낱말입니다(rice · fish · lunch · sun · hot · sandwich · cold · water · star · out · dish · food · duck · top · bag · car · red · kite).

## 3. 할 것 2: 인사 끝 문장

카드에는 인사 끝 문장 칸이 없습니다(`TalkCardSchema` 의 greeting 은 questions 나 firstLine 뿐입니다). 인사 끝 말은 AI 턴이 씁니다(02-2 169줄, 고칠 곳은 프롬프트이며 13절 C202 (4) 몫입니다). 카드의 인사 질문 'Hello, {NAME}! How are you?' · 'Hi, {NAME}! How are you?' 와 끝인사 'You are great!' · 'You are very good!' 은 그대로 두었습니다. 'Let's' 는 3단계 단원 4 요소라 카드 글에는 쓸 수 없습니다(브리프 8절).

## 4. 검증 결과(p13d, Node 24 서브셸)

| 검사 | 결과 | 출력 |
|---|---|---|
| `pnpm seed:validate --areas talk`(고친 뒤 · 끝에 한 번 더) | exit 0 · 칸 28 · 통과 28 · 실패 0 · 경고 5 · 규격 파일 오류 0. 경고는 `talk-unit-incomplete` 하나와 `unit-goals` 넷으로 카드 검토(task-talk-4c-review.md 1절) 때와 같습니다 | `cards-fix-1/validate-final.txt` |
| 전후 대조(항목 21개) | en 이 바뀐 항목은 12개입니다. 열쇠 · targets · 쉬운 질문 · hints · 답 예시가 달라진 항목은 0개입니다 | `cards-fix-1/keys.py` |
| 14절 스스로 확인(브리프 564~744줄, 검토자 사본과 같음) | '스스로 확인 걸림 없음'. 같은 질문 열쇠는 카드마다 가장 많은 수가 1 입니다(배정 1 · 다지기 6) | `cards-fix-1/selfcheck.txt` |
| 카드 검토 추가 검사(`talk3-cards-review/tools/extra.py`) | 걸림 0. 가장 긴 문장은 7낱말이고, 글의 단원 단어는 unitWords 와 같습니다 | `cards-fix-1/extra.txt` |
| 12절 예시 카드 다시 검증(규격 파일 사본에 그 카드 하나) | exit 0 · 칸 오류 0 · 칸 경고 0(단원 단위 `talk-unit-incomplete` 하나는 카드 한 장이라 나옴) · 스스로 확인 걸림 없음 | `cards-fix-1/validate-example.txt` · `selfcheck-example.txt` |
| 8절 질문 꼴 표 | 25행 열쇠는 그대로이고 모두 다릅니다. 열쇠 칸과 질문의 마지막 물음표 문장도 맞습니다 | — |

출력 파일은 모두 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/` 아래에 있습니다.

단계표 대조 결과는 다음과 같습니다. 3단계(Pre-A1) 질문 글은 두 문장 이하이고, 문장은 7낱말 이하입니다. 명령문 · There is · Let's · 3인칭 -s · 진행형은 없습니다(브리프 8절). 쓰기 1~3단계 규칙과는 닿지 않습니다.

## 5. 브리프 고친 줄(`seed/prompts/talk-3.md`, 줄 수 810 그대로)

| 줄 | 고친 것 |
|---|---|
| 142(5절 홀로 뜻이 통함) | ○ 예를 'The stars are out! What do you do in your bed?' 로 바꿨습니다. '앞 문장은 물건 · 장면 말로 쓰고, 아이 상태 · 행동 단정(You are thirsty. · You play in the sun. · You have a kite.)과 알림 · 명령(Lunch is ready!)은 쓰지 않는다'와 그 까닭(낱말 맞히기처럼 들림, 13절 C202 (3) · (7) 잠정)을 더했습니다 |
| 146(같은 질문) ※ | 같은 열쇠 예를 'Sandwiches for lunch! What do you do?' 와 'Oh, cold water! What do you do?' 로 바꿨습니다 |
| 170(더 이야기할 거리) ※ | ○ 예를 'Oh, cold water! …' 로 바꾸고 '앞 문장은 필수 질문과 같이 물건 · 장면 말로'를 더했습니다 |
| 292(8절 선생님 질문 행) | 앞 문장 예를 물건 · 장면 말로 바꾸고 단정 · 알림 금지 한 문장을 더했습니다. 예 칸 첫 예도 바꿨습니다 |
| 309(질문 꼴 표 머리) | '앞 문장은 모두 물건 · 장면 말이고 아이 상태 · 행동을 단정하지 않는다'를 더했습니다 |
| 313 eat · 314 drink · 318 sleep · 325 make | Sandwiches for lunch! · Oh, cold water! · The stars are out! · Oh, sand! |
| 329 rain · 331 wind · 337 air ※ | A big umbrella! · A red kite! · Up on a mountain! |
| 425 · 455 · 460 · 461(12절 예시 카드) ※ | 필수 3 · 더 1 · 더 2 의 앞 문장(en · ko)을 바꾸고, 설명 줄에 '넷째 판에서 다시 돌림'을 적었습니다 |

※ 표시는 브리프가 정한 줄(142 · 292 · 309~325) 밖입니다. 같은 꼴을 처방하는 줄이 남으면 넷째 판 안에서 규칙과 예가 어긋나고, 생성자가 예를 따라 할 수 있어서 함께 고쳤습니다. 12절 예시 카드는 고친 뒤 위 4절처럼 다시 검증했습니다. 0절 '만든 날' 행과 17절 제안 모음은 고치지 않았습니다(판 기록은 README 에 있습니다).

## 6. 근거가 약한 항목 · 프리뷰에서 들어 볼 곳

1. **다지기 6 필수 6 'Up, up, to the top!'** 은 'walk' 를 빼서 산을 떠올리는 힘이 약할 수 있습니다. high(3단계 단원 3) · tall 같은 낱말 없이 꼭대기만으로 산을 가리킵니다. 아이가 다른 곳을 말해도 알맞은 응답이면 기회가 됩니다.
2. **배정 1 필수 2 'The sun is hot!'** 은 목마름을 단정하지 않고 날씨로 돌려 말합니다. 그래서 drink 를 끌어내는 힘은 'You are thirsty.' 보다 약할 수 있습니다. 질문 문장의 'with the juice' 가 받쳐 줍니다. 같은 카드 필수 5 'The sun is down.' 과 'The sun is' 가 겹칩니다.
3. **배정 1 더 4 · 다지기 6 더 2**: 'Many dishes on the table! … with the dishes?' 는 dishes 가 두 번 나옵니다. 'Oh, the sun is down!' 은 배정 1 필수 5 와 장면이 같습니다. 같은 질문 셈은 카드 안에서만 하므로 검증에는 걸리지 않고, 다지기의 되풀이로 보았습니다.

## 7. 결정 필요(컨트롤러)

1. **개정 4 와 generation 칸.** 적재 판 규칙(`version-pick.ts` 의 version-content-changed)을 지나려고 두 카드의 `revision` 을 4 로 올렸습니다. `generation` 은 셋째 판 해시(44689dd5…)를 그대로 가리킵니다. 생성 뒤 손으로 고친 카드라 그대로 둘지, `method: "human"` 으로 바꿀지 정해 주세요. 나머지 24장을 넷째 판으로 만들 때 이 두 장은 14절 고정 카드로 붙입니다(정규화 해시는 revision · generation 을 빼고 셉니다).
2. **14절 스스로 확인에 단정 꼴 검사를 더할지.** 지금은 사람 눈으로만 막습니다. 'You are + 형용사.' · 'You have ' · ' is ready!' 를 앞 문장에서 찾는 몇 줄이면 됩니다. 판이 한 번 더 바뀌므로 다음 판 고침 목록(M-2 와 같은 자리)에 두기를 권합니다.
3. **프리뷰 두 장을 손 고침으로 둘지.** 정한 것 16 은 판이 바뀌면 처음부터 만든다고 했습니다. 이번에는 브리프(D5 (가) · C202 (7))대로 두 장은 손으로 고쳤습니다. 나머지 24장은 넷째 판으로 새로 만듭니다.

## 근거 한 줄

13절 C202 (3) · (7)(컨트롤러 잠정), `task-talk-design-gap.md` 5.1 3 · 8 과 6절 D5 (가), 정본 02-2 190줄(질문 글 두 문장 · 홀로 뜻이 통함)을 따랐습니다. CEFR 보충판(2020) Pre-A1 구어 상호작용 서술자 '자신과 일과에 관해 짧은 정형 표현으로 묻고 답할 수 있다'에 맞춰, 답을 정해 주는 단정 대신 장면만 주고 아이가 일과를 답하게 했습니다(서술자는 기억으로 옮겨서 확인 정도는 중간입니다).
