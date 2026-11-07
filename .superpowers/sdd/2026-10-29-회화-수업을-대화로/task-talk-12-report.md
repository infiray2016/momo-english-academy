# 구현 보고: 회화 plan 묶음 12 — 옛 흐름 걷기(구현자 · Opus · high, 2026-11-05 16:4x~18:1x)

상태: DONE_WITH_CONCERNS(우려는 끝 절). 브리프 `task-talk-12.md` 의 할 것 1~7 을 했다. 코드는 워크트리 p13d 에 있다. 지우기 전에 새 갈래 시험이 뜻을 덮는지 보았고, 덮지 않는 것은 새 갈래 시험으로 옮긴 뒤 옛 몫을 지웠다. 관문 일곱은 모두 0 이다. 개발 DB 에 쓰지 않았고 커밋 · push 는 하지 않았다. 변경 전 사본은 스크래치패드 `p13d-before-12.tgz` 에 있다.

## 1. 지운 파일 · 함수(옛 이름 ↔ 새 이름)

| 자리 | 지운 옛 이름 | 남은 새 이름 · 비고 |
|---|---|---|
| 파일 | `src/core/conversation/flow.ts`(옛 위치 · 말해 보기 · 오늘 쓸 말) | `lesson-flow.ts` · `spoken.ts`(같은 말 · 겹침 없애기는 그대로) |
| 파일 | `src/core/ai/calls/talk.ts`(옛 응답 꼴 · 옛 고정부) | `talk-lesson.ts` |
| 쪽 | `talkViewOf` 의 옛 갈래(`loadTalkView` · `TalkFrame` · catch 삼킴) | `loadTalkLessonView` · `TalkLessonFrame`, 던지면 오류 이름을 남기고 다시 던짐(N-5) |
| 감싸기 | `advanceTalk` · `saveTalkFollowAlong` · `chooseMoreTalk` · `stopTalk` · `leaveTalk` · `readTalkWrap` · `revealTalkHint` | `advanceTalkLesson` · `saveLessonFollowAlong` · `chooseLessonMoreTalk` · `stopTalkLesson` · `leaveTalkLesson` · `readTalkLessonWrap` · `revealTalkLessonHint` |
| 서버 index.ts | `loadTalkView` · `saveFollowAlong` · `advanceTalk` · `chooseMoreTalk` · `stopTalk` · `leaveTalk` · `readTalkWrap` · `revealTalkHint` 와 도우미(`ensureStarted` · `openingLinesOf` · `wordInfoOf` · `picturesOf` · `viewSettingsOf` · `TalkView` · `hintsOf` · `lastToriOf` · `wrapLinesOf` · `appendToTori` · `closeTalk` · `wrapViewOf` 등) | 새 갈래 액션 그대로. `oldTalkCloseOf`(순수) · `closeOldTalkSession` 더함(정한 것 2) |
| 턴 길 | `turn.ts` 의 옛 턴 길 전부(`childRowOf` · `toriPlanOf` · 옛 replay 등, 1219줄) | `turn.ts` 는 입구 164줄: 새 꼴 카드면 `runTalkLessonTurn`, 세션이 없거나 옛 꼴이면 stale |
| 상태 | `TalkState` · `readTalkState` · `v1StateOf` · `TurnNext` · `AddLineOut` · `TalkLine` · `PendingView` · `addLinesOf` · `appendLinesFromText` · `nextOf` · `liteOf` · `talkInputOf` · `talkContextAt` · `reachTalkTarget` 등 | `TalkAnyState` 는 `{ old · session } \| { new · state }`, `talkSegmentOf` 더함 |
| 끝맺음 | `oldClosingCall` | 옛 꼴 세션의 대기 기록은 AI 없이 건너뜀(skipped) · 보낸 메시지 지움, 상태는 none |
| AI 흐름 | `streamTalk` · `runTalkCall` · `oldKit` · `TalkOutcome` · `TalkSuccess` · `TalkStreamPlan`, `server/ai` 의 `talkTurn` · `talkClosing` | `streamTalkLesson` · `runTalkLessonCall` · `talkLessonTurn` · `talkLessonClosing` |
| 문장 문 | `stream.ts` 의 `lowLevel` 옵션 · "question" 갈래(옛 흐름만 1~3단계 물음표 문장을 지웠음) | 1~3단계 물음표 문장은 서버 턴 길이 잡아 둔다(정한 것 19, 동작 그대로) |
| 화면 틀 | `TalkFrame` · `TalkFrameBody`(약 1130줄) · `TALK_SEGMENT_LABEL` · `talkBandOf` · `silentCountStep` · `SILENT_COUNT_START` · `heardOf` · `TALK_TEXT.count`, 위 띠 표의 옛 토막 두 칸 | `lessonBandOf` · `lessonSegmentLabelOf` · 서버 `silentBlocked` |
| 쪽지 | `FollowAlong` · `FollowCard` · `followStepsOf` · `practiceRevealOf` · `WrapUp` · 옛 저장 길(`saveTalkFollowAlong`) · `FOLLOW_TEXT.practiceSee` · `practiceMeaning` | `PrepNote` · `LessonWrapUp`, `env.saveFollow` 필수 |
| 말풍선 | `ToriBubble` 의 답 두 개 · 안내 · 그림 · 설명 · 기다림 칸, `spokenOf` · `shownEnglishOf` · `shownKoOf` | `ToriBubble` 은 정리 한 장(글 · 뜻)만, 대화는 `LessonToriBubble` |
| 아이 차례 | `childSaidOf` · `childSaidStep` · `childTurnOpensOf`, `showNotHeard` 칸(새 틀은 늘 참) | `lessonTurnReadyOf`(틀 효과 안 조건을 순수 함수로 꺼냄, 동작 그대로) |
| 흘려 받기 | `sendTalkTurn` · `sendTalkTurnRetrying` · `TalkStreamHandlers` · `dispatch` | `sendTalkLessonTurn` · `sendTalkLessonTurnRetrying` |
| 힌트 | `hintTiersOf` · `turnsShapeTiers` · `questionsShapeTiers` | `lessonHintTiersOf` |
| 정리 | `againLineOf` | `lessonAgainLineOf` |
| 잡아 두기 | `spoken.ts createAnswerHold` | 턴 길 `createLessonSentenceFlow` |
| 시도 꼴 | `talk-today` · `talk-practice` 갈래, `followAlongNo` | `lessonFollowAlongNo`. `talk-start` 의 옛 칸 둘은 판 1 그대로 둠(아래 설계 2) |
| 시드 규격 | `GreetingTurn(Schema)` · `TurnCard(Schema)` · `QuestionCard(Schema)` · `TalkCardV1(Schema)` · `TalkLevelSpecV1` · `talkSpecV1Of` · `textsOfTalkCardV1` · `TalkLessonV1(Schema)` | `talkCardKindOf` 는 new · old · invalid |
| 시드 보기 | 옛 몫 없음(이미 새 꼴만 — 고칠 것 없음) | — |

