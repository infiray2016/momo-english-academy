import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  LevelTestFileSchema,
  PlacementFileSchema,
  StoryFileSchema,
  textsOfLevelTestFile,
  textsOfPlacementFile,
  textsOfStoryFile,
} from "@/core/seed/schema/assessment";
import {
  LessonFileSchema,
  ReadingLessonSchema,
  SpeakingLessonSchema,
  textsOfLesson,
  WritingLessonSchema,
} from "@/core/seed/schema/lesson";
import { CheckFileSchema, ReviewFileSchema } from "@/core/seed/schema/records";
import {
  ForbiddenFileSchema,
  HomophonesFileSchema,
  ImageEntrySchema,
  ImagesFileSchema,
  type LevelSpec,
  LevelSpecSchema,
  LevelSpecsFileSchema,
  ListFormsFileSchema,
  MetaSentencesFileSchema,
  ModelPricesFileSchema,
  RangeSchema,
  SettingsFileSchema,
  UnitSpecsFileSchema,
  VocabFileSchema,
} from "@/core/seed/schema/reference";
import { TalkCardSchema, TalkTestSheetSchema } from "@/core/seed/schema/talk";
import {
  ALPHABET_UNIT,
  AREAS,
  approxEq,
  approxGe,
  approxLe,
  BAND_INFOS,
  bandOf,
  type CellRef,
  cefrOf,
  cellKey,
  checksFilePath,
  FLOAT_TOLERANCE,
  LEVEL_MAX,
  LEVEL_MIN,
  lessonFilePath,
  levelTestFilePath,
  parseCellKey,
  parseSeedPath,
  placementFilePath,
  READING_OPTIONS,
  reviewFilePath,
  SEED_FILES,
  type SeedPath,
  storyFilePath,
  TALK_GREETING_TURNS,
  UNITS_PER_LEVEL,
} from "@/core/seed/structure";
import {
  defaultSettings,
  lessonSamples,
  readingLesson,
  readingLevelTest,
  referenceSet,
  sampleSeedTree,
  settingNumber,
  smallFrameSettings,
  smallReferenceSet,
  speakingLesson,
  speakingPlacement,
  storyFile,
  talkLesson,
  talkLevelTest,
  writeSeedTree,
  writingLesson,
} from "../fixtures/seed/builders";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TMP_ROOT = join(REPO_ROOT, "tests/.tmp");
const made: string[] = [];

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const ref = referenceSet(defaultSettings());

/** 깊은 복사(견본을 고쳐 거부 사례를 만든다). */
function clone<T>(value: T): T {
  return structuredClone(value);
}

function expectValid(schema: z.ZodType, value: unknown, label: string): void {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `${label}: ${JSON.stringify(result.error.issues, null, 2)}`,
    );
  }
}

function expectInvalid(
  schema: z.ZodType,
  value: unknown,
  pathHint?: string,
): void {
  const result = schema.safeParse(value);
  expect(result.success).toBe(false);
  if (pathHint && !result.success) {
    expect(
      result.error.issues.map((issue) => issue.path.join(".")).join("\n"),
    ).toContain(pathHint);
  }
}

function levelSpecOf(area: LevelSpec["area"], level: number): LevelSpec {
  const spec = ref.levelSpecs.levelSpecs.find(
    (s) => s.area === area && s.level === level,
  );
  if (!spec) throw new Error(`level spec 없음: ${area} ${level}`);
  return spec;
}

