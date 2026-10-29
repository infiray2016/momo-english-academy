# 생성 브리프 — 쓰기 1단계(`writing-1`)

이 파일은 쓰기 1단계 묶음의 프롬프트 판이다(정본 6.3). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 단원 하나의 수업 전부를 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 숫자와 규칙은 모두 저장소 파일에서 옮겼다. 정본에 없는 값은 '(제안)'으로 적었고 맨 끝 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 그 영역 × 단계를 처음부터 다시 만든다.

**쓰기 1단계는 고르기 · 베끼기 · 채우기만 한다. 아이가 문장을 만들어 내는 문항은 없다**(정본 3.3, 요청자 결정 2026-10-15). 문항마다 답은 낱말 하나다.

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 영역 · 단계 | `writing` · 1 · CEFR Pre-A1 · 구간 `1-3` · 모양 `items` |
| 틀 | `seed/prompts/_template.md` |
| 만든 날 · 만든 이 | 2026-10-23 첫 판 · 학습 설계자(cur-p08) |
| 옮긴 곳 | `seed/level-specs.json` · `unit-specs.json` · `settings.json` · `vocab.json`(그림 키 · 예문은 P6b 가지 7767df0) · `images.json`(P6b) · `lists/forms.json` · `lists/forbidden.json` · `lists/meta-sentences.json` · `src/core/seed/schema/lesson.ts` · `check-lesson.ts` · `check-cross.ts` · `text.ts` · `solve-check.ts`(풀이 검사가 보는 칸) · `src/core/vocab/allocate.ts` · `src/core/answer/check.ts` · `expected.ts` · `src/core/session/attempt.ts`(단어별 정오) · `src/components/session/writing-items.tsx`(아이 화면) · 정본 3.1 · 3.2 · 3.3 · 3.4 · 3.6 · 6.3 · 6.4 · 13절 C54 · C64 · C66 · C67 · C73 · C84 · C88 · C122 · C124 · P6a 근거 문서(쓰기 1단계 철자 패턴 표 · 단원 0 대표 낱말 · can-do 표) · P6b 검토(헷갈리는 짝) · `reading-1.md` · `speaking-1.md` 표본 보고(S-x · S-h, 장부 'P8 표본에서 드러난 브리프 빈틈') |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 단원 번호 | `1`(0~5, 0 은 알파벳 단원) | 파일 이름, 6절에서 그 단원 찾기 |
| 뿌리 폴더 | `seed` 또는 표본 폴더 | 쓸 파일 `<뿌리>/lessons/writing/1/<단원>.json` |
| briefHash · agentHash | 소문자 16진 64자 | 모든 수업의 `generation` |
| effort | `xhigh` · `high` | `generation.effort` |
| createdOn | `2026-10-23` | `generation.createdOn` |
| revision · correction | `1` · `0` | 모든 수업 |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

`generation.model` 에는 자기 모델 ID(예: `claude-opus-5-5`)를 적는다. 파일은 하나만 쓴다.

## 2. 할 일 한눈에

1. 6절에서 이 단원의 단원 단어 · 배정표를 찾는다.
2. 주제 변형 1(묶음 1)의 정규 수업 10개와 보강 수업 3개를 만든다. 단원 0 의 정규 수업은 `alphabet` 1~10 이고, 단원 1~5 는 `assigned` 1~5 · `reinforce` 6~10 이다.
3. 주제 변형 2(묶음 2)도 같은 칸으로 만든다.
4. 파일 하나 `{ "area", "level", "unit", "lessons" }` 에 수업 26개를 넣는다. 차례는 (제안) 변형 1 의 정규 1~10 · 보강 1~3, 그다음 변형 2 다.
5. 14절 스스로 확인 → 검증 명령 → 오류 칸 고침 → 16절 보고.

## 3. 단계 규격(`level-specs` writing 1)

| 칸 | 값 |
|---|---|
| can-do | 그림에 맞는 단어를 고르고 철자 타일로 단어 6개를 베끼거나 빠진 글자를 채워 쓸 수 있다 |
| CEFR · 목표 시간 | Pre-A1 · 5분 |
| 모양 | `items`(1~3단계, `writing.rule_check_until_level` 3). `guided` · `composition` 을 쓰면 `writing-shape` 오류 |
| 분량 `amount` | 단어 문항 6개(`words` 6), 어구 · 문장 문항 0. 문항 갈래 `itemTypes` 는 `pick-word` · `copy-tiles` · `fill-letters` 셋이다. `dictation` · `build-tiles` · `assemble-phrase`(2단계) · `assemble-sentence`(3단계)를 두면 `amount` 오류 |
| 문장 길이 상한 `sentenceMaxWords` | 5낱말. 영어 문장은 미리보기 예문뿐이다(문항 글은 모두 낱말 하나) |
| 입력 | 타일 누르기(1단계는 앱 안 자판도 쓰지 않는다) |

정본 3.3 쓰기 단계표 1단계 행: 과제 '그림 보고 단어 고르기, 철자 타일로 단어 베끼기, 빠진 글자 타일 채우기(b_ll → ball)' · 분량 '단어 6개' · 입력 '타일 누르기' · 목표 5분. 1~3단계 세션은 '새 단어 미리보기 → 과제 → 고르기 · 베끼기 · 조립 → 확인'이고, 피드백은 정답 비교다(틀리면 정답을 보여 주고 다시 한다, AI 없음). 근거: 2022 개정 초3~4 성취기준 [4영02-02] · [4영02-03](P6a 근거 문서 can-do 표), 정본 3.3 '초3~4 쓰기는 소리와 철자의 관계를 바탕으로 단어를 쓰고 문장은 보고 쓰는 수준([4영02-03] · [4영02-05])', CEFR Overall written production Pre-A1(척도 이름은 근거 문서가 '(추측)'으로 적었다).

## 4. 단원 틀(`settings` 구간 1-3)

| 설정 키 | 값 | 뜻 |
|---|---|---|
| `unit.vocab_count.1-3` | 25 | 단원 1~5 의 단원 단어 수. 단원 0 은 그 단원 단어 수(26)를 쓴다(C54) |
| `unit.new_words_per_lesson.1-3` | 5 | 배정 · 알파벳 수업마다 새 단어 k |
| `unit.regular_lessons.1-3` | 10 | 정규 수업 = 배정 5 + 다지기 5(단원 0 은 alphabet 10 — 새 단어 5 · 5 · 5 · 5 · 5 · 1, 7~10 은 새 단어 없음) |
| `seed.remedial_per_unit.1-3` | 3 | 보강 수업 수 |
| `seed.topic_variants.1-3` | 2 | 주제 변형 수 |
| `seed.remedial_coverage.1-3` | 1 | 변형마다 보강 수업들을 합쳐 단원 단어마다 나와야 하는 횟수 |
| `writing.rule_check_until_level` | 3 | 이 단계까지 모양 `items`(앱이 정답과 견준다) |
| `seed.max_retries` | 2 | 검증 뒤 고침 회차 상한 |

수업 번호(검증기 `layout`): 단원 1~5 는 `assigned` 1~5 · `reinforce` 6~10, 단원 0 은 `alphabet` 1~10, 모든 단원 `remedial` 1~3 · `variant` 1~2. 이 수는 설정값이라 아이가 보는 글에 적지 않는다.

## 5. 수업 구성(정본 3.3 쓰기 1~3)

세션 차례: 새 단어 미리보기 → 문항 6개(하나씩, 고르거나 다 놓으면 바로 확인). 앱이 정답과 견준다(AI 없음). 틀리면 '정답은 이거예요'와 정답을 보여 주고 맞힐 때까지 다시 하게 하며, 점수는 첫 시도로 센다. 맞으면 '맞았어요!' 아래에 낱말과 한국어 뜻을 보인다. 문법은 설명하지 않는다.

| 활동 | 칸 | 수 · 길이 |
|---|---|---|
| 새 단어 미리보기 | `preview` | `newWords` 와 같은 낱말 모음. 배정 · 알파벳 1~5 는 5개, 알파벳 6 은 1개(zebra), 다지기 · 알파벳 7~10 · 보강은 빈 목록. `example` 은 5낱말 이하 영어 한 문장(8절 꼴 · 9절 그림 맞춤) |
| 문항 | `content` = `{ "shape": "items", "items": [ … ] }` | 6개. (제안) 모든 수업이 같은 차례: 1 · 2 번 `pick-word` → 3 · 4 번 `copy-tiles` → 5 · 6 번 `fill-letters` |

