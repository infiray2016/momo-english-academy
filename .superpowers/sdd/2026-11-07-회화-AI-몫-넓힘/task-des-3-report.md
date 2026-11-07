# 묶음 3 산출물 검토 보고: 장면 여는 질문 표본 · 개정 5 카드 두 장 · 시드 목록 넷 · 생성 브리프(아이 눈 · 정본 대조)

작성: 설계 · 화면 검토자(design-reviewer, Fable max) · 2026-11-07 · 브리프 `task-des-3.md` · 읽기 전용(고치지 않음)

## 1. 판정

**카드 두 장 · 시드 목록 넷 · 표본 10 은 Approved. talk-3 브리프는 수정 필요(Important 하나, 12절 예시 카드).** 26장 생성 전에 I-1 을 고치면 된다. Critical 없음. 요청자 결정(번호 고르기) 전 1번 · 1번으로 두는 데 이견 없음.

근거 요약: 개정 5 두 장의 diff 는 카드마다 세 줄(revision 4→5 · sceneOpener 추가 · flow[0] 교체)뿐이고 다른 칸은 불변이다(`git diff -- seed/lessons/talk/3/1.json`, 6 insertions · 4 deletions). 장면 여는 질문 칸 일곱은 정본 06:186 · 02-2:200 받침 표와 맞고, 열 표본 모두 단원 단어 25개(`seed/unit-specs.json` talk 3-1 words: eat · drink · go · come · wash · sleep · study · learn · watch · listen · look · see · make · sky · sea · cloud · rain · snow · wind · river · mountain · beach · grass · forest · air)를 쓰지 않았으며 낱말은 모두 2단계 이하다(`seed/vocab.json`: bike · duck · lake · sun · hot 1단계, ride · water · swim · cool 2단계).

## 2. 지적

### Important

**I-1. `seed/prompts/talk-3.md:469` 12절 예시 카드의 장면 여는 질문이 같은 카드 필수 질문 1 과 주제가 겹친다.** 예시의 장면 여는 질문 'Toys and books at home! Do you read books?' 바로 뒤에 필수 질문 1 'What do you do at home?'(471줄, 노림 watch)이 온다. 둘 다 '집에서 하는 일'이라, 아이가 '응, 책 읽어' 하고 답한 뒤 '집에서 뭐 해?' 를 들으면 '책 읽어' 를 되풀이하기 쉽고 '아까 물었는데' 가 된다. 근거: 같은 브리프 5절 160줄 (라) "그 카드 필수 질문의 주제와 겹치지 않는다. 겹치면 아이가 같은 답을 두 번 하거나 '아까 물었는데' 하고 느낀다", 3-(나) 표본 쪽이 수업 1 의 2번을 같은 까닭으로 추천에서 뺀 것(`task-3b-samples.md:24`). 예시는 '그대로 옮기지 않는다'(442줄)지만 26장 생성자가 꼴을 본뜨는 본보기이고, 14절 스스로 확인 스크립트는 주제 겹침을 보지 못한다. 고침: 예시의 장면 여는 질문을 집 밖 장면 · 필수 질문이 묻지 않는 하는 일로 바꾸거나(차 · 버스는 필수 2 · 더 5 와 겹치므로 피함), 예시 카드 필수 1 의 장면을 바꾼다. 5절 (라) 행에 '14절 스크립트가 보지 못하므로 사람이 확인한다' 한 줄을 더하면 생성자가 놓치지 않는다.

### Minor

**M-1. `seed/lists/talk-cue-lines.json:16` 2~3단계 꺼내기 긴 꼴 'Listen and say this word!' 가 들리는 것과 어긋날 수 있다.** 꺼내기 소리 줄은 '아이가 따라 할 영어 한 줄'(`src/core/ai/calls/talk-lesson.ts:613` model_line 설명)이고 대신 줄은 카드 modelLine('I wash.' 꼴, 정본 06 '들려줄 짧은 말')이라 낱말이 아니라 짧은 문장이 흔하다. '이 낱말을 말해 봐!' 뒤에 'I wash.' 가 들리면 선생님 말과 소리가 다르다. 'Listen and say it!'(1단계 긴 꼴과 글이 같아도 구간이 달라 괜찮음) 또는 'Listen and say this!' 를 권한다.

