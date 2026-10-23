# 생성 브리프 — 쓰기 배치 평가 가 벌(`placement-writing`)

이 파일은 쓰기 배치 평가 가 벌 묶음의 프롬프트 판이다(정본 6.3 — 배치 평가 묶음은 영역마다 하나, 순서 (3)). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 1~12단계 × 3문항 = 36문항을 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 숫자와 규칙은 저장소 파일에서 옮겼다. 정본에 없는 값은 '(제안)'으로 적었고 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 이 묶음을 처음부터 다시 만든다.

**배치 평가는 아이가 쓰기를 처음 열 때 시작 단계를 정하는 문항이다.** 모두 앱이 정답과 견주는 문항이다(정본 3.2 — 쓰기 높은 단계는 빈칸 채우기 · 문장 고치기). 1~3단계는 고르기 · 베끼기 · 채우기 · 받아쓰기 · 조립이고, **아이가 문장을 지어 내는 문항은 어느 단계에도 없다**(작문은 AI 채점이라 배치에 두지 않는다). 단계 L 문항은 단계 L 의 쓰기 학습 요소 · 낱말을 담고, 단계 L 위의 것은 쓰지 않는다.

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 영역 · 단계 | `writing` · 1~12 · 배치 평가 가 벌(`form` 1, C54 (3)) |
| 틀 | `seed/prompts/_template.md`(절 번호 그대로, 배치에 없는 칸은 그 절에 적음) |
| 만든 날 · 만든 이 | 2026-10-23 첫 판 · 학습 설계자(cur-p08 평가) |
| 옮긴 곳 | `seed/level-specs.json`(writing 1~12) · `settings.json`(placement.* · writing.*) · `unit-specs.json`(쓰기 단원 주제 · 학습 요소) · `vocab.json`(1~12단계) · `images.json` · `lists/forms.json`(쓰기 차례) · `lists/forbidden.json` · `src/core/seed/schema/assessment.ts` · `schema/lesson.ts`(쓰기 문항 갈래) · `check-assessment.ts` · `check-lesson.ts` checkWritingItem · `solve-check.ts` · `src/core/answer/check.ts`(앱 판정) · `src/core/answer/display.ts`(화면) · `writing-1.md` 5 · 8 · 9절 · 정본 3.1 · 3.2 배치 · 3.3 쓰기 · 3.4 · 3.6 쓰기 열 · 6.3 배치 평가 행 · 6.4 · 13절 C54 · C66 · C71 · C73 · C84 · C124 · C126 · 장부 'P8 쓰기 1 풀이 검사 헛경보' |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 뿌리 폴더 | `seed` 또는 표본 폴더 | 쓸 파일 `<뿌리>/placement/writing.json` |
| briefHash · agentHash · effort · createdOn | 64자 · 64자 · `high` · `2026-10-23` | 보고에만 적는다 |
| revision · correction | `2` · `0` | 모든 문항 |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

- 쓰는 파일은 **수업 파일이 아니라 이 배치 파일 하나**다. 생성 정의의 '브리프가 정한 파일 하나'가 이 파일이다.
- 배치 문항 규격에는 `generation` · 연결 단원 · 해설 칸이 없다(넣으면 거부된다). 모델 ID · effort · 해시 · 날짜는 보고(16절)에 적는다.

## 2. 할 일 한눈에

1. 5절 표에서 단계마다 문항 갈래 셋과 재는 학습 요소를 확인한다. 4단계부터는 그 단계 쓰기 학습 요소 다섯 가운데 셋을 골라 문항마다 하나씩 잰다(6절).
2. 1단계부터 12단계까지 차례로 단계마다 문항 셋을 만든다.
3. 파일 하나 `{ "area": "writing", "form": 1, "levels": [ { "level": 1, "items": [3개], "spares": [] }, … 12단계까지 ] }` 에 넣는다. 쓰기에는 예비 문항이 없다.
4. 14절 스스로 확인 명령 → 고침(회차로 세지 않는다) → 검증 명령(첫 검증) → 오류 문항만 고침(2회까지) → 16절 보고.

## 3. 배치 평가 규칙(정본 3.2 · C71 — 앱이 하는 일)

| 차례 | 규칙 |
|---|---|
| 시작 | 3단계(placement.start_level) 문항 3개(placement.items_per_level)를 낸다 |
| 오르기 | 3개를 다 맞히면 두 단계, 2개를 맞히면 한 단계 올린다. 두 단계를 뛰어 올라간 뒤 못 넘으면 건너뛴 단계를 본다 |
| 내리기 | 1개 이하를 맞히면 그 단계를 '못 넘음'으로 두고, 아직 넘은 단계가 없으면 한 단계 내린다. **처음 두 문항을 모두 틀리거나 '몰라요'로 넘기면 셋째 문항 없이** 못 넘음이다 |
| 몰라요 · 끝 · 판정 | 몰라요는 틀림. 넘은 단계 바로 위에서 못 넘거나 1단계에서 못 넘거나 15문항(placement.items_per_area)이면 끝. 넘은 가장 높은 단계보다 한 단계 낮게 시작한다(최소 1). 1단계도 못 넘으면 알파벳 · 소리 단원(3.1) |

문항이 지킬 것:

- 문항은 단계 차례 1 · 2 · 3 으로 나온다. 1 · 2번이 그 단계를 가르는 핵심 문항이다. 그래서 1 · 2번에 서로 다른 갈래를 둔다(5절).
- 앱 판정(`src/core/answer/check.ts`, C73): 타일 · 카드는 놓은 차례대로 이은 글이 허용 정답과 같아야 맞다. 친 답(받아쓰기 · 빈칸 채우기 · 문장 고치기)은 앞뒤 공백 · 겹 빈칸 · 굽은 따옴표만 맞추고, **빈칸 없는 낱말 하나 답은 대소문자를 가리지 않고, 빈칸이 있는 답(문장)은 대소문자 · 문장 부호까지 같아야 맞다.** 그래서 허용 정답에 맞는 꼴을 모두 넣는다(11절).
- 목표 시간은 영역마다 10분(placement.target_minutes, 잠정)이다. 문장은 그 단계 상한 안에서 짧게 쓴다.

## 4. 설정(`settings` · 구조 수)

| 값 | 뜻 |
|---|---|
| `placement.items_per_level` 3 | 단계마다 문항 수(번호 1~3) |
| `placement.start_level` 3 · `placement.items_per_area` 15 · `placement.target_minutes` 10 | 3절 |
| `writing.rule_check_until_level` 3 · `writing.light_check_until_level` 5 | 1~3단계 수업 모양 items · 4~5단계 guided · 6단계부터 composition(배치는 모양과 상관없이 앱 채점 문항만) |
| 벌 `form` | 1(가 벌) |
| `seed.max_retries` 2 | 검증 뒤 고침 회차 상한 |

## 5. 단계마다 문항 차례 표

| 단계 | CEFR | 번호 1 · 2 · 3 갈래 | 문항 글 | 문장 길이 상한 | 입력(앱 화면) |
|---|---|---|---|---|---|
| 1 | Pre-A1 | pick-word · fill-letters · copy-tiles | 1단계 낱말 하나 | 5 | 타일 · 보기 누르기 |
| 2 | Pre-A1 | dictation · build-tiles · assemble-phrase | 2단계 낱말 하나 · 두세 낱말 어구 | 6 | 앱 안 자판 · 타일 · 카드 |
| 3 | Pre-A1 | assemble-sentence · assemble-sentence · assemble-sentence | 3~5낱말 문장 + 문장 부호 카드 | 7 | 카드(첫 카드 대문자 단추) |
| 4~12 | A1~B1 | fill-blank · fix-sentence · fill-blank | 문장 하나(빈칸 한 낱말 · 고칠 곳 하나) | 4단계 8 · 5단계 9 · 6단계 10 · 7단계 12 · 8단계 13 · 9단계 15 · 10단계 18 · 11단계 20 · 12단계 22 | 기기 자판으로 친다 |

- 1~3단계 갈래는 그 단계 쓰기 수업 과제(3.3 쓰기 표)와 같다. 1단계 1 · 2번(고르기 · 채우기)은 글자와 소리를 아는지 바로 보는 갈래라 앞에 두고, 베끼기는 3번이다(두 문항 모두 틀린 아이는 알파벳 · 소리 단원으로 간다).
- 4단계부터는 3.2 '쓰기 높은 단계는 빈칸 채우기 · 문장 고치기' 그대로다. testMix 의 빈칸 · 고치기 비율(4단계 12 : 8 · 6단계부터 10 : 9)에 맞춰 빈칸 2 · 고치기 1 이다.
- 문항 글의 낱말은 단계 1~L 범위이고 (제안) 문항마다 단계 L 내용어를 하나 이상 담는다. 4단계부터는 문항마다 그 단계 쓰기 학습 요소 하나를 잰다(빈칸 · 고칠 곳이 그 요소 자리).

## 6. 단계마다 쓰기 단원 주제 · 학습 요소(`unit-specs` writing)

쓰기 학습 요소는 읽기 · 말하기와 차례가 다르다(정본 3.6 쓰기 열). 4단계부터 문항이 잴 요소는 아래 표의 그 단계 요소에서 고른다. 글 꼴 요소(일기 형식 · 편지 형식 · 과정 설명 · 서론-본문-결론 · 요약 · 결론 쓰기 · 문단 연결의 글 짜임)는 문장 하나로 잴 수 없어 고르지 않는다. 문항 문장의 주제는 그 단계 단원 주제에서 고른다(제안).

