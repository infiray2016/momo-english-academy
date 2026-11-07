# 읽기 3단계 단원 1 정정 1판 재검토(범위 한정) — 설계 · 화면 검토자 보고(2026-10-30 09:3x)

**판정: Approved(적재 가능).** 적용 범위의 정정 일곱 줄(1 · 2 · 3 · 4 · 6 · 7 · 8)이 모두 ADDRESSED 이고, 판 칸 · manifest 는 규격대로이며, 정정으로 새로 생긴 겹침은 문장 하나(`Mom and I sleep in the house.`, 짝 둘 사이)뿐이고 학습에 해가 없다. 정정자가 표 밖에서 찾은 변형 2 의 Ben and Meg ↔ Dad and I 겹침 일곱은 Minor 로, 적재를 막지 않고 요청자 표본 검토로 넘겨도 된다. 검증기는 이 파일 오류 0 · 경고 0, 풀이 검사 통과 26 · 사람 확인 0 이다. 정정 2판은 필요 없고, 원하면 아래 3절 · 4절의 선택 줄 둘로 겹침을 더 줄일 수 있다.

- 파일: `.claude/worktrees/p13d/tests/.tmp/l3-samples/xhigh/lessons/reading/3/1.json`(sha256 앞 16자 `e9017b4d51258965`, 컨트롤러 값과 같음) · `manifest/reading-3.jsonl`(`158dd90ea81c9576`, 같음)
- 정정 전 백업: 스크래치패드 `r3fix/1.orig.json` · `reading-3.orig.jsonl`(1판 검토 때의 파일과 바이트 수 275,513 같음)
- 방법: 백업과 정정본의 모든 잎 값을 diff 해 바뀐 자리를 전부 가려냈고(574곳), 1판 때 쓴 전수 검사(정답 유일성 · retryHighlight · whyKo 주장 · 어휘 범위 · 금지 꼴 · 선생님 줄 · 글로서리 · 동물 규칙 · 수업 안 낱말 짝 · 변형 안 낱말 짝 · 정답 자리 분포)를 정정본에 다시 돌렸으며, 검증기를 다시 돌렸다. 선택 줄 5 · 9 · 10 · 11 은 컨트롤러가 요청자 표본 검토로 미뤘으므로 '보류'로 적고 NOT ADDRESSED 로 세지 않았다.

## 1. 정정 줄 — 적용 범위 일곱 줄 모두 ADDRESSED

diff 에서 바뀐 자리는 아래 일곱 줄의 칸과 새 25수업 맨 위 `correction` 뿐이다(보기 글 162 + 177 + 52 · answerNo 58 + 63 + 26 · correction 25 · 글로서리 뜻 3 · 글로서리 항목 추가 · 삭제 2 · 짝 textEn 3 · 짝 prompt 1 · picture 2). 승인 수업(배정 1 · 변형 1)은 브리프 12절 JSON 과 정규화 JSON 이 같고(sha256 `98c0838b…`) revision 1 · correction 0 그대로다. 새 25수업의 generation 은 한 글자도 바뀌지 않았다.

