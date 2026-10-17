판정: Changes requested — N-1~N-4 모두 ADDRESSED, 새 지적 Important 1 · Minor 4(묶음 3 · 4 와 맞바꿈 16 에서)

# 2차 검토: P6a 시드 규격 파일 — fix 2 · 묶음 3(7~9) · 묶음 4(10~12) · 맞바꿈 16 · 1~12 전체 정합 (design-reviewer des-p06a · Opus · xhigh, 읽기 전용, 2026-10-17 15:xx)

대상: 워크트리 `.claude/worktrees/agent-a6ef72438a158a2f3`(feature/1a-p06a-seed-reference, 바탕 6bd6015, 커밋 없음)의 seed 파일 · 근거 문서 `docs/research/2026-10-16-seed-reference-basis.md`(아래 '근거 문서') · `tests/.tmp/p06/` · 보고 `task-p06a-report.md` 의 'fix 2' · '묶음 3' · '묶음 4' 절. 기준: review-p06a-2 · task-p06a-fix2-batch3 · 13절 C64 · C66 · C67 · 정본 3.3 · 3.6. 파일은 고치지 않았다. 검토자 시험은 스크래치패드 tsx · python 으로 워크트리의 `formsIn` · `forbiddenHits` 와 seed 파일을 읽어 돌렸다.

요지: 수 · 정합은 모두 맞는다 — 검증기 종료 0(규격 오류 0 · 경고 0), 예문 1,920 · 맞대기 6,952 · 뜻 1,920 · 시험 문장 407 이 모두 0 이다. 1~12단계 단원 242 의 학습 요소는 3.6 글자 그대로이고, 누계는 375 · 825 · 1,275 · 1,725 이며, 초등 권장 800 가운데 앱 어휘 밖은 일부러 뺀 8 뿐이다. 막는 것은 하나다. 묶음 3 의 새 검출기(to 부정사 · 비교급 · 최상급)가 1~8단계의 정형 표현 'Nice to meet you.' · 'my best friend' · 'my older sister' · 'Feel better soon!'을 범위 밖 형태로 잡는다(R-1).

## 1. 다시 돌린 명령(워크트리)

| 명령 | 결과 |
|---|---|
| `git status --short` · `git diff --stat` | 코드 변화는 biome.json · reference-index.ts · seed-validator-reading.test.ts 셋(3 · 7 · 20줄, 앞 라운드와 같음) |
| `pnpm -s seed:validate` | 종료 0, 첫 줄 `seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 0`, `--json` errors 0 · warnings 0 |
| `pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,…,12` | 183 · 137 · 139 · 175 · 170 · 161 · 165 · 163 · 159 · 155 · 159 · 154(1,920), RESULT 0 |
| `check_lists.ts` · `check_unit_words.ts` · `check_meanings.ts` | 407 줄 RESULT 0 · 단원 242 · 단원 단어 6,952 RESULT 0 · vocab 1,920 RESULT 0 |
| `python3 -I tests/.tmp/p06/check_settings.py <메인 specs> seed/settings.json` | RESULT 0 |
| `python3 -I tests/.tmp/p06/check_level_specs.py <메인 specs> seed/level-specs.json` | 다름 없음 · RESULT 0 |
| (cd tests/.tmp/p06) `python3 -I check_homophones.py ../../../seed/lists/homophones.json` | 묶음 48 · vocab 에 없는 낱말 [] · RESULT 0 |
| `python3 -I tests/.tmp/p06/build_bundle.py . <메인 specs>` | 문제 0 |
| `pnpm -s lint` · `pnpm -s test` · `pnpm -s check:deps` · `pnpm -s spec:trace` | 0 · 160 passed · 위반 0 · missing-test 58(plan-p06a 기대값과 같음). `pnpm build` 는 돌리지 않았다 |
| 검토자 정합 스크립트(학습 요소 = 3.6 · 단원 단어 수 · 단계 · 기능어 없음 · 영역마다 = 그 단계 내용어 · 영역 사이 같은 모음 · 주제 겹침, 1~12) | 모두 0 |

## 2. 지난 지적(review-p06a-2) 판정

