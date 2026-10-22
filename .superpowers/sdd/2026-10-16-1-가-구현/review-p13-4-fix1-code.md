**라운드 판정: Approved — I-1 · I-2 · I-3 와 컨트롤러 결정 둘 모두 ADDRESSED, M-1~M-9 결정대로 고침. 새 지적은 Minor 둘(N-1 · N-2, fix 자리)이고 Critical · Important 는 없다. e2e 결과는 이 보고를 쓸 때 아직 돌고 있었다(⚠️, 아래 0절).**

# 재검토: P13b 차례 4 fix 1 — 코드(rev-p13b · code-reviewer · Opus · xhigh, 2026-10-22 21:1x, 범위 한정)

대상: 워크트리 p13 작업 트리. CI 가지 `ci/p13-c1` c6368af 와 19 파일 내용이 같음을 바이트로 대조했다. fix 1 의 변경은 지난 검토 커밋 8cd0cd2 → c6368af diff(15 파일)로 읽었다.
근거: 검토 `review-p13-4-code.md`, fix 브리프 `task-p13-fix1.md`, 구현 보고 `task-p13-report.md` 'fix round 1 (2026-10-22 21:0x)' 절, 13절 C103 · C107(`specs/10-결정-기록.md:272` · `:276`).
보고 파일 이름: 브리프는 `review-p13-fix1-code.md` 를 적었으나 그 이름은 P13a 차례 1 · 3 fix 1 재검토 기록(커밋 5aef0ed)이 이미 쓰고 있어 덮지 않고 이 이름으로 썼다.

## 0. CI 대조

| 실행 | 커밋 | 결과 |
|---|---|---|
| 6차-a run 39773555908 | a82b6c7(중간 스냅숏) | 통합 실패 1 = M-1 시험 '같은 시도 id 를 겹쳐 보내면 …' 하나(222 통과). build · e2e · bundle-secrets 실패는 시험 바탕 행에 새 열 `toriKo` 가 없던 형 오류(`tests/unit/conversation-server.test.ts(102,3)` TS2719) — 중간 스냅숏 탓 |
| 6차-b run 39774541332 | c6368af(= 작업 트리) | unit · build · lint · depcruise · spec-trace · seed-validate · e2e-local · bundle-secrets · integration · check-ids 초록. 통합 25 파일 · 223 통과 — conversation-session **24** · conversation-turn 11 · **writing-feedback 10**(5차와 같은 수). **e2e 는 이 보고를 쓸 때 아직 돌고 있었다** |

