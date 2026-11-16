// 회화 실험 도구 T2 fix 4(13절 C243 보완 8 의 실험 도구 넷 — task-t2-fix4): (가) 가린 기록에 아이 차례 사이 선생님 말을 모두 싣기(입구 back ·
// more) (나) 잡음 차례를 인식기 알림 있음 · 없음으로 갈라 세기 (다) 수준 기록의 어려운 꼴 셈 · 선생님 지각 꼴 읽기 목록 (라) 1~3단계 소리 줄
// 빼기를 '고정 문구'로 적지 않기. 합성 기록만 쓰고 네트워크 · 실험 결과 폴더를 쓰지 않는다.
import { describe, expect, it } from "vitest";
import type {
  ChatChildLog,
  ChatTeacherLog,
  ChildTurnLog,
  LessonLog,
  TeacherTurnLog,
} from "../../scripts/exp/arch-compare";
import {
  chatBranchesOf,
  effectiveBranchesOf,
  HARD_FORMS,
  hardFormsOf,
  isAlertedTurn,
  nineViewsOf,
  perceptionTurnsOf,
} from "../../scripts/exp/arch-metrics";
import {
  afterNoiseMarkdown,
  armMetricsOf,
  blindLessonMarkdownOf,
  chatMarkdownOf,
  lessonMetricsOf,
} from "../../scripts/exp/arch-report";

const FIT = {
  sentences: 1,
  overSentenceMax: false,
  longSentences: [],
  offbandWords: [],
  offbandForms: [],
};

function tLine(
  lesson: string,
  arm: TeacherTurnLog["arm"],
  childTurn: number,
  final: string,
  extra: Partial<TeacherTurnLog> = {},
): TeacherTurnLog {
  return {
    type: "teacher_turn",
    lesson,
    arm,
    childTurn,
    called: childTurn > 0,
    modelFirst: null,
    modelFirstSpoken: final,
    directive: null,
    checks: null,
    retry: null,
    changes: { deleted: [], added: [] },
    final,
    branches: ["그대로 나감"],
    levelFit: FIT,
    calls: childTurn > 0 ? 1 : 0,
    ms: 900,
    firstMs: 900,
    ...extra,
  };
}

function chatT(
  lesson: string,
  childTurn: number,
  final: string,
  chat: Partial<ChatTeacherLog> = {},
  extra: Partial<TeacherTurnLog> = {},
): TeacherTurnLog {
  return {
    ...tLine(lesson, "CHAT", childTurn, final),
    chat: {
      entry: "child",
      turnEnd: null,
      facts: [],
      signal: null,
      wrapUp: false,
      wrapUpHeld: null,
      listen: null,
      removed: [],
      firstMoved: false,
      madeUp: [],
      closed: false,
      failure: null,
      diverged: false,
      usage: null,
      calls: { dialog: 1, hint: 0, explain: 0, eval: 0 },
      costUsd: 0.002,
      waitedMs: 0,
      hints: [],
      explain: null,
      evals: [],
      ...chat,
    },
    ...extra,
  };
}

function cLine(
  lesson: string,
  childTurn: number,
  says: string,
  extra: Partial<ChildTurnLog> = {},
): ChildTurnLog {
  return {
    type: "child_turn",
    lesson,
    childTurn,
    heardTeacher: "",
    action: "speak",
    says,
    kind: "answer",
    why: "",
    heard: says,
    noise: null,
    noiseSkipped: false,
    ...extra,
  };
}

const chatChild = (
  input: ChatChildLog["input"] = "say",
  recognizer: ChatChildLog["recognizer"] = null,
): ChatChildLog => ({
  input,
  hintTier: 0,
  hint: null,
  recognizer,
  waited: false,
});

function meta(
  lesson: string,
  arm: LessonLog["arm"],
  extra: Partial<LessonLog> = {},
): LessonLog {
  return {
    type: "lesson",
    lesson,
    arm,
    child: "SC",
    seed: 1,
    turnsAsked: 16,
    childTurns: 2,
    ended: null,
    attempt: 1,
    failures: [],
    startedAt: "2026-11-16T00:00:00.000Z",
    finishedAt: "2026-11-16T00:01:00.000Z",
    ...extra,
  };
}

