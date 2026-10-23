# 생성 브리프 — 선생님 이야기 1~3 구간(`talk-story-1-3`)

이 파일은 선생님 이야기 1~3 구간 묶음의 프롬프트 판이다(정본 6.3 '선생님 이야기' 행). 시드 생성자(`seed-generator`)는 이 파일과 호출이 넘긴 값만 보고 이야기 20장을 파일 하나로 만든다. 다른 문서 · 코드 · 시드 파일은 읽지 않는다. 정본에 없는 값은 '(제안)'으로 적었고 17절에 모았다. 이 파일을 고치면 프롬프트 판이 바뀌므로 이 구간 이야기를 처음부터 다시 만든다. 회화 카드는 `talk-1.md`, 회화 평가 카드는 `level-test-talk-1.md` 가 맡는다.

## 0. 판 정보

| 칸 | 값 |
|---|---|
| 묶음 | 선생님 이야기(저장 종류 값은 `tori_story` 그대로 — 코드 식별자, 화면 · 문서 이름은 '선생님 이야기', C130) · 구간 `1-3` · CEFR Pre-A1 |
| 틀 | `seed/prompts/_template.md`(영역 × 단계 수업 브리프의 절 번호를 그대로 쓰고, 이야기에 없는 절은 '없음'으로 둔다) |
| 만든 날 · 만든 이 | 2026-10-23 첫 판 · 학습 설계자(cur-p08) |
| 옮긴 곳 | `src/core/seed/schema/assessment.ts`(StorySchema · StoryFileSchema) · `check-assessment.ts`(checkStoryFile) · `check-teacher.ts` · `structure.ts`(STORIES_PER_BAND · STORY_QUESTIONS · STORY_OPTIONS · STORY_KO_BANDS) · `reference-index.ts`(allowedForms 'story') · `seed/vocab.json` · `level-specs.json`(회화 1단계 문장 길이) · `settings.json`(talk.friendship_*) · `teachers.json` · `lists/forms.json` · `forbidden.json` · 정본 3.5 친한 정도 · 4절 '선생님 이야기' 화면 · 6.3 · 6.4 · 13절 C64 (1) · C117 · C122 · C124 · C130 · C132 · 장부 '토리 이야기 title · generation(P8 브리프에도)' · 이 판의 견본 이야기 검증(12절) |

## 1. 호출이 넘기는 값과 쓸 파일

| 값 | 예 | 쓰는 곳 |
|---|---|---|
| 뿌리 폴더 | `seed` 또는 표본 폴더 | 쓸 파일 `<뿌리>/stories/1-3.json`(이 묶음의 파일 하나) |
| briefHash · agentHash | 소문자 16진 64자 | 이야기마다 `generation` |
| effort | `xhigh` · `high` | `generation.effort` |
| createdOn | `2026-10-23` | `generation.createdOn` |
| revision · correction | `1` · `0` | 이야기마다 |
| 검증 명령 | 14절 명령을 환경에 맞춘 것 | 14절 |

`generation.model` 에는 자기 모델 ID(예: `claude-opus-5-5`)를 적는다. 이야기 규격에는 `generation` 칸이 있으므로 이야기마다 채운다(평가 · 배치 문항과 다르다).

## 2. 할 일 한눈에

1. 6절 차례표에서 20장의 주제 · 인물 · 작은 사건을 확인한다.
2. 이야기마다 영어 이야기(`textEn`) → 한국어 뜻(`textKo`) → 제목 → 질문 2개를 쓴다.
3. 파일 하나 `{ "band": "1-3", "stories": [ … ] }` 에 `no` 1~20 차례로 넣는다.
4. 14절 스스로 확인 명령 → 검증 명령 → 오류 칸 고침 → 16절 보고. 풀이 검사(`pnpm seed:check`)는 컨트롤러가 돌린다.

## 3. 구간 규격

| 칸 | 값 |
|---|---|
| 이야기 수 | 구간마다 20장(`STORIES_PER_BAND`), `no` 1~20 이 여는 순서다 |
| 열리는 때 | 회화 대화를 목표 턴까지 할 때마다 친한 정도가 `talk.friendship_per_talk`(1)칸 오르고, `talk.friendship_max`(10)칸이 차면 이 구간 이야기를 차례대로 한 장 연다(정본 3.5). 회화 1~3단계 아이가 연다 — 앞 번호일수록 1단계 아이가 연다 |
| 화면 | 고른 선생님이 자기 목소리로 이야기를 읽어 주고, 선생님 초상과 글이 보인다. 1~3 구간은 한국어 뜻을 함께 보인다. 이어서 질문 2개를 보기 3개 고르기로 묻고 앱이 바로 맞음을 보인다. 별 · 점수 · 단원 횟수는 없고 AI 를 부르지 않는다. 열린 이야기는 언제든 다시 본다(정본 4절) |
| 그림 | 없다(이야기 규격에 그림 칸이 없다) |
| 문장 길이 상한 | 5낱말 — 회화 1단계(구간 첫 단계) 규격(`check-assessment` 이야기 검사). 이야기 · 질문 · 보기 모두 |
| 형태 | 구간 첫 단계 **앞**까지의 형태만 쓴다(C64 (1), 검증기 allowedForms 'story') — 1~3 구간은 형태 표의 형태를 하나도 쓸 수 없다(8절) |
| 한국어 뜻 | 1~3 구간은 `textKo` 가 있어야 한다(`story-ko`) |
| 질문 | 이야기마다 2개(`STORY_QUESTIONS`), 보기 3개(`STORY_OPTIONS`), 정답 하나, 한국어 해설. 앱이 정답과 비교해 채점하고, 풀이 검사 대상이다(6.4) |

