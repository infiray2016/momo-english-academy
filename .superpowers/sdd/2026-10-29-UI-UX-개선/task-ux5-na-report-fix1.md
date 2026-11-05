# 묶음 5-나 fix 1 보고(검토 M2 — 배치 서버 기술 오류 갈래 시험, 2026-10-30 03:1x)
상태: DONE. 워크트리 p13d, 커밋 안 함. 통합 시험은 이 기기에서 돌릴 수 없어 정적으로 쓰고 tsc 로 형만 맞췄다.

## 바뀐 것
- `src/core/placement/adaptive.ts`에 순수 함수 둘을 더했다.
  - `soundSpareAllowed`: 기술 오류를 예비로 넘길 수 있는지 판단한다. 본 문항이고, 듣기 · 따라 말하기 문항이고, 같은 번호의 예비가 있을 때만 참이다.
  - `placementCorrectCount`: 맞힌 답만 센다. 실패 3회 기록과 기술 오류 기록은 빼고 센다.
- `src/server/placement/index.ts`는 위 두 함수를 쓴다. `techSpareOf`는 `soundSpareAllowed`를 부르고, totalScore 는 `placementCorrectCount`로 센다. 동작은 바뀌지 않았다.

## 시험
- 단위 `tests/unit/placement.test.ts`(돌림, 통과):
  - 'AC-23a R-56 배치: 기술 오류로 예비에 넘길 수 있는 차례는 본 문항 · 소리 문항(듣기 · 따라 말하기) · 같은 번호 예비가 있을 때뿐이다'
  - 'AC-23a R-56 배치 총점: 기술 오류 · 실패 3회 기록은 맞음으로 세지 않고 맞힌 답만 센다'
- 통합 `tests/integration/placement.test.ts`(정적, 실행 안 함):
  - 'AC-23a R-56 말하기 배치: 소리를 들려주지 못한 본 문항(답 없는 '다음')은 점수 없는 기술 오류로 적혀 같은 번호의 예비 문항이 나오고, 총점 · 판정에 들지 않는다'
    - 확인하는 것: 화면의 techSpare 참 · 거짓, 시도 점수 null 과 input, 예비 문항의 문제 번호 · 단계, 기록 칸 techError, totalScore = 답 수 − 1.
  - 'AC-23a R-56 배치 기술 오류 거부: 예비 문항 · 소리 아닌 문항 · 실패 3회와 함께 온 기술 오류, 답도 기술 오류도 없는 입력은 invalid 다'

## 관문(p13d, Node 24)
| 관문 | 결과 |
|---|---|
| pnpm lint | 517 파일, No fixes applied |
| tsc --noEmit | 종료 0(통합 시험 형 포함) |
| pnpm test | 117 파일 · 1368 통과 · 6 todo |
| check:deps | 위반 0 |
| spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(P12, 전과 같음) |

## 우려
- 통합 시험 둘은 실행 확인 전이다. 첫 CI 통합 실행에서 확인한다.
