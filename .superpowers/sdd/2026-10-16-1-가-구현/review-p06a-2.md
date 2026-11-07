판정: Changes requested — 지난 지적 17(I 5 · M 12) 모두 ADDRESSED, 새 지적 Important 1 · Minor 3(모두 fix 1 이 바꾼 값에서)

# 재검토: P6a 시드 규격 파일 fix 1 (design-reviewer des-p06a · Opus · xhigh, 범위 한정, 읽기 전용, 2026-10-17 04:5x)

대상: 워크트리 `.claude/worktrees/agent-a6ef72438a158a2f3`(커밋 없음)의 `seed/*.json` · `seed/lists/*.json` · `docs/research/2026-10-16-seed-reference-basis.md`(아래 '근거 문서') · `tests/.tmp/p06/` · 보고 `task-p06a-report.md` 'fix 1' 절. 기준: `review-p06a.md` · `task-p06a-fix1.md` · 13절 C67. 파일은 고치지 않았다. 검토자 시험은 스크래치패드 스크립트로 워크트리의 `formsIn` · `forbiddenHits` 와 seed 파일을 읽어 돌렸다.

요지: 지적 열일곱은 모두 고쳐졌고 일회 검사도 모두 재현된다. 막는 것은 하나다 — fix 1 이 새로 넣은 한국어 주소 정규식이, 수와 단위를 띄어 쓰는 표준 꼴('버스로 2 정거장' · '기차로 3 시간')을 주소로 잡는다(N-1). 정규식 한 줄과 시험 문장이면 고쳐지고 묶음 3(7~9단계) 작업과 겹치지 않으므로, 묶음 3 과 함께 가도 된다(컨트롤러 판단).

## 1. 다시 돌린 명령(워크트리)

