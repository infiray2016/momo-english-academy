# 구현 보고: 회화 plan 묶음 5 — 흐름 핵심 순수 모듈(2026-10-30 08:4x, 구현자 impl-talk-5 · Opus · high)

상태: DONE_WITH_CONCERNS(우려는 끝 절). 워크트리 `.claude/worktrees/p13d`, 새 파일만 만들었고 묶음 3 의 파일(`src/core/seed/schema/*` · `structure.ts` · `check-*.ts` · `validate.ts` · `flow.ts` · `calls/talk.ts` · `src/server/conversation/*` · `src/components/conversation/*` · 시험 builders)과 다른 손의 파일은 고치지 않았다. 커밋 · push 없음.

## 새 파일(모두 신규)

| 파일 | 줄 | 무엇 |
|---|---|---|
| `src/core/conversation/move.ts` | 165 | TalkMove Zod(판 1) · 만들기 · 읽기 · eraseTalkMoveText · 열거(종류 · 까닭 · 아이 차례 까닭 · 서버가 붙인 도움) |
| `src/core/conversation/question-check.ts` | 214 | 같은 질문 글 꼴 · 화면 글의 물음표 문장 · 같은 질문 되풀이 막기 · 1~3단계 AI 질문 검사 · 소리 줄(따라 할 말 · 선택지) 검사 |
| `src/core/conversation/lesson-turns.ts` | 159 | 공용 형(talk_turns 가벼운 꼴 · 흐름이 읽는 카드 · 단계 규격 칸) · 아이 차례 까닭 · 설정 읽기(제안 밖 새 파일, 아래 '다르게 한 것' 1) |
| `src/core/conversation/chances.ts` | 304 | 남은 기회 · 학습 기회 제공 수 · 다 다룸 · 돌아오기 알림 · 붙일 가장 앞 기회 · 대신 질문 · 짧은 준비 낱말 |
| `src/core/conversation/lesson-flow.ts` | 930 | 위치 되짚기 · 인사 끝 토막 판정 · 다음 선생님 차례 계획(종류 · 까닭 · 붙일 줄 · 받침 단계) · 두 계획 · move 만들기 |
| `src/core/conversation/ending.ts` | 116 | 참여가 거의 없음 · 끝난 길 · '그만하기' 처리 · 친한 정도 |
| `tests/fixtures/talk-lesson.ts` | 162 | 3 · 4단계 새 꼴 카드 보기 견본 · 턴 만들기 · 시험용 설정 읽기(묶음 3 builders 와 따로) |
| `tests/unit/talk-{move,question-check,chances,lesson-flow,ending}.test.ts` | 98 · 225 · 342 · 754 · 193 | 증명 표 단위 몫 |

## 내보낸 함수(입력 → 출력)

move.ts
- `talkMoveOf(input: { kind, ...선택 칸 })` → `TalkMove`(:115). 빈 칸은 기본값이고 sound · floor · prep 은 값이 있을 때만 칸을 둔다.
- `readTalkMove(value: unknown)` → `TalkMove | null`(:146). 비었거나 꼴이 틀리면 null.
- `eraseTalkMoveText(move)` → `TalkMove`(:156). sound 를 통째로, suggest.goals[].why 만 지운다.

question-check.ts
- `questionKeyOf(text)` → 글 꼴(:18, flow.ts normalizeSpoken 그대로). `isClosingQuestion(text)`(:25). `questionsOfText(text)` → 물음표 문장 목록, 마무리 물음 뺌(:30).
- `sameQuestionHit({ question, blocked, asked, max })` → `"after_stuck" | "max" | null`(:43). 마무리 물음은 세지 않는다.
- `checkLowLevelQuestion(sentence, LowLevelLineOptions & { targets })` → `{ ok } | { ok: false, reason }`(:165). 차례는 비었음 · 길이 · 노리는 단어(A4-03) · 어휘(단계 범위 · 단원 단어 · 아이가 말한 낱말 · {NAME} · 선생님 이름) · 형태다.
- `checkSoundLine(line, options)`(:179) · `checkChoices(pair, options & { targets })`(:200). 선택지는 같은 꼴에 낱말 하나만 다르고 하나는 노리는 단어다.

