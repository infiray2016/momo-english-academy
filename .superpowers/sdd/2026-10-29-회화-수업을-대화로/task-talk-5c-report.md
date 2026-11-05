# 구현 보고: 회화 plan 묶음 '5-다'('5-나' 뒤 차례)

구현자 impl-talk-5c(Opus · high) · 2026-11-05 · 워크트리 `.claude/worktrees/p13d`(줄 번호는 이 워크트리 기준).

상태: DONE_WITH_CONCERNS. (가)~(마)와 선택 6 을 모두 했다. (가)는 순환 가져오기를 피하려고 정의 자리 하나를 브리프와 다르게 두었다(아래 '설계와 다르게 한 것' 1).

## 할 것마다 고친 곳

### (가) calls/talk.ts 와 talk-lesson.ts 잇기
- `src/core/conversation/lesson-turns.ts:14-36` — 열거 넷(TALK_TURN_SEGMENTS · TALK_INPUT_MODES · TALK_HINT_KINDS · TALK_HEARD_HELPS)과 그 형의 정의를 여기로 옮겼다(talk_turns 기록 칸). 옛 talk.ts 가져오기 줄을 지웠다.
- `src/core/ai/calls/talk-lesson.ts:22-27` 형 가져오기, `:54-63` 열거 넷과 형을 다시 내보냄. TalkTeacher · TalkHistoryEntry · teacherBlockOf · englishHintTiersOf 의 정의는 이 파일에 둔다.
- `src/core/ai/calls/talk.ts:21-30` 가져오기, `:50-66` 다시 내보냄(열 이름: englishHintTiersOf · TALK_HEARD_HELPS · TALK_HINT_KINDS · TALK_INPUT_MODES · TALK_TURN_SEGMENTS · TalkHeardHelp · TalkHintKind · TalkHistoryEntry · TalkInputMode · TalkTeacher · TalkTurnSegment · teacherBlockOf). 같은 정의 여섯 덩이(열거 넷 · TalkHistoryEntry · TalkTeacher · englishHintTiersOf · teacherBlockOf)를 지웠다. 서버 · 옛 시험의 가져오기는 그대로 돈다.
- `src/core/conversation/lesson-flow.ts:17-28` — TalkTurnSegment 를 talk.ts 대신 lesson-turns.ts 에서 가져온다(한 줄 옮김, 허용 목록 밖, 아래 1).
- `src/core/conversation/hints.ts:3` — TalkHeardHelp · TalkHintKind 를 talk-lesson.ts 에서 가져온다((마)로 여는 파일이라 함께).
- TalkLessonCardView · TalkLessonSpecView 의 Pick 칸과 structure.ts 상수(TALK_NEXT_MOVES · TALK_SUPPORTS · TALK_CARD_ITEM_KINDS · TALK_LOW_BAND)는 tsc 0 으로 묶음 3 형과 맞음을 보았다.
- 옮김은 '동작 그대로' 시험(talk-lesson-call · conversation-call · talk-stream-call · contract 등)이 기대값을 바꾸지 않고 통과해 증명했다.

### (나) 고정부가 C195 칸을 읽음
- `talk-lesson.ts:93` TalkLessonSpecView Pick 에 koExplainFromStuck.
- `talk-lesson.ts:666-683` koExplainRule: 칸 값으로 'Write a Korean explanation in explanation from the {first|second|third} stuck on the same question.' 을 만든다. 칸이 없으면 hints.ts 와 같은 꼴로 던진다(조용한 기본값 없음). 서수 낱말 표 밖이면 '{n}th'.
- `talk-lesson.ts:685-708` commonRules 가 spec · level 을 받아 위 문장을 쓴다(옛 'at levels 1-4 … from level 5' 문장 없음). 부르는 곳은 talkLessonSystem 하나.
- 견본 입력 `tests/fixtures/ai/talk-lesson-inputs.ts:39 · 49 · 59 · 69` 에 칸 값(3 · 4단계 1, 5 · 10단계 2, 실시드와 같음)을 더했다.

