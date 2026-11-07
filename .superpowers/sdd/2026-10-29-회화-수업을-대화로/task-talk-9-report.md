# 구현 보고: 회화 plan 묶음 9 — 서버 액션 · 화면 자료(구현자 impl-talk-9 · Opus · high, 2026-11-05 14:2x~15:3x)

상태: DONE_WITH_CONCERNS(우려는 끝 절, 우려 1 은 11-05 닫힘). 브리프 `task-talk-9.md`(보정 절 포함)의 할 것 1~4 를 했다. 코드는 워크트리 p13d 에 있다. 시험을 먼저 써서 실패(모듈 없음 1 · 함수 없음 26)를 본 뒤 통과시켰다. 관문은 모두 0 이다. 개발 DB 에 쓰지 않았고 커밋 · push 는 하지 않았다.

## 새 갈래 액션 표(`src/server/conversation/index.ts`)

새 갈래는 1519줄 아래에 있다. 옛 이름(loadTalkView · advanceTalk · …)은 옛 꼴 카드 갈래 그대로 두었다. 새 꼴 세션은 아래 이름으로 부른다(설계와 다르게 한 것 1). 판정은 순수 함수가 하고, 액션은 상태 읽기(readTalkAnyState 의 kind new) → 판정 → 쓰기만 한다.

| 액션 | 줄 | 판정(순수) | 하는 일 |
|---|---|---|---|
| loadTalkLessonView | 2594 | lessonStepOf(1621) | 처음 열 때 ensureLessonStarted(2223): talk-start(prepWords = 계획, carry 빈 목록, 옛 필수 칸은 빈 목록)와 첫 선생님 행(kind first_question, 카드 인사 질문 · 4단계부터 선생님 첫 말)을 넣는다. 화면 자료를 돌려준다 |
| advanceTalkLesson | 2716 | lessonAdvanceOf(1651) | 인사 끝 → 짧은 준비(토막만), 인사 끝(계획 없음) · 짧은 준비 → 대화 첫 질문 행. 대화 중 연 준비 끝 → 같은 토막에서 'Now let's talk.' + 다음 필수 질문 행. 붙인 질문의 단원 단어를 만남으로 적는다 |
| saveLessonFollowAlong | 2793 | lessonFollowOf(1697) | talk-prep `{ index, word, place, target, heard, failures, skipped?, clientListen? }` · talk-wrapup · talk-again. 활동 번호는 lessonFollowAlongNo(오늘 쓸 말 수 · settings.prepWords · 되짚을 말 수). 따라 말한 낱말은 만남, 영어 문장 수는 인식 글마다 하나다 |
| chooseLessonMoreTalk | 2876 | lessonMoreOf(1789) | 고르기 차례에서만 받는다. 더 이야기할 거리 하나를 새 카드 자리 행으로 붙인다(AI · 턴 셈 없음). 마무리 물음이면 more_talk 토막과 참여 완료(completeTalk, 진행일 때만)다. 마무리 제안이면 토막을 그대로 둔다 |
| stopTalkLesson | 2993 | lessonStopOf(1851) | 확인은 talkNearlySilent(talkStopOf)일 때만 묻는다. 완료면 completeTalk, 확인 뒤 중단이면 aborted · 학습일 · 이음매다. 정리 토막으로 닫고 insertLessonClosing 을 부르며, schedule 이 참이면 scheduleTalkClosing 을 부른다 |
| leaveTalkLesson | 3062 | — | 진행 중이면 그대로 둔다. 참여 완료 뒤면 정리 토막과 끝맺음 기록 leave 를 남긴다 |
| readTalkLessonWrap | 3118 | — | 닫힌 세션의 마무리 자료(옛 WrapView 꼴 그대로)를 돌려준다 |

- 앱이 만드는 선생님 행(insertTeacherRow, 2150): speaker tori, turnNo 는 최대 + 1(묶음 8 의 아이 행 번호 = 마지막 선생님 행 번호와 맞음)이다. text 는 `toriTextOf("", 화면 줄)`(소리 줄 뺌, 정한 것 5)이고, tori_rewrite 는 talkLessonRewriteOf 로 붙인 줄 전부를 넣는다. tori_ko 는 비운다.
- 근거 쓰기 줄: saveLessonFollowAlong 2845줄에 정한 것 22 주석을 두었다.

