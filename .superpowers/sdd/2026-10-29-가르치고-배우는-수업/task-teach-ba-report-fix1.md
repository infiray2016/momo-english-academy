# fix 1 보고: 묶음 바 검토 I1 · M2 · M3(2026-10-30 03:4x, 구현자 Opus · high) — DONE_WITH_CONCERNS

워크트리 p13d, 커밋 안 함. 고친 파일은 `src/core/evidence/teach.ts` · `tests/unit/teach-evidence.test.ts` 둘뿐이다.

## 지적별
- **I1 ADDRESSED.** `teach.ts:256` judgedAccuracy 를 더했다. judge.communicative 가 참이면 정확도는 partial 이고, 아니면 판정(final)대로다. 혼자 질문 · 짝(:524)과 echo 다시 시도(:546)가 이 함수를 쓴다. 같이 해 보기(:585)도 의사소통 정답 맞음은 partial 로 적는다(연습이라 기회는 아니고, 같은 규칙을 한 곳에 맞춤). result.judge('correct') · bundle · communicative · expressionDone 은 그대로다. 머리 주석도 '정확도 부분 + 표시'로 고쳤다. A9 가 확정되어도 이 함수는 그대로이고 상태 함수의 수준 값만 바뀐다.
  - 시험: 'AC-22k AI 부분이어도 acceptedMeaning 으로 갈린 혼자 질문 답은 부분 + communicative(판정은 맞음), 표현 수행 거짓이고 수준 값이 없다'(:472)의 기대를 partial 로 바꿨다. 'AC-22k 질문 짝은 판정 칸이 없어도 …'는 판정이 communicative 면 partial, 아니면 correct 를 기대하고 result.judge 가 correct 인지도 본다.
- **M2 ADDRESSED.** `teach-evidence.test.ts:33` MATCH_CUT 을 [0.6, 0.8](평가 spec 8절 evidence.match_cut 기본값)로 맞췄다. 그래서 '따라 말하기 정확도는 경계 둘 …' 시험의 부분 예를 낱말 넷 중 넷(0.8 → 정답)에서 다섯 중 셋(0.6 → 부분, :591)으로 옮기고, 0.8 은 정답으로 기대한다. 함수는 지금처럼 ctx.matchCut 으로 받는다.
- **M3 ADDRESSED.** `teach.ts:622` 짝 행(activity.kind 가 spare)에는 retry 를 적지 않는다. 시험: 'AC-22e 짝 행에 다시 시도가 들어와도 retry 를 적지 않는다(짝 틀림은 기회 0)'(:247, 읽기 짝 tries 둘 · 질문 짝 echo).
- M1 은 지시대로 고치지 않았다(둘째 묶음 장부).

## 관문(p13d, 03:4x)
| 명령 | 결과 |
|---|---|
| pnpm lint | 종료 1. 오류 넷이 모두 다른 손의 파일이다: src/core/session/teach-frame.ts(형식) · tests/unit/teach-frame.test.ts(가져오기 차례 · 형식) · src/server/session/index.ts:14(가져오기 차례). 이 묶음 두 파일은 `pnpm biome check` 종료 0 |
| pnpm exec tsc --noEmit | 종료 0 |
| teach-evidence 단위 | 24 통과 |
| pnpm test(전체) | 종료 0, 119 파일 · 1406 통과 · 6 todo |
| pnpm check:deps | 종료 0 |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0 · missing-test 16 |

## 우려(1)
1. lint 실패는 teach-frame 을 만드는 다른 묶음과 서버 세션 파일을 고치는 손이 정리해야 닫힌다. 이 묶음은 그 파일들을 허용받지 않아 손대지 않았다.
