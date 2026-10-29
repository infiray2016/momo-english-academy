# 생성 브리프 — 말하기 1단계(`speaking-1`)

이 파일은 말하기 1단계 묶음의 프롬프트 판이다(정본 6.3). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 단원 하나의 수업 전부를 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 숫자와 규칙은 모두 저장소 파일에서 옮겼다. 정본에 없는 값은 '(제안)'으로 적었고 맨 끝 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 그 영역 × 단계를 처음부터 다시 만든다.

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 영역 · 단계 | `speaking` · 1 · CEFR Pre-A1 · 구간 `1-3` |
| 틀 | `seed/prompts/_template.md` |
| 만든 날 · 만든 이 | 2026-10-22 첫 판 · 2026-10-23 둘째 판(C124 인물 규칙 · 표본 S-x · S-h 가 짚은 빈틈) · 학습 설계자(cur-p08) |
| 옮긴 곳 | `seed/level-specs.json` · `unit-specs.json` · `settings.json` · `vocab.json`(그림 키 · 예문은 P6b 가지 7767df0) · `images.json`(P6b) · `lists/forms.json` · `lists/forbidden.json` · `lists/homophones.json` · `lists/meta-sentences.json` · `src/core/seed/schema/lesson.ts` · `check-lesson.ts` · `check-cross.ts` · `text.ts` · `src/core/vocab/allocate.ts` · `src/core/speech/match-rate.ts` · `src/core/speaking/judge.ts` · 정본 3.1 · 3.2 · 3.3 · 3.6 · 6.2 · 6.3 · 6.4 · 13절 C38 · C39 · C54 · C64 · C66 · C67 · C87 · C117 · C122 · C124 · P6b 검토(헷갈리는 짝) · 표본 보고 S-x · S-h(장부 'P8 표본에서 드러난 브리프 빈틈') |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 단원 번호 | `1`(1~5) | 파일 이름, 6절에서 그 단원 찾기 |
| 뿌리 폴더 | `seed` 또는 표본 폴더 | 쓸 파일 `<뿌리>/lessons/speaking/1/<단원>.json` |
| briefHash · agentHash | 소문자 16진 64자 | 모든 수업의 `generation` |
| effort | `xhigh` · `high` | `generation.effort` |
| createdOn | `2026-10-23` | `generation.createdOn` |
| revision · correction | `1` · `0` | 모든 수업 |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

`generation.model` 에는 자기 모델 ID(예: `claude-opus-5-5`)를 적는다. 파일은 하나만 쓴다.

## 2. 할 일 한눈에

1. 6절에서 이 단원의 단원 단어 · 배정표를 찾는다.
2. 주제 변형 1(묶음 1)의 정규 수업 10개와 보강 수업 3개를 만든다.
3. 주제 변형 2(묶음 2)도 같은 칸으로 만든다.
4. 파일 하나 `{ "area", "level", "unit", "lessons" }` 에 수업 26개를 넣는다. 차례는 (제안) 변형 1 의 정규 1~10 · 보강 1~3, 그다음 변형 2 다.
5. 14절 스스로 확인 → 검증 명령 → 오류 칸 고침 → 16절 보고.

## 3. 단계 규격(`level-specs` speaking 1)

| 칸 | 값 |
|---|---|
| can-do | 들은 단어 5개와 짧은 문장 5개를 따라 말하고 듣고 그림을 고르며 질문에 단어로 답할 수 있다 |
| CEFR · 목표 시간 | Pre-A1 · 8분 |
| 문장 길이 상한 `sentenceMaxWords` | 5낱말. 따라 말할 문장 · 듣기 대본 · 질문 · 바른 답 · 허용 답 · 미리보기 예문의 영어 문장마다 |
| 따라 말하기 `repeat` | 단어 5개 + 문장 5개(문장 낱말 수 범위는 없고 상한 5만 있다) |
| 듣기 이해 `listening` | 3문항, 보기 꼴 `picture`(듣고 그림 고르기) |
| 질문 `questions` | 4개, 바른 답 문장 있음(`modelAnswer: true`), 허용 답 3개 이상(`acceptedMin: 3`), 한국어 뜻 있음(`koMeaning: true`) |
| 그림 보고 말하기 · 발표 | 1단계에는 없다. `pictureTask` · `presentation` 칸을 두면 오류다 |

정본 3.3 말하기 단계표 1단계 행: 따라 말하기 '단어 5개 + 짧은 문장 5개' · 듣기 이해 '듣고 그림 고르기 3문항' · 질문 답 '질문에 단어로 답하기 4개' · 목표 8분. 근거: 2022 개정 초3~4 성취기준 [4영01-01] · [4영02-01] · [4영02-04], CEFR Overall oral production · Overall oral comprehension Pre-A1(P6a 근거 문서 can-do 표).

## 4. 단원 틀(`settings` 구간 1-3)

| 설정 키 | 값 | 뜻 |
|---|---|---|
| `unit.vocab_count.1-3` | 25 | 단원 단어 수 |
| `unit.new_words_per_lesson.1-3` | 5 | 배정 수업마다 새 단어 k |
| `unit.regular_lessons.1-3` | 10 | 정규 수업 = 배정 5 + 다지기 5 |
| `seed.remedial_per_unit.1-3` | 3 | 보강 수업 수 |
| `seed.topic_variants.1-3` | 2 | 주제 변형 수 |
| `seed.remedial_coverage.1-3` | 1 | 변형마다 보강 수업들을 합쳐 단원 단어마다 나와야 하는 횟수 |
| `speaking.answer_match_pass` | 0.8 | 질문 답 · 허용 답 일치율 통과 기준(5절) |
| `seed.max_retries` | 2 | 검증 뒤 고침 회차 상한 |

수업 번호(검증기 `layout`): `assigned` 1~5 · `reinforce` 6~10 · `remedial` 1~3 · `variant` 1~2. 말하기에는 알파벳 단원(단원 0)이 없다. 이 수는 설정값이라 아이가 보는 글에 적지 않는다.

## 5. 수업 구성(정본 3.3 말하기)

세션 차례: 새 단어 미리보기 → 듣고 따라 말하기 → 듣기 이해 → 질문에 답하기. 말하기 영역은 정확하게 말하기에 집중한다. 말을 주고받는 대화는 회화 영역이 한다. 말하기의 질문은 그 수업에서 듣거나 따라 말한 문장, 들은 내용에 대한 것이다. 아이 자신의 이야기(좋아하는 것 · 가진 것)와 상황 속 요청을 묻는 질문은 회화에만 둔다. 녹음은 하지 않는다.

