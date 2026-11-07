# 묶음 1 fix 2 범위 한정 재검토 — rev-1-fix2

검토자: code-reviewer(Opus xhigh) · 2026-11-07 · 지난 보고 `task-rev-1-fix1-report.md` 의 N-1 과, 고침이 만든 새 어긋남만 봤다. 묶음 2 진행 중 파일 탓의 tsc · lint 는 판정에서 뺐다. 시험은 다시 돌리지 않았고, 지난번 스크립트 둘을 지금 코드에 다시 돌렸다.

## 라운드 판정: Approved (fix 라운드 2/3 · Critical 0 · Important 0)

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| N-1 시드 꼴 인사 질문의 카드 답 못 찾음 | ADDRESSED | `src/core/conversation/lesson-flow.ts:213~216` 이 행은 그 차례 질문(questionKeyOf), 카드는 `cardQuestionKeyOf(q.question.en)`(마지막 물음표 문장)로 견준다. 스크래치패드 `rev1f1-greet-probe.ts` 재실행: "Hello, {NAME}! How are you?" 카드에서 '모름' → card_slot 받침 1 · 소리 줄 "I'm good.", 들리지 않음 → 답 소리 "I'm good." + 다음 인사 질문. HEAD 흐름 결과와 같다. 시험 `tests/unit/talk-ai-scope-flow.test.ts:320~369` 가 시드와 같은 꼴(인사 + 물음표 문장)로 두 길을 단언한다 |

## 2. 고침이 새로 깨뜨린 것
- 없음. 바뀐 것은 카드 쪽 열쇠 함수 한 줄이다.
- I-1 길은 그대로다. `rev1-greet-probe.ts` 재실행에서 AI 둘째 인사 "What do you eat for lunch?" 뒤 '모름'의 소리 줄은 AI 답 "I eat rice." 다.
- 4단계 카드 인사는 questions 가 없어 이 함수가 null 을 내므로 길이 같다. 골든 shasum 그대로라는 보고와 맞는다.

## 3. 범위 밖 관찰
- 이 함수는 카드 인사 질문 가운데 열쇠가 같은 첫 것을 고른다. 한 카드 안의 두 인사 질문이 마지막 물음표 문장까지 같으면 첫 답을 쓴다. 지금 시드 카드는 모두 인사 턴이 하나라 닿지 않는다. 인사 턴 2 카드를 만들 때 검증기가 두 인사 질문의 열쇠가 다른지 보면 된다.
- 서버 greetingHintItemOf(lesson-turn.ts 502)의 같은 어긋남은 묶음 2 로 넘겨져 있다(지난 보고 3절).
