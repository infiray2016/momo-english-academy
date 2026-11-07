# 브리프: 회화 턴 프롬프트 · 흐름 규칙 고침 2 — 막힘 과판정 · 설명의 영어 노출 · 받침 닫기 · 카드 답 뒤 이어 묻기(구현자 · Opus · high, 2026-11-06 00:1x)

## 맥락
- 대본 2회차를 설계 검토자(Fable max)가 아이 눈으로 판정한 결과 '아직'(`task-talk-quality-review-1.md` — 1 · 4 · 4.4 · 5절을 먼저 읽는다). 닫힌 것: 답 먼저 들려줌 0 · 뜻 16/17 · 소리 겹침 0 · 이어 묻기 8/12 · 맥락 없는 카드 끼움 7 → 2. 남은 Critical: **뜻이 통하는 아이 말을 막힘으로 봄**(12턴 중 5) — 요청자의 '일방통행 · 1단계 같다'가 재현되는 자리. 13절 C204(컨트롤러 잠정, `specs/10-결정-기록.md` 끝)에 규칙 (1)~(6)을 적었다. 정본 02-2 251(막힘으로 볼 말) · 194(따라가기) · 196(낱말 답 넓혀 들려주기) · 261(받침 닫기) · 204 · 235(1~3단계 영어 글 없음) · 253(틀렸다고 하지 않음) · 184 · 198(바른 말 되풀이). 고침 1 보고 `task-talk-prompt-1-report.md`(규칙 줄 번호: stuck 설명 515, 반응 744, 이어 묻기 752, 받침 762 · 815, 설명 칸).
- 요청자 소감(원문): 대화 느낌 없음 · 일방통행 · 1단계와 똑같음 · 한글 해석 없음 · 두 번씩 말함 · 형식적 인사 · 재미 없음.
- 증명: 단위 시험 + 대본 3회차(컨트롤러가 talk:observe 로 돌리고 설계 검토자가 '막힘 틀림 0'을 확인한 뒤 요청자 시험).

## 맡는 파일
`src/core/ai/calls/talk-lesson.ts`(프롬프트 · 응답 스키마) · `src/core/conversation/`(새 순수 함수 — 아이 말 갈래, `lesson-flow.ts` · `hints.ts` · `spoken.ts`) · `src/server/conversation/lesson-turn.ts`(막힘 판정 덮어쓰기 · 설명 걸러 내기) · `src/server/ai/talk.ts`(필요하면) · 단위 시험(`talk-prompt-fix1.test.ts` 에 더하거나 새 `talk-prompt-fix2.test.ts`) · 표본 JSON(응답 칸이 늘면). `scripts/talk-observe.ts` 는 impl-talk-13 몫(가져다 쓰는 서명이 바뀌면 보고에 적는다). 카드 파일은 건드리지 않는다.

## 할 것
1. **C-1(Critical) — 막힘 경계(C204 (1)(2)(3)).** (가) 프롬프트 stuck 설명(515)을 '못 알아들었다는 말(Huh? · What? · I don't know)이거나 질문과도 오늘 장면과도 관계없는 한두 낱말일 때만 참. 뜻이 통하는 영어 문장은 다른 이야기여도 막힘이 아니라 child_topic(따라가기, C145)이고, 질문이나 장면에 든 낱말 하나('Rice.' · 'Cold.')는 막힘이 아니라 그 낱말을 담은 문장으로 되풀이한다'로 바꾸고 예를 둘씩. '막힘을 먼저 정하라'와 늘 붙는 'If stuck' 계획이 막힘 쪽으로 기울지 않게 문장을 다듬는다. (나) 응답 칸에 아이 말 갈래 하나(`child_kind`: answer · new_topic · short_related · not_understood · unrelated_words)를 더하고(Zod, 표본 갱신), 앱은 not_understood · unrelated_words 만 막힘으로 센다 — AI 가 stuck 참이라 해도 갈래가 answer · new_topic · short_related 면 막힘을 무르고 되묻기(follow_up 또는 follow_child) 차례로 둔다(순수 함수 `src/core/conversation/` 에, 서버 lesson-turn.ts 가 부름). 앱 쪽 안전망: 인식 글이 영어 낱말 2개 이상의 문장이고 모름 표현(I don't know · huh · what)이 아니면 갈래가 비어도 막힘으로 안 센다.
2. **I-4(Important) — 설명 · 뜻에 영어 답 문장 금지(C204 (4)).** 프롬프트 explanation · tori_ko 설명에 '영어 문장 · 영어 답을 글로 쓰지 않는다(소리 줄이 따로 들려준다)'를 적고, 서버가 explanation · tori_ko 에서 영어 문장(따옴표 안 영어 포함)을 걸러 낸다(순수 함수 + 시험). 설명에 '틀렸다'는 말 금지(M-3, 02-2 253: 아이 말을 평하지 않는다).
3. **I-1(Important) — 3단계 받침 닫기(C204 (5)).** 받침 카드 자리 예(815)를 받침 1('That's okay! Let's say it together.')과 받침 3('… Let's move on.' — 답 한 번 들려주고 다음 이야기, 따라 할 차례 없음, 02-2 261 · 규칙 762)으로 나눈다. 받침 3 에서 '같이 말해 보자' 꼴 + 새 질문을 함께 쓰지 않게 서버도 거른다(가능하면).
4. **I-2(Important) — 카드 답 뒤 이어 묻기(C204 (6)).** 규칙 752 를 '이 턴의 next_move 는 required 가 될 수 없다'로 세게 하고, 앱이 'Previous turn was a card chance: yes' 인 턴의 required 갈래를 follow_up 으로 되돌린다(D8 (나)의 앱 몫, 순수 함수 + 시험).
5. **Minor(프롬프트).** M-1 인사 끝 예 둘셋으로(뜻은 '다행이다!' · '잘 지냈다니 좋다!' 같은 아이 말투), M-2 nospeech 턴 규칙(783 · 815 — tori_en 에 답 · 질문 안 씀, tori_ko 문장마다), M-4 바른 아이 말을 단원 단어로 바꿔 되풀이 금지(02-2 184 · 198), M-7 next_hints 는 자기 질문의 답. I-5(재미 · 선생님 자기 말)는 설계 결정 D11 이라 이번엔 반응 예를 'Me too!' · 'Yum!' 둘 더하는 것까지만.
6. 관문 biome ci · tsc · 단위 · check:ids 0, 새 규칙은 먼저 실패 확인.

## 하지 않을 것
- I-3(막힌 질문 같은 글 재질문)과 I-5(재미 · 선생님 자기 말)의 설계 결정 몫, 카드(M-5), 관찰 도구(M-6), 정본 문장. 커밋 · push · 개발 DB 쓰기 · 환경 파일 값 출력 · 실호출.

## 지키는 것
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(HEAD b462c21), 서브셸 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )`, 세션 cd 금지, 설계 숫자는 설정값, 긴 출력은 스크래치패드.

## 보고
`task-talk-prompt-2-report.md`: 항목별 바꾼 줄 · 대조한 정본 줄, 새 응답 칸 · 순수 함수 서명, 프롬프트 바뀐 부분 전문, 우려. 답은 요지 다섯 줄 안.