## 2. 공용 스키마 변경

- `TalkLevelSpecSchema`: `choices` · `koExplainFromStuck` 필수, `twoAnswers` 지움, `segments` 는 `TALK_SPEC_SEGMENTS` 열거, `TALK_CARD_SHAPES` 는 `required` 하나(`TALK_LEVEL_SEGMENTS` 지움). '5-나' 재검토 N-2 의 좁혀 읽기는 필수 칸으로 닫혔다.
- 칸 없는 행 던짐 지움: `hints.ts koExplanationShownOf` · `talk-lesson.ts koExplainRule`(쓰이지 않게 된 단계 매개변수도 지움).
- `TALK_SEGMENTS` 에서 옛 토막 둘을 지웠다. DB 열거는 그대로다(정한 것 8). 새 흐름은 `talkSegmentOf` 로 좁히고 옛 값이면 던진다.
- 규격 정합 `level-spec-talk-v1` 은 네 토막 차례만 본다. 옛 칸은 스키마가 먼저 거부한다.

## 3. 없앤 키 둘

`talk.practice_rounds` · `talk.reask_sentence_every_turns` 를 `seed/settings.json` · `tests/fixtures/settings.ts` · p13d `specs/09-설정값.md`(전용 줄 둘)에서 지웠다. p13d 사본은 본 저장소 정본과 글자까지 같다(diff 없음). 본 저장소 정본은 고칠 것이 없다.

## 4. 작은 정리 · 넘긴 것

