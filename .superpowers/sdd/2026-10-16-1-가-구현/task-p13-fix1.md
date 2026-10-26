# fix 브리프: P13b 차례 4 fix 1 — 코드 검토 b1 I 3 · M 9 + 컨트롤러 결정 둘(implementer impl-p13-2 이어 보기 · Opus · high, 2026-10-22 20:5x)

`review-p13-4-code.md`(Changes requested — I-1 · I-2 · I-3, M-1~M-9, 8절 한 줄)를 읽고 아래를 모두 고친다. 워크트리 p13 작업 트리(차례 4, 커밋 전). **I-1 · I-2 는 통합 시험을 먼저 써서 CI 가지에서 빨강을 본 뒤 고친다**(로컬에서 통합이 돌지 않으므로: 시험만 더한 상태를 보고하면 컨트롤러가 CI 가지에 올려 빨강을 확인하고, 그 뒤 고침을 올린다 — 보고에 '빨강 확인 요청' 줄을 먼저 보내고 기다리지 말고 고침까지 이어서 하되, 시험 커밋 지점의 작업 트리를 `git stash` 없이 보존할 필요는 없다 — 컨트롤러가 CI 두 번 돌린다: 시험만 든 스냅숏과 고침 뒤 스냅숏. 시험만 든 시점에 SendMessage 한 줄 먼저). 커밋은 하지 않는다. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`.

| 번호 | 지적 | 컨트롤러 결정 · 할 일 | 선 위 검증 |
|---|---|---|---|
| 결정 1(C103) | `talk_turns.tori_ko` 열 | 0003 마이그레이션을 지우고 다시 만들어(마이그레이션 하나 유지) `tori_ko text`(비울 수 있음) 추가. 1~3단계 토리 반응의 한국어 뜻을 저장하고 이어 하기 · 같은 시도 id 다시 흘림에서 `ko` 줄로 다시 낸다 | 통합: 이어 하기 화면 자료에 1~3단계 뜻이 있음 · 4단계부터는 비움 |
| 결정 2(정할 것 7) | 끝맺음 기록 입력 갈래 | a `TalkAttemptInputSchema` 에 `{ kind: "talk-closing", reason }` 갈래를 더하고 closing.ts 가 그 꼴을 쓴다 | 단위(스키마) |
| I-1 | 회화 끝맺음 기록(awaiting_feedback)을 쓰기 밀린 첨삭이 잡음 | `src/server/writing/composition.ts`: `retryPendingFeedback` 의 대기 고르기에 **영역 · 입력 종류(쓰기 초고 끝 시도)** 조건을 넣고, `runFeedback` 은 **잡기(claimedAt) 전에** 종류를 확인한다. 끝맺음 기록은 쓰기 길이 건드리지 않는다 | 통합 먼저: '회화 끝맺음 대기 둘이 있어도 홈 진입 밀린 첨삭은 쓰기 초고만 부르고 끝맺음 claimedAt 은 그대로다'(빨강 → 초록) |
| I-2 | 목표 턴 전 '그만하기' 뒤 정리 따라 말하기가 not_found | `saveFollowAlong`: 중단 세션은 정리 토막(`wrap_up`)일 때만 받는다. 다른 수업 고르기 · 시간 지남으로 중단된 회화는 지금처럼 거름 | 통합 먼저: '목표 턴 전 그만하기 뒤 정리 따라 말하기는 attempts 에 남고 영어로 말한 문장 수가 는다' |
| I-3 | again · two_answers 줄이 아이가 말할 영어를 질문과 한 글로 | 읽어 주기 전용 칸을 나눈다: `{ t: "add", kind: "again", say: "<답 예시>", en: "<질문>", ko? }`, `{ t: "add", kind: "two_answers", answers: [a, b] }`(이음 'Or' 은 화면 공용 함수). 이어 하기 · 다시 흘림도 같은 꼴. 저장 원문 · 다시 쓸 토리 차례는 그대로. 1~3단계 화면 자료에 `say` · `answers` 가 글로 보일 재료가 아니라 읽어 주기 재료임을 타입 주석으로 | 단위: 1~3단계 자료의 `en` 에 답 예시 없음 · `say` 에만 있음 |
| M-1 | 같은 시도 id 겹침 → AI 두 번 | 검토 '어떻게'대로 열 · 잠금 없이: 같은 시도 id 의 고아 아이 행 뒤에 그 세션 talk_turn ai_calls 행이 없고 recorded_at 이 `maxDuration` 안이면 AI 대신 `{ t: "stale" }` 을 돌린다(새 줄 종류 안 만듦). 화면 몫(잠깐 뒤 다시 읽기)은 차례 5 | 통합 하나: 같은 시도 id 둘째 요청이 AI 를 부르지 않음 |
| M-2 | 형태 표 실패 삼킴 · 매 턴 어휘 읽기 | catch 에 오류 이름 로그. 검사 재료는 다음 자리가 AI 자리일 때만(늦게) | 단위 |
| M-3 | 413 이 본문 다 읽은 뒤 | `content-length` 가 상한 넘으면 먼저 413 | 단위(처리기) |
| M-4 | 끊긴 뒤 턴 저장이 함수 수명에 안 묶임 | `after(done)` 으로 턴 길 약속을 넘긴다(Next `after` 는 promise 받음). 프리뷰 실기는 차례 11 | — |
| M-5 | 홈 진입 정리가 전부 읽음 | (가) `talk_segment` ≠ wrap_up, (다) 끝맺음 기록 없음(NOT EXISTS)을 SQL 에서 | 통합 기존 그대로 |
| M-6 | 시험 약함 둘 | '모름' 턴 하나 더해 수 그대로 단언 · 견본 값(`card.greetingTurns` · `safeLineOf`)으로 읽기 | — |
| M-7 | 거절 대사 고르기 두 규칙 | `safeLineOf(card.safeLines, turnNo)` 하나로 | 단위 |
| M-8 | 주석 '회화 트랙' | '회화 영역 행' | — |
| M-9 | 목표 턴 전 대화 안전 상한 → 중단이 plan 표와 다름 | **13절 C107 로 코드 쪽을 정본으로 확정**(컨트롤러가 plan-p13a 표도 고침). AC-15j 통합에 `status` 중단 단언 하나 | 통합 단언 |

관문: `pnpm biome ci .` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm build` · `pnpm check:deps` · `pnpm check:ids` · `pnpm check:bundle` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`. 보고 `task-p13-report.md` 에 'fix 1' 절(지적별 어떻게 · 바뀐 파일 · 시험 수 · 다르게 한 것) → SendMessage 한 줄 → 컨트롤러 CI 6차(두 스냅숏) → rev-p13b 재검토(I 셋 + 결정 둘, 범위 한정) → 차례 4 커밋 → 차례 5 브리프(회화 틀 · 토리 표시 · 말풍선 · 아이 차례 · 1단계 인사 · 대화, 화면 검토 포함). 범위 밖 X-1(next.config 추적 키 `/`)은 컨트롤러가 차례 6 전에 따로.