lesson-turns.ts
- 형: `TalkLessonChildTurn { segment, input, stuck, nospeech, koQuestion?, targets }` · `TalkLessonTeacherTurn { text(화면 글 줄), move, answerExample? }` · `TalkLessonCard`(TalkCard 의 Pick) · `TalkLessonItem`(TalkRequired 의 Pick) · `TalkLessonSpec`(TalkLevelSpec 의 band · targetTurns · koMeaning).
- `childCauseOf(row)` → `"button" | "stuck" | "nospeech" | null`(:42).
- `talkLessonSettingsFrom(read, band)` → `TalkLessonSettings`(:132). 읽는 키는 talk.dontknow_max · floor_after_stuck · follow_child_turns · same_question_max · required_gap_turns · reask_per_word · prep_offer_stuck · more_talk_round_turns · prep_words.<구간> · prep_mode.<구간> 과 speech.silent_items_max 다. 없거나 꼴이 틀리면 던진다.

chances.ts
- `talkChancesOf({ card, newWords, turns, carry, missionsDone, settings })` → `TalkChances`(:90). 칸은 carry · required[{no, targets}] · reuse · introduce · notIntroduced · missions · prepared · offered · allDealt · aiWithoutChanceRun · returnNudge 다.
- `slotChanceOf({ card, chances, blocked, asked?, max? })` → `{ kind, no } | null`(:196). 남은 필수 질문을 먼저, 그다음 다시 쓰기가 남은 낱말을 노리는 더 이야기할 거리를 고른다. 이월은 붙이지 않는다.
- `oldestMoreOf({ card, turns, blocked, ... })`(:220)는 정한 것 18 의 대신 질문이다. `cardItemOf(card, ref)`(:247).
- `startPrepWordsOf({ card, carryWords, unitWords, known, count })`(:266) · `stuckPrepWordsOf({ stuckTargets, pool, count })`(:290).
- `isSupportMove(move)` · `opensSlot(row)`(:50 · :55). 받침 첫째 · 둘째 행은 질문 자리를 잇는다.

lesson-flow.ts
- `talkLessonPositionOf(LessonArgs)` → `TalkLessonPosition`(:195). 입력은 spec · card · newWords · turns · segment · settings · carry? · missionsDone? · prepOpened? 이다.
- 위치 칸: phase · greetingIndex · lastGreetingQuestion · slot · answeredSlot · stuckInSlot · streak · floorDue · silentRun · silentBlocked · flashDontKnow · lastCause · talkCount · moreCount · moreRound · moreInRound · turnsLeft · childTurns · followRun · choice(closing · suggestion) · closingAsked · closingAnswered · prepOpened · prepPending · firstQuestionDue · askedQuestions · reachedNow · roundEndedNow.
- `lessonTurnSegmentOf(position, "speech" | "button" | "nospeech", settings)` → 회화 턴 토막(:388).
- `nextTeacherTurnOf(LessonArgs)` → `TeacherTurnPlan`(:820).
  - 계획 칸: kind · segment · callsAi · aiAsks · why · cause · stage · streak · item · words · goals · attach[] · app[] · blocked · stuckQuestion · easyFallback · answerFallback · openPrep · followRun · turnsLeft · chances.
  - attach 줄 종류: question(greeting · card · easy) · sound(answer) · answer_example · closing · app_line.
- `teacherTurnPlansOf(args, child)` → `{ ifAnswered, ifStuck }`(:858). 말 입력은 stuck 칸이 응답 첫 칸이라 두 경우를 함께 낸다.
- `teacherMoveOf(plan, ai)` → `TalkMove`(:902). 카드 자리는 계획의 항목을, AI 차례는 응답의 항목 · 노린 것을 쓴다. 1~3단계 소리 줄은 sound.answer 로, 대화 중 연 준비는 prep 으로 간다.
- `NOW_LETS_TALK`(:53).

ending.ts
- `talkNearlySilent(turns)` → boolean(:18). 대화 · 더 이야기하기 토막에 말이고 막힘이 아닌 아이 턴이 없다는 뜻이다. 한국어 질문 턴은 빼고, 숫자 입력은 없다.
- `talkEndOf({ path })` → `{ outcome, reason, stars, friendship }`(:62). path 는 closing_question · floor · stop · suggestion · stop_confirmed · stop_cancelled · interrupted 다.
- `talkStopOf({ turns, closingAnswered, suggestion })`(:87). 마무리 물음에 답했으면 closing_question 이고, 참여가 거의 없으면 confirm 이며, 그 밖은 stop 또는 suggestion 이다.
- `talkFriendshipAfter(end, state, rules)`(:104). 참여 완료일 때만 friendshipAfter 를 부른다.

