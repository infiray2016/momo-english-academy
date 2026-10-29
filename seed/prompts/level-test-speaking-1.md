# 생성 브리프 — 말하기 1단계 단계 평가(`level-test-speaking-1`)

이 파일은 말하기 1단계 단계 평가 묶음의 프롬프트 판이다(정본 6.3 — 단계 평가 문항 묶음은 영역 × 단계마다 하나). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 평가 문항 세 벌(level.test_forms 3 × 20문항 = 60문항)을 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 숫자와 규칙은 저장소 파일에서 옮겼다. 정본에 없는 값은 '(제안)'으로 적었고 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 이 묶음을 처음부터 다시 만든다.

**수업이 아니라 평가다.** 단원 5 를 통과한 아이가 1단계에서 배운 낱말 · 짧은 문장을 따라 말하고, 듣고 그림을 고르고, 질문에 낱말로 답하는지 처음 보는 글로 확인한다. 1단계 말하기 수업(이미 만든 130수업)의 듣기 대본 · 질문과 겹치지 않아야 하고(검증기가 막는다), 따라 말할 문장도 수업에서 말한 문장과 다르게 쓴다(14절 명령이 본다).

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 영역 · 단계 | `speaking` · 1 · CEFR Pre-A1 · 구간 `1-3` · 단계 평가 |
| 틀 | `seed/prompts/_template.md`(절 번호 그대로, 평가에 없는 칸은 그 절에 적음) |
| 만든 날 · 만든 이 | 2026-10-23 첫 판 · 학습 설계자(cur-p08 평가) |
| 옮긴 곳 | `seed/level-specs.json`(speaking 1 · testMix) · `settings.json`(level.* · placement.repeat_* · speaking.answer_match_pass) · `unit-specs.json` · `vocab.json` · `images.json` · `lists/forms.json` · `lists/forbidden.json` · `lists/homophones.json` · `lists/meta-sentences.json` · `src/core/seed/schema/assessment.ts` · `check-assessment.ts` · `solve-check.ts` · `src/core/answer/check.ts` · `src/core/speech/match-rate.ts` · `speaking-1.md` 5 · 7 · 8 · 9 · 10절(일치율 · 어휘 · 꼴 · 그림 표 · 인물) · 정본 3.2 단계 평가 · 3.3 말하기 · 3.6 · 6.3 단계 평가 행 · 6.4 · 13절 C38 · C39 · C54 · C66 · C67 · C124 · C126 · C128 |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 뿌리 폴더 | `seed` 또는 표본 폴더 | 쓸 파일 `<뿌리>/level-tests/speaking/1.json` |
| briefHash · agentHash · effort · createdOn | 64자 · 64자 · `high` · `2026-10-23` | 보고에만 적는다(아래) |
| revision · correction | `2` · `0` | 모든 문항 |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

- 쓰는 파일은 **수업 파일이 아니라 이 평가 파일 하나**다. 생성 정의의 '브리프가 정한 파일 하나'가 이 파일이다.
- 평가 문항 규격에는 `generation` 칸이 없다(넣으면 거부된다). 모델 ID · effort · 해시 · 날짜는 보고(16절)에 적는다.

## 2. 할 일 한눈에

1. 6절에서 단원 1~5 의 단원 단어를 보고, 세 벌의 **답 낱말 표**를 먼저 정한다: 단원마다 벌당 셋(따라 말할 낱말 · 듣기 정답 · 질문 답) × 3벌 = 9개, 한 낱말은 세 벌을 통틀어 한 번만 답이 된다(11절). 듣기 정답은 그림 있는 낱말이다.
2. 벌 1 의 20문항을 5절 차례 표대로 만든다.
3. 벌 2 · 3 을 같은 차례 표로, 다른 답 낱말 · 다른 문장으로 만든다.
4. 파일 하나 `{ "area": "speaking", "level": 1, "forms": [ {"form": 1, "items": [...]}, … ] }` 에 넣는다. 문항은 번호 차례로 둔다.
5. 14절 스스로 확인 명령 → 고침(회차로 세지 않는다) → 검증 명령(첫 검증) → 오류 문항만 고침(2회까지) → 16절 보고.

## 3. 단계 규격과 단계 평가 규칙

| 칸 | 값 |
|---|---|
| can-do | 들은 단어 5개와 짧은 문장 5개를 따라 말하고 듣고 그림을 고르며 질문에 단어로 답할 수 있다 |
| CEFR | Pre-A1 |
| 문장 길이 상한 `sentenceMaxWords` | 5낱말. 따라 말할 문장 · 듣기 대본 · 질문 · 바른 답 · 허용 답의 영어 문장마다 |
| 문항 유형 `testMix` | `repeat` 10 · `listening` 5 · `question` 5 — 벌마다(C66). question 은 허용 답 셋 이상의 앱 채점 문항이다 |
| 듣기 보기 꼴 | `picture`(듣고 그림 고르기) |
| 질문 | 바른 답 문장 있음 · 허용 답 3개 이상 · 한국어 뜻 있음(1~4단계, C39) |
| AI 과제(발표 · 허용 답 없는 질문) | 1단계 평가에 두지 않는다(검증기 `level-test-ai`) |

정본 3.3 말하기 단계표 1단계 행: 따라 말하기 '단어 5개 + 짧은 문장 5개' · 듣기 이해 '듣고 그림 고르기 3문항' · 질문 답 '질문에 단어로 답하기 4개'.

단계 평가 규칙(정본 3.2 · 6.3 · 6.4):

