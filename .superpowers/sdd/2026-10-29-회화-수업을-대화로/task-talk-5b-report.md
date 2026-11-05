# 구현 보고: 회화 plan 묶음 '5-나' 앞 차례(2026-10-30 09:5x, 구현자 impl-talk-5 · Opus · high)

상태: DONE_WITH_CONCERNS. 브리프 보정대로 할 것 1 · 2, 재검토 Minor N-1 · N-2 를 했다. 할 것 4(선택)는 하지 않았고 까닭은 아래에 적었다. 할 것 3(calls/talk.ts 와 talk-lesson.ts 잇기)은 보정대로 다음 차례로 남겼다.

고치지 않은 파일은 둘로 나뉜다. 묶음 6 의 파일(`talk-lesson.ts` · 시험 · 견본 · 표본)과 묶음 7 의 파일(drizzle · db 스키마 · attempt.ts · client-listen.ts · state.ts · closing.ts · structure.ts)이다. 커밋 · push 는 하지 않았다.

시험을 먼저 써서 16건 실패와 모듈 없음 둘을 본 뒤 구현했다. 줄 번호는 워크트리 `.claude/worktrees/p13d` 의 고친 뒤 기준이다.

## 할 것 1 — flow.ts → spoken.ts(동작 그대로)

- **새 파일 `src/core/conversation/spoken.ts`(150줄)로 옮긴 이름:** MORE_PROMPT(:7) · AppendLine(:14) · normalizeSpoken(:25) · SAME_SAYING_MIN_WORDS(:42) · sayingAnswer(:55) · createAnswerHold(:72) · shownTurnOf(:101) · toriKoShownOf(:137). 안의 도우미(spokenWords · holds · AnswerPair)도 함께 옮겼다. 글자는 그대로 잘라 붙였다. 옮기기 전 flow.ts 는 스크래치패드 `flow.before-5b.ts` 에 두었다.
- **AppendLine 을 더 옮긴 까닭:** 브리프 목록에는 없다. shownTurnOf 가 이 형을 쓰고 flow.ts → spoken.ts 한 방향만 두어야 순환 가져오기가 없어서다.
- **flow.ts 다시 내보내기(:21-31):** `export { type AppendLine, createAnswerHold, MORE_PROMPT, normalizeSpoken, SAME_SAYING_MIN_WORDS, sayingAnswer, shownTurnOf, toriKoShownOf } from "@/core/conversation/spoken"` 이다.
  - flow.ts 안에서 쓰는 MORE_PROMPT · AppendLine 은 :11 에서 가져온다.
  - 쓰지 않게 된 가져오기 splitSentences · normalizeForMatch 는 지웠다.
  - 옛 가져오기(server · e2e · 통합 · 옛 단위 시험)는 고치지 않았다.
- **바뀐 가져오기:**
  - `question-check.ts:6` 은 MORE_PROMPT · normalizeSpoken 을 spoken 에서 가져온다.
  - `lesson-flow.ts:45` 와 `tests/unit/talk-lesson-flow.test.ts:20` 은 MORE_PROMPT 를 spoken 에서 가져온다.
- **동작 그대로의 증명:** 옛 시험(talk-hold · talk-repeat · conversation-flow)이 기대값을 바꾸지 않고 통과한다. 새 시험 `tests/unit/talk-spoken.test.ts` 둘은 두 가지를 본다. 첫째는 flow.ts 가 내보낸 값이 spoken.ts 의 같은 값(toBe)인지이고, 둘째는 값 표본이다.

## 할 것 2 — hints · wrap-up · said 의 새 꼴 갈래(옛 갈래는 그대로)

hints.ts(새 함수 셋, 옛 hintTiersOf · openedTierCount · hintKindOf · heardHelpOf 는 그대로)
- **`lessonHintTiersOf({ spec, item, ai, askKind })`(:194):** 카드 항목 턴이면 AI 힌트가 와도 카드 hintKo · hints 를 쓰고, 카드 항목이 없는 턴은 AI 힌트를 쓴다. 둘 다 없으면 [] 이라 '힌트' 단추가 없다.
  - 한국어 뜻 단은 규격에 있거나 다시 묻는 턴이면 맨 앞이다(C20 그대로).
  - 영어 단은 hintTiers 의 ko 밖 차례다. 쓸 수 있는 말은 영어 틀 단에 usablePhrases 개까지 붙는다. 1~3단계 영어 문장 단에는 듣기 단추를 둔다.
