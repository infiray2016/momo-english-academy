# 시드 규격 파일 근거 문서(P6a) — 어휘 · can-do · 단원 주제 · 형태 표 · 금지어 · H5 제안

작성: 학습 설계자(curriculum-designer), 2026-10-16 · 묶음 0 판, 2026-10-17 묶음 2(4~6단계) · 묶음 1(1~3단계, H5 확정 C66 뒤) 더함, 같은 날 fix 1(검토 review-p06a 반영, 컨트롤러 판정 C67) · fix 2(review-p06a-2 반영) 고침, 묶음 3(7~9단계) · 묶음 4(10~12단계, 1~6단계 여분 초등 권장 맞바꿈 16) 더함, fix 3(review-p06a-3 R-1~R-5) 고침. plan: `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06a-규격-파일.md`(approved). 정본은 메인 저장소 `specs/`(C61 까지)를 읽었다.

이 문서는 `seed/` 규격 파일 열의 근거다. 규격이 모르는 키를 거부하므로 근거 한 줄은 JSON 에 두지 않고 여기에 둔다. 표시: '(제안)'은 정본에 없는 이름 · 값, '(추측)'은 확인하지 못한 사실, '(잠정)'은 H5 확인 전 값이었다 — H5 는 2026-10-17 요청자가 확인했다(C66, (6) 머리).

묶음 0 에서 만든 것: `seed/settings.json`(180행) · `seed/level-specs.json`(48행, can-do 48) · `seed/model-prices.json`(6행) · `seed/images.json` · `seed/vocab.json` · `seed/unit-specs.json`(빈 목록) · `seed/lists/homophones.json`(33묶음) · `forbidden.json`(낱말 64 · 정규식 11) · `forms.json`(뼈대 6항목) · `meta-sentences.json`(13). fix 1 뒤 값은 homophones 32묶음 · forbidden 정규식 13 · forms 25항목이고, 묶음 3 뒤 forms 는 42항목, 묶음 4 뒤 forms 58항목 · homophones 48묶음이다. 단계마다 후보 낱말 모음은 `tests/.tmp/p06/candidates-<단계>.json`(저장소에 남지 않음)이다.

## (1) 어휘 출처와 단계 정하기

### 출처

| 무엇 | 출처 · 판 · 확인 |
|---|---|
| 2022 개정 기본 어휘 목록 3,000 | 교육부 고시 제2022-33호 [별책 14] 영어과 교육과정 [별표 3] pp. 254-290. 목록 본문은 한국교육과정평가원 교과서검정연구기획단 'KICE Word Lister' 안내서(경기도교육청 게시, 71쪽, PDF 만든 날 2023-06-14) 4~33쪽에서 뽑았다. https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf (2026-10-16 받음, sha256 6e3e2272…a4bf) |
| 뽑은 결과 | 대표형 3,000 = `*` 800(초등 권장) · `**` 1,200(중학교 · 고등학교 공통과목 권장) · 표시 없음 1,000(그 밖 과목). 철자 쌍은 대표형 하나로 셌다(airplane / aeroplane 등 40). 계획자가 적은 `*` 819 · `**` 1,215 는 철자 쌍을 따로 센 수다 |
| 목록 지침(같은 쪽) | 대표형은 굴절형과 36 접사 파생형을 함께 나타낸다(-er · -y · -ful · -ly · un- · re- …). 지침 5: 고유 명사 · 호칭 · 감탄사 · 알파벳 · 단위 · 약어 · 기수(zero~twelve · thirteen · twenty · thirty · hundred · thousand · million · billion 밖) · 서수(first · second · third · twenty-first~third 밖)는 새 어휘로 세지 않는다. 지침 3: 초 · 중 · 공통과목은 학습 · 평가 어휘의 90% 이상을 목록에서 쓴다 |
| 성취기준 · [별표 4] 언어 형식 | 교육부 고시 제2022-33호 [별책 14] 본문(306쪽, PDF 만든 날 2022-12-19). 사본: https://github.com/googyosoo/concept-based-learning (2026-10-16 받음, sha256 596d1389…f92a). 2차 출처 사본이라 원문 쪽수 대조는 하지 않았다(확인 정도 중간). 교육부 누리집 첨부는 2011 판이 걸려 받지 않았다 |
| CEFR-J Wordlist v1.5 | https://github.com/openlanguageprofiles/olp-en-cefrj `cefrj-vocabulary-profile-1.5.csv`(2026-10-16 받음, sha256 b0dd3c63…e498). README: 연구 · 상업 목적 무료, 데이터를 바르게 인용하는 조건, 저작권은 TUFS Tono Laboratory. 목록을 옮기지 않고 단계 대조에만 썼다(아래 표) |
| CEFR Companion Volume(2020) | 원문 PDF(rm.coe.int)는 403 으로 받지 못했다. can-do 근거의 척도 이름은 기억에 기댄다(확인 정도 낮음, (추측)) |

### 단계 정하기 규칙(C61 (1) 실현)

- 1~6단계는 `*` 를 먼저, 모자라는 몫은 `**` 의 쉬운 구체어(frog · sheep · cute · purple · whale 등)에서, 7~12단계는 `**` 에서 골랐다. `*` 가운데 추상어 · 고학년 주제어(business · company · culture · energy · image · nation · war 등 57)는 7~12단계에 두었다.
- 같은 표 안의 단계는 단원 주제와 3.6 학습 요소의 필요(1단계 색 · 크기 · 수, 2단계 가족 · 기분 · can 동사, 3단계 장소 · 위치 · 일과 동사, 4단계 요일 · 시각 · 직업, 5단계 수 11~100 · 가게 · 빈도, 6단계 달 · 지난 일 · 까닭), 그림이 되는지(1~2단계), 쓰기 1단계 철자 패턴으로 정했다. CEFR-J 는 대조만 했다.
- 7~12단계 안의 순위는 CEFR-J 수준 차례(같은 수준 안은 학습 설계자 차례)로 매겼다. 1~6단계 순위는 학습 설계자 차례다. 7~9단계는 그 순위 1~150 을 기본으로 정하고 꼭 필요한 낱말만 당겼다(아래 '7~9단계 150 정하기', 컨트롤러 판정).
- 출처 표시는 낱말마다 후보 모음의 `mark` 칸에 남겼다: `*` · `**` · `-`(표시 없음 1,000), '파생'(굴절 · 36 접사 · 괄호 파생형), '합성'(목록 낱말끼리의 합성어, classroom · ice cream 등), 'X'(목록 밖). 지침 5 의 고유 명사 · 기수(요일 · 달 · English · Korean · fourteen~nineteen · forty~ninety)는 아래 표에서 따로 센다.

### 단계마다 후보 수와 출처 표시 수

'앞에서 고를 수'는 그 안에서 단원 단어로 쓰는 수(1~3단계 125 = 25 × 5, C66 · 4~12단계 150)다. 1~12단계 줄 모두 vocab 그대로다(1~6단계는 fix 1 · 묶음 4 맞바꿈 뒤, 7~12단계는 묶음 3 · 4 의 150 정하기 뒤). 목록 밖 비율은 지침 5 를 뺀 수에 대한 비율이다(지침 3 의 10% 상한과 견줌).

| 단계 | 후보 | 앞에서 고를 수 | `*` | `*` 파생 | `**` | `**` 파생 | `-` | `-` 파생 | 합성 | 지침 5 | 목록 밖 | 목록 밖 비율 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 144 | 125 | 109 | 0 | 15 | 0 | 0 | 0 | 0 | 0 | 1 | 0.8% |
| 2 | 134 | 125 | 89 | 12 | 15 | 3 | 2 | 0 | 2 | 0 | 2 | 1.6% |
| 3 | 148 | 125 | 109 | 0 | 7 | 1 | 0 | 1 | 6 | 0 | 1 | 0.8% |
| 4 | 161 | 150 | 117 | 12 | 8 | 3 | 0 | 0 | 1 | 8 | 1 | 0.7% |
| 5 | 157 | 150 | 89 | 4 | 35 | 5 | 0 | 1 | 4 | 11 | 1 | 0.7% |
| 6 | 167 | 150 | 116 | 1 | 19 | 1 | 0 | 1 | 0 | 11 | 1 | 0.7% |
| 7 | 206 | 150 | 14 | 0 | 135 | 1 | 0 | 0 | 0 | 0 | 0 | 0.0% |
| 8 | 163 | 150 | 6 | 5 | 135 | 3 | 0 | 0 | 1 | 0 | 0 | 0.0% |
| 9 | 191 | 150 | 11 | 0 | 138 | 1 | 0 | 0 | 0 | 0 | 0 | 0.0% |
| 10 | 168 | 150 | 19 | 0 | 131 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0% |
| 11 | 163 | 150 | 5 | 0 | 145 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0% |
| 12 | 155 | 150 | 2 | 0 | 147 | 0 | 0 | 0 | 0 | 0 | 1 | 0.7% |
| 합계(C66) | — | 1725 | 686 | 34 | 930 | 18 | 2 | 3 | 14 | 30 | 8 | 0.5% |

후보는 모두 1,968 이었다(묶음 4 에서 10단계 원본 줄의 찌꺼기 'however x' · 'discover x' 둘을 거르고 conclusion 하나를 더해 1,967, 그 가운데 12단계에서 밀려 후보 파일 밖으로 나간 10 을 빼면 파일에 1,957). `*` 800 은 기능어 86 · 알파벳 대표 낱말 21 · 뺀 낱말 몇을 빼고 모두 후보에 들었고, 묶음 4 뒤 모두 앱 어휘(vocab 원형 · 활용형 · 기능어 · 알파벳)에 든다(people 은 person 의 활용형, mathematics 는 대표형 math). `**` 1,200 도 기능어 33 · 뺀 낱말을 빼고 모두 들었다. 목록 밖 낱말은 kite · penguin · turtle · squirrel · sofa · pillow · soap · pond · worm · vet · cartoon · cereal · laundry · noodle · dessert · pancake · grandmother(합성) 등 그림 · 생활 낱말이다.

CEFR-J v1.5 대조(1~3단계 앞 125 · 4~12단계 앞 150, 낱말마다 가장 낮은 수준). 1~4단계는 대부분 A1 이다. 1~2단계의 B1 · B2 는 giraffe · whale · puppy · swing 같은 어린이 구체어로, CEFR-J(일본 학습자 기준)가 높게 매긴 낱말이라 그대로 둔다. 7~12단계 경계는 거칠다 — 7~9단계에 A1 86(묶음 3 뒤, 전에는 93), 10~12단계에 A2 154 가 있다. 7~12단계 모두 후보 순위를 그대로 쓰는 판정(아래 '7~9단계 150 정하기' · '10~12단계 150 정하기')이라 경계를 옮기지 않았다(근거가 약한 항목).

| 단계 | 기대 | A1 | A2 | B1 | B2 | CEFR-J 에 없음 |
|---|---|---|---|---|---|---|
| 1 | Pre-A1(A1) | 110 | 8 | 5 | 2 | 0 |
| 2 | Pre-A1(A1) | 107 | 9 | 7 | 2 | 0 |
| 3 | Pre-A1(A1) | 103 | 17 | 1 | 0 | 4 |
| 4 | A1 | 131 | 13 | 3 | 1 | 2 |
| 5 | A1 | 98 | 39 | 7 | 3 | 3 |
| 6 | A1 | 84 | 53 | 9 | 3 | 1 |
| 7 | A2 | 43 | 75 | 30 | 1 | 1 |
| 8 | A2 | 24 | 83 | 42 | 0 | 1 |
| 9 | A2 | 19 | 83 | 47 | 0 | 1 |
| 10 | B1 | 17 | 71 | 58 | 4 | 0 |
| 11 | B1 | 8 | 36 | 98 | 5 | 3 |
| 12 | B1 | 3 | 47 | 83 | 15 | 2 |

### 1~3단계 후보(순위 차례)

H5 확정(C66, 단원 단어 25)으로 '앞 125'가 1~3단계 vocab · 단원 단어다. fix 1(검토 I-2 · M-5)에서 1~3단계 126 위 밖의 초등 권장 낱말 37 은 4~6단계로 옮겼고(아래 'fix 1 맞바꿈' 표), old(2단계)와 head(1단계)를 맞바꿨다. 남은 126 위 뒤 낱말은 vocab 밖 여분이다.

1단계 앞 125: one two three four five six seven eight nine ten red blue yellow green black white pink orange color big small long short tall little like thank cat dog pig duck fish bird rabbit frog sheep apple banana egg milk cake candy cheese grape pizza cookie bag hat cap pen pencil book cup ball doll bike bed desk chair sock shoe ship bus truck car kite ring drum map toy eye ear hand leg nose face mouth tooth neck old arm sun tree flower rock lake sand jam fan lamp jacket tent bell top hot pot fox puppy shop shirt shell brush dish chicken lunch thin thick bath clock snack king song swing wing bank cute nice rose home game plane snake rice name smile

1단계 126~(vocab 밖 여분): purple melon lemon hen net bug bench rocket stick lock rope nut pocket math thumb kitchen trunk sink tape gate slide hole

2단계 앞 125: happy sad hungry thirsty tired sleepy angry fine good great sick sorry glad bad ready busy cold mother father mom dad brother sister baby family friend boy girl man woman teacher doctor grandmother grandfather fun pretty kind smart strong funny young head new fast slow cool beautiful have want need know pet gift glasses swim run jump fly dance sing walk climb ski skate cook read write draw ride play catch kick throw help soccer baseball basketball tennis badminton music giraffe whale dolphin goat penguin turtle potato corn strawberry water chocolate sandwich hamburger ice cream dress skirt pants coat scarf sweater jeans phone computer room house table hair foot finger knee shoulder toe very really here now animal food fruit farmer police student uncle aunt cousin

2단계 126~(vocab 밖 여분): peach butterfly spider loud dirty boot glove hug zero tail touch ice

3단계 앞 125: school park zoo farm store market library hospital garden playground classroom bathroom bedroom living room street town city restaurant wall floor basket eraser ruler crayon scissors glue notebook textbook paper picture bottle eat drink go come wash sleep study learn watch listen look see make clean open close sit stand stop wait put take give get say talk ask answer live find bring meet let turn left move push pull age birthday question number sky sea cloud rain snow wind river mountain beach grass bridge road forest soup train taxi airplane subway squirrel puzzle block card balloon dark bright round soft hard far high low quick back end way fire air large safe cut paint fix carry pick drop hold corner side front bottom middle child

3단계 126~(vocab 밖 여분): bowl plate towel toothbrush blanket shower mirror pond worm sofa pillow soap fence roof tower shelf stairs hall gym mail copy knock repeat spell point skin

1단계 쓰기 철자 패턴(3.6 쓰기 1단계 단원 1~5). 낱말마다 맞는 패턴을 모두 표시하고(예: chicken 은 단모음 i · ch · -ck), 단원마다 같은 수를 놓을 때 패턴 낱말을 가장 고르게 놓는 배치를 셌다(이분 매칭). 25 안은 단원마다 패턴 낱말 18개 이상 · 전체 101/125(81%), 30 안은 21개 이상 · 전체 118/150(79%)이다. 패턴 밖 낱말(one · two · blue · green · banana · book · ball · eye 등 24 · 32)은 단원 주제에 맞춰 나눈다. 둘 다 순도가 비슷하다.

| 안 | 단원 1 a · e | 단원 2 i · o · u | 단원 3 sh · ch · th | 단원 4 -ck · -ng · -nk | 단원 5 묵음 e | 패턴 밖 |
|---|---|---|---|---|---|---|
| 25 안(단원 25) | 25 | 18 | 18 | 19 | 21 | 24 |
| 30 안(단원 30) | 30 | 23 | 21 | 21 | 23 | 32 |

### 알파벳 · 소리 단원(단원 0) 대표 낱말 26

글자마다 그 글자의 기본 소리(모음은 단모음)로 시작하는 그림 낱말이다. 단계 1 vocab 이고, 읽기 · 쓰기 단원 1~5 와 겹치지 않게 1단계 후보에서 뺐다(`reference-unit-word-dup`). 말하기 · 회화 단원 단어로는 쓰지 않는다(제안). 1단계 쓰기 철자 패턴 낱말(cat · dog · pig · sun 등)을 남기려고 패턴 단원에 덜 쓰이는 낱말을 골랐다(x 만 box).

| 글자 | 낱말 | 표시 | 글자 | 낱말 | 표시 | 글자 | 낱말 | 표시 |
|---|---|---|---|---|---|---|---|---|
| a | ant | `**` | j | juice | `*` | s | star | `*` |
| b | bear | `*` | k | key | `*` | t | tiger | `*` |
| c | cow | `*` | l | lion | `*` | u | umbrella | `*` |
| d | door | `*` | m | monkey | `*` | v | violin | `*` |
| e | elephant | `*` | n | nurse | `*` | w | window | `*` |
| f | fork | `*` | o | octopus | 목록 밖 | x | box(끝소리 /ks/) | `*` |
| g | guitar | `*` | p | piano | `*` | y | yo-yo | 목록 밖 |
| h | horse | `*` | q | queen | `*` | z | zebra | `**` |
| i | insect | `-` | r | robot | `*` | | | |

결과: bear · cow · lion · monkey · tiger · elephant · horse 같은 1단계 동물이 말하기 · 회화 단원 단어에서 빠진다(vocab 단계 1 이라 글에는 쓸 수 있다). 컨트롤러 판정(결정 ⑥ · fix 1 M-12): 이 결과를 받는다. 단원 0 은 배치에서 1단계를 못 넘거나 부모가 '알파벳을 아직 몰라요'를 고를 때만 첫 단원이 되므로(3.1), 대부분의 아이에게 대표 낱말 26(bear · lion · tiger · door · window · star · juice · key 등)은 어느 영역에서도 단원 단어(새 단어 미리보기 · 복습 카드)가 되지 않는다. 이 낱말은 1단계 어휘 범위라 글에는 쓰이고, 단어장에는 아이가 지문에서 눌러 본 때 들어간다(3.4).

### 기능어 169(pos function, 대명사는 pronoun + function)

plan 추정 100~130 보다 많다. 대명사 꼴(소유격 · 목적격 · 소유대명사 · 재귀대명사)을 따로 항목으로 두어 3.6 차례대로 단계를 달리 주었고(소유격 4-4, 목적격 5-5), 인사 · 감탄 낱말(hello · hi · bye · oh · wow · please · okay)과 호칭(Mr. · Mrs.)을 넣었기 때문이다. Ms. 는 5절 문장 자르기의 줄임말 목록(Mr. · Mrs. · Dr. · a.m. · p.m., `SENTENCE_END_ABBREVIATIONS`)에 없어 'Ms. Park …'이 두 문장으로 잘리므로 묶음 2 에서 뺐다(쓰려면 13절로 그 목록에 더함). 단계는 3.6 도입 차례를 따르되, 3.3 이 1단계부터 요구하는 낱말(1단계 회화 'My name is · What's your name? · How old are you? · What color is it?')은 1단계로 당겼다.

| 단계 | 수 | 낱말 |
|---|---|---|
| 1 | 32 | a · an · the · I · me · my · you · your · it · this · that · be · do · what · how · not · no · yes · and · to · in · on · up · hello · hi · goodbye · bye · please · okay · oh · wow · many |
| 2 | 12 | he · she · at · with · for · from · of · down · out · all · or · can |
| 3 | 14 | we · they · these · those · there · under · behind · between · next to · in front of · near · off · who · where |
| 4 | 25 | his · her · its · our · their · mine · yours · hers · ours · theirs · every · everyone · everybody · about · after · before · by · over · above · below · inside · outside · Mr. · Mrs. · so |
| 5 | 20 | him · us · them · but · much · would · why · which · both · other · another · into · around · beside · everything · always · usually · often · sometimes · never |
| 6 | 11 | because · when · some · any · something · anything · nothing · someone · anyone · across · along |
| 7 | 15 | will · could · than · more · most · each · few · through · during · without · until · nobody · somebody · anybody · whose |
| 8 | 13 | must · should · may · against · toward · myself · yourself · himself · herself · itself · ourselves · themselves · none |
| 9 | 9 | if · shall · as · among · several · except · either · neither · till |
| 10 | 5 | might · since · whether · such · per |
| 11 | 9 | although · though · while · unless · nor · yet · upon · within · beyond |
| 12 | 4 | ought · beneath · despite · whom |

까닭이 3.6 과 다른 것: my · your · me 는 1(3.3 1단계 회화 이름 · 교실 영어), it 은 1(1단계 회화 '그림 속 물건'), many 는 1(1단계 회화 '수' — How many? · fix 1 M-5), 빈도부사 always · usually · often · sometimes · never 는 5(3.6 5-1, 낱말 자체가 형태라 단원 단어에서 빼고 기능어로 — C67 (2) · fix 1 I-1), or 는 2(고르는 질문 Red or blue?, 문장을 잇는 or 는 3.6 5-3), so 는 4(so big 부사, 문장을 잇는 so 는 9-5). 출처 표시: `*` 86 · `*` 파생 9 · `**` 33 · 합성 13 · `-` 1 · 목록 밖 27(감탄 · 호칭 · 대명사 꼴).

### 표기 · 항목 정리

| 무엇 | 고른 쪽 |
|---|---|
| 대명사 꼴 | 따로 항목(me · my · mine · myself 각각). 단계를 3.6 차례로 따로 주려고 |
| 'May'(달)와 조동사 may | vocab 은 대소문자를 가리지 않고 겹침을 막는다. 조동사 may(8) 하나만 두고, 달 May 는 vocab 에서 빼고 글로서리의 고유 명사로 둔다(제안) |
| 요일 · 달 · English · Korean | 지침 5 고유 명사지만 4~6단계 단원 단어로 가르치려고 vocab 에 둔다(대문자) |
| 수 낱말 | zero~hundred · thousand 는 pos number. 지침 5 밖 기수(fourteen~nineteen · forty~ninety)도 5단계 단원 단어로 둔다 |
| 철자 쌍 · 같은 대표형 | color(미국 철자) · gray · math(mathematics 대신) · living room(목록의 livingroom) · special(목록의 especial) · mom · dad(mother · father 의 괄호 파생) |
| -ed · -ing 형용사 | excited · exciting · bored 대신 boring · interesting · surprised · worried · tired 를 따로 항목으로(어린이가 형용사로 배움). excite · bore 동사는 두지 않는다 |
| 뺀 낱말 | kill · wine · beer · alcohol · cigarette · drug · gun · bomb · weapon · hell · sex(금지어와 겹침), god · pregnant · divorce · pub · darling · breast(아동 학습 범위 밖, 제안), slave · prison · victim · violent(민감, 필요하면 12단계 역사 글에서 다시 봄), alright · mathematics · thirst · twenty-first~third · villa · excite(철자 변이 · 같은 대표형 · 드문 낱말) |

### 1~6단계 vocab(묶음 1 · 2)

`seed/vocab.json` 에 1~6단계 965항목을 넣었다. 내용어는 단계마다 125(1~3단계, C66 의 단원 단어 25 × 5) · 150(4~6단계)이고, 1단계에는 알파벳 대표 낱말 26 이 더 있으며, 기능어는 그 단계 기능어다. 단계마다 내용어 · 기능어: 1단계 125(+ 알파벳 26) · 32, 2단계 125 · 12, 3단계 125 · 14, 4단계 150 · 25, 5단계 150 · 20, 6단계 150 · 11. 7~9단계는 아래 '7~9단계 vocab'(묶음 3), 10~12단계 행은 묶음 4 다. 달 May 는 넣지 않았다(결정 ⑦). fix 1 에서 초등 권장 낱말 37 을 4~6단계에 맞바꿔 넣고(아래 표), 빈도부사 다섯을 기능어로 돌렸다.

- 뜻: 그 단계에서 가르치는 뜻을 먼저, 둘까지(예: fall '가을, 떨어지다', present '선물').
- 활용형(1~6단계 모두 1157개): 명사 복수(불규칙 표 · 셀 수 없는 명사는 두지 않음), 동사 3인칭 단수 · 과거 · 과거분사 · -ing(불규칙 표, 자음 겹침 · e 빼기 · y → i 규칙), 형용사 · 부사 비교급 · 최상급(한 음절과 -y 두 음절만, good · well · bad · far 불규칙). 요일만 복수(Mondays)를 두고, 달 이름 · English · Korean · 방위(east · west · south · north) · corn · world 는 복수형을 두지 않는다(fix 1 M-9). 생성 규칙은 `tests/.tmp/p06/forms_gen.py`(저장소 밖).
- person 의 활용형에 people 을 두었다(2022 목록도 people 을 따로 두지만 영어 복수형이다). 그래서 6단계 후보의 people 대신 6단계 여분의 agree 를 넣었다(people 은 4단계 범위가 된다).
- Ms. 는 뺐다(위 기능어 절). 예문의 사람 이름은 Tom 과 성 Kim · Lee(Mr. · Mrs. 와 함께), 곳 이름은 Korea · Seoul · Jeju 만 썼다(글로서리의 고유 명사). Mom · Dad 는 vocab 의 mom · dad 다.
- 예문: 한 문장, 그 낱말(원형이나 활용형)이 든다, 낱말 수 ≤ 그 단계 상한(1단계 5 · 2단계 6 · 3단계 7 · 4단계 8 · 5단계 9 · 6단계 10), 다른 낱말은 그 낱말 단계 이하 vocab, 형태는 그 단계까지 도입된 것(rst 차례). 예: 1단계 예문은 be · like · thank 와 명사 · 형용사로만 쓰고(I like cats. · This is a red apple.), 2단계는 have · can 까지(I can swim.), 3단계는 There is · Let's · 명령문까지(Let's go to the park.) 쓰며, 3인칭 단수 · 부정문(don't · isn't + 낱말) · 진행형은 4단계라 1~3단계 예문에 없다. 6단계 예문은 was · were · 규칙 과거 -ed 는 쓰지만 불규칙 과거(went · saw · had)는 쓰지 않는다. 일회 검사 결과는 (8).

### fix 1 맞바꿈(검토 I-1 · I-2 · M-5, 컨트롤러 판정 C67)

1~3단계를 25 로 줄이며 vocab 밖으로 나갔던 초등 권장(`*`) 35 와 easy · onion 을 4~6단계의 같은 주제 묶음에 넣고, 그 묶음의 `**` · 목록 밖 낱말을 뺐다(누계 1,725 그대로). 빈도부사 다섯은 낱말 자체가 형태라 쓰기 5-3 단원(6-3 앞)에서 반드시 막혀서 5단계 기능어로 돌렸고(C67 (2)), 빈자리 다섯을 같은 37 낱말로 채웠다. 뺀 낱말 32 는 7단계 후보 151위 이후 여분(묶음 4 의 맞바꿈 16 과 함께)으로 옮겼다(fix 3 R-5: 순위 수는 묶음마다 바뀌어 적지 않는다). fix 1 판에서는 7단계 후보를 CEFR-J 수준 차례로 다시 매길 때 32 가운데 20 이 앞 150 안으로 섞여 들어가 있었다(검토 review-p06a-2 N-4 (가)). fix 2 에서 여분 표시를 차례 매기기의 첫 기준으로 두어 원래 후보 1~160 의 차례를 되돌렸다(`build_candidates.py`, 컨트롤러 판정). M-5: 1단계 회화의 'How old are you?'를 위해 old 를 1단계로, 대신 head 를 2단계로 맞바꾸고, many 는 기능어 1단계로 옮겼다.

| 단계 | 묶음 | 넣은 낱말 | 뺀 낱말(빈도부사는 기능어로) |
|---|---|---|---|
| 4 | C4 | warm (*) | plant (**) |
| 4 | C9 | bread (*) | toast (**) |
| 4 | C6 | letter (*) | message (**) |
| 4 | C6 | thing (*) | seat (**) |
| 4 | C3 | pilot (*) | dentist (**) |
| 4 | C5 | easy (**파생) | uniform (**) |
| 4 | C5 | difficult (*) | subject (**) |
| 5 | D9 | boat (*) | bicycle (X) |
| 5 | D9 | ticket (*) | nest (**) |
| 5 | D9 | restroom (*) | wave (**) |
| 5 | D4 | tomato (*) | pumpkin (X) |
| 5 | D4 | carrot (*) | pork (**) |
| 5 | D4 | onion (*파생) | oven (**) |
| 5 | D3 | spoon (*) | noodle (X) |
| 5 | D3 | knife (*) | pancake (합성) |
| 5 | D3 | glass (*) | dessert (X) |
| 5 | D8 | prince (*) | giant (**) |
| 5 | D8 | shy (*) | guest (**) |
| 5 | D8 | quiet (*) | noise (**) |
| 5 | D8 | brave (*) | ghost (**) |
| 5 | D2 | poor (*) | coin (**) |
| 5 | D2 | rich (*) | thousand (**) |
| 5 | D10 | gray (*) | mask (**) |
| 5 | D5 | lip (*) | always (*) |
| 5 | D5 | gum (*) | usually (*파생) |
| 5 | D5 | full (*) | often (*) |
| 5 | D5 | heavy (*) | sometimes (합성) |
| 5 | D5 | light (*) | never (*) |
| 6 | E6 | wet (*) | bush (**) |
| 6 | E6 | dry (*) | mud (**) |
| 6 | E6 | hill (*) | dust (**) |
| 6 | E6 | moon (*) | fog (**) |
| 6 | E5 | bee (*) | tray (**) |
| 6 | E4 | lazy (*) | wonder (**) |
| 6 | E10 | mouse (*) | bubble (**) |
| 6 | E10 | bone (*) | cage (**) |
| 6 | E10 | brown (*) | nail (**) |

4단계로 들어온 그림 낱말은 bread · letter · pilot(그림 범위 1~4단계, C65 — P6b 에 알림), 4단계에서 빠진 그림 낱말은 plant · toast · dentist · uniform · seat 이다.

### 묶음 4 맞바꿈 — 1~6단계 여분의 초등 권장 16(컨트롤러 판정 2026-10-17, fix 1 I-2 · C67 (3)과 같은 방법)

묶음 4 에서 1~12단계 전체를 2022 목록과 다시 맞대 보니, 초등 권장(`*`) 16 이 1~6단계 후보 여분(앞 125 · 150 밖)에 남아 앱 어휘 밖이었다. fix 1(I-2)의 35 에 들지 않은 것이다. 컨트롤러 판정대로 1~3단계 여분 8 과 math(1단계 여분, mathematics 의 대표형)는 4단계에, 5단계 여분 4 는 5단계에, 6단계 여분 3 은 6단계에 넣고, 그 단계 같은 묶음의 `**` · 파생 · 합성 낱말과 맞바꿨다(`cand_src.py` 의 `B4_SWAP`). 1~3단계는 C66 수가 고정이고 이미 `*` 위주라 건드리지 않았다. 뺀 16 은 7단계 여분(151 이후)으로 보냈고, 이미 정한 7~9단계 150 과 단계마다 내용어 수(125 · 125 · 125 · 150 · 150 · 150) · 누계 1,725 는 그대로다.

