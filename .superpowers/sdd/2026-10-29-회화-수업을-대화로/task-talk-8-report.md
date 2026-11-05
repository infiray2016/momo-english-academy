# 구현 보고: 회화 plan 묶음 8 — 서버 턴 길(구현자 impl-talk-8 · Opus · high, 2026-11-05)

상태: DONE_WITH_CONCERNS(우려는 끝 절). 브리프 `task-talk-8.md`(보정 절 둘 포함)의 할 것 1~7 을 했다. 워크트리 `.claude/worktrees/p13d`, 커밋 · push 없음, 개발 DB 에 쓰지 않았다. 다른 손의 파일(index.ts · '5-다' 파일 · state.ts)은 고치지 않았다. 함께 쓰는 형은 talk-lesson.ts 에서 가져왔다.

## 바뀐 파일

| 파일 | 신규 · 수정 | 무엇 |
|---|---|---|
| `src/server/conversation/lesson-turn.ts` | 신규 | 새 갈래 턴 길 전부: 순수 몫(문장 문 545 · 카드 자리 바꾸기 656 · 끝 처리 875 · 줄 만들기 1068 · 1094 · 다시 흘림 1134 · 끝 줄 1175 · 설명 1211)과 서버 몫(runTalkLessonTurn 1336 · lessonTurnAfterChild 1446). 옛 turn.ts 의 turnInFlight · TURN_IN_FLIGHT_MS · TURN_SAVE_GRACE_MS · TALK_BREAK_LINE 을 이리 옮겼다(169 · 147~151) |
| `src/server/conversation/lesson-input.ts` | 신규 | 새 꼴 호출 입력(talkLessonInputOf 206) · 바뀐 값(lessonContextAt 77) · 1~3단계 범위 재료(lessonRangeOf 139 · emptyLessonRange 129 · lineOptionsOf 183) · 선생님 블록 · 안전한 대사. 턴 길과 끝맺음이 함께 쓴다 |
| `src/server/ai/talk.ts` | 수정 | 흘려 받기 · 앞머리를 규격 일반 꼴로(streamCore 374 · runCallCore 801). 옛 streamTalk · runTalkCall 은 이름 · 동작 그대로. 새 꼴 streamTalkLesson 368 · runTalkLessonCall 767 · talkLessonTurn 779 · talkLessonClosing 791 · lessonSoundFixedOf 281. 결과 형 TalkOutcomeOf<O>(TalkOutcome 은 그 옛 꼴) |
| `src/server/conversation/closing.ts` | 수정 | completeTalk 279(참여 완료) · runTalkClosing 이 readTalkAnyState(581)로 갈라 새 꼴은 lessonClosingCall 503 · talkClosingStatus 도 readTalkAnyState(689). 옛 갈래 입력은 oldClosingCall 433 으로 옮김(동작 그대로) |
| `src/server/conversation/turn.ts` | 수정 | sessionCardKindOf 642 로 카드 꼴을 보고 새 꼴이면 runTalkLessonTurn(708). 옮긴 값은 다시 내보냄(122). TurnDeps.write 는 옛 · 새 줄 둘 다 받음 |
| `src/app/api/talk/turn/route.ts` | 수정 | write 의 줄 형만 `TalkLine \| TalkLessonLine`(56) · 머리 주석 |
| `tests/unit/talk-lesson-turn.test.ts` | 신규 | 단위 23 |
| `tests/unit/talk-lesson-stream.test.ts` | 신규 | 단위 2(가짜 Anthropic) |
| `tests/integration/talk-lesson-turn.test.ts` | 신규 | 통합 5(정적, 11-01 뒤 CI) |
| `tests/integration/talk-fixture.ts` | 수정 1줄 | 옛 견본 write 를 `line as TalkLine` 으로(새 줄 형 때문, 393) |

## 새 갈래의 한 턴 차례

