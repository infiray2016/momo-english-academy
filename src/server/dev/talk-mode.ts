import "server-only";
// 개발용 회화 방식 전환 쪽(/dev/talk-mode — 회화 Claude 주도 plan 묶음 D · spec FR-13 · 정본 AC-26o · 13절 C238 (5))의 값 읽기 · 쓰기.
// 요청자가 수업과 수업 사이에 회화의 두 방식(app 기존 방식 · claude 새 방식)을 직접 바꿔 견주게 한다. 진행 중인 수업은 처음 스냅숏의
// leadMode 그대로 가고(lead-mode.ts), 새로 여는 수업부터 바뀐 값을 읽는다.
// - 서버 액션 둘(readTalkMode · changeTalkMode)은 함수 안 지시 'use server' 이고 첫 문장이 requireAccess() 다(쿠키 없으면 401). 쪽(page.preview.tsx)이
//   본체에 넘긴다 — 이 파일은 순수 꼴 · 가짜 저장소 시험을 위해 파일 지시를 두지 않는다.
// - 운영 배포(VERCEL_ENV=production)면 읽지도 쓰지도 않는다(쪽이 운영 빌드에 없는 것에 더한 깊이 방어 — previewToolsAllowed).
// - talk.lead_mode 한 키의 집 행(profile_id 빈 행)만, app · claude 두 값만 쓴다. 바꿀 때 설정 판을 settings 전체 최대 판 + 1 로 올리고
//   settings_history 에 한 줄 남긴다(5절 · 12절 머리 — 시드 적재와 같은 꼴). 같은 값이면 쓰지 않는다. 다른 설정 행은 건드리지 않는다.
// DB 오류는 이름 · 코드만 담아 다시 던진다(safeDbError).
import { and, eq, isNull, max } from "drizzle-orm";
import { z } from "zod";
import {
  TALK_LEAD_MODE_KEY,
  TALK_LEAD_MODES,
  type TalkLeadMode,
} from "@/core/conversation/lead-mode";
import { settings, settingsHistory } from "@/db/schema/operations";
import { requireAccess } from "@/server/access/guard";
import { now as clockNow } from "@/server/clock";
import { type Db, getDb } from "@/server/db";
import { safeDbError } from "@/server/db/safe-error";
import { previewToolsAllowed } from "@/server/preview";

/** settings_history.source 의 개발용 전환 쪽 값(시드 적재 seed_load 와 가른다). */
export const TALK_MODE_HISTORY_SOURCE = "dev_talk_mode";

const talkLeadModeSchema = z.enum(TALK_LEAD_MODES);

type Env = Readonly<Record<string, string | undefined>>;

export type TalkModeRead =
  | { ok: true; mode: TalkLeadMode }
  | { ok: false; reason: "not-allowed" | "missing" | "invalid" };

export type TalkModeOutcome =
  | { ok: true; mode: TalkLeadMode; changed: boolean }
  | { ok: false; reason: "not-allowed" | "invalid-input" | "missing" };

export type TalkModeHistoryRow = {
  key: string;
  profileId: null;
  oldValue: unknown;
  newValue: TalkLeadMode;
  changedAt: Date;
  appliesFrom: null;
  source: string;
};

export type TalkModeChange =
  | { kind: "same" }
  | { kind: "missing" }
  | {
      kind: "change";
      key: string;
      value: TalkLeadMode;
      version: number;
      history: TalkModeHistoryRow;
    };

/** 한 트랜잭션 안의 일: 집 행 읽기 · settings 전체 최대 판 · 바꾸기 쓰기. */
export type TalkModeTx = {
  readValue(): Promise<{ value: unknown } | undefined>;
  maxVersion(): Promise<number>;
  write(change: Extract<TalkModeChange, { kind: "change" }>): Promise<void>;
};

export type TalkModeStore = {
  transaction<T>(fn: (tx: TalkModeTx) => Promise<T>): Promise<T>;
};

