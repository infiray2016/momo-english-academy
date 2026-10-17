// 첫 실행 순수 규칙(plan-p10a 파일별 값 6 · 7, 4절 첫 실행 행 · 3.1 · 3.2 회화 시작 단계 · 12절 머리 · 6.3, C72).
// 설계 숫자는 TEST_SETTINGS · loadableSettings() 에서 읽는다. 이름은 앱 안 이름(모모 · 토리)과 고시의 보기만 쓴다.
import { describe, expect, it } from "vitest";
import { romanizeGivenName } from "@/core/profile/romanize";
import {
  AVATARS,
  canDoExample,
  checkFirstRunInput,
  englishNamePieces,
  type FirstRunInput,
  firstRunSettingKeys,
  householdRowsOf,
  MIC_BROWSER_MAX,
  MIC_CODE_MAX,
  NAME_MAX_LENGTH,
  PIN_LENGTH,
  placementSnapshotOf,
  rangeEndAlertDue,
  TOPIC_BUNDLES,
  trackStartsOf,
  unitSnapshotOf,
} from "@/core/profile/start";
import { AREAS } from "@/core/seed/structure";
import { loadableSettings } from "../fixtures/seed/loadable";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";

/** 12절 기본값(TEST_SETTINGS)과 적재용 작은 틀 값(loadableSettings)의 키 → 값. */
const loadable = Object.fromEntries(
  loadableSettings().settings.map((r) => [r.key, r.value]),
) as Record<string, unknown>;
const read = (values: Record<string, unknown>) => (key: string) => values[key];
const CAP = TEST_SETTINGS["talk.placement_cap"].value;
const MARGIN = TEST_SETTINGS["seed.range_end_alert_margin"].value;
/** 시험용 '완전성 끝 단계'(12절 기본값 6, 4절 '1~6단계만 보인다'). 테이블 값과 다른 수로 경계를 본다. */
const THROUGH = 6;
const NOW = new Date("2026-10-17T10:00:00+09:00");
const PIN = "1".repeat(PIN_LENGTH);

function input(overrides: Partial<FirstRunInput> = {}): FirstRunInput {
  return {
    pin: PIN,
    displayName: "모모",
    englishName: "Momo",
    avatar: AVATARS[0].id,
    topicBundle: TOPIC_BUNDLES[0].id,
    alphabetUnknown: false,
    startLevels: {},
    mic: { result: "not_checked" },
    ...overrides,
  };
}

describe("로마자", () => {
  it("AC-1c 로마자: 이름의 음운 변화를 반영하지 않고(한복남 → Boknam · 홍빛나 → Bitna) 세 글자 · 두 글자 성 넉 자 이름은 성을 뺀다", () => {
    // 국어의 로마자 표기법 제3장 제4항의 보기(이름 부분)
    expect(romanizeGivenName("한복남")).toBe("Boknam");
    expect(romanizeGivenName("홍빛나")).toBe("Bitna");
    // 앱 안 이름
    expect(romanizeGivenName("모모")).toBe("Momo");
    expect(romanizeGivenName("토리")).toBe("Tori");
    expect(romanizeGivenName("남궁모모")).toBe("Momo");
    // 두 글자는 그대로, 한글이 아닌 글자는 버린다, 비면 빈 글자
    expect(romanizeGivenName(" 모 모! ")).toBe("Momo");
    expect(romanizeGivenName("Tori")).toBe("");
    expect(romanizeGivenName("")).toBe("");
  });

  it("로마자: 표기 일람대로 첫소리 · 가운뎃소리 · 끝소리를 적고 ㄹㄹ 은 ll 이다", () => {
    // 제2장: ㄱ ㄷ ㅂ 은 모음 앞 g d b · 끝소리 k t p, ㄹ 은 모음 앞 r · 끝 l, ㄹㄹ 은 ll
    expect(romanizeGivenName("가다바")).toBe("Daba");
    expect(romanizeGivenName("각닫밥")).toBe("Datbap");
    expect(romanizeGivenName("모리")).toBe("Mori");
    expect(romanizeGivenName("몰리")).toBe("Molli");
    // 겹모음 · 된소리 · 거센소리
    expect(romanizeGivenName("의쥐꽃")).toBe("Jwikkot");
    expect(romanizeGivenName("웨예")).toBe("Weye");
    expect(romanizeGivenName("최치")).toBe("Choechi");
  });
});

