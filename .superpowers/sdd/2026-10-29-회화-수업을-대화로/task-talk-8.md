# 브리프: 회화 plan 묶음 8 — 서버 턴 길(구현자 · Opus · high, 2026-10-30 10:0x 작성, 묶음 6 · 7 Approved 뒤 · 묶음 9 와 나란히)

plan `intent/2026-10-29-회화-수업을-대화로/plan.md`(approved C192, 보정 C194) 묶음 표 8 행(25줄: 차례 계획 · 1~3단계 질문 잡아 두기 · 같은 질문 막기 · 붙일 줄 · move 저장 · 참여 완료, 증명 AC-15b · 15i · 15k · 15r · 15s · 15v), 파일 표 168줄(`src/server/conversation/turn.ts` · `src/server/ai/talk.ts` · `src/app/api/talk/turn/route.ts` · `src/server/conversation/closing.ts` — plan 보정 11-05 (2), 묶음 7 검토 M-4), 정한 것 1 · 5 · 11 · 18(13절 C194 (1)로 넓힘) · 19 · 22 를 구현한다. 설계는 spec 4판 설계 1~5, 정본 02-2 3.3 회화 블록(192 · 200 · 202 · 204 · 259~263줄) · 6.1 · 6.2 · 07 7절 · 8절('AI 쉬는 중'의 바뀐 행)이다.

## 할 것(파일 표 168줄)
1. **새 갈래는 talkCardKindOf 'new' 세션에서만**(정한 것 1). 옛 갈래와 옛 시험은 그대로 둔다(묶음 12 가 지움).
2. **한 턴의 차례.** 상태(묶음 7 의 readTalkAnyState · readTalkLessonState) → 흐름 계획(묶음 5 의 teacherTurnPlansOf. 흐름 입력 prepWords 는 `state.prepWords` 이고 `state.start.prepPlan` 을 넘기지 않는다) → 호출 입력(묶음 6 의 talkCallTurnOf) → 사용자 메시지 → 흘려 받기(문장 문, 1~3단계 물음표 문장은 응답 끝까지 잡아 둠 — 정한 것 19, 같은 질문 막기 — 셈은 묶음 5 의 turnQuestionOf 로 그 차례 질문만) → 응답 첫 칸 stuck 으로 chosenCallTurnOf 가 계획을 고름 → 끝난 뒤 카드 자리(까닭 2 · 3, 붙일 기회가 없으면 C194 (1)의 대신 질문) · 붙일 줄(카드 질문 · 받침 줄 · 소리 줄 · 마무리 물음, 겹침 없애기 C125) → move(묶음 7 의 teacherMoveOf) → 저장.
3. **선생님 행 text 는 화면에 글로 나온 줄만 둔다**(정한 것 5). 검사를 지난 AI 글 뒤, 그 끝에 앱이 붙인 줄(카드 질문 · 쉬운 질문 · 마무리 물음)을 둔다. 그래야 묶음 5 의 turnQuestionOf 가 그 차례 질문을 바로 고른다(묶음 5 검토 '묶음 8 이 지킬 것'). 1~3단계 소리 줄은 move.sound 에만 둔다. tori_ko 는 묶음 7 의 lessonToriKoOf 로 정한다.
4. **참여 완료.** completeTalk(reachTalkTarget 을 바꾼 이름)가 친한 정도와 이음매 onTalkSessionEnded completed 를 부른다. completed 는 참여 완료 셋(마무리 물음에 답함 · 바닥선 끝 · 참여가 있는 '그만하기')에서 세션마다 한 번이고, 마무리 물음 뒤 '더 이야기하기'를 해도 다시 부르지 않는다. 참여가 거의 없어 확인 뒤 중단하면 aborted 다(P12 plan 정한 것 21 · 이 plan 정한 것 22). 별 장부는 P12 몫이라 쓰지 않는다.
5. **끝맺음 턴.** 새 꼴 세션의 끝맺음은 runTalkClosing 의 새 갈래로 잇는다. 묶음 7 이 runTalkClosing · talkClosingStatus 를 옛 갈래(readTalkState)로 남겼다. 끝난 길은 core/conversation/ending(talkStopOf · talkEndOf) → closing.ts 의 insertLessonClosing 이고, 세션 상태는 부르는 쪽이 바꾸며, 돌려받은 schedule 이 참이면 scheduleTalkClosing 을 부른다(묶음 7 보고 '묶음 8 · 9 에 넘길 것').
6. **실패 길.** 1~3단계는 칭찬 대사 + 카드 자리, 4단계부터 'Oops', 거절 · 끊김 · 'AI 쉬는 중'(8절 바뀐 행). 상태의 들리지 않음 셈은 `state.nospeechDontknowCount` 다.
7. **묶음 6 검토 8절의 범위 밖 관찰 넷을 이 묶음에서 정한다.** (가) 1~3단계 마무리 제안 문장이 AI 질문 검사로 지워진 턴은 갈래 closing 을 없음으로 바꾸고(두 버튼을 보이지 않음) 시험으로 보인다. (나) 소리 줄이 빈 턴의 'Listen and say!' 신호 말을 어떻게 다룰지 정해 시험으로 보인다. (다) 설명 칸(explanation) 보이기는 '5-나'의 koExplanationShownOf(1~4단계 첫 막힘 · 5단계부터 둘째 막힘)를 부른다. (라) 정규화가 따라 할 말 · 선택지를 바꾼 턴을 move(또는 감시 기록)에 표시해 묶음 13 의 talk:observe 가 볼 수 있게 한다.

