// 칸 검사(plan-p04b '칸 검사'): 읽기 · 쓰기 · 말하기 수업 칸 하나에 6.4 의 분량 · 말하기 수업 · 어휘 배정 · 어휘 범위 밖 단어 ·
// 학습 요소 범위 · 정답 · 그림 · 글로서리 · 금지 내용 행을 건다. 수업 공통 검사(checkLessonCommon)는 P4c 회화 카드 검사가
// 회화 몫 role 로 다시 부른다. 숫자는 설정값 · 단계 규격에서 읽는다. DB 없는 순수 함수다.

import type { Report } from "@/core/seed/issue";
import type {
  FormScope,
  ReferenceIndex,
  SeedIssue,
} from "@/core/seed/reference-index";
import {
  type LessonOf,
  type ReadingLesson,
  type SpeakingLesson,
  textsOfLesson,
  type WritingItem,
  type WritingLesson,
} from "@/core/seed/schema/lesson";
import type {
  Range,
  ReadingLevelSpec,
  SpeakingLevelSpec,
  WritingLevelSpec,
} from "@/core/seed/schema/reference";
import {
  ALPHABET_UNIT,
  type Area,
  approxLe,
  cellKey,
  isAlphabetUnit,
  type LessonKind,
  type TextFragment,
  type TextRole,
  WORD_BOX_MIN,
} from "@/core/seed/structure";
import {
  forbiddenHits,
  formsIn,
  glossaryMissing,
  isEnglishSentence,
  offbandRatio,
  sentenceWords,
  splitSentences,
  wordIdsIn,
} from "@/core/seed/text";

export type { SeedIssue } from "@/core/seed/reference-index";

/** 영어 검사(길이 · 형태 · 범위 · 어휘 배정)에 쓰는 role(plan-p04b 수업 공통 표). gloss · ko · piece · scene 은 밖이다. */
export const ENGLISH_ROLES: readonly TextRole[] = [
  "passage",
  "script",
  "prompt",
  "option",
  "answer",
  "example",
  "hint",
];
/** 쓰기 작문의 어휘 배정은 과제 · 예시 · 힌트만 센다(6.3 '쓰기 6단계 이상은 배정 새 단어를 과제 · 예시 · 힌트에'). */
export const COMPOSITION_ALLOCATION_ROLES: readonly TextRole[] = [
  "prompt",
  "example",
  "hint",
];