I-1 고침이 P11 쓰기 밀린 첨삭 길을 깨지 않는지: writing-feedback 통합 10 개가 5차와 같은 수로 모두 통과했다. 그 가운데 홈 진입 밀린 첨삭 시험('오래된 차례로 많아야 PENDING_FEEDBACK_PER_ENTRY 개', `tests/integration/writing-feedback.test.ts:868-881`)과 거절 · 실패 셈 시험(`:600-620` · `:883-`)이 있다. 그 시험들의 대기 초고는 실제 제출 길(`composition.ts:421-426` — 입력 맨 위 `kind: "draft"`)로 만들어져 새 조건에 걸리지 않는다.

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| **I-1** 쓰기 밀린 첨삭이 회화 끝맺음 기록을 잡음 | **ADDRESSED** | `retryPendingFeedback` 고르기에 `sessions.area = 'writing'` · `input->>'kind' = 'draft'`(`src/server/writing/composition.ts:799-802`). `runFeedback` 은 잡기 UPDATE 전에 영역 쓰기 · 입력 종류 draft 를 보고 아니면 거짓(`:509-514`) — claimedAt 을 쓰지 않는다. 쓰기 초고의 입력 꼴(`:421-426`)과 조건이 맞고, 잡은 뒤의 종류 확인(`:544`)도 그대로라 쓰기 길 동작은 같다. 통합 '회화 끝맺음 대기 둘이 있어도 홈 진입 밀린 첨삭은 쓰기 초고만 부르고 끝맺음 claimedAt 은 그대로다'(`conversation-session.test.ts:727-797`)는 끝맺음 기록 ai_feedback 그대로 · 초고 실패 수 1 · 뒤이은 홈 진입 정리 2 를 단언한다 — 고치기 전 코드에서는 오래된 둘이 끝맺음이라 claimedAt 이 바뀌어 빨강이 날 단언이다 |
| **I-2** 목표 턴 전 '그만하기' 뒤 정리 따라 말하기 not_found | **ADDRESSED** | `saveFollowAlong` 이 중단 세션은 정리 토막일 때만 받는다(`src/server/conversation/index.ts:632-638`). 정리 토막 + 중단은 '그만하기'(`index.ts:1112-1121`)와 목표 턴 전 대화 안전 상한(`turn.ts` closeOnTurn)에서만 생기고, 다른 수업 고르기 · 시간 지남(토막 그대로)은 지금처럼 거른다. 통합 '목표 턴 전 그만하기 뒤 정리 따라 말하기는 attempts 에 남고 영어로 말한 문장 수가 는다'(`conversation-session.test.ts:801-831`) |
| **I-3** again · two_answers 줄이 아이가 말할 영어를 글 칸에 | **ADDRESSED** | 줄 꼴 `AddLineOut`(`src/server/conversation/state.ts:324-346`): again 은 `say`(답 예시 — 읽어 주기 전용) · `en?`(같은 질문) · `ko?`, two_answers 는 `answers` 만(`en` 없음). 형 주석이 '읽어 주기 재료 · 1~3단계 화면은 글로 보이지 않는다'를 적었다. 이어 하기(`index.ts:418-432`)와 다시 흘림(`turn.ts` replay)도 같은 `addLinesOf`(`state.ts:368-405`)라 같은 꼴이다. 저장 원문 · 다시 쓸 토리 차례는 `appendEnOf` 그대로라 6.1 · AC-15k 에 닿지 않는다(AC-15k 통합 둘 6차-b 초록). 단위 '1~3단계 모름 뒤 붙일 말 줄의 글 칸(en)에는 답 예시가 없고 읽어 주기 칸(say)에만 있다'(`tests/unit/conversation-server.test.ts:792-817`) |
| **결정 1**(C103) `talk_turns.tori_ko` | **ADDRESSED** | 0003 을 지우고 다시 만들었다 — `drizzle/0003_talk_ai_question_tori_ko_stories_by_band.sql` 에 비울 수 있는 ADD COLUMN 셋, 옛 0003 파일 없음, 스냅숏 prevId = 0002 id · 바뀐 열은 세 열뿐, `_journal` idx 3 태그 새 이름. 저장은 1~3단계(카드 턴 꼴)이고 뜻 단계일 때만(`turn.ts` toriPlanOf 성공 · 거절 갈래, 저장 `toriKo: plan.toriKo`), 이어 하기 `lastTori.ko`(`index.ts:424`) · 다시 흘림 `{ t: "ko" }`(replay, 문장 뒤 · 붙일 말 앞 — 흘려 보낼 때와 같은 차례). 통합 AC-15f 이어 하기 `lastTori.ko` "좋아!" · 4단계 고아 행 `toriKo` null · `lastTori.ko` 없음, 단위 C103 시험. 옛 0003 은 오래 남는 DB 에 적용된 적이 없다 — `ci.yml` 은 embedded-postgres 만 쓰고, 개발용 적재(`dev-load.yml`)는 손으로만 돌며 기본 가지에 아직 없다 |
| **결정 2**(정할 것 7) 끝맺음 입력 갈래 | **ADDRESSED** | a `TalkAttemptInputSchema` 에 `{ v, kind: "talk-closing", step: "final", reason }` 와 `TALK_CLOSING_REASONS`(`src/core/conversation/attempt.ts:32-41` · `:62-66`). closing.ts 는 그 꼴로 쓰고(`satisfies TalkAttemptInput`) `parseTalkAttemptInput` 으로 센다. 자체 꼴은 지웠다. 그 꼴을 읽는 다른 곳(`followDoneOf` · 처음 스냅숏 찾기)은 이 갈래를 건너뛴다. 단위 '끝맺음 기록 입력은 a 시도 꼴의 talk-closing 갈래로 읽고 모르는 까닭은 받지 않는다' |
| M-1 같은 시도 id 겹침 | 고침 | 고아 아이 행이 `TURN_IN_FLIGHT_MS`(60초) 안이고 그 뒤 그 세션 talk_turn ai_calls 행이 없으면 `{ t: "stale" }`(`turn.ts` `callAfter` · own 갈래). ai_calls 행은 시도가 끝날 때 남으므로 첫 요청이 기다리는 동안에는 없다. 4단계 'Oops' 뒤(실패 시도 행 있음) · 다음 학습일(시간 지남)은 그대로 다시 부른다. 통합 '같은 시도 id 를 겹쳐 보내면 …'은 6차-a 빨강 → 6차-b 초록. N-1 참조 |
| M-2 형태 표 실패 삼킴 · 매 턴 어휘 | 고침 | catch 에 오류 이름 로그. 검사 재료는 성공 턴이고 다음 자리가 1~3단계 AI 자리일 때만 읽는다 — `toriPlanOf` 의 AI 질문 조건과 같은 자리 판정이라 재료가 없으면 AI 질문을 쓰지 않는 길도 그대로 |
| M-3 413 이 본문 다 읽은 뒤 | 고침 | `declaredTooLarge`(`route.ts:28-31`)로 본문을 읽기 전에 413, 읽은 뒤 글자 수 확인도 남김. 단위 `tests/unit/talk-turn-route.test.ts` 셋(403 · 머리글 413 + 본문 안 읽음 · 400) |
| M-4 끊긴 뒤 저장이 함수 수명에 안 묶임 | 고침 | `TransformStream` 쓰기 쪽으로 줄을 넣고 턴 길 약속을 `after(done)`(`route.ts:47-75`). `done` 은 던지지 않는다(catch · finally). 쓰기 실패는 삼킴 그대로. 실기는 차례 11(⚠️) |
| M-5 홈 진입 정리가 전부 읽음 | 고침 | (가) 완료 · 토막 ≠ wrap_up · 컷오프 뒤 턴 NOT EXISTS, (다) 중단 · 끝맺음 기록 NOT EXISTS, (나) 대기 기록을 SQL 로 오래된 차례(`closing.ts:494-600`). 잠근 뒤 다시 보는 자리(`locked.talkSegment`)도 남았다. 기존 통합(AC-15f 둘 · 1-가 셋 · I-1 시험 끝) 6차-b 초록 |
| M-6 시험 약함 둘 | 고침 | (1) 인사 '모름' 턴 뒤 영어로 말한 문장 수 0 단언(`conversation-session.test.ts:244-247`). (2) AC-15j `max - 1 - card.greetingTurns`, AC-15k `safeLineOf(card.safeLines, 1)`, 거절 시험 `safeLineOf(card.safeLines, 아이 턴 번호)` |
| M-7 거절 대사 두 규칙 | 고침 | `toriPlanOf` 거절이 `safeLineOf(card.safeLines, turnNo)`(뜻은 같은 줄 ko). 문장 검사 쪽 인자는 앞 턴 짝 수 + 1(`src/server/ai/talk.ts:257`)로 남았지만, 앞 턴 짝은 토리 행이 저장된 아이 행마다 하나라 저장된 대화에서는 아이 턴 번호와 같다 |
| M-8 주석 '회화 트랙' | 고침 | '회화 영역 행'(`state.ts:899`). 새 파일 글에 '트랙' · '유닛' 없음 |
| M-9 목표 턴 전 상한 → 중단 | 고침 | 13절 C107(`specs/10-결정-기록.md:276`) · plan-p13a 회화 수업 모델 5 표 행 고침(`plan-p13a-…md:123`). AC-15j 통합에 `status` 중단 · 학습일 단언(`conversation-turn.test.ts:358-362`) |

