# 코드 검토 보고: 회화 plan 묶음 3(카드 · 단계 규격 새 꼴과 검증기)

검토자 rev-talk-3(Opus · xhigh), 2026-10-30 09:0x~09:2x, 읽기 전용. 견준 것은 고치기 전 파일(before.tar, 315개)과 워크트리 p13d 의 차이(diff 5,001줄: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/rev-talk3/talk3.diff`)이고, 기준은 plan 묶음 3 행 · 파일 표 묶음 3 행 · 정한 것 1 · 3 · 15 · 16, spec 4판 설계 6, 정본 06 6.3(30줄) · 6.4(175 · 183~188 · 190줄), 02-1:99~100, 02-2:173 · 324~339 다. 시험은 다시 돌리지 않았고, T-6 판정을 위해 seed:validate 만 한 번 돌렸다(09:09, 실패 0 · 규격 파일 오류 0 · 경고 16).

## 판정: Changes requested (Critical 0 · Important 2 · Minor 5)

고칠 것은 단원 덮기 셈의 범위(I-1)와 단원 단위 갈림길의 시험(I-2)이다. 둘 다 check-talk 의 함수 하나와 시험 두세 건 크기다.

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| TalkCardSchema 칸 · 제약(06:30) | ✅ | 그대로인 칸 열한 개와 새 칸(goals · purpose · todayWords 의 imageKey · modelLine · prep · required · more · missions 의 goals · demands · purpose · roleSwap 의 firstLine · hint · purpose)이 6.3 과 같다. required 칸(no · en · ko · targets · goals · demands · purpose · ask · hintKo · hints · answerExample · easyQuestion · imageKey · usablePhrases · firstForm · choices)이 6.3 의 필수 질문 목록과 하나씩 맞고, more 는 첫 꼴 · 선택지를 뺀 같은 칸이다(src/core/seed/schema/talk.ts:152~191). 역할 바꾸기에 목표 ID 칸이 없다. strictObject 라 옛 칸(turns · moreTalk · questions · firstQuestion · exampleKo · 인사 twoAnswers)을 거부한다 |
| 회화 단계 규격(02-2:339) | ✅ | segments 열거에 prep, cardShape required, choices(옛 twoAnswers). 시드 파일 행은 level-spec-talk-v1 이 새 꼴만 받는다(src/core/seed/reference-index.ts:422~442). seed/level-specs.json 회화 12행의 mode 글이 02-2 단계표 '대화 방식' 글과 글자까지 같고, 미션 수는 5~7단계 3 · 4 · 5, koMeaning 은 1~4단계, moreTalk 는 모두 참이다 |
| 6.4 회화 시나리오 카드 행 | ✅ | 규격 + talk-card-v1(src/core/seed/validate.ts:873~881). 공통 검사의 영어 role 에 들려줄 말(example) · 쉬운 질문(tori) · 선택지(pair) · 역할 바꾸기가 든다(talk.ts:412~461). {NAME} · 선생님 이름 · 그림 · 같은 질문 두 번까지 |
| 6.4 회화 카드 목표 · 요구 능력 타당성 | ✅ · ⚠️ | talk-goals · talk-demands(오류), talk-goals-pending(경고). core 몫은 됐고 '과제 유형이 그 core 의 허용 과제 유형 안'은 목표 용어 목록이 없어 미뤘다(아래 5절 8). 기회 수 · 응용 기회 · 노출 경고는 P12 몫이다 |
| 6.4 회화 필수 질문 | ✅ | 상한(참고 턴 × talk.required_max_ratio), 배정 하한(새 단어마다 처음 묻는 질문 하나), 다지기 · 보강 k, A4-03, 받침(쉬운 질문 물음표 · 정규화한 글 다름), 1단계 첫 꼴 · 선택지, 처음 묻는 질문의 문장 힌트에 새 단어, 3단계 영어 틀(힌트 단 수) |
| 6.4 짧은 준비 · 더 이야기할 거리 | ✅(M-1) | '대화 앞쪽 절반'은 필수 질문 목록의 ceil(n/2) 로 구현됐다(src/core/seed/check-talk.ts:403~420). 컨트롤러가 받은 해석과 같다 |
| 6.4 회화 단원 덮기 | ❌ | I-1: 배정 카드의 다시 묻는 필수 질문까지 센다. 보강 카드는 센다 |
| 일부 단원 경고(정한 것 15) | ✅(I-2) | 다 차지 않은 단원은 변형마다 talk-unit-incomplete 경고 하나, 다 차면 talk-known-days 오류(check-talk.ts:893~948) |
| 6.4 회화 미션 · 역할 바꾸기 | ✅ | 미션 수 = level_specs missions, 미션 목표 하나 이상(규격 min 1), 역할 바꾸기는 미션이 있는 단계(5~7)에만 |
| 6.4 어휘 배정 회화 몫 · 단계 평가 겹침(190줄) | ✅ | 배정 role 은 그대로(hint · child · expression), 겹침은 필수 질문 · 쉬운 질문 · 더 이야기할 거리로 다시 센다(src/core/seed/check-assessment.ts:143~151) |
| 3.2 관계 표 둘(02-1:99~100) | ✅ | frame-talk-prep · frame-talk-required(src/core/vocab/allocate.ts:222~245), 실설정에서 위반 0 |
| 옛 흐름 그대로(정한 것 1 · 위험 2) | ✅(M-4) | 아래 4절 |
| 정한 것 3 · AC-7a | ✅ | 아래 4절 |
| 숫자는 설정값 | ✅ | k · 상한 비율 · 짧은 준비 수 · 더 이야기할 거리 수 · known_days 를 모두 설정에서 읽는다. '앞쪽 절반'의 1/2 과 '두 번까지'는 정본 글의 구조 수다 |

## 2. 잘한 점

- 꼴 가르기를 순수 함수 하나(talkCardKindOf)로 두고 시드 길(validate)과 런타임 길(state.ts)이 같은 함수를 쓴다. 옛 꼴 카드가 시드에 들어오면 규격 오류 더미 앞에 까닭 한 줄(talk-card-v1)이 먼저 나온다.
- talkSpecV1Of 가 옛 판 행은 그대로 두고 새 꼴 행이면 꼴 칸을 카드에서 읽어, 옛 흐름 곳곳의 cardShape 분기를 건드리지 않았다. 시험의 기댓값(builders 의 v1SpecOf)은 단계 · 구간으로 따로 계산해 구현을 베끼지 않았다.
- 검증기가 으뜸 원칙을 지킨다. 필수 질문 하한은 새 단어 · k 뿐이고, 참고 턴을 질문으로 채우게 하는 검사(옛 talk-turns · talk-again-slots)를 없앴다.
- 시험 30건 대부분이 '견본은 오류 · 경고 0'을 통과 쪽으로 두고, 칸 하나만 바꿔 규칙 이름과 경로 목록까지 고정한다(pathsOf). 넓은 toContain 에 기대지 않는다.
- 옛 1단계 회화 다섯 파일이 지우기 전 git HEAD 와 바이트까지 같음을 보고대로 확인했다(5/5).

## 3. 지적

### Important

**I-1. 단원 덮기가 배정 카드의 다시 묻는 필수 질문까지 센다**
- 어디: src/core/seed/check-talk.ts:858~863 의 againTargets 가 lesson.kind 와 관계없이 `required.filter((r) => r.ask === "re_ask")` 와 more 를 센다.
- 왜: 정본 06:187 은 '단원 단어마다 다지기 · 보강 필수 질문과 더 이야기할 거리가 talk.known_days 번 이상 서로 다른 수업에서 노린다'이고, 06:175 · 06:30 도 같은 글이다. '다지기 · 보강 필수 질문'은 06:185 '다지기 · 보강 수업은 다시 묻는 필수 질문이 k 개 이상'과 같은 쓰임이라 수업 종류(reinforce · remedial)의 필수 질문이다. 배정 카드는 상한(1~3단계 7개) 안에서 새 단어 다섯 뒤에 다시 묻는 필수 질문을 둘 더 둘 수 있으므로, 지금 셈은 정본보다 느슨하게 단원을 통과시킨다. 구현 보고 '설계와 다르게 한 것' 5 는 '글자대로'라고 적었지만 코드는 그보다 넓고, 컨트롤러가 확인하라고 한 해석과도 다르다.
- 어떻게: required 몫은 `lesson.kind !== "assigned"` 카드만 센다(다지기 · 보강 카드의 필수 질문은 talk-first-ask 때문에 모두 re_ask 다). more 는 06:187 글에서 수업 종류가 필수 질문에만 붙는다고 읽어 모든 수업을 그대로 센다. 컨트롤러가 다르게 읽기로 하면 장부에 해석을 적고 보고 5 의 문장을 고친다. 시험은 '배정 카드의 다시 묻는 필수 질문으로만 known_days 를 채운 단원은 오류'를 하나 더한다.

**I-2. 단원 단위 갈림길(다 찬 단원은 오류, 덜 찬 단원은 경고)을 시험이 지나지 않는다**
- 어디: 단원 시험 둘이 모두 `{ complete: true }` · `{ complete: false }` 를 넘겨(tests/unit/seed-validator-talk.test.ts:632 · 655 · 662) unitComplete(check-talk.ts:866~885)를 거치지 않는다. 견본 talkUnitCards 는 정규 카드만 만들어(tests/fixtures/seed/builders.ts:2529~2561) 보강 카드를 세는 몫(보고 5)도 시험이 없다. validateSeed 로 talk-known-days · talk-unit-incomplete 를 보는 시험도 저장소에 없다(tests 에서 두 규칙 이름 grep 0, 이 파일 밖).
- 왜: 정한 것 15 의 핵심은 '단원 칸이 다 찼는가'를 검증기가 스스로 가르는 것이다. unitComplete 가 늘 false 를 내는 결함이 생겨도 30건이 모두 통과하고, 그러면 묶음 15 의 26장이 단원 덮기 오류 없이 경고로만 지난다. AC-15m '일부 단원 경고'의 증명이 실제 길을 보지 않는다.
- 어떻게: 옵션 없이 checkTalkUnit 을 부르는 시험 둘을 더한다. (가) 단원 틀(index.frame)대로 변형마다 정규 1~n · 보강 1~m 을 모두 넣고(보강은 talkCard 에 kind remedial 자리를 주어 만든다) 덮기를 깨면 talk-known-days 오류가 나고, 보강 카드의 필수 질문이 셈에 든다. (나) 세 장만 넣으면 talk-unit-incomplete 경고 하나다.

### Minor

**M-1. 4단계부터 prep 에도 '앞쪽 절반' 검사를 건다** (check-talk.ts:393 · 403~420). 06:186 은 수 · 오늘 쓸 말 안 · 앞쪽 절반을 '1~3단계 배정 수업 카드'에 걸고, 02-2:173 은 4단계부터 짧은 준비 낱말을 막힌 질문 차례로 앱이 고른다고 적는다. 수와 '오늘 쓸 말 안'은 06:30 '4단계부터 선택'으로 읽을 수 있어 그대로 두고, 앞쪽 절반만 isLow(spec) 일 때로 좁힌다.

**M-2. 1~4단계 쉬운 질문의 한국어 뜻을 막는 규칙으로 둔다** (check-talk.ts:739, talk.ts:173~174). 06:30 은 필수 질문의 '질문(영어, 1~4단계 한국어 뜻)'만 적고 쉬운 질문의 뜻은 적지 않는다. 화면이 1~4단계 선생님 말 아래 뜻을 보이므로 맞는 추론이지만 정본 밖의 막는 규칙이다. 장부에 잠정 항목으로 두거나 13절 한 줄로 올리고, talk-3 브리프 12 · 14절에 옮긴다(보고 '남은 우려' 3 과 같은 일).

**M-3. 막는 쪽 시험이 없는 갈래**: talk-shape(check-talk.ts:124~144, 인사 질문 수 ≠ 인사 턴 수 · 4단계부터 인사 질문), talk-demands 의 home 밖 purpose 갈래(227~241), talk-hints 의 쓸 수 있는 말 수 · 인사 질문 영어 틀(580~614). level-spec-talk-v1 시험은 틀린 칸 넷을 한꺼번에 넣어(seed-validator-talk.test.ts:677~686) 'choices 없음만' · 'twoAnswers 만' 같은 한 갈래 어김을 보지 않는다. 각각 한 건씩 더한다.

**M-4. '동작 그대로'의 예외 하나**: 새 꼴 행이 개발 DB 에 들어오면 옛 흐름 사용자 쪽 줄 'Conversation mode'(src/core/ai/calls/talk.ts:395)가 새 mode 글('짧은 준비 뒤 대화 …', seed/level-specs.json:39~50)을 읽는다. 토막 · 꼴 칸은 talkSpecV1Of 가 지키지만 mode 는 행 그대로다. 위험 2 가 받는 범위이고 push 가 없어 코드는 고치지 않아도 되며, 보고와 장부의 '동작 그대로' 문장에 이 예외를 적는다.

**M-5. e2e 홈 카드 찾기 변수가 기계 바꾸기로 talkCardV1 이 됐다** (tests/e2e/conversation.spec.ts:906 · 910 · 911). 카드 견본이 아니라 홈 화면 링크를 찾는 변수라 이름이 뜻과 다르다. 앞 이름(talkCard)이나 talkHomeCard 로 되돌린다.

## 4. 물어본 것

### 옛 흐름(물음 3, 위험 2)
- src/server/conversation/state.ts:641~661: 새 꼴 카드는 talkCardKindOf 로 먼저 걸러 분명한 오류를 던지고, 옛 꼴은 TalkLessonV1Schema 로 읽으며, 단계 규격은 talkSpecV1Of 로 옛 판 보기를 만든다.
- 옛 판 행(개발 DB revision 1): segments 에서 prep 만 거르고(옛 행에는 없다) twoAnswers 는 `?? false` 인데 옛 행은 늘 boolean 이라 값이 같다. 새 꼴 행: turns 카드면 다섯 토막 · turns, 아니면 네 토막 · questions, moreTalk 는 카드에 moreTalk 가 있는가, twoAnswers 는 카드에 답 두 개가 있는가로 읽는다. 옛 시드 행 값과 같고, flow.ts:366 은 turn.twoAnswers 가 있을 때만 쓰므로 답 두 개가 없는 1단계 카드에서도 결과가 같다.
- flow.ts · hints.ts · wrap-up.ts · calls/talk.ts · turn.ts 는 형 이름만 바뀌었다(바뀐 줄이 모두 import 와 형 표기). 런타임에서 회화 카드 · 회화 규격을 parse 하는 곳은 state.ts 한 곳뿐이다(session/index.ts 는 talk 를 뺀 영역 형).

### 1단계 회화 시드 지움 · AC-7a(물음 4)
- 지운 다섯 파일이 git HEAD 와 같고, seed/manifest/talk-1.jsonl 일곱 줄은 그대로다. 검증기 · 적재기는 manifest 를 시드 파일과 대조하지 않으므로(scripts/seed-validate.ts:333 은 manifest 를 걷지 않음) 지운 뒤 생기는 오류가 없다.
- 새 AC-7a 시험(tests/unit/seed-validator-complete.test.ts:103~124)은 회화 1단계 단원 1 파일을 빼면 빈 칸이 그 칸 열쇠 목록과 같고 완전성 모드 종료 1 · PR 모드 0 임을 본다. 실제 시드 나무(회화 1단계 파일 없음)와 같은 길이다. main.yml 의 `--complete-through settings`(6)는 이 묶음 전에도 빈 칸으로 막히는 상태라 새로 깨지는 것이 아니다.

### '설계와 다르게 한 것' 1 · 6 · 7 · 8(물음 5)
- 1(prep 은 단계 규격 열거만): 받아들일 만하다. level_specs.spec 은 jsonb(src/db/schema/content.ts:178)라 DB 열거 talk_segment 와 닿지 않고, 옛 흐름은 prep 을 거른다. DB 열거 추가는 정한 것 8 · 묶음 7 이다.
- 6: 4단계부터 prep 을 두면 talk.prep_words 개라는 읽기는 06:30 과 맞다(앞쪽 절반은 M-1). 1~4단계 질문 뜻은 06:30 그대로이고 쉬운 질문 뜻은 M-2 다. hintKo 를 모든 단계에서 요구하는 것은 옛 꼴과 같아 새로 생긴 규칙이 아니다.
- 7(역할 바꾸기는 미션이 있는 단계만): 받아들일 만하다. 06:30 '역할 바꾸기(roleSwap, 5~7단계, 비울 수 있음)'와 02-2 단계표 5~7행, level_specs missions(5~7단계만 0 이 아님)가 같은 범위다.
- 8(요구 능력은 core 로만): 받아들일 만하다. 목표 용어 목록(seed/lists/goal-terms.json)이 아직 없고 reference.ts:308 도 같은 까닭으로 미뤘다. 허용 과제 유형 대조(06:193)는 그 목록이 들어올 때 하므로 장부 '구현하며 확인할 것'에 남긴다.

### 시험의 질(물음 6)
- 30건 가운데 대부분은 통과 쪽(견본 오류 · 경고 0, seed-validator-talk.test.ts:132~144)과 막는 쪽(칸 하나 바꿈 → 규칙 · 경로)을 함께 본다. 기댓값을 구현에서 베낀 것은 찾지 못했다. k · 상한 · prep 수는 설정에서 읽고, talkSpecV1Of 의 기댓값은 v1SpecOf 가 따로 계산한다.
- 모자란 것은 I-2 와 M-3 이다.

### 파일 표 밖 시험 · 견본(물음 7)
- conversation-flow · call · server, sample-inputs, talk-fixture, e2e 여섯, seed-teacher 의 바뀐 줄은 형 이름 · 견본 빌더(talkCardV1 · talkSpecV1 · v1SpecOf) · 경로 문자열뿐이고 expect 의 기댓값은 바뀌지 않았다.
- talk-fixture(통합)는 시험 DB 를 만든 바로 뒤에 회화 1 · 4단계 단원 1 정규 행을 지우고 V1 견본을 넣는다(tests/integration/talk-fixture.ts:98~109). 세션이 생기기 전이라 외래 키에 걸리지 않고, 작은 틀의 주제 변형이 1 이라 지우는 범위와 넣는 범위가 같다.
- seed-schema 의 빼는 칸 목록(tests/unit/seed-schema.test.ts:731~739)은 새 꼴의 id · 열거 · 꼬리표만 더해 '모든 글 칸이 글 조각에 든다' 시험의 뜻을 지킨다.

## 5. 장부 열린 항목

- **T-6: 아직 열림.** 근거: (1) reference-only 적재를 아직 하지 않았다. (2) 회화 몫 파일은 적재해도 되는 상태다. 09:09 seed:validate 실패 0 · 규격 파일 오류 0, seed/level-specs.json 회화 12행이 모두 새 꼴이고(반쯤 바뀐 행 없음, revision 3 잠정은 컨트롤러 몫), seed/settings.json 에 검증기가 새로 읽는 키 다섯(talk.prep_words 넷 · talk.required_max_ratio)이 있다. (3) 적재 전에 컨트롤러가 정할 것 둘. (가) seed/unit-specs.json 의 talk 3-1 행은 goals 만 더해졌고 개정은 1 · 0 그대로다. unit_specs 에 goals 열이 없고(src/db/schema/content.ts:197~219) 적재 해시도 goals 를 보지 않아(src/server/seed/load.ts:246~262) reference-only 적재는 이 행을 바뀌지 않은 것으로 다룬다. 정한 것 16 '목표를 더한 단원 규격 행도 같은 개정'을 이 행에 적용할지 정한다. (나) 같은 파일의 회화 밖 행(reading · speaking 3-1 goals, writing 3-1 · 3-2 낱말 맞바꿈, 모두 correction 1)은 다른 변경 단위의 변경이다. 적재가 writing 3-1 · 3-2 낱말을 개발 DB 에 넣으므로 그 주인이 끝났다고 확인한 뒤 적재한다.
- **T-2: 닫힘.** `grep -rn participation_ratio src seed tests scripts` 가 0줄이다(09:0x). 이 묶음의 파일 · seed/settings.json · tests/fixtures/settings.ts 어디에도 없다.

## 6. 범위 밖 관찰

- 보고 '남은 우려' 1 의 길(수업 목록에서 시험 시드의 새 꼴 회화 1단계 카드를 여는 e2e)은 예를 들어 tests/e2e/conversation.spec.ts:904~912(홈 카드 → 수업 목록 → '여기부터 해요')가 지난다. 실행 확인 전까지 묶음 12 몫으로 장부에 남긴다.
