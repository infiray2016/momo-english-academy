# 회화 plan 묶음 12 fix 2 보고(라운드 2/3)

- 브리프: `task-talk-12-fix2-brief.md`, 재검토: `task-talk-12-fix1-review.md` 2절.
- 고친 파일은 `tests/e2e/talk-lesson.spec.ts` 하나다. src · seed 는 손대지 않았다. `diff -rq` 로 묶음 12 뒤 사본 `scratchpad/p13d-after-12/` 과 대조했고, 차이가 없었다.
- 상태는 DONE 이다. e2e 는 이 Mac 에서 돌지 않아 정적으로만 확인했다.
- 대신 고친 질문 · 선택지를 검토자의 재현 방법으로 다시 돌렸다. 시험 시드 devSeedTree 의 어휘 · 형태 표로 checkLowLevelQuestion · checkChoices 를 불렀다.
  - 스크립트: `scratchpad/fix2/probe.ts`
  - 출력: `scratchpad/fix2/probe-out.txt`
  - 결과: 다섯 자리 모두 ok 였다.

## 1. 자리별 처리

새 도우미 `choicesOf`(`:87`)를 더했다. 선택지 둘은 `I like <카드 필수 1 노리는 단어>.` · `I like it.` 이다(3단계 견본은 'I like pababa.'). 가짜 응답에는 `card_item: { kind: "required", no: 1 }` 를 함께 둔다. required-utterance AC-23f 와 같은 차림이다.

| 번호 · 옛 줄 | 시험 | 바꾼 꼴(지금 줄) | 대조한 서버 규칙 |
|---|---|---|---|
| N-2 · 390 · 397 | AC-15q · AC-15p · AC-15l 소리 줄 · 힌트 | 가짜 응답의 model_line 을 뺐다. 단언은 `[data-sound-listen="answer"]` 이다(`:401`). 카드 답 예시 `card.required[0].answerExample` 이 말풍선 · 기록 글에는 없고 읽은 글에는 있는지 본다 | 첫 막힘 STAGE_TOGETHER + 1~3단계 + 답 예시는 카드 자리 · `soundAnswer`(`lesson-flow.ts:819~826`, `:694` role answer). AI 소리 줄은 AI 차례만이다(`lesson-turn.ts:1036~1040`). 화면 표지는 `tori.tsx:672` data-sound-listen={kind}. 설계 시험은 `talk-lesson-flow.test.ts:294` |
| N-1 · 470 | AC-15f 이어 하기 | 응답을 'Wow, me too! What do you like?' 로 바꿨다(`:482`). 질문 글도 다시 열기 뒤 말풍선 단언에 쓰므로 질문을 범위 안으로 바꾸는 쪽을 택했다 | 질문 검사 `question-check.ts:216~224`(범위 `:169~181`), 걸리면 카드 자리 `lesson-turn.ts:1017~1031`. 재현: ok |
| N-1 · 499 | AC-N8 · AC-N10 맞장구 | 응답을 'Oh, nice! Do you like it?' 로 바꿨다(`:512`). 같은 까닭으로 질문 쪽을 택했다(`toContainText(reply)` 그대로) | 같음. 재현: ok |
| N-2 · 671 | AC-15q 선택지 ①② | 막힘 턴을 말로 답한 AI 질문 차례로 바꿨다. 아이는 카드 답 예시를 말하고, 응답은 'Nice! Do you like it? Listen and say!' 에 choicesOf · `support: "choices"` · `next_move: "follow_up"` · card_item 필수 1 을 둔다(`:668~683`). 뒤 단언(①② 두 개 · 선생님 쪽 글에 없음 · Or 없음 · ① 다시 읽기)은 그대로다 | 말로 답한 차례는 AI 질문(`lesson-flow.ts:881~907` answeredPlan). 선택지 유지 조건은 `talk-lesson.ts:1236~1244`(1~3 · asks · checkChoices), 노리는 단어는 card_item(`:1210 · :1233~1235`). checkChoices `question-check.ts:251~264`(offband · shape · no_target). 겹침 판정 `spoken.ts:55`: 'Do you like it?' 은 'I like it.' 을 낱말 경계로 담지 않는다. 재현: ok |
| N-1 · N-2 · 730 | AC-15q 회색 '못 들었어요' | 첫 응답을 'Nice! Do you like it?' + card_item 필수 1 로 바꿨다(`:727`). 그래서 그 자리의 답 예시가 카드 답 예시가 된다. 막힘 응답의 model_line 을 빼고, 단언은 `[data-sound-listen="answer"]` 로 바꿨다(`:747`) | 자리의 답 예시는 card_item 의 answerExample 이 먼저다(`lesson-flow.ts:173~195` slotOf). 첫 막힘은 위 N-2 와 같은 갈래다. 재현: 질문 ok |
| N-1 · 806 | N3 듣는 동안 단추 끔 | 선택지를 choicesOf + card_item 필수 1 로 바꿨고(`:823~826`), 질문을 'Do you like it?' 로 바꿨다 | checkChoices offband · no_target(재검토 재현에서 걸린 두 까닭). 재현: ok |

손대지 않은 자리:
- `:253` 은 검토에서 닫혔다.
- `:616` 의 'Wow! What do you do on Sunday?'(AC-15q 기록 칸 다시 읽기)는 반응 첫 문장 'Wow!' · 'Cool!' 만 단언한다. 질문이 카드 질문으로 바뀌어도 걸리지 않는다. 둘째 응답의 'games' 는 아이가 그 턴에 말한 낱말이라 범위 안이다.
- `:426` AC-15g 는 검토가 판정을 보류했고 이번 범위 밖이라 그대로 두었다.

## 2. 관문

| 관문 | 결과 |
|---|---|
| biome ci | 575 파일, 0 |
| tsc --noEmit | 빈 출력 |
| 단위 `pnpm test` | 142 파일, 1781 통과 · 6 todo(전과 같음) |

출력은 스크래치패드 `fix2-biome.txt` · `fix2-tsc.txt` · `fix2-unit.txt` 에 있다.

## 3. 우려

1. 재현은 질문 · 선택지 검사 함수만 돌린 것이다. 화면까지의 흐름은 CI 첫 실행에서 확인된다. 화면 흐름이란 소리 줄 kind answer 표지가 읽기를 마쳐 보이는 것, 선택지 ①② 가 그려지는 것을 말한다.
2. 반응 문장('Nice!' · 'Wow, me too!' 등)은 질문이 아니라 범위 검사를 받지 않는다는 재검토의 판단에 기댔다.
3. `:426` AC-15g 는 첫 막힘 카드 자리 차례에서 설명 칸이 남는지가 아직 확인되지 않았다(재검토 3절과 같음).
