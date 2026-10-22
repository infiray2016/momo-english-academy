# 구현 보고: P11(plan-p11a · b · c) — implementer impl-p11

워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p11`, 브랜치 `feature/1a-p11-session-activities`(바탕 dc5308d). 커밋 · stash · push 없음(H14).

## 차례 1 — 순수 함수 바탕(검토 묶음 A1, 2026-10-18 06:0x)

상태: DONE_WITH_CONCERNS(우려는 아래 '정할 것' 셋 · '남은 우려' — 모두 plan 권함 안에서 고른 해석이고 설계를 바꾸지 않았다).

### 바뀐 파일

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/session/preview.ts` | 수정 | `Activity` 종류 스물하나(57) · `ActivityKind`(86) · `ActivityModelInput`(93) · `activitiesOf`(188~ — 값 1 활동 모델, 쓰기 두 세션 · thinkout · corrections · confirmQuestions · 그림 보고 말하기를 질문 앞에). `writing-sentence` · `writing-composition` 없앰 |
| `src/core/session/attempt.ts` | 신규 | `ATTEMPTS_PER_BATCH_MAX` 50(19) · `INPUT_JSON_MAX` 4000(21) · `AttemptInputSchema`(48, Zod 판별 합 a 몫 여덟 종류) · `parseAttemptInput`(79, P10 `{ shownWords }` → preview final) · `inputFitsActivity`(101) · `finalActivityNos`(111) · `resumePointOf`(125) · `lemmaLookup`(161) · `appActivityResult`(359) |
| `src/core/scoring/score.ts` | 신규 | `sessionScoreOf`(93, 3.7 표 전부 · 반올림 없음) · `cleanSentenceRate`(58, 쓰기 4~5) · `rubricScoreOf`(64, 평균 ÷ 4) |
| `src/core/speaking/judge.ts` | 신규 | `MIC_CAPTURE_STREAK` 3(14, repeat.tsx 에서 옮김) · `RESULT_PHRASES` · `resultPhraseOf`(34) · `judgeAppAnswer`(57) · `answerShapeOf`(87) · `answerMaxSecondsKey`(105) · `speakingCountersStart` · `speakingCounters`(198) · `speechEventOf`(244) · `englishSentencesOf`(275) |
| `src/core/speech/match-rate.ts` | 수정 | `matchedTargetWords`(299) — 정렬 표를 거꾸로 따라가 목표 낱말마다 맞았는지. 기존 `matchRate` · `bestMatchRate` · `normalizeForMatch` 는 그대로(기존 시험 열 통과) |
| `src/components/answer/repeat.tsx` | 수정 | `MIC_CAPTURE_STREAK` 를 `@/core/speaking/judge` 에서 가져옴(15, 상수 정의 지움 — 다른 가져오는 곳 없음) |
| `src/app/(child)/session/[id]/session-frame.tsx` | 수정 · **계획 표 밖(브리프 허용 꿰맞춤)** | `writing-sentence` 갈래 → `writing-guided`(124, 문장 전부를 P10 `WritingGuidedSentence` 로 나열), `writing-composition` → `draft`(138, P10 `WritingComposition` 그대로), 새 b · c 종류는 `default: null`(191). 다른 동작 없음 — 차례 2 가 틀을 다시 쓴다 |
| `tests/unit/session-preview.test.ts` | 수정 | P10 '활동 차례' 사례 하나를 지우고 다섯(읽기 · 쓰기 1~3 · 말하기 1 · 회화, 쓰기 4~5, 쓰기 6~12 두 세션, 말하기 6 · 10, 시험용 시드 1단계 차례 번호 = P10 · 두 인자 꼴 같음) |
| `tests/unit/session-attempt.test.ts` | 신규 | 아홉(세션 바탕 · 시도 꼴 둘 · 앱 채점 셋 · 단어별 정오 · 단어 수 · 낱말 원형) |
| `tests/unit/score.test.ts` | 신규 | AC-6c 넷 + 하나 |
| `tests/unit/speaking-judge.test.ts` | 신규 | AC-5f 둘 + 답 꼴 · 인식 셈 다섯 · 영어로 말한 문장 수 |
| `tests/unit/match-rate.test.ts` | 수정 | 낱말별 맞춤 둘 |
| `tests/unit/answer-check.test.ts` | 수정 | AC-4a 단위 하나(견본 빌더 1 · 3단계 문항 그대로) |

계획 표 밖 파일: `session-frame.tsx` 하나(브리프 '가장 작은 꿰맞춤' 허용). 스키마 · 시드 · 설정 · 공용 시험 자료 · 서버 파일은 건드리지 않았다(서버 `src/server/session/index.ts` 는 읽기만).

### 시험 수

단위 446 → **476**(+30, 할 일 6 그대로). 파일 49 통과.

덮는 시험(plan 증명 표 글자 그대로 — 기계 대조로 확인):
- `answer-check.test.ts` "AC-4a 쓰기 1단계 빈 글자 채우기와 3단계 카드 조립은 앱이 채점하고 조립은 허용 정답 가운데 하나와 같으면 정답이며 첫 글자 대문자와 마침표 카드를 판정한다"
- `score.test.ts` "AC-6c 점수 함수는 3.7 표의 경계값을 맞게 낸다(…)" · "AC-6c 쓰기 4단계 3문장 가운데 고칠 곳 없는 문장이 2개면 0.67 이다" · "AC-6c 말하기 1~8단계는 a = speaking.match_weight · L = speaking.listening_weight 로 계산하고 질문 답 평가가 하나도 없으면 a = 1 이다" · "AC-6c 점수 없는 세션(…)은 점수가 비어 최근 성적에서 빠진다"
- `speaking-judge.test.ts` "AC-5f 말하기 1단계 질문 답은 허용 답과의 일치율이 speaking.answer_match_pass 이상이면 맞음이고 아니면 다시다" · "AC-5f 일치율 0.95 는 '잘 말했어요', 0.7 은 '거의 다 맞았어요', 0.5 는 '한 번 더 들어 볼까요'다" · "영어로 말한 문장 수: 인식 글이 있는 발화마다 하나다"
- `session-attempt.test.ts` "세션 바탕: 이어 할 자리는 끝 시도가 없는 가장 앞 활동이고 P10 의 꼬리표 없는 미리보기 시도는 끝으로 본다" · "단어별 정오: 앱이 정답을 아는 낱말 문항의 단원 단어만 내고 따라 말하기는 정렬로 맞은 낱말만 맞음이다"
- 그 밖 AC 접두 없는 사례: 활동 차례 다섯 · 시도 꼴 둘 · 앱 채점 셋 · 단어 수 · 낱말 원형 · 답 꼴 · 인식 셈 다섯 · 낱말별 맞춤 둘 · 세션 점수 하나. 숫자는 모두 `TEST_SETTINGS`(speaking.* · ui.match_phrase_levels · speech.max_retries · speech.silent_items_max)와 견본 빌더 · 시험용 시드에서 읽는다.

시험을 먼저 쓰고 실패를 봤다(새 파일 셋은 모듈 없음, 활동 차례 다섯 · 낱말별 맞춤 둘 실패, AC-4a 는 바탕 `checkAnswer` 라 처음부터 통과). 낱말별 맞춤의 '순서 바꾼 문장' 사례는 길이 같은 정렬이 둘이라 기대값이 임의였다 — 모호하지 않은 예('I like green apples')로 바꾸고, 정렬 둘 이상인 사례는 '맞은 수 ÷ 낱말 수 = 일치율'로만 본다.

### 다르게 한 것과 까닭

1. **`activitiesOf` 는 두 꼴을 받는다.** plan 값 1 의 입력 꼴(`{ area, level, content, part?, thinkout?, corrections?, confirmQuestions? }`)이 본 꼴이고, P10 서버(`src/server/session/index.ts:489`)가 부르는 `(area, content)` 꼴을 덧붙임으로 남겼다(첫 세션 · 생각 꺼내기 없음 · 확인 질문 0). 서버 파일은 차례 2 몫이라 읽기만 했고 tsc · build 를 초록으로 두려는 것이다. `level` 칸은 지금 차례를 정하는 데 쓰지 않는다(부르는 쪽이 thinkout · corrections · confirmQuestions 로 채움).
2. **`AppScoringContext` 에 `appJudgedQuestions` 를 더했다.** plan 의 ctx 넷(answerMatchPass · homophones · unitWords · lemmaOf)만으로는 '질문 답이 앱 판정인가(level_specs `questions.acceptedMin > 0`)'를 함수가 알 수 없다. 시드의 `accepted` 칸 유무로 가르지 말라는 값 2 대로 부르는 쪽이 넘긴다. false 면 점수 · 단어별 정오 없음, 단어 수만 낸다(c 의 '건너뛴 끝 시도' 길).
3. **`sessionScoreOf` 입력은 영역별 판별 합이다.** plan 은 한 꼴 `{ area, shape, activities, rubric?, weights }` 인데, 영역마다 쓰는 칸이 달라(shape 는 쓰기, weights 는 말하기) 영역으로 갈랐고 쓰기에 `part`(draft · rewrite)를 더했다 — 둘째 세션 점수 null(값 3 '둘째 세션은 null')을 함수가 가리려면 필요하다. 말하기 9~12 는 발표 · 확인 질문 종류가 있는지로 가른다.
4. **덧붙인 공개 함수**(값에 없는 이름, 모두 순수): `parseAttemptInput`(크기 상한 + 꼴 + P10 꼬리표 없는 미리보기), `inputFitsActivity`, `finalActivityNos`(서버 행 → 끝 시도 번호), `lemmaLookup`(vocab word · forms → 원형), `cleanSentenceRate` · `rubricScoreOf`(b · c 가 활동 점수를 같은 식으로 내게), `RESULT_PHRASES`(결과 말 셋의 글 — 정본 문구 그대로, 화면 조각이 가져다 씀), `answerMaxSecondsKey`(구간 키), `speakingCountersStart` · `speechEventOf`(P2b `ListenOutcome` → 셈의 일). 차례 2~4 와 b · c 가 같은 꼴을 쓰게 하려는 것이다.
5. **기술 · 구조 상수 둘을 더 이름 붙였다**(파일 위 대문자, C72 꼴): `score.ts` `RUBRIC_MAX = 4`(3.7 '각 1~4' 채점표 꼴), `judge.ts` `MIC_STALL_RETRY_MULTIPLE = 2`(7절 '여섯 번(speech.max_retries 의 두 배)'). 둘 다 12절 키가 아니다. check:ids design-number 는 38 그대로.
6. `session-frame.tsx` 꿰맞춤에서 쓰기 6~12 첫 세션의 `writing-task` 활동은 아무것도 그리지 않는다(과제는 `draft` 자리의 P10 `WritingComposition` 이 보임). 시험용 시드에 6단계가 없어 프리뷰 영향 없음 — 차례 2 · b 가 다시 쓴다.

### 정할 것(컨트롤러 — 모두 plan 권함 안의 해석, 13절 한 줄이 필요한지는 컨트롤러 판단)

| 번호 | 무엇 | 고른 것 | 까닭 |
|---|---|---|---|
| 1 | 따라 말하기 · 질문 답 시도에 인식 글이 있는데 `skipped` 도 붙은 경우(성공 뒤 '한 번 더'에서 실패가 쌓임)의 점수 | 인식 글이 하나라도 있으면 점수를 낸다(가장 높은 일치율 · 첫 인식 글 판정). 인식 글 없이 건너뛰면 null | 값 2 '건너뛰었으면 null'을 '인식 글 없이 끝남'으로 읽었다. 이미 말한 것을 버리면 아이에게 불리하다. 화면은 성공 뒤에 '다음'을 주므로 드문 경우다 |
| 2 | 인식 셈에서 성공(heard)이 이 활동의 실패 수를 지우는가 | 지우지 않는다. 성공은 audio-capture 이어짐 · 세션 '여섯 번' · 말소리 없음 이어짐만 끊는다 | 7절 '최대 3회 다시 듣는다'를 활동 몫으로 읽음(배치 '두 시도를 합쳐 센다'와 같은 결). start-failed · 모르는 코드 · phrases-not-supported · bad-grammar 는 '결과 없음'처럼 다시 듣기이고 '여섯 번'에 넣는다(C53 (1)) |
| 3 | 단어별 정오 세부(C76 안) | 한 활동에 같은 단원 단어가 두 번 나오면 한 줄, 한 곳이라도 정렬로 다 맞으면 맞음. 여러 낱말 표제어는 이어진 낱말 전부가 맞아야 맞음. 표기형은 vocab forms 로 원형에 맞춤(대소문자 무시). 조립은 첫 허용 정답, 질문 답은 가장 가까운 허용 답(같으면 앞의 것) | 틀린 낱말을 잘못 당기지 않게(3.4) 너그러운 쪽. 정렬이 둘 이상이면 뒤에서부터 따라가 정한 한 갈래(목표 앞쪽 낱말을 먼저 남김) |

### 차례 2 에 넘기는 것(서버 · 대기열 · 틀이 가져갈 이름과 꼴)

- **서버 `src/server/session/index.ts`:** 자기 상수 `ATTEMPTS_PER_BATCH_MAX` · `INPUT_JSON_MAX`(61 · 65)를 지우고 `@/core/session/attempt` 에서 가져온다(지금은 같은 값 두 벌). 시도마다 `parseAttemptInput(input)` → undefined 면 `rejected` · `inputFitsActivity(activities[activityNo - 1], parsed)` 가 거짓이어도 거부 → `appActivityResult(activity, lesson, parsed, ctx)` 로 `score` · `word_results` · `word_count`. ctx = `{ answerMatchPass: speaking.answer_match_pass, homophones: loadSeedList("homophones"), unitWords: lesson.unitWords, lemmaOf: lemmaLookup(vocab 행 word · forms), appJudgedQuestions: level_specs questions.acceptedMin > 0 }`. `appActivityResult` 는 종류가 다르면 던지므로 거름을 먼저 한다.
- **이어 할 자리:** `loadSessionView` 의 '가장 큰 번호 + 1'(489~497)을 `resumePointOf(activities, finalActivityNos(rows))` 로. 화면은 대기열의 끝 시도 번호를 합쳐 다시 부른다. 미리보기 '만난 단어'(500~)는 `parseAttemptInput(r.input)` 의 preview `shownWords` 로 읽으면 P10 시도 · 새 꼴 둘 다 된다.
- **`activitiesOf`:** 서버가 `activitiesOf({ area, level, content, part: sessions.writing_part, thinkout: level ≥ writing.thinkout_from_level, corrections, confirmQuestions: level_specs presentation.confirmQuestions })` 로 바꾸면 두 인자 꼴(preview.ts 188~ 덧붙임)을 지운다.
- **끝내기:** `sessionScoreOf`(영역별 입력 — 활동 점수는 attempts.score 를 activity_no 차례의 `kind` 와 짝지음, weights = speaking.match_weight · speaking.listening_weight) · `englishSentencesOf(말하기 세션 끝 시도 입력들)`.
- **대기열 `src/lib/attempt-queue.ts`:** `ATTEMPTS_PER_BATCH_MAX` 를 `@/core/session/attempt` 에서(core 는 db · next · react 없음 — 대기열이 가져와도 의존 규칙 안).
- **틀 · 조각:** 활동 종류 `Activity` · `ActivityKind`(preview.ts), 시도 꼴 `AttemptInput`(`{ v: 1, kind, step, … }`), 결과 말 `resultPhraseOf(rate, ui.match_phrase_levels)` + `RESULT_PHRASES`, 질문 답 `judgeAppAnswer`, 답 꼴 `answerShapeOf(activity, levelSpec)` + `answerMaxSecondsKey(level)`(P2a `endRuleFor({ area: "speaking", level, answer, capSeconds })`), 인식 셈 `speakingCounters(state, speechEventOf(outcome), { maxRetries, silentItemsMax })` — 판정 `heard · retry · skip · mic-unavailable · mic-stalled · speech-silent · offline · none`(새 활동에 들어갈 때 `{ type: "next-activity" }`).
- `session-frame.tsx` 의 차례 1 꿰맞춤(124 · 138 · 191)은 차례 2 가 틀을 다시 쓸 때 바꾼다.

