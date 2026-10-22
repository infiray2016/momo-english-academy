# 코드 검토: P11b 차례 7 — 쓰기 6~12 둘째 세션 · 목록 '첨삭 보기' · 홈 '첨삭이 왔어요' · 밀린 첨삭 · 되살림(검토 묶음 B3) — code-reviewer rev-p11b(Opus · xhigh, 2026-10-22)

대상: 워크트리 p11(HEAD 56acaec = 차례 6) 작업 트리의 변경 22 · 새 파일 1(CI 가지 ci/p11-c2 4992236 과 같음). 대조: 검토 브리프 `task-p11-review-7-code.md` 볼 것 (1)~(9), 구현 브리프 `task-p11-7.md`, 구현 보고 '차례 7' 절(`task-p11-report.md` 719~788), plan-p11b 값 3 · 9 · 11 · 12 · 위험 2 · 3 · 4 · 9 · 정할 것 ㄱ(C79) · ㄴ(C80) · 증명 표, plan-p11a 문구 표 187 · 190행, 차례 5 정할 것 2(보고 541행), 정본 3.3 피드백 한도 · 4절 7행(기다림 표시) · 55행('여기부터 해요' 차례) · 23행(세션 결과), 6.1(`specs/05-AI-호출.md` 33행).
직접 확인한 것: `pnpm check:deps` 위반 0(모듈 167, 순환 없음 — `composition.ts` → `@/server/session` → `writing/status.ts` 는 AI 층을 가져오지 않음) · `pnpm check:bundle` 위반 0 · `pnpm check:ids` code-setting-unknown 0 · max-corrections 0 · design-number 35(새 줄 0). 증명 표 시험 이름 일곱을 plan 글자와 기계 대조했다(모두 같음). 단위 · 통합 · e2e 는 다시 돌리지 않았다(CI 16차 도는 중).

## 판정: Changes requested — Critical 0 · Important 1 · Minor 3

## 1. 설계 준수(브리프 볼 것)

