import "server-only";
// 결과 화면 자료(4절 세션 결과 행 · plan-p11a 값 8 · 정할 것 바). 그 프로필의 끝난 수업 세션만 낸다.
// '다음 수업'은 수업 목록의 '여기부터 해요'와 같은 수업(P10 readLessonList → lessonListState 의 hereStart)이다.
// 하던 수업 · 수업 · 연습이면 그 수업을, 그 밖(단계 평가 · 복습 — P12 · 첨삭 보기 — b)이나 없으면 '수업 목록'이다.
// 단원 막대 · '단원 n을 통과했어요!' · 다시 하기의 '맞힌 단어'는 P12 가 더한다. 점수 · 퍼센트를 내지 않는다.
// 쓰기 6~12 첫 세션(writing_part draft)은 첨삭 상태 · 낸 시각 · 기다리는 상한(ai.timeout_seconds.feedback)을 더한다(plan-p11b 값 10).
// 오늘 만난 말(세 영역 결과 칸 이름 — C173 (1) · C178 UX1, 전 이름 오늘 만난 단어 · 13절 C166 R3 — P12 일부 당김): 이 세션 미리보기 시도에 보인 단어(shownWords)와 그 뜻(미리보기와 같은 차례 — 수업 시드
// preview 의 뜻, 없으면 vocab — 미리보기 시도는 활동 번호가 아니라 시도 꼴로 찾는다, 가르치고 배우는 수업 plan 정한 것 4). 별(C167 (5)): 화면이 세션 종류 · 쓰기 부분으로 홈 별 합과 같은 셈(earnsStar)을 하고, 별 수는 여기서
// 싣는 reward.star_complete 다(별 장부는 P12).
// 되짚기 마무리 줄(가르치고 배우는 수업 plan 사 · 정본 15절 AC-6g): teach 칸이 든 수업만, 저장된 첫 끝 시도로 순수 함수 recapLineOf 를
// 다시 돌려 고른 줄과 근거를 싣는다(문턱 lesson.recap_min_evidence · lesson.recap_can_ratio). 줄 글 · 화면 조각은 결과 화면(라-4) 몫.
// 되짚기 화면 몫(라-4 · 정본 03:26 · 03:80 세션 결과(되짚기) 행 · 델타 spec 설계 5): recap 옆에 recapView(고른 줄의 글 — 화면이 줄 고르기를
// 다시 셈하지 않게 서버가 고른다, 문장 틀 · 칩, 집이 고른 선생님(readHouseholdTeacher — 고르기 전 null))를 싣는다. 쓰기 6~12 첫 세션 ·
// teach 없는 수업에는 없다. 다시 하기 결과에도 첫머리(초상 · 마무리 한 줄)는 있고, 문장 틀(오늘 만난 말 칸 안)만 없다(frame null — 정본
// 03:26 이 다시 하기에서 바꾸는 것은 '별 대신 다시 했어요'와 '오늘 만난 말을 두지 않음' 둘뿐, AC-6f · 델타 spec 설계 1 '다시 하기도 여섯 자리'). 음성 설정(speech)은 결과마다 싣는다 — 오늘
// 만난 말의 소리 단추가 teach 없는 수업 결과에도 있어서다(정본 03:26).
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { LessonItem, LessonRef } from "@/core/lesson-list/state";
import type { TeachChip } from "@/core/seed/schema/lesson";
import type { Area } from "@/core/seed/structure";
import { parseAttemptInput } from "@/core/session/attempt";
import { type RecapResult, recapLineOf } from "@/core/session/recap";
import { firstFinalsOf } from "@/core/session/spares";
import {
  SPEECH_SETTING_KEYS,
  type SpeechSettings,
  speechSettingsFrom,
} from "@/core/speech/listen";
import type { TeacherView } from "@/core/teacher/roster";
import { lessons, vocab } from "@/db/schema/content";
import { attempts, sessions } from "@/db/schema/learning";
import { type Db, getDb } from "@/server/db";
import { readLessonList } from "@/server/lesson-list";
import { readHouseholdProfile } from "@/server/profile";
import { seedHomophones } from "@/server/seed-lists";
import {
  lemmaEntriesOf,
  previewAttemptWhere,
  scoringOf,
  sessionContextOf,
} from "@/server/session";
import { getSettings } from "@/server/settings";
import { meaningWordsOf } from "@/server/speaking/words";
import { readHouseholdTeacher } from "@/server/teacher";
import { draftFeedbackOf } from "@/server/writing/status";

