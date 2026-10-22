# 재검토: P13a 차례 2 fix 2 — 코드(rev-p13 · code-reviewer · Opus · xhigh, 2026-10-22 18:4x, 범위 한정)

**라운드 판정: Approved — I1 · M1 · M2 · M3 · N3 보정(C101) 다섯 모두 ADDRESSED. 새 지적은 Minor 하나(인계 문서 문장)다.**

대상: 워크트리 p13 작업 트리(차례 2 + fix 2). 근거: fix 브리프 `task-p13-fix2.md`, 구현 보고 'fix round 2' 절, 13절 C101(본 저장소 `specs/10-결정-기록.md:251`).
확인 방법: 바뀐 자리를 코드로 읽었다. 첫 검토 재현 스크립트(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/p13rev/probe-a2.mts`)를 다시 돌렸다. 오류 종류 · 콜백 예외 재현(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/p13rev/probe-fix2.mts`)을 더했다. 둘 다 SDK 실제 스트림 처리 위에서 돈다. 모델 바뀜을 실제 SDK 가 하는지 보려고 `tests/unit/talk-stream-call.test.ts` 한 파일을 돌렸다(17/17). 통합 20 과 CI 4차는 보지 못했다.

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I1 스트림 도중 `error` 이벤트 | ADDRESSED | `toStreamingFailure` 가 상태 없는 `APIError` 를 오류 종류의 HTTP 상태로 바꿔 8절 갈래로 보낸다(`src/server/ai/client.ts` `STREAM_ERROR_STATUS` — overloaded_error 529 · api_error 500 · rate_limit_error 429 · 모르는 종류 500). 연결 · 끊음 오류(`APIConnectionError` · `APIUserAbortError`, 역시 상태 없는 APIError 하위 꼴)는 먼저 걸러 그대로 둔다. 재현(probe-a2): 첫 text 전 · 뒤 모두 예외 대신 `{ kind: "http", status: 529, errorType: "overloaded_error" }`. 재현(probe-fix2): rate_limit_error → rate_limit:429, 모르는 종류 → server:500, `details.error_code: enforced_spend_limit_reached` → console_limit:429(1-나 'AI 쉬는 중' 갈래까지 맞음). 시험: '스트림 도중 오류 이벤트(overloaded)가 첫 문장 전이면 다시 부르지 않고 서버 실패로 끝나며 행 하나를 남긴다'(`talk-stream-call.test.ts:444-464` — reason server · 요청 1 · 문장 0 · 행 `error/server:529`), '… 첫 문장 뒤면 보낸 문장을 두고 그 턴을 닫는다'(`:466-491` — `cut_after_first` · 보낸 문장 `Two apples!` · cause server · 행 1). 가짜 SSE 에 `errorAfterChars` · `errorType` 걸음(`tests/fixtures/ai/fake-anthropic.ts:300-331`, 실제 꼴 `{type:"error", error:{type, message}}`) |
| I1 의 다르게 한 것(첫 문장 전 오류 이벤트는 다시 부르지 않음) | 받음 | 6.1 '앱이 대화형 호출의 첫 바이트 전 연결 오류에만 1회 다시'(`specs/05-AI-호출.md:29`)이다. 8절 '회화 턴 실패'의 다시 부르기도 연결 오류 · 타임아웃만이다(`specs/07-음성과-오류.md:58`). 오류 이벤트는 HTTP 200 뒤(첫 바이트 뒤)의 서버 오류라 다시 부르지 않는 것이 정본과 맞다. 첫 검토 I1 '어떻게'의 시험 꼴과도 같다. 컨트롤러가 받았다 |
| M1 콜백 예외 | ADDRESSED | `onText` 예외를 결과의 `listenerError`(실패 갈래 connection)로 돌려준다(`client.ts` catch 첫 갈래). `streamTalk` 이 그 시도를 스냅숏 usage 와 함께 기록한 뒤 다시 던진다(`src/server/ai/talk.ts:305-318`). b 계약 '`onSentence` 는 던지지 않는다 — 연결이 닫혀도 삼키고 끝까지 받아 토리 행 저장'이 `talkTurn` 설명(`src/server/ai/index.ts`)과 보고 요청 2 에 있다. 시험 '문장을 받는 쪽이 던지면 그 시도를 기록한 뒤 그 오류를 다시 던진다'(`talk-stream-call.test.ts:493-511` — 같은 오류 객체 · 행 `error/connection`). 재현: 행 분류 connection · 스냅숏 입력 3500 |
| M1 분류(브리프 (2)) | 받음(관찰) | connection 은 1-나 '이어진 실패 수'에 든다(`src/core/ai/failure.ts` `countsTowardDown`). 계약대로면 이 길은 부르는 쪽 결함일 때만 열린다. 그래도 b 가 계약을 어기면 아이가 홈을 누를 때마다 AI 실패로 세어진다. b 검토에서 '연결이 닫힌 뒤에도 토리 행 저장 · 예외 없음' 시험을 볼 것 |
| M2 끊긴 시도 비용 | ADDRESSED | 실패 결과에 `snapshot`(`stream.currentMessage`)을 싣는다. `snapshotUsage` 가 그 usage 로 토큰 · 비용 · 답한 모델을 행에 넣는다(`talk.ts:401-421`). 첫 이벤트 전 끊김(스냅숏 없음)은 0 이다. 과대 셈: `billedAttemptsOf` 에 `stop_reason: null` 로 넘겨 거절 분류 거르기를 타지 않고, 스냅숏의 output 은 message_start 값(0~1)이라 더 세지 않는다. 시도마다 행 하나라 겹쳐 세지도 않는다. 시험 '끊기거나 끊은 시도의 ai_calls 행은 그때까지의 스냅숏 usage 로 입력 토큰 · 비용을 센다'(`talk-stream-call.test.ts:513-530`) |
| M3 가짜 SSE 모델 | ADDRESSED | message_start 모델이 첫 fallback 블록의 `from.model`(없으면 body.model)이다(`fake-anthropic.ts:261-273`). 시험 '가짜 SSE: message_start 는 요청 모델로 시작하고 …'(`talk-stream-call.test.ts:532-545`)은 고치기 전 꼴(body.model = claude-sonnet-5)에서 실패한다(코드로 대조). 기존 fallback 시험(`:251-267`)의 답한 모델 `claude-sonnet-5` 는 이제 SDK 가 fallback 블록에서 바꾼 값이다. 그 파일을 돌려 17/17 초록이므로 SDK 0.135 가 블록에서 모델을 바꾸는 것이 실제로 확인된다 |
| N3 보정(C101) | ADDRESSED(코드 설명) | `aiQuestion` 설명이 `ai_question` jsonb 열 · 다시 쓸 토리 차례에 넣지 않음으로 바뀌었다(`src/core/conversation/flow.ts:274-279`). 마이그레이션은 b 차례 4(C98 열과 함께)라 이번 diff 에 없는 것이 맞다. 보고 문장은 새 M1 |

