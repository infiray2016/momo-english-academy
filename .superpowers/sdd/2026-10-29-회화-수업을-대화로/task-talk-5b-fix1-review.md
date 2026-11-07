# 재검토 보고: 회화 plan 묶음 '5-나' 앞 차례 fix 1(범위 한정)

검토자는 코드 검토자(Opus · xhigh)이고, 2026-11-05 에 썼습니다. 읽기 전용으로 검토했고, 파일 경로는 워크트리 `.claude/worktrees/p13d` 기준입니다. 단위 시험은 다시 돌리지 않았습니다. 구현 보고의 관문 결과(tsc 0 · 단위 1711 통과 · seed:validate 0)는 보고의 주장으로만 받았습니다.

**판정: Approved.** 지난 지적 다섯(I-1 · M-1~M-4)은 모두 ADDRESSED 입니다. 새 지적은 Minor 둘입니다. 그중 N-1 은 이번 M-1 고침이 새로 만든 어긋남이라 다음 차례에 함께 고치길 권합니다.

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 한국어 설명의 단계 경계 상수 | ADDRESSED(hints.ts 몫) | 대문자 상수 둘이 사라졌습니다. `src/core/conversation/hints.ts:245-251` 은 `spec.koExplainFromStuck` 을 읽고 `stuckInSlot >= from` 으로 판정합니다. 스키마 칸은 `src/core/seed/schema/reference.ts:285-290` 에 있고, 실시드 회화 12행은 1~4단계 1 · 5~12단계 2 이며 koMeaning 바로 뒤에 있습니다(`seed/level-specs.json`, 직접 셈). fix 1 이 바꾼 파일 넷(hints.ts · wrap-up.ts · reference-index.ts · reference.ts)에 단계 비교 숫자는 남지 않았습니다(grep). C195(`specs/10-결정-기록.md:365`)와 정본 반영(`specs/02-2-세션과-단계표.md:339`)이 같은 값입니다. |
| I-1 의 고정부 몫 | 열린 채로 넘김(할 것 3) | `src/core/ai/calls/talk-lesson.ts:681` 의 'from the first stuck at levels 1-4 and from the second stuck from level 5' 는 그대로이고, `TalkLessonSpecView`(`talk-lesson.ts:85`)에는 아직 이 칸이 없습니다. 지난 보고의 (가)가 '할 것 3 차례에 함께'를 권했고, 묶음 6 파일을 건드리지 말라는 브리프 보정(`task-talk-5b.md:23`)에도 맞습니다. 할 것 3 브리프에 'Pick 에 koExplainFromStuck 을 넣고 681줄 문장을 그 칸에서 만든다'를 적어야 C195 가 닫힙니다. |
| M-1 4단계부터 AI 가 말로 준 답 | ADDRESSED · 새 어긋남 N-1 | `hints.ts:280-282` 가 stage 1 · stage 3 · 들리지 않음이면 답 예시로 봅니다. 고정부 `talk-lesson.ts:725` 가 4단계부터 그 세 차례에 답을 말하라고 지시하므로 4단계부터는 맞습니다. 1~3단계 카드 자리에서는 N-1 이 생깁니다. |
| M-2 정리 따라 말하기의 뜻 | ADDRESSED | `src/core/conversation/wrap-up.ts:164-170` 은 모든 줄에 뜻이 있을 때만 이어 붙입니다. 시험 `tests/unit/talk-lesson-wrap.test.ts:20-33` 이 섞인 경우(뜻 없음)와 모두 있는 경우(이어 붙임)를 둘 다 단언합니다. |
| M-3 힌트 단계 규격 형 | ADDRESSED | `hints.ts:179-182` 가 `Pick<TalkLevelSpec, "band" \| "hintTiers" \| "usablePhrases">` 입니다. 쓰지 않게 된 가져오기도 지웠습니다(`hints.ts:3-16`). 힌트 시험은 실시드 행을 읽습니다(`tests/unit/talk-lesson-hints.test.ts:36-50`). |
| M-4 (1) AI 출력과 관계없이 | ADDRESSED | `talk-lesson-hints.test.ts:92-106` 이 AI 뜻 단을 함께 넘기고, 첫 단이 카드 영어 틀인지 봅니다. |
| M-4 (2) '말했다'가 아님 | ADDRESSED | 같은 파일 `:307-323` 이 saidWordsOf 를 불러 빈 목록을 봅니다. saidWordsOf 는 힌트 종류가 '영어'일 때만 곧바로 빈 목록을 내고(`src/core/conversation/said.ts:83`), lemmaOf 가 없으면 소문자 낱말로 대신하므로(`said.ts:88`) 빈 목록은 힌트 종류 때문입니다. |
| M-4 (3) 8단계 두 번 누름 | ADDRESSED | `talk-lesson-hints.test.ts:130-144` 가 8단계 다시 묻는 턴의 단 차례(ko · frame)와 두 번 누른 뒤 열린 단을 봅니다. |
| M-4 (4) AC-15e 표지 | ADDRESSED | `talk-lesson-wrap.test.ts:59` 이름에서 AC-15e 를 뗐습니다. |

