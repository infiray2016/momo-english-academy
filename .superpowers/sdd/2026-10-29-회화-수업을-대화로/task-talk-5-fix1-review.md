# 재검토 보고: 회화 plan 묶음 5 fix 1(범위 한정)

검토자 rev-talk-5(Opus · xhigh), 2026-10-30 09시대입니다. 볼 것은 첫 검토(`task-talk-5-review-report.md`)의 지적과 fix 1 이 새로 들인 것뿐입니다. 작업 트리와 문서는 고치지 않았습니다. 파일 경로는 워크트리 `.claude/worktrees/p13d` 기준입니다. 단위 시험은 다시 돌리지 않았습니다. 묶음 3 형과의 맞춤은 `pnpm exec tsc --noEmit` 로 확인했고(종료 0), 고친 갈래는 스크래치패드 `rev5/probe3.mts`(tsx, 순수 함수만)로 값을 봤습니다.

**판정: Approved.** Important 넷과 Minor 여섯이 모두 ADDRESSED 입니다. fix 가 새로 들인 것은 Minor 둘(N-1 · N-2)이고, 컨트롤러가 직접 고치거나 '5-나'에 넣으면 됩니다.

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 1~3단계 대화 중 준비의 답 | ADDRESSED | `src/core/conversation/lesson-flow.ts:750-752` 가 1~3단계면 `soundAnswer` 를 붙입니다. probe: 3단계 · when_needed · 인사 뒤 준비 없음 · 단추 둘 → `attach: [{kind:"sound", role:"answer"}]`. 시험 `tests/unit/talk-lesson-flow.test.ts:527-543` 이 attach 에 answer_example 이 없음과 teacherMoveOf 결과의 sound.answer · prep.words 를 단언합니다. |
| I-2 실제로 보인 준비 낱말 | ADDRESSED | `src/core/conversation/chances.ts:107-113` 이 인사 뒤 준비 낱말(prepShown)과 선생님 행 move.prep.words 만 빼고, 카드 Pick 에서 prep 를 뺐습니다. probe: 같은 경우의 openPrep 가 `["play","soccer","sunday"]`(막힌 낱말 play 가 맨 앞)입니다. 시험은 기회 쪽 둘(`tests/unit/talk-chances.test.ts:285-307`)과 흐름 쪽 셋(`talk-lesson-flow.test.ts:527-569`)이 (가) · (나)를 각각 봅니다. 묶음 8 이 넘길 값은 N-2 를 보세요. |
| I-3 대신 질문 넓힘 | ADDRESSED | 본 저장소 정본 `specs/10-결정-기록.md:364` C194 (1)(잠정, 첫 프리뷰에서 요청자 확인)이 받침 셋째 닫기 · 들리지 않음 닫기 · 대화 중 준비 뒤 대화 첫 질문을 02-2 192줄의 예외로 적었고, p13d 사본에도 같은 줄이 있습니다. 주석 셋(`lesson-flow.ts:581-586 · 790 · 806-809`)과 구현 보고 해석 5(`task-talk-5-report.md:103`)가 그 근거와 글이 맞습니다. 코드는 그대로입니다. |
| I-4 그 차례의 질문만 셈 | ADDRESSED | `src/core/conversation/question-check.ts:37-56` 의 turnQuestionOf 가 AI 차례 · 대화 첫 질문 · move 없는 행은 마지막 물음표 문장, 카드 자리 · 마무리 자리는 끝 문장이 질문일 때만 돌려줍니다. 되짚기(`lesson-flow.ts:238-244`)가 asked 와 질문 자리 questions 에 그 하나만 넣습니다. probe: 'Cool! Really? Question n?' 세 번 뒤 asked 에 really 가 없습니다. 시험은 question-check 둘(`:75-100`)과 흐름 둘(`talk-lesson-flow.test.ts:573-606`, 셈 · blocked · stuckQuestion · 카드 자리 · 마무리 자리)입니다. |
| M-1 인사 끝 닫기의 답 소리 | ADDRESSED | greetingEndPlan(`lesson-flow.ts:703-723`)이 까닭이 있으면 1~3단계는 인사 답 소리 줄 · 카드 자리, 4단계부터는 AI 차례에 answerFallback 을 싣고 카드 질문은 붙이지 않습니다(C19). 시험 `:660-710`. 막힘 말 갈래는 N-1. |
| M-2 한국어 질문 턴 | ADDRESSED | `lesson-flow.ts:290` 이 koQuestion 을 endChoice 앞에서 건너뛰고, `:885` 가 끝 행이면 none 을 냅니다. probe 와 시험 `:919-941` 이 계획 none · 고르기 차례 유지를 봅니다. |
| M-3 같은 값 상수 | ADDRESSED | `src/core/conversation/lesson-turns.ts:10 · 72` 가 TALK_LOW_BAND 를 가져다 씁니다. LOW_BAND 는 어디에도 남지 않았습니다. |
| M-4 마무리 자리 문턱 | ADDRESSED | `lesson-flow.ts:316` 이 `talkCount >= spec.targetTurns && !closingAsked` 입니다. probe: 참고 턴에 닿은 뒤 마무리 자리가 아닌 행 다음 말 턴 → closing_slot. 시험 `:909-917`. 막힌 차례 · 들리지 않음 · 한국어 질문 턴은 여전히 셈에 들지 않습니다(`:835-841`). |
| M-5 준비 뒤 이어진 막힘 | ADDRESSED | firstQuestionPlan(`lesson-flow.ts:640-641`)이 prepPending 이면 streak 0 을 싣고, 시험이 계획 · move 의 streak 0 과 callsAi 거짓을 봅니다. |
| M-6 시험 손질 | ADDRESSED | 빈 단언은 없어졌고, talk-ending 의 '(라)' 표지를 고쳤으며(`tests/unit/talk-ending.test.ts:59`), 인사 받침(`talk-lesson-flow.test.ts:613-658`) · silentRun 끊김(`:783-795`, 끊지 않으면 3 이 될 자리에서 1 을 단언) · prep 칸 · when_needed 길에 시험이 생겼습니다. AC-15n 표지도 달았습니다. 다만 3단계 when_needed 시험 둘(`:527 · 545`)의 AC-15n 표지는 AC-15n 이 4단계 고정 표본의 기준이라(정본 11절 174줄) 뜻이 넓습니다. 고칠 필요까지는 없고, 다음 손질 때 '정한 것 17' 표지로 바꾸면 더 정확합니다. |

