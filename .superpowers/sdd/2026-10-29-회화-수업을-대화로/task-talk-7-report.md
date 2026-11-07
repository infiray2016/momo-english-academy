# 구현 보고: 회화 plan 묶음 7 — 서버 상태 · 기록(구현자 impl-talk-3 · Opus · high, 2026-10-30 09:4x~10:2x)

상태: DONE. 브리프 `task-talk-7.md`(보정 문단 포함)의 할 것 1~6 을 했다. 관문은 모두 0 이다. 마이그레이션은 만들기만 했고 개발 DB 에는 적용하지 않았다. 커밋 · push 없음. 시험을 먼저 써서 실패(시도 꼴 6 · 상태 7)를 본 뒤 통과시켰다.

## 마이그레이션

`drizzle/0006_talk_turns_move_prep.sql`(`pnpm exec drizzle-kit generate --name talk_turns_move_prep`, 이 구현자 한 번) · `drizzle/meta/0006_snapshot.json` · `drizzle/meta/_journal.json`(idx 6).

```sql
ALTER TYPE "public"."talk_segment" ADD VALUE 'prep' BEFORE 'today_words';--> statement-breakpoint
ALTER TABLE "talk_turns" ADD COLUMN "move" jsonb;
```

더하기만이다. 더한 값 prep 은 같은 파일에서 쓰지 않는다. Postgres 12 부터 ADD VALUE 는 트랜잭션 안에서 되지만, 같은 트랜잭션에서는 그 값을 쓸 수 없다. drizzle migrate 는 남은 마이그레이션을 한 트랜잭션으로 돌리므로, 0007(P12 의 열 넷)이 같은 적용에 들면 그 파일도 'prep' 값을 쓰면 안 된다. RLS 는 표 단위라 그대로다. Drizzle 스키마는 `src/db/schema/content.ts:55`(talkSegmentEnum 에 prep) · `src/db/schema/learning.ts:225`(talk_turns.move jsonb)다.

## 바뀐 형 · 꼴 칸

| 자리 | 바뀐 것 |
|---|---|
| `src/core/seed/structure.ts:212` TALK_SEGMENTS | greeting 뒤에 prep(DB 열거와 같은 값 · 같은 차례). TALK_LEVEL_SEGMENTS(230)는 이제 TALK_SEGMENTS 그대로다(묶음 3 이 미룬 몫) |
| `src/core/conversation/attempt.ts` talk-start(79~84) | prepWords(세션 시작 때 정한 짧은 준비 계획) · carry `{ goals, words }`, 둘 다 선택 |
| attempt.ts talk-prep(95~101, 새) | 따라 말하기 칸(target · heard · failures · skipped · clientListen) + index · word · place(TALK_PREP_PLACES: greeting 인사 뒤 · talk 대화 중) |
| attempt.ts talk-floor(103~109, 새, 꼴만) | 따라 말하기 칸 + index · word, skipped 에 next(작은 '다음') |
| attempt.ts TALK_CLOSING_REASONS(51~) | closing_question · suggestion · floor · stop_confirmed 를 앞에 더함(옛 여섯 그대로) |
| attempt.ts lessonFollowAlongNo(189) | 활동 번호: 처음 스냅숏(1) 뒤 짧은 준비 → 바닥선 → 정리 → 한 번 더. 짧은 준비 · 바닥선 범위는 카드 오늘 쓸 말 수 |
| attempt.ts lessonFollowDoneOf(225) · prepWordsShownOf(266) | 새 흐름 끝낸 차례, 흐름 입력 prepWords(인사 뒤 자리의 보인 낱말 전부 · 건너뛴 낱말 포함 · 쪽지 차례 · 같은 낱말 한 번) |
| `src/core/conversation/client-listen.ts:45~72` | ClientListenSchema 에 선택 칸 sp: `{ w: tori · card · sound · wait · prep · floor · wrap, h: no_end · not_played }[]`(최대 CLIENT_LISTENS_MAX). 아이 행과 따라 말하기 시도가 같은 꼴을 쓴다 |
| `src/server/conversation/state.ts:343~350` | 옛 흐름 TurnNext.segment 를 TalkSegmentV1(prep 뺌)로 좁히고 talkSegmentV1Of 가 prep 이면 던진다(옛 화면 토막 이름 표가 그대로 맞음) |
| `src/server/conversation/closing.ts:206 · 224` | lessonClosingOf(끝난 길 → 끝맺음 기록 까닭 · 건너뜀 · 응답 뒤 부름) · insertLessonClosing |

