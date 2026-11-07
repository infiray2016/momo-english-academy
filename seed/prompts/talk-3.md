# 생성 브리프 — 회화 3단계 수업 카드(`talk-3`)

이 파일은 회화 3단계 수업 카드 묶음의 프롬프트 판이다(정본 6.3). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 단원 하나의 회화 카드를 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 카드는 새 꼴이다(13절 C189: 학습 목표 · 오늘 쓸 말 · 짧은 준비 · 필수 질문 · 더 이야기할 거리 · 받침 줄). 단계 규격 값은 3절에 옮겼고, 설정값은 키 이름으로만 적는다. 그 지금 값은 호출이 1절 '설정값 표'로 넘긴다. 정본에 없는 값은 '(제안)'으로 적고 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 회화 3단계 카드를 처음부터 다시 만든다. 이미 프리뷰에서 본 고정 카드는 14절 붙이기 명령으로 그대로 둔다.

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 영역 · 단계 | `talk` · 3 · CEFR Pre-A1 · 구간 `1-3` |
| 틀 | `seed/prompts/_template.md`(가르치는 수업 규칙 R5~R16 은 옮기지 않는다: 회화 카드에는 `teach` 칸이 없다) |
| 만든 날 · 만든 이 | 2026-10-30 첫 판 · 2026-11-05 둘째 판(설계 검토 Changes requested 뒤: 같은 질문을 마지막 물음표 문장으로 셈 · 8절 질문 꼴 · 14절 스스로 확인 · 12절 예시, 장부 T-36 · T-53) · 학습 설계자(회화 plan C192 묶음 4 (나)) · 2026-11-07 다섯째 판(회화 AI 몫 넓힘 묶음 3-(다): 1~3단계 카드의 장면 여는 질문 칸 `sceneOpener`(13절 C206) · 예상 흐름 첫 줄 · 장면 여는 질문 꼴 돌려 쓰기, 5절 '장면 여는 질문 쓰는 법' · 12 · 14 · 17절) · 학습 설계자 |
| 옮긴 곳 | `seed/level-specs.json`(talk 3 행, revision 3) · `unit-specs.json`(talk 3단계 단원 1 goals 둘, 잠정) · `settings.json`(키 이름) · `vocab.json` · `images.json`(217 키) · `lists/forms.json` · `lists/forbidden.json` · `lists/meta-sentences.json` · `src/core/seed/schema/talk.ts`(TalkCardSchema, 2026-10-30 08:5x 에 읽음) · `schema/lesson.ts`(TalkLessonSchema) · `check-talk.ts` · `check-lesson.ts` · `check-cross.ts` · `src/core/vocab/allocate.ts` · 회화 spec 4판(`intent/2026-10-29-회화-수업을-대화로/spec.md` 설계 1~6 · 9, approved C188) · 회화 plan(같은 폴더 plan.md, C192) · 정본 3.3 회화 · 3.6 · 3.8 · 6.3 회화 카드 행 · 6.4 회화 시나리오 카드 행 · 13절 C2 · C19 · C31 · C32 · C64 · C117 · C124 · C130 · C132 · C145 · C161 · C172 · C181 · C188 · C189 · C202 (3) · C206 · C211 (1) · 회화 AI 몫 넓힘 spec 판 4 설계 5(`intent/2026-11-06-회화-AI-몫-넓힘/spec.md`) · 정본 02-2:200 · 06:186 · `schema/talk.ts` TalkSceneOpenerSchema · `check-talk.ts` checkSceneOpener(2026-11-07 대조) · 장면 여는 질문 표본과 보고(`.superpowers/sdd/2026-11-07-회화-AI-몫-넓힘/task-3b-samples.md` · `task-3b-report.md`) · 단원 목표 작업 장부 `.superpowers/sdd/2026-10-29-회화-수업을-대화로/talk-3-1-goals.md` · 승인 표본(5절 끝) · 이 판의 예시 카드 검증(12절) |
| 이 판으로 만드는 것 | 단원 1 '주말에 하는 일'의 카드 전부(주제 변형 수 × (정규 + 보강), 4절). 첫 프리뷰 호출은 두 장만 만든다: 배정 1 · 변형 1 과 다지기 6 · 변형 1(1절 (가)). 단원 2~5 는 단원 규격에 목표(goals)가 생긴 뒤 다음 판으로 만든다(6절 규격과 14절 스스로 확인의 `VERBS` · `GOAL_OF` 가 단원 1 전용이라, 단원 2 를 더하면 브리프가 바뀐다) |
| 12절 꼴의 상태 | 회화 plan 묶음 3(카드 새 꼴 · 검증기) 구현이 끝났고(08:4x, fix 1 09:2x) 코드 검토 Approved(10-30 09:3x)다. 12 · 14절은 2026-10-30 09:3x 에 `src/core/seed/schema/talk.ts` 의 TalkCardSchema 와 `src/core/seed/check-talk.ts` 의 규칙을 다시 대조한 꼴이다(구현 보고 `.superpowers/sdd/2026-10-29-회화-수업을-대화로/task-talk-3-report.md` 의 '새 꼴 칸 표' · '검증기 규칙 목록'). 검토에서 꼴 · 규칙이 바뀌면 컨트롤러가 이 판을 다시 맞춘다. 2026-11-05 둘째 판은 `talk-same-question` 의 열쇠를 실행 셈과 같은 마지막 물음표 문장으로 바꾼 검증기(`question-check.ts` 의 `cardQuestionKeyOf` — 앱 셈 · 카드 자리 고르기 · 검증기가 같은 함수 하나를 쓴다, 컨트롤러 2026-11-05 · '5-다')로 12절 예시를 다시 돌렸다 |

이 판이 따르는 컨트롤러 판단(2026-10-30 08:4x). 요청자 몫 셋(목표 수 · expression 확인 · 장소 질문의 목표)은 회화 plan 위험 7 과 같은 plan 318줄대로 프리뷰에서 견주어 받는다. 그때까지 아래가 잠정이다.

| 번호 | 판단 | 이 브리프에서 |
|---|---|---|
| 1 | 목표는 둘(talk-3-1-1 · talk-3-1-2). talk-3-1-1 의 expression 확인은 답 예시를 I · We · They 세 꼴로 보고 경계는 evidence.match_cut 둘째 값이다. 장소 · 자연 · 날씨를 묻는 질문에는 talk-3-1-1 을 잇지 않는다('Beach!' 같은 낱말 답은 대화에서 자연스러운 답이라 문장 목표의 '아직'으로 세지 않는다). 장소 질문은 talk-3-1-2 만 노린다 | 5절 '목표 잇기' · 6절 |
| 2 | weekend · day 는 vocab 4단계라 영어 글에 쓰지 않는다. 단원 이름의 '주말'은 한국어 칸에만 두고, 선생님의 영어는 3단계까지의 낱말로 묻는다 | 7절 · 10절 · 14절 확인 명령 |
| 3 | What · Where 물음은 C64 (3)으로 쓴다. 회화 1단계의 'What is it?'과 같은 길이다 | 8절 |
| 4 | 다지기 6 은 [talk-3-1-1, talk-3-1-2] 를 노리고, 배정 1 의 동사와 장소 · 자연 · 날씨 명사 몇을 섞는다 | 11절 |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 단원 번호 | `1`(지금 만들 수 있는 단원은 1뿐, 0절) | 파일 이름, 6절 |
| 뿌리 폴더 | `seed` 또는 비교용 폴더 | 쓸 파일 `<뿌리>/lessons/talk/3/<단원>.json` |
| 만들 카드 | `전부` 또는 목록(예: `assigned 1 · variant 1`, `reinforce 6 · variant 1`) | 2절. 목록이면 그 카드만 만들고 파일에도 그 카드만 둔다 |
| briefHash · agentHash | 소문자 16진 64자 | 새로 만든 카드의 `generation` |
| effort | `xhigh` | `generation.effort` |
| createdOn | 날짜 | `generation.createdOn` |
| revision · correction | 개정: 컨트롤러가 생성 직전에 적재 미리 보기(`seed:load --dry-run`)의 '최신 개정 + 1'로 넣는다(회화 plan 정한 것 16, 회화 단계 규격 행 · 단원 규격 행과 같은 개정) · `0` | 새로 만든 카드 |
| 고정 카드 파일 · 고정 카드 해시 | 둘째 호출부터. 프리뷰에서 본 카드가 든 파일 경로(뿌리 밖 사본)와 카드마다의 정규화 해시 | 14절 붙이기 명령 |
| 설정값 표 | 아래 키의 지금 값 | 4 · 5 · 11 · 14절 |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

설정값 표의 키(호출하는 이가 `seed/settings.json` 에서 옮겨 넘긴다. 이 브리프에는 값을 적지 않는다): `unit.vocab_count.1-3` · `unit.new_words_per_lesson.1-3` · `unit.regular_lessons.1-3` · `seed.remedial_per_unit.1-3` · `seed.topic_variants.1-3` · `seed.remedial_coverage.1-3` · `seed.max_retries` · `talk.prep_words.1-3` · `talk.more_talk_turns` · `talk.required_max_ratio` · `talk.known_days`.

컨트롤러가 쓰는 명령 둘(생성자는 돌리지 않는다):

```sh
# 설정값 표
python3 -c 'import json; s={x["key"]:x["value"] for x in json.load(open("seed/settings.json"))["settings"]}; [print(k, json.dumps(s[k])) for k in ["unit.vocab_count.1-3","unit.new_words_per_lesson.1-3","unit.regular_lessons.1-3","seed.remedial_per_unit.1-3","seed.topic_variants.1-3","seed.remedial_coverage.1-3","seed.max_retries","talk.prep_words.1-3","talk.more_talk_turns","talk.required_max_ratio","talk.known_days"]]'
# 고정 카드 해시(프리뷰에서 본 파일에서, 카드마다)
python3 -c 'import json,hashlib,sys; [print(l["kind"], l["lessonNo"], l["variant"], hashlib.sha256(json.dumps(l, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()) for l in json.load(open(sys.argv[1]))["lessons"]]' <고정 카드 파일>
```

호출 글 꼴 (가) 첫 프리뷰(두 장):

```text
브리프: seed/prompts/talk-3.md — 이 파일만 읽는다
단원: 1 · 뿌리: seed
만들 카드: assigned 1 · variant 1, reinforce 6 · variant 1 (이 두 장만)
briefHash: <talk-3.md sha256> · agentHash: <seed-generator 정의 확인 줄의 sha256>
effort: xhigh · createdOn: <날짜> · revision: <개정> · correction: 0
설정값 표: <위 명령 출력 그대로>
검증 명령: pnpm -s seed:validate --root seed --areas talk --json
```

호출 글 꼴 (나) 단원 나머지(브리프가 그대로일 때): (가)에서 '만들 카드'를 `전부(고정 카드 둘은 붙이기 명령으로)` 로 바꾸고, `고정 카드 파일: <뿌리 밖 사본 경로>` 와 `고정 카드 해시: <해시 둘>` 줄을 더한다. 브리프가 바뀌었으면 (나)가 아니라 처음부터(26장 모두) 다시 만든다(회화 plan 정한 것 16).

`generation.model` 에는 자기 모델 ID(예: `claude-opus-5-5`)를 적는다. 파일은 하나만 쓴다.

## 2. 할 일 한눈에

1. 6절에서 단원 1 의 단원 단어 · 배정표 · 목표를 찾는다.
2. 만들 카드마다 **카드 계획표**를 먼저 짠다. 필수 질문마다 번호 · 노리는 단어 · 목표 · 처음 묻기인지 다시 묻기인지 · 질문 글 · 쉬운 질문 글을 적고, 더 이야기할 거리도 같게 적는다. 배정 카드는 짧은 준비 낱말 셋과 대화 중에 꺼낼 새 단어를 적는다(5절). 장면 여는 질문의 글과 꼴(첫 세 낱말)도 적고, 필수 질문 · 더 이야기할 거리와 주제가 겹치지 않는지 이 표에서 본다(5절 '좋은 질문' (라)).
3. 계획표대로 카드 글(질문 · 힌트 · 답 예시 · 쉬운 질문 · 오늘 쓸 말 · 정리 대사 …)을 쓴다.
4. 파일 하나 `{ "area": "talk", "level": 3, "unit": <단원>, "lessons": [ … ] }` 에 넣는다. 차례는 (제안) 변형 1 의 정규 1~10 · 보강 1~3, 그다음 변형 2 다. '만들 카드'가 목록이면 그 카드만 넣는다.
5. (나) 호출이면 14절 붙이기 명령으로 고정 카드를 넣는다.
6. 14절 스스로 확인 → 검증 명령 → 오류 칸 고침 → 16절 보고.

## 3. 단계 규격(`level-specs` talk 3, revision 3)

| 칸 | 값 |
|---|---|
| can-do(AI 가변부에 가는 단계 문장) | 선생님의 정해진 질문에 한 문장으로 답하며 15번 말을 주고받을 수 있다 |
| CEFR · 참고 시간 | Pre-A1 · 10분 |
| 문장 길이 상한 `sentenceMaxWords` | 7낱말. 카드의 모든 영어 문장마다다(질문 · 쉬운 질문 · 힌트 · 답 예시 · 오늘 쓸 말 예문 · 들려줄 말 · 목표 표현 · 정리 대사 · 안전한 대사 · 끝인사 · 칭찬 대사). `{NAME}` 은 한 낱말, 축약형도 한 낱말이다. 예상 흐름(`flow`)만 이 상한 밖이다(C132 (3)) |
| 토막 `segments` | 인사(greeting) → 짧은 준비(prep) → 대화(talk) → 정리(wrap_up). 말해 보기는 없다(C189) |
| 대화 방식 `mode` | 짧은 준비 뒤 대화. 한 문장으로 답하게 묻고, 막히면 힌트의 영어 틀(예: I like ___.)에 넣어 말한다. 선생님이 아이 말에 이어 묻는다 |
| 참고 턴 `targetTurns` | 15. 마무리 물음을 꺼내는 때의 참고값이고 완료 조건이 아니다(C161 · C188). 카드는 참고 턴을 질문으로 채우지 않는다 |
| 힌트 `hintTiers` | 3단: 한국어 뜻(`hintKo`) → 영어 틀(`hints[0]`) → 영어 문장(`hints[1]`, 작은 듣기 버튼이 붙는다) |
| 카드 꼴 `cardShape` | `required`: 필수 질문 · 더 이야기할 거리 꼴 하나(옛 `turns` · `moreTalk` · `questions` 칸은 없다) |
| 선택지 `choices` | 없다(1단계 몫). `firstForm` · `choices` 칸을 두면 오류다 |
| 영어 틀 `frameInTurns` | 있다. 인사 질문에 `frameEn` 이 있어야 하고, 필수 질문 · 더 이야기할 거리의 `hints[0]` 이 영어 틀이다 |
| 그림 `turnImages` | 있다. 카탈로그에 있는 그림 키만(9절) |
| 한국어 뜻 `koMeaning` | 있다. 필수 질문 · 더 이야기할 거리의 `ko` 와 쉬운 질문의 `ko`(C194 (2)) · 정리 대사 · 안전한 대사 · 끝인사 · 안전 상한 끝인사의 `ko`(반말)가 모두 있어야 한다(검증기 `talk-ko`) |
| 더 이야기할 거리 `moreTalk` | 있다 |
| 미션 · 쓸 수 있는 말 | 없다(`missions` · `roleSwap` · `usablePhrases` 를 두지 않는다) |

정본 3.3 회화 단계표 3단계 행: 대화 방식 '짧은 준비 뒤 대화. 한 문장으로 답하게 묻고, 막히면 힌트의 영어 틀(예: I like ___.)에 넣어 말한다. 선생님이 아이 말에 이어 묻는다' · 힌트 '3단(한국어 뜻 → 영어 틀 → 영어 문장) · 영어 문장 듣기 버튼' · 참고 턴 15 · 참고 시간 10분. 1~3단계 대화에서는 아이가 말할 영어 문장을 미리 보이지 않는다(T2). 선생님 질문 글과 한국어 뜻은 말풍선에 보이고, 아이 답의 영어는 '힌트'를 눌러야 열린다.

## 4. 단원 틀(`settings` 구간 1-3)

| 설정 키 | 뜻 |
|---|---|
| `unit.vocab_count.1-3` | 단원 단어 수 |
| `unit.new_words_per_lesson.1-3` | 배정 수업마다 새 단어 수 k. 다지기 · 보강 카드의 다시 묻는 필수 질문 하한이기도 하다 |
| `unit.regular_lessons.1-3` | 정규 수업 수(배정 = 단원 단어 수 ÷ k, 나머지는 다지기) |
| `seed.remedial_per_unit.1-3` | 보강 카드 수 |
| `seed.topic_variants.1-3` | 주제 변형 수 |
| `seed.remedial_coverage.1-3` | 변형마다 보강 카드들을 합쳐 단원 단어마다 카드 글에 나와야 하는 횟수 |
| `talk.prep_words.1-3` | 배정 카드의 짧은 준비 낱말 수 |
| `talk.more_talk_turns` | 더 이야기할 거리 하한 |
| `talk.required_max_ratio` | 필수 질문 상한 = 참고 턴 15 × 이 값(인사 뺌) |
| `talk.known_days` | 단원 단어마다 다시 묻는 자리가 있어야 하는 서로 다른 수업 수(단원 덮기) |
| `seed.max_retries` | 검증 뒤 고침 회차 상한 |

2026-10-30 의 값으로 셈하면(호출 값이 우선한다) 단원 단어 25 · k 5 · 정규 10(배정 1~5 · 다지기 6~10) · 보강 3 · 변형 2 라 카드 26장이고, 짧은 준비 낱말 3 · 더 이야기할 거리 5개 이상 · 필수 질문 7개 이하(15 × 0.5 = 7.5)다.

코드의 정한 수(설정 키가 아니다, `structure.ts`): 인사 턴 수 1~2 · 한 항목이 노리는 단원 단어 1~2개 · 한 카드 안에서 글자가 같은 선생님 질문 2번까지(쉬운 질문 포함) · 오늘 이야기 목록 3~5개.

