# 코드 검토: 회화 턴 프롬프트 · 흐름 규칙 고침 2(검토자 Opus · xhigh, 2026-11-06 00:5x)

**판정: 수정 필요.** Critical 1 · Important 6 · Minor 13(7절 덧붙임 포함 — 처음 판정은 Critical 0 · Important 5 · Minor 10). 프롬프트 고침(C-1 (가) · I-1 · I-2 · I-4 · Minor)과 응답 칸 · 흘려 받기 · 영어 거름은 맞게 들어갔다. 그러나 막힘을 무른 턴의 서버 길(다시 쓰기 · 실패 처리 · 아이 말 칸)에 결함 둘과 시험 빈칸 하나가 있고, 앱 안전망과 카드 답 뒤 되돌림은 C204 의 뜻을 다 채우지 못한다.

읽는 법. 줄 번호는 워크트리 `.claude/worktrees/p13d` 의 지금 파일이다. 검토 중에 다른 묶음(CI 통합 16건)이 같은 워크트리의 `talk-lesson.ts`(선생님 문장 상한 설정 규격) · `src/server/conversation/turn.ts` · `tests/integration/talk-lesson-closing.test.ts` · `talk-prompt-fix2.test.ts` 끝을 고쳤다. 그 부분은 범위 밖이다. 검토 대상 diff 사본과 변이 실험은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/prompt2-review/` 에 있다(`diff.patch` · `mut/` 사본 · `probe.txt`). 워크트리는 고치지 않았고 실호출도 하지 않았다.

## 1 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| C-1 (가) 막힘 경계 프롬프트 · 예 둘씩 · 'If stuck' 은 비상 계획 | ✅ | `talk-lesson.ts:789-790`, 02-2:251 · 194 · 196 |
| C-1 (나) child_kind 칸(Zod enum · 첫 칸 · 느슨한 규격 빈 값 · 표본 19 · e2e · 통합 견본 · 끝맺음 'answer') | ✅ | `talk-lesson.ts:531` · `691` · `1285`, 계약 시험 칸 차례 |
| 앱이 갈래로 막힘을 무름 · 말 입력이 아니면 그대로(단추 · 침묵 길 그대로) | ✅ | `child-kind.ts:92` |
| 앱 안전망(영어 낱말 2개 이상 · 모름 아님) | ❌ 좁힘 | 갈래가 있으면 꺼짐(Important D) |
| 막힘을 무른 1~3단계 턴 통째로 다시 쓰기 · 재호출 한 턴 1회 | ✅ / ❌ | 상한은 지킴. 실패 길 · 아이 말 칸 결함(Important A · B) |
| I-4 설명 · 뜻의 영어 문장 금지(프롬프트) · 1~3단계 서버 거름 | ✅ | `talk-lesson.ts:815` · `1553`, `spoken.ts:151` |
| M-3 설명에서 평하지 않기 | ✅ | `talk-lesson.ts:815` |
| I-1 받침 1 · 3 예 나눔 · 받침 셋째 · 들리지 않음의 신호 말 거름 | ✅ | `talk-lesson.ts` 1~3단계 카드 자리 줄, `lesson-turn.ts:656` |
| I-2 'next_move can never be required' · 앱 되돌림 | ✅ / ⚠️ | 되돌림은 됨. 카드 기회 셈과 어긋남(Important E) |
| M-1 · M-2 · M-4 · M-7 · 반응 예 둘 | ✅ | 고정부 문장, 시험 `talk-prompt-fix2.test.ts:417` |
| 고정부 캐시(앞부분 불변) | ✅ | 바뀐 곳은 모두 고정 글이고 턴 값을 끼우지 않는다. 배포 때 한 번만 새로 쓴다 |
| 설계 숫자 | ⚠️ | `ENGLISH_SAYING_MIN_WORDS = 2` 가 설계 숫자인지 C204 에 없다(Minor 10) |
| 새 규칙 먼저 실패 확인 | ❌ | 구현자 U1. 변이로 대신 확인했다(5절) |

## 2 잘한 점

- child_kind 를 stuck 앞 첫 칸으로 두어, 생각을 끈 낮은 effort 에서도 갈래를 먼저 정하게 했다. 흘려 받기 reader 는 child_kind → stuck → tori_en 차례만 받고 어기면 실패로 둔다(`stream.ts`, 시험 있음).
- 흘려 받기의 onStuck(`talk.ts:339`)과 정규화(`talk-lesson.ts:1430`)가 같은 순수 함수 effectiveStuckOf 를 써서, 첫 문장 전 판단과 끝 값이 어긋나지 않는다. 받침 셈 · stuck_phrase 도 정규화 값을 쓴다(`lesson-turn.ts:2024` · `2178`).
- 다시 쓰기는 C203 메모를 대신할 뿐이라 한 턴 재호출 1회 상한이 그대로다. 다시 쓴 질문은 settle 의 질문 검사를 다시 지나고, 걸리면 카드 자리로 간다.
- 영어 거름은 한국어 안의 영어 한 낱말을 남긴다('juice 는 주스야.' · "'cold'는 차가워, 'hot'은 뜨거워." 그대로). 따옴표 안 영어 문장과 문장 뒤에 붙은 영어 질문은 잡는다. 4단계부터는 거르지 않는다(시험이 가름).
- 신호 말 거름이 소리 줄 겹침 거름보다 앞이라 받침 첫째의 'Let's say it together.' 는 남는다. 시험이 받침 1 · 3 · 들리지 않음을 가른다.
- 우려 U1~U5 를 스스로 밝혔다.

## 3 지적

### Important

| # | 무엇이 | 왜(근거) | 어떻게 |
|---|---|---|---|
| A | **다시 쓴 턴의 아이 말 칸을, 막힘이라 판단한 앞 응답에서 가져온다.** `question-retry.ts:93-104` · `163`(fromFirst)이 whole 일 때도 같다 | 2회차 원 응답(`talk-observe-2/…json`)에서 stuck 참 응답 18건이 모두 self_used_words [] · goal_suggest [] · recast "" · child_topic false 였다. '말했다'는 AI 의 self_used_words 에 든 낱말만 센다(`said.ts:76`, 3.4 · AC-9d). 그래서 C-1 이 살리려는 바로 그 턴에서 단원 단어 '말함' · 목표 근거 · 되풀이가 빈다. 회화 단원 통과가 '말함' 80% 라 셈이 줄어든다 | whole 이면 child_kind · stuck 만 앞 응답(앱이 정한 값)에서, 나머지 아이 말 칸은 다시 쓴 응답에서 가져온다. 병합 값의 self_used_words 가 다시 쓴 쪽인지 시험한다 |
| B | **다시 쓰지 못하면 질문 없는 AI 차례가 된다.** `lesson-turn.ts:1431-1438`(모두 잡아 둠) · `1468` · `1477`(그대로 돌려줌), settle 의 `1040`(ok 결과는 질문이 없어도 카드 자리로 바꾸지 않음) | 사본 탐침(`probe.txt`): 무른 턴의 실제 앞 응답 꼴("That's okay! Let's say it together. Listen and say!", 정규화 뒤 model_line 빈 값)에서 재호출이 null 이거나 질문이 없으면 release 가 ["That's okay!"] 이고 차례는 ai, 붙임 줄 · 소리 줄이 없다. 아이는 'I have a dog.' 에 'That's okay!' 한 줄만 듣고 물음 없이 차례가 끝난다. 고치기 전에는 같이 말하기 차례였다. 시간 모자람(canRetry 거짓) · 재호출 오류 · 질문 없는 다시 쓰기에서 생긴다. 지금 시험(`talk-prompt-fix2.test.ts:270-281`)은 앞 응답을 'Oh, a dog! Nice!' 로 두어 이 꼴을 보지 않는다 | 다시 쓰지 못하면 AI 의 막힘 판단으로 되돌려(막힘 계획으로 같은 문장을 다시 받아 settle) 고치기 전 행동을 낸다. 또는 질문 없는 ok 결과를 카드 자리로 바꾼다. 실제 꼴로 시험한다 |
| C | **잡아 두기 배선을 가르는 시험이 없다.** `lesson-turn.ts:2003-2013` · `2049` | 변이 'holdAll = true → false' 를 단위 전체로 돌려도 결과가 기준과 같다(실패 16건은 사본에 없는 CI · 마이그레이션 파일 때문이고 변이 있고 없고 같다). '1~3단계 · 범위 조건 빼기'도 회화 시험 다섯 파일에서 산다. 새 시험은 withQuestionRetry 에 rewrite 를 직접 넘겨, 서버가 언제 잡아 두고 다시 쓰는지 보지 않는다. C-1 앱 몫의 핵심 배선이 꺼져도 관문이 지난다 | onStuck 처리(무름 · 보낸 문장 0 · 단계 · 범위 · 질문 차례)를 순수 함수로 빼서 시험하거나, 가짜 AI 로 lessonTurnAfterChild 를 돌린다 |
| D | **앱 안전망이 갈래가 있으면 꺼진다.** `child-kind.ts:93` | C204 (3)은 앱이 아이 말 갈래를 순수 함수로 세어 '영어 말'의 막힘을 무르라고 하고, 브리프 할 것 1 은 '갈래가 비어도 막힘으로 안 센다'고 한다. child_kind 는 enum 필수 칸이라 structured outputs 에서 비는 때가 사실상 없다. 그래서 AI 가 'I have a dog.' 를 unrelated_words + stuck 참으로 일관되게 틀리면(C-1 본래 꼴) 앱은 막지 못하고, 두 칸이 서로 어긋날 때만 무른다. 구현자 U2 의 까닭('Blue car.' 두 낱말은 막힘)은 02-2:251 '한두 낱말'과 맞으므로 경계를 셋으로 두면 둘 다 지킨다 | 갈래와 관계없이 '영어 낱말 셋 이상 · 모름 표현 아님'이면 막힘이 아니다(02-2:251 '한두 낱말' 밖). 두 낱말은 갈래가 정한다. 맞바꿈: 한국어 말이 영어 인식기에서 영어 낱말 셋 이상으로 잘못 적히면 앱이 무르게 된다. 좁힌 읽기를 받아들이면 컨트롤러가 C204 에 한 줄로 적는다 |
| E | **카드 답 뒤 되돌림이 카드 기회 셈과 어긋난다.** `talk-lesson.ts:1405` · `1593`(카드 항목 비움), `chances.ts:127`(필수 질문은 move.item 으로만 다룬 것으로 셈), `lesson-flow.ts:334`(follow_up 이면 이어 묻기 뒤 셈 0) | 되돌림은 이름표만 바꾸고 AI 질문 글은 그대로 나간다(U5). 2회차 preview-1 6 처럼 AI 가 카드 필수 질문 글을 그대로 물으면, 아이는 들었는데 앱은 다룬 것으로 세지 않는다. slotChanceOf 는 같은 질문 상한(talk.same_question_max 2)에 닿지 않은 항목을 쓰게 두므로 뒤 카드 자리에서 같은 글이 한 번 더 나온다(요청자 '두 번씩 말함'). '모든 카드 기회 씀'이 늦어져 마무리 제안도 밀린다. 이어 묻기 뒤 셈이 0 이 되어 talk.follow_up_min_every_turns 가 실제 이어 묻기 없이 채워진다 | 최소: 카드 항목은 비우지 않는다(들린 필수 질문은 다룬 것으로 셈). 단단한 길: 1~3단계는 질문을 잡아 두므로 되돌림이 걸리면 C203 다시 쓰기 길로 '아이 답에 이어 묻기'를 한 번 쓰게 한다(설계 검토 4.2 I-2 의 D8 (나) 원안). 되돌린 횟수를 기록해 3회차에서 센다 |

### Minor

| # | 무엇이 · 왜 | 어떻게 |
|---|---|---|
| 1 | `talk-lesson.ts:789` 'A meaningful English sentence is never stuck, even about another topic: it is new_topic' 은 질문에 답한 문장도 new_topic · follow_child 로 읽힐 수 있다. follow_child 가 talk.follow_child_turns 에 닿으면 앱이 카드 자리를 만든다(02-2:194) | 'If it answers the question it is answer; if it is about something else it is new_topic …' 으로 가른다 |
| 2 | `talk-lesson.ts:531` child_kind 설명에 C204 (1)의 '한국어만'이 없다 | 'Korean words only: not_understood' 를 더한다 |
| 3 | `talk-lesson.ts:815` 설명 · 뜻 규칙은 공통 고정부라 4단계부터도 걸리는데, 까닭 '(the app plays the English as sound)' 는 4단계부터 맞지 않는다(02-2:204) | 'Levels 1-3' 으로 좁히거나 까닭을 뺀다 |
| 4 | `spoken.ts:144` 거름이 두 낱말 영어 명사('ice cream' · 'hot dog', `seed/vocab.json` 에 있음)나 쉼표 목록('eat, drink')이 든 한국어 문장을 통째로 지운다(재현함). 설명이 빈 글이 되어 안 보일 뿐 틀린 글은 아니다. 시험은 낱말 수 기준과 따옴표 구분자를 가르지 않는다(변이 생존) | 단원 단어 목록의 여러 낱말 단어를 한 낱말로 보거나, 3회차에서 빈 설명 빈도를 센다 |
| 5 | `lesson-turn.ts:2007` holdAll 이 무른 뒤 계획이 카드 자리 · 'Question: no' 여도 켜진다. 그때는 다시 쓰지 않으므로(`1445` asksQuestion 거짓) 문장만 끝까지 늦게 나간다 | asksQuestion(flow.chosen()) 일 때만 켠다 |
| 6 | `lesson-turn.ts:2007` holdAll 은 한 번 켜지면 끄지 않는다. onStuck 은 시도마다 한 번이라, 둘째 시도가 막힘이 아니어도 다시 쓰기가 돈다 | 'holdAll = overridden && …' 으로 덮어쓴다 |
| 7 | 다시 쓰기 길은 첫 응답 전체와 재호출 전체가 끝날 때까지 아무 문장도 보내지 않는다(C203 길은 반응을 1.4초에 먼저 보냄). 기다림 줄(talk.wait_line_seconds 3)이 덮는다 | 3회차에서 이 턴의 첫 문장 시간을 따로 잰다. 줄이려면 onStuck 에서 무름이 정해질 때 첫 흐름을 끊고 바로 다시 부른다 |
| 8 | `talk-lesson.ts:773` 'just react' 가 질문 없이 반응만 하라는 뜻으로 읽힐 수 있다 | 'do not say it back; just react to it' 으로 |
| 9 | `talk-prompt-fix2.test.ts:145` 입력 "dont_know" 는 실제 값이 아니다(`lesson-flow.ts:226` speech · button · nospeech) | button · nospeech 로 바꾼다 |
| 10 | `child-kind.ts:23` 2 는 C204 (3)의 숫자인데, C203 (2)처럼 '설계 숫자가 아님'이 결정 기록에 없다 | C204 에 한 마디를 적는다(Important D 와 함께) |

## 4 브리프가 물은 것의 답

1. **C-1.** 갈래 · Zod · 표본 · 옛 응답 호환(빈 값이면 안전망)은 맞다. 막힘은 not_understood · unrelated_words 만이고, 모름 표현 목록은 구 열 개와 홀로 쓰는 낱말 일곱 꼴이다('What is it?' 은 모름 아님, 시험 있음). 한국어만 · 침묵 · 단추 길은 말 입력이 아니면 AI 판단 그대로라 바뀌지 않았다(인식 글에 한글만 있으면 안전망도 영어 말로 보지 않음). 다시 쓰기와 C203 재질문은 한 번의 withQuestionRetry 안에서 메모만 갈리므로 호출은 턴당 최대 2회다. 지연은 Minor 7. 4단계부터 막힘만 무르고 다시 쓰지 않는 선택(U3)은, 아이가 막힘 꼴(같이 말하기 + 답 예시)을 그대로 듣고 기록만 '막힘 아님'이 되며 아이 말 칸도 빈다(A 와 같은 까닭). 4단계 시드 전에 정할 일로 넘긴다. 받침 셈 · stuck_phrase 는 무른 값과 맞고, 같은 질문 셈은 문장 글로 세어 영향이 없다.
2. **I-4.** 한국어 안 영어 한 낱말은 남고 따옴표 안 영어 문장은 잡는다. 시험이 가른다. 두 낱말 명사 지움은 Minor 4.
3. **I-1 · I-2.** 받침 나눔과 서버 거름은 맞다. 되돌림은 카드 기회 셈 · 이어 묻기 셈과 어긋난다(E). 참고 턴 수는 바뀌지 않고, 마무리 제안은 '모든 카드 기회 씀'이 늦어지는 만큼 밀린다.
4. **Minor 프롬프트.** M-1 · M-2 · M-4 · M-7 · 반응 예 모두 들어갔다. 문구 다듬기는 Minor 1 · 8.
5. **시험.** 5절 표. 순수 함수 · 정규화 쪽은 변이를 잡고, 서버 잡아 두기 배선은 못 잡는다(C).
6. **캐시.** 고정부 앞부분은 턴마다 바뀌지 않는다.

## 5 변이 결과(스크래치 사본, 워크트리 그대로)

| 변이 | 결과 |
|---|---|
| '말했다' 칸을 AI 막힘으로(spoke) | 잡음 |
| 갈래 무시(effectiveStuckOf 가 AI 값 그대로) | 잡음(3건) |
| 출력 child_kind 고정 · 카드 항목 비우기 뺌 · 뜻 거름 뺌 | 잡음 |
| 거름이 영어 한 낱말도 지움 · 문장 나눔을 문장부호마다 | 잡음 |
| 들리지 않음 신호 말 남김 | 잡음 |
| holdAll 끔 | **생존(단위 전체)** |
| holdAll 의 단계 · 범위 조건 뺌 | **생존(회화 시험 다섯 파일)** |
| 영어 말 낱말 수 2 → 3 | 생존 |
| 거름의 따옴표 구분자 뺌 | 생존 |

## 6 넘길 것

1. 3회차 대본의 막힘 확인 입력이 프롬프트 예와 같다('I have a dog.' · 'My dog is big.' · 'Rice.' · 'Cold.'). 예를 그대로 맞힐 수 있으므로, 예에 없는 말('I like cats.' · 'Fish.' · 'Hot.' · 'My mom is tall.')을 더해 판정한다(설계 검토자 · 컨트롤러).
2. U3(4단계부터 무름): 4단계 시드 전에 '4단계부터는 무르지 않음'과 '잡아 두고 다시 쓰기' 가운데 정한다(장부 한 줄).
3. talk:observe 가 무른 횟수 · 되돌린 횟수 · 빈 설명 빈도 · 다시 쓰기 턴의 첫 문장 시간을 세게 한다(impl-talk-13 몫).
4. 같은 워크트리의 CI 통합 고침과 이 고침을 합친 뒤 관문(biome · tsc · 단위 · check:ids)을 다시 돌린다.

## 7 덧붙임(컨트롤러 요청 2026-11-06 00:4x — 응답 규격 크기 · C203 재호출 실패 길)

워크트리 00:40 상태로 봤다. 구현자의 고침 보고는 아직 받지 않았다. 같은 워크트리에서 구현자가 이 보고의 E · Minor 1 · 2 · 3 · 8 을 고치고 있는데, 그 고침의 재검토는 보고가 오면 따로 한다.

### 7.1 Critical(첫 검토에서 놓침)

| # | 무엇이 | 왜(근거) | 상태 |
|---|---|---|---|
| C-0 | **응답 규격이 구조화 출력 문법 한도를 넘었다.** 실호출 대본 3회차 39호출이 모두 400 invalid_request_error 'The compiled grammar is too large' 였다(컨트롤러 알림) | 이 고침이 child_kind 칸을 더하자 SDK 도우미(zodOutputFormat)가 만든 $defs · $ref 꼴(사본에서 $defs 44 · 7,681자)이 한도를 넘었다. 고침 전 꼴(칸 29)은 2회차에서 받아졌다. 회화 턴이 하나도 나가지 않으므로 내보낼 수 없는 결함이다. 첫 검토는 실호출 없이 단위 시험만 보았고, 규격의 꼴 · 크기를 지키는 시험이 없어 놓쳤다 | 고침 들어옴(아래 7.2). 실호출 확인 전까지 열림 |

### 7.2 구현자 고침(규격 펼치기) 검토

구현자는 '$ref 펼치기'로 고쳤다(`src/core/ai/inline-refs.ts`). 회화 길은 `src/server/ai/talk.ts:361`(talkOutputFormatOf), 그 밖 목적은 `src/server/ai/run.ts:283`(aiOutputFormatOf), 관찰 도구는 `scripts/talk-observe.ts:480`(talkBodyOf)이 같은 함수를 쓴다.

- **규격 둘의 짝: ✅.** 보낼 꼴과 앱 Zod 규격이 같은 Zod 객체에서 나와 칸 · 필수 칸 · 차례가 같다(시험 `talk-output-schema.test.ts`). 열거값은 원래부터 SDK 도우미가 설명 글('{enum: […]}')로 옮겨 보냈다. 고침 전 next_move 도 같은 꼴이었음을 사본에서 확인했다. 그래서 '보낼 꼴은 느슨하게, 앱 Zod 는 엄격하게'는 이미 그렇게 돌고 있다. 엄격 검증이 실패하면 느슨한 규격으로 정규화하므로(`talk.ts:693-700`), 엉뚱한 child_kind 값은 턴을 깨지 않고 빈 갈래 · 안전망으로 간다.
- **크기 상한 시험: ✅ / ⚠️.** '$ref 없음' 단언이 진짜 원인을 막는다. 펼치기를 빼는 변이는 회화 길 16건 · 그 밖 7건으로 잡혔다. 다만 글자 상한(TALK_OUTPUT_SCHEMA_MAX_CHARS 6000)은 탐침으로 받은 5,785자보다 크고, 지금 보낼 꼴은 모든 단계에서 5,799자로 탐침한 꼴보다 14자 길다(child_kind 설명에 '한국어만'을 더함). 탐침에서 $ref 꼴은 3,868자에서도 거절됐으므로 글자 수는 한도를 가리는 값이 아니다. 칸 수 상한 30 은 지금 값과 같아서 칸을 하나 더하면 시험이 걸린다. 이 점은 좋다.

| # | 심각도 | 무엇이 · 왜 | 어떻게 |
|---|---|---|---|
| F | Important | **회화 밖 목적(쓰기 확인 · 첨삭 · 말하기 평가 · 생각 꺼내기)의 요청 꼴도 바꿨다**(`run.ts:283-293` · `396-401`). 그런데 실호출 확인 도구 ai-contract · ai-observe 의 withFormat(`scripts/ai-contract.ts:243-252`, `scripts/ai-observe.ts:230`)은 옛 $ref 꼴을 보낸다. 주석은 '앱 흐름 run.ts 와 같은 길'이라 하지만 더는 같지 않다. 이 목적들은 $ref 꼴로만 받아진 적이 있어서, 펼친 꼴이 실제로 받아지는지 확인한 적이 없고 계약 실호출로도 확인할 수 없다 | withFormat 이 같은 펼치기를 거치게 한다(talk-observe 의 따로 펼치기도 하나로 합쳐짐). 배포 전 목적마다 실호출 한 번으로 확인한다. 아니면 run.ts 변경을 회화 길로 좁힌다 |
| 11 | Minor | 글자 상한이 탐침 값보다 크고, 지금 꼴은 탐침하지 않은 크기다(위) | 최종 꼴로 한 번 탐침하고 그 값을 상한과 주석에 적는다 |
| 12 | Minor | `run.ts:274-283` 원래 runAiCall 의 문서 주석이 새 aiOutputFormatOf 위로 밀려, runAiCall 은 주석을 잃고 새 함수에는 주석이 둘 붙었다 | 주석 자리를 바로잡는다 |
| 13 | Minor | 흘려 받기 reader 의 갈래 값은 [a-z_] 글자만 받는다(`stream.ts` kind-value). 문법이 열거값을 막지 않으므로 다른 글자가 오면 흘려 보내기가 끊기고 끝에서 한 번에 나간다(지연) | 글 값은 다 받고 childKindOf 가 가리게 한다 |

### 7.3 C203 (3) '재호출 실패면 카드 자리' 길

- **src 에 있다.** 서버 콜백은 재호출이 실패하면 null 을 돌려준다(`lesson-turn.ts` retry 의 `if (!answer.ok) return null;`). 예외는 withQuestionRetry 의 try/catch 가 받는다(logFailure). 그 뒤 `retried`(앞 응답 그대로)로 settle 하면, 잡아 둔 질문이 검사에 다시 걸려 지워지고 question_check 카드 자리가 된다. 순수 길은 고침 1 시험(`talk-prompt-fix1.test.ts:883-901`)이 가른다. 재호출이 null 이거나 다시 쓴 질문도 걸리면 card_slot · replaced question_check 가 되고 재호출은 1회다. 가짜 서버는 규칙이 없으면 501 을 돌려주므로(`tests/fixtures/ai/fake-anthropic.ts:13` · `464-470`) 실패 결과 → null 길을 탄다. 1-가는 'AI 쉬는 중'을 기록만 하므로(`src/core/ai/failure.ts:2`) 재호출 실패가 그 상태를 켜지 않는다.
- **CI 16건의 일차 원인은 재질문이 아니다.** b462c21 이 턴 길에 선생님 문장 상한 읽기(teacherSentencesMaxOf, HEAD `lesson-turn.ts:2098`)를 넣었는데, 턴 설정 읽기(`turn.ts` turnSettings)에는 그 키가 없었다. 그래서 재질문과 관계없이 AI 차례마다 CallSettingError 가 저장 전에 나서 'end' 줄이 없었다. 다른 묶음이 turn.ts 에 키를 넣어 고쳤다.
- **⚠️ 서버 끝까지는 로컬에서 확인하지 못했다.** 사본에서 CI 고침의 시험 변경만 되돌려 돌리려 했으나, 내장 Postgres 가 ko_KR 로캘에서 initdb 에 실패했고, en_US 로 바꾸니 공유 메모리를 잡지 못했다. CI 에서 확인할 일이다.

| # | 심각도 | 무엇이 · 왜 | 어떻게 |
|---|---|---|---|
| G | Minor(넘길 것) | CI 고침이 `talk-lesson-closing.test.ts` 의 질문을 범위 안 낱말로 바꿔 재질문을 피했다. 그래서 통합 시험에는 C203 재호출 실패 길(가짜에 둘째 응답 없음 → 카드 자리 → 턴 끝)을 지나는 사례가 없다 | 그 길을 일부러 지나는 통합 사례 하나를 둔다. 가짜 501 에도 턴이 'end' 로 끝나고, ai_calls 에 question_retry 표지 실패 행이 남는지 본다 |

넘길 것 5. 1-나에서 'AI 쉬는 중'을 ai_calls 행으로 판정할 때, question_retry 표지가 붙은 실패 행을 어떻게 셀지 정한다(재호출 하나의 실패가 쉬는 중으로 번지지 않게).
