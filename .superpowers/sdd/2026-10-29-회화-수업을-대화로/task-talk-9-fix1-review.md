# 범위 한정 재검토(회화 plan 묶음 9 fix 1): 검토자 rev-talk-9 · Opus · xhigh, 2026-11-05

판정: **Approved.** 지난 보고(`task-talk-9-review-report.md`)의 I-1 · M-1 · M-2 · M-3 · M-4 가 모두 ADDRESSED 다. 새로 깨뜨린 것은 없다. 본 범위는 fix 1 보고(`task-talk-9-fix1.md`)가 적은 `src/server/conversation/index.ts` 의 힌트 단 줄 · 뜻 상수와 시험 둘이다. 계약 확인을 위해 묶음 8 의 `lessonHintsAt`(`lesson-turn.ts:391~417`) · `state.ts` hintViewsOf(`539~553`) · `hints.ts` 만 읽었다. 시험은 다시 돌리지 않았다.

## 지적별

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 새 꼴 세션 힌트 길 | ADDRESSED | (가) current 에 `hints: HintView[]`(`index.ts:2479~2480` · `2497`). 꼴은 옛 hintViewsOf 그대로이고, 1~3단계는 한국어 단 밖의 글과 쓸 말을 모두 비운다(`state.ts:544~545`). 그래서 영어 문장을 미리 내리지 않는다. (나) `revealTalkLessonHint`(`index.ts:3200~3223`): Zod 입력, lessonStateFor 로 새 꼴 · 그 프로필 세션만, 열린 대화만, 그 단의 글 하나, AI 없음, DB 쓰기 없음. 단은 턴 길이 아이 행 hint_kind · hint_level 을 셀 때와 같은 lessonHintsAt(지금 질문 자리 · 카드 항목 힌트, 없으면 그 질문을 쓴 행의 ai_question)이라 화면 단과 기록 단이 어긋날 자리가 없다. 연 단 수를 턴 요청 hint.opened 로 남기는 것은 옛 revealTalkHint 와 같은 결이다(`index.ts:1495~1517` 도 쓰지 않음). AC-15p(3단계 뜻 → 틀 → 문장 · 듣기)와 AC-15a(1단계 두 단 · 듣기)의 서버 몫을 단위 시험(`talk-lesson-actions.test.ts:814~834`)과 정적 통합 시험(`talk-lesson-session.test.ts:389~410`, 화면 자료 영어 단 글 비움 · 누른 단 글 · 범위 밖 거부)이 단언한다. 순환 가져오기는 없다(`lesson-turn.ts` 는 index 를 가져오지 않음) |
| M-1 'Now let's talk.' 뜻 | ADDRESSED | `NOW_LETS_TALK_KO = "이제 이야기해 보자!"`(`index.ts:2065`)를 cardLineKoOf 가 짝으로 되찾는다(`2082`). 선생님 뜻의 반말 꼴(MORE_PROMPT '더 이야기할래?')과 맞다. 정본 밖 잠정 문구라는 주석이 있다. 시험 `talk-lesson-actions.test.ts:878~899` |
| M-2 통합 (나) 끝맺음 예약 | ADDRESSED | 확인 쪽지 차례에는 0, 확인 뒤 그만두기에는 1 을 본다(`talk-lesson-session.test.ts:318~325`) |
| M-3 보고의 예 | ADDRESSED | `task-talk-9-report.md` 우려 2 를 brush · shop · ring 으로 고쳤다. vocab 에서 셋 다 첫 품사가 noun 이고 verb 를 겸해 낱말만이 된다. cook 은 'I cook.'이라고 적었다 |
| M-4 첫 질문 행 words | ADDRESSED | `teacherMoveOf(out.plan).words` 가 `["play"]` 인지 본다(`talk-lesson-actions.test.ts:179`). 코드가 이미 맞아 먼저 실패가 없는 단언이라는 보고 설명은 옳다 |

## 새로 깨뜨린 것

없다. current 에 칸 하나가 늘었지만 옛 갈래와 옛 화면 형에는 닿지 않는다. moveOutcomeOf 도 currentOf 를 쓰므로 넘김 · 고르기 응답에도 같은 단이 실린다. 새 숫자는 시험 표본 밖에 없다.

## 구현자 Minor 우려(인사 질문 자리에 단 없음) 참고 판정

근거가 있는 지적이다. 묶음 8 검토가 Important 로 다룰 만하다. 새 꼴 카드의 인사 질문은 hintKo · hintEn 이 필수 칸이고 frameEn 은 3단계 선택 칸이다(`src/core/seed/schema/talk.ts:127~133`). 옛 흐름은 인사 질문 자리에도 그 칸으로 단을 냈다(`hints.ts` turnsShapeTiers 의 pending.hintKo · frameEn · hintEn). 정본은 '힌트 단 수와 차례는 그대로다'라고 한다(02-2:206). 그래서 새 꼴 인사 턴에 '힌트' 단추가 없는 것은 옛 흐름에서 물러난 것이다. 고칠 자리는 묶음 8 의 lessonHintsAt(또는 그것이 읽는 질문 자리)이다. 묶음 9 는 그 함수를 그대로 부르므로 그쪽이 고쳐지면 화면 자료와 열기 길이 함께 따라온다. 묶음 9 에서 더 고칠 것은 없다.

## 범위 밖 관찰

- 묶음 11 브리프에 적을 것이 하나 늘었다. 새 감싸기 여덟째 이름은 revealTalkLessonHint 이고, 첫 문장은 requireAccess 다. 감싸기 · 쪽 파일이 plan 파일 표에 없다는 지난 보고 4절의 지적은 그대로 열려 있다.

## 라운드 판정

**Approved(fix 1/3).** 묶음 9 를 닫아도 된다.
