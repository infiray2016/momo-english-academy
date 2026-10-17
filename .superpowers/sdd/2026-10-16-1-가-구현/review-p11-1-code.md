# 코드 검토: P11a 차례 1 — 순수 함수 바탕(검토 묶음 A1) — code-reviewer rev-p11(Opus · xhigh, 2026-10-18 06:3x)

대상: 워크트리 `.claude/worktrees/p11`(브랜치 `feature/1a-p11-session-activities`, HEAD 9b97f4d)의 작업 트리 변경 7 + 새 파일 7. 대조: 구현 브리프 `task-p11-1.md` · 구현 보고 `task-p11-report.md` '차례 1' · plan-p11a(파일별 값 1~4 · 정할 것 다 · 라 · 마 · 차 · 제약 · 증명 표) · 정본 3.3 · 3.4 · 3.7 · 6.2 · 7절 · 12절 · 13절 C38 · C39 · C53 · C76 · C77 · 검토 브리프 '컨트롤러 결정' 셋.
직접 돌린 것: `pnpm check:deps`(위반 0) · `pnpm check:ids`(design-number 38, 새 파일 줄 0 · code-setting-unknown 0 · fixture-setting 0) · 시험 이름 열 개를 plan 증명 표 글자와 기계 대조(열 개 모두 같음). 단위 시험은 다시 돌리지 않았다(구체적 의심이 시험 실행으로 풀리는 것이 없었음).

## 판정: Changes requested — Critical 0 · Important 1 · Minor 5

Important 하나는 컨트롤러 결정 1(건너뛴 시도는 인식 글이 있어도 점수 null · 단어별 정오 없음)을 코드와 시험이 따르지 않는 자리다. 그 밖은 plan 값 1~4 와 3.7 · 7절에 맞는다.

## 1. 설계 준수

