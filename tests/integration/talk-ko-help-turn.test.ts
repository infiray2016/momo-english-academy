// 한국어 도움 뒤 다음 영어 턴 통합 시험(수업 안 한국어로 묻기 plan 묶음 4-다 · 검토 rev-b4c I-2 — 이 기기에서는 돌지 않고 CI 에서 돈다). 시험용 시드의
// 회화 1단계 단원 1 수업으로 세션을 넣고 talk_turns 를 대화 첫 질문(아이 차례가 열린 상태)까지 넣은 뒤, 그 차례의 한국어 도움 행(talk_ko_helps)을
// 바로 넣고 runTalkTurnRequest 를 가짜 Anthropic 으로 부른다. 1단계는 1~3단계 구간이라 가르친 표현은 소리로만 준 글이다(heard).
// 증명(검토 5절): (a) AC-25j 도움을 끼운 것과 뺀 것의 행 · 끝 줄 · 집계가 힌트 종류와 한 줄 밖에는 같다 (b) AC-25c 한 줄의 자리 (c) 기기 값 적기의
// 좁힘 (d) 같은 시도 id 다시 부르기 (e) 1~3단계 heard (f) 답 없는 행 · 대신 줄 (g) '말했다'만 거르고 '만났다'는 든다(I-1) (h) AC-25o 막힘 무름 ·
// 귀띔 줄 (i) 도움 뒤 '잘 모르겠어요' (j) Claude 주도 방식의 대화 토막 (j-인사) 같은 수업의 인사 토막 (k) AC-N26 묻지 않은 턴은 글자까지 같다. 묶음
// 4-라(Claude 주도 방식): (l) 사실 알림 · 힌트 종류 · '말했다' (m) 막힘 무름 (n) 되묻기 길 · 끝 줄 koCarry (o) 묻지 않은 턴 (p) 받을 차례 · 호출 입력.
// 이야기 방식 수업의 몫(묶음 K — 한국어 도움을 읽고 기기 값을 적는다)은 talk-chat-ko-help.test.ts 가 덮는다(통합 정리 int-merge 에서 (j-이야기)를 옮김).
// 견주는 세션은 모두 같은 돌림 번호의 세션 id 로 넣는다(rotationKeyId — 1~3단계 상황 차례의 'Example line' 이 세션 id 로 돌기 때문, 고침 2 (다)).
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import { talkMoveOf } from "@/core/conversation/move";
import { situationRotationOf } from "@/core/conversation/situation";
import { createStageTimer } from "@/core/conversation/timing";
import { learningDayOf } from "@/core/learning-day";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { LEVEL_MAX } from "@/core/seed/structure";
import { lessons, vocab } from "@/db/schema/content";
import {
  sessions,
  talkKoHelps,
  talkTurns,
  vocabProgress,
} from "@/db/schema/learning";
import { settings } from "@/db/schema/operations";
import { maskerFor } from "@/server/ai/run";
import { advanceTalkLesson, loadTalkLessonView } from "@/server/conversation";
import { runTalkKoHelpRequest } from "@/server/conversation/ko-help";
import { runLeadOpenTurn } from "@/server/conversation/lead-turn";
import {
  type TalkLessonLine,
  TURN_IN_FLIGHT_MS,
} from "@/server/conversation/lesson-turn";
import { runTalkTurnRequest, turnSettings } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import { loadSeed } from "@/server/seed/load";
import { getOutputCheckLists } from "@/server/seed-lists";
import { levelContextOf } from "@/server/session/ai-context";
import { getSettings } from "@/server/settings";
import { talkKoHelpRule } from "../fixtures/ai/fake-anthropic";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  harnessOf,
  LEAD_STATUS_MARK,
  LOADED_AT,
  LOW_MODEL,
  leadTurnRule,
  lessonTurnRule,
  MS_PER_MINUTE,
  NOW,
  resetHousehold,
  setHouseholdSetting,
  type TalkHarness,
  TURN_MARK,
} from "./talk-fixture";
import { createTestDatabase, type TestDatabase } from "./test-db";

let testDb: TestDatabase;
let db: Db;
let h: TalkHarness;
let lessonId: string;
let lessonRevision: number;
let card: ReturnType<typeof TalkLessonSchema.parse>["card"];
/** 단원 단어 가운데 낱말 하나짜리(뜻 도움의 한국어 답에 글자로 든 낱말 — '말했다' 거름 시험). */
let unitWord: string;
/** 회화 1단계 단원 1 의 단원 단어(막힘 표본의 전제 확인). */
let unitWords: readonly string[] = [];

const TAUGHT = "I like gimbap.";
const LINE = `Korean help before this answer: taught '${TAUGHT}'`;
const MEANING_LINE = "Korean help before this answer: meaning only";
const KO_LINE_HEAD = "Korean help before this answer:";
/** Claude 주도 방식 사실 알림의 한국어 도움 줄(13절 C240 · 묶음 4-라). */
const LEAD_KO_HEAD = "The child asked in Korean and was taught:";
const LEAD_KO_LINE = `${LEAD_KO_HEAD} "${TAUGHT}".`;
/** 막힘 무름 표본의 가르친 표현(두 낱말 — 영어 낱말 셋 이상이면 앱이 원래 막힘으로 보지 않는다). */
const STUCK_TAUGHT = "Kimchi stew.";
/** 그날의 학습일(state.ts loadTalkLessonState 의 learningDayOf(at, app.timezone, app.day_start_hour) — 시험 시계는 NOW). */
const TODAY = learningDayOf(
  NOW,
  TEST_SETTINGS["app.timezone"].value,
  TEST_SETTINGS["app.day_start_hour"].value,
);

/**
 * 상황 줄 · 예의 돌림 번호가 0 인 새 세션 id(talk-discard-listen.test.ts sameRotationIdAs 와 같은 방법 — CI 42361488670 AC-24m). 돌림 번호는
 * 턴 번호 + 세션 id 의 값(situationRotationOf)이라, 견주는 세션을 모두 이 id 로 넣으면 같은 턴 번호에서 같은 'Example line' 을 받는다.
 */
