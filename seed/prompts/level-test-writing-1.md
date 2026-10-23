# 생성 브리프 — 쓰기 1단계 단계 평가(`level-test-writing-1`)

이 파일은 쓰기 1단계 단계 평가 묶음의 프롬프트 판이다(정본 6.3 — 단계 평가 문항 묶음은 영역 × 단계마다 하나). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 평가 문항 세 벌(level.test_forms 3 × 20문항 = 60문항)을 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 숫자와 규칙은 저장소 파일에서 옮겼다. 정본에 없는 값은 '(제안)'으로 적었고 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 이 묶음을 처음부터 다시 만든다.

**쓰기 1단계 평가도 고르기 · 베끼기 · 채우기만 한다. 아이가 문장을 만들어 내는 문항은 없다**(정본 3.3, 요청자 결정 2026-10-15). 문항마다 답은 낱말 하나다.

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 영역 · 단계 | `writing` · 1 · CEFR Pre-A1 · 구간 `1-3` · 모양 `items` · 단계 평가 |
| 틀 | `seed/prompts/_template.md`(절 번호 그대로, 평가에 없는 칸은 그 절에 적음) |
| 만든 날 · 만든 이 | 2026-10-23 첫 판 · 학습 설계자(cur-p08 평가) |
| 옮긴 곳 | `seed/level-specs.json`(writing 1 · testMix) · `settings.json`(level.*) · `unit-specs.json` · `vocab.json` · `images.json` · `lists/forbidden.json` · `src/core/seed/schema/assessment.ts` · `schema/lesson.ts`(쓰기 문항 갈래) · `check-assessment.ts` · `check-lesson.ts` checkWritingItem · `solve-check.ts`(풀이 검사가 보는 칸) · `src/core/answer/check.ts`(앱 판정) · `writing-1.md` 7 · 8 · 9절(어휘 · 철자 패턴 · 그림 표) · 정본 3.2 단계 평가 · 3.3 쓰기 · 3.6 · 6.3 단계 평가 행 · 6.4 · 13절 C66 · C73 · C84 · C88 · C124 · C126 · C128 · 장부 'P8 쓰기 1 풀이 검사 헛경보' · 'P8 그림 문항 규칙' |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 뿌리 폴더 | `seed` 또는 표본 폴더 | 쓸 파일 `<뿌리>/level-tests/writing/1.json` |
| briefHash · agentHash · effort · createdOn | 64자 · 64자 · `high` · `2026-10-23` | 보고에만 적는다(아래) |
| revision · correction | `2` · `0` | 모든 문항 |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

- 쓰는 파일은 **수업 파일이 아니라 이 평가 파일 하나**다. 생성 정의의 '브리프가 정한 파일 하나'가 이 파일이다.
- 평가 문항 규격에는 `generation` 칸이 없다(넣으면 거부된다). 모델 ID · effort · 해시 · 날짜는 보고(16절)에 적는다.

## 2. 할 일 한눈에

1. 6절에서 단원 1~5 의 단원 단어를 보고, 세 벌의 **답 낱말 표**를 먼저 정한다: 단원마다 벌당 4개 × 3벌 = 12개, 한 낱말은 세 벌을 통틀어 한 번만 답이 된다. 갈래마다 맞는 낱말을 고른다(고르기는 그림 있는 낱말, 채우기는 그 단원 철자 패턴 낱말, 베끼기는 6글자 이하 — 11절).
2. 벌 1 의 20문항을 5절 차례 표대로 만든다.
3. 벌 2 · 3 을 같은 차례 표로, 다른 답 낱말로 만든다.
4. 파일 하나 `{ "area": "writing", "level": 1, "forms": [ {"form": 1, "items": [...]}, … ] }` 에 넣는다. 문항은 번호 차례로 둔다.
5. 14절 스스로 확인 명령 → 고침(회차로 세지 않는다) → 검증 명령(첫 검증) → 오류 문항만 고침(2회까지) → 16절 보고.

## 3. 단계 규격과 단계 평가 규칙

| 칸 | 값 |
|---|---|
| can-do | 그림에 맞는 단어를 고르고 철자 타일로 단어 6개를 베끼거나 빠진 글자를 채워 쓸 수 있다 |
| CEFR · 모양 | Pre-A1 · `items`(앱이 정답과 견준다, AI 없음) |
| 문항 유형 `testMix` | `pick-word` 6 · `copy-tiles` 4 · `fill-letters` 10 — 벌마다(C66). 다른 갈래(받아쓰기 · 조립 · 빈칸 채우기 · 작문)는 두지 않는다 |
| 문장 | 문항 글은 모두 낱말 하나. 평가에는 영어 문장이 없다(미리보기 예문도 없다) |
| 입력 | 타일 누르기 |

정본 3.3 쓰기 단계표 1단계 행: 과제 '그림 보고 단어 고르기, 철자 타일로 단어 베끼기, 빠진 글자 타일 채우기(b_ll → ball)' · 분량 '단어 6개' · 입력 '타일 누르기'.

단계 평가 규칙(정본 3.2 · 6.3 · 6.4):

