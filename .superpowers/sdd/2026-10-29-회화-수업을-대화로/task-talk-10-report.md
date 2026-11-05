# 구현 보고: 회화 plan 묶음 10 — 화면: 대화 기록 · 아이 말풍선 · 맞장구 · 소리 줄 단추(구현자 impl-talk-10 · Opus · high, 2026-11-05 15:2x~)

상태: DONE_WITH_CONCERNS. 브리프 `task-talk-10.md` 의 할 것 1~5 를 했다. 코드는 워크트리 p13d 에 있다. 시험을 먼저 써서 실패(기록 모듈 없음 1 파일 · 말풍선 시험 15 건)를 본 뒤 통과시켰다. 이 묶음 파일은 biome · tsc 오류 0 이고 덮는 단위 시험은 모두 통과한다. 관문 전체가 0 이 아닌 까닭은 나란히 도는 다른 묶음의 진행 중 파일이다(관문 절). 틀(talk-frame)에 잇는 일은 묶음 11 몫이라 이 묶음의 조각은 아직 화면에 나오지 않는다. 개발 DB 에 쓰지 않았고 커밋 · push 는 하지 않았다.

## 새 파일 · 바뀐 파일

| 파일 | 새 / 고침 | 무엇 |
|---|---|---|
| `src/core/conversation/log.ts` | 새(177줄, 순수) | `talkLogOf`(78) · `liveTeacherEntryOf`(132) · `childLogEntryOf`(160) · `childSaidOfInput`(48) · `talkLogAppend`(171) · 기록 칸 토막 `TALK_LOG_SEGMENTS`(9: 인사 · 대화 · 더 이야기하기) |
| `src/components/conversation/talk-log.tsx` | 새(135줄) | `TalkLog`(78): 표지 data-talk-log · role log · 위로 넘김(overflow-y-auto, 줄 수 · bottomKey 가 바뀌면 맨 아래로) · 지금 턴은 children 으로 맨 아래(data-talk-log-now) · 지난 선생님 말 단추 data-talk-log-teacher('[이름] 말 다시 듣기', 누르면 onReplay(그 말의 화면 글 줄)) · 아이 말은 ChildBubble |
| `src/components/conversation/child-turn.tsx` | 고침 | 문구 `notHeard: "못 들었어요"`(66) · `ChildBubble`(251, said 속성: 인식 글 · '잘 모르겠어요' · 회색 '못 들었어요'. 옛 text 속성 그대로) · `attemptSaidStep`(284) · `hintsDimmedOf`(295) · `childHeardOf`(317) · `speakHitchOf`(339) · `createSpeakHitchLog`(354) · `withSpeakHitches`(371). ChildTurn 새 속성 셋: flashDontKnow(data-flash, FLASH_MS 91) · hintsDimmed(data-hint-dimmed · disabled) · showNotHeard(시도 자리 회색 말풍선 data-child-attempt) |
| `src/components/conversation/tori.tsx` | 고침 | 문구 `BUBBLE_TEXT.model "따라 할 말 듣기"`(plan 문구 표) · `BUBBLE_CLASS` · `BUBBLE_WIDTH` 내보냄 · 새 꼴 줄 형(426~452) · `lessonBubbleStep`(458) · `lessonShownEnglishOf`(480) · `lessonSoundsOf`(497) · `lessonSpeakItemsOf`(507) · `lessonSpokenOf`(525) · `waitLineDelayMs`(533) · `useWaitLine`(546) · `LessonToriBubble`(580) · `useSpeakQueue`(788)이 `{ text, w }` 항목과 `onSpoken(item, outcome)` 을 받음(글만 넘기면 전과 같음) |
| `tests/unit/talk-log.test.ts` | 새 | 14 건 |
| `tests/unit/talk-bubble.test.ts` | 고침 | 15 건 더함('묶음 10 —' 세 덩이) |
| `tests/e2e/talk-lesson.spec.ts` | 새(정적) | '회화 묶음 10' 덩이 5 건, test.fixme(억제 주석에 까닭) |