| 갈래 | 아이가 보는 것 · 하는 일 | 칸 | 규칙 |
|---|---|---|---|
| `pick-word` 그림 보고 고르기 | 그림 한 장과 보기 글. '그림에 맞는 단어를 골라요' — 누르면 바로 채점 | `picture`(정답 낱말 id, 9절 표의 그림 낱말) · `options`(보기 글 (제안) 4개) · `answerNo`(1부터) · `accepted`(`[정답 낱말]`) | `options[answerNo − 1]` 은 `accepted[0]` 과 글자 그대로 같다(검증기 `answer`). `picture` 에 그림 없는 낱말을 내면 `image` 오류. 오답 보기 셋은 1단계 범위 낱말(7절)이고, 그 가운데 하나 이상은 정답과 글자 꼴이 비슷한 낱말(같은 첫 글자 · 같은 끝 · 한두 글자만 다름)로 고른다(예: dog → desk · duck · door). 정답 자리는 1~4 에 고루 나눈다 |
| `copy-tiles` 보고 베끼기 | 낱말 글과 섞인 글자 타일. '단어를 보고 글자를 차례대로 놓아요' — 낱말 글자 수만큼 놓아야 '다 놓았어요' | `word`(보여 줄 낱말) · `tiles` · `accepted`(`[word]`) | 타일은 그 낱말의 글자를 한 글자씩 모두 섞은 것이다(같은 글자는 그 수만큼, yo-yo 는 `-` 도 한 장). 낱말 차례 그대로 두지 않는다. (제안) 덤 타일은 두지 않는다. (제안) 베끼기 낱말은 6글자까지 — elephant · umbrella · octopus · chicken 은 고르기나 채우기로 낸다 |
| `fill-letters` 빠진 글자 채우기 | 낱말 그림(그림 없는 낱말은 한국어 뜻 글), 빈칸 무늬(`b_ll`), 글자 타일. 들어올 때 낱말을 한 번 읽어 준다. '빈칸에 들어갈 글자를 놓아요' — 빈칸 수만큼 놓는다 | `word`(낱말 id 원형) · `pattern` · `tiles` · `accepted`(`[word]`) | `pattern` 은 `word` 와 글자 수가 같고 빈 글자만 `_` 다. 빈칸은 (제안) 1~2개이고 자리는 8절 학습 요소 표를 따른다. 타일은 빈칸마다 한 글자 한 장 + 덤 글자 1~2장이다(같은 글자가 빈칸 둘에 들어가면 두 장 — yo-yo 의 `y_-y_` 는 o · o). 덤 글자를 빈칸에 넣어 다른 영어 낱말(이름 · 줄임말 포함)이 되면 안 된다(8절 예) |

모든 문항에 공통:

- 낱말 · 보기 · 타일 · 허용 정답은 모두 소문자다. 타일 답은 놓은 글자를 이은 글이 허용 정답과 대소문자까지 같아야 맞으므로, 대문자 타일이 하나라도 있으면 아이가 맞힐 수 없다.
- 타일은 모두 한 글자다. 앱은 빈칸 하나에 타일 하나를 놓고, 베끼기는 낱말 글자 수만큼 놓아야 끝난다. 두 글자 타일(`sh` · `ck`)을 두면 아이가 답을 낼 수 없다(검증기는 이것을 잡지 못한다).
- `accepted` 는 정답 낱말 하나다(`["hat"]`). 1단계 낱말에는 다른 철자가 없다.
- 1단계에는 조립 카드가 없다. C84 카드 규칙(카드는 소문자, 고유 명사 · I 는 정답 꼴, 문장 부호는 카드 하나)은 2 · 3단계 몫이고, 지금 검증기가 대문자 카드를 모두 막는 일(고침은 쓰기 3 전)도 이 단계에 닿지 않는다. 문항 답은 모두 단원 단어 낱말이라 고유 명사 · I 가 들어갈 자리가 없다.
- 단어장 '씀'은 문항의 답 낱말(고르기의 `picture`, 베끼기 · 채우기의 `word`)로 센다. 보기에만 나온 낱말은 '씀'에 들지 않는다. 그래서 새 단어는 답 낱말로 낸다(11절).

풀이 검사(정본 6.4)는 검증을 통과한 문항을 AI 가 정답 없이 푼다. 이 AI 가 보는 것은 고르기의 '그림: <그 낱말의 한국어 뜻>'과 보기, 베끼기의 `word` 와 타일, 채우기의 `pattern` 과 타일뿐이다(채우기의 그림 · 소리 · `word` 는 보지 않는다). 답이 둘 이상 맞거나 앱 정답과 다르면 그 칸이 사람 확인으로 간다. 그래서 채우기는 무늬와 타일만으로 답이 하나여야 하고, 고르기는 한국어 뜻만으로 보기 하나가 골라져야 한다(뜻이 겹치는 hat · cap 을 함께 두지 않는다, 9절).

## 6. 단원 규격과 배정표(`unit-specs` · 배정 함수)

배정표는 앱의 배정 함수가 단원 단어를 차례대로 k(5)개씩 나눈 결과다. `newWords` 는 표와 낱말 모음이 같아야 한다(검증기 `vocab-allocation`). 단원 0 의 수업 6 은 zebra 하나이고 7~10 은 빈 목록이다. 다지기 · 보강은 빈 목록이다.

### 단원 0 — 알파벳 친구들 · 학습 요소 '알파벳 이름과 기본 소리'

- 단원 단어 26개(배정 차례 그대로): ant, bear, cow, door, elephant, fork, guitar, horse, insect, juice, key, lion, monkey, nurse, octopus, piano, queen, robot, star, tiger, umbrella, violin, window, box, yo-yo, zebra
- 그림 없는 단원 단어(그림 고르기 `picture` 에 내지 않는다): 없음

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | alphabet | ant(개미) · bear(곰) · cow(소) · door(문) · elephant(코끼리) |
| 2 | alphabet | fork(포크) · guitar(기타) · horse(말) · insect(곤충) · juice(주스) |
| 3 | alphabet | key(열쇠) · lion(사자) · monkey(원숭이) · nurse(간호사) · octopus(문어) |
| 4 | alphabet | piano(피아노) · queen(여왕) · robot(로봇) · star(별) · tiger(호랑이) |
| 5 | alphabet | umbrella(우산) · violin(바이올린) · window(창문) · box(상자) · yo-yo(요요) |
| 6 | alphabet | zebra(얼룩말) |
| 7 | alphabet | [] (새 단어 없음) |
| 8 | alphabet | [] (새 단어 없음) |
| 9 | alphabet | [] (새 단어 없음) |
| 10 | alphabet | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 1 — 모자와 가방 · 학습 요소 '단모음 a · e'

- 단원 단어 25개(배정 차례 그대로): seven, ten, red, yellow, cat, rabbit, apple, egg, candy, bag, hat, cap, pen, pencil, bed, desk, map, hand, leg, sand, jam, fan, lamp, tent, bell
- 그림 없는 단원 단어(그림 고르기 `picture` 에 내지 않는다): 없음

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | seven(7, 일곱) · ten(10, 열) · red(빨간, 빨간색) · yellow(노란, 노란색) · cat(고양이) |
| 2 | assigned | rabbit(토끼) · apple(사과) · egg(달걀) · candy(사탕) · bag(가방) |
| 3 | assigned | hat(모자) · cap((챙 달린) 모자) · pen(펜) · pencil(연필) · bed(침대) |
| 4 | assigned | desk(책상) · map(지도) · hand(손) · leg(다리) · sand(모래) |
| 5 | assigned | jam(잼) · fan(선풍기, 부채) · lamp(램프, 전등) · tent(텐트) · bell(종) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 2 — 돼지와 개구리 · 학습 요소 '단모음 i · o · u'

- 단원 단어 25개(배정 차례 그대로): six, big, little, one, four, dog, pig, frog, green, small, milk, cup, doll, bus, pizza, drum, sun, top, hot, car, pot, fox, puppy, wing, old
- 그림 없는 단원 단어(그림 고르기 `picture` 에 내지 않는다): big, little, small, hot, puppy, old

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | six(6, 여섯) · big(큰, 그림 없음) · little(작은, 어린, 그림 없음) · one(1, 하나) · four(4, 넷) |
| 2 | assigned | dog(개) · pig(돼지) · frog(개구리) · green(초록의, 초록색) · small(작은, 그림 없음) |
| 3 | assigned | milk(우유) · cup(컵) · doll(인형) · bus(버스) · pizza(피자) |
| 4 | assigned | drum(북, 드럼) · sun(해, 태양) · top(팽이, 꼭대기) · hot(뜨거운, 더운, 그림 없음) · car(자동차) |
| 5 | assigned | pot(냄비, 화분) · fox(여우) · puppy(강아지, 그림 없음) · wing(날개) · old(~살의, 늙은, 그림 없음) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 3 — 물고기와 배 · 학습 요소 'sh · ch · th'

- 단원 단어 25개(배정 차례 그대로): three, short, fish, two, eight, sheep, cheese, chair, orange, tall, shoe, ship, mouth, tooth, cookie, shop, shirt, shell, brush, toy, dish, lunch, thin, bath, arm
- 그림 없는 단원 단어(그림 고르기 `picture` 에 내지 않는다): short, tall, toy, lunch, thin

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | three(3, 셋) · short(짧은, 키가 작은, 그림 없음) · fish(물고기) · two(2, 둘) · eight(8, 여덟) |
| 2 | assigned | sheep(양) · cheese(치즈) · chair(의자) · orange(오렌지, 주황색) · tall(키가 큰, 높은, 그림 없음) |
| 3 | assigned | shoe(신발) · ship(배) · mouth(입) · tooth(이, 이빨) · cookie(쿠키, 과자) |
| 4 | assigned | shop(가게, 쇼핑하다) · shirt(셔츠) · shell(조개껍데기) · brush(솔, 붓) · toy(장난감, 그림 없음) |
| 5 | assigned | dish(접시, 요리) · lunch(점심, 그림 없음) · thin(얇은, 마른, 그림 없음) · bath(목욕, 욕조) · arm(팔) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 4 — 시계와 양말 · 학습 요소 '-ck · -ng · -nk'

