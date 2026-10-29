# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P11b 쓰기 AI(확인 · 생각 꺼내기 · 첨삭 · 둘째 세션)

spec: `specs/` 정본(3.3 쓰기 표 4~12 행 · 생각 꺼내기 문단 · 개인 정보 문단, 3.5 별(쓰기 6단계 이상은 둘째 세션), 3.7 쓰기 4~5 · 6~12 행 · '점수가 비거나 따로 세는 경우' 표, 4절 첫 문단(기다림 표시 ui.wait_hint_seconds) · 쓰기 세션 행 · 세션 결과 행(쓰기 6단계 이상 첫 세션) · 홈 '그 밖' 행 · 수업 목록 '맨 위 차례' · '여기부터 해요' 행, 5절 sessions writing_part · attempts 상태 · 전이 표 아래 문단('쓰기 6단계 이상 첫 세션이 중단으로 닫히면 …'), 6.1 공통 규칙 · 가림 · 실시간 응답 정규화, 6.2 쓰기 확인 · 쓰기 첨삭 · 생각 꺼내기 행, 8절 'AI 쉬는 중' 표(들어가는 조건 (1) · 동안 · 첨삭을 기다리던 글) · 상황 표(AI 호출 하나의 실패 · 다시 보내도 같은 오류 · 첨삭 대기 · 안전 분류기 거절), 10절 운영(첨삭 재시도는 앱 진입 때 · after()), 11절 1-가 (7), 12절 writing.* · ai.timeout_seconds.* · ai.feedback_max_attempts · ai.safety_daily_* · ui.wait_hint_seconds, 13절 C17 · C50 (2) · C63 · C69, 15절 AC-2a(첨삭 몫) · 2e(초고 몫) · 4c · 6a(초고 몫) · 8d · 8k · 8n(첨삭 몫) · N6 · N10, approved 2026-10-16 06:2x) · 묶음 plan P11 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-18 · 상태: done(2026-10-22, 커밋 cce2238)
승인: 컨트롤러 2026-10-18 04:1x(정할 것 ㄱ~ㅂ 모두 권함대로 — 13절 C79 두 세션 자리 · C80 1-가 안전 상한 · C81 가짜 AI webServer, a 몫 C76 · C77 · C78) · 브랜치 · 워크트리: `feature/1a-p11-session-activities`(a · c 와 같은 브랜치 · 워크트리 p11) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P11 의 둘째 묶음이다. 짝은 `plan-p11a-세션-바탕-앱-채점.md` 이고, 셋이 함께 쓰는 사실(나눈 까닭과 배정 · 가정 · 화면을 보는 차례 · 바탕 가지 · 활동 모델 · 시도 꼴 · 정본 밖 문구 · 정할 것 가~카 · 확인한 사실)은 그 파일의 같은 이름 절에만 있다. 이 plan 의 작업은 그 파일 '화면을 보는 차례'의 차례 5 · 6 · 7 이다.
정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다.

## 목표 (Goal)

- **AI 길(차례 5).** 서버 액션이 P9c 공개 함수(`checkWriting` · `thinkoutTurn` · `writeFeedback`, `src/server/ai/index.ts` 만 가져옴)를 부르고 그 자리에서 시도를 저장한다. 가변부 재료(`LevelContext` — can-do · 문장 길이 상한 · 이번 단원과 앞 단원 학습 요소 · 단원 단어)는 서버가 level_specs · unit_specs 에서 만든다. AI 를 기다리는 모든 화면은 ui.wait_hint_seconds 첫 값(1초) 안에 기다림 표시, 둘째 값(5초)이 지나면 '확인하고 있어요'(4절 · AC-N10). 실패는 갈래마다 8절 길로 간다(정할 것 ㄷ). 1-가 하루 안전 상한(ai.safety_daily_calls · ai.safety_daily_cost_usd)에 닿은 학습일에는 AI 가 필요한 수업을 시작하지 않고 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 '홈'을 보인다(C50 (2), 정할 것 ㄴ). e2e 는 Playwright webServer 의 가짜 Anthropic 서버(ANTHROPIC_BASE_URL)로 돈다.
- **쓰기 4~5(3.3 · 6.2 · 3.7).** 새 단어 미리보기 → 과제(과제 · 예시, 4단계는 단어 상자) → 문장 쓰기(문장 전부 한 화면 — 4단계 문장 틀 빈칸에 단어 상자를 눌러 넣기, 5단계 예시문 빈칸에 기기 자판으로 직접, 자동 수정 · 자동 대문자 · 맞춤법 검사 · 단어 추천 끔) → '다 썼어요' → 쓰기 확인(같은 화면에 칭찬 한 줄 + 고칠 곳 최대 1개 — 누르면 바른 표현 + 헷갈리는 보기 1~2개, 골라 고침) → 내 문장 듣고 따라 말하기(선택). 점수 = 첫 제출에서 AI 가 맞다고 본 문장 수 ÷ 문장 수(고친 뒤 바뀌지 않음). 확인이 실패하면 확인 없이 넘어가고 점수 없는 세션(3.7 · 8절).
- **쓰기 6~12 첫 세션(차례 6).** 새 단어 미리보기 → 과제 → 생각 꺼내기(한국어 질문 + 보기 3개를 누르거나 한글로 짧게 씀, 최대 writing.thinkout_max_turns 턴 — 그 턴에 앱이 끝냄) → 초고(생각 요약 · 쓸 낱말 4~6개 · 문장 시작 틀 2개가 붙은 입력란, 자동 저장) → '다 썼어요'. 제출 서버 액션은 초고를 '첨삭 대기'로 저장하고 첫 세션을 끝낸 뒤 바로 돌아오며(연속 일수에 듦, 8절), 첨삭은 `after()` 로 응답 뒤에 부른다(6.2 · Vercel Hobby 300초 안). 결과 화면은 '글을 보냈어요. 첨삭이 오면 고쳐 쓰고 별을 받아요'와 큰 버튼 자리의 기다림 표시 → 첨삭이 오면 '첨삭 보기', ai.timeout_seconds.feedback(60초)이 지나도 없으면 '수업 목록'(4절 · AC-4c). 생각 꺼내기가 실패하면 '이번에는 바로 써 볼까요'와 과제 예시 · 시드 힌트가 붙은 초고 화면(8절 · AC-8d). 첨삭이 오면 첫 세션 점수 = 채점표 평균 ÷ 4(3.7).
- **둘째 세션 · 목록 · 홈 · 밀린 첨삭(차례 7).** 첨삭이 온 수업은 수업 목록 맨 위 '첨삭 보기'(여기부터 해요 차례 둘째)와 홈 '첨삭이 왔어요' 포스트잇으로 열린다. 둘째 세션은 칭찬 1개 → 교정 하나씩(원문 · 수정 · 이유) → 고쳐 쓰기 1회(초고를 채워 둠) → 모범 답안(고쳐 쓰기를 낸 뒤에만) → 내 문장 말하기(선택)다. 첨삭이 실패하면 attempts 를 '첨삭 대기'로 두고 다음 앱 진입(홈 요청)의 `after()` 에서 다시 부른다. 둘째 세션을 열 때 첨삭이 없으면 그 자리에서 한 번 더 부르고, 그래도 없으면 '아직 글을 살펴보고 있어요'와 '수업 목록'. 같은 초고가 거절로 두 번, 또는 거절이 아닌 까닭으로 ai.feedback_max_attempts(5)번 실패하면 '첨삭 못 함' · 부모 알림 `feedback_failed` 이고 그 수업을 다시 고르면 빈 새 초고다(AC-8k · AC-8n). 초고를 쓰다 다른 수업을 골라 중단된 첫 세션은 그 수업을 다시 열면 초고 글을 채워 둔다(5절 · AC-2e).
- 경계: 별(쓰기 6단계 이상은 둘째 세션 끝 — 3.5)은 P12. 'AI 쉬는 중' 상태 · 부모 화면 · 비용 알림은 1-나. 단계 평가의 쓰기 과제 채점(`forLevelTest`)은 P12.

## 바뀌는 파일 (Files that change)

손 파일 서른여섯(새 열여섯 · 고침 스물 — 짝 파일은 한 줄에 묶음). 검토 묶음 셋(B1 AI 길 · 쓰기 4~5 · B2 6~12 첫 세션 · B3 둘째 세션 · 목록 · 홈). 공용 변경은 아래 따로.