type LessonArea = Exclude<Area, "talk">;

/** 결과 화면 큰 단추가 열 곳. */
export type ResultNext =
  | { kind: "lesson"; lessonId: string }
  | { kind: "resume"; sessionId: string }
  | { kind: "list" };

export type ResultView = {
  sessionId: string;
  area: LessonArea;
  level: number;
  unit: number;
  /** 세션 종류(5절 sessions.kind — P12 가 다시 하기 · 보강 결과를 가른다). */
  kind: (typeof sessions.$inferSelect)["kind"];
  /** 쓰기 6단계 이상의 첫 세션 · 둘째 세션(별은 둘째 세션에서 — 3.5 R12), 그 밖 null. */
  writingPart: (typeof sessions.$inferSelect)["writingPart"];
  title: string;
  next: ResultNext;
  /** 쓰기 6~12 첫 세션 — '글을 보냈어요 …' · 첨삭 기다림 · '첨삭 보기'(그 수업) · 상한이 지나면 '수업 목록'. 그 밖 없음. */
  draft?: {
    state: "pending" | "ready" | "failed";
    /** 낸 시각(ISO). */
    submittedAt: string;
    /** ai.timeout_seconds.feedback — 낸 뒤 이만큼 지나도 첨삭이 없으면 '수업 목록'. */
    waitSeconds: number;
    /** '첨삭 보기'가 여는 수업(그 첫 세션의 수업 행). */
    lessonId: string;
  };
  /** ui.wait_hint_seconds(기다림 표시 — 첨삭 기다림 · '다음 수업'이 서버에서 첨삭을 기다릴 때). */
  waitHintSeconds: [number, number];
  /** 음성 설정(12절 speech.* — 오늘 만난 말 소리 단추 · 되짚기 읽어 주기의 감시 · 빠르기 · 한국어 줄 · 안내 시간). */
  speech: SpeechSettings;
  /** 끝낸 새 수업 하나의 별 수(reward.star_complete — 화면이 그만큼 별을 그린다, C167 (5)). */
  starsPerLesson: number;
  /** 오늘 만난 말의 단원 단어(이 세션 미리보기에 보인 단어 차례 그대로 · 뜻 — C166 R3). 미리보기가 없던 세션은 빈 목록. */
  metWords: { word: string; meaningKo: string }[];
  /**
   * 되짚기 마무리 줄(AC-6g): teach.recap 의 closeKo · closeKoPracticed 가운데 고른 것과 근거(유효 문항 · 독립 해냄 · 비율). teach 칸이
   * 없는 수업 · 쓰기 6~12 첫 세션(되짚기는 둘째 세션 결과에만)은 없다.
   */
  recap?: RecapResult;
  /**
   * 되짚기 화면 몫(라-4 · 정본 03:80): recap 이 있는 결과(다시 하기 포함 — 다시 하기는 frame null). 화면은 이 글을 그대로 보이고 줄 고르기를
   * 다시 셈하지 않는다.
   */
  recapView?: RecapView;
};

/** 시드 teach.recap 의 칸(문장 틀 · 칩 · 마무리 줄 둘). */
export type TeachRecap = {
  frameEn: string;
  chips: readonly TeachChip[];
  closeKo: string;
  closeKoPracticed: string;
};

/** 오늘 만난 말 칸의 칩을 단 문장 틀(teach.recap.frameEn · chips — 칩은 글 · role 만). */
export type RecapFrameView = {
  frameEn: string;
  chips: { text: string; role: TeachChip["role"] }[];
};

/** 결과 첫머리 되짚기 화면 자료(정본 03:80 — 초상과 마무리 한 줄, 오늘 만난 말의 칩을 단 문장 틀, 읽는 차례 마무리 → 단원 단어 → 문장 틀). */
export type RecapView = {
  /** 고른 마무리 줄의 글(recap.line 이 closeKo 면 teach.recap.closeKo, 아니면 closeKoPracticed — 시드 글 그대로). */
  lineKo: string;
  /** 문장 틀. 다시 하기 결과는 오늘 만난 말을 두지 않으므로 null(첫머리 마무리 한 줄만 — 정본 03:26). */
  frame: RecapFrameView | null;
  /** 집이 고른 선생님(세션 틀과 같은 TeacherView). 고르기 전 · 명단 밖 키는 null(기본 목소리 · 글자 동그라미). */
  teacher: TeacherView | null;
};

