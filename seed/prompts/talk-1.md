# 생성 브리프 — 회화 1단계 수업 카드(`talk-1`)

이 파일은 회화 1단계 수업 카드 묶음의 프롬프트 판이다(정본 6.3). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 단원 하나의 회화 카드 전부(정규 · 보강 × 주제 변형)를 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 숫자와 규칙은 모두 저장소 파일에서 옮겼다. 정본에 없는 값은 '(제안)'으로 적었고 맨 끝 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 회화 1단계 카드를 처음부터 다시 만든다. 선생님 이야기(1~3 구간)는 `talk-story-1-3.md`, 회화 1단계 평가 카드는 `talk-test-1.md` 가 따로 맡는다.

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 영역 · 단계 | `talk` · 1 · CEFR Pre-A1 · 구간 `1-3` |
| 틀 | `seed/prompts/_template.md` |
| 만든 날 · 만든 이 | 2026-10-23 첫 판 · 학습 설계자(cur-p08) |
| 옮긴 곳 | `seed/level-specs.json` · `unit-specs.json` · `settings.json` · `vocab.json`(그림 키 P6b 7767df0 · 예문 넷은 2026-10-23 선생님 이름 없는 글로 고침) · `images.json` · `teachers.json`(명단 이름 — '선생님 이름' 검사 입력) · `lists/forms.json` · `lists/forbidden.json` · `lists/meta-sentences.json` · `src/core/seed/schema/talk.ts` · `schema/lesson.ts` · `check-talk.ts` · `check-lesson.ts` · `check-cross.ts` · `check-teacher.ts` · `text.ts` · `structure.ts`(회화 상수) · `src/core/vocab/allocate.ts` · p13 `src/core/ai/calls/talk.ts`(1~3단계 실시간 힌트 검사 범위) · 정본 3.2 · 3.3 회화 · 3.4 · 3.6 · 6.1 · 6.2 · 6.3 회화 카드 행 · 6.4 회화 시나리오 카드 · 선생님 이름 행 · 13절 C2 · C3 · C5 · C10 · C19 · C31 · C32 · C33 · C36 · C54 · C64 · C97 · C117 · C122 · C124 · C125 · C126 · C127 · C130 · 델타 spec `intent/2026-10-17-회화-선생님-캐릭터` FR-5 · '시드와 검증' · P6a 근거 문서(can-do · 성취기준 · 기능어 단계) · 이 판의 견본 카드 검증(12절) |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 단원 번호 | `1`(1~5) | 파일 이름, 6절에서 그 단원 찾기 |
| 뿌리 폴더 | `seed` 또는 표본 폴더 | 쓸 파일 `<뿌리>/lessons/talk/1/<단원>.json` |
| briefHash · agentHash | 소문자 16진 64자 | 모든 수업의 `generation` |
| effort | `xhigh` · `high` | `generation.effort` |
| createdOn | `2026-10-23` | `generation.createdOn` |
| revision · correction | `1` · `0` | 모든 수업 |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

`generation.model` 에는 자기 모델 ID(예: `claude-opus-5-5`)를 적는다. 파일은 하나만 쓴다.

## 2. 할 일 한눈에

1. 6절에서 이 단원의 단원 단어 · 배정표를 찾는다.
2. 주제 변형 1(묶음 1)의 카드 13장(정규 1~10 · 보강 1~3)마다 **턴 계획표**를 먼저 짠다. 인사 1턴 · 대화 14턴 · 더 이야기할 거리 5턴마다 노리는 단어 · 처음 묻는 턴인지 다시 묻는 턴인지 · 질문 글 · 그림 키를 적는다(5절 '턴 계획 규칙').
3. 계획표대로 카드 글(질문 · 힌트 · 답 두 개 · 오늘 쓸 말 · 정리 대사 …)을 쓴다.
4. 주제 변형 2(묶음 2)도 같은 칸(같은 새 단어 · 같은 턴 수)으로 만든다.
5. 파일 하나 `{ "area", "level", "unit", "lessons" }` 에 카드 26장을 넣는다. 차례는 (제안) 변형 1 의 정규 1~10 · 보강 1~3, 그다음 변형 2 다.
6. 14절 스스로 확인 → 검증 명령 → 오류 칸 고침 → 16절 보고.

## 3. 단계 규격(`level-specs` talk 1)

| 칸 | 값 |
|---|---|
| can-do | 자기 이름 · 나이 · 좋아하는 것과 그림 속 물건에 대해, 처음 듣는 질문은 선생님이 들려준 두 답에서 골라 말하고 다시 묻는 질문에는 스스로 답하며 15번 말을 주고받을 수 있다 |
| CEFR · 목표 시간 | Pre-A1 · 10분(다섯 토막의 합) |
| 문장 길이 상한 `sentenceMaxWords` | 5낱말. 카드의 모든 영어 문장마다다 — 질문 · 힌트 · 답 예시 · 답 두 개 · 오늘 쓸 말 예문 · 목표 표현 · 정리 대사 · 안전한 대사 · 끝인사 · 칭찬 대사. `{NAME}` 은 한 낱말, 축약형(`I'm` · `It's`)도 한 낱말이다. 예상 흐름(`flow`)만 이 상한 밖이다(C132 (3)) |
| 토막 `segments` | 인사 → 오늘 쓸 말 → 말해 보기 → 대화 → 정리 |
| 대화 방식 `mode` | 정해진 질문을 하나씩 · 처음 묻는 턴에 답 두 개 들려주기 |
| 목표 턴 `targetTurns` | 15 = 인사 턴 수 + 대화 턴 수 |
| 힌트 `hintTiers` | 2단 — 한국어 뜻(`hintKo`) → 영어 문장(`hintEn`, 작은 듣기 버튼이 붙는다) |
| 카드 꼴 `cardShape` | `turns` — 턴마다의 선생님 질문. 질문 목록 `questions` 칸은 두지 않는다 |
| 답 두 개 `twoAnswers` | 있다 — 인사 질문과 **모든** 대화 턴에(5절 '처음 묻는 턴과 다시 묻는 턴'). 더 이야기할 거리에는 두지 않는다 |
| 영어 틀 `frameInTurns` | 없다 — `frameEn` 칸을 두면 오류다(3단계 몫) |
| 턴 그림 `turnImages` | 있다 — 턴마다 `imageKey` 하나를 둘 수 있다 |
| 한국어 뜻 `koMeaning` | 있다 — 정리 대사 · 안전한 대사 · 끝인사 · '새 이야기로 이어 가자' 끝인사의 `ko` |
| 더 이야기할 거리 `moreTalk` | 있다 — `talk.more_talk_turns`(5)턴 |
| 미션 · 쓸 수 있는 말 | 없다 — `missions` 칸, `usablePhrases` 를 두지 않는다 |

정본 3.3 회화 단계표 1단계 행: 대화 방식 '선생님이 정해진 질문을 하나씩 한다. 아이 자신(이름 · 나이 · 좋아하는 것)과 그림 속 물건(무엇 · 색 · 크기 · 수)을 묻는다. 처음 묻는 턴에는 질문 뒤 답 두 개를 소리로 들려주고 아이가 골라 말한다' · 힌트 '2단(한국어 뜻 → 영어 문장) · 영어 문장 듣기 버튼' · 목표 턴 15 · 목표 시간 10분. 근거: 2022 개정 초3~4 성취기준 [4영02-08] · [4영02-10], CEFR Overall spoken interaction · Information exchange Pre-A1(P6a 근거 문서 can-do 표).

## 4. 단원 틀(`settings` 구간 1-3)

| 설정 키 | 값 | 뜻 |
|---|---|---|
| `unit.vocab_count.1-3` | 25 | 단원 단어 수 |
| `unit.new_words_per_lesson.1-3` | 5 | 배정 수업마다 새 단어 k |
| `unit.regular_lessons.1-3` | 10 | 정규 수업 = 배정 5 + 다지기 5 |
| `seed.remedial_per_unit.1-3` | 3 | 보강 카드 수 |
| `seed.topic_variants.1-3` | 2 | 주제 변형 수 |
| `seed.remedial_coverage.1-3` | 1 | 변형마다 보강 카드들을 합쳐 단원 단어마다 나와야 하는 횟수 |
| `talk.more_talk_turns` | 5 | 더 이야기할 거리 턴 수 |
| `talk.known_days` | 2 | 단원 단어마다 다시 묻는 턴이 나와야 하는 서로 다른 정규 카드 수 |
| `talk.said_ratio` | 0.8 | 다시 묻는 턴 자리 셈(5절)에 쓴다 |
| `seed.max_retries` | 2 | 검증 뒤 고침 회차 상한 |

코드의 정한 수(설정 키가 아니다, `structure.ts`): 인사 턴 수 1~2 · 한 턴이 노리는 단원 단어 1~2개 · 한 카드 안에서 글자가 같은 선생님 질문 2번까지 · 오늘 이야기 목록 3~5개.

수업 번호(검증기 `layout`): `assigned` 1~5 · `reinforce` 6~10 · `remedial` 1~3 · `variant` 1~2. 회화에는 알파벳 단원(단원 0)이 없다. 이 수는 설정값이라 아이가 보는 글에 적지 않는다.

## 5. 수업 구성(정본 3.3 회화)

회화 수업은 아이가 고른 회화 선생님(앱 속 AI 선생님)이 원어민 선생님처럼 이끄는 10분 수업이다. 카드 한 장이 수업 하나다. 선생님의 대답은 실시간 AI 가 쓰지만, 1단계에서 AI 는 아이 말에 대한 **반응**(바른 말로 되풀이 · 짧은 맞장구 · 칭찬 · 짧은 연결 말)만 쓰고 질문을 쓰지 않는다. 질문 · 힌트 · 답은 모두 이 카드의 것이다. 회화는 채점하지 않는다 — 틀린 말은 선생님이 바른 말로 되풀이한다. 녹음은 하지 않는다.

### 다섯 토막과 카드 칸