옛 ToriBubble · spokenOf · shownEnglishOf · ChildBubble({ text }) · 옛 흐름 동작은 그대로다(묶음 12 가 걷는다).

## 화면 자료 칸 → 화면 요소

| 화면 자료 칸 | 거치는 함수 | 화면 요소 |
|---|---|---|
| `view.log`(묶음 9 lessonLogOf) | talkLogOf(view.log, { koMeaning: view.spec.koMeaning }) | TalkLog 지난 줄. 선생님은 영어 줄 + 뜻(1~4단계), 아이는 data-child-said="speech · dont_know · not_heard" |
| 아이 행 input dont_know · nospeech 거짓 | childSaidOfInput | '잘 모르겠어요' 말풍선 |
| 아이 행 nospeech 참 | childSaidOfInput | 회색 '못 들었어요' 말풍선 |
| 행 segment prep · wrap_up · 옛 값 | TALK_LOG_SEGMENTS 로 거름 | 기록 칸에 없음(정본 03 4절) |
| 흘려 받은 줄 s · ko · add · sound(묶음 8 TalkLessonLine) | lessonBubbleStep | LessonToriBubble 글(s · add), 뜻(ko · add.ko, 끝 줄과 다 흐른 뒤), 소리 줄 단추 |
| sound model · answer | lessonSpeakItemsOf | 글 없는 단추 data-sound-listen="model · answer"('따라 할 말 듣기') |
| sound choices | lessonSpeakItemsOf(1단계 'Or' 한 줄, 2~3단계 둘을 차례로) | ①② data-answer-listen 1 · 2('첫째 · 둘째 답 듣기') |
| 지금 말풍선(턴이 넘어갈 때) | liveTeacherEntryOf(소리 줄 뺌) · talkLogAppend | 기록 칸에 더함 |
| 보낸 아이 입력(ChildSend.input) | childLogEntryOf · talkLogAppend | 기록 칸 아이 말풍선(바로 보낸 1~3단계 턴 포함) |
| `view.waitLines` · `settings.talk.waitLineSeconds` | waitLineOf(묶음 9) → useWaitLine | 맞장구를 읽기 줄에 `{ w: "wait" }` 로 넣음(글 · 기록 없음) |
| 끝 줄 `lesson.flashDontKnow`(또는 position.flashDontKnow) | ChildTurn flashDontKnow | '잘 모르겠어요' 한 번 반짝임(문구 없음) |
| 끝 줄 전 · current.kind ai · 단계 | hintsDimmedOf({ lowLevel, aiTurn, responseEnded }) | '힌트' 단추 흐림 |
| 들려준 소리 줄 | childHeardOf | ChildTurn heard(인식 확인 견줌 · 들은 도움) |
| 읽기 결과 | onSpoken → speakHitchOf → createSpeakHitchLog → withSpeakHitches | client_listen.sp(정한 것 10) |
| 소리 줄 읽기 결과 | sound-retry soundTrackOf · soundRetryStepOf → soundRetry | '소리가 안 나왔어요. 다시 들어 봐요' + 큰 단추(data-sound-retry), 다시도 못 들려주면 무음 모드 줄 |

## 시험(AC)

| 파일 | 건수 | AC |
|---|---|---|
| `tests/unit/talk-log.test.ts` | 14 | AC-15q 단위 몫: 고르기 다섯(차례 · 뜻 1~4단계 · 준비 · 정리 빼기 · 빈 줄과 열쇠 · talk_turns → lessonLogOf → talkLogOf 에 소리 줄 글 없음 T2), 살아 있는 턴 다섯(소리 줄 뺌 · 소리 줄뿐인 말풍선 · 보낸 말 셋 · 바로 보낸 턴 · 두 번 넣지 않음), 기록 칸 그림 넷(표지 · 넘김 · 지금 턴 맨 아래 · 다시 듣기 단추와 이름 채움 · 말풍선 셋 · 회색) |
| `tests/unit/talk-bubble.test.ts`(더한 몫) | 15 | AC-15q(말풍선에 소리 줄 글 없음 · 듣기 단추 꼴 · 듣는 동안 꺼짐 · 4단계부터 답 글 · 들려주지 못함 안내 · 읽을 차례 · 지금 턴 다시 읽기 · 시도 자리 '못 들었어요' · 반짝임 · 들은 답), AC-N10(맞장구 때), 정본 03 4절 힌트 행(흐림), 정한 것 10(sp 둘) |
| `tests/e2e/talk-lesson.spec.ts`(정적) | 5 | AC-15q(남음 · 넘김 · 지난 말 다시 읽기 · 소리 줄 글 없음 · 바로 보낸 턴과 '잘 모르겠어요' · 이어 하기 다시 그림), AC-N10(점 셋 1초 · 맞장구 1.5초 · 첫 문장은 그 뒤 · 기록에 없음 · 말풍선 남음) |