| 단계 | 단원 1 | 단원 2 | 단원 3 | 단원 4 | 단원 5 |
|---|---|---|---|---|---|
| 1 | 모자와 가방 — 단모음 a · e | 돼지와 개구리 — 단모음 i · o · u | 물고기와 배 — sh · ch · th | 시계와 양말 — -ck · -ng · -nk | 케이크와 자전거 — 묵음 e(cake · bike) |
| 2 | 빨간 사과 큰 공 — 형용사 + 명사 | 강아지 세 마리 — 수 + 복수 명사 | 공차기 놀이 — 동사 + 목적어(play soccer) | 상자 안 고양이 — 전치사 + 명사(in the box) | 빵과 우유 — 명사 and 명사 |
| 3 | 방과 교실 — 주어 + be + 형용사 | 내가 하는 일 — 주어 + 동사 + 목적어 | 문장 부호 놀이 — 대문자 · 마침표 · 물음표 | 우리 동네에 있는 것 — There is ~ | 나는 할 수 있어 — can 문장 |
| 4 | 나를 소개해요 — be 동사 문장 | 매일 하는 일 — 일반동사 현재 | 갖고 싶은 것 — have · like · want 문장 | 하지 않는 일 — 부정문(don't · isn't) | 할 수 있는 일 — can · can't |
| 5 | 우리 동네 사람들 — 명사 복수형(-s · -es · 불규칙) | 교실에 있는 것들 — There are | 가족의 하루 — 3인칭 단수 -s | 운동장 풍경 — 현재진행 | 좋은 것과 싫은 것 — and · but 으로 두 문장 잇기 |
| 6 | 친구의 취미 — does · doesn't | 우리 동네 소개 — 관사 a · an · the | 나의 일주일 — 빈도부사 | 내 가족 소개 — 소유격 · 목적격 대명사 | 좋아하는 까닭 — because 로 이유 붙이기 |
| 7 | 어제의 기분 — was · were | 집안일 도운 날 — 규칙 과거 -ed | 박물관 견학 — 불규칙 과거 | 숙제하는 순서 — 순서 말(first · then · finally) | 나의 일기 — 일기 형식 |
| 8 | 탐정 놀이 계획 — will · be going to | 나와 동생 비교 — 비교급 | 가장 좋은 선택 — 최상급 | 할머니께 편지 — 편지 형식(인사 · 끝맺음) | 행복했던 때 — when 절 |
| 9 | 이루고 싶은 목표 — to 부정사 | 즐기는 운동 — 동명사 | 교실 규칙 만들기 — should · must | 학교 끝난 뒤 — so · after · before 절 | 샌드위치 만들기 — 과정 설명(순서) |
| 10 | 방학 숙제 필요할까 — 의견과 이유(I think ~ because ~) | 본받고 싶은 사람 — 관계대명사 who · which | 규칙과 벌 — however · also | 환경을 지키는 제안 — 서론-본문-결론 | 꾸준히 해 온 운동 — 현재완료 |
| 11 | 종이책과 전자책 — 비교 · 대조(both · while · on the other hand) | 아끼는 물건 — 관계대명사 that | 우리 학교의 역사 — 수동태 | 새로운 일에 도전하면 — if 조건문 | 건강해지는 방법 — for example 로 예시 들기 |
| 12 | 대기 오염과 건강 — 원인 · 결과(because of · as a result) | 내가 교장이라면 — 가정법 과거 | 어려웠지만 해낸 일 — although | 책 읽고 요약 — 요약 · 결론 쓰기 | 나의 꿈 — 문단 연결 |

## 7. 단계 어휘 범위(vocab 1~12단계)

단계 L 문항(보기 · 낱말 · 문장 · 허용 정답)의 낱말은 단계 1~L 의 낱말(활용형 포함)과 10절 인물 이름만 쓴다. 1 · 2단계 낱말 문항의 답은 그 단계 내용어의 원형이다. 범위 밖 낱말을 0 으로 둔다(14절 명령이 센다). 활용형은 vocab 에 적힌 것만 범위 안이다.