function rotationKeyId(): string {
  for (;;) {
    const id = randomUUID();
    if (situationRotationOf(0, id) === 0) return id;
  }
}

beforeAll(async () => {
  testDb = await createTestDatabase();
  db = testDb.db;
  const report = await loadSeed(db, {
    files: filesOf(devSeedTree()),
    completeThrough: DEV_SEED_THROUGH,
    areas: [...DEV_SEED_AREAS],
    now: LOADED_AT,
  });
  if (report.outcome !== "loaded") throw new Error("시험 시드 적재 실패");
  await db
    .update(settings)
    .set({ value: LEVEL_MAX })
    .where(
      and(
        eq(settings.key, "seed.complete_through_level"),
        isNull(settings.profileId),
      ),
    );
  const [row] = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "talk"),
        eq(lessons.level, 1),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, 1),
      ),
    );
  if (!row) throw new Error("회화 1단계 단원 1 수업 1 이 없다");
  lessonId = row.id;
  lessonRevision = row.revision;
  card = TalkLessonSchema.parse(row.content).card;
  const words = (
    await levelContextOf(
      { area: "talk", level: 1, unit: 1, revision: row.revision },
      { db },
    )
  ).unitWords;
  unitWords = words;
  const single = words.find((w) => /^[a-z]{3,}$/.test(w));
  if (!single) throw new Error("낱말 하나짜리 단원 단어가 없다");
  unitWord = single;
});

afterAll(async () => {
  await testDb?.drop();
});

beforeEach(async () => {
  h = harnessOf(db);
  await setHouseholdSetting(db, "talk.ko_ask_mode", "on");
  await setHouseholdSetting(db, "talk.lead_mode", "app");
});

// ── 도우미 ──────────────────────────────────────────────────────

