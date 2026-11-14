import "server-only";
// AI 호출 기록 · 단가표 읽기 · 하루 사용량 · 같은 오류 세기 · 알림 한 번(6.1 · 5절 · C17 · C56 (2) · C63 (3), plan-p09a 파일별 값 8).
// 시각은 부르는 쪽이 한 시계 값으로 넘긴다. 질의 SQL 안에 now() 를 쓰지 않는다(P3a 검토 메모).
// 프롬프트 · 응답 본문은 저장하지 않는다(5절 · AC-8c).
import { and, count, eq, isNull, like, ne, or, sql } from "drizzle-orm";
import type { AiPurpose } from "@/core/ai/combo";
import { ModelCapabilitiesSchema } from "@/core/ai/combo";
import {
  type PriceBook,
  type PriceRowLike,
  priceBookOf,
  sumToMicros,
} from "@/core/ai/cost";
import {
  LEAD_NARROW_RECORD_TAG,
  LEAD_RECORD_TAG,
  TALK_CHAT_RECORD_TAG,
} from "@/core/conversation/lead-call-tags";
import { modelPrices } from "@/db/schema/content";
import { aiCalls, parentAlerts } from "@/db/schema/operations";
import type { Db } from "@/server/db";

/** 같은 오류 갈래의 error_code 머리(값 6). LIKE 의 '_' 는 한 글자 와일드카드라 백슬래시로 이스케이프해 글자 그대로 맞춘다(검토 M-5). */
const SAME_ERROR_CODE_PATTERN = "same\\_error:%";
/**
 * 새 회화 엔진의 표지(lead · lead.narrow — '<표지>:<갈래>')를 앞에 단 같은 오류 행도 같은 갈래로 센다(13절 C241 보완 · 검토 rev-s1 I-4). 표지는
 * 방식별로 셀 몫이라 갈래의 열쇠에 섞지 않는다. 그 밖의 표지(질문 다시 쓰기 question_retry)를 단 행은 지금처럼 세지 않는다(지금 엔진의 셈 그대로).
 * 이야기 방식 대화 호출의 표지(chat)도 같다(spec '회화 대화 구조 R' 설계 2 — 지금 엔진의 실패와 같은 오류로 세어 알림이 그대로 걸림, 묶음 S0).
 */
const LEAD_SAME_ERROR_CODE_PATTERNS = [
  LEAD_RECORD_TAG,
  LEAD_NARROW_RECORD_TAG,
  TALK_CHAT_RECORD_TAG,
].map((tag) => `${tag}:${SAME_ERROR_CODE_PATTERN}`);

/** 같은 오류로 세는 error_code 꼴 전부(표지 없는 꼴 + 표지를 단 꼴, LIKE 글). */
export const SAME_ERROR_CODE_PATTERNS: readonly string[] = [
  SAME_ERROR_CODE_PATTERN,
  ...LEAD_SAME_ERROR_CODE_PATTERNS,
];

/**
 * ai.down_after_failures 셈(같은 오류 알림 · 1-나의 이어진 실패 수) 밖의 목적: 기록 전용 평가 호출(talk_chat_eval)은 실패를 넣지 않고, 성공이 다른
 * 목적(대화 호출)의 셈을 끊지도 않는다(spec '회화 대화 구조 R' 설계 8-2 · M-9 · 우려 8, 묶음 S0). 셈은 목적별이라 그 목적의 셈만 늘 0 이다.
 */
const DOWN_COUNT_EXCLUDED_PURPOSES: readonly AiPurpose[] = ["talk_chat_eval"];

/**
 * 이 목적의 호출이 ai.down_after_failures 셈에 드는가(목적 판단 — 실패 갈래 판단 core/ai/failure 의 countsTowardDown 과 다른 함수, 검토 rev-chat-s0 M-2).
 * 평가 호출은 같은 오류 알림도 세지 않는다(spec 8-2 '셈 밖'을 넓게 읽음 — 평가 호출의 설정 오류는 켜기 전 관문이 비교 기록의 판정 없음 수와 까닭으로 본다).
 */