| 볼 것 | 판정 | 근거 |
|---|---|---|
| (1) 피드백 한도 · 모범 답안 · 한 화면 하나 | ✅ | 교정 수 상한은 P9c 가 `writing.max_corrections` 로 응답 규격 · 정규화에 건다(`src/core/ai/calls/writing.ts:239` · `:263` · `:368` · `:388`). 둘째 세션 활동 수 = 그 첨삭의 교정 수(`session/index.ts` `sessionContextOf`)라 교정은 활동마다 하나씩 한 화면에 하나다(e2e 가 `[data-feedback-correction]` 1 을 단언). 모범 답안은 화면 자료에 고쳐 쓰기 끝 시도가 있을 때만 실리고(`rewriteViewOf`, 1153행~) 그 전에는 `submitRewrite` 응답으로만 온다(`composition.ts:723`). 통합 '둘째 세션: …'이 고쳐 쓰기 전 화면 자료 `modelAnswer: null` · 낸 뒤 값을 단언 — 앞서 새는 길 없음 |
| (2) 둘째 세션 판정 | ✅(M-2) | `judgeLessonStart` 가 첨삭 옴이면 `part: "rewrite"` · 첫 세션 수업 행 · 판(`seedRevision` · `seedCorrection` 을 첫 세션 행에서)으로 연다. 결과 '첨삭 보기' · 목록 맨 위 '첨삭 보기' · 홈 '첨삭이 왔어요' 셋이 같은 `start(lessonRowId, …)` → 같은 판정을 탄다. 둘째 세션 점수는 b 종류가 모두 `NO_RESULT` 라 비고, 별은 P12. 보강 칸의 종류는 M-2 |
| (3) 첨삭 대기 중 고르기 | ❌(I-1) | `startLessonAfterFeedback`(`composition.ts:813-826`)가 대기면 `runDraftFeedback` 을 한 번 기다린 뒤 다시 판정하고, 그래도 대기면 `feedback_pending` → '아직 글을 살펴보고 있어요'(문구 표 · 4절). 밀린 첨삭 상한 `PENDING_FEEDBACK_PER_ENTRY` 2 는 plan 값 3 이 '기술 값 — Hobby 300초 안에 첨삭 기다림 두 번'으로 정한 수다(13절 C79 의 '진입마다 많아야 2개'와 같음, 12절 키 아님) — 상수가 맞다. 홈 진입의 `after()` 안에서 쿠키 · 헤더를 읽지 않는다. 기다리는 동안의 표시는 I-1 |
| (4) 되살림 · 늦은 초고 | ✅ | `restoreDraftInto`(624행~)는 새 첫 세션을 넣는 트랜잭션 안에서, 같은 칸(영역 · 단계 · 단원 · 종류 · 수업 번호 · 변형)의 가장 최근 첫 세션이 중단일 때만 마지막 초고 진행 글과 실패 아닌 생각 꺼내기 끝(`restored` 를 붙임)을 옮긴다. AC-2e(중단 뒤 다시 열면 글)와 AC-8k(첨삭 못 함 뒤 빈 새 초고)를 한 규칙으로 맞춘다 — plan 값 9 의 '가장 최근의 중단된 첫 세션(첨삭 못 함 · 대기 초고가 없는 것)'보다 좁지만, 가장 최근이 끝난 칸에서 더 앞의 중단 글을 되살리지 않는 것이 맞다(다르게 한 것 3). AC-6a(같은 세션 다시 열기)는 손대지 않았다. 늦은 초고: 중단된 세션은 `draft` 진행 시도만 받고 나머지는 받은 것으로 치고 버린다. 경합은 '다른 수업 고르기 · 목록 열기 앞 대기열 비우기'(`flushAttempts`)가 막는다(위험 3). 차례 6 이 넘긴 `restored` 읽기 두 자리도 고쳤다 |
| (5) 목록 · 홈 규칙 | ✅ | `triedRef` 가 draft 세션을 빼 첫 세션만 끝난 칸은 남은 수업, 둘째 세션이 끝나야 끝낸 수업. `unitGateOf` 정규 수업 수에서 rewrite 를 빼고 학습일은 둘 다(값 11 (3) · 3.7). 홈 최근 성적은 점수 없는 세션 · rewrite 를 빼고 창을 자른다(값 12). 단위 '목록: …'이 남은 수업 · 끝낸 수업 · 잠긴 단원 수를 단언 |
| (6) '여기부터 해요' 후보에서 대기 · 온 칸 뺌 | ✅(받음) | 4절 55행 차례는 '하던 수업 → 첨삭 보기 → … → 남은 배정 수업'. 온 칸은 '첨삭 보기'가 먼저 맡고, 대기 칸은 골라도 '아직 글을 살펴보고 있어요'뿐이라 빼는 것이 차례의 뜻에 맞다. 정본에 없는 세부라 보고 다르게 한 것 4 에 적힌 것으로 충분하다 |
| (7) P13 겹침 | ⚠️ | 늘어난 줄: `session/index.ts` +230 −15 · `lesson-list/index.ts` +91 · `home/index.ts` +82 · `page.tsx` +29 · `home-cards.tsx` +76 · `home.spec.ts` +42. 대부분 새 함수(`restoreDraftInto` · `rewriteViewOf` · `writingDraftsOf` · `feedbackReadyOf` · `FeedbackNote`)라 줄 단위 충돌은 작다. 부딪힐 자리는 아래 '합칠 때 볼 자리' |
| (8) 새 시험 | ✅(M-1 · M-3) | 이름 일곱 글자 그대로, 숫자는 `TEST_SETTINGS`. 거짓 초록 없음 — 통합 '둘째 세션: …'은 실패 → 대기 → 성공 → 둘째 세션 행(수업 행 · 판) · 활동 차례 · 모범 답안 가림을, '첨삭: 앱 진입마다 …'는 셋 가운데 오래된 둘만 done 을, AC-2e 는 늦은 글 · 버린 시도 · 되살린 글 · AI 다시 안 부름을, e2e AC-4c 둘째 세션은 화면마다 모범 답안 0 을 단언한다. 두 통합 시험의 파일이 증명 표(`session-start.test.ts`)와 다른 것은 다르게 한 것 1 — plan 증명 표의 파일 칸을 완료 보고 때 고치면 된다 |
| (9) `{NAME}` 채움 | ✅(M-3) | 둘째 세션 화면 자료는 첨삭 값 전체를 `fillNameDeep`(칭찬 · 교정 원문 · 수정 · 이유 · 모범 답안), `submitRewrite` 의 모범 답안도 채운다. 저장 값은 가린 글 그대로 |
| 제약 | ✅ | 서버 액션 `submitRewrite` 첫 문장 `requireAccess()`. 둘째 세션은 AI 를 부르지 않아 안전 상한에 막히지 않는다(501행, C80). 문구는 문구 표 187 · 190행 글자 그대로 |

## 2. 잘한 점

