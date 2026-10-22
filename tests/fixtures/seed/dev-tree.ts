// 개발용 로컬 DB · e2e 임시 DB 에 넣는 시험용 시드 나무(plan-p10a 파일별 값 2, C70). 회화도 적재한다(C85 로 회화가 1-가에 들어와
// 프리뷰에서 회화 1단계를 눌러 보게 — task-p13-dev-seed-talk): 회화 1단계 단원마다 대화 1 · 2 · 3(배정 둘 · 다지기 하나) · 보강 하나와
// 회화 단계 평가 장 · 토리 이야기 견본(완전성 검사가 회화 영역의 이야기 칸을 빈 칸으로 막아 함께 든다).
// P7a loadableSeed()(작은 틀 · 1단계까지 + 적재용 설정 + 시험용 단가표)에 손질 하나를 더한다:
// 말하기 배치의 단계마다 본 문항(듣고 고르기)을 그 대본 문장의 따라 말하기로 바꾼다(예비 문항은 그대로).
// 따라 말하기 · 인식 실패 · 예비 문항 길을 개발 화면과 e2e 에서 보려는 것이다.
// P10 이 읽는 설정 키는 loadableSettings() 가 TEST_SETTINGS 에서 가져온다(공용 변경 4).
// 무작위 · 아이 이름 · 연락처 꼴을 쓰지 않는다(P4a 제약). Supabase 개발용 프로젝트에는 넣지 않는다(C68 (5) · C70).
import type { Area } from "@/core/seed/structure";
import {
  cellKey,
  checksFilePath,
  placementFilePath,
} from "@/core/seed/structure";
import type { SeedTree } from "./builders";
import { LOADABLE_THROUGH, loadableSeed } from "./loadable";

/** 적재하는 영역(네 영역 — 회화는 C85 뒤 1-가 몫. 1~3 구간 토리 이야기 견본도 함께 넣는다 — 13절 C91, 완전성 검사가 이야기 칸을 빈 칸으로 막음). */
export const DEV_SEED_AREAS = [
  "reading",
  "writing",
  "speaking",
  "talk",
] as const satisfies readonly Area[];
/** 완전성 검사의 마지막 단계(시험용 시드가 차 있는 단계). */
export const DEV_SEED_THROUGH = LOADABLE_THROUGH;

/** 개발용 시드 나무. loadableSeed() 의 말하기 배치 본 문항을 따라 말하기로 바꾸고 그 칸의 풀이 검사 기록을 뺀다. */
export function devSeedTree(): SeedTree {
  const tree = loadableSeed();
  const replaced = new Set<string>();
  const placements = tree.placements.map((file) => {
    if (file.area !== "speaking") return file;
    return {
      ...file,
      levels: file.levels.map((entry) => ({
        ...entry,
        items: entry.items.map((item) => {
          if (item.type !== "listening") return item;
          replaced.add(
            cellKey({
              type: "placement",
              area: file.area,
              level: entry.level,
              form: file.form,
              no: item.no,
              spare: false,
            }),
          );
          return {
            no: item.no,
            revision: item.revision,
            correction: item.correction,
            type: "repeat" as const,
            sentence: item.script,
          };
        }),
      })),
    };
  });
  // 따라 말하기는 풀이 검사 대상이 아니다(validate.ts solveTargets) — 바꾼 칸의 기록은 남기면 '대상 아님'과 어긋난다
  const speakingChecks = checksFilePath(placementFilePath("speaking"));
  const checks = tree.checks.map((entry) =>
    entry.path === speakingChecks
      ? {
          ...entry,
          file: {
            ...entry.file,
            records: entry.file.records.filter((r) => !replaced.has(r.cell)),
          },
        }
      : entry,
  );
  return { ...tree, placements, checks };
}
