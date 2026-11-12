// '회화 AI 몫 넓힘' 묶음 0-나 계약(plan 정한 것 3 · 5, spec 판 4 설계 5 · 6 · 9): 카드의 장면 여는 질문 칸 sceneOpener(Zod 선택 칸) ·
// 시드 목록 넷(신호 말 · 상황 줄 · 허용 낱말 · 지어낸 경험 꼴)의 꼴 · SEED_FILES · 서버 읽기 · 빌드 포함. 내용 검사(꼴 수 · 어휘 · 길이 ·
// 금지 구)는 묶음 3 의 시드 검증기가 본다.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  TalkAllowedWordsFileSchema,
  TalkCueLinesFileSchema,
  TalkMadeUpPhrasesFileSchema,
  TalkSituationLinesFileSchema,
} from "@/core/seed/schema/reference";
import {
  type TalkCard,
  TalkCardSchema,
  type TalkSceneOpener,
  TalkSceneOpenerSchema,
  talkCardKindOf,
  textsOfTalkCard,
} from "@/core/seed/schema/talk";
import {
  BAND_NAMES,
  bandOf,
  isTalkRuleBand,
  isTalkRuleLevel,
  LEVEL_MAX,
  LEVEL_MIN,
  SEED_FILES,
  TALK_ASK_AGAIN_PLACE,
  TALK_CUE_BANDS,
  TALK_CUE_PLACES,
  TALK_LOW_BAND,
  TALK_RULE_BANDS,
  TALK_SITUATION_FORBIDDEN_SCOPES,
  TALK_SITUATION_PLACES,
} from "@/core/seed/structure";
import {
  loadSeedList,
  SeedListError,
  seedTalkAllowedWords,
  seedTalkCueLines,
  seedTalkMadeUpPhrases,
  seedTalkSituationLines,
} from "@/server/seed-lists";
import nextConfig from "../../next.config";

const REPO = join(import.meta.dirname, "..", "..");
const readSeed = (path: string): unknown =>
  JSON.parse(readFileSync(join(REPO, "seed", path), "utf8"));

/**
 * DB 에 든 개정 4 카드 두 장(회화 3단계 단원 1 배정 1 · 다지기 6, sceneOpener 칸 없음)의 고정 사본(tests/fixtures/talk-cards-rev4.json,
 * 머리 6e86881 에서 뜸). 살아 있는 시드 파일은 묶음 3 이 개정 5 로 바꾸므로 그 파일에 기대지 않는다(검토 rev-0 M-1).
 */
const SEED_CARDS = (
  JSON.parse(
    readFileSync(
      join(REPO, "tests", "fixtures", "talk-cards-rev4.json"),
      "utf8",
    ),
  ) as {
    lessons: { revision: number; lessonNo: number; card: unknown }[];
  }
).lessons;

/** spec 설계 5 의 예 꼴(장면 말 한 문장 + 예 · 아니요 질문 하나, 3단계 영어 틀). */
const OPENER: TalkSceneOpener = {
  question: {
    en: "We are at the lake! Do you like the lake?",
    ko: "우리 호수에 왔어! 너 호수 좋아해?",
  },
  hintKo: "호수가 좋은지 말해 봐요.",
  hintEn: "Yes, I like the lake.",
  frameEn: "Yes, I ___ the lake.",
  answerExample: "Yes, I like the lake.",
  easyQuestion: { en: "Is the lake big?", ko: "호수 커?" },
};

const withOpener = (card: unknown, opener: unknown): unknown => ({
  ...(card as object),
  sceneOpener: opener,
});