- 20문항(level.test_items)을 10문항씩(level.test_items_per_session) 두 세션에 나눠 본다. 번호 1~10 이 첫 세션, 11~20 이 둘째 세션이다.
- **따라 말하기**는 배치 평가처럼 문항마다 두 번(placement.repeat_tries 2)까지 말하고, 높은 일치율이 0.8(placement.repeat_pass) 이상이면 1, 아니면 0 이다. **듣기**는 정답 번호와 견준다. **질문 답**은 앱이 허용 답 전부와 일치율로 견줘 0.8(speaking.answer_match_pass) 이상이면 1, 아니면 0 이다(C38 — AI 없음). 합이 ⌈20 × 0.8⌉ = 16(level.pass_score) 이상이면 승급한다.
- 못 넘으면 틀린 문항과 연결 단원(`unit`)의 보강 수업 2회 뒤 다른 벌로 다시 본다.
- 벌 3개 사이에 문항이 겹치지 않는다. 벌마다 단원별 문항 수가 4 다. 듣기 대본 문장은 1단계 말하기 수업 듣기 대본과 같지 않고, (대본, 보기 묶음) · 질문 글은 수업 문항과 같지 않다(6.4, 검증기 `level-test-passage-overlap` · `level-test-item-overlap`).
- 말하기는 녹음하지 않는다. 마이크가 될 때만 연다.

근거: 2022 개정 초3~4 성취기준 [4영01-01] · [4영02-01] · [4영02-04], CEFR Overall oral production · Overall oral comprehension Pre-A1.

## 4. 평가 틀(`settings` · 구조 수)

| 값 | 뜻 |
|---|---|
| `level.test_items` 20 · `level.test_items_per_session` 10 · `level.test_forms` 3 · `level.pass_score` 0.8 | 3절 |
| `placement.repeat_tries` 2 · `placement.repeat_pass` 0.8 | 평가 따라 말하기 문항의 시도 수 · 맞음 기준(3.2 '배치 평가처럼') |
| `speaking.answer_match_pass` 0.8 | 질문 답 일치율 기준 |
| 연결 단원 `unit` | 1~5(말하기에는 알파벳 단원이 없다) |
| 듣기 보기 수 | (제안) 4 |
| `seed.max_retries` 2 | 검증 뒤 고침 회차 상한 |

## 5. 문항 구성(차례 표)

세 벌 모두 같은 차례 표를 쓴다(제안 — 나란한 벌). 세션마다 다섯 단원을 두 문항씩 보고, 세션 안에서 갈래가 한 번만 바뀐다(수업 차례 따라 말하기 → 듣기 → 질문과 같은 흐름).

| 번호 | 1~5 | 6~10 | 11~15 | 16~20 |
|---|---|---|---|---|
| 유형 | `repeat` — 낱말 하나 | `listening` — 듣고 그림 고르기 | `repeat` — 짧은 문장 | `question` — 질문에 낱말로 답하기 |
| 연결 단원 | 1 · 2 · 3 · 4 · 5 | 1 · 2 · 3 · 4 · 5 | 1 · 2 · 3 · 4 · 5 | 1 · 2 · 3 · 4 · 5 |

벌마다 따라 말하기 10(낱말 5 + 문장 5 — can-do 의 '단어 5개와 짧은 문장 5개') · 듣기 5 · 질문 5(testMix).

| 갈래 | 칸 | 규칙 |
|---|---|---|
| 따라 말하기 · 낱말(1~5) | `sentence`(낱말 하나) | 연결 단원의 단원 단어 하나(원형). 소리 내기 쉬운 낱말을 먼저 고른다. 동음이의어 목록 낱말(two · four · eight 등)도 앱이 같게 보니 괜찮다 |
| 따라 말하기 · 문장(11~15) | `sentence`(3~5낱말 문장) | 연결 단원의 단원 단어와 그 단원 꼴(8절)을 담는다. 문장 끝 문장 부호를 둔다. 이름을 넣지 않는다(10절). 1단계 수업에서 따라 말한 문장 · 들은 문장 · 질문 문장과 같지 않다(14절 명령) |
| 듣기(6~10) | `kind: "picture"` · `script` · `options` · `answerNo` | `script` 는 앱이 읽어 줄 영어 한 문장(5낱말 이하). 대본은 보기 가운데 **답 그림 하나만** 가리킨다(다른 보기 낱말을 대본에 넣지 않는다 — 그림 듣기에는 질문 칸이 없다). `options` 는 그림 있는 낱말 id 4개(9절). 답은 연결 단원의 그림 있는 단원 단어. 벌마다 정답 자리 1~4 를 고루 |
| 질문(16~20) | `en` · `ko` · `modelAnswer` · `accepted` | `en` 은 답의 근거 문장 뒤의 질문(앱이 읽어 준다, 문장마다 5낱말 이하). (제안) 근거 문장을 **둘** 두고 그 가운데 하나를 묻는다(`The fan is red. The pot is hot. What is hot?`) — 방금 들은 말에서 골라 답하게 하고, 근거 문장 하나뿐인 수업 질문과 겹치지 않게 한다. `ko` 는 반말 한국어 뜻(영어 질문 아래에 보인다). `modelAnswer` 는 바른 답 한 문장. `accepted` 는 3개 이상이고 **낱말 하나 꼴을 꼭** 넣는다. 답 낱말은 연결 단원의 단원 단어 |
| 모든 문항 | `explanationKo` | 한국어 해요체 한두 문장. 따라 말하기는 뜻(`'내 눈은 검은색이야.'라는 뜻이에요.`), 듣기는 낱말 뜻, 질문은 답을 짚는다. 설계 숫자 · 단원 번호를 쓰지 않는다 |

