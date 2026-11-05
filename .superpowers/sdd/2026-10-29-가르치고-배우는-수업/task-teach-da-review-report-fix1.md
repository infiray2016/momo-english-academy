# 재검토 fix 1: 묶음 다(I1 · M1 · M2, 범위 한정) — 2026-10-30, 검토자 Opus · xhigh

판정: **Approved** (NOT ADDRESSED 0). M3 · M4 · M5 는 장부 · 라-3 브리프로 넘긴 것을 확인만 했다. 다른 묶음 파일 때문에 난 lint · test 실패는 판정에 넣지 않았다.

## 지적별
- **I1 ADDRESSED.** togetherOutcomeOf(`src/core/session/spare-outcome.ts:167~`)는 이제 늘 tries[0] 의 칸(보기 · 카드 · 말)을 본다. judge.final 은 tries[0] 에 말이 있을 때 그 말의 정오로만 쓴다(togetherChecks 넷째 인자). 서버는 '처음 말한 시도'로 judge 를 매기므로, tries[0] 에 말이 있으면 그 judge 는 바로 tries[0] 의 판정이다. 그래서 둘이 정확히 맞물린다. 새 시험(`tests/unit/spare-outcome.test.ts:119`)은 세 경우를 단언한다. 첫 보기가 틀리고 둘째 시도의 judge 가 맞음이면 틀림이다. 첫 시도의 말에 judge 가 다시면 틀림이다. 둘 다 맞으면 맞음이다.
- **M1 ADDRESSED.** withAppJudge 가 혼자 질문 시도의 judge 를 뺀다(`src/core/session/attempt.ts:769~770`). 이 함수를 부르는 곳은 대기열 길(`src/server/session/index.ts:918`) 하나뿐이다(grep). 그래서 서버 액션 evaluateAnswer 가 AI 와 합쳐 저장하는 judge 는 지워지지 않는다. 시험(`tests/unit/session-attempt.test.ts:1231~1250`)은 기기가 붙인 judge 가 빠지는 것과 그 밖 시도가 그대로인 것을 단언한다.
- **M2 ADDRESSED(컨트롤러 판단).** AI 맞음인 바꿔 말하기는 묶음을 높은 쪽으로 가르되 expressionDone 을 거짓으로 덮어쓴다(`src/core/speaking/judge.ts:180~188`, ...bundled 뒤에 덮어씀). 이제 표현 수행은 accepted 와 문턱 이상으로 맞은 때만 참이다. 시험(`tests/unit/speaking-judge.test.ts:651~662`)은 'Pizza, they eat.' + AI 맞음 → accepted · expressionDone false 를 단언한다. 묶음 · communicative 표시는 그대로라 C182 (2) 일관성 시험도 바뀌지 않았다.

## 지표와 공용 채점 함수
teach-metrics.ts 는 spareOutcomeOf · togetherOutcomeOf 를 spare-outcome.ts 에서 가져와 부르고 다시 내보낸다(:21). 옛 사본(togetherChecks 등)과 judgeAppAnswer 사용은 남지 않았다(grep 0 건). 그러니 두 쪽은 같은 함수라 결과가 같다. 직접 돌린 시험 네 파일(spare-outcome 3 · teach-metrics 14 · speaking-judge 20 · session-attempt 23)은 60 개 모두 통과했다.

## 새로 깨뜨린 것
없음. I1 고침은 judge 가 없는 기기 대기열 시도의 판정을 바꾸지 않는다. M1 고침은 대기열 길에서만 돈다.

## 라운드 판정
fix 1 로 Approved. 다음 fix 라운드는 필요 없다. 통합 시험 여덟과 words.ts SQL 은 여전히 CI 첫 실행에서 확인한다(⚠️).
