# 범위 한정 재검토: 회화 3단계 생성 브리프(`seed/prompts/talk-3.md`) 고침 — 묶음 4 나

검토자: design-reviewer(Fable 5.1 · max) · 2026-11-05 · **검토한 판: p13d `seed/prompts/talk-3.md` 810줄, sha256 ca4c5031847aaf035331269d372c56692a37f5bc5c6e802d056fd0b5826e0eaa(고침 보고 `task-talk-4b-report.md` 의 값과 같음)**. 지난 검토 `task-talk-3-brief-review.md`(774줄 8956f258… 판) · 고침 브리프 `task-talk-4b.md` · 고침 보고 · 고침 diff(`scratchpad/talk3-brief-fix1/final.diff` 195줄)를 먼저 읽고, 새 판은 바뀐 절(0 · 5 · 7 · 8 · 10 · 12 · 14 · 16 · 17절)과 README talk-3 행을 줄 단위로 대조했다. 정본은 본 저장소와 p13d 사본이 같다(`diff -q`: 02-2 · 06 · 10). 읽기 전용으로 검토했고 브리프 · 시드 · 코드는 고치지 않았다. 14절 명령은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/talk3-brief-review-2/` 아래 시드 사본에서만 돌렸다. 검증기는 p13d `src/core/seed/check-talk.ts`(수정 시각 11-05 14:13, '5-다' T-65 뒤 상태) 기준이다. I-2(expression)는 브리프대로 다시 판정하지 않았다.

## 판정: **Approved — 카드 생성으로 가도 된다** (Important 0 · Minor 3 · 참고 넷)

I-1 고칠 것 넷 · T-53 보탬 · M-1~M-4 가 모두 새 판에 반영됐고, 14절 명령 셋이 새 판 글 그대로 돌며, 12절 예시가 새 검증기(마지막 물음표 문장 열쇠)에서 오류 0 이고 앞 판 예시는 검증기 · 스스로 확인 둘 다에 걸린다. 새로 든 것은 Minor 셋뿐이고 카드 글을 바꾸지 않는다(M-A · M-B 는 브리프 문구 둘, M-C 는 8절 예 하나). 셋을 고치면 판이 또 바뀌므로(6.3 한 판 원칙) 고친다면 생성 전에 한 번에 고치고 해시 · README 행을 갱신한다. 고치지 않고 생성해도 카드에 영향이 없다.

## 지난 지적의 판정(근거는 새 판 줄 번호)

| 지적 | 판정 | 새 판 근거 |
|---|---|---|
| I-1 (1) 마지막 물음표 문장 규칙 한 줄 | ADDRESSED | 5절 146줄 '같은 질문' 행(열쇠 정의 · 02-2 200줄 · C172 · `talk.same_question_max`), 170줄 더 이야기할 거리('더 이야기할 거리도 5절 같은 질문 셈에 든다'), 14절 524줄 확인 4 |
| I-1 (2) 'What do you do?' 꼬리 일곱과 170줄 ○ 예 | ADDRESSED | 8절 313(eat at the table) · 314(drink with your cup) · 316(come now) · 317(wash with water) · 318(sleep in your bed) · 320(learn with new games) · 323(look with your eyes)줄, 170줄 ○ 예 'with your cup', 142줄 ○ 예 'in your bed', 292줄 예. 스물다섯 열쇠가 서로 다름을 실측(아래) |
| I-1 (3) 스스로 확인에 열쇠 셈 | ADDRESSED | 14절 594~600줄(`SAME_MAX` 는 `<뿌리>/settings.json`, `CONTRACT`), 602~608줄 `question_key`, 694~705줄(인사 · 필수 · 더 · 쉬운 질문의 열쇠 셈 · 상한 초과 걸림 · 장면 없는 꼴 걸림), 742~743줄 출력, 560줄 설명, 16절 780줄 보고 줄 |
| I-1 (4) 12절 예시 고치고 재검증 | ADDRESSED | 440(목표 표현 learn 꼴) · 455(필수 3) · 457(필수 5) · 460(더 1, 그림 table) · 461(더 2)줄, 425줄 확인 문장. 재검증 결과는 아래 |
| T-53 보탬(170줄 ○ 예) | ADDRESSED | 170줄 'You are thirsty. What do you do with your cup?' |
| M-1 질문 두 문장 · grass 세 문장 | ADDRESSED | 142줄 '두 문장까지' 유지 + 근거(02-2 190줄 카드 자리에 AI 반응이 앞에 붙음), 335줄 grass 'Cows and sheep! What do they eat?' 두 문장 |
| M-2 '이 판이나 다음 판' | ADDRESSED | 13줄 '다음 판으로'(VERBS · GOAL_OF 단원 1 전용 근거) |
| M-3 한국어 이름 검사 · 두 낱말 표제어 | ADDRESSED | 362줄('준'은 영어 Jun 만, 하나 → 한 개 · 한 번, C141 근거), 532줄 확인 12, 590~591줄 `TEACHER_KO` 에서 '준' 뺌, 611~614줄 `offband` 가 두 낱말 표제어를 토큰 전에 맞춤. 둘째 안('준'만 빼고 한국어는 계속 봄)을 고른 까닭(이름 자체인 '나비' · '하나'는 예외로 뺄 수 없음)은 타당 |
| M-4 부정 명령문 | ADDRESSED | 307줄(`Don't worry!` · `Don't go!` → `It is okay!` 꼴, 검출기 · 어휘 검사가 못 잡는 까닭), 527줄 확인 7 |
| 판 · 해시 · README | ADDRESSED | 11줄 둘째 판, 14줄 재검증 문장, README 21줄 '둘째 판(… 810줄, 해시 ca4c5031…) — 범위 한정 재검토 전' |

## 새로 볼 것(할 것 2): 8절 질문 꼴 표 · 12절 예시의 아이 눈

- **대본이 되지 않는가**: 한 카드 안의 항목 꼬리가 모두 다르면 C194 (1) 닫기 뒤에 붙는 더 이야기할 거리가 막힌 질문과 같은 꼬리로 읽히지 않는다. 12절 예시의 선생님 질문 21개(인사 1 · 필수 5 · 더 5 · 쉬운 질문 10)는 열쇠가 모두 다르다(스스로 확인 '가장 많은 수 1'). 지난 I-1 의 '아이 귀에 같은 질문을 차례로 묻는 대본' 위험은 닫혔다.
- **8절 표 스물다섯 줄 실측**(스크래치패드 `tools/keys.py`, 브리프 14절의 `question_key` 를 그대로 exec): 열쇠 스물다섯이 서로 다르고 표의 '열쇠' 칸과 모두 같다. 질문에 노리는 단어가 활용형까지 없다(A4-03). 질문은 모두 두 문장 이하, 문장마다 7낱말 이하(가장 긴 것 7낱말: eat · drink · look). 그 낱말이 배정되는 수업에서 열린 범위(1~2단계 + we · they + 그 수업까지의 단원 단어, 선생님 쪽은 where 더함)로 질문 · 답 예시를 보면 범위 밖 낱말 0(table · cup · eyes · water · cows · sheep · shells · kite · need · play 모두 1~2단계). 답 예시마다 노리는 단어가 든다. 장면 없는 'what do you do' 꼬리 0.
- **학습 설계자가 검토 예 대신 바꾼 꼴**: eat 'at the table'(time 은 vocab 4단계라 검토 예의 'Lunch time!' 을 피한 것이 맞다, 7절 273줄) · drink 'with your cup' · wash 'Sand on your hands! … with water?' · sleep 'in your bed' · look 'with your eyes' · learn 'with new games'(8낱말 한도 회피) · come 'now' 는 모두 홀로 뜻이 통하고 장면이 질문 안에 있다. 명사 넷도 같은 수업 안 겹침을 풀었다: snow(배정 4 에서 rain 'what do you see' 와 겹침 해소) · beach(배정 5 에서 forest 'where are you' 와 겹침 해소) · wind('what do you like' 흔한 꼴 회피) · grass(두 문장). 다만 snow 는 M-C.
- **12절 예시**: 바뀐 다섯 칸 모두 꼴 · 뜻이 맞다. 더 1 의 그림을 sandwich 에서 table 로 바꾼 것은 9절 345줄('질문이 가리키는 물건이 1~2단계 그림 낱말일 때만')에 맞고 table 은 카탈로그(346줄)에 있다. 한국어 뜻('식탁에서 뭐 해?' · '컵으로 뭐 해?' · '침대에서 뭐 해?' · '새 놀이가 생기면 뭐 해?')은 반말이고 영어와 맞는다.
- **학습 설계자가 더한 (제안) 둘**('카드 안의 마지막 물음표 문장은 모두 다르게' · '장면 없는 What do you do? 금지', 146줄 · 794줄)은 타당하다. 02-2 200줄이 카드 · AI 질문을 합쳐 세므로 카드가 같은 꼬리를 둘 쓰면 AI 가 한 번만 써도 셋이 되어 카드 자리에서 붙일 것이 줄어든다. 스스로 확인은 둘째만 걸고 첫째는 셈으로 보이는데(705줄), 그것으로 충분하다.
- 1~3단계 T2(영어 문장 미리 보이지 않음)를 어기게 하는 지시는 새로 생기지 않았다. 바뀐 곳은 선생님 질문 글 · 한국어 뜻 · 검사 명령뿐이다.

## 14절 명령 셋 실행 결과(새 판 글 그대로, 스크래치패드 시드 사본)

사본: `…/scratchpad/talk3-brief-review-2/` — `cmd/`(브리프에서 줄 번호 · 펜스를 assert 하고 뽑은 명령 셋 + 1절 명령 둘), `seed/`(p13d `seed` 사본 + 12절 예시 한 장 `lessons/talk/3/1.json`), `seed-old/`(같은 사본 + diff 의 앞 판 다섯 줄로 되돌린 예시), `seed-attach/`(붙이기 시험), `out/`(출력 전문).

| 명령 | 입력 | 결과 |
|---|---|---|
| 스스로 확인(`python3 -I - <사본>/seed 1 5`) | 새 판 12절 예시 | '스스로 확인 걸림 없음' · 같은 질문 열쇠 카드 최대 1 · 인물 n=0 · m=0 (`out/selfcheck-new.txt`) |
| 스스로 확인 | 앞 판 12절 예시 | 'what do you do' 4번(상한 2) 걸림 + 장면 없는 꼴 걸림, 경로 required.2 · required.4 · more.0 · more.1 (`out/selfcheck-old.txt`) |
| 검증(`pnpm -s seed:validate --root <사본>/seed --areas talk --json`, Node 24 서브셸, 브리프 751줄 거르기 그대로) | 새 판 12절 예시 | exit 0 · cells 27 · passed 27 · failed 0 · warnings 5, 이 파일의 경고는 `talk-unit-incomplete` 하나(예고된 것) (`out/validate-new.txt`) |
| 검증 | 앞 판 12절 예시 | exit 1 · failed 1 · `talk-same-question` "'what do you do' 가 4번 나온다(마지막 물음표 문장 기준, 2번까지)" (`out/validate-old.txt`). 검증기가 새 열쇠로 센다 |
| 붙이기(501~516줄) | 고정 카드 1(12절 예시, 1절 48줄 명령으로 해시 d4a2553a…) + 사본 파일에 보강 1 · 같은 자리 중복 사본(제목 바꿈) · 새 배정 3 | '붙임: 카드 3 · 고정 1 · 해시 같음', 중복 사본이 고정 카드로 돌아오고(제목 '놀이하는 주말') 차례가 (변형, 정규 → 보강, 번호)로 정렬됨. 해시를 다르게 주면 AssertionError · exit 1 |
| 1절 설정값 표 명령(46줄) · 고정 카드 해시 명령(48줄) | 사본 | 돌아감(설정값 열한 개 출력, 해시 출력) |
| python `question_key` ↔ 실행 열쇠 `cardQuestionKeyOf`(p13d `question-check.ts:64`, `tsx` 로 직접 호출) | 8절 25 + 12절 새 · 앞 판 질문 42 + 가장자리 23 = 90건 | 89건 같음(줄임꼴 펼침 · `{NAME}` → name · 'Mr.' 약어 · 뒤에 붙은 평서문 · 물음표 없는 글 모두 같음). 다른 1건은 'Oh! What do you do?!'(실행은 `QUESTION_END` 가 '?' 로 끝나야 질문이라 글 전체가 열쇠, python 은 '?' 문장만 뽑음). 카드 질문은 '?' 로 끝나므로(`talk-support`) 닿지 않는다 — 참고 |

## 학습 설계자의 우려 넷

| 번호 | 우려 | 판정 | 근거 |
|---|---|---|---|
| 1 | 앱 `chances.ts` usable 이 항목 글 전체로 견줌 | 아직 열림(다른 묶음 몫, 카드 생성을 막지 않음) | 장부 T-65 (라): '5-다' 가 `chances.ts` usable 과 `check-talk.ts` 를 `question-check.ts` 의 `cardQuestionKeyOf` 하나로 맞춤(11-05 14:4x, 코드 검토 rev-talk-5c 전). 브리프대로 그 파일은 보지 않았다. 카드끼리는 이제 꼬리가 겹치지 않으므로 생성과 무관하다 |
| 2 | come · see · wind · air 끌어내기 어려움 | 아직 열림(프리뷰에서 볼 곳) | 앞 판과 같은 약점이고 받침 줄 · 꺼내기 지침(339줄)이 받친다. look 도 같은 줄에 둔다: 'Birds in the tree! What do you do with your eyes?'(323줄)는 같은 배정 3 에 열린 see('I see birds.')를 끌어낼 수 있다. 그때 선생님이 바른 말로 받고 look 은 다시 쓰기로 남으면 된다 |
| 3 | 0절 14줄 '코드 검토 중이다' | 아직 열림 → M-B | 묶음 3 fix 1 은 10-30 09:3x Approved(닫힌 장부 T-32), README talk-3 행도 'fix 1 Approved' |
| 4 | 검증기가 더 바뀌면 검증 다시 | 이번 판정에서는 닫힘 | 11-05 14:13 판 `check-talk.ts`(T-65 뒤)로 위 표의 검증을 다시 돌려 오류 0. rev-talk-5c 검토에서 `checkSameQuestion`(625~653줄)이 또 바뀌면 생성 직전에 한 번 더 돌린다(12절 머리 '검증을 통과한 것만 싣는다') |

I-2(expression 확인 방식)는 요청자 · P12 몫 그대로이고 다시 판정하지 않았다.

## 새로 든 것

### M-A (Minor) 브리프가 인용한 검증기 함수 이름 `sameQuestionKeyOf` 가 지금 코드에 없다
- 0절 14줄 · 14절 551줄이 `check-talk.ts 의 sameQuestionKeyOf` 라 적었다. p13d `src` · `tests` 에 그 이름은 0건이고, 검증기는 `question-check.ts:64` 의 `cardQuestionKeyOf` 를 가져와 쓴다(`check-talk.ts:7 · 640`). 컨트롤러의 13:58 고침(T-56)은 그 이름이었으나 '5-다'(T-65 (라))가 14:4x 에 이름을 통일했다. 고침 보고 시점에는 맞는 이름이었으므로 학습 설계자의 잘못이 아니다. 0절 14줄의 '검토에서 꼴 · 규칙이 바뀌면 컨트롤러가 이 판을 다시 맞춘다' 대로 컨트롤러가 두 곳을 `cardQuestionKeyOf` 로 바꾸면 된다. 생성자는 이 이름으로 아무것도 하지 않으므로 카드에는 영향이 없다.

### M-B (Minor) 0절 14줄 '코드 검토 중이다'는 10-30 의 상태다
- 묶음 3 fix 1 Approved(닫힌 장부 T-32, 10-30 09:3x) 뒤라 '코드 검토를 지났다(fix 1 Approved 09:3x)' 로 고친다. M-A 와 같은 줄이라 한 번에 고친다.

### M-C (Minor) 8절 330줄 snow 의 답 예시가 질문 꼴과 어긋난다
- 'It is very cold. What is on the trees?' 에 답 예시가 'I see snow.' 다. 5절 156줄대로 영어 틀은 답 예시에서 노리는 단어를 뺀 'I see ___.' 가 되는데, 'What is on the trees?' 에 'I see ___.' 로 답하게 받치면 아이에게 질문과 틀이 맞지 않는다. 같은 표의 cloud 328줄('It is a cloud.') · grass 335줄('They eat grass.')처럼 질문 꼴에 맞춰 'It is snow.'(틀 'It is ___.')로 두기를 권한다. 표는 '제안 · 예'(309줄)이고 생성자가 새로 쓰므로 Minor 다. 고친다면 M-A · M-B 와 한 번에.

### 참고(지적 아님)
- 4절 115줄은 바뀌지 않은 절이라 아직 '글자가 같은 선생님 질문 2번까지' 라 적혀 있다. 5절 146줄과 뜻이 다르게 읽힐 수 있으니 위 셋을 고칠 때 '마지막 물음표 문장이 같은' 으로 맞추면 좋다(범위 밖이라 지적으로 올리지 않는다).
- 스스로 확인의 상한은 `<뿌리>/settings.json` 의 `talk.same_question_max`(2)이고 검증기는 코드 상수 `TALK_SAME_QUESTION_MAX`(`structure.ts:278`, 2)다. 지금 같고 문이 되는 것은 검증기이므로 둘이 갈리면 검증기가 막는다. 고침 보고 '설계와 다르게 한 것 8' 그대로 둔다.
- 한국어 칸의 '하나'는 설계대로 여전히 걸린다(10절 362줄 '한 개 · 한 번' 안내). 생성자가 지킬 수 있는 규칙이라 그대로 둔다.
- 보조 스킬(ui-ux-pro-max · design-taste-frontend)은 화면이 없는 글 검토라 적용 항목이 없고 스크립트는 돌리지 않았다.

## 장부 판정

- **T-36** — 닫힘. I-1 고칠 것 1~4 · 판 · 해시 · README 갱신이 반영됐고 12절 예시가 새 검증기에서 오류 0 이다(위 표).
- **T-53** — 닫힘(브리프 몫). 170줄 ○ 예가 바뀌었다. 코드 몫(`chances.ts` usable)은 T-65 (라)로 옮겨졌고 rev-talk-5c 검토에서 닫는다.
- **T-52** — 브리프 몫(I-1 · M-1~M-4) 닫힘. 컨트롤러 몫(검증기 열쇠 T-56)은 그 코드 검토(rev-talk-5c) 뒤 닫는다. I-2 는 T-18 과 함께 요청자 몫.
- **T-18** — 아직 열림(요청자 몫: 목표 둘 · expression 세 꼴 0.8 · 장소 질문은 talk-3-1-2 만, 프리뷰에서 확인).
- **T-61** — 이 보고로 닫힘(재검토 Approved · Minor 셋은 컨트롤러 직접 또는 생성 뒤 다음 판).

## 다음(컨트롤러)

1. M-A · M-B(· M-C · 115줄)를 고칠지 정한다. 고치면 셋째 판이 되므로 해시 · 줄 수 · README talk-3 행을 갱신하고, 12절 예시는 글이 바뀌지 않으니 재검증은 필요 없다(해시만).
2. seed-generator 호출 (가)(1절 51~61줄)로 두 장(배정 1 · 변형 1, 다지기 6 · 변형 1)을 만든다. briefHash 는 호출 때 판의 sha256 이다.
3. rev-talk-5c 가 `check-talk.ts` 를 더 바꾸면 생성 직전에 12절 예시 검증을 한 번 더 돌린다.
