// 개발용 회화 방식 전환 쪽(/dev/talk-mode — 회화 Claude 주도 plan 묶음 D · spec FR-13 · 정본 AC-26o). 서버 액션은 접근 쿠키를 먼저 보고(없으면
// unauthorized() 401), 운영 배포(VERCEL_ENV=production)면 읽지도 쓰지도 않으며, talk.lead_mode 한 키에 app · claude 두 값만 쓴다.
// DB 는 가짜 저장소(설정 행 여러 개 · 변경 기록)로 바꾸고, 접근 확인은 가짜로 바꾼다(접근 확인 자체는 access-gate.test.ts 가 본다).
// 화면은 순수한 패널을 정적 HTML 로 그려 본다. 운영 빌드에서 쪽이 빠지는 것은 next-config.test.ts 의 preview.tsx 몫과 같은 길이다.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

class UnauthorizedSignal extends Error {}

const hasAccess = vi.fn(() => true);
vi.mock("@/server/access/guard", () => ({
  requireAccess: async () => {
    if (!hasAccess()) throw new UnauthorizedSignal("unauthorized");
  },
}));
const getDb = vi.fn(() => {
  throw new Error("시험에서 진짜 DB 를 열면 안 된다");
});
vi.mock("@/server/db", () => ({ getDb: () => getDb() }));

import { leadModeOf, leadModeStartField } from "@/core/conversation/lead-mode";
import { leadStartModeOf } from "@/core/conversation/lead-turn-core";
import {
  changeTalkMode,
  changeTalkModeFor,
  readTalkMode,
  readTalkModeFor,
  TALK_MODE_HISTORY_SOURCE,
  type TalkModeStore,
  talkModeChangeOf,
  talkModeInputOf,
} from "@/server/dev/talk-mode";
import {
  TALK_MODE_TEXT,
  TalkModePanel,
} from "../../src/app/dev/talk-mode/talk-mode";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const PREVIEW_ENV = { VERCEL_ENV: "preview" };
const PRODUCTION_ENV = { VERCEL_ENV: "production" };
const AT = new Date("2026-11-13T01:00:00.000Z");

type Row = {
  key: string;
  profileId: string | null;
  value: unknown;
  version: number;
};
type History = {
  key: string;
  profileId: string | null;
  oldValue: unknown;
  newValue: unknown;
  changedAt: Date;
  appliesFrom: string | null;
  source: string;
};

/** 설정 행 여러 개와 변경 기록을 가진 가짜 저장소(Drizzle 저장소와 같은 몫: 집 행 읽기 · 전체 최대 판 · 바꾸기). */
function fakeStore(rows: Row[]) {
  const history: History[] = [];
  const store: TalkModeStore = {
    transaction: async (fn) =>
      fn({
        readValue: async () => {
          const row = rows.find(
            (r) => r.key === "talk.lead_mode" && r.profileId === null,
          );
          return row ? { value: row.value } : undefined;
        },
        maxVersion: async () =>
          rows.reduce((m, r) => Math.max(m, r.version), 0),
        write: async (change) => {
          const row = rows.find(
            (r) => r.key === change.key && r.profileId === null,
          );
          if (!row) throw new Error("행이 없다");
          row.value = change.value;
          row.version = change.version;
          history.push(change.history);
        },
      }),
  };
  return { store, rows, history };
}

function seedRows(mode: unknown = "app"): Row[] {
  return [
    { key: "talk.lead_mode", profileId: null, value: mode, version: 3 },
    { key: "talk.prep_mode.1-3", profileId: null, value: "always", version: 7 },
    { key: "unit.recent_score", profileId: null, value: 80, version: 2 },
  ];
}

beforeEach(() => {
  hasAccess.mockReturnValue(true);
  getDb.mockClear();
});

