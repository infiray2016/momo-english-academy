# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P4b 어휘 배정 · 칸 검사(읽기 · 쓰기 · 말하기)

spec: `specs/` 정본(3.2 배정 · 관계 표 · 단원 틀 표, 3.3 단계표, 3.4, 3.6, 6.4 검사 표, 12절, 15절 AC-3a · 3b · 5b · 5g · 5h · 7c, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P4 행 · 공통 사실 `plan-p04a-규격.md` · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: done(커밋 f27ae15 21:1x, PR 은 H15 뒤)
승인: 컨트롤러, 2026-10-16 15:5x(결정은 plan-p04a '정할 것' 끝 문단과 13절 C54) · 브랜치 · 워크트리: `feature/1a-p04b-seed-checks`(P4a 브랜치 끝에서, P4 워크트리) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P4 셋 가운데 둘째다. 첫째 `plan-p04a-규격.md`(규격 · 글 도구 · 시험용 시드 만들기 함수)가 끝난 브랜치 끝에서 시작하고, 셋째 `plan-p04c-묶음-검사-명령.md`(회화 · 평가 · 묶음 검사 · 완전성 · 명령)가 이 plan 끝에서 시작한다. 시드 파일 배치 · 영어 값 · 칸 키 · 규격 칸 · 상수 · 정할 것 ㄱ~ㅍ 는 P4a 의 같은 이름 절에 있다. 이 plan 을 구현하는 쪽은 P4a 의 '규격 칸' · '상수' · '글 도구' 절을 함께 읽는다.

## 목표 (Goal)

6.3 만드는 순서 (0)의 '어휘 배정 함수'와 6.4 검사 가운데 칸 하나로 끝나는 읽기 · 쓰기 · 말하기 검사를 만든다.
어휘 배정은 3.2 그대로다. 단원 어휘를 새 단어 k개씩 배정 수업 1~⌈단어 수 ÷ k⌉에 나눠 넣고(나머지는 마지막 수업), 그 뒤를 새 단어 없는 다지기 수업으로 채워 정규 수업 수를 맞춘다. 최소 수업 수는 배정 수업 수와 unit.min_lessons.<구간> 가운데 큰 값이다(AC-7c). k · 정규 수업 수 · 최소 수업 수는 unit.new_words_per_lesson · unit.regular_lessons · unit.min_lessons 의 구간 키에서 읽고, 쓰기 6단계 이상은 level_specs 의 단원 틀 칸에서 읽는다(3.2, 5절).
같은 파일에 3.2 관계 표의 셈할 수 있는 관계(마지막 배정 수업 새 단어 수 ≤ 단원 단어 × (1 − unit.vocab_mastery), unit.max_remedial ≤ seed.remedial_per_unit, 배정 수업 수 ≤ 정규 수업 수)를 둔다. P7 의 설정값 시드 적재와 2차 고급 화면이 같은 함수를 쓴다(5절 · 12절).
칸 검사는 6.4 의 분량 · 말하기 수업 · 어휘 배정 · 어휘 범위 밖 단어(seed.max_offband_ratio) · 학습 요소 범위 · 정답 · 그림 · 글로서리 · 금지 내용 행을 읽기 · 쓰기 · 말하기 수업 하나에 건다. 규격 파일 정합(정할 것 ㄹ)도 여기서 본다. 증명은 AC-3a · 3b · 5b · 5g · 5h · 7c 다.

## 바뀌는 파일 (Files that change)

P4b 가 쓰는 파일은 아홉이다(새 파일 여덟 · 고치는 파일 하나). 공용 파일은 고치지 않는다.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/vocab/allocate.ts` | 신규 | 단원 틀 고르기 · 어휘 배정 · 3.2 관계 표 검사(아래 '배정 함수') |
| `src/core/seed/reference-index.ts` | 신규 | 규격 파일을 읽기 좋은 꼴로 묶고(설정값 읽기 · 단계 규격 · 단원 규격 · 단어 사전 · 그림 · 형태 표 · 금지어 · 단원마다 배정), 규격 파일 정합을 본다(아래 '규격 파일 정합') |
| `src/core/seed/check-lesson.ts` | 신규 | 읽기 · 쓰기 · 말하기 수업 칸 하나의 검사(아래 '칸 검사') |
| `tests/unit/vocab-allocate.test.ts` | 신규 | AC-7c · 3.2 관계 표 · 규격 파일 정합 |
| `tests/unit/seed-validator-reading.test.ts` | 신규 | AC-3a 와 수업 공통 검사 |
| `tests/unit/seed-validator-image.test.ts` | 신규 | AC-3b 와 그림 검사 |
| `tests/unit/seed-validator-speaking.test.ts` | 신규 | AC-5b · 5g · 5h |
| `tests/unit/seed-validator-writing.test.ts` | 신규 | 쓰기 검사 |
| `tests/fixtures/seed/builders.ts` | 수정(필요할 때만) | 견본 내용을 이 plan 의 검사에 맞게 고친다. 꼴(함수 이름 · 돌려주는 모양)은 바꾸지 않는다 |

## 배정 함수(allocate.ts)

| 함수(제안) | 들어오는 것 | 나가는 것 · 규칙 | 정본 |
|---|---|---|---|
| `resolveUnitFrame({ area, level, unit, levelSpec, settings })` | 영역 · 단계 · 단원 · 그 단계 규격 · 설정값 읽기 | `{ band, vocabCount, k, regularLessons, minLessonsSetting, remedialLessons, topicVariants, remedialCoverage }`. 구간은 단계 규격의 `band`. 단원 1~5 의 `vocabCount` 는 unit.vocab_count.<구간>, 단원 0 은 그 단원의 단어 수(정할 것 ㅂ). k · 정규 · 최소는 구간 키에서 읽되 단계 규격에 `frame` 이 있으면(쓰기 6단계 이상) 그것을 쓴다. 보강 · 변형 · 보강 덮기는 늘 구간 키(seed.remedial_per_unit · seed.topic_variants · seed.remedial_coverage) | 3.2 단원 틀 표 · 쓰기 6단계 이상 문단, 12절 |
| `allocateUnit({ words, k, regularLessons, minLessonsSetting })` | 단원 단어(배정 차례) · 틀 | `{ ok: true, lessons: { lessonNo, kind: 'assigned' \| 'reinforce', newWords }[], assignedCount, reinforceCount, minLessons }` 또는 `{ ok: false, reason }`. 배정 수 A = ⌈단어 수 ÷ k⌉, 수업 a 는 단어 (a−1)k+1 ~ ak(마지막은 나머지), 다지기 수 = 정규 − A, minLessons = max(A, minLessonsSetting). 이유: `empty-words` · `bad-k`(1 미만) · `too-many-assigned`(A > 정규) | 3.2 '단원 수업 수는 어휘 배정에서 나온다', AC-7c |
| `checkFrameRelations({ settings, levelSpecs })` | 설정값 · 쓰기 단계 규격 | 위반 목록. 구간마다와 `frame` 이 있는 쓰기 단계마다: `frame-assigned-fits`(A ≤ 정규), `frame-last-lesson`(마지막 배정 수업 새 단어 수 L 이 단원 단어 V 에 대해 V − L ≥ V × unit.vocab_mastery − FLOAT_TOLERANCE. (1 − 0.8) 을 먼저 셈하면 부동소수 오차로 경계 6 이 걸리므로 이 꼴로 비교), 구간마다 `frame-remedial`(unit.max_remedial ≤ seed.remedial_per_unit) | 3.2 관계 표 첫째 · 셋째 줄 |

관계 표의 나머지 줄(7학습일, 1~3구간 누계, 회화 다시 묻는 턴 자리, 보강 덮기)은 셈이 아니거나 시드를 봐야 하는 관계라 c 의 묶음 검사가 맡는다.

## 규격 파일 정합(reference-index.ts)

`buildReferenceIndex(규격 파일들)` → `{ index, issues }`. 규격 파일 하나라도 Zod 규격에서 깨졌으면 그 파일을 쓰는 정합 검사는 건너뛰고 c 가 '규격 파일 오류로 칸 검사를 건너뜀'을 보고한다. 모두 오류(`error`)다(정할 것 ㄹ).

| 규칙 | 기준 | 정본 |
|---|---|---|
| `settings` | P4a 의 45 키가 있고 수다. writing.rule_check_until_level < writing.light_check_until_level 이고 light + 1 = writing.split_from_level(쓰기 모양 사이에 빈 단계가 없음) | 12절 |
| `frame-*` | `checkFrameRelations` 위반 | 3.2 관계 표 |
| `reference-image` | vocab 의 `imageKey` 가 그림 카탈로그에 있고 그 그림의 `word` 가 같은 단어다. 카탈로그의 `word` 가 vocab 에 있다. 그림 키가 겹치지 않는다 | 5절 vocab · images |
| `reference-level-spec` | (영역, 단계)가 겹치지 않는다. `band` · `cefr` 가 단계와 맞다(P4a 상수 `BAND_INFOS` — fix 1 에서 `BANDS` 를 이 이름으로 바꿈). 쓰기 `amount.kind` 가 키와 맞다(단계 ≤ rule_check → items, ≤ light_check → guided, ≥ split → composition). 쓰기 `frame` 은 단계 ≥ writing.split_from_level 에만 있고 거기선 꼭 있다 | 3.1 · 3.2 · 3.3 · 5절 |
| `reference-unit-spec` | (영역, 단계, 단원)이 겹치지 않는다. 단원 0 은 읽기 · 쓰기 1단계에만. 단어가 vocab 에 있다. 단원 1~5 의 단어 수 = unit.vocab_count.<구간>. 단원 1~5 단어의 단계 어휘 범위 = 단원 단계, 단원 0 은 1 이하 | 3.2 · 3.4 '그 단계에 정해 둔 단어에서 고르고' · 5절 |
| `reference-unit-word-dup` | 한 영역 안에서 한 단어가 두 단원 이상의 단원 단어다(영역이 다르면 괜찮다). 조사 P6 의 첫째 관계 | 3.4 '한 단어는 영역마다 한 단원에서만 새 단어' |
| `reference-forms` | 형태 표 `introducedAt` 의 단계 1~12 · 단원 1~5 | 3.6 |
| `allocation` | 단원마다 `allocateUnit` 이 `ok: false` | 3.2 |

`index` 가 c 에 내주는 것(제안): 설정값 읽기(`num(key)`), `levelSpec(area, level)`, `unitSpec(area, level, unit)`, `unitsOf(area, level)`, 단어 사전(P4a `buildLexicon`), 단어 · 그림 · 형태 · 금지 목록, `frame(area, level, unit)`, `allocation(area, level, unit)`, `allowedForms(area, level, unit | 'test' | 'story')`(3.6 과 정할 것 ㅅ: 수업은 앞 단계 전부 + 이번 단원, 평가 · 배치는 그 단계까지, 토리 이야기는 구간 첫 단계 앞까지. 영역이 쓰기면 `writing` 차례, 나머지는 `rst` 차례. 차례가 `null` 인 형태는 늘 범위 밖).

## 칸 검사(check-lesson.ts)

`checkLessonCell(수업, { area, level, unit, file, index })` → 검사 결과 목록 `{ rule, severity: 'error' | 'warning', message(한국어), file, cell, path }`. 영어 검사(길이 · 형태 · 범위)는 P4a `isEnglishSentence` 가 참인 문장만 본다. 여러 문장이 든 글은 P4a `splitSentences` 로 자른다. 아래 '수업 공통' 검사는 영역과 영어 검사에 쓸 role 모음을 인자로 받는 함수(`checkLessonCommon`, 제안)로 따로 내보낸다. c 의 회화 카드 검사가 회화 몫 role 로 다시 부른다.

수업 공통(읽기 · 쓰기 · 말하기):

| 규칙 | 6.4 행 | 기준 |
|---|---|---|
| `layout` | (수업 겉) | 단원 1~5 정규는 1~A `assigned`, A+1~정규 수 `reinforce`. 단원 0 정규는 1~정규 수 `alphabet`. 보강은 1~seed.remedial_per_unit `remedial`. 변형은 1~seed.topic_variants. `alphabet` 은 단원 0 에만 |
| `vocab-allocation` | 어휘 배정 | `newWords` 가 배정표(배정 · 알파벳 수업)와 같은 모음이고 다지기 · 보강은 비었다. 새 단어마다 그 수업 영어 글에 원형으로 나온다(쓰기 작문은 과제 · 예시 · 힌트만, 아래). `preview` 단어 모음 = `newWords` 이고 뜻 · 예문이 비지 않았다 |
| `unit-words` | (6.3 수업 겉) | `unitWords` 가 그 단원 단어 안에 있고, 적은 단어마다 글에 나온다(오류). 글에 나오는데 적지 않은 단원 단어는 `unit-words-unlisted` 경고(원형 찾기가 어림이라 막지 않는다) |
| `learning-elements` | 학습 요소 범위 | 영어 문장(role `passage` · `script` · `prompt` · `option` · `answer` · `example` · `hint`)마다 단어 수 ≤ 단계 규격 `sentenceMaxWords`, 형태 표의 범위 밖 형태 없음(`allowedForms`) |
| `forbidden` | 금지 내용 | 모든 글 조각(한국어 포함)에 금지어 · 정규식이 걸리지 않는다 |
| `answer` | 정답 | 정답 번호가 1~보기 수 안(읽기 문항 · 듣기 문항 · 쓰기 그림 고르기) |
| `image` | 그림 | 그림 보기(읽기 `picture` · 말하기 듣기 `picture` · 쓰기 `pick-word` 의 `picture`)의 단어가 vocab 에 있고 `imageKey` 가 있으며 그 키가 카탈로그에 있다. 그림 보고 말하기의 그림 키가 카탈로그에 있다 |

읽기:

| 규칙 | 6.4 행 | 기준 |
|---|---|---|
| `amount` | 분량 | 지문 낱말 수가 `passage.words` 안(있을 때), 문장 수가 `passage.sentences` 안(있을 때), 문항 수 = `questions.total`, 유형마다 수 = `questions.mix`(유형 순서는 보지 않는다) |
| `offband` | 어휘 범위 밖 단어 | P4a `offbandRatio`(단계 = 수업 단계, 새 단어 = `newWords`, 고유 명사 = 글로서리 `proper`) ≤ seed.max_offband_ratio + FLOAT_TOLERANCE |
| `glossary` | 글로서리 | P4a `glossaryMissing` 이 비었다(기능어는 vocab 품사 `function`, 정할 것 ㄴ) |

쓰기:

| 규칙 | 6.4 행 · 정본 | 기준 |
|---|---|---|
| `writing-shape` | 6.3 · 3.3 | `content.shape` 가 단계와 맞다(규격 파일 정합의 키 규칙과 같음) |
| `amount`(items) | 분량 | 단어 꼴 문항(`pick-word` · `copy-tiles` · `fill-letters` · `dictation` · `build-tiles`) 수 = `amount.words`, `assemble-phrase` 수 = `amount.phrases`, `assemble-sentence` 수 = `amount.sentences`(없는 칸은 0). 문항 유형이 `amount.itemTypes` 안. 문장 문항의 첫 허용 정답 낱말 수가 `sentenceWords` 안 |
| `answer`(items) | 정답 | 허용 정답 1개 이상(규격), `pick-word` 는 첫 허용 정답 = 정답 보기, 타일 문항은 타일로 첫 허용 정답의 글자를 만들 수 있다, `fill-letters` 는 빈칸을 타일로 차례대로 채우면 첫 허용 정답, 조립 문항은 카드 모음(소문자) = 첫 허용 정답의 낱말과 문장 부호 모음(소문자)(정할 것 ㄹ) |
| `writing-cards` | 3.3 쓰기 3단계 | 문장 조립 카드는 모두 소문자이고(대문자는 아이가 바꾼다), 문장 부호는 따로 한 장이며 낱말 카드에 붙지 않는다. 문장 부호 카드가 하나 이상 있다 |
| `amount`(guided) | 분량 | 문장 틀 수가 `amount.sentences` 안, `input` 이 `word-box` 면 틀마다 `wordBox`(2개 이상) |
| `amount`(composition) | 분량 | 예시문의 문장 수 · 낱말 수가 `amount.sentences` · `amount.words` 안(있을 때)(제안: 6.4 '분량'을 예시문에 건다, 위험 4) |
| `vocab-allocation`(composition) | 어휘 배정 | 새 단어마다 과제 · 예시 · 힌트(role `prompt` · `example` · `hint`) 가운데 하나에 나온다 |

말하기(3.3 말하기 표의 수는 모두 단계 규격 칸에서 읽는다):

| 규칙 | 6.4 행 | 기준 |
|---|---|---|
| `speaking` | 말하기 수업 | 따라 말하기 단어 수 = `repeat.words`, 문장 수 = `repeat.sentences`, 문장 낱말 수가 `repeat.sentenceWords` 안(있을 때). 듣기 문항 수 = `listening.items`, 문항 `kind` = `listening.options`. 질문 수 = `questions.count`. 바른 답은 `modelAnswer` 가 참일 때 있고 거짓일 때 없다. `acceptedMin` > 0 이면 허용 답이 그 수 이상. `koMeaning` 이 참이면 한국어 뜻이 있다. 바른 답의 문장 수가 `answerSentences` 안(둘 다 있을 때). `pictureTask` 는 규격에 있을 때만 있고 그림 수가 `pictureTask.images` 안, 장면 설명이 비지 않았다. `presentation` 은 규격에 있을 때만 있고 쓸 말 수 = `presentation.prepWords`, 예비 확인 질문 수 = `presentation.confirmQuestions` |
| (규격) | 말하기 수업 | 5~8단계 수업에 대화 주고받기 같은 모르는 칸이 있으면 P4a 규격(모르는 키 거부)에서 걸린다. c 의 명령은 이것을 `schema` 오류로 낸다 |

## 작업 순서 (Order of work)

한 구현자(implementer · Opus · high)가 차례로 한다. 명령은 `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴이다(서브에이전트 환경이 `source` 를 막는다, 19:3x 고침). 시작 전에 P4a 재검토의 Minor 둘(M-8 문장 자르기 줄임말 왼쪽 경계 · M-9 서수 꼬리 오른쪽 경계, `review-p04a-2.md`)을 `text.ts` 에서 먼저 고친다(컨트롤러 19:3x). 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 시험의 설계 숫자는 P4a 만들기 함수의 `defaultSettings()` · 단계 규격 견본에서 읽는다.

1. [검증] `allocate.ts`. 시험 먼저(아래 증명의 AC-7c · 3.2 관계 표 줄). 완료: 시험 통과.
2. [검증] `reference-index.ts`. 시험 먼저(규격 파일 정합 줄, 그림 정합은 `seed-validator-image.test.ts`). 완료: 시험 통과, 견본 규격 파일의 정합 결과 0.
3. [검증] `check-lesson.ts` 수업 공통(`layout` · `vocab-allocation` · `unit-words` · `learning-elements` · `forbidden` · `answer`). 시험 먼저(`seed-validator-reading.test.ts` 의 6.4 줄). 완료: 시험 통과.
4. [검증] 읽기(`amount` · `offband` · `glossary` · `image`). 시험 먼저(AC-3a · AC-3b). 완료: 시험 통과.
5. [검증] 쓰기. 시험 먼저(`seed-validator-writing.test.ts`). 완료: 시험 통과.
6. [검증] 말하기. 시험 먼저(AC-5b · 5g · 5h). 완료: 시험 통과.
7. [검증] 마무리. 견본 수업이 모두 오류 0(만들기 함수를 고쳤다면 P4a 시험도 통과). `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` 0, `pnpm spec:trace` 의 missing-test 가 시작 때보다 6 적다(AC-3a · 3b · 5b · 5g · 5h · 7c). 완료: 구현 보고에 출력.
8. [사람] 검토 · 커밋(H14). code-reviewer(Opus · xhigh) 검토와 fix(3회까지) 뒤 요청자 지시로 컨트롤러가 커밋한다. 완료: 커밋, c 브리프 시작.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 원형 찾기는 vocab 의 활용형에 기댄다. 불규칙 활용형 · 축약형이 vocab 에 없으면 새 단어가 '글에 없다'로 걸린다 | 맞는 수업이 막힌다 | 시험에 불규칙형 · 축약형 사례를 둔다. P6 에 '활용형 칸에 불규칙형 · 축약형을 모두 적는다'를 브리프로 넘긴다(보고 '다른 P 에 넘길 것'). `unit-words-unlisted` 는 경고로만 둔다 |
| 2 | 부동소수 비교(관계 표 경계 6 · 범위 밖 5% 경계) | 경계값이 걸리거나 새어 나간다 | `V − L ≥ V × 비율` 꼴과 `FLOAT_TOLERANCE` 로 비교하고 경계 시험을 둔다 |
| 3 | 만들기 함수(P4a 파일)를 고치다 P4a 시험이 깨진다 | 바탕 브랜치가 빨갛게 된다 | 작업 7 에서 단위 시험 전체를 돌린다. 꼴은 바꾸지 않는다 |
| 4 | 쓰기 6단계 이상 예시문 분량 검사는 6.4 '분량'을 예시문에 건 해석이다 | 표본이 이 규칙에 자주 걸릴 수 있다 | 표본(P8)에서 걸림이 많으면 컨트롤러가 경고로 내린다(규칙 한 줄) |
| 5 | 학습 요소 범위를 3.6 글자대로 짰다(정할 것 ㅅ) | 같은 단계 앞 단원 요소를 쓴 수업이 걸린다 | 컨트롤러가 넓히면 `allowedForms` 의 비교 한 줄만 바뀐다 |
| 6 | 규격 파일 정합을 오류로 둔다(정할 것 ㄹ) | P6 의 규격 파일 PR 이 이 규칙으로 막힌다 | 의도다. P6 완료 판정이 '규격 파일 검증 오류 0' 이다 |
| 7 | 검사 결과 꼴과 `index` 꼴을 c 가 그대로 쓴다 | c 에서 꼴을 바꾸면 b 시험이 깨진다 | 이 plan 의 '규격 파일 정합' 끝 문단과 칸 검사 첫 문단이 약속이다 |

### 정할 것 · 제약 · 확인한 사실

정할 것은 P4a 의 ㄱ~ㅍ 가운데 ㄴ(기능어) · ㄷ(상수) · ㄹ(6.4 밖 오류) · ㅂ(알파벳 단원) · ㅅ(학습 요소 범위)가 이 plan 에 닿는다. 제약과 확인한 사실은 P4a 와 같다. 이 plan 만의 확인 사실은 없다(새 패키지 · 외부 문서를 쓰지 않는다).

컨트롤러 결정(구현 뒤 2026-10-16 20:3x, 구현자 보고 `task-p04b-report.md`): 해석 1~11 은 검토자 판정 뒤 확정(1 미리보기 제외 · 2 지문 낱말 수 셈 · 3 모음 같음 · 4 layout 한 건 · 5 정합 건너뛰기 · 6 겹침 단원마다 · 7 쓰기 정답 · 카드 · 8 WORD_BOX_MIN · 9 말하기 · 10 읽기 유형 한 건 · 11 AC-5b 규격 거부). 요청 1(`WORD_BOX_MIN` 2)은 C54 (2) 원칙대로 `structure.ts` 로 옮긴다(fix 라운드 때 structure.ts 허락). 요청 2(형태 표 정규식의 낱말 경계 · 활용형 칸에 불규칙형 · 축약형 · 줄임말은 점까지)는 P6 브리프에, 요청 3(회화 견본 단원 단어)은 P4c 브리프에 넘긴다. 검토는 rev-p04a 가 이어 본다(`task-p04b-review.md`).

검토 뒤 결정(2026-10-16 20:4x, `review-p04b.md` Approved C 0 · I 0 · M 4): 해석 1~11 은 8(WORD_BOX_MIN)만 고치고 나머지 수용, 요청 1~3 수용. M-1(규격 파일 일부가 깨지면 칸 검사가 예외 · 잘못된 오류) · M-2(견본 형태 표 `past-ed` 가 red 를 잡음 — 낱말 목록으로 바꾸고 `under the bed` 되돌림 · red 통과 사례 고정) · M-3(메시지에 박힌 '(1~3단계)') · M-4(베끼기 · 채우기 · 받아쓰기의 word · audioText 가 허용 정답과 같은지 — plan 밖이지만 결정적 검사가 싸므로 `answer` 규칙에 더한다, 쓰기 '정답' 행 보완) 넷과 WORD_BOX_MIN 옮기기는 P4c 의 '먼저 할 것'으로 묶어 재검토 없이 P4c 검토가 덮는다. P4c 메모: `allowedForms('story')` 에는 구간 첫 단계를 넘긴다, 칸 검사 path 는 수업 객체 기준.

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-7c | 단위 "AC-7c 어휘 배정: 30단어 · k 5 · 정규 10 → 배정 수업 6개에 5개씩, 다지기 4" · "AC-7c 어휘 배정: 30단어 · k 4 · 정규 13 → 4 · 4 · 4 · 4 · 4 · 4 · 4 · 2 와 다지기 5" · "AC-7c 어휘 배정: 30단어 · k 3 · 정규 15 → 배정 10 · 다지기 5" · "AC-7c 어휘 배정: 최소 수업 수는 배정 수업 수와 unit.min_lessons 가운데 큰 값이다" · "AC-7c 단원 틀: 쓰기 6단계 이상은 level_specs 의 k · 정규 · 최소 수업 수를 쓴다" | `tests/unit/vocab-allocate.test.ts` |
| 3.2 관계 표 · 규격 파일 정합(정할 것 ㄹ) | 단위 "3.2 관계 표: 마지막 배정 수업 새 단어 6 은 30 × (1 − 0.8) 경계라 통과하고 7 이면 걸린다" · "3.2 관계 표: unit.max_remedial 이 seed.remedial_per_unit 보다 크면 걸린다" · "3.2 관계 표: 배정 수업 수가 정규 수업 수보다 많으면 걸린다" · "규격 파일: 설정값 키가 없거나 수가 아니면 오류" · "규격 파일: 단원 단어 수가 unit.vocab_count 와 다르면 오류" · "규격 파일: 단원 단어의 단계 어휘 범위가 단원 단계와 다르면 오류" · "규격 파일: 한 영역에서 한 단어가 두 단원의 단원 단어면 오류" · "규격 파일: 쓰기 6단계 이상 단계 규격에 단원 틀이 없으면 오류" | `tests/unit/vocab-allocate.test.ts` |
| AC-3a | 단위 "AC-3a 읽기 4단계: 55~80단어 지문 · 사실 확인 4문제 수업은 통과한다" · "AC-3a 읽기 4단계: 54단어 · 81단어 지문을 거부한다" · "AC-3a 어휘 범위 밖: 5% 는 통과하고 5% 를 넘으면 거부한다(새 단어 · 고유 명사는 빼고 센다)" · "AC-3a 글로서리: 기능어 밖 낱말이 글로서리에 없으면 거부한다". e2e 몫은 P11 | `tests/unit/seed-validator-reading.test.ts` |
| 6.4 수업 공통 | 단위 "6.4 분량: 문항 수 · 유형별 수가 단계 규격과 다르면 거부한다" · "6.4 정답: 정답 번호가 보기 밖이면 거부한다" · "6.4 어휘 배정: 배정표의 새 단어가 수업 글에 없거나 새 단어 목록이 배정표와 다르면 거부한다" · "6.4 학습 요소 범위: 문장 길이 상한 + 1 과 범위 밖 형태(5단계 지문의 과거형)를 거부한다" · "6.4 금지 내용: 금지어 · 정규식 · 연락처 꼴에 걸린 글을 거부한다" · "6.3 단원 단어 목록: 글에 없는 단원 단어를 적으면 오류, 글에 있는데 빠지면 경고" · "6.3 수업 번호: 종류와 수업 번호 · 변형이 단원 틀과 어긋나면 거부한다" | `tests/unit/seed-validator-reading.test.ts` |
| AC-3b | 단위 "AC-3b 읽기 1단계: 그림 보기 단어의 그림 키가 모두 카탈로그에 있으면 통과한다" · "AC-3b 읽기 1단계: 카탈로그에 없는 그림 키 · 그림 키가 없는 단어를 보기에 넣으면 거부한다" · "AC-3b 규격 파일: vocab 의 그림 키가 카탈로그에 없거나 카탈로그 단어가 vocab 에 없으면 오류" · "6.4 그림: 쓰기 그림 보고 고르기와 말하기 듣고 그림 고르기의 그림 키도 본다" | `tests/unit/seed-validator-image.test.ts` |
| AC-5b | 단위 "AC-5b 말하기 1단계: 따라 말하기 단어 5 · 문장 5, 듣기 3, 질문 답 4 수업은 통과한다" · "AC-5b 말하기 6단계: 문장 3, 듣기 3, 그림 보고 말하기 1 · 질문 답 4 수업은 통과한다" · "AC-5b 말하기 10단계: 따라 말하기 없음, 듣기 3, 발표와 예비 확인 질문 3 수업은 통과한다" · "AC-5b 말하기 5~8단계: 대화 활동 칸이 든 수업을 거부한다". e2e 몫은 P11 | `tests/unit/seed-validator-speaking.test.ts` |
| AC-5g | 단위 "AC-5g 그림 보고 말하기: 그림 2~3장과 장면 설명이 있으면 통과하고, 카탈로그 밖 그림 키와 장면 설명 없음을 거부한다". e2e 몫은 P11 | `tests/unit/seed-validator-speaking.test.ts` |
| AC-5h | 단위 "AC-5h 말하기: 1단계 따라 말하기 문장 4 · 5단계 질문 답 4 수업을 거부한다" · "AC-5h 말하기: 허용 답이 둘인 1~2단계 질문과 한국어 뜻이 없는 1~4단계 질문을 거부한다" · "AC-5h 말하기: 예비 확인 질문이 둘인 9~12단계 수업을 거부한다" | `tests/unit/seed-validator-speaking.test.ts` |
| 6.4 쓰기 | 단위 "6.4 분량(쓰기 1~2단계): 단어 6 · 단어 6 + 어구 3 이 아니면 거부한다" · "6.4 분량(쓰기 3단계): 문장 5개 · 3~5단어가 아니면 거부한다" · "6.4 정답(쓰기 1~3단계): 허용 정답이 없거나 카드 · 타일로 만들 수 없으면 거부한다" · "3.3 쓰기 3단계: 대문자 카드와 문장 부호가 붙은 카드를 거부한다" · "6.4 분량(쓰기 4~5단계): 문장 틀 수가 범위 밖이면 거부한다" · "6.4 어휘 배정(쓰기 6단계 이상): 새 단어가 과제 · 예시 · 힌트에 없으면 거부한다" · "6.3 쓰기 모양: 단계와 맞지 않는 모양을 거부한다" | `tests/unit/seed-validator-writing.test.ts` |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` 0. `pnpm spec:trace` missing-test −6 | 작업 7 |

시험 이름의 숫자는 시험 설명일 뿐이고 시험 안의 값은 `defaultSettings()` · 단계 규격 견본에서 읽는다. 시험 이름은 글자 그대로 적는다(spec-trace).

## 완료 보고 (Done)

- 구현: impl-p04a(implementer · Opus · high)가 P4a 와 같은 격리 워크트리(`agent-a6ef72438a158a2f3`, 브랜치 `feature/1a-p04a-seed-spec`)에서 이어 함(16분). 보고 `task-p04b-report.md`(워크트리의 장부 폴더).
- 실제 바뀐 파일: 표의 새 파일 여덟 + `builders.ts`(견본 내용 · `…Draft` 분리 · `withUsedUnitWords`). P4a 재검토 Minor 둘로 `text.ts` · `seed-text.test.ts` 도 고침. 공용 파일 · 잠금 파일 변화 0.
- 계획과 다르게 한 것: 미리보기는 배정 · 단원 단어 확인에서 뺌, 배정표와 새 단어는 모음 같음, `layout` 은 수업 하나에 한 건, 설정값 정합 오류 때 그 설정을 쓰는 정합 검사 건너뛰기, 쓰기 카드 규칙은 문장 조립에만, `WORD_BOX_MIN` 은 우선 check-lesson.ts(P4c 에서 structure.ts 로).
- 시험 · 명령: 시험 117(새 43, 증명 표 글자 그대로), lint 0 · build · check:deps 0 · check:bundle 0 · spec-trace missing-test 66 → 60(AC-3a · 3b · 5b · 5g · 5h · 7c).
- 검토: `review-p04b.md` Approved(C 0 · I 0 · M 4) — M 넷은 P4c '먼저 할 것'으로.
- 남긴 것: P6 브리프 메모(형태 표 정규식 낱말 경계 · 활용형 칸 불규칙형 · 축약형 · 줄임말 점까지), 회화 견본 unitWords 는 P4c. 커밋: f27ae15(브랜치 `feature/1a-p04b-seed-checks`, P4a 커밋 위, 요청자 지시 21:1x). P4c 첫 일의 고침(M-1 · M-3 · M-4 · WORD_BOX_MIN)이 함께 들어 있다. P4c 는 `feature/1a-p04c-seed-validate` 로 이어 간다.
