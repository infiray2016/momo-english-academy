# 시드 재검토(정정 1판, 범위 한정): 말하기 3단계 단원 1 xhigh — 2026-10-30 09:4x, 설계 · 화면 검토자 Fable · max

판정: **Approved**(정정 2판 없음). Critical 0 · Important 0 · Minor 2(선택, 이번 범위 밖). 대상 `tests/.tmp/l3-samples/xhigh/lessons/speaking/3/1.json`(sha256 de1cfe57f10bb15e) · `manifest/speaking-3.jsonl`(5b61f3882213bcc8) — 둘 다 브리프의 해시와 같음을 직접 쟀다. 백업 `scratchpad/s3fix/speaking-3-1.orig.json` 과 수업 · 칸 단위로 대조했고(문항 옮김과 글 고침을 나눠 봄), 1판 검사 스크립트(의미 검사 함정 · 낱말 짝 겹침 · 자리 분포 · 7낱말 · 어휘 범위 · 허용 답 묶음 · 동물 인물 · 선생님 줄)를 고친 파일에 다시 돌렸으며, 검증기도 다시 실행했다(`pnpm -s seed:validate --root tests/.tmp/l3-samples/xhigh --areas speaking --json`: cells 26 · passed 26 · 이 파일 오류 0 · 경고 0). 18 · 19번(chunks · 듣기 정답 자리)은 장부 L-71 몫이라 세지 않았다. 파일은 고치지 않았다.

## 1. 정정 줄별 판정(1판 보고 3절)

