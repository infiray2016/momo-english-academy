import "server-only";
// 회화 세션 서버(plan-p13b 파일별 값 1 · 회화 plan 묶음 9 · 12, 3.3 회화 블록 · '대화가 멈추는 경우' 표 · 5절 전이 · 8절 · C89 · C189).
// 화면 자료(처음 열 때 처음 스냅숏 · 첫 선생님 행 — AI 없음) · 따라 말하기 저장 · 토막 넘김 · '더 이야기하기' · '그만하기' · '홈' · 한 번
// 안내 기록 · 힌트 단 열기. 모두 그 프로필의 새 꼴 카드 회화 세션만 다룬다(남의 세션은 거부, 옛 꼴 카드 세션은 열 때 닫음 — 정한 것 2).
// 시각은 now() 한 시계. AI 를 부르지 않는다(끝맺음 턴은 closing.ts 가 응답 뒤에, 회화 턴은 turn.ts → lesson-turn.ts). 아이 글을 로그에 내지 않는다.
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  type TalkInputMode,
  talkLessonRewriteOf,
} from "@/core/ai/calls/talk-lesson";
import type { PictureInfo } from "@/core/answer/display";
import {
  lessonFollowAlongNo,
  parseTalkAttemptInput,
  TALK_START_ACTIVITY_NO,
  type TalkAttemptInput,
  type TalkPrepPlace,
  talkStartAttemptId,
} from "@/core/conversation/attempt";
import {
  cardItemOf,
  oldestMoreOf,
  slotChanceOf,
  startPrepWordsOf,
  type TalkCarry,
  talkChancesOf,
} from "@/core/conversation/chances";
import {
  type ClientListen,
  ClientListenSchema,
} from "@/core/conversation/client-listen";
import {
  type TalkEnd,
  talkEndOf,
  talkStopOf,
} from "@/core/conversation/ending";
import {
  type LessonArgs,
  NOW_LETS_TALK,
  nextTeacherTurnOf,
  type TalkLessonPosition,
  type TeacherAttachLine,
  type TeacherTurnPlan,
  talkLessonPositionOf,
  teacherMoveOf,
} from "@/core/conversation/lesson-flow";
import {
  isLowBand,
  type TalkLessonCard,
  type TalkLessonSettings,
  type TalkLessonSpec,
  type TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import {
  type TalkSpeechSettings,
  talkSpeechSettingsFrom,
} from "@/core/conversation/listen";
import {
  readTalkMove,
  type TalkMove,
  type TalkMoveKind,
  talkMoveOf,
} from "@/core/conversation/move";
import { metWordsIn, talkEnglishSentenceDelta } from "@/core/conversation/said";
import { MORE_PROMPT } from "@/core/conversation/spoken";
import {
  farewellOf,
  type WrapUpLine,
  wrapUpLinesOf,
} from "@/core/conversation/wrap-up";
import { learningDayOf } from "@/core/learning-day";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import type { TalkTodayWord } from "@/core/seed/schema/talk";
import type { TALK_SEGMENTS } from "@/core/seed/structure";
import {
  SPEECH_SETTING_KEYS,
  type SpeechSettings,
  speechSettingsFrom,
} from "@/core/speech/listen";
import { type TeacherView, teacherViewOf } from "@/core/teacher/roster";
import { images, lessons, vocab } from "@/db/schema/content";
import { attempts, profiles, sessions, talkTurns } from "@/db/schema/learning";
import { type Db, type DbOrTx, getDb, type Tx } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readLessonList } from "@/server/lesson-list";
import { readHouseholdProfile } from "@/server/profile";
import { seedHomophones, seedTalkWaitLines } from "@/server/seed-lists";
import { aiRestingToday } from "@/server/session/ai-gate";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
  SettingMissingError,
} from "@/server/settings";
import { rosterOf, teacherChoicesOf } from "@/server/teacher";
import {
  closeWithoutClosing,
  completeTalk,
  insertClosingRecord,
  insertLessonClosing,
  scheduleTalkClosing,
} from "./closing";
import { lessonHintsAt, lessonImageKeyOf } from "./lesson-turn";
import {
  friendshipOf,
  type HintView,
  hintViewsOf,
  isTalkOpen,
  knownSayOf,
  lessonTurnOf,
  metSayOf,
  onTalkSessionEnded,
  positiveInt,
  readTalkAnyState,
  snapshotNumber,
  type TalkAnyState,
  type TalkLessonState,
  type TalkServerDeps,
  type TalkTurnRow,
  talkSegmentOf,
  toriLinesOf,
  toriTextOf,
  writeSay,
} from "./state";

export {
  type ClosingStatus,
  closeIdleTalks,
  runTalkClosing,
  scheduleTalkClosing,
  talkClosingStatus,
} from "./closing";

export {
  type HintView,
  onTalkSessionEnded,
  type TalkServerDeps,
} from "./state";

/** 시도 id 글자 수 상한(기술 값). */
export const CLIENT_ATTEMPT_ID_MAX = 100;
/** 아이 말 · 목표 글 글자 수 상한(기술 값 — 회화 한 턴 답보다 넉넉히). */
export const TALK_TEXT_MAX = 500;
/** 따라 말하기 한 차례의 인식 글 수 상한(기술 값 — speech.max_retries 보다 넉넉히). */
const HEARD_MAX = 10;
/** 한 차례 인식 실패 수 상한(기술 값). */
const FAILURES_MAX = 20;
/** 한 번 안내 열쇠(정할 것 회17 — profiles.notices_seen). */
export const TALK_NOTICE_KINDS = [
  "talk_intro",
  "talk_hint_nudge",
  "talk_test_hint_nudge",
  /** ①② 처음 안내 '번호를 누르면 답을 들려줘요'(U5-11 — 프로필마다 한 번, R-29). */
  "talk_answer_tip",
] as const;

function logFailure(what: string, error: unknown) {
  if (error instanceof SettingMissingError)
    console.error(`${what} 실패(설정 ${error.key} 가 없습니다)`);
  else console.error(`${what} 실패(${dbErrorTag(error)})`);
}

const SessionIdSchema = z.strictObject({ sessionId: z.uuid() });

/** 그림 키 → 카탈로그 그림. */
async function picturesByKeys(
  db: DbOrTx,
  keys: readonly string[],
): Promise<Record<string, PictureInfo>> {
  if (keys.length === 0) return {};
  // 뜻 칸은 한국어 뜻(그 그림 낱말의 vocab 뜻)이거나 비움 — 그림 키 · 낱말(아이가 말할 영어)을 화면 자료로 내리지 않는다(화면 검토 I-2)
  const rows = await db
    .select({ key: images.key, path: images.path, meaning: vocab.meaning })
    .from(images)
    .leftJoin(vocab, eq(vocab.word, images.word))
    .where(inArray(images.key, [...keys]));
  return Object.fromEntries(
    keys.map((key) => {
      const row = rows.find((r) => r.key === key);
      const path = row?.path ?? null;
      return [
        key,
        {
          meaningKo: row?.meaning ?? "",
          catalogued: path !== null,
          ...(path ? { src: path.startsWith("/") ? path : `/${path}` } : {}),
        },
      ];
    }),
  );
}

// ── 공용 꼴 · 쪽 고르기 ───────────────────────────────────────────

/** 선생님 창 설정(12절 talk.teacher_render · talk.teacher_load_timeout_seconds · talk.teacher_praise_seconds). */
export type TalkTeacherSettings = {
  render: "3d" | "portrait";
  loadTimeoutSeconds: number;
  praiseSeconds: number;
};

/** 쪽이 고르는 데 쓰는 그 프로필 세션의 영역 · 상태(값 12). 회화면 대화가 열려 있는지도. */
export async function readTalkSessionArea(
  { sessionId }: { sessionId: string },
  { db = getDb() }: { db?: Db } = {},
): Promise<
  | { area: "talk"; status: string; open: boolean }
  | { area: "reading" | "writing" | "speaking"; status: string }
  | undefined
> {
  if (!z.uuid().safeParse(sessionId).success) return undefined;
  const profile = await readHouseholdProfile({ db });
  if (!profile) return undefined;
  const [row] = await db
    .select({
      area: sessions.area,
      status: sessions.status,
      talkSegment: sessions.talkSegment,
    })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.profileId, profile.id)));
  if (!row) return undefined;
  if (row.area === "talk")
    return { area: "talk", status: row.status, open: isTalkOpen(row) };
  return { area: row.area, status: row.status };
}

/** 따라 말하기 한 차례 저장(saveLessonFollowAlong)의 결과. */
export type FollowOutcome =
  | { ok: true; saved: boolean }
  | { ok: false; reason: "invalid" | "not_found" | "unavailable" };

/** 마무리 자료(값 15 — 첫 장 · 셋째 장, 둘째 장 4단계부터 몫은 c). */
export type WrapView = {
  /** 되짚을 말(정리 토막 — 1~3단계는 전체를 한 번 따라 말하기). */
  lines: WrapUpLine[];
  /** 카드 끝인사(끝맺음 끝인사가 와 있으면 화면이 talkClosingStatus 로 바꾼다 — C33). */
  farewell: { en: string; ko?: string };
  /** 그만둔 대화(세션 '중단' — 첫 장 '다음에 조금 더 이야기하면 별을 받아요', R-54. 참여 완료 조건은 회화 spec 구현 몫). */
  aborted: boolean;
  retry: boolean;
  /** 세션 종류(5절 sessions.kind — 마무리 별을 홈 별 합과 같은 입력으로 센다, C167 (5) · 검토 B M-4). */
  kind: TalkLessonState["session"]["kind"];
  /** 끝낸 새 수업 하나의 별 수(reward.star_complete — 화면이 그만큼 별을 그린다, C167 (5)). */
  starsPerLesson: number;
  /** 오늘 만난 단어(이 세션 오늘 쓸 말 단어 — 대화에 원형이 안 나온 것에 듣기 단추, 회11 (12)). */
  metWords: {
    word: string;
    meaningKo: string;
    example: string;
    inTalk: boolean;
  }[];
  /** 친한 정도 막대(다시 하기는 없음). */
  friendship: { value: number; max: number } | null;
  /** 다음 이야기(수업 목록 '여기부터 해요'의 회화 수업). 없으면 null. */
  nextLesson: { lessonId: string; title: string } | null;
};