## 화면 자료 꼴(묶음 10 · 11 이 읽을 칸, `TalkLessonView` 2528줄)

- `step`은 아이가 할 일을 하나로 알린다. 값은 advance(to prep · talk) · prep(place greeting · talk) · child · choice(closing · suggestion) · retry · closed · choose_teacher 다.
- `position`에는 talkCount · moreCount · moreRound · moreInRound · choice · closingAsked · closingAnswered · prepPending · flashDontKnow · silentBlocked · lastCause · childTurns · phase · greetingDone 이 있다. 참고 턴은 내리지 않는다(위 띠 분모 없음).
- `log: TalkLessonLogRow[]`(lessonLogOf, 2101줄)는 talkLogOf 재료다. 선생님 행은 `{ turnNo, segment, kind, lines: { en, ko?, app }[] }` 꼴이다. AI 글의 뜻은 tori_ko 에서, 앱 줄의 뜻은 카드 글을 맞춰서 되찾고, 1~4단계만 둔다. 아이 행은 `{ text, input, nospeech, stuck }` 꼴이다. 소리 줄은 text 에 없어서 들지 않는다(T2).
- `current`는 마지막 선생님 행이다. 칸은 lines · sound(move.sound) · app · item · kind 이고, 이어 할 때 AI 없이 다시 보이고 읽는 데 쓴다.
- `retryTurn`은 옛 꼴과 같다.
- `prep`은 `{ place, words: PrepWordView[], done }` 꼴이고 준비 차례에만 있다. PrepWordView 는 `{ word, meaningKo, example, modelLine, imageKey?, source }` 다. 쪽지 글 규칙은 화면이 고른다.
- `waitLines`(맞장구 목록)와 `settings.talk.waitLineSeconds`가 있다. 화면은 `waitLineOf(lines, 턴 번호)`(`src/core/conversation/wait-line.ts`)로 고른다.
- 나머지 칸(그림 · 동음이의어 · 원형 · 친한 정도 · 안내 · 쉬는 중 · 선생님)은 옛 꼴과 같다. talk.practice_rounds 는 읽지 않는다.
- 액션의 돌려주는 값 `LessonMoveOutcome`은 `{ segment, step, position, current, prep }` 꼴이다. 그만하기 · 홈은 옛 StopOutcome · LeaveOutcome 꼴(WrapView)을 그대로 쓴다.

## 다지기 · 보강 짧은 준비의 들려줄 말(보정 절 2)

출처는 prepNoteOf(1918줄)가 아래 차례로 고른다.
1. 이 카드의 오늘 쓸 말이 있으면 그것을 쓴다.
2. 없으면 같은 단원의 적재된 배정 카드 오늘 쓸 말을 쓴다. 세션 시작 개정 이하에서 새 개정을 먼저 본다.
3. 그것도 없으면 품사 규칙 prepModelLineOf(1876줄)를 쓴다. 뜻 · 예문 · 그림은 vocab 에서 가져온다.
4. 그것도 안 되면 낱말만 읽는다.

품사 규칙은 아래와 같다. vocab 에 셀 수 있음 칸이 없어서 복수형이 있는지로 가른다.

| 품사(첫 품사) | 들려줄 말 | 예 |
|---|---|---|
| 동사 | I + 낱말. | I sleep. · I go. |
| 명사만, 복수형 있음 | The + 낱말. | The beach. · The mountain. |
| 명사, 동사를 겸함 · 꼴 없음 | 낱말만(첫 글자 대문자) | Rain. · Snow. · Air. |
| 그 밖 | 규칙 없음 → 낱말 그대로 | blue |

## 맞장구 목록 · 검사(정한 것 20)

- 파일은 `seed/lists/talk-wait-lines.json`이고, 첫 안 다섯 줄 `{ "lines": [...] }`을 담았다. 빌드 추적은 기존 `seed/lists/**`가 이미 덮는다.
- 규격과 자리는 아래 다섯 곳에 두었다.
  - `TalkWaitLinesFileSchema`(`src/core/seed/schema/reference.ts:530`)
  - `SEED_FILES.talkWaitLines`(`src/core/seed/structure.ts:720`)
  - 검증기 규격 표(`src/core/seed/validate.ts:577`)
  - 규격 파일 열(`src/core/seed/reference-index.ts:77`)
  - 서버 읽기 `seedTalkWaitLines`(`src/server/seed-lists.ts:128`). 파일이 없으면 빈 목록과 경고 한 번이고, 규격이 틀리면 던진다.