## 상태 읽기 갈래(`src/server/conversation/state.ts`)

- **readTalkBase(658).** 세션 행(lock 이면 FOR UPDATE) · 수업 행 · 카드 꼴(talkCardKindOf)을 한 번 읽는다.
- **readTalkAnyState(697), 새 진입점.** `{ kind: "v1", state: TalkState } | { kind: "new", state: TalkLessonState }` 로 가른다. 묶음 8 · 9 의 새 갈래가 이것으로 고른다.
- **readTalkState(713), 옛 갈래.** 지금 서버 길이 모두 이것을 쓴다. 본문은 v1StateOf(739)로 옮겼고 동작은 그대로다. 새 꼴 카드 세션이면 '새 갈래 readTalkLessonState' 를 가리키는 오류를 던진다(묶음 3 의 오류 자리).
- **readTalkLessonState(727) · lessonStateOf(1464), 새 갈래.** 새 꼴 카드(TalkLessonSchema) · 단계 규격 행 그대로 · 설정(talkLessonSettingsFrom + talk.nospeech_dontknow_count · 구간 키는 spec.band) · talk_turns → lessonTurnOf(1413, move 는 readTalkMove) · 처음 스냅숏(metBefore · prepPlan · carry · 선생님 키) · prepWords(talk-prep 시도에서 되짚음) · follows 를 읽는다. 그 값으로 talkLessonPositionOf 를 부른다.
- **lessonToriKoOf(1443), 정한 것 9.** koMeaning(1~4단계)이면 저장하고, 1~3단계는 toriKoShownOf(spoken.ts)를 그대로 따른다. 묶음 8 이 선생님 행을 쓸 때 부른다.

## 시험

| 파일 | 시험 | 몫 |
|---|---|---|
| `tests/unit/talk-lesson-attempt.test.ts`(새, 8) | 처음 스냅숏 prepWords · carry(옛 스냅숏 그대로 읽힘) · talk-prep 자리 · talk-floor 의 next · AC-16a 끝맺음 까닭 열(넷 더함) · 활동 번호 · 흐름 입력 prepWords(계획 · 대화 중 준비 제외, 건너뛴 낱말 포함) · 감시 칸 sp · AC-15v 마이그레이션 0006 문장 둘과 journal · DB 열거 = TALK_SEGMENTS | 단위 |
| `tests/unit/talk-lesson-state.test.ts`(새, 7) | 아이 행 옮김(들리지 않음 출처) · AC-15v 선생님 행 move 읽기 · tori_ko 저장(4단계 저장 · 5단계 없음 · 1~3단계 겹침 규칙) · AC-16a 끝맺음 기록(참여 완료 넷 · 확인 뒤 그만두기 · 'AI 쉬는 중') · 끝나지 않은 길 | 단위 |
| `tests/integration/talk-lesson-state.test.ts`(새, 3) | 새 꼴 카드 세션은 새 갈래 · 옛 갈래는 던짐 · prep 토막이 DB 열거에 듦 · prepWords 는 talk-prep 시도에서(계획 아님) · AC-15v move 되짚기 · 들리지 않음 → lastCause nospeech | 통합(정적, 11-01 뒤 CI) |
| `tests/unit/conversation-server.test.ts:138` | 행 견본에 move: null 한 줄(새 칸 때문에 형이 깨짐) | 옛 흐름 시험 |

## 관문(10:2x, Node 24)

```
pnpm lint          0
tsc --noEmit       0
pnpm test          Test Files 138 passed (138) · Tests 1706 passed | 6 todo
check:deps         0
check:ids          CI 목록 위반 0 · design-number 47 / 상한 49
spec:trace         0(--plan 회화 plan)
seed:validate      칸 795 · 실패 0 · 규격 파일 오류 0 · 경고 16
```

## 설계와 다르게 한 것