- 받침 번호: `move.ts` 에 `TALK_SUPPORT_STAGE_TOGETHER`(1) · `TALK_SUPPORT_STAGE_EASY`(2)를 두고 lesson-flow · talk-lesson · lesson-turn · hints 가 쓴다. 사본 없음 시험을 더했다.
- F-1: `applyTalkLessonChecks` 가 선택지 · 따라 할 말을 비운 뒤 `supportOf` 로 support 를 다시 맞춘다(시험 먼저 실패 확인).
- N-3: 회화 말풍선 안내 '소리가 안 나와서 글로 봐요'를 `BUBBLE_TEXT.soundless` 로 옮겼다(세 영역 선생님 줄과 같은 글인지 시험).
- N-4 동작 몫: (나) 반짝임 낱말 맞춤에 `lemmaEntries` 꼴 목록, (가) 움직임 줄이기에서도 보이는 멈춘 강조(`ring-4 ring-postit-talk` — '잘 모르겠어요' 반짝임과 같은 테두리, 꼴은 UI · UX 묶음 6), (라) '그만하기'로 정리에 갈 때 지금 말풍선을 기록에 올림. (다) '스스로 한 말'은 서버 칸이 필요해 UI · UX 묶음 6 몫 그대로다.
- N-5: 쪽의 catch 가 오류 이름을 남기고 다시 던진다.
- 정한 것 2: 수업 목록은 새 꼴 카드만 칸 후보(`listableLessonsOf`), 열린 옛 꼴 세션은 쪽 자료 읽기가 끝맺음 없이 닫는다(진행 → 중단 · 학습일 · 이음매, 까닭 aborted · 완료 뒤 열린 대화 → 정리만, 까닭 idle, 끝맺음 기록 skipped).

## 5. 옮긴 시험(위험 12 — 0c664c3 고침)

| 고침 | 옛 시험 | 새 갈래 시험 |
|---|---|---|
| C149 듣기 사건 칸 | conversation-server 단위 · conversation-session 통합 | talk-lesson-turn 단위(`lessonChildRowOf`) · talk-lesson-turn 통합(저장) |
| C148 no-speech · AC-N3 막힘 · 알림 | conversation.spec e2e | talk-lesson.spec e2e(들리지 않음 자리 speech.silent_items_max 번) |
| 듣는 동안 단추 끔(N3) | talk-child-listen(옛 말풍선) · conversation.spec e2e | talk-child-listen(새 말풍선 ①②) · talk-lesson.spec e2e |
| 체감 대기(AC-N8) · 말소리 없음 셈 | talk-child-listen | 그대로(공용 함수) |
| '모름' 턴 A~E | talk-repeat · conversation-call · conversation-server · talk-bubble | A · C: talk-repeat(spoken.ts) · talk-lesson-turn I-1, B: talk-lesson-call 1~3단계 카드 자리 규칙, D: talk-lesson-call AC-15c, E: talk-bubble(새 말풍선 설명 줄) |
| 결함 talk-hold(C127 잡아 두기) | talk-hold(createAnswerHold) | talk-lesson-turn 정한 것 19 · I-1 시험 |

그 밖에 옮긴 것: 흘려 받기 몸통 21건(talk-stream-call → `streamTalkLesson`, 새 꼴 대체 견본 `talk_turn.v2-l3-fallback` 더함), 화면 흘려 받기 되풀이 8건, 옛 말풍선 렌더 8건, 정리 되짚을 말 · 끝인사 2건(talk-lesson-wrap), U5-1 · M-1(아이 차례 열기), U5-5 · U5-11, AC-15j(통합 · e2e 새로), 정한 것 2 통합 · 단위 시험. e2e 는 required-utterance · required-recovery · speech-feedback · teacher-window 의 회화 몫을 새 꼴 견본(`greetingTalkLesson` · `talkLessonCard` · `talkLessonReply`)으로 바꿨다. 지운 시험 파일은 단위 셋 · 통합 셋 · e2e conversation.spec · 옛 견본 아홉이다(파일별 수 변화는 스크래치패드 `notes-12.md`).

## 6. 관문(p13d, Node 24)

