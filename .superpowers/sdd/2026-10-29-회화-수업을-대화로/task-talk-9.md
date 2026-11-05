# 브리프: 회화 plan 묶음 9 — 서버 액션 · 화면 자료(구현자 · Opus · high, 2026-10-30 10:0x 작성, 묶음 7 Approved 뒤 · 묶음 8 과 나란히)

plan `intent/2026-10-29-회화-수업을-대화로/plan.md`(approved C192, 보정 C194) 묶음 표 9 행(26줄: 토막 넘김 · 짧은 준비 저장 · 고르기 · 확인 조건 · 대화 기록 자료 · 맞장구 목록, 증명 AC-15f · 15t · 16a · 12h), 파일 표 169 · 170줄, 정한 것 11 · 12 · 17 · 20 · 22 를 구현한다. 설계는 spec 4판 설계 1~5, 정본 02-2 3.3 회화 블록 · 4절 화면 · 04 5절(시드 목록) · 07 이다.

## 할 것(파일 표 169 · 170줄)
1. **`src/server/conversation/index.ts` 새 갈래(talkCardKindOf 'new' 세션만).**
   - ensureStarted: 짧은 준비 계획은 talk-start 의 prepWords(묶음 7 에서 start.prepPlan 으로 읽힘)다. 흐름 입력의 prepWords(보인 낱말)와 섞지 않는다.
   - 화면 자료: 대화 기록 줄 · 짧은 준비 쪽지 · 맞장구 · 고르기 · 마무리 제안. 대화 기록 줄은 묶음 10 의 talkLogOf 가 고를 자료(선생님 화면 글 줄 · 뜻 · 아이 말 · '잘 모르겠어요' · '못 들었어요')를 넘긴다.
   - advanceTalk: 인사 → 짧은 준비 → 대화 첫 질문, 대화 중 연 준비가 끝나면 'Now let's talk.' + 다음 필수 질문.
   - saveFollowAlong: 짧은 준비 · 만남 · 영어 문장 수. 짧은 준비 시도는 talk-prep 꼴 `{ index, word, place, target, heard, failures, skipped?, clientListen? }` 을 lessonFollowAlongNo({ segment: "prep", index }, { todayWords: card.todayWords.length, wrapUp }) 번호로 넣는다. 대화 중 연 준비는 place talk 이고 선생님 행 move.prep 에도 낱말을 둔다(묶음 7 보고 '묶음 8 · 9 에 넘길 것').
   - chooseMoreTalk: 마무리 물음 · 마무리 제안 뒤. '더 이야기하기'는 앱이 더 이야기할 거리 하나를 카드 자리로 붙이고 AI 호출 · 턴 셈이 없다(정한 것 11).
   - stopTalk: 확인 조건은 talkNearlySilent(묶음 5 · 정한 것 12), 끝난 길은 ending(talkStopOf · talkEndOf) → insertLessonClosing.
2. **맞장구 목록(정한 것 20).** `seed/lists/talk-wait-lines.json` 영어 다섯 줄(첫 안 'Hmm, let me see.' · 'Let me think.' · 'Oh, I see.' · 'Okay!' · 'Hmm.')을 빌드에 묶는다. `src/server/seed-lists.ts` · `src/core/seed/structure.ts` 의 SEED_FILES · 목록 검사(금지어 · 선생님 이름 · 물음표 · 1단계 문장 길이 상한)를 더하고, 고르기는 턴 번호로 돌린다(safeLineOf 꼴). 요청자가 프리뷰에서 듣고 고친다.
3. **짧은 준비 열기 (나)**(막힌 차례 talk.prep_offer_stuck 번)는 첫 묶음 몫이다(정한 것 17). (가)(앞 수업 바닥선)는 둘째다.
4. **근거 쓰기 줄**(saveFollowAlong 의 attempts.evidence)은 정한 것 22 대로 P12 의 열 · 함수가 없으니 넣지 않고 그 자리에 주석을 둔다.

## 하지 않을 것
- 서버 턴 길(묶음 8: `src/server/conversation/turn.ts` · `src/server/ai/talk.ts` · route · closing.ts 의 runTalkClosing 새 갈래), 화면 컴포넌트(묶음 10 · 11), 옛 갈래 지우기(묶음 12).
- 다른 손의 파일: 묶음 8 의 파일, '5-나' 뒤 차례의 `src/core/ai/calls/talk.ts` · `src/core/conversation/lesson-turns.ts`.

