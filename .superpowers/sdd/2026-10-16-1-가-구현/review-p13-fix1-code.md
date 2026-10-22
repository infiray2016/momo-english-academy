# 재검토: P13a 차례 1 + 3 fix 1 — 코드(rev-p13 · code-reviewer · Opus · xhigh, 2026-10-22 17:4x, 범위 한정)

**라운드 판정: Approved — 지적 여덟(I1 · I2 · M1~M6) 모두 ADDRESSED. 새 지적은 Minor 셋(N1~N3, fix 자리)이고 Critical · Important 는 없다.**

대상: 워크트리 p13 작업 트리(차례 1 · 3 + fix 1). 근거: fix 브리프 `task-p13-fix1.md`, 구현 보고 'fix round 1' 절 · 고친 요청 2, 13절 C99 · C100(본 저장소 `specs/10-결정-기록.md:249-250`).
확인 방법: 바뀐 자리를 코드로 읽었다. 첫 검토 재현 스크립트를 새 칸 꼴(aiQuestion · moreChosen)로 고쳐 다시 돌렸다(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/p13rev/probe-fix1.mts`, tsx). `pnpm spec:trace` 도 돌렸다(exit 0). 단위 시험은 다시 돌리지 않았다(CI 2차가 돈다).

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I1 만남 찾기 동음이의어(C99) | ADDRESSED | `metWordsIn` 이 동음이의어를 받지 않고 빈 묶음으로 찾는다(`src/core/conversation/said.ts:96-104`). 시험 '회화 만남: … 동음이의어는 맞추지 않는다(C99)'(`tests/unit/conversation-said.test.ts:131-140`)이 "I see it too. I want to go." → `["go"]` 를 단언하고 같은 시험에서 `saidWordsOf(["two"], "to dogs")` → `["two"]` 도 본다. `saidWordsOf` 는 그대로다(`said.ts:73-94`). 재현: 첫 검토 문장 "Hi! Can I see it? …" → 만남 `[]`, '말했다' 'to dogs' → `two` |
| I2 4~12단계 고르기(권함 가) | ADDRESSED | 커서 `choicePending` 을 목표 턴 · 바퀴 끝 아이 행에서 세우고(`flow.ts:632-641`) 다음 아이 행(`:621`)이나 `moreChosen` 토리 행(`:597`)에서만 내린다. `awaitingChoice = targetReached && choicePending`(`:696`). 시험 '4단계부터 목표 턴과 더 이야기하기 한 바퀴 끝에서도 …'(`tests/unit/conversation-flow.test.ts:643-694`)이 AI 가 제 말로 묻는 토리 행 · 두 바퀴를 본다. 재현(4단계, 토리 행 `moreChosen: false`): 목표 턴 뒤 `awaitingChoice true · pending null`, 고름 1 · 2 뒤 `card_question 2 · 3`, 바퀴 끝마다 다시 `awaitingChoice true`. 단, 목표 턴이 끊긴 턴이면 새 N1 |
| M1 목표 턴 전 AI 자리(C100) | ADDRESSED | `TalkTurn.aiQuestionSlot`(`talk.ts:106-110`) · 사용자 메시지 늘 넣는 줄 `AI question slot: yes|no`(`:460`) · 정규화 조건 `turnsShape && turn.aiQuestionSlot`(`:633`) · 1~3단계 고정부(`:360`). 흐름 판정 `nextQuestionIsAi`(`flow.ts:742-762`). 시험 '목표 턴 전 대화 토막의 AI 자리에서도 next_question_en 이 남는다(C100)'(`conversation-call.test.ts:509-532`)이 토막 talk 에서 질문이 남고 '더 이야기하기' 토막이라도 자리가 아니면 비는 것을 본다. 관찰: 응답 규격의 칸 설명은 아직 'only when the more-talk material is used up'이다(`talk.ts:248`). 정규화가 거르므로 아이 화면에는 영향이 없다. 고정부와 같은 말로 맞추면 좋다 |
| M2 아이 행 targets | ADDRESSED | `onChild` 첫머리에서 `row.targets` 를 `cur.asked` 에 더한다(`flow.ts:622-623`). 시험 '4단계부터 이어 묻는 질문이 노린 단어를 뒤 카드 질문이 노리면 다시 묻는 턴이다'(`conversation-flow.test.ts:696-725`)가 같은 행을 targets 유무로 갈라 re_ask · first 를 단언한다 |
| M3 1~3단계 AI 질문 '모름' 재료 | ADDRESSED(꼴) | 토리 행 칸 `aiQuestion: AiQuestionLite | null`(`flow.ts:274-294`)을 `withAiQuestion` 이 AI 자리 질문에 채운다(`:571-589` · `:606-607`). 시험 '1~3단계 AI 질문에 모름이면 …'(`conversation-flow.test.ts:727-769`)이 답 예시 + 같은 질문 · 실린 힌트 단을 본다. 칸을 b 가 무엇에서 채우는지는 새 N3 |
| M4 통합 증명 이름 | ADDRESSED | 단위 시험 이름을 '회화 턴: 첫 문장 뒤 실패(거절 · max_tokens · 타임아웃 · 연결 · 서버)는 다시 부르지 않고 그 턴을 닫는다'로 바꿨다(`conversation-stream.test.ts:301`). 브리프 (5)에 대한 답은 아래 3절 |
| M5 잘한 말 단계 조건 | ADDRESSED | 두 칸을 같은 조건(`level >= feedbackFromLevel`, 아니면 0)으로 본다(`talk.ts:701-706`). 시험 '엄격 검증은 잘한 말도 …'(`conversation-call.test.ts:534-551`)이 4단계 '넘는다' · 5단계 '안 넘는다'를 본다 |
| M6 대화 첫 질문 1번 | ADDRESSED | 4단계부터 대화 토막에 들어갈 때 `FIRST_CARD_QUESTION_NO` 를 `usedQuestionNos` 에 넣는다(`flow.ts:531-538`). 시험 '4단계부터 대화 첫 질문(카드 1번)은 …'(`conversation-flow.test.ts:613-641`)과 대신 질문 시험(`:532-611`, 인사 끝 토리 행 `cardQuestionNo: 0` → 쓴 번호 `[1, 0, 3, 0]` · 대신 2)이 b 의 1 적기 가정 없이 돈다 |

다르게 한 것(M3 실린 AI 질문의 선택 칸 `hintKo` · `hints`): **받음.** 힌트 단은 여전히 단계 규격 `hintTiers` 차례로만 뽑는다(`hints.ts:28-56`). 그래서 1~2단계는 뜻 → 영어 문장 두 단, 3단계는 뜻 → 영어 틀 → 영어 문장 세 단이다. 3.3 의 힌트 단 규칙(`specs/02-2-세션과-단계표.md:107` · `:148`)과 AI 자리 힌트 꼴(`:131` '1~3단계 꼴의 힌트(한국어 뜻 힌트 · 영어 문장 힌트, 3단계는 영어 틀을 더해)')에 맞는다. 1~2단계에 영어 힌트가 둘 실려 `frameEn` 이 차도 단에 나오지 않는다. 다만 채울 자리는 N3 를 탄다.

## 2. 새 지적(fix 자리만)

**N1(Minor). 4단계부터 목표 턴 · 바퀴 끝 턴이 첫 문장 뒤 끊기면 고르기 대신 카드 질문이 붙고, 요청 2 의 `moreChosen` 유도가 그 행을 '골랐음'으로 읽는다**
- 무엇이: `appendAfter` 의 4단계부터 갈래(`flow.ts:859-866`)는 `after.awaitingChoice` 를 보지 않는다. 그래서 끊긴 턴이면 아직 쓰지 않은 카드 질문을 붙인다. 1~3단계 갈래는 고르기 차례면 'Do you want to talk more?'를 붙인다(`:870-877`). 재현: 4단계 목표 턴의 `after.awaitingChoice true` 인데 `appendAfter(cut)` → `[{ kind: "question", en: "What can you do?" … }]`. 요청 2 는 4단계부터 `moreChosen` 을 'AI 글 줄 뒤에 앱이 붙인 카드 질문 줄이 있음'으로 만들라고 적었다(`task-p13-report.md` 요청 2). 그러면 이 행이 '골랐음'이 되어 고르기를 건너뛴다. 토막은 'talk' 그대로이고 목표 턴을 이미 넘었으므로 그 뒤 고르기 차례가 다시 서지 않는다(`flow.ts:638-640`).
- 왜: 3.3 '목표 턴 수에 닿으면 … 아이는 더 이야기하기 · 그만하기 가운데 고른다'(`02-2:137`). 8절의 끊긴 턴 카드 질문(`07-음성과-오류.md:58`)은 고르기 차례가 아닌 턴의 규칙으로 읽는 것이 맞다. 드문 길(목표 턴 응답이 첫 문장 뒤 끊김)이다. 아이는 '그만하기'로 언제든 나갈 수 있다.
- 어떻게: 4단계부터 갈래도 `after.awaitingChoice` 면 카드 질문 대신 'Do you want to talk more?'(4단계는 뜻 함께)를 붙인다. 요청 2 의 4단계 유도에 '붙인 줄이 `MORE_PROMPT.en` 이면 골랐음이 아님'을 더한다. 4단계 목표 턴 끊김 시험을 하나 더한다.

**N2(Minor). `nextQuestionIsAi` 가 이번 입력을 보지 않아 '모름' 턴에도 AI 자리 '예'를 낸다**
- 무엇이: 가상의 아이 행을 늘 말(speech)로 더한다(`flow.ts:748-760`). 재현: 1단계 AI 자리 질문에서 이 값이 `true` 다. 그런데 실제로 '모름'을 보내면 다음 질문은 같은 AI 질문이다(`after.pending.en` 그대로 · `dontKnowCount 1`). 마지막 '더 이야기할 거리'에 '모름'일 때도 같다.
- 왜: C100 은 '흐름이 AI 자리로 판정한 턴'에서 AI 질문 칸을 채우라는 것이다(`10-결정-기록.md:250`). '모름'(dontknow_max 미만) 턴은 같은 질문을 다시 묻는 턴이다(`02-2:129`). AI 가 쓰지 않을 질문 · 힌트를 써서 출력 토큰이 늘고, b 가 그 질문을 검사하는 일도 헛돈다. 아이 화면은 `appendAfter` 가 실린 질문을 쓰므로 맞다.
- 어떻게: `nextQuestionIsAi` 가 이번 입력을 받아 '모름'이면 '모름' 행을 더해 판정하게 한다(dontknow_max 번째면 다음 질문으로 넘어가므로 그때만 참이 될 수 있다). 막힘(stuck)은 AI 가 정하므로 미리 알 수 없다. 그 경우는 버려지는 질문으로 받는다. 요청 2 의 'aiQuestionSlot 은 nextQuestionIsAi 로'에 입력을 넘기라고 적는다.

**N3(Minor). `aiQuestion` 의 뜻 · 답 예시 · 힌트를 b 가 채울 저장 자리가 없다 — 컨트롤러 판단**
- 무엇이: 요청 2 는 `aiQuestion` 을 '토리 행 원문에 붙인 말에서' 채우라고 적었다. 그러나 5절 talk_turns 에는 토리 말 뜻 · 다음 턴 답 예시 · 힌트를 둘 칸이 없다(`specs/04-데이터.md:35`, `src/db/schema/learning.ts:177-221`). 원문에는 붙인 영어 질문은 있다. 답 예시는 '모름' 뒤에만 붙고, 뜻 힌트 · 영어 힌트는 붙이지 않는다. C89 는 마이그레이션 없음이다. 그래서 b 는 영어 질문만 채울 수 있다. 그러면 '모름' 뒤 답 예시가 빈 채 같은 질문만 붙는다(`flow.ts:820-822`). 힌트 단도 빈다.
- 또: 실린 AI 질문이 있으면 이어 할 때도 흐름이 그 AI 질문을 지금 질문으로 낸다. 회11 (9)는 'AI 질문 턴이었으면 더 이야기할 거리 가운데 가장 오래전에 쓴 것'이다(plan-p13a 회11 (9), C95). b 가 칸을 채우는 순간 C95 와 어긋난다.
- 어떻게(컨트롤러): (가) 실린 AI 질문을 둘 자리를 정한다(jsonb 열 하나를 더하는 13절 줄 · 마이그레이션). 그리고 회11 (9)를 '실린 AI 질문이 있으면 그것'으로 넓힌다. (나) 저장하지 않는다. 그러면 '모름' 뒤에는 영어 질문만 다시 붙이고 힌트는 대신 쓸 거리의 카드 힌트를 쓴다고 정하고, 요청 2 · `AiQuestionLite` 설명을 그에 맞춘다. 드문 길이라 (나)로도 아이 흐름은 끊기지 않는다.

## 3. 브리프 (5) — M4 이름 바꿈 뒤 spec-trace 가 AC-15b 를 '시험 없음'으로 세는지

**세지 않는다.** 이름을 바꾸기 전에도 마찬가지다. spec-trace 는 묶음 plan 하나(`scripts/spec-trace.ts:12` — `intent/…/plan.md`)의 증명 표를 AC 토큰 단위로만 센다. 그런데 묶음 plan 에는 AC-15b 줄이 없다(grep 0). 단위 시험 'AC-15b 흘려 받은 tori_en …'(`conversation-stream.test.ts:195`)도 남아 있어 토큰은 이미 덮인다. 그래서 plan-p13a 증명 표의 AC-15b 통합 이름 일곱을 a2 가 쓰지 않아도 spec-trace 는 초록이다(이번 실행: missing-test 18 은 모두 P11 · P12 몫). a2 검토 브리프에 plan-p13a 증명 표 통합 이름 스물과 시험 이름의 글자 대조(첫 검토에서 쓴 방식)를 넣기를 권한다. 이것은 fix 의 결함이 아니라 관문의 범위다.

## 4. 범위 밖 관찰

- 첫 검토에서 받은 다르게 한 것 열여섯은 fix 로 뜻이 바뀌지 않았다. 다만 11 의 토리 행 칸이 셋에서 넷(cardQuestionNo · moreTalkFallback · aiQuestion · moreChosen)이 됐다. 이 변경은 b 브리프가 이 꼴을 그대로 받으면 된다.

## 5. 장부 판정

| 항목 | 판정 |
|---|---|
| I1 · I2 · M1 · M2 · M4 · M5 · M6 | 닫힘(위 근거) |
| M3 | 닫힘(꼴) — 채울 자리는 N3 로 옮김 |
| N1 · N2 | 새로 열림(Minor) — fix 2 로 몇 줄이면 닫힌다. 아니면 b 브리프에 넣는다 |
| N3 | 새로 열림(Minor, 컨트롤러 판단 — 저장 자리 · 회11 (9)) |
| 구현 보고 정할 것 3(인사 끝 턴의 막힘) | 아직 열림 — b 확인(변화 없음) |
| 요청 1(계약 시험 talk_turn 갈래) | 아직 열림 — a2 브리프 |

## 6. 라운드 판정

**Approved.** I1 · I2 · M1~M6 이 모두 ADDRESSED 이고 새로 깨뜨린 Critical · Important 는 없다. N1 · N2 는 몇 줄 고침이라 컨트롤러가 직접 하거나 b 브리프에 넣어도 된다(Minor 는 컨트롤러 몫). N3 는 저장 자리 결정이 먼저다.
