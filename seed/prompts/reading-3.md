# 생성 브리프 — 읽기 3단계(`reading-3`)

이 파일은 읽기 3단계 묶음의 프롬프트 판이다(정본 6.3). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 단원 하나의 수업 전부를 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 3단계는 가르치는 수업이다(수업마다 `teach` 칸, 13절 C169 · 델타 spec 설계 1~8). 틀 `_template.md` 의 '가르치는 수업 규칙'(R5~R16)을 이 단계 · 영역에 맞춰 옮겼다. 숫자와 규칙은 저장소 파일에서 옮겼고, 새 설정 키(`lesson.*` · `speech.*` · `seed.goals_required_levels`)는 이름으로만 적는다. 그 지금 값은 호출이 1절 '설정값 표'로 넘긴다. 정본에 없는 값은 '(제안)'으로 적고 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 그 영역 × 단계는 처음부터 다시 만든다(승인 수업은 그대로 둔다).

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 영역 · 단계 | `reading` · 3 · CEFR Pre-A1 · 구간 `1-3` |
| 틀 | `seed/prompts/_template.md`(가르치는 수업 규칙 R5~R16) |
| 만든 날 · 만든 이 | 2026-10-30 · 학습 설계자(가르치고 배우는 수업 plan 묶음 자-1) |
| 옮긴 곳 | `seed/level-specs.json` · `unit-specs.json`(3단계 단원 1 goals) · `settings.json`(키 이름) · `vocab.json` · `images.json` · `lists/forms.json` · `lists/forbidden.json` · `lists/meta-sentences.json` · `lists/grammar-terms.json` · `src/core/seed/schema/lesson.ts` · `check-lesson.ts` · `check-teach.ts` · `src/core/vocab/allocate.ts` · 델타 spec 설계 1~8 · 표본 3판(`.superpowers/sdd/2026-10-29-가르치고-배우는-수업/samples-l3u1.md`, v4 · v5 정정) · 정규 시드 `seed/lessons/reading/3/1.json` 의 승인 수업 · 13절 C64 · C84 · C169 · C170 · C174 · C175 · C177 · C182 · 장부 L-7 · L-8 · L-10 · L-22 |
| 이 판으로 만드는 것 | 단원 1 의 25수업. 승인 수업(배정 1 · 변형 1)은 글자 그대로 둔다. 단원 2~5 는 단원 규격에 목표(goals[])가 생긴 뒤 만든다(지금은 목표가 없어 검증기 goal 오류가 난다). 단원 5 는 질문 꼴(What · Where · Who)이 정해지지 않아 이 판으로 만들지 않는다 |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 단원 번호 | `1`(지금 만들 수 있는 단원은 1뿐, 0절) | 파일 이름, 6절에서 그 단원 찾기 |
| 뿌리 폴더 | `seed` 또는 비교용 폴더 | 쓸 파일 `<뿌리>/lessons/reading/3/<단원>.json` |
| briefHash · agentHash | 소문자 16진 64자 | 새로 만든 수업의 `generation`(승인 수업은 제 값 그대로) |
| effort | `high` · `xhigh` | `generation.effort` |
| createdOn | 날짜 | `generation.createdOn` |
| revision · correction | `1` · `0` | 새로 만든 수업 |
| 승인 수업 해시 | 소문자 16진 64자 | 14절 붙이기 명령의 대조 값 |
| 설정값 표 | 아래 키의 지금 값 | 4 · 5 · 8 · 11 · 14절 |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

설정값 표의 키(호출하는 이가 `seed/settings.json` 에서 옮겨 넘긴다. 이 브리프에는 값을 적지 않는다):

- `lesson.models_per_lesson`
- `lesson.together_items.1-3`
- `lesson.teacher_line_max_chars`
- `lesson.line_max_sentences`
- `lesson.teach_seconds_max.1-3`
- `lesson.slot_seconds_max.today · show · together · spare · recap`
- `lesson.spare_text_max_words.1-3`
- `lesson.spares_per_session.reading`
- `lesson.recap_min_evidence`
- `lesson.recap_can_ratio`
- `speech.speak_chars_per_second`
- `speech.speak_chars_per_second_ko`
- `seed.goals_required_levels`

```sh
python3 -c 'import json; s={x["key"]:x["value"] for x in json.load(open("seed/settings.json"))["settings"]}; [print(k, json.dumps(s[k])) for k in sorted(s) if k.startswith(("lesson.","speech.speak_chars","speaking.answer_match")) or k=="seed.goals_required_levels"]'
```

**승인 수업 고정.** 단원 1 의 배정 1 · 변형 1 은 요청자가 승인한 수업이다(C174 · C175 · C177, 정규 시드). 12절 끝 '승인 수업' JSON 을 한 글자도 바꾸지 않고 파일의 첫 수업으로 둔다. `generation` 칸도 그 수업의 값 그대로다. 새로 만드는 것은 나머지 25수업이고, 그 수업들은 승인 수업과 제목 · 장면 · 문장이 겹치지 않는다. 14절 붙이기 명령이 이 JSON 을 첫 자리에 넣고 정규화 해시(키 차례를 정렬하고 빈칸 없이 적은 JSON 의 sha256)를 호출 값과 대조한다. 승인 수업의 미리보기 `example` 은 채워져 있지만 새 수업은 빈 글로 만든다. 보여 주기 화면이 미리보기 예문을 보이지 않으므로(C170 (3), 화면 라-2) 한 단원 안에서 섞여도 아이 화면은 같다.

`generation.model` 에는 자기 모델 ID(예: `claude-opus-5-5`)를 적는다. 파일은 하나만 쓴다.

## 2. 할 일 한눈에

1. 6절에서 단원 1 의 단원 단어 · 배정표 · 목표를 찾고, 12절 끝 '승인 수업'을 끝까지 읽는다. 새 수업은 승인 수업과 겹치지 않게 만든다.
2. 변형 1 의 정규 2~10 과 보강 1~3, 변형 2 의 정규 1~10 과 보강 1~3, 모두 25수업을 만든다. 차례는 (제안) 변형 1 정규 → 보강, 변형 2 정규 → 보강이다.
3. 파일 하나 `{ "area": "reading", "level": 3, "unit": <단원>, "lessons": [ … ] }` 에 새 수업 25개를 넣는다. 승인 수업 자리는 비워 두어도 된다. 14절 붙이기 명령이 첫 자리에 넣는다.
4. 14절 붙이기 명령 → 스스로 확인 → 검증 명령 → 오류 칸 고침 → 16절 보고.

## 3. 단계 규격(`level-specs` reading 3)

| 칸 | 값 |
|---|---|
| can-do | 35~55단어의 일상 이야기를 읽고 누가 · 무엇 · 어디를 묻는 질문 3개에 답할 수 있다 |
| CEFR · 목표 시간 | Pre-A1 · 5분 |
| 문장 길이 상한 `sentenceMaxWords` | 7낱말. 지문 · 문항 · 보기 · 본보기 · 같이 해 보기 · 짝 · 되짚기 · 미리보기의 영어 문장마다 |
| 지문 `passage` | 35~55낱말 |
| 글 종류 `textTypes` | 일상 이야기 |
| 문제 `questions` | 3문제, 모두 `fact`(사실 확인) |

정본 3.3 읽기 단계표 3단계 행: 지문 35~55단어 · 글 '일상 이야기' · 문제 '사실 확인(누가 · 무엇 · 어디) 3문제' · 목표 5분. 3단계 문제 화면에는 지문을 늘 함께 보인다(C170 (7), 앱 몫). 앱은 읽어 주기 · 낱말 뜻 보기 사용을 기록하고, 그 뒤 결과를 도움 없는 독립 읽기로 단정하지 않는다(C175 (1) · C177 (2), 시드 칸 없음).

## 4. 단원 틀(`settings` 구간 1-3)

| 설정 키 | 값 | 뜻 |
|---|---|---|
| `unit.vocab_count.1-3` | 25 | 단원 단어 수 |
| `unit.new_words_per_lesson.1-3` | 5 | 배정 수업마다 새 단어 k |
| `unit.regular_lessons.1-3` | 10 | 정규 수업 = 배정 5 + 다지기 5 |
| `seed.remedial_per_unit.1-3` | 3 | 보강 수업 수 |
| `seed.topic_variants.1-3` | 2 | 주제 변형 수 |
| `seed.remedial_coverage.1-3` | 1 | 변형마다 보강 수업들을 합쳐 단원 단어마다 나와야 하는 횟수 |
| `seed.max_offband_ratio` | 0.05 | 읽기 지문 · 같이 해 보기 글 · 짝 글의 어휘 범위 밖 낱말 비율 상한 |
| `seed.max_retries` | 2 | 검증 뒤 고침 회차 상한 |

수업 번호(검증기 `layout`): `assigned` 1~5 · `reinforce` 6~10 · `remedial` 1~3 · `variant` 1~2. 이 수는 설정값이라 아이가 보는 글에 적지 않는다.

가르치는 수업 키(값은 1절 설정값 표):

| 설정 키 | 뜻 |
|---|---|
| `lesson.models_per_lesson` | 본보기 수의 하한 · 상한(검증기 `teach-layout`) |
| `lesson.together_items.1-3` | 같이 해 보기 문항 수(`teach-layout`) |
| `lesson.teacher_line_max_chars` · `lesson.line_max_sentences` | 선생님 한국어 줄 하나의 글자 수(빈칸 뺌) · 문장 수 상한(`teacher-line`) |
| `lesson.teach_seconds_max.1-3` | 오늘 배울 것 · 본보기 · 되짚기 글의 추정 시간 합 상한(`teach-seconds`, 8절 셈) |
| `lesson.slot_seconds_max.<자리>` | 자리별 추정 시간 상한(넘으면 경고 `slot-seconds`) |
| `lesson.spare_text_max_words.1-3` | 읽기 짝 글(`textEn`)의 낱말 수 상한 |
| `lesson.spares_per_session.reading` | 세션에 내는 짝 수의 상한(앱이 자른다. 시드에는 채점 혼자 문항마다 짝 하나를 모두 둔다) |
| `lesson.recap_min_evidence` · `lesson.recap_can_ratio` | 되짚기 마무리 줄 고르기(8절). teach.goals 첫 목표에 이어진 혼자 문항이 하한보다 적으면 경고 `recap-evidence` |
| `speech.speak_chars_per_second` · `speech.speak_chars_per_second_ko` | 시간 합 셈의 영문 · 한글 빠르기(글자/초) |
| `seed.goals_required_levels` | 목표가 반드시 있어야 하는 단계. 3단계가 들어 있어 teach.goals · 문항 goal 이 비면 오류다 |

## 5. 수업 구성(여섯 자리, 델타 spec 설계 1 · 2 · 표본 1.3)

세션 차례: 오늘 배울 것 → 보여 주기(새 단어 다섯 한 화면 → 본보기) → 같이 해 보기 → 혼자 해 보기(지문 → 사실 확인 문제, 틀리면 '왜' → 같은 문제 다시) → 다른 예시에서 스스로(첫 시도에 틀린 문제의 짝을 혼자 해 보기 뒤 모아서) → 되짚기(결과 첫머리). 채점은 늘 앱이 정답 번호와 견준다(AI 없음).

