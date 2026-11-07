# 구현 보고: 회화 plan 묶음 3 — 카드 · 단계 규격 새 꼴과 검증기(구현자 · Opus · high, 2026-10-30 08:1x~09:0x)

상태: DONE_WITH_CONCERNS. 제 몫의 관문은 모두 0 이다. 다만 같은 워크트리에서 다른 손(묶음 5)이 08:36 부터 새로 쓴 시험 파일 여섯이 아직 없는 모듈을 가져와 lint · tsc · 단위 관문 전체는 0 이 아니다(아래 '관문 결과').

브리프 `task-talk-3.md`, plan 묶음 3 행 · 파일 표 묶음 3 행 · 정한 것 1 · 3 · 15, spec 4판 설계 6, 정본 06 6.3 · 6.4(C189)를 따랐다. 작업 자리는 워크트리 p13d, 커밋 · push 없음.

## 바뀐 파일(줄, 수정 뒤 기준)

고치기 전 파일은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/talk3/before/before.tar` 에 있다(되돌릴 때 이 줄 목록과 견준다, 위험 1).

| 파일 | 줄 | 무엇을 |
|---|---|---|
| `src/core/seed/structure.ts` | 208~211 · 221~258 | TALK_SPEC_SEGMENTS · TALK_LEVEL_SEGMENTS · TALK_CARD_SHAPES · TALK_NEXT_MOVES · TALK_SUPPORTS · TALK_FIRST_FORMS · TALK_CARD_ITEM_KINDS · TALK_LOW_BAND. TALK_SEGMENTS(DB 열거 · 옛 흐름)는 값 그대로, 주석만 |
| `src/core/seed/schema/reference.ts` | 15 · 17 · 266~280 | 회화 단계 규격: segments 열거를 TALK_LEVEL_SEGMENTS 로, cardShape 에 required, choices(선택), twoAnswers 선택(옛 판 행) |
| `src/core/seed/schema/talk.ts` | 1~25 · 48~118 · 120~330 · 382~519 | 새 TalkCardSchema 와 하위 형, 옛 꼴 V1 이름(TalkCardV1Schema), talkCardKindOf, TalkLevelSpecV1 · talkSpecV1Of, 새 textsOfTalkCard, 옛 textsOfTalkCardV1(견본 전용) |
| `src/core/seed/schema/lesson.ts` | 18~24 · 509~520 | TalkLessonSchema(새 꼴) · TalkLessonV1Schema |
| `src/core/seed/check-talk.ts` | 파일 전체 | 새 꼴 검증기(아래 규칙 목록). questionKey · TALK_ROLES · TALK_ALLOCATION_ROLES 는 그대로 내보냄, againSlots 는 againTargets 로 바뀜 |
| `src/core/seed/check-cross.ts` | 142~144 · 217 | 주제 변형 분량 서명(필수 · 더 · 미션 수), 답하는 대상 단어(필수 · 더) |
| `src/core/seed/check-assessment.ts` | 95 · 143~151 | 회화 평가 겹침의 견줄 질문(필수 · 쉬운 질문 · 더), 같은 차례는 필수 질문 차례 |
| `src/core/seed/validate.ts` | 71 · 163 · 244~245 · 873~881 | itemsOf(인사 → 필수 → 더), 옛 꼴 카드면 talk-card-v1 오류 한 줄 |
| `src/core/seed/reference-index.ts` | 46 · 82~111 · 351 · 422~443 | 필수 설정 키 둘(talk.prep_words.<구간> · talk.required_max_ratio), level-spec-talk-v1, frame-talk-required 경로 |
| `src/core/vocab/allocate.ts` | 7 · 24~30 · 144~150 · 189~246 | 관계 검사 둘(frame-talk-prep · frame-talk-required), LevelSpecFrameSource.targetTurns(선택) |
| `seed/level-specs.json` | 39~50 | 회화 1~12단계 행: segments · mode(02-2 단계표 '대화 방식' 글) · cardShape required · choices · moreTalk true, revision 3(잠정) |
| `seed/lessons/talk/1/{1..5}.json` | 지움 | 정한 것 3. git HEAD 에 그대로 있고(바뀐 줄 없음 확인), manifest `talk-1.jsonl` 첫 판 줄은 둠 |
| `src/app/dev/seed-viewer/talk-card.tsx` | 1~254 | 새 꼴 보기(목표 · 오늘 쓸 말 들려줄 말 · 짧은 준비 · 필수 질문 · 더 이야기할 거리 · 미션 · 역할 바꾸기) |
| `src/core/conversation/flow.ts` · `hints.ts` · `wrap-up.ts` · `src/core/ai/calls/talk.ts` · `src/server/conversation/turn.ts` | import 줄과 형 이름만(flow 11~15 · 74 · 85 · 115 · 146~147 · 392 · 669 · 799 · 818 · 863 · 1037, hints 5 · 23 · 59 · 110, wrap-up 4 · 38 · 42 · 83 · 114, talk 24 · 65 · 128, turn 59 · 1214) | TalkCard → TalkCardV1, TalkLevelSpec → TalkLevelSpecV1. 동작 그대로 |
| `src/server/conversation/state.ts` | 36~47 · 109~111 · 641~647 · 660~661 | 옛 갈래가 TalkLessonV1Schema 로 읽고, 새 꼴 카드면 분명한 오류를 던지며, 단계 규격 꼴 칸은 talkSpecV1Of 로 카드에서 읽음 |
| `tests/fixtures/seed/builders.ts` | 27 · 50~102 · 154~207 · 279~280 · 820~832 · 2046~2572 | 설정 키 둘 더함(작은 틀 talk.prep_words 1), 회화 단계 규격 행 새 꼴, talkCard(새 꼴) · talkUnitCards, talkCardV1 · talkUnitCardsV1 · talkSpecV1 · v1SpecOf(옛 흐름 시험 전용) |
| `tests/unit/seed-validator-talk.test.ts` | 파일 전체 | 새 꼴 검증기 시험 30(옛 꼴 규칙 talk-turns · talk-pairs · talk-again-slots · talk-first-question 시험은 그 규칙이 없어져 바꿈) |
| `tests/unit/seed-schema.test.ts` | 731~739 | 글 조각 시험의 빼는 칸(새 꼴 목표 ID · 꼬리표 · 짧은 준비 낱말 · 첫 꼴) |
| `tests/unit/seed-validator-complete.test.ts` | 103~125 · 213 | AC-7a 회화 빈 칸 시험 하나 더함, 겹침 시험이 필수 질문을 읽음 |
| `tests/unit/seed-teacher.test.ts` | 256~259 | 선생님 이름 경로 card.turns.0.question.ko → card.required.0.ko |
| `tests/unit/conversation-flow.test.ts` · `conversation-call.test.ts` · `conversation-server.test.ts` · `tests/fixtures/ai/sample-inputs.ts` | 이름 · specOf 만(flow 42~68 · 76 · 109~113 · 215, call 38~63 · 96 · 130, server 22 · 56~71 · 190 · 568 · 651, sample 22~29 · 409~411) | 옛 흐름 시험이 V1 견본 · 옛 판 행 보기를 읽음. 기대값은 안 바꿈 |
| `tests/integration/talk-fixture.ts` | 2 · 10~11 · 40 · 75~107 · 189~190 | 시험용 시드의 새 꼴 회화 정규 행을 지우고 V1 견본을 넣음(정적) |
| `tests/e2e/talk.ts` · `conversation.spec.ts` · `required-recovery.spec.ts` · `required-utterance.spec.ts` · `speech-feedback.spec.ts` · `teacher-window.spec.ts` | 이름만 | talkCard → talkCardV1, 형 이름 V1(정적) |

## 새 꼴 칸 표(TalkCardSchema, 6.3 회화 카드 행)

| 칸 | 꼴 | 칸 검사(단계) |
|---|---|---|
| topic · targetExpressions · greetingTurns · flow · todayTopicsKo · closingLines · safeLines · endCondition · farewell · safetyFarewell · praiseLines | 그대로 | 그대로 |
| greeting | `{ questions: TalkGreetingQuestion[] }`(1~3단계, 답 두 개 칸 없음) 또는 `{ firstLine }`(4단계부터) | talk-shape |
| goals · purpose | 목표 ID 목록(하나 이상, 겹침 없음) · 꼬리표(선택) | talk-goals |
| todayWords[] | word · meaningKo · example · imageKey(선택) · modelLine(들려줄 말) | talk-today · talk-images |
| prep | 낱말 id 목록(선택) | talk-prep(1~3단계 배정 수업 필수) |
| required[] | no · en · ko(선택) · targets · goals · demands(선택) · purpose(선택) · ask · hintKo · hints(영어 단, 단계 규격 차례) · answerExample · easyQuestion{en, ko?} · imageKey(선택) · usablePhrases(선택) · firstForm(plain · choices · introduce, 선택) · choices(둘, 선택) | 아래 규칙 |
| more[] | required 와 같은 칸에서 firstForm · choices 를 뺌 | talk-more 외 같은 검사 |
| missions[] | ko · en · goals · demands(선택) · purpose(선택) | talk-missions · talk-goals |
| roleSwap | firstLine · hint · purpose(목표 ID 없음) | talk-missions |
| 없앤 칸 | turns · moreTalk · questions · firstQuestion · todayWords.exampleKo · 인사 twoAnswers | 모르는 키라 규격이 거부, 옛 꼴이면 talk-card-v1 |

회화 단계 규격(TalkLevelSpecSchema): segments(TALK_LEVEL_SEGMENTS), cardShape(required · 옛 turns · questions), choices(선택 형, 시드 파일은 필수), twoAnswers(선택, 옛 판 행). 시드 파일의 새 꼴은 segments [greeting, prep, talk, wrap_up] · cardShape required · choices 있음 · twoAnswers 없음이고 어기면 level-spec-talk-v1 이다.

## 검증기 규칙 목록(설계 6 검증기 표 행마다)

| 설계 6 행 | 검사(rule) | 함수 |
|---|---|---|
| 으뜸 원칙 | 질문 차례 · 참고 턴 채우기를 요구하는 검사 없음(필수 질문 하한은 새 단어 · k 뿐, 옛 talk-turns · talk-again-slots 없앰) | check-talk 머리 주석 |
| 꼴 | 규격 strict(옛 칸 거부) · talk-card-v1 · talk-shape(1~3단계 인사 질문 수 = 인사 턴 수, 4단계부터 첫 말) · talk-numbers(번호 1부터 차례) · level-spec-talk-v1 | 규격 · validate · checkShape · reference-index |
| 목표 | talk-goals(ID 꼴 `talk-<단계>-<단원>-<n>` · 단원 목표 안 · 질문 · 미션 목표가 카드 goals 안 · 카드 목표마다 필수 질문 하나 이상), talk-demands(목표 여럿이면 요구 능력 필수 · 목표마다 core 가 요구 능력 안 · home 밖 purpose 에 요구 능력 필수), talk-goals-pending(단원 목표가 없으면 단원 경고 하나, 막지 않음) | checkGoals · checkTalkUnit |
| 필수 질문 수 | talk-required(필수 질문 ≤ 참고 턴 × talk.required_max_ratio, 다지기 · 보강의 다시 묻는 필수 질문 ≥ k), talk-first-ask(배정: 새 단어마다 처음 묻는 필수 질문 하나 · 둘이면 거부 · 새 단어만 노림 · 영어 문장 힌트에 새 단어, 다지기 · 보강: 처음 묻는 질문 없음) | checkRequired |
| 노린 단어 | talk-targets(1~2개 · 단원 단어 · 질문 · 쉬운 질문 · 더 이야기할 거리 질문에 노리는 단어 없음), talk-choices(같은 꼴 · 낱말 하나 차이 · 하나는 노리는 단어) | checkTargets · checkFirstForm |
| 받침 | talk-support(쉬운 질문이 물음표로 끝남 · 그 질문과 정규화한 글이 다름), talk-first-form(1단계 처음 묻는 질문: 짧은 준비 낱말이면 plain, 아니면 choices · introduce, 다른 자리엔 없음), talk-choices(첫 꼴 선택지면 선택지 둘 있음) | checkSupport · checkFirstForm |
| 짧은 준비 | talk-prep(1~3단계 배정 카드 prep = talk.prep_words.<구간> · 4단계부터 두면 같은 수 · 오늘 쓸 말 안 · 그 낱말의 처음 묻는 필수 질문이 앞쪽 절반 안 · 다지기 · 보강은 비움) | checkPrep |
| 더 이야기할 거리 | talk-more(≥ talk.more_talk_turns, 모두 다시 묻는 질문, 모든 단계) | checkMore |
| 단원 덮기 | talk-known-days(단원을 다 채웠을 때 오류), talk-unit-incomplete(덜 찼으면 변형마다 경고 하나, 정한 것 15) | checkTalkUnit |
| 미션 | talk-missions(5~7단계 미션 수 = level_specs missions, 역할 바꾸기는 미션 있는 단계만), 미션 목표 하나 이상(규격 min 1) | checkMissions |
| 그대로 | talk-same-question(인사 · 필수 · 더 · 쉬운 질문, 두 번까지), 문장 길이 · 형태 · 어휘 범위 · 금지어(공통 검사, 들려줄 말 · 쉬운 질문 · 선택지 · 역할 바꾸기 포함), talk-placeholder({NAME} 하나), teacher-name, talk-images, talk-hints(힌트 단 수 · 쓸 수 있는 말 수 · 인사 질문 영어 틀), talk-ko(1~4단계 질문 · 쉬운 질문 · 첫 말 · 정리 · 안전한 대사 · 끝인사 뜻), talk-today, vocab-allocation(들려줄 말 · 예문은 세지 않음) | 공통 · check-talk |
| 평가 spec 규칙 | 요구 능력 타당성은 talk-demands. 기회 수 · 응용 기회 보고 · 덮음 표의 회화 몫은 P12 키(evidence.*) · 목표 용어 목록이 들어온 뒤 | 미룸 |
| 3.2 관계 표(설계 10) | frame-talk-prep(talk.prep_words.1-3 ≤ unit.new_words_per_lesson.1-3), frame-talk-required(회화 단계마다 k ≤ 참고 턴 × talk.required_max_ratio) | checkFrameRelations |
| 6.4 단계 평가 | 회화 평가 겹침을 새 꼴 카드(필수 · 쉬운 질문 · 더)로 다시 셈 | lessonCorpus |

## 설계와 다르게 한 것 · 해석

1. **짧은 준비 토막 prep 은 단계 규격 열거에만 더했다.** plan 은 'segments 에 prep' 이다. DB 열거 talk_segment 에 prep 이 없어(마이그레이션은 묶음 7) TALK_SEGMENTS(옛 흐름 형 · DB 쓰기)에 넣으면 형이 깨진다. 그래서 TALK_LEVEL_SEGMENTS = TALK_SEGMENTS + prep 을 단계 규격 segments 가 받는다.
2. **'꼴을 카드에서 읽음'은 state.ts 한 곳에서 한다.** 옛 흐름 곳곳의 `spec.cardShape === "turns"` 를 고치지 않고, state.ts 가 단계 규격을 읽을 때 talkSpecV1Of(행, 카드)로 옛 판 행 보기를 만든다. 옛 판 행이면 그 칸 그대로, 새 꼴 행이면 토막 · 카드 꼴 · 답 두 개 · 더 이야기할 거리를 옛 꼴 카드에서 읽는다. 그래서 개발 DB 에 새 꼴 행이 들어와도 옛 꼴 카드의 옛 흐름은 동작 그대로다(위험 2 를 줄임). 예외 하나: 옛 흐름 회화 턴 사용자 메시지의 'Conversation mode' 줄(src/core/ai/calls/talk.ts:395)은 행의 mode 글을 그대로 읽어, 새 꼴 행이면 새 대화 방식 글이 간다(검토 M-4, 위험 2 범위라 코드는 두었다).
3. **talkCardKindOf 의 값은 'new' · 'v1' · 'invalid' 다.** state.ts 는 새 꼴 카드면 '새 갈래는 묶음 5~11' 오류를 던진다(새 갈래가 생기기 전 자리).
4. **'대화 앞쪽 절반'은 필수 질문 목록의 앞쪽 절반(ceil(n/2))으로 읽었다.** 실설정(1~3단계 k 5 · 짧은 준비 3)은 들어맞는다. 작은 틀 견본은 새 단어 2 · 필수 질문 2 라 앞쪽 절반이 1번뿐이어서 작은 틀 설정의 talk.prep_words 를 1 로 두었다(시험 견본 값).
5. **단원 덮기는 다지기 · 보강 카드의 필수 질문과 모든 카드의 더 이야기할 거리를 센다**(fix 1, 검토 I-1). 06:175 · 06:187 의 '다지기 · 보강 필수 질문'을 수업 종류로 읽어, 배정 카드의 필수 질문은 다시 묻는 질문이어도 세지 않는다(첫 판은 배정 카드의 다시 묻는 필수 질문까지 셌다). 보강 수업 카드도 센다(옛 검사는 정규만). 단원이 다 찼는지는 단원 틀의 변형마다 정규 1~n · 보강 1~m 이 다 있는지로 본다.
6. **4단계부터 prep 을 두면 talk.prep_words 개여야 한다**(6.3 '4단계부터 선택'을 '두면 같은 규칙'으로 읽음). **1~4단계는 필수 질문 · 쉬운 질문의 한국어 뜻을 요구한다**(앱이 카드 자리 질문 뜻을 보이는 단계). hintKo 는 옛 꼴처럼 모든 단계 필수다.
7. **역할 바꾸기는 미션이 있는 단계에만 둔다**(6.4 '5단계부터만'을 level_specs missions > 0 으로 셈).
8. **요구 능력 타당성은 단원 목표의 core 로만 본다.** 목표 용어 목록(goal-terms.json)이 아직 없어 'core 의 허용 과제 유형' 대조는 하지 않는다.
9. **옛 seed-validator-talk 시험은 새 꼴 시험으로 바꿨다.** 그 시험이 보던 규칙(talk-turns · talk-pairs · talk-again-slots · talk-first-question)이 C189 로 없어졌기 때문이다. 옛 흐름 시험(conversation-* · 통합 · e2e)은 지우지 않고 V1 견본으로 이름만 바꿨다.
10. **파일 표 밖으로 고친 시험 · 견본:** conversation-flow · call · server, sample-inputs, talk-fixture, e2e 여섯(이름 · specOf 만), seed-teacher(경로 한 줄). 옛 흐름 시험이 새 꼴 견본 · 새 꼴 단계 규격을 읽으면 기대값이 깨지기 때문이다.

## 시험(AC 번호)

`tests/unit/seed-validator-talk.test.ts` 30(모두 AC-15m, 마지막 하나는 옛 흐름 보기): 새 꼴 견본 통과 · 옛 칸 거부 · 틀린 칸 거부 · 꼴 가르기 · talk-card-v1 · 목표 밖 · 목표마다 필수 질문 · 요구 능력 · 목표 정의 전 경고 · 처음 묻는 필수 질문 · 다지기 k · 상한 · A4-03 · 받침 · 1단계 첫 꼴 · 문장 힌트 · 힌트 단 · 한국어 뜻 · 번호 · 같은 질문 · 짧은 준비 · 더 이야기할 거리 · 미션 · 역할 바꾸기 · 그림 · 틀 자리 · 오늘 쓸 말 · 어휘 배정 · 단원 덮기 · 일부 단원 경고 · 단계 규격 옛 꼴 · 관계 둘 · 문항 번호 · talkSpecV1Of.
`tests/unit/seed-validator-complete.test.ts` 'AC-7a 완전성(회화 새 꼴, C189): 회화 1단계 단원 수업 파일이 비면 완전성이 막고 PR 모드는 보고만 한다' 하나를 더했다. 시험은 먼저 써서 30건 실패를 본 뒤 통과시켰다.

## 관문 결과(2026-10-30 09시대, Node 24)

```
seed:validate   칸 795 · 통과 792 · 실패 0 · 빈 칸 4097 · 풀이 검사 안 됨 3 · 사람 확인 0 · 경고 16 · 규격 파일 오류 0  (종료 0)
                (앞: 칸 925 · 빈 칸 3967 · 경고 17 — 옛 회화 130장이 빠지고 그 분포 경고 하나가 없어짐)