### 관문 명령 결과(DB 없는 것만 — 통합 · e2e 는 이 Mac 에서 안 돎, 가정 (다))

```
pnpm lint                → Checked 276 files. No fixes applied.(경고 0)
pnpm test                → Test Files 49 passed (49) · Tests 476 passed | 6 todo (482)
pnpm build               → exit 0 · ✓ Compiled successfully
pnpm exec tsc --noEmit   → exit 0
pnpm check:deps          → ✔ no dependency violations found (144 modules, 567 dependencies cruised)
pnpm check:ids           → exit 0 · … code-setting-unknown 0 · fixture-setting 0 · design-number 38(바탕 38 그대로, 코드 키 글자 334 → 335 = answerMaxSecondsKey 의 키 머리)
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0(missing-test 25줄은 보고만 — 남은 것은 차례 2~4 · b · c · P12 몫 AC)
```

design-number 38 줄은 모두 바탕 그대로다(스키마 precision · scale · `isUniqueViolation` 의 `depth < 3` 셋 · done.ts 85 등 — P10 차례 7 · 컨트롤러 몫). 이번에 새로 생긴 줄은 없다.

### 남은 우려

- 시도 꼴이 strict 라 b · c 가 a 종류에 칸을 더하면 P11 진행 중 기기 대기열에 남은 옛 꼴 시도는 그대로 읽힌다(칸을 더하는 쪽만이면). 칸 이름을 바꾸면 `v` 를 올려야 한다.
- `appActivityResult` 의 단어별 정오는 표기형을 vocab forms 로만 원형에 맞춘다. 시드 쓰기 문항의 정답 낱말이 단원 단어와 다른 표기형이고 forms 에 없으면 빠진다 — plan '다른 P 에 넘길 것' P8 행(정답 낱말 = 단원 단어 원형)과 같은 조건이다.
- 통합 · e2e 는 돌리지 않았다(차례 1 은 단위만, 브리프).

## 차례 1 fix 1 — 검토 A1 지적 I-1 · M-1~M-4(2026-10-18 06:4x)

상태: DONE. 바탕은 가지 HEAD 6e09901(P10 78db3a2 합침), 커밋 없음. M-5(꿰맞춤 React key)는 브리프대로 손대지 않았다(차례 2 가 닫음).

| 지적 | 어디를 어떻게 | 시험 |
|---|---|---|
| I-1 건너뛴 시도 | `src/core/session/attempt.ts` `repeatResult`(323)가 시도 입력 전체를 받아 `skipped` 가 있으면 인식 글이 있어도 `{ score: null, wordResults: [], wordCount }`. `questionResult`(358)도 같은 조건을 더함. 단어 수는 그대로 인식 글 낱말 수의 합. `englishSentencesOf` 셈은 그대로이고 입력 꼴에 `skipped?` 칸만 더함(`src/core/speaking/judge.ts:282`) | `session-attempt.test.ts` 275 · 323 이름에서 '인식 글 없이'를 빼고 반쯤 맞은 인식 글 + `skipped: "recognition"` 사례 둘(따라 말하기 · 질문 답 — 점수 null · 단어별 정오 `[]` · 단어 수 2). `speaking-judge.test.ts` 351 문장 수 사례에 인식 글 있는 건너뜀 하나(4 → 5) |
| M-1 하이픈 · 따옴표 든 단원 단어 | `matchFormOf`(161, `normalizeForMatch(text, [])` 를 빈칸으로 이음)로 `unitWordOf`(221~226)가 표기형 · 원형 · 단원 단어 셋을 같은 꼴로 견줌. `lemmaLookup`(175~178)은 적힌 꼴과 견줌 꼴 둘 다 넣고 둘 다로 찾음 | 신규 "단어별 정오: 하이픈 · 따옴표가 든 단원 단어도 인식 글과 같은 정규화로 찾는다"(504 — 'yo-yo' · 'yo yo' · 'yo-yos' 활용형 · "o'clock", 빠지면 틀림) |
| M-2 허용 답 기준 경계 | 시험만 | AC-5f 첫 사례(86~)에 낱말 n 개 허용 답과 앞 k 개만 말한 글. n 은 PASS × n 이 정수인 가장 작은 수, k = PASS × n. rate = k/n · 맞음, k − 1 은 다시 |
| M-3 결정 2 | 시험만(동작은 이미 있음 — 처음부터 초록) | 신규 둘: 285 "말하기 인식 셈: 들은 뒤의 실패도 그 활동의 실패 수에 이어 쌓여 speech.max_retries 번이면 건너뛴다"(들음 뒤 aborted × max_retries → skip, 실패 · 들음 · 실패 → skip) · 301 "말하기 인식 셈: start-failed · 모르는 코드 · phrases-not-supported · bad-grammar 는 다시 듣기이고 이어지면 '마이크가 멈춤'에 든다"(× max_retries × 2 → mic-stalled) |
| M-4 설정 숫자 · 빈 단언 · 이름 | `session-attempt.test.ts` 의 `failures: 3` 두 곳 → `MAX_RETRIES`(= `TEST_SETTINGS["speech.max_retries"]`), `ATTEMPTS_PER_BATCH_MAX > 0` 단언과 그 가져오기 지움(차례 2 '대기열: 50개씩 …'이 맡음). `session-preview.test.ts` 이름을 본 것만으로: "활동 차례: 말하기 6단계 그림 보고 말하기는 질문보다 먼저이고 10단계는 발표 뒤 확인 질문 수만큼이다" | — |

빨강 먼저: I-1 두 사례와 M-1 사례는 구현 전에 실패를 봤다(점수 0.5 · 0 이 나옴, 'yo-yo' 정오 없음). M-2 · M-3 는 이미 있는 동작을 묶는 시험이라 처음부터 초록.

시험 수: 단위 479(합친 뒤) → **482**(+3 — 'yo-yo' 하나 · 결정 2 둘. M-2 · I-1 · 문장 수는 있던 사례에 더함). 파일 50.

관문(DB 없는 것만):

```
pnpm lint · pnpm biome ci → Checked 279 files. No fixes applied.
pnpm test                 → Test Files 50 passed (50) · Tests 482 passed | 6 todo (488)
pnpm exec tsc --noEmit    → exit 0
pnpm check:deps           → ✔ no dependency violations found (144 modules, 567 dependencies cruised)
pnpm check:ids            → code-setting-unknown 0 · fixture-setting 0 · design-number 35(합친 뒤 바탕 값, 이번 파일 · 고친 줄에서 새 줄 0 — match-rate.ts 의 줄은 바탕의 숫자 낱말 표)
```

남은 우려: 없음(M-5 는 차례 2).

## 차례 2 — 세션 서버 · 대기열 · 틀 · 읽기 · 결과 틀(검토 묶음 A2, 2026-10-18 07:xx)

바탕 HEAD ccbd899(차례 1 c8db4f5 + specs 맞춤), 커밋 없음. 통합 · e2e 는 CI 로(아래 'CI' 줄은 결과가 오면 채운다).

### 바뀐 파일

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/server/session/index.ts` | 수정 | 공통 바탕: `seedHomophones`(164, 목록 없으면 빈 묶음 + 경고 한 번) · `SessionConfig` · `readSessionSettings`(207 — speech.* · ui.* · speaking.* · writing.thinkout_from_level · 그 구간 answer_max_seconds) · `sessionContextOf`(281 — 활동 모델 한 인자 꼴 · 규격 · appJudged) · `lemmaEntriesOf` · `scoringOf` · `needsAiPath`(354). `saveSessionAttempts`(550 — 묶음 겉꼴만 통째, 시도마다 겉꼴 · `parseAttemptInput` · `inputFitsActivity` · AI 길 거부, 받은 시도는 `appActivityResult` 로 score · word_results · word_count, `{ ok, accepted, rejected }`) · `finishLessonSession`(687 — 한 트랜잭션 FOR UPDATE · incomplete + missing · already · not_found · closed · `sessionScoreOf` · `englishSentencesOf` · `learningDayOf`, `WHERE status = 'in_progress'`) · `loadSessionView`(902 — `resumePointOf` · finals · config · 동음이의어 · 원형 표 · appJudged · answerShapes) · `readSessionPlace`(1056, `readSessionArea` 대신). 상수 `ATTEMPTS_PER_BATCH_MAX` · `INPUT_JSON_MAX` 는 core 에서 |
| `src/server/actions/session.ts` | 수정 | `finishSession`(첫 문장 `await requireAccess()`) |
| `src/server/session/result.ts` | 신규 | `server-only`. `loadResultView` — 그 프로필의 끝난 수업 세션만, `next` = hereStart(resume → 그 세션, lesson · practice → 그 칸 lessonId, 그 밖 · 없음 → list) |
| `src/lib/attempt-queue.ts` | 수정 | `queueBatches`(50개씩) · `queueFinals`(이 기기의 끝 시도 번호) · send 가 `{ accepted, rejected }` 를 돌려주고 둘 다 지움 · 한 묶음 실패면 남은 묶음은 다음에 · 버린 수만 warn |
| `src/lib/session-input.ts` | 신규 | `momo.session-input.v1` 활동 안 입력(못 쓰면 메모리) |
| `src/core/session/attempt.ts` | 수정(차례 1 파일) | `parseAttemptInput` 이 NUL 글자 든 시도를 거부(jsonb 가 받지 않아 묶음 넣기 전체가 늘 실패 → 대기열이 막힘) |
| `src/core/session/preview.ts` | 수정(차례 1 파일) | 두 인자 꼴 덧붙임 지움(브리프) |
| `src/components/activities/reading.tsx` | 수정 | `ReadingPassage` 선택 속성 `onWordTap` · `openWord`(없으면 그대로) — 글로서리 낱말(고유 명사 빼고)을 글줄 안 단추(`data-size-exempt` · `data-word-tap`)로, 뜻 쪽지(`data-word-note`, lang="ko" 20px)를 낱말 위에 |
| `src/components/session/reading.tsx` | 신규 | 'use client'. `ReadAloudButton`('읽어 주기' — 누를 때만, 다시 누르면 멈춤) · `PassageActivity` · `QuestionActivity`(C77 (1) — 고르면 바로 채점, 맞음 '맞았어요!' + 해설 + '다음', 처음 틀림 해설 + '한 번 더 풀기'(정답 안 보임, 처음 고른 오답은 눌린 채), 둘째 뒤 정답 표시 + '맞았어요!' 또는 '정답은 이거예요' + '다음'. 가로 지문 칸 나란히(세로 넘김) · 세로 '지문 보기' 쪽지('읽어 주기' · '닫기' · Esc). 문항 쪽 지문 보기에는 그림 줄 없음(컨트롤러 결정)) |
| `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | 값 7 — 끝 시도 → 대기열 → 끝 시도 없는 가장 앞 활동, 마지막 뒤 idle · flush → `finishSession` → incomplete 한 번 더 → 그래도 incomplete 이고 이 기기에도 없으면 빠진 활동으로, 그 밖 실패는 7절 끊김 안내 · online 때 다시 · '다음'으로 다시 → `/result/<id>`. 서버 finals ∪ 대기열 finals 로 다시 셈, 활동 안 입력 되살림(하이드레이션 뒤 한 번 다시 그림), 미리보기 '다음'에서 `unlockFromGesture()`, '홈'은 idle · flush 뒤. 상호작용이 아직 없는 활동(쓰기 · 말하기)은 P10 처럼 보기만 · 마지막 뒤 수업 목록. M-5(문장 틀 key) 닫음 |
| `src/app/(child)/session/[id]/page.tsx` | 수정 | 끝난 세션이면 `/result/<id>` |
| `src/app/(child)/result/[id]/page.tsx` · `result-view.tsx` | 신규 | 값 8 — '수업을 끝냈어요!'(h2) · 수업 제목 · 큰 '다음 수업'(P10 `useLessonStart` · 확인 쪽지) 또는 '수업 목록' · 작은 '홈'. 숫자 · 퍼센트 없음 |
| `.github/workflows/ci.yml` | 수정 · 공용 변경(컨트롤러 요청) | e2e 단계 `E2E_PHOTOS: "1"` + `actions/upload-artifact@v4`(e2e-photos, test-results/photos, if-no-files-found ignore, if always) |
| `tests/e2e/photos.ts` | 신규 · 공용 변경 | `photo(page, 이름, 방향?)` — 환경 변수 있을 때만 `test-results/photos/<이름>-<portrait|landscape>.png` |
| `tests/e2e/lessons.ts` | 신규 | 값 10 — `insertSampleLesson` · `atLevel` · `levelSpecOf`(시험 숫자를 DB 단계 규격에서) |
| `tests/e2e/reading.spec.ts` | 신규 | AC-3a |
| `tests/e2e/session.spec.ts` | 수정 | P10 '둘째 활동부터 보기만' → 끝까지 → 결과 → 끝난 세션 주소는 결과로 → '다음 수업'이 새 세션을 연다 |
| `tests/integration/session-flow.test.ts` | 신규 | '세션 바탕:' 넷(증명 표 글자 그대로) + 말하기 1단계 서버 채점 · 화면 자료 · 결과 틀 |
| `tests/integration/retry.test.ts` | 신규 | AC-2c 읽기 몫 |
| `tests/integration/session-start.test.ts` | 수정 · **계획 표 밖(P10 시험)** | 저장 결과 기대값 셋에 `rejected: []`(위험 3 — P10 시험을 고침 목록에) |
| `tests/unit/attempt-queue.test.ts` | 수정 | send 꼴 맞춤 + '대기열: 50개씩 나눠 보내고 거부된 id 도 지운다' · 앞 묶음 실패 · 끝 시도 번호 |
| `tests/unit/session-input.test.ts` | 신규 · **계획 표 밖** | 활동 안 입력 둘 |
| `tests/unit/safe-error.test.ts` | 수정 · **계획 표 밖(장부 행)** | `safeDbError` 시도 저장 질의 오류 사례 하나 |
| `tests/unit/session-attempt.test.ts` · `session-preview.test.ts` | 수정 | NUL 거부 단언 · 두 인자 꼴 단언 지움 |

### 시험 수

단위 482 → **488**(+6 — 대기열 셋 · 활동 안 입력 둘 · safeDbError 하나), 파일 50 → 51. 통합 +7(session-flow 일곱 · retry 하나 — 이름 '세션 바탕:' 넷 + 말하기 · 화면 자료 · 결과 틀 · AC-2c), e2e 신규 하나(AC-3a) · 고침 하나.

