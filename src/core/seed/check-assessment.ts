// 평가 검사(plan-p04c '평가 검사'): 단계 평가 · 회화 평가 카드 · 배치 평가 · 토리 이야기(6.4 단계 평가 · 회화 평가 카드 행, 6.3).
// 수업 공통의 정답 · 그림 · 학습 요소(평가 · 배치는 그 단계까지, 이야기는 구간 첫 단계 앞까지) · 금지 내용과 쓰기 앱 채점 문항의
// 정답 만들 수 있음을 문항마다 다시 쓴다. 평가 · 배치 지문에는 어휘 범위 밖 · 글로서리 검사를 걸지 않는다. DB 없는 순수 함수다.
import {
  checkAnswerNo,
  checkPictureWord,
  checkTextFragments,
  checkWritingItem,
  ENGLISH_ROLES,
  makeReport,
  type Report,
  type SeedIssue,
} from "@/core/seed/check-lesson";
import { questionKey, TALK_ROLES } from "@/core/seed/check-talk";
import type { ReferenceIndex } from "@/core/seed/reference-index";
import {
  type LevelTestFile,
  type PlacementFile,
  type PlacementItem,
  type StoryFile,
  type TestItem,
  textsOfPlacementItem,
  textsOfStory,
  textsOfTestItem,
} from "@/core/seed/schema/assessment";
import type {
  Lesson,
  ReadingLesson,
  SpeakingLesson,
  TalkLesson,
  WritingItem,
  WritingLesson,
} from "@/core/seed/schema/lesson";
import {
  type TalkTestSheet,
  textsOfTalkTestSheet,
} from "@/core/seed/schema/talk";
import {
  type Area,
  bandInfo,
  cellKey,
  READING_QUESTION_TYPES,
  STORIES_PER_BAND,
  STORY_KO_BANDS,
  TALK_TEST_ALLOWED_MIN,
  TALK_TEST_SAME_ORDER_RUN_MAX,
  TALK_TEST_SAME_QUESTIONS_MAX,
  TEST_AI_ITEMS_MAX,
  type TextRole,
  WRITING_ITEM_TYPES,
  YES_NO_AUXILIARIES,
} from "@/core/seed/structure";
import { splitSentences } from "@/core/seed/text";

// ── 글 견주기 ────────────────────────────────────────────────────

