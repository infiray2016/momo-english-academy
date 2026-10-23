# 생성 브리프 — 읽기 배치 평가 가 벌(`placement-reading`)

이 파일은 읽기 배치 평가 가 벌 묶음의 프롬프트 판이다(정본 6.3 — 배치 평가 묶음은 영역마다 하나, 순서 (3)). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 1~12단계 × 3문항 = 36문항을 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 숫자와 규칙은 저장소 파일에서 옮겼다. 정본에 없는 값은 '(제안)'으로 적었고 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 이 묶음을 처음부터 다시 만든다.

**배치 평가는 아이가 읽기를 처음 열 때 시작 단계를 정하는 문항이다.** 단계마다 세 문항이 '이 단계를 읽을 수 있는 아이는 맞히고, 한 단계 아래 아이는 대개 못 맞히는' 꼴이어야 한다. 그래서 단계 L 문항은 단계 L 의 글 길이 · 낱말 · 학습 요소 · 문항 유형을 담고, 단계 L 위의 것은 쓰지 않는다.

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 영역 · 단계 | `reading` · 1~12 · 배치 평가 가 벌(`form` 1, C54 (3)) |
| 틀 | `seed/prompts/_template.md`(절 번호 그대로, 배치에 없는 칸은 그 절에 적음) |
| 만든 날 · 만든 이 | 2026-10-23 첫 판 · 학습 설계자(cur-p08 평가) |
| 옮긴 곳 | `seed/level-specs.json`(reading 1~12) · `settings.json`(placement.*) · `unit-specs.json`(읽기 단원 주제 · 학습 요소) · `vocab.json`(1~12단계) · `images.json` · `lists/forms.json`(읽기 · 말하기 · 회화 차례) · `lists/forbidden.json` · `lists/meta-sentences.json` · `src/core/seed/schema/assessment.ts` · `check-assessment.ts` checkPlacementFile · `solve-check.ts` · `src/core/placement/adaptive.ts` · `reading-1.md` 9절(1단계 그림 표) · 정본 3.1 · 3.2 배치 · 3.3 읽기 · 3.4 · 3.6 · 6.3 배치 평가 행 · 6.4 · 13절 C54 · C66 · C71 · C124 · C126 |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 뿌리 폴더 | `seed` 또는 표본 폴더 | 쓸 파일 `<뿌리>/placement/reading.json` |
| briefHash · agentHash · effort · createdOn | 64자 · 64자 · `high` · `2026-10-23` | 보고에만 적는다(아래) |
| revision · correction | `2` · `0` | 모든 문항 |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

- 쓰는 파일은 **수업 파일이 아니라 이 배치 파일 하나**다. 생성 정의의 '브리프가 정한 파일 하나'가 이 파일이다.
- 배치 문항 규격에는 `generation` · 연결 단원 · 해설 칸이 없다(넣으면 거부된다). 모델 ID · effort · 해시 · 날짜는 보고(16절)에 적는다.

## 2. 할 일 한눈에

1. 5절 표에서 단계마다 글 종류 · 지문 길이 · 문항 유형 셋을 확인하고, 6절에서 그 단계 단원 주제 하나를 고른다(단계마다 다른 주제).
2. 1단계부터 12단계까지 차례로, 단계마다 **지문 하나**를 쓰고 그 지문으로 문항 세 개를 만든다(세 문항의 `passage` 는 같은 글을 그대로 둔다).
3. 파일 하나 `{ "area": "reading", "form": 1, "levels": [ { "level": 1, "items": [3개], "spares": [] }, … 12단계까지 ] }` 에 넣는다. 읽기에는 예비 문항이 없어 `spares` 는 빈 목록이다.
4. 14절 스스로 확인 명령 → 고침(회차로 세지 않는다) → 검증 명령(첫 검증) → 오류 문항만 고침(2회까지) → 16절 보고.

## 3. 배치 평가 규칙(정본 3.2 · C71 — 앱이 하는 일)

| 차례 | 규칙 |
|---|---|
| 시작 | 3단계(placement.start_level) 문항 3개(placement.items_per_level)를 낸다 |
| 오르기 | 3개를 다 맞히면 두 단계, 2개를 맞히면 한 단계 올린다. 두 단계를 뛰어 올라간 뒤 못 넘으면 건너뛴 단계를 본다 |
| 내리기 | 1개 이하를 맞히면 그 단계를 '못 넘음'으로 두고, 아직 넘은 단계가 없으면 한 단계 내린다. **처음 두 문항을 모두 틀리거나 '몰라요'로 넘기면 셋째 문항 없이** 못 넘음이다 |
| 몰라요 | 문항마다 '몰라요' 단추가 있고 틀림으로 센다 |
| 끝 | 넘은 단계 바로 위에서 못 넘거나, 1단계에서 못 넘거나, 15문항(placement.items_per_area)을 다 쓰면 끝난다 |
| 판정 | 넘은 단계 가운데 가장 높은 단계보다 한 단계 낮게 시작한다(최소 1). 1단계도 못 넘으면 1단계에서 시작하고 알파벳 · 소리 단원으로 바꾼다(3.1). 시작 단계는 seed.complete_through_level 을 넘지 않는다 |
| 이어 보기 | 멈춰도 다음에 멈춘 문항부터 이어 본다. 결과 화면은 시작 단계만 보인다(1차) |

문항이 지킬 것:

- 문항은 단계 차례 1 · 2 · 3 으로 나온다. **1 · 2번이 그 단계를 가르는 핵심 문항**이다(둘 다 틀리면 3번 없이 끝난다). 그래서 1 · 2번에 그 단계에서 처음 나오는 유형 · 학습 요소를 담는다(5절 차례 표).
- 앱이 채점하는 유형만 둔다(3.2). 읽기는 보기 4개 가운데 정답 번호와 견준다(AI 없음).
- 1단계 문항은 읽기 1단계(그림과 짝지은 단어 · 문장)를 넘는지 본다. 1단계를 못 넘으면 알파벳 · 소리 단원으로 가므로, 1단계 문항은 알파벳과 기본 소리를 아는 아이가 1단계 낱말을 읽어 맞힐 수 있는 꼴이다.
- 목표 시간은 영역마다 10분(placement.target_minutes, 잠정)이다. 한 아이는 많아야 다섯 단계(15문항)를 본다. 그래서 (제안) 지문은 단계 규격 글 길이의 아래쪽(5절 표)으로 쓰고, 한 단계의 세 문항이 지문 하나를 함께 쓴다.

## 4. 설정(`settings` · 구조 수)