## 관문(Node 24, 출력은 스크래치패드 `t10-*.txt`)

| 명령 | 결과 |
|---|---|
| 새 시험 두 파일(고치기 전) | 실패: 모듈 없음 1 파일 · 15 건(`t10-red.txt`) |
| 덮는 시험 셋(talk-log · talk-bubble · talk-child-listen) | 0, 49 통과(`t10-final.txt`) |
| `pnpm biome check --write`(이 묶음 7 파일) | 0 |
| `pnpm biome ci` | 1. 오류 5 는 모두 남의 파일이다(follow-along.tsx · talk-follow.test.ts — 묶음 11, seed-load-goals.test.ts) |
| `pnpm exec tsc --noEmit -p .` | 2. 남은 오류는 `src/app/(child)/session/[id]/page.tsx` 하나다(묶음 11 이 TalkLessonFrame 을 아직 내보내기 전). 이 묶음 파일은 0 |
| `pnpm vitest run --project unit` | 1. 144 파일 · 1839 통과 · 2 실패 · 6 todo. 실패 둘은 묶음 11 의 새 talk-stream.test.ts(먼저 쓴 시험)다. 앞선 돌림에서는 seed-load-goals 둘이 실패했다가 그쪽이 고쳐졌다 |
| `pnpm check:deps` | 위반 0 |

## 설계와 다르게 한 것

1. **새 꼴 말풍선을 옛 ToriBubble 과 따로 `LessonToriBubble` 로 두었다.** 옛 AddLineOut 꼴(two_answers · again)을 바꾸면 옛 흐름 화면이 깨진다(plan 정한 것 1). 묶음 12 가 옛 것을 지울 때 이름을 합치면 된다.
2. **소리 줄 단추는 받은 때 바로 그린다.** 소리 줄이 선생님 문장 뒤에 오기 때문이다(묶음 8 lessonAfterLinesOf). 글이 다 흐를 때까지 미루면 단추 자리가 늦게 생겨 뜻 줄이 뛴다.
3. **들려주지 못한 소리 줄에 작은 '다음'을 두지 않는다.** 7절 34줄의 '다음'은 문항 자리 몫이다. 회화는 읽는 동안에도 아이 차례 말하기 단추가 열려 있어(C166 R1) 막다른 화면이 아니다. 안내 한 줄 · 큰 다시 듣기 · 둘째부터 무음 모드 줄만 둔다.
4. **2~3단계 선택지는 'Or' 없이 둘을 차례로 읽는다.** 정본 7절 9줄은 'Or' 를 1단계에만 둔다. 둘 사이 쉼은 C125 문장 사이 쉼을 쓴다.
5. **sp 모으기는 child-turn.tsx 에 순수 함수로 두었다.** 읽기 결과는 tori.tsx 의 읽기 줄이 onSpoken 으로 넘긴다. 감시가 끝낸 발화(ended 의 no_end · not_played)만 남기고, 끊김 · 오류 · 읽지 않음은 남기지 않는다(정한 것 10 '감시가 끝낸 것만').
6. **맞장구는 글로 보이지 않는다.** 정본 03 4절은 '읽고'만 적고 화면 글을 두지 않는다. 기록에도 넣지 않는다.
7. **반짝임 길이 FLASH_MS(2초)는 화면 꼴 값이다.** animate-pulse 한 바퀴이고 설계 숫자가 아니다. 움직임 줄이기면 굵은 테만 남는다.
8. **e2e 덩이는 test.fixme 다.** 새 꼴 세션 도우미가 묶음 11 의 talk.ts 몫이라 openLesson 자리를 던지게 두었다. 억제 주석에 까닭을 적었다. 파일은 이 묶음이 먼저 만들었고, 묶음 11 에 파일 위쪽에 Edit 로 더하라고 알렸다.