- 단원 5 를 통과하면 단계 평가가 열린다. 20문항(level.test_items)을 10문항씩(level.test_items_per_session) 두 세션에 나눠 본다. 번호 1~10 이 첫 세션, 11~20 이 둘째 세션이다.
- 쓰기 1단계 문항은 정답이 있어 맞으면 1, 아니면 0 이다(앱이 허용 정답과 견준다). 합이 ⌈20 × 0.8⌉ = 16(level.pass_score) 이상이면 승급한다.
- 못 넘으면 틀린 문항과 연결 단원(`unit`)의 보강 수업 2회 뒤 다른 벌로 다시 본다. 그래서 문항마다 그 문항이 재는 단원(철자 패턴)을 정확히 적는다.
- 벌 3개(level.test_forms) 사이에 문항이 겹치지 않는다. 벌마다 단원별 문항 수가 4 다. 고르기의 (그림, 보기 묶음)은 1단계 쓰기 수업 고르기 문항과 같지 않다(6.4, 검증기 `level-test-item-overlap`).

근거: 2022 개정 초3~4 성취기준 [4영02-02] · [4영02-03](소리와 철자의 관계를 바탕으로 낱말을 쓴다), CEFR Overall written production Pre-A1(근거 문서가 '(추측)'으로 적은 척도).

## 4. 평가 틀(`settings` · 구조 수)

| 값 | 뜻 |
|---|---|
| `level.test_items` 20 | 벌 하나의 문항 수 |
| `level.test_items_per_session` 10 | 세션 하나의 문항 수(번호 1~10 · 11~20) |
| `level.test_forms` 3 | 벌 수(`form` 1 · 2 · 3) |
| `level.pass_score` 0.8 | 통과 ⌈문항 수 × 0.8⌉ |
| `writing.rule_check_until_level` 3 | 이 단계까지 모양 `items` |
| 연결 단원 `unit` | 1~5. 알파벳 · 소리 단원(단원 0)은 연결 단원이 아니다 |
| `seed.max_retries` 2 | 검증 뒤 고침 회차 상한 |

## 5. 문항 구성(차례 표)

세 벌 모두 같은 차례 표를 쓴다(제안 — 나란한 벌). 세션마다 다섯 단원을 두 문항씩 보고, 세션 안에서 고르기 → 베끼기 → 채우기 차례로 쉬운 것부터 간다.

| 번호 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 유형 | pick-word | pick-word | pick-word | copy-tiles | copy-tiles | fill-letters | fill-letters | fill-letters | fill-letters | fill-letters |
| 연결 단원 | 1 | 3 | 5 | 2 | 4 | 1 | 2 | 3 | 4 | 5 |

| 번호 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|
| 유형 | pick-word | pick-word | pick-word | copy-tiles | copy-tiles | fill-letters | fill-letters | fill-letters | fill-letters | fill-letters |
| 연결 단원 | 2 | 4 | 5 | 1 | 3 | 1 | 2 | 3 | 4 | 5 |

단원마다: 채우기 2(그 단원 철자 패턴을 재는 핵심 갈래), 단원 1~4 는 고르기 1 · 베끼기 1, 단원 5 는 고르기 2. 벌마다 고르기 6 · 베끼기 4 · 채우기 10(testMix).

| 갈래 | 아이가 보는 것 · 하는 일 | 칸 | 규칙 |
|---|---|---|---|
| `pick-word` 그림 보고 고르기 | 그림 한 장과 보기 글 넷. 누르면 바로 채점 | `picture`(정답 낱말 id, 9절 표의 그림 낱말) · `options`(보기 글 4개) · `answerNo` · `accepted`(`[정답 낱말]`) | `options[answerNo − 1]` 은 `accepted[0]` 과 글자 그대로 같다(검증기 `answer`). 오답 셋은 1단계 낱말(7절)이고, 그 가운데 둘 이상은 정답과 글자 꼴이 비슷한 낱말(같은 첫 글자 · 같은 끝 · 한두 글자만 다름, 그 단원 철자 패턴을 가르는 낱말)이다. 벌마다 정답 자리 1~4 를 고루(6문항이면 자리마다 한두 번) |
| `copy-tiles` 보고 베끼기 | 낱말 글과 섞인 글자 타일. 낱말 글자 수만큼 놓아야 끝 | `word` · `tiles` · `accepted`(`[word]`) | 타일은 그 낱말의 글자를 한 글자씩 모두 섞은 것이다(같은 글자는 그 수만큼). 낱말 차례 그대로 두지 않는다. 덤 타일은 두지 않는다. 낱말은 6글자까지 |
| `fill-letters` 빠진 글자 채우기 | 낱말 그림(그림 없는 낱말은 한국어 뜻 글), 빈칸 무늬(`b_ll`), 글자 타일. 들어올 때 낱말을 한 번 읽어 준다. 빈칸 수만큼 놓는다 | `word`(낱말 id 원형) · `pattern` · `tiles` · `accepted`(`[word]`) | `pattern` 은 `word` 와 글자 수가 같고 빈 글자만 `_` 다. 빈칸 자리는 8절 표(그 단원 철자 패턴 자리). 타일은 빈칸마다 한 글자 한 장 + 덤 글자 1~2장. **덤 글자를 빈칸에 넣어 생기는 모든 꼴이 영어 낱말이 아니다**(8절) |

모든 문항에 공통:

- 낱말 · 보기 · 타일 · 허용 정답은 모두 소문자다(대문자 타일이 하나라도 있으면 아이가 맞힐 수 없다).
- 타일은 모두 한 글자다(두 글자 타일 `sh` · `ck` 를 두면 답을 낼 수 없다 — 검증기는 이것을 잡지 못한다).
- `accepted` 는 정답 낱말 하나다(`["hat"]`). 1단계 낱말에는 다른 철자가 없다.
- `explanationKo` 는 한국어 해요체 한두 문장이다. 낱말의 뜻과 철자 패턴을 짚는다(`cat 은 고양이예요. 가운데 a 를 써요.` · `ship 은 sh 로 시작해요.`). 설계 숫자 · 단원 번호를 쓰지 않는다.