| 값 | 뜻 |
|---|---|
| `placement.items_per_level` 3 | 단계마다 문항 수(번호 1~3) |
| `placement.start_level` 3 · `placement.items_per_area` 15 · `placement.target_minutes` 10 | 3절 |
| 벌 `form` | 1(가 벌). 둘째 벌(나)은 2차 |
| 보기 수 | 4(구조 수 READING_OPTIONS, 규격이 4개만 받는다) |
| `seed.complete_through_level` 6 | 첫 운영 배포 범위. 7~12단계 문항도 지금 만든다(6.3 첫 운영 배포 범위 '배치 평가 가 벌 전부') — 7단계 이상을 넘은 아이도 6단계에서 시작하지만, 넘은 단계를 가리는 데 쓴다 |
| `seed.max_retries` 2 | 검증 뒤 고침 회차 상한 |

## 5. 단계마다 문항 차례 표

| 단계 | CEFR | 번호 1 · 2 · 3 유형 | 글 종류(3.3) | 지문(제안) | 문장 길이 상한 | 그 단계에서 처음 나오는 것(학습 요소, 6 · 8절) |
|---|---|---|---|---|---|---|
| 1 | Pre-A1 | picture · picture · picture | 그림과 짝지은 단어 · 문장 | 2~3문장(문장마다 5낱말 이하) | 5 | a · an + 명사 / This is ~ / 색 · 크기 + 명사 / I like ~ / 수 + 복수 -s |
| 2 | Pre-A1 | fact · fact · picture | 단어 그림이 붙은 짧은 글 | 20~28낱말 · 3~5문장 | 6 | I am · You are / He · She · It is / have / can / Is it ~? · Do you ~? |
| 3 | Pre-A1 | fact · fact · fact | 일상 이야기 | 35~45낱말 | 7 | 일반동사 현재(I · you · we · they) / There is · are / 위치 전치사 / 명령문 · Let's / What · Where · Who 의문문 |
| 4 | A1 | fact · fact · fact | 일상 이야기, 짧은 안내문 | 55~65낱말 | 8 | 3인칭 단수 -s / do · does 의문문 · 부정문 / 현재진행 / 소유격 / 시각 · 요일(at · on) |
| 5 | A1 | sequence · fact · fact | 이야기, 짧은 편지 | 80~90낱말 | 9 | 빈도부사 / want to · would like / and · but · or / How many · How much / 목적격 대명사 |
| 6 | A1 | main-idea · sequence · fact | 이야기, 편지, 안내문 | 100~110낱말 | 10 | was · were / 규칙 과거 -ed / because / When 의문문 / some · any |
| 7 | A2 | inference · main-idea · fact | 이야기, 편지, 설명문 | 120~130낱말 | 12 | 불규칙 과거 / did 의문문 · 부정문 / be going to / will / 비교급 · 최상급 |
| 8 | A2 | vocab-in-context · inference · main-idea | 이야기, 설명문, 일기 | 150~160낱말 | 13 | 과거진행 / when 절 / 부사 -ly / must · have to / should |
| 9 | A2 | topic · vocab-in-context · inference | 설명문, 기사 | 180~190낱말 | 15 | 동명사 / to 부정사 / 현재완료(경험) / if 조건문 / so · after · before 로 잇기 |
| 10 | B1 | gist · inference · vocab-in-context | 설명문, 기사, 짧은 에세이 | 200~210낱말 | 18 | 관계대명사 who · which · that / 현재완료(계속 · 완료) / 수동태 / 간접 의문문 / however · also |
| 11 | B1 | purpose · topic · inference | 기사, 에세이, 의견 글 | 230~240낱말 | 20 | 관계부사 where · when / 가정법 과거 / 분사 수식 / as ~ as · 비교 표현 / although |
| 12 | B1 | structure · purpose · gist | 에세이, 의견 글, 비교 글 | 260~270낱말 | 22 | 의견 표현 / so that · in order to / used to / 조동사 수동태 / 문단 연결 |

- 유형은 그 단계 수업 문제 유형(level-specs `questions.mix`) 가운데서 골랐다. 번호 1 은 그 단계에서 새로 나오는 유형이다.
- 지문 낱말 수는 낱말 · 수 토큰을 센다(문장 부호는 세지 않고, 축약형 · 하이픈 낱말은 한 낱말).
- 단계 L 지문에는 (제안) 단계 L 내용어를 3개 이상, 단계 L 학습 요소(위 표 마지막 칸)를 하나 이상 담고, 정답을 고르는 데 필요한 문장에 단계 L 낱말이나 요소가 들어가게 한다. 단계 L 위의 낱말 · 형태는 쓰지 않는다.

## 6. 단계마다 단원 주제 · 학습 요소(`unit-specs` reading)

지문 주제는 그 단계 단원 주제 하나에서 고른다(제안 — 그 단계 아이가 만날 글과 같은 결). 학습 요소는 5절 표와 같다.

