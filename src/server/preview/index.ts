import "server-only";
// 프리뷰 배포 관찰 쪽(/dev/teacher-probe)의 서버 몸(선생님 화면 plan 값 6 · 16, 컨트롤러 덧 2026-10-23 '단원 바로 가기').
// 관찰 쪽은 운영 빌드에 없고(next.config pageExtensions), 여기 함수도 운영 배포(VERCEL_ENV=production)면 아무것도 쓰지 않는다(깊이 방어).
// - 선생님 지우기: 집 프로필 teacher_key 를 비운다 — 다음 회화에서 '선생님을 골라요'가 다시 나온다(요청자가 미나 · 리오를 둘 다 봄, C117).
// - 단원 바로 가기: 영역 하나의 지금 단원을 1단계(자료가 1단계뿐) 단원 하나로 바꾼다. 단원 통과(P12) 전에 진짜 자료의 단원 2~5 를
//   프리뷰에서 쓰게 하려는 시험 도구다. 새 규칙을 만들지 않고 첫 실행 · 배치 결과와 같은 단원 들기(unitEntryOf — 단원 시작 복사본 ·
//   사건)를 다시 쓴다. 그 단원의 회차가 이미 있으면(앞서 들었던 단원으로 돌아감) 그 회차를 그대로 쓴다. 범위 끝 알림은 넣지 않는다
//   (진짜 시작이 아니고, 같은 기준 키의 알림이 첫 실행 때 이미 있을 수 있다). 사건의 까닭은 preview_jump 다.
// 아이 이름 · 오류 글을 로그에 내지 않는다(오류 이름 · 코드만 — dbErrorTag).
import { and, desc, eq, max } from "drizzle-orm";
import { z } from "zod";
import {
  firstRunSettingKeys,
  type SettingRead,
  unitEntryOf,
} from "@/core/profile/start";
import {
  AREAS,
  type Area,
  isUnitOf,
  UNITS_PER_LEVEL,
} from "@/core/seed/structure";
import { profiles, profileTracks, unitProgress } from "@/db/schema/learning";
import { progressEvents, settings } from "@/db/schema/operations";
import { type Db, getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readHouseholdProfile } from "@/server/profile";
import { currentSeedRevision } from "@/server/seed/read";
import { getSettings } from "@/server/settings";
import { readHouseholdTeacher } from "@/server/teacher";

/** 단원 바로 가기의 단계(자료가 1단계뿐 — 컨트롤러 덧). */
export const PREVIEW_JUMP_LEVEL = 1;
/** 단원 바로 가기 사건의 까닭(progress_events target.source — 첫 실행 · 배치의 까닭과 가른다). */
export const PREVIEW_JUMP_SOURCE = "preview_jump";

type Env = Readonly<Record<string, string | undefined>>;

/** 관찰 쪽 도구를 쓸 수 있는 배포인가(운영 배포가 아님). */
export function previewToolsAllowed(env: Env = process.env): boolean {
  return env.VERCEL_ENV !== "production";
}

/** 그 영역의 1단계에 있는 단원 번호(읽기 · 쓰기 0~5, 말하기 · 회화 1~5 — isUnitOf 그대로). */
export function previewUnitsOf(area: Area): number[] {
  const out: number[] = [];
  for (let unit = 0; unit <= UNITS_PER_LEVEL; unit += 1)
    if (isUnitOf(area, PREVIEW_JUMP_LEVEL, unit)) out.push(unit);
  return out;
}

export type PreviewTrack = {
  area: Area;
  level: number | null;
  unit: number | null;
};

export type PreviewProbeView = {
  /** 집 프로필이 고른 선생님(명단 안 키일 때). */
  teacher: { key: string; nameKo: string } | null;
  /** 영역마다 지금 단계 · 단원(배치 전은 null). */
  tracks: PreviewTrack[];
};

type PreviewDeps = { db?: Db; env?: Env };

/** 관찰 쪽 첫 그림 자료. 프로필이 없으면 undefined. */
export async function readPreviewProbe({
  db = getDb(),
}: PreviewDeps = {}): Promise<PreviewProbeView | undefined> {
  const profile = await readHouseholdProfile({ db });
  if (!profile) return undefined;
  const teacher = await readHouseholdTeacher({ db });
  const rows = await db
    .select({
      area: profileTracks.area,
      level: profileTracks.level,
      unit: profileTracks.unit,
    })
    .from(profileTracks)
    .where(eq(profileTracks.profileId, profile.id));
  return {
    teacher: teacher ? { key: teacher.key, nameKo: teacher.nameKo } : null,
    tracks: AREAS.map(
      (area) =>
        rows.find((r) => r.area === area) ?? { area, level: null, unit: null },
    ),
  };
}