| 활동 | 칸 | 수 · 길이 |
|---|---|---|
| 새 단어 미리보기 | `preview` | `newWords` 와 같은 낱말 모음. 배정은 5개, 다지기 · 보강은 빈 목록 |
| 따라 말하기 낱말 | `content.repeat.words` | 5개. 낱말 하나씩(단원 단어, 배정은 새 단어를 먼저) |
| 따라 말하기 문장 | `content.repeat.sentences` | 5개. 문장마다 5낱말 이하 |
| 듣기 이해 | `content.listening` | 3문항, 모두 `kind: "picture"`. `script` 는 앱이 읽어 줄 영어(5낱말 이하 문장), `options` 는 그림 있는 낱말 id (제안) 4개, `answerNo` 는 정답 번호 |
| 질문에 답하기 | `content.questions` | 4개. `en` 질문(앱이 읽어 준다), `ko` 한국어 뜻(반말, 영어 질문 아래에 보인다, C39), `modelAnswer` 바른 답 문장, `accepted` 허용 답 3개 이상 |

앱 판정(정본 6.2 · C38 · `match-rate.ts`): 1~2단계 질문 답은 AI 를 부르지 않는다. 인식 글을 허용 답 전부와 견줘 가장 높은 일치율이 0.8(`speaking.answer_match_pass`) 이상이면 맞음이고, 아니면 바른 답 문장을 들려준다. 판정은 아이 화면에 글자로 보이지 않는다.