## 2. 새로 깨뜨린 것(fix 자리에서 생긴 것만)

| 번호 | 심각도 | 무엇 | 왜(근거) | 어떻게 |
|---|---|---|---|---|
| N-1 | Minor | `{ t: "stale" }` 이 두 뜻을 갖게 됐다 — '자리가 어긋남(다시 읽기)'과 M-1 의 '같은 시도 id 가 아직 진행 중일 수 있음(잠깐 뒤 다시)'. 둘째 뜻은 첫 요청이 AI 호출 기록 없이 끝난 때에도 60초 이어진다 — 4단계부터 설정 문제(키 · 모델 목록, a2 '설정 문제는 행 없음')로 'Oops' 가 난 뒤 곧 다시 열 때, 회화 턴 호출 전에 서버 오류로 `{ t: "error" }` 가 난 뒤 | 화면(차례 5)이 stale 을 받고 바로 자료를 다시 읽어 `retryTurn` 을 곧바로 다시 보내면, 60초 동안 요청이 이어 돈다(plan-p13b 값 10 의 '같은 시도 id 로 다시'). 아이 진행이 끊기는 것은 아니고 기다림이 는다 | 차례 5 브리프에 한 줄: stale 뒤 `retryTurn` 이 그대로면 바로 되풀이하지 않고 기다렸다 다시 보낸다(예: ui.wait_hint_seconds 둘째 값 간격, 많아야 TURN_IN_FLIGHT_MS). 새 줄 종류는 만들지 않는다는 컨트롤러 결정을 따른다 |
| N-2 | Minor | `export type AddKind`(`state.ts:322`)가 줄 꼴을 `AddLineOut` 으로 나눈 뒤 쓰는 곳이 없다 | 옛 꼴(한 `kind` 에 `en` · `answers` 선택 칸)을 떠올리게 하는 죽은 형이 차례 5 에서 잘못 가져다 쓰일 수 있다 | 지우거나 `AddLineOut["kind"]` 로 바꾼다 |