## 지키는 것
- 시험을 먼저 써서 실패를 본 뒤 통과시킨다. 통합 시험은 정적으로 쓰고 실행은 11-01 뒤 CI 다. 단위 · 관문은 늘 0.
- 숫자는 설정값, T2 · R2 · 녹음 없음 · AI 는 서버만 · Zod, 가족 접근 쿠키 · RLS 그대로. 개발 DB 에 쓰지 않는다.
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`, 서브셸 명령, 세션 cd 금지, 커밋 · push 금지, 환경 파일 값 출력 금지.

## 보고
`task-talk-9-report.md`(같은 폴더): 새 갈래 액션 표, 화면 자료 꼴(묶음 10 · 11 이 읽을 칸), 맞장구 목록 · 검사, 시험(AC 번호 · 단위 · 정적 통합), 관문, 설계와 다르게 한 것, 묶음 10 · 11 에 넘길 것, 우려. 답은 요지 열 줄 안.

## 보정(컨트롤러 11-05 14:3x — 시작 때)
- **묶음 7 은 Approved(fix 1 재검토).** 할 것 1 의 saveFollowAlong 부르는 꼴이 바뀌었다: 짧은 준비 범위는 `lessonFollowAlongNo({ segment: "prep", index }, { todayWords: card.todayWords.length, prepWords: <talk.prep_words.<구간> 설정값>, wrapUp })` 처럼 LessonFollowCounts.prepWords 를 넘긴다(다지기 · 보강 카드는 오늘 쓸 말이 비어 있어 범위가 0 이 되던 것을 고침, `task-talk-7-fix1.md` · 정본 02-2 173줄). 설정값은 코드에 두지 않는다. 개발 DB 에 0006 은 컨트롤러가 적용했다(장부 T-62). 개발 DB 에 쓰지 않는 규칙은 그대로다.
- **다지기 · 보강 짧은 준비의 들려줄 말 출처(회화 3단계 브리프 설계 검토 '구현하며 확인할 것' 2).** 다지기 · 보강 카드는 todayWords 가 비어 있어 카드에 들려줄 말이 없고, 서버 wordInfoOf(index.ts 132~154줄 근처)는 vocab 뜻 · 예문만 읽는다. 컨트롤러 잠정 결정(첫 프리뷰에서 요청자 확인): (1) 같은 단원의 적재된 배정 카드 오늘 쓸 말에 그 낱말이 있으면 그 들려줄 말을 쓴다, (2) 없으면 브리프 `seed/prompts/talk-3.md` 5절의 들려줄 말 (제안) 꼴을 품사별 앱 규칙으로 만든다(브리프를 읽고 품사별 꼴을 정해 보고에 적는다 — 동사에 'The + 낱말.' 을 쓰지 않는다), (3) 그것도 없으면 낱말만 읽는다. 첫 프리뷰의 다지기 6 은 beach · mountain 등 배정 5 낱말이라 (2)가 실제로 쓰인다. 시험으로 셋을 보인다.
- **'5-다'(impl-talk-5c)가 같은 때 돈다.** 그 손의 파일은 `src/core/conversation/{hints,chances,question-check,lesson-turns,lesson-flow}.ts` · `src/core/ai/calls/{talk,talk-lesson}.ts` · `src/core/seed/check-talk.ts` 다. 함께 쓰는 열거 넷(토막 · 입력 방식 · 힌트 종류 · 들은 도움)의 정의는 lesson-turns.ts 로 가고 talk-lesson.ts 가 다시 내보내니, 이 묶음은 **talk-lesson.ts 에서 가져온다**(옛 talk.ts 에서 가져오지 않는다). 그 파일들 때문에 tsc 가 잠깐 깨지면 잠시 뒤 다시 돌린다.
- **묶음 8(impl-talk-8)도 나란히 돈다.** 묶음 8 파일에는 closing.ts 가 더해졌다(plan 보정 11-05 (2)). index.ts 는 이 묶음만 고친다.
