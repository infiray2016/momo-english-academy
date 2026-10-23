import "server-only";
// 회화 선생님 명단 서버(선생님 화면 plan 값 5 · 6, 5절 명단 자료 · profiles.teacher_key · 3.3 '선생님을 골라요' · C130 · C141).
// 명단은 빌드에 묶은 seed/teachers.json(시드 목록 teachers)이다. 화면에는 TeacherView 만, AI 고정부에는 영어 이름 · 성격 글만 준다.
// 고르기는 그 아이에게 보이는 명단 안 선생님만, 아직 고르지 않은(또는 명단에 없는 키가 남은) 프로필에만 한 번 쓴다 — 두 기기가 겹쳐도
// 조건 붙은 UPDATE 하나라 한 번만 쓴다. 아이 이름 · 오류 글을 로그에 내지 않는다(오류 이름만).
import { and, eq, isNull, notInArray, or } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import type { Teacher } from "@/core/seed/schema/teachers";
import {
  type TeacherView,
  teacherViewOf,
  visibleTeachers,
} from "@/core/teacher/roster";
import { profiles } from "@/db/schema/learning";
import { type DbOrTx, getDb } from "@/server/db";
import { readHouseholdProfile } from "@/server/profile";
import { loadSeedList, type SeedListOptions } from "@/server/seed-lists";

/** 명단(명단 차례). 없거나 규격이 틀리면 던진다(SeedListError). */
export function rosterOf(opts: SeedListOptions = {}): Teacher[] {
  return loadSeedList("teachers", opts).teachers;
}

/** AI 고정부 선생님 블록의 재료(6.1 · 6.2 — 영어 이름 · 성격 글). */
export function teacherPromptOf(t: Pick<Teacher, "nameEn" | "personaEn">): {
  nameEn: string;
  personaEn: string;
} {
  return { nameEn: t.nameEn, personaEn: t.personaEn };
}

/** 그 아이에게 보일 선생님의 화면 몫(고르는 화면). */
export function teacherChoicesOf(
  roster: readonly Teacher[],
  child: {
    displayName: string;
    englishName: string;
    toriNickname: string | null;
  },
): TeacherView[] {
  return visibleTeachers(roster, {
    displayName: child.displayName,
    englishName: child.englishName,
    nickname: child.toriNickname,
  }).map(teacherViewOf);
}

export type TeacherReadOptions = { db?: DbOrTx; roster?: readonly Teacher[] };

/** 집 프로필이 고른 선생님(명단에 있는 키일 때). 프로필이 없거나 고르지 않았거나 명단 밖 키면 null. */
export async function readHouseholdTeacher({
  db = getDb(),
  roster,
}: TeacherReadOptions = {}): Promise<TeacherView | null> {
  const profile = await readHouseholdProfile({ db });
  if (!profile?.teacherKey) return null;
  const found = (roster ?? rosterOf()).find(
    (t) => t.key === profile.teacherKey,
  );
  return found ? teacherViewOf(found) : null;
}

/** 집 선생님(아이 화면 공유 — 요청마다 한 번). 읽기 실패는 null 이고 오류 이름만 남긴다. */
export const householdTeacher = cache(async (): Promise<TeacherView | null> => {
  try {
    return await readHouseholdTeacher();
  } catch (error) {
    console.error(
      `집 선생님 읽기 실패(${error instanceof Error ? error.name : "unknown"})`,
    );
    return null;
  }
});

// ── 고르기(값 6) ──────────────────────────────────────────────────

export type ChooseTeacherOutcome =
  | { ok: true }
  | { ok: false; reason: "unknown" | "hidden" | "already" };

const ChooseTeacherInputSchema = z.strictObject({
  key: z.string().regex(/^[a-z]+$/),
});

/**
 * 선생님 고르기(서버 액션 chooseTeacher 의 몸). 꼴이 틀리거나 명단 밖 키면 unknown, 그 아이에게 보이지 않으면 hidden,
 * 이미 명단 안 선생님을 고른 프로필이면 already(조건 붙은 UPDATE 가 0 행 — 두 기기가 겹쳐도 한 번만 씀).
 * 집 프로필이 없으면 쓸 행이 없어 already 다(화면이 다시 읽으면 첫 실행으로 간다).
 */
export async function chooseTeacherFor(
  input: unknown,
  { db = getDb(), roster }: TeacherReadOptions = {},
): Promise<ChooseTeacherOutcome> {
  const parsed = ChooseTeacherInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "unknown" };
  const list = roster ?? rosterOf();
  const key = parsed.data.key;
  if (!list.some((t) => t.key === key)) return { ok: false, reason: "unknown" };
  const profile = await readHouseholdProfile({ db });
  if (!profile) return { ok: false, reason: "already" };
  const visible = visibleTeachers(list, {
    displayName: profile.displayName,
    englishName: profile.englishName,
    nickname: profile.toriNickname,
  });
  if (!visible.some((t) => t.key === key))
    return { ok: false, reason: "hidden" };
  const written = await db
    .update(profiles)
    .set({ teacherKey: key })
    .where(
      and(
        eq(profiles.id, profile.id),
        or(
          isNull(profiles.teacherKey),
          notInArray(
            profiles.teacherKey,
            list.map((t) => t.key),
          ),
        ),
      ),
    )
    .returning({ id: profiles.id });
  return written.length > 0 ? { ok: true } : { ok: false, reason: "already" };
}
