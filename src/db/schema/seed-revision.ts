// 시드 전체 최신 개정을 셀 때 보는 시드 테이블 다섯(5절 '시드 전체 최신 개정 번호').
// server-only 가 아니라 서버(src/server/seed/read.ts currentSeedRevision)와 e2e 도우미(tests/e2e/household.ts)가
// 같은 목록을 쓴다(한 벌, 검토 review-p10-2-code M-3). drizzle.config 의 schema 목록 밖이라 마이그레이션에 들지 않는다.
import {
  lessons,
  levelSpecs,
  levelTestItems,
  placementItems,
  unitSpecs,
} from "./content";

export const SEED_REVISION_TABLES = [
  levelSpecs,
  unitSpecs,
  lessons,
  levelTestItems,
  placementItems,
] as const;