| 파일 | 신규 / 수정 | 무엇을 | 묶음 · 차례 |
|---|---|---|---|
| `tests/e2e/fake-ai-server.ts` | 신규 | e2e 가짜 Anthropic 서버 띄우기(P9a `startFakeAnthropicServer`, 준비 줄 `FAKE_AI_READY`) | B1 · 5 |
| `tests/e2e/fake-ai.ts` | 신규 | e2e 가짜 AI 조종(비우기 · 규칙 · 받은 요청) · 응답 만들기(값 8) | B1 · 5 |
| `src/server/session/ai-context.ts` | 신규 | `server-only`. `LevelContext` 만들기(값 1) | B1 · 5 |
| `src/server/session/ai-gate.ts` | 신규 | `server-only`. 1-가 하루 안전 상한 읽기(값 2) | B1 · 5 |
| `src/server/writing/index.ts` | 신규 | `server-only`. 쓰기 AI 서버 함수(값 3 — 차례 5 확인, 6 생각 꺼내기 · 초고 · 첨삭, 7 고쳐 쓰기 · 밀린 첨삭) | B1~B3 |
| `src/server/actions/writing.ts` | 신규 | `'use server'`. `checkGuidedWriting` · `thinkoutNext` · `submitDraft` · `draftFeedbackStatus` · `submitRewrite`. 첫 문장 `await requireAccess()` | B1~B3 |
| `src/core/session/attempt.ts` | 수정 | b 의 시도 종류(값 4) · `aiNeededLesson` | B1 · 5 |
| `src/core/writing/feedback.ts` | 신규 | 첨삭 상태 순수 함수(값 5) | B2 · 6 |
| `src/components/session/wait-hint.tsx` | 신규 | 'use client'. 기다림 표시(값 6) | B1 · 5 |
| `src/components/session/ai-rest.tsx` | 신규 | 'use client'. 1-가 안전 상한 안내(C50 (2)) | B1 · 5 |
| `src/components/session/writing-guided.tsx` | 신규 | 'use client'. 쓰기 4~5 과제 · 문장 쓰기 · 확인 · 고칠 곳 · 내 문장 따라 말하기(값 7) | B1 · 5 |
| `src/components/session/writing-composition.tsx` | 신규 | 'use client'. 6~12 과제 · 생각 꺼내기 · 초고(값 7) | B2 · 6 |
| `src/components/session/writing-rewrite.tsx` | 신규 | 'use client'. 칭찬 · 교정 · 고쳐 쓰기 · 모범 답안 · 내 문장 말하기(값 7) | B3 · 7 |
| `src/server/session/index.ts` | 수정 | 시작(안전 상한 · writing_part · 둘째 세션 · 첨삭 대기 · 되살림) · 화면 자료(aiResting · 쓰기 자료) · 늦은 초고 받기(값 9) | B1~B3 |
| `src/server/actions/session.ts` | 수정 | `startLesson` 이 첨삭 대기면 한 번 더 부른 뒤 다시 시작(값 9) | B3 · 7 |
| `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | b 활동 조각 · 안전 상한 안내 | B1~B3 |
| `src/app/(child)/result/[id]/result-view.tsx` · `src/server/session/result.ts` | 수정 | 쓰기 6~12 첫 세션 결과(값 10) | B2 · 6 |
| `src/core/lesson-list/state.ts` | 수정 | 쓰기 두 세션 상태 · 시작 판정 · 수 세기(값 11) | B3 · 7 |
| `src/server/lesson-list/index.ts` | 수정 | `writingDrafts` · `feedbackReady` 채우기 | B3 · 7 |
| `src/app/(child)/[area]/lessons/lesson-board.tsx` · `use-lesson-start.ts` | 수정 | '첨삭 보기' 시작 · '아직 글을 살펴보고 있어요' · 안전 상한 안내 · 대기열 비우기 | B3 · 7 |
| `src/server/home/index.ts` | 수정 | '첨삭이 왔어요' 자료 · 최근 성적에서 점수 없는 세션 · 둘째 세션 빼기(값 12) | B3 · 7 |
| `src/app/(child)/page.tsx` · `home-cards.tsx` | 수정 | 밀린 첨삭 `after()` · '첨삭이 왔어요' 포스트잇(값 12) | B3 · 7 |
| `tests/unit/session-attempt.test.ts` | 수정 | b 종류 · `aiNeededLesson` | B1 · 5 |
| `tests/unit/writing-feedback-state.test.ts` | 신규 | 첨삭 상태 · 채점표 점수 · 세지 않는 실패 | B2 · 6 |
| `tests/unit/lesson-list-state.test.ts` | 수정 | 쓰기 두 세션 규칙 | B3 · 7 |
| `tests/integration/writing-check.test.ts` | 신규 | 쓰기 4~5 점수 · 실패 · 같은 시도 id · 앞 단원 학습 요소 | B1 · 5 |
| `tests/integration/safety-cap.test.ts` | 수정 | 1-가 시작 막음(P9c AC-8b 시험은 그대로) | B1 · 5 |
| `tests/integration/writing-feedback.test.ts` | 신규 | AC-4c · AC-8k · AC-8n 첨삭 몫 · 잡기 · 밀린 첨삭 · 모범 답안 | B2 · 6 · 7 |
| `tests/integration/session-start.test.ts` | 수정 | 둘째 세션 · 대기 · 못 함 뒤 새 초고 · 되살림 · 늦은 초고 | B3 · 7 |
| `tests/e2e/writing.spec.ts` | 수정 | 쓰기 4~5 · AC-4c · AC-2e | B1~B3 |
| `tests/e2e/timeout.spec.ts` | 신규 | AC-8d · AC-N6 · AC-N10 | B1 · 6 |
| `tests/e2e/resume.spec.ts` | 수정 | AC-6a 초고 글 | B2 · 6 |
| `tests/e2e/home.spec.ts` | 수정 | AC-2a '첨삭이 왔어요' | B3 · 7 |

### 요청하는 공용 변경(컨트롤러가 합친다)

| # | 파일 | 바꿀 것 | 차례 · 까닭 |
|---|---|---|---|
| 1 | `playwright.config.ts` | (가) 포트 이름 붙인 상수 `E2E_AI_PORT`(54349, 기술 값)와 시험 키 상수 `E2E_FAKE_AI_KEY = "e2e-fake-key"`(비밀값 아님 — 가짜 서버만 받음)를 내보냄. (나) `webServer` 배열 둘째(DB 다음 · Next 앞)에 `{ name: "fake-ai", command: "node --import tsx tests/e2e/fake-ai-server.ts --port <E2E_AI_PORT>", wait: { stdout: /FAKE_AI_READY/ }, reuseExistingServer: false, gracefulShutdown: { signal: "SIGTERM", timeout: <ms> } }`. (다) Next 서버 env 에 `ANTHROPIC_BASE_URL: "http://127.0.0.1:<E2E_AI_PORT>"` · `ANTHROPIC_API_KEY: E2E_FAKE_AI_KEY`(VERCEL_ENV 없음 — P9a `clientOptionsOf` 가 그때만 ANTHROPIC_BASE_URL 을 SDK 에 맡김) | 5. e2e 는 실제 API 를 부르지 않는다(묶음 제약). `workers: 1`(P10)이라 가짜 서버 하나를 시험마다 비우고 규칙을 넣는다 |

### 파일별 값(구현자가 옮겨 쓸 것)

1. **`LevelContext` 만들기(`src/server/session/ai-context.ts` `levelContextOf({ area, level, unit, revision }, { db })`).** `canDo` · `sentenceMaxWords` 는 P7a `readLevelSpec`(그 세션의 `seed_revision` — P10 `loadSessionView` 와 같은 판), `learningElement` · `unitWords` 는 `readUnitSpec`. `prevLearningElements` 는 같은 영역에서 (단계, 단원) 차례로 앞선 모든 단원(앞 단계 단원 1~5 전부 + 이 단계의 앞 단원, 알파벳 단원 0 빼고)의 학습 요소를 칸마다 그 판 이하 가장 높은 판(P7a `pickByCell`)으로 — C64 (1) '앞 단계 전부 + 같은 단계의 앞 단원'과 같은 범위(6.1 '이번 단원과 이전 단원 학습 요소'). 없는 칸은 던진다(조용한 기본값 금지).
2. **1-가 안전 상한(`src/server/session/ai-gate.ts`).** `aiRestingToday({ profileId, at }, { db })` = P9c `preCallGate(dailyUsage(db, { profileId, learningDay }), { safetyDailyCalls: ai.safety_daily_calls, safetyDailyCostUsd: ai.safety_daily_cost_usd }).allowed === false`(학습일은 app.* 로). 1-나가 ai_status 를 더하면 이 함수 하나만 고친다(묶음 위험 8).
3. **쓰기 AI 서버 함수(`src/server/writing/index.ts`).** 모두 `deps?: AiDeps & { schedule?: (task: () => Promise<void>) => void }` 를 받아 시험이 가짜 클라이언트 · 즉시 실행 스케줄러를 넣는다(기본 `after`). 공통: 그 프로필의 진행 세션 · 그 활동 차례의 종류인지 확인, 같은 `clientAttemptId` 시도가 있으면 저장된 결과를 그대로 돌려줌(AI 를 두 번 부르지 않음), 아이 글 · AI 글을 로그에 내지 않음(`safeDbError`).
   - `checkGuided({ sessionId, clientAttemptId, activityNo, sentences })`: `checkWriting({ task, example, sentences, ...LevelContext }, { profileId, sessionId, level })`. ok → 시도 `{ input: { v: 1, kind: "writing-guided", step: "final", sentences }, ai_feedback: { state: "ok", value }, score: 맞음 문장 수 ÷ 문장 수, word_count, status: "done" }` · 돌려줌 `{ ok: true, praise, fix? }`(fix = `{ sentenceIndex, original, options: 바른 표현 + 헷갈리는 보기를 시도 id 로 정한 차례로 섞음, correct }`). 실패 → 시도 `{ ai_feedback: { state: "failed", reason }, score: null }` · `{ ok: false, reason: "skipped" }`(확인 없이 넘어감). `safety_cap` → **시도를 남기지 않고** `{ ok: false, reason: "ai_resting" }`(세션은 진행 — 다음 학습일에 같은 화면에서 다시 냄).
   - `thinkoutStep({ sessionId, clientAttemptId, activityNo, answer: string | null })`: 그 세션의 생각 꺼내기 진행 시도(턴 차례)로 `history`(앞 턴의 `historyEntry` 글자 그대로 + 아이 답 — `fillName` 전 글, 장부 P11 행) · `turn = history.length + 1`(P9b 가드) · `hints` · `newWords`(수업 새 단어 차례) · `task` · `example` 을 만들어 `thinkoutTurn`. ok 이고 끝이 아니면 진행 시도 `{ kind: "thinkout", step: "progress", turn, answer, question, options, historyEntry }` · 돌려줌 `{ question, options }`(화면 글의 {NAME} 은 P9b `fillName`(영어 이름)). 끝(`done` 또는 마지막 턴)이면 끝 시도 `{ kind: "thinkout", step: "final", summary, words, starters }`. 실패 · `output_blocked` → 끝 시도 `{ kind: "thinkout", step: "final", failed: true }` · `{ ok: false, reason: "fallback" }`('이번에는 바로 써 볼까요'). `safety_cap` → 시도 없이 `ai_resting`.
   - `submitDraft({ sessionId, clientAttemptId, activityNo, text })`: 한 트랜잭션 — 끝 시도 `{ input: { v: 1, kind: "draft", step: "final", text }, ai_feedback: { state: "pending", failures: 0, refusals: 0 }, word_count, status: "awaiting_feedback" }` + 첫 세션 끝내기(`status: "completed"`, `completed_at`, `learning_day`, `score: null` — 첨삭이 올 때 채움). 트랜잭션 뒤 `schedule(() => runFeedback({ attemptId }))` 하고 바로 `{ ok: true, resultPath: "/result/<sessionId>" }`. 쓰기 6단계 이상 첫 세션은 a 의 `finishSession` 길을 쓰지 않는다.
   - `runFeedback({ attemptId })`: (1) 잡기 — `UPDATE attempts SET ai_feedback = jsonb_set(…'claimedAt' = 지금) WHERE id = $1 AND status = 'awaiting_feedback' AND (claimedAt 없음 OR claimedAt < 지금 − AI_WAIT_TIMEOUT_MULTIPLE × ai.timeout_seconds.feedback)`(지금은 매개변수 — SQL 안 now() 금지). 못 잡으면 끝(다른 요청이 부르는 중). (2) `writeFeedback({ task, example, draft: text, thinkoutSummary: 그 세션 생각 꺼내기 끝 시도의 summary ?? null, forLevelTest: false, ...LevelContext }, { profileId, sessionId, level })`. (3) 결과를 `nextFeedbackState`(값 5)로: ready → 시도 `{ ai_feedback: { state: "ready", value }, score: rubricScore, status: "done" }` + 첫 세션 `score` 같은 값. failed → `status: "feedback_failed"` + 알림 `createAlertOnce({ kind: "feedback_failed", profileId, thresholdKey: "feedback_failed:<attemptId>", once: "key", value: { sessionId, reason } })`. pending(셈만 바뀜) → 잡은 시각을 지우고 셈을 씀.
   - `feedbackStatus({ sessionId })` → `{ state: "pending" | "ready" | "failed", submittedAt }`(결과 화면이 다시 읽음).
   - `submitRewrite({ sessionId, clientAttemptId, activityNo, text })`: 끝 시도 `{ kind: "rewrite", step: "final", text }`(word_count) · 돌려줌 `{ modelAnswer }`(그 초고 첨삭의 `modelAnswer` — 화면 자료에는 고쳐 쓰기 전까지 넣지 않음, AC-4c). 걸린 칸 바꾸기 뒤 빈 모범 답안은 보이지 않는다(장부 P11 행).
   - `retryPendingFeedback({ profileId, at })`: 그 프로필의 `awaiting_feedback` 초고를 오래된 차례로 많아야 `PENDING_FEEDBACK_PER_ENTRY`(2, 기술 값 — Hobby 300초 안에 첨삭 기다림 두 번)개 `runFeedback`.
4. **b 의 시도 종류(`src/core/session/attempt.ts`, a 값 2 에 더함).** `writing-task` 끝 `{}` · `writing-guided` 진행 `{ sentences }`(대기열 — 쓰던 글 되살리기) · 끝(서버 액션 — 위) · `writing-guided-fix` 진행 `{ fixed: string[] }`(고친 문장 — 내 문장 듣기에 씀) · `writing-own-repeat` · `own-speak` 끝 `{ heard?: string[], skipped?: "chose_skip" | "no_mic" }`(점수 null · 영어로 말한 문장 수에 안 셈) · `thinkout` 진행 · 끝(서버 액션) · `draft` 진행 `{ text }`(대기열, 자동 저장) · 끝(서버 액션) · `feedback-praise` · `feedback-correction` · `model-answer` 끝 `{}` · `rewrite` 끝(서버 액션). 대기열 길(`saveSessionAttempts`)은 `writing-guided` 끝 · `thinkout` · `draft` 끝 · `rewrite` 끝을 받지 않는다(서버 액션만). `aiNeededLesson({ area, content, part })` → 쓰기 `guided` · `composition` 첫 세션 참, 둘째 세션 거짓(AI 없음), 말하기는 `presentation` 이 있으면 참(c — 3~8단계는 막지 않고 질문 답만 건너뜀), 그 밖 거짓.
5. **첨삭 상태(`src/core/writing/feedback.ts`).** 상태 `{ state: "pending", failures, refusals, claimedAt? } | { state: "ready", value } | { state: "failed", reason: "refusal" | "failures", failures, refusals }`(JSON null 없음). `nextFeedbackState(pending, outcome, { maxFailures: ai.feedback_max_attempts })`: ok → ready. 거절(`reason: "refusal"`) → refusals + 1, `REFUSALS_TO_FAIL`(2 — 8절 '같은 입력이 거절로 두 번'의 고정 수, 대문자 상수 · check-ids 허용 목록)이면 failed(refusal). `safety_cap` · `config` → 셈 그대로(8절 '첨삭을 기다리던 글은 그대로 둔다' · 설정 문제는 호출이 아님, 정할 것 ㄱ). 그 밖(invalid · output_blocked · timeout · connection · server · rate_limit · console_limit · account · same_error) → failures + 1, maxFailures 면 failed(failures). `rubricScore({ task, grammar, vocabulary })` = 평균 ÷ 4.
6. **기다림 표시(`wait-hint.tsx`).** `WaitHint({ startedAt, seconds: ui.wait_hint_seconds })` — 첫 값 안(바로)에 점 셋 움직임(`data-wait-hint`), 둘째 값이 지나면 그 아래 '확인하고 있어요'(`data-wait-line`, 4절 예 그대로 — 모든 AI 기다림에 같은 줄, 정할 것 ㄷ). 서버 액션 기다림 · 결과 화면 첨삭 기다림 · '첨삭 보기' 다시 부름이 쓴다(c 도 씀).
7. **쓰기 화면 조각.**
   - `writing-guided.tsx`: 과제 화면(P5b `WritingGuidedTask` + '과제' · '예시' 이름표 + 4단계는 '단어 상자' 칩 보기). 문장 쓰기 화면: 문장 틀마다 한 줄, 4단계 빈칸은 누르는 칸(56px) — 단어 상자 칩을 누르면 첫 빈칸으로, 놓인 낱말을 누르면 돌아감. 5단계 빈칸은 그 자리의 입력란(`autoComplete="off"` · `autoCorrect="off"` · `autoCapitalize="off"` · `spellCheck={false}` · `lang="en"`, 장부 'B_LevelTest 빈칸 안에 답'과 같은 꼴). 다 채우면 '다 썼어요'. 쓰던 글은 진행 시도 · a 의 기기 입력으로 되살림. 확인 결과(같은 화면): 칭찬 한 줄 + 고칠 곳이면 그 문장의 `original` 자리를 색칠하고 '색칠한 곳을 눌러 고쳐 봐요' → 누르면 '알맞은 말을 골라요'와 보기 → 바른 것을 고르면 문장에 넣고 '잘 고쳤어요!', 틀리면 '다시 골라 볼까요'(a 정할 것 마). 그다음 '다음'. 시드 `hints` · `rubric` 은 아이에게 보이지 않는다. 내 문장 따라 말하기: 고친 문장을 하나씩 읽어 주고 '말하기'(a 따라 말하기 조각의 결과 말 셋을 씀, 점수 없음) · '건너뛰기', 마이크를 쓸 수 없는 기기면 건너뜀.
   - `writing-composition.tsx`: 과제 화면(과제 · 예시, 쓰기 6단계부터 — 일기 표시는 정할 것 ㄹ). 생각 꺼내기: 질문 카드(한국어 해요체) + 보기 3개 단추 + '직접 쓸래요' → 한글 입력란(비제어 입력 — P10 첫 실행 한글 조합 핫픽스와 같은 꼴, '한글로 짧게 써도 돼요') · '보내기'. 기다리는 동안 `WaitHint`. 끝나면 초고 화면. 초고 화면: '내 생각'(요약) · '쓸 수 있는 단어'(4~6개, 누르면 읽어 줌) · '이렇게 시작해 봐요'(틀 2개), 생각 꺼내기 실패 · 건너뜀이면 과제 '예시'와 시드 `hints`(8절). 입력란(영어, 자동 수정 · 대문자 · 맞춤법 · 추천 끔), '<최소>~<최대>단어로 써요'(level_specs `amount.words`, 문장 범위면 문장) · '지금 n단어'(퍼센트 없음). 자동 저장: 글이 멈추고 `DRAFT_AUTOSAVE_MS`(3000, 기술 값) 뒤 · 입력란을 떠날 때 · 화면이 숨을 때 · '홈' 앞에 진행 시도를 대기열로. '다 썼어요' → `submitDraft` → 결과로.
   - `writing-rewrite.tsx`: 칭찬 화면('잘한 점' + 칭찬) · 교정 화면 하나씩('이렇게 고쳐 봐요', 원문 → 수정, 이유) · 고쳐 쓰기(초고를 채운 입력란 + 위에 교정 칩 '원문 → 수정' 작게, '다 고쳤어요' → `submitRewrite`) · 모범 답안('모범 답안' + 글, 빈 글이면 이 활동을 건너뜀) · 내 문장 말하기(고친 글을 문장마다 '말하기' · '건너뛰기', 마이크 없으면 건너뜀). 끝 → a `finishSession`(둘째 세션 점수 null).
8. **e2e 가짜 AI(`tests/e2e/fake-ai.ts`).** `resetFakeAi()` · `pushFakeAi(rules)` · `fakeAiRequests()` 가 `http://127.0.0.1:<E2E_AI_PORT>/__fake/{reset,rules,requests}` 를 부른다. 응답 만들기는 P9a `messageBody({ model, json, stopReason?, usage? })` 와 규칙 `{ when: { purpose }, reply: { kind: "message", body, delayMs? } | { kind: "error", status, body } | { kind: "hang" }, times? }` — `purpose` 는 응답 규격 제목(`writing_check` · `thinkout` · `writing_feedback` · `speaking_eval.answer` · `speaking_eval.presentation` · `speaking_eval.confirm`, 가짜가 `output_config.format.schema.title` 로 고름). 모델은 `TEST_SETTINGS` 의 `ai.model.<목적>`. 견본 JSON 은 P9c `tests/fixtures/ai/samples/*.json` 꼴을 시험의 수업 내용(문장 수 · 새 단어)에 맞춰 만든다(`writingCheckReply({ correct: boolean[], fix? })` · `thinkoutReply({ done })` · `feedbackReply({ corrections })`). DB 를 쓰는 e2e 파일은 `beforeEach(resetFakeAi)`.
9. **세션 서버 · 시작(`src/server/session/index.ts` · `src/server/actions/session.ts`).**
   - 시작: P10 판정 뒤 · 세션 넣기 전에 `aiNeededLesson` 이고 `aiRestingToday` 면 `{ ok: false, reason: "ai_resting" }`(정할 것 ㄴ). 쓰기 단계 ≥ writing.split_from_level 의 첫 세션은 `writing_part: "draft"`. 판정이 `part: "rewrite"`(값 11)면 세션 `{ kind: 첫 세션 종류, writing_part: "rewrite", lesson_id: 첫 세션의 lesson_id, seed_revision · seed_correction: 첫 세션 값 }`(첨삭이 가리키는 그 판 그대로 — 5절 '진행 중 세션은 시작할 때 고른 행을 끝까지'). 판정이 `feedback_pending` 이면 서버 액션 `startLesson` 이 `runFeedback` 를 한 번 기다린 뒤(그동안 화면은 `WaitHint`) 다시 판정하고, 그래도 대기면 `{ ok: false, reason: "feedback_pending" }`.
   - 되살림(AC-2e): 같은 칸(영역 · 단계 · 단원 · 종류 · 수업 번호 · 변형)의 새 첫 세션이면 가장 최근의 **중단된** 첫 세션(첨삭 못 함 · 대기 초고가 없는 것)의 마지막 `draft` 진행 시도 글과 생각 꺼내기 끝 시도를 화면 자료 `restoredDraft: { text, thinkout? }` 로. 생각 꺼내기 끝이 되살아나면 그 활동은 끝 시도 `{ kind: "thinkout", step: "final", restored: true }` 로 건너뜀(AI 다시 안 부름, a 정할 것 마). '첨삭 못 함' 뒤 다시 고른 수업은 되살리지 않는다(빈 새 초고 — AC-8k).
   - 늦은 초고: `saveSessionAttempts` 가 `status: "aborted"` · `writing_part: "draft"` 세션의 `draft` 진행 시도는 받는다(다른 수업을 골라 중단된 뒤 대기열이 늦게 닿아도 글이 남게 — 위험 3).
   - 화면 자료: `aiResting`(진행 세션을 다시 열었는데 상한이면 틀이 안내) · 쓰기 6~12 첫 세션 `amount` · 둘째 세션 `{ praise, corrections, draftText }`(모범 답안 없음).
