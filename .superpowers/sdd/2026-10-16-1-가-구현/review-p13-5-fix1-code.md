**라운드 판정: 수정 필요 — I-1 · I-2 · I-3 모두 ADDRESSED, M-1~M-11 결정대로 고침. 다만 fix 가 만든 새 Important 하나(N-1: stale 되풀이 중 자료 다시 읽기 뒤 다시 흘린 토리 말이 읽히지 않음)와 Minor 둘. e2e(CI 8차)는 이 보고를 쓸 때 아직 돌고 있었다(⚠️).**

# 재검토: P13b 차례 5 fix 1 — 코드(rev-p13b · code-reviewer · Opus · xhigh, 2026-10-22 22:xx, 범위 한정)

대상: 워크트리 p13 작업 트리 = CI 가지 `ci/p13-c1` d949bb8(15 파일 바이트 대조). fix 1 변경은 지난 검토 커밋 6d65d66 → d949bb8 diff(9 파일)로 읽었다.
기준 다시 확인(컨트롤러 알림 뒤): fix 2 가 같은 작업 트리에서 시작돼 talk-frame · tori · child-turn 이 d949bb8 뒤로 바뀌었다. 이 보고의 diff 읽기는 `git diff 6d65d66 d949bb8` 이었고, 인용한 줄 · N-1 근거(`[view.settings.speech]` 효과 · 처리기의 `queue.enqueue` · `useSpeakQueue` 의 `pump` 의존 `[speech, …]` · 쪽 `key={talk.version}` · `browser.ts` disposed 확인)를 `git show d949bb8:<경로>` 로 다시 맞춰 보았다 — 판정은 바뀌지 않는다.
근거: 검토 `review-p13-5-code.md`, fix 브리프 `task-p13-5-fix1.md`, 구현 보고 `task-p13-report.md` '차례 5 fix 1' 절, 정본 4절 회화 세션 표 · 3.3 · 7절 · C23 · C94.

## 0. CI 8차(run 39786048576, d949bb8)

unit · build · lint · depcruise · spec-trace · seed-validate · bundle-secrets · integration · check-ids 초록. **e2e · e2e-local 은 이 보고를 쓸 때 돌고 있었다** — I-3 · M-10(23503 줄 없음) · 새 e2e 셋의 결과는 컨트롤러 덧으로 본다.

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| **I-1** 끊김 · stale 막다른 기다림 | **ADDRESSED** | 되풀이를 `sendTalkTurnRetrying`(`src/lib/talk-stream.ts:180-210`) 하나에 모았다. 끊김: 브라우저가 온라인이면 `OFFLINE_RETRY_MS` 뒤 같은 시도 id 로 다시(`OFFLINE_RETRIES_MAX` 3), 오프라인이면 'offline'. stale: 처리기로 넘기지 않고 기다림 → `router.refresh()` → 기다림 → 같은 시도 id 로 다시(`STALE_RESENDS_MAX` 20 × 3초 = 서버 `TURN_IN_FLIGHT_MS` · 라우트 maxDuration 60초 안), 판이 바뀌면 쪽이 `key={view.version}` 로 틀을 새로 그리며 언마운트가 그 요청을 끊는다. 다 쓰면 끊김처럼. 틀은 offline · failed 모두 `retryAction` 이 있으면 '다시 해 보기'(`talk-frame.tsx:686-694`)와 online 때 다시. 단위 넷이 차례 · 기다림 · 같은 시도 id · 상한 · 끊음 신호를 가짜 fetch · 가짜 기다림으로 단언(`tests/unit/talk-stream.test.ts`). 다만 이 길에서 새 Important N-1 이 생겼다 |
| **I-2** 떠나도 턴 요청 · 읽기가 안 멈춤 | **ADDRESSED** | `submit` 마다 AbortController(`inflight`) — 다음 submit · '홈' · '그만하기' · 언마운트에서 끊고(`talk-frame.tsx` `abortInflight` · `useEffect(() => () => inflight.current?.abort(), [])`), 끊긴 결과는 아무것도 바꾸지 않는다. `sendTalkTurn` 은 신호가 서면 줄마다 처리기로 넘기기 전에 멈춘다(`talk-stream.ts:113` · `:129` · `:140`). `useSpeakQueue` 는 사라진 뒤 `enqueue` 무시 · 줄 비움(`tori.tsx` disposed 표지 — 마운트마다 다시 켬). 음성 접점 `speak` 는 `dispose` 뒤 `unsupported`(`browser.ts:415-417`) — 다른 `speak` 호출부는 `dispose` 전에만 부른다. 단위 '끊음 신호로 멈춘 요청은 aborted …' · `speech-speak.test.ts` 둘, e2e '토리 말을 흘려 받는 중 홈 → 홈에서 더 읽지 않는다'(읽은 수 4초 동안 그대로) |
| **I-3** AC-15l 시험 자리 | **ADDRESSED**(⚠️ CI 8차 e2e) | 찾기를 `[data-child-turn]` 안으로 좁혔다(`conversation.spec.ts:298-303`). 코드는 그대로(말풍선이 곧 다시 읽기 — 4절) |
| M-1 체감 대기 측정 | 고침 | 아이 차례가 `listenEndedAt`(듣기 끝 − 끝 조용함, '모름' 단추는 누른 때)을 넘기고 틀이 첫 문장 때와의 차(`perceivedWaitOf`)를 다음 턴에 — C23 정의(듣기 끝 대기 · 확인 시간 포함). 다시 보낸 턴은 그 기다림까지 든다(받아들임) |
| M-2 3단계 힌트 듣기 천천히 | 고침 | `hintRate` = 1~3단계면 `speech.slow_rate`, 토리 말은 1~2단계 그대로. e2e 3단계 시험이 토리 말 빠르기 1 · 힌트 듣기 slow_rate 를 단언 |
| M-3 정본 밖 글 셋 | 고침 | 옆 칸 제목 '오늘 이야기 목록'(4절 말). 나머지 둘은 컨트롤러가 plan-p13a 정본 밖 문구 표에 올렸다(`plan-p13a-…md:250`) — C94 꼴 |
| M-4 그림 턴 alt | 고침 | `alt=""` |
| M-5 문장 동시 흘러나오기 | 고침 | `english.slice(0, typed + 1)` — 앞 줄이 다 흐른 뒤 다음 줄 |
| M-6 C22 셈 두 곳 | 고침 | `talkCounterLimits` — P11a 셈에 말소리 없음 상한 무한, 틀 셈만 |
| M-7 상수만 보는 단위 | 고침 | I-1 단위 넷으로 바꿈 |
| M-8 '막히면 눌러요' 안 보이고 기록 | 고침 | `shouldMarkNudge(nudge, 힌트 단 수)` |
| M-9 단추 안 상태 줄 | 고침 | 기다림 표시를 단추 밖 같은 꼴 칸(`data-tori-waiting`)으로 — e2e 의 `data-wait-hint` · `data-wait-line` 그대로 |
| M-10 AC-N8 스트림 남김 | 고침(⚠️ CI 8차 23503 줄) | 시험 끝에 아이 차례(끝 줄)까지 기다림(`conversation.spec.ts:334-335`) |
| M-11 토막 넘김 · 더 이야기하기 실패 다시 해 보기 | 고침 · 단위 없음 받아들임 | `retryAction` 이 턴 보내기 · 토막 넘김 · 더 이야기하기를 같은 단추로. 서버 액션 실패를 e2e 로 만들려면 Next 서버 액션 요청을 가로채야 해 깨지기 쉽다 — 단위 없음을 받아들인다. 흐름이 틀 안 상태 셋(phase · retryAction ref · setPhase 재그림)뿐이라 읽어서 확인했다 |

