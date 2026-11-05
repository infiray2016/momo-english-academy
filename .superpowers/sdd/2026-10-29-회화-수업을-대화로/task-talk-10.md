# 브리프: 회화 plan 묶음 10 — 화면: 대화 기록 · 아이 말풍선 · 맞장구 · 소리 줄 단추(구현자 · Opus · high, 2026-11-05 15:2x, 묶음 9 Approved 뒤 · 묶음 11 과 나란히)

## 맥락
- 닿는 결정: 13절 C192(회화 plan 승인) · C189(네 토막 · 대화 중심, C188) · C125(문장 사이 쉼 · 단계 빠르기 · 붙일 줄 겹침 없애기) · C166 R1(선생님이 읽는 동안에도 말하기 단추, 누르면 읽기 멈춤) · C148 · C149(iPad 결과 없음 → no-speech, 듣기 사건 칸 client_listen) · C179 (2) · C184('들려주지 못함' 처리) · C194 (1) · C198(첫 프리뷰 하나로, 늦추지 않음). plan 묶음 표 10 행(27줄: 대화 기록 · 아이 말풍선 · 맞장구 · 소리 줄 단추, 증명 AC-15q · N10) · 파일 표 179 · 180줄 · 정한 것 5(선생님 행 text 는 화면 글 줄만) · 20(맞장구 목록). 정본 `specs/02-2-세션과-단계표.md` 3.3 회화 블록(대화 기록 · 1~3단계 소리 줄 · '잘 모르겠어요' · '못 들었어요'), `specs/03-화면.md` 회화 화면, `specs/07-음성과-오류.md` 9 · 33 · 34 · 60~61줄.
- 앞 묶음이 넘긴 것: 묶음 8 보고 `task-talk-8-report.md` '묶음 9 · 10 · 11 에 넘길 것'(새 줄 꼴 TalkLessonLine — sound 줄은 읽어 주기 재료이고 글로 보이지 않음(T2), 끝 줄 `{ t: "end", lesson: TalkLessonNext }` 의 칸, 1~3단계 AI 차례 힌트는 end 줄에만, 다시 흘림은 lessonReplayLinesOf). 묶음 9 보고 `task-talk-9-report.md` · `task-talk-9-fix1.md` '묶음 10 · 11 에 넘길 것'(talkLogOf 는 view.log 를 읽음 — '잘 모르겠어요'는 input dont_know 이고 nospeech 아닌 행, '못 들었어요'는 nospeech 행, 인식 실패 시도는 talk_turns 에 없음; 맞장구는 waitLineOf(view.waitLines, 다음 선생님 행 턴 번호)로 고르고 talk.wait_line_seconds 뒤에 읽으며 기록에 넣지 않음; current.hints 는 옛 HintView 꼴 · 1~3단계 영어 단 글 비움 · 여는 액션 revealTalkLessonHint). 묶음 9 가 새 액션을 옛 이름과 따로 둔 것(loadTalkLessonView · advanceTalkLesson · saveLessonFollowAlong · chooseLessonMoreTalk · stopTalkLesson · leaveTalkLesson · readTalkLessonWrap · revealTalkLessonHint).
- 요청자가 강조한 뜻: 1~3단계 회화에서 영어 문장을 보여 읽게 하지 않는다(글 없는 듣기 단추). 아이 화면은 한국어 해요체 · 한 화면에 행동 하나 · 큰 글자. 설계 숫자는 설정값. 녹음 없음.
- UI · UX 개선 묶음 6(회화 화면 꼴)은 회화 묶음 10~12 뒤에 꼴을 입힌다(UI · UX 장부 L-52). 이 묶음은 동작과 자료 연결을 두고 꼴은 지금 화면의 스타일을 따른다. 눈 점검은 개정 3 카드 적재 뒤 묶음 14 에서 컨트롤러가 한다 — 지금은 코드 · 단위 · 정적 e2e 다.
- 세션이 초기화되어 앞 구현자들의 기억은 없다. 위 보고들을 먼저 읽는다.

## 할 것(파일 표 179 · 180줄)
1. **대화 기록 고르기 `src/core/conversation/log.ts`(신규, 순수).** `talkLogOf`: 선생님 화면 글 줄 · 뜻(1~4단계) · 아이 말 · '잘 모르겠어요' · '못 들었어요'. 소리 줄 · 1~3단계 답 예시 · 힌트 글 · 맞장구는 넣지 않는다. 입력은 묶음 9 의 view.log 꼴.
2. **기록 칸 `src/components/conversation/talk-log.tsx`(신규).** 지금 턴은 맨 아래, 지난 것은 위로 넘김, 지난 선생님 말을 누르면 그 말만 다시 읽음(선생님 목소리, 읽어 주기 규칙 7절 그대로), 표지 data-talk-log. 자유 대화 (나)가 다시 쓴다.
3. **아이 말풍선 `child-turn.tsx`(수정).** 보낸 뒤 말풍선 남김(바로 보낸 턴 포함), 인식 실패 '못 들었어요', 들리지 않음 뒤 '잘 모르겠어요' 한 번 반짝임, 1~3단계 AI 차례 힌트 흐림(end 줄의 힌트), 듣기 사건 sp 모으기(C149, 묶음 7 의 client_listen 꼴).
4. **선생님 `tori.tsx`(수정).** 맞장구(talk.wait_line_seconds 뒤, 선생님 목소리, 첫 문장은 맞장구 뒤), 글 없는 듣기 단추(따라 할 말 · 선택지 ①②, 1단계 둘 사이 'Or'), 붙인 카드 줄 · 받침 줄 읽기, C125 문장 사이 쉼 · 단계 빠르기 그대로, 읽는 동안 말하기 단추(C166 R1).
5. **시험.** `tests/unit/talk-log.test.ts`(신규) · `talk-bubble.test.ts`(수정) — AC-15q(1~3단계 소리 줄은 글로 보이지 않음 · 듣기 단추) · N10 몫. e2e 는 정적(`tests/e2e/talk-lesson.spec.ts` 의 이 묶음 몫만 더하고 돌리지 않음).

## 하지 않을 것
- 묶음 11 파일(`talk-frame.tsx` · `follow-along.tsx` · `closing-cards.tsx` · `src/core/teacher/name.ts` · `src/server/actions/conversation.ts` · `src/app/(child)/session/[id]/page.tsx`) — 나란히 돌고 있다. 서버 파일(`src/server/**`, 묶음 8 검토 중) · 순수 흐름 모듈('5-다' 닫힘) · 시드.
- 꼴 새로 입히기(UI · UX 묶음 6 몫). 옛 흐름 화면의 동작 바꾸기(묶음 12 가 걷는다).

## 지키는 것
- 시험 먼저. biome ci · vitest unit · tsc 0. 통합 · e2e 는 이 Mac 에서 돌지 않으니 정적으로.
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지, 커밋 · push 금지, 환경 파일 값 출력 금지, 개발 DB 에 쓰지 않음.
- 문서 · 보고 파일은 본 저장소 `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-29-회화-수업을-대화로/`(p13d 에는 이 폴더가 없다).

## 보고
`task-talk-10-report.md`: 새 파일 · 바뀐 파일 표, 화면 자료 칸 → 화면 요소 대응표, 시험(AC 번호), 관문, 설계와 다르게 한 것, 묶음 11 · 14 에 넘길 것(눈 점검 항목), 우려. 답은 요지 열 줄 안.
