// 회화 턴 길(plan-p13b 작업 2 증명 표 — AC-15b 넷 · 15i 셋 · 15j · 15k 둘 · 8b(회화), 8절 '회화 턴 실패' · '대화 안전 상한' · 6.1 ·
// 6.4 · C19 · C36 · C92 · C100 · C101). 가짜 Anthropic(SSE 'stream' 응답)만 쓴다. 숫자는 TEST_SETTINGS · 단계 규격 · 카드에서 읽는다.
import { and, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { twoAnswersLine } from "@/core/ai/calls/talk";
import { praiseLineOf } from "@/core/conversation/flow";
import { safeLineOf } from "@/core/conversation/stream";
import { parentAlerts } from "@/db/schema/operations";
import { advanceTalk, chooseMoreTalk } from "@/server/conversation";
import type { Db } from "@/server/db";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  cardOf,
  harnessOf,
  intoTalk,
  playToTarget,
  refusalRule,
  requestsOf,
  resetHousehold,
  SONNET,
  say,
  sessionOf,
  setHouseholdSetting,
  setupTalkDb,
  startTalk,
  type TalkDb,
  type TalkHarness,
  TURN_MARK,
  talkLessonRow,
  turnRule,
  turnsOf,
  viewOf,
} from "./talk-fixture";
import { seedSettings } from "./test-db";

const SAFETY_ALERT_COUNT = TEST_SETTINGS["talk.safety_alert_count"].value;

let talkDb: TalkDb;
let db: Db;
let h: TalkHarness;
let profileId: string;
const touched = new Map<string, unknown>();

beforeAll(async () => {
  talkDb = await setupTalkDb();
  db = talkDb.db;
});
afterAll(async () => {
  await talkDb.testDb.drop();
});
beforeEach(async () => {
  profileId = await resetHousehold(db, 1);
  h = harnessOf(db);
});
afterEach(async () => {
  for (const [key, value] of touched) await setHouseholdSetting(db, key, value);
  touched.clear();
});

async function setSetting(key: keyof typeof TEST_SETTINGS, value: unknown) {
  if (!touched.has(key)) touched.set(key, TEST_SETTINGS[key].value);
  await setHouseholdSetting(db, key, value);
}

async function card1() {
  return cardOf(await talkLessonRow(db, 1));
}

/** 회화 턴 요청 본문(가짜에 들어온 차례). */
function turnBodies() {
  return h.fake.requests
    .filter((r) => r.bodyText.includes(TURN_MARK))
    .map(
      (r) =>
        r.body as {
          messages: { role: string; content: string }[];
          system: unknown;
        },
    );
}

