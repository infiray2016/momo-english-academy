// 적재 시험용 시드 나무(plan-p07a 파일별 값 6). miniSeed(작은 틀, 1단계까지) + 적재에 드는 모든 설정 + P9a 시험용 단가표.
// 판 바꾸기 · 풀이 검사 기록 해시 다시 셈 · 프로필 · 세션 넣기 도우미를 둔다.
// 무작위 · 아이 이름 · 연락처 꼴을 쓰지 않는다(이름은 앱 안 이름 Tori · Momo). 시각은 부르는 쪽이 고정 값을 넘긴다.
import { eq } from "drizzle-orm";
import type { LessonFile } from "@/core/seed/schema/lesson";
import type {
  LevelSpec,
  SettingRow,
  SettingsFile,
  UnitSpec,
} from "@/core/seed/schema/reference";
import {
  AREAS,
  type Area,
  LEVEL_MIN,
  parseCellKey,
} from "@/core/seed/structure";
import { cellHash } from "@/core/seed/validate";
import type { SeedVersion } from "@/core/seed/version-pick";
import { lessons } from "@/db/schema/content";
import { profiles, sessions } from "@/db/schema/learning";
import type { Db } from "@/server/db";
import { MODEL_PRICES_FIXTURE } from "../ai/model-prices";
import { TEST_SETTINGS } from "../settings";
import {
  miniSeed,
  type SeedTree,
  seedTreeFiles,
  smallFrameSettings,
} from "./builders";

const THROUGH_KEY = "seed.complete_through_level";
/** 시험용 시드가 차 있는 마지막 단계(miniSeed 는 1단계까지만 만든다). */
export const LOADABLE_THROUGH = LEVEL_MIN;

type ChangeVia = SettingRow["changeVia"];

/** 12절 바꾸는 곳이 시드인 회화 선생님 키(자산 검사가 읽는 상한, C130). */
const SEED_CHANGE_KEYS: readonly string[] = [
  "talk.teacher_model_max_mb",
  "talk.teacher_portrait_max_kb",
];

/** 12절 바꾸는 곳: app.* · 선생님 자산 상한 시드, writing.* 결정 기록 먼저, session.length_factor 기본, 나머지(ai.* · access.* · parent.* · talk.safety_*) 고급. */
function changeViaOf(key: string): ChangeVia {
  if (key.startsWith("app.") || SEED_CHANGE_KEYS.includes(key)) return "seed";
  if (key.startsWith("writing.")) return "decision-first";
  if (key === "session.length_factor") return "basic";
  return "advanced";
}

/**
 * 적재 시험용 설정값 시드: smallFrameSettings() 의 45 키 + TEST_SETTINGS 키.
 * 조합 · 관계 · 학습일 계산에 드는 키가 모두 있다. seed.complete_through_level 은 시험용 시드가 차 있는 단계다
 * (덮어쓰기 없는 적재도 완전성을 넘는다).
 */
export function loadableSettings(): SettingsFile {
  const base = smallFrameSettings().settings.map((row) =>
    row.key === THROUGH_KEY ? { ...row, value: LOADABLE_THROUGH } : row,
  );
  const known = new Set(base.map((row) => row.key));
  const extra: SettingRow[] = Object.entries(TEST_SETTINGS)
    .filter(([key]) => !known.has(key))
    .map(([key, { scope, value }]) => ({
      key,
      scope,
      value: structuredClone(value) as SettingRow["value"],
      changeVia: changeViaOf(key),
    }));
  return { settings: [...base, ...extra] };
}

/** miniSeed(영역 넷, 1단계, 작은 틀)에 loadableSettings 와 P9a 시험용 단가표(실제 조합 칸)를 끼운 시드 나무. */
export function loadableSeed(
  options: { areas?: readonly Area[] } = {},
): SeedTree {
  const tree = miniSeed({
    areas: options.areas ?? AREAS,
    through: LOADABLE_THROUGH,
    frame: "small",
  });
  return {
    ...tree,
    reference: {
      ...tree.reference,
      settings: loadableSettings(),
      modelPrices: structuredClone(MODEL_PRICES_FIXTURE),
    },
  };
}

/** 설정 행 하나의 값을 바꾼 나무(없는 키는 던진다). */
export function withSetting(
  tree: SeedTree,
  key: string,
  value: SettingRow["value"],
): SeedTree {
  const next = structuredClone(tree);
  const row = next.reference.settings.settings.find((r) => r.key === key);
  if (!row) throw new Error(`설정값 시드에 없는 키: ${key}`);
  row.value = value;
  return next;
}

/** 설정 행 하나를 뺀 나무. */
export function withoutSetting(tree: SeedTree, key: string): SeedTree {
  const next = structuredClone(tree);
  next.reference.settings.settings = next.reference.settings.settings.filter(
    (r) => r.key !== key,
  );
  return next;
}

type Mutable = Record<string, unknown> & SeedVersion;

