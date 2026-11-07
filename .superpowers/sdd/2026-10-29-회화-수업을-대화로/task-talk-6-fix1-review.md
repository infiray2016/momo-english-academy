# 재검토 보고: 회화 plan 묶음 6 fix 1(범위 한정)

검토자: rev-talk-6(Opus · xhigh, 읽기 전용) · 2026-10-30 10:0x · 작업 트리 `.claude/worktrees/p13d`
본 것: 고침 보고 `task-talk-6-fix1.md`, 고친 뒤 `src/core/ai/calls/talk-lesson.ts`(1503줄) · `tests/unit/talk-lesson-call.test.ts` · `tests/fixtures/ai/talk-lesson-inputs.ts` · 표본 18개 · `tests/contract/ai-schemas.test.ts` v2 갈래. 지난 지적(`task-talk-6-review-report.md`)만 판정한다.
확인 방법: 시험은 다시 돌리지 않았다. 지난번 스크래치패드 probe 를 고친 모듈로 다시 돌렸고, 새 의심 하나는 묶음 5 의 실제 계획 함수로 probe 했다(`scratchpad/probe6/probe2.ts`, 작업 트리에 쓰지 않음).

## 판정: Changes requested(fix 라운드 1/3 — 새 Important 1 · 새 Minor 1)

지난 지적 일곱은 모두 ADDRESSED 다. 다만 I-3 을 고치며 1~3단계 고정부에 더한 문장 하나가 받침 둘째의 AI 차례(카드 쉬운 질문이 없는 AI 질문 자리)에서 정본 02-2:260 과 어긋난다(N-1). 고칠 몫은 고정부 문장 하나와 시험 둘이다.

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 막힘 계획 | ADDRESSED | `talkCallTurnOf`(talk-lesson.ts:377-438)가 묶음 5 의 `TeacherTurnPlan` 을 형 그대로 받아(:22 type import) 한 곳(`callPlanOf` :356-373)에서 옮긴다. 원천 칸 이름은 묶음 5 그대로이고(kind · aiAsks · stage · cause · stuckQuestion · answerFallback · attach · chances · followRun · turnsLeft · app), 호출 쪽 이름 셋(supportStage · stuckAnswer · cardLine)은 이 함수에서만 바뀐다. 말 입력이고 ifStuck 이 있을 때만 막힘 계획을 싣고(:401-402), 사용자 메시지에 'If stuck, ' 다섯 줄을 넣는다(:827-835 · :870-871). 고정부 'Decide stuck first …'(:678)와 `chosenCallTurnOf`(:442-448)로 정규화(:1166-1171)와 걸린 칸 바꾸기(:1436-1439)가 고른 계획을 따른다. 1~3단계에서 막힘 계획(카드 자리)을 고르면 aiTurn · asks 가 거짓이라 AI 따라 할 말 · 선택지 · 다음 질문 칸이 비고, 카드 답 소리와 겹치지 않는다. 시험은 묶음 5 의 `teacherTurnPlansOf` 실제 계획으로 이 길을 본다(test:906-938, 표본 l3-speech-stuck · l3-speech-answered · l4 둘). 막힘이면 아이가 보인 능력 · 미션을 받지 않는 것도 3.8 '막힘이 아니고'와 맞다 |
| I-2 질문 없는 AI 차례 | ADDRESSED | `aiAsks`(:172)와 'Question: yes/no' 줄(:830), 고정부 'When Question: no, do not ask any question'(:680), tori_en 설명 'On AI turns with Question: yes …'(:476)가 들었다. `asksNext`(:451-459)가 AI 차례 · aiAsks · 평가 대화 밖 · 바닥선 밖 · 인사 끝 밖일 때만 갈래 · 카드 항목 · 노린 목표 · 힌트 · 선택지를 남긴다. 지난 probe 를 다시 돌리면 인사 끝 · 바닥선이 `none {"kind":"none","no":0} [] [] []` 이다. 4단계 같이 말하기는 묶음 5 계획에서 aiAsks 거짓으로 옮겨지고 칸이 빈다(test:940-956). 묻지 않은 필수 질문이 '다룸'이 되는 길도 막혔다. 인사 끝 행은 정규화가 card_item 을 none 으로 내므로 move.item 이 none 이 되고(묶음 5 teacherMoveOf), 받침 첫째 행은 받침 move 라 셈(chances.ts opensSlot)에 들지 않는다 |
| I-3 1~3단계 받침 표본 · 고정부 | ADDRESSED(새 문제 N-1 하나) | 1~3단계 카드 자리 규칙(:712)과 4단계부터 규칙(:722)이 02-2:259-261 의 두 열과 맞다. 4단계부터는 첫째 답 예시를 tori_en 에, 둘째는 쉬운 영어로 다시 묻고, 셋째 · 들리지 않음은 답 뒤 다음 이야기다. 표본 넷(l3-support-together · easy · close · nospeech)이 카드 자리이고, 기대는 model_line '' · choices 0 · 갈래 none 이다. 계약 새 시험(ai-schemas.test.ts:496-516)이 다섯 표본에서 이를 본다. C194 (1)은 묶음 5 실제 계획으로 '1~3단계 들리지 않음 닫기 = 카드 줄 있는 카드 자리'를 보인다(test:834-840). 4단계 길은 표본 l4-support-together · l4-nospeech 가 덮는다 |
| M-1 | ADDRESSED | 꺼낸 새 단어를 tori_en 과 AI 의 원래 model_line 으로 먼저 거르고(:1180-1185), 대체 글은 거른 목록에서 고른다(:1191). probe 결과 `new_words: [] model_line: ''`. 시험이 막는 쪽 · 통과하는 쪽을 함께 본다(test:983-998) |
| M-2 | ADDRESSED | 1~3단계 '질문은 tori_en 의 마지막 물음표 문장, 신호 말은 그 뒤에 와도 됨'(:711)과 tori_en 설명(:476). 묶음 5 fix 1 의 '그 차례의 질문 = 마지막 물음표 문장' 읽기와 맞다 |
| M-3 | ADDRESSED | 선택지 노리는 단어 = 정규화한 next_targets + 정규화한 card_item 의 targets(:1194-1197). 카드 항목이 없으면 그대로 비우는 쪽도 시험한다(test:1011-1028) |
| M-4 | ADDRESSED | 첫 두 줄을 05:31 블록 문장 글자로 비교한다(test:174-178) |