- **1단계 기능어 32개**: `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의
- **1단계 내용어 151개**: ant, apple, arm, bag, ball, banana, bank, bath, bear, bed, bell, big, bike, bird, black, blue, book, box, brush, bus, cake, candy, cap, car, cat, chair, cheese, chicken, clock, color, cookie, cow, cup, cute, desk, dish, dog, doll, door, drum, duck, ear, egg, eight, elephant, eye, face, fan, fish, five, flower, fork, four, fox, frog, game, grape, green, guitar, hand, hat, home, horse, hot, insect, jacket, jam, juice, key, king, kite, lake, lamp, leg, like, lion, little, long, lunch, map, milk, monkey, mouth, name, neck, nice, nine, nose, nurse, octopus, old, one, orange, pen, pencil, piano, pig, pink, pizza, plane, pot, puppy, queen, rabbit, red, rice, ring, robot, rock, rose, sand, seven, sheep, shell, ship, shirt, shoe, shop, short, six, small, smile, snack, snake, sock, song, star, sun, swing, tall, ten, tent, thank, thick, thin, three, tiger, tooth, top, toy, tree, truck, two, umbrella, violin, white, window, wing, yellow, yo-yo, zebra
- **2단계 기능어 12개**: `all` 모든, 모두 · `at` ~에(서), ~을(보다) · `can` ~할 수 있다 · `down` 아래로 · `for` ~을 위해, ~을 위한 · `from` ~에서, ~로부터 · `he` 그는 · `of` ~의 · `or` 또는 · `out` 밖으로, 밖에 · `she` 그녀는 · `with` ~와 함께, ~로
- **2단계 내용어 125개**: angry, animal, aunt, baby, bad, badminton, baseball, basketball, beautiful, boy, brother, busy, catch, chocolate, climb, coat, cold, computer, cook, cool, corn, cousin, dad, dance, doctor, dolphin, draw, dress, family, farmer, fast, father, fine, finger, fly, food, foot, friend, fruit, fun, funny, gift, giraffe, girl, glad, glasses, goat, good, grandfather, grandmother, great, hair, hamburger, happy, have, head, help, here, house, hungry, ice cream, jeans, jump, kick, kind, knee, know, man, mom, mother, music, need, new, now, pants, penguin, pet, phone, play, police, potato, pretty, read, ready, really, ride, room, run, sad, sandwich, scarf, shoulder, sick, sing, sister, skate, ski, skirt, sleepy, slow, smart, soccer, sorry, strawberry, strong, student, sweater, swim, table, teacher, tennis, thirsty, throw, tired, toe, turtle, uncle, very, walk, want, water, whale, woman, write, young
- **3단계 기능어 14개**: `behind` ~ 뒤에 · `between` ~ 사이에 · `in front of` ~ 앞에 · `near` ~ 가까이에 · `next to` ~ 옆에 · `off` 떨어져, 벗어 · `there` 거기에, (There is) ~이 있다 · `these` 이것들, 이 · `they` 그들은, 그것들은 · `those` 저것들, 저 · `under` ~ 아래에 · `we` 우리는 · `where` 어디에 · `who` 누구
- **3단계 내용어 125개**: age, air, airplane, answer, ask, back, balloon, basket, bathroom, beach, bedroom, birthday, block, bottle, bottom, bridge, bright, bring, card, carry, child, city, classroom, clean, close, cloud, come, corner, crayon, cut, dark, drink, drop, eat, end, eraser, far, farm, find, fire, fix, floor, forest, front, garden, get, give, glue, go, grass, hard, high, hold, hospital, large, learn, left, let, library, listen, live, living room, look, low, make, market, meet, middle, mountain, move, notebook, number, open, paint, paper, park, pick, picture, playground, pull, push, put, puzzle, question, quick, rain, restaurant, river, road, round, ruler, safe, say, school, scissors, sea, see, side, sit, sky, sleep, snow, soft, soup, squirrel, stand, stop, store, street, study, subway, take, talk, taxi, textbook, town, train, turn, wait, wall, wash, watch, way, wind, zoo
- **4단계 기능어 25개**: `about` ~에 대해 · `above` ~ 위에 · `after` ~ 뒤에 · `before` ~ 전에 · `below` ~ 아래에 · `by` ~ 옆에, ~로 · `every` 모든, ~마다 · `everybody` 모두 · `everyone` 모두 · `her` 그녀의, 그녀를 · `hers` 그녀의 것 · `his` 그의 · `inside` ~ 안에, 안에서 · `its` 그것의 · `mine` 내 것 · `Mr.` ~ 씨(남자 어른) · `Mrs.` ~ 부인, ~ 씨 · `our` 우리의 · `ours` 우리의 것 · `outside` 밖에, ~ 밖에 · `over` ~ 위로, 넘어 · `so` 아주, 그렇게 · `their` 그들의 · `theirs` 그들의 것 · `yours` 네 것
- **4단계 내용어 150개**: adult, afraid, afternoon, again, album, almost, alone, already, also, apartment, arrive, art, artist, autumn, away, body, bread, breakfast, build, building, butter, call, camera, camp, change, class, cloudy, club, comic, dancer, day, difficult, dinner, dream, driver, early, easy, English, enough, evening, fall, favorite, feel, finish, forget, free, Friday, grow, hear, heart, hobby, homework, hour, ice, interesting, internet, just, keep, kid, kitchen, Korean, late, leaf, letter, line, lose, lot, love, mail, math, meat, minute, Monday, morning, movie, news, newspaper, next, night, o'clock, only, page, parent, party, person, photo, pilot, point, present, race, rainy, remember, return, right, same, Saturday, science, scientist, send, show, singer, skin, snowy, soon, speak, special, sport, spring, start, story, summer, Sunday, sunny, sure, tail, tape, teach, team, tell, thing, think, Thursday, time, today, together, tomorrow, too, touch, true, try, Tuesday, use, vegetable, video, wake, warm, wear, weather, Wednesday, week, weekend, well, win, windy, winter, word, work, worry, writer, wrong
- **5단계 기능어 20개**: `always` 항상 · `another` 또 하나의, 다른 · `around` ~ 둘레에, ~ 주위를 · `beside` ~ 옆에 · `both` 둘 다 · `but` 그러나, 하지만 · `everything` 모든 것 · `him` 그를, 그에게 · `into` ~ 안으로 · `much` 많은, 많이 · `never` 절대 ~않다, 한 번도 ~않다 · `often` 자주 · `other` 다른 · `sometimes` 가끔 · `them` 그들을, 그것들을 · `us` 우리를, 우리에게 · `usually` 보통, 대개 · `which` 어느, 어떤 것 · `why` 왜 · `would` ~하고 싶다(would like)
- **5단계 내용어 150개**: add, bake, band, bat, bean, beef, belt, biscuit, boat, bookstore, boring, borrow, brave, button, buy, captain, carrot, cash, castle, cheap, check, choose, classmate, clothes, coach, coffee, concert, cost, count, country, curtain, customer, daughter, decide, delicious, desert, dollar, doughnut, eighteen, eighty, eleven, enjoy, example, excited, expensive, fever, fifteen, fifty, film, football, forty, fourteen, fresh, full, gentleman, glass, goal, gold, gray, group, gum, hate, headache, heavy, helicopter, helmet, hike, hotel, hundred, husband, idea, island, joke, knife, lady, language, lend, lesson, light, lip, list, match, medal, medicine, member, menu, money, museum, mushroom, nineteen, ninety, ocean, onion, order, pair, pan, pay, pear, pie, piece, plastic, player, poor, popular, post office, price, prince, problem, quiet, quiz, radio, restroom, ribbon, rich, salad, sale, salty, score, sell, seventeen, seventy, share, shy, sixteen, sixty, size, son, sour, spaghetti, spoon, steak, stone, supermarket, surprised, sweet, tea, telephone, television, test, theater, thirteen, thirty, ticket, tomato, twelve, twenty, watermelon, wife, wood, world
- **6단계 기능어 11개**: `across` ~을 건너서 · `along` ~을 따라 · `any` 어떤, 조금이라도 · `anyone` 누구든, 아무도 · `anything` 무엇이든, 아무것도 · `because` ~ 때문에 · `nothing` 아무것도 ~ 아니다 · `some` 조금, 몇몇의 · `someone` 누군가 · `something` 무엇인가 · `when` 언제
- **6단계 내용어 150개**: ago, agree, ahead, April, area, August, become, bee, begin, believe, board, bone, break, brown, burn, calendar, care, center, chance, circle, clever, collect, congratulate, cotton, cover, cream, cross, cry, date, dead, December, deep, die, double, drive, dry, earth, east, enter, event, exercise, fail, February, festival, field, fight, fill, first, flag, flour, future, garage, grocery, ground, guess, guy, habit, hang, happen, heat, hero, hill, history, hit, holiday, honest, honey, hope, hunt, hurry, introduce, invite, January, job, join, July, June, kiss, land, last, laugh, lazy, lid, lie, life, luck, mad, March, marry, memory, mind, miss, month, moon, mouse, nature, nervous, noon, north, note, November, October, office, oil, parade, part, pass, place, plan, power, proud, rainbow, salt, sauce, save, season, second, September, set, shout, smell, sound, south, space, speed, stay, storm, style, sugar, taste, third, tonight, travel, trip, twice, type, understand, vacation, van, visit, voice, weight, welcome, west, wet, wish, wool, worried, year, yesterday
- **7단계 기능어 15개**: `anybody` 누구든, 아무도 · `could` ~할 수 있었다 · `during` ~ 동안 · `each` 각각의 · `few` 조금의, 몇몇의 · `more` 더 많은, 더 · `most` 가장, 대부분의 · `nobody` 아무도 ~ 않다 · `somebody` 누군가 · `than` ~보다 · `through` ~을 지나, ~을 통해 · `until` ~까지 · `whose` 누구의 · `will` ~할 것이다 · `without` ~ 없이
- **7단계 내용어 150개**: able, address, airline, airport, alive, arrange, audience, award, bar, bark, battery, beat, beauty, bend, bill, bite, blank, blonde, bloom, blow, bounce, bow, brain, branch, brand, brilliant, broad, business, cart, champion, chat, cheek, cheer, chest, church, cinema, clear, clerk, cliff, coast, comedy, common, company, correct, countryside, couple, course, crown, deliver, dialogue, dictionary, dig, dozen, drama, envelope, excuse, exit, extra, fair, fancy, fantastic, fashion, favor, feed, final, finally, flight, follow, freeze, gorgeous, grade, greet, guide, half, handsome, hide, highway, huge, journey, lamb, lane, lead, league, leave, marathon, mention, model, modern, muscle, mystery, narrow, oak, opera, pack, palace, pardon, past, path, perfect, photograph, plenty, pop, post, prepare, prize, promise, quarter, rare, rat, real, repair, reply, reserve, rise, root, row, schedule, secret, seed, sentence, shadow, shake, shine, shore, shut, simple, spend, stage, station, steal, stomach, straight, strange, stuff, suit, tap, tear, terrible, then, tiny, tongue, total, tour, traffic, ugly, valley, vehicle, weak, wedding, wide
- **8단계 기능어 13개**: `against` ~에 맞서, ~에 기대어 · `herself` 그녀 자신 · `himself` 그 자신 · `itself` 그것 자체 · `may` ~해도 된다, ~일지도 모른다 · `must` ~해야 한다 · `myself` 나 자신 · `none` 아무도 · 하나도 ~ 않다 · `ourselves` 우리 자신 · `should` ~하는 것이 좋다 · `themselves` 그들 자신 · `toward` ~ 쪽으로 · `yourself` 너 자신
- **8단계 내용어 150개**: accident, advice, alarm, allow, aloud, ambulance, angel, anger, annoy, anxious, appear, army, asleep, attention, avoid, awake, bang, belong, bit, bless, blind, boss, bother, breath, breathe, bump, calm, carefully, cause, chase, choice, click, clip, clue, college, complain, confuse, continue, crash, crowd, cure, curious, danger, diet, disappoint, discuss, duty, easily, effort, else, embarrass, emotion, escape, even, expect, fear, fit, flash, float, fool, forward, fright, frustrate, grab, guard, happily, health, human, hurt, ill, imagine, immediate, improve, injure, instant, iron, law, lift, loudly, manner, mark, mean, medical, melt, mess, mission, moment, mood, notice, officer, own, pain, panic, partner, patient, polite, possible, prefer, pretend, protect, quickly, quietly, raise, reach, receive, relax, rest, rob, rude, rule, rush, safely, scare, scratch, scream, screen, search, seem, serious, serve, shock, shoot, slip, slowly, smoke, soldier, solve, sore, spot, spy, still, stretch, success, sudden, suddenly, suggest, support, switch, teenage, text, thief, tight, tip, title, topic, trouble, trust, upset, warn, wound
- **9단계 기능어 9개**: `among` ~ 사이에 · `as` ~처럼, ~로서 · `either` 둘 중 하나, ~도(아니다) · `except` ~을 빼고 · `if` 만약 ~라면 · `neither` 둘 다 아니다 · `several` 몇몇의 · `shall` ~할까요 · `till` ~까지
- **9단계 내용어 150개**: accent, accept, act, adventure, advise, announce, attend, base, bay, beg, bitter, blood, boil, bore, brake, bunch, bury, cape, carpet, case, chain, challenge, character, chart, code, comfort, complete, connect, contact, cop, court, crisp, cruel, describe, direct, disc, distance, disturb, dive, divide, drag, edge, especially, ever, exact, exchange, experience, experiment, explain, fat, fellow, flat, flood, flow, fold, folk, forever, form, fortune, frame, fry, furniture, gas, gather, gentle, gesture, graph, handle, heaven, height, humor, hunger, instead, instrument, interest, item, junior, lay, lean, leap, level, load, log, loose, main, matter, maybe, measure, metal, method, mix, nowadays, nowhere, offer, once, pattern, pause, perform, perhaps, pile, pity, plus, poem, poet, poison, pour, pray, print, process, pronounce, quit, quite, record, remind, rent, report, result, roll, rough, scene, sense, sew, shade, shape, sharp, sight, single, skill, smooth, soil, speech, spread, square, step, stir, string, swallow, tie, tire, track, trap, truth, tune, twist, university, view, volunteer, weigh, wise, wrap
- **10단계 기능어 5개**: `might` ~일지도 모른다 · `per` ~마다, ~당 · `since` ~ 이후로, ~ 때문에 · `such` 그런, 아주 ~한 · `whether` ~인지 (아닌지)
- **10단계 내용어 150개**: account, admire, afford, aid, amount, apart, apply, arrest, atmosphere, attack, attract, automatic, average, balance, bare, birth, blame, boom, burst, calculate, cell, certain, charge, charm, chief, climate, coal, comment, compute, concentrate, condition, contain, control, create, credit, cycle, damage, deal, death, delay, delight, depend, design, destroy, detail, develop, display, earn, electric, energy, engine, engineer, enormous, entertain, examine, expert, express, factory, faint, familiar, fascinate, fault, fee, female, file, focus, force, gain, harm, honor, however, ignore, image, impress, include, increase, industry, inform, innocent, interrupt, invent, judge, laboratory, laser, lawyer, limit, link, locate, loss, machine, male, manage, monitor, motor, necessary, object, observe, operate, ordinary, paragraph, period, pipe, planet, pole, pollute, port, prevent, produce, program, project, prove, punish, react, recent, recognize, recover, reduce, refuse, register, regular, remove, replace, request, research, resource, role, ruin, sample, scale, secretary, section, senior, separate, service, site, software, staff, state, strike, succeed, survey, survive, system, target, technology, temperature, unit, vote, waste, website
- **11단계 기능어 9개**: `although` 비록 ~이지만 · `beyond` ~ 너머에 · `nor` ~도 아니다 · `though` ~이지만, 그래도 · `unless` ~하지 않으면 · `upon` ~ 위에 · `while` ~하는 동안, ~인 반면 · `within` ~ 안에, ~ 이내에 · `yet` 아직, 그렇지만
- **11단계 내용어 150개**: access, adapt, admit, adopt, advance, advertise, affect, agent, aim, altogether, appreciate, approach, article, aside, assist, attach, attempt, attitude, aware, awkward, benefit, brief, campaign, cast, catalogue, category, chairman, channel, citizen, combine, command, community, compare, complex, complicate, concern, confirm, content, contribute, convince, county, culture, dare, defense, define, demand, deserve, desire, disgust, district, document, doubt, due, educate, entire, equal, exist, expand, extend, extreme, feature, firm, foreign, fortunate, function, fund, glance, guilt, hesitate, hire, insist, involve, issue, lack, legal, license, local, magazine, major, marvel, mass, maximum, mental, minor, mount, nation, native, obvious, occasion, occur, practical, previous, pride, privacy, profession, progress, promote, proper, propose, pure, rapid, rate, rather, recreation, refer, reflect, relate, release, remain, represent, require, resist, respond, retire, risk, satisfy, seek, select, self, series, settle, shame, shelter, shift, similar, situate, slight, social, society, solid, soul, spirit, stable, struggle, suffer, sum, supply, suspect, technique, tend, tense, term, threat, tone, trace, tradition, transfer, unite, vary, vision
- **12단계 기능어 4개**: `beneath` ~ 아래에 · `despite` ~에도 불구하고 · `ought` ~해야 한다(ought to) · `whom` 누구를, ~하는 사람
- **12단계 내용어 150개**: absolute, accuse, achieve, advantage, affair, alter, analysis, annual, appeal, appoint, appropriate, argue, assess, assign, associate, assume, background, basis, battle, belief, bind, bond, budget, capable, capital, career, century, characteristic, circumstance, civil, claim, client, committee, communicate, concept, conclusion, conflict, conscious, consider, constant, consume, context, converse, council, crime, crisis, current, debate, debt, definite, degree, demonstrate, deny, depress, desperate, detect, determine, ease, economy, effect, elect, element, emphasize, empire, enemy, engage, essay, establish, estimate, evidence, exhaust, expense, expose, fact, factor, figure, finance, forth, found, general, glory, govern, grace, grant, guarantee, identity, illustrate, income, indeed, indicate, individual, influence, instance, insure, intend, intense, internal, invest, justice, knowledge, labor, maintain, military, moral, moreover, opinion, oppose, otherwise, peace, physical, policy, politics, possess, potential, presence, principle, private, proceed, profit, property, protest, provide, public, purpose, quality, range, reason, regard, region, rely, remark, responsible, royal, secure, session, source, specific, sponsor, standard, strategy, structure, tax, theory, therefore, thus, trade, value, various, war, worth

## 8. 학습 요소 범위와 문장 꼴(정본 3.6 쓰기 열 · C54 ㅅ)

배치 단계 L 문항의 범위는 단계 L 까지 전부다(C54 ㅅ). 검증기가 아래 형태 표(**쓰기 차례** — 읽기 · 말하기와 다르다)로 단계 L 위의 형태를 오류로 잡는다(`learning-elements`). 예: 쓰기에서 3인칭 단수 -s 는 5단계, was · were 는 7단계, will 은 8단계, 현재완료는 10단계에 들어온다.

| 들어오는 단계 · 단원 | 형태 id | 꼴 | 검출 낱말 |
|---|---|---|---|
| 1 · 1 | `have` | have(가지다) 문장 | has, i've, you've, we've, they've |
| 2 · 2 | `he-she` | He · She | he, she, he's, she's, he'll, she'll, he'd, she'd |
| 3 · 1 | `we-they` | we · they | 낱말 10개(예: we, they, we're) |
| 3 · 4 | `there-is` | There is ~ | there is, there's |
| 3 · 4 | `lets` | Let's ~ | let us |
| 3 · 5 | `can` | can 문장 | 글 꼴로 잡는다 |
| 4 · 3 | `want-to` | want to | 글 꼴로 잡는다 |
| 4 · 4 | `dont` | don't · do not 부정문 | 글 꼴로 잡는다 |
| 4 · 4 | `be-not` | be 동사 부정문(isn't · aren't) | 글 꼴로 잡는다 |
| 4 · 5 | `can-not` | can't · cannot | can't, cannot, can not |
| 4 · 5 | `time-at` | 시각 · 요일(at · on) | 글 꼴로 잡는다 |
| 5 · 2 | `there-are` | There are ~ | there are |
| 5 · 2 | `would-like` | would like | 글 꼴로 잡는다 |
| 5 · 3 | `third-person-s` | 3인칭 단수 -s | 낱말 352개(예: accepts, accuses, achieves) |
| 5 · 4 | `present-progressive` | 현재진행 | 글 꼴로 잡는다 |
| 5 · 4 | `how-much` | How much | how much |
| 5 · 5 | `but` | but 으로 잇기 | but |
| 6 · 1 | `does` | does · doesn't 의문문 · 부정문 | does, doesn't, does not |
| 6 · 3 | `frequency-adverbs` | 빈도부사 | always, usually, often, sometimes, never |
| 6 · 4 | `when-question` | When 의문문 | 글 꼴로 잡는다 |
| 6 · 4 | `object-pronouns` | 목적격 대명사 him · us · them | him, us, them |
| 6 · 5 | `because` | because | because |
| 6 · 5 | `some-any` | some · any | any |
| 7 · 1 | `past-be` | was · were | was, were, wasn't, weren't |
| 7 · 2 | `past-regular` | 규칙 동사 과거 -ed | 낱말 457개(예: accepted, accessed, accused) |
| 7 · 3 | `past-irregular` | 불규칙 동사 과거 | 낱말 74개(예: ate, became, began) |
| 7 · 3 | `did` | did 의문문 · 부정문 | did, didn't, did not |
| 8 · 1 | `going-to` | be going to | 글 꼴로 잡는다 |
| 8 · 1 | `will` | will | will, won't |
| 8 · 1 | `past-progressive` | 과거진행 | 글 꼴로 잡는다 |
| 8 · 2 | `comparative` | 비교급 | 낱말 107개(예: angrier, bigger, braver) |
| 8 · 3 | `superlative` | 최상급 | 낱말 110개(예: angriest, biggest, bravest) |
| 8 · 3 | `adverb-ly` | 부사 -ly | 낱말 10개(예: carefully, easily, especially) |
| 8 · 4 | `have-to` | have to | 글 꼴로 잡는다 |
| 8 · 5 | `when-clause` | when 절 | 글 꼴로 잡는다 |
| 9 · 1 | `to-infinitive` | to 부정사 | 글 꼴로 잡는다 |
| 9 · 2 | `gerund` | 동명사 | 글 꼴로 잡는다 |
| 9 · 3 | `must` | must | must, mustn't |
| 9 · 3 | `should` | should | should, shouldn't |
| 9 · 4 | `conj-so-after-before` | so · after · before 로 잇기 | 글 꼴로 잡는다 |
| 10 · 1 | `opinion-phrase` | In my opinion · I believe that | in my opinion |
| 10 · 2 | `relative-who-which` | 관계대명사 who · which | 글 꼴로 잡는다 |
| 10 · 3 | `however` | however · also | however |
| 10 · 4 | `indirect-question` | 간접 의문문 | 글 꼴로 잡는다 |
| 10 · 5 | `present-perfect` | 현재완료 | 글 꼴로 잡는다 |
| 11 · 1 | `relative-adverb` | 관계부사 where · when | 글 꼴로 잡는다 |
| 11 · 1 | `contrast-connector` | while · on the other hand | on the other hand |
| 11 · 3 | `passive` | 수동태 | 글 꼴로 잡는다 |
| 11 · 4 | `if` | if 조건문 | if |
| 11 · 4 | `as-as` | as ~ as | 글 꼴로 잡는다 |
| 11 · 5 | `for-example` | for example | for example, for instance |
| 12 · 1 | `cause-effect` | because of · as a result | because of, as a result |
| 12 · 2 | `second-conditional` | 가정법 과거 | 글 꼴로 잡는다 |
| 12 · 2 | `so-that` | so that · in order to | so that, in order to |
| 12 · 3 | `although` | although · though | although, though |
| 12 · 3 | `used-to` | used to | 글 꼴로 잡는다 |
| 12 · 4 | `modal-passive` | 조동사 수동태 | 글 꼴로 잡는다 |
| 12 · 5 | `paragraph-connector` | 문단 연결 | first of all, in conclusion, to sum up |

검출기에 대해 알아 둘 것(2026-10-23 실제 검출기로 대조):

- `would` 뒤에 `like` 가 바로 오지 않으면 가정법 과거(쓰기 12단계)로 잡힌다(`What would Dan like?` 는 걸린다).
- 3인칭 단수 -s 는 he · she · it 뒤 동사를 잡는다. 이름 뒤(`Ben likes`)는 잡지 않지만 쓰기 5단계 요소라 4단계 문항에 쓰지 않는다.
- 빈칸 문장(`___`)은 빈칸을 낱말로 세지 않는다. 고칠 문장(틀린 문장)도 검사를 받는다 — 틀린 곳이 단계 위 형태로 잡히지 않게, 틀림은 그 단계 요소 안의 잘못(꼴 · 수 · 때가 어긋남)으로 만든다.

## 9. 그림 규칙(1단계 고르기 · 채우기)

- 1단계 고르기의 `picture` 는 그림이 있는 1단계 낱말 id 로만 낸다(검증기 `image`, C126). 채우기는 `word` 의 그림을 보인다(그림 없는 낱말은 한국어 뜻 글).
- 헷갈리는 짝은 같은 고르기 보기에 함께 두지 않는다: ant · insect, hat · cap, cup · milk, face · smile, face · neck, 그리고 1단계 밖 짝(leg · knee 등)은 어차피 1단계 보기에 오지 않는다. (제안) rose · flower, bird · chicken · duck 도 함께 두지 않는다.
- 수 낱말의 그림은 숫자 키캡, 색 낱말의 그림은 색 동그라미다. grape 그림은 송이다.

1단계 그림 낱말 128개(`writing-1.md` 9절 표와 같은 낱말):

| 낱말 | 그림 · 맞출 것 |
|---|---|
| ant | 개미(insect 와 짝 피함) |
| bear | 곰 얼굴(BEAR FACE) |
| cow | 흰 바탕에 검은 점 소 — 색을 말하지 않는다 |
| door | 갈색 문 — 색을 말하지 않는다 |
| elephant | 코끼리 |
| fork | 세워 놓은 포크 하나 |
| guitar | 기타 |
| horse | 말 |
| insect | 초록 곤충 한 마리(세 마디 · 다리 여섯, 개미 꼴 아님) |
| juice | 종이팩 음료(BEVERAGE BOX) |
| key | 열쇠 |
| lion | 사자 얼굴(LION FACE) |
| monkey | 원숭이 |
| nurse | 간호사 모자 · 분홍 간호복의 윗몸 |
| octopus | 보라 문어 — 색을 말하지 않는다 |
| piano | 건반(MUSICAL KEYBOARD, 예문 The piano is black.) |
| queen | 왕관 · 긴 머리 · 보라 드레스의 동화 속 여왕 윗몸 |
| robot | 로봇 얼굴(ROBOT FACE) |
| star | 별(WHITE MEDIUM STAR) |
| tiger | 주황 호랑이(예문 The tiger is orange.) |
| umbrella | 우산 |
| violin | 바이올린 |
| window | 창문 |
| box | 소포 상자(PACKAGE) |
| yo-yo | 빨간 요요(예문 My yo-yo is red.) |
| zebra | 얼룩말 얼굴(ZEBRA FACE) |
| seven | 숫자 키캡 7(물건 7개 그림 아님) |
| ten | 숫자 키캡 10(물건 10개 그림 아님) |
| red | 빨간 동그라미(색 뜻) |
| yellow | 노란 동그라미(색 뜻) |
| cat | 고양이 |
| rabbit | 회색 토끼 — 색을 말하지 않는다(흰 토끼 아님) |
| apple | 빨간 사과(RED APPLE) |
| egg | 달걀 |
| candy | 사탕 |
| bag | 책가방(SCHOOL SATCHEL) |
| hat | 밀짚모자 — 색을 말하지 않는다 |
| cap | 파란 야구 모자(예문 My cap is blue.) |
| pen | 검은 볼펜(예문 It is a black pen.) |
| pencil | 연필 |
| bed | 침대 |
| desk | 서랍 달린 학생 책상(위에 아무것도 없음) |
| map | 세계 지도 |
| hand | 손바닥을 든 손(RAISED HAND) |
| leg | 사람 다리 |
| sand | 연노랑 모래 더미 |
| jam | 빨간 잼이 든 뚜껑 덮인 유리병 |
| fan | 빨간 접는 부채(선풍기 아님) |
| lamp | 불이 켜진 책상 스탠드 등 |
| tent | 텐트 |
| bell | 종 |
| six | 숫자 키캡 6(물건 6개 그림 아님) |
| one | 숫자 키캡 1(물건 1개 그림 아님) |
| four | 숫자 키캡 4(물건 4개 그림 아님) |
| dog | 개 |
| pig | 돼지 |
| frog | 개구리 얼굴(FROG FACE) |
| green | 초록 동그라미(색 뜻) |
| milk | 컵에 든 우유(GLASS OF MILK) |
| cup | 손잡이 달린 빈 머그컵 |
| doll | 헝겊 인형 |
| bus | 회색 · 파랑 버스 — 색을 말하지 않는다 |
| pizza | 피자 한 조각 |
| drum | 북과 북채 |
| sun | 빛살 있는 해 |
| top | 빨간 나무 팽이(꼭대기 뜻 아님) |
| car | 자동차(AUTOMOBILE) |
| pot | 뚜껑 덮인 빈 냄비(화분 아님) |
| fox | 주황 여우 얼굴(FOX FACE, 예문 The fox is orange.) |
| wing | 회백 날개 — 색을 말하지 않는다 |
| three | 숫자 키캡 3(물건 3개 그림 아님) |
| fish | 물고기 |
| two | 숫자 키캡 2(물건 2개 그림 아님) |
| eight | 숫자 키캡 8(물건 8개 그림 아님) |
| sheep | 양 |
| cheese | 노란 치즈 조각(CHEESE WEDGE, 예문 The cheese is yellow.) |
| chair | 갈색 나무 의자 — 색을 말하지 않는다(brown 은 1단계 밖) |
| orange | 주황 동그라미(색 뜻, 과일 아님) |
| shoe | 빨간 운동화(예문 I like the red shoes.) |
| ship | 배 |
| mouth | 입술 |
| tooth | 흰 이 하나(예문 My tooth is white.) |
| cookie | 쿠키 |
| shop | 줄무늬 차양 · 진열창이 있는 작은 가게 |
| shirt | 파란 티셔츠 |
| shell | 회백 소라 껍데기 — 색을 말하지 않는다 |
| brush | 붓(칫솔 · 빗 아님) |
| dish | 음식 없는 둥근 흰 접시 |
| bath | 욕조(BATHTUB) |
| arm | 어깨에서 손끝까지 뻗은 팔 하나 |
| black | 검은 동그라미(색 뜻) |
| pink | 분홍 동그라미(색 뜻) |
| blue | 파란 동그라미(색 뜻) |
| duck | 청둥오리(초록 머리 · 갈색 몸) — 색을 말하지 않는다 |
| sock | 파란 양말(노란 줄) |
| truck | 배달 트럭 |
| bird | 빨간 새 |
| ring | 반지 |
| neck | 아이 윗몸에서 목을 빨간 점선 동그라미로 둘러쌈(얼굴이 보임) |
| rock | 바위 |
| jacket | 파란 외투 그림(🧥 COAT, 예문 My jacket is blue.) |
| book | 펼친 책 |
| chicken | 살아 있는 닭(닭고기 아님) |
| clock | 자명종 시계 |
| eye | 눈 하나 |
| king | 왕관 · 수염 · 빨간 망토의 동화 속 왕 윗몸 |
| swing | 빨간 자리의 빈 그네 |
| bank | 은행 건물 |
| tree | 잎 넓은 나무 |
| five | 숫자 키캡 5(물건 5개 그림 아님) |
| nine | 숫자 키캡 9(물건 9개 그림 아님) |
| white | 흰 동그라미(색 뜻, 자체 그림) |
| banana | 바나나 |
| cake | 조각 케이크(SHORTCAKE) |
| grape | 보라 포도 — 색을 말하지 않는다(purple 은 범위 밖) |
| bike | 빨간 자전거 |
| kite | 파란 연 |
| ball | 빨강 · 파랑 · 노랑 띠의 고무공 — 한 색으로 말하지 않는다 |
| nose | 코 |
| face | 앞을 보는 아이 얼굴, 다문 입의 무표정(빨갛지 않고 웃지 않음) |
| lake | 풀 · 나무로 둘러싸인 파란 호수 |
| ear | 사람 귀 |
| rose | 빨간 장미(예문 The rose is red.) |
| flower | 흰 꽃잎 꽃 |
| plane | 흰 비행기(예문 The plane is white.) |
| snake | 초록 뱀(예문 The snake is green.) |
| rice | 밥(COOKED RICE) |
| smile | 웃는 얼굴(SMILING FACE WITH SMILING EYES) |

## 10. 주제 · 인물

- 배치에는 주제 변형이 없다. 단계마다 그 단계 단원 주제(6절)에서 문장 상황을 고른다.
- 아이 이름 자리 `{NAME}` 은 쓰지 않는다. 실제 사람 이름도 쓰지 않는다.

### 인물(C124 · C126)

- 인물은 문장에 꼭 필요할 때만 넣는다(`Meg ___ (have) a red bike.`). 대부분은 이름 없이 쓴다(`My brother ___ (play) soccer.`).
- 조립 카드에는 이름 · I 를 넣지 않는다 — 지금 검증기가 대문자 카드를 모두 막는다(C84 대로 고치는 일은 쓰기 3단계 수업 전). 조립 문장은 `my · the · this · you · we · they` 로 시작한다.
- 넣을 때는 아래 표의 이름만 쓴다. 모모 · 토리만 되풀이하지 않는다. 회화 선생님 이름(Mina · Leo · Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi)과 실제 사람 · 상표 이름은 쓰지 않는다. 이름을 부르는 말로 붙이지 않는다.

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

셀 수 있는 기준(제안, C126 셈을 배치 파일에 옮김 — N = 36문항): 이름이 나오는 문항 n ≤ 9(⌊N/4⌋), 그 가운데 Momo · Tori 문항 m ≤ max(4(⌊N/8⌋), ⌊n/2⌋). 14절 명령이 센다.

## 11. 문항 갈래별 쓰는 법

| 갈래 | 칸 | 규칙 |
|---|---|---|
| `pick-word`(1단계) | `picture` · `options`(4) · `answerNo` · `accepted` | `writing-1.md` 5절과 같다: `options[answerNo − 1]` = `accepted[0]`, 보기는 1단계 낱말 원형 · 소문자, 오답 둘 이상은 글자 꼴이 비슷한 낱말, 한국어 뜻만으로 정답이 하나 |
| `fill-letters`(1단계) | `word` · `pattern` · `tiles` · `accepted` | 빈칸은 1단계 철자 패턴 자리(단모음 · sh · ch · th · -ck · -ng · -nk · 묵음 e) 1~2개, 타일은 한 글자 소문자, 덤 1~2장. **덤 글자를 빈칸에 넣어 생기는 모든 꼴이 사전 낱말 · 이름 · 줄임말이 아니다**(장부 '풀이 검사 헛경보' — 풀이 AI 는 무늬와 타일만 본다. 흔한 끝을 만드는 덤 글자보다 낱말이 거의 없는 글자를 먼저 고른다) |
| `copy-tiles`(1단계) | `word` · `tiles` · `accepted` | 낱말 글자 전부를 섞은 한 글자 타일(덤 없음, 차례 그대로 아님), 6글자까지 |
| `dictation`(2단계) | `word` · `audioText` · `accepted` | 앱이 `audioText` 를 읽어 주고 아이가 앱 안 자판으로 친다. `audioText` 는 낱말 하나이고 `word` · `accepted[0]` 과 같다(검증기 `answer`). 2단계 내용어 가운데 소리대로 쓰이는 6글자 이하 낱말, 동음이의어가 있는 낱말(four · for · right · write 같은)은 쓰지 않는다 |
| `build-tiles`(2단계) | `word` · `meaningKo` · `tiles` · `accepted` | 한국어 뜻만 보고 타일로 낱말을 만든다. 타일은 낱말 글자 전부 + 덤 1~2장(한 글자 소문자, 섞음). 뜻이 하나로 그 낱말을 가리키고, 덤 글자를 써서 같은 뜻의 다른 낱말이 만들어지지 않는다 |
| `assemble-phrase`(2단계) | `cards` · `meaningKo` · `accepted` | 2~3장의 낱말 카드(소문자)를 차례대로 놓아 2단계 쓰기 요소 어구(형용사 + 명사 · 수 + 복수 명사 · 동사 + 목적어 · 전치사 + 명사 · 명사 and 명사)를 만든다. `meaningKo` 는 어구 뜻(어구라 말끝이 없는 꼴, `우리 아빠와 함께`). `accepted` 는 맞는 차례를 모두(보통 하나) |
| `assemble-sentence`(3단계) | `cards` · `meaningKo` · `accepted` | 3~5장의 낱말 카드 + 문장 부호 카드 하나(`.` 또는 `?`). 카드는 모두 소문자(아이가 첫 카드를 대문자로 바꾼다), 문장 부호는 낱말 카드에 붙이지 않는다. 이름 · I 는 넣지 않는다(10절). `meaningKo` 는 문장 뜻(반말). `accepted` 는 대문자 · 문장 부호까지 정답 꼴로, 맞는 차례를 모두(`Is there a cloud?`). 세 문항이 서로 다른 3단계 쓰기 요소(주어 + be + 형용사 · 주어 + 동사 + 목적어 · 물음표 · There is · can)를 잰다 |
| `fill-blank`(4~12단계) | `prompt` · `accepted` | 문장 하나에 빈칸 `___`(밑줄 셋) 하나. (제안) 빈칸 바로 뒤 괄호에 바탕 낱말을 둔다(`Last Sunday my family ___ (go) to the airport.`) — 답이 하나로 정해지게 한다. 빈칸 답은 낱말 하나(그 단계 요소의 꼴: 동사 꼴 · 비교급 · 대명사 · 관계사 …). `accepted` 에 맞는 꼴을 모두 넣는다(축약 · 편 꼴 `doesn't` · `does not`). 빈칸 밖 문장은 바르다 |
| `fix-sentence`(4~12단계) | `prompt` · `accepted` | 틀린 곳이 **하나뿐**인 문장(그 단계 요소 자리의 꼴 · 수 · 때 어긋남 한 낱말). 아이는 문장 전체를 바르게 다시 친다. 고치는 길이 하나로 정해지게 실마리를 둔다(`Yesterday` 가 있으면 과거, `two` 가 있으면 복수). `accepted` 는 고친 문장 전부를 정답 꼴로(첫 글자 대문자 · 끝 문장 부호), (제안) 끝 문장 부호를 뺀 꼴과 축약 · 편 꼴도 넣는다. 고치기 전 문장을 허용 정답에 넣지 않는다. 문장은 (제안) 5~10낱말로 짧게(아이가 다 쳐야 한다) |