/** 세션 하나를 대화 첫 질문(필수 1, 아이 차례가 열림)까지 넣는다(talk-ko-help.test.ts 와 같은 꼴, id 는 같은 돌림 번호). */
async function openSession(profileId: string): Promise<string> {
  const [session] = await db
    .insert(sessions)
    .values({
      id: rotationKeyId(),
      profileId,
      area: "talk",
      level: 1,
      unit: 1,
      lessonId,
      kind: "regular",
      talkSegment: "talk",
      status: "in_progress",
      startedAt: NOW,
      seedRevision: lessonRevision,
      seedCorrection: 0,
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("세션을 넣지 못했다");
  const first = card.required[0];
  if (!first) throw new Error("필수 질문이 없다");
  const greeting = "questions" in card.greeting ? card.greeting.questions : [];
  let turnNo = 1;
  for (const [i, q] of greeting.slice(0, card.greetingTurns).entries()) {
    await db.insert(talkTurns).values([
      {
        sessionId: session.id,
        turnNo,
        segment: "greeting",
        speaker: "tori",
        text: q.question.en,
        move: talkMoveOf({ kind: i === 0 ? "first_question" : "card_slot" }),
        recordedAt: NOW,
      },
      {
        sessionId: session.id,
        turnNo,
        segment: "greeting",
        speaker: "child",
        text: q.answerExample,
        inputMode: "speech",
        clientAttemptId: `greet-${session.id}-${i}`,
        recordedAt: NOW,
      },
    ]);
    turnNo += 1;
  }
  await db.insert(talkTurns).values([
    {
      sessionId: session.id,
      turnNo,
      segment: "greeting",
      speaker: "tori",
      text: "Great!",
      move: talkMoveOf({ kind: "ai" }),
      recordedAt: NOW,
    },
    {
      sessionId: session.id,
      turnNo: turnNo + 1,
      segment: "talk",
      speaker: "tori",
      text: first.en,
      move: talkMoveOf({
        kind: "first_question",
        item: { kind: "required", no: first.no },
        words: [...first.targets],
        goals: [...first.goals],
      }),
      recordedAt: NOW,
    },
  ]);
  return session.id;
}

async function rowsOf(sessionId: string) {
  return (
    await db.select().from(talkTurns).where(eq(talkTurns.sessionId, sessionId))
  ).sort(
    (a, b) =>
      a.turnNo - b.turnNo ||
      (a.speaker === b.speaker ? 0 : a.speaker === "tori" ? -1 : 1),
  );
}

/** 지금 열린 아이 차례의 턴 번호(마지막 선생님 행 — 아이 행이 같은 번호로 들어간다). */
async function openTurnNo(sessionId: string): Promise<number> {
  return (await rowsOf(sessionId)).reduce((m, r) => Math.max(m, r.turnNo), 0);
}

let helpNo = 0;
type HelpRow = typeof talkKoHelps.$inferInsert;

/** 답이 있는 한국어 도움 행 하나(기본은 1~3단계 표현 갈래 — 가르친 표현은 소리로만, 새로 보인 영어 글 없음). */
async function addHelp(
  sessionId: string,
  turnNo: number,
  over: Partial<HelpRow> = {},
) {
  helpNo += 1;
  const [row] = await db
    .insert(talkKoHelps)
    .values({
      sessionId,
      turnNo,
      seq: 1,
      clientAttemptId: `ko-turn-${helpNo}`,
      question: "김밥 좋다고 어떻게 말해?",
      kind: "expression",
      sayKo: "김밥이 좋다고 말하고 싶구나. 이렇게 말해 봐.",
      teachEn: TAUGHT,
      shownEn: [],
      textShown: false,
      fallback: "none",
      askedAt: NOW,
      answeredAt: NOW,
      ...over,
    })
    .returning();
  if (!row) throw new Error("도움 행을 넣지 못했다");
  return row;
}

let attemptNo = 0;
type TurnInput = {
  mode?: "speech" | "dont_know";
  text?: string;
  koHelp?: unknown;
  clientAttemptId?: string;
  leadText?: boolean;
};

async function turn(
  sessionId: string,
  {
    mode = "speech",
    text = TAUGHT,
    koHelp,
    clientAttemptId,
    leadText = false,
  }: TurnInput = {},
): Promise<TalkLessonLine[]> {
  const lines: TalkLessonLine[] = [];
  attemptNo += 1;
  await runTalkTurnRequest(
    {
      sessionId,
      clientAttemptId: clientAttemptId ?? `ko-turn-a-${attemptNo}`,
      input: mode === "speech" ? { mode, text } : { mode },
      hint: { opened: 0, heard: [] },
      ...(koHelp === undefined ? {} : { koHelp }),
    },
    {
      ...h.deps(),
      ...(leadText ? { leadText: () => TALK_LEAD_TEXT_L3U1 } : {}),
      write: (line) => lines.push(line as TalkLessonLine),
      requestReceivedAt: h.clock.now,
    },
  );
  return lines;
}

const turnRequests = () =>
  h.fake.requests.filter((r) => r.bodyText.includes(TURN_MARK));
const leadRequests = () =>
  h.fake.requests.filter((r) => r.bodyText.includes(LEAD_STATUS_MARK));

async function lastChild(sessionId: string) {
  const child = (await rowsOf(sessionId))
    .filter((r) => r.speaker === "child")
    .at(-1);
  if (!child) throw new Error("아이 행이 없다");
  return child;
}

const helpRowsOf = (sessionId: string) =>
  db.select().from(talkKoHelps).where(eq(talkKoHelps.sessionId, sessionId));

/** 행 · 끝 줄을 세션과 상관없이 견줄 꼴(id · 세션 · 시도 id · 적은 때를 뺀다). */
function comparableRows(rows: Awaited<ReturnType<typeof rowsOf>>) {
  return rows.map(
    ({
      id: _id,
      sessionId: _s,
      clientAttemptId: _c,
      recordedAt: _r,
      ...rest
    }) => rest,
  );
}
const comparableLines = (lines: TalkLessonLine[], sessionId: string) =>
  JSON.parse(JSON.stringify(lines).replaceAll(sessionId, "SESSION"));

/**
 * 한 가족 · 한 세션에서 도움(있으면)을 넣고 같은 가짜 응답으로 한 턴을 부른다. 행 · 아이 행은 부른 바로 뒤의 사본이다 — 다음 scenario 의
 * resetHousehold 가 프로필을 지워 앞 세션의 행이 함께 지워지므로(profiles → sessions → talk_turns 연쇄 삭제), 견줄 값은 이 사본으로 본다.
 */
async function scenario(
  answer: Record<string, unknown>,
  {
    help,
    input = {},
  }: {
    help?: (sessionId: string, turnNo: number) => Promise<unknown>;
    input?: TurnInput | ((turnNo: number) => TurnInput);
  } = {},
) {
  const profileId = await resetHousehold(db, 1);
  const sessionId = await openSession(profileId);
  const turnNo = await openTurnNo(sessionId);
  if (help) await help(sessionId, turnNo);
  h.fake.push(lessonTurnRule(answer));
  const before = turnRequests().length;
  const lines = await turn(
    sessionId,
    typeof input === "function" ? input(turnNo) : input,
  );
  const sent = turnRequests().slice(before);
  const rows = await rowsOf(sessionId);
  const child = await lastChild(sessionId);
  return { profileId, sessionId, turnNo, lines, sent, rows, child };
}

// ── (a) · (b) · (k) 같은 표본에 도움을 끼운 것과 뺀 것 ─────────────────────

describe("AC-25j AC-25c AC-N26 기존 방식 — 도움을 끼운 턴과 뺀 턴", () => {
  const ANSWER = { tori_en: "Yummy! I like it too.", self_used_words: [] };

  it("(k) AC-N26 묻지 않은 턴은 칸이 없어도 · 빈 칸이어도 · 맞는 도움 행이 없어도 요청 수와 요청 본문 · 저장 행이 글자까지 같다", async () => {
    const plain = await scenario(ANSWER);
    const plainRows = comparableRows(plain.rows);
    expect(plain.sent).toHaveLength(1);
    for (const koHelp of [[], [{ turnNo: 99, seq: 1, heard: false }]]) {
      const run = await scenario(ANSWER, {
        input: (turnNo) => ({
          koHelp: koHelp.length === 0 ? [] : [{ ...koHelp[0], turnNo }],
        }),
      });
      expect(run.sent).toHaveLength(plain.sent.length);
      expect(run.sent[0]?.bodyText).toBe(plain.sent[0]?.bodyText);
      expect(comparableRows(run.rows)).toEqual(plainRows);
      expect(comparableLines(run.lines, run.sessionId)).toEqual(
        comparableLines(plain.lines, plain.sessionId),
      );
      expect(await helpRowsOf(run.sessionId)).toHaveLength(0);
    }
    expect(plain.sent[0]?.bodyText).not.toContain(KO_LINE_HEAD);
  });

  it("(a) AC-25j 1~3단계 표현 도움(들었음)을 끼운 턴은 아이 행의 힌트 종류와 보낸 사용자 메시지의 도움 몫(한 줄 · 힌트 종류를 싣는 Hint 줄) 밖에는 행 · 끝 줄(흐름 자리 · 다음 계획 · 집계) · 요청 본문이 뺀 턴과 같다", async () => {
    const plain = await scenario(ANSWER);
    const helped = await scenario(ANSWER, {
      help: (sessionId, turnNo) => addHelp(sessionId, turnNo),
      input: (turnNo) => ({ koHelp: [{ turnNo, seq: 1, heard: true }] }),
    });
    const plainChild = plain.child;
    const helpedChild = helped.child;
    expect(plainChild.hintKind).toBe("none");
    expect(helpedChild.hintKind).toBe("english");
    expect(plainChild.sentUserMessage).not.toContain(KO_LINE_HEAD);
    expect(helpedChild.sentUserMessage).toContain(LINE);
    // 사용자 메시지에서 도움 몫은 한 줄과, 올린 힌트 종류를 그대로 싣는 'Hint:' 줄이다(talk-lesson.ts talkLessonUserMessage 의
    // `Hint: ${turn.hintKind} (${turn.hintTier})` — turn.hintKind 는 lesson-turn.ts 가 올려 저장한 아이 행의 값). 둘을 되돌리면 같다
    const unhelped = (text: string | null | undefined, nl: string) =>
      (text ?? "")
        .replace(`${nl}${LINE}`, "")
        .replace(`${nl}Hint: english (`, `${nl}Hint: none (`);
    expect(helpedChild.sentUserMessage).toContain("\nHint: english (0)");
    expect(unhelped(helpedChild.sentUserMessage, "\n")).toBe(
      plainChild.sentUserMessage,
    );
    const strip = (rows: Awaited<ReturnType<typeof rowsOf>>) =>
      comparableRows(rows).map(
        ({ hintKind: _k, sentUserMessage: _m, ...rest }) => rest,
      );
    expect(strip(helped.rows)).toEqual(strip(plain.rows));
    // 같은 돌림 번호라 보낸 요청 본문(JSON — 줄바꿈은 \n 두 글자)도 도움 몫 밖에는 글자까지 같다(1~3단계 상황 차례의 'Example line' 까지)
    expect(unhelped(helped.sent[0]?.bodyText, "\\n")).toBe(
      plain.sent[0]?.bodyText,
    );
    expect(comparableLines(helped.lines, helped.sessionId)).toEqual(
      comparableLines(plain.lines, plain.sessionId),
    );
  });

  it("(b) AC-25c 가짜 Anthropic 이 받은 사용자 메시지에 한 줄이 한 번, 아이 말 줄(과 귀띔 줄) 바로 뒤에 있다", async () => {
    const helped = await scenario(ANSWER, {
      help: (sessionId, turnNo) => addHelp(sessionId, turnNo),
    });
    expect(helped.sent).toHaveLength(1);
    const child = await lastChild(helped.sessionId);
    const message = child.sentUserMessage ?? "";
    expect(message.split(LINE)).toHaveLength(2);
    const lines = message.split("\n");
    const at = lines.indexOf(LINE);
    expect(at).toBeGreaterThan(0);
    expect(lines[at - 1]).toMatch(/^Child: |^Heard hint/);
    expect(helped.sent[0]?.bodyText).toContain(LINE);
    // 칸이 없으면 들은 것으로 본다(e)
    expect(child.hintKind).toBe("english");
  });
});

// ── (c) · (e) 기기 값 적기와 1~3단계 heard ────────────────────────────

describe("기기 값 적기의 좁힘 · 1~3단계 들려주지 못한 표현", () => {
  it("(c) (e) heard · replays 는 그 세션 · 지금 턴 번호 · 순번이 맞는 행에만 적히고, 들려주지 못한 표현(heard 거짓)은 힌트 종류 그대로 · 한 줄 없음", async () => {
    const profileId = await resetHousehold(db, 1);
    // 다른 세션(같은 턴 번호 · 순번의 행 — 고치면 안 된다)
    const [other] = await db
      .insert(sessions)
      .values({
        profileId,
        area: "talk",
        level: 1,
        unit: 1,
        lessonId,
        kind: "regular",
        talkSegment: "talk",
        status: "aborted",
        startedAt: new Date(NOW.getTime() - 60 * MS_PER_MINUTE),
        seedRevision: lessonRevision,
        seedCorrection: 0,
      })
      .returning({ id: sessions.id });
    if (!other) throw new Error("다른 세션을 넣지 못했다");
    const sessionId = await openSession(profileId);
    const turnNo = await openTurnNo(sessionId);
    const otherRow = await addHelp(other.id, turnNo);
    const earlier = await addHelp(sessionId, turnNo - 1);
    const mine = await addHelp(sessionId, turnNo);
    const second = await addHelp(sessionId, turnNo, { seq: 2 });
    h.fake.push(lessonTurnRule({ tori_en: "Yummy!" }));
    await turn(sessionId, {
      koHelp: [
        { turnNo, seq: 1, heard: false, replays: 3 },
        { turnNo: turnNo - 1, seq: 1, heard: false, replays: 5 },
        { turnNo, seq: 9, heard: false, replays: 6 },
      ],
    });
    const byId = new Map(
      [...(await helpRowsOf(sessionId)), ...(await helpRowsOf(other.id))].map(
        (r) => [r.id, r],
      ),
    );
    expect(byId.get(mine.id)).toMatchObject({ heard: false, replays: 3 });
    for (const untouched of [otherRow, earlier, second])
      expect(byId.get(untouched.id)).toMatchObject({
        heard: null,
        replays: null,
      });
    // 지금 차례의 둘째 행(seq 2)은 칸이 없어 들은 것으로 본다 → 그 행이 '영어' · 한 줄
    const child = await lastChild(sessionId);
    expect(child.hintKind).toBe("english");
    expect(child.sentUserMessage).toContain(LINE);
  });

  it("(e) 1~3단계 지금 차례의 표현을 한 번도 들려주지 못했으면(heard 거짓) 힌트 종류 그대로 · 한 줄 없음", async () => {
    const run = await scenario(
      { tori_en: "Yummy!" },
      {
        help: (sessionId, turnNo) => addHelp(sessionId, turnNo),
        input: (turnNo) => ({ koHelp: [{ turnNo, seq: 1, heard: false }] }),
      },
    );
    const child = await lastChild(run.sessionId);
    expect(child.hintKind).toBe("none");
    expect(child.sentUserMessage).not.toContain(KO_LINE_HEAD);
    expect(run.sent[0]?.bodyText).not.toContain(KO_LINE_HEAD);
  });
});

// ── (d) 같은 시도 id 로 다시 부르기 ──────────────────────────────────

describe("같은 시도 id 로 다시 부르기(끊긴 아이 행)", () => {
  it("(d) 한 줄은 첫 부름과 같이 나가고, 아이 행의 힌트 종류는 다시 바뀌지 않으며 도움 행에 기기 값을 적지 않는다", async () => {
    const profileId = await resetHousehold(db, 1);
    const sessionId = await openSession(profileId);
    const turnNo = await openTurnNo(sessionId);
    const help = await addHelp(sessionId, turnNo);
    await db.insert(talkTurns).values({
      sessionId,
      turnNo,
      segment: "talk",
      speaker: "child",
      text: TAUGHT,
      inputMode: "speech",
      hintKind: "none",
      clientAttemptId: "ko-orphan-1",
      recordedAt: NOW,
    });
    h.clock.now = new Date(NOW.getTime() + TURN_IN_FLIGHT_MS + 1000);
    h.fake.push(lessonTurnRule({ tori_en: "Yummy!" }));
    const lines = await turn(sessionId, {
      clientAttemptId: "ko-orphan-1",
      koHelp: [{ turnNo, seq: 1, replays: 7 }],
    });
    expect(lines.at(-1)?.t).toBe("end");
    const own = (await rowsOf(sessionId)).filter(
      (r) => r.clientAttemptId === "ko-orphan-1",
    );
    expect(own).toHaveLength(1);
    expect(own[0]?.hintKind).toBe("none");
    expect(own[0]?.sentUserMessage).toContain(LINE);
    const [after] = (await helpRowsOf(sessionId)).filter(
      (r) => r.id === help.id,
    );
    expect(after).toMatchObject({ heard: null, replays: null });
  });
});

// ── (f) 답이 없는 행 · 대신 줄 ────────────────────────────────────────

describe("답이 없는 행 · 대신 줄만 있는 아이 차례", () => {
  it("(f) 답이 없는 행 · 대신 줄 두 꼴(표현 갈래가 남아도)만 있으면 도움 없는 턴과 같다", async () => {
    const ANSWER = { tori_en: "Yummy!" };
    const plain = await scenario(ANSWER);
    const plainChild = plain.child;
    for (const over of [
      { kind: null, sayKo: null, teachEn: null, fallback: null },
      { fallback: "call_failed" as const },
      { fallback: "check_blocked" as const },
    ]) {
      const run = await scenario(ANSWER, {
        help: (sessionId, turnNo) => addHelp(sessionId, turnNo, over),
        input: (turnNo) => ({ koHelp: [{ turnNo, seq: 1, heard: true }] }),
      });
      const child = run.child;
      expect(child.hintKind).toBe(plainChild.hintKind);
      expect(child.sentUserMessage).toBe(plainChild.sentUserMessage);
      expect(run.sent[0]?.bodyText).toBe(plain.sent[0]?.bodyText);
    }
  });
});

// ── (g) '말했다' 거름은 '말했다'에만(I-1) ─────────────────────────────

describe("AC-25j 뜻 도움의 한국어 답에 글자로 든 단원 단어", () => {
  async function vocabRowsOf(profileId: string) {
    const ids = (
      await db
        .select({ id: vocab.id })
        .from(vocab)
        .where(eq(vocab.word, unitWord))
    ).map((v) => v.id);
    if (ids.length === 0) throw new Error("단원 단어의 어휘 행이 없다");
    return db
      .select()
      .from(vocabProgress)
      .where(
        and(
          eq(vocabProgress.profileId, profileId),
          inArray(vocabProgress.vocabId, ids),
        ),
      );
  }

  it("(g) '말했다'(said_words)에는 없고, 선생님이 다음 말에서 그 낱말을 쓰면 '만났다'에는 든다(뺀 턴은 '말했다'에 든다)", async () => {
    const answer = {
      tori_en: `I like ${unitWord} too!`,
      self_used_words: [unitWord],
    };
    const text = `I like ${unitWord}.`;
    const plain = await scenario(answer, { input: { text } });
    expect((await lastChild(plain.sessionId)).saidWords).toContain(unitWord);
    const helped = await scenario(answer, {
      help: (sessionId, turnNo) =>
        addHelp(sessionId, turnNo, {
          kind: "meaning",
          sayKo: `'${unitWord}'는 이런 뜻이야.`,
          teachEn: null,
          shownEn: [unitWord],
          textShown: false,
        }),
      input: { text },
    });
    const child = await lastChild(helped.sessionId);
    expect(child.hintKind).toBe("meaning_only");
    expect(child.sentUserMessage).toContain(MEANING_LINE);
    expect(child.saidWords ?? []).not.toContain(unitWord);
    // 선생님의 다음 영어 말 속 그 낱말은 '만났다'(어휘 상태 행)로 든다 — 날 셈은 '말했다'가 아니다
    const rows = await vocabRowsOf(helped.profileId);
    // (만난 날 · 만난 영역 — state.ts writeSay 가 만남 행에 넣는 칸, 검토 rev-b4c-2 N-2)
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.firstMetDay).toBe(TODAY);
      expect(r.metAreas).toContain("talk");
      expect(r.saidDays).toEqual([]);
    }
  });
});