## move 꼴(판 1, plan '이름' 절 표 그대로)

```
{ v: 1, kind: first_question|ai|card_slot|closing_slot, why: follow_cap|question_check|same_question|support|cut|fail|null,
  next: TALK_NEXT_MOVES, item: { kind: required|more|none, no }, goals: [], words: [],
  stage: 0..3, cause: button|stuck|nospeech|null, streak: n,
  app: [together|easy_question|choices|model_line|answer_example|listen|floor|prep], ai: TALK_SUPPORTS, intro: [],
  suggest: { fit, topic, asked, goals: [{ id, why }] }, linked: [], held: [],
  sound?: { model?, choices?: [a, b], answer? }, floor?: true, prep?: { words: [] } }
```
지울 때 남는 값: sound 를 뺀 모두이고, suggest.goals[].why 는 "" 가 된다.

## 시험(정본 AC 번호)

| 파일 | 건수 | AC |
|---|---|---|
| talk-move | 6 | AC-15v(꼴 · 기본값 · 거부 · 읽기 · 지움 · 두 번 지움) |
| talk-question-check | 12 | AC-15r(글 꼴 · 물음표 문장 · 막힌 뒤 · 상한 · 마무리 물음 뺌) · AC-15b(범위 안 · 길이 · A4-03 · 형태 · 소리 줄 · 선택지) · AC-15i(범위 밖 낱말) |
| talk-chances | 14 | AC-15r(남은 목록 · 받침 줄 안 셈 · 다 다룸 · 미션 · 돌아오기 알림 둘) · AC-15i(붙일 기회 셋 · 대신 질문 하나) · 이름 없는 넷(짧은 준비 낱말 · 꺼내지 않은 새 단어) |
| talk-lesson-flow | 33 | AC-15g(받침 셋 · 막힘 말 · 셈 0 · AI 질문 자리 · 4단계 · 들리지 않음 셈 · 막힘 화면) · AC-15i(따라가기 상한 둘) · AC-15r(AI 차례 · 기회 때문의 카드 자리 없음) · AC-15s(들리지 않음 닫기 · 반짝임 · 4단계) · AC-15t((가)~(마) 단위 몫: 마무리 자리 · 앞당기지 않음 · 다 다룸 · 고르기 · 한 번 더 · 마무리 제안) · AC-15v(move 만들기) · 이름 없는 아홉(토막 · 짧은 준비 (나) · 두 계획 · 형 이음) |
| talk-ending | 13 | AC-15t((가) · (나) · (다) · (라) · 마무리 물음 뒤 그만하기 · 진행) · AC-16a(친한 정도 둘) · 이름 없는 둘(바닥선 끝 · 인사 턴) |

시험을 먼저 써서 다섯 파일 모두 '모듈 없음'으로 실패하는 것을 본 뒤 구현했다.

## 관문(08:4x, 워크트리, Node 24)

```
pnpm vitest run (새 다섯)      Test Files 5 passed · Tests 78 passed
pnpm test                      Test Files 132 passed · Tests 1605 passed | 6 todo
pnpm lint                      Checked 546 files · No fixes applied(오류 0)
pnpm check:deps                no dependency violations found
pnpm check:ids --fail-on …(CI 목록) --design-number-max 49   종료 0 · 위반 0 · design-number 47(변화 없음)
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec [--plan 본 저장소 회화 plan]   종료 0 · unknown-ac 0 · plan-ac-not-in-spec 0
grep participation_ratio(새 파일)   0
pnpm exec tsc --noEmit         새 파일 오류 0. 전체는 묶음 3 이 고치는 중인 파일 열넷에 오류가 있다(conversation-flow.test 124 · conversation-server.test 58 · e2e conversation.spec 22 · seed-viewer talk-card.tsx 15 …). 이 묶음 시작 전부터 있던 것이고 이 묶음 파일에서 온 것이 아니다
```

## 설계와 다르게 한 것 · 해석