describe("트랙 시작값", () => {
  it("고른 영역은 그 단계 단원 1이고, 고르지 않은 읽기 · 쓰기 · 말하기는 배치 대기다", () => {
    const starts = trackStartsOf({
      chosen: { reading: 3 },
      alphabetUnknown: false,
      through: THROUGH,
      placementCap: CAP,
    });
    expect(starts.reading).toEqual({ level: 3, unit: 1, source: "first_run" });
    expect(starts.writing).toEqual({ pending: true });
    expect(starts.speaking).toEqual({ pending: true });
    expect(starts.talk).toEqual({ pending: true });
  });

  it("AC-11b 회화를 고르지 않으면 말하기 시작 단계와 talk.placement_cap 가운데 낮은 값이다", () => {
    const high = trackStartsOf({
      chosen: { speaking: CAP + 1 },
      alphabetUnknown: false,
      through: THROUGH,
      placementCap: CAP,
    });
    expect(high.talk).toEqual({
      level: CAP,
      unit: 1,
      source: "speaking_start",
    });
    const low = trackStartsOf({
      chosen: { speaking: CAP - 1 },
      alphabetUnknown: false,
      through: THROUGH,
      placementCap: CAP,
    });
    expect(low.talk).toEqual({
      level: CAP - 1,
      unit: 1,
      source: "speaking_start",
    });
  });

  it("AC-1c 회화를 고르면 talk.placement_cap 을 쓰지 않고 그 단계다", () => {
    const starts = trackStartsOf({
      chosen: { talk: CAP + 1, speaking: 1 },
      alphabetUnknown: false,
      through: THROUGH,
      placementCap: CAP,
    });
    expect(starts.talk).toEqual({
      level: CAP + 1,
      unit: 1,
      source: "first_run",
    });
  });

  it("알파벳을 아직 모르면 읽기 · 쓰기는 배치 없이 1단계 단원 0이고, 범위 밖 단계는 던진다", () => {
    const starts = trackStartsOf({
      chosen: {},
      alphabetUnknown: true,
      through: THROUGH,
      placementCap: CAP,
    });
    expect(starts.reading).toEqual({
      level: 1,
      unit: 0,
      source: "first_run_alphabet",
    });
    expect(starts.writing).toEqual({
      level: 1,
      unit: 0,
      source: "first_run_alphabet",
    });
    expect(starts.speaking).toEqual({ pending: true });
    // 알파벳 모름은 고른 단계보다 앞선다(plan-p10a 값 7, 검토 review-p10-2-code M-1)
    const chosenToo = trackStartsOf({
      chosen: { reading: 3, writing: 2 },
      alphabetUnknown: true,
      through: THROUGH,
      placementCap: CAP,
    });
    for (const area of ["reading", "writing"] as const) {
      expect(chosenToo[area], area).toEqual({
        level: 1,
        unit: 0,
        source: "first_run_alphabet",
      });
    }
    for (const bad of [0, THROUGH + 1, 1.5]) {
      expect(() =>
        trackStartsOf({
          chosen: { reading: bad },
          alphabetUnknown: false,
          through: THROUGH,
          placementCap: CAP,
        }),
      ).toThrow();
    }
  });
});

