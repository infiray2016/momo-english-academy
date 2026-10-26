# 코드 재검토: P11b 차례 7 fix 7 · 8 — 코드 B3 I-1 · M-1 · M-3(M-2 는 P12)(code-reviewer rev-p11b · Opus · xhigh, 2026-10-22, 범위 한정)

대상: 워크트리 p11 작업 트리(차례 7 + fix 7 · 8, CI 가지 ci/p11-c2 = CI 18차). 대조: 재검토 브리프 `task-p11-review-fix8-code.md` (1)~(4), fix 브리프 `task-p11-fix8.md`, 구현 보고 'fix 7' · 'fix 8' 줄 · '다른 P 에 넘길 것'(`task-p11-report.md` 790 · 792 · 794), 앞 검토 `review-p11-7-code.md`, plan-p11b 값 9, 정본 4절 7행(기다림 표시), 6.1 33행.
직접 확인한 것: `pnpm check:deps` 위반 0 · `pnpm check:bundle` 위반 0 · `pnpm check:ids` code-setting-unknown 0 · design-number 35(새 줄 0 — 이 파일들에서 나온 줄은 `lesson-board.tsx` 의 `strokeWidth={3}` 하나로, HEAD 에 이미 있던 줄이 자리만 옮겼다). 단위 · 통합 · e2e 는 다시 돌리지 않았다(CI 18차 도는 중).

## 판정: Approved(CI 18차 초록 조건) — ADDRESSED 3/3 · M-2 P12 넘김 확인 · 새 지적 0

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 일반 카드로 첨삭 대기 칸을 고를 때 기다림 표시 없음 | **ADDRESSED** | `src/app/(child)/[area]/lessons/use-lesson-start.ts:55-126` `useLessonStart(waitHintSeconds)`: 누른 때 시계를 걸어 `waitHintSeconds[0]` 초가 지나도 돌아오지 않으면 `waitingSince`(누른 시각)를 켜고, '첨삭 보기'로 열 때는 바로 켠다. 시계는 대기열 비우기부터 재어 그 기다림도 덮는다. 끄는 때는 `finally`(121~124행) 하나로 모아, 열림 · 확인 쪽지 · 안전 상한 · 첨삭 대기 · 저장 실패 · 거부 · 던짐 모든 길에서 시계를 지우고 표시를 끈다. 서버 쪽 기다림은 P9a 마감(타임아웃 × 2)으로 끝이 있다. 네 쪽 모두 같은 훅이고, 저마다 `ui.wait_hint_seconds` 를 서버에서 읽어 넘긴다 — 목록(`lessons/page.tsx:25-39` → `lesson-board.tsx:126` · `:357`), 지난 수업(`past/page.tsx:49-57` → `past-lessons.tsx:39` · `:95`), 결과(`src/server/session/result.ts:103` · `:111` 이 늘 실음 → `result-view.tsx:95` · `:175`), 홈(`page.tsx:26-34` → `home-cards.tsx:317` · `:334`, 홈에서 이 훅을 쓰는 것은 '첨삭이 왔어요' 포스트잇뿐이라 그것이 있을 때만 읽는 것이 맞다). 박힌 수는 단위 바꿈 `MS_PER_SECOND` 뿐이다. e2e "쓰기 6~12: 첨삭을 기다리는 칸을 목록에서 고르면 …"은 잡지 않은 첨삭 대기 첫 세션 + 첨삭 4초 늦춤(`SLOW_FEEDBACK_MS` > 첫 값 1초)에서 일반 카드를 누르고 첫 값 + 그리기 여유(0.5초) 안에 `data-wait-hint` 를 단언한다. 고치기 전이면 일반 카드 길에는 표시가 없어 실패하는 참 단언이고, 이어 둘째 세션 열림 · 첨삭 요청 1 도 본다 |
| M-1 안전 상한 시험의 둘째 세션 몫 | **ADDRESSED** | `tests/integration/safety-cap.test.ts` '1-가 안전 상한: …'에 첨삭이 온 쓰기 6 첫 세션을 넣고 상한에 닿게 한 뒤 같은 수업 시작이 `writing_part: "rewrite"` 세션을 엶을 단언한다. 시작 길의 `resting && judged.part !== "rewrite"`(`session/index.ts:501`)가 빠지면 `ai_resting` 으로 돌아와 시험이 던진다. '차례 7 이 더한다' 주석도 지웠다 |
| M-2 보강 칸 둘째 세션 종류 · 끝남 판정 | **P12 로 넘김(확인)** | 보고 794행 '다른 P 에 넘길 것' · `ledger-open.md:97` 에 할 일(종류를 remedial 그대로 · `remedialDone` 이 `writingPart !== "draft"` 를 봄 · 단위 표 한 줄)이 적혔다 |
| M-3 둘째 세션 `{NAME}` 채움 시험 | **ADDRESSED** | 통합 `writing-feedback.test.ts` "둘째 세션: 첨삭 글의 {NAME} 은 화면 자료 · 고쳐 쓰기 응답에서 영어 이름으로 채우고 저장은 가린 글 그대로다": 칭찬 · 교정 원문 · 수정 · 이유 · 모범 답안 다섯 칸에 `{NAME}` 을 둔 첨삭으로, 화면 자료(`rewriteViewOf`)의 칭찬 · 교정에 영어 이름 · `{NAME}` 없음, `submitRewrite` 응답의 모범 답안에 영어 이름, 저장 값에 `{NAME}` 있고 영어 이름 없음을 단언한다. 두 자리 가운데 하나가 빠지면 실패한다 |