| 단계 | 단원 1 | 단원 2 | 단원 3 | 단원 4 | 단원 5 |
|---|---|---|---|---|---|
| 1 | 간식과 장난감 — a · an + 명사 | 동물과 탈것 — This is ~ | 알록달록 색깔 — 색 · 크기 + 명사 | 좋아하는 물건 — I like ~ | 하나 둘 세기 — 수 + 복수 -s |
| 2 | 오늘 내 기분 — I am · You are | 우리 가족 — He · She · It is | 내 반려동물 — have | 나는 할 수 있어 — can | 이게 뭘까 퀴즈 — Is it ~? · Do you ~? |
| 3 | 나의 하루 — 일반동사 현재(I · you · we · they) | 우리 동네와 자연 — There is · There are | 내 방 어디에 — 위치 전치사 | 교실 약속 — 명령문 · Let's | 누가 어디에 — What · Where · Who 의문문 |
| 4 | 형의 아침 — 3인칭 단수 -s | 안 먹는 음식 — do · does 의문문 · 부정문 | 지금 뭐 해요 — 현재진행 | 누구의 물건 — 소유격(my · your · 's) | 우리 반 시간표 — 시각 · 요일(at · on) |
| 5 | 나의 습관 — 빈도부사 | 하고 싶은 일 — want to · would like | 두 친구 비교 — and · but · or | 시장 놀이 — How many · How much | 도와준 친구 — 목적격 대명사 |
| 6 | 어제의 날씨 — was · were | 지난 주말 — 규칙 동사 과거 -ed | 그래서 좋아해 — because | 언제 생일이야 — When 의문문 | 냉장고 속 음식 — some · any |
| 7 | 현장 체험 학습 — 불규칙 동사 과거 | 잃어버린 물건 — did 의문문 · 부정문 | 방학 계획 — be going to | 미래의 나 — will | 세계에서 가장 큰 — 비교급 · 최상급 |
| 8 | 정전된 밤 — 과거진행 | 내가 어렸을 때 — when 절 | 살금살금 고양이 — 부사 -ly | 도서관 규칙 — must · have to | 건강한 습관 — should |
| 9 | 취미 생활 — 동명사 | 꿈을 이루려면 — to 부정사(명사 · 목적) | 가 본 곳 — 현재완료(경험) | 비가 오면 — if 조건문(현재) | 요리하는 순서 — so · after · before |
| 10 | 존경하는 사람 — 관계대명사 who · which · that | 오래 해 온 일 — 현재완료(계속 · 완료) | 발명품 이야기 — 수동태(현재 · 과거) | 궁금한 것들 — 간접 의문문 | 도시와 시골 — however · also |
| 11 | 내가 태어난 곳 — 관계부사 where · when | 하늘을 난다면 — 가정법 과거(If I were ~) | 웃는 아이들 — 분사 수식 | 두 나라의 음식 — as ~ as · 비교 표현 | 힘들었지만 — although |
| 12 | 학교에 휴대폰을 가져와도 될까 — 의견 표현(In my opinion · I believe that) | 목표를 위한 노력 — so that · in order to | 예전의 우리 마을 — used to | 지켜야 할 규칙 — 조동사 수동태 | 나의 성장 이야기 — 문단 연결(first of all · in conclusion) |

## 7. 단계 어휘 범위(vocab 1~12단계)

단계 L 문항(지문 · prompt · 보기)의 낱말은 단계 1~L 의 낱말(활용형 포함)과 10절 인물 이름만 쓴다. 검증기는 배치 지문의 범위 밖 비율을 세지 않지만(6.4) 3.4 단계 어휘 범위의 뜻이므로 범위 밖 낱말을 0 으로 둔다(14절 명령이 문항마다 센다). 아래 목록 밖의 흔한 낱말(different · best · later · mostly 같은 낱말)도 vocab 에 없으면 쓰지 않는다. 활용형은 vocab 에 적힌 것만 범위 안이다(14절 명령이 판정한다).

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

## 8. 학습 요소 범위와 문장 꼴(정본 3.6 · C54 ㅅ)

배치 단계 L 문항의 범위는 단계 L 까지 전부다(C54 ㅅ — 평가 · 배치는 그 단계까지, 같은 단계 뒤 단원 요소도 쓸 수 있다). 검증기가 아래 형태 표(읽기 차례)로 단계 L 위의 형태를 오류로 잡는다(`learning-elements`). 1단계 요소는 검출기가 없어 스스로 지킨다(5절 표).

| 들어오는 단계 · 단원 | 형태 id | 꼴 | 검출 낱말 |
|---|---|---|---|
| 2 · 2 | `he-she` | He · She | he, she, he's, she's, he'll, she'll, he'd, she'd |
| 2 · 3 | `have` | have(가지다) 문장 | has, i've, you've, we've, they've |
| 2 · 4 | `can` | can 문장 | 글 꼴로 잡는다 |
| 2 · 4 | `can-not` | can't · cannot | can't, cannot, can not |
| 3 · 1 | `we-they` | we · they | 낱말 10개(예: we, they, we're) |
| 3 · 2 | `there-is` | There is ~ | there is, there's |
| 3 · 2 | `there-are` | There are ~ | there are |
| 3 · 4 | `lets` | Let's ~ | let us |
| 4 · 1 | `third-person-s` | 3인칭 단수 -s | 낱말 352개(예: accepts, accuses, achieves) |
| 4 · 2 | `dont` | don't · do not 부정문 | 글 꼴로 잡는다 |
| 4 · 2 | `does` | does · doesn't 의문문 · 부정문 | does, doesn't, does not |
| 4 · 3 | `present-progressive` | 현재진행 | 글 꼴로 잡는다 |
| 4 · 4 | `be-not` | be 동사 부정문(isn't · aren't) | 글 꼴로 잡는다 |
| 4 · 5 | `time-at` | 시각 · 요일(at · on) | 글 꼴로 잡는다 |
| 5 · 1 | `frequency-adverbs` | 빈도부사 | always, usually, often, sometimes, never |
| 5 · 2 | `want-to` | want to | 글 꼴로 잡는다 |
| 5 · 2 | `would-like` | would like | 글 꼴로 잡는다 |
| 5 · 3 | `but` | but 으로 잇기 | but |
| 5 · 4 | `how-much` | How much | how much |
| 5 · 5 | `object-pronouns` | 목적격 대명사 him · us · them | him, us, them |
| 6 · 1 | `past-be` | was · were | was, were, wasn't, weren't |
| 6 · 2 | `past-regular` | 규칙 동사 과거 -ed | 낱말 457개(예: accepted, accessed, accused) |
| 6 · 3 | `because` | because | because |
| 6 · 4 | `when-question` | When 의문문 | 글 꼴로 잡는다 |
| 6 · 5 | `some-any` | some · any | any |
| 7 · 1 | `past-irregular` | 불규칙 동사 과거 | 낱말 74개(예: ate, became, began) |
| 7 · 2 | `did` | did 의문문 · 부정문 | did, didn't, did not |
| 7 · 3 | `going-to` | be going to | 글 꼴로 잡는다 |
| 7 · 4 | `will` | will | will, won't |
| 7 · 5 | `comparative` | 비교급 | 낱말 107개(예: angrier, bigger, braver) |
| 7 · 5 | `superlative` | 최상급 | 낱말 110개(예: angriest, biggest, bravest) |
| 8 · 1 | `past-progressive` | 과거진행 | 글 꼴로 잡는다 |
| 8 · 2 | `when-clause` | when 절 | 글 꼴로 잡는다 |
| 8 · 3 | `adverb-ly` | 부사 -ly | 낱말 10개(예: carefully, easily, especially) |
| 8 · 4 | `must` | must | must, mustn't |
| 8 · 4 | `have-to` | have to | 글 꼴로 잡는다 |
| 8 · 5 | `should` | should | should, shouldn't |
| 9 · 1 | `gerund` | 동명사 | 글 꼴로 잡는다 |
| 9 · 2 | `to-infinitive` | to 부정사 | 글 꼴로 잡는다 |
| 9 · 3 | `present-perfect` | 현재완료 | 글 꼴로 잡는다 |
| 9 · 4 | `if` | if 조건문 | if |
| 9 · 5 | `conj-so-after-before` | so · after · before 로 잇기 | 글 꼴로 잡는다 |
| 10 · 1 | `relative-who-which` | 관계대명사 who · which | 글 꼴로 잡는다 |
| 10 · 3 | `passive` | 수동태 | 글 꼴로 잡는다 |
| 10 · 4 | `indirect-question` | 간접 의문문 | 글 꼴로 잡는다 |
| 10 · 5 | `however` | however · also | however |
| 11 · 1 | `relative-adverb` | 관계부사 where · when | 글 꼴로 잡는다 |
| 11 · 1 | `contrast-connector` | while · on the other hand | on the other hand |
| 11 · 2 | `second-conditional` | 가정법 과거 | 글 꼴로 잡는다 |
| 11 · 4 | `as-as` | as ~ as | 글 꼴로 잡는다 |
| 11 · 5 | `although` | although · though | although, though |
| 11 · 5 | `for-example` | for example | for example, for instance |
| 12 · 1 | `opinion-phrase` | In my opinion · I believe that | in my opinion |
| 12 · 1 | `cause-effect` | because of · as a result | because of, as a result |
| 12 · 2 | `so-that` | so that · in order to | so that, in order to |
| 12 · 3 | `used-to` | used to | 글 꼴로 잡는다 |
| 12 · 4 | `modal-passive` | 조동사 수동태 | 글 꼴로 잡는다 |
| 12 · 5 | `paragraph-connector` | 문단 연결 | first of all, in conclusion, to sum up |

검출기에 대해 알아 둘 것(2026-10-23 실제 검출기로 대조):

- `would` 뒤에 `like` 가 바로 오지 않으면 가정법 과거(11단계)로 잡힌다: `What would Dan like?` 는 걸리고 `What would you like?` 는 걸리지 않는다. 5~10단계에서 would like 를 쓰면 `would you like` · `I would like` · `'d like` 꼴로 쓴다.
- 3인칭 단수 -s 는 he · she · it 뒤의 동사를 잡는다. 이름 뒤 동사(`Ben likes`)는 잡지 않지만 4단계 요소이니 1~3단계에 쓰지 않는다.
- What · Where · Who 의문문은 검출기가 없다. 3단계 단원 5 요소라 1 · 2단계 문항에 쓰지 않는다(2단계 사실 확인은 빈칸 문장으로 묻는다 — 11절).
- 1 · 2단계에는 문장을 잇는 and · or(5단계), 명령문(3단계), 3인칭 -s(4단계)를 쓰지 않는다. 검출기가 못 잡는 꼴도 3.6 표를 따른다.

## 9. 그림 규칙(1 · 2단계 그림 문항)

- 그림 문항(`picture`)의 보기는 그림이 있는 낱말 id 로만 낸다(검증기 `image`, C126). 1단계 문항은 1단계 그림 낱말, 2단계 문항은 1 · 2단계 그림 낱말을 쓴다. 3단계 위의 낱말에는 그림이 없다.
- 헷갈리는 짝은 같은 문항 보기에 함께 두지 않는다: ant · insect, hat · cap, cup · milk, face · smile, face · neck, leg · knee, foot · toe, hand · finger, arm · strong, face · head, bird · fly, cup · water, jacket · coat, pants · jeans, girl · doll, head · hair, tired · sleepy, student · boy, student · girl, kick · soccer. (제안) rose · flower, bird · chicken · duck, happy · smile, sheep · goat, man · grandfather, woman · grandmother, 그리고 얼굴 그림(happy · sad · angry · sick · tired · sleepy · hungry · thirsty · smile · face)은 한 문항에 하나만.
- prompt 가 가리키는 그림의 색 · 모습과 글을 맞춘다. 1단계 표의 '그림 · 맞출 것' 칸에 색이 없으면 색을 붙이지 않고, 2단계 그림은 vocab 예문에 적힌 색만 쓴다. 수 낱말의 그림은 숫자 키캡, 색 낱말의 그림은 색 동그라미다. 관사 · 수: milk · juice · rice · sand · jam · cake · pizza · cheese 는 관사 없이, sun 은 `the sun`, grape 는 `grapes`(C126 (2)).
- 정답이 둘 이상 맞을 수 있는 보기를 두지 않는다.

1단계 그림 낱말 128개(`reading-1.md` 9절 표):

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
| apple | 빨간 사과(RED APPLE) |
| egg | 달걀 |
| banana | 바나나 |
| milk | 컵에 든 우유(GLASS OF MILK) |
| cake | 조각 케이크(SHORTCAKE) |
| candy | 사탕 |
| cookie | 쿠키 |
| cheese | 노란 치즈 조각(CHEESE WEDGE, 예문 The cheese is yellow.) |
| grape | 보라 포도 — 색을 말하지 않는다(purple 은 범위 밖) |
| pizza | 피자 한 조각 |
| jam | 빨간 잼이 든 뚜껑 덮인 유리병 |
| rice | 밥(COOKED RICE) |
| hat | 밀짚모자 — 색을 말하지 않는다 |
| cap | 파란 야구 모자(예문 My cap is blue.) |
| sock | 파란 양말(노란 줄) |
| shoe | 빨간 운동화(예문 I like the red shoes.) |
| shirt | 파란 티셔츠 |
| jacket | 파란 외투 그림(🧥 COAT, 예문 My jacket is blue.) |
| ball | 빨강 · 파랑 · 노랑 띠의 고무공 — 한 색으로 말하지 않는다 |
| doll | 헝겊 인형 |
| bike | 빨간 자전거 |
| kite | 파란 연 |
| ring | 반지 |
| cat | 고양이 |
| dog | 개 |
| pig | 돼지 |
| duck | 청둥오리(초록 머리 · 갈색 몸) — 색을 말하지 않는다 |
| fish | 물고기 |
| bird | 빨간 새 |
| rabbit | 회색 토끼 — 색을 말하지 않는다(흰 토끼 아님) |
| frog | 개구리 얼굴(FROG FACE) |
| sheep | 양 |
| fox | 주황 여우 얼굴(FOX FACE, 예문 The fox is orange.) |
| chicken | 살아 있는 닭(닭고기 아님) |
| snake | 초록 뱀(예문 The snake is green.) |
| bus | 회색 · 파랑 버스 — 색을 말하지 않는다 |
| car | 자동차(AUTOMOBILE) |
| ship | 배 |
| truck | 배달 트럭 |
| plane | 흰 비행기(예문 The plane is white.) |
| bed | 침대 |
| bath | 욕조(BATHTUB) |
| dish | 음식 없는 둥근 흰 접시 |
| tent | 텐트 |
| shop | 줄무늬 차양 · 진열창이 있는 작은 가게 |
| bank | 은행 건물 |
| red | 빨간 동그라미(색 뜻) |
| blue | 파란 동그라미(색 뜻) |
| yellow | 노란 동그라미(색 뜻) |
| green | 초록 동그라미(색 뜻) |
| black | 검은 동그라미(색 뜻) |
| white | 흰 동그라미(색 뜻, 자체 그림) |
| pink | 분홍 동그라미(색 뜻) |
| orange | 주황 동그라미(색 뜻, 과일 아님) |
| sun | 빛살 있는 해 |
| tree | 잎 넓은 나무 |
| flower | 흰 꽃잎 꽃 |
| rock | 바위 |
| lake | 풀 · 나무로 둘러싸인 파란 호수 |
| sand | 연노랑 모래 더미 |
| rose | 빨간 장미(예문 The rose is red.) |
| shell | 회백 소라 껍데기 — 색을 말하지 않는다 |
| king | 왕관 · 수염 · 빨간 망토의 동화 속 왕 윗몸 |
| swing | 빨간 자리의 빈 그네 |
| wing | 회백 날개 — 색을 말하지 않는다 |
| bag | 책가방(SCHOOL SATCHEL) |
| pen | 검은 볼펜(예문 It is a black pen.) |
| pencil | 연필 |
| book | 펼친 책 |
| cup | 손잡이 달린 빈 머그컵 |
| map | 세계 지도 |
| desk | 서랍 달린 학생 책상(위에 아무것도 없음) |
| chair | 갈색 나무 의자 — 색을 말하지 않는다(brown 은 1단계 밖) |
| drum | 북과 북채 |
| clock | 자명종 시계 |
| lamp | 불이 켜진 책상 스탠드 등 |
| bell | 종 |
| top | 빨간 나무 팽이(꼭대기 뜻 아님) |
| fan | 빨간 접는 부채(선풍기 아님) |
| pot | 뚜껑 덮인 빈 냄비(화분 아님) |
| brush | 붓(칫솔 · 빗 아님) |
| one | 숫자 키캡 1(물건 1개 그림 아님) |
| two | 숫자 키캡 2(물건 2개 그림 아님) |
| three | 숫자 키캡 3(물건 3개 그림 아님) |
| four | 숫자 키캡 4(물건 4개 그림 아님) |
| five | 숫자 키캡 5(물건 5개 그림 아님) |
| six | 숫자 키캡 6(물건 6개 그림 아님) |
| seven | 숫자 키캡 7(물건 7개 그림 아님) |
| eight | 숫자 키캡 8(물건 8개 그림 아님) |
| nine | 숫자 키캡 9(물건 9개 그림 아님) |
| ten | 숫자 키캡 10(물건 10개 그림 아님) |
| eye | 눈 하나 |
| ear | 사람 귀 |
| nose | 코 |
| mouth | 입술 |
| face | 앞을 보는 아이 얼굴, 다문 입의 무표정(빨갛지 않고 웃지 않음) |
| hand | 손바닥을 든 손(RAISED HAND) |
| leg | 사람 다리 |
| arm | 어깨에서 손끝까지 뻗은 팔 하나 |
| neck | 아이 윗몸에서 목을 빨간 점선 동그라미로 둘러쌈(얼굴이 보임) |
| tooth | 흰 이 하나(예문 My tooth is white.) |
| smile | 웃는 얼굴(SMILING FACE WITH SMILING EYES) |

2단계 그림 낱말 79개(그림 이름은 그림 묶음의 이름, '자체 그림'은 앱이 만든 그림):

| 낱말 | 그림(키 = 낱말) | vocab 예문(색 · 모습 참고) |
|---|---|---|
| angry | ANGRY FACE | Is your mom angry? |
| baby | BABY | The baby is cute. |
| badminton | BADMINTON RACQUET AND SHUTTLECOCK | I can play badminton. |
| baseball | BASEBALL | Do you like baseball? |
| basketball | BASKETBALL AND HOOP | My brother can play basketball. |
| boy | BOY | He is a tall boy. |
| catch | 자체 그림 | Can you catch the ball? |
| chocolate | CHOCOLATE BAR | Do you like chocolate? |
| climb | PERSON CLIMBING | Can you climb the rock? |
| coat | 자체 그림 | I need a coat. |
| computer | DESKTOP COMPUTER | I have a computer. |
| cook | ADULT COOKING | Can you cook? |
| corn | EAR OF MAIZE | The corn is yellow. |
| dance | MAN DANCING | He can dance. |
| doctor | ADULT STAFF OF AESCULAPIUS | He is a doctor. |
| dolphin | DOLPHIN | Dolphins can swim fast. |
| draw | 자체 그림 | I can draw. |
| dress | DRESS | The dress is blue. |
| family | FAMILY | This is my family. |
| farmer | ADULT EAR OF RICE | My uncle is a farmer. |
| finger | 자체 그림 | I have ten fingers. |
| fly | 자체 그림 | Birds can fly. |
| foot | FOOT | My feet are cold. |
| gift | WRAPPED PRESENT | This gift is for you. |
| giraffe | GIRAFFE FACE | The giraffe is tall. |
| girl | GIRL | She is a smart girl. |
| glasses | 자체 그림 | I need my glasses. |
| goat | GOAT | The goat is white. |
| grandfather | OLDER MAN | My grandfather is old. |
| grandmother | OLDER WOMAN | My grandmother is kind. |
| hair | 자체 그림 | My hair is long. |
| hamburger | HAMBURGER | I want a hamburger. |
| happy | GRINNING FACE | I am very happy. |
| head | 자체 그림 | Is your head okay? |
| house | HOUSE BUILDING | Your house is big. |
| hungry | 자체 그림 | I am hungry. |
| ice cream | ICE CREAM | I like ice cream. |
| jeans | JEANS | My jeans are blue. |
| jump | 자체 그림 | I can jump. |
| kick | 자체 그림 | I can kick the ball. |
| knee | 자체 그림 | This is my knee. |
| man | MAN | That man is a doctor. |
| pants | 자체 그림 | My pants are long. |
| penguin | PENGUIN | Penguins can swim. |
| phone | BLACK TELEPHONE | Is this your phone? |
| police | POLICE OFFICER | The police are here. |
| potato | POTATO | I like potatoes. |
| read | 자체 그림 | I can read a book. |
| ride | BICYCLIST | I can ride a bike. |
| run | RUNNER | Can you run fast? |
| sad | CRYING FACE | I am sad. |
| sandwich | SANDWICH | I have a sandwich. |
| scarf | SCARF | The scarf is red. |
| shoulder | 자체 그림 | Hands on your shoulders! |
| sick | FACE WITH THERMOMETER | I am sick. |
| sing | 자체 그림 | I can sing a song. |
| skate | 자체 그림 | I can skate. |
| ski | SKIER | My uncle can ski. |
| skirt | 자체 그림 | My skirt is blue. |
| sleepy | YAWNING FACE | The baby is sleepy. |
| soccer | SOCCER BALL | I like soccer. |
| strawberry | STRAWBERRY | Strawberries are red. |
| strong | FLEXED BICEPS | My dad is strong. |
| student | 자체 그림 | I am a student. |
| sweater | 자체 그림 | I have a new sweater. |
| swim | SWIMMER | I can swim. |
| table | 자체 그림 | The table is long. |
| teacher | ADULT SCHOOL | She is my teacher. |
| tennis | TENNIS RACQUET AND BALL | Tennis is fun. |
| thirsty | 자체 그림 | Are you thirsty? |
| throw | 자체 그림 | Can you throw it? |
| tired | TIRED FACE | My dad is tired. |
| toe | 자체 그림 | I have ten toes. |
| turtle | TURTLE | Is the turtle slow? |
| walk | PEDESTRIAN | I can walk. |
| water | 자체 그림 | I want water. |
| whale | SPOUTING WHALE | The whale is big. |
| woman | WOMAN | The woman is my aunt. |
| write | WRITING HAND | Can you write your name? |

## 10. 주제 · 인물

- 배치에는 주제 변형이 없다. 단계마다 다른 주제(6절)를 쓴다.
- 아이 이름 자리 `{NAME}` 은 쓰지 않는다. 실제 사람 이름도 쓰지 않는다.

### 인물(C124 · C126)

- 3단계부터의 이야기 · 편지 · 일기는 인물이 글의 뼈대라 이름을 써도 된다(C126 '인물이 뼈대인 단계는 그 브리프가 정한다'). 1 · 2단계는 이름이 문장 뜻에 들어갈 때만, 설명문 · 기사 · 에세이는 인물이 필요할 때만 쓴다.
- 이름은 아래 표의 것만 쓴다. 표 밖의 이름을 새로 만들지 않는다. 모모 · 토리만 되풀이하지 않는다.
- 회화 선생님 이름(Mina · Leo · Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi, C117 · C122)과 실제 사람 · 상표 · 작품 속 인물 이름은 쓰지 않는다. 이름을 부르는 말로 문장 앞뒤에 붙이지 않는다(편지의 `Dear Meg,` 인사는 편지 꼴이라 된다).

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

셀 수 있는 기준(제안, 단계 하나 = 지문 하나): Momo 나 Tori 가 나오는 단계는 **3단계 이하**(12단계 가운데), 이름을 쓰는 단계에서는 적어도 다섯 이름을 고루 쓴다. 이름을 쓰는 단계 수에는 상한을 두지 않는다(인물이 뼈대인 글). 14절 명령이 센다.

## 11. 문항 유형별 쓰는 법

모든 유형에 공통: 보기 넷은 꼴 · 길이가 비슷하고(가장 긴 보기가 늘 정답이지 않게), 하나만 글과 맞는다. 오답은 글에 나온 다른 낱말 · 그럴듯하지만 글과 다른 말로 쓴다. '모두 맞음' · '답 없음' · 부정 질문(`Which is NOT ~?`)은 쓰지 않는다. 정답이 글 밖 상식으로만 골라지지 않게 한다. 질문 · 보기도 그 단계 어휘 · 형태 범위 안이다. 파일 전체에서 정답 자리 1 · 2 · 3 · 4 를 고루(아홉 번 안팎씩) 둔다.

| 유형 | 묻는 것 | 질문 꼴(제안 — 어휘 단계를 확인한 꼴) | 보기 |
|---|---|---|---|
| `picture`(1 · 2단계) | 지문의 낱말 · 어구가 가리키는 그림 | `prompt` 는 지문에 나온 낱말 · 어구 · 문장(1단계 5낱말 · 2단계 6낱말 이하). 1단계 세 문항은 지문의 서로 다른 그림 낱말을 하나씩 가리킨다 | 그림 낱말 id 4개. 지문의 다른 그림 낱말을 오답에 넣는다 |
| `fact`(2~7단계) | 지문에 그대로 나온 사실(누가 · 무엇 · 어디 · 언제) | **2단계: 빈칸 문장** `Meg has a ___ bag.`(What · Who · Where 는 3단계 요소). 3단계: `Who ~?` · `What ~?` · `Where ~?`(일반동사는 I · you · we · they 꼴). 4단계부터 `What does ~?` · `What time ~?`. 6단계부터 `When ~?` | 짧은 어구 4개 |
| `sequence`(5 · 6단계) | 일이 일어난 차례 | `What does Ben do after lunch?` · `What does Ben do next?`(next · after 는 4단계 · 5단계 문항은 first(6) · then(7) 을 쓰지 않는다). 6단계는 `What does Meg do first?` 도 된다 | 일 어구 4개(모두 글에 나온 일, 하나만 차례가 맞음) |
| `main-idea`(6~8단계) | 글 전체가 말하는 것 | `What is the story about?` · `What is this letter about?` | 요약 어구 4개 — 정답은 글 전체를 덮고, 오답은 한 부분만 · 글에 없는 것 |
| `inference`(7~11단계) | 글에 그대로 쓰이지 않았지만 글로 알 수 있는 것 | `Why is Meg happy?` · `How does Dan feel at the end?` · `What will Tess probably do next?`(probably 는 단계를 확인한다) | 글의 근거로 하나만 맞는 문장 |
| `vocab-in-context`(8~10단계) | 지문에 나온 그 단계 낱말의 뜻을 문맥으로 | `What does "<낱말>" mean in the story?`(mean 8단계). 낱말은 지문에 쓴 그대로 따옴표 안에 | 앞 단계 낱말로 쓴 뜻풀이 4개(같은 품사) |
| `topic`(9 · 11단계) | 무엇에 대한 글인가 | `What is the topic of the text?`(topic · text 8단계) | 명사구 4개 |
| `gist`(10 · 12단계) | 글쓴이가 하려는 말(요지) | `What is the main idea of the text?`(main 9 · idea 5단계) | 문장 4개 |
| `purpose`(11 · 12단계) | 글쓴이의 의도 · 태도 | `Why did the writer write this article?`(article 11단계) · `How does the writer feel about <주제>?` | 의도 · 태도 문장 4개 |
| `structure`(12단계) | 글이 짜인 방식 | `What does the writer do in this text?` | 짜임 문장 4개(`The writer compares two cities.` · `The writer tells events in time order.` · `The writer gives reasons for an opinion.` · `The writer describes a problem and an answer.` 같은 꼴, 비교 글이면 compares 가 정답이 되게) |

- 단계 L 의 질문 꼴은 단계 L 이하 낱말 · 형태로 쓴다. 위 꼴의 낱말 단계는 2026-10-23 vocab 으로 확인했다(14절 명령이 다시 본다).
- 1단계 지문 예: `A blue kite. The dog is big. I like milk.` — 문항 셋이 kite · dog · milk 를 하나씩 가리킨다(연 그림은 파란 연).
- 같은 단계의 세 문항은 서로 다른 내용을 묻는다(같은 문장을 두 번 묻지 않는다).

## 12. 출력 규격(Zod `PlacementFileSchema` reading · `ReadingPlacementItemSchema` 와 1:1)

모르는 키는 거부된다. 파일 겉: `{ "area": "reading", "form": 1, "levels": [ { "level": <1~12>, "items": [3개], "spares": [] } ] }`. 단계는 1~12 를 한 번씩, 차례대로 둔다.

| 필드 | 꼴 | 설명 |
|---|---|---|
| `no` | 1~3 | 단계 안 차례(5절 유형 차례) |
| `revision` · `correction` | 0 이상 정수 | 호출 값 |
| `type` | `picture` · `fact` · `sequence` · `main-idea` · `inference` · `vocab-in-context` · `topic` · `gist` · `purpose` · `structure` | 5절 |
| `passage` | 영어 | 단계 지문. 세 문항에 같은 글을 그대로 |
| `prompt` | 영어 | 질문(그림 문항은 지문의 낱말 · 어구 · 문장) |
| `options` | `picture` 는 그림 낱말 id 4개, 나머지는 영어 글 4개 | 11절 |
| `answerNo` | 1~4 | 정답 번호 |

`unit` · `explanationKo` · `generation` 은 두지 않는다(배치 규격에 없다).

예시: 4단계 한 단계(사실 확인 셋, 지문 58낱말). 꼴을 보이는 예이니 그대로 옮기지 않는다. 2026-10-23 에 검증기와 14절 명령으로 이 단계의 오류 0 · 문제 0 을 확인했다.

```json
{
  "area": "reading",
  "form": 1,
  "levels": [
    {
      "level": 4,
      "items": [
        {"no": 1, "revision": 2, "correction": 0, "type": "fact", "passage": "Ben gets up early on Saturday morning. He eats bread and drinks milk for breakfast. He takes his camera to the park. His sister Meg is there with her dog. The dog is running on the grass. Ben takes a photo of the dog. It is a good photo. Meg likes it. They go home at ten o'clock.", "prompt": "What does Ben take to the park?", "options": ["his camera", "his dog", "a book", "his bike"], "answerNo": 1},
        {"no": 2, "revision": 2, "correction": 0, "type": "fact", "passage": "Ben gets up early on Saturday morning. He eats bread and drinks milk for breakfast. He takes his camera to the park. His sister Meg is there with her dog. The dog is running on the grass. Ben takes a photo of the dog. It is a good photo. Meg likes it. They go home at ten o'clock.", "prompt": "Who is with Meg in the park?", "options": ["her mom", "her dog", "Ben's cat", "a teacher"], "answerNo": 2},
        {"no": 3, "revision": 2, "correction": 0, "type": "fact", "passage": "Ben gets up early on Saturday morning. He eats bread and drinks milk for breakfast. He takes his camera to the park. His sister Meg is there with her dog. The dog is running on the grass. Ben takes a photo of the dog. It is a good photo. Meg likes it. They go home at ten o'clock.", "prompt": "What time do they go home?", "options": ["at nine o'clock", "at ten o'clock", "at two o'clock", "at six o'clock"], "answerNo": 2}
      ],
      "spares": []
    }
  ]
}
```

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말(영어 45 · 한국어 19)과 정규식 13개. 예: kill · gun · bomb · weapon · beer · wine · cigarette · drugs · stupid · idiot · dumb · shut up · hell · damn.
- 개인 정보를 묻는 말(영어 · 한국어): 사는 곳 · 집 주소 · 전화번호 · 학교 이름 · 반 · 성 · 전체 이름 · 이메일 · 비밀번호.
- 연락처 꼴: 전화번호 · 이메일 · 집 주소 · 웹 주소. 편지 · 안내문에도 연락처 · 주소를 넣지 않는다.
- 메타 문장(`meta-sentences.json`): the child · the user · the student · the learner · I should · I will now · as an AI · system prompt 등.
- (제안) 무섭거나 다치는 장면, 상표 · 실제 인물 · 실제 장소 이름 · 종교 · 정치, 다툼이 큰 주제. 의견 글은 아이 생활의 가벼운 주제(학교 · 놀이 · 동물 · 음식 · 환경)로 쓴다.
- 설계 숫자를 글에 쓰지 않는다.
- `{NAME}` · 실제 아이 이름 · 회화 선생님 이름(10절).

## 14. 스스로 확인과 검증 명령

파일을 다 쓴 뒤 하나씩 확인한다.

1. 단계 1~12 가 한 번씩, 단계마다 문항 3개(번호 1~3)가 5절 유형 차례이고, `spares` 가 빈 목록이다.
2. 단계마다 세 문항의 `passage` 가 같은 글이고, 길이가 5절 범위(1단계는 문장 수)이며, 글 종류가 맞다.
3. 모든 영어 문장이 그 단계 문장 길이 상한 이하다.
4. 지문 · 질문 · 보기의 낱말이 단계 1~L 범위 안이다(범위 밖 0). 지문에 단계 L 내용어가 3개 이상, 단계 L 학습 요소가 하나 이상 있다.
5. 단계 L 위의 형태가 없다(검출되는 꼴과 8절에서 스스로 지킬 꼴 모두).
6. 문항마다 보기 4개 가운데 글과 맞는 것이 하나뿐이고, 질문 꼴이 11절과 맞다. 그림 문항은 9절 그림 규칙을 지킨다.
7. 정답 자리 1~4 가 고루다.
8. 인물 기준(Momo · Tori 단계 3 이하 · 이름을 쓰면 여러 이름 · 표 밖 이름 · 선생님 이름 없음), 13절 금지 목록.

**스스로 확인 명령**(시드 검증 전에 돌린다. 이 명령의 결과로 고치는 것은 고침 회차에 넣지 않는다. 마지막 줄이 `문제 0` 이 될 때까지 고친다. 저장소 뿌리에서 돌린다):

```sh
pnpm -s exec tsx - <뿌리> reading <<'EOF'
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

출력의 첫 줄들은 단계마다 문항 수 · 그 단계 내용어 수이고, `[검사 이름] 단계 · 번호 · 내용` 줄이 고칠 곳이다. `[어휘 범위 밖]` 은 그 단계 위의 낱말이거나 vocab 에 없는 낱말이다. `[그 단계 낱말]` 은 단계 L 낱말이 모자란다는 뜻이다.

**검증 명령**(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas reading --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="placement/reading.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(이 파일의 칸 36 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수)를 그대로 적어 둔다. 칸은 문항 하나(`placement:reading:<단계>:1:<번호>:main`)다.
- 오류가 있으면 그 문항만 고치고 다시 검증한다(같은 단계 세 문항이 지문을 함께 쓰므로 지문을 고치면 세 문항 모두 고친다). 고침은 2회(`seed.max_retries`)까지다. 그래도 남으면 멈추고 보고한다.
- summary 의 `referenceErrors` 가 0 이 아니면 규격 파일 문제라 이 묶음의 일이 아니다. 고치지 않고 보고한다.
- `unchecked` · `empty` 는 이 단계의 일이 아니다.
- 검증기가 잡지 못해 스스로 지킬 것: 어휘 범위 · 그 단계 낱말 · 지문 길이 · 같은 지문 · 유형 차례 · 인물 기준(스스로 확인 명령이 본다), 검출기 없는 학습 요소 · 정답 하나 · 보기 꼴(눈으로 본다).

## 15. 근거 한 줄

읽기 배치는 3.3 읽기 단계표 열두 행을 한 단계에 지문 하나 · 문항 셋으로 줄여 옮긴 것이다(1~3단계 Pre-A1 [4영01-04] · [4영01-05], 4~6단계 A1 [6영01-04] ~ [6영01-06], 7~9단계 A2 · 10~12단계 B1 은 CEFR Overall reading comprehension 과 중학교 · 고등 공통영어 학습 어휘 누계). 단계마다 그 단계에서 처음 나오는 유형 · 학습 요소 · 낱말을 1 · 2번에 둔 것은 적응형 규칙(처음 두 문항으로 못 넘음을 정함)이 그 단계를 바로 재게 하려는 것이다.

## 16. 보고 꼴

마지막 답장(파일로 쓰지 않는다)에 이 차례로 쓴다.

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값> · briefHash: <앞 8자> · agentHash: <앞 8자> · createdOn: <호출 값>
파일: <뿌리>/placement/reading.json · 단계 12 · 문항 <n> · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
스스로 확인: 처음 '문제 <n>'(규칙별 <…>) · 마지막 '문제 <n>'
첫 검증: 칸 <n> · 오류 칸 <n> · 규칙별 <rule n, …> · 경고 <n>
고침: <회차마다 고친 칸 · 남은 오류>
단계마다: 지문 낱말 수 <1:n문장, 2:n, …> · 단계 L 내용어 수 <…> · 고른 단원 주제 <…>
정답 자리 1~4: <n · n · n · n> · 인물: 이름을 쓴 단계 <n> · Momo · Tori 단계 <n> · 쓴 이름 <…>
스스로 확인 목록: 14절 1~8 각각 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …(특히 7~12단계 — 그 단계 수업이 아직 없어 난이도를 견줄 수업이 없다)
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 1 | 배치 파일에 생성 정보를 쓰지 않고 보고에 적음 | 배치 문항 규격에 `generation` 칸이 없다 |
| 2 · 14 | 스스로 확인 명령으로 고친 것은 고침 회차에 넣지 않음 | 첫 검증 결과가 통과율의 기준이다 |
| 3 · 5 | 한 단계의 세 문항이 지문 하나를 함께 씀 · 지문은 단계 글 길이의 아래쪽 | 영역마다 10분(placement.target_minutes) 안에 다섯 단계까지 보려면 문항마다 지문을 두면 12단계 지문만 800낱말이 넘는다. 아래쪽 길이도 단계 규격 범위 안이다 |
| 5 | 단계마다 유형 차례(번호 1 은 그 단계 새 유형) | 3.3 은 단계마다 문제 유형 비율만 정하고 배치 문항 유형은 정하지 않았다. 처음 두 문항으로 못 넘음을 정하는 규칙(3.2)에 맞춰 그 단계를 가르는 유형을 앞에 둔다 |
| 5 | 지문에 단계 L 내용어 3개 이상 · 단계 L 요소 하나 이상 | 단계 L 아이와 L − 1 아이를 가르는 것이 그 단계 낱말 · 요소다. 수는 지문 길이(20~270낱말)에서 가장 짧은 2단계에 맞춘 아래 한계다 |
| 6 | 지문 주제를 그 단계 단원 주제에서 | 배치 결과로 시작할 단원들과 같은 결의 글이다 |
| 9 | 뜻 · 모습이 겹치는 그림 짝 더함 · 얼굴 그림은 한 문항에 하나 | 2단계 그림(느낌 얼굴 · 사람)이 서로 비슷하다. 풀이 검사는 '그림: 뜻'만 본다 |
| 10 | 3단계부터 이야기 글의 이름 상한 없음 · Momo · Tori 단계 셋까지 | C126 '인물이 뼈대인 단계는 그 브리프가 정한다'. 수업과 같은 '모모 · 토리만 되풀이하지 않게' |
| 11 | 2단계 사실 확인을 빈칸 문장으로 | What · Where · Who 의문문은 3단계 단원 5 요소다. 빈칸 문장은 2단계 꼴(have · He · She is)만으로 사실을 묻는다. 2단계 읽기 수업 브리프가 같은 꼴을 쓰게 맞출 것(17절 밖 — 보고) |
| 11 | 유형별 질문 꼴과 그 낱말 단계 | 3.3 은 유형 이름만 있다. 질문 낱말도 단계 범위 안이어야 한다(mean · topic · text 8단계, main 9단계, article 11단계) |
| 13 | 무서운 장면 · 상표 · 실제 인물 · 실제 장소 · 종교 · 정치 · 다툼이 큰 주제 금지 | 금지어 목록 밖의 내용 기준이 정본에 없다 |
