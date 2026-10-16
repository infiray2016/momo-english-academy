# 구현 보고: P4a 시드 규격 · 글 도구(implementer · Opus · high)

상태: DONE_WITH_CONCERNS(공용 파일 변경 요청 1, 설계 해석 몇 가지는 아래 '설계와 다르게 한 것'에서 검토를 받아야 한다)
바탕: 024a4bc(격리 워크트리). git 쓰기 없음. 바뀐 파일은 허용 목록 열 개뿐이다(`git status --porcelain` 이 이 열 개만 새 파일로 보인다). `package.json` · 잠금 파일 변화 0.

## 바뀐 파일:줄(모두 새 파일, Biome 형식 뒤 줄 수)

| 파일 | 줄 | 무엇 |
|---|---|---|
| `src/core/seed/structure.ts` | 1~636 | 영역 · 단계 · 구간(`BANDS` · `bandOf` · `cefrOf`) · 종류 · 품사 · effort · 문항 유형 값, 이름 붙인 상수(plan '상수' 표 전부, 줄마다 정본 절), 부동소수 비교, 글 조각 꼴(`TEXT_ROLES` · `fragmentSink`), 칸 키(`cellKey` · `parseCellKey`), 시드 파일 배치(`SEED_FILES` · 경로 함수 · `parseSeedPath`) |
| `src/core/seed/text.ts` | 1~534 | 글 도구(plan '글 도구' 표 전부 + `offbandWords` · `resolveWord` · `normalizeQuotes`) |
| `src/core/seed/schema/reference.ts` | 1~481 | 공통 조각(`RangeSchema` · `WordIdSchema` · 판 칸 · 날짜 · 해시), 설정값 시드 · level_specs(영역 넷 갈래) · unit_specs · vocab · images · model_prices · 목록 넷 |
| `src/core/seed/schema/lesson.ts` | 1~547 | 생성 기록 · 수업 겉 · 읽기 · 쓰기 · 말하기 · 회화 수업 · 수업 파일(겉 · 전체) · 글 조각 |
| `src/core/seed/schema/talk.ts` | 1~248 | 회화 카드(`TalkCardSchema`) · 회화 평가 카드 장(`TalkTestSheetSchema`, 빈칸 ↔ 품사) · 글 조각 |
| `src/core/seed/schema/assessment.ts` | 1~377 | 단계 평가 파일 · 배치 평가 파일 · 토리 이야기 파일 · 글 조각 |
| `src/core/seed/schema/records.ts` | 1~73 | 풀이 검사 기록(seed/checks) · 표본 검토(seed/reviews) |
| `tests/unit/seed-schema.test.ts` | 1~862 | 규격 시험 16 |
| `tests/unit/seed-text.test.ts` | 1~349 | 글 도구 시험 9 |
| `tests/fixtures/seed/builders.ts` | 1~2280 | 시험용 시드 만들기(표 데이터가 Biome 형식으로 펼쳐져 길다) |

## 설계와 다르게 한 것 · 해석한 것과 이유