async function nextTalkLessonOf(
  db: Db,
  at: Date,
): Promise<WrapView["nextLesson"]> {
  const list = await readLessonList({ db, area: "talk", now: at });
  if (list.kind !== "list") return null;
  const here = list.view.hereStart;
  if (here?.kind !== "lesson") return null;
  const items = [
    ...(list.view.current?.front ?? []),
    ...(list.view.current?.back ?? []),
  ];
  const item = items.find(
    (i) =>
      i.ref.unit === here.ref.unit &&
      i.ref.kind === here.ref.kind &&
      i.ref.lessonNo === here.ref.lessonNo,
  );
  return item ? { lessonId: item.lessonId, title: item.title } : null;
}

const StopSchema = z.strictObject({
  sessionId: z.uuid(),
  confirmed: z.boolean(),
});

export type StopOutcome =
  | { ok: true; wrap: WrapView }
  | {
      ok: false;
      reason: "invalid" | "not_found" | "needs_confirm" | "unavailable";
    };

export type LeaveOutcome =
  | { ok: true; closed: false }
  | { ok: true; closed: true; wrap: WrapView | null }
  | { ok: false; reason: "invalid" | "not_found" | "unavailable" };

export type WrapOutcome =
  | { ok: true; wrap: WrapView }
  | { ok: false; reason: "invalid" | "not_found" | "unavailable" };

// ── 한 번 안내 ──────────────────────────────────────────────────

const NoticeSchema = z.strictObject({ kind: z.enum(TALK_NOTICE_KINDS) });

/** 한 번 안내를 보았다(profiles.notices_seen[kind] = 지금 — 프로필마다 한 번이라 다른 기기에서도 안 보임, 회17 · AC-15l). */
export async function markTalkNotice(
  raw: unknown,
  deps: Pick<TalkServerDeps, "db" | "now">,
): Promise<{ ok: boolean }> {
  const parsed = NoticeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false };
    await db
      .update(profiles)
      .set({
        noticesSeen: sql`jsonb_set(coalesce(${profiles.noticesSeen}, '{}'::jsonb), ${`{${parsed.data.kind}}`}::text[], to_jsonb(${deps.now().toISOString()}::text))`,
      })
      .where(eq(profiles.id, profile.id));
    return { ok: true };
  } catch (error) {
    logFailure("회화 안내 기록", error);
    return { ok: false };
  }
}

// ══ 새 꼴 카드 세션(C189, 회화 plan 묶음 9 · 12 — 정한 것 1 · 2 · 11 · 12 · 17 · 20 · 22) ═══════════════════════════
// 새 꼴 카드 세션만 다룬다(readTalkAnyState 의 kind new — 옛 꼴 카드 세션은 화면 자료 읽기가 끝맺음 없이 중단으로 닫는다, 정한 것 2).
// 모두 AI 를 부르지 않는다(끝맺음 턴은 응답 뒤 closing.ts). 판정은 아래 순수 함수(LessonCore 입력)가 하고, 액션은 상태 읽기 → 판정 →
// 쓰기만 한다.

type LessonSegment = (typeof TALK_SEGMENTS)[number];
type SessionStatus = TalkLessonState["session"]["status"];

/** 새 갈래 판정의 순수 입력 — 상태(TalkLessonState)에서 판정에 쓰는 칸만(시험이 바로 만든다). */
export type LessonCore = {
  spec: TalkLessonSpec;
  card: TalkLessonCard;
  /** 이번 수업 새 단어(수업 newWords). */
  newWords: readonly string[];
  /** 살아 있는 행의 흐름 꼴(끊긴 아이 행 뺌). */
  turns: readonly TalkLessonTurn[];
  segment: LessonSegment;
  settings: TalkLessonSettings;
  carry?: TalkCarry;
  /** 흐름 입력 prepWords — 인사 뒤 준비에서 실제로 보인 낱말(talk-prep 시도, state.prepWords). */
  prepWords: readonly string[];
  /** 처음 스냅숏의 짧은 준비 계획(talk-start prepWords, state.start.prepPlan). 인사 뒤 준비 쪽지의 낱말이다. */
  prepPlan: readonly string[];
  status: SessionStatus;
  /** 선생님 말이 없는 마지막 아이 행이 있다(같은 시도 id 로 다시 받는 중). */
  orphan: boolean;
  /** 카드 오늘 쓸 말 수(활동 번호의 바닥선 범위, 다지기 · 보강은 0). */
  todayWordCount: number;
};

export function lessonCoreOf(state: TalkLessonState): LessonCore {
  return {
    spec: state.spec,
    card: state.card,
    newWords: state.lesson.newWords,
    turns: state.turns,
    segment: state.segment,
    settings: state.settings,
    ...(state.start ? { carry: state.start.carry } : {}),
    prepWords: state.prepWords,
    prepPlan: state.start?.prepPlan ?? [],
    status: state.session.status,
    orphan: state.orphan !== null,
    todayWordCount: state.card.todayWords.length,
  };
}

function lessonArgsOf(
  core: LessonCore,
  over: Partial<Pick<LessonArgs, "segment" | "turns">> = {},
): LessonArgs {
  return {
    spec: core.spec,
    card: core.card,
    newWords: core.newWords,
    turns: over.turns ?? core.turns,
    segment: over.segment ?? core.segment,
    settings: core.settings,
    ...(core.carry ? { carry: core.carry } : {}),
    prepWords: core.prepWords,
  };
}

export function lessonPositionOf(core: LessonCore): TalkLessonPosition {
  return talkLessonPositionOf(lessonArgsOf(core));
}

/** 아이가 지금 할 일(화면 자료). 고르는 화면(선생님 전)은 화면 자료가 따로 정한다. */
export type TalkLessonStep =
  /** 토막 넘김(advanceTalkLesson): 인사 끝 → 짧은 준비 · 대화, 준비 끝 → 대화(대화 첫 질문). */
  | { kind: "advance"; to: "prep" | "talk" }
  /** 짧은 준비 쪽지(인사 뒤 · 대화 중 연 준비). 다 하면 advance talk. */
  | { kind: "prep"; place: TalkPrepPlace }
  /** 아이 차례(말 · '잘 모르겠어요'). */
  | { kind: "child" }
  /** 고르기 두 버튼(마무리 물음 · 마무리 제안, 정한 것 11). 말로 답해도 된다. */
  | { kind: "choice"; choice: "closing" | "suggestion" }
  /** 선생님 말이 없는 마지막 아이 행 — 같은 시도 id 로 다시 보낸다(AC-15f). */
  | { kind: "retry" }
  | { kind: "closed" };

function prepPlaceOf(
  core: LessonCore,
  pos: Pick<TalkLessonPosition, "prepPending" | "lastRow">,
): TalkPrepPlace | null {
  if (core.segment === "wrap_up" || core.orphan) return null;
  if (core.segment === "prep") return "greeting";
  if (pos.prepPending && pos.lastRow === "teacher") return "talk";
  return null;
}

/** 그 자리 준비 쪽지의 낱말: 인사 뒤는 처음 스냅숏 계획, 대화 중은 그 준비를 연 선생님 행 move.prep(묶음 7 보고 '넘길 것'). */
function prepWordsAt(core: LessonCore, place: TalkPrepPlace): string[] {
  if (place === "greeting") return [...core.prepPlan];
  for (let i = core.turns.length - 1; i >= 0; i--) {
    const row = core.turns[i];
    if (row?.speaker === "teacher" && row.move?.prep)
      return [...row.move.prep.words];
  }
  return [];
}

export function lessonStepOf(core: LessonCore): TalkLessonStep {
  if (core.segment === "wrap_up") return { kind: "closed" };
  if (core.orphan) return { kind: "retry" };
  const pos = lessonPositionOf(core);
  const place = prepPlaceOf(core, pos);
  if (place) return { kind: "prep", place };
  if (pos.choice) return { kind: "choice", choice: pos.choice };
  if (
    pos.lastRow === "teacher" &&
    (pos.firstQuestionDue || (core.segment === "greeting" && pos.greetingDone))
  )
    return {
      kind: "advance",
      to:
        core.segment === "greeting" && core.prepPlan.length > 0
          ? "prep"
          : "talk",
    };
  return { kind: "child" };
}

export type LessonAdvance =
  | { ok: true; segment: LessonSegment; plan: TeacherTurnPlan | null }
  | { ok: false };

/**
 * 토막 넘김 판정(3.3 '토막이 바뀌는 곳은 앱이 이끈다', C19): 인사를 다 했으면 짧은 준비 계획이 있을 때 짧은 준비로(질문 없음), 없으면
 * (4단계부터 · 보일 낱말이 없는 다지기, C33) 대화로. 짧은 준비 → 대화, 대화 중 연 준비 끝(3.3 (나)) → 같은 토막에서 대화 첫 질문.
 * 대화로 갈 때의 계획은 늘 대화 첫 질문(AI 없음 — 카드 첫 필수 질문, 대화 중 준비 뒤는 'Now let's talk.' + 다음 필수 질문)이다.
 */
export function lessonAdvanceOf(
  core: LessonCore,
  to: "prep" | "talk",
): LessonAdvance {
  const no = { ok: false } as const;
  if (core.segment === "wrap_up" || core.orphan) return no;
  const pos = lessonPositionOf(core);
  if (pos.lastRow !== "teacher" || pos.choice !== null) return no;
  if (to === "prep")
    return core.segment === "greeting" &&
      pos.greetingDone &&
      core.prepPlan.length > 0
      ? { ok: true, segment: "prep", plan: null }
      : no;
  let segment: LessonSegment;
  if (core.segment === "greeting" || core.segment === "prep") {
    if (!pos.greetingDone) return no;
    if (core.segment === "greeting" && core.prepPlan.length > 0) return no;
    segment = "talk";
  } else if (
    (core.segment === "talk" || core.segment === "more_talk") &&
    pos.firstQuestionDue
  )
    segment = core.segment;
  else return no;
  const plan = nextTeacherTurnOf(lessonArgsOf(core, { segment }));
  if (plan.kind !== "first_question") return no;
  return { ok: true, segment, plan };
}

/** 따라 말하기 한 차례 입력(짧은 준비 · 정리 · 한 번 더). 바닥선 듣기 활동(talk-floor)은 둘째 묶음 16 이다. */
export type LessonFollowInput = {
  segment: "prep" | "wrap_up" | "again";
  index: number;
  target: string;
  heard: readonly string[];
  failures: number;
  skipped?: "recognition" | "no_mic" | "silent" | "stalled";
  clientListen?: ClientListen;
};

