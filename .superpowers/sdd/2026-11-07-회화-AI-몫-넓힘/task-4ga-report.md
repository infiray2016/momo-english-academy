# 묶음 4-가 보고: 실호출 대본 일곱 · 대본 도구 선택 칸

상태: DONE_WITH_CONCERNS · 구현자 Opus high · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`(머리 6e86881, 커밋 없음) · 실호출(`--yes`) 안 함

## 바뀐 파일

| 파일 | 바뀜 |
|---|---|
| `tests/fixtures/talk-observe/l3-greet-fine.json` · `l3-greet-tired.json` · `l3-greet-more.json` | 신규. 인사 답이 다른 셋이다(I am fine. · I am tired. · I am happy! I play soccer today.). 차례 4개씩 둔다 |
| `tests/fixtures/talk-observe/l3-scene-yes.json` · `l3-scene-no.json` · `l3-scene-other.json` | 신규. 대화 첫 질문에 Yes! · No. · I have a cat. 으로 답하는 셋이다. 차례 6개씩 둔다 |
| `tests/fixtures/talk-observe/l3-second-session.json` | 신규. 칸 `summaries` 에 지난 대화 요약 한 줄(한국어, 이름 없음)을 두고, 칸 `settings` 를 `{"talk.greeting_recall": "on"}` 으로 둔다. 차례는 8개다 |
| `scripts/talk-observe.ts` | 선택 칸을 더했다(아래 표) |
| `tests/unit/talk-observe.test.ts` | 기존 시험 넷의 기대값을 새 꼴로 고치고 새 시험 열여섯을 더했다 |

새 대본은 모두 3단계 단원 1 수업 1 · 선생님 미나이다. 차례마다 `say` 와 `expect`(지금 판정 칸 그대로)를 두고, `note` 에 AC-2 (다) · (라) · AC-5 (다)의 사람 판정 대상을 적었다. 영어 `design` 칸은 두지 않았다. 그 칸이 "예 뒤 · 아니요 뒤" 고정 대본처럼 읽히지 않게 하려는 것이다(spec 설계 5 '고정 대본 막기').

## 도구 선택 칸(`scripts/talk-observe.ts`)

| 칸 | 줄 | 동작 |
|---|---|---|
| `--rounds <n>` | 222 · 2838 | 1 이상의 정수만 받는다. 한 바퀴에 대본 전부를 돌리고 그만큼 되풀이한다. 실행 보고 `RunReport.round` 가 1부터 센다 |
| `--set <키>=<값>`(여럿 가능) | 183 · 200 · 208 | 키 꼴을 검사하고, 값은 true · false · 십진 수 · 글로 읽는다. 같은 키가 둘이면 뒤의 것을 쓴다. 메모리에서만 덮는다 |
| 대본 칸 `settings` · `summaries` | 350 · 352 | `settings` 는 그 대본에만 닿는다. `summaries` 는 `talk.memory_summaries` 줄 수까지만 넘긴다(632, 서버의 상한과 같은 키). 그 뒤 `createTalkSim` 이 회화 턴 입력의 요약으로 쓴다(1601) |
| 덮는 차례 | 590 `runValuesOf` | 설정 파일, 대본 칸, `--effort`, `--set` 차례로 덮는다. 계획 · 보고에는 마지막에 이긴 덮음만 적는다. 설정 파일에 없는 키이면 '설정 파일에 없는 키'로 표시한다 |
| `--baseline <json>` 자리 | 222 · 2958 | 파일이 없으면 종료 코드 2다. 계획 끝 줄과 JSON 보고에 경로만 적는다. 견줌은 묶음 4-나의 몫이다 |
| JSON 보고 | 2467 · 2469 · 810 | 맨 위에 `rounds` · `set` · `baseline` 을 둔다. 실행마다 `round` · `systemPrompt`(첫 턴 요청 전문) · `overrides` · `summaries` 를 적는다. 차례마다 `techError` 를 적는다 |
| 기술 오류 자리 | 749 · 780 · 2532 | `{ nospeech, call }` 꼴이다. `call` 은 failed · refusal · unreadable · retry_failed 가운데 하나다. 정상 차례는 null 이다. 표시 칸에 '기술 오류 자리(…)'를 쓰고, 합계 표에 '들리지 않음 · 호출' 수를 쓴다 |
| 미리 보기 | 2406 `planLines` | 대본마다 한 바퀴 값을 쓰고, 요약 줄 수와 덮는 설정을 붙인다. 합계는 바퀴 수를 곱한 값과 한 바퀴 값을 함께 쓴다 |

core · server · package.json · 설정 시드는 건드리지 않았다. 도구는 6e86881 의 core 에 있는 것만 가져오므로 기준 워크트리에 도구 파일과 대본만 복사해 돌릴 수 있다. 정한 것 9 와 맞는다.

## 예상 호출 · 비용(`--yes` 없이, 출력은 스크래치패드)

| 명령 | 대본 | 예상 호출 | 예상 비용 | 재질문 최대 |
|---|---|---|---|---|
| `pnpm talk:observe` | 13(돌릴 것 12, l4 는 카드 시드 없음으로 건너뜀) | 77 | 약 1.44달러 | +56회 · 약 1.09달러 |
| `pnpm talk:observe --level 3 --rounds 2` | 12 × 2바퀴 | 154(한 바퀴 77) | 약 2.87달러 | +112회 · 약 2.19달러 |
| `pnpm talk:observe --script l3-second-session --set talk.greeting_recall=off` | 1 | 8 | 약 0.15달러 | +7회 · 약 0.14달러 |

출력 파일: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-4ga-plan-all.txt` · `ai-scope-4ga-plan-l3-r2.txt` · `ai-scope-4ga-plan-second-off.txt`(같은 폴더). 비용은 캐시 할인을 빼고 셈한 위쪽 어림이다.

