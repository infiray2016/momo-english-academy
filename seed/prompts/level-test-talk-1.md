# 생성 브리프 — 회화 1단계 단계 평가 카드(`level-test-talk-1`)

이 파일은 회화 1단계 단계 평가 묶음(평가 대화 카드 6장)의 프롬프트 판이다(정본 6.3 '단계 평가 문항' 행 회화 몫 · C4). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 파일 하나를 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다(14절 명령은 돌린다). 정본에 없는 값은 '(제안)'으로 적었고 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 이 묶음을 처음부터 다시 만든다. **회화 1단계 수업 카드 5단원이 다 만들어진 뒤에 만든다** — 평가 질문이 수업 카드 질문과 겹치는지 견주기 때문이다(6.3 · 6.4).

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 묶음 | 회화(`talk`) 1단계 단계 평가 · CEFR Pre-A1 · 구간 `1-3` |
| 틀 | `seed/prompts/_template.md`(절 번호를 그대로 쓰고, 평가에 없는 절은 '없음') · 다른 영역 평가 브리프(`level-test-<영역>-1.md`)와 같은 이름 꼴 |
| 만든 날 · 만든 이 | 2026-10-23 첫 판 · 학습 설계자(cur-p08) |
| 옮긴 곳 | `src/core/seed/schema/talk.ts`(TalkTestSheetSchema · TalkTestTurnSchema · AllowedAnswerSchema) · `schema/assessment.ts`(LevelTestFileSchema talk) · `check-assessment.ts`(checkTalkForms · lessonCorpus) · `check-teacher.ts` · `structure.ts`(TALK_TEST_* · SLOT_POS · YES_NO_AUXILIARIES · BLANK) · `seed/settings.json`(level.* · talk.test_*) · `level-specs.json` · `unit-specs.json` · `vocab.json` · `teachers.json` · 정본 3.2 단계 평가(회화 문단) · 6.3 · 6.4 단계 평가 · 회화 평가 카드 · 선생님 이름 행 · 13절 C4 · C35 · C117 · C122 · C124 · C130 · C132 · `talk-1.md`(같은 단계 카드의 꼴 · 낱말 규칙) · 이 판의 견본 장 검증(12절) |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 뿌리 폴더 | `seed` 또는 표본 폴더 | 쓸 파일 `<뿌리>/level-tests/talk/1.json`(이 묶음의 파일 하나). 뿌리에 `lessons/talk/1/1.json`~`5.json` 이 있어야 한다 |
| briefHash · agentHash · effort · createdOn | 호출 값 | 평가 카드 규격에는 `generation` 칸이 없다 — 보고에만 적는다(컨트롤러가 manifest 에 옮긴다) |
| revision · correction | `1` · `0` | 장마다 `revision` · `correction` |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

## 2. 할 일 한눈에

1. 14절 '수업 카드 질문 목록' 명령을 돌려 수업 카드가 쓴 질문 글을 본다(평가에서 피할 글).
2. 벌 1~3 × 장 1~2 = 장 6개의 턴 계획표를 먼저 짠다: 장마다 10턴, 단원마다 두 턴, 턴마다 질문 꼴 · 연결 단원 · 노릴 단원 단어 · 아이가 할 말.
3. 계획표대로 장 6개를 쓴다. 파일 하나 `{ "area": "talk", "level": 1, "forms": [ … ] }`.
4. 14절 스스로 확인 명령 → 검증 명령 → 오류 칸 고침 → 16절 보고.

## 3. 평가 규격(정본 3.2 · 6.3 · C4)

| 칸 | 값 |
|---|---|
| 벌 · 장 · 턴 | `level.test_forms`(3)벌 × 장 2개(`level.test_items`(20) ÷ `level.test_items_per_session`(10)) × 장마다 10턴. 한 세션에 장 하나를 본다 |
| 장의 차례 | 첫 말(`firstLine`, 짧은 인사 — 인사 토막은 없다) → 평가 턴 10개. 10턴 모두 평가 턴이고 아이 턴 하나가 문항 하나다 |
| 단원 | 장마다 단원 1~5 가 두 턴씩(`talk-test-unit-count`). 턴마다 연결 단원 `unit` |
| 선생님 질문 | 카드의 대사를 그대로 쓴다. 실시간 AI 는 아이 말에 대한 반응 한 문장만 붙인다. 1~4단계는 질문의 한국어 뜻(`question.ko`, 반말)을 둔다(`talk-test-ko`) |
| 힌트 세 단 | 처음에는 아이가 할 말의 한국어 뜻(`childKo`)만 보인다 → '힌트'를 누르면 영어 틀(`frameEn`, 빈칸 문장) → '문장 다 보기'를 누르면 영어 문장(`sentenceEn`). 그림은 없다 |
| 채점 | 앱이 센다(AI 는 판정하지 않는다). 아이 말이 가장 가까운 허용 답과 일치율 `talk.test_match_pass`(0.8) 이상이면 맞음. 뜻만 보고 맞으면 1, 틀을 보고 맞으면 0.5, 문장을 보고 읽으면 0, 틀리면 0(`talk.test_hint_scores`). 20턴 합 16(`level.pass_score` 0.8) 이상이면 통과. '잘 모르겠어요'는 0점 |
| 허용 답 | 턴마다 3개 이상(`talk-test-allowed`). 빈칸(`___`)이 있는 허용 답은 그 자리의 품사 `slotPos`(noun · verb · adjective · adverb · number · pronoun)를 적는다 — 그 단계 어휘 범위 안이고 vocab 품사에 그 값이 있는 낱말이면 맞은 낱말로 센다. `{NAME}` 은 무엇이 들어가도 맞다 |
| 예 · 아니오 질문 | 예 · 아니오로 답할 수 있는 질문(첫 낱말이 do · is · are · can …)이면 예 쪽(Yes …)과 아니오 쪽(No …) 허용 답을 모두 둔다(`talk-test-allowed`). (제안) 1단계 평가에는 이 꼴을 두지 않는다 |
| 문장 길이 · 형태 | 질문 · 첫 말 · 영어 틀 · 영어 문장 · 허용 답 모두 5낱말 이하. 평가는 그 단계까지의 형태라 1단계는 형태 표의 형태를 하나도 쓸 수 없다(`learning-elements`, `talk-1.md` 8절과 같은 표) |
| 겹침 | 장마다 수업 카드 질문과 글자가 같은 질문은 3개까지이고, 같은 질문이 수업 카드와 같은 차례로 두 턴 넘게 이어지지 않는다(`talk-test-lesson-overlap`). 다른 벌의 장과 같은 질문 글을 쓰지 않는다(`talk-test-forms-overlap`) |

