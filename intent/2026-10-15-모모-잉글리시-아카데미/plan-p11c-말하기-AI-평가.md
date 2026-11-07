# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P11c 말하기 AI 평가(질문 답 · 그림 보고 말하기 · 발표 · 확인 질문)

spec: `specs/` 정본(3.3 말하기 문단과 표 3~12 행, 3.7 말하기 1~8 · 9~12 행 · 'AI 호출 실패나 AI 쉬는 중으로 AI 평가를 못 한 말하기 세션' 행, 4절 말하기 세션 행(판정 글자 없음 · '같이 말해 볼까요' · 문법 지적 4단계부터 한 줄 · 9~12 생각 화면 · 발표 뒤 피드백 · 확인 질문) · 첫 문단(기다림 표시), 6.1 말하기 평가 고정부(인식 오류로 보이는 부분은 근거로 쓰지 않음) · 정규화(3단계 문법 지적 지움 · 확인 질문 수), 6.2 말하기 평가 행, 7절 듣기를 끝내는 때(두 문장 이상 · '다 말했어요' · 활동 시간 상한), 8절 'AI 쉬는 중' 동안(말하기 3~8 예외) · AI 호출 하나의 실패(말하기 평가), 12절 speaking.* · speech.*, 13절 C27 · C37 · C38 · C39 · C47 · C53 (3) · C67 (5) · 2026-10-16 '말하기 9~12단계 발표 세부' 행, 15절 AC-2c(말하기 평가 몫) · 5b(6 · 10단계) · 5d(화면 몫) · 5e(6단계) · 5f(3단계) · 5g(화면 몫) · 8b(말하기 몫), approved 2026-10-16 06:2x) · 묶음 plan P11 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-18 · 상태: approved(컨트롤러 2026-10-18 04:1x — 요청자 묶음 plan 승인 2026-10-16 아래, P10 하위 plan 과 같은 꼴)
승인: 컨트롤러 2026-10-18 04:1x(정할 것 갑~정 모두 권함대로 — 13절 줄 없음. 기대는 결정: C77 (5) · (7) 질문 답 '다음' · 그림 먼저 · 피드백 줄, C78 정본 밖 문구, C80 1-가 안전 상한, C81 가짜 AI, a · b 몫 C76 · C79) · 브랜치 · 워크트리: `feature/1a-p11-session-activities`(a · b 와 같은 브랜치 · 워크트리 p11) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P11 의 셋째 묶음이다. 짝은 `plan-p11a-세션-바탕-앱-채점.md`(함께 쓰는 사실 — 나눈 까닭 · 가정 · 화면을 보는 차례 · 바탕 가지 · 활동 모델 · 시도 꼴 · 정본 밖 문구 · 정할 것 가~카 · 확인한 사실)와 `plan-p11b-쓰기-AI-첨삭.md`(AI 길 — 가변부 재료 · 1-가 안전 상한 · 기다림 표시 · 가짜 AI e2e)다. 이 plan 의 작업은 a '화면을 보는 차례'의 차례 8 · 9 · 10 이다. b 차례 5 가 끝난 뒤 시작한다(AI 길을 같이 씀).
정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다.

## 목표 (Goal)

