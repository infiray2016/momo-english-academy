# 구현 브리프: P11b 차례 5 — AI 길 · 쓰기 4~5 확인(implementer impl-p11 이어 보기 · Opus · high, 2026-10-18 08:5x 작성 — 차례 4 커밋 뒤 보냄)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p11b-쓰기-AI-첨삭.md`(approved, 13절 C79 · C80 · C81)의 **작업 순서 1(차례 5, 검토 묶음 B1 — code-reviewer + design-reviewer, 목업 B_Writing · 4절 쓰기 세션 행)**. 시작 조건: 차례 4 커밋 뒤 컨트롤러 알림. 워크트리 p11, 커밋 없음. 통합 · e2e 는 CI(사진 `p11-writing-4-*` · `p11-writing-5-*` · `p11-wait-*`). **plan-p11b 의 '요청하는 공용 변경 1'(`playwright.config.ts` — `E2E_AI_PORT` 54349 · `E2E_FAKE_AI_KEY` 상수 · webServer 배열 DB 와 Next 사이에 가짜 AI 서버 · Next env `ANTHROPIC_BASE_URL` · `ANTHROPIC_API_KEY`)은 이 차례에서 구현자가 함께 한다**(C81). 가짜 AI 가 붙은 뒤 기존 e2e 전부가 초록이어야 한다(plan 증명 '공통').

## 먼저 읽을 것
plan-p11b 전부 — 특히 **파일별 값 1(LevelContext) · 2(안전 상한 `aiRestingToday`) · 3 의 공통 + `checkGuided`(생각 꺼내기 · 초고 · 첨삭은 차례 6 · 7) · 4(b 시도 종류 · `aiNeededLesson`) · 6(기다림 표시) · 7 의 `writing-guided.tsx` · 8(e2e 가짜 AI) · 9 의 시작 막음 · `aiResting` 화면 자료** · 'AI 실패 갈래별 화면 길' 표의 쓰기 확인 행 · 정할 것 ㄴ(C80) · ㄷ · ㅁ(C81) · ㅂ · 위험 4 · 5 · 7 · 8 · 증명 표(쓰기 4~5 통합 셋 + e2e 하나 · 1-가 안전 상한 통합 + e2e · AC-N6 · AC-N10 — 이름 글자 그대로). a 의 정본 밖 문구 표 b 행('과제' · '예시' · '단어 상자' · '다 썼어요' · '색칠한 곳을 눌러 고쳐 봐요' · '알맞은 말을 골라요' · '다시 골라 볼까요' · '잘 고쳤어요!' · '내 문장을 듣고 따라 말해 봐요' · '건너뛰기') · 4절 쓰기 세션 행('확인은 같은 화면에') · 6.1 · 6.2(쓰기 확인 규격 · 가변부) · 8절(실패 길 · 안전 상한) · 12절 ai.* · ui.wait_hint_seconds · writing.*. 13절 C50 (2) · C63 (5) · C64 (1) · C77 (6) · C79 · C80 · C81. 코드: P9a `src/server/ai/{client,contract,fake-server}.ts`(`startFakeAnthropicServer` · `messageBody` · `clientOptionsOf`) · P9c `src/server/ai/{index,run,store}.ts`(`checkWriting` · `AiOutcome` · `AiDeps` · `preCallGate` · `dailyUsage`) · P9c `tests/fixtures/ai/samples/*.json` · P7a `readLevelSpec` · `readUnitSpec` · `pickByCell` · P5b `WritingGuidedTask` · 차례 1~4 의 `attempt.ts` · 틀 · 조각 꼴 · a `finishSession`.

