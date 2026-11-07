# 회화 plan 묶음 12 fix 1 보고(라운드 1/3)

- 브리프: `task-talk-12-fix1-brief.md`, 검토: `task-talk-12-review-report.md` 3절 · 4절.
- 코드: 워크트리 `.claude/worktrees/p13d`. 이번 fix 는 시험 · 견본 파일만 고쳤다. src 는 바꾸지 않았다.
- M-1 의 먼저 실패 확인 때 `src/server/conversation/index.ts` 한 줄을 잠깐 껐고, 바로 되돌렸다(사본과 `cmp` 같음).
- 상태: DONE_WITH_CONCERNS. 통합 · e2e 는 이 Mac 에서 돌지 않는다(내장 Postgres shmget). 그래서 정적으로만 맞췄고(tsc · biome), 실제 통과는 CI 첫 실행에서 확인된다.

## 1. 지적별 처리

| 번호 | 판정 | 근거(파일:줄 · 시험 이름) |
|---|---|---|
| I-1 | ADDRESSED | `tests/e2e/required-utterance.spec.ts:302` "AC-23f 회화 1단계: 인사 턴 · 대화 턴 · 선택지를 말해 바로 보낸 턴 모두 …". 대화 첫 답의 가짜 응답에 `choices` · `support: "choices"` · `next_move: "follow_up"` · `card_item: required 1` 을 둔다. 선택지 단추 둘(`[data-answer-listen]`)이 보이면, 아이가 선택지 하나를 말한 턴을 `measuredTurn(…, { direct: true })`(`:355~360`)로 잰다. 선택지 도우미는 `choicesOf`(`:293`)다. 인사 턴 단언을 걷은 것은 그대로 두었다 |
| I-2 (가) | ADDRESSED | 새 파일 `tests/integration/talk-lesson-closing.test.ts`. runTalkClosing · talkClosingStatus · closeIdleTalks 를 실제로 부른다. 2절 표 참고 |
| I-2 (나) | ADDRESSED | 새 파일 `tests/integration/talk-lesson-call.test.ts`. runTalkLessonCall 앞머리를 talkLessonTurn · talkLessonClosing 으로 부른다. 2절 표 참고 |
| I-2 (다) | ADDRESSED | `talk-lesson-closing.test.ts` 의 안전 상한 셋 · 두 기기 · 겹침 · 선생님 말 없는 마지막 턴 · AC-2c. 2절 표 참고 |
| M-1 | ADDRESSED | `tests/unit/talk-lesson-actions.test.ts:260` "C149 따라 말하기 시도의 입력에는 화면이 보낸 듣기 사건 요약(clientListen)이 그대로 실리고 …". 짧은 준비와 정리 두 갈래를 본다. 먼저 실패를 확인했다: `index.ts:518` 줄을 끄면 1건 실패하고, 되돌리면 통과한다 |
| M-2 | ADDRESSED(한 줄은 바꿈) | `tests/e2e/talk-lesson.spec.ts:264~271`. 첫째 단언은 `[data-wrap-log]` 가 마지막 선생님 말의 첫 문장 'Wow, me too!' 를 담는지 본다(N-4 (라) `talk-frame.tsx:1340` pushBubbleToLog). 둘째 단언은 `[data-wrap-shine]` 첫 줄에 `ring-4` 가 남는지 본다(N-4 (가) `:550` · `:585~600`). 브리프의 'What do you do on Sunday?' 대신 첫 문장으로 본 까닭은 3절 1에 적었다 |

## 2. 옮긴 통합 시험(옛 ↔ 새)

옛 원문은 변경 전 사본 `scratchpad/p13d-before-12/tests/integration/` 에 있다.

### (나) 회화 턴 · 끝맺음 턴 요청 꼴: `talk-lesson-call.test.ts`

