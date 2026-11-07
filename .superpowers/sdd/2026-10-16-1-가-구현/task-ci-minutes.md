# 브리프: CI 분 줄이기(가벼운 루프, 2026-10-29)

바탕 가지 p13d(feature/1a-p13d-teacher, 1e44de5). 바뀌는 파일은 `.github/workflows/ci.yml` 하나. 컨트롤러가 직접 고치고 코드 검토자(Opus · high · 범위 한정)가 본다.

## 왜
10월 GitHub Actions 사용량이 한도 2,000분 가운데 1,986분(실행 64번 · 실행당 평균 31분). e2e 두 작업이 60%, 작은 작업 아홉은 실행마다 설치를 아홉 번 되풀이해 약 12분. 요청자 "앞으로 저 경고 안 받을 방법"(10-26) → 권함 (가)~(마) 확인(10-29 "1번 2번부터 시작해").

## 요구
- (가) e2e · e2e-local 은 push 마다 돌지 않는다. 손으로 띄울 때(workflow_dispatch, 입력 e2e 기본 true) · PR 에 'e2e' 라벨이 붙어 있을 때 · main push 때만 돈다. 라벨을 붙이는 사건(labeled)은 e2e 둘만 띄우고 checks 는 다시 돌리지 않는다.
- (나) lint · check-ids · spec-trace · depcruise · unit · seed-validate(+images-check) · build · bundle-secrets · integration 을 한 작업 `checks`(설치 한 번)로 묶는다. 싼 것부터 차례. bundle-secrets 는 같은 작업의 build 결과를 검사한다(다시 빌드하지 않음). 단계마다 이름을 둔다.
- (다) 작업마다 timeout-minutes(checks 20 · e2e 30 · e2e-local 20). 가지별 concurrency(cancel-in-progress)는 그대로.
- 각 단계의 명령 · 조건(hashFiles) · 환경 변수(E2E_PHOTOS · NO_COLOR) · 실패 줄 지킴 · 사진 올리기는 옛 판과 같다. 설계 주석(C51 · C55 · P2b · P5b · P7b · P4c)은 남긴다.
- (라) GitHub 예산 $0 은 요청자가 결제 설정에서. (마) 11-01 초기화 전 CI push 는 이 고침을 확인하는 한 번(새 구성으로 약 5분)만.

## 검토 범위(code-reviewer)
옛 판(1e44de5 의 ci.yml)과 새 판을 대조해 (1) 빠진 단계 · 바뀐 명령 · 바뀐 조건 (2) 조건식 오류(labeled 사건 · workflow_dispatch 의 inputs · contains 라벨) (3) 한 작업으로 묶으며 생기는 문제(빌드 결과 공유 · 작업 디렉터리 · 캐시 · int.log) (4) timeout 값의 타당성(e2e 실행당 평균 11.5분 · e2e-local 7분 · 작은 아홉 합 12분). Critical · Important · Minor 와 근거를 적는다. Minor 는 컨트롤러가 직접 고친다.

## 증명
ruby YAML 파싱 통과 · 검토 Approved → p13d 커밋 → ci/p13-c1 에 force-push(PR 6) 한 번 → checks 하나만 돌고 e2e 둘은 건너뜀을 확인(분 약 5).