풀이 검사(정본 6.4)가 보는 것: 고르기는 '그림: <그 낱말의 한국어 뜻>'과 보기, 베끼기는 `word` 와 타일, 채우기는 **`pattern` 과 타일뿐**(그림 · 소리 · `word` 를 보지 않는다). 둘 이상 맞거나 앱 정답과 다르면 그 칸이 사람 확인으로 간다. 그래서 채우기는 무늬와 타일만으로 답이 하나여야 하고, 고르기는 한국어 뜻만으로 보기 하나가 골라져야 한다.

장부 'P8 쓰기 1 풀이 검사 헛경보' 교훈: 1단계 쓰기 수업의 채우기 문항이 풀이 검사에서 '여럿 · 없음'으로 많이 걸렸다(장부 첫 집계 17문항, 묶음 전체 68문항 — 채우기 312문항의 약 22%). 덤 글자 꼴(cip · mup · tep · cnp)이 영어 낱말이 아닌데도 풀이 AI 가 무늬와 타일만으로 답을 하나로 못 정했고, 사람이 모두 '정답 맞음'으로 풀었다. 평가에서는 (제안) 이렇게 줄인다: (1) 덤 글자 꼴이 사전 낱말 · 이름 · 줄임말 · 소리 흉내말 · 흔한 은어가 아닌지 하나씩 읽어 본다(빈칸이 둘이면 타일 차례를 바꾼 꼴까지), (2) 같은 무늬에 덤 글자를 고를 때 영어에서 흔히 쓰는 꼴(`-at` · `-en` · `-ip` · `-ot` 같은 끝)을 만드는 글자보다, 그 자리에 영어 낱말이 거의 없는 글자를 먼저 고른다, (3) 그래도 걸리면 사람 확인으로 가는 일이니 정답을 바꾸지 않는다.

## 6. 단원 규격(`unit-specs` writing 1)

쓰기 단원 단어는 읽기 · 말하기와 다르다(영역마다 따로, 정본 3.4). 연결 단원 u 의 문항은 쓰기 단원 u 의 단원 단어를 답으로 한다. 단원 0 낱말은 1단계 어휘 안이라 오답 보기에 쓸 수 있지만 답이 되지 않는다.

### 단원 0 — 알파벳 친구들 · 학습 요소 '알파벳 이름과 기본 소리' (평가의 연결 단원이 아니다 — 오답 보기 · 글에만 쓴다)

- 단원 단어 26개: ant(개미) · bear(곰) · cow(소) · door(문) · elephant(코끼리) · fork(포크) · guitar(기타) · horse(말) · insect(곤충) · juice(주스) · key(열쇠) · lion(사자) · monkey(원숭이) · nurse(간호사) · octopus(문어) · piano(피아노) · queen(여왕) · robot(로봇) · star(별) · tiger(호랑이) · umbrella(우산) · violin(바이올린) · window(창문) · box(상자) · yo-yo(요요) · zebra(얼룩말)
- 그림 있는 단원 단어 26개: ant, bear, cow, door, elephant, fork, guitar, horse, insect, juice, key, lion, monkey, nurse, octopus, piano, queen, robot, star, tiger, umbrella, violin, window, box, yo-yo, zebra
- 그림 없는 단원 단어 0개(그림 보기 · 그림 칸에 내지 않는다): 없음

### 단원 1 — 모자와 가방 · 학습 요소 '단모음 a · e'

- 단원 단어 25개: seven(7, 일곱) · ten(10, 열) · red(빨간, 빨간색) · yellow(노란, 노란색) · cat(고양이) · rabbit(토끼) · apple(사과) · egg(달걀) · candy(사탕) · bag(가방) · hat(모자) · cap((챙 달린) 모자) · pen(펜) · pencil(연필) · bed(침대) · desk(책상) · map(지도) · hand(손) · leg(다리) · sand(모래) · jam(잼) · fan(선풍기, 부채) · lamp(램프, 전등) · tent(텐트) · bell(종)
- 그림 있는 단원 단어 25개: seven, ten, red, yellow, cat, rabbit, apple, egg, candy, bag, hat, cap, pen, pencil, bed, desk, map, hand, leg, sand, jam, fan, lamp, tent, bell
- 그림 없는 단원 단어 0개(그림 보기 · 그림 칸에 내지 않는다): 없음

### 단원 2 — 돼지와 개구리 · 학습 요소 '단모음 i · o · u'

- 단원 단어 25개: six(6, 여섯) · big(큰) · little(작은, 어린) · one(1, 하나) · four(4, 넷) · dog(개) · pig(돼지) · frog(개구리) · green(초록의, 초록색) · small(작은) · milk(우유) · cup(컵) · doll(인형) · bus(버스) · pizza(피자) · drum(북, 드럼) · sun(해, 태양) · top(팽이, 꼭대기) · hot(뜨거운, 더운) · car(자동차) · pot(냄비, 화분) · fox(여우) · puppy(강아지) · wing(날개) · old(~살의, 늙은)
- 그림 있는 단원 단어 19개: six, one, four, dog, pig, frog, green, milk, cup, doll, bus, pizza, drum, sun, top, car, pot, fox, wing
- 그림 없는 단원 단어 6개(그림 보기 · 그림 칸에 내지 않는다): big, little, small, hot, puppy, old

### 단원 3 — 물고기와 배 · 학습 요소 'sh · ch · th'