수업 번호(검증기 `layout`): `assigned` 1~5 · `reinforce` 6~10 · `remedial` 1~3 · `variant` 1~2. 이 수는 설정값이라 아이가 보는 글에 적지 않는다.

## 5. 수업 구성(정본 3.3 회화 · 회화 spec 설계 1~6)

**으뜸 원칙(C172 · C181): 카드와 목표는 대화를 돕는 장치이지 수업 완료를 위해 채우는 할당량이 아니다.** 카드의 필수 질문 · 새 단어 · 목표는 준비된 기회이고, 선생님(실시간 AI)은 아이 말의 흐름이 닿는 때에만 꺼낸다. 다 다루지 못한 기회는 다음 수업으로 넘어간다(이월). 그래서 카드는 모든 질문을 정한 차례로 묻는 각본이 아니고, 아무 때 꺼내도 홀로 뜻이 통하는 질문 묶음이다.

회화 수업은 아이가 고른 회화 선생님(앱 속 AI 선생님)이 이끄는 10분 안팎의 수업이다. 카드 한 장이 수업 하나다. 회화는 채점하지 않는다(R2). 틀린 말은 선생님이 바른 말로 되풀이하고, 낱말 답은 그 낱말이 든 바른 문장으로 넓혀 들려준다. 녹음은 하지 않는다.

### 네 토막과 카드 칸

| 토막 | 카드 칸 | 앱 · 선생님이 하는 일 |
|---|---|---|
| 인사 | `greeting.questions`(1개) · `greetingTurns` 1 | 선생님이 인사하고 안부를 묻는다. 힌트는 `hintKo` → `frameEn` → `hintEn` 이다. 인사는 평가 과제가 아니다 |
| 짧은 준비 | `prep`(배정 카드만) · `todayWords` 의 `word` · `meaningKo` · `imageKey` · `modelLine` | 선생님이 낱말 셋을 하나씩 소개한다. 쪽지에는 낱말 글 · 한국어 뜻 · (있으면) 그림이 있고 예문 글은 없다. 선생님이 `modelLine` 을 읽고 아이가 한 번 따라 말한다. 1분 안팎이다. 다지기 · 보강 카드는 `prep` 을 두지 않고 `todayWords` 도 `[]` 이며, 앱이 그 카드가 노리는 낱말 가운데 아직 '안다'가 아닌 것을 골라 같은 꼴로 보인다 |
| 대화 | `sceneOpener` · `required` · `more` · `flow` · `targetExpressions` · `goals` | 대화 첫 질문은 장면 여는 질문(`sceneOpener`)이다. 앱이 짧은 준비 끝 바로 뒤(준비가 없는 다지기 · 보강 카드는 인사 끝 턴 뒤)에 AI 없이 보이고 읽는다(13절 C206, 아래 '장면 여는 질문 쓰는 법'). 그 뒤는 선생님이 아이 답에 반응하고 그 답을 따라 다음 질문을 스스로 쓰며, 카드 기회(필수 질문 · 다시 쓰기 · 꺼낼 새 단어)를 자연스러운 때 고른다. 필수 질문은 카드 글을 바꿔 말해 물어도 된다. 앱은 따라가기 상한 · 질문 검사 실패 · 같은 질문 · 받침 · 마무리 때에만 카드 질문을 그대로 붙인다(카드 자리) |
| 정리 | `closingLines` · `farewell` | 대화 기록에서 아이가 스스로 한 말 가운데 오늘 쓸 말이 든 줄을 반짝이고, 되짚을 말을 선생님이 읽는다. 1~3단계는 되짚을 말 전체를 한 번 따라 말한다 |
| (어디서나) | `safeLines` · `praiseLines` · `safetyFarewell` · `endCondition` · `todayTopicsKo` · `topic` | 걸린 선생님 문장을 바꿀 대사 · 짧은 칭찬 · 안전 상한의 끝인사 · 끝맺음 조건 · 옆 칸 오늘 이야기 목록 · AI 에게 가는 카드 주제 |

### 필수 질문 쓰는 법(괄호는 걸리는 검증 규칙)

| 규칙 | 내용 |
|---|---|
| 무엇인가 | 카드가 준비하는 기회다. 새 단어를 처음 묻는 질문과 단원 목표의 수행 기회를 만드는 질문이다. 한 수업에서 다 물어야 하는 질문이 아니다 |
| 수 | 배정 카드: 새 단어마다 그 낱말 하나만 노리는 처음 묻는 질문(`ask: "first"`) 하나씩, k 개(`talk-first-ask`). 다지기 · 보강 카드: 처음 묻는 질문이 없고 다시 묻는 질문(`ask: "re_ask"`)이 k 개 이상(`talk-required`). 모든 카드: 필수 질문 수 ≤ 참고 턴 × `talk.required_max_ratio`(`talk-required`). 나머지 턴은 아이 말을 따라갈 자리다 |
| 번호 | `no` 는 1부터 차례대로(`talk-numbers`). 대화 첫 질문은 필수 질문 1번이 아니라 장면 여는 질문이다(C206). 필수 질문은 그 뒤 선생님이 아이 말이 닿을 때 고르는 기회다 |
| 홀로 뜻이 통함 | (제안) 질문은 앞 턴에 무슨 말이 오갔든 그것만으로 뜻이 통하게 쓴다. 필요한 장면은 질문 앞의 짧은 한 문장이나 질문 문장 안의 말로 준다(`The stars are out! What do you do in your bed?` ○, `What do you see there?` ×). 앱이 아무 때나 카드 자리로 그대로 붙이기 때문이다. 앞 문장은 물건 · 장면 말로 쓴다(`Oh, cold water!` · `Sand on your hands!` · `The sun is down.`). 아이의 상태 · 행동을 단정하는 말(`You are thirsty.` · `You play in the sun.` · `You have a kite.`)과 알림 · 명령(`Lunch is ready!`)은 쓰지 않는다. 아이가 겪지 않은 상태를 선생님이 정해 버리고, '상태 단정 + What do you do ~?' 꼴이 이어지면 낱말 맞히기처럼 들리기 때문이다(첫 프리뷰 2026-11-05, 13절 C202 (3) · (7) 잠정). 질문 글은 두 문장까지다(선생님 차례는 반응까지 합쳐 짧고, 카드 자리에는 AI 반응이 앞에 붙는다, 02-2 190줄) |
| 노리는 단어 | 한 항목에 단원 단어 1~2개, 이 단원 단어만(`talk-targets`). (제안) 한 항목은 한 낱말을 노린다. 둘을 노리면 같은 갈래(동사끼리 · 명사끼리)만 묶는다(5절 '목표 잇기') |
| 질문에 노리는 단어 없음 | 질문(`en`)과 쉬운 질문(`easyQuestion.en`)에 그 항목이 노리는 단어가 활용형까지 없다(`talk-targets`, A4-03). 예: go 를 노리는 항목에 `Where do you go?` ×, beach 를 노리는 항목에 `Do you like the beach?` × |
| 처음 묻는 질문의 힌트 | 영어 문장 힌트(`hints[1]`)에 그 새 단어가 원형이나 활용형으로 든다(`talk-first-ask`). 새 단어는 아이 차례 글(힌트 · 답 예시 · 목표 표현) 어딘가에 원형으로 한 번 이상 나온다(`vocab-allocation`). 들려줄 말 · 오늘 쓸 말 예문은 이 셈에 들지 않는다 |
| 같은 질문 | 한 카드 안에서 같은 선생님 질문(인사 · 필수 · 더 · 쉬운 질문을 합쳐)은 2번까지다(`talk-same-question`). **같은지는 질문 글의 마지막 물음표 문장으로 본다**(대소문자 · 따옴표 · 문장 부호 · 띄어쓰기 · 줄임꼴 무시). 앱이 선생님 차례의 같은 질문을 이 문장으로 세기 때문이다(02-2 200줄 · 13절 C172, 실행 상한은 설정값 `talk.same_question_max`). 그래서 앞 장면이 달라도 `Sandwiches for lunch! What do you do?` 와 `Oh, cold water! What do you do?` 는 같은 질문이다. (제안) 한 카드 안의 마지막 물음표 문장은 모두 다르게 쓰고, 장면 없는 `What do you do?` 로 끝내지 않는다. 장면은 질문 문장 안에 둔다(`What do you do at the table?`). AI 질문도 같은 셈에 들어가므로(02-2 200줄 '카드 · AI 모두'), 이 단원에서 가장 흔한 꼴을 카드가 먼저 쓰면 셈이 빨리 찬다. 8절 질문 꼴을 돌려 쓰고, 14절 스스로 확인 명령이 이 셈을 본다 |
| 뒤 수업 단어 | 배정 카드 m 은 어디에도(질문 · 힌트 · 답 예시 · 쉬운 질문 · 오늘 쓸 말 예문 · 들려줄 말 · 대사 · 끝인사 · 칭찬, (제안) 예상 흐름도) 배정 m+1 이후의 단원 단어를 쓰지 않는다(경고 `relation-early-use`). 단원 1 은 see · look · make 가 배정 3 새 단어라, 배정 1 · 2 카드에서는 `See you!` · `Look!` · `I see.` 도 걸린다 |

### 장면 여는 질문 쓰는 법(정본 02-2:200 · 06:186, 13절 C206)

1~3단계 카드에는 장면 여는 질문(`sceneOpener`)이 하나 있다. 짧은 준비 끝 바로 뒤(준비가 없으면 인사 끝 턴 뒤)에 앱이 대화 첫 질문으로 보이고 읽는다. AI 를 부르지 않으므로 기다림이 없다. 아이가 답하면 선생님(AI)이 그 답을 따라 이어 묻는다. 카드는 장면 · 주제만 준비하고, '예라고 하면 … · 아니요라고 하면 …' 같은 대본을 어느 칸(예상 흐름 포함)에도 두지 않는다(요청자 결정 2026-11-06 '장면 여는 질문 칸은 고정 대본 느낌 금지').

| 규칙 | 내용 |
|---|---|
| 무엇인가 | 오늘 장면을 열고 아이 자기 이야기를 묻는 예 · 아니요 질문이다. 필수 질문이 아니고 카드 기회 · 학습 기회 셈에 들지 않으므로, 노리는 단어 · 목표 칸이 없다. 이 판의 카드는 모두 이 칸을 둔다(검증기 `talk-scene-opener` 는 개정 5 부터 칸이 없으면 막는다) |
| 글 | `question.en` 은 장면 말 한 문장과 예 · 아니요 질문 하나로, 두 문장까지다. 물음표 문장은 마지막 하나뿐이다. 장면 말은 물건 · 곳의 말로 쓰고 아이의 상태 · 행동을 단정하지 않는다(C202 (3), 위 '홀로 뜻이 통함'과 같다). 예: `Bikes and ducks at the lake! Do you ride a bike?` |
| 질문 꼴 | 질문 문장의 첫 낱말은 조동사 · be 이고 'or' 가 없다(`talk-scene-opener`). 3단계 단원 1 의 형태 범위(8절)에서 쓸 수 있는 첫 낱말은 `Do` · `Is` · `Are` · `Can` 이다. `Does`(3인칭 -s) · `Did` · `Was` · `Were` · `Will` 과 `Is there` 는 형태 범위 밖이다(`learning-elements`) |
| 낱말 | (제안) 이 단원 단어 25개를 장면 여는 질문의 모든 영어 칸(질문 · 힌트 · 틀 · 답 예시 · 쉬운 질문)에 쓰지 않는다. 검증기는 그 카드가 노리는 단어만 막지만, 다른 단원 단어도 배정 차례(`relation-early-use`) · 단원 단어 목록(`unit-words-unlisted`)에 걸리기 쉽다. 다지기 · 보강 카드는 sea · beach · mountain 같은 곳 이름이 노리는 단어이므로, 장면 말을 물 · 해 · 나무 · 모래 같은 물건으로 그린다(`Hot sun and cool water!`). 어휘는 7절 범위다. weekend · Saturday · day · today · summer · trip · boat · picnic 은 범위 밖이고, `talk-scene-opener` 는 범위 밖 낱말이 하나라도 있으면 막는다 |
| 같은 질문 | 마지막 물음표 문장 열쇠가 그 카드의 인사 · 필수 · 쉬운 · 더 이야기할 거리 질문과 달라야 한다(`talk-scene-opener`). 정본 예 `We are at the lake! Do you like the lake?` 는 배정 1 카드의 쉬운 질문 `Do you like the lake?` 와 열쇠가 같아서 걸렸다. 정본 예를 그대로 옮기지 않는다 |
| 좋은 질문 | 요청자가 번호로 고른 표본의 기준이다. (가) 오늘 장면을 연다. (나) 아이가 실제로 하는 일 · 할 수 있는 일을 묻는다(C211 (1) 아이 이야기 우선). (다) 예 · 아니요 어느 답이든 선생님이 이어 물을 거리가 있다. (라) 그 카드 필수 질문의 주제와 겹치지 않는다. 겹치면 아이가 같은 답을 두 번 하거나 '아까 물었는데' 하고 느낀다. 주제 겹침은 14절 스크립트가 보지 못하므로, 카드 계획표에서 장면 여는 질문을 필수 질문 · 더 이야기할 거리의 장면 · 하는 일과 하나씩 견주어 사람이 확인한다(예: 장면 여는 질문이 집에서 책 읽기를 묻는데 필수 질문 1 이 `What do you do at home?` 이면 겹친다). (마) 대부분의 아이가 참으로 '예'라고 답할 수 있다. 답 예시가 `Yes` 로 시작하고, 받침 첫째 · 셋째에서 아이가 그 문장을 같이 말하기 때문이다. 장면 속 사실을 맞히는 질문(`Is the water cold?`)과 대답 뒤 이어 갈 거리가 좁은 질문(`Do you have a hat?`)은 피한다 |
| 꼴 돌려 쓰기 | (제안) 질문 문장의 첫 세 낱말(정규화, 예 `do you ride` · `can you swim` · `do you play`)을 꼴로 본다. 같은 꼴은 변형마다 세 장까지이고, 같은 변형에서 차례가 바로 앞인 카드와 같은 꼴을 쓰지 않는다. 한 단원에서 장면 여는 질문의 마지막 물음표 문장 열쇠는 모두 다르다. 쉬운 질문에 이미 많은 `Do you like …?` 꼴은 장면 여는 질문에 쓰지 않는다(고정 카드 두 장의 필수 · 더 이야기할 거리 쉬운 질문 21개 가운데 13개가 이 꼴이다). 대본 느낌은 카드 한 장보다 한 단원에서 같은 첫 질문 꼴이 되풀이될 때 커진다. 14절 스스로 확인이 이 셈을 본다 |
| 받침 칸 | `question.ko` 는 반말 뜻이다. `hintKo` 는 답 예시의 반말 뜻이다. `frameEn` 은 3단계에 꼭 있고(`talk-scene-opener`), 답 예시에서 동사나 아이 자기 말이 들어갈 자리를 `___` 하나로 바꾼 꼴이다(`Yes, I ___ a bike.` · `Yes, I can ___.`). `hintEn` 은 (제안) 답 예시와 같다. `answerExample` 은 `Yes` · `No` 로 시작하는 7낱말 이하 한 문장이다(`Yes, I ride a bike.`). 한 낱말 답(`Yes!`)도 받는 질문이라 대화에서는 그 답으로 충분하다. `easyQuestion` 은 물음표로 끝나는 더 쉬운 예 · 아니요 질문이고 `ko` 가 있으며, 장면 여는 질문 · 그 카드의 다른 질문과 열쇠가 다르다. `choices` 는 1단계 카드만 둔다(3단계 카드에 두면 막힌다) |
| 예상 흐름 | `flow` 첫 줄은 모든 카드에서 `After the scene question, the teacher follows the child's answer.` 이다(spec 설계 5 '고정 대본 막기'). 주제를 덧붙이거나 '예 뒤 · 아니요 뒤' 갈래를 쓰지 않는다. 둘째 줄부터는 아래 '그 밖의 칸' 규칙대로 쓴다 |

### 받침 줄과 힌트

아이가 막히면(‘잘 모르겠어요’ 단추나 막힘 말) 같은 질문을 다시 묻지 않고 차례대로 돕는다. 첫째는 같이 말하기(답 예시를 소리로 들려주고 아이가 따라 한다), 둘째는 쉬운 질문, 셋째는 닫기(답을 한 번 들려주고 다음 이야기로 간다)다. 카드는 그 줄을 준다.

| 칸 | 쓰는 법 |
|---|---|
| `answerExample` | 같이 말하기 · 닫기에서 소리로 들려줄 답 하나. 7낱말 이하 한 문장. talk-3-1-1 을 노리는 항목은 `I · We · They + 노리는 동사(원형) …` 으로 시작한다(앱이 주어를 바꾼 세 꼴로 expression 을 본다, 0절 판단 1). talk-3-1-2 항목도 한 문장으로 쓴다(`We go to the beach.` · `I see clouds.`) |
| `hints` | `[영어 틀, 영어 문장]` 두 단(`talk-hints`). 영어 틀은 영어 문장에서 노리는 단어 자리를 `___` 하나로 바꾼 꼴이다(`I ___ in my bed.`). (제안) 영어 문장 = `answerExample` |
| `hintKo` | 영어 문장의 한국어 뜻(아이가 할 말이라 반말: `나는 내 침대에서 자.`). 뜻만 보고 말하면 스스로 한 것으로 센다(S1) |
| `easyQuestion` | `{ "en", "ko" }`. 물음표로 끝나고 그 질문과 정규화한 글이 다르다(`talk-support`). 노리는 단어가 없다(`talk-targets`). (제안) 아이가 `Yes.` · `No.` 로도 답할 수 있는 예 · 아니요 질문(`Do you like your bed?` · `Are you hungry?`)으로 쓴다. 고르는 질문은 노리는 단어가 들어가 쓸 수 없다. 1~4단계는 쉬운 질문에도 한국어 뜻 `ko` 가 있어야 하고 검증기 `talk-ko` 가 막는다(13절 C194 (2): 화면이 1~4단계 선생님 말 아래 뜻을 보인다) |
| 앞 턴과 상관없음 | 힌트 · 답 예시는 앞 턴에 아이가 어떤 답을 했어도 맞는 문장으로 쓴다. 앞 답을 되받는 문장(`You like the sea too!`)을 두지 않는다 |