/**
 * 따라 말하기 한 차례의 시도 · 활동 번호 · 만남(3.3 짧은 준비 '만남'): 짧은 준비는 그 자리 쪽지의 index 번째 낱말을 talk-prep(자리 · 낱말)으로,
 * 활동 번호는 lessonFollowAlongNo(짧은 준비 범위 max(오늘 쓸 말 수, talk.prep_words.<구간>) — 묶음 7 fix 1). 인식 글이 있으면(따라 말함)
 * 그 낱말이 '만났다'이고, 건너뛴 낱말은 시도만 남는다. 정리 · 한 번 더는 정리 토막에서만. 받지 않으면 null.
 */
export function lessonFollowOf(
  core: LessonCore,
  follow: LessonFollowInput,
  wrapUp: number,
): { activityNo: number; input: TalkAttemptInput; met: string[] } | null {
  const spoken = {
    target: follow.target,
    heard: [...follow.heard],
    failures: follow.failures,
    ...(follow.skipped ? { skipped: follow.skipped } : {}),
    ...(follow.clientListen ? { clientListen: follow.clientListen } : {}),
  };
  const head = { v: 1 as const, step: "final" as const };
  const counts = {
    todayWords: core.todayWordCount,
    prepWords: core.settings.prepWords,
    wrapUp,
  };
  const numberOf = (
    at: Parameters<typeof lessonFollowAlongNo>[0],
  ): number | null => {
    try {
      return lessonFollowAlongNo(at, counts);
    } catch {
      return null;
    }
  };
  if (follow.segment === "prep") {
    const place = prepPlaceOf(core, lessonPositionOf(core));
    if (!place) return null;
    const word = prepWordsAt(core, place)[follow.index];
    const activityNo = numberOf({ segment: "prep", index: follow.index });
    if (word === undefined || activityNo === null) return null;
    return {
      activityNo,
      input: {
        ...head,
        kind: "talk-prep",
        ...spoken,
        index: follow.index,
        word,
        place,
      },
      met: follow.heard.some((t) => t.trim() !== "") ? [word] : [],
    };
  }
  if (core.segment !== "wrap_up") return null;
  const activityNo = numberOf({
    segment: follow.segment,
    index: follow.index,
  });
  if (activityNo === null) return null;
  return {
    activityNo,
    input:
      follow.segment === "again"
        ? { ...head, kind: "talk-again", ...spoken }
        : { ...head, kind: "talk-wrapup", ...spoken, index: follow.index },
    met: [],
  };
}

/** 영어로 말한 문장 수(C41 · AC-12h): 따라 말하기 한 차례에서 인식 글이 있는 발화마다 하나. */
export function followSentenceDelta(
  segment: LessonFollowInput["segment"],
  heard: readonly string[],
): number {
  return heard.reduce(
    (sum, text) =>
      sum +
      talkEnglishSentenceDelta(segment === "again" ? "again" : "follow", text),
    0,
  );
}

export type LessonMore =
  | {
      ok: true;
      segment: LessonSegment;
      /** 붙이는 카드 자리 행의 move(AI 호출 · 턴 셈 없음). */
      move: TalkMove;
      line: { en: string; ko?: string };
      /** 이 고르기로 참여 완료가 된다(마무리 물음에 답함 — 세션마다 한 번). */
      complete: boolean;
    }
  | { ok: false };

/**
 * '더 이야기하기'(정한 것 11): 고르기 차례(마무리 물음 · 마무리 제안)에서만. 앱이 더 이야기할 거리 하나를 카드 자리로 붙인다 — 다시 쓰기가
 * 남은 낱말을 노리는 것(카드 차례) → 가장 오래전에 쓴 것(같은 질문 상한 안) → 가장 오래전에 쓴 것. 마무리 물음이면 더 이야기하기 토막이고
 * 그 답으로 참여 완료(02-2:294), 마무리 제안이면 토막 그대로 대화를 잇는다(02-2:295, 참여 완료 아님).
 */
export function lessonMoreOf(core: LessonCore): LessonMore {
  const no = { ok: false } as const;
  if (core.segment === "wrap_up" || core.orphan) return no;
  const pos = lessonPositionOf(core);
  if (pos.choice === null || pos.lastRow !== "teacher") return no;
  const chances = talkChancesOf({
    card: core.card,
    newWords: core.newWords,
    turns: core.turns,
    carry: core.carry ?? { goals: [], words: [] },
    missionsDone: 0,
    settings: core.settings,
    prepWords: core.prepWords,
  });
  const guard = {
    blocked: [],
    asked: pos.askedQuestions,
    max: core.settings.sameQuestionMax,
  };
  const ref =
    slotChanceOf({
      card: core.card,
      chances: { required: [], reuse: chances.reuse },
      ...guard,
    }) ??
    oldestMoreOf({ card: core.card, turns: core.turns, ...guard }) ??
    oldestMoreOf({ card: core.card, turns: core.turns, blocked: [] });
  const item = ref ? cardItemOf(core.card, ref) : undefined;
  if (!ref || !item) return no;
  const closing = pos.choice === "closing";
  return {
    ok: true,
    segment: closing ? "more_talk" : core.segment,
    move: talkMoveOf({
      kind: "card_slot",
      item: ref,
      words: item.targets,
      goals: item.goals,
      streak: pos.streak,
    }),
    line: {
      en: item.en,
      ...(core.spec.koMeaning && item.ko ? { ko: item.ko } : {}),
    },
    complete: closing && core.status === "in_progress",
  };
}

export type LessonStop =
  | { kind: "needs_confirm" }
  | {
      kind: "end";
      end: TalkEnd;
      /** 이 '그만하기'로 참여 완료가 된다(아직 진행 중인 세션). */
      complete: boolean;
    };

/**
 * '그만하기'(정한 것 12, 3.3 끝난 길 표): 확인 조건은 참여가 거의 없음(talkNearlySilent)뿐이다. 마무리 물음의 두 버튼은 마무리 물음에 답함,
 * 마무리 제안의 두 버튼은 suggestion, 구석 단추는 stop(참여 완료 · 별 1 · 친한 정도). 참여가 거의 없으면 확인을 물고, 확인하면 중단
 * (stop_confirmed — 별 · 친한 정도 없음).
 */
export function lessonStopOf(core: LessonCore, confirmed: boolean): LessonStop {
  const pos = lessonPositionOf(core);
  let end = talkStopOf({
    turns: core.turns,
    closingAnswered: pos.closingAnswered || pos.choice === "closing",
    suggestion: pos.choice === "suggestion",
  });
  if (end.outcome === "confirm") {
    if (!confirmed) return { kind: "needs_confirm" };
    end = talkEndOf({ path: "stop_confirmed" });
  }
  return {
    kind: "end",
    end,
    complete: end.outcome === "completed" && core.status === "in_progress",
  };
}

// ── 짧은 준비 쪽지의 들려줄 말(다지기 · 보강 — 회화 3단계 브리프 설계 검토 '구현하며 확인할 것' 2) ──

/**
 * 들려줄 말 앱 규칙(브리프 seed/prompts/talk-3.md 5절 '(제안)' 꼴, 컨트롤러 잠정 결정 11-05 — 첫 프리뷰에서 요청자 확인): 동사 'I + 낱말.',
 * 셀 수 있는 명사 'The + 낱말.', 셀 수 없는 명사는 낱말만('Air.'). vocab 에 셀 수 있음 칸이 없어, 명사만인 낱말에 복수형(forms)이 있으면 셀 수
 * 있다고 보고, 동사를 겸한 명사(rain · snow — forms 가 동사 꼴)와 꼴이 없는 명사는 낱말만으로 둔다. 첫 품사로 가른다. 그 밖의 품사는 null.
 */
export function prepModelLineOf({
  word,
  partsOfSpeech,
  forms,
}: {
  word: string;
  partsOfSpeech: readonly string[];
  forms: readonly string[];
}): string | null {
  const first = partsOfSpeech[0];
  if (first === "verb") return `I ${word}.`;
  if (first !== "noun") return null;
  const countable = forms.length > 0 && !partsOfSpeech.includes("verb");
  return countable
    ? `The ${word}.`
    : `${word.charAt(0).toUpperCase()}${word.slice(1)}.`;
}

/** 짧은 준비 쪽지 낱말 하나(쪽지 글 규칙 — 1단계 그림 · 뜻 · 소리, 2~3단계 낱말 글, 4단계부터 예문 글 — 은 화면 묶음 11 이 고른다). */
export type PrepWordView = {
  word: string;
  meaningKo: string;
  example: string;
  /** 선생님이 들려주고 아이가 한 번 따라 말하는 말(따라 말하기 목표 글). */
  modelLine: string;
  imageKey?: string;
  /** 들려줄 말 출처: 카드 오늘 쓸 말 · 같은 단원 배정 카드 · 품사 규칙 · 낱말만. */
  source: "card" | "unit_card" | "rule" | "word";
};

export type PrepVocabEntry = {
  meaning: string;
  example: string | null;
  partsOfSpeech: readonly string[];
  forms: readonly string[];
  imageKey: string | null;
};

/**
 * 쪽지 낱말마다 뜻 · 예문 · 들려줄 말: (0) 이 카드 오늘 쓸 말 → (1) 같은 단원의 적재된 배정 카드 오늘 쓸 말(그 들려줄 말) → (2) 품사 규칙
 * (prepModelLineOf, 뜻 · 예문 · 그림은 vocab) → (3) 낱말만 읽는다.
 */
export function prepNoteOf(
  words: readonly string[],
  sources: {
    card: readonly TalkTodayWord[];
    unitCards: readonly (readonly TalkTodayWord[])[];
    vocab: ReadonlyMap<string, PrepVocabEntry>;
  },
): PrepWordView[] {
  const fromCard = (
    w: TalkTodayWord,
    source: "card" | "unit_card",
  ): PrepWordView => ({
    word: w.word,
    meaningKo: w.meaningKo,
    example: w.example,
    modelLine: w.modelLine,
    ...(w.imageKey ? { imageKey: w.imageKey } : {}),
    source,
  });
  return words.map((word) => {
    const own = sources.card.find((w) => w.word === word);
    if (own) return fromCard(own, "card");
    for (const card of sources.unitCards) {
      const hit = card.find((w) => w.word === word);
      if (hit) return fromCard(hit, "unit_card");
    }
    const v = sources.vocab.get(word);
    const base = {
      word,
      meaningKo: v?.meaning ?? "",
      example: v?.example ?? "",
      ...(v?.imageKey ? { imageKey: v.imageKey } : {}),
    };
    const rule = v
      ? prepModelLineOf({
          word,
          partsOfSpeech: v.partsOfSpeech,
          forms: v.forms,
        })
      : null;
    return rule
      ? { ...base, modelLine: rule, source: "rule" as const }
      : { ...base, modelLine: word, source: "word" as const };
  });
}