부르는 함수는 `talkLessonTurn`(`server/ai/talk.ts:765`) · `talkLessonClosing`(`:777`)이고, 둘 다 runCallCore 를 지난다. 설정 읽기와 requestConfigOf 는 `:831`, 설정 문제 config 는 `:835` · `:874`, 하루 상한 문은 `:849` 에 있다. 견본은 `talkLessonSampleFor` · `lessonInput`(`tests/fixtures/ai/talk-lesson-inputs.ts`)과 표본 v2-l3-ai · v2-l4-ai · v2-l3-fallback · v2-l5-closing 이다.

| 옛(conversation-call) | 새 줄 · 이름 앞부분 | 설정 키 |
|---|---|---|
| AC-8f Haiku 설정 | `:242` AC-8f 설정으로 Haiku … | ai.model.talk_turn.1-3 · ai.max_tokens.talk_turn |
| AC-8f 1~3 기본(C112) | `:256` | (기본값) |
| AC-8f 4단계부터 | `:269` | (기본값) |
| AC-8f 대체 모델 비용 | `:282` | ai.model.talk_turn.1-3(요청 모델). 4단계 표본 대신 v2-l3-fallback 을 쓴다 |
| AC-8i 4~6 Haiku | `:305` | ai.model.talk_turn.4-6 |
| AC-8i effort 구간 | `:315` | ai.effort.talk_turn.1-3 |
| AC-8c 끝맺음 max_tokens · feedback 기다림 · 기록 칸 | `:329` | ai.max_tokens.talk_closing · ai.timeout_seconds.realtime(1로) · ai.timeout_seconds.feedback. 기다림 판정은 `core/ai/combo.ts:132` 다 |
| AC-16b 요약 n 개 · 가림 | `:370` | talk.memory_summaries |
| AC-N4 회화 턴 · 끝맺음 요약 가림 | `:401` | (없음) |
| 연결 오류 한 번 다시 | `:437` | (없음) |
| 하루 안전 상한 safety_cap | `:456`, 끝맺음 턴 몫은 새로 `:476` | ai.safety_daily_calls(프로필) |
| 첫 문장 시간 | `:493` | (없음) |
| 설정 문제 config | `:512` | talk.good_lines(지움). 새 꼴 규격 SETTING_SCHEMAS 는 `talk-lesson.ts:268` 이다 |

### (가) · (다) 세션 · 턴 길: `talk-lesson-closing.test.ts`

이 파일은 `setupTalkDb`(새 꼴 시드)를 쓰고, 세션 시작 액션 `startLessonSession`(`server/session/index.ts:502`)으로 연다. 인사 턴은 talk_turns 에 바로 넣는다. 대화 아이 말은 `runTalkTurnRequest`(`turn.ts:102`)로 보낸다. 줄 번호는 모두 이 파일 안의 것이다.