| 지적 | 판정 | 근거 · 재현 |
|---|---|---|
| N-1 띄어 쓴 '로 + 수 + 단위'를 주소로 잡음 | ADDRESSED | forbidden.json 17줄 앞보기 `(?=\s?(?:번지\|에\|이야\|야)\|\s*(?:$\|[,.!?)]))`. 띄어 쓴 꼴 열다섯(버스로 2 정거장 가요 · 택시로 10 분 걸려 · 다리로 2 개를 건너 · 빨대로 1 번 마셔 · 기차로 2 시간이야 등) 안 걸림, 주소 아홉(테헤란로 123 이야 · 101동 1203호 · 행복아파트 3동 · 중앙로 45에 · 강남대로 302 · 세종로 1-2번지 · 테헤란로 123, 서울 · 중앙로 45 야 · 25 Green Street) 걸림. 장부 18줄 몫인 contact-phone 갈래 둘도 재현: (02)123-4567 · (031) 123-4567 · +82 10-1234-5678 · +82-2-123-4567 걸림, '(2) 3 + 4 = 7' · 'Call me at 3.' · '+3 points for you!' · 'Page (12) 34 5678?' · 'Call 119!' 등 열둘 안 걸림 |
| N-2 빈자리 낱말 자리 | ADDRESSED | 읽기 · 말하기 · 회화 5-1 과 쓰기 5-3 의 첫 배정 수업이 enjoy · hate · headache · fever 다. lip · gum · full · heavy · light 는 11~17번째로 옮겼다. head 는 B4 몸 묶음(읽기 2-5 · 쓰기 2-4 · 말하기 2-4 · 회화 2-2), jeans 는 A3 |
| N-3 dry 비교 꼴 | ADDRESSED | vocab dry forms = dries · dried · drying · drier · driest |
| N-4 (가) 7단계 후보 순위 | ADDRESSED(문구의 수 하나 남음 R-5) | candidates-7 에서 원래 30 은 131~158위(lift · mess · switch 는 8단계 앞으로), fix 1 의 32 는 159~206위 여분이라 7단계 vocab 에 없다. 7~12단계 모두 vocab 내용어 = 후보 앞 150 이고, 당김(pulledFrom) · 넘김(pushedFrom) 표시가 보고 표와 같다 |
| N-4 (나) some-any 까닭 | ADDRESSED | 근거 문서 677줄 '읽기는 범위 밖 비율, 나머지 영역은 사람 표본' |

## 3. 새 지적

**R-1(Important). 묶음 3 의 검출기가 1~8단계의 정형 표현을 범위 밖 형태로 잡는다.**
- 근거: 검토자 `formsIn` 결과(괄호는 rst 도입 자리)다.
  - to-infinitive(9-2): Nice to meet you. · Nice to meet you, Tori! · Glad to meet you. · Nice to see you again. · I'm happy to see you. · Good to see you.
  - superlative(7-5): She is my best friend. · He is my best friend.
  - comparative(7-5): My older brother is tall. · My younger sister is cute. · How old is your older sister? · Feel better soon! · I feel better now.
- 이 꼴이 쓰이는 곳은 이렇다. 정본 3.3 은 인사 토막을 모든 단계에 두고('토리가 인사하고 안부를 묻는다'), 회화 1-1 주제는 '토리와 첫 만남'이다. 가족 · 친구 단원(읽기 2-2 '우리 가족' · 회화 2-2 '가족사진' · 말하기 2-2 '내 친구 소개' · 쓰기 6-4 '내 가족 소개')에서는 형 · 누나 · 언니 · 오빠를 영어로 말하려면 older brother · sister 가 필요하다. 회화 5-1 '보건실에서'에는 feel better 가 필요하다. 6.4 는 카드의 첫 말 · 예상 흐름 · 힌트 · 답 예시 · 끝인사와 실시간 힌트 · 답 예시를 형태 표로 검사하므로, 이 꼴이 든 시드는 다시 만들어지고 AI 힌트는 카드 것으로 바뀐다.
- plan-p06a forms 규칙은 '흔한 낱말을 막지 않는다'이고 위험 3 이 이 경우다. C64 (3) · C67 (1)은 3.3 이 앞서 요구하는 꼴을 검출하지 않는다고 정했다. 근거 문서 747줄 '관용구 거짓 양성'에는 'Do your best · Will(이름)'만 있고 '시드 글은 피한다'고 적었지만, 첫 만남의 'Nice to meet you'와 가족 단원의 'older sister'는 피하기 어렵다.
- 권하는 고침: 정형 표현을 정규식 예외로 뺀다(앞보기는 ES2017 에서 쓸 수 있다).
  - to-infinitive: `(?:nice|glad|good|happy|pleased)\s+to\s+(?:meet|see)\s+you` 를 빼는 갈래를 둔다.
  - comparative · superlative: older · younger · better · best 를 낱말 목록에서 정규식으로 옮기고 `\b(?:older|younger)\b(?!\s+(?:brothers?|sisters?|cousins?)\b)` · `\bbest\b(?!\s+friends?\b)` 꼴로 쓴다. feel · get better 도 같은 식으로 뺀다.
  - 위 문장들을 근거 문서 (4) '안 맞아야 할 문장'에 더하고, 'She is taller than me.' · 'It is the best day.' · 'I went there to buy milk.'가 계속 걸리는지 함께 본다.
  - 같은 꼴인 기존 검출기 하나는 이번 범위 밖 관찰로 적는다. 'Have a nice day!'가 have(2-3)로 잡혀 1단계 끝인사에 쓰지 못한다. 같은 고침에서 다룰지는 컨트롤러가 정한다.

