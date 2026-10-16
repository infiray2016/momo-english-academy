# 구현 보고: P4b 어휘 배정 · 칸 검사(implementer · Opus · high, P4a 워크트리 이어 하기)

상태: DONE_WITH_CONCERNS(설계는 그대로 따랐다. 아래 '요청하는 변경' 1 · 2 와 '남은 우려'를 검토에서 봐 주기 바란다)

- 고친 파일은 허용 목록 안이다: 새 파일 여덟, builders.ts 견본 내용, text.ts · seed-text.test.ts.
- 공용 파일 · git 쓰기는 0, 새 패키지는 0 이다.
- 견본 수업 아홉(읽기 1 · 4, 쓰기 1 · 3 · 4 · 6, 말하기 1 · 6 · 10)의 칸 검사 결과는 오류 · 경고 모두 0 이다.
- 기본 · 작은 틀 규격 파일의 정합 결과도 0 이다.

## P4a 파일 변경(재검토 Minor 둘과 견본)

- **M-8**: `src/core/seed/text.ts:34~41`. `endsWithAbbreviation` 이 이제 영문자 · 점이 아닌 글자에서 거슬러 보기를 멈춘다(`ABBREVIATION_CHAR`). 토큰 갈래와 같은 왼쪽 경계다.
  - 이 바꿈으로 쓰지 않게 된 `OPENERS` 상수를 지웠다.
  - 시험 "5절 문장 끝: …"(seed-text.test.ts:102~)에 세 사례를 더했다: `We eat at 7a.m. every day.` 는 한 문장, `Tori—Mr. Momo's dog—runs fast.` 는 한 문장, `Hi,Mr. Momo. Bye.` 는 두 문장.
  - 검토 사례의 `Kim` 은 사람 이름이라 앱 안 이름 `Momo` 로 바꿨다(시험 시드에 사람 이름 금지).
- **M-9**: `text.ts:108`. 수 갈래를 `\d+(?:[.,]\d+)*(?:(?:st|nd|rd|th)(?![A-Za-z]))?` 로 바꿨다.
  - 시험 "3.6 문장 길이: …"(:154~)에 더한 사례: `100steps` → 100 · steps, `3rdx` → 3 · rdx, `7am` → 수 7 · 낱말 am.
  - 대문자 서수(`2ND`)는 지금처럼 2 · ND 로 쪼개진다.
  - 이스케이프 줄(:11 · :13 · :28)이 ASCII `\uXXXX` 인 것을 바이트로 다시 확인했다.
- **M-8 · M-9 의 순서**: 고침과 시험을 한 번에 넣어, 시험이 고침 전에 실패하는 것을 따로 보지 않았다. 고침 전 실패는 검토 재현과 같다.
- **builders.ts**(꼴은 그대로, 내용만 바꿈):
  - 공개 이름은 그대로 두고 읽기 · 쓰기 · 말하기 견본 함수 본문을 `…Draft` 로 옮겼다(:1263 · :1414 · :1575).
  - 공개 함수 `readingLesson` · `writingLesson` · `speakingLesson`(:1792~)은 `withUsedUnitWords`(:1765)로 `unitWords` 를 채운다. 수업 글(미리보기 밖 영어 role)에 나온 단원 단어를 넣는다. 그래서 `unit-words-unlisted` 경고가 0 이다.
  - 이를 위해 `ENGLISH_ROLES`(check-lesson) · `textsOfLesson` · `buildLexicon` · `wordIdsIn` 을 가져온다.
  - 말하기 6단계 듣기 보기 `under the bed` 를 `under the chair` 로 바꿨다(:1686). 견본 형태 표의 `past-ed` 정규식 `\b[a-z]+ed\b` 가 `bed` 를 과거형으로 잡기 때문이다.
  - P4a 시험 25 는 그대로 통과한다.

## 바뀐 파일:줄(P4b 새 파일, Biome 형식 뒤)

| 파일 | 줄 | 무엇 |
|---|---|---|
| `src/core/vocab/allocate.ts` | 1~229 | `resolveUnitFrame` · `allocateUnit` · `assignedLessonCount` · `lastLessonWords` · `checkFrameRelations` |
| `src/core/seed/reference-index.ts` | 1~535 | 아래 '내보내기'의 index · 정합 검사 · 검사 결과 꼴 |
| `src/core/seed/check-lesson.ts` | 1~956 | 수업 공통(`checkLessonCommon`) · 읽기 · 쓰기 · 말하기 · `checkLessonCell` |
| `tests/unit/vocab-allocate.test.ts` | 1~362 | AC-7c 5 · 3.2 관계 표 3 · 규격 파일 5 |
| `tests/unit/seed-validator-reading.test.ts` | 1~331 | AC-3a 4 · 6.4 수업 공통 7 |
| `tests/unit/seed-validator-image.test.ts` | 1~178 | AC-3b 3 · 6.4 그림 1 |
| `tests/unit/seed-validator-speaking.test.ts` | 1~214 | AC-5b 4 · AC-5g 1 · AC-5h 3 |
| `tests/unit/seed-validator-writing.test.ts` | 1~256 | 6.4 쓰기 7 |

