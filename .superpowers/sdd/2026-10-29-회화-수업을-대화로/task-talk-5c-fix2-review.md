# 재검토 보고: 회화 plan 묶음 '5-다' fix 2(범위 한정, fix 라운드 2/3)

검토자는 rev-talk-5c(code-reviewer · Opus · xhigh, 읽기 전용)이고, 2026-11-05 에 썼습니다. 줄 번호는 워크트리 `.claude/worktrees/p13d` 기준입니다. 본 것은 고침 보고 `task-talk-5c-fix2.md` 와 고친 자리입니다. 고친 자리는 `src/core/ai/calls/talk-lesson.ts` 의 koExplainRule · supportOf · 정규화 출력 · 출력 검사 바꾸기, `tests/unit/talk-lesson-call.test.ts` 의 바뀐 시험 셋, 표본 `tests/fixtures/ai/samples/talk_turn.v2-l3-support-together.json` 입니다. 시험은 다시 돌리지 않았습니다. 관문은 스크래치패드 `fix2-*.txt` 의 요약 줄로 확인했습니다(14:56, 고친 파일보다 뒤). 단위는 142 파일 · 1787 통과 · 6 todo, check:deps 는 위반 0 · 285 모듈, tsc 는 출력 없음, biome ci 는 고칠 것 없음입니다.

**판정: Approved.** N-1 · N-2 는 ADDRESSED 입니다. 새로 든 것은 Minor 하나와 다듬기 둘이고, Important 는 남지 않았습니다.

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| N-1(Important) 한국어 설명 문장이 말 입력 막힘 턴을 뺌 | ADDRESSED | `talk-lesson.ts:678` 은 'After a stuck turn (Reason: button or stuck, or you set stuck to true), … when Support stage is {from} or above (when you set stuck, use the If stuck Support stage).' 입니다. 말 입력 턴은 Reason 이 '-' 이지만, AI 가 막힘을 정한 경우가 조건에 들어 갔습니다. 받침 단계도 'If stuck, Support stage' 줄(planLines)을 읽으라고 적었습니다. 고정부 `:700` 의 'If stuck 줄로 바꿔 읽기'와도 맞습니다. 칸 koExplainFromStuck 을 읽는 것과 칸이 없으면 던지는 것은 그대로입니다. 시험 `talk-lesson-call.test.ts:1148-1170` 은 새 문장 전체, 실시드 3 · 4 · 5단계의 'or you set stuck to true', 칸 값을 따르는 문장을 봅니다. 옛 문장에서는 실패하는 단언입니다. |
| N-2(Minor) AI 가 적은 support 가 비운 줄과 어긋남 | ADDRESSED(정규화 몫) · 새 Minor F-1 | `talk-lesson.ts:1185-1193` 의 supportOf 를 정규화 출력 `:1326-1330` 이 부릅니다. 넘기는 값은 정규화 뒤의 modelLine · choices(`:1232-1251`)입니다. choices 는 남은 선택지가 있을 때만, model_line 과 1~3단계 together 는 남은 따라 할 말이 있을 때만 남깁니다. 4단계부터는 model_line 이 늘 비므로 support model_line 이 늘 none 이고, 선생님 말 안의 together 는 그대로입니다. 이것은 02-2:259 의 4단계부터 열(AI 답 예시를 선생님 말 안에)과 맞습니다. 시험 `:1239-1310` 은 받침 둘째의 model_line · together, 버린 선택지와 남은 선택지, 남은 따라 할 말, 4단계 두 경우를 봅니다. 앞의 셋은 옛 통과 코드에서 실패하는 입력입니다. 다만 정규화 뒤의 출력 검사가 줄을 다시 비우는 길은 맞추지 않습니다(F-1). |