## 2. 새로 깨뜨린 것(fix 자리에서 생긴 것만)

| 번호 | 심각도 | 무엇 | 왜(근거) | 어떻게 |
|---|---|---|---|---|
| N-1 | **Important** | **stale 되풀이 중 자료를 다시 읽으면 그 뒤 다시 흘린 토리 말이 읽히지 않는다.** 틀은 음성 접점을 `useEffect(…, [view.settings.speech])` 로 만든다(`talk-frame.tsx:213-217`). `router.refresh()`(I-1 되풀이 — `talk-stream.ts:206`)가 판이 같은 채 돌아오면 같은 열쇠라 틀은 남지만 `view` 는 새 객체라 그 효과가 다시 돌아 옛 접점을 `dispose` 하고 새로 만든다. 돌고 있는 되풀이의 처리기는 보낸 때의 `queue.enqueue` 를 쥐고 있고(`talk-frame.tsx:358` · `:364` · `afterBubble` `:287`), 그 읽기 줄의 `pump` 는 옛 접점을 쓴다. 옛 접점의 `speak` 는 이번 I-2 고침으로 `unsupported` 를 돌린다(`browser.ts:415-417`) | 같은 시도 id 가 아직 진행 중인 길(재검토 M-1 — 쪽을 다시 연 뒤 `retryTurn` · 끊김 뒤 다시 보냄)에서 다시 흘린 토리 말 · 붙인 질문 · 1단계 답 두 개가 글만 보이고 소리가 없다. 1단계는 답 두 개를 소리로만 들려준다(3.3 · T2 — 글이 없다). 말풍선 · ①② 를 누르면 지금 접점으로 다시 읽어 풀리지만, 아이는 소리가 없었던 것을 모른다. 새 e2e 'stale … 토리 말이 그려진다'는 글만 보고 읽기를 보지 않아 이 길을 지나친다 | 음성 접점을 설정 객체가 아닌 값으로 만든다 — 틀이 처음 받은 설정을 ref 로 쥐고 `[]` 로 한 번만 만들거나, 효과 의존을 `JSON.stringify(view.settings.speech)` 로. 또는 처리기가 늘 지금 읽기 줄을 부르게 `queueRef.current.enqueue`. stale e2e 에 '둘째 쪽 가짜 음성 기록의 읽은 글에 다시 흘린 문장이 있다'를 더한다 |
| N-2 | Minor | 서버의 '진행 중' 판정(차례 4 M-1, `turn.ts` own 갈래 — 그 아이 행 뒤 talk_turn ai_calls 행이 없으면 stale)에 밀리초 틈이 있다: 첫 요청이 호출 기록을 남긴 뒤 토리 행 저장 트랜잭션이 세션 행을 잠그기 전에 같은 시도 id 가 오면 AI 를 한 번 더 부른다 | 구현 보고 '남은 우려'. 운영에서는 드물게 비용 한 번 · 보인 말 ≠ 저장 말(차례 4 M-1 의 어긋남)이 남는다 | `ai_calls.called_at + latency_ms`(호출이 끝난 때)가 짧은 기술 값(예: 5초) 안이면 그 아이 행을 아직 진행 중으로 본다(토리 행 저장이 곧 옴). 4단계 'Oops' 뒤 다시 보냄은 그만큼만 늦는다 |
| N-3 | Minor | stale e2e(`conversation.spec.ts` '같은 시도 id 가 아직 진행 중이라 stale 을 받으면 …')가 시간에 기대 깜빡일 수 있다 — 아래 3절 | 첫 요청은 첫 조각 4초 뒤 끝나고(`firstDelayMs: 4000`), 둘째 쪽의 첫 다시 보내기는 '열린 때 + 3초'(기다림 둘)라 두 때가 몇백 ms 안에서 겹친다. 그 겹침이 N-2 의 틈에 들면 AI 요청 2 · 말풍선에 다른 말 → 빨강 | 3절 |

