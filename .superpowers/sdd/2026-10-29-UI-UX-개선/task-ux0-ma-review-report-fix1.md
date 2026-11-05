# 재검토 보고: UI · UX 묶음 0-마 fix 1(검토자 · Opus · xhigh, 2026-10-30 02:0x, fix 라운드 1/3)

판정: **Changes requested** · ADDRESSED 3 · NOT ADDRESSED 0 · 새로 깨뜨린 것 Important 1 · Minor 1. 시험은 돌리지 않고 정적으로 대조했다.

## 지적별
- **I1 ADDRESSED(갈래 둘 더함).** 끝인사: talk.safety_max_turns 를 2 로 낮춰 withHouseholdSetting 이 되돌리고(required-utterance.spec.ts:352-388), 서버는 둘째 아이 턴에서 AI 없이 카드 safetyFarewell 로 닫는다(turn.ts:865-868 · :915). 견본 끝인사에 {NAME} 이 없어 글 비교가 맞고(tests/fixtures/seed/builders.ts:2174), 말풍선 textContent 는 sr-only 전체 글을 담아(tori.tsx:152-155) 반응 표본이 도착 즉시 잡힌다. 질문 답: 질문 둘만 있는 1단계 수업에서 '잘 말했어요' 뒤 큰 '다음'(speaking.tsx:541-548)까지 data-heard 가 남는지 잰다(:481-555). 단언 순서는 화면과 맞다. 다만 끝인사 단언은 아래 새 Important 때문에 지금은 빈 채 통과할 수 있다.
- **M1 ADDRESSED.** N-16 에서 둘째 프로필과 남의 세션 갈래를 빼고 까닭을 적었다(required-recovery.spec.ts:802-827). 그 길은 session-destination.test 와 통합 session-flow.test:538 이 지킨다. 이제 프로필이 하나라 흔들림이 없다.
- **M2 ADDRESSED.** longestBlankMs 가 빈 표본 시작부터 다음 표시 표본까지의 시각 차로 잰다(screen-sampler.ts:110-124). heldUntil 에 fromAt 을 더해 보낸 시각부터 재며(:144-169), 보낸 시각은 회화 턴 요청의 자원 시간 기록 시작이다(:175-187, required-utterance.spec.ts:170-182). 단위 시험 둘이 시각 차와 늦게 뜬 말풍선을 잠근다.

## 새로 깨뜨린 것
- **Important: 반응이 빠른 갈래(쉬는 안내 · 끝인사)에서 남음 단언이 빈 채 통과한다.** heldUntil 은 fromAt 뒤 첫 표본을 시작으로 잡고, 그 표본이 이미 반응을 보이면 untilIndex === fromIndex 라 검사할 표본 없이 ok 다(screen-sampler.ts:144-169). 쉬는 안내(:326-350)와 끝인사(:352-388)는 서버가 AI 없이 바로 답해(turn.ts 쉼 :833-836 · 상한 :865-) 보낸 뒤 100ms + 표본 간격 안에 반응이 그려질 수 있다. 그러면 아이 말풍선이 한 번도 안 그려지는 결함도 통과한다. fix 전에는 '처음 글이 보인 표본'에서 시작해 적어도 한 번은 보여야 했다. 고칠 것: (1) 남음 단언에 untilIndex > fromIndex(반응 앞에 말풍선이 보인 표본이 적어도 하나)를 더하고, (2) 두 빠른 갈래는 시험에서만 page.route 로 /api/talk/turn 응답을 1~2초 늦춰 재는 창을 만든다(앱 코드 변경 없음). 첫 문장 갈래는 FIRST_DELAY_MS 2.5초라 이 문제가 없다.
- **Minor: 보낸 시각 기록이 응답이 끝나야 생긴다.** 자원 시간 기록은 fetch 본문을 다 받은 뒤 들어오는데, sentAtOf 는 첫 문장이 보이고 400ms 뒤 한 번만 읽는다. 흘림이 그보다 늦게 끝나면 기록이 없어 시험이 실패한다. expect.poll 로 기록이 생길 때까지 기다린 뒤 읽길 권한다.

## 구현자 우려 1(질문 답 인식 글 그리기를 5-나 에 둠)
- **맞는 판단이다.** UI · UX plan 5-나 는 이미 speaking.tsx 를 고치는 묶음이고(plan.md:148), 가르치고 plan 은 라-3 을 '5-나 가 speaking.tsx · repeat.tsx 를 놓은 뒤'로 차례를 정했다(가르치고 plan.md:205 · :219). 5-가 는 speaking.tsx 를 잡지 않는다.
- **라-3 에서 깨질 자리:** 라-3 은 AI 질문 화면(판정 글자 없음 · 기다림 표시)과 같이 해 보기 말하기를 새로 만든다(가르치고 plan.md:140). 인식 글 줄을 QuestionAnswerActivity 안에만 두면, 새 AI 질문 화면이 그 줄을 빠뜨려도 지금 e2e(1단계 앱 판정 질문)는 잡지 못한다. 5-나 는 따라 말하기 data-heard(speaking.tsx:260)와 같은 작은 공용 조각으로 그리고 단위 시험을 두며, 라-3 브리프에는 'AI 질문 · 같이 해 보기 말하기에도 같은 인식 글 줄(data-heard)을 다음 문항까지 둔다(AC-23f)'를 적길 권한다. 그 전까지 이 시험은 실패가 예상된다. 그래서 첫 CI e2e 실행 기록에서 AC-23f 를 완료로 적지 않는다.

## 판정
**Changes requested**(fix 라운드 2 로). 고칠 것: 새 Important(남음 단언 보강 · 빠른 갈래 응답 늦춤). 함께 권함: 새 Minor(보낸 시각 기록 기다림).