**R-2(Minor). 7~12단계 단원 가운데 주제 이름과 단원 단어가 크게 어긋난 곳이 있다(M-4 꼴).**
- 근거: plan-p06a 단원 규격 topic '학습 요소와 어울리게', 6.3 '단원 주제는 그대로 두고 … 묶음에 맞춘다'(주제는 생성 입력이다). unit-specs.json 줄과 단원 단어 앞쪽은 이렇다.
  - 112 쓰기 10-3 '반려동물 기르기': however · recent · necessary · enormous · express · prevent · attract · attack · burst … punish · arrest — 동물 낱말이 하나도 없다.
  - 113 쓰기 10-4 '급식 메뉴 제안': waste · reduce · service · fee · charge · energy · pollute · climate … — 환경 · 돈 낱말이다.
  - 100 쓰기 8-1 '다가올 방학': mission · search · clue … thief · scream · rob · soldier · army · shoot.
  - 102 쓰기 8-3 '우리 반 최고 기록': choice · possible · title · prefer · screen · tip · advice · suggest ….
  - 224 회화 8-5 '감기 걸린 친구': pain · sore · hurt · injure · wound · accident · ambulance · crash — 감기가 아니라 다침이다.
  - 168 말하기 9-4 '시간이 있으면': experiment · record · result · report · chart · graph · code · metal.
  - 169 말하기 9-5 '학교 가기 전후': complete · gather · form · main · interest · level · especially · single.
  - 227 회화 9-3 '경험 나누기': spread · mix · pour · stir · boil · fry · wrap · fold — 요리 낱말이다.
  - 229 회화 9-5 '주말 일과': furniture · carpet · item · pile · load · rent · handle · chain.
- 고치는 법: 낱말은 옮기지 않고 주제 이름만 단원 단어에 맞게 바꾼다. 예: 쓰기 10-3 '규칙과 벌', 쓰기 10-4 '환경을 지키는 제안', 쓰기 8-1 '탐정 놀이 계획', 쓰기 8-3 '친구에게 주는 조언', 회화 8-5 '다친 친구 돕기', 말하기 9-4 '과학 실험을 한다면', 말하기 9-5 '학교 가는 길', 회화 9-3 '요리해 본 경험', 회화 9-5 '방 정리하는 날'. 바꾼 뒤 같은 (영역, 단계) 안 주제 겹침 0 과 근거 문서 (3) 주제 표 = unit-specs 다름 0 을 다시 본다.

**R-3(Minor). 형태 검출기의 활용형 목록이 vocab 의 활용형과 다른 데서 뽑혔다.**
- 근거: present-progressive · past-progressive · gerund 정규식에 vocab 의 panicking 대신 틀린 꼴 panicing 이 들었다. past-regular · present-perfect · passive 에는 panicked 대신 paniced, upset 대신 upsetted 가 들었다. vocab 의 panic(8단계)은 forms panics · panicked · panicking 으로 바르다. 그래서 'She was panicking.' · 'Everyone is panicking.' · 'He panicked.' · 'They have panicked before.'를 놓친다(검토자 `formsIn`). past-regular 낱말 목록에는 vocab 의 lied · sewed 도 없다. panic 은 쓰기 8-4 · 회화 8-5 의 단원 단어다.
- 고치는 법: 검출기 낱말 목록(-ing · -ed · 과거분사)을 생성 규칙이 아니라 vocab 의 forms 칸에서 다시 뽑는다(형용사로 뺀 bored · tired · worried 같은 제외 목록은 그대로 둔다). 그 뒤 check_lists · check_examples · check_unit_words 를 다시 돌린다.