describe("AC-15b 회화 턴 실패(대화 몫)", () => {
  it("AC-15b 1~3단계 회화 턴이 두 번 실패하면 대화가 끊기지 않고 카드의 칭찬 대사와 다음 카드 질문이 붙는다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    const card = await card1();
    h.fake.push({
      when: { bodyIncludes: TURN_MARK },
      reply: { kind: "network-error" },
      times: 2,
    });
    const { lines, last } = await say(h, sessionId);
    const child = (await turnsOf(db, sessionId))
      .filter((r) => r.speaker === "child")
      .at(-1);
    const turnNo = child?.turnNo ?? 0;
    expect(lines[0]).toEqual({ t: "s", en: praiseLineOf(card, turnNo) });
    expect(lines).toContainEqual(
      expect.objectContaining({
        t: "add",
        kind: "question",
        en: card.turns?.[1]?.question.en,
      }),
    );
    expect(last?.t).toBe("end");
    expect((await sessionOf(db, sessionId)).status).toBe("in_progress");
    expect(child?.saidWords).toEqual([]);
    const tori = (await turnsOf(db, sessionId)).at(-1);
    expect(tori?.speaker).toBe("tori");
    expect(tori?.text).toContain(praiseLineOf(card, turnNo));
  });

  it("AC-15b 1단계 첫 문장 뒤 끊긴 턴은 같은 질문을 되풀이하지 않고 다음 카드 질문이 붙으며 그 턴은 '말했다'를 세지 않는다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    const card = await card1();
    const first = card.turns?.[0];
    if (!first) throw new Error("견본 꼴");
    h.fake.push(
      turnRule(
        { tori_en: "Nice! Very good.", self_used_words: [...first.targets] },
        { chunks: 20, cutAfterChars: 22 },
      ),
    );
    const { lines, last } = await say(h, sessionId, {
      text: first.answerExample,
    });
    expect(lines[0]).toEqual({ t: "s", en: "Nice!" });
    const asked = lines.filter((l) => l.t === "add" && l.kind === "question");
    expect(asked.map((l) => (l.t === "add" && "en" in l ? l.en : ""))).toEqual([
      card.turns?.[1]?.question.en,
    ]);
    expect(last?.t).toBe("end");
    const child = (await turnsOf(db, sessionId))
      .filter((r) => r.speaker === "child")
      .at(-1);
    expect(child?.saidWords).toEqual([]);
    expect(child?.selfUsedWords).toEqual([]);
  });

  it("AC-15b 4단계 첫 문장 뒤 끊긴 턴에는 앱이 아직 쓰지 않은 가장 앞 카드 질문이 붙고 다음 턴 힌트는 그 카드 질문의 힌트다", async () => {
    profileId = await resetHousehold(db, 4);
    const sessionId = await startTalk(h, 4);
    await intoTalk(h, sessionId, { model: SONNET });
    const card = cardOf(await talkLessonRow(db, 4));
    const second = card.questions?.[1];
    if (!second) throw new Error("견본 꼴");
    h.fake.push(
      turnRule(
        { tori_en: "That is nice. I like it too." },
        { model: SONNET, chunks: 20, cutAfterChars: 28 },
      ),
    );
    const { lines, last } = await say(h, sessionId);
    expect(lines[0]).toEqual({ t: "s", en: "That is nice." });
    expect(lines).toContainEqual(
      expect.objectContaining({ t: "add", kind: "question", en: second.en }),
    );
    if (last?.t !== "end") throw new Error("끝 줄");
    expect(last.next.pending).toMatchObject({
      questionNo: 2,
      en: second.en,
    });
    expect(last.next.hints.map((t) => t.text)).toEqual([
      second.hintKo,
      ...second.hintTiers,
    ]);
    const tori = (await turnsOf(db, sessionId)).at(-1);
    expect(tori?.cardQuestionNo).toBe(2);
  });

  it("AC-15b Haiku 와 Sonnet 이 다 거절하면 카드의 안전한 대사 뒤 대화가 이어진다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    const card = await card1();
    h.fake.push(refusalRule());
    const { lines, last } = await say(h, sessionId);
    const child = (await turnsOf(db, sessionId))
      .filter((r) => r.speaker === "child")
      .at(-1);
    const safeEn = safeLineOf(card.safeLines, child?.turnNo ?? 0);
    const safe = card.safeLines.find((l) => l.en === safeEn);
    expect(lines[0]).toEqual({ t: "s", en: safe?.en });
    expect(lines).toContainEqual(
      expect.objectContaining({
        t: "add",
        kind: "question",
        en: card.turns?.[1]?.question.en,
      }),
    );
    if (last?.t !== "end") throw new Error("끝 줄");
    expect(last.next.pending?.en).toBe(card.turns?.[1]?.question.en);
    expect((await sessionOf(db, sessionId)).status).toBe("in_progress");
  });
});

