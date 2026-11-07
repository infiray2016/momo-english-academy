# fix 1 보고: 묶음 사 검토(I1 · M2 · M3) — 2026-10-30 02:4x, 구현자 Opus · high — DONE

| 지적 | 상태 · 자리 |
|---|---|
| I1 낸 짝을 판정하지 못한 문항을 U 로 뺌 | ADDRESSED: `src/core/session/recap.ts:184` 에서 짝 결과가 맞음이 아니면(틀림 · unscored) not_done 이다. 머리 주석 9~11줄과 RecapItemOutcome 주석 43줄도 고쳤다. U 는 문항 첫 시도 자체를 판정하지 못한 것뿐이다. 시험을 먼저 바꿔 실패를 본 뒤 고쳤다 |
| M2 시험 둘 | ADDRESSED: 같은 문제 다시에서 맞힌 문항은 not_done, 유효 문항 수가 하한과 같을 때의 경계는 closeKo |
| M3 통합 단언 | ADDRESSED(정적 작성): `tests/integration/session-flow.test.ts:793` 의 'AC-3e 가르치는 수업 짝' 첫 시험에 result.recap 단언을 더했다. 기대는 { line closeKo, evidence { valid 3 · done 3 · ratio 1 } } 이다. 틀린 두 문항을 짝으로 되찾았고 도움 기록이 없다. 하한 전제는 TEST_SETTINGS 의 lesson.recap_min_evidence 로 단언했다(고정값에 이미 있음) |

## 시험(tests/unit/session-recap.test.ts, 13개)
- :422 'AC-6g 짝을 냈지만 그 짝을 판정하지 못했으면(건너뜀 · 소리 없음) 그 문항은 U 가 아니라 해내지 못함으로 분모에 남는다'. 기대를 not_done 으로 바꿨다. 줄 판정 단언도 더했다: 맞음 둘 + '틀림 → 짝 소리 없음' 하나 + U 하나 → 유효 3 · 독립 2 · 2/3 → closeKoPracticed. U 로 빼면 2/2 로 closeKo 가 되는 퇴행을 잡는다.
- :458 'AC-6g 같은 문제 다시에서 맞힌 문항(첫 시도 틀림 · 둘째 시도 맞음, 짝 없음)은 해내지 못함이다(해냄은 첫 시도 · 짝 첫 시도로만)'.
- :484 'AC-6g 유효 문항 수가 lesson.recap_min_evidence 와 같고 비율이 문턱 이상이면 closeKo 다(경계)'.

## 관문(p13d, 02:4x)
| 명령 | 결과 |
|---|---|
| pnpm lint | 종료 0, 517 파일 |
| pnpm exec tsc --noEmit | 종료 0 |
| pnpm vitest run tests/unit/session-recap.test.ts | 종료 0, 13 통과 |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0 · missing-test 16 |
| pnpm test(덧붙여 돌림) | 종료 0, 117 파일 · 1360 통과 · 6 todo |

## 우려(1)
1. 통합 단언(M3)과 recapOf 의 SQL 은 이 기기에서 돌려 보지 못했다. 11-01 뒤 CI 에서 확인해야 한다. M1 은 지시대로 장부 몫이라 고치지 않았다.