## 2. fix 7(시험 도우미)

- **판정: 맞음.** 도우미 `submitted()`(`tests/integration/writing-feedback.test.ts` 377~388행)가 같은 초고 활동의 행 가운데 `status = 'awaiting_feedback'` 인 것을 고른다. 되살림(AC-2e)이 같은 활동 번호에 초고 진행 시도(`status: "done"`)를 옮기므로, 활동 번호만으로 첫 행을 고르던 것이 시험 결함이었다.
- **앱 쪽과 어긋나지 않는다.** 앱이 초고 행을 고르는 자리는 모두 첨삭 대기 상태나 끝 시도 꼴을 본다: `runFeedback` · `runDraftFeedback` · `retryPendingFeedback`(`composition.ts:508` · `:770` · `:793` 상태), `draftFeedbackOf`(`status.ts:44`) · `rewriteSourceOf`(`status.ts:97`) · `writingDraftsOf`(`lesson-list/index.ts:205`) · `feedbackReadyOf`(`home/index.ts:359`) · `submitDraft` 의 이미 낸 초고 확인(`composition.ts:404`) 끝 시도 꼴. 되살린 진행 시도가 끼어들 자리가 없다.

## 3. 판정

**Approved(CI 18차 초록 조건).** 앞 검토 B3 의 I-1 · M-1 · M-3 이 닫혔고 M-2 는 P12 로 넘겨 기록됐다. fix 7 은 시험 바탕만 바꿨고 앱 쪽 고르기와 맞다. fix 자리에서 새 지적은 없다.

## 범위 밖 관찰(지적 아님 — 화면 재검토가 볼 자리)

- **목록 쪽 기다림 표시가 수업 판 아래에 그려진다.** `lesson-board.tsx:356-358` 은 판(`data-lesson-board`) 뒤, 저장 실패 줄과 같은 자리다. e2e 의 `toBeVisible` 은 보는 창 안인지를 보지 않고 시험 판에는 수업이 하나뿐이다. 실제 단원(수업 여럿 · 지난 수업 · 잠긴 다음 단원)에서 세로 화면 위쪽 카드를 누르면 표시가 보는 창 아래에 있을 수 있다. 4절 '기다림 표시를 보인다'는 아이 눈에 보여야 하므로, 수업이 많은 판의 사진으로 자리를 확인하기를 권한다.

## 장부 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| review-p11-7-code I-1 · M-1 · M-3 | **닫힘** | 위 1절 |
| review-p11-7-code M-2 | **P12 로 넘김** | 보고 794행 · ledger-open 97행 |
| 차례 5 정할 것 2(안전 상한 시험 둘째 세션 몫) | **닫힘** | 위 M-1 |
