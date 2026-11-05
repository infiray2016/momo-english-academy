# fix 1 보고: 회화 plan 묶음 5 — 흐름 핵심 순수 모듈(2026-10-30 09:2x, 구현자 impl-talk-5 · Opus · high)

상태: DONE. 검토 `task-talk-5-review-report.md` 의 Important 셋(I-1 · I-2 · I-4)과 Minor 여섯(M-1~M-6)을 고쳤다. I-3 은 컨트롤러 판단(13절 C194 (1), 잠정)대로 코드를 두고 주석 · 보고의 근거만 맞췄다. 이 묶음의 새 파일만 고쳤고 커밋 · push 는 하지 않았다. 시험을 먼저 고쳐 열넷이 실패하는 것을 본 뒤 구현했다.

줄 번호는 워크트리 `.claude/worktrees/p13d` 의 고친 뒤 기준이다.

## 지적별 고친 곳

### I-1(T2) 1~3단계에서 대화 중 짧은 준비를 열 때 답이 글 줄로 붙음
- `src/core/conversation/lesson-flow.ts:751`: 짧은 준비 (나)를 여는 자리에서 1~3단계면 소리 줄(sound answer)을 붙인다. 4단계부터는 지금처럼 글 줄(answer_example)이다. app 은 그대로 answer_example · prep 이다.
- 시험: talk-lesson-flow 'AC-15n 인사 뒤 준비를 하지 않았으면 막힌 질문이 노린 카드 준비 낱말을 앞세워 열고, 답은 소리로만 붙는다(T2)'. attach 가 sound 이고 answer_example 이 없으며, teacherMoveOf 결과의 sound.answer · prep.words 를 본다.

### I-2 짧은 준비 낱말 빼기를 실제로 보인 준비 기준으로
- `src/core/conversation/chances.ts:99 · 108 · 110`: talkChancesOf 가 card.prep 대신 prepShown(인사 뒤 준비에서 보인 낱말)을 받는다. 선생님 행 move.prep.words(대화 중 연 준비)도 모아 함께 뺀다. 카드 Pick 에서 prep 를 뺐다.
- `lesson-flow.ts:81 · 218 · 875`: LessonArgs.prepOpened(불린)를 prepWords(인사 뒤 준비에서 보인 낱말 목록)로 바꿨다. 위치의 prepOpened 와 기회 셈이 같은 사실을 쓴다. 비었으면 인사 뒤 준비를 하지 않은 것이다.
- 시험(talk-chances):
  - '인사 뒤 준비를 하지 않았으면 카드 짧은 준비 낱말도 '꺼낼 새 단어' · 준비 후보에 든다'
  - '대화 중 연 준비(move.prep)로 보인 낱말은 '꺼낼 새 단어' · 준비 후보에서 빠진다'
- 시험(talk-lesson-flow):
  - 'AC-15n 인사 뒤 준비를 하지 않았으면 …'(I-1 과 같은 시험, openPrep 이 play · soccer · sunday)
  - 'AC-15n 인사 뒤 준비를 했으면 대화 중에 다시 열지 않는다'
  - '대화 중 연 준비 낱말은 '꺼낼 새 단어'에서 빠진다'
- 견본: 시험 args3 은 1~3단계 늘 준비를 따라 prepWords 에 카드 짧은 준비 낱말을 넣는다. 기회 시험 도우미는 prepShown 에 그 낱말을 넣는다.

### I-4 같은 질문 셈 · 막힌 질문 글은 그 차례의 질문만
- `src/core/conversation/question-check.ts:43` 에 `turnQuestionOf(text, kind)` 를 새로 뒀다. AI 차례 · 대화 첫 질문 · move 없는 행은 화면 글의 마지막 물음표 문장이다. 카드 자리 · 마무리 자리는 끝 문장(붙인 카드 질문 · 쉬운 질문)이 질문일 때만 그 줄이고, 같이 말하기 · 마무리 물음이면 없다. 마무리 물음은 늘 뺀다.
- `lesson-flow.ts:239`: askedQuestions 와 질문 자리의 questions(계획의 blocked · stuckQuestion 재료)에 행마다 그 차례의 질문 하나만 넣는다.
- 시험(talk-question-check):
  - 'AC-15r AI 차례 · 대화 첫 질문은 마지막 물음표 문장만이고 반응의 물음은 뺀다'
  - 'AC-15r 카드 자리 · 마무리 자리는 끝 줄(붙인 질문)이 질문일 때만이다'
- 시험(talk-lesson-flow):
  - 'AC-15r 반응 부분의 물음('Really?')은 셈에 들지 않고 그 차례 마지막 질문만 센다'(셈 · blocked · stuckQuestion)
  - 'AC-15r 카드 자리 · 마무리 자리 행은 붙인 줄이 질문일 때만 센다(반응의 물음은 뺌)'

### I-3 받침 닫기 · 들리지 않음 닫기의 대신 질문(코드는 두고 근거만)
- 코드를 바꾸지 않았다. `lesson-flow.ts:583`(chanceOrOldest) · `:790`(받침 닫기) · `:808`(들리지 않음 닫기)의 주석 근거를 13절 C194 (1)(잠정, 첫 프리뷰에서 요청자 확인)로 맞췄다. 대화 중 짧은 준비 뒤 대화 첫 질문(chanceOrOldest 를 쓰는 firstQuestionPlan)도 같은 주석이 덮는다.
- `task-talk-5-report.md` 해석 5 의 근거를 C194 (1)로 고쳤다.