/** 문장 견주기 꼴(소문자, 공백 정리, 끝 문장 부호 · 따옴표 뺌). */
export function normalizeSentence(sentence: string): string {
  return sentence
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/["'\u201C\u201D\u2018\u2019]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .trim();
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function sentencesOf(text: string): string[] {
  return splitSentences(text)
    .map(normalizeSentence)
    .filter((s) => s !== "");
}

/** (질문, 보기 묶음) 서명. 보기는 차례를 보지 않는다. */
function questionSignature(
  question: string,
  options: readonly string[] = [],
): string {
  return JSON.stringify([
    normalizeText(question),
    options.map(normalizeText).sort(),
  ]);
}

/** 같은 영역 · 단계 수업에서 뽑은 견줄 글(평가 지문 · 문항 · 회화 질문 겹침). */
export type LessonCorpus = {
  passageSentences: Set<string>;
  itemSignatures: Set<string>;
  talkQuestions: Set<string>;
  /** 회화 카드마다 토리 질문 차례(인사 → 대화 턴 → 더 이야기할 거리, 또는 질문 목록). */
  talkQuestionLists: string[][];
};

function writingSignature(item: WritingItem): string | undefined {
  return item.type === "pick-word"
    ? questionSignature(item.picture, item.options)
    : undefined;
}

/** 같은 영역 · 단계 수업들에서 견줄 글을 모은다. */
export function lessonCorpus(
  area: Area,
  lessons: readonly Lesson[],
): LessonCorpus {
  const corpus: LessonCorpus = {
    passageSentences: new Set(),
    itemSignatures: new Set(),
    talkQuestions: new Set(),
    talkQuestionLists: [],
  };
  for (const lesson of lessons) {
    if (area === "reading") {
      const { content } = lesson as ReadingLesson;
      for (const s of sentencesOf(content.passage))
        corpus.passageSentences.add(s);
      for (const q of content.questions)
        corpus.itemSignatures.add(questionSignature(q.prompt, q.options));
    } else if (area === "speaking") {
      const { content } = lesson as SpeakingLesson;
      for (const item of content.listening) {
        for (const s of sentencesOf(item.script))
          corpus.passageSentences.add(s);
        const prompt =
          item.kind === "text" ? (item.prompt ?? item.script) : item.script;
        corpus.itemSignatures.add(questionSignature(prompt, item.options));
      }
      for (const q of content.questions)
        corpus.itemSignatures.add(questionSignature(q.en));
    } else if (area === "writing") {
      const { content } = lesson as WritingLesson;
      if (content.shape === "items") {
        for (const item of content.items) {
          const sig = writingSignature(item);
          if (sig) corpus.itemSignatures.add(sig);
        }
      }
    } else {
      const { card } = lesson as TalkLesson;
      const greeting =
        "questions" in card.greeting
          ? card.greeting.questions.map((g) => g.question.en)
          : [];
      const list = card.questions
        ? card.questions.map((q) => q.en)
        : [
            ...greeting,
            ...(card.turns ?? []).map((t) => t.question.en),
            ...(card.moreTalk ?? []).map((t) => t.question.en),
          ];
      const keys = list.map(questionKey);
      corpus.talkQuestionLists.push(keys);
      for (const k of keys) corpus.talkQuestions.add(k);
    }
  }
  return corpus;
}

// ── 문항 하나 ────────────────────────────────────────────────────

type AnyItem = TestItem | PlacementItem;

const READING_TYPES = new Set<string>(READING_QUESTION_TYPES);
const WRITING_TYPES = new Set<string>(WRITING_ITEM_TYPES);

/** 평가 · 배치 문항의 (질문, 보기 묶음) 서명. 질문이 없는 문항(타일 · 받아쓰기 · 작문 · 발표)은 없다. */
function itemSignature(item: AnyItem): string | undefined {
  if (READING_TYPES.has(item.type) && "prompt" in item && "options" in item) {
    return questionSignature(item.prompt as string, item.options as string[]);
  }
  switch (item.type) {
    case "listening":
      return questionSignature(
        item.kind === "text" ? (item.prompt ?? item.script) : item.script,
        item.options,
      );
    case "pick-word":
      return questionSignature(item.picture, item.options);
    case "fill-blank":
    case "fix-sentence":
      return questionSignature(item.prompt);
    case "question":
      return questionSignature(item.en);
    default:
      return undefined;
  }
}

/** 벌 사이 겹침에 쓰는 문항 서명(지문 · 질문 · 보기 묶음 · 낱말). */
function formSignature(item: AnyItem): string {
  const record = item as unknown as Record<string, unknown>;
  const text = (key: string) =>
    typeof record[key] === "string" ? normalizeText(record[key] as string) : "";
  const list = (key: string) =>
    Array.isArray(record[key])
      ? (record[key] as string[]).map(normalizeText).sort()
      : [];
  return JSON.stringify([
    item.type,
    text("passage") || text("script"),
    text("prompt") ||
      text("en") ||
      text("sentence") ||
      text("task") ||
      text("topic"),
    text("word") || text("picture"),
    list("options"),
    list("cards"),
    list("tiles"),
  ]);
}

/** 평가 지문 · 듣기 내용의 문장. */
function passageSentencesOf(item: AnyItem): string[] {
  if ("passage" in item && typeof item.passage === "string")
    return sentencesOf(item.passage);
  if (item.type === "listening") return sentencesOf(item.script);
  return [];
}

/** AI 과제 문항(작문 · 발표 · 허용 답 없는 질문). 보기 화면(P5b)도 이 규칙을 쓴다. */
export function isAiItem(item: AnyItem): boolean {
  return (
    item.type === "composition" ||
    item.type === "presentation" ||
    (item.type === "question" && (item.accepted?.length ?? 0) === 0)
  );
}

type ItemScope = { area: Area; level: number; index: ReferenceIndex };

/** 문항 하나의 정답 · 그림 · 쓰기 앱 채점 · 학습 요소(그 단계까지) · 금지 내용. */
function checkItem(
  item: AnyItem,
  path: string,
  scope: ItemScope,
  report: Report,
): void {
  const { index } = scope;
  if (READING_TYPES.has(item.type) && "answerNo" in item && "options" in item) {
    const options = item.options as string[];
    checkAnswerNo(item.answerNo as number, options, `${path}.answerNo`, report);
    if (item.type === "picture") {
      options.forEach((word, j) => {
        checkPictureWord(word, `${path}.options.${j}`, index, report);
      });
    }
  }
  if (item.type === "listening") {
    checkAnswerNo(item.answerNo, item.options, `${path}.answerNo`, report);
    if (item.kind === "picture") {
      item.options.forEach((word, j) => {
        checkPictureWord(word, `${path}.options.${j}`, index, report);
      });
    }
  }
  if (WRITING_TYPES.has(item.type)) {
    checkWritingItem(item as WritingItem, path, report, index);
  }
  const fragments =
    "unit" in item
      ? textsOfTestItem(item as TestItem, path)
      : textsOfPlacementItem(item, path);
  checkTextFragments(
    fragments,
    {
      area: scope.area,
      level: scope.level,
      scope: "test",
      index,
      englishRoles: ENGLISH_ROLES,
    },
    report,
  );
}

// ── 단계 평가 ────────────────────────────────────────────────────

export type LevelTestContext = {
  /** seed/ 뿌리 기준 파일 경로. */
  file: string;
  index: ReferenceIndex;
  /** 같은 영역 · 단계 수업에서 뽑은 견줄 글. */
  corpus: LessonCorpus;
};

function notReady(out: SeedIssue[], file: string): SeedIssue[] {
  makeReport(out, file, undefined)(
    "reference-not-ready",
    "",
    "규격 파일(설정값 · 단계 규격 · 단원 규격 · vocab)이 깨져 칸 검사를 건너뛴다",
  );
  return out;
}

function allowedTestType(
  item: TestItem,
  area: Area,
  level: number,
  index: ReferenceIndex,
): string | undefined {
  const spec = index.levelSpec(area, level);
  if (!spec) return undefined;
  if (spec.area === "writing") {
    const shape = index.writingShape(level);
    const ok =
      shape === "items"
        ? WRITING_TYPES.has(item.type)
        : item.type === "fill-blank" ||
          item.type === "fix-sentence" ||
          (shape === "composition" && item.type === "composition");
    return ok
      ? undefined
      : `쓰기 ${level}단계(${shape}) 평가에 ${item.type} 문항을 둘 수 없다`;
  }
  if (spec.area === "speaking") {
    if (item.type === "repeat" && spec.repeat.sentences === 0) {
      return `따라 말하기가 없는 단계(단계 규격 repeat.sentences 0)에 repeat 문항을 둘 수 없다`;
    }
    if (item.type === "question") {
      if (
        spec.questions.acceptedMin > 0 &&
        (item.accepted?.length ?? 0) === 0
      ) {
        return "허용 답을 두는 단계(단계 규격 questions.acceptedMin)의 질문 문항에 허용 답이 없다";
      }
    }
    if (item.type === "presentation" && !spec.presentation) {
      return "발표가 없는 단계에 presentation 문항을 둘 수 없다";
    }
  }
  return undefined;
}

function checkItemForms(
  file: LevelTestFile & { area: "reading" | "writing" | "speaking" },
  ctx: LevelTestContext,
  out: SeedIssue[],
): void {
  const { index } = ctx;
  const { area, level } = file;
  const forms = index.num("level.test_forms");
  const total = index.num("level.test_items");
  const units = index.unitsOf(area, level).filter((u) => u.unit >= 1).length;
  const spec = index.levelSpec(area, level);
  const aiAllowed =
    (spec?.area === "writing" && index.writingShape(level) === "composition") ||
    (spec?.area === "speaking" && spec.presentation !== undefined);
  const seenForms = new Map<string, number>();
  file.forms.forEach((form, f) => {
    const formReport = makeReport(out, ctx.file, undefined);
    if (form.form > forms) {
      formReport(
        "level-test-count",
        `forms.${f}.form`,
        `벌 ${form.form} 이 1~${forms}(level.test_forms) 밖이다`,
      );
    }
    const nos = new Set<number>();
    const items = form.items as TestItem[];
    const aiItems = items.filter(isAiItem);
    items.forEach((item, i) => {
      const path = `forms.${f}.items.${i}`;
      const report = makeReport(
        out,
        ctx.file,
        cellKey({
          type: "level-test",
          area,
          level,
          form: form.form,
          no: item.no,
        }),
      );
      if (item.no > total || nos.has(item.no)) {
        report(
          "level-test-count",
          `${path}.no`,
          `문항 번호 ${item.no} 가 1~${total}(level.test_items) 밖이거나 겹친다`,
        );
      }
      nos.add(item.no);
      const typeProblem = allowedTestType(item, area, level, index);
      if (typeProblem) report("level-test-type", `${path}.type`, typeProblem);
      if (isAiItem(item)) {
        if (!aiAllowed) {
          report(
            "level-test-ai",
            path,
            "AI 과제 문항은 쓰기 작문 단계 · 말하기 발표 단계 평가에만 둔다",
          );
        } else if (item.no <= total - aiItems.length) {
          report(
            "level-test-ai",
            `${path}.no`,
            `AI 과제 문항(번호 ${item.no})이 벌의 맨 끝(둘째 세션 끝)이 아니다`,
          );
        }
      }
      checkItem(item, path, { area, level, index }, report);
      const sig = itemSignature(item);
      if (sig && ctx.corpus.itemSignatures.has(sig)) {
        report(
          "level-test-item-overlap",
          path,
          "질문 · 보기 묶음이 같은 단계 수업 문항과 같다",
        );
      }
      for (const s of passageSentencesOf(item)) {
        if (ctx.corpus.passageSentences.has(s)) {
          report(
            "level-test-passage-overlap",
            path,
            `지문 · 듣기 내용의 문장 '${s}' 이 같은 단계 수업 지문과 같다`,
          );
          break;
        }
      }
      const fsig = formSignature(item);
      const firstForm = seenForms.get(fsig);
      if (firstForm !== undefined && firstForm !== form.form) {
        report(
          "level-test-forms-overlap",
          path,
          `벌 ${firstForm} 의 문항과 같다`,
        );
      } else if (firstForm === undefined) {
        seenForms.set(fsig, form.form);
      }
    });
    if (aiAllowed && aiItems.length > TEST_AI_ITEMS_MAX) {
      formReport(
        "level-test-ai",
        `forms.${f}.items`,
        `AI 과제 문항이 ${aiItems.length}개라 ${TEST_AI_ITEMS_MAX}개를 넘는다`,
      );
    }
    const full =
      nos.size === total && [...nos].every((n) => n >= 1 && n <= total);
    if (full && units > 0) {
      if (total % units !== 0) {
        formReport(
          "settings",
          `forms.${f}.items`,
          `level.test_items ${total} 이 단원 수 ${units} 로 나누어떨어지지 않는다`,
        );
      } else {
        const per = total / units;
        const counts = new Map<number, number>();
        for (const item of items)
          counts.set(item.unit, (counts.get(item.unit) ?? 0) + 1);
        const wrong = [
          ...new Set([
            ...counts.keys(),
            ...Array.from({ length: units }, (_, u) => u + 1),
          ]),
        ]
          .filter((u) => (counts.get(u) ?? 0) !== per)
          .sort((a, b) => a - b);
        if (wrong.length > 0) {
          formReport(
            "level-test-unit-count",
            `forms.${f}.items`,
            `단원별 문항 수가 ${per}(level.test_items ÷ 단원 수)가 아닌 단원: ${wrong.join(", ")}`,
          );
        }
      }
      if (spec?.testMix) {
        const mix = spec.testMix as Record<string, number | undefined>;
        const counts = new Map<string, number>();
        for (const item of items)
          counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
        const types = new Set([...counts.keys(), ...Object.keys(mix)]);
        const wrongTypes = [...types].filter(
          (t) => (counts.get(t) ?? 0) !== (mix[t] ?? 0),
        );
        if (wrongTypes.length > 0) {
          formReport(
            "level-test-mix",
            `forms.${f}.items`,
            `유형별 문항 수가 단계 규격 testMix 와 다르다: ${wrongTypes.join(", ")}`,
          );
        }
      }
    }
  });
}

function startsWithWord(text: string, word: string): boolean {
  return new RegExp(`^${word}\\b`, "i").test(text.trim());
}

function isYesNoQuestion(question: string): boolean {
  const first = question.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return (
    (YES_NO_AUXILIARIES as readonly string[]).includes(first) &&
    question.trim().endsWith("?")
  );
}

/** 장의 질문 차례가 수업 카드와 같은 차례로 RUN_MAX 턴 넘게 이어지는가. */
function hasSameOrderRun(
  sheetKeys: readonly string[],
  lists: readonly string[][],
): boolean {
  const run = TALK_TEST_SAME_ORDER_RUN_MAX + 1;
  for (let i = 0; i + run <= sheetKeys.length; i++) {
    const window = sheetKeys.slice(i, i + run);
    for (const list of lists) {
      for (let j = 0; j + run <= list.length; j++) {
        if (window.every((k, n) => list[j + n] === k)) return true;
      }
    }
  }
  return false;
}

function checkTalkForms(
  file: LevelTestFile & { area: "talk" },
  ctx: LevelTestContext,
  out: SeedIssue[],
): void {
  const { index } = ctx;
  const { level } = file;
  const forms = index.num("level.test_forms");
  const perSheet = index.num("level.test_items_per_session");
  const sheets = index.num("level.test_items") / perSheet;
  const units = index.unitsOf("talk", level).filter((u) => u.unit >= 1).length;
  const spec = index.levelSpec("talk", level);
  const koMeaning = spec?.area === "talk" && spec.koMeaning;
  const questionForm = new Map<string, number>();
  file.forms.forEach((form, f) => {
    const formReport = makeReport(out, ctx.file, undefined);
    if (form.form > forms) {
      formReport(
        "talk-test-count",
        `forms.${f}.form`,
        `벌 ${form.form} 이 1~${forms}(level.test_forms) 밖이다`,
      );
    }
    const seen = new Set<number>();
    form.sheets.forEach((sheet: TalkTestSheet, s) => {
      const path = `forms.${f}.sheets.${s}`;
      const report = makeReport(
        out,
        ctx.file,
        cellKey({
          type: "level-test",
          area: "talk",
          level,
          form: form.form,
          no: sheet.sheet,
        }),
      );
      if (sheet.sheet > sheets || seen.has(sheet.sheet)) {
        report(
          "talk-test-count",
          `${path}.sheet`,
          `장 번호 ${sheet.sheet} 가 1~${sheets}(level.test_items ÷ level.test_items_per_session) 밖이거나 겹친다`,
        );
      }
      seen.add(sheet.sheet);
      if (sheet.turns.length !== perSheet) {
        report(
          "talk-test-count",
          `${path}.turns`,
          `턴 ${sheet.turns.length}개가 level.test_items_per_session ${perSheet} 와 다르다`,
        );
      } else if (units > 0) {
        if (perSheet % units !== 0) {
          report(
            "settings",
            `${path}.turns`,
            `level.test_items_per_session ${perSheet} 이 단원 수 ${units} 로 나누어떨어지지 않는다`,
          );
        } else {
          const per = perSheet / units;
          const counts = new Map<number, number>();
          for (const t of sheet.turns)
            counts.set(t.unit, (counts.get(t.unit) ?? 0) + 1);
          const wrong = Array.from({ length: units }, (_, u) => u + 1).filter(
            (u) => (counts.get(u) ?? 0) !== per,
          );
          if (wrong.length > 0 || [...counts.keys()].some((u) => u > units)) {
            report(
              "talk-test-unit-count",
              `${path}.turns`,
              `단원별 턴 수가 ${per}(level.test_items_per_session ÷ 단원 수)가 아닌 단원이 있다`,
            );
          }
        }
      }
      const keys = sheet.turns.map((t) => questionKey(t.question.en));
      sheet.turns.forEach((turn, t) => {
        const at = `${path}.turns.${t}`;
        if (turn.allowed.length < TALK_TEST_ALLOWED_MIN) {
          report(
            "talk-test-allowed",
            `${at}.allowed`,
            `허용 답이 ${turn.allowed.length}개라 ${TALK_TEST_ALLOWED_MIN}개보다 적다`,
          );
        } else if (isYesNoQuestion(turn.question.en)) {
          const yes = turn.allowed.some((a) => startsWithWord(a.text, "yes"));
          const no = turn.allowed.some((a) => startsWithWord(a.text, "no"));
          if (!yes || !no) {
            report(
              "talk-test-allowed",
              `${at}.allowed`,
              "예 · 아니오로 답할 수 있는 질문인데 예 쪽과 아니오 쪽 답이 함께 있지 않다",
            );
          }
        }
        if (koMeaning && turn.question.ko === undefined) {
          report(
            "talk-test-ko",
            `${at}.question.ko`,
            "토리 질문의 한국어 뜻이 없다",
          );
        }
      });
      const same = keys.filter((k) => ctx.corpus.talkQuestions.has(k)).length;
      if (
        same > TALK_TEST_SAME_QUESTIONS_MAX ||
        hasSameOrderRun(keys, ctx.corpus.talkQuestionLists)
      ) {
        report(
          "talk-test-lesson-overlap",
          `${path}.turns`,
          `수업 카드와 글이 같은 토리 질문이 ${same}개(${TALK_TEST_SAME_QUESTIONS_MAX}개까지)이거나 같은 차례로 ${TALK_TEST_SAME_ORDER_RUN_MAX}턴 넘게 이어진다`,
        );
      }
      keys.forEach((k, t) => {
        const firstForm = questionForm.get(k);
        if (firstForm !== undefined && firstForm !== form.form) {
          report(
            "talk-test-forms-overlap",
            `${path}.turns.${t}.question.en`,
            `벌 ${firstForm} 의 장과 같은 토리 질문이다`,
          );
        }
      });
      for (const k of keys)
        if (!questionForm.has(k)) questionForm.set(k, form.form);
      checkTextFragments(
        textsOfTalkTestSheet(sheet, path),
        { area: "talk", level, scope: "test", index, englishRoles: TALK_ROLES },
        report,
      );
    });
  });
}

/** 단계 평가 파일 하나(읽기 · 쓰기 · 말하기 문항, 회화 평가 카드 장). 칸 키는 문항 · 장마다, path 는 파일 기준이다. */
export function checkLevelTestFile(
  file: LevelTestFile,
  ctx: LevelTestContext,
): SeedIssue[] {
  const out: SeedIssue[] = [];
  if (!ctx.index.ready) return notReady(out, ctx.file);
  if (file.area === "talk") checkTalkForms(file, ctx, out);
  else checkItemForms(file, ctx, out);
  return out;
}

// ── 배치 평가 ────────────────────────────────────────────────────

export type FileContext = { file: string; index: ReferenceIndex };

/** 배치 평가 파일 하나(가 벌 = 1). 예비 문항은 말하기에만, 같은 번호 범위, 모두 듣고 고르기(정할 것 ㅊ). */
export function checkPlacementFile(
  file: PlacementFile,
  ctx: FileContext,
): SeedIssue[] {
  const out: SeedIssue[] = [];
  const { index } = ctx;
  if (!index.ready) return notReady(out, ctx.file);
  const per = index.num("placement.items_per_level");
  const levels = new Set<number>();
  file.levels.forEach((entry, l) => {
    const levelReport = makeReport(out, ctx.file, undefined);
    if (levels.has(entry.level)) {
      levelReport(
        "placement-count",
        `levels.${l}.level`,
        `단계 ${entry.level} 이 겹친다`,
      );
    }
    levels.add(entry.level);
    for (const [group, spare] of [
      ["items", false],
      ["spares", true],
    ] as const) {
      const list = entry[group] as PlacementItem[];
      const nos = new Set<number>();
      if (spare && file.area !== "speaking" && list.length > 0) {
        levelReport(
          "placement-count",
          `levels.${l}.spares`,
          "예비 문항은 말하기 배치에만 둔다",
        );
      }
      list.forEach((item, i) => {
        const path = `levels.${l}.${group}.${i}`;
        const report = makeReport(
          out,
          ctx.file,
          cellKey({
            type: "placement",
            area: file.area,
            level: entry.level,
            form: file.form,
            no: item.no,
            spare,
          }),
        );
        if (item.no > per || nos.has(item.no)) {
          report(
            "placement-count",
            `${path}.no`,
            `문항 번호 ${item.no} 가 1~${per}(placement.items_per_level) 밖이거나 겹친다`,
          );
        }
        nos.add(item.no);
        if (spare && file.area === "speaking" && item.type !== "listening") {
          report(
            "placement-count",
            `${path}.type`,
            "예비 문항은 듣고 고르기(listening)만 둔다",
          );
        }
        checkItem(
          item,
          path,
          { area: file.area, level: entry.level, index },
          report,
        );
      });
    }
  });
  return out;
}

// ── 토리 이야기 ──────────────────────────────────────────────────

const STORY_ROLES: readonly TextRole[] = ["story", "prompt", "option"];

/** 토리 이야기 파일 하나(구간). 학습 요소는 구간 첫 단계 앞까지의 형태 · 그 단계 회화 문장 길이 상한(정할 것 ㅅ). */
export function checkStoryFile(file: StoryFile, ctx: FileContext): SeedIssue[] {
  const out: SeedIssue[] = [];
  const { index } = ctx;
  if (!index.ready) return notReady(out, ctx.file);
  const first = bandInfo(file.band).first;
  const seen = new Set<number>();
  file.stories.forEach((story, s) => {
    const path = `stories.${s}`;
    const report = makeReport(
      out,
      ctx.file,
      cellKey({ type: "story", band: file.band, no: story.no }),
    );
    if (story.no > STORIES_PER_BAND || seen.has(story.no)) {
      report(
        "story-count",
        `${path}.no`,
        `이야기 번호 ${story.no} 가 1~${STORIES_PER_BAND} 밖이거나 겹친다`,
      );
    }
    seen.add(story.no);
    if (STORY_KO_BANDS.includes(file.band) && story.textKo === undefined) {
      report(
        "story-ko",
        `${path}.textKo`,
        `${file.band} 구간 이야기에 한국어 뜻이 없다`,
      );
    }
    story.questions.forEach((q, i) => {
      checkAnswerNo(
        q.answerNo,
        q.options,
        `${path}.questions.${i}.answerNo`,
        report,
      );
    });
    // 토리 이야기는 회화 구간 첫 단계 앞까지의 형태만 쓴다(allowedForms 'story' 에 구간 첫 단계를 넘긴다).
    checkTextFragments(
      textsOfStory(story, path),
      {
        area: "talk",
        level: first,
        scope: "story",
        index,
        englishRoles: STORY_ROLES,
      },
      report,
    );
  });
  return out;
}