### 짧은 준비와 꺼내기

- 배정 카드의 `prep` 은 `talk.prep_words.1-3` 개이고 오늘 쓸 말 안의 낱말이며, 그 낱말을 처음 묻는 필수 질문이 필수 질문 목록의 앞쪽 절반(목록 차례로 1번부터 필수 질문 수의 절반을 올린 번호까지) 안에 있다(`talk-prep`). 정본 6.3 의 '대화 앞쪽 절반'을 검증기는 이 목록 차례로 본다. (제안) 필수 질문 1~3번이 노리는 새 단어를 그 차례대로 `prep` 에 둔다. 다지기 · 보강 카드는 `prep` 칸을 두지 않는다(두면 `talk-prep`).
- `todayWords` 는 배정 카드의 새 단어 k 개를 배정표 차례로(제안), 다지기 · 보강 카드는 `[]` 다(`talk-today`: 새 단어 목록과 같다). 칸마다 `word` · `meaningKo`(6절 뜻을 짧게) · `example`(그 낱말이 든 7낱말 이하 한 문장, 아이에게 글로 보이지 않고 AI 와 4단계부터 쪽지가 쓴다) · `modelLine` · `imageKey`(9절, 그림이 있는 낱말만)다.
- `modelLine` 은 선생님이 들려주고 아이가 한 번 따라 말하는 짧은 말이다(1~3단계는 'An apple.' 꼴). (제안) 동사는 `I + 낱말.`(`I sleep.` · `I eat.`), 명사는 `The + 낱말.`(`The sea.` · `The mountain.`)이나 셀 수 없는 말은 낱말만(`Rain.` · `Snow.` · `Air.`) 쓴다. 짧은 준비 · 꺼내기 · 바닥선 듣기 활동이 같은 말을 쓴다.
- 짧은 준비에 없는 새 단어(배정 카드의 나머지 k − `talk.prep_words.1-3` 개)는 선생님이 대화 중에 꺼낸다. 뜻이 드러나는 말로 그 낱말을 들려주고 아이가 한 번 따라 하게 한 뒤, 그 낱말의 필수 질문을 자연스러운 때 묻는다. 카드는 그 낱말의 `modelLine` 과 필수 질문을 준비하고, `flow` 한 줄에 꺼낼 낱말을 적는다(`The teacher brings in study and learn when the child talks about a desk or a new game.`).

### 더 이야기할 거리

`more` 는 `talk.more_talk_turns` 개 이상이고 모두 다시 묻는 질문이다(`talk-more`, 칸은 필수 질문과 같고 쉬운 질문 · 한국어 뜻도 똑같이 있어야 한다). 아이가 '더 이야기하기'를 고를 때와, 다시 쓰기가 남은 낱말 · 이월 낱말을 노릴 질문으로 쓴다. 받침 셋째 닫기 · 들리지 않음 닫기에서 붙일 기회가 남지 않으면 앱이 가장 오래전에 쓴 더 이야기할 거리를 카드 자리로 그대로 붙인다(13절 C194 (1), 잠정). 그래서 더 이야기할 거리는 막혔던 질문의 답을 들려준 바로 뒤에 그대로 읽어도 맞는 꼴로 쓴다: 앞 대화를 가리키는 말(there · it · that · too) 없이 장면을 스스로 주는 질문 하나이고(`Oh, cold water! What do you do with your cup?` ○, `And what do you do there?` ×), 앞 문장은 필수 질문과 같이 물건 · 장면 말로 쓰며(5절 '홀로 뜻이 통함'), 막힌 질문과 같은 낱말을 노리지 않아도 되게 카드 안에서 노리는 낱말을 고루 나눈다. 더 이야기할 거리도 5절 '같은 질문' 셈에 든다: 선생님 질문의 마지막 물음표 문장이 한 카드에서 글자가 같은 것은 2번까지이고(앱이 이 문장으로 센다), (제안) 필수 질문 · 다른 더 이야기할 거리와 마지막 물음표 문장이 겹치지 않게 쓴다. 막힌 질문의 답 바로 뒤에 꼬리가 같은 질문이 붙으면 C172 의 '막힘에는 질문을 바꾼다'가 아이 귀에 서지 않는다. 노리는 단어는 그 카드에서 이미 열린 단원 단어(배정 카드는 그 수업까지 배정된 낱말, 다지기 · 보강은 단원 단어 전부)이고, (제안) 그 카드의 필수 질문이 덜 노린 낱말을 앞세운다. 단원 덮기(`talk-known-days`, 단원을 다 채운 뒤): 단원 단어마다 다지기 · 보강의 다시 묻는 필수 질문과 모든 카드의 더 이야기할 거리를 합쳐 서로 다른 수업 `talk.known_days` 개 이상에서 노린다.

### 목표 잇기(평가 spec 2절 · 0절 판단 1)

| 노리는 단어 | 항목의 `goals` | 까닭 |
|---|---|---|
| 동사 13개(eat … make) | `["talk-3-1-1"]` | 하는 일을 '누가 + 하는 일' 한 문장으로 답하는 기회다. 판정은 알맞은 응답(response)과 문장 꼴(expression)이다. 질문 속 낱말을 받아 답을 만드는 것도 스스로 한 것이다(질문 바꾸기) |
| 장소 · 자연 · 날씨 명사 12개(sky … air) | `["talk-3-1-2"]` | 그 낱말을 스스로 떠올려 알맞게 답하는 기회다. 판정은 낱말 회상(word)과 알맞은 응답이다. talk-3-1-1 은 잇지 않는다 |

- 카드 `goals` 의 목표 ID 는 모두 `talk-3-1-<n>` 꼴이고 단원 규격(unit-specs) talk 3단계 단원 1 goals 의 id 안이다(지금 talk-3-1-1 · talk-3-1-2 둘, `talk-goals`). 항목의 `goals` 는 카드 `goals` 안이다. 카드 `goals` 는 그 카드의 필수 질문 · 더 이야기할 거리가 노리는 목표의 합이고, 카드 목표마다 필수 질문 하나 이상이 그 목표를 노린다(`talk-goals`). 더 이야기할 거리만 노리는 목표가 생기면 그 목표의 필수 질문을 하나 더 두거나(상한 안) 그 더 이야기할 거리를 바꾼다.
- 요구 능력 `demands` 는 항목마다 본다(`talk-demands`). 항목 하나가 목표 둘 이상을 가리키면 그 항목에 `demands` 가 있어야 하고, 목표마다 그 주된 능력('정보 묻고 답하기')이 `demands` 안이어야 한다. 항목이 목표 하나를 가리키면 카드 `goals` 가 둘이어도 `demands` 를 두지 않는다(목표의 주된 능력으로 본다, 2026-10-30 09:3x 검증기로 확인). 이 판은 목표 여럿을 가리키는 항목을 두지 않는다. 두게 되면 `demands: ["정보 묻고 답하기"]` 를 단다. home 밖 `purpose` 를 단 항목도 `demands` 가 있어야 하지만 이 판은 `purpose` 를 두지 않는다.
- `purpose` 는 카드 · 항목 모두 두지 않는다(목표 home '선생님과 이야기'로 본다, 17절).
- 이 칸들은 근거 기록이 읽는다. 아이 화면 · 점수에는 나오지 않는다.

### 그 밖의 칸

| 칸 | 쓰는 법 |
|---|---|
| `targetExpressions` | (제안) 3~5개. 이 카드에서 아이가 쓰게 할 한 문장(필수 질문 답 예시 꼴). 화면에 보이지 않는다 |
| `closingLines` | (제안) 3~5줄. 오늘 쓸 말(다지기 · 보강은 그 카드가 노린 단원 단어)이 든 7낱말 이하 영어 문장과 `ko`(반말). 아이가 따라 말한다 |
| `flow` | (제안) 3~5줄. 첫 줄은 `After the scene question, the teacher follows the child's answer.` 이다(5절 '장면 여는 질문 쓰는 법'). AI 에게 주는 이야기 흐름의 예다. `The teacher …` 꼴로 짧게 쓰고, 필수 질문을 꺼내기 좋은 장면과 꺼낼 새 단어를 적는다. 모든 질문을 차례대로 묻는 꼴로 쓰지 않는다. 문장 길이 · 형태 검사 밖이지만 금지어 · 선생님 이름 검사는 받는다. weekend · day 는 여기에도 쓰지 않는다(0절 판단 2) |
| `todayTopicsKo` | 3~5개(`talk-today`). 아이 옆 칸의 한국어 짧은 이름꼴(`집에서 하는 일` · `바다와 산`) |
| `topic` | 한국어 한 줄. AI 에게 '카드 주제'로 간다. 단원 주제 + 장면(`주말에 하는 일 · 가족과 강가 나들이`). '주말'은 여기와 제목 · 오늘 이야기 같은 한국어 칸에만 쓴다 |
| `title` | 한국어 10자 안팎. 단원 안 카드의 제목이 서로 다르다. 선생님 이름을 쓰지 않는다 |
| `safeLines` | (제안) 2~3줄 + `ko`. 걸린 선생님 문장을 바꾸는 짧은 반응이다. 물음표가 없고, 칭찬 · 판정 말이 아니며, 노리는 단어가 없다(`Oh, okay!` · `Wow, fun!`) |
| `praiseLines` | (제안) 3~4개. 짧은 칭찬(`Wow!` · `Good!` · `Great!` · `Nice!`). `ko` 칸이 없다 |
| `farewell` · `safetyFarewell` | 끝인사 + `ko`, '새 이야기로 이어 가자' 끝인사 + `ko`(안전 상한용). 배정 1 · 2 카드는 `See you!` 를 쓰지 않는다(see 가 배정 3 낱말). 예: `Bye, {NAME}! Have fun!` · `Bye for now, {NAME}!` |
| `endCondition` | 한국어 한 줄(검토용). (제안) `마무리 물음에 답하거나 그만하기를 고르면 정리로 간다.` 참고 턴을 채우면 끝난다는 말을 쓰지 않는다 |
| `newWords` | 배정 카드는 6절 배정표의 k 개, 다지기 · 보강은 `[]`(`vocab-allocation`) |
| `unitWords` | 카드 영어 글(질문 · 쉬운 질문 · 힌트 · 답 예시 · 오늘 쓸 말 예문 · 들려줄 말 · 목표 표현 · 정리 대사 · 안전한 대사 · 끝인사 · 칭찬)에 나온 단원 단어 전부. 예상 흐름 · 한국어 칸은 세지 않는다. 빠지면 경고 `unit-words-unlisted`, 글에 없는 낱말을 적으면 오류 `unit-words` |

### 흐름 예(요청자가 고른 승인 표본의 대화 줄)

아래 줄은 대화의 결을 보이는 예다. 낱말 · 문장 꼴은 이 단계 범위(7 · 8절)를 따르고 그대로 옮기지 않는다. 출처: `.superpowers/sdd/2026-10-29-회화-수업을-대화로/samples.md`(sha256 e0e4a9899a7bfcf5739f2b2b212768707a4040537d159349b6a0f287ea47425b) 표본 2, 같은 폴더 `samples-level4-5.md`(sha256 0be72c006a09659dbaed3cd4f1a5557f64a3aba07e078a5599b60f3782c76e68) 표본 B · C. 요청자가 표본 2 와 B 를 고른 것은 C172 다. 표본의 말한 이 이름은 '선생님'으로 바꿔 적었고(10절 '선생님 이름을 쓰지 않는다'), '(줄임)'은 뺀 말이다.

```
[표본 2 · 1단계 · 짧은 준비 뒤 대화]
선생님(소리): Before we talk, three words! [앱 고정 말]
선생님(소리): 〈Apple.〉 〔사과.〕 / 아이: "Apple." · 따라
선생님(소리): Great! Now let's talk. [앱 고정 말]
선생님(소리): Are you {NAME}? [카드 첫 질문, 짧은 준비에서 들은 말이라 아이가 바로 답함]
아이: "Yes! My name is {NAME}." · 스스로 ✓ name
선생님(소리): Nice to meet you! (줄임) What is it? [Claude 반응 + 카드 질문, 사과 그림]
아이: "Apple!" · 스스로 ✓ apple
선생님(소리): Yes, it is an apple! (줄임) [Claude 넓혀 들려주기]

[표본 B · 4단계 · 대화 중심]
선생님(소리): Great! Is art hard, too? [Claude, 노리는 단어 easy]
아이: "No! Easy." · 스스로 ✓ easy
선생님(소리): Art is easy for you! Where do you learn about animals? [넓혀 들려주기 · 다시 묻지 않음 + 카드 3번]
아이: "In science class. I like dinosaurs!" · 스스로(아이가 공룡 이야기를 꺼냄)
선생님(소리): Dinosaurs! Cool. Do you have a favorite dinosaur? [아이 이야기 따라가기]
아이: "T-rex! It is very big and strong."
선생님(소리): Yes, T-rex is so big! Can you draw a T-rex? [오늘 이야기로 돌아옴]

[표본 C · 5단계 · 상황극]
아이: "Yes! My mom like watermelon very much." · 스스로(아이가 엄마 이야기를 꺼냄)
선생님(소리): Your mom likes watermelon! Do you eat it in summer? [바른 말로 되풀이 + 따라가기]
아이: "Yes. We eat watermelon every summer at my grandma's house."
선생님(소리): Sounds fun! Okay. How many do you want? [가족 이야기는 더 묻지 않고 돌아옴]
```

카드가 이 결을 돕는 법: 첫 필수 질문은 짧은 준비 낱말로 바로 답할 수 있게 쓴다(표본 2). 질문은 홀로 뜻이 통해야 선생님이 아이 이야기를 따라갔다가 돌아올 때 붙일 수 있다(표본 B · C). 가족 이야기는 함께 하는 일까지만 받고 더 캐묻지 않는다(표본 C, 10절).

## 6. 단원 규격과 배정표(`unit-specs` · 배정 함수)

배정표는 앱의 배정 함수가 단원 단어를 차례대로 k 개씩 나눈 결과다. `newWords` 는 표와 낱말 모음이 같아야 한다(검증기 `vocab-allocation`). 이 판은 단원 1 만 만든다.

### 단원 1 — 주말에 하는 일 · 학습 요소 '일반동사 현재(I · you · we · they)'

- 단원 단어 25개(배정 차례 그대로): eat, drink, go, come, wash, sleep, study, learn, watch, listen, look, see, make, sky, sea, cloud, rain, snow, wind, river, mountain, beach, grass, forest, air
- 갈래: 동사 13개(eat … make) · 장소 · 자연 · 날씨 명사 12개(sky … air). 갈래가 목표를 정한다(5절 '목표 잇기').
- 그림이 있는 단원 단어: eat · drink · go · come · wash(9절). 나머지 20개는 그림이 없다.

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) | 카드 goals |
|---|---|---|---|
| 1 | assigned | eat(먹다) · drink(마시다) · go(가다) · come(오다) · wash(씻다) | [talk-3-1-1] |
| 2 | assigned | sleep(자다) · study(공부하다) · learn(배우다) · watch(보다) · listen(듣다) | [talk-3-1-1] |
| 3 | assigned | look(보다) · see(보다, 보이다) · make(만들다) · sky(하늘) · sea(바다) | [talk-3-1-1, talk-3-1-2] |
| 4 | assigned | cloud(구름) · rain(비) · snow(눈) · wind(바람) · river(강) | [talk-3-1-2](동사 다시 묻기 항목을 두면 둘 다) |
| 5 | assigned | mountain(산) · beach(해변) · grass(풀, 잔디) · forest(숲) · air(공기) | [talk-3-1-2](같음) |
| 6~10 | reinforce | [] (새 단어 없음) | 노린 낱말에 따라(11절) |
| 보강 1~3 | remedial | [] (새 단어 없음) | 노린 낱말에 따라 |

단원 목표(잠정, 요청자 승인 전, `unit-specs` goals 그대로):

| id | 목표 글 | 주된 능력 | needs · accept | 이 단원에서 |
|---|---|---|---|---|
| talk-3-1-1 | 주말에 나나 가족이 하는 일을 묻는 말에 '누가(I · we · they) + 하는 일' 한 문장으로 답할 수 있다 | 정보 묻고 답하기 | response · expression · meaning | 동사를 노린 필수 질문 · 더 이야기할 거리 |
| talk-3-1-2 | 주말에 가는 곳이나 그곳의 자연 · 날씨를 묻는 말에 바다 · 산 · 비 · 눈 같은 낱말을 영어로 스스로 떠올려 답할 수 있다 | 정보 묻고 답하기 | word · response · meaning(words: 명사 12개) | 명사를 노린 필수 질문 · 더 이야기할 거리 |

두 목표 모두 home 은 '선생님과 이야기'이고 tasks 는 card-answer · follow-up · child-topic · test-turn 이다. talk-3-1-1 의 '가족이 하는 일'은 they 로 가족을 받는 질문(`Your family! What do they do at home?` → `They watch a soccer game.`)으로 연다(10절).

## 7. 단계 어휘 범위(vocab 3단계)

검증기는 회화 카드 글의 어휘 범위를 세지 않는다. 그래서 아래 범위는 생성자가 지키고 14절 스스로 확인 명령으로 본다.

| 글 칸 | 쓸 수 있는 낱말 |
|---|---|
| 아이 차례 영어: 인사 `hintEn` · `frameEn` · `answerExample`, 항목 `hints` · `answerExample`, 오늘 쓸 말 `example` · `modelLine`, `closingLines`, `targetExpressions` | 1~2단계 낱말(활용형 포함) · 3단계 기능어 we · they · 이 단원 단어 가운데 그 카드에서 열린 것(배정 m 카드는 배정 1~m 의 새 단어, 다지기 · 보강은 25개 전부) · `{NAME}`. (제안) 1~3단계 실시간 AI 힌트 검사(그 단계 이하 vocab · 단원 단어 · `{NAME}`)보다 좁다. 아직 배우지 않은 3단계 낱말이 미리 나오지 않게 한다(읽기 3단계와 같은 기준) |
| 선생님 쪽 영어: 인사 질문, 항목 `en` · `easyQuestion.en`, `safeLines` · `praiseLines` · `farewell` · `safetyFarewell` | 위와 같은 범위 + where(물음에만, 8절 C64 (3)) |
| 예상 흐름 `flow` | AI 에게 주는 지시 글이라 낱말 범위를 따지지 않는다. 다만 weekend · day 와 뒤 배정 수업 단어는 쓰지 않는다 |