| # | 1판 지적 | 수업 · 칸 | 들어간 것 | 확인 | 판정 |
|---|---|---|---|---|---|
| 1 | I-1 정답 자리 | 새 25수업 questions[].options · answerNo, spare.options · answerNo, together[].choices · answerNo | 1판 표의 자리 그대로(25수업 × 8자리 전부 일치) | 보기 모음은 그대로이고 정답 글이 바뀐 곳 없음(3행의 house 만 예외, 그것은 3행의 정정), 정답 아닌 보기 셋의 상대 차례 유지. 분포: 혼자 1~4 = 19 · 19 · 19 · 18, 짝 19 · 18 · 19 · 19, 같이 해 보기 1 · 2 = 25 · 25. [2,4,2] · [4,2,4] · [1,3,1] · [3,1,3] 꼴 0, 한 수업 셋이 같은 자리인 것 0, 잇단 수업의 혼자 자리 셋이 똑같은 것 0(변형마다). whyKo · retryHighlight 바뀐 곳 0 | ADDRESSED |
| 2 | I-2 (a) | reinforce:6:2 questions[0].spare | textEn `My cousins come to the bus. Mom and Ted come home.` · prompt `___ come home.` · options [Mom and Ted, My cousins, Dad and I, Ben and Meg] · answerNo 1 · whyKo 그대로 | 정답 채운 문장이 글에 있고 오답 채운 문장은 없음, Ted 는 '오기'(동물 규칙 안), Mom · Ted 글로서리에 이미 있음, 변형 2 의 다른 어떤 문항과도 (come, 정답, 함정) 짝이 같거나 뒤집히지 않음 | ADDRESSED |
| 3 | I-2 (b) | remedial:3:2 questions[2].spare · glossary | textEn `Ben and Dad sleep in the tent. Mom and I sleep in the house.` · options [car, tent, house, bus] · answerNo 3 · whyKo 그대로 · 글로서리 `house / house / 집` 추가(45 → 46) | 10낱말(상한 20), 정답 유일, (sleep, house, tent) 짝은 변형 2 에 없음(assigned:2:2 Q3 의 car · tent 와 다름), 글로서리 완전 | ADDRESSED |
| 4 | I-2 (c) | remedial:2:2 questions[2].spare · glossary | textEn `Dad and Meg go to the lake. Max and I go to the ship.` · prompt `Max and I go to the ___.` · options [lake, ship, bank, tent] · answerNo 2 · whyKo 그대로 · 글로서리 `ship / ship / 배` 추가, 이 짝에만 쓰이던 `bus` · `home` 삭제(41 → 40) | 13낱말, 정답 유일, Max 는 '가기', (go, ship, lake) 짝은 변형 2 에 없음, 안 쓰는 글로서리 항목 0 | ADDRESSED |
| 6 | M-1 | assigned:4:1 · assigned:5:1 glossary `sister`.meaningKo | `누나, 언니` | 두 수업 모두 | ADDRESSED |
| 7 | M-2 | assigned:1:2 · remedial:2:2 · remedial:3:2 glossary `game`.meaningKo | `게임, 경기` | 세 수업 모두. '놀이'가 맞는 다른 수업(learn a game · water game · safe game)은 그대로 | ADDRESSED |
| 8 | M-4 | assigned:4:1 models[0].picture · remedial:3:2 models[0].picture | 칸 삭제 | 두 본보기 모두 picture 없음, 같은 수업의 다른 본보기 그림(milk · kite)은 그대로 | ADDRESSED |
| 5 · 9 · 10 · 11 | M-3 선택 · M-5 · M-6 · M-3 선택 | — | 바뀌지 않음 | 컨트롤러가 요청자 표본 검토로 미룸 | 보류(세지 않음) |

전수 검사(정정 뒤): 문항 156 모두 정답 유일 · retryHighlight 78 그대로 · whyKo 주장 156 맞음 · 어휘 범위 밖 0 · 앞질러 쓴 단원 단어 0 · 금지 꼴 0 · 선생님 줄 468 상한 안 · 용어 0 · 글로서리 완전(이름 proper) · 동물 규칙 지킴 · 같은 수업 안 낱말 짝 겹침 0 · 보강 덮기 25 · 25 · Momo · Tori 수업 9 · 제목 26 다름.

## 2. 판 칸과 manifest — 규격대로

- **맨 위 `correction` 1.** 수업 판은 수업 맨 위 `seedVersionShape = { revision, correction }`(`src/core/seed/schema/reference.ts` 62줄)이고 `generation` 은 strictObject 라 거기에 correction 을 넣지 않은 것이 맞다(새 25수업 모두 `generation` 에 correction 키 없음). 25수업 전부가 바뀌었으므로(보기 자리) 25 모두 correction 1 · revision 1 이고, 승인 수업만 correction 0 이다. 칸 내용 해시는 revision · correction · generation 을 빼고 셈하므로(`validate.ts` 134~143줄) 글이 바뀐 칸만 해시가 바뀌고, 컨트롤러가 풀이 검사를 다시 돌려 26칸 통과 · 사람 확인 0 이 됐다.
- **manifest 정정 줄.** 두 줄(start · correction). correction 줄의 area · level · brief · briefHash · agentHash · model · effort · createdOn 이 start 줄과 같고(같은 판 `fc57e2f0…` · `ef819801…`), `lessons` 25 가 correction 1 인 25수업과 정확히 같으며, `correction: 1` · `reason: "시드 검토 보고"` 가 있고, 키 차례가 같은 뿌리 `speaking-3.jsonl` 의 correction 줄과 같다.
- 적재 때 빠지기 쉬운 것(범위 밖, 참고): `seed/manifest/` 에 reading-3 이 없으므로 시드 파일을 `seed/lessons/reading/3/1.json` 으로 옮길 때 이 manifest 를 `seed/manifest/reading-3.jsonl` 로 함께 옮긴다(쓰기 재검토 보고와 같은 주의).