10. **쓰기 6~12 첫 세션 결과(`result-view.tsx` · `result.ts`).** `loadResultView` 가 `writing_part: "draft"` 끝난 세션이면 `{ draft: { state, submittedAt } }` 를 더한다. 화면: '글을 보냈어요. 첨삭이 오면 고쳐 쓰고 별을 받아요' · 큰 버튼 자리에 `WaitHint` → `draftFeedbackStatus` 를 `FEEDBACK_POLL_MS`(3000, 기술 값)마다 다시 읽어 ready 면 큰 버튼 '첨삭 보기'(그 수업 `startLesson`), `submittedAt + ai.timeout_seconds.feedback` 이 지나면 큰 버튼 '수업 목록' · 작은 버튼 '홈'.
11. **목록 상태(`src/core/lesson-list/state.ts`, P10 값 1 에 더함).** `SessionLite` 에 `writingPart?: "draft" | "rewrite"`. `ListInput` 에 `writingDrafts: { ref, variant, draftSessionId, lessonRowId, kind, state: "awaiting" | "ready" | "failed" }[]`(서버가 지금 단계 쓰기의 끝난 첫 세션 · 그 초고 시도 상태 · 끝난 둘째 세션 유무로 채움, 둘째 세션이 끝난 칸은 넣지 않음), `feedbackReady` 는 그 가운데 ready 의 `ref`(P10 칸 그대로). 규칙: (1) 첫 세션이 있는 칸은 끝난 둘째 세션이 있어야 '끝낸 수업'(완료 표시 · 다시 하기 판정 `triedRef`) — 첫 세션만 끝난 칸은 남은 수업이다. (2) `judgeLessonStart` — 그 칸이 ready 면 `{ ok: true, kind: 그 초고 세션 종류, part: "rewrite", draftSessionId, lessonRowId }`, awaiting 이면 `{ ok: false, reason: "feedback_pending", draftSessionId }`, failed 면 지금처럼 새 첫 세션. (3) `unitGateOf` 의 끝낸 정규 수업 수는 `writingPart: "rewrite"` 세션을 빼고 센다(수업 수는 첫 세션 — 3.7 '첨삭 대기 중 … 최소 수업 수에 넣는다'), 학습일은 두 세션 모두. 같은 규칙을 P12 단원 통과 판정이 쓴다(다른 P 에 넘길 것).
12. **홈(`src/server/home/index.ts` · `page.tsx` · `home-cards.tsx`).** `readHome` 에 `feedbackReady: { lessonId } | null`(쓰기 영역에서 첨삭이 ready 인 가장 오래된 첫 세션의 lesson_id). 최근 성적 칸은 `score` 가 null 인 세션과 `writing_part: "rewrite"` 세션을 빼고 센다(P10 은 세션 완료가 없어 이 경우가 없었다). `page.tsx` 는 프로필이 있으면 `after(() => retryPendingFeedback({ profileId, at: now() }))`(10절 '첨삭 재시도는 앱 진입 때', 쿠키 · 헤더는 after 안에서 읽지 않음 — 확인한 사실 a-1). '첨삭이 왔어요' 포스트잇(하늘, 영역 카드보다 앞 — 4절 홈 '그 밖')을 누르면 그 lesson_id 로 `startLesson`(둘째 세션이 바로 열림, AC-2a).

### AI 실패 갈래별 화면 길(정할 것 ㄷ — 장부 'AiOutcome 실패 갈래마다 화면 길')

| 호출 | 성공 | `safety_cap` | `config` | 거절 · `invalid` · `output_blocked` · 시간 · 연결 · 서버 · 한도 · 콘솔 한도 · 계정 · 같은 오류 | 서버 오류(RangeError 등 던짐 · 끊김) |
|---|---|---|---|---|---|
| 쓰기 확인(4~5) | 칭찬 · 고칠 곳 | 안내 + '홈'(진행, 시도 없음) | 확인 없이 넘어감(점수 없음) | 같음 | 같음(화면은 '인터넷이 끊겼어요 …'가 아니라 넘어감 — 서버가 닿았을 때) |
| 생각 꺼내기 | 다음 질문 · 끝 | 안내 + '홈'(진행) | '이번에는 바로 써 볼까요' | 같음 | 같음 |
| 첨삭(응답 뒤) | ready · 점수 | 대기 그대로(안 셈) | 대기 그대로(안 셈 · 서버 기록) | 거절 수 · 실패 수 +1(값 5) | 실패 수 +1 |

화면이 서버에 닿지 못하면(끊김) 7절 '인터넷이 끊겼어요. 연결되면 다시 해요'를 보이고 `online` 때 같은 시도 id 로 다시 부른다(서버가 같은 id 의 결과를 돌려줌).

## 작업 순서 (Order of work)

명령 꼴 · 시험 먼저 · 설정 숫자는 a 작업 순서 머리와 같다. 차례 번호는 a '화면을 보는 차례'다.

