# 읽기 3단계 단원 1 정규 시드 검토 보고(xhigh · 수업 26) — 설계 · 화면 검토자, 2026-10-30 05:5x

**판정: Changes requested** — Critical 0 · Important 2 · Minor 6(그 가운데 글만 고치는 것 2, 선택 4) · 참고 9. 글 자체(지문 · 문항 · 선생님 말)는 규칙을 다 지켰고, 고칠 것은 보기 차례(Important 1)와 변형 2 안에서 겹친 짝 셋(Important 2)이다. 둘 다 글의 뜻을 바꾸지 않는 정정이라 정정 뒤 `seed:validate`(오류 0 · 경고 0)를 다시 통과하면 적재해도 된다.

- 파일: `.claude/worktrees/p13d/tests/.tmp/l3-samples/xhigh/lessons/reading/3/1.json`(275,513바이트 · 수업 26 = 승인 1 + 새 25)
- 기준: 생성 브리프 `seed/prompts/reading-3.md` 3판 · `_template.md` R5~R16 · `grammar-terms.json`(68) · `vocab.json` · `unit-specs.json`(read-3-1-1) · `images.json`(217) · 정본 6.3 · 6.4 · 3.3 · 델타 spec 설계 1 · 2 · 6 · 7 · 생성자 보고 `gen-reading-3-xhigh.md` · 같은 뿌리의 말하기 파일 `…/xhigh/lessons/speaking/3/1.json`
- 방법: 26수업 전체를 읽기 꼴로 뽑아 아이 눈으로 읽고(본보기 78 · 같이 해 보기 52 · 지문 26 · 혼자 문항 78 · 짝 78 · 되짚기 26), 규칙은 스크립트로 전수 확인했다. 검증기도 다시 돌렸다(`pnpm -s seed:validate --root tests/.tmp/l3-samples/xhigh --areas reading --json`: 이 파일 오류 0 · 경고 0, summary passed 25 · pendingHuman 1(풀이 검사의 사람 확인 1건, 아래 참고 1). 전체 경고 4 는 다른 단원 · 단계의 `unit-goals`).

## 1. 자동 확인(전수) — 모두 통과

