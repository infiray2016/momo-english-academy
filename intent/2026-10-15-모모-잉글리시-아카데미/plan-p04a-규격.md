# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P4a 시드 규격 · 글 도구

spec: `specs/` 정본(6.3 출력 규격 · 6.4 · 3.2 · 3.3 · 3.4 · 3.6 · 5절 시드 테이블 · 12절, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P4 행 · 조사 `docs/research/2026-10-16-graph-engineering.md`(P6) · `docs/research/2026-10-16-graph-engineering-ai-coding.md`(시드 생성 흐름) · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: approved(컨트롤러 2026-10-16 15:5x)
승인: 컨트롤러, 2026-10-16 15:5x(요청자는 PR 병합 때 본다, H14. 결정은 '정할 것' 끝 문단과 13절 C54) · 브랜치 · 워크트리: `feature/1a-p04a-seed-spec`(승인 커밋 뒤 HEAD 에서, Agent 격리 워크트리 `.claude/worktrees/`. a → b → c 가 차례로 같은 워크트리를 쓴다) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P4 는 파일 열 개 · 단계 여덟을 넘어 셋으로 나눴다(묶음 plan 위험 12). 이 파일은 첫째(규격 · 글 도구)다. 둘째 `plan-p04b-배정-칸-검사.md`(어휘 배정 · 규격 파일 정합 · 읽기 · 쓰기 · 말하기 칸 검사)는 이 plan 이 끝난 브랜치 끝에서, 셋째 `plan-p04c-묶음-검사-명령.md`(회화 · 평가 · 묶음 검사 · 완전성 · `pnpm seed:validate`)는 둘째 끝에서 시작한다.
세 plan 이 함께 쓰는 사실(시드 파일 배치 · 영어 값 · 칸 키 · 규격 칸 · 상수 · 정할 것)은 이 파일에만 적고 b · c 는 절 이름으로 가리킨다. 정본에 없는 이름 · 칸은 '(제안)', 확인하지 못한 사실은 '(추측)'이다. 판과 출처는 2026-10-16 에 확인했다(위험 절 끝 '확인한 사실과 출처').

## 목표 (Goal)

정본 6.3 만드는 순서 (0)의 '시드 Zod 규격'을 만든다(11절 1-가 (2), 요청자 결정 S8). 수업 · 보강 · 알파벳 단원 · 주제 변형, 회화 대화 시나리오 카드, 단계 평가 문항과 회화 평가 카드, 배치 평가 가 벌과 말하기 예비 문항, 토리 이야기, 규격 파일(설정값 시드 · level_specs 48 · unit_specs 240 + 알파벳 2 · vocab · 그림 카탈로그 · 모델 단가표 · 목록 넷), 검증기가 읽는 기록(seed/checks · seed/reviews)의 꼴을 `src/core/seed/` 에 Zod 4 로 정한다(6.3 출력 규격 표, 5절 테이블 열).
모든 객체는 모르는 키를 거부한다. 생성기가 정본에 없는 활동(예: 말하기 5~8단계의 대화 주고받기)을 넣으면 규격에서 걸린다. AC-5b 의 단위 몫은 b 가 증명한다.
단계마다 달라지는 규칙(3.3 단계표의 수와 '1~2단계는 허용 답 셋 이상' 같은 6.3 의 단계 경계)은 level_specs 의 단계표 규격 JSON 칸으로 두고, 단원 틀 수는 12절 키(unit.* · seed.* · level.* · placement.* · talk.* · writing.*)에서 읽는다. 둘 다 아닌 꼴 수(보기 4개 · 토리 이야기 20장 등)는 정본 절을 단 이름 붙인 상수로 `structure.ts` 한 곳에 둔다(정할 것 ㄷ).
글 도구 `text.ts` 는 5절의 문장 끝 규칙으로 문장을 자르고, vocab 의 활용형으로 원형을 찾고, 어휘 범위 밖 비율 · 글로서리 빠짐 · 문장 길이 · 형태 표 · 금지어 · 틀 자리를 센다. 6.4 시드 검사(b · c)와 6.4 끝 문단의 실시간 출력 검사(P9 · 1-나)가 같은 함수를 쓴다.
모두 DB · Next · React 를 가져오지 않는 순수 함수다(CLAUDE.md Architecture, 의존 규칙 `core-no-framework`). 이 plan 에는 AC 증명이 없다. b · c 가 AC-3a · 3b · 5b · 5g · 5h · 7a · 7c · 7d 를 증명한다.

## 바뀌는 파일 (Files that change)

P4a 가 쓰는 파일은 열이다(모두 새 파일). 공용 파일은 고치지 않는다.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/seed/structure.ts` | 신규 | 영역 · 단계 · 구간 · 종류 · 품사 값, 칸 키 · 파일 경로 함수, 이름 붙인 상수(아래 '상수'), 부동소수 비교 |
| `src/core/seed/schema/reference.ts` | 신규 | 설정값 시드 · level_specs · unit_specs · vocab · images · model_prices · 목록 넷 |
| `src/core/seed/schema/lesson.ts` | 신규 | 수업 겉(공통 칸) · 생성 기록 · 읽기 · 쓰기 · 말하기 수업 · 수업 파일, 글 조각 목록 함수 |
| `src/core/seed/schema/talk.ts` | 신규 | 회화 대화 시나리오 카드 · 회화 수업 · 회화 평가 카드 장, 글 조각 목록 함수 |
| `src/core/seed/schema/assessment.ts` | 신규 | 단계 평가 파일(읽기 · 쓰기 · 말하기 문항, 회화 평가 카드) · 배치 평가 파일 · 토리 이야기 파일, 글 조각 목록 함수 |
| `src/core/seed/schema/records.ts` | 신규 | 풀이 검사 기록(seed/checks) · 사람 표본 검토(seed/reviews) |
| `src/core/seed/text.ts` | 신규 | 글 도구(아래 '글 도구') |
| `tests/unit/seed-schema.test.ts` | 신규 | 규격 시험(통과 · 거부, 칸 키 · 경로, 글 조각 목록) |
| `tests/unit/seed-text.test.ts` | 신규 | 글 도구 시험 |
| `tests/fixtures/seed/builders.ts` | 신규 | 시험용 시드를 만드는 함수와, 임시 폴더에 시드 나무를 쓰는 함수(b · c · P5 · P7 이 같이 쓴다) |

### 시드 파일 배치(seed/)

5절이 정한 것은 `seed/settings.json` 과 `seed/lessons/<영역>/<단계>/<단원>.json` 이다. 나머지 이름은 묶음 plan 의 seed/ 행을 따른 (제안)이다. 영역 · 구간 폴더 이름은 영어 ASCII 라 한글 경로의 NFC 문제(plan-p01b 위험 5)가 없다.

| 경로 | 무엇 | 만드는 쪽 |
|---|---|---|
| `settings.json` | 설정값 시드(12절 키 · 범위 · 기본값 · 바꾸는 곳) | P6 |
| `level-specs.json` · `unit-specs.json` | level_specs 48행 · unit_specs 240행과 알파벳 2행(단원 0) | P6 |
| `vocab.json` · `images.json` · `model-prices.json` | 어휘 · 그림 카탈로그 · 모델 단가표와 조합 표 | P6 |
| `lists/homophones.json` · `lists/forbidden.json` · `lists/forms.json` · `lists/meta-sentences.json` | 동음이의어 · 금지어와 정규식 · 형태 표 · 메타 문장(5절 '빌드에 묶어 배포') | P6 |
| `lessons/<영역>/<단계>/<단원>.json` | 그 단원의 정규 · 보강 · 알파벳 수업과 주제 변형 전부(회화는 카드) | P8 |
| `level-tests/<영역>/<단계>.json` | 그 영역 · 단계의 단계 평가 벌 전부(회화는 평가 카드 장) | P8 |
| `placement/<영역>.json` | 배치 평가 가 벌(읽기 · 쓰기 · 말하기, 12단계 전부, 말하기 예비 문항) | P8 |
| `stories/<구간>.json` | 토리 이야기(구간 `1-3` · `4-6` · `7-9` · `10-12`) | P8 |
| `checks/lessons/<영역>/<단계>/<단원>.json` · `checks/level-tests/<영역>/<단계>.json` · `checks/placement/<영역>.json` · `checks/stories/<구간>.json` | 풀이 검사 기록과 사람 확인(6.4 풀이 검사) | P5 |
| `reviews/<영역>-<단계>.json` | 사람 표본 검토(6.3) | P5 |
| `prompts/` · `manifest/` · `reports/` | 생성 브리프 · 시드 기록 · 신고(검증기는 읽지 않는다) | P8 · 1-나 |

### 영어 값과 칸 키

코드 식별자는 영어다. P3 의 DB 열 값과 같아야 P7 적재가 바꿔 적지 않는다(정할 것 ㅁ).

| 정본 말 | 영어 값 | 정본 |
|---|---|---|
| 영역 읽기 · 쓰기 · 말하기 · 회화 | `reading` · `writing` · `speaking` · `talk` | 3.1 |
| 단계 구간 | `1-3` · `4-6` · `7-9` · `10-12` | 12절 키 꼴 |
| CEFR | `Pre-A1` · `A1` · `A2` · `B1`(구간 차례대로) | 3.1 표 |
| 수업 종류 배정 · 다지기 · 보강 · 알파벳 · 토리 이야기 | `assigned` · `reinforce` · `remedial` · `alphabet` · `tori_story` | 5절 lessons(P3a 초안 `lesson_kind` 과 같은 값) |
| 처음 묻는 턴 · 다시 묻는 턴 | `first` · `re_ask` | 3.3 말 표(P3a 초안 `ask_kind` 과 같은 값) |
| 품사(틀 자리) 명사 · 동사 · 형용사 · 부사 · 수 · 대명사 | `noun` · `verb` · `adjective` · `adverb` · `number` · `pronoun` | 6.4 회화 평가 카드 · 13절 |
| 품사 기능어 | `function`(제안, 정할 것 ㄴ) | 6.4 글로서리 '기능어' |
| 주제 변형 | 1 이상 정수(1 = 동물 · 자연 · 음식 · 가족, 2 = 놀이 · 운동 · 게임 · 우주 · 탈것) | 6.3 |
| 시드 판 '개정.정정' | 정수 칸 둘 `revision` · `correction`(0 이상, 판 3.1 은 3 · 1). P3a 초안의 열과 같은 꼴 | 5절 |
| 단계 평가 벌 · 회화 평가 카드 장 · 배치 벌 | 1 이상 정수(배치는 1 = 가, 2 = 나) | 5절 · 13절 |
| effort | `low` · `medium` · `high` · `xhigh` · `max` | 6.1 |

칸 키(5절 '칸', 13절 '평가 데이터 세부')는 글 하나로 쓴다. `structure.ts` 가 만들고 푼다.

| 칸 | 키 꼴 | 예 |
|---|---|---|
| 수업 · 회화 카드 | `lesson:<영역>:<단계>:<단원>:<종류>:<수업 번호>:<변형>` | `lesson:reading:4:2:assigned:3:1` |
| 토리 이야기 | `lesson:talk:<구간 첫 단계>:-:tori_story:<여는 순서>:1` | `lesson:talk:4:-:tori_story:7:1` |
| 단계 평가 문항 · 회화 평가 카드 장 | `level-test:<영역>:<단계>:<벌>:<문항 번호 또는 장 번호>` | `level-test:talk:3:2:1` |
| 배치 평가 문항 | `placement:<영역>:<단계>:<벌>:<문항 번호>:<main\|spare>` | `placement:speaking:5:1:2:spare` |

수업 번호는 정규 수업(배정 · 다지기 · 알파벳)을 1부터 정규 수업 수까지 이어 세고, 보강은 따로 1부터 센다(제안). 토리 이야기는 변형이 없어 1로 둔다(5절 lessons '종류가 토리 이야기인 행').

### 상수(structure.ts)

12절 키도 level_specs 칸도 아닌 수와 목록이다. 줄마다 정본 절을 주석으로 단다. 이 표 밖의 설계 숫자를 코드에 두지 않는다(묶음 위험 4). 둘 곳은 정할 것 ㄷ 에서 컨트롤러가 정한다.

| 이름(제안) | 값 | 정본 |
|---|---|---|
| `AREAS` · `LEVEL_MIN` · `LEVEL_MAX` | 영역 넷 · 1 · 12 | 3.1 |
| `BANDS` | 구간 넷(이름 · 첫 단계 · 끝 단계 · CEFR) | 3.1 표 · 12절 |
| `UNITS_PER_LEVEL` | 5 | 3.2 단위 표 · 5절 unit_specs 240 |
| `ALPHABET_UNIT` | 단원 0, 1단계, 읽기 · 쓰기 | 5절 · 6.3 · 3.1 |
| `READING_OPTIONS` | 4 | 6.3 읽기 '보기 4개' |
| `STORIES_PER_BAND` · `STORY_QUESTIONS` · `STORY_OPTIONS` · `STORY_KO_BANDS` | 20 · 2 · 3 · `1-3`, `4-6` | 3.5 · 6.3 토리 이야기 |
| `TALK_GREETING_TURNS` | 1 또는 2 | 6.3 · 6.4 |
| `TALK_TARGETS_PER_TURN` | 1~2 | 6.3 '하나 또는 둘' |
| `TALK_SAME_QUESTION_MAX` | 2 | 6.3 · 6.4 '두 번까지' |
| `TALK_TODAY_TOPICS` | 3~5 | 6.3 '한국어 짧은 말 3~5개' |
| `TALK_TEST_ALLOWED_MIN` | 3 | 6.3 · 6.4 '허용 답 셋 이상' |
| `TALK_TEST_SAME_QUESTIONS_MAX` · `TALK_TEST_SAME_ORDER_RUN_MAX` | 3 · 2 | 6.4 단계 평가(잠정, 표본에서 고친다) |
| `TEST_AI_ITEMS_MAX` | 2 | 6.3 · 13절 '평가 전체에 2개까지' |
| `DISTRIBUTION_HALF` · `DISTRIBUTION_UPPER_ONLY_WIDTH` | 0.5 · 0.2 | 6.4 단계 분포 |
| `SENTENCE_END_ABBREVIATIONS` | Mr. · Mrs. · Dr. · a.m. · p.m. | 5절 회화 문장 단위 검사 |
| `YES_NO_AUXILIARIES` | do · does · did · is · are · am · was · were · can · could · will · would · shall · should · may · might · must · have · has · had | 6.4 '예 · 아니오로 답할 수 있는 질문'(영어 문법 목록) |
| `PLACEHOLDER_NAME` · `BLANK` | `{NAME}` · 밑줄 셋 이상 | 6.4 |
| `FLOAT_TOLERANCE` | 1e-9 | 부동소수 비교 오차(설계 숫자 아님) |

## 규격 칸(파일별 값, 구현자가 옮겨 쓸 것)

공통: 객체는 `z.strictObject`, 갈래는 `z.discriminatedUnion`, 정수는 `z.int()`. 변환(`transform` · `preprocess`)과 날짜 객체를 쓰지 않는다(JSON 그대로 읽고, 6.2 출력 규격과 조각을 나눌 수 있게. 위험 9). 칸마다 '정본' 열을 규격 주석으로 단다. `Range` = `{ min, max }`(정수, min ≤ max). `WordId` = vocab 의 `word` 글. 날짜는 ISO 꼴 글(Zod 4 의 ISO 꼴 함수 이름은 구현자가 설치 판에서 확인, (추측) `z.iso.date()` · `z.iso.datetime()`).

### 설정값 시드 `settings.json` = `{ settings: SettingRow[] }`

| 칸 | 꼴 | 정본 |
|---|---|---|
| `key` | `^[a-z][a-z0-9_]*(\.[a-z0-9_-]+)+$`, 파일 안에서 겹치지 않음. `<구간>` 은 펼쳐 쓴다(`unit.regular_lessons.1-3`) | 12절 |
| `scope` | `household` · `profile` | 12절 범위 |
| `value` | 수 · 글 · 참거짓 · 수 목록 · 글 목록 · 글→수 사전 | 12절 기본값 |
| `changeVia` | `seed` · `decision-first` · `advanced` · `basic` | 12절 바꾸는 곳(5절 적재 규칙이 쓴다) |

검증기(b · c)가 읽는 키는 45개다(구간 키 8종 × 4 + 하나짜리 13). 구간 키: `unit.vocab_count` · `unit.new_words_per_lesson` · `unit.regular_lessons` · `unit.min_lessons` · `unit.max_remedial` · `seed.remedial_per_unit` · `seed.remedial_coverage` · `seed.topic_variants`. 하나짜리: `unit.vocab_mastery` · `seed.max_offband_ratio` · `seed.complete_through_level` · `level.test_items` · `level.test_items_per_session` · `level.test_forms` · `placement.items_per_level` · `talk.more_talk_turns` · `talk.said_ratio` · `talk.known_days` · `writing.rule_check_until_level` · `writing.light_check_until_level` · `writing.split_from_level`. 이 키가 없거나 수가 아니면 b 의 `settings` 오류다.

### `level-specs.json` = `{ levelSpecs: LevelSpec[] }`

5절 '단계표 규격 JSON'과 3.3 단계표 표, 6.3 의 단계 경계를 한 행에 둔다. `area` 로 가른다.

| 칸(공통) | 꼴 | 정본 |
|---|---|---|
| `area` · `level` | 영역 · 1~12 | 5절 |
| `band` · `cefr` | 구간 · CEFR(단계와 맞아야 함, b 정합) | 3.1 |
| `canDo` | 글(빈 글 아님) | 3.1 can-do |
| `sentenceMaxWords` | 1 이상 정수 | 3.6 문장 길이 상한 |
| `targetMinutes` | 수, 쓰기 6단계 이상은 `{ draft, revise }` | 3.3 목표 시간 |
| `testMix` | 선택. 단계 평가 유형 → 문항 수(H5 로 정하면 채움) | 6.3 · 13절 '영역 × 구간 유형별 문항 수' |
| `revision` · `correction` | 판(0 이상 정수) | 5절 |

| 영역 | 칸 | 정본 |
|---|---|---|
| 읽기 | `passage: { words?: Range, sentences?: Range }`(둘 가운데 하나 이상), `textTypes: string[]`, `questions: { total, mix: { <유형>: 수 } }`(mix 합 = total). 유형 `picture` · `fact` · `sequence` · `main-idea` · `inference` · `vocab-in-context` · `topic` · `gist` · `purpose` · `structure` | 3.3 읽기 표(그림 고르기 · 사실 확인 · 일의 순서 · 중심 내용 · 추론 · 뜻 추측 · 주제 · 요지 · 글쓴이 의도 · 태도 · 글의 구조) |
| 쓰기 | `amount` 갈래 셋: `{ kind: 'items', words?, phrases?, sentences?, sentenceWords?: Range, itemTypes: WritingItemType[] }` · `{ kind: 'guided', sentences: Range, input: 'word-box' \| 'slot' }` · `{ kind: 'composition', sentences?: Range, words?: Range }`. 선택 `frame: { k, regularLessons, minLessons }`(쓰기 6단계 이상), 선택 `maxCorrections` | 3.3 쓰기 표 · 3.2 · 5절 |
| 말하기 | `repeat: { words, sentences, sentenceWords?: Range }`, `listening: { items, options: 'picture' \| 'text' }`, `questions: { count, answerSentences?: Range, modelAnswer: bool, acceptedMin: int, koMeaning: bool }`, 선택 `pictureTask: { images: Range, ordered: bool, sentences: Range }`, 선택 `presentation: { seconds, prepWords, confirmQuestions }` | 3.3 말하기 표, 6.3(1~3단계 바른 답 · 1~2단계 허용 답 셋 이상 · 1~4단계 한국어 뜻) |
| 회화 | `segments: ('greeting'\|'today-words'\|'practice'\|'dialogue'\|'wrap-up')[]`, `mode: string`, `targetTurns`, `missions`(0 이면 없음), `hintTiers: ('ko'\|'frame'\|'sentence')[]`, `usablePhrases`(0 이면 없음), `cardShape: 'turns' \| 'questions'`, `twoAnswers: bool`, `frameInTurns: bool`, `turnImages: bool`, `koMeaning: bool`, `moreTalk: bool` | 3.3 회화 표 · 토막 표 · 말 표, 6.3 카드(1~3단계 턴 · 4단계부터 질문 목록 · 1단계 답 두 개 · 3단계 영어 틀 · 1~3단계 그림 · 1~4단계 한국어 뜻 · 1~3단계 더 이야기할 거리) |

`WritingItemType` = `pick-word`(그림 보고 단어 고르기) · `copy-tiles`(철자 타일로 베끼기) · `fill-letters`(빠진 글자 채우기) · `dictation`(듣고 받아쓰기) · `build-tiles`(철자 타일로 단어 만들기) · `assemble-phrase`(어구 조립) · `assemble-sentence`(문장 조립)(3.3 쓰기 1~3단계).

### `unit-specs.json` = `{ unitSpecs: UnitSpec[] }`

| 칸 | 꼴 | 정본 |
|---|---|---|
| `area` · `level` · `unit` | 영역 · 1~12 · 0~5(0 은 알파벳 · 소리 단원, 읽기 · 쓰기 1단계만) | 5절 |
| `learningElement` · `topic` | 글 | 3.6 · 5절 |
| `words` | `WordId[]`(1개 이상, 겹침 없음, 차례가 배정 차례) | 3.2 · 5절 '목표 어휘 30개' |
| `revision` · `correction` | 판(0 이상 정수) | 5절 |

### `vocab.json` = `{ vocab: VocabEntry[] }` · `images.json` = `{ images: ImageEntry[] }`

| 칸 | 꼴 | 정본 |
|---|---|---|
| `word` | 원형 글(대소문자 무시하고 겹치지 않음, 띄어 쓴 여러 낱말 표제어 허용) | 5절 vocab '단어' |
| `meaningKo` · `example` | 글 | 5절 |
| `pos` | 품사 목록(1개 이상, 겹침 없음). 값은 위 품사 표 | 5절 · 13절 |
| `level` | 1~12(정해 둔 단계) | 3.4 단계 어휘 범위 |
| `forms` | 활용형 글 목록(축약형도 여기 둘 수 있음) | 5절 활용형 |
| `imageKey` | 선택 글 | 5절 image_key |
| 그림 `key` · `file` · `source` · `license` · `attribution` · `word` | `^[a-z0-9-]+$` · `images/vocab/<키>.(png\|webp\|jpg)`(public/ 아래) · 글 · `CC0` · `CC-BY` · `generated` · CC-BY 면 필수 · `WordId` | 5절 images |

### `model-prices.json` = `{ models: ModelPrice[] }`

`model` · `inputUsdPerMTok` · `outputUsdPerMTok` · `cacheWriteUsdPerMTok` · `cacheReadUsdPerMTok`(0 이상 수) · `effectiveFrom`(날짜) · `thinkingDefault: 'adaptive'` · `thinkingOff: 'between_tools' | 'disabled' | null` · `thinkingOffEfforts: Effort[]` · `effortDefault: Effort` · `serverFallback: bool` · 선택 `fallbackOnly: bool`(서버 측 대체 모델로만 답하는 모델). 5절 model_prices · 6.1 조합 표. 조합 검사 함수는 P9 몫이고, 칸을 바꿀 때는 P9 계획자와 맞춘다.

### 목록 넷 `lists/`

| 파일 | 꼴 | 정본 |
|---|---|---|
| `homophones.json` | `{ groups: string[][] }`(묶음마다 2개 이상) | 6.2 · 3.4 |
| `forbidden.json` | `{ words: { en: string[], ko: string[] }, patterns: { id, category: 'violence'\|'personal-info'\|'contact', lang: 'en'\|'ko', regex }[] }`. 정규식은 `iu` 로 컴파일돼야 하고, `personal-info` 는 영어 · 한국어가 하나 이상씩 | 6.4 금지 내용 '두 벌' |
| `forms.json` | `{ forms: { id, labelKo, introducedAt: { rst: {level, unit} \| null, writing: {level, unit} \| null }, patterns: string[], words: string[] }[] }`(정규식이나 낱말 목록 하나 이상, id 겹침 없음) | 3.6 형태 표(읽기 · 말하기 · 회화 차례 `rst` 와 쓰기 차례 `writing`) |
| `meta-sentences.json` | `{ phrases: string[] }` | 6.4 메타 문장(검사는 P9 · 1-나) |

### 수업 파일 `lessons/<영역>/<단계>/<단원>.json` = `{ area, level, unit, lessons: Lesson[] }`

수업 겉(모든 영역 공통):

| 칸 | 꼴 | 정본 |
|---|---|---|
| `kind` | `assigned` · `reinforce` · `remedial` · `alphabet` | 5절 |
| `lessonNo` · `variant` | 1 이상 정수 | 5절 · 6.3 |
| `revision` · `correction` | 판(0 이상 정수) | 5절 |
| `generation` | `{ method: 'generated', model, effort, briefHash, agentHash, createdOn, retries? }` 또는 `{ method: 'human', createdOn, note? }`. 해시는 소문자 16진 64자(제안) | 5절 lessons 생성 기록 · 6.3 프롬프트 판 |
| `title` | 한국어 목록 제목(길이는 보지 않는다) | 6.3 '10자 안팎' |
| `newWords` · `unitWords` | `WordId[]`(겹침 없음). 다지기 · 보강은 `newWords` 빈 목록 | 5절 새 단어 목록 · 수업에 나오는 단원 단어 목록 |

| 영역 | 겉 밖의 칸 | 정본 |
|---|---|---|
| 읽기 | `preview: { word, meaningKo, example }[]`, `content: { passage, targetWords: WordId[], glossary: { surface, lemma, meaningKo, proper? }[], questions: Question[] }`. Question 갈래 `kind`: `picture`(`type: 'picture'`, `options: WordId[]` 4개) · `text`(`type` 그림 밖 유형, `options: string[]` 4개). 둘 다 `prompt` · `answerNo`(1부터) · `explanationKo` | 6.3 읽기, 3.3. `proper` 는 고유 명사 표시(제안, 6.4 '고유 명사를 뺀') |
| 쓰기 | `preview`, `content` 갈래 `shape`: `items`(`items: WritingItem[]`) · `guided`(`task` · `example` · `hints: string[]` · `rubric: string[]` · `sentences: { frame, wordBox?: string[], model }[]`) · `composition`(`task` · `example` · `hints: string[]`(1개 이상) · `rubric: string[]`). WritingItem 갈래 `type` 은 `WritingItemType`, 모두 `accepted: string[]`(1개 이상). `pick-word`: `picture: WordId` · `options: string[]` · `answerNo`. `copy-tiles` · `build-tiles`: `word` · `tiles`(`build-tiles` 는 `meaningKo` 더함). `fill-letters`: `word` · `pattern`(밑줄 포함) · `tiles`. `dictation`: `word` · `audioText`. `assemble-phrase` · `assemble-sentence`: `cards: string[]`(2개 이상) · `meaningKo?` | 6.3 쓰기, 3.3 쓰기 표 |
| 말하기 | `preview`, `content: { repeat: { words: string[], sentences: string[] }, listening: Listening[], questions: { en, ko?, modelAnswer?, accepted?: string[] }[], pictureTask?: { images: string[], scene, prompt? }, presentation?: { topic, prepWords: string[], fallbackQuestions: string[] } }`. Listening 갈래 `kind`: `picture`(`script` · `options: WordId[]` · `answerNo`) · `text`(`script` · `prompt?` · `options: string[]` · `answerNo`) | 6.3 말하기, 3.3 말하기 표, C27 · C47 |
| 회화 | `card: TalkCard`(아래) | 6.3 회화 |

### 회화 카드 `TalkCard`(schema/talk.ts)

| 칸 | 꼴 | 정본 |
|---|---|---|
| `topic` · `targetExpressions` | 글 · 글 목록(1개 이상) | 6.3 주제 · 목표 표현 |
| `greetingTurns` | 1 또는 2 | 6.3 인사 턴 수 |
| `greeting` | 1~3단계 `{ questions: GreetingTurn[] }`, 4단계부터 `{ firstLine: Line }` | 6.3 인사 질문 · 토리의 첫 말 |
| `todayWords` | `{ word, meaningKo, example, exampleKo? }[]`(`exampleKo` 는 말해 보기 예문의 뜻) | 6.3 오늘 쓸 말 · 말해 보기 |
| `firstQuestion` | 글 | 6.3 대화 첫 질문 |
| `flow` | 영어 글 목록(1개 이상, 턴마다의 예상 흐름) | 6.3 |
| `todayTopicsKo` | 한국어 글 목록 | 6.3 오늘 이야기 목록 |
| `closingLines` · `safeLines` | `Line[]`(1개 이상) | 6.3 정리 대사 · 안전한 대사 |
| `endCondition` | 글 | 6.3 끝맺음 조건 |
| `missions` | 선택 `{ ko, en }[]`(5~7단계) | 6.3 미션 목록. 칸 꼴은 (제안) |
| `farewell` · `safetyFarewell` | `Line` | 6.3 카드의 끝인사 · '새 이야기로 이어 가자' 끝인사 |
| `praiseLines` | 글 목록(1개 이상) | 6.3 짧은 칭찬 대사 |
| `turns` · `moreTalk` | 선택 `TurnCard[]`(1~3단계 대화 턴 · 더 이야기할 거리) | 6.3 |
| `questions` | 선택 `QuestionCard[]`(4단계부터 카드 질문 목록, 배열 차례가 번호) | 6.3 · C19 |

`Line` = `{ en, ko? }`. `GreetingTurn` = `{ question: { en, ko }, hintKo, hintEn, frameEn?, answerExample, twoAnswers?: [글, 글], imageKey? }`. `TurnCard` = GreetingTurn 칸 + `targets: WordId[]` · `ask: 'first' | 're_ask'`. `QuestionCard` = `{ en, ko, targets: WordId[], hintKo, hintTiers: string[], usablePhrases?: string[], answerExample }`. 회화 수업 = 수업 겉 + `card`. 단계에 맞는 칸이 있는지(1~3단계에 `turns`, 4단계부터 `questions` 등)는 c 의 칸 검사가 level_specs 회화 칸으로 본다.

회화 평가 카드 장 `TalkTestSheet` = `{ sheet, revision, correction, firstLine: Line, turns: { question: { en, ko? }, allowed: { text, slotPos? }[], childKo, frameEn, sentenceEn, unit }[] }`. `allowed[].text` 에 빈칸(`___`)이 있으면 `slotPos`(품사 여섯 가운데 하나)가 있어야 하고, 없으면 `slotPos` 도 없다(6.4 · 13절). `unit` 은 1~5.

### 단계 평가 · 배치 평가 · 토리 이야기(schema/assessment.ts)

| 파일 | 꼴 | 정본 |
|---|---|---|
| `level-tests/<영역>/<단계>.json` | 읽기 · 쓰기 · 말하기 `{ area, level, forms: { form, items: TestItem[] }[] }`, 회화 `{ area: 'talk', level, forms: { form, sheets: TalkTestSheet[] }[] }` | 5절 level_test_items · 6.3 |
| `TestItem` 공통 | `no`(1 이상) · `unit`(1~5) · `revision` · `correction` · `type` · `explanationKo?` | 6.3 '유형 · 지문 · 보기 · 정답 · 해설 · 연결 단원' |
| `TestItem` 갈래 `type` | 읽기 유형 열(`passage` · `prompt` · `options`(4개, `picture` 는 `WordId`) · `answerNo`), 쓰기 `WritingItemType`(수업과 같은 칸) · `fill-blank` · `fix-sentence`(`prompt` · `accepted`) · `composition`(`task` · `example?` · `rubric`), 말하기 `repeat`(`sentence`) · `listening`(수업과 같은 칸) · `question`(`en` · `ko?` · `accepted?` · `modelAnswer?`) · `presentation`(`topic` · `prepWords`, 확인 질문 칸 없음) | 3.2 문항 점수 · 6.3 'AI 과제 문항' · '발표 문항에는 확인 질문을 붙이지 않는다' |
| `placement/<영역>.json` | `{ area, form, levels: { level, items: PlacementItem[], spares: PlacementItem[] }[] }`. PlacementItem 은 `no` · `revision` · `correction` 과 앱이 채점하는 유형만(읽기 유형 · 쓰기 `WritingItemType` · `fill-blank` · `fix-sentence` · 말하기 `repeat` · `listening`) | 6.3 · 3.2 '모두 앱이 채점하는 고정 문항' |
| `stories/<구간>.json` | `{ band, stories: { no, revision, correction, generation?, title?, textEn, textKo?, questions: { prompt, options: 글 3개, answerNo, explanationKo }[](2개) }[] }` | 6.3 토리 이야기 |

### 기록(schema/records.ts)

| 파일 | 꼴 | 정본 |
|---|---|---|
| `checks/…json` | `{ records: { cell, contentHash, solve: { at, model, inputTokens, outputTokens, costUsd, items: { no, verdict: 'same'\|'different'\|'multiple'\|'none', solverAnswer?, extraAccepted?: string[] }[] }, human?: { contentHash, at, items: { no, decision: 'correct'\|'fixed' }[] } }[] }` | 6.4 풀이 검사(풀이 · 판단 · 모델 · 토큰 · 비용 · 날짜, 사람 확인은 내용 해시와 함께) |
| `reviews/<영역>-<단계>.json` | `{ rows: { cell, itemNo: int \| null, reason: 'ok'\|'easy'\|'hard'\|'error', memo, date }[] }` | 6.3 '알맞음 · 쉬움 · 어려움 · 오류', seed_reports 와 같은 열 |

칸 내용 해시 · 문항 번호 · 풀이 대상은 c 가 정하고 P5 가 따른다(정할 것 ㅋ).

### 글 조각 목록

규격 파일마다 `textsOf…(객체)` 를 둔다. 돌려주는 것은 `{ path, role, text }[]` 다. 검사는 쓰임에 맞는 몫만 고른다(b · c). id · 그림 키 · 열거 값 칸은 내지 않고, 그림 보기의 단어 id 는 그 단어 글로 낸다(보강 덮기가 '보기'를 센다).

| role | 들어가는 칸 |
|---|---|
| `passage` | 읽기 지문 · 단계 평가와 배치 평가의 지문 |
| `script` | 듣기 내용 |
| `story` | 토리 이야기 본문 |
| `prompt` | 문항 질문 · 과제 · 미션 영어 · 끝맺음 조건 · 예상 흐름 |
| `option` | 보기(정답 보기 포함) |
| `answer` | 허용 정답 · 바른 답 · 모범 답 · 따라 말할 단어 · 문장 · 쓰기 4~5단계 문장 틀과 모범 |
| `example` | 새 단어 예문 · 오늘 쓸 말 예문 · 쓰기 예시 |
| `hint` | 영어 문장 힌트 · 영어 틀 · 영어 힌트 단 · 쓸 수 있는 말 · 쓰기 힌트 |
| `child` | 회화 답 예시 · 회화 평가 허용 답 · 영어 문장 |
| `pair` | 1단계 답 두 개 |
| `tori` | 토리 질문 · 첫 말 · 정리 대사 · 끝인사 · 안전한 대사 · 칭찬 대사 |
| `expression` | 목표 표현 |
| `scene` | 그림 장면 설명(아이에게 안 보임) |
| `piece` | 쓰기 카드 · 타일 · 빈칸 꼴 |
| `ko` | 한국어 글 전부(뜻 · 해설 · 한국어 뜻 힌트 · 목록 제목 · 오늘 이야기 목록 · 미션 한국어 · 아이가 할 말의 뜻) |

## 글 도구(text.ts)

모두 순수 함수다. 정규식 리터럴에 ES2018 문법(`\p{…}` · 뒤보기)을 쓰지 않는다(tsconfig target ES2017, 위험 5). 한글은 문자 범위 `[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]`(이스케이프로 적는다) 로 가린다. 굽은 따옴표 `’` 는 `'` 로 바꾼 뒤 센다.

| 함수(제안) | 규칙 | 정본 |
|---|---|---|
| `splitSentences(글)` | `.` · `!` · `?` 와 그 뒤의 닫는 따옴표 · 괄호 다음 공백이나 글 끝에서 자른다. 앞 낱말이 `SENTENCE_END_ABBREVIATIONS` 이거나 숫자 사이 점이면 자르지 않는다. 줄바꿈도 문장 끝으로 본다(제안, 읽기 1단계 '단어와 짧은 문장' 줄) | 5절 문장 끝 |
| `tokenize(문장)` | 낱말 `[A-Za-z]+('[A-Za-z]+)*(-[A-Za-z]+)*` · 수 `\d+([.,]\d+)*` · 틀 자리 `\{[A-Z_]+\}` · 빈칸 `_{3,}`. 나머지는 버린다 | 6.4 틀 자리 · 빈칸 |
| `sentenceWords(문장)` | 낱말 · 수 · 틀 자리 · 빈칸 토큰 수(축약형은 한 낱말) | 3.6 문장 길이 |
| `isEnglishSentence(문장)` | 영문자가 있고 한글이 없다. 영어 검사(길이 · 형태 · 범위)는 이 문장만 본다 | (제안) |
| `buildLexicon(vocab)` | 원형 · 활용형을 소문자로 원형 id 에 잇는다. 띄어 쓴 표제어는 여러 낱말 표로 따로 둔다 | 3.4 · 5절 |
| `lemmasOf(토큰들, 사전)` | 여러 낱말 표제어를 가장 길게 먼저 맞추고, 낱말은 그대로 → 소유격 `'s` · `s'` 를 뗀 것 → 축약형(`n't` → not, `'m` → am, `'re` → are, `'ve` → have, `'ll` → will, `'d` → would, `'s` → is, 불규칙 can't · won't · shan't · ain't) → 하이픈 조각 차례로 찾는다. 축약형 표는 영어 문법 목록이라 코드 상수다 | 3.4 '활용형은 원형으로' |
| `offbandRatio(지문, { 사전, 단계, 새 단어, 고유 명사 })` | 낱말 토큰 가운데 원형이 모두 단계 이하인 것 · 이번 수업 새 단어 · 고유 명사를 뺀 나머지 수 ÷ 낱말 토큰 수(수 · 틀 자리 · 빈칸은 둘 다에서 뺀다, 토큰 0 이면 0) | 6.4 어휘 범위 밖 단어 · 3.4 |
| `glossaryMissing(지문, 글로서리, 사전)` | 원형이 기능어가 아닌(또는 찾지 못한) 낱말 토큰 가운데 글로서리 `surface`(대소문자 무시)에 없는 표기형. 여러 낱말 표제어는 그 표기나 그 안의 기능어 밖 낱말이 있으면 된다 | 6.4 글로서리 |
| `formsIn(문장, 형태 표)` | 소문자 문장에 정규식(`iu`)이 맞거나 토큰이 `words` 에 있으면 그 형태 id | 3.6 형태 표 |
| `forbiddenHits(글, 금지 목록)` | 영어 금지어는 낱말(여러 낱말은 낱말 경계) 단위, 한국어 금지어는 부분 글, 정규식은 모두 | 6.4 금지 내용 |
| `placeholdersIn(글)` | `{…}` 틀 자리 목록(빈칸은 세지 않는다) | 6.4 '틀 자리는 {NAME} 하나만' |
| `wordIdsIn(글, 사전)` · `containsWord(글, id, 사전)` | 글에 나온 원형 id 모음 · 한 id 가 있는지 | 6.4 어휘 배정 |

P2 의 일치율(6.2)도 축약형을 펼친다. 두 곳이 같은 말을 다르게 셀 수 있으므로 1-나 회화 '말했다' 확인 때 하나로 합칠지 정한다(위험 7).

## 시험용 시드 만들기 함수(tests/fixtures/seed/builders.ts)

| 함수(제안) | 무엇을 |
|---|---|
| `defaultSettings()` | 위 45 키의 12절 기본값(시험이 설계 숫자를 직접 쓰지 않고 여기서 읽는다, 묶음 위험 4) |
| `smallFrameSettings()` | 완전성 시험용 작은 단원 틀: `unit.vocab_count.*` 4 · `unit.new_words_per_lesson.*` 2 · `unit.regular_lessons.*` 3 · `unit.min_lessons.*` 2 · `seed.remedial_per_unit.*` 1 · `unit.max_remedial.*` 1 · `seed.topic_variants.*` 1 · `seed.remedial_coverage.*` 1 · `level.test_items` 5 · `level.test_items_per_session` 5 · `level.test_forms` 1 · `placement.items_per_level` 1 · `talk.more_talk_turns` 2, 쓰기 6단계 이상 `frame` 도 2 · 3 · 2. 단어 4개에 마지막 배정 수업 새 단어 2개가 3.2 관계 표 첫 줄을 지키도록 `unit.vocab_mastery` 를 0.5 로 둔다(0.8 이면 4 × 0.2 = 0.8 개라 어떤 배정도 걸린다) |
| `referenceSet(설정)` | level_specs 48행(3.3 단계표 값 그대로), unit_specs 240 + 2행, vocab(영문자만 쓴 지어낸 낱말과 기능어 몇 개, 단계마다 고르게), 그림, 목록 넷, 모델 단가표 |
| 수업 · 카드 · 문항 견본 | 읽기 1 · 4, 쓰기 1 · 3 · 4 · 6, 말하기 1 · 6 · 10, 회화 1 · 3 · 4 · 5, 단계 평가 · 회화 평가 카드 · 배치 · 이야기 · 풀이 검사 기록 · 표본 검토 줄 견본 하나씩 |
| `writeSeedTree(폴더, 시드)` | 위 배치대로 JSON 파일을 쓰고 뿌리 경로를 돌려준다(시험이 `tests/.tmp/seed-<무작위>/` 에 쓰고 지운다. `tests/.tmp` 는 .gitignore 와 tsconfig 에서 빠져 있다) |

이름은 Tori · Momo 처럼 앱 안 이름만 쓰고, 연락처 꼴 글은 실행 때 조각을 이어 만든다(제약). 무작위 값을 쓰지 않는다. 견본은 이 plan 의 규격을 통과하면 되고, b · c 가 자기 검사에 맞게 내용을 고칠 수 있다(꼴은 바꾸지 않는다). 1단계까지 꽉 찬 작은 시드(`miniSeed`)는 c 가 더한다.

## 작업 순서 (Order of work)

한 구현자(implementer · Opus · high)가 차례로 한다. 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null &&` 로 시작한다. 시험을 먼저 쓰고 실패를 본 뒤 구현한다.

1. [검증] `structure.ts`. 시험 먼저: 칸 키 만들기 → 풀기 왕복(네 꼴), 파일 경로(`lessons/reading/4/2.json`), 구간 · CEFR, `FLOAT_TOLERANCE` 비교. 완료: 시험 통과.
2. [검증] `schema/reference.ts`. 시험 먼저: 견본 통과 · 모르는 키 거부 · 겹친 설정값 키 · 겹친 vocab 낱말(대소문자 무시) · 컴파일 안 되는 정규식 · CC-BY 저작자 없음 · 읽기 mix 합 ≠ total · Range min > max. 완료: 시험 통과.
3. [검증] `schema/lesson.ts`. 시험 먼저: 견본 통과, 말하기 수업에 `dialogue` 키 → 거부, 판 칸(음수 · 소수 · 글 거부), 읽기 보기 3개 → 거부, 쓰기 갈래 칸 빠짐 → 거부. 완료: 시험 통과.
4. [검증] `schema/talk.ts`. 시험 먼저: 1 · 3 · 4 · 5단계 카드 견본 통과, 인사 턴 수 3 → 거부, 허용 답 빈칸에 품사 없음 → 거부. 완료: 시험 통과.
5. [검증] `schema/assessment.ts` · `schema/records.ts`. 시험 먼저: 평가 · 배치 · 이야기 · 기록 견본 통과, 발표 문항의 확인 질문 칸 → 거부, 배치 문항에 `composition` → 거부. 완료: 시험 통과.
6. [검증] `text.ts`. 시험 먼저(`seed-text.test.ts`). 완료: 시험 통과.
7. [검증] `builders.ts` 와 글 조각 목록 확인, 마무리. 견본마다 '문자열 칸 수 = 글 조각 수 + 빼는 칸 수'를 확인하는 시험(위험 11). `writeSeedTree` 로 쓴 파일을 다시 읽어 규격 통과. 완료: `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` · `pnpm spec:trace`(missing-test 변화 없음) 모두 0, 구현 보고에 출력.
8. [사람] 검토 · 커밋(H14). code-reviewer(Opus · xhigh) 검토와 fix(3회까지) 뒤 요청자 지시로 컨트롤러가 커밋한다. 완료: 커밋, b 브리프 시작.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 시드 규격의 영어 값과 P3 DB 열 값이 어긋난다(P2 ∥ P3 ∥ P4 동시) | P7 적재가 값을 바꿔 적어야 한다 | P3a 초안의 열거형 · 판 열에 맞췄고 남은 차이 셋은 정할 것 ㅁ |
| 2 | 단계 규칙을 level_specs 칸으로 둔 탓에 P6 이 3.3 · 6.3 을 잘못 옮기면 검증기가 틀린 규칙으로 통과시킨다 | 시드 전체가 잘못된 기준으로 만들어진다 | P6 의 design-reviewer 가 level_specs 를 3.3 · 6.3 과 줄마다 대조한다. c 의 can-do 숫자 경고가 일부를 잡는다 |
| 3 | 규격이 엄격해 표본 생성(P8)이 자주 걸린다 | 다시 생성 · 시간 | 생성 브리프에 이 규격 표를 옮긴다(P8). 걸림 통계로 브리프를 고친다. 규격 완화는 13절 한 줄 뒤 |
| 4 | 형태 표 · 금지어의 정규식이 시드 데이터라 잘못된 식이 검사를 멈춘다 | 검증 명령 예외 | 규격이 정규식을 미리 컴파일해 거부한다 |
| 5 | tsconfig target ES2017 에서 정규식 리터럴의 ES2018 문법을 TypeScript 가 오류로 볼 수 있다(추측) | 빌드 실패 | 글자 범위로 쓰고 `\p{…}` · 뒤보기를 쓰지 않는다 |
| 6 | 큰 판별 유니언의 타입 추론이 `next build` 를 느리게 할 수 있다(추측) | 빌드 시간 | 규격을 파일로 나누고 `z.infer` 형을 이름으로 내보낸다. 구현 보고에 빌드 시간 |
| 7 | 글 도구와 P2 일치율이 축약형을 따로 펼친다 | 같은 말을 다르게 셀 수 있다 | 지금은 쓰임이 다르다(원형 찾기 · 일치율). 1-나 회화 '말했다' 확인 때 하나로 합칠지 정한다 |
| 8 | 시험용 시드에 아이 이름 · 연락처 꼴이 들어간다 | 비밀값 · 아이 이름 규칙 위반 | Tori · Momo 만 쓰고 연락처 꼴은 실행 때 잇는다 |
| 9 | 6.2 회화 턴 출력(1-나)이 1~3단계 '더 이야기할 거리' 꼴 · 4~9단계 힌트 단 꼴을 쓴다. structured outputs 는 선택 칸 24 · anyOf 16 한도이고 재귀를 받지 않는다 | 규격을 나눠 쓰다 400 이 난다 | 이 plan 은 변환 · 재귀를 쓰지 않는다. 나눠 쓸지는 1-나에서 P9 · 회화 plan 이 정한다(선택 칸을 모두 필수로 바꾼 조각을 따로 둘 수 있음). 수 · 길이 제약은 SDK 가 설명 글로 옮기고 응답을 원래 스키마로 검증한다(확인한 사실) |
| 10 | Biome 의 범위(`files.includes` 의 `**`)에 seed/ 가 들어 있어 생성한 JSON 이 `biome ci` 의 꼴 검사에 걸릴 수 있다(추측) | P6 · P8 의 PR 이 lint 에서 실패 | P4 는 JSON 시드를 저장소에 두지 않는다(만들기 함수가 임시 폴더에 쓴다). 정할 것 ㅌ |
| 11 | 글 조각 목록에서 칸 하나를 빠뜨리면 그 칸이 길이 · 형태 · 금지어 검사를 피한다 | 금지어가 든 시드가 통과한다 | 견본마다 문자열 칸을 훑어 조각 수와 맞추는 시험(작업 7) |
| 12 | 수업 번호 · 해시 · 문항 번호 같은 다른 P 와의 약속을 P4 가 정한다 | P5 · P7 · P11 이 다르게 짠다 | 이 파일과 c 의 표가 약속이다. 바꿀 때는 컨트롤러가 그 P 의 브리프를 함께 고친다 |

### 정할 것(P4 전체, 컨트롤러가 정함 — 보고 `task-p04-plan-report.md` 와 같은 번호)

- ㄱ. P4 를 셋으로 나눈다(a 규격 · 글 도구 10파일 · 작업 8, b 배정 · 칸 검사 9파일 · 작업 8, c 회화 · 평가 · 묶음 검사 · 명령 10파일 · 작업 8, 차례로. b · c 의 파일 수에는 만들기 함수 고침이 들어 있다). 브리프는 둘을 예상했지만 둘로 하면 뒤 plan 이 18파일이 된다. 권함: 셋.
- ㄴ. 기능어. 6.4 글로서리 규칙('기능어 밖 단어')에 기능어 목록이 정본에 없다. vocab 품사 값은 6.4 가 여섯(명사 · 동사 · 형용사 · 부사 · 수 · 대명사)만 적었다. 그런데 범위 밖 비율을 세려면 a · the · in 같은 기능어도 vocab 에 단계와 함께 있어야 한다. 권함: vocab 품사 목록에 `function`(기능어) 값을 더하고, 틀 자리 품사는 여섯 그대로 둔다. 13절 한 줄 필요.
- ㄷ. 12절 키가 없는 수. 권함: 단계마다 다른 규칙(3.3 의 수, 6.3 의 단계 경계)은 level_specs 칸으로 두고 P6 이 옮기며, 꼴 수 · 구조 수는 위 '상수' 표처럼 `structure.ts` 한 파일에 정본 절과 함께 둔다. P7 check-ids 는 이 파일을 허용 목록으로 본다. 13절 한 줄(원칙)을 권한다.
- ㄹ. 6.4 표 밖의 오류. 규격 파일 정합(id 있음 · vocab ↔ 그림 · 단원 단어 수 = unit.vocab_count · 단원 단어의 단계 = 단원 단계 · 한 영역 안에서 한 단어는 한 단원에만(3.4) · 쓰기 6단계 이상 단원 틀 칸 · 3.2 관계 표)과 수업 겉 정합(새 단어 = 배정표 · 적은 단원 단어가 본문에 있음 · 카드 · 타일로 정답을 만들 수 있음)을 오류로 둔다. 조사 P6 의 '두 단원에 든 단어'는 3.4 규칙과 겹쳐 오류로 올렸다. 조사 P6 의 나머지 둘과 can-do 숫자는 경고다. 권함: 이대로.
- ㅁ. 영어 값 맞추기. 위 표의 영역 · 수업 종류 · 처음 · 다시 묻는 턴 · 판 꼴은 P3a 초안(`plan-p03a-DB-시계-설정.md`, 2026-10-16 오후)의 열거형 · 열에 맞췄다. 남은 차이는 셋이다. vocab 은 P3a 가 `id` 와 `word` 를 따로 두고 P4 는 `word` 가 id 다. 배치 벌은 P3a 가 글('가' · '나'), P4 가 정수(1 · 2)다. 주제 변형은 P3a 가 글, P4 가 정수다. 권함: 컨트롤러가 하나로 정한다(P4 쪽은 규격 칸 하나씩만 바뀐다).
- ㅂ. 알파벳 · 소리 단원(단원 0). 수업 수 · 배정 방식이 정본에 없다(6.3 '각 1단원 × 10회', 보강은 62단원에 포함). 권함: 1~3 구간 단원 틀(정규 = unit.regular_lessons.1-3, 보강 = seed.remedial_per_unit.1-3, 변형 = seed.topic_variants.1-3)을 쓰고 정규 수업 종류는 모두 `alphabet`, 새 단어는 배정 함수를 단원 0 어휘에 그대로 쓴다. 단원 0 어휘 수는 unit.vocab_count 를 보지 않는다. 13절 한 줄 필요.
- ㅅ. 학습 요소 범위(3.6) '이전 단계까지 다룬 요소와 이번 단원의 요소만'. 글자 그대로면 5단계 단원 3 은 5단계 단원 1 · 2 의 요소도 못 쓴다. 기본은 글자 그대로 짠다. 권함: 표본(P8)에서 걸림이 많으면 13절 한 줄로 '같은 단계 앞 단원까지'로 넓힌다(코드는 비교 한 줄). 평가 · 배치는 그 단계까지 전부, 토리 이야기는 구간 첫 단계 앞까지로 둔다(제안).
- ㅇ. 1-가 개발용 적재의 완전성 범위. 11절 (4-1)은 '적재한 단계까지 완전성'인데 C50 (4)의 1-가 실시드에는 회화 · 토리 이야기가 없고 단계 평가는 '1벌 이상'이라 level.test_forms(3)과 부딪친다. P4 는 `--areas` 로 영역을 거르는 길만 준다. 권함: P7 계획 때 컨트롤러가 13절 한 줄로 1-가 개발용 적재의 범위를 정한다.
- ㅈ. 회화 '다시 묻는 턴' 세는 범위. 6.4 글자대로 주제 변형마다 정규 카드의 다시 묻는 턴 자리만 센다(3.2 관계 표는 2~3단계에서 처음 묻는 턴도 센다고 적어 6.4 가 더 엄격하다). 4단계부터는 카드에 처음 · 다시 표시가 없으므로 배정표로 정한다(배정 수업의 새 단어를 그 카드에서 처음 노리는 질문만 처음, 나머지는 다시). 권함: 이대로.
- ㅊ. 배치 평가 말하기 예비 문항 수. 6.3 은 단계마다 3개라 적고 키가 없다. 권함: placement.items_per_level 과 같은 수로 본다.
- ㅋ. 풀이 검사 기록 꼴 · 칸 내용 해시 · 문항 번호 · 풀이 대상을 P4(a 꼴, c 함수)가 정하고 P5 가 따른다. 권함: P5 브리프에 그대로 넣는다.
- ㅌ. seed/ JSON 과 Biome. 권함: P6 착수 전에 `biome.json` 의 `files.includes` 에 `!seed/**/*.json` 을 더한다(시드는 검증기가 본다). 다른 길은 생성기가 Biome 꼴로 쓰고 `biome format --write seed` 를 거치는 것이다.
- ㅍ. 회화 카드 검사 시험 이름에 1-나 AC-15m 을 쓴다(c). spec-trace 는 시험 하나만 있어도 덮였다고 세므로, 1-나 묶음 plan 에서 AC-15m 의 Playwright 몫이 따로 있음을 적는다.

컨트롤러 결정(2026-10-16 15:5x, plan 승인): ㄱ 셋으로 나눈다(a → b → c, 워크트리 하나). ㄴ · ㄷ · ㅁ · ㅂ · ㅊ 는 13절 C54 에 한 줄로 넣고 5절(vocab 품사 function) · 6.3(알파벳 단원 틀 · 예비 문항 수)에 반영했다. ㅁ 는 이렇게 정한다 — vocab 은 시드 규격에서 `word` 가 id, DB 는 대리 키 `id` 와 유니크 `word`(적재가 잇는다); 배치 벌 정수(1 = 가 · 2 = 나); 주제 변형 정수. P4 규격은 지금 꼴 그대로이고 P3a plan 을 이에 맞춘다. ㄹ · ㅅ(글자대로, 평가 · 배치 그 단계까지, 이야기 구간 첫 단계 앞까지) · ㅇ(P7 때) · ㅈ · ㅋ · ㅌ(P6 전 컨트롤러가 biome.json) · ㅍ 는 권함대로. 단계 → 구간 함수: P2a 가 공용 `src/core/level-band.ts`(`Band` · `bandOf`)를 만들고 있어 이 워크트리에는 아직 없다. `structure.ts` 는 `BANDS`(구간 · 첫 · 끝 · CEFR)와 같은 꼴의 `bandOf(level): Band` 를 두되, 컨트롤러가 합칠 때 `bandOf` 를 level-band 의 것으로 바꾼다(가져오기 한 줄).

### 제약

- 설계를 바꾸지 않는다. 정본과 다르게 해야 하는 것은 위 '정할 것'에 올렸고, 컨트롤러가 13절에 한 줄 넣은 뒤 구현한다.
- 설계 숫자는 12절 키나 level_specs 칸에서 읽는다. 키가 없는 수는 '상수' 표 밖에 두지 않는다. 시험도 숫자를 만들기 함수의 설정값에서 읽는다.
- 순수 함수만 둔다. `src/core` 에서 DB · Next · React · `src/server` · 파일 읽기를 하지 않는다(파일 읽기는 c 의 명령 몫).
- 비밀값 · 아이 이름을 시험 · 견본 · 출력 어디에도 적지 않는다.
- 용어는 영역 · 단계 · 단원 · 활동 · 토막 · 칸이다. 코드 식별자와 브랜치 이름은 영어 ASCII 다.
- 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer Opus · xhigh). 화면이 없으므로 화면 검토는 없다. 커밋은 요청자 지시 때만 한다(H14).
- 패키지를 더 설치하지 않는다(zod 4.6.7 · tsx 는 P1a 가 설치했다).

### 확인한 사실과 출처(2026-10-16)

| 사실 | 출처 · 판 |
|---|---|
| zod 최신 안정판 4.6.7(dist-tag latest), 저장소 설치 4.6.7 | `npm view zod version` · `npm view zod dist-tags` · `package.json` |
| @anthropic-ai/sdk 최신 0.135.0 = 설치 판, peer `zod ^3.25.0 \|\| ^4.0.0`(선택 peer) | `npm view @anthropic-ai/sdk@0.135.0 peerDependencies peerDependenciesMeta` |
| SDK 의 `helpers/zod` 는 `zod/v4` 를 가져와 `z.toJSONSchema(스키마, { reused: 'ref' })` 를 `transformJSONSchema` 로 바꾸고, `parse` 때 원래 스키마로 `safeParse` 한다 | `node_modules/@anthropic-ai/sdk/helpers/zod.mjs`(0.135.0) |
| `transformJSONSchema` 는 객체에 `additionalProperties: false`, 문자열 꼴은 지원 목록만, 배열 `minItems` 는 0 · 1 만 남기고 나머지 제약을 설명 글로 옮긴다 | `node_modules/@anthropic-ai/sdk/lib/transform-json-schema.mjs`(0.135.0) |
| structured outputs: 재귀 · 수 제약 · 문자열 길이 제약 미지원, `minItems` 0 · 1 만, strict 도구 20 · 선택 매개변수 24 · anyOf(타입 배열 포함) 매개변수 16 한도, 정규식 뒤보기 · `\b` 미지원, `zodOutputFormat()`(`@anthropic-ai/sdk/helpers/zod`)이 응답을 검증 | https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md (날짜 표시 없음) |
| 6.5 는 '배치 흐름'으로 지워진 절이다. 브리프의 '6.5 호출 출력'은 6.2 호출 출력으로 읽었다 | `specs/05-AI-호출.md` 66~68줄 |
| Zod 4: `transform` · `date` · `bigint` · `map` · `set` · `custom` 등은 JSON 스키마로 못 바꾸고 기본으로 예외를 던진다 | https://zod.dev/json-schema |
| Zod 4 API: `z.strictObject` · `z.discriminatedUnion(키, 갈래)` · `.refine` · `.superRefine`(ctx.addIssue) · `z.int()` · `z.literal([…])` | https://zod.dev/api |
| Zod 4 오류 꼴: `z.prettifyError` · `z.treeifyError` · `z.flattenError`, 오류 항목은 code · path · message | https://zod.dev/error-formatting |
| tsx 최신 4.23.15 = 설치 판 | `npm view tsx version` |
| 시드 파일 배치: 5절이 `seed/settings.json` 과 `seed/lessons/<영역>/<단계>/<단원>.json` 을 정했다. 나머지 이름은 묶음 plan seed/ 행 | `specs/04-데이터.md` 7 · 9줄 · 묶음 plan 43줄 |
| 영역 4 · 단계 12 · 단계마다 단원 5 · can-do 48 의 출처는 3.1(영역 표 · '영역 × 단계 48개') · 3.2(단위 표 '단원 5개', '단원 수는 5개로 같게') · 5절(level_specs 48행 · unit_specs 240행과 알파벳 2행)이고 12절 키는 없다 | `specs/02-1-영역-단원-승급.md` 11~31 · 73~77 · 137줄, `specs/04-데이터.md` 24 · 25줄 |
| tsconfig 는 strict · target ES2017 · lib esnext · `tests/.tmp` 제외, Biome 범위는 `**` 에서 docs · specs · intent · .superpowers 만 뺀다 | `tsconfig.json` · `biome.json`(승인 뒤 b0be5ae 에서 `.claude/worktrees` 제외가 더해짐) |

## 증명 (Proof)

이 plan 은 AC 를 증명하지 않는다(시험 이름에 AC 를 붙이지 않는다). 묶음 plan 증명 절의 '공통' 행 몫이다.

| 무엇 | 증명 | 파일 · 명령 |
|---|---|---|
| 규격 | 단위 "6.3 시드 규격: 칸 키를 만들고 풀면 같은 값이 나온다" · "6.3 시드 규격: 파일 경로가 영역 · 단계 · 단원과 맞는다" · "6.3 시드 규격: 견본 시드가 모두 규격을 통과한다" · "6.3 시드 규격: 모르는 키가 든 말하기 수업(대화 활동)을 거부한다" · "6.3 시드 규격: 판 칸(revision · correction)이 0 이상 정수가 아니면 거부한다" · "6.3 시드 규격: 읽기 문항 보기가 4개가 아니면 거부한다" · "6.3 시드 규격: 회화 평가 허용 답의 빈칸에 품사가 없으면 거부한다" · "6.3 시드 규격: 형태 표 · 금지어의 정규식이 컴파일되지 않으면 거부한다" · "6.3 시드 규격: CC-BY 그림에 저작자 표시가 없으면 거부한다" · "6.3 시드 규격: 읽기 문항 유형 수 합이 문항 수와 다르면 거부한다" · "6.3 시드 규격: 발표 문항의 확인 질문 칸과 배치 평가의 AI 과제 유형을 거부한다" · "6.3 시드 규격: 글 조각 목록이 견본의 모든 글 칸을 담는다" · "6.3 시드 규격: 쓴 시드 나무를 다시 읽으면 규격을 통과한다" | `tests/unit/seed-schema.test.ts` |
| 글 도구 | 단위 "5절 문장 끝: Mr. · Mrs. · Dr. · a.m. · p.m. 과 숫자 사이 점에서는 자르지 않는다" · "3.6 문장 길이: 낱말 · 수 · {NAME} · 빈칸을 한 낱말로 센다" · "3.4 원형 찾기: 활용형 · 축약형 · 소유격 · 여러 낱말 표제어" · "6.4 어휘 범위 밖: 새 단어 · 고유 명사 · 수 · {NAME} 을 빼고 센다" · "6.4 글로서리: 기능어 밖 낱말 가운데 글로서리에 없는 표기형을 낸다" · "3.6 형태 표: 정규식과 낱말 목록으로 형태를 찾는다" · "6.4 금지 내용: 영어 낱말 · 한국어 부분 글 · 정규식에 걸린 곳을 낸다" · "6.4 틀 자리: {NAME} 밖의 틀 자리를 찾고 빈칸은 세지 않는다" · "글 도구: 한글이 든 문장은 영어 검사에서 뺀다" | `tests/unit/seed-text.test.ts` |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` 0, `pnpm spec:trace` 요약의 missing-test 가 시작 때와 같음 | 작업 7 |

시험 이름은 글자 그대로 적는다(spec-trace 가 정규식으로 뽑는다, plan-p01b 위험 4).

## 완료 보고 (Done)

구현 뒤 채운다.