| 토막 | 카드 칸 | 앱이 하는 일 |
|---|---|---|
| 인사 | `greeting.questions`(1개) · `greetingTurns` 1 | 선생님이 인사하고 안부를 묻는다. 질문 뒤 답 두 개를 들려준다(1단계 인사 턴은 늘). 아이가 답하면 AI 가 짧은 넘김 말('Let's learn some new words!')을 하고 카드 질문은 붙이지 않는다 |
| 오늘 쓸 말 | `todayWords` | 새 단어마다 단어 · 한국어 뜻 · 예문을 보이고 선생님이 소개한 뒤 아이가 **단어**를 한 번 따라 말한다. 다지기 · 보강 카드는 빈 목록이고, 앱이 그 대화에 나오는 단원 단어 가운데 아직 '안다'가 아닌 것을 단어 목록 예문으로 보인다 |
| 말해 보기 | `todayWords` 의 `example` · `exampleKo` | 예문을 영어 · 뜻을 보고 한 번, 뜻만 보고 한 번 말한다. 결과 말만 보이고 넘어간다 |
| 대화 | `turns`(14턴) · `firstQuestion` · `moreTalk`(5턴) | 첫 질문은 앱이 AI 없이 보이고 읽는다. 그 뒤 턴마다 AI 반응 끝에 앱이 카드의 다음 질문(영어 · 한국어 뜻)을 붙인다. 영어 문장을 미리 보이지 않는다. 아이 차례에는 말하기 · '힌트'(`hintKo` → `hintEn`) · '잘 모르겠어요'가 있다. 처음 묻는 턴이면 질문 뒤 `twoAnswers` 를 'Or' 사이에 두고 소리로 들려주고(화면에는 글 없는 ①② 듣기 버튼), 아이가 하나를 골라 말한다. 막히면 `answerExample` 을 들려주고 같은 질문을 다시 한다. 목표 턴에 닿으면 앱이 'Do you want to talk more?' 를 붙이고, '더 이야기하기'면 `moreTalk` 를 쓴다 |
| 정리 | `closingLines` · `farewell` | 앱이 선생님이 되풀이한 바른 문장과 `closingLines` 로 되짚을 말(오늘 쓸 말 수까지)을 보이고 읽어 준다. 아이가 문장마다 한 번 따라 말한다. 끝맺음 턴이 늦으면 `farewell` 로 끝인사한다 |
| (어디서나) | `safeLines` · `praiseLines` · `safetyFarewell` · `endCondition` · `todayTopicsKo` · `topic` · `targetExpressions` · `flow` | 걸린 선생님 문장을 바꿀 대사 · 회화 턴 실패 때의 짧은 칭찬 · 80턴 안전 상한의 끝인사 · 끝맺음 조건 · 옆 칸 오늘 이야기 목록 · AI 에게 주는 주제 · 목표 표현 · 예상 흐름 |

### 처음 묻는 턴과 다시 묻는 턴

- 카드는 턴마다 `ask` 를 적는다. `first` 는 그 단원 단어를 아이에게 처음 쓰게 묻는 턴, `re_ask` 는 이미 만난 단원 단어를 다시 쓰게 묻는 턴이다.
- 앱은 이 표시를 아이 기록으로 바꾼다. 노리는 단어를 아이가 앞 회화 세션에서 만났거나 이 대화에서 이미 물었으면 다시 묻는 턴, 아니면 처음 묻는 턴이다. 그래서 다지기 · 보강 카드의 `re_ask` 턴도 아이에 따라 처음 묻는 턴이 되어 답 두 개를 들려줄 수 있다. **모든 대화 턴의 `twoAnswers` 를 처음 묻는 턴처럼 제대로 쓴다**(검증기 `talk-pairs` 는 1단계 모든 대화 턴과 인사 질문에 답 두 개를 요구한다).
- 다시 묻는 턴에서는 들려주지 않고 아이가 먼저 말해 본다. 힌트 첫 단(한국어 뜻)만 보고 말하면 '말했다'로 센다. 들려준 답 · 영어 힌트 · 답 예시를 들은 턴은 세지 않는다.

### 턴 계획 규칙(괄호는 걸리는 검증 규칙)

| 규칙 | 내용 |
|---|---|
| 인사 | (제안) `greetingTurns` 는 1 이고 `greeting.questions` 는 1개다(`talk-shape`). 두 변형의 대화 턴 수가 같아야 해서(`topic-variants`) 모든 카드를 1 로 둔다 |
| 대화 턴 수 | `turns` 14개(= 15 − 1, `talk-turns`) |
| 배정 카드(1~5) | 새 단어 5개마다 그 단어 하나만 노리는 처음 묻는 턴 하나(`ask: "first"`, `targets: [새 단어]`)를 대화 턴 1~7 안에 둔다(대화 토막 앞쪽 절반, `talk-first-ask`). 나머지 9턴은 다시 묻는 턴이다 — 이 대화에서 이미 처음 물은 새 단어와 앞 배정 수업의 단원 단어를 노린다. (제안) 처음 묻는 턴 다섯 사이에 다시 묻는 턴 둘쯤을 끼워 같은 질문 꼴이 이어지지 않게 한다. 단원의 배정 1 은 앞 단어가 없으므로 이 수업 새 단어를 다시 묻는다 |
| 다지기 카드(6~10) | 처음 묻는 턴이 없다(`talk-first-ask`). 14턴 모두 다시 묻는 턴이다. (제안) 다지기 5장을 합쳐 단원 단어 25개를 모두 노리고, 단어마다 서로 다른 다지기 카드 두 장 이상에서 노린다 |
| 보강 카드(1~3) | 처음 묻는 턴이 없다. 단원의 약한 단어를 다시 쓰게 하는 대화다. (제안) 보강 1 은 배정 1 · 2 단어, 보강 2 는 배정 3 · 4 단어, 보강 3 은 배정 5 단어와 그림 없는 단어를 몰아 노린다. 변형마다 보강 셋을 합쳐 단원 단어마다 1번 이상(`seed.remedial_coverage.1-3`) 카드 글에 나온다(`remedial-coverage`). 2번 이상을 목표로 하고 그 셈을 보고한다 |
| 다시 묻는 턴 셈 | 변형마다 정규 카드(배정 · 다지기)의 다시 묻는 턴 자리(노리는 단어 하나가 한 자리) ≥ 25 × 0.8 × 2 = 40(`talk-again-slots`). 단원 단어마다 그 단어를 다시 묻는 턴이 서로 다른 정규 카드 2장 이상에 있다(`talk-known-days`). 위 계획이면 자리가 105 이상이라 넘친다. 배정 5 의 새 단어는 배정 5 와 다지기에서 다시 묻는다 |
| 더 이야기할 거리 | `moreTalk` 5턴(`talk-more`). 모두 `re_ask`, `twoAnswers` 없음, 노리는 단어는 그 카드 `turns` 가 노린 단어 안에서만. (제안) 대화에서 덜 물은 단어를 먼저 노린다 |
| 노리는 단어 | 한 턴에 단원 단어 1~2개, 이 단원 단어만(`talk-targets`). 처음 묻는 턴은 1개(제안). 둘을 노리면 힌트 문장 하나에 둘 다 든다(예: 단원 3 다지기 `It is a red bus.` → `[red, bus]`) |
| 질문에 노리는 단어 없음 | 선생님 질문(인사 · 대화 · 더 이야기할 거리)에 그 턴이 노리는 단어가 활용형까지 없다(`talk-targets`). 예: color 를 노리는 턴에 `What color is it?` × · like 를 노리는 턴에 `What do you like?` × · name 에 `What is your name?` × · old 에 `How old are you?` × · one 에 `And this one?` × · apple 에 `An apple! How is it?` × |
| 같은 질문 | 한 카드 안에서 글자가 같은 질문은 2번까지다(인사 · 대화 · 더 이야기할 거리를 합쳐, 대소문자 · 띄어쓰기만 무시, `talk-same-question`). 질문 꼴 표(8절)의 갈래를 돌려 쓴다 |
| 뒤 수업 단어 | 배정 수업 m 의 카드는 어디에도(질문 · 힌트 · 답 · 답 두 개 · 오늘 쓸 말 예문 · 대사 · 목표 표현, (제안) 예상 흐름도) 뒤 배정 수업(m+1 이후)의 단원 단어를 쓰지 않는다(경고 `relation-early-use`). 단원 1 은 흔한 칭찬 · 대사 낱말(nice · thank · like · cute · hot)이 단원 단어라, 그 배정 수업 전 카드의 `Nice!` · `Thank you!` 도 걸린다. 다지기 · 보강은 단원 단어를 모두 쓸 수 있다 |
| 새 단어의 첫 자리 | (제안) 이 수업 새 단어는 그 단어의 처음 묻는 턴보다 앞 턴의 질문 · 힌트에 쓰지 않는다. 처음 묻는 턴이 그 단어를 처음 꺼내야 들려주기가 뜻이 있다 |
| 첫 질문 | `firstQuestion` 은 `turns[0].question.en` 과 글자까지 같다(`talk-first-question`) |

### 힌트 · 답 예시 · 답 두 개

- `hintEn`: 아이가 그대로 말할 수 있는 영어 문장 하나(5낱말 이하). 처음 묻는 턴은 그 턴의 새 단어를 담는다(`talk-first-ask`). 다시 묻는 턴도 노리는 단어를 담는다(제안).
- `hintKo`: `hintEn` 의 한국어 뜻이다. 아이가 할 말이므로 반말이다(`나는 아홉 살이야.`).
- `answerExample`: 막혔을 때 선생님이 들려줄 답 하나다. (제안) `hintEn` 과 같은 문장으로 둔다.
- 힌트 · 답 예시는 앞 턴에 아이가 어떤 답을 했어도 맞는 문장으로 쓴다. 앞 턴 답의 단어를 되받는 문장(`You like milk too!`)을 두지 않는다.
- `twoAnswers`: `[답1, 답2]`. 같은 꼴 문장에서 낱말 하나만 다르다 — 낱말 수가 같고 한 자리만 다르다(관사까지 같게: `It is an apple.` · `It is an egg.` ○, `It is a banana.` · `It is an egg.` ×). 적어도 하나는 그 턴이 노리는 단어를 담는다(처음 묻는 턴은 검증기 `talk-pairs` 가 본다). 둘 다 5낱말 이하다.
  - 아이 자신 · 좋아하는 것을 묻는 턴은 둘 다 맞는 답이다(`I am nine.` · `I am ten.` / `I like milk.` · `I like cake.`).
  - 그림 속 물건을 묻는 턴은 하나가 그림과 맞는 답이고 다른 하나는 그림과 다른 낱말이다 — 아이는 듣고 맞는 쪽을 골라 말한다. (제안) 그림과 맞는 답의 자리를 ① · ② 에 고루 나눈다. 다른 낱말은 9절의 헷갈리는 짝 · 운이 같은 낱말을 피하고, 뒤 배정 수업의 단원 단어를 쓰지 않는다.
  - 인사 질문의 답 두 개는 노리는 단어가 없다(예: `I am good.` · `I am okay.`).
- 이름(`{NAME}`)이 든 답 두 개는 이름 앞 말 하나만 다르게 쓴다(`Yes! My name is {NAME}.` · `Hi! My name is {NAME}.`).

### 그 밖의 칸

| 칸 | 쓰는 법 |
|---|---|
| `todayWords` | 배정 카드는 `newWords` 5개를 배정표 차례로(제안), 칸마다 `word` · `meaningKo`(6절 뜻 — one 만 `1, 한 개`, 10절) · `example`(그 낱말이 든 5낱말 이하 영어 한 문장 — 8절 꼴, 그림 낱말은 9절 그림과 맞게) · `exampleKo`(반말). 1단계는 말해 보기가 있어 `exampleKo` 를 모두 둔다(`talk-today`). 다지기 · 보강은 `[]` 다(새 단어와 같아야 한다) |
| `closingLines` | (제안) 3~5줄. 오늘 쓸 말(다지기 · 보강은 그 카드가 노린 단원 단어)이 든 5낱말 이하 영어 문장과 `ko`(반말). 아이가 따라 말하므로 7절 '아이 차례 영어' 범위다 |
| `targetExpressions` | (제안) 3~5개. 이 카드에서 아이가 쓰게 할 영어 문장(새 단어 · 노린 단어가 든 힌트 꼴). 화면에 보이지 않는다 |
| `flow` | (제안) 3~5줄. AI 에게 주는 대화 흐름 요약이다(아이에게 보이지 않는다). **`The teacher asks …` 꼴로 짧고 분명하게** 쓴다(6.3). 예: `The teacher says hello and asks how the child is.` · `The teacher shows fruit pictures and asks what they are.` · `The teacher asks about the child's snack.` 예상 흐름은 문장 길이 상한 · 형태 검사를 받지 않는다(C132 (3), 검증기 role `flow`). 선생님 이름 · `{TEACHER}` 는 쓰지 않는다(선생님 이름 · 금지어 검사는 예상 흐름도 본다). 줄 차례는 카드의 턴 차례를 따르고, (제안) 뒤 배정 수업 단어를 쓰지 않는다(AI 가 먼저 꺼내지 않게) |
| `todayTopicsKo` | 3~5개(`talk-today`). 아이 옆 칸에 보이는 한국어 짧은 이름꼴(`과일 이름` · `내 나이`) |
| `topic` | 한국어 한 줄. AI 에게 '카드 주제'로 간다. 단원 주제 + 묶음(`과일과 첫 인사`) |
| `title` | 한국어 10자 안팎. 단원 안 26장이 서로 다르다. 선생님 이름 · 토리를 쓰지 않는다 |
| `safeLines` | (제안) 2~3줄. 걸린 선생님 문장을 바꾸는 짧은 반응이다. 물음표가 없고, 칭찬 · 판정 말이 아니며, 노리는 단어를 담지 않는다(`Oh, okay!` · `Wow, fun!`) + `ko` |
| `praiseLines` | (제안) 3~4개. 짧은 칭찬(`Wow!` · `Good!` · `Great!` · `Yes, good!`). `ko` 칸이 없다 |
| `farewell` | 끝인사 + `ko`(`Bye, {NAME}! See you!` · `안녕, {NAME}! 또 보자!`) |
| `safetyFarewell` | '새 이야기로 이어 가자' 끝인사 + `ko`(`Let's talk again soon!` · `다음에 또 새 이야기 하자!`). 대화가 안전 상한에 닿을 때 쓴다 |
| `endCondition` | 한국어 한 줄(검토용). (제안) `대화 턴을 모두 마치면 정리로 간다.` |
| `unitWords` | 카드 영어 글(질문 · 힌트 · 답 예시 · 답 두 개 · 오늘 쓸 말 예문 · 목표 표현 · 정리 대사 · 안전한 대사 · 끝인사 · 칭찬 대사)에 나온 단원 단어 전부. 예상 흐름 · 한국어 칸은 세지 않는다 — 예상 흐름에만 나온 단어를 적으면 오류다. 빠지면 경고 `unit-words-unlisted`, 단원 밖 낱말이나 글에 없는 낱말을 적으면 오류 `unit-words` |
| `newWords` | 배정 카드는 6절 표의 5개, 다지기 · 보강은 `[]` |

## 6. 단원 규격과 배정표(`unit-specs` · 배정 함수)

배정표는 앱의 배정 함수가 단원 단어를 차례대로 k(5)개씩 나눈 결과다. `newWords` 는 표와 낱말 모음이 같아야 한다(검증기 `vocab-allocation`). 다지기 · 보강은 빈 목록이다. 괄호 안은 vocab 의 뜻이다.

### 단원 1 — 선생님과 첫 만남 · 학습 요소 'a · an + 명사'

- 단원 단어 25개(배정 차례 그대로): name, apple, egg, banana, milk, cake, candy, cookie, cheese, grape, pizza, jam, rice, snack, like, thank, cute, nice, hot, top, fan, pot, brush, lunch, thick
- 그림 없는 단원 단어(턴 그림 `imageKey` 로 둘 수 없다): name, snack, like, thank, cute, nice, hot, lunch, thick

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | name(이름, 그림 없음) · apple(사과) · egg(달걀) · banana(바나나) · milk(우유) |
| 2 | assigned | cake(케이크) · candy(사탕) · cookie(쿠키, 과자) · cheese(치즈) · grape(포도) |
| 3 | assigned | pizza(피자) · jam(잼) · rice(밥, 쌀) · snack(간식, 그림 없음) · like(좋아하다, 그림 없음) |
| 4 | assigned | thank(고마워하다, 그림 없음) · cute(귀여운, 그림 없음) · nice(좋은, 멋진, 그림 없음) · hot(뜨거운, 더운, 그림 없음) · top(팽이, 꼭대기) |
| 5 | assigned | fan(선풍기, 부채) · pot(냄비, 화분) · brush(솔, 붓) · lunch(점심, 그림 없음) · thick(두꺼운, 그림 없음) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 2 — 내 방 구경 · 학습 요소 'This is ~'

- 단원 단어 25개(배정 차례 그대로): cat, dog, pig, duck, fish, bird, rabbit, frog, sheep, puppy, fox, chicken, snake, hat, cap, sock, shoe, shirt, jacket, ball, doll, bike, kite, ring, game
- 그림 없는 단원 단어(턴 그림 `imageKey` 로 둘 수 없다): puppy, game

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | cat(고양이) · dog(개) · pig(돼지) · duck(오리) · fish(물고기) |
| 2 | assigned | bird(새) · rabbit(토끼) · frog(개구리) · sheep(양) · puppy(강아지, 그림 없음) |
| 3 | assigned | fox(여우) · chicken(닭, 닭고기) · snake(뱀) · hat(모자) · cap((챙 달린) 모자) |
| 4 | assigned | sock(양말) · shoe(신발) · shirt(셔츠) · jacket(재킷, 웃옷) · ball(공) |
| 5 | assigned | doll(인형) · bike(자전거) · kite(연) · ring(반지, 울리다) · game(놀이, 게임, 그림 없음) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 3 — 무슨 색일까 · 학습 요소 '색 · 크기 + 명사'

- 단원 단어 25개(배정 차례 그대로): red, blue, yellow, green, black, white, pink, orange, color, big, small, long, short, bus, car, ship, truck, plane, bed, bath, dish, tent, home, shop, bank
- 그림 없는 단원 단어(턴 그림 `imageKey` 로 둘 수 없다): color, big, small, long, short, home

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | red(빨간, 빨간색) · blue(파란, 파란색) · yellow(노란, 노란색) · green(초록의, 초록색) · black(검은, 검은색) |
| 2 | assigned | white(하얀, 흰색) · pink(분홍의, 분홍색) · orange(오렌지, 주황색) · color(색, 색깔, 그림 없음) · big(큰, 그림 없음) |
| 3 | assigned | small(작은, 그림 없음) · long(긴, 그림 없음) · short(짧은, 키가 작은, 그림 없음) · bus(버스) · car(자동차) |
| 4 | assigned | ship(배) · truck(트럭) · plane(비행기) · bed(침대) · bath(목욕, 욕조) |
| 5 | assigned | dish(접시, 요리) · tent(텐트) · home(집, 그림 없음) · shop(가게, 쇼핑하다) · bank(은행) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 4 — 좋아하는 것 · 학습 요소 'I like ~'

- 단원 단어 25개(배정 차례 그대로): bag, pen, pencil, book, cup, map, desk, chair, toy, drum, clock, lamp, bell, eye, ear, nose, mouth, face, hand, leg, arm, old, neck, tooth, smile
- 그림 없는 단원 단어(턴 그림 `imageKey` 로 둘 수 없다): toy, old

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | bag(가방) · pen(펜) · pencil(연필) · book(책) · cup(컵) |
| 2 | assigned | map(지도) · desk(책상) · chair(의자) · toy(장난감, 그림 없음) · drum(북, 드럼) |
| 3 | assigned | clock(시계) · lamp(램프, 전등) · bell(종) · eye(눈) · ear(귀) |
| 4 | assigned | nose(코) · mouth(입) · face(얼굴) · hand(손) · leg(다리) |
| 5 | assigned | arm(팔) · old(~살의, 늙은, 그림 없음) · neck(목) · tooth(이, 이빨) · smile(미소, 웃다) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 5 — 나이와 숫자 · 학습 요소 '수 + 복수 -s'

- 단원 단어 25개(배정 차례 그대로): one, two, three, four, five, six, seven, eight, nine, ten, tall, little, thin, sun, tree, flower, rock, lake, sand, rose, shell, king, swing, wing, song
- 그림 없는 단원 단어(턴 그림 `imageKey` 로 둘 수 없다): tall, little, thin, song

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | one(1, 하나) · two(2, 둘) · three(3, 셋) · four(4, 넷) · five(5, 다섯) |
| 2 | assigned | six(6, 여섯) · seven(7, 일곱) · eight(8, 여덟) · nine(9, 아홉) · ten(10, 열) |
| 3 | assigned | tall(키가 큰, 높은, 그림 없음) · little(작은, 어린, 그림 없음) · thin(얇은, 마른, 그림 없음) · sun(해, 태양) · tree(나무) |
| 4 | assigned | flower(꽃) · rock(바위, 돌) · lake(호수) · sand(모래) · rose(장미) |
| 5 | assigned | shell(조개껍데기) · king(왕) · swing(그네, 흔들다) · wing(날개) · song(노래, 그림 없음) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

## 7. 단계 어휘 범위(vocab 1단계)

검증기는 회화 카드 글의 어휘 범위를 세지 않는다. 그래서 아래 범위는 생성자가 지키고 14절 스스로 확인 명령으로 본다.

| 글 칸 | 쓸 수 있는 낱말 |
|---|---|
| 아이 차례 영어 — `hintEn` · `answerExample` · `twoAnswers` · 오늘 쓸 말 `example` · `closingLines` · `targetExpressions`(인사 · 대화 · 더 이야기할 거리 모두) | 아래 1단계 낱말(활용형 포함) · 이 단원 단어 · `{NAME}` 만. 1~3단계 실시간 AI 힌트 검사(6.4 — 그 단계 이하 vocab · 단원 단어 · `{NAME}`)와 같은 자다. 카드 힌트가 AI 힌트를 대신하므로 같은 범위로 쓴다. 수는 영어 낱말로 쓴다(`nine` ○ · `9` × — 숫자는 낱말로 세지 않아 노리는 단어가 글에 없는 것이 된다). (제안) 인사 질문의 힌트 · 답 · 답 두 개에만 good · fine · great 를 더 쓴다 |
| 선생님 쪽 영어 — 질문 · `firstQuestion` · `praiseLines` · `safeLines` · `farewell` · `safetyFarewell` | 위와 같은 범위 + (제안) 수업 말 여덟 good · great · fun · see · soon · again · let's · talk(`Let's talk again soon!` · `Wow, fun!` · `See you!`). 질문은 아이가 듣고 한국어 뜻으로 알아들어야 하므로 이 밖의 낱말을 쓰지 않는다 |
| 예상 흐름 `flow` | AI 에게 주는 지시 글이라 낱말 범위를 따지지 않는다 |

흔한 낱말도 2단계 이상이면 쓰지 않는다(위 예외 밖). 2단계: have · can · very · here · play · run · jump · want · mom · dad · friend · good · great · fine · happy · fun · new · sorry · teacher · with · for · at · of · or. 3단계: see · look · eat · go · where · who · there · we · they · number · picture · talk · learn · let's. 4단계: too · day · so · today · again · favorite · word · story · its · his · her · right · soon. 6단계: year. purple · brown(6단계) · yummy 는 쓰지 않는다.

- **or 는 2단계 낱말이다.** 고르는 질문(`Red or blue?`)은 2단계 몫이다(P6a 근거 문서 기능어 단계). 1단계 질문은 두 이름을 물음표로 늘어놓는다(`Milk? Cake?`). 답 두 개 사이의 'Or' 는 앱이 읽는다.

**기능어 32개**: `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 [am, is, are, was, were, been, being] · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) [does, did, done, doing] · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의