1. 회화 수업 규격(`TalkLessonSchema` = 수업 겉 + `card`)을 `talk.ts` 가 아니라 `lesson.ts` 에 두었다. 수업 파일 규격(lesson.ts)이 회화 수업을 가져와야 하고 회화 수업은 수업 겉(lesson.ts)을 써야 해서, plan 대로 두면 가져오기 순환이 된다(`no-circular`). 카드 · 평가 카드 장과 그 글 조각은 talk.ts 그대로다.
2. `tokenize` 의 틀 자리 토큰을 `\{[A-Z_]+\}` 뒤 소유격 `'s` 까지 한 토큰으로 했다(`{NAME}'s dog` 가 3이 아니라 2낱말). plan 꼴 그대로면 `'s` 의 `s` 가 낱말 하나로 세어진다.
3. 글 조각 role 배정에서 plan 표에 줄이 없는 칸을 이렇게 정했다(검토 바람). 내지 않음: 글로서리 `surface` · `lemma`(지문에 이미 있는 표기 · 원형 찾기 열쇠), 쓰기 그림 고르기 `picture`(단어 id), 생성 기록 전부(`note` 포함), `shape` 같은 열거 칸. 낸 role: 쓰기 `rubric` → ko, 회화 카드 `topic` → ko, 토리 이야기 `title` → ko, 발표 `prepWords` → hint, 쓰기 단어 상자 `wordBox` → piece, 베끼기 · 만들기 · 채우기 · 받아쓰기의 `word` → answer, 받아쓰기 `audioText` → script, 회화 평가 `frameEn` → hint, 말하기 질문 `en` · 발표 `topic` · 예비 확인 질문 → prompt.
4. '다지기 · 보강은 `newWords` 빈 목록'은 규격으로 막지 않고 P4b `vocab-allocation` 검사에 남겼다. 규격에서 막으면 P4b 의 그 거부 시험이 규격 오류로 먼저 걸린다.
5. 규격에 더한 것: 그림 `file` 의 이름이 그 `key` 와 같아야 함(plan '`images/vocab/<키>.(png|webp|jpg)`'을 글자대로 읽음), 금지 정규식 `id` 겹침 거부(형태 표 id 겹침과 같은 까닭). 그림 키 겹침 · vocab ↔ 그림 대응은 P4b 정합 몫이라 규격에서 보지 않는다.
6. 시각은 `z.iso.datetime({ offset: true })`(Z 또는 +09:00 둘 다 받는다), 날짜는 `z.iso.date()`(설치 판 4.6.7 에서 확인).
7. 수 아래 한계: `Range` min ≥ 0, 읽기 mix 값 ≥ 1, 보기 · 허용 답 목록은 1개 이상(평가 허용 답 셋 이상 · 보기 범위는 P4c · P4b). 형태 표 `introducedAt` 의 단계 · 단원은 정수만 보고 범위(1~12 · 1~5)는 P4b `reference-forms` 몫으로 남겼다.
8. `parseCellKey` · `parseSeedPath` 는 단원 0 을 읽기 · 쓰기 1단계에서만 받는다(`isAlphabetUnit`). 다른 곳의 단원 0 칸 키 · 경로는 null.
9. 원형 찾기의 모호성: 한 표기가 원형 여럿에 이어지면 범위 밖 비율은 하나라도 범위 안(또는 새 단어)이면 범위 안으로, 기능어 판정은 조각마다 기능어 원형이 하나라도 있으면 기능어로 본다. plan 차례대로 소유격을 축약형보다 먼저 떼므로 `it's` → `it` 하나다. 글로서리는 소유격을 뗀 표기도 받는다(`Tori's` ↔ `Tori`).
10. `smallFrameSettings()` 의 '쓰기 6단계 이상 frame 2 · 3 · 2'는 설정값 키가 아니라 level_specs 칸이라 `smallWritingFrames()` 로 나누고, 둘을 묶은 `smallReferenceSet()` 을 두었다. `referenceSet(settings, { writingFrames })` 의 기본은 3.2 값(6~9 k 6 · 정규 7 · 최소 5, 10~12 k 5 · 정규 8 · 최소 6).
11. 알파벳 단원 어휘 수는 unit.vocab_count 를 보지 않으므로(C54 (4)) 견본은 unit.new_words_per_lesson.1-3 개로 두었다(견본 선택, 설계 숫자 아님).
12. 시험 이름: 증명 표 22개는 글자 그대로다. 작업 순서 1~4 의 '시험 먼저' 사례(구간 · CEFR · 부동소수, 겹친 설정값 키 · vocab · 뒤집힌 범위 · 모르는 키, 쓰기 갈래 칸 빠짐 · 인사 턴 수)를 담으려고 이름 셋을 더했다(아래 목록의 표시 ＋). AC 접두는 없다.
13. 첫 명령: 이 실행 환경이 `source ~/.nvm/nvm.sh` 를 막아, `.nvmrc`(24)의 설치 판 가운데 가장 높은 `~/.nvm/versions/node/v24.22.0/bin` 을 PATH 앞에 두고 같은 명령을 돌렸다(Stop 관문과 같은 판 고르기). `pnpm install --frozen-lockfile` 통과. `pnpm spec:trace --plan <한글 경로>` 도 막혀, 기본 경로가 같은 파일(`DEFAULT_PLAN_PATH` = `intent/2026-10-15-모모-잉글리시-아카데미/plan.md`)이라 인자 없이 돌렸다.

