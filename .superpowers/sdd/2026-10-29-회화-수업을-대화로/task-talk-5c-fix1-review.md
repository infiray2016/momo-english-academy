# 재검토 보고: 회화 plan 묶음 '5-다' fix 1(범위 한정, fix 라운드 1/3)

검토자는 rev-talk-5c(code-reviewer · Opus · xhigh, 읽기 전용)이고, 2026-11-05 에 썼습니다. 줄 번호는 워크트리 `.claude/worktrees/p13d` 기준입니다. 본 것은 고침 보고 `task-talk-5c-fix1.md` 와 브리프 `task-talk-5c-fix1-brief.md`, 그리고 고친 자리입니다. 고친 자리는 `src/core/conversation/lesson-flow.ts` 의 인사 끝 규칙 · 되짚기 · 계획, `src/core/ai/calls/talk-lesson.ts` 의 koExplainRule · 정규화 소리 줄, `src/core/conversation/hints.ts` 의 가져오기 · heardHelpsOfMove, 시험 셋의 새 describe 입니다. 묶음 8 파일은 컨트롤러가 허용한 `src/server/conversation/lesson-turn.ts:455-464` 한 자리만 읽었습니다. 시험은 다시 돌리지 않았습니다. 관문 출력은 스크래치패드 파일의 요약 줄로 확인했습니다(단위 140 파일 · 1758 통과 · 6 todo, check:deps 위반 0 · 285 모듈, tsc 출력 없음, biome ci 고칠 것 없음).

**판정: 수정 필요(Changes requested).** 지난 지적 다섯(I-A · M-1~M-4)은 모두 ADDRESSED 입니다. 그런데 M-3 고침이 Important 하나를 새로 만들었습니다(N-1). M-3 문장은 제가 지난 보고에서 제안한 꼴인데, 그 제안이 말 입력 막힘 턴을 빠뜨렸습니다. 고칠 것은 문장 한 구절과 시험 하나입니다.

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| I-A 인사 끝 막힘 말 되짚기(Important) | ADDRESSED | 규칙 `greetingEndsOf`(`lesson-flow.ts:209-217`)를 계획 `lessonTurnSegmentOf`(`:444-451`)와 되짚기(`:326-334`)가 함께 씁니다. 되짚기는 셈을 바꾸기 전(`:341` 앞)의 stuckInSlot 과 greetingIndex 로 판단하므로, 계획 때 위치가 넘기는 값과 같습니다. 인사 끝이면 자리를 닫고 phase 를 talk 로, transitionNext 를 참으로 둡니다(`:358-363`). 다음 선생님 행(인사 끝 반응)은 질문 자리를 열지 않습니다(`:284-288`). 그 결과 위치는 greetingIndex 가 greetingTurns, firstQuestionDue 가 참이 됩니다(`:389 · 416-422`). 계획은 새 칸 greetingEndNow(`:111 · 393`)로 토막을 greeting_end 로 보고(`:934-936`) greetingEndPlan 을 고릅니다. 시험 `tests/unit/talk-lesson-flow.test.ts:762-780` 은 저장 꼴과 계획 꼴의 계획이 같고 닫기(stage 3)임을 봅니다. `:782-820` 은 되짚은 위치를 봅니다. `:822-836` 은 말로 답함 · 들리지 않음에서 반응의 물음이 자리를 열지 않음을 봅니다. 앞 셋은 옛 코드에서 실패하는 입력입니다. 경계 시험 `:838-848` 도 있습니다. 보고의 우려(막힘 말 행 뒤 slot 이 null)는 해가 없습니다. greetingEndPlan 은 answeredSlot 만 읽기 때문입니다. |
| M-1 비운 따라 할 말의 새 단어 | ADDRESSED | `talk-lesson.ts:1205-1214` 가 남을 줄의 재료 modelSource 를 먼저 정하고, 새 단어 거르기와 소리 줄 조건(`:1217`)이 모두 그것을 씁니다. 소리 줄 동작은 옛 조건과 같습니다. 4단계부터 model_line 을 늘 비우는 같은 틈도 닫혔습니다. 시험 `talk-lesson-call.test.ts:1175-1230` 은 받침 둘째에서 model_line 에만 든 'weekend' 가 빠지고, tori_en 에 들면 남는 것을 봅니다. |
| M-2 1~3단계 AI 차례의 계획 사실 | ADDRESSED · 새 Minor N-2 | `hints.ts:269-286` 은 둘째 인자로 단계 규격을 필수로 받습니다. 계획 사실은 `!isLowBand(spec)` 일 때만 씁니다. 시험 `talk-lesson-hints.test.ts:320-342` 은 같은 move 가 3단계면 빈 목록, 4단계면 답 예시이고, 3단계라도 sound.answer 가 있으면 답 예시임을 봅니다. 묶음 8 호출 `lesson-turn.ts:459-461` 은 `heardHelpsOfMove(prev.move, state.spec)` 꼴입니다. 인자 순서와 꼴이 새 서명과 맞고, tsc 0 과도 맞습니다. 다만 1~3단계에서 AI 가 스스로 적은 support 값도 여전히 '들음'으로 셉니다(N-2). |
| M-3 고정부 문장(선택) | ADDRESSED · 새 Important N-1 | `talk-lesson.ts:668-677` 은 칸을 읽고 'Support stage is {from} or above' 로 적습니다. ORDINALS 는 지웠습니다. 그러나 문장 앞머리의 조건이 말 입력 막힘 턴을 뺍니다(N-1). |
| M-4 정의 자리에서 가져오기(선택) | ADDRESSED | `hints.ts:3-9` 가 lesson-turns.ts 에서 가져옵니다. core/conversation 안에서 talk-lesson.ts 를 가져오는 모듈은 없습니다(grep). |