const FormsSchema = z.array(z.string());

/** 쪽지 낱말의 출처 자료를 읽어 prepNoteOf 로 넘긴다(같은 단원 배정 카드는 세션 시작 개정 이하, 새 개정 먼저). */
async function prepNoteFor(
  db: DbOrTx,
  state: TalkLessonState,
  words: readonly string[],
): Promise<PrepWordView[]> {
  if (words.length === 0) return [];
  const own = new Set(state.card.todayWords.map((w) => w.word));
  const missing = words.filter((w) => !own.has(w));
  let unitCards: TalkTodayWord[][] = [];
  const entries = new Map<string, PrepVocabEntry>();
  if (missing.length > 0) {
    const rows = await db
      .select({ content: lessons.content })
      .from(lessons)
      .where(
        and(
          eq(lessons.area, "talk"),
          eq(lessons.level, state.level),
          eq(lessons.unit, state.unit),
          eq(lessons.kind, "assigned"),
          lte(
            lessons.revision,
            state.session.seedRevision ?? state.lessonRow.revision,
          ),
        ),
      )
      .orderBy(
        desc(lessons.revision),
        desc(lessons.correction),
        lessons.lessonNo,
      );
    unitCards = rows.flatMap((r) => {
      const parsed = TalkLessonSchema.safeParse(r.content);
      return parsed.success ? [parsed.data.card.todayWords] : [];
    });
    const vocabRows = await db
      .select({
        word: vocab.word,
        meaning: vocab.meaning,
        example: vocab.example,
        partsOfSpeech: vocab.partsOfSpeech,
        forms: vocab.forms,
        imageKey: vocab.imageKey,
      })
      .from(vocab)
      .where(inArray(vocab.word, missing));
    for (const r of vocabRows) {
      const forms = FormsSchema.safeParse(r.forms);
      entries.set(r.word, {
        meaning: r.meaning,
        example: r.example,
        partsOfSpeech: r.partsOfSpeech,
        forms: forms.success ? forms.data : [],
        imageKey: r.imageKey,
      });
    }
  }
  return prepNoteOf(words, {
    card: state.card.todayWords,
    unitCards,
    vocab: entries,
  });
}

// ── 대화 기록 자료(묶음 10 talkLogOf 의 재료 — 정본 03 4절 '대화 기록', T2) ──

/** 선생님 행의 화면 글 한 줄: AI 글(검사를 지난 tori_en, 뜻은 tori_ko) · 앱이 붙인 줄(카드 질문 · 받침 줄 · 마무리 물음 · 넘어가는 말). */
export type TalkLessonLogLine = { en: string; ko?: string; app: boolean };

export type TalkLessonLogRow =
  | {
      speaker: "teacher";
      turnNo: number;
      segment: LessonSegment;
      kind: TalkMoveKind | null;
      lines: TalkLessonLogLine[];
    }
  | {
      speaker: "child";
      turnNo: number;
      segment: LessonSegment;
      /** 인식 글(말) — '잘 모르겠어요' · 들리지 않음은 null. */
      text: string | null;
      input: TalkInputMode;
      /** 들리지 않음 차례(회색 '못 들었어요'). */
      nospeech: boolean;
      stuck: boolean;
    };

/**
 * 'Now let's talk.'(대화 중 연 짧은 준비 끝의 앱 대사, 3.3 (나))의 한국어 뜻 — 1~4단계 화면 글 아래에 붙인다(정본 03 4절 '대화 기록').
 * 정본 밖 문구다(컨트롤러 결정 plan 보정 11-05 (4), 잠정 — 첫 프리뷰에서 요청자 확인).
 */
export const NOW_LETS_TALK_KO = "이제 이야기해 보자!";

/** 앱이 붙인 카드 줄의 뜻(카드 인사 질문 · 선생님 첫 말 · 필수 질문 · 더 이야기할 거리 · 쉬운 질문 · 마무리 물음 · 넘어가는 말). */
function cardLineKoOf(
  card: Pick<TalkLessonCard, "greeting" | "required" | "more">,
  en: string,
): string | undefined {
  const g = card.greeting;
  if ("questions" in g) {
    const q = g.questions.find((x) => x.question.en === en);
    if (q) return q.question.ko;
  } else if (g.firstLine.en === en) return g.firstLine.ko;
  for (const item of [...card.required, ...card.more]) {
    if (item.en === en) return item.ko;
    if (item.easyQuestion.en === en) return item.easyQuestion.ko;
  }
  if (en === MORE_PROMPT.en) return MORE_PROMPT.ko;
  if (en === NOW_LETS_TALK) return NOW_LETS_TALK_KO;
  return undefined;
}

function teacherLinesOf(
  row: Pick<TalkTurnRow, "text" | "toriKo">,
  ctx: {
    card: Pick<TalkLessonCard, "greeting" | "required" | "more">;
    koMeaning: boolean;
  },
): TalkLessonLogLine[] {
  const { aiPart, appended } = toriLinesOf(row.text);
  const out: TalkLessonLogLine[] = [];
  if (aiPart.trim() !== "")
    out.push({
      en: aiPart,
      ...(ctx.koMeaning && row.toriKo ? { ko: row.toriKo } : {}),
      app: false,
    });
  for (const en of appended) {
    const ko = ctx.koMeaning ? cardLineKoOf(ctx.card, en) : undefined;
    out.push({ en, ...(ko ? { ko } : {}), app: true });
  }
  return out;
}

/**
 * 대화 기록 자료(정본 03 4절 '대화 기록', FR-7): 선생님 행은 화면 글 줄과 뜻(1~4단계), 아이 행은 인식 글 · 입력 방식 · 들리지 않음 · 막힘.
 * 선생님 행 text 에는 화면에 글로 나온 줄만 있으므로(정한 것 5) 1~3단계 소리 줄(move.sound) · 소리로만 준 답은 들지 않는다(T2). 힌트 글 ·
 * 맞장구는 talk_turns 에 없다. 무엇을 그릴지(잘 모르겠어요 · 못 들었어요 글)는 묶음 10 의 talkLogOf 가 고른다.
 */
export function lessonLogOf(
  rows: readonly TalkTurnRow[],
  ctx: {
    card: Pick<TalkLessonCard, "greeting" | "required" | "more">;
    koMeaning: boolean;
  },
): TalkLessonLogRow[] {
  return rows.map((row) => {
    if (row.speaker === "child") {
      const lite = lessonTurnOf(row);
      return {
        speaker: "child",
        turnNo: row.turnNo,
        segment: talkSegmentOf(row.segment),
        text: row.text,
        input: row.inputMode ?? "speech",
        nospeech: lite.speaker === "child" && lite.nospeech,
        stuck: lite.speaker === "child" && lite.stuck,
      };
    }
    return {
      speaker: "teacher",
      turnNo: row.turnNo,
      segment: talkSegmentOf(row.segment),
      kind: readTalkMove(row.move)?.kind ?? null,
      lines: teacherLinesOf(row, ctx),
    };
  });
}

// ── 상태 읽기 · 행 쓰기 ─────────────────────────────────────────────

/** 새 꼴 카드 세션 상태(옛 꼴 카드 · 남의 세션 · 회화 아님이면 undefined). */
async function lessonStateFor(
  db: DbOrTx,
  args: { sessionId: string; profileId: string; lock?: boolean; at: Date },
): Promise<TalkLessonState | undefined> {
  const any = await readTalkAnyState(db, args);
  return any?.kind === "new" ? any.state : undefined;
}

/**
 * 옛 꼴 카드(C189 앞) 세션을 닫는 꼴(순수 — 회화 plan 정한 것 2): 진행이면 중단(이어 하기 시간이 지난 세션과 같은 길, 8절 — 끝맺음 기록 까닭
 * aborted), 완료이고 열린 대화(목표 턴 뒤 '더 이야기하기')면 정리로만 닫는다(까닭 idle). 둘 다 끝맺음은 부르지 않는다(건너뜀).
 */
export function oldTalkCloseOf(status: TalkLessonState["session"]["status"]): {
  aborted: boolean;
  reason: "aborted" | "idle";
} {
  return status === "in_progress"
    ? { aborted: true, reason: "aborted" }
    : { aborted: false, reason: "idle" };
}

/**
 * 열린 옛 꼴 카드 세션을 끝맺음 없이 닫는다(정한 것 2 — 1단계 회화는 둘째 프리뷰까지 닫힘, 위험 14): 정리 토막으로 닫고, 진행이었으면 중단 ·
 * 학습일 · 이음매 aborted. 끝맺음 기록은 건너뜀(보낸 메시지 지움 — 홈 진입 정리가 다시 보지 않는다).
 */
async function closeOldTalkSession(
  tx: Tx,
  session: Extract<TalkAnyState, { kind: "old" }>["session"],
  { profileId, at }: { profileId: string; at: Date },
): Promise<void> {
  const close = oldTalkCloseOf(session.status);
  const day = close.aborted
    ? await getSettings(
        {
          "app.timezone": appTimezoneSchema,
          "app.day_start_hour": appDayStartHourSchema,
        },
        { db: tx, profileId },
      )
    : null;
  await tx
    .update(sessions)
    .set({
      talkSegment: "wrap_up",
      ...(day
        ? {
            status: "aborted" as const,
            learningDay: learningDayOf(
              at,
              day["app.timezone"],
              day["app.day_start_hour"],
            ),
          }
        : {}),
    })
    .where(eq(sessions.id, session.id));
  const inserted = await closeWithoutClosing(tx, {
    sessionId: session.id,
    at,
    reason: close.reason,
  });
  if (close.aborted && inserted)
    await onTalkSessionEnded(tx, {
      sessionId: session.id,
      profileId,
      ended: "aborted",
    });
}

function nextTurnNoOf(state: Pick<TalkLessonState, "rows">): number {
  return state.rows.reduce((max, r) => Math.max(max, r.turnNo), 0) + 1;
}

/**
 * 앱이 만드는 선생님 행(첫 인사 · 대화 첫 질문 · '더 이야기하기' 카드 자리 — AI 없음): text 는 화면 글 줄(첫 줄 AI 글은 비움, 그 뒤 붙인 줄,
 * 소리 줄은 빼고 move.sound — 정한 것 5), 다시 쓸 선생님 차례는 붙인 줄 전부를 화면 차례대로(6.1, talkLessonRewriteOf), move 는 계획대로.
 */
