// 실험 도구의 단계 인자와 4단계 아이 역 시나리오(브리프 task-impl-chat4-tools — 13절 C254 · 분석 task-ana-talk4-ready 2.2 R2 · 2.3 S6 · 5절 묶음 4,
// 장부 T-340 ⑥). 인자가 없으면 지금 동작(회화 3단계 단원 1)과 같은지, 4단계 아이 역 글이 3단계와 같은 갈래 · 비율인지, 개정 5 견본 인자와 수업 행
// 고르기를 본다. 네트워크 · DB 없음.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadScriptConfig } from "../../scripts/ai-contract";
import {
  CHILD_HEADER,
  CHILD_PERSONAS,
  CHILD_PERSONAS_L4,
  childHasNoise,
  childPersonaOf,
  childSystemOf,
  SCENARIO_CHILDREN,
} from "../../scripts/exp/arch-arms";
import {
  ALL_CHILDREN,
  CHAT_CARD_SCRIPT,
  cardScriptOf,
  DEFAULT_CARD_WHERE,
  parseRunArgs,
  plannedLessonsOf,
  preflightOf,
  setupOf,
} from "../../scripts/exp/arch-compare";
import {
  scenarioMarkdownOf,
  setupLevelOf,
} from "../../scripts/exp/arch-report";
import {
  DEFAULT_SPOT_WHERE,
  parseSpotArgs,
  spotEnvOf,
} from "../../scripts/exp/chat-spots";
import {
  EVAL_CONFIG_LEVEL,
  parseCompareArgs,
} from "../../scripts/talk-chat-compare";
import {
  CHANCE_ALERT_DEFAULT,
  cardFileOf,
  lessonRowOf,
  materialsOf,
  parseArgs,
  readScriptFiles,
  readSeedFiles,
  runTalkObserve,
  seedReaderOf,
  type TalkObserveArgs,
} from "../../scripts/talk-observe";

const ROOT = process.cwd();
const REV5 = "tests/fixtures/talk-lesson-3-1-rev5.json";
const SCENARIO_RUN = [
  "--out",
  "x",
  "--turns",
  "16",
  "--children",
  SCENARIO_CHILDREN.join(","),
  "--seeds",
  "1,2",
  "--arms",
  "CHAT",
  "--card",
  "lesson1",
  "--long",
  "--shuffle",
  "1",
];

describe("arch-compare 단계 · 단원 · 수업 인자와 긴 대본 씨앗(S6)", () => {
  it("인자가 없으면 회화 3단계 단원 1 수업 1 · 긴 대본 씨앗 1 한 벌이고, 카드 틀은 지난 CHAT_CARD_SCRIPT 그대로다", () => {
    const args = parseRunArgs(SCENARIO_RUN);
    expect(args.where).toEqual({ level: 3, unit: 1, lesson: 1 });
    expect(args.longSeeds).toEqual([1]);
    expect(cardScriptOf(DEFAULT_CARD_WHERE)).toBe(CHAT_CARD_SCRIPT);
    const long = plannedLessonsOf(args).filter((l) => l.variant === "long");
    expect(long.map((l) => l.lesson)).toEqual(["CHAT-SE-s1-long"]);
  });

  it("--level 4 --unit 1 은 4단계 카드 틀을, --long-seeds 1,2 는 긴 대본 둘(씨앗마다 한 벌)을 계획한다", () => {
    const args = parseRunArgs([
      ...SCENARIO_RUN,
      "--level",
      "4",
      "--unit",
      "1",
      "--long-seeds",
      "1,2",
    ]);
    expect(args.where).toEqual({ level: 4, unit: 1, lesson: 1 });
    const script = cardScriptOf(args.where);
    expect(script).toMatchObject({
      name: "exp-chat-l4u1-lesson1",
      level: 4,
      unit: 1,
      lesson: 1,
      teacher: CHAT_CARD_SCRIPT.teacher,
    });
    const planned = plannedLessonsOf(args);
    expect(planned.filter((l) => l.variant === undefined)).toHaveLength(16);
    expect(
      planned.filter((l) => l.variant === "long").map((l) => l.lesson),
    ).toEqual(["CHAT-SE-s1-long", "CHAT-SE-s2-long"]);
  });

  it("replay 카드에 자리 인자를 주거나 긴 대본 씨앗이 겹치면 멈춘다", () => {
    expect(() => parseRunArgs(["--out", "x", "--level", "4"])).toThrow(
      "--card lesson1 에서만",
    );
    expect(() =>
      parseRunArgs(["--out", "x", "--card", "lesson1", "--level", "0"]),
    ).toThrow("1 이상 정수");
    expect(() =>
      parseRunArgs([...SCENARIO_RUN, "--long-seeds", "1,1"]),
    ).toThrow("같은 씨앗");
  });

  it("--level 3 --unit 1 --lesson 1 을 적어 준 계획 · 같은 조건 표는 인자 없는 계획과 글자까지 같다", () => {
    const plain = parseRunArgs(SCENARIO_RUN);
    const explicit = parseRunArgs([
      ...SCENARIO_RUN,
      "--level",
      "3",
      "--unit",
      "1",
      "--lesson",
      "1",
    ]);
    const a = preflightOf(
      setupOf(ROOT, { card: plain.card, where: plain.where }),
      plain,
    );
    const b = preflightOf(
      setupOf(ROOT, { card: explicit.card, where: explicit.where }),
      explicit,
    );
    expect(b.lines).toEqual(a.lines);
    expect(a.exitCode).toBe(0);
    expect(a.plan.total.all).toBe(1404);
  });
});

