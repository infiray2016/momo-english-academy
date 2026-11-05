# 브리프: 회화 plan 묶음 '5-다' — '5-나' 뒤 차례(구현자 · Opus · high, 2026-11-05 14:1x, '5-나' 앞 차례 Approved 뒤)

## 맥락
- 닿는 결정: 13절 C195(회화 단계 규격 칸 koExplainFromStuck — 힌트 고르기 hints.ts 와 회화 턴 고정부 talk-lesson.ts 가 같은 칸을 읽고 코드에 단계 경계 상수를 두지 않는다) · C194 (1)(받침 셋째 닫기 · 들리지 않음 닫기 뒤 가장 오래전 더 이야기할 거리를 카드 자리로 붙임, 잠정) · C172(같은 질문 세 번 되풀이 안 함) · C189 · C192.
- 앞 차례가 넘긴 것: '5-나' 앞 차례는 Approved(`task-talk-5b-fix1-review.md`, 14:0x). 그 보고가 이 차례에 넘긴 것은 I-1 의 고정부 몫(talk-lesson.ts 681줄 근처 · TalkLessonSpecView)과 새 Minor N-1 이다. 묶음 6 은 닫혔고 Minor N-3 · N-4 를 이 차례에 넘겼다(`task-talk-6-fix2-review.md` 17~30줄). '5-나' 브리프 `task-talk-5b.md` 할 것 3(calls/talk.ts 잇기)도 이 차례 몫이다. 컨트롤러는 13:58 에 검증기 `src/core/seed/check-talk.ts` 의 같은 질문 열쇠를 실행 열쇠(마지막 물음표 문장, `sameQuestionKeyOf`)로 맞췄다(장부 T-56). 같은 뜻을 chances.ts 에도 맞추는 것이 (라)다(장부 T-53).
- 요청자가 강조한 뜻: 설계 숫자를 코드에 박지 않는다. 1~3단계 회화에서 영어 문장을 보여 읽게 하지 않는다.
- 읽을 정본: `specs/02-2-세션과-단계표.md` 3.3 회화 블록(200 · 202줄 같은 질문, 257~263줄 받침 줄과 한국어 설명), `specs/05-AI-호출.md` 6.1.
- 세션이 초기화되어 지난 구현자(impl-talk-5)의 기억은 없다. 위 보고 파일들을 먼저 읽는다.