## 2. 고침이 새로 들인 것

**N-1(Important). 1~3단계의 'When Turn is ai after a stuck or nospeech turn, put the answer to say in model_line'이 받침 둘째의 AI 차례에도 걸린다.**
- 무엇: talk-lesson.ts:712 의 1~3단계 규칙은 'in support turns and after nospeech the app plays the answer and adds the easier or next question'으로 시작해, 'When Turn is ai after a stuck or nospeech turn, put the answer to say in model_line'으로 끝난다. 묶음 5 stuckPlan 은 막힌 질문이 카드 항목 없는 AI 질문(이어 묻기 · 따라가기 · 꺼내기)이면 쉬운 질문을 카드에서 가져올 수 없어(slotOf 의 easyQuestion null) 받침 둘째를 `aiAsks` 참인 AI 차례로 낸다. probe2: 3단계에서 AI 이어 묻기 'Who do you play with?' → 단추 → 받침 첫째(카드 자리) → 단추 다음 계획은 `ai aiAsks true stage 2 easyFallback null attach []` 이고, 메시지는 'Turn: ai | Question: yes | Card line: - | Support stage: 2'다.
- 왜: 정본 02-2:260 받침 둘째는 '같은 질문을 다시 묻지 않고 쉬운 질문(예 · 아니요 또는 선택지)으로 바꿔 묻는다'이고, 답을 들려주는 것은 첫째 · 셋째(02-2:259 · 261)다. 이 턴에서 선생님은 '쉬운 질문'(:679)과 '답을 model_line 에'(:712)라는 두 지시를 함께 받는다. 첫 문장의 '앱이 답과 쉬운 질문을 붙인다'도 이 AI 차례에서는 사실이 아니다. 답을 model_line 에 쓰면 정규화가 AI 차례 소리 줄로 남기므로(:1188-1192), 아이는 쉬운 질문 대신 답을 따라 하게 된다. 새 흐름에서 AI 차례가 기본이라 이어 묻기 질문에서 두 번 막히는 일은 드물지 않다(02-2:184 '이어 묻는 질문을 talk.follow_up_min_every_turns 턴에 하나 이상').
- 어떻게: 첫 문장은 'When Turn is card_slot in support turns or after nospeech, the app plays the answer and adds the easier or next question; write only a short reaction or cue'로 카드 자리에 묶는다. AI 차례 문장은 단계마다 나눈다: 'Question: no(같이 말하기)면 답을 model_line 에', 'Support stage 2 면 답을 주지 말고 쉬운 예 · 아니요 질문을 하거나 choices 에 고르기 답 둘', 'Support stage 3 · nospeech 면 답을 model_line 에'. 시험 둘: (1) 1~3단계 고정부에 단계 2 문장이 있고 '답을 model_line 에'가 단계 2 에 걸리지 않음, (2) probe2 와 같은 묶음 5 계획(3단계 · AI 이어 묻기에서 두 번 막힘)을 talkCallTurnOf 로 옮기면 kind ai · aiAsks 참 · Support stage 2 이고, 그 응답의 choices 둘(같은 꼴 · 카드 항목이 없으니 next_targets 로 노리는 단어)이 정규화를 지남.

