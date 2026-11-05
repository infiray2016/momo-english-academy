# 재검토 보고: 회화 plan 묶음 6 fix 2(범위 한정, fix 라운드 2/3)

검토자: rev-talk-6(Opus · xhigh, 읽기 전용) · 2026-10-30 10:1x · 작업 트리 `.claude/worktrees/p13d`
본 것: 고침 보고 `task-talk-6-fix2.md`, 고친 뒤 `src/core/ai/calls/talk-lesson.ts` 의 고정부(:679-680 · :711-717 · :724-725)와 `tests/unit/talk-lesson-call.test.ts` 의 새 describe(:1030-1120). 지난 재검토(`task-talk-6-fix1-review.md`)의 N-1 · N-2 만 판정한다. 시험은 다시 돌리지 않았다.

## 판정: Approved(새 Minor 2 — 컨트롤러가 직접 고치거나 장부에 둘 수 있음)

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| N-1 1~3단계 AI 차례 받침 문장 | ADDRESSED | 옛 문장('When Turn is ai after a stuck or nospeech turn, put the answer to say in model_line')이 없어지고 넷으로 나뉘었다. (1) :712 '앱이 답 소리와 쉬운 · 다음 질문을 붙인다'는 'when Turn is card_slot'에만 걸린다. 02-2:259-261 의 1~3단계 열과 C194 (1)의 카드 자리 길이다. (2) :713 'Question: no 인 같이 말하기 AI 차례는 답을 model_line 에'. 묶음 5 가 이 AI 차례를 내는 것은 그 자리 답이 없을 때뿐이라(stuckPlan `low && answer` 가 아니면 aiPlan(false)) 02-2:259 첫째와 맞다. (3) :714 '받침 둘째 AI 차례는 답을 주지 말고 쉬운 예 · 아니요 질문이나 choices 둘'. 02-2:260 둘째와 맞고, probe2 와 같은 계획 시험이 이 차례를 'Turn: ai · Question: yes · Card line: - · Support stage: 2'로 옮기고 선택지 둘이 정규화를 지남을 보인다(test:1054-1108). (4) :715 '셋째 · 들리지 않음 AI 차례는 답을 model_line 에 둔 뒤 다음 이야기'. 묶음 5 에서 이 차례는 붙일 더 이야기할 거리가 모두 같은 질문 상한에 걸린 드문 길(oldestMoreOf null, 장부 T-46)에서만 생기므로 C194 (1)과 부딪치지 않는다. 02-2:261 의 '답 → 다음 이야기' 뜻을 지키고, 소리 줄이 tori_en 뒤에 읽혀 생기는 차례 문제는 T-46 에 남는다(지난 재검토 3절 3 그대로) |
| N-2 'Question: no' 괄호 | ADDRESSED | :680 이 '(from level 4, with the answer example to say together; or a short line moving on)'으로 좁혀져 1~3단계 카드 자리 :712 'Do not write the answer or a question'과 부딪치지 않는다. 시험이 새 글과 옛 괄호 없음을 함께 본다(test:1110-1118) |

## 2. 고침이 새로 들인 것

**N-3(Minor). 셋째 · 들리지 않음 문장의 'then ask about the next topic'이 인사 끝 닫기의 'Question: no'와 한 턴에 함께 걸린다.**
- 무엇: 묶음 5 greetingEndPlan 은 마지막 인사 질문 자리를 셋째 막힘 · 들리지 않음으로 닫을 때, 1~3단계에서 그 자리 답이 없거나 4단계부터이면 `aiPlan(base, segment, false)`(stage 3 또는 0, aiAsks 거짓)를 낸다. 이 턴에는 :715(1~3단계, 이번에 더함)나 :725(4단계부터, fix 1 에서 더함)의 '… then ask about the next topic'과 :680 'When Question: no, do not ask any question', :687 'When Segment is greeting_end … Do not ask a question'이 함께 걸린다.
- 왜: 정본 05:31 은 인사 끝 턴에 반응과 넘어가는 말만 쓰고 질문을 쓰지 않게 하며, 그 뒤 질문은 앱이 붙이는 대화 첫 질문이다(02-2:188, C19). 다른 두 줄이 같은 쪽이고 정규화가 다음 질문 칸을 비우므로(asksNext) Minor 다. 다만 1~3단계에서 tori_en 에 질문 문장이 남으면 대화 첫 질문과 질문이 둘 이어진다.
- 어떻게: :715 · :725 의 끝을 '…, then (when Question: yes) ask about the next topic'으로 고친다. 고정부 글 시험의 기대 문장 둘도 함께 바꾼다.

**N-4(Minor). 새 회귀 시험의 '따라 할 말 칸의 답은 남지 않는다'가 빈 입력으로만 증명된다.**
- 무엇: test:1054 의 이름은 '따라 할 말 칸의 답은 남지 않는다'인데, 넣은 응답의 model_line 이 이미 빈 글이라(:1097) `expect(v.model_line).toBe("")`(:1106)는 늘 참이다. 정규화는 1~3단계 AI 차례 받침 둘째에서 AI 가 답을 model_line 에 써도 그대로 남긴다(aiTurn 참이면 범위 검사만, :1190-1195). 받침 둘째에서 답을 막는 것은 프롬프트 :714 뿐이다.
- 왜: 정본 02-2:260 둘째는 답을 주지 않는 차례이고, 이 저장소 규칙상 아무것도 단언하지 않는 시험은 고쳐야 한다. 시험 이름이 정규화가 막는다고 읽히게 하므로 묶음 8 이 이 안전망이 있다고 믿을 수 있다.
- 어떻게(둘 중 하나): (가) 정규화에 '1~3단계 AI 차례 · Support stage 2 이면 model_line 을 비운다'를 더하고(choices 는 남김), 시험 입력의 model_line 을 'I play with my friend.'로 바꿔 비는 것을 본다. 받침 둘째의 소리 줄은 고르기 답 둘뿐이라는 02-2:260 을 꼴로 지키므로 이쪽을 권한다. (나) 정규화는 그대로 두고 시험 이름에서 그 구절과 :1106 단언을 뺀다.

## 3. 범위 밖 관찰

- 고친 문장은 표본 18개의 응답 · 입력에 들지 않아 표본을 다시 만들지 않은 것이 맞다(고정부 글은 표본에 저장되지 않음). 보고의 관문 결과(tsc · lint 0)는 fix 1 때 다른 손으로 깨졌던 두 자리가 풀린 상태다.

## 4. 라운드 판정

Approved. N-1 · N-2 는 닫혔다. 새 Minor 둘(N-3 문장 둘 · N-4 정규화 한 줄이나 시험 이름)은 talk-lesson.ts 와 단위 시험 안이라 컨트롤러가 직접 고치거나, 묶음 8 브리프 · 장부에 두고 넘어가도 된다.
