# fix 1 보고: 회화 plan 묶음 6 — 회화 턴 호출 새 꼴(구현자 · Opus · high, 2026-10-30 09:5x)

상태: DONE. 검토 `task-talk-6-review-report.md`(Important 3 · Minor 4)를 모두 고쳤다. 고친 파일은 묶음 6 범위 다섯(`src/core/ai/calls/talk-lesson.ts` · `tests/unit/talk-lesson-call.test.ts` · `tests/fixtures/ai/talk-lesson-inputs.ts` · 표본 `talk_turn.v2-*.json` · `tests/contract/ai-schemas.test.ts` 의 v2 갈래)뿐이다. 커밋 · push 없음.

순서: 새 시험을 먼저 썼다. 단위 13건이 실패하는 것(`talkCallTurnOf is not a function` 7건 · 고정부 글 2건 · 인사 끝 칸 · M-1 · M-2 · M-3 · 메시지 줄 1건)과, 계약 3건이 실패하는 것(표본 이름 · l3-nospeech model_line · 표본 없음)을 본 뒤 구현하고 표본을 다시 만들었다.

## 지적별 고친 곳(줄은 고친 뒤 talk-lesson.ts)

| 지적 | 고친 곳 | 내용 |
|---|---|---|
| I-1 막힘 계획 | 138 `TalkCallStuckPlan` · 185 `ifStuck` · 377 `talkCallTurnOf` · 442 `chosenCallTurnOf` · 827 `planLines` · 678 고정부 · 1166 정규화 · 1436 걸린 칸 바꾸기 | 묶음 5 `TeacherTurnPlan`(kind · aiAsks · stage · cause · stuckQuestion · answerFallback · attach · chances · followRun · turnsLeft · app)을 호출 입력으로 옮기는 함수 하나(`talkCallTurnOf({ plan, ifStuck, … })`). 말 입력 턴이면 ifStuck 계획도 싣고(그 밖은 null), 사용자 메시지에 'If stuck, Turn / Question / Card line / Support stage / Stuck question' 다섯 줄을 늘 넣는다. 고정부 'Decide stuck first … follow the If stuck lines'. 정규화 · 걸린 칸 바꾸기는 `chosenCallTurnOf(turn, a.stuck)` 로 고른 계획의 종류 · 질문 여부 · 답(stuckAnswer)을 따른다. 1~3단계 막힘 계획(카드 자리)을 고르면 AI 따라 할 말 · 다음 질문 칸이 비어 카드 답 소리와 겹치지 않는다. 막힘이면 아이가 보인 능력 · 알맞은 응답 · 미션도 받지 않는다(3.8 '막힘이 아니고') |
| I-2 질문 없는 AI 차례 | 172 `aiAsks` · 451 `asksNext` · 680 고정부 · 476 tori_en 설명 · 1166~1250 정규화 | `aiAsks`(묶음 5 이름 그대로)를 호출 입력에 두고 메시지에 'Question: yes/no' 줄. 고정부 'When Question: no, do not ask any question'. 정규화는 질문을 쓰는 차례(AI 차례 · aiAsks · 평가 대화 · 바닥선 · 인사 끝 밖)에서만 갈래 · 카드 항목 · 노린 목표 · 힌트 묶음 · 선택지를 남긴다 → 묻지 않은 필수 질문이 move 에 옮겨져 '다룸'이 되는 길이 막힌다 |
| I-3 1~3단계 받침 표본 · 고정부 | 712 · 722 고정부, 표본 · 견본 입력 | 1~3단계 규칙 'in support turns and after nospeech the app plays the answer and adds the easier or next question; when Turn is card_slot, write only a short reaction or cue …'(AI 차례면 답은 model_line 에). 공통 받침 줄은 단계 뜻만 두고, 답 · 쉬운 질문을 쓰는 몫은 'Level 4 and above: at Support stage 1 … 2 … 3 and after nospeech …'로 좁혔다. 들리지 않음 줄에서 '답을 말하라'를 뺐다(1~3단계 카드 자리와 부딪침). 표본 셋(l3-nospeech · l3-support-together · l3-support-easy)과 l3-support-close 의 입력을 카드 자리(aiAsks 거짓, 들리지 않음 · 닫기는 카드 줄 required 2 — C194 (1), 쉬운 질문은 카드 쉬운 질문 줄)로 바꾸고 기대를 model_line '' · choices 0 · 갈래 none 으로 바꿨다 |
| M-1 | 1180 · 1159 부근 | 꺼낸 새 단어를 tori_en 과 AI 의 원래 model_line 으로 먼저 거르고, 따라 할 말 대체 글은 거른 목록에서 고른다(probe 의 'Sunday.' 길 없어짐) |
| M-2 | 476 · 711 | tori_en 설명 'On AI turns with Question: yes … Otherwise only a reaction'. 1~3단계 'Your question is the last question sentence of tori_en; a cue like Listen and say! may come after it' |
| M-3 | 1039 `cardItemOf` · 1194 `choiceTargets` | 선택지의 노리는 단어 = 정규화한 next_targets + 정규화한 card_item 의 카드 targets |
| M-4 | 시험 | AC-19d 가 첫 규칙 줄을 05:31 블록 문장(미나 · 견본 성격 글을 넣은 글자)과 문자열로 비교한다(`teacherBlockOf` 를 기대값으로 쓰지 않음) |

곁들인 바뀜: `TalkCardLine` 에 `role`(card · easy · greeting, 묶음 5 TeacherAttachLine 그대로)을 더하고 kind 에 none 을 받는다(인사 질문 줄). 메시지 'Card line' 글은 `required 2: …` · `easy question for required 1: …` · `greeting: …`.