## 4. 단원 틀

없음 — 이야기는 단원 · 수업 번호 · 주제 변형이 없다. 칸 키는 `story:1-3:<no>` 꼴이다.

## 5. 이야기 구성

**선생님 이야기는 선생님이 아이에게 읽어 주는 짧은 그림책 이야기다**(제안, 17절). 이야기 속 인물은 6절 차례표의 가상 인물이나 이름 없는 동물 · 물건이고, 선생님은 이야기 밖에서 읽어 주는 이다. 이야기에 선생님이 나오지 않고 선생님의 1인칭 문장(`I like …` 를 선생님이 말하는 글)을 두지 않는다. 그래서 '선생님은 앱 속 AI 선생님이고 사람의 삶을 지어내지 않는다'와 '어느 선생님이 읽어도 맞는 글'이 저절로 지켜진다.

| 칸 | 쓰는 법 |
|---|---|
| `textEn` | (제안) 4~6문장, 문장마다 5낱말 이하, 모두 16~28낱말. 처음에 누구 · 무엇을 보이고, 작은 일 하나(무엇일까 → 알고 보니 · 찾았다 · 나눴다 · 고맙다)가 있고, 따뜻하게 끝난다. 인물의 말은 큰따옴표로 둔다(`"I like it!"`) |
| `textKo` | `textEn` 의 한국어 뜻. 선생님이 들려주는 말투(반말)로, 문장 차례를 맞춘다(`이건 상자야. 커다란 상자야.`) |
| `title` | 한국어 10자 안팎. 20장이 서로 다르다. 선생님 이름 · 토리 없음 |
| `questions` | 2개. `prompt` 는 영어 질문(5낱말 이하 — 8절 질문 꼴), `options` 는 영어 낱말 · 어구 3개(5낱말 이하, 같은 꼴), `answerNo` 는 1~3, `explanationKo` 는 해요체 해설(근거 문장을 따옴표로 들고 뜻을 한 줄) |

질문 규칙(풀이 검사가 정답 없이 풀어 본다 — 다르거나 둘 이상 맞거나 답이 없으면 사람 확인으로 간다):

- 답이 이야기 글에 분명하게 나온다. 정답 보기의 낱말은 이야기에 그대로 나온 꼴로 쓴다(`big` 이면 이야기에 `big`).
- 보기 셋은 같은 꼴이다(셋 다 색 · 셋 다 `the + 명사` 등). 오답 보기는 이야기에 나오지 않았거나, 나왔어도 질문의 답이 될 수 없는 것이다.
- 두 질문은 다른 것을 묻는다(하나는 무엇 · 누구, 하나는 색 · 크기 · 수 등).
- 정답 자리를 20장 40문항에서 1 · 2 · 3 에 고루 나눈다(제안 — 13~14번씩).
- 아이 자신을 묻지 않는다(`What do you like?` ×) — 이야기에 대한 질문만이다.

## 6. 이야기 차례표(제안)

이야기마다 주제 · 인물 · 작은 일을 정해 둔다. 겹치지 않게 하고, 주제 묶음 1(동물 · 자연 · 음식)과 2(놀이 · 탈것 · 우주)를 섞었다. 낱말은 예이고 7절 범위 안에서 바꿀 수 있다. 인물 수 · 차례는 바꾸지 않는다(10절 셈).