describe("4단계 아이 역 시나리오 여덟(arch-arms CHILD_PERSONAS_L4)", () => {
  /** 3단계 글과 4단계 글이 같이 가져야 하는 갈래 · 비율의 글(행동 규칙 — 이야기 거리와 예문은 다름). */
  const SAME_RULES: Record<(typeof SCENARIO_CHILDREN)[number], string[]> = {
    SA: [
      "one to four words, one new piece per turn",
      "after two such turns you try once more",
    ],
    SB: [
      "In your second turn you ask",
      "you answer it in one word and then ask the teacher another question about herself",
    ],
    SC: [
      "You answer with one word only",
      "You never start a topic and you never ask a question",
      'you only say "Okay...".',
    ],
    SD: [
      'you press the "I don\'t know" button, or you answer with one word that does not fit, or you say a Korean word like "몰라요"',
      'If the teacher keeps drilling the same thing, you press "I don\'t know" again.',
    ],
    SD2: [
      'In about one turn out of three you press the "I don\'t know" button.',
      "In about one turn out of four you answer with one word that does not fit at all",
      "Sometimes you just stay silent.",
    ],
    SG: [
      "you usually stay silent (about two times out of three)",
      'you stay silent or press the "I don\'t know" button',
      "you slowly start to say two words",
    ],
    SE: [
      "In most turns you either ask the teacher a question or bring up a new thing",
      "you ignore it once and continue with yours",
    ],
    SF: [
      "for about eight turns, in short sentences",
      "after you are tired you choose to stop",
    ],
  };

  it("여덟 갈래가 모두 있고, 갈래마다 3단계 글의 행동 규칙(비율 · 말 수 · 모름 · 말 없음 · 한국어 낱말)을 글자 그대로 가진다", () => {
    expect(Object.keys(CHILD_PERSONAS_L4).sort()).toEqual(
      [...SCENARIO_CHILDREN].sort(),
    );
    for (const k of SCENARIO_CHILDREN)
      for (const rule of SAME_RULES[k]) {
        expect(CHILD_PERSONAS[k], `${k} 3단계`).toContain(rule);
        expect(CHILD_PERSONAS_L4[k], `${k} 4단계`).toContain(rule);
      }
  });

  it("한국어 낱말은 3단계처럼 SD 의 '몰라요' 하나뿐이고, 이야기 거리는 3단계와 다르다", () => {
    const hangul = (t: string) => t.match(/[가-힣]+/g) ?? [];
    for (const k of SCENARIO_CHILDREN) {
      expect(hangul(CHILD_PERSONAS_L4[k]), k).toEqual(
        hangul(CHILD_PERSONAS[k]),
      );
      expect(CHILD_PERSONAS_L4[k], k).not.toBe(CHILD_PERSONAS[k]);
    }
    expect(hangul(CHILD_PERSONAS_L4.SD)).toEqual(["몰라요"]);
  });

  it("SA 의 예문은 3단계처럼 한 조각이 네 낱말 이하이고, 4단계 예문에는 '사람 + 동사-s' 말과 -s 를 빠뜨린 말이 함께 든다", () => {
    const quoted = [...CHILD_PERSONAS_L4.SA.matchAll(/"([^"]+)"/g)].map(
      (m) => m[1] ?? "",
    );
    expect(quoted.length).toBeGreaterThanOrEqual(4);
    for (const q of quoted)
      expect(q.split(/\s+/).length, q).toBeLessThanOrEqual(4);
    const all = Object.values(CHILD_PERSONAS_L4).join(" ");
    expect(all).toContain("She dances at school!");
    expect(all).toContain("My friend dance!");
  });

  it("아이 역 안내문: 3단계는 지난 글 그대로(단계 인자 없음과 같음), 4단계는 같은 머리 + 4단계 글, 글이 없는 단계 · 아이 역은 멈춘다", () => {
    for (const k of ALL_CHILDREN) {
      expect(childSystemOf(k, 3)).toBe(childSystemOf(k));
      expect(childPersonaOf(k)).toBe(CHILD_PERSONAS[k]);
    }
    for (const k of SCENARIO_CHILDREN)
      expect(childSystemOf(k, 4)).toBe(
        `${CHILD_HEADER}\n\n${CHILD_PERSONAS_L4[k]}`,
      );
    expect(() => childSystemOf("K1", 4)).toThrow("4단계 아이 역 글이 없다");
    expect(() => childSystemOf("SA", 5)).toThrow("5단계 아이 역 글이 없다");
  });

  it("앱 행동 일정은 아이 역 열쇠로 정해져 단계와 상관없다(잡음은 SC · SD 에만)", () => {
    expect(SCENARIO_CHILDREN.filter(childHasNoise)).toEqual(["SC", "SD"]);
  });

  it("결과 글(arch-report): setup.json 의 단계로 아이 역 글을 적는다(없으면 3단계)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chat4-report-"));
    expect(setupLevelOf(dir)).toBe(3);
    writeFileSync(join(dir, "setup.json"), JSON.stringify({ level: 4 }));
    expect(setupLevelOf(dir)).toBe(4);
    expect(scenarioMarkdownOf("SA", [])).toContain(CHILD_PERSONAS.SA);
    const l4 = scenarioMarkdownOf("SA", [], 4);
    expect(l4).toContain(CHILD_PERSONAS_L4.SA);
    expect(l4).toContain("회화 4단계 글");
  });
});