### 다르게 한 것과 까닭

1. **묶음 꼴:** plan 은 '묶음을 통째로 거부하지 않는다'인데, 시도 id 글조차 없는 원소 · 빈 묶음 · 50 넘는 묶음은 거부할 id 가 없어 지금처럼 `invalid` 로 둔다(P10 시험 `[{ nope: 1 }]` 그대로). 시도 id 가 uuid 가 아닌 글이면 그 id 로 rejected.
2. **화면이 보낸 점수:** 시도 꼴이 strict 라 점수 칸을 붙인 시도는 '꼴이 틀림'으로 거부한다(받아서 무시하지 않음). 시험 '세션 바탕: 서버가 … 화면이 보낸 점수는 받지 않는다'가 이 동작을 본다.
3. **AI 길 거부(`needsAiPath`):** a 몫 종류 가운데 AI 길은 3단계부터의 질문 답뿐이라, 앱 판정 단계가 아닌 질문 답 끝 시도는 `skipped` 가 있을 때만 받는다(c 값 3). b · c 종류는 시도 꼴에 아직 없어 꼴에서 거부된다 — b · c 가 종류를 더할 때 이 함수에 자기 규칙을 더한다.
4. **영어로 말한 문장 수:** 읽기 · 쓰기 세션은 0 을 쓴다(열이 NOT NULL default 0). 말하기만 `englishSentencesOf`.
5. **끝 시도가 둘인 활동**(두 기기)은 가장 먼저 저장된 끝 시도의 점수를 쓴다(`finalRowsOf`).
6. **`readSessionArea` → `readSessionPlace`**(끝났는지도 돌려줌). 쓰는 곳이 세션 쪽 하나라 바꿨다.
7. **동음이의어 읽기**를 배치 서버(`src/server/placement`)의 `seedHomophones` 에서 가져오지 않고 같은 꼴로 세션 서버에 두었다 — 배치 모듈이 AI 기록(`@/server/ai/store`)을 가져와 세션 모듈이 AI 층에 닿지 않게(AC-1b). 같은 글 두 벌이라 차례 4(`src/server/alerts/device.ts` 옮길 때) 한 곳으로 모으기를 권한다.
8. **ReadingPassage 선택 속성 둘**(`onWordTap` · `openWord`): plan 은 '선택 속성 하나'다. 조각이 훅 없는 보기 조각이라 뜻 쪽지를 낱말 위에 띄우려면 열린 자리를 속성으로 받아야 했다. 둘 다 없으면 지금 그대로다.
9. **결과 화면 '다음 수업'이 단계 평가 · 복습 · 첨삭이면 '수업 목록'**(컨트롤러 결정 그대로). 하던 수업(resume)은 그 세션 주소로 간다.
10. **e2e 견본은 기본 틀 규격**(`referenceSet(defaultSettings())`)으로 만든다 — 작은 틀(`smallReferenceSet()`)로는 `readingLesson` 1 · 4 가 '값이 없다'로 던진다(plan 확인한 사실의 추측이 틀림). 지어낸 낱말이 DB vocab 에 없어 그림은 뜻 글로 보인다.
11. 세션 화면 자료는 읽기 · 쓰기 세션도 음성 · 말하기 설정을 함께 읽는다(설정 하나라도 없으면 SettingMissingError — 공용 변경 2 를 안 하면 프리뷰 세션 화면이 멈춘다는 plan 정할 것 카와 같은 조건).

### 정할 것

| 번호 | 무엇 | 고른 것 | 까닭 |
|---|---|---|---|
| 1 | 읽기 문항에서 처음 고른 오답 | 다시 고를 때 눌린 채(✕ 표, 고를 수 없음) | 같은 오답을 두 번 고르는 것을 막는다(C77 (1) 안의 화면 세부) |
| 2 | 둘째 고름이 맞았을 때 말 | '맞았어요!'(정답 표시와 함께), 틀렸으면 '정답은 이거예요' | 정본 밖 문구 표 '맞음 · 틀림(정답 보임)' 두 말을 그대로 씀 |
| 3 | 끝내기가 incomplete 로 두 번 막히고 이 기기 대기열에도 그 활동이 없을 때 | 빠진 가장 앞 활동으로 돌아가 다시 하게 함 | 다른 기기에서 하다 만 활동(8절 동시 사용) — 끊김 안내로는 풀리지 않는다 |

### 차례 3 에 넘기는 것

- 틀의 `RECORDED_KINDS`(session-frame.tsx 위)에 `writing-item` 을 더하고, 쓰기 조각을 `PassageActivity` · `QuestionActivity` 와 같은 꼴(`initial` · `onChange` · `onDone(끝 내용)`)로 붙이면 끝내기 · 결과 · 이어 하기가 그대로 돈다. 끝 내용은 `{ tries: Answer[] }`(값 2).
- 활동 안 입력은 `onChange` 값이 그대로 `momo.session-input.v1` 에 쓰이고 `initial` 로 되돌아온다(하이드레이션 뒤 한 번 다시 그림 — 쪽이 서버 그림과 달라지지 않게).
- 서버는 쓰기 1~3 끝 시도를 이미 채점한다(`appActivityResult` writing-item — 차례 1).
- 사진 도우미 `photo(page, "p11-writing-…")` 를 같은 꼴로.

### 관문 명령 결과(로컬)

```
pnpm lint                → Checked 290 files. No fixes applied.
pnpm test                → Test Files 51 passed (51) · Tests 488 passed | 6 todo (494)
pnpm build               → exit 0(ƒ /result/[id] · ƒ /session/[id])
pnpm exec tsc --noEmit   → exit 0
pnpm check:deps          → ✔ no dependency violations found (149 modules, 608 dependencies cruised)
pnpm check:ids           → code-setting-unknown 0 · fixture-setting 0 · design-number 35(바탕 그대로, 새 줄 0)
pnpm check:bundle        → 파일 230 · 화면 파일 20 · 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0(missing-test 23줄, 보고만 — 남은 것은 차례 3 · 4 · b · c · P12 몫)
```

