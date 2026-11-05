# 브리프: 회화 plan 묶음 12 — 옛 흐름 걷기(구현자 · Opus · high, 2026-11-05 15:4x 작성, 묶음 10 · 11 Approved 뒤 · 혼자 돈다)

## 맥락
- 닿는 결정: 13절 C192 · C189(새 흐름이 옛 흐름을 바꿈 — 정한 것 1 · 2) · C195 · C198(첫 프리뷰 하나로, 1단계 회화는 둘째 프리뷰까지 닫힘 — plan 위험 14). plan 묶음 표 12 행(29줄: 옛 갈래 · 옛 응답 꼴 · 옛 시험 지우기, 옛 꼴 카드 닫기, 없앤 키 둘, 회화 e2e 를 새 꼴 견본으로, 증명 AC-15d · 15h · 15j · 7a 회귀) · 파일 표 183~186줄 · plan 보정 11-05 (6)(지울 옛 액션 이름) · (8)(잠금표 새 파일 둘) · (9)(옛 talk-stream 이름) · 위험 12(0c664c3 고침 시험을 새 갈래로 옮긴 뒤 옛 몫만 지움). 정본 `specs/02-2-세션과-단계표.md` 3.3 회화 블록, `specs/09-설정값.md`(없앤 키 둘).
- 앞 묶음이 넘긴 것(장부): '5-나' 재검토 N-2 — 새 흐름의 읽는 자리(state.ts 1480줄 근처)에서 `TalkLevelSpecSchema.required({ choices: true, koExplainFromStuck: true })` 꼴로 좁혀 읽고 옛 꼴을 걷으면 공용 스키마의 두 칸을 필수로 바꾸고 twoAnswers 를 지움(hints.ts · talk-lesson.ts 의 칸 없는 행 던짐도 그때 지움, T-57 · T-65). '5-다' 구현자 우려 — SUPPORT_STAGE_EASY(받침 둘째 번호)가 lesson-flow.ts · talk-lesson.ts · hints.ts 맨 숫자 1 까지 셋 → move.ts 공용 상수로(T-65 · T-67 · T-85 M-7). '5-다' fix 2 재검토 F-1 — 출력 검사 applyTalkLessonChecks(talk-lesson.ts 1483~1489줄 근처)가 선택지를 비우거나 따라 할 말을 빈 대체 줄로 바꾼 뒤 support 를 다시 맞추지 않음(T-77). 묶음 9 가 옛 이름과 따로 둔 새 액션(loadTalkLessonView · advanceTalkLesson · saveLessonFollowAlong · chooseLessonMoreTalk · stopTalkLesson · leaveTalkLesson · readTalkLessonWrap · revealTalkLessonHint)의 짝인 옛 이름 · 옛 감싸기(T-83), 묶음 11 의 옛 talk-stream 이름(T-86). 묶음 8 이 나눈 lesson-turn.ts · lesson-input.ts(옛 turn.ts 갈래 지움). 묶음 10 · 11 보고의 '묶음 12 에 넘길 것'(옛 화면 조각 · today_words · practice · fixme e2e).
- 요청자가 강조한 뜻: 옛 흐름 걷기로 아이에게 보이는 동작이 바뀌면 안 된다(새 갈래가 이미 같은 동작). 1~3단계 영어 문장을 보여 읽게 하지 않는다. 설계 숫자는 설정값.
- 세션 기억은 없다. 위 보고들과 plan 끝 보정 문단을 먼저 읽는다.

