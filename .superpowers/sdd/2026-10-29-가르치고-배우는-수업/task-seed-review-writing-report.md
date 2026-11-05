# 쓰기 3단계 단원 1 정규 시드 검토 보고(xhigh · 수업 26) — 설계 · 화면 검토자, 2026-10-30 05:4x

**판정: Changes requested** — Critical 0 · Important 1 · Minor 6(그 가운데 글만 고치는 것 2, 선택 1) · 참고 7. 고칠 곳은 모두 칸 하나씩의 글 정정이고 구조 · 규칙 위반은 없다. 정정 뒤 다시 검증(오류 0 · 경고 0)하면 적재해도 된다.

- 파일: `.claude/worktrees/p13d/tests/.tmp/l3-samples/xhigh/lessons/writing/3/1.json`(211,622바이트 · 수업 26 = 승인 1 + 새 25)
- 기준: 생성 브리프 `seed/prompts/writing-3.md` 3판 · `_template.md` R5~R16 · `grammar-terms.json`(68) · `vocab.json` · `unit-specs.json` · 정본 6.3 · 6.4 · 3.3 · 델타 spec 설계 1 · 2 · 6 · 7 · 생성자 보고 `gen-writing-3-xhigh.md`
- 방법: 26수업 전체를 읽기 꼴로 뽑아 아이 눈으로 읽고(본보기 78 · 같이 해 보기 52 · 혼자 문항 130 · 짝 130 · 되짚기 26), 규칙은 스크립트로 전수 확인했다. 검증기도 다시 돌렸다(`pnpm -s seed:validate --root tests/.tmp/l3-samples/xhigh --areas writing --json`: 이 파일 오류 0 · 경고 0. 전체 경고 4 는 다른 단원 · 단계의 `unit-goals`).

## 1. 자동 확인(전수) — 모두 통과

| 볼 것 | 결과 |
|---|---|
| 승인 수업(배정 1 · 변형 1) 글자 그대로 | 브리프 12절 JSON 과 정규화 해시 같음(`4cbd73ef…`), 키 차례까지 같음 |
| 수업 수 · 칸 차례 · generation | 26(변형 2 × (정규 10 + 보강 3)), 칸 차례 승인 수업과 같음, 새 25 는 model `claude-opus-5-5` · xhigh · 2026-10-30 · briefHash `f4554611…` · agentHash `ef819801…` · revision 1 · correction 0 |
| 짝 수 = 채점 혼자 문항 수 | 130 = 130 |
| 선생님 말(todayKo · lineKo · rightKo · wrongKo · whyKo · closeKo · closeKoPracticed, 수업마다 20줄) | 문법 용어 68 없음 · 모두 해요체(요 · 예요 · 이에요 · 볼까요? · 볼래요?) · 가운뎃점 없음 · '네가 고른' 꼴 없음 · {NAME} · {TEACHER} 없음 · 40자 안 |
| 영어 문장의 뜻(ko · meaningKo) | 모두 반말 |
| 칩 role | 본보기 78 · 되짚기 26 모두 thing → is → how → end, 칩 글을 이으면 문장과 같음 |
| 같이 해 보기 | 첫째: 빈칸 2 = 남은 카드 2, 남은 카드가 빈칸 정답과 같고 정답 차례와 다르게 섞임, slot 이 빈칸 번호, filled 가 정답 차례. 둘째: 정답 전부 채움 · capital false · slot "capital" · choices 없음 |
| 혼자 문항 · 짝(260) | 모두 assemble-sentence, accepted 하나(대문자 시작 · 마침표 끝), 카드 = 정답 낱말 + "." 한 장씩(소문자, living · room 두 장), 카드가 정답 차례와 다름, 3~5낱말, 이름 · I 카드 없음, whyKo 있음, goal write-3-1-1, 어구 차례 문항(the · 어때요 · 무엇 · is · .) 수업마다 1개 이상 |
| 한 수업에 문장 틀 하나 | is 수업 16 · are 수업 10, 섞임 없음(다지기 6 · 7 · 9 is, 8 · 10 are, 보강 1 · 2 is, 3 are — 브리프 11절 제안대로). '무엇'의 수와 is · are 일치 |
| 낱말 짝 · 같은 문장(수업 안) | (무엇, 어때요) 짝 겹침 0, 글자 같은 문장 0 — 본보기 ↔ 같이 해 보기 ↔ 혼자 ↔ 짝 모두 다름 |
| 변형 1 · 2 사이 | 같은 수업 번호끼리 낱말 짝 겹침 0, 글자 같은 문장 0(단원 전체로도 0). todayKo · shiftKo · newWords · 틀(is / are) 변형끼리 같음 |
| 어휘 범위 | 영어 칸 전부가 1~2단계 낱말(활용형 포함) + we · they + 그 수업까지 배정된 단원 단어 안. 범위 밖 0, 앞질러 쓴 단원 단어 0 |
| 단원 단어 | 배정 newWords 가 배정표와 같고 preview 와 같음, 새 단어가 혼자 문장에 있음, 새 수업의 preview.example 은 빈 글, unitWords 가 쓰임과 정확히 같음 |
| 단원 1 · 2 맞바꿈 | cut · paint · fix · carry · pick · drop · hold 는 어디에도 없음, high · low · large · far · road · bridge · train 이 배정 4 · 5 의 newWords |
| 덮기 | 다지기 5 로 단원 단어 25 모두 다시 나옴(변형마다). 보강 셋으로 1번 이상 25 · 2번 이상 1(변형 1 living room · 변형 2 dark) — 생성자 보고와 같음 |
| 되짚기 | frameEn = todayEn, closeKo 는 '~ 수 있어요', closeKoPracticed 에 숙달 단정 없음, 둘 다 있음 |
| 제목 | 26개 모두 다름 |
| 그림 | picture 칸을 쓴 본보기 없음(브리프 9절: 3단계는 선택) — 볼 것 없음 |