근거: 3.2 '회화 턴은 쓴 힌트 단에 따라 1 · 0.5 · 0' · C4 '10턴 평가 대화 2장 × 3벌' · 6.4 회화 평가 카드 행.

## 4. 단원 틀

없음 — 평가는 단원 수업이 아니다. 칸 키는 장마다 `level-test:talk:1:<벌>:<장>` 이다.

## 5. 평가 턴 구성

턴 하나는 '선생님 질문 → 아이가 할 말'이다. 그림이 없으므로 **질문이 상황을 말로 준다**(`A little dog. What is it?` · `A bus! Big? Small?` · `Your bag. What color is it?`). 아이는 한국어 뜻(`childKo`)을 보고 영어로 말한다 — 평가가 보는 것은 '들은 질문에 맞게, 뜻을 영어 문장으로 말할 수 있는가'다.

| 칸 | 쓰는 법 |
|---|---|
| `firstLine` | 짧은 인사 + `ko`(반말). 물음이 없다(`Hello, {NAME}! Let's talk.` · `안녕, {NAME}! 이야기하자.`). 장 6개가 서로 조금씩 다르게(제안) |
| `question.en` | 5낱말 이하 영어. `talk-1.md` 8절 질문 꼴(it 갈래는 그림이 없으니 상황 말을 앞에 둔다)과 아이 자신 질문(`What is your name?` · `How old are you?` · `What do you like?`). or 를 쓰지 않는다(늘어놓기 `Milk? Juice?`) |
| `question.ko` | 질문의 한국어 뜻(반말) |
| `childKo` | 아이가 할 말의 한국어 뜻(반말, `나는 우유가 좋아.`). `sentenceEn` 의 뜻이다 |
| `sentenceEn` | 아이가 할 영어 문장 하나(5낱말 이하). 연결 단원의 단원 단어가 하나 이상 든다(제안 — 이름 턴은 `{NAME}`) |
| `frameEn` | `sentenceEn` 에서 낱말 하나를 빈칸 `___` 으로 바꾼 것(빈칸 하나, 제안). 보통 단원 단어 자리다(`I like ___.`) |
| `allowed` | 3개 이상. (제안) ① `sentenceEn` 그대로 ② 열린 질문이면 `frameEn` 과 같은 꼴에 `slotPos`(아이마다 답이 다른 자리 — 좋아하는 것 · 나이 · 내 물건의 색) ③ 핵심 낱말 · 어구(`milk` · `a puppy`) ④ 그 밖의 자연스러운 꼴(`The bus is big.`). 모두 5낱말 이하이고 7절 범위 안이다 |
| `unit` | 연결 단원 1~5 |

허용 답 쓰는 법(제안):

- 빈칸 하나는 낱말 하나다. 관사는 빈칸 밖에 둔다(`It is a ___.`). 빈칸에 들어갈 낱말이 관사 없이 자연스러운 꼴을 먼저 고른다(`I like ___.` · `I am ___.` · `It is ___.`(형용사)). 빈칸 맞춤은 앱 몫이고 아직 만들어지지 않았다 — 빈칸 하나에 여러 낱말을 기대하는 꼴을 두지 않는다.
- 빈칸은 답이 아이마다 다른 열린 질문에만 둔다. 답이 하나로 정해진 질문(`A little dog. What is it?` → puppy)에는 빈칸 허용 답을 두지 않는다 — 다른 명사를 말해도 맞음이 되기 때문이다.
- `slotPos` 는 빈칸에 올 낱말의 vocab 품사다: 색은 adjective(red 등은 adjective · noun 둘 다), 수는 number, 물건은 noun.
- 핵심 낱말 하나만 쓴 허용 답(`milk`)은 아이가 그 낱말만 말해도 맞음이 된다(1단계는 낱말로 답해도 된다 — 3.3 회화 1단계 행 · can-do '골라 말하고 … 스스로 답하며'). 그 낱말이 질문에 이미 들어 있으면 따라 말하기만으로 맞으므로, (제안) 질문에 든 낱말을 핵심 낱말 허용 답으로 두지 않는다(`Milk? Juice?` 의 허용 답에 `milk` 를 두면 질문을 따라 해도 맞는다 — 이때는 `I like milk.` · `I like juice.` · `I like ___.` 처럼 문장으로 둔다).
- 허용 답끼리는 소문자 · 문장 부호 · 축약형을 맞춘 뒤에도 서로 달라야 쓸모가 있다(`It is big.` 와 `it's big` 는 같은 답이다).

