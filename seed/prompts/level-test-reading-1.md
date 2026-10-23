# 생성 브리프 — 읽기 1단계 단계 평가(`level-test-reading-1`)

이 파일은 읽기 1단계 단계 평가 묶음의 프롬프트 판이다(정본 6.3 — 단계 평가 문항 묶음은 영역 × 단계마다 하나). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 평가 문항 세 벌(level.test_forms 3 × 20문항 = 60문항)을 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 숫자와 규칙은 저장소 파일에서 옮겼다. 정본에 없는 값은 '(제안)'으로 적었고 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 이 묶음을 처음부터 다시 만든다.

**수업이 아니라 평가다.** 단원 5 를 통과한 아이가 1단계에서 배운 것을 처음 보는 글로 확인한다. 그래서 1단계 수업(이미 만든 156수업)의 지문 문장 · 문제와 겹치지 않아야 하고(검증기가 막는다), 세 벌은 서로 다른 문항이면서 같은 틀(나란한 벌)이어야 한다.

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 영역 · 단계 | `reading` · 1 · CEFR Pre-A1 · 구간 `1-3` · 단계 평가 |
| 틀 | `seed/prompts/_template.md`(절 번호 그대로, 평가에 없는 칸은 그 절에 적음) |
| 만든 날 · 만든 이 | 2026-10-23 첫 판 · 학습 설계자(cur-p08 평가) |
| 옮긴 곳 | `seed/level-specs.json`(reading 1 · testMix) · `settings.json`(level.*) · `unit-specs.json` · `vocab.json` · `images.json` · `lists/forms.json` · `lists/forbidden.json` · `lists/meta-sentences.json` · `src/core/seed/schema/assessment.ts`(문항 규격) · `check-assessment.ts`(평가 검사 · 겹침) · `solve-check.ts`(풀이 검사가 보는 칸) · `structure.ts`(칸 키 · 파일 경로 · READING_OPTIONS) · `reading-1.md` 7 · 8 · 9절(어휘 · 꼴 · 그림 표, 같은 시드에서 뽑은 것) · 정본 3.2 단계 평가 · 3.3 읽기 · 3.6 · 6.3 단계 평가 행 · 6.4 단계 평가 · 13절 C4 · C54 · C66 · C68 · C124 · C126 · C128 · 장부 'P8 · P12 평가 지문 그림 줄' · 'P8 그림 문항 규칙' |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 뿌리 폴더 | `seed` 또는 표본 폴더 | 쓸 파일 `<뿌리>/level-tests/reading/1.json` |
| briefHash · agentHash · effort · createdOn | 64자 · 64자 · `high` · `2026-10-23` | 보고에만 적는다(아래) |
| revision · correction | `2` · `0` | 모든 문항 |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

- 쓰는 파일은 **수업 파일이 아니라 이 평가 파일 하나**다. 생성 정의의 '브리프가 정한 파일 하나'가 이 파일이다. 다른 파일은 만들거나 고치지 않는다.
- 평가 문항 규격에는 `generation` 칸이 없다(넣으면 거부된다). 모델 ID · effort · 해시 · 날짜는 파일에 쓰지 않고 보고(16절)에 적는다. 컨트롤러가 seed/manifest 에 옮긴다.

## 2. 할 일 한눈에

1. 6절에서 단원 1~5 의 단원 단어(그림 있는 것)를 보고, 세 벌의 **답 낱말 표**를 먼저 정한다: 단원마다 벌당 4개 × 3벌 = 12개, 한 낱말은 세 벌을 통틀어 한 번만 답이 된다(11절).
2. 벌 1 의 20문항을 5절 차례 표대로 만든다.
3. 벌 2 · 3 을 같은 차례 표(번호 → 연결 단원 · 유형)로, 다른 답 낱말 · 다른 지문으로 만든다.
4. 파일 하나 `{ "area": "reading", "level": 1, "forms": [ {"form": 1, "items": [...]}, {"form": 2, ...}, {"form": 3, ...} ] }` 에 넣는다. 문항은 번호 차례로 둔다.
5. 14절 스스로 확인 명령 → 고침(이 단계의 고침은 회차로 세지 않는다) → 검증 명령(첫 검증) → 오류 문항만 고침(2회까지) → 16절 보고.

## 3. 단계 규격과 단계 평가 규칙

| 칸 | 값 |
|---|---|
| can-do | 그림과 짝지은 단어와 짧은 문장 1~3개를 소리와 철자를 이어 읽고 뜻에 맞는 그림을 고를 수 있다 |
| CEFR | Pre-A1 |
| 문장 길이 상한 `sentenceMaxWords` | 5낱말. 지문 · prompt 의 영어 문장마다(보기는 그림 낱말 id) |
| 지문 | 수업은 문장 1~3개. 평가는 (제안) 문항마다 문장 1~2개 |
| 문항 유형 `testMix` | `picture`(그림 고르기) 20 — 벌마다 20문항 모두 |

정본 3.3 읽기 단계표 1단계 행: 지문 '단어와 짧은 문장 1~3개' · 글 '그림과 짝지은 단어 · 문장' · 문제 '그림 고르기 5문제'.

단계 평가 규칙(정본 3.2 · 6.3 · 6.4, 앱이 하는 일 — 문항이 이 규칙에 맞아야 한다):

- 단원 5 를 통과하면 수업 목록 맨 위에 단계 평가가 놓인다. 20문항(level.test_items)을 10문항씩(level.test_items_per_session) 두 세션에 나눠 본다. 번호 1~10 이 첫 세션, 11~20 이 둘째 세션이다.
- 그림 고르기는 앱이 정답 번호와 견준다(AI 없음). 맞으면 1, 아니면 0. 합이 ⌈20 × 0.8⌉ = 16(level.pass_score) 이상이면 승급한다.
- 못 넘으면 틀린 문항과 **연결 단원**(문항의 `unit`)의 보강 수업 2회 뒤 다른 벌로 다시 본다. 그래서 문항마다 그 문항이 재는 단원을 정확히 적는다.
- 벌은 3벌(level.test_forms)이다. 벌 사이에 문항이 겹치지 않는다. 벌마다 단원별 문항 수가 4(20 ÷ 단원 5)다.
- 평가 지문에는 그 단계 수업 지문과 같은 문장이 없고, 평가 문항의 (prompt, 보기 묶음)은 수업 문항과 같지 않다(6.4, 검증기 `level-test-passage-overlap` · `level-test-item-overlap`).
- 평가 화면은 지문 옆에 그림 줄을 두지 않는다(장부 'P8 · P12' — 그림이 답을 가리키지 않게). 아이는 글을 읽어야만 고른다.

근거: 2022 개정 초3~4 성취기준 [4영01-02] · [4영01-04] · [4영01-05](쉽고 간단한 단어 · 어구 · 문장을 읽고 뜻을 이해한다), CEFR Overall reading comprehension Pre-A1.

## 4. 평가 틀(`settings` · 구조 수)