## 2. 지적

### Important

**I-1. 본보기의 '무엇'이 가리키는 것이 없다 — assigned:5:v1 model3 `They are far.`(ko "그것들은 멀리 있어.")**
- 근거: 브리프 10절 "We · They 는 '무엇' 자리에 쓸 수 있다(We are happy.). 누구인지 모호해 뜻이 흐려지는 문장은 쓰지 않는다". 본보기는 선생님이 '무엇 → are → 어때요'를 보이는 자리인데, 칩 [They]무엇 이 무엇인지 아이가 알 길이 없고 뜻 "그것들은"도 가리키는 것을 말해 주지 않는다. 다른 are 수업 아홉은 모두 셋째 본보기를 `We are ~.`(우리는 ~) 로 두어 가리키는 것이 분명하다(assigned:4:v1 만 `My cups are round.`). 생성자도 "'They are far.' 흐림"으로 보고했다.
- 브리프 11절 배정 5 메모가 예로 `They are far.` 를 적어 생성자는 그대로 따랐다. 브리프의 그 예가 10절 규칙과 어긋나는 것이므로 시드만 정정 판으로 고치고, 브리프는 다음 판을 쓸 때 손본다(지금 고치면 판이 바뀌어 다시 생성이 된다).
- 고칠 글: en `We are glad.` · ko `우리는 기뻐.` · chips [We]thing [are]is [glad]how [.]end · lineKo `we 로 시작해도 are 를 놓아요.`(glad 는 2단계, 이 수업 안에 없음. far 는 item2 · spare2 에 그대로 남는다). 'the + 여럿' 꼴을 더 보이고 싶으면 대신 `The stars are far.` · `별들이 멀리 있어.` · lineKo `the 로 시작하는 여럿도 are 예요.`(star 는 1단계, 이 수업 안에 없음).

### Minor

**M-1. 뜻이 흐린 같이 해 보기 — assigned:3:v2 together1 `The robot is bright.`(ko "로봇이 밝아.")**
- 근거: 브리프 '아이 눈'(뜻이 자연스럽고 어린이 세계의 장면). 로봇이 '밝다'는 영어로도 한국어로도 무엇을 말하는지 흐리다. 같은 수업 item5 · spare5 는 `밝은 색이야` 로 뜻을 풀었는데 이 칸만 안 풀었다. 생성자 보고의 후보.
- 고칠 글: cards [the, lamp, is, bright, .] · meaningKo `전등이 밝아.` · accepted [`The lamp is bright.`] · filled [the, lamp, null, null, .] · rightKo `맞아요! lamp 다음에 is 예요.` · wrongKo `lamp 다음에 is, 그다음 bright 예요.`(lamp 1단계, 이 수업 안에 없음. 우주 묶음에 맞추려면 `The star is bright.` · `별이 밝아.` 도 된다 — reinforce:7:v1 model1 과 글자가 같지만 변형이 달라 괜찮다).