export function purposeCountsTowardDown(purpose: AiPurpose): boolean {
  return !DOWN_COUNT_EXCLUDED_PURPOSES.includes(purpose);
}

export type AiCallStatus = (typeof aiCalls.$inferInsert)["status"];

/** ai_calls 한 행(6.1 · C56 (2) · C63 (3) 의 열). costUsd 는 소수 여섯 자리 글, errorCode 는 값 6. */
export type AiCallRow = {
  profileId: string | null;
  sessionId: string | null;
  calledAt: Date;
  learningDay: string;
  purpose: AiPurpose;
  requestedModel: string;
  answeredModel: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  costUsd: string;
  priceMissing: boolean;
  latencyMs: number | null;
  firstSentenceMs?: number | null;
  status: AiCallStatus;
  errorCode: string | null;
};

/** 시도 하나 = 한 행. 넣은 행의 id 를 돌려준다. */
export async function insertAiCall(db: Db, row: AiCallRow): Promise<string> {
  const [inserted] = await db
    .insert(aiCalls)
    .values({
      profileId: row.profileId,
      sessionId: row.sessionId,
      calledAt: row.calledAt,
      learningDay: row.learningDay,
      purpose: row.purpose,
      requestedModel: row.requestedModel,
      answeredModel: row.answeredModel,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      cacheWriteTokens: row.cacheWriteTokens,
      cacheReadTokens: row.cacheReadTokens,
      costUsd: row.costUsd,
      priceMissing: row.priceMissing,
      latencyMs: row.latencyMs,
      firstSentenceMs: row.firstSentenceMs ?? null,
      status: row.status,
      errorCode: row.errorCode,
    })
    .returning({ id: aiCalls.id });
  if (!inserted) throw new Error("ai_calls 행을 넣지 못했다");
  return inserted.id;
}

/**
 * model_prices 줄을 모두 읽고(여남은 줄) capabilities 를 규격으로 검증해 그날 쓰는 단가표를 만든다.
 * 조합 칸이 어긋난 모델은 그 모델의 줄을 모두 빼고 서버 경고를 남긴다. 날짜 고르기는 priceBookOf 하나다(SQL 에 두지 않는다).
 * onDay 는 호출의 학습일(위험 7).
 */
export async function loadPriceBook(db: Db, onDay: string): Promise<PriceBook> {
  const rows = await db
    .select({
      model: modelPrices.model,
      effectiveFrom: modelPrices.effectiveFrom,
      inputUsd: modelPrices.inputUsdPerMtok,
      outputUsd: modelPrices.outputUsdPerMtok,
      cacheWriteUsd: modelPrices.cacheWriteUsdPerMtok,
      cacheReadUsd: modelPrices.cacheReadUsdPerMtok,
      capabilities: modelPrices.capabilities,
    })
    .from(modelPrices);

  const broken = new Set<string>();
  const valid: PriceRowLike[] = [];
  for (const { capabilities, ...row } of rows) {
    const caps = ModelCapabilitiesSchema.safeParse(capabilities);
    if (!caps.success) {
      broken.add(row.model);
      continue;
    }
    valid.push({ ...row, caps: caps.data });
  }
  for (const model of broken) {
    console.warn(
      `[ai] model_prices 의 조합 칸이 규격에 맞지 않아 그 모델 줄을 뺀다: ${model}`,
    );
  }
  return priceBookOf(
    valid.filter((row) => !broken.has(row.model)),
    onDay,
  );
}

export type DailyUsage = { profileCalls: number; householdCostMicros: number };

/**
 * 같은 학습일 · 확인 호출 밖의 하루 사용량(6.1). 호출 수는 그 프로필 행 가운데 안전 상한(safety_cap) 밖
 * (막힌 호출은 부른 것이 아니다), 비용은 집 전체 합. 한 질의.
 */