## 3. stale e2e 를 깜빡이지 않게 할 길(구현자 우려 판정)

우려는 맞다. 틈은 서버의 '호출 기록 남김 → 토리 행 저장 잠금' 사이 몇 ms 이고, 시험의 다시 보내기 때가 첫 요청이 끝나는 때와 같은 몇백 ms 안에 들어 확률이 0 이 아니다. 시험 꼴을 이렇게 바꾸면 시간에 기대지 않는다.

1. **둘째 쪽 요청을 문으로 묶는다.** `second.route("**/api/talk/turn", …)` 로 둘째 쪽의 첫 요청은 그대로 보내 stale 을 받게 하고, 둘째부터는 첫 쪽에 아이 차례(`[data-child-turn]`)가 보일 때까지 붙잡았다가 `route.continue()` 한다. 아이 차례는 끝 줄 뒤에만 열리고 끝 줄은 토리 행 저장 트랜잭션 뒤에 나가므로, 붙잡았다 보낸 요청은 늘 다시 흘림이다.
2. **stale 길을 지났음을 단언한다.** 둘째 쪽 턴 요청 수 ≥ 2(문에서 셈) · AI 요청 1.
3. **읽기를 단언한다(N-1).** 둘째 쪽 가짜 음성 기록의 읽은 글에 'Welcome back, friend.' 가 있다.

N-2 서버 고침을 하면 운영의 틈도 닫히지만, 시험은 1 만으로 결정적이 된다. 둘을 함께 권한다.

## 4. 장부(이번 범위)

`ledger-open.md` 102 행 N-1(차례 5 에 넘길 것): 바로 되풀이하지 않고 기다렸다 다시 읽고, 판이 같으면 같은 시도 id 로 다시 보내기까지 들어가 **닫힘**(`talk-stream.ts:180-210`). 위 새 N-1 은 다른 결함이다(자료 다시 읽기가 음성 접점을 다시 만듦).

## 5. 라운드 판정

**수정 필요(fix 2 에 함께).** 지적 열넷(I 셋 · M 열하나)은 모두 닫혔다. fix 가 만든 N-1 하나가 Important 다 — 1단계에서 다시 흘린 턴의 답 두 개가 소리 없이 지나간다. 이것과 N-3 시험 꼴(3절 1~3)은 fix 2(화면 검토 지적)에 함께 넣기를 권하고, N-2 는 Minor 로 컨트롤러 판단이다. fix 라운드는 이 차례에서 1 회째다.

fix 브리프 한 줄: N-1 음성 접점을 설정 객체 바뀜마다 다시 만들지 않게(ref · 값 의존) 또는 처리기가 지금 읽기 줄을 부르게 + stale e2e 를 둘째 쪽 요청 문(첫 요청 통과 · 나머지는 첫 쪽 아이 차례 뒤)으로 결정적으로 바꾸고 다시 흘린 문장이 읽혔음을 단언(N-3) + (선택) 서버 진행 중 판정에 호출 끝난 때 짧은 여유(N-2).
