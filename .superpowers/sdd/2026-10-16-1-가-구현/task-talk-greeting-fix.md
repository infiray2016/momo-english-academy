# 브리프: 회화 1~3단계 '모름' 턴 결함 A~E 고침(구현자 · Opus · high, 2026-10-29)

바탕: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(가지 feature/1a-p13d-teacher, 1e44de5). 분석 보고 `task-talk-greeting-analysis-report.md`(같은 폴더) 5절 (나) 결함 A~E 와 6절 우려를 먼저 읽는다. 보고는 `task-talk-greeting-fix-report.md`(같은 폴더).

## 고칠 것(보고의 자리 그대로, 최소 변경)
- **A [Important]** 1~3단계에서 겹침 없애기(`shownTurnOf`)가 AI 문장을 하나라도 뺀 턴은 뜻 줄(tori_ko)을 흘리지도 저장하지도 않는다(`src/server/conversation/turn.ts:1077-1086` 의 plan.ko 와 `:1114` 의 toriKo 를 같은 판정으로). 판정은 순수 함수로 둔다. 다시 흘리기 · 이어 열기는 저장값을 따르므로 저절로 따라온다.
- **B [Minor]** `src/core/ai/calls/talk.ts:371-377` lowBandRules 에 한 줄: 1~3단계에서 Input 이 dont_know 이거나 stuck 이 참이면 tori_en · tori_ko 에 짧은 격려만 쓰고 답은 말하지 않으며(앱이 들려줌) recast 는 비운다.
- **C [Minor]** `src/core/conversation/flow.ts:901-908` normalizeSpoken 이 영어 줄임꼴(I'm · it's · that's · don't · you're · let's 등)을 펼쳐 'i am fine' 과 "I'm fine" 이 같은 말로 잡히게 한다. 13절에 보완 줄이 들어갈 것이라 코드 주석에 'C127 보완(2026-10-29)'만 적는다.
- **D [Minor]** `src/server/conversation/turn.ts:398` '모름' 턴(input dont_know)에는 recast 를 채우지 않는다(비움).
- **E [Minor]** `src/components/conversation/tori.tsx:359` 설명 줄도 다른 줄과 같이 fillName 을 거친다.

## 시험(먼저 쓰고 실패를 본 뒤 고친다)
- A: 판정 함수 단위 시험 + 통합 시험(가짜 응답 tori_en "That's okay! Say, I am fine.", tori_ko "괜찮아! 'I am fine.' 라고 말해 봐." 로 1단계 '모름' 턴 → 흘린 줄에 ko 없음 · talk_turns.tori_ko 비어 있음) + e2e AC-15g 가짜 응답(`tests/e2e/talk.ts:233` · `tests/e2e/conversation.spec.ts:314`)에 같은 tori_ko 를 넣어 기존 단언이 회귀를 잡게.
- B: 1단계 시스템 글에 그 줄이 있는지 단위 시험. C: normalizeSpoken 단위 시험(줄임꼴 여섯). D: 통합 시험에서 '모름' 턴의 recast 가 비어 있는지. E: tori.tsx 설명 줄 fillName 단위(또는 기존 AC-16b e2e 에 설명 줄 단언 하나).
- 관문: `export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH` 뒤 `pnpm test` · `pnpm test:int` · `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm check:deps` 모두 통과. e2e 는 이 Mac 에서 못 돌리므로 시험 코드만 고치고 CI 에 맡긴다.

## 지키는 것
- p13d 안의 위 파일과 시험만 고친다. 정본 `specs/` · 시드 · 다른 워크트리는 손대지 않는다. 커밋하지 않는다(컨트롤러가 한다). 설계 숫자를 코드에 박지 않는다(설정값).
- 사용자 지시가 아닌 다른 결함을 보면 고치지 말고 보고의 '범위 밖 관찰'에 적는다. 아이 이름 · 비밀값은 적지 않는다.
- 보고에는 고친 파일 · 줄, 시험 이름과 결과(명령 출력 요지), 남은 우려를 적는다. 마지막 답은 상태(DONE · DONE_WITH_CONCERNS)와 보고 경로만.