1. **새 파일 하나를 더 두었다.** `lesson-turns.ts` 에 공용 형과 설정 읽기를 모았다. lesson-flow ↔ chances 가 서로 가져오면 순환(no-circular)이 되기 때문이다. 시험 견본 `tests/fixtures/talk-lesson.ts` 도 새로 두었다.
2. **move.why 는 비울 수 있다(null).** 1~3단계 인사 토막에서 앱이 카드 인사 질문을 붙이는 차례는 카드 자리 꼴이지만 까닭 넷에 들지 않는다.
3. **첫 인사 행도 kind first_question 이다.** 앱이 AI 없이 보이는 질문이라는 같은 뜻이고, 인사인지 대화 첫 질문인지는 토막으로 가른다.
4. **짧은 준비 (나)의 기록.** 질문을 닫고 준비를 여는 선생님 행에 move.prep {words} 와 app 'prep' 를 둔다. 준비 뒤 'Now let's talk.' + 다음 필수 질문 행은 kind first_question 이다. 이어진 막힘 셈은 그 행에서 0 이 된다. plan 표의 '대화 중 연 짧은 준비 낱말' 칸을 연 행에 둔 것이다.
5. **대신 질문을 넓혔다(13절 C194 (1), 잠정 — 첫 프리뷰에서 요청자 확인).** 1~3단계 받침 셋째 닫기와 들리지 않음 닫기에서 붙일 남은 기회가 없을 때도 가장 오래전에 쓴 더 이야기할 거리를 붙인다. 대화 중 짧은 준비 뒤 대화 첫 질문도 같다. 근거는 C194 (1)이다. 1~3단계 닫기의 '답 소리 → 다음 질문' 차례(02-2 261줄)와 소리 줄을 tori_en 뒤에 읽는 규칙(02-2 204줄)을 함께 지킬 자리가 AI 차례에는 없다. 02-2 192줄 '붙일 것이 없으면 AI 차례'의 예외이고 정한 것 18 을 넓힌다. 대신 질문도 없으면 AI 차례다(fix 1 에서 근거를 고침, 검토 I-3).
6. **인사 토막의 받침 둘째(1~3단계)는 AI 차례다.** 인사 질문 카드에는 쉬운 질문 칸이 없기 때문이다(stage 2, aiAsks).
7. **들리지 않음 이어짐(silentRun)은 아이가 단추 · 막힘 말 · 말로 응한 차례에서 끊긴다.** '이어지면'을 그 사이에 다른 아이 차례가 없는 것으로 읽었다.
8. **한국어 질문 턴(koQuestion, 변경 단위 ⑤)은 되짚기에서 건너뛴다.** 말 주고받기 · 참여 · 질문 자리에 아무 영향이 없다.
9. **첫 프리뷰 범위(정한 것 17).** 바닥선은 floorDue 로 세기만 하고 계획에 들지 않는다. 1단계 첫 꼴(선택지 ①② · 꺼내기 소리 줄) · 4단계 AI 쉬운 질문 받침의 앱 바꾸기 · 미션 체크 · 역할 바꾸기는 넣지 않았다. 4단계 받침 둘째는 easyFallback(카드 쉬운 질문)만 계획에 싣는다.
10. **'다 다룸'의 뜻.** 필수 질문을 다 다뤘고, 미션을 다 해냈고, 새 단어마다 처음 다룬 차례에 다시 쓰기 talk.reask_per_word 번이 지났다는 뜻이다. 꺼낸 턴은 처음 다룬 차례로 센다. 기회 알림의 '꺼낼 새 단어'(introduce)는 짧은 준비에 없고 아직 아무 질문도 노리지 않은 낱말이다. 대화 중 짧은 준비 후보(notIntroduced)는 물은 낱말도 든다. 막힌 질문의 낱말이 후보에서 빠지지 않게 둘을 갈랐다.
11. **끝난 길 함수는 3.3 표의 줄만 다룬다.** safety(80턴) · idle · resting · aborted 의 지금 길은 closing.ts 에 그대로 두었고 묶음 7 이 잇는다. '홈' · 앱 닫음 · 'AI 쉬는 중'은 interrupted(진행)이다.
12. **AC-15g 의 '1~4단계 한국어 설명 · 힌트 마지막 단'은 이 묶음에서 다루지 않았다.** 그 판정은 hints.ts 몫이라 묶음 3 뒤로 남겼다(아래). 위치의 stuckInSlot 이 재료다.