질문 답 판정(앱, `match-rate.ts`): 일치율 = 허용 답 낱말 가운데 차례를 지켜 맞은 수 ÷ 허용 답 낱말 수, 덧붙인 말은 깎지 않는다. 견주기 전에 소문자로 바꾸고 문장 부호를 지우고 숫자를 낱말로 바꾸고 축약형을 펴고 동음이의어(two · to · too, four · for, eight · ate 등)를 같게 본다. 그래서 허용 답에 낱말 하나 꼴이 없으면 낱말로 답한 아이가 틀린다. 허용 답끼리는 정규화 뒤에도 서로 달라야 하고, 관사를 억지로 붙이거나 뺀 꼴로 수를 채우지 않는다(`speaking-1.md` 5절과 같다). 자연스러운 셋을 못 만드는 낱말은 질문 답으로 두지 않고 따라 말하기 · 듣기에 쓴다(8절 '관사 · 수 · 그림' 표 — milk 같은 셀 수 없는 낱말은 `This is ~` 꼴로만 셋이 되고, grape 는 질문 답으로 두지 않는다).

풀이 검사(정본 6.4)는 듣기 문항만 푼다. 그 AI 는 대본 글과 보기 넷의 '그림: <한국어 뜻>'만 본다(아이는 대본을 소리로만 듣는다). 따라 말하기 · 질문은 풀이 검사 대상이 아니라서 허용 답을 스스로 꼼꼼히 채운다.

## 6. 단원 규격(`unit-specs` speaking 1)

말하기 단원 단어는 읽기 · 쓰기와 다르다(영역마다 따로, 정본 3.4). 연결 단원 u 의 문항은 말하기 단원 u 의 단원 단어를 답으로 한다.

### 단원 1 — 과일 바구니 · 학습 요소 'a · an + 명사'

- 단원 단어 25개: apple(사과) · egg(달걀) · banana(바나나) · milk(우유) · cake(케이크) · candy(사탕) · cookie(쿠키, 과자) · cheese(치즈) · grape(포도) · pizza(피자) · jam(잼) · rice(밥, 쌀) · snack(간식) · sun(해, 태양) · tree(나무) · flower(꽃) · rock(바위, 돌) · lake(호수) · sand(모래) · rose(장미) · shell(조개껍데기) · king(왕) · swing(그네, 흔들다) · wing(날개) · song(노래)
- 그림 있는 단원 단어 23개: apple, egg, banana, milk, cake, candy, cookie, cheese, grape, pizza, jam, rice, sun, tree, flower, rock, lake, sand, rose, shell, king, swing, wing
- 그림 없는 단원 단어 2개(그림 보기 · 그림 칸에 내지 않는다): snack, song

### 단원 2 — 내 장난감 · 학습 요소 'This is ~'

- 단원 단어 25개: bag(가방) · pen(펜) · pencil(연필) · book(책) · cup(컵) · map(지도) · desk(책상) · chair(의자) · toy(장난감) · drum(북, 드럼) · clock(시계) · lamp(램프, 전등) · bell(종) · bus(버스) · car(자동차) · ship(배) · truck(트럭) · plane(비행기) · bed(침대) · bath(목욕, 욕조) · dish(접시, 요리) · tent(텐트) · home(집) · shop(가게, 쇼핑하다) · bank(은행)
- 그림 있는 단원 단어 23개: bag, pen, pencil, book, cup, map, desk, chair, drum, clock, lamp, bell, bus, car, ship, truck, plane, bed, bath, dish, tent, shop, bank
- 그림 없는 단원 단어 2개(그림 보기 · 그림 칸에 내지 않는다): toy, home

### 단원 3 — 내 얼굴과 몸 · 학습 요소 '색 · 크기 + 명사'

- 단원 단어 25개: red(빨간, 빨간색) · blue(파란, 파란색) · yellow(노란, 노란색) · green(초록의, 초록색) · black(검은, 검은색) · white(하얀, 흰색) · pink(분홍의, 분홍색) · orange(오렌지, 주황색) · color(색, 색깔) · big(큰) · small(작은) · long(긴) · short(짧은, 키가 작은) · eye(눈) · ear(귀) · nose(코) · mouth(입) · face(얼굴) · hand(손) · leg(다리) · arm(팔) · old(~살의, 늙은) · neck(목) · tooth(이, 이빨) · smile(미소, 웃다)
- 그림 있는 단원 단어 19개: red, blue, yellow, green, black, white, pink, orange, eye, ear, nose, mouth, face, hand, leg, arm, neck, tooth, smile
- 그림 없는 단원 단어 6개(그림 보기 · 그림 칸에 내지 않는다): color, big, small, long, short, old

### 단원 4 — 좋아하는 동물 · 학습 요소 'I like ~'

- 단원 단어 25개: like(좋아하다) · cat(고양이) · dog(개) · pig(돼지) · duck(오리) · fish(물고기) · bird(새) · rabbit(토끼) · frog(개구리) · sheep(양) · puppy(강아지) · fox(여우) · chicken(닭, 닭고기) · snake(뱀) · thank(고마워하다) · cute(귀여운) · nice(좋은, 멋진) · name(이름) · hot(뜨거운, 더운) · top(팽이, 꼭대기) · fan(선풍기, 부채) · pot(냄비, 화분) · brush(솔, 붓) · lunch(점심) · thick(두꺼운)
- 그림 있는 단원 단어 16개: cat, dog, pig, duck, fish, bird, rabbit, frog, sheep, fox, chicken, snake, top, fan, pot, brush
- 그림 없는 단원 단어 9개(그림 보기 · 그림 칸에 내지 않는다): like, puppy, thank, cute, nice, name, hot, lunch, thick

### 단원 5 — 몇 개일까 · 학습 요소 '수 + 복수 -s'