### 컨트롤러가 물은 두 가지
- **표본 기대값 together → none 의 설명은 맞습니다.** 표본 입력은 `l3-support-together`(`tests/fixtures/ai/talk-lesson-inputs.ts:391`, 막힌 필수 질문 1 + 카드 자리 LOW_SLOT `:372`)입니다. 카드 자리는 AI 차례가 아니라서 keepsModel 이 거짓입니다(`talk-lesson.ts:1221-1223`). 그래서 응답의 model_line 'I play.' 는 비고, support together 는 새 규칙으로 none 이 됩니다. 실제 흐름에서 1~3단계 같이 말하기 카드 자리는 계획이 app 에 together · answer_example 을 싣고 답 소리 줄을 붙입니다(`lesson-flow.ts` stuckPlan · greetingPlan 의 `low && answer` 갈래). heardHelpsOfMove 는 app 의 together · answer_example 로 답 예시를 셉니다(`hints.ts:288-289`). 그러므로 move.ai 가 none 이 되어도 '들음' 판정은 바뀌지 않습니다. core 에서 move.ai 를 읽는 곳은 hints.ts 셋뿐입니다(`:277 · 291 · 292`, grep).
- **'Easy_Question' 으로 바꾼 것은 시험의 뜻을 지킵니다.** `talk-lesson-call.test.ts:599-616` 은 열거값 다듬기(대소문자)만 봅니다. easy_question 은 supportOf 가 건드리지 않는 값이라(`talk-lesson.ts:1192`) 다듬기 결과만 남습니다. 'TOGETHER' 를 그대로 두었다면 따라 할 말 없는 3단계 응답이라 none 이 되어, 다듬기와 맞추기가 한 단언에 섞였을 것입니다.

## 2. 새로 든 것

### Minor

**F-1. 출력 검사가 정규화 뒤에 선택지를 비우거나 따라 할 말을 빈 대체 줄로 바꾸면 support 가 다시 어긋납니다.**
- 무엇: `applyTalkLessonChecks`(`talk-lesson.ts:1458-1514`)는 6.4 검사에 걸린 칸을 바꿉니다. 선택지는 `[]` 로 비우고(`:1489`), 따라 할 말은 `modelLineFallbackOf` 로 바꿉니다(`:1483-1488`). 그런데 support 는 정규화 때 값 그대로 둡니다. 대체 줄은 그 자리에 새 단어 줄도 답도 없으면 빈 글입니다(`:1097`, `stuckAnswer` 는 `answerFallback ?? ""`). 그러면 support choices 나 model_line · together 가 남은 채 줄이 비게 됩니다.
- 왜: N-2 와 같은 결과입니다. move.ai 를 hints.ts `:277 · 291-292` 가 '들음'으로 세므로, 아이가 듣지 못한 선택지 · 답이 다음 턴의 '영어'와 '말했다' 빠짐으로 남습니다(02-2:263). 출력 검사에 걸리는 드문 길이라 Minor 입니다.
- 어떻게: 바꾸기 끝에서 support 를 한 번 더 맞춥니다. choicesBlocked 이고 support 가 choices 이면 none 으로 둡니다. 바꾼 model_line 이 빈 글이고 support 가 model_line 이나 together 이면 none 으로 둡니다. modelLineReplaced 는 1~3단계에서만 참이 됩니다. 4단계부터 model_line 은 늘 빈 글이라 걸릴 글이 없기 때문입니다. 그래서 together 를 none 으로 두어도 4단계부터의 together 를 건드리지 않습니다. 시험 하나: choices 칸에 걸림을 넣은 hits 로 부르면 choices 와 support 가 함께 빈 값입니다. 묶음 8 브리프에 넣거나 컨트롤러가 직접 고칠 수 있는 크기입니다.

### 다듬기(Minor 아래)
- `talk-lesson.ts:1169-1179` 의 정규화 설명 주석(normalizeTalkLesson 의 JSDoc)이 supportOf 의 주석 위에 남았습니다. 그래서 normalizeTalkLesson 에 붙지 않습니다. supportOf 를 그 주석 위로 옮기면 됩니다.
- 시험 이름 '선택지가 검사에 걸려 비면'(`talk-lesson-call.test.ts` N-2 describe 둘째)의 입력은 선택지 하나라서, checkChoices 가 아니라 개수 조건(`talk-lesson.ts:1243`)으로 비는 것입니다. 동작 단언에는 영향이 없습니다.

## 3. 구현자 우려
- 고정부 캐시를 한 번 새로 만드는 것은 문장 변경의 당연한 비용이고, 해가 없습니다.
- `talk-lesson-hints.test.ts:283-285` 가 소리 줄 없는 3단계 `ai: "model_line"` 을 답 예시로 고정하는 것은, 정규화가 그런 move 를 더 만들지 않으면 해가 없다는 판단에 동의합니다. 다만 F-1 의 길에서는 아직 만들 수 있습니다. F-1 을 고치면 이 우려도 닫힙니다.

## 4. 라운드 판정

**Approved(fix 라운드 2/3).** N-1 · N-2 는 닫혔고 Important 는 남지 않았습니다. F-1(Minor)과 다듬기 둘은 '5-다'를 닫는 것을 막지 않습니다. 묶음 8 브리프나 장부에 두거나 컨트롤러가 직접 고치면 됩니다.