| 단계 | 묶음 | 넣은 낱말 | 뺀 낱말 |
|---|---|---|---|
| 4 | C5 학교 | math(`*`, 1단계 여분(mathematics 의 대표형)) | practice(**) |
| 4 | C6 물건 · 매체 | mail(`*`, 3단계 여분) | diary(**) |
| 4 | C7 놀이 · 활동 | tape(`*`, 1단계 여분) | wonderful(**파생) |
| 4 | C7 | ice(`*`, 2단계 여분) | pool(**) |
| 4 | C7 | point(`*`, 3단계 여분) | surprise(**) |
| 4 | C7 | touch(`*`, 2단계 여분) | picnic(**) |
| 4 | C7 | tail(`*`, 2단계 여분) | exciting(**파생) |
| 4 | C3 | kitchen(`*`, 1단계 여분) | neighbor(**) |
| 4 | C3 | skin(`*`, 3단계 여분) | firefighter(합성) |
| 5 | D3 식당 | check(`*`, 5단계 여분) | meal(**) |
| 5 | D8 사람 | gentleman(`*`, 5단계 여분) | twin(**) |
| 5 | D8 사람 | lady(`*`, 5단계 여분) | magic(**) |
| 5 | D7 운동 | score(`*`, 5단계 여분) | golf(**) |
| 6 | E3 행사 | congratulate(`*`, 6단계 여분) | contest(**) |
| 6 | E10 | guy(`*`, 6단계 여분) | silver(**) |
| 6 | E4 감정 | mad(`*`, 6단계 여분) | lonely(-파생) |

뺀 낱말 가운데 다른 vocab 예문에 쓰였던 다섯(exciting · firefighter · picnic · pool · practice)의 예문 여덟을 고쳤다(예: The sports event was fun. · The prince is very brave. · He dived into the lake. · He studied hard and thus passed the test.). 4단계 C3 묶음에서는 kitchen · skin 을 묶음 끝에 두어 직업 단원의 첫 배정 수업(singer · dancer · driver · artist)을 지켰다. 동음이의어 mail · male 을 새로 더했다((5)).

4단계 그림 낱말(그림 범위 1~4단계, C65 — P6b 작업 3): 들어온 것은 kitchen · tape · tail · ice · mail · skin, 빠진 것은 pool · picnic · firefighter · diary 다. touch · point 는 C65 범위의 동작어라 그림이 되는지는 P6b 가 판정한다(review-p06a-3 5절). math 와 빠진 practice · wonderful · surprise · exciting · neighbor 는 그림 문제로 내기 어려운 낱말이다.

### 7~9단계 150 정하기(묶음 3, 컨트롤러 판정 — task-p06a-fix2-batch3 2절 1)

규칙: 7~9단계 후보 순위 1~150 을 기본으로 둔다(fix 2 로 되돌린 순위). 그 단계 주제 · 학습 요소가 꼭 필요로 하는 낱말과 초등 권장(`*`)만 여분(151위~)이나 다음 단계에서 당기고, 당긴 만큼 앞 150 의 맨 뒤를 다음 단계 후보 앞으로 넘긴다. 원래 앞 150 안이던 낱말이 앞 단계에서 넘어온 낱말에 밀리면 그것도 다음 단계 앞으로 넘기고, 원래 여분은 여분으로 둔다. 9단계에서 밀린 셋은 10단계 후보 앞에 두었다(묶음 4 에서 같은 규칙으로 정함). 생성은 `tests/.tmp/p06/build_candidates.py`(`cand_src.py` 의 `B3_PULL`, 기록 `b3-log.json`).

| 단계 | 당긴 낱말 | 어디서 | 까닭 |
|---|---|---|---|
| 7 | dialogue(`*`) | 7단계 여분 151위 | 초등 권장 — 빠지면 안 됨 |
| 7 | marathon(`*`) | 7단계 여분 154위 | 초등 권장 — 빠지면 안 됨 |
| 7 | finally | 8단계 37위 | 3.6 쓰기 7-4 '순서 말(first · then · finally)'의 낱말. first(6) · then(7)과 같은 단계에 둔다 |
| 9 | tire(`*`) | 9단계 여분 165위 | 초등 권장 — 빠지면 안 됨 |

| 넘긴 곳 | 넘긴 낱말 | 까닭 |
|---|---|---|
| 7 → 8단계 앞 | lift · mess · switch | 7단계 원래 148~150위. 당긴 셋만큼 |
| 8 → 9단계 앞 | comfort · cruel | 8단계 원래 149~150위. 7단계에서 넘어온 셋에서 finally 하나를 뺀 만큼 |
| 9 → 10단계 앞 | pole · pipe · port | 9단계 원래 148~150위. 8단계에서 넘어온 둘과 tire 만큼 |

검토(review-p06a-2 N-4 (가) · 7절 메모 1)가 든 '원래 7단계 후보 30'은 22 가 앱 어휘에 들었다: 7단계 vocab 에 deliver · guide · comedy · cart · champion · league · prize · tongue · muscle · lamb · bark · dozen · total · able · bounce · bow · exit 와 당긴 dialogue · marathon, 8단계 vocab 에 넘긴 lift · mess · switch. 나머지 8(route · sweep · jaw · throat · pine · ceiling · chew · crawl)은 원래부터 7단계 여분(151~160위)이고 모두 `**` 다.

앱 어휘에서 빠지는 낱말(1~9단계 어디에도 들지 않음, 94): 초등 권장(`*`)은 0 이다(`**` 89 · 목록 밖 4 · 합성 1). 묶음 4 에서 10~12단계 주제가 꼭 필요로 하면 같은 규칙으로 당길 수 있다(후보 파일의 여분 칸).

| 단계 여분 | 수 | 낱말(표시 없으면 `**`) |
|---|---|---|
| 7단계 | 40 | route · sweep · jaw · throat · pine · ceiling · chew · crawl · message · seat · subject · bicycle(X) · guest · noise · ghost · plant · toast · dentist · uniform · wave · oven · dessert(X) · coin · thousand · bush · dust · fog · wonder · nest · pork · noodle(X) · giant · mud · bubble · cage · nail · pumpkin(X) · pancake(합성) · mask · tray — 원래 여분 8 과 fix 1 이 4~6단계에서 뺀 32 |
| 8단계 | 13 | forgive · respect · flame · navy · curl · crack · decorate · hint · label · neat · punch · amaze · amuse |
| 9단계 | 41 | plain · powder · pump · press · recommend · shave · spoil · stare · stream · steam · studio · tin · treat · wire · dump · rail · recipe · chop · donate · sail · cottage · microwave · triangle · species · tough · spin · rub · wipe · cable · dawn · deck · evil · grand · lawn · master · mate · pitch · spray · smash · snap · spare |

guest 가 7단계 vocab 에 들지 않아 동음이의어 guest · guessed 묶음은 되살리지 않았다(32묶음 그대로, 브리프 2절 2). 위 표는 묶음 3 때 값이다. 묶음 4 에서 1~6단계 맞바꿈으로 뺀 16 이 7단계 여분에 더해져 7단계 여분은 56 이 되었다(아래 '앱 어휘에서 빠지는 낱말 누계').

### 7~9단계 vocab(묶음 3)

`seed/vocab.json` 에 7~9단계 487항목을 더했다(모두 1,452). 단계마다 내용어 150 · 기능어: 7단계 150 · 15, 8단계 150 · 13, 9단계 150 · 9. 활용형은 7~9단계 782개(1~9단계 모두 1,939)다.

- 뜻 · 활용형은 1~6단계와 같은 규칙이다. 묶음 3 에서 활용형 규칙에 더한 것: -ly 부사 · 한정 형용사(then · past · real · half · own · else · still · ill · once · maybe · quite · main · finally …)는 비교급을 만들지 않는다(규칙이 thenner · finallier · owner 같은 꼴을 만들지 않게), countryside · stuff · plenty · anger · attention · blood · soil · humor · hunger · plus · pity 는 복수형을 두지 않는다, sew 는 sewed · sewn, panic 은 panicked · panicking, upset 은 upset · upsetting, leap 은 leapt 도 둔다. dry 는 fix 2 에서 drier · driest 로 고쳤다(N-3).
- 예문: 한 문장, 낱말 수 ≤ 그 단계 상한(7단계 12 · 8단계 13 · 9단계 15), 다른 낱말은 그 낱말 단계 이하, 형태는 그 단계까지 도입된 것(rst 차례). 그래서 7단계 예문은 불규칙 과거 · did · be going to · will · 비교급 · 최상급까지 쓰고 과거진행 · when 절 · -ly 부사 · must · should · have to · 동명사 · to 부정사 · 현재완료 · if 를 쓰지 않는다(예: Tom is an able student. — be able to 는 9-2 to 부정사라 쓰지 않음). 8단계 예문은 과거진행 · when 절 · -ly · must · should 까지(She screamed when she saw the snake.), 9단계 예문은 동명사 · to 부정사 · 현재완료 · if · ', so' · after · before 절까지 쓴다(Have you ever seen a whale? · It is cruel to hurt animals.). 10~12단계 형태(관계사 who · which · 수동태 · 간접 의문문 · however · as ~ as · although · used to …)는 임시 형태 표(`later-forms.json`)로 막았다 — 그래서 'is made of' 같은 수동태 꼴을 피해 'Gold is a kind of metal.'로 썼다.
- 사람 이름 · 곳 이름은 1~6단계와 같다(Tom · Kim · Korea · Seoul · Jeju). 금지어와 겹치는 낱말 · 뜻은 없다(smoke 의 뜻은 '연기, 연기가 나다'로 두고 담배를 쓰지 않음, shoot 은 공 · 사진). drink 의 drunk 만 그대로 알고 둔 한계다((5)).

### 10~12단계 150 정하기(묶음 4, 묶음 3 과 같은 규칙)

10~12단계도 후보 순위 1~150 을 기본으로, 초등 권장 여분과 학습 요소 낱말만 당기고 밀린 원래 150 안 낱말은 다음 단계 앞으로 넘겼다. 10단계 후보 앞에는 9단계에서 넘어온 pole · pipe · port 가 있다. 12단계에서 밀린 낱말은 다음 단계가 없어 앱 어휘에서 빠진다. 10단계 원본 줄이 거름 표시를 빠뜨려 후보에 들어가 있던 'however x' · 'discover x' 두 찌꺼기를 걸렀고, 11단계 advertize 는 2022 목록의 다른 표기 advertise(표준 철자)로 바꿨다.

| 단계 | 당긴 낱말 | 까닭 |
|---|---|---|
| 10 | service · energy · project · compute · laser(모두 `*`, 여분 167~178위) | 초등 권장 — 빠지면 안 됨. energy 는 회화 10-3 '환경 지키기'에도 쓰인다 |
| 11 | campaign · recreation(`*`, 여분 164~165위) | 초등 권장 |
| 12 | conclusion(목록 밖 — 2022 목록 conclude 의 -sion 파생형, 표시 규칙이 파생으로 잡지 못함) | 3.6 rst 12-5 '문단 연결(first of all · in conclusion)' · 쓰기 10-4 '서론-본문-결론' · 12-4 '요약 · 결론 쓰기'의 낱말 |

| 넘긴 곳 | 넘긴 낱말 |
|---|---|
| 10 → 11단계 앞 | risk · series · settle · shame · select · shelter · spirit · solid |
| 11 → 12단계 앞 | client · constant · converse · detect · ease · elect · exhaust · factor · found · illustrate |
| 12 → 앱 어휘 밖 | commerce · contract · cope · domestic · discipline · employ · faith · frankly · intent · manufacture |

### 앱 어휘에서 빠지는 낱말 누계(1~12단계, 묶음 4 뒤)

후보에 있었지만 vocab(원형)에 들지 않은 낱말이다. 모두 242 이고, 초등 권장(`*`)은 people 하나인데 person 의 활용형으로 vocab 에 든다(실제 빠지는 초등 권장 0). 2022 목록 전체로 맞대면 앱 어휘 밖은 `*` 8 · `**` 236 다. `*` 8 은 모두 '뺀 낱말'(kill · wine · god 같은 금지어 · 아동 범위 밖 낱말과 alright · thirst · twenty-first~third 같은 철자 변이 · 드문 낱말, 위 '표기 · 항목 정리')이라 일부러 뺀 것이다. `**` 이 일부 빠지는 것은 학습 어휘 누계가 1,800 이내(앱 내용어 1,725)라서 정본 3.4 대로다.

| 단계 여분 | 수 | 낱말(표시 없으면 `**`) |
|---|---|---|
| 1 | 19 | purple · melon · lemon · hen(X) · net · bug · bench · rocket · stick · lock · rope · nut · pocket · thumb(-) · trunk · sink · gate · slide · hole |
| 2 | 9 | peach(X) · butterfly(합성) · spider(X) · loud · dirty(**파생) · boot · glove · hug · zero |
| 3 | 23 | bowl · plate · towel · toothbrush(합성) · blanket · shower · mirror · pond(-) · worm(X) · sofa(X) · pillow(X) · soap(-) · fence · roof · tower · shelf · stairs · hall · gym(-) · copy · knock · repeat · spell |
| 4 | 11 | tale · silly · wild · supper · whistle · fur · vet(X) · cartoon(X) · yard(X) · cereal(X) · laundry(-) |
| 5 | 7 | tool · wheel · toilet · bacon · pepper · sheet · super |
| 6 | 17 | people(*) · stamp · bin · brick · chip · cough · dirt · empty · joy · pin · sign · tank · trick · village · whisper · whole · yell |
| 7 | 56 | route · sweep · jaw · throat · pine · ceiling · chew · crawl · message · seat · subject · bicycle(X) · guest · noise · ghost · practice · wonderful(**파생) · pool · surprise · picnic · exciting(**파생) · neighbor · meal · contest · lonely(-파생) · plant · toast · dentist · uniform · wave · oven · dessert(X) · coin · thousand · bush · dust · fog · wonder · diary · magic · golf · silver · nest · pork · noodle(X) · giant · mud · bubble · cage · nail · firefighter(합성) · twin · pumpkin(X) · pancake(합성) · mask · tray |
| 8 | 13 | forgive · respect · flame · navy · curl · crack · decorate · hint · label · neat · punch · amaze · amuse |
| 9 | 41 | plain · powder · pump · press · recommend · shave · spoil · stare · stream · steam · studio · tin · treat · wire · dump · rail · recipe · chop · donate · sail · cottage · microwave · triangle · species · tough · spin · rub · wipe · cable · dawn · deck · evil · grand · lawn · master · mate · pitch · spray · smash · snap · spare |
| 10 | 18 | sort · steady · steel · suppose · surface · surround · stress · tide · transport · upper · volume · bet · billion · edit · gear · mill · odd · seal |
| 11 | 13 | inspect · investigate · instruct · loan · motion · nerve · particular · probable · purchase · relief · salary · stock · version |
| 12 | 5 | overall · prime · quote · somewhat · wage |
| 12단계에서 밀림 | 10 | commerce · contract · cope · domestic · discipline · employ · faith · frankly · intent · manufacture |

### 10~12단계 vocab(묶음 4)

`seed/vocab.json` 에 10~12단계 468항목을 더했다(모두 1,920). 단계마다 내용어 150 · 기능어: 10단계 150 · 5, 11단계 150 · 9, 12단계 150 · 4.

- 활용형 규칙에 더한 것: burst · cast(원형과 같은 꼴) · bind(bound) · deal(dealt)은 불규칙 표에, crisis · analysis · basis · series · self 는 불규칙 복수 표에 넣었다. transfer 는 transferred(겹자음). male · female · chief · due · worth · therefore · however · rather 같은 낱말은 비교급을 만들지 않고, knowledge · justice · politics · labor · glory · software · research 같은 셀 수 없는 명사는 복수형을 두지 않는다.
- 예문: 낱말 수 ≤ 10단계 18 · 11단계 20 · 12단계 22. 형태는 그 단계까지(rst 차례): 10단계 예문은 관계대명사 · 수동태 · 간접 의문문 · however 까지 쓰고 관계부사 · 가정법 · as ~ as · although · while · for example · 의견 표현 · so that · used to · 조동사 수동태 · 문단 연결 · because of 를 쓰지 않는다(예: My mother is an engineer who builds bridges. · The train was delayed by the snow.). 11단계는 although · while · as ~ as 까지(Although it was cold, we played outside.), 12단계는 모두(In my opinion, homework helps us learn. · In conclusion, reading is good for everyone.).
- 12단계의 war · battle · enemy · army · crime · arrest 같은 낱말은 역사 · 사회 주제 낱말로 두고, 예문은 폭력 묘사 없이 썼다(금지어 · 정규식 맞대기 0).

## (2) can-do 48 근거

숫자는 모두 그 단계 규격 JSON 의 숫자다(검증기 `can-do-numbers` 경고 0). 3.1 의 두 예(읽기 4 · 회화 5)는 글자 그대로다. 이웃 단계는 분량이나 과제가 다르다(읽기 2 · 3 은 분량 · 과제로 갈리며 3단계도 그림을 붙인다 — fix 1 M-7). 3단계 행의 CEFR 척도 수준은 단계 CEFR(Pre-A1)에 맞춰 'Pre-A1 ~ A1'로 적었다(fix 1 M-8). 쓰기 1~3단계는 고르기 · 베끼기 · 조립만, 회화 1~3단계는 '보이는 영어를 읽는다'를 쓰지 않았고, 어느 문장도 횟수로 통과를 말하지 않는다. CEFR 척도 이름은 Companion Volume(2020) 기억에 기대므로 (추측)이다.

| 영역 · 단계 | can-do | 2022 성취기준 | CEFR CV 2020 척도 |
|---|---|---|---|
| 읽기 1 | 그림과 짝지은 단어와 짧은 문장 1~3개를 소리와 철자를 이어 읽고 뜻에 맞는 그림을 고를 수 있다 | [4영01-02] [4영01-04] [4영01-05] | Overall reading comprehension(Pre-A1) |
| 읽기 2 | 단어 그림이 붙은 3~5문장(20~35단어)의 짧은 글을 읽고 그림을 고르거나 글에 나온 사실을 확인할 수 있다 | [4영01-05] [4영01-06] [4영01-07] | Overall reading comprehension(Pre-A1) |
| 읽기 3 | 35~55단어의 일상 이야기를 읽고 누가 · 무엇 · 어디를 묻는 질문 3개에 답할 수 있다 | [4영01-06] [6영01-04] | Reading for information and argument(Pre-A1 ~ A1) |
| 읽기 4 | 일상 주제의 55~80단어 글을 읽고 누가 · 무엇 · 어디를 묻는 질문에 답할 수 있다 | [6영01-04] | Reading for information and argument(A1), Reading for orientation(A1) |
| 읽기 5 | 80~110단어의 이야기나 짧은 편지를 읽고 세부 내용과 일이 일어난 순서를 파악할 수 있다 | [6영01-04] [6영01-06] | Reading correspondence(A1) |
| 읽기 6 | 100~130단어의 이야기 · 편지 · 안내문을 읽고 세부 내용과 일의 순서, 중심 내용을 파악할 수 있다 | [6영01-04] [6영01-05] [6영01-06] | Reading for orientation(A1~A2) |
| 읽기 7 | 120~160단어의 이야기 · 편지 · 설명문을 읽고 중심 내용을 파악하고 글에 쓰이지 않은 내용을 추론할 수 있다 | [9영01-02] [9영01-03] [9영01-05] | Reading for information and argument(A2) |
| 읽기 8 | 150~190단어의 이야기 · 설명문 · 일기를 읽고 중심 내용과 세부 내용을 파악하며 낯선 낱말의 뜻을 문맥으로 짐작할 수 있다 | [9영01-03] [9영01-07] | Reading as a leisure activity(A2), Identifying cues and inferring(A2) |
| 읽기 9 | 180~220단어의 설명문이나 기사를 읽고 주제를 찾고 세부 정보를 확인하며 낱말 뜻과 숨은 내용을 추론할 수 있다 | [9영01-03] [9영01-04] [9영01-07] | Reading for information and argument(A2+) |
| 읽기 10 | 200~250단어의 설명문 · 기사 · 짧은 에세이를 읽고 요지를 파악하고 글의 근거로 추론할 수 있다 | [10공영1-01-02] [10공영1-01-03] [10공영1-01-04] | Reading for information and argument(B1) |
| 읽기 11 | 230~280단어의 기사 · 에세이 · 의견 글을 읽고 주제와 글쓴이의 의도를 파악할 수 있다 | [10공영1-01-02] [10공영1-01-03] [10공영2-01-07] | Reading for information and argument(B1) |
| 읽기 12 | 260~300단어의 에세이 · 의견 글 · 비교 글을 읽고 요지와 글쓴이의 태도, 글의 구조를 파악할 수 있다 | [10공영1-01-02] [10공영1-01-06] [10공영2-01-06] | Reading for information and argument(B1) |
| 쓰기 1 | 그림에 맞는 단어를 고르고 철자 타일로 단어 6개를 베끼거나 빠진 글자를 채워 쓸 수 있다 | [4영02-02] [4영02-03] | Overall written production(Pre-A1) |
| 쓰기 2 | 들은 단어를 받아쓰고 철자 타일로 단어 6개를 만들며 두 낱말 어구 3개를 바른 차례로 조립할 수 있다 | [4영02-03] [4영02-04] | Overall written production(Pre-A1) |
| 쓰기 3 | 섞인 단어 카드를 바른 차례로 놓고 첫 글자를 대문자로 바꾸고 마침표를 붙여 3~5단어 문장 5개를 조립할 수 있다 | [4영02-05] [6영02-03] | Overall written production(Pre-A1) |
| 쓰기 4 | 문장 틀에 단어 상자의 낱말을 골라 넣어 3문장을 완성할 수 있다 | [6영02-02] [6영02-04] | Overall written production(A1) |
| 쓰기 5 | 예시문을 보고 바꿀 칸만 자판으로 써서 3~4문장을 완성할 수 있다 | [6영02-08] | Correspondence(A1), Creative writing(A1) |
| 쓰기 6 | 주제에 대한 생각을 꺼낸 뒤 4~5문장(30~45단어)의 짧은 글을 쓰고 첨삭을 보고 고쳐 쓸 수 있다 | [6영02-06] [6영02-08] | Creative writing(A1) |
| 쓰기 7 | 지난 일을 담은 한 문단 일기나 짧은 편지를 5~6문장(45~60단어)으로 쓰고 고쳐 쓸 수 있다 | [9영02-04] [9영02-08] | Correspondence(A2), Creative writing(A2) |
| 쓰기 8 | 편지나 하루 일을 설명하는 한 문단을 6~7문장(55~75단어)으로 쓰고 고쳐 쓸 수 있다 | [9영02-03] [9영02-08] | Correspondence(A2) |
| 쓰기 9 | 경험이나 일의 과정을 차례에 맞게 7~8문장(70~90단어)의 한 문단으로 설명할 수 있다 | [9영02-04] [9영02-05] | Creative writing(A2+) |
| 쓰기 10 | 의견과 이유를 서론 · 본문 · 결론으로 나눠 90~110단어의 글을 쓸 수 있다 | [10공영1-02-04] [10공영1-02-07] | Reports and essays(B1) |
| 쓰기 11 | 두 대상을 비교하고 대조하는 110~130단어의 글을 쓸 수 있다 | [10공영1-02-02] [10공영2-02-06] | Reports and essays(B1) |
| 쓰기 12 | 설명과 의견을 담은 130~150단어의 글을 문단을 이어 쓰고 요약하며 결론을 맺을 수 있다 | [10공영2-02-04] [10공영2-02-05] | Reports and essays(B1) |
| 말하기 1 | 들은 단어 5개와 짧은 문장 5개를 따라 말하고 듣고 그림을 고르며 질문에 단어로 답할 수 있다 | [4영01-01] [4영02-01] [4영02-04] | Overall oral production(Pre-A1), Overall oral comprehension(Pre-A1) |
| 말하기 2 | 3~5단어 문장 5개를 따라 말하고 듣고 그림을 고르며 질문에 단어나 어구로 답할 수 있다 | [4영01-03] [4영02-01] [4영02-04] | Overall oral production(Pre-A1) |
| 말하기 3 | 4~6단어 문장 6개를 따라 말하고 들은 문장의 답을 고르며 질문에 한 문장으로 답할 수 있다 | [4영02-05] [4영02-08] | Overall oral production(Pre-A1 ~ A1) |
| 말하기 4 | 5~7단어 문장을 따라 말하고 질문 5개에 한 문장으로 답할 수 있다 | [6영02-01] [6영02-07] | Overall oral production(A1) |
| 말하기 5 | 짧은 대화를 듣고 알맞은 답을 고르고 질문에 1~2문장으로 답할 수 있다 | [6영01-04] [6영02-07] | Understanding conversation between other people(A1), Overall oral production(A1) |
| 말하기 6 | 그림 2~3장을 보고 2문장으로 말하고 질문에 2문장으로 답할 수 있다 | [6영02-02] [6영02-04] | Sustained monologue: describing experience(A1) |
| 말하기 7 | 지난 일이나 계획을 묻는 질문에 2~3문장으로 답할 수 있다 | [6영02-06] [9영02-04] | Sustained monologue: describing experience(A2) |
| 말하기 8 | 차례가 있는 그림 3장을 보고 3~4문장으로 이야기하고 질문에 2~3문장으로 답할 수 있다 | [9영02-03] [9영02-04] | Sustained monologue: describing experience(A2) |
| 말하기 9 | 짧은 설명을 듣고 이해하고 쓸 말 3개를 보고 주제에 대해 45초 동안 말한 뒤 확인 질문 3개에 답할 수 있다 | [9영01-02] [9영02-03] | Sustained monologue: giving information(A2), Addressing audiences(A2) |
| 말하기 10 | 의견과 이유를 들어 주제에 대해 60초 동안 발표하고 확인 질문 3개에 답할 수 있다 | [10공영1-02-04] | Sustained monologue: putting a case(B1), Addressing audiences(B1) |
| 말하기 11 | 들은 설명을 바탕으로 주제에 대해 90초 동안 발표하고 확인 질문 3개에 답할 수 있다 | [10공영1-02-02] [10공영1-02-05] | Addressing audiences(B1) |
| 말하기 12 | 두 가지를 비교하며 의견을 120초 동안 발표하고 확인 질문 3개에 답할 수 있다 | [10공영1-02-07] [10공영2-02-04] | Sustained monologue: putting a case(B1), Addressing audiences(B1) |
| 회화 1 | 자기 이름 · 나이 · 좋아하는 것과 그림 속 물건에 대해, 처음 듣는 질문은 토리가 들려준 두 답에서 골라 말하고 다시 묻는 질문에는 스스로 답하며 15번 말을 주고받을 수 있다 | [4영02-08] [4영02-10] | Overall spoken interaction(Pre-A1), Information exchange(Pre-A1) |
| 회화 2 | 토리가 답을 들려주지 않아도 정해진 질문에 단어나 짧은 말로 답하고 토리가 되묻는 말에도 답하며 15번 말을 주고받을 수 있다 | [4영02-08] | Conversation(Pre-A1~A1) |
| 회화 3 | 토리의 정해진 질문에 한 문장으로 답하며 15번 말을 주고받을 수 있다 | [4영02-05] [4영02-08] | Information exchange(Pre-A1 ~ A1) |
| 회화 4 | 틀 없이 한 문장으로 답하며 토리와 일상 이야기로 20번 말을 주고받을 수 있다 | [6영02-07] | Conversation(A1), Information exchange(A1) |
| 회화 5 | 가게 · 학교 같은 상황에서 토리와 20번 말을 주고받으며 미션 3개를 해낼 수 있다 | [6영02-07] [6영02-10] | Obtaining goods and services(A1) |
| 회화 6 | 상황극에서 토리에게 먼저 묻기도 하며 20번 말을 주고받고 미션 4개를 해낼 수 있다 | [6영02-07] [6영02-10] | Obtaining goods and services(A1~A2) |
| 회화 7 | 길 묻기 · 계획 세우기 상황에서 토리의 예상 밖 대답에 맞춰 20번 말을 주고받으며 미션 5개를 해낼 수 있다 | [9영02-03] [9영02-10] | Obtaining goods and services(A2), Goal-oriented co-operation(A2) |
| 회화 8 | 어제 한 일이나 주말 이야기를 두세 문장으로 말하고 토리의 이어지는 질문에 답하며 25번 말을 주고받을 수 있다 | [9영02-04] | Conversation(A2), Information exchange(A2) |
| 회화 9 | 취미와 계획을 이야기하고 토리에게 질문도 하며 25번 말을 주고받을 수 있다 | [9영02-04] [9영02-11] | Informal discussion (with friends)(A2) |
| 회화 10 | 힌트 없이 의견과 이유를 주고받고 토리의 반대 의견에 답하며 25번 말을 주고받을 수 있다 | [10공영1-02-04] [10공영1-02-08] | Informal discussion (with friends)(B1) |
| 회화 11 | 토리가 들려준 짧은 이야기를 다시 전하고 그 이야기로 25번 말을 주고받을 수 있다 | [10공영1-02-05] | Information exchange(B1) |
| 회화 12 | 토리가 화제를 둘째 주제로 바꿔도 두 주제를 오가며 25번 말을 주고받을 수 있다 | [10공영1-02-07] [10공영2-02-09] | Conversation(B1), Informal discussion (with friends)(B1) |

## (3) 단원 주제 · 학습 요소 표(1~12단계 확정)

학습 요소는 3.6 표 글자 그대로다(읽기 · 말하기 · 회화는 같은 요소). 주제는 아이 일상(가족 · 학교 · 동물 · 음식 · 놀이)에서 골랐고 같은 (영역, 단계) 안에서 겹치지 않는다. 같은 단계의 내용어를 영역마다 다른 주제로 나누므로 단원으로 나누는 방식이 영역마다 다르다(C61 (1)). 주제 묶음 둘(1 동물 · 자연 · 음식 · 가족, 2 놀이 · 운동 · 게임 · 우주 · 탈것)에는 등장인물 · 예시만 바꿔 맞춘다(예: '가방 속 물건'은 묶음 1 동물 스티커 · 묶음 2 장난감 블록). 회화 5~7단계 주제는 3.3 대화 방식(상황극)에 맞춘 장면이다. 단원 0(읽기 · 쓰기 1단계)은 학습 요소 '알파벳 이름과 기본 소리'(제안) · 주제 '알파벳 친구들'이다.

