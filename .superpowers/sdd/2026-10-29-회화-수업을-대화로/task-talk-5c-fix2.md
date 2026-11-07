# 구현 보고: 회화 plan 묶음 '5-다' fix 2(fix 라운드 2/3)

구현자는 impl-talk-5c-fix1(implementer · Opus · high)이고, 2026-11-05 에 썼습니다. 줄 번호는 워크트리 `.claude/worktrees/p13d` 기준입니다. 재검토 `task-talk-5c-fix1-review.md` 의 N-1 · N-2 를 고쳤습니다. 묶음 8 · 9 의 파일은 건드리지 않았습니다.

## N-1(Important) 한국어 설명 문장이 말 입력 막힘 턴을 놓침
- 고침(`src/core/ai/calls/talk-lesson.ts:678`): 문장을 재검토가 제안한 꼴로 바꿨습니다. 'After a stuck turn (Reason: button or stuck, or you set stuck to true), write a short Korean explanation in explanation when Support stage is {from} or above (when you set stuck, use the If stuck Support stage).' 칸 koExplainFromStuck 을 읽는 것은 그대로입니다. 주석(`:665-667`)에 까닭을 적었습니다.
- 시험(`tests/unit/talk-lesson-call.test.ts:1146-1170`): sentence 꼴을 새 문장으로 바꾸고, 실시드 3 · 4 · 5단계 고정부에 'or you set stuck to true' 가 든다는 단언을 더했습니다(`:1160`). 고치기 전에 두 시험('실시드 3 · 4단계는 받침 첫째부터…' · '문장은 단계 번호가 아니라 칸 값을 따른다…')이 실패하는 것을 먼저 확인했습니다.

## N-2(Minor) AI 가 적은 support 가 비운 줄과 어긋남
- 고침(`talk-lesson.ts:1180-1196` supportOf, `:1326` 정규화 출력): support 를 남은 줄과 맞춥니다.
  - choices 는 남은 선택지가 있을 때만 둡니다.
  - model_line 은 남은 따라 할 말이 있을 때만 둡니다. 4단계부터는 따라 할 말을 늘 비우므로 늘 none 입니다.
  - 1~3단계 together 는 남은 따라 할 말이 있을 때만 둡니다. 4단계부터 together 는 선생님 말 안의 답이라 그대로 둡니다.
  - easy_question · none 은 그대로입니다. hints.ts 는 고치지 않았습니다.
- 시험(`talk-lesson-call.test.ts:1239` describe "'5-다' fix 2 N-2(support 를 남은 줄과 맞춤)"):
  - '1~3단계 받침 둘째에서 비운 따라 할 말 · 같이 말하기를 support 로 적어도 none 이다(아이가 듣지 못함)' — 먼저 실패 확인.
  - '선택지가 검사에 걸려 비면 support choices 도 none 이고, 남은 선택지면 그대로다' — 먼저 실패 확인.
  - '4단계부터 따라 할 말은 늘 비우므로 support model_line 은 none, 선생님 말 안의 같이 말하기는 그대로다' — 먼저 실패 확인.
  - '남은 따라 할 말이 있으면 1~3단계 support model_line 은 그대로다' — 경계를 지키는 시험이라 고치기 전에도 통과했습니다.

## 따라 바꾼 기존 시험 · 표본(설계와 다르게 한 것은 없음)
- `talk-lesson-call.test.ts:599-614` '열거값 칸은 소문자로 다듬고…': 이 시험은 대소문자 다듬기만 보는데, 따라 할 말 없는 3단계 응답에 'TOGETHER' 를 써서 새 규칙에 걸렸습니다. 그래서 줄과 맞추지 않는 'Easy_Question' 으로 바꿨고, 시험의 뜻은 그대로입니다.
- 표본 `tests/fixtures/ai/samples/talk_turn.v2-l3-support-together.json` 의 기대값 normalized.support 를 together 에서 none 으로 바꿨습니다. 이 표본은 3단계 카드 자리(LOW_SLOT) 같이 말하기 차례입니다. 그래서 정규화 뒤 따라 할 말이 비고, 같이 말하기 줄은 앱이 붙입니다. 그 사실은 move.app(together · answer_example)이 기록하므로 heardHelpsOfMove 의 '들음' 판정은 바뀌지 않습니다. 1~3단계의 사실 기록은 서버가 붙인 app · sound 라는 재검토 N-2 의 뜻과도 맞습니다. 통합 · e2e 시험에는 이 표본이나 support together 를 기대하는 곳이 없습니다(grep).

## 관문 결과(출력 전문은 스크래치패드)

| 명령 | 결과 |
|---|---|
| `pnpm biome ci .` | 0 |
| `pnpm vitest run --project unit` | 142 파일 · 1787 통과 · 6 todo · 실패 0 |
| `pnpm tsc --noEmit` | 0 |
| `pnpm check:deps` | 위반 0(285 모듈) |

출력 파일은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/` 아래의 `fix2-unit.txt` · `fix2-tsc.txt` · `fix2-deps.txt` · `fix2-biome-ci.txt` 입니다.

## 묶음 8 · 9 · 12 에 넘길 것
- 묶음 8: `lesson-turn.ts:860` 의 `ai: replaced ? "none" : value.support` 는 이제 남은 줄과 맞춘 값을 받습니다. 서버에서 따로 고칠 것은 없습니다. 3단계 카드 자리 차례의 move.ai 는 이제 대개 none 이고, 도움 사실은 move.app 에 있습니다.
- 묶음 9 · 12: 닿는 것이 없습니다.

## 우려
- 고정부 문장이 다시 바뀌었으므로 고정부 캐시는 한 번 새로 만들어집니다.
- `talk-lesson-hints.test.ts:283-285` 는 아직 3단계 move `ai: "model_line"`(소리 줄 없음)을 답 예시로 봅니다. 정규화가 그런 move 를 더는 만들지 않으므로 해는 없습니다. 다만 heardHelpsOfMove 자체는 move.ai 를 계속 믿습니다.