## 설계와 다르게 한 것 · 해석한 것

1. **미리보기는 배정 · 단원 단어 확인에서 뺐다.** `vocab-allocation`(새 단어가 수업 글에 나오는지)과 `unit-words` 는 `preview.*` 글 조각을 보지 않는다. 미리보기 예문은 새 단어를 늘 담으므로, 넣으면 검사가 늘 통과해 아무것도 걸러내지 못한다. 학습 요소 · 금지어 검사는 미리보기를 포함해 모든 조각을 본다.
2. **지문 낱말 수**는 `sentenceWords(passage)`(낱말 · 수 · 틀 자리 · 빈칸 토큰 수)로 센다. 3.6 문장 길이와 같은 셈이다.
3. **배정표와 새 단어 비교는 모음 같음**으로 본다(차례는 보지 않는다, plan '같은 모음').
   - 배정 · 알파벳 수업의 기대 새 단어는 배정표의 그 수업 번호 칸이다. 알파벳 단원은 배정 함수를 단원 0 어휘에 그대로 쓰므로(C54 (4)), 배정 수 A 를 넘는 알파벳 수업 번호의 새 단어는 빈 목록이다.
   - 수업 번호가 범위 밖이면 `layout` 과 `vocab-allocation` 이 함께 걸릴 수 있다.
4. **`layout` 은 수업 하나에 한 건**만 낸다. 종류 위반(alphabet 이 단원 0 밖 등)이 있으면 그 수업 번호 범위는 따로 보지 않고, 변형 위반은 따로 한 건이다. 단원 틀 · 배정표를 구할 수 없으면(규격 파일 오류) `layout` 오류 한 건을 낸다.
5. **규격 파일 정합의 건너뛰기.** 설정값 정합(`settings`)에 오류가 하나라도 있으면 설정값을 쓰는 검사를 건너뛴다(빈 단계 경계 포함). 건너뛰는 검사는 `frame-*` · 단원 단어 수 · 쓰기 모양 · 단원 틀 · `allocation` 이다. 빠진 규격 파일은 `buildReferenceIndex` 결과의 `missing` 에 이름을 낸다.
6. **`reference-unit-word-dup`** 은 한 영역에서 그 단어를 처음 본 단원 다음의 단원마다 낸다. 영역이 다르면 걸지 않는다.
7. **쓰기 문항 정답 · 카드:**
   - 타일 문항은 첫 허용 정답을 타일(헷갈리게 하는 타일이 있어도 됨, 각 타일 한 번)로 앞에서부터 이어 만들 수 있는지 본다.
   - `fill-letters` 는 빈칸 묶음마다 필요한 글자를 남은 타일로 차례대로 채울 수 있는지 보고, 빈칸 꼴의 나머지 글자 · 길이가 정답과 같은지 본다(어긋나면 path `pattern`).
   - 조립 문항은 카드(소문자)와 정답의 낱말 · 문장 부호(소문자) 모음을 견준다.
   - `writing-cards` 는 문장 조립(`assemble-sentence`)에만 건다(3.3 쓰기 3단계). 어구 조립에는 대소문자 · 문장 부호 규칙이 정본에 없다.
8. **쓰기 단어 상자 '2개 이상'**은 plan-p04b 문장의 수라 `check-lesson.ts` 안 이름 붙인 상수 `WORD_BOX_MIN` 으로 두었다. structure.ts 는 이 일의 허용 파일이 아니다(요청하는 변경 1).
9. **말하기:**
   - 바른 답이 있는지는 `modelAnswer` 참 · 거짓으로 양쪽을 다 본다. 1~3단계에 없으면 오류이고, 4단계부터 있어도 오류다.
   - 장면 설명이 비었는지는 규격(`Text`, 공백 거부)이 먼저 막고, 칸 검사도 한 번 더 본다.
   - 그림 보고 말하기 그림 키의 카탈로그 확인은 `image`, 그림 수 · 있고 없음은 `speaking` 규칙으로 낸다.