## 표본(12 → 18)

바꾼 것 넷: l3-support-together · l3-support-easy · l3-support-close · l3-nospeech(모두 카드 자리, AI 가 잘못 채운 따라 할 말 · 선택지 · 다음 질문을 정규화가 비움). 새로 여섯: l3-speech-stuck · l3-speech-answered(같은 3단계 막힘 계획, stuck 참 · 거짓), l4-speech-stuck · l4-speech-answered(4단계 막힘 계획은 묻지 않는 AI 차례), l4-support-together(묻지 않는 AI 차례 — 갈래 · 카드 항목 · 힌트 빈 값), l4-nospeech(4단계는 AI 가 답 · 다음 질문, 카드 항목 more 1 남음). 18개 모두 엄격 규격 결과 · 정규화 기대를 표본 안에 적었다.

## 시험 이름

`tests/unit/talk-lesson-call.test.ts`(25 → 38): 새 describe '묶음 5 차례 계획 → 호출 입력(talkCallTurnOf, 검토 I-1 · I-2)' 열 — 계획 칸 옮기기 / 들리지 않음 닫기 카드 자리(C194 (1)) / AI 를 부르지 않는 계획은 던짐 / AC-15k If stuck 줄 · '모름' 턴엔 없음 / 말 입력이 아닌 턴의 막힘 계획은 받지 않음 / 고정부 stuck 먼저 · Question: no / stuck 참이면 막힘 계획으로 정규화 / 4단계 같이 말하기 aiAsks 거짓 · 칸 비움 / 인사 끝 · 바닥선 칸 비움 / 1~3단계 받침 카드 자리 규칙. 'fix 1 Minor' 셋 — AC-15c M-1 / M-2 / AC-15c M-3. 바꾼 것: AC-19d(M-4), AC-15k 메시지 줄(Question 줄 더함). 계획 시험은 묶음 5 의 `nextTeacherTurnOf` · `teacherTurnPlansOf` 와 그 견본(`tests/fixtures/talk-lesson.ts`)을 그대로 불러, 묶음 5 계획의 뜻이 바뀌면 이 시험이 잡는다.

`tests/contract/ai-schemas.test.ts` v2 describe(4 → 5): 표본 덮기 목록에 새 여섯, 새 시험 '1~3단계 받침 · 들리지 않음 표본은 카드 자리이고 정규화 뒤 AI 의 따라 할 말 · 선택지 · 다음 질문이 남지 않는다(02-2 259~261줄 · C194 (1))'.

## 관문 결과(2026-10-30 09:4x~09:5x, Node 24)

| 명령 | 결과 |
|---|---|
| `pnpm vitest run tests/unit/talk-lesson-call.test.ts tests/contract/ai-schemas.test.ts` | 65 passed · 6 todo |
| `pnpm test`(단위 전체) | 137 files · 1699 passed · 6 todo, 실패 0 |
| `pnpm tsc --noEmit -p .` | 묶음 6 파일 오류 0. 다른 손 파일 1건: `tests/unit/conversation-server.test.ts(105,3)` TS2719(talk_turns 행 형 둘 — 묶음 7 의 db 스키마 move 칸 작업 중). 앞선 실행에서는 5-나의 `talk-lesson-hints` · `talk-lesson-wrap` · `talk-chances` · `talk-lesson-flow` 시험 형 오류도 보였다가 다시 돌릴 때 없어졌다(작업 중) |
| `pnpm lint` | 실패 1건: `src/core/seed/structure.ts` format(묶음 7 이 TALK_SEGMENTS 를 고치는 중). 묶음 6 파일 22개만 `biome check` 하면 고칠 것 없음 |
| `pnpm check:deps` | no dependency violations(281 modules) |
| `pnpm check:ids --fail-on …(CI 꼴) --design-number-max 49` | 종료 0(design-number 47) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0 |
| 검토자 probe(`scratchpad/probe6/probe.ts`) | 인사 끝 · 바닥선 칸 none · [], M-1 new_words [] · model_line '', 고정부 새 줄 확인 |

`tests/unit/talk-lesson-call.test.ts` 의 4단계 흐름 견본에 `prepWords: []` 를 넣었다(5-나가 LessonArgs.prepWords 를 필수로 바꿈).

## 남은 우려

1. 이 묶음은 묶음 5 의 `TeacherTurnPlan`(lesson-flow.ts) · `TeacherAttachLine` 의 question 줄 꼴(role · item · en)에 형으로 기댄다. 5-나가 이름을 바꾸지 않는다고 했으나 attach 의 question 줄 꼴이 바뀌면 `cardLineOf` 를 고친다. 5-나 · 묶음 7 이 끝나면 tsc · lint 전체를 다시 본다.
2. 바닥선은 계획 `app` 에 floor 가 있을 때로 읽는다. 묶음 16(바닥선)이 계획에 다른 칸을 두면 `talkCallTurnOf` 의 floor 한 줄을 바꾼다.
3. 1~3단계에서 붙일 기회가 전혀 없을 때(묶음 5 가 들리지 않음 · 닫기를 AI 차례로 남기는 길)는 고정부 'When Turn is ai after a stuck or nospeech turn, put the answer to say in model_line'로 덮었다. 이때 답 소리가 새 질문 뒤에 읽히는 차례 문제(02-2 261줄)는 남는다. C194 (1) 로 대신 질문이 늘 있어 실제로는 생기지 않을 것으로 보지만, 더 이야기할 거리가 하나도 없는 카드에서만 생긴다.