- 단원 단어 25개: one(1, 하나) · two(2, 둘) · three(3, 셋) · four(4, 넷) · five(5, 다섯) · six(6, 여섯) · seven(7, 일곱) · eight(8, 여덟) · nine(9, 아홉) · ten(10, 열) · tall(키가 큰, 높은) · little(작은, 어린) · thin(얇은, 마른) · hat(모자) · cap((챙 달린) 모자) · sock(양말) · shoe(신발) · shirt(셔츠) · jacket(재킷, 웃옷) · ball(공) · doll(인형) · bike(자전거) · kite(연) · ring(반지, 울리다) · game(놀이, 게임)
- 그림 있는 단원 단어 21개: one, two, three, four, five, six, seven, eight, nine, ten, hat, cap, sock, shoe, shirt, jacket, ball, doll, bike, kite, ring
- 그림 없는 단원 단어 4개(그림 보기 · 그림 칸에 내지 않는다): tall, little, thin, game

## 7. 단계 어휘 범위(vocab 1단계)

평가의 영어(따라 말할 말 · 듣기 대본 · 질문 · 바른 답 · 허용 답)는 아래 낱말(활용형 포함)과 10절 인물 이름만 쓴다. 범위 밖 낱말을 0 으로 둔다(14절 명령이 센다).

흔한 낱말도 2단계 이상이면 쓰지 않는다. 2단계: have · can · very · here · play · run · jump · want · mom · dad · friend · good · happy · fun · with · for · at · of. 3단계: see · look · eat · go · where · who · there · we · they · squirrel. 4단계: too · day · so. 5단계: but. 6단계: some · brown. purple 은 vocab 에 없다.

