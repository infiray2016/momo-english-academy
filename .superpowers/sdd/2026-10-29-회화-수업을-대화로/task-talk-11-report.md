# 구현 보고: 회화 plan 묶음 11 — 화면(네 토막 · 짧은 준비 쪽지 · 받침 · 두 버튼 · 확인 쪽지 · 위 띠 · 처음 안내) + 서버 액션 감싸기 · 쪽 잇기(구현자 impl-talk-11 · Opus · high, 2026-11-05)

상태: DONE_WITH_CONCERNS(우려는 끝 절). 브리프 `task-talk-11.md` 의 할 것 1~7 을 했다. 코드는 워크트리 p13d 에 있고 커밋 · push 는 하지 않았다. 개발 DB 에 쓰지 않았다. 묶음 10 파일(log.ts · talk-log.tsx · child-turn.tsx · tori.tsx) · 서버 파일 · 순수 흐름 모듈 · 시드 · 설정은 고치지 않았다. 브리프 밖 파일 둘을 고쳤다(아래 '다르게 한 것' 1 · 2).

## 바뀐 파일

| 파일 | 신규 · 수정 | 무엇 |
|---|---|---|
| `src/server/actions/conversation.ts` | 수정 | 새 흐름 감싸기 여덟(105~160줄). 첫 문장은 모두 `await requireAccess()`. 옛 감싸기는 그대로 |
| `src/app/(child)/session/[id]/page.tsx` | 수정 | 갈래 고르기 `talkViewOf`(63줄): 새 꼴이면 loadTalkLessonView → TalkLessonFrame, 아니면 loadTalkView → TalkFrame |
| `src/components/conversation/talk-frame.tsx` | 수정 | 새 틀 TalkLessonFrame(1735줄) · 순수 함수 lessonSegmentLabelOf · lessonBandOf(1582) · lessonBubbleOf(1622) · lessonAfterOf(1660) · lessonAfterEndOf(1681) · 조각 LessonChoice(1698). 문구 TALK_TEXT.talkCount(185). 옛 TalkFrame 은 그대로 |
| `src/components/conversation/follow-along.tsx` | 수정 | 짧은 준비 쪽지 PrepNote(978) · PrepCard(1017) · prepNoteCardOf(942) · prepStepsOf(968), 정리 한 번 LessonWrapUp(1197) · lessonWrapFollowOf(1185), 저장 손잡이 FollowEnv.saveFollow(273) · lessonFollowSaver(296). WrapCard 가 여러 줄을 받게 넓힘(옛 WrapUp 은 한 줄씩 그대로) |
| `src/components/conversation/closing-cards.tsx` | 수정 | 첫 장 끝난 길 closingEndOf(88) · 표지 data-closing-end(134), 머리 주석을 참여 완료 말로. '단어 듣기: <낱말>' 두 줄(가져오기 · aria-label) 그대로 |
| `src/core/teacher/name.ts` | 수정 | 처음 회화 안내에서 '[이름](은/는) 오늘 이야기에 나오는 것만 물어요' 한 줄을 지움(정본 3.3 · 4절 '처음 회화', C145 · C189) |
| `src/lib/talk-stream.ts` | 수정(브리프 밖) | 새 꼴 줄 읽기 sendTalkLessonTurn(310) · sendTalkLessonTurnRetrying(324), 처리기에 onSound · onEnd(lesson). 읽기 · 되풀이 몸통 readTurnLines(120) · retryTurnLines(216)을 두 꼴이 함께 쓴다(옛 함수는 동작 그대로) |
| `tests/unit/talk-follow.test.ts` | 수정 | 새 시험 11(아래 표) |
| `tests/unit/talk-stream.test.ts` | 수정(브리프 밖) | 새 시험 2 |
| `tests/unit/teacher-name.test.ts` | 수정(브리프 밖) | 안내 네 줄로 고침 |
| `tests/e2e/talk.ts` | 수정 | 새 꼴 견본 talkLessonCard · 새 꼴 응답 talkLessonAnswer · talkLessonReply, insertTalkLesson 이 새 꼴 카드도 받음 |
| `tests/e2e/talk-lesson.spec.ts` | 신규(정적) | e2e 10(돌리지 않음) |