- 단원 단어 25개: three(3, 셋) · short(짧은, 키가 작은) · fish(물고기) · two(2, 둘) · eight(8, 여덟) · sheep(양) · cheese(치즈) · chair(의자) · orange(오렌지, 주황색) · tall(키가 큰, 높은) · shoe(신발) · ship(배) · mouth(입) · tooth(이, 이빨) · cookie(쿠키, 과자) · shop(가게, 쇼핑하다) · shirt(셔츠) · shell(조개껍데기) · brush(솔, 붓) · toy(장난감) · dish(접시, 요리) · lunch(점심) · thin(얇은, 마른) · bath(목욕, 욕조) · arm(팔)
- 그림 있는 단원 단어 20개: three, fish, two, eight, sheep, cheese, chair, orange, shoe, ship, mouth, tooth, cookie, shop, shirt, shell, brush, dish, bath, arm
- 그림 없는 단원 단어 5개(그림 보기 · 그림 칸에 내지 않는다): short, tall, toy, lunch, thin

### 단원 4 — 시계와 양말 · 학습 요소 '-ck · -ng · -nk'

- 단원 단어 25개: black(검은, 검은색) · pink(분홍의, 분홍색) · long(긴) · blue(파란, 파란색) · color(색, 색깔) · thank(고마워하다) · duck(오리) · sock(양말) · truck(트럭) · bird(새) · ring(반지, 울리다) · neck(목) · rock(바위, 돌) · jacket(재킷, 웃옷) · book(책) · chicken(닭, 닭고기) · thick(두꺼운) · clock(시계) · snack(간식) · eye(눈) · king(왕) · song(노래) · swing(그네, 흔들다) · bank(은행) · tree(나무)
- 그림 있는 단원 단어 19개: black, pink, blue, duck, sock, truck, bird, ring, neck, rock, jacket, book, chicken, clock, eye, king, swing, bank, tree
- 그림 없는 단원 단어 6개(그림 보기 · 그림 칸에 내지 않는다): long, color, thank, thick, snack, song

### 단원 5 — 케이크와 자전거 · 학습 요소 '묵음 e(cake · bike)'

- 단원 단어 25개: five(5, 다섯) · nine(9, 아홉) · white(하얀, 흰색) · like(좋아하다) · banana(바나나) · cake(케이크) · grape(포도) · bike(자전거) · kite(연) · ball(공) · nose(코) · face(얼굴) · lake(호수) · cute(귀여운) · ear(귀) · nice(좋은, 멋진) · rose(장미) · home(집) · game(놀이, 게임) · flower(꽃) · plane(비행기) · snake(뱀) · rice(밥, 쌀) · name(이름) · smile(미소, 웃다)
- 그림 있는 단원 단어 19개: five, nine, white, banana, cake, grape, bike, kite, ball, nose, face, lake, ear, rose, flower, plane, snake, rice, smile
- 그림 없는 단원 단어 6개(그림 보기 · 그림 칸에 내지 않는다): like, cute, nice, home, game, name

## 7. 단계 어휘 범위(vocab 1단계)

문항의 영어(보기 · 낱말 · 허용 정답)는 아래 내용어의 원형만 쓴다. 활용형(`cats`)과 기능어는 문항 낱말로 쓰지 않는다. 14절 스스로 확인 명령이 범위 밖 낱말을 센다.

흔한 낱말도 2단계 이상이면 쓰지 않는다. 2단계: have · can · very · here · play · run · jump · want · mom · dad · friend · good · happy · fun · with · for · at · of. 3단계: see · look · eat · go · where · who · there · we · they · squirrel. 4단계: too · day · so. 5단계: but. 6단계: some · brown. purple 은 vocab 에 없다.