describe("개발용 회화 방식 전환 서버 액션", () => {
  it("AC-26o 개발용 전환: 가족 접근 쿠키가 없으면 읽기 · 바꾸기 모두 requireAccess 의 unauthorized()(401)로 끝나고 DB 를 열지 않는다", async () => {
    hasAccess.mockReturnValue(false);
    await expect(readTalkMode()).rejects.toBeInstanceOf(UnauthorizedSignal);
    await expect(changeTalkMode("claude")).rejects.toBeInstanceOf(
      UnauthorizedSignal,
    );
    expect(getDb).not.toHaveBeenCalled();
  });

  it("AC-26o 개발용 전환: 운영 배포 환경에서는 읽기 · 바꾸기를 거절하고 저장소를 건드리지 않는다", async () => {
    const { store, rows, history } = fakeStore(seedRows("app"));
    const transaction = vi.spyOn(store, "transaction");
    expect(await readTalkModeFor({ env: PRODUCTION_ENV, store })).toEqual({
      ok: false,
      reason: "not-allowed",
    });
    expect(
      await changeTalkModeFor("claude", {
        env: PRODUCTION_ENV,
        store,
        now: () => AT,
      }),
    ).toEqual({ ok: false, reason: "not-allowed" });
    expect(transaction).not.toHaveBeenCalled();
    expect(rows[0].value).toBe("app");
    expect(history).toEqual([]);
  });

  it("AC-26o 개발용 전환: app · claude 두 값 밖(빈 값 · 대소문자 다름 · 객체 · 다른 글)은 받지 않고 아무것도 쓰지 않는다", async () => {
    for (const input of [
      undefined,
      null,
      "",
      "Claude",
      "APP",
      "auto",
      1,
      { mode: "claude" },
      ["claude"],
    ]) {
      expect(talkModeInputOf(input)).toBeNull();
      const { store, rows, history } = fakeStore(seedRows("app"));
      expect(
        await changeTalkModeFor(input, {
          env: PREVIEW_ENV,
          store,
          now: () => AT,
        }),
      ).toEqual({ ok: false, reason: "invalid-input" });
      expect(rows).toEqual(seedRows("app"));
      expect(history).toEqual([]);
    }
    expect(talkModeInputOf("app")).toBe("app");
    expect(talkModeInputOf("claude")).toBe("claude");
  });

  it("AC-26o 개발용 전환: 바꾼 뒤 읽으면 새 값이고, talk.lead_mode 행만 판이 오르며 다른 설정 행은 그대로이고 변경 기록이 하나 남는다", async () => {
    const { store, rows, history } = fakeStore(seedRows("app"));
    const deps = { env: PREVIEW_ENV, store, now: () => AT };
    expect(await readTalkModeFor(deps)).toEqual({ ok: true, mode: "app" });

    expect(await changeTalkModeFor("claude", deps)).toEqual({
      ok: true,
      mode: "claude",
      changed: true,
    });
    expect(await readTalkModeFor(deps)).toEqual({ ok: true, mode: "claude" });
    expect(rows[0]).toEqual({
      key: "talk.lead_mode",
      profileId: null,
      value: "claude",
      version: 8,
    });
    expect(rows.slice(1)).toEqual(seedRows("app").slice(1));
    expect(history).toEqual([
      {
        key: "talk.lead_mode",
        profileId: null,
        oldValue: "app",
        newValue: "claude",
        changedAt: AT,
        appliesFrom: null,
        source: TALK_MODE_HISTORY_SOURCE,
      },
    ]);

    // 되돌리기: 다시 app 으로 바꾸면 판이 하나 더 오른다
    expect(await changeTalkModeFor("app", deps)).toEqual({
      ok: true,
      mode: "app",
      changed: true,
    });
    expect(await readTalkModeFor(deps)).toEqual({ ok: true, mode: "app" });
    expect(rows[0].version).toBe(9);
    expect(history).toHaveLength(2);
  });

  it("AC-26o 개발용 전환: 이미 그 값이면 판을 올리지 않고 기록도 남기지 않으며, 집 행이 없거나 값이 두 값 밖이면 읽기가 그렇게 알린다", async () => {
    const same = fakeStore(seedRows("claude"));
    expect(
      await changeTalkModeFor("claude", {
        env: PREVIEW_ENV,
        store: same.store,
        now: () => AT,
      }),
    ).toEqual({ ok: true, mode: "claude", changed: false });
    expect(same.rows).toEqual(seedRows("claude"));
    expect(same.history).toEqual([]);

    const missing = fakeStore(seedRows().slice(1));
    expect(
      await readTalkModeFor({ env: PREVIEW_ENV, store: missing.store }),
    ).toEqual({ ok: false, reason: "missing" });
    expect(
      await changeTalkModeFor("claude", {
        env: PREVIEW_ENV,
        store: missing.store,
        now: () => AT,
      }),
    ).toEqual({ ok: false, reason: "missing" });
    expect(missing.history).toEqual([]);

    const odd = fakeStore(seedRows("auto"));
    expect(
      await readTalkModeFor({ env: PREVIEW_ENV, store: odd.store }),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("AC-26o 개발용 전환: 바꾸기 계획은 순수하다 — 같은 값이면 same, 행이 없으면 missing, 아니면 전체 최대 판 + 1 과 변경 기록 한 줄이다", () => {
    expect(
      talkModeChangeOf({
        current: { value: "app" },
        next: "app",
        maxVersion: 5,
        at: AT,
      }),
    ).toEqual({ kind: "same" });
    expect(
      talkModeChangeOf({
        current: undefined,
        next: "claude",
        maxVersion: 5,
        at: AT,
      }),
    ).toEqual({ kind: "missing" });
    expect(
      talkModeChangeOf({
        current: { value: "auto" },
        next: "claude",
        maxVersion: 5,
        at: AT,
      }),
    ).toEqual({
      kind: "change",
      key: "talk.lead_mode",
      value: "claude",
      version: 6,
      history: {
        key: "talk.lead_mode",
        profileId: null,
        oldValue: "auto",
        newValue: "claude",
        changedAt: AT,
        appliesFrom: null,
        source: TALK_MODE_HISTORY_SOURCE,
      },
    });
  });

  /**
   * 처음 스냅숏 칸(index.ts ensureLessonStarted 와 같은 식): 방식은 leadStartModeOf(설정 · 단계 구간 · 그 단원의 안내문 글 — 13절 C241 보완)가
   * 정한다. 안내문 글이 있는 단원은 지금 회화 3단계 단원 1 이다(운영 표 talkLeadTextOf 기본값).
   */
  const startFieldOf = (
    mode: "app" | "claude",
    level: number,
    unit: number,
  ) => ({
    ...leadModeStartField(leadStartModeOf({ mode, level, unit })),
  });

  it("AC-26o 개발용 전환: 바꾼 값은 새로 여는 수업(안내문 글이 있는 단원)의 처음 스냅숏 칸이 되고, 이미 열린 수업의 처음 스냅숏은 처음 값 그대로 읽힌다", async () => {
    const { store } = fakeStore(seedRows("app"));
    const deps = { env: PREVIEW_ENV, store, now: () => AT };
    // 바꾸기 전에 연 수업(app — 칸 없음)
    const openedBefore = startFieldOf("app", 3, 1);
    await changeTalkModeFor("claude", deps);
    const read = await readTalkModeFor(deps);
    if (!read.ok) throw new Error("읽기 실패");
    const openedAfter = startFieldOf(read.mode, 3, 1);
    expect(leadModeOf(openedAfter)).toBe("claude");
    expect(leadModeOf(openedBefore)).toBe("app");
  });

  it("AC-26o 개발용 전환: 값이 claude 여도 안내문 글이 없는 단원(또는 새 방식 구간 밖 단계)의 수업은 처음 스냅숏이 기존 방식(app)이다(13절 C241 보완)", async () => {
    const { store } = fakeStore(seedRows("app"));
    const deps = { env: PREVIEW_ENV, store, now: () => AT };
    await changeTalkModeFor("claude", deps);
    const read = await readTalkModeFor(deps);
    if (!read.ok) throw new Error("읽기 실패");
    expect(read.mode).toBe("claude");
    for (const [level, unit] of [
      [3, 2],
      [1, 1],
      [4, 1],
    ] as const) {
      const opened = startFieldOf(read.mode, level, unit);
      expect(opened).toEqual({});
      expect(leadModeOf(opened)).toBe("app");
    }
  });
});

const html = (props: Parameters<typeof TalkModePanel>[0]) =>
  renderToStaticMarkup(createElement(TalkModePanel, props));

describe("개발용 회화 방식 전환 화면", () => {
  it("AC-26o 개발용 전환 화면: 지금 값 · 두 값으로 바꾸는 단추 둘 · 안내 한 줄이 보이고, 지금 값의 단추는 눌리지 않는다", () => {
    const app = html({
      mode: "app",
      busy: false,
      line: null,
      onPick: () => {},
    });
    expect(app).toContain("지금 회화 방식: 기존 방식");
    expect(app).toContain(TALK_MODE_TEXT.notice);
    expect(app).toContain("새 방식으로 바꾸기");
    expect(app).toContain("기존 방식으로 바꾸기");
    expect(app).toMatch(/data-talk-mode-pick="app"[^>]*disabled=""/);
    expect(app).not.toMatch(/data-talk-mode-pick="claude"[^>]*disabled=""/);

    const claude = html({
      mode: "claude",
      busy: false,
      line: TALK_MODE_TEXT.changed,
      onPick: () => {},
    });
    expect(claude).toContain("지금 회화 방식: 새 방식");
    expect(claude).toContain(TALK_MODE_TEXT.changed);
    expect(claude).toMatch(/data-talk-mode-pick="claude"[^>]*disabled=""/);
  });

  it("AC-26o 개발용 전환 화면: 지금 값을 못 읽으면 그렇게 적고 두 단추 모두 누를 수 있다", () => {
    const unknown = html({
      mode: null,
      busy: false,
      line: null,
      onPick: () => {},
    });
    expect(unknown).toContain(TALK_MODE_TEXT.unknown);
    expect(unknown).not.toMatch(/data-talk-mode-pick="[a-z]+"[^>]*disabled=""/);
  });

  it("AC-26o 개발용 전환 쪽: 검색에 걸리지 않고(noindex), 운영 배포 빌드에서 빠지는 이름이며, 개발용 쪽 밖에서 이 쪽으로 가는 길이 없다", async () => {
    const page = await import("../../src/app/dev/talk-mode/page.preview");
    expect(page.metadata.robots).toEqual({ index: false, follow: false });

    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        return statSync(full).isDirectory() ? files(full) : [full];
      });
    const linking = files(join(REPO_ROOT, "src"))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .map((f) => relative(REPO_ROOT, f))
      .filter(
        (f) =>
          !f.startsWith(join("src", "app", "dev")) &&
          !f.startsWith(join("src", "server", "dev")),
      )
      .filter((f) =>
        readFileSync(join(REPO_ROOT, f), "utf8").includes("/dev/talk-mode"),
      );
    expect(linking).toEqual([]);
    expect(
      readdirSync(join(REPO_ROOT, "src", "app", "dev", "talk-mode")),
    ).not.toContain("page.tsx");
  });
});