- 일치율 = 허용 답 낱말 가운데 차례를 지켜 맞은 수 ÷ 허용 답 낱말 수. 덧붙인 말은 깎지 않는다.
- 견주기 전에 소문자로 바꾸고, 문장 부호를 지우고, 숫자를 낱말로 바꾸고(2 → two), 축약형을 펴고(it's → it is), 동음이의어(two · to · too, four · for, eight · ate 등 `homophones.json`)를 같게 본다.
- 그래서 허용 답에는 가장 짧은 꼴(낱말 하나)을 꼭 넣는다. 허용 답이 `This is a bag.` 하나뿐이면 'bag' 이라고 답한 아이는 1 ÷ 4 = 0.25 로 틀린다.
- 허용 답끼리는 위 정규화 뒤에도 서로 달라야 쓸모가 있다(`It is red.` 와 `it is red` 는 같은 답이다).
- 허용 답 셋은 서로 다른 자연스러운 꼴로 채운다. 관사를 억지로 붙이거나 뺀 꼴(`a milk` · `It is a pizza.`)로 수를 채우지 않는다. 자연스러운 셋을 못 만드는 낱말은 그 단원에서 질문 답으로 두지 않고 따라 말하기 · 듣기에 쓴다(8절 '관사 · 수 · 그림' 표).

따라 말하기도 같은 일치율로 결과 말(잘 말했어요 · 거의 다 맞았어요 · 한 번 더 들어 볼까요)을 정한다. 그래서 따라 말할 문장은 소리 내기 쉬운 짧은 문장으로 쓴다.

## 6. 단원 규격과 배정표(`unit-specs` · 배정 함수)

배정표는 앱의 배정 함수가 단원 단어를 차례대로 k(5)개씩 나눈 결과다. `newWords` 는 표와 낱말 모음이 같아야 한다(검증기 `vocab-allocation`). 다지기 · 보강은 빈 목록이다.

### 단원 1 — 과일 바구니 · 학습 요소 'a · an + 명사'

- 단원 단어 25개(배정 차례 그대로): apple, egg, banana, milk, cake, candy, cookie, cheese, grape, pizza, jam, rice, snack, sun, tree, flower, rock, lake, sand, rose, shell, king, swing, wing, song
- 그림 없는 단원 단어(그림 보기 · 듣기 보기에 내지 않는다): snack, song

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | apple(사과) · egg(달걀) · banana(바나나) · milk(우유) · cake(케이크) |
| 2 | assigned | candy(사탕) · cookie(쿠키, 과자) · cheese(치즈) · grape(포도) · pizza(피자) |
| 3 | assigned | jam(잼) · rice(밥, 쌀) · snack(간식, 그림 없음) · sun(해, 태양) · tree(나무) |
| 4 | assigned | flower(꽃) · rock(바위, 돌) · lake(호수) · sand(모래) · rose(장미) |
| 5 | assigned | shell(조개껍데기) · king(왕) · swing(그네, 흔들다) · wing(날개) · song(노래, 그림 없음) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 2 — 내 장난감 · 학습 요소 'This is ~'

- 단원 단어 25개(배정 차례 그대로): bag, pen, pencil, book, cup, map, desk, chair, toy, drum, clock, lamp, bell, bus, car, ship, truck, plane, bed, bath, dish, tent, home, shop, bank
- 그림 없는 단원 단어(그림 보기 · 듣기 보기에 내지 않는다): toy, home

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | bag(가방) · pen(펜) · pencil(연필) · book(책) · cup(컵) |
| 2 | assigned | map(지도) · desk(책상) · chair(의자) · toy(장난감, 그림 없음) · drum(북, 드럼) |
| 3 | assigned | clock(시계) · lamp(램프, 전등) · bell(종) · bus(버스) · car(자동차) |
| 4 | assigned | ship(배) · truck(트럭) · plane(비행기) · bed(침대) · bath(목욕, 욕조) |
| 5 | assigned | dish(접시, 요리) · tent(텐트) · home(집, 그림 없음) · shop(가게, 쇼핑하다) · bank(은행) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 3 — 내 얼굴과 몸 · 학습 요소 '색 · 크기 + 명사'

- 단원 단어 25개(배정 차례 그대로): red, blue, yellow, green, black, white, pink, orange, color, big, small, long, short, eye, ear, nose, mouth, face, hand, leg, arm, old, neck, tooth, smile
- 그림 없는 단원 단어(그림 보기 · 듣기 보기에 내지 않는다): color, big, small, long, short, old

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | red(빨간, 빨간색) · blue(파란, 파란색) · yellow(노란, 노란색) · green(초록의, 초록색) · black(검은, 검은색) |
| 2 | assigned | white(하얀, 흰색) · pink(분홍의, 분홍색) · orange(오렌지, 주황색) · color(색, 색깔, 그림 없음) · big(큰, 그림 없음) |
| 3 | assigned | small(작은, 그림 없음) · long(긴, 그림 없음) · short(짧은, 키가 작은, 그림 없음) · eye(눈) · ear(귀) |
| 4 | assigned | nose(코) · mouth(입) · face(얼굴) · hand(손) · leg(다리) |
| 5 | assigned | arm(팔) · old(~살의, 늙은, 그림 없음) · neck(목) · tooth(이, 이빨) · smile(미소, 웃다) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 4 — 좋아하는 동물 · 학습 요소 'I like ~'

- 단원 단어 25개(배정 차례 그대로): like, cat, dog, pig, duck, fish, bird, rabbit, frog, sheep, puppy, fox, chicken, snake, thank, cute, nice, name, hot, top, fan, pot, brush, lunch, thick
- 그림 없는 단원 단어(그림 보기 · 듣기 보기에 내지 않는다): like, puppy, thank, cute, nice, name, hot, lunch, thick

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | like(좋아하다, 그림 없음) · cat(고양이) · dog(개) · pig(돼지) · duck(오리) |
| 2 | assigned | fish(물고기) · bird(새) · rabbit(토끼) · frog(개구리) · sheep(양) |
| 3 | assigned | puppy(강아지, 그림 없음) · fox(여우) · chicken(닭, 닭고기) · snake(뱀) · thank(고마워하다, 그림 없음) |
| 4 | assigned | cute(귀여운, 그림 없음) · nice(좋은, 멋진, 그림 없음) · name(이름, 그림 없음) · hot(뜨거운, 더운, 그림 없음) · top(팽이, 꼭대기) |
| 5 | assigned | fan(선풍기, 부채) · pot(냄비, 화분) · brush(솔, 붓) · lunch(점심, 그림 없음) · thick(두꺼운, 그림 없음) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

### 단원 5 — 몇 개일까 · 학습 요소 '수 + 복수 -s'

- 단원 단어 25개(배정 차례 그대로): one, two, three, four, five, six, seven, eight, nine, ten, tall, little, thin, hat, cap, sock, shoe, shirt, jacket, ball, doll, bike, kite, ring, game
- 그림 없는 단원 단어(그림 보기 · 듣기 보기에 내지 않는다): tall, little, thin, game

| 수업 번호 | kind | newWords(배정표, 이 차례 그대로) |
|---|---|---|
| 1 | assigned | one(1, 하나) · two(2, 둘) · three(3, 셋) · four(4, 넷) · five(5, 다섯) |
| 2 | assigned | six(6, 여섯) · seven(7, 일곱) · eight(8, 여덟) · nine(9, 아홉) · ten(10, 열) |
| 3 | assigned | tall(키가 큰, 높은, 그림 없음) · little(작은, 어린, 그림 없음) · thin(얇은, 마른, 그림 없음) · hat(모자) · cap((챙 달린) 모자) |
| 4 | assigned | sock(양말) · shoe(신발) · shirt(셔츠) · jacket(재킷, 웃옷) · ball(공) |
| 5 | assigned | doll(인형) · bike(자전거) · kite(연) · ring(반지, 울리다) · game(놀이, 게임, 그림 없음) |
| 6 | reinforce | [] (새 단어 없음) |
| 7 | reinforce | [] (새 단어 없음) |
| 8 | reinforce | [] (새 단어 없음) |
| 9 | reinforce | [] (새 단어 없음) |
| 10 | reinforce | [] (새 단어 없음) |
| 보강 1~3 | remedial | [] (새 단어 없음) |

## 7. 단계 어휘 범위(vocab 1단계)

수업의 영어(따라 말할 말 · 듣기 대본 · 질문 · 바른 답 · 허용 답 · 미리보기 예문)는 아래 낱말(활용형 포함)과 고유 명사만 쓴다(제안 — 말하기 칸은 검증기가 범위 밖 비율을 세지 않지만 정본 3.4 단계 어휘 범위의 뜻이다).

흔한 낱말도 2단계 이상이면 쓰지 않는다. 2단계: have · can · very · here · play · run · jump · want · mom · dad · friend · good · happy · fun · with · for · at · of. 3단계: see · look · eat · go · where · who · there · we · they · squirrel. 4단계: too · day · so. 5단계: but. 6단계: some · brown. purple 은 vocab 에 없다.

**기능어 32개**(글로서리에 넣지 않는다): `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 [am, is, are, was, were, been, being] · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) [does, did, done, doing] · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의

- **말하기 단원 1 (과일 바구니)**: `apple` 사과 [apples] · `egg` 달걀 [eggs] · `banana` 바나나 [bananas] · `milk` 우유 · `cake` 케이크 [cakes] · `candy` 사탕 [candies] · `cookie` 쿠키, 과자 [cookies] · `cheese` 치즈 [cheeses] · `grape` 포도 [grapes] · `pizza` 피자 [pizzas] · `jam` 잼 [jams] · `rice` 밥, 쌀 · `snack` 간식 [snacks] · `sun` 해, 태양 [suns] · `tree` 나무 [trees] · `flower` 꽃 [flowers] · `rock` 바위, 돌 [rocks] · `lake` 호수 [lakes] · `sand` 모래 · `rose` 장미 [roses] · `shell` 조개껍데기 [shells] · `king` 왕 [kings] · `swing` 그네, 흔들다 [swings, swung, swinging] · `wing` 날개 [wings] · `song` 노래 [songs]
- **말하기 단원 2 (내 장난감)**: `bag` 가방 [bags] · `pen` 펜 [pens] · `pencil` 연필 [pencils] · `book` 책 [books] · `cup` 컵 [cups] · `map` 지도 [maps] · `desk` 책상 [desks] · `chair` 의자 [chairs] · `toy` 장난감 [toys] · `drum` 북, 드럼 [drums] · `clock` 시계 [clocks] · `lamp` 램프, 전등 [lamps] · `bell` 종 [bells] · `bus` 버스 [buses] · `car` 자동차 [cars] · `ship` 배 [ships] · `truck` 트럭 [trucks] · `plane` 비행기 [planes] · `bed` 침대 [beds] · `bath` 목욕, 욕조 [baths] · `dish` 접시, 요리 [dishes] · `tent` 텐트 [tents] · `home` 집 [homes] · `shop` 가게, 쇼핑하다 [shops, shopped, shopping] · `bank` 은행 [banks]
- **말하기 단원 3 (내 얼굴과 몸)**: `red` 빨간, 빨간색 [reds] · `blue` 파란, 파란색 [blues] · `yellow` 노란, 노란색 [yellows] · `green` 초록의, 초록색 [greens] · `black` 검은, 검은색 [blacks] · `white` 하얀, 흰색 [whites] · `pink` 분홍의, 분홍색 [pinks] · `orange` 오렌지, 주황색 [oranges] · `color` 색, 색깔 [colors] · `big` 큰 [bigger, biggest] · `small` 작은 [smaller, smallest] · `long` 긴 [longer, longest] · `short` 짧은, 키가 작은 [shorter, shortest] · `eye` 눈 [eyes] · `ear` 귀 [ears] · `nose` 코 [noses] · `mouth` 입 [mouths] · `face` 얼굴 [faces] · `hand` 손 [hands] · `leg` 다리 [legs] · `arm` 팔 [arms] · `old` ~살의, 늙은 [older, oldest] · `neck` 목 [necks] · `tooth` 이, 이빨 [teeth] · `smile` 미소, 웃다 [smiles, smiled, smiling]
- **말하기 단원 4 (좋아하는 동물)**: `like` 좋아하다 [likes, liked, liking] · `cat` 고양이 [cats] · `dog` 개 [dogs] · `pig` 돼지 [pigs] · `duck` 오리 [ducks] · `fish` 물고기 · `bird` 새 [birds] · `rabbit` 토끼 [rabbits] · `frog` 개구리 [frogs] · `sheep` 양 · `puppy` 강아지 [puppies] · `fox` 여우 [foxes] · `chicken` 닭, 닭고기 [chickens] · `snake` 뱀 [snakes] · `thank` 고마워하다 [thanks, thanked, thanking] · `cute` 귀여운 [cuter, cutest] · `nice` 좋은, 멋진 [nicer, nicest] · `name` 이름 [names] · `hot` 뜨거운, 더운 [hotter, hottest] · `top` 팽이, 꼭대기 [tops] · `fan` 선풍기, 부채 [fans] · `pot` 냄비, 화분 [pots] · `brush` 솔, 붓 [brushes, brushed, brushing] · `lunch` 점심 · `thick` 두꺼운 [thicker, thickest]
- **말하기 단원 5 (몇 개일까)**: `one` 1, 하나 · `two` 2, 둘 · `three` 3, 셋 · `four` 4, 넷 · `five` 5, 다섯 · `six` 6, 여섯 · `seven` 7, 일곱 · `eight` 8, 여덟 · `nine` 9, 아홉 · `ten` 10, 열 · `tall` 키가 큰, 높은 [taller, tallest] · `little` 작은, 어린 · `thin` 얇은, 마른 [thinner, thinnest] · `hat` 모자 [hats] · `cap` (챙 달린) 모자 [caps] · `sock` 양말 [socks] · `shoe` 신발 [shoes] · `shirt` 셔츠 [shirts] · `jacket` 재킷, 웃옷 [jackets] · `ball` 공 [balls] · `doll` 인형 [dolls] · `bike` 자전거 [bikes] · `kite` 연 [kites] · `ring` 반지, 울리다 [rings, rang, rung, ringing] · `game` 놀이, 게임 [games]
- **말하기 단원 밖의 1단계 낱말(읽기 · 쓰기 알파벳 단원 낱말 — 범위 안이지만 말하기 단원 단어가 아니다)**: `ant` 개미 [ants] · `bear` 곰 [bears] · `cow` 소 [cows] · `door` 문 [doors] · `elephant` 코끼리 [elephants] · `fork` 포크 [forks] · `guitar` 기타 [guitars] · `horse` 말 [horses] · `insect` 곤충 [insects] · `juice` 주스 · `key` 열쇠 [keys] · `lion` 사자 [lions] · `monkey` 원숭이 [monkeys] · `nurse` 간호사 [nurses] · `octopus` 문어 [octopuses] · `piano` 피아노 [pianos] · `queen` 여왕 [queens] · `robot` 로봇 [robots] · `star` 별 [stars] · `tiger` 호랑이 [tigers] · `umbrella` 우산 [umbrellas] · `violin` 바이올린 [violins] · `window` 창문 [windows] · `box` 상자 [boxes] · `yo-yo` 요요 [yo-yos] · `zebra` 얼룩말 [zebras]

내용어는 모두 151개다. 이 목록과 기능어 밖의 낱말은 1단계 어휘 범위 밖이다.

## 8. 학습 요소 범위와 문장 꼴(정본 3.6 · C64)

수업 글은 앞 단계 전부, 같은 단계의 앞 단원, 이번 단원의 요소만 쓴다(C64 (1)). 1단계 다섯 요소는 단원 차례대로 `a · an + 명사` / `This is ~` / `색 · 크기 + 명사` / `I like ~` / `수 + 복수 -s` 다.

검증기의 형태 표에는 1단계 요소 검출기가 없다. 그래서 아래 '쓸 수 있는 꼴'은 생성자가 스스로 지킨다.

| 단원 | 쓸 수 있는 꼴(제안, 앞 단원 꼴에 더한다) | 질문 꼴(제안) |
|---|---|---|
| 1 | `a/an + 명사` 어구, `It is a/an ~.`, 명사 `and` 명사 | `It is an egg. What is it?` |
| 2 | `This is a/an ~.` · `This is my ~.` · `That is a/an ~.` | `This is my bag. What is this?` |
| 3 | 색 · 크기 + 명사, `It is red.` · `The ~ is big.` | `My tooth is white. What color is it?` · `My nose is small. What is small?` |
| 4 | `I like the ~.` · `I like my ~.` · `I like it.` · `I like` + 셀 수 없는 명사 | `I like the red bird. What color is the bird?` |
| 5 | 수 + 복수 -s, `I like` + 복수 명사 | `I like two hats. How many hats?` · `Three blue socks. What color are the socks?` |

- `It is ~` 의 it 은 P6a 근거 문서가 1단계에 쓰려고 형태 검출에서 일부러 뺀 낱말이다('What color is it?' 를 1단계에 쓰려고). 1단계 vocab 예문도 be · like · thank 와 명사 · 형용사로 쓴다.
- 질문 꼴의 What 의문문은 3단계 단원 5 요소이고 How many 는 5단계 단원 4 요소다. 말하기 1단계는 질문에 답하는 활동이 단계표에 있어 위 꼴만 정해 쓴다(제안, 17절). 이 밖의 의문문(`Is it ~?` · `Do you ~?` · `What do ~?` · Where · Who)은 쓰지 않는다.

모든 단원에 더하는 꼴(제안, 표본 S-x · S-h 가 꼴 표 밖이라고 짚은 것):

| 꼴 | 쓰는 법 | 예 |
|---|---|---|
| `the + 명사` | 하나뿐인 것(the sun)이나 앞 문장에 나온 것을 다시 가리킬 때. 단원 1 부터 | `It is the sun.` · 단원 3 부터 `The sun is hot.` |
| 감탄 `Oh, ~` · `Wow, ~` | oh · wow 는 1단계 기능어다. 그 단원 꼴 앞에 붙이고 낱말 수에 넣는다. (제안) 한 수업에 두 번까지 — 문장 틀이 단조로울 때 바꾸는 데만 쓴다 | `Oh, an egg!` · 단원 3 부터 `Wow, a big tree!` |
| 부르는 말 | 쓰지 않는다. 이름을 문장 앞뒤에 붙이는 꼴(`Momo, it is milk.` · `A rock, Tori!`)은 이름이 필요한 자리가 아니다(10절 인물) | — |

관사 · 수 · 그림(제안 — 그림이 붙는 문장은 미리보기 예문 · 듣기 대본이다):

| 낱말 | 쓰는 꼴 | 쓰지 않는 꼴 | 질문 답으로 |
|---|---|---|---|
| milk · rice · sand · jam(컵 · 밥 · 더미 · 병 그림, 셀 수 없게 쓴다) | 관사 없이 `It is milk.` · `It is jam.` | `a milk` · `It is a rice.` · `milks` | 단원 1 에서는 두지 않는다(허용 답이 `milk` · `It is milk.` 둘뿐이라 셋을 못 채운다). 단원 2 부터는 `This is milk. What is this?` → `milk` · `This is milk.` · `It is milk.` |
| cake · pizza · cheese(한 조각 그림) | 그림이 붙는 문장은 관사 없이 `It is cake.` · `It is pizza.` · 단원 3 부터 `The cheese is yellow.` | 그림이 붙는 문장의 `It is a cake.` · `a pizza` | milk 와 같다 |
| candy(사탕 하나 그림) | `It is candy.` · `It is a candy.` 둘 다 된다 | — | `candy` · `It is candy.` · `It is a candy.` |
| sun | `the sun`(`It is the sun.`) | `a sun` · `It is a sun.` | `sun` · `the sun` · `It is the sun.` |
| grape(송이 그림) | 그림이 붙는 문장은 복수 `grapes`(`Oh, grapes!` · 단원 4 부터 `I like grapes.`). 복수 -s 는 단원 5 요소지만 그림과 맞추려고 이 낱말만 먼저 쓴다 | `a grape` · `It is a grape.` | 단원 1~4 에서는 두지 않는다 |

검증기가 오류로 잡는 꼴. 1단계에서는 형태 표(`forms.json` 58개)의 모든 형태가 범위 밖이다. 아래 예는 실제 검출기로 대조했다.

| 꼴 | 걸리는 예 |
|---|---|
| he · she · we · they | `He is big.` · `We like dogs.` |
| have · has · can · can't | `I have a cat.` · `I can see a dog.` |
| There is · Let's | `There is a cat.` · `Let's go.` |
| be 부정(isn't · is not + 낱말) | `It is not a cat.` 짧은 답 `No, it isn't.` 은 걸리지 않는다 |
| 진행형 · 동명사 · 규칙 과거 -ed | `I am smiling.` · `I like swinging.` · `I liked it.` |
| some · at + 수(시각) | `Some apples.` · `It is at five.` |
| 그 밖 | don't · does · was · were · because · will · 비교급 등 4단계 이상 꼴 |

검출기가 못 잡지만 쓰지 않는 꼴: 3인칭 단수 -s(`Momo likes cake.`, 4단계 단원 1) · 명령문(`Look at ~`, 3단계 단원 4) · 문장을 잇는 and · or(5단계 단원 3).

## 9. 그림 규칙

- 듣기 이해의 보기는 아래 표의 낱말 id 로만 낸다. 그림 키가 없는 낱말을 내면 검증기 `image` 오류다.
- 헷갈리는 짝은 같은 문항 보기에 함께 두지 않는다(P6b 검토 I-4 · N-4). 같은 단원 짝: ant · insect, hat · cap, cup · milk, face · smile, face · neck, head · hair, tired · sleepy, student · boy, student · girl, kick · soccer. 단원 밖 짝: leg · knee, foot · toe, hand · finger, arm · strong, face · head, bird · fly, cup · water, jacket · coat, pants · jeans, girl · doll.
- 그림이 붙는 문장(미리보기 예문 · 듣기 대본)은 그림의 색 · 모습과 맞춘다. 표의 '그림 · 맞출 것' 칸에 색이 없으면 색을 붙이지 않는다. '색을 말하지 않는다'고 적힌 낱말에도 붙이지 않는다.
- 그림 한 장은 물건 하나다. 수 낱말(one~ten)의 그림은 숫자 키캡이다. 수를 그림으로 묻는다면 보기를 수 낱말로 낸다.
- 정답이 둘 이상 맞을 수 있는 보기를 두지 않는다(예: 대본 `It is red.` 에 빨간 그림이 둘).
- 듣기 보기는 소리로 가려져야 한다. 한 문항 보기에 운이 같은 낱말(끝소리가 같고 첫소리만 다른 낱말)을 둘 이상 두지 않는다. 예: swing · wing · king · ring, cake · lake · snake, rock · sock · clock, cat · hat, pen · ten, bed · red. 아이는 대본을 소리로만 듣고, 풀이 검사는 대본 글만 보므로 이 헷갈림을 잡지 못한다(표본 S-h).
- 관사 · 수는 그림과 맞춘다(8절 '관사 · 수 · 그림' 표 — grape 그림은 송이, cake · pizza · cheese 는 한 조각, milk 는 컵, jam 은 병).
- 질문에 답하기는 그림을 보이지 않는다. 질문은 그림 없이 답할 수 있어야 한다(C67 (5)). 그래서 (제안) 질문 `en` 안에 답의 근거 문장을 먼저 두고 묻는다(8절 질문 꼴). 따라 말한 문장 · 듣기 대본에 나온 내용을 다시 물어도 된다.
- 예문 칸은 그림 색 · 모습의 참고다. 단원 꼴(8절)에 맞지 않으면 그대로 쓰지 않는다.

그림이 있는 1단계 낱말 128개(아래 표 밖의 낱말은 그림 보기에 낼 수 없다).

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

## 10. 주제 묶음 · 변형 · 주제 겹침

- `variant` 1 = 주제 묶음 1(동물 · 자연 · 음식 · 가족), `variant` 2 = 주제 묶음 2(놀이 · 운동 · 게임 · 우주 · 탈것). 묶음 id 와 변형 번호가 같다(C54 (3) · 첫 실행 주제 묶음).
- 단원 주제(6절)는 그대로 두고 등장인물 · 예시 · 상황만 묶음에 맞춘다(정본 6.3).
- (제안) 묶음은 제목만이 아니라 글에 드러나게 한다(표본 S-h 는 변형 2 주제가 제목에만 남았다). 변형 1 은 동물 · 자연 · 음식 쪽, 변형 2 는 놀이 · 탈것 · 우주 쪽 1단계 그림 낱말(ball · kite · bike · doll · drum · top · yo-yo · bus · car · ship · plane · truck · star · robot …)을 듣기 오답 보기 · 따라 말할 문장의 다른 명사 · 질문 앞 문장에 먼저 고른다. 이 수업보다 뒤 배정 수업의 단원 단어는 고르지 않는다(11절).
- 같은 (kind, lessonNo) 의 두 변형은 `newWords` 가 같고 활동 수(따라 말하기 낱말 · 문장, 듣기 문항, 질문)가 같다(검증기 `topic-variants`).
- 한 단원 수업 26개의 제목과 상황이 서로 겹치지 않게 한다. 앞에서 쓴 제목 · 상황 목록을 적어 가며 만든다.
- 인물은 10절 끝 '인물(C124)'을 따른다.
- 아이 이름 자리 `{NAME}` 은 쓰지 않는다. 말하기 화면은 `{NAME}` 을 채우지 않는다(정본 6.1 의 `{NAME}` 은 회화 · AI 호출 몫). 실제 사람 이름도 쓰지 않는다.

### 인물(C124)

- 인물은 문장에 꼭 필요할 때만 넣는다. 1단계 꼴(`It is ~` · `This is ~` · `I like ~`)은 이름 없이 다 된다. 이름이 문장 뜻에 들어가는 자리(듣기 대본의 `Max is a dog.` · `This is Meg.`)에만 쓴다. 표본 단원 1 high 는 26수업 모두에 `Momo, it is ~.` · `Tori, it is ~.` 를 붙여 걸렸다(C124).
- 넣을 때는 아래 표의 이름만 쓴다. 모모 · 토리만 되풀이하지 않게 다른 인물도 가끔 쓴다. 늘 새 인물을 넣으라는 뜻은 아니다.
- 회화 선생님 이름(Mina · Leo · Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi, C117 · C122)과 실제 사람 이름 · 아이 이름 · `{NAME}` 은 쓰지 않는다. 표 밖의 이름을 새로 만들지 않는다.
- 이름을 부르는 말로 붙이지 않는다(8절). 1단계는 he · she 와 3인칭 -s 를 못 쓰므로 `<이름> is ~` · `This is <이름>.` 꼴만 된다.
- 이름은 듣기 대본 · 미리보기 예문 · 질문 앞 근거 문장에만 둔다. 따라 말할 문장 · 바른 답 · 허용 답에는 넣지 않는다(제안). 이 셋은 아이가 소리 내어 말하고 앱이 인식 글과 견주는데, 이름은 음성 인식이 다른 글자로 적기 쉬워(예: Tori → Tory) 일치율이 깎일 수 있다(사용 시험에서 확인할 추정).

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

셀 수 있는 기준(제안, 단원 파일 하나 · 수업 N = 26): 위 표의 이름이 영어 칸(미리보기 예문 포함) 어디든 한 번이라도 나오는 수업을 n, 그 가운데 Momo 나 Tori 가 나오는 수업을 m 이라 할 때 **n ≤ 6(⌊N/4⌋) · m ≤ 3(⌊N/8⌋ 와 ⌊n/2⌋ 가운데 큰 값)** 이다. 이름을 적게 쓰면(3수업까지) 모모 · 토리만 써도 되고, 그보다 많이 쓰면 넘는 수업은 다른 인물이다(이름 수업이 6이면 셋은 다른 인물).

## 11. 수업 종류별 내용

| kind | 새 단어 | 내용 |
|---|---|---|
| `assigned`(배정 1~5) | 6절 표의 5개 | 따라 말하기 낱말 5개는 새 단어 5개다. 따라 말할 문장 · 듣기 · 질문에 새 단어를 고루 넣는다. 미리보기 5개. 듣기 정답은 새 단어 가운데 그림 있는 것을 먼저 쓴다. 이 수업보다 뒤 배정 수업의 단원 단어는 어디에도 쓰지 않는다(경고 `relation-early-use`) |
| `reinforce`(다지기 6~10) | 없음 | 배정 1~5 의 단원 단어를 다시 쓴다. 다지기 5개를 합쳐 단원 단어가 모두 한 번 이상 나오게 한다(경고 `relation-not-reused`). `preview` 는 빈 목록 |
| `remedial`(보강 1~3) | 없음 | (제안) 보강 1 은 배정 1 · 2 단어, 보강 2 는 배정 3 · 4 단어, 보강 3 은 배정 5 단어와 그림 없는 단어를 몰아 다룬다. 변형마다 보강 3개를 합쳐 단원 단어마다 1번 이상(`seed.remedial_coverage.1-3`) 나온다. 2번 이상을 목표로 하고 그 셈을 보고한다(6.3 순서 (2)에서 이 값을 잰다). `preview` 는 빈 목록 |

어느 kind 든 `unitWords` 에는 본문(따라 말할 말 · 듣기 대본 · 듣기 보기 · 질문 · 바른 답 · 허용 답)에 나온 단원 단어를 빠짐없이 적는다. 빠지면 경고 `unit-words-unlisted`, 단원 밖 낱말을 적으면 오류 `unit-words` 다.

보강 덮기 셈(제안): 그 변형 보강 수업 3개 가운데 그 단어가 미리보기 밖 영어 칸(따라 말할 말 · 듣기 대본 · 듣기 보기 · 질문 · 바른 답 · 허용 답)에 나온 수업 수다. '1번 이상'이 검증기 기준이고(검증기는 나온 횟수로 센다) '2번 이상'은 보고용이다.

## 12. 출력 규격(Zod `SpeakingLessonSchema` 와 1:1)

모르는 키는 거부된다. 필드 이름 · 꼴을 그대로 쓴다. 파일 겉: `{ "area": "speaking", "level": 1, "unit": <단원>, "lessons": [ … ] }`.

| 필드 | 꼴 | 설명 |
|---|---|---|
| `kind` | `assigned` · `reinforce` · `remedial` | 수업 종류(11절) |
| `lessonNo` | 1 이상 정수 | 4절 번호 규칙 |
| `variant` | 1 · 2 | 주제 변형(10절) |
| `revision` · `correction` | 0 이상 정수 | 호출 값 |
| `generation` | `{ "method": "generated", "model", "effort", "briefHash", "agentHash", "createdOn", "retries"? }` | 호출 값과 자기 모델 ID. `retries` 는 검증 뒤 고친 칸에만 그 회차 |
| `title` | 한국어 | 목록 제목, 10자 안팎, 단원 안에서 겹치지 않게 |
| `newWords` | 낱말 id 목록 | 배정표와 같은 모음, 겹침 없음 |
| `unitWords` | 낱말 id 목록 | 본문에 나온 단원 단어 전부 |
| `preview` | `[{ "word", "meaningKo", "example" }]` | `newWords` 와 같은 낱말 모음. `meaningKo` 는 한국어 뜻, `example` 은 5낱말 이하 영어 한 문장(8절 꼴 · 9절 그림 맞춤) |
| `content.repeat` | `{ "words": [5], "sentences": [5] }` | 따라 말할 낱말 · 문장 |
| `content.listening` | `[{ "kind": "picture", "script", "options", "answerNo" }]` | 3개. `options` 는 그림 있는 낱말 id, `answerNo` 는 1부터. 정답 자리를 고루 나눈다 |
| `content.questions` | `[{ "en", "ko", "modelAnswer", "accepted" }]` | 4개. `ko` 는 반말 한국어 뜻, `modelAnswer` 는 바른 답 한 문장, `accepted` 는 3개 이상(낱말 하나 꼴 포함, 5절) |

`pictureTask` · `presentation` 칸은 두지 않는다. 듣기 문항의 `kind: "text"` 꼴도 1단계에는 쓰지 않는다(보기 꼴이 `picture` 다).

예시: 단원 2 배정 1 · 변형 2. 꼴을 보이는 예이니 그대로 옮기지 않는다(이 칸을 만들 때도 새로 쓴다). 해시 자리에는 호출 값을 넣는다. 이 예는 2026-10-22 에 검증기로 오류 0 · 경고 0 을 확인했다(해시는 0 으로 채워 돌림).

```json
{
  "kind": "assigned",
  "lessonNo": 1,
  "variant": 2,
  "revision": 1,
  "correction": 0,
  "generation": {"method": "generated", "model": "claude-opus-5-5", "effort": "xhigh", "briefHash": "<호출이 넘긴 briefHash 64자>", "agentHash": "<호출이 넘긴 agentHash 64자>", "createdOn": "2026-10-23"},
  "title": "놀이터 가방 속",
  "newWords": ["bag", "pen", "pencil", "book", "cup"],
  "unitWords": ["bag", "pen", "pencil", "book", "cup"],
  "preview": [
    {"word": "bag", "meaningKo": "가방", "example": "This is my bag."},
    {"word": "pen", "meaningKo": "펜", "example": "This is a pen."},
    {"word": "pencil", "meaningKo": "연필", "example": "This is my pencil."},
    {"word": "book", "meaningKo": "책", "example": "This is a book."},
    {"word": "cup", "meaningKo": "컵", "example": "This is my cup."}
  ],
  "content": {
    "repeat": {
      "words": ["bag", "pen", "pencil", "book", "cup"],
      "sentences": ["This is my bag.", "This is a pen.", "This is my pencil.", "This is a book.", "This is my cup."]
    },
    "listening": [
      {"kind": "picture", "script": "This is a book.", "options": ["pen", "book", "cup", "bag"], "answerNo": 2},
      {"kind": "picture", "script": "This is my cup.", "options": ["cup", "pencil", "bag", "book"], "answerNo": 1},
      {"kind": "picture", "script": "This is a pencil.", "options": ["bag", "cup", "book", "pencil"], "answerNo": 4}
    ],
    "questions": [
      {"en": "This is my bag. What is this?", "ko": "이건 내 가방이야. 이건 뭐야?", "modelAnswer": "This is a bag.", "accepted": ["bag", "a bag", "my bag", "This is a bag.", "This is my bag."]},
      {"en": "This is a pen. What is this?", "ko": "이건 펜이야. 이건 뭐야?", "modelAnswer": "This is a pen.", "accepted": ["pen", "a pen", "This is a pen."]},
      {"en": "This is a book. What is this?", "ko": "이건 책이야. 이건 뭐야?", "modelAnswer": "This is a book.", "accepted": ["book", "a book", "This is a book."]},
      {"en": "This is my cup. What is this?", "ko": "이건 내 컵이야. 이건 뭐야?", "modelAnswer": "This is a cup.", "accepted": ["cup", "a cup", "my cup", "This is a cup.", "This is my cup."]}
    ]
  }
}
```

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말(영어 45 · 한국어 19)과 정규식 13개. 예: kill · gun · bomb · weapon · beer · wine · cigarette · drugs · stupid · idiot · dumb · shut up · hell · damn.
- 개인 정보를 묻는 말(영어 · 한국어): 사는 곳 · 집 주소 · 전화번호 · 학교 이름 · 반 · 성 · 전체 이름 · 이메일 · 비밀번호. `What is your name?` 은 걸리지 않지만 아이 자신을 묻는 질문이라 말하기에 두지 않는다(5절).
- 연락처 꼴: 전화번호 · 이메일 · 집 주소 · 웹 주소.
- 메타 문장(`meta-sentences.json`): the child · the user · the student · the learner · I should · I will now · as an AI · system prompt 등.
- (제안) 무섭거나 다치는 장면, 상표 · 실제 인물 · 종교 · 정치.
- 설계 숫자를 글에 쓰지 않는다(예: '오늘 5개 배워요').
- `{NAME}` · 실제 아이 이름.

## 14. 스스로 확인과 검증 명령

파일을 다 쓴 뒤 하나씩 확인한다.

1. 수업 26개(변형 2 × (정규 10 + 보강 3)), (kind, lessonNo, variant) 겹침 없음.
2. 수업마다 따라 말하기 낱말 5 · 문장 5, 듣기 3(모두 picture), 질문 4. 모든 영어 문장이 5낱말 이하.
3. 배정 수업의 `newWords` · `preview` 가 배정표와 같고, 새 단어가 본문에 나온다.
4. 모든 영어 낱말이 7절 범위 안이다.
5. 8절 꼴 밖의 형태가 없다(검출되는 꼴과 스스로 지킬 꼴 모두).
6. 듣기 보기가 모두 9절 표의 낱말이고, 헷갈리는 짝이 없고, 정답이 하나이며, 대본이 그림 색 · 모습과 맞다.
7. 질문 4개가 그림 없이 답할 수 있고, 아이 자신을 묻지 않고, `ko` 가 반말이고, 허용 답 3개 이상에 낱말 하나 꼴이 있다.
8. 다지기 5개에 단원 단어가 모두 다시 나오고, 보강 3개에 단원 단어마다 1번 이상 나온다(변형마다).
9. 변형 1 · 2 의 같은 칸끼리 새 단어 · 활동 수가 같고, 제목 26개가 서로 다르다. 13절 금지 목록에 걸리는 말이 없다.
10. 인물 기준(10절): n ≤ 6 · m ≤ 3, 부르는 말 없음, 따라 말할 문장 · 바른 답 · 허용 답에 이름 없음, 표 밖 이름 · 선생님 이름 없음.
11. 듣기 보기에 운이 같은 낱말이 둘 이상 없고(9절), 관사 · 수가 8절 표대로이며, 허용 답 셋이 자연스러운 꼴이다(5절).

검증 명령(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas speaking --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="lessons/speaking/1/<단원>.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(이 파일의 칸 수 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수)를 그대로 적어 둔다. 보고의 '첫 검증'이고 표본 비교(S10)에 쓴다.
- 오류가 있으면 그 칸만 고치고 다시 검증한다. 고친 칸의 `generation.retries` 에 회차를 적는다. 고침은 2회(`seed.max_retries`)까지다. 그래도 남으면 멈추고 남은 오류를 보고한다.
- 경고(`unit-words-unlisted` · `relation-early-use` · `relation-not-reused` · 분포)도 고친다. 남기면 까닭을 보고한다.
- `unchecked`(풀이 검사 안 됨)와 `empty`(빈 칸)는 이 단계의 일이 아니다.

## 15. 근거 한 줄

말하기 1단계는 들은 낱말 · 짧은 문장을 따라 말하고, 들은 말에 맞는 그림을 고르고, 쉬운 질문에 낱말로 답하는 단계다([4영01-01] · [4영02-01] · [4영02-04], CEFR Pre-A1 Overall oral production · comprehension). 그래서 문장은 짧은 정형 꼴이고, 질문은 방금 들은 문장에 대한 것이다.

## 16. 보고 꼴

마지막 답장(파일로 쓰지 않는다)에 이 차례로 쓴다.

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값>
파일: <뿌리>/lessons/speaking/1/<단원>.json · 수업 <n>(정규 <n> · 보강 <n>) · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
첫 검증: 칸 <n> · 오류 칸 <n> · 규칙별 <rule n, …> · 경고 <n>
고침: <회차마다 고친 칸 · 남은 오류>
보강 덮기: 변형마다 단원 단어 가운데 보강 수업 1개 이상에 나온 단어 <n> · 2개 이상 <n> · 답하는 대상(따라 말할 말 · 듣기 정답 · 바른 답 · 허용 답)으로 나온 단어 <n>
인물: 이름이 나온 수업 <n> · 그 가운데 Momo · Tori 수업 <n> · 쓴 이름 <…>
스스로 확인: 14절 1~11 각각 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 2 | 파일 안 수업 차례(변형 1 → 2, 정규 → 보강) | 정본 · 검증기에 차례 규칙이 없다 |
| 5 · 12 | 듣기 보기 4개 | level-specs 는 보기 꼴(picture)만 정하고 수는 없다. 읽기 문제 보기 수(4)와 시험용 견본에 맞췄다 |
| 5 · 8 | 허용 답 셋을 자연스러운 꼴로, 못 채우는 낱말은 질문 답에서 뺌 | 표본 S-h 가 셀 수 없는 명사(milk · It is milk. 둘뿐)를 질문에서 빼고 candy · pizza 허용 답에 관사를 붙여 수를 채웠다. 낱말 하나 꼴이 이미 덧붙인 말을 다 받으므로(5절) 관사 꼴은 판정에 보탬이 없고 수만 채운다 |
| 7 | 말하기 영어 전체를 1단계 어휘 범위로 | 검증기는 말하기 칸의 범위 밖 비율을 세지 않는다 |
| 8 | 1단계 단원별 쓸 수 있는 꼴과 질문 꼴(What is ~? · What color ~? · What is big? · How many ~?) | 3.6 은 1단계에 의문문 요소가 없는데 3.3 은 1단계에 질문 답 4개를 둔다. 형태 표는 이 꼴을 잡지 않는다 |
| 8 | 모든 단원의 `the + 명사` · 감탄 `Oh, ~` · `Wow, ~`(한 수업 두 번까지) · 부르는 말 금지 | 표본 S-x · S-h 가 꼴 표 밖이라고 짚은 꼴. 감탄은 단원 1 의 단조로운 문장 틀(`It is a/an ~.`)을 바꿀 수 있는 1단계 기능어 꼴이다 |
| 8 · 9 | 관사 · 수 · 그림 표(셀 수 없는 명사 · 한 조각 · 송이 · the sun) | 표본 R-x · R-h · S-h 가 짚은 빈칸(a grape ↔ 송이 그림, a cake ↔ 조각 그림, the sun) |
| 9 | 질문 `en` 안에 답의 근거 문장을 먼저 둔다 | C67 (5) '그림 없이 답할 수 있게'를 지키는 가장 단순한 꼴 |
| 9 | 한 듣기 문항에 운이 같은 보기를 둘 이상 두지 않음 | 표본 S-h 의 swing · wing · king. 헷갈리는 짝 목록은 그림 짝만 있고 소리 짝이 없다 |
| 10 | 인물 이름 표 일곱(+ Momo · Tori)과 기준 n ≤ ⌊N/4⌋ · m ≤ max(⌊N/8⌋, ⌊n/2⌋) | C124 의 '필요할 때만 · 모모 · 토리만 되풀이하지 않게'를 셀 수 있게 했다. 수업 단위로 세는 까닭: 아이는 수업 하나를 한 세션으로 만나 '모든 예문에 모모 · 토리'가 수업마다 이름이 나오는 것으로 보이고, 말하기는 허용 답이 같은 문장을 되풀이해 문장 비율이 부풀어 영역끼리 견줄 수 없다. 값의 까닭: C124 가 걸린다고 본 이 단원 1 표본(26수업 모두)과 걸리지 않는다고 본 읽기 1 단원 1(1수업) 사이에서, 1단계 꼴은 이름 없이 다 되므로 변형마다 13수업 가운데 3수업쯤이면 '필요할 때'를 덮는다. 이름: 짧고 소리 나는 대로 읽히는 이름(자음 · 단모음 · 자음), 영어 음성이 흔히 아는 이름, vocab 낱말 · 금지어 · 선생님 명단과 겹치지 않음(코드로 확인), 한국어 표기가 다른 말로 읽히지 않음(Sam '샘' · Pom '폼' 뺌), 실제 인물 · 상표 이름이 아님 |
| 10 | 이름을 따라 말할 문장 · 바른 답 · 허용 답에 두지 않음 | 음성 인식이 이름을 다른 글자로 적으면 일치율이 깎인다는 추정(사용 시험에서 확인) |
| 10 | 변형마다 듣기 오답 보기 · 문장 명사를 묶음 쪽 낱말에서 | 표본 S-h 에서 변형 2 주제가 제목에만 남았다 |
| 11 | 보강 1~3 이 다룰 단어 묶음 | 6.3 '몰아서 다룰 단원 어휘 묶음'의 나누는 법이 정본에 없다 |
| 11 | 보강 덮기 셈법(나온 보강 수업 수) | 정본 · 검증기는 '나온 수'만 말한다. 표본 보고가 셈법이 없다고 짚었다 |
| 13 | 무서운 장면 · 상표 · 실제 인물 · 종교 · 정치 금지 | 금지어 목록 밖의 내용 기준이 정본에 없다 |