- **되살림을 시작 트랜잭션 안의 시도 복사로 풀었다.** 화면 자료 · 이어 할 자리 · 생각 꺼내기 건너뛰기가 새 길 없이 그대로 돌고, '가장 최근 첫 세션이 중단일 때만' 한 규칙으로 AC-2e 와 AC-8k 가 함께 참이 됐다.
- **모범 답안을 화면 자료에서 빼고 고쳐 쓰기 응답으로만 준다.** 위험 9 를 데이터 길에서 막았고, 통합이 고쳐 쓰기 전 `null` 을 단언한다.
- **세 진입('첨삭 보기' 둘 · '첨삭이 왔어요')이 같은 시작 판정을 탄다.** 화면마다 따로 둘째 세션을 만들지 않아 수업 행 · 판이 어긋날 수 없다.
- **차례 6 이 넘긴 관찰 둘을 닫았다.** `restored` 읽기 두 자리와 AC-8k '빈 새 초고'(앞선 중단 세션을 두어 되살림 규칙으로 참이 되게).

## 3. 지적

### Important

**I-1. 목록의 일반 수업 카드로 첨삭 대기 칸을 고르면 기다림 표시 없이 AI 첨삭을 기다린다**
- 무엇이: 첫 세션만 끝나 첨삭을 기다리는 칸은 목록에 남은 수업 카드로 그대로 있다. 그 카드는 `start(item.lessonId)`(`src/app/(child)/[area]/lessons/lesson-board.tsx:157`)로 열고, 기다림 표시는 `{ feedback: true }` 일 때만 켜진다(`use-lesson-start.ts:74`). 서버 액션 `startLesson` 은 판정이 `feedback_pending` 이면 `runDraftFeedback` 으로 첨삭을 그 자리에서 기다린다(`composition.ts:824`). 첨삭이 잡혀 있지 않으면(응답 뒤 첨삭이 실패해 대기로 돌아온 때 등) AI 호출이 끝날 때까지, 많아야 `AI_WAIT_TIMEOUT_MULTIPLE × ai.timeout_seconds.feedback`(120초) 동안 화면은 단추만 꺼진 채 아무 표시가 없다.
- 왜: plan 값 9 '판정이 feedback_pending 이면 서버 액션 startLesson 이 runFeedback 를 한 번 기다린 뒤(그동안 화면은 WaitHint)'. 정본 4절 7행 'AI 응답을 기다리는 모든 화면은 ui.wait_hint_seconds 의 첫 값(1초) 안에 기다림 표시를 보인다'. 이 길은 AI 가 잘 안 될 때(첨삭 실패 뒤) 생기므로 기다림이 상한까지 갈 가능성이 크다. 아이는 멈춘 화면으로 본다.
- 어떻게: 둘 가운데 하나를 고른다. (가) `start()` 가 서버 액션을 부른 뒤 첫 값이 지나도 돌아오지 않으면 기다림 표시를 켠다. 목록 · 지난 수업 · 결과 · 홈 모두 같은 훅이라 한 곳이다. (나) 첨삭을 그 자리에서 기다리는 것을 '첨삭 보기'로 여는 요청에만 하고(입력에 표시를 더함), 일반 카드는 바로 `feedback_pending` → '아직 글을 살펴보고 있어요'. 선 위 검증: 첨삭이 대기(잡지 않음)인 칸을 일반 카드로 고르면 첫 값 안에 `data-wait-hint` 가 보이는지(가) 또는 AI 요청 0 으로 '아직 글을 살펴보고 있어요'가 보이는지(나).

### Minor

**M-1. 안전 상한 시험의 '둘째 세션은 시작된다' 몫이 아직 더해지지 않았다**
- 무엇이: 통합 '1-가 안전 상한: … 둘째 세션 · 읽기 · 쓰기 1~3 은 시작된다'(`tests/integration/safety-cap.test.ts:435`)는 여전히 `aiNeededLesson({ part: "rewrite" })` 거짓만 보고, 458행 주석 '시작 판정 길(첨삭 보기)은 차례 7 이 이 시험에 더한다'가 그대로다. 이번 변경에 이 파일이 없고 보고에도 없다.
- 왜: 차례 5 정할 것 2(보고 541행, 컨트롤러 받음)가 이 몫을 차례 7 에 넘겼다. 시작 길의 `resting && judged.part !== "rewrite"`(`session/index.ts:501`)를 지키는 시험이 없어, 그 조건이 빠지면 상한 날 '첨삭 보기'가 '토리가 잠깐 쉬어요'로 막혀도 초록이다.
- 어떻게: 같은 시험에서 첨삭이 온 첫 세션을 두고 상한에 닿게 한 뒤 `startLessonSession` 이 rewrite 세션을 여는지 단언한다(쓰기 6 견본이 이미 그 시험 DB 에 있다).