- **회화 단원 1 (선생님과 첫 만남)**: `name` 이름 [names] · `apple` 사과 [apples] · `egg` 달걀 [eggs] · `banana` 바나나 [bananas] · `milk` 우유 · `cake` 케이크 [cakes] · `candy` 사탕 [candies] · `cookie` 쿠키, 과자 [cookies] · `cheese` 치즈 [cheeses] · `grape` 포도 [grapes] · `pizza` 피자 [pizzas] · `jam` 잼 [jams] · `rice` 밥, 쌀 · `snack` 간식 [snacks] · `like` 좋아하다 [likes, liked, liking] · `thank` 고마워하다 [thanks, thanked, thanking] · `cute` 귀여운 [cuter, cutest] · `nice` 좋은, 멋진 [nicer, nicest] · `hot` 뜨거운, 더운 [hotter, hottest] · `top` 팽이, 꼭대기 [tops] · `fan` 선풍기, 부채 [fans] · `pot` 냄비, 화분 [pots] · `brush` 솔, 붓 [brushes, brushed, brushing] · `lunch` 점심 · `thick` 두꺼운 [thicker, thickest]
- **회화 단원 2 (내 방 구경)**: `cat` 고양이 [cats] · `dog` 개 [dogs] · `pig` 돼지 [pigs] · `duck` 오리 [ducks] · `fish` 물고기 · `bird` 새 [birds] · `rabbit` 토끼 [rabbits] · `frog` 개구리 [frogs] · `sheep` 양 · `puppy` 강아지 [puppies] · `fox` 여우 [foxes] · `chicken` 닭, 닭고기 [chickens] · `snake` 뱀 [snakes] · `hat` 모자 [hats] · `cap` (챙 달린) 모자 [caps] · `sock` 양말 [socks] · `shoe` 신발 [shoes] · `shirt` 셔츠 [shirts] · `jacket` 재킷, 웃옷 [jackets] · `ball` 공 [balls] · `doll` 인형 [dolls] · `bike` 자전거 [bikes] · `kite` 연 [kites] · `ring` 반지, 울리다 [rings, rang, rung, ringing] · `game` 놀이, 게임 [games]
- **회화 단원 3 (무슨 색일까)**: `red` 빨간, 빨간색 [reds] · `blue` 파란, 파란색 [blues] · `yellow` 노란, 노란색 [yellows] · `green` 초록의, 초록색 [greens] · `black` 검은, 검은색 [blacks] · `white` 하얀, 흰색 [whites] · `pink` 분홍의, 분홍색 [pinks] · `orange` 오렌지, 주황색 [oranges] · `color` 색, 색깔 [colors] · `big` 큰 [bigger, biggest] · `small` 작은 [smaller, smallest] · `long` 긴 [longer, longest] · `short` 짧은, 키가 작은 [shorter, shortest] · `bus` 버스 [buses] · `car` 자동차 [cars] · `ship` 배 [ships] · `truck` 트럭 [trucks] · `plane` 비행기 [planes] · `bed` 침대 [beds] · `bath` 목욕, 욕조 [baths] · `dish` 접시, 요리 [dishes] · `tent` 텐트 [tents] · `home` 집 [homes] · `shop` 가게, 쇼핑하다 [shops, shopped, shopping] · `bank` 은행 [banks]
- **회화 단원 4 (좋아하는 것)**: `bag` 가방 [bags] · `pen` 펜 [pens] · `pencil` 연필 [pencils] · `book` 책 [books] · `cup` 컵 [cups] · `map` 지도 [maps] · `desk` 책상 [desks] · `chair` 의자 [chairs] · `toy` 장난감 [toys] · `drum` 북, 드럼 [drums] · `clock` 시계 [clocks] · `lamp` 램프, 전등 [lamps] · `bell` 종 [bells] · `eye` 눈 [eyes] · `ear` 귀 [ears] · `nose` 코 [noses] · `mouth` 입 [mouths] · `face` 얼굴 [faces] · `hand` 손 [hands] · `leg` 다리 [legs] · `arm` 팔 [arms] · `old` ~살의, 늙은 [older, oldest] · `neck` 목 [necks] · `tooth` 이, 이빨 [teeth] · `smile` 미소, 웃다 [smiles, smiled, smiling]
- **회화 단원 5 (나이와 숫자)**: `one` 1, 하나 · `two` 2, 둘 · `three` 3, 셋 · `four` 4, 넷 · `five` 5, 다섯 · `six` 6, 여섯 · `seven` 7, 일곱 · `eight` 8, 여덟 · `nine` 9, 아홉 · `ten` 10, 열 · `tall` 키가 큰, 높은 [taller, tallest] · `little` 작은, 어린 · `thin` 얇은, 마른 [thinner, thinnest] · `sun` 해, 태양 [suns] · `tree` 나무 [trees] · `flower` 꽃 [flowers] · `rock` 바위, 돌 [rocks] · `lake` 호수 [lakes] · `sand` 모래 · `rose` 장미 [roses] · `shell` 조개껍데기 [shells] · `king` 왕 [kings] · `swing` 그네, 흔들다 [swings, swung, swinging] · `wing` 날개 [wings] · `song` 노래 [songs]
- **회화 단원 밖의 1단계 낱말(읽기 · 쓰기 알파벳 단원 낱말 — 범위 안이지만 회화 단원 단어가 아니다)**: `ant` 개미 [ants] · `bear` 곰 [bears] · `box` 상자 [boxes] · `cow` 소 [cows] · `door` 문 [doors] · `elephant` 코끼리 [elephants] · `fork` 포크 [forks] · `guitar` 기타 [guitars] · `horse` 말 [horses] · `insect` 곤충 [insects] · `juice` 주스 · `key` 열쇠 [keys] · `lion` 사자 [lions] · `monkey` 원숭이 [monkeys] · `nurse` 간호사 [nurses] · `octopus` 문어 [octopuses] · `piano` 피아노 [pianos] · `queen` 여왕 [queens] · `robot` 로봇 [robots] · `star` 별 [stars] · `tiger` 호랑이 [tigers] · `umbrella` 우산 [umbrellas] · `violin` 바이올린 [violins] · `window` 창문 [windows] · `yo-yo` 요요 [yo-yos] · `zebra` 얼룩말 [zebras]

