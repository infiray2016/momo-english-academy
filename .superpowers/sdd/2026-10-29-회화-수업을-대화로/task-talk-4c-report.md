# 회화 3단계 단원 1 첫 프리뷰 카드 두 장: 생성 보고(task-talk-4c)

브리프 `seed/prompts/talk-3.md`(셋째 판) 16절 보고 꼴대로 적습니다. 검증 원본 JSON 은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/talk3-validate-1.json` 에 있습니다.

```
상태: DONE
모델 ID: claude-opus-5-5 · effort: xhigh
파일: seed/lessons/talk/3/1.json(워크트리 p13d) · 카드 2(새로 2 · 고정 0 · 정규 2 · 보강 0) · 14,632바이트
시각: 시작 2026-11-05 14:48:38 · 끝 15:42:37 · 54분
고정 카드: 해당 없음((가) 호출이라 붙이기 명령을 돌리지 않음)
첫 검증: 칸 28(talk 영역 전체 수, 이 파일만의 칸 수는 출력에 따로 없음) · 통과 28 · 오류 칸 0 · 규칙별 오류 0 · 단원 단위 오류(talk-known-days · remedial-coverage) 0 · 경고: 이 파일 1(talk-unit-incomplete) · 영역 전체 5(나머지 넷은 unit-specs.json 의 unit-goals)
고침: 0회(generation.retries 없음)
스스로 확인 명령: 첫 결과 걸림 0 · 마지막 '스스로 확인 걸림 없음'
카드마다: 배정 1 · 변형 1 = 필수 5(처음 5 · 다시 0) · 더 5 · 짧은 준비 eat · drink · go · 카드 goals [talk-3-1-1]
          다지기 6 · 변형 1 = 필수 6(처음 0 · 다시 6) · 더 5 · 짧은 준비 없음 · 카드 goals [talk-3-1-1, talk-3-1-2]