## 요청하는 변경(공용 파일 · 설계)

- 공용 `.dependency-cruiser.cjs`: 브리프는 'src/core 는 파일 시스템을 가져올 수 없다(`pnpm check:deps` 가 잡는다)'라 했지만 지금 `core-no-framework` 규칙에는 `node:fs` · `fs` 가 없다. 이 plan 의 src/core 는 fs 를 쓰지 않으니 지금 통과하지만, 막으려면 규칙 `to.path` 에 `^(node:)?fs(/|$)`(P4c `validate.ts` 가 쓰는 `node:crypto` 는 허용) 같은 갈래를 더해야 한다. 컨트롤러 판단.
- 합칠 때: `structure.ts` 의 `bandOf` 를 P2a `src/core/level-band.ts` 의 것으로 바꾼다(꼴 `bandOf(level: number): Band`, `Band` = `'1-3' | '4-6' | '7-9' | '10-12'` 로 맞췄다. `Band` 타입도 그쪽으로 옮기면 가져오기 두 줄).
- P3 DB 값: 수업 종류 `assigned · reinforce · remedial · alphabet · tori_story`, 처음 · 다시 묻는 턴 `first · re_ask`, 판 `revision · correction` 정수, 배치 벌 · 주제 변형 정수, vocab `word` 가 시드 id(C54 (3))로 구현했다.

## 시험 이름 전부(＋ 는 증명 표 밖에 더한 것)

`tests/unit/seed-schema.test.ts`(16):
- 6.3 시드 규격: 칸 키를 만들고 풀면 같은 값이 나온다
- 6.3 시드 규격: 파일 경로가 영역 · 단계 · 단원과 맞는다
- ＋ 6.3 시드 규격: 단계 구간 · CEFR 과 부동소수 비교
- 6.3 시드 규격: 견본 시드가 모두 규격을 통과한다
- ＋ 6.3 시드 규격: 겹친 설정값 키 · 겹친 vocab 낱말 · 뒤집힌 범위 · 규격 파일의 모르는 키를 거부한다
- 6.3 시드 규격: 모르는 키가 든 말하기 수업(대화 활동)을 거부한다
- 6.3 시드 규격: 판 칸(revision · correction)이 0 이상 정수가 아니면 거부한다
- 6.3 시드 규격: 읽기 문항 보기가 4개가 아니면 거부한다
- ＋ 6.3 시드 규격: 쓰기 갈래 칸이 빠지거나 회화 인사 턴 수가 범위 밖이면 거부한다
- 6.3 시드 규격: 회화 평가 허용 답의 빈칸에 품사가 없으면 거부한다
- 6.3 시드 규격: 형태 표 · 금지어의 정규식이 컴파일되지 않으면 거부한다
- 6.3 시드 규격: CC-BY 그림에 저작자 표시가 없으면 거부한다
- 6.3 시드 규격: 읽기 문항 유형 수 합이 문항 수와 다르면 거부한다
- 6.3 시드 규격: 발표 문항의 확인 질문 칸과 배치 평가의 AI 과제 유형을 거부한다
- 6.3 시드 규격: 글 조각 목록이 견본의 모든 글 칸을 담는다
- 6.3 시드 규격: 쓴 시드 나무를 다시 읽으면 규격을 통과한다