내용어는 모두 151개다.

## 8. 학습 요소 범위와 문장 꼴(정본 3.6 · C64)

수업 글은 앞 단계 전부, 같은 단계의 앞 단원, 이번 단원의 요소만 쓴다(C64 (1)). 1단계 다섯 요소는 단원 차례대로 `a · an + 명사` / `This is ~` / `색 · 크기 + 명사` / `I like ~` / `수 + 복수 -s` 다. 검증기의 형태 표에는 1단계 요소 검출기가 없다. 그래서 아래 꼴은 생성자가 스스로 지킨다.

회화에만 더하는 것(제안):

- 3.3 회화 1단계 행이 묻게 하는 것(이름 · 나이 · 좋아하는 것 · 그림 속 물건의 무엇 · 색 · 크기 · 수)의 질문 꼴은 C64 (3)대로 검출하지 않고 쓴다 — `What is it?` · `How is it?` · `What color is it?` · `How old are you?` · `How many legs?` · `Are you {NAME}?` · `What do you like?`(단원 4~).
- 회화 단원 1 단어에 name · like · thank · nice · cute · hot · thick · snack · lunch 가 들어 있다. 그래서 그 낱말이 배정되는 수업부터 그 낱말이 쓰이는 꼴을 쓴다: `My name is {NAME}.`(배정 1~) · `I like ~.` · `My snack is ~.`(배정 3~) · `Thank you!` · `It is hot.` · `It is cute.` · `It is nice.`(배정 4~) · `It is thick.` · `My lunch is ~.`(배정 5~). 단원 2 부터는 앞 단원 꼴이라 모두 쓸 수 있다.

| 단원 | 쓸 수 있는 답 꼴(앞 단원 꼴에 더한다) | 질문 꼴 |
|---|---|---|
| 1 | `It is a/an ~.` · `It is milk.`(셀 수 없는 것) · `Oh, grapes!` · 위 단원 1 낱말 꼴 | it 갈래 · 어때 갈래(배정 4~) · 이름 · 늘어놓기 · 건네기(배정 4~) |
| 2 | `This is a/an ~.` · `This is my ~.` · `That is a/an ~.` · `It is a puppy.` | 위 + this · that 갈래 |
| 3 | `It is red.` · `It is a red ~.` · `The ~ is big.` · `I like the color red.`(color 배정 2~) | 위 + 색 갈래(배정 2~). 배정 1 은 색 동그라미 그림과 it · this 갈래로 묻는다(color 가 배정 2 새 단어라 배정 1 에서 `What color` 를 쓰지 않는다) |
| 4 | `I like the ~.` · `I like my ~.` · `I like it.` · `This is my nose.` · `It is old.`(old 배정 5~) | 위 + `What do you like?` |
| 5 | `It is five.`(숫자 그림) · `I am nine.` · `Two legs.` · `I like songs.` · `It is tall.` | 위 + 나이 · 셈 갈래 |

질문 꼴 갈래. 한 카드에 글자가 같은 질문은 2번까지라 갈래 안에서 돌려 쓴다. 그림 이름을 앞에 붙인 질문(`A kite! And this?`)은 그림 이름이 노리는 단어가 아닐 때만 쓴다.

| 갈래 | 단원 | 꼴 |
|---|---|---|
| it 갈래(그림이 '그것'을 보인다) | 1~ | `What is it?` · `Oh, what is it?` · `Wow, what is it?` · `Okay! What is it?` · `What is it, {NAME}?` · `{NAME}, what is it?` |
| this · that 갈래 | 2~ | `What is this?` · `What is that?` · `Oh! What is that?` · `Wow! What is this?` · `And this?` · `And this one?`(one 을 노리지 않을 때) · `A kite! And this?` |
| 어때 갈래 | 형용사 낱말이 배정된 수업부터 | `How is it?` · `How is the pizza?` · `Oh, how is the book?`(물건 그림을 둔다) |
| 색 갈래 | 단원 3 배정 2~ | `What color is it?` · `What color is the bus?`(color 를 노리지 않는 턴) |
| 이름 | 1~ | `Are you {NAME}?` · `Oh! Are you {NAME}?` · `Hi! Are you {NAME}?`(아이 이름은 앱이 이미 안다 — 확인하듯 묻고 이름을 대게 하지 않는다) |
| 나이 | 5 | `How old are you?`(old 는 단원 4 단어라 단원 5 에서 쓴다) |
| 셈 | 5 | `A dog. How many legs?` · `A bird. How many legs?` · `A cat. How many eyes?`(상식으로 답한다 — 숫자 그림 셈이 아니다) |
| 늘어놓기 | 1~ | `Milk? Cake?` · `Candy? Cheese?`(고르는 말 — like · snack · lunch · color · song · game 을 노리는 턴) |
| 건네기 | 1 배정 4~ | `Your cookie, {NAME}!` · `Your milk, {NAME}!`(thank 를 노리는 턴, 물음표 없이 건네는 말 — 앞 낱말을 바꿔 글자가 겹치지 않게) |
| 좋아하는 것 | 4~ | `What do you like?` · `Oh, what do you like?` |
| 인사 | 모든 카드 | `Hi, {NAME}! How are you?` · `Hello, {NAME}! How are you?` |

그림 없는 낱말과 질문에 넣을 수 없는 낱말의 꼴(제안):

| 낱말(단원) | 질문 | 힌트 · 답 두 개 |
|---|---|---|
| name(1) | `Are you {NAME}?` | `Yes! My name is {NAME}.` · `Hi! My name is {NAME}.` |
| like(1) | `Milk? Cake?` | `I like milk.` · `I like cake.` |
| snack(1) | `Candy? Cheese?` | `My snack is candy.` · `My snack is cheese.` |
| lunch(1) | `Rice? Pizza?` | `My lunch is rice.` · `My lunch is pizza.` |
| thank(1) | `Your cookie, {NAME}!` | `Oh, thank you!` · `Wow, thank you!` |
| hot · cute · nice · thick(1) | `How is the pizza?`(pizza 그림) · `How is the book?`(book 그림) | `It is hot.` · `It is nice.` / `It is thick.` · `It is big.` |
| grape(1) | it 갈래(송이 그림) | `Oh, grapes!` · `Oh, apples!`(배정 3~ 는 `I like grapes.`) |
| puppy(2) | `A little dog! What is it?` | `It is a puppy.` · `It is a dog.` |
| game(2) | `Ball? Kite?` | `I like this game.` · `I like this ball.` |
| color(3) | `Red? Blue?` | `I like the color red.` · `I like the color blue.` |
| big · small · long · short(3) | `How is the bus?`(bus 는 배정 3~ — 그 전에는 단원 밖 그림 낱말) | `It is big.` · `It is small.` |
| home(3) | it 갈래(그림 키 `house`, 17절) | `It is my home.` · `It is my shop.` |
| toy(4) | `A robot! What is this?`(robot 그림) | `This is my toy.` · `This is my bag.` |
| old(4) | `How is the book?` | `It is old.` · `It is nice.` |
| 몸 낱말(4) | this · that 갈래(그 몸 그림) | `This is my nose.` · `This is my ear.` |
| one~ten(5) | it 갈래(숫자 키캡 그림) · 나이 · 셈 | `It is five.` · `It is four.` / `I am nine.` · `I am ten.` / `Four legs.` · `Two legs.` |
| tall · little · thin(5) | `How is the tree?`(tree 는 배정 3 새 단어 — 그 전에는 다른 그림) | `It is tall.` · `It is little.` |
| song(5) | `Songs? Books?` | `I like songs.` · `I like books.` |

관사 · 수 · 그림(제안 — 그림이 붙는 턴 · 오늘 쓸 말 예문):

| 낱말 | 쓰는 꼴 | 쓰지 않는 꼴 |
|---|---|---|
| milk · rice · sand · jam(컵 · 밥 · 더미 · 병 그림, 셀 수 없게) | 관사 없이 `It is milk.` · `I like rice.` | `a milk` · `It is a rice.` · `milks` |
| cake · pizza · cheese(한 조각 그림) | 그림이 붙는 문장은 관사 없이 `It is cake.` · `It is pizza.` | 그림이 붙는 문장의 `It is a cake.` |
| candy(사탕 하나 그림) | `It is candy.` · `It is a candy.` 둘 다 | — |
| sun | `the sun`(`It is the sun.`) | `a sun` |
| grape(송이 그림) | 복수 `grapes`(`Oh, grapes!` · `I like grapes.`). 복수 -s 는 단원 5 요소지만 그림과 맞추려고 이 낱말만 먼저 쓴다 | `a grape` · `It is a grape.` |
| 셀 수 있는 명사 + like(단원 1~4) | `I like the apple.` · `I like my bag.` · `I like it.` | 복수 `I like apples.`(복수 -s 는 단원 5. grapes 는 위 예외) |

검증기가 오류로 잡는 꼴. 1단계에서는 형태 표(`forms.json` 58개)의 모든 형태가 범위 밖이다(예상 흐름만 검사 밖). 아래 예는 실제 검출기로 대조했다.

| 꼴 | 걸리는 예 |
|---|---|
| he · she · we · they | `He is big.` · `We like dogs.` |
| have · has · can · can't | `I have a cat.` · `I can see a dog.` |
| There is · Let's | `There is a cat.` · `Let's go.` — `Let's talk` · `Let's learn` 은 걸리지 않는다 |
| be 부정(isn't · is not + 낱말) | `It is not a cat.` 짧은 답 `No, it isn't.` 은 걸리지 않는다 |
| 진행형 · 동명사 · 규칙 과거 -ed | `I am smiling.` · `I like swinging.` · `I liked it.` |
| 3인칭 동사(낱말만으로 걸리는 것) | `says` · `asks` · `sees` · `reads` 등 — 주어가 무엇이든 걸린다 |
| some · at + 수(시각) | `Some apples.` · `It is at five.` |
| 그 밖 | don't · does · was · were · because · will · 비교급 등 4단계 이상 꼴 |

검출기가 못 잡지만 쓰지 않는 꼴: 3인칭 단수 -s(`Momo likes cake.`, 4단계 단원 1) · 명령문(`Look at ~` · `Say ~` · `Touch ~`, 3단계 단원 4) · 문장을 잇는 and · or · but · `Is it ~?` · `Do you ~?`(이름 턴의 `Are you {NAME}?` 와 단원 4~ 의 `What do you like?` 만 위 표대로 쓴다) · Where · Who 의문문.

## 9. 그림 규칙

- 턴 그림 `imageKey` 는 아래 표의 그림 키만 쓴다(검증기 `talk-images`). (제안) home 을 노리는 턴만 2단계 낱말 house 의 그림 키 `house`(집 그림)를 쓴다 — home 은 그림이 없고 집 그림이 그 뜻을 보인다.
- 노리는 단어가 그림 있는 낱말이면 그 턴에 그 낱말의 그림을 둔다(C32). it · this · that 갈래 질문의 턴은 반드시 그림을 둔다 — 그림이 '그것'이다. 그림 없는 낱말(6절)을 노리는 턴은 질문이 가리키는 물건의 그림(`How is the pizza?` 에 pizza)을 두거나 그림을 두지 않는다.
- 그림이 붙는 글(질문 · 힌트 · 답 두 개 · 오늘 쓸 말 예문)은 그림의 색 · 모습과 맞춘다. 표의 '그림 · 맞출 것' 칸에 색이 없으면 색을 붙이지 않는다. '색을 말하지 않는다'고 적힌 낱말(grape · shell · wing · chair · bus · duck · rabbit · hat · ball · cow · door · octopus)에도 붙이지 않는다.
- 그림 한 장은 물건 하나다. 수 낱말(one~ten)의 그림은 숫자 키캡이다. 'How many' 를 그림으로 묻지 않는다(셈 갈래는 상식으로 답한다).
- 색 낱말(red~orange)의 그림은 색 동그라미다. 단원 3 배정 1 의 색 턴은 이 그림으로 묻는다. 물건 그림으로 색을 다시 물을 때는 힌트에 색과 물건을 함께 둔다(`It is a red bike.`).
- 답 두 개의 '그림과 다른 낱말'은 소리로 가려져야 한다. 운이 같은 낱말(끝소리가 같고 첫소리만 다른 낱말)을 짝으로 두지 않는다. 예: swing · wing · king · ring, cake · lake · snake, rock · sock · clock, cat · hat, pen · ten, bed · red, fan · can.
- 헷갈리는 그림 짝도 답 두 개 짝으로 두지 않는다(P6b 검토 I-4 · N-4). 1단계에 닿는 짝: hat · cap, cup · milk, face · smile, face · neck, ant · insect, girl · doll, leg · knee, hand · finger, arm · strong, cup · water, jacket · coat.
- 몸 낱말(eye · ear · nose · mouth · face · hand · leg · arm · neck · tooth · smile)은 그림 속 몸이나 상식으로만 묻는다. 아이의 생김새를 평가하게 묻지 않는다(`Is your nose big?` ×).
- 예문 칸은 그림 색 · 모습의 참고다. 단원 꼴(8절)에 맞지 않으면 그대로 쓰지 않는다.

