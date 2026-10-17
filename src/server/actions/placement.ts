"use server";
// 배치 평가 서버 액션(4절 배치 평가 행, plan-p10a 파일별 값 12). 모든 함수의 첫 문장은 requireAccess() 다(P3b 훑기 시험).
// 입력은 화면에서 온 그대로 받아 서버에서 다시 본다(src/server/placement 의 Zod). 답 글 · 인식 글을 로그에 내지 않는다.
import { z } from "zod";
import { PLACEMENT_AREAS } from "@/core/seed/structure";
import { requireAccess } from "@/server/access/guard";
import { now } from "@/server/clock";
import {
  beginPlacement,
  type MicAlertOutcome,
  type PlacementOutcome,
  recordPlacementMicAlert,
  submitPlacementAnswer,
} from "@/server/placement";

const areaSchema = z.enum(PLACEMENT_AREAS);

/** 배치 시작(진행 중이면 이어 보기). */
export async function startPlacement(area: unknown): Promise<PlacementOutcome> {
  await requireAccess();
  const parsed = areaSchema.safeParse(area);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  return beginPlacement({ area: parsed.data }, { now });
}

/** 답 하나 저장 · 다음 차례. */
export async function answerPlacement(
  input: unknown,
): Promise<PlacementOutcome> {
  await requireAccess();
  return submitPlacementAnswer(input, { now });
}

/** 배치 도중 마이크 알림(마이크를 쓸 수 없음 · 마이크가 멈춤). */
export async function reportPlacementMic(
  input: unknown,
): Promise<MicAlertOutcome> {
  await requireAccess();
  return recordPlacementMicAlert(input, { now });
}