10. **읽기 `amount`:** 문항 유형별 수 위반은 유형 이름을 묶어 한 건으로 낸다.
11. **AC-5b '5~8단계 대화 활동'**은 plan 대로 규격(모르는 키 거부)에서 걸린다. 시험은 5~8단계 수업 파일 각각에 대화 칸을 넣어 `LessonFileSchema` 가 거부하는지 보고, 견본 말하기 6단계 내용 칸이 넷(repeat · listening · questions · pictureTask)뿐인지 본다.

## 요청하는 변경

1. **structure.ts:** 칸 검사의 꼴 수 `WORD_BOX_MIN`(2, plan-p04b 쓰기 guided)을 P4a '상수' 표 원칙(C54 (2))에 맞게 `structure.ts` 로 옮길지 정해 주기 바란다. 옮기면 P7 check-ids 허용 목록과도 맞는다. 지금은 check-lesson.ts 에 정본 출처 주석과 함께 있다.
2. **P6 브리프에 넘길 것:**
   - 형태 표 정규식은 낱말 경계를 정확히 잡게 써야 한다. 견본의 `past-ed` 꼴 `\b[a-z]+ed\b` 는 bed · red 를 과거형으로 잡는다. 불규칙형 목록 또는 vocab 활용형과 함께 쓰는 꼴이 좋다.
   - 활용형 칸에는 불규칙형 · 축약형을 모두 적는다(plan 위험 1).
   - 줄임말은 점까지 적는다(재검토 범위 밖 관찰).
3. **P4c 에 넘길 것:** 회화 카드 견본(builders `talkLesson`)의 `unitWords` 는 새 단어만 담고 있어 회화 몫 role 로 `checkLessonCommon` 을 부르면 `unit-words-unlisted` 경고가 날 수 있다. 회화 견본의 단원 단어 채우기는 c 몫으로 남겼다.

## 시험 이름 전부(증명 표 43개를 글자 그대로, 더한 이름 없음)

`tests/unit/vocab-allocate.test.ts`(13):
- AC-7c 어휘 배정: 30단어 · k 5 · 정규 10 → 배정 수업 6개에 5개씩, 다지기 4
- AC-7c 어휘 배정: 30단어 · k 4 · 정규 13 → 4 · 4 · 4 · 4 · 4 · 4 · 4 · 2 와 다지기 5
- AC-7c 어휘 배정: 30단어 · k 3 · 정규 15 → 배정 10 · 다지기 5
- AC-7c 어휘 배정: 최소 수업 수는 배정 수업 수와 unit.min_lessons 가운데 큰 값이다
- AC-7c 단원 틀: 쓰기 6단계 이상은 level_specs 의 k · 정규 · 최소 수업 수를 쓴다
- 3.2 관계 표: 마지막 배정 수업 새 단어 6 은 30 × (1 − 0.8) 경계라 통과하고 7 이면 걸린다
- 3.2 관계 표: unit.max_remedial 이 seed.remedial_per_unit 보다 크면 걸린다
- 3.2 관계 표: 배정 수업 수가 정규 수업 수보다 많으면 걸린다
- 규격 파일: 설정값 키가 없거나 수가 아니면 오류
- 규격 파일: 단원 단어 수가 unit.vocab_count 와 다르면 오류
- 규격 파일: 단원 단어의 단계 어휘 범위가 단원 단계와 다르면 오류
- 규격 파일: 한 영역에서 한 단어가 두 단원의 단원 단어면 오류
- 규격 파일: 쓰기 6단계 이상 단계 규격에 단원 틀이 없으면 오류

`tests/unit/seed-validator-reading.test.ts`(11):
- AC-3a 읽기 4단계: 55~80단어 지문 · 사실 확인 4문제 수업은 통과한다
- AC-3a 읽기 4단계: 54단어 · 81단어 지문을 거부한다
- AC-3a 어휘 범위 밖: 5% 는 통과하고 5% 를 넘으면 거부한다(새 단어 · 고유 명사는 빼고 센다)
- AC-3a 글로서리: 기능어 밖 낱말이 글로서리에 없으면 거부한다
- 6.4 분량: 문항 수 · 유형별 수가 단계 규격과 다르면 거부한다
- 6.4 정답: 정답 번호가 보기 밖이면 거부한다
- 6.4 어휘 배정: 배정표의 새 단어가 수업 글에 없거나 새 단어 목록이 배정표와 다르면 거부한다
- 6.4 학습 요소 범위: 문장 길이 상한 + 1 과 범위 밖 형태(5단계 지문의 과거형)를 거부한다
- 6.4 금지 내용: 금지어 · 정규식 · 연락처 꼴에 걸린 글을 거부한다
- 6.3 단원 단어 목록: 글에 없는 단원 단어를 적으면 오류, 글에 있는데 빠지면 경고
- 6.3 수업 번호: 종류와 수업 번호 · 변형이 단원 틀과 어긋나면 거부한다

