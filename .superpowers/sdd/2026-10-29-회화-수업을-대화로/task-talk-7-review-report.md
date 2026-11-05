# 코드 검토 보고: 회화 plan 묶음 7(서버 상태 · 기록)

검토자 rev-talk-3(Opus · xhigh), 2026-10-30 09:5x~10:1x, 읽기 전용. 이 묶음의 고치기 전 파일은 따로 남아 있지 않아, 묶음 3 의 before.tar 에 묶음 3 fix 1 차이를 입혀 '묶음 3 뒤' 상태를 다시 만들고(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/rev-talk7/base`) 지금 작업 트리와 견주었다. 묶음 7 이 바꾼 것은 state.ts(390줄) · closing.ts(67) · attempt.ts(147) · client-listen.ts(22) · structure.ts(9) · conversation-server.test.ts(1), 그리고 git HEAD 대비 content.ts · learning.ts · drizzle/meta/_journal.json 과 새 파일이다. index.ts · turn.ts · talk-frame.tsx 는 묶음 3 뒤 그대로다. 새 단위 시험 두 파일만 돌렸고(10:03, 15건 통과), 개발 DB 에는 닿지 않았다.

기준은 plan 묶음 표 7 행(24줄) · 파일 표 165~167줄 · '이름' 절 move 표와 107줄 · 정한 것 6 · 8 · 9 · 10 · 17 · 22, 정본 02-2 3.3 회화 블록(160~315줄), 04 5절 attempts(34줄) · talk_turns(35줄), 07 7절, spec 4판 설계 1~5 다.

## 판정: Changes requested (Critical 0 · Important 1 · Minor 4)

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| 마이그레이션 0006 · 스키마(정한 것 8 · 22) | ✅ | 두 문장 모두 더하기만이다(`drizzle/0006_talk_turns_move_prep.sql`). 더한 값 prep 을 같은 파일에서 쓰지 않는다. Drizzle 스키마의 열거 차례(content.ts:52~62)와 move jsonb 비울 수 있음(learning.ts:225)이 0006 snapshot 과 같고, snapshot 의 prevId 가 0005 와 이어진다. P12 의 열 넷과 다른 파일이다 |
| 시도 꼴(plan 107줄 · 정한 것 6) | ✅ · ❌ | talk-start 의 prepWords · carry(선택), talk-prep, talk-floor(꼴만), talk-closing 까닭 넷은 맞다. 활동 번호의 짧은 준비 범위는 I-1 |
| 감시 칸 sp(정한 것 10) | ✅ | `{ w: tori · card · sound · wait · prep · floor · wrap, h: no_end · not_played }`, 최대 CLIENT_LISTENS_MAX, strictObject 라 글 · 들려줌 칸을 받지 않는다(client-listen.ts:45~72). 아이 행과 따라 말하기 시도가 같은 ClientListenSchema 를 쓴다 |
| 상태 읽기 갈래 | ✅ | readTalkBase 한 번 → readTalkAnyState(kind 로 가름) · readTalkState(옛, 새 꼴이면 던짐) · readTalkLessonState(새, 옛 꼴이면 던짐). 새 갈래는 talk_turns → lessonTurnOf(move 는 readTalkMove) → talkLessonPositionOf 이다 |
| prepWords(보정 문단 · 묶음 5 검토 I-2) | ✅ | 흐름 입력은 prepWordsShownOf(talk-prep 의 place greeting, 건너뛴 낱말 포함, 쪽지 차례, 같은 낱말 한 번)이고 start.prepPlan 을 넘기지 않는다(state.ts 의 lessonStateOf, `talkLessonPositionOf({ …, prepWords })`) |
| 옛 갈래 그대로(위험 2) | ✅ | v1StateOf 의 본문은 묶음 3 뒤와 같다(차이는 함수 머리뿐). 'invalid' 카드는 예전처럼 TalkLessonV1Schema.parse 에서 던진다 |
| TALK_SEGMENTS 에 prep | ✅ | 옛 값의 서로 차례가 그대로라 index.ts:740 의 `order.indexOf` 비교가 바뀌지 않는다. talkFlowOf 는 talkSpecV1Of 가 prep 을 거른 segments 를 받는다. TurnNext.segment 를 TalkSegmentV1 로 좁힌 자리(state.ts:574)는 옛 세션이 prep 에 들지 않으므로 던지지 않는다 |
| tori_ko(정한 것 9) | ✅ | lessonToriKoOf: koMeaning(1~4단계)이면 저장하고, 1~3단계만 toriKoShownOf 겹침 규칙을 따른다 |
| 끝맺음 기록(정한 것 6 · 02-2:249 · 286~293) | ✅ | lessonClosingOf 는 참여 완료 넷(closing_question · suggestion · floor · stop)을 대기 기록 · 응답 뒤 부름으로, stop_confirmed 는 중단으로 다룬다. 'AI 쉬는 중'이면 완료는 대기 기록만, 중단은 끝맺음 없이 닫는다. 옛 closeTalk(index.ts:1228~1254)과 같은 결이다 |
| runTalkClosing 을 묶음 8 로 넘김 | ✅(M-4) | 새 끝맺음 입력은 묶음 6 의 talk-lesson.ts 와 묶음 8 파일인 server/ai/talk.ts 를 거친다. 다만 closing.ts 잠금표와 묶음 8 파일 표를 고쳐야 한다 |
| 숫자 · R2 · T2 · 녹음 없음 | ✅ | 새 설정은 모두 getSettings 로 읽고, 시도 꼴에 점수 칸이 없으며, 감시 칸에 글 · 소리가 없다 |

## 2. 잘한 점

- 세션 · 수업 행 읽기를 readTalkBase 하나로 모으고 갈래만 셋으로 나눠, 옛 갈래 본문을 한 줄도 바꾸지 않았다. 새 갈래 진입점을 따로 둔 덕에 묶음 8 · 9 가 받는 형이 지금 바뀌지 않는다.
- prepWords 를 계획이 아닌 talk-prep 시도에서 되짚어 묶음 5 검토 I-2 가 다시 생기지 않게 했고, when_needed(계획만 있고 준비 없음) · 건너뛴 낱말 · 대화 중 준비 · 같은 시도 두 번을 단위 시험 한 건이 모두 본다.
- talkSegmentV1Of 가 prep 을 조용히 다른 토막으로 바꾸지 않고 던져, 옛 화면 파일을 건드리지 않고도 형으로 경계를 지켰다.
- 마이그레이션 시험이 문장 둘을 글자까지 고정하고, DB 열거와 TALK_SEGMENTS 의 값 · 차례가 같은지 본다.

## 3. 지적

### Important

**I-1. 다지기 · 보강 수업의 짧은 준비 시도는 활동 번호를 받지 못한다**
- 어디: `src/core/conversation/attempt.ts:189~212` 의 lessonFollowAlongNo 가 짧은 준비 범위를 `counts.todayWords`(카드 오늘 쓸 말 수)로 잡는다. 구현 보고 '묶음 8 · 9 에 넘길 것' 3 도 `{ todayWords: card.todayWords.length }` 로 부르라고 적었다.
- 왜: 다지기 · 보강 카드의 오늘 쓸 말은 늘 빈 목록이다(06:30 '오늘 쓸 말: 새 단어마다', 검증기 talk-today 가 todayWords = newWords 를 요구). 그런데 정본 02-2:173 은 '다지기 · 보강 수업은 이월 단어를 앞세워 … 아직 안다가 아닌 것을 talk.prep_words.<구간> 개까지 고르고' 짧은 준비를 한다. 그러면 범위가 0 이라 첫 낱말부터 RangeError 가 나고, 묶음 9 의 saveFollowAlong 이 짧은 준비 시도를 저장하지 못한다. 첫 프리뷰 카드 두 장 가운데 하나가 다지기 6(장부 T-14)이고 3단계는 talk.prep_mode.1-3 이 always 라 프리뷰에서 바로 걸리는 길이다. plan 107줄 '범위는 카드 오늘 쓸 말 수'를 글자대로 따른 결과이고, 정본과 plan 이 다르면 정본이 우선한다. 지금 시험(talk-lesson-attempt.test.ts 의 활동 번호 시험)은 todayWords 3 만 보아 이 길을 덮지 않는다.
- 어떻게: 짧은 준비 범위를 한 수업에 보일 수 있는 낱말 수로 잡는다. 짧은 준비는 한 수업에 한 번이고(02-2:176 '아직 준비를 하지 않았으면') 많아야 talk.prep_words.<구간> 개이므로 `max(todayWords, prepWords)` 나 prepWords(설정) 하나면 된다. LessonFollowCounts 에 그 칸을 더하고, 다지기 카드(todayWords 0)의 prep 0 번이 번호를 받는 시험을 더한다. plan 107줄 문장은 컨트롤러가 같이 고친다.

### Minor

**M-1. 구현 보고 '우려' 2 의 '옛 흐름은 move 를 쓰지 않으므로 그대로 돈다'는 틀리다** (보고 81줄). Drizzle 은 `select()` 에 스키마의 모든 열을 적고(state.ts:768 `db.select().from(talkTurns)`), insert 도 스키마의 모든 열을 적어 값이 없는 열에 `default` 를 넣으며(drizzle-orm pg-core/dialect.js:356~392, turn.ts:778 · index.ts:291), `.returning()` 도 모든 열이다(turn.ts:794). 그래서 0006 을 적용하지 않은 DB 에서는 옛 흐름의 상태 읽기 · 턴 저장도 `column "move" does not exist` 로 깨진다. 아래 4절 물음 2 의 답대로 운영하면 코드는 고칠 것이 없고, 보고 문장만 바로잡는다.

**M-2. 마이그레이션 시험이 '마지막 줄이 0006'을 단언한다** (tests/unit/talk-lesson-attempt.test.ts:265 `journal.entries.at(-1)`). P12 가 0007 을 더하는 순간 이 시험이 깨진다. tag 로 그 줄을 찾아 idx 6 을 본다.

**M-3. AC-16a 표지가 뜻을 증명하지 않는다** (talk-lesson-state.test.ts:167 · 181, talk-lesson-attempt.test.ts:133). 정본 AC-16a(11장 187줄)는 '참여 완료면 친한 정도 1칸, 확인해 중단한 대화는 오르지 않음 …'이다. 세 시험은 끝맺음 기록의 까닭과 부름만 보고 친한 정도를 보지 않는다. 표지를 정한 것 6 으로 바꾸거나, lessonClosingOf 시험에 talkEndOf 의 friendship(완료 넷 참 · stop_confirmed 거짓)을 함께 단언해 16a 의 묶음 7 몫(어느 끝이 참여 완료인가)을 드러낸다. AC-15v 표지(move 읽기 · 0006)는 plan 의 '15v(move)' 몫으로 받아들일 만하다.

**M-4. runTalkClosing · talkClosingStatus 를 묶음 8 로 넘기면 closing.ts 잠금이 바뀐다.** 두 함수는 아직 readTalkState(closing.ts:367 · 499)를 불러 새 꼴 세션에서 던진다. plan 파일 표의 묶음 8 행(168줄)에는 closing.ts 가 없고, 장부 T-19 의 잠금표도 closing.ts 를 '3 · 7 · 12 · 16'으로만 적는다. 묶음 8 브리프에 closing.ts(새 끝맺음 입력 · talkClosingStatus 의 새 갈래)를 넣고 잠금표를 고친다. talkClosingStatus 를 부르는 화면 쪽이 묶음 9 · 11 이면 그 차례도 같이 적는다.

## 4. 물어본 것

### 물음 1: 마이그레이션 · Postgres 규칙
- 0006 은 ADD VALUE 와 ADD COLUMN(비울 수 있음) 둘뿐이고 더한 값을 같은 파일에서 쓰지 않는다. 맞다.
- 구현자가 짚은 '같은 적용에 드는 다음 마이그레이션도 prep 을 쓰면 안 됨'도 맞고, 실제로는 그보다 넓다. drizzle 의 migrate 는 남은 마이그레이션 전부를 한 트랜잭션으로 돌린다(dialect.js:60~71). 새로 만드는 DB(통합 시험 바탕 tests/integration/global-setup.ts:165, 로컬 개발 DB scripts/dev-db.ts:475, CI)는 늘 0000 부터 끝까지 한 번에 돌리므로, 뒤에 오는 어떤 마이그레이션도 'prep' 값을 글자로 쓰면(DEFAULT 'prep' · UPDATE … SET segment = 'prep' · CHECK) 새 DB 에서 늘 실패한다. 개발 DB 에만 따로 적용해도 이 제약은 남는다. P12 의 0007 브리프와 plan 정한 것 8 에 '뒤 마이그레이션은 prep 값을 쓰지 않는다'를 적어 둔다.

### 물음 2: 0006 적용 전 개발 DB
- 깨진다(M-1). 이 작업 트리 코드로 개발 DB 의 회화를 열면, 옛 흐름이든 새 흐름이든 talk_turns 를 읽거나 쓰는 첫 요청에서 열 없음 오류가 난다. 읽기 · 쓰기 · 말하기는 talk_turns 를 쓰지 않아 영향이 없다.
- 묶음 7 Approved 직후 0006 을 개발 DB 에 먼저 적용해도 된다. 이미 배포된 옛 코드 프리뷰는 스키마에 move 가 없어 select · insert 에 그 열을 적지 않으므로 새 열은 NULL 로 남고, 'prep' 값은 옛 코드가 쓰지 않으니 뒤로 맞는다. RLS 는 표 단위라 그대로다.
- 먼저 적용할 때의 조건 둘: (가) 적용한 뒤에는 0006 파일 내용을 바꾸지 않는다. drizzle 은 적용 여부를 created_at(journal 의 when)으로만 가려, 내용을 바꿔도 다시 돌리지 않는다. (나) P12 의 다음 마이그레이션은 0007 이고 when 이 0006(1793321182004)보다 뒤여야 한다(generate 가 그렇게 만든다).

### 물음 3: 시도 꼴 · 활동 번호 · sp
- talk-start 의 prepWords(세션 시작 계획) · carry `{ goals, words }` 는 선택 칸이라 옛 스냅숏이 그대로 읽힌다(시험 있음). 정본 04:34 의 '보인 짧은 준비 낱말 차례'는 시작 때의 계획 차례로 읽을 수 있고, 실제로 보인 낱말은 talk-prep 이 맡는다.
- talk-prep 에 word · place 를 둔 것(보고 '다르게 한 것' 1)은 보정 문단의 '되짚기'에 꼭 필요하므로 받아들일 만하다. talk-floor 는 꼴만이고 skipped 에 next 를 받는다(바닥선 동작은 정한 것 17 대로 묶음 16).
- talk-closing 까닭 넷 · 옛 여섯 그대로. 활동 번호 차례(처음 스냅숏 1 → 짧은 준비 → 바닥선 → 정리 → 한 번 더)는 plan 107줄과 같고, 짧은 준비 범위만 I-1 이다. 인사 뒤 준비와 대화 중 준비가 같은 번호대를 쓰는 것은 한 수업에 한 번(02-2:176)이라 겹치지 않고, attempts 에 activity_no 유일 제약도 없다(learning.ts:178).
- sp 는 정한 것 10 과 같다. 화면이 최근 CLIENT_LISTENS_MAX 개로 잘라 보내야 하며(넘으면 요청 전체가 Zod 에서 거부됨), 이것은 묶음 10 · 11 에 넘길 것이다.

### 물음 4: 상태 읽기
- 갈림 · move 되짚기 · prepWordsShownOf · start.prepPlan 을 넘기지 않음 · 옛 갈래 그대로: 위 1절대로 맞다. 새 갈래 설정 키(LESSON_STATE_KEYS)가 lesson-turns 의 POSITIVE_KEYS · REASK_KEY · 구간 키 둘을 모두 덮는다.
- 새 갈래 spec 은 단계 규격 행 그대로이고 흐름은 band · targetTurns · koMeaning 만 읽어, 옛 판 행이 와도 깨지지 않는다.

### 물음 5: TALK_SEGMENTS
- 1절 표대로 옛 흐름 동작이 바뀌지 않는다. TALK_LEVEL_SEGMENTS 를 TALK_SEGMENTS 그대로로 바꾼 것도 값 집합이 묶음 3 때와 같아(prep 이 이제 TALK_SEGMENTS 에 듦) 단계 규격 검증이 바뀌지 않는다.

### 물음 6: tori_ko · 끝맺음 기록 · runTalkClosing
- 1절 표대로 맞다. runTalkClosing 을 묶음 8 로 넘긴 것은 새 끝맺음 호출이 묶음 8 파일(server/ai/talk.ts)을 거치므로 맞고, 잠금 · 파일 표 고침은 M-4 다.

### 물음 7: 시험의 질
- 단위 15건은 통과 쪽과 막는 쪽을 함께 본다. 옛 스냅숏 그대로 읽힘 · carry 칸 모자람 거부, place 없음 · 틀린 place · prep 의 next 거부, sp 의 넘침 · 글 칸 · 틀린 값 거부, move 꼴이 틀리면 null, tori_ko 저장 · 미저장, 끝나지 않은 길 null 이 들어 있다. 빠진 것은 I-1 의 다지기 범위다.
- 정적 통합 3건은 새 갈래 · 옛 갈래 던짐 · prep 토막(DB 열거) · prepWords 가 계획이 아님 · move 되짚기와 틀린 move · 들리지 않음 → lastCause 를 본다. 실행 전이라 판정은 11-01 뒤 CI 몫이다.
- 표지: AC-15v 는 받아들일 만하고 AC-16a 는 M-3 이다.
- conversation-server.test.ts 는 행 견본에 `move: null` 한 줄만 더했고 기대값은 그대로다.

## 5. 범위 밖 관찰

- 새 갈래 readTalkLessonState 는 'invalid' 카드에도 '옛 꼴 회화 카드는 새 갈래가 읽지 않는다'를 던진다(카드가 깨진 경우도 옛 꼴이라고 적음). 묶음 8 · 9 가 이 오류를 화면 갈래로 쓰지 않는다면 그대로 두어도 된다.