| 줄 | 수업 · 칸 | 판정 | 근거(고친 파일 글) |
|---|---|---|---|
| I1 | 변형 1 assigned 3 · 5, reinforce 7 · 9, remedial 2 → Q2 / 변형 2 assigned 2 · 4, reinforce 6 · 8 · 10, remedial 1 · 3 → Q3 | ADDRESSED | 12수업 모두 옮겨짐(문항 객체 통째, 짝 포함). '예' 자리 분포 Q4 14 · Q3 7 · Q2 5 — 목록 그대로. 수업마다 아니요 3 · 예 1 · 짝의 예 1 유지 |
| 1 | assigned:4:1 Q4 storyEn | ADDRESSED | 'Dan and Tess have a ruler.' |
| 2 | reinforce:7:1 Q3(→Q4) storyEn | ADDRESSED | 'Dan and Tess draw with crayons.' |
| 3 | reinforce:10:2 Q4(→Q3) storyEn | ADDRESSED | 'Dan and Tess have erasers. I have pencils.' |
| 4 | remedial:3:2 Q4(→Q3) story · modelAnswer · accepted · acceptedMeaning · whyKo | ADDRESSED | 'Dan and Tess draw a picture.' / 'Yes, they draw a picture.' / 셋 / ['Yes, they do.', 'Dan and Tess draw a picture.'] / 'Dan and Tess 는 picture 를 그려요. They 로 말해요.' |
| 5 | assigned:2:1 Q3 en · ko · accepted[2] | ADDRESSED | 'Do Dan and Tess listen to songs?' · '노래를 들어?' · 'not songs' |
| 6 | reinforce:9:1 같이 해 보기 2 | ADDRESSED | 'Do Meg and Dad listen to songs?' · '노래를 들어?' · 'not songs' |
| 7 | reinforce:9:1 Q3(→Q4) 짝 | ADDRESSED(줄여 넣음) | 'Do Momo and Mom listen to bells?'(7낱말) · '종소리를 들어?' · 'not bells'. 표의 'the bell' 은 8낱말이라 맞게 줄임, 뜻(사람 아닌 소리 낱말) 유지 |
| 8 | remedial:1:1 Q3 | ADDRESSED(줄여 넣음) | 'Do Dan and Tess listen to bells?' · '종소리를 들어?' · 'not bells' — 같은 판단 |
| 9 | remedial:1:1 Q3 짝 | ADDRESSED(줄여 넣음) | 'Do Meg and Mom listen to drums?' · '북소리를 들어?' · 'not drums' |
| 10 | assigned:2:2 Q3(→Q4) 짝 | ADDRESSED | 'Do Ben and Mom listen to music?' · '음악을 들어?' · 'not music' |
| 11 | reinforce:9:2 Q3 짝 | ADDRESSED(줄여 넣음) | 'Do Ben and Mom listen to drums?' · '북소리를 들어?' · 'not drums' |
| 12 | remedial:1:2 Q2 짝 | ADDRESSED | 'Do Meg and Dad listen to music?' · '음악을 들어?' · 'not music' |
| 13 | assigned:1:2 Q3 짝 전부 | ADDRESSED(줄여 넣음) | 'Ben and Mom come to the tent. I come home.' / 'Do Ben and Mom come home?' / '집에 와?' / 'No, they come to the tent.' / 셋 / ['Ben and Mom come to the tent.'] / "home 은 '나'가 와요. They come to the tent 예요." 표의 'come to the lake?' 는 8낱말. 아래 2절 (가) |
| 14 | reinforce:10:2 Q1 짝 전부 | ADDRESSED(줄여 넣음) | 'Ben and Dad come to the lake. I come home.' / 'Do Ben and Dad come home?' / 'No, they come to the lake.' / 'not home' / ['Ben and Dad come to the lake.'] / "home 은 '나'가 와요. They come to the lake 예요." 표의 'come on the bus?' 는 8낱말. 아래 2절 (가) |
| 15 | reinforce:8:2 Q3(→Q4) 짝 전부 | ADDRESSED | pink · white rulers, 'not white', whyKo "white 는 '나'의 자예요. They have pink rulers 예요." |
| 16 | reinforce:7:2 Q3 짝 전부 | ADDRESSED | orange · black crayons, 'not black' |
| 17 | remedial:1:2 Q1 짝 전부 | ADDRESSED | ducks · frogs, 'not the frogs', whyKo "frogs 는 '나'가 봐요. They watch the ducks 예요." |
| 18 · 19 | chunks · 듣기 정답 자리 | 범위 밖(L-71) | 세지 않음 |
| 20 | reinforce:10:2 Q1 'on foot' | NOT ADDRESSED(타당) | 표 글 'Do Dan and Tess come on the bus?' 는 8낱말이고 14번과 bus 가 겹침. 두 이름 주어 + come 꼴에서 7낱말 안의 장소 · 탈것은 home · here 뿐이라 대안이 없다. 1판에서도 Minor(ko '걸어서 와?' 가 뜻을 줌)였으니 그대로 둔다 |
| 21 | reinforce:6:1 같이 해 보기 1 | ADDRESSED | 'Ben and Dad eat apples.' / 'Do Ben and Dad eat cake?' / '벤이랑 아빠는 케이크 먹어?' / ['Ben and Dad eat apples.'] / 'Ben and Dad 는 둘이라 They 예요.' filled · modelAnswer · accepted 그대로 |
| 22 | assigned:2:1 repeat.spares.words[4] | ADDRESSED | 'listen to' |
| 23 | reinforce:10:1 Q1 전부(선택) | ADDRESSED | 'Dan and Tess come on the bus.' / 'Do Dan and Tess come on bikes?' / '자전거 타고 와?' / 'No, they come on the bus.' / 'not bikes' / ['Dan and Tess come on the bus.'] / 'Dan and Tess 는 bus 를 타고 와요. They 로 말해요.' 따라 말하기 'Dan and Tess come with Mom.' 과 어긋나지 않음 |

## 2. 줄여 넣은 여섯 줄과 뺀 20번의 판정
- (가) **13 · 14 의 틀린 쪽 'home'(생성자 우려) — 받아들임, Minor 로 닫음.** 근거 셋. ① 브리프 5절 · 틀 R14 1 의 '같은 짝'은 바로잡은 정보 · 틀린 정보 두 낱말이 모두 같을 때(뒤집은 꼴 포함)다. 13 은 짝 (tent, home) ↔ 문항 Q3 (game, home), 14 는 짝 (lake, home) ↔ 같이 해 보기 1 (rock, home) 이라 같은 짝이 아니다. ② 승인 수업(assigned:1:1)이 같이 해 보기 2 · Q3 · Q3 짝 셋 모두에 'go home?' 을 틀린 정보로 쓴다(브리프 12절 JSON). 문항과 그 짝이 틀린 정보를 나눠 갖는 꼴은 요청자가 승인한 꼴이다. ③ 방향(No)은 예측되지만 바로잡은 정보(tent · lake)는 짝 이야기에서 새로 가져와야 하므로 speak-3-1-3 의 '새 예시' 값은 남는다. 7낱말 안에서 다른 장소를 쓰려면 하는 일 말을 come 에서 바꿔야 하는데, 짝은 그 문항과 같은 하는 일로 두는 쪽(승인 수업 짝 넷 모두)이 낫다.
- (나) **7 · 8 · 9 · 11 의 'bells' · 'drums'** — 관사 없는 복수로 7낱말 안이고, 1판 지적(사람 이름 → 소리 낱말, ko 의 '말을 들어?' 없애기)의 뜻을 그대로 지킨다. ko '종소리 · 북소리' 는 파일의 다른 줄('새소리를 들어?')과 같은 꼴이고 accepted[2] 'not bells · not drums' 도 맞다. 같은 수업 안 낱말 짝과 겹치지 않는다(reinforce:9:1 (birds, music) · (piano, bells) · (drum, songs); remedial:1:1 (music, bells) · (violin, drums); reinforce:9:2 (bell, birds) · (songs, drums)).
- (다) **20번을 뺀 것** — 8낱말 · bus 겹침이라 타당. 'on foot' 은 1판 Minor 그대로다.