## 6. 단원별 평가 몫(제안)

장 6개에 단원마다 두 턴씩, 모두 단원마다 12턴이다. 같은 단원의 12턴은 서로 다른 단원 단어를 노리고(25개 가운데 12개 이상), 아래 묶음을 고루 쓴다. 단원 단어 목록은 7절이다.

| 단원 | 학습 요소 | 평가 턴 묶음(예) |
|---|---|---|
| 1 선생님과 첫 만남 | a · an + 명사 | 이름(`What is your name?` → `My name is {NAME}.`) · 좋아하는 것(`Milk? Juice?` → `I like milk.`) · 간식 · 점심(`Candy? Cake? Your snack?` → `My snack is candy.`) · 고마워(`Your cookie, {NAME}!` → `Oh, thank you!`) · 어때(`The pizza. How is it?` → `It is hot.`) · 무엇(`A red fruit. What is it?` → `It is an apple.`) |
| 2 내 방 구경 | This is ~ | 내 것 보여 주기(`Your toy. What is this?` → `This is my ball.`) · 무엇(`A little dog. What is it?` → `It is a puppy.`) · 옷(`Your cap. What is that?` → `That is my cap.`) |
| 3 무슨 색일까 | 색 · 크기 + 명사 | 내 물건의 색(`Your bag. What color is it?` → `It is blue.`) · 크기(`A bus! Big? Small?` → `It is big.`) · 좋아하는 색(`Red? Blue?` → `I like the color red.`) · 탈것(`A big red thing. What is it?` → `It is a red bus.`) |
| 4 좋아하는 것 | I like ~ | 좋아하는 것(`What do you like?` → `I like my book.`) · 몸(`Your face. What is this?` → `This is my nose.`) · 물건(`Your desk. How is it?` → `It is old.`) |
| 5 나이와 숫자 | 수 + 복수 -s | 나이(`How old are you?` → `I am ten.`) · 셈(`A dog. How many legs?` → `Four legs.`) · 크기(`A tree. Tall? Little?` → `It is tall.`) · 좋아하는 것(`Songs? Books?` → `I like songs.`) |

같은 단원의 두 턴은 한 장 안에서 다른 묶음을 쓴다(제안 — 한 장에 이름 두 번 · 나이 두 번 ×). 세 벌은 나란한 벌이다 — 벌마다 같은 단원 · 같은 묶음 · 비슷한 어려움으로 하되 질문 글과 노리는 낱말을 바꾼다(제안).

## 7. 어휘 범위(vocab 1단계)

