# 재검토 브리프: P10 fix 1(review-p10-2-code I-1 · M-1~M-3 · 7절 2) — code-reviewer rev-p10 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 23:3x

범위 한정 재검토다. **B1(차례 3 홈) 검토를 먼저 끝내고 그 뒤에 한다.** 지적별 ADDRESSED · NOT ADDRESSED 와 새로 깨뜨린 것만 적는다. 저장소 · 워크트리 파일을 고치지 않는다(복사본 재현은 된다). 3001 · 54331 · 3000 · 54329 · 3302 · 54339 는 건드리지 않는다.

## 대상(구현 보고 `task-p10-report.md` 'fix 1' 소절 — 구현자 수: biome 0 · tsc 0 · 단위 322 · 통합 82 + 1 · e2e 29 · deps 0 · bundle 0, 차례 3 파일은 손대지 않음)
- **I-1**: 새 `src/server/db/safe-error.ts`(`dbErrorTag` = 오류 이름 + Postgres 코드만 · `safeDbError` — 호출자는 아직 없음, P11 · 1-나용) · `src/server/profile/index.ts`(saveFirstRun catch: 유일 위반은 already_done 그대로, 그 밖은 console.error 에 이름 · 코드만 + reason "unavailable"; 새 `checkVocabName`) · `src/server/actions/first-run.ts`(결과를 그대로 돌려줌) · `src/app/(setup)/first-run/first-run-flow.tsx`(submitName 이 영어 이름 · 별명을 한 번의 확인 호출로 봄 — 다르게 한 것; unavailable 은 이름 확인 · 저장 둘 다 C72 '지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요'; catch 둘은 같은 꼴 — offline 이면 7절 '인터넷이 끊겼어요. 연결되면 다시 해요', 아니면 C72 문장) · 통합 +3(profiles 넣기 트리거 · parent_auth 넣기 트리거 · 이름 확인은 vocab 테이블 이름 바꿈 — 던진 글 · console.error 글에 한글 이름 · 영어 이름 · `$argon2id$` 가 없음 단언, 빨강 먼저 봄).
- **M-1**: 단위에 알파벳 앞섬 사례(코드는 이미 맞아 처음부터 통과 — 시험 빈틈만 닫음). **M-2**: `MIC_CODE_MAX` 64 · `MIC_BROWSER_MAX` 120(`start.ts` 맨 위) + 입력을 잘라 받음 + 단위 1(빨강 먼저). **M-3**: `deviceFacts()` 를 `src/lib/speech/browser.ts`(P2 공용 파일)에서 내보내 `src/lib/mic-state.ts` 가 씀; 새 `src/db/schema/seed-revision.ts` 의 `SEED_REVISION_TABLES` 를 `src/server/seed/read.ts`(P7a 공용 파일) · `tests/e2e/household.ts` 가 함께 씀. **7절 2**: `first-run.spec.ts` 의 `plain.beforeEach` 제거.

## 볼 것
1. I-1 재현 다시(트리거 둘 + 이름 확인) — 던진 글 · console.error · Next 로 올라가는 오류 어디에도 이름 · 해시가 없는지. `dbErrorTag` 가 DrizzleQueryError → cause 의 postgres `code` 를 뽑는지, 새 오류에 cause 사슬을 붙이지 않는지. `checkVocabName` 이 unavailable 일 때 화면이 '다음'을 막는지(별명이 vocab 인지 모른 채 넘어가면 안 됨). submitName 한 번 호출이 영어 이름 · 별명 둘 다의 vocab 여부를 보고 별명만 vocab 일 때 차례 2 I-1 의 거절 안내가 그대로 나오는지. `safeDbError` 죽은 코드 판정(두거나 빼거나 — 장부에 한 줄).
2. M-2 잘라 받기가 검증 앞에 있는지 · 상한이 맨 위 대문자 상수인지. M-3 가 P2 `browser.ts` 의 기존 접점(P2 단위 · 통합 시험)과 P7a `read.ts`(같은 다섯 테이블 · `server-only` 경계 · `check:deps`)를 깨지 않는지, 공용 변경 둘로 보고에 표시됐는지, e2e `household.ts` 와 서버 셈이 같은지.
3. 새로 깨뜨린 것. 장부(`ledger-open.md`): '두 벌' 행 · 'DB 오류는 이름 · 코드만' 행이 닫히는지 판정.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p10-fix1.md`(메인 저장소): 지적별 ADDRESSED 표 · 새 지적(심각도 · 근거) · 장부 판정. 마지막 메시지는 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