목표 기회(변형 1): talk-3-1-1 15 · talk-3-1-2 6
단원 덮기: 해당 없음(두 장 호출. 검증기는 talk.known_days 에 못 미친 단원 단어 20개를 경고로만 냄)
보강 덮기: 해당 없음(보강 카드 없음)
같은 질문: 카드마다 가장 많이 나온 마지막 물음표 문장 열쇠 1번(상한 2) · 장면 없는 What do you do? 0
인물: 이름이 나온 카드 0 · 그 가운데 Momo 카드 0 · 쓴 이름 없음
선생님: 선생님 이름 · 토리 · {TEACHER} 0 · 선생님 삶 문장 0
스스로 확인: 14절 1~9 · 11~14 확인함 · 10 은 '전부일 때' 항목이라 해당 없음(다지기 6 에 배정 1 동사 다섯이 모두 다시 나오는 것은 확인함)
근거가 약한 곳 · 브리프로 풀리지 않은 것: 아래 '우려' 절
```

## 카드 1: 배정 1 · 변형 1 '가족과 호수 나들이'

| 칸 | 내용 |
|---|---|
| 목표 | [talk-3-1-1]. 새 단어가 모두 동사라 항목 열 개가 모두 이 목표를 노립니다 |
| 카드 주제 | 주말에 하는 일 · 가족과 호수 나들이 |
| 오늘 쓸 말 | eat · drink · go · come · wash(배정표 차례). 동사 그림 다섯은 쪽지에만 두었고 들려줄 말은 `I eat.` 꼴입니다 |
| 짧은 준비 | eat · drink · go(필수 1~3번이 노리는 낱말). come · wash 는 대화 중에 꺼내도록 예상 흐름 셋째 줄에 적었습니다 |
| 인사 | `Hello, {NAME}! How are you?` → `I am fine.`(틀 `I am ___.`) |

| 갈래 · 번호 | 노리는 낱말 | 질문 | 답 예시(= 영어 문장 힌트) | 쉬운 질문 | 그림 |
|---|---|---|---|---|---|
| 필수 1 | eat | Lunch is ready! What do you do at the table? | We eat rice and fish. | Are you hungry? | 없음 |
| 필수 2 | drink | You are thirsty. What do you do with the juice? | I drink the juice. | Do you like juice? | 없음 |
| 필수 3 | go | With your family, what do you do? | We go to the lake. | Do you like the lake? | 없음 |
| 필수 4 | wash | Sand on your hands! What do you do with water? | I wash my hands. | Do you like sand? | 없음 |
| 필수 5 | come | The sun is down. What do you do now? | We come home. | Are you tired? | 없음 |
| 더 1 | eat | Your family is hungry. What do they do at the lake? | They eat sandwiches. | Do you like sandwiches? | 없음 |
| 더 2 | drink | You play in the hot sun. What do you do with your cup? | I drink cold water. | Do you like cold water? | 없음 |
| 더 3 | go | You are very sleepy. What do you do in your room? | I go to bed. | Are you sleepy? | 없음 |
| 더 4 | wash | You help your family. What do you do with the dishes? | I wash the dishes. | Do you help your family? | dish |
| 더 5 | come | You have food for the ducks. What do the ducks do? | They come to me. | Do you like ducks? | duck |

받침 줄은 같이 말하기(답 예시) → 쉬운 질문(표의 예 · 아니요 질문) → 닫기(답 예시를 한 번 들려줌) 차례입니다. 영어 틀은 답 예시에서 노리는 낱말 자리를 `___` 하나로 바꾼 꼴입니다(예: `We ___ rice and fish.`). 정리 대사 다섯 줄이 오늘 쓸 말 다섯을 하나씩 담고, 끝인사는 `Bye, {NAME}! You are great!` 입니다. 처음 묻는 질문에는 그림을 두지 않았습니다.

## 카드 2: 다지기 6 · 변형 1 '바닷가와 산 나들이'

| 칸 | 내용 |
|---|---|
| 목표 | [talk-3-1-1, talk-3-1-2]. 동사 항목 5 · 명사 항목 6이고, 한 항목에는 한 갈래만 둡니다 |
| 카드 주제 | 주말에 하는 일 · 가족과 바닷가 · 산 나들이 |
| 오늘 쓸 말 | `[]`(앱이 노리는 낱말 가운데 아직 '안다'가 아닌 것을 골라 보입니다) |
| 짧은 준비 | 칸 없음 |
| 인사 | `Hi, {NAME}! How are you?` → `I am happy.`(틀 `I am ___.`) |

| 갈래 · 번호 | 노리는 낱말 | 질문 | 답 예시(= 영어 문장 힌트) | 쉬운 질문 | 그림 |
|---|---|---|---|---|---|
| 필수 1 | eat | You are hungry. What do you do on the mountain? | We eat sandwiches. | Are you hungry? | 없음 |
| 필수 2 | sea | Whales and dolphins! Where do they swim? | They swim in the sea. | Do you like whales? | whale |
| 필수 3 | wash | Sand on your feet! What do you do in the sea? | I wash my feet. | Is the water cold? | 없음 |
| 필수 4 | beach | Sand and shells! Where do you play? | We play at the beach. | Do you like shells? | shell |
| 필수 5 | drink | It is hot at the beach. What do you do with cold juice? | I drink cold juice. | Do you like juice? | 없음 |
| 필수 6 | mountain | You walk up and up. Where are you? | I am on the mountain. | Do you like big trees? | 없음 |
| 더 1 | go | Your bag is ready! What do you do with your family? | We go to the sea. | Do you have a bag? | 없음 |
| 더 2 | come | You are cold and tired. What do you do now? | We come home. | Are you cold? | 없음 |
| 더 3 | sea | An octopus and a fish! Where are they? | They are in the sea. | Do you like fish? | octopus |
| 더 4 | mountain | Big rocks and tall trees! Where do you climb? | We climb the mountain. | Do you like big rocks? | 없음 |
| 더 5 | beach | You have a kite. Where do you run? | I run on the beach. | Do you like kites? | 없음 |

동사 질문 셋(필수 1 · 3 · 5번)은 질문 안에 mountain · sea · beach 를 넣어, 명사 항목보다 먼저 그 낱말을 들려줍니다. 배정 1 의 동사 다섯이 모두 다시 나옵니다(eat · wash · drink 는 필수 질문, go · come 은 더 이야기할 거리). 노린 횟수는 동사마다 1번, 명사 sea · beach · mountain 은 각 2번입니다. 명사 항목의 쉬운 질문은 모두 예 · 아니요 꼴이고 답 예시는 다섯 낱말 이하입니다. 정리 대사 다섯 줄이 노린 낱말 여덟 개를 모두 담고, 끝인사는 `Goodbye, {NAME}! You are very good!` 입니다.

## 다시 만든 횟수와 까닭

다시 만든 횟수는 0회입니다. 스스로 확인 명령은 첫 회에 걸림이 0이었습니다. 첫 검증도 오류가 0이었고, 이 파일의 경고는 두 장 호출이라 나오는 것이 맞는 `talk-unit-incomplete` 하나뿐이었습니다. 그래서 고친 칸이 없고 `generation.retries` 를 두지 않았습니다.

## 우려(근거가 약한 곳 · 브리프로 풀리지 않은 것)

1. **come 질문의 시점이 약합니다.** 배정 1 필수 5번(`The sun is down. What do you do now?` → `We come home.`)은 8절 표의 제안 그대로입니다. 그런데 호숫가에 있는 아이에게는 `We go home.` 이 더 자연스러운 답입니다. 회화는 채점하지 않으니 수업이 막히지는 않지만, come 을 스스로 쓰게 하는 기회로는 약합니다. come 을 자연스럽게 끌어내는 자리는 더 이야기할 거리 5번(오리 먹이 → `They come to me.`)입니다.
2. **동물을 주어로 둔 talk-3-1-1 항목이 하나 있습니다.** 배정 1 더 이야기할 거리 5번은 오리가 하는 일이라 목표 글 '나나 가족이 하는 일'에서 조금 벗어납니다. 답 예시 첫머리(They + 동사)는 맞고 스스로 확인도 통과했습니다. 요청자가 목표 글을 좁게 읽으면 가족 장면으로 바꿔야 합니다.
3. **8절 표의 질문 글을 그대로 쓴 자리가 있습니다.** 배정 1 필수 3 · 4 · 5번(go · wash · come)은 8절 '질문 꼴' 제안의 질문 글과 같습니다. 12절 예시 카드는 옮기지 않았습니다.
4. **끝인사에 관한 두 규칙이 엇갈립니다.** 5절 표와 12절 예시는 `Bye, {NAME}! Have fun!` 을 보이지만, 8절은 명령문을 쓰지 않는 꼴로 둡니다. 그래서 명령문이 아닌 `You are great!` · `You are very good!` 으로 썼습니다. 브리프 다음 판에서 어느 쪽을 따를지 정하면 좋겠습니다.
5. **sleepy 가 sleep 을 미리 보인 것으로 읽힐 수 있습니다.** 배정 1 더 이야기할 거리 3번의 `sleepy` 는 2단계 낱말이고 sleep(배정 2)의 활용형이 아니어서, 검증기 `relation-early-use` 에 걸리지 않았습니다. 사람 검토에서 미리 보인 것으로 보면 `tired` 로 바꿀 수 있습니다.
6. **다지기 6 의 명사 부담이 있습니다.** 프리뷰 아이는 sea · beach · mountain 을 처음 듣습니다. 쉬운 질문을 예 · 아니요로 두고 그림(whale · shell · octopus)을 세 항목에 붙였지만, '어디' 질문은 답이 여럿일 수 있습니다(예: 연 → 공원). 이런 자리는 영어 틀이 받쳐야 합니다.
7. **이 파일만의 칸 수는 알 수 없습니다.** 검증 출력의 '칸 28'은 talk 영역 전체 수이고, 파일별 칸 수는 summary · stats 에 따로 나오지 않습니다. stats 의 회화 3단계 단원 1 문장 길이는 평균 4.02낱말 · 범위 1~7 입니다.