`tests/unit/seed-text.test.ts`(9):
- 5절 문장 끝: Mr. · Mrs. · Dr. · a.m. · p.m. 과 숫자 사이 점에서는 자르지 않는다
- 3.6 문장 길이: 낱말 · 수 · {NAME} · 빈칸을 한 낱말로 센다
- 3.4 원형 찾기: 활용형 · 축약형 · 소유격 · 여러 낱말 표제어
- 6.4 어휘 범위 밖: 새 단어 · 고유 명사 · 수 · {NAME} 을 빼고 센다
- 6.4 글로서리: 기능어 밖 낱말 가운데 글로서리에 없는 표기형을 낸다
- 3.6 형태 표: 정규식과 낱말 목록으로 형태를 찾는다
- 6.4 금지 내용: 영어 낱말 · 한국어 부분 글 · 정규식에 걸린 곳을 낸다
- 6.4 틀 자리: {NAME} 밖의 틀 자리를 찾고 빈칸은 세지 않는다
- 글 도구: 한글이 든 문장은 영어 검사에서 뺀다

시험을 먼저 쓰고 실패(모듈 없음)를 본 뒤 구현했다. 글 조각 시험은 견본마다 문자열 칸을 훑어 '문자열 칸 수 = 글 조각 수 + 빼는 칸 수'와 경로 모음 · 글 값이 같은지를 본다(plan 위험 11). 첫 실행에서 쓰기 `content.shape`(열거 칸)를 빼는 칸으로 적지 않아 걸렸고, 빼는 칸 목록에 더해 통과했다.

## 명령과 출력(모두 PATH=…/node/v24.22.0/bin)

- `pnpm install --frozen-lockfile` → Done in 8.5s
- `pnpm biome check --write src/core/seed tests/unit/seed-*.test.ts tests/fixtures/seed` → 고친 뒤 'No fixes applied', 경고 0
- `pnpm vitest run tests/unit/seed-schema.test.ts tests/unit/seed-text.test.ts` → Test Files 2 passed, Tests 25 passed
- `pnpm lint` → Checked 33 files, No fixes applied
- `pnpm test` → Test Files 7 passed, Tests 74 passed(전 49 + 새 25)
- `pnpm check:deps` → ✔ no dependency violations found (14 modules, 21 dependencies cruised)
- `pnpm build` → ✓ Compiled successfully in 1817ms · Finished TypeScript in 1594ms · 정적 페이지 3/3. 벽시계 약 7초(시작 · 끝 시각 차). 바탕 커밋의 빌드 시간은 재지 않았다(비교값 없음). 규격은 파일 다섯으로 나누고 `z.infer` 형을 이름으로 내보냈다(plan 위험 6)
- `pnpm check:bundle`(build 뒤) → 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0
- `pnpm spec:trace`(기본 plan 경로 = 묶음 plan.md) → 15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 8 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 66(시작 때와 같다)
- `pnpm exec tsc --noEmit` → 이 plan 파일에서 오류 0(기존 `src/app/layout.tsx` 의 `LayoutProps` 는 `.next/types` 생성 전 오류이고 `next build` 에선 통과)

## b · c 가 쓸 내보내기