**읽기 방법과 까닭(설계 2, 승인됨).** 가르치는 것: 글에서 하는 일 말(그 수업의 동작 낱말)을 먼저 찾고, 그 앞에서 '누가'를, 뒤에서 '무엇' · '어디'를 읽어 낸다. 같은 하는 일 말이 두 번 나오면 앞의 '누가'로 가른다. 까닭: 읽기는 쓰인 글에서 답을 찾는 일이라 어디를 보면 답이 있는지를 가르친다. 문제도 빈칸 문장의 낱말을 글에서 찾아 짝 짓는 꼴이라 가르친 차례가 그대로 쓰인다. 단원 2~5 의 방법(There is · 위치 · 명령문 · Wh)은 그 단원 표본에서 정하고 이 판에는 없다.

| 자리 · 활동 | 칸 | 수 · 길이 · 꼴 |
|---|---|---|
| 0 머리 | `teach.goals` · `teach.shiftKo` | goals 는 `["read-3-1-1"]`(6절 목표). shiftKo 는 before(못 하던 것) · after(스스로 하는 것) 한 줄씩, 변형끼리 뜻이 같다 |
| 1 오늘 배울 것 | `teach.todayKo` · `teach.todayEn` | todayKo 는 이 수업에서 배울 읽는 법 한 줄(선생님 말, 8절). todayEn 은 이 수업 틀을 보이는 영어 한 문장(지문에 나오는 문장도 된다) |
| 2 새 단어 | `preview` | `newWords` 와 같은 낱말 모음. 배정은 5개, 다지기 · 보강은 빈 목록. `meaningKo` 는 7절 뜻, `example` 은 빈 글 `""`(예문 몫은 본보기, C170 (3)) |
| 2 본보기 | `teach.models[]` | `lesson.models_per_lesson` 범위 안(승인 수업은 셋). 칸마다 `en`(지문과 다른 영어 한두 문장) · `ko`(반말 뜻) · `chips`(who · do · what · where, 8절) · `lineKo`(선생님 한 줄) · `picture`(9절, 문장에 나온 1~2단계 사물이 있을 때만). (제안) 첫째는 찾는 차례(하는 일 → 앞 누가 → 뒤 무엇), 둘째는 같은 하는 일 말에 누가만 다른 두 문장(가려 읽기), 셋째는 어디(go · come 처럼 뒤에 장소가 오는 말)이고, 그 수업의 하는 일 말로 쓴다 |
| 3 같이 해 보기 | `teach.together[]` | `lesson.together_items.1-3` 개. 칸마다 `kind: "text"` · `type: "fact"` · `textEn`(짧은 글 두 문장) · `prompt`(빈칸 문장) · `askRole` · `choices`(둘) · `answerNo` · `highlight`(띠 칠 낱말: 하는 일 말, 또는 누가 + 하는 일) · `lineKo` · `rightKo` · `wrongKo`. (제안) 하나는 누가, 하나는 무엇 · 어디이고, 하나는 같은 하는 일 말이 두 번 나오는 글이다 |
| 4 지문 | `content.passage` | 3절 낱말 수, 문장마다 7낱말 이하, 일상 이야기(단원 주제). 배정은 그 수업 새 단어 다섯을 모두 넣는다 |
| 4 문제 | `content.questions` | 3개. 칸마다 `kind: "text"` · `type: "fact"` · `prompt`(빈칸 문장) · `askRole` · `options`(넷) · `answerNo` · `goal`(`"read-3-1-1"`) · `whyKo` · `retryHighlight` · `spare`. 해설 `explanationKo` 는 두지 않는다(whyKo 가 대신한다) |
| 5 짝 | 문제마다 `spare` | 같은 `kind` · `type` · `askRole`, 제 짧은 글 `textEn`(두 문장, `lesson.spare_text_max_words.1-3` 낱말 이하) · `prompt` · `options`(넷) · `answerNo` · `whyKo` |
| 6 되짚기 | `teach.recap` | `frameEn`(그 수업 틀 문장 하나) · `chips` · `closeKo` · `closeKoPracticed`(8절) |

빈칸 문장 꼴(C170 (5), 3단계 단원 1~4):

- `prompt` 는 지문(같이 해 보기 · 짝은 그 글)의 한 문장에서 한 덩어리(누가 · 무엇 · 어디)를 `___` 하나로 바꾼 꼴이다. What · Where · Who 의문문은 단원 5 요소라 쓰지 않는다. `askRole` 은 바꾼 덩어리의 role(who · what · where)이다.
- 보기 넷은 빈칸에 넣어 문법이 맞는 어구다. 누가 자리 보기는 하는 일 말과 수가 맞는 복수 주어끼리 둔다(`come` 앞에 Mom 하나를 두지 않는다. 3인칭 -s 가 없는 단계다). 정답은 글로 하나만 맞고, 글에 나오는 다른 누가 · 무엇 · 어디 하나를 오답으로 둔다(가려 읽기). 정답 자리를 1~4 에 고루 나눈다.
- 문제 셋은 (제안) 누가 · 무엇 · 어디를 하나씩 묻고, 하나 이상은 같은 하는 일 말이 글에 두 번 나와 누가로 가려야 하는 문항이다(승인 수업 Q2 · Q3 꼴).
- `retryHighlight` 는 그 글 안의 답 문장 하나(글자 그대로, 정답 낱말을 품음)이고, `whyKo` 는 그 문장을 찾는 법을 한 줄로 보인다(8절).
- 풀이 검사(6.4)는 정답 없이 글 · prompt · 보기만 보고 푼다. 답이 둘 이상 맞을 수 있는 보기를 두지 않는다.

## 6. 단원 규격과 배정표(`unit-specs` · 배정 함수)

배정표는 앱의 배정 함수가 단원 단어를 차례대로 k(5)개씩 나눈 결과다. `newWords` 는 표와 낱말 모음이 같아야 한다(검증기 `vocab-allocation`). 지금 만들 수 있는 단원은 1 뿐이다(0절). 단원 2~5 는 참고로 싣는다.

### 단원 1 — 나의 하루 · 학습 요소 '일반동사 현재(I · you · we · they)'

- 단원 단어 25개(배정 차례 그대로): eat, drink, go, come, wash, sleep, study, learn, watch, listen, look, see, make, squirrel, puzzle, block, balloon, soup, fire, end, safe, quick, move, push, pull
- 그림: 3단계 단원 단어는 그림 보기 · 본보기 picture 에 쓰지 않는다(9절).
- 단원 목표(단원 규격 goals[], 평가 spec 4판 2절 꼴):

| id | 목표 글(ko) | core | tasks | home | needs | accept |
|---|---|---|---|---|---|---|
| `read-3-1-1` | 짧은 일상 이야기를 읽고 누가 · 무엇 · 어디를 찾아 답할 수 있다 | 사실 정보 찾기 | fact | 이야기 | comprehension | correct |

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | eat(먹다) · drink(마시다, 음료) · go(가다) · come(오다) · wash(씻다) |
| 2 | assigned | sleep(자다) · study(공부하다) · learn(배우다) · watch(보다, 손목시계) · listen(듣다) |
| 3 | assigned | look(보다) · see(보다, 보이다) · make(만들다) · squirrel(다람쥐) · puzzle(퍼즐) |
| 4 | assigned | block(블록, 덩어리) · balloon(풍선) · soup(수프, 국) · fire(불) · end(끝) |
| 5 | assigned | safe(안전한) · quick(빠른) · move(움직이다, 옮기다) · push(밀다) · pull(당기다) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 2 — 우리 동네와 자연 · 학습 요소 'There is · There are'

- 단원 단어 25개(배정 차례 그대로): school, park, zoo, farm, store, market, library, hospital, garden, playground, street, town, city, sky, sea, cloud, rain, snow, wind, river, mountain, beach, grass, forest, air
- 그림: 3단계 단원 단어는 그림 보기 · 본보기 picture 에 쓰지 않는다(9절).
- 단원 목표: 없음. 단원 규격에 goals[] 가 생기기 전에는 이 단원을 만들지 않는다(검증기 goal 오류, seed.goals_required_levels).

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | school(학교) · park(공원) · zoo(동물원) · farm(농장) · store(가게) |
| 2 | assigned | market(시장) · library(도서관) · hospital(병원) · garden(정원) · playground(놀이터) |
| 3 | assigned | street(거리) · town((작은) 도시, 동네) · city(도시) · sky(하늘) · sea(바다) |
| 4 | assigned | cloud(구름) · rain(비, 비가 오다) · snow(눈, 눈이 오다) · wind(바람) · river(강) |
| 5 | assigned | mountain(산) · beach(해변) · grass(풀, 잔디) · forest(숲) · air(공기) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 3 — 내 방 어디에 · 학습 요소 '위치 전치사'

- 단원 단어 25개(배정 차례 그대로): classroom, bedroom, bathroom, living room, restaurant, wall, floor, corner, side, front, bottom, middle, child, basket, eraser, ruler, crayon, scissors, glue, notebook, textbook, paper, picture, bottle, card
- 그림: 3단계 단원 단어는 그림 보기 · 본보기 picture 에 쓰지 않는다(9절).
- 단원 목표: 없음. 단원 규격에 goals[] 가 생기기 전에는 이 단원을 만들지 않는다(검증기 goal 오류, seed.goals_required_levels).

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | classroom(교실) · bedroom(침실) · bathroom(욕실, 화장실) · living room(거실) · restaurant(식당) |
| 2 | assigned | wall(벽) · floor(바닥, 층) · corner(구석, 모퉁이) · side(옆, 쪽) · front(앞) |
| 3 | assigned | bottom(바닥, 밑) · middle(가운데) · child(아이) · basket(바구니) · eraser(지우개) |
| 4 | assigned | ruler(자) · crayon(크레용) · scissors(가위) · glue(풀) · notebook(공책) |
| 5 | assigned | textbook(교과서) · paper(종이) · picture(그림, 사진) · bottle(병) · card(카드) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 4 — 교실 약속 · 학습 요소 '명령문 · Let's'

- 단원 단어 25개(배정 차례 그대로): open, close, sit, stand, stop, wait, put, take, give, get, clean, turn, left, dark, bright, round, soft, hard, cut, paint, fix, carry, pick, drop, hold
- 그림: 3단계 단원 단어는 그림 보기 · 본보기 picture 에 쓰지 않는다(9절).
- 단원 목표: 없음. 단원 규격에 goals[] 가 생기기 전에는 이 단원을 만들지 않는다(검증기 goal 오류, seed.goals_required_levels).

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | open(열다, 열린) · close(닫다) · sit(앉다) · stand(서다) · stop(멈추다) |
| 2 | assigned | wait(기다리다) · put(놓다, 넣다) · take(가지고 가다, 타다) · give(주다) · get(받다, 가져오다) |
| 3 | assigned | clean(청소하다, 깨끗한) · turn(돌다, 차례) · left(왼쪽, 왼쪽의) · dark(어두운) · bright(밝은) |
| 4 | assigned | round(둥근) · soft(부드러운) · hard(단단한, 열심히) · cut(자르다) · paint(칠하다, 물감) |
| 5 | assigned | fix(고치다) · carry(나르다, 들고 있다) · pick(고르다, 따다) · drop(떨어뜨리다, 방울) · hold(잡다, 들다) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 5 — 누가 어디에 · 학습 요소 'What · Where · Who 의문문'