/** 나무 안에서 칸 키의 칸 객체(수업 · 이야기 · 평가 문항 · 회화 평가 카드 장 · 배치 문항)를 찾는다. 없으면 던진다. */
export function cellValueOf(tree: SeedTree, key: string): Mutable {
  const ref = parseCellKey(key);
  let found: unknown;
  switch (ref?.type) {
    case "lesson":
      found = tree.lessons
        .find(
          (f: LessonFile) =>
            f.area === ref.area && f.level === ref.level && f.unit === ref.unit,
        )
        ?.lessons.find(
          (l) =>
            l.kind === ref.kind &&
            l.lessonNo === ref.lessonNo &&
            l.variant === ref.variant,
        );
      break;
    case "story":
      found = tree.stories
        .find((f) => f.band === ref.band)
        ?.stories.find((s) => s.no === ref.no);
      break;
    case "level-test": {
      const form = tree.levelTests
        .find((f) => f.area === ref.area && f.level === ref.level)
        ?.forms.find((f) => f.form === ref.form);
      found =
        form && "sheets" in form
          ? form.sheets.find((s) => s.sheet === ref.no)
          : form?.items.find((i) => i.no === ref.no);
      break;
    }
    case "placement": {
      const entry = tree.placements
        .find((f) => f.area === ref.area && f.form === ref.form)
        ?.levels.find((l) => l.level === ref.level);
      const list = (ref.spare ? entry?.spares : entry?.items) as
        | { no: number }[]
        | undefined;
      found = list?.find((i) => i.no === ref.no);
      break;
    }
    default:
      throw new Error(`칸 키 꼴이 아니다: ${key}`);
  }
  if (!found) throw new Error(`나무에 없는 칸: ${key}`);
  return found as Mutable;
}

/**
 * 칸 하나의 판을 바꾸고 change 로 내용을 고친 나무. 그 칸의 풀이 검사 기록 해시를 cellHash 로 다시 센다
 * (판정 same 은 그대로) — 그래야 완전성 검사가 '풀이 검사 안 됨'으로 막지 않는다.
 */
export function withCellVersion(
  tree: SeedTree,
  key: string,
  version: SeedVersion,
  change?: (cell: Mutable) => void,
): SeedTree {
  const next = structuredClone(tree);
  const cell = cellValueOf(next, key);
  cell.revision = version.revision;
  cell.correction = version.correction;
  change?.(cell);
  const hash = cellHash(key, cell);
  for (const { file } of next.checks) {
    for (const record of file.records) {
      if (record.cell !== key) continue;
      record.contentHash = hash;
      if (record.human) record.human.contentHash = hash;
    }
  }
  return next;
}

/** 단계 규격 행 하나의 판을 바꾸고 change 로 고친 나무. */
export function withLevelSpecVersion(
  tree: SeedTree,
  area: Area,
  level: number,
  version: SeedVersion,
  change?: (spec: LevelSpec) => void,
): SeedTree {
  const next = structuredClone(tree);
  const spec = next.reference.levelSpecs.levelSpecs.find(
    (s) => s.area === area && s.level === level,
  );
  if (!spec) throw new Error(`단계 규격 행이 없다: ${area} ${level}`);
  spec.revision = version.revision;
  spec.correction = version.correction;
  change?.(spec);
  return next;
}

/** 단원 규격 행 하나의 판을 바꾸고 change 로 고친 나무. */
export function withUnitSpecVersion(
  tree: SeedTree,
  area: Area,
  level: number,
  unit: number,
  version: SeedVersion,
  change?: (spec: UnitSpec) => void,
): SeedTree {
  const next = structuredClone(tree);
  const spec = next.reference.unitSpecs.unitSpecs.find(
    (s) => s.area === area && s.level === level && s.unit === unit,
  );
  if (!spec) throw new Error(`단원 규격 행이 없다: ${area} ${level} ${unit}`);
  spec.revision = version.revision;
  spec.correction = version.correction;
  change?.(spec);
  return next;
}

/** 시드 나무 → 파일 묶음(seed/ 뿌리 기준 경로 → 글). 시험은 디스크 없이 loadSeed 에 넘긴다. */
export function filesOf(tree: SeedTree): Map<string, string> {
  return seedTreeFiles(tree);
}

/** 프로필 하나(앱 안 이름)와 그 수업을 가리키는 진행 중 세션 하나를 넣는다. */
export async function insertProfileSession(
  db: Db,
  { lessonId, at }: { lessonId: string; at: Date },
): Promise<{ profileId: string; sessionId: string }> {
  const [lesson] = await db
    .select({
      area: lessons.area,
      level: lessons.level,
      unit: lessons.unit,
      revision: lessons.revision,
      correction: lessons.correction,
    })
    .from(lessons)
    .where(eq(lessons.id, lessonId));
  if (!lesson) throw new Error(`수업 행이 없다: ${lessonId}`);
  const [profile] = await db
    .insert(profiles)
    .values({
      displayName: "Momo",
      englishName: "Momo",
      avatar: "tori",
      topicBundle: "animals",
      alphabetStart: false,
    })
    .returning({ id: profiles.id });
  if (!profile) throw new Error("프로필을 넣지 못했다");
  const [session] = await db
    .insert(sessions)
    .values({
      profileId: profile.id,
      area: lesson.area,
      level: lesson.level,
      unit: lesson.unit,
      lessonId,
      kind: "regular",
      status: "in_progress",
      startedAt: at,
      seedRevision: lesson.revision,
      seedCorrection: lesson.correction,
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("세션을 넣지 못했다");
  return { profileId: profile.id, sessionId: session.id };
}