**M-2. 보강 칸의 둘째 세션 종류가 '첫 세션 종류'가 아니고, 보강 칸은 첫 세션만으로 끝난 것이 된다**
- 무엇이: 시작 판정이 둘째 세션 종류를 `TRIED_KINDS.has(draft.kind) ? draft.kind : "regular"`(`src/core/lesson-list/state.ts:431`)로 정해, 보강(remedial) 첫 세션의 둘째 세션은 `regular` 가 된다. 또 `remedialDone`(200~208행)은 `writingPart` 를 보지 않아 보강 칸은 첫 세션(초고)만 끝나도 끝낸 것으로 보인다.
- 왜: plan 값 9 '세션 { kind: 첫 세션 종류, writing_part: "rewrite", … }', 값 11 (1) '첫 세션만 끝난 칸은 남은 수업이고 둘째 세션이 끝나야 끝낸 수업'. 보강 발급(`remedialIssued`)은 P12 가 채우므로 지금은 길이 없다. 다만 '같은 규칙을 P12 단원 통과 판정이 쓴다'(같은 파일 머리 주석)라 P12 가 보강 끝낸 수 · 다시 평가 조건을 셀 때 틀린 값을 받는다.
- 어떻게: 둘째 세션 종류는 첫 세션 종류 그대로(타입을 `remedial` 까지 넓힘), `remedialDone` 도 `writingPart !== "draft"` 를 본다. 단위 표에 보강 칸 한 줄을 더한다. 지금 고치지 않으면 P12 브리프에 넘긴다.

**M-3. 둘째 세션 글의 `{NAME}` 채움을 지키는 시험이 없다**
- 무엇이: 채움은 `rewriteViewOf`(칭찬 · 교정 · 모범 답안)와 `submitRewrite`(`composition.ts:723`, 모범 답안) 두 자리다. 가짜 첨삭 응답(`feedbackReply` · `READY_FEEDBACK`)에 `{NAME}` 이 없어 어느 자리가 빠져도 초록이다.
- 왜: plan-p11b 제약(139행) · 6.1 33행. 차례 5 I-1 · 차례 6 M-1 과 같은 꼴이고, 두 차례 모두 통합 사례로 선을 그었다.
- 어떻게: 통합 '둘째 세션: …' 또는 새 사례에 칭찬 · 교정 · 이유 · 모범 답안에 `{NAME}` 이 든 첨삭 응답을 두고, 화면 자료와 `submitRewrite` 응답에 영어 이름이 있고 `{NAME}` 이 없으며 저장 값에는 `{NAME}` 이 남는지 본다.

## 4. 판정

**Changes requested.** 둘째 세션 판정 · 되살림 · 목록 · 홈 · 모범 답안 가림은 plan 대로이고 시험도 참이다. 고칠 것은 I-1 하나다. 첨삭 대기 칸을 일반 카드로 고르면 plan 값 9 와 4절이 요구하는 기다림 표시 없이 많아야 2분을 기다린다. M-1~M-3 은 같은 fix 에서 닫거나 장부로 넘기면 된다(M-2 는 P12 브리프로 넘겨도 된다).

## 합칠 때 볼 자리(P13 — 지적 아님)

- `src/server/session/index.ts` `startUnsafe`: 판정 뒤 분기(둘째 세션 넣기 36줄, 501행 안전 상한 조건)와 새 세션 넣기 뒤 `restoreDraftInto` 호출이 회화 세션 시작을 고치는 자리와 같은 함수다. `saveSessionAttempts` 의 상태 조건(`in_progress` → `in_progress · aborted`)과 `lateOnly` 분기는 회화 진행 시도가 중단된 세션에 닿을 때도 지나가므로, 회화가 중단된 세션의 늦은 시도를 다르게 다뤄야 하면 이 조건을 함께 본다. `SessionView` 타입과 `loadSessionView` 반환에 `rewrite` 칸이 늘었다.
- `src/server/lesson-list/index.ts` `readLessonList` 끝의 `writingDrafts` · `feedbackReady` 두 줄, `src/server/home/index.ts` `HomeView` · 최근 성적 거르기 · 반환의 `feedbackReady`, `page.tsx` 의 `after()` · `FeedbackNote` 자리.

## 장부 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| 차례 6 넘김 — `restored` 를 실패로 읽는 두 자리 | **닫힘** | `composition.ts` `thinkoutOutcomeOf` · `session/index.ts` `compositionViewOf` 가 요약이 있으면 끝으로 읽음, 통합 AC-2e 가 되살린 '내 생각'과 AI 다시 안 부름을 단언 |
| 차례 6 넘김 — AC-8k '빈 새 초고' 늘 참 | **닫힘** | 앞선 중단 세션(쓰던 초고)을 두고도 '첨삭 못 함' 뒤 새 초고가 비어 있음을 단언 — 되살림 규칙이 있어야 참 |
| 차례 5 정할 것 2 — 안전 상한 시험 둘째 세션 몫 | **아직 열림** | M-1 |
| 새 I-1 · M-2 · M-3 | **아직 열림** | 위 3절 |