**N-2(Minor). 'When Question: no … (with the answer to say together, …)'(:680)의 괄호가 1~3단계 카드 자리 규칙 'Do not write the answer'(:712)와 부딪친다.** 카드 자리도 aiAsks 거짓이라 두 줄이 한 턴에 함께 걸린다. 1~3단계의 tori_en 영어 금지(:713)와 서버 겹침 없애기(C125)가 막아 주므로 Minor 다. 괄호를 '(4단계부터 같이 말하기면 답 예시를 함께)'로 좁힌다.

## 3. 구현자 남은 우려

1. attach 의 question 줄 꼴에 기대는 `cardLineOf`(:342-353): 받아들일 만하다. `TeacherTurnPlan` 을 형으로 가져오므로 role · item · en 이름이 바뀌면 tsc 가 잡는다. 붙이는 질문 줄이 둘 이상인 계획은 지금 묶음 5 에 없다(첫 줄만 읽음). 5-나 · 묶음 7 뒤 tsc 전체를 다시 보는 계획 그대로 둔다.
2. 바닥선을 계획 app 의 floor 로 읽음(:434): 받아들일 만하다. 지금 묶음 5 의 어느 계획도 app 에 floor 를 넣지 않아 첫 프리뷰에서는 늘 거짓이다. 바닥선 정의는 둘째 묶음(정한 것 17, 묶음 16) 몫이다. 묶음 16 브리프에 '바닥선 계획 칸을 정하면 talkCallTurnOf 의 floor 한 줄을 그 칸으로'를 적는다.
3. (보고 우려 3) 1~3단계에서 붙일 기회가 전혀 없는 닫기 · 들리지 않음의 AI 차례: 받아들일 만하다. 묶음 5 의 `oldestMoreOf` 는 더 이야기할 거리가 모두 같은 질문 상한에 걸릴 때만 null 이라(chances.ts 231-255줄) C194 (1) 아래에서는 매우 드문 길이다. 그 길에서 '답 소리가 새 질문 뒤'인 차례 문제가 남는다는 사실은 장부의 '구현하며 확인할 것'에 둔다. 다만 N-1 을 고칠 때 셋째 · 들리지 않음 문장은 이 길을 위한 것이라 남긴다.

## 4. 범위 밖 관찰

- 막힘 계획의 사용자 메시지에는 'Turns left before closing question'이 답함 계획의 값으로 든다(talkCallTurnOf 가 plan.turnsLeft 만 씀). 막힌 차례는 말 주고받기에 들지 않아 막힘 계획에서는 하나 더 크다. 참고 정보라 흐름에는 닿지 않는다.
- 흐름 쪽 형(lesson-flow.ts:7 등)은 아직 옛 `calls/talk.ts` 의 TalkTurnSegment · TalkInputMode 를 쓴다. 보고 '묶음 3 뒤 할 것' 1 대로 묶음 12 전에 바꾼다.

## 5. 라운드 판정

Changes requested. fix 2 범위는 N-1(고정부 1~3단계 문장 하나 · 시험 둘)과 N-2(괄호 한 곳)다. 둘 다 talk-lesson.ts 와 단위 시험 안이라 다른 묶음의 잠금과 겹치지 않는다. N-2 는 컨트롤러가 직접 고쳐도 된다.
