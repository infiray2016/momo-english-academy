Approved(C 0 · I 0 · M 4)

# 코드 검토: P4b 어휘 배정 · 규격 파일 정합 · 칸 검사(code-reviewer rev-p04a · Opus · xhigh, 2026-10-16)

대상은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3` 의 P4b 새 파일 여덟과 P4a 파일 변경 셋이다. 코드 파일:줄은 이 워크트리 기준이고, 정본 · plan 줄은 메인 저장소 기준이다. 첫 검토라 닫힌 장부는 없다.

확인 방법은 이렇다.
- 새 파일 여덟과 바뀐 P4a 세 곳을 모두 읽었다.
- `git status --short --untracked-files=all` 과 파일 시각으로 허용 파일 밖 변화가 0 임을 확인했다. P4a 의 다른 파일은 fix 1(19:1x) 뒤로 바뀌지 않았다.
- 시험 전체는 다시 돌리지 않았다(컨트롤러 20:3x: lint 0 · test 117 · deps 0 · build · bundle 0 · missing-test 60).
- 의심 다섯은 tsx 로 함수를 직접 불러 재현했다(아래 '재현').

## 1. 설계 준수

- (가) 배정 함수 — 맞음. allocate.ts:105~137 은 A = ⌈V ÷ k⌉, 수업 a 에 단어 (a−1)k+1~ak(마지막은 나머지), 다지기 = 정규 − A, minLessons = max(A, 설정)이다. 실패 이유 셋(empty-words · bad-k · too-many-assigned)도 plan-p04b:36 그대로다. `resolveUnitFrame`(:47~73)은 쓰기 6단계 이상에서 level_specs `frame` 을 쓰고, 보강 · 변형 · 덮기는 늘 구간 키를 쓴다. 알파벳 단원은 그 단원 단어 수를 쓴다(C54 (4)). `checkFrameRelations`(:186~229)는 관계 표 셋을 `V − L ≥ V × 비율`(approxGe) 꼴로 본다(plan-p04b:37).
- (나) 규격 파일 정합 — 맞음.
  - 열 규칙(settings · frame-* · reference-image · reference-level-spec · reference-unit-spec · reference-unit-word-dup · reference-forms · allocation)이 plan-p04b:45~54 와 1:1 이고 모두 `error` 다(reference-index.ts:181~188).
  - `index` 는 plan-p04b:56 의 것(num · levelSpec · unitSpec · unitsOf · lexicon · 목록 · frame · allocation · allowedForms)에 `writingShape` 를 더했다.
  - `allowedForms`(:516~531)는 C54 ㅅ 글자대로다. 수업은 앞 단계 전부와 이번 단원, 'test' 는 그 단계까지, 'story' 는 넘긴 단계 앞까지, 쓰기는 writing 차례이고 나머지는 rst 차례, null 차례는 늘 밖이다. 'story' 에 구간 첫 단계를 넘겨야 한다는 것은 주석에 없다(P4c 메모).
- (다) 칸 검사 — 맞음. 열네 규칙 모두 세 표와 맞는다(표 3).
  - 영어 검사 role 은 plan 일곱 그대로다(check-lesson.ts:42~50).
  - 금지어는 모든 조각을 본다(:381~395).
  - `offband` 는 P4a `offbandRatio` 를 써 기능어도 단계로 판정하고(C58), `glossary` 는 `glossaryMissing` 으로 기능어를 뺀다.
  - 쓰기 작문의 배정 role 은 prompt · example · hint 다(:52~56 · :934~942).
- (라) 결과 꼴 — 맞음. `SeedIssue`(reference-index.ts:44~54)는 plan-p04b:60 의 `{ rule, severity, message, file, cell, path }` 다. 칸 검사의 path 는 수업 객체 기준이므로 P4c 가 `lessons.<차례>.` 를 앞에 붙여야 한다(보고 'c 가 쓸 내보내기'에 적혀 있음).

## 2. 잘한 점

- 배정 시험이 공식을 되풀이하지 않고 단원 단어를 k 씩 자른 조각과 비교해 차례 · 나머지 · 다지기를 함께 본다(vocab-allocate.test.ts:40~58).
- 관계 표 시험이 쓰기 6단계 견본 틀이 경계 6 에 꼭 닿는 것을 쓴다. 그래서 '(1 − 0.8) 을 먼저 셈하면 걸린다'를 실제로 증명하고, k 를 바꿔 7 을 만들어 거부를 본다(:201~242).
- 경계 시험이 모두 짝을 이룬다. 지문 55 · 80 통과와 54 · 81 거부, 범위 밖 1/20 통과와 2/20 거부, 문장 상한 그대로와 + 1, 관계 표 6 과 7 이다. 거부 사례는 규칙 이름과 path 까지 단언한다.
- 시험 숫자는 모두 `defaultSettings()` · `settingNumber` · `index.levelSpec` · 상수에서 온다. 견본은 시험마다 `structuredClone` 해 시험 사이 순서 의존이 없고, builders 의 사전 캐시는 WeakMap 이다.
- M-8 · M-9 는 재검토 '고치는 법' 그대로다(text.ts:34~41 · :108). 사례마다 결과를 단언하고, 검토 사례의 사람 이름(Kim)을 앱 안 이름(Momo)으로 바꿨다.
- src 세 파일은 zod 없이 같은 폴더 모듈만 가져오고 Date · fs · fetch · 무작위가 없다. 한글 식별자 · '트랙' · '유닛'도 없다.

## 3. 지적

### M-1 Minor — 규격 파일이 일부 깨졌을 때 칸 검사가 예외를 던지거나 잘못된 오류를 덧붙인다

- 어디: check-lesson.ts:503(`index.num("seed.max_offband_ratio")`), :673(`writingShape`), :241~249(`expectedNewWords` 는 배정표가 없으면 빈 목록).
- 재현:
  - settings.json 에서 `seed.max_offband_ratio` 하나를 빼면 정합은 `settings` 오류 하나를 낸다. 그런데 읽기 `checkLessonCell` 이 '설정값 seed.max_offband_ratio 가 없거나 수가 아니다' 예외를 던진다. 쓰기 6단계 이상은 `writing.split_from_level` 이 빠지면 같은 꼴로 던진다.
  - `unit.regular_lessons.4-6` 을 3 으로 두어 배정할 수 없게 하면, 읽기 4단계 수업마다 layout 오류에 더해 vocab-allocation '새 단어 […] 가 배정표 [] 와 다르다'가 붙는다.
- 근거: plan-p04b:43 은 깨진 규격 파일을 쓰는 검사를 건너뛰고 P4c 가 '칸 검사를 건너뜀'을 보고한다고 정했다. plan-p04b:126 위험 7 은 c 가 `index` · 결과 꼴을 그대로 쓴다고 정했다. 보고 해석 5 의 건너뛰기는 정합 검사에만 있고 칸 검사에는 없다. Zod 는 통과하고 키만 빠진 settings.json 은 P6 손작업에서 생기기 쉽다.
- 고치는 법: `buildReferenceIndex` 결과에 칸 검사를 돌릴 수 있는지(지금의 settingsOk)를 내보낸다. 그리고 `checkLessonCell` 이 준비가 안 됐으면 한 건만 내고 멈추게 하거나, P4c 브리프에 '정합 `settings` 오류가 있으면 칸 검사를 부르지 않는다'를 적는다. `expectedNewWords` 는 배정표가 없으면 비교를 건너뛴다.

### M-2 Minor — 견본 형태 표의 과거형 정규식이 1단계 낱말 red 를 잡고, 견본 글을 바꿔 그것을 가렸다

- 어디: builders.ts:1122~1128 견본 `past-ed` 패턴 `\b[a-z]+ed\b`(P4a 견본), :1686(`under the bed` → `under the chair`).
- 재현: `formsIn("I have a red hat.", 견본 형태 표)` = `["past-ed"]`.
- 근거: 3.6 표 1단계 읽기 · 말하기 · 회화 요소가 '색 · 크기 + 명사'라 red 는 1단계부터 흔하다. 견본 형태 표로는 1~5단계 글에 red · bed · need 가 들어가면 학습 요소 오류가 난다. P4c 회화 견본과 miniSeed 가 같은 형태 표를 쓰므로 견본 글을 또 바꾸게 되고, 거부 시험이 엉뚱한 까닭으로 통과할 수 있다. 실제 형태 표의 질은 요청 2 대로 P6 몫이다.
- 고치는 법: 견본 `past-ed` 를 낱말 목록(jumped · looked · played 등)으로 바꾼다. 또는 시험이 쓰는 꼴만 잡는 좁은 식으로 바꾼다. 그 뒤 `under the bed` 를 되돌리고, red 가 든 1단계 문장이 통과하는 사례를 시험에 고정한다.

### M-3 Minor — 칸 검사 메시지에 설계 숫자 '(1~3단계)'가 박혀 있다

- 어디: check-lesson.ts:834 `"바른 답 문장이 없다(1~3단계)"`.
- 근거: CLAUDE.md '설계 숫자를 화면 · 코드에 그대로 박지 않는다(설정값)'와 브리프 판정할 것 5. 판정은 단계 규격 `questions.modelAnswer` 로 하는데 메시지만 범위를 적어, 단계 규격이 바뀌면 메시지가 틀린다. 다른 메시지는 모두 설정 · 규격에서 온 값을 넣는다.
- 고치는 법: '바른 답 문장이 없다(단계 규격 questions.modelAnswer)'처럼 출처 이름을 적는다.

### M-4 Minor — 베끼기 · 채우기 · 받아쓰기 문항의 보이는 · 들리는 낱말이 첫 허용 정답과 같은지 보지 않는다

- 어디: check-lesson.ts:602~662(`copy-tiles` · `build-tiles` · `fill-letters` 는 타일 · 빈칸만 보고, `dictation` 은 보지 않는다).
- 근거: 6.4 정답 행(06-시드-생성.md:95)과 3.3 쓰기 1단계 '철자 타일로 단어 베끼기'(보이는 낱말을 베낀다)다. `word` · `audioText` 가 허용 정답과 다르면, 아이가 보이는 대로 베끼거나 들은 대로 써도 틀렸다고 나온다. 6.4 풀이 검사(plan-p04c:103 쓰기 items 문항 전부가 대상)가 뒤에서 잡지만, 결정적 검사가 더 싸고 일찍 잡는다. plan-p04b:88 의 '정답' 행에는 없는 검사라 Minor 로 둔다.
- 고치는 법: 네 유형은 `word` 가 허용 정답 가운데 하나(소문자)인지 보고, `dictation` 은 `audioText` 도 같은지 `answer` 규칙으로 본다. 컨트롤러가 plan 에 한 줄 더할지 정한다.

## 표 1. 해석 1~11 · 요청 1~3 · 남은 우려 넷

| 항목 | 판정 | 근거 |
|---|---|---|
| 해석 1 미리보기를 배정 · 단원 단어 확인에서 뺌 | 수용 | 6.4 어휘 배정 '배정표대로 새 단어가 그 수업에 들어갔다'는 수업 본문의 쓰임을 보는 규칙이다. 미리보기는 새 단어를 늘 담아 넣으면 검사가 비게 된다. 6.3 '첫 활동인 새 단어 미리보기'는 미리보기 단어 모음 = newWords 와 뜻 · 예문 비지 않음으로 따로 본다(:281~303). 학습 요소 · 금지어는 미리보기를 포함한다 |
| 해석 2 지문 낱말 수 = sentenceWords | 수용 | 3.6 문장 길이와 같은 셈이라 두 검사가 어긋나지 않는다 |
| 해석 3 모음 같음 · 알파벳 A 넘는 수업은 빈 목록 | 수용 | plan-p04b:67 '같은 모음', C54 (4) '배정 함수를 단원 0 어휘에 그대로' |
| 해석 4 layout 한 건 | 수용 | 종류 위반이 있으면 번호 위반은 그 뒤에 따라오는 것이라 한 건이 읽기 쉽다 |
| 해석 5 정합 건너뛰기 | 수용(칸 검사 쪽은 M-1) | 정합 쪽은 num 예외 없이 건너뛴다 |
| 해석 6 겹침 단원마다 | 수용 | plan-p04b:52 · 3.4. 단원 0 과 1단계 단원의 겹침도 잡는다(3.4 '한 단원에서만 새 단어'와 맞음) |
| 해석 7 쓰기 정답 · 카드 | 수용 | 헷갈리게 하는 타일 허용 · 타일 한 번씩은 타일 화면의 뜻과 맞다. fill-letters 는 빈칸 꼴의 나머지 글자 · 길이를 함께 본다. 조립은 카드 = 정답 조각(plan-p04b:88), writing-cards 는 문장 조립만(3.3 쓰기 3단계 문장 · plan-p04b:89). 보이는 낱말 대조는 M-4 |
| 해석 8 WORD_BOX_MIN | 고칠 것(컨트롤러 20:3x 결정) | C54 (2) — fix 때 structure.ts 로 |
| 해석 9 바른 답 양쪽 | 수용 | plan-p04b:98 '바른 답은 modelAnswer 가 참일 때 있고 거짓일 때 없다' 글자대로, 6.3 '1~3단계는 바른 답 문장'. 메시지 숫자는 M-3 |
| 해석 10 읽기 유형 한 건 | 수용 | |
| 해석 11 AC-5b 규격 거부 | 수용 | AC-5b '대화 주고받기 활동이 없다'의 단위 몫이다. strict 규격이 칸을 repeat · listening · questions · pictureTask · presentation 으로 묶는다. 발표 · 그림은 `speaking` 규칙이 단계 규격대로 있고 없음을 보므로 둘이 합쳐 '그 활동만으로'를 막는다. Playwright 몫은 P11 |
| 요청 1 WORD_BOX_MIN → structure.ts | 수용(결정됨) | |
| 요청 2 P6 브리프 | 수용 | 견본 쪽 같은 문제는 M-2 |
| 요청 3 회화 견본 단원 단어 → P4c | 수용 | |
| 남은 우려 1 원형 찾기의 활용형 의존 | 기록 | plan-p04b:120 위험 1, 요청 2 로 P6 에 넘김 |
| 남은 우려 2 형태 표 정규식 질 | 기록 · 견본은 M-2 | |
| 남은 우려 3 3.6 글자대로 · 작문 예시문 분량 | 기록 | plan-p04b 위험 4 · 5, 표본(P8)에서 컨트롤러가 정함 |
| 남은 우려 4 check-lesson 956줄 | 수용 | 구역(수업 공통 · 정답 그림 · 읽기 · 쓰기 · 말하기)이 갈려 읽을 만하다. 나누기는 c 몫 |

builders 변경도 판정한다.
- `…Draft` 분리와 `withUsedUnitWords`(builders.ts:1761~1784)는 수용한다. 모듈은 tests → src 한 방향이라 순환이 없다(check:deps 0). 견본의 단원 단어 목록을 검사와 같은 role 로 채우므로 '견본 경고 0'은 자명하다. 그러나 규칙의 동작은 '6.3 단원 단어 목록' 시험이 견본을 고쳐 양쪽(오류 · 경고)으로 따로 단언하므로 빈틈은 아니다.
- `under the chair` 는 M-2 다.

## 표 2. 증명 표 행

| 행 | 시험 |
|---|---|
| AC-7c | 있음(5) vocab-allocate.test.ts:75 · 86 · 101 · 105 · 144 |
| 3.2 관계 표 · 규격 파일 정합 | 있음(8) vocab-allocate.test.ts:201 · 244 · 262 · 281 · 306 · 318 · 332 · 344 |
| AC-3a | 있음(4) seed-validator-reading.test.ts:62 · 73 · 103 · 139 |
| 6.4 수업 공통 | 있음(7) seed-validator-reading.test.ts:153 · 164 · 174 · 212 · 242 · 269 · 293 |
| AC-3b | 있음(4) seed-validator-image.test.ts:56 · 72 · 97 · 126 |
| AC-5b | 있음(4) seed-validator-speaking.test.ts:45 · 55 · 66 · 76 |
| AC-5g | 있음(1) seed-validator-speaking.test.ts:99 |
| AC-5h | 있음(3) seed-validator-speaking.test.ts:138 · 169 · 195 |
| 6.4 쓰기 | 있음(7) seed-validator-writing.test.ts:52 · 102 · 124 · 167 · 188 · 215 · 237 |

이름 43개가 plan 증명 표와 글자 그대로 같고 더한 이름은 없다. 견본 수업 아홉의 칸 검사 결과 0 은 AC-3a · AC-5b · 그림 · 쓰기 시험의 `toEqual([])` 로 고정됐다. 기본 · 작은 틀 정합 0 은 vocab-allocate.test.ts:282~283 이 고정한다.

## 표 3. 칸 검사 규칙 열넷

| 규칙 | 판정 | 근거 · 메모 |
|---|---|---|
| layout | 맞음 | plan-p04b:66. 단원 0 정규는 alphabet, alphabet 은 단원 0 에만, 보강 1~seed.remedial_per_unit, 변형 1~seed.topic_variants(check-lesson.ts:170~238) |
| vocab-allocation | 맞음 | 배정표 모음 · 다지기 · 보강 빈 목록 · 본문 원형 · 미리보기 모음 · 뜻 예문(:251~304). 배정표가 없을 때의 덧붙는 오류는 M-1 |
| unit-words | 맞음 | 단원 밖 · 글에 없음 오류(:306~333) |
| unit-words-unlisted | 맞음 | 경고(:334~344) |
| learning-elements | 맞음 | 영어 role 일곱 · isEnglishSentence · sentenceMaxWords · allowedForms(:347~379) |
| forbidden | 맞음 | 모든 조각(gloss · ko · piece · scene 포함) |
| answer | 맞음 | 읽기 · 듣기 · 그림 고르기 번호, 그림 고르기 첫 허용 정답 = 정답 보기, 타일 · 채우기 · 조립. 보이는 낱말 대조는 M-4 |
| image | 맞음 | 읽기 · 듣기 그림 보기와 쓰기 그림 고르기의 단어 → vocab → imageKey → 카탈로그, 그림 보고 말하기 키(:433~447 · :874~882) |
| amount | 맞음 | 읽기 낱말 · 문장 · 문항 · 유형, 쓰기 단어 · 어구 · 문장 · 유형 · 문장 낱말, guided 틀 · 단어 상자, 작문 예시문(plan-p04b 위험 4 해석) |
| offband | 맞음 | offbandRatio(단계 = 수업 단계, 새 단어, glossary proper), approxLe 와 seed.max_offband_ratio(C58) |
| glossary | 맞음 | glossaryMissing(기능어 뺌, C58) |
| writing-shape | 맞음 | writingShape 의 세 키 경계 |
| writing-cards | 맞음 | 문장 조립만. 대문자 · 붙은 문장 부호 · 문장 부호 카드 없음 |
| speaking | 맞음 | 3.3 말하기 표의 모든 수를 단계 규격 칸에서 읽는다. 메시지 숫자는 M-3 |

## P4c 에 넘길 메모

- `allowedForms(area, level, 'story')` 에는 구간 첫 단계를 넘긴다(주석에 적을 것).
- 칸 검사 path 는 수업 객체 기준이다.
- 정합 `settings` 오류가 있을 때 칸 검사를 어떻게 할지는 M-1 결정을 따른다.

## 4. 판정

Approved(C 0 · I 0 · M 4). 막는 결함은 없다. 이미 정해진 fix(`WORD_BOX_MIN` → structure.ts) 라운드에 M-1 · M-2 · M-3 을 함께 넣으면 싸다. M-4 는 plan 에 없는 검사라 컨트롤러가 넣을지 정한다.
