# fix 1 보고: 묶음 다 검토(I 1 · M 5) — 2026-10-30 02:5x(M2 는 컨트롤러 판단으로 범위에 더함), 구현자 Opus · high — DONE_WITH_CONCERNS

| 지적 | 상태 · 자리 |
|---|---|
| I1 같이 해 보기가 judge 가 있으면 첫 시도의 고른 보기를 안 봄 | ADDRESSED: `src/core/session/spare-outcome.ts` togetherOutcomeOf 는 늘 tries[0] 의 칸(보기 · 카드 · 말)을 보고, judge.final 은 첫 시도의 말 정오로만 쓴다(togetherChecks 넷째 인자). 시험 spare-outcome 'AC-22k 저장된 같이 해 보기에 judge 가 있어도 첫 시도의 고른 보기를 본다 …'(고르기 틀림 + judge 맞음 → 틀림, 말 judge 다시 → 틀림, 둘 다 맞음 → 맞음). 먼저 돌려 실패를 본 뒤 고침 |
| M1 대기열 혼자 질문 시도의 judge 가 그대로 저장됨 | ADDRESSED: `src/core/session/attempt.ts` withAppJudge 가 activity.kind question 이면 withoutJudge(머리 주석에 '대기열 길만 부름'). session-attempt 'AC-22k 서버 판정 덧씌우기 …' 단언을 '뺀다'로 바꾸고 그 밖 시도는 그대로임을 더함 |
| M2 바꿔 말하기(AI 맞음)에 expressionDone 참 | ADDRESSED(컨트롤러 판단): `src/core/speaking/judge.ts` judgeSpeakingQuestion 의 AI 맞음 갈래가 묶음은 높은 쪽으로 가르되 expressionDone 거짓. 표현 수행은 accepted 와 문턱 이상으로 맞을 때만 참. speaking-judge 'AC-22k 일관성 …' 끝 단언을 거짓으로 바꿔 실패를 본 뒤 고침 |
| M3 의미 검사를 Do 질문 꼴 밖에도 검 | 넘김: 장부(둘째 묶음 시작 조건 — 1~2단계 짝 · 3단계 단원 5 질문 꼴) |
| M4 A9 통합 시험의 단원 진행 행 검사가 늘 참 | 넘김: 장부(P12 단원 판정이 생기면 그 입력으로 다시 씀). 세션 점수 같음 단언은 그대로 |
| M5 echo 를 담을 자리 없음 | 넘김: 라-3 브리프(진행 시도 등 담을 자리) |

## 관문(p13d, 03:0x 다시 돌림 — M2 고친 뒤)
| 명령 | 결과 |
|---|---|
| pnpm lint | 종료 1 — lesson-board · result-view · area-art · lesson-list/state · ux-home 시험(다른 묶음이 고치는 중). 이 묶음 파일 biome 0 |
| pnpm exec tsc --noEmit | 종료 0 |
| pnpm test | 종료 1 — 113 파일 · 1284 통과 · 1 실패(lesson-list-state, 다른 묶음). 이 묶음 시험 9 파일 98 통과 |
| pnpm check:deps | 종료 0 |
| pnpm check:ids | 종료 0(이 묶음 파일의 design-number 0) |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0 |

## 우려(2)
1. lint · tsc · test 실패는 다른 묶음의 진행 중 변경 때문이라 고치지 않았다. 그 묶음이 끝난 뒤 관문을 한 번 더 돌려야 한다.
2. 통합 시험 여덟과 words.ts SQL 은 여전히 정적 작성이다(CI 첫 실행에서 확인).
