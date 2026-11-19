// 대본 도구의 Claude 주도 길 ↔ 서버 턴 길 짝 시험(수업 안 한국어로 묻기 셋째 물결 고침 1 — 검토 rev-b4d 6절, 13절 C240 · C225 보완 1 (3) (4) (6) ·
// C225 보완 2 (1)). 서버 lesson-turn(turnKoHelpStandingOf — 지금 턴 번호와 되묻는 차례를 건너 이어받은 턴 번호의 도움 행)과 lead-turn(core
// leadKoHelpOf — 사실 줄의 가르친 표현 · 막힘 무름 · '말했다' 목록)은 DB 를 부르므로, 서버가 쓰는 순수 함수(state.ts koHelpTurnRowOf · core
// koHelpStandingOf · leadKoHelpOf)에 같은 행을 넣은 값과 도구의 값을 맞댄다(talk-observe-parity 의 꼴). 후보 판정 행의 koHelp 는 core
// leadCandidateKoHelpTurnsOf 의 값이다.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isLowBandLevel } from "@/core/ai/calls/talk-lesson";
import {
  type KoHelpStandingRow,
  koHelpStandingOf,
  koHelpTurnNosOf,
  leadKoHelpOf,
} from "@/core/conversation/ko-help";
import { TALK_LEAD_MODE_KEY } from "@/core/conversation/lead-mode";
import { koHelpTurnRowOf } from "@/server/conversation/state";
import { seedHomophones } from "@/server/seed-lists";
import { loadScriptConfig } from "../../scripts/ai-contract";
import {
  type CallResult,
  createTalkSim,
  type LeadSimEntry,
  type Materials,
  materialsOf,
  type ObserveStep,
  observeKoTurnRowOf,
  observeLeadKoStandingOf,
  parseObserveScript,
  readSeedFiles,
  type SimRow,
  type TalkSim,
} from "../../scripts/talk-observe";

const ROOT = process.cwd();
const config = loadScriptConfig({ root: ROOT });
const LEAD_VALUES: Record<string, unknown> = {
  ...config.values,
  [TALK_LEAD_MODE_KEY]: "claude",
};
const TAUGHT = "I like gimbap.";
const LEAD_LINE = `The child asked in Korean and was taught: "${TAUGHT}".`;
const taughtHelp = [
  {
    kind: "expression" as const,
    sayKo: "김밥이 좋다고 말하고 싶구나. 이렇게 말해 봐.",
    teachEn: TAUGHT,
    textShown: false,
    heard: true,
  },
];

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

function resultOf(body: Record<string, unknown>): CallResult {
  return {
    ok: true,
    message: {
      model: "claude-sonnet-5-5",
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify(body) }],
      usage: {
        input_tokens: 4000,
        output_tokens: 200,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
    latencyMs: 1800,
    firstSentenceMs: 700,
    requestId: "req_lead",
  } satisfies CallResult;
}

/** 지금 길 응답(인사 토막). */
const greetResult = (toriEn: string) =>
  resultOf({
    child_kind: "answer",
    stuck: false,
    tori_en: toriEn,
    model_line: "",
    choices: [],
    tori_ko: ["뜻 1"],
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
  });

/** 새 엔진 응답(아홉 칸 — 빈 값 + 덮어쓴 칸). */
const leadResult = (over: Record<string, unknown>) =>
  resultOf({
    reading: "clear_answer",
    move: "react_and_follow_up",
    say: "Nice!",
    say_ko: "",
    model_sentence: "",
    hint_ko: "",
    hint_en: "",
    goal_words_i_said: [],
    child_used_on_own: [],
    ...over,
  });

const child = (step: ObserveStep, stepIndex: number): LeadSimEntry => ({
  kind: "child",
  step,
  stepIndex,
});

/** 3단계 단원 1 의 새 엔진 수업: 인사를 지금 길로 마치고 입구 start 를 지난 상태. */
function leadTalking(m: Materials): TalkSim {
  const sim = createTalkSim(m, LEAD_VALUES, config.book);
  for (let i = 0; i < 4 && !sim.lead.applies(); i++) {
    const g = sim.prepare({ say: "I am fine." }, i);
    if (!g.ok) throw new Error(g.reason);
    sim.finish(g.turn, greetResult("Good to hear!"));
  }
  const open = sim.lead.prepare({ kind: "open", open: "start" });
  if (!open.ok) throw new Error(open.reason);
  sim.lead.finish(
    open.turn,
    leadResult({ say: "Let's talk! What food do you like?" }),
  );
  return sim;
}