function chatMeta(lesson: string, extra: Partial<LessonLog> = {}): LessonLog {
  return meta(lesson, "CHAT", {
    chat: {
      calls: { dialog: 3, hint: 0, explain: 0, eval: 0 },
      costUsd: 0.02,
      wrap: [],
      prepWords: ["eat"],
      overrides: {},
      start: { now: "Sunday night", met: 0 },
      reachedWrap: false,
    },
    ...extra,
  });
}

// ── (가) 가린 기록 ────────────────────────────────────────────────

describe("T2 fix 4 (가) 가린 기록: 아이 차례 사이 선생님 말을 차례대로 모두 싣는다", () => {
  const G = "CHAT-SA-s1";
  const lesson = {
    meta: chatMeta(G, { child: "SA", childTurns: 3 }),
    teachers: [
      chatT(G, 0, "Hi, {NAME}! Happy to see you.", { entry: "start" }),
      chatT(G, 1, "Roblox! Nice. Did you play it this weekend?"),
      chatT(G, 1, "Welcome back, {NAME}! So, Roblox. Did you play it?", {
        entry: "back",
      }),
      chatT(G, 2, "A big egg! What was inside?"),
      chatT(
        G,
        3,
        "Yay, more talking! What else?",
        { entry: "more" },
        {
          afterChoice: true,
        },
      ),
      chatT(G, 3, "A dragon! So cool."),
    ],
    children: [
      cLine(G, 1, "Hi! Roblox!", { chat: chatChild() }),
      cLine(G, 2, "Yes! I got big egg!", { chat: chatChild() }),
      cLine(G, 3, "Dragon!", { chat: chatChild() }),
    ],
  };

  it("T2 fix 4 (가) 돌아온 말(입구 back)이 아이 차례 바로 뒤 선생님 말 다음에 이름표와 함께 실린다(빠지는 선생님 말 없음)", () => {
    const md = blindLessonMarkdownOf("T01", lesson);
    expect(md).toContain("Welcome back, friend! So, Roblox. Did you play it?");
    expect(md).toContain(
      "- (짧은 낱말 준비를 마치고 대화로 돌아옴 — 두 말 사이에 아이 차례는 없었음) 선생님:",
    );
    // 차례 순서: 아이 차례 1 의 대답 → 돌아온 말 → 아이 차례 2
    const reply = md.indexOf("Roblox! Nice.");
    const back = md.indexOf("Welcome back");
    const next = md.indexOf("## 아이 차례 2");
    expect(reply).toBeGreaterThan(0);
    expect(back).toBeGreaterThan(reply);
    expect(next).toBeGreaterThan(back);
    // 모든 선생님 말이 실린다
    for (const t of lesson.teachers)
      expect(md).toContain(t.final.replaceAll("{NAME}", "friend"));
  });

  it("T2 fix 4 (가) 가림 규칙은 그대로다: 방식 이름 · 수업 이름 · 입구 이름이 글에 없다", () => {
    const md = blindLessonMarkdownOf("T01", lesson);
    for (const s of ["CHAT", G, "입구", "entry", "{NAME}"])
      expect(md).not.toContain(s);
  });

  it("T2 fix 4 (가) 아이 차례 사이 선생님 말이 하나인 기록은 지난 꼴과 글자까지 같다", () => {
    const R = "R3-SA-s1";
    const plain = {
      meta: meta(R, "R3", { child: "SA", childTurns: 1 }),
      teachers: [tLine(R, "R3", 0, "Hi!"), tLine(R, "R3", 1, "Nice!")],
      children: [cLine(R, 1, "Hello")],
    };
    expect(blindLessonMarkdownOf("T02", plain)).toBe(
      [
        "# T02",
        "",
        "아이 SA · 씨앗 1 · 아이 차례 1",
        "",
        "## 처음",
        "",
        "> Hi!",
        "",
        "## 아이 차례 1",
        "",
        '- 아이가 하려던 말: "Hello"',
        '- 들린 글: "Hello"',
        "- 선생님:",
        "",
        "> Nice!",
        "",
        "",
      ].join("\n"),
    );
  });

  it("T2 fix 4 (가) 마지막 아이 차례 뒤에 남은 선생님 말(더 이야기하기를 고른 뒤 아이 차례 없이 끝남)도 끝에 싣는다", () => {
    const md = blindLessonMarkdownOf("T03", {
      ...lesson,
      teachers: [
        ...lesson.teachers,
        chatT(
          G,
          4,
          "Yay, you're back! Tell me more.",
          { entry: "more" },
          {
            afterChoice: true,
          },
        ),
      ],
    });
    expect(md).toContain("Yay, you're back! Tell me more.");
    expect(md.indexOf("Yay, you're back!")).toBeGreaterThan(
      md.indexOf("A dragon! So cool."),
    );
  });

  it("T2 fix 4 (나) 인식기 알림이 붙은 아이 차례에는 알림 줄이 붙고, 알림 없는 차례에는 붙지 않는다", () => {
    const md = blindLessonMarkdownOf("T04", {
      meta: chatMeta(G, { childTurns: 2 }),
      teachers: [
        chatT(G, 0, "Hi!", { entry: "start" }),
        chatT(G, 1, "Did you say kite?"),
        chatT(G, 2, "You can see it!"),
      ],
      children: [
        cLine(G, 1, "Kite!", {
          heard: "Tomorrow",
          noise: { heard: "Tomorrow", how: "replace" },
          stt: { unsure: true, alt: "Kite!" },
          chat: chatChild("say", { confidence: 0.3, alternative: "Kite!" }),
        }),
        cLine(G, 2, "Up!", {
          heard: "I can see",
          noise: { heard: "I can see", how: "replace" },
          chat: chatChild(),
        }),
      ],
    });
    expect(md).toContain(
      '- 인식기 알림(선생님이 들린 글과 함께 받음): 확신 낮음 · 다른 후보 "Kite!"',
    );
    expect(md.match(/인식기 알림/g)?.length).toBe(1);
  });
});