- **`koExplanationShownOf({ level, stuckInSlot, cause })`(:243):** 단추 · 막힘 말 차례에서만 한국어 설명을 보인다. 1~4단계는 첫 막힘부터, 5단계부터는 둘째 막힘부터이고, 들리지 않음과 말로 답한 턴은 거짓이다.
  - 단계 경계 4 와 둘째 막힘 2 는 정본 02-2 263줄 표의 값이라 파일 맨 위 대문자 상수로 두었다(:234). check:ids 설계 숫자 셈에서 빠지고, 수는 47 그대로다.
- **`heardHelpsOfMove(move)`(:264):** 앞 선생님 행 move 로 들은 도움을 본다.
  - 선택지 도움(two_answers): app choices · ai choices · sound.choices.
  - 답 예시(answer_example): app together · answer_example · model_line, ai together · model_line, sound.model · answer, 꺼내기(intro).
  - 결과를 hintKindOf 에 넘기면 들은 턴이 '영어'가 된다.
- **힌트 마지막 단 열기:** 둘째 막힘부터 마지막 단까지 여는 일은 새 함수 없이 openedTierCount 에 위치의 stuckInSlot 을 넘긴다. 시험이 둘째 막힘에 다 열림과 들리지 않음이 셈 밖임을 본다.

said.ts
- **`countsAsSaid` 의 자리 열거(:119-120):** "prep" · "floor" 를 더했다. 둘 다 '말했다'가 아니다. 소리 줄을 들은 턴은 힌트 종류 '영어'라 지금의 saidWordsOf 가 뺀다.

wrap-up.ts
- **`lessonWrapUpFollowOf({ lines, lowBand })`(:155):** 1~3단계는 되짚을 말 전체를 한 번 따라 말한다(뜻은 있는 줄만 이음). 4단계부터와 되짚을 말이 없는 수업에는 없다.
- **`lessonAgainLineOf({ lowBand, ... })`(:176):** 1~3단계는 null(둘째 장 없음, AC-15e)이고, 4단계부터는 옛 꼴과 같다.
- 옛 againLineOf 는 같은 몫을 내부 함수 againFrom(:137)으로 나눴고 동작은 그대로다. 옛 꼴 시험이 그대로 지난다.

## N-1 · N-2

- **N-1:** `lesson-flow.ts:704-706` 의 greetingEndPlan 주석에 이 경우를 적었다. 막힘 말이면 몇 번째 막힘이든 닫기(stage 3)인데, 말 입력은 막힘 판단 전에 '인사 끝'으로 보내서 자리를 이어 갈 수 없기 때문이다. 동작은 그대로다.
  - 시험: talk-lesson-flow '말 입력은 막힘 판단 전에 '인사 끝'으로 보내므로, 막힘 말이면 첫 막힘이어도 답을 한 번 소리로 들려주고 닫는다(stage 3)'. teacherTurnPlansOf 의 ifAnswered 는 ai · stage 0 이고, ifStuck 은 card_slot · stage 3 · cause stuck · 답 소리 줄이다.
- **N-2 이름 맞추기:** `LessonArgs.prepWords` 를 필수 칸으로 바꿨다(`lesson-flow.ts:83 · 220 · 880`). 기회 쪽 `talkChancesOf` 의 prepShown 은 prepWords 로 이름을 바꿨다(`chances.ts:99 · 111 · 113`).
- **N-2 뜻의 주석:** 두 자리 모두 '인사 뒤 준비 토막을 실제로 지났을 때 쪽지로 보인 낱말 전부(인식 실패로 건너뛴 낱말 포함, 02-2 175줄)'로 적었다.
  - talk-start 스냅숏의 계획 목록을 넘기지 않는다는 것을 함께 적었다.
  - 낱말 수 설정 `settings.prepWords`(talk.prep_words)와 다른 칸이라는 것도 적었다(`lesson-flow.ts:748` 에 한 줄 더).
  - 설정 이름과 TeacherTurnPlan 칸 이름은 바꾸지 않았다.
- **N-2 시험:** '인사 뒤 짧은 준비에서 보인 낱말을 빠뜨리면 형 검사가 잡는다'. 부르지 않는 함수 안에 `@ts-expect-error` 를 두어 tsc 가 필수 칸을 지키는지 본다. 기회 시험 넷의 인자 이름도 바꿨다.
- **재검토 표지 손질:** 1~3단계 when_needed 시험 둘의 AC-15n 표지를 '정한 것 17'로 바꿨다.

## 할 것 4(선택)를 하지 않은 까닭

TalkLessonItem · TalkLessonCard 를 TalkCard 그대로 쓰면 흐름 시험 견본(`tests/fixtures/talk-lesson.ts`)의 작은 카드가 새 꼴 카드 칸 전부를 채워야 한다. 지금 Pick 형은 TalkCard 가 그대로 들어가고, expectTypeOf 시험이 그 맞춤을 tsc 에서 지킨다(묶음 5 재검토 3절 '바꿀 것 없음'). 얻는 것보다 견본 손이 크다고 보아 두었다.

