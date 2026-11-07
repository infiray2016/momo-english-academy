# 코드 검토: P11b 차례 6 — 쓰기 6~12 첫 세션(생각 꺼내기 · 초고 · 첨삭 보내기 · 결과)(검토 묶음 B2) — code-reviewer rev-p11b(Opus · xhigh, 2026-10-22)

대상: 워크트리 p11(HEAD 84b0669) 작업 트리의 변경 11 · 새 파일 6(CI 가지 ci/p11-c2 e4b1e83 과 같음). 대조: 검토 브리프 `task-p11-review-6-code.md` 볼 것 (1)~(9), 구현 브리프 `task-p11-6.md`, 구현 보고 '차례 6' 절(`task-p11-report.md` 636~714), plan-p11b 값 3 · 5 · 7 · 9 · 10 · 'AI 실패 갈래별 화면 길' 생각 꺼내기 · 첨삭 행 · 위험 2 · 3 · 4 · 제약(139행) · 증명 표, plan-p11a 문구 표 b 행(188~189), 정본 4절(`specs/03-화면.md` 7행 크기 · 18행 쓰기 세션), 6.1(`specs/05-AI-호출.md` 33행), 8절, 13절 C79 · C80.
직접 확인한 것: `pnpm check:deps` 위반 0(모듈 166) · `pnpm check:bundle` 위반 0 · `pnpm check:ids` code-setting-unknown 0 · max-corrections 0 · fixture-setting 0 · design-number 35(새 줄 0, 차례 6 파일에서 나온 줄 0). 증명 표 시험 이름 아홉을 plan 글자와 기계 대조했다(모두 같음). 단위 · 통합 · e2e 는 다시 돌리지 않았다(CI 14차 도는 중).

## 판정: Approved(CI 14차 초록 조건) — Critical 0 · Important 0 · Minor 3

## 1. 설계 준수(브리프 볼 것)

