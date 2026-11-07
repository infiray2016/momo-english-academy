# 구현 브리프: P11b 차례 6 — 쓰기 6~12 첫 세션(생각 꺼내기 · 초고 · 첨삭 보내기 · 결과)(implementer impl-p11b 이어 보기 · Opus · high, 2026-10-22 16:1x)

차례 5 는 커밋 84b0669 로 끝났다(검토 둘 Approved). plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p11b-쓰기-AI-첨삭.md` **작업 2(차례 6)** 가 요구사항 전부다 — 값 5(첨삭 상태 순수 함수) · 값 7(writing-composition) · 값 9(세션 서버 writing_part draft) · 값 10(결과) · 정본 밖 문구 · 정할 것 판정은 plan-p11a 의 같은 이름 절과 함께 글자 그대로. 워크트리 p11(HEAD 84b0669). 이 Mac 은 DB 시험 불가 — 통합 · e2e 는 CI(컨트롤러 push). 시험 먼저. 커밋은 하지 않는다.

## 범위(plan-p11b 작업 2)
`tests/unit/writing-feedback-state.test.ts` · `tests/integration/writing-feedback.test.ts`(AC-4c 통합 · AC-8k · AC-8n 첨삭 몫 · 잡기) → `src/core/writing/feedback.ts`(첨삭 상태 · 채점표 점수 · 세지 않는 실패) · 쓰기 서버 `src/server/writing/index.ts`(생각 꺼내기 `thinkoutTurn` · 초고 · 첨삭 `writeFeedback` 을 `after()` 로 보내기 · 상태) · 액션 `src/server/actions/writing.ts`(`thinkoutNext` · `submitDraft` · `draftFeedbackStatus`) · `src/components/session/writing-composition.tsx`(6~12 과제 · 생각 꺼내기(한국어 질문 + 보기 3개 또는 한글 짧게, 최대 writing.thinkout_max_turns 턴 — 그 턴에 앱이 끝냄) · 초고(생각 요약 · 쓸 낱말 4~6개 · 문장 시작 틀 · 앱 안 영문 자판) · '글을 보냈어요') · 세션 서버(writing_part draft · 화면 자료) · 결과(값 10 — 쓰기 6단계 이상 첫 세션의 결과 꼴) → e2e `writing.spec.ts`(AC-4c 첫 세션, 가짜 AI 로 생각 꺼내기 · 초고 · 첨삭 보내기) · `timeout.spec.ts`(AC-8d 생각 꺼내기 시간) · `resume.spec.ts`(AC-6a 초고 글 되살림). 사진: plan-p11a '화면을 보는 차례' 6 행(생각 꺼내기 → 초고 → '글을 보냈어요' → '첨삭 보기' 자리) 두 방향.

## 차례 5 에서 이어지는 것
- `{NAME}` 채움: 차례 5 fix 5 의 함수(쓰기 확인 `outcomeOf` 자리)를 생각 꺼내기 턴 글 · 첨삭 결과에도 그대로 쓴다(저장은 가린 글, 화면 · 읽어 주기는 영어 이름). 코드 검토 I-1 의 '차례 6 도 같은 자리에서' 그대로.
- 안전 상한 · AI 쉬는 중 · 기다림 표시 · 실패 갈래마다 화면 길(ledger 'AiOutcome 실패 갈래' 행의 생각 꺼내기 · 첨삭 몫 — 이번에 닫는다): plan 표 '생각 꺼내기 · 첨삭 행'대로. `after()` 첨삭은 실패해도 아이 진행을 끊지 않는다(실패는 둘째 세션 · 밀린 첨삭 몫 차례 7).
- 정본 3.3 피드백 한도: 6~9단계 교정 최대 2 · 10~12단계 3 + 모범 답안(고쳐 쓰기 뒤 — 차례 7 화면), 4절 '한 화면에 행동 하나' · C82 크기 · 해요체. 생각 꺼내기는 한국어, 초고는 영어 자판(앱 안 영문 자판 조각 재사용).
- 시험용 견본: 쓰기 6단계(composition) 견본은 `tests/e2e/lessons.ts` 의 `guidedSample` 처럼 빌더(`writingLesson(ref, 6)`)에서 만든다. 설정 키는 `tests/fixtures/settings.ts`(차례 5 에 더한 writing.thinkout_from_level 등)에서 읽고 숫자를 박지 않는다.
- P13(회화)이 워크트리 p13 에서 `src/server/session/index.ts` · `lesson-list` · 홈을 몇 줄 고친다(plan-p13a '바탕 가지와 겹치는 파일') — 이번 차례는 그 파일의 쓰기 몫만 고치고, 합침은 컨트롤러가 한다.

## 완료 · 보고
로컬 관문(biome ci · tsc · 단위 · check:deps · spec:trace) 초록 → 보고 `task-p11-report.md` '차례 6' 절(바뀐 파일 · 시험 이름 · 다르게 한 것 · 정할 것 · 사진 이름) → SendMessage 한 줄. 컨트롤러가 CI(가지 재생성) → 검토 묶음 B2(code-reviewer rev-p11b · design-reviewer des-p11c Fable max) → fix → 커밋.