| 차례 | 하는 것 | 쓰는 함수 |
|---|---|---|
| 1 | 카드 꼴이 new 면 새 갈래(옛 갈래 · 옛 시험 그대로) | turn.ts sessionCardKindOf · talkCardKindOf |
| 2 | 세션 FOR UPDATE · 같은 시도 id(다시 흘림 · 진행 중 · 다시 부름) · 자리 확인(대화 첫 질문 차례 · 대화 중 준비 중이면 stale) · 아이 행 저장 | readTalkLessonState · lessonChildRowOf |
| 3 | 하루 안전 상한 → 참여 완료 전 resting, 뒤면 정리로 닫기 · 대화 안전 상한 → 정리로 닫기 | closeLessonOnTurn · insertClosingRecord |
| 4 | 흐름 계획: 말이면 두 계획(답함 · 막힘), 모름이면 하나. 흐름 입력 prepWords 는 state.prepWords | lessonArgsOf · teacherTurnPlansOf · nextTeacherTurnOf |
| 5 | 설명 판정을 부르기 전에 한 번(칸 없는 옛 판 행이면 여기서 던짐) | lessonExplanationOf → koExplanationShownOf |
| 6 | 호출 입력 · 사용자 메시지 | talkCallTurnOf · talkLessonInputOf · talkLessonUserMessage |
| 7 | 흘려 받기 + 문장 문(아래) · 응답 첫 칸 stuck 으로 계획 고름 | createLessonSentenceFlow · talkLessonTurn |
| 8 | 끝 처리: 질문이 지워진 턴은 카드 자리, 붙일 줄, 겹침 없애기, move · text · 다시 쓸 차례 | settleLessonTurn · lessonCardSlotOf · shownAttachOf |
| 9 | 남은 줄 흘림 → 선생님 행 저장 · 아이 행 갱신 · 만남 · '말했다' · 참여 완료 → 다시 읽고 끝 줄 | lessonAfterLinesOf · writeSay · completeTalk · lessonNextOf |

문장 문(정한 것 19 · 02-2 200 · 202 · 204줄):
- 질문을 쓰지 않는 차례(카드 자리 · 마무리 자리 · 질문 없는 AI 차례)의 물음표 문장은 지운다(모든 단계).
- 1~3단계 AI 차례는 물음표 문장부터 응답 끝까지 잡아 둔다. 끝에서 checkLowLevelQuestion(노리는 단어는 정규화한 next_targets)과 같은 질문(그 차례 질문 = 마지막 물음표 문장)을 본다. 걸리면 물음표 문장을 모두 지우고 카드 자리(question_check · same_question)다.
- 4단계부터는 물음표 문장이 끝날 때 같은 질문만 본다. 걸리면 지우고 카드 자리(same_question)다.
- 붙일 소리 줄의 답을 담은 선생님 문장은 지운다(C125 (3)). stuck 이 오기 전 문장은 답함 계획으로 본다.

## 붙일 줄 규칙

- 계획에 있는 줄(묶음 5): 카드 질문 · 카드 쉬운 질문 · 인사 질문 · 1~3단계 답 소리 · 4단계부터 답 글 · 마무리 물음.
- 질문이 지워진 AI 차례(lessonCardSlotOf): 막힌 뒤 받침 둘째에 카드 쉬운 질문이 있으면 그것. 그 밖의 막힘 · 들리지 않음 뒤에는 그 자리의 답을 한 번(1~3단계 소리 · 4단계부터 글) 붙이고, 이어서 가장 앞의 남은 기회 → 없으면 대신 질문(가장 오래전 더 이야기할 거리, 정한 것 18 · C194 (1))을 붙인다. 지운 질문 글은 막힌 질문처럼 막아 같은 질문을 붙이지 않는다. 붙일 것이 없으면 AI 차례로 둔다.
- 차례: 선생님 문장 → 뜻 → AI 소리 줄(따라 할 말 · 선택지) → 붙일 줄(답 소리 → 다음 질문, 02-2 261줄).
- 겹침 없애기: 화면 글 붙일 줄이 이미 선생님 문장에 들었으면 뺀다(shownTurnOf). 소리 줄은 늘 남긴다.
- 카드 자리로 바꾼 턴은 AI 의 소리 줄 · 갈래 · 노린 것을 버리고, 꺼낸 새 단어는 화면 글에 남은 것만, move.ai 는 none 이다.

## move · text 저장 규칙(정한 것 5)

- text: 첫 줄 = 화면에 보인 선생님 문장(지운 문장 없음), 그 뒤 = 화면 글로 붙인 줄(카드 질문 · 쉬운 질문 · 마무리 물음 · 4단계부터 답 글). 1~3단계 소리 줄은 text 에 없다. 그래서 turnQuestionOf 가 그 차례 질문을 바로 고른다.
- move: teacherMoveOf(최종 계획, AI 값) + sound.model · sound.choices(1~3단계 AI 차례) + sound.answer(붙인 답 소리). 앱이 바꾼 따라 할 말이면 app 에 model_line.
- tori_ko: lessonToriKoOf(1~3단계는 선생님 문장이 빠진 턴이면 없음).
- tori_rewrite: talkLessonRewriteOf(화면 문장 → 소리 줄 → 붙인 줄 · 뜻 없음).
- ai_question: AI 차례 질문이 남은 턴만 `{ en: 그 차례 질문, ko: "", answerExample, hintKo?, hints?, usable? }`. 묶음 7 의 lessonTurnOf 가 답 예시를 여기서 읽고, 다음 아이 턴 힌트(lessonHintsAt)가 AI 힌트를 여기서 읽는다.
- explanation: 보일 때만 저장한다(koExplanationShownOf).
- 아이 행: stuck_phrase(막힘 말) · said_words · self_used_words · sent_user_message. 들은 도움은 화면 값과 앞 선생님 행 move(heardHelpsOfMove)를 합친다.

