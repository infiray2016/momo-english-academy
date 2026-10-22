import "server-only";
// AI 호출 가변부 재료 LevelContext(6.1 '이번 단원과 이전 단원 학습 요소' · 13절 C64 (1), plan-p11b 파일별 값 1).
// can-do · 문장 길이 상한은 단계 규격, 학습 요소 · 단원 단어는 단원 규격에서 그 세션의 시드 판(seed_revision)으로 읽는다
// (P10 세션 화면 자료와 같은 판 — 칸마다 그 판 이하 가장 높은 판, P7a pickByCell). 앞 단원 학습 요소는 같은 영역에서
// (단계, 단원) 차례로 앞선 모든 단원(앞 단계 단원 1~5 전부 + 이 단계 앞 단원, 알파벳 단원 0 빼고)이다. 없는 칸은 던진다
// (조용한 기본값을 쓰지 않는다 — 부르는 쪽이 서버 오류로 다룬다).
import { and, eq, gte, lte } from "drizzle-orm";
import type { LevelContext } from "@/core/ai/calls/common";
import { type Area, UNITS_PER_LEVEL } from "@/core/seed/structure";
import { pickByCell } from "@/core/seed/version-pick";
import { unitSpecs } from "@/db/schema/content";
import { type DbOrTx, getDb } from "@/server/db";
import { readLevelSpec, readUnitSpec } from "@/server/seed/read";

/** 첫 정규 단원(알파벳 단원 0 은 앞 단원 학습 요소에 넣지 않는다). */
const FIRST_UNIT = 1;

export class LevelContextError extends Error {
  constructor(what: string) {
    super(`가변부 재료가 없다: ${what}`);
    this.name = "LevelContextError";
  }
}

const cellOf = (level: number, unit: number) => `${level}:${unit}`;

/** 그 세션(영역 · 단계 · 단원 · 시드 판)의 가변부 재료. */
export async function levelContextOf(
  {
    area,
    level,
    unit,
    revision,
  }: { area: Area; level: number; unit: number; revision: number },
  { db = getDb() }: { db?: DbOrTx } = {},
): Promise<LevelContext> {
  const levelSpec = await readLevelSpec(
    { area, level, startRevision: revision },
    { db },
  );
  if (!levelSpec) throw new LevelContextError(`단계 규격 ${area} ${level}`);
  const sentenceMaxWords = (levelSpec.spec as { sentenceMaxWords?: unknown })
    .sentenceMaxWords;
  if (typeof sentenceMaxWords !== "number")
    throw new LevelContextError(`문장 길이 상한 ${area} ${level}`);
  const unitSpec = await readUnitSpec(
    { area, level, unit, startRevision: revision },
    { db },
  );
  if (!unitSpec || typeof unitSpec.learningPoints !== "string")
    throw new LevelContextError(`단원 규격 ${area} ${level} ${unit}`);

  // 앞 단원: 같은 영역 · 이 단계 이하 · 정규 단원, 칸마다 그 판 이하 가장 높은 판
  const rows = await db
    .select()
    .from(unitSpecs)
    .where(
      and(
        eq(unitSpecs.area, area),
        lte(unitSpecs.level, level),
        gte(unitSpecs.unit, FIRST_UNIT),
        lte(unitSpecs.revision, revision),
      ),
    );
  const picked = pickByCell(
    rows.filter((r) => r.level < level || r.unit < unit),
    (r) => cellOf(r.level, r.unit),
    revision,
  );
  const prevLearningElements: string[] = [];
  for (let l = 1; l <= level; l += 1) {
    const last = l < level ? UNITS_PER_LEVEL : unit - 1;
    for (let u = FIRST_UNIT; u <= last; u += 1) {
      const row = picked.get(cellOf(l, u));
      if (!row || typeof row.learningPoints !== "string")
        throw new LevelContextError(`앞 단원 규격 ${area} ${l} ${u}`);
      prevLearningElements.push(row.learningPoints);
    }
  }

  return {
    level,
    canDo: levelSpec.canDo,
    learningElement: unitSpec.learningPoints,
    prevLearningElements,
    unitWords: [...unitSpec.targetVocab],
    sentenceMaxWords,
  };
}