흔하지만 쓰지 않는 낱말(괄호는 vocab 단계, '밖'은 vocab 에 없음): weekend(4) · day(4) · Saturday · Sunday(4) · morning(4) · night(4) · today(4) · tomorrow(4) · time(4) · every(4) · together(4) · too(4) · also(4) · after(4) · before(4) · then(7) · by(4) · weather(4) · sunny · rainy · windy · cloudy(4) · warm(4) · love(4) · feel(4) · dinner · breakfast(4) · movie · video(4) · camping · camp(4) · trip · holiday · visit · stay(6) · boat · bake(5) · English · class(4) · our · their(4) · them · us(5) · TV · picnic · pool · fishing · cartoon · grandma · grandpa(밖, grandmother · grandfather 는 2단계라 된다) · there(3, 단원 2 'There is' 와 겹쳐 쓰지 않는다) · these · those · who(3). 회화 3단계 다른 단원 단어도 쓰지 않는다(아래 목록 끝).

**1~2단계 기능어 44개**: `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 [am, is, are, was, were, been, being] · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) [does, did, done, doing] · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의 · `all` 모든, 모두 · `at` ~에(서), ~을(보다) · `can` ~할 수 있다 · `down` 아래로 · `for` ~을 위해, ~을 위한 · `from` ~에서, ~로부터 · `he` 그는 · `of` ~의 · `or` 또는 · `out` 밖으로, 밖에 · `she` 그녀는 · `with` ~와 함께, ~로

**1단계 내용어 151개**(활용형): `ant` [ants] · `apple` [apples] · `arm` [arms] · `bag` [bags] · `ball` [balls] · `banana` [bananas] · `bank` [banks] · `bath` [baths] · `bear` [bears] · `bed` [beds] · `bell` [bells] · `big` [bigger, biggest] · `bike` [bikes] · `bird` [birds] · `black` [blacks] · `blue` [blues] · `book` [books] · `box` [boxes] · `brush` [brushes, brushed, brushing] · `bus` [buses] · `cake` [cakes] · `candy` [candies] · `cap` [caps] · `car` [cars] · `cat` [cats] · `chair` [chairs] · `cheese` [cheeses] · `chicken` [chickens] · `clock` [clocks] · `color` [colors] · `cookie` [cookies] · `cow` [cows] · `cup` [cups] · `cute` [cuter, cutest] · `desk` [desks] · `dish` [dishes] · `dog` [dogs] · `doll` [dolls] · `door` [doors] · `drum` [drums] · `duck` [ducks] · `ear` [ears] · `egg` [eggs] · `eight` · `elephant` [elephants] · `eye` [eyes] · `face` [faces] · `fan` [fans] · `fish` · `five` · `flower` [flowers] · `fork` [forks] · `four` · `fox` [foxes] · `frog` [frogs] · `game` [games] · `grape` [grapes] · `green` [greens] · `guitar` [guitars] · `hand` [hands] · `hat` [hats] · `home` [homes] · `horse` [horses] · `hot` [hotter, hottest] · `insect` [insects] · `jacket` [jackets] · `jam` [jams] · `juice` · `key` [keys] · `king` [kings] · `kite` [kites] · `lake` [lakes] · `lamp` [lamps] · `leg` [legs] · `like` [likes, liked, liking] · `lion` [lions] · `little` · `long` [longer, longest] · `lunch` · `map` [maps] · `milk` · `monkey` [monkeys] · `mouth` [mouths] · `name` [names] · `neck` [necks] · `nice` [nicer, nicest] · `nine` · `nose` [noses] · `nurse` [nurses] · `octopus` [octopuses] · `old` [older, oldest] · `one` · `orange` [oranges] · `pen` [pens] · `pencil` [pencils] · `piano` [pianos] · `pig` [pigs] · `pink` [pinks] · `pizza` [pizzas] · `plane` [planes] · `pot` [pots] · `puppy` [puppies] · `queen` [queens] · `rabbit` [rabbits] · `red` [reds] · `rice` · `ring` [rings, rang, rung, ringing] · `robot` [robots] · `rock` [rocks] · `rose` [roses] · `sand` · `seven` · `sheep` · `shell` [shells] · `ship` [ships] · `shirt` [shirts] · `shoe` [shoes] · `shop` [shops, shopped, shopping] · `short` [shorter, shortest] · `six` · `small` [smaller, smallest] · `smile` [smiles, smiled, smiling] · `snack` [snacks] · `snake` [snakes] · `sock` [socks] · `song` [songs] · `star` [stars] · `sun` [suns] · `swing` [swings, swung, swinging] · `tall` [taller, tallest] · `ten` · `tent` [tents] · `thank` [thanks, thanked, thanking] · `thick` [thicker, thickest] · `thin` [thinner, thinnest] · `three` · `tiger` [tigers] · `tooth` [teeth] · `top` [tops] · `toy` [toys] · `tree` [trees] · `truck` [trucks] · `two` · `umbrella` [umbrellas] · `violin` [violins] · `white` [whites] · `window` [windows] · `wing` [wings] · `yellow` [yellows] · `yo-yo` [yo-yos] · `zebra` [zebras]

**2단계 내용어 125개**(활용형): `angry` [angrier, angriest] · `animal` [animals] · `aunt` [aunts] · `baby` [babies] · `bad` [worse, worst] · `badminton` · `baseball` · `basketball` · `beautiful` · `boy` [boys] · `brother` [brothers] · `busy` [busier, busiest] · `catch` [catches, caught, catching] · `chocolate` [chocolates] · `climb` [climbs, climbed, climbing] · `coat` [coats] · `cold` [colder, coldest] · `computer` [computers] · `cook` [cooks, cooked, cooking] · `cool` [cooler, coolest] · `corn` · `cousin` [cousins] · `dad` [dads] · `dance` [dances, danced, dancing] · `doctor` [doctors] · `dolphin` [dolphins] · `draw` [draws, drew, drawn, drawing] · `dress` [dresses] · `family` [families] · `farmer` [farmers] · `fast` [faster, fastest] · `father` [fathers] · `fine` · `finger` [fingers] · `fly` [flies, flew, flown, flying] · `food` [foods] · `foot` [feet] · `friend` [friends] · `fruit` [fruits] · `fun` · `funny` [funnier, funniest] · `gift` [gifts] · `giraffe` [giraffes] · `girl` [girls] · `glad` · `glasses` · `goat` [goats] · `good` [better, best] · `grandfather` [grandfathers] · `grandmother` [grandmothers] · `great` [greater, greatest] · `hair` [hairs] · `hamburger` [hamburgers] · `happy` [happier, happiest] · `have` [has, had, having] · `head` [heads] · `help` [helps, helped, helping] · `here` · `house` [houses] · `hungry` [hungrier, hungriest] · `ice cream` [ice creams] · `jeans` · `jump` [jumps, jumped, jumping] · `kick` [kicks, kicked, kicking] · `kind` [kinder, kindest] · `knee` [knees] · `know` [knows, knew, known, knowing] · `man` [men] · `mom` [moms] · `mother` [mothers] · `music` · `need` [needs, needed, needing] · `new` [newer, newest] · `now` · `pants` · `penguin` [penguins] · `pet` [pets] · `phone` [phones] · `play` [plays, played, playing] · `police` · `potato` [potatoes] · `pretty` [prettier, prettiest] · `read` [reads, reading] · `ready` · `really` · `ride` [rides, rode, ridden, riding] · `room` [rooms] · `run` [runs, ran, running] · `sad` [sadder, saddest] · `sandwich` [sandwiches] · `scarf` [scarves] · `shoulder` [shoulders] · `sick` [sicker, sickest] · `sing` [sings, sang, sung, singing] · `sister` [sisters] · `skate` [skates, skated, skating] · `ski` [skis, skied, skiing] · `skirt` [skirts] · `sleepy` [sleepier, sleepiest] · `slow` [slower, slowest] · `smart` [smarter, smartest] · `soccer` · `sorry` · `strawberry` [strawberries] · `strong` [stronger, strongest] · `student` [students] · `sweater` [sweaters] · `swim` [swims, swam, swum, swimming] · `table` [tables] · `teacher` [teachers] · `tennis` · `thirsty` [thirstier, thirstiest] · `throw` [throws, threw, thrown, throwing] · `tired` · `toe` [toes] · `turtle` [turtles] · `uncle` [uncles] · `very` · `walk` [walks, walked, walking] · `want` [wants, wanted, wanting] · `water` · `whale` [whales] · `woman` [women] · `write` [writes, wrote, written, writing] · `young` [younger, youngest]

**회화 3단계 단원 1 단원 단어 25개**(배정 차례): `eat` 먹다 [eats, ate, eaten, eating] · `drink` 마시다, 음료 [drinks, drank, drunk, drinking] · `go` 가다 [goes, went, gone, going] · `come` 오다 [comes, came, coming] · `wash` 씻다 [washes, washed, washing] · `sleep` 자다 [sleeps, slept, sleeping] · `study` 공부하다 [studies, studied, studying] · `learn` 배우다 [learns, learned, learning] · `watch` 보다, 손목시계 [watches, watched, watching] · `listen` 듣다 [listens, listened, listening] · `look` 보다 [looks, looked, looking] · `see` 보다, 보이다 [sees, saw, seen, seeing] · `make` 만들다 [makes, made, making] · `sky` 하늘 [skies] · `sea` 바다 [seas] · `cloud` 구름 [clouds] · `rain` 비, 비가 오다 [rains, rained, raining] · `snow` 눈, 눈이 오다 [snows, snowed, snowing] · `wind` 바람 [winds] · `river` 강 [rivers] · `mountain` 산 [mountains] · `beach` 해변 [beaches] · `grass` 풀, 잔디 [grasses] · `forest` 숲 [forests] · `air` 공기

**회화 3단계 다른 단원 단어(쓰지 않는다)**: 단원 2: school, park, zoo, farm, store, market, library, hospital, garden, playground, street, town, city, dark, bright, round, soft, hard, cut, paint, fix, carry, pick, drop, hold / 단원 3: classroom, bedroom, bathroom, living room, restaurant, wall, floor, corner, side, front, bottom, middle, child, train, taxi, airplane, subway, bridge, road, way, far, high, low, large, back / 단원 4: open, close, sit, stand, stop, wait, put, take, give, get, clean, turn, left, squirrel, puzzle, block, balloon, soup, fire, end, safe, quick, move, push, pull / 단원 5: say, talk, ask, answer, meet, live, find, bring, let, age, birthday, question, number, basket, eraser, ruler, crayon, scissors, glue, notebook, textbook, paper, picture, bottle, card

## 8. 학습 요소 범위와 문장 꼴(정본 3.6 · C64)

카드 글은 앞 단계 전부, 같은 단계의 앞 단원, 이번 단원의 요소만 쓴다(C64 (1)). 1~2단계 요소는 `a · an + 명사` / `This is ~` / `색 · 크기 + 명사` / `I like ~` / `수 + 복수 -s` / `I am · You are` / `He · She · It is` / `have` / `can` / `Is it ~? · Do you ~?` 이고, 3단계 단원 1 요소는 `일반동사 현재(I · you · we · they)` 다.

| 쓰는 곳 | 쓸 수 있는 꼴(제안) | 예 |
|---|---|---|
| 아이 답(힌트 · 답 예시 · 목표 표현 · 정리 대사) | I · We · They + 하는 일(원형) + 무엇 · 어디 · with ~. 1~2단계 꼴(is · am · are · have · can · like) | `We go to the lake.` · `I eat rice with my family.` · `They watch a soccer game.` · `I see clouds.` · `I am at the beach.` · `It is grass.` |
| 선생님 질문 | 3.3 회화 3단계 행이 '한 문장으로 답하게 묻고, 이어 묻는다'를 요구하므로 What · Where 물음은 C64 (3)대로 검출하지 않고 쓴다(0절 판단 3, 회화 1단계의 `What is it?` · `What do you like?` 와 같은 길): `What do you do ~?` · `Where do you go ~?` · `What do you see ~?` · `What is it?` · `Where are you?` 와 `Do you ~?` · `Are you ~?`. 장면을 주는 짧은 앞 문장은 물건 · 장면 말(`Oh, cold water!` · `Your family!` · `Many trees!` · `The sun is down.`)로 쓰고, 아이 상태 · 행동을 단정하는 문장(`You are tired.` · `You walk up and up.`)과 알림 · 명령(`Lunch is ready!`)은 쓰지 않는다(5절 '홀로 뜻이 통함'). 질문 문장 안의 장면 말(`at the table` · `with your cup`)도 쓴다. 마지막 물음표 문장을 장면 없는 `What do you do?` 로 줄이지 않는다(5절 '같은 질문') | `Oh, cold water! What do you do with your cup?` · `With your family, what do you do?` · `Many trees! Where are you?` |
| 쉬운 질문 | 예 · 아니요 꼴(`Do you like ~?` · `Are you ~?` · `Do you have ~?` · `Do they like ~?`) | `Do you like your bed?` |

검증기가 오류로 잡는 꼴(형태 표 `forms.json`, 회화 3단계 단원 1 에서 범위 밖. 아래 예는 2026-10-30 실제 검출기로 대조했다):

| 꼴 | 걸리는 예 | 열리는 때 |
|---|---|---|
| 3인칭 단수 -s(이름 · 가족 · it 뒤) | `My dad goes to the river.` · `It rains.` · `It snows.` | 4단계 단원 1 |
| don't · does | `We don't go to school.` | 4단계 단원 2 |
| 현재진행 | `It is raining.` · `We are swimming.` | 4단계 단원 3 |
| 동명사(like + -ing) | `I like swimming.` | 9단계 |
| 시각 · 요일(at · on) | `On Sunday, we eat pizza.` | 4단계 단원 5 |
| There is · Let's | `There is a river.` · `Let's go to the beach!` | 3단계 단원 2 · 단원 4 |
| 과거 · want to | `We went to the sea.` · `I want to swim.` | 7단계 · 5단계 |

검출기가 못 잡지만 쓰지 않는 꼴: 명령문(`Look at the sky!`, 3단계 단원 4. `I look at the birds.` 는 된다) · 부정 명령문(`Don't worry!` · `Don't go!`. 명령문은 3단계 단원 4, don't 는 4단계 단원 2 요소다. 형태 표 `dont` 는 주어가 있는 꼴만 잡고 14절 어휘 검사는 `don't` 를 `do` 로 펼쳐 넘긴다 → `It is okay!` 꼴로) · go + -ing(`I go swimming.` → `We swim in the sea.`) · 비 · 눈을 동사로(`It rains.` 는 걸리고 `Rain falls.` 도 -s 다 → `I see rain.` · `I like snow.` 처럼 명사로) · 이름 · 가족 뒤 동사의 -s(가족은 `we` · `they` 로 받는다) · 문장을 잇는 and · but · or(명사 둘을 잇는 and 는 된다) · our · their. 그래서 '가족이 집에서 TV 를 본다'는 `They watch a soccer game.` 꼴로, '비가 와요'는 `I see rain.` 꼴로 쓴다.

질문에 넣을 수 없는 낱말의 질문 꼴(제안 · 예. 한 카드 안에서 꼴을 돌려 쓴다). 스물다섯 줄의 열쇠(마지막 물음표 문장을 5절 '같은 질문'대로 정규화한 글)가 모두 다르다. 장면을 바꿔 써도 되지만 꼬리를 장면 없는 `What do you do?` 로 줄이지 않는다. 앞 문장은 모두 물건 · 장면 말이고 아이 상태 · 행동을 단정하지 않는다(5절 '홀로 뜻이 통함'):

| 낱말 | 질문 예 | 답 예시 예 | 열쇠 |
|---|---|---|---|
| eat | `Sandwiches for lunch! What do you do at the table?` | `I eat a sandwich.` | what do you do at the table |
| drink | `Oh, cold water! What do you do with your cup?` | `I drink water.` | what do you do with your cup |
| go | `With your family, what do you do?` | `We go to the lake.` | with your family what do you do |
| come | `The sun is down. What do you do now?` | `We come home.` | what do you do now |
| wash | `Sand on your hands! What do you do with water?` | `I wash my hands.` | what do you do with water |
| sleep | `The stars are out! What do you do in your bed?` | `I sleep in my bed.` | what do you do in your bed |
| study | `What do you do at your desk?` | `I study at my desk.` | what do you do at your desk |
| learn | `What do you do with new games?` | `I learn new games.` | what do you do with new games |
| watch | `What do you do at home?` | `We watch a soccer game.` | what do you do at home |
| listen | `In the car, what do you do?` | `I listen to songs.` | in the car what do you do |
| look | `Birds in the tree! What do you do with your eyes?` | `I look at the birds.` | what do you do with your eyes |
| see | `At the lake, what do you do?` | `I see ducks.` | at the lake what do you do |
| make | `Oh, sand! What do you do with it?` | `I make a sand house.` | what do you do with it |
| sky | `The sun is up. Where is it?` | `It is in the sky.` | where is it |
| sea | `Fish and whales! Where are they?` | `They are in the sea.` | where are they |
| cloud | `What is white in the sky?` | `It is a cloud.` | what is white in the sky |
| rain | `A big umbrella! What do you see?` | `I see rain.` | what do you see |
| snow | `It is very cold. What is on the trees?` | `It is snow.` | what is on the trees |
| wind | `A red kite! What do you need?` | `I need the wind.` | what do you need |
| river | `Where do ducks swim?` | `They swim in the river.` | where do ducks swim |
| mountain | `With your family, where do you go?` | `We go to the mountain.` | with your family where do you go |
| beach | `Sand and shells! Where do you play?` | `We play at the beach.` | where do you play |
| grass | `Cows and sheep! What do they eat?` | `They eat grass.` | what do they eat |
| forest | `Many trees! Where are you?` | `I am in the forest.` | where are you |
| air | `Up on a mountain! How is it?` | `The air is good.` | how is it |

