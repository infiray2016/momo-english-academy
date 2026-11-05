# 범위 한정 재검토: 회화 턴 프롬프트 · 흐름 규칙 고침 2 fix round 1(검토자 Opus · xhigh, 2026-11-06)

**라운드 판정: Approved.** Important A~E 는 모두 ADDRESSED 이고 Critical C-0(규격 크기)은 코드로 닫혔다. 남은 것은 Minor 와 실호출 확인 하나다. 3회차 대본의 첫 호출이 400 없이 지나는지 컨트롤러가 본다.

읽는 법. 지난 보고는 `task-prompt-2-review.md` 이다. 줄 번호는 워크트리 `.claude/worktrees/p13d` 의 지금 파일이다. fix 변경만 떼어 보려고 첫 검토 때 떠 둔 사본과 지금 워크트리를 견줬다(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/prompt2-review/fix1-src.diff`). 변이와 탐침은 같은 폴더의 `mut3/` 사본에서 돌렸다. 워크트리는 고치지 않았고 실호출도 하지 않았다. 사본에서 회화 시험 일곱 파일 186건이 지났다.

## 1 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| A 다시 쓴 턴의 아이 말 칸 | ADDRESSED | `question-retry.ts:163-170`: whole 이면 child_kind · stuck 만 앞 응답(앱이 정한 값)에서, 나머지는 다시 쓴 응답에서 가져온다. 변이(늘 앞 응답 칸)를 시험이 잡는다 |
| B 다시 쓰기 실패 뒤 질문 없는 차례 | ADDRESSED | `lesson-turn.ts:1448-1466`(앞 응답 문장 모두 지움 · needsQuestion), settle `1049-1054`(why fail → 카드 자리). 탐침: 남은 기회가 있으면 release [] · card_slot · 질문 줄 하나. 변이 둘(needsQuestion 끔 · 앞 문장 잡아 둠)을 잡는다. 남은 기회가 없는 드문 턴은 2절 N-1 |
| C 잡아 두기 배선 시험 | ADDRESSED(조건) | `child-kind.ts:119-146` createRewriteHold 가 무름 · 보낸 문장 0 · 1~3단계 · 범위 · 질문 차례를 시도마다 덮어쓴다. 변이(질문 차례 조건 뺌)를 잡는다. 다만 서버가 hold.onStuck 을 부르지 않게 하는 배선 변이는 186건 모두 지난다(구현자도 밝힘). 2절 N-2 로 낮춘다 |
| D 앱 안전망 | ADDRESSED | `child-kind.ts:109`: 영어 낱말 셋 이상 · 모름 아님이면 갈래와 관계없이 막힘이 아니다. 두 낱말은 갈래가 정한다. 변이(셋 이상 줄 뺌)를 잡는다. 맞바꿈 한 줄은 C204 몫(Minor 10) |
| E 카드 답 뒤 되돌림 셈 | ADDRESSED | `talk-lesson.ts:1414` 카드 항목 유지, `lesson-flow.ts:334-338` 카드 항목이 있는 차례는 이어 묻기로 세지 않는다. 변이(카드 항목 조건 뺌)를 잡는다. dropCardItem 이 늘 거짓이라 `talk-lesson.ts:1593` 의 삼항은 죽은 갈래다(정리 몫) |
| Minor 1 · 2 · 3 · 8 | ADDRESSED | `talk-lesson.ts:789` · `534` · `815` · `773` 문장 |
| Minor 5 · 6 | ADDRESSED | C 와 함께(질문 차례만 · 시도마다 덮어씀) |
| Minor 4 · 7 | 남김(동의) | 3회차에서 빈 설명 빈도 · 다시 쓰기 턴 첫 문장 시간을 잰다 |
| Minor 9 | **철회** | 내 지적이 틀렸다. 회화 턴 입력 칸의 값은 speech · dont_know 다(`src/core/conversation/lesson-turns.ts:25` TALK_INPUT_MODES). speech · button · nospeech 는 흐름 쪽 까닭이다 |
| Minor 10 | 아직 열림 | C204 에 '셋 · 둘은 설계 숫자 아님'과 맞바꿈 한 줄이 아직 없다(컨트롤러 몫) |
| C-0 규격 크기 | ADDRESSED(코드) | 아래 3절 (1). 지금 보낼 꼴을 그대로 실호출로 확인하는 일만 남았다 |
| F 계약 · 관찰 명령의 withFormat | ADDRESSED | `scripts/ai-contract.ts:243-262` 가 같은 펼치기를 거친다(ai:observe · talk:observe 도 씀). 회화 밖 여섯 목적의 펼친 꼴은 구현자 탐침에서 모두 받아졌다(보고 '확인 둘' (2)) |
| Minor 11 글자 상한 | 아직 열림 | 지금 보낼 꼴은 모든 단계에서 5,799자다. 탐침으로 받은 5,785자보다 14자 길고(child_kind 설명에 '한국어만'을 더함), 상한은 6000 이다 |
| Minor 12 run.ts 주석 자리 | NOT ADDRESSED | `run.ts:274-282` 에 runAiCall 의 주석과 aiOutputFormatOf 의 주석이 겹쳐 있다 |
| Minor 13 흘려 받기 갈래 글자 | NOT ADDRESSED | `stream.ts:154` 가 [a-z_] 만 받는다 |
| G 재호출 실패 통합 사례 | 아직 열림 | 통합 시험에 C203 재호출 실패 길을 지나는 사례가 아직 없다 |

## 2 새로 깨뜨린 것 · 남은 빈틈

| # | 심각도 | 무엇이 · 왜 | 어떻게 |
|---|---|---|---|
| N-1 | Minor | **B 의 대체 길은 남은 카드 기회가 없으면 빈 차례가 된다**(구현자 우려 (1)). 탐침: 필수 질문 · 더 이야기할 거리가 없는 카드로 settle 하면 release [] · 계획 ai · 붙임 줄 없음이다. 아이는 'I have a dog.' 에 선생님 말을 하나도 듣지 못한다. lessonCardSlotOf(`lesson-turn.ts`)는 남은 기회가 없으면 대신 질문(oldestMoreOf — 같은 질문 상한 2 안의 더 이야기할 거리)으로 메우므로, 빈 차례가 되려면 세 조건이 겹쳐야 한다: 다시 쓰기 실패, 남은 기회 없음, 대신 질문도 없음. 대화 끝 무렵에만 닿는 드문 턴이다 | 그때만 카드 안전한 대사(lessonSafeLineOf)를 반응 줄로 남긴다. 대체 값을 'line' 결과로 돌리면, 있는 'line' 길이 카드 자리를 찾고 못 찾으면 그 줄을 남긴다 |
| N-2 | Minor | 잡아 두기 배선 세 자리(`lesson-turn.ts` onStuck · onSentence · rewrite)는 단위 시험이 가르지 못한다 | 가짜 AI 로 턴 길을 도는 통합 사례 하나(G 와 함께)에서 '무름 → 아무것도 먼저 나가지 않음 → 다시 쓴 반응 · 질문'을 본다 |

## 3 컨트롤러가 보태 달라고 한 것

1. **응답 규격 펼치기: 맞다.** 보낼 꼴과 앱 Zod 규격은 같은 Zod 객체에서 나와 칸 · 필수 칸 · 차례가 같다. 열거값은 SDK 도우미가 설명 글로 옮겨 보내고, 앱은 엄격 Zod 로 검증하며 실패하면 느슨한 규격으로 정규화한다(`talk.ts:693-700`). 사본에서 새 시험 25건(울타리 10 · 전 목적 훑기 15)이 지났다. 펼치기를 빼는 변이는 회화 길 16건 · 그 밖 7건으로 잡혔다. 모든 단계의 보낼 꼴은 30칸 · 5,799자 · $ref 0 이다. 남은 것은 Minor 11(상한이 탐침 값보다 큼)이다.
2. **CI 통합 원인 고침: 맞다.** `turn.ts:64-73` 의 turnSettings 가, 턴 길이 설정 묶음에서 읽는 키를 모두 덮는다. 그 키는 talk.safety_max_turns(`lesson-turn.ts:1854`) · talk.safety_alert_count(`1880`) · talk.memory_summaries(`1980`) · talk.friendship_per_talk · talk.friendship_max(`2222-2223`) · ai.timeout_seconds.realtime(`1723`) · talk.teacher_sentences_max.<구간>(`2162`)이다. 구간 넷 키는 BAND_NAMES 로 만들고, teacherSentencesMaxOf 는 같은 bandKey 를 읽는다. 시험은 1 · 3 · 4 · 7 · 10단계를 본다. 다만 단위 시험이 시험용 설정 전체를 넘겨 빈칸을 못 보던 구조는 그대로다. 턴 길이 새 키를 읽으면 같은 일이 되풀이될 수 있다(넘길 것 1).
3. **구현자 우려 '남은 카드 기회가 없으면 카드 자리가 안 생김': 막다른 턴을 만든다.** 다만 드물다(N-1). 선생님 말이 없는 차례가 되며, 아이는 마이크로 다시 말할 수 있어 대화가 멈추지는 않는다.

## 4 넘길 것

1. 턴 길 설정 빈칸이 단위 시험에 보이지 않는 구조. 턴 길 전체를 turnSettings 키만 담은 설정으로 도는 단위 시험이 하나 있으면, 다음 새 키에서도 막힌다.
2. 3회차 대본 첫 호출로 지금 보낼 꼴(5,799자)이 받아지는지 확인하고, 그 크기를 상한 주석에 적는다(Minor 11).
3. 지난 보고 6절의 넘길 것 1~5(예에 없는 입력으로 막힘 판정, 4단계 무름, 관찰 도구 셈, 1-나 쉬는 중 판정의 question_retry 행)는 그대로다.
