# 브리프: 회화 plan 묶음 '5-다' fix 1(구현자 · Opus · high, 2026-11-05 14:5x, fix 라운드 1/3)

## 맥락
- 닿는 결정: 13절 C195(koExplainFromStuck 칸) · C189 · C192. 정본 `specs/02-2-세션과-단계표.md` 3.3 회화 블록(인사 토막 · 받침 줄 257~263줄 · 한국어 설명).
- 앞 차례: '5-다' 구현 보고 `task-talk-5c-report.md`, 코드 검토 `task-talk-5c-review.md`(rev-talk-5c · Opus xhigh, Approved — Minor M-1~M-4). 묶음 8 구현자(impl-talk-8)가 진행 중에 '5-다' 파일(lesson-flow.ts)에서 Important 후보 하나를 찾아 보고했다(아래 I-A). 묶음 8 · 9 가 같은 때 돌고 있고, 둘 다 이 묶음의 파일을 가져다 쓰므로 이 fix 는 그들이 정규화 · 힌트 판정을 서버에 잇기 전에 끝내는 것이 가장 싸다.
- 요청자가 강조한 뜻: 설계 숫자를 코드에 박지 않는다. 1~3단계는 영어 문장을 보여 읽게 하지 않는다.
- 세션 기억은 없다. 위 보고 · 검토 파일을 먼저 읽는다.

## 할 것
1. **I-A(Important, impl-talk-8 발견) 인사 끝 막힘 말 되짚기.** 마지막 인사 질문에 '막힘 말'(말 입력 · stuck 참 · stuckInSlot+1 < talk.dontknow_max)로 답한 턴은 계획 때 lessonTurnSegmentOf 가 말 입력을 greeting_end 로 보내 greetingEndPlan(닫기) 차례가 된다(`lesson-flow.ts` 397 · 707줄 근처). 그런데 DB talk_segment 열거에 greeting_end 가 없어 아이 행 토막은 greeting 으로 남고, lessonTurnOf(`state.ts` 1413줄 근처, 묶음 7 파일 — 고치지 않는다)는 그대로 greeting 으로 옮기며, talkLessonPositionOf(`lesson-flow.ts` 322~331줄)는 막힘이라 자리를 닫지 않고 greetingIndex 도 그대로라 phase 가 talk 로 넘어가지 않는다. 다음 턴의 계획과 firstQuestionDue 가 틀린다. 고침: lesson-flow 의 인사 토막 되짚기에서 '마지막 인사 질문 + 말 입력'이면 막힘이어도 인사를 끝낸 것으로 본다(lessonTurnSegmentOf 의 '말 입력은 답한 것으로 본다'와 같은 뜻, 계획과 되짚기가 같은 규칙). 시험 먼저: 마지막 인사 질문에 막힘 말로 답한 행을 되짚으면 phase 가 talk(또는 prep)로 넘어가고 greetingIndex · firstQuestionDue 가 계획과 같다.
2. **M-1.** `talk-lesson.ts` 1206~1210줄 근처의 새 단어 거르기가 받침 둘째에서 비운 원래 model_line 을 본다. 그래서 아이가 듣지 못한 낱말이 intro 와 '들음'으로 남는다(N-4 고침이 만든 어긋남). 비운 뒤의 글을 보게 한다 + 시험.
3. **M-2.** `hints.ts` 273~277줄 근처의 계획 사실이 1~3단계 AI 차례에도 걸려 소리 줄이 비면 '답을 들었다'로 남는다. 단계 구간(band)을 인자로 넘겨 1~3단계는 서버가 붙인 소리 줄만 보게 한다 + 시험(지금 부르는 곳은 시험뿐).
4. **(선택) M-3 · M-4.** M-3 고정부 문장의 '몇 번째 막힘'을 AI 가 실제로 받는 Support stage 값으로 적기, M-4 hints.ts 가 정의 자리 lesson-turns.ts 에서 가져오기. 싸면 한다.

## 하지 않을 것
- `src/server/**`(묶음 8 · 9 가 돌고 있음: turn.ts · closing.ts · ai/talk.ts · route · index.ts · seed-lists.ts), `src/core/seed/structure.ts`(묶음 9), state.ts(묶음 7 · 12), 시드 · 브리프 파일. SUPPORT_STAGE_EASY 중복 · N-2 는 묶음 12 몫이라 건드리지 않는다.
- 설계를 바꾸지 않는다. 옛 꼴 카드 갈래는 그대로.

## 지키는 것
- 시험을 먼저 써서 실패를 본 뒤 통과시킨다. biome ci · vitest unit · tsc · check:deps 0.
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지, 커밋 · push 금지, 환경 파일 값 출력 금지. 다른 구현자가 편집 중이라 전체 tsc 가 잠깐 깨지면 잠시 뒤 다시 돌린다.
- 문서 · 보고 파일은 본 저장소 `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-29-회화-수업을-대화로/`.

## 보고
`task-talk-5c-fix1.md`(같은 폴더): 지적마다 고친 파일 · 줄, 시험 이름(먼저 실패 확인 표시), 관문 결과, 묶음 8 · 9 · 12 에 넘길 것, 우려. 답은 요지 열 줄 안.