- 1~3단계 문항은 `writing-1.md` 의 꼴과 같게 한다(소문자 · 한 글자 타일 · 문장 부호 카드). 2 · 3단계 수업 브리프가 아직 없어 위 표가 그 꼴의 첫 정의다(17절).
- 풀이 검사(정본 6.4)는 받아쓰기 · 조립은 허용 정답 후보를 더 내게 하고(시드에 없는 것이 나오면 사람 확인), 빈칸 · 고치기는 'prompt 가 묻는 글'을 쓰게 한다. 그래서 빈칸은 괄호 바탕 낱말로 답을 하나로, 고치기는 고칠 곳이 하나인 문장으로 쓴다.

## 12. 출력 규격(Zod `PlacementFileSchema` writing · `WritingPlacementItemSchema` 와 1:1)

모르는 키는 거부된다. 파일 겉: `{ "area": "writing", "form": 1, "levels": [ { "level": <1~12>, "items": [3개], "spares": [] } ] }`. 단계는 1~12 를 한 번씩, 차례대로 둔다.

| 필드 | 꼴 | 설명 |
|---|---|---|
| `no` | 1~3 | 단계 안 차례(5절 갈래 차례) |
| `revision` · `correction` | 0 이상 정수 | 호출 값 |
| `type` | `pick-word` · `fill-letters` · `copy-tiles` · `dictation` · `build-tiles` · `assemble-phrase` · `assemble-sentence` · `fill-blank` · `fix-sentence` | 5절 |
| 갈래 칸 | 11절 | `pick-word` `{ picture, options, answerNo, accepted }` · `fill-letters` `{ word, pattern, tiles, accepted }` · `copy-tiles` `{ word, tiles, accepted }` · `dictation` `{ word, audioText, accepted }` · `build-tiles` `{ word, meaningKo, tiles, accepted }` · `assemble-phrase` · `assemble-sentence` `{ cards, meaningKo, accepted }` · `fill-blank` · `fix-sentence` `{ prompt, accepted }` |

