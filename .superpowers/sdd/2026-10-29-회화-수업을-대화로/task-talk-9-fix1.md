# 구현 보고: 회화 plan 묶음 9 fix 1(구현자 impl-talk-9 · Opus · high, 2026-11-05, fix 라운드 1/3)

상태: DONE. 검토 보고 `task-talk-9-review-report.md` 의 I-1 · M-1 · M-2 · M-3 과 8절에 더해진 M-4 를 고쳤다. 코드는 워크트리 p13d 의 `src/server/conversation/index.ts` 와 시험 둘만 고쳤다. 묶음 8 · 10 · 11 파일은 고치지 않았다. 시험을 먼저 써서 실패 5건(함수 없음 4 · 뜻 없음 1)을 본 뒤 통과시켰다.

## 지적마다 고친 것

### I-1(Important) 새 꼴 세션의 힌트 단 길
- **(가) 화면 자료.** `TalkLessonCurrent` 에 `hints: HintView[]`(index.ts:2497)를 더했다. 꼴은 옛 HintView(종류 · 듣기 · 쓸 말)다. 1~3단계 영어 단 글은 비운다(state.ts hintViewsOf 그대로). 영어 문장을 미리 내리지 않는 보호가 그대로 남는다.
- **(나) 열기 길.** `revealTalkLessonHint({ sessionId, tier })`(index.ts:3200)를 더했다. lessonStateFor 로 새 꼴 세션만 읽고, 그 단의 글을 돌려준다. 단이 없으면 `{ ok: false }` 다.
- **단을 정하는 함수.** 순수 함수 `lessonHintViewsOf`(2453) · `lessonHintTextOf`(2461)가 묶음 8 의 `lessonHintsAt`(lesson-turn.ts:391)을 부른다. 턴 길이 아이 행의 힌트 종류를 셀 때와 같은 함수라서 화면 단과 기록 단이 어긋나지 않는다.
  - 카드 항목을 노린 자리는 그 카드 항목 힌트를 쓴다.
  - 그 밖의 자리는 그 질문을 쓴 선생님 행 `ai_question`의 `{ hintKo, hints, usable }` 를 쓴다(묶음 8 보고 54 · 117줄과 맞음).
  - 검토 '어떻게'의 '마지막 선생님 행 move.item'은 '지금 질문 자리'로 읽었다. 받침 첫째 · 둘째 행은 move.item 이 비어도 같은 자리를 잇기 때문이다.
- **'연 단은 기록'의 뜻.** 열기 길은 DB 에 쓰지 않는다. 연 단 수는 화면이 다음 턴 요청의 hint.opened 로 보내고, 턴 길(lesson-turn lessonChildRowOf)이 아이 행 hint_kind · hint_level 로 남긴다. 옛 revealTalkHint 와 같은 결이다. 저장 칸이 묶음 8 과 맞아서 멈추지 않았다.
- **시험.**
  - 단위(`tests/unit/talk-lesson-actions.test.ts:774` 묶음, 4건): AC-15p 3단계 뜻 → 틀 → 문장(듣기) · 영어 단 글 비움 · 열기 글 셋 · 범위 밖은 null, AC-15a 1단계 두 단, AI 차례 ai_question 힌트(4단계는 영어 글도 내림), 힌트 없는 자리 · 자리 없음.
  - 정적 통합(`tests/integration/talk-lesson-session.test.ts:389`, 1건): 대화 첫 질문 자리의 화면 자료 단과 열기 길을 본다.
- **열기 길이 받지 않는 자리.** 인사 질문 자리는 lessonHintsAt 이 단을 내지 않아 이 길도 단이 없다. 턴 길과 같고, 묶음 8 몫이라 고치지 않았다(아래 우려).

### M-1 'Now let's talk.' 의 뜻
- `NOW_LETS_TALK_KO = "이제 이야기해 보자!"`(index.ts:2065)를 두었다. 컨트롤러 결정(plan 보정 11-05 (4))이고 잠정이며, 첫 프리뷰에서 요청자가 확인한다. cardLineKoOf 가 'Now let's talk.' 과 짝으로 이 뜻을 되찾는다(2082).
- 단위 시험(`talk-lesson-actions.test.ts:876` 묶음)은 1~4단계 기록 줄에 이 뜻이 붙는지와 문구 값을 본다.
- 먼저 실패는 뜻 정의가 없을 때 봤다. 문구를 '보자.'에서 '보자!'로 바꾼 것은 시험 값과 함께 고쳐서 따로 실패를 보지 않았다.

### M-2 통합 시험 (나)의 끝맺음 예약
- `talk-lesson-session.test.ts:324` 근처에서 확인 쪽지 차례에는 모인 작업이 0 이고, 확인 뒤 그만두면 하나가 모이는지 본다.

### M-4 대화 첫 질문 행의 move.words(검토 8절 추가)
- `talk-lesson-actions.test.ts` 의 '짧은 준비 → 대화' 시험에 단언 한 줄을 더했다. `teacherMoveOf(계획).words` 가 붙인 필수 질문의 노린 단어 `["play"]` 인지 본다.
- 코드는 이미 맞게 채우고 있어서(지시대로 코드는 그대로) 실패를 볼 수 없는 단언이다.

### M-3 구현 보고 우려 2 의 예
- `task-talk-9-report.md` 우려 2 의 예를 고쳤다. 첫 품사가 명사이고 동사를 겸한 낱말(brush · shop · ring, vocab 에서 확인)이 낱말만이 된다. cook 은 첫 품사가 동사라 'I cook.'이다.

## 관문(출력은 스크래치패드 `t9f1-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm vitest run tests/unit/talk-lesson-actions.test.ts`(고치기 전) | 5 실패 · 26 통과 |
| 같은 파일(고친 뒤) | 31 통과 |
| `pnpm biome ci` | 0, 584 파일 |
| `pnpm exec tsc --noEmit -p .` | 0 |
| `pnpm check:deps` | 위반 0 |
| `pnpm vitest run --project unit` | 0, 142 파일 · 1792 통과 · 6 todo(M-1 문구 · M-4 뒤 다시 돌린 값 같음) |

## 설계와 다르게 한 것
- 묶음 8 의 lessonHintsAt(lesson-turn.ts)을 가져다 쓴다. index.ts 가 그 파일을 가져오는 첫 자리이고, 순환은 없다(lesson-turn 은 index 를 가져오지 않음, check:deps 0).

## 넘길 것 · 우려
- 묶음 11: 새 꼴 세션의 '힌트' 단추는 `current.hints`(턴 뒤에는 묶음 8 의 끝 줄 lesson.hints)로 그리고, 누른 단은 `revealTalkLessonHint` 로 받는다. 서버 액션 감싸기는 다른 새 이름 일곱과 함께 묶음 11 이 잇는다.
- (Minor, 묶음 8 몫) 인사 질문 자리(카드 인사 질문의 hintKo · hintEn · frameEn)는 lessonHintsAt 이 단을 내지 않아 새 꼴 세션의 인사 턴에는 '힌트' 단추가 없다. 정본 3.3 힌트 문단이 인사 턴에도 힌트를 두는지 묶음 8 검토에서 함께 본다.
- 통합 시험은 이 Mac 에서 돌지 않아 실행하지 못했다. 11-01 뒤 CI 몫이다.