## 2. 새 지적(fix 자리만)

**M1(Minor). 보고 '요청 2' 의 머리와 보충이 서로 어긋난다 — b 가 머리만 읽으면 C101 앞의 길로 간다**
- 무엇이: `task-p13-report.md:87` 요청 2 머리는 아직 '네 칸을 **DB 열 없이** b 가 만든다'와 '`aiQuestion` = … **토리 행 원문에 붙인 말에서**'다. 4단계 `moreChosen` 도 'AI 글 줄 뒤에 앱이 붙인 카드 질문 줄'로 적혀 있다. 같은 항목 끝의 '차례 2 보충'이 C101 열 · `MORE_PROMPT.en` 예외 · `nextQuestionIsAi(args, 입력)` · onSentence 계약으로 고친다. 보고 fix 2 표는 '요청 2 를 C101 로 고침'이라 적었다(`:185`).
- 왜: 이 항목은 b(차례 4~6) 구현자가 읽는 인계 문장이다. 머리를 따르면 C101 이 막으려던 길(원문 · 다시 쓸 토리 차례에서 AI 질문 읽기, 6.1 · AC-15k)로 간다. 4단계 끊긴 목표 턴에서도 고르기를 건너뛴다(fix 1 재검토 N1 이 막은 길).
- 어떻게: 요청 2 를 한 덩어리로 다시 쓴다. aiQuestion 은 `ai_question` 열, 다른 세 칸은 열 없이로 하고, moreChosen 의 `MORE_PROMPT.en` 예외 · aiQuestionSlot 의 입력 · onSentence 계약을 본문에 넣는다. 아니면 b 브리프(`task-p13-4.md`)에 그 결정만 따로 적는다. 코드는 바꿀 것이 없다.

## 3. 장부 판정

| 항목 | 판정 |
|---|---|
| a2 I1 · M1 · M2 · M3 | 닫힘(위 근거) |
| a2 'b 에 넘길 주의'(다시 쓸 토리 차례에 힌트 넣지 않음) | 닫힘 — C101 로 열 하나를 두고 코드 설명에 적힘 |
| 회11 (9) 이어 하기와 실린 AI 질문 | 아직 열림 — b. 이제 C101 로 `aiQuestion` 이 늘 채워지므로, 이어 할 때 흐름이 그 AI 질문을 낸다(회11 (9)는 '가장 오래전에 쓴 더 이야기할 거리'). b 에서 13절 한 줄로 넓히거나 이어 하기 때만 칸을 비워 읽는다 |
| 위험 2 · 3 · 4 | 아직 열림 — 차례 11 실호출 · 녹화 표본 |
| 정할 것 3(인사 끝 턴 막힘) | 아직 열림 — b |
| 새 M1(요청 2 문장) | 열림 — 컨트롤러가 직접 고치거나 b 브리프에 |

## 4. 라운드 판정

**Approved.** a2 의 지적 넷과 N3 보정이 모두 닫혔고 새로 깨뜨린 Critical · Important 는 없다. 새 Minor 하나는 인계 문서 문장이라 컨트롤러 몫이다. 통합 20(CI 4차) 결과는 이 재검토가 보지 못했다 — 빨강이면 그 결과를 더해 다시 봐야 한다.