**M-2. 목록의 둘째 긴 꼴 여섯 줄은 코드가 고르지 않는다(`src/core/conversation/cue-line.ts:116-127`).** 첫 신호 말(ordinal 0)은 `[...long, ...rotated]` 에서 바로 앞 신호 말과 같지 않은 첫 줄이라 늘 long[0] 이고, 그 뒤(ordinal ≥ 1)는 짧은 꼴 셋이 앞에 오므로 긴 꼴은 다시 쓰이지 않는다. 자리마다 long[0] 과 같은 글이 다른 자리 목록에 없어 long[1] 에 닿는 길이 없다. 정본 06:187(긴 꼴 하나 이상)과 02-2:212(첫 신호 말은 긴 꼴, 그 뒤 짧은 꼴)에는 맞고 해도 없다. 다만 3-(다) 보고 2절이 긴 꼴을 둘로 늘린 뜻(대화마다 다른 첫 신호 말)은 실제로 나지 않는다. 살리려면 묶음 2 코드가 긴 꼴을 시도 · 턴 번호로 돌려야 한다(이 묶음 밖, 컨트롤러 판단). 목록 쪽 고칠 것은 없다.

**M-3. `seed/lists/talk-situation-lines.json:5 · 7` 인사 끝 줄 'Thank you! Here we go!' · 'Thanks! Now let's start.' 는 맥락이 비어 있다.** 'How are you?' 답('I am fine.' · 'I am sad.') 뒤의 '고마워!' 는 영어 · 한국어 모두 무엇이 고마운지 없어 아이가 갸웃하기 쉽다. 3-(다) 보고 2절의 '기분이 나빠도 맞는 말' 의도는 'Okay!' · 'Oh, okay!' 두 줄이 이미 맡는다. 근거: 02-2:208 상황 차례 '아이 말과 그 자리에 맞게'. 'Okay then! Here we go!' 꼴(okay · then · here · we · go 모두 1단계 · 허용 낱말 안)을 권한다.

**M-4. `seed/lists/talk-situation-lines.json:27` 'Sorry, I can't hear it. Let's go on.' 의 'it' 이 비어 사물을 못 듣는 말처럼 들린다.** 고정부 예(`talk-lesson.ts:875`)는 'I can't hear it well.' 이다. 'Sorry, I can't hear well.'(well 은 허용 낱말) 또는 고정부 예 그대로를 권한다.

**M-5. `task-3b-samples.md:51` 수업 1 표본 5 의 받침 줄이 앞뒤가 안 맞는다.** 둘째 도움 쉬운 질문 'Is it hot?'(더워?) 뒤 셋째 도움 답 예시가 'Yes, it is cold.' 다(02-2:200 첫째 · 셋째 답 예시 · 둘째 쉬운 질문). 추천 밖 표본이라 요청자가 5번을 고를 때만 고친다('Is it cold?' 는 장면 여는 질문 'Is the water cold?' 와 열쇠가 달라 쓸 수 있다).

**M-6. `seed/lists/talk-made-up-phrases.json` 거짓 양성 후보 둘(걸리면 그 문장만 지워지고 질문은 남는다 — `src/server/conversation/lesson-turn.ts:765-777`, 해는 작음).** (가) 'i remember': 선생님이 이 대화에서 아이가 한 말을 되짚는 'I remember! You like fish.' 도 걸린다(C211 (1) 아이 이야기 따라가기와 맞닿음). remember 는 4단계 낱말이라 1~3단계에서 드물다. (나) 'one day i': 바람('One day I want to see a whale!')은 spec 설계 3 이 허용하는 자기 이야기인데 걸린다. 목록은 06:187 (4) 꼴(1인칭 과거 경험 · 기억) 안이라 고칠 것은 없고, 대본 판정에서 made_up 지움 사유를 세어 보면 된다. 낱말 경계 대조(`src/core/conversation/made-up.ts:19`)라 'when I wash' · 'Kiki saw' 같은 글자 겹침은 걸리지 않음을 확인했다.

**M-7. `seed/lists/talk-situation-lines.json:32` 금지 구 'you don't know' 는 다독이는 문장('It's okay if you don't know.')도 잡는다.** 바뀌는 상황 줄도 다독이는 말이라 해는 없다. 참고로 둔다.

### 참고(지적 아님)