/** 바꿀 값: app · claude 두 글만 받는다(그 밖은 null). */
export function talkModeInputOf(input: unknown): TalkLeadMode | null {
  const parsed = talkLeadModeSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

/** 바꾸기 계획(순수): 행이 없으면 missing, 같은 값이면 same, 아니면 전체 최대 판 + 1 과 변경 기록 한 줄. */
export function talkModeChangeOf({
  current,
  next,
  maxVersion,
  at,
}: {
  current: { value: unknown } | undefined;
  next: TalkLeadMode;
  maxVersion: number;
  at: Date;
}): TalkModeChange {
  if (current === undefined) return { kind: "missing" };
  if (current.value === next) return { kind: "same" };
  return {
    kind: "change",
    key: TALK_LEAD_MODE_KEY,
    value: next,
    version: maxVersion + 1,
    history: {
      key: TALK_LEAD_MODE_KEY,
      profileId: null,
      oldValue: current.value,
      newValue: next,
      changedAt: at,
      appliesFrom: null,
      source: TALK_MODE_HISTORY_SOURCE,
    },
  };
}

const householdRow = and(
  eq(settings.key, TALK_LEAD_MODE_KEY),
  isNull(settings.profileId),
);

/** Drizzle 저장소: 트랜잭션 하나에서 집 행을 잠가 읽고 바꾼다(같은 키를 함께 바꾸는 두 요청이 같은 판을 받지 않게). */
export function dbTalkModeStore(db: Db = getDb()): TalkModeStore {
  return {
    async transaction(fn) {
      try {
        return await db.transaction((tx) =>
          fn({
            async readValue() {
              const [row] = await tx
                .select({ value: settings.value })
                .from(settings)
                .where(householdRow)
                .limit(1)
                .for("update");
              return row;
            },
            async maxVersion() {
              const [row] = await tx
                .select({ v: max(settings.version) })
                .from(settings);
              return Number(row?.v ?? 0);
            },
            async write(change) {
              await tx
                .update(settings)
                .set({ value: change.value, version: change.version })
                .where(householdRow);
              await tx.insert(settingsHistory).values(change.history);
            },
          }),
        );
      } catch (error) {
        throw safeDbError(error);
      }
    },
  };
}

type ReadDeps = { env?: Env; store?: TalkModeStore };
type ChangeDeps = ReadDeps & { now?: () => Date };

/** 지금 값 읽기(몸). 운영 배포면 not-allowed, 집 행이 없으면 missing, 두 값 밖이면 invalid. */
export async function readTalkModeFor({
  env = process.env,
  store,
}: ReadDeps = {}): Promise<TalkModeRead> {
  if (!previewToolsAllowed(env)) return { ok: false, reason: "not-allowed" };
  const row = await (store ?? dbTalkModeStore()).transaction((tx) =>
    tx.readValue(),
  );
  if (row === undefined) return { ok: false, reason: "missing" };
  const parsed = talkLeadModeSchema.safeParse(row.value);
  return parsed.success
    ? { ok: true, mode: parsed.data }
    : { ok: false, reason: "invalid" };
}

/** 값 바꾸기(몸). 운영 배포면 not-allowed, 두 값 밖이면 invalid-input, 집 행이 없으면 missing. */
export async function changeTalkModeFor(
  input: unknown,
  { env = process.env, store, now = clockNow }: ChangeDeps = {},
): Promise<TalkModeOutcome> {
  if (!previewToolsAllowed(env)) return { ok: false, reason: "not-allowed" };
  const next = talkModeInputOf(input);
  if (next === null) return { ok: false, reason: "invalid-input" };
  return (store ?? dbTalkModeStore()).transaction(async (tx) => {
    const change = talkModeChangeOf({
      current: await tx.readValue(),
      next,
      maxVersion: await tx.maxVersion(),
      at: now(),
    });
    if (change.kind === "missing") return { ok: false, reason: "missing" };
    if (change.kind === "same") return { ok: true, mode: next, changed: false };
    await tx.write(change);
    return { ok: true, mode: next, changed: true };
  });
}

/** 서버 액션: 지금 값 읽기. */
export async function readTalkMode(): Promise<TalkModeRead> {
  "use server";
  await requireAccess();
  return readTalkModeFor();
}

/** 서버 액션: app · claude 가운데 하나로 바꾸기. 입력 검사는 몸이 한다. */
export async function changeTalkMode(input: unknown): Promise<TalkModeOutcome> {
  "use server";
  await requireAccess();
  return changeTalkModeFor(input);
}