| no | 제목(안) | 인물 | 작은 일 | 쓸 낱말(예) |
|---|---|---|---|---|
| 1 | 커다란 상자 속 | 없음 | 큰 상자를 보니 작은 고양이 | box · big · cat · little · cute |
| 2 | 맥스의 빨간 공 | Max(강아지) | 빨간 공을 찾았다, 맥스의 공이다 | ball · red · dog · my |
| 3 | 사과 두 개 | Meg | 빨간 사과 한 개 · 초록 사과 한 개 | apple · two · red · green |
| 4 | 뜨거운 해 | 없음 | 해가 뜨겁다, 파란 호수가 좋다 | sun · hot · lake · blue |
| 5 | 거스의 노래 | Gus(오리) | 오리가 노래를 좋아한다 | duck · song · like |
| 6 | 벤의 큰 모자 | Ben | 모자가 아주 크다, 그래도 좋다 | hat · big · Oh |
| 7 | 테드의 케이크 | Ted(곰) | 케이크를 받고 고맙다고 한다 | cake · bear · thank |
| 8 | 테스의 파란 연 | Tess | 파란 연이 길다 | kite · blue · long |
| 9 | 조개 셋 | 없음 | 조개 셋을 센다, 모래가 뜨겁다 | shell · sand · three |
| 10 | 노란 장난감 버스 | Momo | 노란 버스는 모모의 장난감 | bus · yellow · toy |
| 11 | 작은 개구리 | 없음 | 바위 옆 초록 개구리가 작다 | frog · green · rock · little |
| 12 | 댄의 자전거 | Dan | 빨간 자전거가 멋지다 | bike · red · nice |
| 13 | 키 큰 왕 | 없음 | 키 큰 왕과 웃는 여왕 | king · queen · tall · smile |
| 14 | 맥스의 간식 | Max(강아지) | 쿠키가 맥스의 간식이다 | cookie · snack |
| 15 | 메그의 인형 | Meg | 작은 인형의 작은 침대 | doll · bed · little |
| 16 | 별 다섯 | 없음 | 하얀 별 다섯을 센다 | star · five · white |
| 17 | 테드의 물고기 | Ted(곰) | 큰 물고기, 아니 작은 물고기 | fish · big · small |
| 18 | 모모의 그네 | Momo | 나무 그네가 빨갛다 | swing · tree · red |
| 19 | 거스의 우산 | Gus(오리) | 노란 우산이 거스의 것 | umbrella · yellow |
| 20 | 피자 나누기 | Ben · Tess | 피자 한 조각씩, "I like pizza!" | pizza · two · like |

9번처럼 자리를 말하고 싶은 이야기도 위치 전치사(`on the sand`)를 쓰지 않는다(8절). 사건은 be 동사 문장 · `This is ~` · 인물의 따옴표 말로 보인다.

## 7. 어휘 범위(vocab 1단계)

이야기 · 질문 · 보기의 영어는 아래 1단계 낱말(활용형 포함)과 10절 이름 표의 이름만 쓴다(제안 — 검증기는 이야기의 어휘 범위를 세지 않는다. 형태가 구간 첫 단계에 묶이므로 낱말도 같은 단계에 둔다. 한국어 뜻이 함께 보인다). `{NAME}` 을 쓰지 않는다. 수는 영어 낱말로 쓴다.

흔한 낱말도 2단계 이상이면 쓰지 않는다. 2단계: have · can · very · here · play · run · jump · want · mom · dad · friend · good · happy · fun · new · with · for · at · of · or · sky. 3단계: see · look · eat · go · where · who · there · we · they · rain · picture. 4단계: too · day · so · today · again · story · its · his · her.

**기능어 32개**: `a` 하나의(셀 수 있는 낱말 앞) · `an` 하나의(모음 소리 앞) · `and` 그리고, ~와 · `be` ~이다, ~에 있다 [am, is, are, was, were, been, being] · `bye` 잘 가, 안녕 · `do` 하다(질문 · 부정을 만듦) [does, did, done, doing] · `goodbye` 안녕(헤어질 때 인사) · `hello` 안녕(만날 때 인사) · `hi` 안녕 · `how` 어떻게, 얼마나 · `I` 나는 · `in` ~ 안에 · `it` 그것 · `many` 많은 · `me` 나를, 나에게 · `my` 나의 · `no` 아니, 없는 · `not` 아니다, ~ 않다 · `oh` 오, 아 · `okay` 좋아, 괜찮은 · `on` ~ 위에 · `please` ~해 주세요, 부디 · `that` 저것, 저 · `the` 그(정해진 것 앞) · `this` 이것, 이 · `to` ~에, ~까지 · `up` 위로 · `what` 무엇 · `wow` 와 · `yes` 응, 네 · `you` 너, 너를 · `your` 너의

