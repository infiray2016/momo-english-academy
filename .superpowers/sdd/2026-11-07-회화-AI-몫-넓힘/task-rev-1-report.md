# 묶음 1(흐름 · 고정부) 코드 검토 보고 — rev-1

검토자: code-reviewer(Opus xhigh) · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`(HEAD 6e86881 + 미커밋), 묶음 1 파일만 `git diff` 로 봄(스크래치패드 `rev1-diff-*.txt`). 시험은 다시 돌리지 않았고, 의심 하나를 스크래치패드 스크립트(`rev1-greet-probe.ts`)로 확인했다.

## 판정: 수정 필요 (Critical 0 · Important 1 · Minor 3)

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| 고정부 세 줄(받침 · 들리지 않음 · 인사 끝)을 1~3 에서만 바꿈, 4단계 글자 같음 | ✅ | talk-lesson.ts 지운 세 줄과 `UPPER_*` 상수 셋이 글자까지 같고, `commonRules(…, low)` 가 low 일 때만 `lowSituationRules()` 를 쓴다. talk-ai-scope-prompt.test.ts:153~157 이 고정 파일(`tests/fixtures/talk-prompt-l4-before.txt`, 4 · 5 · 10단계 시스템 + 4단계 사용자 메시지 다섯 꼴)과 `toBe` 로 대조한다 |
| '옮겨 적는 문구'(plan 26~38) | ✅ | 말 길이 · 지어낸 경험 금지 · 자기 이야기 `at most once in ${N} turns, only when it helps.` · 사용자 메시지 넷(Child said more · Come back … in this turn · Follow up … · Not heard …)이 글자 그대로다(talk-lesson.ts 1005~1015 · 1128 · 1192~1227) |
| 정본 05 6.1 표 1~3 · 1 · 2~3 행 | ✅ | 소리 줄 자리, 1단계 '자주'+고르기 답은 질문 안, 2~3 '질문만', 말 길이, 자기 이야기, 상황 차례(예 셋 이상 · 그대로 쓰지 않음 · 되풀이 않음 · 기술 문제), greeting_recall 켬일 때만, 끝인사, Follow up, 신호 말 금지가 모두 있다 |
| firstQuestionPlan(1~3 · 칸 있음 → 장면, 없으면 지금 길) | ✅ | lesson-flow.ts:922. 4단계 · 칸 없는 카드 · 대화 중 연 준비 뒤는 지금 길(시험 152~194) |
| returnNow · appAsked.scene · followUpAnswer | ✅ | lesson-flow.ts:1180(닿은 턴 AI + returnNow, 넘은 턴 카드 자리) · 814 · 359. spec 설계 3 '따라가기 상한' · 설계 5 '고정 대본 막기'와 같다 |
| greetingFallback(spec 설계 2 [M-2]) | ⚠️ | 계획 칸은 맞다(lesson-flow.ts:994). 다만 AI 가 물은 둘째 인사 자리의 답 예시가 틀린다(Important I-1). 서버 쓰기는 묶음 2 |
| childSaidMoreOf · C211 (1) | ✅ | 낱말 셋(기존 ENGLISH_SENTENCE_MIN_WORDS)과 모름 표현 거름 · 느낌 낱말 원형 대조. 프롬프트는 'Child said more' 를 둘째 문장 허용 조건으로만 쓰고, 다음 줄이 '아이가 꺼낸 이야기를 따라가는 것이 먼저'를 둔다 |
| 설정 키: 참고값 · 하한 없음 · 끔 기본 · 숫자 고정 없음 | ✅ | selfLineEvery · greetingRecall 은 고정부 글에만 쓰이고 흐름에 세는 곳이 없다. 시드 3 · "off", 시험 243 줄이 기본 끔을 본다. diff 에 새 수 글자 없음 |
| 답 자리(C205) | ✅ | keptChoicesOf 가 1~3 에서만 돌고 받침 둘째를 먼저 남긴 뒤 노리는 단어 없는 이어 묻기를 버린다(talk-lesson.ts:1596). 고정부도 받침 · 꺼내기에서만 소리 줄을 채우게 한다 |
| 기술 오류 책임(C210 · C211 (4)) | ⚠️ | diff 는 nospeech 까닭에만 Not heard 줄을 더하고(talk-lesson.ts:524), 마이크 안 잡힘 · 첫 말소리 없음 · 인식 오류 길(speech · turn 입구)은 이 묶음 파일에 없다. 유지는 파일 범위로만 확인했다 |
| AI 호출 · Zod | ✅ | 바뀐 것은 core 프롬프트 · 흐름 순수 함수뿐이고 출력 스키마는 그대로다. 계획에 더한 칸은 move 에 새지 않는다(move.ts talkMoveOf 가 칸을 하나씩 고름) |
| 장면 칸이 서버 흐름에 닿음 | ✅ | state.ts:665 의 card 가 TalkLessonSchema.parse 결과 그대로라 sceneOpener 가 LessonArgs 까지 온다 |

## 2. 잘한 점
- 4단계 불변을 고정 파일 대조로 묶었다. 생성기가 느낌 낱말 · lemmaOf 까지 넘겨 '4단계는 받아도 줄이 없음'을 함께 증명하고, 새 키를 바꿔도 4 · 5 · 10단계가 같다는 시험(176~188)도 따로 있다.
- 1~3 줄을 `plan.lowBand` 로 가둬 talkCallTurnOf 가 단계를 몰라도 서버가 4단계에 feelingWords 를 넘기는 실수를 막는다.
- 장면 행 판정을 질문 열쇠(cardQuestionKeyOf 는 마지막 물음표 문장)로 해 move 꼴을 바꾸지 않았다. 기회 셈 밖 · 같은 질문 셈 안 · 말 주고받기 셈을 한 시험(211~228)이 함께 본다.
- 옛 시험 고침이 의도한 변화로 깨진 단언만 바꿨고, 묶음 2 소유 talk-prompt-fix1 도 제목 · 기대 줄만 고쳤다(diff 확인).
- 새 시험 33개(prompt 11 · flow 22)는 상수 되풀이보다 설정값을 바꿔 보는 단언 · 4단계 부재 · 줄 차례(Input 바로 뒤 · Reason 바로 뒤)를 본다.

## 3. 지적

### Important
**I-1. AI 가 물은 둘째 인사 자리의 답 예시가 카드 둘째 인사의 답이다(받침 첫째 · 셋째 · 들리지 않음에서 다른 질문의 답을 들려줌).**
- 어디: `src/core/conversation/lesson-flow.ts:221~225`(slotOf 가 `greetingAnswerOf(ctx, greetingIndex)` 를 `row.answerExample` 보다 먼저 고름) + 994(둘째 인사를 AI 차례로 바꿈).
- 왜: 고치기 전에는 둘째 인사 행이 늘 카드 인사 질문(card_slot)이라 카드 답이 맞았다. 이제 그 행은 AI 질문이다(spec 설계 2 '아이 첫 답에 반응하고 인사 질문 하나를 쓴다'). 확인: CARD3_GREET2 에서 AI 가 "What do you eat for lunch?"(AI 답 예시 "I eat rice.")를 묻고 아이가 '모름'을 누르면, 자리 답 예시가 "Yes, I do." 이고 계획은 card_slot 받침 1 · 소리 줄 "Yes, I do." 다(스크래치패드 `rev1-greet-probe.ts` 출력). 아이에게 질문과 맞지 않는 답을 같이 말하게 하는 꼴이다. 서버 힌트(lesson-turn.ts:438~456 greetingHintItemOf)는 질문 열쇠가 카드 인사와 같을 때만 카드 힌트를 쓰므로 힌트와 답 소리도 서로 어긋난다. 지금 3단계 시드 카드는 모두 greetingTurns 1 이라 아이에게 닿지 않는다. 인사 턴 2 카드를 1~3단계에 넣는 순간 Critical 꼴이 된다.
- 시험: talk-ai-scope-flow.test.ts:350~362 는 AI 답 예시와 카드 답이 둘 다 "Yes, I do." 라 이 차이를 가르지 못한다. 제목 '그 자리 답 예시는 카드 둘째 인사의 것이다'가 오히려 틀린 동작을 묶는다.
- 어떻게: slotOf 에서 카드 인사 답은 그 행 질문의 열쇠가 그 차례 카드 인사 질문과 같을 때만 쓴다(greetingHintItemOf 와 같은 대조). 아니면 row.answerExample 을 쓴다. 시험은 AI 답 예시를 카드 답과 다르게 두고, AI 둘째 인사 뒤 '모름' → 받침 첫째 소리 줄이 AI 답 예시인지를 단언한다. greetingFallback 으로 카드 질문이 붙은 행(card_slot)은 열쇠가 같아 카드 답이 그대로 쓰인다.

### Minor
**M-1. 받침 셋째 예 'Listen to this one.' 이 같은 프롬프트의 신호 말 금지 줄과 부딪힌다.** talk-lesson.ts:866 의 예가 992 의 "Never write a cue to listen or say" 에 그대로 걸린다. spec 설계 1 받침 셋째의 '답을 들려주고 넘어간다는 말'에는 맞으므로, 금지 줄을 정본 05 6.1 의 '신호 말('Listen and say!' · 'Your turn!' 꼴)'처럼 '듣고 따라 말하라는 말'로 좁히거나 예를 "Here is the answer." 꼴로 바꾼다.

**M-2. 장면 여는 질문 답 뒤 'App question just before' 에 장면 문장이 빠진다.** lesson-flow.ts:359 가 `question ?? row.text`(마지막 물음표 문장)를 넣어, 칸 글 'Bikes and ducks at the lake! Do you ride a bike?' 가 'Do you ride a bike?' 로 줄어든다. spec 설계 5 는 칸을 '장면 말 한 문장 + 예 · 아니요 질문'으로 정하고 그 칸을 다음 사용자 메시지에 넣는다고 적었다. 묶음 3 표본 질문은 대명사 없이 홀로 서서 지금 이어 묻기는 된다. 장면 행(sceneRow)일 때만 칸 글 전체를 넣는 편이 Follow up 규칙의 맥락에 맞다(4단계 · 카드 질문 길은 그대로).

**M-3. 1~3단계 공통 줄 'come back to today's topic within them' 이 새 돌아오기 설계보다 앞당긴다.** talk-lesson.ts:926 은 '상한 턴 안에 돌아오라'고 하고, 새 흐름은 상한에 닿은 다음 턴에 'Come back … in this turn' 으로 돌아오게 한다(spec 설계 3 따라가기 상한 · 05 6.1 '아이가 먼저 꺼낸 이야기' 행 '턴까지 따라간다'). 모델이 상한 전에 아이 이야기를 끊을 여지가 남는다(C211 (1) 아이 이야기 우선). 4단계 골든에 든 줄이라 1~3 에서만 가르는 줄로 바꾸거나, 정본 15번 문구 맞춤 때 함께 정한다.

## 4. 보고 우려 셋의 타당성
- **1단계 장면 쉬운 질문 선택지**: 타당하다. 카드 항목 쉬운 질문도 흐름은 선택지를 붙이지 않는 같은 꼴이라, 1단계를 열 때 둘을 함께 정하면 된다. 지금은 1단계가 닫혀 있다(plan 위험 7).
- **예 문장 어휘(ears · oops · sound · problem · answer)**: 타당하다. spec 설계 1 말 검사 (가)대로 허용 목록을 만들 때 `TALK_SITUATION_EXAMPLES` 를 재료에 넣어야 한다(묶음 3).
- **문장 상한 − 1**: 12절 지금 값은 3 · 3 · 4 · 5 라 1~3 은 '두 문장까지'로 spec 설계 3 과 같다. 값이 1 이 되는 일은 지금 없다. 관찰로만 둔다.

## 5. 묶음 2 에 넘길 것
1. 서버 talkCallTurnOf 호출에 feelingWords · lemmaOf 를 넘긴다(넘기기 전에는 'Child said more' 줄이 없다).
2. **greetingFallback 쓰기.** 지금 lessonCardSlotOf(lesson-turn.ts:750~810)는 걸린 AI 질문 대신 slotChanceOf 로 남은 필수 질문을 붙인다. 인사 차례(plan.greetingFallback 있음)에서 그대로 두면 인사 토막에 필수 질문이 들어간다. 그 차례에는 greetingFallback 줄을 붙인다.
3. **장면 여는 질문의 뜻 · 힌트.** questionKoIn(lesson-turn.ts:1298)이 sceneOpener 질문 · 쉬운 질문을 모른다. lessonHintsAt(466~492)은 장면 자리(item none · 카드 인사와 다른 질문 · aiQuestion 없는 앱 행)에서 힌트가 비어 '힌트' 단추가 없다. sceneOpener 의 hintKo · hintEn · frameEn 을 잇는다.
4. AC-2 (가) 뒷부분(인사 끝 물음표 문장 지움)은 서버 문장 문 몫이라 묶음 1 시험이 증명하지 않았다.
5. I-1 을 고친 뒤 서버의 둘째 인사 힌트(greetingHintItemOf, 열쇠 대조)와 흐름의 답 예시가 같은 질문을 가리키는지 짝 시험 하나를 둔다.

## 6. 범위 밖 관찰
- 'Child said more' 는 정의대로 'Yes, I do.'(낱말 셋)에서도 yes 다. 장면 여는 질문의 답 예시 꼴이 그대로 '내용 있는 말'로 잡히므로, 묶음 4 대본 지표 '짧은 답 뒤 둘째 문장'을 셀 때 같은 함수를 쓰는지 맞춰 둔다.
