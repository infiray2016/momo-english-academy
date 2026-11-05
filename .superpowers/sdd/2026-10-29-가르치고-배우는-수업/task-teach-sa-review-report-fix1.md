# 재검토 fix 1: 묶음 사(I1 · M2 · M3, 범위 한정) — 2026-10-30, 검토자 Opus · xhigh

판정: **Approved** (NOT ADDRESSED 0). M1 은 지시대로 장부 몫이라 보지 않았다.

## 지적별
- **I1 ADDRESSED.** `src/core/session/recap.ts:184` 는 이제 짝 결과가 맞음이 아니면(틀림 · unscored) not_done 이다. 짝 시도 행이 없는 경우(:180, 상한 · 짝 없음)와 같은 갈래로 분모에 남는다. U 는 문항 첫 시도 자체를 판정하지 못한 경우(:170)뿐이다. 이는 정본 03:26 의 U 정의('판정하지 못한 문항')와 해냄 정의('첫 시도가 맞았거나 그 짝의 첫 시도가 맞았으면')를 따른다. 머리 주석(:9~11)과 RecapItemOutcome 주석(:43)도 같은 뜻으로 고쳤다.
- **M2 ADDRESSED.** 새 시험 셋은 모두 퇴행을 잡는다.
  - `tests/unit/session-recap.test.ts:422` 는 '틀림 → 짝 소리 없음'이 not_done 인지 본다. 줄 판정(맞음 둘 + 그 문항 + U 하나 → 유효 3 · 독립 2 · 2/3 → closeKoPracticed)도 단언한다. U 로 빼던 옛 코드면 2/2 · closeKo 가 되어 실패한다.
  - `:458` 은 tries [틀림, 맞음] 문항이 not_done 이고 evidence 가 3 · 2 · 2/3 인지 본다. 뒤 시도를 해냄으로 세는 퇴행이면 independent 가 되어 실패한다.
  - `:484` 는 유효 문항 = recap_min_evidence 일 때 closeKo 인지 본다. `>=` 가 `>` 로 바뀌면 실패한다.
  - 직접 돌림: 13 통과(03:09).
- **M3 ADDRESSED(정적).** `tests/integration/session-flow.test.ts:793~799` 의 기대 { line closeKo, evidence { valid 3, done 3, ratio 1 } } 는 그 시험 자료와 맞는다. soloFinals(view, [0, 2]) 는 문항 0 · 2 를 첫 시도에 틀리게 하고, 낸 짝 둘은 spareFinal 의 정답이며, 도움(aid) 칸이 없다. 정규 시드 읽기 3단계 단원 1 첫 수업의 문항 셋은 모두 goal read-3-1-1 = teach.goals[0] 이다(시드 확인). 그래서 세 문항이 모두 독립 해냄이다. 하한 전제(문항 수 ≥ 고정값 lesson.recap_min_evidence)도 단언한다. 타입: `pnpm exec tsc --noEmit` 종료 0, 오류 0(03:09 직접 돌림). 통합 실행은 CI 첫 실행에서 확인한다(⚠️).

## 새로 깨뜨린 것
없음. 바뀐 줄은 짝 결과 갈래 하나다. 독립 · 도움 · 상한 · U(첫 시도) 갈래의 기존 시험은 그대로 통과한다.

## 라운드 판정
fix 1 로 Approved. 다음 fix 라운드는 필요 없다.
