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