| 볼 것 | 판정 | 근거 |
|---|---|---|
| 값 1 활동 모델(영역 · 단계 · 쓰기 두 세션 · thinkout · corrections · 그림 먼저 · presentation · confirm-question · 회화 빈 목록) | ✅ | `src/core/session/preview.ts` 129~171(쓰기 items · guided · composition draft/rewrite, 말하기 picture-task 가 question 앞, confirm-question 은 presentation 있을 때만 수만큼) · 3.3 쓰기 표 33~36행 · 말하기 표 63~74행과 같은 차례 |
| 시험용 시드 1단계 세 영역 차례 번호 = P10 | ✅ | `tests/unit/session-preview.test.ts:285` — P10 차례를 시험 안에서 따로 세운 기대값과 맞대고 두 인자 꼴도 같음을 단언. 시드에 그림 칸이 생기면 이 시험이 깨지므로 위험 3 을 지킨다 |
| 두 인자 꼴은 차례 2 에서 지울 임시인가 | ✅ | `preview.ts:186` 주석 · 보고 '차례 2 에 넘기는 것' 셋째 줄. `level: 0` 은 차례를 정하는 데 쓰이지 않음 |
| 값 2 시도 꼴(Zod 판별 합 · strict · P10 꼬리표 없는 미리보기) | ✅ | `src/core/session/attempt.ts` 48~98. P10 이 보내는 꼴은 `session-frame.tsx:245` 의 `{ shownWords }` 하나뿐이라 `LegacyPreviewSchema` 로 다 읽힘. 글자 수 재기는 P10 서버(`src/server/session/index.ts:87`)와 같은 `JSON.stringify(...).length` |
| 값 2 앱 채점(첫 시도 · 가장 높은 일치율 · 1~2단계 질문 답) | ✅ / ❌ | 첫 시도 · 가장 높은 일치율 · `appJudgedQuestions` 는 맞음. **건너뜀 처리는 ❌**(지적 I-1) |
| 값 2 단어별 정오(C76 · 정할 것 라) | ✅(Minor 하나) | 그림 문항 정답 보기 · pick-word picture · 타일 · 받아쓰기 word · 조립 첫 허용 정답 · 따라 말하기 정렬 · 질문 답 가장 가까운 허용 답, 글 보기 이해 · AI 판정 단계는 안 냄(`attempt.ts` 262~352). 하이픈 · 따옴표 든 단원 단어를 못 찾는 틈(M-1) |
| `resumePointOf` · `ATTEMPTS_PER_BATCH_MAX` · `INPUT_JSON_MAX` | ✅ | `attempt.ts` 19 · 21 · 111~133. 진행 시도 · 꼴 틀린 시도는 끝으로 안 셈 |
| 값 3 `sessionScoreOf`(3.7 표 · null 규칙 · 반올림 없음) | ✅ | `src/core/scoring/score.ts` 69~116 — Q 없으면 a = 1, R 없으면 a = 0, Lr 없으면 L = 0, R · Q 둘 다 없으면 null, 9~12 는 발표 · 확인 질문 평균이 없으면 null, 쓰기 4~5 확인 실패 null, 6~12 첨삭 전 · 둘째 세션 null, 회화 null. 영역별 입력은 3.7 과 같은 결과를 내고 차례 2 서버가 가진 값(영역 · 꼴 · `writing_part`)으로 채울 수 있음 |
| 값 4 말하기 판정 | ✅ | `src/core/speaking/judge.ts` — 결과 말 경계 ≥(41~43, 4절 · C39 문구 그대로 27~31), 허용 답 여럿 → 가장 높은 일치율(57~70), 답 꼴(87~102), 인식 셈(168~241: 활동 실패 max_retries → 건너뜀 · audio-capture 같은 활동 3 연속 · 세션 max_retries × 2 · no-speech 는 여섯 번에 안 셈 · silent_items_max · network 안 셈 · stalled 는 P2b 가 한 번 다시 시작한 뒤에만 냄 — `src/core/speech/listen.ts:357~358`), `englishSentencesOf`(275~290) |
| 컨트롤러 결정 1 | ❌ | 지적 I-1 |
| 컨트롤러 결정 2 · 3 | ✅(증명 Minor) | 성공이 활동 실패 수를 지우지 않음(`judge.ts:214~225`) · 다시 듣기 갈래 코드가 '여섯 번'에 듦(`judge.ts:237~238`, `listen.ts:133~137`) · 정할 것 3 세부(`attempt.ts` 208~260 · `judge.ts:67~68`). 결정 2 는 시험이 없음(M-3) |
| 시험 이름(plan 증명 표 글자 그대로) | ✅ | AC-4a 1 · AC-6c 4 · AC-5f 2 · '세션 바탕:' · '단어별 정오:' · '영어로 말한 문장 수:' 열 개 모두 같음(기계 대조). 다른 AC 를 지어 붙인 사례 없음 |
| 시험 숫자는 `TEST_SETTINGS` | ✅(Minor 하나) | a · L · 기준 · 경계 · max_retries · silent_items_max 는 설정에서 읽음. 입력 칸 `failures: 3` 두 곳(M-4) |
| 제약(core 의존 · 설계 숫자 · 오류 글 · 용어 · 꿰맞춤 · repeat.tsx) | ✅ | check:deps 0 · design-number 38(새 줄 없음). 새 상수는 파일 위 대문자(C72 꼴 — `RUBRIC_MAX` · `MIC_STALL_RETRY_MULTIPLE` · `INPUT_VERSION`). 던지는 글에 시도 입력 · 인식 글이 없음(`attempt.ts` 186~198 · 366~367 은 종류 · 번호만). 트랙 · 유닛 · console 없음. `session-frame.tsx` 는 없어진 두 갈래 · `default` 만 바꿈. `repeat.tsx:15` 가 core 에서 가져오고 다른 가져오는 곳 없음 |
| 빨강 먼저 | ⚠️ | diff 로는 확인 못 함. 보고 40줄(새 파일 셋 모듈 없음 · 활동 차례 다섯 · 낱말별 맞춤 둘 실패 · AC-4a 는 바탕 `checkAnswer` 라 처음부터 초록)을 받는다 |