## 할 것(파일 표 183~186줄)
1. **옛 갈래 파일 몫 지움(정한 것 1).** flow.ts 옛 위치 · 말해 보기 · calls/talk.ts 옛 꼴 · 서버 옛 갈래(turn.ts · state.ts · closing.ts · index.ts 의 옛 분기, 옛 액션 여덟과 옛 감싸기) · 화면 today_words · practice · V1 형(talkSpecV1Of 등) · 단계 규격 옛 칸 · 시드 보기 옛 몫 · 옛 talk-stream 이름. 공용 스키마의 choices · koExplainFromStuck 를 필수로, twoAnswers 지움, hints.ts · talk-lesson.ts 의 칸 없는 행 던짐 지움, 새 흐름 읽는 자리의 좁힘은 필수 칸이 되면 자연히 닫힘(N-2).
2. **옛 꼴 카드 닫기(정한 것 2).** `src/server/lesson-list/index.ts` · `src/server/conversation/index.ts` — 옛 꼴 카드(1단계 회화)는 둘째 프리뷰까지 닫힘(위험 14, 프리뷰 상태표 첫 줄은 컨트롤러).
3. **없앤 키 둘 지움.** `seed/settings.json` · `tests/fixtures/settings.ts` · `specs/09-설정값.md`(p13d 사본 = 정본, 본 저장소 정본은 컨트롤러가 같은 줄로 맞춤).
4. **옛 시험 지움 · 새 꼴 견본으로.** conversation-flow · conversation-call · conversation-server · talk-* 옛 몫 · 통합 conversation-* · e2e conversation.spec · required-utterance · required-recovery 의 회화 몫. 표지(data-child-said · data-tori-* · data-wait-hint)는 지킨다. 위험 12: 0c664c3 고침(1~3단계 '모름' 턴 A~E · C148 no-speech · C149 client_listen · 듣는 동안 단추 끔 · 체감 대기)의 시험(talk-hold · talk-child-listen · talk-listen-log · conversation-said 등)이 새 갈래 시험으로 옮겨져 있는지 먼저 확인하고, 없으면 옮긴 뒤 옛 몫을 지운다. 묶음 10 · 11 의 e2e(`tests/e2e/talk-lesson.spec.ts`, fixme 없음)는 그대로 두고 옛 conversation.spec 몫만 걷는다(T-96).
5. **작은 정리 넷.** SUPPORT_STAGE_EASY 를 move.ts 공용 상수 하나로(hints.ts 맨 숫자 1 포함), F-1 출력 검사 뒤 support 다시 맞춤 + 시험, 받침 번호 사본 없음을 시험으로, tori.tsx 가 가르치는 수업 조각에서 가져온 문구 하나를 회화 쪽 문구로(묶음 10 재검토 N-3).
6. **묶음 11 이 넘긴 것(`task-talk-11-fix1.md` · `task-talk-11-fix2.md` 의 받는 값).** N-4 정리 반짝임 다듬기(움직임 줄이기 설정에서 표시 없음 · ate · went · came 꼴 놓침 · '그만하기' 길에 마지막 선생님 말이 정리 기록에 없음 — 꼴 · '스스로 한 말' 서버 칸은 UI · UX 묶음 6 몫이라 동작 몫만), N-5 회화 쪽 갈래(page.tsx)의 catch 가 진짜 오류도 기록 없이 삼킴(옛 갈래를 지우면서 새 갈래는 오류를 기록하고 오류 쪽으로).
7. **7a 회귀.** 회귀 시험(AC-7a)과 전체 관문(biome ci · vitest unit · tsc · check:deps · check:ids · spec:trace · seed:validate) 0.

## 하지 않을 것
- 새 갈래의 동작 바꾸기. 묶음 13(talk:observe) · 14(프리뷰) · 16~18 몫. 시드 카드 · 브리프 · 정본 본문(09 사본 줄 하나만).

## 지키는 것
- 시험 먼저(지울 것은 지우기 전에 새 갈래 시험이 그 뜻을 덮는지 본다). 관문 0.
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지, 커밋 · push 금지, 환경 파일 값 출력 금지, 개발 DB 에 쓰지 않음.
- 문서 · 보고 파일은 본 저장소 `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-29-회화-수업을-대화로/`(p13d 에는 이 폴더가 없다).

## 보고
`task-talk-12-report.md`: 지운 파일 · 함수 · 시험 목록(옛 이름 ↔ 새 이름 표), 옮긴 시험 표(0c664c3 고침 다섯), 없앤 키 둘, 공용 스키마 변경, 관문, 설계와 다르게 한 것, 묶음 14 에 넘길 것, 우려. 답은 요지 열 줄 안.
