# 재검토 보고 A(fix 1): 범위 한정(code-reviewer · Opus · xhigh, 2026-10-29)

**판정: Approved · ADDRESSED 9 · NOT ADDRESSED 3(모두 컨트롤러 결정으로 장부 이관, 막지 않음) · 새 지적 2(모두 Minor)**

작업 자리 `.claude/worktrees/p13d` 의 fix 1 자리를 지금 판으로 읽었다. 검토하는 동안 다른 구현자가 `talk-frame.tsx` 를 함께 고치고 있어 줄이 15줄쯤 밀렸다. 아래 줄은 마지막으로 다시 찾은 위치이고, A 의 고침 내용은 옮겨진 자리에서 그대로임을 다시 확인했다. 범위는 fix 1 이 손댄 자리와 그 영향뿐이다. 시험은 돌리지 않았고 e2e 도 돌리지 않았다(브리프 지시). 줄 번호는 지금 판이다.

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 힌트 문장 듣기가 읽기 줄에 끊김 | ADDRESSED | 단추가 `listenHint` 를 부르고(`child-turn.tsx:497-505`), `listenHint` 는 읽기 줄을 먼저 멈춘 뒤 힌트를 읽는다(`:190-205`). 틀은 `onHintListen={() => queue.cancel()}` 을 넘긴다(`talk-frame.tsx:1204`). `queue.cancel()` 이 세대를 올리고 쉼을 끊으므로, 끊긴 발화의 cancelled 를 받은 옛 펌프는 다음 문장으로 가지 않고 끝난다(`tori.tsx:459-475 · 488-496`). 시험(`speech-feedback.test.ts:297-352`)은 멈춤 없이 부르면 ['One.', 힌트, 'Two.' …]가 되어 실패하므로 `listenHint` 의 차례를 잠근다 |
| I-2 U5-4 문구 | ADDRESSED | '말소리가 안 들려서 {이름}(이/가) 도와줄게요'(`child-turn.tsx:54-61`)는 3.3 막힘 문단의 '답 예시를 들려주고 같은 질문을 다시 묻는다'(`specs/02-2-세션과-단계표.md:129`)와 맞다. 이름이 없을 때 '선생님이', 받침 있음 · 없음을 시험이 본다(`speech-feedback.test.ts:195-206`). e2e 상수도 바뀌었다(`speech-feedback.spec.ts:40 · 271`) |
| M-1 이어 붙인 질문 전에 아이 차례가 열림 | ADDRESSED | 판정이 '다 흐름을 알린 때의 줄 수 < 지금 보일 줄 수'면 열지 않는다(`child-turn.tsx:164-184`). 줄 수는 ToriBubble 이 다 흐름을 알릴 때 그 렌더의 말풍선으로 센다(`talk-frame.tsx:1143-1146`). `more()` · 인사 뒤 대화로 이어 붙일 때 같은 커밋의 틀 효과는 옛 typedDone 을 읽어도 줄 수에서 막힌다. 따라 말하기 뒤 새 말풍선은 `setTypedDone(false)` 로 막는다(`:569`). 두 줄 답(two_answers)처럼 글이 늘지 않는 말은 줄 수가 그대로라 막지 않는다. 시험은 순수 함수만 본다(N-2) |
| M-2 감시 timeout 이 듣기 요약에서 cut | ADDRESSED | timeout 을 따로 읽어(`listen-log.ts:81`) 시작 알림이 없었어도 그때 끝난 것으로 센다(`:107`). 앞 발화의 timeout 은 새 speak 뒤에 생기지 않으므로(`browser.ts:488-494`, 감시는 지금 발화에만) 창 안에서 섞이지 않는다. 시험은 tc 가 cut 이 아니라 ms(500)임을 본다(`talk-listen-log.test.ts:311-337`). '감시로 살린 턴' 표시는 컨트롤러 결정으로 장부에 남는다 |
| M-3 따라 말하기 중 막힘 → 쪽을 연 때의 차례 | ADDRESSED | 따라 말하기 토막이면 `router.refresh()` 뒤 새 `view.follow` 가 올 때 막힘을 푼다(`talk-frame.tsx:915-922 · 999-1005`). 틀의 key 는 `${턴 행 수}:${토막}:${고아 행}`(`src/server/conversation/index.ts:562`)이라 따라 말하기 저장으로는 바뀌지 않는다. 그래서 틀은 그대로이고 props 만 새로 온다. 막힌 동안 FollowAlong 이 사라졌으므로 풀릴 때 새 `done`(`index.ts:620`, attempts 에서 읽음)으로 다시 그려진다. 막힌 차례는 판정이 mic-unavailable · mic-stalled 라 저장되지 않으므로 그 차례부터 이어진다. 정리 토막은 첫 줄부터(컨트롤러가 받아들임). e2e(`speech-feedback.spec.ts:378-417`)는 정적으로 맞게 읽힌다(대본 차례: 인사 → 첫 낱말 → not-allowed → 확인 소리) |
| M-5 (다) '같은 자리' 시험 | ADDRESSED | `runMicRetry` 로 떼어(`mic-blocked.tsx:41-57`) 시험이 unlock → check → clear → recovered 와 실패 때 unlock → check 만을 본다(`speech-feedback.test.ts:387-414`). async 함수라 await 앞의 `unlockFromGesture` · `checkMicrophone` 이 누름 처리 안에서 동기로 돈다(`mic-blocked.tsx:129-135`) |
| M-6 힌트 받기 실패 때 점 셋이 안 끝남 | ADDRESSED | 받기가 undefined 이거나 거절이면 실패 단을 세우고(`child-turn.tsx:282-289`), 그 단은 빈 단이다(`:474-479`, `hintTierStateOf` `:208-214`) |
| M-7 쉬는 안내 · 끝인사 아래 아이 말풍선 | ADDRESSED | 첫 문장(`talk-frame.tsx:658`) · 쉬는 안내(`:702`) · 끝인사(`:624`)에서 지우고 보낼 때 세운다(`:806`) |
| M-8 배치 막힘 화면에 '다시 해 볼래요' 없음 | ADDRESSED | 배치가 retry 를 넘기고(`placement-flow.tsx:279-291`), 판정 전 막힘이면 안내 · 준비로 간다(`:93-99`). 문항 중 막힘은 문항 조각이 사라졌다 다시 그려지므로 그 안의 실패 셈도 처음부터다 |
| M-4 목표 턴 칭찬 가림 | NOT ADDRESSED(컨트롤러 결정, 장부 L-9) | 바뀐 것 없음. I-1 고침으로 힌트 듣기도 읽기 줄을 비우므로 같은 칭찬 조건(`talk-frame.tsx:512-516`)이 힌트 누름에서도 켜질 수 있다. 화면 검토 때 같이 본다 |
| M-5 (가) · (나) | NOT ADDRESSED(컨트롤러 결정, e2e 몫) | R1 · U4-4 · U5-4 의 시간 동작은 여전히 돌리지 못한 e2e 만 잠근다(L-2) |
| M-9 새 키 없는 DB 범위 | NOT ADDRESSED(컨트롤러 결정, L-7 닫힘) | 코드 고침은 원래 필요 없던 지적이다 |