`talk-1.md` 7절과 같다. 아이가 할 말(`sentenceEn` · `frameEn` · `allowed`)은 1단계 낱말(활용형 포함) · `{NAME}` 만, 질문 · 첫 말은 같은 범위에 선생님 수업 말(good · great · fun · see · soon · again · let's · talk)을 더한 범위다. 수는 영어 낱말로 쓴다. or 는 쓰지 않는다(2단계 — 고르는 질문). 연결 단원의 단원 단어는 아래와 같다(빈칸 허용 답의 낱말도 1단계 범위 안에서 센다).

**기능어 32개**: `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 [am, is, are, was, were, been, being] · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) [does, did, done, doing] · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의

- **회화 단원 1 (선생님과 첫 만남)**: `name` 이름 [names] · `apple` 사과 [apples] · `egg` 달걀 [eggs] · `banana` 바나나 [bananas] · `milk` 우유 · `cake` 케이크 [cakes] · `candy` 사탕 [candies] · `cookie` 쿠키, 과자 [cookies] · `cheese` 치즈 [cheeses] · `grape` 포도 [grapes] · `pizza` 피자 [pizzas] · `jam` 잼 [jams] · `rice` 밥, 쌀 · `snack` 간식 [snacks] · `like` 좋아하다 [likes, liked, liking] · `thank` 고마워하다 [thanks, thanked, thanking] · `cute` 귀여운 [cuter, cutest] · `nice` 좋은, 멋진 [nicer, nicest] · `hot` 뜨거운, 더운 [hotter, hottest] · `top` 팽이, 꼭대기 [tops] · `fan` 선풍기, 부채 [fans] · `pot` 냄비, 화분 [pots] · `brush` 솔, 붓 [brushes, brushed, brushing] · `lunch` 점심 · `thick` 두꺼운 [thicker, thickest]
- **회화 단원 2 (내 방 구경)**: `cat` 고양이 [cats] · `dog` 개 [dogs] · `pig` 돼지 [pigs] · `duck` 오리 [ducks] · `fish` 물고기 · `bird` 새 [birds] · `rabbit` 토끼 [rabbits] · `frog` 개구리 [frogs] · `sheep` 양 · `puppy` 강아지 [puppies] · `fox` 여우 [foxes] · `chicken` 닭, 닭고기 [chickens] · `snake` 뱀 [snakes] · `hat` 모자 [hats] · `cap` (챙 달린) 모자 [caps] · `sock` 양말 [socks] · `shoe` 신발 [shoes] · `shirt` 셔츠 [shirts] · `jacket` 재킷, 웃옷 [jackets] · `ball` 공 [balls] · `doll` 인형 [dolls] · `bike` 자전거 [bikes] · `kite` 연 [kites] · `ring` 반지, 울리다 [rings, rang, rung, ringing] · `game` 놀이, 게임 [games]
- **회화 단원 3 (무슨 색일까)**: `red` 빨간, 빨간색 [reds] · `blue` 파란, 파란색 [blues] · `yellow` 노란, 노란색 [yellows] · `green` 초록의, 초록색 [greens] · `black` 검은, 검은색 [blacks] · `white` 하얀, 흰색 [whites] · `pink` 분홍의, 분홍색 [pinks] · `orange` 오렌지, 주황색 [oranges] · `color` 색, 색깔 [colors] · `big` 큰 [bigger, biggest] · `small` 작은 [smaller, smallest] · `long` 긴 [longer, longest] · `short` 짧은, 키가 작은 [shorter, shortest] · `bus` 버스 [buses] · `car` 자동차 [cars] · `ship` 배 [ships] · `truck` 트럭 [trucks] · `plane` 비행기 [planes] · `bed` 침대 [beds] · `bath` 목욕, 욕조 [baths] · `dish` 접시, 요리 [dishes] · `tent` 텐트 [tents] · `home` 집 [homes] · `shop` 가게, 쇼핑하다 [shops, shopped, shopping] · `bank` 은행 [banks]
- **회화 단원 4 (좋아하는 것)**: `bag` 가방 [bags] · `pen` 펜 [pens] · `pencil` 연필 [pencils] · `book` 책 [books] · `cup` 컵 [cups] · `map` 지도 [maps] · `desk` 책상 [desks] · `chair` 의자 [chairs] · `toy` 장난감 [toys] · `drum` 북, 드럼 [drums] · `clock` 시계 [clocks] · `lamp` 램프, 전등 [lamps] · `bell` 종 [bells] · `eye` 눈 [eyes] · `ear` 귀 [ears] · `nose` 코 [noses] · `mouth` 입 [mouths] · `face` 얼굴 [faces] · `hand` 손 [hands] · `leg` 다리 [legs] · `arm` 팔 [arms] · `old` ~살의, 늙은 [older, oldest] · `neck` 목 [necks] · `tooth` 이, 이빨 [teeth] · `smile` 미소, 웃다 [smiles, smiled, smiling]
- **회화 단원 5 (나이와 숫자)**: `one` 1, 하나 · `two` 2, 둘 · `three` 3, 셋 · `four` 4, 넷 · `five` 5, 다섯 · `six` 6, 여섯 · `seven` 7, 일곱 · `eight` 8, 여덟 · `nine` 9, 아홉 · `ten` 10, 열 · `tall` 키가 큰, 높은 [taller, tallest] · `little` 작은, 어린 · `thin` 얇은, 마른 [thinner, thinnest] · `sun` 해, 태양 [suns] · `tree` 나무 [trees] · `flower` 꽃 [flowers] · `rock` 바위, 돌 [rocks] · `lake` 호수 [lakes] · `sand` 모래 · `rose` 장미 [roses] · `shell` 조개껍데기 [shells] · `king` 왕 [kings] · `swing` 그네, 흔들다 [swings, swung, swinging] · `wing` 날개 [wings] · `song` 노래 [songs]
- **회화 단원 밖의 1단계 낱말(읽기 · 쓰기 알파벳 단원 낱말 — 범위 안이지만 회화 단원 단어가 아니다)**: `ant` 개미 [ants] · `bear` 곰 [bears] · `box` 상자 [boxes] · `cow` 소 [cows] · `door` 문 [doors] · `elephant` 코끼리 [elephants] · `fork` 포크 [forks] · `guitar` 기타 [guitars] · `horse` 말 [horses] · `insect` 곤충 [insects] · `juice` 주스 · `key` 열쇠 [keys] · `lion` 사자 [lions] · `monkey` 원숭이 [monkeys] · `nurse` 간호사 [nurses] · `octopus` 문어 [octopuses] · `piano` 피아노 [pianos] · `queen` 여왕 [queens] · `robot` 로봇 [robots] · `star` 별 [stars] · `tiger` 호랑이 [tigers] · `umbrella` 우산 [umbrellas] · `violin` 바이올린 [violins] · `window` 창문 [windows] · `yo-yo` 요요 [yo-yos] · `zebra` 얼룩말 [zebras]

내용어는 모두 151개다.

## 8. 학습 요소 범위와 문장 꼴

`talk-1.md` 8절과 같다. 평가는 그 단계까지의 형태라(검증기 allowedForms 'test') 1단계는 형태 표의 형태를 하나도 쓸 수 없다 — he · she · we · they · have · can · There is · Let's(talk · learn 앞 밖) · be 부정 · 진행 · 과거 · 3인칭 동사(says · asks …) · some 이 걸린다. 검출기가 못 잡지만 쓰지 않는 꼴: 3인칭 단수 -s · 명령문 · 문장을 잇는 and · or · `Is it ~?` · `Do you ~?`(단원 4 몫의 `What do you like?` 와 `What is your name?` · `How old are you?` 는 쓴다) · Where · Who 의문문.

관사 · 수: milk · rice · jam · sand 는 관사 없이, cake · pizza · cheese 도 관사 없이 쓰고(`It is cake.`), sun 은 `the sun`, 셀 수 있는 명사의 `I like ~` 는 단원 1~4 몫에서 `I like the apple.` · `I like my bag.` 꼴, 복수는 단원 5 몫(`Four legs.` · `I like songs.`)과 grapes 만.

## 9. 그림 규칙

없음 — 평가 턴에는 그림 칸이 없다. 그래서 '무엇일까' 질문은 상황 말(`A red fruit.` · `A little dog.`)로 답을 하나로 좁힌다. 색 · 모습은 실제와 맞게 쓴다.

## 10. 선생님 · 인물

- 말하는 이는 아이가 고른 회화 선생님(앱 속 AI 선생님)이다. **선생님 이름을 쓰지 않는다** — 'Tori' · '토리'와 명단 이름(Mina · 미나 · Leo · 리오)을 모든 글 칸에 쓰지 않는다(`teacher-name`). `{TEACHER}` 도 쓰지 않는다(틀 자리는 `{NAME}` 하나). (제안) 뒤 명단 이름(Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi / 루비 · 소라 · 하나 · 준 · 나비 · 루나 · 키키 · 루루 · 팡팡 · 삐삐)도 피하고, 한국어의 '하나'는 '한 개' · '1' 로 쓴다.
- 선생님 자기 이야기 · 사람 삶 · 종 · 성별을 쓰지 않는다. 아이에게 사는 곳 · 학교 · 가족 · 연락처 · 생김새 평가를 묻지 않는다. 이름 · 나이 · 좋아하는 것은 3.3 1단계 행대로 묻는다.
- 한국어 칸에서 `{NAME}` 바로 뒤에 조사를 붙이지 않는다(`내 이름은 {NAME}.`).
- 인물 이름 표(Momo · Ben · Meg · Dan · Tess · Max · Ted · Gus)는 평가에 쓰지 않는다(제안 — 아이가 말할 문장 · 허용 답에 이름이 들면 음성 인식이 다르게 적어 맞음을 놓칠 수 있고, 1단계 평가는 아이 자신과 물건을 묻는다). 토리는 쓸 수 없다.

## 11. 수업 종류별 내용

없음.

## 12. 출력 규격(Zod `LevelTestFileSchema` talk · `TalkTestSheetSchema` 와 1:1)

모르는 키는 거부된다. 파일 겉: `{ "area": "talk", "level": 1, "forms": [ { "form": 1, "sheets": [ 장, 장 ] }, { "form": 2, … }, { "form": 3, … } ] }`.

| 필드 | 꼴 | 설명 |
|---|---|---|
| `form` | 1~3 | 벌 번호 |
| `sheet` | 1~2 | 장 번호(벌 안에서 겹침 없음) |
| `revision` · `correction` | 0 이상 정수 | 호출 값 |
| `firstLine` | `{ "en", "ko" }` | 첫 말 |
| `turns` | 10개 | 평가 턴 |
| 턴 `question` | `{ "en", "ko" }` | 선생님 질문과 한국어 뜻 |
| 턴 `allowed` | `[{ "text" }, { "text", "slotPos" }]` 3개 이상 | 빈칸이 있으면 `slotPos` 필수, 없으면 두지 않는다 |
| 턴 `childKo` · `frameEn` · `sentenceEn` | 글 | 5절 |
| 턴 `unit` | 1~5 | 연결 단원 |

`generation` 칸은 없다(보고에만 적는다).

예시: 벌 1 장 1 의 10턴 가운데 3턴(1 · 3 · 9번)만 보인다. 꼴을 보이는 예이니 그대로 옮기지 않는다(질문 글을 새로 쓴다). 줄이기 전의 장 하나 전체(10턴)를 2026-10-23 에 검증기로 확인했다 — 칸 오류 0 · 경고 0, 14절 스스로 확인 걸림 없음.

```json
{
  "area": "talk",
  "level": 1,
  "forms": [
    {
      "form": 1,
      "sheets": [
        {
          "sheet": 1,
          "revision": 1,
          "correction": 0,
          "firstLine": {
            "en": "Hello, {NAME}! Let's talk.",
            "ko": "안녕, {NAME}! 이야기하자."
          },
          "turns": [
            {
              "question": {
                "en": "Milk? Juice?",
                "ko": "우유? 주스?"
              },
              "allowed": [
                {
                  "text": "I like milk."
                },
                {
                  "text": "I like juice."
                },
                {
                  "text": "I like ___.",
                  "slotPos": "noun"
                }
              ],
              "childKo": "나는 우유가 좋아.",
              "frameEn": "I like ___.",
              "sentenceEn": "I like milk.",
              "unit": 1
            },
            {
              "question": {
                "en": "A little dog. What is it?",
                "ko": "작은 개야. 뭐라고 불러?"
              },
              "allowed": [
                {
                  "text": "It is a puppy."
                },
                {
                  "text": "a puppy"
                },
                {
                  "text": "puppy"
                }
              ],
              "childKo": "강아지야.",
              "frameEn": "It is a ___.",
              "sentenceEn": "It is a puppy.",
              "unit": 2
            },
            {
              "question": {
                "en": "How old are you?",
                "ko": "너는 몇 살이야?"
              },
              "allowed": [
                {
                  "text": "I am ten."
                },
                {
                  "text": "I am ___.",
                  "slotPos": "number"
                },
                {
                  "text": "ten"
                }
              ],
              "childKo": "나는 열 살이야.",
              "frameEn": "I am ___.",
              "sentenceEn": "I am ten.",
              "unit": 5
            }
          ]
        }
      ]
    }
  ]
}
```

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말 · 정규식, 개인 정보를 묻는 말(사는 곳 · 집 주소 · 전화번호 · 학교 이름 · 반 · 성 · 전체 이름 · 이메일 · 비밀번호), 연락처 꼴, (제안) 가족 · 생김새 평가 질문.
- 선생님 이름 · 토리 · `{TEACHER}`, 선생님의 사람 삶.
- 메타 문장(the child · the user · as an AI …)을 선생님 질문 · 첫 말에 쓰지 않는다.
- (제안) 무섭거나 다치는 장면, 상표 · 실제 인물 · 종교 · 정치. 설계 숫자(20턴 · 16점 등)를 글에 쓰지 않는다.

## 14. 스스로 확인과 검증 명령

1. 벌 3 × 장 2, 장마다 10턴, 단원마다 두 턴, 턴마다 `unit`.
2. 질문 · 첫 말 · 영어 틀 · 영어 문장 · 허용 답 모두 5낱말 이하, 8절 꼴 밖의 형태 없음.
3. 질문마다 `ko`, 아이 말의 `childKo`(반말) · `frameEn`(빈칸 하나) · `sentenceEn`(연결 단원 단어가 든다).
4. 허용 답 3개 이상, 빈칸 답에 `slotPos`, 답이 하나로 정해진 질문에 빈칸 답 없음, 질문에 든 낱말 하나만의 허용 답 없음, 예 · 아니오 질문 없음.
5. 질문 글 60개가 서로 다르다(벌끼리 겹치면 오류). 장마다 수업 카드와 같은 질문 3개까지, 같은 차례로 두 턴 넘게 이어지지 않음.
6. 7절 어휘 범위, 수는 영어 낱말, or 없음.
7. 선생님 이름 · 토리 · 뒤 명단 이름 · `{TEACHER}` 없음, 인물 이름 없음, `{NAME}` 뒤 조사 없음, 한국어 '하나 · 소라 · 나비 · 준' 없음.
8. 세 벌이 나란하다(단원 · 묶음 · 어려움). 13절 금지 목록에 걸리는 말이 없다.

수업 카드 질문 목록(먼저 돌려 본다 — 이 글들을 평가 질문으로 쓰지 않는다):

```sh
python3 - <뿌리> <<'PY'
import glob, json, re, sys
from collections import Counter
c = Counter()
for path in sorted(glob.glob(f"{sys.argv[1]}/lessons/talk/1/*.json")):
    for l in json.load(open(path))["lessons"]:
        card = l["card"]
        for g in card["greeting"].get("questions", []):
            c[re.sub(r"\s+", " ", g["question"]["en"].strip())] += 1
        for t in (card.get("turns") or []) + (card.get("moreTalk") or []):
            c[re.sub(r"\s+", " ", t["question"]["en"].strip())] += 1
for q, n in c.most_common():
    print(n, q)
PY
```

스스로 확인 명령(어휘 범위 · or · 질문 겹침 · 수업 카드와 같은 질문 수 · 연결 단원 단어 · 선생님 이름 · `{NAME}` 뒤 조사 — 검증기가 보지 않는 것과 미리 볼 것). '스스로 확인 걸림 없음'이 나올 때까지 고친다.

```sh
python3 - <뿌리> <<'PY'
import glob, json, re, sys
from collections import Counter

root = sys.argv[1]
vocab = json.load(open(f"{root}/vocab.json"))["vocab"]
units = {u["unit"]: u["words"] for u in json.load(open(f"{root}/unit-specs.json"))["unitSpecs"]
         if u["area"] == "talk" and u["level"] == 1}
test = json.load(open(f"{root}/level-tests/talk/1.json"))
lex = {}
for v in vocab:
    for f in [v["word"]] + v["forms"]:
        lex.setdefault(f.lower(), set()).add(v["word"])
level1 = {s for s, ws in lex.items() if any(next(x for x in vocab if x["word"] == w)["level"] <= 1 for w in ws)}
EXTRA = {"good", "fine", "great"}
NAMES = ["Momo", "Ben", "Meg", "Dan", "Tess", "Max", "Ted", "Gus"]
TEACHER_EN = ["Tori", "Mina", "Leo", "Ruby", "Sora", "Hana", "Jun", "Nabi", "Luna", "Kiki", "Lulu", "Pang", "Pipi"]
TEACHER_KO = ["토리", "미나", "리오", "루비", "소라", "하나", "준", "나비", "루나", "키키", "루루", "팡팡", "삐삐"]
SUFFIX = ["'m", "'re", "'s", "'ve", "'ll", "'d", "n't"]
TOKEN = re.compile(r"\{[A-Z_]+\}(?:'s)?|_{3,}|\d+|[A-Za-z]+(?:'[A-Za-z]+)*(?:-[A-Za-z]+)*")
key = lambda t: re.sub(r"\s+", " ", t.strip()).lower()
lesson_q = Counter()
for path in glob.glob(f"{root}/lessons/talk/1/*.json"):
    for l in json.load(open(path))["lessons"]:
        c = l["card"]
        for g in c["greeting"].get("questions", []):
            lesson_q[key(g["question"]["en"])] += 1
        for t in (c.get("turns") or []) + (c.get("moreTalk") or []):
            lesson_q[key(t["question"]["en"])] += 1
problems = []

def words(text):
    return TOKEN.findall(text.replace("’", "'"))

def offband(text, extra=frozenset()):
    bad = []
    for tok in words(text):
        low = tok.lower()
        if tok.startswith("{") or tok.startswith("_"):
            continue
        if tok.isdigit():
            bad.append(tok)
            continue
        if low in level1 or low in extra:
            continue
        stem = next((low[: -len(s)] for s in SUFFIX if low.endswith(s) and len(low) > len(s)), None)
        if stem is None or stem not in level1:
            bad.append(tok)
    return bad

seen = {}
for form in test["forms"]:
    for sheet in form["sheets"]:
        at = f"벌 {form['form']} 장 {sheet['sheet']}"
        same = 0
        texts_ko = [sheet["firstLine"].get("ko", "")]
        for i, t in enumerate(sheet["turns"]):
            q = t["question"]["en"]
            k = key(q)
            if k in seen and seen[k] != at:
                problems.append(f"{at} 턴 {i + 1}: 질문 글이 {seen[k]} 와 같다(모든 장에서 서로 다르게): {q}")
            seen.setdefault(k, at)
            if lesson_q[k]:
                same += 1
            if re.search(r"(?<![A-Za-z])or(?![A-Za-z])", q, re.I):
                problems.append(f"{at} 턴 {i + 1}: 질문에 or(2단계 — 늘어놓기 꼴로): {q}")
            bad = offband(q)
            if bad:
                problems.append(f"{at} 턴 {i + 1}: 질문에 범위 밖 낱말 {bad}")
            for text in [t["sentenceEn"], t["frameEn"]] + [a["text"] for a in t["allowed"]]:
                bad = offband(text, EXTRA)
                if bad:
                    problems.append(f"{at} 턴 {i + 1}: 아이 말에 범위 밖 낱말 {bad}: {text}")
                hit = [n for n in NAMES if re.search(rf"(?<![A-Za-z]){n}(?![A-Za-z])", text)]
                if hit:
                    problems.append(f"{at} 턴 {i + 1}: 아이 말에 인물 이름 {hit}")
            unit_ids = {w for tok in words(t["sentenceEn"]) for w in lex.get(tok.lower(), set())} & set(units[t["unit"]])
            if not unit_ids and "{NAME}" not in t["sentenceEn"]:
                problems.append(f"{at} 턴 {i + 1}: 영어 문장에 연결 단원 {t['unit']} 의 단원 단어가 없다: {t['sentenceEn']}")
            qwords = {tok.lower() for tok in words(q)}
            for a in t["allowed"]:
                toks = [tok.lower() for tok in words(a["text"]) if tok.lower() not in ("a", "an", "the", "my")]
                if len(toks) == 1 and toks[0] in qwords:
                    problems.append(f"{at} 턴 {i + 1}: 질문에 든 낱말 하나만의 허용 답(따라 말해도 맞는다): {a['text']}")
                if "___" in a["text"] and len(re.findall(r"_{3,}", a["text"])) != 1:
                    problems.append(f"{at} 턴 {i + 1}: 틀 자리는 빈칸 하나: {a['text']}")
            texts_ko += [t["question"].get("ko", ""), t["childKo"]]
            every = [q, t["sentenceEn"], t["frameEn"]] + [a["text"] for a in t["allowed"]]
            for text in every:
                for n in TEACHER_EN:
                    if re.search(rf"(?<![A-Za-z]){n}(?![A-Za-z])", text, re.I):
                        problems.append(f"{at} 턴 {i + 1}: 선생님 이름(뒤 명단 포함) {n}")
        for text in texts_ko:
            for n in TEACHER_KO:
                for m in re.finditer(n, text):
                    if m.start() == 0 or not re.match(r"[가-힣]", text[m.start() - 1]):
                        problems.append(f"{at}: 한국어에 선생님 이름과 같은 글자 '{n}'(다른 말로): {text}")
                        break
            if re.search(r"\{NAME\}[가-힣]", text):
                problems.append(f"{at}: {{NAME}} 바로 뒤에 조사: {text}")
        units_in = Counter(t["unit"] for t in sheet["turns"])
        print(f"{at}: 수업 카드와 같은 질문 {same}개(상한 3) · 단원별 턴 {dict(sorted(units_in.items()))}")
print(f"수업 카드 질문 글 {len(lesson_q)}가지를 견줬다")
print("\n".join(problems) if problems else "스스로 확인 걸림 없음")
PY
```

검증 명령(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas talk --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="level-tests/talk/1.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(장 6 · 오류가 있는 장 수 · 규칙별 오류 수 · 경고 수)를 그대로 적어 둔다.
- 오류가 있으면 그 장만 고치고 다시 검증한다. 고침은 2회(`seed.max_retries`)까지다. 그래도 남으면 멈추고 남은 오류를 보고한다.
- 회화 평가 카드는 풀이 검사 대상이 아니다(앱이 허용 답 일치율로 센다).

## 15. 근거 한 줄

회화 1단계 평가는 can-do('자기 이름 · 나이 · 좋아하는 것과 그림 속 물건에 대해 … 스스로 답하며 말을 주고받을 수 있다')를 그림 없이, 들은 질문과 한국어 뜻만으로 영어 한 문장을 말하게 해 본다([4영02-08] · [4영02-10], CEFR Overall spoken interaction · Information exchange Pre-A1). 힌트 단이 점수를 나누므로(3.2) 영어 틀과 문장은 그 뜻 그대로의 짧은 정형 문장이다.

## 16. 보고 꼴

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값> · briefHash: <호출 값> · agentHash: <호출 값> · createdOn: <호출 값>
파일: <뿌리>/level-tests/talk/1.json · 벌 <n> · 장 <n> · 턴 <n> · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
첫 검증: 장 <n> · 오류 장 <n> · 규칙별 <rule n, …> · 경고 <n>
고침: <회차마다 고친 장 · 남은 오류>
스스로 확인 명령: 첫 결과 <걸림 n> · 마지막 결과
수업 카드와 같은 질문: 장마다 <n>(상한 3)
단원별 노린 단원 단어 수: 단원 1 <n> · 2 <n> · 3 <n> · 4 <n> · 5 <n>(각 12턴)
빈칸 허용 답이 있는 턴: <n> · 핵심 낱말 허용 답이 있는 턴: <n>
스스로 확인: 14절 1~8 각각 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 머리 | 회화 평가를 카드 브리프와 떼어 이 파일로, 이름은 `level-test-talk-1.md` | 단계 평가 묶음은 영역 × 단계마다 하나이고(6.3), 수업 카드 5단원 뒤에 만든다(겹침 검사가 카드를 본다). 다른 영역 평가 브리프 이름에 맞췄다 |
| 2 | 생성 단위 = 브리프 하나 · 호출 하나 · 파일 하나(장 6) | 벌끼리 질문이 겹치면 안 되므로(`talk-test-forms-overlap`) 한 호출이 세 벌을 함께 보는 편이 맞다. 60턴이라 한 호출 분량이다 |
| 3 · 5 | 예 · 아니오 질문을 두지 않음 | be · do 의문문은 2단계 요소이고, 두면 예 · 아니오 쪽 허용 답을 다 두어야 해 '예'만 말해도 맞음이 되기 쉽다 |
| 5 | 상황 말로 답을 좁히는 질문 · `sentenceEn` 에 연결 단원 단어 · 빈칸 하나 · 관사는 빈칸 밖 · 빈칸은 열린 질문에만 · 질문에 든 낱말 하나만의 허용 답 없음 | 그림이 없는 평가 턴에서 '무엇'을 물으려면 말로 좁혀야 한다. 빈칸 맞춤 코드가 아직 없어 가장 보수적인 꼴로 둔다(구현하며 확인). 닫힌 질문에 빈칸을 두면 틀린 명사도 맞음이 되고, 질문 낱말 하나만 허용하면 따라 말하기로 맞는다 |
| 5 | 핵심 낱말 허용 답(`a puppy` · `blue`) | 1단계 회화는 낱말로 답해도 되는 단계다(Pre-A1). 문장만 받으면 1단계 평가가 2~3단계 몫(한 문장으로 답하기)이 된다 |
| 6 | 단원별 평가 묶음 · 한 장 안 같은 묶음 두 번 × · 단원마다 12턴이 서로 다른 단원 단어 · 세 벌 나란히 | 정본은 '단원마다 두 턴'과 벌 사이 겹침 없음만 정했다. 벌을 바꿔 다시 볼 때 어려움이 출렁이지 않게 한다 |
| 7 | 질문에 or 를 쓰지 않음 · 아이 말은 1단계 낱말만 | `talk-1.md` 7절과 같은 까닭(P6a 근거 문서 · 6.4 실시간 힌트 범위). 빈칸 낱말도 '그 단계 어휘 범위 안'이어야 맞는다(3.2) |
| 10 | 인물 이름을 평가에 쓰지 않음 · 뒤 명단 이름 피함 | 아이가 말할 글에 이름이 들면 인식이 다르게 적어 맞음을 놓칠 수 있다. 명단이 늘면 검사가 다시 본다(C132 (1)) |
| 14 | 수업 카드 질문 목록 명령 · 스스로 확인 명령 | 생성자는 수업 카드 파일을 읽지 않으므로 겹칠 글을 명령으로 본다. 겹침은 검증기도 보지만 미리 피하면 고침이 준다 |
