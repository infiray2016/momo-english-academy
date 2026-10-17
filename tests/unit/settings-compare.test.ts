// 설정값 시드 견주기(plan-p07a 파일별 값 2, 5절 설정값 시드 · 12절 바꾸는 곳 · 11절 (4-1), AC-7e · AC-7g 견주기 몫).
// 값은 시험용 자료(defaultSettings · TEST_SETTINGS)에서 읽는다.
import { describe, expect, it } from "vitest";
import type { SettingRow } from "@/core/seed/schema/reference";
import {
  COMPARED_CHANGE_VIA,
  compareSettings,
  type DbDefaultSetting,
  DEV_OVERRIDE_KEYS,
  INSERT_ONLY_CHANGE_VIA,
  numberReader,
  SEED_LOAD_SOURCE,
  SettingsIncompleteError,
  sameSettingValue,
} from "@/core/seed/settings-compare";
import { defaultSettings, settingNumber } from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";

const THROUGH = "seed.complete_through_level";
const MASTERY = "unit.vocab_mastery";
const MAX_REMEDIAL = "unit.max_remedial.1-3";
const LENGTH_FACTOR = "session.length_factor";
const MAX_CORRECTIONS = "writing.max_corrections";
const TIMEZONE = "app.timezone";

const defaults = defaultSettings();
const THROUGH_DEFAULT = settingNumber(defaults, THROUGH);
const MASTERY_DEFAULT = settingNumber(defaults, MASTERY);
const MAX_REMEDIAL_DEFAULT = settingNumber(defaults, MAX_REMEDIAL);

function seedRow(key: string): SettingRow {
  const row = defaults.settings.find((r) => r.key === key);
  if (row) return { ...row };
  const test = TEST_SETTINGS[key as keyof typeof TEST_SETTINGS];
  if (!test) throw new Error(`시험용 설정에 없는 키: ${key}`);
  const changeVia: SettingRow["changeVia"] = key.startsWith("app.")
    ? "seed"
    : key.startsWith("writing.")
      ? "decision-first"
      : key === LENGTH_FACTOR
        ? "basic"
        : "advanced";
  return {
    key,
    scope: test.scope,
    value: test.value as SettingRow["value"],
    changeVia,
  };
}
function dbOf(row: SettingRow, value: unknown = row.value): DbDefaultSetting {
  return { key: row.key, scope: row.scope, value };
}