describe("AC-15i 1~3단계 '더 이야기할 거리' 뒤 AI 질문", () => {
  /** 목표 턴 → '더 이야기하기' → '더 이야기할 거리'를 다 쓴 자리까지(마지막 거리에 답할 차례). */
  async function toLastMoreTalk(sessionId: string) {
    await intoTalk(h, sessionId);
    await playToTarget(h, sessionId);
    const more = await chooseMoreTalk({ sessionId }, h.deps());
    if (!more.ok) throw new Error(more.reason);
    const card = await card1();
    const count = card.moreTalk?.length ?? 0;
    for (let i = 0; i < count - 1; i++) {
      h.fake.push(turnRule({ tori_en: "Good!" }));
      await say(h, sessionId);
    }
    return { more, card };
  }

  it("AC-15i '더 이야기할 거리' 턴은 1단계에서도 답 두 개를 들려주지 않는다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await playToTarget(h, sessionId);
    const more = await chooseMoreTalk({ sessionId }, h.deps());
    if (!more.ok) throw new Error(more.reason);
    const card = await card1();
    expect(more.add).toEqual([
      expect.objectContaining({
        t: "add",
        kind: "question",
        en: card.moreTalk?.[0]?.question.en,
      }),
    ]);
    expect(
      more.add.some((l) => l.t === "add" && l.kind === "two_answers"),
    ).toBe(false);
    expect(more.next.pending?.twoAnswers).toBeUndefined();
    expect(more.next.pending?.askKind).toBe("re_ask");
  });

  it("AC-15i '더 이야기할 거리'를 다 쓴 1단계 대화에서 AI 가 낸 질문 · 힌트 · 답 예시가 검사를 통과하면 그대로 쓰인다", async () => {
    const sessionId = await startTalk(h, 1);
    const { card } = await toLastMoreTalk(sessionId);
    const word = card.turns?.[0]?.targets[0] ?? "";
    const aiQuestion = {
      next_question_en: "What is it?",
      next_question_ko: "그게 뭐야?",
      next_hint_ko: "그건 그거야.",
      next_hints: [`It is ${word}.`],
      next_answer_example: `It is ${word}.`,
    };
    h.fake.push(turnRule({ tori_en: "Cool!", ...aiQuestion }));
    const { lines, last } = await say(h, sessionId);
    // 이 턴 요청은 AI 자리라고 알린다(C100)
    expect(JSON.stringify(turnBodies().at(-1))).toContain(
      "AI question slot: yes",
    );
    expect(lines).toContainEqual({
      t: "add",
      kind: "question",
      en: "What is it?",
      ko: "그게 뭐야?",
    });
    if (last?.t !== "end") throw new Error("끝 줄");
    expect(last.next.pending).toMatchObject({
      source: "ai_more_talk",
      en: "What is it?",
    });
    // 1~3단계는 영어 힌트 글을 미리 내려 주지 않는다
    expect(last.next.hints).toEqual([
      { kind: "ko", text: "그건 그거야." },
      { kind: "sentence", listen: true },
    ]);
    const tori = (await turnsOf(db, sessionId)).at(-1);
    expect(tori?.aiQuestion).toMatchObject({
      en: "What is it?",
      answerExample: `It is ${word}.`,
    });
  });

  it("AC-15i 물음표가 없거나 한국어 뜻 힌트가 없거나 어휘 범위 밖 단어가 든 AI 질문은 '더 이야기할 거리' 가운데 이 대화에서 가장 오래전에 쓴 질문과 힌트로 되돌리고 두 번 걸려도 같은 질문이 이어 나오지 않는다", async () => {
    const sessionId = await startTalk(h, 1);
    const { card } = await toLastMoreTalk(sessionId);
    const more = card.moreTalk ?? [];
    const bad = [
      { next_question_en: "Tell me about it", next_hint_ko: "말해 봐." },
      { next_question_en: "What is this?", next_hint_ko: "" },
      {
        next_question_en: "Do you like zxqvbnmt?",
        next_hint_ko: "응.",
      },
    ];
    const asked: string[] = [];
    for (const over of bad) {
      h.fake.push(
        turnRule({
          tori_en: "Okay!",
          next_question_ko: "질문",
          next_hints: ["It is good."],
          next_answer_example: "It is good.",
          ...over,
        }),
      );
      const { lines, last } = await say(h, sessionId);
      if (last?.t !== "end") throw new Error("끝 줄");
      const q = lines.find((l) => l.t === "add" && l.kind === "question");
      if (q?.t !== "add" || q.kind !== "question") throw new Error("붙인 질문");
      expect(more.map((m) => m.question.en)).toContain(q.en);
      asked.push(q.en);
      if (last.next.awaitingChoice) break;
    }
    // 가장 오래전에 쓴 거리부터, 같은 질문이 이어 나오지 않는다
    expect(asked[0]).toBe(more[0]?.question.en);
    for (let i = 1; i < asked.length; i++)
      expect(asked[i]).not.toBe(asked[i - 1]);
    const toriRows = (await turnsOf(db, sessionId)).filter(
      (r) => r.speaker === "tori",
    );
    expect(toriRows.at(-1)?.aiQuestion).toBeNull();
  });
});

describe("AC-15j 대화 안전 상한", () => {
  it("AC-15j 대화 하나가 talk.safety_max_turns 에 닿으면 토리가 카드의 '새 이야기로 이어 가자' 끝인사로 닫고 같은 학습일에 talk.safety_alert_count 번째로 닿을 때만 부모 알림이 생긴다", async () => {
    const max = 4;
    await setSetting("talk.safety_max_turns", max);
    const card = await card1();
    const alerts = () =>
      db
        .select()
        .from(parentAlerts)
        .where(
          and(
            eq(parentAlerts.kind, "talk_safety_cap"),
            eq(parentAlerts.profileId, profileId),
          ),
        );
    for (let n = 1; n <= SAFETY_ALERT_COUNT; n++) {
      const sessionId = await startTalk(h, 1, n);
      await intoTalk(h, sessionId);
      // 인사 턴(카드 수)을 뺀 나머지를 채우고 마지막 한 턴이 상한에 닿는다
      for (let i = 0; i < max - 1 - card.greetingTurns; i++) {
        h.fake.push(turnRule({ tori_en: "Good!" }));
        await say(h, sessionId);
      }
      const before = requestsOf(h, TURN_MARK);
      const { last } = await say(h, sessionId);
      expect(last).toEqual({
        t: "close",
        reason: "safety",
        farewell: {
          en: card.safetyFarewell.en,
          ...(card.safetyFarewell.ko ? { ko: card.safetyFarewell.ko } : {}),
        },
      });
      expect(requestsOf(h, TURN_MARK)).toBe(before);
      // 목표 턴 전에 닿은 상한은 중단 + 학습일(C107)
      const closedRow = await sessionOf(db, sessionId);
      expect(closedRow.talkSegment).toBe("wrap_up");
      expect(closedRow.status).toBe("aborted");
      expect(closedRow.learningDay).not.toBeNull();
      expect(await alerts()).toHaveLength(n === SAFETY_ALERT_COUNT ? 1 : 0);
      h.tasks.length = 0;
    }
  });
});