- `structure.ts`: `AREAS` · `Area` · `PLACEMENT_AREAS` · `LEVEL_MIN` · `LEVEL_MAX` · `BAND_NAMES` · `Band` · `BANDS` · `bandOf` · `bandInfo` · `cefrOf` · `bandKey` · `isLevel` · `isBand` · `UNITS_PER_LEVEL` · `ALPHABET_UNIT` · `isAlphabetUnit` · `isUnitOf` · `LESSON_KINDS` · `TORI_STORY_KIND` · `ASK_KINDS` · `SLOT_POS` · `FUNCTION_POS` · `VOCAB_POS` · `EFFORTS` · `READING_QUESTION_TYPES` · `READING_TEXT_QUESTION_TYPES` · `WRITING_ITEM_TYPES` · `WRITING_TEST_EXTRA_TYPES` · `SPEAKING_TEST_TYPES` · `TEST_ITEM_TYPES` · `TALK_SEGMENTS` · `TALK_HINT_TIERS` · 상수(`READING_OPTIONS` · `STORIES_PER_BAND` · `STORY_QUESTIONS` · `STORY_OPTIONS` · `STORY_KO_BANDS` · `TALK_GREETING_TURNS` · `TALK_TARGETS_PER_TURN` · `TALK_SAME_QUESTION_MAX` · `TALK_TODAY_TOPICS` · `TALK_TEST_ALLOWED_MIN` · `TALK_TEST_SAME_QUESTIONS_MAX` · `TALK_TEST_SAME_ORDER_RUN_MAX` · `TEST_AI_ITEMS_MAX` · `DISTRIBUTION_HALF` · `DISTRIBUTION_UPPER_ONLY_WIDTH` · `SENTENCE_END_ABBREVIATIONS` · `YES_NO_AUXILIARIES` · `PLACEHOLDER_NAME` · `BLANK` · `FLOAT_TOLERANCE`) · `approxEq` · `approxLe` · `approxGe` · `TEXT_ROLES` · `TextRole` · `TextFragment` · `joinPath` · `fragmentSink` · `CellRef`(`LessonCell` · `StoryCell` · `LevelTestCell` · `PlacementCell`) · `cellKey` · `parseCellKey` · `SEED_FILES` · `SeedFileName` · `SEED_UNWALKED_DIRS` · `lessonFilePath` · `levelTestFilePath` · `placementFilePath` · `storyFilePath` · `checksFilePath` · `reviewFilePath` · `SeedPath` · `SeedContentPath` · `parseSeedPath` · `contentFilePath`
- `text.ts`: `normalizeQuotes` · `isEnglishSentence` · `splitSentences` · `Token` · `tokenize` · `sentenceWords` · `LexiconEntry` · `Lexicon` · `buildLexicon` · `LemmaPart` · `LemmaMatch` · `resolveWord` · `lemmasOf` · `wordIdsIn` · `containsWord` · `OffbandOptions` · `offbandWords` · `offbandRatio` · `glossaryMissing` · `FormRule` · `formsIn` · `ForbiddenList` · `ForbiddenHit` · `forbiddenHits` · `placeholdersIn`
- `schema/reference.ts`: 공통 `Count` · `PositiveInt` · `LevelSchema` · `AreaSchema` · `BandSchema` · `EffortSchema` · `Text` · `WordIdSchema` · `ImageKeySchema` · `IsoDateSchema` · `IsoDateTimeSchema` · `Hex64Schema` · `RangeSchema`/`Range` · `seedVersionShape` · `duplicateIndexes` · `uniqueStrings` · `regexCompiles`, 파일 규격 `SettingsFileSchema`(`SettingRow`) · `LevelSpecsFileSchema`/`LevelSpecSchema`(영역별 `Reading|Writing|Speaking|TalkLevelSpec`, `WritingFrame`) · `UnitSpecsFileSchema`/`UnitSpec` · `VocabFileSchema`/`VocabEntry` · `ImagesFileSchema`/`ImageEntrySchema` · `ModelPricesFileSchema` · `HomophonesFileSchema` · `ForbiddenFileSchema` · `ListFormsFileSchema`/`FormEntry` · `MetaSentencesFileSchema`(모두 `…File` 형 함께)
- `schema/lesson.ts`: `GenerationSchema` · `lessonBaseShape` · `PreviewSchema` · `ReadingQuestionSchema` · `ReadingLessonSchema` · `writingItemShapes` · `writingItemVariants` · `WritingItemSchema` · `WritingContentSchema` · `WritingLessonSchema` · `listeningVariants` · `ListeningSchema` · `SpeakingLessonSchema` · `TalkLessonSchema` · `LESSON_SCHEMAS` · `LessonOf` · `Lesson` · `LessonFileShellSchema`(겉만, 수업마다 따로 풀 때) · `LessonFileSchema` · `writingItemTexts` · `listeningTexts` · `textsOfLesson(area, lesson, prefix?)` · `textsOfLessonFile`
- `schema/talk.ts`: `LineSchema` · `GreetingTurnSchema` · `TurnCardSchema` · `QuestionCardSchema` · `TalkCardSchema` · `AllowedAnswerSchema` · `TalkTestTurnSchema` · `TalkTestSheetSchema` · `textsOfTalkCard` · `textsOfTalkTestSheet`
- `schema/assessment.ts`: `ReadingTestItemSchema` · `WritingTestItemSchema` · `SpeakingTestItemSchema` · `TestItem` · `LevelTestFileSchema` · `Reading|Writing|SpeakingPlacementItemSchema` · `PlacementItem` · `PlacementFileSchema` · `StorySchema` · `StoryFileSchema` · `textsOfTestItem` · `textsOfPlacementItem` · `textsOfLevelTestFile` · `textsOfPlacementFile` · `textsOfStory` · `textsOfStoryFile`
- `schema/records.ts`: `CellKeySchema` · `CheckRecordSchema` · `CheckFileSchema` · `ReviewRowSchema` · `ReviewFileSchema`
- `tests/fixtures/seed/builders.ts`: `defaultSettings` · `settingNumber` · `smallFrameSettings` · `WritingFrames` · `defaultWritingFrames` · `smallWritingFrames` · `inventedWord` · `ReferenceSet` · `referenceSet(settings, { writingFrames? })` · `smallReferenceSet` · `unitWordsOf` · `newWordsPerLesson` · `LessonSample` · `AnyLessonSample` · `readingLesson(ref, 1|4)` · `writingLesson(ref, 1|3|4|6)` · `speakingLesson(ref, 1|6|10)` · `talkLesson(ref, 1|3|4|5)` · `lessonSamples` · `lessonFileOf` · `readingLevelTest` · `talkLevelTest` · `speakingPlacement` · `storyFile(ref, band)` · `checkFile` · `reviewFile` · `SeedTree` · `sampleSeedTree` · `writeSeedTree(root, tree)`

