"use server";
// 시드 보기 화면의 쓰기 서버 액션(plan-p05c '서버 액션'): 6.3 표본 검토 행(AC-7f) · 6.4 사람 확인.
// 모든 함수의 첫 문장은 requireAccess() 다(NFR-5 · C57, P3b 훑기 시험). 둘째 문장이 NODE_ENV 를 본다(두 겹, 정할 것 아) —
// 이 파일은 page.local.tsx(next dev 에서만 경로)에서만 닿아 운영 묶음에 들지 않는다. 입력은 화면에서 온 그대로 받아 Zod 로 다시 본다.
// 시각은 한 시계 now() 에서만 읽는다. 오류 글에 스택 · 파일 시스템 오류 원문을 내지 않는다.
import { z } from "zod";
import {
  composeReviewMemo,
  WALKTHROUGH_IDS,
} from "@/core/seed/review-walkthrough";
import { ReviewRowSchema } from "@/core/seed/schema/records";
import { Hex64Schema, PositiveInt } from "@/core/seed/schema/reference";
import { requireAccess } from "@/server/access/guard";
import { now } from "@/server/clock";
import {
  appendReviewRow,
  assertSeedViewerLocal,
  readSeedSettings,
  reviewDateOf,
  type SeedWriteResult,
  saveHumanDecisions,
  seedViewerRoot,
} from "@/server/seed-viewer/files";

export type SaveResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const SAVED_MESSAGE = "남겼어요";
const INVALID_MESSAGE = "보낸 값이 맞지 않아요. 화면을 다시 열어 주세요";
const FAILED_MESSAGE = "남기지 못했어요. 개발 서버 터미널의 오류를 봐 주세요";

const ReviewInputSchema = z.strictObject({
  file: z.string().min(1),
  cell: z.string().min(1),
  itemNo: PositiveInt.nullable(),
  reason: ReviewRowSchema.shape.reason,
  memo: z.string(),
  walkthroughNo: z.array(z.enum(WALKTHROUGH_IDS)),
});

const HumanCheckInputSchema = z.strictObject({
  file: z.string().min(1),
  cell: z.string().min(1),
  contentHash: Hex64Schema,
  items: z
    .array(
      z.strictObject({
        no: PositiveInt,
        decision: z.enum(["correct", "fixed"]),
      }),
    )
    .min(1),
});

/** 파일 쓰기의 예외(파일 시스템 오류)는 터미널에만 남기고 화면에는 고정 글을 낸다. */
function settle(write: () => SeedWriteResult, label: string): SaveResult {
  try {
    const result = write();
    return result.ok ? { ok: true, message: SAVED_MESSAGE } : result;
  } catch (error) {
    console.error(`시드 보기 ${label} 쓰기 실패`, error);
    return { ok: false, message: FAILED_MESSAGE };
  }
}

/** 6.3 표본 검토: 칸 또는 문항 하나에 '알맞음 · 쉬움 · 어려움 · 오류'와 메모(아이 눈 순회 머리)를 한 행 남긴다. */
export async function saveReview(input: unknown): Promise<SaveResult> {
  await requireAccess();
  assertSeedViewerLocal();
  const parsed = ReviewInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: INVALID_MESSAGE };
  const { file, cell, itemNo, reason, memo, walkthroughNo } = parsed.data;
  const root = seedViewerRoot();
  return settle(() => {
    const date = reviewDateOf(now(), readSeedSettings(root));
    if (!date.ok) return date;
    return appendReviewRow(root, {
      file,
      row: {
        cell,
        itemNo,
        reason,
        memo: composeReviewMemo(walkthroughNo, memo),
        date: date.date,
      },
    });
  }, "표본 검토");
}

/** 6.4 사람 확인: 풀이 검사가 사람 확인으로 보낸 문항마다 '정답 맞음 · 고침'을 화면을 연 때의 내용 해시와 함께 남긴다. */
export async function saveHumanCheck(input: unknown): Promise<SaveResult> {
  await requireAccess();
  assertSeedViewerLocal();
  const parsed = HumanCheckInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: INVALID_MESSAGE };
  const root = seedViewerRoot();
  return settle(
    () =>
      saveHumanDecisions(root, {
        ...parsed.data,
        at: now().toISOString(),
      }),
    "사람 확인",
  );
}