`tests/unit/seed-validator-image.test.ts`(4):
- AC-3b 읽기 1단계: 그림 보기 단어의 그림 키가 모두 카탈로그에 있으면 통과한다
- AC-3b 읽기 1단계: 카탈로그에 없는 그림 키 · 그림 키가 없는 단어를 보기에 넣으면 거부한다
- AC-3b 규격 파일: vocab 의 그림 키가 카탈로그에 없거나 카탈로그 단어가 vocab 에 없으면 오류
- 6.4 그림: 쓰기 그림 보고 고르기와 말하기 듣고 그림 고르기의 그림 키도 본다

`tests/unit/seed-validator-speaking.test.ts`(8):
- AC-5b 말하기 1단계: 따라 말하기 단어 5 · 문장 5, 듣기 3, 질문 답 4 수업은 통과한다
- AC-5b 말하기 6단계: 문장 3, 듣기 3, 그림 보고 말하기 1 · 질문 답 4 수업은 통과한다
- AC-5b 말하기 10단계: 따라 말하기 없음, 듣기 3, 발표와 예비 확인 질문 3 수업은 통과한다
- AC-5b 말하기 5~8단계: 대화 활동 칸이 든 수업을 거부한다
- AC-5g 그림 보고 말하기: 그림 2~3장과 장면 설명이 있으면 통과하고, 카탈로그 밖 그림 키와 장면 설명 없음을 거부한다
- AC-5h 말하기: 1단계 따라 말하기 문장 4 · 5단계 질문 답 4 수업을 거부한다
- AC-5h 말하기: 허용 답이 둘인 1~2단계 질문과 한국어 뜻이 없는 1~4단계 질문을 거부한다
- AC-5h 말하기: 예비 확인 질문이 둘인 9~12단계 수업을 거부한다

`tests/unit/seed-validator-writing.test.ts`(7):
- 6.4 분량(쓰기 1~2단계): 단어 6 · 단어 6 + 어구 3 이 아니면 거부한다
- 6.4 분량(쓰기 3단계): 문장 5개 · 3~5단어가 아니면 거부한다
- 6.4 정답(쓰기 1~3단계): 허용 정답이 없거나 카드 · 타일로 만들 수 없으면 거부한다
- 3.3 쓰기 3단계: 대문자 카드와 문장 부호가 붙은 카드를 거부한다
- 6.4 분량(쓰기 4~5단계): 문장 틀 수가 범위 밖이면 거부한다
- 6.4 어휘 배정(쓰기 6단계 이상): 새 단어가 과제 · 예시 · 힌트에 없으면 거부한다
- 6.3 쓰기 모양: 단계와 맞지 않는 모양을 거부한다

시험 이름은 plan 증명 표와 대조해 43개가 모두 같음을 확인했다. 시험 안의 수는 `defaultSettings()` · `settingNumber` · 단계 규격 견본(`index.levelSpec`) · 상수(`READING_OPTIONS`)에서 읽는다. 경계 시험은 경계 그대로 통과와 경계 + 1 거부를 함께 본다(관계 표 6 → 7, 범위 밖 1/20 → 2/20, 지문 55 · 80 통과와 54 · 81 거부, 문장 상한 그대로와 + 1).

순서는 시험 먼저였다. 다섯 시험 파일을 먼저 쓰고 '모듈 없음'으로 5 파일 모두 실패하는 것을 본 뒤 allocate → reference-index → check-lesson 차례로 구현했다. 칸 검사 시험은 처음 돌릴 때 7개가 견본 내용(단원 단어 목록 · bed) 때문에 실패했고, 견본을 고쳐 통과시켰다.

## 명령과 출력(PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin)

- `pnpm lint`: Checked 41 files, No fixes applied
- `pnpm test`: Tests 117 passed(전 74 + 새 43)
- `pnpm check:deps`: ✔ no dependency violations found (17 modules, 31 dependencies cruised)
- `pnpm exec tsc --noEmit`: 오류 0
- `pnpm build`: Compiled successfully in 363ms, Finished TypeScript in 1412ms, 정적 3/3
- `pnpm check:bundle`: 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0
- `pnpm spec:trace`(인자 없음): 15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 28 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 60(66 → 60)

## c 가 쓸 내보내기