async function insertTeacherRow(
  tx: Tx,
  {
    sessionId,
    turnNo,
    segment,
    attach,
    move,
    at,
  }: {
    sessionId: string;
    turnNo: number;
    segment: LessonSegment;
    attach: readonly TeacherAttachLine[];
    move: TalkMove;
    at: Date;
  },
): Promise<void> {
  const screen = attach.filter((l) => l.kind !== "sound").map((l) => l.en);
  await tx.insert(talkTurns).values({
    sessionId,
    turnNo,
    segment,
    speaker: "tori",
    text: toriTextOf("", screen),
    toriRewrite: talkLessonRewriteOf({
      sentSentences: [],
      appended: attach.map((l) => l.en),
    }),
    move,
    recordedAt: at,
  });
}

/** 앱이 붙인 질문의 단원 단어를 만남으로(C2 '이 대화에서 이미 물은 것'). */
async function writeAskedMet(
  tx: Tx,
  state: TalkLessonState,
  attach: readonly TeacherAttachLine[],
): Promise<void> {
  await writeSay(tx, {
    profileId: state.profileId,
    met: attach.flatMap((l) =>
      l.kind === "question"
        ? metWordsIn(l.en, {
            unitWords: state.lesson.unitWords,
            lemmaOf: state.lemmaOf,
          })
        : [],
    ),
    said: [],
    day: state.learningDay,
    knownDays: snapshotNumber(state, "talk.known_days"),
  });
}

/** 그 수업이 노리는 단원 단어(필수 질문 → 더 이야기할 거리의 노리는 단어, 없으면 수업 단원 단어) — 다지기 · 보강 짧은 준비 후보. */
function lessonTargetWordsOf(state: TalkLessonState): string[] {
  const targets = [
    ...new Set([
      ...state.card.required.flatMap((i) => i.targets),
      ...state.card.more.flatMap((i) => i.targets),
    ]),
  ];
  return targets.length > 0 ? targets : [...state.lesson.unitWords];
}

/**
 * 새 갈래 처음 열기(한 트랜잭션 — 세션 행 FOR UPDATE): 처음 스냅숏(talk-start — 만난 단원 단어 · 짧은 준비 계획 · 이월 · 선생님 키)과
 * 첫 선생님 행(카드 인사 질문 · 4단계부터 선생님 첫 말, kind first_question — AI 없음). 짧은 준비 계획은 talk.prep_mode.<구간> 이 always 일 때
 * 카드 짧은 준비 낱말(다지기 · 보강은 이월 단어를 앞세워 아직 '안다'가 아닌 노리는 단어 talk.prep_words.<구간> 개, C33)이고 when_needed 면
 * 비운다((가) 앞 수업 바닥선은 둘째 묶음 16, (나)는 대화 중 move.prep). 이월은 둘째 묶음 18 이 채운다(지금은 빈 목록). 넣었으면 참.
 */
async function ensureLessonStarted(
  tx: Tx,
  state: TalkLessonState,
  at: Date,
): Promise<boolean> {
  let changed = false;
  if (!state.start) {
    const unitWords = state.lesson.unitWords;
    const metBefore = await metSayOf(tx, {
      profileId: state.profileId,
      words: unitWords,
    });
    const carry = { goals: [] as string[], words: [] as string[] };
    const targets = lessonTargetWordsOf(state);
    const known = [
      ...(await knownSayOf(tx, {
        profileId: state.profileId,
        words: [...new Set([...carry.words, ...targets])],
      })),
    ];
    const prepPlan =
      state.settings.prepMode === "always"
        ? startPrepWordsOf({
            card: state.card,
            carryWords: carry.words,
            unitWords: targets,
            known,
            count: state.settings.prepWords,
          })
        : [];
    const input: TalkAttemptInput = {
      v: 1,
      kind: "talk-start",
      step: "final",
      // 옛 필수 칸(판 1 더하기만 — 묶음 7 '다르게 한 것' 2): 새 흐름은 빈 목록
      shownWords: [],
      metBefore,
      practiceOrder: [],
      ...(state.teacher ? { teacherKey: state.teacher.key } : {}),
      prepWords: prepPlan,
      carry,
    };
    if (!parseTalkAttemptInput(input))
      throw new Error("새 흐름 처음 스냅숏 꼴이 틀렸다");
    await tx
      .insert(attempts)
      .values({
        sessionId: state.session.id,
        clientAttemptId: talkStartAttemptId(state.session.id),
        activityNo: TALK_START_ACTIVITY_NO,
        input,
        attemptedAt: at,
        status: "done",
      })
      .onConflictDoNothing({ target: attempts.clientAttemptId });
    changed = true;
  }
  if (!state.rows.some((r) => r.speaker === "tori")) {
    const plan = nextTeacherTurnOf(
      lessonArgsOf(lessonCoreOf(state), { turns: [] }),
    );
    if (plan.kind !== "none") {
      await insertTeacherRow(tx, {
        sessionId: state.session.id,
        turnNo: 1,
        segment: "greeting",
        attach: plan.attach,
        move: teacherMoveOf(plan),
        at,
      });
      changed = true;
    }
  }
  return changed;
}

// ── 화면 자료 ────────────────────────────────────────────────────

export type TalkLessonViewSettings = {
  speech: SpeechSettings;
  talkSpeech: TalkSpeechSettings;
  /** speech.max_retries */
  maxRetries: number;
  /** speech.silent_items_max(막힘 화면, C22). */
  silentItemsMax: number;
  ui: {
    waitHintSeconds: [number, number];
    matchPhraseLevels: [number, number];
    autoNextSeconds: number;
  };
  talk: {
    confirmSeconds: number;
    hintReadMatch: number;
    dontknowMax: number;
    /** '다 했어요! 더 이야기하기 n / (이 값)'(위 띠, 마무리 물음 뒤). */
    moreRoundTurns: number;
    nospeechDontknowCount: number;
    /** talk.wait_line_seconds — 보낸 뒤 첫 문장이 이 안에 없으면 맞장구 한 줄(정본 03 4절). */
    waitLineSeconds: number;
  };
  /** ai.timeout_seconds.feedback */
  feedbackTimeoutSeconds: number;
};

const TALK_SPEECH_KEYS = [
  "speech.end_silence_seconds.talk.1-3",
  "speech.end_silence_seconds.talk.4-6",
  "speech.end_silence_seconds.talk.7-9",
  "speech.end_silence_seconds.talk.10-12",
  "speech.end_silence_seconds.talk_long",
  "talk.max_answer_seconds",
] as const;

/** 화면 설정(talk.wait_line_seconds 는 맞장구 고르기). */
async function lessonViewSettingsOf(
  db: DbOrTx,
  profileId: string,
): Promise<{
  view: TalkLessonViewSettings;
  friendship: { per: number; max: number };
  teacherSettings: TalkTeacherSettings;
}> {
  const positive = z.number().positive();
  const unit = z.number().min(0).max(1);
  const count = z.int().min(1);
  const values = await getSettings(
    {
      ...Object.fromEntries(
        [...SPEECH_SETTING_KEYS, ...TALK_SPEECH_KEYS].map((key) => [
          key,
          z.unknown(),
        ]),
      ),
      "speech.max_retries": count,
      "speech.silent_items_max": count,
      "ui.wait_hint_seconds": z.tuple([positive, positive]),
      "ui.match_phrase_levels": z.tuple([unit, unit]),
      "ui.auto_next_seconds": z.number().nonnegative(),
      "ai.timeout_seconds.feedback": positive,
      "talk.confirm_seconds": z.number().nonnegative(),
      "talk.hint_read_match": unit,
      "talk.dontknow_max": count,
      "talk.more_talk_round_turns": count,
      "talk.nospeech_dontknow_count": count,
      "talk.wait_line_seconds": positive,
      "talk.friendship_per_talk": count,
      "talk.friendship_max": count,
      "talk.teacher_render": z.enum(["3d", "portrait"]),
      "talk.teacher_load_timeout_seconds": positive,
      "talk.teacher_praise_seconds": positive,
    } as Record<string, z.ZodType>,
    { db, profileId },
  );
  const read = (key: string) => values[key];
  const num = (key: string) => values[key] as number;
  return {
    view: {
      speech: speechSettingsFrom(read),
      talkSpeech: talkSpeechSettingsFrom(read),
      maxRetries: num("speech.max_retries"),
      silentItemsMax: num("speech.silent_items_max"),
      ui: {
        waitHintSeconds: values["ui.wait_hint_seconds"] as [number, number],
        matchPhraseLevels: values["ui.match_phrase_levels"] as [number, number],
        autoNextSeconds: num("ui.auto_next_seconds"),
      },
      talk: {
        confirmSeconds: num("talk.confirm_seconds"),
        hintReadMatch: num("talk.hint_read_match"),
        dontknowMax: num("talk.dontknow_max"),
        moreRoundTurns: num("talk.more_talk_round_turns"),
        nospeechDontknowCount: num("talk.nospeech_dontknow_count"),
        waitLineSeconds: num("talk.wait_line_seconds"),
      },
      feedbackTimeoutSeconds: num("ai.timeout_seconds.feedback"),
    },
    friendship: {
      per: num("talk.friendship_per_talk"),
      max: num("talk.friendship_max"),
    },
    teacherSettings: {
      render: values["talk.teacher_render"] as TalkTeacherSettings["render"],
      loadTimeoutSeconds: num("talk.teacher_load_timeout_seconds"),
      praiseSeconds: num("talk.teacher_praise_seconds"),
    },
  };
}

/** 친한 정도 규칙(참여 완료 — completeTalk). */
async function friendshipRulesOf(
  db: DbOrTx,
  profileId: string,
): Promise<{ per: number; max: number }> {
  const values = await getSettings(
    {
      "talk.friendship_per_talk": z.unknown(),
      "talk.friendship_max": z.unknown(),
    },
    { db, profileId },
  );
  return {
    per: positiveInt(values, "talk.friendship_per_talk"),
    max: positiveInt(values, "talk.friendship_max"),
  };
}

// ── 힌트 단(3.3 힌트 문단 · AC-15a · AC-15p, 검토 I-1 — plan 보정 11-05 (3)) ──

type LessonHintState = Pick<
  TalkLessonState,
  "spec" | "card" | "turns" | "liveRows" | "position"
>;

/**
 * 지금 질문 자리의 힌트 단 보기(옛 HintView 꼴: 종류 · 듣기 · 쓸 말). 단은 턴 길이 아이 행의 힌트 종류를 셀 때와 같은 함수(lesson-turn
 * lessonHintsAt — 카드 항목을 노린 자리는 그 카드 항목 힌트, 아니면 그 질문을 쓴 선생님 행 ai_question 의 AI 힌트)로 정한다. 1~3단계
 * 영어 단 글은 비운다(영어 문장을 미리 내려 주지 않는다 — 연 단만 revealTalkLessonHint 로 받는다).
 */