## 이번 몫(파일 — plan 표 B1 · 5 행)
- 공용 변경 1 `playwright.config.ts` → `tests/e2e/fake-ai-server.ts`(P9a `startFakeAnthropicServer`, 준비 줄 `FAKE_AI_READY`) · `tests/e2e/fake-ai.ts`(값 8 — `resetFakeAi` · `pushFakeAi` · `fakeAiRequests` · 응답 만들기 `writingCheckReply` 등, DB 쓰는 e2e 파일은 `beforeEach(resetFakeAi)`). **기존 e2e 전부 초록 확인이 첫 관문.**
- `src/server/session/ai-context.ts`(값 1 — 없는 칸은 던짐) · `src/server/session/ai-gate.ts`(값 2) · `src/server/writing/index.ts`(값 3 공통 + `checkGuided` — 같은 시도 id 는 저장 결과 그대로, 실패는 시도 `failed` · `{ ok: false, reason: "skipped" }`, `safety_cap` 은 시도 없이 `ai_resting`) · `src/server/actions/writing.ts`(`checkGuidedWriting`, 첫 문장 `await requireAccess()`).
- `src/core/session/attempt.ts`(값 4 — b 종류 · `aiNeededLesson` · 대기열이 안 받는 종류) · `tests/unit/session-attempt.test.ts`.
- `src/components/session/wait-hint.tsx`(값 6 — `data-wait-hint` · 둘째 값 뒤 '확인하고 있어요' `data-wait-line`) · `ai-rest.tsx`(C50 (2) '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요' + '홈') · `writing-guided.tsx`(값 7 — 과제 화면 '과제' · '예시' · 4단계 '단어 상자' 칩, 문장 쓰기 4단계 누르는 칸 · 5단계 입력란(autoComplete · autoCorrect · autoCapitalize off · spellCheck false · lang en), '다 썼어요', 확인 결과 같은 화면 — 칭찬 한 줄 · 고칠 곳 색칠 → '색칠한 곳을 눌러 고쳐 봐요' → '알맞은 말을 골라요' 보기 → '잘 고쳤어요!' / '다시 골라 볼까요' → '다음', 시드 hints · rubric 안 보임, 내 문장 따라 말하기 '건너뛰기' · 마이크 없으면 건너뜀).
- 세션 서버 · 액션(값 9 — 시작 때 `aiNeededLesson` 이고 `aiRestingToday` 면 `{ ok: false, reason: "ai_resting" }`, 화면 자료 `aiResting`) · 틀(b 조각 · 안전 상한 안내).
- 시험: `tests/integration/writing-check.test.ts`(쓰기 4~5 셋 · '쓰기 AI: 가변부의 앞 단원 학습 요소 …') · `tests/integration/safety-cap.test.ts`(1-가 시작 막음 — P9c AC-8b 그대로) · `tests/e2e/writing.spec.ts`(쓰기 4~5 e2e · 1-가 안전 상한 e2e — 견본 `writingLesson(ref, 4)` · 5단계 복제) · `tests/e2e/timeout.spec.ts`(AC-N6 · AC-N10 — AC-8d 는 차례 6).

## 컨트롤러 결정 · 알릴 것
- 정할 것 ㄴ · ㄷ · ㅁ · ㅂ 은 plan 권함대로(모두 받음). 프리뷰에는 4단계 수업이 없고(시험용 시드 1단계) 개발용 AI 키(H4)도 없어 이 차례의 화면은 e2e 사진으로만 본다 — 요청자에게는 컨트롤러가 알린다.
- 가짜 AI 서버 포트 · 시험 키는 기술 값(파일 위 상수, 비밀값 아님). 실제 Anthropic 키 · 주소는 어디에도 적지 않는다.

## 지킬 것
AI 호출은 서버에서만(서버 액션 · `server-only`), 응답은 Zod(P9c 규격) · 아이 글 · AI 글은 로그 · 오류 · 알림 값에 안 넣음(`safeDbError`) · 같은 시도 id 로 두 번 부르지 않음 · 설계 숫자는 설정(ai.* · ui.wait_hint_seconds · writing.*)에서 · 기술 값은 대문자 상수(C72) · `check:deps`(AI 층은 서버 안) · `check:bundle` · `check:ids` 새 줄 없음 · 아이 화면 원칙 · 문구 표 글자 그대로 · 아이 이름 · 비밀값 없음. 보고 `task-p11-report.md` '차례 5' 절 → SendMessage → CI → 검토 B1.