describe("chat-spots · talk-chat-compare 의 단계 인자(S6)", () => {
  it("chat-spots: 인자가 없으면 3단계 단원 1 수업 1 이고, --level · --unit · --lesson 을 받는다", () => {
    expect(parseSpotArgs([]).where).toEqual(DEFAULT_SPOT_WHERE);
    expect(DEFAULT_SPOT_WHERE).toEqual({ level: 3, unit: 1, lesson: 1 });
    expect(
      parseSpotArgs(["--level", "4", "--unit", "1", "--lesson", "2"]).where,
    ).toEqual({ level: 4, unit: 1, lesson: 2 });
    expect(() => parseSpotArgs(["--level", "x"])).toThrow("1 이상 정수");
    const env = spotEnvOf(ROOT);
    expect([
      env.materials.level,
      env.materials.unit,
      env.materials.lessonNo,
    ]).toEqual([3, 1, 1]);
  });

  it("talk-chat-compare: 대조 갈래의 평가 구성 단계는 기본 3, --level 로 바꾸고, 비교 갈래에서는 받지 않는다", () => {
    const base = ["--against-lead", "--runs", "r", "--out", "/tmp/o"];
    const plain = parseCompareArgs(base);
    expect(plain.ok && plain.args.evalLevel).toBe(EVAL_CONFIG_LEVEL);
    expect(EVAL_CONFIG_LEVEL).toBe(3);
    const four = parseCompareArgs([...base, "--level", "4"]);
    expect(four.ok && four.args.evalLevel).toBe(4);
    expect(parseCompareArgs([...base, "--level", "0"])).toMatchObject({
      ok: false,
    });
    expect(
      parseCompareArgs(["--mock", "m", "--out", "/tmp/o", "--level", "4"]),
    ).toEqual({ ok: false, error: "--level 은 --against-lead 에서만 쓴다" });
  });
});