**기능어 32개**(문항 낱말로 쓰지 않고 예문에만 쓴다): `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 [am, is, are, was, were, been, being] · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) [does, did, done, doing] · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의

- **쓰기 단원 0 (알파벳 친구들)**: `ant` 개미 [ants] · `bear` 곰 [bears] · `cow` 소 [cows] · `door` 문 [doors] · `elephant` 코끼리 [elephants] · `fork` 포크 [forks] · `guitar` 기타 [guitars] · `horse` 말 [horses] · `insect` 곤충 [insects] · `juice` 주스 · `key` 열쇠 [keys] · `lion` 사자 [lions] · `monkey` 원숭이 [monkeys] · `nurse` 간호사 [nurses] · `octopus` 문어 [octopuses] · `piano` 피아노 [pianos] · `queen` 여왕 [queens] · `robot` 로봇 [robots] · `star` 별 [stars] · `tiger` 호랑이 [tigers] · `umbrella` 우산 [umbrellas] · `violin` 바이올린 [violins] · `window` 창문 [windows] · `box` 상자 [boxes] · `yo-yo` 요요 [yo-yos] · `zebra` 얼룩말 [zebras]
- **쓰기 단원 1 (모자와 가방)**: `seven` 7, 일곱 · `ten` 10, 열 · `red` 빨간, 빨간색 [reds] · `yellow` 노란, 노란색 [yellows] · `cat` 고양이 [cats] · `rabbit` 토끼 [rabbits] · `apple` 사과 [apples] · `egg` 달걀 [eggs] · `candy` 사탕 [candies] · `bag` 가방 [bags] · `hat` 모자 [hats] · `cap` (챙 달린) 모자 [caps] · `pen` 펜 [pens] · `pencil` 연필 [pencils] · `bed` 침대 [beds] · `desk` 책상 [desks] · `map` 지도 [maps] · `hand` 손 [hands] · `leg` 다리 [legs] · `sand` 모래 · `jam` 잼 [jams] · `fan` 선풍기, 부채 [fans] · `lamp` 램프, 전등 [lamps] · `tent` 텐트 [tents] · `bell` 종 [bells]
- **쓰기 단원 2 (돼지와 개구리)**: `six` 6, 여섯 · `big` 큰 [bigger, biggest] · `little` 작은, 어린 · `one` 1, 하나 · `four` 4, 넷 · `dog` 개 [dogs] · `pig` 돼지 [pigs] · `frog` 개구리 [frogs] · `green` 초록의, 초록색 [greens] · `small` 작은 [smaller, smallest] · `milk` 우유 · `cup` 컵 [cups] · `doll` 인형 [dolls] · `bus` 버스 [buses] · `pizza` 피자 [pizzas] · `drum` 북, 드럼 [drums] · `sun` 해, 태양 [suns] · `top` 팽이, 꼭대기 [tops] · `hot` 뜨거운, 더운 [hotter, hottest] · `car` 자동차 [cars] · `pot` 냄비, 화분 [pots] · `fox` 여우 [foxes] · `puppy` 강아지 [puppies] · `wing` 날개 [wings] · `old` ~살의, 늙은 [older, oldest]
- **쓰기 단원 3 (물고기와 배)**: `three` 3, 셋 · `short` 짧은, 키가 작은 [shorter, shortest] · `fish` 물고기 · `two` 2, 둘 · `eight` 8, 여덟 · `sheep` 양 · `cheese` 치즈 [cheeses] · `chair` 의자 [chairs] · `orange` 오렌지, 주황색 [oranges] · `tall` 키가 큰, 높은 [taller, tallest] · `shoe` 신발 [shoes] · `ship` 배 [ships] · `mouth` 입 [mouths] · `tooth` 이, 이빨 [teeth] · `cookie` 쿠키, 과자 [cookies] · `shop` 가게, 쇼핑하다 [shops, shopped, shopping] · `shirt` 셔츠 [shirts] · `shell` 조개껍데기 [shells] · `brush` 솔, 붓 [brushes, brushed, brushing] · `toy` 장난감 [toys] · `dish` 접시, 요리 [dishes] · `lunch` 점심 · `thin` 얇은, 마른 [thinner, thinnest] · `bath` 목욕, 욕조 [baths] · `arm` 팔 [arms]
- **쓰기 단원 4 (시계와 양말)**: `black` 검은, 검은색 [blacks] · `pink` 분홍의, 분홍색 [pinks] · `long` 긴 [longer, longest] · `blue` 파란, 파란색 [blues] · `color` 색, 색깔 [colors] · `thank` 고마워하다 [thanks, thanked, thanking] · `duck` 오리 [ducks] · `sock` 양말 [socks] · `truck` 트럭 [trucks] · `bird` 새 [birds] · `ring` 반지, 울리다 [rings, rang, rung, ringing] · `neck` 목 [necks] · `rock` 바위, 돌 [rocks] · `jacket` 재킷, 웃옷 [jackets] · `book` 책 [books] · `chicken` 닭, 닭고기 [chickens] · `thick` 두꺼운 [thicker, thickest] · `clock` 시계 [clocks] · `snack` 간식 [snacks] · `eye` 눈 [eyes] · `king` 왕 [kings] · `song` 노래 [songs] · `swing` 그네, 흔들다 [swings, swung, swinging] · `bank` 은행 [banks] · `tree` 나무 [trees]
- **쓰기 단원 5 (케이크와 자전거)**: `five` 5, 다섯 · `nine` 9, 아홉 · `white` 하얀, 흰색 [whites] · `like` 좋아하다 [likes, liked, liking] · `banana` 바나나 [bananas] · `cake` 케이크 [cakes] · `grape` 포도 [grapes] · `bike` 자전거 [bikes] · `kite` 연 [kites] · `ball` 공 [balls] · `nose` 코 [noses] · `face` 얼굴 [faces] · `lake` 호수 [lakes] · `cute` 귀여운 [cuter, cutest] · `ear` 귀 [ears] · `nice` 좋은, 멋진 [nicer, nicest] · `rose` 장미 [roses] · `home` 집 [homes] · `game` 놀이, 게임 [games] · `flower` 꽃 [flowers] · `plane` 비행기 [planes] · `snake` 뱀 [snakes] · `rice` 밥, 쌀 · `name` 이름 [names] · `smile` 미소, 웃다 [smiles, smiled, smiling]

내용어는 모두 151개이고 모두 쓰기 단원 0~5 의 단원 단어다. 다른 단원의 낱말(단원 0 의 26 낱말 포함)은 이 단원에서는 단원 단어가 아닌 범위 안 낱말이다. 오답 보기 · 예문에 쓸 수 있고 `unitWords` 에는 적지 않는다. 이 목록과 기능어 밖의 낱말은 1단계 어휘 범위 밖이다.

## 8. 학습 요소 범위와 문장 꼴(정본 3.6 쓰기 열)

쓰기 1단계 단원 요소는 철자 패턴이다: 단원 1 '단모음 a · e' / 단원 2 '단모음 i · o · u' / 단원 3 'sh · ch · th' / 단원 4 '-ck · -ng · -nk' / 단원 5 '묵음 e(cake · bike)'. 평가의 범위는 1단계 전부다(C54 ㅅ). 연결 단원 u 의 채우기는 단원 u 의 패턴 자리를 비운다(`writing-1.md` 8절과 같은 표, 단원 0 행은 평가에 쓰지 않는다).

| 단원 | 채우기 빈칸 | 고르기 오답 보기 | 채우기 예(덤 글자로 다른 낱말이 안 됨을 확인함) | 안 되는 예(괄호가 덤 글자로 생기는 낱말) |
|---|---|---|---|---|
| 1 | 모음 a · e 한 글자 | 글자 꼴이 비슷한 낱말(cat → cap · car · cake) | `c_t` cat ← a · u, `t_nt` tent ← e · u, `l_mp` lamp ← a · o | `p_n` pen ← e · a(pan), `b_d` bed ← e · a(bad), `f_n` fan ← u(fun) · i(fin) · e(fen) · o(Fon, 말 이름) |
| 2 | 모음 i · o · u 한 글자 | 글자 꼴이 비슷한 낱말 | `m_lk` milk ← i · a, `d_ll` doll ← o · a | `c_p` cup ← u · a(cap), `h_t` hot ← o · a · i(hat · hit), `p_g` pig ← i · e(peg) |
| 3 | 두 글자 sh · ch · th(빈칸 2) | 글자 꼴이 비슷한 낱말 | `__air` chair ← c · h · s, `bru__` brush ← s · h · t | `__eep` sheep ← s · h · t(steep), `__ip` ship ← s · h · c(chip) |
| 4 | 끝 두 글자 ck · ng · nk(빈칸 2) | 글자 꼴이 비슷한 낱말 | `ne__` neck ← c · k · t, `du__` duck ← c · k · g | `tru__` truck ← c · k · n(trunk), `ba__` bank ← n · k · c(back) |
| 5 | 가운데 모음과 끝 e(빈칸 2, `c_k_`) | 글자 꼴이 비슷한 낱말 | `n_s_` nose ← o · e · u, `f_v_` five ← i · e · u | `b_k_` bike ← i · e · a(bake), `l_k_` lake ← a · e · i(like) |

- 덤 글자를 고를 때는 그 글자를 빈칸에 넣은 꼴을 하나씩 읽어 본다. 영어 낱말이 되면 그 글자를 빼고 다른 글자를 둔다(모음 자리라도 자음 글자를 덤으로 둘 수 있다). 아이에게 맞지 않는 낱말이 되는 글자는 더욱 두지 않는다. 14절 명령은 덤 글자 꼴이 vocab 낱말(모든 단계)인지만 본다 — 사전 낱말인지는 스스로 본다.
- 패턴 밖 낱말(단원 2 one · four · green · small · pizza · car · old, 단원 3 two · eight · orange · tall · cookie · toy · arm, 단원 4 blue · color · bird · book · eye · tree, 단원 5 banana · ball · ear · flower)은 고르기 · 베끼기의 답으로 쓴다. 채우기 답은 패턴 낱말만 쓴다(평가는 패턴을 잰다).
- 채우기 빈칸은 연결 단원의 패턴 자리에만 둔다. 다른 단원 패턴 자리를 함께 비우지 않는다.
- 문장 꼴: 평가 문항에는 영어 문장이 없다. 해설의 영어는 낱말 · 글자 · 패턴(`sh`)만 쓴다.

## 9. 그림 규칙

- 고르기의 `picture` 는 아래 표의 낱말 id 로만 낸다. 그림 키가 없는 낱말을 내면 검증기 `image` 오류다(C126 — 그림 있는 낱말만 그림 문항). 그림 없는 단원 단어는 베끼기 · 채우기의 답이나 오답 보기 글로 쓴다.
- 채우기는 `word` 의 그림을 보인다(그림 없는 낱말은 한국어 뜻 글). 그래서 `word` 는 vocab 낱말 원형으로 쓴다.
- 헷갈리는 짝은 같은 고르기 문항의 보기에 함께 두지 않는다(그림은 하나인데 두 보기가 다 맞아 보인다, 풀이 검사도 뜻 글만 본다): ant · insect, hat · cap, cup · milk, face · smile, face · neck, leg · knee, foot · toe, hand · finger, arm · strong, face · head, bird · fly, cup · water, jacket · coat, pants · jeans, girl · doll, head · hair, tired · sleepy, student · boy, student · girl, kick · soccer. (제안) rose · flower, bird · chicken · duck, happy · smile, sheep · goat 도 함께 두지 않는다.
- 수 낱말(one~ten)의 그림은 숫자 키캡이고, 색 낱말의 그림은 색 동그라미다(orange 는 주황 동그라미, 과일 아님). grape 그림은 송이다(C126 (2) — 쓰기 평가는 낱말 원형 `grape` 를 답으로 쓴다).

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

## 10. 주제 · 인물

- 평가에는 주제 변형이 없다(벌 3개가 그 자리다).
- 쓰기 1단계 평가에는 영어 문장이 없어 인물이 들어갈 자리가 없다. 이름(C124 표의 Momo · Tori · Ben · Meg · Dan · Tess · Max · Ted · Gus 포함)을 문항 낱말 · 보기 · 해설에 쓰지 않는다(벌마다 n = 0). 회화 선생님 이름(Mina · Leo · Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi)과 `{NAME}` · 실제 이름도 쓰지 않는다.

## 11. 문항 종류별 내용 — 답 낱말 · 겹침 피하기

| 규칙 | 내용 |
|---|---|
| 답 낱말 | 연결 단원의 쓰기 단원 단어. 세 벌을 통틀어 한 낱말은 한 문항에서만 답이 된다(제안). 단원마다 12개(25개 가운데) |
| 갈래별 답 | 고르기 = 그림 있는 낱말(패턴 밖 낱말 먼저), 베끼기 = 6글자 이하(그림 없는 낱말 · 패턴 밖 낱말 먼저), 채우기 = 그 단원 패턴 낱말 |
| 벌 사이 | 같은 문항이 없다(검증기 `level-test-forms-overlap`). 같은 답 낱말을 다른 벌에 쓰지 않으니 저절로 지켜진다 |
| 수업과 | 고르기 (그림, 보기 넷 묶음)이 1단계 쓰기 수업 고르기와 같지 않다(검증기). 수업 고르기는 정답과 첫 글자가 같은 오답(dog → desk · duck · door)을 많이 썼다. 평가는 같은 첫 글자 꼴 하나에 끝이 같은 꼴 · 가운데 모음만 다른 꼴을 섞어 다른 묶음을 만든다 |
| 연결 단원 | 문항의 `unit` 은 답 낱말이 든 쓰기 단원이다 |

## 12. 출력 규격(Zod `LevelTestFileSchema` writing · `WritingTestItemSchema` 와 1:1)

모르는 키는 거부된다. 파일 겉: `{ "area": "writing", "level": 1, "forms": [ { "form": <1~3>, "items": [ … 20개 ] } ] }`.

| 필드 | 꼴 | 설명 |
|---|---|---|
| `no` · `unit` · `revision` · `correction` | 정수 | 차례 표 · 호출 값 |
| `type` | `pick-word` · `copy-tiles` · `fill-letters` | 5절 차례 표 |
| `pick-word` | `{ "picture", "options", "answerNo", "accepted" }` | 5절 |
| `copy-tiles` | `{ "word", "tiles", "accepted" }` | 5절 |
| `fill-letters` | `{ "word", "pattern", "tiles", "accepted" }` | 5절 |
| `explanationKo` | 한국어 | 해설(모든 문항, 6.3 '문항마다 해설') |

갈래에 없는 칸(`meaningKo` · `audioText` · `cards`)과 `generation` · `title` 같은 수업 칸은 두지 않는다.

예시: 벌 1 의 문항 다섯. 꼴을 보이는 예이니 그대로 옮기지 않는다. 2026-10-23 에 검증기와 14절 명령으로 오류 0 · 문제 0 을 확인했다. 덤 글자 꼴은 사전 낱말이 아님을 읽어 봤다(fon · bruts · brust · neso · nuse).

```json
{
  "area": "writing",
  "level": 1,
  "forms": [
    {
      "form": 1,
      "items": [
        {"no": 1, "unit": 1, "revision": 2, "correction": 0, "type": "pick-word", "picture": "tent", "options": ["ten", "tent", "bell", "bed"], "answerNo": 2, "accepted": ["tent"], "explanationKo": "tent 는 텐트예요. t-e-n-t 로 써요."},
        {"no": 4, "unit": 2, "revision": 2, "correction": 0, "type": "copy-tiles", "word": "frog", "tiles": ["g", "r", "o", "f"], "accepted": ["frog"], "explanationKo": "frog 는 개구리예요. f-r-o-g 차례로 놓아요."},
        {"no": 6, "unit": 1, "revision": 2, "correction": 0, "type": "fill-letters", "word": "lamp", "pattern": "l_mp", "tiles": ["o", "a"], "accepted": ["lamp"], "explanationKo": "lamp 의 가운데 소리는 /애/ 예요. a 를 놓아요."},
        {"no": 8, "unit": 3, "revision": 2, "correction": 0, "type": "fill-letters", "word": "brush", "pattern": "bru__", "tiles": ["s", "t", "h"], "accepted": ["brush"], "explanationKo": "brush 는 끝이 sh 예요. s 와 h 를 차례로 놓아요."},
        {"no": 10, "unit": 5, "revision": 2, "correction": 0, "type": "fill-letters", "word": "nose", "pattern": "n_s_", "tiles": ["o", "e", "u"], "accepted": ["nose"], "explanationKo": "nose 는 o 와 끝의 e 로 써요. 끝의 e 는 소리가 나지 않아요."}
      ]
    }
  ]
}
```

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말(영어 45 · 한국어 19)과 정규식 13개.
- 개인 정보를 묻는 말 · 연락처 꼴 · 메타 문장(`meta-sentences.json`)은 쓰기 1단계 평가 글에 들어갈 자리가 없지만 해설에도 쓰지 않는다.
- 채우기 덤 글자로 아이에게 맞지 않는 낱말이 생기는 글자(8절).
- 설계 숫자 · 단원 번호 · '평가' 같은 말을 해설에 쓰지 않는다.
- 이름 · `{NAME}` · 회화 선생님 이름(10절).

## 14. 스스로 확인과 검증 명령

파일을 다 쓴 뒤 하나씩 확인한다.

1. 벌 3개 × 20문항, 번호 1~20, 5절 차례 표대로 유형 · 연결 단원(벌 셋이 같다). 벌마다 고르기 6 · 베끼기 4 · 채우기 10.
2. 답 낱말이 연결 단원의 쓰기 단원 단어이고 세 벌을 통틀어 겹치지 않는다. 고르기는 그림 낱말, 채우기는 패턴 낱말, 베끼기는 6글자 이하.
3. 모든 낱말 · 보기가 7절 내용어 원형 · 소문자다(범위 밖 0).
4. 고르기: 보기 4개 · `options[answerNo − 1]` = `accepted[0]`, 비슷한 꼴 오답 둘 이상, 헷갈리는 짝 없음, 한국어 뜻만으로 정답이 하나, 정답 자리가 고루.
5. 베끼기: 타일이 낱말 글자 전부를 섞은 한 글자 타일(덤 없음, 차례 그대로 아님).
6. 채우기: `pattern` 이 `word` 와 같은 길이이고 빈칸이 연결 단원의 패턴 자리, 타일은 한 글자, 덤 1~2장, 덤 글자 꼴이 모두 영어 낱말이 아니다.
7. 고르기 (그림, 보기 묶음)이 수업과 같지 않다.
8. 해설이 해요체 한두 문장이고 이름 · 금지 목록에 걸리는 말이 없다.

**스스로 확인 명령**(시드 검증 전에 돌린다. 이 명령의 결과로 고치는 것은 고침 회차에 넣지 않는다. 마지막 줄이 `문제 0` 이 될 때까지 고친다. 저장소 뿌리에서 돌린다):

```sh
pnpm -s exec tsx - <뿌리> writing 1 <<'EOF'
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