1. (차례 5) [검증][서버][화면] 공용 변경 1 → `tests/e2e/{fake-ai-server,fake-ai}.ts`(기존 e2e 전부 초록 확인) → `tests/unit/session-attempt.test.ts` · `tests/integration/{writing-check,safety-cap}.test.ts` → `src/server/session/{ai-context,ai-gate}.ts` · `src/server/writing/index.ts`(확인) · `src/server/actions/writing.ts` · `src/core/session/attempt.ts` · `src/components/session/{wait-hint,ai-rest,writing-guided}.tsx` · 세션 서버(시작 막음 · aiResting) · 틀 → `tests/e2e/writing.spec.ts`(4~5) · `tests/e2e/timeout.spec.ts`(AC-N10 · AC-N6). 완료: 통합 · e2e 초록(CI), 검토 묶음 B1 → code-reviewer · design-reviewer(B_Writing · 4절 쓰기 행). **볼 수 있는 화면(e2e 사진): 쓰기 4 · 5단계 문장 쓰기 → 확인 → 고칠 곳 고르기.**
2. (차례 6) [검증][서버][화면] `tests/unit/writing-feedback-state.test.ts` · `tests/integration/writing-feedback.test.ts`(AC-4c 통합 · AC-8k · AC-8n) → `src/core/writing/feedback.ts` · 쓰기 서버(생각 꺼내기 · 초고 · 첨삭 · 상태) · 액션 · `writing-composition.tsx` · 세션 서버(writing_part draft) · 결과(값 10) → `writing.spec.ts`(AC-4c 첫 세션) · `timeout.spec.ts`(AC-8d) · `resume.spec.ts`(AC-6a 초고). 완료: 검토 묶음 B2 → code · design(B_Writing2 · B_Result 와 4절). **볼 수 있는 화면(e2e 사진): 생각 꺼내기 → 초고 → '글을 보냈어요' → '첨삭 보기'.**
3. (차례 7) [검증][서버][화면] `tests/unit/lesson-list-state.test.ts` · `tests/integration/session-start.test.ts` → `state.ts` · 목록 서버 · 세션 서버(둘째 세션 · 대기 · 되살림 · 늦은 초고) · `startLesson`(대기면 한 번 더) · 쓰기 서버(고쳐 쓰기 · 밀린 첨삭) · `writing-rewrite.tsx` · 목록 화면 · 홈 서버 · 홈 화면 → `writing.spec.ts`(AC-4c 둘째 세션 · AC-2e) · `home.spec.ts`(AC-2a). 완료: 검토 묶음 B3 → code · design(B_Writing3 · B_Home4). **볼 수 있는 화면(e2e 사진): 첨삭 보기 → 고쳐 쓰기 → 모범 답안 · 홈 '첨삭이 왔어요'.**

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 쓰기 6단계 이상 두 세션이 P10 목록 상태 · 홈 · P12 판정의 '끝낸 수업' 셈을 바꾼다 | 완료 표시 · 다시 하기 판정 · 잠긴 단원 수 · 최근 성적 · 별이 두 번 셈 | 규칙을 `state.ts` 한 곳(값 11)에 두고 단위 시험 표가 칸 상태(없음 · 대기 · 옴 · 못 함 · 둘째 끝)마다 목록 · 시작 판정 · 수를 맞댄다. P12 가 같은 함수를 쓴다 |
| 2 | 두 진입(초고 제출의 after · 홈 진입의 after · '첨삭 보기'의 다시 부름)이 같은 초고 첨삭을 함께 부른다 | 비용 두 배 · 셈 어긋남 | 잡기(값 3 (1)) — 못 잡으면 그 요청은 부르지 않는다. 통합 시험 '동시 둘 → 호출 하나' |
| 3 | 대기열과 중단이 엇갈려 초고 글이 사라진다 | AC-2e | '홈' · 다른 수업 고르기 앞에 대기열 비우기, 목록 화면이 열릴 때 비우기, 서버가 중단된 첫 세션의 늦은 초고를 받음(값 9) |
| 4 | `after()` 는 Vitest(통합)에 없다 · Vercel 300초 | 시험 불가 · 첨삭 잘림 | 스케줄러 주입(값 3). 첨삭 기다림은 많아야 ai.timeout_seconds.feedback × 2(120초), 밀린 첨삭은 진입마다 2개 |
| 5 | 프리뷰에 개발용 키(H4)가 없으면 AI 활동이 모두 실패 길 · 첨삭이 영영 대기 | 요청자가 고장으로 봄 | 정할 것 ㅂ — 미리 알림. config 는 셈에 안 넣어 키가 들어오면 바로 첨삭이 온다 |
| 6 | 생각 꺼내기의 한글 입력이 iPad Safari 조합 중 깨진다(P10 첫 실행 이름 칸과 같은 결) | 아이 답 글 깨짐 | 비제어 입력 · 단계마다 새 입력 요소(P10 핫픽스 꼴). 화면 검토에서 조합 확인(실기는 차례 11) |
| 7 | 가짜 AI 견본이 시험 수업의 문장 수 · 새 단어와 안 맞으면 정규화가 null(실패 길)이 된다 | e2e 가 엉뚱한 길로 | 응답을 시험 안에서 그 수업 내용으로 만든다(값 8). 첫 시험이 '목록이 있어 AI 를 부른다'를 본다(a 위험 1) |
| 8 | 1-가 안전 상한 막음이 1-나 'AI 쉬는 중'과 다르게 짜인다 | 1-나가 다시 짬 | `aiRestingToday` 하나로 모으고 1-나가 ai_status 를 더한다(묶음 위험 8) |
| 9 | 모범 답안을 화면 자료에 넣으면 고쳐 쓰기 전에 보일 수 있다 | AC-4c | 화면 자료에서 빼고 `submitRewrite` 가 돌려준다(값 3) |

### 정할 것(컨트롤러 — 보고와 같은 글자. a 의 가~카와 겹치지 않게 ㄱ~ㅂ. 모두 권함대로 받음, 2026-10-18 04:1x)

| 번호 | 무엇 | 권함 | 13절 |
|---|---|---|---|
| ㄱ | 쓰기 6단계 이상 두 세션의 자리(5절 sessions · attempts · 3.5 · 3.7 · 8절을 읽은 꼴) | 점수는 첫 세션 행(첨삭이 올 때), 수업 수(최소 수업 수 · 단원 횟수)는 첫 세션 완료로, '끝낸 수업'(목록 완료 · 다시 하기 판정)과 별(P12)은 둘째 세션 완료로. 둘째 세션은 첫 세션의 lesson_id 행 · 종류 · 판 그대로(`writing_part` draft · rewrite). 첨삭 상태는 attempts.ai_feedback 의 상태 칸(대기 — 실패 수 · 거절 수 · 잡은 시각 / 옴 / 못 함)이고 `safety_cap` · 설정 문제는 실패 수에 안 넣는다. 진입마다 밀린 첨삭 많아야 2개. '첨삭 못 함' 뒤 다시 고르면 빈 새 초고, 중단된 초고는 되살림 | C79 |
| ㄴ | 1-가 하루 안전 상한 처리(11절 (7) '실시간 호출을 막고 안내만' · C50 (2)의 보완) | 그 학습일에 AI 가 필요한 수업(쓰기 4단계 이상 첫 세션 · 말하기 9단계 이상)은 시작하지 않고 안내 + '홈'. 도중에 닿으면 안내 + '홈'(세션 진행). 말하기 3~8단계는 남은 AI 활동을 건너뛰고 끝까지(8절 '동안'의 예외 그대로, 안내 없음). 둘째 세션(고쳐 쓰기)은 AI 가 없어 막지 않음. 첨삭은 대기 그대로 | C80 |
| ㄷ | AI 실패 갈래별 화면 길 · 기다림 둘째 줄 | 위 표대로. 기다림 둘째 줄은 모든 AI 기다림에 '확인하고 있어요'(4절 예 그대로) | 아니오 |
| ㄹ | 고쳐 쓰기 화면 · 일기 표시 | 고쳐 쓰기는 초고를 채워 두고 교정을 위에 작은 칩으로. 일기 과제의 '부모님도 볼 수 있어요'(3.3)는 시드 규격에 일기 표시 칸이 없다 — 1-가 시드(1~6단계)에 일기 과제가 없으므로(일기는 7단계) 2차 시드(7~12) 전에 P4 규격 칸 + 13절 한 줄로, 1-가는 과제 화면에 그 줄 자리만 | 아니오 |
| ㅁ | e2e 가짜 AI 붙이는 방식 | webServer 배열 셋째(DB · 가짜 AI · Next) · ANTHROPIC_BASE_URL · 시험 키 상수 · 시험마다 비우기. 기술 선택이라 원하면 C55 처럼 한 줄 | C81 |
| ㅂ | 개발용에서 AI 화면 보기 | H4(개발용 Anthropic 키를 Vercel Preview 환경 변수로) 전에는 프리뷰 AI 활동이 실패 길로 간다는 것을 요청자에게 미리 알림(또한 시험용 시드는 1단계뿐이라 쓰기 4단계 이상은 프리뷰에 없다 — P8 뒤). 개발용 길에 가짜 AI 를 붙이는 명령은 두지 않음 | 아니오 |

### 제약

a '제약'과 같다. 더해서 — AI 는 서버 액션 · 서버 함수에서만 부르고 `src/server/ai/index.ts` 만 가져온다(의존 규칙 sdk-only-in-ai). 아이 이름은 P9c 가림이 맡고 화면 글의 {NAME} 은 `fillName`. 비용 · 횟수로 아이 진행을 끊지 않는다(안전 상한만, 6.1). 첨삭은 스트리밍하지 않고 검증을 통과한 결과를 한 번에 보인다(6.2).

### 다른 P 에 넘길 것

- P12: 값 11 의 쓰기 두 세션 규칙(수업 수는 첫 세션 · 끝낸 수업은 둘째 세션 · 최근 성적은 첫 세션 점수, null 빼고)을 단원 통과 판정이 그대로 쓴다. 별은 둘째 세션 끝(3.5 · AC-6b). 단계 평가 쓰기 과제는 `writeFeedback({ forLevelTest: true })`(아이에게 교정 안 보임). 홈 최근 성적 칸을 P12 판정 함수로 바꿀 때 값 12 규칙을 지킴.
- 1-나: `aiRestingToday` 에 ai_status 를 더함 · 홈 카드 · 목록 '토리가 잠깐 쉬어요' 표시 · 부모 화면이 `feedback_failed` 알림을 읽음 · 'AI 쉬는 중'에는 밀린 첨삭을 부르지 않음(8절 — `retryPendingFeedback` 앞에서 상태를 봄).
- 2차 · P4: 일기 과제 표시 칸(정할 것 ㄹ).
- P8: 시드 브리프 — 쓰기 4~5 `sentences[].frame` 의 빈칸은 한 문장에 하나 · 5단계 바꿀 칸이 문장 안에 있게, 6~12 `hints` 는 아이가 바로 쓸 수 있는 한국어 도움말(생각 꺼내기 실패 때 초고 화면에 붙음).

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-4c | e2e(고정 표본) "AC-4c 쓰기 6단계 첫 세션에서 생각 꺼내기는 writing.thinkout_max_turns 턴에서 앱이 끝내고 초고를 내면 세션이 끝나며 결과 화면에 '글을 보냈어요. 첨삭이 오면 고쳐 쓰고 별을 받아요'와 기다림 표시가 보이고 첨삭이 오면 큰 버튼이 '첨삭 보기'가 된다" · "AC-4c 다음 쓰기 세션은 첨삭(칭찬 → 교정 하나씩) · 고쳐 쓰기 · 모범 답안 순서로 열리고 모범 답안은 고쳐 쓰기를 내기 전에는 보이지 않는다" + 통합 "AC-4c 초고 제출 서버 액션은 첨삭을 기다리지 않고 돌아오고 첨삭은 응답 뒤에 불려 첫 세션 점수를 채점표 평균 ÷ 4 로 채운다" · "AC-4c 생각 꺼내기는 writing.thinkout_max_turns 턴째에 끝내라는 요청을 보내고 그 뒤로는 부르지 않는다" | `tests/e2e/writing.spec.ts` · `tests/integration/writing-feedback.test.ts` |
| AC-2e(P11 몫) | e2e "AC-2e 쓰기 6단계 초고를 쓰다 다른 수업을 고른 뒤 그 수업을 다시 열면 초고 입력란에 쓴 글이 채워져 있다" + 통합 "AC-2e 중단된 첫 세션의 마지막 초고 글이 같은 수업의 새 첫 세션 화면 자료에 채워지고 중단 뒤 늦게 온 초고 시도도 받는다" | `writing.spec.ts` · `tests/integration/writing-feedback.test.ts`(계획은 `session-start.test.ts` — 완료 보고 다르게 한 것 15, 컨트롤러 2026-10-22 19:3x 바로잡음) |
| AC-2a(첨삭 몫) | e2e "AC-2a 첨삭이 오면 홈에 '첨삭이 왔어요'가 보이고 누르면 그 수업의 둘째 세션이 열린다" | `tests/e2e/home.spec.ts` |
| AC-6a(초고 몫) | e2e "AC-6a 쓰기 6단계 초고를 쓰다 앱을 닫고 다시 열면 초고 화면에 쓴 글이 그대로 있다" | `tests/e2e/resume.spec.ts` |
| AC-8d(화면 몫) | e2e "AC-8d 응답을 늦춘 고정 표본에서 10초 타임아웃 뒤 생각 꺼내기는 '이번에는 바로 써 볼까요'와 과제 예시 · 시드 힌트가 붙은 초고 화면으로 넘어간다" | `tests/e2e/timeout.spec.ts` |
| AC-N6(1-가 몫) | e2e "AC-N6 쓰기 확인이 ai.timeout_seconds.realtime 을 넘으면 확인 없이 다음 활동으로 넘어간다" | `timeout.spec.ts` |
| AC-N10 | e2e "AC-N10 응답을 늦춘 고정 표본에서 1초 안에 기다림 표시가 보이고 5초 뒤 '확인하고 있어요'가 더해진다" | `timeout.spec.ts` |
| AC-8k | 통합 "AC-8k 같은 초고의 첨삭이 거절로 두 번 끝나면 더 부르지 않고 attempts 가 '첨삭 못 함'이 되며 부모 알림이 생기고 그 수업을 다시 고르면 빈 새 초고 화면이 열린다" | `writing-feedback.test.ts` |
| AC-8n(첨삭 몫) | 통합 "AC-8n 거절이 아닌 까닭으로 같은 초고의 첨삭이 ai.feedback_max_attempts 번 실패하면 '첨삭 못 함'이 되고 부모 알림이 생기며 안전 상한 · 설정 문제는 실패 수에 들지 않는다" | `writing-feedback.test.ts` |
| 쓰기 4~5(AC 접두 없음 — AC-4b 는 P9) | 통합 "쓰기 4~5: 세션 점수는 첫 제출에서 맞다고 본 문장 수 ÷ 문장 수이고 확인이 실패하면 점수가 빈다" · "쓰기 4~5: 같은 시도 id 로 다시 내면 AI 를 다시 부르지 않고 저장한 결과를 돌려준다" · "쓰기 AI: 가변부의 앞 단원 학습 요소는 앞 단계 전부와 같은 단계 앞 단원이다" + e2e "쓰기 4~5: 문장을 다 쓰고 내면 칭찬 한 줄과 고칠 곳 하나가 같은 화면에 보이고 고칠 곳을 누르면 보기 2~3개가 나와 골라 고친다" | `tests/integration/writing-check.test.ts` · `writing.spec.ts` |
| 1-가 안전 상한(AC 접두 없음 — 11절 (7) · C50 (2)) | 통합 "1-가 안전 상한: 그 학습일 호출이 ai.safety_daily_calls 에 닿으면 쓰기 4단계 이상 첫 세션 · 말하기 9단계 이상은 시작되지 않고 둘째 세션 · 읽기 · 쓰기 1~3 은 시작된다" + e2e "1-가 안전 상한: 쓰기 5단계 수업을 고르면 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 '홈'이 보인다" | `tests/integration/safety-cap.test.ts` · `writing.spec.ts` |
| 첨삭 흐름(AC 접두 없음) | 단위 "첨삭 상태: 거절 둘이면 못 함 · 그 밖 실패는 ai.feedback_max_attempts 에서 못 함 · 안전 상한과 설정 문제는 셈이 그대로다" · "목록: 첫 세션만 끝난 칸은 남은 수업이고 둘째 세션이 끝나야 끝낸 수업이며 잠긴 단원 수는 첫 세션으로 센다" + 통합 "첨삭: 같은 초고를 두 요청이 함께 부르면 호출은 하나다" · "첨삭: 앱 진입마다 밀린 첨삭을 오래된 것부터 많아야 둘 부른다" · "둘째 세션: 첨삭이 대기면 시작할 때 한 번 더 부르고 그래도 없으면 대기를 돌려준다" | `tests/unit/writing-feedback-state.test.ts` · `lesson-list-state.test.ts` · `writing-feedback.test.ts`(둘째 세션 통합도 여기 — 계획은 `session-start.test.ts`, 완료 보고 다르게 한 것 15, 컨트롤러 2026-10-22 19:3x 바로잡음) |
| 공통 | a 증명 '공통' 줄과 같은 명령 · CI. 기존 e2e 가 가짜 AI 서버를 붙인 뒤에도 초록 | 차례 5 · 6 · 7 |

