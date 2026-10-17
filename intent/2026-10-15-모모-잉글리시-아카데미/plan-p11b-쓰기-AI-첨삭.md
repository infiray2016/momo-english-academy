# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P11b 쓰기 AI(확인 · 생각 꺼내기 · 첨삭 · 둘째 세션)

spec: `specs/` 정본(3.3 쓰기 표 4~12 행 · 생각 꺼내기 문단 · 개인 정보 문단, 3.5 별(쓰기 6단계 이상은 둘째 세션), 3.7 쓰기 4~5 · 6~12 행 · '점수가 비거나 따로 세는 경우' 표, 4절 첫 문단(기다림 표시 ui.wait_hint_seconds) · 쓰기 세션 행 · 세션 결과 행(쓰기 6단계 이상 첫 세션) · 홈 '그 밖' 행 · 수업 목록 '맨 위 차례' · '여기부터 해요' 행, 5절 sessions writing_part · attempts 상태 · 전이 표 아래 문단('쓰기 6단계 이상 첫 세션이 중단으로 닫히면 …'), 6.1 공통 규칙 · 가림 · 실시간 응답 정규화, 6.2 쓰기 확인 · 쓰기 첨삭 · 생각 꺼내기 행, 8절 'AI 쉬는 중' 표(들어가는 조건 (1) · 동안 · 첨삭을 기다리던 글) · 상황 표(AI 호출 하나의 실패 · 다시 보내도 같은 오류 · 첨삭 대기 · 안전 분류기 거절), 10절 운영(첨삭 재시도는 앱 진입 때 · after()), 11절 1-가 (7), 12절 writing.* · ai.timeout_seconds.* · ai.feedback_max_attempts · ai.safety_daily_* · ui.wait_hint_seconds, 13절 C17 · C50 (2) · C63 · C69, 15절 AC-2a(첨삭 몫) · 2e(초고 몫) · 4c · 6a(초고 몫) · 8d · 8k · 8n(첨삭 몫) · N6 · N10, approved 2026-10-16 06:2x) · 묶음 plan P11 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-18 · 상태: approved(컨트롤러 2026-10-18 04:1x — 요청자 묶음 plan 승인 2026-10-16 아래, P10 하위 plan 과 같은 꼴)
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
| AC-2e(P11 몫) | e2e "AC-2e 쓰기 6단계 초고를 쓰다 다른 수업을 고른 뒤 그 수업을 다시 열면 초고 입력란에 쓴 글이 채워져 있다" + 통합 "AC-2e 중단된 첫 세션의 마지막 초고 글이 같은 수업의 새 첫 세션 화면 자료에 채워지고 중단 뒤 늦게 온 초고 시도도 받는다" | `writing.spec.ts` · `tests/integration/session-start.test.ts` |
| AC-2a(첨삭 몫) | e2e "AC-2a 첨삭이 오면 홈에 '첨삭이 왔어요'가 보이고 누르면 그 수업의 둘째 세션이 열린다" | `tests/e2e/home.spec.ts` |
| AC-6a(초고 몫) | e2e "AC-6a 쓰기 6단계 초고를 쓰다 앱을 닫고 다시 열면 초고 화면에 쓴 글이 그대로 있다" | `tests/e2e/resume.spec.ts` |
| AC-8d(화면 몫) | e2e "AC-8d 응답을 늦춘 고정 표본에서 10초 타임아웃 뒤 생각 꺼내기는 '이번에는 바로 써 볼까요'와 과제 예시 · 시드 힌트가 붙은 초고 화면으로 넘어간다" | `tests/e2e/timeout.spec.ts` |
| AC-N6(1-가 몫) | e2e "AC-N6 쓰기 확인이 ai.timeout_seconds.realtime 을 넘으면 확인 없이 다음 활동으로 넘어간다" | `timeout.spec.ts` |
| AC-N10 | e2e "AC-N10 응답을 늦춘 고정 표본에서 1초 안에 기다림 표시가 보이고 5초 뒤 '확인하고 있어요'가 더해진다" | `timeout.spec.ts` |
| AC-8k | 통합 "AC-8k 같은 초고의 첨삭이 거절로 두 번 끝나면 더 부르지 않고 attempts 가 '첨삭 못 함'이 되며 부모 알림이 생기고 그 수업을 다시 고르면 빈 새 초고 화면이 열린다" | `writing-feedback.test.ts` |
| AC-8n(첨삭 몫) | 통합 "AC-8n 거절이 아닌 까닭으로 같은 초고의 첨삭이 ai.feedback_max_attempts 번 실패하면 '첨삭 못 함'이 되고 부모 알림이 생기며 안전 상한 · 설정 문제는 실패 수에 들지 않는다" | `writing-feedback.test.ts` |
| 쓰기 4~5(AC 접두 없음 — AC-4b 는 P9) | 통합 "쓰기 4~5: 세션 점수는 첫 제출에서 맞다고 본 문장 수 ÷ 문장 수이고 확인이 실패하면 점수가 빈다" · "쓰기 4~5: 같은 시도 id 로 다시 내면 AI 를 다시 부르지 않고 저장한 결과를 돌려준다" · "쓰기 AI: 가변부의 앞 단원 학습 요소는 앞 단계 전부와 같은 단계 앞 단원이다" + e2e "쓰기 4~5: 문장을 다 쓰고 내면 칭찬 한 줄과 고칠 곳 하나가 같은 화면에 보이고 고칠 곳을 누르면 보기 2~3개가 나와 골라 고친다" | `tests/integration/writing-check.test.ts` · `writing.spec.ts` |
| 1-가 안전 상한(AC 접두 없음 — 11절 (7) · C50 (2)) | 통합 "1-가 안전 상한: 그 학습일 호출이 ai.safety_daily_calls 에 닿으면 쓰기 4단계 이상 첫 세션 · 말하기 9단계 이상은 시작되지 않고 둘째 세션 · 읽기 · 쓰기 1~3 은 시작된다" + e2e "1-가 안전 상한: 쓰기 5단계 수업을 고르면 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 '홈'이 보인다" | `tests/integration/safety-cap.test.ts` · `writing.spec.ts` |
| 첨삭 흐름(AC 접두 없음) | 단위 "첨삭 상태: 거절 둘이면 못 함 · 그 밖 실패는 ai.feedback_max_attempts 에서 못 함 · 안전 상한과 설정 문제는 셈이 그대로다" · "목록: 첫 세션만 끝난 칸은 남은 수업이고 둘째 세션이 끝나야 끝낸 수업이며 잠긴 단원 수는 첫 세션으로 센다" + 통합 "첨삭: 같은 초고를 두 요청이 함께 부르면 호출은 하나다" · "첨삭: 앱 진입마다 밀린 첨삭을 오래된 것부터 많아야 둘 부른다" · "둘째 세션: 첨삭이 대기면 시작할 때 한 번 더 부르고 그래도 없으면 대기를 돌려준다" | `tests/unit/writing-feedback-state.test.ts` · `lesson-list-state.test.ts` · `writing-feedback.test.ts` · `session-start.test.ts` |
| 공통 | a 증명 '공통' 줄과 같은 명령 · CI. 기존 e2e 가 가짜 AI 서버를 붙인 뒤에도 초록 | 차례 5 · 6 · 7 |

## 완료 보고 (Done)

구현 뒤 채운다.