describe("talk:observe 개정 5 견본 인자(R2)와 수업 행 고르기(T-340 ⑥)", () => {
  const rev5: unknown = JSON.parse(readFileSync(join(ROOT, REV5), "utf8"));

  it("--card-file 은 준 때에만 칸이 있고, 회화 수업 파일 꼴이 아니면 멈춘다", () => {
    const given = parseArgs(["--card-file", REV5]);
    expect(given.ok && given.args.cardFile).toBe(REV5);
    const none = parseArgs([]);
    expect(none.ok && "cardFile" in none.args).toBe(false);
    expect(cardFileOf(REV5, rev5)).toMatchObject({ level: 3, unit: 1 });
    expect(() => cardFileOf("x.json", { lessons: "x" })).toThrow(
      "회화 수업 파일 꼴이 아니다",
    );
  });

  it("견본은 단계 · 단원이 같은 재료의 수업 파일만 바꾼다: 다지기 6 은 개정 5 카드, 배정 1 은 살아 있는 시드와 같은 카드", () => {
    const read = seedReaderOf(
      (level, unit) => readSeedFiles(ROOT, level, unit),
      cardFileOf(REV5, rev5),
    );
    const where = { level: 3, unit: 1, teacher: "mina" } as const;
    const live6 = materialsOf(readSeedFiles(ROOT, 3, 1), {
      ...where,
      lesson: 6,
    });
    const old6 = materialsOf(read(3, 1), { ...where, lesson: 6 });
    if (!live6.ok || !old6.ok) throw new Error("재료 없음");
    expect(JSON.stringify(old6.materials.card)).not.toBe(
      JSON.stringify(live6.materials.card),
    );
    const live1 = materialsOf(readSeedFiles(ROOT, 3, 1), {
      ...where,
      lesson: 1,
    });
    const old1 = materialsOf(read(3, 1), { ...where, lesson: 1 });
    if (!live1.ok || !old1.ok) throw new Error("재료 없음");
    expect(old1.materials.card).toEqual(live1.materials.card);
    // 다른 단원은 그대로 읽는다(견본이 덮지 않음)
    expect(read(3, 2).lessonFile).toEqual(readSeedFiles(ROOT, 3, 2).lessonFile);
  });

  it("재생 대본을 견본으로 계획하면 그 줄을 찍고 계획 줄은 견본 없이와 같은 꼴이다(부르지 않음)", async () => {
    const config = loadScriptConfig({ root: ROOT });
    const run = async (cardFile?: string) => {
      const logs: string[] = [];
      const args: TalkObserveArgs = {
        yes: false,
        script: "replay-lesson-1108",
        level: null,
        effort: null,
        out: "/tmp/talk-observe-chat4",
        rounds: 1,
        set: {},
        baseline: null,
        chanceAlert: CHANCE_ALERT_DEFAULT,
        ...(cardFile === undefined ? {} : { cardFile }),
      };
      const code = await runTalkObserve(args, {
        root: ROOT,
        config,
        readScripts: () => readScriptFiles(ROOT),
        readSeed: (level, unit) => readSeedFiles(ROOT, level, unit),
        createClient: () => {
          throw new Error("계획만인데 클라이언트를 만들었다");
        },
        log: (line) => logs.push(line),
        write: () => {
          throw new Error("계획만인데 파일을 썼다");
        },
        readJson: (path) => {
          if (path !== REV5) throw new Error(`없는 파일 ${path}`);
          return rev5;
        },
      });
      return { code, logs };
    };
    const plain = await run();
    const withRev5 = await run(REV5);
    expect(plain.code).toBe(0);
    expect(withRev5.code).toBe(0);
    expect(withRev5.logs[0]).toBe(
      `카드 견본: ${REV5}(회화 3단계 단원 1) — 이 파일의 수업을 읽는 대본 1(replay-lesson-1108)`,
    );
    const planLine = (logs: string[]) =>
      logs.find((l) => l.startsWith("replay-lesson-1108")) ?? "";
    expect(planLine(withRev5.logs)).toContain("아이 차례 23 · 예상 호출 23");
    expect(planLine(plain.logs)).toContain("아이 차례 23 · 예상 호출 23");
  });

  it("수업 행: 같은 번호면 보강보다 정규(배정 · 다지기), 그 안에서 작은 변형, 같으면 파일 차례", () => {
    const rows = [
      { lessonNo: 1, kind: "remedial", variant: 1, id: "r1" },
      { lessonNo: 1, kind: "assigned", variant: 2, id: "a1v2" },
      { lessonNo: 1, kind: "assigned", variant: 1, id: "a1v1" },
      { lessonNo: 2, id: "old-a" },
      { lessonNo: 2, id: "old-b" },
    ];
    expect(lessonRowOf(rows, 1)?.id).toBe("a1v1");
    expect(lessonRowOf(rows.slice(0, 2), 1)?.id).toBe("a1v2");
    expect(lessonRowOf(rows, 2)?.id).toBe("old-a");
    expect(lessonRowOf(rows, 3)).toBeUndefined();
  });

  it("4단계 대본의 되풀이 낱말(recastWord)은 수업 1 의 새 단어 안이다(kitchen 은 배정 4 낱말이라 뺐다)", () => {
    const specs = JSON.parse(
      readFileSync(join(ROOT, "seed/unit-specs.json"), "utf8"),
    ) as {
      unitSpecs: {
        area: string;
        level: number;
        unit: number;
        words: string[];
      }[];
    };
    const unit = specs.unitSpecs.find(
      (u) => u.area === "talk" && u.level === 4 && u.unit === 1,
    );
    const lesson1 = new Set(unit?.words.slice(0, 4));
    expect([...lesson1]).toEqual(["singer", "dancer", "driver", "artist"]);
    const l4 = readScriptFiles(ROOT)
      .filter((f) => f.file.startsWith("l4-"))
      .map(
        (f) =>
          f.raw as {
            lesson: number;
            steps: { expect?: { recastWord?: string } }[];
          },
      );
    expect(l4.length).toBeGreaterThan(0);
    for (const s of l4) {
      expect(s.lesson).toBe(1);
      for (const step of s.steps)
        if (step.expect?.recastWord !== undefined)
          expect(
            lesson1.has(step.expect.recastWord),
            step.expect.recastWord,
          ).toBe(true);
    }
  });
});