export function lessonHintViewsOf(state: LessonHintState): HintView[] {
  return hintViewsOf(
    lessonHintsAt(state, state.position.slot),
    isLowBand(state.spec),
  );
}

/** 지금 질문 자리 힌트 단 하나의 글(0부터). 없으면 null. */
export function lessonHintTextOf(
  state: LessonHintState,
  tier: number,
): string | null {
  return lessonHintsAt(state, state.position.slot)[tier]?.text ?? null;
}

/** 지금 선생님 차례(이어 할 때 다시 보이고 읽는 마지막 선생님 행 — AI 호출 없음, AC-15f). */
export type TalkLessonCurrent = {
  turnNo: number;
  kind: TalkMoveKind | null;
  lines: TalkLessonLogLine[];
  /** 1~3단계 소리 줄(글 없는 듣기 단추로 읽음 — 화면에 글로 보이지 않는다, T2). */
  sound: NonNullable<TalkMove["sound"]> | null;
  /** 서버가 붙인 도움(move.app). */
  app: TalkMove["app"];
  /** 이 차례 질문의 카드 항목(쉬운 질문을 찾는 열쇠). */
  item: TalkMove["item"] | null;
  /** 지금 질문 자리의 힌트 단(1~3단계 영어 단 글은 비움 — 연 단은 revealTalkLessonHint). 없으면 '힌트' 단추가 없다. */
  hints: HintView[];
  /** 1~3단계 그림 턴(C32): 지금 질문 자리 카드 항목의 그림 키(단계 규격 turnImages 일 때만 — plan 보정 11-05 (13)). */
  imageKey?: string;
  /** 그 행에 저장한 한국어 설명(보인 때만 저장 — 이어 열어도 말풍선 아래에 다시 보인다, 묶음 11 검토 M-6). */
  explanation?: string;
};

function currentOf(state: TalkLessonState): TalkLessonCurrent | null {
  const row = state.liveRows.findLast((r) => r.speaker === "tori");
  if (!row) return null;
  const move = readTalkMove(row.move);
  return {
    turnNo: row.turnNo,
    kind: move?.kind ?? null,
    lines: teacherLinesOf(row, {
      card: state.card,
      koMeaning: state.spec.koMeaning,
    }),
    sound: move?.sound ?? null,
    app: move?.app ?? [],
    item: move ? { ...move.item } : null,
    hints: lessonHintViewsOf(state),
    ...imageKeyOf(
      lessonImageKeyOf(state, state.position.slot?.item ?? move?.item),
    ),
    ...(row.explanation ? { explanation: row.explanation } : {}),
  };
}

const imageKeyOf = (imageKey: string | undefined) =>
  imageKey === undefined ? {} : { imageKey };

/** 짧은 준비 쪽지 자료: 자리 · 낱말(들려줄 말 출처 포함) · 이 자리에서 끝낸 차례. */
export type TalkLessonPrep = {
  place: TalkPrepPlace;
  words: PrepWordView[];
  done: number[];
};

async function prepViewOf(
  db: DbOrTx,
  state: TalkLessonState,
  place: TalkPrepPlace,
): Promise<TalkLessonPrep> {
  return {
    place,
    words: await prepNoteFor(
      db,
      state,
      prepWordsAt(lessonCoreOf(state), place),
    ),
    done: state.follows.prep
      .filter((p) => p.place === place)
      .map((p) => p.index),
  };
}

/** 쪽지를 보일 자리(아이 할 일이 준비이거나 준비로 넘길 차례면 그 자리). */
function prepPlaceToShow(step: TalkLessonStep): TalkPrepPlace | null {
  if (step.kind === "prep") return step.place;
  if (step.kind === "advance" && step.to === "prep") return "greeting";
  return null;
}

type LessonPositionView = Pick<
  TalkLessonPosition,
  | "phase"
  | "greetingDone"
  | "talkCount"
  | "moreCount"
  | "moreRound"
  | "moreInRound"
  | "choice"
  | "closingAsked"
  | "closingAnswered"
  | "prepPending"
  | "flashDontKnow"
  | "silentBlocked"
  | "lastCause"
  | "childTurns"
  | "stuckInSlot"
>;

/** 화면 자료의 위치 칸(stuckInSlot — 둘째 막힘부터 힌트 다 열기, plan 보정 11-05 (13)). */
export function positionViewOf(p: TalkLessonPosition): LessonPositionView {
  return {
    phase: p.phase,
    greetingDone: p.greetingDone,
    talkCount: p.talkCount,
    moreCount: p.moreCount,
    moreRound: p.moreRound,
    moreInRound: p.moreInRound,
    choice: p.choice,
    closingAsked: p.closingAsked,
    closingAnswered: p.closingAnswered,
    prepPending: p.prepPending,
    flashDontKnow: p.flashDontKnow,
    silentBlocked: p.silentBlocked,
    lastCause: p.lastCause,
    childTurns: p.childTurns,
    stuckInSlot: p.stuckInSlot,
  };
}

export type TalkLessonView = {
  sessionId: string;
  /** 자료 판(행 수 · 토막 · 끊긴 아이 행) — 쪽이 다시 읽으면 틀을 새로 그리는 열쇠. */
  version: string;
  level: number;
  unit: number;
  lessonNo: number;
  kind: string;
  retry: boolean;
  title: string;
  /** 선생님이 부르는 이름({NAME} 을 화면이 채운다). */
  englishName: string;
  card: { topic: string; todayTopicsKo: string[] };
  spec: { band: string; koMeaning: boolean };
  segment: LessonSegment;
  /** 아이가 지금 할 일. 선생님을 아직 고르지 않았으면(처음 스냅숏 전) choose_teacher. */
  step: TalkLessonStep | { kind: "choose_teacher" };
  /** 위 띠 · 고르기 · 반짝임 · 막힘 화면 재료(위 띠는 '말 주고받기 n' — 분모 없음, 참고 턴을 내리지 않는다). */
  position: LessonPositionView;
  /** 대화 기록(살아 있는 행, 정리 토막 전). 묶음 10 talkLogOf 가 고른다. */
  log: TalkLessonLogRow[];
  current: TalkLessonCurrent | null;
  /** 선생님 말이 없는 마지막 아이 행 — 화면이 같은 시도 id 로 다시 보낸다(8절 · AC-15f). 들리지 않음 행이면 nospeech(묶음 11 재검토 N-3). */
  retryTurn: LessonRetryTurn | null;
  /** 짧은 준비 쪽지(준비 차례 · 준비로 넘길 차례만). */
  prep: TalkLessonPrep | null;
  /** 앱 맞장구 목록(정한 것 20) — 화면이 턴 번호로 고른다(core/conversation/wait-line waitLineOf). */
  waitLines: string[];
  settings: TalkLessonViewSettings;
  pictures: Record<string, PictureInfo>;
  homophones: string[][];
  lemmaEntries: { word: string; forms: string[] }[];
  friendship: { value: number; max: number };
  noticesSeen: Record<(typeof TALK_NOTICE_KINDS)[number], boolean>;
  /** 1-가 하루 안전 상한에 닿았고 참여 완료 전('AI 쉬는 중'). */
  resting: boolean;
  teacher: TeacherView | null;
  teacherChoices: TeacherView[];
  teacherSettings: TalkTeacherSettings;
};

export type LessonRetryTurn = {
  clientAttemptId: string;
  mode: TalkInputMode;
  text: string | null;
  /** 들리지 않음(말소리 없음 출처 '모름')으로 보낸 행이다 — 같은 입력으로 다시 보내고 기록은 회색 '못 들었어요'. */
  nospeech?: true;
};

/** 선생님 말이 없는 마지막 아이 행 → 다시 보낼 자료(시도 id 가 없으면 null). 들리지 않음은 lessonTurnOf 의 nospeech 와 같은 판정이다. */
export function lessonRetryTurnOf(
  orphan: TalkTurnRow | null,
): LessonRetryTurn | null {
  if (!orphan?.clientAttemptId) return null;
  const lite = lessonTurnOf(orphan);
  return {
    clientAttemptId: orphan.clientAttemptId,
    mode: orphan.inputMode ?? "speech",
    text: orphan.text,
    ...(lite.speaker === "child" && lite.nospeech
      ? { nospeech: true as const }
      : {}),
  };
}

/** 새 꼴 카드 · 쪽지 낱말의 그림 키(인사 질문 · 필수 질문 · 더 이야기할 거리 · 오늘 쓸 말 · 쪽지). */
function lessonImageKeysOf(
  card: TalkLessonState["card"],
  prep: TalkLessonPrep | null,
): string[] {
  const g = card.greeting;
  const keys = [
    ...("questions" in g ? g.questions.map((q) => q.imageKey) : []),
    ...card.required.map((i) => i.imageKey),
    ...card.more.map((i) => i.imageKey),
    ...card.todayWords.map((w) => w.imageKey),
    ...(prep?.words ?? []).map((w) => w.imageKey),
  ];
  return [...new Set(keys.flatMap((k) => (k === undefined ? [] : [k])))];
}

/**
 * 회화 화면 자료. 그 프로필의 새 꼴 카드 회화 세션이고 대화가 열려 있으면 자료, 아니면 undefined. 열린 옛 꼴 카드 세션은 끝맺음 없이 닫고
 * undefined 다(정한 것 2 — 쪽이 회화 수업 목록으로). 처음 열 때 한 트랜잭션(세션 행 FOR UPDATE)으로 처음 스냅숏과 첫 선생님 행을 넣는다
 * (AI 없음). 선생님이 없고 처음 스냅숏도 없으면 넣지 않는다(고르는 화면이 처음 스냅숏 앞, 3.3). 이어 할 때는 마지막 선생님 행부터 다시
 * 보인다(AC-15f — AI 호출 없음).
 */