describe("시드 규격(schema)", () => {
  it("6.3 시드 규격: 칸 키를 만들고 풀면 같은 값이 나온다", () => {
    const cells: [CellRef, string][] = [
      [
        {
          type: "lesson",
          area: "reading",
          level: 4,
          unit: 2,
          kind: "assigned",
          lessonNo: 3,
          variant: 1,
        },
        "lesson:reading:4:2:assigned:3:1",
      ],
      [{ type: "story", band: "4-6", no: 7 }, "lesson:talk:4:-:tori_story:7:1"],
      [
        { type: "level-test", area: "talk", level: 3, form: 2, no: 1 },
        "level-test:talk:3:2:1",
      ],
      [
        {
          type: "placement",
          area: "speaking",
          level: 5,
          form: 1,
          no: 2,
          spare: true,
        },
        "placement:speaking:5:1:2:spare",
      ],
    ];
    for (const [cell, key] of cells) {
      expect(cellKey(cell)).toBe(key);
      expect(parseCellKey(key)).toEqual(cell);
    }
    // 알파벳 단원(단원 0)은 읽기 · 쓰기 1단계에만 있다.
    expect(parseCellKey("lesson:writing:1:0:alphabet:1:2")).toEqual({
      type: "lesson",
      area: "writing",
      level: 1,
      unit: 0,
      kind: "alphabet",
      lessonNo: 1,
      variant: 2,
    });
    for (const bad of [
      `lesson:reading:${LEVEL_MAX + 1}:1:assigned:1:1`,
      `lesson:reading:4:${UNITS_PER_LEVEL + 1}:assigned:1:1`,
      "lesson:talk:1:0:alphabet:1:1",
      "lesson:reading:4:2:tori_story:1:1",
      "lesson:talk:5:-:tori_story:1:1",
      "lesson:talk:4:-:tori_story:1:2",
      "lesson:reading:4:2:assigned:0:1",
      "lesson:reading:04:2:assigned:1:1",
      "level-test:talk:3:0:1",
      "placement:talk:1:1:1:main",
      "placement:reading:1:1:1:extra",
      "lesson:reading:4:2:assigned:3",
      "",
    ]) {
      expect(parseCellKey(bad)).toBeNull();
    }
  });

  it("6.3 시드 규격: 파일 경로가 영역 · 단계 · 단원과 맞는다", () => {
    expect(lessonFilePath("reading", 4, 2)).toBe("lessons/reading/4/2.json");
    expect(levelTestFilePath("talk", 3)).toBe("level-tests/talk/3.json");
    expect(placementFilePath("speaking")).toBe("placement/speaking.json");
    expect(storyFilePath("10-12")).toBe("stories/10-12.json");
    expect(checksFilePath(lessonFilePath("reading", 4, 2))).toBe(
      "checks/lessons/reading/4/2.json",
    );
    expect(reviewFilePath("writing", 6)).toBe("reviews/writing-6.json");
    const cases: [string, SeedPath][] = [
      [
        "lessons/reading/4/2.json",
        { kind: "lessons", area: "reading", level: 4, unit: 2 },
      ],
      [
        "lessons/writing/1/0.json",
        { kind: "lessons", area: "writing", level: 1, unit: 0 },
      ],
      [
        "level-tests/talk/12.json",
        { kind: "level-tests", area: "talk", level: 12 },
      ],
      ["placement/reading.json", { kind: "placement", area: "reading" }],
      ["stories/4-6.json", { kind: "stories", band: "4-6" }],
      [
        "checks/lessons/talk/3/5.json",
        {
          kind: "checks",
          target: { kind: "lessons", area: "talk", level: 3, unit: 5 },
        },
      ],
      [
        "checks/stories/1-3.json",
        { kind: "checks", target: { kind: "stories", band: "1-3" } },
      ],
      ["reviews/talk-11.json", { kind: "reviews", area: "talk", level: 11 }],
      [SEED_FILES.forms, { kind: "reference", name: "forms" }],
      [SEED_FILES.settings, { kind: "reference", name: "settings" }],
    ];
    for (const [path, parsed] of cases) {
      expect(parseSeedPath(path)).toEqual(parsed);
    }
    for (const bad of [
      `lessons/reading/4/${UNITS_PER_LEVEL + 1}.json`,
      "lessons/talk/1/0.json",
      "lessons/reading/2/0.json",
      `lessons/reading/${LEVEL_MAX + 1}/1.json`,
      "lessons/reading/4/2",
      "lessons/music/4/2.json",
      "placement/talk.json",
      "stories/1-4.json",
      "reviews/reading-0.json",
      "prompts/reading-4.md",
      "manifest/load.json",
      "checks/settings.json",
    ]) {
      expect(parseSeedPath(bad)).toBeNull();
    }
  });

  it("6.3 시드 규격: 단계 구간 · CEFR 과 부동소수 비교", () => {
    // 구간은 1~12 를 빈틈 없이 차례로 덮는다.
    expect(BAND_INFOS[0]?.first).toBe(LEVEL_MIN);
    expect(BAND_INFOS[BAND_INFOS.length - 1]?.last).toBe(LEVEL_MAX);
    BAND_INFOS.forEach((band, i) => {
      if (i > 0) expect(band.first).toBe((BAND_INFOS[i - 1]?.last ?? 0) + 1);
      for (let level = band.first; level <= band.last; level++) {
        expect(bandOf(level)).toBe(band.band);
        expect(cefrOf(level)).toBe(band.cefr);
      }
    });
    expect(() => bandOf(LEVEL_MIN - 1)).toThrow(RangeError);
    expect(() => bandOf(LEVEL_MAX + 1)).toThrow(RangeError);
    // 3.2 관계 표의 경계 셈: 1 − 비율을 먼저 하면 오차가 나므로 오차를 두고 견준다.
    const settings = defaultSettings();
    const vocab = settingNumber(settings, "unit.vocab_count.10-12");
    const mastery = settingNumber(settings, "unit.vocab_mastery");
    const boundary = Math.round(vocab * (1 - mastery));
    expect(approxGe(vocab - boundary, vocab * mastery)).toBe(true);
    expect(approxLe(0.1 + 0.2, 0.3)).toBe(true);
    expect(approxEq(0.1 + 0.2, 0.3)).toBe(true);
    expect(approxEq(0.3 + FLOAT_TOLERANCE * 10, 0.3)).toBe(false);
  });

  it("6.3 시드 규격: 견본 시드가 모두 규격을 통과한다", () => {
    for (const [label, r] of [
      ["기본", ref],
      ["작은 틀", smallReferenceSet()],
    ] as const) {
      expectValid(SettingsFileSchema, r.settings, `${label} settings`);
      expectValid(LevelSpecsFileSchema, r.levelSpecs, `${label} level-specs`);
      expectValid(UnitSpecsFileSchema, r.unitSpecs, `${label} unit-specs`);
      expectValid(VocabFileSchema, r.vocab, `${label} vocab`);
      expectValid(ImagesFileSchema, r.images, `${label} images`);
      expectValid(
        ModelPricesFileSchema,
        r.modelPrices,
        `${label} model-prices`,
      );
      expectValid(HomophonesFileSchema, r.homophones, `${label} homophones`);
      expectValid(ForbiddenFileSchema, r.forbidden, `${label} forbidden`);
      expectValid(ListFormsFileSchema, r.forms, `${label} forms`);
      expectValid(MetaSentencesFileSchema, r.metaSentences, `${label} meta`);
    }
    // level_specs 48행 · unit_specs 240 + 알파벳 2행
    expect(ref.levelSpecs.levelSpecs).toHaveLength(AREAS.length * LEVEL_MAX);
    expect(ref.unitSpecs.unitSpecs).toHaveLength(
      AREAS.length * LEVEL_MAX * UNITS_PER_LEVEL + ALPHABET_UNIT.areas.length,
    );
    expectValid(SettingsFileSchema, smallFrameSettings(), "작은 틀 settings");
    const samples = lessonSamples(ref);
    expect(samples.map((s) => `${s.area}-${s.level}`)).toEqual([
      "reading-1",
      "reading-4",
      "writing-1",
      "writing-3",
      "writing-4",
      "writing-6",
      "speaking-1",
      "speaking-6",
      "speaking-10",
      "talk-1",
      "talk-3",
      "talk-4",
      "talk-5",
    ]);
    for (const sample of samples) {
      expectValid(
        LessonFileSchema,
        {
          area: sample.area,
          level: sample.level,
          unit: sample.unit,
          lessons: [sample.lesson],
        },
        `${sample.area}-${sample.level} 수업`,
      );
    }
    for (const level of [1, 3, 4, 5] as const) {
      expectValid(
        TalkCardSchema,
        talkLesson(ref, level).lesson.card,
        `회화 ${level} 카드`,
      );
    }
    expectValid(LevelTestFileSchema, readingLevelTest(ref), "읽기 단계 평가");
    expectValid(LevelTestFileSchema, talkLevelTest(ref), "회화 평가 카드");
    expectValid(PlacementFileSchema, speakingPlacement(ref), "말하기 배치");
    expectValid(StoryFileSchema, storyFile(ref, "1-3"), "토리 이야기");
    const tree = sampleSeedTree(ref);
    for (const check of tree.checks) {
      expectValid(CheckFileSchema, check.file, `풀이 검사 ${check.path}`);
    }
    for (const review of tree.reviews) {
      expectValid(ReviewFileSchema, review.file, `표본 검토 ${review.path}`);
    }
  });

  it("6.3 시드 규격: 겹친 설정값 키 · 겹친 vocab 낱말 · 뒤집힌 범위 · 규격 파일의 모르는 키를 거부한다", () => {
    const settings = clone(ref.settings);
    const first = settings.settings[0];
    if (!first) throw new Error("설정값 견본이 비었다");
    settings.settings.push({ ...first });
    expectInvalid(SettingsFileSchema, settings, "settings.");
    expectInvalid(SettingsFileSchema, {
      settings: [{ ...first, key: "Unit.Vocab" }],
    });
    // vocab 낱말은 대소문자를 무시하고 겹치지 않는다.
    const vocab = clone(ref.vocab);
    const word = vocab.vocab[0];
    if (!word) throw new Error("vocab 견본이 비었다");
    vocab.vocab.push({ ...word, word: word.word.toUpperCase() });
    expectInvalid(VocabFileSchema, vocab, "vocab.");
    // Range 의 min > max
    expectInvalid(RangeSchema, { min: 5, max: 4 });
    expectValid(RangeSchema, { min: 4, max: 4 }, "같은 끝");
    const reading2 = clone(levelSpecOf("reading", 2));
    if (reading2.area !== "reading" || !reading2.passage.words) {
      throw new Error("읽기 2단계 견본에 지문 낱말 범위가 없다");
    }
    reading2.passage.words = {
      min: reading2.passage.words.max + 1,
      max: reading2.passage.words.max,
    };
    expectInvalid(LevelSpecSchema, reading2, "passage.words");
    // 모르는 키
    expectInvalid(LevelSpecSchema, { ...levelSpecOf("talk", 1), extra: true });
    expectInvalid(UnitSpecsFileSchema, {
      unitSpecs: [{ ...ref.unitSpecs.unitSpecs[0], vocabCount: 30 }],
    });
  });

  it("6.3 시드 규격: 모르는 키가 든 말하기 수업(대화 활동)을 거부한다", () => {
    const sample = speakingLesson(ref, 6);
    expectValid(SpeakingLessonSchema, sample.lesson, "말하기 6");
    const withDialogue = clone(sample.lesson) as unknown as Record<
      string,
      unknown
    > & {
      content: Record<string, unknown>;
    };
    withDialogue.content.dialogue = {
      turns: [{ tori: "How much is it?", child: "It is two dollars." }],
    };
    expectInvalid(SpeakingLessonSchema, withDialogue, "content");
    expectInvalid(LessonFileSchema, {
      area: "speaking",
      level: sample.level,
      unit: sample.unit,
      lessons: [withDialogue],
    });
    // 수업 겉에 둔 대화 칸도 같다.
    expectInvalid(SpeakingLessonSchema, { ...sample.lesson, roleplay: [] });
  });

  it("6.3 시드 규격: 판 칸(revision · correction)이 0 이상 정수가 아니면 거부한다", () => {
    const lesson = readingLesson(ref, 4).lesson;
    expectValid(
      ReadingLessonSchema,
      { ...lesson, revision: 0, correction: 0 },
      "판 0.0",
    );
    for (const bad of [-1, 1.5, "3", null]) {
      expectInvalid(
        ReadingLessonSchema,
        { ...lesson, revision: bad },
        "revision",
      );
      expectInvalid(
        ReadingLessonSchema,
        { ...lesson, correction: bad },
        "correction",
      );
    }
    const unit = ref.unitSpecs.unitSpecs[0];
    expectInvalid(UnitSpecsFileSchema, {
      unitSpecs: [{ ...unit, revision: -1 }],
    });
    const sheet = talkLevelTest(ref);
    const broken = clone(sheet) as unknown as {
      forms: { sheets: { correction: unknown }[] }[];
    };
    const firstSheet = broken.forms[0]?.sheets[0];
    if (!firstSheet) throw new Error("회화 평가 카드 견본이 비었다");
    firstSheet.correction = 0.5;
    expectInvalid(LevelTestFileSchema, broken);
  });

  it("6.3 시드 규격: 읽기 문항 보기가 4개가 아니면 거부한다", () => {
    for (const level of [1, 4] as const) {
      const lesson = readingLesson(ref, level).lesson;
      const [question] = lesson.content.questions;
      if (!question) throw new Error("읽기 문항 견본이 비었다");
      expect(question.options).toHaveLength(READING_OPTIONS);
      for (const count of [READING_OPTIONS - 1, READING_OPTIONS + 1]) {
        const broken = clone(lesson);
        const target = broken.content.questions[0];
        if (!target) throw new Error("읽기 문항 견본이 비었다");
        const filler = target.options[0] ?? "";
        target.options = Array.from(
          { length: count },
          (_, i) => target.options[i] ?? filler,
        );
        expectInvalid(
          ReadingLessonSchema,
          broken,
          "content.questions.0.options",
        );
      }
    }
    // 단계 평가 읽기 문항도 같다.
    const test = clone(readingLevelTest(ref)) as unknown as {
      forms: { items: { options: string[] }[] }[];
    };
    const item = test.forms[0]?.items[0];
    if (!item) throw new Error("단계 평가 견본이 비었다");
    item.options = item.options.slice(0, READING_OPTIONS - 1);
    expectInvalid(LevelTestFileSchema, test);
  });

  it("6.3 시드 규격: 쓰기 갈래 칸이 빠지거나 회화 인사 턴 수가 범위 밖이면 거부한다", () => {
    for (const level of [1, 3, 4, 6] as const) {
      expectValid(
        WritingLessonSchema,
        writingLesson(ref, level).lesson,
        `쓰기 ${level}`,
      );
    }
    // items 갈래: 문장 조립 카드가 없다.
    const items = clone(writingLesson(ref, 3).lesson) as unknown as {
      content: { items: Record<string, unknown>[] };
    };
    delete items.content.items[0]?.cards;
    expectInvalid(WritingLessonSchema, items, "content.items.0.cards");
    // guided 갈래: 문장 틀이 없다.
    const guided = clone(writingLesson(ref, 4).lesson) as unknown as {
      content: Record<string, unknown>;
    };
    delete guided.content.sentences;
    expectInvalid(WritingLessonSchema, guided, "content.sentences");
    // composition 갈래: 힌트가 비었다.
    const composition = clone(writingLesson(ref, 6).lesson) as unknown as {
      content: { hints: string[] };
    };
    composition.content.hints = [];
    expectInvalid(WritingLessonSchema, composition, "content.hints");
    // 회화 인사 턴 수는 1 또는 2
    const card = talkLesson(ref, 1).lesson.card;
    expectInvalid(
      TalkCardSchema,
      {
        ...card,
        greetingTurns: TALK_GREETING_TURNS.max + 1,
      },
      "greetingTurns",
    );
    expectInvalid(
      TalkCardSchema,
      {
        ...card,
        greetingTurns: TALK_GREETING_TURNS.min - 1,
      },
      "greetingTurns",
    );
  });

  it("6.3 시드 규격: 회화 평가 허용 답의 빈칸에 품사가 없으면 거부한다", () => {
    const file = talkLevelTest(ref);
    if (file.area !== "talk") throw new Error("회화 평가 견본이 아니다");
    const sheet = file.forms[0]?.sheets[0];
    if (!sheet) throw new Error("회화 평가 카드 견본이 비었다");
    expectValid(TalkTestSheetSchema, sheet, "회화 평가 카드");
    const withSlot = clone(sheet);
    const turn = withSlot.turns[0];
    if (!turn) throw new Error("평가 턴 견본이 비었다");
    turn.allowed = [
      { text: "I like ___.", slotPos: "noun" },
      { text: "I like red." },
      { text: "Red." },
    ];
    expectValid(TalkTestSheetSchema, withSlot, "빈칸과 품사");
    const noPos = clone(withSlot);
    const noPosTurn = noPos.turns[0];
    if (!noPosTurn) throw new Error("평가 턴 견본이 비었다");
    noPosTurn.allowed[0] = { text: "I like ___." };
    expectInvalid(TalkTestSheetSchema, noPos, "turns.0.allowed.0");
    // 빈칸이 없는데 품사가 있거나, 품사가 틀 자리 여섯 밖(function)이면 거부한다.
    const extraPos = clone(withSlot) as unknown as {
      turns: { allowed: { text: string; slotPos?: string }[] }[];
    };
    const extraTurn = extraPos.turns[0];
    if (!extraTurn) throw new Error("평가 턴 견본이 비었다");
    extraTurn.allowed[1] = { text: "I like red.", slotPos: "adjective" };
    expectInvalid(TalkTestSheetSchema, extraPos, "turns.0.allowed.1");
    extraTurn.allowed[1] = { text: "I like ___ too.", slotPos: "function" };
    expectInvalid(TalkTestSheetSchema, extraPos, "turns.0.allowed.1");
  });

  it("6.3 시드 규격: 형태 표 · 금지어의 정규식이 컴파일되지 않으면 거부한다", () => {
    const forms = clone(ref.forms);
    const form = forms.forms.find((f) => f.patterns.length > 0);
    if (!form) throw new Error("정규식 형태 견본이 없다");
    form.patterns = [...form.patterns, "(unclosed"];
    expectInvalid(ListFormsFileSchema, forms, "patterns");
    // u 플래그에서만 깨지는 식도 거부한다.
    const forms2 = clone(ref.forms);
    const form2 = forms2.forms.find((f) => f.patterns.length > 0);
    if (!form2) throw new Error("정규식 형태 견본이 없다");
    form2.patterns = ["\\-x"];
    expectInvalid(ListFormsFileSchema, forms2, "patterns");
    const forbidden = clone(ref.forbidden);
    const pattern = forbidden.patterns[0];
    if (!pattern) throw new Error("금지 정규식 견본이 없다");
    pattern.regex = "[a-";
    expectInvalid(ForbiddenFileSchema, forbidden, "patterns.0.regex");
    // 개인 정보 질문 패턴은 영어 · 한국어 두 벌(6.4)
    const oneLang = clone(ref.forbidden);
    oneLang.patterns = oneLang.patterns.filter(
      (p) => !(p.category === "personal-info" && p.lang === "ko"),
    );
    expectInvalid(ForbiddenFileSchema, oneLang);
  });

  it("6.3 시드 규격: CC-BY 그림에 저작자 표시가 없으면 거부한다", () => {
    const image = ref.images.images.find((i) => i.license === "cc_by");
    if (!image) throw new Error("CC-BY 그림 견본이 없다");
    expectValid(ImageEntrySchema, image, "CC-BY 그림");
    const { attribution: _drop, ...noAttribution } = image;
    expectInvalid(ImageEntrySchema, noAttribution, "attribution");
    expectInvalid(
      ImageEntrySchema,
      { ...image, attribution: "" },
      "attribution",
    );
    expectValid(
      ImageEntrySchema,
      { ...noAttribution, license: "cc0" },
      "cc0 그림",
    );
    // 파일 경로는 그 키의 그림이다.
    expectInvalid(
      ImageEntrySchema,
      { ...image, file: "images/vocab/other.png" },
      "file",
    );
  });

  it("6.3 시드 규격: 읽기 문항 유형 수 합이 문항 수와 다르면 거부한다", () => {
    const spec = clone(levelSpecOf("reading", 5));
    if (spec.area !== "reading") throw new Error("읽기 단계 규격이 아니다");
    expectValid(LevelSpecSchema, spec, "읽기 5단계 규격");
    spec.questions.total += 1;
    expectInvalid(LevelSpecSchema, spec, "questions");
  });

  it("6.3 시드 규격: 발표 문항의 확인 질문 칸과 배치 평가의 AI 과제 유형을 거부한다", () => {
    const presentation = {
      no: 1,
      unit: 1,
      revision: 3,
      correction: 0,
      type: "presentation",
      topic: "My favorite season",
      prepWords: ["warm", "swim", "beach"],
    };
    const file = (item: Record<string, unknown>) => ({
      area: "speaking",
      level: 10,
      forms: [{ form: 1, items: [item] }],
    });
    expectValid(LevelTestFileSchema, file(presentation), "발표 문항");
    expectInvalid(
      LevelTestFileSchema,
      file({
        ...presentation,
        fallbackQuestions: ["Why do you like it?"],
      }),
    );
    expectInvalid(
      LevelTestFileSchema,
      file({
        ...presentation,
        confirmQuestions: ["Why do you like it?"],
      }),
    );
    // 배치 평가는 앱이 채점하는 유형만(3.2)
    const placement = speakingPlacement(ref);
    expectValid(PlacementFileSchema, placement, "말하기 배치");
    const { unit: _unit, ...presentationItem } = presentation;
    for (const item of [
      presentationItem,
      {
        no: 1,
        revision: 3,
        correction: 0,
        type: "question",
        en: "What do you like?",
      },
    ]) {
      const broken = clone(placement) as unknown as {
        levels: { items: unknown[] }[];
      };
      const level = broken.levels[0];
      if (!level) throw new Error("배치 견본이 비었다");
      level.items = [item];
      expectInvalid(PlacementFileSchema, broken);
    }
    expectInvalid(PlacementFileSchema, {
      area: "writing",
      form: 1,
      levels: [
        {
          level: 6,
          items: [
            {
              no: 1,
              revision: 3,
              correction: 0,
              type: "composition",
              task: "Write about your day.",
              rubric: ["과제"],
            },
          ],
          spares: [],
        },
      ],
    });
  });

  it("6.3 시드 규격: 글 조각 목록이 견본의 모든 글 칸을 담는다", () => {
    // 글 조각에서 빼는 칸(id · 그림 키 · 열거 값 · 생성 기록, plan-p04a '글 조각 목록')을 경로 전체로 적는다.
    // 칸 이름만으로 빼면 같은 이름의 글 칸이 생겨도 시험이 저절로 통과하므로 자리까지 맞춘다(검토 M-3).
    const N = "\\d+";
    const EXCLUDED_PATHS = [
      // 수업(수업 객체 기준)
      "kind",
      "generation\\.[A-Za-z]+",
      `newWords\\.${N}`,
      `unitWords\\.${N}`,
      `preview\\.${N}\\.word`,
      `content\\.targetWords\\.${N}`,
      `content\\.questions\\.${N}\\.(?:kind|type)`,
      "content\\.shape",
      `content\\.items\\.${N}\\.(?:type|picture)`,
      `content\\.listening\\.${N}\\.kind`,
      `content\\.pictureTask\\.images\\.${N}`,
      `card\\.todayWords\\.${N}\\.word`,
      `card\\.greeting\\.questions\\.${N}\\.imageKey`,
      `card\\.(?:turns|moreTalk)\\.${N}\\.(?:targets\\.${N}|ask|imageKey)`,
      `card\\.questions\\.${N}\\.targets\\.${N}`,
      // 파일(파일 객체 기준)
      "area",
      "band",
      `forms\\.${N}\\.items\\.${N}\\.(?:type|kind|picture)`,
      `forms\\.${N}\\.sheets\\.${N}\\.turns\\.${N}\\.allowed\\.${N}\\.slotPos`,
      `levels\\.${N}\\.(?:items|spares)\\.${N}\\.(?:type|kind|picture)`,
      `stories\\.${N}\\.generation\\.[A-Za-z]+`,
    ].map((source) => new RegExp(`^${source}$`));
    // 쟁점 칸의 역할(검토 I-2 · M-1, 컨트롤러 19:1x)
    const ROLE_OF: [RegExp, string][] = [
      [/^content\.sentences\.\d+\.wordBox\.\d+$/, "option"],
      [/^content\.glossary\.\d+\.(?:surface|lemma)$/, "gloss"],
      [/^card\.endCondition$/, "ko"],
    ];
    function leaves(
      value: unknown,
      path: string,
      out: Map<string, string>,
    ): void {
      if (typeof value === "string") {
        out.set(path, value);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((v, i) => {
          leaves(v, path === "" ? String(i) : `${path}.${i}`, out);
        });
        return;
      }
      if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          leaves(v, path === "" ? k : `${path}.${k}`, out);
        }
      }
    }
    const isExcluded = (path: string) =>
      EXCLUDED_PATHS.some((re) => re.test(path));
    const seenRoles = new Set<string>();
    function check(
      label: string,
      value: unknown,
      fragments: { path: string; role: string; text: string }[],
    ): void {
      const all = new Map<string, string>();
      leaves(value, "", all);
      const excluded = [...all.keys()].filter(isExcluded);
      // 문자열 칸 수 = 글 조각 수 + 빼는 칸 수(plan 위험 11)
      expect(all.size, label).toBe(fragments.length + excluded.length);
      const expected = [...all.keys()].filter((p) => !isExcluded(p)).sort();
      expect(fragments.map((f) => f.path).sort(), label).toEqual(expected);
      for (const fragment of fragments) {
        expect(fragment.text, `${label} ${fragment.path}`).toBe(
          all.get(fragment.path),
        );
        for (const [re, role] of ROLE_OF) {
          if (re.test(fragment.path)) {
            expect(fragment.role, `${label} ${fragment.path}`).toBe(role);
            seenRoles.add(re.source);
          }
        }
      }
    }
    for (const sample of lessonSamples(ref)) {
      check(
        `${sample.area}-${sample.level}`,
        sample.lesson,
        textsOfLesson(sample.area, sample.lesson),
      );
    }
    // 견본에 없는 쓰기 2단계 갈래(받아쓰기 · 철자 타일로 만들기 · 어구 조립)
    const writing2 = {
      ...writingLesson(ref, 1).lesson,
      content: {
        shape: "items" as const,
        items: [
          {
            type: "dictation" as const,
            word: "ball",
            audioText: "ball",
            accepted: ["ball"],
          },
          {
            type: "build-tiles" as const,
            word: "red",
            tiles: ["d", "e", "r"],
            meaningKo: "빨간",
            accepted: ["red"],
          },
          {
            type: "assemble-phrase" as const,
            cards: ["apple", "red", "a"],
            meaningKo: "빨간 사과",
            accepted: ["a red apple"],
          },
        ],
      },
    };
    expectValid(WritingLessonSchema, writing2, "쓰기 2단계 갈래");
    check("쓰기 2단계 갈래", writing2, textsOfLesson("writing", writing2));
    // 견본에 없는 단계 평가 갈래(읽기 그림 · 쓰기 셋과 문항 하나 · 말하기 넷)
    const head = { unit: 1, revision: 1, correction: 0 };
    const testFiles = [
      {
        area: "reading",
        level: 1,
        forms: [
          {
            form: 1,
            items: [
              {
                no: 1,
                ...head,
                type: "picture",
                passage: "This is a ball.",
                prompt: "Find the ball.",
                options: ["ball", "cat", "dog", "hat"],
                answerNo: 1,
                explanationKo: "공이에요.",
              },
            ],
          },
        ],
      },
      {
        area: "writing",
        level: 6,
        forms: [
          {
            form: 1,
            items: [
              {
                no: 1,
                ...head,
                type: "fill-blank",
                prompt: "I ___ to school.",
                accepted: ["go", "walk"],
              },
              {
                no: 2,
                ...head,
                type: "fix-sentence",
                prompt: "She go to school.",
                accepted: ["She goes to school."],
              },
              {
                no: 3,
                ...head,
                type: "dictation",
                word: "ball",
                audioText: "ball",
                accepted: ["ball"],
                explanationKo: "받아써요.",
              },
              {
                no: 4,
                ...head,
                type: "composition",
                task: "Write about your day.",
                example: "I get up early.",
                rubric: ["과제 충족"],
              },
            ],
          },
        ],
      },
      {
        area: "speaking",
        level: 10,
        forms: [
          {
            form: 1,
            items: [
              { no: 1, ...head, type: "repeat", sentence: "I like apples." },
              {
                no: 2,
                ...head,
                type: "listening",
                kind: "picture",
                script: "This is a cat.",
                options: ["cat", "dog"],
                answerNo: 1,
              },
              {
                no: 3,
                ...head,
                type: "question",
                en: "What do you like?",
                ko: "뭘 좋아해?",
                accepted: ["I like apples."],
                modelAnswer: "I like apples.",
              },
              {
                no: 4,
                ...head,
                type: "presentation",
                topic: "My favorite season",
                prepWords: ["warm", "swim", "beach"],
              },
            ],
          },
        ],
      },
    ];
    for (const raw of testFiles) {
      const parsed = LevelTestFileSchema.parse(raw);
      check(
        `단계 평가 갈래 ${parsed.area}`,
        parsed,
        textsOfLevelTestFile(parsed),
      );
    }
    for (const file of [readingLevelTest(ref), talkLevelTest(ref)]) {
      check(`단계 평가 ${file.area}`, file, textsOfLevelTestFile(file));
    }
    // 견본에 없는 배치 갈래(읽기 · 쓰기)
    const version = { revision: 1, correction: 0 };
    const placements = [
      {
        area: "reading",
        form: 1,
        levels: [
          {
            level: 1,
            items: [
              {
                no: 1,
                ...version,
                type: "picture",
                passage: "This is a ball.",
                prompt: "Find the ball.",
                options: ["ball", "cat", "dog", "hat"],
                answerNo: 1,
              },
              {
                no: 2,
                ...version,
                type: "fact",
                passage: "Momo has a cat.",
                prompt: "What does Momo have?",
                options: ["a cat", "a dog", "a hat", "a ball"],
                answerNo: 1,
              },
            ],
            spares: [],
          },
        ],
      },
      {
        area: "writing",
        form: 1,
        levels: [
          {
            level: 6,
            items: [
              {
                no: 1,
                ...version,
                type: "fill-blank",
                prompt: "I ___ to school.",
                accepted: ["go"],
              },
              {
                no: 2,
                ...version,
                type: "fix-sentence",
                prompt: "She go to school.",
                accepted: ["She goes to school."],
              },
              {
                no: 3,
                ...version,
                type: "build-tiles",
                word: "red",
                tiles: ["d", "e", "r"],
                meaningKo: "빨간",
                accepted: ["red"],
              },
            ],
            spares: [],
          },
        ],
      },
    ];
    for (const raw of placements) {
      const parsed = PlacementFileSchema.parse(raw);
      check(`배치 갈래 ${parsed.area}`, parsed, textsOfPlacementFile(parsed));
    }
    const placement = speakingPlacement(ref);
    check("배치", placement, textsOfPlacementFile(placement));
    const story = storyFile(ref, "4-6");
    check("토리 이야기", story, textsOfStoryFile(story));
    // 쟁점 칸이 견본에 실제로 있어 역할을 봤다.
    expect(seenRoles.size).toBe(ROLE_OF.length);
    // 그림 보기의 단어 id 는 그 단어 글로 낸다(role option).
    const reading1 = readingLesson(ref, 1);
    const options = textsOfLesson("reading", reading1.lesson).filter(
      (f) => f.role === "option",
    );
    expect(options.length).toBeGreaterThan(0);
  });

  it("6.3 시드 규격: 쓴 시드 나무를 다시 읽으면 규격을 통과한다", () => {
    mkdirSync(TMP_ROOT, { recursive: true });
    const dir = mkdtempSync(join(TMP_ROOT, "seed-"));
    made.push(dir);
    const tree = sampleSeedTree(ref);
    const root = writeSeedTree(dir, tree);
    expect(root).toBe(dir);
    const files: string[] = [];
    const walk = (at: string) => {
      for (const entry of readdirSync(at, { withFileTypes: true })) {
        const full = join(at, entry.name);
        if (entry.isDirectory()) walk(full);
        else files.push(relative(root, full).split(sep).join("/"));
      }
    };
    walk(root);
    expect(files.length).toBe(
      Object.keys(SEED_FILES).length +
        tree.lessons.length +
        tree.levelTests.length +
        tree.placements.length +
        tree.stories.length +
        tree.checks.length +
        tree.reviews.length,
    );
    const schemaOf = (parsed: SeedPath): z.ZodType => {
      switch (parsed.kind) {
        case "reference":
          return {
            settings: SettingsFileSchema,
            levelSpecs: LevelSpecsFileSchema,
            unitSpecs: UnitSpecsFileSchema,
            vocab: VocabFileSchema,
            images: ImagesFileSchema,
            modelPrices: ModelPricesFileSchema,
            homophones: HomophonesFileSchema,
            forbidden: ForbiddenFileSchema,
            forms: ListFormsFileSchema,
            metaSentences: MetaSentencesFileSchema,
          }[parsed.name];
        case "lessons":
          return LessonFileSchema;
        case "level-tests":
          return LevelTestFileSchema;
        case "placement":
          return PlacementFileSchema;
        case "stories":
          return StoryFileSchema;
        case "checks":
          return CheckFileSchema;
        case "reviews":
          return ReviewFileSchema;
      }
    };
    for (const file of files) {
      const parsed = parseSeedPath(file);
      expect(parsed, file).not.toBeNull();
      if (!parsed) continue;
      const data: unknown = JSON.parse(readFileSync(join(root, file), "utf8"));
      expectValid(schemaOf(parsed), data, file);
      // 파일 경로와 파일 안의 영역 · 단계 · 단원이 맞다.
      if (parsed.kind === "lessons") {
        expect(data).toMatchObject({
          area: parsed.area,
          level: parsed.level,
          unit: parsed.unit,
        });
      }
      if (parsed.kind === "level-tests") {
        expect(data).toMatchObject({ area: parsed.area, level: parsed.level });
      }
    }
  });
});