**R-4(Minor). 아이 눈높이 표본에서 고칠 만한 뜻 · 예문 셋.**
- 근거: vocab 1003줄 church 'My family goes to church on Sunday.', 1408줄 pray 'We pray before dinner.'는 특정 신앙 생활을 아이 자신의 일로 전제한다(브리프 6 '민감 주제'). 868줄 guy 뜻 '녀석, 사람'의 '녀석'은 낮춤말이라 단어장에 그대로 보인다. 나머지 표본(7~12단계 단계마다 14항목 · 민감 낱말 50여 예문)은 아이 눈높이이고 금지어 · 민감 내용이 없다. war · battle · enemy · crime · death 같은 낱말도 12단계 역사 · 생활 예문에 머문다.
- 고치는 법: 'The church is next to the park.' · 'Some people pray before meals.'처럼 사실을 말하는 문장으로, guy 뜻은 '사람, 남자'로 바꾼다. 받을지는 컨트롤러가 정한다.

**R-5(Minor). 근거 문서 154줄의 순위 수가 묶음 3 · 4 뒤 값과 다르다.**
- 근거: 154줄 'fix 1 의 32 는 7단계 후보의 여분(원래 후보 160 뒤, 161~192위)'. 지금 candidates-7 에서 그 32 는 159~206위이고, 묶음 4 맞바꿈의 16(166~202위)과 섞여 있다. lift · mess · switch 가 8단계로 넘어가면서 순위가 당겨졌기 때문이다. 내용(32 가 앞 150 밖 여분)은 맞다.
- 고치는 법: '7단계 후보 151위 이후 여분(묶음 4 의 맞바꿈 16 과 함께)'처럼 순위 수를 빼고 적는다.

## 4. 다르게 한 것 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| 가정법 검출기에서 would you · would like · would rather 뺌(묶음 4 다르게 한 것 3) | 받음 | 재현: 'Would you help me?' · 'I would rather stay home.' 없음, 'Would you like some cake?'는 some-any 만, 'If I were a bird, I would fly.' · 'That would be fun.' · 'I would go if I had time.'은 second-conditional. 공손한 부탁(5-2 would like 계열)을 11-2 전에 막지 않는다는 뜻에 맞고, 가정법의 핵심 꼴(if … were · 평서문 would)은 잡는다 |
| 주제 셋(읽기 12-1 · 쓰기 12-1 · 쓰기 11-4) | 받음 | 읽기 12-1 '학교에 휴대폰을 가져와도 될까'는 단원 단어 opinion · argue · debate · claim · reason · evidence 와 맞고 초등 고학년~중학 눈높이다. 쓰기 12-1 '대기 오염과 건강'은 원인 · 결과 낱말(effect · source · factor · physical …)과 맞는다(dust 가 vocab 밖이라 바꾼 까닭도 맞다). 쓰기 11-4 '새로운 일에 도전하면'은 risk · attempt · struggle · hesitate · doubt 와 잘 맞는다. 묶음 3 의 주제 셋(회화 7-4 '학교 축제 준비' · 쓰기 7-4 '숙제하는 순서' · 읽기 9-5 '요리하는 순서')도 단원 단어와 맞다 |
| 초등 권장 맞바꿈 16(4단계 9 · 5단계 4 · 6단계 3) | 받음 | 넣은 16 은 원자료로 모두 `*`(math 는 mathematics 의 대표형). 뺀 16 은 vocab · 예문(활용형 포함) · 단원 단어 · 동음이의어 · 형태 낱말 목록 어디에도 없고 7단계 후보 166~202위 여분에 있다. 단계마다 내용어 125 · 125 · 125 · 150 × 9, 누계 375 · 825 · 1,275 · 1,725(C66). 7~12단계 당김 · 넘김 표시는 바뀌지 않았다. 5 · 6단계는 같은 주제 묶음에 맞게 들어갔다(check 는 D3 계산서, score 는 D7 경기, gentleman · lady 는 D8 사람, mad 는 E4 감정). 4단계 C7 놀이 묶음의 touch · ice · point · tail · tape 는 주제와 덜 맞지만 수업마다 1~2 개로 흩어져 있어 받는다 |
| finally 를 8단계에서 당김 · 밀린 원래 150 안 낱말을 다음 단계로(묶음 3) | 받음 | 3.6 쓰기 7-4 '순서 말' 낱말이고, 밀린 낱말이 여분으로 떨어지지 않게 한 규칙이라 I-2 · N-4 의 뜻에 맞다 |
| conclusion 을 목록 밖에서 당김 · 'however x' · 'discover x' 거름(묶음 4) | 받음 | conclusion 은 3.6 rst 12-5 · 쓰기 10-4 · 12-4 낱말이고 12단계 목록 밖 1(0.7%)이다. vocab · 후보 10~12 에 ' x' 꼴 낱말이 없다 |