export async function loadTalkLessonView(
  { sessionId }: { sessionId: string },
  deps: TalkServerDeps,
): Promise<TalkLessonView | undefined> {
  if (!z.uuid().safeParse(sessionId).success) return undefined;
  const db: Db = deps.db ?? getDb();
  const profile = await readHouseholdProfile({ db });
  if (!profile) return undefined;
  const at = deps.now();
  const args = { sessionId, profileId: profile.id, at };
  const state = await db.transaction(async (tx) => {
    const any = await readTalkAnyState(tx, { ...args, lock: true });
    if (any?.kind === "old") {
      if (isTalkOpen(any.session))
        await closeOldTalkSession(tx, any.session, {
          profileId: profile.id,
          at,
        });
      return undefined;
    }
    const first = any?.state;
    if (!first || !isTalkOpen(first.session)) return undefined;
    if (!first.teacher && !first.start) return first;
    if (!(await ensureLessonStarted(tx, first, at))) return first;
    return lessonStateFor(tx, args);
  });
  if (!state) return undefined;
  const settings = await lessonViewSettingsOf(db, profile.id);
  const core = lessonCoreOf(state);
  const step: TalkLessonView["step"] = state.start
    ? lessonStepOf(core)
    : { kind: "choose_teacher" };
  const place = step.kind === "choose_teacher" ? null : prepPlaceToShow(step);
  const prep = place ? await prepViewOf(db, state, place) : null;
  const seen = (profile.noticesSeen ?? {}) as Record<string, unknown>;
  const resting =
    state.session.status === "in_progress" &&
    (await aiRestingToday({ profileId: profile.id, at }, { db }));
  return {
    sessionId,
    version: `${state.rows.length}:${state.segment}:${state.orphan?.id ?? ""}`,
    level: state.level,
    unit: state.unit,
    lessonNo: state.lessonRow.lessonNo,
    kind: state.session.kind,
    retry: state.session.kind === "retry",
    title: state.lessonRow.listTitle,
    englishName: profile.toriNickname ?? profile.englishName,
    card: {
      topic: state.card.topic,
      todayTopicsKo: [...state.card.todayTopicsKo],
    },
    spec: { band: state.spec.band, koMeaning: state.spec.koMeaning },
    segment: state.segment,
    step,
    position: positionViewOf(state.position),
    log: lessonLogOf(state.liveRows, {
      card: state.card,
      koMeaning: state.spec.koMeaning,
    }),
    current: currentOf(state),
    retryTurn: lessonRetryTurnOf(state.orphan),
    prep,
    waitLines: seedTalkWaitLines(),
    settings: settings.view,
    pictures: await picturesByKeys(db, lessonImageKeysOf(state.card, prep)),
    homophones: (deps.homophones ?? seedHomophones)(),
    lemmaEntries: state.lemmaEntries,
    friendship: {
      value: await friendshipOf(db, profile.id),
      max: settings.friendship.max,
    },
    noticesSeen: Object.fromEntries(
      TALK_NOTICE_KINDS.map((kind) => [kind, typeof seen[kind] === "string"]),
    ) as TalkLessonView["noticesSeen"],
    resting,
    teacher: state.teacher ? teacherViewOf(state.teacher) : null,
    teacherChoices: state.teacher ? [] : teacherChoicesOf(rosterOf(), profile),
    teacherSettings: settings.teacherSettings,
  };
}

// ── 액션 ─────────────────────────────────────────────────────────

export type LessonMoveOutcome =
  | {
      ok: true;
      segment: LessonSegment;
      step: TalkLessonStep;
      position: LessonPositionView;
      current: TalkLessonCurrent | null;
      prep: TalkLessonPrep | null;
    }
  | {
      ok: false;
      reason: "invalid" | "not_found" | "out_of_order" | "unavailable";
    };

async function moveOutcomeOf(
  tx: Tx,
  args: { sessionId: string; profileId: string; at: Date },
): Promise<LessonMoveOutcome> {
  const after = await lessonStateFor(tx, args);
  if (!after) return { ok: false, reason: "not_found" };
  const step = lessonStepOf(lessonCoreOf(after));
  const place = prepPlaceToShow(step);
  return {
    ok: true,
    segment: after.segment,
    step,
    position: positionViewOf(after.position),
    current: currentOf(after),
    prep: place ? await prepViewOf(tx, after, place) : null,
  };
}

const LessonAdvanceSchema = z.strictObject({
  sessionId: z.uuid(),
  to: z.enum(["prep", "talk"]),
});

/**
 * 토막 넘김 새 갈래(lessonAdvanceOf): 인사 → 짧은 준비 → 대화 첫 질문(앱이 카드 첫 필수 질문을 새 선생님 행으로, AI 없음 — C19), 대화 중 연
 * 준비 끝 → 'Now let's talk.' + 다음 필수 질문(3.3 (나)). 앱이 붙인 질문의 단원 단어는 만남이다.
 */
export async function advanceTalkLesson(
  raw: unknown,
  deps: TalkServerDeps,
): Promise<LessonMoveOutcome> {
  const parsed = LessonAdvanceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const at = deps.now();
    const args = {
      sessionId: parsed.data.sessionId,
      profileId: profile.id,
      at,
    };
    return await db.transaction(async (tx) => {
      const state = await lessonStateFor(tx, { ...args, lock: true });
      if (!state || !isTalkOpen(state.session) || !state.start)
        return { ok: false, reason: "not_found" } as const;
      const decision = lessonAdvanceOf(lessonCoreOf(state), parsed.data.to);
      if (!decision.ok) return { ok: false, reason: "out_of_order" } as const;
      if (decision.segment !== state.segment)
        await tx
          .update(sessions)
          .set({ talkSegment: decision.segment })
          .where(eq(sessions.id, state.session.id));
      if (decision.plan) {
        await insertTeacherRow(tx, {
          sessionId: state.session.id,
          turnNo: nextTurnNoOf(state),
          segment: decision.segment,
          attach: decision.plan.attach,
          move: teacherMoveOf(decision.plan),
          at,
        });
        await writeAskedMet(tx, state, decision.plan.attach);
      }
      return moveOutcomeOf(tx, args);
    });
  } catch (error) {
    logFailure("회화 토막 넘김(새 흐름)", error);
    return { ok: false, reason: "unavailable" };
  }
}

const LessonFollowSchema = z.strictObject({
  sessionId: z.uuid(),
  clientAttemptId: z.string().min(1).max(CLIENT_ATTEMPT_ID_MAX),
  segment: z.enum(["prep", "wrap_up", "again"]),
  index: z.int().min(0),
  target: z.string().max(TALK_TEXT_MAX),
  heard: z.array(z.string().max(TALK_TEXT_MAX)).max(HEARD_MAX),
  failures: z.int().min(0).max(FAILURES_MAX),
  skipped: z.enum(["recognition", "no_mic", "silent", "stalled"]).optional(),
  /** 그 차례의 듣기 사건 요약(C149 · 감시 칸 sp, 정한 것 10 — 글 · 소리 없음). */
  clientListen: ClientListenSchema.optional(),
});

/** 새 흐름 되짚을 말(정리 토막, C33): 선생님이 되풀이한 바른 문장 가운데 오늘 쓸 말이 든 것과 카드 정리 대사. */
function lessonWrapLinesOf(state: TalkLessonState): WrapUpLine[] {
  return wrapUpLinesOf({
    recasts: state.rows.flatMap((r) =>
      r.speaker === "tori" && r.recast ? [r.recast] : [],
    ),
    todayWords: state.card.todayWords.map((w) => w.word),
    closingLines: state.card.closingLines,
    koMeaning: state.spec.koMeaning,
    lemmaOf: state.lemmaOf,
  });
}

/**
 * 따라 말하기 한 차례 새 갈래(짧은 준비 · 정리 · 한 번 더 — AI 없음): attempts 한 행(lessonFollowOf — 같은 시도 id 는 한 번) + 짧은 준비에서
 * 따라 말한 낱말은 만남(3.3, '말했다' 아님) + 영어로 말한 문장 수(인식 글이 있는 발화마다, C41 · AC-12h). 확인 뒤 중단한 회화는 정리 토막이라
 * 정리 따라 말하기를 받는다.
 */
export async function saveLessonFollowAlong(
  raw: unknown,
  deps: TalkServerDeps,
): Promise<FollowOutcome> {
  const parsed = LessonFollowSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const input = parsed.data;
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const at = deps.now();
    return await db.transaction(async (tx) => {
      const state = await lessonStateFor(tx, {
        sessionId: input.sessionId,
        profileId: profile.id,
        lock: true,
        at,
      });
      if (
        !state?.start ||
        (state.session.status === "aborted" && state.segment !== "wrap_up")
      )
        return { ok: false, reason: "not_found" } as const;
      const follow = lessonFollowOf(
        lessonCoreOf(state),
        {
          segment: input.segment,
          index: input.index,
          target: input.target,
          heard: input.heard,
          failures: input.failures,
          ...(input.skipped ? { skipped: input.skipped } : {}),
          ...(input.clientListen ? { clientListen: input.clientListen } : {}),
        },
        lessonWrapLinesOf(state).length,
      );
      if (!follow || !parseTalkAttemptInput(follow.input))
        return { ok: false, reason: "invalid" } as const;
      const inserted = await tx
        .insert(attempts)
        .values({
          sessionId: state.session.id,
          clientAttemptId: input.clientAttemptId,
          activityNo: follow.activityNo,
          input: follow.input,
          attemptedAt: at,
          status: "done",
        })
        .onConflictDoNothing({ target: attempts.clientAttemptId })
        .returning({ id: attempts.id });
      if (inserted.length === 0) return { ok: true, saved: false } as const;
      // 근거 칸(attempts.evidence, validity 연습) 쓰기 줄은 여기에 든다(정한 것 22). P12 의 열 · 함수가 아직 없어 넣지 않고,
      // 그 회화 묶음 때 있으면 그 묶음이, 없으면 P12 평10 이 뒤에 넣는다.
      if (follow.met.length > 0)
        await writeSay(tx, {
          profileId: state.profileId,
          met: follow.met,
          said: [],
          day: state.learningDay,
          knownDays: snapshotNumber(state, "talk.known_days"),
        });
      const delta = followSentenceDelta(input.segment, input.heard);
      if (delta > 0)
        await tx
          .update(sessions)
          .set({
            englishSentences: sql`${sessions.englishSentences} + ${delta}`,
          })
          .where(eq(sessions.id, state.session.id));
      return { ok: true, saved: true } as const;
    });
  } catch (error) {
    logFailure("회화 따라 말하기 저장(새 흐름)", error);
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * '더 이야기하기' 새 갈래(lessonMoreOf, 정한 것 11): 마무리 물음 · 마무리 제안 뒤 고를 차례에서만. 앱이 더 이야기할 거리 하나를 새 카드 자리
 * 선생님 행으로 붙인다(AI 호출 · 턴 셈 없음). 마무리 물음에 답한 것이면 더 이야기하기 토막과 참여 완료(closing.ts completeTalk — 진행일 때만
 * 완료 · 학습일 · 친한 정도 · 이음매 completed, 세션마다 한 번).
 */
export async function chooseLessonMoreTalk(
  raw: unknown,
  deps: TalkServerDeps,
): Promise<LessonMoveOutcome> {
  const parsed = SessionIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const at = deps.now();
    const rules = await friendshipRulesOf(db, profile.id);
    const args = {
      sessionId: parsed.data.sessionId,
      profileId: profile.id,
      at,
    };
    return await db.transaction(async (tx) => {
      const state = await lessonStateFor(tx, { ...args, lock: true });
      if (!state || !isTalkOpen(state.session) || !state.start)
        return { ok: false, reason: "not_found" } as const;
      const decision = lessonMoreOf(lessonCoreOf(state));
      if (!decision.ok) return { ok: false, reason: "out_of_order" } as const;
      if (decision.complete) await completeTalk(tx, { state, at, rules });
      if (decision.segment !== state.segment)
        await tx
          .update(sessions)
          .set({ talkSegment: decision.segment })
          .where(eq(sessions.id, state.session.id));
      const attach: TeacherAttachLine[] = [
        {
          kind: "question",
          role: "card",
          en: decision.line.en,
          ...(decision.line.ko === undefined ? {} : { ko: decision.line.ko }),
          item: { ...decision.move.item },
        },
      ];
      await insertTeacherRow(tx, {
        sessionId: state.session.id,
        turnNo: nextTurnNoOf(state),
        segment: decision.segment,
        attach,
        move: decision.move,
        at,
      });
      await writeAskedMet(tx, state, attach);
      return moveOutcomeOf(tx, args);
    });
  } catch (error) {
    logFailure("회화 더 이야기하기(새 흐름)", error);
    return { ok: false, reason: "unavailable" };
  }
}