- 검사는 `checkTalkWaitLines`(새 `src/core/seed/check-wait-lines.ts`, `reference-index.ts:592`에서 부름)가 한다. 금지어 · 선생님 이름 · 물음표 · 회화 1단계 문장 길이 상한(level-specs talk 1 sentenceMaxWords)과 겹친 줄을 오류 `talk-wait-lines`로 낸다.
- 고르기는 `waitLineOf`(새 `src/core/conversation/wait-line.ts`)가 턴 번호로 돌린다(safeLineOf 꼴).

## 시험

| 파일 | 건수 | 몫 |
|---|---|---|
| `tests/unit/talk-lesson-actions.test.ts`(새) | 26 | step · 토막 넘김(C19 · (나)) · 짧은 준비 저장(자리 · 낱말 · 활동 번호 · 다지기 범위 fix 1 I-1 · 만남) · AC-12h 문장 셈 · 정한 것 11 고르기(참여 완료 한 번, AC-16a) · AC-15t (가) · (나) · 마무리 제안 · 마무리 물음 · 들려줄 말 출처 셋 · 대화 기록 자료(T2) |
| `tests/unit/talk-wait-lines.test.ts`(새) | 6 | 목록 첫 안 · 규격 · 검사 다섯 · 길이 상한 없음 · 턴 번호 고르기 · 서버 읽기 |
| `tests/integration/talk-lesson-session.test.ts`(새, 정적) | 7 | AC-15f 처음 열기 · 다시 열기 · 홈 · 토막 넘김과 짧은 준비 저장 · AC-15t (나) 중단 · (가) 완료(AC-16a) · 고르기 두 번에 친한 정도 한 번 · 참여 완료 뒤 홈 leave · 다지기 쪽지 출처 |
| `tests/unit/seed-schema.test.ts` · `tests/fixtures/seed/builders.ts` | 고침 | 규격 파일 열에 맞장구 목록 한 칸 |

## 관문(15:3x, Node 24, 출력은 스크래치패드 `t9-*.txt`)