## 2. 새로 깨진 곳 점검

- **I-1 의 queue.cancel 경합.** 읽기 줄이 쉼 중이면 `sleeper.cancel()` 로 잠이 거짓을 돌려 끝나고, 발화 중이면 cancelled 뒤 세대 비교로 끝난다. 그 뒤 힌트 `speak` 는 이미 빈 접점에서 읽힌다. 듣는 중에는 단추가 꺼져 있어(`child-turn.tsx:496`) 듣기와 겹치지 않는다. 읽기가 없을 때 누르면 앞 힌트 소리만 끊는다. 기존 e2e 의 힌트 듣기 두 곳(`conversation.spec.ts:253 · 590`)은 읽기 끝 뒤에 누르므로 결과가 같다. 깨진 곳은 없다.
- **M-3 의 다시 읽기 길.** `unblockOnRefresh` 는 다음 `view.follow` 한 번에만 쓰이고, 다른 다시 읽기(턴 stale `:734`)는 대화 중에만 일어나 겹치지 않는다. 다시 읽기가 실패하면 막힘 화면에 남고 단추를 다시 누를 수 있다. 그동안 마이크 상태는 이미 지워졌고 셈도 비워졌으므로 다시 눌러도 해가 없다. 깨진 곳은 없다.
- **M-1 의 열기 조건.** 새 말풍선(turnKey)으로 바뀌는 길은 셋이다. 턴 보냄은 `bubble.done=false` 로, 따라 말하기 뒤는 `setTypedDone(false)` 로, 끝인사 · 쉬는 안내는 phase 로 막힌다. 막힘 뒤 다시 그려질 때는 phase 가 그대로라 아이 차례가 그대로 남는다. 깨진 곳은 없다.

## 3. 새 지적(fix 1 이 만든 것만)

**N-1(Minor). 시험 이름이 배치에는 '다시 해 볼래요'가 없다고 적는다.** `speech-feedback.test.ts:210` 의 이름 '넘기지 않으면(배치) 없다'와 `:224-227` 의 단언은 M-8 뒤 사실과 다르다. 배치도 이제 retry 를 넘긴다(`placement-flow.tsx:279-291`). 단언 자체(retry 없이 그리면 단추 없음)는 맞으므로 이름의 '(배치)'만 지운다.

**N-2(Minor). I-1 · M-1 의 틀 배선은 어떤 시험도 잠그지 않는다.** I-1 시험은 시험이 직접 만든 stopReading 을 넘기고, M-1 시험은 순수 함수만 본다. 그래서 `talk-frame.tsx:1204` 의 `onHintListen` 을 빈 함수로 바꾸거나 `:1145` 의 줄 수 저장을 빼도 단위 · e2e 가 모두 통과한다. 읽는 중 힌트 듣기를 보는 e2e 도 없다(기존 두 곳은 읽기 끝 뒤에 누름). e2e 를 돌릴 수 있게 되면 느린 읽어 주기(SLOW_UTTER_MS)에서 힌트를 열고 듣기를 눌러 마지막 발화가 힌트이고 `data-talk-reading` 이 사라지는지 보는 시험 하나를 더한다.

## 4. 라운드 판정

**Approved.** Important 둘이 모두 ADDRESSED 다. NOT ADDRESSED 셋은 컨트롤러 결정으로 장부에 옮겨졌고 이번 판정을 막지 않는다. 새 지적 둘은 Minor 라 컨트롤러가 직접 고치거나 장부로 넘겨도 된다. e2e 미실행(L-2)은 그대로 남는 위험이다. 특히 새 M-3 e2e 와 바뀐 U5-4 e2e 는 정적으로만 맞춰져 있다.