## 2. fix 1 이 새로 들인 것

**N-1(Minor). 마지막 인사 질문에 막힘 말로 답하면 첫 막힘이어도 '닫기'(stage 3)로 기록됩니다.**
- 무엇: 말 입력은 막힘 판단 전에 토막을 '인사 끝'으로 보내므로(`lesson-flow.ts:391-404`), greetingEndPlan(`:708-721`)은 막힘 말이면 몇 번째 막힘이든 stage 3 · 답 소리 줄 · 카드 자리를 냅니다. probe: 마지막 인사 질문 · teacherTurnPlansOf 의 ifStuck → `card_slot · stage 3 · cause stuck · attach [sound "Yes, I do."]`.
- 왜: 정본 02-2:259 의 첫째 막힘은 같이 말하기입니다. 다만 토막이 이미 인사 끝이라 자리를 이어 갈 수 없으므로, 답을 한 번 들려주고 넘어가는 지금 동작이 쓸 수 있는 가장 나은 길입니다. 첫 검토 5절 (나)에서 권한 '정한 것 한 줄'이 다룰 사실과 같습니다. 문제는 주석(`:700-701` '들리지 않음 · 셋째 막힘으로 닫았으면')이 이 갈래를 말하지 않고 시험도 없다는 점입니다.
- 어떻게: 주석에 '막힘 말이면 몇 번째든 닫기'를 적고, teacherTurnPlansOf 의 ifStuck 을 보는 시험 하나를 더합니다. plan 정한 것에도 이 사실을 한 줄로 남깁니다(컨트롤러).