- 꼴 돌려 쓰기의 '첫 세 낱말' 셈(`talk-3.md:161`)은 'Do you ride' · 'Do you play' 를 다른 꼴로 보므로 한 변형 13장이 모두 'Do you …?' 로 시작해도 걸리지 않는다. 3단계 단원 1 의 첫 낱말이 Do · Is · Are · Can 넷뿐이라 어쩔 수 없는 면이 있고 제안 규칙(17절)이다. 생성 뒤 단원 26장의 장면 여는 질문만 모아 한 번 훑는 사람 확인을 권한다.
- 두 카드의 장면 여는 질문 쉬운 질문('Do you like bikes?' · 'Do you like water?')도 'Do you like' 꼴이다. 둘째 도움에서만 쓰이고 규칙은 질문 문장에만 걸린다.
- 허용 낱말 40 에 go · learn · listen(3단계 단원 1 단원 단어)이 든다. 고정부 · 신호 말 예문에서 나온 것이고, 받침 차례에서는 답 글 검사 (나)가 어휘 검사 (가)보다 먼저 걸려(`src/core/conversation/situation.ts:129-154`) 답이 새지 않는다.
- 느낌 낱말 excited(5단계) · scared · bored(어휘 밖)는 아이 말을 보는 목록이라 범위 밖이어도 해가 없다.
- 3-(나) 9절 4(수업 6 은 준비가 없어 인사 끝 둘째 문장의 '오늘 장면 한 문장' 뒤에 장면 말이 또 올 수 있음)는 대본 판정 항목으로 그대로 둔다(spec 설계 2).

## 3. 본 것(브리프 '볼 것' 1~5)

1. **표본 10 · 추천 1번 · 1번.** 열 표본 모두 두 문장 · 물음표 문장 마지막 하나 · 'or' 없음 · 첫 낱말 Do · Can · Is · 단원 단어 없음 · 2단계 이하 낱말 · 아이 상태 단정 없음(장면 말이 물건 · 곳). 추천 1 · 1 에 동의한다: 아이 자기 일을 묻고, 예 · 아니요 어느 답이든 이어 물을 거리가 있고, 필수 질문과 주제가 안 겹치며, 두 수업의 꼴(Do you ride · Can you swim)이 다르다. 2번은 필수 3 · 더 1 과 겹치고, 3번은 두 카드 쉬운 질문 21개 가운데 13개가 'Do you like' 꼴이라 대본 느낌이 커지며, 4번은 이어 갈 거리가 좁고, 5번은 퀴즈라는 표본 쪽 판단에 동의한다. 수업 1 의 'ducks' 는 필수 5 · 더 5 의 오리와 이어져 장면을 하나로 묶는다(겹침이 아니라 잇기). 수업 6 의 'swim' 은 필수 2 'Where do they swim?'(고래)과 낱말이 같지만 묻는 것이 달라 다리가 된다.
2. **개정 5 두 장.** sceneOpener 칸 일곱(question en · ko, hintKo, hintEn, frameEn, answerExample, easyQuestion en · ko)이 06:186 · spec 설계 5 와 맞다. 뜻 · 뜻 힌트는 반말(02-2:39), 틀은 빈칸 하나('Yes, I ___ a bike.' · 'Yes, I can ___.'), 답 예시는 Yes 로 시작하는 7낱말 안 한 문장, 쉬운 질문은 물음표로 끝나고 카드의 다른 질문과 열쇠가 다르다(검증기 0, 3-(나) 재현 검사). 흐름 첫 줄은 두 장 모두 정해진 문장 그대로이고 '예 뒤 · 아니요 뒤' 갈래가 없다. revision 5 · correction 0, generation 칸은 개정 4 전례대로 그대로.
3. **목록 넷.** 신호 말 30줄: 물음표 없음, 1단계 5낱말 · 2~3단계 6낱말 안, 같은 구간의 자리끼리 겹치는 줄 없음, 짧은 꼴 셋 돌림은 자연스럽다(M-1 · M-2 빼고). 'Together!' 꼴 한 낱말 줄을 뺀 것은 좋다. ko 반말은 영어 문장의 뜻이므로 02-2:39 대로다(컨트롤러 결정, 닫힘). 상황 줄 17줄: 자리 몫(spec 설계 1 표)과 맞고 아이에게 쉬우며, 받침 첫째에서 '같이 말하자' 를 뺀 판단은 설계 1 받침 첫째 행 그대로이고 신호 말이 그 뒤에 붙는 것을 `cue-line.ts` cuePlaceOf(받침 첫째 + 답 소리 → together)로 확인했다(닫힘). 금지 구: 정규화가 줄임꼴을 펼치므로(`src/core/speech/match-rate.ts` normalizeForMatch (3)) 'That is wrong' 도 걸린다. 허용 낱말 40: 모두 수업 말 · 감탄 · 기능어 꼴이고 출처 파일(스크래치패드 allowed-out.txt)과 맞으며 장면 내용어가 없다. 지어낸 경험 꼴 20: 모두 1인칭, 낱말 경계 대조, 거짓 양성 후보는 M-6.
4. **talk-3 브리프 · _template.** 5절 '장면 여는 질문 쓰는 법' 아홉 행(무엇 · 글 · 질문 꼴 · 낱말 · 같은 질문 · 좋은 질문 · 꼴 돌려 쓰기 · 받침 칸 · 예상 흐름), 12절 칸 표, 14절 확인 목록과 스크립트(칸 없음 · 첫 낱말 · or · 답 예시 첫머리 · 단원 단어 · 같은 열쇠 · 흐름 첫 줄 · 꼴 셈 · 'Do you like'), 17절 제안이 26장 생성에 충분하다. _template 35줄은 같은 규칙을 요약하고 본보기를 가리킨다. 빠진 것은 I-1(예시가 (라)를 어김)과 (라)의 사람 확인 한 줄.
5. **요청자 몫.** 번호 고르기('수업 1 ○번, 수업 6 ○번') 외에 없다. 정본 예 문구 바꾸기(3-(나) 9절 2)는 컨트롤러의 15번 문서 반영 몫이다.