- **1단계 낱말 1 (회화 단원 1 — 선생님과 첫 만남)**: `name` 이름 [names] · `apple` 사과 [apples] · `egg` 달걀 [eggs] · `banana` 바나나 [bananas] · `milk` 우유 · `cake` 케이크 [cakes] · `candy` 사탕 [candies] · `cookie` 쿠키, 과자 [cookies] · `cheese` 치즈 [cheeses] · `grape` 포도 [grapes] · `pizza` 피자 [pizzas] · `jam` 잼 [jams] · `rice` 밥, 쌀 · `snack` 간식 [snacks] · `like` 좋아하다 [likes, liked, liking] · `thank` 고마워하다 [thanks, thanked, thanking] · `cute` 귀여운 [cuter, cutest] · `nice` 좋은, 멋진 [nicer, nicest] · `hot` 뜨거운, 더운 [hotter, hottest] · `top` 팽이, 꼭대기 [tops] · `fan` 선풍기, 부채 [fans] · `pot` 냄비, 화분 [pots] · `brush` 솔, 붓 [brushes, brushed, brushing] · `lunch` 점심 · `thick` 두꺼운 [thicker, thickest]
- **1단계 낱말 2 (회화 단원 2 — 내 방 구경)**: `cat` 고양이 [cats] · `dog` 개 [dogs] · `pig` 돼지 [pigs] · `duck` 오리 [ducks] · `fish` 물고기 · `bird` 새 [birds] · `rabbit` 토끼 [rabbits] · `frog` 개구리 [frogs] · `sheep` 양 · `puppy` 강아지 [puppies] · `fox` 여우 [foxes] · `chicken` 닭, 닭고기 [chickens] · `snake` 뱀 [snakes] · `hat` 모자 [hats] · `cap` (챙 달린) 모자 [caps] · `sock` 양말 [socks] · `shoe` 신발 [shoes] · `shirt` 셔츠 [shirts] · `jacket` 재킷, 웃옷 [jackets] · `ball` 공 [balls] · `doll` 인형 [dolls] · `bike` 자전거 [bikes] · `kite` 연 [kites] · `ring` 반지, 울리다 [rings, rang, rung, ringing] · `game` 놀이, 게임 [games]
- **1단계 낱말 3 (회화 단원 3 — 무슨 색일까)**: `red` 빨간, 빨간색 [reds] · `blue` 파란, 파란색 [blues] · `yellow` 노란, 노란색 [yellows] · `green` 초록의, 초록색 [greens] · `black` 검은, 검은색 [blacks] · `white` 하얀, 흰색 [whites] · `pink` 분홍의, 분홍색 [pinks] · `orange` 오렌지, 주황색 [oranges] · `color` 색, 색깔 [colors] · `big` 큰 [bigger, biggest] · `small` 작은 [smaller, smallest] · `long` 긴 [longer, longest] · `short` 짧은, 키가 작은 [shorter, shortest] · `bus` 버스 [buses] · `car` 자동차 [cars] · `ship` 배 [ships] · `truck` 트럭 [trucks] · `plane` 비행기 [planes] · `bed` 침대 [beds] · `bath` 목욕, 욕조 [baths] · `dish` 접시, 요리 [dishes] · `tent` 텐트 [tents] · `home` 집 [homes] · `shop` 가게, 쇼핑하다 [shops, shopped, shopping] · `bank` 은행 [banks]
- **1단계 낱말 4 (회화 단원 4 — 좋아하는 것)**: `bag` 가방 [bags] · `pen` 펜 [pens] · `pencil` 연필 [pencils] · `book` 책 [books] · `cup` 컵 [cups] · `map` 지도 [maps] · `desk` 책상 [desks] · `chair` 의자 [chairs] · `toy` 장난감 [toys] · `drum` 북, 드럼 [drums] · `clock` 시계 [clocks] · `lamp` 램프, 전등 [lamps] · `bell` 종 [bells] · `eye` 눈 [eyes] · `ear` 귀 [ears] · `nose` 코 [noses] · `mouth` 입 [mouths] · `face` 얼굴 [faces] · `hand` 손 [hands] · `leg` 다리 [legs] · `arm` 팔 [arms] · `old` ~살의, 늙은 [older, oldest] · `neck` 목 [necks] · `tooth` 이, 이빨 [teeth] · `smile` 미소, 웃다 [smiles, smiled, smiling]
- **1단계 낱말 5 (회화 단원 5 — 나이와 숫자)**: `one` 1, 하나 · `two` 2, 둘 · `three` 3, 셋 · `four` 4, 넷 · `five` 5, 다섯 · `six` 6, 여섯 · `seven` 7, 일곱 · `eight` 8, 여덟 · `nine` 9, 아홉 · `ten` 10, 열 · `tall` 키가 큰, 높은 [taller, tallest] · `little` 작은, 어린 · `thin` 얇은, 마른 [thinner, thinnest] · `sun` 해, 태양 [suns] · `tree` 나무 [trees] · `flower` 꽃 [flowers] · `rock` 바위, 돌 [rocks] · `lake` 호수 [lakes] · `sand` 모래 · `rose` 장미 [roses] · `shell` 조개껍데기 [shells] · `king` 왕 [kings] · `swing` 그네, 흔들다 [swings, swung, swinging] · `wing` 날개 [wings] · `song` 노래 [songs]
- **회화 단원 밖의 1단계 낱말(읽기 · 쓰기 알파벳 단원 낱말 — 범위 안이지만 회화 단원 단어가 아니다)**: `ant` 개미 [ants] · `bear` 곰 [bears] · `box` 상자 [boxes] · `cow` 소 [cows] · `door` 문 [doors] · `elephant` 코끼리 [elephants] · `fork` 포크 [forks] · `guitar` 기타 [guitars] · `horse` 말 [horses] · `insect` 곤충 [insects] · `juice` 주스 · `key` 열쇠 [keys] · `lion` 사자 [lions] · `monkey` 원숭이 [monkeys] · `nurse` 간호사 [nurses] · `octopus` 문어 [octopuses] · `piano` 피아노 [pianos] · `queen` 여왕 [queens] · `robot` 로봇 [robots] · `star` 별 [stars] · `tiger` 호랑이 [tigers] · `umbrella` 우산 [umbrellas] · `violin` 바이올린 [violins] · `window` 창문 [windows] · `yo-yo` 요요 [yo-yos] · `zebra` 얼룩말 [zebras]

내용어는 모두 151개다.

## 8. 형태와 문장 꼴

검증기는 구간 첫 단계 **앞**까지의 형태만 받는다. 1~3 구간은 형태 표(`forms.json` 58개)의 모든 형태가 걸린다. 아래 예는 실제 검출기로 대조했다.