## 3. 범위 밖 관찰

- C107 글(`specs/10-결정-기록.md:276`)은 '목표 턴 전에 … 1-가 하루 안전 상한 닫힘에 닿은 회화 세션은 aborted' 라고 적었다. 코드는 목표 턴 전 1-가 상한이면 닫지 않고 `{ t: "resting" }` · 진행 그대로다(C90 · `turn.ts` (4)). 그 갈래는 코드에서 닿지 않는다(보고 차례 4 다른 까닭 8 '(있을 수 없지만)'). 읽는 사람이 C90 과 어긋난다고 볼 수 있어 '코드상 닿지 않는 갈래' 한마디를 권한다(문서 몫).
- P12 에 넘길 메모: 밀린 첨삭 고르기가 이제 `kind = 'draft'` 만 고른다(`composition.ts:799-802`). 단계 평가의 쓰기 첨삭(`writeFeedback` 의 `forLevelTest`)이 같은 `awaiting_feedback` 상태로 대기하게 되면 이 조건을 함께 넓혀야 홈 진입에서 다시 불린다. 지금은 그 길이 없다(src 에 `forLevelTest: true` 없음).

## 4. 라운드 판정

**Approved.** Important 셋과 결정 둘이 닫혔고 Minor 아홉이 결정대로 고쳐졌다. 새 Minor 둘은 차례 5 브리프 한 줄(N-1)과 다듬기(N-2)라 컨트롤러가 직접 다룰 수 있다. 차례 4 커밋 전에 CI 6차-b 의 e2e 결과만 확인하면 된다.
