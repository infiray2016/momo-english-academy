// 시드 검사 결과의 공용 타입. 다른 시드 모듈을 가져오지 않는 잎 모듈이라 검사 파일끼리의 가져오기 순환을 끊는다
// (reference-index → check-teacher → check-lesson → reference-index, 2026-10-23 CI 19차 depcruise no-circular).
// reference-index · check-lesson 이 같은 이름으로 다시 내보내므로 다른 파일은 지금처럼 그쪽에서 가져와도 된다.

/** 검사 결과 하나(규격 파일 정합 · 칸 검사 공통). 경로는 그 파일 안의 점 경로다. */
export type SeedIssue = {
  rule: string;
  severity: "error" | "warning";
  /** 한국어 설명. */
  message: string;
  /** seed/ 뿌리 기준 파일 경로. */
  file: string;
  /** 칸 키(칸 검사일 때). */
  cell?: string;
  path: string;
};

/** 검사 결과를 받는 함수(파일 · 칸 키는 만드는 쪽이 묶는다). */
export type Report = (
  rule: string,
  path: string,
  message: string,
  severity?: SeedIssue["severity"],
) => void;
