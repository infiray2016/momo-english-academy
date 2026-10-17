"use server";
// 첫 실행 서버 액션(4절 첫 실행 행, plan-p10a 파일별 값 8). 모든 함수의 첫 문장은 requireAccess() 다(P3b 훑기 시험).
// 입력은 화면에서 온 그대로 받아 서버에서 다시 본다(src/server/profile 의 Zod · 규칙). PIN · 이름을 로그에 내지 않는다.
import { z } from "zod";
import { NAME_MAX_LENGTH } from "@/core/profile/start";
import { requireAccess } from "@/server/access/guard";
import {
  checkVocabName,
  type FirstRunOutcome,
  saveFirstRun,
  type VocabNameCheck,
} from "@/server/profile";

const nameSchema = z.string().trim().min(1).max(NAME_MAX_LENGTH);

/** 영어 이름이 vocab 낱말인가(별명 묻기 화면을 띄울지). 이름 꼴이 아니면 vocabWord 거짓, DB 오류는 unavailable. */
export async function checkEnglishName(name: unknown): Promise<VocabNameCheck> {
  await requireAccess();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: true, vocabWord: false };
  return checkVocabName(parsed.data);
}

/** 첫 실행 마지막 한 번 저장. */
export async function completeFirstRun(
  input: unknown,
): Promise<FirstRunOutcome> {
  await requireAccess();
  return saveFirstRun(input);
}