| 볼 것 | 결과 |
|---|---|
| 승인 수업(배정 1 · 변형 1) 글자 그대로 | 브리프 12절 JSON 과 정규화 JSON 이 같음(sha256 `98c0838b…`), generation 도 제 값(briefHash `9970145e…` · agentHash `f3ecb56e…` · 2026-10-29) |
| 수업 수 · 칸 · generation | 26(변형 2 × (배정 5 + 다지기 5 + 보강 3)), 본보기 3 · 같이 해 보기 2 모든 수업. 새 25 는 model `claude-opus-5-5` · xhigh · 2026-10-30 · briefHash `fc57e2f0…` · agentHash `ef819801…` · revision 1 · correction 0 |
| 짝 수 = 채점 혼자 문항 수 | 78 = 78 |
| 분량 · 문장 꼴 | 지문 43~54낱말(평균 49.5), 모든 영어 문장 7낱말 이하, 짝 글 최대 14낱말(상한 20). 금지 꼴(There is · Let's · 3인칭 -s · 명령문 · Wh 의문문 · our · their · them · us · don't) 0 |
| 어휘 범위 | 영어 칸 전부가 1~2단계 낱말(활용형 포함) + we · they + 그 수업까지 배정된 단원 단어 + 이름 표 안. 범위 밖 0, 앞질러 쓴 단원 단어 0 |
| 선생님 말(todayKo · lineKo · rightKo · wrongKo · whyKo · closeKo · closeKoPracticed, 수업마다 18줄 = 468줄) | 문법 용어 68 없음, 모두 해요체, 40자 안 · 2문장 안, 영어 낱말 뒤 조사 띄어 씀, 새 수업 줄에 가운뎃점 없음, '네가 고른' 꼴 없음, {NAME} · {TEACHER} · 선생님 이름 없음 |
| 영어 문장의 뜻(ko) | 모두 반말, 뜻이 자연스러움 |
| 칩 role | 본보기 78 · 되짚기 26 모두 who → do → what · where, 칩 글을 이으면 문장 그대로(관사 포함). 'look at' · 'listen to' 는 do 칩 하나(생성자 판단, 참고 6) |
| 정답 유일성 | 혼자 78 · 짝 78 · 같이 해 보기 52 모두 정답을 채운 문장이 글에 그대로 있고, 오답을 채운 문장은 글에 없음. 오답은 글에 나온 다른 누가 · 무엇 · 어디에서 가져옴(가려 읽기). 사람 확인 1건과 생성자의 '그럴 법한 오답' 둘도 글로는 하나로 정해짐(참고 1 · 2) |
| 이름표 · 띠 | 문항 · 짝 모두 빈칸 하나 + askRole, 수업마다 who · what · where 하나씩. retryHighlight 78 이 지문의 한 문장 그대로이고 정답 낱말을 품음. 같이 해 보기 highlight 52 가 글 안의 글자 |
| whyKo 의 주장 | '두 번 나와요' 줄은 그 하는 일 말이 글에 2번 이상, '찾아요. 바로 앞에 · 그 뒤에' 줄은 1번만 나옴(156줄 전부 맞음). 가려 읽기(같은 하는 일 말 두 번) 문항이 수업마다 1개 이상 |
| 글로서리 | 지문 · 같이 해 보기 글 · 짝 글의 기능어 밖 낱말이 모두 표제어에 있고, 안 쓰는 항목 0, 이름 9 모두 proper |
| 인물 | 동물 인물 Max · Ted · Gus · Tori 는 먹기 · 물 마시기 · 가기 · 오기 · 놀기만(Max 가 '무엇' 자리에 오는 'Ben and I wash Max' 는 사람이 씻김). 이름 표 밖 이름 0, 부르는 말 0, Dan · Tess 는 승인 수업에만, Momo · Tori 수업 9(상한 13) |
| 본보기 ↔ 같이 해 보기 ↔ 혼자 ↔ 짝의 다름 | 새 25수업에서 혼자 · 짝 답 문장이 본보기 · 같이 해 보기와 (누가 쌍, 하는 일) · (하는 일, 무엇 · 어디) 어느 쪽도 겹치지 않음. 같은 수업 안 같은 문장 0, 같은 수업 안 낱말 짝(정답 · 함정, 뒤집은 꼴 포함) 겹침 0 |
| 변형 1 · 2 | 같은 수업 번호끼리 newWords · todayKo · shiftKo 같음. 제목 26 모두 다름 |
| 덮기 | 다지기 5 로 단원 단어 25 모두 다시 나옴, 보강 3 으로 1번 이상 25 · 2번 이상 25(변형마다). 생성자 보고와 같음 |
| 되짚기 | frameEn = todayEn, closeKo 는 '~ 수 있어요', closeKoPracticed 에 숙달 단정 없음 |
| 그림 | picture 는 모두 images.json 키이고 그 본보기 문장에 나온 1~2단계 사물, 3단계 단원 단어 그림 0(복합어 둘은 Minor M-4) |
| 같은 수업 번호의 말하기 수업과 사실 대조 | 13묶음(배정 5 · 다지기 5 · 보강 3) 전부 대조. 말하기가 '아니'라고 답한 사실을 읽기가 참으로 둔 직접 모순 0. 같은 쌍 · 같은 하는 일 말에 무엇만 다른 약한 겹침 22(참고 7) |

## 2. 지적

### Important

