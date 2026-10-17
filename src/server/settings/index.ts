import "server-only";
// 설정 읽기(12절, plan-p03a 파일별 값 8).
// 범위가 '프로필'인 키는 그 프로필 행을, 없으면 profile_id 가 빈 기본 행을 쓴다(B5-19).
// 행이 없으면 오류이고 코드에 기본값을 두지 않는다(묶음 위험 4). 키별 Zod 규격은 부르는 쪽이 넘긴다.
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { settings } from "@/db/schema/operations";
import { type DbOrTx, getDb } from "@/server/db";

/** 시각(0 ~ 23)의 범위 끝(단위 값). */
const HOURS_PER_DAY = 24;

export class SettingMissingError extends Error {
  constructor(readonly key: string) {
    super(`설정 ${key} 가 없습니다`);
    this.name = "SettingMissingError";
  }
}

export class SettingInvalidError extends Error {
  constructor(
    readonly key: string,
    readonly issues: readonly z.core.$ZodIssue[],
  ) {
    super(`설정 ${key} 의 값이 규격에 맞지 않습니다`);
    this.name = "SettingInvalidError";
  }
}

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** app.timezone: 비지 않은 글자이고 Intl.DateTimeFormat 이 받는 이름. */
export const appTimezoneSchema = z
  .string()
  .min(1)
  .refine(isTimeZone, { message: "Intl 이 받지 않는 시간대입니다" });

/** app.day_start_hour: 0 ~ 23 정수. */
export const appDayStartHourSchema = z
  .number()
  .int()
  .min(0)
  .max(HOURS_PER_DAY - 1);

export type SettingSchemas = Record<string, z.ZodType>;
export type SettingValues<S extends SettingSchemas> = {
  [K in keyof S]: z.output<S[K]>;
};
export type SettingReadOptions = { profileId?: string | null; db?: DbOrTx };

/**
 * 키 목록을 질의 한 번으로 읽는다. 키마다 프로필 행(scope 'profile' 이고 그 profile_id)이 있으면 그것을,
 * 없으면 profile_id 가 빈 행을 쓴다. 값은 키마다 넘긴 Zod 규격으로 검증한다.
 */
export async function getSettings<S extends SettingSchemas>(
  schemas: S,
  { profileId = null, db = getDb() }: SettingReadOptions = {},
): Promise<SettingValues<S>> {
  const keys = Object.keys(schemas);
  if (keys.length === 0) return {} as SettingValues<S>;
  const rows = await db
    .select({
      key: settings.key,
      scope: settings.scope,
      profileId: settings.profileId,
      value: settings.value,
    })
    .from(settings)
    .where(
      and(
        inArray(settings.key, keys),
        profileId
          ? or(isNull(settings.profileId), eq(settings.profileId, profileId))
          : isNull(settings.profileId),
      ),
    );

  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const profileRow = profileId
      ? rows.find(
          (r) =>
            r.key === key && r.scope === "profile" && r.profileId === profileId,
        )
      : undefined;
    const row =
      profileRow ?? rows.find((r) => r.key === key && r.profileId === null);
    if (!row) throw new SettingMissingError(key);
    const parsed = schemas[key].safeParse(row.value);
    if (!parsed.success)
      throw new SettingInvalidError(key, parsed.error.issues);
    result[key] = parsed.data;
  }
  return result as SettingValues<S>;
}

/** 키 하나짜리 줄임. */
export async function getSetting<T extends z.ZodType>(
  key: string,
  schema: T,
  opts: SettingReadOptions = {},
): Promise<z.output<T>> {
  const values = await getSettings({ [key]: schema }, opts);
  return values[key] as z.output<T>;
}