표의 질문 · 답에 나온 낱말 가운데 그 카드에서 아직 열리지 않은 단원 단어(예: 배정 1 카드의 sand 는 되지만 sky · see 는 안 됨)는 쓰지 않는다. wind · air 처럼 질문으로 끌어내기 어려운 낱말은 (제안) 짧은 준비 낱말에 넣지 말고 꺼내기로 들려준 뒤 묻는다.

## 9. 그림 규칙

- 그림 키(`imageKey`)는 인사 질문 · 오늘 쓸 말 · 필수 질문 · 더 이야기할 거리에 둘 수 있고, 아래 카탈로그의 키만 쓴다(검증기 `talk-images`).
- 단원 단어 가운데 그림이 있는 것은 동사 다섯이다: `eat`(그릇을 든 아이가 숟가락을 입에 넣음) · `drink`(주스 컵을 기울여 입에 댄 아이) · `go`(오른쪽으로 걸어가는 아이와 앞으로 향한 화살표) · `come`(두 팔을 벌린 아이와 아이 쪽으로 오는 화살표) · `wash`(수도꼭지 물 아래 두 손과 비누 거품). (제안) 이 다섯은 오늘 쓸 말(`todayWords.imageKey`)에 그 그림을 두어 짧은 준비 쪽지에 보이고, 그 낱말을 처음 묻는 필수 질문에는 두지 않는다. 그림이 답을 그대로 보여 주기 때문이다.
- 명사 12개는 그림이 없다. 항목의 그림은 질문이 가리키는 물건이 1~2단계 그림 낱말일 때만 둔다(`In the car, what do you do?` 에 `car`, `What do you do at your desk?` 에 `desk`). 그림과 질문 · 힌트 글이 맞아야 하고, 그림이 없어도 되면 두지 않는다.
- 카탈로그 키(217): angry, ant, apple, arm, baby, badminton, bag, ball, banana, bank, baseball, basketball, bath, bathroom, bear, bed, bedroom, bell, bike, bird, black, blue, book, box, boy, brush, bus, cake, candy, cap, car, cat, catch, chair, cheese, chicken, chocolate, classroom, climb, clock, coat, come, computer, cook, cookie, corn, cow, cup, dance, desk, dish, doctor, dog, doll, dolphin, door, draw, dress, drink, drum, duck, ear, eat, egg, eight, elephant, eye, face, family, fan, farmer, finger, fish, five, flower, fly, foot, fork, four, fox, frog, gift, giraffe, girl, glasses, go, goat, grandfather, grandmother, grape, green, guitar, hair, hamburger, hand, happy, hat, head, horse, house, hungry, ice-cream, insect, jacket, jam, jeans, juice, jump, key, kick, king, kite, knee, lake, lamp, leg, lion, living-room, man, map, milk, monkey, mouth, neck, nine, nose, nurse, octopus, one, orange, pants, pen, pencil, penguin, phone, piano, pig, pink, pizza, plane, police, pot, potato, queen, rabbit, read, red, restaurant, rice, ride, ring, robot, rock, rose, run, sad, sand, sandwich, scarf, seven, sheep, shell, ship, shirt, shoe, shop, shoulder, sick, sing, six, skate, ski, skirt, sleepy, smile, snake, soccer, sock, star, strawberry, strong, student, sun, sweater, swim, swing, table, teacher, ten, tennis, tent, thirsty, three, throw, tiger, tired, toe, tooth, top, tree, truck, turtle, two, umbrella, violin, walk, wash, water, whale, white, window, wing, woman, write, yellow, yo-yo, zebra

## 10. 주제 묶음 · 변형 · 선생님 · 인물

- `variant` 1 = 주제 묶음 1(동물 · 자연 · 음식 · 가족), `variant` 2 = 주제 묶음 2(놀이 · 운동 · 게임 · 우주 · 탈것). 묶음 id 와 변형 번호가 같다(C54 (3)).
- 단원 주제 '주말에 하는 일'은 그대로 두고 장면 · 예시만 묶음에 맞춘다(정본 6.3). (제안) 변형 1 은 가족과 하는 나들이 · 먹고 마시기 · 자연 속 동물(호수 · 강 · 바다 · 산 · 숲), 변형 2 는 집 · 차 · 버스 안의 놀이 · 운동 · 게임 · 별 보기다. 묶음은 제목만이 아니라 글에 드러나게 한다.
- 같은 단원 3단계 다른 영역 장면과 겹치지 않게 한다: 읽기 '친구가 놀러 온 날', 말하기 '친구들이 놀러 왔어요'(they 중심 이야기)다. 회화는 아이 자신과 가족의 주말이고, 친구가 집에 놀러 오는 장면을 쓰지 않는다.
- 같은 (kind, lessonNo) 의 두 변형은 `newWords` 가 같고 분량(필수 질문 · 더 이야기할 거리 수, 인사 턴 수)이 같다(검증기 `topic-variants`). (제안) 인사 턴 수는 모든 카드 1 이다.
- 한 단원 카드의 제목과 장면이 서로 겹치지 않게 한다. 앞에서 쓴 제목 · 장면 목록을 적어 가며 만든다.
- 주말은 영어로 쓰지 않는다(0절 판단 2). 영어 질문은 'with your family' · 'at home' · 'in the car' 같은 장면 말로 쉬는 날의 일을 묻는다.

### 선생님(C117 · C122 · C130)

- 말하는 이는 아이가 고른 회화 선생님(앱 속 AI 선생님)이다. 어느 선생님이 고르든 같은 카드를 쓴다.
- **선생님 이름을 쓰지 않는다.** 'Tori' · '토리'와 명단 이름(지금 Mina · 미나 · Leo · 리오)을 카드의 모든 글 칸(영어 · 한국어 · 제목 · 주제 · 예상 흐름 · 대사 · 끝인사)에 쓰지 않는다(검증기 `teacher-name`). 영어는 대소문자를 가리지 않고 낱말 경계로, 한국어는 앞 글자가 한글이 아니면 뒤에 무엇이 붙어도 건다. 토리는 회화 글에 등장인물로도 쓰지 않는다.
- 자리 표시자 `{TEACHER}` 를 쓰지 않는다. 틀 자리는 `{NAME}` 하나뿐이다(검증기 `talk-placeholder`). 예상 흐름의 선생님은 'The teacher' 다.
- (제안) 뒤에 명단에 들어올 이름도 미리 피한다: Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi, 루비 · 소라 · 하나 · 나비 · 루나 · 키키 · 루루 · 팡팡 · 삐삐. 한국어에서 흔한 말과 같은 글자는 다른 말로 쓴다('하나' → '한 개' · '한 번', '소라' → '조개'). '준'은 영어 `Jun` 만 피하고 한국어 칸에서는 보지 않는다. '준비' · '준다' 같은 흔한 말을 막지 않기 위해서다. 검증기 `teacher-name` 은 명단에 든 이름만 보고, 이름으로 시작하는 보통 낱말은 명단 칸의 예외로 뺀다(C141).
- 선생님은 사람의 삶을 지어내지 않는다(6.3 · 05:62). 주말에 어디 가거나 무엇을 했다는 선생님 말(`I go to the beach.`)을 쓰지 않는다. 선생님 자기 이야기가 꼭 필요하면 앱 속 선생님으로 말이 되는 좋아하는 것만(`I like the sea. And you?`), 한 카드에 한 번까지다(제안). 선생님이 사람 · 동물 · 남자 · 여자라고 말하지 않는다.
- 아이에게 묻지 않는 것: 사는 곳 · 집 주소 · 학교 이름 · 반 · 전화번호 · 이메일 · 성 · 전체 이름 · 비밀번호 · 사진 · 만나자는 말 · 생김새 평가(6.2 · 13절). (제안) 가족은 '함께 하는 일'만 묻고(`With your family, what do you do?` · `Your family! What do they do at home?`), 가족이 누구인지 · 이름 · 하는 일(직업) · 사는 곳 · 집안 사정은 묻지 않는다. 특정 가족(엄마 · 아빠)을 정해 묻지 않는다. 아이마다 가족 꼴이 다르기 때문이다.

### `{NAME}`

- `{NAME}` 은 회화 카드 글에 쓸 수 있는 유일한 틀 자리다(6.1). 인사 · 끝인사에 쓰고, (제안) 그 밖에서 부르는 말로는 한 카드에 세 번까지 쓴다.
- 한국어 칸에서 `{NAME}` 바로 뒤에 조사를 붙이지 않는다(받침을 모른다): `안녕, {NAME}!` ○ · `{NAME}는` × · `{NAME}야` ×.

### 인물(C124)

- 회화 3단계는 아이 자신과 가족의 주말을 묻는다. 이름 표의 인물은 거의 필요 없다. 넣는다면 선생님 질문 앞 짧은 말에만 두고, 아이 차례 영어(힌트 · 답 예시 · 목표 표현 · 정리 대사 · 오늘 쓸 말 예문 · 들려줄 말)에는 넣지 않는다(제안: 음성 인식이 이름을 다른 글자로 적어 일치율이 깎인다).
- 이름 표: Momo(아이 · 모모) · Ben(남자아이 · 벤) · Meg(여자아이 · 메그) · Dan(남자아이 · 댄) · Tess(여자아이 · 테스) · Max(강아지 · 맥스) · Ted(곰 · 테드) · Gus(오리 · 거스). 표 밖의 이름을 새로 만들지 않는다. 이름을 부르는 말로 문장 앞뒤에 붙이지 않는다. 이름 뒤 동사는 -s 가 붙어 범위 밖이 되므로 인물이 무엇을 하는지 묻지 않는다.
- 셈(단원 파일 하나, 카드 N 장): 이름 표의 이름이 영어 칸 어디든 나오는 카드를 n, 그 가운데 Momo 가 나오는 카드를 m 이라 할 때 n ≤ ⌊N/4⌋ · m ≤ max(⌊N/8⌋, ⌊n/2⌋) 이다. 두 장 호출(N = 2)이면 이름을 쓰지 않는다.

## 11. 수업 종류별 내용

| kind | 새 단어 | 내용 |
|---|---|---|
| `assigned`(배정 1~5) | 6절 표의 k 개 | `todayWords` = 새 단어. `prep` = 필수 질문 1~3번이 노리는 새 단어. 새 단어마다 처음 묻는 필수 질문 하나(k 개). (제안) 배정 2~5 는 앞 배정 낱말을 다시 묻는 필수 질문을 상한 안에서 하나까지 더할 수 있고, 배정 1 은 k 개만 둔다. 더 이야기할 거리는 그 수업까지 열린 낱말을 다시 묻는다. 정리 대사 · 목표 표현에 새 단어를 고루 둔다. 뒤 배정 수업의 단원 단어는 어디에도 쓰지 않는다 |
| `reinforce`(다지기 6~10) | 없음 | `todayWords` `[]` · `prep` 없음. 다시 묻는 필수 질문 k 개 이상(상한 안) · 더 이야기할 거리. 다지기 다섯을 합쳐 단원 단어가 모두 노려지고 글에 다시 나온다(경고 `relation-not-reused`). (제안) 다지기 6 은 배정 1 의 동사 다섯과 장소 명사 둘~셋(beach · mountain · river · sea 가운데)을 섞어 [talk-3-1-1, talk-3-1-2] 를 노린다(0절 판단 4). 7 은 배정 2 의 동사와 날씨 명사(rain · snow · wind), 8 은 배정 3 의 낱말과 cloud · grass, 9 는 배정 4 · 5 의 명사와 동사 몇, 10 은 단원 전체를 고루 노린다. 단원 단어마다 다시 묻는 자리가 서로 다른 수업 `talk.known_days` 개 이상이다 |
| `remedial`(보강 1~3) | 없음 | `todayWords` `[]` · `prep` 없음. 단원의 약한 단어를 다시 쓰게 하는 대화다. (제안) 보강 1 은 배정 1 · 2 의 동사, 보강 2 는 배정 3 · 4 의 낱말, 보강 3 은 배정 5 의 낱말과 끌어내기 어려운 낱말(wind · air · learn · study)을 몰아 노린다. 변형마다 보강 셋을 합쳐 단원 단어마다 `seed.remedial_coverage.1-3` 번 이상 카드 글에 나온다(`remedial-coverage`). 2번 이상을 목표로 하고 그 셈을 보고한다 |

첫 프리뷰 두 장(1절 (가))에 더하는 것:

- 배정 1 · 변형 1: 새 단어가 모두 동사라 카드 goals 는 [talk-3-1-1] 하나다. 변형 1 묶음(동물 · 자연 · 음식 · 가족)의 주말 장면으로 쓴다. 배정 2 이후 낱말(see · look · make 와 명사 12개)을 어디에도 쓰지 않는다. `See you!` · `Look!` 도 쓰지 않는다.
- 다지기 6 · 변형 1: 프리뷰의 아이는 배정 2~5 를 하지 않았으므로 명사는 처음 듣는 낱말일 수 있다. 다지기의 짧은 준비가 아직 '안다'가 아닌 낱말을 셋까지 앞세우지만, 명사를 노리는 항목은 막혀도 받침이 이어지게 쉬운 질문을 예 · 아니요로 쉽게 쓰고 답 예시를 짧게 둔다(`Do you like the water?` · `I am at the beach.`). 배정 1 의 동사 다섯이 모두 이 카드에 다시 나온다(경고 `relation-not-reused` 를 막는다).
- 두 장 호출의 검증에서는 단원 단위 경고 `talk-unit-incomplete`(단원 칸이 다 차지 않음)가 나오는 것이 맞다. 그 밖의 오류 · 경고는 고친다.

보강 덮기 셈(제안): 그 변형 보강 카드 가운데 그 단어가 카드 영어 글(질문 · 쉬운 질문 · 힌트 · 답 예시 · 대사)에 나온 카드 수다. '1번 이상'이 검증기 기준이고 '2번 이상'은 보고용이다.

## 12. 출력 규격(Zod `TalkLessonSchema` · `TalkCardSchema` 와 1:1)

모르는 키는 거부된다. 필드 이름 · 꼴을 그대로 쓴다. 이 절은 `src/core/seed/schema/talk.ts`(TalkCardSchema · TalkGreetingQuestionSchema · TalkTodayWordSchema · TalkSceneOpenerSchema · TalkRequiredSchema · TalkMoreSchema)와 `src/core/seed/schema/lesson.ts`(TalkLessonSchema)의 꼴이다. 회화 plan 묶음 3 구현이 끝난 뒤(fix 1 09:2x) 2026-10-30 09:3x 에 다시 대조했다. 코드 검토에서 바뀌면 컨트롤러가 이 절을 다시 맞춘다. 옛 꼴 카드(turns · moreTalk · questions · firstQuestion 이 있는 카드)는 모르는 키라 거부되고, 검증기가 `talk-card-v1` 오류 한 줄을 더 낸다.

파일 겉: `{ "area": "talk", "level": 3, "unit": <단원>, "lessons": [ … ] }`. 회화 수업에는 `preview` 칸이 없다.

| 필드 | 꼴 | 설명 |
|---|---|---|
| `kind` · `lessonNo` · `variant` | 4절 번호 규칙 | 수업 종류(11절) · 번호 · 주제 변형 |
| `revision` · `correction` | 0 이상 정수 | 호출 값 |
| `generation` | `{ "method": "generated", "model", "effort", "briefHash", "agentHash", "createdOn", "retries"? }` | 호출 값과 자기 모델 ID. `retries` 는 검증 뒤 고친 카드에만 그 회차 |
| `title` | 한국어 | 목록 제목 |
| `newWords` · `unitWords` | 낱말 id 목록 | 5절 표 |
| `card.topic` | 한국어 | AI 에게 가는 카드 주제 |
| `card.targetExpressions` | 영어 글 1개 이상 | 목표 표현 |
| `card.goals` | 목표 ID 목록(1개 이상, 겹침 없음) | 5절 '목표 잇기' |
| `card.purpose` | 두지 않는다 | 17절 |
| `card.greetingTurns` | 1 | 인사 턴 수 |
| `card.greeting` | `{ "questions": [인사 질문] }` | 인사 질문 = `{ "question": {"en", "ko"}, "hintKo", "hintEn", "frameEn", "answerExample", "imageKey"? }`. 3단계는 `frameEn` 이 있어야 한다 |
| `card.todayWords` | `[{ "word", "meaningKo", "example", "modelLine", "imageKey"? }]` | 배정은 새 단어 k 개, 다지기 · 보강은 `[]` |
| `card.prep` | 낱말 id 목록 | 배정 카드만 `talk.prep_words.1-3` 개. 다지기 · 보강은 칸을 두지 않는다 |
| `card.sceneOpener` | `{ "question": {"en", "ko"}, "hintKo", "hintEn", "frameEn", "answerExample", "easyQuestion": {"en", "ko"} }` | 장면 여는 질문(5절). 모든 카드에 하나. 3단계는 `frameEn` 이 있어야 한다. `choices`(1단계만) · `imageKey` · `targets` · `goals` 는 두지 않는다(모르는 키) |
| `card.required` | 필수 질문 1개 이상 | 필수 질문 = `{ "no", "en", "ko", "targets", "goals", "demands"?, "ask", "hintKo", "hints": [영어 틀, 영어 문장], "answerExample", "easyQuestion": {"en", "ko"}, "imageKey"? }`. `firstForm` · `choices` · `purpose` · `usablePhrases` 는 두지 않는다 |
| `card.more` | 더 이야기할 거리 | 필수 질문과 같은 꼴(`firstForm` · `choices` 칸은 꼴에 없다). `ask` 는 모두 `re_ask` |
| `card.flow` | 영어 글 1개 이상 | 예상 흐름 |
| `card.todayTopicsKo` | 한국어 3~5개 | 오늘 이야기 목록 |
| `card.closingLines` · `card.safeLines` | `[{ "en", "ko" }]` 1개 이상 | 정리 대사 · 안전한 대사 |
| `card.endCondition` | 한국어 | 끝맺음 조건 |
| `card.farewell` · `card.safetyFarewell` | `{ "en", "ko" }` | 끝인사 · '새 이야기로 이어 가자' 끝인사 |
| `card.praiseLines` | 영어 글 1개 이상 | 짧은 칭찬 |

