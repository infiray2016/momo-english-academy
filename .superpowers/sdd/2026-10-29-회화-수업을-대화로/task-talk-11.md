# 브리프: 회화 plan 묶음 11 — 화면: 네 토막 · 짧은 준비 쪽지 · 받침 · 두 버튼 · 확인 쪽지 · 위 띠 · 처음 안내 + 서버 액션 감싸기 · 쪽 잇기(구현자 · Opus · high, 2026-11-05 15:2x, 묶음 9 Approved 뒤 · 묶음 8 검토 중 · 묶음 10 과 나란히)

## 맥락
- 닿는 결정: 13절 C192 · C189(네 토막: 인사 → 짧은 준비 → 대화 → 정리, 참여 완료는 자연스러운 종료와 충분한 참여 · 참고 턴은 완료 조건 아님, C188) · C110(회화 세션 여는 차례: 마이크 못 씀 → 쉼 → '시작!' → 처음 마이크 안내 → 토막) · C125 · C166 R1 · C167 (1)(끝인사는 정리에서 한 번) · C179(UX3 막힘 · 쉼 화면 큰 단추) · C184 · C194 (1) · C197(첫 프리뷰 전 기본 실호출 점검 넷은 묶음 14) · C198. plan 묶음 표 11 행(28줄, 증명 AC-15a · 15e · 15f · 15g · 15l · 15m · 15p · 15q · 15s · 15t · N8 · N10 Playwright 몫) · 파일 표 181줄 · 정한 것 11(더 이야기하기는 앱이 더 이야기할 거리 하나를 붙임, AI 호출 없음) · 12(확인 조건) · 17(짧은 준비 열기 (나)) · plan 보정 11-05 (3)(힌트 서버 길은 묶음 9) · (5)(이 묶음 파일에 서버 액션 감싸기 · 회화 쪽 page.tsx, 감싸기 첫 문장은 requireAccess) · (4)('Now let's talk.' 뜻 '이제 이야기해 보자!'). 정본 `specs/02-2-세션과-단계표.md` 3.3 회화 블록(네 토막 · 짧은 준비 173~176줄 · 받침 줄 257~263줄 · 마무리 물음 · 그만하기 · 정리), `specs/03-화면.md` 회화 화면 · 위 띠, `specs/07-음성과-오류.md` 33 · 34 · 60~61줄 · 8절 'AI 쉬는 중'.
- 앞 묶음이 넘긴 것: 묶음 8 `task-talk-8-report.md`(TalkLessonLine · 끝 줄 TalkLessonNext 칸: segment · greetingDone · talkCount(분모 없음) · choice · closingAsked · moreRound · moreInRound · targets · hints · explanation · flashDontKnow · silentBlocked · prep · firstQuestionDue · completed; 대화 첫 질문 차례와 대화 중 짧은 준비는 턴 길이 stale 을 돌려주고 묶음 9 의 advanceTalkLesson 이 잇는다). 묶음 9 `task-talk-9-report.md` · `task-talk-9-fix1.md`(새 액션 일곱 + revealTalkLessonHint, 화면 자료 TalkLessonView · step(토막 넘김 알림) · current.hints, 짧은 준비 쪽지 차례가 끝나면 advanceTalkLesson to talk, 다 하지 않아도 넘길 수 있음, 서버 액션 감싸기와 page.tsx 는 이 묶음 몫 — 지금 쪽은 새 꼴 세션에서 loadTalkView 가 던진다). '5-나' 보고(hints.ts 의 koExplanationShownOf — 1~4단계 첫 막힘 · 5단계부터 둘째 막힘에 한국어 설명, 단계 규격 칸 C195).
- 요청자가 강조한 뜻: 1~3단계 회화에서 영어 문장을 보여 읽게 하지 않는다(대화 토막은 글 없이 힌트 단추만). 횟수로 통과시키지 않는다(위 띠에 분모 없음). 아이 화면은 해요체 · 한 화면에 행동 하나 · 큰 글자. 설계 숫자는 설정값. 녹음 없음. 가족 접근 쿠키 없으면 401.
- UI · UX 개선 묶음 6(회화 화면 꼴)이 회화 묶음 10~12 뒤에 마무리 물음 두 버튼 · 확인 쪽지 · 처음 회화 안내의 꼴을 입힌다(UI · UX 장부 L-52) — 이 묶음은 동작을 둔다. 가르치고 라-4 가 `closing-cards.tsx` 의 '단어 듣기: <낱말>' 접근 이름 두 줄을 고쳤으니 지킨다(T-4 · L-50). 눈 점검은 개정 3 카드 적재 뒤 묶음 14 에서 컨트롤러가 한다 — 지금은 코드 · 단위 · 정적 e2e 다.
- 묶음 8 은 지금 코드 검토 중이라 서버 파일은 고치지 않는다. 줄 꼴이 바뀌면 컨트롤러가 알린다.
- 세션이 초기화되어 앞 구현자들의 기억은 없다. 위 보고들을 먼저 읽는다.

## 할 것(파일 표 181줄 + plan 보정 (5))
1. **서버 액션 감싸기 `src/server/actions/conversation.ts`(수정).** 새 꼴 액션 여덟(loadTalkLessonView · advanceTalkLesson · saveLessonFollowAlong · chooseLessonMoreTalk · stopTalkLesson · leaveTalkLesson · readTalkLessonWrap · revealTalkLessonHint)을 옛 이름과 따로 감싸고, 첫 문장은 가족 접근 쿠키 확인(requireAccess)이다. 옛 감싸기는 그대로(묶음 12 가 지운다).
2. **쪽 잇기 `src/app/(child)/session/[id]/page.tsx`(수정).** 새 꼴 카드 세션(talkCardKindOf 'new')이면 새 갈래 화면 자료(loadTalkLessonView)와 새 액션으로, 옛 꼴은 옛 그대로. 갈래 고르기 한 줄만 두어 되돌리기 쉽게(plan 되돌리기 문단).
3. **네 토막 `talk-frame.tsx`(수정).** 인사 · 짧은 준비 · 대화 · 정리 토막, 기록 칸 배치(묶음 10 의 talk-log 를 자리로 받음 — 그 컴포넌트가 아직 없으면 빈 자리 표지로 두고 보고에 적음), 위 띠에 분모 없음(talkCount 만), '그만하기'와 needs_confirm 쪽지(정한 것 12 · UX3 큰 단추), 막힘 화면, 마무리 물음의 두 버튼(더 이야기하기 · 그만하기 — 더 이야기하기는 chooseLessonMoreTalk, 정한 것 11), 처음 회화 안내 한 문장 지움(C110 의 안내 다섯 문장은 그대로), 받침 단계 표시(한국어 설명은 end 줄 explanation), 토막 넘김(step)이면 advanceTalkLesson 부름, 첫 질문 · 'Now let's talk.' 붙은 행 보이기.
4. **짧은 준비 쪽지 `follow-along.tsx`(수정).** 1단계 그림 · 뜻 · 소리, 2~3단계 낱말 글, 4단계부터 예문 글(T2: 1~3단계 영어 문장 글 없음). 인식 글 + 결과 말, 따라 말하기 시도는 saveLessonFollowAlong(talk-prep 꼴 · 활동 번호는 서버). 다 하지 않아도 '대화로' 넘길 수 있음. 대화 중 연 준비(prep)도 같은 쪽지.
5. **정리 · 첫 장 `closing-cards.tsx`(수정) · `src/core/teacher/name.ts`.** 정리 1~3단계 한 번(되짚을 말 · 끝인사는 정리에서 한 번 C167 (1)), 첫 장 끝난 길, '단어 듣기: <낱말>' 두 줄 지킴(T-4), readTalkLessonWrap 로 자료.
6. **단추 반짝임 · 힌트.** 들리지 않음 뒤 '잘 모르겠어요' 한 번 반짝임(flashDontKnow, 묶음 10 의 말풍선과 나눠 — 이 묶음은 단추 쪽), 힌트 단추는 current.hints(1~3단계 한국어 단 → 영어 틀 → 영어 문장 차례 AC-15p, 한 번 누르면 뜻 · 두 번 누르면 영어 문장과 듣기 AC-15a)로 revealTalkLessonHint 를 부름. 인사 질문 자리의 힌트는 묶음 8 검토 판정에 따른다(판정 전에는 current.hints 가 비면 단추를 두지 않음).
7. **시험.** `tests/unit/talk-follow.test.ts`(수정 · 신규) · `tests/e2e/talk-lesson.spec.ts`(신규, 정적) · `tests/e2e/talk.ts`(수정) — AC-15a · 15e · 15f · 15g · 15l · 15m · 15p · 15q · 15s · 15t · N8 · N10 의 화면 몫. e2e 는 돌리지 않는다.

## 하지 않을 것
- 묶음 10 파일(`src/core/conversation/log.ts` · `talk-log.tsx` · `child-turn.tsx` · `tori.tsx`) — 나란히 돌고 있다. 서버 파일(`src/server/conversation/**` · `src/server/ai/**` · route — 묶음 8 검토 중, 묶음 9 닫힘) · 순수 흐름 모듈 · 시드 · 설정값.
- 새 꼴 화면 꼴 입히기(UI · UX 묶음 6), 옛 흐름 걷기(묶음 12), 기본 실호출 점검(묶음 14).

## 지키는 것
- 시험 먼저. biome ci · vitest unit · tsc 0. 통합 · e2e 는 정적.
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지, 커밋 · push 금지, 환경 파일 값 출력 금지, 개발 DB 에 쓰지 않음.
- 문서 · 보고 파일은 본 저장소 `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-29-회화-수업을-대화로/`(p13d 에는 이 폴더가 없다).

## 보고
`task-talk-11-report.md`: 바뀐 파일 표, 액션 감싸기 여덟 · 쪽 갈래, 토막별 화면 요소 ↔ 화면 자료 칸 대응표, 시험(AC 번호), 관문, 설계와 다르게 한 것, 묶음 12 · 14 에 넘길 것(눈 점검 항목 · 지울 옛 이름), 우려. 답은 요지 열 줄 안.