그림이 있는 1단계 낱말 128개(아래 표 밖의 낱말은 턴 그림으로 둘 수 없다. 예외는 위 house 하나). 회화 단원 단어를 단원 차례로, 그다음 단원 밖 낱말을 둔다.

| 낱말 | 그림 키 | 그림 · 맞출 것 | 그림과 맞는 예문(vocab) |
|---|---|---|---|
| apple | `apple` | 빨간 사과(RED APPLE) | It is an apple. |
| egg | `egg` | 달걀 | This is an egg. |
| banana | `banana` | 바나나 | I like bananas. |
| milk | `milk` | 컵에 든 우유(GLASS OF MILK) | Milk, please. |
| cake | `cake` | 조각 케이크(SHORTCAKE) | The cake is big. |
| candy | `candy` | 사탕 | I like candy. |
| cookie | `cookie` | 쿠키 | This cookie is big. |
| cheese | `cheese` | 노란 치즈 조각(CHEESE WEDGE, 예문 The cheese is yellow.) | The cheese is yellow. |
| grape | `grape` | 보라 포도 — 색을 말하지 않는다(purple 은 범위 밖) | I like grapes. |
| pizza | `pizza` | 피자 한 조각 | Pizza, please! |
| jam | `jam` | 빨간 잼이 든 뚜껑 덮인 유리병 | I like jam. |
| rice | `rice` | 밥(COOKED RICE) | I like rice. |
| top | `top` | 빨간 나무 팽이(꼭대기 뜻 아님) | This top is red. |
| fan | `fan` | 빨간 접는 부채(선풍기 아님) | The fan is red. |
| pot | `pot` | 뚜껑 덮인 빈 냄비(화분 아님) | The pot is hot. |
| brush | `brush` | 붓(칫솔 · 빗 아님) | It is my brush. |
| cat | `cat` | 고양이 | This is my cat. |
| dog | `dog` | 개 | My dog is big. |
| pig | `pig` | 돼지 | This is a pig. |
| duck | `duck` | 청둥오리(초록 머리 · 갈색 몸) — 색을 말하지 않는다 | This is a duck. |
| fish | `fish` | 물고기 | I like fish. |
| bird | `bird` | 빨간 새 | The bird is red. |
| rabbit | `rabbit` | 회색 토끼 — 색을 말하지 않는다(흰 토끼 아님) | The rabbit is cute. |
| frog | `frog` | 개구리 얼굴(FROG FACE) | Is it a frog? |
| sheep | `sheep` | 양 | I like sheep. |
| fox | `fox` | 주황 여우 얼굴(FOX FACE, 예문 The fox is orange.) | The fox is orange. |
| chicken | `chicken` | 살아 있는 닭(닭고기 아님) | This is a chicken. |
| snake | `snake` | 초록 뱀(예문 The snake is green.) | The snake is green. |
| hat | `hat` | 밀짚모자 — 색을 말하지 않는다 | This is my hat. |
| cap | `cap` | 파란 야구 모자(예문 My cap is blue.) | My cap is blue. |
| sock | `sock` | 파란 양말(노란 줄) | My socks are blue. |
| shoe | `shoe` | 빨간 운동화(예문 I like the red shoes.) | I like the red shoes. |
| shirt | `shirt` | 파란 티셔츠 | My shirt is blue. |
| jacket | `jacket` | 파란 외투 그림(🧥 COAT, 예문 My jacket is blue.) | My jacket is blue. |
| ball | `ball` | 빨강 · 파랑 · 노랑 띠의 고무공 — 한 색으로 말하지 않는다 | The ball is big. |
| doll | `doll` | 헝겊 인형 | My doll is cute. |
| bike | `bike` | 빨간 자전거 | It is a red bike. |
| kite | `kite` | 파란 연 | It is a blue kite. |
| ring | `ring` | 반지 | It is a small ring. |
| red | `red` | 빨간 동그라미(색 뜻) | This is a red apple. |
| blue | `blue` | 파란 동그라미(색 뜻) | My bag is blue. |
| yellow | `yellow` | 노란 동그라미(색 뜻) | The banana is yellow. |
| green | `green` | 초록 동그라미(색 뜻) | The frog is green. |
| black | `black` | 검은 동그라미(색 뜻) | My cat is black. |
| white | `white` | 흰 동그라미(색 뜻, 자체 그림) | The sheep is white. |
| pink | `pink` | 분홍 동그라미(색 뜻) | The pig is pink. |
| orange | `orange` | 주황 동그라미(색 뜻, 과일 아님) | My cat is orange. |
| bus | `bus` | 회색 · 파랑 버스 — 색을 말하지 않는다 | It is a big bus. |
| car | `car` | 자동차(AUTOMOBILE) | This is a toy car. |
| ship | `ship` | 배 | The ship is big. |
| truck | `truck` | 배달 트럭 | It is a big truck. |
| plane | `plane` | 흰 비행기(예문 The plane is white.) | The plane is white. |
| bed | `bed` | 침대 | My bed is small. |
| bath | `bath` | 욕조(BATHTUB) | The bath is hot. |
| dish | `dish` | 음식 없는 둥근 흰 접시 | The dish is hot. |
| tent | `tent` | 텐트 | It is a big tent. |
| shop | `shop` | 줄무늬 차양 · 진열창이 있는 작은 가게 | It is a toy shop. |
| bank | `bank` | 은행 건물 | It is a bank. |
| bag | `bag` | 책가방(SCHOOL SATCHEL) | This is my bag. |
| pen | `pen` | 검은 볼펜(예문 It is a black pen.) | It is a black pen. |
| pencil | `pencil` | 연필 | This is my pencil. |
| book | `book` | 펼친 책 | I like this book. |
| cup | `cup` | 손잡이 달린 빈 머그컵 | The cup is small. |
| map | `map` | 세계 지도 | This is a map. |
| desk | `desk` | 서랍 달린 학생 책상(위에 아무것도 없음) | This is my desk. |
| chair | `chair` | 갈색 나무 의자 — 색을 말하지 않는다(brown 은 1단계 밖) | This is my chair. |
| drum | `drum` | 북과 북채 | I like the drum. |
| clock | `clock` | 자명종 시계 | It is a big clock. |
| lamp | `lamp` | 불이 켜진 책상 스탠드 등 | This lamp is small. |
| bell | `bell` | 종 | It is a little bell. |
| eye | `eye` | 눈 하나 | My eyes are big. |
| ear | `ear` | 사람 귀 | My ears are big. |
| nose | `nose` | 코 | My nose is small. |
| mouth | `mouth` | 입술 | My mouth is big. |
| face | `face` | 앞을 보는 아이 얼굴, 다문 입의 무표정(빨갛지 않고 웃지 않음) | This is my face. |
| hand | `hand` | 손바닥을 든 손(RAISED HAND) | My hands are small. |
| leg | `leg` | 사람 다리 | My legs are long. |
| arm | `arm` | 어깨에서 손끝까지 뻗은 팔 하나 | My arms are long. |
| neck | `neck` | 아이 윗몸에서 목을 빨간 점선 동그라미로 둘러쌈(얼굴이 보임) | My neck is short. |
| tooth | `tooth` | 흰 이 하나(예문 My tooth is white.) | My tooth is white. |
| smile | `smile` | 웃는 얼굴(SMILING FACE WITH SMILING EYES) | I like your smile. |
| one | `one` | 숫자 키캡 1(물건 1개 그림 아님) | This is one egg. |
| two | `two` | 숫자 키캡 2(물건 2개 그림 아님) | I like two dogs. |
| three | `three` | 숫자 키캡 3(물건 3개 그림 아님) | Three cats are cute. |
| four | `four` | 숫자 키캡 4(물건 4개 그림 아님) | Four apples, please. |
| five | `five` | 숫자 키캡 5(물건 5개 그림 아님) | Five fish are red. |
| six | `six` | 숫자 키캡 6(물건 6개 그림 아님) | Six eggs, please. |
| seven | `seven` | 숫자 키캡 7(물건 7개 그림 아님) | I like seven cookies. |
| eight | `eight` | 숫자 키캡 8(물건 8개 그림 아님) | Eight balls are blue. |
| nine | `nine` | 숫자 키캡 9(물건 9개 그림 아님) | I am nine. |
| ten | `ten` | 숫자 키캡 10(물건 10개 그림 아님) | I am ten. |
| sun | `sun` | 빛살 있는 해 | The sun is hot. |
| tree | `tree` | 잎 넓은 나무 | It is a big tree. |
| flower | `flower` | 흰 꽃잎 꽃 | This flower is white. |
| rock | `rock` | 바위 | The rock is big. |
| lake | `lake` | 풀 · 나무로 둘러싸인 파란 호수 | The lake is blue. |
| sand | `sand` | 연노랑 모래 더미 | The sand is hot. |
| rose | `rose` | 빨간 장미(예문 The rose is red.) | The rose is red. |
| shell | `shell` | 회백 소라 껍데기 — 색을 말하지 않는다 | I like this shell. |
| king | `king` | 왕관 · 수염 · 빨간 망토의 동화 속 왕 윗몸 | The king is tall. |
| swing | `swing` | 빨간 자리의 빈 그네 | The swing is red. |
| wing | `wing` | 회백 날개 — 색을 말하지 않는다 | The bird wings are big. |
| ant | `ant` | 개미(insect 와 짝 피함) | An ant is small. |
| bear | `bear` | 곰 얼굴(BEAR FACE) | The bear is big. |
| box | `box` | 소포 상자(PACKAGE) | It is a big box. |
| cow | `cow` | 흰 바탕에 검은 점 소 — 색을 말하지 않는다 | The cow is big. |
| door | `door` | 갈색 문 — 색을 말하지 않는다 | The door is big. |
| elephant | `elephant` | 코끼리 | It is an elephant. |
| fork | `fork` | 세워 놓은 포크 하나 | This is my fork. |
| guitar | `guitar` | 기타 | I like the guitar. |
| horse | `horse` | 말 | The horse is tall. |
| insect | `insect` | 초록 곤충 한 마리(세 마디 · 다리 여섯, 개미 꼴 아님) | It is an insect. |
| juice | `juice` | 종이팩 음료(BEVERAGE BOX) | Juice, please! |
| key | `key` | 열쇠 | This is my key. |
| lion | `lion` | 사자 얼굴(LION FACE) | Is it a lion? |
| monkey | `monkey` | 원숭이 | The monkey is cute. |
| nurse | `nurse` | 간호사 모자 · 분홍 간호복의 윗몸 | The nurse is nice. |
| octopus | `octopus` | 보라 문어 — 색을 말하지 않는다 | It is an octopus. |
| piano | `piano` | 건반(MUSICAL KEYBOARD, 예문 The piano is black.) | The piano is black. |
| queen | `queen` | 왕관 · 긴 머리 · 보라 드레스의 동화 속 여왕 윗몸 | The queen is tall. |
| robot | `robot` | 로봇 얼굴(ROBOT FACE) | This robot is my toy. |
| star | `star` | 별(WHITE MEDIUM STAR) | It is a little star. |
| tiger | `tiger` | 주황 호랑이(예문 The tiger is orange.) | The tiger is orange. |
| umbrella | `umbrella` | 우산 | It is an umbrella. |
| violin | `violin` | 바이올린 | I like the violin. |
| window | `window` | 창문 | The window is big. |
| yo-yo | `yo-yo` | 빨간 요요(예문 My yo-yo is red.) | My yo-yo is red. |
| zebra | `zebra` | 얼룩말 얼굴(ZEBRA FACE) | I like the zebra. |

## 10. 주제 묶음 · 변형 · 선생님 · 인물

