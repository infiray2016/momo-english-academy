# 생성 브리프 — 쓰기 3단계(`writing-3`)

이 파일은 쓰기 3단계 묶음의 프롬프트 판이다(정본 6.3). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 단원 하나의 수업 전부를 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 3단계는 가르치는 수업이다(수업마다 `teach` 칸, 13절 C169 · 델타 spec 설계 1~8). 틀 `_template.md` 의 '가르치는 수업 규칙'(R5~R16)을 이 단계 · 영역에 맞춰 옮겼다. 숫자와 규칙은 저장소 파일에서 옮겼고, 새 설정 키(`lesson.*` · `speech.*` · `seed.goals_required_levels`)는 이름으로만 적는다. 그 지금 값은 호출이 1절 '설정값 표'로 넘긴다. 정본에 없는 값은 '(제안)'으로 적고 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 그 영역 × 단계는 처음부터 다시 만든다(승인 수업은 그대로 둔다).

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 영역 · 단계 | `writing` · 3 · CEFR Pre-A1 · 구간 `1-3` |
| 틀 | `seed/prompts/_template.md`(가르치는 수업 규칙 R5~R16) |
| 만든 날 · 만든 이 | 2026-10-30 · 학습 설계자(가르치고 배우는 수업 plan 묶음 자-1) |
| 옮긴 곳 | `seed/level-specs.json` · `unit-specs.json`(3단계 단원 1 goals) · `settings.json`(키 이름) · `vocab.json` · `images.json` · `lists/forms.json` · `lists/forbidden.json` · `lists/meta-sentences.json` · `lists/grammar-terms.json` · `src/core/seed/schema/lesson.ts` · `check-lesson.ts` · `check-teach.ts` · `src/core/vocab/allocate.ts` · 델타 spec 설계 1~8 · 표본 3판(`.superpowers/sdd/2026-10-29-가르치고-배우는-수업/samples-l3u1.md`, v4 · v5 정정) · 정규 시드 `seed/lessons/writing/3/1.json` 의 승인 수업 · 13절 C64 · C84 · C169 · C170 · C174 · C175 · C177 · C182 · 장부 L-7 · L-8 · L-10 · L-22 |
| 이 판으로 만드는 것 | 단원 1 의 25수업. 승인 수업(배정 1 · 변형 1)은 글자 그대로 둔다. 단원 2~5 는 단원 규격에 목표(goals[])가 생긴 뒤 만든다(지금은 목표가 없어 검증기 goal 오류가 난다). 단원 5 는 질문 꼴(What · Where · Who)이 정해지지 않아 이 판으로 만들지 않는다 |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 단원 번호 | `1`(지금 만들 수 있는 단원은 1뿐, 0절) | 파일 이름, 6절에서 그 단원 찾기 |
| 뿌리 폴더 | `seed` 또는 비교용 폴더 | 쓸 파일 `<뿌리>/lessons/writing/3/<단원>.json` |
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
- `lesson.spares_per_session.writing`
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
3. 파일 하나 `{ "area": "writing", "level": 3, "unit": <단원>, "lessons": [ … ] }` 에 새 수업 25개를 넣는다. 승인 수업 자리는 비워 두어도 된다. 14절 붙이기 명령이 첫 자리에 넣는다.
4. 14절 붙이기 명령 → 스스로 확인 → 검증 명령 → 오류 칸 고침 → 16절 보고.

## 3. 단계 규격(`level-specs` writing 3)

| 칸 | 값 |
|---|---|
| can-do | 섞인 단어 카드를 바른 차례로 놓고 첫 글자를 대문자로 바꾸고 마침표를 붙여 3~5단어 문장 5개를 조립할 수 있다 |
| CEFR · 목표 시간 | Pre-A1 · 6분 |
| 문장 길이 상한 `sentenceMaxWords` | 7낱말(조립 문장은 아래 분량이 더 좁다) |
| 분량 `amount` | 문항 5개, 모두 `assemble-sentence`, 문장마다 3~5낱말 |

정본 3.3 쓰기 단계표 3단계 행: 과제 '섞인 단어 카드를 순서대로 놓아 문장 만들기(dogs / i / like / . → I like dogs.). 카드는 모두 소문자로 주고 아이가 첫 글자를 대문자로 바꾸며, 마침표 카드를 따로 둔다' · 분량 '문장 5개(3~5단어)' · 입력 '카드, 앱 안 영문 자판' · 6분. 쓰기 1~3단계는 고르기 · 베끼기 · 조립이고 아이가 문장을 지어내지 않는다(2026-10-15 결정). 틀리면 까닭별 '왜' 한 줄 → 색 칸을 켜고 다시 → 두 번째 틀림에 정답이다(C170 (9)).

**단원 1 · 2 낱말 맞바꿈(컨트롤러 잠정 결정, 2026-10-30 자-1 열린 질문 W-1).** 단원 1 의 학습 요소 '주어 + be + 형용사'에 들어가지 않던 동사 일곱(cut · paint · fix · carry · pick · drop · hold)을 단원 2(주어 + 동사 + 목적어)의 동사 아닌 낱말 일곱(high · low · large · far · road · bridge · train)과 맞바꿨다. 3단계 어휘 범위는 그대로이고 단원 사이 이동만 했으며, 승인 수업의 낱말은 단원 1 에 그대로 있다. 요청자가 첫 묶음 표본 검토 때 본다. 6절 표는 맞바꾼 뒤의 단원 규격이다.

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
| `lesson.spares_per_session.writing` | 세션에 내는 짝 수의 상한(앱이 자른다. 시드에는 채점 혼자 문항마다 짝 하나를 모두 둔다) |
| `lesson.recap_min_evidence` · `lesson.recap_can_ratio` | 되짚기 마무리 줄 고르기(8절). teach.goals 첫 목표에 이어진 혼자 문항이 하한보다 적으면 경고 `recap-evidence` |
| `speech.speak_chars_per_second` · `speech.speak_chars_per_second_ko` | 시간 합 셈의 영문 · 한글 빠르기(글자/초) |
| `seed.goals_required_levels` | 목표가 반드시 있어야 하는 단계. 3단계가 들어 있어 teach.goals · 문항 goal 이 비면 오류다 |

## 5. 수업 구성(여섯 자리, 델타 spec 설계 1 · 2 · 표본 2.3)

세션 차례: 오늘 배울 것 → 보여 주기(새 단어 다섯 한 화면 → 본보기) → 같이 해 보기 → 혼자 해 보기(조립 문장 다섯, 틀리면 '왜' → 같은 문제 다시) → 다른 예시에서 스스로(첫 시도에 틀린 문장의 짝을 모아서) → 되짚기(결과 첫머리). 채점은 늘 앱이 한다(AI 없음). 앱은 카드 차례 · 첫 글자 대문자 · 마침표 자리를 정답과 견주고, 틀린 까닭을 규칙으로 가른다(차례가 다르면 시드 `whyKo`, 차례는 맞고 첫 글자만 소문자면 대문자 문구, 마침표 자리만 다르면 마침표 문구다. 대문자 · 마침표 문구는 앱 몫이라 시드에 없다).

**쓰기 방법과 까닭(설계 2, 승인됨).** 가르치는 것: '무엇이 어때요'를 무엇 → is → 어때요 → 마침표 차례로 놓고 첫 글자는 대문자로 바꾼다. 2단계에서 놓던 어구(the big classroom)와 낱말은 같아도 차례가 다르다는 것을 보인다. 까닭: 쓰기는 글자로 남는 꼴을 만드는 일이라 칸의 차례와 문장의 시작 · 끝 표시를 가르친다. 아이는 주어진 카드만 놓는다.