**I-1. 정답 자리가 고정 패턴이다 — 새 25수업 전부의 혼자 문항 · 짝 · 같이 해 보기**
- 근거: 생성 브리프 5절 "정답 자리를 1~4 에 고루 나눈다". 실제는 혼자 문항 75 의 answerNo 가 모든 수업에서 [2, 4, 2] 또는 [4, 2, 4](1 · 3 번 보기가 정답인 적이 없음), 짝 75 는 모두 [1, 3, 1] 또는 [3, 1, 3], 같이 해 보기는 [1, 2] · [2, 1] 이 수업마다 번갈아 든다. 생성자 보고의 "정답 자리: 4지 156 = 40 · 39 · 39 · 38" 은 혼자 + 짝을 합친 수라 이 치우침이 가려졌다. 앱은 보기를 섞지 않는다(`src/components/activities/reading.tsx` 가 `question.options` 차례 그대로 그리고, `src/` 에 섞는 코드가 없음).
- 왜 중요한가: 아이는 한 수업에 문항 셋을 보고 열 수업이면 서른 문항을 본다. '정답은 늘 둘째 아니면 넷째'를 알아채면 모르는 문항도 둘 가운데 찍어 맞히게 되어(1/4 이 1/2 로), 독립 수행 근거 · 단원 통과(최근 5회 80%) · 되짚기 '할 수 있어요' 고르기가 모두 부풀려진다.
- 고칠 것: 보기 차례만 바꾸고 answerNo 를 맞춘다(보기 글 · whyKo · retryHighlight · 글로서리는 그대로. 정답을 옮길 때 다른 보기 셋의 상대 차례는 유지). 아래 표대로 두면 혼자 1~4 = 19 · 19 · 19 · 18, 짝 19 · 18 · 19 · 19, 같이 해 보기 1 · 2 = 25 · 25 이고 [2,4,2] · [4,2,4] · [1,3,1] · [3,1,3] 꼴이 없다(승인 수업은 그대로).

| 수업 | 같이 해 보기 T1 · T2 | 혼자 Q1 · Q2 · Q3 | 짝 Q1' · Q2' · Q3' |
|---|---|---|---|
| assigned:2:1 | 1 · 2 | 1 · 3 · 3 | 3 · 2 · 4 |
| assigned:3:1 | 2 · 1 | 1 · 1 · 2 | 2 · 1 · 4 |
| assigned:4:1 | 1 · 2 | 3 · 2 · 1 | 1 · 1 · 3 |
| assigned:5:1 | 2 · 2 | 1 · 4 · 1 | 4 · 3 · 3 |
| reinforce:6:1 | 1 · 1 | 4 · 2 · 3 | 2 · 3 · 3 |
| reinforce:7:1 | 2 · 1 | 4 · 3 · 1 | 1 · 4 · 4 |
| reinforce:8:1 | 2 · 1 | 3 · 4 · 3 | 2 · 2 · 3 |
| reinforce:9:1 | 2 · 2 | 3 · 4 · 2 | 2 · 4 · 4 |
| reinforce:10:1 | 1 · 1 | 1 · 2 · 2 | 4 · 2 · 2 |
| remedial:1:1 | 1 · 1 | 4 · 3 · 2 | 4 · 3 · 4 |
| remedial:2:1 | 2 · 2 | 2 · 2 · 3 | 4 · 1 · 1 |
| remedial:3:1 | 1 · 2 | 3 · 3 · 4 | 2 · 3 · 1 |
| assigned:1:2 | 1 · 2 | 1 · 4 · 4 | 3 · 4 · 1 |
| assigned:2:2 | 1 · 2 | 4 · 2 · 3 | 2 · 4 · 3 |
| assigned:3:2 | 1 · 1 | 1 · 1 · 2 | 3 · 1 · 4 |
| assigned:4:2 | 2 · 2 | 1 · 1 · 4 | 1 · 3 · 3 |
| assigned:5:2 | 2 · 1 | 4 · 4 · 3 | 2 · 1 · 4 |
| reinforce:6:2 | 2 · 1 | 2 · 2 · 3 | 1 · 4 · 2 |
| reinforce:7:2 | 2 · 2 | 4 · 2 · 1 | 3 · 2 · 1 |
| reinforce:8:2 | 2 · 2 | 2 · 1 · 3 | 3 · 1 · 1 |
| reinforce:9:2 | 2 · 1 | 1 · 4 · 1 | 4 · 2 · 4 |
| reinforce:10:2 | 1 · 1 | 3 · 2 · 4 | 2 · 4 · 1 |
| remedial:1:2 | 1 · 2 | 1 · 4 · 2 | 3 · 1 · 2 |
| remedial:2:2 | 1 · 1 | 4 · 2 · 2 | 2 · 3 · 2 |
| remedial:3:2 | 2 · 1 | 1 · 3 · 3 | 1 · 1 · 3 |