| 옛(conversation-session · turn) | 새 줄 · 이름 앞부분 | 부르는 함수 · 대조한 코드 줄 | 설정 키 |
|---|---|---|---|
| AC-15f 그만하기 뒤 요약 · AC-8c 끝맺음 | `:308` AC-8c 참여가 있는 '그만하기' … | stopTalkLesson `index.ts:1940` → scheduleTalkClosing → runTalkClosing `closing.ts:509`, talkClosingStatus `:660` | ai.max_tokens.talk_closing · ai.timeout_seconds.realtime(1로) · feedback |
| AC-16b 요약 저장 · 다음 대화 n 개 | `:373` | runTalkClosing 요약 저장 `closing.ts:599~637`, summariesBefore `state.ts:306` | talk.summary_max_chars · talk.memory_summaries |
| AC-16b 아이 원문 가림 | `:415` | lessonChildRowOf `lesson-turn.ts:505` | (없음) |
| AC-16c 보낸 메시지 지움 | `:433` | clearSentMessages `closing.ts:172` | (없음) |
| 끝맺음 두 요청 · 호출 하나 | `:468` | runTalkClosing 잡기 `closing.ts:532~549` | ai.timeout_seconds.feedback |
| AC-15f 떠난 대화 · 시간 뒤 홈 진입 · 다른 기기 | `:491` | chooseLessonMoreTalk `index.ts:1823`, closeIdleTalks (가) · (나) `closing.ts:725` | talk.idle_close_minutes |
| (새) 홈 진입 정리 (다) | `:524` | closeIdleTalks (다) `closing.ts:792~817` | (없음) |
| (새) 옛 꼴 대기 기록 건너뜀 | `:545` | runTalkClosing 옛 꼴 `closing.ts:554~597`, talkClosingStatus 옛 꼴 none, insertClosingRecord `:138` | (없음) |
| 1-가 상한 날 새 회화 · 도중 쉼 · 다음 학습일 같은 시도 id | `:625` | startLessonSession ai_resting `session/index.ts:606`, 턴 길 쉼 `lesson-turn.ts:1627`, 화면 자료 retryTurn `index.ts:1501` | ai.safety_daily_calls(프로필, capAtCurrentCalls) |
| 1-가 쉬는 날 '그만하기' 중단 | `:654` | lessonClosingOf skipped `closing.ts:220` | 같음 |
| 1-가 상한 뒤 풀린 학습일 홈 진입 한 번 | `:681`. 옛 '더 이야기하기 중 닿음'을 쉬는 날 참여 완료 '그만하기'로 옮겼다 | closeIdleTalks (나) aiRestingToday | 같음 |
| 두 기기 같은 턴 | `:709` | runTalkLessonTurn orphan stale `lesson-turn.ts:1529~1539` | (없음) |
| 같은 시도 id 겹침 | `:731` | turnInFlight `lesson-turn.ts:181`(호출 기록 없음이면 진행 중) | (없음) |
| AC-15f 선생님 말 없는 마지막 턴 | `:750` | own · orphan `lesson-turn.ts:1502~1526`, TURN_IN_FLIGHT_MS, 다시 흘림 replayLesson `:1438` | ai.timeout_seconds.realtime(기본) |
| AC-2c 다시 하기 | `:789` | startLessonSession retry(같은 수업 행), completeTalk 친한 정도 `closing.ts:277` | talk.friendship_per_talk |

옮기지 않은 옛 시험:
- AC-19d(선생님 블록)와 AC-15k(대화 도중 모델 고정)는 브리프 (나) 목록 밖이다. 새 갈래의 AC-15k 는 `talk-lesson-turn.test.ts` 에 있다.
- 안전 상한 기록 실패 Proxy 시험(rev-p13b N-4)도 브리프 목록 밖이라 옮기지 않았다.
- 옛 AC-15f '4단계 Oops 쉼 뒤 고아 행'은 시험 시드에 회화 4단계가 없어 옮길 수 없었다. 그래서 '저장 전에 끊긴 아이 행'을 바로 넣는 꼴로 같은 길을 지나게 했다.

### 바탕 파일 변경: `tests/integration/talk-fixture.ts`

- 공용 도우미 셋을 더했다: `lessonAnswer`(`:155`), `lessonTurnRule`(`:203`), `lessonClosingRule`(`:220`, firstDelayMs 선택 포함).
- `talk-lesson-turn.test.ts` 의 같은 꼴 지역 함수 lessonAnswer 를 지우고 바탕 파일의 것을 가져오게 했다. 동작은 같다.

## 3. 설계 · 브리프와 다르게 한 것

1. **M-2 의 첫 단언 글.** 'What do you do on Sunday?' 대신 같은 말풍선의 첫 문장 'Wow, me too!' 로 본다.
   - 까닭: 그 e2e 는 3단계이고, 시험 어휘(smallReferenceSet 1~3단계)에 'sunday' 가 없다. tsx 로 빌더를 찍어 확인했다.
   - 1~3단계 AI 질문 검사(`question-check.ts:216` · AC-15i)가 그 질문을 카드 질문으로 바꾸므로, 그 글은 화면 어디에도 남지 않는다.
   - 첫 문장은 질문이 아니라 검사를 받지 않는다. 그래서 '마지막 선생님 말이 정리 기록에 오른다'는 뜻을 그대로 증명한다.