describe("복사본 · 범위 끝", () => {
  it("단원 시작 복사본은 12절 머리의 판정 키를 그 단계 구간 값으로 풀어 담고 없는 키는 던진다", () => {
    const snap = unitSnapshotOf(read(loadable), "reading", 1);
    expect(snap["unit.regular_lessons"]).toBe(
      loadable["unit.regular_lessons.1-3"],
    );
    expect(snap["unit.min_days"]).toBe(loadable["unit.min_days.1-3"]);
    expect(snap["unit.vocab_mastery"]).toBe(loadable["unit.vocab_mastery"]);
    expect(snap["level.pass_score"]).toBe(loadable["level.pass_score"]);
    expect(snap["talk.known_days"]).toBe(loadable["talk.known_days"]);
    expect(Object.keys(snap).sort()).toEqual(
      [
        "unit.regular_lessons",
        "unit.new_words_per_lesson",
        "unit.min_lessons",
        "unit.min_days",
        "unit.vocab_count",
        "unit.max_remedial",
        "unit.vocab_mastery",
        "unit.recent_score",
        "unit.recent_window",
        "unit.remedial_batch",
        "unit.parent_decision_days",
        "level.test_items",
        "level.test_items_per_session",
        "level.pass_score",
        "level.remedial_before_retest",
        "level.test_forms",
        "level.retest_gap_days",
        "level.near_pass_gap",
        "talk.said_ratio",
        "talk.known_days",
      ].sort(),
    );
    // 4-6 구간은 그 구간 키
    const mid = unitSnapshotOf(read(loadable), "talk", 5);
    expect(mid["unit.min_days"]).toBe(loadable["unit.min_days.4-6"]);
    const { "unit.vocab_mastery": _drop, ...missing } = loadable;
    expect(() => unitSnapshotOf(read(missing), "reading", 1)).toThrow(
      /unit\.vocab_mastery/,
    );
  });

  it("배치 복사본은 placement.* 아홉 키다", () => {
    const snap = placementSnapshotOf(read(testSettingValues()));
    expect(snap).toEqual({
      "placement.start_level": TEST_SETTINGS["placement.start_level"].value,
      "placement.items_per_level":
        TEST_SETTINGS["placement.items_per_level"].value,
      "placement.items_per_area":
        TEST_SETTINGS["placement.items_per_area"].value,
      "placement.retest_months": TEST_SETTINGS["placement.retest_months"].value,
      "placement.recommend_up": TEST_SETTINGS["placement.recommend_up"].value,
      "placement.recommend_down":
        TEST_SETTINGS["placement.recommend_down"].value,
      "placement.repeat_pass": TEST_SETTINGS["placement.repeat_pass"].value,
      "placement.repeat_tries": TEST_SETTINGS["placement.repeat_tries"].value,
      "placement.target_minutes":
        TEST_SETTINGS["placement.target_minutes"].value,
    });
  });

  it("범위 끝 알림은 단계가 seed.complete_through_level − seed.range_end_alert_margin 이상일 때다", () => {
    expect(rangeEndAlertDue(THROUGH - MARGIN, THROUGH, MARGIN)).toBe(true);
    expect(rangeEndAlertDue(THROUGH, THROUGH, MARGIN)).toBe(true);
    expect(rangeEndAlertDue(THROUGH - MARGIN - 1, THROUGH, MARGIN)).toBe(false);
  });
});

