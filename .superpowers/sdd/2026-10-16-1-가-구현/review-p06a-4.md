판정: Approved — R-1(Important) · R-2~R-5(Minor) 모두 ADDRESSED, 새 지적 Minor 3(fix 3 이 넓힌 예외에서, 고치는 법 아래), Critical · Important 0

# 재검토: P6a 시드 규격 파일 fix 3 (design-reviewer des-p06a · Opus · xhigh, 범위 한정, 읽기 전용, 2026-10-17 18:4x) — fix 라운드 3(상한) 뒤

대상: 워크트리 `.claude/worktrees/agent-a6ef72438a158a2f3`(feature/1a-p06a-seed-reference, 커밋 없음)의 seed 파일 · 근거 문서 `docs/research/2026-10-16-seed-reference-basis.md`(아래 '근거 문서') · `tests/.tmp/p06/` · 보고 `task-p06a-report.md` 'fix 3' 절. 기준: review-p06a-3 · task-p06a-fix3 · 13절 C64 (3) · C67 (1) · 정본 3.3 · 3.6 · 6.4. 파일은 고치지 않았다. 검토자 시험은 스크래치패드 tsx 로 워크트리의 `formsIn` 과 seed 파일을 읽어 돌렸다.

요지: R-1 의 네 묶음은 좁은 구 단위 예외가 됐다. 진짜 to 부정사 · 비교급 · 최상급은 검토자가 넣은 31 문장에서 하나도 새지 않는다. 주제 아홉 · 활용형 목록 · 뜻 · 예문 아홉 · 154줄도 고쳐졌다. 남은 것은 훑기에서 넓힌 예외 셋이 정본 근거보다 조금 넓다는 것뿐이다(N-1~N-3, Minor). 컨트롤러가 고치거나 그대로 받아도 커밋을 막지 않는다.

## 1. 다시 돌린 명령(워크트리)

| 명령 | 결과 |
|---|---|
| `git status --short` · `git diff --stat` | 코드 변화는 biome.json · reference-index.ts · seed-validator-reading.test.ts 셋(3 · 7 · 20줄, 앞 라운드와 같음) |
| `pnpm -s seed:validate` | 종료 0, 첫 줄 `seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 0`, `--json` errors 0 · warnings 0 |
| `check_examples.ts 1,…,12` | 1,920(183 · 137 · 139 · 175 · 170 · 161 · 165 · 163 · 159 · 155 · 159 · 154), RESULT 0 |
| `check_lists.ts` | 450 줄 모두 '맞음', RESULT 0(R-1 예외 쪽 · 진짜 형태 쪽 · R-3 여덟 문장 포함) |
| `check_unit_words.ts` · `check_meanings.ts` | 단원 242 · 단원 단어 6,952 RESULT 0 · vocab 1,920 RESULT 0 |
| `scan_phrases.ts` | 문장 79 · RESULT 0(각 문장을 그 꼴이 필요한 가장 이른 영역 · 단계 · 단원에서 돌림) |
| python 셋(`check_settings.py` · `check_level_specs.py` · `check_homophones.py`) | RESULT 0 · RESULT 0 · RESULT 0 |
| `build_bundle.py . <메인 specs>` | 문제 0 |
| `pnpm -s lint` · `pnpm -s test` | 0 · 160 passed |

## 2. 지난 지적(review-p06a-3) 판정