| 명령 | 결과 |
|---|---|
| `git status --short` · `git diff --stat` | 코드 변화는 biome.json · src/core/seed/reference-index.ts · tests/unit/seed-validator-reading.test.ts 셋뿐(앞 라운드와 같은 3 · 7 · 20줄). 나머지는 untracked seed/ · 근거 문서 · 보고 |
| `pnpm exec tsx tests/.tmp/p06/check_unit_words.ts` | 단원 122 · 단원 단어 3352, RESULT 0 |
| 같은 검사, fix 전 꼴로 되돌린 사본(검토자: time-at 에 o'clock · have writing 4-3 · 쓰기 5-3 에 빈도부사 다섯) | RESULT 9 — 지난 I-1 아홉을 모두 잡는다. 보고의 '사본 5건'은 사본을 덜 되돌린 값으로 보이고, 검사 자체는 바르다 |
| `pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,2,3,4,5,6` | {"1":183,"2":137,"3":139,"4":175,"5":170,"6":161}, RESULT 0 |
| `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 183 줄 모두 '맞음', RESULT 0 |
| `pnpm exec tsx tests/.tmp/p06/check_meanings.ts` | vocab 965 · RESULT 0 |
| `python3 -I tests/.tmp/p06/check_settings.py <메인 specs> seed/settings.json` · `check_level_specs.py` | RESULT 0 · RESULT 0 |
| `pnpm -s seed:validate` | 첫 줄 `… 실패 0 · 빈 칸 4892 · … · 경고 0 · 규격 파일 오류 120`, reference-complete 밖 0, 경고 0 |
| (cd tests/.tmp/p06) `python3 -I check_homophones.py ../../../seed/lists/homophones.json` | 25 안 · 30 안 빠진 낱말 [] (vocab 계획 기준. 지금 vocab 에 없는 13 은 모두 7~12단계 몫) |
| 검토자 1차 정합 스크립트 다시(학습 요소 = 3.6 · 주제 겹침 · 단원 단어 수 · 단계 · 기능어 · 영역마다 = 그 단계 내용어 · 영역 사이 같은 모음 · 단원 단어 × 형태) | 모두 0 |

`check_unit_words.ts` 는 원형 낱말 하나를 `formsIn` 에 넣는다. 대소문자는 `formsIn` 이 낮추고, 원형은 늘 쓸 수 있는 꼴이라 '그 단원에서 그 낱말을 맨몸으로도 못 쓰는' 경우(I-1 꼴)를 잡는 데 알맞다. 문장 안 자리에 기대는 정규식(when-question · 'at + 수')은 낱말 하나로는 걸리지 않지만 그런 형태는 기능어 쪽이라 단원 단어와 부딪치지 않는다.

## 2. 지난 지적 판정

| 지적 | 판정 | 근거 · 재현 |
|---|---|---|
| I-1 자기 단원에서 막히는 단원 단어 9 | ADDRESSED | forms.json 14줄 time-at 낱말 목록 비움(o'clock 뺌), 3줄 have writing 1-1(근거 문서 447 · 486 · 635 · 700줄에 '쓰기 열 검출 안 함' 표시라고 적음 — 규격이 null 을 '늘 범위 밖'으로 읽으므로 맞는 표현, C67 (1)), vocab 638줄 등 빈도부사 다섯이 adverb + function · 5단계, unit-specs 에 다섯 없음. check_unit_words 0, 검토자 맞대기 0 |
| I-2 빠진 75 낱말 | ADDRESSED(새 지적 N-2 · N-4 붙음) | 넣은 37 은 원자료(kice-list.json) 기준 `*` 35 · 파생 easy · onion. 뺀 32 는 vocab 에 없음. 단계마다 내용어 125 · 125 · 125 · 150 · 150 · 150, 1~6 누계 825. 근거 문서 수 표 4~6 줄의 `*` · `**` 수(108 · 14 / 85 · 39 / 113 · 21)가 파일과 같다. 새 예문(warm · bread · tomato · moon · brown …)은 예문 검사 0 |
| I-3 한국어 개인 정보 정규식 | ADDRESSED | forbidden.json 14줄. 걸릴 셋(어디 살아? · 너 어디 살아? · 넌 성이 뭐야?)과 더해 너희 집은 어디야? · 어디에 살아요? · 너는 어디 살아? · 집 주소가 뭐야? 걸림. 안 걸릴 다섯(개구리 · 곰 · 펭귄 · 그 성은 · 왕자는 성에)과 더해 토끼는 어디서 자? · 어디로 갈까? · 너 어디 가? · 넌 어디에 있어? · 어디 살았어? 안 걸림. check_meanings 0 |
| I-4 집 주소 꼴 | ADDRESSED(새 지적 N-1 붙음) | 17 · 18줄. 걸릴 넷과 더해 중앙로 45에 · 강남대로 302 · 세종로 1-2번지 · 10 Maple Road · 7 Oak Avenue 걸림. 안 걸릴 여덟과 더해 오른쪽으로 2번 · 학교로 3번 버스 · 집으로 5시에 · 자전거로 10분 · 1층 3호실 · 3학년 2반 · 101번 버스 · 2동 친구들 · 'We walk 2 blocks down the road.' · 'I see 3 cats on the street.' 등 안 걸림. 수와 단위를 띄어 쓰면 걸린다(N-1). 'The 2 little street dogs are cute.'도 걸리지만 시드는 작은 수를 낱말로 쓰므로 무시해도 된다 |
| I-5 time-at · third-person-s 거짓 양성 | ADDRESSED | 다섯 문장 모두 '없음'. 거짓 음성 확인: 'He plays soccer.' · 'She wants milk.'는 third-person-s(he · she 정규식) · he-she, 'We meet at seven o'clock.' · 'School starts at 9.' · 'I get up at seven.' · 'I eat lunch at noon.' · 'We swim on Mondays.'는 time-at. 새로 놓치는 것은 명사 주어 + 뺀 꼴('My dad plays tennis.' · 'Mom likes cats.')이고 근거 문서 462 · 643줄에 알고 둔 한계로 적혔다(C67 (1)의 대가) |
| M-1 be-not | ADDRESSED | 13줄. It's not a cat. · They're not here. · You're not late. 걸림, No, it's not. 안 걸림 |
| M-2 dont | ADDRESSED | 10줄 `\b(?:i\|you\|we\|they)\s+(?:don't\|do\s+not)\s+[a-z]`. I don't know. · We do not swim. · You don't like milk. · They don't eat meat. 걸림, Don't run. · Do not run in the hall. · Wait! Don't go. · No, I don't. · I don't. 안 걸림. 근거 문서 463 · 641줄 |
| M-3 낱말 검출기 · 까닭 | ADDRESSED(문구 하나 남음 N-4 (나)) | 24~27줄 he-she(2-2 · 2-2) · we-they(3-1 · 3-1) · object-pronouns(5-5 · 6-4) · some-any(6-5 · 6-5). He is tall. · They like cats. · I like him. · I want some juice. 걸림, Something is here. 안 걸림. 120 표 머리말 등 세 곳에 '읽기는 범위 밖 비율, 나머지 영역은 사람 표본' |
| M-4 주제 아홉 | ADDRESSED | 새 주제가 단원 단어를 가리킨다(동물과 탈것 · 우리 동네와 자연 · 내 얼굴과 몸 · 몸으로 할 수 있는 일 · 우리 동네와 탈것 · 동네 나들이 · 교실 물건 묻기 · 방과 교실 · 우리 동네에 있는 것). (영역, 단계) 안 겹침 0. 근거 문서 (3) 표 1~6단계 30행 × 네 영역의 주제가 unit-specs 와 다름 0(학습 요소 열의 괄호 줄임 6칸은 전부터 있던 표기이고 파일 값은 3.6 글자 그대로) |
| M-5 old · many | ADDRESSED | vocab 113줄 old 1단계('~살의, 늙은'), 248줄 head 2단계, 95줄 many 기능어 1단계. 1단계 회화의 나이 · 수 질문이 1단계 범위 안이다(3.3 · C64 (3)) |
| M-6 배정 차례 | ADDRESSED | 쓰기 1-2~1-5 배정 수업마다 패턴 밖 [2,2,1,1,1] · [2,2,1,1,1] · [2,1,1,1,1] · [1,1,1,1,0], 패턴 낱말 101/125 그대로. like 는 읽기 1-4 · 말하기 1-4, name 은 회화 1-1 의 첫 자리 |
| M-7 can-do 둘 | ADDRESSED | level-specs 5줄 읽기 3 '그림 없이' 뺌, 39줄 회화 1 '처음 듣는 질문은 토리가 들려준 두 답에서 골라 말하고 다시 묻는 질문에는 스스로 답하며'(3.3 처음 · 다시 묻는 턴과 맞음), can-do 경고 0 |
| M-8 척도 수준 | ADDRESSED | 근거 문서 206 · 230 · 242줄 'Pre-A1 ~ A1' |
| M-9 활용형 · 뜻 | ADDRESSED(새 낱말 하나 N-3) | east · west · north · south · corn · world forms []. 뜻 셋은 친족 넷(aunt · brother · sister · uncle)만 남음 |
| M-10 근거 문서 3-4 행 | ADDRESSED | 641줄 'lets · w 3-4(C64 (2))' |
| M-11 drunk | ADDRESSED | 근거 문서 736줄, 시험 문장 791줄 |
| M-12 알파벳 26 | ADDRESSED | 근거 문서 107줄 |

## 3. 새 지적(fix 1 이 바꾼 값에서)

**N-1(Important). 새 한국어 주소 정규식이 수와 단위를 띄어 쓴 꼴을 주소로 잡는다.**
- 근거: forbidden.json 17줄 contact-address-ko 의 셋째 갈래 `[가-힣]+(?<!으)(?:대로|로|길)\s?\d{1,4}(?:-\d{1,4})?(?=\s|$|[,.!?)]|번지|에|이야|야)` 는 수 뒤에 공백만 와도 맞는다. 검토자 `forbiddenHits` 결과, 다음이 모두 contact-address-ko 로 걸린다: 버스로 2 정거장 가요 · 택시로 10 분 걸려 · 기차로 3 시간 가 · 지하철로 2 정거장이야 · 오른쪽 길로 2 번 돌아 · 학교까지 버스로 20 분 · 비행기로 2 시간 · 자전거로 5 분이면 돼 · 배로 3 시간 · 차로 1 시간 · 다리로 2 개를 건너 · 빨대로 1 번 마셔(붙여 쓴 '버스로 2정거장'만 안 걸린다). 한글 맞춤법 제43항은 단위 명사를 띄어 쓰는 것이 원칙이고 아라비아 숫자 뒤에서는 붙여 쓸 수도 있다(확인 정도: 기억, 높음). 그래서 띄어 쓴 꼴은 바른 한국어다. contact 범주는 세 곳에 걸린다. 시드의 모든 글 조각(읽기 해설 · 말하기 질문 뜻 · 회화 토리 질문 뜻 · 토리 이야기 뜻), 실시간 출력의 한국어 칸, P9b 의 아이 입력 가림(시드 contact 는 통째로 가린다, review-p09b-2 10줄)이다. 정상 시드는 다시 만들게 되고, 토리의 한국어 설명은 비워지며, 아이가 쓴 '버스로 10 분'은 가려진다. plan-p06a 위험 5 와 같은 꼴이다.
- 권하는 고침: 앞보기를 `(?=\s?(?:번지|에|이야|야)|\s*(?:$|[,.!?)]))` 로 바꾼다 — 수 뒤에 공백이 오면 번지 · 에 · 이야 · 야가 이어질 때만 맞는다. 검토자가 이 꼴로 돌린 결과, 걸릴 여덟(테헤란로 123 이야 · 101동 1203호 · 행복아파트 3동 · 중앙로 45에 · 강남대로 302 · 세종로 1-2번지 · 테헤란로 123, 서울 · 중앙로 45 야)은 그대로 걸리고 안 걸릴 열(위 띄어 쓴 꼴 여섯 · 다리로 2 개 · 기차로 2 시간이야 · 앞으로 3칸 · 도로 위에 차가 많아)은 모두 빠졌다. 띄어 쓴 꼴 셋 이상을 근거 문서 (5) '안 걸림' 시험 문장에 더한다.

**N-2(Minor). 빈자리에 넣은 낱말이 단원 첫 배정 수업에 몰렸다.**
- 근거: 빈도부사 빈자리를 채운 lip · gum · full · heavy · light 가 D5 묶음 맨 앞에 들어가, 그 묶음을 쓰는 네 단원의 첫 배정 수업(k 4)이 lip · gum · full · heavy 가 됐다 — unit-specs 24줄 읽기 5-1 '나의 습관' · 85줄 말하기 5-1 '주말 습관' · 115줄 회화 5-1 '보건실에서'(학습 요소 빈도부사) · 57줄 쓰기 5-3 '가족의 하루'. plan-p06a 단원 규격 words 규칙 '앞 배정 수업일수록 … 그 단원 학습 요소에 필요한 낱말을 먼저, 한 배정 수업의 k 개는 한 수업 글에 함께 쓰기 좋은 낱말로'. 습관 · 보건실 단원의 첫 수업으로는 enjoy · hate · headache · fever 쪽이 맞다. head(2단계)도 형용사 묶음 A3 의 old 자리에 들어가 읽기 2-3 · 회화 2-3 넷째 수업 'strong funny young head', 말하기 2-2 · 쓰기 2-1 둘째 수업 'young head new fast slow'가 됐다(쓰기 2-1 '형용사 + 명사'에는 맞는 편이다).
- 권하는 고침: 다섯을 D5 묶음 뒤쪽으로 옮기고 습관 · 몸 상태 낱말(enjoy · hate · headache · fever · medicine)을 앞으로 둔다. head 는 몸 낱말 묶음(B4 hair · foot · finger …)과 자리를 바꿀 수 있으면 바꾸고, 아니면 그대로 둔다. 낱말 모음은 바뀌지 않으므로 검증 · 맞대기 결과는 그대로다.

**N-3(Minor). 새 낱말 dry 의 비교 꼴이 dryer · dryest 뿐이다.**
- 근거: vocab 848줄 dry forms ['dries', 'dried', 'drying', 'dryer', 'dryest'] — 같은 항목에서 동사 꼴은 y → i 규칙을 따르는데 형용사 꼴은 따르지 않았다. 표준 꼴은 drier · driest 이고 dryer · dryest 는 변이형이다(Merriam-Webster 표제 'drier also dryer', 'driest also dryest', 확인 정도: 기억, 중간). 활용형은 원형 찾기에 쓰이므로, 표준 꼴 'drier'가 든 읽기 지문에서 그 낱말이 범위 밖으로 세어진다.
- 권하는 고침: drier · driest 를 더한다(dryer 는 '건조기' 명사와 겹치므로 빼도 된다).

**N-4(Minor). 근거 문서 문구 둘이 파일 값과 다르다.**
- (가) 근거 문서 154줄과 보고 '남은 우려 1'(장부 ledger-open 36줄)은 "뺀 낱말 32 는 7단계 후보 끝(여분)으로 옮겼다"고 적었다. 그러나 candidates-7.json 순위로 32 가운데 20 은 앞 150 안(44~50위 message · seat · subject · bicycle · guest · noise · ghost, 125~137위 plant · toast · dentist · uniform · wave · oven · dessert · coin · thousand · bush · dust · fog · wonder)이고, 12 만 150 밖(172~192위)이다. 근거 문서 수 표 7단계 줄(`**` 136 · `*` 12 · 목록 밖 2)도 이 20 을 앞 150 에 넣고 센 값이다. 그 대신 원래 7단계 후보 30 이 150 밖(151~171 · 180~188위)에 있고, 이 30 은 8~12단계 후보 어디에도 없다 — deliver · guide · comedy · cart · champion · league · prize · tongue · muscle · lamb · bark · dozen · total · able · bounce · bow · exit · lift · mess · switch · dialogue(`*`) · route · sweep · marathon(`*`) · jaw · throat · pine · ceiling · chew · crawl. 문구를 실제와 맞추고 6절 메모 1 로 넘긴다.
- (나) 근거 문서 'fix 1 검출기' 표 some-any 행의 "something · anything 은 기능어 단계 6 이 맡는다"는 M-3 에서 고친 것과 같은 까닭이다. 기능어 단계(범위 밖 비율)는 읽기 지문에만 걸리므로 '읽기는 범위 밖 비율, 나머지 영역은 사람 표본'으로 맞춘다.

## 4. 다르게 한 것 1~4

| 항목 | 판정 | 근거 |
|---|---|---|
| 1 dont 끝을 `\s+[a-z]` | 받음 | `\b` 이면 'No, I don't.'(2-5 'Do you ~?'의 짧은 답)가 4-2 전에 막힌다. 재현: No, I don't. 안 걸림, I don't know. 걸림. 'No, we don't.'는 we-they(3-1)로만 걸려 3단계부터 열린다 — 3-1 요소대로라 맞다 |
| 2 have writing 1-1 | 받음 | 규격(reference.ts FormEntry 주석)이 null 을 '그 차례에 없음 = 늘 범위 밖'으로 읽어 null 로는 C67 (1)을 표현할 수 없다. 1-1 은 '쓰기에서 늘 열림'과 같고, 근거 문서 네 곳에 표시라고 적었다 |
| 3 guest · guessed 뺌 | 받음(조건) | guest 는 7단계 후보 48위라 묶음 3 에서 들어올 가능성이 크다. 같은 처지인 week · weak · piece · peace 등은 남겨 두었으니, 묶음 3 에서 guest 가 vocab 에 들면 되살린다(6절 메모 2) |
| 4 check_meanings.ts 더함 | 받음 | 뜻 · 예문 965 를 금지어 · 정규식에 맞대는 검사로 I-3 · N-1 꼴의 재발을 막는다. N-1 은 vocab 뜻에 띄어 쓴 '로 + 수 + 단위'가 없어서 이 검사에 안 걸렸다 — 근거 문서 (5) 시험 문장으로 막는다 |

## 5. 알릴 것 1~4

| 항목 | 판정 | 근거 |
|---|---|---|
| 1 4단계 그림 낱말 | 맞음 | 4단계에 넣은 일곱(warm · bread · letter · thing · pilot · easy · difficult) 가운데 그림 낱말은 bread · letter · pilot, 뺀 일곱(plant · toast · message · seat · dentist · uniform · subject) 가운데 그림 낱말은 plant · toast · dentist · uniform · seat. 장부 27줄에 올라 있다 |
| 2 1~2단계 단계 바뀜 | 맞음 | head 2단계 · old 1단계 · many 1단계 기능어(vocab 248 · 113 · 95줄). head 는 여전히 1~2단계 그림 범위 안이다 |
| 3 주소 꼴 | 맞음(N-1 고침 뒤 다시 알림) | 17 · 18줄. 앞보기를 고치면 P9b 쪽에도 같은 범주 값이 바뀐다 |
| 4 빈도부사 검출기 그대로 | 맞음 | frequency-adverbs rst 5-1 · writing 6-3 그대로. 'He never plays golf.' → frequency-adverbs 재현. 단원 단어가 아니므로 쓰기 5단계와 부딪치지 않는다 |

## 6. 지난 4 · 5절 판정과 장부

- 판단 셋 · 약한 곳 둘의 '받음(조건)'은 fix 뒤에도 선다. a · an 단원 셋은 첫 배정 수업에 apple · egg 가 있다(회화 1-1 은 name 다음). 같은 단계 영역 사이 같은 모음 0. 철자 패턴 101/125. 읽기 2-1 낱말은 그대로다. 동음이의어는 32묶음에 조건(약한 곳 2) 그대로.
- 장부(ledger-open.md) 33줄 '활용형 규칙 생성(easts · corns · worlds)': 닫힘(M-9 반영, 새 낱말 dry 는 N-3). 34줄 '7~12 경계': 아직 열림(묶음 3 · 4, N-4 (가) 메모 더함). 35줄 board · bored: 아직 열림(묶음 4 끝). 36줄 '뺀 32 가 7단계 후보 끝에 있어 …': 아직 열림, 전제가 다르다(20 은 앞 150 안, N-4 (가)). 13줄 opus-4-8 'none': 아직 열림(P9 몫). 18줄 contact 추가 꼴(괄호 지역 번호 · 국가 번호 · 말소리 숫자): fix 1 범위 밖이라 그대로 열림 — 재현: (02)123-4567 · +82 10-1234-5678 · '0 1 0 1 2 3 …' · 'zero one zero …' 모두 안 걸림.

## 7. 묶음 3 · 4 에 넘길 메모(지난 6절에 더하는 것)

1. 7단계 150 선정: 옮겨 온 20(N-4 (가))이 앞 150 안에 있고, 원래 후보 30 은 150 밖이며 8~12단계 후보에도 없다. 앞 150 을 그대로 자르면 이 30(able · total · prize · guide · exit · dialogue · marathon …)이 I-2 처럼 앱 어휘에서 통째로 빠진다. 묶음 3 은 150 밖 낱말을 8단계로 넘기거나 맞바꾸고, 빠지는 낱말 수를 근거 문서에 적는다.
2. 동음이의어 guest · guessed: guest 가 7단계 vocab 에 들면 되살린다.
3. 거짓 음성 목록(사람 표본 몫): 명사 주어 + plays · likes · looks · helps · needs · wants · lives(3인칭 단수), 명사 주어 + don't, 명사 주어 문장의 2-2 · 3-1 형태. 'Let us go.'는 lets(3-4)와 object-pronouns(5-5)가 함께 잡아 5-5 전에는 막힌다(근거 문서 484줄, 5-5 앞 글은 Let's).
4. contact-address-ko 의 뒤보기 `(?<!으)`: 시드 정규식은 서버(Node)에서 `new RegExp(…, "iu")` 로만 컴파일되므로 지금은 문제없다. 브라우저에서 같은 목록을 컴파일할 일이 생기면 뒤보기를 받지 않는 iPadOS Safari(16.4 전, 확인 정도: 기억, 중간)에서 SyntaxError 가 난다 — 그때는 '으로' 를 다른 갈래로 빼는 꼴로 바꾼다(plan-p04a 265줄 · plan-p09b 값 표의 '뒤보기 안 씀'과 같은 까닭).
