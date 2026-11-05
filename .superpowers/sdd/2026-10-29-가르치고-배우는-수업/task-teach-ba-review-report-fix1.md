# 재검토 fix 1: 묶음 바(I1 · M2 · M3, 범위 한정) — 2026-10-30, 검토자 Opus · xhigh

판정: **Approved** (NOT ADDRESSED 0). M1 은 지시대로 둘째 묶음 장부 몫이라 보지 않았다. 시험 파일 하나는 직접 돌렸다(24 통과, 03:30).

## 지적별
- **I1 ADDRESSED.** judgedAccuracy(`src/core/evidence/teach.ts:256~257`)는 judge.communicative 가 참이면 'partial' 이고, 아니면 판정 그대로다. 혼자 질문 · 짝(:524)과 echo 다시 시도(:546)가 이 함수 하나를 쓴다. result.judge('correct') · bundle · communicative · expressionDone 은 judgeResult 가 그대로 남긴다. 이는 정본 3.8 A1 표 1~2 · 3~12 질문 행('부분과 의사소통 정답 표시')과 04 accuracy 칸(:72)대로다. 수준 값은 근거 칸에 없으므로, A9 가 확정되어도 이 함수의 고칠 곳은 0 이다(머리 주석 :7~9 도 같은 뜻으로 고침).
  - 같이 해 보기(:579~585)에도 같은 규칙을 쓴 것은 정본과 맞다. 정본 04 의 accuracy 는 시도의 정확도이고, 의사소통 정답 표시는 '말하기 질문에서 acceptedMeaning 쪽으로 갈린 답'에 붙는다. 같이 해 보기는 validity practice 라 기회가 아니므로 수준에는 닿지 않는다. 그래서 같은 판정 함수의 같은 답을 같은 정확도로 적는 편이 일관된다.
  - 시험: 'AC-22k AI 부분이어도 … 부분 + communicative(판정은 맞음)'(`tests/unit/teach-evidence.test.ts:472`)가 accuracy partial · result.judge correct · communicative · expressionDone 거짓을 단언한다. 질문 짝 시험(:494)은 판정이 communicative 면 partial, 아니면 correct, result.judge 는 correct 인지를 단언한다.
- **M2 ADDRESSED.** MATCH_CUT 이 [0.6, 0.8](:33)이고, 평가 spec 8절 evidence.match_cut 기본값과 같다. 부분 예는 0.6, 정답 경계는 0.8 이다.
- **M3 ADDRESSED.** 짝 행(activity.kind spare)에는 retry 를 적지 않는다(`teach.ts:622~624`). 정본 3.8 '짝을 틀리면 그 기회는 0'을 코드로 지킨다. 시험 'AC-22e 짝 행에 다시 시도가 들어와도 retry 를 적지 않는다'(:247)가 읽기 짝(tries 둘)과 질문 짝(echo) 둘에서 `not.toHaveProperty("retry")` 를 단언한다.

## 관찰(판정에 넣지 않음)
- 같이 해 보기의 partial 갈래와 echo 다시 시도의 partial 갈래는 따로 단언하는 시험이 없다. 같은 함수(judgedAccuracy)를 거치고 기회가 아니거나(같이 해 보기) 도움 시도(echo)라 수준에 닿지 않으므로, 시험 하나씩을 더하면 좋지만 필수는 아니다.
- lint: 지금 `pnpm lint` 는 종료 1 이다. 오류 파일은 src/core/session/teach-frame.ts · tests/unit/teach-frame.test.ts · src/server/session/index.ts · tests/unit/teach-recap-piece.test.ts 넷이고, 모두 다른 묶음(라-2 · 라-4 진행 중)의 것이다. 바의 두 파일은 `biome check` 오류 0 이다(직접 돌림).

## 라운드 판정
fix 1 로 Approved. 다음 fix 라운드는 필요 없다.