## 2. 새로 든 것

### Important

**N-1. 새 한국어 설명 문장이 말 입력 막힘 턴(막힘 말, C36)을 조건에서 뺍니다.**
- 무엇: `talk-lesson.ts:676` 은 'When Reason is button or stuck and Support stage is {from} or above, write …' 입니다. 그런데 말 입력 턴의 사용자 메시지 Reason 줄은 '-' 입니다. 주 계획이 '답함' 계획이라 cause 가 null 이고(`:408`), 메시지는 `Reason: ${turn.reason ?? "-"}` 로 씁니다. 막힘 계획 줄 'If stuck, …'(planLines)에는 Reason 이 없습니다. 고정부 `:700` 도 AI 가 막힘을 정했을 때 'If stuck' 줄로 바꿔 읽는 칸을 'Turn, Question, Card line, Support stage and Stuck question' 으로만 적었습니다. 그래서 아이가 'I don't know' 를 말로 한 턴에서는 이 문장의 조건이 글자 그대로 거짓입니다.
- 왜: 앱은 응답이 막힘이면 그 턴을 reason stuck 으로 고칩니다(`:444`). 그리고 설명을 보일지 정하는 koExplanationShownOf 는 cause stuck 을 단추와 같이 봅니다(`hints.ts:256`). 정본 02-2:255 는 막힌 차례를 단추와 막힘 말 둘로 두고, 02-2:263 은 1~4단계에서 첫 막힘부터 설명을 붙이라고 합니다. AI 가 조건을 글자대로 따르면 1~4단계에서 말로 막힌 아이는 설명을 받지 못합니다. 앱은 빈 설명을 보일 수 없습니다. 옛 문장('from the first stuck on the same question')은 Reason 을 말하지 않아 이 길을 덮었으므로, fix 1 에서 생긴 회귀입니다. 이 꼴은 제가 지난 보고 M-3 에서 제안했고, 그때 말 입력 길을 보지 못했습니다.
- 어떻게: 조건에 AI 자신의 막힘 판단을 넣습니다. 예: 'After a stuck turn (Reason: button or stuck, or you set stuck to true), write a short Korean explanation in explanation when Support stage is {from} or above (when you set stuck, use the If stuck Support stage).' 시험은 `talk-lesson-call.test.ts:1146-1147` 의 sentence 를 새 문장으로 바꿉니다. 그리고 'you set stuck to true' 구절이 든다는 단언을 하나 더합니다.

