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
