# fix 2 보고: 묶음 0-마 재검토 새 Important · 새 Minor(구현자 · Opus · high, 2026-10-30)

상태: 작성됨(실행 안 함) · 앱 코드 변경 0 · 커밋 안 함.

## 고친 것
- **Important (1) 단언 보강:** `screen-sampler.ts` 의 `heldUntil` 은 이제 untilIndex ≤ fromIndex 면 ok 가 거짓이다. 시작 표본이 이미 반응이면 잰 것이 없으므로 실패로 친다. 반응 앞에 그 글이 보인 표본이 적어도 하나 있어야 한다.
  - 단위 시험 '남음(보낸 시각부터) …'에 이 갈래를 더했다. 먼저 실패를 보고 고쳤다(9 통과).
- **Important (2) 빠른 갈래 늦춤:** `required-utterance.spec.ts` 에 `delayTurnRequests(page, ms)` 를 더했다.
  - page.route 로 /api/talk/turn 요청을 FAST_REPLY_HOLD_MS(1.5초, 시험 값) 붙잡은 뒤 넘기고, 돌려준 함수로 푼다.
  - 쉬는 안내 시험과 끝인사 시험의 상한 턴에만 건다. 첫 문장 갈래는 FIRST_DELAY_MS 2.5초라 그대로 둔다.
- **Minor:** `sentAtOf` 는 자원 시간 기록에 이 턴의 요청이 생길 때까지 expect.poll 로 기다린 뒤 읽는다(STREAM_END_MS 까지).

## 관문(p13d — 다른 손 작업 포함)
| 관문 | 결과 |
|---|---|
| lint | 실패: 오류 5, 모두 묶음 2-가 진행 중 파일이다. globals.css · board/paper-key.ts · ux-tokens.test 형식, board/decor.tsx svg title, mic-blocked.tsx import 차례(2-가 가 stuck-buttons 로 옮기며 생김). 내 8파일은 biome 통과 |
| tsc --noEmit | exit 0 |
| test | 1 실패: ux-tokens.test 'AC-23e (1) 코르크 …'(2-가 새 시험). 그 밖 1219 통과 · 6 todo |
| check:deps | 위반 0 |
| check:ids | 위반 0 · design-number 49 |
| spec:trace | exit 0 · unknown-ac 0 · missing-test 16(P12) |

## 우려(2)
1. 질문 답 시험은 5-나 가 인식 글 줄을 그리기 전까지 실행하면 실패한다(앞 보고의 우려, 재검토가 5-나 몫으로 정함).
2. 실행하지 않았다. page.route 로 붙잡은 요청이 흘림 응답을 그대로 넘기는지는 실행에서 본다.