## 액션 감싸기 여덟 · 쪽 갈래

| 감싸기(actions) | 부르는 서버 함수 | 틀에서 쓰는 곳 |
|---|---|---|
| loadTalkLessonView | loadTalkLessonView | 끝 줄 뒤 자료 다시 읽기(reload — 인사 끝 · 대화 중 짧은 준비 · 대화 첫 질문 차례) |
| advanceTalkLesson | advanceTalkLesson | 토막 넘김(step advance), 짧은 준비 끝 → 대화 |
| saveLessonFollowAlong | saveLessonFollowAlong | 짧은 준비 · 정리 따라 말하기(lessonFollowSaver, 시도 id 는 자리 · 차례로 고정) |
| chooseLessonMoreTalk | chooseLessonMoreTalk | 두 버튼의 '더 이야기하기' |
| stopTalkLesson | stopTalkLesson | 구석 '그만하기' · 두 버튼의 '그만하기'(needs_confirm 이면 확인 쪽지 뒤 confirmed true) |
| leaveTalkLesson | leaveTalkLesson | '홈' |
| readTalkLessonWrap | readTalkLessonWrap | 참여 완료 뒤 하루 안전 상한 닫힘 · 닫힌 채 열림 |
| revealTalkLessonHint | revealTalkLessonHint | '힌트' 단 열기 |

talkClosingStatus · markTalkNotice 는 두 꼴이 함께 쓴다. 쪽은 loadTalkLessonView 를 먼저 부르고, 옛 꼴이면 그 함수가 undefined 라 옛 자료로 간다.

## 토막별 화면 요소 ↔ 화면 자료 칸

| 토막 · 요소 | 화면 자료 · 끝 줄 칸 | 화면 표지 |
|---|---|---|
| 여는 차례(막힘 → 쉼 → 고르기 → '시작!' → 마이크 안내) | resting · teacher · teacherChoices · noticesSeen.talk_intro | data-blocked · data-talk-rest · data-talk-start |
| 위 띠 토막 이름 | segment(짧은 준비 쪽지 중이면 '짧은 준비') | data-talk-segment |
| 위 띠 셈(분모 없음) | position.talkCount, 마무리 물음 뒤 moreInRound · settings.talk.moreRoundTurns | data-talk-count |
| 인사 · 대화 말풍선 | current(lines · sound) → lessonBubbleOf, 턴 중 s · ko · add · sound 줄 | data-tori-bubble · data-sound-listen · data-answer-listen |
| 대화 기록 칸 | log → talkLogOf(마지막 선생님 행 뺌), 보낼 때 지금 말풍선 · 아이 말을 더함 | data-talk-log |
| 할 일 | step → lessonAfterOf, 끝 줄 → lessonAfterEndOf | data-talk-phase |
| 짧은 준비 쪽지 | prep(place · words · done), spec.band · level | data-prep-note · data-prep-word · data-prep-example |
| 받침 한국어 설명 | 끝 줄 explanation | data-tori-explanation |
| 힌트 단 | current.hints → 끝 줄 hints, 연 단은 revealTalkLessonHint | data-hint-tier |
| '잘 모르겠어요' 반짝임 | position.flashDontKnow · 끝 줄 flashDontKnow | data-dont-know[data-flash] |
| 막힘 화면(말소리) | 끝 줄 silentBlocked | data-blocked="silent" |
| 두 버튼 | 끝 줄 choice · step choice | data-talk-choice |
| 확인 쪽지 | stopTalkLesson 의 needs_confirm | ConfirmSheet |
| 맞장구 | waitLines · settings.talk.waitLineSeconds | 읽기만(기록 없음) |
| 이어 하기 | retryTurn(같은 시도 id) · step prep(쪽지부터) · log | — |
| 정리 | WrapView.lines · farewell(stopTalkLesson · readTalkLessonWrap) | data-wrap-all · data-wrap-farewell |
| 마무리 첫 장 끝난 길 | WrapView.aborted · retry | data-closing-end |

