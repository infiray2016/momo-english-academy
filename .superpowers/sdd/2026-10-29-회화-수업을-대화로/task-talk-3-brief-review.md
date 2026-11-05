# 회화 3단계 생성 브리프(`seed/prompts/talk-3.md`) · 3단계 단원 1 목표 설계 검토

검토자: design-reviewer(Fable 5.1 · max) · 2026-10-30 · **검토한 판: p13d `seed/prompts/talk-3.md` 774줄, sha256 8956f25816b5d8fc0d321e5aea6a5005bbfa0de827e81fdb216d44b54bbf2561(09:47 판)**. 검토를 시작한 판(ae6e71a2…)과 견주면 바뀐 곳은 3절 91줄 · 5절 158줄 · 170줄 · 14절 규칙 표의 근거 칸이고, 12절 예시 카드(428~482줄) · 14절 붙이기 명령(502~515줄) · 스스로 확인 명령(564~710줄)은 바이트까지 같아(`diff`) 아래 '돌려 본 것'의 결과가 이 판에 그대로 든다. 인용한 줄 번호는 모두 이 판에서 다시 찾은 것이다(26곳 대조) · `seed/prompts/README.md` talk-3 행 · `seed/unit-specs.json` talk 3단계 단원 1 goals · `talk-3-1-goals.md`. 정본은 본 저장소와 p13d 사본이 같음을 `diff -q` 로 확인했다(02-2 · 02-3 · 06 · 10). 읽기 전용으로 검토했고 대상 파일은 고치지 않았다. 14절 명령은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/talk3-brief-review/` 아래 시드 사본에서만 돌렸다.

## 판정: **Changes requested** (Important 1 · 요청자 몫 Important 1 · Minor 4)

카드 생성으로 가기 전에 I-1(같은 질문 열쇠)만 브리프에서 고치면 된다. I-2 는 카드 글을 바꾸지 않는 요청자 · P12 몫이라 생성을 막지 않는다. 브리프를 고치면 판이 바뀌므로 해시 · README 행을 함께 갱신한다(6.3 한 판 원칙).

## 지적

### I-1 (Important) 8절 질문 꼴이 실행 시점의 '같은 질문' 열쇠와 어긋나, 한 수업에서 'What do you do?' 가 넷까지 되풀이된다

- 무엇: 8절 질문 꼴 표(`talk-3.md:309-337`)의 13 동사 가운데 일곱(eat · drink · come · wash · sleep · learn · look)이 `[장면]. What do you do?` 꼴이라 **마지막 물음표 문장이 글자 그대로 같다**. 배정 1 의 새 단어 다섯 가운데 넷(eat · drink · come · wash)이 여기 든다. 12절 예시 카드(`talk-3.md:455 · 460 · 461`)도 필수 3 · 더 1 · 더 2 세 항목이 'What do you do?' 로 끝난다.
- 근거(정본): 02-2:200 '한 대화에서 글이 같은 선생님 질문(카드 · AI 모두 …)은 talk.same_question_max 번까지다', 13절 C172 가 '같은 질문을 세 번 되풀이하지 않는다'. 설정값 `talk.same_question_max` 는 2 다(p13d `seed/settings.json`).
- 근거(코드, 2026-10-30 p13d): 실행 셈의 열쇠는 그 차례의 **마지막 물음표 문장**이다 — `src/core/conversation/question-check.ts:44-57`(`turnQuestionOf`: 카드 자리는 화면 글의 마지막 문장, AI 차례 · 대화 첫 질문은 마지막 물음표 문장) · `src/core/conversation/lesson-flow.ts:241-245`(그 열쇠로 `asked` 를 센다). 반면 검증기 `talk-same-question` 은 항목 글 **전체**를 열쇠로 쓴다(`src/core/seed/check-talk.ts:619-647`, `questionKey(item.en)`). 카드 자리에 붙일 항목을 고르는 `usable` 도 항목 글 전체로 견준다(`src/core/conversation/chances.ts:191-199`). 그래서 'You are hungry. What do you do?' 와 'You are thirsty. What do you do?' 는 검증기 · 붙이기 판단에서는 다른 질문이지만, 실행 셈에서는 둘 다 'what do you do' 한 열쇠로 쌓인다.
- 실측: 12절 예시 카드를 검증기에 넣으면 오류 0(아래 '돌려 본 것')이다. 즉 검증기는 이 되풀이를 잡지 못한다.
- 새 판(09:47)에서 더 벌어진 곳: 5절 170줄이 C194 (1) 대신 질문의 ○ 예로 'You are thirsty. What do you do?' 를 들었다. 이 자리는 받침 셋째 닫기 · 들리지 않음 닫기 바로 뒤다. 앱은 막힌 질문의 열쇠(마지막 물음표 문장 'what do you do', `lesson-flow.ts:897` `blocked`)를 들고 다음 항목을 고르지만 고를 때는 항목 글 전체로 견주므로(`chances.ts:191-199` `usable`), 'You are hungry. What do you do?' 에 세 번 막힌 아이에게 답 소리 뒤 곧바로 'You are thirsty. What do you do?' 가 읽힌다. C172 가 '막힘에는 질문을 바꾸거나 도움을 준다' 가 가장 필요한 자리에서 꼬리가 같은 질문이 되풀이된다.
- 아이에게 어떻게 보이나: 배정 1 에서 대화 첫 질문(카드 글 그대로, 02-2:188)과 카드 자리(따라가기 상한 · AI 질문 검사 실패 · 같은 질문 · 받침, 02-2:190)에 붙는 글이 모두 '… What do you do?' 다. 1~3단계는 AI 질문 검사가 엄격해 카드 자리가 잦을 수 있고(회화 plan 위험 8), AI 가 'What do you do?' 를 세 번째 쓰면 그 문장이 지워져 카드 자리가 되는데 거기 붙는 다음 필수 질문의 꼬리가 또 'What do you do?' 다. 장면 앞말과 한국어 뜻이 달라도 아이 귀에는 같은 질문을 차례로 묻는 대본이 된다(브리프 5절 으뜸 원칙 · 과제 '새로 볼 것 1' 의 '차례대로 묻는 대본이 되지 않는지').
- 고칠 것(브리프):
  1. 5절 '같은 질문' 행(`:146`) · 더 이야기할 거리 문단(`:170`)과 14절 확인 4(`:524`)에 한 줄을 더한다: "선생님 질문(인사 · 필수 · 더 · 쉬운 질문)의 **마지막 물음표 문장**(실행 열쇠, 대소문자 · 문장 부호 · 줄임꼴 무시)이 한 카드에서 글자가 같은 것은 2번까지다. 앱이 같은 질문을 이 문장으로 세기 때문이다."
  2. 8절 표(`:309-337`)의 'What do you do?' 꼬리 일곱과 5절 170줄의 ○ 예를 열쇠가 다르게 바꾼다. 1~2단계 낱말로 되는 예: eat 'Lunch time! What do you do now?' → 'I eat lunch.', drink 'You are thirsty. What do you do with water?' → 'I drink water.', wash 'Your hands have sand. What do you do with your hands?' → 'I wash my hands.', sleep 'You are tired. What do you do in your bed?' → 'I sleep in my bed.', look 'Birds in the tree! What do you do with your eyes?' → 'I look at the birds.', come 'The sun is down. Do you go home? What do you do?' 대신 'The sun is down. What do you do now?' 와 eat 의 now 를 둘 가운데 하나만 쓰기. '질문에 노리는 단어 없음'(A4-03)은 그대로 지켜진다(water · hands · bed · eyes 는 노리는 단어가 아니다).
  3. 14절 스스로 확인 명령에 그 셈을 넣는다(제안 덩어리): `qs = re.findall(r"[^.!?]*\?", text)` 로 마지막 물음표 문장을 뽑아 `re.sub(r"[^a-z0-9]+", " ", q.lower()).strip()` 열쇠로 세고, 카드마다 열쇠별 수가 2 를 넘으면 걸림으로 낸다. 대상은 인사 질문 · 필수 · 더 · 쉬운 질문의 `en` 이다.
  4. 12절 예시 카드의 세 항목(필수 3 · 더 1 · 더 2)을 새 규칙에 맞게 고치고 다시 검증한다(12절 머리 '검증을 통과한 것만 싣는다').
- 컨트롤러 몫(브리프 밖, 구현하며 확인할 것): 검증기 `talk-same-question` 의 열쇠를 실행 열쇠와 맞추지 않으면 브리프 규칙이 검증기보다 엄격한 채로 남는다. `check-talk.ts:619-647` 가 `turnQuestionOf` 와 같은 마지막 물음표 문장으로 세게 하거나, `question-check.ts` 쪽이 카드 항목은 글 전체로 세게 하거나 둘 중 하나로 맞춘다(묶음 3 재열기 또는 묶음 8).

### I-2 (Important, 요청자 몫 · P12 몫 — 카드 글은 바뀌지 않음) talk-3-1-1 의 expression 을 답 예시 세 꼴과의 일치율 0.8 로 보면, 아이가 제 이야기를 한 바른 문장이 걸린다

- 무엇: 컨트롤러 판단 1(`talk-3.md:20`, `talk-3-1-goals.md:7 · 102`)은 expression 을 '답 예시를 I · We · They 세 꼴로 두고 evidence.match_cut 둘째 값(0.8)' 으로 본다. 정본 3.8 은 expression 을 '카드 목표 표현과의 일치율'로 정한다(02-3:119).
- 실측(p13d `src/core/speech/match-rate.ts` 의 `matchRate` 를 그대로 돌림): 'I eat a sandwich.' 를 목표로 'I eat pizza.' 0.50 · 'I eat a pizza.' 0.75 · 'I eat sandwich.' 0.75, 'I drink water.' 에 'I drink juice.' 0.67, 'I listen to songs.' 에 'I listen to music.' 0.75, 'I wash my hands.' 에 'I wash my face.' 0.75, 'We go to the lake.' 에 'We go to the beach.' 0.80. 세 꼴 가운데 최고를 써도 주어만 바뀔 뿐 목적어 · 장소가 달라지면 값이 같다('They watch a soccer game.' ↔ 'We watch a soccer game.' 0.80 이 경계에 겨우 닿는다). 조각 'Watch the rain.' 0.75 · 'To the beach.' 0.60 은 목표 장부 §5 1 의 값과 같다.
- 뜻: 으뜸 원칙과 브리프 10절이 '아이 자신과 가족의 주말'을 묻는데, 아이가 카드 예시를 그대로 따라 말할 때만 expression 이 서고 제 이야기('I eat pizza.' · 'I drink juice.')는 '아직'이 된다. 지금은 아이 화면 · 통과 · 승급에 쓰지 않으므로(`talk-3-1-goals.md:143`) 아이에게 해는 없지만, 병행 검증 · 부모 화면 근거가 '예시를 외운 아이'에게 기운다.
- 제안(요청자 확인 때 함께 보일 것): talk-3-1-1 의 expression 은 일치율 대신 **꼴 검사**로 본다 — 인식 글이 I · We · They 로 시작하고 그 뒤에 단원 동사(원형, vocab 원형 대조)와 낱말 하나 이상이 있으면 expression 참. 앱이 vocab 원형 대조로 확인할 수 있어 '확인 보류'도 피한다. 일치율을 쓰려면 영어 틀(`hints[0]`)의 빈칸 밖 낱말('I ___ in my bed.' → 'I', 'in my bed')이 아니라 주어 + 동사 두 낱말만 견주는 안이 있다. 브리프의 답 예시 규칙('I · We · They + 동사 원형', `:155`)은 어느 안에서도 그대로 유효하다.

### M-1 (Minor) 5절 '질문 글은 두 문장까지'(`:142`)와 8절 grass 예 'It is green. Cows eat it. What is it?'(`:335`, 세 문장)이 어긋난다
- 둘 가운데 하나로 고른다. `talk.teacher_sentences_max.1-3` 은 3 이라 세 문장도 설정 안이지만, 카드 자리에는 AI 반응이 앞에 붙으므로(02-2:190) 두 문장으로 두는 쪽을 권한다.

### M-2 (Minor) 0절 '단원 2~5 는 … 이 판이나 다음 판으로'(`:13`)는 성립하지 않는다
- 6절은 단원 1 규격만 옮겼고(`:238-261`), 14절 스스로 확인의 `VERBS` · `GOAL_OF` 는 단원 1 전용으로 박혀 있다(`:573-575`). 단원 2 의 목표 · 단어를 더하면 브리프가 바뀌어 새 판이 된다. '다음 판으로' 로 적는다.

### M-3 (Minor) 14절 스스로 확인의 한국어 이름 글자 검사가 뒤 명단 이름을 보통 낱말 앞머리에서도 건다
- 실측: '준비됐어?' · '오늘 준비한 말이야.' → '준', '하나 더 말해 볼까?' → '하나', '나비가 날아.' → '나비', '우리 집에 소라가 있어' → '소라' 가 걸린다(`:590 · 694-700`). 검증기 `teacher-name` 은 지금 명단(미나 · 리오)과 토리만 보고 보통 낱말 예외 목록을 둔다(`src/core/seed/check-teacher.ts:40-66`). 뒤 명단 열 이름까지 한국어 칸에서 막으면 생성자가 '준비' · '하나' 같은 흔한 말을 돌려 쓰게 되어 한국어가 어색해질 수 있다. 제안: 뒤 명단 이름은 영어 칸만 보거나, 한국어는 '준' 을 빼고 10절 `:362` 의 '하나 → 한 개' 치환 안내만 둔다.
- 같은 명령의 어휘 검사는 두 낱말 표제어 'ice cream'(2단계)을 'ice' · 'cream' 으로 갈라 범위 밖으로 낸다(`:592 TOKEN` 이 띄어쓰기로 가름, `:577-582 surfaces` 는 'ice cream' 통째). 변형 1 묶음(음식)에서 나올 수 있으니 토큰 전에 두 낱말 표제어를 먼저 맞추거나 7절에 '쓰지 않음'으로 적는다.

### M-4 (Minor) 부정 명령문 'Don't ~' 가 어느 검사에도 걸리지 않는다
- 8절 '검출기가 못 잡지만 쓰지 않는 꼴'(`:307`)에 명령문은 있으나 'Don't ~' 가 없다. 형태 표 `dont` 는 주어가 있는 꼴만 잡고(`seed/lists/forms.json` 패턴 `\b(?:i|you|we|they)\s+(?:don't|do\s+not)`, C67 (1)), 스스로 확인의 어휘 검사는 `don't` 를 `do` 로 펼쳐 통과시킨다(`:587 SUFFIX`). 'Don't worry!' 같은 선생님 말이 3단계 단원 4 요소를 앞질러 나올 수 있으니 한 줄 더한다.

## 새로 볼 것 일곱의 판정

1. **아이 눈**: 첫 필수 질문을 짧은 준비 낱말로 바로 답하게 하는 규칙(`:163 · :232`), 홀로 뜻이 통하는 질문(`:142`), 예 · 아니요 쉬운 질문(`:158`), 반말 뜻, 동사 그림을 질문에 두지 않는 규칙(`:344`)은 모두 3단계 아이에게 맞다. 대본이 되는 위험은 I-1 하나이고, 거기만 고치면 된다.
2. **T2 · R2 를 어기게 하는 지시 없음**: 쪽지는 낱말 글 · 뜻 · 그림만(`:130` = 02-2:174), 영어 문장은 힌트 단추 뒤(`:86 · :156`), 답 예시는 소리(`:155`), 목표 표현은 화면에 없음(`:188`), 칭찬 · 안전한 대사는 판정 말이 아님(`:194-195`), 끝맺음 조건에 참고 턴 채움 없음(`:197`). 정리 대사 글은 정리 토막이라 T2 밖이다(02-2:165 · 208).
3. **어휘 · 형태 범위 좁힘은 타당**: 아이 차례는 1~2단계 320 낱말 + we · they + 열린 단원 단어(`:269`). 브리프 7절의 수(기능어 44 · 1단계 151 · 2단계 125)와 9절 그림 217 은 `seed/vocab.json` · `images.json` 과 같다(실측). park · weekend · TV 를 못 쓰는 것은 각각 3단계 단원 2 · 4단계 · vocab 밖이라 맞고, wind · air 를 꺼내기로 돌린 것(`:339`)은 질문으로 끌어내기 어려운 낱말에 알맞다. 카드가 딱딱해지는 원인은 어휘가 아니라 I-1 의 질문 꼴이다. 형태 표 대조(8절 `:297-305`)는 `forms.json` 의 introducedAt 과 같다(third-person-s 4-1 · dont 4-2 · present-progressive 4-3 · time-at 4-5 · there-is 3-2 · lets 3-4 · want-to 5-2 · gerund 9-1, `have` 검출기가 'Have fun!' 을 빼 줌).
4. **받침 줄 · C194**: 받침 차례(`:151`)는 02-2:257-261 과 같다. 새 판 170줄의 C194 (1) 지침(막혔던 질문의 답 바로 뒤에 그대로 읽어도 맞는 꼴, there · it · that · too 없이 장면을 스스로 주는 질문 하나, 노리는 낱말을 고루 나눔)은 C194 (1)과 02-2:261(답 소리 뒤 다음 카드 자리)에 맞는 좋은 규칙이다 — 다만 그 ○ 예의 꼬리가 I-1 이다. C194 (2)는 `:91 · :158`(새 판에서 근거를 더함)과 검증기 `check-talk.ts:738-742` 에 들어 있다. I-1 밖은 닫힘.
5. **우려 여덟** — 아래 절.
6. **14절 명령이 실제로 돈다**: 아래 '돌려 본 것'. 셋 다 브리프 글 그대로 돌았다.
7. **목표 둘의 대표성**: 3단계 회화 단계표 '한 문장으로 답하게 묻기 · 영어 틀 · 이어 묻기'(02-2 3단계 행, `level-specs` talk 3 mode)를 talk-3-1-1 이, 단원 단어 25 가운데 장소 · 자연 · 날씨 12 를 talk-3-1-2 가 받는다. 학습 요소의 'you' 는 선생님 질문 쪽이라 아이 산출 목표에 없어도 된다. 주된 능력이 둘 다 '정보 묻고 답하기'인 겹침은 덮음 표 2.3 에 보이고 C171 이 허용한다. 교육과정 근거([4영02-08] · [4영02-05] · [4영01-05])와 CEFR-J 참고는 '2차 자료 둘의 일치 · 판정 아님'이라는 확인 정도 그대로 받는다. 알맞음.

## 학습 설계자의 우려 여덟

| 번호 | 우려 | 판정 | 근거 |
|---|---|---|---|
| 1 | 12절 꼴이 묶음 3 fix 1 앞 판 | 닫힘 | 12절 표를 `src/core/seed/schema/talk.ts` TalkCardSchema(216-250) · 항목 꼴(152-191) · 인사(128-136) · 오늘 쓸 말(140-148) · `lesson.ts` GenerationSchema(retries 선택)와 칸마다 대조해 같음. 12절 예시 카드를 묶음 3 최종 검증기(T-32 닫힘)로 돌려 오류 0 |
| 2 | expression 세 꼴의 P12 몫 | 아직 열림(요청자 몫 · P12) | I-2. 카드 글은 바뀌지 않음 |
| 3 | 어휘 범위를 실시간 검사보다 좁힘 | 닫힘 | 새로 볼 것 3 |
| 4 | 다지기 6 명사는 처음 듣는 낱말 | 닫힘(첫 프리뷰 한정 현상) | 처음 묻는 턴 여부는 앱이 아이 기록으로 바꾼다(02-2:245 · 271). 받침 줄이 받친다(`:388`). 구현하며 확인할 것 2 참고 |
| 5 | 배정 1 · 2 의 relation-early-use | 닫힘 | 경고다(`src/core/seed/check-cross.ts:291-335`, `SeedWarning`). 보는 role 은 example · hint · tori · child 등 `COVERAGE_ROLES`(`check-cross.ts:58-68`)이고 flow 는 없다 — 브리프의 '(제안) 예상 흐름도'는 스스로 지키는 규칙. 'See you!' · 'Look!' 회피(`:147 · :196 · :387`)와 'Have fun!' 끝인사는 맞다 |
| 6 | they 는 가족만 | 닫힘 | 8절 표에 가족(They watch a soccer game.) 말고 동물(They swim in the river. · They are in the sea.)이 있어 '가족만'이 아니다. 3인칭 -s(4단계 단원 1) 회피 근거 타당 |
| 7 | 선생님 자기 이야기 좁힘 | 닫힘 | 06:30 '좋아하는 것 정도' · C130 (9)와 같다. `SELF_LIFE` 정규식 실측: 'I go to the beach.' 걸림 · 'I like the sea. And you?' 통과 |
| 8 | 스스로 확인 명령은 단원 1 몫 | 닫힘(M-2 문구만) | 실측 통과. 단원 1 전용임을 0절에 '다음 판' 으로 적으면 된다 |

## 장부 판정

- **T-18** — 아직 열림(요청자 몫). 컨트롤러 판단 넷 가운데 (2) weekend · day 안 씀(vocab 4단계 실측) · (3) What · Where 는 C64 (3)(`forms.json` 에 What · Where 검출기 없음, talk-1 선례) · (4) 다지기 6 두 목표는 닫힘. (1) 목표 둘 · expression 세 꼴 0.8 · 장소 질문은 talk-3-1-2 만은 요청자 확인 몫이고, 그때 I-2 의 실측 값을 함께 보인다.
- **T-36** — 아직 열림. I-1 을 브리프에 반영하고(판 · 해시 · README 갱신) 12절 예시를 다시 검증하면 닫힌다. 우려 여덟은 2 만 요청자 몫으로 남고 나머지 닫힘.

## 구현하며 확인할 것(브리프 밖)

1. (컨트롤러 · 묶음 3 재열기 또는 8) 검증기 `talk-same-question` 과 실행 `turnQuestionOf` 의 열쇠 맞추기(I-1 끝).
2. (묶음 9) 다지기 · 보강 짧은 준비의 **들려줄 말 출처**. 다지기 카드는 `todayWords` 가 `[]`(검증기 `talk-today`, `check-talk.ts:745-758`)라 카드에 들려줄 말이 없다. 지금 서버 `wordInfoOf`(`src/server/conversation/index.ts:132-154`)는 vocab 뜻 · 예문만 읽는다. 첫 프리뷰에는 배정 5 카드도 없으므로 beach · mountain 의 들려줄 말은 앱이 만들어야 한다(브리프 5절 `:165` 의 (제안) 꼴 'The + 낱말.' 을 앱 규칙으로 쓰면 카드와 결이 같다).
3. (P12) expression 확인 방식(I-2).

## 돌려 본 것(2026-10-30, p13d 코드 · 스크래치패드 시드 사본)

- 브리프 해시: 검토 시작 때 ae6e71a2… 같음, 09:47 판 8956f258… 같음(알림의 값과 일치). 두 판의 12절 예시 · 14절 명령 덩어리 셋은 `diff` 로 같음을 확인해 아래 실행 결과를 새 판에 그대로 적용했다. 표본 파일 해시(`samples.md` e0e4a989… · `samples-level4-5.md` 0be72c00…) 브리프 `:203` 과 같음.
- 12절 예시 카드(브리프 428~482줄을 그대로 뽑음)를 `<사본>/seed/lessons/talk/3/1.json` 에 넣고:
  - 14절 스스로 확인 명령(564~710줄 그대로, `python3 -I`, 뿌리 · 단원 1 · k 5): '스스로 확인 걸림 없음', 인물 n=0 · m=0.
  - 검증 명령 `pnpm -s seed:validate --root <사본>/seed --areas talk --json`(Node 24): summary cells 27 · passed 27 · failed 0 · warnings 5, 이 파일의 경고는 `talk-unit-incomplete` 하나(브리프 `:389` 가 예고한 대로).
  - 붙이기 명령(502~515줄 그대로): 고정 한 장 + 새 카드 둘 + 같은 자리의 중복 사본 → '붙임: 카드 3 · 고정 1 · 해시 같음', 중복 사본이 고정 카드로 바뀌고 차례가 (변형, 정규 → 보강, 번호)로 정렬됨. 해시를 다르게 주면 AssertionError 로 멈춤.
  - 1절 설정값 표 명령 · 고정 카드 해시 명령: 돌아감.
- 일치율 실측: `node --experimental-strip-types` 로 `src/core/speech/match-rate.ts` 의 `matchRate` · `bestMatchRate` 를 직접 불러 I-2 의 값을 얻음.
- 정규식 실측: `SELF_LIFE` · `TEACHER_KO` · weekend/day 정규식을 브리프 글 그대로 python 으로 돌림(M-3).
- 보조 스킬(ui-ux-pro-max · design-taste-frontend)은 화면이 없는 글 검토라 적용 항목이 없고 스크립트는 돌리지 않았다.