| 자리 · 활동 | 칸 | 수 · 길이 · 꼴 |
|---|---|---|
| 0 머리 | `teach.goals` · `teach.shiftKo` | goals 는 `["write-3-1-1"]`. shiftKo 는 before · after 한 줄씩, 변형끼리 뜻이 같다 |
| 1 오늘 배울 것 | `teach.todayKo` · `teach.todayEn` | todayKo 는 이 수업 틀을 놓는 법 한 줄. todayEn 은 이 수업 틀 문장 하나 |
| 2 새 단어 | `preview` | `newWords` 와 같은 낱말 모음. `example` 은 빈 글 `""`. 낱말이 아는 두 낱말로 쪼개지면(bed·room · bath·room) `parts` 에 둘을 적는다(1~2단계 낱말일 때만) |
| 2 본보기 | `teach.models[]` | `lesson.models_per_lesson` 범위(승인 수업은 셋). 칸마다 `en`(정답 꼴 문장) · `ko`(반말 뜻) · `chips`(thing · is · how · end, 8절) · `lineKo` · `fromEn`(선택). (제안) 첫째는 `fromEn` 에 2단계 어구(같은 낱말, 소문자 · 마침표 없음, 예 `the big classroom`)를 두어 어구 → 문장 바꾸기를 보이고, 둘째는 `fromEn` 에 소문자 · 마침표 없는 같은 꼴 문장을 두어 대문자 단추 · 마침표 카드를 보이며, 셋째는 다른 '무엇'(my · it 으로 시작)으로 같은 차례를 보인다 |
| 3 같이 해 보기 | `teach.together[]` | `lesson.together_items.1-3` 개. 조립 문항 꼴(`type: "assemble-sentence"` · `cards` · `meaningKo` · `accepted`)에 아래 칸을 더한다. 첫째(차례): `filled { cards, capital: true }` 는 정답 차례의 카드에서 아이가 놓을 칸만 `null` 로 둔 것, `slot` 은 null 칸의 차례 번호 목록(1부터), `choices` 는 남은 카드다. 빈칸 수 = 남은 카드 수이고, 남은 카드가 모든 빈칸의 정답 카드를 다 담으며, 정답 차례와 다르게 섞는다(예 남은 cold · is 를 빈칸 4 · 5 에, C174 (3)). 아이가 정하는 것은 차례 하나다. 둘째(대문자): `filled { cards: 정답 차례 전부, capital: false }`, `slot: "capital"`, `choices` 없음. 둘 다 `lineKo` · `rightKo` · `wrongKo` |
| 4 혼자 해 보기 | `content` = `{ "shape": "items", "items": [ … ] }` | 문장 다섯, 모두 `assemble-sentence`. 칸마다 `cards` · `meaningKo` · `accepted` · `goal`(`"write-3-1-1"`) · `whyKo` · `spare` |
| 5 짝 | 문항마다 `spare` | 같은 `type`, 다른 낱말 짝의 `cards` · `meaningKo` · `accepted` · `whyKo` |
| 6 되짚기 | `teach.recap` | `frameEn`(그 수업 틀 문장) · `chips` · `closeKo` · `closeKoPracticed` |

조립 카드 규칙(정본 3.3 · C73 · C84 · 장부 L-10):

- 카드는 정답 문장의 낱말과 마침표를 한 장씩 모은 것이다. 모두 소문자이고(첫 글자는 아이가 대문자 단추로 바꾼다), 마침표는 `"."` 카드 하나로 따로 둔다. 문장 부호를 낱말 카드에 붙이지 않는다(검증기 `writing-cards`).
- 두 낱말 단원 단어는 카드 두 장이다(`living room` → `living` · `room`). 카드 모음은 첫 허용 정답의 낱말 · 문장 부호와 같아야 한다(검증기 `answer`).
- 이름 · I 가 든 문장을 두지 않는다. 검증기는 C84 대로 I · 인물 이름 카드(대문자)를 받지만, 첫 묶음에서는 단순하게 두기로 했다(장부 L-30, 다음 판에서 푼다). 그래서 'I am …' 문장은 이 판에 없다.
- `cards` 의 차례는 정답 차례와 같지 않게 섞는다. (제안) 다섯 문장 가운데 하나 이상은 카드를 2단계 어구 차례(`the · big · restaurant · is · .`)로 두어 어구 → 문장 바꾸기를 잰다(승인 수업 H4).
- `accepted` 는 정답 문장 하나(대문자 시작 · 마침표 끝)다. 다른 차례로도 맞는 문장이 되는 카드 모음(`the bed is big` ↔ `is the bed big` 은 마침표 카드가 막는다)을 두지 않는다.
- `meaningKo` 는 그 문장의 반말 뜻이고 화면에서 과제 글로 보인다(예 `식당이 커.`).
- `whyKo` 는 차례가 틀렸을 때의 한 줄이다(8절). 대문자 · 마침표의 '왜'는 쓰지 않는다.
- 문장은 3~5낱말이고 한 수업에 문장 틀 하나다(11절).

## 6. 단원 규격과 배정표(`unit-specs` · 배정 함수)

배정표는 앱의 배정 함수가 단원 단어를 차례대로 k(5)개씩 나눈 결과다. `newWords` 는 표와 낱말 모음이 같아야 한다(검증기 `vocab-allocation`). 쓰기는 새 단어를 혼자 문항(조립 문장)에 하나 이상 넣는다(단어장 '씀'은 문항의 답 낱말로 센다). 지금 만들 수 있는 단원은 1 뿐이다(0절). 단원 2~5 는 참고로 싣는다.

### 단원 1 — 방과 교실 · 학습 요소 '주어 + be + 형용사'

- 단원 단어 25개(배정 차례 그대로): classroom, bedroom, bathroom, living room, restaurant, wall, floor, corner, side, front, bottom, middle, child, dark, bright, round, soft, hard, high, low, large, far, road, bridge, train
- 그림: 3단계 단원 단어는 그림 보기 · 본보기 picture 에 쓰지 않는다(9절).
- 단원 목표(단원 규격 goals[], 평가 spec 4판 2절 꼴):

| id | 목표 글(ko) | core | tasks | home | needs | accept |
|---|---|---|---|---|---|---|
| `write-3-1-1` | 섞인 낱말 카드를 차례대로 놓고 첫 글자 대문자와 마침표를 붙여 무엇이 어떤지 나타내는 문장을 완성할 수 있다 | 문장 꼴 바르게 쓰기 | assemble-sentence | 낱말 카드 | form | correct |

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | classroom(교실) · bedroom(침실) · bathroom(욕실, 화장실) · living room(거실) · restaurant(식당) |
| 2 | assigned | wall(벽) · floor(바닥, 층) · corner(구석, 모퉁이) · side(옆, 쪽) · front(앞) |
| 3 | assigned | bottom(바닥, 밑) · middle(가운데) · child(아이) · dark(어두운) · bright(밝은) |
| 4 | assigned | round(둥근) · soft(부드러운) · hard(단단한, 열심히) · high(높은, 높이) · low(낮은) |
| 5 | assigned | large(큰) · far(먼, 멀리) · road(길, 도로) · bridge(다리) · train(기차) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 2 — 내가 하는 일 · 학습 요소 '주어 + 동사 + 목적어'

- 단원 단어 25개(배정 차례 그대로): eat, drink, go, come, wash, sleep, study, learn, watch, listen, look, see, make, hold, taxi, airplane, subway, drop, pick, way, carry, cut, paint, fix, back
- 그림: 3단계 단원 단어는 그림 보기 · 본보기 picture 에 쓰지 않는다(9절).
- 단원 목표: 없음. 단원 규격에 goals[] 가 생기기 전에는 이 단원을 만들지 않는다(검증기 goal 오류, seed.goals_required_levels).

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | eat(먹다) · drink(마시다, 음료) · go(가다) · come(오다) · wash(씻다) |
| 2 | assigned | sleep(자다) · study(공부하다) · learn(배우다) · watch(보다, 손목시계) · listen(듣다) |
| 3 | assigned | look(보다) · see(보다, 보이다) · make(만들다) · hold(잡다, 들다) · taxi(택시) |
| 4 | assigned | airplane(비행기) · subway(지하철) · drop(떨어뜨리다, 방울) · pick(고르다, 따다) · way(길, 방법) |
| 5 | assigned | carry(나르다, 들고 있다) · cut(자르다) · paint(칠하다, 물감) · fix(고치다) · back(뒤로, 등) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 3 — 문장 부호 놀이 · 학습 요소 '대문자 · 마침표 · 물음표'