**M-2. 어색한 장면 — assigned:4:v2 together2 `The trucks are low.`(ko "트럭들이 낮아.")**
- 근거: 같은 '아이 눈' 기준. 트럭은 아이에게 높은 것이라 '낮아'가 어색하다(생성자 후보). 대문자만 누르는 칸이라 학습을 막지는 않는다.
- 고칠 글: cards [the, tents, are, low, .] · meaningKo `텐트들이 낮아.` · accepted [`The tents are low.`] · filled [the, tents, are, low, .](tent 1단계, 이 수업 안에 없음. `The beds are low.` 도 된다).

**M-3. 어색한 장면 — reinforce:10:v2 item3 `The roads are red.`(ko "길들이 빨간색이야.") · 그 짝 `The roads are yellow.`**
- 근거: 같은 기준. 빨간 길 · 노란 길은 아이가 그릴 장면이 아니다(생성자 후보).
- 고칠 글: item3 cards [long, roads, the, are, .] · meaningKo `길들이 길어.` · accepted [`The roads are long.`] · whyKo `roads 다음에 are, 그다음 long 이에요.` / spare cards [old, are, the, roads, .] · meaningKo `길들이 오래됐어.` · accepted [`The roads are old.`] · whyKo `roads 다음에 are, 그다음 old 예요.`(long · old 는 이 수업 안에 없음. 변형 1 의 reinforce:10 item3 · assigned:5 item3 과 글자가 같지만 변형이 달라 괜찮다).

**M-4. 뜻 글이 어색한 한국어 — assigned:1:v2 item1.spare meaningKo `교실이 바빠.`(en `The classroom is busy.`)**
- 근거: 과제 글로 아이에게 보이는 줄(브리프 5절 meaningKo). '교실이 바빠'는 한국어로 성립하지 않는다. 같은 생성자가 reinforce:6:v2 item2 에서는 `거실이 북적여.` 로 잘 옮겼다.
- 고칠 글: `교실이 북적여.`

**M-5. 뜻 글이 어색한 한국어 — assigned:5:v1 item3.spare meaningKo `길들이 새 길이야.`(en `The roads are new.`)**
- 고칠 글: `길들이 새로 생겼어.`(assigned:1:v2 together2 `식당이 새로 생겼어.` 와 같은 결).

**M-6. 가리키는 것 없는 짝 — reinforce:9:v1 item1.spare `It is soft.`(ko "부드러워.")**
- 근거: It 문장은 날씨 · 밝기 · 온도처럼 가리킬 것이 없어도 되는 말(It is cold. · It is dark. · It is fun.)에서 자연스럽다. '부드러워'는 무엇이 부드러운지 없이는 뜻이 서지 않는다. 짝은 아이가 처음 틀린 뒤 혼자 다시 해 보는 독립 기회라 뜻이 서야 한다.
- 고칠 글: cards [fun, it, is, .] · meaningKo `재미있어.` · accepted [`It is fun.`] · whyKo `it 다음에 is, 그다음 fun 이에요.`(fun 2단계, 이 수업 안에 없음).

**M-7(선택). 제목 · 장면 되풀이 — 변형 1 의 assigned:5 「다리들이 길어요」 · reinforce:10 「다리들이 오래됐어요」 · remedial:3 「다리들이 작아요」**
- 근거: 브리프 10절 "한 단원 수업 26개의 제목과 장면이 서로 겹치지 않게 한다". 세 수업이 같은 낱말 다섯을 다시 쓰니 다리 · 기차가 되풀이되는 것은 자연스럽지만, 수업 목록에 '다리들이 …'가 셋 보인다. 변형 2 는 「버스들이 커요」 · 「기차들이 하얘요」 · 「기차들이 검은색이에요」로 둘이다.
- 고치려면 remedial:3:v1 의 model1 · todayEn · recap.frameEn · title 을 `The trains are small.` · `기차들이 작아요` 로(함께 fromEn `the small trains`, ko `기차들이 작아.`, chips [The trains]). 이 수업의 trains 문장(far · yellow · big)과 짝이 겹치지 않는다. 두지 않아도 학습에는 해가 없다.