| 꼴 | 걸리는 예 |
|---|---|
| he · she · we · they | `She is little.` · `They like cake.` |
| have · has · can | `Max has a ball.` · `Meg can run.` |
| There is · Let's | `There is a cat.` · `Let's go.` |
| be 부정 | `It is not a cat.`(짧은 `No, it isn't.` 은 걸리지 않는다) |
| 진행형 · 동명사 · 과거 | `Max is running.` · `It was big.` · `Ted liked it.` |
| 3인칭 동사(낱말만으로 걸리는 것) | `says` · `asks` · `sees` · `reads` 등 |
| some · 그 밖 4단계 이상 꼴 | `Some apples.` · don't · does · will · because |

검출기가 못 잡지만 쓰지 않는 꼴: 3인칭 단수 -s(`Max likes the ball.` — 4단계 요소), 위치 전치사(`in the box` · `on the sand` — 3단계 요소), 명령문, 문장을 잇는 and · but, `Is it ~?` · `Do you ~?`.

쓸 수 있는 꼴(1단계 다섯 요소 + 감탄 · 따옴표 말):

| 꼴 | 예 |
|---|---|
| `This is ~.` · `That is ~.` · `It is a/an ~.` | `This is Max.` · `It is a big box.` |
| 이름 · 명사 + be + 형용사 · 명사 | `Max is a little dog.` · `The cat is cute.` |
| 색 · 크기 + 명사 | `a red ball` · `The kite is long.` |
| 수 + 복수 | `Two apples!` · `Three shells.` |
| 감탄 | `Oh, a cat!` · `Wow!` |
| 무엇일까 | `What is it?`(이야기 안의 물음) |
| 인물의 따옴표 말 | `"I like it!"` · `"Thank you!"` · `"It is my ball!"` |

질문 꼴(`prompt`): `What is it?` · `What color is the ball?` · `How many shells?` · `What is little?` · `The box is…`(뒤를 고르게). 그 밖의 의문문(`Who …?` · `Where …?` · `Is it …?`)은 쓰지 않는다.

## 9. 그림 규칙

없음 — 이야기에는 그림이 없다. 색 · 모습은 글이 정한다. 그림 카탈로그와 맞출 일은 없지만, 실제와 다른 색(파란 해 · 초록 바나나)은 쓰지 않는다(제안 — 아이가 헷갈린다).

## 10. 인물 · 선생님

### 선생님(C117 · C122 · C130)

- 이야기는 아이가 고른 선생님이 읽어 준다. 선생님은 앱 속 AI 선생님이다. 이야기에 선생님이 나오지 않는다(5절).
- **선생님 이름을 쓰지 않는다.** 'Tori' · '토리'와 명단 이름(지금 Mina · 미나 · Leo · 리오)을 모든 글 칸(영어 · 한국어 · 제목 · 질문 · 보기 · 해설)에 쓰지 않는다. 검증기 `teacher-name` 이 막는다 — 영어는 대소문자를 가리지 않고 낱말 경계로, 한국어는 앞 글자가 한글이 아니면 뒤에 무엇이 붙어도 건다. 토리(다람쥐)는 이 이야기에 등장인물로도 쓰지 않는다. 자리 표시자(`{TEACHER}` · `{NAME}`)도 쓰지 않는다.
- (제안) 뒤에 명단에 들어올 이름도 피한다 — 영어 Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi, 한글 루비 · 소라 · 하나 · 준 · 나비 · 루나 · 키키 · 루루 · 팡팡 · 삐삐. 한국어에서 흔한 말과 같은 글자는 다른 말로 쓴다: '하나' → '한 개' · '한 마리' · '1', '소라' → '조개', 띄어 쓴 '준'(준다)은 '줘' · '줬어' 꼴로.
- 선생님 이름이 아닌 인물에게 사람 삶이 있는 것은 괜찮다(가상 인물의 이야기다). 다만 가족 · 학교 · 사는 곳은 2단계 이상 낱말이고 아이에게 묻는 글이 아니므로 쓰지 않는다.

### 인물(C124 · C126)

인물이 이야기의 뼈대이므로 n 상한(⌊N/4⌋)은 두지 않는다(템플릿 '인물 규칙' — 인물이 뼈대인 묶음은 브리프가 정한다). 대신(제안):

- 6절 차례표대로 쓴다 — 이름 하나가 이야기 셋을 넘지 않고, Momo 는 둘, 이름 없는 이야기는 여섯이다. 모모만 되풀이하지 않는다(C124).
- 아래 표의 이름만 쓴다. 표 밖의 이름을 새로 만들지 않는다. 이름을 부르는 말로 문장 앞뒤에 붙이지 않는다(`Max, it is red.` ×).

| 이름 | 누구 | 한국어로 적을 때 |
|---|---|---|
| Momo | 아이 | 모모 |
| Ben | 남자아이 | 벤 |
| Meg | 여자아이 | 메그 |
| Dan | 남자아이 | 댄 |
| Tess | 여자아이 | 테스 |
| Max | 강아지 | 맥스 |
| Ted | 곰 | 테드 |
| Gus | 오리 | 거스 |

