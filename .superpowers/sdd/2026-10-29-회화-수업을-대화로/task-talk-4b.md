# 브리프: 회화 3단계 생성 브리프 고침 — 묶음 4 나(학습 설계자 · Opus · xhigh, 2026-11-05, 설계 검토 Changes requested 뒤)

## 맥락
- 닿는 결정: 13절 C172(같은 질문을 세 번 되풀이하지 않는다) · C181 · C189(회화 수업 흐름) · C194 (1)(받침 셋째 닫기 · 들리지 않음 닫기 뒤 가장 오래전 더 이야기할 거리를 카드 자리로 붙임, 잠정) · C194 (2). 설정값 `talk.same_question_max` 는 2.
- 앞 차례: 브리프 `seed/prompts/talk-3.md`(p13d, 774줄, sha256 앞 16자 8956f25816b5d8fc) · `seed/prompts/README.md` talk-3 행 · 목표 `talk-3-1-goals.md`(장부 T-18 · T-36 · T-38 · T-39). 설계 검토 `task-talk-3-brief-review.md`(des-talk-3-brief · Fable max, Changes requested: I-1 · 요청자 몫 I-2 · M-1~M-4)와 그 보탬(장부 T-53: 5절 170줄 C194 (1) ○ 예 'You are thirsty. What do you do?' 도 같은 꼬리).
- 요청자가 강조한 뜻: 1~3단계 회화에서 영어 문장을 보여 읽게 하지 않는다. 카드와 목표는 대화를 돕는 장치이지 차례대로 묻는 대본이 아니다.
- 읽을 정본: `specs/02-2-세션과-단계표.md` 190줄(카드 자리) · 200줄(같은 질문) · 261줄(답 소리 뒤 다음 카드 자리), `specs/06-시드-생성.md` 6.3 한 판 원칙.
- 실행 열쇠: 앱은 선생님 차례의 **마지막 물음표 문장**(대소문자 · 따옴표 · 문장 부호 · 띄어쓰기 · 줄임꼴 무시)으로 같은 질문을 센다(p13d `src/core/conversation/question-check.ts` 의 turnQuestionOf · questionKeyOf). 컨트롤러가 지금 검증기 `talk-same-question`(`src/core/seed/check-talk.ts`)의 열쇠를 같은 꼴로 맞추고 있다. 나란히 진행하므로 그 파일은 고치지 않는다.
- 세션이 초기화되어 지난 설계자(cd-talk-3-goals)의 기억은 없다. 검토 보고를 먼저 읽는다.

## 할 것(검토 보고의 I-1 고칠 것 1~4 · M-1~M-4)
1. **I-1 (1).** 5절 '같은 질문' 행(146줄) · 더 이야기할 거리 문단(170줄) · 14절 확인 4(524줄)에 규칙 한 줄을 더한다: 선생님 질문(인사 · 필수 · 더 · 쉬운 질문)의 마지막 물음표 문장이 한 카드에서 글자가 같은 것은 2번까지다(실행 열쇠, 앱이 이 문장으로 세기 때문).
2. **I-1 (2).** 8절 질문 꼴 표(309~337줄)의 'What do you do?' 꼬리 일곱(eat · drink · come · wash · sleep · learn · look)과 5절 170줄의 ○ 예를 열쇠가 서로 다르게 바꾼다. 검토 보고가 든 예(1~2단계 낱말로, 노리는 단어를 질문에 두지 않는 A4-03 유지)를 써도 되고 더 나은 꼴이 있으면 그것으로 한다.
3. **I-1 (3).** 14절 스스로 확인 명령에 마지막 물음표 문장 열쇠 셈을 넣는다(검토 보고의 제안 덩어리: 인사 질문 · 필수 · 더 · 쉬운 질문의 en 에서 마지막 물음표 문장을 뽑아 정규화하고, 카드마다 열쇠별 수가 2 를 넘으면 걸림).
4. **I-1 (4).** 12절 예시 카드(필수 3 · 더 1 · 더 2)를 새 규칙에 맞게 고치고 다시 검증한다(12절 머리 '검증을 통과한 것만 싣는다').
5. **M-1.** 5절 142줄 '질문 글은 두 문장까지' 와 8절 335줄 grass 예(세 문장)가 어긋난다. 두 문장으로 맞추기를 권한다(카드 자리에는 AI 반응이 앞에 붙는다).
6. **M-2.** 0절 13줄 '이 판이나 다음 판으로' → '다음 판으로'(6절 · 14절 VERBS · GOAL_OF 가 단원 1 전용).
7. **M-3.** 14절 한국어 이름 검사가 '준비' · '하나' · '나비' · '소라' 를 건다. 뒤 명단 이름은 영어 칸만 보거나, 한국어는 '준' 을 빼고 10절 362줄의 '하나 → 한 개' 안내만 둔다. 같은 명령의 어휘 검사가 두 낱말 표제어 'ice cream' 을 갈라 범위 밖으로 내므로, 토큰 전에 두 낱말 표제어를 먼저 맞추거나 7절에 '쓰지 않음' 으로 적는다.
8. **M-4.** 8절 307줄 '검출기가 못 잡지만 쓰지 않는 꼴' 에 부정 명령문 'Don't ~' 한 줄을 더한다.
9. **판 바뀜.** 해시(sha256 앞 16자) · 줄 수 · README talk-3 행을 갱신한다(6.3 한 판 원칙). 14절 명령 셋(스스로 확인 · 붙이기 · 검증)이 고친 뒤에도 브리프 글 그대로 도는지 스크래치패드 시드 사본에서 돌린다. 사본 자리는 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/talk3-brief-fix1/`. 스스로 확인은 `python3 -I`, 검증은 `pnpm -s seed:validate --root <사본>/seed --areas talk --json`(Node 24 서브셸). 검증은 마지막에 돌린다. 그때 검증기 talk-same-question 이 새 열쇠로 바뀌어 있을 수 있고, 12절 예시는 어느 쪽에서도 오류 0 이어야 한다.

## 하지 않을 것
- I-2(expression 확인 방식)는 요청자 · P12 몫이다. 카드 글과 브리프의 답 예시 규칙(I · We · They + 동사 원형)은 그대로 둔다.
- `src/` · `tests/` · `seed/unit-specs.json` · `seed/level-specs.json` · `talk-3-1-goals.md` 는 고치지 않는다. 카드는 아직 만들지 않는다(범위 한정 재검토 Approved 뒤 컨트롤러가 seed-generator 로 만든다).
- 설계 검토가 닫은 우려(1 · 3~8)와 '새로 볼 것 일곱' 판정은 다시 열지 않는다.

## 지키는 것
- 고치는 파일은 p13d 의 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d/seed/prompts/talk-3.md` 와 같은 폴더의 `README.md` 둘뿐이다. 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸이고 세션 cd 는 하지 않는다. 커밋 · push 금지. 비밀값 · 아이 이름을 적지 않는다.
- 보고 파일은 본 저장소 `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-29-회화-수업을-대화로/` 에 둔다(p13d 에는 이 폴더가 없다).

## 보고
`task-talk-4b-report.md`: 고친 곳(절 · 줄) 표, 새 질문 꼴 표(동사 → 질문 → 답 예시, 마지막 물음표 문장 열쇠), 새 판 해시 · 줄 수, 14절 명령 실행 결과, 설계와 다르게 한 것, 우려. 답은 요지 열 줄 안.