- 단원 단어 25개(배정 차례 그대로): say, talk, ask, answer, meet, live, find, bring, let, age, birthday, question, number, sky, sea, cloud, rain, snow, wind, river, mountain, beach, grass, forest, air
- 그림: 3단계 단원 단어는 그림 보기 · 본보기 picture 에 쓰지 않는다(9절).
- 단원 목표: 없음. 단원 규격에 goals[] 가 생기기 전에는 이 단원을 만들지 않는다(검증기 goal 오류, seed.goals_required_levels).

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | say(말하다) · talk(이야기하다) · ask(묻다) · answer(대답하다, 답) · meet(만나다) |
| 2 | assigned | live(살다) · find(찾다) · bring(가져오다) · let(~하게 하다(Let's ~ 하자)) · age(나이) |
| 3 | assigned | birthday(생일) · question(질문) · number(숫자, 번호) · sky(하늘) · sea(바다) |
| 4 | assigned | cloud(구름) · rain(비, 비가 오다) · snow(눈, 눈이 오다) · wind(바람) · river(강) |
| 5 | assigned | mountain(산) · beach(해변) · grass(풀, 잔디) · forest(숲) · air(공기) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 4 — 우리 동네에 있는 것 · 학습 요소 'There is ~'

- 단원 단어 25개(배정 차례 그대로): school, park, zoo, farm, store, market, library, hospital, garden, playground, street, town, city, squirrel, puzzle, block, balloon, soup, fire, end, safe, quick, move, push, pull
- 그림: 3단계 단원 단어는 그림 보기 · 본보기 picture 에 쓰지 않는다(9절).
- 단원 목표: 없음. 단원 규격에 goals[] 가 생기기 전에는 이 단원을 만들지 않는다(검증기 goal 오류, seed.goals_required_levels).

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | school(학교) · park(공원) · zoo(동물원) · farm(농장) · store(가게) |
| 2 | assigned | market(시장) · library(도서관) · hospital(병원) · garden(정원) · playground(놀이터) |
| 3 | assigned | street(거리) · town((작은) 도시, 동네) · city(도시) · squirrel(다람쥐) · puzzle(퍼즐) |
| 4 | assigned | block(블록, 덩어리) · balloon(풍선) · soup(수프, 국) · fire(불) · end(끝) |
| 5 | assigned | safe(안전한) · quick(빠른) · move(움직이다, 옮기다) · push(밀다) · pull(당기다) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 5 — 나는 할 수 있어 · 학습 요소 'can 문장'

- 단원 단어 25개(배정 차례 그대로): open, close, sit, stand, stop, wait, put, take, give, get, clean, turn, left, basket, eraser, ruler, crayon, scissors, glue, notebook, textbook, paper, picture, bottle, card
- 그림: 3단계 단원 단어는 그림 보기 · 본보기 picture 에 쓰지 않는다(9절).
- 단원 목표: 없음. 단원 규격에 goals[] 가 생기기 전에는 이 단원을 만들지 않는다(검증기 goal 오류, seed.goals_required_levels).

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | open(열다, 열린) · close(닫다) · sit(앉다) · stand(서다) · stop(멈추다) |
| 2 | assigned | wait(기다리다) · put(놓다, 넣다) · take(가지고 가다, 타다) · give(주다) · get(받다, 가져오다) |
| 3 | assigned | clean(청소하다, 깨끗한) · turn(돌다, 차례) · left(왼쪽, 왼쪽의) · basket(바구니) · eraser(지우개) |
| 4 | assigned | ruler(자) · crayon(크레용) · scissors(가위) · glue(풀) · notebook(공책) |
| 5 | assigned | textbook(교과서) · paper(종이) · picture(그림, 사진) · bottle(병) · card(카드) |
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

흔하지만 쓰지 않는 낱말(괄호는 vocab 단계): school(3) · park(3) · zoo(3) · morning(4) · breakfast(4) · dinner(4) · bread(4) · day(4) · every(4) · together(4) · too(4) · then(7) · after(4) · before(4) · class(4) · kitchen(4) · warm(4) · quiet(5) · our(4) · their(4) · them(5) · us(5) · clean(3) · sit(3) · stand(3) · open(3) · close(3) · sleep(3) · study(3) · watch(3) · listen(3) · look(3) · see(3) · make(3) · today(4) · always(5) · but(5) · so(4) · some(6) · because(6).

**1~2단계 기능어 44개**(글로서리에 넣지 않는다): `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 [am, is, are, was, were, been, being] · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) [does, did, done, doing] · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의 · `all` 모든, 모두 · `at` ~에(서), ~을(보다) · `can` ~할 수 있다 · `down` 아래로 · `for` ~을 위해, ~을 위한 · `from` ~에서, ~로부터 · `he` 그는 · `of` ~의 · `or` 또는 · `out` 밖으로, 밖에 · `she` 그녀는 · `with` ~와 함께, ~로

**3단계 기능어**(이 영역에서 열리는 단원):

| 낱말 | 뜻 | 쓸 수 있는 때 |
|---|---|---|
| `behind` | ~ 뒤에 | 쓰지 않는다(제안, 쓰기 3단계 요소 밖) |
| `between` | ~ 사이에 | 쓰지 않는다(제안, 쓰기 3단계 요소 밖) |
| `in front of` | ~ 앞에 | 쓰지 않는다(제안, 쓰기 3단계 요소 밖) |
| `near` | ~ 가까이에 | 쓰지 않는다(제안, 쓰기 3단계 요소 밖) |
| `next to` | ~ 옆에 | 쓰지 않는다(제안, 쓰기 3단계 요소 밖) |
| `off` | 떨어져, 벗어 | 쓰지 않는다(제안, 쓰기 3단계 요소 밖) |
| `there` | 거기에, (There is) ~이 있다 | 단원 4 부터 |
| `these` | 이것들, 이 | 쓰지 않는다(제안, 쓰기 3단계 요소 밖) |
| `they` | 그들은, 그것들은 | 단원 1 부터 |
| `those` | 저것들, 저 | 쓰지 않는다(제안, 쓰기 3단계 요소 밖) |
| `under` | ~ 아래에 | 쓰지 않는다(제안, 쓰기 3단계 요소 밖) |
| `we` | 우리는 | 단원 1 부터 |
| `where` | 어디에 | 쓰지 않는다(제안, 쓰기 3단계 요소 밖) |
| `who` | 누구 | 쓰지 않는다(제안, 쓰기 3단계 요소 밖) |

**1단계 내용어 151개**: `ant` 개미 [ants] · `apple` 사과 [apples] · `arm` 팔 [arms] · `bag` 가방 [bags] · `ball` 공 [balls] · `banana` 바나나 [bananas] · `bank` 은행 [banks] · `bath` 목욕, 욕조 [baths] · `bear` 곰 [bears] · `bed` 침대 [beds] · `bell` 종 [bells] · `big` 큰 [bigger, biggest] · `bike` 자전거 [bikes] · `bird` 새 [birds] · `black` 검은, 검은색 [blacks] · `blue` 파란, 파란색 [blues] · `book` 책 [books] · `box` 상자 [boxes] · `brush` 솔, 붓 [brushes, brushed, brushing] · `bus` 버스 [buses] · `cake` 케이크 [cakes] · `candy` 사탕 [candies] · `cap` (챙 달린) 모자 [caps] · `car` 자동차 [cars] · `cat` 고양이 [cats] · `chair` 의자 [chairs] · `cheese` 치즈 [cheeses] · `chicken` 닭, 닭고기 [chickens] · `clock` 시계 [clocks] · `color` 색, 색깔 [colors] · `cookie` 쿠키, 과자 [cookies] · `cow` 소 [cows] · `cup` 컵 [cups] · `cute` 귀여운 [cuter, cutest] · `desk` 책상 [desks] · `dish` 접시, 요리 [dishes] · `dog` 개 [dogs] · `doll` 인형 [dolls] · `door` 문 [doors] · `drum` 북, 드럼 [drums] · `duck` 오리 [ducks] · `ear` 귀 [ears] · `egg` 달걀 [eggs] · `eight` 8, 여덟 · `elephant` 코끼리 [elephants] · `eye` 눈 [eyes] · `face` 얼굴 [faces] · `fan` 선풍기, 부채 [fans] · `fish` 물고기 · `five` 5, 다섯 · `flower` 꽃 [flowers] · `fork` 포크 [forks] · `four` 4, 넷 · `fox` 여우 [foxes] · `frog` 개구리 [frogs] · `game` 놀이, 게임 [games] · `grape` 포도 [grapes] · `green` 초록의, 초록색 [greens] · `guitar` 기타 [guitars] · `hand` 손 [hands] · `hat` 모자 [hats] · `home` 집 [homes] · `horse` 말 [horses] · `hot` 뜨거운, 더운 [hotter, hottest] · `insect` 곤충 [insects] · `jacket` 재킷, 웃옷 [jackets] · `jam` 잼 [jams] · `juice` 주스 · `key` 열쇠 [keys] · `king` 왕 [kings] · `kite` 연 [kites] · `lake` 호수 [lakes] · `lamp` 램프, 전등 [lamps] · `leg` 다리 [legs] · `like` 좋아하다 [likes, liked, liking] · `lion` 사자 [lions] · `little` 작은, 어린 · `long` 긴 [longer, longest] · `lunch` 점심 · `map` 지도 [maps] · `milk` 우유 · `monkey` 원숭이 [monkeys] · `mouth` 입 [mouths] · `name` 이름 [names] · `neck` 목 [necks] · `nice` 좋은, 멋진 [nicer, nicest] · `nine` 9, 아홉 · `nose` 코 [noses] · `nurse` 간호사 [nurses] · `octopus` 문어 [octopuses] · `old` ~살의, 늙은 [older, oldest] · `one` 1, 하나 · `orange` 오렌지, 주황색 [oranges] · `pen` 펜 [pens] · `pencil` 연필 [pencils] · `piano` 피아노 [pianos] · `pig` 돼지 [pigs] · `pink` 분홍의, 분홍색 [pinks] · `pizza` 피자 [pizzas] · `plane` 비행기 [planes] · `pot` 냄비, 화분 [pots] · `puppy` 강아지 [puppies] · `queen` 여왕 [queens] · `rabbit` 토끼 [rabbits] · `red` 빨간, 빨간색 [reds] · `rice` 밥, 쌀 · `ring` 반지, 울리다 [rings, rang, rung, ringing] · `robot` 로봇 [robots] · `rock` 바위, 돌 [rocks] · `rose` 장미 [roses] · `sand` 모래 · `seven` 7, 일곱 · `sheep` 양 · `shell` 조개껍데기 [shells] · `ship` 배 [ships] · `shirt` 셔츠 [shirts] · `shoe` 신발 [shoes] · `shop` 가게, 쇼핑하다 [shops, shopped, shopping] · `short` 짧은, 키가 작은 [shorter, shortest] · `six` 6, 여섯 · `small` 작은 [smaller, smallest] · `smile` 미소, 웃다 [smiles, smiled, smiling] · `snack` 간식 [snacks] · `snake` 뱀 [snakes] · `sock` 양말 [socks] · `song` 노래 [songs] · `star` 별 [stars] · `sun` 해, 태양 [suns] · `swing` 그네, 흔들다 [swings, swung, swinging] · `tall` 키가 큰, 높은 [taller, tallest] · `ten` 10, 열 · `tent` 텐트 [tents] · `thank` 고마워하다 [thanks, thanked, thanking] · `thick` 두꺼운 [thicker, thickest] · `thin` 얇은, 마른 [thinner, thinnest] · `three` 3, 셋 · `tiger` 호랑이 [tigers] · `tooth` 이, 이빨 [teeth] · `top` 팽이, 꼭대기 [tops] · `toy` 장난감 [toys] · `tree` 나무 [trees] · `truck` 트럭 [trucks] · `two` 2, 둘 · `umbrella` 우산 [umbrellas] · `violin` 바이올린 [violins] · `white` 하얀, 흰색 [whites] · `window` 창문 [windows] · `wing` 날개 [wings] · `yellow` 노란, 노란색 [yellows] · `yo-yo` 요요 [yo-yos] · `zebra` 얼룩말 [zebras]

**2단계 내용어 125개**: `angry` 화난 [angrier, angriest] · `animal` 동물 [animals] · `aunt` 이모, 고모, 숙모 [aunts] · `baby` 아기 [babies] · `bad` 나쁜 [worse, worst] · `badminton` 배드민턴 · `baseball` 야구 · `basketball` 농구 · `beautiful` 아름다운 · `boy` 남자아이 [boys] · `brother` 형, 오빠, 남동생 [brothers] · `busy` 바쁜 [busier, busiest] · `catch` 잡다 [catches, caught, catching] · `chocolate` 초콜릿 [chocolates] · `climb` 오르다 [climbs, climbed, climbing] · `coat` 외투, 코트 [coats] · `cold` 추운, 차가운 [colder, coldest] · `computer` 컴퓨터 [computers] · `cook` 요리하다, 요리사 [cooks, cooked, cooking] · `cool` 시원한, 멋진 [cooler, coolest] · `corn` 옥수수 · `cousin` 사촌 [cousins] · `dad` 아빠 [dads] · `dance` 춤추다, 춤 [dances, danced, dancing] · `doctor` 의사 [doctors] · `dolphin` 돌고래 [dolphins] · `draw` 그리다 [draws, drew, drawn, drawing] · `dress` 드레스, 원피스 [dresses] · `family` 가족 [families] · `farmer` 농부 [farmers] · `fast` 빠른, 빨리 [faster, fastest] · `father` 아버지 [fathers] · `fine` 괜찮은, 좋은 · `finger` 손가락 [fingers] · `fly` 날다 [flies, flew, flown, flying] · `food` 음식 [foods] · `foot` 발 [feet] · `friend` 친구 [friends] · `fruit` 과일 [fruits] · `fun` 재미, 재미있는 · `funny` 웃기는, 재미있는 [funnier, funniest] · `gift` 선물 [gifts] · `giraffe` 기린 [giraffes] · `girl` 여자아이 [girls] · `glad` 기쁜 · `glasses` 안경 · `goat` 염소 [goats] · `good` 좋은, 착한 [better, best] · `grandfather` 할아버지 [grandfathers] · `grandmother` 할머니 [grandmothers] · `great` 아주 좋은, 훌륭한 [greater, greatest] · `hair` 머리카락 [hairs] · `hamburger` 햄버거 [hamburgers] · `happy` 행복한, 기쁜 [happier, happiest] · `have` 가지고 있다 [has, had, having] · `head` 머리 [heads] · `help` 돕다 [helps, helped, helping] · `here` 여기에 · `house` 집 [houses] · `hungry` 배고픈 [hungrier, hungriest] · `ice cream` 아이스크림 [ice creams] · `jeans` 청바지 · `jump` 뛰다, 점프하다 [jumps, jumped, jumping] · `kick` 차다 [kicks, kicked, kicking] · `kind` 친절한 [kinder, kindest] · `knee` 무릎 [knees] · `know` 알다 [knows, knew, known, knowing] · `man` 남자 [men] · `mom` 엄마 [moms] · `mother` 어머니 [mothers] · `music` 음악 · `need` 필요하다 [needs, needed, needing] · `new` 새, 새로운 [newer, newest] · `now` 지금 · `pants` 바지 · `penguin` 펭귄 [penguins] · `pet` 반려동물 [pets] · `phone` 전화(기) [phones] · `play` 놀다, (운동 · 악기를) 하다 [plays, played, playing] · `police` 경찰 · `potato` 감자 [potatoes] · `pretty` 예쁜 [prettier, prettiest] · `read` 읽다 [reads, reading] · `ready` 준비된 · `really` 정말 · `ride` 타다 [rides, rode, ridden, riding] · `room` 방 [rooms] · `run` 달리다 [runs, ran, running] · `sad` 슬픈 [sadder, saddest] · `sandwich` 샌드위치 [sandwiches] · `scarf` 목도리 [scarves] · `shoulder` 어깨 [shoulders] · `sick` 아픈 [sicker, sickest] · `sing` 노래하다 [sings, sang, sung, singing] · `sister` 누나, 언니, 여동생 [sisters] · `skate` 스케이트를 타다 [skates, skated, skating] · `ski` 스키를 타다 [skis, skied, skiing] · `skirt` 치마 [skirts] · `sleepy` 졸린 [sleepier, sleepiest] · `slow` 느린 [slower, slowest] · `smart` 똑똑한 [smarter, smartest] · `soccer` 축구 · `sorry` 미안한 · `strawberry` 딸기 [strawberries] · `strong` 힘센, 강한 [stronger, strongest] · `student` 학생 [students] · `sweater` 스웨터 [sweaters] · `swim` 수영하다 [swims, swam, swum, swimming] · `table` 탁자, 식탁 [tables] · `teacher` 선생님 [teachers] · `tennis` 테니스 · `thirsty` 목마른 [thirstier, thirstiest] · `throw` 던지다 [throws, threw, thrown, throwing] · `tired` 피곤한 · `toe` 발가락 [toes] · `turtle` 거북 [turtles] · `uncle` 삼촌, 이모부, 고모부 [uncles] · `very` 아주, 매우 · `walk` 걷다, 산책 [walks, walked, walking] · `want` 원하다 [wants, wanted, wanting] · `water` 물 · `whale` 고래 [whales] · `woman` 여자 [women] · `write` 쓰다 [writes, wrote, written, writing] · `young` 어린, 젊은 [younger, youngest]

**이 영역 3단계 단원 단어**(6절 배정 차례):

- **쓰기 3단계 단원 1 (방과 교실)**: `classroom` 교실 [classrooms] · `bedroom` 침실 [bedrooms] · `bathroom` 욕실, 화장실 [bathrooms] · `living room` 거실 [living rooms] · `restaurant` 식당 [restaurants] · `wall` 벽 [walls] · `floor` 바닥, 층 [floors] · `corner` 구석, 모퉁이 [corners] · `side` 옆, 쪽 [sides] · `front` 앞 [fronts] · `bottom` 바닥, 밑 [bottoms] · `middle` 가운데 [middles] · `child` 아이 [children] · `dark` 어두운 [darker, darkest] · `bright` 밝은 [brighter, brightest] · `round` 둥근 [rounder, roundest] · `soft` 부드러운 [softer, softest] · `hard` 단단한, 열심히 [harder, hardest] · `high` 높은, 높이 [higher, highest] · `low` 낮은 [lower, lowest] · `large` 큰 [larger, largest] · `far` 먼, 멀리 [farther, farthest] · `road` 길, 도로 [roads] · `bridge` 다리 [bridges] · `train` 기차 [trains]
- **쓰기 3단계 단원 2 (내가 하는 일)**: `eat` 먹다 [eats, ate, eaten, eating] · `drink` 마시다, 음료 [drinks, drank, drunk, drinking] · `go` 가다 [goes, went, gone, going] · `come` 오다 [comes, came, coming] · `wash` 씻다 [washes, washed, washing] · `sleep` 자다 [sleeps, slept, sleeping] · `study` 공부하다 [studies, studied, studying] · `learn` 배우다 [learns, learned, learning] · `watch` 보다, 손목시계 [watches, watched, watching] · `listen` 듣다 [listens, listened, listening] · `look` 보다 [looks, looked, looking] · `see` 보다, 보이다 [sees, saw, seen, seeing] · `make` 만들다 [makes, made, making] · `hold` 잡다, 들다 [holds, held, holding] · `taxi` 택시 [taxis] · `airplane` 비행기 [airplanes] · `subway` 지하철 [subways] · `drop` 떨어뜨리다, 방울 [drops, dropped, dropping] · `pick` 고르다, 따다 [picks, picked, picking] · `way` 길, 방법 [ways] · `carry` 나르다, 들고 있다 [carries, carried, carrying] · `cut` 자르다 [cuts, cutting] · `paint` 칠하다, 물감 [paints, painted, painting] · `fix` 고치다 [fixes, fixed, fixing] · `back` 뒤로, 등 [backs]
- **쓰기 3단계 단원 3 (문장 부호 놀이)**: `say` 말하다 [says, said, saying] · `talk` 이야기하다 [talks, talked, talking] · `ask` 묻다 [asks, asked, asking] · `answer` 대답하다, 답 [answers, answered, answering] · `meet` 만나다 [meets, met, meeting] · `live` 살다 [lives, lived, living] · `find` 찾다 [finds, found, finding] · `bring` 가져오다 [brings, brought, bringing] · `let` ~하게 하다(Let's ~ 하자) [lets, letting, let's] · `age` 나이 [ages] · `birthday` 생일 [birthdays] · `question` 질문 [questions] · `number` 숫자, 번호 [numbers] · `sky` 하늘 [skies] · `sea` 바다 [seas] · `cloud` 구름 [clouds] · `rain` 비, 비가 오다 [rains, rained, raining] · `snow` 눈, 눈이 오다 [snows, snowed, snowing] · `wind` 바람 [winds] · `river` 강 [rivers] · `mountain` 산 [mountains] · `beach` 해변 [beaches] · `grass` 풀, 잔디 [grasses] · `forest` 숲 [forests] · `air` 공기
- **쓰기 3단계 단원 4 (우리 동네에 있는 것)**: `school` 학교 [schools] · `park` 공원 [parks] · `zoo` 동물원 [zoos] · `farm` 농장 [farms] · `store` 가게 [stores] · `market` 시장 [markets] · `library` 도서관 [libraries] · `hospital` 병원 [hospitals] · `garden` 정원 [gardens] · `playground` 놀이터 [playgrounds] · `street` 거리 [streets] · `town` (작은) 도시, 동네 [towns] · `city` 도시 [cities] · `squirrel` 다람쥐 [squirrels] · `puzzle` 퍼즐 [puzzles] · `block` 블록, 덩어리 [blocks] · `balloon` 풍선 [balloons] · `soup` 수프, 국 [soups] · `fire` 불 [fires] · `end` 끝 [ends] · `safe` 안전한 [safer, safest] · `quick` 빠른 [quicker, quickest] · `move` 움직이다, 옮기다 [moves, moved, moving] · `push` 밀다 [pushes, pushed, pushing] · `pull` 당기다 [pulls, pulled, pulling]
- **쓰기 3단계 단원 5 (나는 할 수 있어)**: `open` 열다, 열린 [opens, opened, opening] · `close` 닫다 [closes, closed, closing] · `sit` 앉다 [sits, sat, sitting] · `stand` 서다 [stands, stood, standing] · `stop` 멈추다 [stops, stopped, stopping] · `wait` 기다리다 [waits, waited, waiting] · `put` 놓다, 넣다 [puts, putting] · `take` 가지고 가다, 타다 [takes, took, taken, taking] · `give` 주다 [gives, gave, given, giving] · `get` 받다, 가져오다 [gets, got, gotten, getting] · `clean` 청소하다, 깨끗한 [cleans, cleaned, cleaning, cleaner, cleanest] · `turn` 돌다, 차례 [turns, turned, turning] · `left` 왼쪽, 왼쪽의 · `basket` 바구니 [baskets] · `eraser` 지우개 [erasers] · `ruler` 자 [rulers] · `crayon` 크레용 [crayons] · `scissors` 가위 · `glue` 풀 [glues] · `notebook` 공책 [notebooks] · `textbook` 교과서 [textbooks] · `paper` 종이 [papers] · `picture` 그림, 사진 [pictures] · `bottle` 병 [bottles] · `card` 카드 [cards]

## 8. 학습 요소 범위와 문장 꼴(정본 3.6 · C64)

수업 글(조립 문장 · 본보기 · 같이 해 보기 · 짝 · 되짚기 · 뜻)은 앞 단계 전부, 같은 단계의 앞 단원, 이번 단원의 요소만 쓴다(C64 (1)). 쓰기 1~2단계 요소는 낱말 소리 다섯과 `형용사 + 명사` / `수 + 복수 명사` / `동사 + 목적어(play soccer)` / `전치사 + 명사(in the box)` / `명사 and 명사`(모두 어구)이고, 3단계 다섯은 단원 차례대로 `주어 + be + 형용사` / `주어 + 동사 + 목적어` / `대문자 · 마침표 · 물음표` / `There is ~` / `can 문장` 이다.

| 단원 | 쓸 수 있는 꼴(제안) | 예 |
|---|---|---|
| 1 | 'The · My + 명사(2단계 어구 꼴로 꾸민 명사 포함) + is + 어때요(1~2단계 형용사 · 이 단원 형용사).' · 'It is + 어때요.' 를 is 수업에, 'The + 복수 명사 + are + 어때요.' · 'We · They are + 어때요.' 를 are 수업에 쓴다(11절 수업 표). 위치 낱말(corner · side · front · bottom · middle)은 명사 꾸밈(`the side door` · `the corner shop`)이나 '무엇' 자리로 쓴다 | `The bedroom is pink.` · `It is dark.` · `The side door is red.` · `The walls are white.` · `We are happy.` |
| 2~5 | 그 단원 표본에서 정한다(이 판으로 만들지 않음) | |

쓰지 않는 꼴: I am(첫 묶음은 I 카드를 두지 않는다, L-30) · 주어 + 동사 + 목적어 문장(단원 2) · 물음표 문장(단원 3) · There is(단원 4, 검출기 `there-is`) · Let's(단원 4, `lets`) · can 문장(단원 5, `can`) · be 부정(4단계, `be-not`) · don't(4단계, `dont`) · 3인칭 -s · 명령문 · our · their.

**선생님 한국어 줄**(R8, 검증기 `teacher-line` · `grammar-term` · `teacher-name`): 해요체, 아이가 아는 말, 문법 용어 없음(13절), 줄마다 문장 `lesson.line_max_sentences` 이하 · 글자 `lesson.teacher_line_max_chars` 이하(빈칸 뺌). 영어 낱말 뒤 조사는 띄어 쓴다. 읽어 주는 선생님 줄에는 가운뎃점(·) 대신 쉼표나 '와'를 쓴다. 기기 한국어 목소리가 '·'를 글자 그대로 읽을 수 있어서다(장부 L-2 실측 항목).

- `todayKo`: 이 수업 틀을 놓는 법 한 줄(승인 수업: "오늘은 '무엇이 어때요'를 영어 문장으로 놓아요."). 변형끼리 뜻이 같다.
- 본보기 `lineKo`: "'교실이 커요'는 무엇, is, 어때요 차례로 놓아요." · '첫 글자는 대문자 단추로, 끝에는 마침표를 놓아요.' · 'my 로 시작해도 차례는 같아요.' 같은 한 줄.
- 같이 해 보기: 첫째 `lineKo` '남은 두 장을 맞는 칸에 놓아 봐요.' · `rightKo` '맞아요! 무엇, is, 어때요 차례예요.' · `wrongKo` "is 는 '무엇' 뒤, '어때요' 앞이에요." 둘째 `lineKo` '첫 글자를 대문자로 바꿔 볼까요?' · `rightKo` '좋아요! 문장은 대문자로 시작해요.' · `wrongKo` '대문자 단추를 눌러 봐요.' 같은 결로 수업마다 새로 쓴다.
- `whyKo`(차례가 틀렸을 때): 그 문장의 칸 차례를 보이는 한 줄(예 'bedroom 다음에 is, 그다음 pink 예요.' · 'restaurant 다음에 is, big 은 맨 뒤예요.'). 아이가 어떻게 놓았든 맞는 꼴이다.
- 마무리 줄 둘: `closeKo` '이제 ~ 영어 문장으로 놓을 수 있어요' 꼴, `closeKoPracticed` '오늘은 ~ 문장 놓기를 배우고 연습했어요' 꼴(숙달 단정 없음, 검증기 `recap-line`).
- 시간 합(검증기 `teach-seconds`): `todayKo` · `todayEn` · 본보기 `lineKo` · `en` · `fromEn` · 되짚기 `frameEn` · 마무리 줄 가운데 긴 것의 셈(틀 R8)이 `lesson.teach_seconds_max.1-3` 이하다.

**칩 role**(R8): thing('무엇' 덩어리: The classroom · My bedroom · It · The walls) · is(is · are 카드) · how('어때요' 말) · end(마침표 `.`). 칩 글은 정답 문장 글자 그대로 자른 덩어리다(대문자 시작 꼴).

좋은 줄 · 나쁜 줄(틀 R8 표)을 지킨다. 예: '형용사는 be동사 뒤에 와요.'(용어) · '정답은 The bed is big. 이에요.'('왜'가 없음)는 쓰지 않는다.

## 9. 그림 규칙

3단계에는 그림 문제가 없다(읽기는 글 문제, 말하기 듣기 보기는 글, 쓰기는 조립). 그림은 본보기 옆 사물 그림 하나(`teach.models[].picture`, 선택)뿐이다(C170 (6)). 키는 아래 1~2단계 그림 키 207개에서 고르고, 그 본보기 영어 문장에 나온 사물이어야 한다. 문장에 없는 사물 그림을 붙이지 않고, 색 낱말은 문장과 색이 맞을 때만 쓴다. 3단계 낱말 그림(plan 정한 것 14 로 단원 1 새 단어 열 개를 더함)은 미리보기 화면 몫이라 picture 칸에 쓰지 않는다(제안). 장면 그림은 없다(C27).

그림 키: angry, ant, apple, arm, baby, badminton, bag, ball, banana, bank, baseball, basketball, bath, bear, bed, bell, bike, bird, black, blue, book, box, boy, brush, bus, cake, candy, cap, car, cat, catch, chair, cheese, chicken, chocolate, climb, clock, coat, computer, cook, cookie, corn, cow, cup, dance, desk, dish, doctor, dog, doll, dolphin, door, draw, dress, drum, duck, ear, egg, eight, elephant, eye, face, family, fan, farmer, finger, fish, five, flower, fly, foot, fork, four, fox, frog, gift, giraffe, girl, glasses, goat, grandfather, grandmother, grape, green, guitar, hair, hamburger, hand, happy, hat, head, horse, house, hungry, ice cream, insect, jacket, jam, jeans, juice, jump, key, kick, king, kite, knee, lake, lamp, leg, lion, man, map, milk, monkey, mouth, neck, nine, nose, nurse, octopus, one, orange, pants, pen, pencil, penguin, phone, piano, pig, pink, pizza, plane, police, pot, potato, queen, rabbit, read, red, rice, ride, ring, robot, rock, rose, run, sad, sand, sandwich, scarf, seven, sheep, shell, ship, shirt, shoe, shop, shoulder, sick, sing, six, skate, ski, skirt, sleepy, smile, snake, soccer, sock, star, strawberry, strong, student, sun, sweater, swim, swing, table, teacher, ten, tennis, tent, thirsty, three, throw, tiger, tired, toe, tooth, top, tree, truck, turtle, two, umbrella, violin, walk, water, whale, white, window, wing, woman, write, yellow, yo-yo, zebra

## 10. 주제 묶음 · 변형 · 주제 겹침 · 인물

- `variant` 1 = 주제 묶음 1(동물 · 자연 · 음식 · 가족), `variant` 2 = 주제 묶음 2(놀이 · 운동 · 게임 · 우주 · 탈것). 묶음 id 와 변형 번호가 같다(C54 (3)).
- 단원 주제(6절)는 그대로 두고 등장인물 · 예시 · 상황만 묶음에 맞춘다(정본 6.3).
- 같은 (kind, lessonNo) 의 두 변형은 `newWords` 가 같고 문항 수 · 유형이 같다(검증기 `topic-variants`). teach.todayKo · teach.shiftKo 와 문장 틀의 뜻도 같다(델타 spec 설계 6). 본보기 · 같이 해 보기 · 혼자 문항 · 짝은 변형 주제에 맞춰 달리 쓴다.
- 한 단원 수업 26개(승인 수업 포함)의 제목과 장면이 서로 겹치지 않게 한다. 앞에서 쓴 제목 · 장면 목록을 적어 가며 만든다.

### 인물(C124 · R10)

3단계 쓰기 조립 문장에는 이름 · I 를 두지 않는다. 검증기는 C84 대로 I · 인물 이름 카드를 받지만, 첫 묶음에서는 단순하게 두기로 했다(장부 L-30, 다음 판에서 푼다). 본보기 · 같이 해 보기 · 짝에도 이름을 쓰지 않는다(제안). 그래서 이름이 나온 수업 수 n 은 0 이다.

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

- We · They 는 '무엇' 자리에 쓸 수 있다(We are happy.). 누구인지 모호해 뜻이 흐려지는 문장은 쓰지 않는다.

## 11. 수업 종류별 내용

한 수업에 문장 틀 하나(C170 (8)): 한 수업의 본보기 · 같이 해 보기 · 혼자 문장 · 짝 · 되짚기는 같은 틀을 쓴다. 틀을 넓히는 일은 다음 수업에서 한다. 단원 1 수업 표(제안, 3절의 맞바꾼 낱말로):

| 수업 | 새 단어 | 틀 | 메모 |
|---|---|---|---|
| 배정 1 | classroom · bedroom · bathroom · living room · restaurant | The · My + 방 + is + 어때요. | 승인 수업(변형 1). 변형 2 는 같은 틀 · 같은 새 단어로 새로 쓴다 |
| 배정 2 | wall · floor · corner · side · front | The · My + 무엇 + is + 어때요. | 위치 낱말은 꾸밈(`the side door` · `the front door` · `the corner shop`)이나 '무엇' 자리로. 어울리는 '어때요'가 없으면 다른 1~2단계 명사와 짝을 짓는다 |
| 배정 3 | bottom · middle · child · dark · bright | The · My + 무엇 · It + is + 어때요. | dark · bright 는 '어때요' 자리(It is dark.), child 는 '무엇' 자리(The child is happy.) |
| 배정 4 | round · soft · hard · high · low | The + 복수 명사 · We · They + are + 어때요. | are 로 넓히는 첫 수업. 새 단어 다섯이 모두 '어때요' 말이다(The walls are high. · The beds are soft.) |
| 배정 5 | large · far · road · bridge · train | The + 복수 명사 + are + 어때요. | are 를 다지는 수업. road · bridge · train 은 '무엇' 자리, large · far 는 '어때요' 자리(The trains are long. · They are far.). 방 밖 장면(길 · 다리 · 기차)이 단원 주제 '방과 교실' 밖이라 장면을 '창밖으로 보이는 것 · 교실 그림책' 같은 방 안 시점으로 잡는다(제안) |
| 다지기 6~10 | 없음 | is · are 를 수업마다 하나씩(제안: 6 · 7 · 9 is, 8 · 10 are) | 다지기 다섯을 합쳐 단원 단어 25개가 모두 한 번 이상(경고 `relation-not-reused`) |
| 보강 1~3 | 없음 | 그 수업이 몰아 다룬 단어의 틀 | (제안) 보강 1 은 배정 1 · 2 단어, 보강 2 는 배정 3 · 4, 보강 3 은 배정 5. 변형마다 단원 단어마다 `seed.remedial_coverage.1-3` 번 이상 |

- 모든 수업에 teach 를 둔다(3단계는 `seed.goals_required_levels` 단계라 teach.goals · 문항 goal 이 필수다). 다지기 · 보강의 teach 는 그 수업 틀과 다시 쓰는 단원 단어로 쓴다. `preview` 는 배정만 새 단어 다섯이고 다지기 · 보강은 빈 목록이다.
- 이 수업보다 뒤 배정 수업의 단원 단어는 어디에도 쓰지 않는다(경고 `relation-early-use`).
- `unitWords` 에는 본문(조립 문장 · 본보기 · 같이 해 보기 · 짝 · 되짚기)에 나온 단원 단어를 빠짐없이 적는다(경고 `unit-words-unlisted` · 오류 `unit-words`).

## 12. 출력 규격(Zod `WritingLessonSchema` 와 1:1)

모르는 키는 거부된다. 파일 겉: `{ "area": "writing", "level": 3, "unit": <단원>, "lessons": [ … ] }`. 수업 칸의 차례는 승인 수업과 같게 한다(kind · lessonNo · variant · revision · correction · generation · title · newWords · unitWords · preview · teach · content).

| 필드 | 꼴 | 설명 |
|---|---|---|
| `kind` · `lessonNo` · `variant` · `revision` · `correction` · `generation` · `title` · `newWords` · `unitWords` | 읽기 · 말하기와 같은 꼴 | 4절 · 11절. 제목은 단원 26수업에서 겹치지 않게 |
| `preview` | `[{ "word", "meaningKo", "example": "", "parts"? }]` | 5절 |
| `teach.goals` · `teach.shiftKo` · `teach.todayKo` · `teach.todayEn` | `["write-3-1-1"]` · `{ "before", "after" }` · 한국어 줄 · 영어 문장 | 5절 · 8절 |
| `teach.models[]` | `{ "en", "ko", "chips": [{ "text", "role" }], "lineKo", "fromEn"? }` | 5절 · 8절 |
| `teach.together[]` | `{ "type": "assemble-sentence", "cards", "meaningKo", "accepted", "filled": { "cards", "capital" }, "slot", "choices"?, "lineKo"?, "rightKo", "wrongKo" }` | 5절. `filled.cards` 의 빈칸은 `null` |
| `teach.recap` | `{ "frameEn", "chips", "closeKo", "closeKoPracticed" }` | 8절 |
| `content` | `{ "shape": "items", "items": [ … ] }` | 문장 다섯 |
| `items[]` | `{ "type": "assemble-sentence", "cards", "meaningKo", "accepted", "goal", "whyKo", "spare" }` | 5절 |
| `spare` | `{ "type": "assemble-sentence", "cards", "meaningKo", "accepted", "whyKo" }` | 5절 |

연습 · 기회 표시 칸은 없다. `teach.together` 는 연습, 문항과 `spare` 는 기회다. 예시는 아래 승인 수업 하나다. 다른 칸에 문장 · 제목을 옮기지 않는다.

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
 "title": "교실이 커요",
 "newWords": [
  "classroom",
  "bedroom",
  "bathroom",
  "living room",
  "restaurant"
 ],
 "unitWords": [
  "classroom",
  "bedroom",
  "bathroom",
  "living room",
  "restaurant"
 ],
 "preview": [
  {
   "word": "classroom",
   "meaningKo": "교실",
   "example": "The classroom is big."
  },
  {
   "word": "bedroom",
   "meaningKo": "침실",
   "example": "The bedroom is small.",
   "parts": [
    "bed",
    "room"
   ]
  },
  {
   "word": "bathroom",
   "meaningKo": "욕실",
   "example": "My bathroom is white.",
   "parts": [
    "bath",
    "room"
   ]
  },
  {
   "word": "living room",
   "meaningKo": "거실",
   "example": "The living room is cold."
  },
  {
   "word": "restaurant",
   "meaningKo": "식당",
   "example": "The restaurant is hot."
  }
 ],
 "teach": {
  "goals": [
   "write-3-1-1"
  ],
  "shiftKo": {
   "before": "the big classroom 같은 두세 낱말 말은 놓지만 '교실이 커요'를 영어 문장으로 놓지 못한다(차례 · is · 대문자 · 마침표)",
   "after": "섞인 카드를 무엇 → is → 어때요 차례로 놓고 대문자 · 마침표까지 붙여, 처음 보는 낱말 짝의 문장도 스스로 완성한다"
  },
  "todayKo": "오늘은 '무엇이 어때요'를 영어 문장으로 놓아요.",
  "todayEn": "The classroom is big.",
  "models": [
   {
    "en": "The classroom is big.",
    "ko": "교실이 커.",
    "fromEn": "the big classroom",
    "chips": [
     {
      "text": "The classroom",
      "role": "thing"
     },
     {
      "text": "is",
      "role": "is"
     },
     {
      "text": "big",
      "role": "how"
     },
     {
      "text": ".",
      "role": "end"
     }
    ],
    "lineKo": "'교실이 커요'는 무엇, is, 어때요 차례로 놓아요."
   },
   {
    "en": "The bedroom is small.",
    "ko": "침실이 작아.",
    "fromEn": "the bedroom is small",
    "chips": [
     {
      "text": "The bedroom",
      "role": "thing"
     },
     {
      "text": "is",
      "role": "is"
     },
     {
      "text": "small",
      "role": "how"
     },
     {
      "text": ".",
      "role": "end"
     }
    ],
    "lineKo": "첫 글자는 대문자 단추로, 끝에는 마침표를 놓아요."
   },
   {
    "en": "My bathroom is white.",
    "ko": "내 욕실은 하얘.",
    "chips": [
     {
      "text": "My bathroom",
      "role": "thing"
     },
     {
      "text": "is",
      "role": "is"
     },
     {
      "text": "white",
      "role": "how"
     },
     {
      "text": ".",
      "role": "end"
     }
    ],
    "lineKo": "my 로 시작해도 차례는 같아요."
   }
  ],
  "together": [
   {
    "type": "assemble-sentence",
    "cards": [
     "the",
     "living",
     "room",
     "is",
     "cold",
     "."
    ],
    "meaningKo": "거실이 추워.",
    "accepted": [
     "The living room is cold."
    ],
    "filled": {
     "cards": [
      "the",
      "living",
      "room",
      null,
      null,
      "."
     ],
     "capital": true
    },
    "slot": [
     4,
     5
    ],
    "choices": [
     "cold",
     "is"
    ],
    "lineKo": "남은 두 장을 맞는 칸에 놓아 봐요.",
    "rightKo": "맞아요! 무엇, is, 어때요 차례예요.",
    "wrongKo": "is 는 '무엇' 뒤, '어때요' 앞이에요."
   },
   {
    "type": "assemble-sentence",
    "cards": [
     "the",
     "restaurant",
     "is",
     "hot",
     "."
    ],
    "meaningKo": "식당이 더워.",
    "accepted": [
     "The restaurant is hot."
    ],
    "filled": {
     "cards": [
      "the",
      "restaurant",
      "is",
      "hot",
      "."
     ],
     "capital": false
    },
    "slot": "capital",
    "lineKo": "첫 글자를 대문자로 바꿔 볼까요?",
    "rightKo": "좋아요! 문장은 대문자로 시작해요.",
    "wrongKo": "대문자 단추를 눌러 봐요."
   }
  ],
  "recap": {
   "frameEn": "The classroom is big.",
   "chips": [
    {
     "text": "The classroom",
     "role": "thing"
    },
    {
     "text": "is",
     "role": "is"
    },
    {
     "text": "big",
     "role": "how"
    },
    {
     "text": ".",
     "role": "end"
    }
   ],
   "closeKo": "이제 방이 어떤지 영어 문장으로 놓을 수 있어요.",
   "closeKoPracticed": "오늘은 '무엇이 어때요' 문장 놓기를 배우고 연습했어요."
  }
 },
 "content": {
  "shape": "items",
  "items": [
   {
    "type": "assemble-sentence",
    "cards": [
     "pink",
     "the",
     "is",
     "bedroom",
     "."
    ],
    "meaningKo": "침실이 분홍색이야.",
    "accepted": [
     "The bedroom is pink."
    ],
    "goal": "write-3-1-1",
    "whyKo": "bedroom 다음에 is, 그다음 pink 예요.",
    "spare": {
     "type": "assemble-sentence",
     "cards": [
      "blue",
      "bedroom",
      "is",
      "my",
      "."
     ],
     "meaningKo": "내 침실은 파란색이야.",
     "accepted": [
      "My bedroom is blue."
     ],
     "whyKo": "bedroom 다음에 is, 그다음 blue 예요."
    }
   },
   {
    "type": "assemble-sentence",
    "cards": [
     "is",
     "nice",
     "classroom",
     "my",
     "."
    ],
    "meaningKo": "내 교실은 멋져.",
    "accepted": [
     "My classroom is nice."
    ],
    "goal": "write-3-1-1",
    "whyKo": "my classroom 다음에 is, 그다음 nice 예요.",
    "spare": {
     "type": "assemble-sentence",
     "cards": [
      "classroom",
      "cold",
      "the",
      "is",
      "."
     ],
     "meaningKo": "교실이 추워.",
     "accepted": [
      "The classroom is cold."
     ],
     "whyKo": "classroom 다음에 is, 그다음 cold 예요."
    }
   },
   {
    "type": "assemble-sentence",
    "cards": [
     "small",
     "bathroom",
     "is",
     "the",
     "."
    ],
    "meaningKo": "욕실이 작아.",
    "accepted": [
     "The bathroom is small."
    ],
    "goal": "write-3-1-1",
    "whyKo": "bathroom 다음에 is, 그다음 small 이에요.",
    "spare": {
     "type": "assemble-sentence",
     "cards": [
      "big",
      "is",
      "my",
      "bathroom",
      "."
     ],
     "meaningKo": "내 욕실은 커.",
     "accepted": [
      "My bathroom is big."
     ],
     "whyKo": "bathroom 다음에 is, 그다음 big 이에요."
    }
   },
   {
    "type": "assemble-sentence",
    "cards": [
     "the",
     "big",
     "restaurant",
     "is",
     "."
    ],
    "meaningKo": "식당이 커.",
    "accepted": [
     "The restaurant is big."
    ],
    "goal": "write-3-1-1",
    "whyKo": "restaurant 다음에 is, big 은 맨 뒤예요.",
    "spare": {
     "type": "assemble-sentence",
     "cards": [
      "the",
      "nice",
      "restaurant",
      "is",
      "."
     ],
     "meaningKo": "식당이 멋져.",
     "accepted": [
      "The restaurant is nice."
     ],
     "whyKo": "'식당이 멋져'는 nice 가 맨 뒤예요."
    }
   },
   {
    "type": "assemble-sentence",
    "cards": [
     "new",
     "living",
     "my",
     "room",
     "is",
     "."
    ],
    "meaningKo": "내 거실은 새것이야.",
    "accepted": [
     "My living room is new."
    ],
    "goal": "write-3-1-1",
    "whyKo": "living room 다음에 is, 그다음 new 예요.",
    "spare": {
     "type": "assemble-sentence",
     "cards": [
      "small",
      "room",
      "the",
      "living",
      "is",
      "."
     ],
     "meaningKo": "거실이 작아.",
     "accepted": [
      "The living room is small."
     ],
     "whyKo": "living room 다음에 is, 그다음 small 이에요."
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
brief = open("seed/prompts/writing-3.md").read()
m = re.search(r"<!-- 승인 수업 시작 -->\s*```json\n(.*?)\n```\s*<!-- 승인 수업 끝 -->", brief, re.S)
fixed = json.loads(m.group(1))
h = hashlib.sha256(json.dumps(fixed, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
assert h == want, ("승인 수업 해시가 호출 값과 다르다", h)
p = f"{root}/lessons/writing/3/1.json"
d = json.load(open(p))
rest = [l for l in d["lessons"] if not (l["kind"] == "assigned" and l["lessonNo"] == 1 and l["variant"] == 1)]
d["lessons"] = [fixed] + rest
open(p, "w").write(json.dumps(d, ensure_ascii=False, indent=1))
print("붙임: 수업", len(d["lessons"]), "· 승인 수업 해시 같음")
PY
```

그다음 하나씩 확인한다.

1. 수업 26개(변형 2 × (정규 10 + 보강 3)), 첫 수업이 승인 수업이고 붙이기 명령의 해시가 같다. (kind, lessonNo, variant) 겹침 없음.
2. 문항마다 3~5낱말 문장 하나, 카드가 정답 낱말 · 마침표를 한 장씩(소문자, 두 낱말 단원 단어는 두 장), 차례를 섞었고, 이름 · I 가 없다.
3. 배정 수업의 `newWords` · `preview` 가 배정표와 같고 새 단어가 혼자 문장에 나온다. preview 의 example 은 빈 글이다.
4. 모든 영어 글이 7절 범위와 8절 꼴 안이다(I am · 주어 + 동사 + 목적어 · 물음표 · There is · can · 부정 없음).
5. 한 수업에 문장 틀 하나(11절 표)이고, 본보기 · 같이 해 보기 · 문항 · 짝 · 되짚기가 같은 틀이다.
6. 같이 해 보기 첫째는 빈칸 수 = 남은 카드 수이고 남은 카드가 모든 빈칸의 정답 카드를 담으며, 둘째는 대문자 칸 하나다.
7. 문항마다 goal · whyKo(차례 한 줄) · spare 가 있고, 짝은 같은 유형 · 다른 낱말 짝이다.
8. teach: 본보기 수 · 같이 해 보기 수가 설정값 안, 칩 role(thing · is · how · end)이 맞고, 마무리 줄 둘이 있으며 closeKoPracticed 에 숙달 단정이 없다. teach.goals 첫 목표에 이어진 문항이 lesson.recap_min_evidence 개 이상이다.
9. 선생님 줄마다 글자 · 문장 상한 안, 문법 용어 · 선생님 이름 · {NAME} 없음, 시간 합이 lesson.teach_seconds_max.1-3 안이다.
10. 혼자 문장 · 짝이 본보기 · 같이 해 보기 문장과 글자가 같지 않고 낱말 짝도 다르다. 짝끼리도 다르다. 승인 수업의 문장 · 제목을 다시 쓰지 않았다.
11. 다지기 다섯에 단원 단어가 모두 다시 나오고, 보강 셋에 단원 단어마다 1번 이상 나온다(변형마다).
12. 변형 1 · 2 의 같은 칸끼리 새 단어 · 문항 수가 같고 todayKo · shiftKo 의 뜻이 같다. 제목 26개가 서로 다르다.
13. 13절 금지 목록에 걸리는 말이 없다.

검증 명령(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas writing --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="lessons/writing/3/<단원>.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("id",""), x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(이 파일의 칸 수 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수)를 그대로 적어 둔다. 보고의 '첫 검증'이고 S10 비교에 쓴다.
- 오류가 있으면 그 칸만 고치고 다시 검증한다. 고친 칸의 `generation.retries` 에 회차를 적는다. 고침은 `seed.max_retries` 회까지다. 승인 수업에 오류가 나면 고치지 말고 보고한다(승인 수업은 이 판의 검증기로 오류 0 이다).
- 경고(`unit-words-unlisted` · `relation-early-use` · `relation-not-reused` · `recap-evidence` · `slot-seconds` · 분포)도 고친다. 남기면 까닭을 보고한다. 단원 규격 파일의 `unit-goals` 경고(다른 단원 · 단계의 목표 없음)는 이 파일 밖이라 걸러져 나오지 않는다.
- `unchecked`(풀이 검사 안 됨)와 `empty`(빈 칸)는 이 단계의 일이 아니다.

## 15. 근거 한 줄

쓰기 3단계는 섞인 카드를 문장 차례로 놓고 첫 글자 대문자 · 끝 마침표를 붙이는 단계다. 2022 개정 영어과 3~4학년군 표현 성취기준 [4영02-03](소리와 철자의 관계로 단어 쓰기) · [4영02-05](소개 · 묘사를 쉽고 간단한 문장으로 말하거나 보고 쓰기)에 기댄다(정본 3.3 이 인용한 번호, 델타 spec 설계 2 의 확인 정도: 2차 자료 둘의 일치). 예시문을 참고해 글을 쓰는 것은 초5~6 이라 아이는 문장을 지어내지 않고 조립만 한다(2026-10-15 결정). CEFR Pre-A1 쓰기는 블록체 글자 · 낱말 쓰기와 베끼기 수준이다.

## 16. 보고 꼴

마지막 답장(파일로 쓰지 않는다)에 이 차례로 쓴다.

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값>
파일: <뿌리>/lessons/writing/3/<단원>.json · 수업 <n>(승인 1 · 새로 <n> · 정규 <n> · 보강 <n>) · <바이트>
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
| 5 | 본보기 셋의 구실(어구 → 문장 · 대문자와 마침표 · 다른 '무엇'), 어구 차례로 섞은 문항 하나 이상 | 표본 3판 W3~W5 · H4 꼴 |
| 7 | 쓸 수 있는 낱말을 1~2단계 + we · they · 이 영역 배정된 단원 단어로 좁힘, 3단계 위치 전치사 · 이름 · I 를 쓰지 않음 | 쓰기 3단계 요소에 위치 전치사가 없고, 이름 · I 카드는 첫 묶음에서 두지 않기로 했다(L-30) |
| 8 | 위치 낱말을 명사 꾸밈으로 쓰기(the side door) | 3~5낱말 안에서 '무엇이 어때요' 틀에 넣을 길 |
| 11 | 단원 1 수업 표(배정 4 에서 are 로 넓힘, 다지기의 is · are 나눔, 보강 단어 묶음) | C170 (8) '한 수업에 문장 틀 하나'를 단원 전체에 편 것 |