두지 않는 칸: `card.missions` · `card.roleSwap` · `card.purpose` · 항목의 `firstForm` · `choices` · `usablePhrases` · `purpose`, 옛 칸 `turns` · `moreTalk` · `questions` · `firstQuestion` · `exampleKo` · 인사의 `twoAnswers`.

예시: 단원 1 배정 2 · 변형 2(꼴을 보이는 예이니 그대로 옮기지 않는다. 이 칸을 만들 때도 새로 쓴다). 이 카드 하나만 든 파일을 p13d 규격 파일 사본에 두고 `pnpm -s seed:validate --areas talk` 로 확인했다(2026-10-30 첫 판, 묶음 3 fix 1 뒤의 검증기로 09:3x 에 다시 돌림. 2026-11-05 둘째 판에서 필수 3 · 5 와 더 1 · 2 의 질문을 마지막 물음표 문장이 겹치지 않게 고치고, 열쇠를 맞춘 검증기로 다시 돌림. 넷째 판에서 필수 3 · 더 1 · 2 의 앞 문장을 물건 · 장면 말로 바꾸고 다시 돌림. 2026-11-07 다섯째 판에서 장면 여는 질문 칸과 예상 흐름 첫 줄을 더하고, 장면 여는 질문 검사가 든 검증기로 다시 돌림. 같은 날 설계 검토 I-1 뒤 장면 여는 질문을 필수 1 의 '집에서 하는 일'과 겹치지 않는 집 밖 놀이로 바꾸고 다시 돌림): 칸 오류 0 · 칸 경고 0(단원 단위 경고 `talk-unit-incomplete` 하나는 카드 한 장이라 나오는 것이 맞다) · 14절 스스로 확인 명령 '걸림 없음'(같은 질문 열쇠는 카드에서 가장 많은 것이 1번).

```json
{
  "kind": "assigned",
  "lessonNo": 2,
  "variant": 2,
  "revision": 1,
  "correction": 0,
  "generation": {"method": "generated", "model": "claude-opus-5-5", "effort": "xhigh", "briefHash": "0000000000000000000000000000000000000000000000000000000000000000", "agentHash": "0000000000000000000000000000000000000000000000000000000000000000", "createdOn": "2026-10-30"},
  "title": "놀이하는 주말",
  "newWords": ["sleep", "study", "learn", "watch", "listen"],
  "unitWords": ["sleep", "study", "learn", "watch", "listen", "eat", "drink", "go"],
  "card": {
    "topic": "주말에 하는 일 · 집과 차 안의 놀이",
    "targetExpressions": ["We watch a soccer game.", "I listen to songs.", "I sleep in my bed.", "I study at my desk.", "I learn new games."],
    "goals": ["talk-3-1-1"],
    "greetingTurns": 1,
    "greeting": {"questions": [{"question": {"en": "Hi, {NAME}! How are you?", "ko": "안녕, {NAME}! 잘 지냈어?"}, "hintKo": "나는 좋아.", "hintEn": "I am good.", "frameEn": "I am ___.", "answerExample": "I am good."}]},
    "todayWords": [
      {"word": "watch", "meaningKo": "보다", "example": "We watch a soccer game.", "modelLine": "I watch."},
      {"word": "listen", "meaningKo": "듣다", "example": "I listen to music.", "modelLine": "I listen."},
      {"word": "sleep", "meaningKo": "자다", "example": "I sleep in a tent.", "modelLine": "I sleep."},
      {"word": "study", "meaningKo": "공부하다", "example": "I study at home.", "modelLine": "I study."},
      {"word": "learn", "meaningKo": "배우다", "example": "We learn a new game.", "modelLine": "I learn."}
    ],
    "prep": ["watch", "listen", "sleep"],
    "sceneOpener": {"question": {"en": "Red kites and big trees! Do you fly kites?", "ko": "빨간 연이랑 큰 나무야! 너는 연 날려?"}, "hintKo": "응, 나는 연을 날려.", "hintEn": "Yes, I fly kites.", "frameEn": "Yes, I ___ kites.", "answerExample": "Yes, I fly kites.", "easyQuestion": {"en": "Do you like kites?", "ko": "연 좋아해?"}},
    "required": [
      {"no": 1, "en": "What do you do at home?", "ko": "집에서 뭐 해?", "targets": ["watch"], "goals": ["talk-3-1-1"], "ask": "first", "hintKo": "우리는 축구 경기를 봐.", "hints": ["We ___ a soccer game.", "We watch a soccer game."], "answerExample": "We watch a soccer game.", "easyQuestion": {"en": "Do you like soccer games?", "ko": "축구 경기 좋아해?"}},
      {"no": 2, "en": "In the car, what do you do?", "ko": "차 안에서 뭐 해?", "targets": ["listen"], "goals": ["talk-3-1-1"], "ask": "first", "hintKo": "나는 노래를 들어.", "hints": ["I ___ to songs.", "I listen to songs."], "answerExample": "I listen to songs.", "easyQuestion": {"en": "Do you like songs?", "ko": "노래 좋아해?"}, "imageKey": "car"},
      {"no": 3, "en": "The stars are out! What do you do in your bed?", "ko": "별이 떴어! 침대에서 뭐 해?", "targets": ["sleep"], "goals": ["talk-3-1-1"], "ask": "first", "hintKo": "나는 내 침대에서 자.", "hints": ["I ___ in my bed.", "I sleep in my bed."], "answerExample": "I sleep in my bed.", "easyQuestion": {"en": "Do you like your bed?", "ko": "네 침대 좋아해?"}},
      {"no": 4, "en": "What do you do at your desk?", "ko": "책상에서 뭐 해?", "targets": ["study"], "goals": ["talk-3-1-1"], "ask": "first", "hintKo": "나는 내 책상에서 공부해.", "hints": ["I ___ at my desk.", "I study at my desk."], "answerExample": "I study at my desk.", "easyQuestion": {"en": "Do you have a desk?", "ko": "책상 있어?"}, "imageKey": "desk"},
      {"no": 5, "en": "What do you do with new games?", "ko": "새 놀이가 생기면 뭐 해?", "targets": ["learn"], "goals": ["talk-3-1-1"], "ask": "first", "hintKo": "나는 새 놀이를 배워.", "hints": ["I ___ new games.", "I learn new games."], "answerExample": "I learn new games.", "easyQuestion": {"en": "Do you like new games?", "ko": "새 놀이 좋아해?"}}
    ],
    "more": [
      {"no": 1, "en": "Sandwiches for lunch! What do you do at the table?", "ko": "점심은 샌드위치야! 식탁에서 뭐 해?", "targets": ["eat"], "goals": ["talk-3-1-1"], "ask": "re_ask", "hintKo": "나는 샌드위치를 먹어.", "hints": ["I ___ a sandwich.", "I eat a sandwich."], "answerExample": "I eat a sandwich.", "easyQuestion": {"en": "Do you like sandwiches?", "ko": "샌드위치 좋아해?"}, "imageKey": "table"},
      {"no": 2, "en": "Oh, cold water! What do you do with your cup?", "ko": "오, 시원한 물이야! 컵으로 뭐 해?", "targets": ["drink"], "goals": ["talk-3-1-1"], "ask": "re_ask", "hintKo": "나는 물을 마셔.", "hints": ["I ___ water.", "I drink water."], "answerExample": "I drink water.", "easyQuestion": {"en": "Do you like juice?", "ko": "주스 좋아해?"}},
      {"no": 3, "en": "What do you do with your friends?", "ko": "친구들이랑 뭐 해?", "targets": ["go"], "goals": ["talk-3-1-1"], "ask": "re_ask", "hintKo": "우리는 장난감 가게에 가.", "hints": ["We ___ to the toy shop.", "We go to the toy shop."], "answerExample": "We go to the toy shop.", "easyQuestion": {"en": "Do you have a toy shop?", "ko": "장난감 가게 있어?"}},
      {"no": 4, "en": "Your family! What do they do at home?", "ko": "가족! 가족은 집에서 뭐 해?", "targets": ["watch"], "goals": ["talk-3-1-1"], "ask": "re_ask", "hintKo": "가족은 축구 경기를 봐.", "hints": ["They ___ a soccer game.", "They watch a soccer game."], "answerExample": "They watch a soccer game.", "easyQuestion": {"en": "Do they like soccer?", "ko": "가족은 축구 좋아해?"}},
      {"no": 5, "en": "What do you do on the bus?", "ko": "버스에서 뭐 해?", "targets": ["listen"], "goals": ["talk-3-1-1"], "ask": "re_ask", "hintKo": "나는 음악을 들어.", "hints": ["I ___ to music.", "I listen to music."], "answerExample": "I listen to music.", "easyQuestion": {"en": "Do you like the bus?", "ko": "버스 좋아해?"}, "imageKey": "bus"}
    ],
    "flow": ["After the scene question, the teacher follows the child's answer.", "The teacher asks what the child does at home and in the car.", "The teacher brings in study and learn when the child talks about a desk or a new game.", "The teacher asks about the child's answers, one question at a time."],
    "todayTopicsKo": ["집에서 하는 일", "차 안에서 하는 일", "새 놀이 배우기"],
    "closingLines": [
      {"en": "We watch a soccer game.", "ko": "우리는 축구 경기를 봐."},
      {"en": "I listen to songs.", "ko": "나는 노래를 들어."},
      {"en": "I sleep in my bed.", "ko": "나는 내 침대에서 자."}
    ],
    "safeLines": [
      {"en": "Oh, okay!", "ko": "오, 그렇구나!"},
      {"en": "Wow, fun!", "ko": "와, 재밌다!"}
    ],
    "endCondition": "마무리 물음에 답하거나 그만하기를 고르면 정리로 간다.",
    "farewell": {"en": "Bye, {NAME}! Have fun!", "ko": "안녕, {NAME}! 즐겁게 보내!"},
    "safetyFarewell": {"en": "Bye for now, {NAME}!", "ko": "오늘은 여기까지! 안녕, {NAME}!"},
    "praiseLines": ["Wow!", "Good!", "Great!", "Nice!"]
  }
}
```

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말과 정규식(예: kill · gun · bomb · weapon · beer · wine · cigarette · drugs · stupid · idiot · dumb · shut up · hell · damn). 금지어 · 선생님 이름 검사는 예상 흐름에도 걸린다.
- 개인 정보를 묻는 말(영어 · 한국어): 사는 곳 · 집 주소 · 전화번호 · 학교 이름 · 반 · 성 · 전체 이름 · 이메일 · 비밀번호 · 사진 · 만나자는 말, 그리고 (제안) 가족이 누구인지 · 가족의 이름 · 직업 · 집안 사정 · 생김새 평가.
- 연락처 꼴: 전화번호 · 이메일 · 집 주소 · 웹 주소.
- 메타 문장(`meta-sentences.json`): the child · the user · the student · the learner · I should · I will now · as an AI · system prompt · the card says 등을 선생님이 말하는 칸에 쓰지 않는다(예상 흐름은 AI 지시 글이라 'the child' 를 써도 된다).
- 선생님 이름 · `{TEACHER}` · 토리(10절), 선생님이 사람 · 동물 · 남자 · 여자라고 말하는 글, 선생님의 사람 삶을 지어낸 글(주말에 무엇을 했다 · 어디 간다).
- (제안) 무섭거나 다치는 장면(물에 빠짐 · 산에서 길 잃음 · 불), 상표 · 실제 인물 · 종교 · 정치.
- 설계 숫자를 글에 쓰지 않는다(예: '오늘 다섯 개 배워요').
- 실제 아이 이름 · 실제 사람 이름.

## 14. 스스로 확인과 검증 명령

(나) 호출이면 파일을 다 쓴 뒤 먼저 고정 카드를 붙이고 해시를 대조한다(뿌리 · 단원 · 고정 카드 파일 · 고정 카드 해시를 호출 값으로 넣는다). 해시가 다르면 멈추고 보고한다. (가) 호출이면 이 명령을 돌리지 않는다.

```sh
python3 - <뿌리> <단원> <고정 카드 파일> <해시들(쉼표로 이음)> <<'PY'
import json, hashlib, sys
root, unit, fixed_path, want = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(",")
def norm(l): return hashlib.sha256(json.dumps(l, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
fixed = json.load(open(fixed_path))["lessons"]
got = sorted(norm(l) for l in fixed)
assert got == sorted(want), ("고정 카드 해시가 호출 값과 다르다", got)
keys = {(l["kind"], l["lessonNo"], l["variant"]) for l in fixed}
p = f"{root}/lessons/talk/3/{unit}.json"
d = json.load(open(p))
rest = [l for l in d["lessons"] if (l["kind"], l["lessonNo"], l["variant"]) not in keys]
rank = {"assigned": 0, "reinforce": 0, "remedial": 1}
d["lessons"] = sorted(fixed + rest, key=lambda l: (l["variant"], rank[l["kind"]], l["lessonNo"]))
open(p, "w").write(json.dumps(d, ensure_ascii=False, indent=1))
print("붙임: 카드", len(d["lessons"]), "· 고정", len(fixed), "· 해시 같음")
PY
```

그다음 하나씩 확인한다.

1. 카드 수가 호출의 '만들 카드'와 같다(전부면 변형 수 × (정규 + 보강), 고정 카드 포함). (kind, lessonNo, variant) 겹침 없음.
2. 카드마다 인사 1턴(`frameEn` 포함), 장면 여는 질문 하나(질문 · 뜻 · 뜻 힌트 · 영어 문장 힌트 · 영어 틀 · 답 예시 · 쉬운 질문), 예상 흐름 첫 줄이 5절의 고정 줄, 필수 질문 수가 4절 하한 · 상한 안, 더 이야기할 거리 `talk.more_talk_turns` 개 이상(모두 re_ask), 번호가 1부터 차례대로. 필수 질문 · 더 이야기할 거리 · 쉬운 질문마다 한국어 뜻 `ko`. `firstForm` · `choices` · `missions` · `roleSwap` · `purpose` · 옛 칸 없음.
3. 배정 카드: `newWords` · `todayWords` 가 배정표와 같고 `prep` 이 필수 질문 1~3번의 새 단어이며, 새 단어마다 처음 묻는 필수 질문이 하나씩이고 그 `hints[1]` 에 그 새 단어. 다지기 · 보강 카드: 처음 묻는 질문 없음, 다시 묻는 필수 질문 k 개 이상, `todayWords` `[]`, `prep` 없음.
4. 질문 · 쉬운 질문에 그 항목이 노리는 단어가 없다. 선생님 질문(인사 · 필수 · 더 · 쉬운 질문)의 마지막 물음표 문장(대소문자 · 따옴표 · 문장 부호 · 띄어쓰기 · 줄임꼴 무시)이 한 카드에서 글자가 같은 것은 2번까지다. 앱이 같은 질문을 이 문장으로 세기 때문이다(5절 '같은 질문'). 장면 없는 `What do you do?` 로 끝나는 질문이 없다. 질문이 홀로 뜻이 통한다. 쉬운 질문이 예 · 아니요 꼴이다. 장면 여는 질문은 두 문장 안이고 물음표 문장이 마지막 하나이며, 첫 낱말이 `Do` · `Is` · `Are` · `Can` 이고 'or' 가 없다. 그 열쇠가 카드의 다른 질문과 다르고, 답 예시가 `Yes` · `No` 로 시작하며, 이 단원 단어가 없다. 한 단원에서 장면 여는 질문 열쇠가 모두 다르고, 꼴(첫 세 낱말)이 변형마다 세 장까지이며 바로 앞 카드와 다르고, `Do you like` 꼴이 없다(5절 '장면 여는 질문 쓰는 법'). 장면 여는 질문이 그 카드 필수 질문 · 더 이야기할 거리와 주제가 겹치지 않는다(스크립트가 보지 못해 눈으로 본다).
5. 목표: 동사 항목은 [talk-3-1-1], 명사 항목은 [talk-3-1-2], 한 항목에 두 갈래를 섞지 않음, 카드 goals = 항목 목표의 합이고 카드 목표마다 필수 질문이 있다. talk-3-1-1 항목의 답 예시는 'I · We · They + 그 동사'로 시작한다.
6. 힌트: `hints` 두 단, 영어 틀에 `___` 하나, 영어 문장 = 답 예시, `hintKo` 는 반말 뜻.
7. 모든 영어 문장 7낱말 이하(예상 흐름 밖), 8절 꼴 밖의 형태 없음(3인칭 -s · don't · 진행형 · 과거 · There is · Let's · 명령문 · 부정 명령문 `Don't ~` · on + 요일), 뒤 배정 수업 단원 단어 없음.
8. 7절 어휘 범위(아래 스스로 확인 명령), weekend · day · 요일 없음, 수는 영어 낱말.
9. 그림 키가 9절 카탈로그에 있고, 처음 묻는 질문에 그 동사의 그림을 두지 않았으며, 그림과 글이 맞다.
10. (전부일 때) 다지기 다섯에 단원 단어가 모두 다시 나오고, 단어마다 다시 묻는 자리가 서로 다른 수업 `talk.known_days` 개 이상. 보강 셋에 단원 단어마다 `seed.remedial_coverage.1-3` 번 이상(변형마다).
11. 변형 1 · 2 의 같은 칸끼리 새 단어 · 분량이 같고, 제목이 서로 다르며, 읽기 · 말하기 3단계 단원 1 장면(친구가 놀러 옴)을 쓰지 않았다.
12. 선생님: 이름 · 토리 · `{TEACHER}` 없음(뒤 명단 포함), 선생님의 사람 삶 · 주말 이야기 없음, 개인 정보 · 가족 캐묻기 없음. 한국어 칸에 '하나 · 소라 · 나비' 없음('준'은 영어 `Jun` 만 본다), `{NAME}` 뒤 조사 없음.
13. 인물: n · m 상한 안, 부르는 말 없음, 아이 차례 영어에 이름 없음, 표 밖 이름 없음.
14. 한국어 뜻이 반말이고 영어 뜻과 맞다. 13절 금지 목록에 걸리는 말이 없다.

검증기가 이 카드에 거는 규칙(`check-talk.ts` · 공통 검사 · 단원 사이 검사, 2026-10-30 09:3x 대조. `talk-same-question` 은 2026-11-05, `talk-scene-opener` 는 2026-11-07 다시 대조). 오류는 막고 경고는 고치거나 까닭을 보고한다.