## 하지 않을 것
- 액션 · 화면 자료(묶음 9: `src/server/conversation/index.ts` · 시드 목록 · 맞장구 목록), 화면(묶음 10 · 11), 옛 갈래 지우기(묶음 12), 근거 칸 쓰기 줄(정한 것 22: P12 의 열 · 함수가 없으니 넣지 않고 그 자리에 주석).
- 다른 손의 파일: 묶음 9 의 index.ts, '5-나' 뒤 차례의 `src/core/ai/calls/talk.ts` · `src/core/conversation/lesson-turns.ts`.

## 지키는 것
- 시험을 먼저 써서 실패를 본 뒤 통과시킨다. 통합 시험(embedded Postgres)은 이 Mac 에서 돌지 않으니 정적으로 쓰고, 실행은 11-01 뒤 CI 다. 단위 · 관문은 늘 0.
- AI 호출은 서버만 · 키는 서버만 · 응답은 Zod 검증, 숫자는 설정값, T2 · R2 · 녹음 없음, 가족 접근 쿠키 · RLS 그대로.
- 개발 DB 의 0006 적용은 컨트롤러가 정한다. 이 묶음은 개발 DB 에 쓰지 않는다.
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`, `( cd 워크트리 && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸(세션 cd 금지), 커밋 · push 금지, 환경 파일 값 출력 금지.

## 보고
`task-talk-8-report.md`(같은 폴더): 새 갈래의 차례 표, 붙일 줄 규칙, move · text 저장 규칙, 참여 완료와 이음매 부르는 때, 실패 길, 범위 밖 관찰 넷의 처리, 시험(AC 번호 · 단위 · 정적 통합), 관문, 설계와 다르게 한 것, 묶음 10 · 11 에 넘길 것, 우려. 답은 요지 열 줄 안.

## 보정(컨트롤러 11-05 — 묶음 7 검토 M-4)
- `src/server/conversation/closing.ts` 는 이 묶음의 파일이다. runTalkClosing · talkClosingStatus 의 새 꼴 갈래(할 것 5)를 여기서 잇는다. 서버 파일 잠금표의 closing.ts 는 3 · 7 · 8 · 12 · 16 이다. talkClosingStatus 를 부르는 화면 쪽은 묶음 9 · 11 이다. 묶음 7 fix 1 은 closing.ts 를 고치지 않으므로 겹치지 않는다.
- 짧은 준비 활동 번호 범위는 plan 보정 11-05 (1)대로 max(카드 오늘 쓸 말 수, talk.prep_words.<구간>)이고, 부르는 쪽이 LessonFollowCounts 에 prepWords 를 넘긴다(묶음 7 fix 1 보고 `task-talk-7-fix1.md` 의 꼴을 따른다).

## 보정(컨트롤러 11-05 14:3x — 시작 때)
- **묶음 7 은 Approved(fix 1 재검토, `task-talk-7-fix1-review.md`).** 짧은 준비 활동 번호는 LessonFollowCounts.prepWords 칸(설정값 talk.prep_words.<구간>, 부르는 쪽이 넘김)으로 범위를 잡는다(`task-talk-7-fix1.md`). 개발 DB 에 0006 은 컨트롤러가 적용했다(적용 결과는 장부 T-62). 개발 DB 에 쓰지 않는 규칙은 그대로다.
- **'5-다'(impl-talk-5c)가 같은 때 돈다.** 그 손의 파일은 `src/core/conversation/{hints,chances,question-check,lesson-turns,lesson-flow}.ts` · `src/core/ai/calls/{talk,talk-lesson}.ts` · `src/core/seed/check-talk.ts` 다. 고치지 않는다. 함께 쓰는 열거 넷(토막 · 입력 방식 · 힌트 종류 · 들은 도움)의 정의는 lesson-turns.ts 로 가고 talk-lesson.ts 가 다시 내보내니, 이 묶음은 **talk-lesson.ts 에서 가져온다**(옛 talk.ts 에서 가져오지 않는다). 그 파일들 때문에 tsc 가 잠깐 깨지면 잠시 뒤 다시 돌린다. '5-다' (라)는 chances.ts 의 카드 자리 고르기를 마지막 물음표 문장 열쇠(`cardQuestionKeyOf`, question-check.ts)로 맞춘다 — 같은 질문 막기(할 것 2)는 그 열쇠와 같은 뜻이다.
- **'5-나' 재검토 N-2 는 이 묶음이 아니다.** 새 흐름이 단계 규격 행을 좁힌 스키마로 읽는 것은 state.ts(묶음 7 · 12 파일)라 묶음 12 몫으로 장부에 두었다. koExplanationShownOf(hints.ts)가 칸 없는 행에서 던지는 것은 그대로 받는다.
- **AI 음성 읽어 주기 제안(요청자 11-05)은 intent 단계**라 이 묶음과 무관하다. 읽어 주기 글(선생님 행 text)은 지금 규칙 그대로다.