CI 1차(컨트롤러, 가지 ci/p11-c2 = ee3120f · PR #4 · run 39072933388): check-ids · depcruise · lint · seed-validate · spec-trace · build · bundle-secrets · unit · integration · e2e · e2e-local **전부 성공**(첫 바퀴). 사진 아티팩트 e2e-photos 는 컨트롤러가 받아 둠. 그 뒤 가지 HEAD 는 7794633(P10 fix 8 합침, 이 변경과 겹치지 않음).

상태: DONE.

## 차례 2 fix 2 — 화면 검토 A2 지적 I-1~I-3 · M-1~M-5(2026-10-18 07:xx)

바탕 HEAD 7794633, 커밋 없음. 코드 검토 A2 M-1 은 차례 3 몫(손대지 않음).

| 지적 | 어디를 어떻게 | 선 위 검증(e2e — CI) |
|---|---|---|
| I-1 가로 1단계 그림 문항 단추 잘림 | `src/components/session/reading.tsx:363` 그림 보기 단추에 가로에서만 `landscape:py-2` · 그림 칸 `size-28`(112px, 이미지 · 뜻 글 상자 둘 다). 보기 높이 약 186 → 약 140px, 두 줄에서 약 90px 줆. 누르는 곳 56 · 글자 24 그대로. M-5 로 32px 더 줆 | `tests/e2e/session.spec.ts` — 1단계 문항 1 을 가로에서 처음 틀려 '한 번 더 풀기', 다시 맞혀 '다음', 문항 2 를 가로에서 바로 맞혀 '다음' — 세 단추 아래 끝 ≤ `CHILD_VIEWPORTS.landscape.height` |
| I-2 지문 그림 줄 깨진 그림 표 | `src/components/activities/reading.tsx` 선택 속성 `renderPicture`(82 · 157 — 없으면 VocabPicture 그대로, 시드 보기 · 평가 지문 영향 없음). 세션 지문은 새 `SafePicture`(`session/reading.tsx:100` — P10 AnswerPicture 와 같은 미리 열어 보기, 못 열면 수업 지문은 뜻 글 점선 상자 `data-picture-missing`, 꾸밈 그림(평가 지문)은 그리지 않음)를 넘긴다 | `session.spec.ts` — 1단계 지문 그림 줄이 하나 이상이고 줄마다 `img` 가 `complete && naturalWidth > 0` 이거나 `[data-picture-missing]` |
| I-3 오른쪽 끝 낱말 쪽지 잘림 | `openWord` 에 `align`(start · end) · `shift`(px). `PassageActivity` 가 연 뒤 잰다(`session/reading.tsx:169` useLayoutEffect): 낱말 가운데가 카드 오른쪽 반이면 `right-0`, 그래도 카드를 넘으면 카드 안으로 `translateX`. 화면 크기가 바뀌면 다시 잰다 | `tests/e2e/reading.spec.ts` — 세로에서 첫 줄 마지막 글로서리 낱말을 눌러 쪽지 상자가 활동 카드 안(두 방향 사진 앞뒤로) · 사진 `p11-reading-word-note-right-<방향>` |
| M-1 정답 보기에서 처음 오답 ✕ 사라짐 | `stateOf`(421) — 고른 보기(`tries`)는 끝까지 표시: 오답은 ✕, 정답 보기에서 고르지 않은 정답만 '정답' | `reading.spec.ts` — 다시 고를 때 처음 오답 `picked-wrong` · 누를 수 없음, 정답 보기에서 오답 둘 다 `picked-wrong` |
| M-2 다시 고를 때 해설 사라짐 | 해설을 `tries.length > 0` 일 때 보임(491) — 다시 고르는 동안에도 | `reading.spec.ts` — '한 번 더 풀기' 뒤 해설 보임 · 사진 `p11-reading-retry-<방향>` |
| M-3 세션 지문 줄 높이 | `ReadingPassage` 가 `onWordTap` 이 있을 때만(세션 지문) `leading-[2]`(24px × 2 = 48px, 184). `data-size-exempt` 그대로 | 사진(CI 2차) |
| M-4 쪽지 닫기 | 쪽지가 열린 동안 `document` pointerdown — 낱말 단추 · 쪽지 밖을 누르면 닫음(209). 같은 낱말 다시 누르기도 그대로 | `reading.spec.ts` — 안내 줄을 누르면 쪽지 0 |
| M-5 빈 상태 줄 | `session-frame.tsx:501` — 상태 글이 있을 때만 상태 줄 | 사진(CI 2차) |

새 · 바뀐 사진 이름: `p11-reading-word-note-right` · `p11-reading-retry`(새), `p11-reading-level1-question-ask`(새 — 문항 1 고르기 전), `p11-reading-level1-question`(이제 문항 2 맞음 화면). 나머지 `p11-reading-*` 그대로 다시 찍힘.

시험 수: 단위 488 그대로(바뀐 것은 화면 · e2e 단언). e2e 는 시험 수 그대로, 단언만 더함. `session.spec.ts` 첫 시험은 문항 1 을 처음 틀리므로 기대 점수를 (n − 1) ÷ n 으로 고침.

다르게 한 것: I-2 의 '지문 그림 줄도 깨짐 대체'를 공용 그림 줄 자체가 아니라 선택 속성 `renderPicture` 로 세션 길에만 넣었다 — 지킬 것 '공용 조각을 고칠 때 선택 속성 · 세션 길에서만' · '시드 보기 화면 영향 없음'. 평가 지문(P12)도 같은 `SafePicture` 를 넘기면 '깨지면 안 그림'이 된다. `ReadingPassage` 의 P11 선택 속성은 이제 셋(onWordTap · openWord · renderPicture).

관문(로컬):

```
pnpm lint                → Checked 290 files. No fixes applied.
pnpm test                → Test Files 51 passed (51) · Tests 488 passed | 6 todo (494)
pnpm build               → exit 0(빌드 CSS 에 landscape:[&_img]:size-28 · leading-[2] 규칙 확인)
pnpm exec tsc --noEmit   → exit 0
pnpm check:deps          → ✔ no dependency violations found (149 modules, 609 dependencies cruised)
pnpm check:ids           → code-setting-unknown 0 · design-number 35(새 줄 0)
pnpm check:bundle        → 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0
```

CI 2차(컨트롤러, run 39074646676 · 1292c14): 통합 · e2e(새 단언 포함) · e2e-local 포함 **전부 성공**. 사진은 컨트롤러가 받아 재검토(des-p11)에 넘김.

상태: DONE.

## 차례 3 — 쓰기 1~3 · 이어 하기(검토 묶음 A3, 2026-10-18 08:xx)

바탕 HEAD d798b6e(차례 2 + fix 2 커밋), 커밋 없음. 통합 · e2e 는 CI(아래 줄은 결과가 오면 채운다).

### 바뀐 파일

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/components/session/writing-items.tsx` | 신규 | 'use client'. `WritingItemActivity` — 값 11: 갈래마다 안내 줄(plan 표 글자 그대로, 조립은 '카드를 누르면 빈칸으로 가요'도) + P10 답 조각(pick-word `ChoiceAnswer` · copy · build · fill-letters · 조립 `TileAnswer` · 받아쓰기 `TypingAnswer` 앱 안 자판). 판정 `checkAnswer`. 맞음 '맞았어요!' + 정답 낱말 · 뜻(있을 때) + '다음', 틀림 '정답은 이거예요'(답 조각 자리에 정답 조각 — 타일 · 카드 차례 그대로, 고르기는 정답 ✓ · 고른 오답 ✕) + '한 번 더 풀기' → 맞힐 때까지, 끝 내용 `{ tries }`. 시도마다 답 조각을 새로(열쇠 = 시도 번호). `displayOfWritingItem` |
| `src/core/answer/expected.ts` | 신규 · **계획 표 밖** | `expectedAnswerOf(item)` — 첫 허용 정답에서 정답 조각(고르기 번호 · 글자 · 빈 자리 글자 · 카드(마침표 카드 따로) · 쓴 글). 순수 함수라 core 에 둠(단위 시험) |
| `src/components/answer/choice.tsx` | 수정 | `ChoiceAnswer` 선택 속성 `initial` · `onChange` · `reveal { answerNo, picked }`(정답 ✓ · 고른 오답 ✕ · `data-choice-state`, 고를 수 없고 '다음' 없음). `onChange` 가 있으면(세션) 보기 틈 gap-5(N-2 와 같은 까닭) |
| `src/components/answer/tiles.tsx` | 수정 | `TileAnswer` 선택 속성 `initial`(TilePlacement — 놓은 번호 · 대문자) · `onChange` · `reveal`(정답 조각 줄 `RevealRow`, 남은 타일 · 단추 없음) · `slots`(조립 놓는 칸을 카드 수만큼, 빈 칸 `data-slot="empty"`) |
| `src/components/answer/typing.tsx` | 수정 | `TypingAnswer` 선택 속성 `initial` · `onChange` · `reveal`(정답 글, 자판 · '다음' 없음). 넷 다(세 조각) 없으면 지금 동작 그대로(배치 — 위험 5) |
| `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | `writing-item` 을 끝 시도 활동에 더하고 쓰기 조각 연결(활동 안 입력 되살리기 — 시도 · 지금 놓은 것), 활동 전환 때 조각 새로(활동 번호 열쇠 — 차례 2 의 묶음 열쇠 그대로). 화면을 열 때 `inputs.prune(view.openSessionIds)`, 끝내기 not_found · closed 길에서도 그 세션 줄 지움(A2 M-1). 상태 줄은 늘 두고 글이 없으면 `sr-only`(N-1 — 카드 간격도 안 남김) |
| `src/lib/session-input.ts` | 수정 | `prune(keep)` — 그 프로필의 진행 세션 밖 줄을 지움(A2 M-1) |
| `src/server/session/index.ts` | 수정 · **계획 표 밖(차례 3 몫 아님)** | 화면 자료에 `openSessionIds`(그 프로필의 진행 세션 id). 쓰기 문항의 `word`(copy · build · fill-letters · 받아쓰기)도 낱말 그림 · 뜻 표에 넣음(맞았을 때 뜻 줄) |
| `src/components/session/reading.tsx` | 수정 | 문항 보기 틈 gap-4 → gap-5(N-2 — 고리 둘 16px 보다 넓게) |
| `tests/e2e/writing.spec.ts` | 신규 | AC-4a e2e(이름 글자 그대로) — 1단계(시험용 시드) · 3단계(견본 빌더 조립) 끝까지, 첫 문항 오답 → '정답은 이거예요' · 정답 카드 차례 · '한 번 더 풀기' → 정답, 조립 빈 칸 수 = 카드 수, 활동마다 `input · textarea · [contenteditable]` 0, 결과 · 점수 (n − 1) ÷ n, `ai_calls` 행 수 그대로 |
| `tests/e2e/resume.spec.ts` | 신규 | AC-6a e2e(이름 글자 그대로) — 읽기 셋째 문항(활동 5)에서 처음 틀린 채 쪽을 닫고 같은 문맥 새 쪽으로 열면 활동 5 · 처음 틀림 단계 · 고른 오답 ✕ 그대로, 쓰기 3단계 첫 문항에 카드 둘 놓고 닫았다 열면 같은 카드 둘 · 빈 칸 남은 수 |
| `tests/e2e/reading.spec.ts` | 수정 | 코드 재검토 Minor — 쪽지 단언을 오른쪽 끝이 가장 큰 낱말로, '왼쪽 맞춤이었다면 넘쳤다'(낱말 왼쪽 + 쪽지 너비 > 카드 오른쪽) 앞 조건을 함께 |
| `tests/unit/answer-expected.test.ts` | 신규 · 계획 표 밖 | 정답 조각 둘(갈래별 · 견본 1 · 3단계 문항 전부가 `checkAnswer` 맞음) |
| `tests/unit/session-input.test.ts` | 수정 | prune 하나 |

### 시험 수

단위 488 → **491**(+3), 파일 51 → 52. e2e 신규 둘(AC-4a · AC-6a), 고침 하나(reading.spec 단언).

### 다르게 한 것과 까닭

1. **틀림 단계의 정답 보이기:** 답 조각 자리에 그대로 정답 조각을 보인다(같은 조각에 `reveal` — 따로 정답 줄을 두지 않음). 목업 B_W1_Words · B_W3_Order 의 '놓는 자리에 답'과 같은 꼴이고 '정답(타일 · 카드 차례 그대로)'을 지킨다. 맞았을 때도 같은 조각에 아이가 낸 답을 보이고 아래에 '맞았어요!' · 낱말 · 뜻.
2. **답 조각 선택 속성 넷째 `slots`(TileAnswer):** plan 값 11 '조립의 놓는 칸은 카드 수만큼'을 그리려면 필요했다(initial · onChange · reveal 밖). 없으면 지금 그대로.
3. **정답 조각 함수를 core 에**(`src/core/answer/expected.ts`): 화면에 보인 정답이 채점 정답과 같다는 것을 단위 시험으로 묶으려고(견본 1 · 3단계 문항 전부).
4. **맞았을 때 뜻 줄:** pick-word 는 그림 낱말 뜻, build-tiles · 조립은 문항의 `meaningKo`, 그 밖은 `word` 의 vocab 뜻. 뜻이 없거나 낱말과 같으면(vocab 에 없는 견본 낱말) 그 줄을 그리지 않는다.
5. **'다음'이 둘이 되지 않게:** 고르기 · 받아쓰기는 답 조각의 '다음'이 내기이고, 결과 단계에서는 `reveal` 로 그 단추가 사라져 틀의 '다음'(조각 안 BigButton) 하나만 남는다.
6. **A2 M-1 은 '세션 쪽을 열 때 진행 세션이 아닌 줄 지움'(검토자 권함 앞의 것)**: 한 프로필 · 영역마다 진행 세션은 하나라 서버가 그 id 목록을 넘기고 기기가 나머지를 지운다. 다른 영역의 진행 세션 입력은 남는다.

### 정할 것

| 번호 | 무엇 | 고른 것 | 까닭 |
|---|---|---|---|
| 1 | 다시 할 때 받아쓰기 · 빈 글자 채우기 낱말을 또 읽는가 | 시도마다 답 조각을 새로 만들어 들어올 때 한 번 다시 읽는다 | 틀린 뒤 다시 듣는 것이 도움이 되고, '다시 듣기'를 누르지 않아도 된다(값 11 '들어올 때 한 번') |
| 2 | 맞았을 때 첫째 줄 | 첫 허용 정답 글(조립은 문장) | 목업 B_W1_Words 'ball / 공' 꼴 — 아이가 고른 꼴이 아니라 바른 꼴을 한 번 더 보인다 |

### 차례 4 에 넘기는 것

- 틀 `RECORDED_KINDS` 에 `repeat-word` · `repeat-sentence` · `listening` · `question` 을 더하고 말하기 조각을 같은 꼴(`initial` · `onChange` · `onDone(끝 내용)`)로 붙인다. 끝 내용은 값 2(`heard` · `failures` · `skipped?` · `echo?` · `tries`). 서버 채점 · 끝내기 · 결과는 이미 돈다(차례 2 통합 '말하기 1단계 세션은 …').
- 상태 줄(`sr-only` 알림 영역)은 틀에 하나 — 말하기 끊김 안내도 같은 줄을 쓸 수 있다.
- 동음이의어 읽기 두 벌(세션 · 배치 서버, 차례 2 다르게 한 것 7)을 `src/server/alerts/device.ts` 옮길 때 한 곳으로.

### 관문 명령 결과(로컬)

```
pnpm lint                → Checked 295 files. No fixes applied.
pnpm test                → Test Files 52 passed (52) · Tests 491 passed | 6 todo (497)
pnpm build               → exit 0
pnpm exec tsc --noEmit   → exit 0
pnpm check:deps          → ✔ no dependency violations found (151 modules, 623 dependencies cruised)
pnpm check:ids           → code-setting-unknown 0 · design-number 35(새 줄 0)
pnpm check:bundle        → 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0(missing-test 22줄, 보고만)
```

사진 이름(E2E_PHOTOS): `p11-writing-1-pick-word` · `p11-writing-1-wrong` · `p11-writing-1-right` · `p11-writing-3-assemble-sentence` · `p11-writing-3-wrong` · `p11-writing-3-right` · `p11-resume-reading` · `p11-resume-writing`(각 `-portrait` · `-landscape`). 읽기 사진(`p11-reading-*`)도 다시 찍힘.

CI 3차(컨트롤러, run 39076275851 · bc55b8f): e2e 1 실패 / 52 통과 — `writing.spec.ts` AC-4a 의 3단계 쪽(withHouseholdSetting 안)에서 '맞았어요!'가 안 뜸. P10 배치 e2e · resume(AC-6a) · reading 은 초록(위험 5 없음). 그 밖 작업 전부 성공.

**원인(로컬 재현):** 견본 3단계 다섯째 문항 정답이 'They kububa with Momo.' 인데 카드는 시드 규칙대로 소문자 'momo' 다. 화면은 첫 칸 카드만 '대문자' 단추로 바꿀 수 있어(C73) 이 문항은 화면으로 맞힐 수 없다 — 시험 잘못이 아니라 화면 결함이다(실시드에도 문장 가운데 고유 명사 · I 가 있으면 같다).

**고침:** `src/core/answer/expected.ts` 에 `cardTokensOf` · `displayCardsOf` — 문장 가운데 대문자로 쓰는 낱말(첫 허용 정답 기준, 첫 낱말 빼고) 카드는 정답 꼴로 보인다. 첫 낱말 카드는 소문자 그대로(대문자 단추 판정 유지). 쓰기 조각의 `displayOfWritingItem` 이 이것으로 카드를 만든다. `checkAnswer` · 배치 · 시드는 그대로. 단위 'AC 접두 없음' 하나 더(화면이 낼 수 있는 답 — 보인 카드 차례 · 첫 카드만 대문자 — 으로 견본 3단계 문항 전부 맞음, 'Can I go?' 사례). e2e 는 보인 카드 글로 누름. 단위 491 → 492.

**정할 것(추가):** 3 — 조립 카드의 대문자. 시드 카드는 모두 소문자(3.3 · C73)라는 규칙과 문장 가운데 고유 명사 · I 가 맞지 않는다. 화면이 정답 꼴로 보이게 했고(위), P8 시드 브리프에 '문장 가운데 고유 명사 · I 카드는 대문자 꼴로 둔다(또는 그런 문장을 내지 않는다)'를 넣을지는 컨트롤러 판단(13절 C73 에 한 줄 필요할 수 있음). → **C84** 로 적힘(컨트롤러 — 조립 카드는 소문자이되 고유 명사 · I 는 정답 꼴, 화면은 문장 가운데 대문자 낱말 카드를 정답 꼴로 · 첫 카드는 소문자, 판정은 C73 그대로, P8 시드 규칙 · 검증기 몫).

로컬 관문(고친 뒤): lint 0 · 단위 492 · build 0 · tsc 0 · check:deps 0 · check:ids design-number 35 · check:bundle 0 · spec:trace exit 0.

CI 4차(컨트롤러, run 39076856051 · 2ba410e): 통합 · e2e 53 · e2e-local 포함 **전부 성공**.

상태: DONE.

## 차례 3 fix 3 — 화면 검토 A3 지적 I-1 · I-2 · M-1~M-4(2026-10-18 08:xx)

바탕 HEAD d798b6e, 커밋 없음. 코드 검토 A3 M-1 은 차례 4 몫(손대지 않음).

| 지적 | 어디를 어떻게 | 선 위 검증(e2e — CI) |
|---|---|---|
| I-1 조립 빈 칸 너비가 섞인 카드 차례를 닮음 | `src/components/answer/tiles.tsx` 빈 칸(`slots` 일 때만)이 모두 가장 긴 조각 글만큼의 숨은 글로 너비를 잡는다(카드와 같은 24px 굵게) | `writing.spec.ts` `emptySlotsEven` — 처음 · 카드 하나 놓은 뒤 빈 칸 너비가 모두 같음(0.5px 안) |
| I-2 '다 놓았어요'가 하나에도 켜짐 | `TileAnswer` 선택 속성 `needed`(놓아야 할 조각 수 — 다 찼을 때만 켜지고 더 놓을 수 없음). 쓰기 조각이 `expectedAnswerOf` 정답 조각 수를 넘긴다(조립 = 카드 수, 타일 = 정답 글자 수, 빈 글자 채우기 = 빈칸 수). 없으면 배치 조건(하나 이상 · fill-letters 는 빈칸 수) 그대로 | `writing.spec.ts` `placeAll` — 마지막 조각 전 꺼짐 · 놓으면 켜짐(타일 · 조립 모든 문항), 조립 첫 문항은 카드 하나만 놓은 채 꺼짐 |
| M-1 가로 넘침 | 쓰기: `ChoiceAnswer` `instant` 일 때(세션 그림 고르기) 가로에서 그림을 보기 왼쪽에(`landscape:grid-cols-[auto_1fr]`). 읽기: 문항 칸 세로 틈을 가로에서 20 → 16px(`landscape:gap-4`) | `writing.spec.ts` · `reading.spec.ts` `fitsBothWays` — 쓰기 1 · 3 첫 문항 맞음 · 읽기 맞음 · 정답 보기에서 두 방향 `scrollHeight ≤ 보는 창 높이` |
| M-2 '다음' 두 번 | `ChoiceAnswer` 선택 속성 `instant`(고르면 바로 냄, 내기 '다음' 없음) — 세션 그림 고르기가 씀(읽기 문항과 같은 꼴). `TypingAnswer` 선택 속성 `submitLabel` — 세션 받아쓰기 내기는 '다 썼어요'(`WRITING_TEXT.written`, 컨트롤러 결정), 넘기기는 '다음' | `writing.spec.ts` — 그림 고르기는 보기만 누름, 받아쓰기는 '다 썼어요'(견본에 받아쓰기는 2단계라 이번 e2e 에는 없음 — 코드로만) |
| M-3 조립 뜻 | `TileAnswer` 가 `slots` 일 때 뜻을 제목 글꼴 32px(`font-heading text-[32px]`, `data-assemble-meaning`), 안내 두 줄은 20px 그대로. 맞음 단계에서 쓰기 조각이 조립 뜻 줄을 다시 쓰지 않음 | 사진(CI 5차) |
| M-4 '대문자' 자리 | `slots` 일 때 '대문자'를 놓는 줄 오른쪽 끝(`ml-auto`)에 — 첫 카드 아래가 아님. 배치는 그대로 첫 카드 아래. 판정(C73) 그대로 | 사진(CI 5차) · e2e 는 이름으로 누름 |

배치(P10) 영향 없음 근거: 바뀐 동작은 모두 새 선택 속성(`slots` · `needed` · `instant` · `submitLabel`)이나 이미 세션만 넘기는 `onChange` 아래에 있다. 배치 화면(`src/app/(child)/[area]/placement/placement-flow.tsx`)은 이 속성을 하나도 넘기지 않아 조건 · 배치 · 단추 글이 그대로다(빈 칸 · '대문자' 자리 · 뜻 크기는 `slots` 일 때만, 내기 조건은 `needed` 가 있을 때만, 바로 내기는 `instant` 일 때만, 단추 글 기본값 '다음').

사진: 갈래마다 처음 나온 문항을 찍도록 바꿈(검토 '사진 없음' 줄) — `p11-writing-1-pick-word` · `p11-writing-1-copy-tiles` · `p11-writing-1-fill-letters` · `p11-writing-1-wrong` · `p11-writing-1-right` · `p11-writing-3-assemble-sentence` · `p11-writing-3-wrong` · `p11-writing-3-right`(각 두 방향). 나머지 그대로.

시험 수: 단위 492 그대로. e2e 단언 더함(시험 수 그대로).

관문(로컬):

```
pnpm lint                → Checked 295 files. No fixes applied.
pnpm test                → Test Files 52 passed (52) · Tests 492 passed | 6 todo (498)
pnpm build               → exit 0(빌드 CSS 에 landscape:grid-cols-[auto_1fr] 확인)
pnpm exec tsc --noEmit   → exit 0
pnpm check:deps          → ✔ no dependency violations found (151 modules, 623 dependencies cruised)
pnpm check:ids           → code-setting-unknown 0 · design-number 35(새 줄 0)
pnpm check:bundle        → 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0
```

CI 5차(컨트롤러, run 39078060721 · 9e06c6a): 통합 · e2e(배치 e2e 그대로 — 위험 5 없음) · e2e-local 포함 **전부 성공**.

상태: DONE.

## 차례 4 — 말하기 1~2 · 음성 공통 · 기기 알림(검토 묶음 A4, 2026-10-18 09:xx)

바탕 HEAD b648c8c(차례 3 52f30a8 + 맞춤), 커밋 없음. 통합 · e2e 는 CI(아래 줄은 결과가 오면 채운다).

### 바뀐 파일

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/components/session/speaking.tsx` | 신규 | 'use client'. 값 12 — `RepeatActivity`(목표 24px · 들어올 때 한 번 읽기 · '다시 듣기' · '말하기' → 한 문장 끝 규칙 → 인식 글을 아이 말 칸에(틀린 낱말 표시 없음) · 결과 말 셋 · '잘 말했어요'면 ui.auto_next_seconds 뒤 저절로 다음 · 아니면 '한 번 더 말하기'(큰) · '다음'(작은) · 상한 없음) · `ListeningActivity`(대본 한 번 읽기 · '다시 듣기' · 고르면 바로 채점 · 처음 틀리면 '한 번 더 듣기'(다시 읽음) → 둘째 뒤 정답 ✓ · '맞았어요!' 또는 '정답은 이거예요' · 대본 글 안 보임) · `QuestionAnswerActivity`(영어 질문 읽은 뒤 1~4단계 한국어 뜻 · '말하기' → `judgeAppAnswer` · 맞음 '잘 말했어요' + '다음' · 다시 바른 답 문장을 영어 줄로 보이며 들려주고 '같이 말해 볼까요' → 한 번 말하면 결과 말 없이 다음 · 판정 글자 없음) · `MicNotice`('말한 소리는 …' + '알겠어요') · 실패 판정 처리('다시 한 번 말해 볼까요' · 끊김 안내 · 건너뜀 skipped) |
| `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | 값 7 — 말하기 세션을 열 때 `micUsable()` 아니면 막힌 안내(세션 진행으로 남음), 처음 말하는 활동 앞에 마이크 안내(기기마다 한 번 — `MIC_NOTICE_KEY` 공유), `speakingCounters` 를 틀이 쥐고(활동이 바뀌면 next-activity) 판정 셋을 막힌 안내 셋('마이크가 필요해요 …' · '마이크가 잘 안 돼요 …' · '말소리가 잘 안 들려요 …' + '홈')과 기기 알림(`reportSessionMic`)으로. mic-unavailable 은 기기 상태도 남김(`markMicUnavailable`). 끝 시도 활동에 따라 말하기 · 듣기 · 질문 답(앱 판정 단계만) 더함 |
| `src/server/alerts/device.ts` | 신규 | `server-only`. `recordDeviceAlert({ kind: mic_unavailable · mic_stalled · speech_silent, code, browser })` — P10 `recordPlacementMicAlert` 몸통(createAlertOnce once day · 값 code · browser) |
| `src/server/placement/index.ts` | 수정 | `recordPlacementMicAlert` 가 마이크 두 종류만 거른 뒤 `recordDeviceAlert` 를 부름(동작 같음) · 동음이의어 읽기를 공용으로 |
| `src/server/actions/session.ts` | 수정 | `reportSessionMic`(첫 문장 `await requireAccess()`) |
| `src/server/seed-lists.ts` | 수정 · 공용 | `seedHomophones()` — 배치 · 세션 두 벌을 한 곳으로(목록 없으면 빈 묶음 + 경고 한 번). AI 층(`@/server/ai`)을 가져오지 않는 모듈 |
| `src/server/session/index.ts` | 수정 | 동음이의어 정의를 지우고 공용에서 가져옴 |
| `src/core/answer/expected.ts` | 수정 | A3 M-1 — `displayCardsOf` 가 허용 정답 **전부**에서 문장 가운데 대문자 낱말을 모음 |
| `src/core/answer/display.ts` | 수정 · **계획 표 밖** | 배치 조립 문항(`displayItemOf`)도 `displayCardsOf` 로 카드를 보임(판정 그대로 — 검토 A3 범위 밖 관찰) |
| `src/components/answer/tiles.tsx` | 수정 | fix 3 새 Minor — `slots` 조립에서 '대문자' 자리를 처음부터 잡음(첫 카드 전에는 꺼짐) — 세로에서 카드 줄이 밀리지 않게 |
| `src/components/answer/choice.tsx` | 수정 | `reveal.answerNo` 를 선택으로(정답 없이 고른 오답 ✕ 만 — 듣기 이해 처음 틀림) |
| `tests/e2e/speaking.spec.ts` | 신규 | 증명 표 이름 글자 그대로 열(AC-5b · 5c · 5e · 5f 셋 · N3 넷). 가짜 음성 대본을 수업 문장으로 만듦, 견본 수업(따라 말하기 20낱말 문장 · 질문 둘 · 질문 하나)은 견본 빌더로 넣음, 4단계는 1단계 수업 복제 |
| `tests/integration/device-alert.test.ts` | 신규 | 기기 알림 셋 · 학습일마다 한 번 · 값은 code · browser 만 · 다른 칸 거부 |
| `tests/unit/answer-expected.test.ts` | 수정 | 허용 정답 둘(이름 자리 바꿈) · 배치 화면 꼴 카드 사례 둘 |

### 시험 수

단위 492 → **494**(+2), 파일 52. 통합 신규 하나(device-alert). e2e 신규 열(speaking.spec).

### 다르게 한 것과 까닭

1. **인식 실패 셈을 틀이 쥔다.** 조각은 결과를 `onSpeech(event)` 로 넘기고 판정을 받는다. 세션 몫 셈(성공 없이 여섯 번 · 말소리 없음 이어짐)이 활동을 넘어 이어져야 해서다(차례 1 `speakingCounters`). 막힌 안내 · 알림도 틀이 한다.
2. **말소리 없음으로 막힐 때 그 활동은 건너뛴 끝 시도(skipped "silent")로 남긴다.** 7절 '그 문항을 건너뛰고'와 같고, 다시 열면 다음 활동에서 이어진다. 마이크 멈춤 · 쓸 수 없음은 그 활동을 남기지 않는다(다시 열면 그 활동에서).
3. **처음 마이크 안내는 세션 처음이 아니라 처음 말하는 활동 앞**(미리보기 뒤). '처음 마이크를 쓸 때'(4절)에 맞춤. 단추는 '알겠어요'(plan 표).
4. **질문 답의 '같이 말해 볼까요' 뒤 말은 결과 말 없이 바로 다음**, 그 말이 인식 실패면 다시 듣기 셈 안에서 다시(건너뜀이면 skipped). 첫 답은 `heard`, 뒤 말은 `echo`(값 2).
5. **듣기 이해 '한 번 더 듣기'** 는 답 조각을 새로 그려 대본을 다시 읽고, 처음 고른 오답은 ✕ 로 남겨 다시 고를 수 없게 한다(컨트롤러 결정 — 읽기 문항과 같은 꼴, `ChoiceAnswer` 선택 속성 `struck`). 둘째 고름 뒤 정답 ✓ · 고른 오답 둘 다 ✕.
6. **답 꼴 · 상한:** 1~2단계 질문 답은 한 문장(서버 `answerShapes`), 두 문장 이상 꼴의 상한은 `speaking.answer_max_seconds.<구간>`(서버 config) — c 가 같은 길을 쓴다.
7. **마이크 멈춤 알림 코드:** 감시 타이머 멈춤은 'stalled', 여섯 번은 마지막 오류 코드(결과 없음이면 'no-result'), 말소리 없음은 'no-speech'.

### 정할 것

| 번호 | 무엇 | 고른 것 | 까닭 |
|---|---|---|---|
| 1 | 듣기 이해 다시 고를 때 처음 오답 표시 | 처음 오답은 ✕ 로 남김(새 조각이 대본을 다시 읽음) — CI 6차 뒤 컨트롤러 결정으로 처음 고른 '남기지 않음'을 바꿈 | 읽기 문항과 같은 꼴 |
| 2 | 질문 답 화면에 아이 인식 글을 보이는가 | 보이지 않음(따라 말하기만 아이 말 칸) | AC-5d '판정 글자 없음' 쪽으로 — 인식 글과 정답이 나란하면 판정처럼 읽힌다 |

### 관문 명령 결과(로컬)

```
pnpm lint                → Checked 299 files. No fixes applied.
pnpm test                → Test Files 52 passed (52) · Tests 494 passed | 6 todo (500)
pnpm build               → exit 0
pnpm exec tsc --noEmit   → exit 0
pnpm check:deps          → ✔ no dependency violations found (153 modules, 648 dependencies cruised)
pnpm check:ids           → code-setting-unknown 0 · design-number 35(새 줄 0)
pnpm check:bundle        → 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0(missing-test 21줄, 보고만)
녹음 API(getUserMedia · MediaRecorder) — src 에 없음
```

사진 이름(E2E_PHOTOS): `p11-speaking-repeat` · `-repeat-good` · `-repeat-close` · `-listening` · `-question` · `-together` · `-result` · `-needs-mic` · `-stalled` · `-silent` · `-offline`(각 두 방향).

CI 6차(컨트롤러, run 39079611504 · 833de73): integration 1 실패 / 150, e2e 4 실패 / 59(배치 · 읽기 · 쓰기 e2e 는 모두 초록 — 위험 자리 셋은 통과), 그 밖 성공.

- **integration `device-alert.test`:** 시험용 시드가 1단계까지라 첫 실행(말하기 1단계)이 `seed_range_end_near` 알림도 남겨, 프로필 알림 전부를 기기 알림 셋과 맞댄 단언이 깨짐 → 시험이 `DEVICE_ALERT_KINDS` 로 걸러 봄(코드 변화 없음). 로그의 'TypeError: done is not a function' 은 `embedded-postgres` 의 종료 훅(`gracefulShutdown(done)` — `node_modules/embedded-postgres/dist/index.js:386~393`)이 콜백 없이 불린 것으로, 시험이 실패해 프로세스가 끝 코드로 나갈 때만 뒤에 붙는 라이브러리 줄이다(이번 변경과 무관 — 장부 '환경' 행에 둘 만함).
- **e2e AC-N3 aborted · no-speech:** 시험이 앞 듣기가 끝나기 전에 '말하기'를 다시 눌렀다(앞의 '다시 한 번 말해 볼까요'가 이미 보여 기다림이 바로 지남). 듣는 중의 누름은 7절대로 듣기를 끝내는 누름이라 실패 하나가 사라져 건너뜀에 닿지 않았다 → 조각 뿌리에 `data-failures` · `data-listening` 을 두고, 시험 `speak()` 가 듣는 중이 아닐 때 · 들어올 때 읽기 뒤(250ms)에 누르고 실패 수를 기다린다.
- **e2e AC-N3 network:** 같은 '누름 · 읽기 · 듣기' 경합으로 본다(로그로 확정 못 함 — 단위 재현에서 network 결과 · 판정 '끊김'은 바름). 같은 `speak()` · 실패 수 0 단언으로 바꿈. 7차에서 다시 실패하면 이 짐작이 틀린 것이다.
- **e2e AC-5f 저절로 넘김:** 넘김 시계는 결과가 오는 때 시작하고 시험은 '잘 말했어요'가 보인 뒤 재서 791ms 로 짧게 잼 → '그 전 일정 동안 머무르고 그 뒤 넘어감'으로 단언을 바꿈.
- **컨트롤러 결정 둘:** 듣기 이해에서 다시 고를 때 처음 오답은 ✕ 고정(`ChoiceAnswer` 선택 속성 `struck` — 세션만 넘김, 배치 그대로) · 질문 답 화면에 인식 글을 보이지 않는 것 받음.

로컬 관문(고친 뒤): lint 0 · 단위 494 · build 0 · tsc 0 · check:deps 0 · check:ids design-number 35 · check:bundle 0 · spec:trace exit 0.

CI 7차(컨트롤러, run 39080614985 · 8f5bd72): 통합 · e2e 63(말하기 열 포함) · e2e-local 포함 **전부 성공** — 경합 · 측정 짐작이 맞음.

상태: DONE.

## 차례 4 fix 4 — 화면 검토 A4 I-1 · M-1~M-3 + 코드 검토 A4 M-1(2026-10-18 09:xx)

바탕 HEAD b648c8c, 커밋 없음.

| 지적 | 어디를 어떻게 | 선 위 검증(e2e — CI) |
|---|---|---|
| I-1 듣는 동안 변화 없음 | 새 공용 조각 `src/components/answer/speak-button.tsx` `SpeakButton` — 듣는 동안 단추 안쪽 분홍 테(`border-postit-speaking`) · 둘레의 남은 시간 고리(conic-gradient — 먹색이 줄고 종이색이 늘어남, 분홍 카드 위에서 보이게) · `data-listening` · `aria-pressed`. 남은 시간은 P2b `ListenHandle.capAt`(설정 speech.max_listen_seconds · 활동 상한에서 온 시각)과 누른 시각으로만 셈(박힌 수 없음 — 한 바퀴 `FULL_TURN_DEG`). 다시 누르면 듣기 끝(부르는 쪽 press, 7절 그대로). `listeningLabel` 자리(c 의 '다 말했어요'). 세션 조각(`speaking.tsx`) · P10 배치 `repeat.tsx` 가 같이 씀 | `speaking.spec.ts` AC-5b — '말하기' 누른 뒤 결과 전 `[data-speak][data-listening]` · 고리 style · 사진 `p11-speaking-listening-on`, 결과 뒤 듣는 중 표시 없음 |
| M-1 · 코드 M-1 막힌 안내 '홈' 둘 | 막힌 동안 종이 띠 '홈'을 숨기고 몸통 큰 '홈'(BigButton) 하나가 같은 `home()`(대기열 비우기)를 씀. 막힌 동안은 `leaveSession` 의 첫 활동 지움을 끔(세션은 진행으로 — 7절) | AC-5c — '홈' 단추 하나 · 눌러도 세션 진행 |
| M-2 가로 듣기 '다음' 걸림 | `ChoiceAnswer` 의 `instant`(세션) 그림 보기는 가로에서 그림 칸 112px · 위아래 여백 줄임(`ChoiceOption` `compact`, 배치는 그대로) | AC-5b — 듣기 처음 틀림 · 정답 보기 · 맞음에서 `fitsBothWays` · 사진 `p11-speaking-listening-wrong` · `-reveal` · `-right` · 처음 오답 ✕ 고정 단언 |
| M-3 안내 줄 · 크기 | 활동 첫 줄 안내(plan 표 a 행 — 컨트롤러가 더함): 따라 말하기 '잘 듣고 따라 말해 봐요' · 듣기 이해 '잘 듣고 알맞은 것을 골라요' · 질문 답 '질문을 듣고 영어로 대답해 봐요'(20px). 따라 말하기 목표 글 36px · 질문 답 영어 질문 28px(4절 '24px 이상' 안) | 사진(CI 8차) |

배치(P10) 영향: 말하기 단추가 같은 조각이 되어 듣는 동안 꼴(테 · 고리 · `data-listening`)이 배치에도 생긴다(I-1 이 배치에도 걸린 것 — 화면 검토 근거 `repeat.tsx:154-163`). 단추 이름 '말하기' · `data-speak` · `aria-pressed` 는 그대로라 배치 e2e 의 단추 찾기는 같다. 그림 칸 줄임 · `struck` 은 세션만 넘긴다.

새 사진: `p11-speaking-mic-notice` · `-listening-on` · `-listening-wrong` · `-listening-reveal` · `-listening-right`(각 두 방향).

시험 수: 단위 494 그대로. e2e 단언 · 사진 더함(AC-5b 첫 듣기 문항은 처음에 틀리게 바꿈 — 듣기 점수 기대값을 그에 맞춤).

관문(로컬): lint 0 · 단위 494 · build 0 · tsc 0 · check:deps 0 · check:ids design-number 35(새 줄 0) · check:bundle 0 · spec:trace exit 0.

CI 8차: (컨트롤러 결과 대기)

## P11a 완료 보고에 넣을 것(차례 1~4 모음)

### 계획과 다르게 한 것(모두 검토에서 받음 — 까닭은 각 절)

- **값 1 활동 모델:** 입력에 `level` 은 차례를 정하는 데 쓰지 않는다(부르는 쪽이 thinkout · corrections · confirmQuestions 로 채움). 차례 1 의 P10 두 인자 덧붙임은 차례 2 에서 지움.
- **값 2 시도 꼴 · 앱 채점:** ctx 에 `appJudgedQuestions` 를 더함(시드 accepted 칸이 아니라 규격으로 가름). 공개 함수를 덧붙임(`parseAttemptInput` · `inputFitsActivity` · `finalActivityNos` · `lemmaLookup`). NUL 글자 든 시도 거부(묶음 넣기가 늘 실패해 대기열이 막히지 않게). 건너뛴 시도는 인식 글이 있어도 점수 · 단어별 정오 없음(컨트롤러 결정 1). 단어별 정오 세부(같은 단원 단어 한 줄 · 여러 낱말 표제어 · 정규화 견줌 — 'yo-yo' · "o'clock").
- **값 3 세션 점수:** 입력을 영역별 판별 합으로, 쓰기에 `part`. `cleanSentenceRate` · `rubricScoreOf` 덧붙임. 구조 상수 `RUBRIC_MAX` · `MIC_STALL_RETRY_MULTIPLE`.
- **값 5 세션 서버:** 묶음은 시도 id 글조차 없으면 통째로 invalid(P10 시험 그대로), 점수 칸을 붙인 시도는 꼴 틀림으로 거부, AI 길 거부(`needsAiPath` — 3단계부터 질문 답은 skipped 끝 시도만), 읽기 · 쓰기 세션의 영어로 말한 문장 수 0, 끝 시도 둘이면 먼저 저장된 것, `readSessionArea` → `readSessionPlace`, 화면 자료에 `openSessionIds` · 쓰기 낱말 뜻.
- **값 6 활동 안 입력:** `prune(진행 세션 id)` 로 끝내지 않은 세션 줄 정리(검토 A2 M-1).
- **값 7~9 틀 · 결과 · 읽기:** 결과 큰 단추는 hereStart 가 수업 · 연습이면 그 칸, 하던 수업이면 그 세션, 그 밖 '수업 목록'. 상태 줄은 늘 두는 알림 영역(`sr-only`). `ReadingPassage` 선택 속성 셋(`onWordTap` · `openWord` · `renderPicture` — 세션 길만, 시드 보기 · 평가 지문 그대로). 문항 쪽 지문 보기에는 그림 줄 없음(컨트롤러 결정). 지문 그림 깨짐 대체 `SafePicture`. 쪽지 자리 재기(오른쪽 반이면 오른쪽 끝 · 카드 안으로 당김). 가로 그림 보기 칸 112px.
- **값 10 e2e 견본:** 기본 틀 규격(작은 틀로는 읽기 견본이 만들어지지 않음 — plan 추측이 틀림). `levelSpecOf` 로 시험 숫자를 DB 규격에서.
- **값 11 쓰기 1~3:** 답 조각 선택 속성 `initial` · `onChange` · `reveal` 에 더해 `slots`(놓는 칸 · 같은 너비 · '대문자' 줄 끝 · 뜻 제목 글꼴) · `needed`(다 찼을 때만 '다 놓았어요') · `instant`(고르면 바로 채점) · `submitLabel`(받아쓰기 '다 썼어요' — plan 표에 더해짐). 정답 조각 · 카드 표시 함수를 core 에(`expected.ts` — C84). 배치 조립 화면도 같은 카드 표시.
- **값 12 말하기 · 기기 알림:** 위 '차례 4 다르게 한 것' 1~7(듣기 이해 다시 고를 때 처음 오답 ✕ 고정 — 컨트롤러 결정). 동음이의어 읽기 한 곳(`seed-lists.ts`).
- **계획 표 밖 파일 — 차례 1 꿰맞춤:** `src/app/(child)/session/[id]/session-frame.tsx` 를 차례 1 에서 없어진 활동 종류(`writing-sentence` · `writing-composition`)만 새 종류의 P10 자리 표시로 꿰맞췄고(브리프 허용), 차례 2 가 틀을 다시 쓰며 그 꿰맞춤을 없앴다(보기만 하는 활동 몸통 `DisplayBody`, 문장 틀 key → 문장 번호 — 검토 review-p11-1-code M-5).
- **계획 표 밖 파일 — 시험:** `tests/integration/session-start.test.ts`(P10 시험 — 저장 결과 기대값에 `rejected: []`, 위험 3) · `tests/unit/safe-error.test.ts`(장부 행 — `safeDbError` 시도 저장 질의 오류 사례) · `tests/unit/session-input.test.ts`(활동 안 입력 · prune) · `tests/unit/answer-expected.test.ts`(정답 조각 · 카드 표시 · 배치 화면 꼴) · `tests/integration/device-alert.test.ts`(기기 알림 once day).
- **공용 변경(컨트롤러 요청) — 사진 아티팩트:** `tests/e2e/photos.ts`(`E2E_PHOTOS` 가 있을 때만 `test-results/photos/<이름>-<portrait|landscape>.png`) · `.github/workflows/ci.yml` e2e 작업의 `E2E_PHOTOS: "1"` 과 `actions/upload-artifact@v4`(e2e-photos, `if: always()`, `if-no-files-found: ignore`). 이 Mac 이 로컬 e2e 를 못 돌려 화면 검토 사진을 CI 에서 받으려고(차례 2).
- **13절에 적힌 것:** C83(7절 '최대 3회 다시 듣는다' · 12절 '다시 듣는 횟수' 글을 구현 — 실패 수가 speech.max_retries 에 닿으면 건너뜀, 처음 듣기 포함 — 에 맞춤, 차례 1 fix 1 무렵 · 코드 변화 없음) · C84(조립 카드 대문자 — 차례 3 정할 것).

### 남긴 것(다른 차례 · P 몫)

- **b · c:** 쓰기 4~12 · 말하기 3~12 AI 활동 조각 · 시도 꼴 종류 · `needsAiPath` 의 자기 규칙 · 둘째 세션 교정 수(`corrections` 지금 0) · 결과 화면 쓰기 6+ 첫 세션 문구 · `/result` 의 '첨삭 보기'. 받아쓰기 '다 썼어요'는 2단계 갈래라 e2e 사진이 없음(코드로만) — b 이전에 2단계 견본으로 볼 수 있음.
- **차례 10(c 마무리):** `font-size.spec` AC-N9 에 P11 화면(읽기 · 쓰기 · 말하기 · 마이크 안내 · 결과) 더하기(공용 변경 3).
- **P12:** 결과 화면 별 · 오늘 얻은 단어 · 단원 막대 · '단원 n을 통과했어요!' · '다시 했어요' · 'n단계 평가 보기', `attempts.word_results` · `tappedWords` · `shownWords` 로 단어장 · 복습일, `sessions.score` null 세션을 최근 성적에서 빼기, 평가 지문 그림 줄에 `renderPicture`(`SafePicture` 꾸밈 그림) 넘기기(장부 35행), 평가 화면 조립 카드 표시(`displayCardsOf`).
- **P8:** C84 시드 규칙 · 검증기(고유 명사 · I 카드는 정답 꼴), 쓰기 1~3 정답 낱말 = 단원 단어 원형.
- **1-나:** 부모 화면이 `speech_silent` · `mic_*` 알림과 `sessions.english_sentences` 를 읽음. '이 문제 이상해요' 자리. 'AI 쉬는 중' 상태가 말하기 3~8 질문 답을 건너뛰는 길(c 와 함께).
- **공용 변경 2(컨트롤러):** 개발용 DB 둘에 P11 설정 키(차례 2 다르게 한 것 11 — 읽기 · 쓰기 세션도 음성 · 말하기 설정을 읽음).
- **실기(H2 · 차례 11):** iPad Safari 에서 저절로 읽기(unlockFromGesture) · 결과 말 · 끝 조용함 · 마이크 안내를 요청자가 직접 확인.

## 차례 5 — AI 길 · 쓰기 4~5 확인(검토 묶음 B1, implementer impl-p11b, 2026-10-22 14:0x)

바탕 HEAD 79ee1cc(차례 4 커밋), 커밋 · stash · push 없음. 통합 · e2e 는 이 Mac 에서 돌리지 않았다(가정 (다)) — CI 로.

### 바뀐 파일

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `playwright.config.ts` | 수정 · **공용 변경 1(C81)** | `E2E_AI_PORT` 54349(25) · `E2E_FAKE_AI_KEY` "e2e-fake-key"(27) · webServer 둘째 `fake-ai`(DB 다음 · Next 앞, 준비 줄 `FAKE_AI_READY`, SIGTERM) · Next env 에 `ANTHROPIC_BASE_URL` · `ANTHROPIC_API_KEY`, `VERCEL_ENV` 를 지움(P9a `clientOptionsOf` 가 그때만 SDK 에 주소를 맡김) |
| `tests/e2e/fake-ai-server.ts` | 신규 | P9a `startFakeAnthropicServer` 를 `--port` 로 띄우고 `FAKE_AI_READY` 를 낸다(설정이 이 상수를 가져감 — 글자 한 벌). 직접 실행 판정은 dev-db 꼴(import.meta 없음) |
| `tests/e2e/fake-ai.ts` | 신규 | 값 8 — `resetFakeAi` · `pushFakeAi` · `fakeAiRequests` · `fakeAiRequestsOf(목적)` · `writingCheckReply({ correct, fix?, delayMs? })` · `ruleFor` · `FAKE_PRAISE`. 모델은 `TEST_SETTINGS` |
| `src/core/session/attempt.ts` | 수정 | 값 4 — b 종류(writing-task · writing-guided 진행/끝 · writing-guided-fix 진행 · writing-own-repeat · thinkout 진행/끝(step 판별 합) · draft · feedback-praise · feedback-correction · model-answer · rewrite · own-speak, 58~116) · `INPUT_VERSION` 내보냄(25) · `inputFitsActivity`(고친 문장 진행 시도는 쓰기 문장 활동의 것, 156) · `serverActionOnly`(169) · `aiNeededLesson`(187) · `appActivityResult` 의 b 종류는 점수 없음(끝) |
| `src/core/writing/guided.ts` | 신규 · **계획 표 밖** | `frameParts` · `frameBlanks` · `assembleSentence` · `fixSpotOf` · `applyFix` — 화면 · 서버가 같은 함수로 문장을 만들고 고칠 곳 자리를 찾는다(단위 시험) |
| `src/server/session/ai-context.ts` | 신규 | 값 1 — `levelContextOf`(28): 단계 규격 can-do · sentenceMaxWords, 단원 규격 학습 요소 · targetVocab, 앞 단원(앞 단계 1~5 + 같은 단계 앞, 단원 0 뺌)을 `pickByCell` 로, 없는 칸은 `LevelContextError` |
| `src/server/session/ai-gate.ts` | 신규 | 값 2 — `aiRestingToday`(25) = `preCallGate(dailyUsage(…))` 막힘 |
| `src/server/writing/index.ts` | 신규 | 값 3 공통 + `checkGuided`(132): 같은 시도 id · 같은 활동 끝 시도면 저장 결과, 진행 중 쓰기 세션 · 쓰기 문장 활동 · 문장 수 확인, `checkWriting`(가변부 `levelContextOf`), 성공 → 시도 `{ ai_feedback: { state: "ok", value }, score: cleanSentenceRate }`, 실패 → `{ state: "failed", reason }` · `skipped`, 안전 상한 → 시도 없이 `ai_resting`, DB 실패 → `unavailable`. 고칠 곳 보기 = 바른 표현 + 헷갈리는 보기를 시도 id 로 정한 차례(`rotationOf`), 아이 문장에서 자리를 못 찾는 고칠 곳은 내지 않음 |
| `src/server/actions/writing.ts` | 신규 | `checkGuidedWriting` — 첫 문장 `await requireAccess()` |
| `src/server/session/index.ts` | 수정 | 값 9 — 시작: 잠금 전에 `aiNeededLesson` · `aiRestingToday`(434), 하던 수업(resume)은 그대로 열고 새로 여는 수업은 확인 쪽지 · 중단 전에 `{ ok: false, reason: "ai_resting" }`(462). 대기열 길 `needsAiPath` 가 `serverActionOnly` 를 거부(339). 화면 자료 `aiResting`(1085) · `guided: { input(단계 규격 amount.input), sentences(확인 끝 시도 문장, 고친 문장 진행 시도가 있으면 가장 늦은 것) }`(`guidedViewOf` 907). `SpecBits.amount` |
| `src/components/session/wait-hint.tsx` | 신규 | 값 6 — `WaitHint`: 그리는 즉시 점 셋(`data-wait-hint`, motion-reduce 멈춤), 둘째 값 뒤 '확인하고 있어요'(`data-wait-line`) |
| `src/components/session/ai-rest.tsx` | 신규 | C50 (2) — '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요' + '홈'(onHome 이면 단추, 없으면 링크) |
| `src/components/session/writing-guided.tsx` | 신규 | 값 7 — `GuidedTaskActivity`(P5b 과제 · 예시 + 4단계 '단어 상자' 칩 + '다음') · `GuidedWritingActivity`(문장 전부 한 화면, 4단계 누르는 빈칸 + 문장마다 단어 상자 칩 · 5단계 입력란(autoComplete · autoCorrect · autoCapitalize off · spellCheck false · lang en), '다 썼어요' → WaitHint → 같은 화면에 칭찬 한 줄 · 고칠 곳 색칠 · '색칠한 곳을 눌러 고쳐 봐요' → '알맞은 말을 골라요' 보기 → 틀리면 ✕ · '다시 골라 볼까요' → '잘 고쳤어요!' → '다음'; skipped 면 바로 다음, 끊김이면 7절 안내 · online 때 같은 시도 id 로 다시) · `OwnRepeatActivity`(문장마다 a `RepeatActivity`, '건너뛰기', 마이크 막힘이면 이 활동만 건너뜀) |
| `src/components/session/speaking.tsx` | 수정 | `RepeatActivity` 선택 속성 `guide` · `ringGapClassName`(쓰기 카드 하늘 틈). **N-1**: '같이 말해 볼까요' 바른 답 36px |
| `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | 쓰기 과제 · 문장 · 내 문장 조각 연결(문장 활동 끝 시도는 서버 액션이 저장 — `advance()` 로 대기열 없이 다음, 고친 문장은 `writing-guided-fix` 진행 시도), 내 문장 활동은 마이크를 쓸 수 없으면 `skipped: "no_mic"` · 문장이 없으면 빈 끝 시도(405), 처음 마이크 안내를 쓰기에도, 안전 상한 안내(`resting` — 열 때 `view.aiResting` · 도중 서버 액션, 789), '홈'은 안내 중 세션을 지우지 않음(542). **M-2**: 막힌 안내 · 안전 상한 안내가 끝내기 실패보다 먼저(`stopped` · `showFinishRetry`, 813) |
| `src/app/(child)/[area]/lessons/use-lesson-start.ts` | 수정 · **계획 표 밖 차례(plan 표는 B3)** | `ai_resting` 이면 `resting` 을 켬 |
| `src/app/(child)/[area]/lessons/lesson-board.tsx` · `past/past-lessons.tsx` · `src/app/(child)/result/[id]/result-view.tsx` | 수정 · **계획 표 밖(앞 둘은 B3 몫을 당김)** | `resting` 이면 `AiRest`(목록은 띠 '홈'을 빼고 안내 + '홈' 하나, 결과 화면은 큰 단추 자리에 안내 · 띠 '홈' 숨김) |
| `tests/e2e/lessons.ts` | 수정 | `guidedSample(4 | 5)`(견본 4단계, 5단계는 복제) · `openLessonSession`(writing.spec 의 openSession 을 옮김) |
| `tests/unit/session-attempt.test.ts` | 수정 | 넷 더함(아래) |
| `tests/unit/writing-guided.test.ts` | 신규 · 계획 표 밖 | 둘 |
| `tests/integration/writing-check.test.ts` | 신규 | 증명 표 셋(이름 글자 그대로) |
| `tests/integration/safety-cap.test.ts` | 수정 | 아래 describe '1-가 안전 상한' 둘(위 AC-8b 다섯은 그대로 — 시드 DB 를 따로 만듦) |
| `tests/e2e/writing.spec.ts` | 수정 | 쓰기 4~5 e2e · 1-가 안전 상한 e2e(이름 글자 그대로), `beforeEach`/`afterEach(resetFakeAi)` |
| `tests/e2e/timeout.spec.ts` | 신규 | AC-N10 · AC-N6(이름 글자 그대로) |
| `tests/e2e/speaking.spec.ts` | 수정 | **재검토 코드 M-1**: (가) AC-5c 끝에 '쓸 수 없음' 기기로 새 세션을 열자마자 막힘 → '홈' → 시도 0 인 세션이 진행으로 남음, (나) AC-5b 듣는 동안 고리 각도를 400ms 사이 두 번 재 작아짐 |

### 시험 수

단위 494 → **500**(+6, 파일 52 → 53). 통합 신규 다섯(writing-check 셋 · safety-cap 둘), e2e 신규 넷(쓰기 4~5 · 1-가 안전 상한 · AC-N10 · AC-N6), 고침 하나(speaking AC-5b · 5c 단언).

덮는 시험(증명 표 글자 그대로):
- 통합 `writing-check.test.ts`: "쓰기 4~5: 세션 점수는 첫 제출에서 맞다고 본 문장 수 ÷ 문장 수이고 확인이 실패하면 점수가 빈다" · "쓰기 4~5: 같은 시도 id 로 다시 내면 AI 를 다시 부르지 않고 저장한 결과를 돌려준다" · "쓰기 AI: 가변부의 앞 단원 학습 요소는 앞 단계 전부와 같은 단계 앞 단원이다"
- 통합 `safety-cap.test.ts`: "1-가 안전 상한: 그 학습일 호출이 ai.safety_daily_calls 에 닿으면 쓰기 4단계 이상 첫 세션 · 말하기 9단계 이상은 시작되지 않고 둘째 세션 · 읽기 · 쓰기 1~3 은 시작된다" + 접두 없는 하나 "1-가 안전 상한: 쓰기 확인 도중 닿으면 시도를 남기지 않고 '쉬는 중'이며 세션은 진행으로 남고 다시 열면 화면 자료가 안내를 고른다"
- e2e `writing.spec.ts`: "쓰기 4~5: 문장을 다 쓰고 내면 칭찬 한 줄과 고칠 곳 하나가 같은 화면에 보이고 고칠 곳을 누르면 보기 2~3개가 나와 골라 고친다" · "1-가 안전 상한: 쓰기 5단계 수업을 고르면 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 '홈'이 보인다"
- e2e `timeout.spec.ts`: "AC-N10 응답을 늦춘 고정 표본에서 1초 안에 기다림 표시가 보이고 5초 뒤 '확인하고 있어요'가 더해진다" · "AC-N6 쓰기 확인이 ai.timeout_seconds.realtime 을 넘으면 확인 없이 다음 활동으로 넘어간다"
- 단위(접두 없음): "b 시도 꼴: 쓰기 4~12 종류의 진행 · 끝 시도를 읽고 칸이 틀리면 받지 않는다" · "b 시도 꼴: 대기열 길은 쓰기 확인 끝 · 생각 꺼내기 · 초고 끝 · 고쳐 쓰기 끝을 받지 않는다(서버 액션만 저장)" · "b 시도 꼴: 고친 문장 진행 시도는 쓰기 문장 활동의 것이고 AI 없는 b 끝 시도는 점수 · 단어별 정오가 없다" · "AI 가 필요한 수업: …" · "문장 틀: …" · "고칠 곳: …"

빨강 먼저: 단위 여섯은 구현 전에 실패를 봤다(모듈 · 함수 없음). 통합 · e2e 는 로컬에서 못 돌려 CI 첫 바퀴가 빨강 · 초록을 알린다.

### 다르게 한 것과 까닭

1. **4 · 5단계 넣는 꼴은 단계 규격 `amount.input`(word-box · slot)으로 가른다** — 단계 숫자를 박지 않으려고(값 2 의 '시드 칸 유무로 가르지 않는다'와 같은 결). 규격에 없으면 화면 자료가 던진다. 그래서 5단계 e2e 는 4단계 견본을 5단계로 복제해도 입력란이 된다.
2. **단어 상자는 문장마다** — 시드 `sentences[].wordBox` 가 문장마다라 칩을 누르면 그 문장의 첫 빈칸으로 간다(목업은 상자 하나). 과제 화면은 모든 문장 낱말을 한 상자로 보인다. 가로 화면은 문장 줄 옆에 상자.
3. **문장 쓰기 화면 첫 줄은 시드 과제 글**(`content.task`) — 정본 밖 새 문구를 만들지 않으려고. 시드 hints · rubric 은 어디에도 안 보인다.
4. **`checkGuided` 는 같은 활동에 끝 시도가 이미 있으면(다른 시도 id — 두 기기) 그 결과를 돌려준다**(AI 를 다시 안 부름). 같은 시도 id 가 동시에 둘 들어오는 경합은 막지 않고 먼저 저장된 결과를 돌려준다(아래 우려).
5. **고칠 곳 자리를 아이 문장에서 못 찾으면(대소문자 무시) 그 고칠 곳을 내지 않는다** — 색칠할 수 없어서. 칭찬만 보이고 점수는 AI 판정 그대로.
6. **서버에서 던진 오류(가변부 재료 없음 · 호출부 결함)는 실패 이유 `error` 로 시도를 남기고 넘어간다**(표 '서버 오류' 열 — 화면은 넘어감). 시도 저장까지 실패하면 `unavailable` → 화면이 저장 실패 줄을 보이고 같은 시도 id 로 다시.
7. **`aiRestingToday` 는 `@/server/ai/store` 의 `dailyUsage` 를 바로 가져온다**(plan 제약 'index.ts 만'은 AI 를 부르는 길에 대한 것으로 읽음 — 읽기 함수는 index 가 다시 내보내지 않는다). P9c 파일은 고치지 않았다.
8. **수업 목록 · 지난 수업 · 결과 화면의 안전 상한 안내를 이 차례에 당겼다** — 브리프의 e2e '쓰기 5단계 수업을 고르면 … 보인다'가 목록 화면을 거쳐야 해서(plan 표는 lesson-board · use-lesson-start 를 B3 에 둠). 바꾼 것은 `resting` 한 칸과 안내 그리기뿐이다.
9. **내 문장 듣고 따라 말하기의 '건너뛰기'는 그 활동 전체를 건너뛴다**(문장 하나가 아님). 문장마다 '잘 말했어요'면 저절로 다음 문장, 아니면 a 조각의 '한 번 더 말하기' · '다음'. 마이크 막힘(쓸 수 없음 · 멈춤 · 말소리 없음)은 쓰기 세션을 막지 않고 이 활동만 `no_mic` 로 넘긴다(기기 알림 · 막힌 안내 없음).
10. **`WaitHint` 는 첫 값을 기다리지 않고 그리는 즉시 보인다**(첫 값은 '이 안에' 상한) — 받는 값은 둘 다 설정 그대로.
11. **AI 기다림 e2e 는 가짜 서버 규칙을 시험마다 비운다**(`beforeEach` · `afterEach` — plan 값 8 '`beforeEach(resetFakeAi)`'에 뒤 비우기를 더함, AI 를 쓰지 않는 다른 e2e 파일은 고치지 않음).

### 정할 것(컨트롤러)

| 번호 | 무엇 | 고른 것 | 까닭 |
|---|---|---|---|
| 1 | 하던 쓰기 4~5 세션을 상한 날 다시 열었는데 AI 활동(문장 확인)이 이미 끝나 내 문장 듣기만 남은 때 | 그래도 안내(plan 값 9 글자 그대로 — `aiNeededLesson` · 상한이면 `aiResting`) | 드문 경우이고 다음 학습일에 이어진다. 남은 활동만 보려면 c · 1-나가 'AI 활동이 남았는가'를 더하면 된다 |
| 2 | 증명 표 '1-가 안전 상한 …둘째 세션 … 시작된다'의 둘째 세션 몫 | 이 차례는 `aiNeededLesson({ part: "rewrite" })` 거짓만 단언(시험 안 주석), 시작 판정 길('첨삭 보기')은 차례 7 이 같은 시험에 더함 | 둘째 세션을 여는 길(`judgeLessonStart` part rewrite)이 차례 7 에 생긴다 |
| 3 | 재검토 화면 N-2('한 번 더 말하기' 오른쪽 안쪽 몇 px) | 손대지 않음 | 2026-10-22 고리 틈(요청자 iPad '고리 안 보임')으로 단추 둘레가 바뀌어(바깥 8 + 안 4px) 검토 때 잰 값이 지금과 다르다. 음수 여백은 듣는 동안 고리가 옆 단추 쪽으로 넘어 다음 사진으로 다시 재기를 권함 |

### 사진 이름(E2E_PHOTOS, 각 `-portrait` · `-landscape`)

`p11-writing-4-task` · `-4-write` · `-4-check` · `-4-options` · `-4-fixed` · `-4-own` · `p11-writing-5-task` · `-5-write`(입력란) · `-5-check` · `-5-options` · `-5-fixed` · `-5-own` · `p11-ai-rest-list` · `p11-wait-hint` · `p11-wait-line` · `p11-wait-timeout-next`. 말하기 `p11-speaking-listening-on` 은 같은 이름(고리 단언 뒤 찍음).

### 차례 6 에 넘기는 것

- 쓰기 서버 공통 꼴: `WritingDeps`(AiDeps + now) · 같은 시도 id 먼저 보기 · 진행 쓰기 세션 · 활동 차례 확인 · 아이 글 없는 로그(`dbErrorTag`) · 안전 상한은 시도 없이 `ai_resting` — `thinkoutStep` · `submitDraft` 가 같은 순서를 쓴다. 가변부는 `levelContextOf`.
- 시도 꼴 thinkout · draft · rewrite 는 이미 있다(값 4 그대로, thinkout 끝은 summary · words · starters · failed · restored 를 모두 선택 칸으로 둠 — 차례 6 이 꼴을 좁혀도 된다). 대기열은 `serverActionOnly` 로 거부한다(늦은 초고 받기는 차례 7).
- 화면: `WaitHint`(생각 꺼내기 · 결과 화면 첨삭 기다림) · `AiRest`(틀 `resting`). 과제 화면은 6~12 가 `GuidedTaskActivity` 를 쓰지 않고 따로(틀 `recorded` 가 쓰기 과제를 guided 만 받음 — 6~12 를 붙일 때 그 조건을 넓힌다).
- 가짜 AI: `fake-ai.ts` 에 `thinkoutReply` · `feedbackReply` 를 더한다(이 차례에는 쓸 시험이 없어 만들지 않음). AC-8d 는 `timeout.spec.ts` 에 더한다.

### 관문 명령 결과(로컬)

```
pnpm biome ci .           → Checked 313 files. No fixes applied.
pnpm test                 → Test Files 53 passed (53) · Tests 500 passed | 6 todo (506)
pnpm exec tsc --noEmit    → exit 0
pnpm build                → ✓ Compiled successfully
pnpm check:deps           → ✔ no dependency violations found (162 modules, 710 dependencies cruised)
pnpm check:ids            → code-setting-unknown 0 · fixture-setting 0 · design-number 35(바탕 그대로, 새 줄 0)
pnpm check:bundle         → 파일 230 · 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0(missing-test 21 → 19 — AC-N6 · AC-N10 생김)
playwright test --list    → 설정 읽힘(가짜 AI 서버 import), 가짜 서버 직접 띄움 · /health · 규칙 없을 때 501 · SIGTERM 종료 확인
```

### 남은 우려

- 통합 · e2e 는 한 번도 돌지 않았다 — 특히 (가) 쓰기 6 · 말하기 10 견본 수업 하나만 넣은 단원에서 `startLessonSession` 판정이 열리는지(통합 '1-가 안전 상한'은 상한을 지운 뒤 열림을 함께 단언), (나) 4 · 5단계 쓰기 화면 두 방향 넘침(`fitsBothWays` 를 쓰기 · 고친 뒤 두 번), (다) 가짜 AI 응답이 실제 금지어 목록(seed/lists) 출력 검사를 지나는지.
- 같은 시도 id 의 '다 썼어요'가 두 요청으로 동시에 서버에 닿으면 AI 가 두 번 불릴 수 있다(저장은 하나 — 먼저 저장된 결과를 돌려줌). 화면은 기다리는 동안 다시 내지 못하게 막는다. 잡기(값 3 (1) 꼴)는 첨삭(차례 6)에만 plan 에 있다.

상태: CI 돌려 달라(로컬 관문 초록).

CI 9차 → 10차(2026-10-22): run 39726243762 e2e 1 실패(`writing.spec.ts` '쓰기 4~5: …' 447줄). **원인 — 시험 결함(앱 맞음):** 가짜 AI 가 받은 사용자 글은 `0. I like the madeba and the modeba.\n1. We can mudeba with {NAME}.\n2. It is very mideba.` 로 문장 셋이 모두 있다. 시험 집의 영어 이름 'Momo'(insertHousehold 기본)가 견본 둘째 문장 끝에 있어 정본 6.1 이름 가림(P9c 가림 함수)이 `{NAME}` 으로 바꿨는데, 시험이 가리기 전 글을 찾았다. **고친 것:** 요청 본문의 messages 에서 문장마다 영어 이름을 `PLACEHOLDER_NAME` 으로 바꾼 글이 있는지 · 영어 이름 글자 그대로는 없는지를 본다(이름 가림까지 선 위에서 지킴). **바뀐 파일:** `tests/e2e/writing.spec.ts`(그 단언 · 가져오기 둘)만 — 화면 변화 없음, 다시 찍히는 사진은 같은 시험의 `p11-writing-4-*` · `p11-writing-5-*`(내용 같음). 로컬: biome ci 0 · tsc 0 · 단위 500 · check:deps 0 · spec:trace exit 0. 커밋 없음(작업 트리).

## 차례 5 fix 5 — 코드 검토 B1 I-1 · M-1~M-3 · 화면 검토 B1 I-1 · M-1~M-6 · Codex 2 · 3(2026-10-22 15:xx)

바탕 HEAD 726198f + 미커밋 차례 5, 커밋 없음. 브리프 `task-p11-fix5.md` 15 항목.

| 번호 · 출처 | 어디를 어떻게 | 선 위 검증 |
|---|---|---|
| 1 코드 I-1 | `src/core/ai/mask.ts:203` `fillNameDeep`(값 안 글마다 `fillName`, 넘긴 값은 그대로 — 차례 6 생각 꺼내기 · 첨삭도 이것을 씀). `src/server/writing/index.ts:83` `outcomeOf` 가 프로필 영어 이름으로 칭찬 · 고칠 곳(원문 · 바른 표현 · 보기 · 이유)을 채운 **뒤** 아이 문장에서 자리를 찾는다(:90). 새 결과 · 같은 시도 id · 같은 활동 끝 시도 · 동시 저장 넷 모두 이 길. 저장하는 ai_feedback 은 가린 글 그대로 | 통합 `writing-check.test.ts` 신규 "쓰기 4~5: AI 칭찬 · 고칠 곳 · 이유의 {NAME} 은 프로필 영어 이름으로 채워 돌려주고 고칠 곳 자리는 채운 글로 찾으며 저장은 가린 글 그대로다"(견본 'We can ___ with Momo.' 에 원문 `… with {NAME}` — 채우지 않으면 자리를 못 찾아 고칠 곳이 사라짐) · 단위 `mask.test.ts` "6.1 화면: AI 결과 값 안의 글마다 {NAME} 을 채우고 꼴 · 수 · 참거짓은 그대로 둔다" |
| 2 코드 M-1 | `src/core/writing/guided.ts:59` `ownRepeatStopOf(판정)` — 쓸 수 없음은 `{ markDevice: true }`, 멈춤 · 말소리 없음은 건너뛰기만. `writing-guided.tsx:591` 이 쓸 수 없음이면 `markMicUnavailable(오류 코드)` 뒤 이 활동만 `no_mic`(막힌 안내 · 알림 없음, 쓰기 세션 안 막음) | 단위 `writing-guided.test.ts` "내 문장 말하기: 마이크를 쓸 수 없음은 기기 상태를 남기고 이 활동만 건너뛰며 멈춤 · 말소리 없음은 건너뛰기만, 그 밖은 그대로다" |
| 3 코드 M-2 · 화면 M-5 | 지난 수업 쪽(단원을 고른 뒤)의 종이 띠를 `PastLessons` 가 그린다(`past/page.tsx` 가 띠 자료 `band` 를 넘김, 단원 고르기 쪽은 그대로 쪽이 그림). 안전 상한 안내 동안은 띠 오른쪽 '수업 목록'을 빼고 안내 + '홈' 하나 | e2e `writing.spec.ts` '1-가 안전 상한: …'에 지난 수업 몫: 단원 1 통과로 두고 `/writing/lessons/past?unit=1` 에서 고르면 안내 · '수업 목록' 링크 0 · '홈' 하나 · 세션 0, 사진 `p11-ai-rest-past` |
| 4 코드 M-3 | **고치지 않음(컨트롤러 결정)** — 아래 '다르게 한 것' | — |
| 5 코드 범위 밖 | `guided.ts:12` `BLANK_TEXT_MAX` 60(기술 상한 — 이름 붙인 대문자 상수), 5단계 입력란 `maxLength` | 단위 "빈칸 글자 상한: 견본 문장 틀의 빈칸을 모두 상한만큼 채워도 쓰기 확인 시도 꼴 상한 안이다"(견본 문장을 두 벌 이어 빈칸 8 개 × 60 자 → `INPUT_JSON_MAX` 안 · 시도 꼴 통과) |
| 6 화면 I-1 | `writing-guided.tsx:344` 5단계(`input === "slot"`)면 과제 줄 아래 '예시'(문구 표 b 행) + 예시문(`content.example`, 24px). 틀이 `example` 을 넘김. 4단계는 그대로 | e2e 쓰기 4~5: 5단계 쓰기 화면에서 `[data-guided-example]` 하나 · 예시문 보임, 4단계 0. 사진 `p11-writing-5-write-*` · `-5-blank-*` |
| 7 화면 M-1 | 입력란 `w-40` → `w-auto min-w-40` + `size`(글 길이 + 1, 최소 `BLANK_INPUT_SIZE_MIN` 8 칸) — 글이 길면 늘어남 | 사진 `p11-writing-5-write-*` |
| 8 화면 M-2 | 빈칸 꼴에 `FOCUS_RING`(누르는 칸), 입력란은 같은 꼴의 `focus:` 판(`INPUT_FOCUS`, :145 — 글 쓰는 칸은 손가락 초점에도 늘 보이게) | 사진(입력란을 `fill` 한 직후 찍어 초점 든 칸이 마지막 칸) |
| 9 화면 M-3 | 과제 화면 단어 상자를 `TileRow`(누르는 칩 꼴) 대신 테 · 그림자 없는 굵은 글 줄(24px, `lang="en"`, :93). 새 동작 없음 | 사진 `p11-writing-4-task-*` |
| 10 화면 M-4 → C86 | `GuidedFix.reason`(서버 :110, 1 의 이름 채움 거침). 바르게 고친 뒤 '잘 고쳤어요!' 아래 `GuideLine` 이유 한 줄(`data-fix-reason`, :516), 고르기 전 · 틀린 보기 뒤에는 없음 | e2e 쓰기 4~5: 색칠 칸 누르기 전 · '다시 골라 볼까요' 뒤 이유 0, 고친 뒤 `FAKE_REASON`. 사진 `p11-writing-*-fixed-*` |
| 11 화면 M-6 | `speaking.tsx:247` 그 줄 `gap-4` → `gap-7`, '한 번 더 말하기' `SpeakButton` 에 `className="-mx-3"`(:252) — 단추 끝이 내용 끝, '다음'과 보이는 간격 28px 그대로 | 사진 `p11-speaking-repeat-close-*` · `-listening-on-*` |
| 12 화면 참고 | 확인 결과가 와도 과제 줄(5단계는 예시문도)을 지우지 않음 · 입력란 · 빈 칸 단추 이름 '문장 n 빈칸 m' | — |
| 13 Codex 2 | `src/lib/attempt-queue.ts:183` `add()` 가 저장 전에 `mergeStates(load(storage), state)` | 단위 `attempt-queue.test.ts` "대기열: 한 기기 저장소를 쓰는 두 쪽(탭)이 끊긴 채 각각 쌓아도 둘 다 남는다"(고치기 전 'b' 만 남아 실패를 봄) |
| 14 Codex 3 | `src/server/placement/index.ts` `screenOf` · `pictureLookup` 첫 매개변수 `DbOrTx`, 답 저장 트랜잭션 안 셋(614 · 673 · 687)이 `tx` | 통합 `placement.test.ts` 신규 "배치 평가: 답 저장 트랜잭션 안의 다음 문항 화면은 그 트랜잭션 연결로 읽어 연결 하나짜리 풀에서도 끝난다"(`createDb(url, { max: 1 })` 로 시작 + 답 셋, 10초 안에 끝나야) |
| 15 화면 '사진 없음' | 사진 셋(+ 3 의 하나) 더함 | `p11-writing-4-blank` · `-5-blank`(채우기 전) · `p11-writing-4-pick-again` · `-5-pick-again`(틀린 보기 ✕ + '다시 골라 볼까요') · `p11-ai-rest-session`(하던 세션을 상한 날 다시 엶 — 안내 · '홈' 단추 하나, 누르면 홈 · 세션 진행) · `p11-ai-rest-past` |

### 시험 수

단위 500 → **504**(+4 — 대기열 여러 탭 · fillNameDeep · 빈칸 상한 · 내 문장 마이크 판정), 파일 53. 통합 +2(writing-check 이름 채움 · placement 연결 하나 풀). e2e 시험 수 그대로(쓰기 4~5 · 안전 상한 e2e 에 단언 · 사진 더함). 빨강 먼저: 대기열 · 내 문장 판정 단위는 구현 전에 실패를 봤다. `fillNameDeep` 은 시험과 함수를 함께 썼다(빨강을 따로 보지 않음). 통합 · e2e 는 CI.

### 다르게 한 것과 까닭

1. **(4, 코드 M-3) 쓰던 글은 기기 입력으로만 되살린다** — plan-p11a 값 4 · plan-p11b 값 7 의 '진행 시도 `writing-guided { sentences }`로 되살림'과 다르다. 글자마다 진행 시도는 대기열을 넘치게 하고 다른 기기에서 이어 쓰기는 드물다(컨트롤러 결정). 시도 꼴은 받게 남겨 두었다.
2. **(6) 5단계 예시문은 확인 결과 단계에도 둔다**(브리프는 write · checking) — 12 와 같은 까닭(결과가 와도 문장 줄이 뛰지 않게). 두 방향 넘침은 e2e `fitsBothWays` 가 쓰기 · 고친 뒤 두 번 본다.
3. **(7) 입력란 늘림은 `field-sizing: content` 가 아니라 `size` 속성으로** — iPad Safari 의 `field-sizing` 지원을 확인하지 못해 모든 브라우저에서 되는 쪽.
4. **(11) 음수 여백을 `speak-button.tsx` 바깥 span 의 `-m-3` 이 아니라 그 줄의 단추에만 `-mx-3` 로** — 공용 조각 기본값을 바꾸면 배치 따라 말하기 · 가운데 놓인 '말하기'의 위아래 간격(12px 씩 줄어듦)도 바뀐다. 가로만 걷어 브리프의 '보이는 간격 그대로 · 가운데 말하기 그대로'를 지킨다.
5. **(2) 쓸 수 없음 기기 상태만 남기고 기기 알림은 남기지 않는다**(검토 '알림까지는 컨트롤러 판단' — 브리프가 기기 상태만 적음).

### 관문(로컬)

```
pnpm biome ci .           → Checked 313 files. No fixes applied.
pnpm test                 → Test Files 53 passed (53) · Tests 504 passed | 6 todo (510)
pnpm exec tsc --noEmit    → exit 0
pnpm build                → ✓ Compiled successfully
pnpm check:deps           → ✔ no dependency violations found (162 modules, 713 dependencies cruised)
pnpm check:ids            → design-number 35(새 줄 0 — BLANK_TEXT_MAX · BLANK_INPUT_SIZE_MIN 은 이름 붙인 대문자 상수)
pnpm check:bundle         → 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0
```

### 남은 우려

- e2e 의 지난 수업 몫은 단원 1 을 통과로 두고 단원 2 에 쓰기 5단계 수업이 없는 집에서 지난 수업 쪽이 열린다고 본다(lesson-list.spec 의 읽기 1단계 꼴을 옮김) — CI 에서 처음 확인.
- 13절 C86(고친 뒤 이유 한 줄)은 컨트롤러가 더한다고 브리프에 적혀 있어 정본 · 문구 표는 손대지 않았다(새 화면 글은 AI 이유뿐, 정본 밖 새 문구 없음).

상태: CI 돌려 달라(로컬 관문 초록).

fix 5b(2026-10-22, CI 11차 run 39731870212 e2e 1 실패 + 코드 재검토 review-p11-fix5-code 새 Minor 2): **(1) 원인 — 앱 쪽 표지 결함(시험 기대는 맞음):** 이유 줄은 그려졌지만 `GuideLine`(`src/components/activities/common.tsx` — children · className 만 받음)에 단 `data-fix-reason` 이 DOM 에 넘어가지 않아 시험이 표지를 못 찾았다. 가짜 응답의 reason · 서버 `outcomeOf` 의 `reason: found.reason`(새 결과 · 저장 결과 같은 길) · 그리는 조건(`fixDone` 이고 reason 이 있을 때)은 맞다. tsc 는 JSX 의 붙임표 속성을 형 검사하지 않아 잡지 못했다. 고침: `src/components/session/writing-guided.tsx:518` 같은 꼴(안내 20px `CHILD_SIZE.guide`)의 `p` 에 표지를 단다. 다른 조각에 `data-*` 를 단 곳은 이것 하나뿐(grep 확인). **(2-가)** 5단계 입력란 `max-w-full`(:406) — 60 자 가까이 써도 문장 줄 너비를 넘지 않음. **(2-나)** `src/server/writing/index.ts:42` `GuidedFix` 머리 주석을 C86(이유는 바르게 고친 뒤에만 보임) · 모범 답안 없음으로 고침. 다시 찍히는 사진: '쓰기 4~5: …' 시험의 `p11-writing-4-*` · `-5-*`(내용 같음 — 이유 줄은 전과 같이 보임). 로컬: biome ci 0 · tsc 0 · 단위 504 · build 0 · check:deps 0 · check:ids design-number 35 · spec:trace 0. 커밋 없음.

fix 5c(2026-10-22, CI 12차 run 39733003650 e2e 1 실패 — '쓰기 4~5: …' `fitsBothWays` 가로 1180 × 820 에서 문서 높이 869, 5단계 고친 뒤 화면): **원인 — 앱 화면 넘침.** fix 5 가 결과 단계에도 둔 과제 줄 · 5단계 예시문(다르게 한 것 2)에 이유 줄이 더해져 한 화면을 넘었다. **고침(컨트롤러 결정 fix 5c):** `src/components/session/writing-guided.tsx` 결과 단계(칭찬 · 고칠 곳 · 보기 · 이유)에서 과제 줄(:342)과 예시문(:343, 브리프 항목 6 의 원래 범위 — 쓰기 · 기다림 동안만)을 숨기고, 문장 목록 간격을 결과 단계만 24 → 8px(:353)로 줄였다. 글자 20 · 24px · 누르는 곳 56px(색칠 칸 · 보기 · '다음')은 그대로. 어림: 과제 줄 + 간격 약 52px · 예시문 + 간격 약 89px · 문장 사이 2 × 16px 로 약 170px 줄어 견본(3문장)은 약 700px, 실시드 4문장(문장 줄 56 + 8px 더함)도 약 760px 로 820 안. 세로(820 × 1180)는 줄기만 함. 결과가 오면 과제 줄이 사라져 문장 줄이 위로 올라가는 것(화면 검토 '참고')은 다시 생긴다 — 한 화면에 드는 쪽을 골랐다(컨트롤러 결정). 다시 찍히는 사진: `p11-writing-4-check` · `-options` · `-pick-again` · `-fixed` 와 `-5-` 같은 넷(결과 단계 꼴이 바뀜). 로컬: biome ci 0 · tsc 0 · 단위 504 · build 0 · check:deps 0 · check:ids design-number 35 · spec:trace 0. 커밋 없음.