## 2. 잘한 점

- **3.7 을 영역별 판별 합으로 옮긴 것이 표와 1:1 이다.** `speakingScore` 하나가 a · L 의 세 가지 비우기 규칙(Q 없음 a = 1 · R 없음 a = 0 · Lr 없음 L = 0)과 9~12 길을 함께 다루고, 시험(`tests/unit/score.test.ts`)은 기대값을 3.7 식으로 시험 안에서 다시 세어 맞댄다. 구현을 베낀 기대값이 아니다.
- **P10 차례와 같음을 '독립 기대값'으로 증명했다.** `session-preview.test.ts:285` 는 시험용 시드 모든 1단계 수업을 돌며 P10 차례를 따로 세운 목록과 맞대고, 두 인자 꼴과 새 꼴이 같음도 본다. 시드가 바뀌어 차례 번호가 어긋나면 바로 깨진다.
- **`matchedTargetWords` 가 기존 일치율과 같은 정렬 규칙임을 수로 묶었다.** 길이 같은 정렬이 둘인 문장에서는 낱말별 기대값을 지어내지 않고 '맞은 수 ÷ 낱말 수 = matchRate' 로만 본다(`tests/unit/match-rate.test.ts` 낱말별 맞춤 첫 사례). 보고 40줄의 판단이 옳다. 동음이의어로 맞아도 목표에 적힌 꼴을 돌려주는 것까지 시험했다.
- **인식 셈의 갈래 순서가 7절 문장 순서와 맞는다.** 같은 활동 audio-capture 3 연속이 건너뜀보다 먼저(`judge.ts:181`), '여섯 번'이 다시 듣기보다 먼저(183)라 기본 설정(3)에서 7절이 말하는 안내가 가려지지 않는다. `stalled` 를 바로 '마이크가 멈춤'으로 보는 것은 P2b 가 한 번 다시 시작한 뒤에만 그 결과를 내기 때문이라는 것도 확인했다.
- **서버 · 대기열 몫을 보고에 이름과 꼴로 넘겼다.** `appActivityResult` 가 종류가 다르면 던지므로 `inputFitsActivity` 를 먼저 부르라는 것까지 적혀 차례 2 가 그대로 쓸 수 있다.

## 3. 지적

### Important

**I-1. 건너뛴 시도(`skipped` 있음)에 인식 글이 있으면 점수 · 단어별 정오를 낸다 — 컨트롤러 결정 1 · plan 값 2 · 7절과 다름**
- 무엇이: `src/core/session/attempt.ts` 의 `appActivityResult` 따라 말하기 갈래(398~413)와 질문 답 갈래(414~418)가 `input.skipped` 를 보지 않는다. `repeatResult`(305~329)는 인식 글이 하나도 없을 때만 null(312)이고, `questionResult`(331~352)는 첫 인식 글이 없을 때만 null(341)이다. 그래서 인식 글이 있는 건너뜀은 점수와 단어별 정오가 나온다.
- 왜: plan 값 2 '`repeat-*` … 건너뛰었으면 null(7절 '점수에서 뺀다')', 7절 오류 행 '그래도 안 되면 말하기 세션은 그 문항을 건너뛰고 점수에서 뺀다', 검토 브리프 컨트롤러 결정 1. 성공(≥ 위 경계)이면 저절로 넘어가므로 인식 글 있는 건너뜀의 가장 높은 일치율은 늘 위 경계 아래다. 넣으면 세션 점수가 내려간다. 질문 답에서는 첫 답이 틀린 뒤 '같이 말해 볼까요'에서 실패가 쌓여 건너뛰면 점수 0 과 단원 단어 '틀림'이 남는다. 그 틀림은 3.4 '틀린 단어는 다음 복습일을 다음 학습일로 당긴다'로 복습일을 당긴다. 결정 2(성공이 활동 실패 수를 지우지 않음)를 받았으므로 이 경우는 실제로 생긴다.
- 시험도 같은 해석이다: `tests/unit/session-attempt.test.ts:276` 이름 '인식 글 없이 건너뛰었으면 점수가 없다'와 294~305 · 326 은 인식 글이 빈 건너뜀만 본다.
- 어떻게: `appActivityResult` 의 `repeat-*` · `question` 갈래에서 `input.skipped !== undefined` 면 `{ score: null, wordResults: [], wordCount }` 를 돌려준다. 단어 수는 지금처럼 인식 글 낱말 수의 합으로 두고, 영어로 말한 문장 수(`englishSentencesOf`)도 지금처럼 인식 글 수대로 센다(결정 1 끝 문장). 시험은 276 · 308 이름에서 '인식 글 없이'를 빼고, `heard: [반쯤 맞은 글]` + `skipped: "recognition"` 사례(따라 말하기 · 질문 답 각각)에서 점수 null · 단어별 정오 `[]` · 단어 수는 낱말 수임을 단언한다. `speaking-judge.test.ts` 의 문장 수 사례에 인식 글 있는 건너뜀 하나를 더해 그것도 센다는 것을 보이면 결정 1 전부가 증명된다.