- 단원 단어 25개(배정 차례 그대로): say, talk, ask, answer, meet, live, find, bring, let, age, birthday, question, number, train, taxi, airplane, subway, bridge, road, way, far, high, low, large, back
- 그림: 3단계 단원 단어는 그림 보기 · 본보기 picture 에 쓰지 않는다(9절).
- 단원 목표: 없음. 단원 규격에 goals[] 가 생기기 전에는 이 단원을 만들지 않는다(검증기 goal 오류, seed.goals_required_levels).

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | say(말하다) · talk(이야기하다) · ask(묻다) · answer(대답하다, 답) · meet(만나다) |
| 2 | assigned | live(살다) · find(찾다) · bring(가져오다) · let(~하게 하다(Let's ~ 하자)) · age(나이) |
| 3 | assigned | birthday(생일) · question(질문) · number(숫자, 번호) · train(기차) · taxi(택시) |
| 4 | assigned | airplane(비행기) · subway(지하철) · bridge(다리) · road(길, 도로) · way(길, 방법) |
| 5 | assigned | far(먼, 멀리) · high(높은, 높이) · low(낮은) · large(큰) · back(뒤로, 등) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

## 7. 단계 어휘 범위(vocab 3단계)

쓸 수 있는 낱말(제안, 표본 3판 · 승인 수업과 같은 기준). 수업 글(지문 · 문항 · 보기 · 본보기 · 같이 해 보기 · 짝 · 이야기 · 되짚기 · 허용 답 · 미리보기)은 아래 넷만 쓴다.

1. 1~2단계 낱말(아래 목록, 활용형 포함).
2. 3단계 기능어 가운데 그 단원까지 열린 것(아래 표).
3. 이 영역 3단계 단원 단어 가운데 이번 수업까지 배정된 것. 배정 n 수업은 그 단원 배정 1~n 의 새 단어와 앞 단원 단어, 다지기 · 보강은 그 단원 단어 25개와 앞 단원 단어다.
4. 이름 표의 이름(10절).

3단계의 다른 단원 단어, 다른 영역의 3단계 단원 단어, 4단계 이상 낱말은 쓰지 않는다. 검증기의 범위 밖 비율은 3단계 범위 전체를 받지만(정본 3.4), 아직 배우지 않은 낱말이 미리보기 없이 나오지 않게 하려는 것이다.

흔하지만 쓰지 않는 낱말(괄호는 vocab 단계): school(3) · park(3) · zoo(3) · morning(4) · breakfast(4) · dinner(4) · bread(4) · day(4) · every(4) · together(4) · too(4) · then(7) · after(4) · before(4) · class(4) · kitchen(4) · warm(4) · quiet(5) · our(4) · their(4) · them(5) · us(5) · clean(3) · sit(3) · stand(3) · open(3) · close(3) · today(4) · always(5) · but(5) · so(4) · some(6) · because(6).

**1~2단계 기능어 44개**(글로서리에 넣지 않는다): `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 [am, is, are, was, were, been, being] · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) [does, did, done, doing] · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의 · `all` 모든, 모두 · `at` ~에(서), ~을(보다) · `can` ~할 수 있다 · `down` 아래로 · `for` ~을 위해, ~을 위한 · `from` ~에서, ~로부터 · `he` 그는 · `of` ~의 · `or` 또는 · `out` 밖으로, 밖에 · `she` 그녀는 · `with` ~와 함께, ~로

**3단계 기능어**(이 영역에서 열리는 단원):

| 낱말 | 뜻 | 쓸 수 있는 때 |
|---|---|---|
| `behind` | ~ 뒤에 | 단원 3 부터 |
| `between` | ~ 사이에 | 단원 3 부터 |
| `in front of` | ~ 앞에 | 단원 3 부터 |
| `near` | ~ 가까이에 | 단원 3 부터 |
| `next to` | ~ 옆에 | 단원 3 부터 |
| `off` | 떨어져, 벗어 | 단원 3 부터 |
| `there` | 거기에, (There is) ~이 있다 | 단원 2 부터 |
| `these` | 이것들, 이 | 단원 2 부터 |
| `they` | 그들은, 그것들은 | 단원 1 부터 |
| `those` | 저것들, 저 | 단원 2 부터 |
| `under` | ~ 아래에 | 단원 3 부터 |
| `we` | 우리는 | 단원 1 부터 |
| `where` | 어디에 | 단원 5 부터 |
| `who` | 누구 | 단원 5 부터 |

**1단계 내용어 151개**: `ant` 개미 [ants] · `apple` 사과 [apples] · `arm` 팔 [arms] · `bag` 가방 [bags] · `ball` 공 [balls] · `banana` 바나나 [bananas] · `bank` 은행 [banks] · `bath` 목욕, 욕조 [baths] · `bear` 곰 [bears] · `bed` 침대 [beds] · `bell` 종 [bells] · `big` 큰 [bigger, biggest] · `bike` 자전거 [bikes] · `bird` 새 [birds] · `black` 검은, 검은색 [blacks] · `blue` 파란, 파란색 [blues] · `book` 책 [books] · `box` 상자 [boxes] · `brush` 솔, 붓 [brushes, brushed, brushing] · `bus` 버스 [buses] · `cake` 케이크 [cakes] · `candy` 사탕 [candies] · `cap` (챙 달린) 모자 [caps] · `car` 자동차 [cars] · `cat` 고양이 [cats] · `chair` 의자 [chairs] · `cheese` 치즈 [cheeses] · `chicken` 닭, 닭고기 [chickens] · `clock` 시계 [clocks] · `color` 색, 색깔 [colors] · `cookie` 쿠키, 과자 [cookies] · `cow` 소 [cows] · `cup` 컵 [cups] · `cute` 귀여운 [cuter, cutest] · `desk` 책상 [desks] · `dish` 접시, 요리 [dishes] · `dog` 개 [dogs] · `doll` 인형 [dolls] · `door` 문 [doors] · `drum` 북, 드럼 [drums] · `duck` 오리 [ducks] · `ear` 귀 [ears] · `egg` 달걀 [eggs] · `eight` 8, 여덟 · `elephant` 코끼리 [elephants] · `eye` 눈 [eyes] · `face` 얼굴 [faces] · `fan` 선풍기, 부채 [fans] · `fish` 물고기 · `five` 5, 다섯 · `flower` 꽃 [flowers] · `fork` 포크 [forks] · `four` 4, 넷 · `fox` 여우 [foxes] · `frog` 개구리 [frogs] · `game` 놀이, 게임 [games] · `grape` 포도 [grapes] · `green` 초록의, 초록색 [greens] · `guitar` 기타 [guitars] · `hand` 손 [hands] · `hat` 모자 [hats] · `home` 집 [homes] · `horse` 말 [horses] · `hot` 뜨거운, 더운 [hotter, hottest] · `insect` 곤충 [insects] · `jacket` 재킷, 웃옷 [jackets] · `jam` 잼 [jams] · `juice` 주스 · `key` 열쇠 [keys] · `king` 왕 [kings] · `kite` 연 [kites] · `lake` 호수 [lakes] · `lamp` 램프, 전등 [lamps] · `leg` 다리 [legs] · `like` 좋아하다 [likes, liked, liking] · `lion` 사자 [lions] · `little` 작은, 어린 · `long` 긴 [longer, longest] · `lunch` 점심 · `map` 지도 [maps] · `milk` 우유 · `monkey` 원숭이 [monkeys] · `mouth` 입 [mouths] · `name` 이름 [names] · `neck` 목 [necks] · `nice` 좋은, 멋진 [nicer, nicest] · `nine` 9, 아홉 · `nose` 코 [noses] · `nurse` 간호사 [nurses] · `octopus` 문어 [octopuses] · `old` ~살의, 늙은 [older, oldest] · `one` 1, 하나 · `orange` 오렌지, 주황색 [oranges] · `pen` 펜 [pens] · `pencil` 연필 [pencils] · `piano` 피아노 [pianos] · `pig` 돼지 [pigs] · `pink` 분홍의, 분홍색 [pinks] · `pizza` 피자 [pizzas] · `plane` 비행기 [planes] · `pot` 냄비, 화분 [pots] · `puppy` 강아지 [puppies] · `queen` 여왕 [queens] · `rabbit` 토끼 [rabbits] · `red` 빨간, 빨간색 [reds] · `rice` 밥, 쌀 · `ring` 반지, 울리다 [rings, rang, rung, ringing] · `robot` 로봇 [robots] · `rock` 바위, 돌 [rocks] · `rose` 장미 [roses] · `sand` 모래 · `seven` 7, 일곱 · `sheep` 양 · `shell` 조개껍데기 [shells] · `ship` 배 [ships] · `shirt` 셔츠 [shirts] · `shoe` 신발 [shoes] · `shop` 가게, 쇼핑하다 [shops, shopped, shopping] · `short` 짧은, 키가 작은 [shorter, shortest] · `six` 6, 여섯 · `small` 작은 [smaller, smallest] · `smile` 미소, 웃다 [smiles, smiled, smiling] · `snack` 간식 [snacks] · `snake` 뱀 [snakes] · `sock` 양말 [socks] · `song` 노래 [songs] · `star` 별 [stars] · `sun` 해, 태양 [suns] · `swing` 그네, 흔들다 [swings, swung, swinging] · `tall` 키가 큰, 높은 [taller, tallest] · `ten` 10, 열 · `tent` 텐트 [tents] · `thank` 고마워하다 [thanks, thanked, thanking] · `thick` 두꺼운 [thicker, thickest] · `thin` 얇은, 마른 [thinner, thinnest] · `three` 3, 셋 · `tiger` 호랑이 [tigers] · `tooth` 이, 이빨 [teeth] · `top` 팽이, 꼭대기 [tops] · `toy` 장난감 [toys] · `tree` 나무 [trees] · `truck` 트럭 [trucks] · `two` 2, 둘 · `umbrella` 우산 [umbrellas] · `violin` 바이올린 [violins] · `white` 하얀, 흰색 [whites] · `window` 창문 [windows] · `wing` 날개 [wings] · `yellow` 노란, 노란색 [yellows] · `yo-yo` 요요 [yo-yos] · `zebra` 얼룩말 [zebras]

**2단계 내용어 125개**: `angry` 화난 [angrier, angriest] · `animal` 동물 [animals] · `aunt` 이모, 고모, 숙모 [aunts] · `baby` 아기 [babies] · `bad` 나쁜 [worse, worst] · `badminton` 배드민턴 · `baseball` 야구 · `basketball` 농구 · `beautiful` 아름다운 · `boy` 남자아이 [boys] · `brother` 형, 오빠, 남동생 [brothers] · `busy` 바쁜 [busier, busiest] · `catch` 잡다 [catches, caught, catching] · `chocolate` 초콜릿 [chocolates] · `climb` 오르다 [climbs, climbed, climbing] · `coat` 외투, 코트 [coats] · `cold` 추운, 차가운 [colder, coldest] · `computer` 컴퓨터 [computers] · `cook` 요리하다, 요리사 [cooks, cooked, cooking] · `cool` 시원한, 멋진 [cooler, coolest] · `corn` 옥수수 · `cousin` 사촌 [cousins] · `dad` 아빠 [dads] · `dance` 춤추다, 춤 [dances, danced, dancing] · `doctor` 의사 [doctors] · `dolphin` 돌고래 [dolphins] · `draw` 그리다 [draws, drew, drawn, drawing] · `dress` 드레스, 원피스 [dresses] · `family` 가족 [families] · `farmer` 농부 [farmers] · `fast` 빠른, 빨리 [faster, fastest] · `father` 아버지 [fathers] · `fine` 괜찮은, 좋은 · `finger` 손가락 [fingers] · `fly` 날다 [flies, flew, flown, flying] · `food` 음식 [foods] · `foot` 발 [feet] · `friend` 친구 [friends] · `fruit` 과일 [fruits] · `fun` 재미, 재미있는 · `funny` 웃기는, 재미있는 [funnier, funniest] · `gift` 선물 [gifts] · `giraffe` 기린 [giraffes] · `girl` 여자아이 [girls] · `glad` 기쁜 · `glasses` 안경 · `goat` 염소 [goats] · `good` 좋은, 착한 [better, best] · `grandfather` 할아버지 [grandfathers] · `grandmother` 할머니 [grandmothers] · `great` 아주 좋은, 훌륭한 [greater, greatest] · `hair` 머리카락 [hairs] · `hamburger` 햄버거 [hamburgers] · `happy` 행복한, 기쁜 [happier, happiest] · `have` 가지고 있다 [has, had, having] · `head` 머리 [heads] · `help` 돕다 [helps, helped, helping] · `here` 여기에 · `house` 집 [houses] · `hungry` 배고픈 [hungrier, hungriest] · `ice cream` 아이스크림 [ice creams] · `jeans` 청바지 · `jump` 뛰다, 점프하다 [jumps, jumped, jumping] · `kick` 차다 [kicks, kicked, kicking] · `kind` 친절한 [kinder, kindest] · `knee` 무릎 [knees] · `know` 알다 [knows, knew, known, knowing] · `man` 남자 [men] · `mom` 엄마 [moms] · `mother` 어머니 [mothers] · `music` 음악 · `need` 필요하다 [needs, needed, needing] · `new` 새, 새로운 [newer, newest] · `now` 지금 · `pants` 바지 · `penguin` 펭귄 [penguins] · `pet` 반려동물 [pets] · `phone` 전화(기) [phones] · `play` 놀다, (운동 · 악기를) 하다 [plays, played, playing] · `police` 경찰 · `potato` 감자 [potatoes] · `pretty` 예쁜 [prettier, prettiest] · `read` 읽다 [reads, reading] · `ready` 준비된 · `really` 정말 · `ride` 타다 [rides, rode, ridden, riding] · `room` 방 [rooms] · `run` 달리다 [runs, ran, running] · `sad` 슬픈 [sadder, saddest] · `sandwich` 샌드위치 [sandwiches] · `scarf` 목도리 [scarves] · `shoulder` 어깨 [shoulders] · `sick` 아픈 [sicker, sickest] · `sing` 노래하다 [sings, sang, sung, singing] · `sister` 누나, 언니, 여동생 [sisters] · `skate` 스케이트를 타다 [skates, skated, skating] · `ski` 스키를 타다 [skis, skied, skiing] · `skirt` 치마 [skirts] · `sleepy` 졸린 [sleepier, sleepiest] · `slow` 느린 [slower, slowest] · `smart` 똑똑한 [smarter, smartest] · `soccer` 축구 · `sorry` 미안한 · `strawberry` 딸기 [strawberries] · `strong` 힘센, 강한 [stronger, strongest] · `student` 학생 [students] · `sweater` 스웨터 [sweaters] · `swim` 수영하다 [swims, swam, swum, swimming] · `table` 탁자, 식탁 [tables] · `teacher` 선생님 [teachers] · `tennis` 테니스 · `thirsty` 목마른 [thirstier, thirstiest] · `throw` 던지다 [throws, threw, thrown, throwing] · `tired` 피곤한 · `toe` 발가락 [toes] · `turtle` 거북 [turtles] · `uncle` 삼촌, 이모부, 고모부 [uncles] · `very` 아주, 매우 · `walk` 걷다, 산책 [walks, walked, walking] · `want` 원하다 [wants, wanted, wanting] · `water` 물 · `whale` 고래 [whales] · `woman` 여자 [women] · `write` 쓰다 [writes, wrote, written, writing] · `young` 어린, 젊은 [younger, youngest]

**이 영역 3단계 단원 단어**(6절 배정 차례):

- **읽기 3단계 단원 1 (나의 하루)**: `eat` 먹다 [eats, ate, eaten, eating] · `drink` 마시다, 음료 [drinks, drank, drunk, drinking] · `go` 가다 [goes, went, gone, going] · `come` 오다 [comes, came, coming] · `wash` 씻다 [washes, washed, washing] · `sleep` 자다 [sleeps, slept, sleeping] · `study` 공부하다 [studies, studied, studying] · `learn` 배우다 [learns, learned, learning] · `watch` 보다, 손목시계 [watches, watched, watching] · `listen` 듣다 [listens, listened, listening] · `look` 보다 [looks, looked, looking] · `see` 보다, 보이다 [sees, saw, seen, seeing] · `make` 만들다 [makes, made, making] · `squirrel` 다람쥐 [squirrels] · `puzzle` 퍼즐 [puzzles] · `block` 블록, 덩어리 [blocks] · `balloon` 풍선 [balloons] · `soup` 수프, 국 [soups] · `fire` 불 [fires] · `end` 끝 [ends] · `safe` 안전한 [safer, safest] · `quick` 빠른 [quicker, quickest] · `move` 움직이다, 옮기다 [moves, moved, moving] · `push` 밀다 [pushes, pushed, pushing] · `pull` 당기다 [pulls, pulled, pulling]
- **읽기 3단계 단원 2 (우리 동네와 자연)**: `school` 학교 [schools] · `park` 공원 [parks] · `zoo` 동물원 [zoos] · `farm` 농장 [farms] · `store` 가게 [stores] · `market` 시장 [markets] · `library` 도서관 [libraries] · `hospital` 병원 [hospitals] · `garden` 정원 [gardens] · `playground` 놀이터 [playgrounds] · `street` 거리 [streets] · `town` (작은) 도시, 동네 [towns] · `city` 도시 [cities] · `sky` 하늘 [skies] · `sea` 바다 [seas] · `cloud` 구름 [clouds] · `rain` 비, 비가 오다 [rains, rained, raining] · `snow` 눈, 눈이 오다 [snows, snowed, snowing] · `wind` 바람 [winds] · `river` 강 [rivers] · `mountain` 산 [mountains] · `beach` 해변 [beaches] · `grass` 풀, 잔디 [grasses] · `forest` 숲 [forests] · `air` 공기
- **읽기 3단계 단원 3 (내 방 어디에)**: `classroom` 교실 [classrooms] · `bedroom` 침실 [bedrooms] · `bathroom` 욕실, 화장실 [bathrooms] · `living room` 거실 [living rooms] · `restaurant` 식당 [restaurants] · `wall` 벽 [walls] · `floor` 바닥, 층 [floors] · `corner` 구석, 모퉁이 [corners] · `side` 옆, 쪽 [sides] · `front` 앞 [fronts] · `bottom` 바닥, 밑 [bottoms] · `middle` 가운데 [middles] · `child` 아이 [children] · `basket` 바구니 [baskets] · `eraser` 지우개 [erasers] · `ruler` 자 [rulers] · `crayon` 크레용 [crayons] · `scissors` 가위 · `glue` 풀 [glues] · `notebook` 공책 [notebooks] · `textbook` 교과서 [textbooks] · `paper` 종이 [papers] · `picture` 그림, 사진 [pictures] · `bottle` 병 [bottles] · `card` 카드 [cards]
- **읽기 3단계 단원 4 (교실 약속)**: `open` 열다, 열린 [opens, opened, opening] · `close` 닫다 [closes, closed, closing] · `sit` 앉다 [sits, sat, sitting] · `stand` 서다 [stands, stood, standing] · `stop` 멈추다 [stops, stopped, stopping] · `wait` 기다리다 [waits, waited, waiting] · `put` 놓다, 넣다 [puts, putting] · `take` 가지고 가다, 타다 [takes, took, taken, taking] · `give` 주다 [gives, gave, given, giving] · `get` 받다, 가져오다 [gets, got, gotten, getting] · `clean` 청소하다, 깨끗한 [cleans, cleaned, cleaning, cleaner, cleanest] · `turn` 돌다, 차례 [turns, turned, turning] · `left` 왼쪽, 왼쪽의 · `dark` 어두운 [darker, darkest] · `bright` 밝은 [brighter, brightest] · `round` 둥근 [rounder, roundest] · `soft` 부드러운 [softer, softest] · `hard` 단단한, 열심히 [harder, hardest] · `cut` 자르다 [cuts, cutting] · `paint` 칠하다, 물감 [paints, painted, painting] · `fix` 고치다 [fixes, fixed, fixing] · `carry` 나르다, 들고 있다 [carries, carried, carrying] · `pick` 고르다, 따다 [picks, picked, picking] · `drop` 떨어뜨리다, 방울 [drops, dropped, dropping] · `hold` 잡다, 들다 [holds, held, holding]
- **읽기 3단계 단원 5 (누가 어디에)**: `say` 말하다 [says, said, saying] · `talk` 이야기하다 [talks, talked, talking] · `ask` 묻다 [asks, asked, asking] · `answer` 대답하다, 답 [answers, answered, answering] · `meet` 만나다 [meets, met, meeting] · `live` 살다 [lives, lived, living] · `find` 찾다 [finds, found, finding] · `bring` 가져오다 [brings, brought, bringing] · `let` ~하게 하다(Let's ~ 하자) [lets, letting, let's] · `age` 나이 [ages] · `birthday` 생일 [birthdays] · `question` 질문 [questions] · `number` 숫자, 번호 [numbers] · `train` 기차 [trains] · `taxi` 택시 [taxis] · `airplane` 비행기 [airplanes] · `subway` 지하철 [subways] · `bridge` 다리 [bridges] · `road` 길, 도로 [roads] · `way` 길, 방법 [ways] · `far` 먼, 멀리 [farther, farthest] · `high` 높은, 높이 [higher, highest] · `low` 낮은 [lower, lowest] · `large` 큰 [larger, largest] · `back` 뒤로, 등 [backs]

## 8. 학습 요소 범위와 문장 꼴(정본 3.6 · C64)

수업 글(지문 · 문제 · 보기 · 본보기 · 같이 해 보기 · 짝 · 되짚기 · 미리보기)은 앞 단계 전부, 같은 단계의 앞 단원, 이번 단원의 요소만 쓴다(C64 (1)). 읽기 1~2단계 요소는 `a · an + 명사` / `This is ~` / `색 · 크기 + 명사` / `I like ~` / `수 + 복수 -s` / `I am · You are` / `He · She · It is` / `have` / `can` / `Is it ~? · Do you ~?` 이고, 3단계 다섯은 단원 차례대로 `일반동사 현재(I · you · we · they)` / `There is · There are` / `위치 전치사` / `명령문 · Let's` / `What · Where · Who 의문문` 이다.

| 단원 | 쓸 수 있는 꼴(제안, 앞 꼴에 더한다) | 예 |
|---|---|---|
| 1 | I · you · we · they · 두 사람 이름(복수 주어) + 하는 일 + 무엇 · 어디. 하는 일 말은 원형만 쓴다(3인칭 단수 -s 없음). 1~2단계 꼴(is · are · have · can · like) | `We eat lunch.` · `Ben and Meg come to my house.` · `They drink juice.` |
| 2~4 | 그 단원 표본에서 정한다(이 판으로 만들지 않음) | |
| 5 | 이 판으로 만들지 않는다 | |

검증기가 오류로 잡는 꼴(형태 표 `forms.json`, 단원 1 에서 범위 밖):

| 꼴 | 걸리는 예 | 열리는 때 |
|---|---|---|
| There is · There are | `There is a ball.` | 3단계 단원 2 |
| Let's | `Let's play.` | 3단계 단원 4 |
| 3인칭 단수 -s(he · she · it 뒤) | `He eats lunch.` | 4단계 단원 1 |
| don't · do not · does · doesn't | `They don't drink milk.` | 4단계 단원 2 |
| 현재진행 · be 부정 · 시각(at · on) | `We are eating.` · `It is not big.` · `at three` | 4단계 |

검출기가 못 잡지만 쓰지 않는 꼴: 이름 뒤 3인칭 -s(`Ben eats`, 4단계 단원 1) · 명령문(`Look at ~` · `Wash your hands.`, 단원 4) · What · Where · Who 의문문(단원 5) · 위치 전치사 behind · under · next to …(단원 3) · 문장을 잇는 and · but · or(5단계 단원 3, 명사 둘을 잇는 and 는 된다) · our · their(4단계) · them · us(5단계). 그래서 '손을 씻는다'는 `I wash my hands.` 꼴로 쓰고 `We wash our hands.` 는 쓰지 않는다.

**선생님 한국어 줄**(R8, 검증기 `teacher-line` · `grammar-term` · `teacher-name`): 해요체, 아이가 아는 말, 문법 용어 없음(13절), 줄마다 문장 `lesson.line_max_sentences` 이하 · 글자 `lesson.teacher_line_max_chars` 이하(빈칸 뺌). 영어 낱말 뒤 조사는 띄어 쓴다(`come 을`). 읽어 주는 선생님 줄에는 가운뎃점(·) 대신 쉼표나 '와'를 쓴다. 기기 한국어 목소리가 '·'를 글자 그대로 읽을 수 있어서다(장부 L-2 실측 항목). 승인 수업의 'go · come 뒤에는 어디가 와요.'는 고정이라 그대로 둔다.

- `todayKo`: 이 수업에서 배울 읽는 법 한 줄(승인 수업: '오늘은 글에서 누가 무엇을 하는지 찾아 읽어요.'). 변형끼리 뜻이 같다.
- 본보기 `lineKo`: 그 본보기가 보이는 찾는 법 한 줄(예: '하는 일 말을 찾아요. 앞은 누가, 뒤는 무엇이에요.' · 'wash 는 같아도 앞이 달라요. 누가인지 꼭 봐요.').
- 같이 해 보기 `lineKo` · `rightKo` · `wrongKo`: 띠를 친 말을 가리키고(`come 을 찾았어요. 바로 앞을 골라 봐요.`), 맞으면 어디를 봐서 맞았는지(`맞아요! come 앞에 Dan and Tess 가 있어요.`), 틀리면 어디를 다시 볼지(`come 바로 앞을 다시 봐요.`).
- `whyKo`: 그 문항에 찾는 법을 적용한 한 줄. 정답만 말하지 않고 어디를 보면 되는지를 말하며, 아이가 무엇을 골랐든 맞는 꼴이다(예: 'drink 가 두 번 나와요. They drink 뒤를 봐요.').
- 마무리 줄 둘: `closeKo` 는 '이제 ~ 읽을 수 있어요' 꼴, `closeKoPracticed` 는 '오늘은 ~를 배우고 연습했어요' 꼴이고 '할 수 있' 같은 숙달 단정을 쓰지 않는다(검증기 `recap-line`). 앱이 teach.goals 첫 목표의 독립 해냄 수(`lesson.recap_min_evidence`)와 비율(`lesson.recap_can_ratio`)로 하나를 고른다. 읽어 주기 · 뜻 보기를 쓴 시도는 독립 해냄에 들지 않는다(C175 (1)).
- 시간 합(검증기 `teach-seconds`): `todayKo` · `todayEn` · 본보기 `lineKo` · `en` · 되짚기 `frameEn` · 마무리 줄 둘 가운데 긴 것을, 한글은 `speech.speak_chars_per_second_ko`, 영문은 `speech.speak_chars_per_second` 로 나눈 합이 `lesson.teach_seconds_max.1-3` 이하다. 본보기 셋이면 영어를 짧게 쓴다.

**칩 role**(R8): who(하는 일을 하는 사람 · 동물 덩어리: We · They · I · Ben and Meg) · do(하는 일 말) · what(대상: cake · my face · the dog) · where(장소 덩어리: to the shop · home · to the lake). 칩 글은 문장 글자 그대로 자른 덩어리이고(관사 포함), 'with Mom' 같은 덧붙인 말에는 칩을 달지 않는다(제안). 두 문장 본보기는 칩을 문장 차례대로 이어 둔다(승인 수업 본보기 2).

좋은 줄 · 나쁜 줄(틀 R8 표)을 지킨다. 예: '동사를 찾으면 앞에 주어가 있어요.'(용어) · '정답은 Ben and Meg 예요.'('왜'가 없음) · '오늘 연습해서 이제 다 할 수 있어요.'(배우고 연습함 줄에 숙달 단정)는 쓰지 않는다.

## 9. 그림 규칙

3단계에는 그림 문제가 없다(읽기는 글 문제, 말하기 듣기 보기는 글, 쓰기는 조립). 그림은 본보기 옆 사물 그림 하나(`teach.models[].picture`, 선택)뿐이다(C170 (6)). 키는 아래 1~2단계 그림 키 207개에서 고르고, 그 본보기 영어 문장에 나온 사물이어야 한다. 문장에 없는 사물 그림을 붙이지 않고, 색 낱말은 문장과 색이 맞을 때만 쓴다. 3단계 낱말 그림(plan 정한 것 14 로 단원 1 새 단어 열 개를 더함)은 미리보기 화면 몫이라 picture 칸에 쓰지 않는다(제안). 장면 그림은 없다(C27).

그림 키: angry, ant, apple, arm, baby, badminton, bag, ball, banana, bank, baseball, basketball, bath, bear, bed, bell, bike, bird, black, blue, book, box, boy, brush, bus, cake, candy, cap, car, cat, catch, chair, cheese, chicken, chocolate, climb, clock, coat, computer, cook, cookie, corn, cow, cup, dance, desk, dish, doctor, dog, doll, dolphin, door, draw, dress, drum, duck, ear, egg, eight, elephant, eye, face, family, fan, farmer, finger, fish, five, flower, fly, foot, fork, four, fox, frog, gift, giraffe, girl, glasses, goat, grandfather, grandmother, grape, green, guitar, hair, hamburger, hand, happy, hat, head, horse, house, hungry, ice cream, insect, jacket, jam, jeans, juice, jump, key, kick, king, kite, knee, lake, lamp, leg, lion, man, map, milk, monkey, mouth, neck, nine, nose, nurse, octopus, one, orange, pants, pen, pencil, penguin, phone, piano, pig, pink, pizza, plane, police, pot, potato, queen, rabbit, read, red, rice, ride, ring, robot, rock, rose, run, sad, sand, sandwich, scarf, seven, sheep, shell, ship, shirt, shoe, shop, shoulder, sick, sing, six, skate, ski, skirt, sleepy, smile, snake, soccer, sock, star, strawberry, strong, student, sun, sweater, swim, swing, table, teacher, ten, tennis, tent, thirsty, three, throw, tiger, tired, toe, tooth, top, tree, truck, turtle, two, umbrella, violin, walk, water, whale, white, window, wing, woman, write, yellow, yo-yo, zebra

## 10. 주제 묶음 · 변형 · 주제 겹침 · 인물

- `variant` 1 = 주제 묶음 1(동물 · 자연 · 음식 · 가족), `variant` 2 = 주제 묶음 2(놀이 · 운동 · 게임 · 우주 · 탈것). 묶음 id 와 변형 번호가 같다(C54 (3)).
- 단원 주제(6절)는 그대로 두고 등장인물 · 예시 · 상황만 묶음에 맞춘다(정본 6.3).
- 같은 (kind, lessonNo) 의 두 변형은 `newWords` 가 같고 문항 수 · 유형이 같다(검증기 `topic-variants`). teach.todayKo · teach.shiftKo 와 문장 틀의 뜻도 같다(델타 spec 설계 6). 본보기 · 같이 해 보기 · 혼자 문항 · 짝은 변형 주제에 맞춰 달리 쓴다.
- 한 단원 수업 26개(승인 수업 포함)의 제목과 장면이 서로 겹치지 않게 한다. 앞에서 쓴 제목 · 장면 목록을 적어 가며 만든다.

### 인물(C124 · R10)

3단계 읽기는 인물이 이야기의 뼈대다. 이름이 나온 수업 수 n 의 상한은 두지 않고(제안), Momo · Tori 가 나오는 수업 수 m 은 max(⌊N/8⌋, ⌊n/2⌋) 이하다(N 은 이 파일 수업 수). 중심 쌍은 Ben · Meg 이고, 이야기의 나(I) · 우리(We)와 함께 쓴다. 이름은 글로서리에 `proper: true` 로 넣는다(어휘 범위 밖 비율에서 빠진다).

| 이름 | 누구 | 한국어로 적을 때 |
|---|---|---|
| Momo | 아이 | 모모 |
| Tori | 모모의 다람쥐 친구(C122) | 토리 |
| Ben | 남자아이 | 벤 |
| Meg | 여자아이 | 메그 |
| Dan | 남자아이 | 댄 |
| Tess | 여자아이 | 테스 |
| Max | 강아지 | 맥스 |
| Ted | 곰 | 테드 |
| Gus | 오리 | 거스 |

- 동물 인물(Max · Ted · Gus)은 먹기 · 마시기(물) · 가기 · 오기 · 놀기만 하고, 씻기 · 공부 · 만들기 · 물건 다루기는 사람 이름(Ben · Meg · Dan · Tess · Mom · Dad · Momo)으로 쓴다(강아지가 개를 씻거나 주스를 마시는 장면을 쓰지 않는다).
- 이름 표 밖의 이름을 새로 만들지 않는다. 회화 선생님 이름(Mina · Leo · Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi), 실제 사람 · 상표 · 작품 속 인물 이름, 아이 이름, `{NAME}` 을 쓰지 않는다.
- 이름을 부르는 말로 문장 앞뒤에 붙이지 않는다(`Ben, come here.` 같은 꼴 금지).
- 선생님 말 칸(todayKo · lineKo · whyKo · rightKo · wrongKo · closeKo · closeKoPracticed)에는 선생님 이름 · `{TEACHER}` · `{NAME}` 을 쓰지 않는다. 어느 선생님이 해도 맞는 말로 쓰고, 아이를 이름으로 부르지 않는다. 토리는 그 수업 글에 등장인물로 나올 때만 선생님 말에 쓸 수 있다(검증기 `teacher-name`).
- 같은 단계의 읽기 · 말하기는 새 단어 · 학습 요소가 같아, 같은 수업 번호의 두 수업을 아이가 같은 날 하기 쉽다(장부 L-8). 그래서 같은 수업 번호의 읽기 · 말하기 사이에서 같은 인물 쌍에 어긋나는 사실을 주지 않는다. 생성은 영역마다 따로 하므로 영역마다 중심 쌍을 나누고, 다른 영역의 중심 쌍을 이야기 · 질문의 중심에 쓰지 않는다. 다른 수업 번호끼리는 다른 날 이야기라 묶지 않는다. 아래 표는 이미 정해진 승인 수업(배정 1 · 변형 1)의 사실이다.

| 영역 | 중심 쌍 | 승인 수업(단원 1 배정 1 · 변형 1)에 이미 정해진 사실 |
|---|---|---|
| 읽기 | Ben · Meg | Ben and Meg come to my house · drink juice(나는 milk), 나는 Mom 과 home 에 감 · 손을 씻음, 우리는 lunch 를 먹고 lake 에 가서 ball 로 놂. 같이 해 보기 · 짝: Dan and Tess come to my room · They eat apples(나는 rice) · Meg and I go to the shop · Ben and Dan come home · They wash the car(나는 cups) · Tess and I go to the bank · Mom and Dad go to the shop |
| 말하기 | Dan · Tess | Dan and Tess come here · eat pizza with me · drink milk(나는 orange juice) · wash the cups · go to the lake. 본보기 · 같이 해 보기 · 듣기 · 짝: Max and Gus drink water · come here, Momo and Ted eat cookies · drink milk, Mom and Dad go to the shop · eat rice · wash the dog, Ted and Gus eat bananas · go to the bank, Ted and Max go home · wash the dog, Max and Ted eat rice, Momo and Dad drink juice |
| 쓰기 | 없음(조립 카드에 이름 · I 를 두지 않음) | 방 · 교실의 생김새 문장(The classroom is big. 등) |

- We 는 써도 된다. We 가 든 문장을 빈칸으로 물을 때는 글에 We 가 누구인지(나와 누구) 쓰여 있어야 한다(승인 수업 Q3 꼴, C174 (4) · 장부 L-7).

## 11. 수업 종류별 내용

| kind | 새 단어 | 내용 |
|---|---|---|
| `assigned`(배정 1~5) | 6절 표의 5개 | 지문에 새 단어 다섯을 모두 넣는다(하는 일 말은 원형). 본보기 · 같이 해 보기 · 문제의 하는 일 말도 될 수 있으면 그 수업 새 단어로 쓴다. 이 수업보다 뒤 배정 수업의 단원 단어는 어디에도 쓰지 않는다(경고 `relation-early-use`). 배정 1 · 변형 1 은 승인 수업이다 |
| `reinforce`(다지기 6~10) | 없음 | 배정 1~5 의 단원 단어를 다시 쓴다. 다지기 다섯을 합쳐 단원 단어가 모두 한 번 이상 나오게 한다(경고 `relation-not-reused`). `preview` 는 빈 목록. teach 는 그 수업 지문이 다시 쓰는 하는 일 말로 쓴다 |
| `remedial`(보강 1~3) | 없음 | (제안) 보강 1 은 배정 1 · 2 단어, 보강 2 는 배정 3 · 4 단어, 보강 3 은 배정 5 단어를 몰아 다룬다. 변형마다 보강 셋을 합쳐 단원 단어마다 `seed.remedial_coverage.1-3` 번 이상(2번을 목표로 하고 셈을 보고). `preview` 는 빈 목록 |

- 배정 4(block · balloon · soup · fire · end)는 하는 일 말이 없으니 앞 배정의 하는 일 말로 틀을 끈다(예 They eat soup. · We look at the balloons.).
- 모든 수업에 teach 를 둔다(가르치는 수업, 3단계는 `seed.goals_required_levels` 단계라 teach.goals · 문항 goal 이 필수다).
- 한 수업에 문장 틀 하나(C170 (8)): 단원 1 의 틀은 '누가 + 하는 일 + 무엇 · 어디'이고 읽는 법은 '하는 일 말을 찾고 앞 · 뒤를 읽기'다. 수업마다 하는 일 말과 장면만 바꾼다.
- `unitWords` 에는 본문(지문 · 문제 · 보기 · 본보기 · 같이 해 보기 · 짝 · 되짚기)에 나온 단원 단어를 빠짐없이 적는다(빠지면 경고 `unit-words-unlisted`, 단원 밖 낱말이면 오류 `unit-words`). `targetWords` 는 지문에 나온 단원 단어 가운데 이 수업이 다루는 것이다(배정은 새 단어, 다지기 · 보강은 지문에 나온 단원 단어).
- 글로서리(`content.glossary`): 지문 · 같이 해 보기 글(`textEn`) · 짝 글(`textEn`)에 나온 기능어 밖 모든 낱말 표기마다 하나다(R11 · 장부 L-22). `surface` 는 글에 나온 꼴(`hands`), `lemma` 는 원형(`hand`), `meaningKo` 는 낱말 뜻만(7절 뜻, 해요체 없이), 이름은 `"proper": true`(어휘 범위 밖 비율에서 빠진다). 같은 표기는 한 번만 둔다.
- 짝 글 · 같이 해 보기 글의 문장도 7절 범위와 8절 꼴 안이다(짝의 범위는 그 수업과 같다, C64 (1)).

## 12. 출력 규격(Zod `ReadingLessonSchema` 와 1:1)

모르는 키는 거부된다. 필드 이름 · 꼴을 그대로 쓴다. 파일 겉: `{ "area": "reading", "level": 3, "unit": <단원>, "lessons": [ … ] }`. 수업 칸의 차례는 승인 수업과 같게 한다(kind · lessonNo · variant · revision · correction · generation · title · newWords · unitWords · preview · teach · content).

| 필드 | 꼴 | 설명 |
|---|---|---|
| `kind` · `lessonNo` · `variant` | 4절 번호 규칙 | 수업 종류 · 번호 · 주제 변형 |
| `revision` · `correction` | 0 이상 정수 | 호출 값(승인 수업은 제 값) |
| `generation` | `{ "method": "generated", "model", "effort", "briefHash", "agentHash", "createdOn", "retries"? }` | 호출 값과 자기 모델 ID |
| `title` | 한국어 | 목록 제목, 10자 안팎, 단원 26수업에서 겹치지 않게 |
| `newWords` · `unitWords` | 낱말 id 목록 | 11절 |
| `preview` | `[{ "word", "meaningKo", "example": "" }]` | `newWords` 와 같은 낱말 모음 |
| `teach.goals` | `["read-3-1-1"]` | 6절 목표 |
| `teach.shiftKo` | `{ "before", "after" }` | 한 줄씩 |
| `teach.todayKo` · `teach.todayEn` | 한국어 줄 · 영어 문장 | 8절 |
| `teach.models[]` | `{ "en", "ko", "chips": [{ "text", "role" }], "lineKo", "picture"? }` | 5절 · 8절 · 9절 |
| `teach.together[]` | `{ "kind": "text", "type": "fact", "textEn", "prompt", "askRole", "choices", "answerNo", "highlight"?, "lineKo"?, "rightKo", "wrongKo" }` | 5절 |
| `teach.recap` | `{ "frameEn", "chips", "closeKo", "closeKoPracticed" }` | 8절 |
| `content.passage` · `content.targetWords` · `content.glossary` | 영어 · 낱말 id 목록 · `[{ "surface", "lemma", "meaningKo", "proper"? }]` | 3절 · 11절 |
| `content.questions[]` | `{ "kind": "text", "type": "fact", "prompt", "askRole", "options", "answerNo", "goal", "whyKo", "retryHighlight", "spare" }` | 5절. `explanationKo` 는 두지 않는다 |
| `spare` | `{ "kind": "text", "type": "fact", "textEn", "prompt", "askRole", "options", "answerNo", "whyKo" }` | 5절 |

연습 · 기회 표시 칸은 없다. `teach.together` 는 연습, 문제와 `spare` 는 기회다. 예시는 아래 승인 수업 하나다. 다른 칸에 문장 · 제목 · 장면을 옮기지 않는다.

### 승인 수업(단원 1 배정 1 · 변형 1, 글자 그대로 둔다)

요청자가 승인한 수업이다(C174 · C175 · C177, 표본 3판 · v4 · v5 정정). 2026-10-30 원본 파일 그대로 `pnpm seed:validate --areas reading,writing,speaking` 종료 0 을 확인했다. 이 덩이는 14절 붙이기 명령이 읽는다. 아래 두 표지 줄과 JSON 을 고치지 않는다. 정규화 해시는 호출 값으로 넘어온다.

<!-- 승인 수업 시작 -->
```json
{
 "kind": "assigned",
 "lessonNo": 1,
 "variant": 1,
 "revision": 1,
 "correction": 0,
 "generation": {
  "method": "generated",
  "model": "claude-opus-5-5",
  "effort": "xhigh",
  "briefHash": "9970145ead8982e7947311eb1682fd967d10bf49cab10ff9ab5077e8b81ff70e",
  "agentHash": "f3ecb56ec7831ad994c3a7ccdd7f8d101ef410352fe19b2840b976b112d3086d",
  "createdOn": "2026-10-29"
 },
 "title": "친구가 놀러 온 날",
 "newWords": [
  "eat",
  "drink",
  "go",
  "come",
  "wash"
 ],
 "unitWords": [
  "eat",
  "drink",
  "go",
  "come",
  "wash"
 ],
 "preview": [
  {
   "word": "eat",
   "meaningKo": "먹다",
   "example": "We eat cake."
  },
  {
   "word": "drink",
   "meaningKo": "마시다",
   "example": "I drink water."
  },
  {
   "word": "go",
   "meaningKo": "가다",
   "example": "We go to the shop."
  },
  {
   "word": "come",
   "meaningKo": "오다",
   "example": "Dan and Tess come to my room."
  },
  {
   "word": "wash",
   "meaningKo": "씻다",
   "example": "They wash the dog."
  }
 ],
 "teach": {
  "goals": [
   "read-3-1-1"
  ],
  "shiftKo": {
   "before": "I · we · they 가 섞인 짧은 글에서 누가 무엇을 하는지 가려 읽지 못한다",
   "after": "하는 일 말을 찾고 그 앞 · 뒤를 읽어, 처음 보는 짧은 글의 누가 · 무엇 · 어디 빈칸을 스스로 채운다"
  },
  "todayKo": "오늘은 글에서 누가 무엇을 하는지 찾아 읽어요.",
  "todayEn": "We eat lunch.",
  "models": [
   {
    "en": "We eat cake.",
    "ko": "우리는 케이크를 먹어.",
    "chips": [
     {
      "text": "We",
      "role": "who"
     },
     {
      "text": "eat",
      "role": "do"
     },
     {
      "text": "cake",
      "role": "what"
     }
    ],
    "lineKo": "하는 일 말을 찾아요. 앞은 누가, 뒤는 무엇이에요.",
    "picture": "cake"
   },
   {
    "en": "I wash my face. They wash the dog.",
    "ko": "나는 얼굴을 씻어. 걔네는 강아지를 씻어.",
    "chips": [
     {
      "text": "I",
      "role": "who"
     },
     {
      "text": "wash",
      "role": "do"
     },
     {
      "text": "my face",
      "role": "what"
     },
     {
      "text": "They",
      "role": "who"
     },
     {
      "text": "wash",
      "role": "do"
     },
     {
      "text": "the dog",
      "role": "what"
     }
    ],
    "lineKo": "wash 는 같아도 앞이 달라요. 누가인지 꼭 봐요.",
    "picture": "dog"
   },
   {
    "en": "We go to the shop.",
    "ko": "우리는 가게에 가.",
    "chips": [
     {
      "text": "We",
      "role": "who"
     },
     {
      "text": "go",
      "role": "do"
     },
     {
      "text": "to the shop",
      "role": "where"
     }
    ],
    "lineKo": "go · come 뒤에는 어디가 와요.",
    "picture": "shop"
   }
  ],
  "together": [
   {
    "kind": "text",
    "type": "fact",
    "textEn": "Dan and Tess come to my room. I eat a cookie.",
    "prompt": "___ come to my room.",
    "askRole": "who",
    "choices": [
     "Dan and Tess",
     "I"
    ],
    "answerNo": 1,
    "highlight": [
     "come"
    ],
    "lineKo": "come 을 찾았어요. 바로 앞을 골라 봐요.",
    "rightKo": "맞아요! come 앞에 Dan and Tess 가 있어요.",
    "wrongKo": "come 바로 앞을 다시 봐요."
   },
   {
    "kind": "text",
    "type": "fact",
    "textEn": "I eat rice. They eat apples.",
    "prompt": "They eat ___.",
    "askRole": "what",
    "choices": [
     "rice",
     "apples"
    ],
    "answerNo": 2,
    "highlight": [
     "They eat"
    ],
    "lineKo": "They 가 먹는 것을 골라 봐요.",
    "rightKo": "맞아요! They eat 뒤에 apples 가 있어요.",
    "wrongKo": "rice 는 I 가 먹어요. They 를 찾아봐요."
   }
  ],
  "recap": {
   "frameEn": "We eat lunch.",
   "chips": [
    {
     "text": "We",
     "role": "who"
    },
    {
     "text": "eat",
     "role": "do"
    },
    {
     "text": "lunch",
     "role": "what"
    }
   ],
   "closeKo": "이제 글에서 누가 무엇을 하는지 찾아 읽을 수 있어요.",
   "closeKoPracticed": "오늘은 누가 무엇을 하는지 찾아 읽기를 배우고 연습했어요."
  }
 },
 "content": {
  "passage": "I go home with Mom. I wash my hands. Ben and Meg come to my house. They are my friends. We eat lunch. I drink milk. They drink juice. We go to the lake. We play with a ball. I am very happy.",
  "targetWords": [
   "eat",
   "drink",
   "go",
   "come",
   "wash"
  ],
  "glossary": [
   {
    "surface": "go",
    "lemma": "go",
    "meaningKo": "가다"
   },
   {
    "surface": "home",
    "lemma": "home",
    "meaningKo": "집"
   },
   {
    "surface": "Mom",
    "lemma": "mom",
    "meaningKo": "엄마"
   },
   {
    "surface": "wash",
    "lemma": "wash",
    "meaningKo": "씻다"
   },
   {
    "surface": "hands",
    "lemma": "hand",
    "meaningKo": "손"
   },
   {
    "surface": "Ben",
    "lemma": "Ben",
    "meaningKo": "벤(사람 이름)",
    "proper": true
   },
   {
    "surface": "Meg",
    "lemma": "Meg",
    "meaningKo": "메그(사람 이름)",
    "proper": true
   },
   {
    "surface": "come",
    "lemma": "come",
    "meaningKo": "오다"
   },
   {
    "surface": "house",
    "lemma": "house",
    "meaningKo": "집"
   },
   {
    "surface": "friends",
    "lemma": "friend",
    "meaningKo": "친구"
   },
   {
    "surface": "eat",
    "lemma": "eat",
    "meaningKo": "먹다"
   },
   {
    "surface": "lunch",
    "lemma": "lunch",
    "meaningKo": "점심"
   },
   {
    "surface": "drink",
    "lemma": "drink",
    "meaningKo": "마시다"
   },
   {
    "surface": "milk",
    "lemma": "milk",
    "meaningKo": "우유"
   },
   {
    "surface": "juice",
    "lemma": "juice",
    "meaningKo": "주스"
   },
   {
    "surface": "lake",
    "lemma": "lake",
    "meaningKo": "호수"
   },
   {
    "surface": "play",
    "lemma": "play",
    "meaningKo": "놀다"
   },
   {
    "surface": "ball",
    "lemma": "ball",
    "meaningKo": "공"
   },
   {
    "surface": "very",
    "lemma": "very",
    "meaningKo": "아주"
   },
   {
    "surface": "happy",
    "lemma": "happy",
    "meaningKo": "행복한"
   },
   {
    "surface": "Dan",
    "lemma": "Dan",
    "meaningKo": "댄(사람 이름)",
    "proper": true
   },
   {
    "surface": "Tess",
    "lemma": "Tess",
    "meaningKo": "테스(사람 이름)",
    "proper": true
   },
   {
    "surface": "room",
    "lemma": "room",
    "meaningKo": "방"
   },
   {
    "surface": "cookie",
    "lemma": "cookie",
    "meaningKo": "쿠키"
   },
   {
    "surface": "rice",
    "lemma": "rice",
    "meaningKo": "밥"
   },
   {
    "surface": "apples",
    "lemma": "apple",
    "meaningKo": "사과"
   },
   {
    "surface": "shop",
    "lemma": "shop",
    "meaningKo": "가게"
   },
   {
    "surface": "cups",
    "lemma": "cup",
    "meaningKo": "컵"
   },
   {
    "surface": "car",
    "lemma": "car",
    "meaningKo": "자동차"
   },
   {
    "surface": "bank",
    "lemma": "bank",
    "meaningKo": "은행"
   },
   {
    "surface": "Dad",
    "lemma": "dad",
    "meaningKo": "아빠"
   }
  ],
  "questions": [
   {
    "kind": "text",
    "type": "fact",
    "prompt": "___ come to my house.",
    "askRole": "who",
    "options": [
     "Mom and Dad",
     "Ben and Meg",
     "Ted and Gus",
     "Momo and Max"
    ],
    "answerNo": 2,
    "goal": "read-3-1-1",
    "whyKo": "come 을 찾아요. 바로 앞에 Ben and Meg 가 있어요.",
    "retryHighlight": "Ben and Meg come to my house.",
    "spare": {
     "kind": "text",
     "type": "fact",
     "textEn": "Meg and I go to the shop. Ben and Dan come home.",
     "prompt": "___ come home.",
     "askRole": "who",
     "options": [
      "Ben and Dan",
      "Meg and I",
      "Mom and Dad",
      "Tess and Max"
     ],
     "answerNo": 1,
     "whyKo": "come 을 찾아요. 앞에 Ben and Dan 이 있어요."
    }
   },
   {
    "kind": "text",
    "type": "fact",
    "prompt": "They drink ___.",
    "askRole": "what",
    "options": [
     "milk",
     "water",
     "juice",
     "cake"
    ],
    "answerNo": 3,
    "goal": "read-3-1-1",
    "whyKo": "drink 가 두 번 나와요. They drink 뒤를 봐요.",
    "retryHighlight": "They drink juice.",
    "spare": {
     "kind": "text",
     "type": "fact",
     "textEn": "I wash the cups. They wash the car.",
     "prompt": "They wash the ___.",
     "askRole": "what",
     "options": [
      "cups",
      "car",
      "bike",
      "dog"
     ],
     "answerNo": 2,
     "whyKo": "wash 가 두 번 나와요. They wash 뒤를 봐요."
    }
   },
   {
    "kind": "text",
    "type": "fact",
    "prompt": "We go to the ___.",
    "askRole": "where",
    "options": [
     "lake",
     "shop",
     "bank",
     "room"
    ],
    "answerNo": 1,
    "goal": "read-3-1-1",
    "whyKo": "go 가 두 번 나와요. We go 뒤를 봐요.",
    "retryHighlight": "We go to the lake.",
    "spare": {
     "kind": "text",
     "type": "fact",
     "textEn": "Tess and I go to the bank. Mom and Dad go to the shop.",
     "prompt": "Mom and Dad go to the ___.",
     "askRole": "where",
     "options": [
      "bank",
      "lake",
      "shop",
      "house"
     ],
     "answerNo": 3,
     "whyKo": "go 가 두 번 나와요. Mom and Dad go 뒤를 봐요."
    }
   }
  ]
 }
}
```
<!-- 승인 수업 끝 -->

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말과 정규식(폭력 · 개인 정보 요구 · 연락처 꼴). 예: kill · gun · bomb · weapon · beer · wine · drunk · cigarette · drugs · stupid · idiot · dumb · shut up · hell · damn. drink 의 활용형 drunk 도 금지어라 쓰지 않는다.
- 개인 정보를 묻는 말(사는 곳 · 집 주소 · 전화번호 · 학교 이름 · 반 · 성 · 전체 이름 · 이메일 · 비밀번호)과 연락처 꼴.
- 메타 문장(`meta-sentences.json`): the child · the user · the student · the learner · I should · I will now · as an AI · system prompt · the card says 등. 이 목록은 AI 응답 검사용이고 시드 검증기는 수업 글에 걸지 않는다. 그래도 수업 글에 이 말투(지시문 · 자기 설명)를 쓰지 않는다.
- 문법 용어(`lists/grammar-terms.json`, 검증기 `grammar-term`): 선생님 줄과 칩 글에 아래 낱말을 쓰지 않는다. 낱말 앞 글자가 한글이면 걸리지 않으므로 합성어는 따로 들어 있다. 예외로 시작하는 보통 낱말은 걸리지 않는다. 아이가 아는 말(자음 · 모음 · 낱말 · 문장)과 앱 화면 말(대문자 · 마침표)은 쓴다.
  - 주어(예외: 주어진 · 주어요 · 주어서 · 주어야 · 주어도 · 주어라 · 주어지 · 주어져 · 주어졌 · 주어집) · 동사 · 목적어 · 형용사 · 부사(예외: 부사장) · 명사 · 대명사 · 관사 · 전치사 · 조동사 · be동사 · 단수 · 복수 · 인칭 · 시제 · 현재형 · 과거형 · 진행형 · 의문문 · 부정문 · 명령문 · 품사 · 일반동사 · 동사원형 · 현재진행 · 과거진행 · 현재완료 · 현재시제 · 과거시제 · 빈도부사 · 비교급 · 최상급 · 소유격 · 목적격 · 주격 · 동명사 · 부정사 · 현재분사 · 과거분사 · 관계대명사 · 관계부사 · 접속사 · 의문사 · 수동태 · 감탄문 · 평서문 · 어순 · 보어 · 수식어 · 타동사 · 자동사 · 규칙동사 · 불규칙 · 정관사 · 부정관사 · 미래시제 · 미래형 · 능동태 · 청유문 · 부가의문문 · 간접의문문 · 감탄사 · 가산명사 · 지시대명사 · 소유대명사 · 관계절 · 주절 · 종속절
- (제안) 무섭거나 다치는 장면(fire 는 '뜨거워요 · 조심'이 아니라 캠프 · 촛불처럼 다치지 않는 장면으로), 상표 · 실제 인물 · 종교 · 정치, 정답을 글 밖에서 흘리는 글.
- 설계 숫자를 글에 쓰지 않는다(예: '오늘 다섯 개 배워요').
- `{NAME}` · 실제 아이 이름 · 선생님 이름.

## 14. 스스로 확인과 검증 명령

파일을 다 쓴 뒤 먼저 승인 수업을 붙이고 해시를 대조한다(뿌리 폴더와 호출이 넘긴 승인 수업 해시를 넣는다). 해시가 다르면 브리프 파일을 고치지 않았는지 보고, 그래도 다르면 멈추고 보고한다.

```sh
python3 - <뿌리> <승인 수업 해시> <<'PY'
import json, hashlib, re, sys
root, want = sys.argv[1], sys.argv[2]
brief = open("seed/prompts/reading-3.md").read()
m = re.search(r"<!-- 승인 수업 시작 -->\s*```json\n(.*?)\n```\s*<!-- 승인 수업 끝 -->", brief, re.S)
fixed = json.loads(m.group(1))
h = hashlib.sha256(json.dumps(fixed, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
assert h == want, ("승인 수업 해시가 호출 값과 다르다", h)
p = f"{root}/lessons/reading/3/1.json"
d = json.load(open(p))
rest = [l for l in d["lessons"] if not (l["kind"] == "assigned" and l["lessonNo"] == 1 and l["variant"] == 1)]
d["lessons"] = [fixed] + rest
open(p, "w").write(json.dumps(d, ensure_ascii=False, indent=1))
print("붙임: 수업", len(d["lessons"]), "· 승인 수업 해시 같음")
PY
```

그다음 하나씩 확인한다.

1. 수업 26개(변형 2 × (정규 10 + 보강 3)), 첫 수업이 승인 수업이고 붙이기 명령의 해시가 같다. (kind, lessonNo, variant) 겹침 없음.
2. 모든 영어 문장이 7낱말 이하, 지문이 3절 낱말 수 안이고 일상 이야기다.
3. 배정 수업의 `newWords` · `preview` 가 배정표와 같고 새 단어가 지문에 나온다. preview 의 example 은 빈 글이다.
4. 모든 영어 글이 7절 범위 안이고, 지문 · 같이 해 보기 글 · 짝 글의 기능어 밖 낱말이 글로서리에 다 있다(이름은 proper).
5. 8절 꼴 밖의 형태가 없다(3인칭 -s · 명령문 · Wh 의문문 · There is · Let's · our · their · don't).
6. 문제 셋 · 같이 해 보기 · 짝이 모두 빈칸 하나 + askRole 이고, 보기가 빈칸에 넣어 문법이 맞으며 정답이 글로 하나만 맞다. 하나 이상의 문제가 같은 하는 일 말이 두 번 나오는 가려 읽기다.
7. 문제마다 goal · whyKo · retryHighlight(글 안의 답 문장, 정답 낱말을 품음) · spare 가 있고, 짝 글이 짧은 글 상한 안이다.
8. teach: 본보기 수 · 같이 해 보기 수가 설정값 안, 칩 role 이 맞고, 마무리 줄 둘이 있으며 closeKoPracticed 에 숙달 단정이 없다. teach.goals 첫 목표에 이어진 문제가 lesson.recap_min_evidence 개 이상이다.
9. 선생님 줄마다 글자 · 문장 상한 안, 문법 용어 · 선생님 이름 · {NAME} 없음. 오늘 배울 것 · 본보기 · 되짚기의 시간 합이 lesson.teach_seconds_max.1-3 안이다.
10. 혼자 문항 · 짝의 글이 본보기 · 같이 해 보기 글과 글자가 같지 않고, 인물 · 낱말 짝도 다르다. 짝의 빈칸 답 · 함정 낱말이 그 문항의 정답 · 함정 낱말과 같으면(뒤집은 꼴 포함) 같은 짝으로 본다. 짝끼리도 다르다. 승인 수업의 문장 · 제목 · 장면을 다시 쓰지 않았다.
11. 다지기 다섯에 단원 단어가 모두 다시 나오고, 보강 셋에 단원 단어마다 1번 이상 나온다(변형마다).
12. 변형 1 · 2 의 같은 칸끼리 새 단어 · 문항 수가 같고 todayKo · shiftKo 의 뜻이 같다. 제목 26개가 서로 다르다.
13. 인물: 중심 쌍은 Ben · Meg, 10절 사실 표와 어긋나지 않음, 이름 표 밖 이름 없음, 부르는 말 없음, 동물 인물은 먹기 · 마시기(물) · 가기 · 오기 · 놀기만, We 를 묻는 빈칸이면 글에 We 가 누구인지 쓰여 있음.
14. 13절 금지 목록에 걸리는 말이 없다.

검증 명령(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas reading --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="lessons/reading/3/<단원>.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("id",""), x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(이 파일의 칸 수 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수)를 그대로 적어 둔다. 보고의 '첫 검증'이고 S10 비교에 쓴다.
- 오류가 있으면 그 칸만 고치고 다시 검증한다. 고친 칸의 `generation.retries` 에 회차를 적는다. 고침은 `seed.max_retries` 회까지다. 승인 수업에 오류가 나면 고치지 말고 보고한다(승인 수업은 이 판의 검증기로 오류 0 이다).
- 경고(`unit-words-unlisted` · `relation-early-use` · `relation-not-reused` · `recap-evidence` · `slot-seconds` · 분포)도 고친다. 남기면 까닭을 보고한다. 단원 규격 파일의 `unit-goals` 경고(다른 단원 · 단계의 목표 없음)는 이 파일 밖이라 걸러져 나오지 않는다.
- `unchecked`(풀이 검사 안 됨)와 `empty`(빈 칸)는 이 단계의 일이 아니다.

## 15. 근거 한 줄

읽기 3단계는 짧은 일상 이야기를 읽고 누가 · 무엇 · 어디를 찾는 단계다. 2022 개정 영어과 3~4학년군 이해 성취기준 [4영01-04](소리와 철자의 관계를 이해하며 소리 내어 읽기) · [4영01-05](쉽고 간단한 단어 · 어구 · 문장의 의미 이해)에 기대고(정본 3.1 이 인용한 번호, 델타 spec 설계 2 의 확인 정도: 2차 자료 둘의 일치), 세부 정보 찾기는 한 걸음 위다(2026-10-15 결정). CEFR Pre-A1 읽기는 아주 짧고 단순한 글에서 낯익은 낱말 · 짧은 문장을 알아보는 수준이다. 그래서 하는 일 말을 단서로 찾는 법을 먼저 보이고, 문제는 빈칸 문장의 낱말을 글에서 찾는 꼴로 낸다.

## 16. 보고 꼴

마지막 답장(파일로 쓰지 않는다)에 이 차례로 쓴다.

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값>
파일: <뿌리>/lessons/reading/3/<단원>.json · 수업 <n>(승인 1 · 새로 <n> · 정규 <n> · 보강 <n>) · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
승인 수업: 붙이기 명령 결과(해시 같음 · 다름)
첫 검증: 칸 <n> · 오류 칸 <n> · 규칙별 <rule n, …> · 경고 <n>
고침: <회차마다 고친 칸 · 남은 오류>
보강 덮기: 변형마다 단원 단어 가운데 1번 이상 <n> · 2번 이상 <n>
선생님 말 추정: 수업마다 초(8절 셈): 가장 긴 수업 <n>초 · 평균 <n>초
자리별 추정: today · show · together · spare · recap: 가장 긴 수업의 초
짝: 채점 혼자 문항 <n> = 짝 <n>
인물: 이름이 나온 수업 n <n> · 그 가운데 Momo · Tori 수업 m <n> · 쓴 이름 · 중심 쌍 지킴(10절)
스스로 확인: 14절 각 줄 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 2 | 파일 안 수업 차례(승인 수업 → 변형 1 → 변형 2, 정규 → 보강) | 정본 · 검증기에 차례 규칙이 없다 |
| 5 | 본보기 셋의 구실(찾는 차례 · 가려 읽기 · 어디), 같이 해 보기 둘의 구실(누가 · 무엇 · 어디, 두 번 나오는 하는 일 말) | 표본 3판 R3~R7 꼴을 수업마다 옮긴 것 |
| 5 | 문제 셋이 누가 · 무엇 · 어디를 하나씩, 하나 이상은 가려 읽기 | 표본 Q1~Q3 꼴. 3.3 은 '누가 · 무엇 · 어디'만 정했다 |
| 7 | 쓸 수 있는 낱말을 1~2단계 + 열린 3단계 기능어 + 이 영역 배정된 단원 단어로 좁힘 | 3.4 는 3단계 범위 전체를 받는다. 아직 안 배운 낱말이 미리보기 없이 나오지 않게(표본 3판 기준) |
| 7 | 3단계 기능어 these · those 를 단원 2 부터 | 3.6 요소 표에 없다. There are 와 함께 복수로 여는 것이 자연스럽다 |
| 8 | 칩을 덧붙인 말(with Mom)에 달지 않음 | 칩 role 에 '함께'가 없다 |
| 10 | 중심 쌍을 읽기 Ben · Meg, 말하기 Dan · Tess 로 나눔 | 장부 L-8. 승인 수업이 이미 이렇게 나뉘어 있다 |
| 10 | 3단계 읽기는 인물이 글의 뼈대라 이름 수업 수 n 상한을 두지 않음(m 은 틀의 셈) | 틀 '셀 수 있는 기준'이 단계 브리프에 맡겼다 |
| 11 | 보강 1~3 이 다룰 단어 묶음 | 6.3 '몰아서 다룰 단원 어휘 묶음'의 나누는 법이 정본에 없다 |