## 묶음 3 뒤 할 것

- **형 바꾸기.** `lesson-turns.ts` 는 묶음 3 의 형을 형 이름으로만 쓴다. TalkLessonItem = Pick<TalkRequired, no · en · ko · targets · goals · answerExample · easyQuestion> 이고, TalkLessonCard = Pick<TalkCard, greetingTurns · greeting · prep · missions> + required · more 다.
  - 묶음 3 이 Approved 되면 두 형을 `TalkCard` 그대로 쓰도록 한 줄씩 바꿀 수 있다(선택).
  - 칸 이름이 바뀌면 이 두 줄만 고친다.
  - 시험 '새 꼴 카드 · 회화 단계 규격이 흐름 입력 형에 그대로 들어간다'(expectTypeOf)가 어긋남을 tsc 에서 잡는다.
- **flow.ts → spoken.ts 옮김(이번에 안 함).** normalizeSpoken · sayingAnswer · createAnswerHold · shownTurnOf · toriKoShownOf 를 옮긴다. 옮기면 `question-check.ts:4` 와 `lesson-flow.ts` 의 `@/core/conversation/flow` 가져오기(normalizeSpoken · MORE_PROMPT)와 시험 `talk-lesson-flow.test.ts` 의 MORE_PROMPT 가져오기를 바꾼다. MORE_PROMPT 는 묶음 12 가 옛 흐름을 지울 때 새 자리로 옮겨야 한다.
- **hints.ts · wrap-up.ts · said.ts 의 새 갈래(이번에 안 함).** 고칠 몫은 셋이다. 기존 파일이라 이 묶음의 '새 파일만' 밖이고, 이 묶음 모듈이 쓰지 않아 뒤로 남겼다.
  - 카드 항목 힌트(TalkLessonItem 의 hintKo · hints, 걸리면 '힌트' 단추 없음)와 1~4단계 첫 막힘 · 5단계 둘째 막힘 한국어 설명, 둘째 막힘부터 마지막 단 열기.
  - 1~3단계 정리 한 번.
  - 서버가 붙인 소리 줄(move.app answer_example · together · choices · model_line)을 들은 턴의 힌트 종류 '영어'.

## 남은 우려

1. **(Important) 질문 자리를 화면 글에서 읽는다.** 같은 질문 셈과 막힌 질문은 선생님 행 text 의 물음표 문장에서 읽는다. 서버(묶음 8)가 text 에 '화면에 글로 나온 줄만' 둔다는 정한 것 5 를 지켜야 맞다.
  - 1~3단계 카드 질문이 소리로만 나가면 셈에서 빠진다.
  - 걸려서 지운 AI 질문이 text 에 남으면 셈에 든다.
  - 통합 시험(묶음 8)에서 함께 본다.
2. **(Important) 막힘 판단 전에 토막을 정한다.** 말 입력 턴의 막힘(stuck)은 응답 첫 칸에서야 안다. 그래서 인사 끝 토막 판정은 말이면 '인사 끝'으로 본다(옛 흐름과 같다). 사용자 메시지의 받침 단계는 teacherTurnPlansOf 의 두 계획을 함께 알리는 꼴을 묶음 6 · 8 이 정해야 한다.
3. **(Minor) 1~3단계 AI 질문 자리의 같이 말하기.** 그 차례 답 예시(talk_turns.ai_question 의 답 예시)를 읽는다. 새 응답 꼴에서 이 값을 어디에 둘지는 묶음 6 · 7 몫이다. 값이 없으면 AI 차례로 둔다.
4. **(Minor) 짧은 준비 시작 여부는 입력으로 받는다.** 인사 뒤 준비를 했는지(prepOpened)는 attempts 의 talk-prep 시도로 알 수 있어 서버가 넘긴다. 바닥선 (가)도 이 입력으로 들어온다.
5. **(Minor) 시험 견본은 실시드가 아니다.** `tests/fixtures/talk-lesson.ts` 의 3단계 카드는 흐름이 읽는 칸만 둔 작은 견본이다. 실시드(묶음 4)가 적재되면 통합 시험에서 실제 카드로 다시 본다.