## 2. 구현자의 판단(칸을 선택으로 두고 규격 정합 검사가 필수로 보게 함)

**받아들입니다.** 근거는 셋입니다.
- 옛 흐름과 새 흐름이 같은 엄격 스키마로 행을 읽습니다. 옛 흐름은 `src/server/conversation/state.ts:758`, 새 흐름은 `state.ts:1480` 에서 `TalkLevelSpecSchema.parse` 를 부릅니다. 칸을 필수로 두면 개발 DB 의 옛 판 행에서 옛 흐름이 parse 오류로 던집니다. 구현자의 설명이 코드와 맞습니다.
- 같은 꼴의 앞선 예가 있습니다. `choices` 도 스키마에서는 선택이고(`reference.ts:277-278`), 규격 정합 검사가 시드 파일 행에서 필수로 봅니다(`src/core/seed/reference-index.ts:434`). 새 칸도 같은 자리에서 막습니다(`reference-index.ts:436-437`). 시험 `tests/unit/seed-validator-talk.test.ts:878-895` 는 칸 하나만 빼도 거부 한 건이 나오고 메시지에 그 이름이 드는지 봅니다.
- 기본값을 두는 길은 맞지 않습니다. 기본값을 두면 C195 가 없앤 단계 경계가 코드로 돌아옵니다.

다만 이 길에는 빈틈이 하나 있습니다. 규격 정합 검사는 시드 파일만 보고 DB 행은 보지 않습니다. 그래서 새 흐름이 칸 없는 행을 받으면 순수 함수 안에서 처음 드러납니다. 더 나은 마무리는 N-2 에 적었습니다.

## 3. 칸이 없는 행에서 던지는 것이 옛 꼴 갈래를 깨는지

**깨지 않습니다.**
- koExplanationShownOf 를 부르는 곳은 지금 시험뿐입니다(`src`·`tests` 전체 grep). 서버 턴 길(묶음 8)이 아직 잇지 않았습니다.
- 옛 꼴 갈래 함수(hintTiersOf · openedTierCount · hintKindOf · heardHelpOf · againLineOf)는 이 함수를 부르지 않습니다.
- 옛 흐름은 선택 칸 스키마로 읽고, `talkSpecV1Of`(`src/core/seed/schema/talk.ts:296-330`)는 나머지 칸을 펼쳐 넘길 뿐 다시 검사하지 않습니다. 따라서 새 칸이 든 행이 와도, 칸이 없는 행이 와도 옛 흐름은 그대로 돕니다.
- 던지는 자리는 cause 판정보다 앞입니다(`hints.ts:245-250`). 그래서 묶음 8 이 이 함수를 이으면, 칸 없는 행이 걸린 세션은 막힘 차례만이 아니라 매 턴 던집니다. 숨지 않는 오류라 이 자체는 맞지만, 아이 턴 가운데서 터지지 않게 N-2 처럼 읽는 자리에서 한 번 막는 편이 낫습니다.

## 4. 새 지적

### Minor

**N-1. 1~3단계에서 답 소리 줄 없이 닫은 카드 자리 차례를 '답을 들었다'로 봅니다(M-1 고침이 만든 어긋남).**
- 무엇: `hints.ts:280-282` 의 계획 사실(stage 1 · stage 3 · 들리지 않음)은 move.kind 와 단계 구간을 가리지 않습니다. 그런데 1~3단계 닫기에서 그 자리의 답 예시가 비면, 카드 자리 차례가 stage 3 · app 빈 목록 · 소리 줄 없음으로 남습니다. 받침 셋째 닫기는 `src/core/conversation/lesson-flow.ts:798-805`, 들리지 않음 닫기는 `lesson-flow.ts:825-832`, 인사 닫기는 `lesson-flow.ts:686-697` 입니다. 고정부는 이 차례에 '앱이 답을 들려주니 짧은 반응만 쓰라'고 지시합니다(`talk-lesson.ts:712`). 그래서 아이는 답을 듣지 않았습니다.
- 답 예시가 비는 때: AI 질문 자리의 답 예시는 회화 턴 출력 `next_answer_example`(`talk-lesson.ts:563-565`, 빈 글자를 막지 않는 string)에서 오고, 빈 글자는 null 로 바뀝니다(`lesson-flow.ts:189`). 드문 길이지만 생길 수 있습니다.
- 왜: 정본 02-2:263 은 '답 예시 · 같이 말하기의 답을 들은 뒤의 턴'만 힌트 종류를 '영어'로 둡니다. 이 차례 뒤의 아이 턴은 '영어'로 기록되고, 그 턴의 단원 단어는 '말했다'에서 빠집니다(`said.ts:83`). 회화 단원 통과의 '말함 80%'에 드는 기록이 한 턴 모자라게 남습니다. fix 1 앞에서는 app · sound 만 보아 이 차례를 들은 도움 없음으로 봤습니다.
- 어떻게: 계획 사실은 `move.kind === "ai"` 일 때만 씁니다. 4단계부터의 받침 · 닫기 · 들리지 않음 계획은 모두 AI 차례이므로(`lesson-flow.ts:796 · 822` 와 받침 첫째 · 둘째의 aiPlan) M-1 의 뜻은 그대로입니다. 1~3단계 카드 자리는 서버가 붙인 app · sound 가 사실 기록입니다. 시험 하나를 더합니다: `talkMoveOf({ kind: "card_slot", stage: 3, cause: "stuck", app: [] })` 은 빈 목록입니다.