/** 단어 꼴 문항(쓰기 amount.words 로 센다, plan-p04b). */
const WORD_ITEM_TYPES = new Set<WritingItem["type"]>([
  "pick-word",
  "copy-tiles",
  "fill-letters",
  "dictation",
  "build-tiles",
]);
const PUNCTUATION_CARD = /^[.,!?]$/;
const HAS_PUNCTUATION = /[.,!?]/;
const HAS_LETTER = /[A-Za-z]/;
const ANSWER_PIECE = /[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*|[^\sA-Za-z0-9]/g;

/** 수업 겉 가운데 공통 검사가 읽는 칸(회화 수업도 같은 겉). */
export type LessonHead = {
  kind: LessonKind;
  lessonNo: number;
  variant: number;
  newWords: readonly string[];
  unitWords: readonly string[];
  preview?: readonly { word: string; meaningKo: string; example: string }[];
};

export type LessonCellContext = {
  area: Area;
  level: number;
  unit: number;
  /** seed/ 뿌리 기준 수업 파일 경로. */
  file: string;
  index: ReferenceIndex;
};

export type CommonOptions = {
  /** 수업의 글 조각(경로는 수업 객체 기준). */
  fragments: readonly TextFragment[];
  /** 영어 검사 · 단원 단어 확인에 쓰는 role. */
  englishRoles: readonly TextRole[];
  /** 새 단어가 나와야 하는 role(없으면 englishRoles). */
  allocationRoles?: readonly TextRole[];
};

/** 검사 결과를 받는 함수 — 정의는 잎 모듈 issue.ts(가져오기 순환을 끊으려고 옮김). */
export type { Report };

/** 검사 결과를 모으는 함수를 만든다(파일 · 칸 키를 묶는다). P4c 평가 검사가 같이 쓴다. */
export function makeReport(
  out: SeedIssue[],
  file: string,
  cell: string | undefined,
): Report {
  return (rule, path, message, severity = "error") => {
    out.push({
      rule,
      severity,
      message,
      file,
      ...(cell ? { cell } : {}),
      path,
    });
  };
}

function reporter(
  out: SeedIssue[],
  ctx: LessonCellContext,
  cell: string,
): Report {
  return makeReport(out, ctx.file, cell);
}

function lessonCell(ctx: LessonCellContext, lesson: LessonHead): string {
  return cellKey({
    type: "lesson",
    area: ctx.area,
    level: ctx.level,
    unit: ctx.unit,
    kind: lesson.kind,
    lessonNo: lesson.lessonNo,
    variant: lesson.variant,
  });
}

function inRange(value: number, range: Range | undefined): boolean {
  return range === undefined || (value >= range.min && value <= range.max);
}

function rangeText(range: Range): string {
  return range.min === range.max ? `${range.min}` : `${range.min}~${range.max}`;
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((x) => right.has(x));
}

/** 미리보기 밖의 글 조각(새 단어 미리보기는 새 단어를 늘 담으므로 배정 · 단원 단어 확인에서 뺀다). */
function bodyFragments(
  fragments: readonly TextFragment[],
  roles: readonly TextRole[],
): TextFragment[] {
  return fragments.filter(
    (f) =>
      roles.includes(f.role) &&
      !f.path.startsWith("preview.") &&
      !f.path.includes(".preview."),
  );
}

function idsIn(
  fragments: readonly TextFragment[],
  index: ReferenceIndex,
): Set<string> {
  const ids = new Set<string>();
  for (const f of fragments) {
    for (const id of wordIdsIn(f.text, index.lexicon)) ids.add(id);
  }
  return ids;
}

// ── 수업 공통 ────────────────────────────────────────────────────

function checkLayout(
  lesson: LessonHead,
  ctx: LessonCellContext,
  report: Report,
): void {
  const { area, level, unit, index } = ctx;
  const frame = index.frame(area, level, unit);
  const allocation = index.allocation(area, level, unit);
  if (!frame || !allocation?.ok) {
    report(
      "layout",
      "kind",
      `${area} ${level}단계 단원 ${unit} 의 단원 틀 · 배정표를 구할 수 없다(규격 파일)`,
    );
    return;
  }
  const regular = frame.regularLessons;
  const assigned = allocation.assignedCount;
  const alphabet = isAlphabetUnit(area, level, unit);
  const no = lesson.lessonNo;
  const fail = (message: string) => report("layout", "lessonNo", message);
  switch (lesson.kind) {
    case "alphabet":
      if (!alphabet)
        report(
          "layout",
          "kind",
          `alphabet 수업은 알파벳 · 소리 단원(단원 ${ALPHABET_UNIT.unit})에만 있다`,
        );
      else if (no > regular)
        fail(`알파벳 수업 번호 ${no} 가 정규 수업 1~${regular} 밖이다`);
      break;
    case "assigned":
      if (alphabet)
        report(
          "layout",
          "kind",
          "알파벳 · 소리 단원의 정규 수업 종류는 alphabet 이다",
        );
      else if (no > assigned)
        fail(`배정 수업 번호 ${no} 가 1~${assigned} 밖이다`);
      break;
    case "reinforce":
      if (alphabet)
        report(
          "layout",
          "kind",
          "알파벳 · 소리 단원의 정규 수업 종류는 alphabet 이다",
        );
      else if (no <= assigned || no > regular) {
        fail(`다지기 수업 번호 ${no} 가 ${assigned + 1}~${regular} 밖이다`);
      }
      break;
    case "remedial":
      if (no > frame.remedialLessons) {
        fail(
          `보강 수업 번호 ${no} 가 1~${frame.remedialLessons}(seed.remedial_per_unit) 밖이다`,
        );
      }
      break;
  }
  if (lesson.variant > frame.topicVariants) {
    report(
      "layout",
      "variant",
      `주제 변형 ${lesson.variant} 이 1~${frame.topicVariants}(seed.topic_variants) 밖이다`,
    );
  }
}

/**
 * 배정표가 정한 그 수업의 새 단어(배정 · 알파벳 수업). 다지기 · 보강은 빈 목록.
 * 배정표를 구할 수 없으면 undefined(비교를 건너뛴다, layout 이 한 건 낸다, P4b 검토 M-1).
 */
function expectedNewWords(
  lesson: LessonHead,
  ctx: LessonCellContext,
): string[] | undefined {
  const allocation = ctx.index.allocation(ctx.area, ctx.level, ctx.unit);
  if (!allocation?.ok) return undefined;
  if (lesson.kind !== "assigned" && lesson.kind !== "alphabet") return [];
  return allocation.lessons[lesson.lessonNo - 1]?.newWords ?? [];
}

function checkAllocation(
  lesson: LessonHead,
  ctx: LessonCellContext,
  options: CommonOptions,
  report: Report,
): void {
  const expected = expectedNewWords(lesson, ctx);
  if (expected && !sameSet(lesson.newWords, expected)) {
    report(
      "vocab-allocation",
      "newWords",
      `새 단어 [${lesson.newWords.join(", ")}] 가 배정표 [${expected.join(", ")}] 와 다르다`,
    );
  }
  const seen = idsIn(
    bodyFragments(
      options.fragments,
      options.allocationRoles ?? options.englishRoles,
    ),
    ctx.index,
  );
  lesson.newWords.forEach((word, i) => {
    if (!seen.has(word)) {
      report(
        "vocab-allocation",
        `newWords.${i}`,
        `새 단어 ${word} 가 수업 글에 원형으로 나오지 않는다`,
      );
    }
  });
  if (lesson.preview) {
    if (
      !sameSet(
        lesson.preview.map((p) => p.word),
        lesson.newWords,
      )
    ) {
      report(
        "vocab-allocation",
        "preview",
        "새 단어 미리보기의 단어가 새 단어 목록과 다르다",
      );
    }
    lesson.preview.forEach((p, i) => {
      if (p.meaningKo.trim() === "" || p.example.trim() === "") {
        report(
          "vocab-allocation",
          `preview.${i}`,
          `미리보기 ${p.word} 의 뜻이나 예문이 비었다`,
        );
      }
    });
  }
}

function checkUnitWords(
  lesson: LessonHead,
  ctx: LessonCellContext,
  options: CommonOptions,
  report: Report,
): void {
  const unitWords =
    ctx.index.unitSpec(ctx.area, ctx.level, ctx.unit)?.words ?? [];
  const inUnit = new Set(unitWords);
  const seen = idsIn(
    bodyFragments(options.fragments, options.englishRoles),
    ctx.index,
  );
  lesson.unitWords.forEach((word, i) => {
    if (!inUnit.has(word)) {
      report(
        "unit-words",
        `unitWords.${i}`,
        `${word} 는 이 단원의 단원 단어가 아니다`,
      );
    } else if (!seen.has(word)) {
      report(
        "unit-words",
        `unitWords.${i}`,
        `단원 단어 목록의 ${word} 가 수업 글에 나오지 않는다`,
      );
    }
  });
  const listed = new Set(lesson.unitWords);
  for (const word of unitWords) {
    if (seen.has(word) && !listed.has(word)) {
      report(
        "unit-words-unlisted",
        "unitWords",
        `수업 글에 나오는 단원 단어 ${word} 가 목록에 없다`,
        "warning",
      );
    }
  }
}

/** 영어 글 검사(학습 요소 범위)와 금지어 검사를 거는 자리. */
export type TextScope = {
  /** 형태 표 차례를 고르는 영역(쓰기면 writing 차례). */
  area: Area;
  /** 문장 길이 상한 · 형태 범위를 읽는 단계. 토리 이야기는 구간 첫 단계(정할 것 ㅅ, P4b 검토 메모). */
  level: number;
  /** 수업이면 단원 번호, 단계 평가 · 배치면 'test', 토리 이야기면 'story'. */
  scope: FormScope;
  index: ReferenceIndex;
  englishRoles: readonly TextRole[];
};

/**
 * 학습 요소 범위(영어 role 문장의 길이 ≤ 단계 규격 sentenceMaxWords, 형태 표 범위 밖 형태 없음)와
 * 금지 내용(모든 글 조각)을 본다. 문장 길이 상한은 scope.area · scope.level 의 단계 규격에서 읽는다.
 */
export function checkTextFragments(
  fragments: readonly TextFragment[],
  scope: TextScope,
  report: Report,
): void {
  const spec = scope.index.levelSpec(scope.area, scope.level);
  const allowed = scope.index.allowedForms(
    scope.area,
    scope.level,
    scope.scope,
  );
  for (const fragment of fragments) {
    if (spec && scope.englishRoles.includes(fragment.role)) {
      for (const sentence of splitSentences(fragment.text).filter(
        isEnglishSentence,
      )) {
        const words = sentenceWords(sentence);
        if (words > spec.sentenceMaxWords) {
          report(
            "learning-elements",
            fragment.path,
            `문장 낱말 ${words}개가 상한 ${spec.sentenceMaxWords}(3.6)를 넘는다: ${sentence}`,
          );
        }
        for (const form of formsIn(sentence, scope.index.forms)) {
          if (!allowed.has(form)) {
            report(
              "learning-elements",
              fragment.path,
              `범위 밖 형태 ${form} 가 있다(3.6): ${sentence}`,
            );
          }
        }
      }
    }
    for (const hit of forbiddenHits(fragment.text, scope.index.forbidden)) {
      const what =
        hit.kind === "pattern"
          ? `금지 정규식 ${hit.id}(${hit.category})`
          : `금지어 ${hit.match}`;
      report("forbidden", fragment.path, `${what} 에 걸린다`);
    }
  }
}

/**
 * 수업 공통 검사(layout · vocab-allocation · unit-words · learning-elements · forbidden). 칸 키는 issue.cell 에 적는다.
 * P4c 회화 카드 검사가 회화 몫 role 로 다시 부른다.
 */
export function checkLessonCommon(
  lesson: LessonHead,
  ctx: LessonCellContext,
  options: CommonOptions,
): SeedIssue[] {
  const out: SeedIssue[] = [];
  const report = reporter(out, ctx, lessonCell(ctx, lesson));
  checkLayout(lesson, ctx, report);
  checkAllocation(lesson, ctx, options, report);
  checkUnitWords(lesson, ctx, options, report);
  checkTextFragments(
    options.fragments,
    {
      area: ctx.area,
      level: ctx.level,
      scope: ctx.unit,
      index: ctx.index,
      englishRoles: options.englishRoles,
    },
    report,
  );
  return out;
}

// ── 정답 · 그림 ──────────────────────────────────────────────────

export function checkAnswerNo(
  answerNo: number,
  options: readonly unknown[],
  path: string,
  report: Report,
): void {
  if (answerNo > options.length) {
    report(
      "answer",
      path,
      `정답 번호 ${answerNo} 가 보기 1~${options.length} 밖이다`,
    );
  }
}

export function checkPictureWord(
  word: string,
  path: string,
  index: ReferenceIndex,
  report: Report,
): void {
  const entry = index.vocab.get(word);
  if (!entry) {
    report("image", path, `그림 보기 단어 ${word} 가 vocab 에 없다`);
  } else if (entry.imageKey === undefined) {
    report("image", path, `그림 보기 단어 ${word} 에 그림 키가 없다`);
  } else if (!index.images.has(entry.imageKey)) {
    report("image", path, `그림 키 ${entry.imageKey} 가 그림 카탈로그에 없다`);
  }
}

// ── 읽기 ─────────────────────────────────────────────────────────

function checkReading(
  lesson: ReadingLesson,
  spec: ReadingLevelSpec,
  ctx: LessonCellContext,
  report: Report,
): void {
  const { content } = lesson;
  const { index } = ctx;
  const words = sentenceWords(content.passage);
  if (!inRange(words, spec.passage.words)) {
    report(
      "amount",
      "content.passage",
      `지문 낱말 ${words}개가 ${rangeText(spec.passage.words as Range)}단어 밖이다`,
    );
  }
  const sentences = splitSentences(content.passage).length;
  if (!inRange(sentences, spec.passage.sentences)) {
    report(
      "amount",
      "content.passage",
      `지문 문장 ${sentences}개가 ${rangeText(spec.passage.sentences as Range)}문장 밖이다`,
    );
  }
  if (content.questions.length !== spec.questions.total) {
    report(
      "amount",
      "content.questions",
      `문항 ${content.questions.length}개가 ${spec.questions.total}개와 다르다`,
    );
  }
  const counts = new Map<string, number>();
  for (const q of content.questions)
    counts.set(q.type, (counts.get(q.type) ?? 0) + 1);
  const mix = spec.questions.mix as Record<string, number | undefined>;
  const types = new Set([...counts.keys(), ...Object.keys(mix)]);
  const wrong = [...types].filter(
    (t) => (counts.get(t) ?? 0) !== (mix[t] ?? 0),
  );
  if (wrong.length > 0) {
    report(
      "amount",
      "content.questions",
      `문항 유형별 수가 단계 규격과 다르다: ${wrong.join(", ")}`,
    );
  }
  const ratio = offbandRatio(content.passage, {
    lexicon: index.lexicon,
    level: ctx.level,
    newWords: lesson.newWords,
    properNouns: content.glossary.filter((g) => g.proper).map((g) => g.surface),
  });
  const max = index.num("seed.max_offband_ratio");
  if (!approxLe(ratio, max)) {
    report(
      "offband",
      "content.passage",
      `어휘 범위 밖 단어 비율 ${(ratio * 100).toFixed(1)}% 가 ${(max * 100).toFixed(1)}%(seed.max_offband_ratio)를 넘는다`,
    );
  }
  const missing = glossaryMissing(
    content.passage,
    content.glossary,
    index.lexicon,
  );
  if (missing.length > 0) {
    report(
      "glossary",
      "content.glossary",
      `글로서리에 없는 표기형: ${missing.join(", ")}`,
    );
  }
  content.questions.forEach((q, i) => {
    const at = `content.questions.${i}`;
    checkAnswerNo(q.answerNo, q.options, `${at}.answerNo`, report);
    if (q.kind === "picture") {
      q.options.forEach((word, j) => {
        checkPictureWord(word, `${at}.options.${j}`, index, report);
      });
    }
  });
}

// ── 쓰기 ─────────────────────────────────────────────────────────

/** 남은 글을 쓰지 않은 타일로 앞에서부터 이어 만들 수 있는가. */
function buildable(
  rest: string,
  tiles: readonly string[],
  used: boolean[],
): boolean {
  if (rest === "") return true;
  for (let i = 0; i < tiles.length; i++) {
    const tile = (tiles[i] ?? "").toLowerCase();
    if (used[i] || tile === "" || !rest.startsWith(tile)) continue;
    used[i] = true;
    if (buildable(rest.slice(tile.length), tiles, used)) return true;
    used[i] = false;
  }
  return false;
}

/** 빈칸 묶음마다 필요한 글자를 타일로 차례대로 채울 수 있는가. */
function fillable(
  pattern: string,
  answer: string,
  tiles: readonly string[],
): "ok" | "pattern" | "tiles" {
  const p = pattern.toLowerCase();
  const a = answer.toLowerCase();
  if (p.length !== a.length) return "pattern";
  const runs: string[] = [];
  let run = "";
  for (let i = 0; i < p.length; i++) {
    if (p.charAt(i) === "_") {
      run += a.charAt(i);
      continue;
    }
    if (p.charAt(i) !== a.charAt(i)) return "pattern";
    if (run !== "") runs.push(run);
    run = "";
  }
  if (run !== "") runs.push(run);
  const used = tiles.map(() => false);
  return runs.every((r) => buildable(r, tiles, used)) ? "ok" : "tiles";
}

/** 보이는 · 들리는 낱말이 허용 정답 가운데 하나인가(소문자, P4b 검토 M-4 · plan-p04b 쓰기 '정답' 행). */
function checkShownWord(
  shown: string,
  accepted: readonly string[],
  path: string,
  report: Report,
): void {
  const lower = shown.trim().toLowerCase();
  if (!accepted.some((a) => a.trim().toLowerCase() === lower)) {
    report(
      "answer",
      path,
      `${shown} 가 허용 정답 [${accepted.join(", ")}] 가운데 없다`,
    );
  }
}

function answerPieces(text: string): string[] {
  return (text.toLowerCase().match(ANSWER_PIECE) ?? []).sort();
}

export function checkWritingItem(
  item: WritingItem,
  at: string,
  report: Report,
  index: ReferenceIndex,
): void {
  const answer = item.accepted[0] ?? "";
  switch (item.type) {
    case "pick-word":
      checkPictureWord(item.picture, `${at}.picture`, index, report);
      if (item.answerNo > item.options.length) {
        checkAnswerNo(item.answerNo, item.options, `${at}.answerNo`, report);
      } else if (item.options[item.answerNo - 1] !== answer) {
        report(
          "answer",
          `${at}.answerNo`,
          `정답 보기 ${item.options[item.answerNo - 1]} 가 첫 허용 정답 ${answer} 와 다르다`,
        );
      }
      break;
    case "copy-tiles":
    case "build-tiles":
      checkShownWord(item.word, item.accepted, `${at}.word`, report);
      if (
        !buildable(
          answer.toLowerCase(),
          item.tiles,
          item.tiles.map(() => false),
        )
      ) {
        report("answer", `${at}.tiles`, `타일로 ${answer} 를 만들 수 없다`);
      }
      break;
    case "fill-letters": {
      checkShownWord(item.word, item.accepted, `${at}.word`, report);
      const result = fillable(item.pattern, answer, item.tiles);
      if (result !== "ok") {
        report(
          "answer",
          `${at}.${result}`,
          result === "pattern"
            ? `빈칸 꼴 ${item.pattern} 이 ${answer} 와 맞지 않는다`
            : `빈칸을 타일로 채워 ${answer} 를 만들 수 없다`,
        );
      }
      break;
    }
    case "assemble-phrase":
    case "assemble-sentence": {
      const cards = item.cards.map((c) => c.toLowerCase()).sort();
      const pieces = answerPieces(answer);
      if (cards.join(" ") !== pieces.join(" ")) {
        report(
          "answer",
          `${at}.cards`,
          `카드 모음이 첫 허용 정답 ${answer} 의 낱말 · 문장 부호와 다르다`,
        );
      }
      if (item.type === "assemble-sentence") {
        item.cards.forEach((card, j) => {
          if (card !== card.toLowerCase()) {
            report(
              "writing-cards",
              `${at}.cards.${j}`,
              `문장 조립 카드 ${card} 에 대문자가 있다(대문자는 아이가 바꾼다)`,
            );
          }
          if (HAS_LETTER.test(card) && HAS_PUNCTUATION.test(card)) {
            report(
              "writing-cards",
              `${at}.cards.${j}`,
              `문장 부호가 낱말 카드 ${card} 에 붙어 있다`,
            );
          }
        });
        if (!item.cards.some((card) => PUNCTUATION_CARD.test(card))) {
          report("writing-cards", `${at}.cards`, "문장 부호 카드가 없다");
        }
      }
      break;
    }
    case "dictation":
      checkShownWord(item.word, item.accepted, `${at}.word`, report);
      checkShownWord(item.audioText, item.accepted, `${at}.audioText`, report);
      break;
  }
}

function checkWriting(
  lesson: WritingLesson,
  spec: WritingLevelSpec,
  ctx: LessonCellContext,
  report: Report,
): void {
  const { content } = lesson;
  const shape = ctx.index.writingShape(ctx.level);
  if (content.shape !== shape || spec.amount.kind !== shape) {
    report(
      "writing-shape",
      "content.shape",
      `쓰기 ${ctx.level}단계 모양은 ${shape} 인데 수업은 ${content.shape} 다`,
    );
  }
  if (content.shape === "items") {
    content.items.forEach((item, i) => {
      checkWritingItem(item, `content.items.${i}`, report, ctx.index);
    });
    if (spec.amount.kind !== "items") return;
    const amount = spec.amount;
    const count = (pred: (item: WritingItem) => boolean) =>
      content.items.filter(pred).length;
    const words = count((item) => WORD_ITEM_TYPES.has(item.type));
    const phrases = count((item) => item.type === "assemble-phrase");
    const sentences = count((item) => item.type === "assemble-sentence");
    const expected = {
      words: amount.words ?? 0,
      phrases: amount.phrases ?? 0,
      sentences: amount.sentences ?? 0,
    };
    if (
      words !== expected.words ||
      phrases !== expected.phrases ||
      sentences !== expected.sentences
    ) {
      report(
        "amount",
        "content.items",
        `단어 ${words} · 어구 ${phrases} · 문장 ${sentences} 가 단계 규격 단어 ${expected.words} · 어구 ${expected.phrases} · 문장 ${expected.sentences} 와 다르다`,
      );
    }
    content.items.forEach((item, i) => {
      if (!amount.itemTypes.includes(item.type)) {
        report(
          "amount",
          `content.items.${i}.type`,
          `${item.type} 는 이 단계 문항 유형이 아니다`,
        );
      }
      if (item.type === "assemble-sentence" && amount.sentenceWords) {
        const n = sentenceWords(item.accepted[0] ?? "");
        if (!inRange(n, amount.sentenceWords)) {
          report(
            "amount",
            `content.items.${i}.accepted.0`,
            `문장 낱말 ${n}개가 ${rangeText(amount.sentenceWords)}단어 밖이다`,
          );
        }
      }
    });
    return;
  }
  if (content.shape === "guided") {
    if (spec.amount.kind !== "guided") return;
    const amount = spec.amount;
    if (!inRange(content.sentences.length, amount.sentences)) {
      report(
        "amount",
        "content.sentences",
        `문장 틀 ${content.sentences.length}개가 ${rangeText(amount.sentences)}개 밖이다`,
      );
    }
    if (amount.input === "word-box") {
      content.sentences.forEach((s, i) => {
        if ((s.wordBox?.length ?? 0) < WORD_BOX_MIN) {
          report(
            "amount",
            `content.sentences.${i}.wordBox`,
            `단어 상자 낱말이 ${WORD_BOX_MIN}개보다 적다`,
          );
        }
      });
    }
    return;
  }
  if (spec.amount.kind !== "composition") return;
  const sentences = splitSentences(content.example).length;
  const words = sentenceWords(content.example);
  if (
    !inRange(sentences, spec.amount.sentences) ||
    !inRange(words, spec.amount.words)
  ) {
    report(
      "amount",
      "content.example",
      `예시문 ${sentences}문장 · ${words}단어가 단계 규격 분량 밖이다`,
    );
  }
}

// ── 말하기 ───────────────────────────────────────────────────────

function checkSpeaking(
  lesson: SpeakingLesson,
  spec: SpeakingLevelSpec,
  ctx: LessonCellContext,
  report: Report,
): void {
  const { content } = lesson;
  const { index } = ctx;
  const fail = (path: string, message: string) =>
    report("speaking", path, message);
  if (content.repeat.words.length !== spec.repeat.words) {
    fail(
      "content.repeat.words",
      `따라 말할 단어 ${content.repeat.words.length}개가 ${spec.repeat.words}개와 다르다`,
    );
  }
  if (content.repeat.sentences.length !== spec.repeat.sentences) {
    fail(
      "content.repeat.sentences",
      `따라 말할 문장 ${content.repeat.sentences.length}개가 ${spec.repeat.sentences}개와 다르다`,
    );
  }
  content.repeat.sentences.forEach((sentence, i) => {
    const n = sentenceWords(sentence);
    if (spec.repeat.sentenceWords && !inRange(n, spec.repeat.sentenceWords)) {
      fail(
        `content.repeat.sentences.${i}`,
        `따라 말할 문장 낱말 ${n}개가 ${rangeText(spec.repeat.sentenceWords)}단어 밖이다`,
      );
    }
  });
  if (content.listening.length !== spec.listening.items) {
    fail(
      "content.listening",
      `듣기 문항 ${content.listening.length}개가 ${spec.listening.items}개와 다르다`,
    );
  }
  content.listening.forEach((item, i) => {
    const at = `content.listening.${i}`;
    if (item.kind !== spec.listening.options) {
      fail(
        `${at}.kind`,
        `듣기 문항 보기 꼴 ${item.kind} 가 ${spec.listening.options} 와 다르다`,
      );
    }
    checkAnswerNo(item.answerNo, item.options, `${at}.answerNo`, report);
    if (item.kind === "picture") {
      item.options.forEach((word, j) => {
        checkPictureWord(word, `${at}.options.${j}`, index, report);
      });
    }
  });
  const q = spec.questions;
  if (content.questions.length !== q.count) {
    fail(
      "content.questions",
      `질문 ${content.questions.length}개가 ${q.count}개와 다르다`,
    );
  }
  content.questions.forEach((question, i) => {
    const at = `content.questions.${i}`;
    if (q.modelAnswer !== (question.modelAnswer !== undefined)) {
      fail(
        `${at}.modelAnswer`,
        q.modelAnswer
          ? "바른 답 문장이 없다(단계 규격 questions.modelAnswer)"
          : "이 단계 질문에는 바른 답 문장을 두지 않는다",
      );
    } else if (question.modelAnswer !== undefined && q.answerSentences) {
      const n = splitSentences(question.modelAnswer).length;
      if (!inRange(n, q.answerSentences)) {
        fail(
          `${at}.modelAnswer`,
          `바른 답 ${n}문장이 ${rangeText(q.answerSentences)}문장 밖이다`,
        );
      }
    }
    if (q.acceptedMin > 0 && (question.accepted?.length ?? 0) < q.acceptedMin) {
      fail(
        `${at}.accepted`,
        `허용 답이 ${question.accepted?.length ?? 0}개라 ${q.acceptedMin}개보다 적다`,
      );
    }
    if (q.koMeaning && question.ko === undefined) {
      fail(`${at}.ko`, "질문의 한국어 뜻이 없다");
    }
  });
  const task = content.pictureTask;
  if ((task !== undefined) !== (spec.pictureTask !== undefined)) {
    fail(
      "content.pictureTask",
      spec.pictureTask
        ? "그림 보고 말하기 과제가 없다"
        : "이 단계에는 그림 보고 말하기 과제가 없다",
    );
  } else if (task && spec.pictureTask) {
    if (!inRange(task.images.length, spec.pictureTask.images)) {
      fail(
        "content.pictureTask.images",
        `그림 ${task.images.length}장이 ${rangeText(spec.pictureTask.images)}장 밖이다`,
      );
    }
    if (task.scene.trim() === "")
      fail("content.pictureTask.scene", "장면 설명이 비었다");
  }
  task?.images.forEach((key, i) => {
    if (!index.images.has(key)) {
      report(
        "image",
        `content.pictureTask.images.${i}`,
        `그림 키 ${key} 가 그림 카탈로그에 없다`,
      );
    }
  });
  const presentation = content.presentation;
  if ((presentation !== undefined) !== (spec.presentation !== undefined)) {
    fail(
      "content.presentation",
      spec.presentation
        ? "발표 주제 · 쓸 말 · 예비 확인 질문이 없다"
        : "이 단계에는 발표가 없다",
    );
  } else if (presentation && spec.presentation) {
    if (presentation.prepWords.length !== spec.presentation.prepWords) {
      fail(
        "content.presentation.prepWords",
        `쓸 말 ${presentation.prepWords.length}개가 ${spec.presentation.prepWords}개와 다르다`,
      );
    }
    if (
      presentation.fallbackQuestions.length !==
      spec.presentation.confirmQuestions
    ) {
      fail(
        "content.presentation.fallbackQuestions",
        `예비 확인 질문 ${presentation.fallbackQuestions.length}개가 ${spec.presentation.confirmQuestions}개와 다르다`,
      );
    }
  }
}

// ── 칸 하나 ──────────────────────────────────────────────────────

export type CheckedArea = Exclude<Area, "talk">;

/**
 * 읽기 · 쓰기 · 말하기 수업 칸 하나를 검사한다(plan-p04b 칸 검사 세 표). 회화 카드는 P4c 의 checkTalkCard 가 본다.
 * 결과는 `{ rule, severity, message, file, cell, path }` 목록이고 경로는 수업 객체 기준이다.
 */
export function checkLessonCell<A extends CheckedArea>(
  lesson: LessonOf[A],
  ctx: LessonCellContext & { area: A },
): SeedIssue[] {
  const out: SeedIssue[] = [];
  const report = reporter(out, ctx, lessonCell(ctx, lesson));
  if (!ctx.index.ready) {
    report(
      "reference-not-ready",
      "",
      "규격 파일(설정값 · 단계 규격 · 단원 규격 · vocab)이 깨져 칸 검사를 건너뛴다",
    );
    return out;
  }
  const spec = ctx.index.levelSpec(ctx.area, ctx.level);
  if (!spec || spec.area !== ctx.area) {
    report(
      "layout",
      "kind",
      `${ctx.area} ${ctx.level}단계 규격이 없다(규격 파일)`,
    );
    return out;
  }
  const fragments = textsOfLesson(ctx.area, lesson);
  const composition =
    ctx.area === "writing" &&
    (lesson as WritingLesson).content.shape === "composition";
  out.push(
    ...checkLessonCommon(lesson, ctx, {
      fragments,
      englishRoles: ENGLISH_ROLES,
      allocationRoles: composition ? COMPOSITION_ALLOCATION_ROLES : undefined,
    }),
  );
  switch (spec.area) {
    case "reading":
      checkReading(lesson as ReadingLesson, spec, ctx, report);
      break;
    case "writing":
      checkWriting(lesson as WritingLesson, spec, ctx, report);
      break;
    case "speaking":
      checkSpeaking(lesson as SpeakingLesson, spec, ctx, report);
      break;
  }
  return out;
}
