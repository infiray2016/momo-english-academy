# 재검토 보고: UI · UX 묶음 0-마 fix 2(검토자 · Opus · xhigh, 2026-10-30 02:1x, fix 라운드 2/3)

판정: **Approved** · ADDRESSED 3 · NOT ADDRESSED 0 · 새로 깨뜨린 것 없음. 시험은 돌리지 않았고, 2-가 진행 중 파일의 lint · test 실패는 지시대로 판정에 넣지 않았다.

## 지적별
- **Important (1) 단언 보강 ADDRESSED.** heldUntil 이 끝까지 본 뒤 untilIndex ≤ fromIndex 면 ok 를 거짓으로 돌린다(screen-sampler.ts:169-170). 그래서 반응 앞에 그 글이 보인 표본이 적어도 하나 있어야 한다. fromAt 없이 쓰는 말하기 두 시험도 '처음 글이 보인 표본'이 시작이라 같은 규칙이 맞고, 단위 시험이 그 갈래를 잠근다.
- **Important (2) 빠른 갈래 늦춤 ADDRESSED.** delayTurnRequests(required-utterance.spec.ts:195-205)가 page.route 로 /api/talk/turn 을 1.5초 붙잡은 뒤 route.continue() 로 넘긴다. 쉬는 안내(:360-368)와 끝인사 상한 턴(:405-411)에만 걸고 끝나면 푼다. 앱 코드는 바뀌지 않았다.
- **Minor ADDRESSED.** sentAtOf 가 자원 시간 기록에 이 턴의 요청이 생길 때까지 expect.poll 로 기다린다(:172-189).

## 구현자 우려 2(붙잡은 요청이 흘림 응답을 그대로 넘기는가)
- 정적으로는 그렇다. route.continue() 는 붙잡은 요청을 원래 서버로 보내고 응답을 브라우저에 그대로 흘린다. 응답을 모아 다시 주는 route.fetch() + fulfill() 꼴이 아니라 NDJSON 흘림이 끊기지 않는다. 늦춤은 요청이 서버에 닿기 전이라 서버 쪽 판정(쉼 · 상한 닫힘)은 바뀌지 않는다. 자원 시간 기록의 startTime 은 쪽이 fetch 를 부른 때라 '보낸 때'가 그대로이고, 기다림 표시(onAttempt 에서 켜짐)는 서버와 무관하게 1초 안에 뜬다. 그 사이 붙잡힌 다른 회화 턴 요청이 없어(두 시험 모두 그 턴 하나) 엉킬 자리도 없다. 실제로 흘림이 이어지는지는 실행 기록에서 확인한다.

## 판정
**Approved**(fix 라운드 2 에서 닫힘). 남은 것은 장부의 둘이다. 질문 답 시험은 5-나 가 인식 글 줄을 그리기 전까지 실패가 예상되고, 필수 둘 · AC-23f · AC-23g 는 11-01 뒤 CI 실행 기록이 들어오기 전에는 완료가 아니다(plan '필수 둘').
