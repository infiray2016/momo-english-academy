# 고침 브리프: 회화 plan 묶음 12 fix 2(impl-talk-12 · Opus · high, 라운드 2/3, 2026-11-05 19:1x 작성)

## 맥락
- fix 1 재검토 `task-talk-12-fix1-review.md`(rev-talk-12, Changes requested 라운드 2/3): 지난 지적 I-1 · I-2 (가)(나)(다) · M-1 · M-2 는 모두 ADDRESSED. 새 Important 둘(N-1 · N-2)은 묶음 10 · 11 이 쓴 `tests/e2e/talk-lesson.spec.ts` 의 결함으로, fix 1 보고 우려 2 를 컨트롤러가 판정 맡긴 결과다. 재검토 보고 2절(두 규칙 · 재현 출력 `scratchpad/rev12f1/probe2-out.txt`)을 먼저 읽는다.
- 왜 지금 고치나: push 뒤 CI 첫 실행이 붉지 않아야 한다(요청자 차례: 묶음 12 Approved → 전체 관문 → 커밋 · push). 고칠 파일은 `tests/e2e/talk-lesson.spec.ts` 하나다. src · seed · 다른 시험은 건드리지 않는다.
- 설계 동작(바꾸지 않는다): (1) 1~3단계 질문 검사(AC-15i)는 시험 어휘 밖 낱말이 든 AI 질문을 카드 질문으로 바꾼다 — 가짜 응답의 질문 · 선택지는 시험 어휘와 아이가 그 대화에서 말한 낱말 안에서 쓴다. (2) 1~3단계 첫 막힘은 카드 자리라 앱이 kind "answer" 소리 줄(카드 답 예시)을 붙이고 AI 의 model_line · choices 는 쓰지 않는다(`talk-lesson-flow.test.ts` 294줄이 설계 동작).

## 할 것(모두 `tests/e2e/talk-lesson.spec.ts`)
1. **N-1 — 470 · 499 · 806줄.** 가짜 응답의 질문 · 선택지를 시험 어휘(what · do · you · like · it · see 등)와 아이가 말한 낱말로 쓴다(예 'Do you like it?'). 선택지는 I-1 과 같은 차림 — `I like <카드 필수 1 노리는 단어>.` · `I like it.` 과 `card_item: { kind: "required", no: 1 }`. 뜻이 '이어 하기 · 맞장구 차례'라 질문 글이 꼭 필요 없는 자리는 말풍선 단언을 반응 문장만 보게 줄여도 된다(어느 쪽을 택했는지 보고에 적는다).
2. **N-2 — 390 · 397 · 671 · 730줄.** 같이 말하기 소리 줄은 `[data-sound-listen="answer"]` 와 카드 답 예시(말풍선 · 기록 글에는 없고 읽은 글에는 있음)로 단언한다. 선택지 ①② 시험(648줄)은 막힘이 아니라 말로 답한 AI 질문 차례에 범위 안 선택지 · card_item 을 두는 꼴로 바꾼다(I-1 과 같은 차림).
3. **관문.** biome ci · tsc 0(e2e 는 정적), 단위 그대로(1781). 각 자리마다 대조한 서버 규칙의 코드 줄(질문 검사 · 소리 줄 kind · 선택지 검사 no_target)을 보고에 적는다.

## 하지 않을 것
- src · seed · 다른 시험 파일 고치기. 커밋 · push · 개발 DB 쓰기 · 환경 파일 값 출력. 시험 파일은 Edit 로만(T-96).

## 지키는 것
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`, 명령은 `( cd … && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지, 긴 출력은 스크래치패드 파일로.

## 보고
`task-talk-12-fix2.md`(본 저장소 같은 폴더): N-1 · N-2 자리별 ADDRESSED 근거(줄 · 바꾼 꼴 · 대조한 코드 줄), 관문, 우려. 답은 요지 열 줄 안.