### Minor

**M-1. 하이픈 · 따옴표가 든 단원 단어는 따라 말하기 · 조립 · 질문 답의 단어별 정오에서 빠진다**
- 무엇이: `unitWordSpans`(`attempt.ts` 221~238)는 정규화한 낱말 줄(`normalizeForMatch` — 하이픈은 빈칸, 따옴표는 지움)을 이어 붙인 글을 `unitWordOf`(208~218)로 단원 단어의 **원래 꼴**과 견준다. 'yo-yo' 는 정규화 뒤 'yo yo', "o'clock" 은 'oclock' 이라 원래 꼴과도 vocab forms(각 `['yo-yos']` · `[]`)와도 맞지 않는다. 쓰기 낱말 문항(`wordOfItem`)은 원래 꼴로 견주므로 괜찮다.
- 왜: C76 은 따라 말하기 정렬 · 조립 · 1~2단계 질문 답에서 단원 단어의 정오를 내라고 한다. `seed/vocab.json` 1,920개 가운데 둘이고, 'yo-yo' 는 1단계 낱말이다. 빠지는 쪽이라 아이에게 불리하지는 않지만 그 낱말은 이 세 길에서 늘 정오가 없다.
- 어떻게: 단원 단어 쪽도 같은 정규화로 견준다 — 예: `unitWordOf` 의 견줌에 `normalizeForMatch(w, []).join(" ") === surface` 를 더하거나, `unitWordSpans` 가 단원 단어마다 정규화 꼴을 미리 만들어 견준다. `lemmaLookup` 도 forms 를 같은 꼴로 넣으면 'yo-yos' 가 맞는다. 시험에 'yo-yo' 든 따라 말하기 사례 하나.

**M-2. 허용 답 기준 경계(일치율 = speaking.answer_match_pass)를 지나는 사례가 없다**
- 무엇이: `tests/unit/speaking-judge.test.ts` 53~96 의 AC-5f 첫 사례는 일치율 1 · 0 근처만 지나고, 75~76 의 기대값은 구현과 같은 `bestMatchRate` 로 다시 센 값이다. 경계 바로 위 · 아래 사례가 없다.
- 왜: AC-5f 이름이 '일치율이 speaking.answer_match_pass 이상이면 맞음'이다. 검토 브리프 볼 것 6 '경계값 사례가 있나'. 결과 말 경계는 106~107 에서 봤는데 이 기준은 안 봤다.
- 어떻게: 낱말 n 개 허용 답과 그 가운데 k 개만 차례대로 말한 인식 글을 `PASS` 에서 만들어(k/n 이 PASS 와 같은 n · k, 그리고 k − 1) 앞은 `correct: true`, 뒤는 `false` 를 단언한다.