- `variant` 1 = 주제 묶음 1(동물 · 자연 · 음식 · 가족), `variant` 2 = 주제 묶음 2(놀이 · 운동 · 게임 · 우주 · 탈것). 묶음 id 와 변형 번호가 같다(C54 (3)).
- 단원 주제(6절)는 그대로 두고 그림 · 예시 · 상황만 묶음에 맞춘다(정본 6.3). 묶음은 제목만이 아니라 글에 드러나게 한다 — 변형 1 은 동물 · 자연 · 음식 쪽, 변형 2 는 놀이 · 탈것 · 우주 쪽 1단계 그림 낱말(ball · kite · bike · doll · drum · top · yo-yo · bus · car · ship · plane · truck · star · robot …)을 그림 턴 · 답 두 개의 다른 낱말 · 어때 갈래의 물건으로 먼저 고른다. 이 수업보다 뒤 배정 수업의 단원 단어는 고르지 않는다.
- 묶음 1 의 '가족'은 아이 가족을 묻는 질문으로 쓰지 않는다(6.2 — 개인 정보를 묻지 않는다). 동물 · 자연 · 음식 쪽으로 채운다.
- 같은 (kind, lessonNo) 의 두 변형은 `newWords` 가 같고 대화 턴 수가 같다(검증기 `topic-variants` — 인사 턴을 둘 다 1 로 두면 대화 턴이 14 로 같다).
- 한 단원 카드 26장의 제목과 상황이 서로 겹치지 않게 한다. 앞에서 쓴 제목 · 상황 목록을 적어 가며 만든다.

### 선생님(C117 · C122 · C130)

- 말하는 이는 아이가 고른 회화 선생님이다. 선생님은 **앱 속 AI 선생님**이고 아이에게도 그렇게 소개된다. 어느 선생님이 고르든 같은 카드를 쓴다.
- **선생님 이름을 쓰지 않는다.** 'Tori' · '토리'와 명단 이름(지금 Mina · 미나 · Leo · 리오)을 카드의 모든 글 칸(영어 · 한국어 · 제목 · 주제 · 예상 흐름 · 오늘 쓸 말 예문 · 대사 · 끝인사)에 쓰지 않는다. 검증기 `teacher-name` 이 막는다 — 영어는 대소문자를 가리지 않고 낱말 경계로, 한국어는 앞 글자가 한글이 아니면 뒤에 무엇이 붙어도 건다. 토리(다람쥐)는 회화 글에 등장인물로도 쓰지 않는다(읽기 · 쓰기 · 말하기 글의 인물이다).
- 자리 표시자 `{TEACHER}` 를 쓰지 않는다. 틀 자리는 `{NAME}` 하나뿐이다(검증기 `talk-placeholder`). 예상 흐름의 선생님은 'The teacher' 다.
- (제안) 뒤에 명단에 들어올 이름도 미리 피한다 — 영어 Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi, 한글 루비 · 소라 · 하나 · 준 · 나비 · 루나 · 키키 · 루루 · 팡팡 · 삐삐. 명단이 늘면 검사가 모든 시드를 다시 보므로 그때 다시 만들지 않으려는 것이다. 한국어에서 흔한 말과 같은 글자는 다른 말로 쓴다: '하나' → '한 개' · '1'(one 의 `meaningKo` 는 `1, 한 개`), '소라' → '조개', '나비'는 쓰지 않고, 띄어 쓴 '준'(준다 · 준비)은 '줄게' · '다 됐어?' 꼴로.
- 선생님 자기 이야기는 1단계 카드에 두지 않는다(제안 — 1단계 대화 방식은 정해진 질문이고, 자기 이야기 뒤 'And you?' 는 2단계 몫이다). 사람의 삶(가족 · 집 · 학교 · 나이 · 사는 곳 · 먹은 것 · 기르는 동물 · 겪은 일)을 지어내지 않는다. 선생님이 사람이라거나 무슨 동물이라고, 남자 · 여자라고 말하지 않는다. 대사에서 선생님이 좋아하는 것을 말해야 하면 앱 속 선생님으로 말이 되는 것(낱말 · 그림 · 노래 · 색 · 이야기)만 쓴다 — `I like pizza!` 처럼 먹는 이야기는 쓰지 않는다.
- 아이에게 묻지 않는 것: 사는 곳 · 집 주소 · 학교 이름 · 반 · 가족 · 전화번호 · 이메일 · 성 · 전체 이름 · 비밀번호 · 생김새 평가(6.2 · 13절). 아이 이름은 앱이 이미 안다 — `Are you {NAME}?` 꼴로 확인한다. 나이와 좋아하는 것은 3.3 1단계 행대로 묻는다.

### `{NAME}`

- `{NAME}` 은 회화 카드 글에 쓸 수 있는 유일한 틀 자리다(6.1). 앱이 아이 영어 이름으로 바꿔 읽고 보인다. 인사 · 끝인사 · 이름 턴에 쓰고, (제안) 그 밖에서 부르는 말로는 한 카드에 세 번까지 쓴다.
- 한국어 칸에서 `{NAME}` 바로 뒤에 조사를 붙이지 않는다(받침을 모른다): `안녕, {NAME}!` ○ · `{NAME}, 이건 뭐야?` ○ · `{NAME}는` × · `{NAME}야` ×. 이름 턴의 뜻은 `내 이름은 {NAME}.` 꼴로 끝낸다.

### 인물(C124 · C126)

- 1단계 회화는 아이 자신과 그림 속 물건을 묻는다. 이름 표의 인물은 거의 필요 없다. 넣는다면 선생님 질문 앞 짧은 말(`This is Max.` — 강아지 그림 턴)에만 둔다. 아이 차례 영어(힌트 · 답 예시 · 답 두 개 · 정리 대사 · 목표 표현 · 오늘 쓸 말 예문)에는 넣지 않는다(제안 — 아이가 말하는 글이고, 음성 인식이 이름을 다른 글자로 적으면 맞춤이 깎인다).
- 넣을 때는 아래 표의 이름만 쓴다. 표 밖의 이름을 새로 만들지 않는다. 이름을 부르는 말로 문장 앞뒤에 붙이지 않는다(`Max, what is it?` ×).
- 셈(단원 파일 하나, 카드 N = 26): 이름 표의 이름이 영어 칸 어디든 나오는 카드를 n, 그 가운데 Momo 가 나오는 카드를 m 이라 할 때 **n ≤ 6 · m ≤ 3** 이다. 토리는 회화 글에 쓸 수 없으므로 m 은 Momo 만 센다.

| 이름 | 누구 | 한국어로 적을 때(`ko`) |
|---|---|---|
| Momo | 아이 | 모모 |
| Ben | 남자아이 | 벤 |
| Meg | 여자아이 | 메그 |
| Dan | 남자아이 | 댄 |
| Tess | 여자아이 | 테스 |
| Max | 강아지 | 맥스 |
| Ted | 곰 | 테드 |
| Gus | 오리 | 거스 |

## 11. 수업 종류별 내용

| kind | 새 단어 | 내용 |
|---|---|---|
| `assigned`(배정 1~5) | 6절 표의 5개 | 오늘 쓸 말 5개 = 새 단어. 새 단어마다 처음 묻는 턴 하나(대화 턴 1~7 안), 나머지는 다시 묻는 턴(5절). 처음 묻는 턴의 `hintEn` · 답 두 개 하나 이상에 그 새 단어. 정리 대사 · 목표 표현에 새 단어를 고루. 이 수업보다 뒤 배정 수업의 단원 단어는 어디에도 쓰지 않는다(경고 `relation-early-use`) |
| `reinforce`(다지기 6~10) | 없음 | 오늘 쓸 말 `[]`. 14턴 모두 다시 묻는 턴. 다지기 5장을 합쳐 단원 단어가 모두 노려지고 글에 다시 나온다(경고 `relation-not-reused`). (제안) 다지기 6 은 배정 1 · 2 단어 쪽, 7 은 2 · 3, 8 은 3 · 4, 9 는 4 · 5, 10 은 단원 전체를 고루 — 단어마다 다지기 두 장 이상 |
| `remedial`(보강 1~3) | 없음 | 오늘 쓸 말 `[]`. 14턴 모두 다시 묻는 턴. (제안) 보강 1 은 배정 1 · 2 단어, 보강 2 는 배정 3 · 4 단어, 보강 3 은 배정 5 단어와 그림 없는 단어를 몰아 노린다. 변형마다 보강 셋을 합쳐 단원 단어마다 1번 이상 카드 글에 나온다(`remedial-coverage`) — 2번 이상을 목표로 하고 그 셈을 보고한다 |

보강 덮기 셈(제안): 그 변형 보강 카드 3장 가운데 그 단어가 카드 영어 글(질문 · 힌트 · 답 예시 · 오늘 쓸 말 예문 · 대사 — 답 두 개 · 목표 표현 · 예상 흐름은 검증기가 세지 않는다)에 나온 카드 수다. '1번 이상'이 검증기 기준이고(검증기는 나온 횟수로 센다) '2번 이상'은 보고용이다. 노리는 단어(`targets`)로 나온 단원 단어 수는 '답하는 대상'으로 따로 센다.

## 12. 출력 규격(Zod `TalkLessonSchema` · `TalkCardSchema` 와 1:1)

모르는 키는 거부된다. 필드 이름 · 꼴을 그대로 쓴다. 파일 겉: `{ "area": "talk", "level": 1, "unit": <단원>, "lessons": [ … ] }`. 회화 수업에는 `preview` 칸이 없다(오늘 쓸 말이 그 몫이다).

| 필드 | 꼴 | 설명 |
|---|---|---|
| `kind` · `lessonNo` · `variant` | 4절 번호 규칙 | 수업 종류(11절) · 번호 · 주제 변형 |
| `revision` · `correction` | 0 이상 정수 | 호출 값 |
| `generation` | `{ "method": "generated", "model", "effort", "briefHash", "agentHash", "createdOn", "retries"? }` | 호출 값과 자기 모델 ID. `retries` 는 검증 뒤 고친 칸에만 그 회차 |
| `title` | 한국어 | 목록 제목, 10자 안팎 |
| `newWords` · `unitWords` | 낱말 id 목록 | 5절 표 |
| `card.topic` | 한국어 | AI 에게 가는 카드 주제 |
| `card.targetExpressions` | 영어 글 1개 이상 | 목표 표현 |
| `card.greetingTurns` | 1 | 인사 턴 수 |
| `card.greeting` | `{ "questions": [인사 턴] }` | 인사 턴 = `{ "question": {"en", "ko"}, "hintKo", "hintEn", "answerExample", "twoAnswers": [영어, 영어], "imageKey"? }` — `frameEn` 은 두지 않는다 |
| `card.todayWords` | `[{ "word", "meaningKo", "example", "exampleKo" }]` | 배정은 새 단어 5개, 다지기 · 보강은 `[]` |
| `card.firstQuestion` | 영어 | `turns[0].question.en` 과 같은 글 |
| `card.flow` | 영어 글 1개 이상 | 예상 흐름 |
| `card.todayTopicsKo` | 한국어 3~5개 | 오늘 이야기 목록 |
| `card.closingLines` · `card.safeLines` | `[{ "en", "ko" }]` 1개 이상 | 정리 대사 · 안전한 대사 |
| `card.endCondition` | 한국어 | 끝맺음 조건 |
| `card.farewell` · `card.safetyFarewell` | `{ "en", "ko" }` | 끝인사 · '새 이야기로 이어 가자' 끝인사 |
| `card.praiseLines` | 영어 글 1개 이상 | 짧은 칭찬 |
| `card.turns` | 대화 턴 14개 | 대화 턴 = 인사 턴 칸 + `"targets": [낱말 id 1~2]` · `"ask": "first" \| "re_ask"` |
| `card.moreTalk` | 대화 턴 꼴 5개 | `twoAnswers` 를 두지 않는다 · `ask` 는 모두 `re_ask` |

두지 않는 칸: `card.questions` · `card.missions` · `frameEn` · `usablePhrases` · `preview`.

예시: 단원 3 배정 1 · 변형 2(꼴을 보이는 예이니 그대로 옮기지 않는다 — 이 칸을 만들 때도 새로 쓴다). 길이를 줄이려고 `turns` 14개 가운데 3개(1 · 4 · 9번), `moreTalk` 5개 가운데 1개, `todayWords` · `closingLines` · `targetExpressions` 5개 가운데 2개만 보인다. 줄이기 전의 카드 한 장 전체를 2026-10-23 에 검증기로 확인했다 — 칸 오류 0 · 경고 0(해시는 0 으로 채워 돌림, 단원 단위 셈 `talk-again-slots` · `talk-known-days` 는 카드 한 장이라 따지지 않음) · 14절 스스로 확인 걸림 없음.