/**
 * 되짚기 화면 자료(순수): 서버가 고른 줄(recap.line)의 시드 글과 문장 틀 · 칩. 다시 하기 결과(kind retry)는 마무리 한 줄 · 선생님만 있고 문장 틀이
 * 없다(정본 03:26 — 다시 하기 결과는 오늘 만난 말을 두지 않는다). recap · teach 가 없으면(teach 없는 수업 · 쓰기 6~12 첫 세션) 없다.
 */
export function recapViewOf({
  kind,
  recap,
  teach,
  teacher,
}: {
  kind: ResultView["kind"];
  recap: RecapResult | undefined;
  teach: TeachRecap | undefined;
  teacher: TeacherView | null;
}): RecapView | undefined {
  if (!recap || !teach) return undefined;
  return {
    lineKo: recap.line === "closeKo" ? teach.closeKo : teach.closeKoPracticed,
    frame:
      kind === "retry"
        ? null
        : {
            frameEn: teach.frameEn,
            chips: teach.chips.map((c) => ({ text: c.text, role: c.role })),
          },
    teacher,
  };
}

/** 수업 시드의 미리보기 뜻(새 단어 수업만 — 다른 칸은 보지 않는다). */
const LessonPreviewSchema = z.object({
  preview: z
    .array(z.object({ word: z.string(), meaningKo: z.string() }))
    .optional(),
});

/** 이 세션 미리보기 시도에 보인 단어와 뜻(차례 그대로, 겹침 없음). 뜻은 미리보기와 같게 수업 preview 먼저, 없으면 vocab. */
async function metWordsOf(
  db: Db,
  sessionId: string,
  lessonContent: unknown,
): Promise<ResultView["metWords"]> {
  const rows = await db
    .select({ input: attempts.input })
    .from(attempts)
    .where(and(eq(attempts.sessionId, sessionId), previewAttemptWhere()));
  const words = [
    ...new Set(
      rows.flatMap((r) => {
        const input = parseAttemptInput(r.input);
        return input?.kind === "preview" ? input.shownWords : [];
      }),
    ),
  ];
  if (words.length === 0) return [];
  const meanings = await db
    .select({ word: vocab.word, meaning: vocab.meaning })
    .from(vocab)
    .where(inArray(vocab.word, words));
  const byWord = new Map(meanings.map((m) => [m.word, m.meaning]));
  const preview = new Map(
    (LessonPreviewSchema.safeParse(lessonContent).data?.preview ?? []).map(
      (p) => [p.word, p.meaningKo],
    ),
  );
  return words.map((word) => ({
    word,
    meaningKo: preview.get(word) ?? byWord.get(word) ?? "",
  }));
}

/**
 * 되짚기 마무리 줄(plan 사): teach 칸이 든 수업 세션만. 세션 서버와 같은 활동 차례 · 채점 맥락(sessionContextOf · scoringOf)으로, 활동마다
 * 가장 먼저 저장된 끝 시도를 recapLineOf 에 넘긴다. 문턱은 설정 lesson.recap_min_evidence · lesson.recap_can_ratio.
 */
async function recapOf(
  db: Db,
  session: typeof sessions.$inferSelect,
  lessonContent: unknown,
  profileId: string,
): Promise<{ recap: RecapResult; teach: TeachRecap } | undefined> {
  const hasTeach =
    typeof lessonContent === "object" &&
    lessonContent !== null &&
    "teach" in lessonContent &&
    lessonContent.teach !== undefined;
  if (!hasTeach || !session.lessonId || session.writingPart === "draft")
    return undefined;
  const [lessonRow] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, session.lessonId));
  if (!lessonRow) return undefined;
  const ctx = await sessionContextOf(db, session, lessonRow, profileId);
  const rows = await db
    .select({ activityNo: attempts.activityNo, input: attempts.input })
    .from(attempts)
    .where(eq(attempts.sessionId, session.id))
    .orderBy(asc(attempts.attemptedAt));
  const homophones = seedHomophones();
  const thresholds = await getSettings(
    {
      "lesson.recap_min_evidence": z.int().min(0),
      "lesson.recap_can_ratio": z.number().min(0).max(1),
    },
    { db, profileId },
  );
  const teach =
    "teach" in ctx.lesson && ctx.lesson.teach
      ? ctx.lesson.teach.recap
      : undefined;
  if (!teach) return undefined;
  const recap = recapLineOf({
    lesson: ctx.lesson,
    activities: ctx.activities,
    finals: firstFinalsOf(rows),
    ctx: scoringOf(
      ctx,
      homophones,
      await lemmaEntriesOf(db, ctx.lesson.unitWords),
      await meaningWordsOf(db, ctx.lesson, homophones),
    ),
    settings: {
      minEvidence: thresholds["lesson.recap_min_evidence"],
      canRatio: thresholds["lesson.recap_can_ratio"],
    },
  });
  return recap ? { recap, teach } : undefined;
}

