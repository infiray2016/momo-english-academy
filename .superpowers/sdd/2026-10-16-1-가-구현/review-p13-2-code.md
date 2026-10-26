# 코드 검토: P13a 차례 2(검토 묶음 a2) — rev-p13 · code-reviewer · Opus · xhigh · 2026-10-22 18:3x

**판정: 수정 필요 — Critical 0 · Important 1 · Minor 3**

대상: 워크트리 p13(HEAD f3adcd8) 미커밋 변경. 바뀐 것은 `src/server/ai/{client,talk,run,index}.ts` · `src/core/conversation/flow.ts`(N1 · N2 · N3) · `tests/fixtures/ai/{fake-anthropic,sample-inputs}.ts` · `tests/contract/ai-schemas.test.ts` · 견본 아홉 옮김 · `tests/integration/conversation-call.test.ts`(20) · `tests/unit/talk-stream-call.test.ts`(12) · flow 시험 둘이다.
요구사항: plan-p13a 작업 2(파일별 값 3~6), 브리프 `task-p13-2.md`(N1~N3), 13절 C92 · C89, 6.1 대체 모델 · 캐시 · 기록(`specs/05-AI-호출.md:29` · `:35` · `:37` · `:41`), 8절 회화 턴 실패(`specs/07-음성과-오류.md:56` · `:58`).
확인 방법: diff 를 읽었다. 의심 둘은 저장소 밖 스크립트(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/p13rev/probe-a2.mts`, tsx · react-server 조건)로 SDK 실제 스트림 처리를 돌려 확인했다. 통합 이름은 스크립트로 글자 대조했고 `pnpm check:deps` 를 돌렸다. 통합 20 은 이 Mac 에서 돌 수 없어 CI 3차 결과를 보지 못했다(⚠️).

## 1. 설계 준수

| 볼 것(브리프) | 판정 | 근거 |
|---|---|---|
| (1) 첫 문장 전 연결 · 타임아웃 한 번 다시 | ✅ | `streamTalk` 이 `talkAttemptNext` 로 정한다(`src/server/ai/talk.ts:361-373`). 같은 본문이다 — 통합 '회화 턴: 첫 문장 전 연결 오류는 …'이 본문 글자를 견준다. 첫 text 기다림은 제 시계로 끊는다(`client.ts` firstTimer · totalTimer, 위험 1) |
| (1) Haiku 거절 → Sonnet 한 번 · 첫 문장 뒤 실패는 닫기 | ✅ | `otherModelConfigOf`(`talk.ts:500-526`) · `:374-389`. 다시 부른 쪽도 거절이면 refusal 행 둘이다. 첫 문장 뒤 거절 · 끊김 · max_tokens 는 `cut_after_first` 로 보낸 문장을 둔다 |
| (1) 끝맺음 턴 거절은 실패(다르게 한 것 5) | ✅ 받음 | 첫 문장 개념이 없는 끝맺음 턴은 8절 '정리가 두 번 실패하면 요약 없이 닫는다'(`07-음성과-오류.md:59`)로 다시 돈다. 1~3단계 끝맺음은 잘한 말이 없어 잃는 것은 요약 하나다 |
| (1) 안전 상한 · 설정 문제 | ✅ | `runTalkCall` 이 `preCallGate` → safety_cap 행 하나(`talk.ts:590-602`), 설정 · 목록 · 키 문제는 config · 행 없음(`:560-581` · `:604-619`) |
| (1) 스트림 도중 오류 이벤트 | ❌ | I1 — 문서에 있는 mid-stream `error` 이벤트가 실패 길을 벗어나 예외로 나간다 |
| (2) fallback 블록 · 답한 모델 · 비용 · first_sentence_ms | ✅(M3) | 조각을 차례로 잇고(`client.ts` text 조각만), 비용은 `billedAttemptsOf`(iterations 항목별), 행마다 요청 · 답한 모델 · 토큰 · first_sentence_ms(서버가 요청을 받은 때부터, `talk.ts:262-267` · `:301`). 가짜의 fallback 꼴은 M3 |
| (2) 캐시 | ✅ | `buildAiRequest` multiTurn 그대로. 거절 재시도만 모델이 바뀐다 — 통합 AC-15k 가 넷째 요청이 Haiku 로 돌아오는 것까지 본다 |
| (2) 끊긴 시도 비용 0(우려 3) | ⚠️ | 10절 알림 · 하루 안전 상한 비용을 조금씩 덜 센다 — M2 |
| (3) C92 경계 | ✅ | 이번 diff 는 `talkTurn(input, ctx & { onSentence })` 까지다(`index.ts:134-154`). NDJSON · 같은 출처 · 첫 줄 `requireAccess` 는 b 의 Route Handler 몫(plan-p13b 값 5)이고 diff 에 Route Handler 가 없다. 넘기는 문장은 {NAME} 을 채우기 전 글이라 b 가 `fillName` 한다 |
| (4) 가짜 SSE 꼴 | ✅(M3) | message_start → content_block_start/delta/stop → fallback 블록 → message_delta(usage · iterations) → message_stop(`fake-anthropic.ts` `streamStepsOf`). 끊김은 undici 'terminated' 꼴. 비스트리밍 응답은 그대로다. 단위 602 초록(구현 보고)이고, 통합 · e2e 는 CI 결과를 보지 못했다 |
| (5) 통합 이름 스물 · 견본 제자리 | ✅ | plan-p13a 증명 표의 통합 이름 20 과 `it(` 이름 20 이 글자로 같다(빠짐 0 · 남는 것 0 · 겹침 0, skip · todo 없음). 견본 아홉이 `samples/` 로 옮겨졌고 계약 시험이 talk_turn 갈래 · 엄격 제목에 넣었다(`tests/contract/ai-schemas.test.ts:190-200` · `:221-229` · `:255`). 다른 통합 시험은 견본을 이름으로만 읽는다(readdir 없음) |
| (6) sdk-only-in-ai · core 의 server-only | ✅ | `pnpm check:deps` 위반 0(172 모듈). `src/core/conversation/*` · `calls/talk.ts` 는 `@/server` · server-only 를 가져오지 않는다 |
| (7) 다르게 한 것 · N1~N3 | ✅ | 아래 4절 |
| (8) 새 시험이 거짓 초록인지 | ✅ | 통합 20 · 단위 12 모두 단언이 있고 가짜 요청 수 · 본문 · ai_calls 행을 본다. 빈 시험은 없다. 다만 오류 이벤트 · fallback 모델 바뀜은 가짜가 만들 수 없어 시험이 비어 있다(I1 · M3) |

## 2. 잘한 점

- **DB 없는 몫과 앞머리를 나눈 것**(다르게 한 것 1). 통합을 로컬에서 못 돌리는 사정에서 실패 길 열두 갈래를 SDK 의 실제 스트림 처리 위에서 단위로 본다(`tests/unit/talk-stream-call.test.ts`). runAiCall 과 같은 차례(설정 → 학습일 → 단가표 → 조합 → 안전 상한 → 목록 → 가림)를 그대로 지켰다.
- **기다림을 제 시계로 잰다.** 첫 text 상한과 전체 상한을 따로 두고 `startedAt + 타임아웃 × 2` 안에서만 다시 부른다(`talk.ts:249-251` · `:276-292` · `:368`). SDK timeout 의미에 기대지 않는 위험 1 의 막는 법이 코드에 그대로 있다.
- **흘려 보낸 글과 기록이 어긋나지 않는다.** 결과의 tori_en 을 '보낸 문장을 이은 글'로 바꾸고(`talk.ts:465-467`) 출력 검사에서 tori_en 을 다시 보지 않는다. 다시 쓸 토리 차례(6.1)가 화면에 보인 글과 같아진다.
- **run.ts 를 동작 그대로 내보냈다.** `alertSameError` 로 꺼낸 부분은 조건 · 값이 같다(diff 대조).
- N1 · N2 를 시험과 함께 정확히 반영했다(아래 4절).

## 3. 지적

### Important

**I1. 스트림 도중 `error` 이벤트(예: overloaded_error)가 8절 실패 길을 벗어나 예외로 나간다 — ai_calls 행도 남지 않는다**
- 무엇이: SDK 는 SSE `event: error` 를 상태 없는 `APIError(undefined, …)` 로 던진다(`node_modules/@anthropic-ai/sdk/core/streaming.js:122-126`). `toStreamingFailure` 는 `APIError` 를 `toAttemptFailure` 로 넘긴다(`src/server/ai/client.ts:197-207`). 그런데 그 함수는 상태가 숫자가 아니면 그대로 던진다(`client.ts:118-133`). 그래서 `sendStreamingAttempt` 의 catch 안에서 다시 던져진다(`client.ts:262`). 재현: 가짜 fetch 로 message_start 뒤 `overloaded_error` 이벤트를 보내면 첫 text 전 · 뒤 모두 `THROWS APIError (status undefined)` 이다. `streamTalk` · `runTalkCall` 이 거부되어 그 시도의 ai_calls 행이 없다. 첫 문장을 이미 보냈으면 `cut_after_first` 로 닫히지도 않는다.
- 왜: Anthropic 스트리밍 문서는 사용량이 많을 때 이벤트 스트림 안에서 `overloaded_error` 같은 오류를 보낼 수 있다고 적는다(외부 사실, 문서 'Streaming Messages — Error events', 확인 정도: 문서 기억 · SDK 코드로 처리 꼴 확인). 8절 '회화 턴 실패'(`07-음성과-오류.md:58`)는 첫 문장 뒤 실패면 보낸 문장을 두고 닫고, 첫 문장 전이면 실패 길(1~3단계 칭찬 대사 + 다음 질문, 4단계부터 'Oops')로 가라고 한다. 6.1 은 호출마다 ai_calls 행을 요구한다(`05-AI-호출.md:41`). 행이 빠지면 하루 안전 상한 셈과 'AI 쉬는 중'의 이어진 실패 수(1-나)도 어긋난다. 가짜 SSE 에 오류 이벤트 걸음이 없어 시험이 이 길을 보지 못한다.
- 어떻게: `toStreamingFailure` 에서 상태 없는 `APIError` 를 `error.type`(또는 본문 `error.type`)으로 가른다. 예: overloaded_error · api_error → server, rate_limit_error → rate_limit, 그 밖은 server. `FakeReply` stream 에 '이 글자 뒤 오류 이벤트' 걸음(예: `errorAfterChars` · 오류 꼴)을 더한다. 단위 시험 둘을 더한다 — 첫 문장 전이면 실패(행 1, 다시 부르지 않음), 첫 문장 뒤면 `cut_after_first`(보낸 문장 그대로, 행 1).

### Minor

**M1. 부르는 쪽(`onSentence`)이 던지면 그 시도의 ai_calls 행 없이 예외로 끝난다 — b 계약을 적어야 한다**
- 무엇이: `onText` 안의 예외는 스트림을 끊고 그대로 다시 던진다(`client.ts:232` · `:245` · `:259`). `emit` 은 `plan.onSentence` 를 부른다(`talk.ts:262-268`). b 의 NDJSON 쓰기는 아이가 홈을 눌러 연결이 닫히면 던질 수 있다. 그러면 행이 빠지고(6.1), 토리 행도 저장되지 않는다(5절 '토리의 말은 응답이 끝난 뒤 저장').
- 어떻게: 둘 중 하나를 고른다. 하나는 콜백 예외 때도 그 시도 행을 남긴 뒤 다시 던지는 것이다. 다른 하나는 `talkTurn` 설명과 b 브리프에 '`onSentence` 는 던지지 않는다 — 브라우저 연결이 닫혀도 쓰기 실패를 삼키고 응답을 끝까지 받아 토리 행을 저장한다(8절 끝맺음 없이 떠난 대화가 같은 시도 id 로 이어 받음)'를 적는 것이다. 뒤쪽을 권한다.

**M2. 끊기거나 끊은 시도의 토큰 · 비용을 0 으로 남긴다(우려 3) — 스냅숏 usage 로 셀 수 있다**
- 무엇이: 실패 시도 행은 `emptyRecord`(토큰 0 · 비용 0)다(`talk.ts:305-316`). 이것은 연결 끊김뿐 아니라 제 시계로 끊은 타임아웃(첫 text 전 · 뒤)에도 그렇다. 재현: 끊긴 스트림에서도 `stream.currentMessage.usage` 에 message_start 의 입력 토큰(`input_tokens 3500`)이 남아 있다.
- 왜: 6.1 '출력 도중 거절은 나온 만큼 센다'(`05-AI-호출.md:41`)의 뜻은 과금된 만큼 적는 것이다. 첫 바이트 뒤 끊은 시도는 입력이 과금된다(추측 — 과금 규칙 확인 정도 낮음). 10절 월 비용 알림 · `ai.safety_daily_cost_usd` 는 ai_calls 비용 합이라 타임아웃 · 끊김마다 조금씩 덜 센다. 횟수 상한은 영향이 없고 빈도가 낮아 Minor 다.
- 어떻게: `StreamingAttemptResult` 실패 꼴에 `stream.currentMessage?.usage` 를 싣고, `streamTalk` 이 그 usage 로 `costOf` 를 계산해 행에 넣는다(답한 모델은 스냅숏 모델).

**M3. 가짜 SSE 의 message_start 모델이 처음부터 마지막(대체) 모델이라 '대체 모델로 바뀜'을 시험이 보지 못한다**
- 무엇이: `streamStepsOf` 는 message_start 에 `...body` 를 그대로 싣는다(`tests/fixtures/ai/fake-anthropic.ts:258-266`). fallback 견본의 `model` 은 `claude-sonnet-5` 이므로 스트림이 처음부터 대체 모델로 시작한다. 실제 스트림의 message_start 는 요청 모델이고, fallback 블록이 오면 SDK 스냅숏이 `to.model` 로 바뀐다(plan-p13a 확인한 사실 1). 지금은 SDK 가 모델을 바꾸지 않아도 '답한 모델' 시험(통합 AC-8f 비용 · 단위 fallback)이 초록이다.
- 어떻게: body 에 fallback 블록이 있으면 message_start 모델을 첫 fallback 블록의 `from.model` 로 둔다(없으면 body.model). 위험 12 의 '문서의 이벤트 차례 그대로'에 맞춘다.

## 4. 다르게 한 것 · 넘긴 Minor 판정

| # | 내용 | 판정 | 까닭 |
|---|---|---|---|
| 1 | `streamTalk` · `runTalkCall` 나눔 | 받음 | 앞머리 차례는 runAiCall 그대로이고 DB 없는 몫을 단위로 본다 |
| 2 | run.ts 에서 셋 더 내보냄 · `alertSameError` 꺼냄 | 받음 | 동작이 같다(diff 대조) |
| 3 | 응답 글은 text 블록을 이은 글, 아니면 마지막 fallback 뒤 글 | 받음(주의) | 값은 받지만 흘려 보낸 문장은 이은 글 기준이다. 대체 모델이 처음부터 다시 쓰는 꼴이면 화면 글과 값이 어긋난다. 위험 4 는 녹화 표본(차례 11) 전까지 열림 |
| 4 | `TalkDeps.metaPhrases` | 받음 | P9c 목록 꼴을 고치지 않음 |
| 5 | Haiku → Sonnet 은 회화 턴만 | 받음 | 1절 표 |
| 6 | 결과에 `streamed` · `retriedOtherModel` | 받음 | b 가 위험 3 길 · 기록을 가를 수 있음 |
| 7 | `sample-inputs.ts` 견본 빌더 | 받음 | 시험 자료, 계약 · 통합 · 단위가 같은 입력 |
| N1 | 4단계 목표 턴 끊김 → 'Do you want to talk more?' | ADDRESSED | `flow.ts:867-875`, 시험 '4단계부터 목표 턴이 첫 문장 뒤 끊기면 …'(뜻은 4단계만) |
| N2 | '모름' 턴은 AI 자리 아님 | ADDRESSED | `nextQuestionIsAi(args, input)` · `after.dontKnowCount === 0`(`flow.ts:744-770`), 시험 "'모름'을 보낼 턴은 AI 자리가 아니고 …"이 max 번째 '모름'은 참까지 본다 |
| N3 | 저장 칸 없음(컨트롤러 결정) | ADDRESSED(설명) | `flow.ts:274-279` 설명만. 주의: 컨트롤러 결정의 '다시 쓸 토리 차례(응답 전문)'는 응답 전문이 아니라 화면에 보인 영어 글이다(6.1 `05-AI-호출.md:35`, AC-15k). b 가 힌트 · 답 예시를 그 글에 넣으면 다음 턴 요청의 assistant 글이 바뀌어 6.1 · AC-15k 를 어긴다. 구현 설명대로 '없는 칸은 비움'(영어 질문만 다시)이 맞다 — b 브리프에 이 한 줄을 넣기를 권한다 |

## 5. 장부 판정

| 항목 | 판정 |
|---|---|
| fix 1 재검토 N1 · N2 | 닫힘(위 4절) |
| fix 1 재검토 N3 | 닫힘(컨트롤러 결정 · 설명) — b 브리프 주의 한 줄 남음 |
| 회11 (9) 이어 하기와 실린 AI 질문(fix 1 재검토 N3 의 둘째 점) | 아직 열림 — b 가 `aiQuestion` 을 채우면 이어 할 때 '가장 오래전에 쓴 더 이야기할 거리'(회11 (9), C95) 대신 그 질문이 나온다. b 에서 정함 |
| 구현 보고 요청 1(계약 시험 talk_turn 갈래 · 견본 제자리) | 닫힘 |
| 위험 2 · 3 · 4(우려 1 · 2) | 아직 열림 — 차례 11 실호출 · 녹화 표본 몫(가짜로만 확인) |
| 정할 것 3(인사 끝 턴 막힘) | 아직 열림 — b |
| 새 I1 · M1~M3 | 열림 — fix 라운드 1 |

## 6. 판정

**수정 필요(Critical 0 · Important 1 · Minor 3).** I1 은 오류 이벤트 분류 몇 줄, 가짜 SSE 걸음 하나, 시험 둘이면 닫힌다. M1 은 b 계약 문장, M2 는 스냅숏 usage, M3 는 가짜 message_start 모델이다. 통합 20 의 CI 3차 결과는 이 검토가 보지 못했다 — 빨강이면 그 결과를 이 판정에 더해야 한다.