/** 새 갈래 마무리 자료(옛 WrapView 꼴 그대로 — 마무리 화면이 같은 칸을 읽는다). */
async function lessonWrapViewOf(
  db: Db,
  state: TalkLessonState,
  { aborted, at }: { aborted: boolean; at: Date },
): Promise<WrapView> {
  const today = state.card.todayWords.map((w) => w.word);
  // 다지기 · 보강(오늘 쓸 말 없음)은 짧은 준비에서 보인 낱말을 오늘 만난 단어로
  const shown = today.length > 0 ? today : state.prepWords;
  const info = await prepNoteFor(db, state, shown);
  const talkText = state.rows
    .filter((r) => r.segment !== "wrap_up")
    .map((r) => r.text ?? "")
    .join("\n");
  const inTalk = new Set(
    metWordsIn(talkText, { unitWords: shown, lemmaOf: state.lemmaOf }),
  );
  const farewell = farewellOf({
    closing: null,
    card: state.card,
    koMeaning: state.spec.koMeaning,
  });
  const retry = state.session.kind === "retry";
  const values = await getSettings(
    {
      "reward.star_complete": z.number().int().nonnegative(),
      "talk.friendship_max": z.int().min(1),
    },
    { db, profileId: state.profileId },
  );
  return {
    lines: lessonWrapLinesOf(state),
    farewell: {
      en: farewell.en,
      ...(farewell.ko === undefined ? {} : { ko: farewell.ko }),
    },
    aborted,
    retry,
    kind: state.session.kind,
    starsPerLesson: values["reward.star_complete"] as number,
    metWords: info.map((w) => ({
      word: w.word,
      meaningKo: w.meaningKo,
      example: w.example,
      inTalk: inTalk.has(w.word),
    })),
    friendship: retry
      ? null
      : {
          value: await friendshipOf(db, state.profileId),
          max: values["talk.friendship_max"] as number,
        },
    nextLesson: await nextTalkLessonOf(db, at),
  };
}

/**
 * '그만하기' 새 갈래(lessonStopOf, 정한 것 12 · 3.3 끝난 길 표): 참여가 거의 없을 때만 확인(needs_confirm — C34 쪽지 글 그대로). 끝난 길이
 * 참여 완료면 아직 진행인 세션만 completeTalk(완료 · 학습일 · 친한 정도 · 이음매), 확인 뒤 그만두기면 중단 · 학습일 · 이음매 aborted.
 * 정리 토막으로 닫고 끝맺음 기록(insertLessonClosing — 끝난 길 까닭, 'AI 쉬는 중'이면 대기만 · 중단이면 건너뜀)을 넣으며, 끝맺음 턴은 응답 뒤
 * (AC-8c). 마무리 자료를 돌려준다.
 */
export async function stopTalkLesson(
  raw: unknown,
  deps: TalkServerDeps,
): Promise<StopOutcome> {
  const parsed = StopSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const at = deps.now();
    const resting = await aiRestingToday({ profileId: profile.id, at }, { db });
    const rules = await friendshipRulesOf(db, profile.id);
    const done = await db.transaction(async (tx) => {
      const state = await lessonStateFor(tx, {
        sessionId: parsed.data.sessionId,
        profileId: profile.id,
        lock: true,
        at,
      });
      if (!state || !isTalkOpen(state.session) || !state.start)
        return { ok: false, reason: "not_found" } as const;
      const decision = lessonStopOf(lessonCoreOf(state), parsed.data.confirmed);
      if (decision.kind === "needs_confirm")
        return { ok: false, reason: "needs_confirm" } as const;
      const aborted = decision.end.outcome === "aborted";
      if (decision.complete) await completeTalk(tx, { state, at, rules });
      await tx
        .update(sessions)
        .set({
          talkSegment: "wrap_up",
          ...(aborted
            ? { status: "aborted" as const, learningDay: state.learningDay }
            : {}),
        })
        .where(eq(sessions.id, state.session.id));
      if (aborted)
        await onTalkSessionEnded(tx, {
          sessionId: state.session.id,
          profileId: state.profileId,
          ended: "aborted",
        });
      const closing = await insertLessonClosing(tx, {
        sessionId: state.session.id,
        at,
        end: decision.end,
        resting,
      });
      return { ok: true, state, aborted, schedule: closing.schedule } as const;
    });
    if (!done.ok) return done;
    if (done.schedule) scheduleTalkClosing(done.state.session.id, deps);
    return {
      ok: true,
      wrap: await lessonWrapViewOf(db, done.state, {
        aborted: done.aborted,
        at,
      }),
    };
  } catch (error) {
    logFailure("회화 그만하기(새 흐름)", error);
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * '홈' 새 갈래(3.3 '회화 화면에서 홈'): 참여 완료 전(진행)이면 아무것도 바꾸지 않는다(다시 열면 마지막 선생님 행부터 — AC-15f). 참여 완료 뒤
 * (마무리 물음에 답하고 더 이야기하는 중)면 정리 토막으로 닫고 끝맺음 기록(leave)을 넣어 응답 뒤 끝맺음, 마무리 첫 장 자료. 이미 닫혔으면 그대로.
 */
export async function leaveTalkLesson(
  raw: unknown,
  deps: TalkServerDeps,
): Promise<LeaveOutcome> {
  const parsed = SessionIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const at = deps.now();
    const resting = await aiRestingToday({ profileId: profile.id, at }, { db });
    const done = await db.transaction(async (tx) => {
      const state = await lessonStateFor(tx, {
        sessionId: parsed.data.sessionId,
        profileId: profile.id,
        lock: true,
        at,
      });
      if (!state) return { ok: false, reason: "not_found" } as const;
      if (!isTalkOpen(state.session))
        return { ok: true, closed: true, state: null } as const;
      if (state.session.status === "in_progress")
        return { ok: true, closed: false } as const;
      await tx
        .update(sessions)
        .set({ talkSegment: "wrap_up" })
        .where(eq(sessions.id, state.session.id));
      const recorded = await insertClosingRecord(tx, {
        sessionId: state.session.id,
        at,
        reason: "leave",
      });
      return {
        ok: true,
        closed: true,
        state,
        schedule: recorded && !resting,
      } as const;
    });
    if (!done.ok) return done;
    if (!done.closed) return { ok: true, closed: false };
    if (!done.state) return { ok: true, closed: true, wrap: null };
    if (done.schedule) scheduleTalkClosing(done.state.session.id, deps);
    return {
      ok: true,
      closed: true,
      wrap: await lessonWrapViewOf(db, done.state, { aborted: false, at }),
    };
  } catch (error) {
    logFailure("회화 홈(새 흐름)", error);
    return { ok: false, reason: "unavailable" };
  }
}

/** 닫힌 새 꼴 회화(정리 토막)의 마무리 자료(옛 readTalkWrap 의 새 갈래 — 턴 응답이 대화를 닫은 뒤 화면이 읽는다). AI 없음. */
export async function readTalkLessonWrap(
  raw: unknown,
  deps: Pick<TalkServerDeps, "db" | "now">,
): Promise<WrapOutcome> {
  const parsed = SessionIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const at = deps.now();
    const state = await lessonStateFor(db, {
      sessionId: parsed.data.sessionId,
      profileId: profile.id,
      at,
    });
    if (state?.segment !== "wrap_up") return { ok: false, reason: "not_found" };
    return {
      ok: true,
      wrap: await lessonWrapViewOf(db, state, {
        aborted: state.session.status === "aborted",
        at,
      }),
    };
  } catch (error) {
    logFailure("회화 마무리 자료(새 흐름)", error);
    return { ok: false, reason: "unavailable" };
  }
}

const LessonRevealSchema = z.strictObject({
  sessionId: z.uuid(),
  tier: z.int().min(0),
});

/**
 * 새 꼴 세션 힌트 단 하나의 글(옛 revealTalkHint 의 새 갈래, 검토 I-1): 아이가 '힌트'를 눌러 연 단만(1~3단계 영어 문장을 미리 내리지 않음,
 * 3.3 · CLAUDE.md). 지금 질문 자리의 단(lessonHintTextOf)이 없으면 ok 거짓. 연 단 수는 따로 쓰지 않는다 — 화면이 다음 턴 요청의 hint.opened 로
 * 보내고 턴 길이 아이 행 hint_kind · hint_level 로 남긴다(lesson-turn lessonChildRowOf, 같은 단 함수). AI 없음.
 */
export async function revealTalkLessonHint(
  raw: unknown,
  deps: Pick<TalkServerDeps, "db" | "now">,
): Promise<{ ok: true; text: string } | { ok: false }> {
  const parsed = LessonRevealSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false };
    const state = await lessonStateFor(db, {
      sessionId: parsed.data.sessionId,
      profileId: profile.id,
      at: deps.now(),
    });
    if (!state || !isTalkOpen(state.session)) return { ok: false };
    const text = lessonHintTextOf(state, parsed.data.tier);
    return text === null ? { ok: false } : { ok: true, text };
  } catch (error) {
    logFailure("회화 힌트(새 흐름)", error);
    return { ok: false };
  }
}