describe("카드 칸 sceneOpener(정한 것 3 — Zod 선택 칸)", () => {
  it("개정 4 카드 두 장은 칸이 없어도 새 꼴로 읽힌다", () => {
    expect(SEED_CARDS.map((l) => l.lessonNo)).toEqual([1, 6]);
    for (const lesson of SEED_CARDS) {
      expect(lesson.revision).toBe(4);
      expect(lesson.card).not.toHaveProperty("sceneOpener");
      expect(talkCardKindOf(lesson.card)).toBe("new");
    }
  });

  it("같은 카드에 칸을 더해도 새 꼴이다(3단계 틀 · 1단계 선택지 꼴 모두)", () => {
    for (const lesson of SEED_CARDS) {
      expect(talkCardKindOf(withOpener(lesson.card, OPENER))).toBe("new");
      const level1 = {
        ...OPENER,
        frameEn: undefined,
        easyQuestion: { en: "Is it big or small?", ko: "커, 작아?" },
        choices: ["It is big.", "It is small."],
      };
      expect(talkCardKindOf(withOpener(lesson.card, level1))).toBe("new");
    }
  });

  it("칸 꼴이 틀리면 카드가 틀림이다(모르는 키 · 빠진 받침 칸 · 선택지 하나)", () => {
    const card = SEED_CARDS[0]?.card;
    const broken: unknown[] = [
      { ...OPENER, targets: ["lake"] },
      { ...OPENER, answerExample: undefined },
      { ...OPENER, easyQuestion: undefined },
      { ...OPENER, question: { ko: "뜻만" } },
      { ...OPENER, choices: ["It is big."] },
    ];
    for (const opener of broken) {
      expect(TalkSceneOpenerSchema.safeParse(opener).success).toBe(false);
      expect(talkCardKindOf(withOpener(card, opener))).toBe("invalid");
    }
  });

  it("textsOfTalkCard 는 칸이 있으면 sceneOpener.* 경로를 필수 질문과 같은 역할로 내고, 없으면 내지 않는다", () => {
    const plain = TalkCardSchema.parse(SEED_CARDS[0]?.card);
    expect(
      textsOfTalkCard(plain).some((f) => f.path.startsWith("sceneOpener")),
    ).toBe(false);

    const card: TalkCard = TalkCardSchema.parse(
      withOpener(SEED_CARDS[0]?.card, {
        ...OPENER,
        choices: ["It is big.", "It is small."],
      }),
    );
    const opener = textsOfTalkCard(card, "lessons.0.card")
      .filter((f) => f.path.startsWith("lessons.0.card.sceneOpener."))
      .map((f) => [f.path.replace("lessons.0.card.", ""), f.role, f.text]);
    expect(opener).toEqual([
      ["sceneOpener.question.en", "tori", OPENER.question.en],
      ["sceneOpener.question.ko", "ko", OPENER.question.ko],
      ["sceneOpener.hintKo", "ko", OPENER.hintKo],
      ["sceneOpener.hintEn", "hint", OPENER.hintEn],
      ["sceneOpener.frameEn", "hint", OPENER.frameEn],
      ["sceneOpener.answerExample", "child", OPENER.answerExample],
      ["sceneOpener.easyQuestion.en", "tori", OPENER.easyQuestion.en],
      ["sceneOpener.easyQuestion.ko", "ko", OPENER.easyQuestion.ko],
      ["sceneOpener.choices.0", "pair", "It is big."],
      ["sceneOpener.choices.1", "pair", "It is small."],
    ]);
    // 칸이 더해져도 다른 칸의 글 조각은 그대로다.
    const rest = (c: TalkCard) =>
      textsOfTalkCard(c).filter((f) => !f.path.startsWith("sceneOpener"));
    expect(rest(card)).toEqual(textsOfTalkCard(plain));
  });
});

describe("회화 대화 규칙 구간(내용 고침 2 plan 정한 것 5 · 6 — 13절 C222, 구조 상수)", () => {
  it("대화 규칙 구간 목록은 소리 줄 꼴 구간과 따로 있고, 지금은 1~3단계뿐이다(4~6단계는 묶음 2-나 가 더한다)", () => {
    expect([...TALK_RULE_BANDS]).toEqual([TALK_LOW_BAND]);
    for (const band of BAND_NAMES)
      expect(isTalkRuleBand(band), band).toBe(TALK_RULE_BANDS.includes(band));
  });

  it("단계 술어는 그 단계의 구간으로 본다(1~3단계 참, 4단계부터 거짓)", () => {
    for (let level = LEVEL_MIN; level <= LEVEL_MAX; level++)
      expect(isTalkRuleLevel(level), `level ${level}`).toBe(
        TALK_RULE_BANDS.includes(bandOf(level)),
      );
    expect([1, 2, 3].every(isTalkRuleLevel)).toBe(true);
    expect([4, 5, 6, 7, 10, 12].some(isTalkRuleLevel)).toBe(false);
  });
});