## 시험

먼저 실패를 본 것: teacher-name 1(안내 다섯 줄), talk-follow 5(함수 없음) → 4(틀 함수 없음) → 1(closingEndOf 없음), talk-stream 2(sendTalkLessonTurn 없음). 그 뒤 모두 통과다.

| 시험 이름(머리) | 파일 | AC |
|---|---|---|
| AC-15a 짧은 준비 쪽지 글(1단계 그림 · 뜻 · 소리 / 2~3단계 낱말 / 4단계 예문, 들려줄 말) | talk-follow | 15a |
| AC-15a 짧은 준비: 끝낸 차례 건너뜀 | talk-follow | 15a · 15f |
| AC-15a 짧은 준비 쪽지 화면(정적 그림) | talk-follow | 15a |
| AC-15a 정리: 1~3단계 되짚을 말 전체 한 번 | talk-follow | 15a |
| AC-15a 정리 화면: 한 말풍선 · 말하기 단추 하나 · 끝인사 아직 없음 | talk-follow | 15a |
| AC-15a 위 띠: 토막 이름 · 분모 없음 · 마무리 물음 뒤 셈 | talk-follow | 15a |
| AC-15q · AC-15f 이어 하기 말풍선(T2) | talk-follow | 15q · 15f |
| AC-15f · AC-15t 토막 넘김 · 끝 줄 뒤 할 일 | talk-follow | 15f · 15t |
| AC-15t 고르기 두 버튼(앱 고정 대사 · 숫자 없음) | talk-follow | 15t |
| AC-15t 첫 장 끝난 길 · '단어 듣기: <낱말>' | talk-follow | 15t · 15e |
| AC-16c 처음 회화 안내 네 줄 | teacher-name | 16c |
| AC-15q 새 꼴 턴 줄 차례 · 새 꼴 끝 줄 갈래 · stale 되풀이 | talk-stream | 15q |
| e2e(정적) 네 토막 · 확인 쪽지 · 정리 한 번 · 마무리 장 / 참여 있는 '그만하기' / 마무리 제안 두 버튼 / 소리 줄 · 힌트 차례 · 안내 한 번 / 받침 설명 / 들리지 않음 반짝임 / 이어 하기 / 맞장구 / 위 띠 | talk-lesson.spec.ts | 15a · 15e · 15f · 15g · 15l · 15m · 15p · 15q · 15s · 15t · N8 · N10 |

## 관문(Node 24, 출력은 스크래치패드 `t11-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm biome ci` | 0, 589 파일 |
| `pnpm exec tsc --noEmit -p .` | 0 |
| `pnpm vitest run --project unit` | 0, 144 파일 · 1847 통과 · 6 todo |
| `pnpm check:deps` | 위반 0(287 모듈) |
| `pnpm check:ids`(CI 인자) | 0, design-number 49 / 49, 이 묶음 파일은 목록에 없음 |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0(p13d 에 회화 plan 이 없어 --plan 없이 돌림) |
| e2e | 돌리지 않음(정적) |