he · she 를 쓸 수 없으므로 인물은 이름이나 `the dog` 으로 다시 가리킨다.

## 11. 수업 종류별 내용

없음 — 이 묶음은 이야기 한 종류다.

## 12. 출력 규격(Zod `StoryFileSchema` · `StorySchema` 와 1:1)

모르는 키는 거부된다. 파일 겉: `{ "band": "1-3", "stories": [ … ] }`.

| 필드 | 꼴 | 설명 |
|---|---|---|
| `no` | 1~20 정수 | 여는 순서, 겹침 없음(`story-count`) |
| `revision` · `correction` | 0 이상 정수 | 호출 값 |
| `generation` | `{ "method": "generated", "model", "effort", "briefHash", "agentHash", "createdOn", "retries"? }` | 호출 값과 자기 모델 ID(규격은 비울 수 있게 두었지만 이 묶음은 채운다 — 장부) |
| `title` | 한국어 | 제목(규격은 비울 수 있지만 채운다 — 장부) |
| `textEn` | 영어 | 이야기 |
| `textKo` | 한국어 | 한국어 뜻(1~3 구간 필수) |
| `questions` | 2개 `[{ "prompt", "options": [3개], "answerNo", "explanationKo" }]` | 질문 |

예시: 꼴을 보이는 예이니 그대로 옮기지 않는다(번호 20 은 예의 자리 — 6절 20번은 다른 이야기다). 2026-10-23 에 검증기로 칸 오류 0 · 경고 0 을 확인했다(풀이 검사는 돌리지 않음).

```json
{
  "no": 20,
  "revision": 1,
  "correction": 0,
  "generation": {
    "method": "generated",
    "model": "claude-opus-5-5",
    "effort": "xhigh",
    "briefHash": "<호출이 넘긴 briefHash 64자>",
    "agentHash": "<호출이 넘긴 agentHash 64자>",
    "createdOn": "2026-10-23"
  },
  "title": "커다란 상자 속",
  "textEn": "This is a box. It is a big box. What is it? Oh, it is a cat! It is a little cat. The cat is cute.",
  "textKo": "이건 상자야. 커다란 상자야. 뭘까? 오, 고양이야! 작은 고양이야. 고양이가 귀여워.",
  "questions": [
    {
      "prompt": "The box is…",
      "options": [
        "big",
        "little",
        "red"
      ],
      "answerNo": 1,
      "explanationKo": "'It is a big box.' 에 나와요. 상자는 커요(big)."
    },
    {
      "prompt": "What is cute?",
      "options": [
        "the box",
        "the cake",
        "the cat"
      ],
      "answerNo": 3,
      "explanationKo": "'The cat is cute.' 에 나와요. 귀여운 건 고양이예요."
    }
  ]
}
```

## 13. 금지 목록

- `lists/forbidden.json` 의 낱말(영어 45 · 한국어 19)과 정규식 13개(예: kill · gun · bomb · beer · wine · stupid · idiot · shut up).
- 개인 정보 · 연락처 꼴(전화번호 · 이메일 · 집 주소 · 웹 주소), 아이에게 묻는 질문.
- 선생님 이름 · 토리 · 자리 표시자(10절).
- (제안) 무섭거나 다치는 장면 · 슬프게 끝나는 이야기 · 혼나는 장면, 상표 · 실제 인물 · 작품 속 인물 · 종교 · 정치.
- 설계 숫자(친한 정도 칸 수 등)를 글에 쓰지 않는다.

## 14. 스스로 확인과 검증 명령

1. 이야기 20장, `no` 1~20 겹침 없음, 모두 `generation` · `title` · `textKo` 가 있다.
2. 이야기마다 4~6문장, 문장 · 질문 · 보기가 5낱말 이하, 8절의 걸리는 꼴 · 쓰지 않는 꼴이 없다.
3. 영어 낱말이 7절 범위(1단계 낱말 · 이름 표) 안이다.
4. 질문 2개 · 보기 3개 · 정답 하나가 이야기 글에 분명하고, 보기가 같은 꼴이며 겹치지 않고, 정답 자리가 고르다.
5. 선생님 이름 · 토리 · 뒤 명단 이름 · 자리 표시자가 없고, 선생님이 이야기에 나오지 않는다. 한국어에 '하나 · 소라 · 나비 · 준'이 없다.
6. 6절 차례표의 인물 셈(이름마다 셋까지 · Momo 둘 · 이름 없는 이야기 여섯)을 지켰다.
7. `textKo` 가 반말이고 `textEn` 과 문장 차례 · 뜻이 맞다. 해설은 해요체다. 13절 금지 목록에 걸리는 말이 없다.

스스로 확인 명령(검증기가 보지 않는 어휘 범위 · 뒤 명단 이름 · 문장 수 · 보기 · 정답 자리). '스스로 확인 걸림 없음'이 나올 때까지 고친다. '정답 보기 글이 이야기에 그대로 나오지 않는다(확인)'는 꼴이 다를 뿐 맞으면 남겨도 된다(보고에 적는다).