| 값 | 뜻 |
|---|---|
| `level.test_items` 20 | 벌 하나의 문항 수 |
| `level.test_items_per_session` 10 | 세션 하나의 문항 수(번호 1~10 · 11~20) |
| `level.test_forms` 3 | 벌 수(`form` 1 · 2 · 3) |
| `level.pass_score` 0.8 | 통과 ⌈문항 수 × 0.8⌉ |
| 연결 단원 `unit` | 1~5. 알파벳 · 소리 단원(단원 0)은 연결 단원이 아니다 |
| 보기 수 | 4(구조 수 READING_OPTIONS, 규격이 4개만 받는다) |
| `seed.max_retries` 2 | 검증 뒤 고침 회차 상한 |

이 수는 설정값이라 아이가 보는 글(해설)에 적지 않는다.

## 5. 문항 구성(차례 표)

세 벌 모두 같은 차례 표를 쓴다(제안 — 나란한 벌: 재응시 벌이 처음 벌과 같은 틀이어야 견줄 수 있다). 세션마다 다섯 단원을 두 문항씩 본다.

| 번호 | 1 · 2 | 3 · 4 | 5 · 6 | 7 · 8 | 9 · 10 | 11 · 12 | 13 · 14 | 15 · 16 | 17 · 18 | 19 · 20 |
|---|---|---|---|---|---|---|---|---|---|---|
| 연결 단원 `unit` | 1 | 2 | 3 | 4 | 5 | 1 | 2 | 3 | 4 | 5 |
| 유형 `type` | picture | picture | picture | picture | picture | picture | picture | picture | picture | picture |

문항 하나의 칸:

| 칸 | 규칙 |
|---|---|
| `passage` | (제안) 영어 문장 1~2개, 문장마다 5낱말 이하. 연결 단원의 단원 단어(답 낱말)를 담고, 연결 단원의 꼴(8절)을 쓴다. 두 문장이면 둘째 문장에 그림 있는 다른 낱말 하나를 두어 그 낱말을 오답 보기에 넣는다(prompt 를 읽어야 고르게) |
| `prompt` | 지문에 나온 낱말 · 어구 · 문장 하나(5낱말 이하). 답 그림 하나만 가리킨다. 어구는 소문자(`a blue kite`), 문장은 지문 그대로(`My kite is blue.`) |
| `options` | 그림 있는 낱말 id 4개(9절 표). 정답 하나 + 오답 셋. 오답 가운데 둘 이상은 같은 단원의 그림 낱말로(그 단원 낱말을 가려 읽는지 본다) |
| `answerNo` | 1~4. 벌마다 정답 자리 1 · 2 · 3 · 4 를 다섯 번씩 |
| `explanationKo` | 한국어 해요체 한두 문장. 낱말의 뜻을 짚는다(`kite 는 연이에요. 연 그림을 골라요.`). 설계 숫자 · 단원 번호를 쓰지 않는다 |
| `unit` · `no` · `revision` · `correction` | 차례 표 · 호출 값 |

풀이 검사(정본 6.4)는 검증을 통과한 문항을 AI 가 정답 없이 푼다. 이 AI 가 보는 것은 지문 · prompt 와 보기 넷의 '그림: <한국어 뜻>' 뿐이다. 그래서 prompt 와 뜻만으로 보기 하나가 골라져야 한다(뜻이 겹치는 hat · cap 같은 짝을 함께 두지 않는다, 9절). 둘 이상 맞거나 앱 정답과 다르면 사람 확인으로 간다.

## 6. 단원 규격(`unit-specs` reading 1)

연결 단원 u 의 문항은 단원 u 의 단원 단어를 답으로 한다. 단원 0 낱말은 1단계 어휘 안이라 오답 보기 · 지문에 쓸 수 있지만 답이 되지 않는다.

### 단원 0 — 알파벳 친구들 · 학습 요소 '알파벳 이름과 기본 소리' (평가의 연결 단원이 아니다 — 오답 보기 · 글에만 쓴다)

- 단원 단어 26개: ant(개미) · bear(곰) · cow(소) · door(문) · elephant(코끼리) · fork(포크) · guitar(기타) · horse(말) · insect(곤충) · juice(주스) · key(열쇠) · lion(사자) · monkey(원숭이) · nurse(간호사) · octopus(문어) · piano(피아노) · queen(여왕) · robot(로봇) · star(별) · tiger(호랑이) · umbrella(우산) · violin(바이올린) · window(창문) · box(상자) · yo-yo(요요) · zebra(얼룩말)
- 그림 있는 단원 단어 26개: ant, bear, cow, door, elephant, fork, guitar, horse, insect, juice, key, lion, monkey, nurse, octopus, piano, queen, robot, star, tiger, umbrella, violin, window, box, yo-yo, zebra
- 그림 없는 단원 단어 0개(그림 보기 · 그림 칸에 내지 않는다): 없음

### 단원 1 — 간식과 장난감 · 학습 요소 'a · an + 명사'

- 단원 단어 25개: apple(사과) · egg(달걀) · banana(바나나) · milk(우유) · cake(케이크) · candy(사탕) · cookie(쿠키, 과자) · cheese(치즈) · grape(포도) · pizza(피자) · jam(잼) · rice(밥, 쌀) · snack(간식) · hat(모자) · cap((챙 달린) 모자) · sock(양말) · shoe(신발) · shirt(셔츠) · jacket(재킷, 웃옷) · ball(공) · doll(인형) · bike(자전거) · kite(연) · ring(반지, 울리다) · game(놀이, 게임)
- 그림 있는 단원 단어 23개: apple, egg, banana, milk, cake, candy, cookie, cheese, grape, pizza, jam, rice, hat, cap, sock, shoe, shirt, jacket, ball, doll, bike, kite, ring
- 그림 없는 단원 단어 2개(그림 보기 · 그림 칸에 내지 않는다): snack, game

### 단원 2 — 동물과 탈것 · 학습 요소 'This is ~'

- 단원 단어 25개: cat(고양이) · dog(개) · pig(돼지) · duck(오리) · fish(물고기) · bird(새) · rabbit(토끼) · frog(개구리) · sheep(양) · puppy(강아지) · fox(여우) · chicken(닭, 닭고기) · snake(뱀) · bus(버스) · car(자동차) · ship(배) · truck(트럭) · plane(비행기) · bed(침대) · bath(목욕, 욕조) · dish(접시, 요리) · tent(텐트) · home(집) · shop(가게, 쇼핑하다) · bank(은행)
- 그림 있는 단원 단어 23개: cat, dog, pig, duck, fish, bird, rabbit, frog, sheep, fox, chicken, snake, bus, car, ship, truck, plane, bed, bath, dish, tent, shop, bank
- 그림 없는 단원 단어 2개(그림 보기 · 그림 칸에 내지 않는다): puppy, home

### 단원 3 — 알록달록 색깔 · 학습 요소 '색 · 크기 + 명사'