### Minor

**N-2. 1~3단계에서 AI 가 스스로 적은 support 값이 소리 줄 없이도 '들음'으로 셉니다.**
- 무엇: 정규화는 support 를 열거 검사만 하고 그대로 내보냅니다(`talk-lesson.ts:1310`). move 로 옮기는 값은 '앱 확인 · 정규화를 지난 것'입니다(`lesson-flow.ts:981`). 그래서 move.ai 는 이 값입니다. 그런데 `hints.ts:291-292` 는 `move.ai === "together" || move.ai === "model_line"` 이면 단계 구간과 관계없이 답 예시를 들은 것으로 봅니다. 기존 시험 `talk-lesson-hints.test.ts:283-285` 도 3단계에서 소리 줄 없는 `ai: "model_line"` 을 답 예시로 고정합니다.
- 왜: 1~3단계에서 정규화가 따라 할 말을 비우는 길은 둘입니다. 하나는 받침 둘째(N-4 · M-1)이고, 다른 하나는 소리 줄 검사에 걸렸는데 대체 줄이 빈 경우(`:1097` · `:364`)입니다. 이 두 길에서 AI 가 support 를 model_line 이나 together 로 적으면 아이는 아무것도 듣지 못합니다. 그런데도 다음 턴이 '영어'로 남고 '말했다'에서 빠집니다(M-1 · M-2 와 같은 결과). 선택지를 checkChoices 가 버린 뒤의 'choices' 도 같습니다. 제 지난 M-2 가 move.ai 를 사실 기록으로 적은 것은 정확하지 않았습니다. 1~3단계의 사실 기록은 서버가 붙인 app · sound 입니다. hints.ts 주석 `:279-280` 도 그렇게 말합니다.
- 어떻게: 정규화가 support 를 남은 줄과 맞춥니다. 1~3단계에서 support 가 model_line 이나 together 인데 남은 model_line 이 비었으면 none 으로 둡니다. support 가 choices 인데 choices 가 비었으면 none 으로 둡니다. 4단계부터의 model_line 도 none 으로 둡니다. 이렇게 하면 hints.ts 는 그대로 두어도 됩니다. 시험: 받침 둘째에 support model_line 을 넣은 응답은 support 가 none 입니다. 드문 길(AI 가 규칙을 어김)이라 N-1 과 함께 고치거나 묶음 8 브리프에 넣을 수 있습니다.

### 시험 손질(Minor 아래, 고치지 않아도 됨)
- I-A 는 마지막 인사 질문에 '말로 답한' 저장 행 바로 뒤의 계획을 단언하지 않습니다. 옛 코드에서는 이 계획이 answeredPlan(토막 greeting)이었습니다(`lesson-flow.ts:934-950`, 옛 꼴은 last.segment 를 그대로 씀). `nextTeacherTurnOf(args3([...head, said({ segment: "greeting" })]))` 의 segment 가 greeting_end 라는 한 줄을 더하면, 가장 흔한 길이 시험으로 닫힙니다. talk.dontknow_max 번째 단추로 끝난 저장 행도 같습니다.

## 3. 범위 밖 관찰
- 없음. 묶음 8 의 lesson-turn.ts 는 인자 꼴만 보았습니다.

## 4. 라운드 판정

**수정 필요(fix 라운드 1/3 끝).** I-A · M-1 · M-2 · M-3 · M-4 는 닫혔습니다. N-1(Important)은 고정부 문장 한 구절과 시험 단언 하나입니다. 이것을 고친 뒤의 재검토는 N-1 한 줄과 그 시험만 보면 됩니다. N-2(Minor)는 정규화 두세 줄과 시험 하나로, 같은 차례에 하거나 묶음 8 브리프에 넣을 수 있습니다.