## 할 것
1. **(가) calls/talk.ts 와 talk-lesson.ts 잇기** — `task-talk-5b.md` 할 것 3 그대로. `src/core/ai/calls/talk.ts` 의 함께 쓰는 형 · 함수(TalkTurnSegment · TalkInputMode · TalkHintKind · TalkHeardHelp 와 그 목록, TalkTeacher · TalkHistoryEntry, teacherBlockOf · englishHintTiersOf)를 `talk-lesson.ts` 에서 가져와 다시 내보내고 같은 정의 둘을 하나로 한다. `src/core/conversation/lesson-turns.ts` 가 옛 talk.ts 에서 가져오던 TalkInputMode · TalkTurnSegment 를 talk-lesson.ts 로 바꾼다. TalkLessonCardView · TalkLessonSpecView 의 Pick 칸과 structure.ts 상수가 묶음 3 의 형과 맞는지 tsc 로 본다.
2. **(나) 고정부가 C195 칸을 읽음.** `talk-lesson.ts` 681줄 근처의 한국어 설명 경계(1~4단계 첫 막힘 · 5단계부터 둘째 막힘)를 상수가 아니라 단계 규격 칸 `koExplainFromStuck` 에서 읽는다. TalkLessonSpecView 의 Pick 에 그 칸을 넣는다. 시험은 실시드 행(3 · 4 · 5단계)으로 고정부 문장이 바뀌는 것을 본다.
3. **(다) 묶음 6 Minor N-3 · N-4.** N-3: 셋째 · 들리지 않음 문장 끝 'then ask about the next topic' 에 '(when Question: yes)' 를 붙인다(talk-lesson.ts 715 · 725줄 근처). N-4: 회귀 시험(`tests/unit/talk-lesson-call.test.ts` 1054줄 근처)이 빈 입력으로만 증명되어 늘 참이다 — 정규화에 1~3단계 받침 둘째 AI 차례의 model_line 비우기 한 줄을 두고 시험 입력에 답을 넣는다. 자세한 것은 `task-talk-6-fix2-review.md` 17~30줄.
4. **(라) chances.ts 의 다음 항목 고르기를 실행 열쇠로.** 앱은 막힌 질문을 마지막 물음표 문장 열쇠로 든다(`lesson-flow.ts` 897줄 근처 blocked). 그런데 카드 자리에 붙일 항목을 고르는 `chances.ts` 191~199줄 usable 은 항목 글 전체로 견주어, 'You are hungry. What do you do?' 에 세 번 막힌 아이에게 답 소리 뒤 'You are thirsty. What do you do?' 가 곧바로 읽힐 수 있다. `question-check.ts` 에 `cardQuestionKeyOf(text)`(마지막 물음표 문장을 questionKeyOf 로, 물음표 문장이 없으면 글 전체)를 두고 chances.ts usable 이 그것으로 견주게 한다. 컨트롤러가 check-talk.ts 에 둔 `sameQuestionKeyOf` 는 같은 식이니 그 함수를 가져다 쓰게 바꾸고 이름 하나로 통일한다(check-talk.ts 의 시험 `tests/unit/seed-validator-talk.test.ts` 는 그대로 통과해야 한다). 시험: 꼬리가 같은 항목은 막힌 뒤 고르지 않고, 꼬리가 다른 항목은 고른다.
5. **(마) '5-나' 재검토 N-1.** `hints.ts` 280~282줄의 계획 사실(stage 1 · stage 3 · 들리지 않음)은 `move.kind === "ai"` 일 때만 쓴다. 1~3단계 카드 자리는 서버가 붙인 app · sound 가 사실 기록이다. 시험 하나: `talkMoveOf({ kind: "card_slot", stage: 3, cause: "stuck", app: [] })` 은 빈 목록. 자세한 것은 `task-talk-5b-fix1-review.md` 4절.
6. (선택) 같은 보고 '시험 손질': `talk-lesson-hints.test.ts` 202~205줄에 `expect(REAL.map((s) => s.level)).toEqual([1, …, 12])` 한 줄.

## 하지 않을 것
- N-2(새 흐름의 읽는 자리에서 좁힌 스키마로 읽기)는 state.ts(묶음 7 · 12 파일)라 이 차례가 아니다. 컨트롤러가 묶음 12 몫으로 장부에 둔다.
- 다른 손의 파일: 묶음 7 fix 1(`src/core/conversation/attempt.ts` · `tests/unit/talk-lesson-attempt.test.ts` · `talk-lesson-state.test.ts`), 묶음 8 · 9(`src/server/**`, route), `seed/prompts/**`(학습 설계자), `seed/*.json`.
- 설계를 바꾸지 않는다. 옛 꼴 카드 갈래는 동작 그대로 둔다.

## 지키는 것
- 시험을 먼저 써서 실패를 본 뒤 통과시킨다. 단위 · 관문(biome ci · vitest unit) 0, `tsc --noEmit` 0.
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸이고 세션 cd 는 하지 않는다. 커밋 · push 금지, 환경 파일 값 출력 금지.
- 문서 · 보고 파일은 본 저장소 `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-29-회화-수업을-대화로/`(p13d 에는 이 폴더가 없다).

## 보고
`task-talk-5c-report.md`(같은 폴더): 할 것마다 고친 파일 · 줄, 시험 이름(먼저 실패를 본 것 표시), 관문 · tsc 결과, 설계와 다르게 한 것, 묶음 8 · 12 에 넘길 것, 우려. 답은 요지 열 줄 안.
