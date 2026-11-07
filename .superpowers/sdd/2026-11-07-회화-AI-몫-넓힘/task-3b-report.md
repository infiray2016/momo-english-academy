# 묶음 3-(나) 보고: 장면 여는 질문 꼴 표본(회화 3단계 단원 1 수업 1 · 수업 6)

작성: 학습 설계자(curriculum-designer, Opus xhigh) · 2026-11-07 · 상태 DONE_WITH_CONCERNS(우려는 아래 '결정이 필요한 것' 2 · 3)

## 1. 만든 것

| 파일 | 내용 |
|---|---|
| `.superpowers/sdd/2026-11-07-회화-AI-몫-넓힘/task-3b-samples.md` | 요청자가 번호로 고를 표본 쪽(카드 둘 × 5개 = 10개, 꼴 · 한국어 뜻 · 추천 까닭 · 막혔을 때 쓰는 줄) |
| `.superpowers/sdd/2026-11-07-회화-AI-몫-넓힘/task-3b-report.md` | 이 보고 |
| 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-3b/` | samples.json(표본 원본 10개) · check.ts(06:186 재현 검사) · check-out-1.txt · validate-*.txt(검증기 출력) · counts.txt |

카드 JSON · 코드 · 검증기 · 목록 파일은 고치지 않았습니다. 시드 사본은 스크래치패드에서만 만들고 원본으로 되돌렸습니다.

## 2. 표본 전체(스키마 TalkSceneOpenerSchema 칸 그대로)

번호 1 이 추천입니다. 칸 이름은 question {en, ko} · hintKo · hintEn · frameEn · answerExample · easyQuestion {en, ko} 이고 choices 는 1단계 전용이라 두지 않았습니다. hintEn 은 인사 질문 칸처럼 answerExample 과 같게 두었습니다.

### 수업 1(배정, 가족과 호수 나들이, 짧은 준비 eat · drink · go 뒤)

| 번호 | 꼴 | question.en / ko | hintKo | frameEn | answerExample(= hintEn) | easyQuestion en / ko |
|---|---|---|---|---|---|---|
| 1 | 아이가 하는 일(Do you + 동사) | Bikes and ducks at the lake! Do you ride a bike? / 호수에 자전거랑 오리가 있어! 너는 자전거 타? | 응, 나는 자전거를 타. | Yes, I ___ a bike. | Yes, I ride a bike. | Do you like bikes? / 자전거 좋아해? |
| 2 | 가족과 하는 일 | Here is the lake! Do you play with your family? / 여기 호수야! 너는 가족이랑 같이 놀아? | 응, 나는 가족이랑 놀아. | Yes, I play with my ___. | Yes, I play with my family. | Do you like games? / 놀이 좋아해? |
| 3 | 좋아하는 것 | Ducks and fish in the lake! Do you like fish? / 호수에 오리랑 물고기가 있어! 물고기 좋아해? | 응, 나는 물고기를 좋아해. | Yes, I like ___. | Yes, I like fish. | Do you like animals? / 동물 좋아해? |
| 4 | 가진 것(have) | Hot sun at the lake! Do you have a hat? / 호수에 해가 뜨거워! 너 모자 있어? | 응, 나는 모자가 있어. | Yes, I have a ___. | Yes, I have a hat. | Do you like hats? / 모자 좋아해? |
| 5 | 장면 속 사실(Is) | The lake is big and blue! Is the water cold? / 호수가 크고 파래! 물이 차가워? | 응, 물이 차가워. | Yes, it is ___. | Yes, it is cold. | Is it cold? / 차가워? |

### 수업 6(다지기, 바닷가와 산 나들이, 짧은 준비 없음 → 인사 끝 턴 바로 뒤)

| 번호 | 꼴 | question.en / ko | hintKo | frameEn | answerExample(= hintEn) | easyQuestion en / ko |
|---|---|---|---|---|---|---|
| 1 | 할 수 있는 것(Can) | Hot sun and cool water! Can you swim? / 뜨거운 해랑 시원한 물이야! 너 수영할 수 있어? | 응, 나는 수영할 수 있어. | Yes, I can ___. | Yes, I can swim. | Do you like water? / 물 좋아해? |
| 2 | 가족과 하는 일 | Blue water and tall trees! Do you play with your family? / 파란 물이랑 키 큰 나무야! 너는 가족이랑 같이 놀아? | 응, 나는 가족이랑 놀아. | Yes, I play with my ___. | Yes, I play with my family. | Do you like games? / 놀이 좋아해? |
| 3 | 좋아하는 것 | Turtles in the blue water! Do you like turtles? / 파란 물에 거북이가 있어! 거북이 좋아해? | 응, 나는 거북이를 좋아해. | Yes, I like ___. | Yes, I like turtles. | Do you like animals? / 동물 좋아해? |
| 4 | 가진 것(have) | The sun is very hot! Do you have a cap? / 해가 정말 뜨거워! 너 모자 있어? | 응, 나는 모자가 있어. | Yes, I have a ___. | Yes, I have a cap. | Do you like hats? / 모자 좋아해? |
| 5 | 장면 속 사실(Is) | Blue water and white sand! Is the sand hot? / 파란 물이랑 하얀 모래야! 모래가 뜨거워? | 응, 모래가 뜨거워. | Yes, it is ___. | Yes, it is hot. | Is the sun hot? / 해가 뜨거워? |

추천 순위의 기준은 넷입니다. (가) 오늘 장면을 여는가, (나) 아이 자기 이야기를 묻는가(C211 (1) 아이 이야기 우선), (다) 예 · 아니요 어느 답이든 이어 물을 거리가 있는가, (라) 카드의 필수 질문 · 쉬운 질문과 주제 · 꼴이 겹쳐 대본처럼 들리지 않는가. 까닭 문장은 표본 쪽에 있습니다. 덧붙여, 답 예시가 Yes 로 시작하므로(06:186) 대부분의 아이가 참으로 '예'라고 답할 질문일수록 받침에서 같이 말하는 문장이 아이 실제와 덜 어긋납니다. 1번 두 개(자전거 · 수영)는 이 점에서도 앞섭니다.

## 3. 검사 규칙 대조(정본 06:186)

검사는 세 가지로 했습니다. (1) 스크래치패드 check.ts: 시드 쪽 함수(text.ts 의 offbandWords · wordIdsIn · formsIn · forbiddenHits, question-check.ts 의 cardQuestionKeyOf)로 06:186 을 재현했습니다. 일부러 틀린 표본 둘(물음표 둘 · or · What 시작 · 범위 밖 낱말 · 단원 단어 · 진행형 · did · does · 선생님 이름 · 같은 질문)을 넣어 모두 걸리는 것을 확인했습니다. (2) 실제 `pnpm seed:validate --root <사본> --areas talk`: 표본 번호마다 두 카드에 칸과 예상 흐름 첫 줄 초안을 넣었습니다. 개정 4 그대로와 개정 5 로 올린 것 두 번씩 돌렸습니다. (3) 3-(가)가 넣고 있는 checkSceneOpener(p13d 에서 작업 중인 2026-11-07 아침 상태)도 개정 5 사본에서 돌았습니다. 3-(가)가 끝난 뒤 3-(다)가 개정 5 두 장으로 다시 돌려야 최종 확인이 됩니다. 정본 예시 · or · 범위 밖 낱말을 넣은 대조 사본에서는 그 검사가 실제로 걸렸습니다.

| 06:186 규칙 | 결과(표본 10개) |
|---|---|
| 1~3단계 새 꼴 카드에 있음 | 두 카드 모두 칸을 둠(개정 5 사본에서 '없다' 오류 0) |
| 물음표 문장은 마지막 하나 | 10/10 |
| 첫 낱말이 조동사 · be | 10/10(Do 7 · Can 1 · Is 2) |
| 'or' 없음 | 10/10 |
| 문장 둘 안 · 문장 길이 상한 7(회화 3단계 sentenceMaxWords) | 10/10(가장 긴 문장 6낱말) |
| 학습 요소 범위(형태) | 10/10. 쓴 형태는 have · can 뿐이고 둘 다 회화 단원 1 이전에 들어온 형태(rst 2-3 · 2-4) |
| 어휘 범위(카드 글 범위) | 10/10. 범위 밖 낱말 0(다음 절) |
| 선생님 이름 없음 · 틀 자리 {NAME} 하나까지 | 10/10({NAME} 을 쓰지 않음) |
| 인사 · 필수 · 쉬운 · 더 이야기할 거리 질문과 정규화 글이 다름 | 10/10(cardQuestionKeyOf 열쇠와 소문자 정규화 둘 다 비교) |
| 한국어 뜻 · 답 예시 있음, 답 예시는 Yes · No 로 시작 | 10/10 |
| 쉬운 질문은 물음표로 끝나고 장면 여는 질문과 다름 | 10/10. 카드의 다른 질문과도 겹치지 않음 |
| 1단계 선택지 둘 | 해당 없음(3단계) |
| 노리는 단원 단어 없음 | 10/10. 단원 규격 단어 25개 전부를 모든 영어 칸에서 뺌 |
| 기존 검사(카드 공통) | seed:validate 출력이 표본을 넣기 전과 같음. 칸 28 · 통과 28 · 실패 0 · 경고 5. 규격 파일 오류 33 은 표본과 관계없는 목록 파일(신호 말 · 상황 줄, 3-(다) 몫) 것이고 넣기 전에도 33 |

## 4. 어휘 범위 확인

- 범위 정의: 검증기 기준은 vocab.json 의 level ≤ 3(활용형 포함)과 이번 수업 새 단어입니다(check-talk checkSceneOpener · text.ts offbandWords). 실시간 쪽도 같은 band_level ≤ 3 입니다(lesson-input.ts).
- 표본이 쓴 낱말은 모두 1~2단계입니다(스크래치패드 counts.txt). 1단계는 a · and · big · bike · blue · cap · duck · fish · game · hat · hot · lake · like · sand · sun · tall · tree · white · yes 등이고, 2단계는 animal · at · can · cold · cool · family · have · here · play · ride · swim · turtle · very · water · with 입니다.
- 일부러 피한 범위 밖 낱말: Saturday · weekend · day · today · summer · sunny · so · too · together · love · by · our(4단계), boat(5), trip · place · holiday(6), picnic · wave(vocab 에 없음). 단원 주제 '주말에 하는 일'의 'weekend · Saturday' 를 장면 말에 못 쓰는 것은 범위 규칙 때문입니다.
- 3단계 단원 1 에서 첫 낱말로 쓸 수 있는 것은 사실상 Do · Is · Are · Can 입니다. 정본 목록의 does(4-2) · did(7-2) · was/were(past-be 6-1) · will(7-4)는 형태 범위 밖이고, 'Is there' 는 there-is(3-2) 형태라 단원 1 에서 못 씁니다. 3-(다)가 _template 에 칸 규칙을 둘 때 이 점을 적기를 권합니다.

## 5. 단계표 대조(분량 · 문법 초점)

- 분량: 회화 3단계 규격은 Pre-A1 · 문장 7낱말 · '한 문장으로 답하게 묻고 막히면 영어 틀'입니다. 표본은 장면 말 4~6낱말 + 질문 3~6낱말이고, 영어 틀은 빈칸 하나짜리 한 문장입니다.
- 문법 초점(단원 1 '일반동사 현재 I · you · we · they'): 답 예시가 이 초점에 바로 맞는 것은 수업 1 의 1 · 2 · 3, 수업 6 의 2 · 3 입니다. 수업 6 의 1(can) · 4(have)와 수업 1 의 4(have), 두 카드의 5(be)는 범위 안이지만 초점 밖입니다. 장면 여는 질문은 카드 기회 · 학습 기회 셈에 들지 않으므로(설계 5 '받침 · 셈') 초점 밖이어도 규칙 위반은 아닙니다. 질문 꼴은 모두 회화 2단계에서 익힌 꼴입니다(단원 3 have · 단원 4 can · 단원 5 'Is it ~? · Do you ~?').
- 쓰기 1~3단계 문장 생산 금지는 회화와 관계없습니다. 회화 3단계는 말로 한 문장 답이고, 예 · 아니요 한 낱말 답도 받습니다.

## 6. 예상 흐름 첫 줄 초안

두 카드 모두 flow[0] 을 아래 한 줄로 바꾸기를 권합니다(설계 5 '고정 대본 막기'의 문장을 그대로 옮김). flow 칸은 'flow' 역할이라 문장 길이 · 범위 검사를 받지 않고, 사본 검증에서도 새 오류가 없었습니다.

```
After the scene question, the teacher follows the child's answer.
```

- 바뀌는 줄(수업 1): "The teacher greets the child and talks about a family trip to the lake." → 위 줄. 장면 정보는 topic · 나머지 흐름 줄에 남습니다.
- 바뀌는 줄(수업 6): "The teacher greets the child and talks about a family trip to the sea and a mountain." → 위 줄.
- 주제를 덧붙인 꼴(예 '… and comes back to the lake trip')은 권하지 않습니다. 아이 이야기를 따라가기보다 빨리 돌아오라는 신호로 읽힐 수 있어서입니다. '예 뒤 · 아니요 뒤' 갈래 문장도 넣지 않았습니다.

## 7. 근거

- 교육과정: 2022 개정 영어과 3~4학년군 표현 성취기준 [4영02-08](주요 정보 묻고 답하기) · [4영02-10]. 저장소의 회화 1단계 근거와 같은 번호를 따랐고 원문 대조는 못 했습니다.
- CEFR: CV 2020 Pre-A1 Overall spoken interaction 'Can ask and answer questions about themselves and daily routines, using short, formulaic expressions…'와 Information exchange Pre-A1. 기억에 기댄 인용이고 원문 대조는 못 했습니다. 이 수준의 아이는 쉬운 질문에 낱말 하나나 외운 말로 답하므로, 예 · 아니요 질문이 한 낱말 답('Yes!')을 받쳐 줍니다.
- 표본마다: 1 · 2(아이 생활 · 가족 활동 묻고 답하기, [4영02-08] · Pre-A1 '자기 일상 묻고 답하기'), 3 · 4(좋아하는 것 · 가진 것, 같은 근거), 5(장면 속 사실 확인, Pre-A1 정보 교환. 아이 자기 이야기와 거리가 있어 순위가 낮음).

## 8. 근거가 약한 항목

- '대부분의 아이가 자전거를 타거나 수영을 해 봤다'는 판단은 경험에 기댄 것이고 자료로 확인하지 않았습니다. 대본의 아니요 갈래(설계 7 의 장면 대본 셋)로 아니요 답 뒤의 이어 묻기도 확인됩니다.
- 성취기준 번호 · CEFR 서술자 문구는 위 7절대로 원문 대조를 못 했습니다.
- 수업 6 의 1번에서 '어디서 수영해?'를 통해 sea · beach 가 나올 것이라는 기대는 AI 이어 묻기에 달려 있습니다. 카드는 그 질문을 대본으로 두지 않습니다(설계 5).

## 9. 결정이 필요한 것

1. **요청자: 번호 고르기.** 표본 쪽으로 '수업 1 은 ○번, 수업 6 은 ○번'을 받습니다. 답 전에는 1 · 1 로 대본을 돌립니다(plan 정한 것 4). 두 카드에서 같은 꼴(특히 2 · 2, 질문 글이 똑같음)은 피하기를 권합니다.
2. **컨트롤러: 정본 예시 문구.** 정본 02-2:200 · spec 설계 5 의 예 'We are at the lake! Do you like the lake?' 는 수업 1 카드의 required no 3 쉬운 질문 'Do you like the lake?' 와 같은 질문 열쇠라서 검증기에 걸립니다(대조 사본에서 'card.required.2.easyQuestion.en 와 같은 질문' 오류를 확인). 예일 뿐이라 규칙 위반은 아니지만, 26장을 만들 생성자가 예를 따라 쓰면 같은 충돌이 납니다. 예 문구를 바꿀지(예 'Bikes and ducks at the lake! Do you ride a bike?') 15번 문서 반영 때 정하면 됩니다.
3. **3-(다) · 26장 브리프: 꼴 돌려 쓰기 규칙.** 같은 단원 안에서 장면 여는 질문의 꼴이 겹치지 않게 하고, 쉬운 질문에 이미 많은 'Do you like …?' 꼴(수업 1 은 10개 중 6, 수업 6 은 11개 중 7)은 장면 여는 질문에서 피하기를 권합니다. 대본 느낌은 카드 하나보다 단원 · 단계 전체에서 같은 첫 질문 꼴이 되풀이될 때 커지기 때문입니다. 검증기 규칙이 아니라 생성 브리프 규칙으로 두는 것을 권합니다.
4. **대본에서 볼 것(design-reviewer · 설계 7).** 수업 6 은 준비가 없어 인사 끝 턴 바로 뒤에 장면 여는 질문이 붙습니다. 인사 끝 둘째 문장에 AI 가 '오늘 장면 한 문장'을 쓰면(설계 2 인사 끝 행, 허용) 장면 말이 두 번 이어질 수 있습니다. 규칙 위반은 아니고 자연스러움의 문제라 대본 판정에서 보면 됩니다.