`unit` · `explanationKo` · `generation` 과 작문(`composition`)은 두지 않는다.

예시: 2 · 3 · 7단계(받아쓰기 · 타일 만들기 · 어구 조립 / 문장 조립 셋 / 빈칸 · 고치기 · 빈칸). 꼴을 보이는 예이니 그대로 옮기지 않는다. 2026-10-23 에 검증기와 14절 명령으로 이 단계들의 오류 0 · 문제 0 을 확인했다.

```json
{
  "area": "writing",
  "form": 1,
  "levels": [
    {
      "level": 2,
      "items": [
        {"no": 1, "revision": 2, "correction": 0, "type": "dictation", "word": "dress", "audioText": "dress", "accepted": ["dress"]},
        {"no": 2, "revision": 2, "correction": 0, "type": "build-tiles", "word": "corn", "meaningKo": "옥수수", "tiles": ["r", "c", "n", "o", "a"], "accepted": ["corn"]},
        {"no": 3, "revision": 2, "correction": 0, "type": "assemble-phrase", "cards": ["dad", "my", "with"], "meaningKo": "우리 아빠와 함께", "accepted": ["with my dad"]}
      ],
      "spares": []
    },
    {
      "level": 3,
      "items": [
        {"no": 1, "revision": 2, "correction": 0, "type": "assemble-sentence", "cards": ["is", "the", "clean", "room", "."], "meaningKo": "방이 깨끗해.", "accepted": ["The room is clean."]},
        {"no": 2, "revision": 2, "correction": 0, "type": "assemble-sentence", "cards": ["the", "carry", "can", "basket", "you", "."], "meaningKo": "너는 바구니를 들 수 있어.", "accepted": ["You can carry the basket."]},
        {"no": 3, "revision": 2, "correction": 0, "type": "assemble-sentence", "cards": ["a", "there", "is", "cloud", "?"], "meaningKo": "구름이 있어?", "accepted": ["Is there a cloud?"]}
      ],
      "spares": []
    },
    {
      "level": 7,
      "items": [
        {"no": 1, "revision": 2, "correction": 0, "type": "fill-blank", "prompt": "Last Sunday my family ___ (go) to the airport.", "accepted": ["went"]},
        {"no": 2, "revision": 2, "correction": 0, "type": "fix-sentence", "prompt": "Yesterday Tess repair her bike.", "accepted": ["Yesterday Tess repaired her bike.", "Yesterday Tess repaired her bike"]},
        {"no": 3, "revision": 2, "correction": 0, "type": "fill-blank", "prompt": "The bus ___ (leave) the station at nine.", "accepted": ["left"]}
      ],
      "spares": []
    }
  ]
}
```

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말(영어 45 · 한국어 19)과 정규식 13개.
- 개인 정보를 묻는 말 · 연락처 꼴 · 메타 문장(the child · the user · the student · I should · I will now 등).
- (제안) 무섭거나 다치는 장면, 상표 · 실제 인물 · 종교 · 정치. 채우기 · 타일 덤 글자로 맞지 않는 낱말이 생기는 글자.
- 설계 숫자를 글에 쓰지 않는다.
- `{NAME}` · 실제 아이 이름 · 회화 선생님 이름(10절).