| 명령 | 결과 |
|---|---|
| `pnpm biome ci` | 0 |
| `pnpm exec tsc --noEmit -p .` | 0 |
| `pnpm vitest run --project unit` | 0, 142 파일 · 1780 통과 · 6 todo(시작 1862 — 옛 흐름 시험을 지우고 옮김) |
| `pnpm check:deps` | 위반 0 |
| `pnpm check:ids` | 0, 설계 숫자 안내 47건 그대로(키 수만 253 → 251) |
| `pnpm spec:trace` | 0, missing-test 16(P12 몫 그대로) |
| `pnpm seed:validate` | 0, 경고 그대로(시작과 같음) |
| plan 217줄 끝 판정 grep | DB 열거 한 줄 · 마이그레이션 SQL 시험 한 줄만 남음 |
| 통합 · e2e | 돌리지 않음(이 Mac 의 커널 공유 메모리 한도로 내장 Postgres 가 뜨지 않음 — 정적, tsc · biome 만) |

## 7. 설계와 다르게 한 것

1. 옛 꼴 규격을 지웠으므로 `talkCardKindOf` 는 옛 꼴에만 있던 칸(firstQuestion · turns · moreTalk · questions)으로 옛 꼴을 알아본다. 이름은 "v1" 에서 "old" 로 바꿨다. 검증기의 talk-card-v1 까닭 한 줄(AC-15m)은 그대로다.
2. 시도 꼴 `talk-start` 의 옛 칸 둘(shownWords · practiceOrder)은 남겼다. 새 흐름이 빈 목록으로 써 온 판 1 행이 strict 규격에서 깨지지 않게 하려는 것이다.
3. `ToriBubble` 은 지우지 않고 정리 한 장 꼴로 줄였다. 새 정리 조각이 쓰므로 `LessonToriBubble` 과 이름을 합치는 일은 하지 않았다.
4. 새 틀의 아이 차례 여는 조건을 `lessonTurnReadyOf` 로 꺼냈다. 동작은 그대로이고 옛 U5-1 · M-1 시험을 옮기려는 것이다.
5. e2e AC-23f 의 '1~3단계 바로 보낸 인사 턴' 단언을 걷었다. 새 흐름 인사 턴은 소리 줄이 없어 인식 확인을 거친다. 같은 까닭으로 speech-feedback 의 U5-9 · U5-3(첫 문장에 말풍선이 사라짐)은 지웠다. 새 설계에서는 기록 칸에 남고 talk-lesson.spec AC-15q 가 본다.
6. N-4 (가)의 멈춘 강조는 기존 '잘 모르겠어요' 반짝임의 테두리를 썼다. 새 꼴을 정하지 않았다.

## 8. 묶음 14 에 넘길 것

- 처음 돌 시험: e2e(talk-lesson.spec 17건, 회화 몫을 바꾼 required-utterance 4 · required-recovery 4 · speech-feedback 7 · teacher-window 14, teacher-choice · font-size 는 기본 견본이 새 꼴로 바뀜), 통합(talk-lesson-session AC-15j · 정한 것 2, talk-lesson-turn C149). 모두 CI 첫 실행에서 확인된다.
- AC-15d 의 Playwright 회귀는 쓸 자리가 없다. 마무리 둘째 장(4단계부터)이 아직 화면에 없다.
- 프리뷰 상태표 '안 되는 것' 첫 줄: 1단계 회화는 둘째 프리뷰까지 닫힘(위험 14, 컨트롤러).
- 개발 DB: 옛 개정 회화 단계 규격 행은 이제 스키마에서 깨진다. 새 꼴 세션은 개정 3 행만 읽으므로 닿지 않는다(T-60). 옛 꼴 세션은 규격을 읽기 전에 닫힌다.

## 9. 우려

1. 통합 · e2e 는 이 Mac 에서 돌리지 못했다. 옮긴 e2e 는 새 틀의 표지(data-prep-step · data-prep-note · data-talk-closed 등)와 서버 규칙(참고 턴 · 들리지 않음 자리 셈)을 코드로 대조해 썼지만, 처음 실행에서 시간 · 차례가 어긋날 수 있다. 특히 teacher-window 의 참고 턴 칭찬 시험은 시험용 시드 1단계 targetTurns 만큼 턴을 민다.
2. 개발 DB 의 옛 따라 말하기 시도 행(talk-today · talk-practice)은 이제 읽히지 않는다(undefined 로 건너뜀). 옛 꼴 세션만 가진 행이라 새 흐름에 닿지 않는다.
3. `LessonToriBubble` · `ToriBubble` 두 이름이 남았다(설계 3). 합치려면 정리 조각을 새 말풍선으로 옮겨야 하고 그것은 새 갈래 동작 바꾸기라 하지 않았다.