- **말하기 3~8 질문 답(차례 8).** 영어 질문을 읽어 준 뒤 1~4단계는 아래에 한국어 뜻(C39). '말하기' → 한 문장 답(3~4단계)은 조용함으로, 두 문장 이상 답(5~8단계 — level_specs `questions.answerSentences.max ≥ 2`, 7절 '5단계부터의 질문 답')은 '다 말했어요' 단추나 speaking.answer_max_seconds.<구간> 으로 듣기를 끝낸다(C37 · C53 (3)). 서버 액션이 말하기 평가(P9c `evaluateSpeaking` mode answer)를 부른다. 판정(맞음 · 부분 · 다시)은 글자로 보이지 않는다(AC-5d). 맞음이면 '잘 말했어요', 부분 · 다시면 바른 답 문장(AI 의 `correctSentence`, 걸리면 시드 바른 답)을 영어 줄로 보이며 들려주고 '같이 말해 볼까요' → 한 번 말하면 결과 말 없이 다음. 칭찬 또는 내용 피드백 한 문장과 4~8단계 문법 지적 한 줄을 보인다(3단계 문법 지적은 정규화가 지움 — 6.2 · P9b). 점수 = 맞음 1 · 부분 0.5 · 다시 0(3.7).
- **그림 보고 말하기(6 · 8단계, 차례 8).** 질문보다 먼저(a 정할 것 마). 그림 카탈로그의 단어 그림 2~3장(8단계는 차례가 있는 3장)을 늘어놓고(C27) 두 문장 이상 답으로 듣는다. 말하기 평가 요청에 시드의 영어 장면 설명(`pictureTask.scene`)을 넣는다(AC-5g). 판정 · 점수는 질문 답과 같다.
- **말하기 9~12 발표 · 확인 질문(차례 9).** 듣기 이해 뒤 생각 화면(주제 · 쓸 말 세 개 · speaking.prepare_seconds(30초) 남은 초 — '말하기'로 먼저 끝냄) → 발표(두 문장 이상 답, 상한 speaking.answer_max_seconds.<구간>) → 말하기 평가(mode presentation: 내용 · 문법 점수 각 1~4 · 피드백 한 문장 · 확인 질문 level_specs `presentation.confirmQuestions`(3)개 — 못 내면 시드 예비 확인 질문, C47) → 피드백 한 문장을 보이고 첫 확인 질문을 읽어 줌 → 확인 질문마다 답(두 문장 이상) → 평가(mode confirm) → 피드백 한 문장. 내용 · 문법 점수는 아이 화면에 없다(부모 화면 — 1-나). 활동 점수 = (내용 + 문법) ÷ 2 ÷ 4, 세션 점수 = (1 − L) × AI 평가 활동 평균 + L × 듣기 정답률(3.7).
- **실패 · 안전 상한.** 말하기 평가가 실패하면 판정 없이 다음 문항으로 가고 그 활동은 점수에서 뺀다(8절). 발표 평가가 실패하면 시드 예비 확인 질문으로 확인 질문 차례를 그대로 한다(그 답의 평가는 AI 가 되면 함). 3~8단계 세션에서 1-가 하루 안전 상한에 닿으면 남은 질문 답 · 그림 보고 말하기를 건너뛰고 세션을 끝까지 한다(8절 '동안'의 예외 · a = 1, b 정할 것 ㄴ). 9~12단계는 시작하지 않고(b 값 9), 도중이면 안내 + '홈'(세션 진행).
- **다시 하기도 같다(AC-2c).** 다시 하기 세션에서도 말하기 평가 호출은 새 수업과 같이 나가고 점수는 sessions 에 남는다(최근 성적에서 빼는 일은 P12).
- 경계: 따라 말하기 · 듣기 · 1~2단계 질문 답 · 마이크 안내는 a. 가변부 재료 · 기다림 표시 · 안전 상한 판정 · 가짜 AI e2e 는 b. 단계 평가의 말하기 과제 · 발표 문항(확인 질문 없음)은 P12.

## 바뀌는 파일 (Files that change)

손 파일 열넷(새 넷 · 고침 열).