| 볼 것 | 판정 | 근거 |
|---|---|---|
| (1) 생각 꺼내기 | ✅(M-1) | `src/server/writing/composition.ts` `thinkoutStep`: 진행 시도 턴 차례로 앞 턴 기록(저장한 historyEntry 글자 그대로 + 다음 턴의 답), `turn = 턴 수 + 1`, 첫 턴만 답 없음. 마지막 턴은 P9b 가 `done = answer.done \|\| rules.lastTurn` 으로 끝을 강제한다(`src/core/ai/calls/thinkout.ts:151` · `:203` · `:228`, 키 `writing.thinkout_max_turns` — 숫자 박음 없음). 앞 턴 답은 P9b 가 가려 보낸다(`thinkout.ts:157`). 돌려주는 질문 · 보기 · 요약 · 낱말 · 틀은 `fillNameDeep`(composition.ts:203 · 215, 화면 자료 `session/index.ts:1003` · `:1017`), 저장은 가린 글. 화면: 한국어 질문 28px · 보기 셋 · '직접 쓸래요' → 비제어 한글 입력 '한글로 짧게 써도 돼요' · '보내기'(문구 표 188행 글자 그대로) |
| (2) 초고 | ✅(M-2 · M-3) | '내 생각' · '쓸 수 있는 단어'(누르면 읽어 줌) · '이렇게 시작해 봐요', 실패 · 생각 꺼내기 없는 단계는 '예시' + 시드 힌트(8절 · AC-8d), 분량 줄은 단계 규격 `amount`(낱말 범위 먼저 · 없으면 문장 · 둘 다 없으면 던짐), '지금 n단어'. 기기 자판 `textarea`(autoCorrect · autoCapitalize off · spellCheck false · lang en) — 정할 것 1 대로 4절 18행 '6단계부터 자유 입력란 · 기기 자판'. 상한 `DRAFT_TEXT_MAX` · `THINKOUT_ANSWER_MAX` 를 화면 `maxLength` · 서버 Zod 가 같이 쓰고, 단위 '글자 상한 …'이 시도 꼴 상한 안임을 단언. 자동 저장은 멈춘 뒤 `DRAFT_AUTOSAVE_MS` · 입력란을 떠날 때 · 숨을 때 · '홈' 앞(plan 값 7 · 위험 3) |
| (3) `after()` 첨삭 | ✅ | `submitDraft` 는 한 트랜잭션에 초고 끝 시도(`awaiting_feedback` · 대기 0 · 0)와 첫 세션 완료(끝낸 학습일 · 점수 비움)를 쓰고 `schedule(runFeedback)` 뒤 바로 결과 주소(액션 `schedule = after`). `runFeedback` 은 실패해도 던지지 않는다(아이 진행을 끊지 않음). 잡기: 대기이고 `claimedAt` 없음 또는 `AI_WAIT_TIMEOUT_MULTIPLE × ai.timeout_seconds.feedback` 지남(시각은 매개변수, SQL 안 now() 없음), 못 잡으면 안 부름(위험 2). 결과는 `nextFeedbackState`(값 5)로 — 옴: 시도 done · 점수 + 첫 세션 점수, 못 함: `feedback_failed` + `createAlertOnce`(once key · 값 sessionId · reason — 아이 글 없음), 대기: 셈만 · 잡은 시각 지움. 저장하는 첨삭 값은 P9c 가 돌려준 가린 글. 로그는 `dbErrorTag` 이름 · 코드만 |
| (4) 결과(값 10) | ✅ | 제목 '글을 보냈어요. 첨삭이 오면 고쳐 쓰고 별을 받아요', 큰 단추 자리 `WaitHint` → `FEEDBACK_POLL_MS` 마다 상태 → 옴 '첨삭 보기' · 못 함 또는 `submittedAt + ai.timeout_seconds.feedback` 지남 '수업 목록'(작은 '홈'은 띠). 상한이 지난 뒤에도 다시 읽기는 이어져 늦게 온 첨삭이면 '첨삭 보기'로 바뀐다. '첨삭 보기'가 차례 7 전까지 새 첫 세션을 여는 것은 보고 다르게 한 것 6 · 정할 것 2 · '차례 7 에 넘기는 것'에 적혔다 |
| (5) 세션 서버 | ✅ | 시작: 쓰기이고 `lesson.level >= writing.split_from_level` 이면 `writing_part: "draft"`(설정 키). 끝내기: draft 세션은 `finishLessonSession` 이 거부(초고 제출만 끝냄 — 값 3 을 서버에서도 지킴). 화면 자료 `composition`(분량 · 생각 꺼내기 끝 · 마지막 질문 · 가장 늦은 초고 진행 글). 활동 차례는 세션 화면 자료(`session/index.ts:298-307`)와 쓰기 서버(`compositionOf`)가 같은 `writing.thinkout_from_level` 규칙으로 만든다. 되살림 AC-6a 는 기기 입력 + 서버 진행 시도 둘 다 |
| (6) 실패 갈래 화면 길 | ✅ | 생각 꺼내기: 안전 상한 → 시도 없이 `ai_resting` → 틀 안내 + '홈'(진행), 설정 · 거절 · 검증 · 출력 막힘 · 시간 · 연결 · 서버 · 서버에서 던짐 → 끝 시도 `{ failed }` · fallback → '이번에는 바로 써 볼까요', 끊김 → 7절 안내 · online 때 같은 시도 id. 첨삭: 안전 상한 · 설정 → 셈 그대로, 거절 → 거절 수, 그 밖 · 서버에서 던짐 → 실패 수. plan 표 두 행과 같다 |
| (7) 피드백 한도 | ✅(저장 꼴만) | 교정 수 상한은 P9c 정규화 몫(check:ids max-corrections 0). 여기 `FeedbackValueSchema` 는 화면이 쓸 칸만 보고 느슨한 꼴로 값을 그대로 저장 |
| (8) 새 시험 | ✅ | 이름 아홉 글자 그대로, 숫자는 `TEST_SETTINGS`. 거짓 초록 없음 — e2e AC-4c 는 가짜에서만 오는 요약 · '첨삭 보기'와 세션 점수 = 채점표를, AC-8d 는 fallback 글 · 예시 · 힌트를, AC-6a 는 되살린 글 · '내 생각'을 기다린다. 통합은 호출 수 · 시도 상태 · 알림 수 · 점수를 단언한다. 단, AC-8k 의 '빈 새 초고'는 되살림이 아직 없어 지금은 늘 참이다(보고 '차례 7 에 넘기는 것'에 적힘) |
| (9) P13 겹침 | ✅ | `session/index.ts` 는 설정 키 하나 · 세션 넣기 한 칸 · 끝내기 거부 두 줄 · 화면 자료 함수 하나만 더했다. lesson-list · 홈은 손대지 않았다 |
| 제약 | ✅ | AI 는 `@/server/ai` 공개 함수로만(composition.ts), 결과 화면 서버는 AI 층을 가져오지 않는 `status.ts` 만 읽는다. 서버 액션 셋 첫 문장 `requireAccess()`. check:bundle 0 |

## 2. 잘한 점

- **첨삭 상태를 순수 함수 하나와 잡기 UPDATE 하나로 갈랐다.** 셈 규칙(거절 둘 · 실패 상한 · 안전 상한 · 설정 문제)은 단위 표로, 동시 호출 막기는 통합 '같은 초고를 두 요청이 함께 부르면 호출은 하나다'로 따로 증명된다.
- **결과 화면 서버가 AI 층에 닿지 않게 `status.ts` 를 뗐다.** 차례 2 의 '세션이 AI 층을 가져오지 않게'와 같은 선을 지켰다.
- **통합 AC-8n 이 셈에 들지 않는 두 갈래를 실제 길로 만든다.** 안전 상한은 프로필 설정 행으로, 설정 문제는 금지어 목록 없음으로 일으켜 호출 수까지 맞댄다.
- **초고 제출이 앞 활동 끝 시도를 요구한다(다르게 한 것 2).** 세션이 닫힌 뒤 늦게 온 미리보기 끝 시도가 버려지는 길을 서버에서 막았다.

## 3. 지적

### Minor

