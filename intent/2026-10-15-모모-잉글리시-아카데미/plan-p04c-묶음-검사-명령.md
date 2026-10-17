# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P4c 회화 · 평가 · 묶음 검사와 시드 검증 명령

spec: `specs/` 정본(6.3 완전성 · 6.4 검사 표, 3.2 회화 평가 · 배치 평가, 3.3 회화 카드, 9절 시드 검증 행, 11절 (4) · (4-1), 12절, 15절 AC-7a · 7d, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P4 행 · 증명 절 머리 · 시드 묶음 워크플로 절 · 조사 `docs/research/2026-10-16-graph-engineering.md`(P6) · `docs/research/2026-10-16-graph-engineering-ai-coding.md`(시드 생성 흐름) · 공통 사실 `plan-p04a-규격.md` · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: done(커밋 6bd6015 22:0x, PR 은 H15 뒤)
승인: 컨트롤러, 2026-10-16 15:5x(결정은 plan-p04a '정할 것' 끝 문단과 13절 C54) · 브랜치 · 워크트리: `feature/1a-p04c-seed-validate`(P4b 브랜치 끝에서, P4 워크트리) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P4 셋 가운데 셋째다. 첫째 `plan-p04a-규격.md`(규격 · 글 도구 · 시험용 시드 만들기 함수)와 둘째 `plan-p04b-배정-칸-검사.md`(어휘 배정 · 규격 파일 정합 · 읽기 · 쓰기 · 말하기 칸 검사)가 끝난 브랜치 끝에서 시작한다. 시드 파일 배치 · 영어 값 · 칸 키 · 규격 칸 · 상수 · 정할 것 ㄱ~ㅍ 는 P4a 에, 검사 결과 꼴 · `index` 꼴 · 수업 공통 검사는 P4b 에 있다. 이 plan 을 구현하는 쪽은 두 파일의 그 절을 함께 읽는다.

## 목표 (Goal)

6.4 검사 표의 나머지(회화 시나리오 카드 · 어휘 배정의 회화 몫 · 주제 변형 · 보강 덮기 · 단계 평가 · 회화 평가 카드 · 단계 분포 · 풀이 검사)와 6.3 의 시드 완전성, 조사 P6 의 칸 사이 관계 경고를 만든다. 그리고 이 모든 검사를 묶어 돌리는 명령 `pnpm seed:validate` 를 만든다(6.3 순서 (0), 11절 1-가 (2)).
PR 의 CI 는 있는 칸의 검증 실패와 남은 사람 확인만 막고 빈 칸 수는 보고만 한다. main 작업과 개발용 적재 작업은 `--complete-through <n>` 으로 빈 칸과 풀이 검사가 안 된 칸까지 막는다(9절 시드 검증 행, 묶음 plan 증명 절 머리).
검증은 seed/checks/ 에 저장된 풀이 검사 결과만 읽고 API 를 부르지 않는다(AC-7d). 단계 분포 경고는 CI 를 막지 않는다(6.4). 같은 명령의 `--json` 보고가 P8 시드 묶음 워크플로의 '검증' 점에서 실패 칸만 생성으로 되돌리는 입력이 된다(묶음 plan 시드 묶음 워크플로 표).
판단 숫자는 12절 키(seed.complete_through_level · level.test_items · level.test_items_per_session · level.test_forms · placement.items_per_level · talk.more_talk_turns · talk.said_ratio · talk.known_days · seed.remedial_coverage · seed.max_offband_ratio)와 level_specs 칸에서 읽는다. 증명은 AC-7a · 7d 이고, 회화 카드 검사는 1-나 AC-15m 의 단위 몫을 먼저 덮는다(정할 것 ㅍ).

## 바뀌는 파일 (Files that change)

P4c 가 쓰는 파일은 열이다(새 파일 아홉 · 고치는 파일 하나). 공용 파일(`package.json` · `ci.yml`)은 아래 '요청하는 공용 변경'으로 컨트롤러가 합친다.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/seed/check-talk.ts` | 신규 | 회화 카드 칸 하나 · 단원 단위 회화 검사(아래 '회화 카드 검사') |
| `src/core/seed/check-assessment.ts` | 신규 | 단계 평가 · 회화 평가 카드 · 배치 평가 · 토리 이야기 검사(아래 '평가 검사') |
| `src/core/seed/check-cross.ts` | 신규 | 주제 변형 · 보강 덮기 · 관계 경고 · 단계 분포 경고 · can-do 숫자(아래 '묶음 검사') |
| `src/core/seed/validate.ts` | 신규 | 읽은 파일 묶음을 규격으로 풀고 모든 검사를 돌려 보고를 만든다. 칸 내용 해시 · 문항 번호 · 풀이 대상 · 풀이 검사 상태 · 완전성 · 종료 코드(아래). `node:crypto` 를 쓴다 |
| `scripts/seed-validate.ts` | 신규 | 명령. 인자 · 파일 읽기 · 출력 · 종료 코드(아래 '명령') |
| `tests/unit/seed-validator-talk.test.ts` | 신규 | 회화 카드(AC-15m 단위 몫) |
| `tests/unit/seed-validator-complete.test.ts` | 신규 | AC-7a(완전성 · 단계 평가 · 회화 평가 카드)와 배치 · 이야기 |
| `tests/unit/seed-validator-distribution.test.ts` | 신규 | AC-7d(분포 경고 · 풀이 검사 · API 0회)와 보강 덮기 · 주제 변형 · 관계 경고 |
| `tests/unit/seed-validate-cli.test.ts` | 신규 | 명령의 모드 · 종료 코드 · 요약 꼴 · `--json` |
| `tests/fixtures/seed/builders.ts` | 수정 | `miniSeed({ areas, through, frame })`(범위까지 꽉 찬 작은 시드)를 더하고 회화 · 평가 견본을 이 plan 의 검사에 맞게 고친다. 있던 꼴은 바꾸지 않는다 |

## 회화 카드 검사(check-talk.ts)

`checkTalkCard(수업, ctx)` 는 P4b 가 내보내는 수업 공통 검사(`layout` · `vocab-allocation` 의 새 단어 = 배정표 · `unit-words` · `learning-elements` · `forbidden`)를 회화 몫의 글 조각(role `tori` · `hint` · `child` · `pair` · `prompt` · `example` · `expression`, 6.4 회화 행)으로 부르고, 아래를 더 본다. 단계마다 다른 것은 level_specs 회화 칸(P4a)에서 읽는다.

| 규칙 | 6.4 행 · 정본 | 기준 |
|---|---|---|
| `talk-shape` | 회화 시나리오 카드 | `cardShape` 가 `turns` 면 `greeting.questions`(수 = `greetingTurns`) · `turns` 가 있고 `questions` 는 없다. `questions` 면 `greeting.firstLine` · `questions` 가 있고 `turns` · `moreTalk` 는 없다 |
| `talk-turns` | 회화 시나리오 카드 · AC-15m | `turns` 면 `greetingTurns` + 대화 턴 수 = `targetTurns`. `questions` 면 질문 수 ≥ `targetTurns` − `greetingTurns` |
| `talk-hints` | 회화 시나리오 카드 | 대화 턴 · 더 이야기할 거리의 영어 틀은 `frameInTurns` 일 때 꼭 있고 아닐 때 없다. 질문 목록의 영어 힌트 단 수 = `hintTiers` 가운데 `ko` 아닌 단 수, 쓸 수 있는 말 수 = `usablePhrases`(0 이면 칸 없음) |
| `talk-pairs` | 어휘 배정 · AC-15m | `twoAnswers` 단계면 인사 질문과 모든 대화 턴에 답 두 개가 있고, 아니면 없다. 더 이야기할 거리에는 없다. 두 답은 소문자 · 문장 부호를 뺀 낱말 수가 같고 한 자리만 다르다. 처음 묻는 턴의 답 두 개는 하나 이상이 그 턴의 새 단어를 담는다 |
| `talk-first-ask` | 어휘 배정 · AC-15m | `turns` 카드에서: 배정 카드는 새 단어마다 그것을 노리는 처음 묻는 턴이 있고, 처음 묻는 턴은 새 단어만 노리며, 그 자리(대화 턴 1부터) ≤ ⌈대화 턴 수 ÷ 2⌉ 이고('앞쪽 절반'을 가운데 턴까지로 푼 것, 제안), 그 턴의 영어 문장 힌트가 그 턴의 새 단어를 담는다. 다지기 · 보강 카드에는 처음 묻는 턴이 없다 |
| `talk-targets` | 회화 시나리오 카드 · AC-15m | 대화 턴 · 더 이야기할 거리 · 질문 목록의 노리는 단어가 1~2개(`TALK_TARGETS_PER_TURN`)이고 그 단원 단어 안이다. 토리 질문에 그 턴이 노리는 단어의 원형이 없다 |
| `talk-same-question` | 회화 시나리오 카드 · AC-15m | 인사 질문 · 대화 턴 · 더 이야기할 거리 · 질문 목록의 토리 질문 가운데 같은 글(소문자, 공백 정리)이 `TALK_SAME_QUESTION_MAX` 번을 넘지 않는다 |
| `talk-more` | 회화 시나리오 카드 | `moreTalk` 단계에만 있고 수 = talk.more_talk_turns, 모두 `re_ask` 이며, 노리는 단어가 이 카드 대화 턴이 노린 단어 안이다 |
| `talk-images` | 그림 · AC-15m | 그림 키는 `turnImages` 단계에만 있고 카탈로그에 있다 |
| `talk-ko` | 회화 시나리오 카드 | `koMeaning` 단계면 정리 대사 · 안전한 대사 · 끝인사 · '새 이야기로 이어 가자' 끝인사의 한국어 뜻이 있고, 질문 목록 카드(4단계)면 토리 첫 말의 한국어 뜻도 있다 |
| `talk-today` | 회화 시나리오 카드 | 오늘 쓸 말의 단어 모음 = `newWords`(다지기 · 보강은 빈 목록). `segments` 에 `practice` 가 있으면 예문 뜻(`exampleKo`)이 있다. 오늘 이야기 목록 수가 `TALK_TODAY_TOPICS` 안 |
| `talk-missions` | 회화 시나리오 카드 | 미션 수 = `missions`(0 이면 칸 없음) |
| `talk-first-question` | 회화 시나리오 카드 | `firstQuestion` = 첫 대화 턴의 토리 질문(`turns`) 또는 질문 목록 1번(`questions`) |
| `talk-placeholder` | 회화 시나리오 카드 | 틀 자리는 `{NAME}` 하나만 쓴다(빈칸은 세지 않는다) |
| `vocab-allocation`(회화 몫) | 어휘 배정 | 새 단어마다 아이 차례의 힌트(role `hint`) · 답 예시(`child`) · 쓸 수 있는 말(`hint`) · 목표 표현(`expression`) 가운데 하나에 나온다 |

`checkTalkUnit(그 단원 카드 전부, ctx)` 는 주제 변형마다 정규 카드만 본다(정할 것 ㅈ). 4단계부터는 카드에 처음 · 다시 표시가 없으므로 배정 카드에서 그 카드의 새 단어를 그 카드에서 처음 노리는 질문만 처음 묻는 턴으로, 나머지는 다시 묻는 턴으로 센다.

| 규칙 | 6.4 행 · 정본 | 기준 |
|---|---|---|
| `talk-again-slots` | 어휘 배정 · 3.2 관계 표 · AC-15m | 다시 묻는 턴의 노리는 단어 수 합 ≥ 단원 단어 수 × talk.said_ratio × talk.known_days − `FLOAT_TOLERANCE` |
| `talk-known-days` | 어휘 배정 · AC-15m | 단원 단어마다, 다시 묻는 턴에서 그 단어를 노린 서로 다른 정규 수업 수 ≥ talk.known_days |

## 평가 검사(check-assessment.ts)

수업 공통의 `answer` · `image` · `learning-elements`(평가 · 배치는 그 단계까지의 형태, 이야기는 구간 첫 단계 앞까지 · 정할 것 ㅅ) · `forbidden` 과 쓰기 앱 채점 문항의 정답 만들 수 있음(P4b)을 문항마다 다시 쓴다. 평가 · 배치 지문에는 어휘 범위 밖 · 글로서리 검사를 걸지 않는다. 6.4 의 두 행은 글로서리가 있는 수업 지문의 규칙으로 읽었고, 평가 문항에는 글로서리 · 고유 명사 표시가 없다(P4a 규격). 평가 지문의 범위 밖 비율은 보고 통계에만 적는다.

| 규칙 | 6.4 행 · 정본 | 기준 |
|---|---|---|
| `level-test-count` | 단계 평가 | 벌 번호가 1~level.test_forms 안이고, 벌마다 문항 번호가 1~level.test_items 안에서 겹치지 않는다. 빠진 번호는 완전성이 빈 칸으로 센다 |
| `level-test-unit-count` | 단계 평가 · AC-7a | 다 찬 벌마다 단원별 문항 수 = level.test_items ÷ 그 단계 단원 수(unit_specs 단원 1~5). 나누어떨어지지 않으면 `settings` 오류. 덜 찬 벌은 보지 않는다(빈 칸으로 보고된다) |
| `level-test-type` | 단계 평가 · 3.2 문항 점수 | 유형이 영역 · 단계에 맞다. 읽기는 읽기 유형. 쓰기는 모양별(items 단계는 `WritingItemType`, guided 단계는 `fill-blank` · `fix-sentence`, 작문 단계는 둘에 `composition`). 말하기는 `repeat`(따라 말하기가 있는 단계) · `listening` · `question`(`acceptedMin` > 0 단계는 허용 답 필수) · `presentation`(발표 단계) |
| `level-test-ai` | 단계 평가 · 6.3 | AI 과제 문항(`composition`, 허용 답이 없는 `question`, `presentation`)은 쓰기 작문 단계 · 말하기 발표 단계에만 있고, 벌마다 `TEST_AI_ITEMS_MAX` 개까지이며, 번호가 벌의 맨 끝이다(둘째 세션 끝) |
| `level-test-mix` | 단계 평가 · H5 | 단계 규격에 `testMix` 가 있으면 유형별 수가 같다(없으면 보지 않는다) |
| `level-test-forms-overlap` | 단계 평가 | 다른 벌의 문항끼리 (지문, 질문, 보기 묶음)이 같지 않다(소문자 · 공백 정리) |
| `level-test-passage-overlap` | 단계 평가 · AC-7a | 평가 지문 · 듣기 내용의 문장이 같은 영역 · 단계 수업의 지문 · 듣기 내용 문장과 같지 않다(소문자, 공백 정리, 끝 문장 부호 뺌) |
| `level-test-item-overlap` | 단계 평가 | 평가 문항의 (질문, 보기 묶음)이 같은 영역 · 단계 수업 문항의 것과 같지 않다 |
| `talk-test-count` | 회화 평가 카드 | 벌마다 장 번호가 1~(level.test_items ÷ level.test_items_per_session) 안에서 겹치지 않고(빠진 장은 빈 칸), 장마다 턴 수 = level.test_items_per_session |
| `talk-test-unit-count` | 단계 평가 · AC-7a | 장마다 단원별 턴 수 = level.test_items_per_session ÷ 단원 수 |
| `talk-test-allowed` | 회화 평가 카드 | 허용 답이 `TALK_TEST_ALLOWED_MIN` 개 이상. 예 · 아니오 질문(첫 낱말이 `YES_NO_AUXILIARIES` 이고 물음표로 끝남)은 yes 로 시작하는 답과 no 로 시작하는 답이 하나 이상씩 있다. 빈칸 ↔ 품사는 규격이 본다 |
| `talk-test-ko` | 회화 평가 카드 | 회화 단계 규격의 `koMeaning` 단계면 토리 질문의 한국어 뜻이 있다 |
| `talk-test-lesson-overlap` | 단계 평가 · AC-7a | 장마다 그 단계 회화 수업 카드의 토리 질문과 글이 같은 질문이 `TALK_TEST_SAME_QUESTIONS_MAX` 개 이하이고, 같은 질문이 수업 카드와 같은 차례로 `TALK_TEST_SAME_ORDER_RUN_MAX` 턴 넘게 이어지지 않는다 |
| `talk-test-forms-overlap` | 단계 평가 | 다른 벌의 장끼리 같은 토리 질문이 없다 |
| `placement-count` | 배치 평가 · 6.3 | 단계(1~12)마다 문항 번호가 1~placement.items_per_level 안에서 겹치지 않는다(빠진 번호는 빈 칸). 예비 문항은 말하기에만 있고 번호가 같은 범위 안이며(정할 것 ㅊ) 모두 `listening` 이다 |
| `story-count` · `story-ko` | 6.3 토리 이야기 | 번호 1~`STORIES_PER_BAND` 안에서 겹치지 않는다. `STORY_KO_BANDS` 구간이면 한국어 뜻이 있다 |

## 묶음 검사(check-cross.ts)

| 규칙 | 6.4 행 · 정본 | 기준 | 심각도 |
|---|---|---|---|
| `topic-variants` | 주제 변형 | 같은 (영역, 단계, 단원, 종류, 수업 번호)의 변형끼리 새 단어 모음과 분량 서명(문항 수 · 유형별 수, 쓰기 문항 유형별 수 · 문장 틀 수, 따라 말하기 · 듣기 · 질문 수, 회화 턴 수 · 질문 수)이 같다. 학습 요소는 단원 규격 하나라 늘 같다 | 오류 |
| `remedial-coverage` | 보강 덮기 | 주제 변형마다, 단원 단어마다 보강 수업들의 영어 글(role `passage` · `script` · `prompt` · `option` · `answer` · `example` · `hint` · `tori` · `child`)에 나온 수 합 ≥ seed.remedial_coverage.<구간>. 보고에 '아이가 답하는 대상으로 한 번 이상 나오는 단원 단어 수'(정답 보기 · 허용 정답 · 바른 답 · 따라 말할 말 · 회화 노리는 단어)를 단원마다 적는다(6.3 보강 수업 행) | 오류 |
| `relation-early-use` | 조사 P6 둘째 | 정규 수업 m 의 글에, 배정 수업 번호가 m 보다 큰 단원 단어가 나온다. 3.2 가 허용하는 일이라(먼저 고른 수업의 첫 활동에 더해 보인다) 막지 않는다. 실패 예: 단원 1 수업 2 지문에 수업 5 의 새 단어 | 경고 |
| `relation-not-reused` | 조사 P6 셋째 | 단원 단어가 같은 변형의 다지기 수업 어디에도 다시 나오지 않는다(3.2 '다지기 수업은 단원 어휘를 다시 쓰는', 3.4 '이전 수업의 단어를 다시 쓴다'). '어느 수업에서도 닿지 않는 단어'는 6.4 어휘 배정 오류가 이미 잡으므로 남는 몫만 본다. 실패 예: 30단어 가운데 하나가 배정 수업에만 나옴 | 경고 |
| `distribution` | 단계 분포 · AC-7d | 영역 · 단계마다 지표 셋의 단원 평균(그 단원 모든 수업 · 변형): 지문 낱말 수(읽기, 단계 규격 `passage.words` 가 있을 때, 폭 = max − min), 문장 낱말 수(모든 영역의 영어 문장, 상한만이라 폭 = `sentenceMaxWords` × `DISTRIBUTION_UPPER_ONLY_WIDTH`), 범위 밖 비율(읽기 지문, 폭 = seed.max_offband_ratio × `DISTRIBUTION_UPPER_ONLY_WIDTH`). 단원 평균의 최댓값 − 최솟값 > 폭 × `DISTRIBUTION_HALF` 이면 경고. 경고 id `distribution:<영역>:<단계>:<지표>`(P8 이 seed/manifest 에 '그대로 · 다시 만들기'를 적을 때 쓴다). 보고에 영역 · 단계 · 단원마다 평균 · 최소 · 최대 | 경고 |
| `can-do-numbers` | 3.1 'can-do 문장의 숫자는 3.3 표의 숫자와 같아야' | can-do 글의 숫자가 그 단계 규격 JSON 의 숫자 모음에 없다 | 경고 |

관계 경고는 그래프 엔지니어링 스킬 '자료 그래프' 절차를 따랐다. 답할 질문은 셋이다(이 단어는 어느 단원의 새 단어인가 · 소개 전에 쓰였나 · 소개 뒤 다시 쓰였나). 점은 단원 단어와 수업 칸 둘, 선은 '배정됨'(단어 → 배정 수업, 단어마다 하나)과 '나옴'(단어 → 글에 나온 수업, 여럿)이다. 선은 배정 함수와 글 도구로 결정적으로 뽑는다(모델이 뽑지 않는다). P8 표본 두 묶음에서 둘 다 한 번도 잡은 것이 없으면 걷어낸다(스킬 8단계).

## 해시 · 문항 번호 · 풀이 검사 · 완전성(validate.ts)

| 함수(제안) | 규칙 | 정본 |
|---|---|---|
| `cellHash(칸 키, 칸)` | sha256 16진(칸 키 + 줄바꿈 + 정규 JSON(칸에서 `revision` · `correction` · `generation` 을 뺀 것)). 정규 JSON 은 객체 키를 사전 순으로, 공백 없이 쓴다 | 6.4 '칸의 내용 해시' |
| `itemsOf(칸)` | 문항 번호(1부터): 읽기 = 문항 차례, 쓰기 = items 문항 차례 · 문장 틀 차례 · 작문 1, 말하기 = 따라 말하기 단어 → 문장 → 듣기 → 질문 → 그림 보고 말하기 → 발표 차례, 회화 카드 = 인사 → 대화 턴(또는 질문 목록) → 더 이야기할 거리 차례, 읽기 · 쓰기 · 말하기 평가 · 배치 칸 = 1, 회화 평가 카드 장 = 턴 차례(5절 seed_reports '(장, 턴)' — 구현 때 바로잡음 21:3x), 토리 이야기 = 질문 차례 | 5절 seed_reports '문항 번호'. P5 · P11 · 1-나 신고가 같은 번호를 쓴다(정할 것 ㅋ) |
| `solveTargets(칸)` | 풀이 검사 대상 문항: 읽기 문항 전부, 쓰기 items 단계 문항 전부, 말하기 듣기 문항, 단계 평가 · 배치의 읽기 문항 · 듣기 · 쓰기 앱 채점 문항, 토리 이야기 질문. 대상 아님: 회화 카드 · 회화 평가 카드 · 쓰기 4단계 이상 과제 · 말하기 질문 답(평가 포함) · 따라 말하기 · AI 과제 | 6.4 풀이 검사 대상 |
| `solveStatus(칸, 기록)` | 대상이 없으면 `not-needed`. 기록이 없거나 `contentHash` ≠ 지금 해시면 `unchecked`. 기록이 맞고, 판단이 `same` 이 아니거나 `extraAccepted` 가 시드 허용 정답 밖인 문항마다 사람 확인(`human.contentHash` = 지금 해시, `decision: 'correct'`)이 없으면 `pending-human`. 그 밖은 `passed`. '고침'은 내용이 바뀐 것이라 해시가 달라져 `unchecked` 가 된다 | 6.4 '사람 확인 목록이 비어야 완전성 검사가 통과' · '해시가 바뀌면 다시 확인' |
| `expectedCells({ through, areas })` | 아래 완전성 표 | 6.3 · 9절 |
| `validateSeed(파일 묶음, { through?, areas })` | 규격 풀기(수업 파일은 겉을 먼저 풀고 수업마다 따로 풀어 깨진 칸만 실패), 배치 검사(파일 경로 ↔ 영역 · 단계 · 단원, 같은 칸 키 둘), P4b 정합 · 칸 검사, 이 plan 의 검사, 풀이 검사 상태, 완전성 → 보고 | 6.4 |
| `exitCodeOf(보고, 모드)` | 아래 '명령'의 표 | 9절 |

완전성 표(`--complete-through n`, 영역 거르기 A, 기본 넷):

| 무엇 | 차 있어야 하는 칸 |
|---|---|
| 규격 파일 | level_specs 48행(영역 넷 × 1~12), unit_specs 영역 넷 × 1~12 × 단원 1~`UNITS_PER_LEVEL` 과 알파벳 2행. 범위와 상관없이 늘 본다(PR 모드도 오류) |
| 수업 · 회화 카드 | A 의 영역, 단계 ≤ n, 단원 1~5(읽기 · 쓰기 1단계는 단원 0 도): 정규 1~정규 수업 수 × 변형 1~V, 보강 1~seed.remedial_per_unit × 변형 1~V |
| 단계 평가 | A 의 영역, 단계 ≤ n: 벌 1~level.test_forms, 읽기 · 쓰기 · 말하기 문항 1~level.test_items, 회화 장 1~(level.test_items ÷ level.test_items_per_session) |
| 배치 평가 가 벌 | A ∩ {읽기, 쓰기, 말하기}: 1~12단계 전부(n 과 상관없음, 6.3 '가 벌 전부'), 단계마다 문항 1~placement.items_per_level, 말하기 예비 문항 같은 수 |
| 토리 이야기 | 회화가 A 에 있으면 첫 단계 ≤ n 인 구간마다 1~`STORIES_PER_BAND` |
| 칸마다 | 검증 오류 0, 풀이 검사 상태 `passed` 또는 `not-needed` |

## 명령(scripts/seed-validate.ts)

`pnpm seed:validate [--root <폴더>] [--complete-through <n|settings>] [--areas <영역,…>] [--json] [--stats]`. P1b 의 spec-trace · check-bundle 과 같은 꼴로 짠다. 순수 함수(`parseArgs` · `runValidate(인자, 읽은 파일 묶음)` → `{ code, lines }`)를 내보내고, 파일을 걷고 읽는 일과 출력은 직접 실행될 때만 한다(`isDirectRun`, `process.exitCode = main()`).

| 인자 | 뜻 |
|---|---|
| `--root` | 시드 뿌리(기본 `seed`). 걷는 곳은 P4a '시드 파일 배치'의 경로들이고 `prompts/` · `manifest/` · `reports/` 는 걷지 않는다 |
| `--complete-through` | 1~12 정수, 또는 `settings`(settings.json 의 seed.complete_through_level). 주면 완전성 모드 |
| `--areas` | 쉼표로 이은 영역 이름(기본 넷). 개발용 적재의 1-가 범위(정할 것 ㅇ)에 쓴다 |
| `--json` | 사람 출력 대신 JSON 보고 하나만 표준 출력에 쓴다 |
| `--stats` | 사람 출력 끝에 영역 · 단계 · 단원 통계 표를 더한다 |

| 모드 | 막는 것(종료 1) | 보고만 |
|---|---|---|
| PR(인자 없음) | 있는 칸의 검증 오류, 규격 파일 오류, 사람 확인 남음 | 빈 칸(settings 의 seed.complete_through_level 까지, 영역 A), 풀이 검사 안 된 칸, 경고 |
| 완전성(`--complete-through`) | 위 + 범위 안의 빈 칸과 풀이 검사 안 된 칸 | 경고 |

- 종료 코드: 0 통과(경고가 있어도), 1 위반, 2 입력 오류(모르는 인자 · 잘못된 값, 뿌리 폴더 없음, 꼭 있어야 하는 규격 파일 `settings.json` · `level-specs.json` · `unit-specs.json` · `vocab.json` · `images.json` · `lists/forms.json` · `lists/forbidden.json` 이 없거나 JSON 이 아님, `--complete-through settings` 인데 키가 없음). 다른 파일이 JSON 이 아니면 그 파일 칸 전부 `json` 오류(1)로 센다. 조용히 0 으로 끝나지 않는다.
- 사람 출력 첫 줄: `seed-validate: 칸 <n> · 통과 <n> · 실패 <n> · 빈 칸 <n> · 풀이 검사 안 됨 <n> · 사람 확인 <n> · 경고 <n> · 규격 파일 오류 <n>`. 다음 줄부터 `<파일>:<경로> <규칙> <칸 키> <설명>`(오류 먼저, 경고는 '경고' 머리). 빈 칸 · 풀이 검사 안 된 칸은 수만 적고 목록은 `--json` 에 둔다. 사람 확인 남은 칸은 목록을 적는다.
- `--json` 꼴(`version: 1`): `{ version, mode, completeThrough, areas, summary: { cells, passed, failed, empty, unchecked, pendingHuman, warnings, referenceErrors }, errors: { rule, cell, file, path, message }[], warnings: { id, rule, cell?, file?, message }[], empty: 칸 키[], unchecked: 칸 키[], pendingHuman: 칸 키[], stats: { area, level, unit, passageWords?, sentenceWords, offbandRatio?, answerTargetWords? }[] }`. P8 워크플로는 `errors[].cell` 로 실패 칸만 되돌린다(바꿀 때는 `version` 을 올리고 P8 과 맞춘다).
- API 를 부르지 않는다. 명령과 `src/core/seed` · `src/core/vocab` 의 가져오기 그래프에 `@anthropic-ai/sdk` · `node:http` · `node:https` 가 없고, 그 파일들에 `fetch(` 가 없다(AC-7d, 아래 시험).

## 6.4 행마다 통과 · 거부 사례(P4 완료 판정)

| 6.4 행 | 통과 사례 · 거부 사례 | 시험 파일(plan) |
|---|---|---|
| 분량 | 읽기 4단계 통과 · 54 · 81단어 거부, 쓰기 1~5단계 수 거부, 회화 1단계 턴 수 하나 적음 거부 | reading · writing(b), talk(c) |
| 말하기 수업 | 1 · 6 · 10단계 통과 · AC-5h 다섯 거부 | speaking(b) |
| 어휘 배정 | 새 단어가 글에 있음 통과 · 없음 거부, 쓰기 6단계 과제 · 예시 · 힌트, 회화 아이 차례 · 처음 묻는 턴 · 다시 묻는 턴 자리 · talk.known_days | reading · writing(b), talk(c) |
| 보강 덮기 | seed.remedial_coverage 이상 통과 · 미만 거부 | distribution(c) |
| 어휘 범위 밖 단어 | 5% 경계 통과 · 초과 거부 | reading(b) |
| 학습 요소 범위 | 상한 이하 통과 · 상한 + 1 거부, 범위 안 형태 통과 · 범위 밖 형태 거부 | reading(b), talk(c) |
| 정답 | 보기 안 통과 · 밖 거부, 허용 정답 · 카드로 만들 수 있음 | reading · writing(b) |
| 그림 | 카탈로그 안 통과 · 밖 거부(읽기 · 쓰기 · 말하기 · 회화) | image · speaking(b), talk(c) |
| 글로서리 | 다 있음 통과 · 빠짐 거부 | reading(b) |
| 금지 내용 | 깨끗함 통과 · 금지어 · 정규식 · 연락처 꼴 거부 | reading(b) |
| 회화 시나리오 카드 | 1 · 3 · 4 · 5단계 카드 통과 · AC-15m 거부 사례 | talk(c) |
| 주제 변형 | 같음 통과 · 새 단어 다름 거부 | distribution(c) |
| 단계 평가 | 벌 통과 · AC-7a 거부 사례 · 벌 겹침 · AI 과제 수와 자리 | complete(c) |
| 회화 평가 카드 | 장 통과 · 허용 답 둘 · 예 쪽만 · 턴 수 거부 | complete(c) |
| 단계 분포 | 경고 없음 · 경고 있음(종료 0) | distribution(c) |
| 풀이 검사 | passed 통과 · 다르게 풀림 → 사람 확인 · 해시 바뀜 → 풀이 검사 안 됨 | distribution · complete(c) |

## 작업 순서 (Order of work)

한 구현자(implementer · Opus · high)가 차례로 한다. 명령은 `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴이다(서브에이전트 환경이 `source` 를 막는다, 20:4x 고침). 시작 전에 P4b 검토의 Minor 넷(M-1 칸 검사 준비 가름 · M-2 견본 형태 표 낱말 목록 · M-3 메시지 숫자 · M-4 word · audioText = 허용 정답)과 `WORD_BOX_MIN` → structure.ts 를 먼저 한다(컨트롤러 20:4x). 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 시험 숫자는 P4a 만들기 함수의 설정값 · 단계 규격 견본에서 읽는다.

1. [검증] `check-talk.ts` 카드 하나. 시험 먼저(`seed-validator-talk.test.ts` 의 AC-15m · 6.4 줄). 완료: 시험 통과.
2. [검증] `check-talk.ts` 단원 단위와 `check-assessment.ts`. 시험 먼저(AC-15m 단원 줄, `seed-validator-complete.test.ts` 의 평가 · 배치 · 이야기 줄). 완료: 시험 통과.
3. [검증] `check-cross.ts`. 시험 먼저(`seed-validator-distribution.test.ts` 의 분포 · 보강 덮기 · 주제 변형 · 관계 · can-do 줄). 완료: 시험 통과.
4. [검증] `validate.ts` 와 만들기 함수의 `miniSeed`. 시험 먼저(AC-7a 완전성 줄, AC-7d 풀이 검사 줄). 완료: 시험 통과, `miniSeed({ areas: 넷, through: 1, frame: 'small' })` 가 오류 0 · 빈 칸 0.
5. [검증] `scripts/seed-validate.ts`. 시험 먼저(`seed-validate-cli.test.ts`). tsx 를 띄우는 시험은 넷까지 두고(위험 7) 나머지는 `runValidate` 를 바로 부른다. 완료: 시험 통과.
6. [검증] API 0회 시험(AC-7d)과 실기. `tests/.tmp/` 에 `writeSeedTree` 로 시드 나무를 쓰고 `pnpm seed:validate --root <폴더>` · `--complete-through 1` · `--json` 을 돌려 본다(공용 변경 1 이 합쳐지기 전에는 `node_modules/.bin/tsx scripts/seed-validate.ts`). 완료: 구현 보고에 출력.
7. [검증] 마무리. 컨트롤러가 '요청하는 공용 변경'을 합친 뒤 `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` 0, `pnpm spec:trace` 의 missing-test 가 시작 때보다 2 적다(AC-7a · 7d), 저장소에 seed/ 가 없을 때 `pnpm seed:validate` 는 2(뿌리 없음)이고 CI 의 seed-validate 단계는 건너뛴다. 완료: 구현 보고에 출력.
8. [사람] 검토 · 커밋(H14). code-reviewer(Opus · xhigh) 검토와 fix(3회까지) 뒤 요청자 지시로 컨트롤러가 커밋한다. 완료: 커밋. P4 완료로 묶음 plan 작업 순서 3 의 '검증기 시험 통과'가 채워지고 P5 · P6 · P7 이 이 꼴을 쓴다.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 시드 전체 검증의 시간 · 메모리(수업 칸 약 7,600 · 평가 칸 약 2,200, JSON 수십 MB 로 추정) | CI 가 느려진다 | 단어 사전은 한 번 만들고 칸마다 글을 한 번만 자른다. 표본(P8)에서 크기 · 시간을 재 보고한다(5절 '표본에서 잰다') |
| 2 | 1-가 동안 main 의 완전성은 회화 (4-나) 전이라 실패가 예상된다 | 운영 승격이 막힌다 | 묶음 위험 17 그대로(1-나 끝까지 예상된 상태로 적는다) |
| 3 | 개발용 적재의 1-가 범위가 정본과 부딪친다(정할 것 ㅇ) | dev-load 가 늘 실패한다 | `--areas` 만 준다. 범위는 P7 계획 때 컨트롤러가 13절로 정한다 |
| 4 | P8 이 `--json` 꼴에 기댄다 | 꼴을 바꾸면 워크플로가 깨진다 | `version` 칸. 바꿀 때 P8 과 맞춘다 |
| 5 | P5 가 해시 · 문항 번호 · 풀이 대상에 기댄다 | 해시 정의를 바꾸면 seed/checks 를 모두 다시 풀어야 한다(비용) | 해시 정의를 바꾸지 않는다. 바꿀 일이 생기면 13절 한 줄과 다시 풀기 비용을 함께 적는다 |
| 6 | 예 · 아니오 질문 판별은 영어 문법 목록에 기댄 어림이다 | 놓친 질문이 생긴다 | 표본 검토 · 풀이 검사 밖이므로 P8 묶음 검토 때 회화 평가 카드를 사람이 본다 |
| 7 | 명령 시험이 tsx 를 띄워 느리고, 구현자 끝내기 관문이 단위 시험을 끝마다 돈다 | 관문이 느려진다 | 띄우는 시험은 넷까지, 나머지는 함수 직접 호출 |
| 8 | CI seed-validate 작업은 seed/ 가 생기기 전(P6 전)에는 검증 단계를 건너뛴다 | 빈 검사가 초록으로 보인다 | 필수 검사로 걸기(H8) 전에 seed/ 가 있어야 한다. 그때까지 단위 시험이 명령을 덮는다 |
| 9 | 회화 카드 검사 시험 이름에 1-나 AC-15m 을 쓴다 | 1-나 spec-trace 가 Playwright 몫 없이 덮였다고 센다 | 정할 것 ㅍ. 1-나 묶음 plan 증명 표에 Playwright 시험을 따로 적는다 |
| 10 | 관계 경고 둘이 쓸모없을 수 있다 | 경고가 잡음이 된다 | 스킬 8단계: P8 표본 두 묶음에서 한 번도 잡지 못하면 걷어낸다 |
| 11 | 칸 키 · 경로 · `--json` 의 칸 키 글을 P7 적재가 다시 푼다 | 적재가 다른 키를 만든다 | P4a `structure.ts` 의 만들기 · 풀기 함수를 P7 이 그대로 쓴다 |

### 정할 것 · 제약 · 확인한 사실

정할 것은 P4a 의 ㄱ~ㅍ 가운데 ㅅ(평가 · 이야기의 형태 범위) · ㅇ(개발용 적재 범위) · ㅈ(다시 묻는 턴 세기) · ㅊ(배치 예비 문항 수) · ㅋ(풀이 검사 약속) · ㅍ(AC-15m)이 이 plan 에 닿는다. 제약은 P4a 와 같다. 이 plan 만의 확인 사실은 아래다.

| 사실 | 출처 · 판 |
|---|---|
| 시드 검증 CI: 실패 · 사람 확인이 남으면 실패, 빈 칸으로 막는 완전성 검사는 main 작업과 개발용 적재 작업에서만, 그 밖의 CI 는 있는 칸만 막고 빈 칸 수는 보고만 | `specs/08-테스트와-기술.md` 16줄(9절, 검토 5회차 B5-20) |
| 개발용 적재는 seed.complete_through_level 을 작업 입력으로 덮어 넣고 그 값까지 완전성을 본다 | `specs/08-테스트와-기술.md` 48줄(11절 (4-1)) |
| 1-가 실시드 범위: 배치 가 벌 전부 · 읽기 · 쓰기 · 말하기 1단계 단원 5개 전부 · 1단계 단계 평가 1벌 이상 | `specs/10-결정-기록.md` C50 (4) |
| GitHub Actions `hashFiles()` 는 맞는 파일이 없으면 빈 글을 돌려준다. 단계 `if`(`jobs.<id>.steps.if`)에서 쓸 수 있고 작업 `if` 에서는 못 쓴다 | https://docs.github.com/en/actions/reference/workflows-and-actions/expressions · https://docs.github.com/en/actions/reference/workflows-and-actions/contexts (2026-10-16) |
| 종료 코드 0 · 1 · 2 와 순수 함수 + 직접 실행 판별의 꼴 | `scripts/spec-trace.ts` · `scripts/check-bundle.ts`(cf97f62) |

## 요청하는 공용 변경(컨트롤러가 합친다)

P2 · P3 이 같은 파일을 고치지만 격리 워크트리라 이 plan 의 구현자가 자기 워크트리에서 1~3 을 옮기고(3 도 넣는다 — P4a 검토 때 fs 금지 요청), 다른 워크트리와 합칠 때 컨트롤러가 충돌을 푼다(컨트롤러 20:4x, P3a 와 같은 방식).

컨트롤러 결정(구현 뒤 2026-10-16 21:3x, `task-p04c-report.md` DONE_WITH_CONCERNS, 시험 159 · missing-test 60 → 58 · 실기 셋 통과): 회화 평가 카드 장의 문항 번호는 턴 차례(5절 '(장, 턴)', 위 표 고침)로 수용 — P5 · P11 신고가 같은 번호를 쓴다. `--json` stats 의 `ranges`(최소 · 최대) 추가와 version 1 유지 수용(P8 브리프에 메모). `--areas` 가 완전성만 아니라 검사 대상도 거르는 것 수용(개발용 적재 범위 ㅇ 와 맞음). 단원 단위 오류(`talk-again-slots` · `talk-known-days` · `remedial-coverage`)의 `errors[].cell` 이 null 인 것은 P8 워크플로가 '단원 전체 다시 만들기'로 다룬다(P8 브리프 메모, 검토자 판정). 다시 묻는 턴 자리는 대화 턴만 센다(해석, 검토자 판정). miniSeed 가 1단계까지만인 것은 남은 우려로 기록. 공용 변경 3 의 규칙 이름은 `core-no-io`(node: 접두를 떼고 적음을 시험이 고정). 검토는 rev-p04a 이어 보기(`task-p04c-review.md`).

검토 뒤 결정(2026-10-16 21:5x, `review-p04c.md` Approved C 0 · I 0 · M 4): 판정 요청 둘 수용(다시 묻는 턴 자리는 대화 턴만 — 3.2 관계 표 셈과 맞음, 단원 단위 오류의 cell null 은 P8 이 file · path(variant.n) · rule 로 범위를 정함 — P8 브리프 메모). fix 1(`task-p04c-fix1.md`): M-1(첫 줄 요약의 '실패' 수에 칸 키 없는 파일 · 단원 단위 오류도 세고, JSON 이 아닌 파일은 그 파일 칸 전부를 json 오류로 — plan 명령 절 글자대로) · M-2(seed.complete_through_level 은 1~12 정수 — 설정값 정합 `settings` 규칙에 더하고, 벗어나면 완전성 모드는 2 로 끝남) · M-3(말하기 9~12단계 평가의 question 문항을 막는 plan 밖 규칙을 지운다 — 6.3 'AI 과제(말하기 질문 답 포함) 말하기 9단계 이상 2개까지'와 level-test-type · level-test-ai 행대로 허용 답 없는 question 은 AI 과제로 센다) · M-4(`validateSeed` 498줄에서 칸 걷기를 `collectCells` 로 떼어 내보낸다 — P5 · P7 이 같은 걷기를 다시 짜지 않게). Minor 만이라 fix 1 뒤 컨트롤러 확인으로 닫는다(시험 159 + 실기 셋 다시).

1. `package.json` 의 scripts 에 한 줄.

```json
"seed:validate": "tsx scripts/seed-validate.ts"
```

2. `.github/workflows/ci.yml` 의 seed-validate 자리 작업을 바꾼다. 준비 네 줄은 다른 작업과 같다. `hashFiles` 는 단계 `if` 에만 쓸 수 있다(확인한 사실).

```yaml
  seed-validate: # P4c. seed/ 가 생기기 전(P6 전)에는 검증 단계를 건너뛴다
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6 # 판은 package.json 의 packageManager 에서 읽는다
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - if: ${{ hashFiles('seed/settings.json') != '' }}
        run: pnpm seed:validate
```

3. (선택) `.dependency-cruiser.cjs` 에 `src/core` 가 파일 · 네트워크 모듈(`fs` · `child_process` · `http` · `https` · `net`)을 가져오지 못하게 하는 규칙. '순수 함수' 원칙을 검사로 바꾼다. 넣으면 P1b 의 `tests/unit/dependency-rules.test.ts` 에 막는 예 · 허용 예 두 줄이 더 든다. dependency-cruiser 가 `node:` 붙은 내장 모듈을 어떤 경로로 적는지는 (추측)이라 그 시험이 확인한다. 권함: P4c 뒤 P1c 와 함께.

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-7a | 단위 "AC-7a 완전성: 시험용 시드가 1단계까지 차 있고 풀이 검사를 통과하면 통과한다" · "AC-7a 완전성: 칸 하나를 지우면 실패한다" · "AC-7a 완전성: 사람 확인 목록에 칸이 남으면 실패한다" · "AC-7a 단계 평가: 지문에 그 단계 수업 지문과 같은 문장이 있으면 거부한다" · "AC-7a 단계 평가: 단원마다 문항 수가 level.test_items ÷ 단원 수가 아닌 벌을 거부한다" · "AC-7a 회화 평가 카드: 장마다 단원별 턴이 level.test_items_per_session ÷ 단원 수가 아니면 거부한다" · "AC-7a 회화 평가 카드: 수업 카드와 글자가 같은 질문이 4개인 장을 거부한다". CI `main / seed-validate` 는 P7. 실시드 전체 통과는 (4-나) 뒤라 1-나 | `tests/unit/seed-validator-complete.test.ts` |
| 6.4 평가 · 배치 · 이야기 | 단위 "6.4 단계 평가: 벌 사이에 같은 문항과 수업 문항과 같은 질문 · 보기 묶음을 거부한다" · "6.4 단계 평가: AI 과제 문항이 셋이거나 둘째 세션 끝이 아니면 거부한다" · "6.4 회화 평가 카드: 허용 답 둘 · 예 쪽만 있는 예 · 아니오 질문 · 장의 턴 수 어긋남을 거부한다" · "6.4 배치 평가: 범위 밖 문항 번호와 읽기 · 쓰기 예비 문항 · 듣기가 아닌 예비 문항을 거부하고 빠진 문항은 완전성에서 실패한다" · "6.3 토리 이야기: 구간마다 번호가 겹치거나 1~6단계 구간에 한국어 뜻이 없으면 거부한다" · "6.3 규격 파일 완전성: level_specs 48행 · unit_specs 240행과 알파벳 2행이 아니면 오류" | `tests/unit/seed-validator-complete.test.ts` |
| AC-7d | 단위 "AC-7d 단계 분포: 같은 단계 단원 평균 지문 길이 차이가 규격 폭의 절반을 넘으면 경고를 내고 종료 코드는 0 이다" · "AC-7d 단계 분포: 상한만 있는 지표는 상한의 20% 를 폭으로 본다" · "AC-7d 풀이 검사: 앱 정답과 다르게 풀린 문항은 사람 확인 목록에 들고 PR 모드도 실패한다" · "AC-7d 풀이 검사: 같은 해시의 사람 확인 '정답 맞음'이 있으면 통과하고 내용이 바뀌면 풀이 검사 안 됨이다" · "AC-7d 시드 검증은 API 를 부르지 않는다: 명령의 가져오기 그래프에 @anthropic-ai/sdk · http 가 없고 fetch 가 없다". `solve-check.test.ts` 몫은 P5 | `tests/unit/seed-validator-distribution.test.ts` |
| 6.4 묶음 · 관계 | 단위 "6.4 보강 덮기: 단원 단어가 보강 수업들에 seed.remedial_coverage 번 미만이면 거부하고 답하는 대상 단어 수를 보고한다" · "6.4 주제 변형: 같은 수업의 변형끼리 새 단어 · 분량이 다르면 거부한다" · "조사 P6 관계: 배정 전에 쓰인 단원 단어와 다지기에서 다시 안 나온 단원 단어를 경고한다" · "3.1 can-do: 단계 규격에 없는 숫자가 든 can-do 를 경고한다" | `tests/unit/seed-validator-distribution.test.ts` |
| AC-15m(1-나, 단위 몫) | 단위 "AC-15m 회화 1단계 카드: 인사 질문 수와 대화 턴 질문 수의 합이 목표 턴과 같으면 통과하고 하나 적으면 거부한다" · "AC-15m 회화 배정 카드: 처음 묻는 턴이 대화 토막 뒤쪽 절반에 있으면 거부한다" · "AC-15m 회화 카드: 글자가 같은 토리 질문이 세 번이면 거부한다" · "AC-15m 회화 1단계 카드: 답 두 개가 같은 꼴 문장이 아니면 거부한다" · "AC-15m 회화 3단계 카드: 영어 틀이 없는 턴을 거부한다" · "AC-15m 회화 카드: 카탈로그에 없는 그림 키를 거부한다" · "AC-15m 회화 카드: 토리 질문에 그 턴이 노리는 단원 단어가 있으면 거부한다" · "AC-15m 회화 1단계 단원: 한 주제 변형 정규 카드의 다시 묻는 턴 자리가 단원 단어 수 × talk.said_ratio × talk.known_days 보다 적으면 거부한다" · "AC-15m 회화 단원: 단원 단어 하나가 서로 다른 수업의 다시 묻는 턴에 talk.known_days 번 나오지 않으면 거부한다" | `tests/unit/seed-validator-talk.test.ts` |
| 6.4 회화 시나리오 카드 | 단위 "6.4 회화 시나리오 카드: 4단계 질문 목록이 목표 턴 − 인사 턴 수보다 적거나 영어 힌트 단 수가 다르면 거부한다" · "6.4 회화 시나리오 카드: {NAME} 밖의 틀 자리 · 5단계 미션 수 어긋남 · 1~4단계 한국어 뜻 빠짐을 거부한다" · "6.4 어휘 배정(회화): 새 단어가 아이 차례의 힌트 · 답 예시 · 쓸 수 있는 말 · 목표 표현에 없으면 거부한다" · "6.4 회화 시나리오 카드: 더 이야기할 거리가 talk.more_talk_turns 턴이 아니거나 이 대화에서 묻지 않은 단어를 노리면 거부한다" | `tests/unit/seed-validator-talk.test.ts` |
| 명령 | 단위 "AC-7a · AC-7d 명령: PR 모드는 빈 칸을 보고만 하고 0, --complete-through 1 은 빈 칸이 있으면 1" · "AC-7a 명령: 검증 실패 칸이 있으면 1 이고 칸 · 규칙 · 파일을 한 줄씩 낸다" · "명령: 첫 줄 요약 꼴과 --json 보고 꼴" · "명령: 뿌리 폴더가 없거나 설정값 시드가 깨졌거나 모르는 인자면 2" · "명령: --areas 와 --complete-through settings" + `pnpm seed:validate`(작업 6 실기 출력) | `tests/unit/seed-validate-cli.test.ts` · `scripts/seed-validate.ts` |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` 0. `pnpm spec:trace` missing-test −2(AC-7a · 7d). CI `ci / seed-validate`(공용 변경 2 뒤, seed/ 가 생기면 실제로 돈다) | 작업 7 |

시험 이름은 글자 그대로 적는다(spec-trace). 시험 안의 숫자는 만들기 함수의 설정값 · 단계 규격 견본에서 읽는다.

## 완료 보고 (Done)

- 구현: impl-p04a(implementer · Opus · high)가 P4a · P4b 와 같은 격리 워크트리(`agent-a6ef72438a158a2f3`, 브랜치 `feature/1a-p04c-seed-validate`, P4b 커밋 f27ae15 위)에서 이어 함(42분 + fix 9분). 보고 `task-p04c-report.md` · fix 1 `task-p04c-fix1-report.md`(워크트리의 장부 폴더).
- 실제 바뀐 파일: 표의 새 파일 아홉(`check-talk.ts` · `check-assessment.ts` · `check-cross.ts` · `validate.ts` · `scripts/seed-validate.ts` · 시험 넷) + 공용 변경 넷(`package.json` seed:validate · `ci.yml` seed-validate 작업 · `.dependency-cruiser.cjs` core-no-io + `dependency-rules.test.ts`) + P4b 파일 둘(`reference-index.ts` 의 complete_through_level 범위 · `vocab-allocate.test.ts` 사례). `builders.ts` 의 miniSeed · 회화 견본 unitWords 와 P4b 검토 Minor 넷 · WORD_BOX_MIN · C60 영어 값은 P4a(c3f6baf) · P4b(f27ae15) 커밋에 들어갔다.
- 계획과 다르게 한 것: 회화 평가 카드 장의 문항 번호는 턴 차례(5절 '(장, 턴)'), `--json` stats 에 `ranges`(version 1), `--areas` 가 검사 대상도 거름, 단원 단위 오류는 `errors[].cell` null(P8 은 file · path · rule 로 범위), 다시 묻는 턴 자리는 대화 턴만, 규칙 이름 `core-no-io`(dependency-cruiser 가 `node:` 접두를 뗀 이름으로 적음을 시험이 고정), `collectCells` · `expectedCellsOf` 내보내기(fix 1 M-4), summary.failed 는 '실패 칸 + 칸 키 없는 오류'(fix 1 M-1 — P8 브리프 메모).
- 시험 · 명령: 시험 159(증명 표 40 글자 그대로 + 의존 규칙 2), lint 0 · build · check:deps 0 · check:bundle 0 · spec-trace missing-test 60 → 58(AC-7a · 7d). 실기(miniSeed small, through 1): PR 모드 칸 172 · 통과 172 · 빈 칸 500 · exit 0, `--complete-through 1` 빈 칸 0 · exit 0, `--complete-through 2` 빈 칸 96 · exit 1, seed/ 없을 때 exit 2.
- 검토: `review-p04c.md` Approved(C 0 · I 0 · M 4) → fix 1(M-1 첫 줄 실패 수 · json 오류 셈, M-2 complete_through_level 1~12, M-3 말하기 9~12 평가 question 막던 plan 밖 규칙 지움, M-4 collectCells) → 컨트롤러 확인 22:0x(C52, Minor 만).
- 남긴 것: miniSeed 는 1단계까지만(2단계 이상 꼴의 묶음 검사는 견본 단위 시험으로만). `check-lesson.ts` 1028줄 · `validate.ts` 는 나누지 않음. P5 · P7 · P8 메모: `collectCells` · `expectedCellsOf` · `cellHash` · `itemsOf` · `solveTargets` · `--json` version 1(+ ranges, failed 의 뜻) · 경고 id 꼴 · 단원 단위 오류 범위. P6 메모(P4a · P4b 검토에서): 형태 표 정규식 낱말 경계 · 활용형 칸 불규칙형 · 축약형 · 줄임말 점까지 · function 표시 범위 · 금지어 활용형 꼴 · 견본 Opus 캐시 단가 옮기지 말 것. 묶음 plan 작업 3 '검증기 시험 통과' 채움(P4 끝).
- 커밋: 6bd6015(브랜치 `feature/1a-p04c-seed-validate`, P4b f27ae15 위, 17 파일, 요청자 지시 "응 P4c 도 커밋해" 22:0x). P4 셋이 c3f6baf → f27ae15 → 6bd6015 로 쌓였다. 워크트리 agent-a6ef72438a158a2f3 은 깨끗함. PR 은 H15 뒤.