## 3. 참고(고치지 않아도 되는 것)

1. **변형 1 · 2 사이 낱말 짝 겹침은 학습에 해가 되지 않는다.** 글자 같은 문장은 단원 전체에 0, 같은 수업 번호 사이 (무엇, 어때요) 짝 겹침도 0 이다. 더 넓게 보아도 아이는 부모가 고른 묶음 하나의 변형으로 배우고, 다른 묶음의 변형은 '단어 익히기' 상태의 연습 수업과 '이 단원 처음부터'에만 쓰므로(정본 6.3 "관심 주제는 시드의 주제 묶음으로 반영한다" 문단) 그때 비슷한 문장을 다시 보는 것은 되풀이 연습이지 노출이 아니다.
2. **top 의 두 뜻(팽이 · 꼭대기)은 문제없다.** assigned:4:v2 spare1 `The tops are round.`(팽이들이 둥글어) · remedial:2:v2 item4 `The top is round.`(팽이가 둥글어). vocab 의 첫 뜻이 팽이이고 그림 키 top 도 팽이이며 뜻 글이 팽이로 고정한다.
3. **뜻 글에 '안이'를 더한 8곳**(assigned:3:v2 item4 · spare4, reinforce:7:v2 together1 · item4 · spare4 · spare5, remedial:2:v2 item3 · spare3 — `The train is dark.` → "기차 안이 어두워." 꼴). 영어에 없는 '안'을 한국어가 보태지만 그래야 자연스러운 한국어가 되고, 카드는 주어진 것만 놓으므로 과제에 영향이 없다. 둔다.
4. **같이 해 보기 첫째의 남은 카드가 26수업 모두 [어때요, is/are] 차례다.** 늘 뒤집으면 '두 장을 바꿔 놓는다'는 요령으로 풀 수 있다. 규칙 위반은 아니고(브리프는 '정답 차례와 다르게'만 요구) 지금 묶음은 두되, 다음 판 브리프에서 '빈칸 자리를 무엇 · is 로도 둔다'를 더하기를 권한다.
5. `The roads are white.`(remedial:3:v1 item3, 길들이 하얘)는 눈 온 길로 읽히므로 둔다. `The sheep are soft.`(reinforce:8:v1 item2)는 sheep 이 -s 없이 여럿이지만 are 수업이라 아이가 is · are 를 고르지 않으므로 함정이 아니다.
6. 브리프 11절 배정 5 메모의 예 `They are far.` 는 10절 규칙과 어긋난다(I-1). 다음 판 브리프를 쓸 때 `We are ~.` 로 바꾸기를 권한다.
7. 되짚기 · 본보기 뜻 글의 조사(예요 · 이에요 · 은 · 는)가 영어 낱말의 소리에 맞게 붙어 있다(long 이에요 · pink 예요 · hard 는 · green 은). 읽어 주기에서 어색할 곳을 찾지 못했다.

## 4. 좋은 점 셋

1. **규칙이 전수에서 지켜졌다.** 승인 수업이 글자 그대로이고, 260 조립 문항의 카드 · 정답 · 섞임 · 낱말 수 · 짝이 모두 맞으며, 어휘 범위 밖 낱말과 앞질러 쓴 단원 단어가 하나도 없다. 수업 안 낱말 짝 겹침도 0 이라 '다 맞힌 아이에게는 혼자 문항이 곧 다른 예시'(설계 7)가 성립한다.
2. **선생님 말이 아이 말이다.** 문법 용어 없이 "여럿이면 is 대신 are 를 놓아요"(assigned:4:v1 model1) · "it 으로 시작해도 대문자, 마침표를 붙여요"(assigned:3:v1 model2)처럼 틀을 넓히는 자리마다 바뀌는 것만 한 줄로 말하고, '왜' 한 줄이 "X 다음에 is, 그다음 Y 예요" 하나의 꼴로 일관돼 아이가 어디를 보면 되는지 바로 안다.
3. **변형 2 가 묶음에 맞게 장면을 바꿨다.** 같은 틀 · 같은 새 단어로 버스 · 연 · 로봇 · 북 · 비행기(탈것 · 놀이) 장면을 만들었고, 변형 1 은 침대 · 포도 · 강아지 · 별(집 · 자연)로 갈라서 두 변형이 글자 같은 문장 없이 분리됐다. 배정 5 의 '창밖' 시점(todayKo "창밖에 보이는 것들을")으로 단원 주제 밖 낱말(길 · 다리 · 기차)을 방 안 시점에 묶은 것도 브리프 제안을 잘 살렸다.