## 덮는 시험(`tests/unit/talk-observe.test.ts`)

- parseArgs: 기본값(한 바퀴 · 덮는 설정 없음 · 기준선 없음) · '--rounds · 여러 --set(나중 것이 이김) · --baseline 을 읽는다' · '--set 값 글은 참거짓 · 수 · 글로 읽는다' · 거부(--rounds 0 · 1.5, = 없음 · 빈 값 · 빈 키 · 대문자 키, --baseline 값 없음)
- 대본: '대본 열셋: 3단계 열둘 …' · '새 일곱은 3단계 단원 1 수업 1 · 미나이고 차례마다 기대 칸이 있다' · '인사 대본 셋은 첫 아이 말이 서로 다르고, 장면 대본 셋은 둘째 아이 말이 예 · 아니요 · 딴 말이다' · '둘째 세션 대본만 …' · '대본 칸 settings 는 설정 키 꼴 · 글 · 수 · 참거짓만 …'
- 계획 · 값: '바퀴 수만큼 합계 호출 · 비용을 곱하고 …' · '설정값은 설정 파일 → 대본 칸 → --effort → --set 차례로 덮고 …' · '지난 대화 요약은 talk.memory_summaries 줄까지 넘긴다'
- 메모리 대화: '대본 summaries 는 회화 턴 입력의 지난 대화 요약으로 들어가고 시스템 프롬프트에 실린다' · 기술 오류 자리 시험 셋(들리지 않음 · 네 갈래 · 호출 실패 차례)
- 보고 · 실행: '바퀴 · 덮은 설정 · 넘긴 요약 · 기술 오류 자리 합계를 쓴다' · '--yes 없이 3단계는 대본 열둘 · 예상 호출 · 비용을 내고 부르지 않는다' · '--yes 는 바퀴마다 대본을 돌리고 JSON 보고에 …를 적는다'(가짜 흘려 받기 클라이언트를 써서 네트워크 없이 돈다)

## 실행 명령 · 결과

명령은 모두 `( cd <p13d> && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && … )` 서브셸에서 돌렸다.

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-observe.test.ts` | 53 통과(`ai-scope-4ga-unit.txt`) |
| `pnpm biome ci .` | 0(616 파일) |
| `npx tsc --noEmit -p .` | 0 |
| `pnpm test` | 파일 156 · 시험 2029 통과 · todo 6(`ai-scope-4ga-unit-all.txt`, 0-가 · 0-나 의 그 시점 작업 트리를 포함) |

## 설계와 다르게 한 것 · 남은 우려

1. **한 바퀴 호출 수가 spec 어림보다 적다.** spec 설계 7 · 8 은 한 바퀴를 약 110호출로 어림했지만, 지금은 본 호출 77에 재질문이 최대 56회다. 새 대본을 '짧은 대본'으로 읽어 인사 셋은 차례 4개, 장면 셋은 6개, 둘째 세션은 8개로 두었다. 둘째 세션 끔 바퀴는 spec 의 '약 8호출'과 같다. 비용 어림(약 1.44달러)은 spec 의 1.5달러와 거의 같다. 판정 표본을 늘려야 하면 대본에 차례를 더하면 된다. 이 경우 도구는 고치지 않아도 된다.
2. **`--level` 이 없으면 대본이 열셋으로 나온다.** l4-word-answers 는 카드 시드가 없어 건너뛰므로 실제로 도는 것은 열둘이다. plan 작업 순서 5 · 11 의 명령은 `--level 3` 을 쓰므로 그대로 열둘이다. l4 대본은 지우지 않았다.
3. **기준선 워크트리(6e86881)에는 `talk.greeting_recall` 키가 없다.** 그래서 둘째 세션 대본의 덮음은 '설정 파일에 없는 키'로 표시되고 효과가 없다. 요약 줄은 그대로 넘어간다. 고침 전 코드에 그 키를 읽는 곳이 없기 때문이며, 의도한 기준선이다.
4. **장면 대본은 고침 전에 첫 필수 질문을 받는다.** 그 질문은 'Rice and fish for lunch! What do you do at the table?'이고, 아이는 여기에 Yes! · No. 로 답하게 된다. plan 작업 순서 5 가 적은 대로 '장면 여는 질문 뒤' 지표의 기준선은 없다. 대본의 아이 말은 장면 여는 질문의 꼴(예 · 아니요 질문)을 미리 알 수 없어서 일반적인 말로 두었다. 묶음 3 의 표본 번호가 정해진 뒤 어색하면 아이 말 한두 줄만 고치면 된다.
5. **기술 오류 자리의 `retry_failed` 갈래.** 첫 시도는 읽었지만 재질문 호출이 실패하거나 읽히지 않아 앱이 카드 자리를 쓴 차례도 기술 오류 자리로 셌다. spec 의 '호출 실패 · 거절로 … 카드 글을 쓴 차례'를 넓게 읽은 것이다. 묶음 4-나 가 이 갈래를 뺄지 정하면 된다.
6. **요청하는 변경은 없다.** 공용 파일 · 설계를 바꿀 일은 없다. 명령 `talk:metrics` 는 묶음 4-나 의 몫이라 package.json 은 그대로 두었다.
