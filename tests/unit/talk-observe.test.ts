// 회화 수업 실호출 표본 평가 명령(talk:observe, 회화 plan 묶음 13 · AC-15o)의 순수 함수: 인자 · 대본 읽기 · 계획 · 비용 어림 ·
// 메모리 대화(가짜 응답 — 네트워크 없음) · 판정 칸 · 보고 꼴.
import { describe, expect, it } from "vitest";
import { hasJsonSchemaRefs } from "@/core/ai/inline-refs";
import { talkMoveOf } from "@/core/conversation/move";
import { questionKeyOf } from "@/core/conversation/question-check";
import { splitSentences } from "@/core/seed/text";
import { loadScriptConfig } from "../../scripts/ai-contract";
import {
  type CallResult,
  createTalkSim,
  evaluateLessonMessage,
  isSceneAssert,
  JUDGE_KEYS,
  judgeOf,
  type Materials,
  materialsOf,
  type ObserveScript,
  observeValues,
  parseArgs,
  parseObserveScript,
  planLines,
  planRunOf,
  type RunReport,
  readScriptFiles,
  readSeedFiles,
  reportMarkdown,
  sameSoundTwiceOf,
  selectScripts,
  settleTurn,
  type TurnRecord,
  totalsOf,
} from "../../scripts/talk-observe";

const ROOT = process.cwd();
const config = loadScriptConfig({ root: ROOT });

function scripts(): ObserveScript[] {
  return readScriptFiles(ROOT).map(({ file, raw }) => {
    const parsed = parseObserveScript(raw, file);
    if (!parsed.ok) throw new Error(parsed.error);
    return parsed.script;
  });
}

function materials3(): Materials {
  const m = materialsOf(readSeedFiles(ROOT, 3, 1), {
    level: 3,
    unit: 1,
    lesson: 1,
    teacher: "mina",
  });
  if (!m.ok) throw new Error(m.missing);
  return m.materials;
}