## 5. 정정 목록(수업 · 칸 · 지금 글 → 고칠 글)

| # | 심각도 | 수업 | 칸 | 지금 글 | 고칠 글 |
|---|---|---|---|---|---|
| I-1 | Important | assigned:5:v1 | teach.models[2] en · ko · chips · lineKo | `They are far.` · 그것들은 멀리 있어. · [They] · they 로 시작해도 are 를 놓아요. | `We are glad.` · 우리는 기뻐. · [We]thing [are]is [glad]how [.]end · we 로 시작해도 are 를 놓아요. (대안 `The stars are far.` · 별들이 멀리 있어.) |
| M-1 | Minor | assigned:3:v2 | teach.together[0] cards · meaningKo · accepted · filled · rightKo · wrongKo | the robot is bright . · 로봇이 밝아. · The robot is bright. · [the, robot, null, null, .] · robot 다음에 is 예요. · robot 다음에 is, 그다음 bright 예요. | the lamp is bright . · 전등이 밝아. · The lamp is bright. · [the, lamp, null, null, .] · 맞아요! lamp 다음에 is 예요. · lamp 다음에 is, 그다음 bright 예요. (choices [bright, is] 그대로) |
| M-2 | Minor | assigned:4:v2 | teach.together[1] cards · meaningKo · accepted · filled.cards | the trucks are low . · 트럭들이 낮아. · The trucks are low. | the tents are low . · 텐트들이 낮아. · The tents are low. · [the, tents, are, low, .] |
| M-3 | Minor | reinforce:10:v2 | content.items[2] cards · meaningKo · accepted · whyKo | red roads the are . · 길들이 빨간색이야. · The roads are red. · roads 다음에 are, 그다음 red 예요. | long roads the are . · 길들이 길어. · The roads are long. · roads 다음에 are, 그다음 long 이에요. |
| M-3 | Minor | reinforce:10:v2 | content.items[2].spare cards · meaningKo · accepted · whyKo | yellow are the roads . · 길들이 노란색이야. · The roads are yellow. · roads 다음에 are, 그다음 yellow 예요. | old are the roads . · 길들이 오래됐어. · The roads are old. · roads 다음에 are, 그다음 old 예요. |
| M-4 | Minor | assigned:1:v2 | content.items[0].spare.meaningKo | 교실이 바빠. | 교실이 북적여. |
| M-5 | Minor | assigned:5:v1 | content.items[2].spare.meaningKo | 길들이 새 길이야. | 길들이 새로 생겼어. |
| M-6 | Minor | reinforce:9:v1 | content.items[0].spare cards · meaningKo · accepted · whyKo | soft it is . · 부드러워. · It is soft. · it 다음에 is, 그다음 soft 예요. | fun it is . · 재미있어. · It is fun. · it 다음에 is, 그다음 fun 이에요. |
| M-7 | Minor(선택) | remedial:3:v1 | title · teach.todayEn · models[0] en · ko · fromEn · chips · lineKo · recap.frameEn · recap.chips | 다리들이 작아요 · The bridges are small. · 다리들이 작아. · the small bridges · [The bridges] · '다리들이 작아요'도 … | 기차들이 작아요 · The trains are small. · 기차들이 작아. · the small trains · [The trains] · '기차들이 작아요'도 무엇, are, 어때요 차례예요. |

정정은 모두 변형 안 · 수업 안에서 낱말 짝이 겹치지 않음을 확인했다(glad · lamp · tents · long · old · fun 이 그 수업에 없음). 선생님 말 길이 · 시간 합은 지금 글과 같거나 짧아 검증기 상한에 닿지 않는다. 정정 뒤 `generation.correction` 을 올리고 검증기를 다시 돌린다.