check:ids       CI 목록 --fail-on … --design-number-max 49 → 위반 0, design-number 47  (종료 0)
spec:trace      --fail-on unknown-ac,plan-ac-not-in-spec --plan 회화 plan  (종료 0)
check:deps      no dependency violations found (273 modules)  (종료 0)
tsc · biome     제 파일 오류 0
pnpm test       Test Files 4 failed | 128 passed (132) · Tests 1533 passed | 6 todo
```

pnpm test 실패 넷과 tsc · lint 실패는 모두 다른 손(묶음 5)이 08:36 뒤 새로 만든 파일이다: `tests/fixtures/talk-lesson.ts` · `tests/unit/talk-chances.test.ts` · `talk-move.test.ts` · `talk-question-check.test.ts` · `talk-ending.test.ts` · `talk-lesson-flow.test.ts`. 아직 없는 모듈(`@/core/conversation/lesson-turns` · `move` · `chances` · `question-check` · `ending` · `lesson-flow`)을 가져오는 '시험 먼저' 단계이고 저는 고치지 않았다. 그 파일을 빼면 단위 시험은 실패 0 이다.

## 요청하는 변경

1. **[컨트롤러] 회화 단계 규격 행의 개정.** seed/level-specs.json 회화 12행의 revision 을 잠정 3(시드 나무의 가장 큰 개정 2 + 1)으로 두었다. 정한 것 16 대로 `seed:load --dry-run` 의 '최신 개정' + 1(talk-3 카드와 같은 개정)로 맞춰 주어야 한다. 같은 개정이 아니면 판 규칙(revision-not-new)에 걸릴 수 있다.
2. **[묶음 5 구현자] 견본 형 맞추기.** `tests/fixtures/talk-lesson.ts` 가 카드 형을 따로 정의한다. 칸 이름은 지금 TalkCardSchema 와 같지만, 묶음 5 가 끝날 때 TalkCard(새 꼴) 형에서 고르게 하면 어긋남을 막는다.
3. **[컨트롤러 확인] 해석 둘.** '대화 앞쪽 절반'을 필수 질문 목록의 앞쪽 절반으로, '단원 덮기'에 보강 수업을 넣은 것(위 4 · 5)이 맞는지. 다르면 check-talk 의 checkPrep · againTargets 한 곳씩만 바꾸면 된다. (fix 1: 단원 덮기의 필수 질문 범위는 검토 I-1 로 고쳤고, 앞쪽 절반은 검토 M-1 로 1~3단계 배정 카드에만 건다 — `task-talk-3-fix1.md`.)

## 남은 우려

- **옛 흐름 통합 · e2e(정적).** 시험용 시드 나무의 회화 1단계 카드가 새 꼴이 되어, 수업 목록에서 회화 1단계를 여는 e2e 는 옛 흐름의 '새 꼴 카드' 오류를 만난다. 견본을 직접 넣는 e2e(insertTalkLesson)와 통합 바탕은 V1 견본으로 바꿨다. 둘 다 이 Mac 에서 돌지 않아 실행 확인은 묶음 12 와 11-01 뒤 CI 몫이다.
- **로컬 개발 DB(`pnpm db:dev`)의 회화 1단계도 같은 길로 열리지 않는다.** 정한 것 2 의 '1단계 회화 닫힘'과 같은 상태이고, push 가 없는 동안만이다.
- **talk-3 카드 생성(묶음 4)은 이 검증기를 그대로 받는다.** 칸 이름 · 규칙(특히 쉬운 질문 · 첫 꼴 · 짧은 준비 낱말 · 1~4단계 뜻)을 브리프 12 · 14절에 옮겨야 한다. 단원 목표(unit-specs talk 3-1 goals)가 들어오면 카드 goals 는 그 id 안이어야 하고, 목표가 둘 이상이면 질문마다 demands 가 필요하다.
- **evidence.* 기회 수 · 응용 기회 · 덮음 표의 회화 몫**은 P12 키가 들어온 뒤 더해야 한다.