## 4. 열린 항목 판정

| 항목 | 판정 |
|---|---|
| 3-(나) 9절 1 번호 고르기 | 열림(요청자) |
| 3-(나) 9절 2 정본 예 문구 'We are at the lake! Do you like the lake?' | 열림(컨트롤러, 15번 문서 반영) |
| 3-(나) 9절 3 꼴 돌려 쓰기 규칙 | 닫힘(`talk-3.md:161` · 17절 · 14절 스크립트) |
| 3-(나) 9절 4 인사 끝 뒤 장면 말 두 번 | 열림(대본 판정 항목) |
| 3-(다) 6절 1 목록 ko 말투 | 닫힘(컨트롤러 결정 · 02-2:39) |
| 3-(다) 6절 2 느낌 낱말 good · great 뺌 | 닫힘(컨트롤러 수용), 대본 지표에서 본다 |
| 3-(다) 6절 3 허용 낱말 재생성 | 열림(묶음 1 고정부 예가 바뀔 때) |
| 3-(다) 6절 4 다른 번호를 고르면 | 열림(요청자 답 뒤, M-5 포함) |
| 3-(다) 6절 5 아이 눈 검토 | 이 보고로 닫힘(M-1 · M-3 · M-4 는 고칠지 컨트롤러 판단) |

## 5. 본 파일

브리프 `task-des-3.md`, 산출물 `task-3b-samples.md` · `task-3b-report.md` · `task-3c-report.md`, 워크트리 p13d 의 `seed/lessons/talk/3/1.json`(diff) · `seed/lists/talk-cue-lines.json` · `talk-situation-lines.json` · `talk-allowed-words.json` · `talk-made-up-phrases.json` · `seed/prompts/talk-3.md`(0 · 5 · 12 · 14 · 17절) · `_template.md:35` · `seed/unit-specs.json` · `seed/vocab.json`, 정본 `specs/06-시드-생성.md:186-187` · `specs/02-2-세션과-단계표.md:39 · 194-212` · `specs/10-결정-기록.md` C206 · C207 · C211, spec 판 4 설계 1 · 2 · 3 · 5 · 6, 코드 `src/core/conversation/cue-line.ts` · `situation.ts` · `made-up.ts` · `src/core/seed/check-talk-lists.ts` · `src/server/conversation/lesson-turn.ts:755-800 · 1355-1400` · `src/core/ai/calls/talk-lesson.ts:609-616 · 839-897`. diff 사본: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/talk-3-1-diff.txt`.