스크래치패드: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/`

## 설계와 다르게 한 것 · 해석

1. **`src/lib/talk-stream.ts` 를 고쳤다(plan 파일 표 밖 — 컨트롤러가 plan 보정 11-05 (9)로 묶음 11 파일에 더함).** 까닭은 옛 읽기가 새 꼴 줄을 읽지 못하기 때문이다. sound 줄에는 갈래가 없어 턴이 깨지고, 끝 줄은 lesson 이 아니라 next 칸으로 읽는다. 새 이름 sendTalkLessonTurn · sendTalkLessonTurnRetrying 과 단위 시험 2건을 더했다. 읽기 · 되풀이 몸통을 두 꼴이 함께 쓰도록 나눴고, 옛 이름 · 동작 · 옛 시험 8건은 그대로다. talk-frame 안에 같은 읽기를 두지 않았다.
2. **`tests/unit/teacher-name.test.ts` 를 고쳤다(브리프 밖).** name.ts 를 덮는 시험이다.
3. **처음 회화 안내는 네 문장이다.** 브리프의 'C110 의 안내 다섯 문장은 그대로'를 '여는 차례 다섯 단계는 그대로'로 읽었다. 정본 3.3 322줄의 안내 글은 네 문장이다.
4. **'대화로' 단추를 두지 않았다.** plan 문구 표에 그 글이 없다. 쪽지는 마지막 낱말(건너뛴 낱말 포함) 뒤 저절로 대화로 넘어간다.
5. **인사 끝 · 대화 중 짧은 준비 · 대화 첫 질문 차례 뒤에는 화면 자료를 다시 읽는다(reload).** 끝 줄만으로는 짧은 준비로 갈지와 쪽지 낱말 자료를 알 수 없다. 서버의 step 과 prep 을 그대로 따른다.
6. **앱이 만든 새 선생님 행은 새 말풍선이다.** 대화 첫 질문 · '더 이야기하기' · 'Now let's talk.' 행이 그렇다. 앞 말풍선은 대화 기록 칸으로 올라간다. 옛 틀은 같은 말풍선에 이어 붙였다.
7. **'힌트 마지막 단까지 열기'의 막힘 셈은 근사다.** 화면 자료와 끝 줄에 받침 단계가 없다. 같은 질문 자리에서 이어 누른 '잘 모르겠어요' 수를 세고 talk.dontknow_max 에 닿으면 0 으로 돌린다. 막힘 말(AI 판정)은 세지 못한다.
8. **대화 말풍선 옆 그림은 두지 않았다.** current · 끝 줄에 그림 키가 없다. 1단계 그림 낱말은 묶음 16 몫이다.
9. **'그만하기'는 서버 판정을 먼저 묻는다.** 확인 쪽지가 뜨는 동안 대화(진행 중 턴 · 읽기)는 그대로다. 정리로 갈 때만 턴 요청을 끊는다.
10. **1단계 쪽지의 다시 듣기 단추는 있는 문구 TEACHER_TEXT.replay 를 접근 이름으로 쓴다.** 새 글은 없다.

## 요청하는 변경(이 묶음 파일 밖)

1. (닫힘) talk-stream.ts 몫은 plan 보정 11-05 (9)로 정해졌다.
2. (서버, 묶음 8 · 9 파일) 끝 줄 TalkLessonNext 와 화면 자료 position 에 받침 단계(stage)를 내리면 위 7 의 근사를 없앤다.
3. (서버) current 에 그 차례 그림 키(카드 항목 imageKey)를 내리면 1~3단계 그림 턴(C32)을 다시 보인다.

## 묶음 12 에 넘길 것(지울 옛 이름)

- 감싸기: advanceTalk · saveTalkFollowAlong · chooseMoreTalk · stopTalk · leaveTalk · readTalkWrap · revealTalkHint, 쪽 talkViewOf 의 옛 갈래(loadTalkView).
- 틀: TalkFrame · TalkFrameBody · TALK_SEGMENT_LABEL · talkBandOf · silentCountStep · SILENT_COUNT_START · targetReachedNow 의 옛 쓰임 · TALK_TEXT.count · heardOf(옛 AddLineOut).
- 쪽지: FollowAlong · FollowCard · followStepsOf · practiceRevealOf · WrapUp · saveFollow 의 옛 저장 길(saveTalkFollowAlong) · FOLLOW_TEXT.practiceSee · practiceMeaning.
- 흘려 받기: sendTalkTurn · sendTalkTurnRetrying · TalkStreamHandlers · dispatch(옛 줄).
- e2e: talkCardV1 기반 견본(greetingToTalkLesson · fullTalkLesson · reinforceTalkLesson · talkReply)과 conversation.spec.ts 의 옛 흐름 시험.

## 묶음 14 눈 점검 항목(카드 적재 뒤)

- 짧은 준비 쪽지: 3단계 낱말 글 · 뜻 · 예문 없음, 다시 듣기 단추 자리, 아이 말풍선 · 결과 말, 쪽지 중 위 띠 셈 숨김.
- 대화 기록 칸: 지금 말풍선이 맨 아래 · 지난 말 위로, 앱이 만든 새 행이 새 말풍선이 되는 모습(위 6), 기록 칸 높이와 아이 차례 단추가 한 화면에 들어오는지.
- 두 버튼 · 확인 쪽지 · 막힘 화면(말소리), '잘 모르겠어요' 반짝임, 받침 한국어 설명 자리.
- 정리 한 번: 되짚을 말 전체 한 말풍선, 말하기 단추 하나, 끝인사 한 번 뒤 마무리 첫 장.
- 맞장구 체감(talk.wait_line_seconds) · 첫 문장 차례.

## 우려

1. **e2e 열 건은 돌리지 않았다.** e2e DB 의 회화 단계 규격 행이 새 꼴인지, 견본 카드의 짧은 준비 낱말 · 정리 대사가 시험 가정과 맞는지는 처음 돌 때 확인된다. 회화 e2e 를 새 꼴로 옮기는 일은 묶음 12 다.
2. **묶음 10 이 나란히 고치는 중이다.** 쓰는 이름 · 받는 값을 impl-talk-10 에 알렸다. 꼴이 바뀌면 틀이 형에서 깨진다.
3. 다음 선생님 행 번호는 끝 줄마다 하나 더한 값으로 본다(맞장구 고르기 · 다시 읽은 자료가 새 행인지 가르기). 실패 길에서 행이 안 생긴 턴 뒤 다시 읽으면 같은 말풍선이 한 번 더 생길 수 있다.
4. 짧은 준비 쪽지의 읽기는 쪽지 자체 읽기 줄이라 감시 기록(sp, w prep)에 들지 않는다. 들려주지 못한 소리 줄도 들은 답(heard)으로 넘긴다.
5. 정리 화면의 '대화 기록에서 오늘 쓸 말이 든 아이 말 반짝임'(03 정리 행)은 하지 않았다. 정리에는 기록 칸이 없어서다(UI · UX 묶음 6 과 같이 볼 것).
6. 이어 하기 때 받침 한국어 설명은 다시 보이지 않는다(화면 자료에 없음).

## 덧붙임(11-05, 컨트롤러 알림 뒤)

- **인사 질문 자리 힌트(브리프 할 것 6).** 판정은 '정본이 요구함'(묶음 8 검토 I-2 · fix 1)이다. 틀은 처음부터 토막과 관계없이 current.hints · 끝 줄 hints 를 ChildTurn 에 넘긴다. ChildTurn 은 단이 있을 때만 '힌트' 단추를 둔다(child-turn.tsx showHint). 인사 턴 예외가 없어 고칠 것이 없다. fix 1 이 인사 질문의 단을 내면 그대로 보인다.
- **e2e 파일을 덮어쓴 일.** `tests/e2e/talk-lesson.spec.ts` 는 묶음 10 이 먼저 만들어 '회화 묶음 10' 덩이 5건(test.fixme)을 넣어 둔 파일이었다. 묶음 11 이 그 알림을 받기 전에 Write 로 새로 써서 그 덩이가 사라졌다. impl-talk-10 에 알리고 파일 끝에 Edit 로 다시 붙여 달라고 했다. 새 꼴 도우미(talkLessonCard · talkLessonReply · openLesson · throughGreetingAndPrep)도 알렸다. 묶음 11 은 이 파일을 이제 Edit 로만 고친다. (닫힘) impl-talk-10 이 파일 끝(462줄)에 '회화 묶음 10' 덩이를 다시 붙였다. 시험은 셋이고 fixme 는 없다. 파일 안 도우미(openLesson · throughGreetingAndPrep · untilChildTurn · speak · bubble)를 쓰므로 이름을 바꾸면 그 덩이도 함께 고친다. 붙인 뒤 biome ci 0 · tsc 0 이다.
