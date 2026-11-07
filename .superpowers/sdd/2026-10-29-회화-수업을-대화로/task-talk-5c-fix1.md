# 구현 보고: 회화 plan 묶음 '5-다' fix 1(fix 라운드 1/3)

구현자는 impl-talk-5c-fix1(implementer · Opus · high)이고, 2026-11-05 에 썼습니다. 줄 번호는 워크트리 `.claude/worktrees/p13d` 기준입니다. 브리프의 할 것 넷(I-A · M-1 · M-2 · 선택 M-3 · M-4)을 모두 했습니다.

## 지적마다 고친 것

### I-A 인사 끝 막힘 말 되짚기(Important)
- 원인: 저장된 아이 행은 토막이 늘 greeting 입니다(talk_segment 열거에 greeting_end 가 없음). 그런데 되짚기는 행 토막이 greeting_end 일 때만 인사 끝으로 보았습니다. 그래서 막힘 말 행은 phase 가 greeting 에 남았습니다. 같은 까닭으로 말로 답한 행 · 들리지 않음 행도 transitionNext 가 서지 않았습니다. 그러면 인사 끝 반응에 물음('Are you ready?')이 있을 때 그 물음이 질문 자리를 열어 firstQuestionDue 가 거짓이 되었습니다(브리프 밖에서 함께 닫힌 같은 뿌리의 틈).
- 고침(`src/core/conversation/lesson-flow.ts`):
  - `:197` inputCauseOf, `:209` greetingEndsOf 를 새로 두었습니다. 계획(lessonTurnSegmentOf, `:444`)과 되짚기가 이 규칙 하나를 씁니다. 규칙은 '마지막 인사 질문 자리이고, 말 입력 · 들리지 않음 · talk.dontknow_max 번째 단추'이며, 말 입력은 막힘이어도 끝낸 것으로 봅니다.
  - `:326` 되짚기는 셈을 바꾸기 전 자리로 endsGreeting 을 정합니다(행 토막 greeting_end 도 그대로 받음). `:359` 인사 끝이면 자리를 닫고 phase 를 talk 로, transitionNext 를 참으로 둡니다.
  - 위치에 새 칸 greetingEndNow(`:111`)를 더했습니다. `:934` nextTeacherTurnOf 는 이 칸이 참이면 토막을 greeting_end 로 보아 greetingEndPlan(닫기)을 고릅니다. 그래서 마지막 행이 저장된 아이 행이어도 계획이 같습니다.
- 시험(`tests/unit/talk-lesson-flow.test.ts:757` describe '저장된 행으로 되짚는 인사 끝(… fix 1 I-A)'):
  - '마지막 인사 질문에 막힘 말로 답한 행이 토막 greeting 으로 저장돼도 계획은 인사 끝(닫기)이다' — 먼저 실패 확인.
  - '막힘 말 행 · 인사 끝 반응을 되짚으면 대화 토막으로 넘어가고 greetingIndex · firstQuestionDue 가 계획 때와 같다' — 먼저 실패 확인.
  - '말로 답함 · 들리지 않음으로 끝난 인사도 저장된 꼴에서 인사 끝 반응의 물음이 질문 자리를 열지 않는다' — 먼저 실패 확인.
  - '마지막이 아닌 인사 질문의 막힘 말은 인사 토막에 남는다(같은 자리 받침)' — 경계 지킴(고치기 전에도 통과).

### M-1 비운 따라 할 말의 새 단어
- 고침(`src/core/ai/calls/talk-lesson.ts:1205-1217`): 남을 따라 할 말의 재료 modelSource 를 먼저 정합니다. 새 단어 거르기와 소리 줄 조건이 모두 이것을 씁니다. 1~3단계 받침 둘째와 4단계부터의 AI 따라 할 말은 비우므로 거르기 재료가 아닙니다.
- 시험(`tests/unit/talk-lesson-call.test.ts:1175` '1~3단계 받침 둘째에서 비운 따라 할 말에만 든 새 단어는 꺼낸 새 단어가 아니다(아이가 듣지 못함)') — 먼저 실패 확인(`['weekend']` 가 남음). tori_en 에 든 낱말은 그대로 받는 것도 같은 시험이 봅니다.