- 단원 단어 25개: red(빨간, 빨간색) · blue(파란, 파란색) · yellow(노란, 노란색) · green(초록의, 초록색) · black(검은, 검은색) · white(하얀, 흰색) · pink(분홍의, 분홍색) · orange(오렌지, 주황색) · color(색, 색깔) · big(큰) · small(작은) · long(긴) · short(짧은, 키가 작은) · sun(해, 태양) · tree(나무) · flower(꽃) · rock(바위, 돌) · lake(호수) · sand(모래) · rose(장미) · shell(조개껍데기) · king(왕) · swing(그네, 흔들다) · wing(날개) · song(노래)
- 그림 있는 단원 단어 19개: red, blue, yellow, green, black, white, pink, orange, sun, tree, flower, rock, lake, sand, rose, shell, king, swing, wing
- 그림 없는 단원 단어 6개(그림 보기 · 그림 칸에 내지 않는다): color, big, small, long, short, song

### 단원 4 — 좋아하는 물건 · 학습 요소 'I like ~'

- 단원 단어 25개: like(좋아하다) · bag(가방) · pen(펜) · pencil(연필) · book(책) · cup(컵) · map(지도) · desk(책상) · chair(의자) · toy(장난감) · drum(북, 드럼) · clock(시계) · lamp(램프, 전등) · bell(종) · thank(고마워하다) · cute(귀여운) · nice(좋은, 멋진) · name(이름) · hot(뜨거운, 더운) · top(팽이, 꼭대기) · fan(선풍기, 부채) · pot(냄비, 화분) · brush(솔, 붓) · lunch(점심) · thick(두꺼운)
- 그림 있는 단원 단어 16개: bag, pen, pencil, book, cup, map, desk, chair, drum, clock, lamp, bell, top, fan, pot, brush
- 그림 없는 단원 단어 9개(그림 보기 · 그림 칸에 내지 않는다): like, toy, thank, cute, nice, name, hot, lunch, thick

### 단원 5 — 하나 둘 세기 · 학습 요소 '수 + 복수 -s'

- 단원 단어 25개: one(1, 하나) · two(2, 둘) · three(3, 셋) · four(4, 넷) · five(5, 다섯) · six(6, 여섯) · seven(7, 일곱) · eight(8, 여덟) · nine(9, 아홉) · ten(10, 열) · tall(키가 큰, 높은) · little(작은, 어린) · thin(얇은, 마른) · eye(눈) · ear(귀) · nose(코) · mouth(입) · face(얼굴) · hand(손) · leg(다리) · arm(팔) · old(~살의, 늙은) · neck(목) · tooth(이, 이빨) · smile(미소, 웃다)
- 그림 있는 단원 단어 21개: one, two, three, four, five, six, seven, eight, nine, ten, eye, ear, nose, mouth, face, hand, leg, arm, neck, tooth, smile
- 그림 없는 단원 단어 4개(그림 보기 · 그림 칸에 내지 않는다): tall, little, thin, old

## 7. 단계 어휘 범위(vocab 1단계)

지문 · prompt 의 낱말은 아래 낱말(활용형 포함)과 10절 인물 이름만 쓴다. 검증기는 평가 지문의 범위 밖 비율을 세지 않지만(6.4 — 평가 · 배치 지문에는 범위 밖 검사를 걸지 않는다) 3.4 단계 어휘 범위의 뜻이므로 범위 밖 낱말을 0 으로 둔다(14절 스스로 확인 명령이 문항마다 센다).

흔한 낱말도 2단계 이상이면 쓰지 않는다. 2단계: have · can · very · here · play · run · jump · want · mom · dad · friend · good · happy · fun · with · for · at · of. 3단계: see · look · eat · go · where · who · there · we · they · squirrel. 4단계: too · day · so. 5단계: but. 6단계: some · brown. purple 은 vocab 에 없다.