## 14. 스스로 확인과 검증 명령

파일을 다 쓴 뒤 하나씩 확인한다.

1. 단계 1~12 가 한 번씩, 단계마다 문항 3개(번호 1~3)가 5절 갈래 차례이고, `spares` 가 빈 목록이다.
2. 모든 낱말이 단계 1~L 범위 안이고(범위 밖 0), 문항마다 단계 L 내용어가 있다(1단계는 1단계 낱말).
3. 단계 L 위의 형태가 없다(쓰기 차례).
4. 1단계: 고르기 · 채우기 · 베끼기가 11절 규칙(덤 글자 꼴이 사전 낱말이 아님)을 지킨다.
5. 2단계: 받아쓰기 낱말 = `audioText` = `accepted[0]`, 타일 만들기 뜻이 하나, 어구 카드가 소문자.
6. 3단계: 카드 소문자 · 문장 부호 카드 하나 · 이름 · I 없음, 허용 정답이 정답 꼴로 모든 차례.
7. 4~12단계: 빈칸은 하나 + 괄호 바탕 낱말, 고치기는 틀린 곳 하나 · 고치는 길 하나, 허용 정답에 끝 문장 부호 뺀 꼴 · 축약 꼴, 문항마다 그 단계 요소 하나.
8. 인물 기준(n ≤ 9 · m ≤ max(4, ⌊n/2⌋) · 표 밖 이름 · 선생님 이름 없음), 13절 금지 목록.