출력의 `[검사 이름] 벌 · 번호 · 내용` 줄이 고칠 곳이다. `[덤 글자로 생기는 낱말]` 은 vocab 낱말만 잡는다. `[수업 문항과 같은 질문 · 보기]` 는 검증기도 오류로 잡는다.

**검증 명령**(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas writing --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="level-tests/writing/1.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(이 파일의 칸 60 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수)를 그대로 적어 둔다. 칸은 문항 하나(`level-test:writing:1:<벌>:<번호>`)다.
- 오류가 있으면 그 문항만 고치고 다시 검증한다. 고침은 2회(`seed.max_retries`)까지다. 그래도 남으면 멈추고 보고한다.
- summary 의 `referenceErrors` 가 0 이 아니면 규격 파일 문제라 이 묶음의 일이 아니다. 고치지 않고 보고한다.
- `unchecked` · `empty` 는 이 단계의 일이 아니다.
- 검증기가 잡지 못해 스스로 지킬 것: 두 글자 · 대문자 타일, 덤 글자로 생기는 낱말(사전 낱말까지), 헷갈리는 짝, 답 낱말 겹침, 나란한 벌, 해설 말투.

## 15. 근거 한 줄

쓰기 1단계 평가는 다섯 단원의 철자 패턴 낱말을 알아보고(고르기) 보고 쓰고(베끼기) 빠진 글자를 채우는지(채우기) 본다([4영02-02] · [4영02-03], CEFR Pre-A1). 채우기가 절반(10문항)인 것은 단원 요소(철자 패턴)를 바로 재는 갈래이기 때문이다(C66 testMix).

## 16. 보고 꼴

마지막 답장(파일로 쓰지 않는다)에 이 차례로 쓴다.

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값> · briefHash: <앞 8자> · agentHash: <앞 8자> · createdOn: <호출 값>
파일: <뿌리>/level-tests/writing/1.json · 벌 3 · 문항 <n> · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
스스로 확인: 처음 '문제 <n>'(규칙별 <…>) · 마지막 '문제 <n>'
첫 검증: 칸 <n> · 오류 칸 <n> · 규칙별 <rule n, …> · 경고 <n>
고침: <회차마다 고친 칸 · 남은 오류>
벌마다: 고르기 · 베끼기 · 채우기 <n · n · n> · 고르기 정답 자리 1~4 <n · n · n · n>
답 낱말: 단원마다 <n>(세 벌 합, 겹침 <n>) · 덤 글자를 사전으로 읽어 본 채우기 <n>
스스로 확인 목록: 14절 1~8 각각 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 1 | 평가 파일에 생성 정보를 쓰지 않고 보고에 적음 | 평가 문항 규격에 `generation` 칸이 없다 |
| 2 · 14 | 스스로 확인 명령으로 고친 것은 고침 회차에 넣지 않음 | 첫 검증 결과가 통과율의 기준이다 |
| 5 | 세 벌 같은 차례 표, 세션마다 다섯 단원 두 문항씩, 고르기 → 베끼기 → 채우기 | 나란한 벌로 재응시를 견줄 수 있고, 세션 안에서 수업과 같은 차례(알아보기 → 쓰기)로 간다 |
| 5 | 단원 5 에 고르기 둘(베끼기 없음) | testMix 베끼기 4 를 단원 다섯에 나누면 한 단원이 빠진다. 묵음 e 낱말(five · white · grape …)은 6글자 안이라 베끼기도 되지만, 그림 있는 낱말이 많아 고르기 둘이 자리를 채운다 |
| 5 | 보기 4개 · 베끼기 덤 없음 · 6글자까지 · 채우기 덤 1~2장 | `writing-1.md` 와 같다(수업과 평가의 꼴을 같게) |
| 5 | 덤 글자 고르는 차례(흔한 끝을 만드는 글자보다 낱말이 거의 없는 글자) | 장부 '풀이 검사 헛경보' — 사전 낱말이 아니어도 흔한 꼴이면 풀이 AI 가 답을 못 정했다 |
| 8 | 채우기 답은 패턴 낱말만 | 평가 채우기는 연결 단원 패턴을 재는 문항이다(수업은 패턴 밖 낱말도 채우기로 냈다) |
| 8 | 예 몇 개를 평가용으로 고쳐 실음(cat ← a · u, lamp ← a · o, five ← i · e · u, 안 되는 예 fan · pig 더함) | 수업 브리프 예의 `f_v_` ← a 는 fave(은어)가 되고, fan 은 a 밖 모음이 모두 낱말 · 이름(fun · fin · fen · Fon)이며, pig ← e 는 peg 가 된다 |
| 11 | 한 답 낱말은 세 벌 통틀어 한 번 | 같은 낱말을 세 벌이 되풀이하면 재응시가 같은 시험이 된다 |
| 13 | 덤 글자로 생기는 맞지 않는 낱말 금지 | 금지어 목록 밖의 내용 기준이 정본에 없다 |
