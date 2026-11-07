# 브리프: 회화 plan 묶음 '5-나' — 묶음 5 · 6 이 남긴 기존 파일 몫(구현자 · Opus · high, 2026-10-30 09:4x, 묶음 5 · 6 Approved 뒤 · 묶음 7 과 나란히)

plan `intent/2026-10-29-회화-수업을-대화로/plan.md`(approved C192, 보정 C194) 파일 표 162줄(묶음 5 의 spoken.ts · hints.ts · wrap-up.ts · said.ts 행)과 163줄(묶음 6 의 talk.ts 수정 몫 '함께 쓰는 형은 새 파일에서 내보냄')을 마친다. 묶음 5 · 6 은 묶음 3 과 나란히 '새 파일만' 만들어 이 몫을 남겼다(장부 T-27, 보고 `task-talk-5-report.md` · `task-talk-6-report.md` 의 '묶음 3 뒤 할 것').

## 할 것
1. **flow.ts → spoken.ts(동작 그대로).** `src/core/conversation/flow.ts` 의 normalizeSpoken · sayingAnswer · createAnswerHold · shownTurnOf · toriKoShownOf 와 MORE_PROMPT 를 새 파일 `src/core/conversation/spoken.ts` 로 옮긴다. flow.ts 는 그 이름들을 spoken.ts 에서 다시 내보내 옛 가져오기가 그대로 돌게 한다(flow.ts 는 묶음 12 가 지운다). 새 모듈(question-check.ts · lesson-flow.ts)과 시험(talk-lesson-flow.test.ts 의 MORE_PROMPT)의 가져오기는 spoken.ts 로 바꾼다.
2. **hints.ts · wrap-up.ts · said.ts 의 새 꼴 갈래.** 묶음 5 보고 '묶음 3 뒤 할 것' 셋째 줄 그대로다. 카드 항목 힌트(새 꼴 카드 항목의 hintKo · hints, 걸리면 '힌트' 단추 없음)와 1~4단계 첫 막힘 · 5단계 둘째 막힘의 한국어 설명, 둘째 막힘부터 마지막 단 열기. 1~3단계 정리 한 번. 서버가 붙인 소리 줄(move.app 의 answer_example · together · choices · model_line)을 들은 턴의 힌트 종류 '영어'. 근거는 정본 02-2 3.3 회화 블록(C189)과 spec 4판 설계 1~4, 묶음 5 검토 보고(`task-talk-5-review-report.md`)의 판정이다. 옛 꼴 카드 갈래는 동작 그대로 둔다.
3. **calls/talk.ts 와 talk-lesson.ts 잇기.** 묶음 6 보고 '묶음 3 뒤 할 것' 1 · 2 그대로다. talk.ts 의 함께 쓰는 형 · 함수(TalkTurnSegment · TalkInputMode · TalkHintKind · TalkHeardHelp 와 그 목록, TalkTeacher · TalkHistoryEntry, teacherBlockOf · englishHintTiersOf)를 talk-lesson.ts 에서 가져와 다시 내보내고, 같은 정의 둘을 하나로 한다. lesson-turns.ts 가 옛 talk.ts 에서 가져오던 TalkInputMode · TalkTurnSegment 도 talk-lesson.ts 로 바꾼다. TalkLessonCardView · TalkLessonSpecView 의 Pick 칸 이름과 structure.ts 상수(TALK_NEXT_MOVES · TALK_SUPPORTS · TALK_CARD_ITEM_KINDS · TALK_LOW_BAND)가 Approved 된 묶음 3 의 형과 맞는지 tsc 로 확인한다.
4. (선택) lesson-turns.ts 의 TalkLessonItem · TalkLessonCard 를 TalkCard 형 그대로 쓰게 한 줄씩 바꾼다. 바꾸면 expectTypeOf 시험이 그대로 지키는지 본다.

## 하지 않을 것
- 묶음 6 견본의 손 카드를 builders 로 바꾸기, 옛 talk.ts · 옛 표본 지우기(묶음 12).
- 묶음 7 의 파일: `drizzle/*` · `src/db/schema/*` · `src/core/conversation/attempt.ts` · `client-listen.ts` · `src/server/conversation/state.ts` · `closing.ts`. 묶음 7 이 나란히 돈다. flow.ts 다시 내보내기를 지키면 묶음 7 의 가져오기는 깨지지 않는다.

## 지키는 것
- 시험을 먼저 써서 실패를 본 뒤 통과시킨다. 옮김은 '동작 그대로' 시험이 기대값을 바꾸지 않고 통과하는 것으로 증명한다. 순수 함수, 숫자는 설정값, T2 · R2 · 녹음 없음 · AI 는 서버만 · Zod.
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`, `( cd 워크트리 && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸(세션 cd 금지), 커밋 · push 금지. 관문 lint · tsc · 단위 · check:deps · check:ids · spec:trace 0(다른 손의 변경으로 깨지면 그 파일은 두고 보고에 적는다).

## 보고
`task-talk-5b-report.md`(같은 폴더): 옮긴 이름 · 다시 내보낸 이름 · 바뀐 가져오기 줄, 새 갈래별 동작과 시험(AC 번호), 관문, 설계와 다르게 한 것, 우려. 답은 요지 열 줄 안.

## 보정(컨트롤러 09:4x — 묶음 5 Approved · 묶음 6 fix 1 중)
- **차례를 둘로 나눈다.** 이번에는 할 것 1 · 2 · 4 와 아래 N-1 · N-2 만 한다. 할 것 3(calls/talk.ts 와 talk-lesson.ts 잇기)은 묶음 6 fix 1 이 Approved 된 뒤 컨트롤러가 이어서 맡긴다. 묶음 6 고침(impl-talk-6)이 `src/core/ai/calls/talk-lesson.ts` · 그 시험 · 견본 · 표본을 고치는 중이니 그 파일들은 건드리지 않는다.
- **N-1(묶음 5 재검토 새 Minor).** 마지막 인사 질문에 막힘 말로 답하면 첫 막힘이어도 stage 3 닫기로 기록된다. 동작은 그대로 두고, 주석과 그 경우의 시험을 더한다(`task-talk-5-fix1-review.md`).
- **N-2(묶음 5 재검토 새 Minor).** 흐름 입력 `prepWords` 를 필수 칸으로 바꾸고, 기회 쪽의 같은 사실 `prepShown` 도 `prepWords` 로 이름을 맞춘다. 뜻은 '인사 뒤 준비 토막을 실제로 지났을 때 쪽지로 보인 낱말 전부(건너뛴 낱말 포함)'이고 주석에 그대로 적는다. 낱말 수 설정 `settings.prepWords` 는 이름을 바꾸지 않고 주석으로 가른다(묶음 7 이 같은 설정을 읽는다). TeacherTurnPlan 등 출력 형의 칸 이름은 바꾸지 않는다(묶음 6 fix 1 이 그 이름에 맞춘다).