**스스로 확인 명령**(시드 검증 전에 돌린다. 이 명령의 결과로 고치는 것은 고침 회차에 넣지 않는다. 마지막 줄이 `문제 0` 이 될 때까지 고친다. 저장소 뿌리에서 돌린다):

```sh
pnpm -s exec tsx - <뿌리> writing <<'EOF'
// 배치 평가 스스로 확인(브리프 14절). 사용: pnpm -s exec tsx - <뿌리> <영역> <<'EOF' … EOF
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeSentence } from "@/core/seed/check-assessment";
import { type PlacementItem, PlacementFileSchema, textsOfPlacementItem } from "@/core/seed/schema/assessment";
import { buildLexicon, offbandWords, splitSentences, tokenize, wordIdsIn } from "@/core/seed/text";

const [root = "seed", area = ""] = process.argv.slice(2);
const json = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));
const NAMES = ["Momo", "Tori", "Ben", "Meg", "Dan", "Tess", "Max", "Ted", "Gus"];
const TEACHERS = ["Mina", "Leo", "Ruby", "Sora", "Hana", "Jun", "Nabi", "Luna", "Kiki", "Lulu", "Pang", "Pipi"];
const PAIRS = ["ant insect", "hat cap", "cup milk", "face smile", "face neck", "head hair", "tired sleepy", "student boy", "student girl", "kick soccer", "leg knee", "foot toe", "hand finger", "arm strong", "face head", "bird fly", "cup water", "jacket coat", "pants jeans", "girl doll", "happy smile", "man grandfather", "woman grandmother", "rose flower", "bird chicken", "bird duck", "sheep goat"].map((p) => p.split(" "));
const LAYOUT: Record<string, Record<number, string[]>> = {
  reading: { 1: ["picture", "picture", "picture"], 2: ["fact", "fact", "picture"], 3: ["fact", "fact", "fact"], 4: ["fact", "fact", "fact"], 5: ["sequence", "fact", "fact"], 6: ["main-idea", "sequence", "fact"], 7: ["inference", "main-idea", "fact"], 8: ["vocab-in-context", "inference", "main-idea"], 9: ["topic", "vocab-in-context", "inference"], 10: ["gist", "inference", "vocab-in-context"], 11: ["purpose", "topic", "inference"], 12: ["structure", "purpose", "gist"] },
  writing: { 1: ["pick-word", "fill-letters", "copy-tiles"], 2: ["dictation", "build-tiles", "assemble-phrase"], 3: ["assemble-sentence", "assemble-sentence", "assemble-sentence"] },
  speaking: {},
};
for (let l = 4; l <= 12; l++) (LAYOUT.writing as Record<number, string[]>)[l] = ["fill-blank", "fix-sentence", "fill-blank"];
for (let l = 1; l <= 12; l++) (LAYOUT.speaking as Record<number, string[]>)[l] = l <= 8 ? ["repeat", "listening", "repeat"] : ["listening", "listening", "listening"];
// 읽기 지문 낱말 수(1단계는 문장 수) · 말하기 따라 말하기 · 듣기 대본 낱말 수(브리프 5절)
const PASSAGE: Record<number, [number, number]> = { 1: [2, 3], 2: [20, 28], 3: [35, 45], 4: [55, 65], 5: [80, 90], 6: [100, 110], 7: [120, 130], 8: [150, 160], 9: [180, 190], 10: [200, 210], 11: [230, 240], 12: [260, 270] };
const REPEAT: Record<number, [number, number]> = { 1: [3, 5], 2: [3, 5], 3: [4, 6], 4: [5, 7], 5: [6, 8], 6: [7, 9], 7: [8, 10], 8: [9, 12] };
const SCRIPT: Record<number, [number, number]> = { 1: [3, 5], 2: [4, 10], 3: [6, 12], 4: [8, 15], 5: [12, 22], 6: [15, 25], 7: [20, 30], 8: [25, 35], 9: [35, 50], 10: [45, 60], 11: [55, 70], 12: [60, 80] };
const EN = new Set(["passage", "script", "prompt", "option", "answer", "example", "hint"]);
const problems: string[] = [];
const say = (what: string, where: string, text: string) => problems.push(`[${what}] ${where} · ${text}`);
const words = (t: string) => tokenize(t).filter((x) => x.kind === "word").length;
const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

const parsed = PlacementFileSchema.safeParse(json(`placement/${area}.json`));
if (!parsed.success) {
  console.log("규격 오류(시드 검증으로 먼저 고친다):", parsed.error.issues.slice(0, 3));
  process.exit(1);
}
const file = parsed.data;
const vocab = json("vocab.json").vocab as { word: string; level: number; pos: string[] }[];
const lexicon = buildLexicon(vocab as never);
const pictured = new Set<string>(json("images.json").images.map((i: { word: string }) => i.word));
const levelOf = new Map(vocab.map((v) => [v.word, v]));
const texts = new Map<string, string>();
let n = 0;
let m = 0;
let nLevels = 0;
let mLevels = 0;
const seenLevels = new Set<number>();
const places = [0, 0, 0, 0, 0];
for (const entry of file.levels) {
  const L = entry.level;
  seenLevels.add(L);
  const expect = LAYOUT[area]?.[L] ?? [];
  const items = entry.items as PlacementItem[];
  const spares = entry.spares as PlacementItem[];
  if (items.length !== 3) say("문항 수", `단계 ${L}`, `본 문항 ${items.length}개(3개)`);
  if (area === "speaking" ? spares.length !== 3 : spares.length !== 0) say("예비 문항", `단계 ${L}`, `${spares.length}개`);
  const passages = new Set<string>();
  let levelHasName = false;
  let levelHasMomo = false;
  const levelWords = new Set<string>();
  for (const [group, list] of [["본", items], ["예비", spares]] as const) {
    for (const item of list) {
      const at = `단계 ${L} · ${group} ${item.no}번(${item.type}${item.type === "listening" ? `/${item.kind}` : ""})`;
      const want = group === "본" ? expect[item.no - 1] : "listening";
      if (item.type !== want) say("차례 표", at, `${want} 자리다`);
      const frags = textsOfPlacementItem(item).filter((f) => EN.has(f.role));
      const english = frags.map((f) => f.text).join(" \n ");
      for (const f of frags) {
        const off = offbandWords(f.text, { lexicon, level: L, newWords: [], properNouns: NAMES });
        if (off.length > 0) say("어휘 범위 밖", at, `${f.path}: ${[...new Set(off)].join(", ")}`);
      }
      const own = [...wordIdsIn(english, lexicon)].filter((id) => {
        const v = levelOf.get(id);
        return v !== undefined && v.level === L && !v.pos.includes("function");
      });
      for (const w of own) levelWords.add(w);
      if (L >= 2 && own.length === 0) say("그 단계 낱말", at, `단계 ${L} 내용어가 없다`);
      const toks = tokenize(english).map((t) => t.text);
      if (toks.some((t) => NAMES.includes(t))) { n++; levelHasName = true; }
      if (toks.some((t) => t === "Momo" || t === "Tori")) { m++; levelHasMomo = true; }
      for (const t of TEACHERS) if (toks.includes(t)) say("선생님 이름", at, t);
      const own2 = item.type === "listening" ? `${item.script} ${"prompt" in item ? (item.prompt ?? "") : ""} ${item.options.join(" ")}` : "passage" in item ? `${item.prompt} ${item.options.join(" ")}` : english;
      const prev = texts.get(norm(own2));
      if (prev) say("같은 글", at, `${prev} 와 같다`);
      else texts.set(norm(own2), at);
      if ("answerNo" in item) places[item.answerNo] = (places[item.answerNo] ?? 0) + 1;
      const options: string[] = "options" in item && Array.isArray(item.options) ? item.options : [];
      const pics = item.type === "picture" || (item.type === "listening" && item.kind === "picture") ? options : item.type === "pick-word" ? [item.picture, ...options] : [];
      for (const o of pics) if (!pictured.has(o)) say("그림 없음", at, o);
      for (const [a, b] of PAIRS) if (pics.includes(a as string) && pics.includes(b as string)) say("헷갈리는 짝", at, `${a} · ${b}`);
      if ("options" in item && options.length !== 4) say("보기 수", at, `${options.length}개(4개)`);
      if ("passage" in item) {
        passages.add(item.passage);
        const [lo, hi] = PASSAGE[L] ?? [0, 999];
        const count = L === 1 ? splitSentences(item.passage).length : words(item.passage);
        if (count < lo || count > hi) say("지문 길이", at, `${count}${L === 1 ? "문장" : "낱말"}(${lo}~${hi})`);
        const own3 = [...wordIdsIn(item.passage, lexicon)].filter((id) => levelOf.get(id)?.level === L && !levelOf.get(id)?.pos.includes("function"));
        if (L >= 2 && own3.length < 3) say("그 단계 낱말", at, `지문의 단계 ${L} 내용어 ${own3.length}개(3개 이상)`);
      }
      if (item.type === "repeat") {
        const [lo, hi] = REPEAT[L] ?? [0, 99];
        const c = words(item.sentence);
        if (c < lo || c > hi) say("따라 말할 문장 길이", at, `${c}낱말(${lo}~${hi})`);
        if (tokenize(item.sentence).some((t) => NAMES.includes(t.text))) say("말할 글의 이름", at, item.sentence);
      }
      if (item.type === "listening") {
        const [lo, hi] = SCRIPT[L] ?? [0, 999];
        const c = words(item.script);
        if (c < lo || c > hi) say("듣기 대본 길이", at, `${c}낱말(${lo}~${hi})`);
        if (item.kind === "text" && !item.prompt) say("듣기 질문", at, "prompt 가 없다");
        if (item.kind === "picture") {
          const rime = (w: string) => w.replace(/^[^aeiou]+/, "");
          const seen = new Map<string, string>();
          for (const o of options) {
            const r = rime(o);
            if (r.length >= 2 && seen.has(r)) say("운이 같은 보기", at, `${seen.get(r)} · ${o}`);
            seen.set(r, o);
          }
        }
      }
      if (item.type === "fill-blank") {
        const blanks = item.prompt.match(/_{3,}/g) ?? [];
        if (blanks.length !== 1) say("빈칸", at, `빈칸 ${blanks.length}개(1개)`);
        if (!/\(\s*[A-Za-z' -]+\s*\)/.test(item.prompt)) say("빈칸", at, "괄호 속 바탕 낱말이 없다(제안 꼴)");
      }
      if (item.type === "fix-sentence") {
        if (item.accepted.some((a) => normalizeSentence(a) === normalizeSentence(item.prompt))) say("고칠 문장", at, "허용 답에 고치기 전 문장이 있다");
        if (!item.accepted.some((a) => /[.!?]$/.test(a.trim()))) say("고칠 문장", at, "끝 문장 부호가 있는 허용 답이 없다");
      }
      if (item.type === "assemble-sentence" || item.type === "assemble-phrase") {
        for (const c of item.cards) if (c !== c.toLowerCase()) say("카드 대문자", at, c);
      }
      if (item.type === "copy-tiles" || item.type === "fill-letters" || item.type === "build-tiles") {
        if (item.tiles.some((t) => [...t].length !== 1 || t !== t.toLowerCase())) say("타일", at, "한 글자 소문자가 아닌 타일");
      }
    }
  }
  if (levelHasName) nLevels++;
  if (levelHasMomo) mLevels++;
  if (area === "reading" && passages.size > 1) say("지문", `단계 ${L}`, `본 문항 지문이 ${passages.size}가지(하나를 함께 쓴다)`);
  console.log(`단계 ${L}: 본 ${items.length} · 예비 ${spares.length} · 단계 ${L} 내용어 ${levelWords.size}개`);
}
for (let l = 1; l <= 12; l++) if (!seenLevels.has(l)) say("단계", `단계 ${l}`, "없다");
const total = file.levels.reduce((s, e) => s + e.items.length + e.spares.length, 0);
const limitN = Math.floor(total / 4);
const limitM = Math.max(Math.floor(total / 8), Math.floor(n / 2));
if (area === "reading") {
  console.log(`이름이 나온 단계 ${nLevels} · Momo · Tori 가 나온 단계 ${mLevels}(≤ 3)`);
  if (mLevels > 3) say("인물", "파일", `Momo · Tori 가 나온 단계 ${mLevels}(≤ 3)`);
} else {
  console.log(`이름 문항 ${n}(≤ ${limitN}) · Momo · Tori 문항 ${m}(≤ ${limitM})`);
  if (n > limitN || m > limitM) say("인물", "파일", `이름 문항 ${n} · Momo · Tori ${m}`);
}
console.log(`정답 자리 1~4 = ${places.slice(1).join(" · ")}`);
for (const p of problems) console.log(p);
console.log(`문제 ${problems.length}`);
EOF
```