// ── (나) 잡음 차례 셈 ─────────────────────────────────────────────

describe("T2 fix 4 (나) 잡음 차례를 인식기 알림 있음 · 없음으로 갈라 센다(spec 설계 11 · AC-14 (라))", () => {
  const G = "CHAT-SD-s1";
  const R = "R3-SD-s1";
  const chat = {
    meta: chatMeta(G, { child: "SD", childTurns: 3 }),
    calls: [],
    teachers: [
      chatT(G, 0, "Hi!", { entry: "start" }),
      chatT(G, 1, "Ooh, did you say kite? Or is it tomorrow?"),
      chatT(G, 2, "You can see it! What can you see?"),
      chatT(G, 3, "Up, up! Fun!"),
    ],
    children: [
      cLine(G, 1, "Kite? I like kite.", {
        heard: "Tomorrow",
        noise: { heard: "Tomorrow", how: "replace" },
        stt: { unsure: true, alt: "Kite? I like kite." },
        chat: chatChild("say", {
          confidence: 0.3,
          alternative: "Kite? I like kite.",
        }),
      }),
      cLine(G, 2, "Up, up! Kite go!", {
        heard: "I can see",
        noise: { heard: "I can see", how: "replace" },
        chat: chatChild(),
      }),
      // 맞게 들렸는데 알림이 붙은 차례(잡음 아님 — 잡음 셈에 들지 않는다)
      cLine(G, 3, "Up, up!", {
        stt: { unsure: true },
        chat: chatChild("say", { confidence: 0.3 }),
      }),
    ],
  };
  const r3 = {
    meta: meta(R, "R3", { child: "SD", childTurns: 1 }),
    calls: [],
    teachers: [
      tLine(R, "R3", 0, "Hi!"),
      tLine(R, "R3", 1, "You can see a bird! Wow, a bird."),
    ],
    children: [
      cLine(R, 1, "Bird!", {
        heard: "I can see",
        noise: { heard: "I can see", how: "replace" },
      }),
    ],
  };
  const views = nineViewsOf([chat, r3], ["R3", "CHAT"]);
  const view6 = views[5];
  const statOf = (key: string, arm: "R3" | "CHAT") => {
    const s = view6?.stats.find((x) => x.key === key);
    if (!s) throw new Error(`없는 수치: ${key}`);
    return s.byArm[arm];
  };

  it("T2 fix 4 (나) 알림 판단: 인식기 알림(stt)이나 이야기 방식 인식기 정보가 실린 차례만 알림 있음", () => {
    expect(isAlertedTurn(chat.children[0] as ChildTurnLog)).toBe(true);
    expect(isAlertedTurn(chat.children[1] as ChildTurnLog)).toBe(false);
    expect(isAlertedTurn(r3.children[0] as ChildTurnLog)).toBe(false);
  });

  it("T2 fix 4 (나) 잡음 차례가 알림 있음 · 알림 없음(글로 알 길 없음)으로 갈려 세어진다", () => {
    expect(statOf("noise:turns", "CHAT")).toEqual({ kind: "num", v: 2 });
    expect(statOf("noise:alerted", "CHAT")).toEqual({ kind: "num", v: 1 });
    expect(statOf("noise:silent", "CHAT")).toEqual({ kind: "num", v: 1 });
    expect(statOf("noise:silent", "R3")).toEqual({ kind: "num", v: 1 });
    expect(statOf("noise:alerted", "R3")).toEqual({ kind: "num", v: 0 });
    // 잘못 들린 낱말(들린 글에만 있는 내용 낱말)을 바로 뒤 선생님 말이 씀: CHAT 의 'see' 는 알림 없는 차례
    expect(statOf("noise:silent_took_wrong", "CHAT")).toEqual({
      kind: "frac",
      n: 1,
      d: 1,
    });
    expect(statOf("noise:alerted_took_wrong", "CHAT")).toEqual({
      kind: "frac",
      n: 1,
      d: 1,
    });
    expect(statOf("noise:alerted_reask", "CHAT")).toEqual({
      kind: "frac",
      n: 1,
      d: 1,
    });
  });

  it("T2 fix 4 (나) 알림 없이 잘못 들린 차례는 '글로 알 길 없음' 목록에 따로 적힌다", () => {
    const silent = view6?.lists.find((x) =>
      x.title.startsWith("알림 없이 잘못 들린 차례"),
    );
    expect(silent?.title).toContain("글로 알 길 없음");
    expect(silent?.byArm.CHAT?.map((c) => c.childTurn)).toEqual([2]);
    expect(silent?.byArm.R3?.map((c) => c.childTurn)).toEqual([1]);
    const all = view6?.lists.find((x) => x.title === "잡음 차례");
    expect(all?.byArm.CHAT?.map((c) => c.note?.split(" · ")[0])).toEqual([
      "알림 있음",
      "알림 없음(글로 알 길 없음)",
    ]);
  });

  it("T2 fix 4 (나) 잡음 뒤 나란히 글에 잡음 차례마다 알림 있음 · 없음 표지가 붙는다", () => {
    // 나란히 글은 씨앗의 잡음 일정(NOISE_TURNS — 씨앗 1 은 아이 차례 4 · 9 · 14)의 차례만 싣는다
    const at = (n: number) => (n === 1 ? 4 : n === 2 ? 9 : n + 20);
    const shift = <T extends { childTurn: number }>(x: T): T => ({
      ...x,
      childTurn: x.childTurn === 0 ? 0 : at(x.childTurn),
    });
    const md = afterNoiseMarkdown([
      {
        ...chat,
        name: G,
        teachers: chat.teachers.map(shift),
        children: chat.children.map(shift),
      },
      {
        ...r3,
        name: R,
        teachers: r3.teachers.map(shift),
        children: r3.children.map(shift),
      },
    ]);
    expect(md).toContain("[잡음 · 알림 있음]");
    expect(md).toContain("[잡음 · 알림 없음 — 글로 알 길 없음]");
  });
});