// ── (h) AC-25o 막힘 무름 · 귀띔 줄 ─────────────────────────────────────

describe("AC-25o 가르친 표현과의 일치 · 귀띔 줄(기존 방식 1~3단계)", () => {
  // 표본은 앱이 원래 막힘으로 보는 꼴이다(child-kind.ts effectiveStuckOf): 영어 낱말 둘 이하(셋 이상은 갈래와 관계없이 무른다)이고, 장면 낱말
  // (talkSceneWordsOf — 시험 시드 1단계 단원 1 은 see · bababa · bebaba)에 닿지 않으며, 가짜 응답의 막힘 참은 갈래 not_understood 다
  // (talk-fixture lessonAnswer). 그래서 무름은 가르친 표현과의 일치(taughtMatched) 하나로만 갈린다(고침 2 (가))
  const STUCK = { stuck: true, tori_en: "That's okay." };
  const stuckHelp = (teachEn: string) => (sessionId: string, turnNo: number) =>
    addHelp(sessionId, turnNo, {
      question: "어떻게 말해?",
      sayKo: "이렇게 말해 봐.",
      teachEn,
    });

  it("(h) 가짜 응답이 막힘 참이어도 인식 글이 가르친 표현과 문턱 이상 맞으면 막힘으로 보지 않는다(뺀 턴은 막힘)", async () => {
    const threshold = TEST_SETTINGS["talk.hint_read_match"].value;
    expect(threshold).toBeGreaterThan(0);
    const taught = "Gimbap, please.";
    const text = "Gimbap please";
    const plain = await scenario(STUCK, { input: { text } });
    expect(plain.child.stuckPhrase).toBe(text);
    const helped = await scenario(STUCK, {
      help: stuckHelp(taught),
      input: { text },
    });
    expect(helped.child.hintKind).toBe("english");
    expect(helped.child.sentUserMessage).toContain(
      `Korean help before this answer: taught '${taught}'`,
    );
    expect(helped.child.stuckPhrase).toBeNull();
  });

  it("(h) 가르친 표현의 내용 낱말이 다르게 적힌 글('snow' → 'Slow.')은 문턱 아래라 막힘이 그대로이고, 사용자 메시지에 가르친 표현에서 온 Heard hint 줄이 한 줄 바로 앞에 있다(뺀 턴은 귀띔 없음)", async () => {
    // 귀띔 재료는 시드 목록 seed/lists/sound-alikes.json 의 snow → slow(가까운 소리)다. 'snow' 는 이 수업의 답 · 장면 낱말이 아니라서,
    // 도움을 뺀 턴에는 귀띔이 없다(가르친 표현이 답 낱말에 더해질 때만 — heard-hint.ts heardHintsOf taught)
    const taught = "I like snow.";
    const text = "Slow.";
    const plain = await scenario(STUCK, { input: { text } });
    expect(plain.child.stuckPhrase).toBe(text);
    expect(plain.child.sentUserMessage).not.toContain("Heard hint");
    const run = await scenario(STUCK, {
      help: stuckHelp(taught),
      input: { text },
    });
    expect(run.child.stuckPhrase).toBe(text);
    const lines = (run.child.sentUserMessage ?? "").split("\n");
    const at = lines.indexOf(
      `Korean help before this answer: taught '${taught}'`,
    );
    expect(at).toBeGreaterThan(1);
    expect(lines[at - 1]).toBe(
      "Heard hint (speech recognition may have misheard): 'slow' may be the answer word 'snow' (close sound)",
    );
    expect(lines[at - 2]).toBe(`Child: ${text}`);
  });
});