export async function dailyUsage(
  db: Db,
  // null 이면 호출 수 0 — 확인 호출 · 프로필 없는 호출(SQL 의 = NULL 은 참이 되지 않는다). 비용 합은 그대로 집 전체
  { profileId, learningDay }: { profileId: string | null; learningDay: string },
): Promise<DailyUsage> {
  const [row] = await db
    .select({
      profileCalls:
        sql<number>`count(*) filter (where ${aiCalls.profileId} = ${profileId} and ${aiCalls.status} <> 'safety_cap')`.mapWith(
          Number,
        ),
      householdCost: sql<string | null>`sum(${aiCalls.costUsd})::text`,
    })
    .from(aiCalls)
    .where(
      and(eq(aiCalls.learningDay, learningDay), ne(aiCalls.purpose, "probe")),
    );
  return {
    profileCalls: row?.profileCalls ?? 0,
    householdCostMicros: sumToMicros(row?.householdCost ?? null),
  };
}

/** 같은 목적 · 학습일의 '다시 보내도 같은 오류' 행 수(C17). */
export async function sameErrorCount(
  db: Db,
  { purpose, learningDay }: { purpose: AiPurpose; learningDay: string },
): Promise<number> {
  if (!purposeCountsTowardDown(purpose)) return 0;
  const [row] = await db
    .select({ n: count() })
    .from(aiCalls)
    .where(
      and(
        eq(aiCalls.purpose, purpose),
        eq(aiCalls.learningDay, learningDay),
        eq(aiCalls.status, "error"),
        or(
          like(aiCalls.errorCode, SAME_ERROR_CODE_PATTERN),
          ...LEAD_SAME_ERROR_CODE_PATTERNS.map((pattern) =>
            like(aiCalls.errorCode, pattern),
          ),
        ),
      ),
    );
  return row?.n ?? 0;
}

export type AlertOnce = {
  kind: string;
  /** 집 전체 알림이면 null. */
  profileId: string | null;
  thresholdKey: string | null;
  learningDay: string;
  /** 없거나 null 이면 SQL NULL 로 둔다(JSON null 을 뜻으로 쓰지 않는다, P3a 메모). */
  value?: unknown;
  createdAt: Date;
  /** day: (종류, 프로필, 기준 키, 학습일)마다 한 번. key: (종류, 프로필, 기준 키)마다 한 번(달은 기준 키에 넣는다). */
  once: "day" | "key";
};

/**
 * 알림을 한 번만 만든다. 한 트랜잭션에서 (종류 · 프로필 · 기준 키) 자문 잠금을 잡고, 같은 행이 없을 때만 넣는다.
 * 넣었으면 true. 1-가는 '호출 설정 확인 필요'(P9c, day)만 쓰고, 달마다 한 번인 알림(1-나)은 key 로 쓴다.
 */
export async function createAlertOnce(
  db: Db,
  {
    kind,
    profileId,
    thresholdKey,
    learningDay,
    value,
    createdAt,
    once,
  }: AlertOnce,
): Promise<boolean> {
  const lockKey = JSON.stringify([kind, profileId, thresholdKey]);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
    const [existing] = await tx
      .select({ id: parentAlerts.id })
      .from(parentAlerts)
      .where(
        and(
          eq(parentAlerts.kind, kind),
          profileId === null
            ? isNull(parentAlerts.profileId)
            : eq(parentAlerts.profileId, profileId),
          thresholdKey === null
            ? isNull(parentAlerts.thresholdKey)
            : eq(parentAlerts.thresholdKey, thresholdKey),
          once === "day"
            ? eq(parentAlerts.learningDay, learningDay)
            : undefined,
        ),
      )
      .limit(1);
    if (existing) return false;
    await tx.insert(parentAlerts).values({
      kind,
      profileId,
      thresholdKey,
      learningDay,
      createdAt,
      ...(value === undefined || value === null ? {} : { value }),
    });
    return true;
  });
}