- **`src/core/vocab/allocate.ts`**
  - 함수: `resolveUnitFrame({ area, level, unit, levelSpec, settings, unitWordCount? })` → `UnitFrame` `{ band, vocabCount, k, regularLessons, minLessonsSetting, remedialLessons, topicVariants, remedialCoverage }`.
  - 함수: `allocateUnit({ words, k, regularLessons, minLessonsSetting })` → `Allocation` = `{ ok: true, lessons: { lessonNo, kind: 'assigned' | 'reinforce', newWords }[], assignedCount, reinforceCount, minLessons }` 또는 `{ ok: false, reason: 'empty-words' | 'bad-k' | 'too-many-assigned' }`.
  - 함수: `checkFrameRelations({ settings, levelSpecs })` → `FrameViolation[]` `{ rule, band, area?, level?, message }`.
  - 그 밖: `assignedLessonCount` · `lastLessonWords` · `SettingsReader`.
- **`src/core/seed/reference-index.ts`**
  - `buildReferenceIndex(Partial<ReferenceFiles>)` → `{ index, issues: SeedIssue[], missing: SeedFileName[] }`. `ReferenceFiles` 의 열쇠는 `SEED_FILES` 와 같고 builders `ReferenceSet` 꼴과도 같다.
  - `SeedIssue` = `{ rule, severity: 'error' | 'warning', message(한국어), file(seed/ 기준), cell?(칸 키), path(파일 · 객체 안 점 경로) }`.
  - `ReferenceIndex`:
    - 설정 · 규격: `num(key)`(없으면 예외), `levelSpec(area, level)`, `unitSpec(area, level, unit)`, `unitsOf(area, level)`(단원 번호 차례, 단원 0 포함)
    - 목록: `lexicon`, `vocab: Map<word, VocabEntry>`, `images: Map<key, ImageEntry>`, `forms`, `forbidden`, `homophones`, `metaSentences`
    - 단원 · 형태: `frame(area, level, unit)`, `allocation(area, level, unit)`, `allowedForms(area, level, unit | 'test' | 'story')` → `Set<형태 id>`, `writingShape(level)`
  - 상수: `REQUIRED_SETTING_KEYS`(45) · `BAND_SETTING_PREFIXES` · `SINGLE_SETTING_KEYS`.
  - 정합 규칙 이름: `settings` · `frame-assigned-fits` · `frame-last-lesson` · `frame-remedial` · `reference-image` · `reference-level-spec` · `reference-unit-spec` · `reference-unit-word-dup` · `reference-forms` · `allocation`.
- **`src/core/seed/check-lesson.ts`**
  - `checkLessonCell(lesson, { area: 'reading' | 'writing' | 'speaking', level, unit, file, index })` → `SeedIssue[]`(cell 은 수업 칸 키, path 는 수업 객체 기준).
  - `checkLessonCommon(lessonHead, ctx, { fragments, englishRoles, allocationRoles? })` → `SeedIssue[]`. 회화는 `textsOfLesson('talk', lesson)` 의 조각과 회화 몫 role 로 부른다. 칸 경로가 `card.…` 이고 미리보기 칸이 없으므로 배정 · 단원 단어 확인은 모든 조각을 본다.
  - 그 밖: `ENGLISH_ROLES` · `COMPOSITION_ALLOCATION_ROLES` · `LessonHead` · `LessonCellContext` · `CommonOptions` · `CheckedArea`. `SeedIssue` 는 여기서도 다시 내보낸다.
  - 칸 규칙 이름: `layout` · `vocab-allocation` · `unit-words` · `unit-words-unlisted`(경고) · `learning-elements` · `forbidden` · `answer` · `image` · `amount` · `offband` · `glossary` · `writing-shape` · `writing-cards` · `speaking`.

## 남은 우려

- 원형 찾기는 vocab 활용형에 기댄다(plan 위험 1). 실시드에서 불규칙형 · 축약형이 vocab 에 없으면, 맞는 수업이 `vocab-allocation`(새 단어가 글에 없다)이나 `unit-words` 로 걸릴 수 있다.
- 형태 표 판정은 정규식의 질에 달려 있다. 견본의 `past-ed` 꼴처럼 거친 정규식은 거짓 걸림을 만든다(위 요청 2).
- 학습 요소 범위는 3.6 글자대로다(같은 단계 앞 단원 요소도 범위 밖, 정할 것 ㅅ · plan 위험 5). 쓰기 작문 예시문 분량 검사는 6.4 '분량'을 예시문에 건 해석이다(plan 위험 4).
- `check-lesson.ts` 는 Biome 형식 뒤 956 줄이다. 영역별로 나누는 것은 c 가 회화를 더할 때 판단할 일로 두었다.