describe("입력 규칙", () => {
  it("PIN 은 PIN_LENGTH 자리 숫자만, 이름은 NAME_MAX_LENGTH 까지, 아바타 · 묶음은 목록 안, 시작 단계는 1~through 이다", () => {
    const ok = checkFirstRunInput(input(), { through: THROUGH });
    expect(ok.ok).toBe(true);
    const bad: unknown[] = [
      input({ pin: "1".repeat(PIN_LENGTH - 1) }),
      input({ pin: `${"1".repeat(PIN_LENGTH - 1)}a` }),
      input({ pin: "1".repeat(PIN_LENGTH + 1) }),
      input({ displayName: " " }),
      input({ displayName: "모".repeat(NAME_MAX_LENGTH + 1) }),
      input({ englishName: "Mo mo!" }),
      input({ englishName: "" }),
      { ...input(), avatar: "no-such" },
      { ...input(), topicBundle: "9" },
      input({ startLevels: { reading: THROUGH + 1 } }),
      input({ startLevels: { reading: 0 } }),
      // 알파벳 모름이면 읽기 · 쓰기 칸은 고를 수 없다
      input({ alphabetUnknown: true, startLevels: { writing: 1 } }),
      { ...input(), extra: 1 },
      null,
    ];
    for (const value of bad) {
      expect(checkFirstRunInput(value, { through: THROUGH }).ok).toBe(false);
    }
    // 앞뒤 빈칸은 잘라 받는다
    const trimmed = checkFirstRunInput(
      input({ displayName: " 모모 ", englishName: " Momo " }),
      { through: THROUGH },
    );
    expect(trimmed.ok && trimmed.value.displayName).toBe("모모");
    expect(trimmed.ok && trimmed.value.englishName).toBe("Momo");
  });

  it("영어 이름의 vocab 확인 조각은 이름 전체와 띄어쓰기 · 붙임표 조각(소문자)이다", () => {
    expect(englishNamePieces("Tori")).toEqual(["tori"]);
    expect(englishNamePieces("Mo-Tori Kim")).toEqual([
      "mo-tori kim",
      "mo",
      "tori",
      "kim",
    ]);
  });

  it("시작 단계 예시 줄은 can-do 문장 끝 '수 있다'를 '수 있어요'로 바꾼다", () => {
    expect(canDoExample("55~80단어 이야기를 읽고 답할 수 있다.")).toBe(
      "55~80단어 이야기를 읽고 답할 수 있어요",
    );
    expect(canDoExample(" 짧은 말을 들을 수 있다 ")).toBe(
      "짧은 말을 들을 수 있어요",
    );
    expect(canDoExample("그림을 보고 고른다")).toBe("그림을 보고 고른다");
  });
});

