// iPad 버리는 듣기 통합 시험(plan 'iPad 버리는 듣기' 묶음 5 · 증명 표 AC-10 · 12 · 13 = 15절 AC-24j · AC-24l · AC-24m — 정적, 실행은 CI).
// 시험용 시드의 회화 1단계 단원 1 수업 1(새 꼴 카드)로 세션을 열고(loadTalkLessonView), 인사 턴은 회화 턴 길(runTalkTurnRequest — 가짜
// Anthropic), 짧은 준비는 따라 말하기 저장(saveLessonFollowAlong)으로 보낸다. 화면이 보내는 듣기 요약(client_listen)에 '그 앞 버림' 칸(dc)을
// 실어, 그 칸이 talk_turns.client_listen · attempts.input 에 글 없이 그대로 들고(spec 설계 5), 표지 글이 든 꼴 밖 칸은 거절되며, dc 가 있어도
// 입력 방식 · 글 · '모름'의 출처 · AI 에 보낸 사용자 메시지(셈 · validity 의 바탕, 04:73 · 04:85)가 dc 없는 같은 턴과 같음을 본다.
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { parseTalkAttemptInput } from "@/core/conversation/attempt";
import type {
  ClientListen,
  ClientListenEntry,
} from "@/core/conversation/client-listen";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { lessons } from "@/db/schema/content";
import { attempts, sessions, talkTurns } from "@/db/schema/learning";
import {
  advanceTalkLesson,
  loadTalkLessonView,
  saveLessonFollowAlong,
} from "@/server/conversation";
import type { TalkLessonLine } from "@/server/conversation/lesson-turn";
import { runTalkTurnRequest } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import {
  harnessOf,
  lessonTurnRule,
  requestsOf,
  resetHousehold,
  setupTalkDb,
  type TalkDb,
  type TalkHarness,
  TURN_MARK,
} from "./talk-fixture";

type LessonRow = typeof lessons.$inferSelect;
type TurnInput = {
  mode: "speech" | "dont_know";
  text?: string;
  nospeech?: boolean;
};

/** 가짜 버림이 결과로 낸 꼴의 표지 글(e2e discard.ts MARK 와 같은 글) — 어디에도 들면 안 된다. */
const MARK = "ZEBRA";

let talkDb: TalkDb;
let db: Db;
let h: TalkHarness;
let lesson: LessonRow;

beforeAll(async () => {
  talkDb = await setupTalkDb();
  db = talkDb.db;
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
  lesson = row;
});

afterAll(async () => {
  await talkDb?.testDb.drop();
});

beforeEach(() => {
  h = harnessOf(db);
});

/** 진짜 듣기 요약 한 줄(글 칸 없음 — 화면 listen-log 가 내는 꼴). */
const REAL_ENTRY: ClientListenEntry = {
  o: "result",
  by: "silence",
  d: 3300,
  as: 300,
  snd: true,
  fr: 800,
  pe: 1020,
  ss: 500,
  ts: "idle",
  te: "end",
};
/** 그 앞 버림(dc — 죽은 버림 · 선생님 소리 · 결과 수 둘, 글 없음). */
const DC: NonNullable<ClientListenEntry["dc"]> = {
  g: "discard",
  sr: false,
  why: "sound",
  as: 30,
  d: 2400,
  s0: 120,
  s1: 1900,
  w: 1300,
  sk: "teacher",
  np: 0,
  n: 2,
};
const listenOf = (entry: ClientListenEntry): ClientListen => ({
  br: "iPad Safari 27.0",
  r3d: false,
  listens: [entry],
  mf: 0,
});
const WITH_DC = listenOf({ ...REAL_ENTRY, dc: DC });
const WITHOUT_DC = listenOf(REAL_ENTRY);