| 규칙 | 보는 것 | 브리프 |
|---|---|---|
| 규격(Zod) · `talk-card-v1` | 모르는 키, 옛 꼴 칸 | 12절 |
| `talk-shape` · `talk-numbers` | 1~3단계 인사 질문 수 = `greetingTurns`, 항목 번호가 1부터 목록 차례 | 5절 |
| `talk-goals` | 목표 ID 꼴 `talk-3-1-<n>` · unit-specs 단원 목표 안, 항목 목표가 카드 `goals` 안, 카드 목표마다 그 목표를 노리는 필수 질문 | 5절 '목표 잇기' |
| `talk-demands` | 목표 둘 이상을 가리키는 항목의 `demands`, 목표마다 주된 능력이 `demands` 안, home 밖 `purpose` 를 단 항목의 `demands` | 5절 '목표 잇기' |
| `talk-required` | 필수 질문 수 ≤ 참고 턴 × `talk.required_max_ratio`, 다지기 · 보강의 다시 묻는 필수 질문 ≥ k | 5 · 11절 |
| `talk-first-ask` | 배정: 새 단어마다 처음 묻는 필수 질문 하나(둘이면 오류) · 새 단어만 노림 · `hints[1]` 에 그 새 단어. 다지기 · 보강: 처음 묻는 질문 없음 | 5 · 11절 |
| `talk-prep` | 1~3단계 배정: `prep` 이 `talk.prep_words.1-3` 개 · 오늘 쓸 말 안 · 그 낱말의 처음 묻는 필수 질문이 목록 앞쪽 절반 안(앞쪽 절반 검사는 1~3단계 배정 카드에만 건다, 묶음 3 fix 1). 다지기 · 보강: `prep` 없음 | 5절 '짧은 준비' |
| `talk-first-form` · `talk-choices` | 3단계는 `firstForm` · `choices` 를 두지 않는다(1단계 처음 묻는 질문 몫) | 3 · 12절 |
| `talk-targets` | 노리는 단어 1~2개 · 이 단원 단어 · 질문 · 쉬운 질문에 노리는 단어(활용형 포함) 없음 | 5절 |
| `talk-support` | 쉬운 질문이 물음표로 끝나고 그 질문과 정규화한 글이 다름 | 5절 '받침 줄' |
| `talk-hints` | `hints` 가 두 단(영어 틀 · 영어 문장), 인사 질문에 `frameEn`, `usablePhrases` 없음 | 3 · 5절 |
| `talk-same-question` | 마지막 물음표 문장(실행 셈과 같은 열쇠, `cardQuestionKeyOf`)이 같은 선생님 질문(인사 · 필수 · 더 · 쉬운 질문) 2번까지 | 5절 |
| `talk-scene-opener` | 1~3단계 개정 5 부터 칸이 있음, 두 문장 안 · 물음표 문장 마지막 하나 · 첫 낱말 조동사 · be · 'or' 없음, 칸마다 `{NAME}` 하나까지, 범위 밖 낱말 없음(카드 글 범위: 단계 이하 · 새 단어), 인사 · 필수 · 쉬운 · 더 질문과 다름, 뜻 · 답 예시(`Yes` · `No` 로 시작), 쉬운 질문이 물음표로 끝나고 다름, 3단계 `frameEn`, 1단계만 `choices`, 그 카드가 노리는 단어 없음 | 5절 '장면 여는 질문 쓰는 법' |
| `talk-more` | 더 이야기할 거리 `talk.more_talk_turns` 개 이상 · 모두 `re_ask` | 5절 |
| `talk-ko` | 1~4단계 뜻: 필수 질문 · 더 이야기할 거리 · 쉬운 질문(13절 C194 (2)) · 정리 대사 · 안전한 대사 · 끝인사 · 안전 상한 끝인사의 `ko` | 3 · 5절 |
| `talk-today` | `todayWords` 낱말 = `newWords`, `todayTopicsKo` 3~5개 | 5절 |
| `talk-images` · `talk-missions` · `talk-placeholder` · `teacher-name` | 카탈로그 그림 키, 미션 · 역할 바꾸기 없음, 틀 자리는 `{NAME}` 하나, 선생님 이름 없음 | 9 · 3 · 10절 |
| `vocab-allocation` · `unit-words` · `unit-words-unlisted` · `learning-elements` · `forbidden` · `layout` | 배정표와 새 단어(아이 차례 글에 원형, 들려줄 말 · 예문은 세지 않음), 단원 단어 목록, 7낱말 · 형태 범위, 금지어, 수업 번호 | 4 · 5 · 8 · 13절 |
| `topic-variants` · `relation-early-use` · `relation-not-reused` · `remedial-coverage` | 두 변형의 새 단어 · 분량, 뒤 배정 수업 단어 먼저 씀(경고), 다지기에 다시 안 나옴(경고), 보강 덮기 | 5 · 10 · 11절 |
| `talk-known-days` · `talk-unit-incomplete` · `talk-goals-pending` | 단원 덮기(다지기 · 보강 카드의 필수 질문과 모든 카드의 더 이야기할 거리를 셈, 배정 카드의 필수 질문은 세지 않음)는 단원을 다 채웠을 때만 오류, 덜 찼으면 변형마다 경고 하나, 단원 목표가 없으면 경고 | 5 · 11절 |

스스로 확인 명령. 검증기가 보지 않는 것(어휘 범위 · 목표 잇기 · 답 예시 첫머리 · 힌트 꼴 · 쉬운 질문 꼴 · 선생님 삶 문장 · weekend · day · 이름 · `{NAME}` 뒤 조사 · 인물 셈 · 장면 여는 질문의 단원 단어 · 꼴 돌려 쓰기 · 예상 흐름 첫 줄)과, 검증기 `talk-same-question` 과 같은 같은 질문 열쇠 셈(마지막 물음표 문장, 상한은 `<뿌리>/settings.json` 의 `talk.same_question_max`) · 장면 없는 `What do you do?` 를 본다. `<뿌리>` · `<단원>` · `<k>`(설정값 표의 `unit.new_words_per_lesson.1-3`)를 바꿔 돌린다. '스스로 확인 걸림 없음'이 나올 때까지 고친다(고침 회차는 검증 고침과 따로 세지 않는다).

```sh
python3 - <뿌리> <단원> <k> <<'PY'
import json, re, sys

root, unit, K = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
vocab = json.load(open(f"{root}/vocab.json"))["vocab"]
spec = next(u for u in json.load(open(f"{root}/unit-specs.json"))["unitSpecs"]
            if u["area"] == "talk" and u["level"] == 3 and u["unit"] == unit)
lessons = json.load(open(f"{root}/lessons/talk/3/{unit}.json"))["lessons"]
words = spec["words"]
assigned_at = {w: i // K + 1 for i, w in enumerate(words)}
VERBS = {"eat", "drink", "go", "come", "wash", "sleep", "study", "learn", "watch", "listen", "look", "see", "make"}
NOUNS = set(words) - VERBS
GOAL_OF = {"verb": "talk-3-1-1", "noun": "talk-3-1-2"}

def surfaces(entries):
    out = set()
    for v in entries:
        out.add(v["word"].lower())
        out.update(f.lower() for f in v["forms"])
    return out

by_word = {v["word"]: v for v in vocab}
unit_all = surfaces(by_word[w] for w in words)
base = surfaces(v for v in vocab if v["level"] <= 2) | {"we", "they"}
TEACHER_ONLY = {"where"}
SUFFIX = {"'m": "am", "'re": "are", "'s": "is", "'ve": "have", "'ll": "will", "'d": "would", "n't": "not"}
NAMES = ["Momo", "Ben", "Meg", "Dan", "Tess", "Max", "Ted", "Gus"]
TEACHER_EN = ["Tori", "Mina", "Leo", "Ruby", "Sora", "Hana", "Jun", "Nabi", "Luna", "Kiki", "Lulu", "Pang", "Pipi"]
# '준'은 한국어 칸에서 보지 않는다('준비' · '준다'). 영어 Jun 은 TEACHER_EN 이 본다
TEACHER_KO = ["토리", "미나", "리오", "루비", "소라", "하나", "나비", "루나", "키키", "루루", "팡팡", "삐삐"]
SELF_LIFE = re.compile(r"(?<![A-Za-z'])I\s+(?!like\b|am\b|see\b|can\b|know\b)[a-z]+", re.I)
TOKEN = re.compile(r"\{[A-Z_]+\}|_{3,}|\d+|[A-Za-z]+(?:'[A-Za-z]+)*(?:-[A-Za-z]+)*")
SAME_MAX = next(s["value"] for s in json.load(open(f"{root}/settings.json"))["settings"]
                if s["key"] == "talk.same_question_max")
FLOW_FIRST = "After the scene question, the teacher follows the child's answer."
OPENER_STARTS = {"do", "is", "are", "can"}
OPENER_FRAME_MAX = 3
CONTRACT = [(r"\bwon't\b", "will not"), (r"\bcan't\b", "can not"), (r"\bshan't\b", "shall not"),
            (r"\b(\w+)n't\b", r"\1 not"), (r"\bcannot\b", "can not"), (r"\blet's\b", "let us"),
            (r"\b(\w+)'m\b", r"\1 am"), (r"\b(\w+)'re\b", r"\1 are"), (r"\b(\w+)'ve\b", r"\1 have"),
            (r"\b(\w+)'ll\b", r"\1 will"), (r"\b(\w+)'d\b", r"\1 would"),
            (r"\b(he|she|it|you|we|they|this|that|there|here|what|where|who|how)'s\b", r"\1 is")]

def question_key(text):
    # 같은 질문 열쇠: 마지막 물음표 문장을 대소문자 · 따옴표 · 문장 부호 · 띄어쓰기 · 줄임꼴 무시로 줄인 글(앱 · 검증기와 같은 셈)
    qs = [q.strip() for q in re.findall(r"[^.!?\n]*\?+[\"')\]}”’»]*", text) if q.strip()]
    s = (qs[-1] if qs else text).lower().replace("’", "'").replace("‘", "'").replace("`", "'")
    for pat, rep in CONTRACT:
        s = re.sub(pat, rep, s)
    return re.sub(r"[^a-z0-9]+", " ", s.replace("'", "")).strip()

def offband(text, allowed):
    text = text.replace("’", "'")
    # 두 낱말 표제어(ice cream)는 토큰으로 가르기 전에 통째로 맞춘다
    for phrase in sorted((a for a in allowed if " " in a), key=len, reverse=True):
        text = re.sub(rf"(?<![A-Za-z]){re.escape(phrase)}(?![A-Za-z])", " ", text, flags=re.I)
    bad = []
    for tok in TOKEN.findall(text):
        if tok.startswith("{") or tok.startswith("_"):
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
    if lesson["kind"] == "assigned":
        open_words = [w for w in words if assigned_at[w] <= lesson["lessonNo"]]
    else:
        open_words = list(words)
    unit_surface = surfaces(by_word[w] for w in open_words)
    child_allowed = base | unit_surface
    teacher_allowed = child_allowed | TEACHER_ONLY
    child, teacher, korean = [], [], []
    for i, g in enumerate(card["greeting"].get("questions", [])):
        teacher.append((f"greeting.{i}.question.en", g["question"]["en"]))
        korean += [(f"greeting.{i}.question.ko", g["question"]["ko"]), (f"greeting.{i}.hintKo", g["hintKo"])]
        child += [(f"greeting.{i}.{k}", g[k]) for k in ("hintEn", "frameEn", "answerExample") if k in g]
    so = card.get("sceneOpener")
    if so is None:
        say(lesson, "sceneOpener", "장면 여는 질문이 없다(5절 '장면 여는 질문 쓰는 법', C206)")
    else:
        teacher += [("sceneOpener.question.en", so["question"]["en"]), ("sceneOpener.easyQuestion.en", so["easyQuestion"]["en"])]
        korean += [("sceneOpener.question.ko", so["question"].get("ko", "")), ("sceneOpener.hintKo", so["hintKo"]),
                   ("sceneOpener.easyQuestion.ko", so["easyQuestion"].get("ko", ""))]
        child += [(f"sceneOpener.{k}", so[k]) for k in ("hintEn", "frameEn", "answerExample") if k in so]
        sents = [x.strip() for x in re.findall(r"[^.!?]+[.!?]+", so["question"]["en"]) if x.strip()]
        asked = [x for x in sents if x.endswith("?")]
        if len(sents) > 2 or len(asked) != 1 or not sents[-1].endswith("?"):
            say(lesson, "sceneOpener.question.en", f"장면 말 한 문장 + 예 · 아니요 질문 하나(물음표 문장은 마지막 하나)가 아니다: {so['question']['en']}")
        last = sents[-1] if sents else ""
        first = (re.findall(r"[A-Za-z']+", last) or [""])[0].lower()
        if first not in OPENER_STARTS:
            say(lesson, "sceneOpener.question.en", f"질문의 첫 낱말 {first} 가 Do · Is · Are · Can 이 아니다: {last}")
        if re.search(r"(?i)\bor\b", last):
            say(lesson, "sceneOpener.question.en", f"질문에 'or' 가 있다(고르기 질문이 아니다): {last}")
        if question_key(last).startswith("do you like"):
            say(lesson, "sceneOpener.question.en", f"'Do you like' 꼴은 쓰지 않는다(5절 '꼴 돌려 쓰기'): {last}")
        if not re.match(r"^(Yes|No)\b", so["answerExample"]):
            say(lesson, "sceneOpener.answerExample", f"답 예시가 Yes · No 로 시작하지 않는다: {so['answerExample']}")
        if "___" not in so.get("frameEn", ""):
            say(lesson, "sceneOpener.frameEn", "3단계 영어 틀이 없거나 빈칸 ___ 이 없다")
        if so.get("hintEn") != so["answerExample"]:
            say(lesson, "sceneOpener.hintEn", "영어 문장 힌트와 답 예시가 다르다(제안: 같게)")
        if not re.match(r"^(Do|Are|Is|Can|Have)\b", so["easyQuestion"]["en"]):
            say(lesson, "sceneOpener.easyQuestion.en", f"쉬운 질문이 예 · 아니요 꼴이 아니다: {so['easyQuestion']['en']}")
        for k in ("question.en", "hintEn", "frameEn", "answerExample", "easyQuestion.en"):
            text = so[k.split(".")[0]]["en"] if "." in k else so.get(k, "")
            hit = sorted({t.lower() for t in re.findall(r"[A-Za-z]+", text)} & unit_all)
            if hit:
                say(lesson, f"sceneOpener.{k}", f"장면 여는 질문에 이 단원 단어 {hit} 가 있다(5절 '낱말'): {text}")
        lesson["_frame"] = " ".join(question_key(last).split()[:3])
        lesson["_opener"] = question_key(last)
    if not card["flow"] or card["flow"][0] != FLOW_FIRST:
        say(lesson, "flow.0", f"예상 흐름 첫 줄이 '{FLOW_FIRST}' 가 아니다(5절)")
    goals_seen = set()
    for group in ("required", "more"):
        for i, it in enumerate(card[group]):
            at = f"{group}.{i}"
            teacher += [(f"{at}.en", it["en"]), (f"{at}.easyQuestion.en", it["easyQuestion"]["en"])]
            korean += [(f"{at}.ko", it.get("ko", "")), (f"{at}.easyQuestion.ko", it["easyQuestion"].get("ko", "")), (f"{at}.hintKo", it["hintKo"])]
            child += [(f"{at}.hints.{j}", h) for j, h in enumerate(it["hints"])] + [(f"{at}.answerExample", it["answerExample"])]
            kinds = {"verb" if t in VERBS else "noun" for t in it["targets"]}
            if len(kinds) != 1:
                say(lesson, f"{at}.targets", f"동사와 장소 · 자연 · 날씨 낱말을 한 항목에 섞었다: {it['targets']}")
            else:
                want = [GOAL_OF[kinds.pop()]]
                if it["goals"] != want:
                    say(lesson, f"{at}.goals", f"노리는 낱말 {it['targets']} 의 목표는 {want} 다(지금 {it['goals']})")
            goals_seen.update(it["goals"])
            if "talk-3-1-1" in it["goals"]:
                t = it["targets"][0]
                if not re.match(rf"^(I|We|They)\s+{t}\b", it["answerExample"]):
                    say(lesson, f"{at}.answerExample", f"talk-3-1-1 항목의 답 예시가 'I · We · They + {t}' 로 시작하지 않는다: {it['answerExample']}")
            if len(it["hints"]) == 2:
                if "___" not in it["hints"][0]:
                    say(lesson, f"{at}.hints.0", f"영어 틀에 빈칸 ___ 이 없다: {it['hints'][0]}")
                if it["hints"][1] != it["answerExample"]:
                    say(lesson, f"{at}.hints.1", "영어 문장 힌트와 답 예시가 다르다(제안: 같게)")
            if not re.match(r"^(Do|Are|Is|Can|Have)\b", it["easyQuestion"]["en"]):
                say(lesson, f"{at}.easyQuestion.en", f"쉬운 질문이 예 · 아니요 꼴(Do · Are · Is · Can · Have ~?)이 아니다: {it['easyQuestion']['en']}")
    if sorted(goals_seen) != sorted(card["goals"]):
        say(lesson, "goals", f"카드 goals {card['goals']} 가 항목 목표의 합 {sorted(goals_seen)} 과 다르다")
    for i, w in enumerate(card["todayWords"]):
        child += [(f"todayWords.{i}.example", w["example"]), (f"todayWords.{i}.modelLine", w["modelLine"])]
        korean.append((f"todayWords.{i}.meaningKo", w["meaningKo"]))
    for i, l in enumerate(card["closingLines"]):
        child.append((f"closingLines.{i}", l["en"]))
        korean.append((f"closingLines.{i}.ko", l.get("ko", "")))
    child += [(f"targetExpressions.{i}", e) for i, e in enumerate(card["targetExpressions"])]
    for i, l in enumerate(card["safeLines"]):
        teacher.append((f"safeLines.{i}", l["en"]))
        korean.append((f"safeLines.{i}.ko", l.get("ko", "")))
    for key in ("farewell", "safetyFarewell"):
        teacher.append((key, card[key]["en"]))
        korean.append((f"{key}.ko", card[key].get("ko", "")))
    teacher += [(f"praiseLines.{i}", p) for i, p in enumerate(card["praiseLines"])]
    korean += [("title", lesson["title"]), ("topic", card["topic"]), ("endCondition", card["endCondition"])]
    korean += [(f"todayTopicsKo.{i}", t) for i, t in enumerate(card["todayTopicsKo"])]

    asks = [(f"greeting.{i}.question.en", g["question"]["en"]) for i, g in enumerate(card["greeting"].get("questions", []))]
    asks += [(f"{group}.{i}.{part}", q) for group in ("required", "more") for i, it in enumerate(card[group])
             for part, q in (("en", it["en"]), ("easyQuestion.en", it["easyQuestion"]["en"]))]
    if so is not None:
        opener_key = question_key(so["question"]["en"])
        clash = [path for path, q in asks if question_key(q) in (opener_key, question_key(so["easyQuestion"]["en"]))]
        if clash:
            say(lesson, "sceneOpener", f"장면 여는 질문 · 그 쉬운 질문의 열쇠가 카드의 다른 질문과 같다: {clash}")
        asks += [("sceneOpener.question.en", so["question"]["en"]), ("sceneOpener.easyQuestion.en", so["easyQuestion"]["en"])]
    by_key = {}
    for path, q in asks:
        by_key.setdefault(question_key(q), []).append(path)
    for key, paths in by_key.items():
        if len(paths) > SAME_MAX:
            say(lesson, paths[0], f"마지막 물음표 문장 '{key}' 이 {len(paths)}번 나온다({SAME_MAX}번까지, 5절 '같은 질문'): {paths}")
        if key == "what do you do":
            say(lesson, paths[0], f"장면 없는 'What do you do?' 로 끝난다. 장면을 질문 문장 안에 둔다(5절 '같은 질문'): {paths}")
    lesson["_same"] = max((len(p) for p in by_key.values()), default=0)
    for path, text in child:
        bad = offband(text, child_allowed)
        if bad:
            say(lesson, path, f"아이 차례 영어에 범위 밖 낱말 {bad}: {text}")
        hit = [n for n in NAMES if re.search(rf"(?<![A-Za-z]){n}(?![A-Za-z])", text)]
        if hit:
            say(lesson, path, f"아이 차례 영어에 인물 이름 {hit}: {text}")
    for path, text in teacher:
        bad = offband(text, teacher_allowed)
        if bad:
            say(lesson, path, f"선생님 쪽 영어에 범위 밖 낱말 {bad}: {text}")
        if SELF_LIFE.search(text):
            say(lesson, path, f"선생님이 자기가 하는 일을 말한다(사람의 삶을 지어내지 않는다): {text}")
    every = [t for _, t in teacher] + [t for _, t in child] + [t for _, t in korean] + card["flow"]
    for text in every:
        for n in TEACHER_EN:
            if re.search(rf"(?<![A-Za-z]){n}(?![A-Za-z])", text, re.I):
                say(lesson, "글", f"선생님 이름(뒤 명단 포함) {n}: {text}")
        if re.search(r"(?i)\bweekends?\b|\bdays?\b|\bsaturday\b|\bsunday\b", text):
            say(lesson, "글", f"weekend · day · 요일은 영어 글에 쓰지 않는다(4단계 · 범위 밖, 판단 2): {text}")
    for path, text in korean:
        for n in TEACHER_KO:
            for m in re.finditer(n, text):
                before = text[m.start() - 1] if m.start() > 0 else ""
                if not re.match(r"[가-힣]", before):
                    say(lesson, path, f"한국어 칸에 선생님 이름과 같은 글자 '{n}': {text}")
                    break
        if re.search(r"\{NAME\}[가-힣]", text):
            say(lesson, path, f"{{NAME}} 바로 뒤에 조사를 붙였다: {text}")
    lesson["_names"] = {n for n in NAMES for _, t in teacher + child
                        if re.search(rf"(?<![A-Za-z]){n}(?![A-Za-z])", t)}