describe("집 행 만들기", () => {
  const values: Record<string, unknown> = {
    ...loadable,
    "seed.complete_through_level": THROUGH,
  };
  const ctx = {
    profileId: "00000000-0000-4000-8000-000000000001",
    values,
    seedRevision: 7,
    settingsVersion: 100,
    now: NOW,
  };

  it("집 행: 프로필 하나 · 트랙 넷 · 고른 영역 설정 행 · 단원 든 영역의 unit_progress · 사건 · 알림을 같은 시각으로 만든다", () => {
    const rows = householdRowsOf(
      input({
        startLevels: { reading: 2, speaking: CAP + 1 },
        mic: {
          result: "failed",
          code: "not-allowed",
          browser: "iPad Safari 26.1",
        },
      }),
      ctx,
    );
    expect(rows.profile).toMatchObject({
      id: ctx.profileId,
      displayName: "모모",
      englishName: "Momo",
      avatar: AVATARS[0].id,
      topicBundle: TOPIC_BUNDLES[0].id,
      alphabetStart: false,
      noticesSeen: {},
    });
    expect(rows.profile).not.toHaveProperty("toriNickname");
    expect(rows.tracks.map((t) => t.area)).toEqual([...AREAS]);
    const track = (area: string) => rows.tracks.find((t) => t.area === area);
    expect(track("reading")).toMatchObject({
      level: 2,
      unit: 1,
      chosenStartLevel: 2,
    });
    expect(track("writing")).toMatchObject({
      level: null,
      unit: null,
      chosenStartLevel: null,
    });
    expect(track("talk")).toMatchObject({
      level: CAP,
      unit: 1,
      chosenStartLevel: null,
    });
    // 고른 영역만 프로필 설정 행(C61 (2)), 설정 판은 가장 큰 판 다음부터
    expect(rows.profileSettings).toEqual([
      {
        key: "profile.start_level.reading",
        scope: "profile",
        profileId: ctx.profileId,
        value: 2,
        version: 101,
      },
      {
        key: "profile.start_level.speaking",
        scope: "profile",
        profileId: ctx.profileId,
        value: CAP + 1,
        version: 102,
      },
    ]);
    expect(rows.unitProgress.map((u) => [u.area, u.level, u.unit])).toEqual([
      ["reading", 2, 1],
      ["speaking", CAP + 1, 1],
      ["talk", CAP, 1],
    ]);
    for (const u of rows.unitProgress) {
      expect(u).toMatchObject({
        profileId: ctx.profileId,
        round: 1,
        startedAt: NOW,
        startRevision: 7,
        settingsVersion: 102,
      });
      expect(u.settingsSnapshot).toEqual(
        unitSnapshotOf(read(values), u.area, u.level),
      );
    }
    expect(
      rows.events.map((e) => [e.kind, e.actor, e.target, e.newValue]),
    ).toEqual([
      [
        "parent_adjustment",
        "parent",
        { area: "reading", source: "first_run" },
        { level: 2, unit: 1 },
      ],
      [
        "parent_adjustment",
        "parent",
        { area: "speaking", source: "first_run" },
        { level: CAP + 1, unit: 1 },
      ],
      [
        "auto_judgement",
        "app",
        { area: "talk", source: "speaking_start" },
        { level: CAP, unit: 1 },
      ],
    ]);
    // 마이크 알림 하나 + 범위 끝(through 6 − margin 1 = 5 이상) 말하기 5단계
    expect(rows.alerts.map((a) => [a.kind, a.thresholdKey, a.value])).toEqual([
      [
        "mic_unavailable",
        null,
        { browser: "iPad Safari 26.1", code: "not-allowed" },
      ],
      [
        "seed_range_end_near",
        "seed.range_end_alert_margin:speaking",
        { level: CAP + 1, through: THROUGH },
      ],
    ]);
    for (const a of rows.alerts) {
      expect(a).toMatchObject({
        profileId: ctx.profileId,
        createdAt: NOW,
        // 학습일은 app.timezone · app.day_start_hour 로(10시는 그날)
        learningDay: "2026-10-17",
      });
    }
  });

  it("집 행: 별명은 있을 때만, 마이크 확인 안 함 · 끊김은 알림이 없다, 알파벳 모름은 사건 source 가 first_run_alphabet 이다", () => {
    const rows = householdRowsOf(
      input({
        alphabetUnknown: true,
        toriNickname: "Bori",
        mic: { result: "not_checked" },
      }),
      ctx,
    );
    expect(rows.profile).toMatchObject({
      alphabetStart: true,
      toriNickname: "Bori",
    });
    expect(rows.alerts.filter((a) => a.kind === "mic_unavailable")).toEqual([]);
    expect(rows.events.map((e) => e.target)).toEqual([
      { area: "reading", source: "first_run_alphabet" },
      { area: "writing", source: "first_run_alphabet" },
    ]);
    expect(rows.profileSettings).toEqual([]);
    expect(rows.unitProgress.map((u) => [u.area, u.unit])).toEqual([
      ["reading", 0],
      ["writing", 0],
    ]);
  });

  it("첫 실행이 읽는 설정 키 목록에 행 만들기가 읽는 키가 모두 있다", () => {
    const keys = new Set(firstRunSettingKeys());
    const seen = new Set<string>();
    const tracking = (key: string) => {
      seen.add(key);
      return values[key];
    };
    householdRowsOf(
      input({ startLevels: { reading: 1, writing: 4, speaking: 6, talk: 2 } }),
      {
        ...ctx,
        values: new Proxy(values, { get: (_t, k) => tracking(String(k)) }),
      },
    );
    for (const key of seen) expect(keys.has(key), key).toBe(true);
  });
});

describe("마이크 결과 칸", () => {
  it("마이크 확인 실패의 코드 · 브라우저 글은 저장을 막지 않고 MIC_CODE_MAX · MIC_BROWSER_MAX 까지 잘라 받는다", () => {
    const checked = checkFirstRunInput(
      input({
        mic: {
          result: "failed",
          code: "x".repeat(MIC_CODE_MAX + 10),
          browser: "y".repeat(MIC_BROWSER_MAX + 10),
        },
      }),
      { through: THROUGH },
    );
    expect(checked.ok).toBe(true);
    if (!checked.ok || checked.value.mic.result !== "failed") {
      throw new Error("failed 꼴이어야 한다");
    }
    expect(checked.value.mic.code).toHaveLength(MIC_CODE_MAX);
    expect(checked.value.mic.browser).toHaveLength(MIC_BROWSER_MAX);
  });
});