## 묶음 11 에 넘길 것(틀 잇기)

- 기록 칸: `entries = talkLogOf(view.log, { koMeaning: view.spec.koMeaning })` 로 시작한다. 턴이 넘어갈 때 `talkLogAppend(entries, liveTeacherEntryOf({ turnNo, content, koMeaning }))` 와 `talkLogAppend(entries, childLogEntryOf(turnNo, send.input))` 를 쓴다. 인사 · 대화 · 더 이야기하기 토막에서만 `<TalkLog … onReplay={(t) => queue.replay(t)}>{지금 턴}</TalkLog>` 를 그린다.
- 말풍선: 받은 줄을 `lessonBubbleStep` 으로 쌓고, 읽기는 줄마다 `queue.enqueue(lessonSpeakItemsOf(line, level))` 로 한다. 말풍선 누름은 `queue.replay(lessonSpokenOf(content, level))`, 소리 줄 단추는 `onSound={(items) => queue.replay(items)}` 다. childTurnOpensOf 의 shownLines 는 `lessonShownEnglishOf(content).length` 다.
- 맞장구: `useWaitLine({ waitingSince, seconds: settings.talk.waitLineSeconds, line: waitLineOf(view.waitLines, 다음 선생님 턴 번호), onDue: (l) => queue.enqueue([{ text: l, w: "wait" }]) })`.
- 아이 차례: `flashDontKnow`(끝 줄 · position) · `hintsDimmed={hintsDimmedOf(…)}` · `showNotHeard` 를 넘긴다. heard 는 들려준 소리 줄만 `childHeardOf` 에 넘긴다. 들려주지 못한 줄은 들은 도움이 아니다(7절 34줄).
- sp: `useSpeakQueue(speech, { …, onSpoken: (item, out) => { const h = speakHitchOf(item.w, out); if (h) hitchLog.record(h); if (item.w === "sound") setTrack((t) => soundTrackOf(t, out)); } })` 를 쓰고, takeClientListen 에서 `withSpeakHitches(base, hitchLog.take())` 를 부른다. 짧은 준비 · 바닥선 · 정리의 읽기는 w 를 prep · floor · wrap 으로 넣는다.
- e2e: `openLesson` 을 새 꼴 세션 도우미로 바꾸고 fixme 를 푼다.

## 묶음 14 눈 점검 항목(카드 적재 뒤)

1. 기록 칸이 위로 넘어가는지, 지금 턴이 맨 아래에 붙는지, 새 줄이 오면 맨 아래로 가는지 본다.
2. 1~3단계에서 따라 할 말 · 선택지 · 받침의 답 글이 말풍선과 기록 어디에도 없는지 본다. 글 없는 듣기 단추가 그 줄만 다시 읽는지도 본다.
3. 1단계 선택지 사이에서 'Or' 를 읽는지, 2~3단계는 쉼을 두고 둘을 읽는지 듣는다.
4. 첫 문장이 늦은 턴에서 맞장구가 1.5초에 읽히고, 첫 문장이 그 뒤에 오는지 듣는다. 맞장구 다섯 문구는 요청자가 듣고 고친다(정한 것 20).
5. 회색 '못 들었어요'(인식 실패 · 들리지 않음)와 '잘 모르겠어요' 말풍선의 꼴, 들리지 않음 뒤 '잘 모르겠어요' 반짝임이 한 번뿐인지 본다.
6. 4단계부터 · 1~3단계 AI 차례의 '힌트' 단추가 응답 끝까지 흐린지 본다.
7. 지난 선생님 말을 누르면 그 말만 같은 선생님 목소리 · 빠르기로 읽는지 듣는다.

## 우려