```json
{
  "kind": "assigned",
  "lessonNo": 1,
  "variant": 2,
  "revision": 1,
  "correction": 0,
  "generation": {
    "method": "generated",
    "model": "claude-opus-5-5",
    "effort": "xhigh",
    "briefHash": "<호출이 넘긴 briefHash 64자>",
    "agentHash": "<호출이 넘긴 agentHash 64자>",
    "createdOn": "2026-10-23"
  },
  "title": "장난감 색 찾기",
  "newWords": ["red", "blue", "yellow", "green", "black"],
  "unitWords": ["red", "blue", "yellow", "green", "black"],
  "card": {
    "topic": "장난감의 색",
    "targetExpressions": ["It is red.", "It is a blue kite."],
    "greetingTurns": 1,
    "greeting": {
      "questions": [
        {
          "question": {"en": "Hi, {NAME}! How are you?", "ko": "안녕, {NAME}! 잘 지냈어?"},
          "hintKo": "나는 좋아.",
          "hintEn": "I am good.",
          "answerExample": "I am good.",
          "twoAnswers": ["I am good.", "I am okay."]
        }
      ]
    },
    "todayWords": [
      {"word": "red", "meaningKo": "빨간, 빨간색", "example": "It is a red bike.", "exampleKo": "빨간 자전거야."},
      {"word": "blue", "meaningKo": "파란, 파란색", "example": "It is a blue kite.", "exampleKo": "파란 연이야."}
    ],
    "firstQuestion": "What is it?",
    "flow": [
      "The teacher says hello and asks how the child is.",
      "The teacher shows color pictures: red, blue, yellow, green, black.",
      "The teacher asks about the colors of toys."
    ],
    "todayTopicsKo": ["빨강 · 파랑 · 노랑", "초록 · 검정", "장난감은 무슨 색"],
    "closingLines": [
      {"en": "It is red.", "ko": "빨간색이야."},
      {"en": "It is a blue kite.", "ko": "파란 연이야."}
    ],
    "safeLines": [
      {"en": "Oh, okay!", "ko": "오, 그렇구나!"},
      {"en": "Wow, fun!", "ko": "와, 재밌다!"}
    ],
    "endCondition": "대화 턴을 모두 마치면 정리로 간다.",
    "farewell": {"en": "Bye, {NAME}! See you!", "ko": "안녕, {NAME}! 또 보자!"},
    "safetyFarewell": {"en": "Let's talk again soon!", "ko": "다음에 또 새 이야기 하자!"},
    "praiseLines": ["Wow!", "Good!", "Great!", "Yes, good!"],
    "turns": [
      {
        "question": {"en": "What is it?", "ko": "이건 뭐야?"},
        "hintKo": "빨간색이야.",
        "hintEn": "It is red.",
        "answerExample": "It is red.",
        "twoAnswers": ["It is red.", "It is blue."],
        "imageKey": "red",
        "targets": ["red"],
        "ask": "first"
      },
      {
        "question": {"en": "A bike! And this?", "ko": "자전거다! 이건?"},
        "hintKo": "빨간 자전거야.",
        "hintEn": "It is a red bike.",
        "answerExample": "It is a red bike.",
        "twoAnswers": ["It is a red bike.", "It is a blue bike."],
        "imageKey": "bike",
        "targets": ["red"],
        "ask": "re_ask"
      },
      {
        "question": {"en": "Okay! What is it?", "ko": "좋아! 이건 뭐야?"},
        "hintKo": "초록색이야.",
        "hintEn": "It is green.",
        "answerExample": "It is green.",
        "twoAnswers": ["It is black.", "It is green."],
        "imageKey": "green",
        "targets": ["green"],
        "ask": "re_ask"
      }
    ],
    "moreTalk": [
      {
        "question": {"en": "A top! What is it?", "ko": "팽이다! 이건 뭐야?"},
        "hintKo": "빨간 팽이야.",
        "hintEn": "It is a red top.",
        "answerExample": "It is a red top.",
        "imageKey": "top",
        "targets": ["red"],
        "ask": "re_ask"
      }
    ]
  }
}
```

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말(영어 45 · 한국어 19)과 정규식 13개. 예: kill · gun · bomb · weapon · beer · wine · cigarette · drugs · stupid · idiot · dumb · shut up · hell · damn. 금지어 · 선생님 이름 검사는 예상 흐름에도 걸린다.
- 개인 정보를 묻는 말(영어 · 한국어): 사는 곳 · 집 주소 · 전화번호 · 학교 이름 · 반 · 성 · 전체 이름 · 이메일 · 비밀번호, 그리고 (제안) 가족 · 생김새 평가. 아이 이름은 묻지 않고 `Are you {NAME}?` 로 확인한다.
- 연락처 꼴: 전화번호 · 이메일 · 집 주소 · 웹 주소.
- 메타 문장(`meta-sentences.json`): the child · the user · the student · the learner · I should · I will now · as an AI · system prompt · the card says 등 — 선생님이 말하는 칸에 쓰지 않는다(예상 흐름은 AI 지시 글이라 'the child' 를 써도 된다).
- 선생님 이름 · `{TEACHER}` · 토리(10절), 선생님이 사람 · 동물 · 남자 · 여자라고 말하는 글, 선생님의 사람 삶을 지어낸 글.
- (제안) 무섭거나 다치는 장면, 상표 · 실제 인물 · 종교 · 정치.
- 설계 숫자를 글에 쓰지 않는다(예: '오늘 5개 배워요').
- 실제 아이 이름 · 실제 사람 이름.

## 14. 스스로 확인과 검증 명령

파일을 다 쓴 뒤 하나씩 확인한다.

1. 카드 26장(변형 2 × (정규 10 + 보강 3)), (kind, lessonNo, variant) 겹침 없음.
2. 카드마다 인사 1턴 · 대화 14턴 · 더 이야기할 거리 5턴. 인사 · 대화 턴에 답 두 개, 더 이야기할 거리에는 없음. `frameEn` · `questions` · `missions` · `preview` 없음.
3. 배정 카드: `newWords` · `todayWords` 가 배정표와 같고, 새 단어마다 처음 묻는 턴이 대화 턴 1~7 안에 하나씩, 그 턴 힌트와 답 두 개 하나 이상에 그 새 단어. 다지기 · 보강 카드: 처음 묻는 턴 없음, `todayWords` `[]`.
4. 선생님 질문에 그 턴이 노리는 단어가 없고, 한 카드 안에서 같은 질문 글이 2번까지, `firstQuestion` = 첫 대화 턴 질문.
5. 모든 영어 문장 5낱말 이하(예상 흐름 밖), 8절 꼴 밖의 형태 없음, 뒤 배정 수업 단원 단어 없음.
6. 7절 어휘 범위(아래 스스로 확인 명령), 수는 영어 낱말.
7. 그림 키가 9절 표에 있고(또는 home 의 house), 그림 턴의 글이 그림 색 · 모습과 맞고, 답 두 개 짝에 운이 같은 낱말 · 헷갈리는 짝 없음, 그림과 맞는 답 자리가 ① · ② 에 고루.
8. 다지기 5장에 단원 단어가 모두 다시 나오고, 단어마다 다시 묻는 턴이 서로 다른 정규 카드 2장 이상. 보강 3장에 단원 단어마다 1번 이상(변형마다).
9. 변형 1 · 2 의 같은 칸끼리 새 단어 · 턴 수가 같고, 제목 26개가 서로 다르다.
10. 선생님: 이름 · 토리 · `{TEACHER}` 없음(뒤 명단 이름 포함), 선생님 자기 이야기 없음, 사람 삶 · 종 · 성별 없음, 개인 정보 질문 없음. 한국어 칸에 '하나 · 소라 · 나비 · 준' 없음, `{NAME}` 뒤 조사 없음.
11. 인물: n ≤ 6 · m ≤ 3, 부르는 말 없음, 아이 차례 영어에 이름 없음, 표 밖 이름 없음.
12. 한국어 뜻이 반말이고 영어 뜻과 맞다. 13절 금지 목록에 걸리는 말이 없다.

스스로 확인 명령(어휘 범위 · 아이 차례의 인물 이름 · 선생님 이름(뒤 명단 포함) · `{NAME}` 뒤 조사 · 인물 셈 — 검증기가 보지 않는 것). `<뿌리>` · `<단원>` 을 바꿔 돌린다. '스스로 확인 걸림 없음'이 나올 때까지 고친다(고침 회차는 검증 고침과 따로 세지 않는다).

```sh
python3 - <뿌리> <단원> <<'PY'
import json, re, sys

root, unit = sys.argv[1], int(sys.argv[2])
vocab = json.load(open(f"{root}/vocab.json"))["vocab"]
spec = next(u for u in json.load(open(f"{root}/unit-specs.json"))["unitSpecs"]
            if u["area"] == "talk" and u["level"] == 1 and u["unit"] == unit)
lessons = json.load(open(f"{root}/lessons/talk/1/{unit}.json"))["lessons"]

def surfaces(entries):
    out = set()
    for v in entries:
        out.add(v["word"].lower())
        out.update(f.lower() for f in v["forms"])
    return out

level1 = surfaces(v for v in vocab if v["level"] <= 1)
unit_words = surfaces(v for v in vocab if v["word"] in spec["words"])
GREETING_EXTRA = {"good", "fine", "great"}
TEACHER_EXTRA = {"good", "great", "fun", "see", "soon", "again", "let's", "talk"}
SUFFIX = {"'m": "am", "'re": "are", "'s": "is", "'ve": "have", "'ll": "will", "'d": "would", "n't": "not"}
NAMES = ["Momo", "Ben", "Meg", "Dan", "Tess", "Max", "Ted", "Gus"]
TEACHER_EN = ["Tori", "Mina", "Leo", "Ruby", "Sora", "Hana", "Jun", "Nabi", "Luna", "Kiki", "Lulu", "Pang", "Pipi"]
TEACHER_KO = ["토리", "미나", "리오", "루비", "소라", "하나", "준", "나비", "루나", "키키", "루루", "팡팡", "삐삐"]
TOKEN = re.compile(r"\{[A-Z_]+\}(?:'s)?|_{3,}|\d+|[A-Za-z]+(?:'[A-Za-z]+)*(?:-[A-Za-z]+)*")

def offband(text, allowed):
    bad = []
    for tok in TOKEN.findall(text.replace("’", "'")):
        if tok.startswith("{"):
            continue
        if tok.isdigit():
            bad.append(tok + "(숫자는 낱말로)")
            continue
        low = tok.lower()
        if low in allowed:
            continue
        stem = next((low[: -len(s)] for s in SUFFIX if low.endswith(s) and len(low) > len(s)), None)
        if stem is not None and stem in allowed:
            continue
        bad.append(tok)
    return bad

problems = []
def say(lesson, path, msg):
    problems.append(f"{lesson['kind']} {lesson['lessonNo']} v{lesson['variant']} {path}: {msg}")

for lesson in lessons:
    card = lesson["card"]
    child, teacher, korean = [], [], []
    for i, g in enumerate(card["greeting"].get("questions", [])):
        teacher.append((f"greeting.{i}.question", g["question"]["en"]))
        korean.append((f"greeting.{i}.question.ko", g["question"]["ko"]))
        for key in ("hintEn", "answerExample"):
            child.append((f"greeting.{i}.{key}", g[key], True))
        for j, a in enumerate(g.get("twoAnswers", [])):
            child.append((f"greeting.{i}.twoAnswers.{j}", a, True))
        korean.append((f"greeting.{i}.hintKo", g["hintKo"]))
    for group in ("turns", "moreTalk"):
        for i, t in enumerate(card.get(group) or []):
            teacher.append((f"{group}.{i}.question", t["question"]["en"]))
            korean += [(f"{group}.{i}.question.ko", t["question"]["ko"]), (f"{group}.{i}.hintKo", t["hintKo"])]
            child += [(f"{group}.{i}.hintEn", t["hintEn"], False), (f"{group}.{i}.answerExample", t["answerExample"], False)]
            for j, a in enumerate(t.get("twoAnswers", [])):
                child.append((f"{group}.{i}.twoAnswers.{j}", a, False))
    for i, w in enumerate(card["todayWords"]):
        child.append((f"todayWords.{i}.example", w["example"], False))
        korean += [(f"todayWords.{i}.meaningKo", w["meaningKo"]), (f"todayWords.{i}.exampleKo", w.get("exampleKo", ""))]
    for i, l in enumerate(card["closingLines"]):
        child.append((f"closingLines.{i}", l["en"], False))
        korean.append((f"closingLines.{i}.ko", l.get("ko", "")))
    for i, e in enumerate(card["targetExpressions"]):
        child.append((f"targetExpressions.{i}", e, False))
    for i, l in enumerate(card["safeLines"]):
        teacher.append((f"safeLines.{i}", l["en"]))
        korean.append((f"safeLines.{i}.ko", l.get("ko", "")))
    for key in ("farewell", "safetyFarewell"):
        teacher.append((key, card[key]["en"]))
        korean.append((f"{key}.ko", card[key].get("ko", "")))
    for i, p in enumerate(card["praiseLines"]):
        teacher.append((f"praiseLines.{i}", p))
    korean += [("title", lesson["title"]), ("topic", card["topic"]), ("endCondition", card["endCondition"])]
    korean += [(f"todayTopicsKo.{i}", t) for i, t in enumerate(card["todayTopicsKo"])]

    for path, text, greeting in child:
        allowed = level1 | unit_words | (GREETING_EXTRA if greeting else set())
        bad = offband(text, allowed)
        if bad:
            say(lesson, path, f"아이 차례 영어에 범위 밖 낱말 {bad}: {text}")
        hit = [n for n in NAMES if re.search(rf"(?<![A-Za-z]){n}(?![A-Za-z])", text)]
        if hit:
            say(lesson, path, f"아이 차례 영어에 인물 이름 {hit}: {text}")
    for path, text in teacher:
        bad = offband(text, level1 | unit_words | TEACHER_EXTRA)
        if bad:
            say(lesson, path, f"선생님 쪽 영어에 범위 밖 낱말 {bad}: {text}")
    every = [t for _, t in teacher] + [t for _, t, _ in child] + [t for _, t in korean] + card["flow"]
    for text in every:
        for n in TEACHER_EN:
            if re.search(rf"(?<![A-Za-z]){n}(?![A-Za-z])", text, re.I):
                say(lesson, "글", f"선생님 이름(명단 · 뒤 명단 포함) {n}: {text}")
    for path, text in korean:
        for n in TEACHER_KO:
            for m in re.finditer(n, text):
                before = text[m.start() - 1] if m.start() > 0 else ""
                if not re.match(r"[가-힣]", before):
                    say(lesson, path, f"한국어 칸에 선생님 이름과 같은 글자 '{n}'(뒤 명단 포함 — 다른 말로): {text}")
                    break
        if re.search(r"\{NAME\}[가-힣]", text):
            say(lesson, path, f"{{NAME}} 바로 뒤에 조사를 붙였다(받침을 모른다): {text}")
    names_in = {n for n in NAMES for t in [x for _, x in teacher] + [x for _, x, _ in child]
                if re.search(rf"(?<![A-Za-z]){n}(?![A-Za-z])", t)}
    lesson["_names"] = names_in

n = sum(1 for l in lessons if l["_names"])
m = sum(1 for l in lessons if "Momo" in l["_names"])
N = len(lessons)
print(f"인물: 이름이 나온 카드 n={n} (상한 {N // 4}) · Momo 카드 m={m} (상한 {max(N // 8, n // 2)}) · 쓴 이름 {sorted(set().union(*[l['_names'] for l in lessons]))}")
print("\n".join(problems) if problems else "스스로 확인 걸림 없음")
PY
```