/** 서버 lesson-turn 의 좁힘(state.ts readTurnKoHelpRows + turnKoHelpStandingOf — 서버의 행 변환 koHelpTurnRowOf 로). */
function serverStandingOf(
  rows: readonly SimRow[],
  koRows: readonly KoHelpStandingRow[],
) {
  const turnNos = koHelpTurnNosOf(
    rows.map((r) =>
      koHelpTurnRowOf({
        speaker: r.speaker,
        turnNo: r.turnNo,
        askAgain: r.speaker === "child" ? (r.askAgain ?? null) : null,
        move: r.speaker === "tori" ? r.move : null,
      }),
    ),
  );
  const read = koRows.filter((r) => turnNos.includes(r.turnNo));
  return read.length === 0
    ? null
    : koHelpStandingOf(read, { lowBand: isLowBandLevel(3) });
}

/** 서버 lead-turn.ts koLead 의 인자(같은 설정 · 같은 사전 · 같은 소리 같은 낱말). */
const serverKoLeadOf = (
  m: Materials,
  standing: ReturnType<typeof serverStandingOf>,
  heard: string,
  speech: boolean,
) =>
  leadKoHelpOf(standing, {
    heard,
    speech,
    unitWords: m.ctx.unitWords,
    lemmaOf: m.lemmaOf,
    minMatch: LEAD_VALUES["talk.hint_read_match"] as number,
    homophones: seedHomophones(),
  });