**M-3. 컨트롤러 결정 2 의 두 동작을 증명하는 사례가 없다**
- 무엇이: `speaking-judge.test.ts` 143~263 에 (가) 들은 뒤의 실패가 그 활동의 실패 수에 이어 쌓여 건너뜀이 되는 것(`judge.ts:214~225` 가 `activityFailures` 를 안 지움), (나) start-failed · 모르는 코드 · phrases-not-supported · bad-grammar 가 다시 듣기이고 '여섯 번'에 드는 것(`judge.ts:237~238`)을 보는 사례가 없다.
- 왜: 검토 브리프 컨트롤러 결정 2 를 받았으므로 그 동작이 시험으로 묶여야 차례 4 화면이 바꿔도 드러난다. (가)는 I-1 의 경우가 생기는 길이기도 하다.
- 어떻게: (가) `heard` 한 번 뒤 `aborted` × max_retries → 마지막 판정 `skip`, (나) `start-failed` · 지어낸 코드로 max_retries × 2 → `mic-stalled`.

**M-4. 시험 몇 곳이 설정 숫자를 박거나 거의 단언하지 않는다**
- 무엇이: `tests/unit/session-attempt.test.ts:133` · `:504` 의 `failures: 3`(같은 파일 299 는 `TEST_SETTINGS["speech.max_retries"]` 를 씀), `:171` 의 `expect(ATTEMPTS_PER_BATCH_MAX).toBeGreaterThan(0)`(상수가 있다는 것만 봄), `tests/unit/session-preview.test.ts:246` 이름은 '말하기 6 · 8단계'인데 6단계만 본다(견본 빌더에 말하기 8단계가 없음).
- 왜: plan 작업 순서 첫 문단 '시험의 설계 숫자는 TEST_SETTINGS 에서 읽는다'. 이름이 증명하지 않는 단계를 말하면 읽는 사람이 8단계도 본 것으로 안다.
- 어떻게: `failures` 는 설정에서 읽고, 171 은 지우거나 차례 2 '대기열: 50개씩 …' 시험에 맡긴다. 246 은 이름을 '6단계'로 하거나 6단계 내용에 질문 · 그림 칸이 같은 8단계 꼴을 지어 한 번 더 본다.

**M-5. 꿰맞춤의 React key 가 문장 틀 글이다**
- 무엇이: `src/app/(child)/session/[id]/session-frame.tsx:131` `key={sentence.frame}`. 4단계는 같은 틀('I like ___.' 같은)이 한 수업에 두 번 나올 수 있다.
- 왜: 키가 겹치면 React 가 경고하고 같은 키의 조각을 하나로 다룬다. 시험용 시드에는 4단계가 없어 프리뷰 영향은 없다.
- 어떻게: 차례 2 가 틀을 다시 쓸 때 사라지면 닫힘. 그 전에 손대면 번호를 키로.

## 4. 판정

**Changes requested.** I-1 하나를 고치면 Approved 로 본다(값 2 · 7절 · 결정 1). M-1~M-5 는 같은 fix 라운드에서 함께 고치기를 권하지만 막는 것은 아니다. 차례 1 에 걸린 열린 장부 항목은 없다.

범위 밖 관찰(지적 아님): 7절 오류 행은 '최대 3회(speech.max_retries) 다시 듣는다', 12절은 '인식 오류 때 다시 듣는 횟수'라 적었고, 구현은 plan 값 4 와 P10 배치(`src/components/answer/repeat.tsx:99`)처럼 '실패 수가 max_retries 에 닿으면 건너뜀'(처음 듣기 + 다시 듣기 둘)이다. plan · 배치와 같으므로 이 묶음의 결함은 아니다. 글자 그대로 읽으면 다시 듣기가 셋이라, 정본 글과 맞출지는 컨트롤러 판단이다.