## 참여 완료와 이음매

- completeTalk(closing.ts 279)는 세션이 진행일 때만 완료 · 완료 시각 · 학습일로 바꾸고, 다시 하기가 아니면 친한 정도를 올린 뒤 onTalkSessionEnded completed 를 부른다. 이미 완료면 아무것도 하지 않아 세션마다 한 번이다.
- 턴 길은 마무리 물음 뒤 아이가 말로 답한 턴(흐름의 closingAnswered 가 새로 참)에서 부른다.
- 단추 '더 이야기하기' · '그만하기'(참여 있음) · 확인 뒤 중단(aborted)은 묶음 9 몫이다. impl-talk-9 에 자리와 꼴을 알렸다. 바닥선 끝은 묶음 16 이다. 별 장부는 쓰지 않는다.
- 대화 안전 상한 닫기는 참여 완료 전이면 aborted 이음매를 부른다(옛 길과 같은 결).

## 실패 길

| 결과 | 1~3단계 | 4단계부터 |
|---|---|---|
| 첫 문장 뒤 끊김 | 잡아 둔 물음표 문장은 검사할 수 없어 지움. 보낸 문장에 질문이 없으면 카드 자리(cut) + 카드 질문 | 질문이 없으면 카드 자리(cut), 있으면 AI 차례 · 그 차례 힌트 없음 |
| 거절(두 모델) | 카드 안전한 대사 + 카드 자리(fail) + 카드 질문 | 안전한 대사, 질문 차례면 카드 자리(fail) |
| 두 번 실패 · 설정 · 'AI 쉬는 중'(하루 안전 상한) 등 | 카드 칭찬 대사 + 카드 자리(fail) + 카드 질문, '말했다' 없음 | 'Oops' 쉼 줄, 선생님 행 없음(같은 시도 id 로 이어 함) |
| 턴 앞 하루 안전 상한 | 참여 완료 전 resting(진행), 뒤면 정리로 닫고 끝맺음 대기 | 같음 |

## 묶음 6 검토 8절 범위 밖 관찰 넷

- (가) 마무리 제안 질문이 지워진 턴은 카드 자리로 바뀌어 갈래가 none 이다(카드 자리가 못 되어도 질문이 지워지면 none). 흐름 위치의 choice 가 null 이라 두 버튼이 없다. 시험: '(가) …'.
- (나) 1~3단계 신호 말('Listen and say!' 꼴, isSoundCue)은 AI 차례면 잡아 두고 소리 줄(AI 따라 할 말 · 선택지 · 붙인 답 소리)이 없으면 지운다. 카드 자리는 계획에 소리 줄이 없으면 바로 지운다. 시험: '(나) …'.
- (다) 설명은 koExplanationShownOf 를 부르는 lessonExplanationOf 로 보이고, 보일 때만 저장한다. 시험: '(다) …'.
- (라) 소리 줄 바뀜(lessonSoundFixedOf)이 참이면 ai_calls 를 '검증 실패'로 남기고, 앱이 바꾼 따라 할 말이면 move.app 에 model_line 을 더한다. 시험: '(라) …' · 흘려 받기 시험 둘째.

## 시험

단위 `tests/unit/talk-lesson-turn.test.ts`(23):
- 정한 것 19 잡아 두기 · 신호 말 알아보기.
- AC-15b 카드 자리 물음표 지움 · 끊김 둘 · 두 번 실패.
- AC-15i 질문 그대로 · 범위 밖 → 카드 자리 · 카드 자리로 바꾸면 소리 줄 버림 · 걸린 질문 뒤 같은 질문 없음.
- AC-15r 막힌 질문 지움 + 쉬운 질문 · 같은 질문 상한.
- AC-15s 들리지 않음 뒤 같은 질문 없음.
- 정한 것 18 대신 질문.
- (가) · (나) · (다) · (라).
- AC-15k 다시 쓸 차례 · AC-15v move · text, 겹침 없애기, 다시 흘림, 처음 묻는 턴 · 다시 묻는 턴.