describe("AC-15k 보낸 사용자 메시지 · 다시 쓸 토리 차례", () => {
  it("AC-15k 1단계 둘째 턴 요청의 앞 토리 차례에는 앞 턴에 앱이 붙인 카드 질문과 들려준 답 두 개가 들어 있고 검사에 걸린 문장은 안전한 대사로 들어 있다", async () => {
    const sessionId = await startTalk(h, 1);
    const card = await card1();
    const firstTalk = card.turns?.[0];
    if (!firstTalk) throw new Error("견본 꼴");
    const view = await viewOf(h, sessionId);
    // 인사 턴: 반응의 개인 정보 질문은 안전한 대사로 바뀐다
    h.fake.push(turnRule({ tori_en: "Great! Where do you live?" }));
    await say(h, sessionId, { text: "I'm good." });
    for (const to of view.flow.slice(1)) {
      if (to === "wrap_up") break;
      const moved = await advanceTalk({ sessionId, to }, h.deps());
      expect(moved.ok).toBe(true);
      if (to === "talk") break;
    }
    h.fake.push(turnRule({ tori_en: "Good!" }));
    await say(h, sessionId);
    const second = turnBodies().at(-1);
    const assistant = second?.messages.find((m) => m.role === "assistant");
    expect(assistant?.content).toContain(firstTalk.question.en);
    if (firstTalk.twoAnswers)
      expect(assistant?.content).toContain(
        twoAnswersLine(firstTalk.twoAnswers),
      );
    // 문장 검사의 안전한 대사는 인사 턴(앞 턴 짝 0 + 1)의 차례
    expect(assistant?.content).toContain(safeLineOf(card.safeLines, 1));
    expect(assistant?.content).not.toContain("Where do you live?");
    const rows = await turnsOf(db, sessionId);
    const greetingEnd = rows.find(
      (r) => r.speaker === "tori" && r.turnNo === 2,
    );
    expect(assistant?.content).toBe(greetingEnd?.toriRewrite);
  });

  it("AC-15k 회화 턴은 보낸 사용자 메시지 전문과 다시 쓸 토리 차례를 저장해 다음 턴에 글자 그대로 쓴다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    for (let i = 0; i < 2; i++) {
      h.fake.push(turnRule({ tori_en: `Good ${i}!` }));
      await say(h, sessionId);
    }
    const rows = await turnsOf(db, sessionId);
    const bodies = turnBodies();
    const last = bodies.at(-1);
    const children = rows.filter((r) => r.speaker === "child");
    // 마지막 요청의 앞 턴 짝 = 저장된 아이 행 · 토리 행 글 그대로
    const history = last?.messages.slice(0, -1) ?? [];
    for (let i = 0; i < children.length - 1; i++) {
      const child = children[i];
      const tori = rows.find(
        (r) => r.speaker === "tori" && r.turnNo === (child?.turnNo ?? 0) + 1,
      );
      expect(history[i * 2]).toEqual({
        role: "user",
        content: child?.sentUserMessage,
      });
      expect(history[i * 2 + 1]).toEqual({
        role: "assistant",
        content: tori?.toriRewrite,
      });
    }
    expect(last?.messages.at(-1)?.content).toBe(
      children.at(-1)?.sentUserMessage,
    );
  });
});

describe("AC-8b 알림 기준", () => {
  it("AC-8b 알림 기준(하루 호출 · 하루 비용)을 넘긴 날에도 회화 턴이 나가고 회화 세션이 그대로 진행된다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await seedSettings(db, [
      { key: "ai.daily_call_alert", scope: "profile", value: 1, profileId },
    ]);
    await setSetting("ai.daily_cost_alert_usd", 0.000001);
    h.fake.push(turnRule({ tori_en: "Good!" }));
    const { last } = await say(h, sessionId);
    expect(last?.t).toBe("end");
    expect((await sessionOf(db, sessionId)).status).toBe("in_progress");
  });
});