// ── (다) 수준 기록 · 지각 꼴 ───────────────────────────────────────

describe("T2 fix 4 (다) 어려운 꼴 셈(기록 전용)과 선생님 지각 꼴 읽기 목록", () => {
  it("T2 fix 4 (다) 어려운 꼴: wish · would · 'd · imagine · 동명사 주어를 문장마다 가려 센다", () => {
    expect(HARD_FORMS.map((f) => f.key)).toEqual([
      "wish",
      "would",
      "contracted_d",
      "imagine",
      "gerund_subject",
    ]);
    const keys = (s: string) => hardFormsOf(s).map((h) => h.form);
    expect(keys("I wish I saw it.")).toEqual(["wish"]);
    expect(keys("I would draw a pink cat!")).toEqual(["would"]);
    expect(keys("I don't eat, but I'd pick strawberries!")).toEqual([
      "contracted_d",
    ]);
    expect(keys("I like pizza too, in my imagination.")).toEqual(["imagine"]);
    expect(keys("Cats doing silly things make me laugh!")).toEqual([
      "gerund_subject",
    ]);
    expect(keys("Playing outside is fun.")).toEqual(["gerund_subject"]);
    // 걸리지 않는 것: 쉬운 말 · 흔한 -ing 낱말 · 'I see.'(알겠어)
    for (const s of [
      "Good morning! Something is here.",
      "I see.",
      "I like cats.",
      "We are flying!",
      "Is it raining?",
    ])
      expect(keys(s)).toEqual([]);
    // 한 차례에 여럿이면 문장마다 따로
    expect(
      hardFormsOf("I wish I could fly. I'd go to the moon.").map((h) => [
        h.form,
        h.sentence,
      ]),
    ).toEqual([
      ["wish", "I wish I could fly."],
      ["contracted_d", "I'd go to the moon."],
    ]);
  });

  const G = "CHAT-SE-s2";
  const lesson = {
    name: G,
    meta: chatMeta(G, { child: "SE", childTurns: 2 }),
    calls: [],
    teachers: [
      chatT(G, 0, "Hi! I wish you a fun day.", { entry: "start" }),
      chatT(G, 1, "I like pizza too, in my imagination. I'd eat it all!"),
      chatT(G, 2, "Today I see a big cloud. I see."),
    ],
    children: [cLine(G, 1, "Pizza!"), cLine(G, 2, "Cloud!")],
  };

  it("T2 fix 4 (다) 수업 · 방식 수치에 어려운 꼴 셈이 새 칸(hardForms)으로 붙는다(아이 차례 뒤 선생님 차례만 — 단계 검사와 같은 범위)", () => {
    const m = lessonMetricsOf(lesson);
    expect(m.hardForms).toEqual({
      turns: 1,
      sentences: 2,
      byForm: {
        wish: 0,
        would: 0,
        contracted_d: 1,
        imagine: 1,
        gerund_subject: 0,
      },
    });
    const a = armMetricsOf("CHAT", [lesson]);
    expect(a.hardForms.turns).toBe(1);
    expect(a.hardForms.byForm.imagine).toBe(1);
    // 지난 칸(levelFit)은 그대로
    expect(Object.keys(m.levelFit).sort()).toEqual([
      "longSentences",
      "offbandFormTurns",
      "offbandForms",
      "offbandTurns",
      "offbandWords",
      "overSentenceMaxTurns",
      "turns",
    ]);
  });

  it("T2 fix 4 (다) 지각 꼴: I see · I hear · I look at 이 때 말(today · at night …)과 한 문장에 온 것만 모은다", () => {
    const hits = perceptionTurnsOf([
      {
        meta: chatMeta("CHAT-SC-s1"),
        teachers: [
          chatT(
            "CHAT-SC-s1",
            1,
            "Yay! I look at the clouds. Today I see a big, funny cloud.",
          ),
          chatT(
            "CHAT-SC-s1",
            2,
            "Yellow is happy. I see yellow stars at night, too.",
          ),
          chatT("CHAT-SC-s1", 3, "A bird! I see it too."),
          chatT("CHAT-SC-s1", 4, "Oh, I see. I hear the rain every night."),
          chatT("CHAT-SC-s1", 5, "Shh... I can hear the sea now."),
          chatT("CHAT-SC-s1", 6, "Roar! No, I never saw one."),
        ],
      },
    ]);
    expect(hits.map((h) => [h.childTurn, h.sentence, h.when])).toEqual([
      [1, "Today I see a big, funny cloud.", "today"],
      [2, "I see yellow stars at night, too.", "at night"],
      [4, "I hear the rain every night.", "every night"],
      [6, "No, I never saw one.", "never"],
    ]);
  });

  it("T2 fix 4 (다) chat.md 의 제 것으로 말한 꼴 옆에 지각 꼴 목록이, 긴 대본 줄에 어려운 꼴 셈이 실린다", () => {
    const long = {
      ...lesson,
      name: "CHAT-SE-s1-long",
      meta: {
        ...lesson.meta,
        lesson: "CHAT-SE-s1-long",
        variant: "long" as const,
      },
    };
    const md = chatMarkdownOf([lesson, long]);
    expect(md).toContain("### 선생님이 제 것으로 말한 지각 꼴");
    expect(md).toContain(
      "- CHAT-SE-s2 아이 차례 2 · today: Today I see a big cloud.",
    );
    expect(md).toContain(
      "어려운 꼴(기록 전용 · 기계 어림) 차례 1 · 문장 2(wish 0 · would 0 · 'd 1 · imagine 1 · 동명사 주어 0)",
    );
  });
});