## 완료 보고 (Done)

채움: 문서 반영 편집자 2026-10-22 19:2x(브리프 `task-p11b-done-edit.md` · 덧 19:1x). **커밋 cce2238**(가지 `feature/1a-p11-session-activities`, 2026-10-22 19:11, push 됨). P11b 는 P11a 와 같은 워크트리 `.claude/worktrees/p11` 에서 차례 5 · 6 · 7 과 fix 5~8b 로 끝냈다. 바탕은 P11a 끝 79ee1cc 위 사이 커밋 셋을 더한 726198f 다. c(차례 8~10)는 같은 가지에서 잇는다(C85 순서로 P13 · P12 뒤). 원문은 구현 보고 `task-p11-report.md` 차례 5~7 절 · 검토 보고 열하나(`review-p11-{5,6,7}-{code,design}.md` · `review-p11-fix5-{code,design}.md` · `review-p11-fix6-code.md` · `review-p11-fix8-code.md` · `review-p11-fix8b-design.md`) · `review-codex-2026-10-19.md` · 장부 progress · ledger-open · ledger-closed · 13절 C79~C82 · C86 이다. 통합 · e2e 총수와 사진 내역은 원문에 없어 편집자가 코드와 사진 이름으로 셌다(표마다 적음).

### 흐름

| 차례 · 라운드 | 검토 묶음 | 결과(검토 보고) |
|---|---|---|
| 차례 5 AI 길 · 쓰기 4~5 확인 | B1 | 코드 Changes requested · I 1 · M 3(`review-p11-5-code.md` — AI 결과의 `{NAME}` 을 영어 이름으로 채우지 않음). 화면 Changes requested · I 1 · M 6(`review-p11-5-design.md` — 5단계 문장 쓰기 화면에 예시문 없음). P11a fix 4 재검토가 넘긴 넷 가운데 셋(코드 M-1 · M-2 · 화면 N-1)은 닫혔고 화면 N-2 는 M-6 으로 이어 갔다. CI 9차 빨강(시험 결함) → 10차 초록 |
| fix 5 · 5b · 5c | B1 | 코드 Approved · 15/15 ADDRESSED · 새 M 2(`review-p11-fix5-code.md`, 5b 가 고침). 화면 Approved · 일곱 ADDRESSED · 새 0(`review-p11-fix5-design.md`, CI 13차 사진). 5b · 5c 는 CI 11 · 12차 빨강을 고쳤다 → 84b0669 |
| 차례 6 쓰기 6~12 첫 세션 | B2 | 코드 Approved · M 3(`review-p11-6-code.md` — 생각 꺼내기 `{NAME}` 시험 없음 · 낱말 칩 22px · 초고 제출이 막히는 길). 화면 Approved · M 2(`review-p11-6-design.md` — 실패 길 힌트 언어 · 초고 입력란 5줄 고정). CI 14차 초록 |
| fix 6 · 6b | B2 | 코드 Approved · 4/4 ADDRESSED · 새 0(`review-p11-fix6-code.md` — 6b 의 화면 M-2 코드 몫 포함). 화면 재검토 보고는 따로 없다. 6b 사진(`p11-writing-6-draft-long`)은 차례 7 화면 검토가 '맞음'으로 봤다. CI 15차 초록 → 56acaec |
| 차례 7 둘째 세션 · 목록 · 홈 · 밀린 첨삭 · 되살림 | B3 | 코드 Changes requested · I 1 · M 3(`review-p11-7-code.md` — 일반 카드로 첨삭 대기 칸을 열 때 기다림 표시 없음). 화면 Approved · M 1 + 범위 밖 Important X-1(`review-p11-7-design.md` — 목록 기다림 표시가 쪽 맨 아래 · 영어 글에 Fredoka 미적용, P10 바탕부터). CI 16차 통합 빨강 → fix 7 |
| fix 7 · 8 | B3 | 코드 Approved · 3/3 ADDRESSED · M-2 는 P12 로 · 새 0(`review-p11-fix8-code.md`, fix 7 판정 포함). CI 17 · 18차 초록 |
| fix 8b | B3 | 화면 Approved · M-1 · X-1 ADDRESSED · 새 M 3(`review-p11-fix8b-design.md`, 새 검토자 · CI 19차 사진) → cce2238 |

구현자는 impl-p11b(Opus · high)다. 코드 검토는 rev-p11b(Opus · xhigh)가 모두 했다. 화면 검토는 요청자 지시(10-22 14:1x)로 Fable · max 가 맡았다 — des-p11c 가 차례 5~7 을, 새 세션 des-p11d 가 fix 8b 를 봤다. 5b · 5c · 7 은 CI 빨강을 고친 라운드다(5b 는 코드 재검토의 새 Minor 둘도 닫음). 6 · 6b 와 8 · 8b 는 같은 묶음의 코드 몫과 화면 몫을 나눠 낸 것이다. fix 8b 재검토의 새 Minor 셋(N-1~N-3)은 cce2238 에 들지 않고 장부 99행으로 갔다.

### 커밋(작업 가지, 바탕 726198f 위 셋)

| 커밋 | 시각 | 파일 · 줄 | 담은 것 | 커밋한 때 |
|---|---|---|---|---|
| 84b0669 | 10-22 15:59 | 34 · +3,781 −92 | 차례 5 · fix 5 · 5b · 5c | CI 13차 초록 · 재검토 둘 Approved 뒤 |
| 56acaec | 10-22 17:13 | 17 · +2,967 −16 | 차례 6 · fix 6 · 6b | CI 15차 초록 · 코드 재검토 Approved 뒤 |
| cce2238 | 10-22 19:11 | 30 · +2,514 −195 | 차례 7 · fix 7 · 8 · 8b | CI 19차 초록 · 재검토 둘(코드 fix 8 · 화면 fix 8b) Approved 뒤 |

셋을 합치면 54 파일이다(새 20 · 고침 34, 726198f → cce2238 +9,149 −190 줄). 셋 모두 push 했다. 커밋에 대한 요청자 지시는 장부에 기록이 없다. 마이그레이션은 더하지 않았다(계획대로). 79ee1cc 와 726198f 사이 커밋 셋은 P11b 코드가 아니다. eb1682c 는 컨트롤러 핫픽스(말하기 단추의 듣는 중 고리, 요청자 iPad 지적 10-22 13:5x)이고, 72009f3 · 726198f 는 intent 를 문서 가지와 맞춘 것이다.

### CI(가지 `ci/p11-c2`)

이 Mac 은 새 Postgres 가 뜨지 않아 통합 · e2e 는 CI 에서만 돌렸다(plan-p11a 가정 (다)). CI 가지는 차례 · fix 마다 작업 트리를 다시 올렸다. 가짜 AI webServer(C81)의 첫 바퀴는 9차다.

| 차 | CI 가지 커밋 | run | 차례 | 결과 | 사진(장) |
|---|---|---|---|---|---|
| 9 | c9e2a60 | 39726243762 | 차례 5 | e2e 1 실패 — 시험이 이름 가림 전 문장을 찾음(시험 결함, `writing.spec.ts` 447). 나머지 초록 | 91 |
| 10 | b32a418 | 39727795150¹ | 시험 단언 고침 | 전부 초록¹ | 109 |
| 11 | 60e4858 | 39731870212 | fix 5 | e2e 1 실패 · 66 통과 — 이유 줄 표지 `data-fix-reason` 이 DOM 에 없음(앱 표지 결함, 492) | — |
| 12 | fbb8a07 | 39733003650 | fix 5b | e2e 1 실패 · 66 통과 — 쓰기 5단계 고친 화면이 가로(1180 × 820)에서 문서 높이 869 로 넘침(`fitsBothWays`, 495) | — |
| 13 | ac62bcd | 39734679449 | fix 5c | 전부 성공 | 121 |
| 14 | e4b1e83 | 39741128570 | 차례 6 | 전부 성공 | 139 |
| 15 | dd5f686 | 39744818965 | fix 6 · 6b | 전부 성공 | — |
| 16 | 4992236 | 39747989104 | 차례 7 | 통합 1 실패 · 166 통과 — 시험 도우미 `submitted()` 가 되살린 진행 시도를 집음(AC-8k, 606). e2e 는 17차를 올리며 취소 | — |
| 17 | 665f397 | 39748532706 | fix 7 | 전부 성공 | 154 |
| 18 | 2c5c0f3 | 39755034190 | fix 8 | 전부 성공 | — |
| 19 | d75806d | **39757529426** | fix 8b | **전부 초록**(e2e 9분 38초) | 158 |

¹ 10차 run 번호 · 결과는 장부에 없어 화면 검토 브리프 `task-p11-review-5-design.md` 덧(14:4x)에서 옮겼다. 사진 수는 화면 검토 보고의 셈 109 를 따랐다(브리프 덧은 9차와 같은 91 로 적음).

'—'는 내려받은 사진 세트 기록이 없다는 뜻이다. 차례 7 사진은 17차에서 받았다. 차례 7 화면 검토 보고 머리의 '16차'는 이 17차 사진이다(검토 브리프 덧). 19차 d75806d 는 차례 7 작업 트리와 같다.