| 단계 · 단원 | 읽기 · 말하기 · 회화 요소 | 읽기 주제 | 말하기 주제 | 회화 주제 | 쓰기 요소 | 쓰기 주제 |
|---|---|---|---|---|---|---|
| 1-1 | a · an + 명사 | 간식과 장난감 | 과일 바구니 | 토리와 첫 만남 | 단모음 a · e | 모자와 가방 |
| 1-2 | This is ~ | 동물과 탈것 | 내 장난감 | 내 방 구경 | 단모음 i · o · u | 돼지와 개구리 |
| 1-3 | 색 · 크기 + 명사 | 알록달록 색깔 | 내 얼굴과 몸 | 무슨 색일까 | sh · ch · th | 물고기와 배 |
| 1-4 | I like ~ | 좋아하는 물건 | 좋아하는 동물 | 좋아하는 것 | -ck · -ng · -nk | 시계와 양말 |
| 1-5 | 수 + 복수 -s | 하나 둘 세기 | 몇 개일까 | 나이와 숫자 | 묵음 e(cake · bike) | 케이크와 자전거 |
| 2-1 | I am · You are | 오늘 내 기분 | 배고프고 졸려요 | 인사와 기분 | 형용사 + 명사 | 빨간 사과 큰 공 |
| 2-2 | He · She · It is | 우리 가족 | 내 친구 소개 | 가족사진 | 수 + 복수 명사 | 강아지 세 마리 |
| 2-3 | have | 내 반려동물 | 생일 선물 | 내가 가진 것 | 동사 + 목적어(play soccer) | 공차기 놀이 |
| 2-4 | can | 나는 할 수 있어 | 몸으로 할 수 있는 일 | 할 수 있는 운동 | 전치사 + 명사(in the box) | 상자 안 고양이 |
| 2-5 | Is it ~? · Do you ~? | 이게 뭘까 퀴즈 | 좋아하는 운동 | 무엇을 좋아해 | 명사 and 명사 | 빵과 우유 |
| 3-1 | 일반동사 현재(I · you · we · they) | 나의 하루 | 우리 반 친구들 | 주말에 하는 일 | 주어 + be + 형용사 | 방과 교실 |
| 3-2 | There is · There are | 우리 동네와 자연 | 우리 동네와 탈것 | 동네 나들이 | 주어 + 동사 + 목적어 | 내가 하는 일 |
| 3-3 | 위치 전치사 | 내 방 어디에 | 숨바꼭질 | 물건 찾기 | 대문자 · 마침표 · 물음표 | 문장 부호 놀이 |
| 3-4 | 명령문 · Let's | 교실 약속 | 같이 놀자 | 놀이터 놀이 | There is ~ | 우리 동네에 있는 것 |
| 3-5 | What · Where · Who 의문문 | 누가 어디에 | 무엇이 있을까 | 교실 물건 묻기 | can 문장 | 나는 할 수 있어 |
| 4-1 | 3인칭 단수 -s | 형의 아침 | 선생님의 하루 | 친구가 하는 일 | be 동사 문장 | 나를 소개해요 |
| 4-2 | do · does 의문문 · 부정문 | 안 먹는 음식 | 좋아해요 싫어해요 | 방과 후 활동 | 일반동사 현재 | 매일 하는 일 |
| 4-3 | 현재진행 | 지금 뭐 해요 | 공원의 사람들 | 지금 무엇을 | have · like · want 문장 | 갖고 싶은 것 |
| 4-4 | 소유격(my · your · 's) | 누구의 물건 | 분실물 상자 | 내 물건 네 물건 | 부정문(don't · isn't) | 하지 않는 일 |
| 4-5 | 시각 · 요일(at · on) | 우리 반 시간표 | 요일별 계획 | 몇 시에 만날까 | can · can't | 할 수 있는 일 |
| 5-1 | 빈도부사 | 나의 습관 | 주말 습관 | 보건실에서 | 명사 복수형(-s · -es · 불규칙) | 우리 동네 사람들 |
| 5-2 | want to · would like | 하고 싶은 일 | 식당에서 주문 | 빵집에서 | There are | 교실에 있는 것들 |
| 5-3 | and · but · or | 두 친구 비교 | 이것 또는 저것 | 학용품 고르기 | 3인칭 단수 -s | 가족의 하루 |
| 5-4 | How many · How much | 시장 놀이 | 얼마예요 | 시장에서 계산 | 현재진행 | 운동장 풍경 |
| 5-5 | 목적격 대명사 | 도와준 친구 | 선물 주기 | 도서관 대출 | and · but 으로 두 문장 잇기 | 좋은 것과 싫은 것 |
| 6-1 | was · were | 어제의 날씨 | 어릴 때 나 | 분실물 센터 | does · doesn't | 친구의 취미 |
| 6-2 | 규칙 동사 과거 -ed | 지난 주말 | 방학 이야기 | 병원 접수 | 관사 a · an · the | 우리 동네 소개 |
| 6-3 | because | 그래서 좋아해 | 좋아하는 계절 | 영화관 매표소 | 빈도부사 | 나의 일주일 |
| 6-4 | When 의문문 | 언제 생일이야 | 학교 행사 | 생일 파티 초대 | 소유격 · 목적격 대명사 | 내 가족 소개 |
| 6-5 | some · any | 냉장고 속 음식 | 소풍 준비 | 마트 장보기 | because 로 이유 붙이기 | 좋아하는 까닭 |
| 7-1 | 불규칙 동사 과거 | 현장 체험 학습 | 지난 휴가 | 길 묻기 | was · were | 어제의 기분 |
| 7-2 | did 의문문 · 부정문 | 잃어버린 물건 | 어제 한 일 | 버스 타기 | 규칙 과거 -ed | 집안일 도운 날 |
| 7-3 | be going to | 방학 계획 | 이번 주말 계획 | 여행 계획 | 불규칙 과거 | 박물관 견학 |
| 7-4 | will | 미래의 나 | 내일 날씨 | 학교 축제 준비 | 순서 말(first · then · finally) | 숙제하는 순서 |
| 7-5 | 비교급 · 최상급 | 세계에서 가장 큰 | 동물 비교 | 물건 비교하기 | 일기 형식 | 나의 일기 |
| 8-1 | 과거진행 | 정전된 밤 | 그때 뭐 하고 있었어 | 어제 저녁 일 | will · be going to | 탐정 놀이 계획 |
| 8-2 | when 절 | 내가 어렸을 때 | 놀랐던 순간 | 주말 이야기 | 비교급 | 나와 동생 비교 |
| 8-3 | 부사 -ly | 살금살금 고양이 | 천천히 조심히 | 운동 경기 이야기 | 최상급 | 가장 좋은 선택 |
| 8-4 | must · have to | 도서관 규칙 | 안전 수칙 | 캠핑 준비 | 편지 형식(인사 · 끝맺음) | 할머니께 편지 |
| 8-5 | should | 건강한 습관 | 친구에게 조언 | 다친 친구 돕기 | when 절 | 행복했던 때 |
| 9-1 | 동명사 | 취미 생활 | 좋아하는 활동 | 취미 이야기 | to 부정사 | 이루고 싶은 목표 |
| 9-2 | to 부정사(명사 · 목적) | 꿈을 이루려면 | 배우고 싶은 것 | 여름 방학 계획 | 동명사 | 즐기는 운동 |
| 9-3 | 현재완료(경험) | 가 본 곳 | 해 본 일 | 요리해 본 경험 | should · must | 교실 규칙 만들기 |
| 9-4 | if 조건문(현재) | 비가 오면 | 과학 실험을 한다면 | 날씨에 따라 | so · after · before 절 | 학교 끝난 뒤 |
| 9-5 | so · after · before | 요리하는 순서 | 학교 가는 길 | 방 정리하는 날 | 과정 설명(순서) | 샌드위치 만들기 |
| 10-1 | 관계대명사 who · which · that | 존경하는 사람 | 내가 아는 사람 | 좋아하는 책 | 의견과 이유(I think ~ because ~) | 방학 숙제 필요할까 |
| 10-2 | 현재완료(계속 · 완료) | 오래 해 온 일 | 배워 온 것 | 학교 동아리 | 관계대명사 who · which | 본받고 싶은 사람 |
| 10-3 | 수동태(현재 · 과거) | 발명품 이야기 | 만들어진 물건 | 환경 지키기 | however · also | 규칙과 벌 |
| 10-4 | 간접 의문문 | 궁금한 것들 | 길 안내 부탁 | 여행지 고르기 | 서론-본문-결론 | 환경을 지키는 제안 |
| 10-5 | however · also | 도시와 시골 | 장단점 말하기 | 휴대폰 사용 | 현재완료 | 꾸준히 해 온 운동 |
| 11-1 | 관계부사 where · when | 내가 태어난 곳 | 기억에 남는 날 | 추억의 장소 | 비교 · 대조(both · while · on the other hand) | 종이책과 전자책 |
| 11-2 | 가정법 과거(If I were ~) | 하늘을 난다면 | 투명 인간이라면 | 상상 여행 | 관계대명사 that | 아끼는 물건 |
| 11-3 | 분사 수식 | 웃는 아이들 | 그림 속 사람들 | 들은 이야기 전하기 | 수동태 | 우리 학교의 역사 |
| 11-4 | as ~ as · 비교 표현 | 두 나라의 음식 | 옛날과 지금 | 두 물건 비교 | if 조건문 | 새로운 일에 도전하면 |
| 11-5 | although | 힘들었지만 | 실패해도 괜찮아 | 어려움 이겨내기 | for example 로 예시 들기 | 건강해지는 방법 |
| 12-1 | 의견 표현(In my opinion · I believe that) | 학교에 휴대폰을 가져와도 될까 | 나의 의견 발표 | 게임 시간 정하기 | 원인 · 결과(because of · as a result) | 대기 오염과 건강 |
| 12-2 | so that · in order to | 목표를 위한 노력 | 공부하는 방법 | 용돈 모으기 | 가정법 과거 | 내가 교장이라면 |
| 12-3 | used to | 예전의 우리 마을 | 어릴 적 습관 | 변한 것들 | although | 어려웠지만 해낸 일 |
| 12-4 | 조동사 수동태 | 지켜야 할 규칙 | 바뀌어야 할 것 | 도서관 규칙 | 요약 · 결론 쓰기 | 책 읽고 요약 |
| 12-5 | 문단 연결(first of all · in conclusion) | 나의 성장 이야기 | 두 주제 비교 발표 | 미래 직업 | 문단 연결 | 나의 꿈 |

단계마다 근거(성취기준): 1~3단계 [4영01-04~06] · [4영02-03~05] · [4영02-08], 4~6단계 [6영01-04~06] · [6영02-04~08], 7~9단계 [9영01-02~05] · [9영02-02~08], 10~12단계 [10공영1-01-02~06] · [10공영1-02-02~05] · [10공영2-02-06]. 쓰기 1~3단계 주제는 단원 낱말의 철자 패턴 · 어순 예시이고 문장을 만들게 하지 않는다. 단원 단어를 주제에 나누는 일은 묶음 1~4 에서 1~12단계 모두 끝났다(아래). 초안에서 바꾼 주제: 읽기 1-1 '가방 속 물건' → '간식과 장난감' · 1-4 '좋아하는 간식' → '좋아하는 물건'(a · an 단원에 apple · egg 를 넣으려고 묶음 짝을 바꿈), 쓰기 3-2 '아침에 먹는 것' → '내가 하는 일', 회화 5-4 '문구점 계산' → '시장에서 계산'. fix 1(검토 M-4)에서 주제 이름을 단원 단어에 맞게 바꿨다(낱말은 그대로): 읽기 1-2 '동물과 탈것' · 3-2 '우리 동네와 자연', 말하기 1-3 '내 얼굴과 몸' · 2-4 '몸으로 할 수 있는 일' · 3-2 '우리 동네와 탈것', 회화 3-2 '동네 나들이' · 3-5 '교실 물건 묻기', 쓰기 3-1 '방과 교실' · 3-4 '우리 동네에 있는 것'. 묶음 3 에서 7~9단계 초안 주제 셋을 단원 단어에 맞게 바꿨다: 회화 7-4 '날씨와 계획' → '학교 축제 준비'(날씨 낱말은 말하기 7-4 '내일 날씨'와 회화 7-3 이 씀), 쓰기 7-4 '라면 끓이기' → '숙제하는 순서'(noodle 이 1~9 vocab 밖이라 순서 말 then · finally 와 숙제 낱말 sentence · blank · dictionary 로), 읽기 9-5 '하루의 순서' → '요리하는 순서'(요리 묶음 I1 의 spread · mix · pour · stir 가 so · after · before 글에 맞음). 나머지 57 단원은 초안 주제 그대로다. 묶음 4 에서 10~12단계 초안 주제 셋을 바꿨다: 읽기 12-1 '교복은 필요할까' → '학교에 휴대폰을 가져와도 될까'(uniform 이 1~12 vocab 밖), 쓰기 12-1 '미세 먼지와 건강' → '대기 오염과 건강'(dust 가 vocab 밖, pollute · effect · source 로), 쓰기 11-4 '비가 온다면' → '새로운 일에 도전하면'(if 조건문 단원에 날씨 낱말이 없어 risk · attempt · struggle 로). 10~12단계의 나머지 57 단원도 초안 그대로다. fix 3(검토 review-p06a-3 R-2)에서 주제 이름이 단원 단어와 크게 어긋난 아홉을 낱말 · 학습 요소는 그대로 두고 이름만 바꿨다: 쓰기 8-1 '다가올 방학' → '탐정 놀이 계획', 쓰기 8-3 '우리 반 최고 기록' → '가장 좋은 선택', 회화 8-5 '감기 걸린 친구' → '다친 친구 돕기', 말하기 9-4 '시간이 있으면' → '과학 실험을 한다면', 말하기 9-5 '학교 가기 전후' → '학교 가는 길', 회화 9-3 '경험 나누기' → '요리해 본 경험', 회화 9-5 '주말 일과' → '방 정리하는 날', 쓰기 10-3 '반려동물 기르기' → '규칙과 벌', 쓰기 10-4 '급식 메뉴 제안' → '환경을 지키는 제안'.

### 1~12단계 단원 단어 배치(묶음 1~4 · fix 1 · fix 2, `seed/unit-specs.json` 242행)

단계마다 내용어(1~3단계 125 · 4~12단계 150)를 주제 묶음 10개로 나누고(1~3단계는 13개 묶음 A 다섯 + 12개 묶음 B 다섯, 4~12단계는 15개 열), 영역마다 묶음 둘을 그 단원 주제 · 학습 요소에 맞게 짝지어 단원을 만들었다(1~3단계 25 = 13 + 12, 4~12단계 30 = 15 + 15). 짝이 영역마다 다르므로 단원으로 나누는 방식이 영역마다 다르고(C61 (1)), 같은 단계 안에서 단원 단어 모음이 똑같은 단원은 영역 사이에도 없다(일회 검사). 단원 단어 차례가 배정 차례다(3.2: 1~3단계 k 5 라 5개씩 배정 수업 5개, 4~9단계 k 4 라 4개씩 8개 · 마지막 2개, 10~12단계 k 3 이라 3개씩 10개, 쓰기 6~9단계는 k 6 이라 6개씩 5개 · 쓰기 10~12단계는 k 5 라 5개씩 6개). 앞 묶음이 그 단원 학습 요소에 더 맞는 낱말이고(예: 1단계 단원 1 'a · an + 명사'는 apple · egg 가 든 음식 묶음 먼저, 3인칭 단수 단원은 일과 · 직업 묶음 먼저), 묶음 안 차례는 한 수업 글에 함께 쓰기 좋은 낱말끼리다. 학습 요소에 꼭 필요한 낱말은 첫 배정 수업으로 올렸다(fix 1 M-6 (나): 읽기 · 말하기 1-4 'I like ~'의 like, 회화 1-1 '토리와 첫 만남'의 name, 묶음 3 · 4 의 7~12단계 서른아홉 단원 — 아래 짝 표의 '앞:'). fix 2(검토 N-2)에서 5단계 D5 묶음은 습관 · 몸 상태 낱말(enjoy · hate · headache · fever · medicine)을 앞에, 빈도부사 빈자리에 넣은 lip · gum · full · heavy · light 를 뒤에 두었고, 2단계 head 는 형용사 묶음 A3 에서 몸 낱말 묶음 B4 로 옮기고 그 자리에 B4 의 jeans 를 두었다(단계 낱말 모음은 그대로). 학습 요소는 3.6 글자 그대로(생성기가 정본 표를 읽어 넣음)다. 쓰기 1단계는 묶음이 아니라 철자 패턴으로 나눴다(아래). 알파벳 · 소리 단원(읽기 · 쓰기 1단계 단원 0)은 학습 요소 '알파벳 이름과 기본 소리' · 주제 '알파벳 친구들' · 단원 단어 대표 낱말 26(a~z 차례, 5개씩 배정 수업 6개)이다. 모든 단원 단어는 자기 단원에서 열린 형태만 가진다(일회 검사 '단원 단어 × allowedForms' 0, (8)). 묶음 3(7~9단계): 8단계 -ly 부사 아홉(quickly · carefully · slowly · quietly · loudly · easily · happily · suddenly · safely)은 낱말 자체가 형태(adverb-ly, rst · 쓰기 8-3)라 한 묶음(H3)에 모으고, 네 영역 모두 그 묶음을 단원 3 이후(읽기 · 말하기 · 회화 8-3, 쓰기 8-5)에 두었다(검토 메모 1). 단원 주제는 단원 단어에 맞게 셋을 바꿨다(위 (3) 표 아래 문장). 묶음 4(10~12단계): 10단계 내용어 however 는 낱말 자체가 형태(however, rst 10-5 · 쓰기 10-3)라 J10 묶음에 두고, 읽기 · 말하기 · 회화는 단원 5, 쓰기는 단원 3 에 두었다(메모 1). 4단계 묶음 C3 · C5~C7, 5단계 D3 · D7 · D8, 6단계 E3 · E4 · E10 의 낱말은 묶음 4 맞바꿈(위 (1))으로 바뀌었다.

| 단계 | 묶음 | 낱말(차례) |
|---|---|---|
| 1 | A1 | cat · dog · pig · duck · fish · bird · rabbit · frog · sheep · puppy · fox · chicken · snake |
| 1 | A2 | apple · egg · banana · milk · cake · candy · cookie · cheese · grape · pizza · jam · rice · snack |
| 1 | A3 | bag · pen · pencil · book · cup · map · desk · chair · toy · drum · clock · lamp · bell |
| 1 | A4 | red · blue · yellow · green · black · white · pink · orange · color · big · small · long · short |
| 1 | A5 | one · two · three · four · five · six · seven · eight · nine · ten · tall · little · thin |
| 1 | B1 | hat · cap · sock · shoe · shirt · jacket · ball · doll · bike · kite · ring · game |
| 1 | B2 | eye · ear · nose · mouth · face · hand · leg · arm · old · neck · tooth · smile |
| 1 | B3 | bus · car · ship · truck · plane · bed · bath · dish · tent · home · shop · bank |
| 1 | B4 | sun · tree · flower · rock · lake · sand · rose · shell · king · swing · wing · song |
| 1 | B5 | like · thank · cute · nice · name · hot · top · fan · pot · brush · lunch · thick |
| 2 | A1 | happy · sad · hungry · thirsty · tired · sleepy · angry · fine · good · great · sick · sorry · glad |
| 2 | A2 | mom · dad · mother · father · brother · sister · baby · family · friend · boy · girl · man · woman |
| 2 | A3 | pretty · kind · smart · strong · funny · young · new · fast · slow · cool · beautiful · fun · jeans |
| 2 | A4 | swim · run · jump · fly · dance · sing · walk · climb · ski · skate · cook · read · write |
| 2 | A5 | play · soccer · baseball · basketball · tennis · badminton · music · catch · kick · throw · ride · draw · help |
| 2 | B1 | teacher · doctor · farmer · police · student · grandmother · grandfather · uncle · aunt · cousin · bad · busy |
| 2 | B2 | animal · giraffe · whale · dolphin · goat · penguin · turtle · food · fruit · potato · corn · strawberry |
| 2 | B3 | have · want · need · know · pet · gift · glasses · phone · computer · room · house · table |
| 2 | B4 | dress · skirt · pants · coat · scarf · sweater · hair · head · foot · finger · knee · shoulder |
| 2 | B5 | water · chocolate · sandwich · hamburger · ice cream · ready · cold · very · really · here · now · toe |
| 3 | A1 | eat · drink · go · come · wash · sleep · study · learn · watch · listen · look · see · make |
| 3 | A2 | school · park · zoo · farm · store · market · library · hospital · garden · playground · street · town · city |
| 3 | A3 | classroom · bedroom · bathroom · living room · restaurant · wall · floor · corner · side · front · bottom · middle · child |
| 3 | A4 | open · close · sit · stand · stop · wait · put · take · give · get · clean · turn · left |
| 3 | A5 | say · talk · ask · answer · meet · live · find · bring · let · age · birthday · question · number |
| 3 | B1 | basket · eraser · ruler · crayon · scissors · glue · notebook · textbook · paper · picture · bottle · card |
| 3 | B2 | sky · sea · cloud · rain · snow · wind · river · mountain · beach · grass · forest · air |
| 3 | B3 | train · taxi · airplane · subway · bridge · road · way · far · high · low · large · back |
| 3 | B4 | squirrel · puzzle · block · balloon · soup · fire · end · safe · quick · move · push · pull |
| 3 | B5 | dark · bright · round · soft · hard · cut · paint · fix · carry · pick · drop · hold |
| 4 | C1 | Monday · Tuesday · Wednesday · Thursday · Friday · Saturday · Sunday · week · weekend · today · tomorrow · day · next · soon · class |
| 4 | C2 | morning · afternoon · evening · night · time · hour · minute · o'clock · breakfast · dinner · homework · wake · arrive · early · late |
| 4 | C3 | singer · dancer · driver · artist · scientist · writer · pilot · person · kid · parent · adult · team · club · kitchen · skin |
| 4 | C4 | spring · summer · fall · winter · autumn · weather · sunny · rainy · cloudy · windy · snowy · warm · leaf · grow · change |
| 4 | C5 | art · science · difficult · English · Korean · easy · story · page · word · line · teach · speak · math · start · finish |
| 4 | C6 | camera · album · mail · photo · video · comic · movie · newspaper · news · letter · internet · use · thing · lot · present |
| 4 | C7 | hobby · sport · race · win · lose · party · touch · camp · ice · dream · point · special · tail · interesting · tape |
| 4 | C8 | love · think · feel · hear · worry · forget · remember · afraid · sure · true · right · wrong · same · favorite · free |
| 4 | C9 | bread · butter · meat · vegetable · body · heart · wear · keep · apartment · building · build · send · call · show · tell |
| 4 | C10 | together · again · already · alone · almost · also · just · only · too · well · enough · away · return · work · try |
| 5 | D1 | eleven · twelve · thirteen · fourteen · fifteen · sixteen · seventeen · eighteen · nineteen · twenty · thirty · forty · fifty · sixty · seventy |
| 5 | D2 | money · dollar · poor · cash · price · cost · pay · buy · sell · cheap · expensive · eighty · ninety · hundred · rich |
| 5 | D3 | menu · order · check · delicious · spaghetti · steak · salad · spoon · knife · glass · doughnut · biscuit · pie · tea · coffee |
| 5 | D4 | pear · watermelon · bean · tomato · beef · carrot · mushroom · fresh · sweet · sour · salty · bake · onion · pan · sale |
| 5 | D5 | enjoy · hate · headache · fever · medicine · customer · size · pair · piece · count · full · heavy · light · lip · gum |
| 5 | D6 | classmate · lesson · test · quiz · list · problem · idea · example · language · choose · decide · add · share · borrow · lend |
| 5 | D7 | player · match · goal · football · bat · score · coach · captain · band · concert · hike · medal · popular · excited · boring |
| 5 | D8 | son · daughter · husband · wife · gentleman · member · group · shy · joke · lady · brave · prince · surprised · quiet · world |
| 5 | D9 | post office · theater · supermarket · bookstore · museum · hotel · castle · country · island · ocean · desert · restroom · ticket · helicopter · boat |
| 5 | D10 | clothes · helmet · belt · button · ribbon · curtain · gray · telephone · television · radio · film · gold · stone · wood · plastic |
| 6 | E1 | January · February · March · April · June · July · August · September · October · November · December · calendar · date · month · year |
| 6 | E2 | yesterday · last · ago · tonight · vacation · holiday · trip · travel · visit · stay · noon · season · first · second · third |
| 6 | E3 | festival · event · congratulate · parade · invite · welcome · introduce · join · marry · kiss · hero · flag · guess · chance · luck |
| 6 | E4 | proud · mad · nervous · worried · laugh · shout · cry · wish · hope · lazy · happen · believe · miss · care · mind |
| 6 | E5 | oil · salt · sugar · flour · honey · sauce · cream · smell · taste · fill · cover · burn · lid · bee · grocery |
| 6 | E6 | nature · earth · rainbow · storm · moon · hill · dry · wet · field · ground · land · heat · deep · east · west |
| 6 | E7 | south · north · area · center · place · space · garage · office · board · circle · cross · enter · drive · van · speed |
| 6 | E8 | history · life · memory · future · habit · job · type · style · part · note · power · become · begin · understand · agree |
| 6 | E9 | exercise · fight · hit · hunt · hurry · break · fail · pass · save · set · hang · die · dead · double · twice |
| 6 | E10 | bone · mouse · brown · wool · cotton · guy · voice · weight · clever · honest · collect · plan · sound · ahead · lie |
| 7 | G1 | airport · station · journey · tour · flight · airline · highway · traffic · vehicle · schedule · pack · reserve · lane · path · cart |
| 7 | G2 | clear · freeze · shine · rise · shadow · valley · countryside · coast · shore · cliff · oak · branch · root · seed · bloom |
| 7 | G3 | huge · tiny · wide · narrow · broad · strange · weak · rare · common · simple · perfect · modern · total · half · dozen |
| 7 | G4 | fashion · brand · suit · fancy · handsome · ugly · gorgeous · beauty · blonde · cheek · chest · stomach · tongue · muscle · brain |
| 7 | G5 | steal · hide · dig · bite · feed · shake · blow · tear · bend · beat · bounce · bow · bark · rat · lamb |
| 7 | G6 | dictionary · sentence · grade · blank · correct · course · dialogue · row · chat · reply · mention · real · past · then · finally |
| 7 | G7 | stage · drama · audience · cheer · cinema · opera · comedy · pop · award · prize · champion · league · marathon · final · crown |
| 7 | G8 | stuff · battery · envelope · address · post · bill · business · company · clerk · model · photograph · deliver · repair · extra · plenty |
| 7 | G9 | palace · mystery · secret · wedding · couple · church · greet · excuse · pardon · favor · promise · alive · able · lead · follow |
| 7 | G10 | leave · spend · guide · exit · straight · prepare · arrange · quarter · shut · tap · bar · fair · terrible · fantastic · brilliant |
| 8 | H1 | pain · sore · hurt · injure · wound · accident · alarm · danger · ambulance · crash · bump · slip · scratch · shock · panic |
| 8 | H2 | health · diet · rest · relax · breathe · breath · calm · medical · ill · patient · cure · asleep · awake · stretch · smoke |
| 8 | H3 | quietly · slowly · carefully · quickly · loudly · easily · happily · suddenly · safely · aloud · forward · rush · chase · spy · float |
| 8 | H4 | rule · law · manner · polite · rude · duty · allow · avoid · warn · protect · guard · officer · attention · mark · notice |
| 8 | H5 | fear · fright · scare · upset · anger · mood · emotion · annoy · bother · disappoint · embarrass · frustrate · anxious · curious · confuse |
| 8 | H6 | flash · scream · thief · escape · rob · clue · search · trouble · crowd · mission · boss · soldier · army · angel · shoot |
| 8 | H7 | advice · suggest · trust · support · imagine · mean · discuss · topic · complain · expect · pretend · seem · prefer · choice · possible |
| 8 | H8 | effort · success · improve · solve · reach · continue · raise · receive · serve · fit · belong · own · partner · college · human |
| 8 | H9 | screen · text · click · title · tip · switch · lift · mess · iron · clip · grab · melt · bang · bit · spot |
| 8 | H10 | moment · still · even · teenage · else · instant · sudden · immediate · tight · cause · blind · serious · bless · fool · appear |
| 9 | I1 | spread · mix · pour · stir · boil · fry · wrap · fold · twist · measure · bunch · crisp · bitter · method · process |
| 9 | I2 | instrument · perform · poem · poet · tune · pattern · print · speech · scene · character · act · gesture · humor · folk · accent |
| 9 | I3 | experience · ever · once · adventure · volunteer · attend · challenge · dive · university · junior · fellow · heaven · fortune · forever · nowadays |
| 9 | I4 | flood · shade · view · sight · bay · edge · flow · soil · log · height · distance · rough · flat · leap · lean |
| 9 | I5 | experiment · record · result · report · chart · graph · code · metal · gas · blood · frame · base · string · disc · exact |
| 9 | I6 | explain · describe · advise · accept · offer · remind · matter · truth · sense · wise · maybe · perhaps · instead · quite · plus |
| 9 | I7 | skill · step · track · court · roll · tie · quit · trap · swallow · fat · weigh · gentle · smooth · sharp · hunger |
| 9 | I8 | furniture · carpet · item · pile · load · rent · handle · chain · brake · tire · square · shape · connect · drag · lay |
| 9 | I9 | disturb · pause · divide · exchange · announce · pity · comfort · cruel · beg · pray · bury · cop · cape · bore · loose |
| 9 | I10 | complete · gather · form · main · interest · level · especially · single · direct · contact · pronounce · case · sew · nowhere · poison |
| 10 | J1 | admire · honor · engineer · expert · lawyer · secretary · chief · staff · senior · male · female · judge · impress · role · birth |
| 10 | J2 | invent · machine · technology · engine · motor · automatic · electric · laser · create · design · develop · produce · factory · industry · operate |
| 10 | J3 | software · website · file · program · image · link · monitor · display · control · compute · account · comment · register · system · paragraph |
| 10 | J4 | pollute · waste · reduce · climate · temperature · atmosphere · resource · energy · coal · planet · cycle · damage · destroy · survive · harm |
| 10 | J5 | research · laboratory · examine · observe · prove · sample · scale · calculate · amount · average · cell · object · period · unit · project |
| 10 | J6 | locate · site · port · pipe · pole · section · survey · inform · request · detail · recognize · familiar · ordinary · certain · condition |
| 10 | J7 | delight · fascinate · charm · entertain · react · interrupt · ignore · blame · fault · innocent · punish · arrest · refuse · faint · recover |
| 10 | J8 | earn · afford · fee · credit · deal · charge · service · manage · apply · succeed · target · increase · gain · loss · limit |
| 10 | J9 | regular · balance · focus · concentrate · replace · remove · separate · include · contain · depend · delay · force · aid · apart · bare |
| 10 | J10 | however · recent · necessary · enormous · express · prevent · attract · attack · burst · boom · strike · ruin · vote · death · state |
| 11 | K1 | native · local · county · district · community · settle · situate · society · citizen · nation · culture · tradition · foreign · social · occasion |
| 11 | K2 | compare · similar · equal · rather · major · minor · complex · practical · pure · rapid · stable · extreme · entire · maximum · brief |
| 11 | K3 | desire · aim · dare · marvel · vision · soul · spirit · seek · mount · release · advance · expand · extend · fortunate · mass |
| 11 | K4 | struggle · suffer · attempt · hesitate · resist · risk · threat · lack · shame · guilt · tense · awkward · disgust · doubt · concern |
| 11 | K5 | article · magazine · series · channel · cast · catalogue · document · content · refer · represent · reflect · trace · relate · define · category |
| 11 | K6 | attitude · pride · self · tone · glance · admit · appreciate · respond · satisfy · convince · insist · deserve · occur · obvious · aware |
| 11 | K7 | agent · chairman · profession · hire · retire · shift · firm · fund · supply · license · require · involve · assist · access · feature |
| 11 | K8 | mental · slight · function · rate · adapt · affect · benefit · proper · privacy · recreation · suspect · tend · term · vary · previous |
| 11 | K9 | progress · promote · advertise · campaign · transfer · combine · complicate · command · confirm · demand · propose · educate · unite · contribute · issue |
| 11 | K10 | defense · legal · sum · due · solid · select · shelter · remain · altogether · aside · attach · approach · technique · exist · adopt |
| 12 | L1 | opinion · argue · debate · claim · reason · evidence · fact · belief · assume · consider · regard · remark · oppose · protest · deny |
| 12 | L2 | therefore · thus · moreover · otherwise · indeed · conclusion · instance · essay · context · general · specific · definite · absolute · element · concept |
| 12 | L3 | century · empire · royal · military · battle · enemy · war · peace · justice · govern · capital · civil · council · committee · glory |
| 12 | L4 | budget · income · expense · worth · economy · finance · tax · debt · trade · profit · invest · insure · property · possess · value |
| 12 | L5 | achieve · purpose · strategy · intend · determine · potential · capable · maintain · rely · proceed · engage · advantage · influence · career · standard |
| 12 | L6 | policy · public · private · responsible · appropriate · principle · moral · crime · accuse · grant · guarantee · secure · session · assign · appoint |
| 12 | L7 | effect · source · factor · physical · consume · crisis · analysis · theory · estimate · demonstrate · indicate · detect · structure · quality · range |
| 12 | L8 | desperate · intense · conscious · communicate · converse · individual · identity · depress · emphasize · client · sponsor · presence · grace · bond · characteristic |
| 12 | L9 | constant · alter · ease · current · various · found · establish · illustrate · background · figure · knowledge · exhaust · elect · bind · circumstance |
| 12 | L10 | labor · affair · politics · region · annual · basis · expose · forth · appeal · associate · assess · conflict · degree · internal · provide |

| 단계 | 영역 | 단원 1 | 단원 2 | 단원 3 | 단원 4 | 단원 5 |
|---|---|---|---|---|---|---|
| 1 | 읽기 | 간식과 장난감(A2 + B1) | 동물과 탈것(A1 + B3) | 알록달록 색깔(A4 + B4) | 좋아하는 물건(A3 + B5, 앞: like) | 하나 둘 세기(A5 + B2) |
| 1 | 말하기 | 과일 바구니(A2 + B4) | 내 장난감(A3 + B3) | 내 얼굴과 몸(A4 + B2) | 좋아하는 동물(A1 + B5, 앞: like) | 몇 개일까(A5 + B1) |
| 1 | 회화 | 토리와 첫 만남(A2 + B5, 앞: name) | 내 방 구경(A1 + B1) | 무슨 색일까(A4 + B3) | 좋아하는 것(A3 + B2) | 나이와 숫자(A5 + B4) |
| 1 | 쓰기 | 모자와 가방(철자 패턴) | 돼지와 개구리(철자 패턴) | 물고기와 배(철자 패턴) | 시계와 양말(철자 패턴) | 케이크와 자전거(철자 패턴) |
| 2 | 읽기 | 오늘 내 기분(A1 + B5) | 우리 가족(A2 + B1) | 내 반려동물(B3 + A3) | 나는 할 수 있어(A4 + B2) | 이게 뭘까 퀴즈(A5 + B4) |
| 2 | 말하기 | 배고프고 졸려요(A1 + B2) | 내 친구 소개(A3 + B1) | 생일 선물(B3 + A2) | 몸으로 할 수 있는 일(A4 + B4) | 좋아하는 운동(A5 + B5) |
| 2 | 회화 | 인사와 기분(A1 + B1) | 가족사진(A2 + B4) | 내가 가진 것(B5 + A3) | 할 수 있는 운동(A4 + B3) | 무엇을 좋아해(A5 + B2) |
| 2 | 쓰기 | 빨간 사과 큰 공(A3 + B2) | 강아지 세 마리(A2 + B5) | 공차기 놀이(A5 + B3) | 상자 안 고양이(B4 + A1) | 빵과 우유(B1 + A4) |
| 3 | 읽기 | 나의 하루(A1 + B4) | 우리 동네와 자연(A2 + B2) | 내 방 어디에(A3 + B1) | 교실 약속(A4 + B5) | 누가 어디에(A5 + B3) |
| 3 | 말하기 | 우리 반 친구들(A1 + B1) | 우리 동네와 탈것(A2 + B3) | 숨바꼭질(A3 + B4) | 같이 놀자(A4 + B2) | 무엇이 있을까(A5 + B5) |
| 3 | 회화 | 주말에 하는 일(A1 + B2) | 동네 나들이(A2 + B5) | 물건 찾기(A3 + B3) | 놀이터 놀이(A4 + B4) | 교실 물건 묻기(A5 + B1) |
| 3 | 쓰기 | 방과 교실(A3 + B5) | 내가 하는 일(A1 + B3) | 문장 부호 놀이(A5 + B2) | 우리 동네에 있는 것(A2 + B4) | 나는 할 수 있어(A4 + B1) |
| 4 | 읽기 | 형의 아침(C2 + C10) | 안 먹는 음식(C9 + C8) | 지금 뭐 해요(C7 + C4) | 누구의 물건(C6 + C3) | 우리 반 시간표(C1 + C5) |
| 4 | 말하기 | 선생님의 하루(C3 + C2) | 좋아해요 싫어해요(C8 + C5) | 공원의 사람들(C7 + C10) | 분실물 상자(C6 + C9) | 요일별 계획(C1 + C4) |
| 4 | 회화 | 친구가 하는 일(C3 + C10) | 방과 후 활동(C7 + C5) | 지금 무엇을(C4 + C9) | 내 물건 네 물건(C6 + C8) | 몇 시에 만날까(C1 + C2) |
| 4 | 쓰기 | 나를 소개해요(C3 + C8) | 매일 하는 일(C2 + C9) | 갖고 싶은 것(C6 + C7) | 하지 않는 일(C10 + C1) | 할 수 있는 일(C5 + C4) |
| 5 | 읽기 | 나의 습관(D5 + D7) | 하고 싶은 일(D9 + D3) | 두 친구 비교(D8 + D6) | 시장 놀이(D2 + D1) | 도와준 친구(D10 + D4) |
| 5 | 말하기 | 주말 습관(D5 + D8) | 식당에서 주문(D3 + D4) | 이것 또는 저것(D7 + D6) | 얼마예요(D2 + D10) | 선물 주기(D9 + D1) |
| 5 | 회화 | 보건실에서(D5 + D6) | 빵집에서(D3 + D2) | 학용품 고르기(D10 + D7) | 시장에서 계산(D1 + D4) | 도서관 대출(D8 + D9) |
| 5 | 쓰기 | 우리 동네 사람들(D8 + D1) | 교실에 있는 것들(D10 + D6) | 가족의 하루(D5 + D3) | 운동장 풍경(D7 + D9) | 좋은 것과 싫은 것(D4 + D2) |
| 6 | 읽기 | 어제의 날씨(E6 + E4) | 지난 주말(E2 + E9) | 그래서 좋아해(E8 + E7) | 언제 생일이야(E1 + E3) | 냉장고 속 음식(E5 + E10) |
| 6 | 말하기 | 어릴 때 나(E8 + E4) | 방학 이야기(E2 + E7) | 좋아하는 계절(E6 + E10) | 학교 행사(E1 + E9) | 소풍 준비(E5 + E3) |
| 6 | 회화 | 분실물 센터(E10 + E3) | 병원 접수(E9 + E4) | 영화관 매표소(E8 + E6) | 생일 파티 초대(E1 + E2) | 마트 장보기(E5 + E7) |
| 6 | 쓰기 | 친구의 취미(E9 + E3) | 우리 동네 소개(E7 + E6) | 나의 일주일(E2 + E5) | 내 가족 소개(E8 + E10) | 좋아하는 까닭(E4 + E1) |
| 7 | 읽기 | 현장 체험 학습(G10 + G5) | 잃어버린 물건(G8 + G4) | 방학 계획(G1 + G2) | 미래의 나(G9 + G6, 앞: able · lead · promise · follow) | 세계에서 가장 큰(G3 + G7) |
| 7 | 말하기 | 지난 휴가(G1 + G10) | 어제 한 일(G8 + G6) | 이번 주말 계획(G7 + G9) | 내일 날씨(G2 + G4) | 동물 비교(G3 + G5) |
| 7 | 회화 | 길 묻기(G10 + G8, 앞: straight · exit · guide · leave) | 버스 타기(G1 + G3, 앞: station · traffic · schedule · lane) | 여행 계획(G2 + G9, 앞: countryside · valley · coast · shore) | 학교 축제 준비(G7 + G6) | 물건 비교하기(G4 + G5) |
| 7 | 쓰기 | 어제의 기분(G10 + G4, 앞: terrible · fantastic · brilliant · fair · prepare · arrange) | 집안일 도운 날(G8 + G2, 앞: repair · deliver · stuff · battery · envelope · post) | 박물관 견학(G9 + G5, 앞: palace · mystery · secret · dig · hide · steal) | 숙제하는 순서(G6 + G3, 앞: then · finally · sentence · blank · dictionary · correct) | 나의 일기(G1 + G7) |
| 8 | 읽기 | 정전된 밤(H6 + H9) | 내가 어렸을 때(H10 + H8) | 살금살금 고양이(H3 + H5) | 도서관 규칙(H4 + H7) | 건강한 습관(H2 + H1) |
| 8 | 말하기 | 그때 뭐 하고 있었어(H9 + H10) | 놀랐던 순간(H5 + H6) | 천천히 조심히(H3 + H1) | 안전 수칙(H4 + H2, 앞: warn · protect · guard · avoid) | 친구에게 조언(H7 + H8) |
| 8 | 회화 | 어제 저녁 일(H9 + H2) | 주말 이야기(H5 + H8) | 운동 경기 이야기(H3 + H10, 앞: quickly · easily · suddenly · happily) | 캠핑 준비(H4 + H6, 앞: warn · protect · avoid · guard) | 다친 친구 돕기(H1 + H7) |
| 8 | 쓰기 | 탐정 놀이 계획(H6 + H10, 앞: mission · search · clue · crowd · moment · instant) | 나와 동생 비교(H5 + H2, 앞: calm · curious · anxious · upset · mood · diet) | 가장 좋은 선택(H7 + H9, 앞: choice · possible · title · prefer · screen · tip) | 할머니께 편지(H1 + H4) | 행복했던 때(H3 + H8, 앞: happily · success · effort · suddenly · easily · receive) |
| 9 | 읽기 | 취미 생활(I2 + I7) | 꿈을 이루려면(I6 + I10) | 가 본 곳(I3 + I5) | 비가 오면(I4 + I9) | 요리하는 순서(I1 + I8) |
| 9 | 말하기 | 좋아하는 활동(I7 + I1) | 배우고 싶은 것(I2 + I6) | 해 본 일(I3 + I8) | 과학 실험을 한다면(I5 + I9) | 학교 가는 길(I10 + I4) |
| 9 | 회화 | 취미 이야기(I2 + I5) | 여름 방학 계획(I3 + I6, 앞: volunteer · attend · challenge · adventure) | 요리해 본 경험(I1 + I10) | 날씨에 따라(I4 + I7) | 방 정리하는 날(I8 + I9) |
| 9 | 쓰기 | 이루고 싶은 목표(I3 + I4, 앞: challenge · university · volunteer · attend · junior · fortune) | 즐기는 운동(I7 + I10) | 교실 규칙 만들기(I9 + I2) | 학교 끝난 뒤(I5 + I8) | 샌드위치 만들기(I1 + I6, 앞: spread · wrap · fold · method · process · measure) |
| 10 | 읽기 | 존경하는 사람(J1 + J7) | 오래 해 온 일(J9 + J8, 앞: regular · balance · focus · concentrate) | 발명품 이야기(J2 + J5) | 궁금한 것들(J6 + J3) | 도시와 시골(J10 + J4) |
| 10 | 말하기 | 내가 아는 사람(J1 + J3) | 배워 온 것(J5 + J9) | 만들어진 물건(J2 + J7) | 길 안내 부탁(J6 + J4) | 장단점 말하기(J10 + J8) |
| 10 | 회화 | 좋아하는 책(J3 + J7, 앞: paragraph · fascinate · delight · entertain) | 학교 동아리(J5 + J8) | 환경 지키기(J4 + J9) | 여행지 고르기(J6 + J1) | 휴대폰 사용(J10 + J2, 앞: however · necessary · electric · technology) |
| 10 | 쓰기 | 방학 숙제 필요할까(J5 + J3, 앞: project · research · program · file · average · amount) | 본받고 싶은 사람(J1 + J2, 앞: admire · honor · impress · engineer · expert · invent) | 규칙과 벌(J10 + J7) | 환경을 지키는 제안(J4 + J8, 앞: waste · reduce · service · fee · charge · energy) | 꾸준히 해 온 운동(J9 + J6, 앞: regular · balance · focus · concentrate · force · aid) |
| 11 | 읽기 | 내가 태어난 곳(K1 + K5) | 하늘을 난다면(K3 + K8) | 웃는 아이들(K6 + K7) | 두 나라의 음식(K2 + K9) | 힘들었지만(K4 + K10) |
| 11 | 말하기 | 기억에 남는 날(K1 + K8, 앞: occasion · tradition · culture · society) | 투명 인간이라면(K3 + K5) | 그림 속 사람들(K6 + K10) | 옛날과 지금(K2 + K7) | 실패해도 괜찮아(K4 + K9) |
| 11 | 회화 | 추억의 장소(K1 + K9) | 상상 여행(K3 + K7) | 들은 이야기 전하기(K5 + K10) | 두 물건 비교(K2 + K6) | 어려움 이겨내기(K4 + K8) |
| 11 | 쓰기 | 종이책과 전자책(K2 + K5, 앞: compare · similar · equal · article · magazine · document) | 아끼는 물건(K6 + K1, 앞: pride · appreciate · self · tradition · culture · glance) | 우리 학교의 역사(K9 + K10, 앞: educate · progress · unite · contribute · promote · issue) | 새로운 일에 도전하면(K4 + K3, 앞: risk · attempt · struggle · hesitate · doubt · aim) | 건강해지는 방법(K8 + K7, 앞: mental · benefit · proper · rate · recreation · adapt) |
| 12 | 읽기 | 학교에 휴대폰을 가져와도 될까(L1 + L10) | 목표를 위한 노력(L5 + L4) | 예전의 우리 마을(L3 + L9) | 지켜야 할 규칙(L6 + L7) | 나의 성장 이야기(L2 + L8) |
| 12 | 말하기 | 나의 의견 발표(L1 + L7) | 공부하는 방법(L5 + L8) | 어릴 적 습관(L9 + L10, 앞: constant · alter · ease · current) | 바뀌어야 할 것(L6 + L3) | 두 주제 비교 발표(L2 + L4) |
| 12 | 회화 | 게임 시간 정하기(L1 + L2) | 용돈 모으기(L4 + L9, 앞: budget · income · expense · worth) | 변한 것들(L3 + L8) | 도서관 규칙(L6 + L10) | 미래 직업(L5 + L7, 앞: career · potential · capable · achieve) |
| 12 | 쓰기 | 대기 오염과 건강(L7 + L10, 앞: effect · source · factor · physical · consume · crisis) | 내가 교장이라면(L6 + L4, 앞: policy · budget · public · responsible · principle · grant) | 어려웠지만 해낸 일(L8 + L1, 앞: desperate · intense · conscious · communicate · belief · reason) | 책 읽고 요약(L2 + L3, 앞: conclusion · essay · general · specific · concept · context) | 나의 꿈(L5 + L9, 앞: career · achieve · purpose · potential · knowledge · figure) |

쓰기 1단계 철자 패턴 단원(3.6 쓰기 열). 낱말마다 맞는 패턴을 모두 표시하고, 모든 단원이 패턴 낱말을 가장 많이 갖게(균형 최소 18) 이분 매칭으로 놓은 뒤, 남은 패턴 낱말과 패턴 밖 낱말을 자리 남은 단원에 놓았다. 101/125(81%)가 제 패턴 단원에 있다. 단원 안 차례는 배정 수업(5개씩)마다 패턴 밖 낱말을 1~2개씩 섞었다(fix 1 M-6 (가) — 어느 배정 수업도 새 단어가 모두 패턴 밖이지 않게). 표의 괄호가 패턴 밖 낱말, '/'가 배정 수업 경계다.

| 단원 | 학습 요소 | 주제 | 패턴 낱말 수 | 배정 수업별 낱말 |
|---|---|---|---|---|
| 1 | 단모음 a · e | 모자와 가방 | 25 | seven · ten · red · yellow · cat / rabbit · apple · egg · candy · bag / hat · cap · pen · pencil · bed / desk · map · hand · leg · sand / jam · fan · lamp · tent · bell |
| 2 | 단모음 i · o · u | 돼지와 개구리 | 18 | six · big · little · (one) · (four) / dog · pig · frog · (green) · (small) / milk · cup · doll · bus · (pizza) / drum · sun · top · hot · (car) / pot · fox · puppy · wing · (old) |
| 3 | sh · ch · th | 물고기와 배 | 18 | three · short · fish · (two) · (eight) / sheep · cheese · chair · (orange) · (tall) / shoe · ship · mouth · tooth · (cookie) / shop · shirt · shell · brush · (toy) / dish · lunch · thin · bath · (arm) |
| 4 | -ck · -ng · -nk | 시계와 양말 | 19 | black · pink · long · (blue) · (color) / thank · duck · sock · truck · (bird) / ring · neck · rock · jacket · (book) / chicken · thick · clock · snack · (eye) / king · song · swing · bank · (tree) |
| 5 | 묵음 e(cake · bike) | 케이크와 자전거 | 21 | five · nine · white · like · (banana) / cake · grape · bike · kite · (ball) / nose · face · lake · cute · (ear) / nice · rose · home · game · (flower) / plane · snake · rice · name · smile |

읽기 1~2단계 그림 낱말 비율(그림 고르기가 많은 단계). 추상어 · 범주어 · 기능 같은 낱말(like · thank · color · name · good · have · very · animal 등)을 빼고 센 수다. 그림 문제의 보기는 P6b 그림 카탈로그 키가 있는 낱말만 낸다(6.3).

| 단원 | 주제 | 그림이 되는 낱말 | 그림 문제에 내기 어려운 낱말 |
|---|---|---|---|
| 1-1 | 간식과 장난감 | 24/25 | game |
| 1-2 | 동물과 탈것 | 25/25 | 없음 |
| 1-3 | 알록달록 색깔 | 23/25 | color · song |
| 1-4 | 좋아하는 물건 | 21/25 | like · thank · nice · name |
| 1-5 | 하나 둘 세기 | 24/25 | little |
| 2-1 | 오늘 내 기분 | 15/25 | fine · good · great · sorry · glad · ready · very · really · here · now |
| 2-2 | 우리 가족 | 21/25 | family · friend · bad · busy |
| 2-3 | 내 반려동물 | 17/25 | have · want · need · know · kind · smart · cool · fun |
| 2-4 | 나는 할 수 있어 | 22/25 | animal · food · fruit |
| 2-5 | 이게 뭘까 퀴즈 | 24/25 | music |

## (4) 형태 표 검출 표

### 묶음 0 검출기(`seed/lists/forms.json`, 1~3단계 도입 요소)

| id | 3.6 요소 | introducedAt rst · writing | 검출기 |
|---|---|---|---|
| have | 2-3 have · 쓰기 4-3 have · like · want 문장 | 2-3 · 1-1(fix 1: 쓰기 열은 검출하지 않음, C67 (1)) | 낱말 have · has · i've · you've · we've · they've |
| can | 2-4 can · 쓰기 3-5 can 문장 | 2-4 · 3-5 | 낱말 can |
| can-not | 2-4 can(부정 포함, 제안) · 쓰기 4-5 can · can't | 2-4 · 4-5 | 낱말 can't · cannot · can not |
| there-is | 3-2 There is · There are · 쓰기 3-4 There is ~ | 3-2 · 3-4 | 낱말 there is · there's, 정규식 `^\W*is\s+there\b` |
| there-are | 3-2 · 쓰기 5-2 There are | 3-2 · 5-2 | 낱말 there are, 정규식 `^\W*are\s+there\b` |
| lets | 3-4 명령문 · Let's | 3-4 · 3-4(묶음 2 에서 C64 (2)로 채움) | 낱말 let's · let us |

시험 문장은 아래 '형태 표 시험 문장 전체' 표에 모았다.

### 묶음 2 검출기(4~6단계 도입 요소, `forms.json` 15항목 더함)

한 열에만 도입 자리가 있는 형태는 다른 열을 같은 (단계, 단원)으로 채웠다(C64 (2)). 낱말 목록은 지금 vocab(4~6단계)과 1~3단계 후보 앞 125 의 동사에서 뽑았고, 묶음 1 · 3 · 4 에서 동사가 늘면 다시 뽑는다.

| id | 3.6 요소 | introducedAt rst · writing | 검출기 | 알고 둔 한계 |
|---|---|---|---|---|
| third-person-s | 4-1 3인칭 단수 -s · 쓰기 5-3 | 4-1 · 5-3 | 낱말: 명사로 쓰지 않는 동사의 3인칭 단수형(has · goes · eats · reads · teaches …). thanks · helps · plays · looks · lives · needs · wants · likes · loves 처럼 명사로도 흔한 꼴은 뺐다(fix 1 I-5). 정규식: he · she · it (+ 빈도부사 · also · just · only) + 3인칭 단수형 전부 | 명사로도 쓰는 동사(starts · works · plays · helps …)는 주어가 he · she · it 일 때만 잡는다. 'School starts at nine.'은 못 잡는다(사람 표본) |
| dont | 4-2 do 부정문 · 쓰기 4-4 부정문(don't) | 4-2 · 4-4 | 정규식 주어 I · you · we · they + don't · do not + 낱말(fix 1 M-2 · C67 (1)) | 부정 명령문 'Don't run.'은 3-4 명령문 요소라 잡지 않는다. 짧은 답 'No, I don't.'도 잡지 않는다(2-5 의 답). 명사 주어('My friends don't …')는 놓친다 |
| does | 4-2 does 의문문 · 부정문 · 쓰기 6-1 | 4-2 · 6-1 | 낱말 does · doesn't · does not | |
| present-progressive | 4-3 현재진행 · 쓰기 5-4 | 4-3 · 5-4 | 정규식 am · is · are · 'm · 're · 's (+ not) + vocab 동사 -ing 형 177(interesting · exciting · boring 같은 형용사 항목과 morning · evening 은 뺌) | 'My hobby is drawing.'(동명사)도 잡는다(4-3 앞 글에서만 문제) |
| be-not | 쓰기 4-4 부정문(isn't) | 4-4 · 4-4(rst 를 C64 (2)로) | 정규식 isn't · aren't · is not · are not · am not · 'm not · 's not · 're not + 낱말(fix 1 M-1) | 짧은 답 'No, it isn't.' · 'No, it's not.'은 잡지 않는다 |
| time-at | 4-5 시각 · 요일(at · on) | 4-5 · 4-5(쓰기를 C64 (2)로) | 정규식 at + 1~12 · 시각(7:30) 뒤에 o'clock · 문장 부호 · 글 끝이 올 때만(앞보기), at noon, on + 요일(s). o'clock 낱말은 뺐다(fix 1 I-1 · I-5) | 'Look at two dogs.'(수 + 복수)는 잡지 않는다. 'at night'은 잡지 않는다 |
| frequency-adverbs | 5-1 빈도부사 · 쓰기 6-3 | 5-1 · 6-3 | 낱말 always · usually · often · sometimes · never | |
| want-to | 5-2 want to | 5-2 · 4-3(해석) | 낱말 want to · wants to · wanted to | 쓰기 열은 4-3 'have · like · want 문장'에 want to 가 든다고 읽었다(9-1 to 부정사로 두면 쓰기 4~8단계 글이 'I want to …'를 못 쓴다). 결정이 필요한 것 |
| would-like | 5-2 would like | 5-2 · 5-2(쓰기를 C64 (2)로) | 정규식 would · 'd + like | |
| but | 5-3 and · but · or · 쓰기 5-5 | 5-3 · 5-5 | 낱말 but | and · or 는 검출 안 함 |
| how-much | 5-4 How many · How much | 5-4 · 5-4(쓰기를 C64 (2)로) | 낱말 how much | How many 는 검출 안 함(결정 ⑤) |
| past-be | 6-1 was · were · 쓰기 7-1 | 6-1 · 7-1 | 낱말 was · were · wasn't · weren't | |
| past-regular | 6-2 규칙 과거 -ed · 쓰기 7-2 | 6-2 · 7-2 | vocab 규칙 동사 과거형 104 낱말. closed · married · tired · worried · excited · surprised · bored · interested · scared · named · used 와 형용사 항목은 뺐다 | `\b[a-z]+ed\b` 정규식은 쓰지 않는다(red · bed) |
| because | 6-3 · 쓰기 6-5 | 6-3 · 6-5 | 낱말 because | because of(쓰기 12-1)도 6-3 으로 잡히지만 12 > 6 이라 문제없음 |
| when-question | 6-4 When 의문문 | 6-4 · 6-4(쓰기를 C64 (2)로) | 정규식 문장 첫 when … ? | 절(when 절 8-2)은 묶음 3 |

### fix 1 검출기(검토 I-1 · I-5 · M-1~M-3, 컨트롤러 판정 C67)

| id | 3.6 요소 | introducedAt rst · writing | 검출기 | 까닭 |
|---|---|---|---|---|
| he-she | 2-2 He · She · It is | 2-2 · 2-2(C64 (2)) | 낱말 he · she · he's · she's | 낱말 하나로 갈린다(M-3). it 은 1단계 회화 'What color is it?'에 필요해 뺐다 |
| we-they | 3-1 일반동사 현재(I · you · we · they) | 3-1 · 3-1(C64 (2)) | 낱말 we · they · we're · they're | 같음 |
| object-pronouns | 5-5 목적격 대명사 · 쓰기 6-4 | 5-5 · 6-4 | 낱말 him · us · them | me 는 1단계 교실 영어라 뺐다. 'Let us go.'는 lets 와 함께 잡힌다(5-5 앞 글은 Let's 를 쓴다) |
| some-any | 6-5 some · any | 6-5 · 6-5(C64 (2)) | 낱말 some · any | something · anything 은 기능어 단계 6: 읽기는 범위 밖 비율, 나머지 영역은 사람 표본이 맡는다(fix 2 N-4 (나)) |
| have(쓰기 열) | 쓰기 4-3 | 2-3 · 1-1 | (그대로) | 쓰기 2-3 '동사 + 목적어'가 have 를 먼저 써서 쓰기 열은 검출하지 않는다(1-1 로 둠 = 쓰기에서 늘 열림, like 와 같은 꼴, C67 (1)) |
| frequency-adverbs | 5-1 빈도부사 · 쓰기 6-3 | 5-1 · 6-3 | (그대로) | 다섯 낱말은 기능어(5단계)가 되어 단원 단어가 아니다(C67 (2)) |

### 묶음 3 검출기(7~9단계 도입 요소, `forms.json` 17항목 더함 — 모두 42)

낱말 목록은 1~9단계 vocab 에서 뽑았다(`build_bundle.py`). 걸릴 셋 · 안 걸릴 셋 이상의 시험 문장은 아래 '형태 표 시험 문장 전체'에 있다(브리프 2절 4).

| id | 3.6 요소 | introducedAt rst · writing | 검출기 | 까닭 · 한계 |
|---|---|---|---|---|
| past-irregular | 7-1 불규칙 동사 과거 · 쓰기 7-3 | 7-1 · 7-3 | 낱말 81(went · ate · saw · took · had …): 불규칙 표의 과거형 가운데 원형과 같은 꼴(read · put · cut · hit · beat …)과 1~9단계 vocab 낱말(rose · left · bit · lay · bore)을 뺐다. lost · found 는 대명사 주어 뒤만, got 은 have · has · 've 뒤가 아닐 때만 잡는다 | 'the lost and found box'(4-4 '분실물 상자' · 6-1 '분실물 센터')를 막지 않으려고. 정규식에 뒤보기(서버 Node 컴파일만, review-p06a-2 7절 4) |
| did | 7-2 did 의문문 · 부정문 | 7-2 · 7-3 | 낱말 did · didn't · did not | 쓰기 열에는 따로 없어 불규칙 과거(쓰기 7-3)와 같은 자리로 둔다(제안) |
| going-to | 7-3 be going to · 쓰기 8-1 | 7-3 · 8-1 | 정규식 going to + 동사 원형(명사로도 쓰는 visit · play 포함, 'go to ~'의 목적지로 흔한 work · camp · shop · practice · school 등은 뺌) | 'I am going to school.'은 안 걸린다 |
| will | 7-4 will · 쓰기 8-1 | 7-4 · 8-1 | 낱말 will · won't, 정규식 'll | 이름 Will 은 거짓 양성(시드 이름은 Tom 등만 씀) |
| comparative | 7-5 비교급 · 쓰기 8-2 | 7-5 · 8-2 | 낱말 -er 꼴 103(vocab 형용사 · 부사의 비교급, better · worse), 정규식 than · more · less + 두 음절 넘는 형용사 | later 는 뺐다('See you later.'). 'more milk'(수량)는 안 걸린다 |
| superlative | 7-5 비교급 · 최상급 · 쓰기 8-3 | 7-5 · 8-3 | 낱말 -est 꼴 104(best · worst 포함), 정규식 most · least + 두 음절 넘는 형용사 | 'Most kids …'는 안 걸린다. 'Do your best.'는 걸린다(관용구 거짓 양성) |
| past-progressive | 8-1 과거진행 | 8-1 · 8-1(C64 (2)) | 정규식 was · were + 동사 -ing 형(boring · interesting 같은 형용사, morning · evening 은 뺌) | |
| when-clause | 8-2 when 절 · 쓰기 8-5 | 8-2 · 8-5 | 정규식 when + 주어(대명사 · my · the · a · this …) | 'When is …?' · 'When do you …?'(6-4 when-question)는 안 걸린다 |
| adverb-ly | 8-3 부사 -ly | 8-3 · 8-3(C64 (2)) | 낱말 10(quickly · carefully · slowly · quietly · loudly · easily · happily · suddenly · safely · especially) | really · only · early · usually(기능어 5) · finally(쓰기 7-4 순서 말)와 형용사 -ly(lonely · friendly · ugly)는 뺐다 |
| must | 8-4 must · have to · 쓰기 9-3 | 8-4 · 9-3 | 낱말 must · mustn't | |
| have-to | 8-4 must · have to | 8-4 · 8-4(C64 (2)) | 정규식 have · has · had + to + 낱말 | had 는 불규칙 과거(7-1)로도 잡힌다 |
| should | 8-5 should · 쓰기 9-3 | 8-5 · 9-3 | 낱말 should · shouldn't | |
| gerund | 9-1 동명사 · 쓰기 9-2 | 9-1 · 9-2 | 정규식 like · love · enjoy · hate · finish · stop · start · begin · keep · practice · mind + -ing, 문장 첫 -ing(명사 꼴 building · living room 의 living 은 뺌) | 전치사 + -ing('Thank you for coming.')와 go + -ing 는 놓친다(부분, 사람 표본) |
| to-infinitive | 9-2 to 부정사 · 쓰기 9-1 | 9-2 · 9-1 | 정규식 to + 동사 원형. want(s · ed) to · would like to · 'd like to · going to · have · has · had to · used to 뒤는 뒤보기로 뺀다 | 'go to work · to camp'처럼 목적지로 흔한 낱말은 놓친다. 'be able to'는 걸린다(9-2 전 able 예문은 'an able student') |
| present-perfect | 9-3 현재완료 · 쓰기 10-5 | 9-3 · 10-5 | 정규식 have · has · 've (+ not · never · ever · just · already) + 과거분사, 'Have you ever + 과거분사'(과거분사 = 불규칙 표 · 규칙 -ed · been, -ed 형용사는 뺌) | 'have got'(가짐)은 got 이 과거분사 목록에 없어 안 걸린다 |
| if | 9-4 if 조건문 · 쓰기 11-4 | 9-4 · 11-4 | 낱말 if | if 는 9단계 기능어라 9-4 전 단원 단어가 아니다 |
| conj-so-after-before | 9-5 so · after · before · 쓰기 9-4 | 9-5 · 9-4 | 정규식 ', so' + 낱말, after · before + 대명사 주어 | 'after school' · 'before bed'(전치사)는 안 걸린다. 쉼표 없는 so 절은 놓친다 |

he-she · we-they 낱말에 줄임꼴 he'll · she'll · we'll · they'll · we've · they've 를 더했다(묶음 3 시험 문장에서 놓친 것). third-person-s 낱말 목록에서 명사 꼴과 같은 것(leaves · tears · spots …)을 뺐다(leave · tear 가 7단계 동사가 되면서). 4~6단계의 낱말 목록은 1~9단계 동사로 다시 뽑아 3인칭 단수 낱말 221 · 규칙 과거 251 이다.

### 묶음 4 검출기(10~12단계 도입 요소, `forms.json` 16항목 더함 — 모두 58)

10~12단계 형태가 모두 정식 검출기가 되어 예문 검사용 임시 형태 표(`later-forms.json`)는 비었다. 걸릴 셋 · 안 걸릴 셋 이상의 시험 문장은 아래 '형태 표 시험 문장 전체'에 있다.

| id | 3.6 요소 | introducedAt rst · writing | 검출기 | 까닭 · 한계 |
|---|---|---|---|---|
| relative-who-which | 10-1 관계대명사 who · which · that · 쓰기 10-2 | 10-1 · 10-2 | 정규식: 물음표로 끝나지 않는 문장의 who · which · whom · whose | that 은 지시 · 접속과 가를 수 없어 검출 안 함. 물음표로 끝나는 문장 안의 관계절(Is this the boy who sings?)은 놓친다 |
| passive | 10-3 수동태 · 쓰기 11-3 | 10-3 · 11-3 | 정규식 be 꼴 + 과거분사(lost · left · hurt · broken · finished · done · gone · been 과 -ed 형용사는 뺌) | 'My bag is lost.' · 'The store is closed.'(형용사)를 막지 않으려고. 'is used to + 동사'와 'was born'은 놓친다 |
| indirect-question | 10-4 간접 의문문 | 10-4 · 10-4 | 정규식 know · wonder · ask · tell me · remember · forget · understand · explain + wh 낱말 · whether · if | 쓰기 열에 없어 같은 자리(C64 (2)). know how to 도 잡는다 |
| however | 10-5 however · also · 쓰기 10-3 | 10-5 · 10-3 | 낱말 however, 정규식 문장 첫 'Also,' | 10단계 내용어 however 는 읽기 · 말하기 · 회화 10-5, 쓰기 10-3 단원에만 둔다(메모 1) |
| relative-adverb | 11-1 관계부사 where · when | 11-1 · 11-1 | 정규식 place · day · time · reason · house … + where · when · why + 주어 | 쓰기 열에 없어 같은 자리. 그 밖의 명사 뒤 관계부사(the planet where …)는 놓친다 |
| second-conditional | 11-2 가정법 과거 · 쓰기 12-2 | 11-2 · 12-2 | 정규식 if + 주어 + were, would · 'd + 낱말(like · you · rather 앞은 뺌) | 'Would you …?'(부탁)와 'would like' · 'would rather'는 안 걸린다 |
| as-as | 11-4 as ~ as · 비교 표현 | 11-4 · 11-4 | 정규식 as + 낱말 한두 개 + as | as soon as · as well as 도 잡는다. 'the same as' 같은 다른 비교 표현은 사람 표본 |
| although | 11-5 although · 쓰기 12-3 | 11-5 · 12-3 | 낱말 although · though | even though 도 잡는다 |
| contrast-connector | 쓰기 11-1 비교 · 대조(both · while · on the other hand) | 11-1 · 11-1 | 정규식 while + 주어 · 문장 첫 while, 낱말 on the other hand | rst 열에 없어 같은 자리(C64 (2)). 'for a while'은 안 걸린다. both 는 기능어 단계 5 |
| for-example | 쓰기 11-5 for example 로 예시 들기 | 11-5 · 11-5 | 낱말 for example · for instance | rst 열에 없어 같은 자리 |
| opinion-phrase | 12-1 의견 표현 · 쓰기 10-1 | 12-1 · 10-1 | 낱말 in my opinion, 정규식 I believe that | I think 는 검출 안 함(3.3 회화 10 이 먼저 씀) |
| so-that | 12-2 so that · in order to | 12-2 · 12-2 | 낱말 so that · in order to | 쓰기 열에 없어 같은 자리. 'so happy that'은 안 걸린다 |
| used-to | 12-3 used to | 12-3 · 12-3 | 정규식 used to + 동사 원형(be · get used to 는 뒤보기로 뺌), didn't use to + 낱말 | 쓰기 열에 없어 같은 자리. 정규식에 뒤보기(서버 Node 컴파일만) |
| modal-passive | 12-4 조동사 수동태 | 12-4 · 12-4 | 정규식 조동사 + be + 과거분사 | 쓰기 열에 없어 같은 자리. passive 도 함께 잡힌다 |
| paragraph-connector | 12-5 문단 연결 · 쓰기 12-5 | 12-5 · 12-5 | 낱말 first of all · in conclusion · to sum up | First, Then 은 순서 말(쓰기 7-4)이라 안 걸린다 |
| cause-effect | 쓰기 12-1 원인 · 결과(because of · as a result) | 12-1 · 12-1 | 낱말 because of · as a result | rst 열에 없어 같은 자리. because(6-3)는 따로 |

묶음 4 에서 앞 묶음 검출기를 고친 것: he-she · we-they 낱말에 he'd · she'd · we'd · they'd 를 더했고, past-regular 에 대명사 주어 + used(+ to 가 아닌 낱말) 정규식을 더했다(used 는 형용사 · used to 와 겹쳐 낱말 목록에서 빼 두었기 때문). to-infinitive 뒤보기에 use 를 더해 'didn't use to'의 to 를 to 부정사로 잡지 않는다.

### fix 3 정형 표현 예외(검토 review-p06a-3 R-1, 컨트롤러 판정)

검출기를 끄지 않고, 정본 3.3 이 앞 단계에서 먼저 요구하는 꼴(C64 (3) · C67 (1))만 좁은 구 단위 예외로 뺐다. 정규식 앞보기 · 뒤보기는 서버 Node 컴파일에서만 쓴다.

| 검출기(도입 rst) | 예외 | 까닭(정본) | 여전히 잡는 것 |
|---|---|---|---|
| to-infinitive(9-2) | nice · glad · good · happy · pleased + to meet · see + you, sorry to hear + that · about, time to + 동사(Minor 정리 N-2: 가주어 꼴은 잡음) | 3.3 인사 토막(모든 단계 · 회화 1-1 '토리와 첫 만남'): Nice to meet you. · Good to see you. · I'm happy to see you. 회화 5-1 '보건실에서'의 공감 I'm sorry to hear that. 'It's time to go home.'(시각 4-5)의 time to 는 9-2 의 명사 · 목적 용법이 아니다 | I am happy to help you. · It is nice to swim. · I went there to buy milk. · It is good to see the stars. · I was sorry to hear the news. |
| comparative(7-5) | older · younger + brother(s) · sister(s) · cousin(s), feel · feels · felt · feeling · get · gets · getting · got + better | 가족 호칭은 어휘(읽기 2-2 · 회화 2-2 · 말하기 2-2 · 쓰기 6-4), feel better 는 회화 5-1 '보건실에서'의 정형 표현 | She is taller than me. · My brother is older than me. · This one is better. |
| superlative(7-5) | best + friend(s) | best friend 는 명사구(말하기 2-2 '내 친구 소개') | It is the biggest city. · He is the best player. · You are the best! |
| have(2-3) | 문장 첫 Have + a nice · good · great + day · time · weekend · trip · night, Have fun | 3.3 정리 토막의 끝인사(모든 단계, 1단계 포함) | I have a nice day. · Have you seen it? |
| lets(3-4) | Let's + learn · talk · keep(Minor 정리 N-1: 정본에 영어 예가 있는 셋만) | 3.3 연결 말 'Let's learn some new words!' · 'Nice! Now let's talk about colors.'(인사 끝 · 대화 턴, 1~3단계 포함)과 6.3 예 'That's fun! Let's keep talking.' — 수업을 이끄는 말 | Let's play soccer. · Let's read a book. · Let us go home. |
| can(2-4) | Can you say it · that again | 1단계 다시 말하기 힌트 | Can you swim? |
| some-any(6-5) | some new words, Would you like some ~ | 3.3 연결 말 'Let's learn some new words!'(모든 단계), 5-2 'would like'의 권하는 말 | I want some juice. · Do you want some cake? |
| want-to(5-2) | want to talk more | 3.3 'Do you want to talk more?'(목표 턴에 앱이 모든 단계에서 붙임) | I want to learn English. · Do you want to come? |
| gerund(9-1) | keep talking 만 뺌(Minor 정리 N-3: keep + 다른 -ing 는 잡음) | 6.3 예 'Let's keep talking.' | I like swimming. · Reading is fun. · Keep trying! · He kept running. · Stop talking, please. |

훑기(일회 검사 `tests/.tmp/p06/scan_phrases.ts`, 입력 `scan_phrases.json`): 정본 3.3 · 6.3 의 영어 예(연결 말 · 반응 · 답 두 개 · 답 예시 · 목표 턴 말)와, 3.3 · 6.3 이 칸만 정한 인사 · 안부 · 칭찬 · 힌트 · 끝인사의 전형 문장, 가족 · 보건실 · 가게 · 시각 정형 표현을 그 꼴이 필요한 가장 이른 (영역, 단계, 단원)에서 형태 표로 돌렸다. 처음 판에서 막힌 11(위 표의 lets · can · some-any · superlative · comparative)을 예외로 풀어 79 문장이 모두 통과한다. 1~8단계 vocab 예문 1,293 은 예문 일회 검사가 그 단계 형태 표로 이미 돌린다(0).

| 문장 | 필요한 곳 | 정본 근거 | 잡힌 형태 | 판정 |
|---|---|---|---|---|
| Hi, I'm Tori! | talk 1-1 | 인사(3.3, 모든 단계) | 없음 | 통과 |
| Nice to meet you. | talk 1-1 | 인사 | 없음 | 통과 |
| Nice to meet you, too. | talk 1-1 | 인사 | 없음 | 통과 |
| Nice to meet you, Tori! | talk 1-1 | 인사 | 없음 | 통과 |
| Glad to meet you. | talk 1-1 | 인사 | 없음 | 통과 |
| Nice to see you again. | talk 1-1 | 인사 | 없음 | 통과 |
| Good to see you. | talk 1-1 | 인사 | 없음 | 통과 |
| I'm happy to see you. | talk 1-1 | 인사 | 없음 | 통과 |
| How are you? | talk 1-1 | 안부 | 없음 | 통과 |
| How are you today? | talk 1-1 | 안부 | 없음 | 통과 |
| I'm fine, thank you. | talk 1-1 | 안부 답 | 없음 | 통과 |
| I'm good, thanks. | talk 1-1 | 안부 답 | 없음 | 통과 |
| Good morning! | talk 1-1 | 인사 | 없음 | 통과 |
| Let's learn some new words! | talk 1-1 | 연결 말(3.3 예) | 없음 | 통과 |
| Nice! Now let's talk about colors. | talk 1-1 | 연결 말(3.3 예) | 없음 | 통과 |
| Let's talk about animals. | talk 1-1 | 연결 말 | 없음 | 통과 |
| Are you ready? | talk 1-1 | 연결 말 | 없음 | 통과 |
| Two apples! Here you go. | talk 1-5 | 연결 말(3.3 예) | 없음 | 통과 |
| That's fun! Let's keep talking. | talk 1-1 | 반응(6.3 예) | 없음 | 통과 |
| Great! | talk 1-1 | 칭찬 | 없음 | 통과 |
| Good job! | talk 1-1 | 칭찬 | 없음 | 통과 |
| Great job! | talk 1-1 | 칭찬 | 없음 | 통과 |
| Well done! | talk 1-1 | 칭찬 | 없음 | 통과 |
| That's right! | talk 1-1 | 칭찬 | 없음 | 통과 |
| You're right! | talk 1-1 | 칭찬 | 없음 | 통과 |
| Me too! | talk 1-1 | 맞장구 | 없음 | 통과 |
| Really? | talk 1-1 | 맞장구 | 없음 | 통과 |
| Can you say it again? | talk 1-1 | 힌트 · 다시 말하기 | 없음 | 통과 |
| Try again. | talk 1-1 | 힌트 | 없음 | 통과 |
| Say it with me. | talk 1-1 | 힌트 | 없음 | 통과 |
| One more time, please. | talk 1-1 | 힌트 | 없음 | 통과 |
| I'm nine. | talk 1-5 | 답 두 개(3.3 예) | 없음 | 통과 |
| I like red. | talk 1-4 | 답 예시(6.3 예) | 없음 | 통과 |
| And you? | talk 1-4 | 답 예시(6.3 예) | 없음 | 통과 |
| My name is Momo. | talk 1-1 | 답 예시 | 없음 | 통과 |
| How about you? | talk 1-1 | 되묻기 | 없음 | 통과 |
| What about you? | talk 1-1 | 되묻기 | 없음 | 통과 |
| Bye! | talk 1-1 | 끝인사(3.3 정리) | 없음 | 통과 |
| Goodbye! | talk 1-1 | 끝인사 | 없음 | 통과 |
| See you next time! | talk 1-1 | 끝인사 | 없음 | 통과 |
| See you later! | talk 1-1 | 끝인사 | 없음 | 통과 |
| See you soon! | talk 1-1 | 끝인사 | 없음 | 통과 |
| Have a nice day! | talk 1-1 | 끝인사 | 없음 | 통과 |
| Have a good day! | talk 1-1 | 끝인사 | 없음 | 통과 |
| Have fun! | talk 1-1 | 끝인사 | 없음 | 통과 |
| Thank you for talking with me. | talk 1-1 | 끝인사 | 없음 | 통과 |
| Take care! | talk 1-1 | 끝인사 | 없음 | 통과 |
| Good luck! | talk 1-1 | 끝인사 | 없음 | 통과 |
| Do you want to talk more? | talk 1-1 | 목표 턴 말(3.3, 앱이 붙임) | 없음 | 통과 |
| My older brother is tall. | reading 2-2 | 가족(읽기 2-2 우리 가족) | 없음 | 통과 |
| My younger sister is cute. | talk 2-2 | 가족(회화 2-2 가족사진) | 없음 | 통과 |
| This is my big brother. | talk 2-2 | 가족 | 없음 | 통과 |
| She is my best friend. | speaking 2-2 | 친구(말하기 2-2 내 친구 소개) | he-she | 통과 |
| He is my best friend. | speaking 2-2 | 친구 | he-she | 통과 |
| How old is your older sister? | talk 2-2 | 가족 | 없음 | 통과 |
| I have an older sister. | writing 6-4 | 가족(쓰기 6-4 내 가족 소개) | have | 통과 |
| Feel better soon! | talk 5-1 | 보건실(회화 5-1) | 없음 | 통과 |
| I feel better now. | talk 5-1 | 보건실 | 없음 | 통과 |
| I hope you feel better. | talk 5-1 | 보건실 | 없음 | 통과 |
| Get well soon! | talk 5-1 | 보건실 | 없음 | 통과 |
| Are you okay? | talk 5-1 | 보건실 | 없음 | 통과 |
| I'm sorry to hear that. | talk 5-1 | 보건실(공감) | 없음 | 통과 |
| That's too bad. | talk 5-1 | 보건실 | 없음 | 통과 |
| What time is it? | talk 4-5 | 시각(4-5) | 없음 | 통과 |
| It's time for lunch. | talk 4-5 | 시각 | 없음 | 통과 |
| It's time to go home. | talk 4-5 | 시각 | 없음 | 통과 |
| Have a good weekend! | talk 4-1 | 끝인사 | 없음 | 통과 |
| See you on Monday! | talk 4-5 | 요일 | time-at | 통과 |
| Can I help you? | talk 5-2 | 가게(회화 5-2 빵집에서) | can | 통과 |
| I'd like a cake, please. | talk 5-2 | 가게 | would-like | 통과 |
| Would you like some juice? | talk 5-2 | 가게 | 없음 | 통과 |
| Do you want to come? | talk 5-2 | want to(5-2) | want-to | 통과 |
| I want to have a dog. | writing 4-3 | want to(쓰기 4-3) | have · want-to | 통과 |
| How much is it? | talk 5-4 | 계산(5-4) | how-much | 통과 |
| Happy birthday! | talk 6-4 | 생일 파티 초대(6-4) | 없음 | 통과 |
| I'm going to visit my aunt. | talk 7-3 | be going to(7-3) | present-progressive · going-to | 통과 |
| I have to go now. | talk 8-4 | have to(8-4) | have · have-to | 통과 |
| You have to wear a helmet. | talk 8-4 | have to | have · have-to | 통과 |
| I would like to order, please. | talk 5-2 | would like to(5-2) | would-like | 통과 |

9-2(to 부정사) 보다 앞서 드는 to 꼴이 to-infinitive 검출기에 잡히지 않는지(뒤보기 · 예외) 확인했다.

| to 꼴 | 어디서 도입(3.6 · 단계표) | to-infinitive 에서 | 확인 문장 |
|---|---|---|---|
| want to | rst 5-2 'want to · would like', 쓰기 4-3 'have · like · want 문장' | 뒤보기로 뺌(want-to 검출기가 맡음) | I want to learn English. → want-to |
| would like to · 'd like to | rst 5-2 | 뒤보기로 뺌(would-like) | I would like to go. → would-like |
| be going to | rst 7-3 · 쓰기 8-1 | 뒤보기로 뺌(going-to) | I am going to swim. → going-to · present-progressive |
| have to · has to · had to | rst 8-4 · 쓰기 8-4 | 뒤보기로 뺌(have-to) | I have to go. → have-to · have |
| used to | rst 12-3 · 쓰기 12-3 | 뒤보기로 뺌(used-to) | I used to live in Seoul. → used-to |
| like to · need to · how to | 3.6 에 9-2 앞 자리 없음 | 잡음(9-2 몫) | She likes to read. → to-infinitive |
| Nice to meet you 꼴 · time to | 3.3 인사 토막 · 시각 4-5 | 예외(위 표) | Nice to meet you. → 없음 |

fix 3(검토 R-3): present-progressive · past-progressive · gerund 의 -ing 꼴과 past-regular · present-perfect · passive 의 -ed · 과거분사 꼴, past-irregular 의 과거 꼴을 생성 규칙이 아니라 vocab forms 칸(extra · drop 반영)에서 다시 뽑았다. 형용사로 뺀 bored · tired · worried 같은 제외 목록은 그대로다. 들어온 꼴: -ing panicking · travelling, -ed lied · panicked · sewed · showed · travelled(lied · sewed · showed 는 원형 + -ed 꼴이라 불규칙 과거에서 규칙 과거로 옮김). 빠진 꼴: -ing panicing, -ed paniced · upsetted, 불규칙 과거 forgave · lied · lit · sank · sewed · showed · spun · stuck · swept, 불규칙 과거분사 bet · forgiven · lit · spun · stuck · sunk · swept(vocab 에 없는 동사 forgive · light(동사) · sink · spin · stick · sweep · bet 의 꼴과 규칙 꼴로 옮긴 것). 시험 문장: She was panicking. · Everyone is panicking. · He panicked. · They have panicked before. · He lied to me. · My grandmother sewed a doll. · She sews well. · They are lying on the grass.

### 알고 둔 한계(사람 표본 몫, 브리프 2절 3)

검출기가 놓치는 것(거짓 음성)은 사람 표본(P8 · P9)이 맡는다. 낱말 · 정규식으로 가르면 거짓 양성이 더 커지는 것들이다.

| 놓치는 것 | 예 | 까닭 |
|---|---|---|
| 명사 주어 + 명사로도 흔한 3인칭 단수(4-1) | My dad plays tennis. · Mom likes cats. · School starts at nine. | fix 1 I-5 에서 plays · likes · looks · helps · needs · wants · lives 를 낱말 목록에서 뺐다(C67 (1)의 대가). he · she · it 주어는 정규식이 잡는다 |
| 명사 주어 + don't(4-2) | My friends don't like milk. | dont 는 I · you · we · they 주어 꼴만 잡는다(부정 명령문 · 짧은 답을 막지 않으려고) |
| 명사 주어 문장의 2-2 · 3-1 형태 | My mom is kind. · The kids play. | he-she · we-they 는 대명사 낱말만 잡는다 |
| 'Let us go.'(3-4 lets) | — | lets 와 object-pronouns(us, 5-5)가 함께 잡아 5-5 전에는 막힌다. 5-5 앞 글은 Let's 를 쓴다(거짓 양성 쪽) |
| 전치사 + -ing · go + -ing(9-1) | Thank you for coming. · Let's go swimming. | gerund 는 동사 + -ing · 문장 첫 -ing 만 잡는다 |
| 쉼표 없는 so 절(9-5) | It was cold so I wore a coat. | so 부사(so happy)와 가를 수 없다 |
| 목적지 낱말 + to(9-2) | I want to go to work. 의 to work | 목적지로 흔한 낱말을 to-infinitive 동사 목록에서 뺐다 |
| lost · found · got 의 일부(7-1) | The dog got lost. · a lost bag | 대명사 주어 뒤 lost · found 와 have 뒤가 아닌 got 만 잡는다 |
| 주어가 낀 진행형(4-3) | Are you going …? | present-progressive 는 be + -ing 가 붙어 있을 때만 잡는다(going-to 는 잡힘) |
| 관용구 거짓 양성 | Do your best. · Will(이름) · You are the best! | 낱말 검출기라 피할 수 없다. 시드 글은 피한다. 정본 3.3 이 앞 단계에 요구하는 정형 표현은 피할 수 없어 fix 3 에서 좁은 구 단위 예외를 두었다(아래 'fix 3 정형 표현 예외') |
| most + 두 음절 형용사(7-5) | the most famous singer | superlative 의 most 정규식은 두 음절 넘는 형용사만 본다(review-p06a-3 6절 1) |
| vocab 밖 -ly 부사(8-3) | sings beautifully | adverb-ly 는 vocab -ly 부사 낱말만 본다 |
| get better + 명사(7-5) | get better grades | feel · get better 를 비교급에서 빼서 'get better + 명사'의 비교급을 놓친다(review-p06a-4 N-2, 사람 표본 몫) |
| 물음표 문장 안의 관계절(10-1) | Is this the boy who sings? | relative-who-which 는 물음표로 끝나는 문장을 보지 않는다(의문사 who · which 와 가르려고) |
| 형용사로 흔한 과거분사의 수동태(10-3) | The window is broken. · My bag is lost. · It is used to cut paper. | lost · left · hurt · broken · finished · used 를 수동태 목록에서 뺐다 |
| 정해진 명사 밖의 관계부사(11-1) | the planet where we live | relative-adverb 는 place · day · time · reason 같은 명사 뒤만 잡는다 |
| 다른 비교 표현(11-4) | the same as · different from | as-as 는 as ~ as 꼴만 잡는다 |

### 형태 표 시험 문장 전체(fix 3 · Minor 정리 뒤 370 문장)

일회 검사 `check_lists.ts`(`formsIn`)로 돌린 결과다. 모두 기대와 같다(금지어 89 줄과 합쳐 459 줄, RESULT 0). 검토가 든 거짓 양성 다섯(Look at two dogs. · Point at three cats. · Look at one bird. · Thanks, Tori! · Thanks for the gift.)은 '없음'이다. fix 3 에서 정형 표현 예외가 통과하는 문장 20 과, 진짜 형태가 계속 잡히는 문장 15, panic · lie · sew 활용형 문장 8 을 더했고, Minor 정리에서 Let's · 가주어 to 부정사 · keep + -ing 문장 9 를 더했다. 'Would you like some tea?'는 예외가 되어 기대값을 '없음'으로 고쳤다.

| 문장 | 기대 | 결과 | 판정 |
|---|---|---|---|
| I have a red bag. | have | have | 맞음 |
| She has two cats. | have · third-person-s · he-she | have · third-person-s · he-she | 맞음 |
| We've got a big dog. | have · we-they | have · we-they | 맞음 |
| Behave in the library. | 없음 | 없음 | 맞음 |
| I like the black hat. | 없음 | 없음 | 맞음 |
| I can swim. | can | can | 맞음 |
| Can you jump? | can | can | 맞음 |
| I like candy. | 없음 | 없음 | 맞음 |
| This is a cat. | 없음 | 없음 | 맞음 |
| I can't swim. | can-not | can-not | 맞음 |
| He cannot fly. | can-not · he-she | can-not · he-she | 맞음 |
| You can not go. | can · can-not | can · can-not | 맞음 |
| I see two cans. | 없음 | 없음 | 맞음 |
| There is a cat on the bed. | there-is | there-is | 맞음 |
| Is there a pen in the box? | there-is | there-is | 맞음 |
| There's a dog in the park. | there-is | there-is | 맞음 |
| The cat is there. | 없음 | 없음 | 맞음 |
| Where is the cat? | 없음 | 없음 | 맞음 |
| Is it there? | 없음 | 없음 | 맞음 |
| There are three dogs. | there-are | there-are | 맞음 |
| Are there any eggs? | there-are · some-any | there-are · some-any | 맞음 |
| They are there. | we-they | we-they | 맞음 |
| Where are the cats? | 없음 | 없음 | 맞음 |
| We are there now. | we-they | we-they | 맞음 |
| Let's play! | lets | lets | 맞음 |
| Let us go home. | lets · object-pronouns | lets · object-pronouns | 맞음 |
| Mom lets me play. | third-person-s | third-person-s | 맞음 |
| Look at the letters. | 없음 | 없음 | 맞음 |
| Mom let us play. | lets · object-pronouns | lets · object-pronouns | 맞음 |
| He plays soccer. | third-person-s · he-she | third-person-s · he-she | 맞음 |
| She likes cats. | third-person-s · he-she | third-person-s · he-she | 맞음 |
| My dad reads the newspaper. | third-person-s | third-person-s | 맞음 |
| I like cats. | 없음 | 없음 | 맞음 |
| They play soccer. | we-they | we-they | 맞음 |
| The kids play games. | 없음 | 없음 | 맞음 |
| I see three ships. | 없음 | 없음 | 맞음 |
| It is hot. | 없음 | 없음 | 맞음 |
| I don't like milk. | dont | dont | 맞음 |
| Do not run in the hall. | 없음 | 없음 | 맞음 |
| No, I don't. | 없음 | 없음 | 맞음 |
| Do you like milk? | 없음 | 없음 | 맞음 |
| Does she like milk? | does · he-she | does · he-she | 맞음 |
| He doesn't swim. | does · he-she | does · he-she | 맞음 |
| Dogs like bones. | 없음 | 없음 | 맞음 |
| She is reading a book. | present-progressive · he-she | present-progressive · he-she | 맞음 |
| We're playing soccer. | present-progressive · we-they | present-progressive · we-they | 맞음 |
| The building is tall. | 없음 | 없음 | 맞음 |
| It is morning. | 없음 | 없음 | 맞음 |
| This is interesting. | 없음 | 없음 | 맞음 |
| He is a king. | he-she | he-she | 맞음 |
| It isn't big. | be-not | be-not | 맞음 |
| I'm not hungry. | be-not | be-not | 맞음 |
| No, it isn't. | 없음 | 없음 | 맞음 |
| It is big. | 없음 | 없음 | 맞음 |
| School starts at nine o'clock. | time-at | time-at | 맞음 |
| We swim on Mondays. | time-at · we-they | time-at · we-they | 맞음 |
| Let's meet at 3. | lets · time-at | lets · time-at | 맞음 |
| Look at the cat. | 없음 | 없음 | 맞음 |
| The cat is on the desk. | 없음 | 없음 | 맞음 |
| I always eat breakfast. | frequency-adverbs | frequency-adverbs | 맞음 |
| He never cries. | third-person-s · frequency-adverbs · he-she | third-person-s · frequency-adverbs · he-she | 맞음 |
| I eat breakfast. | 없음 | 없음 | 맞음 |
| Every day is fun. | 없음 | 없음 | 맞음 |
| I want to swim. | want-to | want-to | 맞음 |
| She wants to dance. | third-person-s · want-to · he-she | third-person-s · want-to · he-she | 맞음 |
| I want water. | 없음 | 없음 | 맞음 |
| Do you want a cookie? | 없음 | 없음 | 맞음 |
| I would like a cookie. | would-like | would-like | 맞음 |
| I'd like some tea. | would-like · some-any | would-like · some-any | 맞음 |
| I like cookies. | 없음 | 없음 | 맞음 |
| Would you help me? | 없음 | 없음 | 맞음 |
| I like cats, but I don't like dogs. | dont · but | dont · but | 맞음 |
| It is small but strong. | but | but | 맞음 |
| I like cats and dogs. | 없음 | 없음 | 맞음 |
| The butter is soft. | 없음 | 없음 | 맞음 |
| How much is it? | how-much | how-much | 맞음 |
| How much milk do you want? | how-much | how-much | 맞음 |
| How many cats are there? | 없음 | 없음 | 맞음 |
| I like it very much. | 없음 | 없음 | 맞음 |
| I was sick. | past-be | past-be | 맞음 |
| They were happy. | past-be · we-they | past-be · we-they | 맞음 |
| I am sick. | 없음 | 없음 | 맞음 |
| We are happy. | we-they | we-they | 맞음 |
| We played soccer. | past-regular · we-they | past-regular · we-they | 맞음 |
| She visited her grandmother. | past-regular · he-she | past-regular · he-she | 맞음 |
| The shop is closed. | 없음 | 없음 | 맞음 |
| I am tired. | 없음 | 없음 | 맞음 |
| The bed is red. | 없음 | 없음 | 맞음 |
| I need a bed. | 없음 | 없음 | 맞음 |
| I stayed home because I was sick. | past-be · past-regular · because | past-be · past-regular · because | 맞음 |
| Because it is cold, I wear a coat. | because | because | 맞음 |
| I stayed home. | past-regular | past-regular | 맞음 |
| When is your birthday? | when-question | when-question | 맞음 |
| When do you get up? | when-question | when-question | 맞음 |
| I get up when the sun comes up. | third-person-s · when-clause | third-person-s · when-clause | 맞음 |
| What time is it? | 없음 | 없음 | 맞음 |
| Look at two dogs. | 없음 | 없음 | 맞음 |
| Point at three cats. | 없음 | 없음 | 맞음 |
| Look at one bird. | 없음 | 없음 | 맞음 |
| Thanks, Tori! | 없음 | 없음 | 맞음 |
| Thanks for the gift. | 없음 | 없음 | 맞음 |
| We eat at 7:30. | time-at · we-they | time-at · we-they | 맞음 |
| I get up at seven. | time-at | time-at | 맞음 |
| It's not a cat. | be-not | be-not | 맞음 |
| No, it's not. | 없음 | 없음 | 맞음 |
| Don't run. | 없음 | 없음 | 맞음 |
| Wait! Don't go. | 없음 | 없음 | 맞음 |
| We do not swim. | dont · we-they | dont · we-they | 맞음 |
| You don't like milk. | dont | dont | 맞음 |
| He is tall. | he-she | he-she | 맞음 |
| They like cats. | we-they | we-they | 맞음 |
| I like him. | object-pronouns | object-pronouns | 맞음 |
| Do you have any pets? | have · some-any | have · some-any | 맞음 |
| I want some juice. | some-any | some-any | 맞음 |
| The hen is here. | 없음 | 없음 | 맞음 |
| There is a cat. | there-is | there-is | 맞음 |
| Something is in the box. | 없음 | 없음 | 맞음 |
| The bus is here. | 없음 | 없음 | 맞음 |
| We went to the zoo. | past-irregular · we-they | we-they · past-irregular | 맞음 |
| She ate a big apple. | past-irregular · he-she | he-she · past-irregular | 맞음 |
| I found my key. | past-irregular | past-irregular | 맞음 |
| I lost my bag. | past-irregular | past-irregular | 맞음 |
| We go to the zoo. | we-they | we-they | 맞음 |
| Turn left at the bank. | 없음 | 없음 | 맞음 |
| The lost and found box is here. | 없음 | 없음 | 맞음 |
| Did you eat lunch? | did | did | 맞음 |
| I didn't see him. | did · object-pronouns | object-pronouns · did | 맞음 |
| We did not go. | did · we-they | we-they · did | 맞음 |
| Do you like it? | 없음 | 없음 | 맞음 |
| I do my homework. | 없음 | 없음 | 맞음 |
| She does her homework. | does · he-she | does · he-she | 맞음 |
| I am going to swim. | going-to · present-progressive | present-progressive · going-to | 맞음 |
| They are going to visit Jeju. | going-to · present-progressive · we-they | present-progressive · we-they · going-to | 맞음 |
| Are you going to be there? | going-to | going-to | 맞음 |
| I am going to school. | present-progressive | present-progressive | 맞음 |
| Let's go to the park. | lets | lets | 맞음 |
| I go to bed at nine. | time-at | time-at | 맞음 |
| I will help you. | will | will | 맞음 |
| It won't rain. | will | will | 맞음 |
| We'll go tomorrow. | will · we-they | we-they · will | 맞음 |
| I want a bike. | 없음 | 없음 | 맞음 |
| I wish you well. | 없음 | 없음 | 맞음 |
| Win the game! | 없음 | 없음 | 맞음 |
| My dog is bigger than your dog. | comparative | comparative | 맞음 |
| This box is heavier. | comparative | comparative | 맞음 |
| This book is more interesting. | comparative | comparative | 맞음 |
| My dog is big. | 없음 | 없음 | 맞음 |
| I want more milk. | 없음 | 없음 | 맞음 |
| See you later. | 없음 | 없음 | 맞음 |
| He is the tallest boy. | superlative · he-she | he-she · superlative | 맞음 |
| This is the best day. | superlative | superlative | 맞음 |
| It is the most beautiful flower. | superlative | superlative | 맞음 |
| Most kids like pizza. | 없음 | 없음 | 맞음 |
| The west is far. | 없음 | 없음 | 맞음 |
| We need some rest. | we-they · some-any | we-they · some-any | 맞음 |
| I was reading a book. | past-progressive · past-be | past-be · past-progressive | 맞음 |
| They were playing soccer. | past-progressive · past-be · we-they | past-be · we-they · past-progressive | 맞음 |
| She wasn't sleeping. | past-progressive · past-be · he-she | past-be · he-she · past-progressive | 맞음 |
| The movie was boring. | past-be | past-be | 맞음 |
| It was morning. | past-be | past-be | 맞음 |
| I am reading a book. | present-progressive | present-progressive | 맞음 |
| When I was young, I lived in Jeju. | when-clause · past-be · past-regular | past-be · past-regular · when-clause | 맞음 |
| I was happy when my dad came home. | when-clause · past-be · past-irregular | past-be · past-irregular · when-clause | 맞음 |
| Call me when you get home. | when-clause | when-clause | 맞음 |
| When is your birthday? | when-question | when-question | 맞음 |
| When do you get up? | when-question | when-question | 맞음 |
| When can you come? | when-question · can | can · when-question | 맞음 |
| He runs quickly. | adverb-ly · he-she · third-person-s | third-person-s · he-she · adverb-ly | 맞음 |
| Walk slowly, please. | adverb-ly | adverb-ly | 맞음 |
| She sang happily. | adverb-ly · he-she · past-irregular | he-she · past-irregular · adverb-ly | 맞음 |
| I really like it. | 없음 | 없음 | 맞음 |
| I get up early. | 없음 | 없음 | 맞음 |
| Finally, we arrived. | past-regular · we-they | past-regular · we-they | 맞음 |
| You must stop. | must | must | 맞음 |
| We mustn't run. | must · we-they | we-they · must | 맞음 |
| I must go now. | must | must | 맞음 |
| I like music. | 없음 | 없음 | 맞음 |
| The museum is big. | 없음 | 없음 | 맞음 |
| My family is happy. | 없음 | 없음 | 맞음 |
| I have to go. | have-to · have | have · have-to | 맞음 |
| She has to study. | have-to · have · he-she · third-person-s | have · third-person-s · he-she · have-to | 맞음 |
| We had to wait. | have-to · we-they · past-irregular | we-they · past-irregular · have-to | 맞음 |
| I have two dogs. | have | have | 맞음 |
| Give it to me. | 없음 | 없음 | 맞음 |
| I have a cat too. | have | have | 맞음 |
| You should rest. | should | should | 맞음 |
| We shouldn't be late. | should · we-they | we-they · should | 맞음 |
| Should I go? | should | should | 맞음 |
| My shoulder is sore. | 없음 | 없음 | 맞음 |
| Show me your picture. | 없음 | 없음 | 맞음 |
| Look at the shore. | 없음 | 없음 | 맞음 |
| I like swimming. | gerund | gerund | 맞음 |
| Reading is fun. | gerund | gerund | 맞음 |
| Stop running! | gerund | gerund | 맞음 |
| I am swimming. | present-progressive | present-progressive | 맞음 |
| Building blocks are fun. | 없음 | 없음 | 맞음 |
| Morning is nice. | 없음 | 없음 | 맞음 |
| I need to go. | to-infinitive | to-infinitive | 맞음 |
| It is fun to swim. | to-infinitive | to-infinitive | 맞음 |
| She likes to read. | to-infinitive · he-she · third-person-s | third-person-s · he-she · to-infinitive | 맞음 |
| I want to go. | want-to | want-to | 맞음 |
| I would like to go. | would-like | would-like | 맞음 |
| I go to school. | 없음 | 없음 | 맞음 |
| I have been to Jeju. | present-perfect · have | have · present-perfect | 맞음 |
| She has eaten lunch. | present-perfect · have · he-she · third-person-s | have · third-person-s · he-she · present-perfect | 맞음 |
| Have you ever seen a whale? | present-perfect · have | have · present-perfect | 맞음 |
| I have a pet. | have | have | 맞음 |
| I have lunch at noon. | have · time-at | have · time-at | 맞음 |
| I have to eat. | have-to · have | have · have-to | 맞음 |
| If it rains, we stay home. | if · we-they · third-person-s | third-person-s · we-they · if | 맞음 |
| Tell me if you can come. | if · can · indirect-question | can · if · indirect-question | 맞음 |
| I will go if you go. | if · will | will · if | 맞음 |
| I like gifts. | 없음 | 없음 | 맞음 |
| This is a gift. | 없음 | 없음 | 맞음 |
| Is it fun? | 없음 | 없음 | 맞음 |
| It was cold, so I wore a coat. | conj-so-after-before · past-be · past-irregular | past-be · past-irregular · conj-so-after-before | 맞음 |
| After I eat lunch, I play. | conj-so-after-before | conj-so-after-before | 맞음 |
| Wash your hands before you eat. | conj-so-after-before | conj-so-after-before | 맞음 |
| I play after school. | 없음 | 없음 | 맞음 |
| I was so happy. | past-be | past-be | 맞음 |
| Brush your teeth before bed. | 없음 | 없음 | 맞음 |
| She is the girl who sings well. | relative-who-which · he-she · third-person-s | third-person-s · he-she · relative-who-which | 맞음 |
| This is the book which I like. | relative-who-which | relative-who-which | 맞음 |
| I have a friend whose dog is big. | relative-who-which · have | have · relative-who-which | 맞음 |
| Who is your teacher? | 없음 | 없음 | 맞음 |
| Which bag is yours? | 없음 | 없음 | 맞음 |
| Whose bag is this? | 없음 | 없음 | 맞음 |
| The cake was made by my mom. | passive · past-be · past-irregular | past-be · past-irregular · passive | 맞음 |
| English is spoken in many countries. | passive | passive | 맞음 |
| The window was broken by the ball. | past-be | past-be | 맞음 |
| Our bodies are made of cells. | passive · past-irregular | past-irregular · passive | 맞음 |
| I am excited. | 없음 | 없음 | 맞음 |
| My bag is lost. | 없음 | 없음 | 맞음 |
| The store is closed. | 없음 | 없음 | 맞음 |
| Do you know where the port is? | indirect-question | indirect-question | 맞음 |
| I wonder why he is late. | indirect-question · he-she | he-she · indirect-question | 맞음 |
| Tell me what you want. | indirect-question | indirect-question | 맞음 |
| Where is the port? | 없음 | 없음 | 맞음 |
| Ask me again. | 없음 | 없음 | 맞음 |
| I know the answer. | 없음 | 없음 | 맞음 |
| However, it was fun. | however · past-be | past-be · however | 맞음 |
| Also, it was long. | past-be · however | past-be · however | 맞음 |
| The test was easy; however, I made one mistake. | however · past-be · past-irregular | past-be · past-irregular · however | 맞음 |
| I also like it. | 없음 | 없음 | 맞음 |
| How are you? | 없음 | 없음 | 맞음 |
| Also is a word. | 없음 | 없음 | 맞음 |
| This is the place where I was born. | relative-adverb · past-be | past-be · relative-adverb | 맞음 |
| I remember the day when we met. | relative-adverb · when-clause · we-they · past-irregular | we-they · past-irregular · when-clause · relative-adverb | 맞음 |
| That is the reason why I came. | relative-adverb · past-irregular | past-irregular · relative-adverb | 맞음 |
| Where do you live? | 없음 | 없음 | 맞음 |
| I go to the place every day. | 없음 | 없음 | 맞음 |
| When is your birthday? | when-question | when-question | 맞음 |
| If I were a bird, I would fly. | second-conditional · if · past-be | past-be · if · second-conditional | 맞음 |
| I would go with you. | second-conditional | second-conditional | 맞음 |
| She'd buy a new car. | second-conditional · he-she | he-she · second-conditional | 맞음 |
| Would you like some tea? | 없음 | 없음 | 맞음 |
| Would you help me? | 없음 | 없음 | 맞음 |
| I'd like a cookie. | would-like | would-like | 맞음 |
| He is as tall as his dad. | as-as · he-she | he-she · as-as | 맞음 |
| Come home as soon as you can. | as-as · can | can · as-as | 맞음 |
| She is as kind as a mother. | as-as · he-she | he-she · as-as | 맞음 |
| He works as a doctor. | he-she · third-person-s | third-person-s · he-she | 맞음 |
| As you know, it is late. | 없음 | 없음 | 맞음 |
| I like it as well. | 없음 | 없음 | 맞음 |
| Although it rained, we played. | although · we-they · past-regular | past-regular · we-they · although | 맞음 |
| It was fun, though. | although · past-be | past-be · although | 맞음 |
| Even though I was tired, I went. | although · past-be · past-irregular | past-be · past-irregular · although | 맞음 |
| Through the window, I saw it. | past-irregular | past-irregular | 맞음 |
| I thought so. | past-irregular | past-irregular | 맞음 |
| We walked through the park. | we-they · past-regular | past-regular · we-they | 맞음 |
| I read while my sister sleeps. | contrast-connector · third-person-s | third-person-s · contrast-connector | 맞음 |
| While it rained, we stayed home. | contrast-connector · we-they · past-regular | past-regular · we-they · contrast-connector | 맞음 |
| On the other hand, cats are quiet. | contrast-connector | contrast-connector | 맞음 |
| Wait for a while. | 없음 | 없음 | 맞음 |
| I will be back in a while. | will | will | 맞음 |
| The other cat is white. | 없음 | 없음 | 맞음 |
| For example, apples are red. | for-example | for-example | 맞음 |
| For instance, I like tennis. | for-example | for-example | 맞음 |
| Here is an example for example lovers. | for-example | for-example | 맞음 |
| This is an example. | 없음 | 없음 | 맞음 |
| This is for you. | 없음 | 없음 | 맞음 |
| I need an instance of it. | 없음 | 없음 | 맞음 |
| In my opinion, homework is good. | opinion-phrase | opinion-phrase | 맞음 |
| I believe that you can do it. | opinion-phrase · can | can · opinion-phrase | 맞음 |
| In my opinion, it is fun. | opinion-phrase | opinion-phrase | 맞음 |
| I believe you. | 없음 | 없음 | 맞음 |
| My opinion is different. | 없음 | 없음 | 맞음 |
| I think it is fun. | 없음 | 없음 | 맞음 |
| I study hard so that I can pass. | so-that · can | can · so-that | 맞음 |
| I run in order to stay healthy. | so-that · to-infinitive | to-infinitive · so-that | 맞음 |
| Speak slowly so that we understand. | so-that · adverb-ly · we-they | we-they · adverb-ly · so-that | 맞음 |
| I was so happy that I cried. | past-be · past-regular | past-be · past-regular | 맞음 |
| The order is ready. | 없음 | 없음 | 맞음 |
| So, what do you think? | 없음 | 없음 | 맞음 |
| I used to live in Seoul. | used-to | used-to | 맞음 |
| She used to play the piano. | used-to · he-she | he-she · used-to | 맞음 |
| I didn't use to like fish. | used-to · did | did · used-to | 맞음 |
| I used a pencil. | past-regular | past-regular | 맞음 |
| I am used to the cold. | 없음 | 없음 | 맞음 |
| This is used to cut paper. | 없음 | 없음 | 맞음 |
| The letter must be written today. | must · passive · modal-passive | must · passive · modal-passive | 맞음 |
| The door should be closed. | should | should | 맞음 |
| The cake can be made at home. | passive · modal-passive · can · past-irregular | can · past-irregular · passive · modal-passive | 맞음 |
| It will be sent tomorrow. | passive · modal-passive · will · past-irregular | past-irregular · will · passive · modal-passive | 맞음 |
| You can be my friend. | can | can | 맞음 |
| It will be fun. | will | will | 맞음 |
| First of all, wash your hands. | paragraph-connector | paragraph-connector | 맞음 |
| In conclusion, sleep is good. | paragraph-connector | paragraph-connector | 맞음 |
| To sum up, we had fun. | paragraph-connector · we-they · past-irregular | we-they · past-irregular · paragraph-connector | 맞음 |
| First, wash your hands. | 없음 | 없음 | 맞음 |
| All of us came. | past-irregular · object-pronouns | object-pronouns · past-irregular | 맞음 |
| The conclusion was clear. | past-be | past-be | 맞음 |
| We stayed home because of the rain. | cause-effect · we-they · past-regular · because | past-regular · because · we-they · cause-effect | 맞음 |
| As a result, we won. | cause-effect · we-they · past-irregular | we-they · past-irregular · cause-effect | 맞음 |
| Because of you, I am happy. | cause-effect · because | because · cause-effect | 맞음 |
| I stayed home because it rained. | because · past-regular | past-regular · because | 맞음 |
| The result was good. | past-be | past-be | 맞음 |
| Of course, I can. | can | can | 맞음 |
| Nice to meet you. | 없음 | 없음 | 맞음 |
| Glad to meet you. | 없음 | 없음 | 맞음 |
| Nice to see you again. | 없음 | 없음 | 맞음 |
| I'm happy to see you. | 없음 | 없음 | 맞음 |
| Good to see you. | 없음 | 없음 | 맞음 |
| I'm sorry to hear that. | 없음 | 없음 | 맞음 |
| It's time to go home. | 없음 | 없음 | 맞음 |
| My older brother is tall. | 없음 | 없음 | 맞음 |
| My younger sister is cute. | 없음 | 없음 | 맞음 |
| How old is your older sister? | 없음 | 없음 | 맞음 |
| She is my best friend. | he-she | he-she | 맞음 |
| Feel better soon! | 없음 | 없음 | 맞음 |
| I feel better now. | 없음 | 없음 | 맞음 |
| Have a nice day! | 없음 | 없음 | 맞음 |
| Have fun! | 없음 | 없음 | 맞음 |
| Let's learn some new words! | 없음 | 없음 | 맞음 |
| That's fun! Let's keep talking. | 없음 | 없음 | 맞음 |
| Can you say it again? | 없음 | 없음 | 맞음 |
| Do you want to talk more? | 없음 | 없음 | 맞음 |
| Would you like some juice? | 없음 | 없음 | 맞음 |
| I want to learn English. | want-to | want-to | 맞음 |
| She is taller than me. | comparative · he-she | he-she · comparative | 맞음 |
| It is the biggest city. | superlative | superlative | 맞음 |
| I went there to buy milk. | to-infinitive · past-irregular | past-irregular · to-infinitive | 맞음 |
| I am happy to help you. | to-infinitive | to-infinitive | 맞음 |
| It is nice to swim. | to-infinitive | to-infinitive | 맞음 |
| My brother is older than me. | comparative | comparative | 맞음 |
| He is the best player. | superlative · he-she | he-she · superlative | 맞음 |
| This one is better. | comparative | comparative | 맞음 |
| You are the best! | superlative | superlative | 맞음 |
| I have a nice day. | have | have | 맞음 |
| Have you seen it? | have · present-perfect | have · present-perfect | 맞음 |
| Let's play soccer. | lets | lets | 맞음 |
| Can you swim? | can | can | 맞음 |
| Do you want some cake? | some-any | some-any | 맞음 |
| She was panicking. | past-progressive · past-be · he-she | past-be · he-she · past-progressive | 맞음 |
| Everyone is panicking. | present-progressive | present-progressive | 맞음 |
| He panicked. | past-regular · he-she | past-regular · he-she | 맞음 |
| They have panicked before. | present-perfect · have · we-they · past-regular | have · past-regular · we-they · present-perfect | 맞음 |
| He lied to me. | past-regular · he-she | past-regular · he-she | 맞음 |
| My grandmother sewed a doll. | past-regular | past-regular | 맞음 |
| She sews well. | third-person-s · he-she | third-person-s · he-she | 맞음 |
| They are lying on the grass. | present-progressive · we-they | present-progressive · we-they | 맞음 |
| Let's read a book. | lets | lets | 맞음 |
| Let's talk about animals. | 없음 | 없음 | 맞음 |
| It is good to see the stars. | to-infinitive | to-infinitive | 맞음 |
| I was sorry to hear the news. | to-infinitive · past-be | past-be · to-infinitive | 맞음 |
| I'm sorry to hear about your cold. | 없음 | 없음 | 맞음 |
| Keep trying! | gerund | gerund | 맞음 |
| He kept running. | gerund · he-she · past-irregular | he-she · past-irregular · gerund | 맞음 |
| Let's keep talking. | 없음 | 없음 | 맞음 |
| Stop talking, please. | gerund | gerund | 맞음 |

묶음 3 · 4 검출기에 넘길 것(예문 검사에서 배움, 묶음 3 · 4 에서 모두 반영함): 최상급은 `the [a-z]+est` 정규식이 the test · the west 를 잡으므로 vocab 최상급형 낱말 목록으로, 수동태(묶음 4)는 be + 과거분사에서 형용사 항목(surprised · excited · worried · tired)을 빼고, -ly 부사는 really · only · usually · early · family · lonely · silly 를 빼고, to 부정사는 want to · would like to 뒤와 명사로도 쓰는 동사(to work · to school)를 빼야 한다. 검토 메모 1(fix 1 에서 받음): 낱말 자체가 형태인 요소(will · should · must · if · although 같은 낱말 검출기)는 그 낱말을 도입 자리 앞 단원의 단원 단어로 두지 않는다. 묶음 3 · 4 도 '단원 단어 원형 × 자기 단원 allowedForms' 맞대기를 0 으로 맞춘다.

### 묶음 1 검출기(1~3단계 도입 요소)

1~3단계 3.6 요소 30(읽기 · 말하기 · 회화 15 · 쓰기 15) 가운데 검출기를 두는 것은 묶음 0 의 여섯(have · can · can-not · there-is · there-are · lets)과 fix 1 에서 더한 낱말 검출기 둘(he-she 2-2 · we-they 3-1)이다. 나머지 22 는 아래 120 요소 표의 까닭대로 검출하지 않는다(C64 (3)): 기본 문형 · 어순(a · an + 명사 · This is ~ · I am · He is · 일반동사 현재 · 형용사 + 명사 · 주어 + 동사 + 목적어 …)과 1단계부터 필요한 질문(Is it ~? · Do you ~? · What · Where · Who, 결정 ⑤), 낱말 단계가 맡는 것(위치 전치사 · 색 · 크기 · 수), 철자 패턴 · 표기(쓰기 1-1~1-5 · 3-3). 1~3단계 vocab 이 확정되어 3인칭 단수 · -ing · -ed 낱말 목록을 1~6단계 동사에서 다시 뽑았다(그때 3인칭 단수 낱말 131 · 정규식 177, -ing 178, 규칙 과거 105). 시험 문장 139 는 그대로 모두 기대와 같았다. fix 1 의 맞바꿈과 NOUNY3 빼기 뒤 forms.json 의 값은 3인칭 단수 낱말 113 · 규칙 과거 103 이다.

### 3.6 요소 120 의 id · introducedAt · 검출 여부

규격(`FormEntry`)이 검출기 없는 항목을 거부하므로 이 표가 120 요소의 뼈대다. '묶음 n'은 그 묶음에서 forms.json 에 더할 검출기다. '검출 안 함'은 읽기에서는 기능어 · 내용어 단계(범위 밖 비율)가, 말하기 · 회화 · 쓰기에서는 사람 표본이 맡는다(범위 밖 비율은 읽기 글만 본다, 검토 M-3). 같은 형태가 두 열에 나오면 한 id 로 묶어 rst · writing 자리를 함께 적는다.

읽기 · 말하기 · 회화 열(rst):

| 자리 | 요소 | id · writing 자리 | 검출 | 까닭 |
|---|---|---|---|---|
| 1-1 | a · an + 명사 | — | 안 함 | a · an 은 모든 글에 쓰인다 |
| 1-2 | This is ~ | — | 안 함 | 1단계 기본 문형. 쓰기 열에 없어 검출하면 쓰기 글 전체에서 막힌다 |
| 1-3 | 색 · 크기 + 명사 | — | 안 함 | 내용어 단계가 맡는다 |
| 1-4 | I like ~ | — | 안 함 | 내용어 단계가 맡는다 |
| 1-5 | 수 + 복수 -s | — | 안 함 | 복수 명사는 모든 단계에 쓰인다 |
| 2-1 | I am · You are | — | 안 함 | 3.3 1단계 회화 'I'm nine.' · 인사 'How are you?' |
| 2-2 | He · She · It is | he-she · w 2-2 | fix 1(넣음, he · she 만) | 낱말 하나로 갈린다(M-3). it is 는 1단계 회화 'What color is it?'에 필요 |
| 2-3 | have | have · w 1-1(쓰기 열 검출 안 함, C67 (1)) | 묶음 0 · fix 1 | 위 표. 쓰기 2-3 '동사 + 목적어'가 have 를 먼저 쓴다 |
| 2-4 | can | can · w 3-5, can-not · w 4-5 | 묶음 0 | 위 표 |
| 2-5 | Is it ~? · Do you ~? | — | 안 함 | 1단계 회화 · 말하기가 질문을 쓴다(3.3) |
| 3-1 | 일반동사 현재 | we-they · w 3-1 | fix 1(넣음, we · they 만) | 동사 원형은 낱말로 가를 수 없어 주어 we · they 만 잡는다 |
| 3-2 | There is · There are | there-is · w 3-4, there-are · w 5-2 | 묶음 0 | 위 표 |
| 3-3 | 위치 전치사 | — | 안 함 | under · behind · between · next to · in front of · near 는 기능어 단계 3: 읽기는 범위 밖 비율, 나머지 영역은 사람 표본이 맡는다(M-3) |
| 3-4 | 명령문 · Let's | lets · w 3-4(C64 (2)) | 묶음 0(Let's 만) | 명령문(부정 명령문 Don't ~ 포함, C67 (1))은 교실 영어로 1단계부터 쓰여 검출 안 함 |
| 3-5 | What · Where · Who 의문문 | — | 안 함 | 1단계 질문 What 이 필요. where · who 는 기능어 단계 3: 읽기는 범위 밖 비율, 나머지 영역은 사람 표본(M-3) |
| 4-1 | 3인칭 단수 -s | third-person-s · w 5-3 | 묶음 2(넣음) · fix 1(명사로도 흔한 꼴 뺌) | 명사로 쓰지 않는 동사의 3인칭 단수형 낱말 113(has · does · goes · eats …). thanks · helps · plays · looks · lives · needs · wants 같은 꼴은 he · she · it 정규식이 맡는다 |
| 4-2 | do · does 의문문 · 부정문 | dont · w 4-4, does · w 6-1 | 묶음 2(넣음) · fix 1(dont 는 주어 I · you · we · they 꼴만) | does · doesn't · does not. 부정 명령문 Don't ~ 는 3-4(C67 (1)), Do you ~? 는 2-5 |
| 4-3 | 현재진행 | present-progressive · w 5-4 | 묶음 2(넣음) | be + vocab 동사 -ing 형(morning · king · thing 을 피함) |
| 4-4 | 소유격(my · your · 's) | — | 안 함 | my · your 는 1단계 이름 묻기에 필요, 's 는 축약 is 와 가를 수 없음, his · our 등은 기능어 단계 4: 읽기는 범위 밖 비율, 나머지 영역은 사람 표본(M-3) |
| 4-5 | 시각 · 요일(at · on) | time-at · w 4-5(C64 (2)) | 묶음 2(넣음) · fix 1(o'clock 낱말 뺌) | 'at + 수'는 뒤에 o'clock · 시각 · 문장 끝이 올 때만, at noon, on + 요일. 요일은 내용어 단계 4 |
| 5-1 | 빈도부사 | frequency-adverbs · w 6-3 | 묶음 2(넣음) | always · usually · often · sometimes · never. 다섯 낱말은 기능어 단계 5 로 단원 단어가 아니다(fix 1, C67 (2)) |
| 5-2 | want to · would like | want-to · w 4-3(해석), would-like · w 5-2(C64 (2)) | 묶음 2(넣음) | want(s) to, would like · 'd like |
| 5-3 | and · but · or | but · w 5-5 | 묶음 2(넣음, but 만) | and(cats and dogs) · or(고르는 질문)는 1~2단계부터 |
| 5-4 | How many · How much | how-much · w 5-4(C64 (2)) | 묶음 2(넣음, How much 만) | 3.3 1단계 회화가 '수'를 묻는다(How many) |
| 5-5 | 목적격 대명사 | object-pronouns · w 6-4 | fix 1(넣음, him · us · them) | me 는 1단계 교실 영어라 뺐다 |
| 6-1 | was · were | past-be · w 7-1 | 묶음 2(넣음) | was · were · wasn't · weren't |
| 6-2 | 규칙 동사 과거 -ed | past-regular · w 7-2 | 묶음 2(넣음) | vocab 규칙 과거형 낱말 목록(`\b[a-z]+ed\b` 는 red · bed 를 잡아 쓰지 않는다) |
| 6-3 | because | because · w 6-5 | 묶음 2(넣음) | 낱말 because(because of 는 쓰기 12-1 이 따로) |
| 6-4 | When 의문문 | when-question · w 6-4(C64 (2)) | 묶음 2(넣음) | 문장 첫 when + 물음표 |
| 6-5 | some · any | some-any · w 6-5 | fix 1(넣음) | |
| 7-1 | 불규칙 동사 과거 | past-irregular · w 7-3 | 묶음 3(넣음) | 불규칙 과거형 낱말(원형과 같은 꼴 · vocab 낱말은 뺌), lost · found 는 대명사 주어 뒤, got 은 have 뒤가 아닐 때 |
| 7-2 | did 의문문 · 부정문 | did · w 7-3(제안, did 는 do 의 불규칙 과거) | 묶음 3(넣음) | did · didn't · did not |
| 7-3 | be going to | going-to · w 8-1 | 묶음 3(넣음) | going to + 동사 원형(목적지로 흔한 school · work · camp 등은 뺌) |
| 7-4 | will | will · w 8-1 | 묶음 3(넣음) | will · won't · 'll |
| 7-5 | 비교급 · 최상급 | comparative · w 8-2, superlative · w 8-3 | 묶음 3(넣음) | vocab 비교급 · 최상급 낱말(later 뺌), than, more · most · less · least + 두 음절 넘는 형용사 |
| 8-1 | 과거진행 | past-progressive · w 8-1(C64 (2)) | 묶음 3(넣음) | was · were + -ing 형 |
| 8-2 | when 절 | when-clause · w 8-5 | 묶음 3(넣음) | when + 주어(대명사 · 한정사). when 의문문(6-4)은 안 걸림 |
| 8-3 | 부사 -ly | adverb-ly · w 8-3(C64 (2)) | 묶음 3(넣음) | vocab -ly 부사 10(really · only · early · usually · finally 와 형용사 -ly 는 뺌). 8단계 -ly 낱말 묶음 H3 은 네 영역 모두 단원 3 이후(메모 1) |
| 8-4 | must · have to | must · w 9-3, have-to · w 8-4(C64 (2)) | 묶음 3(넣음) | must · mustn't, have · has · had to + 낱말 |
| 8-5 | should | should · w 9-3 | 묶음 3(넣음) | should · shouldn't |
| 9-1 | 동명사 | gerund · w 9-2 | 묶음 3(부분) | like · love · enjoy · hate · finish · stop · start · begin · keep · practice · mind + -ing, 문장 첫 -ing(명사 꼴 뺌). 전치사 + -ing 는 사람 표본 |
| 9-2 | to 부정사(명사 · 목적) | to-infinitive · w 9-1 | 묶음 3(넣음) | to + 동사 원형(want to · would like to · going to · have to · used to 뒤는 뒤보기로 뺌) |
| 9-3 | 현재완료(경험) | present-perfect · w 10-5 | 묶음 3(넣음) | have · has · 've (+ never · ever · just · already) + 과거분사, Have you ever + 과거분사 |
| 9-4 | if 조건문(현재) | if · w 11-4 | 묶음 3(넣음) | 낱말 if |
| 9-5 | so · after · before | conj-so-after-before · w 9-4 | 묶음 3(넣음) | ', so' + 낱말 · after · before + 대명사 주어(after school 같은 전치사는 안 걸림) |
| 10-1 | 관계대명사 who · which · that | relative-who-which · w 10-2 | 묶음 4(부분, 넣음) | 물음표로 끝나지 않는 문장의 who · which · whom · whose. that 은 검출 안 함(지시 · 접속과 가를 수 없음) |
| 10-2 | 현재완료(계속 · 완료) | present-perfect(9-3 과 같은 id) | — | 9-3 에서 이미 도입 |
| 10-3 | 수동태(현재 · 과거) | passive · w 11-3 | 묶음 4(넣음) | be + 과거분사(형용사로 흔한 lost · broken · -ed 형용사는 뺌) |
| 10-4 | 간접 의문문 | indirect-question · w 10-4(C64 (2)) | 묶음 4(넣음) | know · wonder · ask · tell me · remember … + wh 낱말 · whether · if |
| 10-5 | however · also | however · w 10-3 | 묶음 4(넣음) | however, 문장 첫 'Also,'(문장 안 also 는 부사 단계 4) |
| 11-1 | 관계부사 where · when | relative-adverb · w 11-1(C64 (2)) | 묶음 4(부분, 넣음) | place · day · time · reason … + where · when · why + 주어 |
| 11-2 | 가정법 과거(If I were ~) | second-conditional · w 12-2 | 묶음 4(넣음) | if + 주어 + were, would · 'd + 낱말(like · you · rather 앞은 뺌) |
| 11-3 | 분사 수식 | — | 안 함 | 진행 · 수동과 가르기 어렵다. 사람 표본 |
| 11-4 | as ~ as · 비교 표현 | as-as · w 11-4(C64 (2)) | 묶음 4(넣음) | as + 낱말 한두 개 + as |
| 11-5 | although | although · w 12-3 | 묶음 4(넣음) | although · though |
| 12-1 | 의견 표현(In my opinion · I believe that) | opinion-phrase · w 10-1 | 묶음 4(넣음) | in my opinion · I believe that. I think 는 검출 안 함(3.3 회화 10 이 먼저 쓴다) |
| 12-2 | so that · in order to | so-that · w 12-2(C64 (2)) | 묶음 4(넣음) | so that · in order to |
| 12-3 | used to | used-to · w 12-3(C64 (2)) | 묶음 4(넣음) | used to + 동사 원형(be · get used to 는 뺌), didn't use to |
| 12-4 | 조동사 수동태 | modal-passive · w 12-4(C64 (2)) | 묶음 4(넣음) | 조동사 + be + 과거분사 |
| 12-5 | 문단 연결(first of all · in conclusion) | paragraph-connector · w 12-5 | 묶음 4(넣음) | first of all · in conclusion · to sum up |

쓰기 열(writing, rst 열과 같은 형태는 위 id):

| 자리 | 요소 | id | 검출 | 까닭 |
|---|---|---|---|---|
| 1-1~1-5 | 단모음 a · e / i · o · u / sh · ch · th / -ck · -ng · -nk / 묵음 e | — | 안 함 | 철자 패턴은 문형이 아니다. 단원 단어 고르기의 기준(위 (1) 배치표) |
| 2-1~2-5 | 형용사 + 명사 / 수 + 복수 명사 / 동사 + 목적어 / 전치사 + 명사 / 명사 and 명사 | — | 안 함 | 기본 어순 |
| 3-1 · 3-2 | 주어 + be + 형용사 / 주어 + 동사 + 목적어 | — | 안 함 | 기본 어순 |
| 3-3 | 대문자 · 마침표 · 물음표 | — | 안 함 | 표기. 쓰기 1~3단계 정답 비교가 맡는다 |
| 3-4 | There is ~ | there-is | 묶음 0 | |
| 3-5 | can 문장 | can | 묶음 0 | |
| 4-1 · 4-2 | be 동사 문장 / 일반동사 현재 | — | 안 함 | 기본 문형 |
| 4-3 | have · like · want 문장 | have(쓰기 열 검출 안 함, C67 (1)) | — | like · want 는 내용어, have 는 쓰기 2-3 이 먼저 쓴다 |
| 4-4 | 부정문(don't · isn't) | dont, be-not(rst 4-4, C64 (2)) | 묶음 2(넣음) · fix 1 | isn't · aren't · is not · are not · am not · 'm not · 's not · 're not(M-1). dont 는 주어 I · you · we · they 꼴만(M-2) |
| 4-5 | can · can't | can-not | 묶음 0 | |
| 5-1 | 명사 복수형(-s · -es · 불규칙) | — | 안 함 | 복수형은 1단계부터 |
| 5-2 | There are | there-are | 묶음 0 | |
| 5-3 · 5-4 | 3인칭 단수 -s / 현재진행 | third-person-s · present-progressive | 묶음 2(넣음) | |
| 5-5 | and · but 으로 두 문장 잇기 | but | 묶음 2(넣음) | and 는 검출 안 함 |
| 6-1 | does · doesn't | does | 묶음 2(넣음) | |
| 6-2 | 관사 a · an · the | — | 안 함 | 1단계부터 쓰인다(교정 초점) |
| 6-3 | 빈도부사 | frequency-adverbs(rst 5-1) | 묶음 2(넣음) | 낱말은 기능어 단계 5(C67 (2)) |
| 6-4 | 소유격 · 목적격 대명사 | object-pronouns(rst 5-5) | fix 1(넣음, him · us · them) | 소유격 his · her · our · their 는 기능어 단계: 범위 밖 비율은 읽기만 보므로 쓰기는 사람 표본이 맡는다(M-3) |
| 6-5 | because 로 이유 붙이기 | because | 묶음 2(넣음) | |
| 7-1~7-3 | was · were / 규칙 과거 / 불규칙 과거 | past-be · past-regular · past-irregular · did | 묶음 2 · 3(넣음) | |
| 7-4 | 순서 말(first · then · finally) | — | 안 함 | first · then 은 흔하다 |
| 7-5 · 8-4 · 9-5 · 10-4 · 12-4 | 일기 형식 / 편지 형식 / 과정 설명 / 서론-본문-결론 / 요약 · 결론 쓰기 | — | 안 함 | 글 형식. 사람 표본과 첨삭 채점표 |
| 8-1~8-3 · 8-5 | will · be going to / 비교급 / 최상급 / when 절 | will · going-to · comparative · superlative · when-clause | 묶음 3(넣음) | |
| 9-1~9-4 | to 부정사 / 동명사 / should · must / so · after · before 절 | to-infinitive · gerund · should · must · conj-so-after-before | 묶음 3(넣음) | |
| 10-1 | 의견과 이유(I think ~ because ~) | opinion-phrase(rst 12-1) | 묶음 4(넣음) | I think 는 검출 안 함. 쓰기에서는 in my opinion 이 10-1 부터 열린다 |
| 10-2 · 10-3 · 10-5 | 관계대명사 who · which / however · also / 현재완료 | relative-who-which · however · present-perfect | 묶음 3 · 4(넣음) | |
| 11-1 | 비교 · 대조(both · while · on the other hand) | contrast-connector · rst 11-1(C64 (2)) | 묶음 4(넣음) | while + 주어 · on the other hand(both 는 기능어 단계 5, for a while 은 안 걸림) |
| 11-2 | 관계대명사 that | — | 안 함 | that 은 지시 · 접속과 가를 수 없다 |
| 11-3 · 11-4 | 수동태 / if 조건문 | passive · if | 묶음 3 · 4(넣음) | |
| 11-5 | for example 로 예시 들기 | for-example · rst 11-5(C64 (2)) | 묶음 4(넣음) | for example · for instance |
| 12-1 | 원인 · 결과(because of · as a result) | cause-effect · rst 12-1(C64 (2)) | 묶음 4(넣음) | because of · as a result |
| 12-2 · 12-3 · 12-5 | 가정법 과거 / although / 문단 연결 | second-conditional · although · paragraph-connector | 묶음 4(넣음) | |

한 열에만 있는 형태(rst 에만 lets · time-at · would-like · how-much · when-question · he-she · we-they · some-any · past-progressive · adverb-ly · have-to · indirect-question · relative-adverb · as-as · so-that · used-to · modal-passive, 쓰기에만 be-not · contrast-connector · for-example · cause-effect)는 C64 (2)에 따라 다른 열을 같은 (단계, 단원)으로 채운다(묶음 2 까지 lets · be-not · time-at · would-like · how-much · when-question 을, fix 1 에서 he-she · we-they · some-any 를, 묶음 3 에서 past-progressive(8-1) · adverb-ly(8-3) · have-to(8-4)를, 묶음 4 에서 indirect-question(10-4) · relative-adverb(11-1) · as-as(11-4) · so-that(12-2) · used-to(12-3) · modal-passive(12-4)와 쓰기에만 있던 contrast-connector(11-1) · for-example(11-5) · cause-effect(12-1)를 채움).

## (5) 금지어 시험 문장

`forbiddenHits`(일회 검사 `check_lists.ts`)로 돌린 89 줄이 모두 기대와 같다(묶음 0 의 43 줄 + fix 1 의 22 줄 + fix 2 의 24 줄, '어디 살아?'는 두 번 들어 있다). 영어 낱말은 낱말 단위로 맞으므로 활용형을 함께 적었고(kill · kills · killed · killing …), 한국어는 부분 글로 맞으므로 짧은 조각('죽' · '술' · '총' · '칼')을 넣지 않고 걸릴 꼴(죽여 · 술을 마셔 · 총을 쏴 · 칼로 찔)로 적었다. 개인 정보 정규식은 묻는 꼴만 잡아 뜻 풀이(address = 주소)와 이름 묻기(What's your name?)를 막지 않는다.

fix 1 에서 고친 것(검토 I-3 · I-4 · M-11, 컨트롤러 판정 C67 (4)):

- **한국어 개인 정보(I-3).** '어디 살아'는 문장 첫머리이거나 너 · 넌 · 너는 · 너희 · 너네 뒤일 때만 잡는다. '너희 집은 어디'를 더했다. '성이 뭐'는 너(의) · 넌 · 네 · 니 뒤이거나 '성씨'일 때만 잡는다. 그래서 동물 이야기('개구리는 어디에 살아?' · '곰은 어디 살아?' · '펭귄은 어디에 살아요?')와 성(城) 이야기('그 성은 뭐로 만들었어?' · '왕자는 성에 살아.')가 막히지 않는다.
- **집 주소 꼴(I-4).** contact 범주에 둘을 더했다. contact-address-ko 는 '…동 …호', '…아파트 · 빌라 · 맨션 + …동', '…대로 · …로 · …길 + 번지 수'를 잡는다. '…로' 앞이 '으'인 꼴('앞으로 3칸 가.')은 잡지 않고, 수 뒤에 칸 · 정거장 같은 말이 붙어도 잡지 않는다('버스로 2정거장 가요.'). contact-address-en 은 '수 + 낱말 1~2 + street · road · avenue · lane · drive · boulevard'를 잡는다. 'The road is long.' · 'We walked 2 miles on the road.' · 'I live in Seoul.'은 걸리지 않는다. 컨트롤러가 P9b(쓰기 · 회화 입력 검사) 쪽에 이 범주를 알렸다.
- **drunk(M-11).** 금지어 drunk 는 drink 의 과거분사와 꼴이 같아 'I have drunk milk.'가 걸린다. 현재완료가 도입되는 9단계(rst 9-3) 뒤 글에서만 생기는 일이라 알고 둔 한계로 남긴다. 묶음 3 의 예문 검사에서 drunk 를 쓰지 않고(have had · have tried 같은 다른 동사로), 걸리면 그 자리에서 문장을 바꾼다. 묶음 3 에서 1~9단계 vocab 의 원형 1,452 와 활용형 1,939 를 금지어 낱말과 맞대 보니 걸리는 것은 drunk 하나뿐이다(7~9단계 낱말에서 새로 생긴 충돌 없음).

fix 2 에서 고친 것(검토 review-p06a-2 N-1 · 장부 18줄, 컨트롤러 판정):

- **띄어 쓴 수 + 단위(N-1, Important).** contact-address-ko 셋째 갈래('…로 · …길 + 번지 수')의 앞보기를 `(?=\s?(?:번지|에|이야|야)|\s*(?:$|[,.!?)]))` 로 바꿨다. 수 뒤에 공백이 오면 번지 · 에 · 이야 · 야가 이어질 때만 잡는다. 한글 맞춤법 제43항은 단위 명사를 띄어 쓰는 것이 원칙이라 '버스로 2 정거장 가요.' · '기차로 3 시간 가.' · '자전거로 5 분이면 돼.' · '택시로 10 분 걸려.' · '지하철로 2 정거장이야.' · '다리로 2 개를 건너.' · '기차로 2 시간이야.' · '학교까지 버스로 20 분.'이 바른 글이다 — 모두 안 걸린다. 걸릴 여덟(테헤란로 123 이야 · 101동 1203호 · 행복아파트 3동 · 중앙로 45에 · 강남대로 302 · 세종로 1-2번지 · 테헤란로 123, 서울 · 중앙로 45 야)은 그대로 걸린다. 뒤보기 `(?<!으)` 는 그대로 둔다(서버 Node 컴파일만, 7절 4).
- **괄호 지역 번호 · 국가 번호(장부 18줄, review-p09b P6 메모 1).** contact-phone 에 갈래 둘을 더했다: `\(0\d{1,2}\)\s?\d{3,4}[-. ]?\d{4}` 와 `\+\d{1,3}[-. ]?\d{1,4}[-. ]?\d{3,4}[-. ]?\d{4}`. lang 은 en 이지만 `forbiddenHits` 는 언어를 가리지 않고 모든 글에 정규식을 걸므로 한국어 글에도 쓰인다. (02)123-4567 · (031) 123-4567 · +82 10-1234-5678 · +82-2-123-4567 이 걸리고, 수학 글 '(2) 3 + 4 = 7' · 'Call me at 3.' · 'We need + 2 more.' · 'Look at picture (2) on page 12.'는 안 걸린다.
- **말소리 숫자 꼴은 넣지 않음.** '0 1 0 1 2 3 4 …' · 'zero one zero …'처럼 숫자를 한 자씩 띄어 말하는 꼴은 수 세기 글('one two three four') · 수학 글과 부딪쳐 거짓 양성이 크다. 사람 표본(P9 · 1-나 부모 신고)이 맡는다. 컨트롤러가 P9b 쪽에 contact 범주 값이 바뀐 것을 알린다(보고 '알릴 것').

| 글 | 기대 | 걸린 것 | 판정 |
|---|---|---|---|
| I will kill you. | 걸림 | en-word:kill · violence-en-threat | 맞음 |
| He has a gun. | 걸림 | en-word:gun | 맞음 |
| You are stupid. | 걸림 | en-word:stupid | 맞음 |
| Dad drinks beer. | 걸림 | en-word:beer | 맞음 |
| Shut up! | 걸림 | en-word:shut up | 맞음 |
| Where do you live? | 걸림 | personal-info-en-home | 맞음 |
| What is your address? | 걸림 | personal-info-en-home | 맞음 |
| What's your phone number? | 걸림 | personal-info-en-phone | 맞음 |
| What school do you go to? | 걸림 | personal-info-en-school | 맞음 |
| What is your last name? | 걸림 | personal-info-en-name | 맞음 |
| What's your email? | 걸림 | personal-info-en-email | 맞음 |
| Send it to tori@example.com. | 걸림 | contact-email · contact-web | 맞음 |
| Call me at 010-1234-5678. | 걸림 | contact-phone | 맞음 |
| Call 02-123-4567 now. | 걸림 | contact-phone | 맞음 |
| Go to www.example.com for games. | 걸림 | contact-web | 맞음 |
| 집 주소가 뭐야? | 걸림 | personal-info-ko | 맞음 |
| 어디 살아? | 걸림 | personal-info-ko | 맞음 |
| 전화번호 알려 줘. | 걸림 | personal-info-ko | 맞음 |
| 무슨 학교 다녀? | 걸림 | personal-info-ko | 맞음 |
| 몇 반이야? | 걸림 | personal-info-ko | 맞음 |
| 죽여 버릴 거야. | 걸림 | ko-word:죽여 · violence-ko-threat | 맞음 |
| 담배를 피워요. | 걸림 | ko-word:담배 | 맞음 |
| What's your name? | 안 걸림 | 없음 | 맞음 |
| How old are you? | 안 걸림 | 없음 | 맞음 |
| I live in a big house. | 안 걸림 | 없음 | 맞음 |
| My address book is red. | 안 걸림 | 없음 | 맞음 |
| The class starts at 7:30. | 안 걸림 | 없음 | 맞음 |
| We won 3-2! | 안 걸림 | 없음 | 맞음 |
| It was 2026. | 안 걸림 | 없음 | 맞음 |
| I have 3 apples and 12 eggs. | 안 걸림 | 없음 | 맞음 |
| Our school is big. | 안 걸림 | 없음 | 맞음 |
| I like my school. | 안 걸림 | 없음 | 맞음 |
| Can you shoot the ball? | 안 걸림 | 없음 | 맞음 |
| The plant died. | 안 걸림 | 없음 | 맞음 |
| He has a lot of skill. | 안 걸림 | 없음 | 맞음 |
| Hello! I am Tori. | 안 걸림 | 없음 | 맞음 |
| I see a shell. | 안 걸림 | 없음 | 맞음 |
| 주소 | 안 걸림 | 없음 | 맞음 |
| 죽다 | 안 걸림 | 없음 | 맞음 |
| 미술 시간이야. | 안 걸림 | 없음 | 맞음 |
| 전화를 해요. | 안 걸림 | 없음 | 맞음 |
| 학교에 가요. | 안 걸림 | 없음 | 맞음 |
| 그 칼은 부엌에 있어. | 안 걸림 | 없음 | 맞음 |
| 어디 살아? | 걸림 | personal-info-ko | 맞음 |
| 너 어디 살아? | 걸림 | personal-info-ko | 맞음 |
| 넌 성이 뭐야? | 걸림 | personal-info-ko | 맞음 |
| 너희 집은 어디야? | 걸림 | personal-info-ko | 맞음 |
| 우리 집은 서울시 강남구 테헤란로 123 이야. | 걸림 | contact-address-ko | 맞음 |
| 101동 1203호에 살아. | 걸림 | contact-address-ko | 맞음 |
| 행복아파트 3동이야. | 걸림 | contact-address-ko | 맞음 |
| I live at 25 Green Street. | 걸림 | contact-address-en | 맞음 |
| I have drunk milk. | 걸림 | en-word:drunk | 맞음 |
| 개구리는 어디에 살아? | 안 걸림 | 없음 | 맞음 |
| 곰은 어디 살아? | 안 걸림 | 없음 | 맞음 |
| 펭귄은 어디에 살아요? | 안 걸림 | 없음 | 맞음 |
| 그 성은 뭐로 만들었어? | 안 걸림 | 없음 | 맞음 |
| 왕자는 성에 살아. | 안 걸림 | 없음 | 맞음 |
| 도로 위에 차가 많아. | 안 걸림 | 없음 | 맞음 |
| 우리 동네는 조용해. | 안 걸림 | 없음 | 맞음 |
| I live in Seoul. | 안 걸림 | 없음 | 맞음 |
| 앞으로 3칸 가. | 안 걸림 | 없음 | 맞음 |
| 버스로 2정거장 가요. | 안 걸림 | 없음 | 맞음 |
| The road is long. | 안 걸림 | 없음 | 맞음 |
| We walked 2 miles on the road. | 안 걸림 | 없음 | 맞음 |
| I have 2 big dogs. | 안 걸림 | 없음 | 맞음 |
| 버스로 2 정거장 가요. | 안 걸림 | 없음 | 맞음 |
| 기차로 3 시간 가. | 안 걸림 | 없음 | 맞음 |
| 자전거로 5 분이면 돼. | 안 걸림 | 없음 | 맞음 |
| 택시로 10 분 걸려. | 안 걸림 | 없음 | 맞음 |
| 지하철로 2 정거장이야. | 안 걸림 | 없음 | 맞음 |
| 다리로 2 개를 건너. | 안 걸림 | 없음 | 맞음 |
| 기차로 2 시간이야. | 안 걸림 | 없음 | 맞음 |
| 학교까지 버스로 20 분. | 안 걸림 | 없음 | 맞음 |
| 우리 집은 테헤란로 123 이야. | 걸림 | contact-address-ko | 맞음 |
| 101동 1203호 | 걸림 | contact-address-ko | 맞음 |
| 행복아파트 3동 | 걸림 | contact-address-ko | 맞음 |
| 중앙로 45에 살아. | 걸림 | contact-address-ko | 맞음 |
| 강남대로 302 | 걸림 | contact-address-ko | 맞음 |
| 세종로 1-2번지 | 걸림 | contact-address-ko | 맞음 |
| 테헤란로 123, 서울 | 걸림 | contact-address-ko | 맞음 |
| 중앙로 45 야. | 걸림 | contact-address-ko | 맞음 |
| (02)123-4567 로 전화해. | 걸림 | contact-phone | 맞음 |
| Call (031) 123-4567. | 걸림 | contact-phone | 맞음 |
| My number is +82 10-1234-5678. | 걸림 | contact-phone | 맞음 |
| +82-2-123-4567 | 걸림 | contact-phone | 맞음 |
| (2) 3 + 4 = 7 | 안 걸림 | 없음 | 맞음 |
| Call me at 3. | 안 걸림 | 없음 | 맞음 |
| We need + 2 more. | 안 걸림 | 없음 | 맞음 |
| Look at picture (2) on page 12. | 안 걸림 | 없음 | 맞음 |

메타 문장 13(6.4): the child · the user · the student · the learner · i should · i will now · as an ai · as a language model · my instructions · system prompt · the system · the assistant · the card says. 검사는 P9 · 1-나다.

동음이의어 48묶음(en-US 에서 소리가 같은 것, 첫 낱말이 대표 — 6.2 일치율 계산에서 같은 단어로 본다): two · to · too, four · for, one · won, eight · ate, there · their, right · write, see · sea, buy · by · bye, here · hear, no · know, sun · son, meet · meat, week · weak, blue · blew, new · knew, our · hour, where · wear, pear · pair, road · rode, piece · peace, aunt · ant, nose · knows, wait · weight, break · brake, sell · cell, wood · would, board · bored, weather · whether, past · passed, aloud · allowed, role · roll, so · sew, be · bee, bear · bare, flour · flower, scene · seen, sight · site, do · due, mail · male, hi · high, i · eye, way · weigh, hire · higher, some · sum, threw · through, rose · rows, warn · worn, presence · presents. 묶음 4 끝 판정(검토 메모 6 · 브리프): board · bored 는 board(6) · bored(bore 9 의 활용형)가 둘 다 vocab 에 들어 그대로 둔다. 1~12단계 vocab 이 확정되어 양쪽이 모두 vocab 원형 · 활용형에 드는 묶음 16 을 더했다(be · bee, bear · bare, flour · flower, scene · seen, sight · site, do · due, mail · male, hi · high, i · eye, way · weigh, hire · higher, some · sum, threw · through, rose · rows, warn · worn, presence · presents). pear · pair 는 그대로다(pair 는 5단계 vocab). guest · guessed · tail · tale · steal · steel · sale · sail · plane · plain · night · knight · hole · whole · tide · tied 는 한쪽이 1~12 vocab 밖이라 두지 않는다. poor · pour · tense · tents 처럼 말씨에 따라 갈리는 쌍은 넣지 않았다. 일회 검사 `check_homophones.py`(묶음 4 부터 vocab 원형 · 활용형 기준) 빠진 낱말 0.

## (6) H5 제안서 — 확정(C66, 2026-10-17)

요청자가 2026-10-17 01:0x 에 확인했다(13절 C66, 정본 반영 커밋 1eff00d). 확정 값: 1~3구간 단원 단어 25 · k 5 · 정규 10(배정 5 + 다지기 5) · 보강 3 · 변형 2 · 최소 수업 6 · 최소 학습일 4(권한 25 안), 4~6 · 7~9 · 10~12 구간과 쓰기 6~9 · 10~12 단원 틀은 그대로, 단계 평가 유형별 문항 수는 아래 5 표 그대로, speaking.answer_max_seconds 30 · 30 · 60 · 150 그대로. settings.json 의 unit.vocab_count.1-3 을 25 로 고쳤고(12절 대조 0), level-specs.json 의 testMix 36 · frame 7 은 값 그대로 확정이다. 아래는 확인 전에 쓴 제안서 원문이다.

### 1. 지금 값(3.2 표 · 12절)

| 구간 | 단원 단어 | k | 정규(배정 + 다지기) | 보강 | 주제 변형 | 최소 수업 | 최소 학습일 |
|---|---|---|---|---|---|---|---|
| 1~3 | 30 | 5 | 10(6 + 4) | 3 | 2 | 6 | 4 |
| 4~6 | 30 | 4 | 13(8 + 5) | 4 | 2 | 8 | 5 |
| 7~9 | 30 | 4 | 13(8 + 5) | 4 | 2 | 9 | 6 |
| 10~12 | 30 | 3 | 15(10 + 5) | 5 | 2 | 10 | 7 |
| 쓰기 6~9 | (구간 값) | 6 | 7(5 + 2) | (구간) | (구간) | 5 | (구간) |
| 쓰기 10~12 | (구간 값) | 5 | 8(6 + 2) | (구간) | (구간) | 6 | (구간) |

### 2. 구간마다 제안 값과 까닭

| 구간 | 제안 | 까닭 |
|---|---|---|
| 1~3 | 25 · 5 · 10(5 + 5) · 3 · 2 · 6 · 4(갈림길 3 의 권하는 안) | 1단계 과제가 단어 5~6개를 다루므로 k 5(3.3: 읽기 그림 고르기 5 · 쓰기 단어 6 · 말하기 단어 5). 단원 단어 25 면 배정 5 + 다지기 5 로 마지막 배정 단어를 다질 수업이 4 → 5 로 는다. 마지막 배정 수업 새 단어 5 ≤ 25 × 0.2 = 5(경계). 보강 3 = 보강 상한 3. 최소 수업 6 > 배정 5 라 다지기 한 번은 해야 통과. 최소 학습일 4 는 하루 몰아 하기만 막는다(읽기 · 쓰기 · 말하기는 새 단어가 '안다'가 되는 7학습일 때문에 사실상 8학습일 이상, 회화는 '말함' 두 학습일이라 4 가 걸린다) |
| 4~6 | 30 · 4 · 13(8 + 5) · 4 · 2 · 8 · 5(그대로) | 초5~6 A1. 마지막 배정 수업 2개 ≤ 6. 다지기 5. 최소 수업 8 = 배정 8. 읽기 6~7분 · 말하기 10~11분 세션에 새 단어 4개가 알맞다 |
| 7~9 | 30 · 4 · 13(8 + 5) · 4 · 2 · 9 · 6(그대로) | A2. 최소 수업 9 > 배정 8 이라 다지기 한 번 뒤 통과. 지문이 길어지고(120~220단어) 단어가 추상적이 되어 k 를 늘리지 않는다 |
| 10~12 | 30 · 3 · 15(10 + 5) · 5 · 2 · 10 · 7(그대로) | B1 단어가 추상적이라 수업마다 3개. 마지막 배정 3 ≤ 6. 최소 수업 10 = 배정 10 |
| 쓰기 6~9 | k 6 · 7(5 + 2) · 최소 5(그대로) | 수업 하나가 세션 둘(초고 · 고쳐 쓰기)이라 수업 수를 줄였다. 마지막 배정 6 = 30 × 0.2(경계, 여유 0) |
| 쓰기 10~12 | k 5 · 8(6 + 2) · 최소 6(그대로) | 마지막 배정 5 ≤ 6 |

회화 관계(다시 묻는 턴 자리 ≥ 단원 단어 × talk.said_ratio 0.8 × talk.known_days 2): 1~3 구간 25 안은 필요 40, 1단계 정규 다시 묻는 턴 자리 5 × 8~9 + 5 × 13~14 = 105~115. 30 안은 필요 48, 자리 6 × 8~9 + 4 × 13~14 = 100~110(3.2). 4~12 구간은 목표 턴 20 · 25 라 자리가 넉넉하다(4~6 약 8 × 14~15 + 5 × 18~19 ≈ 205). 보강 상한 ≤ 시드 보강은 넷 모두 같다. 2022 학습 어휘(초3~4 300 · 초5~6 300 · 중 누계 1,500 · 공통 누계 1,800)와의 견줌은 아래 3.

### 3. 갈림길: 1~3구간 단원 단어 25 대 30

| 견줄 것 | 25 안(배정 5 + 다지기 5) | 30 안(배정 6 + 다지기 4, 지금 정본) |
|---|---|---|
| 영역마다 누계 3 · 6 · 9 · 12단계 | 375 · 825 · 1,275 · 1,725 | 450 · 900 · 1,350 · 1,800 |
| 교육과정과 견줌 | 초3~4 300 의 125%, 초등 600 의 138%(`*` 800 과 거의 같다), 중 1,500 · 공통 1,800 이내 | 초3~4 300 의 150%, 초등 600 의 150%, 공통 1,800 과 같음 |
| 3.2 관계 표 첫 줄 | 마지막 배정 5 ≤ 25 × 0.2 = 5(경계, 여유 0) | 5 ≤ 6(여유 1) |
| 회화 다시 묻는 턴 자리(1단계 정규) | 필요 40 · 자리 105~115 | 필요 48 · 자리 100~110 |
| 1단계 쓰기 철자 패턴 단원 | 단원마다 패턴 낱말 18개 이상(81%) | 21개 이상(79%) |
| 단원 통과가 가장 빠른 날(읽기 · 쓰기 · 말하기, 하루 한 수업) | 11학습일째(단원 단어 80% = 20개, 배정 4째 수업 단어 + 7학습일) | 12학습일째(24개 → 배정 5째 수업 단어 + 7학습일) |
| 시드 수(6.3 표) | 그대로: 정규 2,835 · 알파벳 20 · 보강 966 · 수업 3,821 · 주제 변형까지 7,642 | 같음 |
| 시드 생성 시간(6.3 시간 문단) | 그대로(단원 수 242 · 단원마다 수업 수 같음, 약 125~250시간) | 같음 |
| vocab · 그림 | 내용어 1,725 + 알파벳 26 + 기능어 164 = 1,915. 1~3단계 그림 후보가 75 낱말 줄어 P6b 가 가벼워진다 | 1,800 + 26 + 164 = 1,990 |
| 아이 하루 분량 | 수업 하나는 같다(새 단어 5). 단원마다 새 단어 25, 다지기 수업이 5번이라 뒤쪽 절반은 새 단어 없이 복습 카드만 는다 | 단원마다 30, 다지기 4번 |
| 고칠 정본 | 13절 한 줄, 3.2 표 1~3 행과 관계 표 첫 · 다섯째 줄, 3.4 누계 문장(375 · 825 · 1,275 · 1,725, '공통영어 1,800 과 맞춘다' → '1,800 이내'), 12절 unit.vocab_count 기본값 25 · 30 · 30 · 30 | 없음 |

권하는 안: 25. 까닭 세 줄.
1. 가장 어린 구간의 단원 단어를 17% 줄여 초3~4 300 · 초등 600 과의 차이를 줄인다(3.2 관계 표가 '가장 어린 아이에게 단어 부담이 가장 크다'며 검토 대상으로 둔 그 안이다).
2. 단원마다 다지기 수업이 4 → 5 로 늘어 마지막 배정 단어를 다질 수업이 늘고, 관계 표(5 ≤ 5)와 회화 자리(필요 40)를 지킨다.
3. 시드 수 · 생성 시간은 그대로이고 vocab · 그림이 75 낱말 줄어 1-가 길목(P6b · P8)이 가벼워진다.

대가: 3.4 누계 숫자와 '12단계 누계를 공통영어 1,800 과 맞춘다'가 '1,800 이내'로 바뀐다. 관계 표 첫 줄의 여유가 0 이라 unit.vocab_mastery 를 0.8 보다 올리면 1~3구간이 깨진다(그때 13절에 다시).

### 4. 시드 수 · 생성 시간 · 하루 분량에 주는 영향

권하는 안(25)과 나머지 제안(4~12 구간 · 쓰기 그대로)은 6.3 시드 수(수업 3,821 · 주제 변형까지 7,642 · 회화 카드 2,010 · 단계 평가 문항 2,160 · 회화 평가 카드 72 · 배치 144 · 토리 이야기 80)와 생성 시간(약 125~250시간, 세 세션 약 41~83시간)을 바꾸지 않는다. 바뀌는 것은 1~3구간 배정 수업이 단원마다 6 → 5, 다지기 4 → 5 인 배정표(P4b 배정 함수가 단원 단어 수로 저절로 바꿈)와 vocab 75 낱말 줄어듦이다. 아이 하루 분량(수업 하나의 새 단어 · 목표 시간 · 복습 카드 하루 상한 15장)은 그대로다.

### 5. 단계 평가 유형별 문항 수(level-specs.json `testMix`, 확정 C66)

규칙: 20문항(level.test_items), 단원마다 4. 읽기는 그 단계 수업 문제 비율을 20문항으로 늘린 값. 쓰기 1~3 은 쓰기 문항 유형(pick-word 는 그림 있는 낱말만), 4~5 는 fill-blank · fix-sentence, 6~12 는 둘에 composition. AI 과제(composition · 허용 답 없는 question · presentation)는 쓰기 6단계 이상 · 말하기 9단계 이상에서 벌마다 2개까지, 둘째 세션 끝. 그래서 말하기 3~8단계 question 은 허용 답을 둔 앱 채점 문항이다.

| 영역 · 단계 | 유형별 수 | 까닭 |
|---|---|---|
| 읽기 1 | picture 20 | 1단계 수업이 그림 고르기뿐 |
| 읽기 2 | picture 8 · fact 12 | 수업 2 : 3 |
| 읽기 3 · 4 | fact 20 | 수업이 사실 확인뿐 |
| 읽기 5 | fact 15 · sequence 5 | 3 : 1 |
| 읽기 6 | fact 10 · sequence 5 · main-idea 5 | 2 : 1 : 1 |
| 읽기 7 | fact 10 · inference 5 · main-idea 5 | 2 : 1 : 1 |
| 읽기 8 | fact 8 · inference 4 · vocab-in-context 4 · main-idea 4 | 2 : 1 : 1 : 1 |
| 읽기 9 | topic 4 · fact 8 · inference 4 · vocab-in-context 4 | 1 : 2 : 1 : 1 |
| 읽기 10 | gist 4 · fact 4 · inference 8 · vocab-in-context 4 | 1 : 1 : 2 : 1 |
| 읽기 11 | topic 4 · inference 8 · purpose 4 · vocab-in-context 4 | 1 : 2 : 1 : 1 |
| 읽기 12 | gist 4 · inference 8 · purpose 4 · structure 4 | 1 : 2 : 1 : 1 |
| 쓰기 1 | pick-word 6 · copy-tiles 4 · fill-letters 10 | 철자를 재는 빠진 글자 채우기를 절반, 그림 낱말이 모자랄 수 있어 pick-word 는 6 |
| 쓰기 2 | dictation 8 · build-tiles 6 · assemble-phrase 6 | 수업 단어 6 : 어구 3 에 가깝게 |
| 쓰기 3 | assemble-sentence 20 | 수업 유형 하나 |
| 쓰기 4 | fill-blank 12 · fix-sentence 8 | 단어 상자 단계라 빈칸 채우기를 더 |
| 쓰기 5 | fill-blank 10 · fix-sentence 10 | 예시문 칸 쓰기 단계 |
| 쓰기 6~12 | fill-blank 10 · fix-sentence 9 · composition 1 | 한 세션 10분(NFR-1) 안에 첨삭 채점 작문 하나만. 둘째 세션 끝 |
| 말하기 1~3 | repeat 10 · listening 5 · question 5(허용 답 셋 이상) | 수업이 따라 말하기 중심(단어 5 + 문장 5~6) |
| 말하기 4~8 | repeat 6 · listening 6 · question 8(허용 답 셋 이상) | 질문 답이 수업의 중심이 되는 단계. 허용 답이라 앱 채점 |
| 말하기 9~12 | listening 6 · question 13(허용 답 셋 이상) · presentation 1 | 따라 말하기가 없는 단계. 발표 하나(AI)만 둘째 세션 끝 |
| 회화 | 두지 않음 | 회화 평가는 10턴 카드 2장(3.2) |

단계 예외는 없다(위 표가 단계마다 값). 근거가 약한 것: 말하기 9~12 의 허용 답 question 13 은 표본에서 만들기 어려우면 listening 을 늘린다.

### 6. speaking.answer_max_seconds.<구간>(C53, 12절 '고급')

| 구간 | 제안(초) | 까닭 |
|---|---|---|
| 1-3 | 30 | 두 문장 이상 답하는 활동이 없어 쓰지 않는다. 구간 키라 행만 둔다(4-6 과 같은 값) |
| 4-6 | 30 | 5단계 질문 1~2문장 · 6단계 그림 보고 2문장. 한 문장 답 상한 speech.max_listen_seconds 15 의 두 배 |
| 7-9 | 60 | 7~8단계 2~3문장 · 8단계 그림 3장 3~4문장 · 9단계 발표 45초 < 60 |
| 10-12 | 150 | 발표 60 · 90 · 120초 < 150. 확인 질문도 같은 상한이고 버튼으로 먼저 끝낸다 |

모두 사용 시험에서 잰다(측정값 아님).

### 7. 13절 한 줄 초안

"단원 틀 구간별 값 확정(H5, 6.3 순서 (1), R9 · C49 의 남은 하나): 1~3 25 · 5 · 10(5 + 5) · 3 · 2 · 6 · 4, 4~6 30 · 4 · 13(8 + 5) · 4 · 2 · 8 · 5, 7~9 30 · 4 · 13(8 + 5) · 4 · 2 · 9 · 6, 10~12 30 · 3 · 15(10 + 5) · 5 · 2 · 10 · 7, 쓰기 6~9 k 6 · 정규 7 · 최소 5, 10~12 k 5 · 정규 8 · 최소 6. 3.4 누계 375 · 825 · 1,275 · 1,725(공통영어 1,800 이내). 단계 평가 유형별 문항 수는 근거 문서 (6) 5 표(읽기 = 수업 비율 × 20, 쓰기 1 pick-word 6 · copy-tiles 4 · fill-letters 10 … 6~12 fill-blank 10 · fix-sentence 9 · composition 1, 말하기 1~3 repeat 10 · listening 5 · question 5, 4~8 6 · 6 · 8, 9~12 listening 6 · question 13 · presentation 1, 말하기 question 은 허용 답 셋 이상). speaking.answer_max_seconds 30 · 30 · 60 · 150(1~3 은 쓰지 않음). 3.2 표 · 관계 표 · 3.4 · 12절 기본값 반영 | 요청자 확인(날짜). 학습 설계자 제안, 근거 docs/research/2026-10-16-seed-reference-basis.md (6)절" — 30 안을 고르면 1~3 을 30 · 5 · 10(6 + 4) · 3 · 2 · 6 · 4 로, 3.4 · 3.2 는 그대로 두고 문장을 줄인다.

## (7) level_specs 를 견본에서 고친 곳

견본(`tests/fixtures/seed/builders.ts` 의 READING_TABLE · WRITING_TABLE · SPEAKING_TABLE · TALK_TABLE · levelSpecRows, 12절 기본 설정)과 칸마다 맞댄 결과(`tests/.tmp/p06/diff_level_specs.ts`)다. 수치 칸은 한 곳도 바꾸지 않았다. 견본 수치가 정본과 맞는지는 3.3 표 넷 · 3.6 문장 길이 · 6.3 단계 경계를 따로 읽어 맞댄 검사(아래 (8))가 0 이다.

| 칸 | 고친 행 | 무엇을 |
|---|---|---|
| canDo | 48 | 견본은 '…글을 읽고 문제 n개에 답할 수 있다' 같은 틀 문장이었다. 3.1 · 3.3 에 맞춰 새로 썼다((2)) |
| mode(회화) | 12 | 3.3 회화 대화 방식 열을 더 가깝게(예: 7단계 '상황극(길 묻기 · 계획 세우기) · 토리의 예상 밖 대답 한 번') |
| testMix | 36(읽기 · 쓰기 · 말하기) | 견본에 없었다. H5 확정 값(C66) |
| frame(쓰기 6~12) | 0 | 견본의 3.2 값(6~9 k 6 · 7 · 5, 10~12 k 5 · 8 · 6)과 같다. H5 확정(C66) |

견본에서 그대로 둔 판단: 말하기 1 · 5단계 따라 말하기 문장 낱말 수는 3.3 에 수가 없어 두지 않았다. 말하기 9~12 의 questions.count 0(확인 질문은 presentation 칸). 회화 segments 에 more_talk 을 넣지 않았다(턴 표시, 1-나).

모델 단가표: plan 표 그대로다(effectiveFrom 2026-10-16). `thinkingDefault` 는 규격이 'adaptive' 하나만 받아 여섯 행 모두 adaptive 다. claude-opus-4-8 은 생각 기본이 꺼짐이라(thinking 을 빼면 생각 없이 돈다) 이 값이 사실과 다르다 — P9 가 조합 검사를 만들 때 규격에 'none' 을 더하고 이 행을 고친다(정할 것 아). claude-opus-5-5 의 thinkingOff 는 끌 수 없어 JSON null 이다(규격이 nullable 로 요구). 대체 모델 셋의 thinkingOffEfforts 와 claude-sonnet-5 의 effort 목록은 (추측)이다(H4 뒤 P9 가 Models API 로 확인).

## (8) 일회 검사 결과

| 검사 | 명령(워크트리, `tests/.tmp/p06/`) | 결과 |
|---|---|---|
| 필터 명령 1 | `pnpm -s seed:validate --json \| jq '[.errors[] \| select(.rule != "reference-complete")] \| length'` | 0 |
| 필터 명령 2 | `… \| jq -r '.errors[] \| select(.rule == "reference-complete") \| .message' \| head` | 'reading 1단계 단원 0 규격 행이 없다' … — 남은 오류는 reference-complete 242 뿐(단원 규격 242행이 빈 목록) |
| 검증기 첫 줄 | `pnpm -s seed:validate` | 칸 0 · 통과 0 · 실패 0 · 빈 칸 1300 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 242(종료 1). can-do 숫자 경고 0 |
| 설정값 12절 대조 | `python3 -I check_settings.py <specs> seed/settings.json` | 12절 121행 → 펼친 키 180 = settings.json 180, 범위 · 바꾸는 곳 · 값 다름 0(값 맞대기 밖: speaking.answer_max_seconds 넷만 12절에 값 없음). RESULT 0 |
| 단계 규격 3.3 · 3.6 · 6.3 · 12절 대조 | `python3 -I check_level_specs.py <specs> seed/level-specs.json` | 다름 0. 값을 넷 바꾼 사본으로 돌리면 넷 모두 잡는다(검사의 검사) |
| 견본 대조 | `pnpm exec tsx diff_level_specs.ts` | canDo 48 · testMix 36 · mode 12 행만 다름 |
| 25 안 관계 검사 | settings 사본에서 unit.vocab_count.1-3 = 25 로 `seed:validate --root` | frame-* 오류 0(규격 오류는 reference-complete 242 뿐) |
| 형태 표 · 금지어 시험 문장 | `pnpm exec tsx check_lists.ts` | 72 문장(형태 29 · 금지어 43) 기대와 같음. RESULT 0 |
| 동음이의어 | `python3 -I check_homophones.py` | 33묶음 모든 낱말이 두 안의 vocab 계획에 듦 |
| 1단계 쓰기 철자 패턴 배치 | `build_candidates.py` | 25 안 단원마다 18개 이상, 30 안 21개 이상 |

묶음 2(4~6단계, 2026-10-17):

| 검사 | 명령 | 결과 |
|---|---|---|
| 생성기 맞대기 | `python3 -I tests/.tmp/p06/build_bundle.py . <specs>` | 문제 0: 4~6단계 내용어 = 후보 앞 150(6단계 people → agree), 기능어 = 기능어 표, 묶음 10 × 15 = 내용어, 3.6 학습 요소 글자 = 정본 표, 영역마다 단원 단어 150 · 겹침 0 |
| 필터 명령 1 | `pnpm -s seed:validate --json \| jq '[.errors[] \| select(.rule != "reference-complete")] \| length'` | 0 |
| 필터 명령 2 | `… select(.rule == "reference-complete") …` | 182, 모두 1~3 · 7~12단계 단원 규격 행(4~6단계 0) |
| 검증기 첫 줄 | `pnpm -s seed:validate` | 칸 0 · 통과 0 · 실패 0 · 빈 칸 3280 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 182 |
| 예문 일회 검사 | `pnpm exec tsx tests/.tmp/p06/check_examples.ts 4,5,6` | 501 예문(4단계 175 · 5단계 165 · 6단계 161) 모두 통과, RESULT 0. 보는 것: 한 문장 · 그 낱말 있음 · `sentenceWords` ≤ 상한 · `offbandWords` 0(사전 = vocab + 1~3단계 후보 앞 125 · 기능어 164 · 알파벳) · `formsIn` 범위 밖 0(forms.json + 뒤 단계 임시 형태: 불규칙 과거 · did · will · going to · 비교 · 최상급 · 과거진행 · when 절 · must · should · have to · 동명사 · to 부정사 · 현재완료 · if · 접속사 so · after · before) · `forbiddenHits` 0 · 표기 규칙 |
| 예문 검사의 검사 | 4단계 예문 11개를 일부러 망가뜨린 사본(went · always · bread · because · will · like to · best · 11낱말 · kill · was · some) | 11개 모두 잡음 |
| 형태 표 · 금지어 시험 문장 | `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 139 문장(형태 96 · 금지어 43), RESULT 0 |
| 처음 돌렸을 때 걸린 것 | 예문 검사 첫 판 | 4건: Ms. 문장 잘림(→ Ms. 뺌), 임시 최상급 정규식이 the test · the west 를 잡음(→ 낱말 목록으로) |
| lint · test | `pnpm lint` · `pnpm test` | test 160 통과. lint 는 컨트롤러가 고친 `src/core/seed/reference-index.ts` 서식 한 곳(549~551줄)으로 1 — 그 파일은 지시대로 건드리지 않았다 |

묶음 1(1~3단계, H5 확정 뒤, 2026-10-17):

| 검사 | 명령 | 결과 |
|---|---|---|
| 설정값 12절 대조 | `python3 -I tests/.tmp/p06/check_settings.py <specs> seed/settings.json` | unit.vocab_count.1-3 = 25. 펼친 키 180 = 180, 범위 · 바꾸는 곳 · 값 다름 0, H5 키 · answer_max_seconds 까지 12절(C66 반영)과 같음. RESULT 0 |
| 관계 표(3.2) | `pnpm -s seed:validate` 의 frame-* 규칙 | 0: 1~3구간 마지막 배정 수업 새 단어 5 ≤ 25 × (1 − 0.8) = 5(경계), 배정 5 ≤ 정규 10, 보강 상한 3 ≤ 시드 보강 3. level-specs 의 1~3단계 칸에는 단원 단어 수에 기대는 숫자가 없다(분량 · 문제 수 그대로) |
| 생성기 맞대기 | `python3 -I tests/.tmp/p06/build_bundle.py . <specs>` | 문제 0: 1~3단계 내용어 = 후보 앞 125, 4~6단계 = 앞 150, 알파벳 26 = 대표 낱말 표, 기능어 = 표, 묶음 크기(13 · 12 · 15), 3.6 학습 요소 글자 = 정본, 영역마다 단원 단어 = 그 단계 내용어(겹침 0), 같은 단계 안 영역 사이 단원 단어 모음 같은 단원 0 |
| 필터 명령 1 | `pnpm -s seed:validate --json \| jq '[.errors[] \| select(.rule != "reference-complete")] \| length'` | 0 |
| 필터 명령 2 | `… select(.rule == "reference-complete") …` | 120, 모두 7~12단계 단원 규격 행(1~6단계 0 — 단원 규격 242 가운데 122 완성) |
| 검증기 첫 줄 | `pnpm -s seed:validate` | 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 120. can-do 숫자 경고 0 |
| 예문 일회 검사(1~6 전부, 확정 사전) | `pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,2,3,4,5,6` | 960 예문(1단계 182 · 2단계 137 · 3단계 140 · 4단계 175 · 5단계 165 · 6단계 161) 모두 통과, RESULT 0. 사전은 이제 seed/vocab.json 그대로(7~12단계 기능어만 임시) |
| 예문 검사의 검사(1~3) | 1~3단계 예문 10개를 망가뜨린 사본(can · not big · Let's · There is · likes · because · are playing · don't · went · 6낱말) | 10개 모두 잡음 |
| 형태 표 · 금지어 시험 문장 | `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 139 문장 RESULT 0(낱말 목록을 다시 뽑은 뒤) |
| 동음이의어 | vocab 맞대기 | 33묶음 가운데 1~6단계 vocab 밖 낱말은 weak · blew · peace · brake · cell · bored · whether · past · aloud · allowed · role · roll · sew(모두 7~12단계 후보) — 묶음 3 · 4 에서 vocab 에 들어오면 다시 맞댐 |
| lint · test | `pnpm lint` · `pnpm test` | 0 · 160 통과 |

fix 1(검토 review-p06a 반영, 2026-10-17):

| 검사 | 명령 | 결과 |
|---|---|---|
| 생성기 맞대기 | `python3 -I tests/.tmp/p06/build_bundle.py . <specs>` | 문제 0. vocab 965 · 단원 규격 122 · 형태 표 25. 맞바꿈 37 낱말이 같은 묶음 안에서 들어갔고, 1~6단계 단원 단어는 영역마다 그 단계 내용어 그대로(겹침 0) |
| 필터 명령 1 | `pnpm -s seed:validate --json \| jq '[.errors[] \| select(.rule != "reference-complete")] \| length'` | 0 |
| 필터 명령 2 | `… select(.rule == "reference-complete") …` | 120, 가장 낮은 단계가 7(1~6단계 0) |
| 검증기 첫 줄 | `pnpm -s seed:validate` | 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 120. can-do 숫자 경고 0 |
| 예문 일회 검사 1~6 | `pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,2,3,4,5,6` | 965 예문(1단계 183 · 2단계 137 · 3단계 139 · 4단계 175 · 5단계 170 · 6단계 161) 모두 통과, RESULT 0. 맞바꿈 · 형태 표 고침으로 걸린 예문 9개는 새로 썼다 |
| 형태 표 · 금지어 시험 문장 | `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 183 줄(형태 118 · 금지어 65) 기대와 같음, RESULT 0. 검토가 든 거짓 양성 다섯 · 안 걸려야 할 한국어 다섯 · 주소 꼴 걸림 넷 · 안 걸림 여덟 포함 |
| 단원 단어 × allowedForms 맞대기(새로) | `pnpm exec tsx tests/.tmp/p06/check_unit_words.ts` | 단원 122 · 단원 단어 3,352, 자기 단원에서 막히는 단어 0. RESULT 0 |
| 맞대기의 검사 | 형태 표를 fix 전 꼴(time-at 에 o'clock, have 쓰기 4-3)로 되돌리고 읽기 4-5 에 usually 를 더한 사본 | 5건 모두 잡음(o'clock 3 · have 1 · usually 1) |
| vocab 뜻 · 예문 × 금지어(새로) | `pnpm exec tsx tests/.tmp/p06/check_meanings.ts` | vocab 965 의 한국어 뜻 · 예문이 금지어 · 정규식에 걸리는 것 0. RESULT 0 |
| 동음이의어 | `python3 -I check_homophones.py <homophones.json>` | 32묶음 모든 낱말이 두 안의 vocab 계획에 듦(빠진 낱말 0) |
| 설정값 12절 대조 | `python3 -I check_settings.py <specs> seed/settings.json` | RESULT 0 |
| 단계 규격 대조 | `python3 -I check_level_specs.py <specs> seed/level-specs.json` | 다름 0(can-do 읽기 3 · 회화 1 고친 뒤). RESULT 0 |
| lint · test | `pnpm lint` · `pnpm test` | 0 · 160 통과 |

fix 2(검토 review-p06a-2 반영, 묶음 3 값을 건드리기 전, 2026-10-17):

| 검사 | 명령 | 결과 |
|---|---|---|
| 생성기 맞대기 | `python3 -I tests/.tmp/p06/build_bundle.py . <specs>` | 문제 0. vocab 965 · 단원 규격 122 · 형태 표 25(D5 차례 · head ↔ jeans · dry 꼴 고친 뒤) |
| 형태 표 · 금지어 시험 문장 | `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 207 줄(더한 띄어 쓴 꼴 8 · 주소 8 · 전화 꼴 8 포함), RESULT 0 |
| 단원 단어 × allowedForms · 뜻 × 금지어 | `check_unit_words.ts` · `check_meanings.ts` | RESULT 0 · RESULT 0 |
| 예문 일회 검사 1~6 | `check_examples.ts 1,2,3,4,5,6` | RESULT 0 |
| 필터 명령 · 검증기 첫 줄 | `pnpm -s seed:validate` | 필터 0. `… 실패 0 · … · 경고 0 · 규격 파일 오류 120` |
| 7단계 후보 순위 | `build_candidates.py`(여분 표시를 차례 매기기 첫 기준으로) | 원래 후보 30 이 131~160위로 돌아오고 fix 1 의 32 는 161~192위 |

검토자는 '맞대기의 검사' 사본을 fix 전 꼴로 더 되돌려(쓰기 5-3 에 빈도부사 다섯) 9건을 모두 잡았다(review-p06a-2 1절). 위 fix 1 표의 5건은 사본을 덜 되돌린 값이다.

묶음 3(7~9단계, 2026-10-17):

| 검사 | 명령 | 결과 |
|---|---|---|
| 후보 150 정하기 | `python3 -I build_candidates.py . --cefrj=<cefrj.csv>`(`tests/.tmp/p06` 안) | 문제 0. 당김 4(dialogue · marathon · finally · tire) · 넘김 8(7 → 8 셋 · 8 → 9 둘 · 9 → 10 셋) · 빠지는 낱말 94(초등 권장 0) — `b3-log.json` |
| 생성기 맞대기 | `python3 -I tests/.tmp/p06/build_bundle.py . <specs>` | 문제 0. vocab 1,452 · 단원 규격 182 · 형태 표 42. 7~9단계 내용어 = 후보 앞 150, 기능어 = 기능어 표, 묶음 10 × 15, 3.6 학습 요소 글자 = 정본, 영역마다 단원 단어 = 그 단계 내용어(겹침 0), 같은 단계 영역 사이 같은 묶음 짝 0, 같은 (영역, 단계) 주제 겹침 0, 앞 낱말(FRONT)이 모두 그 단원에 있음 |
| 필터 명령 1 | `pnpm -s seed:validate --json \| jq '[.errors[] \| select(.rule != "reference-complete")] \| length'` | 0 |
| 필터 명령 2 | `… select(.rule == "reference-complete") …` | 60, 가장 낮은 단계가 10(1~9단계 0) |
| 검증기 첫 줄 | `pnpm -s seed:validate` | `seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 60`. can-do 숫자 경고 0, 7~9구간 단원 틀 frame-* 0 |
| 예문 일회 검사 1~9 | `pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,2,3,4,5,6,7,8,9` | 1,452 예문(1단계 183 · 2단계 137 · 3단계 139 · 4단계 175 · 5단계 170 · 6단계 161 · 7단계 165 · 8단계 163 · 9단계 159) 모두 통과, RESULT 0. 형태는 forms.json 42 + 10~12단계 임시 형태 16(`later-forms.json`) |
| 예문 검사의 검사(7~9) | 7~9단계 예문 12개를 망가뜨린 사본(과거진행 · when 절 · must · to 부정사 · 현재완료 · if · 동명사 · 관계대명사 · 수동태 · although) | 12개 모두 잡음. 9단계에 허용되는 ', so' 절 대조 문장은 통과 |
| 형태 표 · 금지어 시험 문장 | `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 310 줄(형태 221 · 금지어 89), RESULT 0 |
| 단원 단어 × allowedForms 맞대기 | `pnpm exec tsx tests/.tmp/p06/check_unit_words.ts` | 단원 182 · 단원 단어 5,152, RESULT 0(frequency-adverbs · some-any · object-pronouns · -ly · 7~9 검출기가 1~9단계 단원 단어를 막지 않음, 브리프 2절 5) |
| vocab 뜻 · 예문 × 금지어 | `pnpm exec tsx tests/.tmp/p06/check_meanings.ts` | vocab 1,452, RESULT 0 |
| 활용형 × 금지어 낱말 | 일회 맞대기 | drink 의 drunk 하나(알고 둔 한계, (5)) |
| 동음이의어 | `python3 -I check_homophones.py <homophones.json>` | 32묶음 모든 낱말이 vocab 계획에 듦. 1~9단계 vocab 밖은 peace · cell · whether · role(모두 10~12단계 몫) |
| 설정값 12절 · 단계 규격(testMix C66) 대조 | `check_settings.py` · `check_level_specs.py` | RESULT 0 · RESULT 0 |
| lint · test | `pnpm lint` · `pnpm test` | 0 · 160 통과 |
| 처음 돌렸을 때 걸린 것 | 위 검사 첫 판 | 예문 1(lights — light 는 형용사만이라 복수형 없음 → 'Suddenly, the room went dark.'), 단원 단어 맞대기 8(문장 첫 -ing 갈래가 living room · building 을 잡음 → 명사 꼴을 뺌), 시험 문장 9(We've got 의 got 을 불규칙 과거로 잡음 → have · 've 뒤 got 은 빼는 꼴로, visit 처럼 명사로도 쓰는 동사를 going to · to 부정사에서 놓침 → 목적지 낱말만 빼는 목록으로, we'll · we've 줄임꼴을 놓침 → he-she · we-they 낱말에 더함, 'Are you going …?'의 진행형은 주어가 껴서 안 잡힘 → 기대값을 고치고 한계 표에 적음, when 절 · had · has · rains 는 기존 · 새 검출기가 바르게 더 잡은 것이라 기대값을 고침) |

묶음 4(10~12단계 · 1~6단계 여분 초등 권장 맞바꿈, 2026-10-17):

| 검사 | 명령 | 결과 |
|---|---|---|
| 후보 150 정하기 | `python3 -I build_candidates.py . --cefrj=<cefrj.csv>` | 문제 0. 당김 8(service · energy · project · compute · laser · campaign · recreation · conclusion) · 넘김(10 → 11 여덟 · 11 → 12 열 · 12 → 밖 열) · 찌꺼기 'however x' · 'discover x' 거름 · advertize → advertise |
| 1~6단계 여분 초등 권장 맞바꿈 | `cand_src.py` `B4_SWAP`(컨트롤러 판정) | 16(4단계 9 · 5단계 4 · 6단계 3). 뺀 낱말을 쓴 예문 여덟을 고침. 7~12단계 당김 · 넘김은 그대로 |
| 생성기 맞대기 | `python3 -I tests/.tmp/p06/build_bundle.py . <specs>` | 문제 0. vocab 1,920 · 단원 규격 242 · 형태 표 58. 같은 단계 영역 사이 같은 묶음 짝 0, 같은 (영역, 단계) 주제 겹침 0, 앞 낱말(FRONT)이 모두 그 단원에 있음 |
| 필터 명령 | `pnpm -s seed:validate --json \| jq '.errors \| length'` | 0(reference-complete 포함 0) |
| 검증기 | `pnpm -s seed:validate` | 종료 0. `seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 0`. `--json` 의 warnings 0(can-do 경고 0) |
| 예문 일회 검사 1~12 | `pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,2,3,4,5,6,7,8,9,10,11,12` | 1,920 예문(10단계 155 · 11단계 159 · 12단계 154 포함) 모두 통과, RESULT 0. 임시 형태 표는 비었다 |
| 예문 검사의 검사(10~12) | 10~11단계 예문 10개를 망가뜨린 사본(가정법 · as ~ as · although · 관계부사 · 의견 표현 · so that · used to · 조동사 수동태 · 문단 연결 · because of) | 10개 모두 잡음. 12단계에 허용되는 for example 대조 문장은 통과 |
| 형태 표 · 금지어 시험 문장 | `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 407 줄(형태 318 · 금지어 89), RESULT 0 |
| 단원 단어 × allowedForms 맞대기 | `pnpm exec tsx tests/.tmp/p06/check_unit_words.ts` | 단원 242 · 단원 단어 6,952, RESULT 0 |
| vocab 뜻 · 예문 × 금지어 | `pnpm exec tsx tests/.tmp/p06/check_meanings.ts` | vocab 1,920, RESULT 0 |
| 활용형 × 금지어 낱말 | 일회 맞대기(원형 1,920 · 활용형 2,742) | drink 의 drunk 하나(알고 둔 한계, (5)) |
| 2022 목록 맞대기 | 일회 맞대기 | 초등 권장(`*`) 800 가운데 앱 어휘 밖 8, 모두 '뺀 낱말'(금지어 · 철자 변이). 빠지는 낱말 누계 242(초등 권장은 활용형 people 하나) |
| 동음이의어 | `python3 -I check_homophones.py <homophones.json>` | 48묶음, vocab 에 없는 낱말 0. RESULT 0 |
| 설정값 12절 · 단계 규격 대조 | `check_settings.py` · `check_level_specs.py` | RESULT 0 · RESULT 0 |
| lint · test | `pnpm lint` · `pnpm test` | 0 · 160 통과 |
| 처음 돌렸을 때 걸린 것 | 위 검사 첫 판 | 예문 4(transferred — transfer 겹자음을 표에 더함, cannot · tested · ended — 품사에 없는 꼴이라 예문을 바꿈), 시험 문장 21(공손한 'Would you help me?'를 가정법으로 잡음 → would you 를 뺌, she'd · 대명사 + used · didn't use to 를 검출기에서 놓치거나 잘못 잡음 → 고침, 나머지 17 가운데 14 는 기존 검출기가 바르게 더 잡은 것이라 기대값을 고치고, 3 은 시험 문장을 한 문장 · 다른 과거분사로 바꾸거나 'is used to + 동사'처럼 알고 둔 한계로 돌림) |

fix 3(검토 review-p06a-3 반영, 2026-10-17):

| 검사 | 명령 | 결과 |
|---|---|---|
| 생성기 맞대기 | `python3 -I tests/.tmp/p06/build_bundle.py . <specs>` | 문제 0. vocab 1,920 · 단원 규격 242 · 형태 표 58 |
| 필터 명령 · reference-complete | `pnpm -s seed:validate --json \| jq '.errors \| length'` | 0 |
| 검증기 | `pnpm -s seed:validate` | 종료 0. `seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 0`, `--json` warnings 0 |
| 예문 일회 검사 1~12 | `check_examples.ts 1,…,12` | 1,920, RESULT 0 |
| 형태 표 · 금지어 시험 문장 | `check_lists.ts` | 450 줄(형태 361 · 금지어 89), RESULT 0 |
| 정형 표현 훑기(새로) | `pnpm exec tsx tests/.tmp/p06/scan_phrases.ts` | 79 문장, 필요한 단계에서 막힘 0. RESULT 0 |
| 단원 단어 × allowedForms | `check_unit_words.ts` | 단원 242 · 6,952, RESULT 0 |
| vocab 뜻 · 예문 × 금지어 | `check_meanings.ts` | 1,920, RESULT 0 |
| 주제 겹침 | `build_bundle.py` | 0(바꾼 주제 아홉 포함) |
| python 셋 | `check_settings.py` · `check_level_specs.py` · `check_homophones.py` | RESULT 0 · 0 · 0(48묶음) |
| 단계 수 · 누계 | 일회 맞대기 | 125 · 125 · 125 · 150 × 9, 누계 375 · 825 · 1,275 · 1,725 |
| lint · test | `pnpm lint` · `pnpm test` | 0 · 160 |

Minor 정리(review-p06a-4 N-1~N-3, 2026-10-17): 생성기 문제 0 · 예문 1~12 RESULT 0(1,920) · 시험 문장 459 줄 RESULT 0 · 훑기 79 막힘 0 · 단원 단어 맞대기 0 · 뜻 × 금지어 0 · python 셋 0 · `pnpm -s seed:validate` 종료 0(첫 줄 '실패 0 · 규격 파일 오류 0', 경고 0) · lint 0 · test 160 · 누계 375 · 825 · 1,275 · 1,725.