2. **I-1 의 선택지 글.** 선택지는 `I like <카드 필수 1 노리는 단어>.` · `I like it.` 이다.
   - checkChoices(`question-check.ts:251`)는 같은 꼴에서 낱말 하나만 다르고, 하나는 노리는 단어를 담기를 요구한다.
   - 노리는 단어는 next_targets 가 아니라 card_item(required 1)에서 온다. 까닭은 greetingTalkLesson 이 unitWords 를 비워 `talk-lesson.ts:1209` 가 next_targets 를 비우기 때문이다.
   - 낱말은 모두 1단계 시험 어휘 안이다(I · like · it · 카드 노리는 단어).
3. **AC-16c 의 남는 칸.** 옛 시험의 hintKind 'none' 고정 값 대신, 끝맺음 앞뒤의 아이 행 칸(wordCount · inputMode · hintKind)이 같은지를 견준다. 새 꼴 hintKind 는 앞 선생님 move 의 들은 도움에 따라 달라질 수 있어서다.

## 4. 요청하는 변경

- 공용 · src 변경 요청은 없다.
- 회화 plan 증명 표에 AC-8f · AC-8c(끝맺음) · AC-16b · AC-16c 행을 더하는 일은 컨트롤러 몫이다(검토 I-2). 시험 자리는 2절 표와 같다.

## 5. 관문(모두 0)

| 관문 | 결과 |
|---|---|
| biome ci | 575 파일, 고칠 것 없음 |
| tsc --noEmit | 빈 출력 |
| 단위 `pnpm test` | 142 파일, 1781 통과 · 6 todo(전보다 1 늘어난 것은 M-1) |
| check:deps | 위반 0(285 모듈) |
| (참고) check:ids | 0 |
| (참고) spec:trace | missing-test 16(모두 P12, 전과 같음) |

출력 전문은 스크래치패드 `fix1-biome.txt` · `fix1-tsc.txt` · `fix1-unit.txt` · `fix1-deps.txt` · `fix1-ids.txt` · `fix1-trace.txt` 에 있다. M-1 먼저 실패 출력은 `m1-fail.txt`(1 failed)와 `m1-pass.txt`(32 passed)다.

## 6. 시험을 쓰다 찾은 src 결함

없다. 다만 3절 1처럼 기존 e2e 시험 두 곳은 시험 어휘 밖 낱말을 쓴다.
- `talk-lesson.spec.ts:243` · `:470` 의 'Sunday'
- `:797` N3 시험의 'I play soccer.' · 'I play tag.'. 이 시험에는 next_targets · card_item 도 없어, checkChoices 의 no_target 으로 선택지가 비워질 수 있다.

이것들은 묶음 11 이 쓴 것이고 이번 범위 밖이라 고치지 않았다. CI 첫 실행에서 `[data-answer-listen="2"]` 를 기다리다 실패하면 이 까닭부터 본다(묶음 14 에 넘김).

## 7. 남은 우려

1. 새 통합 31건과 e2e 두 곳은 한 번도 돌지 않았다. 그래서 정적 대조만으로 맞춘 값이 있고, CI 첫 실행에서 보아야 한다.
   - AC-2c 의 두 번째 시작이 retry 로 판정되는지는 옛 시험과 같은 가정이다.
   - 친한 정도의 처음 값이 0(null → 0)이라는 것도 가정이다.
   - I-1 의 선택지는 `lesson-turn.ts:1036~1040` 에서 다음 조건이 모두 맞아야 남는다: AI 차례 · 질문 검사 통과 · checkChoices 통과. 질문 'Do you like it?' 이 같은 질문 검사에 걸리면 소리 줄이 사라져 바로 보냄이 일어나지 않는다.
2. `talk-lesson-closing.test.ts:545` 는 시드의 수업 2 내용을 잠깐 옛 꼴로 바꾸고 finally 에서 되돌린다. 같은 파일의 다른 시험(AC-16b 의 다음 대화)도 수업 2 를 쓰므로 차례로 돌 때만 안전하다. vitest 는 파일 안 시험을 차례로 돈다.