### Minor
- **M-1 인사 끝 닫기의 답.** `lesson-flow.ts:703`(greetingEndPlan, 새 함수)이다. 마지막 인사 질문을 들리지 않음 · 셋째 막힘으로 닫는 '인사 끝' 턴이면 stage(들리지 않음 0 · 막힘 3) · cause · answerFallback 을 싣는다. 1~3단계는 인사 답 예시를 소리 줄로 붙이고 카드 자리(support)이며, 4단계부터는 AI 차례에 answerFallback 이다. 카드 질문은 여전히 붙이지 않는다(C19). 말로 답한 인사 끝은 그대로 질문 · 붙일 줄이 없다.
  - 시험: '마지막 인사 질문을 들리지 않음 · 셋째 막힘으로 닫는 '인사 끝'도 답을 한 번 소리로 들려준다'.
- **M-2 한국어 질문 턴.** `lesson-flow.ts:290` 은 koQuestion 확인을 endChoice 앞으로 옮겼다. 고르기 차례 중의 한국어 질문 턴은 고르기를 끝내지 않는다. `:885` 는 끝 행이 한국어 질문 턴이면 계획 none(변경 단위 ⑤ 몫)을 낸다.
  - 시험: '끝 행이 한국어 질문 턴이면 선생님 차례 계획이 없고(변경 단위 ⑤ 몫), 고르기 차례도 끝나지 않는다'.
- **M-3 같은 값 상수.** `lesson-turns.ts:10 · 72` 는 LOW_BAND 를 지우고 structure.ts 의 TALK_LOW_BAND 를 가져다 쓴다. 가져오기만 했고 structure.ts 는 고치지 않았다.
- **M-4 마무리 자리 문턱.** `lesson-flow.ts:316` 을 `talkCount >= spec.targetTurns && !closingAsked` 로 바꿨다. 참고 턴에 닿은 차례가 마무리 자리로 저장되지 않았으면(실패 길) 다음 말 턴이 마무리 자리다.
  - 시험: 'AC-15t (마) 참고 턴에 닿은 차례가 마무리 자리로 저장되지 않았으면(실패 길) 다음 말 턴에 마무리 물음을 늦추지 않는다'.
- **M-5 준비 뒤 대화 첫 질문의 이어진 막힘.** `lesson-flow.ts:641` 은 prepPending 이면 계획의 streak 을 0 으로 둔다. 그래서 move.streak 도 0 이다.
  - 시험: 'AC-15n 준비가 끝나면 …'에 `plan.streak` · `teacherMoveOf(plan).streak` 0 과 callsAi 거짓을 더했다.
- **M-6 시험 손질.**
  - (1) 'AC-15g 셋째 막힘 …'의 늘 참인 `not.toBe("floor")` 를 지웠다.
  - (2) talk-ending 'AC-15t (라) 마무리 물음에 답하고 …'를 'AC-15t 마무리 물음에 답하고 끝내면(끝난 길 표 첫 줄) …'로 바꿨다. (라)의 증명은 flow 시험이 맡는다.
  - (3) 빠진 쪽 시험을 더했다.
    - 인사 받침: '1~3단계 인사 질문의 첫째 막힘은 인사 답 예시 소리, 둘째는 AI 가 쉬운 질문을 쓴다'
    - 인사 들리지 않음: '인사 질문의 들리지 않음은 답 소리 뒤 다음 인사 질문이다'
    - silentRun 끊김: 'AC-15g 들리지 않음 이어짐은 그 사이 아이가 단추 · 말로 응한 차례가 있으면 끊긴다'
    - teacherMoveOf 의 prep 칸과 3단계 when_needed 길: I-1 · I-2 시험이 덮는다.
  - (4) AC-15n 을 달았다. 대상은 대화 첫 질문 AI 0회 시험 하나, 짧은 준비 (나) 시험 셋, 1~3단계 when_needed 시험 둘이다.

## 시험

| 파일 | fix 0 | fix 1 |
|---|---|---|
| talk-move | 6 | 6 |
| talk-question-check | 12 | 14 |
| talk-chances | 14 | 16 |
| talk-lesson-flow | 33 | 44 |
| talk-ending | 13 | 13 |
| 합 | 78 | 93 |

## 관문(09:2x, 워크트리, Node 24)

```
pnpm vitest run (새 다섯)     Test Files 5 passed · Tests 93 passed
pnpm test                     Test Files 133 passed · Tests 1657 passed | 6 todo
pnpm exec tsc --noEmit        오류 0(전체 — 묶음 3 의 기존 오류도 지금은 없음)
pnpm lint                     Checked 561 files · No fixes applied
pnpm check:deps               no dependency violations found(280 modules)
pnpm check:ids --fail-on …(CI 목록) --design-number-max 49   종료 0 · 위반 0 · design-number 47(변화 없음)
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec --plan 본 저장소 회화 plan   종료 0 · unknown-ac 0 · plan-ac-not-in-spec 0
```

biome --write 는 `src/core/conversation` 폴더로 돌렸다. 바뀐 파일은 이 묶음의 lesson-flow.ts · question-check.ts · talk-lesson-flow.test.ts 뿐이다. 수정 시각으로 확인했고 flow.ts · hints.ts 등 다른 손의 파일은 그대로다.

## 남은 것

- '묶음 3 뒤 할 것'(spoken.ts 옮김 · hints · said · wrap-up 새 갈래)은 지시대로 '5-나'로 남겼다.
- 묶음 8 이 지킬 것: 선생님 행 text 의 끝에 붙인 줄(카드 질문 · 쉬운 질문 · 마무리 물음)을 두어야 turnQuestionOf 가 그 차례의 질문을 바로 고른다. 인사 뒤 짧은 준비에서 보인 낱말은 prepWords 로 넘겨야 한다(talk-prep 시도).