## 3. 판 칸 규격
- 고친 20수업만 `correction` 0 → 1, `revision` 1 그대로, `generation`(briefHash 5ee7f413 · agentHash · createdOn · retries) 그대로. 안 고친 6수업(승인 수업 assigned:1:1 포함, reinforce:8:1 · remedial:3:1 · assigned:3:2 · assigned:5:2 · remedial:2:2)은 correction 0. 읽기 정정 수업의 꼴(revision 1 · correction 1 · generation 키 같음)과 같다.
- manifest 정정 줄 하나: type correction · area · level · unit · brief · briefHash · agent · agentHash · model · effort · createdOn · correction 1 · lessons 20 · reason '시드 검토 보고'. 키는 읽기 · 쓰기 정정 줄과 같고, lessons 20 은 백업 대조로 나온 바뀐 수업 집합과 정확히 같다. 시작 줄은 그대로다.

## 4. 새로 생긴 겹침 · 재검사
- 같은 수업 안 '같은 두 낱말 짝' 겹침: 승인 수업 L-25(Q2 ↔ Q2' milk · juice)뿐, 새 것 0.
- '같은 하는 일 + 같은 틀린 정보'(규칙 밖이지만 적어 둠): 새로 둘(13 · 14, 2절 (가)), 정정 전부터 둘(assigned:2:1 같이 해 보기 2 · Q2 의 learn/dance, reinforce:10:1 같이 해 보기 1 · Q1 짝의 come/home), 승인 수업 셋. 모두 승인 수업과 같은 꼴이라 지적하지 않는다.
- 의미 검사 함정(이야기에만 있는 핵심 낱말 · 예 질문 바른 답의 질문 밖 낱말) 0, 'listen to 사람' 0, 답 속 동물 이름 0, 'with' 답 자리는 reinforce:7:1 Q4 'draw with crayons' 하나(1판에서 최소 고침으로 둔 것, Minor 유지). 7낱말 초과 0, 어휘 범위 밖 0, 허용 답 묶음(셋 서로 다름 · 바른 답 포함 · 예 질문 'Yes, they do.' · 두 묶음 겹침 없음) 문제 0, 변형끼리 newWords · todayKo · shiftKo · 문항 수 같음, 제목 26 고유, 동물 인물 규칙 위반(승인 수업 밖) 0, 선생님 줄 용어 · 길이 문제 0.
- 풀이 검사 기록(`checks/lessons/speaking/3/1.json`): reinforce:10:2 no.21(듣기 L2 짝 'I have erasers. Meg and Dad have cards.' → '___ have cards.', 보기 I · We · Ben and Mom · Meg and Dad)이 multiple 이었고 사람 확인 correct. 대본상 cards 를 가진 이는 Meg and Dad 뿐이라 동의한다. 이 문항은 정정에서 바뀌지 않았으므로 풀이자의 흔들림이다(03:3x 첫 검사에서는 same).

## 5. Minor(선택, 이번 범위 밖)
- **M1 whyKo "home 은 '나'가 와요."(13 · 14 새 줄 둘).** 파일의 다른 줄 꼴("kites 는 '나'가 봐요.")을 따랐지만 장소 낱말에는 '집에는 내가 와요. They come to the tent 예요.' 가 자연스럽다. 뜻은 통하므로 적재 뒤 L-71 류 묶음에서 고쳐도 된다.
- **M2 1판 Minor 가운데 남은 것**: 'on foot'(20), 'draw with crayons' 답 자리(reinforce:7:1 Q4), Momo 변형 1 몰림(M6, 컨트롤러 판단), reinforce:8:2 'study the planes' 류 장면. 모두 1판 판정 그대로다.