| 파일 | 신규 / 수정 | 무엇을 | 묶음 · 차례 |
|---|---|---|---|
| `src/server/speaking/index.ts` | 신규 | `server-only`. 말하기 평가 서버 함수(값 1) | C1 · 8 · C2 · 9 |
| `src/server/actions/speaking.ts` | 신규 | `'use server'`. `evaluateSpeakingAnswer` · `evaluatePresentation` · `evaluateConfirmAnswer`. 첫 문장 `await requireAccess()` | C1 · 8 · C2 · 9 |
| `src/core/speaking/judge.ts` | 수정 | AI 판정 → 점수 · 발표 점수 · 안전 상한 뒤 건너뛸 활동(값 2) | C1 · 8 |
| `src/core/session/attempt.ts` | 수정 | c 의 시도 종류(값 3) | C1 · 8 · C2 · 9 |
| `src/components/session/speaking.tsx` | 수정 | 질문 답 AI 판정 길 · 그림 보고 말하기(값 4) | C1 · 8 |
| `src/components/session/presentation.tsx` | 신규 | 'use client'. 생각 화면 · 발표 · 확인 질문(값 4) | C2 · 9 |
| `src/server/session/index.ts` | 수정 | 화면 자료(그림 · 확인 질문 · 발표 시간 · 판정 길) · 대기열이 AI 종류의 건너뜀 끝 시도만 받음 | C1 · 8 · C2 · 9 |
| `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | c 활동 조각 · 안전 상한 뒤 건너뛰기 | C1 · 8 · C2 · 9 |
| `tests/unit/speaking-judge.test.ts` | 수정 | AI 판정 점수 · 발표 점수 · 건너뛸 활동 | C1 · 8 |
| `tests/unit/session-attempt.test.ts` | 수정 | c 종류 | C1 · 8 |
| `tests/integration/speaking-eval.test.ts` | 신규 | 서버 저장 · 점수 · 실패 · 안전 상한 · 예비 확인 질문 · 같은 시도 id | C1 · 8 · C2 · 9 |
| `tests/integration/retry.test.ts` | 수정 | AC-2c 말하기 평가 몫 | C1 · 8 |
| `tests/e2e/speaking.spec.ts` | 수정 | AC-5b 6 · 10 · 5d · 5e 6 · 5f 3 · 5g · 8b | C1 · 8 · C2 · 9 |
| `tests/e2e/font-size.spec.ts` | 수정 | AC-N9 — P11 세 plan 의 화면 전부(a 공용 변경 3) | 마무리 · 10 |

### 파일별 값(구현자가 옮겨 쓸 것)

1. **말하기 평가 서버 함수(`src/server/speaking/index.ts`).** 모두 `deps?: AiDeps` 를 받는다(시험이 가짜 클라이언트). 공통: 그 프로필의 진행 세션 · 그 활동 차례의 종류인지 확인, 같은 `clientAttemptId` 시도가 있으면 저장된 결과를 돌려줌(AI 를 두 번 부르지 않음), 가변부 재료는 b `levelContextOf`, 단계 규칙은 P9b `speakingRulesOf(그 단계 level_specs)`, 아이 글 · AI 글을 로그에 내지 않음(`safeDbError`).
   - `evaluateAnswer({ sessionId, clientAttemptId, activityNo, transcript })`(질문 답 · 그림 보고 말하기): `evaluateSpeaking({ mode: "answer", question, scene, transcript, grammarNoteMax, seedCorrectAnswer, ...LevelContext }, { profileId, sessionId, level })`. 질문 답이면 `question = 질문.en` · `scene = null` · `seedCorrectAnswer = 질문.modelAnswer ?? null`(1~3단계에 있음), 그림 보고 말하기면 `question = pictureTask.prompt ?? PICTURE_TASK_PROMPT`(정할 것 갑) · `scene = pictureTask.scene`(AC-5g) · `seedCorrectAnswer = null`. ok → 끝 시도 `{ input: { v: 1, kind, step: "final", transcript }, ai_feedback: { state: "ok", value }, score: 값 2, word_count, status: "done" }` · 돌려줌 `{ ok: true, judgement, feedback, correctSentence, grammarNote? }`(판정은 화면이 '잘 말했어요' · 바른 답 들려주기를 고르는 데만 씀 — 글자로 그리지 않음). 실패 → 끝 시도 `{ ai_feedback: { state: "failed", reason }, score: null }` · `{ ok: false, reason: "skipped" }`. `safety_cap` → 시도 없이 `{ ok: false, reason: "ai_resting" }`.
   - `evaluatePresentation({ sessionId, clientAttemptId, activityNo, transcript, prepEndedEarly })`: `evaluateSpeaking({ mode: "presentation", topic, prepWords, transcript, confirmQuestionCount, spareConfirmQuestions: presentation.fallbackQuestions, withConfirmQuestions: true, ...LevelContext }, ctx)`. ok → 끝 시도(점수 값 2) · 돌려줌 `{ ok: true, feedback, confirmQuestions }`(정규화가 수를 맞추고 걸린 질문은 같은 차례 예비 질문 — P9b). 실패 → 끝 시도(점수 null) · `{ ok: false, reason: "skipped", confirmQuestions: fallbackQuestions 앞 confirmQuestionCount 개 }`(정할 것 을). `safety_cap` → `ai_resting`.
   - `evaluateConfirm({ sessionId, clientAttemptId, activityNo, question, transcript })`: `evaluateSpeaking({ mode: "confirm", presentationTranscript: 그 세션 발표 끝 시도의 transcript, question, transcript, ...LevelContext }, ctx)`. ok → 끝 시도(점수 값 2) · `{ ok: true, feedback }`. 실패 · `safety_cap` 은 위와 같은 꼴.
2. **판정 · 점수(`src/core/speaking/judge.ts`, a 값 4 에 더함).** `aiAnswerScore(judgement)`: `correct` 1 · `partial` 0.5 · `retry` 0(P9 `SPEAKING_JUDGEMENTS`). `presentationScore({ contentScore, grammarScore })` = (내용 + 문법) ÷ 2 ÷ 4(P9 `AI_SCORE` 1~4). `skipAfterAiRest(activities, from)` → `from` 부터 남은 `question` · `picture-task` 의 차례 번호(3~8단계 — 그 단계 `questions.acceptedMin === 0` 이고 발표가 없는 세션). 3.7 세션 점수는 a `sessionScoreOf` 가 이미 낸다(Q 가 비면 a = 1, 발표 세션 E 가 비면 null).
3. **c 의 시도 종류(`src/core/session/attempt.ts`).** `question`(AI 판정 단계) · `picture-task` · `presentation` · `confirm-question` 끝은 서버 액션이 저장한다. 대기열 길(`saveSessionAttempts`)은 이 넷의 끝 시도를 **AI 결과 없이 건너뛸 때만** 받는다 — `{ kind, step: "final", skipped: "ai_rest" | "recognition" | "no_mic" | "silent" | "stalled" }`(점수 null). '같이 말해 볼까요' 뒤 말은 진행 시도 `{ kind: "question-echo", step: "progress", activityNo, heard }`(대기열 — 영어로 말한 문장 수에만 셈). 생각 화면을 먼저 끝냈는지는 발표 끝 시도의 `prepEndedEarly`(기록만).
4. **화면 조각(`speaking.tsx` · `presentation.tsx`).**
   - 질문 답(AI): a 질문 조각과 같은 화면(영어 질문 · 읽어 주기 · 1~4단계 뜻)에서 판정만 서버로. 듣는 동안 두 문장 이상이면 말하기 단추 글자가 '다 말했어요'이고 둘레에 남은 시간(P2b `capAt`)이 줄어든다(7절 · C37). 서버를 기다리는 동안 b `WaitHint`. 결과: 맞음 → '잘 말했어요' + 피드백 한 줄 + (4~8단계) 문법 지적 한 줄 + '다음'. 부분 · 다시 → 피드백 · 문법 지적 줄 + 바른 답 문장(영어 24px)을 들려주고 '같이 말해 볼까요' → 한 번 말하면(인식 실패는 a 셈 안에서) 결과 말 없이 다음. 바른 답 · 피드백이 걸린 칸 바꾸기로 비면 보이지 않고 들려주지 않는다(장부 P11 행). `skipped` → 아무 판정 없이 다음(점수에서 뺌). `ai_resting` → 3~8단계는 값 2 `skipAfterAiRest` 의 활동을 건너뜀 끝 시도로 대기열에 넣고 다음 남은 활동(따라 말하기 · 듣기가 끝났으면 끝내기)으로.
   - 그림 보고 말하기: 그림 줄(그림 키 → a 화면 자료의 그림 정보, 8단계는 차례대로 왼쪽부터 · 번호 작게) + '그림을 보고 말해 봐요'(정본 밖) + 시드 `prompt` 가 있으면 영어 줄로 읽어 줌 → 두 문장 이상 답 → 위와 같은 결과 길.
   - 생각 화면(`presentation.tsx`): 주제(한글이면 안내 글, 영어면 영어 줄) · '쓸 말'(글 칩 셋 — 누르는 꼴 아님, review-p05b-design M-4) · '생각하는 시간이에요' · 남은 '<n>초'(speaking.prepare_seconds 에서 셈) · 큰 '말하기'. '말하기'를 누르면 생각 시간을 끝내고 바로 듣기(3.3). 시간이 다 되면 '말하기'만 남기고 기다림(iOS 는 누름 없이 인식을 시작하지 않을 수 있어 저절로 듣지 않음, 정할 것 병). 발표 안내 '<시간>쯤 말해 봐요'(level_specs `presentation.seconds` 를 '45초' · '1분' · '1분 30초' · '2분' 꼴로 — 상한이 아니라 목표, 정본 밖) → 듣기(두 문장 이상, 상한 speaking.answer_max_seconds.<구간>) → `WaitHint` → 피드백 한 문장 + 첫 확인 질문(영어 줄)을 읽어 줌.
   - 확인 질문(`confirm-question`): 질문(영어 줄, 들어올 때 읽음 · '다시 듣기') → 두 문장 이상 답 → `WaitHint` → 피드백 한 문장 → '다음'. 점수 · 판정 글자 없음.
   - 화면 자료(`loadSessionView` 에 더함): 그림 보고 말하기 그림 정보(P10 `keyPictures`), `presentation.seconds`, 확인 질문(그 세션 발표 끝 시도가 있으면 그 값의 `confirmQuestions`, 실패였으면 예비 질문 — 다시 열어도 같은 질문), 판정 길(`appJudged` — a 값 5).

## 작업 순서 (Order of work)

명령 꼴 · 시험 먼저 · 설정 숫자는 a 작업 순서 머리와 같다. 차례 번호는 a '화면을 보는 차례'다.

1. (차례 8) [검증][서버][화면] `tests/unit/{speaking-judge,session-attempt}.test.ts` · `tests/integration/{speaking-eval,retry}.test.ts` → `src/core/speaking/judge.ts` · `src/core/session/attempt.ts` · `src/server/speaking/index.ts`(질문 답 · 그림) · `src/server/actions/speaking.ts` · `speaking.tsx` · 세션 서버 · 틀 → `tests/e2e/speaking.spec.ts`(AC-5b 6 · 5d · 5e 6 · 5f 3 · 5g · 8b). e2e 수업은 a 값 10(`speakingLesson(ref, 6)` · 1단계 복제 3단계). 완료: 통합 · e2e 초록(CI), 검토 묶음 C1 → code-reviewer · design-reviewer(B_Speaking 과 4절 말하기 행). **볼 수 있는 화면(e2e 사진): AI 판정 질문 답('잘 말했어요' · '같이 말해 볼까요') · 그림 보고 말하기.**
2. (차례 9) [서버][화면] `speaking-eval.test.ts`(발표 · 확인 질문 · 예비 · 9~12 점수) → 서버 함수 · 액션(발표 · 확인) · `presentation.tsx` · 세션 서버 · 틀 → `speaking.spec.ts`(AC-5b 10). 완료: 검토 묶음 C2(정할 것 정 — C1 과 합칠 수 있음) → code · design. **볼 수 있는 화면(e2e 사진): 생각 화면 → 발표 → 확인 질문 셋.**
3. (차례 10) [검증] 마무리: `tests/e2e/font-size.spec.ts`(AC-N9 — a · b · c 화면 전부, P10 `child-size.ts`) → CI 순서 명령 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm e2e` → `pnpm e2e:local` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle` → `pnpm check:ids`(P7b), 비밀값 grep 0 → 화면 검토 다시(읽기 · 쓰기 · 말하기 1단계 세션을 처음부터 결과까지, 세로 820 · 가로 1180). 완료: 출력이 보고에 있고 spec-trace missing-test 가 P11 몫(a · b · c 증명 표의 AC)만큼 준다. **볼 수 있는 화면: 세 영역 세션 처음부터 끝까지.**
4. (차례 11) [사람] 요청자가 프리뷰(iPad)에서 1단계 세 영역 수업을 끝까지 해 본다(H13 의 프리뷰 판 일부) · H4 뒤 쓰기 · 말하기 AI 활동 · 커밋 · PR 지시(H14).

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 판정 글자를 그리지 않아도 판정 값이 화면 자료 · DOM 에 남아 시험이 '보이지 않음'을 잘못 통과하거나 실제로 보인다 | AC-5d | 판정은 조각 안 상태로만 쓰고 글로 그리지 않음 · e2e 가 화면 글에 '맞음' · '부분' · '다시' · correct · partial · retry 가 없음을 본다 |
| 2 | 두 문장 이상 답의 듣기 끝(쉼에서 안 끊김 · '다 말했어요' · 상한)이 기기마다 다르다(Chrome Android 첫 쉼 끝) | AC-5e · 발표 글 빠짐 | P2a `endRuleFor` 의 이어 붙이기를 그대로 씀. e2e `first-pause-end` · `multi-sentence-pauses` 대본. 실기는 H2 · 차례 11 |
| 3 | 발표 평가가 실패하면 확인 질문을 어디서 가져오는지가 화면 · 서버에서 갈린다 | 다시 열면 다른 질문 | 서버가 발표 끝 시도에서 정해 화면 자료로 넘김(값 4) — 실패면 예비 질문, 같은 세션은 늘 같은 질문 |
| 4 | 안전 상한 뒤 건너뛰기가 대기열과 서버 액션 결과를 섞는다 | 끝내기가 `incomplete` | 건너뜀은 대기열의 끝 시도(값 3)로 남기고 a 의 끝 시도 집합 규칙으로 센다 · 통합 시험 |
| 5 | 9~12단계 수업은 1차 시드(1~6단계)에 없다 | 실사용 전까지 견본으로만 봄 | e2e 견본 빌더(`speakingLesson(ref, 10)`) · 2차 시드 뒤 화면 검토 다시(다른 P 에 넘길 것) |
| 6 | 그림 보고 말하기의 질문 글이 시드에 없을 수 있다(`prompt` 선택 칸) | 평가 요청의 question 이 빔 | 정할 것 갑 — 영어 기본 지시 상수 |

### 정할 것(컨트롤러 — 보고와 같은 글자. a 가~카 · b ㄱ~ㅂ 와 겹치지 않게 갑~)

| 번호 | 무엇 | 권함 | 13절 |
|---|---|---|---|
| 갑 | 그림 보고 말하기의 평가 요청 질문 글(시드 `pictureTask.prompt` 는 선택 칸) | 시드 prompt 가 없으면 영어 기본 지시 `PICTURE_TASK_PROMPT = "Look at the pictures and talk about them."`(대문자 상수 · check-ids 허용, 아이 화면 안내는 '그림을 보고 말해 봐요'). P8 브리프에 prompt 를 늘 두기 | 아니오 |
| 을 | 발표 평가가 실패했을 때 | 시드 예비 확인 질문(`fallbackQuestions` 앞 level_specs presentation.confirmQuestions 개)으로 확인 질문 차례를 그대로 하고 답은 AI 가 되면 평가. 발표 활동은 점수에서 빠짐(8절) | 아니오 |
| 병 | 생각 화면의 시간이 다 됐을 때 | 저절로 듣지 않고 '말하기'만 남김(iOS 가 누름 없이 인식을 시작하지 않을 수 있음 — 7절 '첫 재생은 아이의 버튼 누름' 과 같은 결). 3.3 '말하기 버튼을 누르면 생각 시간을 끝내고 바로 말한다'는 그대로 | 아니오 |
| 정 | 검토 묶음 C1 · C2 | 둘(화면이 다름). 시간이 빠듯하면 하나로 | 아니오 |

말하기 6 · 8단계 차례(그림 먼저)와 3~8단계 피드백 · 문법 지적 줄은 a 정할 것 마 (7) 에 있다(13절 C77 (7)). 위 넷은 모두 권함대로 받았다(컨트롤러 2026-10-18 04:1x).

### 제약

a · b '제약'과 같다. 더해서 — 말하기 평가 고정부의 '인식 오류로 보이는 부분은 근거로 쓰지 않음'(6.1)은 P9b 가 맡고 P11 은 인식 글을 고치지 않고 그대로 보낸다. 녹음하지 않는다. 내용 · 문법 점수 · 판정은 아이 화면에 그리지 않는다(4절).

### 다른 P 에 넘길 것

- P12: 단계 평가 말하기 과제 · 발표 문항은 `evaluateSpeaking` 을 같은 서버 함수 꼴로(발표 문항은 `withConfirmQuestions: false`), 9~12단계 단계 평가 질문 문항의 문법 지적은 장부 'speakingRulesOf 9~12' 행대로 정함. 최근 성적은 점수 null 세션을 뺌.
- 2차: 7~12단계 실시드가 오면 그림 보고 말하기(8단계) · 발표 화면을 실데이터로 화면 검토 다시.
- 1-나: 부모 화면이 말하기 평가 내용 · 문법 점수(attempts.ai_feedback)와 `english_sentences` 를 보인다. 'AI 쉬는 중' 상태가 오면 3~8단계 건너뛰기를 세션 시작 때부터(화면 자료 `aiResting`).
- P8: 시드 브리프 — 그림 보고 말하기 `prompt` 를 늘 두기(정할 것 갑) · 3단계 질문 `modelAnswer` 는 AI 바른 답이 걸릴 때 대신 쓰임.

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-5b(6 · 10단계 몫) | e2e "AC-5b 말하기 6단계 세션은 따라 말하기 문장 3, 듣기 이해 3문항, 그림 보고 말하기 1개와 질문 답 4개이고 대화 주고받기 활동이 없다" · "AC-5b 말하기 10단계 세션은 듣기 이해 뒤 생각 화면(speaking.prepare_seconds, 말하기 버튼으로 먼저 끝남) → 발표 → 피드백 한 문장 → 확인 질문 3개 순이고 내용 · 문법 점수는 아이 화면에 없다" · "AC-5b 확인 질문을 내지 못한 표본에서는 시드의 예비 확인 질문이 쓰인다" | `tests/e2e/speaking.spec.ts` |
| AC-5d(화면 몫) | e2e "AC-5d 말하기 3단계 질문 답 화면에는 판정 글자가 보이지 않고 부분 · 다시 판정이면 바른 답 문장이 재생된다" | `speaking.spec.ts` |
| AC-5e(6단계 몫) | e2e "AC-5e 말하기 6단계 그림 보고 말하기는 2초 쉼이 두 번 든 말에서 끊기지 않고 듣는 동안 '다 말했어요'로 바뀐 말하기 버튼을 누를 때 끝나며 브라우저가 첫 쉼에서 끝내는 가짜 API 에서 두 조각을 이어 붙인다" | `speaking.spec.ts` |
| AC-5f(3단계 몫) | e2e "AC-5f 말하기 3단계 질문은 영어를 읽어 준 뒤 아래에 한국어 뜻이 보인다" | `speaking.spec.ts` |
| AC-5g(화면 몫) | e2e "AC-5g 말하기 6단계 그림 보고 말하기 화면에 그림 카탈로그의 단어 그림 2~3장이 늘어서 보이고 말하기 평가 요청에 시드의 장면 설명이 들어간다"(가짜 AI 받은 요청 본문) | `speaking.spec.ts` |
| AC-8b(말하기 몫) | e2e "AC-8b 알림 기준(하루 호출)을 넘긴 상태에서 말하기 세션을 열면 모든 활동이 그대로 진행되고 아이 화면에 제한 문구가 없다"(부모 메뉴 점 · 'AI 쉬는 중' 몫은 1-나) | `speaking.spec.ts` |
| AC-2c(말하기 평가 몫) | 통합 "AC-2c 다시 하기 말하기 세션에서도 말하기 평가 호출이 새 수업과 같이 나가고 그 점수는 sessions 에 남는다" | `tests/integration/retry.test.ts` |
| AC-N9 | e2e(a 증명 표의 이름 그대로) — P11 화면 전부 | `tests/e2e/font-size.spec.ts` |
| 말하기 AI 흐름(AC 접두 없음) | 단위 "말하기 판정: 맞음 1 · 부분 0.5 · 다시 0 이고 발표 · 확인 질문은 (내용 + 문법) ÷ 2 ÷ 4 다" · "말하기 판정: 안전 상한 뒤 건너뛸 활동은 남은 질문 답과 그림 보고 말하기다" + 통합 "말하기 3~8: 평가가 실패한 문항은 점수에서 빠지고 모두 실패면 따라 말하기 · 듣기만으로 점수를 낸다" · "말하기 3~8: 안전 상한이면 남은 질문 답을 건너뛰고 세션을 끝낼 수 있다" · "말하기 9~12: 발표 평가가 실패하면 예비 확인 질문으로 이어 가고 AI 평가 활동이 하나도 없으면 세션 점수가 빈다" · "말하기 평가: 같은 시도 id 로 다시 부르면 AI 를 다시 부르지 않는다" | `tests/unit/speaking-judge.test.ts` · `tests/integration/speaking-eval.test.ts` |
| 공통 | a 증명 '공통' 줄과 같은 명령 · CI(차례 10) | 작업 3 |

## 완료 보고 (Done)

구현 뒤 채운다.