- 함께 볼 것: 이 치우침은 생성 과정의 버릇이라 말하기 · 쓰기 xhigh 파일에도 같은 꼴이 있을 수 있다(이 검토 범위 밖, 컨트롤러가 한 줄로 확인하면 됨). 다음 판 브리프 14절에 '혼자 · 짝 · 같이 해 보기 따로 정답 자리 수를 적는다'를 더하면 재발을 막는다(지금 고치면 판이 바뀌므로 다음 판에).

**I-2. 변형 2 안에서 짝이 다른 수업의 문항과 같은 낱말 짝이다 — 셋**
- 근거: 검토 브리프 볼 것 2 "같은 수업 안 · 같은 변형 안 겹침은 금지", 생성 브리프 14절 10 "짝의 빈칸 답 · 함정 낱말이 … 같으면(뒤집은 꼴 포함) 같은 짝으로 본다"(설계 7 '처음 보는 짝'). 아래 셋은 하는 일 말 · 정답 · 함정이 모두 같아 한 변형을 쓰는 아이가 며칠 뒤 거의 같은 짝 글을 다시 만난다. 짝은 첫 시도에 틀린 아이에게만 나오므로 바로 그 아이에게 '처음 보는 글'이 아니게 된다.
  - (a) assigned:1:2 Q1'(`My cousins come here. Ted and Gus come to the lake.` → Ted and Gus) ↔ reinforce:6:2 Q1'(`My cousins come to the bus. Ted and Gus come home.` → Ted and Gus): come · 답 Ted and Gus · 함정 My cousins.
  - (b) assigned:2:2 Q3(`Dad and I sleep in the car.`, 함정 tent) ↔ remedial:3:2 Q3'(`Ben and Dad sleep in the tent. Mom and I sleep in the car.` → car, 함정 tent): sleep in · 답 car · 함정 tent.
  - (c) reinforce:9:2 Q3'(`Ben and I go to the bus. Ted and Gus go home.` → home) ↔ remedial:2:2 Q3'(`Dad and Meg go to the bus. Max and I go home.` → home): go · 답 home · 함정 to the bus.
- 고칠 것(뒤 수업의 짝만, 4절 표 2~4행): 인물 하나 또는 장소 하나를 바꿔 변형 2 의 다른 어떤 문항과도 (하는 일 말, 정답 · 함정) 짝이 겹치지 않게 했다. 보기 자리는 I-1 표를 따른다.

### Minor

**M-1. 글로서리 뜻이 한쪽 성별만 — assigned:4:1 · assigned:5:1 `sister` = "누나"**
- 근거: 지문의 '나'는 읽는 아이라 여자아이에게는 '언니'다(vocab 뜻 "누나, 언니, 여동생"). 고칠 글: `누나, 언니`.

**M-2. 글로서리 뜻이 장면과 다름 — `game` = "놀이"(assigned:1:2 `come to the game` 축구 시합 · remedial:3:2 `watch the game` 스케이트 · remedial:2:2 `come to the game`)**
- 근거: vocab 뜻 "놀이, 게임". 축구 시합 · 스케이트 경기를 '놀이'로 보면 아이가 뜻을 못 잇는다. 다른 수업의 `learn a game` · `water game` · `safe game` 은 '놀이'가 맞으니 그대로. 고칠 글: 세 수업만 `게임, 경기`.