## 시험(새 · 바뀐 파일)

| 파일 | 건수 | AC |
|---|---|---|
| talk-spoken(새) | 2 | 옮김 같은 값 · 값 표본 |
| talk-lesson-hints(새) | 11 | AC-15p(3단계 차례) · AC-15h(6단계 첫 단 영어 틀 · 다시 묻는 턴 뜻 · 10단계 없음 · 소리 줄 들은 턴 '영어' · 들은 도움) · AC-15g(한국어 설명 1~4 · 5단계 · 들리지 않음 없음 · 둘째 막힘 마지막 단) · 이름 없는 넷 |
| talk-lesson-wrap(새) | 5 | AC-15e(1~3단계 둘째 장 없음 · 4단계 이상) · 이름 없는 셋(정리 한 번 · 4단계 없음 · 옛 갈래 그대로) |
| talk-lesson-flow | 44 → 46 | N-1 · N-2 시험 더함, 표지 둘 고침 |
| talk-chances | 16 | 인자 이름만 바꿈 |

## 관문(09:5x, 워크트리, Node 24)

```
pnpm vitest run (새 · 바뀐 다섯)   Test Files 5 passed · Tests 80 passed
옛 시험(talk-hold · talk-repeat · conversation-flow 등 여섯)   Tests 80 passed(기대값 바꾸지 않음)
pnpm test                          Test Files 137 passed · Tests 1699 passed | 6 todo
pnpm check:deps                    no dependency violations found(281 modules)
pnpm check:ids --fail-on …(CI 목록) --design-number-max 49   종료 0 · 위반 0 · design-number 47
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec --plan 본 저장소 회화 plan   종료 0 · unknown-ac 0 · plan-ac-not-in-spec 0
pnpm biome check(이 묶음 파일 열셋)   No fixes applied
pnpm lint                          실패 1: src/core/seed/structure.ts format(묶음 7 이 09:45 에 고치는 중인 파일, 이 묶음은 손대지 않음)
pnpm exec tsc --noEmit             오류 1: tests/unit/conversation-server.test.ts(105) — talk_turns 행 형의 move 칸이 선택 · 필수로 어긋남(묶음 7 의 db 스키마 move 칸과 옛 시험 행 꼴, 이 묶음 파일 아님)
```

중간에 한 번 돌렸을 때는 다른 손의 진행 중인 파일에서 두 묶음이 실패했다.
- 묶음 7 이 시험을 먼저 쓴 `tests/unit/talk-lesson-attempt.test.ts` 일곱 건이다.
- 묶음 6 이 고치던 `tests/contract/ai-schemas.test.ts` 세 건이다.

다시 돌렸을 때는 둘 다 통과했다. 이 묶음의 변경과 관계없다.

## 설계와 다르게 한 것

1. **AppendLine 을 함께 옮겼다.** 브리프 목록 밖이고, 까닭은 할 것 1 에 적었다.
2. **한국어 설명 경계는 대문자 상수다.** 단계 4 · 둘째 막힘 2 를 설정값이 아닌 정본 표의 값으로 두었다. 12절에 키가 없고 structure.ts 는 묶음 7 이 고치는 중이라 hints.ts 에 두었다. 다음 기회에 structure.ts 의 '꼴 · 구조 수' 줄로 옮기면 한곳에 모인다.
3. **꺼내기를 들은 도움으로 본다.** move.intro 가 있으면 답 예시를 들은 것으로 본다. 정본 02-2 180줄 '꺼낸 턴 … 따라 한 아이 턴은 힌트 종류가 영어'를 move 로 읽은 것이다.

## 우려

1. **(Minor) 한국어 설명은 앱 쪽 판정만 있다.** koExplanationShownOf 는 화면 · 저장의 판정이다. AI 가 설명을 쓰게 하는 고정부 규칙(옛 talk.ts 의 'level 4 · level 5' 글)과 같은 값을 묶음 6 의 새 고정부가 쓰는지는 할 것 3 차례에 맞춰 봐야 한다.
2. **(Minor) 옮긴 이름의 옛 가져오기가 남아 있다.** server · e2e · 통합 · 옛 단위 시험은 여전히 flow.ts 에서 가져온다. 묶음 12 가 flow.ts 를 지울 때 그 자리를 spoken.ts 로 바꿔야 한다. 다시 내보내기 줄(flow.ts:21-31)이 그 목록이다.
