# fix 1 보고: 묶음 0-마 검토 I1 · M1 · M2(구현자 · Opus · high, 2026-10-30)

상태: 작성됨(실행 안 함) · 워크트리 p13d · 앱 코드 변경 0 · 커밋 안 함 · M3 은 손대지 않음(5-나 · 6 몫).

## 지적별
- **I1 (가) 끝인사:** `required-utterance.spec.ts` 에 시험을 하나 더했다.
  - `withHouseholdSetting('talk.safety_max_turns', 2)` 로 상한을 낮추고, 끝나면 되돌린다.
  - 인사 턴 다음, 상한 턴의 다음 반응이 카드 끝인사(safetyFarewell)일 때까지 아이 말풍선이 남는지 잰다. 끝에 data-talk-closed 를 본다.
- **I1 (나) 질문 답:** 같은 파일에 시험을 하나 더했다.
  - 질문 둘만 있는 1단계 수업을 넣는다(시드 질문, speaking.spec AC-5f 꼴).
  - 맞음 → '잘 말했어요' → '다음'까지, `[data-activity] [data-heard]` 가 다음 활동 번호가 될 때까지 남는지 잰다.
- **M1:** `required-recovery.spec.ts` N-16 에서 남의 세션 갈래와 둘째 프로필 넣기를 뺐다. 까닭은 시험 주석에 적었다.
  - 같은 길(그 프로필에서 찾지 못한 세션)은 `session-destination.test` 'N-16 …'과 통합 `session-flow.test` '결과 틀 · U4-1 … 남의 세션은 없다'가 지킨다.
- **M2 시각 차로 잼:** `screen-sampler.ts` 의 `longestBlankMs` 를 표본 at 차로 바꿨다. 첫 빈 표본부터 다음 표시 표본까지(끝까지 비면 마지막 표본까지) 잰다.
- **M2 보낸 시각부터 잼:**
  - `heldUntil` 에 `fromAt` 을 더했다. 그 시각 뒤 첫 표본부터 같은 글이어야 하고, 말풍선이 늦게 뜨면 실패한다.
  - `requestStartsOf` 를 새로 더했다. 자원 시간 기록으로 /api/talk/turn 요청의 시작 시각(쪽 시계)을 읽는다.
  - 회화 턴은 이 '보낸 때' + 100ms(그리기 틈, 시험 값)부터 잰다. 기다림 표시나 다음 반응이 '보낸 때 + wait_hint 첫 값 + 표본 간격' 안에 보여야 한다.
  - 쉬는 안내 시험도 같은 단언(expectHeldTurn)으로 바꿨다.
- **단위 시험:** `tests/unit/required-e2e-helpers.test.ts` 에 시각 차 빈 구간(밀린 표본 1.5초)과 fromAt 남음(늦게 뜸 → 실패)을 더했다. 먼저 실패를 보고 고쳤다(9 통과).

## 관문(p13d)
| 관문 | 결과 |
|---|---|
| lint | 478 files, No fixes applied |
| tsc --noEmit | exit 0 |
| test | 107 files · 1209 passed · 6 todo |
| check:deps | 위반 0 |
| check:ids | 위반 0 · design-number 49 |
| spec:trace --fail-on unknown-ac | exit 0 · unknown-ac 0 · missing-test 16(P12) |

필수 e2e 시험 수: 가 6 · 나 14.

## 우려(2)
1. **질문 답 시험은 지금 앱으로는 실패한다(앱 결함).** `QuestionAnswerActivity`(src/components/session/speaking.tsx 413~)가 인식 글을 그리지 않는다. 정본 4절 '인식 결과 표시' · spec 설계 3 표 · AC-23f 는 그 글이 다음 문항까지 남기를 요구한다. 화면을 바꾸는 일이라 이 묶음에서 고치지 않았다. 질문 답에 인식 글 줄(data-heard)을 그릴 묶음(세션 코어 또는 5-가)을 정해야 실행 통과가 나온다.
2. 실행하지 않았다. 남은 실행 확인 거리는 끝인사 시험의 상한 턴 셈(인사 1 + 대화 1)과 /api/talk/turn 자원 기록이 쪽 시계와 맞는지다.