/** 집 프로필의 선생님 지우기(값 6). 운영 배포면 { ok: false }. */
export async function clearTeacherForPreviewFor({
  db = getDb(),
  env = process.env,
}: PreviewDeps = {}): Promise<{ ok: boolean }> {
  if (!previewToolsAllowed(env)) return { ok: false };
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false };
    await db
      .update(profiles)
      .set({ teacherKey: null })
      .where(eq(profiles.id, profile.id));
    return { ok: true };
  } catch (error) {
    logFailure("선생님 지우기", error);
    return { ok: false };
  }
}

export type JumpUnitOutcome =
  | {
      ok: true;
      area: Area;
      level: number;
      unit: number;
      /** 이 단원의 회차를 새로 넣었는가(앞서 들었던 단원이면 거짓). */
      started: boolean;
    }
  | { ok: false; reason: "refused" | "invalid" | "no_profile" | "unavailable" };

const JumpInputSchema = z
  .strictObject({ area: z.enum(AREAS), unit: z.number().int() })
  .refine((v) => isUnitOf(v.area, PREVIEW_JUMP_LEVEL, v.unit));

/**
 * 단원 바로 가기(컨트롤러 덧). 운영 배포면 refused, 1단계에 없는 단원 · 꼴이 틀린 입력은 invalid. 한 트랜잭션: 그 영역의 지금 단계 · 단원 행(profile_tracks)을
 * 1단계 · 그 단원으로 → 그 단원 회차가 없으면 단원 들기(unitEntryOf)의 회차를 넣음 → 사건 한 행.
 */
export async function jumpUnitForPreviewFor(
  input: unknown,
  { db = getDb(), now, env = process.env }: PreviewDeps & { now: () => Date },
): Promise<JumpUnitOutcome> {
  if (!previewToolsAllowed(env)) return { ok: false, reason: "refused" };
  const parsed = JumpInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { area, unit } = parsed.data;
  const level = PREVIEW_JUMP_LEVEL;
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "no_profile" };
    const keys = firstRunSettingKeys();
    const values: Record<string, unknown> = await getSettings(
      Object.fromEntries(keys.map((k) => [k, z.unknown()])),
      { db },
    );
    const read: SettingRead = (key) => values[key];
    const seedRevision = await currentSeedRevision({ db });
    const at = now();
    return await db.transaction(async (tx) => {
      const [track] = await tx
        .select()
        .from(profileTracks)
        .where(
          and(
            eq(profileTracks.profileId, profile.id),
            eq(profileTracks.area, area),
          ),
        )
        .for("update");
      if (!track) return { ok: false, reason: "no_profile" } as const;
      const [version] = await tx
        .select({ v: max(settings.version) })
        .from(settings);
      const entry = unitEntryOf({
        profileId: profile.id,
        area,
        level,
        unit,
        // 부모가 정한 시작과 같은 갈래(parent_adjustment · parent) — 까닭 글은 아래에서 preview_jump 로
        source: "first_run",
        read,
        seedRevision,
        settingsVersion: Number(version?.v ?? 0),
        now: at,
      });
      await tx
        .update(profileTracks)
        .set({ level, unit })
        .where(eq(profileTracks.id, track.id));
      const [round] = await tx
        .select({ id: unitProgress.id })
        .from(unitProgress)
        .where(
          and(
            eq(unitProgress.profileId, profile.id),
            eq(unitProgress.area, area),
            eq(unitProgress.level, level),
            eq(unitProgress.unit, unit),
          ),
        )
        .orderBy(desc(unitProgress.round))
        .limit(1);
      if (!round) await tx.insert(unitProgress).values(entry.unitProgress);
      await tx.insert(progressEvents).values({
        ...entry.event,
        target: { area, source: PREVIEW_JUMP_SOURCE },
        oldValue: { level: track.level, unit: track.unit },
      });
      return { ok: true, area, level, unit, started: !round } as const;
    });
  } catch (error) {
    logFailure("단원 바로 가기", error);
    return { ok: false, reason: "unavailable" };
  }
}

function logFailure(what: string, error: unknown) {
  console.error(`관찰 쪽 ${what} 실패(${dbErrorTag(error)})`);
}