```sh
python3 - <뿌리> <<'PY'
import json, re, sys
from collections import Counter

root = sys.argv[1]
vocab = json.load(open(f"{root}/vocab.json"))["vocab"]
stories = json.load(open(f"{root}/stories/1-3.json"))["stories"]
allowed = set()
for v in vocab:
    if v["level"] <= 1:
        allowed.add(v["word"].lower())
        allowed.update(f.lower() for f in v["forms"])
NAMES = ["Momo", "Ben", "Meg", "Dan", "Tess", "Max", "Ted", "Gus"]
allowed.update(n.lower() for n in NAMES)
TEACHER_EN = ["Tori", "Mina", "Leo", "Ruby", "Sora", "Hana", "Jun", "Nabi", "Luna", "Kiki", "Lulu", "Pang", "Pipi"]
TEACHER_KO = ["토리", "미나", "리오", "루비", "소라", "하나", "준", "나비", "루나", "키키", "루루", "팡팡", "삐삐"]
SUFFIX = ["'m", "'re", "'s", "'ve", "'ll", "'d", "n't"]
TOKEN = re.compile(r"\{[A-Z_]+\}|_{3,}|\d+|[A-Za-z]+(?:'[A-Za-z]+)*(?:-[A-Za-z]+)*")
problems = []

def offband(text):
    bad = []
    for tok in TOKEN.findall(text.replace("’", "'")):
        low = tok.lower()
        if tok.startswith("{") or tok.isdigit():
            bad.append(tok)
            continue
        if low in allowed:
            continue
        stem = next((low[: -len(s)] for s in SUFFIX if low.endswith(s) and len(low) > len(s)), None)
        if stem is None or stem not in allowed:
            bad.append(tok)
    return bad

mains = Counter()
answers = Counter()
for s in stories:
    at = f"이야기 {s['no']}"
    sentences = [x for x in re.split(r"(?<=[.!?…])\s+", s["textEn"].strip()) if x]
    if not 4 <= len(sentences) <= 6:
        problems.append(f"{at}: 문장 {len(sentences)}개(4~6)")
    english = [s["textEn"]] + [q["prompt"] for q in s["questions"]] + [o for q in s["questions"] for o in q["options"]]
    for text in english:
        bad = offband(text)
        if bad:
            problems.append(f"{at}: 범위 밖 낱말 · 틀 자리 · 숫자 {bad}: {text}")
    every = english + [s.get("title", ""), s.get("textKo", "")] + [q["explanationKo"] for q in s["questions"]]
    for text in every:
        for n in TEACHER_EN:
            if re.search(rf"(?<![A-Za-z]){n}(?![A-Za-z])", text, re.I):
                problems.append(f"{at}: 선생님 이름(뒤 명단 포함) {n}: {text}")
        for n in TEACHER_KO:
            for m in re.finditer(n, text):
                if m.start() == 0 or not re.match(r"[가-힣]", text[m.start() - 1]):
                    problems.append(f"{at}: 한국어에 선생님 이름과 같은 글자 '{n}'(다른 말로): {text}")
                    break
    for i, q in enumerate(s["questions"]):
        opts = [o.strip().lower() for o in q["options"]]
        if len(set(opts)) != len(opts):
            problems.append(f"{at} 질문 {i + 1}: 보기가 겹친다")
        answers[q["answerNo"]] += 1
        if q["options"][q["answerNo"] - 1].lower() not in s["textEn"].lower():
            problems.append(f"{at} 질문 {i + 1}: 정답 보기 글이 이야기에 그대로 나오지 않는다(확인): {q['options'][q['answerNo'] - 1]}")
    used = [n for n in NAMES if re.search(rf"(?<![A-Za-z]){n}(?![A-Za-z])", s["textEn"])]
    for n in used:
        mains[n] += 1
nos = sorted(s["no"] for s in stories)
if nos != list(range(1, 21)):
    problems.append(f"번호 {nos} 가 1~20 이 아니다")
over = {n: c for n, c in mains.items() if c > 3}
if over:
    problems.append(f"한 이름이 이야기 넷 이상에 나온다: {over}")
nameless = sum(1 for s in stories if not any(re.search(rf"(?<![A-Za-z]){n}(?![A-Za-z])", s["textEn"]) for n in NAMES))
print(f"이름 쓴 이야기 수: {dict(mains)} · 이름 없는 이야기 {nameless} · 정답 자리 {dict(sorted(answers.items()))}")
print("\n".join(problems) if problems else "스스로 확인 걸림 없음")
PY
```

검증 명령(호출이 다른 명령을 주면 그것을 쓴다):

```sh
pnpm -s seed:validate --root <뿌리> --areas talk --json | python3 -c 'import json,sys; d=json.load(sys.stdin); f="stories/1-3.json"; xs=[x for x in d["errors"]+d["warnings"] if x.get("file")==f]; print(d["summary"]); [print(x["rule"], x.get("cell",""), x.get("path",""), x["message"]) for x in xs]'
```