단위 `tests/unit/talk-lesson-stream.test.ts`(2): 정한 것 19(새 문장 문은 물음표를 지우지 않음) · (라)(ai_calls 검증 실패).

통합 `tests/integration/talk-lesson-turn.test.ts`(5, 정적): AC-15v · AC-15i · AC-15k · AC-15b(두 번 실패) · 참여 완료 한 번.

먼저 실패를 본 방법: 순수 모듈을 먼저 쓴 몫이 있어(아래 '다르게 한 것' 2), 규칙 일곱을 하나씩 일부러 깨뜨려 시험이 실패하는 것을 본 뒤 되돌렸다. 깨뜨린 규칙은 질문 없는 차례의 물음표 지움 · 범위 검사 · 지운 질문 막기 · 신호 말 지움 · 갈래 버림 · 끊김 카드 자리 · 새 단어 거르기다. 흘려 받기 둘(검증 실패 상태 · 물음표 안 지움)도 같다. 출력은 스크래치패드 `t8-mut-*.txt` 다.

## 관문(2026-11-05, Node 24, 출력은 스크래치패드 `t8-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm biome ci` | 0 · 584 파일 |
| `pnpm exec tsc --noEmit -p .` | 0 |
| `pnpm vitest run --project unit` | 142 파일 · 1783 통과 · 6 todo |
| `pnpm check:deps` | 위반 0(285 모듈) |
| `pnpm check:ids`(CI 인자) | 0, 이 묶음 파일은 목록에 없음 |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 |

## 설계와 다르게 한 것 · 해석

1. **새 파일 둘.** 턴 길이 커서 `lesson-turn.ts` 를 두었다. 끝맺음과 턴 길이 같은 입력을 쓰는데 서로 가져오면 순환(no-circular)이라 `lesson-input.ts` 를 따로 두었다. turn.ts 는 갈래 한 줄과 다시 내보내기만 바뀌었다.
2. **시험을 먼저 쓰지 않은 몫이 있다.** 순수 모듈 대부분을 먼저 썼다. 대신 위 규칙 일곱 · 흘려 받기 둘을 깨뜨려 실패를 본 뒤 되돌렸다.
3. **끊김 · 실패 길에도 대신 질문을 쓴다.** 정한 것 18 · C194 (1)은 까닭 (2) · (3)과 닫기 자리만 적는다. 끊김 · 실패 길에서 붙일 남은 기회가 없을 때도 같은 대신 질문을 붙여 질문 없는 차례가 남지 않게 했다(넓힌 해석, 컨트롤러 확인 필요).
4. **4단계부터 같은 질문은 모든 물음표 문장을 본다.** 흘리는 동안에는 어느 것이 마지막 질문인지 모르기 때문이다. 셈(asked)은 묶음 5 의 turnQuestionOf 로 센 그 차례 질문이라, 반응 물음('Really?')은 앞 차례 질문과 글이 같을 때만 걸린다.
5. **질문 없는 AI 차례(aiAsks 거짓)의 물음표도 지운다.** 인사 끝 · 4단계부터 같이 말하기 차례다. 고정부가 'Question: no' 에 질문을 쓰지 말라고 하고, 남으면 다음 아이 차례가 그 질문에 답하게 되기 때문이다. 카드 자리로 바꾸지는 않는다.
6. **AI 차례 힌트 · 답 예시를 ai_question jsonb 에 둔다.** 칸 꼴은 C101 에 쓸 수 있는 말(usable)을 더했다. 열 · 마이그레이션은 그대로다.
7. **ask_kind 규칙.** 지금 자리의 노린 단어가 그 자리를 연 선생님 행보다 앞 질문 자리에서 노려졌으면 re_ask 로 정했다(새 흐름에 정의가 없어 3.3 '처음 다룬 차례 · 다시 쓰기'로 읽음).
8. **단원 목표 글(goalTexts)은 빈 목록이다.** 적재된 unit_specs 에 goals 칸이 없다. 가변부는 목표 ID 와 '-' 만 보인다(아래 요청 2).
9. **옛 통합 견본 한 줄.** talk-fixture.ts 의 write 에 형 단언을 더했다(옛 꼴 카드만 도는 길).
10. **턴 앞 'AI 쉬는 중'은 옛 길과 같이 하루 안전 상한(aiRestingToday)만 본다.** 다른 까닭(장애 · 콘솔 한도)은 호출 실패 길로 간다(옛 길과 같음).

## 요청하는 변경(이 묶음 파일 밖)

