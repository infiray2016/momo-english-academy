// 검증기가 읽는 기록의 Zod 규격(plan-p04a '기록'): 풀이 검사 seed/checks/ · 사람 표본 검토 seed/reviews/.
// 칸 내용 해시 · 문항 번호 · 풀이 대상은 P4c 가 정하고 P5 가 따른다(정할 것 ㅋ).
import { z } from "zod";
import {
  Count,
  Hex64Schema,
  IsoDateSchema,
  IsoDateTimeSchema,
  PositiveInt,
  Text,
} from "@/core/seed/schema/reference";
import { parseCellKey } from "@/core/seed/structure";

/** 칸 키(structure.ts `cellKey` 꼴). */
export const CellKeySchema = z
  .string()
  .refine((key) => parseCellKey(key) !== null, {
    message: "칸 키 꼴이 아니다",
  });

/** 6.4 풀이 검사: 풀이 · 판단 · 모델 · 토큰 · 비용 · 날짜, 사람 확인은 내용 해시와 함께. */
export const CheckRecordSchema = z.strictObject({
  cell: CellKeySchema,
  contentHash: Hex64Schema,
  solve: z.strictObject({
    at: IsoDateTimeSchema,
    model: Text,
    inputTokens: Count,
    outputTokens: Count,
    costUsd: z.number().min(0),
    items: z.array(
      z.strictObject({
        no: PositiveInt,
        verdict: z.enum(["same", "different", "multiple", "none"]),
        /** 풀이 모델의 답(보기 번호 또는 글). */
        solverAnswer: z.union([z.int(), z.string()]).optional(),
        /** 쓰기 1~3단계 조립 · 받아쓰기의 허용 정답 후보. */
        extraAccepted: z.array(Text).optional(),
      }),
    ),
  }),
  human: z
    .strictObject({
      contentHash: Hex64Schema,
      at: IsoDateTimeSchema,
      items: z.array(
        z.strictObject({
          no: PositiveInt,
          decision: z.enum(["correct", "fixed"]),
        }),
      ),
    })
    .optional(),
});
export type CheckRecord = z.infer<typeof CheckRecordSchema>;
export const CheckFileSchema = z.strictObject({
  records: z.array(CheckRecordSchema),
});
export type CheckFile = z.infer<typeof CheckFileSchema>;

/** 6.3 표본 검토 '알맞음 · 쉬움 · 어려움 · 오류'. seed_reports 와 같은 열(칸 · 문항 번호 · 사유 · 메모 · 날짜). */
export const ReviewRowSchema = z.strictObject({
  cell: CellKeySchema,
  itemNo: PositiveInt.nullable(),
  reason: z.enum(["ok", "easy", "hard", "error"]),
  memo: z.string(),
  date: IsoDateSchema,
});
export type ReviewRow = z.infer<typeof ReviewRowSchema>;
export const ReviewFileSchema = z.strictObject({
  rows: z.array(ReviewRowSchema),
});
export type ReviewFile = z.infer<typeof ReviewFileSchema>;