**기능어 32개**(글로서리에 넣지 않는다): `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 [am, is, are, was, were, been, being] · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) [does, did, done, doing] · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의

- **말하기 단원 1 (과일 바구니)**: `apple` 사과 [apples] · `egg` 달걀 [eggs] · `banana` 바나나 [bananas] · `milk` 우유 · `cake` 케이크 [cakes] · `candy` 사탕 [candies] · `cookie` 쿠키, 과자 [cookies] · `cheese` 치즈 [cheeses] · `grape` 포도 [grapes] · `pizza` 피자 [pizzas] · `jam` 잼 [jams] · `rice` 밥, 쌀 · `snack` 간식 [snacks] · `sun` 해, 태양 [suns] · `tree` 나무 [trees] · `flower` 꽃 [flowers] · `rock` 바위, 돌 [rocks] · `lake` 호수 [lakes] · `sand` 모래 · `rose` 장미 [roses] · `shell` 조개껍데기 [shells] · `king` 왕 [kings] · `swing` 그네, 흔들다 [swings, swung, swinging] · `wing` 날개 [wings] · `song` 노래 [songs]
- **말하기 단원 2 (내 장난감)**: `bag` 가방 [bags] · `pen` 펜 [pens] · `pencil` 연필 [pencils] · `book` 책 [books] · `cup` 컵 [cups] · `map` 지도 [maps] · `desk` 책상 [desks] · `chair` 의자 [chairs] · `toy` 장난감 [toys] · `drum` 북, 드럼 [drums] · `clock` 시계 [clocks] · `lamp` 램프, 전등 [lamps] · `bell` 종 [bells] · `bus` 버스 [buses] · `car` 자동차 [cars] · `ship` 배 [ships] · `truck` 트럭 [trucks] · `plane` 비행기 [planes] · `bed` 침대 [beds] · `bath` 목욕, 욕조 [baths] · `dish` 접시, 요리 [dishes] · `tent` 텐트 [tents] · `home` 집 [homes] · `shop` 가게, 쇼핑하다 [shops, shopped, shopping] · `bank` 은행 [banks]
- **말하기 단원 3 (내 얼굴과 몸)**: `red` 빨간, 빨간색 [reds] · `blue` 파란, 파란색 [blues] · `yellow` 노란, 노란색 [yellows] · `green` 초록의, 초록색 [greens] · `black` 검은, 검은색 [blacks] · `white` 하얀, 흰색 [whites] · `pink` 분홍의, 분홍색 [pinks] · `orange` 오렌지, 주황색 [oranges] · `color` 색, 색깔 [colors] · `big` 큰 [bigger, biggest] · `small` 작은 [smaller, smallest] · `long` 긴 [longer, longest] · `short` 짧은, 키가 작은 [shorter, shortest] · `eye` 눈 [eyes] · `ear` 귀 [ears] · `nose` 코 [noses] · `mouth` 입 [mouths] · `face` 얼굴 [faces] · `hand` 손 [hands] · `leg` 다리 [legs] · `arm` 팔 [arms] · `old` ~살의, 늙은 [older, oldest] · `neck` 목 [necks] · `tooth` 이, 이빨 [teeth] · `smile` 미소, 웃다 [smiles, smiled, smiling]
- **말하기 단원 4 (좋아하는 동물)**: `like` 좋아하다 [likes, liked, liking] · `cat` 고양이 [cats] · `dog` 개 [dogs] · `pig` 돼지 [pigs] · `duck` 오리 [ducks] · `fish` 물고기 · `bird` 새 [birds] · `rabbit` 토끼 [rabbits] · `frog` 개구리 [frogs] · `sheep` 양 · `puppy` 강아지 [puppies] · `fox` 여우 [foxes] · `chicken` 닭, 닭고기 [chickens] · `snake` 뱀 [snakes] · `thank` 고마워하다 [thanks, thanked, thanking] · `cute` 귀여운 [cuter, cutest] · `nice` 좋은, 멋진 [nicer, nicest] · `name` 이름 [names] · `hot` 뜨거운, 더운 [hotter, hottest] · `top` 팽이, 꼭대기 [tops] · `fan` 선풍기, 부채 [fans] · `pot` 냄비, 화분 [pots] · `brush` 솔, 붓 [brushes, brushed, brushing] · `lunch` 점심 · `thick` 두꺼운 [thicker, thickest]
- **말하기 단원 5 (몇 개일까)**: `one` 1, 하나 · `two` 2, 둘 · `three` 3, 셋 · `four` 4, 넷 · `five` 5, 다섯 · `six` 6, 여섯 · `seven` 7, 일곱 · `eight` 8, 여덟 · `nine` 9, 아홉 · `ten` 10, 열 · `tall` 키가 큰, 높은 [taller, tallest] · `little` 작은, 어린 · `thin` 얇은, 마른 [thinner, thinnest] · `hat` 모자 [hats] · `cap` (챙 달린) 모자 [caps] · `sock` 양말 [socks] · `shoe` 신발 [shoes] · `shirt` 셔츠 [shirts] · `jacket` 재킷, 웃옷 [jackets] · `ball` 공 [balls] · `doll` 인형 [dolls] · `bike` 자전거 [bikes] · `kite` 연 [kites] · `ring` 반지, 울리다 [rings, rang, rung, ringing] · `game` 놀이, 게임 [games]
- **말하기 단원 밖의 1단계 낱말(읽기 · 쓰기 알파벳 단원 낱말 — 범위 안이지만 말하기 단원 단어가 아니다)**: `ant` 개미 [ants] · `bear` 곰 [bears] · `cow` 소 [cows] · `door` 문 [doors] · `elephant` 코끼리 [elephants] · `fork` 포크 [forks] · `guitar` 기타 [guitars] · `horse` 말 [horses] · `insect` 곤충 [insects] · `juice` 주스 · `key` 열쇠 [keys] · `lion` 사자 [lions] · `monkey` 원숭이 [monkeys] · `nurse` 간호사 [nurses] · `octopus` 문어 [octopuses] · `piano` 피아노 [pianos] · `queen` 여왕 [queens] · `robot` 로봇 [robots] · `star` 별 [stars] · `tiger` 호랑이 [tigers] · `umbrella` 우산 [umbrellas] · `violin` 바이올린 [violins] · `window` 창문 [windows] · `box` 상자 [boxes] · `yo-yo` 요요 [yo-yos] · `zebra` 얼룩말 [zebras]

내용어는 모두 151개다. 이 목록과 기능어 밖의 낱말은 1단계 어휘 범위 밖이다.

## 8. 학습 요소 범위와 문장 꼴(정본 3.6 · C54 ㅅ)

평가 글의 범위는 1단계 전부다(C54 ㅅ). 연결 단원 u 의 문장은 단원 u 의 꼴을 꼭 담고, 다른 1단계 꼴을 함께 써도 된다(`speaking-1.md` 8절과 같은 표. 질문 꼴은 요청자가 말하기 1 표본 판정(2026-10-23 07:4x)에서 '그대로'로 본 꼴이다).

| 단원 | 쓸 수 있는 꼴 | 질문 꼴 |
|---|---|---|
| 1 | `a/an + 명사` 어구, `It is a/an ~.`, 명사 `and` 명사 | `It is an egg. What is it?` |
| 2 | `This is a/an ~.` · `This is my ~.` · `That is a/an ~.` | `This is my bag. What is this?` · `What is that?` |
| 3 | 색 · 크기 + 명사, `It is red.` · `The ~ is big.` | `My tooth is white. What color is it?` · `My nose is small. What is small?` |
| 4 | `I like the ~.` · `I like my ~.` · `I like it.` · `I like` + 셀 수 없는 명사 | `I like the red bird. What color is the bird?` |
| 5 | 수 + 복수 -s, `I like` + 복수 명사 | `I like two hats. How many hats?` · `Three blue socks. What color are the socks?` |

- 모든 단원에 더하는 꼴: `the + 명사`(하나뿐인 것 · 앞 문장에 나온 것), 감탄 `Oh, ~!` · `Wow, ~!`(한 벌에 네 번까지). 부르는 말(`Momo, it is milk.`)은 쓰지 않는다.
- 질문 꼴의 What 의문문은 3단계 단원 5 요소이고 How many 는 5단계 단원 4 요소다. 말하기 1단계는 질문에 답하는 활동이 단계표에 있어 위 꼴만 쓴다. 이 밖의 의문문(`Is it ~?` · `Do you ~?` · `What do ~?` · Where · Who)은 쓰지 않는다. 아이 자신을 묻는 질문(`What is your name?` · `Do you like ~?`)은 회화 몫이라 쓰지 않는다.

관사 · 수 · 그림(그림이 붙는 글은 듣기 대본이다):

| 낱말 | 쓰는 꼴 | 쓰지 않는 꼴 | 질문 답으로 |
|---|---|---|---|
| milk · rice · sand · jam(셀 수 없게 쓴다) | 관사 없이 `It is milk.` | `a milk` · `It is a rice.` | `This is milk. What is this?` 꼴로만: `milk` · `This is milk.` · `It is milk.`(평가는 단원 2 꼴도 쓴다) |
| cake · pizza · cheese(한 조각 그림) | 관사 없이 `It is cake.` · `The cheese is yellow.` | `It is a cake.` | milk 와 같다 |
| candy(사탕 하나 그림) | `It is candy.` · `It is a candy.` | — | `candy` · `It is candy.` · `It is a candy.` |
| sun | `the sun` | `a sun` | `sun` · `the sun` · `It is the sun.` |
| grape(송이 그림) | 복수 `grapes`(C126 (2)) | `a grape` | 두지 않는다 |

검증기가 오류로 잡는 꼴. 1단계 평가에서는 형태 표(`forms.json` 58개)의 모든 형태가 범위 밖이다.

| 꼴 | 걸리는 예 |
|---|---|
| he · she · we · they | `He is big.` · `We like dogs.` |
| have · has · can · can't | `I have a cat.` · `I can see a dog.` |
| There is · Let's | `There is a cat.` · `Let's go.` |
| be 부정(isn't · is not + 낱말) | `It is not a cat.` |
| 진행형 · 동명사 · 규칙 과거 -ed | `I am smiling.` · `I like swinging.` · `I liked it.` |
| some · at + 수(시각) | `Some apples.` · `It is at five.` |
| 그 밖 | don't · does · was · were · because · will · 비교급 등 4단계 이상 꼴 |

검출기가 못 잡지만 쓰지 않는 꼴: 3인칭 단수 -s(`Max likes cake.`) · 명령문 · 문장을 잇는 and · or.

## 9. 그림 규칙

- 듣기 보기는 아래 표의 낱말 id 로만 낸다. 그림 키가 없는 낱말을 내면 검증기 `image` 오류다(C126 — 그림 있는 낱말만 그림 문항).
- 헷갈리는 짝은 같은 문항 보기에 함께 두지 않는다: ant · insect, hat · cap, cup · milk, face · smile, face · neck, leg · knee, foot · toe, hand · finger, arm · strong, face · head, bird · fly, cup · water, jacket · coat, pants · jeans, girl · doll, head · hair, tired · sleepy, student · boy, student · girl, kick · soccer. (제안) rose · flower, bird · chicken · duck, happy · smile, sheep · goat 도 함께 두지 않는다.
- 듣기 보기는 소리로 가려져야 한다. 한 문항 보기에 운이 같은 낱말(끝소리가 같고 첫소리만 다른 낱말)을 둘 이상 두지 않는다. 예: swing · wing · king · ring, cake · lake · snake, rock · sock · clock, cat · hat, pen · ten, bed · red(표본 S-h).
- 대본은 그림의 색 · 모습과 맞춘다. 표의 '그림 · 맞출 것' 칸에 색이 없으면 색을 붙이지 않는다. '색을 말하지 않는다'고 적힌 낱말에도 붙이지 않는다.
- 그림 한 장은 물건 하나다. 수 낱말의 그림은 숫자 키캡이고 색 낱말의 그림은 색 동그라미다. 수 · 색을 들려주면 보기를 수 · 색 낱말로 낸다.
- 정답이 둘 이상 맞을 수 있는 보기를 두지 않는다(예: 대본 `It is red.` 에 빨간 그림이 둘).
- 질문에 답하기는 그림을 보이지 않는다. 질문은 그림 없이 답할 수 있어야 한다(C67 (5)).

그림이 있는 1단계 낱말 128개(아래 표 밖의 낱말은 듣기 보기에 낼 수 없다).

| 낱말 | 그림 키 | 그림 · 맞출 것 | 그림과 맞는 예문(P6b vocab) |
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

## 10. 주제 · 인물

- 평가에는 주제 변형이 없다(벌 3개가 그 자리다). 문장은 연결 단원의 주제(6절)에 맞춘다.
- 아이 이름 자리 `{NAME}` 은 쓰지 않는다. 실제 사람 이름도 쓰지 않는다.

### 인물(C124 · C126)

- 인물은 문장에 꼭 필요할 때만 넣는다. 1단계 꼴은 이름 없이 다 된다. 이름이 문장 뜻에 들어가는 자리(듣기 대본의 `Max is a dog.` · 질문 근거 문장의 `This is Meg.`)에만 쓴다.
- 이름은 듣기 대본 · 질문 근거 문장에만 둔다. **따라 말할 문장 · 바른 답 · 허용 답에는 넣지 않는다**(음성 인식이 이름을 다른 글자로 적기 쉬워 일치율이 깎인다 — Tori → Tory, 사용 시험에서 확인할 추정).
- 넣을 때는 아래 표의 이름만 쓴다. 모모 · 토리만 되풀이하지 않게 다른 인물도 가끔 쓴다. 늘 새 인물을 넣으라는 뜻은 아니다.
- 회화 선생님 이름(Mina · Leo · Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi, C117 · C122)과 실제 사람 · 상표 · 작품 속 인물 이름은 쓰지 않는다. 표 밖의 이름을 새로 만들지 않는다. 이름을 부르는 말로 붙이지 않는다.

| 이름 | 누구 | 한국어로 적을 때(`ko`) |
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

셀 수 있는 기준(제안, C126 셈을 평가 벌에 옮김 — 벌 하나 N = 20문항): 이름이 영어 칸 어디든 나오는 문항 n, 그 가운데 Momo 나 Tori 가 나오는 문항 m 이 **벌마다 n ≤ 5 · m ≤ max(2, ⌊n/2⌋)** 이다. 14절 명령이 센다.

## 11. 문항 종류별 내용 — 답 낱말 · 겹침 피하기

| 규칙 | 내용 |
|---|---|
| 답 낱말 | 따라 말할 낱말(1~5) · 듣기 정답(6~10) · 질문의 낱말 하나 허용 답(16~20)은 연결 단원의 단원 단어다. 세 벌을 통틀어 한 낱말은 이 셋 가운데 한 문항에서만 답이 된다(제안). 단원마다 9개. 따라 말할 문장(11~15)의 단원 단어는 같은 벌의 답 낱말과 겹치지 않게 고른다 |
| 벌 사이 | 같은 문항 · 같은 문장을 다른 벌에 쓰지 않는다(검증기 `level-test-forms-overlap` 은 모두 같을 때만 잡는다) |
| 수업과 | 듣기 대본의 문장은 1단계 말하기 수업 듣기 대본 문장(222개)과 같지 않다. (대본, 보기 묶음) · 질문 `en` 전체는 수업 듣기 · 질문(338개)과 같지 않다(검증기). 따라 말할 문장은 수업에서 따라 말하거나 들은 문장과 같지 않다(제안, 14절 명령). 수업은 `It is a/an ~.` · `That is a ~.` · `<X> is <형용사>. What is <형용사>?` 꼴을 흔한 낱말 짝으로 많이 썼다. 같은 꼴을 쓰되 낱말 짝을 바꾸고, 질문은 근거 문장 둘로 새로 짠다 |
| 연결 단원 | 문항의 `unit` 은 답 낱말(따라 말할 문장은 그 문장의 단원 단어)이 든 말하기 단원이다 |

## 12. 출력 규격(Zod `LevelTestFileSchema` speaking · `SpeakingTestItemSchema` 와 1:1)

모르는 키는 거부된다. 파일 겉: `{ "area": "speaking", "level": 1, "forms": [ { "form": <1~3>, "items": [ … 20개 ] } ] }`.

| 필드 | 꼴 | 설명 |
|---|---|---|
| `no` · `unit` · `revision` · `correction` | 정수 | 차례 표 · 호출 값 |
| `repeat` | `{ "type": "repeat", "sentence" }` | 따라 말할 낱말이나 문장 |
| `listening` | `{ "type": "listening", "kind": "picture", "script", "options", "answerNo" }` | 듣고 그림 고르기 |
| `question` | `{ "type": "question", "en", "ko", "modelAnswer", "accepted" }` | 질문에 낱말로 답하기 |
| `explanationKo` | 한국어 | 해설(모든 문항, 6.3 '문항마다 해설') |

`presentation` · `kind: "text"` 듣기는 1단계 평가에 두지 않는다. `generation` · `title` 같은 수업 칸도 두지 않는다.

예시: 벌 1 의 문항 넷(낱말 따라 말하기 · 듣기 · 문장 따라 말하기 · 질문). 꼴을 보이는 예이니 그대로 옮기지 않는다. 2026-10-23 에 검증기와 14절 명령으로 오류 0 · 문제 0 을 확인했다.

```json
{
  "area": "speaking",
  "level": 1,
  "forms": [
    {
      "form": 1,
      "items": [
        {"no": 1, "unit": 1, "revision": 2, "correction": 0, "type": "repeat", "sentence": "cookie", "explanationKo": "cookie 는 쿠키예요."},
        {"no": 7, "unit": 2, "revision": 2, "correction": 0, "type": "listening", "kind": "picture", "script": "That is my lamp.", "options": ["desk", "lamp", "truck", "bath"], "answerNo": 2, "explanationKo": "lamp 는 램프예요. 램프 그림을 골라요."},
        {"no": 13, "unit": 3, "revision": 2, "correction": 0, "type": "repeat", "sentence": "My eyes are black.", "explanationKo": "'내 눈은 검은색이야.'라는 뜻이에요."},
        {"no": 19, "unit": 4, "revision": 2, "correction": 0, "type": "question", "en": "The fan is red. The pot is hot. What is hot?", "ko": "부채는 빨개. 냄비는 뜨거워. 뭐가 뜨거워?", "modelAnswer": "The pot is hot.", "accepted": ["pot", "the pot", "The pot is hot.", "The pot is."], "explanationKo": "냄비(pot)가 뜨거워요. 'The pot is hot.' 이라고 말해요."}
      ]
    }
  ]
}
```

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말(영어 45 · 한국어 19)과 정규식 13개.
- 개인 정보를 묻는 말(영어 · 한국어): 사는 곳 · 집 주소 · 전화번호 · 학교 이름 · 반 · 성 · 전체 이름 · 이메일 · 비밀번호. 아이 자신을 묻는 질문은 회화 몫이라 쓰지 않는다.
- 연락처 꼴 · 메타 문장(`meta-sentences.json`: the child · the user · the student · I should · I will now 등).
- (제안) 무섭거나 다치는 장면, 상표 · 실제 인물 · 종교 · 정치.
- 설계 숫자 · 단원 번호 · '평가' 같은 말을 해설에 쓰지 않는다.
- `{NAME}` · 실제 아이 이름 · 회화 선생님 이름(10절).

## 14. 스스로 확인과 검증 명령

파일을 다 쓴 뒤 하나씩 확인한다.

1. 벌 3개 × 20문항, 번호 1~20, 5절 차례 표대로 유형 · 연결 단원(벌 셋이 같다, 1~5 는 낱말 · 11~15 는 문장).
2. 모든 영어 문장이 5낱말 이하다.
3. 답 낱말이 연결 단원의 말하기 단원 단어이고 세 벌을 통틀어 겹치지 않는다. 듣기 정답은 그림 낱말이다.
4. 모든 영어 낱말이 7절 범위 안이다(범위 밖 0).
5. 8절 꼴 밖의 형태가 없다.
6. 듣기: 대본이 답 그림 하나만 가리키고, 보기 4개가 9절 표의 낱말이고, 헷갈리는 짝 · 운이 같은 보기가 없고, 색 · 모습 · 관사 · 수가 그림과 맞다. 정답 자리가 고루.
7. 질문: 근거 문장으로 그림 없이 답할 수 있고, 아이 자신을 묻지 않고, `ko` 가 반말이고, 허용 답 3개 이상에 낱말 하나 꼴이 있고, 허용 답이 정규화 뒤에도 서로 다르다.
8. 듣기 대본 문장 · 질문 · 따라 말할 문장이 수업과 같지 않고, 벌 안 · 벌 사이에 같은 문장이 없다.
9. 인물 기준(벌마다 n ≤ 5 · m ≤ max(2, ⌊n/2⌋) · 부르는 말 없음 · 따라 말할 문장 · 바른 답 · 허용 답에 이름 없음 · 표 밖 이름 · 선생님 이름 없음), 13절 금지 목록, 해설이 해요체.

**스스로 확인 명령**(시드 검증 전에 돌린다. 이 명령의 결과로 고치는 것은 고침 회차에 넣지 않는다. 마지막 줄이 `문제 0` 이 될 때까지 고친다. 저장소 뿌리에서 돌린다):

```sh
pnpm -s exec tsx - <뿌리> speaking 1 <<'EOF'
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

출력의 `[검사 이름] 벌 · 번호 · 내용` 줄이 고칠 곳이다. `[수업 지문과 같은 문장]`(듣기 대본) · `[수업 문항과 같은 질문 · 보기]` 는 검증기도 오류로 잡는다. `[수업에서 말한 문장]` 은 따라 말할 문장이 수업 문장과 같다는 뜻이다.

**검증 명령**(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas speaking --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="level-tests/speaking/1.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(이 파일의 칸 60 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수)를 그대로 적어 둔다. 칸은 문항 하나(`level-test:speaking:1:<벌>:<번호>`)다.
- 오류가 있으면 그 문항만 고치고 다시 검증한다. 고침은 2회(`seed.max_retries`)까지다. 그래도 남으면 멈추고 보고한다.
- summary 의 `referenceErrors` 가 0 이 아니면 규격 파일 문제라 이 묶음의 일이 아니다. 고치지 않고 보고한다.
- `unchecked` · `empty` 는 이 단계의 일이 아니다.
- 검증기가 잡지 못해 스스로 지킬 것: 허용 답 셋 · 낱말 하나 꼴 · 한국어 뜻(검증기는 1단계 평가 질문의 허용 답이 있는지만 본다), 어휘 범위, 답 낱말 겹침, 따라 말할 문장의 수업 겹침, 헷갈리는 짝 · 운이 같은 보기, 인물 기준, 나란한 벌(스스로 확인 명령이 본다), 그림과 글의 색 · 모습 · 관사 · 수, 해설 말투(눈으로 본다).

## 15. 근거 한 줄

말하기 1단계 평가는 다섯 단원의 낱말 · 짧은 문장을 따라 말하고, 들은 말에 맞는 그림을 고르고, 들은 문장에 대한 쉬운 질문에 낱말로 답하는지 본다([4영01-01] · [4영02-01] · [4영02-04], CEFR Pre-A1 Overall oral production · comprehension). 그래서 수업과 같은 세 갈래를 앱이 채점하는 꼴로만 두고, 단원마다 4문항씩 잰다.

## 16. 보고 꼴

마지막 답장(파일로 쓰지 않는다)에 이 차례로 쓴다.

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값> · briefHash: <앞 8자> · agentHash: <앞 8자> · createdOn: <호출 값>
파일: <뿌리>/level-tests/speaking/1.json · 벌 3 · 문항 <n> · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
스스로 확인: 처음 '문제 <n>'(규칙별 <…>) · 마지막 '문제 <n>'
첫 검증: 칸 <n> · 오류 칸 <n> · 규칙별 <rule n, …> · 경고 <n>
고침: <회차마다 고친 칸 · 남은 오류>
벌마다: 듣기 정답 자리 1~4 <n · n · n · n> · 이름 문항 n <n> · Momo · Tori m <n> · 쓴 이름 <…>
답 낱말: 단원마다 <n>(세 벌 합, 겹침 <n>) · 허용 답 수 질문마다 <최소 · 최대>
스스로 확인 목록: 14절 1~9 각각 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 1 | 평가 파일에 생성 정보를 쓰지 않고 보고에 적음 | 평가 문항 규격에 `generation` 칸이 없다 |
| 2 · 14 | 스스로 확인 명령으로 고친 것은 고침 회차에 넣지 않음 | 첫 검증 결과가 통과율의 기준이다 |
| 5 | 따라 말하기 10 을 낱말 5 + 문장 5 로 | can-do '단어 5개와 짧은 문장 5개'를 평가에 그대로 옮겼다. 규격 칸 이름은 `sentence` 지만 낱말 하나도 받는다(앱은 일치율로 견준다) |
| 5 | 세 벌 같은 차례 표, 세션 안 갈래 한 번만 바뀜 | 나란한 벌로 재응시를 견줄 수 있고, 1단계 아이가 세션 안에서 갈래를 덜 바꾼다 |
| 5 | 질문 근거 문장 둘 | 수업 질문(근거 문장 하나 + 질문)은 들은 말을 그대로 되받으면 맞는다. 평가는 들은 두 말에서 골라 답하게 하고, 수업 질문 338개와 글이 겹칠 일도 줄인다. 1단계 상한(문장마다 5낱말)은 그대로 |
| 5 | 듣기 대본은 답 그림 하나만 가리킴 · 보기 4개 | 그림 듣기에는 질문 칸이 없어 대본에 보기 낱말이 둘 들어가면 답이 둘이 된다. 보기 수는 `speaking-1.md` 와 같다 |
| 5 | 모든 문항에 해설 | 6.3 '문항마다 … 해설', 규격은 선택 칸 |
| 10 | 인물 셈을 벌(20문항) 단위로 | C126 셈은 수업 단위다. 평가는 벌 하나가 아이가 보는 묶음이다 |
| 11 | 한 답 낱말은 세 벌 통틀어 한 번 · 따라 말할 문장도 수업과 다르게 | 검증기는 듣기 · 질문 겹침만 막는다. 수업에서 따라 한 문장을 평가에서 다시 따라 하면 기억으로 맞힌다 |
| 13 | 무서운 장면 · 상표 · 실제 인물 · 종교 · 정치 금지 | 금지어 목록 밖의 내용 기준이 정본에 없다 |