// ── (i) 도움 뒤 '잘 모르겠어요' ────────────────────────────────────────

describe("도움 뒤 '잘 모르겠어요'", () => {
  it("(i) 한 줄 없음 · 힌트 종류 올림 없음", async () => {
    const plain = await scenario(
      { tori_en: "That's okay." },
      { input: { mode: "dont_know" } },
    );
    const run = await scenario(
      { tori_en: "That's okay." },
      {
        help: (sessionId, turnNo) => addHelp(sessionId, turnNo),
        input: (turnNo) => ({
          mode: "dont_know",
          koHelp: [{ turnNo, seq: 1, heard: true }],
        }),
      },
    );
    // 앞 세션의 행은 뒤 scenario 의 resetHousehold 가 지우므로 부른 바로 뒤의 사본으로 견준다
    const child = run.child;
    const plainChild = plain.child;
    expect(child.hintKind).toBe(plainChild.hintKind);
    expect(child.sentUserMessage).not.toContain(KO_LINE_HEAD);
    expect(child.sentUserMessage).toBe(plainChild.sentUserMessage);
  });
});

// ── (j) Claude 주도 방식의 대화 토막 ──────────────────────────────────

describe("Claude 주도 방식 수업(묶음 4-라 — 대화 토막 · 인사 토막)", () => {
  /**
   * Claude 주도 방식 세션을 열어 인사 첫 질문(아이 차례가 열림)까지(talk-lead-turn.test.ts newSession 과 같은 꼴 — 처음 스냅숏에 claude 가
   * 적히게 안내문 글을 넘긴다).
   */
  async function leadSession() {
    await setHouseholdSetting(db, "talk.lead_mode", "claude");
    const profileId = await resetHousehold(db, 1);
    const [session] = await db
      .insert(sessions)
      .values({
        id: rotationKeyId(),
        profileId,
        area: "talk",
        level: 1,
        unit: 1,
        lessonId,
        kind: "regular",
        status: "in_progress",
        startedAt: NOW,
        seedRevision: lessonRevision,
        seedCorrection: 0,
      })
      .returning({ id: sessions.id });
    if (!session) throw new Error("세션을 넣지 못했다");
    const sessionId = session.id;
    const leadDeps = { ...h.deps(), leadText: () => TALK_LEAD_TEXT_L3U1 };
    if (!(await loadTalkLessonView({ sessionId }, leadDeps)))
      throw new Error("화면 자료가 없다");
    return { profileId, sessionId };
  }

  /** Claude 주도 방식 세션을 인사(지금 길) 뒤 대화 첫 차례까지(talk-lead-turn.test.ts inTalk 와 같은 꼴). */
  async function leadInTalk() {
    const { profileId, sessionId } = await leadSession();
    for (let i = 0; i < card.greetingTurns; i++) {
      const turnNo = await openTurnNo(sessionId);
      await db.insert(talkTurns).values([
        {
          sessionId,
          turnNo,
          segment: "greeting",
          speaker: "child",
          text: "I'm good.",
          inputMode: "speech",
          clientAttemptId: `pre-${sessionId}-${turnNo}`,
          recordedAt: NOW,
        },
        {
          sessionId,
          turnNo: turnNo + 1,
          segment: "greeting",
          speaker: "tori",
          text: "Great!",
          move: talkMoveOf({ kind: "ai" }),
          recordedAt: NOW,
        },
      ]);
    }
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    if (view?.step.kind === "advance" && view.step.to === "prep")
      await advanceTalkLesson({ sessionId, to: "prep" }, h.deps());
    const moved = await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    if (!moved.ok || moved.leadTurn !== "start")
      throw new Error("새 엔진 신호가 없다");
    h.fake.push(leadTurnRule({ say: "Hello again! Do you like it?" }));
    const contact = getOutputCheckLists()
      .forbidden.patterns.filter((p) => p.category === "contact")
      .map((p) => p.regex);
    const opened: TalkLessonLine[] = [];
    await runLeadOpenTurn(
      { sessionId, open: "start" },
      {
        ...h.deps(),
        leadText: () => TALK_LEAD_TEXT_L3U1,
        write: (line) => opened.push(line),
      },
      {
        db,
        profileId,
        masker: await maskerFor(db, profileId, contact),
        settings: await getSettings(turnSettings, { db, profileId }),
        at: h.clock.now,
        received: h.clock.now,
        restingP: Promise.resolve(false),
        timer: createStageTimer(() => performance.now()),
      },
    );
    if (opened.at(-1)?.t !== "end") throw new Error("대화 첫 차례가 없다");
    return { profileId, sessionId };
  }

  it("(j) 한 번도 들려주지 못한 1~3단계 표현(heard 거짓)이면 저장 행 · 호출 입력이 칸 없는 요청과 같고, 기기 값은 그 도움 행에 적힌다(4-라)", async () => {
    const runs = [];
    for (const withHelp of [false, true]) {
      const { sessionId } = await leadInTalk();
      const turnNo = await openTurnNo(sessionId);
      const help = withHelp ? await addHelp(sessionId, turnNo) : null;
      h.fake.push(leadTurnRule({ say: "Yummy! What else do you like?" }));
      const before = leadRequests().length;
      await turn(sessionId, {
        leadText: true,
        ...(help
          ? { koHelp: [{ turnNo, seq: 1, heard: false, replays: 2 }] }
          : {}),
      });
      runs.push({
        sessionId,
        sent: leadRequests().slice(before),
        rows: comparableRows(await rowsOf(sessionId)),
        help: help
          ? (await helpRowsOf(sessionId)).find((r) => r.id === help.id)
          : null,
      });
    }
    const [plain, helped] = runs;
    expect(helped?.sent).toHaveLength(plain?.sent.length ?? -1);
    expect(helped?.sent[0]?.bodyText).toBe(plain?.sent[0]?.bodyText);
    expect(helped?.rows).toEqual(plain?.rows);
    expect(helped?.help).toMatchObject({ heard: false, replays: 2 });
    expect(helped?.sent[0]?.bodyText).not.toContain(KO_LINE_HEAD);
    expect(helped?.sent[0]?.bodyText).not.toContain(LEAD_KO_HEAD);
  });

  // ── 묶음 4-라: 사실 알림 · 판정 장치 · 되묻기 길 · 받을 차례 ─────────────────

  /** Claude 주도 방식 대화 토막의 한 턴(도움 행을 넣고 · 가짜 응답 하나 · 보낸 요청과 끝 줄). */
  async function leadTurn(
    sessionId: string,
    answer: Record<string, unknown>,
    input: TurnInput = {},
  ) {
    h.fake.push(leadTurnRule(answer));
    const before = leadRequests().length;
    const lines = await turn(sessionId, { leadText: true, ...input });
    return { lines, sent: leadRequests().slice(before) };
  }
  const endOf = (lines: TalkLessonLine[]) => {
    const end = lines.at(-1);
    if (end?.t !== "end") throw new Error(`끝 줄이 아니다(${end?.t})`);
    return end.lesson;
  };

  it("(l) AC-26c AC-25j 들은 표현 뒤 턴: 사실 알림에 가르친 표현 줄이 한 번 · 아이 행 힌트 종류 '영어' · '말했다' 0 · 기존 방식 한 줄은 없다", async () => {
    const runs = [];
    for (const withHelp of [false, true]) {
      const { sessionId } = await leadInTalk();
      const turnNo = await openTurnNo(sessionId);
      if (withHelp) await addHelp(sessionId, turnNo);
      const { sent } = await leadTurn(
        sessionId,
        { say: "Yummy! What else do you like?" },
        withHelp
          ? { koHelp: [{ turnNo, seq: 1, heard: true, replays: 1 }] }
          : {},
      );
      runs.push({ sent, child: await lastChild(sessionId) });
    }
    const [plain, helped] = runs;
    // 요청 본문은 JSON 이라 큰따옴표가 이스케이프된다 — 줄 글은 아이 행의 보낸 사용자 메시지(가린 글 그대로)로 보고, 본문은 머리 글로 본다
    const message = helped?.child.sentUserMessage ?? "";
    expect(message.split(LEAD_KO_LINE)).toHaveLength(2);
    const body = helped?.sent[0]?.bodyText ?? "";
    expect(body).toContain(LEAD_KO_HEAD);
    expect(body).not.toContain(KO_LINE_HEAD);
    expect(plain?.sent[0]?.bodyText).not.toContain(LEAD_KO_HEAD);
    expect(helped?.child.hintKind).toBe("english");
    expect(plain?.child.hintKind ?? "none").toBe("none");
    expect(helped?.child.saidWords ?? []).toEqual([]);
  });

  it("(m) AC-25o 읽기 칸이 막힘 갈래여도 인식 글이 가르친 표현과 문턱 이상 맞으면 막힘으로 보지 않는다(뺀 턴은 막힘)", async () => {
    // 표본의 전제: 앱 무름(영어 낱말 셋 이상 · 장면 낱말)에 닿지 않는 두 낱말 말이라 뺀 턴은 막힘으로 남는다(child-kind effectiveStuckOf)
    const sceneText =
      `${JSON.stringify(card)} ${unitWords.join(" ")}`.toLowerCase();
    for (const w of ["kimchi", "stew"])
      expect(new RegExp(`\\b${w}\\b`).test(sceneText)).toBe(false);
    const runs = [];
    for (const withHelp of [false, true]) {
      const { sessionId } = await leadInTalk();
      const turnNo = await openTurnNo(sessionId);
      if (withHelp) await addHelp(sessionId, turnNo, { teachEn: STUCK_TAUGHT });
      await leadTurn(
        sessionId,
        {
          reading: "does_not_fit",
          move: "react_and_follow_up",
          say: "What else do you like?",
        },
        { text: STUCK_TAUGHT },
      );
      runs.push(await lastChild(sessionId));
    }
    const [plain, helped] = runs;
    expect(plain?.stuckPhrase).not.toBeNull();
    expect(helped?.stuckPhrase ?? null).toBeNull();
  });

  it("(n) AC-25j AC-25o [N-1] 되묻는 차례(move ask_again) 뒤 아이 차례도 앞 도움을 이어받는다: 끝 줄 koCarry · 다음 턴의 사실 줄 · 힌트 종류", async () => {
    const { sessionId } = await leadInTalk();
    const turnNo = await openTurnNo(sessionId);
    await addHelp(sessionId, turnNo);
    const first = await leadTurn(
      sessionId,
      {
        reading: "likely_misheard",
        move: "ask_again",
        say: "Do you like it?",
      },
      { koHelp: [{ turnNo, seq: 1, heard: true }] },
    );
    const asked = await lastChild(sessionId);
    expect(asked.askAgain).toBe(true);
    expect(endOf(first.lines).koCarry).toEqual([
      { turnNo, seq: 1, teachEn: TAUGHT },
    ]);
    const second = await leadTurn(sessionId, {
      say: "Great! I like gimbap too.",
    });
    const child = await lastChild(sessionId);
    expect(child.turnNo).toBeGreaterThan(turnNo);
    // 대화 기록에 앞 턴의 사용자 메시지가 실리므로 이번 턴 몫은 이 아이 행의 보낸 사용자 메시지로 본다
    expect(child.sentUserMessage?.split(LEAD_KO_LINE)).toHaveLength(2);
    expect(second.sent).toHaveLength(1);
    expect(child.hintKind).toBe("english");
    expect(child.saidWords ?? []).toEqual([]);
    // 되묻지 않은 차례의 끝 줄에는 칸이 없다(AC-N26)
    expect(endOf(second.lines)).not.toHaveProperty("koCarry");
  });

  it("(n-다시) rev-b4d M-3 되묻는 차례의 응답을 잃고 같은 시도 id 로 다시 보내면, 다시 흘린 끝 줄에도 이어받은 도움 koCarry 가 첫 끝 줄과 같이 실린다(새 회화 턴 요청 없음)", async () => {
    const { sessionId } = await leadInTalk();
    const turnNo = await openTurnNo(sessionId);
    await addHelp(sessionId, turnNo);
    const clientAttemptId = `ko-lead-replay-${sessionId}`;
    const first = await leadTurn(
      sessionId,
      {
        reading: "likely_misheard",
        move: "ask_again",
        say: "Do you like it?",
      },
      { koHelp: [{ turnNo, seq: 1, heard: true }], clientAttemptId },
    );
    const carry = [{ turnNo, seq: 1, teachEn: TAUGHT }];
    expect(endOf(first.lines).koCarry).toEqual(carry);
    const before = leadRequests().length;
    const replayed = await turn(sessionId, {
      leadText: true,
      koHelp: [{ turnNo, seq: 1, heard: true }],
      clientAttemptId,
    });
    expect(leadRequests()).toHaveLength(before);
    expect(endOf(replayed).koCarry).toEqual(carry);
  });

  it("(o) AC-N26 Claude 주도 방식에서 한국어로 묻지 않은 턴은 끝 줄에 koCarry 칸이 없고 사실 알림에 한국어 줄이 없다", async () => {
    const { sessionId } = await leadInTalk();
    const { lines, sent } = await leadTurn(sessionId, {
      say: "Yummy! What else do you like?",
    });
    expect(endOf(lines)).not.toHaveProperty("koCarry");
    expect(sent[0]?.bodyText).not.toContain(LEAD_KO_HEAD);
  });

  it("(p) rev-b4b 6절 받을 차례 · 호출 입력: Claude 주도 방식 대화 토막의 열린 아이 차례에서 한국어 질문을 받고, 선생님의 지금 말을 입력에 싣는다", async () => {
    const { sessionId } = await leadInTalk();
    h.fake.push(
      talkKoHelpRule({
        model: LOW_MODEL,
        kind: "expression",
        sayKo: "이렇게 말하면 돼. 잘 듣고 따라 해 봐.",
        teachEn: TAUGHT,
      }),
    );
    const before = h.fake.requests.length;
    const reply = await runTalkKoHelpRequest(
      {
        sessionId,
        clientAttemptId: `ko-lead-${sessionId}`,
        question: "김밥 좋다고 어떻게 말해?",
        hint: { opened: 0 },
      },
      h.deps(),
    );
    expect(reply).toMatchObject({ t: "ok" });
    const body = h.fake.requests
      .slice(before)
      .map((r) => r.bodyText)
      .join("\n");
    expect(body).toContain("Hello again! Do you like it?");
    expect(leadRequests().slice(-1)[0]?.bodyText ?? "").not.toContain(
      "김밥 좋다고",
    );
  });

  it("(j-인사) 같은 수업의 인사 토막은 기존 방식 대접이 걸린다(지금 회화 턴 요청 하나 · 힌트 종류 '영어' · 한 줄 · 도움 행에 기기 값), 그 수업은 Claude 주도 방식이다", async () => {
    // 인사는 새 엔진의 토막이 아니라(lead-turn-core.ts LEAD_SEGMENTS 는 talk · more_talk) 지금 길로 가고(lesson-turn.ts leadTurnAppliesOf 거짓), 도움은 koTurnPathOf(이야기 방식이 아님)로 읽는다
    const { sessionId } = await leadSession();
    const turnNo = await openTurnNo(sessionId);
    const help = await addHelp(sessionId, turnNo);
    h.fake.push(lessonTurnRule({ tori_en: "Great!" }));
    const beforeTurn = turnRequests().length;
    const beforeLead = leadRequests().length;
    const lines = await turn(sessionId, {
      text: "I'm good.",
      leadText: true,
      koHelp: [{ turnNo, seq: 1, heard: true, replays: 2 }],
    });
    expect(lines.at(-1)?.t).toBe("end");
    expect(turnRequests().length - beforeTurn).toBe(1);
    expect(leadRequests().length - beforeLead).toBe(0);
    const child = await lastChild(sessionId);
    expect(child.segment).toBe("greeting");
    expect(child.hintKind).toBe("english");
    expect(child.sentUserMessage).toContain(LINE);
    const [after] = (await helpRowsOf(sessionId)).filter(
      (r) => r.id === help.id,
    );
    expect(after).toMatchObject({ heard: true, replays: 2 });
    // 같은 세션이 대화 토막으로 넘어가면 새 엔진 신호가 난다(처음 스냅숏이 claude)
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    if (view?.step.kind === "advance" && view.step.to === "prep")
      await advanceTalkLesson({ sessionId, to: "prep" }, h.deps());
    const moved = await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    expect(moved.ok ? moved.leadTurn : "x").toBe("start");
  });
});
