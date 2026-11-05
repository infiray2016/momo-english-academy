# 구현 보고: 마-1 fix 1 — 검토 M1(2026-10-30)

상태: DONE. `tests/unit/speech-paced.test.ts` 한 파일만 Edit 로 고쳤고 커밋은 하지 않았다.
- 새 시험 'AC-N20 모으기: 모든 문장을 읽지 않았으면(skipped) 읽지 않음을 그대로 돌린다'를 더했다. [skipped, skipped] 는 skipped 다.
- 새 시험 'AC-N20 모으기: 읽지 않은 문장은 모으지 않아 나머지를 들려줬으면 들려줌이다'를 더했다. [skipped, 들려줌] 은 ended · played 다.
- 결과: speech-paced 9건이 모두 통과했다. 구현이 이미 그렇게 동작해서 코드는 고치지 않았다.
- 관문: lint 오류 0, tsc 오류 0, test 1223 통과 · 6 todo(파일 109 전부)다.