### M-2 1~3단계 AI 차례의 계획 사실
- 고침(`src/core/conversation/hints.ts:271 · 282`): heardHelpsOfMove 가 둘째 인자 spec(band)을 필수로 받습니다. 계획이 정한 사실(stage 1 · 3 · nospeech)은 4단계부터의 AI 차례에만 씁니다. 1~3단계는 서버가 붙인 app · sound 만 봅니다.
- 시험(`tests/unit/talk-lesson-hints.test.ts:320` 'AC-15h 1~3단계 AI 차례는 서버가 붙인 소리 줄만 사실 기록이다(…, '5-다' 검토 M-2)') — 먼저 실패 확인. 같은 move 가 4단계면 답 예시라는 것, 1~3단계라도 sound.answer 가 있으면 답 예시라는 것을 함께 봅니다. 기존 시험의 호출에는 SPEC3 · SPEC4 를 넘겼습니다(4단계 시험만 SPEC4).
- 브리프와 다른 점: 브리프는 '지금 부르는 곳은 시험뿐'이라 했지만, 묶음 8 의 `src/server/conversation/lesson-turn.ts` 가 이미 이 함수를 부르고 있었습니다. 그 파일은 고치지 않았습니다. 대신 impl-talk-8 에게 한 줄 고침(`state.spec` 넘기기)을 알렸고, 14:42 에 그쪽이 고쳤습니다(`lesson-turn.ts:459-461`).

### M-3 고정부 문장(선택, 함)
- 고침(`talk-lesson.ts:668-677`): 문장을 'When Reason is button or stuck and Support stage is {from} or above, write a short Korean explanation in explanation.' 로 바꿨습니다. 칸 koExplainFromStuck 을 읽는 것은 그대로이고, 쓰지 않게 된 ORDINALS 는 지웠습니다.
- 시험(`talk-lesson-call.test.ts:1149 · 1160`)의 문장 꼴을 새 문장으로 바꾸고 옛 문장이 없다는 단언을 더했습니다 — 먼저 실패 확인(둘).

### M-4 정의 자리에서 가져오기(선택, 함)
- `hints.ts:3-9` 가 TalkHeardHelp · TalkHintKind · TalkLessonSpec · isLowBand 를 `lesson-turns.ts` 에서 가져옵니다. core/conversation 안에서 talk-lesson.ts 를 가져오는 모듈은 이제 없습니다(grep).

## 관문 결과(출력 전문은 스크래치패드)

| 명령 | 결과 |
|---|---|
| `pnpm biome ci .` | 0 |
| `pnpm vitest run --project unit` | 140 파일 · 1758 통과 · 6 todo · 실패 0 |
| `pnpm tsc --noEmit` | 0(묶음 8 의 한 줄 고침 뒤) |
| `pnpm check:deps` | 위반 0(285 모듈) |

출력 파일: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/fix1-unit.txt` · `fix1-tsc.txt` · `fix1-deps.txt` · `fix1-biome-ci.txt`(같은 폴더). 먼저 본 실패는 각 시험을 `-t` 로 돌린 출력에서 확인했고 파일로 남기지 않았습니다.

## 묶음 8 · 9 · 12 에 넘길 것
- 묶음 8: heardHelpsOfMove 둘째 인자는 반영되었습니다. 서버가 저장된 행으로 위치를 되짚는 길은 이제 인사 끝을 스스로 알아봅니다. 그래서 서버가 아이 행 토막을 greeting_end 로 바꾸어 넘길 필요가 없습니다(넘겨도 같은 결과).
- 묶음 12: 위치 형에 greetingEndNow 칸이 늘었습니다. 검토가 권한 상수 모으기(SUPPORT_STAGE_EASY · lesson-flow 의 셋 · hints 의 stage 1)는 손대지 않았습니다.
- 묶음 9: 닿는 것이 없습니다.

## 우려
- I-A 고침으로 인사 끝 막힘 말 행 뒤 위치의 slot 이 null 이 됩니다(전에는 열린 채였음). answeredSlot 은 그대로라 greetingEndPlan 의 답 재료는 바뀌지 않고, 기존 시험도 모두 통과합니다.
- 고정부 문장이 바뀌었으므로 고정부 캐시는 한 번 새로 만들어집니다.