## 5. 알릴 것 · 장부 판정

- 4단계 그림 낱말(P6b 작업 3 입력): 맞음. 들어온 그림 낱말 kitchen · tape · tail · ice · mail · skin, 빠진 그림 낱말 pool · picnic · firefighter · diary. 다만 touch · point 는 C65 범위의 동작어(구체 명사 · 동작어)라, '그림 문제로 내기 어렵다'로 미리 빼지 말고 P6b 가 그림 여부를 판정한다. 장부 27줄의 '초등 권장 15'는 math 를 더한 16 으로 고쳐 적는다.
- 동음이의어 48묶음: 맞음(브리프 5 의 '47'은 48 이 맞다). 새로 든 16(be · bee · bear · bare · flour · flower · scene · seen · sight · site · do · due · mail · male · hi · high · i · eye · way · weigh · hire · higher · some · sum · threw · through · rose · rows · warn · worn · presence · presents)은 en-US 에서 소리가 같고 모두 vocab 안이다. pear · pair 는 남아 있다(브리프 3 의 '뺌'이 아니라 '그대로'가 파일 값).

| 장부(ledger-open.md) | 판정 | 근거 |
|---|---|---|
| 14줄 opus-4-8 `thinkingDefault` 'none' | 아직 열림 | model-prices 여섯 행 모두 adaptive 그대로(P9a 합친 뒤 P6 몫) |
| 19줄 말소리 숫자 꼴 | 닫힘 | 근거 문서 1206줄에 넣지 않는 까닭과 사람 표본 몫으로 적혔다 |
| 25줄 '한국어 뜻이 있으면 안 되는 단계' 규칙 | 아직 열림 | P6a 규격 파일 몫이 아니라 시드 검사(P4) 몫 |
| 47줄 7~12 후보 경계 | 닫힘 | 컨트롤러 판정(후보 순위 그대로)대로 7~12 를 정했고 근거 문서 CEFR-J 표 1~12 에 남은 수를 적었다. 지문 난도는 P8 표본에서 본다 |
| 48줄 board · bored | 닫힘 | bore(9단계)의 활용형 bored 로 vocab 에 들어 동음이의어 검사 0 |
| 49줄 he-she · we-they 명사 주어 · 빠지는 낱말 · pole · pipe · port | 닫힘 | 명사 주어 놓침은 근거 문서 '알고 둔 한계' 표(732~752줄)에 있다. 빠지는 낱말은 누계 242 표(278줄~)이고 검토자 재현도 같다(후보 파일 232 + 12단계에서 밀린 10). 초등 권장 밖은 일부러 뺀 8(alright · god · kill · thirst · twenty-first · twenty-second · twenty-third · wine)뿐이다. pole · pipe · port 는 10단계 vocab 이다 |

## 6. 묶음 뒤(P8 · P6b)에 넘길 메모(지난 6절에 더하는 것)

1. 거짓 음성 둘(사람 표본 몫, 근거 문서 '알고 둔 한계'에 더함): most + 두 음절 형용사('the most famous singer'는 superlative 를 놓친다 — 정규식이 두 음절 넘는 형용사만 본다), vocab 밖 -ly 부사('sings beautifully').
2. R-1 을 고치면 같은 꼴(예외 정규식)을 1~3단계 회화 카드 표본(P8)에서 'Nice to meet you' · 'my older sister'로 한 번 더 본다.
3. 12단계에서 밀린 10(commerce · contract · employ · manufacture …)은 다음 단계가 없어 앱 어휘 밖이다(보고 남은 우려 2). P8 표본에서 12단계 지문이 이 낱말을 자주 원하면 13절 한 줄로 12단계 안 맞바꿈을 정한다.