## 3. 정정으로 새로 생긴 겹침 — 문장 하나, 해 없음

- **낱말 짝(하는 일 말 · 정답 · 함정) 수준: 새 겹침 0.** I-2 의 셋은 사라졌고, 남은 변형 안 뒤집힌 짝 셋은 1판 M-3 그대로다(assigned:4:1 ↔ reinforce:9:1 play, assigned:1:2 ↔ remedial:3:2 come, reinforce:8:2 Q3' ↔ reinforce:9:2 Q3 come — 앞 둘은 1판에서 '그대로 둠', 셋째는 보류 줄 5).
- **문장 수준: 새로 하나.** 3행의 `Mom and I sleep in the house.` 가 assigned:2:2 Q3'(`My cousins sleep on the ship. Mom and I sleep in the house.` 의 함정 문장)과 remedial:3:2 Q3'(답 문장)에 글자 그대로 같다. 같은 변형 안 수업 사이의 글자 같은 문장은 정정 전 14 → 뒤 15 다(정정 전 14 는 1판 범위 밖 기준이라 적지 않았다. 예: `Max and I go home.` 이 reinforce:8:1 지문과 reinforce:9:1 Q3' 에 있음).
- 판단 '해 없음': 수업 사이 글자 같은 문장을 막는 규칙은 없고(6.4 '짝' · '혼자 문항과 본보기의 다름' · 브리프 14절 10 · 검증기 `teach-differ` 는 한 수업 안), 둘 다 첫 시도에 틀린 아이에게만 나오는 짝이며, 한쪽에서는 함정 문장이고 다른 쪽에서는 답 문장이라 앞서 본 것이 답을 주지 않는다(묻는 것도 다르다: on the ship ↔ house).
- 선택 줄(겹침을 0 으로 두고 싶을 때만, 정정 2판 아님): remedial:3:2 questions[2].spare textEn → `Ben and Dad sleep in the tent. Mom and I sleep in the sun.` · options [car, tent, sun, bus] · answerNo 3 · whyKo 그대로 · 글로서리 `sun / sun / 해` 추가 · 이 짝에만 쓰이던 `house` 삭제. (sleep, sun, tent) 짝 · `in the sun` 문장은 변형 2 에 없다(변형 1 remedial:1:1 의 고양이 문장과는 변형이 다름).

## 4. 정정자가 표 밖에서 찾은 겹침 — Minor, 요청자 표본 검토로 넘겨도 됨

정정자의 셈과 같다. 변형 2 의 누가 문항(Q1) 일곱 쌍이 make · push 에서 Ben and Meg ↔ Dad and I 를 정답 · 함정으로 되풀이한다(변형 1 에는 이 꼴이 없다).

| 꼴 | 수업 쌍 | 하는 일 말 · 정답 · 함정 |
|---|---|---|
| 같은 방향 | assigned:3:2 Q1 ↔ assigned:4:2 Q1 | make · Ben and Meg · Dad and I(robot ↔ fire truck) |
| 같은 방향 | assigned:5:2 Q1 ↔ reinforce:10:2 Q1 | push · Dad and I · Ben and Meg(bike ↔ toy bus) |
| 같은 방향 | reinforce:8:2 Q1 ↔ remedial:2:2 Q1 | make · Dad and I · Ben and Meg(fish kite ↔ block plane) |
| 뒤집힘 ×4 | assigned:3:2 · assigned:4:2 ↔ reinforce:8:2 · remedial:2:2 | make · Ben and Meg ↔ Dad and I |

- 심각도 Minor, 근거:
  1. 규칙의 자리. 6.4 '짝' · '혼자 문항과 본보기의 다름' · 브리프 14절 10 은 한 수업 안의 겹침이다. 검토 브리프의 '같은 변형 안 겹침 금지'를 1판은 '거의 같은 짝 글'(글 · 하는 일 말 · 정답 · 함정이 다 같은 두 문장 글)에 적용했고(I-2 셋), 여기는 지문도 묻는 무엇(robot · fire truck · fish kite · block plane · bike · toy bus)도 다 다르다.
  2. 기억으로 풀리지 않는다. 답이 수업마다 뒤집혀(같은 방향 3 · 뒤집힘 4) '지난번처럼 Ben and Meg'로 찍으면 틀리는 쪽이 더 많고, 네 보기 가운데 다른 둘도 글에 나오는 누가라 글을 읽어야만 고를 수 있다. 독립 수행 근거를 부풀리는 I-1 과는 성격이 다르다.
  3. 설계의 결과다. 브리프 10절이 중심 쌍을 Ben · Meg 로, 이야기를 나(I) · 우리(We)로 정했으므로 '만들고 미는' 일의 주인공이 Ben and Meg 와 Dad and I 로 모이는 것은 자연스럽다. 변형 2 의 누가 답 13 가운데 이 두 쌍은 7 이고 나머지 6 은 Mom and Max · My cousins · Mom and Momo · Ben and I · Dad and Ben · My cousins 로 흩어져 있다.
- 남는 우려 하나: 잇단 배정 3 → 배정 4 가 둘 다 'Q1 누가 make → Ben and Meg' 다. 요청자 표본 검토에서 보이고, 없애고 싶으면 아래 선택 줄 하나로 된다(정정 2판 아님).
- 선택 줄: assigned:4:2 questions[0] → prompt `___ play with the blocks.` · askRole who · options [Meg and Dad, Ben and I, Mom and Momo, Dad and I] · answerNo 1(I-1 표의 자리 1 그대로) · whyKo `play 가 두 번 나와요. play with the blocks 앞을 봐요.` · retryHighlight `Meg and Dad play with the blocks.` · 짝(Q1', make · Meg and Mom)은 그대로. 지문에 play 가 두 번(`Meg and Dad play with the blocks.` · `Ben and I play with the truck.`)이라 가려 읽기 문항이 되고, (play, Meg and Dad, Ben and I) 짝은 변형 2 의 다른 문항과 겹치지 않으며, 같은 수업 Q2(`Ben and I play with the ___.` → truck)와는 묻는 자리(누가 ↔ 무엇)가 다르다.

## 5. 검증기 · 풀이 검사

`pnpm -s seed:validate --root tests/.tmp/l3-samples/xhigh --areas reading --json`: 칸 26 · 이 파일 오류 0 · 경고 0 · passed 26 · pendingHuman 0(컨트롤러가 다시 돌린 풀이 검사 결과가 읽힘). 전체 경고 4 는 `unit-specs.json` 의 `unit-goals`(다른 단계 · 단원의 목표 없음)로 이 파일 밖이다.

## 6. 참고(고치지 않아도 됨)

- 정정 기록 .md 가 폴더에 없다(쓰기는 `gen-writing-3-fix1.md` 가 있음). 정정자의 흔적은 스크래치패드 `r3fix/`(apply.py · 1.new.json.changed.json · validate-before/after)뿐이라, 장부에 '읽기 정정 1판: 25수업 correction 1 · 바뀐 칸 · 검증 0 · 0' 한 줄을 남기면 된다.
- 1판 보고의 선택 줄 5 · 9 · 10 · 11 과 이 보고의 선택 줄 둘(3절 · 4절)은 모두 요청자 표본 검토 때 한꺼번에 보면 된다. 그때 다른 영역 xhigh 파일의 정답 자리 치우침(1판 I-1 '함께 볼 것')도 같이 확인하길 권한다.