// ── (라) 갈래 이름표 ──────────────────────────────────────────────

describe("T2 fix 4 (라) 1~3단계 소리 줄 빼기를 '고정 문구를 붙임 · 모델의 문장을 지움'으로 적지 않는다", () => {
  const raw =
    'Aww, a baby dragon! You can say, "I want a baby dragon." Try it!';
  const moved =
    "Aww, a baby dragon! You can say:\nI want a baby dragon.\nTry it!";

  it("T2 fix 4 (라) 모델 원문에 문구가 이미 있고 앱이 문장을 소리 줄로만 뺀 차례는 '소리 줄로 뺌' 하나다", () => {
    expect(
      chatBranchesOf({
        failure: null,
        rawSay: raw,
        final: moved,
        removed: ["I want a baby dragon."],
      }),
    ).toEqual(["소리 줄로 뺌"]);
  });

  it("T2 fix 4 (라) 앱이 낱말을 더했으면 '고정 문구를 붙임'과 '소리 줄로 뺌'을 함께 적고, 실패 · 그대로 나감은 지난 꼴과 같다", () => {
    expect(
      chatBranchesOf({
        failure: null,
        rawSay: "Aww, a baby dragon! Try it!",
        final: moved,
        removed: ["I want a baby dragon."],
      }),
    ).toEqual(["고정 문구를 붙임", "소리 줄로 뺌"]);
    expect(
      chatBranchesOf({
        failure: "timeout",
        rawSay: null,
        final: "Sorry, one more time?",
        removed: [],
      }),
    ).toEqual(["고정 문구를 붙임"]);
    expect(
      chatBranchesOf({
        failure: null,
        rawSay: "Nice!",
        final: "Nice!",
        removed: [],
      }),
    ).toEqual(["그대로 나감"]);
  });

  it("T2 fix 4 (라) 지난 기록에 남은 이름표도 수치에서는 다시 매긴다(이야기 방식만 — 다른 방식은 기록 그대로)", () => {
    const G = "CHAT-SA-s2";
    const old = chatT(
      G,
      7,
      moved,
      { removed: ["I want a baby dragon."] },
      {
        modelFirstSpoken: raw,
        branches: ["고정 문구를 붙임", "모델의 문장을 지움"],
      },
    );
    expect(effectiveBranchesOf(old)).toEqual(["소리 줄로 뺌"]);
    const a = tLine("A-K1-s1", "A", 1, "Hi", {
      branches: ["고정 문구를 붙임"],
    });
    expect(effectiveBranchesOf(a)).toEqual(["고정 문구를 붙임"]);
    const m = lessonMetricsOf({
      name: G,
      meta: chatMeta(G),
      calls: [],
      teachers: [old],
      children: [],
    });
    expect(m.intervention.branches["고정 문구를 붙임"]).toBe(0);
    expect(m.intervention.branches["모델의 문장을 지움"]).toBe(0);
    expect(m.intervention.branches["소리 줄로 뺌"]).toBe(1);
    // 소리 줄로 뺀 차례가 없는 수업에는 새 칸이 생기지 않는다(지난 metrics.json 과 칸이 같게)
    const plain = lessonMetricsOf({
      name: "A-K1-s1",
      meta: meta("A-K1-s1", "A"),
      calls: [],
      teachers: [a],
      children: [],
    });
    expect("소리 줄로 뺌" in plain.intervention.branches).toBe(false);
  });
});
