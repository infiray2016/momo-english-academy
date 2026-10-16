import "server-only";

// 가족 접근 코드 제출: IP 마다 실패 세기 · 잠금 · 하루 지난 IP 행 지우기(10절 · 5절 parent_auth, plan-p03b 파일별 값 3, C56 (3)).
// 시각은 부르는 쪽이 한 시계 값(now)으로 넘기고, 질의 SQL 안에서 현재 시각 함수를 쓰지 않는다(매개변수로 넘긴다).
import { and, eq, lt } from "drizzle-orm";
import { z } from "zod";
import {
  accessKeyMaterial,
  decodeAccessCodeHash,
  hashIp,
  issueAccessToken,
} from "@/core/access-token";
import { parentAuth } from "@/db/schema/operations";
import { verifyAccessCode } from "@/server/access/code";
import { type Db, getDb } from "@/server/db";
import { getSettings } from "@/server/settings";

/** 5절 'IP 는 해시로 두고 하루 뒤 지운다'. 개인정보 고정 규칙이라 이름 붙인 상수다(C57). */
export const ACCESS_IP_RETENTION_MS = 24 * 60 * 60 * 1000;
const SECONDS_PER_DAY = 24 * 60 * 60;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * 1000;
/** 쿠키 토큰 난수 바이트 수(기술 값). */
const NONCE_BYTES = 16;

const positiveInt = z.number().int().positive();
const SETTING_SCHEMAS = {
  "access.cookie_days": positiveInt,
  "parent.pin_max_attempts": positiveInt,
  "parent.lock_minutes": positiveInt,
};

export type SubmitResult =
  | { kind: "ok"; token: string; maxAgeSeconds: number }
  | { kind: "wrong" }
  | { kind: "locked"; retryAfterSeconds: number }
  | { kind: "not_configured" };

/**
 * 접근 코드를 확인한다. 키 재료가 없거나 풀리지 않으면 DB 를 건드리지 않고 not_configured(실패로 세지 않는다).
 * 설정 행이 없으면 SettingMissingError 가 그대로 나간다(제출 끝점이 503 으로 바꾼다).
 */
export async function submitAccessCode({
  code,
  ip,
  now,
  db,
  env = process.env,
}: {
  code: string;
  ip: string;
  now: Date;
  db?: Db;
  env?: Readonly<Record<string, string | undefined>>;
}): Promise<SubmitResult> {
  const keyMaterial = accessKeyMaterial(env);
  if (!keyMaterial || !decodeAccessCodeHash(keyMaterial)) {
    return { kind: "not_configured" };
  }
  const conn = db ?? getDb();
  const settings = await getSettings(SETTING_SCHEMAS, { db: conn });
  const ipHash = await hashIp(ip, keyMaterial);
  const nowMs = now.getTime();

  return conn.transaction(async (tx) => {
    // (가) 하루 지난 IP 행을 지운다
    await tx
      .delete(parentAuth)
      .where(
        and(
          eq(parentAuth.kind, "access_ip"),
          lt(parentAuth.updatedAt, new Date(nowMs - ACCESS_IP_RETENTION_MS)),
        ),
      );
    // (나) 그 IP 행을 넣되 이미 있으면 그대로 둔다. (다) 그 행을 잠그고 읽는다(같은 IP 의 동시 제출은 줄을 선다)
    const lockRow = async () => {
      await tx
        .insert(parentAuth)
        .values({ kind: "access_ip", ipHash, failedCount: 0, updatedAt: now })
        .onConflictDoNothing({ target: parentAuth.ipHash });
      const [locked] = await tx
        .select({
          id: parentAuth.id,
          failedCount: parentAuth.failedCount,
          lockedUntil: parentAuth.lockedUntil,
        })
        .from(parentAuth)
        .where(eq(parentAuth.ipHash, ipHash))
        .for("update");
      return locked;
    };
    // 앞에 줄 선 제출이 맞는 코드로 행을 지우고 끝나면 FOR UPDATE 가 0행을 받는다. 그때는 행을 새로 넣고 한 번 더 한다(검토 M-3)
    const row = (await lockRow()) ?? (await lockRow());
    if (!row) throw new Error("접근 코드 IP 행을 읽지 못했습니다");

    // (라) 잠겨 있으면 코드를 보지 않는다
    const lockedUntilMs = row.lockedUntil?.getTime();
    if (lockedUntilMs !== undefined && lockedUntilMs > nowMs) {
      return {
        kind: "locked",
        retryAfterSeconds: Math.ceil((lockedUntilMs - nowMs) / MS_PER_SECOND),
      };
    }

    // (마) 맞으면 행을 지우고 토큰을 준다
    if (await verifyAccessCode(code, keyMaterial)) {
      await tx.delete(parentAuth).where(eq(parentAuth.id, row.id));
      const maxAgeSeconds = settings["access.cookie_days"] * SECONDS_PER_DAY;
      const token = await issueAccessToken({
        keyMaterial,
        now,
        ttlSeconds: maxAgeSeconds,
        nonce: crypto.getRandomValues(new Uint8Array(NONCE_BYTES)),
      });
      return { kind: "ok", token, maxAgeSeconds };
    }

    // (바) 틀리면 센다. 잠금이 지난 행이면 0 부터
    const lockExpired = lockedUntilMs !== undefined;
    const failures = (lockExpired ? 0 : row.failedCount) + 1;
    if (failures >= settings["parent.pin_max_attempts"]) {
      const lockMs = settings["parent.lock_minutes"] * MS_PER_MINUTE;
      await tx
        .update(parentAuth)
        .set({
          failedCount: 0,
          lockedUntil: new Date(nowMs + lockMs),
          updatedAt: now,
        })
        .where(eq(parentAuth.id, row.id));
      return {
        kind: "locked",
        retryAfterSeconds: Math.ceil(lockMs / MS_PER_SECOND),
      };
    }
    await tx
      .update(parentAuth)
      .set({ failedCount: failures, lockedUntil: null, updatedAt: now })
      .where(eq(parentAuth.id, row.id));
    return { kind: "wrong" };
  });
}