**N-2(Minor). 인사 뒤 준비 낱말 입력이 빠져도 조용히 '준비 안 함'이 되고, 같은 사실의 이름이 둘입니다.**
- 무엇: LessonArgs.prepWords 는 선택 칸이고(`lesson-flow.ts:81`), 없으면 `?? []`(`:218 · 875`)로 '인사 뒤 준비를 하지 않음'이 됩니다. 1~3단계 늘 준비 수업에서 묶음 8 이 이 칸을 빠뜨리면, 이미 보인 카드 준비 낱말이 기회 알림 '꺼낼 새 단어'에 다시 나옵니다(I-2 가 막으려던 결함). 같은 사실을 chances 는 prepShown, 흐름은 prepWords 라 부르고, 같은 파일의 `settings.prepWords`(`:744`, talk.prep_words 낱말 수)와 이름이 겹칩니다.
- 왜: 이 모듈은 설정에 조용한 기본값을 두지 않는다고 밝혔습니다(`lesson-turns.ts:4`). 입력도 같은 원칙이어야 묶음 8 이 빠뜨린 것을 tsc 가 잡습니다.
- 어떻게: 칸을 필수로 두고 이름을 prepShown(또는 prepShownWords) 하나로 맞춥니다.
- 묶음 8 이 넘길 값: 뜻은 주석(`lesson-flow.ts:77-81`, `chances.ts:89-91`)으로 분명합니다. 출처는 하나로 정해 브리프에 적길 권합니다. 인사 뒤 준비 토막을 실제로 지났을 때 쪽지로 보인 낱말 전부입니다(인식 실패로 건너뛴 낱말 포함, 정본 02-2:175). talk-start 스냅숏의 prepWords(plan.md:107)는 준비 전에 정한 목록이라, when_needed 수업이나 보일 낱말이 없는 다지기 수업에서는 보인 낱말과 다를 수 있습니다. 그런 수업에서 그 목록을 넘기면 I-2 (가)가 다시 생깁니다.

## 3. 묶음 3 fix 1 뒤 카드 형과의 맞춤

맞습니다. `src/core/seed/schema/talk.ts` 의 공통 칸(`:152-179`: no · en · ko · targets · goals · answerExample · easyQuestion), 카드 칸(`:223-244`: greetingTurns · greeting · prep · required · more · missions), 인사 질문 칸(`:128-136`)이 lesson-turns.ts 의 Pick 과 같습니다. 워크트리 전체 `tsc --noEmit` 이 종료 0 이라, `talk-lesson-flow.test.ts:88-92` 의 expectTypeOf(TalkCard · TalkLevelSpec 이 흐름 입력 형에 들어감)도 지금 형으로 통과합니다. 이 묶음이 chances 카드 Pick 에서 prep 를 뺀 것은 TalkCard 쪽에 영향이 없습니다.

## 4. 범위 밖 관찰

- 한국어 질문 턴 뒤에 변경 단위 ⑤ 의 한국어 도움 선생님 행이 오면, 지금 되짚기는 그 행을 보통 선생님 행으로 읽습니다. 그래서 고르기 차례가 끝나 마무리 물음 '답함'(`lesson-flow.ts:226-228 · 236`)이 되고, 질문이 있으면 새 질문 자리가 열립니다. ⑤ 를 설계할 때 그 행의 move 종류를 따로 두고 되짚기가 건너뛰게 해야 합니다. 이 묶음의 결함은 아닙니다.

## 5. 라운드 판정

**Approved(fix 1).** 남은 것은 Minor 둘(N-1 · N-2)과 표지 손질 하나이고, 묶음 3 · 6 의 파일 잠금과 겹치지 않는 새 파일 안의 일입니다.