글 조각 경로는 넘긴 객체 기준, 점으로 이은 칸 이름과 배열 차례(`content.questions.0.prompt`)다. `textsOfLessonFile` 은 `lessons.<i>.` 를, 평가 파일은 `forms.<i>.items.<j>.` · `forms.<i>.sheets.<j>.` 를 앞에 붙인다.

## 남은 우려

- 견본 내용은 P4a 규격만 통과하도록 맞췄다. P4b · P4c 검사(분량 · 배정 · 회화 카드 규칙 · 단원별 문항 수 등)를 모두 지키는지는 보지 않았다. 읽기 4단계 견본은 70단어 · 문장 8단어 이하 · 글로서리 완비로 짰지만, b · c 가 자기 시험에 맞게 고쳐야 할 수 있다. 견본 수업 함수는 기본 설정(단원 단어 30)을 전제하므로 작은 틀 규격에 쓰면 단어가 모자라 예외가 난다(c 의 `miniSeed` 가 따로 만든다).
- 글 조각 role 배정(위 3)이 b · c 의 검사 범위를 정한다. 특히 글로서리 `surface` · `lemma` 와 쓰기 `rubric` 을 영어 검사 밖에 둔 것은 검토자가 정본과 대조해 주면 좋겠다.
- 원형 찾기의 축약형 표와 P2 일치율의 축약형 펼침이 따로 있다(plan 위험 7, 1-나에서 합칠지 정함).
- `formsIn` · `forbiddenHits` 는 시드 정규식을 모듈 안 표에 한 번 컴파일해 둔다(g 플래그 없음, 같은 입력이면 같은 결과). 순수성은 지키지만 표가 프로세스 동안 남는다.
- 빌드 시간은 이번 값만 있다(약 7초, TypeScript 1.6초). 바탕 커밋 값과 견주려면 컨트롤러가 같은 기계에서 한 번 더 재야 한다.