### (다) 묶음 6 Minor N-3 · N-4
- N-3: `talk-lesson.ts:742`(1~3단계 셋째 · 들리지 않음)와 `:752`(4단계부터) 문장 끝을 '…, then (when Question: yes) ask about the next topic.' 으로.
- N-4: `talk-lesson.ts:601-602` SUPPORT_STAGE_EASY, `:1214-1222` 1~3단계 AI 차례 · 받침 둘째이면 model_line 을 비운다(choices 는 남김, 02-2 260줄). 시험 입력 model_line 을 'I play with my friend.' 로 바꿔 비는 것을 본다.

### (라) chances.ts 다음 항목 고르기를 실행 열쇠로
- `src/core/conversation/question-check.ts:59-66` cardQuestionKeyOf(마지막 물음표 문장을 questionKeyOf 로, 없으면 글 전체), `:86-111` sameQuestionHit 를 열쇠 꼴 sameQuestionKeyHit 로 나눴다(sameQuestionHit 동작 그대로).
- `src/core/conversation/chances.ts:18-21 · 195-205` usable 이 cardQuestionKeyOf 열쇠로 견준다. usable 을 쓰는 slotChanceOf · oldestMoreOf 둘 다 바뀐다.
- `src/core/seed/check-talk.ts:7 · 619-640` sameQuestionKeyOf 를 지우고 cardQuestionKeyOf 를 가져다 쓴다(이름 하나). `tests/unit/seed-validator-talk.test.ts` 는 고치지 않고 통과.

### (마) '5-나' 재검토 N-1
- `hints.ts:271-287` 계획 사실(stage 1 · stage 3 · 들리지 않음)은 move.kind 가 ai 일 때만(aiGaveAnswer). 1~3단계 카드 자리는 app · sound 만 본다. 주석 `:255-259`.

### 선택 6
- `tests/unit/talk-lesson-hints.test.ts:202-204` REAL 의 단계가 1~12 인지 한 줄.

## 시험(먼저 실패를 본 것 ✗ 표시)
- `tests/unit/talk-lesson-hints.test.ts:310` 'AC-15h 1~3단계 카드 자리 차례는 서버가 붙인 소리 줄만 사실 기록이다…(N-1)' ✗→✓
- `tests/unit/talk-chances.test.ts:279-326` describe '카드 항목 글을 실행 열쇠(마지막 물음표 문장)로 견줌': 'AC-15m cardQuestionKeyOf 는 …' ✗→✓, 'AC-15i 막힌 질문과 꼬리가 같은 항목은 붙이지 않고, 꼬리가 다른 항목을 고른다' ✗→✓, 'AC-15i 같은 질문 상한도 꼬리 열쇠로 센다' ✗→✓
- `tests/unit/talk-lesson-call.test.ts:1031-1066` fix 2 고정부 문장 시험(N-3 기대 문장 · 4단계 문장 · 옛 꼬리 없음) ✗→✓, `:1068-1121` 받침 둘째 정규화(N-4, 입력에 답) ✗→✓
- `tests/unit/talk-lesson-call.test.ts:1131-1169` describe '한국어 설명 막힘 차례는 회화 단계 규격 칸에서 읽는다': 실시드 3 · 4 · 5단계 문장 ✗→✓, 칸 값을 바꾸면 문장이 바뀜 ✗→✓, 칸 없는 행은 던짐 ✗→✓
- 실패 출력은 스크래치패드 `hints-red.txt` · `chances-red.txt` · `call-red.txt`(1 · 3 · 5건 실패).