describe("설정값 시드 견주기(5절)", () => {
  it("바꾸는 곳 넷과 출처 값 · 덮어쓸 수 있는 키는 정해 둔 값이다", () => {
    expect([...COMPARED_CHANGE_VIA]).toEqual(["seed", "decision-first"]);
    expect([...INSERT_ONLY_CHANGE_VIA]).toEqual(["advanced", "basic"]);
    expect([...DEV_OVERRIDE_KEYS]).toEqual([THROUGH]);
    expect(SEED_LOAD_SOURCE).toBe("seed_load");
  });

  it("AC-7e 설정값 시드 견주기: '시드' 키 seed.complete_through_level 6 → 7 은 고침 한 줄(이전 6 · 새 7)이다", () => {
    const row = seedRow(THROUGH);
    const next = THROUGH_DEFAULT + 1;
    const plan = compareSettings([{ ...row, value: next }], [dbOf(row)]);
    expect(plan.violations).toEqual([]);
    expect(plan.inserts).toEqual([]);
    expect(plan.updates).toEqual([
      {
        key: THROUGH,
        scope: "household",
        oldValue: THROUGH_DEFAULT,
        newValue: next,
      },
    ]);
    expect(plan.values[THROUGH]).toBe(next);
  });

  it("AC-7g 설정값 시드 견주기: 개발용 적재의 덮어쓰기는 seed.complete_through_level 의 시드 값을 대신하고 다른 키는 받지 않는다", () => {
    const through = seedRow(THROUGH);
    const mastery = seedRow(MASTERY);
    const override = THROUGH_DEFAULT - 1;
    const fresh = compareSettings([through, mastery], [], {
      [THROUGH]: override,
    });
    expect(fresh.violations).toEqual([]);
    expect(fresh.inserts).toContainEqual({
      key: THROUGH,
      scope: "household",
      value: override,
    });
    expect(fresh.values[THROUGH]).toBe(override);
    const existing = compareSettings([through], [dbOf(through)], {
      [THROUGH]: override,
    });
    expect(existing.updates).toEqual([
      {
        key: THROUGH,
        scope: "household",
        oldValue: THROUGH_DEFAULT,
        newValue: override,
      },
    ]);
    const other = compareSettings([through, mastery], [], {
      [MASTERY]: MASTERY_DEFAULT,
    });
    expect(other.violations.map((v) => [v.rule, v.key])).toEqual([
      ["override-not-allowed", MASTERY],
    ]);
    // 시드에서 바꾸는 곳이 '시드'가 아니면 허용 키라도 받지 않는다
    const notSeed = compareSettings(
      [{ ...through, changeVia: "advanced" }],
      [],
      { [THROUGH]: override },
    );
    expect(notSeed.violations.map((v) => v.rule)).toEqual([
      "override-not-allowed",
    ]);
  });

  it("5절 설정값 시드 견주기: '시드' · '결정 기록 먼저' 키는 값이 다르면 고치고 같으면 그대로 둔다", () => {
    const through = seedRow(THROUGH);
    const mastery = seedRow(MASTERY);
    expect(mastery.changeVia).toBe("decision-first");
    const changed = compareSettings(
      [through, mastery],
      [dbOf(through), dbOf(mastery, MASTERY_DEFAULT / 2)],
    );
    expect(changed.updates).toEqual([
      {
        key: MASTERY,
        scope: "household",
        oldValue: MASTERY_DEFAULT / 2,
        newValue: MASTERY_DEFAULT,
      },
    ]);
    expect(changed.kept).toEqual([]);
    const same = compareSettings(
      [through, mastery],
      [dbOf(through), dbOf(mastery)],
    );
    expect(same.updates).toEqual([]);
    expect(same.inserts).toEqual([]);
    expect(same.values).toEqual({
      [THROUGH]: THROUGH_DEFAULT,
      [MASTERY]: MASTERY_DEFAULT,
    });
  });

  it("5절 설정값 시드 견주기: '고급' · '기본' 키는 행이 없을 때만 넣고 DB 값이 달라도 지킨다", () => {
    const advanced = seedRow(MAX_REMEDIAL);
    const basic = seedRow(LENGTH_FACTOR);
    expect(advanced.changeVia).toBe("advanced");
    expect(basic.changeVia).toBe("basic");
    const fresh = compareSettings([advanced, basic], []);
    expect(fresh.inserts.map((r) => r.key)).toEqual([
      MAX_REMEDIAL,
      LENGTH_FACTOR,
    ]);
    const parentValue = MAX_REMEDIAL_DEFAULT + 1;
    const kept = compareSettings(
      [advanced, basic],
      [dbOf(advanced, parentValue), dbOf(basic)],
    );
    expect(kept.inserts).toEqual([]);
    expect(kept.updates).toEqual([]);
    expect(kept.kept).toEqual([
      {
        key: MAX_REMEDIAL,
        dbValue: parentValue,
        seedValue: MAX_REMEDIAL_DEFAULT,
      },
    ]);
    expect(kept.values[MAX_REMEDIAL]).toBe(parentValue);
  });

  it("5절 설정값 시드 견주기: 값 비교는 정규 JSON 이다(사전 키 차례 · 1 과 1.0 은 같다)", () => {
    // 수 꼴 키("6" · "7")는 JS 객체에서 늘 수 차례라 글 키로 차례를 바꿔 본다
    const ordered = { alpha: 1, beta: 2 };
    const reversed = { beta: 2, alpha: 1 };
    expect(JSON.stringify(ordered)).not.toBe(JSON.stringify(reversed));
    expect(sameSettingValue(ordered, reversed)).toBe(true);
    expect(sameSettingValue(1, 1.0)).toBe(true);
    expect(sameSettingValue(1, "1")).toBe(false);
    expect(sameSettingValue([1, 2], [2, 1])).toBe(false);
    const corrections = seedRow(MAX_CORRECTIONS);
    const value = corrections.value as Record<string, number>;
    const plan = compareSettings(
      [{ ...corrections, value: ordered }, seedRow(LENGTH_FACTOR)],
      [
        dbOf(corrections, reversed),
        dbOf(seedRow(LENGTH_FACTOR), TEST_SETTINGS[LENGTH_FACTOR].value),
      ],
    );
    expect(plan.updates).toEqual([]);
    expect(plan.kept).toEqual([]);
    expect(sameSettingValue(value, { ...value })).toBe(true);
  });

  it("5절 설정값 시드 견주기: 범위가 DB 행과 다르면 setting-scope-changed 이고 시드에 없는 DB 키는 지우지 않고 알린다", () => {
    const timezone = seedRow(TIMEZONE);
    const through = seedRow(THROUGH);
    const plan = compareSettings(
      [timezone, through],
      [
        { ...dbOf(timezone), scope: "profile" },
        dbOf(through),
        { key: "old.removed_key", scope: "household", value: 1 },
      ],
    );
    expect(plan.violations.map((v) => [v.rule, v.key])).toEqual([
      ["setting-scope-changed", TIMEZONE],
    ]);
    expect(plan.orphans).toEqual(["old.removed_key"]);
    expect(plan.updates).toEqual([]);
  });

  it("5절 설정값 시드 견주기: 결과 값 읽개는 없는 키 · 수 아닌 값에 SettingsIncompleteError 를 던진다", () => {
    const read = numberReader({ [MASTERY]: MASTERY_DEFAULT, [TIMEZONE]: "x" });
    expect(read(MASTERY)).toBe(MASTERY_DEFAULT);
    expect(() => read(THROUGH)).toThrow(SettingsIncompleteError);
    expect(() => read(TIMEZONE)).toThrow(SettingsIncompleteError);
    try {
      read(THROUGH);
    } catch (error) {
      expect((error as SettingsIncompleteError).key).toBe(THROUGH);
    }
  });
});