**M-3. 같은 변형 안에서 뒤집힌 낱말 짝 — 셋(그대로 두어도 됨, 하나는 선택 정정)**
- 근거: I-2 와 같은 규칙이나, 이 셋은 주어가 다르고 정답과 함정이 뒤바뀌어 글을 읽어야만 풀리므로 학습에 해가 되지 않는다고 본다.
  - assigned:4:1 Q2(play with ___ → blocks, 함정 balloons) ↔ reinforce:9:1 Q2(→ balloons, 함정 blocks). 두 지문 모두 단원 단어 block · balloon 을 함께 넣어야 해서 피하기 어렵다. 굳이 피하려면 reinforce:9:1 Q2 를 `Dad and my grandfather make ___.`(답 a fire, 보기 a fire · chicken soup · blocks · balloons, whyKo `make 가 두 번 나와요. Dad and my grandfather make 뒤를 봐요.`, retryHighlight `Dad and my grandfather make a fire.`)로 바꾸면 된다(선택).
  - assigned:1:2 Q3(come to the ___ → game, 함정 car) ↔ remedial:3:2 Q3(→ car, 함정 game). 배정 1 과 보강 3 사이라 그대로 둔다.
  - reinforce:8:2 Q3'(`Max and Gus come home. Dad and I come to the car.` → to the car) ↔ reinforce:9:2 Q3(`Mom and Momo come ___.` → home, 함정 to the car). 잇단 다지기 둘이라 바꾸는 편이 낫다(선택, 4절 표 5행).

**M-4. 본보기 그림이 문장의 복합어와 어긋남 — assigned:4:1 M1 `They eat fish soup.` 에 picture `fish`, remedial:3:2 M1 `They look at the fire truck.` 에 picture `truck`(선택)**
- 근거: 브리프 9절 "그 본보기 영어 문장에 나온 사물이어야 한다". 물고기 그림 옆의 'fish soup' 은 '물고기를 먹는다'로, 보통 트럭 그림 옆의 'fire truck' 은 '소방차가 아닌 트럭'으로 읽힌다. picture 는 선택 칸이므로 두 칸을 지우면 된다(같은 수업의 다른 복합어 그림 `a block robot`-robot · `a toy bus`-bus · `a block ship`-ship 은 모양이 맞아 그대로).

**M-5. 'do' 를 하는 일 말로 씀 — reinforce:8:1 `We do a bird puzzle.` · reinforce:8:2 `We do a kite puzzle.` · remedial:2:1 `We do a puzzle at the end.` · remedial:2:2 `Meg and Momo do a puzzle.`(선택)**
- 근거: 브리프 7절에서 `do` 는 기능어(뜻 "하다(질문 · 부정을 만듦)")라 글로서리에 없고, 아이는 2단계에서 `Do you ~?` 로만 만났다. 이 단원의 읽는 법이 '하는 일 말을 먼저 찾기'인데, 이 문장에서는 찾을 하는 일 말이 뜻을 볼 수 없는 낱말이다. 문항이 이 문장을 묻지는 않아 선택으로 둔다. 고칠 글: `do` → `have`(2단계 꼴, assigned:4:2 `They have red balloons.` 와 같은 결) 네 문장, 그 수업 글로서리에 `have / have / 가지고 있다` 추가.

**M-6. 배정 5 변형 1 의 오늘 배울 것 · 되짚기 틀이 그 수업의 하는 일 말을 안 씀 — assigned:5:1 todayEn · recap.frameEn `We eat a quick lunch.`(선택)**
- 근거: 브리프 5절 "todayEn 은 이 수업 틀을 보이는 영어 한 문장", 11절 "수업마다 하는 일 말과 장면만 바꾼다". move · push · pull 을 배우는 수업의 틀 문장이 eat 이고, 변형 2 는 `Dad and I push the bike.` 다. 고칠 글: todayEn · frameEn `Dad and I push the table.`(지문에 있음), recap.chips [Dad and I]who [push]do [the table]what.

### 참고(고칠 것 없음)