1. **(Important, 묶음 11 이 잇기 전까지) 이 묶음의 조각은 아직 화면에 나오지 않는다.** 틀과 쪽은 묶음 11 파일이다. 잇는 길은 위 절에 적었다. 잇는 동안 형이 어긋나면 묶음 11 이 알려 주면 된다.
2. **(Minor) 지난 선생님 말 다시 읽기는 기록 줄 단위다.** 선생님 문장 여럿을 한 줄로 이어 두었으므로 문장 사이 쉼은 읽기 줄이 문장을 나누지 않는 한 짧다. 지금 읽기 줄은 받은 항목 단위로 쉰다.
3. **(Minor) 같은 턴 번호에 아이 행이 둘 이상이면** 기록 열쇠에 '#n' 을 붙여 겹치지 않게 했다. 살아 있는 턴의 열쇠(child:턴 번호)와 다시 읽은 자료의 열쇠가 다를 수 있다. 이어 하기는 쪽을 새로 그리므로 문제가 되지 않는다.
4. **(Minor) e2e 다섯은 돌리지 않았다.** 이 Mac 에서는 e2e 가 돌지 않는다. 도우미가 생긴 뒤 CI 에서 처음 확인된다.

## 덧붙임(11-05, impl-talk-11 알림)

- 묶음 11 이 talk-frame.tsx 의 TalkLessonFrame 에 이 묶음 조각을 이었다고 알려 왔다(그쪽 기준 tsc 0 · 단위 1847 통과). 우려 1 은 묶음 11 검토에서 닫는다.
- 묶음 11 이 쓰는 이름은 이 보고의 표와 같다. 소리 줄 다시 듣기 안내에는 soundRetryStepOf(canSkip 참)를 넘기는데, LessonToriBubble 은 'next' · 'wait' 를 같게 다룬다(안내 한 줄 + 무음 모드 줄, '다음' 없음 — 설계와 다르게 한 것 3).
- 새 줄 흘려 받기는 묶음 11 이 src/lib/talk-stream.ts 에 sendTalkLessonTurn · sendTalkLessonTurnRetrying 으로 더했다. 이 묶음은 그 파일을 고치지 않았다.

## 덧붙임 2(11-05, e2e 덩이 다시 넣음)

- impl-talk-11 이 알림을 받기 전에 `tests/e2e/talk-lesson.spec.ts` 를 Write 로 새로 써서, 위 '시험' 표의 e2e 다섯(fixme)이 사라졌다. 이제 묶음 11 은 그 파일을 Edit 로만 고친다.
- 새 꼴 도우미(talkLessonCard · talkLessonReply · 파일 안 openLesson · throughGreetingAndPrep)가 생겨서, 묶음 10 덩이를 그 도우미로 다시 써서 파일 끝에 붙였다. fixme 와 억제 주석은 없다(설계와 다르게 한 것 8 은 닫힘).
- 묶음 11 덩이가 이미 보는 것은 겹치지 않게 뺐다: 소리 줄 글 없음 · 들리지 않음 반짝임과 기록의 '못 들었어요' · 이어 하기 다시 그림 · 맞장구(AC-N10).
- 다시 넣은 묶음 10 덩이 셋(정적, AC-15q):
  1. 보낸 아이 말풍선이 다음 선생님 첫 문장 뒤에도 기록 칸에 남는다. 위로 넘겨 지난 선생님 말을 누르면 그 말만 다시 읽는다.
  2. 2~3단계 선택지는 글 없는 ①② 단추다. 'Or' 없이 둘을 차례로 읽고, ①은 그 답만 다시 읽는다.
  3. 인식 실패 시도는 그 자리에 회색 '못 들었어요'를 보이고 다음 시도가 덮는다. '잘 모르겠어요'로 보낸 턴은 기록에 '잘 모르겠어요'로 남는다.
- 검사: `pnpm biome check --write tests/e2e/talk-lesson.spec.ts` 0, `pnpm exec tsc --noEmit -p .` 0(이 시점에는 다른 묶음 오류도 없음). e2e 는 이 Mac 에서 돌리지 않았다.