/** 결과 화면 음성 설정(세션 틀과 같은 키 · 같은 읽기 — speechSettingsFrom). */
async function resultSpeechOf(
  db: Db,
  profileId: string,
): Promise<SpeechSettings> {
  const values = await getSettings(
    Object.fromEntries(SPEECH_SETTING_KEYS.map((key) => [key, z.unknown()])),
    { db, profileId },
  );
  return speechSettingsFrom((key) => values[key]);
}

const sameRef = (a: LessonRef, b: LessonRef) =>
  a.unit === b.unit && a.kind === b.kind && a.lessonNo === b.lessonNo;

/** 결과 화면 자료. 그 프로필의 끝난 수업 세션이 아니면 undefined(쪽이 홈으로). */
export async function loadResultView(
  { sessionId }: { sessionId: string },
  { db = getDb(), now }: { db?: Db; now: () => Date },
): Promise<ResultView | undefined> {
  if (!z.uuid().safeParse(sessionId).success) return undefined;
  const profile = await readHouseholdProfile({ db });
  if (!profile) return undefined;
  const [row] = await db
    .select({
      session: sessions,
      title: lessons.listTitle,
      content: lessons.content,
    })
    .from(sessions)
    .innerJoin(lessons, eq(lessons.id, sessions.lessonId))
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.profileId, profile.id),
        eq(sessions.status, "completed"),
      ),
    );
  if (
    !row ||
    row.session.area === "talk" ||
    row.session.level === null ||
    row.session.unit === null
  )
    return undefined;
  const area = row.session.area;
  const list = await readLessonList({ db, area, now: now() });
  let next: ResultNext = { kind: "list" };
  if (list.kind === "list") {
    const here = list.view.hereStart;
    const items: LessonItem[] = [
      ...(list.view.current?.front ?? []),
      ...(list.view.current?.back ?? []),
      ...list.view.practice,
    ];
    if (here?.kind === "resume")
      next = { kind: "resume", sessionId: here.sessionId };
    else if (here?.kind === "lesson" || here?.kind === "practice") {
      const item = items.find((i) => sameRef(i.ref, here.ref));
      if (item) next = { kind: "lesson", lessonId: item.lessonId };
    }
  }
  const draft =
    row.session.writingPart === "draft" && row.session.lessonId
      ? await draftFeedbackOf(db, { sessionId, profileId: profile.id })
      : undefined;
  const waits = await getSettings(
    {
      "ai.timeout_seconds.feedback": z.number().positive(),
      "ui.wait_hint_seconds": z.tuple([
        z.number().positive(),
        z.number().positive(),
      ]),
      "reward.star_complete": z.number().int().nonnegative(),
    },
    { db, profileId: profile.id },
  );
  const recapped = await recapOf(db, row.session, row.content, profile.id);
  const recap = recapped?.recap;
  const recapView = recapped
    ? recapViewOf({
        kind: row.session.kind,
        recap: recapped.recap,
        teach: recapped.teach,
        teacher: await readHouseholdTeacher({ db }),
      })
    : undefined;
  return {
    waitHintSeconds: waits["ui.wait_hint_seconds"],
    starsPerLesson: waits["reward.star_complete"],
    speech: await resultSpeechOf(db, profile.id),
    metWords: await metWordsOf(db, sessionId, row.content),
    ...(recap ? { recap } : {}),
    ...(recapView ? { recapView } : {}),
    ...(draft && row.session.lessonId
      ? {
          draft: {
            state: draft.state,
            submittedAt: draft.submittedAt.toISOString(),
            waitSeconds: waits["ai.timeout_seconds.feedback"],
            lessonId: row.session.lessonId,
          },
        }
      : {}),
    sessionId,
    area,
    level: row.session.level,
    unit: row.session.unit,
    kind: row.session.kind,
    writingPart: row.session.writingPart,
    title: row.title,
    next,
  };
}