1. **풀이 검사 사람 확인 1건, assigned:3:2 Q1 `___ make a robot.`(답 Ben and Meg)**: 글에서 `make` 는 `Ben and Meg make a robot.` · `Dad and I make a puzzle.` 두 번뿐이라 정답은 하나다. 풀이자가 둘로 본 까닭은 `robot` 이 세 문장(make · look at · see)에 나오고 그 주어 셋(Ben and Meg · Meg and I · Mom and Dad)이 모두 보기에 있어서로 보인다. 이것이 바로 '하는 일 말을 먼저 찾는' 가려 읽기이고, 틀리면 whyKo `make 가 두 번 나와요. make a robot 앞을 봐요.` 가 그 길을 보인다. 단원에서 가장 어려운 문항이지만 그대로 둔다.
2. **생성자가 적은 '뜻으로는 그럴 법한 오답' 둘**: '별 보러 간 밤'(assigned:2:2) Q2 `Ben and Meg watch ___.` 의 `the stars` 는 글에 `Dad and I study the stars.` 로만 나오고 Ben and Meg 가 보는 것은 `a plane` 하나다. '연 날리는 날'(reinforce:8:2) Q2 `Dad and Meg look at the ___.` 의 `kites` 는 `My cousins look at the kites.` 의 것이고 whyKo 가 `look 이 두 번 나와요` 로 가른다. 둘 다 글로 하나로 정해지며 제목에서 오는 짐작을 글로 바로잡는 좋은 문항이다.
3. **변형 1 · 2 사이의 낱말 짝 겹침 7**(같은 하는 일 말 · 정답 · 함정): 아이는 프로필 시작 때 고른 주제 묶음 하나(= 변형 하나)만 만나므로 해가 없다.
4. **'I drink juice.' 가 7수업, 'I drink water.' · 'I push the swing.' 이 4수업, 'I eat a banana.' 가 3수업의 같이 해 보기 · 짝 글에 되풀이**(생성자 보고): 가려 읽기의 '나' 문장이라 정답에 닿지 않고, 같은 수업 안에서는 겹치지 않는다. 다음 판에서 '나' 문장의 무엇을 수업마다 달리 쓰면 더 좋다.
5. **'eat' 뒤 조사를 피한 줄**(`eat 부터 찾아요` · `하는 일 말 eat, 그 바로 앞을 골라 봐요` · `두 번 나온 eat, Ben and Meg eat 뒤를 봐요`): 다른 수업의 `come 을 찾았어요` 꼴과 결이 다르지만 읽어 주기로도 글로도 자연스럽다. 그대로 둔다.
6. **'look at' · 'listen to' 를 do 칩 하나로, 바로 뒤를 what 으로**: 설계 2 의 '하는 일 말 뒤에서 무엇'과 맞고 26수업이 일관된다. 같이 해 보기 띠도 `look at` · `Ben and Mom look at` 꼴로 같다. 받아들인다.
7. **같은 수업 번호의 말하기 수업과 약한 겹침 22**: 말하기 xhigh 가 Ben · Meg 를 Mom · Dad 와 짝지어 보조 인물로 써서, 같은 수업 번호에서 같은 쌍이 같은 하는 일 말로 다른 것을 한다(예: 배정 2 말하기 `Ben and Dad listen to the birds.` ↔ 읽기 Q2' `Dad and Ben listen to the guitar.`, 배정 1 말하기 `Ben and Mom drink cold milk.` ↔ 읽기 T1 `Ben and Mom drink juice.`). 말하기가 '아니'라고 한 것을 읽기가 참으로 둔 직접 모순은 0 이다. 읽기는 브리프 10절대로 중심 쌍 Ben · Meg 를 쓰고 Dan · Tess 를 안 썼으므로, 풀려면 말하기 쪽의 보조 쌍(Ben and Mom · Meg and Dad)을 Dan · Tess 쪽으로 바꾸는 편이 싸다. 컨트롤러 판단 사항.
8. **변형 2 의 장면 겹침**: 소방차 + 블록 + '~ soup at the end' 가 assigned:4:2 · reinforce:9:2 · remedial:2:2 세 수업에 든다(제목은 다름). `fire` 를 다치지 않는 장면으로 쓰려니 소방차 · 캠프 불로 몰렸다. 다음 판에서 한 수업은 캠프 불로 바꾸면 좋다.
9. **다지기 지문만 세면 변형 2 에 study 가 없음**(생성자 보고): reinforce:7:2 본보기 `I study the plane. They study the ship.` 와 짝 `Dad and Ben study a map. My aunt and Meg study a book.` 에 있어 unitWords 기준 덮기는 25/25 다. 지문에도 넣고 싶으면 다음 판에서.

## 3. 좋은 점

1. **문항 156 모두 글만으로 답이 하나이고, 오답은 글 속의 다른 누가 · 무엇 · 어디다.** 사람 확인 1건까지 하는 일 말을 먼저 찾으면 풀리는 꼴이라, 설계 2 의 읽는 법이 문항에 그대로 쓰인다. whyKo 의 '두 번 나와요 · 한 번 찾아요' 주장도 156줄 모두 글의 실제 횟수와 맞는다.
2. **혼자 문항 · 짝이 본보기 · 같이 해 보기와 인물 쌍 · 낱말 짝이 다 다르다(새 25수업).** 다 맞힌 아이에게 혼자 해 보기가 곧 '다른 예시'가 되는 설계 7 의 조건을 글자가 아니라 뜻 수준에서 지켰다.
3. **어휘 · 꼴 · 인물 규칙을 한 곳도 어기지 않았다.** 범위 밖 0, 앞질러 쓴 단원 단어 0, 금지 꼴 0, 선생님 줄 468 모두 상한 안 · 용어 0 · 해요체, 동물 인물은 먹기 · 물 마시기 · 가기 · 오기 · 놀기만, 영어 문장의 뜻은 자연스러운 반말('테드랑 거스는 우리 집에 와.'). 장면도 캠프 · 이사 · 과일 가게 · 축구 시합 · 별 보기 · 연 날리기처럼 초4 가 그릴 수 있는 하루다.

## 4. 정정 목록

| # | 수업 | 칸 | 지금 글 | 고칠 글 | 구분 |
|---|---|---|---|---|---|
| 1 | 새 25수업 전부 | content.questions[].options · answerNo, questions[].spare.options · answerNo, teach.together[].choices · answerNo | 혼자 [2,4,2]/[4,2,4] · 짝 [1,3,1]/[3,1,3] · 같이 해 보기 [1,2]/[2,1] 고정 | I-1 표의 자리로 보기 차례를 바꾸고 answerNo 를 맞춤(보기 글 · whyKo · retryHighlight 불변) | I-1 |
| 2 | reinforce:6:2 | questions[0].spare | textEn `My cousins come to the bus. Ted and Gus come home.` · options [My cousins, Dad and I, Ted and Gus, Ben and Meg] · answerNo 3 | textEn `My cousins come to the bus. Mom and Ted come home.` · prompt `___ come home.`(그대로) · options [Mom and Ted, My cousins, Dad and I, Ben and Meg] · answerNo 1 · whyKo 그대로(`come 이 두 번 나와요. come home 앞을 봐요.`) · 글로서리 변경 없음(Mom · Ted 이미 있음) | I-2 (a) |
| 3 | remedial:3:2 | questions[2].spare | textEn `Ben and Dad sleep in the tent. Mom and I sleep in the car.` · options [car, tent, bus, house] · answerNo 1 | textEn `Ben and Dad sleep in the tent. Mom and I sleep in the house.` · prompt 그대로 · options [car, tent, house, bus] · answerNo 3 · whyKo 그대로 · 글로서리에 `house / house / 집` 추가 | I-2 (b) |
| 4 | remedial:2:2 | questions[2].spare | textEn `Dad and Meg go to the bus. Max and I go home.` · prompt `Max and I go ___.` · options [to the bus, to the game, home, to the tent] · answerNo 3 | textEn `Dad and Meg go to the lake. Max and I go to the ship.` · prompt `Max and I go to the ___.` · options [lake, ship, bank, tent] · answerNo 2 · whyKo 그대로(`go 가 두 번 나와요. Max and I go 뒤를 봐요.`) · 글로서리에 `ship / ship / 배` 추가, 이 짝에만 쓰이던 `bus` · `home` 항목 삭제 | I-2 (c) |
| 5 | reinforce:8:2 | questions[2].spare | textEn `Max and Gus come home. Dad and I come to the car.` · options [home, to the tree, to the car, to the bus] · answerNo 3 | textEn `Max and Gus come home. Dad and I come to the tent.` · options [to the tent, home, to the tree, to the bus] · answerNo 1 · whyKo 그대로 · 글로서리에 `tent / tent / 텐트` 추가, 이 짝에만 쓰이던 `car` 항목 삭제 | M-3 (선택) |
| 6 | assigned:4:1 · assigned:5:1 | content.glossary `sister`.meaningKo | `누나` | `누나, 언니` | M-1 |
| 7 | assigned:1:2 · remedial:2:2 · remedial:3:2 | content.glossary `game`.meaningKo | `놀이` | `게임, 경기` | M-2 |
| 8 | assigned:4:1 M1 · remedial:3:2 M1 | teach.models[0].picture | `fish` · `truck` | 칸 삭제 | M-4 (선택) |
| 9 | reinforce:8:1 · reinforce:8:2 · remedial:2:1 · remedial:2:2 | content.passage 한 문장 + glossary | `We do a bird puzzle.` · `We do a kite puzzle.` · `We do a puzzle at the end.` · `Meg and Momo do a puzzle.` | `do` → `have`, 글로서리에 `have / have / 가지고 있다` 추가 | M-5 (선택) |
| 10 | assigned:5:1 | teach.todayEn · teach.recap.frameEn · recap.chips | `We eat a quick lunch.` · [We]who [eat]do [a quick lunch]what | `Dad and I push the table.` · [Dad and I]who [push]do [the table]what | M-6 (선택) |
| 11 | reinforce:9:1 | questions[1] | prompt `Ben and I play with ___.` · options [blocks, dolls, a kite, balloons] · answerNo 4 · retryHighlight `Ben and I play with balloons.` | prompt `Dad and my grandfather make ___.` · options [a fire, chicken soup, blocks, balloons](I-1 자리 4 에 맞춰 `a fire` 를 넷째로) · whyKo `make 가 두 번 나와요. Dad and my grandfather make 뒤를 봐요.` · retryHighlight `Dad and my grandfather make a fire.` · 짝은 그대로 | M-3 (선택) |

정정 뒤 확인: `seed:validate`(이 파일 오류 0 · 경고 0), 2~5 · 9 · 11 행은 같은 수업 안 · 같은 변형 안 낱말 짝 겹침 다시 셈(이 보고의 셈으로는 겹침 0), 풀이 검사는 글이 바뀐 칸(reinforce:6:2 · remedial:3:2 · remedial:2:2 · 선택 행을 고쳤으면 그 칸)만 다시.

## 5. 컨트롤러가 넘긴 항목의 판정

| 항목 | 판정 |
|---|---|
| 풀이 검사 사람 확인 1(assigned:3:2 문항 1) | 닫힘 · 정답 하나(참고 1) |
| '별 보러 간 밤' Q2 the stars · '연 날리는 날' Q2 kites | 닫힘 · 글로 하나(참고 2) |
| 같은 번호 말하기 수업과의 사실 대조(생성자는 승인 수업 표만) | 13묶음 전부 대조, 직접 모순 0 · 약한 겹침 22(참고 7, 말하기 쪽 정정이 쌈) |
| 다지기 지문만 세면 변형 2 에 study 없음 | 닫힘 · unitWords 기준 25/25(참고 9) |
| 'I drink juice.' 같은 짧은 문장 되풀이 | 닫힘 · 해 없음(참고 4) |
| 'look at' · 'listen to' do 칩 하나 · 'eat' 조사 없는 꼴 · 토리 동물 규칙 · 이름 없는 동물은 보기에 | 모두 받아들임(참고 5 · 6, 1절 인물 행) |