**N-2. 새 흐름이 단계 규격 행을 읽는 자리에서 새 꼴 칸을 한 번 막으면 순수 함수의 던짐이 필요 없어집니다(묶음 8 · 12 몫).**
- 무엇: 지금은 칸이 없는 DB 행이 `hints.ts:245-249` 에서 처음 드러납니다. 새 흐름의 읽는 자리(`state.ts:1472-1480`)는 `session.seedRevision ?? lessonRow.revision` 으로 개정을 고르므로, 새 꼴 카드가 칸 없는 옛 개정 규격 행과 짝지어지는 경우를 코드가 막지 않습니다.
- 어떻게: 새 흐름만 `TalkLevelSpecSchema.required({ choices: true, koExplainFromStuck: true })` 같은 좁힌 스키마로 읽습니다. 그러면 세션을 읽을 때 오류가 나고, 형에서 칸이 필수가 되어 hints.ts 의 던짐을 지울 수 있습니다. state.ts 는 묶음 7 의 파일이라 이번 범위가 아닙니다. 묶음 8 브리프에 넣거나, 옛 흐름을 걷는 묶음 12 에서 공용 스키마의 두 칸을 필수로 바꾸고 twoAnswers 를 지우길 권합니다.

### 시험 손질(Minor 아래, 고치지 않아도 됨)
- `talk-lesson-hints.test.ts:202-205` 의 반복문은 REAL 이 비거나 단계가 빠지면 그만큼 단언 없이 지납니다. 바로 아래 `specAt(3)` 이 0행은 잡지만, 일부 단계가 빠진 것은 잡지 못합니다. `expect(REAL.map((s) => s.level)).toEqual([1, …, 12])` 한 줄이면 이름의 '12행'과 맞습니다.

## 5. diff 만으로 확인하지 못한 것

- ⚠️ 실시드 `seed/level-specs.json` 에서 '칸 말고는 그대로'인지는 보지 못했습니다. 보고가 말한 고치기 전 사본(`level-specs.before-5b-fix1.json`)을 스크래치패드와 sdd 폴더에서 찾지 못했고, HEAD 대비 diff 는 묶음 3 의 새 꼴 변경과 섞여 있습니다. 칸 값과 자리는 직접 확인했습니다.
- ⚠️ '회화 단계 규격 revision 3 은 개발 DB 에 적재 전'은 diff 로 확인할 수 없습니다. 이미 칸 없이 적재했다면 같은 개정의 내용이 바뀐 것이 되므로, 적재할 때 seed:load 가 이를 어떻게 다루는지 컨트롤러가 확인해야 합니다.

## 6. 범위 밖 관찰

- 칸 값이 막힘 상한 `talk.dontknow_max`(지금 3, 결정 먼저 바꾸는 키 · `seed/settings.json:83`)보다 크면 설명이 한 번도 나오지 않습니다. 지금 값으로는 어긋날 일이 없어 지적하지 않습니다. 상한을 바꾸는 결정 때 함께 볼 관계입니다.
- `seed-validator-talk.test.ts:846` 은 견본(builders)의 칸 값을 견본 자신의 식으로 다시 봅니다. 실시드 값은 힌트 시험이 고정하므로 문제는 없습니다.

## 7. 라운드 판정

**Approved(fix 1 라운드).** 지난 지적 다섯은 모두 ADDRESSED 입니다. 남는 것은 셋입니다. I-1 의 고정부 몫(`talk-lesson.ts:681` · `TalkLessonSpecView`)은 할 것 3 브리프에 넣습니다. N-1 은 같은 차례에 넣거나 컨트롤러가 직접 고칩니다(두 줄과 시험 하나). N-2 는 묶음 8 또는 12 의 브리프 몫입니다.