CI 19차(10-22 18:4x 시작, 18:5x 확인):

| 작업 | 결과 |
|---|---|
| 전체 | 전부 초록(작업별 줄은 원문에 없음) |
| unit | 509 통과(덧 — 구현 보고 로컬과 같은 트리, 54 파일 · 6 todo) |
| integration | 원문에 수 없음. 편집자 셈 168(P11a 끝 151 + P11b 시험 선언 17) |
| e2e | 원문에 수 없음. 편집자 셈 77(63 + 14). 9분 38초, Fredoka 로 넓어진 글에서도 넘침 단언이 흔들리지 않았다 |
| 사진(e2e-photos) | 158장 = P11a 77 + P11b 81(아래 표) |

P11b 사진 81장(두 방향, 편집자가 구현 보고의 사진 이름으로 셈 — 세트 수 109 · 121 · 139 · 154 · 158 과 차례마다 맞음):

| 묶음 | 장 | 사진 이름 |
|---|---|---|
| 쓰기 4~5 | 32 | `p11-writing-{4,5}-{task,blank,write,check,options,pick-again,fixed,own}` |
| 기다림 · 안전 상한 | 12 | `p11-wait-{hint,line,timeout-next}` · `p11-ai-rest-{list,session,past}` |
| 쓰기 6 첫 세션 · 이어 하기 | 19 | `p11-writing-6-{task,thinkout,thinkout-typing,draft,draft-written,sent,feedback-ready,fallback}` · `-draft-long`(가로만) · `p11-resume-draft` |
| 둘째 세션 · 되살림 · 홈 · 목록 | 18 | `p11-writing-6-{rewrite-praise,rewrite-correction,rewrite,model-answer,own-speak,restored}` · `p11-home-feedback` · `p11-lesson-start-{wait,still-reading}` |

사진은 컨트롤러가 내려받아 두었고 커밋 밖이다.

### 로컬 관문(DB 를 쓰지 않는 것, 이 Mac — fix 8b 뒤)

| 명령 | 마지막 결과 |
|---|---|
| `pnpm biome ci .` · `pnpm exec tsc --noEmit` · `pnpm build` | 0(차례 7 셈 320 파일) · 0 · 성공 |
| `pnpm test` | 54 파일 · 509 통과 · 6 todo |
| `pnpm check:deps` · `pnpm check:bundle` | 위반 0(차례 7 셈 모듈 167 · 의존 790) · 위반 0 |
| `pnpm check:ids` | design-number 35(바탕 그대로 — P11b 파일에서 새 줄 0, 기술 상한은 이름 붙인 대문자 상수) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0(missing-test 21 → 19(차례 5) → 17(차례 6), 차례 7 뒤 수는 기록 없음) |
| 녹음 API(`getUserMedia` · `MediaRecorder`) | src 에 없음(편집자 grep — '쓰지 않음' 주석 한 줄뿐) |
| 비밀값 grep | 따로 돌린 기록 없음. 차례 5 코드 검토가 `tests/e2e` 에 실제 API 주소 · 키 글자가 없음을 확인했다. CI bundle-secrets 는 9~19차 모두 초록 |
| `pnpm test:int` · `pnpm e2e` · `pnpm e2e:local` | 로컬에서 못 돌림 → CI 19차 |

| 시험 | P11b 가 더한 것 | P11b 끝(cce2238) |
|---|---|---|
| 단위 | +15 — 494 → 500(차례 5) → 504(fix 5) → 507(차례 6) → 509(차례 7), 파일 52 → 54 | 54 파일 · 509 · 6 todo |
| 통합 | +17 — writing-check 4 · writing-feedback 10 · safety-cap 2 · placement 1(편집자가 시험 선언을 셈, 구현 보고의 차례별 수와 같음) | 168(편집자 셈 — CI 16차 '166 통과 · 1 실패'가 fix 8 전 167 과 맞음) |
| e2e | +14 — writing 7 · timeout 3 · resume 2 · home 1 · font-size 1, speaking 단언 고침(P11a fix 4 넘김) | 77(편집자 셈 — CI 11 · 12차 '66 통과 · 1 실패'가 차례 5 뒤 67 과 맞음) |
| e2e-local | 0 | 7(P11a 끝 그대로 — P11b 가 바꾼 파일 없음) |

증명 표 대조(편집자, cce2238 의 시험 글을 읽기만): 증명 표의 시험 이름 스물넷이 모두 글자 그대로 시험 선언 줄에 있다(건너뜀 · todo 없음). 둘은 증명 표의 파일 칸과 자리가 다르다. AC-2e 통합과 '둘째 세션: 첨삭이 대기면 …' 통합은 `session-start.test.ts` 가 아니라 `tests/integration/writing-feedback.test.ts`(643 · 705행)에 있다(다르게 한 것 15). '공통' 줄의 '기존 e2e 가 가짜 AI 서버를 붙인 뒤에도 초록'은 CI 9차(P11b 새 시험 하나만 빨강)와 10차(전부 초록)가 보였다. 증명 표 밖으로 더한 시험은 스물둘이다(단위 열셋 · 통합 다섯 · e2e 넷 — `{NAME}` 채움 셋 · Codex 지적 둘 · 빠진 앞 활동 · 목록 기다림 둘 · 글꼴 등). 완료 판정 '쓰기 4~12'의 근거는 4 · 5 · 6단계 견본 e2e 다. 7~12단계는 같은 길(writing.split_from_level 부터 두 세션)이지만 시험용 수업이 없어 따로 돈 기록은 없다.

### 프리뷰 확인(P11 가지 별칭)

| 때 | 판 | 확인한 것 |
|---|---|---|
| 10-22 15:5x | — | H4 됨 — Vercel 환경 변수에 Anthropic 키(이름만 확인, 값은 보지 않음). 다음 배포부터 프리뷰 AI 호출이 된다(위험 5 · 정할 것 ㅂ 풀림). 운영 전 H8 때 개발용 키로 바꾼다 |
| 10-22 15:5x | — | 개발용 DB 손질(아래 '공용 변경' 끝 줄) |
| 10-22 16:0x | 84b0669 | 배포 READY · 접근 제출 204 · 홈 200 · 쓰기 수업 목록 200('4단계' · '여기부터 해요' · 단원 1) · 말하기 수업 목록 200. 상태표 아티팩트 갱신 · 요청자에게 쓰기 프리뷰 안내 |
| 10-22 16:5x | 84b0669 | 요청자 "올려줘" → 요청자 프로필을 쓰기 5단계 단원 1 로 → 쓰기 목록 '5단계' · '여기부터 해요' |
| 10-22 17:1x | 56acaec | push 뒤 배포가 떴다(확인 줄은 기록 없음). 쓰기 6단계 첫 세션 코드가 올랐지만 시험용 6단계 수업이 개발용 DB 에 없다 |
| 10-22 19:0x | cce2238 | 차례 7 push — 배포 확인은 컨트롤러 몫 |

plan-p11a '화면을 보는 차례' 5 행은 '프리뷰는 1단계뿐'이었다. 개발용 DB 손질로 쓰기 4 · 5단계는 프리뷰에서 볼 수 있게 됐다. 쓰기 6~12(첫 세션 · 둘째 세션 · 홈 '첨삭이 왔어요')는 개발용 DB 에 시험용 수업이 없어 프리뷰에서 못 본다. 그 화면은 CI 사진으로 봤다. 요청자는 프리뷰에서 쓰기 4 · 5단계를 써 보고 지적 둘을 남겼다(16:1x 수업 화면 카드 폭 · 16:5x 5단계 과제 글 — 장부 89 · 91행). 수업을 끝까지 해 본 기록은 없다(차례 11).

### 실제 바뀐 파일(※ = 계획과 다름)

계획 표의 손 파일 서른여섯(새 16 · 고침 20) 가운데 서른다섯이 바뀌었다. 안 바뀐 하나는 `tests/integration/session-start.test.ts` 다. 공용 변경 1 은 따로 하나, 계획 표 밖 파일은 열여덟이다(둘째 표). '다르게 한 것' 번호는 아래 절이다.