## 관문(모두 서브셸, 출력은 스크래치패드)
- `pnpm biome ci` 0(574 파일) · `pnpm test` 0(138 파일 · 1720 통과 · 6 todo) · `pnpm exec tsc --noEmit` 0 · `pnpm check:deps` 0(281 모듈) · `pnpm spec:trace` 0 · `pnpm check:ids` 0(경고에 이번 파일 없음).
- `pnpm biome check --write src tests` 가 고친 넷은 모두 이번에 고친 파일이다.

## 설계와 다르게 한 것
1. **열거 넷(토막 · 입력 방식 · 힌트 종류 · 들은 도움)의 정의를 lesson-turns.ts 에 두었다(컨트롤러 승인 14:3x).** 브리프는 lesson-turns.ts 가 talk-lesson.ts 에서 가져오라 했다. 그러나 talk-lesson.ts 가 lesson-flow.ts 의 TeacherTurnPlan 을 가져오고 lesson-flow → lesson-turns 이므로 talk-lesson → lesson-flow → lesson-turns → talk-lesson 순환이 생긴다. check:deps 는 형 가져오기도 센다(tsPreCompilationDeps). 같은 까닭으로 lesson-flow.ts 의 talk.ts 가져오기 한 줄도 lesson-turns 로 옮겼다. 나머지 공용 형 · 함수의 정의는 브리프대로 talk-lesson.ts 에 있고, 바깥에서는 talk-lesson.ts · talk.ts 어느 쪽으로 가져와도 같은 정의다. 컨트롤러에게 14:2x 에 이 가정을 알렸고, 컨트롤러가 열거 넷을 모두 lesson-turns.ts 에 두는 꼴로 승인했다(lesson-flow.ts 한 줄 옮김 포함). plan 163줄 '다른 모듈은 talk-lesson.ts 에서 가져온다'는 다시 내보냄으로 지켜진다. 승인 뒤 관문을 다시 돌렸다(biome ci · tsc · check:deps 0, 단위 1720 통과).
2. **sameQuestionKeyHit 을 새로 내보냈다.** usable 이 열쇠로 견주려면 열쇠를 받는 꼴이 있어야 해서 sameQuestionHit 의 몸을 옮겼다. sameQuestionHit 의 동작은 같다.
3. **SUPPORT_STAGE_EASY = 2 를 talk-lesson.ts 에 따로 두었다.** lesson-flow.ts 의 STAGE_EASY 와 같은 구조 번호(3.3 막힘 표의 줄)이고 설계 숫자가 아니다. move.ts 에 공용 상수로 두는 것이 낫지만 허용 목록 밖이라 두지 않았다.

## 묶음 8 · 12 에 넘길 것
- 묶음 8: talkLessonSystem 은 이제 단계 규격 행에 koExplainFromStuck 이 없으면 던진다(hints.ts 와 같음). 서버 턴 길이 새 흐름 행을 좁힌 스키마로 읽어 막는 일(재검토 N-2)이 그만큼 더 중요하다.
- 묶음 12: 옛 talk.ts 를 지울 때 다시 내보낸 열두 이름의 가져오기를 talk-lesson.ts 로 바꾼다(서버 `src/server/ai/index.ts` · `src/server/ai/talk.ts` · `src/server/conversation/turn.ts` · `state.ts` · `index.ts`, `said.ts` · `flow.ts`, 시험 · 견본). STAGE_EASY 와 SUPPORT_STAGE_EASY 를 move.ts 의 공용 상수 하나로 모으길 권한다.

## 남은 우려
- (라)로 oldestMoreOf(대신 질문, C194 (1))도 꼬리 열쇠로 거른다. 그래서 꼬리가 같은 더 이야기할 거리만 남은 카드에서는 붙일 것이 없어 AI 차례로 가는 드문 길(장부 T-46)이 조금 늘 수 있다. C172 의 뜻대로이고 동작 시험은 그대로 통과한다.
- 고정부 문장의 'stuck on the same question' 은 AI 가 같은 자리 막힘 수를 사용자 메시지의 Support stage 로 어림하는 문장이다. 옛 문장도 같은 한계였다.