/** 가짜 응답(회화 턴 출력 칸 전부 — 빈 값이 기본). */
function fakeMessage(over: Record<string, unknown>): CallResult {
  const sentences = splitSentences(String(over.tori_en ?? ""));
  const body = {
    stuck: false,
    tori_en: "",
    model_line: "",
    choices: [],
    tori_ko: sentences.map(() => "뜻"),
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    response_fit: true,
    child_topic: false,
    child_asked: false,
    goal_suggest: [],
    next_move: "none",
    card_item: { kind: "none", no: 0 },
    next_goal: [],
    support: "none",
    next_targets: [],
    next_hint_ko: "",
    next_hints: [],
    next_usable_phrases: [],
    next_answer_example: "",
    image_word: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
  return {
    ok: true,
    message: {
      model: "claude-sonnet-5-5",
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify(body) }],
      usage: {
        input_tokens: 5000,
        output_tokens: 400,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
    latencyMs: 2100,
    firstSentenceMs: 900,
    requestId: "req_fake",
  };
}

const say = (text: string) => ({ say: text });
const dontKnow = { input: "dont_know" as const };

/** 인사 끝까지 돌린 메모리 대화(대화 첫 질문 앱 차례가 붙어 있다). */
function afterGreeting() {
  const m = materials3();
  const sim = createTalkSim(m, config.values, config.book);
  const ready = sim.prepare(say("I am fine."), 0);
  if (!ready.ok) throw new Error(ready.reason);
  const record = sim.finish(
    ready.turn,
    fakeMessage({ tori_en: "Good to hear! Let's learn some new words!" }),
  );
  return { m, sim, record, greeting: ready.turn };
}

describe("parseArgs", () => {
  it("기본값은 계획만 · 모든 대본 · 설정 effort · 임시 폴더", () => {
    expect(parseArgs([])).toEqual({
      ok: true,
      args: { yes: false, script: null, level: null, effort: null, out: null },
    });
  });

  it("--yes --script --level --effort --out 을 읽는다", () => {
    expect(
      parseArgs([
        "--yes",
        "--script",
        "l3-preview-1",
        "--level",
        "3",
        "--effort",
        "medium",
        "--out",
        "/tmp/x",
      ]),
    ).toEqual({
      ok: true,
      args: {
        yes: true,
        script: "l3-preview-1",
        level: 3,
        effort: "medium",
        out: "/tmp/x",
      },
    });
  });

  it("모르는 인자 · 값 없음 · 잘못된 effort · 단계는 거부한다", () => {
    expect(parseArgs(["--n", "3"]).ok).toBe(false);
    expect(parseArgs(["--script"]).ok).toBe(false);
    expect(parseArgs(["--effort", "high"]).ok).toBe(false);
    expect(parseArgs(["--level", "0"]).ok).toBe(false);
  });
});

describe("대본", () => {
  it("대본 여섯: 3단계 다섯(낱말 답 · 아이가 꺼낸 이야기 · 막힘 셋 · 말소리 없음 · 기록 장면)과 4단계 하나", () => {
    const all = scripts();
    expect(all.map((s) => s.name).sort()).toEqual([
      "l3-child-topic",
      "l3-nospeech",
      "l3-preview-1",
      "l3-stuck-three",
      "l3-word-answers",
      "l4-word-answers",
    ]);
    expect(all.filter((s) => s.level === 3)).toHaveLength(5);
    expect(all.filter((s) => s.level === 4)).toHaveLength(1);
  });

  it("기록 장면은 준비 낱말 eat · drink 를 건너뛰고 첫 질문에 두 번 막힌 뒤 쉬운 질문에 답한다", () => {
    const preview = scripts().find((s) => s.name === "l3-preview-1");
    expect(preview?.prep?.skipped).toEqual(["eat", "drink"]);
    expect(preview?.steps.slice(0, 4).map((s) => s.say ?? s.input)).toEqual([
      "I am fine I am fine",
      "dont_know",
      "dont_know",
      "Yes I am hungry",
    ]);
  });

  it("낱말 답 대본은 recast 기대 낱말을 적는다(AC-15o (가))", () => {
    const words = scripts().find((s) => s.name === "l3-word-answers");
    expect(
      words?.steps.flatMap((s) =>
        s.expect?.recastWord ? [s.expect.recastWord] : [],
      ),
    ).toContain("rice");
  });

  it("say 와 input 을 함께 두거나 이름이 파일과 다르면 거부한다", () => {
    const base = {
      name: "x",
      title: "t",
      level: 3,
      unit: 1,
      lesson: 1,
      teacher: "mina",
    };
    expect(
      parseObserveScript(
        { ...base, steps: [{ say: "Hi.", input: "dont_know" }] },
        "x.json",
      ).ok,
    ).toBe(false);
    expect(
      parseObserveScript({ ...base, steps: [{ say: "Hi." }] }, "y.json").ok,
    ).toBe(false);
    expect(
      parseObserveScript({ ...base, steps: [{ say: "Hi." }] }, "x.json").ok,
    ).toBe(true);
  });

  it("--script · --level 로 고른다", () => {
    const all = scripts();
    expect(
      selectScripts(all, { script: "l3-nospeech", level: null }).map(
        (s) => s.name,
      ),
    ).toEqual(["l3-nospeech"]);
    expect(selectScripts(all, { script: null, level: 4 })).toHaveLength(1);
  });
});

describe("자료 · 계획", () => {
  it("3단계 단원 1 수업 1 은 시드 카드 · 단계 규격 · 선생님으로 채운다", () => {
    const m = materials3();
    expect(m.card.required.length).toBeGreaterThan(0);
    expect(m.ctx.unitWords).toContain("eat");
    expect(m.teacher.nameEn).toBe("Mina");
    expect(m.spec.band).toBe("1-3");
  });

  it("4단계 카드 시드가 없으면 그 까닭으로 건너뛴다", () => {
    const m = materialsOf(readSeedFiles(ROOT, 4, 1), {
      level: 4,
      unit: 1,
      lesson: 1,
      teacher: "mina",
    });
    expect(m).toEqual({
      ok: false,
      missing: "카드 시드 없음(seed/lessons/talk/4/1.json)",
    });
  });

  it("예상 호출은 아이 차례 수, 입력은 턴마다 앞 턴 전문만큼 는다(캐시 할인 없음)", () => {
    const script = scripts().find(
      (s) => s.name === "l3-word-answers",
    ) as ObserveScript;
    const three = { ...script, steps: script.steps.slice(0, 3) };
    const run = planRunOf(three, {
      ok: true,
      promptChars: 4000,
      model: "m",
      effort: "low",
      thinking: "disabled",
      price: { input4: 2, output4: 10 },
    });
    expect(run.calls).toBe(3);
    // 첫 요청 1000 토큰, 턴마다 400 더함: 1000 + 1400 + 1800
    expect(run.expectedTokens).toEqual({ input: 4200, output: 1800 });
    expect(run.expectedCostUsd).toBe(0.000003);
    // 재질문 상한: 1~3단계 말 입력 차례마다 1회(첫 차례 인사 끝 뺌)
    expect(run.reaskMax).toBe(2);
    expect(run.reaskMaxCostUsd).toBeGreaterThan(0);
    const skipped = planRunOf(script, { ok: false, missing: "카드 없음" });
    expect(skipped.calls).toBe(0);
    const lines = planLines([run, skipped], {
      settingsSource: "s",
      pricesSource: "p",
      out: "/tmp/o",
    });
    expect(lines.at(-2)).toContain("돌릴 것 1");
    expect(lines.some((l) => l.includes("건너뜀: 카드 없음"))).toBe(true);
  });

  it("--effort 는 그 구간 회화 턴 effort 키 하나만 바꾼 사본이다", () => {
    const values = observeValues(config.values, 3, "medium");
    expect(values["ai.effort.talk_turn.1-3"]).toBe("medium");
    expect(values["ai.effort.talk_turn.4-6"]).toBe(
      config.values["ai.effort.talk_turn.4-6"],
    );
    expect(config.values["ai.effort.talk_turn.1-3"]).toBe("low");
  });
});

describe("메모리 대화(가짜 응답)", () => {
  it("첫 차례는 앱의 카드 인사 질문이다", () => {
    const m = materials3();
    const sim = createTalkSim(m, config.values, config.book);
    expect(sim.rows).toHaveLength(1);
    const first = sim.rows[0];
    const greeting = m.card.greeting;
    expect(first?.speaker).toBe("tori");
    if (first?.speaker === "tori" && "questions" in greeting)
      expect(first.text.trim()).toBe(greeting.questions[0]?.question.en);
  });

  it("보낼 응답 규격은 $defs · $ref 를 펼친 꼴이다(서버 talkOutputFormatOf 와 같음 — 400 grammar too large)", () => {
    const { greeting, sim } = afterGreeting();
    const format = (body: Record<string, unknown>) =>
      (body.output_config as { format: { type: string; schema: unknown } })
        .format;
    const sent = format(greeting.request.body);
    expect(sent.type).toBe("json_schema");
    expect(hasJsonSchemaRefs(sent.schema)).toBe(false);
    expect(JSON.stringify(sent.schema)).not.toContain("$defs");
    expect(
      Object.keys((sent.schema as { properties: object }).properties),
    ).toContain("child_kind");
    // 재질문 요청도 같은 꼴이다
    const ready = sim.prepare(say("Rice."), 1);
    if (!ready.ok) throw new Error(ready.reason);
    const ask = sim.retryOf(
      ready.turn,
      fakeMessage({ tori_en: "Rice, yum! Do you like xylophones?" }),
    );
    expect(ask).not.toBeNull();
    expect(hasJsonSchemaRefs(format(ask?.request.body ?? {}).schema)).toBe(
      false,
    );
  });

  it("인사 답은 인사 끝 차례(질문 없음)로 부르고, 첫 사용자 메시지는 앱 첫 말로 시작한다", () => {
    const { greeting, record, m } = afterGreeting();
    expect(greeting.segment).toBe("greeting_end");
    expect(greeting.ifAnswered.kind).toBe("ai");
    expect(greeting.ifAnswered.aiAsks).toBe(false);
    expect(greeting.userMessage.split("\n")[0]).toMatch(/^Mina \(app\): /);
    expect(greeting.userMessage).toContain("Segment: greeting_end");
    // 서버처럼 인사 끝 턴에 다음 토막(1~3단계는 짧은 준비)을 알린다(fix 1 I-1)
    expect(greeting.userMessage).toContain("Next part: short preparation");
    expect(greeting.request.model).toBe("claude-sonnet-5-5");
    expect(String(greeting.request.body.system)).not.toBe("");
    // 인사 끝 뒤 짧은 준비를 지나 대화 첫 질문(앱)이 붙는다
    expect(record.appAfter.join(" ")).toContain(m.card.required[0]?.en);
    expect(record.move.kind).toBe("ai");
    expect(record.usage?.firstSentenceMs).toBe(900);
  });

  it("첫 질문 막힘 둘: 받침 첫째(같이 말하기 · 답 소리) → 받침 둘째(카드 쉬운 질문)", () => {
    const { sim, m } = afterGreeting();
    const one = sim.prepare(dontKnow, 1);
    if (!one.ok) throw new Error(one.reason);
    expect(one.turn.ifAnswered.kind).toBe("card_slot");
    expect(one.turn.ifAnswered.stage).toBe(1);
    expect(one.turn.userMessage).toContain("Child: (don't know)");
    const r1 = sim.finish(
      one.turn,
      fakeMessage({ tori_en: "That's okay! Let's say it together." }),
    );
    expect(r1.sound.answer).toBe(m.card.required[0]?.answerExample);
    expect(r1.move.why).toBe("support");
    expect(r1.judge.answerFirst.auto).toBe(true);

    const two = sim.prepare(dontKnow, 2);
    if (!two.ok) throw new Error(two.reason);
    expect(two.turn.input.history).toHaveLength(2);
    expect(two.turn.heardHelp).toBe("answer_example");
    const r2 = sim.finish(
      two.turn,
      fakeMessage({ tori_en: "No problem! Let's try an easy one." }),
    );
    expect(r2.attach).toContain(m.card.required[0]?.easyQuestion.en);
    expect(r2.move.stage).toBe(2);
  });

  it("건너뛴 준비 낱말은 만난 낱말에서 빼고 다시 묻는 낱말에는 둔다(fix 1 I-2 · 분석 A9)", () => {
    const m = materials3();
    const metAfterPrep = (skipped: string[]) => {
      const sim = createTalkSim(m, config.values, config.book, {
        skippedPrep: skipped,
      });
      const a = sim.prepare(say("I am fine."), 0);
      if (!a.ok) throw new Error(a.reason);
      sim.finish(a.turn, fakeMessage({ tori_en: "Good to hear!" }));
      const b = sim.prepare(say("Rice."), 1);
      if (!b.ok) throw new Error(b.reason);
      return {
        met: b.turn.input.turn.context?.metUnknownWords,
        reask: b.turn.input.lineRange.reaskWords,
      };
    };
    expect(m.card.prep ?? []).toEqual(expect.arrayContaining(["eat", "drink"]));
    const skipped = metAfterPrep(["eat", "drink"]);
    expect(skipped.met).not.toContain("eat");
    expect(skipped.met).not.toContain("drink");
    expect(skipped.reask).toEqual(expect.arrayContaining(["eat", "drink"]));
    const all = metAfterPrep([]);
    expect(all.met).toEqual(expect.arrayContaining(["eat", "drink"]));
  });

  it("재질문 없이 끝내면 범위 밖 낱말 질문은 앱이 지우고 카드 자리로 바꾼다(question_check)", () => {
    const { sim } = afterGreeting();
    const ready = sim.prepare(say("Rice."), 1);
    if (!ready.ok) throw new Error(ready.reason);
    expect(ready.turn.ifAnswered.kind).toBe("ai");
    const record = sim.finish(
      ready.turn,
      fakeMessage({
        tori_en: "Rice, yum! Do you like xylophones?",
        recast: "We eat rice.",
        next_move: "follow_up",
      }),
    );
    expect(record.replaced).toBe("question_check");
    expect(record.move.kind).toBe("card_slot");
    expect(record.attach.length).toBeGreaterThan(0);
    expect(record.dropped.map((d) => d.en)).toContain(
      "Do you like xylophones?",
    );
  });

  describe("막힘 무름(13절 C204 (3) — 서버 onStuck overridden · withQuestionRetry rewrite 와 같은 길)", () => {
    // AI 는 막힘이라 했지만 아이 말이 새 이야기(child_kind new_topic)라 앱이 무른다
    const stuckReply = () =>
      fakeMessage({
        child_kind: "new_topic",
        stuck: true,
        tori_en: "That's okay! Let's say it together.",
        support: "together",
      });
    function topic() {
      const { sim } = afterGreeting();
      const ready = sim.prepare(say("I have a big dog."), 1);
      if (!ready.ok) throw new Error(ready.reason);
      return { sim, turn: ready.turn };
    }

    it("무른 1~3단계 질문 차례는 통째로 다시 쓰게 하는 요청 하나를 만든다", () => {
      const { sim, turn } = topic();
      const ask = sim.retryOf(turn, stuckReply());
      expect(ask?.kind).toBe("rewrite");
      expect(ask?.fail).toBeNull();
      const messages = ask?.request.body.messages as {
        role: string;
        content: string;
      }[];
      expect(messages.at(-2)).toEqual({
        role: "assistant",
        content: "That's okay! Let's say it together.",
      });
      expect(messages.at(-1)?.content).toContain("is not stuck");
    });

    it("다시 쓴 응답으로 턴을 통째로 바꾸고 갈래 · 막힘 무름을 적는다", () => {
      const { sim, turn } = topic();
      const ask = sim.retryOf(turn, stuckReply());
      if (!ask) throw new Error("다시 쓰기 없음");
      const record = sim.finish(turn, stuckReply(), {
        ask,
        result: fakeMessage({
          child_kind: "answer",
          tori_en: "A big dog! Do you like your dog?",
          next_move: "follow_child",
        }),
      });
      expect(record.teacher).toBe("A big dog! Do you like your dog?");
      expect(record.childKind).toBe("new_topic");
      expect(record.stuck).toEqual({ ai: true, app: false, overridden: true });
      expect(record.flags.join(" ")).toContain("막힘 무름");
      expect(record.reask?.outcome).toContain("막힘 무름");
      expect(record.move.kind).toBe("ai");
    });

    it("통째 다시 쓴 응답에 질문이 없으면 앞 문장을 모두 지우고 카드 자리다(서버 needsQuestion)", () => {
      const { sim, turn, m } = { ...topic(), m: materials3() };
      const ask = sim.retryOf(turn, stuckReply());
      if (!ask) throw new Error("다시 쓰기 없음");
      const record = sim.finish(turn, stuckReply(), {
        ask,
        result: fakeMessage({ tori_en: "A big dog!" }),
      });
      expect(record.replaced).toBe("fail");
      expect(record.move.kind).toBe("card_slot");
      expect(record.teacher).not.toContain("say it together");
      expect(record.dropped.map((d) => d.reason)).toContain("rewrite");
      expect(
        record.attach.some((l) => m.card.required.some((r) => r.en === l)),
      ).toBe(true);
      expect(record.reask?.outcome).toContain("앞 문장을 모두 지우고");
    });

    it("짧은 말이고 갈래가 막힘 갈래면 무르지 않는다(AI 막힘 그대로 — 받침 계획)", () => {
      // 영어 낱말 셋 이상 문장이면 갈래와 관계없이 무른다(child-kind ENGLISH_SENTENCE_MIN_WORDS) — 두 낱말 말로 본다
      const { sim } = afterGreeting();
      const ready = sim.prepare(say("Blue car."), 1);
      if (!ready.ok) throw new Error(ready.reason);
      const turn = ready.turn;
      const reply = fakeMessage({
        child_kind: "not_understood",
        stuck: true,
        tori_en: "That's okay! Let's say it together.",
      });
      expect(sim.retryOf(turn, reply)).toBeNull();
      const record = sim.finish(turn, reply);
      expect(record.stuck).toEqual({ ai: true, app: true, overridden: false });
      expect(record.move.stage).toBe(1);
    });
  });

  describe("재질문(13절 C203 (3) — 서버 withQuestionRetry 와 같은 차례)", () => {
    const offband = () =>
      fakeMessage({
        tori_en: "Rice, yum! Do you like xylophones?",
        recast: "We eat rice.",
        next_move: "follow_up",
      });
    function asked() {
      const { sim } = afterGreeting();
      const ready = sim.prepare(say("Rice."), 1);
      if (!ready.ok) throw new Error(ready.reason);
      return { sim, turn: ready.turn };
    }

    it("통과한 질문이면 재질문하지 않는다", () => {
      const { sim, turn } = asked();
      expect(
        sim.retryOf(
          turn,
          fakeMessage({ tori_en: "Rice, yum! Do you like fish?" }),
        ),
      ).toBeNull();
    });

    it("걸린 질문이면 앞 tori_en · 다시 쓰기 메시지를 이은 요청 하나를 만든다", () => {
      const { sim, turn } = asked();
      const ask = sim.retryOf(turn, offband());
      expect(ask?.kind).toBe("question");
      expect(ask?.fail?.reason).toBe("offband");
      expect(ask?.fail?.words).toContain("xylophones");
      const messages = ask?.request.body.messages as {
        role: string;
        content: string;
      }[];
      expect(messages.at(-2)).toEqual({
        role: "assistant",
        content: "Rice, yum! Do you like xylophones?",
      });
      expect(messages.at(-1)?.content).toContain("App check:");
      expect(messages).toHaveLength(
        (turn.request.body.messages as unknown[]).length + 2,
      );
    });

    it("다시 쓴 질문이 통과하면 앞 반응 뒤에 잇고 재질문 비용을 따로 적는다", () => {
      const { sim, turn } = asked();
      const ask = sim.retryOf(turn, offband());
      if (!ask) throw new Error("재질문 없음");
      const record = sim.finish(turn, offband(), {
        ask,
        result: fakeMessage({
          tori_en: "Do you like fish?",
          next_move: "follow_up",
        }),
      });
      expect(record.replaced).toBeNull();
      expect(record.move.kind).toBe("ai");
      expect(record.teacher).toBe("Rice, yum! Do you like fish?");
      expect(record.recast).toBe("We eat rice.");
      expect(record.reask?.outcome).toContain("다시 쓴 질문 통과");
      expect(record.reask?.usage?.costUsd).toBeGreaterThan(0);
      // 첫 시도 글 · 걸림 까닭을 남긴다(검토 M-6)
      expect(record.reask?.firstToriEn).toBe(
        "Rice, yum! Do you like xylophones?",
      );
      expect(record.reask?.firstFail).toEqual({
        question: "Do you like xylophones?",
        reason: "offband",
        words: ["xylophones"],
      });
      expect(record.reask?.retryToriEn).toBe("Do you like fish?");
      expect(record.reask?.retryFail).toBeNull();
    });

    it("다시 써도 걸리면 지금처럼 카드 자리다", () => {
      const { sim, turn } = asked();
      const ask = sim.retryOf(turn, offband());
      if (!ask) throw new Error("재질문 없음");
      const record = sim.finish(turn, offband(), {
        ask,
        result: fakeMessage({ tori_en: "Do you like trombones?" }),
      });
      expect(record.replaced).toBe("question_check");
      expect(record.move.kind).toBe("card_slot");
      expect(record.reask?.outcome).toContain("다시 써도 걸림");
      // 두 번의 걸림 까닭(첫 시도 · 다시 쓴 시도)을 함께 남긴다(검토 M-6)
      expect(record.reask?.firstFail.words).toContain("xylophones");
      expect(record.reask?.retryFail).toEqual({
        question: "Do you like trombones?",
        reason: "offband",
        words: ["trombones"],
      });
      expect(record.reask?.outcome).toContain(
        '"Do you like xylophones?" offband(xylophones)',
      );
      expect(record.reask?.outcome).toContain(
        '"Do you like trombones?" offband(trombones)',
      );
    });

    it("다시 쓴 응답에 질문이 없으면 앞 응답으로 카드 자리다", () => {
      const { sim, turn } = asked();
      const ask = sim.retryOf(turn, offband());
      if (!ask) throw new Error("재질문 없음");
      const record = sim.finish(turn, offband(), {
        ask,
        result: fakeMessage({ tori_en: "Yum." }),
      });
      expect(record.replaced).toBe("question_check");
      expect(record.reask?.outcome).toContain("질문 없음");
    });
  });

  it("같은 질문 상한에 닿은 AI 질문은 같은 질문 카드 자리다", () => {
    const { sim, m } = afterGreeting();
    const ready = sim.prepare(say("We eat."), 1);
    if (!ready.ok) throw new Error(ready.reason);
    const asked = "What do you do at the table?";
    const evaluated = evaluateLessonMessage(
      fakeMessage({
        tori_en: `Yum! ${asked}`,
        next_move: "required",
        next_targets: ["eat"],
      }) as CallResult & { ok: true },
      ready.turn.input,
      ready.turn.rules,
    );
    expect(evaluated.value).not.toBeNull();
    const value = evaluated.value as NonNullable<typeof evaluated.value>;
    const settled = settleTurn({
      chosen: ready.turn.ifAnswered,
      value,
      sentences: splitSentences(value.tori_en),
      soundFixed: false,
      materials: m,
      turns: [],
      asked: new Map([[questionKeyOf(asked), 2]]),
      max: 2,
      lineOptions: {
        sentenceMaxWords: m.ctx.sentenceMaxWords,
        allowedWords: m.allowedWords,
        unitWords: m.ctx.unitWords,
        childWords: ["we", "eat"],
        teacherName: m.teacher.nameEn,
        lemmaOf: m.lemmaOf,
        forms: m.forms,
        allowedForms: m.allowedForms,
      },
    });
    expect(settled.replaced).toBe("same_question");
    expect(settled.move.kind).toBe("card_slot");
  });

  it("문장 문에 걸린 문장이 있으면 그 턴의 뜻을 보이지 않는다(서버 이번 패치 판, C202 (5))", () => {
    const { sim, m } = afterGreeting();
    const ready = sim.prepare(say("We eat."), 1);
    if (!ready.ok) throw new Error(ready.reason);
    const value = evaluateLessonMessage(
      fakeMessage({ tori_en: "Yum! We eat rice." }) as CallResult & {
        ok: true;
      },
      ready.turn.input,
      ready.turn.rules,
    ).value as NonNullable<ReturnType<typeof evaluateLessonMessage>["value"]>;
    const settle = (blockedSentences: number) =>
      settleTurn({
        chosen: ready.turn.ifAnswered,
        value,
        sentences: splitSentences(value.tori_en),
        soundFixed: false,
        blockedSentences,
        materials: m,
        turns: [],
        asked: new Map(),
        max: 2,
        lineOptions: {
          sentenceMaxWords: m.ctx.sentenceMaxWords,
          allowedWords: m.allowedWords,
          unitWords: m.ctx.unitWords,
          childWords: ["we", "eat"],
          teacherName: m.teacher.nameEn,
          lemmaOf: m.lemmaOf,
          forms: m.forms,
          allowedForms: m.allowedForms,
        },
      }).ko;
    expect(settle(0)).not.toBeNull();
    expect(settle(1)).toBeNull();
  });

  it("recast 기대 낱말을 담았는지 적는다", () => {
    const { sim } = afterGreeting();
    const ready = sim.prepare(
      { say: "Rice.", expect: { recastWord: "rice", followUp: true } },
      1,
    );
    if (!ready.ok) throw new Error(ready.reason);
    const record = sim.finish(
      ready.turn,
      fakeMessage({
        tori_en: "We eat rice! Do you like fish?",
        recast: "We eat rice.",
        next_move: "follow_up",
      }),
    );
    expect(record.recastCheck).toEqual({ word: "rice", ok: true });
    expect(record.judge.followUp).toEqual({ expect: true, auto: true });
  });
});

describe("판정 칸", () => {
  it("같은 소리 두 번은 앱이 붙인 글 줄과 AI 문장도 견준다(검토 M-2)", () => {
    const card = {
      kind: "question" as const,
      role: "card" as const,
      en: "The sun is down. What do you do now?",
      item: { kind: "required" as const, no: 5 },
    };
    expect(
      sameSoundTwiceOf({
        kept: ["The sun is down."],
        attach: [card],
        sound: {},
      }),
    ).toBe(true);
    expect(
      sameSoundTwiceOf({ kept: ["Oh, okay!"], attach: [card], sound: {} }),
    ).toBe(false);
    // AI 문장이 소리 줄의 답을 담음
    expect(
      sameSoundTwiceOf({
        kept: ["Yes, we come home."],
        attach: [{ kind: "sound", role: "answer", en: "We come home." }],
        sound: {},
      }),
    ).toBe(true);
  });

  it("장면 단정 문장은 'You are …' 평서문이다", () => {
    expect(isSceneAssert("You are thirsty.")).toBe(true);
    expect(isSceneAssert("You're hungry!")).toBe(true);
    expect(isSceneAssert("Are you thirsty?")).toBe(false);
    expect(isSceneAssert("Oh, cold juice!")).toBe(false);
  });

  it("같은 소리 두 번 · 답을 먼저 들려줌 · 기대 값을 칸마다 둔다", () => {
    const move = talkMoveOf({ kind: "ai", next: "required" });
    const judge = judgeOf({
      expect: { sameSoundTwice: false, answerFirst: false },
      move,
      kept: ["You are thirsty.", "What do you do with the juice?"],
      attach: [],
      ko: null,
      sound: {
        model: "I drink the juice.",
        choices: ["I drink the juice.", "I wash the juice."],
      },
      spec: { koMeaning: true },
      prevTeacher: talkMoveOf({
        kind: "ai",
        item: { kind: "required", no: 1 },
      }),
      lastChildSpoke: true,
      returned: null,
    });
    expect(Object.keys(judge)).toEqual([...JUDGE_KEYS]);
    expect(judge.sameSoundTwice).toEqual({ expect: false, auto: true });
    expect(judge.answerFirst).toEqual({ expect: false, auto: true });
    expect(judge.sceneAssert.auto).toBe(true);
    expect(judge.koMeaning.auto).toBe(false);
    expect(judge.followUp.auto).toBe(false);
    expect(judge.returns).toEqual({ expect: null, auto: false });
    // 사람만 보는 두 칸(검토 149줄 5)
    expect(judge.stuckRight).toEqual({ expect: null, auto: null });
    expect(judge.ownReaction).toEqual({ expect: null, auto: null });
  });
});

describe("보고", () => {
  function report(): RunReport {
    const { sim, record } = afterGreeting();
    const ready = sim.prepare(say("Rice | fish"), 1);
    if (!ready.ok) throw new Error(ready.reason);
    const second = sim.finish(
      ready.turn,
      fakeMessage({
        tori_en: "We eat rice! Do you like fish?",
        recast: "We eat rice.",
        next_move: "follow_up",
      }),
    );
    const turns: TurnRecord[] = [
      record,
      {
        ...second,
        design: "설계 | 예",
        reask: {
          usage: second.usage ? { ...second.usage, costUsd: 0.0001 } : null,
          outcome: "다시 쓴 질문 통과",
          firstToriEn: "Rice! Do you like xylophones?",
          firstFail: {
            question: "Do you like xylophones?",
            reason: "offband",
            words: ["xylophones"],
          },
          retryToriEn: "Do you like fish?",
          retryFail: null,
        },
      },
    ];
    return {
      script: {
        name: "l3-word-answers",
        title: "3단계 · 낱말 하나로 답하기",
        level: 3,
        unit: 1,
        lesson: 1,
        teacher: "mina",
      },
      model: "claude-sonnet-5-5",
      effort: "low",
      thinking: "between_tools",
      turns,
      opening: ["Hello, {NAME}! How are you?"],
      stopped: null,
    };
  }

  it("턴 표 · 나란히 표 · 합계를 쓰고 표 칸의 | 를 가린다", () => {
    const md = reportMarkdown({
      date: "2026-11-05",
      runs: [report()],
      skipped: [],
    });
    expect(md).toContain("## 3단계 · 낱말 하나로 답하기");
    expect(md).toContain("### 나란히(설계 예시 · 기대 옆에 실제)");
    expect(md).toContain("## 합계");
    expect(md).toContain("Rice \\| fish");
    expect(md).toContain("설계 \\| 예");
    expect(md).toContain(
      "카드 질문을 맥락 없이 끼운 턴(사람 판정, AC-15o (라)) | □",
    );
    expect(md).toContain("재질문 0.000100");
    expect(md).toContain("재질문: 다시 쓴 질문 통과");
    expect(md).toContain("갈래(child_kind · 막힘)");
    expect(md).toContain("막힘 판정 맞음: 기대 · 자동 · 사람");
    expect(md).toContain("선생님 자기 반응 한마디 있음: 기대 · 자동 · 사람");
  });

  it("합계는 호출 · 토큰 · 비용 · 첫 문장 · 이어 묻기를 센다", () => {
    const t = totalsOf([report()]);
    expect(t.turns).toBe(2);
    expect(t.calls).toBe(2);
    expect(t.inputTokens).toBe(10000);
    expect(t.firstSentenceP50).toBe(900);
    expect(t.followUps).toBe(1);
    expect(t.costUsd).toBeGreaterThan(0);
    expect(t.reaskTurns).toBe(1);
    expect(t.reaskCostUsd).toBe(0.0001);
  });
});