1. **talk-prep 에 낱말(word)과 열린 자리(place)를 두었다.** plan 107줄은 '따라 말하기 시도'까지만 적는다. 보정 문단의 'prepWords 를 talk-prep 시도에서 되짚는다'를 지키려면 무엇을 보였는지와 인사 뒤 준비인지 대화 중 준비인지를 시도가 알아야 한다. 대화 중 준비 낱말은 move.prep 에도 남는다.
2. **새 흐름 처음 스냅숏도 옛 필수 칸 shownWords · practiceOrder 를 둔다.** 판 1 더하기만이라 옛 칸을 선택으로 바꾸지 않았다. 새 흐름은 빈 목록을 쓴다(묶음 9 의 ensureStarted 몫).
3. **readTalkState 는 옛 갈래 이름 그대로 두고, 새 진입점 readTalkAnyState · readTalkLessonState 를 더했다.** 묶음 3 의 '새 꼴 카드면 오류' 자리를 바로 새 갈래로 돌리면, 옛 길(index · turn · closing — 묶음 8 · 9 몫 파일)이 받는 형이 바뀌기 때문이다. 오류 글이 새 갈래를 가리킨다.
4. **옛 흐름 TurnNext.segment 를 좁혔다(prep 뺌).** TALK_SEGMENTS 에 prep 을 넣으면 옛 화면의 토막 이름 표(talk-frame.tsx, 화면 묶음 몫)가 형에서 깨지므로, 그 파일을 고치지 않고 옛 길 형을 좁혔다(브리프 '갈래를 좁혀 동작을 그대로').
5. **미션 수(missionsDone)는 새 갈래 위치에 넘기지 않았다.** 5~7단계 미션은 둘째 묶음 17 이라 talk_turns.mission_checks 셈을 그때 더한다.
6. **lessonClosingOf 의 'AI 쉬는 중'은 옛 closeTalk 과 같은 결로 두었다.** 참여 완료 끝이면 대기 기록만 두고, 중단(확인 뒤 그만두기)이면 끝맺음 없이 닫는다.

## 묶음 8 · 9 에 넘길 것

- 상태는 readTalkAnyState(kind 로 갈래)나 readTalkLessonState 로 읽는다. 새 갈래의 runTalkClosing · talkClosingStatus(closing.ts)는 아직 readTalkState(옛 갈래)를 부르므로, 새 꼴 세션의 끝맺음 턴은 묶음 8 이 새 입력(talk-lesson.ts)으로 잇는다.
- 흐름 입력 prepWords 는 `state.prepWords`(talk-prep 자리 greeting 에서 되짚음)를 그대로 넘긴다. `state.start.prepPlan` 을 넘기지 않는다.
- 짧은 준비 따라 말하기 저장(묶음 9 saveFollowAlong)은 talk-prep `{ index, word, place, target, heard, failures, skipped?, clientListen? }` 을 lessonFollowAlongNo({ segment: "prep", index }, { todayWords: card.todayWords.length, prepWords: settings[`talk.prep_words.${band}`], wrapUp }) 번호로 넣는다(prepWords 는 설정값 talk.prep_words.<구간>, 짧은 준비 범위는 max(오늘 쓸 말 수, prepWords), fix 1 I-1). 대화 중 연 준비는 place talk 이고 선생님 행 move.prep 에도 낱말을 둔다.
- 끝난 길은 core/conversation/ending(talkStopOf · talkEndOf) → insertLessonClosing(tx, { sessionId, at, end, resting }) 이다. 세션 상태(완료 · 중단 · 정리 토막 · 학습일)는 부르는 쪽이 바꾸고, 돌려받은 schedule 이 참이면 scheduleTalkClosing 을 부른다.
- 선생님 행을 쓸 때 move 칸(talkMoveOf / teacherMoveOf), tori_ko 는 lessonToriKoOf 로 정한다. 아이 행 client_listen 의 sp 는 화면이 보낸 그대로 받는다(ClientListenSchema).
- 새 갈래 상태의 talk.nospeech_dontknow_count 는 `state.nospeechDontknowCount` 다(흐름 설정 밖의 서버 턴 길 값).

## 우려

- 통합 시험(새 파일 하나와 talk_turns.move · prep 값을 쓰는 길)은 이 Mac 에서 돌지 않아 실행하지 못했다. 시험 본 DB 가 0006 까지 마이그레이션하는지는 11-01 뒤 CI 에서 처음 확인된다.
- 개발 DB 는 0006 전이라, 적용(첫 프리뷰 때 컨트롤러) 전에 talk_turns 를 읽거나 쓰는 서버 길은 옛 흐름이든 새 흐름이든 첫 요청에서 `column "move" does not exist` 로 깨진다. Drizzle 은 select · insert · returning 에 스키마의 모든 열을 적기 때문이다(fix 1 M-1 에서 바로잡음, 검토 보고 M-1 · 4절 물음 2). 그래서 Approved 뒤 0006 을 개발 DB 에 먼저 적용하고 이 작업 트리 코드를 돌린다.
- 옛 흐름 형 TalkSegment 에 prep 이 들어가서, prep 토막에 든 옛 꼴 카드 세션이 생기면 talkSegmentV1Of 가 던진다(옛 꼴 카드는 prep 에 들지 않으므로 생기지 않는 길이다).
