# 묶음 1 fix 1 범위 한정 재검토 — rev-1-fix1

검토자: code-reviewer(Opus xhigh) · 2026-11-07 · 지난 보고 `task-rev-1-report.md` 의 I-1 · M-1~M-3 과, 고침이 만든 새 어긋남만 봤다. 묶음 2 · 4 파일 탓의 붉은 시험은 판정에서 뺐다. 시험은 다시 돌리지 않았고, 의심 하나를 스크래치패드 스크립트 둘로 확인했다(`rev1f1-greet-probe.ts` 지금 코드 · `rev1f1-greet-probe-head.ts` HEAD 흐름 사본).

## 라운드 판정: 수정 필요 (fix 라운드 1/3 · 새 Important 1)

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 AI 둘째 인사 자리의 답 예시 | ADDRESSED(그러나 새 퇴행 N-1) | lesson-flow.ts:209~217 greetingAnswerOf 가 차례 번호 대신 질문 열쇠로 카드 인사를 찾고, slotOf(219~242)는 맞는 것이 없으면 행 답 예시를 쓴다. talk-ai-scope-flow.test.ts:355~401 이 AI 답 "I eat rice." ≠ 카드 답 "Yes, I do." 로 두 길을 가른다 |
| M-1 'Listen to this one.' 예 | ADDRESSED | talk-lesson.ts:865~870 close 예 셋에 Listen 꼴이 없고, talk-ai-scope-prompt.test.ts:209 가 그것을 본다 |
| M-2 장면 문장 빠짐 | ADDRESSED | lesson-flow.ts:364~372 가 장면 행이면 sceneOpener.question.en 전체를 넘긴다. appAsked.en 은 사용자 메시지 줄(talk-lesson.ts:1192~1194)에만 쓰여 열쇠 대조에 닿지 않는다(grep 확인) |
| M-3 '안에 돌아오라' 줄 | ADDRESSED | talk-lesson.ts:927~930 이 1~3 에서만 '아이 이야기 먼저 · 돌아오는 때는 앱이 알림' 줄을 쓰고, 4단계 줄은 옛 글과 글자까지 같다(골든 shasum 그대로라는 보고와 맞음) |

## 2. 고침이 새로 깨뜨린 것

### Important
**N-1. 시드 꼴 인사 질문(앞 문장이 붙은 질문)에서 카드 인사 답을 못 찾아, 인사 받침 첫째 소리 줄과 들리지 않음 닫기 답 소리가 사라진다.**
- 어디: `src/core/conversation/lesson-flow.ts:212~215`. 행 쪽은 `turnQuestionOf` 의 마지막 물음표 문장("How are you?")을 쓰고, 카드 쪽은 `questionKeyOf(q.question.en)` 로 글 전체("hello name how are you")를 열쇠로 만든다.
- 왜: 지금 적재된 3단계 회화 단원 1 카드의 인사 질문은 "Hello, {NAME}! How are you?" · "Hi, {NAME}! How are you?" 로 두 문장이다(`seed/lessons/talk/3/1.json`). 운영에서 앱이 붙인 인사 행의 답 예시는 AI 질문 기록(ai_question)에서만 오므로 비어 있다(lesson-turns.ts:59 · state.ts:630). 그래서 대체 값도 없다.
- 확인(같은 카드 꼴 · 같은 행):

| 입력 | HEAD 흐름 | fix 1 뒤 |
|---|---|---|
| 첫 인사 뒤 '모름' | card_slot 받침 1 · 소리 줄 "I'm good." | ai 차례 · 붙일 줄 없음(자리 답 null) |
| 첫 인사 뒤 들리지 않음 | 소리 줄 "I'm good." + 다음 인사 질문 | 다음 인사 질문만(답 소리 없음) |

- 정본 02-2 받침 표(첫째 '같이 말하기'는 앱이 카드 답 예시 소리를 들려줌)와 들리지 않음 닫기(답을 한 번 들려줌)에서 벗어난다. 지금 아이에게 닿는 길이다. 시험 카드(CARD3)의 인사 질문에는 앞 문장이 없어 시험이 이 차이를 잡지 못한다.
- 어떻게: 카드 쪽 열쇠를 `cardQuestionKeyOf(q.question.en)`(마지막 물음표 문장, isSceneRow 가 이미 씀)로 바꾼다. 시험 하나를 더해 인사 질문이 "Hello, {NAME}! How are you?" 꼴인 카드에서 '모름' → card_slot 받침 1 · 카드 답 소리, 들리지 않음 → 답 소리 + 다음 인사를 단언한다.

## 3. 범위 밖 관찰(HEAD 부터 있던 것 · 묶음 2 가 고치는 파일)
- 서버 `greetingHintItemOf`(lesson-turn.ts:438~456, HEAD 445~447 과 같음)도 `questionKeyOf(g.question.en)` 로 견주어, 위 시드 꼴 인사 질문에서 카드 인사 힌트를 못 찾는다. 앱 인사 행에는 AI 힌트도 없으므로 3단계 인사 자리의 '힌트' 단추가 비어 있을 수 있다. 코드 읽기로만 본 것이고 화면에서 확인하지 않았다. 묶음 2 가 같은 고침(cardQuestionKeyOf)을 넣고, 흐름 답 예시와 같은 질문을 가리키는지 짝 시험을 두면 된다(지난 보고 5절 5 와 같은 자리).