/** 새 집 · 진행 세션 하나를 열고 처음 화면 자료를 읽는다(처음 스냅숏 · 첫 선생님 행 — 인사 질문). */
async function openSession(): Promise<string> {
  const profileId = await resetHousehold(db, 1);
  const [session] = await db
    .insert(sessions)
    .values({
      profileId,
      area: "talk",
      level: 1,
      unit: 1,
      lessonId: lesson.id,
      kind: "regular",
      status: "in_progress",
      startedAt: h.clock.now,
      seedRevision: lesson.revision,
      seedCorrection: 0,
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("세션을 넣지 못했다");
  if (!(await loadTalkLessonView({ sessionId: session.id }, h.deps())))
    throw new Error("화면 자료가 없다");
  return session.id;
}

/** 인사 자리의 아이 턴 하나(회화 턴 길 — 가짜 AI 반응 하나). 끝 줄 · 그 시도의 아이 행 · 그 뒤 선생님 행. */
async function turn(
  sessionId: string,
  clientAttemptId: string,
  input: TurnInput,
  clientListen: unknown,
) {
  h.fake.push(lessonTurnRule({ tori_en: "Great!" }));
  const lines: TalkLessonLine[] = [];
  await runTalkTurnRequest(
    {
      sessionId,
      clientAttemptId,
      input,
      hint: { opened: 0, heard: [] },
      ...(clientListen === undefined ? {} : { clientListen }),
    },
    {
      ...h.deps(),
      write: (line) => lines.push(line),
      requestReceivedAt: h.clock.now,
    },
  );
  const rows = await db
    .select()
    .from(talkTurns)
    .where(eq(talkTurns.sessionId, sessionId));
  const child = rows.find((r) => r.clientAttemptId === clientAttemptId);
  const teacher = child
    ? rows.find((r) => r.speaker === "tori" && r.turnNo === child.turnNo + 1)
    : undefined;
  return { lines, rows, child, teacher };
}

type TurnRow = typeof talkTurns.$inferSelect;
/** 셈 · validity 의 바탕이 되는 칸(입력 방식 · 글 · 막힘 · AI 에 보낸 사용자 메시지 — 시각 · id 칸은 뺀다). */
const coreOf = (row: TurnRow | undefined) =>
  row && {
    turnNo: row.turnNo,
    segment: row.segment,
    speaker: row.speaker,
    text: row.text,
    inputMode: row.inputMode,
    stuckPhrase: row.stuckPhrase,
    sentUserMessage: row.sentUserMessage,
    toriKo: row.toriKo,
  };
/** client_listen 에서 dc 만 뺀 꼴. */
const withoutDcOf = (value: unknown) => {
  const listen = value as (ClientListen & { src?: string }) | null;
  if (!listen) return listen;
  return {
    ...listen,
    listens: listen.listens?.map(({ dc: _dc, ...rest }) => rest),
  };
};

describe("iPad 버리는 듣기 — 기록 칸(dc) 통합(묶음 5)", () => {
  it("AC-24j · AC-24l 회화 턴의 '그 앞 버림' 칸은 talk_turns.client_listen 에 보낸 그대로 들고 글이 없다", async () => {
    const sessionId = await openSession();
    const { lines, child } = await turn(
      sessionId,
      "discard-greet",
      { mode: "speech", text: "I'm good." },
      WITH_DC,
    );
    expect(lines.at(-1)?.t).not.toBe("error");
    if (!child) throw new Error("아이 행이 없다");
    expect(child.clientListen).toEqual(WITH_DC);
    expect(child.text).toBe("I'm good.");
    expect(JSON.stringify(child.clientListen)).not.toContain("good");
    expect(JSON.stringify(child.clientListen)).not.toContain(MARK);
    // AI 로 가는 것은 인식 글뿐 — 듣기 요약 · 버림 칸은 요청 본문에 들지 않는다
    for (const r of h.fake.requests) {
      expect(r.bodyText).not.toContain('"dc"');
      expect(r.bodyText).not.toContain(MARK);
    }
  });

  it("AC-24l 표지 글이 든 dc(꼴 밖 칸)는 회화 턴 · 따라 말하기 저장 모두 거절되고 그 글은 어느 행에도 없다", async () => {
    const sessionId = await openSession();
    const marked = {
      ...WITH_DC,
      listens: [{ ...REAL_ENTRY, dc: { ...DC, text: MARK } }],
    };
    const { lines, child, rows } = await turn(
      sessionId,
      "discard-marked",
      { mode: "speech", text: "I'm good." },
      marked,
    );
    expect(lines).toEqual([{ t: "error" }]);
    expect(child).toBeUndefined();
    expect(JSON.stringify(rows)).not.toContain(MARK);
    expect(requestsOf(h, TURN_MARK)).toBe(0);
    expect(
      await saveLessonFollowAlong(
        {
          sessionId,
          clientAttemptId: `prep-${sessionId}-marked`,
          segment: "prep",
          index: 0,
          target: "apple",
          heard: [],
          failures: 0,
          clientListen: marked,
        },
        h.deps(),
      ),
    ).toEqual({ ok: false, reason: "invalid" });
    const saved = await db
      .select({ input: attempts.input })
      .from(attempts)
      .where(eq(attempts.sessionId, sessionId));
    expect(JSON.stringify(saved)).not.toContain(MARK);
  });

  it("AC-24m dc 가 있어도 입력 방식 · 글 · '모름'의 출처 · AI 에 보낸 사용자 메시지와 선생님 행은 dc 없는 같은 턴과 같다(셈 · validity 의 바탕이 바뀌지 않음)", async () => {
    const inputs: TurnInput[] = [
      { mode: "speech", text: "I'm good." },
      { mode: "dont_know", nospeech: true },
      { mode: "dont_know" },
    ];
    for (const [i, input] of inputs.entries()) {
      const plain = await turn(
        await openSession(),
        `plain-${i}`,
        input,
        WITHOUT_DC,
      );
      const plainCalls = requestsOf(h, TURN_MARK);
      const withDc = await turn(await openSession(), `dc-${i}`, input, WITH_DC);
      expect(requestsOf(h, TURN_MARK) - plainCalls).toBe(plainCalls);
      expect(coreOf(withDc.child), `${input.mode} 아이 행`).toEqual(
        coreOf(plain.child),
      );
      expect(coreOf(withDc.teacher), `${input.mode} 선생님 행`).toEqual(
        coreOf(plain.teacher),
      );
      // client_listen 은 dc 칸만 다르다('모름'의 출처 src 도 같음)
      expect(withoutDcOf(withDc.child?.clientListen)).toEqual(
        plain.child?.clientListen,
      );
      h = harnessOf(db);
    }
  });

  it("AC-24j · AC-24m 따라 말하기 저장은 dc 를 attempts.input 에 글 없이 그대로 두고, 마이크 안 잡힘 건너뜀(mic_deaf) 같은 건너뜀 까닭은 그대로다", async () => {
    const sessionId = await openSession();
    const { greetingTurns } = TalkLessonSchema.parse(lesson.content).card;
    for (let i = 0; i < greetingTurns; i++)
      await turn(
        sessionId,
        `greet-${i}`,
        { mode: "speech", text: "I'm good." },
        undefined,
      );
    const toPrep = await advanceTalkLesson({ sessionId, to: "prep" }, h.deps());
    if (!toPrep.ok) throw new Error("짧은 준비로 넘기지 못했다");
    const words = toPrep.prep?.words ?? [];
    const first = words[0];
    if (!first) throw new Error("쪽지 낱말이 없다");
    const second = words[1] ?? first;
    const heard = await saveLessonFollowAlong(
      {
        sessionId,
        clientAttemptId: `prep-${sessionId}-0`,
        segment: "prep",
        index: 0,
        target: first.modelLine,
        heard: [first.modelLine],
        failures: 0,
        clientListen: WITH_DC,
      },
      h.deps(),
    );
    expect(heard).toEqual({ ok: true, saved: true });
    const deafListen = listenOf({
      o: "deaf",
      d: 1500,
      as: 80,
      snd: false,
      dc: { ...DC, why: "sound", sk: "word", w: 0 },
    });
    const skipped = await saveLessonFollowAlong(
      {
        sessionId,
        clientAttemptId: `prep-${sessionId}-1`,
        segment: "prep",
        index: words[1] ? 1 : 0,
        target: second.modelLine,
        heard: [],
        failures: 0,
        skipped: "mic_deaf",
        clientListen: deafListen,
      },
      h.deps(),
    );
    expect(skipped).toEqual({ ok: true, saved: true });
    const rows = await db
      .select({ input: attempts.input })
      .from(attempts)
      .where(eq(attempts.sessionId, sessionId));
    const prep = rows
      .map((r) => parseTalkAttemptInput(r.input))
      .filter((input) => input?.kind === "talk-prep");
    expect(prep).toHaveLength(2);
    const said = prep.find((p) => p?.kind === "talk-prep" && !p.skipped);
    const deaf = prep.find((p) => p?.kind === "talk-prep" && p.skipped);
    expect(said?.kind === "talk-prep" && said.clientListen).toEqual(WITH_DC);
    expect(deaf?.kind === "talk-prep" && deaf.skipped).toBe("mic_deaf");
    expect(deaf?.kind === "talk-prep" && deaf.clientListen).toEqual(deafListen);
    expect(JSON.stringify(rows)).not.toContain(MARK);
  });
});