rank = {"assigned": 0, "reinforce": 0, "remedial": 1}
for v in sorted({l["variant"] for l in lessons}):
    row = sorted((l for l in lessons if l["variant"] == v and "_frame" in l), key=lambda l: (rank[l["kind"]], l["lessonNo"]))
    frames = {}
    for l in row:
        frames.setdefault(l["_frame"], []).append(f"{l['kind']} {l['lessonNo']}")
    for f, who in frames.items():
        if len(who) > OPENER_FRAME_MAX:
            problems.append(f"변형 {v}: 장면 여는 질문 꼴 '{f}' 이 {len(who)}장이다({OPENER_FRAME_MAX}장까지, 5절 '꼴 돌려 쓰기'): {who}")
    for a, b in zip(row, row[1:]):
        if a["_frame"] == b["_frame"]:
            problems.append(f"변형 {v}: {a['kind']} {a['lessonNo']} 과 {b['kind']} {b['lessonNo']} 의 장면 여는 질문 꼴 '{a['_frame']}' 이 이어진다")
    print(f"장면 여는 질문 꼴(첫 세 낱말) 변형 {v}: " + " · ".join(f"{f} {len(w)}" for f, w in frames.items()))
opener_keys = {}
for l in lessons:
    if "_opener" in l:
        opener_keys.setdefault(l["_opener"], []).append(f"{l['kind']} {l['lessonNo']} v{l['variant']}")
for k, who in opener_keys.items():
    if len(who) > 1:
        problems.append(f"단원: 장면 여는 질문 '{k}' 이 {len(who)}장에 있다(모두 다르게): {who}")
N = len(lessons)
n = sum(1 for l in lessons if l["_names"])
m = sum(1 for l in lessons if "Momo" in l["_names"])
print(f"인물: 이름이 나온 카드 n={n} (상한 {N // 4}) · Momo 카드 m={m} (상한 {max(N // 8, n // 2)})")
print("같은 질문(마지막 물음표 문장 열쇠) 카드마다 가장 많은 수: "
      + " · ".join(f"{l['kind']} {l['lessonNo']} v{l['variant']} {l['_same']}" for l in lessons))
print("\n".join(problems) if problems else "스스로 확인 걸림 없음")
PY
```

검증 명령(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas talk --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="lessons/talk/3/<단원>.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("id",""), x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(이 파일의 칸 수 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수 · 단원 단위 오류 `talk-known-days` · `remedial-coverage` 수)를 그대로 적어 둔다. 보고의 '첫 검증'이다.
- 오류가 있으면 그 칸만 고치고 다시 검증한다. 고친 칸의 `generation.retries` 에 회차를 적는다. 고침은 `seed.max_retries` 회까지다. 그래도 남으면 멈추고 남은 오류를 보고한다. 고정 카드에 오류가 나면 고치지 말고 보고한다.
- 경고(`unit-words-unlisted` · `relation-early-use` · `relation-not-reused` · 분포)도 고친다. 남기면 까닭을 보고한다. `talk-unit-incomplete` 는 단원을 다 채우지 않은 호출에서 나오는 것이 맞다. 단원 규격 파일의 `unit-goals` 경고(다른 단원 · 단계의 목표 없음)는 이 파일 밖이라 걸러져 나오지 않는다.
- `unchecked`(풀이 검사 안 됨)와 `empty`(빈 칸)는 이 단계의 일이 아니다. 회화 카드는 풀이 검사 대상이 아니다.

## 15. 근거 한 줄

회화 3단계는 짧은 준비로 낱말 몇을 소리 내 본 뒤, 선생님이 아이 자신과 가족의 일을 묻고 아이가 '누가 + 하는 일' 한 문장으로 답하며, 막히면 영어 틀로 받치는 단계다. 2022 개정 영어과 3~4학년군 표현 성취기준 [4영02-08](주요 정보를 묻거나 답하기) · [4영02-05](소개 · 묘사를 쉽고 간단한 문장으로 말하거나 보고 쓰기)와 이해 성취기준 [4영01-05](쉽고 간단한 단어 · 어구 · 문장의 의미 이해)에 기댄다(가르치고 배우는 수업 spec 설계 2 의 인용 범위, 확인 정도: 2차 자료 둘의 일치). CEFR-J 참고로는 말하기 발표 Pre-A1(자기 정보를 간단한 낱말 · 어구로 전함)과 말하기 상호작용 A1.1(장소 등을 익숙한 표현으로 묻고 답함)의 답하기 쪽 사이이고, 판정에 쓰지 않으며 확정 전이다(정본 3.1). 그래서 질문은 장면을 준 짧은 꼴을 돌려 쓰고, 답은 단원 동사 · 장소 낱말이 든 7낱말 이하의 한 문장이며, 낱말 답도 뜻이 통하면 받는다.

## 16. 보고 꼴

마지막 답장(파일로 쓰지 않는다)에 이 차례로 쓴다.

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값>
파일: <뿌리>/lessons/talk/3/<단원>.json · 카드 <n>(새로 <n> · 고정 <n> · 정규 <n> · 보강 <n>) · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
고정 카드: 붙이기 명령 결과(해시 같음 · 다름 · 해당 없음)
첫 검증: 칸 <n> · 오류 칸 <n> · 규칙별 <rule n, …> · 단원 단위 오류 <n> · 경고 <n>
고침: <회차마다 고친 칸 · 남은 오류>
스스로 확인 명령: 첫 결과 <걸림 n> · 마지막 '걸림 없음'
카드마다: 필수 질문 <n>(처음 <n> · 다시 <n>) · 더 이야기할 거리 <n> · 짧은 준비 <낱말> · 카드 goals <…>
목표 기회(카드가 준비한 자리, 변형마다): talk-3-1-1 <n> · talk-3-1-2 <n>
단원 덮기(전부일 때): talk.known_days 에 닿은 단원 단어 <n>/25
보강 덮기(전부일 때): 변형마다 1번 이상 <n> · 2번 이상 <n>
같은 질문: 카드마다 가장 많이 나온 마지막 물음표 문장 열쇠 <n>번(상한 2) · 장면 없는 What do you do? <n>
장면 여는 질문: 카드마다 있음 <n>/<n> · 꼴(첫 세 낱말) 변형마다 가장 많은 수 <n>(3 까지) · 바로 앞 카드와 같은 꼴 <n> · 단원 안 같은 질문 <n> · Do you like 꼴 <n> · 필수 질문과 주제 겹침(눈으로 확인) <n>
인물: 이름이 나온 카드 <n> · 그 가운데 Momo 카드 <n> · 쓴 이름 <…>
선생님: 선생님 이름 · 토리 · {TEACHER} 0 · 선생님 삶 문장 0
스스로 확인: 14절 1~14 각각 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 0 · 1 | 첫 호출은 두 장(배정 1 · 다지기 6, 변형 1)만, 둘째 호출은 브리프가 그대로일 때 나머지 24장 + 고정 카드 붙이기 | 요청자가 범위를 두 장으로 좁혔다(컨트롤러 08:3x). 회화 plan 정한 것 16 의 '세 장 먼저'를 두 장으로 옮겼다. 고정 카드는 브리프 안에 넣지 않고 파일 · 해시로 받는다. 넣으면 브리프 해시가 바뀌어 판이 바뀐다 |
| 2 · 10 | 카드 차례 · 계획표 먼저 · 인사 턴 수 1 | 정본 · 검증기에 차례 규칙이 없다. 두 변형의 분량이 같아야 하고(`topic-variants`), 대화 자리를 단원 단어에 쓴다 |
| 5 | 질문은 홀로 뜻이 통하게, 질문 글 두 문장까지 | 새 흐름에서 앱이 아무 때나 카드 질문을 카드 자리로 붙이고, 선생님 차례는 talk.teacher_sentences_max.1-3 문장 안이다 |
| 5 · 8 · 14 | 한 카드 안의 마지막 물음표 문장을 모두 다르게, 장면 없는 `What do you do?` 로 끝내지 않음, 8절 질문 꼴 스물다섯의 열쇠를 모두 다르게, 스스로 확인이 열쇠를 셈 | 앱과 검증기가 같은 질문을 마지막 물음표 문장으로 센다(02-2 200줄, `question-check.ts` · `check-talk.ts`). C194 (1) 닫기 뒤에는 더 이야기할 거리가 막힌 질문 바로 뒤에 붙으므로, 꼬리가 같으면 질문을 바꾼 것으로 들리지 않고 차례대로 묻는 대본이 된다(설계 검토 I-1) |
| 5 | 한 항목은 한 낱말(둘이면 같은 갈래), 목표 여럿 항목을 두지 않음 | 0절 판단 1 의 목표 잇기를 항목마다 하나로 만든다. 요구 능력(demands) 판단이 생기지 않는다 |
| 5 | 쉬운 질문은 예 · 아니요 꼴 | 고르는 질문은 노리는 단어가 들어가 A4-03 에 걸린다. 막힌 아이에게 예 · 아니요가 가장 쉽다 |
| 5 | 들려줄 말: 동사 `I + 낱말.`, 명사 `The + 낱말.`, 셀 수 없는 말은 낱말만 | 정본은 1~3단계 '짧은 말(An apple.)'만 정했다. 동사를 낱말 하나로 들려주면 명령문처럼 들리고, 'I' 를 붙이면 이 단원 답의 첫머리를 입에 붙인다 |
| 5 | 영어 문장 힌트 = 답 예시 · 목표 표현 3~5 · 정리 대사 3~5 · 예상 흐름 3~5 · 안전한 대사 2~3 · 칭찬 3~4 · 끝맺음 조건 문장 | 규격은 '1개 이상'만 정했다(talk-1 과 같은 값) |
| 5 · 12 | `purpose` 를 두지 않음 | 두 목표의 home 이 '선생님과 이야기'라 비우면 같다. home 밖 purpose 는 demands 가 있어야 하고 응용 기회가 된다. 응용 기회를 만들지는 단원을 다 만들 때 요청자 · 컨트롤러가 정한다(목표 장부 2.4) |
| 7 | 어휘 범위를 1~2단계 + we · they + 그 카드에서 열린 단원 단어로 좁힘(선생님 질문은 where 더함) | 3단계 다른 단원 단어(park · zoo · school …)와 아직 배정되지 않은 이 단원 낱말이 미리 나오지 않게 한다(읽기 3단계와 같은 기준). 실시간 AI 질문 검사는 3단계 vocab 전체를 받지만 카드는 더 좁게 둔다 |
| 7 | there · these · those · who 를 쓰지 않음 | 3단계 단원 2 · 5 요소와 겹친다(there 는 There is). where 만 C64 (3)으로 선생님 물음에 쓴다 |
| 8 | 질문 꼴 표와 낱말마다의 질문 · 답 예 | 6.3 순서 (2)(B5-M-05)의 '노리는 단어를 질문에 넣지 않고 물을 수 있는지'를 3단계 단원 1 의 25낱말에 먼저 보였다 |
| 8 | 비 · 눈은 명사로만, 가족은 we · they 로 | 3인칭 -s 가 4단계 요소라 `It rains.` · `My dad goes ~` 가 걸린다 |
| 9 | 동사 다섯의 그림은 오늘 쓸 말에만, 처음 묻는 질문에는 두지 않음 | 그림이 동작을 그대로 보여 주면 질문이 답을 알려 준다 |
| 10 | 뒤 명단 이름은 영어 칸에서 피하고, 한국어는 '준'을 보지 않음 | '준비' · '준다' 같은 흔한 말을 막지 않는다. 검증기는 명단에 든 이름만 보고 이름으로 시작하는 보통 낱말을 명단 칸의 예외로 뺀다(`check-teacher.ts`, C141) |
| 10 | 가족은 함께 하는 일만, 특정 가족을 정해 묻지 않음 · 선생님 자기 이야기는 좋아하는 것만 한 카드 한 번 | 6.2 개인 정보 규칙과 '사람의 삶을 지어내지 않는다'를 주말 주제에 맞춰 넓혔다. 아이마다 가족 꼴이 다르다 |
| 10 | 다른 영역 3단계 단원 1 장면(친구가 놀러 옴)을 쓰지 않음 | 같은 날 같은 단원을 하는 아이에게 같은 이야기가 겹친다(브리프 task-talk-4a) |
| 11 | 다지기 6~10 · 보강 1~3 이 다룰 낱말 묶음, 배정 2~5 의 다시 묻기 필수 질문 하나 | 정본은 '몰아서 다룰 단원 어휘 묶음'의 나누는 법을 정하지 않았다. 다지기 6 은 0절 판단 4 |
| 13 | 가족 캐묻기 · 무서운 자연 장면 금지 | 주말 나들이 주제에 물 · 산 · 불 장면이 들어오기 쉽다 |
| 5 · 14 | 장면 여는 질문에 이 단원 단어 25개를 모두 쓰지 않음 | 검증기는 그 카드가 노리는 단어만 막지만, 배정 차례 · 단원 단어 목록 경고에 걸리기 쉽다. 장면 여는 질문은 학습 기회가 아니라 장면을 여는 자리다 |
| 5 · 14 | 장면 여는 질문 꼴 돌려 쓰기(첫 세 낱말이 같은 꼴은 변형마다 세 장까지 · 바로 앞 카드와 다르게 · 단원 안 질문 모두 다르게 · `Do you like` 꼴 안 씀) | 대본 느낌은 한 단원에서 같은 첫 질문 꼴이 되풀이될 때 커진다(요청자 결정 2026-11-06 '고정 대본 느낌 금지'). 고정 카드 두 장의 쉬운 질문 21개 가운데 13개가 `Do you like` 꼴이다(장면 여는 질문 보고 9절 3) |
| 5 | 장면 여는 질문의 `hintEn` = 답 예시, 좋은 질문 기준 (가)~(마) | 인사 질문 칸과 같은 꼴이다. 기준은 요청자가 번호로 고른 표본 쪽의 추천 기준이다 |
| 14 | 스스로 확인 명령(python 한 덩이) · 고정 카드 붙이기 명령 | 검증기가 회화 카드의 어휘 범위 · 목표 잇기 · 선생님 삶 문장을 보지 않는다. 고정 카드는 정규화 해시(키 정렬 · 빈칸 없는 JSON 의 sha256)로 대조한다(회화 plan 정한 것 16 · 읽기 3단계 승인 수업과 같은 꼴) |