1. **단원 목표 글을 서버가 읽을 길.** seed:load 가 unit_specs 에 goals 를 담거나(스키마 · 적재) 목표 목록을 읽는 길이 있어야 goalTexts 를 채운다.
2. **(선택) move 의 소리 줄 바뀜 칸.** talk:observe(묶음 13)가 '정규화가 소리 줄을 바꾼 턴'을 다른 검증 실패와 가르려면 move.ts 에 선택 칸(예 fixed)을 더한다. 지금은 ai_calls 상태와 move.app model_line 으로만 보인다.
3. **(기록) '5-나' 재검토 N-2.** 단계 규격 행을 좁힌 스키마로 읽는 일은 묶음 12 몫 그대로다. 이 묶음은 koExplanationShownOf 의 던짐을 AI 를 부르기 전으로 당겨, 칸 없는 행이면 그 턴이 error 줄로 끝난다.

## 발견 · 넘김

- **(Important, 컨트롤러가 받음 → '5-다' fix 1) 마지막 인사 질문의 막힘 말이 DB 에서 다시 읽으면 인사에 머물렀다.** 계획 때는 lessonTurnSegmentOf 가 말 입력을 greeting_end 로 보내 닫기 계획이 되는데, DB 토막 열거에 greeting_end 가 없어 저장된 아이 행은 greeting 이다. 그래서 되짚기(talkLessonPositionOf)가 인사를 끝내지 않았다. fix 1 이 lesson-flow 되짚기에서 '마지막 인사 질문 + 말 입력'을 인사 끝으로 본다(위치 칸 greetingEndNow). 이 묶음은 그 동작을 전제로 하고 서버에서 따로 고칠 것은 없다.
- '5-다' fix 1 이 heardHelpsOfMove 에 단계 구간 인자를 더했다. lesson-turn.ts 462줄 부름은 이미 `state.spec` 을 넘긴다.

## 묶음 9 · 10 · 11 에 넘길 것

- 새 줄 꼴은 `TalkLessonLine`(lesson-turn.ts 240)이고 turn.ts 가 다시 내보낸다. sound 줄(model · choices · answer)은 읽어 주기 재료이고 글로 보이지 않는다(T2). add 줄의 kind answer 는 4단계부터의 답 글이다.
- 끝 줄은 `{ t: "end", lesson: TalkLessonNext }`(208)다. 칸은 segment · greetingDone · talkCount(분모 없음) · choice · closingAsked · moreRound · moreInRound · targets · hints · explanation · flashDontKnow · silentBlocked · prep · firstQuestionDue · completed 다.
- 대화 첫 질문 차례(firstQuestionDue)와 대화 중 짧은 준비(prep)는 턴 길이 받지 않는다(stale). 묶음 9 의 advanceTalk 가 잇는다.
- 다시 흘림 · 이어 하기 줄은 lessonReplayLinesOf 로 같은 꼴을 만든다(대화 기록 다시 그리기에 쓸 수 있음).
- 참여 완료는 closing.ts completeTalk, 새 꼴 끝맺음 상태는 talkClosingStatus 그대로 부르면 된다.
- 1~3단계 AI 차례 힌트는 응답 끝의 end 줄에만 온다(흐린 힌트는 화면 몫).

## 우려

1. 통합 시험 다섯은 이 Mac 에서 돌리지 못했다. 시험 시드 1단계 카드의 실제 낱말 · 형태 표 범위에 기대는 단언('zebrafish' 가 범위 밖)은 CI 에서 처음 확인된다.
2. 1~3단계 AI 의 따라 할 말 · 선택지는 tori_en 뒤에 와서, 그 말을 담은 반응 문장이 이미 흘렀으면 겹침 없애기를 할 수 없다(잡아 둔 문장만 가능). 고정부가 tori_en 에 쓰지 말라고 하므로 드문 길이다.
3. 1~3단계 질문 잡아 두기로 질문 소리가 응답 끝까지 늦는다(plan 위험 9). 반응 문장은 바로 흘린다.
4. 단계 규격 행에 koExplainFromStuck 칸이 없으면 hints.ts · talk-lesson.ts 고정부가 일반 Error 를 던진다. 이것은 isConfigError(run.ts)에 들지 않아 'AI 쉬는 중'으로 가지 않고, 그 턴은 error 줄로 끝난다(숨기지 않음 — 좁힌 스키마로 막는 것은 묶음 12 몫).
5. 마지막 관문(11-05 후반)에서 tsc · 단위 실패가 '5-다' fix 1 이 고치는 중인 파일(talk-lesson-call.test.ts · 계약 시험 ai-schemas.test.ts)에서 났다. 이 묶음 파일은 tsc 오류 0 · 시험 25 통과다. fix 1 이 끝난 뒤 다시 돌려야 한다.
