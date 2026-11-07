# 브리프: 회화 3단계 단원 1 카드 두 장 글 고침 — 장면 단정 문장(학습 설계자 · Opus · high, 2026-11-05 22:5x)

## 맥락
- 첫 프리뷰에서 카드 필수 질문이 모두 '아이 상태를 단정하는 장면 문장 + What do you do ~?' 꼴('You are thirsty. What do you do with the juice?')이라 낱말 맞히기처럼 들렸다(`task-talk-design-gap.md` A6 · D5, 권고 (가)). 컨트롤러 결정 D5 (가): 장면 문장만 물건 · 장면 말로 바꾸고('Oh, cold juice! What do you do with it?') 칸은 그대로. D2(장면 여는 질문 칸)는 요청자 결정 전이라 하지 않는다.
- 규칙: 브리프 `seed/prompts/talk-3.md`(142 · 292 · 309~325줄이 지금 꼴을 처방함 — 함께 고친다), 질문에 노리는 단어를 넣지 않는 규칙(A4-03), 홀로 뜻이 통함, 같은 질문 열쇠는 마지막 물음표 문장(검증기 `src/core/seed/check-talk.ts`), 정본 `specs/06-시드-생성.md` 회화 카드 규격 · `specs/02-2-세션과-단계표.md` 3.3. 카드 검토 `task-talk-4c-review.md`.
- 카드: `seed/lessons/talk/3/1.json`(배정 1 · 다지기 6, 개정 3). 글을 고치면 다음 적재가 개정 4 가 된다(컨트롤러가 `seed:validate` → `seed:load --partial`).

## 맡는 파일
`seed/lessons/talk/3/1.json` · `seed/prompts/talk-3.md`(처방 줄만) · `seed/prompts/README.md`(판 기록 한 줄).

## 할 것
1. 두 카드의 필수 질문 · 더 이야기할 거리 · 쉬운 질문 앞 장면 문장 가운데 아이 상태 · 행동을 단정하는 것('You are hungry/thirsty/sleepy…', 'Lunch is ready!' 같은 명령 · 단정)을 물건 · 장면 말이나 묻는 꼴로 바꾼다. 질문 문장(마지막 물음표 문장)은 그대로 두어 같은 질문 열쇠 · 검증 결과가 바뀌지 않게 한다. 노리는 단어는 여전히 질문에 넣지 않는다.
2. 인사 끝 문장은 정본 예('Let's learn some new words!' 꼴)와 맞는지 보고, 되받기 유도 꼴이면 고친다. 끝인사 'You are great!' 는 그대로.
3. 브리프 142 · 292 · 309~325줄의 처방을 같은 뜻으로 고친다(다음 26장 생성용). README 에 판 기록 한 줄.
4. `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm seed:validate --areas talk )` 0 · 경고 그대로. 고친 문장 전후 표를 보고에.

## 하지 않을 것
- 카드 칸 구조 · 질문 문장 · 노리는 단어 · 다른 카드 · 코드. 커밋 · push · 적재(컨트롤러).

## 보고
`task-talk-cards-fix-1-report.md`: 전후 표, 검증 결과, 브리프 고친 줄. 답은 요지 다섯 줄 안.