describe("대본 도구의 Claude 주도 길 — 한국어 도움 뒤 차례(서버와 같은 재료)", () => {
  it("AC-25j AC-25o AC-26c [N-1] 짝: 도움 뒤 차례 · 되묻는 차례 뒤 이어받은 차례 · '잘 모르겠어요' 차례의 대접 · 사실 줄 · 막힘 무름 · '말했다' 거름 · 후보 행 koHelp 가 서버 값과 같다", () => {
    const m = materials3();
    const sim = leadTalking(m);
    const turnNo = sim.rows.findLast((r) => r.speaker === "tori")?.turnNo ?? 0;
    const koRows: KoHelpStandingRow[] = [
      {
        turnNo,
        seq: 1,
        kind: "expression",
        sayKo: taughtHelp[0].sayKo,
        teachEn: TAUGHT,
        textShown: false,
        fallback: "none",
        shownEn: null,
        heard: true,
      },
    ];

    // (1) 도움 뒤 한두 낱말 꼴(틀리게 적힌 글) — 도움 없는 같은 차례와 견준다
    const plain = sim.lead.prepare(child({ say: "Kimbob." }, 1));
    const helped = sim.lead.prepare(
      child({ say: "Kimbob.", koHelp: taughtHelp }, 1),
    );
    if (!plain.ok || !helped.ok) throw new Error("준비하지 못했다");
    expect(plain.turn.ko.standing).toBeNull();
    expect(plain.turn.ko.rows).toEqual([]);
    expect(plain.turn.input.turn.status).not.toHaveProperty("koTaught");
    expect(plain.turn.userMessage).not.toContain("Korean");
    const standing1 = serverStandingOf(sim.rows, koRows);
    expect(helped.turn.ko.rows).toEqual(koRows);
    expect(helped.turn.ko.standing).toEqual(standing1);
    expect(helped.turn.ko.lead).toEqual(
      serverKoLeadOf(m, standing1, "Kimbob.", true),
    );
    expect(helped.turn.input.turn.status.koTaught).toEqual([TAUGHT]);
    expect(helped.turn.userMessage.split(LEAD_LINE)).toHaveLength(2);
    expect(helped.turn.child?.hintKind).toBe("english");
    expect(plain.turn.child?.hintKind).toBe("none");
    // 선생님이 되묻는다(move ask_again) — 아이 행에 되물음 표지 · '말했다' 0(힌트 종류 '영어')
    sim.lead.finish(
      helped.turn,
      leadResult({
        reading: "likely_misheard",
        move: "ask_again",
        say: "Gimbap? Do you like gimbap?",
      }),
    );
    const asked = sim.rows.findLast((r) => r.speaker === "child");
    expect(asked).toMatchObject({
      turnNo,
      askAgain: true,
      hintKind: "english",
      saidWords: [],
    });
    // 도구의 행 변환 사본이 서버 koHelpTurnRowOf 와 같다(아이 행 표지 · 선생님 행 move.lead.move)
    for (const r of sim.rows)
      expect(observeKoTurnRowOf(r)).toEqual(
        koHelpTurnRowOf({
          speaker: r.speaker,
          turnNo: r.turnNo,
          askAgain: r.speaker === "child" ? (r.askAgain ?? null) : null,
          move: r.speaker === "tori" ? r.move : null,
        }),
      );

    // (2) 되묻는 차례 뒤 아이 차례(도움 칸 없음)는 앞 차례의 도움을 이어받는다 — 대접 · 사실 줄 · 힌트 종류가 서버와 같다('Gimbap.' 은 가르친
    // 표현과 1/3 만 맞아 막힘 무름은 거짓 쪽이다. 참 쪽은 아래 '막힘 무름이 참' 시험이 본다, rev-b4d-2 N-1)
    const inherited = sim.lead.prepare(child({ say: "Gimbap." }, 2));
    if (!inherited.ok) throw new Error(inherited.reason);
    const standing2 = serverStandingOf(sim.rows, koRows);
    expect(standing2).not.toBeNull();
    expect(observeLeadKoStandingOf(sim.rows, koRows, true)).toEqual(standing2);
    expect(inherited.turn.ko.rows).toEqual([]);
    expect(inherited.turn.ko.standing).toEqual(standing2);
    expect(inherited.turn.ko.lead).toEqual(
      serverKoLeadOf(m, standing2, "Gimbap.", true),
    );
    expect(inherited.turn.userMessage.split(LEAD_LINE)).toHaveLength(2);
    expect(inherited.turn.child?.hintKind).toBe("english");
    sim.lead.finish(
      inherited.turn,
      leadResult({
        reading: "does_not_fit",
        move: "react_and_follow_up",
        say: "Yummy! What else do you like?",
      }),
    );
    const after = sim.rows.findLast((r) => r.speaker === "child");
    expect(after).toMatchObject({
      turnNo: turnNo + 1,
      hintKind: "english",
      saidWords: [],
    });

    // (3) 되묻지 않은 차례 뒤는 도움이 없다(AC-N26)
    const next = sim.lead.prepare(child({ say: "Pizza." }, 3));
    if (!next.ok) throw new Error(next.reason);
    expect(next.turn.ko.standing).toBeNull();
    expect(next.turn.userMessage).not.toContain("Korean");
    sim.lead.finish(next.turn, leadResult({ say: "Pizza is good!" }));

    // (4) 도움 뒤 '잘 모르겠어요'(C225 보완 2 (1)): 사실 줄은 실리고 힌트 종류 올림 · 막힘 무름은 없다
    const dkTurnNo =
      sim.rows.findLast((r) => r.speaker === "tori")?.turnNo ?? 0;
    const dk = sim.lead.prepare(
      child({ input: "dont_know", koHelp: taughtHelp }, 4),
    );
    if (!dk.ok) throw new Error(dk.reason);
    const dkRows = [...koRows, { ...koRows[0], turnNo: dkTurnNo }] as const;
    const standing4 = serverStandingOf(sim.rows, dkRows);
    expect(dk.turn.ko.standing).toEqual(standing4);
    expect(dk.turn.ko.lead).toEqual(serverKoLeadOf(m, standing4, "", false));
    expect(dk.turn.ko.lead.taughtMatched).toBe(false);
    expect(dk.turn.userMessage.split(LEAD_LINE)).toHaveLength(2);
    expect(dk.turn.child?.hintKind).toBe("none");
    sim.lead.finish(
      dk.turn,
      leadResult({
        reading: "does_not_know",
        move: "model_repeat",
        say: "That's okay! Say it with me: I like gimbap.",
        model_sentence: TAUGHT,
      }),
    );

    // (5) 후보 판정 행의 koHelp: 도움 차례 · 이어받은 차례만(core leadCandidateKoHelpTurnsOf — 모름 단추 차례도 대접이 ko_help 다)
    const candidate = sim.lead.candidateRows();
    const childKo = candidate.flatMap((r) =>
      r.role === "child" ? [r.koHelp] : [],
    );
    expect(childKo).toEqual([true, true, false, true]);
  });

  it("AC-25o [rev-b4d-2 N-1] 짝: 도움 뒤 가르친 표현과 문턱 이상 맞는 두 낱말 말은 읽기 칸이 막힘 갈래여도 막힘이 아니고(서버와 같은 taughtMatched), 도움 없는 같은 차례는 막힘이다", () => {
    const m = materials3();
    const taught = "Gimbap, please.";
    const say = "Gimbap please.";
    const help = [{ ...taughtHelp[0], teachEn: taught }];
    const stuckReply = leadResult({
      reading: "does_not_fit",
      move: "react_and_follow_up",
      say: "Yummy! What else do you like?",
    });
    // 도움 없는 같은 차례: 두 낱말 말이라 isEnglishSaying(·,3) 이 무르지 않고, 막힘 갈래 그대로 막힘이다
    const plainSim = leadTalking(m);
    const plain = plainSim.lead.prepare(child({ say }, 1));
    if (!plain.ok) throw new Error(plain.reason);
    expect(plain.turn.ko.lead.taughtMatched).toBe(false);
    plainSim.lead.finish(plain.turn, stuckReply);
    expect(plainSim.rows.findLast((r) => r.speaker === "child")).toMatchObject({
      text: say,
      stuck: true,
    });
    // 도움 뒤 같은 차례: 일치율 1(문턱 talk.hint_read_match 이상)이라 막힘 무름
    const sim = leadTalking(m);
    const turnNo = sim.rows.findLast((r) => r.speaker === "tori")?.turnNo ?? 0;
    const koRows: KoHelpStandingRow[] = [
      {
        turnNo,
        seq: 1,
        kind: "expression",
        sayKo: help[0].sayKo,
        teachEn: taught,
        textShown: false,
        fallback: "none",
        shownEn: null,
        heard: true,
      },
    ];
    const helped = sim.lead.prepare(child({ say, koHelp: help }, 1));
    if (!helped.ok) throw new Error(helped.reason);
    const standing = serverStandingOf(sim.rows, koRows);
    expect(helped.turn.ko.standing).toEqual(standing);
    const server = serverKoLeadOf(m, standing, say, true);
    expect(server.taughtMatched).toBe(true);
    expect(helped.turn.ko.lead).toEqual(server);
    sim.lead.finish(helped.turn, stuckReply);
    expect(sim.rows.findLast((r) => r.speaker === "child")).toMatchObject({
      text: say,
      stuck: false,
      hintKind: "english",
    });
  });

  it("대본 l3-lead-ko-help 는 꼴 검사를 지나고 Claude 주도 방식으로 덮으며, 도움 뒤 말이 한두 낱말 꼴 · 문장 꼴 · '잘 모르겠어요'를 함께 둔다", () => {
    const raw = JSON.parse(
      readFileSync(
        `${ROOT}/tests/fixtures/talk-observe/l3-lead-ko-help.json`,
        "utf8",
      ),
    );
    const parsed = parseObserveScript(raw, "l3-lead-ko-help.json");
    if (!parsed.ok) throw new Error(parsed.error);
    const { script } = parsed;
    expect(script.settings).toEqual({ [TALK_LEAD_MODE_KEY]: "claude" });
    expect([script.level, script.unit, script.lesson]).toEqual([3, 1, 1]);
    const withHelp = script.steps.filter((s) => s.koHelp !== undefined);
    expect(withHelp.map((s) => s.say ?? s.input)).toEqual([
      "Kimbob.",
      "I drink meal.",
      "dont_know",
    ]);
    // 도움 뒤 바로 다음 차례(되묻는 차례 뒤 이어받기를 볼 자리)는 도움 칸 없는 한두 낱말 말이다
    const first = script.steps.findIndex((s) => s.koHelp !== undefined);
    expect(script.steps[first + 1]).toEqual({ say: "Gimbap." });
  });
});