- 단원 단어 25개(배정 차례 그대로): black, pink, long, blue, color, thank, duck, sock, truck, bird, ring, neck, rock, jacket, book, chicken, thick, clock, snack, eye, king, song, swing, bank, tree
- 그림 없는 단원 단어(그림 고르기 `picture` 에 내지 않는다): long, color, thank, thick, snack, song

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | black(검은, 검은색) · pink(분홍의, 분홍색) · long(긴, 그림 없음) · blue(파란, 파란색) · color(색, 색깔, 그림 없음) |
| 2 | assigned | thank(고마워하다, 그림 없음) · duck(오리) · sock(양말) · truck(트럭) · bird(새) |
| 3 | assigned | ring(반지, 울리다) · neck(목) · rock(바위, 돌) · jacket(재킷, 웃옷) · book(책) |
| 4 | assigned | chicken(닭, 닭고기) · thick(두꺼운, 그림 없음) · clock(시계) · snack(간식, 그림 없음) · eye(눈) |
| 5 | assigned | king(왕) · song(노래, 그림 없음) · swing(그네, 흔들다) · bank(은행) · tree(나무) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 5 — 케이크와 자전거 · 학습 요소 '묵음 e(cake · bike)'

- 단원 단어 25개(배정 차례 그대로): five, nine, white, like, banana, cake, grape, bike, kite, ball, nose, face, lake, cute, ear, nice, rose, home, game, flower, plane, snake, rice, name, smile
- 그림 없는 단원 단어(그림 고르기 `picture` 에 내지 않는다): like, cute, nice, home, game, name

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | five(5, 다섯) · nine(9, 아홉) · white(하얀, 흰색) · like(좋아하다, 그림 없음) · banana(바나나) |
| 2 | assigned | cake(케이크) · grape(포도) · bike(자전거) · kite(연) · ball(공) |
| 3 | assigned | nose(코) · face(얼굴) · lake(호수) · cute(귀여운, 그림 없음) · ear(귀) |
| 4 | assigned | nice(좋은, 멋진, 그림 없음) · rose(장미) · home(집, 그림 없음) · game(놀이, 게임, 그림 없음) · flower(꽃) |
| 5 | assigned | plane(비행기) · snake(뱀) · rice(밥, 쌀) · name(이름, 그림 없음) · smile(미소, 웃다) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

## 7. 단계 어휘 범위(vocab 1단계)

수업의 영어(보기 · 낱말 · 허용 정답 · 미리보기 예문)는 아래 낱말(활용형 포함)만 쓴다(제안 — 검증기는 쓰기 칸의 범위 밖 비율을 세지 않지만 정본 3.4 단계 어휘 범위의 뜻이다). 문항의 답 낱말 · 보기 · `word` 는 아래 내용어의 원형이다. 활용형(`cats`)과 기능어는 문항 낱말로 쓰지 않고 예문에만 쓴다.

흔한 낱말도 2단계 이상이면 쓰지 않는다. 2단계: have · can · very · here · play · run · jump · want · mom · dad · friend · good · happy · fun · with · for · at · of. 3단계: see · look · eat · go · where · who · there · we · they · squirrel. 4단계: too · day · so. 5단계: but. 6단계: some · brown. purple 은 vocab 에 없다.