| 파일 | 신규 / 수정 | 실제 |
|---|---|---|
| `tests/e2e/fake-ai-server.ts` · `tests/e2e/fake-ai.ts` | 신규 | 값 8 대로. `fakeAiRequestsOf(목적)` · `FAKE_PRAISE`(차례 5), `thinkoutReply` · `feedbackReply` · `FAKE_THINKOUT`(차례 6). ※ 시험 앞뒤로 비움(다르게 한 것 5) |
| `src/server/session/ai-context.ts` · `ai-gate.ts` | 신규 | 값 1 · 2 대로. ※ `ai-gate.ts` 가 `dailyUsage` 를 바로 가져옴(다르게 한 것 3) |
| `src/server/writing/index.ts` | 신규 | `checkGuided`(차례 5)와 다시 내보내기. ※ 값 3 의 나머지는 `composition.ts` · `status.ts` 로(다르게 한 것 12) |
| `src/server/actions/writing.ts` | 신규 | `checkGuidedWriting`(5) · `thinkoutNext` · `submitDraft` · `draftFeedbackStatus`(6) · `submitRewrite`(7). 첫 문장 `await requireAccess()` |
| `src/core/session/attempt.ts` | 수정 | 값 4 대로 + `INPUT_VERSION` 내보냄 · `serverActionOnly` · 고친 문장 진행 시도 판정 |
| `src/core/writing/feedback.ts` | 신규 | 값 5 대로 + `feedbackStateOf`(Zod) · 기술 상한 `THINKOUT_ANSWER_MAX` 100 · `DRAFT_TEXT_MAX` 3000(화면 · 서버 같이 씀) |
| `src/components/session/wait-hint.tsx` · `ai-rest.tsx` | 신규 | 값 6 · C50 (2) 대로. ※ 점 셋은 그리는 즉시(다르게 한 것 5) |
| `src/components/session/writing-guided.tsx` | 신규 | 값 7 대로. ※ 5단계 예시문 · 이유 줄(C86) · 입력란 늘림 · 초점 꼴 · 과제 화면 글 줄 · 결과 단계 숨김(다르게 한 것 7~9) |
| `src/components/session/writing-composition.tsx` | 신규 | 값 7 대로. ※ 기기 자판 입력란 · 입력란 늘림(fix 6b, 차례 7 이 `useDraftRows` 훅으로 뽑음) · 낱말 칩 24px(fix 6) · 일기 줄 없음(다르게 한 것 10 · 13) |
| `src/components/session/writing-rewrite.tsx` | 신규 | 값 7 대로(칭찬 · 교정 하나씩 · 고쳐 쓰기 · 모범 답안 · `sentencesOf`). ※ 내 글 읽기는 쓰기 4~5 조각(다르게 한 것 18) |
| `src/server/session/index.ts` | 수정 | 값 9 대로(시작 막음 · draft · 끝내기 거부 · 둘째 세션 · 되살림 `restoreDraftInto` · 늦은 초고 · 화면 자료 `aiResting` · `guided` · `composition` · `rewrite`). ※ 되살림 조건(다르게 한 것 16) |
| `src/server/actions/session.ts` | 수정 | `startLesson` = `startLessonAfterFeedback`(차례 7) |
| `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | b 조각 · 안전 상한 안내 · 초고 제출 · 둘째 세션 활동 다섯. 막힌 안내가 끝내기 실패보다 먼저(차례 5 — P11a fix 4 코드 M-2) · 빠진 앞 활동으로 되돌아가기(fix 6) |
| `src/app/(child)/result/[id]/result-view.tsx` · `src/server/session/result.ts` | 수정 | 값 10 대로(차례 6). ※ 안전 상한 안내(차례 5) · '첨삭 보기'가 둘째 세션 · '아직 글을 살펴보고 있어요'(차례 7) · 기다림 값 `waitHintSeconds` 를 늘 실음(fix 8) |
| `src/core/lesson-list/state.ts` | 수정 | 값 11 대로. ※ 첨삭 대기 · 온 칸을 '여기부터 해요' 후보에서 뺌(다르게 한 것 17) · 보강 칸 둘째 세션 종류는 P12(다르게 한 것 21) |
| `src/server/lesson-list/index.ts` | 수정 | 계획대로(`writingDraftsOf` · `feedbackReady` · 세션의 `writingPart`) |
| `src/app/(child)/[area]/lessons/lesson-board.tsx` · `use-lesson-start.ts` | 수정 | 계획(B3)대로 '첨삭 보기' · 대기열 비우기 · '아직 글을 살펴보고 있어요'. ※ 안전 상한 안내를 차례 5 에 당김 · 시작 훅 기다림 표시(fix 8) · 누른 카드 아래 자리(fix 8b)(다르게 한 것 4 · 19) |
| `src/server/home/index.ts` | 수정 | 값 12 대로(`feedbackReady` · 최근 성적에서 점수 없는 세션 · 둘째 세션 뺌) |
| `src/app/(child)/page.tsx` · `home-cards.tsx` | 수정 | 값 12 대로(홈 진입마다 `after(retryPendingFeedback)` — 쿠키 · 헤더는 after 밖, '첨삭이 왔어요' 포스트잇 `FeedbackNote`) |
| `tests/unit/session-attempt.test.ts` | 수정 | +4(b 시도 꼴 셋 · AI 가 필요한 수업) |
| `tests/unit/writing-feedback-state.test.ts` | 신규 | 셋(증명 하나 · 채점표 점수 · 글자 상한) |
| `tests/unit/lesson-list-state.test.ts` | 수정 | +2(증명 하나 · 시작 판정) |
| `tests/integration/writing-check.test.ts` | 신규 | 넷(증명 셋 · 이름 채움) |
| `tests/integration/safety-cap.test.ts` | 수정 | +2(증명 하나 · 쓰기 확인 도중 닿음). 둘째 세션 몫 단언(fix 8 — 차례 5 정할 것 2 닫힘) |
| `tests/integration/writing-feedback.test.ts` | 신규 | 열(증명 여덟 · `{NAME}` 채움 둘) |
| `tests/integration/session-start.test.ts` | 수정 | ※ **안 바뀜** — 증명 둘을 `writing-feedback.test.ts` 에 둠(다르게 한 것 15) |
| `tests/e2e/writing.spec.ts` | 수정 | +7(증명 다섯 · 첨삭 기다리는 칸 기다림 표시 · '아직 글을 살펴보고 있어요') |
| `tests/e2e/timeout.spec.ts` | 신규 | 셋(AC-N10 · AC-N6 · AC-8d) |
| `tests/e2e/resume.spec.ts` | 수정 | +2(AC-6a 초고 · 빠진 앞 활동) |
| `tests/e2e/home.spec.ts` | 수정 | +1(AC-2a 첨삭 몫) |

계획 표 밖 열여덟:

| 파일 | 신규 / 수정 | 까닭 · 차례 |
|---|---|---|
| `src/core/writing/guided.ts` · `tests/unit/writing-guided.test.ts` | 신규 | 차례 5 — 화면 · 서버가 같은 함수로 문장을 만들고 고칠 곳 자리를 찾음(`frameParts` · `assembleSentence` · `fixSpotOf` · `applyFix`). fix 5 — `ownRepeatStopOf` · `BLANK_TEXT_MAX` 60. 단위 넷 |
| `src/server/writing/composition.ts` · `status.ts` | 신규 | 차례 6 · 7 — 쓰기 서버 나눔(다르게 한 것 12) |
| `src/core/ai/mask.ts` · `tests/unit/mask.test.ts` | 수정 | fix 5 — `fillNameDeep`(다르게 한 것 6), 단위 +1 |
| `src/lib/attempt-queue.ts` · `tests/unit/attempt-queue.test.ts` | 수정 | fix 5 — Codex 지적 2, 단위 +1 |
| `src/server/placement/index.ts` · `tests/integration/placement.test.ts` | 수정 | fix 5 — Codex 지적 3, 통합 +1 |
| `src/components/session/speaking.tsx` | 수정 | 차례 5 — `RepeatActivity` 선택 속성 `guide` · `ringGapClassName`(쓰기 카드 하늘 틈) · '같이 말해 볼까요' 바른 답 36px(P11a fix 4 N-1). fix 5 — '한 번 더 말하기' 끝 맞춤(화면 M-6) |
| `tests/e2e/speaking.spec.ts` | 수정 | 차례 5 — P11a fix 4 코드 재검토 M-1 단언(AC-5c '쓸 수 없음' 기기 · AC-5b 고리 줄어듦) |
| `src/app/(child)/[area]/lessons/past/page.tsx` · `past-lessons.tsx` | 수정 | 차례 5 — 안전 상한 안내(B3 몫을 당김). fix 5 — 안내 동안 띠 '수업 목록' 뺌(코드 M-2 · 화면 M-5). fix 8 — 기다림 값 |
| `src/app/(child)/[area]/lessons/page.tsx` | 수정 | 차례 7 · fix 8 — 쪽이 `ui.wait_hint_seconds` 를 읽어 목록에 넘김 |
| `tests/e2e/lessons.ts` | 수정 | 견본 · 도우미 — `guidedSample` · `openLessonSession`(5), `compositionSample`(6), `insertReadyDraft` · `READY_FEEDBACK` · `READY_DRAFT` · `claimed`(7 · fix 8b) |
| `src/app/globals.css` · `tests/e2e/font-size.spec.ts` | 수정 | fix 8b — `:lang(en)` Fredoka(X-1, 다르게 한 것 20) · 글꼴 e2e +1 |

### 공용 변경

| # | 실제 |
|---|---|
| 1 `playwright.config.ts`(C81) | 차례 5 브리프대로 구현자가 적용했다. `E2E_AI_PORT` 54349 · `E2E_FAKE_AI_KEY`(가짜 서버만 받는 시험 키) · webServer 둘째 `fake-ai`(DB 다음 · Next 앞, 준비 줄 `FAKE_AI_READY`, SIGTERM 종료) · Next env 에 `ANTHROPIC_BASE_URL` · 시험 키, `VERCEL_ENV` 를 지움. 첫 관문 '기존 e2e 전부 초록'은 CI 9차(P11b 새 시험 하나만 빨강)와 10차가 보였다 |
| 계획 밖 — 개발용 DB(Supabase) 손질 | 컨트롤러(10-22 15:5x · 16:5x, 임시 스크립트는 실행 뒤 지움). 쓰기 4 · 5단계 단원 1 에 시험용 견본 수업(guided) 정규 3개씩 · 집 설정 `seed.complete_through_level` 1 → 5 · 요청자 프로필을 쓰기 4단계 단원 1 → 5단계 단원 1 로. 쓰기 6단계 수업은 넣지 않았다 |

### 계획과 다르게 한 것

1. **쓰던 글(4~5)은 기기 입력으로만 되살린다**(컨트롤러 결정 10-22 · review-p11-5-code M-3 · 장부 80행). plan-p11a 값 4 · 이 plan 값 7 의 '`writing-guided` 진행 시도 `{ sentences }` 로 되살림'과 다르다. 글자마다 진행 시도를 보내면 대기열이 넘치고, 다른 기기에서 이어 쓰기는 드물다. 시도 꼴은 받게 남겨 두었다.
2. **4 · 5단계 화면 세부**(차례 5 다르게 1~3 · 9). 넣는 꼴은 단계 규격 `amount.input`(word-box · slot)으로 가르고, 없으면 화면 자료가 던진다. 단어 상자는 시드 `sentences[].wordBox` 대로 문장마다다(과제 화면은 모든 문장 낱말을 한 상자로). 문장 쓰기 화면 첫 줄은 시드 과제 글이다. '내 문장 듣고 따라 말하기'의 '건너뛰기'는 활동 전체를 건너뛴다. 마이크 막힘은 쓰기 세션을 막지 않고 그 활동만 `no_mic` 로 넘긴다.
3. **쓰기 확인 서버 길**(차례 5 다르게 4~7). 같은 활동에 다른 시도 id 의 끝 시도가 있으면 그 결과를 돌려준다. 같은 시도 id 가 동시에 둘 닿는 경합은 막지 않는다 — 저장은 하나이고 짧은 호출 하나가 늘 뿐이라 검토가 받았다. 아이 문장에서 자리를 못 찾는 고칠 곳은 내지 않는다. 서버에서 던진 오류는 실패 이유 `error` 시도로 남기고 넘어가며, 저장까지 실패하면 `unavailable` 이다. `aiRestingToday` 는 `@/server/ai/store` 의 `dailyUsage` 를 바로 가져온다(읽기 함수라 SDK 에 닿지 않음).
4. **안전 상한 안내를 목록 · 지난 수업 · 결과 화면에 차례 5 에 당겼다**(차례 5 다르게 8 — plan 표는 B3). e2e 가 목록 화면을 거쳐야 해서다. 지난 수업 쪽은 fix 5 가 안내 동안 띠 '수업 목록'을 뺐다. 하던 쓰기 4~5 세션을 상한 날 다시 열면 남은 활동이 내 문장 듣기뿐이어도 안내한다(차례 5 정할 것 1 — 값 9 글자 그대로).
5. **기다림 표시 · 가짜 AI**(차례 5 다르게 10 · 11). `WaitHint` 는 첫 값을 기다리지 않고 그리는 즉시 보인다(첫 값은 '이 안에' 상한). AI 기다림 e2e 는 가짜 서버 규칙을 시험 앞뒤로 비운다(값 8 의 `beforeEach` 에 `afterEach` 를 더함).
6. **이름 채움을 값 전체에 거는 함수로**(review-p11-5-code I-1 → fix 5). 계획 표 밖 `src/core/ai/mask.ts` 에 `fillNameDeep` 을 더했다. 쓰기 확인 · 생각 꺼내기 · 둘째 세션이 돌려주는 AI 글의 `{NAME}` 을 영어 이름으로 채우고, 저장은 가린 글 그대로다. 고칠 곳 자리는 채운 글로 찾는다. 차례마다 통합 시험 하나씩으로 지켰다(fix 5 · fix 6 · fix 8).
7. **C86 — 고친 뒤 한 문장 이유**(화면 검토 차례 5 M-4 · 컨트롤러). 값 7 에 없던 줄이다. 바르게 고친 뒤 '잘 고쳤어요!' 아래에 AI 이유 한 줄을 보이고, 고르기 전 · 틀린 보기 뒤에는 없다. CI 11차는 이 줄의 표지가 DOM 에 없어 빨강이었다(fix 5b — `GuideLine` 이 data 속성을 넘기지 않음).
8. **5단계 예시문 · 결과 단계**(화면 검토 차례 5 I-1 → fix 5 · 5c, 컨트롤러 결정). 값 7 에 없던 예시문을 5단계 문장 쓰기 화면에 더했다(4절 '예시문 아래 바꿀 칸만'). fix 5 는 결과 단계에도 예시문 · 과제 줄을 두었으나 CI 12차에서 가로 화면 높이가 넘쳤다. fix 5c 는 결과 단계에서 과제 줄 · 예시문을 숨기고 문장 간격을 24 → 8px 로 줄였다. 결과가 오면 문장 줄이 위로 뜨는 것은 한 화면에 드는 쪽을 고른 결과다.
9. **fix 5 화면 세부**(fix 5 다르게 3 · 4 · 5). 5단계 입력란은 `field-sizing` 대신 `size` 속성으로 늘인다(iPad Safari 지원 미확인) — `max-w-full` · `maxLength` 60. '한 번 더 말하기' 끝 맞춤은 공용 조각 기본값이 아니라 그 줄 단추에만 `-mx-3` 이다. 마이크를 쓸 수 없음은 기기 상태만 남기고 기기 알림은 남기지 않는다.
10. **초고 입력은 기기 자판 입력란**(차례 6 정할 것 1 — 컨트롤러 받음). 차례 6 브리프의 '앱 안 영문 자판'과 다르고, 4절 쓰기 세션 행 '6단계부터 자유 입력란 · 기기 자판'과 값 7 을 따랐다. 입력란은 글에 맞춰 5줄에서 가로 8 · 세로 10줄까지 늘어난다(화면 검토 차례 6 M-2 → fix 6b). 줄 수는 화면 꼴 상수다(설정값 아님).
11. **초고 제출 · 끝내기**(차례 6 다르게 2 · 4 · fix 6). `submitDraft` 는 앞 활동 끝 시도가 다 있어야 받는다. draft 세션의 `finishLessonSession` 은 거부한다(값 3 을 서버에서도 지킴). 두 번 낸 뒤에도 빠진 앞 활동이 있으면 이 기기 대기열에 없는 첫 활동으로 돌아간다(a 끝내기와 같은 꼴, 안내 문구 없음).
12. **쓰기 서버를 셋으로 나눴다**(차례 6 다르게 3). plan 은 `src/server/writing/index.ts` 하나였다. `composition.ts`(생각 꺼내기 · 초고 · 첨삭 · 고쳐 쓰기 · 밀린 첨삭)와 `status.ts`(첨삭 상태 읽기 — AI 층을 가져오지 않음)를 두고 `index.ts` 가 다시 내보낸다. 결과 화면 서버는 `status.ts` 만 읽는다.
13. **'쓸 수 있는 단어' · 일기**(차례 6 다르게 5 · 7). '쓸 수 있는 단어'는 P9b 정규화 그대로(수업 새 단어 먼저 + 그 단계 어휘 범위 낱말만)다. 일기 과제 '부모님도 볼 수 있어요'는 그리지 않았고, 정할 것 ㄹ 의 '그 줄 자리'도 두지 않았다(시드 표시 칸 없음 — 컨트롤러가 받음, 화면 검토 차례 6).
14. **차례 6 의 '첨삭 보기' 임시 길**(차례 6 정할 것 2). 차례 6 의 결과 화면 '첨삭 보기'는 그 수업의 새 첫 세션을 열었다. 차례 7 의 둘째 세션 판정으로 닫혔다. 56acaec 판에 이 길이 있었지만 개발용 DB 에 6단계 수업이 없어 프리뷰에서는 닿지 않았다.
15. **통합 시험 자리**(차례 7 다르게 1). 증명 표의 AC-2e 통합 · '둘째 세션: …' 통합은 `session-start.test.ts` 가 아니라 `writing-feedback.test.ts` 에 있다(쓰기 6단계 견본 · 가짜 AI 바탕이 그 파일에 있어서). 이름은 증명 표 글자 그대로다.
16. **되살림 조건 · 시점**(차례 7 다르게 2 · 3). 같은 칸의 가장 최근 첫 세션이 중단일 때만 되살린다. 값 9 의 '가장 최근의 중단된 첫 세션(첨삭 못 함 · 대기 초고가 없는 것)'보다 좁고, AC-2e(되살림)와 AC-8k('첨삭 못 함' 뒤 빈 새 초고)를 한 규칙으로 맞춘다(코드 검토가 받음). 되살림은 새 첫 세션을 넣는 트랜잭션 안에서 시도로 옮긴다. 생각 꺼내기 끝은 `restored` 를 붙여 건너뛴다.
17. **'여기부터 해요' 후보**(차례 7 다르게 4). 첨삭 대기 · 온 칸은 '여기부터 해요' 새 수업 후보에서 뺀다(값 11 에 없던 세부). 온 칸은 맨 위 '첨삭 보기'가 맡고, 대기 칸은 골라도 '아직 글을 살펴보고 있어요'뿐이어서다.
18. **내 글 읽기 · 대기열 비우기**(차례 7 다르게 5 · 6). '내 글 소리 내어 읽기'는 쓰기 4~5 조각을 그대로 쓴다(먼저 읽어 준 뒤 '말하기' · '건너뛰기' — 화면 검토가 두기를 권함). 고르기 전 대기열 비우기는 시작 훅이 대기열을 새로 만들어 보낸다(목록 · 지난 수업 · 결과 · 홈이 같은 길).
19. **기다림 표시 자리**(review-p11-7-code I-1 → fix 8, 화면 M-1 → fix 8b). 시작 훅은 `ui.wait_hint_seconds` 첫 값이 지나도 서버가 돌아오지 않으면 기다림 표시를 켠다('첨삭 보기'는 바로). 목록에서는 그 표시와 '아직 글을 살펴보고 있어요'를 누른 카드 바로 아래에 그린다. 같은 줄 카드 높이를 맞추려고 카드에 `flex-1` 을 줘 그 줄 카드가 함께 길어진다(→ N-1). 오류 줄은 쪽 맨 아래 그대로다(→ N-2).
20. **영어 글꼴 Fredoka**(X-1 → fix 8b, 계획 밖). 차례 7 화면 검토가 범위 밖 Important 로 찾았다. P10 바탕부터 `:lang(en)` 규칙이 없어 영어가 Gowun Dodum 의 라틴 글자로 그려졌고, 앞선 화면 검토들의 'Fredoka' 판정은 오판이었다. `globals.css` 에 `:lang(en)` 한 줄과 글꼴 e2e 를 더했다(닫힌 장부 47행).
21. **보강 칸 둘째 세션 종류는 P12 로**(review-p11-7-code M-2 · 컨트롤러). 지금은 보강 첫 세션의 둘째 세션이 regular 이고, 보강 칸은 첫 세션만으로 끝난 것이 된다. 보강 발급이 P12 라 지금은 닿는 길이 없다(장부 97행).
22. **실패 길 힌트는 한국어**(화면 검토 차례 6 M-1 · 컨트롤러 결정). 코드 변화는 없다(힌트 목록에 `lang` 없음). P8 생성 브리프 규칙으로 넘겼다(장부 92행).
23. **시험만 고친 라운드 둘.** CI 9차 뒤에는 이름 가림을 지키는 단언으로 바꿨다(요청 본문에 영어 이름이 없고 `{NAME}` 이 있는지). fix 7 은 되살림으로 초고 활동에 행이 둘 생겨 시험 도우미가 `awaiting_feedback` 행을 고르게 했다. 앱 쪽 초고 행 고르기는 모두 첨삭 대기 상태나 끝 시도 꼴만 본다(재검토 확인).

### Codex 지적 2 · 3(`review-codex-2026-10-19.md`)

컨트롤러 판정표는 둘을 '차례 6 브리프'에 적었으나 fix 5 에 넣었다. 코드 재검토(`review-p11-fix5-code.md` 13 · 14)가 닫았다. 열린 장부 77 · 78행은 닫힘 표시 없이 남아 있다.

| 지적 | 고친 것 | 시험 |
|---|---|---|
| 2 여러 탭에서 끊긴 채 저장한 답이 사라짐 | `src/lib/attempt-queue.ts` `add()` 가 저장 전에 `mergeStates(load(storage), state)` | 단위 "대기열: 한 기기 저장소를 쓰는 두 쪽(탭)이 끊긴 채 각각 쌓아도 둘 다 남는다"(고치기 전 실패를 봄) |
| 3 배치 평가 트랜잭션 안에서 바깥 연결을 다시 잡음 | `src/server/placement/index.ts` `screenOf` · `pictureLookup` 이 `DbOrTx` 를 받고 트랜잭션 안 셋이 `tx` | 통합 "배치 평가: 답 저장 트랜잭션 안의 다음 문항 화면은 그 트랜잭션 연결로 읽어 연결 하나짜리 풀에서도 끝난다"(10초 마감) |

지적 1 · 5 · 6 은 요청자 결정(H2 · 통합 가지 · 성공 기준)이고 P11b 몫이 아니다.

### 안 한 것(계획에 있었음)

1. **`tests/integration/session-start.test.ts` 고침** — 증명 둘을 `writing-feedback.test.ts` 에 두어 안 바뀌었다(다르게 한 것 15).
2. **쓰던 글 진행 시도(값 4 · 7)** — 기기 입력만이다(다르게 한 것 1).
3. **일기 표시 줄 자리(정할 것 ㄹ)** — 그리지 않았다(다르게 한 것 13).
4. **공통 증명의 로컬 통합 · e2e · e2e-local** — CI 19차로 대신했다(가정 (다)). 비밀값 grep 은 따로 돌린 기록이 없다.
5. **차례 11 [사람] 요청자 프리뷰 시험 · iPad 실기(H2)** — 남았다.

### 남긴 것

- **P11c 차례 또는 전체 디자인 리뷰(먼저 오는 쪽, 장부 99행)**: fix 8b 재검토의 새 Minor 셋. N-1 가로 화면에서 '아직 글을 살펴보고 있어요'가 130px 칸 안 세 줄로 접히고 같은 줄 카드 넷이 92px 길어짐. N-2 오류 줄이 쪽 맨 아래라 실시드 세로에서 보는 창 밖이고, 실패 뒤 고른 표시가 남음. N-3 읽기 지문 낱말 판에서 Fredoka 줄바꿈으로 마침표가 줄 머리로 떨어짐.
- **전체 디자인 리뷰(장부 90행 — 회화 1단계 뒤 · P12 전)**: X-1 전수 확인의 남은 둘(첫 실행 영어 이름 입력란 · 회화 화면, 닫힌 장부 47행). `review-p11-7-design.md` 참고 1~6(세션 카드 폭 = 장부 89행 · 둘째 세션 카드가 짧음 · 교정 화면에 문맥 없음 · '첨삭이 왔어요'에 수업 제목 없음 · 경합 때 단추 둘 · 둘째 세션 `fitsBothWays` 없음, 참고 7 은 fix 8b 재검토가 닫음). `review-p11-fix8b-design.md` 참고 넷(앞 참고 그대로 · 5단계 빈칸 줄 마침표가 입력 상자와 떨어짐 · 고르기 실패 뒤 고른 표시 · 카드 높이는 내용이 정한다는 원칙).
- **장부 행 없는 화면 참고(지적 아님)**: `review-p11-6-design.md` — '직접 쓸래요' 뒤 보기로 돌아가는 길 없음 · 초고 입력란 보조 기술 이름 없음 · 첨삭 기다림 둘째 줄 문구(정할 것 ㄷ 그대로, 컨트롤러 판단). `review-p11-fix5-design.md` — 5단계 빈 입력란 아래 테가 실선(4단계 빈칸은 점선) · 긴 글에서 입력란이 늘어나는 사진 없음.
- **P12**: 보강 칸의 쓰기 6~12 둘째 세션 종류와 끝남 판정(장부 97행 · review-p11-7-code M-2) — 보강 발급 · 단원 통과 셈과 함께. 위 '다른 P 에 넘길 것' P12 줄(쓰기 두 세션 셈 · 별은 둘째 세션 끝 · 단계 평가 `forLevelTest: true` · 홈 최근 성적)은 그대로다.
- **P8**: 쓰기 과제 글은 그 단계 입력 꼴(4 단어 상자 · 5 자판 · 6~ 자유 쓰기)과 맞추고 검증기에 입력 꼴별 금지 낱말(장부 91행 (3)). 6~12 실패 길 시드 힌트는 한국어 해요체(장부 92행). 위 '다른 P' P8 줄 그대로.
- **컨트롤러**: (1) 시험 견본 `guidedSample(5)` 의 과제 글을 5단계 것으로 — 장부 91행 (2)는 '차례 7' 몫으로 적혔으나 차례 7 브리프에 없었고, cce2238 의 `tests/e2e/lessons.ts` 는 4단계 수업을 그대로 복제한다. (2) 개발용 DB 5단계 수업 과제 글 고침(장부 91행 (1)) — 한 기록 없음. (3) 쓰기 6단계 시험용 수업을 개발용 DB 에 넣어야 프리뷰에서 6~12 두 세션을 본다. (4) cce2238 배포 확인.
- **1-나**: 위 '다른 P' 1-나 줄 그대로(`aiRestingToday` 에 ai_status · 홈 · 목록 '토리가 잠깐 쉬어요' · 부모 화면 `feedback_failed` · 'AI 쉬는 중'에는 밀린 첨삭 안 부름). 하던 수업에 'AI 활동이 남았는가'를 볼지(차례 5 정할 것 1)도 c · 1-나 몫이다.
- **2차**: 일기 표시 칸(정할 것 ㄹ — P4 규격 + 13절). 색칠 칸 토큰 `bg-postit-reading` 을 뜻에 맞는 이름으로(장부 81행, 디자인 토큰 정리).
- **차례 10(c 마무리)**: AC-N9 크기 훑기에 P11b 화면(쓰기 4~12 · 둘째 세션 · 홈 포스트잇 · 목록 '첨삭 보기')을 더한다(plan-p11a 공용 변경 3).
- **차례 11(사람)**: 요청자 프리뷰 시험(H4 됨 — AI 활동이 실제로 불림) · iPad 실기. 생각 꺼내기 한글 조합(위험 6) · '직접 쓸래요' 입력란 자판(autoFocus 없음 — review-p11-6-design 참고)을 함께 본다.
- **검토자 · 구현자 관찰(장부 행 없음)**: 같은 세션에 다른 시도 id 로 초고를 동시에 내면 둘 다 들어갈 수 있다(두 기기가 같은 순간에 낼 때만 — review-p11-6-code). `fitsBothWays` 는 방향을 바꾼 뒤 한 그림만 기다려 느린 CI 에서 거짓 빨강이 날 수 있다(review-p11-fix6-code — 15~19차는 초록). 첨삭을 잡은 뒤 서버가 죽으면 그 초고는 120초 동안 다른 요청이 부르지 않는다(구현 보고 차례 6 — 다음 진입이 부름). 수업 시작마다 대기열 비우기 요청이 한 번 더 간다(비면 보내지 않음).
- **문서 맞춤**: 워크트리의 intent 사본은 726198f 맞춤 그대로라 이 완료 보고가 없다 — 다음 specs · intent 맞춤 때.

### PR · 합침

- CI 9~19차는 P11a 와 같은 CI 가지 `ci/p11-c2`(P11a 완료 보고의 PR #4)에서 돌렸다. PR 의 지금 상태는 장부에 기록이 없다.
- P13 워크트리에 cce2238 을 합쳤다(합침 ①, 10-22 19:2x — 텍스트 충돌 0 · 손 맞춤 없음, 합친 트리 tsc 0 · biome 0 · 단위 612 · deps 0). review-p11-7-code '합칠 때 볼 자리'의 파일들은 P13 차례 1~3 이 고치지 않아 부딪히지 않았다.