검증 명령(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas talk --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="lessons/talk/1/<단원>.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(이 파일의 칸 수 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수 · 단원 단위 오류 `talk-again-slots` · `talk-known-days` · `remedial-coverage` 수)를 그대로 적어 둔다. 보고의 '첫 검증'이다.
- 오류가 있으면 그 칸만 고치고 다시 검증한다. 고친 칸의 `generation.retries` 에 회차를 적는다. 고침은 2회(`seed.max_retries`)까지다. 그래도 남으면 멈추고 남은 오류를 보고한다. 단원 단위 오류는 그 변형의 정규 · 보강 카드를 모두 쓴 뒤에만 뜻이 있다.
- 경고(`unit-words-unlisted` · `relation-early-use` · `relation-not-reused` · 분포)도 고친다. 남기면 까닭을 보고한다.
- `unchecked`(풀이 검사 안 됨)와 `empty`(빈 칸)는 이 단계의 일이 아니다. 회화 카드는 풀이 검사 대상이 아니다.

## 15. 근거 한 줄

회화 1단계는 선생님의 정해진 질문에 자기 이름 · 나이 · 좋아하는 것과 그림 속 물건(무엇 · 색 · 크기 · 수)을 처음에는 들려준 두 답에서 골라, 다시 물으면 스스로 짧게 답하며 말을 주고받는 단계다([4영02-08] · [4영02-10], CEFR Overall spoken interaction · Information exchange Pre-A1 — 자기 자신에 대한 쉬운 질문을 짧은 정형 표현으로 묻고 답하는 수준). 그래서 질문은 정해진 꼴을 돌려 쓰고, 답은 단원 단어가 든 다섯 낱말 이하의 정형 문장이다.

## 16. 보고 꼴

마지막 답장(파일로 쓰지 않는다)에 이 차례로 쓴다.

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값>
파일: <뿌리>/lessons/talk/1/<단원>.json · 카드 <n>(정규 <n> · 보강 <n>) · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
첫 검증: 칸 <n> · 오류 칸 <n> · 규칙별 <rule n, …> · 단원 단위 오류 <n> · 경고 <n>
고침: <회차마다 고친 칸 · 남은 오류>
스스로 확인 명령: 첫 결과 <걸림 n> · 마지막 '걸림 없음'
다시 묻는 턴: 변형마다 정규 카드 자리 <n>(기준 40) · 다지기 두 장 이상에서 노린 단어 <n>/25
보강 덮기: 변형마다 보강 카드 1장 이상에 나온 단어 <n> · 2장 이상 <n> · 노리는 단어로 나온 단어 <n>
같은 질문: 카드마다 가장 많이 나온 질문 글 <n>번(상한 2)
인물: 이름이 나온 카드 <n> · 그 가운데 Momo 카드 <n> · 쓴 이름 <…>
선생님: 선생님 이름 · 토리 · {TEACHER} 0 · 선생님 자기 이야기 0
스스로 확인: 14절 1~12 각각 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 0 · 머리 | 선생님 이야기 · 회화 평가 카드를 이 브리프에서 떼어 `talk-story-1-3.md` · `level-test-talk-1.md` 로 둠 | 만드는 단위가 다르다(카드는 단원마다 한 파일, 이야기는 구간마다 `stories/1-3.json` 하나, 평가는 단계마다 `level-tests/talk/1.json` 하나). 한 브리프에 두면 이야기 규칙만 고쳐도 해시가 바뀌어 카드 130장을 다시 만들어야 한다. 단원 카드 생성자가 읽지 않을 규칙도 줄인다. 평가 브리프 이름은 다른 영역 평가 브리프(`level-test-<영역>-1.md`)에 맞췄다 |
| 2 | 카드 차례(변형 1 → 2, 정규 → 보강) · 턴 계획표 먼저 | 정본 · 검증기에 차례 규칙이 없다. 턴 계획 규칙(5절)이 여러 칸에 걸쳐 있어 글보다 계획을 먼저 세우면 고침이 준다 |
| 5 | 인사 턴 수 1 | 정본은 1 또는 2 다. 두 변형의 대화 턴 수가 같아야 하고(검증기 topic-variants), 1단계는 대화 자리를 단원 단어에 쓰는 편이 낫다 |
| 5 | 처음 묻는 턴은 새 단어 하나만 · 다시 묻는 턴 힌트도 노리는 단어를 담음 · 답 예시 = 힌트 | 정본은 '하나 또는 둘'만 정했다. 처음 묻는 턴의 답 두 개가 한 낱말만 다르므로 노리는 단어가 하나일 때 맞다. 다시 묻는 턴에서 노리는 단어가 힌트에 없으면 '말했다'로 셀 길이 없다 |
| 5 | 그림 턴의 답 두 개: 하나는 그림과 맞고 다른 하나는 그림과 다른 낱말, 맞는 자리를 ① · ② 에 고루 | 정본 예는 아이 자신 · 좋아하는 것(둘 다 맞음)뿐이다. 그림 속 물건은 둘 다 맞을 수 없으므로 듣고 고르는 몫으로 둔다. 늘 ① 이 맞으면 아이가 듣지 않고 ① 을 고른다 |
| 5 | 이 수업 새 단어를 그 처음 묻는 턴 앞의 질문 · 힌트에 쓰지 않음 | 앞 턴에서 꺼낸 단어를 처음 묻는 턴에서 들려주면 '처음'의 뜻이 약해진다(앱의 '이미 물음' 판정과는 별개) |
| 5 · 12 | 정리 대사 3~5 · 목표 표현 3~5 · 예상 흐름 3~5 · 안전한 대사 2~3 · 칭찬 3~4 · 끝맺음 조건 한 줄 | 규격은 '1개 이상'만 정했다. 정리는 되짚을 말이 오늘 쓸 말 수(5)까지라 3~5 면 모자라지 않다 |
| 5 · 14 | 예상 흐름에도 뒤 배정 수업 단어를 쓰지 않음 | 검증기는 예상 흐름을 세지 않지만(C132 (3)) AI 가 흐름을 보고 아직 안 배운 말을 먼저 꺼낼 수 있다 |
| 7 | 아이 차례 영어를 1~3단계 실시간 AI 힌트 검사와 같은 어휘 범위로 · 수를 영어 낱말로 | 카드 힌트가 AI 힌트를 대신하는 자리이고(6.4) 검증기는 회화 카드 어휘 범위를 세지 않는다. 숫자는 낱말 id 로 세지 않는다(`text.ts` 토큰) |
| 7 | 인사 답에만 good · fine · great | 1단계 vocab 에 안부 답 낱말이 okay 하나라 같은 꼴에서 한 낱말만 다른 답 두 개를 만들 수 없다. C127 의 예('I'm good too!')가 이미 1단계 인사 답이다 |
| 7 | 선생님 쪽 수업 말 여덟(good · great · fun · see · soon · again · let's · talk) | 칭찬 · 안전한 대사 · 끝인사를 1단계 낱말만으로 쓰면 'Wow!' · 'Okay!' 밖에 남지 않는다. 정본 예('That's fun! Let's keep talking.' · 'Let's learn some new words!')와 형태 표 예외('let's talk · learn · keep')가 이미 이런 말을 쓴다. 아이가 말할 글이 아니다 |
| 7 · 8 | 1단계 질문에 or 를 쓰지 않고 `Milk? Cake?` 늘어놓기 | P6a 근거 문서가 or 를 '고르는 질문' 때문에 2단계 기능어로 두었다 |
| 8 | 회화 단원 1 단어(name · like · thank · nice · cute · hot · thick · snack · lunch)가 쓰이는 꼴을 그 낱말의 배정 수업부터 | 회화 단원 규격이 이 낱말을 단원 1 에 두었는데 3.6 차례로는 I like ~ 가 단원 4 · 형용사 서술이 단원 3 요소다. 단원 규격의 낱말을 쓰려면 그 꼴이 필요하고, 3.3 1단계 행이 좋아하는 것을 묻게 한다(C64 (3) 와 같은 까닭) |
| 8 | 질문 꼴 갈래 · 그림 없는 낱말의 질문 꼴 표 · `Are you {NAME}?` · 단원 4~ 의 `What do you like?` | 6.3 순서 (2)(B5-M-05)가 '노리는 단어를 질문에 넣지 않고 다시 묻는 질문을 만들 수 있는지'를 먼저 보라고 했다. 1단계는 그림이 '그것'을 보이므로 it · this · that 갈래로 다시 물을 수 있고, 그림 없는 낱말만 따로 꼴을 둔다. 이름은 앱이 알므로 묻지 않고 확인한다 |
| 9 | home 턴에 2단계 낱말 house 의 그림 키 | home 은 그림이 없다. 검증기는 그림 카탈로그에 있는 키면 받는다 |
| 9 | 답 두 개 짝에 운이 같은 낱말 · 헷갈리는 짝을 두지 않음 | 답 두 개는 소리로만 들린다(말하기 1 표본 S-h 의 swing · wing · king 과 같은 까닭) |
| 10 | 뒤 명단 이름(하나 · 소라 · 나비 · 준 …)도 미리 피함 · one 의 뜻 `1, 한 개` | 명단을 늘리면 '선생님 이름' 검사가 모든 시드를 다시 보고, 한국어는 앞 글자가 한글이 아니면 뒤에 무엇이 붙어도 건다(C132 (1)). 그때 카드를 다시 만들지 않으려는 값싼 대비다 |
| 10 | 선생님 자기 이야기를 1단계 카드에 두지 않음 | 1단계 대화 방식은 정해진 질문이다. 자기 이야기 뒤 'And you?' 는 2단계 행이다. 두지 않으면 '사람 삶을 지어내지 않는다'와 '어느 선생님이 해도 맞는 말'이 저절로 지켜진다 |
| 10 | `{NAME}` 부르기 한 카드 세 번까지 · 한국어 칸에서 `{NAME}` 뒤 조사 없음 | 매 턴 이름을 부르면 C124 가 걱정한 되풀이가 된다. 아이 이름 받침을 시드가 알 수 없다 |
| 10 | 인물은 선생님 질문 앞 말에만, 셈 n ≤ 6 · m ≤ 3(Momo 만) | C124 · C126 셈을 회화에 옮겼다. 토리는 회화 글에 쓸 수 없다(C130) |
| 11 | 다지기 · 보강이 다룰 단어 묶음 · 보강 덮기 셈법 | 정본은 '몰아서 다룰 단원 어휘 묶음'의 나누는 법을 정하지 않았다(말하기 1 과 같은 꼴) |
| 13 | 가족 · 생김새 평가 질문 금지 · 무서운 장면 · 상표 · 실제 인물 · 종교 · 정치 금지 | 6.2 '개인 정보를 묻지 않는다'를 1단계 회화 주제(가족 묶음 · 몸 낱말)에 맞춰 넓혔다 |
| 14 | 스스로 확인 명령(python 한 덩이) | 검증기가 회화 카드의 어휘 범위 · 아이 차례 인물 이름 · 뒤 명단 이름을 보지 않는다 |