describe("시드 목록 넷(정한 것 5)", () => {
  const LISTS = [
    ["talkCueLines", "lists/talk-cue-lines.json", TalkCueLinesFileSchema],
    [
      "talkSituationLines",
      "lists/talk-situation-lines.json",
      TalkSituationLinesFileSchema,
    ],
    [
      "talkAllowedWords",
      "lists/talk-allowed-words.json",
      TalkAllowedWordsFileSchema,
    ],
    [
      "talkMadeUpPhrases",
      "lists/talk-made-up-phrases.json",
      TalkMadeUpPhrasesFileSchema,
    ],
  ] as const;

  it("SEED_FILES 에 넷이 들고, 시드 파일은 규격을 지나며, loadSeedList 가 같은 값을 읽는다", () => {
    for (const [name, path, schema] of LISTS) {
      expect(SEED_FILES[name]).toBe(path);
      const raw = readSeed(path);
      expect(schema.safeParse(raw).success, path).toBe(true);
      expect(loadSeedList(name, { root: REPO })).toEqual(schema.parse(raw));
    }
  });

  it("신호 말은 자리 셋 × 구간 둘이 다 있고 줄마다 en · ko 다(긴 꼴 · 짧은 꼴)", () => {
    const file = seedTalkCueLines({ root: REPO });
    expect(Object.keys(file).sort()).toEqual([...TALK_CUE_PLACES].sort());
    for (const place of TALK_CUE_PLACES) {
      expect(Object.keys(file[place]).sort()).toEqual(
        [...TALK_CUE_BANDS].sort(),
      );
      for (const band of TALK_CUE_BANDS) {
        const forms = file[place][band];
        expect(forms.long.length).toBeGreaterThan(0);
        expect(forms.short.length).toBeGreaterThan(0);
      }
    }
    expect(file.together["2-3"].long[0]?.en).toBe("Listen and say it with me!");
    expect(file.introduce["2-3"].short[0]?.en).toBe("Your turn!");
  });

  it("상황 줄은 자리 여섯(되묻기 포함, C218)이 다 있고, 금지 구는 all · nospeech · ask_again 이다", () => {
    const file = seedTalkSituationLines({ root: REPO });
    expect(Object.keys(file.lines).sort()).toEqual(
      [...TALK_SITUATION_PLACES].sort(),
    );
    // 요청자 iPad 수업(11-08) 뒤 'my ears' 꼴을 뺐다 — 못 들은 것을 소리 쪽 일로 말하는 꼴은 그대로다
    expect(file.lines.nospeech[0]?.en).toBe("Oops, no sound! Let's go on.");
    expect(file.lines.nospeech.map((line) => line.en).join(" ")).not.toMatch(
      /my ears/i,
    );
    // 정본 · spec 예(설계 1 [I-1])가 들어 있는지 본다. 목록 내용은 묶음 3-(다)가 넓힌다
    expect(file.forbidden.all).toEqual(
      expect.arrayContaining(["that's wrong", "you don't know"]),
    );
    expect(file.forbidden.nospeech).toEqual(
      expect.arrayContaining(["good answer", "you said"]),
    );
    // 되묻기 자리(C218 · C222 보완 2 — plan '옮겨 적는 문구'의 시드 줄 다섯과 금지 구 여섯 그대로)
    expect(TALK_ASK_AGAIN_PLACE).toBe("ask_again");
    expect([...TALK_SITUATION_PLACES]).toContain(TALK_ASK_AGAIN_PLACE);
    expect([...TALK_SITUATION_FORBIDDEN_SCOPES]).toEqual([
      "all",
      "nospeech",
      "ask_again",
    ]);
    expect(file.lines.ask_again).toEqual([
      { en: "Sorry! Say it again, please.", ko: "미안! 한 번만 더 말해 줘." },
      { en: "Let me hear it again!", ko: "다시 한번 들려줘!" },
      { en: "Hmm, again, please!", ko: "음, 한 번 더 말해 줄래!" },
      { en: "Sorry! I will listen again.", ko: "미안! 다시 잘 들어 볼게." },
      {
        en: "Again, please! I am listening.",
        ko: "한 번 더 말해 줘! 듣고 있어.",
      },
    ]);
    expect(file.forbidden.ask_again).toEqual([
      "my ears",
      "my ear",
      "try again",
      "louder",
      "speak up",
      "i don't understand you",
    ]);
  });

  it("허용 낱말 · 느낌 낱말 · 지어낸 경험 꼴 읽기", () => {
    const words = seedTalkAllowedWords({ root: REPO });
    expect(words.allowed).toContain("oops");
    expect(words.feeling).toContain("happy");
    // 정본 06:187 (4) 의 예 셋('Yesterday I' · 'When I was' · 'I remember' 꼴)이 들어 있는지 본다. 'I remember' 꼴은 이 대화 되짚기('I
    // remember! You like fish.')를 지우지 않게 'i remember when' · 'i remember my' 로 좁혔다(묶음 3 fix 1, 설계 검토 M-6)
    const phrases = seedTalkMadeUpPhrases({ root: REPO });
    expect(phrases).toEqual(
      expect.arrayContaining(["yesterday i", "when i was"]),
    );
    expect(phrases.some((p) => p.startsWith("i remember "))).toBe(true);
  });

  it("규격은 빠진 자리 · 모르는 자리 · 빈 목록 · 뜻 없는 줄 · 겹침 · 대문자 낱말 · 정규화 안 한 구를 거부한다", () => {
    const cue = readSeed(SEED_FILES.talkCueLines) as Record<
      string,
      Record<string, { long: unknown[]; short: unknown[] }>
    >;
    const { choices: _drop, ...noChoices } = cue;
    const cueBad: unknown[] = [
      noChoices,
      { ...cue, greeting: cue.introduce },
      { ...cue, together: { ...cue.together, "4-6": cue.together?.["1"] } },
      { ...cue, together: { ...cue.together, "1": { long: [], short: [] } } },
      {
        ...cue,
        together: {
          ...cue.together,
          "1": { long: [{ en: "Say it!" }], short: [{ en: "Go!", ko: "가!" }] },
        },
      },
    ];
    for (const bad of cueBad) {
      expect(TalkCueLinesFileSchema.safeParse(bad).success).toBe(false);
    }

    const situation = readSeed(SEED_FILES.talkSituationLines) as {
      lines: Record<string, unknown[]>;
      forbidden: Record<string, string[]>;
    };
    const situationBad: unknown[] = [
      { ...situation, lines: { ...situation.lines, nospeech: [] } },
      { ...situation, lines: { ...situation.lines, stuck: [] } },
      { ...situation, forbidden: { all: ["that's wrong", "that's wrong"] } },
      { lines: situation.lines },
      // 되묻기 자리(C218): 자리 줄이 빠지거나 금지 구 묶음이 빠지면 거부한다
      {
        ...situation,
        lines: Object.fromEntries(
          Object.entries(situation.lines).filter(
            ([place]) => place !== "ask_again",
          ),
        ),
      },
      {
        ...situation,
        forbidden: {
          all: situation.forbidden.all,
          nospeech: situation.forbidden.nospeech,
        },
      },
      { ...situation, forbidden: { ...situation.forbidden, ask_again: [] } },
    ];
    for (const bad of situationBad) {
      expect(TalkSituationLinesFileSchema.safeParse(bad).success).toBe(false);
    }

    for (const bad of [
      { allowed: ["Oops"], feeling: ["happy"] },
      { allowed: ["oops", "oops"], feeling: ["happy"] },
      { allowed: ["thank you"], feeling: ["happy"] },
      { allowed: ["oops"], feeling: [] },
    ]) {
      expect(TalkAllowedWordsFileSchema.safeParse(bad).success).toBe(false);
    }

    for (const bad of [
      { phrases: ["Yesterday I"] },
      { phrases: ["i remember."] },
      { phrases: ["when  i was"] },
      { phrases: [] },
    ]) {
      expect(TalkMadeUpPhrasesFileSchema.safeParse(bad).success).toBe(false);
    }
  });

  describe("파일이 없는 길(개발용 · e2e)", () => {
    const empty = mkdtempSync(join(tmpdir(), "talk-lists-"));
    afterAll(() => rmSync(empty, { recursive: true, force: true }));

    it("loadSeedList 는 missing 으로 던지고, 읽기 함수 넷은 빈 꼴을 내며 목록마다 경고를 한 번 남긴다", () => {
      expect(() => loadSeedList("talkCueLines", { root: empty })).toThrow(
        SeedListError,
      );
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        for (let i = 0; i < 2; i++) {
          const cue = seedTalkCueLines({ root: empty });
          for (const place of TALK_CUE_PLACES)
            for (const band of TALK_CUE_BANDS)
              expect(cue[place][band]).toEqual({ long: [], short: [] });
          const situation = seedTalkSituationLines({ root: empty });
          for (const place of TALK_SITUATION_PLACES)
            expect(situation.lines[place]).toEqual([]);
          expect(situation.forbidden).toEqual({
            all: [],
            nospeech: [],
            ask_again: [],
          });
          expect(seedTalkAllowedWords({ root: empty })).toEqual({
            allowed: [],
            feeling: [],
          });
          expect(seedTalkMadeUpPhrases({ root: empty })).toEqual([]);
        }
        expect(warn).toHaveBeenCalledTimes(4);
      } finally {
        warn.mockRestore();
      }
    });
  });

  it("빌드 추적(next.config.ts outputFileTracingIncludes)이 넷을 묶는다", () => {
    const includes = nextConfig("phase-production-build")
      .outputFileTracingIncludes as Record<string, string[]>;
    for (const route of ["/", "/*"]) {
      expect(includes[route]).toContain("./seed/lists/**/*.json");
    }
    for (const [name] of LISTS) {
      expect(SEED_FILES[name]).toMatch(/^lists\/[^/]+\.json$/);
    }
  });
});
