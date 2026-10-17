// 설정값 시드 견주기(plan-p07a 파일별 값 2, 5절 설정값 시드 · 12절 머리 두 문단 · 11절 (4-1) · 13절 C56 (4) · C68 (2)).
// 설정값 시드는 행을 더하지 않고 값을 견준다. 바꾸는 곳이 '시드' · '결정 기록 먼저'인 키는 값이 다르면 고치고,
// '고급' · '기본' 키는 행이 없을 때만 넣고 그 뒤로는 DB 값을 지킨다. 프로필 행(부모가 바꾼 값)은 견주지 않는다.
// DB · 파일을 가져오지 않는 순수 모듈이다(의존 규칙 core-no-framework · core-no-io).
import type { z } from "zod";
import type {
  SettingRow,
  SettingValueSchema,
} from "@/core/seed/schema/reference";
import { canonicalJson } from "@/core/seed/validate";
import type { SettingsReader } from "@/core/vocab/allocate";

/** settings_history.source 의 '시드 적재' 값(C56 (4) 위임 값, C68 (2)). */
export const SEED_LOAD_SOURCE = "seed_load";

type ChangeVia = SettingRow["changeVia"];
/** 시드 값과 견주어 고치는 바꾸는 곳(5절). */
export const COMPARED_CHANGE_VIA = [
  "seed",
  "decision-first",
] as const satisfies readonly ChangeVia[];
/** 행이 없을 때만 넣는 바꾸는 곳(5절). */
export const INSERT_ONLY_CHANGE_VIA = [
  "advanced",
  "basic",
] as const satisfies readonly ChangeVia[];
/** 개발용 적재가 덮어 넣을 수 있는 키(11절 (4-1)). */
export const DEV_OVERRIDE_KEYS = ["seed.complete_through_level"] as const;

export type SettingValue = z.infer<typeof SettingValueSchema>;
export type SettingScope = SettingRow["scope"];

/** DB 의 기본 행(profile_id 가 빈 행)만. */
export type DbDefaultSetting = {
  key: string;
  scope: SettingScope;
  value: unknown;
};

export type SettingsRule = "setting-scope-changed" | "override-not-allowed";
export type SettingsViolation = {
  rule: SettingsRule;
  key: string;
  message: string;
};

export type SettingsPlan = {
  inserts: { key: string; scope: SettingScope; value: SettingValue }[];
  updates: {
    key: string;
    scope: SettingScope;
    oldValue: unknown;
    newValue: SettingValue;
  }[];
  /** '고급' · '기본' 키에서 DB 값이 시드 값과 달라 지킨 것. */
  kept: { key: string; dbValue: unknown; seedValue: SettingValue }[];
  /** 시드에 없는 DB 키(지우지 않는다). */
  orphans: string[];
  violations: SettingsViolation[];
  /** 견준 뒤 기본 행의 값(넣을 값 · 고칠 값 · 그대로 둔 값 · 지킨 DB 값 · 시드에 없는 DB 키의 값). */
  values: Record<string, unknown>;
};

/** 값 비교는 정규 JSON 이다 — 사전 키 차례와 1 · 1.0 을 같게 본다. */
export function sameSettingValue(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

function isCompared(changeVia: ChangeVia): boolean {
  return (COMPARED_CHANGE_VIA as readonly ChangeVia[]).includes(changeVia);
}

/** 설정값 시드(settings.json 행)와 DB 기본 행을 견준다. overrides 는 개발용 적재의 덮어쓰기(DEV_OVERRIDE_KEYS). */
export function compareSettings(
  seed: readonly SettingRow[],
  db: readonly DbDefaultSetting[],
  overrides: Readonly<Record<string, SettingValue>> = {},
): SettingsPlan {
  const plan: SettingsPlan = {
    inserts: [],
    updates: [],
    kept: [],
    orphans: [],
    violations: [],
    values: {},
  };
  const seedByKey = new Map(seed.map((row) => [row.key, row]));
  const dbByKey = new Map(db.map((row) => [row.key, row]));

  for (const key of Object.keys(overrides)) {
    const row = seedByKey.get(key);
    if (!(DEV_OVERRIDE_KEYS as readonly string[]).includes(key)) {
      plan.violations.push({
        rule: "override-not-allowed",
        key,
        message: `개발용 적재가 덮어쓸 수 있는 키가 아니다(${DEV_OVERRIDE_KEYS.join(" · ")} 만)`,
      });
    } else if (row?.changeVia !== "seed") {
      plan.violations.push({
        rule: "override-not-allowed",
        key,
        message: "설정값 시드에서 바꾸는 곳이 '시드'인 키만 덮어쓸 수 있다",
      });
    }
  }
  const overridden = (row: SettingRow): SettingValue => {
    const value = overrides[row.key];
    return value !== undefined &&
      (DEV_OVERRIDE_KEYS as readonly string[]).includes(row.key) &&
      row.changeVia === "seed"
      ? value
      : row.value;
  };

  for (const row of seed) {
    const value = overridden(row);
    const current = dbByKey.get(row.key);
    if (!current) {
      plan.inserts.push({ key: row.key, scope: row.scope, value });
      plan.values[row.key] = value;
      continue;
    }
    if (current.scope !== row.scope) {
      plan.violations.push({
        rule: "setting-scope-changed",
        key: row.key,
        message: `범위가 DB(${current.scope})와 시드(${row.scope})에서 다르다`,
      });
      plan.values[row.key] = current.value;
      continue;
    }
    if (sameSettingValue(current.value, value)) {
      plan.values[row.key] = current.value;
      continue;
    }
    if (isCompared(row.changeVia)) {
      plan.updates.push({
        key: row.key,
        scope: row.scope,
        oldValue: current.value,
        newValue: value,
      });
      plan.values[row.key] = value;
    } else {
      plan.kept.push({
        key: row.key,
        dbValue: current.value,
        seedValue: value,
      });
      plan.values[row.key] = current.value;
    }
  }
  for (const row of db) {
    if (seedByKey.has(row.key)) continue;
    plan.orphans.push(row.key);
    plan.values[row.key] = row.value;
  }
  return plan;
}

/** 견준 뒤 값에서 설정값을 수로 읽는다(3.2 관계 표 검사 입력). 키가 없거나 수가 아니면 던진다. */
export class SettingsIncompleteError extends Error {
  constructor(readonly key: string) {
    super(`설정값 ${key} 가 없거나 수가 아니다`);
    this.name = "SettingsIncompleteError";
  }
}

export function numberReader(
  values: Readonly<Record<string, unknown>>,
): SettingsReader {
  return (key) => {
    const value = values[key];
    if (typeof value !== "number") throw new SettingsIncompleteError(key);
    return value;
  };
}