| 명령 | 결과 |
|---|---|
| 새 단위 시험 두 파일(고치기 전) | 실패: 모듈 없음 1 · 함수 없음 26(`t9-red.txt`) |
| `pnpm biome ci` | 0, 581 파일 |
| `pnpm exec tsc --noEmit -p .` | 0 |
| `pnpm vitest run --project unit` | 0, 140 파일 · 1758 통과 · 6 todo |
| `pnpm check:deps` | 위반 0 |
| `pnpm check:ids`(CI 목록) | 0, design-number 47 / 49 |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec --plan 회화 plan` | 0 |
| `pnpm seed:validate` | 0, 칸 795 · 실패 0 · 규격 파일 오류 0 · 경고 16 |

- 중간에 biome ci · tsc · 단위 시험이 남의 파일(turn.ts · lesson-turn.ts · talk-lesson-call.test.ts, 묶음 8 · '5-다' 진행분) 때문에 잠깐 깨졌다. 다시 돌려 위 값을 얻었다.

## 설계와 다르게 한 것

1. **새 갈래 액션을 옛 이름과 따로 내보냈다.** 옛 이름의 돌려주는 꼴(TurnNext · AddLine · 옛 TalkView)을 바꾸면 옛 화면(talk-frame.tsx, 묶음 11 · 12 몫)이 형에서 깨진다. 새 꼴 세션에서 옛 이름은 지금처럼 readTalkState 가 던져서 'unavailable'이 된다.
2. **새 파일 둘을 두었다.** `src/core/conversation/wait-line.ts`는 화면이 서버 모듈을 가져올 수 없어서 고르기를 순수 모듈로 둔 것이다. `src/core/seed/check-wait-lines.ts`는 목록 검사다. 맞장구 목록을 SEED_FILES 에 넣으면서 `schema/reference.ts` · `validate.ts` · `reference-index.ts` · 시험 builders · seed-schema 시험의 규격 파일 표를 한 칸씩 고쳤다(형이 SeedFileName 전부를 요구함).
3. **'홈'(leaveTalkLesson)과 마무리 자료(readTalkLessonWrap)의 새 갈래도 더했다.** 브리프 목록 밖이다. stopTalk 와 같은 끝난 길 자료를 쓰고, 화면이 새 꼴 세션에서 옛 이름을 부르면 깨지기 때문이다.
4. **참여 완료는 closing.ts 의 completeTalk(묶음 8)를 부른다.** 시작 때는 state.ts reachTalkTarget 을 썼다. 묶음 8 이 같은 꼴로 completeTalk 를 더해서 그쪽으로 맞췄다(진행일 때만 바꿈 → 세션마다 한 번).
5. **다지기 짧은 준비 후보는 '그 수업이 노리는 단원 단어'를 카드 필수 질문 → 더 이야기할 거리의 노리는 단어로 읽었다.** 없으면 수업 단원 단어다.
6. **짧은 준비의 만남은 인식 글이 있는 차례만 적는다.** 정본 177줄 '따라 말한 낱말'을 그렇게 읽었다. 건너뛴 낱말은 시도만 남는다.
7. **마무리 제안 뒤 '더 이야기하기'는 토막을 talk 그대로 둔다.** 02-2:295 '대화를 잇는다'를 그렇게 읽었다.

## 묶음 10 · 11 에 넘길 것 · 요청하는 변경

- **서버 액션 감싸기(`src/server/actions/conversation.ts`) · 쪽(`src/app/(child)/session/[id]/page.tsx`)은 고치지 않았다.** 허용 파일 밖이다. 새 꼴 세션에서 loadTalkLessonView 와 새 이름 액션 일곱을 부르게 묶음 11(또는 컨트롤러)이 잇는다. 지금 쪽은 새 꼴 세션에서 loadTalkView 가 던진다.
- talkLogOf 는 `view.log`를 읽는다. '잘 모르겠어요'는 input dont_know 이고 nospeech 가 아닌 행이다. '못 들었어요'는 nospeech 행이다. 인식 실패 시도는 talk_turns 에 없다.
- 맞장구는 `waitLineOf(view.waitLines, 다음 선생님 행 턴 번호)`로 고르고 talk.wait_line_seconds 뒤에 읽는다. 기록에는 넣지 않는다.
- 짧은 준비 쪽지 차례가 끝나면 advanceTalkLesson to talk 를 부른다. 다 하지 않아도 넘길 수 있다(옛 흐름과 같음).
- 힌트 단 열기(revealTalkHint)의 새 갈래는 하지 않았다. 카드 항목 힌트는 hints.ts('5-다')가 맡고, 화면 자료 `current.item`이 열쇠다.

## 우려

1. **(닫힘, 11-05 impl-talk-8 알림) 끝맺음 턴 새 갈래.** runTalkClosing · talkClosingStatus 의 새 꼴 갈래가 closing.ts 에 들어가서 scheduleTalkClosing 을 그대로 부르면 새 꼴 세션에서도 돈다. 앱이 만드는 선생님 행 꼴(text · tori_rewrite · move, turnNo)도 턴 길과 맞는다고 확인받았다. 대화 첫 질문 행의 move.item · words · goals 는 계획(teacherMoveOf)에서, '더 이야기하기' 행은 붙인 더 이야기할 거리에서 채운다.
2. **(Minor) 품사 규칙은 근사다.** 첫 품사가 명사이고 동사를 겸한 셀 수 있는 명사(brush · shop · ring 등)는 'The + 낱말.' 대신 낱말만이 되고(fix 1 M-3 — cook 은 첫 품사가 동사라 'I cook.'이다), 요일 같은 고유 명사는 'The sunday.'가 된다. 첫 프리뷰 다지기 6 의 3단계 단원 1 명사(sky · sea · beach · mountain · rain · snow · air 등)는 규칙대로 나온다.
3. **(Minor) 통합 시험 일곱은 이 Mac 에서 돌지 않아 실행하지 못했다.** 11-01 뒤 CI 에서 처음 돈다. 시험 시드 다지기 카드가 새 꼴인지도 그때 확인된다(없으면 마지막 시험이 던진다).
4. **(Minor) 앱이 만든 선생님 행의 카드 줄 뜻은 글을 맞춰 되찾는다.** 같은 영어 글이 카드에 두 번 있으면 앞 항목의 뜻이 보인다.