- 첫 검증 결과(칸 20 · 오류가 있는 칸 수 · 규칙별 오류 수 · 경고 수)를 그대로 적어 둔다.
- 오류가 있으면 그 이야기만 고치고 다시 검증한다. 고친 이야기의 `generation.retries` 에 회차를 적는다. 고침은 2회(`seed.max_retries`)까지다.
- `unchecked`(풀이 검사 안 됨)는 컨트롤러가 `pnpm seed:check --root <뿌리> --file stories/1-3.json` 으로 푼다. 이 묶음의 일이 아니다.

## 15. 근거 한 줄

1~3 구간 선생님 이야기는 회화 1~3단계 아이가 친한 정도의 보상으로 여는, 듣고 읽는 짧은 그림책 이야기다. 2022 개정 초3~4 이해 성취기준 묶음 [4영01-04~06](P6a 근거 문서의 1~3단계 이해 근거)과 CEFR Pre-A1 듣기 · 읽기(천천히 또렷하게 들려주는 아주 짧고 쉬운 글에서 익숙한 낱말과 정보를 알아듣기)에 맞춰, 1단계 형태 · 낱말로만 쓰고 한국어 뜻을 함께 보인다.

## 16. 보고 꼴

```
상태: DONE | DONE_WITH_CONCERNS | BLOCKED
모델 ID: <자기 모델 ID> · effort: <호출 값>
파일: <뿌리>/stories/1-3.json · 이야기 <n> · <바이트>
시각: 시작 <date> · 끝 <date> · <분>
첫 검증: 칸 <n> · 오류 칸 <n> · 규칙별 <rule n, …> · 경고 <n>
고침: <회차마다 고친 이야기 · 남은 오류>
스스로 확인 명령: 첫 결과 <걸림 n> · 마지막 결과
인물: 이름마다 이야기 수 <…> · 이름 없는 이야기 <n>
정답 자리: 1 <n> · 2 <n> · 3 <n>
스스로 확인: 14절 1~7 각각 확인함 · 못 함(까닭)
근거가 약한 곳 · 브리프로 풀리지 않은 것: …
```

## 17. 제안 모음(정본에 없는 값)

| 절 | 제안 | 까닭 |
|---|---|---|
| 머리 | 이야기를 회화 카드 브리프와 떼어 이 파일 하나로 | 이야기는 구간마다 파일 하나(`stories/1-3.json`)이고 회화 1~3단계에 걸친다. 회화 1단계 카드 브리프와 판을 묶으면 한쪽을 고칠 때 다른 쪽을 다시 만들어야 한다 |
| 5 | 선생님 이야기 = 선생님이 읽어 주는 그림책 이야기, 선생님은 이야기 밖 | C130 은 내용 규격(짧은 이야기 · 한국어 뜻 · 질문 2개)만 그대로 두고 이름을 바꿨다. 옛 '토리 이야기'는 다람쥐 토리의 이야기였지만 선생님은 사람 삶을 지어내지 않고(6.2) 어느 선생님이 읽어도 맞아야 한다. 선생님 1인칭('나는 그림이 좋아')을 20장에 넣으면 1단계 꼴로 단조로워지고 '앱 속 선생님'으로 말이 되는 것만 남아 이야기가 되기 어렵다 |
| 5 | 4~6문장 · 16~28낱말 · 작은 일 하나 · 따뜻한 끝 · 정답 자리 고루 | 정본은 '짧은 이야기'만 정했다. 1단계 5낱말 문장으로 사건 하나를 담는 길이다 |
| 5 · 8 | 질문 · 보기를 영어로 | 이야기 검사가 질문 · 보기를 영어 글로 본다(role prompt · option). 1단계 회화에서 듣는 질문 꼴(What is it? · What color …?)을 다시 쓰고, 이야기 한국어 뜻과 해설이 뒤를 받친다 |
| 6 | 20장 차례표(주제 · 인물 · 작은 일) | 정본 입력의 '앞 이야기 목록'을 한 번에 20장 만드는 묶음에 맞게 미리 정했다. 주제 겹침과 인물 쏠림을 막는다 |
| 7 | 20장 모두 1단계 낱말 | 검증기가 형태를 구간 첫 단계 앞까지로 묶어(C64 (1)) 2 · 3단계 동사를 써도 3인칭 · 진행 꼴을 쓸 수 없다. 앞 번호는 1단계 아이가 연다 |
| 8 | 위치 전치사 · 3인칭 -s 를 쓰지 않음 | 검출기가 못 잡지만 3.6 차례로 3 · 4단계 요소다 |
| 10 | 인물 셈(이름마다 셋까지 · Momo 둘 · 이름 없음 여섯), 토리 등장 안 함 | C124 를 인물이 뼈대인 묶음에 맞춘 셈. 토리는 선생님 이름 검사가 이야기 글에서 막는다(C130 · C132) |
| 10 | 뒤 명단 이름 · '하나 · 소라 · 나비 · 준' 피함 | 명단이 늘면 검사가 모든 시드를 다시 본다(C132 (1)) |
| 13 | 슬프게 끝나는 이야기 · 혼나는 장면 금지 | 친한 정도의 보상으로 여는 글이다 |