**기능어 32개**(문항 낱말로 쓰지 않고 예문에만 쓴다): `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 [am, is, are, was, were, been, being] · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) [does, did, done, doing] · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의

- **쓰기 단원 0 (알파벳 친구들)**: `ant` 개미 [ants] · `bear` 곰 [bears] · `cow` 소 [cows] · `door` 문 [doors] · `elephant` 코끼리 [elephants] · `fork` 포크 [forks] · `guitar` 기타 [guitars] · `horse` 말 [horses] · `insect` 곤충 [insects] · `juice` 주스 · `key` 열쇠 [keys] · `lion` 사자 [lions] · `monkey` 원숭이 [monkeys] · `nurse` 간호사 [nurses] · `octopus` 문어 [octopuses] · `piano` 피아노 [pianos] · `queen` 여왕 [queens] · `robot` 로봇 [robots] · `star` 별 [stars] · `tiger` 호랑이 [tigers] · `umbrella` 우산 [umbrellas] · `violin` 바이올린 [violins] · `window` 창문 [windows] · `box` 상자 [boxes] · `yo-yo` 요요 [yo-yos] · `zebra` 얼룩말 [zebras]
- **쓰기 단원 1 (모자와 가방)**: `seven` 7, 일곱 · `ten` 10, 열 · `red` 빨간, 빨간색 [reds] · `yellow` 노란, 노란색 [yellows] · `cat` 고양이 [cats] · `rabbit` 토끼 [rabbits] · `apple` 사과 [apples] · `egg` 달걀 [eggs] · `candy` 사탕 [candies] · `bag` 가방 [bags] · `hat` 모자 [hats] · `cap` (챙 달린) 모자 [caps] · `pen` 펜 [pens] · `pencil` 연필 [pencils] · `bed` 침대 [beds] · `desk` 책상 [desks] · `map` 지도 [maps] · `hand` 손 [hands] · `leg` 다리 [legs] · `sand` 모래 · `jam` 잼 [jams] · `fan` 선풍기, 부채 [fans] · `lamp` 램프, 전등 [lamps] · `tent` 텐트 [tents] · `bell` 종 [bells]
- **쓰기 단원 2 (돼지와 개구리)**: `six` 6, 여섯 · `big` 큰 [bigger, biggest] · `little` 작은, 어린 · `one` 1, 하나 · `four` 4, 넷 · `dog` 개 [dogs] · `pig` 돼지 [pigs] · `frog` 개구리 [frogs] · `green` 초록의, 초록색 [greens] · `small` 작은 [smaller, smallest] · `milk` 우유 · `cup` 컵 [cups] · `doll` 인형 [dolls] · `bus` 버스 [buses] · `pizza` 피자 [pizzas] · `drum` 북, 드럼 [drums] · `sun` 해, 태양 [suns] · `top` 팽이, 꼭대기 [tops] · `hot` 뜨거운, 더운 [hotter, hottest] · `car` 자동차 [cars] · `pot` 냄비, 화분 [pots] · `fox` 여우 [foxes] · `puppy` 강아지 [puppies] · `wing` 날개 [wings] · `old` ~살의, 늙은 [older, oldest]
- **쓰기 단원 3 (물고기와 배)**: `three` 3, 셋 · `short` 짧은, 키가 작은 [shorter, shortest] · `fish` 물고기 · `two` 2, 둘 · `eight` 8, 여덟 · `sheep` 양 · `cheese` 치즈 [cheeses] · `chair` 의자 [chairs] · `orange` 오렌지, 주황색 [oranges] · `tall` 키가 큰, 높은 [taller, tallest] · `shoe` 신발 [shoes] · `ship` 배 [ships] · `mouth` 입 [mouths] · `tooth` 이, 이빨 [teeth] · `cookie` 쿠키, 과자 [cookies] · `shop` 가게, 쇼핑하다 [shops, shopped, shopping] · `shirt` 셔츠 [shirts] · `shell` 조개껍데기 [shells] · `brush` 솔, 붓 [brushes, brushed, brushing] · `toy` 장난감 [toys] · `dish` 접시, 요리 [dishes] · `lunch` 점심 · `thin` 얇은, 마른 [thinner, thinnest] · `bath` 목욕, 욕조 [baths] · `arm` 팔 [arms]
- **쓰기 단원 4 (시계와 양말)**: `black` 검은, 검은색 [blacks] · `pink` 분홍의, 분홍색 [pinks] · `long` 긴 [longer, longest] · `blue` 파란, 파란색 [blues] · `color` 색, 색깔 [colors] · `thank` 고마워하다 [thanks, thanked, thanking] · `duck` 오리 [ducks] · `sock` 양말 [socks] · `truck` 트럭 [trucks] · `bird` 새 [birds] · `ring` 반지, 울리다 [rings, rang, rung, ringing] · `neck` 목 [necks] · `rock` 바위, 돌 [rocks] · `jacket` 재킷, 웃옷 [jackets] · `book` 책 [books] · `chicken` 닭, 닭고기 [chickens] · `thick` 두꺼운 [thicker, thickest] · `clock` 시계 [clocks] · `snack` 간식 [snacks] · `eye` 눈 [eyes] · `king` 왕 [kings] · `song` 노래 [songs] · `swing` 그네, 흔들다 [swings, swung, swinging] · `bank` 은행 [banks] · `tree` 나무 [trees]
- **쓰기 단원 5 (케이크와 자전거)**: `five` 5, 다섯 · `nine` 9, 아홉 · `white` 하얀, 흰색 [whites] · `like` 좋아하다 [likes, liked, liking] · `banana` 바나나 [bananas] · `cake` 케이크 [cakes] · `grape` 포도 [grapes] · `bike` 자전거 [bikes] · `kite` 연 [kites] · `ball` 공 [balls] · `nose` 코 [noses] · `face` 얼굴 [faces] · `lake` 호수 [lakes] · `cute` 귀여운 [cuter, cutest] · `ear` 귀 [ears] · `nice` 좋은, 멋진 [nicer, nicest] · `rose` 장미 [roses] · `home` 집 [homes] · `game` 놀이, 게임 [games] · `flower` 꽃 [flowers] · `plane` 비행기 [planes] · `snake` 뱀 [snakes] · `rice` 밥, 쌀 · `name` 이름 [names] · `smile` 미소, 웃다 [smiles, smiled, smiling]

내용어는 모두 151개이고 모두 쓰기 단원 0~5 의 단원 단어다. 다른 단원의 낱말(단원 0 의 26 낱말 포함)은 이 단원에서는 단원 단어가 아닌 범위 안 낱말이다. 오답 보기 · 예문에 쓸 수 있고 `unitWords` 에는 적지 않는다. 이 목록과 기능어 밖의 낱말은 1단계 어휘 범위 밖이다.

## 8. 학습 요소 범위와 문장 꼴(정본 3.6 · C64)

쓰기 1단계 단원 요소는 철자 패턴이다(정본 3.6 쓰기 열): 단원 0 '알파벳 이름과 기본 소리'(C54 · C88) / 단원 1 '단모음 a · e' / 단원 2 '단모음 i · o · u' / 단원 3 'sh · ch · th' / 단원 4 '-ck · -ng · -nk' / 단원 5 '묵음 e(cake · bike)'. 문장 꼴 요소는 없고, 아이는 문장을 만들지 않는다. 학습 요소는 문항에 이렇게 담는다(제안).

| 단원 | 채우기 빈칸 | 고르기 오답 보기 | 채우기 예(덤 글자로 다른 낱말이 안 됨을 확인함) | 안 되는 예(괄호가 덤 글자로 생기는 낱말) |
|---|---|---|---|---|
| 0 | 첫 글자 하나. box 만 끝 글자 x(C88 — X 는 끝소리) | 첫 글자가 서로 다른 낱말(bear → bear · cow · door · ant) | `_nt` ant ← a · e · u, `bo_` box ← x · k · z | `_ear` bear ← b · d · f(dear · fear) |
| 1 | 모음 a · e 한 글자 | 글자 꼴이 비슷한 낱말 | `c_t` cat ← a · e, `t_nt` tent ← e · a | `p_n` pen ← e · a(pan), `b_d` bed ← e · a(bad) |
| 2 | 모음 i · o · u 한 글자 | 글자 꼴이 비슷한 낱말 | `m_lk` milk ← i · a, `d_ll` doll ← o · a, `p_g` pig ← a · i | `c_p` cup ← u · a(cap), `h_t` hot ← o · a · i(hat · hit) |
| 3 | 두 글자 sh · ch · th(빈칸 2) | 글자 꼴이 비슷한 낱말 | `__air` chair ← c · h · s, `__ree` three ← t · h · a | `__eep` sheep ← s · h · t(steep), `__ip` ship ← s · h · c(chip) |
| 4 | 끝 두 글자 ck · ng · nk(빈칸 2) | 글자 꼴이 비슷한 낱말 | `ne__` neck ← c · k · t, `du__` duck ← c · k · g | `tru__` truck ← c · k · n(trunk), `ba__` bank ← n · k · c(back) |
| 5 | 가운데 모음과 끝 e(빈칸 2, `c_k_`) | 글자 꼴이 비슷한 낱말 | `n_s_` nose ← o · e · i, `f_v_` five ← i · e · a | `b_k_` bike ← i · e · a(bake), `l_k_` lake ← a · e · i(like) |

- 덤 글자를 고를 때는 그 글자를 빈칸에 넣은 꼴을 하나씩 읽어 본다(빈칸이 둘이면 타일 차례를 바꾼 꼴까지). 영어 낱말이 되면 그 글자를 빼고 다른 글자를 둔다(모음 자리라도 자음 글자를 덤으로 둘 수 있다). 아이에게 맞지 않는 낱말이 되는 글자는 더욱 두지 않는다.
- 패턴 밖 낱말(P6a 근거 문서 표의 괄호 낱말 — 단원 2 one · four · green · small · pizza · car · old, 단원 3 two · eight · orange · tall · cookie · toy · arm, 단원 4 blue · color · bird · book · eye · tree, 단원 5 banana · ball · ear · flower)은 고르기 · 베끼기의 답으로 먼저 쓴다. 채우기로 낼 때는 소리와 글자가 맞는 자리 하나(첫 글자나 짧은 모음)를 비운다.
- 채우기 빈칸은 이번 단원과 같은 단계 앞 단원의 패턴 자리에만 둔다(C64 (1)). 예: 단원 1 에서 `sh` 를 비우지 않는다. 단원 0 패턴(첫 글자)은 어느 단원에서도 쓸 수 있다.

영어 문장(미리보기 예문)의 꼴(제안). 문항 글은 모두 낱말 하나라 영어 문장은 미리보기 예문뿐이다. 3.6 쓰기 열 1단계에는 문장 꼴 요소가 없으므로, 예문은 1단계 vocab 예문처럼(P6a 근거 문서 'be · like · thank 와 명사 · 형용사') 아래 꼴만 쓴다. 단원 0~5 모두 같다.

| 꼴 | 예 |
|---|---|
| `It is a/an ~.` · `It is <형용사>.` | `It is an ant.` · `It is green.` |
| `This is my ~.` | `This is my bag.` |
| `The ~ is <형용사>.` | `The sun is hot.` · `The tree is big.` |
| `I like ~.`(셀 수 없는 명사 · 복수 명사 · the + 명사) | `I like milk.` · `I like cats.` · `I like the pig.` |
| 수 + 복수 | `Two cats.` · `Ten red pens.` |
| `the + 명사`(하나뿐인 것 · 앞에 나온 것) | `It is the sun.` |
| 감탄 `Oh, ~!` · `Wow, ~!`(oh · wow 는 1단계 기능어, (제안) 한 수업에 두 번까지) | `Wow, a big tree!` |
| 인사 · 고마움 | `Thank you.` |

- 예문은 새 단어를 원형이나 활용형으로 담는다. 다른 낱말은 이 수업까지 나온 단원 단어와 단원 밖 1단계 낱말로 쓰고, 이 수업보다 뒤 배정 수업의 단원 단어는 예문에도 쓰지 않는다(제안 — 검증기는 예문을 관계 셈에서 빼지만 아이는 아직 그 낱말을 모른다).
- 쓰지 않는 꼴: 의문문(`Is it a frog?` · `What is it?`) · 명령문(`Look at ~`) · `I am ~`(2단계 단원 1, `I am ten.`) · 부르는 말(`Momo, it is a cat.`) · 3인칭 단수 -s(`Momo likes cake.`) · 문장을 잇는 and · or. 9절 표의 vocab 예문에 이런 꼴이 있으면 그대로 쓰지 않는다.

검증기가 오류로 잡는 꼴(형태 표의 쓰기 열). 쓰기 1단계에서는 형태 표(`forms.json` 58개)의 형태가 have 하나만 빼고 모두 범위 밖이다(have 는 쓰기 열에서 검출하지 않지만 2단계 낱말이라 쓰지 않는다). 아래 예는 실제 검출기로 대조했다.

| 꼴 | 걸리는 예 |
|---|---|
| he · she · we · they | `He is big.` · `We like dogs.` |
| can · can't | `I can see a dog.` |
| There is · Let's | `There is a cat.` · `Let's go.` |
| be 부정(isn't · is not + 낱말) | `It is not a cat.` 짧은 답 `No, it isn't.` 은 걸리지 않는다 |
| 진행형 · 동명사 · 규칙 과거 -ed | `I am smiling.` · `I like swinging.` · `I liked it.` |
| some · at + 수(시각) · don't | `Some apples.` · `It is at five.` · `I don't like it.` |
| 그 밖 | does · was · were · because · will · 비교급 등 4단계 이상 꼴 |

검출기가 못 잡지만 쓰지 않는 꼴은 위 '쓰지 않는 꼴'이다(`Is it a frog?` · `Do you like cats?` · `Look at the cat.` · `Where is the cat?` · `Momo likes cake.` 은 검출기를 지나간다).

## 9. 그림 규칙

- 고르기의 `picture` 는 아래 표의 낱말 id 로만 낸다. 그림 키가 없는 낱말을 내면 검증기 `image` 오류다. 그림 없는 단원 단어(6절)는 베끼기 · 채우기의 답이나 오답 보기 글로 쓴다.
- 채우기는 `word` 의 그림을 보인다(그림 없는 낱말은 한국어 뜻 글). 그래서 `word` 는 vocab 낱말 원형으로 쓴다.
- 헷갈리는 짝(P6b 검토 I-4 · N-4)은 같은 고르기 문항의 보기에 함께 두지 않는다. 그림은 하나인데 두 보기가 다 맞아 보이기 때문이다. 쓰기 1단계 단원 안의 짝: ant · insect(단원 0), hat · cap(단원 1 배정 3 에 함께 나온다), cup · milk(단원 2 배정 3), face · smile(단원 5). 단원을 넘는 짝: face · neck, leg · knee, foot · toe, hand · finger, arm · strong, face · head, bird · fly, cup · water, jacket · coat, pants · jeans, girl · doll, head · hair, tired · sleepy, student · boy, student · girl, kick · soccer(1단계 밖 낱말은 어차피 보기에 오지 않는다).
- 정답이 둘 이상 맞을 수 있는 보기를 두지 않는다. 수 낱말(one~ten)의 그림은 숫자 키캡이고(물건 여러 개 그림이 아님), 색 낱말의 그림은 색 동그라미다(orange 는 주황 동그라미, 과일 아님).
- 그림이 붙는 문장(미리보기 예문)은 그림의 색 · 모습과 맞춘다. 표의 '그림 · 맞출 것' 칸에 색이 없으면 색을 붙이지 않는다. '색을 말하지 않는다'고 적힌 낱말에도 붙이지 않는다.
- 관사 · 수를 그림과 맞춘다(제안, 표본 R-x · R-h · S-h 가 짚은 빈칸).

| 낱말 | 예문 꼴 | 쓰지 않는 꼴 |
|---|---|---|
| milk · juice · rice · sand · jam(컵 · 팩 · 밥 · 더미 · 병 그림, 셀 수 없게 쓴다) | 관사 없이: `I like milk.` · `It is jam.` | `a milk` · `It is a rice.` |
| cake · pizza · cheese(한 조각 그림) | 관사 없이: `I like cake.` · `It is pizza.` · `The cheese is yellow.` | `It is a cake.` · `a pizza` |
| sun | `the sun`: `The sun is hot.` · `It is the sun.` | `a sun` · `It is a sun.` |
| grape(송이 그림) | 복수: `I like grapes.` · `Oh, grapes!` | `a grape` · `It is a grape.` |
| 수 낱말 | 수 + 복수: `Two cats.` · `Ten red pens.` | 숫자 글자(`2 cats`), `I am ten.` |

- 예문 칸은 그림 색 · 모습의 참고다. 8절 꼴에 맞지 않으면(`Is it a frog?` · `I am ten.`) 그대로 쓰지 않는다.

그림이 있는 1단계 낱말 128개(쓰기 단원 차례, 아래 표 밖의 낱말은 고르기 그림으로 낼 수 없다).

| 낱말 | 그림 키 | 그림 · 맞출 것 | 그림과 맞는 예문(P6b vocab) |
|---|---|---|---|
| ant | `ant` | 개미(insect 와 짝 피함) | An ant is small. |
| bear | `bear` | 곰 얼굴(BEAR FACE) | The bear is big. |
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
| box | `box` | 소포 상자(PACKAGE) | It is a big box. |
| yo-yo | `yo-yo` | 빨간 요요(예문 My yo-yo is red.) | My yo-yo is red. |
| zebra | `zebra` | 얼룩말 얼굴(ZEBRA FACE) | I like the zebra. |
| seven | `seven` | 숫자 키캡 7(물건 7개 그림 아님) | I like seven cookies. |
| ten | `ten` | 숫자 키캡 10(물건 10개 그림 아님) | I am ten. |
| red | `red` | 빨간 동그라미(색 뜻) | This is a red apple. |
| yellow | `yellow` | 노란 동그라미(색 뜻) | The banana is yellow. |
| cat | `cat` | 고양이 | This is my cat. |
| rabbit | `rabbit` | 회색 토끼 — 색을 말하지 않는다(흰 토끼 아님) | The rabbit is cute. |
| apple | `apple` | 빨간 사과(RED APPLE) | It is an apple. |
| egg | `egg` | 달걀 | This is an egg. |
| candy | `candy` | 사탕 | I like candy. |
| bag | `bag` | 책가방(SCHOOL SATCHEL) | This is my bag. |
| hat | `hat` | 밀짚모자 — 색을 말하지 않는다 | This is my hat. |
| cap | `cap` | 파란 야구 모자(예문 My cap is blue.) | My cap is blue. |
| pen | `pen` | 검은 볼펜(예문 It is a black pen.) | It is a black pen. |
| pencil | `pencil` | 연필 | This is my pencil. |
| bed | `bed` | 침대 | My bed is small. |
| desk | `desk` | 서랍 달린 학생 책상(위에 아무것도 없음) | This is my desk. |
| map | `map` | 세계 지도 | This is a map. |
| hand | `hand` | 손바닥을 든 손(RAISED HAND) | My hands are small. |
| leg | `leg` | 사람 다리 | My legs are long. |
| sand | `sand` | 연노랑 모래 더미 | The sand is hot. |
| jam | `jam` | 빨간 잼이 든 뚜껑 덮인 유리병 | I like jam. |
| fan | `fan` | 빨간 접는 부채(선풍기 아님) | The fan is red. |
| lamp | `lamp` | 불이 켜진 책상 스탠드 등 | This lamp is small. |
| tent | `tent` | 텐트 | It is a big tent. |
| bell | `bell` | 종 | It is a little bell. |
| six | `six` | 숫자 키캡 6(물건 6개 그림 아님) | Six eggs, please. |
| one | `one` | 숫자 키캡 1(물건 1개 그림 아님) | This is one egg. |
| four | `four` | 숫자 키캡 4(물건 4개 그림 아님) | Four apples, please. |
| dog | `dog` | 개 | My dog is big. |
| pig | `pig` | 돼지 | This is a pig. |
| frog | `frog` | 개구리 얼굴(FROG FACE) | Is it a frog? |
| green | `green` | 초록 동그라미(색 뜻) | The frog is green. |
| milk | `milk` | 컵에 든 우유(GLASS OF MILK) | Milk, please. |
| cup | `cup` | 손잡이 달린 빈 머그컵 | The cup is small. |
| doll | `doll` | 헝겊 인형 | My doll is cute. |
| bus | `bus` | 회색 · 파랑 버스 — 색을 말하지 않는다 | It is a big bus. |
| pizza | `pizza` | 피자 한 조각 | Pizza, please! |
| drum | `drum` | 북과 북채 | I like the drum. |
| sun | `sun` | 빛살 있는 해 | The sun is hot. |
| top | `top` | 빨간 나무 팽이(꼭대기 뜻 아님) | This top is red. |
| car | `car` | 자동차(AUTOMOBILE) | This is a toy car. |
| pot | `pot` | 뚜껑 덮인 빈 냄비(화분 아님) | The pot is hot. |
| fox | `fox` | 주황 여우 얼굴(FOX FACE, 예문 The fox is orange.) | The fox is orange. |
| wing | `wing` | 회백 날개 — 색을 말하지 않는다 | The bird wings are big. |
| three | `three` | 숫자 키캡 3(물건 3개 그림 아님) | Three cats are cute. |
| fish | `fish` | 물고기 | I like fish. |
| two | `two` | 숫자 키캡 2(물건 2개 그림 아님) | I like two dogs. |
| eight | `eight` | 숫자 키캡 8(물건 8개 그림 아님) | Eight balls are blue. |
| sheep | `sheep` | 양 | I like sheep. |
| cheese | `cheese` | 노란 치즈 조각(CHEESE WEDGE, 예문 The cheese is yellow.) | The cheese is yellow. |
| chair | `chair` | 갈색 나무 의자 — 색을 말하지 않는다(brown 은 1단계 밖) | This is my chair. |
| orange | `orange` | 주황 동그라미(색 뜻, 과일 아님) | My cat is orange. |
| shoe | `shoe` | 빨간 운동화(예문 I like the red shoes.) | I like the red shoes. |
| ship | `ship` | 배 | The ship is big. |
| mouth | `mouth` | 입술 | My mouth is big. |
| tooth | `tooth` | 흰 이 하나(예문 My tooth is white.) | My tooth is white. |
| cookie | `cookie` | 쿠키 | This cookie is big. |
| shop | `shop` | 줄무늬 차양 · 진열창이 있는 작은 가게 | It is a toy shop. |
| shirt | `shirt` | 파란 티셔츠 | My shirt is blue. |
| shell | `shell` | 회백 소라 껍데기 — 색을 말하지 않는다 | I like this shell. |
| brush | `brush` | 붓(칫솔 · 빗 아님) | It is my brush. |
| dish | `dish` | 음식 없는 둥근 흰 접시 | The dish is hot. |
| bath | `bath` | 욕조(BATHTUB) | The bath is hot. |
| arm | `arm` | 어깨에서 손끝까지 뻗은 팔 하나 | My arms are long. |
| black | `black` | 검은 동그라미(색 뜻) | My cat is black. |
| pink | `pink` | 분홍 동그라미(색 뜻) | The pig is pink. |
| blue | `blue` | 파란 동그라미(색 뜻) | My bag is blue. |
| duck | `duck` | 청둥오리(초록 머리 · 갈색 몸) — 색을 말하지 않는다 | This is a duck. |
| sock | `sock` | 파란 양말(노란 줄) | My socks are blue. |
| truck | `truck` | 배달 트럭 | It is a big truck. |
| bird | `bird` | 빨간 새 | The bird is red. |
| ring | `ring` | 반지 | It is a small ring. |
| neck | `neck` | 아이 윗몸에서 목을 빨간 점선 동그라미로 둘러쌈(얼굴이 보임) | My neck is short. |
| rock | `rock` | 바위 | The rock is big. |
| jacket | `jacket` | 파란 외투 그림(🧥 COAT, 예문 My jacket is blue.) | My jacket is blue. |
| book | `book` | 펼친 책 | I like this book. |
| chicken | `chicken` | 살아 있는 닭(닭고기 아님) | This is a chicken. |
| clock | `clock` | 자명종 시계 | It is a big clock. |
| eye | `eye` | 눈 하나 | My eyes are big. |
| king | `king` | 왕관 · 수염 · 빨간 망토의 동화 속 왕 윗몸 | The king is tall. |
| swing | `swing` | 빨간 자리의 빈 그네 | The swing is red. |
| bank | `bank` | 은행 건물 | It is a bank. |
| tree | `tree` | 잎 넓은 나무 | It is a big tree. |
| five | `five` | 숫자 키캡 5(물건 5개 그림 아님) | Five fish are red. |
| nine | `nine` | 숫자 키캡 9(물건 9개 그림 아님) | I am nine. |
| white | `white` | 흰 동그라미(색 뜻, 자체 그림) | The sheep is white. |
| banana | `banana` | 바나나 | I like bananas. |
| cake | `cake` | 조각 케이크(SHORTCAKE) | The cake is big. |
| grape | `grape` | 보라 포도 — 색을 말하지 않는다(purple 은 범위 밖) | I like grapes. |
| bike | `bike` | 빨간 자전거 | It is a red bike. |
| kite | `kite` | 파란 연 | It is a blue kite. |
| ball | `ball` | 빨강 · 파랑 · 노랑 띠의 고무공 — 한 색으로 말하지 않는다 | The ball is big. |
| nose | `nose` | 코 | My nose is small. |
| face | `face` | 앞을 보는 아이 얼굴, 다문 입의 무표정(빨갛지 않고 웃지 않음) | This is my face. |
| lake | `lake` | 풀 · 나무로 둘러싸인 파란 호수 | The lake is blue. |
| ear | `ear` | 사람 귀 | My ears are big. |
| rose | `rose` | 빨간 장미(예문 The rose is red.) | The rose is red. |
| flower | `flower` | 흰 꽃잎 꽃 | This flower is white. |
| plane | `plane` | 흰 비행기(예문 The plane is white.) | The plane is white. |
| snake | `snake` | 초록 뱀(예문 The snake is green.) | The snake is green. |
| rice | `rice` | 밥(COOKED RICE) | I like rice. |
| smile | `smile` | 웃는 얼굴(SMILING FACE WITH SMILING EYES) | I like your smile. |

## 10. 주제 묶음 · 변형 · 주제 겹침 · 인물

- `variant` 1 = 주제 묶음 1(동물 · 자연 · 음식 · 가족), `variant` 2 = 주제 묶음 2(놀이 · 운동 · 게임 · 우주 · 탈것). 묶음 id 와 변형 번호가 같다(C54 (3) · 첫 실행 주제 묶음).
- 단원 주제(6절)는 그대로 두고 예시 · 상황만 묶음에 맞춘다(정본 6.3).
- 같은 (kind, lessonNo) 의 두 변형은 `newWords` 가 같고 문항 갈래별 수가 같다(검증기 `topic-variants` — 5절 차례를 지키면 늘 같다).
- (제안) 두 변형은 제목 · 미리보기 예문의 상황 · 고르기 오답 보기 · 6번째 문항 낱말 · 다지기의 낱말 차례로 다르게 한다. 변형 1 은 동물 · 자연 · 음식 쪽 1단계 낱말(cat · dog · fish · tree · sun · apple · cake …), 변형 2 는 놀이 · 탈것 · 우주 쪽 1단계 낱말(ball · kite · bike · doll · drum · top · yo-yo · bus · car · ship · plane · truck · star · robot …)을 오답 보기와 예문에 먼저 고른다. 이 수업보다 뒤 배정 수업의 단원 단어는 고르지 않는다(11절).
- 한 단원 수업 26개의 제목과 상황이 서로 겹치지 않게 한다. 앞에서 쓴 제목 · 상황 목록을 적어 가며 만든다.
- 아이 이름 자리 `{NAME}` 은 쓰지 않는다. 쓰기 화면은 `{NAME}` 을 채우지 않는다(정본 6.1 의 `{NAME}` 은 회화 · AI 호출 몫). 실제 사람 이름도 쓰지 않는다.

### 인물(C124)

- 인물은 문장에 꼭 필요할 때만 넣는다. 쓰기 1단계의 영어 문장은 미리보기 예문뿐이고, 예문은 새 단어의 뜻을 보이는 짧은 문장이라 인물이 필요한 자리가 거의 없다. 기본은 이름 없이 쓴다(`It is a hat.` · `I like cats.`). 문항 답 · 보기 · 타일에는 이름이 들어가지 않는다(모두 단원 단어 낱말).
- 넣을 때는 아래 표의 이름만 쓴다. 모모 · 토리만 되풀이하지 않게 다른 인물도 가끔 쓴다. 늘 새 인물을 넣으라는 뜻은 아니다.
- 회화 선생님 이름(Mina · Leo · Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi, C117 · C122)과 실제 사람 이름 · 아이 이름 · `{NAME}` 은 쓰지 않는다. 표 밖의 이름을 새로 만들지 않는다.
- 이름을 부르는 말로 붙이지 않는다(`Momo, it is a cat.` · `A cat, Tori!`). 이름이 문장 뜻에 들어가야 한다(`This is Meg.` · `Max is a dog.`). 1단계는 he · she 와 3인칭 -s 를 못 쓰므로 `<이름> is ~` · `This is <이름>.` 꼴만 된다.

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

셀 수 있는 기준(제안, 단원 파일 하나 · 수업 N = 26): 위 표의 이름이 영어 칸(미리보기 예문 포함) 어디든 한 번이라도 나오는 수업을 n, 그 가운데 Momo 나 Tori 가 나오는 수업을 m 이라 할 때 **n ≤ 6(⌊N/4⌋) · m ≤ 3(⌊N/8⌋ 와 ⌊n/2⌋ 가운데 큰 값)** 이다. 이름을 적게 쓰면(3수업까지) 모모 · 토리만 써도 되고, 그보다 많이 쓰면 넘는 수업은 다른 인물이다(이름 수업이 6이면 셋은 다른 인물).

## 11. 수업 종류별 내용

| kind | 새 단어 | 문항 6개의 답 낱말 | 그 밖 |
|---|---|---|---|
| `alphabet`(단원 0 정규 1~5) | 6절 표 5개 | 새 단어 5개를 모두 답 낱말로 한 번씩(그림 있는 둘은 고르기, 둘은 베끼기, 하나는 채우기). 6번째(채우기)는 알파벳 1 이면 새 단어 하나를 다른 갈래로 한 번 더, 알파벳 2~5 면 앞 알파벳 수업 낱말. 채우기 빈칸은 첫 글자(box 는 끝 글자 x) | 고르기 오답 보기는 첫 글자가 서로 다른 낱말(이미 나온 단원 0 낱말이나 단원 1~5 의 1단계 낱말). 뒤 알파벳 수업의 단원 0 낱말은 보기에도 쓰지 않는다(경고 `relation-early-use`) |
| `alphabet`(단원 0 정규 6) | zebra | zebra 를 고르기 · 채우기(`_ebra`)로 두 번, 나머지 넷은 앞 알파벳 수업 낱말(u~y 글자 먼저) | |
| `alphabet`(단원 0 정규 7~10) | 없음 | 26 낱말 되짚기. (제안) 7 은 a~f, 8 은 g~m, 9 는 n~s, 10 은 t~z 글자의 낱말을 답으로(수업마다 6개, 남는 낱말은 오답 보기로) | `preview` 는 빈 목록 |
| `assigned`(배정 1~5) | 6절 표 5개 | 새 단어 5개를 모두 답 낱말로 한 번씩: 그림 있는 새 단어 둘은 고르기, 둘은 베끼기(패턴 밖 · 그림 없는 낱말 먼저), 하나는 채우기(패턴 낱말). 6번째(채우기)는 배정 1 이면 새 단어 하나를 다른 갈래로 한 번 더, 배정 2~5 면 앞 배정 수업의 패턴 낱말 하나 | 이 수업보다 뒤 배정 수업의 단원 단어는 보기 · 답 · 예문 어디에도 쓰지 않는다(경고 `relation-early-use`) |
| `reinforce`(다지기 6~10) | 없음 | 배정 1~5 의 단원 단어. (제안) 다지기 5개의 답 자리 30 을 합쳐 단원 단어 25개가 모두 답 낱말로 한 번 이상 나오게 하고, 남는 다섯 자리는 패턴 낱말에 둔다(검증기 경고 `relation-not-reused` 는 보기로만 나와도 풀리지만 '씀'은 답 낱말로 센다) | `preview` 는 빈 목록 |
| `remedial`(보강 1~3) | 없음 | (제안) 보강 1 은 배정 1 · 2 낱말(단원 0 은 a~j), 보강 2 는 배정 3 · 4 낱말(k~t), 보강 3 은 배정 5 낱말과 그림 없는 단원 단어(단원 0 은 u~z 와 앞 글자 되짚기). 그 묶음 낱말을 답 6 자리와 오답 보기 6 자리에 몰아 쓴다. 변형마다 보강 3개를 합쳐 단원 단어마다 1번 이상(`seed.remedial_coverage.1-3`) 나온다 — 모자라면 검증기 `remedial-coverage` 오류 | `preview` 는 빈 목록. 2번 이상은 수업마다 낱말 자리가 12(답 6 · 오답 보기 6)뿐이라 25 낱말을 모두 두 번 덮을 수 없다(36 < 50). 남는 자리를 패턴 낱말 · 그림 없는 낱말의 두 번째로 쓰고 셈만 보고한다 |

어느 kind 든 `unitWords` 에는 본문(보기 · `word` · 허용 정답)에 나온 이 단원의 단원 단어를 빠짐없이 적는다. 빠지면 경고 `unit-words-unlisted`, 이 단원 밖 낱말(다른 단원 낱말 포함)을 적으면 오류 `unit-words` 다. 미리보기 예문의 낱말은 세지 않는다.

보강 덮기 셈(제안): 그 변형 보강 수업 3개 가운데 그 단어가 미리보기 밖 영어 칸(보기 · `word` · 허용 정답)에 나온 수업 수다. '1번 이상'이 검증기 기준이고(검증기는 나온 횟수로 센다) '2번 이상'은 보고용이다.

## 12. 출력 규격(Zod `WritingLessonSchema` 와 1:1)

모르는 키는 거부된다. 필드 이름 · 꼴을 그대로 쓴다. 파일 겉: `{ "area": "writing", "level": 1, "unit": <단원>, "lessons": [ … ] }`.

| 필드 | 꼴 | 설명 |
|---|---|---|
| `kind` | `assigned` · `reinforce` · `remedial` · `alphabet` | 수업 종류(11절). 단원 0 의 정규는 `alphabet` |
| `lessonNo` | 1 이상 정수 | 4절 번호 규칙 |
| `variant` | 1 · 2 | 주제 변형(10절) |
| `revision` · `correction` | 0 이상 정수 | 호출 값 |
| `generation` | `{ "method": "generated", "model", "effort", "briefHash", "agentHash", "createdOn", "retries"? }` | 호출 값과 자기 모델 ID. `retries` 는 검증 뒤 고친 칸에만 그 회차 |
| `title` | 한국어 | 목록 제목, 10자 안팎, 단원 안에서 겹치지 않게 |
| `newWords` | 낱말 id 목록 | 배정표와 같은 모음, 겹침 없음 |
| `unitWords` | 낱말 id 목록 | 본문에 나온 이 단원의 단원 단어 전부(11절) |
| `preview` | `[{ "word", "meaningKo", "example" }]` | `newWords` 와 같은 낱말 모음. `meaningKo` 는 한국어 뜻(7절 뜻 참고), `example` 은 5낱말 이하 영어 한 문장(8절 꼴 · 9절 그림 맞춤) |
| `content.shape` | `"items"` | 1단계 모양 |
| `content.items` | 6개 | 5절 차례. `pick-word`: `{ "type", "picture", "options", "answerNo", "accepted" }` · `copy-tiles`: `{ "type", "word", "tiles", "accepted" }` · `fill-letters`: `{ "type", "word", "pattern", "tiles", "accepted" }` |

갈래에 없는 칸(`meaningKo` · `audioText` · `cards`)을 문항에 두면 거부된다. `guided` · `composition` 모양의 칸(`task` · `example` · `hints` · `rubric` · `sentences`)도 두지 않는다.

예시: 단원 2 배정 2 · 변형 1. 꼴을 보이는 예이니 그대로 옮기지 않는다(이 칸을 만들 때도 새로 쓴다). 해시 자리에는 호출 값을 넣는다. 이 예는 2026-10-23 에 검증기로 오류 0 · 경고 0 을 확인했다(해시는 0 으로 채워 돌림). 갈래별 할 일이 보이게 골랐다: 그림 있는 새 단어 둘(dog · frog)은 고르기, 패턴 밖 낱말 둘(green · small)은 베끼기, 패턴 낱말 pig 는 모음 채우기, 6번째는 앞 배정 수업의 패턴 낱말 little 이다. 덤 글자는 넣어 봐도 영어 낱말이 되지 않는다(pag · lattle · lettle).

```json
{
  "kind": "assigned",
  "lessonNo": 2,
  "variant": 1,
  "revision": 1,
  "correction": 0,
  "generation": {"method": "generated", "model": "claude-opus-5-5", "effort": "high", "briefHash": "<호출이 넘긴 briefHash 64자>", "agentHash": "<호출이 넘긴 agentHash 64자>", "createdOn": "2026-10-23"},
  "title": "연못가 동물 친구",
  "newWords": ["dog", "pig", "frog", "green", "small"],
  "unitWords": ["dog", "pig", "frog", "green", "small", "little"],
  "preview": [
    {"word": "dog", "meaningKo": "개", "example": "It is a dog."},
    {"word": "pig", "meaningKo": "돼지", "example": "I like the pig."},
    {"word": "frog", "meaningKo": "개구리", "example": "It is a frog."},
    {"word": "green", "meaningKo": "초록의, 초록색", "example": "It is green."},
    {"word": "small", "meaningKo": "작은", "example": "An ant is small."}
  ],
  "content": {
    "shape": "items",
    "items": [
      {"type": "pick-word", "picture": "dog", "options": ["desk", "dog", "duck", "door"], "answerNo": 2, "accepted": ["dog"]},
      {"type": "pick-word", "picture": "frog", "options": ["fan", "fork", "fish", "frog"], "answerNo": 4, "accepted": ["frog"]},
      {"type": "copy-tiles", "word": "green", "tiles": ["n", "e", "r", "g", "e"], "accepted": ["green"]},
      {"type": "copy-tiles", "word": "small", "tiles": ["l", "a", "s", "l", "m"], "accepted": ["small"]},
      {"type": "fill-letters", "word": "pig", "pattern": "p_g", "tiles": ["a", "i"], "accepted": ["pig"]},
      {"type": "fill-letters", "word": "little", "pattern": "l_ttle", "tiles": ["e", "i", "a"], "accepted": ["little"]}
    ]
  }
}
```

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말(영어 45 · 한국어 19)과 정규식 13개. 예: kill · gun · bomb · weapon · beer · wine · cigarette · drugs · stupid · idiot · dumb · shut up · hell · damn.
- 개인 정보를 묻는 말(영어 · 한국어): 사는 곳 · 집 주소 · 전화번호 · 학교 이름 · 반 · 성 · 전체 이름 · 이메일 · 비밀번호.
- 연락처 꼴: 전화번호 · 이메일 · 집 주소 · 웹 주소.
- 메타 문장(`meta-sentences.json`): the child · the user · the student · the learner · I should · I will now · as an AI · system prompt 등.
- (제안) 무섭거나 다치는 장면, 상표 · 실제 인물 · 종교 · 정치. 채우기 덤 글자를 넣어 아이에게 맞지 않는 낱말이 되는 글자(8절).
- 설계 숫자를 글에 쓰지 않는다(예: '오늘 5개 배워요').
- `{NAME}` · 실제 아이 이름 · 회화 선생님 이름(10절).

## 14. 스스로 확인과 검증 명령

파일을 다 쓴 뒤 하나씩 확인한다.

1. 수업 26개(변형 2 × (정규 10 + 보강 3)), (kind, lessonNo, variant) 겹침 없음. 단원 0 의 정규는 `alphabet` 1~10.
2. 수업마다 문항 6개가 `pick-word` 2 · `copy-tiles` 2 · `fill-letters` 2 차례이고 다른 갈래가 없다. 미리보기 예문이 5낱말 이하 한 문장이다.
3. 배정 · 알파벳 수업의 `newWords` · `preview` 가 배정표와 같고, 새 단어가 모두 문항의 답 낱말(`picture` · `word`)로 나온다.
4. 모든 영어 낱말이 7절 범위 안이고, 문항 낱말은 내용어 원형 · 소문자다.
5. 예문이 8절 꼴 안이다(검출되는 꼴과 스스로 지킬 꼴 모두).
6. 고르기: `picture` 가 9절 표 낱말, 보기 4개 · `options[answerNo − 1]` = `accepted[0]`, 헷갈리는 짝 없음, 한국어 뜻만으로 정답이 하나, 정답 자리가 고루.
7. 베끼기: 타일이 낱말 글자 전부를 섞은 한 글자 타일(차례 그대로가 아님). 채우기: `pattern` 이 `word` 와 같은 길이이고 빈칸 1~2개가 8절 자리, 타일은 한 글자, 덤 글자를 넣어 다른 영어 낱말이 되지 않는다.
8. 단원 1~5 는 다지기 5개에서 단원 단어 25개가 모두 답 낱말로 한 번 이상 나오고, 단원 0 은 알파벳 7~10 에 26 낱말이 모두 답 낱말이나 보기로 나온다. 보강 3개에 단원 단어마다 1번 이상 나온다(변형마다). 뒤 배정 · 알파벳 수업의 단원 단어가 앞 정규 수업에 없다.
9. 변형 1 · 2 의 같은 칸끼리 새 단어 · 문항 갈래 수가 같고, 제목 26개가 서로 다르다.
10. 인물 기준(10절: n ≤ 6 · m ≤ 3 · 부르는 말 없음 · 표 밖 이름 · 선생님 이름 없음)을 지키고, 13절 금지 목록에 걸리는 말이 없다.

검증 명령(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas writing --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="lessons/writing/1/<단원>.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(이 파일의 칸 수 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수)를 그대로 적어 둔다. 보고의 '첫 검증'이고 표본 비교(S10)에 쓴다.
- 오류가 있으면 그 칸만 고치고 다시 검증한다. 고친 칸의 `generation.retries` 에 회차를 적는다. 고침은 2회(`seed.max_retries`)까지다. 그래도 남으면 멈추고 남은 오류를 보고한다.
- 경고(`unit-words-unlisted` · `relation-early-use` · `relation-not-reused` · 분포)도 고친다. 남기면 까닭을 보고한다.
- `unchecked`(풀이 검사 안 됨)와 `empty`(빈 칸)는 이 단계의 일이 아니다.
- 검증기가 잡지 못하는 것: 두 글자 타일 · 대문자 타일(5절), 덤 글자로 생기는 다른 낱말(8절), 헷갈리는 짝 · 인물 기준. 이것은 스스로 확인으로만 지킨다.

## 15. 근거 한 줄

쓰기 1단계는 소리와 철자를 이어 낱말을 알아보고(고르기) 보고 쓰고(베끼기) 빠진 글자를 채워 쓰는 단계다([4영02-02] · [4영02-03], 정본 3.3 [4영02-03] · [4영02-05], CEFR Pre-A1 Overall written production). 그래서 문항은 모두 낱말 하나이고, 채우기 빈칸은 그 단원 철자 패턴 자리이며, 아이는 문장을 만들지 않는다.

## 16. 보고 꼴

마지막 답장(파일로 쓰지 않는다)에 이 차례로 쓴다.

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값>
파일: <뿌리>/lessons/writing/1/<단원>.json · 수업 <n>(정규 <n> · 보강 <n>) · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
첫 검증: 칸 <n> · 오류 칸 <n> · 규칙별 <rule n, …> · 경고 <n>
고침: <회차마다 고친 칸 · 남은 오류>
문항: 수업마다 pick-word <n> · copy-tiles <n> · fill-letters <n> · 고르기 정답 자리 1~4 <n · n · n · n>
보강 덮기: 변형마다 단원 단어 가운데 보강 수업 1개 이상에 나온 단어 <n> · 2개 이상 <n> · 답 낱말로 나온 단어 <n>
인물: 이름이 나온 수업 <n> · 그 가운데 Momo · Tori 수업 <n> · 쓴 이름 <…>
스스로 확인: 14절 1~10 각각 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 2 | 파일 안 수업 차례(변형 1 → 2, 정규 → 보강) | 정본 · 검증기에 차례 규칙이 없다 |
| 5 | 수업마다 고르기 2 → 베끼기 2 → 채우기 2 | 3.3 표의 과제 차례(고르기 · 베끼기 · 채우기)대로 알아보기에서 쓰기로 올라간다. 갈래마다 둘이라 변형 · 수업 사이 분량 서명이 늘 같고, 단계 평가(testMix 고르기 6 · 베끼기 4 · 채우기 10)의 세 갈래를 수업마다 만난다 |
| 5 | 고르기 보기 4개 | level-specs 는 갈래만 정하고 보기 수가 없다. 읽기 문제 · 말하기 듣기와 같은 수라 가로 화면에서 2 × 2 로 놓이고, 보강 수업의 낱말 자리(12)가 단원 단어 25 를 덮을 여유가 된다(보기 3이면 30 자리로 여유 5) |
| 5 | 베끼기 덤 타일 없음 · 6글자까지 | 베끼기는 보이는 낱말을 차례대로 놓는 일이다. 덤 타일로 고르게 하는 일은 2단계 build-tiles(뜻만 보고 만들기) 몫이다. 7~8글자 낱말은 타일 줄이 길어 1단계 아이에게 무겁다 |
| 5 | 채우기 빈칸 1~2개 · 덤 글자 1~2장 | b_ll 예(3.3)가 한 글자다. 두 글자 패턴(sh · ck)과 묵음 e(c_k_)는 둘이 필요하다 |
| 8 | 단원별 채우기 빈칸 자리 · 고르기 오답 꼴 | 3.6 쓰기 1단계 요소가 철자 패턴인데 정본에 문항으로 담는 법이 없다 |
| 8 | 미리보기 예문 꼴(1단계 vocab 예문 꼴, 단원 0~5 같음) | 3.6 쓰기 열 1단계에 문장 꼴 요소가 없는데 6.3 은 미리보기 예문을 요구한다. 예문은 아이가 만들지 않고 보고 듣는 글이라 1단계 vocab 예문 꼴(P6a)을 따랐다 |
| 8 · 9 | 감탄 꼴 · the + 명사 · 관사 · 수와 그림 표 | 읽기 · 말하기 표본 보고가 꼴 표 밖이라고 짚은 꼴(셀 수 없는 명사 · grape 송이 · cake 조각 · the sun · 감탄)을 같은 규칙으로 정했다 |
| 10 | 변형마다 오답 보기 · 예문 낱말을 묶음 쪽에서 | 쓰기 1단계 문항은 낱말뿐이라 변형이 제목에만 남기 쉽다(말하기 표본 S-h 보고) |
| 10 | 인물 이름 표 일곱과 기준 n ≤ ⌊N/4⌋ · m ≤ max(⌊N/8⌋, ⌊n/2⌋) | C124 의 '필요할 때만 · 모모 · 토리만 되풀이하지 않게'를 셀 수 있게 했다. 수업 단위로 세는 까닭: 아이는 수업 하나를 한 세션으로 만나 '모든 예문에 모모 · 토리'가 수업마다 이름이 나오는 것으로 보이고, 영역마다 문장 수가 크게 달라 문장 비율은 영역끼리 견줄 수 없다. 값의 까닭: C124 가 걸린다고 본 말하기 1 표본 단원 1(26수업 모두)과 걸리지 않는다고 본 읽기 1 단원 1(1수업) 사이에서, 1단계 꼴은 이름 없이 다 되므로 변형마다 13수업 가운데 3수업쯤이면 '필요할 때'를 덮는다. 이름: 짧고 소리 나는 대로 읽히는 이름(자음 · 단모음 · 자음, 쓰기 1 단원 1 · 2 패턴), 영어 음성이 흔히 아는 이름, vocab 낱말 · 금지어 · 선생님 명단과 겹치지 않음(코드로 확인), 한국어 표기가 다른 말로 읽히지 않음(Sam '샘' · Pom '폼' 뺌), 실제 인물 · 상표 이름이 아님 |
| 11 | 알파벳 · 배정 · 다지기 · 보강의 답 낱말 나누기, 알파벳 7~10 의 글자 묶음 | 6.3 '몰아서 다룰 단원 어휘 묶음'의 나누는 법과 알파벳 수업 꼴(C88 은 읽기 꼴)이 쓰기에는 정본에 없다 |
| 11 | 다지기에서 단원 단어 모두를 답 낱말로 | '씀'은 문항의 답 낱말로만 세어진다(앱 단어별 정오). 보기로만 나온 낱말은 다시 쓴 것이 아니다 |
| 11 | 보강 덮기 셈법(나온 보강 수업 수) | 정본 · 검증기는 '나온 수'만 말한다. 읽기 표본 보고가 셈법이 없다고 짚었다 |
| 13 | 무서운 장면 · 상표 · 실제 인물 · 종교 · 정치 · 덤 글자로 생기는 맞지 않는 낱말 금지 | 금지어 목록 밖의 내용 기준이 정본에 없다 |