**기능어 32개**(글로서리에 넣지 않는다): `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 [am, is, are, was, were, been, being] · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) [does, did, done, doing] · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의

- **읽기 단원 0 (알파벳 친구들)**: `ant` 개미 [ants] · `bear` 곰 [bears] · `cow` 소 [cows] · `door` 문 [doors] · `elephant` 코끼리 [elephants] · `fork` 포크 [forks] · `guitar` 기타 [guitars] · `horse` 말 [horses] · `insect` 곤충 [insects] · `juice` 주스 · `key` 열쇠 [keys] · `lion` 사자 [lions] · `monkey` 원숭이 [monkeys] · `nurse` 간호사 [nurses] · `octopus` 문어 [octopuses] · `piano` 피아노 [pianos] · `queen` 여왕 [queens] · `robot` 로봇 [robots] · `star` 별 [stars] · `tiger` 호랑이 [tigers] · `umbrella` 우산 [umbrellas] · `violin` 바이올린 [violins] · `window` 창문 [windows] · `box` 상자 [boxes] · `yo-yo` 요요 [yo-yos] · `zebra` 얼룩말 [zebras]
- **읽기 단원 1 (간식과 장난감)**: `apple` 사과 [apples] · `egg` 달걀 [eggs] · `banana` 바나나 [bananas] · `milk` 우유 · `cake` 케이크 [cakes] · `candy` 사탕 [candies] · `cookie` 쿠키, 과자 [cookies] · `cheese` 치즈 [cheeses] · `grape` 포도 [grapes] · `pizza` 피자 [pizzas] · `jam` 잼 [jams] · `rice` 밥, 쌀 · `snack` 간식 [snacks] · `hat` 모자 [hats] · `cap` (챙 달린) 모자 [caps] · `sock` 양말 [socks] · `shoe` 신발 [shoes] · `shirt` 셔츠 [shirts] · `jacket` 재킷, 웃옷 [jackets] · `ball` 공 [balls] · `doll` 인형 [dolls] · `bike` 자전거 [bikes] · `kite` 연 [kites] · `ring` 반지, 울리다 [rings, rang, rung, ringing] · `game` 놀이, 게임 [games]
- **읽기 단원 2 (동물과 탈것)**: `cat` 고양이 [cats] · `dog` 개 [dogs] · `pig` 돼지 [pigs] · `duck` 오리 [ducks] · `fish` 물고기 · `bird` 새 [birds] · `rabbit` 토끼 [rabbits] · `frog` 개구리 [frogs] · `sheep` 양 · `puppy` 강아지 [puppies] · `fox` 여우 [foxes] · `chicken` 닭, 닭고기 [chickens] · `snake` 뱀 [snakes] · `bus` 버스 [buses] · `car` 자동차 [cars] · `ship` 배 [ships] · `truck` 트럭 [trucks] · `plane` 비행기 [planes] · `bed` 침대 [beds] · `bath` 목욕, 욕조 [baths] · `dish` 접시, 요리 [dishes] · `tent` 텐트 [tents] · `home` 집 [homes] · `shop` 가게, 쇼핑하다 [shops, shopped, shopping] · `bank` 은행 [banks]
- **읽기 단원 3 (알록달록 색깔)**: `red` 빨간, 빨간색 [reds] · `blue` 파란, 파란색 [blues] · `yellow` 노란, 노란색 [yellows] · `green` 초록의, 초록색 [greens] · `black` 검은, 검은색 [blacks] · `white` 하얀, 흰색 [whites] · `pink` 분홍의, 분홍색 [pinks] · `orange` 오렌지, 주황색 [oranges] · `color` 색, 색깔 [colors] · `big` 큰 [bigger, biggest] · `small` 작은 [smaller, smallest] · `long` 긴 [longer, longest] · `short` 짧은, 키가 작은 [shorter, shortest] · `sun` 해, 태양 [suns] · `tree` 나무 [trees] · `flower` 꽃 [flowers] · `rock` 바위, 돌 [rocks] · `lake` 호수 [lakes] · `sand` 모래 · `rose` 장미 [roses] · `shell` 조개껍데기 [shells] · `king` 왕 [kings] · `swing` 그네, 흔들다 [swings, swung, swinging] · `wing` 날개 [wings] · `song` 노래 [songs]
- **읽기 단원 4 (좋아하는 물건)**: `like` 좋아하다 [likes, liked, liking] · `bag` 가방 [bags] · `pen` 펜 [pens] · `pencil` 연필 [pencils] · `book` 책 [books] · `cup` 컵 [cups] · `map` 지도 [maps] · `desk` 책상 [desks] · `chair` 의자 [chairs] · `toy` 장난감 [toys] · `drum` 북, 드럼 [drums] · `clock` 시계 [clocks] · `lamp` 램프, 전등 [lamps] · `bell` 종 [bells] · `thank` 고마워하다 [thanks, thanked, thanking] · `cute` 귀여운 [cuter, cutest] · `nice` 좋은, 멋진 [nicer, nicest] · `name` 이름 [names] · `hot` 뜨거운, 더운 [hotter, hottest] · `top` 팽이, 꼭대기 [tops] · `fan` 선풍기, 부채 [fans] · `pot` 냄비, 화분 [pots] · `brush` 솔, 붓 [brushes, brushed, brushing] · `lunch` 점심 · `thick` 두꺼운 [thicker, thickest]
- **읽기 단원 5 (하나 둘 세기)**: `one` 1, 하나 · `two` 2, 둘 · `three` 3, 셋 · `four` 4, 넷 · `five` 5, 다섯 · `six` 6, 여섯 · `seven` 7, 일곱 · `eight` 8, 여덟 · `nine` 9, 아홉 · `ten` 10, 열 · `tall` 키가 큰, 높은 [taller, tallest] · `little` 작은, 어린 · `thin` 얇은, 마른 [thinner, thinnest] · `eye` 눈 [eyes] · `ear` 귀 [ears] · `nose` 코 [noses] · `mouth` 입 [mouths] · `face` 얼굴 [faces] · `hand` 손 [hands] · `leg` 다리 [legs] · `arm` 팔 [arms] · `old` ~살의, 늙은 [older, oldest] · `neck` 목 [necks] · `tooth` 이, 이빨 [teeth] · `smile` 미소, 웃다 [smiles, smiled, smiling]

내용어는 모두 151개다. 이 목록과 기능어 밖의 낱말은 1단계 어휘 범위 밖이다.

## 8. 학습 요소 범위와 문장 꼴(정본 3.6 · C54 ㅅ)

평가 글의 범위는 그 단계까지 전부다(C54 ㅅ — 평가 · 배치는 그 단계까지). 1단계 다섯 요소는 단원 차례대로 `a · an + 명사` / `This is ~` / `색 · 크기 + 명사` / `I like ~` / `수 + 복수 -s` 다. 연결 단원 u 의 문항은 단원 u 의 꼴을 꼭 담고, 다른 1단계 꼴을 함께 써도 된다.

검증기의 형태 표에는 1단계 요소 검출기가 없다. 아래 '쓸 수 있는 꼴'은 생성자가 스스로 지킨다(`reading-1.md` 8절과 같은 표).

| 단원 | 쓸 수 있는 꼴 | 예 |
|---|---|---|
| 1 | `a/an + 명사` 어구, `It is a/an ~.`, 명사 `and` 명사 | `It is an egg.` · `A cake and an apple.` |
| 2 | `This is a/an ~.` · `This is my ~.` · `That is a/an ~.` · `That is my ~.` | `That is my bus.` |
| 3 | 색 · 크기 + 명사, `It is red.` · `The ~ is big.` · `My ~ is red.` | `A red rose.` · `My kite is blue.` |
| 4 | `I like the ~.` · `I like my ~.` · `I like it.` · `I like` + 셀 수 없는 명사 | `I like the drum.` · `I like milk.` |
| 5 | 수 + 복수 -s, `I like` + 복수 명사, `My ~s are ~.` | `Two red apples.` · `My hands are small.` |

모든 단원에 더하는 꼴: `the + 명사`(하나뿐인 것 · 앞 문장에 나온 것), 감탄 `Oh, ~!` · `Wow, ~!`(oh · wow 는 1단계 기능어, (제안) 한 벌에 네 번까지). 이름을 부르는 말(`Momo, it is a cat.`)은 쓰지 않는다(10절).

`It is ~` 의 it 은 1단계에 쓰려고 형태 검출에서 일부러 뺀 낱말이다(he · she 만 2단계 단원 2 로 잡는다).

검증기가 오류로 잡는 꼴. 1단계 평가에서는 형태 표(`forms.json` 58개)의 모든 형태가 범위 밖이다(읽기 차례에서 1단계에 들어오는 형태가 없다).

| 꼴 | 걸리는 예 |
|---|---|
| he · she · we · they | `He is big.` · `We like dogs.` |
| have · has · can · can't | `I have a cat.` · `I can see a dog.` |
| There is · Let's | `There is a cat.` · `Let's go.` |
| be 부정(isn't · is not + 낱말) | `It is not a cat.` |
| 진행형 · 동명사 · 규칙 과거 -ed | `I am smiling.` · `I like swinging.` · `I liked it.` |
| some · at + 수(시각) | `Some apples.` · `It is at five.` |
| 그 밖 | don't · does · was · were · because · will · 비교급 등 4단계 이상 꼴 |

검출기가 못 잡지만 쓰지 않는 꼴: 3인칭 단수 -s(`Max likes cake.`) · `Is it ~?` · `Do you ~?` · 명령문(`Look at ~`) · 문장을 잇는 and · or · What · Where · Who 의문문. 1단계 평가의 prompt 는 질문이 아니라 지문의 낱말 · 어구 · 문장이다.

## 9. 그림 규칙

- 보기는 아래 표의 낱말 id 로만 낸다. 그림 키가 없는 낱말을 내면 검증기 `image` 오류다(C126 — 그림 있는 낱말만 그림 문항).
- 헷갈리는 짝은 같은 문항 보기에 함께 두지 않는다(P6b 검토 I-4 · N-4 · 장부 'P8 그림 문항 규칙'): ant · insect, hat · cap, cup · milk, face · smile, face · neck. 단원 밖 짝: leg · knee, foot · toe, hand · finger, arm · strong, face · head, bird · fly, cup · water, jacket · coat, pants · jeans, girl · doll, head · hair, tired · sleepy, student · boy, student · girl, kick · soccer. (제안) 뜻이 겹치는 짝도 더한다: rose · flower(장미는 꽃이다), bird · chicken · duck(닭 · 오리는 새다), happy · smile, sheep · goat.
- 그림이 붙는 글(prompt 가 가리키는 그림)은 그림의 색 · 모습과 맞춘다. 표의 '그림 · 맞출 것' 칸에 색이 없으면 색을 붙이지 않는다. '색을 말하지 않는다'고 적힌 낱말에도 붙이지 않는다.
- 그림 한 장은 물건 하나다. 수 낱말(one~ten)의 그림은 숫자 키캡이다. 수를 물으면 보기를 수 낱말로 낸다(`Seven eggs.` → 보기 seven · two · nine · five).
- 색 낱말의 그림은 색 동그라미다. 색을 물으면 보기를 색 낱말로 낸다(`My kite is blue.` 의 prompt 를 `blue` 로 두고 보기 blue · red · green · pink). orange 는 주황 동그라미(과일 아님)다.
- 정답이 둘 이상 맞을 수 있는 보기를 두지 않는다(예: prompt `a red ~` 에 빨간 그림이 둘, prompt `a bird` 에 duck).
- 관사 · 수는 그림과 맞춘다: milk · juice · rice · sand · jam 은 관사 없이, cake · pizza · cheese(한 조각 그림)는 관사 없이, sun 은 `the sun`, grape 는 송이 그림이라 `grapes`(C126 (2)).
- 예문 칸은 그림 색 · 모습의 참고다. 8절 꼴에 맞지 않으면(`Is it a frog?`) 그대로 쓰지 않는다.

그림이 있는 1단계 낱말 128개(아래 표 밖의 낱말은 보기에 낼 수 없다).

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
| red | `red` | 빨간 동그라미(색 뜻) | This is a red apple. |
| blue | `blue` | 파란 동그라미(색 뜻) | My bag is blue. |
| yellow | `yellow` | 노란 동그라미(색 뜻) | The banana is yellow. |
| green | `green` | 초록 동그라미(색 뜻) | The frog is green. |
| black | `black` | 검은 동그라미(색 뜻) | My cat is black. |
| white | `white` | 흰 동그라미(색 뜻, 자체 그림) | The sheep is white. |
| pink | `pink` | 분홍 동그라미(색 뜻) | The pig is pink. |
| orange | `orange` | 주황 동그라미(색 뜻, 과일 아님) | My cat is orange. |
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
| top | `top` | 빨간 나무 팽이(꼭대기 뜻 아님) | This top is red. |
| fan | `fan` | 빨간 접는 부채(선풍기 아님) | The fan is red. |
| pot | `pot` | 뚜껑 덮인 빈 냄비(화분 아님) | The pot is hot. |
| brush | `brush` | 붓(칫솔 · 빗 아님) | It is my brush. |
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

## 10. 주제 · 인물

- 평가에는 주제 변형이 없다(벌 3개가 그 자리다). 지문은 연결 단원의 주제(6절)에 맞춘다.
- 아이 이름 자리 `{NAME}` 은 쓰지 않는다. 실제 사람 이름도 쓰지 않는다.

### 인물(C124 · C126)

- 인물은 문장에 꼭 필요할 때만 넣는다. 1단계 꼴(`It is ~` · `This is ~` · `I like ~`)은 이름 없이 다 된다. 이름이 문장 뜻에 들어가는 자리(`This is Meg.` · `Max is a dog.`)에만 쓴다.
- 넣을 때는 아래 표의 이름만 쓴다. 모모 · 토리만 되풀이하지 않게 다른 인물도 가끔 쓴다. 늘 새 인물을 넣으라는 뜻은 아니다.
- 회화 선생님 이름(Mina · Leo · Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi, C117 · C122)과 실제 사람 · 상표 · 작품 속 인물 이름은 쓰지 않는다. 표 밖의 이름을 새로 만들지 않는다.
- 이름을 부르는 말로 붙이지 않는다(`Momo, it is a cat.` · `A cat, Tori!`).
- 고유 명사 이름이 prompt 에 들어가면 그 이름은 그림이 없으니 답 그림을 가리키는 말이 아니어야 한다(`Max is a dog.` 의 prompt 는 `a dog`).

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

셀 수 있는 기준(제안, C126 셈을 평가 벌에 옮김 — 벌 하나 N = 20문항): 위 표의 이름이 영어 칸 어디든 한 번이라도 나오는 문항 n, 그 가운데 Momo 나 Tori 가 나오는 문항 m 이 **벌마다 n ≤ 5(⌊N/4⌋) · m ≤ max(2(⌊N/8⌋), ⌊n/2⌋)** 이다. 14절 명령이 센다.

## 11. 문항 종류별 내용 — 답 낱말 · 겹침 피하기

| 규칙 | 내용 |
|---|---|
| 답 낱말 | 연결 단원의 그림 있는 단원 단어. 세 벌을 통틀어 한 낱말은 한 문항에서만 답이 된다(제안 — 벌 사이 겹침을 막고 단원 단어를 넓게 덮는다). 단원마다 12개 |
| 벌 사이 | 세 벌의 문항은 서로 다르다(검증기 `level-test-forms-overlap` 은 유형 · 지문 · prompt · 보기가 모두 같을 때 잡는다). 같은 지문 문장도 다른 벌에 다시 쓰지 않는다(제안) |
| 벌 안 | 한 벌 안에서 지문 · prompt 를 되풀이하지 않는다 |
| 수업과 | 지문 문장은 1단계 읽기 수업 지문의 어느 문장과도 같지 않다(대소문자 · 끝 문장 부호를 빼고 견줌). (prompt, 보기 넷 묶음)은 수업 문제와 같지 않다. 수업 지문은 `It is a/an ~.` · `This is my ~.` · `The ~ is ~.` · `I like the ~.` 꼴을 흔한 낱말 짝으로 많이 썼다(390문장). 같은 꼴을 쓰되 **낱말 짝을 바꾸고 두 문장을 엮어** 새 문장을 만든다(`That is my truck. This is a bus.`). 14절 명령이 수업과 같은 문장 · 문항을 알려 준다 |
| 연결 단원 | 문항의 `unit` 은 답 낱말이 든 단원이다. 꼴은 그 단원 꼴을 담는다 |
| 오답 | 같은 단원 그림 낱말 둘 이상. 지문의 다른 그림 낱말을 하나 넣는다(있으면). 9절 짝 · 정답 하나 규칙 |

## 12. 출력 규격(Zod `LevelTestFileSchema` reading · `ReadingTestItemSchema` picture 와 1:1)

모르는 키는 거부된다. 파일 겉: `{ "area": "reading", "level": 1, "forms": [ { "form": <1~3>, "items": [ … 20개 ] } ] }`.

| 필드 | 꼴 | 설명 |
|---|---|---|
| `no` | 1~20 정수 | 차례 표 번호, 벌 안에서 겹치지 않음 |
| `unit` | 1~5 정수 | 연결 단원 |
| `revision` · `correction` | 0 이상 정수 | 호출 값 |
| `type` | `"picture"` | 1단계는 그림 고르기만 |
| `passage` | 영어 | 5절 |
| `prompt` | 영어 | 5절 |
| `options` | 낱말 id 4개 | 그림 있는 낱말 |
| `answerNo` | 1~4 | 정답 번호 |
| `explanationKo` | 한국어 | 해설(규격은 선택 칸이지만 6.3 '문항마다 해설'이라 모든 문항에 둔다) |

`generation` · `title` · `kind` 같은 수업 칸은 두지 않는다.

예시: 벌 1 의 문항 셋. 꼴을 보이는 예이니 그대로 옮기지 않는다(답 낱말이 겹치게 된다). 2026-10-23 에 검증기와 14절 명령으로 오류 0 · 문제 0 을 확인했다.

```json
{
  "area": "reading",
  "level": 1,
  "forms": [
    {
      "form": 1,
      "items": [
        {"no": 1, "unit": 1, "revision": 2, "correction": 0, "type": "picture", "passage": "A cap and a sock.", "prompt": "a sock", "options": ["shoe", "sock", "cap", "doll"], "answerNo": 2, "explanationKo": "sock 은 양말이에요. cap 은 모자예요. 양말 그림을 골라요."},
        {"no": 5, "unit": 3, "revision": 2, "correction": 0, "type": "picture", "passage": "My swing is red. It is big.", "prompt": "My swing is red.", "options": ["swing", "rock", "king", "sun"], "answerNo": 1, "explanationKo": "swing 은 그네예요. 빨간 그네 그림을 골라요."},
        {"no": 9, "unit": 5, "revision": 2, "correction": 0, "type": "picture", "passage": "Seven eggs. Two big hands.", "prompt": "Seven eggs.", "options": ["two", "nine", "five", "seven"], "answerNo": 4, "explanationKo": "seven 은 7 이에요. 숫자 7 을 골라요."}
      ]
    }
  ]
}
```

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말(영어 45 · 한국어 19)과 정규식 13개. 예: kill · gun · bomb · weapon · beer · wine · cigarette · drugs · stupid · idiot · dumb · shut up · hell · damn.
- 개인 정보를 묻는 말(영어 · 한국어): 사는 곳 · 집 주소 · 전화번호 · 학교 이름 · 반 · 성 · 전체 이름 · 이메일 · 비밀번호.
- 연락처 꼴: 전화번호 · 이메일 · 집 주소 · 웹 주소.
- 메타 문장(`meta-sentences.json`): the child · the user · the student · the learner · I should · I will now · as an AI · system prompt 등.
- (제안) 무섭거나 다치는 장면, 상표 · 실제 인물 · 종교 · 정치, 정답을 지문 밖에서 흘리는 글.
- 설계 숫자 · 단원 번호 · '평가' 같은 말을 해설에 쓰지 않는다(예: '16개 맞히면 통과해요').
- `{NAME}` · 실제 아이 이름 · 회화 선생님 이름(10절).

## 14. 스스로 확인과 검증 명령

파일을 다 쓴 뒤 하나씩 확인한다.

1. 벌 3개 × 20문항, 번호 1~20, 5절 차례 표대로 연결 단원 · 유형(벌 셋이 같다).
2. 모든 영어 문장이 5낱말 이하, 지문 문장 1~2개, prompt 가 지문에 나온 글이다.
3. 답 낱말이 연결 단원의 그림 있는 단원 단어이고, 세 벌을 통틀어 겹치지 않는다(단원마다 12개).
4. 지문 · prompt 낱말이 7절 범위 안이다(범위 밖 0).
5. 8절 꼴 밖의 형태가 없다(검출되는 꼴과 스스로 지킬 꼴 모두).
6. 보기 4개가 모두 9절 표의 낱말이고, 헷갈리는 짝이 없고, prompt 와 뜻만으로 정답이 하나이며, 색 · 모습 · 관사 · 수가 그림과 맞다.
7. 벌마다 정답 자리 1~4 가 다섯 번씩이다.
8. 수업 지문과 같은 문장 · 수업 문제와 같은 (prompt, 보기 묶음)이 없고, 벌 안 · 벌 사이에 같은 지문 · prompt 가 없다.
9. 인물 기준(10절: 벌마다 n ≤ 5 · m ≤ max(2, ⌊n/2⌋) · 부르는 말 없음 · 표 밖 이름 · 선생님 이름 없음), 13절 금지 목록, 해설이 해요체 한두 문장이다.

**스스로 확인 명령**(시드 검증 전에 돌린다 — 검증기가 보지 않는 어휘 범위 · 답 낱말 겹침 · 인물 · 짝 · 나란한 벌과, 검증기가 보는 수업 겹침을 미리 본다. 이 명령의 결과로 고치는 것은 고침 회차에 넣지 않는다. 마지막 줄이 `문제 0` 이 될 때까지 고친다. 저장소 뿌리에서 돌린다):

```sh
pnpm -s exec tsx - <뿌리> reading 1 <<'EOF'
// 단계 평가 스스로 확인(브리프 14절). 사용: pnpm -s exec tsx - <뿌리> <영역> <단계> <<'EOF' … EOF
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { lessonCorpus, normalizeSentence } from "@/core/seed/check-assessment";
import { LevelTestFileSchema, type TestItem, textsOfTestItem } from "@/core/seed/schema/assessment";
import { type Lesson, LessonFileSchema, type SpeakingLesson } from "@/core/seed/schema/lesson";
import { buildLexicon, offbandWords, splitSentences, tokenize } from "@/core/seed/text";

const [root = "seed", area = "", levelText = "1"] = process.argv.slice(2);
const level = Number(levelText);
const file = `level-tests/${area}/${level}.json`;
const json = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));
const NAMES = ["Momo", "Tori", "Ben", "Meg", "Dan", "Tess", "Max", "Ted", "Gus"];
const TEACHERS = ["Mina", "Leo", "Ruby", "Sora", "Hana", "Jun", "Nabi", "Luna", "Kiki", "Lulu", "Pang", "Pipi"];
const PAIRS = ["ant insect", "hat cap", "cup milk", "face smile", "face neck", "head hair", "tired sleepy", "student boy", "student girl", "kick soccer", "leg knee", "foot toe", "hand finger", "arm strong", "face head", "bird fly", "cup water", "jacket coat", "pants jeans", "girl doll", "happy smile", "man grandfather", "woman grandmother"].map((p) => p.split(" "));
const EN = new Set(["passage", "script", "prompt", "option", "answer", "example", "hint"]);
const problems: string[] = [];
const say = (what: string, where: string, text: string) => problems.push(`[${what}] ${where} · ${text}`);
const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const sig = (q: string, options: readonly string[] = []) => JSON.stringify([norm(q), options.map(norm).sort()]);
const sentencesOf = (t: string) => splitSentences(t).map(normalizeSentence).filter((s) => s !== "");

const parsed = LevelTestFileSchema.safeParse(json(file));
if (!parsed.success || parsed.data.area === "talk") {
  console.log("규격 오류(시드 검증으로 먼저 고친다):", parsed.success ? "talk" : parsed.error.issues.slice(0, 3));
  process.exit(1);
}
const test = parsed.data;
const lexicon = buildLexicon(json("vocab.json").vocab);
const pictured = new Set<string>(json("images.json").images.map((i: { word: string }) => i.word));
const unitWords = new Map<number, Set<string>>(
  json("unit-specs.json").unitSpecs
    .filter((u: { area: string; level: number }) => u.area === area && u.level === level)
    .map((u: { unit: number; words: string[] }) => [u.unit, new Set(u.words)]),
);
const dir = join(root, "lessons", area, String(level));
const lessons = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => LessonFileSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))).lessons as Lesson[]);
const corpus = lessonCorpus(area as "reading", lessons);
const spoken = new Set<string>();
for (const lesson of lessons) {
  if (area === "speaking") {
    const c = (lesson as SpeakingLesson).content;
    for (const s of c.repeat.sentences) spoken.add(normalizeSentence(s));
    for (const l of c.listening) for (const s of sentencesOf(l.script)) spoken.add(s);
    for (const q of c.questions) for (const s of sentencesOf(q.en)) spoken.add(s);
  }
}

function answerOf(item: TestItem): string | undefined {
  switch (item.type) {
    case "picture":
      return item.options[item.answerNo - 1];
    case "pick-word":
      return item.picture;
    case "copy-tiles":
    case "fill-letters":
      return item.word;
    case "listening":
      return item.kind === "picture" ? item.options[item.answerNo - 1] : undefined;
    case "repeat": {
      const t = tokenize(item.sentence);
      return t.length === 1 ? t[0]?.text.toLowerCase() : undefined;
    }
    case "question": {
      const one = item.accepted?.map((a) => tokenize(a)).find((t) => t.length === 1);
      return one?.[0]?.text.toLowerCase();
    }
    default:
      return undefined;
  }
}

function fillings(pattern: string, tiles: readonly string[]): Set<string> {
  const out = new Set<string>();
  const blanks = [...pattern].map((c, i) => (c === "_" ? i : -1)).filter((i) => i >= 0);
  const walk = (k: number, used: boolean[], chars: string[]) => {
    if (k === blanks.length) return void out.add(chars.join(""));
    tiles.forEach((t, j) => {
      if (used[j]) return;
      const next = [...chars];
      next[blanks[k] as number] = t;
      walk(k + 1, used.map((u, n) => u || n === j), next);
    });
  };
  walk(0, tiles.map(() => false), [...pattern]);
  return out;
}

const answers = new Map<string, string[]>();
const texts = new Map<string, string>();
const layout = new Map<number, string>();
test.forms.forEach((form) => {
  let n = 0;
  let m = 0;
  const places = [0, 0, 0, 0, 0];
  for (const item of form.items as TestItem[]) {
    const at = `벌 ${form.form} · ${item.no}번(단원 ${item.unit} · ${item.type})`;
    const frags = textsOfTestItem(item).filter((f) => EN.has(f.role));
    const english = frags.map((f) => f.text).join(" \n ");
    const shape = item.type === "repeat" ? (tokenize(item.sentence).length === 1 ? "repeat-word" : "repeat-sentence") : item.type;
    const key = `${item.no}:${item.unit}:${shape}`;
    if (form.form === test.forms[0]?.form) layout.set(item.no, key);
    else if (layout.get(item.no) !== key) say("나란한 벌", at, `벌 ${test.forms[0]?.form} 의 ${layout.get(item.no) ?? "없음"} 와 다르다`);
    for (const f of frags) {
      const off = offbandWords(f.text, { lexicon, level, newWords: [], properNouns: NAMES });
      if (off.length > 0) say("어휘 범위 밖", at, `${f.path}: ${[...new Set(off)].join(", ")}`);
    }
    const words = tokenize(english).map((t) => t.text);
    if (words.some((w) => NAMES.includes(w))) n++;
    if (words.some((w) => w === "Momo" || w === "Tori")) m++;
    for (const t of TEACHERS) if (words.includes(t)) say("선생님 이름", at, t);
    const prev = texts.get(norm(english));
    if (prev) say("같은 글", at, `${prev} 와 영어 글이 같다`);
    else texts.set(norm(english), at);
    const answer = answerOf(item);
    if (answer) {
      answers.set(answer, [...(answers.get(answer) ?? []), at]);
      if (!unitWords.get(item.unit)?.has(answer)) say("연결 단원", at, `답 낱말 ${answer} 가 ${area} 단원 ${item.unit} 단원 단어가 아니다`);
    }
    if ("answerNo" in item) places[item.answerNo] = (places[item.answerNo] ?? 0) + 1;
    const options: string[] = "options" in item && Array.isArray(item.options) ? item.options : [];
    const picOptions = item.type === "picture" || (item.type === "listening" && item.kind === "picture") ? options : item.type === "pick-word" ? [item.picture, ...options] : [];
    for (const [a, b] of PAIRS) if (picOptions.includes(a as string) && picOptions.includes(b as string)) say("헷갈리는 짝", at, `${a} · ${b}`);
    if (item.type === "listening" && item.kind === "picture") {
      const rime = (w: string) => w.replace(/^[^aeiou]+/, "");
      const seen = new Map<string, string>();
      for (const o of options) {
        const r = rime(o);
        if (r.length >= 2 && seen.has(r)) say("운이 같은 보기", at, `${seen.get(r)} · ${o}`);
        seen.set(r, o);
      }
    }
    for (const o of picOptions) if (!pictured.has(o)) say("그림 없음", at, o);
    // 수업과 겹침(검증기 규칙을 먼저 본다)
    const passage = "passage" in item && typeof item.passage === "string" ? item.passage : item.type === "listening" ? item.script : "";
    for (const s of sentencesOf(passage)) if (corpus.passageSentences.has(s)) say("수업 지문과 같은 문장", at, s);
    const qsig = item.type === "picture" ? sig(item.prompt, item.options) : item.type === "listening" ? sig(item.script, item.options) : item.type === "question" ? sig(item.en) : item.type === "pick-word" ? sig(item.picture, item.options) : undefined;
    if (qsig && corpus.itemSignatures.has(qsig)) say("수업 문항과 같은 질문 · 보기", at, qsig);
    if (item.type === "repeat" && tokenize(item.sentence).length > 1 && spoken.has(normalizeSentence(item.sentence))) say("수업에서 말한 문장", at, item.sentence);
    if (item.type === "question") {
      const acc = (item.accepted ?? []).map((a) => normalizeSentence(a).replace(/[.,!?]/g, ""));
      if (acc.length < 3) say("허용 답", at, `${acc.length}개(3개 이상)`);
      if (!acc.some((a) => tokenize(a).length === 1)) say("허용 답", at, "낱말 하나 꼴이 없다");
      if (new Set(acc).size !== acc.length) say("허용 답", at, "정규화하면 같은 답이 있다");
      if (!item.ko) say("한국어 뜻", at, "ko 가 없다");
      if (!item.modelAnswer) say("바른 답", at, "modelAnswer 가 없다");
      for (const a of [...(item.accepted ?? []), item.modelAnswer ?? ""]) if (tokenize(a).some((t) => NAMES.includes(t.text))) say("말할 글의 이름", at, a);
    }
    if (item.type === "repeat" && tokenize(item.sentence).some((t) => NAMES.includes(t.text))) say("말할 글의 이름", at, item.sentence);
    if (!item.explanationKo) say("해설", at, "explanationKo 가 없다");
    if (item.type === "copy-tiles" || item.type === "fill-letters" || item.type === "pick-word") {
      const pieces = item.type === "pick-word" ? item.options : item.tiles;
      for (const p of pieces) if (p !== p.toLowerCase()) say("대문자", at, p);
    }
    if (item.type === "copy-tiles") {
      if (item.tiles.some((t) => [...t].length !== 1)) say("타일", at, "한 글자가 아닌 타일");
      if ([...item.word].sort().join("") !== [...item.tiles].sort().join("")) say("타일", at, "베끼기 타일이 낱말 글자와 다르다(덤 없음)");
      if (item.tiles.join("") === item.word) say("타일", at, "낱말 차례 그대로");
      if ([...item.word].length > 6) say("타일", at, "베끼기 낱말이 6글자를 넘는다");
    }
    if (item.type === "fill-letters") {
      const blanks = [...item.pattern].filter((c) => c === "_").length;
      if (item.tiles.some((t) => [...t].length !== 1)) say("타일", at, "한 글자가 아닌 타일");
      const extra = item.tiles.length - blanks;
      if (extra < 1 || extra > 2) say("타일", at, `덤 글자 ${extra}장(1~2장)`);
      for (const w of fillings(item.pattern, item.tiles)) if (w !== item.word && lexicon.forms.has(w)) say("덤 글자로 생기는 낱말", at, w);
    }
  }
  const limitN = Math.floor(form.items.length / 4);
  const limitM = Math.max(Math.floor(form.items.length / 8), Math.floor(n / 2));
  if (n > limitN || m > limitM) say("인물", `벌 ${form.form}`, `이름 문항 ${n}(≤ ${limitN}) · Momo · Tori 문항 ${m}(≤ ${limitM})`);
  console.log(`벌 ${form.form}: 문항 ${form.items.length} · 이름 문항 ${n} · Momo · Tori ${m} · 정답 자리 1~4 = ${places.slice(1).join(" · ")}`);
});
for (const [word, where] of answers) if (where.length > 1) say("답 낱말 겹침", word, where.join(" / "));
for (const p of problems) console.log(p);
console.log(`문제 ${problems.length}`);
EOF
```

출력의 첫 줄들은 벌마다 문항 수 · 이름 문항 n · m · 정답 자리 셈이고, `[검사 이름] 벌 · 번호 · 내용` 줄이 고칠 곳이다. `[수업 지문과 같은 문장]` · `[수업 문항과 같은 질문 · 보기]` 는 검증기도 오류로 잡는다.

**검증 명령**(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas reading --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="level-tests/reading/1.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(이 파일의 칸 60 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수)를 그대로 적어 둔다. 칸은 문항 하나(`level-test:reading:1:<벌>:<번호>`)다.
- 오류가 있으면 그 문항만 고치고 다시 검증한다. 고침은 2회(`seed.max_retries`)까지다. 그래도 남으면 멈추고 남은 오류를 보고한다.
- summary 의 `referenceErrors` 가 0 이 아니면 규격 파일 문제라 이 묶음의 일이 아니다. 고치지 않고 보고한다.
- `unchecked`(풀이 검사 안 됨)와 `empty`(다른 칸의 빈 칸)는 이 단계의 일이 아니다.
- 검증기가 잡지 못해 스스로 지킬 것: 어휘 범위 · 답 낱말 겹침 · 헷갈리는 짝 · 인물 기준 · 나란한 벌 · 정답 자리(스스로 확인 명령이 본다), 그림과 글의 색 · 모습 · 관사 · 수, 해설 말투(눈으로 본다).

## 15. 근거 한 줄

읽기 1단계 평가는 1단계 다섯 단원의 단어 · 짧은 문장을 처음 보는 글로 읽고 그림과 짝짓는지 본다([4영01-02] · [4영01-04] · [4영01-05], CEFR Pre-A1 Overall reading comprehension). 그래서 문항은 모두 그림 고르기이고, 단원마다 4문항씩 그 단원 단어와 꼴을 잰다.

## 16. 보고 꼴

마지막 답장(파일로 쓰지 않는다)에 이 차례로 쓴다.

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값> · briefHash: <호출 값 앞 8자> · agentHash: <앞 8자> · createdOn: <호출 값>
파일: <뿌리>/level-tests/reading/1.json · 벌 3 · 문항 <n> · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
스스로 확인: 처음 '문제 <n>'(규칙별 <…>) · 마지막 '문제 <n>'
첫 검증: 칸 <n> · 오류 칸 <n> · 규칙별 <rule n, …> · 경고 <n>
고침: <회차마다 고친 칸 · 남은 오류>
벌마다: 정답 자리 1~4 <n · n · n · n> · 이름 문항 n <n> · Momo · Tori m <n> · 쓴 이름 <…>
답 낱말: 단원마다 <n>(세 벌 합, 겹침 <n>)
스스로 확인 목록: 14절 1~9 각각 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 1 | 평가 파일에 생성 정보를 쓰지 않고 보고에 적음 | 평가 문항 규격에 `generation` 칸이 없다(assessment.ts). 판은 seed/manifest 가 맡는다 |
| 2 · 14 | 스스로 확인 명령으로 고친 것은 고침 회차에 넣지 않음 | 첫 검증 결과가 표본 비교 · 통과율의 기준이다. 수업 지문 390문장과 겹치지 않게 하는 일은 쓰는 중의 일이다 |
| 3 · 5 | 평가 지문은 문항마다 1~2문장 | 수업 지문(1~3문장)은 문제 5개가 함께 쓰지만 평가는 문항마다 지문이 있다. 두 문장이면 다른 그림 낱말 하나를 오답으로 두어 prompt 를 읽게 한다 |
| 5 | 세 벌 같은 차례 표(나란한 벌), 세션마다 다섯 단원 두 문항씩 | 재응시 벌을 첫 벌과 견줄 수 있고, 세션 하나만 끝낸 날에도 다섯 단원을 다 본다 |
| 5 | 정답 자리 1~4 를 다섯 번씩 | 찍기로 맞힐 몫을 고르게 한다 |
| 5 | 오답 둘 이상은 같은 단원 그림 낱말 | 그 단원 단어를 가려 읽는지가 연결 단원 판정의 뜻이다 |
| 5 · 12 | 모든 문항에 해설 | 6.3 '문항마다 … 해설', 규격은 선택 칸 |
| 8 | 감탄 꼴은 한 벌에 네 번까지 | 수업 브리프의 '한 수업 두 번'을 20문항에 맞춤 |
| 9 | 뜻이 겹치는 짝 넷 더함(rose · flower, bird · chicken · duck, happy · smile, sheep · goat) | 풀이 검사가 '그림: 꽃'과 '그림: 장미'를 둘 다 맞다고 볼 수 있다 |
| 10 | 인물 셈을 벌(20문항) 단위로 | C126 셈은 수업 단위다. 평가는 벌 하나가 아이가 보는 묶음이다 |
| 11 | 한 답 낱말은 세 벌 통틀어 한 번 | 검증기는 같은 문항만 막는다. 같은 낱말을 세 벌이 되풀이하면 재응시가 같은 시험이 된다 |
| 13 | 무서운 장면 · 상표 · 실제 인물 · 종교 · 정치 금지 | 금지어 목록 밖의 내용 기준이 정본에 없다 |