**M-1. 생각 꺼내기 글의 `{NAME}` 채움을 지키는 시험이 없다**
- 무엇이: 채움은 `composition.ts:203` · `:215`(턴 결과)와 `session/index.ts:1003` · `:1017`(다시 열 때 화면 자료)에 들어가 있다. 그러나 가짜 생각 꺼내기 응답(`tests/e2e/fake-ai.ts` `FAKE_THINKOUT`)과 통합 응답 어디에도 `{NAME}` 이 없어, 네 자리 가운데 하나가 빠져도 시험이 초록이다.
- 왜: plan-p11b 제약(139행) '화면 글의 {NAME} 은 fillName', 6.1 33행. 차례 5 의 I-1 이 같은 꼴의 결함이었고, 그때는 통합 사례로 선을 그었다.
- 어떻게: 통합 '쓰기 6~12 첫 세션'에 질문 · 보기 · 요약에 `{NAME}` 이 든 응답 사례 하나를 더해, 턴 결과와 다시 연 화면 자료(`composition.thinkoutTurn` · `thinkout`)에 영어 이름이 있고 `{NAME}` 이 없으며 저장 글에는 `{NAME}` 이 남는지 본다.

**M-2. '쓸 수 있는 단어'의 영어 낱말이 22px 단추 글이다**
- 무엇이: `src/components/session/writing-composition.tsx:421-430` 이 낱말을 `SmallButton`(`text-[22px]`)에 `lang="en"` 으로 그린다.
- 왜: 4절 7행 '영어 학습 문장은 24px 이상, 버튼 글자는 22px 이상'. 크기 훑기(`tests/e2e/child-size.ts:74-85`)는 `lang="en"` 글에 24px 를 요구하므로, 차례 10 이 P11 화면을 AC-N9 에 더하면 여기서 실패한다. 쓰기 1~3 의 낱말 타일 · 보기는 `CHILD_SIZE.choice`(24px)를 쓴다.
- 어떻게: 이 칩만 `text-2xl`(또는 `CHILD_SIZE.choice`)로 키운다. 화면 검토가 볼 자리이기도 하다.

**M-3. 초고 제출이 '빠진 앞 활동'을 되찾는 길이 없다**
- 무엇이: 틀의 초고 제출(`session-frame.tsx` 791~810 부근)은 대기열을 비우고 두 번 낸 뒤에도 `incomplete` 면 그대로 돌려주고, 조각은 '지금은 저장할 수 없어요 …'만 보인다(`writing-composition.tsx:387`). a 의 끝내기(`session-frame.tsx:460-480`)는 같은 경우 이 기기에 없는 활동이면 그 활동으로 돌아간다.
- 왜: 다르게 한 것 2 가 제출에 '앞 활동 끝 시도가 다 있어야'를 더했다. 앞 활동 끝 시도가 서버에 없고 이 기기 대기열에도 없으면(서버가 그 시도를 꼴 틀림으로 버린 때 등) 아이는 '다 썼어요'를 계속 눌러도 나아가지 못한다. 드문 경우라 Minor 다.
- 어떻게: `incomplete` 이고 이 기기 대기열에 그 세션 끝 시도가 없으면 a 끝내기처럼 빠진 활동으로 옮긴다(초고 글은 기기 입력에 남아 있다).

## 4. 판정

**Approved(CI 14차 초록 조건).** 생각 꺼내기 · 초고 · `after()` 첨삭 · 결과가 plan 값 3 · 5 · 7 · 9 · 10 과 실패 갈래 표대로 돈다. 시험은 이름 글자 그대로이고 거짓 초록이 없다. Minor 셋은 컨트롤러가 직접 고치거나 차례 7 과 함께 닫으면 된다.

## 범위 밖 관찰(지적 아님 — 차례 7 몫)

- **되살린 생각 꺼내기(`restored: true`)를 지금은 실패로 읽는다.** `composition.ts:213` · `session/index.ts:1001` 이 `restored` 를 `failed` 와 같이 다뤄, 차례 7 이 AC-2e 되살림을 넣으면 초고 화면이 '이번에는 바로 써 볼까요'로 열린다. 차례 7 이 `restoredDraft.thinkout` 을 붙일 때 이 두 자리를 함께 고쳐야 한다.
- **같은 세션에 서로 다른 시도 id 로 초고를 동시에 내면 둘 다 들어갈 수 있다.** `submitDraft` 는 세션 행을 잠그지 않는다. 화면은 시도 id 를 기기 입력에 남겨 다시 낼 때 같은 id 를 쓰고 기다리는 동안 단추를 막으므로, 실제로 생길 길은 두 기기에서 같은 순간에 낼 때뿐이다.

## 장부 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| ledger 45행 'P11 은 AiOutcome 실패 갈래마다 화면 길' — 생각 꺼내기 · 첨삭 몫 | **닫힘** | 위 1절 (6). 쓰기 확인 몫은 차례 5 에 닫힘. '첨삭 refusals 는 attempts 에'도 `ai_feedback.refusals` 로 닫힘 |
| 새 M-1 · M-2 · M-3 | **아직 열림** | 위 3절 |
