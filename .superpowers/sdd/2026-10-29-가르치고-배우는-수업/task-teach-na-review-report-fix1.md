# 재검토 fix 1: 묶음 나(M1 · M3 · M4, 범위 한정) — 2026-10-30, 검토자 Opus · xhigh

판정: **Approved** (NOT ADDRESSED 0). attempt.ts 는 묶음 다가 함께 고치는 중이라 git diff 대신 보고의 줄(V2_FIELDS · superRefine)만 봤다. M2 는 원래 지적대로 컨트롤러 · 장부 몫이다. ux-tokens 실패는 판정에 넣지 않았다.

## 지적별
- **M1 ADDRESSED.** 판 1 시도에 slot · aid · story · judge · techError 가 있으면 superRefine 이 거부한다(`src/core/session/attempt.ts:48` · `:198~207`). 새 칸이 없는 판 1 시도와 같은 칸의 판 2 시도는 받는다. 시험 여덟 갈래가 세 경우를 모두 단언한다(`tests/unit/session-attempt.test.ts:880`). 화면 · 서버 어디도 지금 판 2 칸을 `v: 1` 로 보내지 않으므로(grep 0 건) 기존 대기열 시도가 새로 버려지지 않는다. 이제 라-2 가 aid 를 `v: 1` 로 보내면 시험에서 바로 걸린다.
- **M3 ADDRESSED.** 쓰기 서버 세 곳(`src/server/writing/index.ts:219` · `composition.ts:170` · `:729`)이 lesson.teach 를 넘겨 세션 서버와 같은 차례를 쓴다. 통합 시험(`tests/integration/writing-check.test.ts:408`)은 teach 를 붙인 guided 수업에서 새 번호는 받고 옛 번호는 거부하는지를 본다(정적 작성).
- **M4 ADDRESSED.** `src/core/session/spares.ts` 에 outcomeContextOf · firstFinalsOf · spareInputOf 를 더해, 화면 자료에서 서버 scoringOf 와 같은 맥락을 만든다. 시험(`tests/unit/session-spares.test.ts:340`)은 기기 입력과 서버 입력이 같은 짝을 고르고, 진행 시도와 둘째 끝 시도를 첫 시도로 보지 않는다는 것을 단언한다.

## 브리프 밖 한 줄
writing-check.test.ts:323 의 기대를 `v: 1` 에서 INPUT_VERSION 으로 바꾼 것은 맞다. 쓰기 확인 끝 시도는 서버가 INPUT_VERSION 으로 저장하므로(writing/index.ts:224) 첫 라운드 뒤에는 2 다. 다른 통합 시험의 `v: 1` 줄은 모두 기기가 보내는 입력이거나 직접 넣는 행이고, 서버 저장 판을 기대하는 줄은 더 없다(grep 확인).

## 구현자 우려의 심각도
1. 서버 scoringOf 가 outcomeContextOf 를 아직 부르지 않는다: Minor. 값은 같고, 다음에 index.ts 를 여는 묶음이 한 줄로 모으면 된다.
2. 기기는 이 기기에서 낸 첫 시도만 안다: Minor 이지만 라-2 브리프에 꼭 넣는다. 대기열은 서버가 받은 시도를 지우므로(`src/lib/attempt-queue.ts:38~40`), 같은 기기라도 혼자 해 보기 도중 다시 열면 앞 문항 입력이 기기에 없다. 이때 view.spares 는 연 시점의 값이라 뒤 문항이 빠져 있다. spareInputOf 주석의 조건('이 기기에서 혼자 해 보기를 한 때')으로는 이 경우를 막지 못한다. 방법은 둘이다. 혼자 해 보기가 끝나면 대기열을 비우고 화면 자료를 다시 읽어 서버 값을 쓰거나, 화면 자료에 서버가 센 혼자 첫 시도 결과를 실어 기기 결과와 합친 뒤 sparesToShow 를 부른다.
3. 통합 시험 정적 작성: ⚠️. CI 첫 실행에서 확인한다(plan 위험 12).

## 라운드 판정
fix 1 로 Approved. 다음 fix 라운드는 필요 없다.