| 지적 | 판정 | 근거 · 재현 |
|---|---|---|
| R-1(Important) 정형 표현 거짓 양성 | ADDRESSED | forms.json to-infinitive 는 nice · glad · good · happy · pleased · sorry + to meet · see · hear 와 time to 를 뒤보기로 빼고, 다른 'happy to + 동사' 는 둘째 갈래로 잡는다. comparative 는 older · younger 를 정규식으로 옮겨 brother(s) · sister(s) · cousin(s) 앞만 빼고, better 는 feel · get 꼴 뒤만 뺀다. superlative 는 best 를 friend(s) 앞만 뺀다. 검토자 재현 결과는 아래와 같다. 예외 19 문장(Nice to meet you. · Glad to meet you, Tori! · Nice to see you again. · I'm happy to see you. · I'm sorry to hear that. · It's time to go home. · My older brother is tall. · My younger sister is cute. · She is my best friend. · Feel better soon! · I feel better now. · Have a nice day! · Have fun! · Let's learn some new words! · Nice! Now let's talk about colors. · That's fun! Let's keep talking. · Can you say it again? · Would you like some juice? · Do you want to talk more?)은 모두 해당 형태 없음. 진짜 형태 31 문장(I want to learn English. → want-to, She is taller than me. → comparative, It is the biggest city. · He is the best player. · You are the best! → superlative, It is important to study. · I need to go. · I like to swim. · I know how to swim. · I went there to buy milk. · I am happy to help you. · It is nice to swim in the sea. · It is good to eat vegetables. → to-infinitive, This one is better. · My brother is older than me. · She looks younger than her mom. → comparative, Let's play soccer. → lets, I want some juice. · I'd like some tea. → some-any, I have fun. · I have a nice day. · Have you seen it? → have, I like swimming. · Reading is fun. · Stop talking, please. · I enjoy reading. → gerund 등)은 모두 그 단계 전에 잡힌다. 9-2 앞 to 꼴 표(want to rst 5-2 · 쓰기 4-3, would like to 5-2, be going to 7-3 · 쓰기 8-1, have to 8-4, used to 12-3)는 forms.json 의 want-to · would-like · going-to · have-to · used-to 도입 자리와 3.6 두 열(C64 (2) 채움 포함)에 맞다. like to · need to · how to 는 9-2 로 잡힌다 |
| R-2(Minor) 주제 이름 아홉 | ADDRESSED | unit-specs topic 만 바뀌었다. 쓰기 8-1 '탐정 놀이 계획'(mission · search · clue …) · 8-3 '가장 좋은 선택'(choice · possible · prefer, 최상급) · 회화 8-5 '다친 친구 돕기'(pain · sore · hurt · injure) · 말하기 9-4 '과학 실험을 한다면'(experiment · record · result) · 9-5 '학교 가는 길' · 회화 9-3 '요리해 본 경험'(spread · mix · pour · stir) · 9-5 '방 정리하는 날'(furniture · carpet · item) · 쓰기 10-3 '규칙과 벌' · 10-4 '환경을 지키는 제안'(waste · reduce · energy · pollute). (영역, 단계) 안 주제 겹침 0, 근거 문서 (3) 표 60행 × 네 영역 주제 다름 0, 학습 요소 칸도 3.6 글자 그대로(다름 0). 아이 눈높이 이름이다 |
| R-3(Minor) 활용형 목록 | ADDRESSED | progressive · gerund 의 -ing 와 past-regular · present-perfect · passive 의 -ed · 과거분사가 vocab forms 와 같다. 빠진 것은 형용사로 일부러 뺀 꼴(bored · tired · worried · interested · closed …)과 불규칙 과거 쪽에서 맡는 fed · led 뿐이다. vocab 에 없는 꼴(panicing · paniced · upsetted)은 0. 더한 여덟(She was panicking. · Everyone is panicking. · He panicked. · They have panicked before. · He lied to me. · My grandmother sewed a doll. · She sews well. · They are lying on the grass.)이 기대대로 잡힌다 |
| R-4(Minor) 아이 눈높이 | ADDRESSED | church 'The church is next to the park.' · pray 'Some people pray before dinner.' · guy '사람, 남자' · fellow '친구, 사람' · afford · fund · income · adopt('받아들이다, 입양하다', 'Our class adopted a new plan.') · parent('Parents love their children.') 모두 사실 서술 · 중립 뜻이다. 예문 · 뜻 검사 0(단계 · 형태 · 금지어). 5~12단계 민감 낱말 예문 50여(돈 · 가족 · 몸 · 사고 · 군대 · 범죄 · 신앙 낱말)를 다시 훑었고 같은 꼴(아이 집 형편 · 신앙 · 가족 형태 전제)은 더 없다 |
| R-5(Minor) 154줄 | ADDRESSED | '7단계 후보 151위 이후 여분(묶음 4 의 맞바꿈 16 과 함께)으로 옮겼다(fix 3 R-5: 순위 수는 묶음마다 바뀌어 적지 않는다)' |

## 3. 새 지적(fix 3 이 넓힌 예외에서, 모두 Minor — 컨트롤러가 고치는 법)

**N-1. Let's 예외의 낱말 열둘 가운데 아홉은 정본에 근거가 없어, 3-4 'Let's' 요소가 1~3단계에서 그대로 풀린다.**
- 근거: forms.json lets `\blet's\b(?!\s+(?:learn|talk|keep|start|begin|try|read|listen|say|look|review|practice)\b)`. 정본 영어 예는 learn · talk · keep 셋뿐이다(02-2 90줄 'Let's learn some new words!' · 123 · 131줄 'Now let's talk about colors.' · 06 108줄 'Let's keep talking.'). 검토자 재현에서 'Let's read a book.' · 'Let's look at the cat.' · 'Let's try again.' · 'Let's start the game.' · 'Let's practice English.'가 1~3단계 어느 단원에서도 걸리지 않는다. 그런데 이들은 3.6 rst 3-4 '명령문 · Let's'의 바로 그 꼴이다. practice 는 묶음 4 맞바꿈으로 vocab 밖이 된 낱말이기도 하다.
- 고치는 법: 예외를 `(?!\s+(?:learn|talk|keep)\b)` 로 줄인다. 카드에 'Let's start!'처럼 꼭 쓸 수업 진행 말이 있으면 그 구만 더한다(예: `start\s*!`). 시험 문장에 'Let's read a book.' → lets 를 더한다. 토리의 실시간 반응 글은 형태 표 검사 밖이라(6.4 끝 문단이 형태 표로 보는 것은 영어 문장 힌트 · 영어 틀 · 답 예시뿐이다) 줄여도 수업 진행 말에는 영향이 없다.

**N-2. to 부정사 예외가 뒤의 you · that 을 보지 않아, 가주어 to 부정사가 새어 나간다.**
- 근거: 첫째 갈래의 뒤보기 `(?<!\b(?:nice|glad|good|happy|pleased|sorry)\s)` 는 to meet · see · hear 뒤를 보지 않는다. 그래서 'It is good to see the stars at night.'가 걸리지 않는다. 이 꼴은 가주어 it … to 부정사, 곧 9-2 '명사' 용법이다. 인사 꼴(Nice to meet you · Good to see you · sorry to hear that)만 빼려던 뜻보다 넓다. 같은 까닭으로 'get better grades'도 비교급 예외(get 꼴 + better)로 빠진다. 다만 'than' 갈래가 비교 문장 대부분을 잡으므로 영향은 작다.
- 고치는 법: 둘째 갈래에 `\b(?:nice|glad|good|happy|pleased)\s+to\s+(?:meet|see)\s+(?!you\b)` 와 `\bsorry\s+to\s+hear\s+(?!(?:that|about)\b)` 를 더해 잡는다. 시험 문장 'It is good to see the stars.' → to-infinitive 와 'Nice to see you again.' → 없음을 함께 둔다. better 쪽은 그대로 두어도 된다(알고 둔 한계 표에 'get better + 명사' 한 줄).

**N-3. gerund 에서 keep 을 통째로 빼, 'Keep trying!' · 'He kept running.'을 놓친다.**
- 근거: 보고 · 근거 문서 'gerund(9-1) keep + -ing 를 동사 목록에서 뺌'. 정본이 요구하는 꼴은 'Let's keep talking.' 하나다(06 108줄). 검토자 재현에서 'Keep trying!'은 형태 없음이고, 'He kept running.'은 he-she · past-irregular 만 잡힌다.
- 고치는 법: 트리거 목록에 keep · keeps · kept · keeping 을 되돌리고 `(?!talking\b)` 로 keep talking 만 뺀다. 아니면 근거 문서 '알고 둔 한계' 표에 'keep + -ing(9-1)'를 한 줄 더하고 그대로 둔다. 둘 다 Minor 다.

## 4. 다르게 한 것 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| 1 훑기 예외를 네 묶음 밖으로 넓힘 | 대부분 받음(N-1 · N-3 은 좁히기 권함) | have(문장 첫 Have a nice · good · great + day · time · weekend · trip · night, Have fun — 3.3 정리 토막 끝인사), can(Can you say it · that again), some-any(some new words — 02-2 90줄 · Would you like some — 5-2 would like), want-to(want to talk more — 02-2 131 · 137줄), sorry to hear, time to(9-2 의 명사 · 목적 용법이 아닌 형용사 용법이라는 근거 문서 풀이가 3.6 9-2 글자와 맞다)는 구 단위로 좁고, 진짜 형태는 계속 잡힌다(I have a nice day. · Have you seen it? · Can you swim? · Do you want some cake? · Do you want to come?). Let's 열두 낱말과 keep + -ing 통째 빼기만 정본 근거보다 넓다 |
| 2 쓰기 8-3 '가장 좋은 선택' | 받음 | 학습 요소 '최상급'과 단원 단어(choice · possible · prefer)에 둘 다 맞다. 검토 예보다 낫다 |
| 3 R-4 를 여섯 더 넓힘 | 받음 | 같은 꼴(낮춤말 뜻 · 집안 형편 · 가족 형태 전제)이고 단계 · 형태 · 금지어 검사 0 |
| 4 (3) 주제 표 학습 요소 칸 괄호 | 받음 | 60행 모두 3.6 글자 그대로(검토자 맞대기 다름 0) |

알릴 것 1(touch · point 그림 판정은 P6b)과 2(P8 은 'You are the best!' · 'Do your best.' · 'You did it!' · 'That was fun!' 대신 'Good job!' · 'That's fun!')는 맞다. 둘째는 P8 브리프에 옮길 만하다. 남은 우려 '없음'과 결정이 필요한 것 '없음'도 받는다. N-1~N-3 은 컨트롤러가 고칠 수 있는 Minor 이고, 결정이 필요한 것은 없다. 권하는 순서는 N-1 · N-2 를 고치고 N-3 은 한계 표 한 줄로 두는 것이다.

## 5. 열린 장부(P6a 몫)

| 장부(ledger-open.md) | 판정 | 근거 |
|---|---|---|
| 13줄 opus-4-8 `thinkingDefault` 'none' | 아직 열림 | model-prices 의 opus-4-8 행이 adaptive 그대로다. P9a 와 합친 뒤 첫 개발용 적재 전(P6 몫)에 고친다 |
| 17 · 23줄 '한국어 뜻이 있으면 안 되는 단계' 규칙 | 아직 열림 | P4 시드 검사 몫이고 P6a 규격 파일에는 해당이 없다 |
| 25줄 P6b 그림 목록 | 아직 열림(P6b 작업 3 입력) | 지금 vocab 으로 다시 뽑는다. touch · point 는 동작어라 P6b 가 판정한다(알릴 것 1) |
