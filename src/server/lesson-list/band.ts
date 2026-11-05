import "server-only";
// 수업 목록 위 띠 재료(UI · UX plan 묶음 3 · 4절 수업 목록 '첫 화면' 행 R-13 · [승인 UX2] · AC-2d). 홈 카드에 있던 셈(단원 5칸 · 아는 단어 ·
// 최근 성적 · 끝낸 대화, plan-p10b 파일별 값 4)을 옮겼고 친한 정도 · '끝낸 세션 있음'을 더했다. 판정 기준(unit.recent_window ·
// unit.recent_score)은 그 단원 회차의 복사본에서, 친한 정도 칸 수는 talk.friendship_max 에서 읽는다. 칸 · 막대 규칙은 순수 함수
// (core/lesson-list/state — recentCellsOf · bandBarsOf · unitCellsOf)이고 이 파일은 DB 에서 재료만 모은다.
// 아는 단어는 P12 가 단어장 상태를 쓰면 채워진다(그 전에는 0). 끝낸 대화의 분모는 목록의 잠긴 단원 수와 같은 최소 수업 수(minLessonsOf)다.
import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import {
  type BandFacts,
  type RecentCell,
  recentCellsOf,
} from "@/core/lesson-list/state";
import type { Area } from "@/core/seed/structure";
import { vocab } from "@/db/schema/content";
import {
  profileTracks,
  sessions,
  type unitProgress,
  vocabProgress,
} from "@/db/schema/learning";
import type { DbOrTx } from "@/server/db";
import { readUnitSpec } from "@/server/seed/read";
import { getSettings } from "@/server/settings";
import { readHouseholdTeacher } from "@/server/teacher";

/** 아는 단어로 세는 단어장 상태(3.2 — 읽기 · 말하기 '알아봄', 쓰기 '씀', 회화 '말함'). */
const KNOWN_STATE = {
  reading: "recognize",
  writing: "write",
  speaking: "recognize",
  talk: "say",
} as const satisfies Record<Area, "recognize" | "write" | "say">;
const RECENT_WINDOW_KEY = "unit.recent_window";
const RECENT_SCORE_KEY = "unit.recent_score";

type Round = typeof unitProgress.$inferSelect;

const snapshotNumber = (snapshot: unknown, key: string): number => {
  const value = (snapshot as Record<string, unknown> | null)?.[key];
  if (typeof value !== "number")
    throw new Error(`단원 복사본에 ${key} 가 없다`);
  return value;
};

/** 그 영역에서 배치 평가 말고 끝낸 세션이 하나라도 있는가(홈 첫 사용 꼴과 같은 뜻 — C166 R7 · R-13). */
async function finishedIn(
  db: DbOrTx,
  profileId: string,
  area: Area,
): Promise<boolean> {
  const [row] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.profileId, profileId),
        eq(sessions.area, area),
        eq(sessions.status, "completed"),
        ne(sessions.kind, "placement"),
      ),
    )
    .limit(1);
  return row !== undefined;
}

/** 위 띠 재료: 통과 단원 · 끝낸 세션 있음 · 아는 단어 · 최근 성적(세 영역) 또는 끝낸 대화 · 친한 정도(회화). */
export async function readBandFacts({
  db,
  profileId,
  area,
  level,
  unit,
  rounds,
  current,
  minLessons,
}: {
  db: DbOrTx;
  profileId: string;
  area: Area;
  level: number;
  unit: number;
  /** 이 영역 · 이 단계의 단원 회차 전부. */
  rounds: readonly Round[];
  /** 지금 단원의 가장 늦은 회차. */
  current: Round;
  /** 최소 수업 수(목록의 잠긴 단원 수와 같은 값 — minLessonsOf). */
  minLessons: number;
}): Promise<BandFacts> {
  const passedUnits = [
    ...new Set(rounds.filter((r) => r.passedAt !== null).map((r) => r.unit)),
  ].sort((a, b) => a - b);
  const finished = await finishedIn(db, profileId, area);

  const spec = await readUnitSpec(
    { area, level, unit, startRevision: current.startRevision },
    { db },
  );
  const targetVocab = spec?.targetVocab ?? [];
  const known =
    targetVocab.length === 0
      ? 0
      : await db
          .select({ n: sql<number>`count(*)::int` })
          .from(vocabProgress)
          .innerJoin(vocab, eq(vocabProgress.vocabId, vocab.id))
          .where(
            and(
              eq(vocabProgress.profileId, profileId),
              eq(vocabProgress.state, KNOWN_STATE[area]),
              eq(vocabProgress.known, true),
              inArray(vocab.word, targetVocab),
            ),
          )
          .then(([row]) => row?.n ?? 0);

  // 이 단원 회차에서 끝낸 정규 수업(최근 것부터 — 최근 성적 · 끝낸 대화)
  const regular = await db
    .select({ score: sessions.score, writingPart: sessions.writingPart })
    .from(sessions)
    .where(
      and(
        eq(sessions.profileId, profileId),
        eq(sessions.area, area),
        eq(sessions.level, level),
        eq(sessions.unit, unit),
        eq(sessions.kind, "regular"),
        eq(sessions.status, "completed"),
        gte(sessions.completedAt, current.startedAt),
      ),
    )
    .orderBy(desc(sessions.completedAt));

  const base = {
    finished,
    passedUnits,
    known: { n: known, of: targetVocab.length },
  };
  if (area !== "talk") {
    const recent: RecentCell[] = recentCellsOf({
      sessions: regular,
      windowSize: snapshotNumber(current.settingsSnapshot, RECENT_WINDOW_KEY),
      pass: snapshotNumber(current.settingsSnapshot, RECENT_SCORE_KEY),
    });
    return { ...base, recent };
  }
  const [track] = await db
    .select({ friendship: profileTracks.friendship })
    .from(profileTracks)
    .where(
      and(
        eq(profileTracks.profileId, profileId),
        eq(profileTracks.area, "talk"),
      ),
    );
  const { "talk.friendship_max": max } = await getSettings(
    { "talk.friendship_max": z.number().int().positive() },
    { db, profileId },
  );
  return {
    ...base,
    talks: { done: regular.length, min: minLessons },
    friendship: {
      n: track?.friendship ?? 0,
      max,
      teacherName: (await teacherNameOf(db))?.nameKo ?? null,
    },
  };
}

/** 고른 선생님(이름 자리). 명단을 읽지 못하면 이름 없이('선생님') 그린다 — 목록을 막지 않는다. */
async function teacherNameOf(db: DbOrTx) {
  try {
    return await readHouseholdTeacher({ db });
  } catch {
    return null;
  }
}