**검증 명령**(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas writing --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="placement/writing.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(이 파일의 칸 36 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수)를 그대로 적어 둔다. 칸은 문항 하나(`placement:writing:<단계>:1:<번호>:main`)다.
- 오류가 있으면 그 문항만 고치고 다시 검증한다. 고침은 2회(`seed.max_retries`)까지다. 그래도 남으면 멈추고 보고한다.
- summary 의 `referenceErrors` 가 0 이 아니면 규격 파일 문제라 이 묶음의 일이 아니다. 고치지 않고 보고한다.
- `unchecked` · `empty` 는 이 단계의 일이 아니다.
- 검증기가 잡지 못해 스스로 지킬 것: 어휘 범위 · 그 단계 낱말 · 갈래 차례 · 빈칸 꼴 · 카드 대문자(스스로 확인 명령), 덤 글자로 생기는 사전 낱말 · 고치는 길이 하나인지 · 허용 정답이 빠짐없는지(눈으로 본다).

## 15. 근거 한 줄

쓰기 배치는 3.3 쓰기 단계표를 앱이 채점하는 문항으로만 옮긴 것이다(3.2). 1~3단계는 수업과 같은 고르기 · 베끼기 · 채우기 · 받아쓰기 · 조립([4영02-02] · [4영02-03] · [4영02-05]), 4단계부터는 그 단계 쓰기 학습 요소(3.6 쓰기 열)를 빈칸 채우기 · 문장 고치기로 잰다([6영02-08] 이후 예시문을 참고해 쓰는 단계의 문법 정확성 — 작문 자체는 AI 채점이라 배치에 두지 않는다).

## 16. 보고 꼴

마지막 답장(파일로 쓰지 않는다)에 이 차례로 쓴다.

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값> · briefHash: <앞 8자> · agentHash: <앞 8자> · createdOn: <호출 값>
파일: <뿌리>/placement/writing.json · 단계 12 · 문항 <n> · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
스스로 확인: 처음 '문제 <n>'(규칙별 <…>) · 마지막 '문제 <n>'
첫 검증: 칸 <n> · 오류 칸 <n> · 규칙별 <rule n, …> · 경고 <n>
고침: <회차마다 고친 칸 · 남은 오류>
단계마다(4~12): 잰 요소 <단계: 요소 셋, …>
인물: 이름 문항 <n> · Momo · Tori 문항 <n> · 쓴 이름 <…>
스스로 확인 목록: 14절 1~8 각각 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …(특히 7~12단계 — 그 단계 수업이 아직 없어 난이도를 견줄 수업이 없다)
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 1 | 배치 파일에 생성 정보를 쓰지 않고 보고에 적음 | 배치 문항 규격에 `generation` 칸이 없다 |
| 2 · 14 | 스스로 확인 명령으로 고친 것은 고침 회차에 넣지 않음 | 첫 검증 결과가 통과율의 기준이다 |
| 5 | 1단계 차례 고르기 · 채우기 · 베끼기 | 처음 두 문항으로 못 넘음이 정해지면 알파벳 · 소리 단원으로 간다. 글자와 소리를 아는지 바로 보는 두 갈래를 앞에 둔다 |
| 5 | 4~12단계 빈칸 2 · 고치기 1(차례 빈칸 · 고치기 · 빈칸) | testMix 비율과 3.2 문구. 처음 두 문항에 두 갈래가 다 들어간다 |
| 5 | 문항마다 단계 L 내용어 하나 이상 · 4단계부터 요소 하나 | 단계 L 과 L − 1 을 가르는 것이 그 단계 낱말 · 요소다 |
| 6 | 글 꼴 요소는 고르지 않음 | 문장 하나로 잴 수 없다 |
| 11 | 2 · 3단계 갈래 꼴(받아쓰기 낱말 하나 · 타일 덤 1~2 · 어구 카드 2~3 · 조립 카드 3~5 + 문장 부호) | 2 · 3단계 수업 브리프가 아직 없다. 3.3 쓰기 표 · `writing-1.md` · 검증기 규칙에서 정했다. 2 · 3단계 수업 브리프가 이 꼴과 맞춰야 한다(보고) |
| 11 | 빈칸 뒤 괄호 바탕 낱말 | 친 답은 허용 정답과 글자 그대로 견준다. 바탕 낱말이 없으면 맞는 답이 여럿이 되어(뜻이 맞는 다른 낱말) 아이가 맞고도 틀리고 풀이 검사가 사람 확인으로 보낸다 |
| 11 | 고치기 허용 정답에 끝 문장 부호 뺀 꼴 | 문장 답은 문장 부호까지 같아야 맞다(C73). 고칠 곳(그 단계 요소)만 재고, 마침표를 잊은 아이를 그 단계에서 떨어뜨리지 않는다. 첫 글자 대문자는 그대로 요구한다 |
| 11 | 고치기 문장 5~10낱말 | 아이가 문장 전체를 다시 친다. 단계 상한(최대 22)까지 쓰면 오타로 틀린다 |
| 10 | 조립 카드에 이름 · I 를 넣지 않음 | 검증기가 대문자 카드를 모두 막는다(C84 대로 고치는 일은 쓰기 3 수업 전, README 7절) |
| 10 | 인물 셈 n ≤ 9 · m ≤ max(4, ⌊n/2⌋) | C126 셈을 36문항에 옮김 |
| 13 | 무서운 장면 · 상표 · 실제 인물 · 종교 · 정치 금지 | 금지어 목록 밖의 내용 기준이 정본에 없다 |
