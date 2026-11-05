// 가르치는 수업 칸 검사(델타 spec 2026-10-29 가르치고 배우는 수업 설계 6 · 7, 6.4 새 행). teach 가 있는 읽기 · 쓰기 · 말하기 수업에
// 자리 꼴 · 선생님 줄 길이 · 설명 시간 합 · 문법 용어 · 짝 · '왜' · 목표 · 선생님 이름 · 읽기 짝 글의 어휘 범위 · 말하기 답 한 문장을 건다.
// 수업 글과 같은 학습 요소 범위 · 금지어 검사는 글 조각(schema/lesson.ts textsOfLesson)이 teach · 짝 칸을 내어 check-lesson 이 건다.
// 숫자는 설정값(lesson.* · speech.*)과 structure.ts 상수에서 읽는다. 판정에 AI 를 쓰지 않는 순수 함수다.
// check-lesson 이 이 모듈을 부르므로 여기서는 check-lesson 을 가져오지 않는다(가져오기 순환 금지).

import { teacherNameHits } from "@/core/seed/check-teacher";
import type { Report } from "@/core/seed/issue";
import type { ReferenceIndex } from "@/core/seed/reference-index";
import type {
  GoalRef,
  ReadingLesson,
  SpeakingLesson,
  TeachChip,
  TeachModel,
  WritingLesson,
} from "@/core/seed/schema/lesson";
import type { Range, UnitGoal } from "@/core/seed/schema/reference";
import {
  type Area,
  ASK_ROLE_LEVELS,
  bandKey,
  bandOf,
  GOAL_AREA_PREFIX,
  GRAMMAR_TERMS_FILE,
  OLD_TEACHER_NAMES,
  RECAP_MASTERY_PHRASES,
  SPARE_ACCEPTED_MIN,
  SPARE_ACCEPTED_UNTIL_LEVEL,
  STORY_FREE_WORDS,
  STORY_QUESTION_LEVELS,
  STORY_QUESTION_UNITS_MAX,
  type TextFragment,
  type TextRole,
  WHY_REQUIRED_UNTIL_LEVEL,
} from "@/core/seed/structure";
import {
  glossaryMissing,
  normalizeQuotes,
  offbandRatio,
  placeholdersIn,
  resolveWord,
  sentenceWords,
  splitSentences,
  tokenize,
  wordIdsIn,
} from "@/core/seed/text";
import { checkMeaning, meaningFrame } from "@/core/speaking/meaning";

/** 가르치는 수업 검사가 읽는 설정 키(델타 spec 설계 12). 구간 키는 `<머리>.<구간>` 으로 편다. */
export const TEACH_SETTING_KEYS = {
  lineMaxChars: "lesson.teacher_line_max_chars",
  lineMaxSentences: "lesson.line_max_sentences",
  modelsPerLesson: "lesson.models_per_lesson",
  togetherItems: "lesson.together_items",
  spareTextMaxWords: "lesson.spare_text_max_words",
  teachSecondsMax: "lesson.teach_seconds_max",
  speakCpsKo: "speech.speak_chars_per_second_ko",
  speakCps: "speech.speak_chars_per_second",
  recapMinEvidence: "lesson.recap_min_evidence",
  goalsRequiredLevels: "seed.goals_required_levels",
  slotSecondsMax: "lesson.slot_seconds_max",
  sparesPerSession: "lesson.spares_per_session",
} as const;
/** 자리별 시간 상한의 자리(설계 12 lesson.slot_seconds_max.<자리>, settings.json 에 펼쳐 적음). */
export const TEACH_SLOTS = [
  "today",
  "show",
  "together",
  "spare",
  "recap",
] as const;

export type TeachArea = Exclude<Area, "talk">;
export type TeachLesson = ReadingLesson | WritingLesson | SpeakingLesson;

export type TeachContext = {
  area: TeachArea;
  level: number;
  unit: number;
  index: ReferenceIndex;
  /** 그 수업의 글 조각(경로는 수업 객체 기준). 토리가 수업 글의 등장인물인지 볼 때 쓴다. */
  fragments: readonly TextFragment[];
};

/** 수업 글(지문 · 문장 · 대본 · 이야기)로 보는 role — '토리'가 등장인물로 나오는지 볼 자리(설계 7 '선생님 이름'). */
const STORY_ROLES: readonly TextRole[] = [
  "passage",
  "script",
  "story",
  "example",
  "prompt",
  "answer",
  "option",
];
const HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/;
const HANGUL_ALL = /[가-힣ᄀ-ᇿ㄰-㆏]/g;
const LATIN_OR_DIGIT_ALL = /[A-Za-z0-9]/g;
const WHITESPACE_ALL = /\s/g;
const CHUNK_MARK = "/";
/** 말하기 과제 유형 코드(평가 spec 2절 tasks · 단계 평가 SPEAKING_TEST_TYPES 와 같은 값). */
const LISTENING_TASK = "listening";
const QUESTION_TASK = "question";
const REPEAT_TASK = "repeat";
/** 빈칸(밑줄 셋 이상) 모두. */
const BLANKS_ALL = /_{3,}/g;
/** 정답 조각(낱말 · 문장 부호, check-lesson 의 쓰기 카드 조각과 같은 꼴). */
const ANSWER_PIECE = /[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*|[^\sA-Za-z0-9]/g;
/** '예' · '아니요'로 시작하는 바른 답(설계 7 말하기 질문 꼴). */
const YES_ANSWER = /^yes\b/i;
const NO_ANSWER = /^no\b/i;
/** Do 질문 꼴(의미 검사가 맞춘 꼴, 설계 8 끝 문장). */
const DO_QUESTION = /^(do|does|did)\b/i;
/** 읽기 사실 확인 문항 유형. */
const FACT_TYPE = "fact";
/** 서로 다른 꼴을 셀 때 지우는 글자(문장 부호). */
const FORM_PUNCTUATION = /[^a-z0-9' ]/g;
/** 시간 합을 보고에 적는 소수 자리. */
const SECONDS_DIGITS = 1;

/** 글자 맞대기용: NFC · 앞뒤 공백 · 겹친 공백 · 대소문자를 고른 꼴. */
function norm(text: string): string {
  return text.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

function goalsOf(goal: GoalRef | undefined): string[] {
  if (goal === undefined) return [];
  return typeof goal === "string" ? [goal] : goal;
}

// ── 설정값 ───────────────────────────────────────────────────────

type TeachSettings = {
  num(key: string): number | undefined;
  range(key: string): Range | undefined;
  /** 수 목록(단계 목록 등). */
  list(key: string): readonly number[] | undefined;
};

/** 설정값 읽기. 없거나 꼴이 틀리면 그 키로 한 번만 `settings` 오류를 낸다(설정 키는 선택 키라 정합 검사가 잡지 않는다). */
function teachSettings(index: ReferenceIndex, report: Report): TeachSettings {
  const reported = new Set<string>();
  const missing = (key: string, what: string) => {
    if (reported.has(key)) return;
    reported.add(key);
    report(
      "settings",
      "teach",
      `설정값 ${key} 가 없거나 ${what}가 아니다(델타 spec 설계 12)`,
    );
  };
  return {
    num(key) {
      const value = index.setting(key);
      if (typeof value === "number") return value;
      missing(key, "수");
      return undefined;
    },
    range(key) {
      const value = index.setting(key);
      if (
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === "number" &&
        typeof value[1] === "number"
      )
        return { min: value[0], max: value[1] };
      missing(key, "[하한, 상한] 수 목록");
      return undefined;
    },
    list(key) {
      const value = index.setting(key);
      if (
        Array.isArray(value) &&
        value.every((v): v is number => typeof v === "number")
      )
        return value;
      missing(key, "수 목록");
      return undefined;
    },
  };
}

// ── 수업을 고른 꼴로 펴기 ────────────────────────────────────────

/** 칸 경로와 글. */
type Line = { path: string; text: string };
/** 채점되는 혼자 문항 하나(따라 말하기 낱말 · 문장은 따로). */
type SoloItem = {
  path: string;
  /** 과제 유형(목표 tasks 와 맞대는 값: 읽기 문항 type · 쓰기 문항 type · listening · question). */
  task: string;
  goal: GoalRef | undefined;
  whyKo: string | undefined;
  /** 자극 글(짝 · 자리 맞대기). */
  stimuli: string[];
  /** 정답 글(retryHighlight 가 품어야 하는 것). */
  answer?: string;
  /** retryHighlight 를 둘 문항이면 그 글과 바탕(지문 · 대본). */
  retry?: { highlight: string | undefined; source: string };
  spare?: SpareItem;
};
type SpareItem = {
  path: string;
  whyKo: string | undefined;
  /** 짝의 자극 글과 그 칸 경로. */
  stimuli: Line[];
};
type TogetherItem = { path: string; stimuli: string[] };
type TeachView = {
  goals: readonly string[];
  todayKo: string;
  todayEn?: string;
  models: readonly TeachModel[];
  together: TogetherItem[];
  /** 같이 해 보기의 선생님 줄(lineKo · rightKo · wrongKo). */
  togetherLines: { path: string; text: string }[];
  recap: {
    frameEn: string;
    chips: readonly TeachChip[];
    closeKo: string;
    closeKoPracticed: string;
  };
  solo: SoloItem[];
};

function answerOf(options: readonly string[], answerNo: number): string {
  return options[answerNo - 1] ?? "";
}

function togetherLines(
  path: string,
  item: { lineKo?: string; rightKo: string; wrongKo: string },
): { path: string; text: string }[] {
  return [
    ...(item.lineKo !== undefined
      ? [{ path: `${path}.lineKo`, text: item.lineKo }]
      : []),
    { path: `${path}.rightKo`, text: item.rightKo },
    { path: `${path}.wrongKo`, text: item.wrongKo },
  ];
}

function readingView(lesson: ReadingLesson): TeachView | undefined {
  const teach = lesson.teach;
  if (!teach) return undefined;
  const passage = lesson.content.passage;
  return {
    ...teach,
    together: teach.together.map((t, i) => ({
      path: `teach.together.${i}`,
      stimuli: [t.textEn, t.prompt],
    })),
    togetherLines: teach.together.flatMap((t, i) =>
      togetherLines(`teach.together.${i}`, t),
    ),
    solo: lesson.content.questions.map((q, i) => {
      const path = `content.questions.${i}`;
      return {
        path,
        task: q.type,
        goal: q.goal,
        whyKo: q.whyKo,
        stimuli: [q.prompt],
        answer: answerOf(q.options, q.answerNo),
        retry: { highlight: q.retryHighlight, source: passage },
        ...(q.spare
          ? {
              spare: {
                path: `${path}.spare`,
                whyKo: q.spare.whyKo,
                stimuli: [
                  { path: `${path}.spare.textEn`, text: q.spare.textEn },
                  { path: `${path}.spare.prompt`, text: q.spare.prompt },
                ],
              },
            }
          : {}),
      };
    }),
  };
}

function writingView(lesson: WritingLesson): TeachView | undefined {
  const teach = lesson.teach;
  if (!teach) return undefined;
  const content = lesson.content;
  return {
    ...teach,
    together: teach.together.map((t, i) => ({
      path: `teach.together.${i}`,
      stimuli: [t.accepted[0] ?? ""],
    })),
    togetherLines: teach.together.flatMap((t, i) =>
      togetherLines(`teach.together.${i}`, t),
    ),
    solo:
      content.shape === "items"
        ? content.items.map((item, i) => {
            const path = `content.items.${i}`;
            return {
              path,
              task: item.type,
              goal: item.goal,
              whyKo: item.whyKo,
              stimuli: [item.accepted[0] ?? ""],
              ...(item.spare
                ? {
                    spare: {
                      path: `${path}.spare`,
                      whyKo: item.spare.whyKo,
                      stimuli: [
                        {
                          path: `${path}.spare.accepted.0`,
                          text: item.spare.accepted[0] ?? "",
                        },
                      ],
                    },
                  }
                : {}),
            };
          })
        : [],
  };
}

function speakingView(lesson: SpeakingLesson): TeachView | undefined {
  const teach = lesson.teach;
  if (!teach) return undefined;
  const { listening, questions } = lesson.content;
  const listen: SoloItem[] = listening.map((item, i) => {
    const path = `content.listening.${i}`;
    return {
      path,
      task: LISTENING_TASK,
      goal: item.goal,
      whyKo: item.whyKo,
      stimuli: [
        item.script,
        ...(item.kind === "text" && item.prompt ? [item.prompt] : []),
      ],
      answer: answerOf(item.options, item.answerNo),
      retry: { highlight: item.retryHighlight, source: item.script },
      ...(item.spare
        ? {
            spare: {
              path: `${path}.spare`,
              whyKo: item.spare.whyKo,
              stimuli: [
                { path: `${path}.spare.script`, text: item.spare.script },
                ...(item.spare.kind === "text" && item.spare.prompt
                  ? [{ path: `${path}.spare.prompt`, text: item.spare.prompt }]
                  : []),
              ],
            },
          }
        : {}),
    };
  });
  const ask: SoloItem[] = questions.map((q, i) => {
    const path = `content.questions.${i}`;
    return {
      path,
      task: QUESTION_TASK,
      goal: q.goal,
      whyKo: q.whyKo,
      stimuli: [...(q.storyEn ? [q.storyEn] : []), q.en],
      ...(q.spare
        ? {
            spare: {
              path: `${path}.spare`,
              whyKo: q.spare.whyKo,
              stimuli: [
                { path: `${path}.spare.storyEn`, text: q.spare.storyEn },
                { path: `${path}.spare.en`, text: q.spare.en },
              ],
            },
          }
        : {}),
    };
  });
  return {
    ...teach,
    together: teach.together.map((t, i) => ({
      path: `teach.together.${i}`,
      stimuli: [...(t.storyEn ? [t.storyEn] : []), t.en],
    })),
    togetherLines: teach.together.flatMap((t, i) =>
      togetherLines(`teach.together.${i}`, t),
    ),
    solo: [...listen, ...ask],
  };
}

/** 따라 말하기 낱말 · 문장 자극과 그 짝(같은 차례). */
function repeatStimuli(lesson: TeachLesson): {
  items: string[];
  spares: string[];
} {
  if (!("repeat" in lesson.content)) return { items: [], spares: [] };
  const repeat = (lesson as SpeakingLesson).content.repeat;
  return {
    items: [...repeat.words, ...repeat.sentences],
    spares: [
      ...(repeat.spares?.words ?? []),
      ...(repeat.spares?.sentences ?? []),
    ],
  };
}

// ── 선생님 줄 ────────────────────────────────────────────────────

/** 선생님 한국어 줄(설계 7 '선생님 줄 길이' 칸 목록): todayKo · lineKo · whyKo · rightKo · wrongKo · closeKo · closeKoPracticed. */
function teacherLines(view: TeachView): Line[] {
  const lines: Line[] = [{ path: "teach.todayKo", text: view.todayKo }];
  view.models.forEach((m, i) => {
    lines.push({ path: `teach.models.${i}.lineKo`, text: m.lineKo });
  });
  lines.push(...view.togetherLines);
  lines.push(
    { path: "teach.recap.closeKo", text: view.recap.closeKo },
    {
      path: "teach.recap.closeKoPracticed",
      text: view.recap.closeKoPracticed,
    },
  );
  for (const s of view.solo) {
    if (s.whyKo !== undefined)
      lines.push({ path: `${s.path}.whyKo`, text: s.whyKo });
    if (s.spare?.whyKo !== undefined)
      lines.push({ path: `${s.spare.path}.whyKo`, text: s.spare.whyKo });
  }
  return lines;
}

function chipLines(view: TeachView): Line[] {
  const out: Line[] = [];
  const add = (path: string, chips: readonly TeachChip[]) => {
    chips.forEach((chip, j) => {
      out.push({ path: `${path}.${j}.text`, text: chip.text });
      if (chip.from !== undefined)
        out.push({ path: `${path}.${j}.from`, text: chip.from });
    });
  };
  view.models.forEach((m, i) => {
    add(`teach.models.${i}.chips`, m.chips);
  });
  add("teach.recap.chips", view.recap.chips);
  return out;
}

/** 줄의 글자 수(빈칸 뺌, 설계 12 lesson.teacher_line_max_chars). */
export function lineChars(text: string): number {
  return text.replace(WHITESPACE_ALL, "").length;
}

/** 선생님이 읽을 글의 추정 시간(초): 한글 글자 ÷ 한국어 빠르기 + 영문자 · 숫자 ÷ 영어 빠르기. */
export function speakSeconds(
  text: string | undefined,
  cps: { ko: number; en: number },
): number {
  if (text === undefined) return 0;
  const ko = text.match(HANGUL_ALL)?.length ?? 0;
  const en = text.match(LATIN_OR_DIGIT_ALL)?.length ?? 0;
  return ko / cps.ko + en / cps.en;
}

/**
 * 문법 용어가 글에 있는가(설계 7). 한국어 낱말은 앞 글자가 한글이 아니어야 낱말 머리로 보고(뒤에는 조사가 붙는다),
 * 영어 글자가 섞인 용어는 대소문자를 가리지 않는다. fromLevel 이 있고 그 단계 이상이면 받는다.
 */
export function grammarTermHits(
  text: string,
  terms: readonly {
    term: string;
    fromLevel?: number;
    exceptions?: readonly string[];
  }[],
  level: number,
): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const { term, fromLevel, exceptions = [] } of terms) {
    if (fromLevel !== undefined && level >= fromLevel) continue;
    const needle = term.toLowerCase();
    let at = lower.indexOf(needle);
    while (at >= 0) {
      const rest = lower.slice(at);
      const ordinary = exceptions.some((e) => rest.startsWith(e.toLowerCase()));
      if (!ordinary && (at === 0 || !HANGUL.test(lower.charAt(at - 1)))) {
        hits.push(term);
        break;
      }
      at = lower.indexOf(needle, at + 1);
    }
  }
  return hits;
}

// ── 검사 ─────────────────────────────────────────────────────────

function checkLayout(
  view: TeachView,
  ctx: TeachContext,
  settings: TeachSettings,
  report: Report,
): void {
  const band = bandOf(ctx.level);
  const models = settings.range(TEACH_SETTING_KEYS.modelsPerLesson);
  if (
    models &&
    (view.models.length < models.min || view.models.length > models.max)
  ) {
    report(
      "teach-layout",
      "teach.models",
      `본보기 ${view.models.length}개가 ${models.min}~${models.max}개(${TEACH_SETTING_KEYS.modelsPerLesson}) 밖이다`,
    );
  }
  const togetherKey = bandKey(TEACH_SETTING_KEYS.togetherItems, band);
  const together = settings.num(togetherKey);
  if (together !== undefined && view.together.length !== together) {
    report(
      "teach-layout",
      "teach.together",
      `같이 해 보기 ${view.together.length}개가 ${together}개(${togetherKey})와 다르다`,
    );
  }
  // 채점 문항은 같이 해 보기 · 혼자 문항 · 짝 가운데 한 곳에만(같은 자극 묶음이 두 자리에 있으면 막는다).
  const places = new Map<string, string>();
  const place = (path: string, stimuli: readonly string[]) => {
    const key = stimuli.map(norm).join(" | ");
    const first = places.get(key);
    if (first === undefined) places.set(key, path);
    else
      report(
        "teach-layout",
        path,
        `같은 문항이 ${first} 에도 있다 — 채점 문항은 같이 해 보기 · 혼자 문항 · 짝 가운데 한 곳에만 둔다`,
      );
  };
  for (const t of view.together) place(t.path, t.stimuli);
  for (const s of view.solo) place(s.path, s.stimuli);
  for (const s of view.solo)
    if (s.spare)
      place(
        s.spare.path,
        s.spare.stimuli.map((x) => x.text),
      );
}

function checkLines(
  view: TeachView,
  ctx: TeachContext,
  settings: TeachSettings,
  report: Report,
): void {
  const maxChars = settings.num(TEACH_SETTING_KEYS.lineMaxChars);
  const maxSentences = settings.num(TEACH_SETTING_KEYS.lineMaxSentences);
  const lines = teacherLines(view);
  for (const line of lines) {
    const chars = lineChars(line.text);
    if (maxChars !== undefined && chars > maxChars) {
      report(
        "teacher-line",
        line.path,
        `선생님 줄 ${chars}자(빈칸 뺌)가 ${maxChars}자(${TEACH_SETTING_KEYS.lineMaxChars})를 넘는다: ${line.text}`,
      );
    }
    const sentences = splitSentences(line.text).length;
    if (maxSentences !== undefined && sentences > maxSentences) {
      report(
        "teacher-line",
        line.path,
        `선생님 줄 ${sentences}문장이 ${maxSentences}문장(${TEACH_SETTING_KEYS.lineMaxSentences})을 넘는다: ${line.text}`,
      );
    }
  }
  // 문법 용어(선생님 말 칸 · 칩 글)
  const terms = ctx.index.grammarTerms;
  if (!terms) {
    report(
      "grammar-term",
      "teach",
      `문법 용어 목록 ${GRAMMAR_TERMS_FILE} 이 없어 선생님 말을 볼 수 없다`,
    );
  } else {
    for (const line of [...lines, ...chipLines(view)]) {
      const hits = grammarTermHits(line.text, terms.terms, ctx.level);
      if (hits.length > 0)
        report(
          "grammar-term",
          line.path,
          `문법 용어 ${hits.map((h) => `'${h}'`).join(" · ")} 가 있다(${GRAMMAR_TERMS_FILE}): ${line.text}`,
        );
    }
  }
  // 선생님 이름 · 틀 자리(설계 7 '선생님 이름' 넓힘). '토리'는 수업 글에 등장인물로 나오면 받는다.
  const tori = ctx.fragments.some(
    (f) =>
      STORY_ROLES.includes(f.role) &&
      OLD_TEACHER_NAMES.en.some((name) =>
        tokenize(f.text).some((t) => t.text === name),
      ),
  );
  const oldNames = new Set<string>([
    ...OLD_TEACHER_NAMES.en,
    ...OLD_TEACHER_NAMES.ko,
  ]);
  for (const line of lines) {
    const hits = teacherNameHits(line.text, ctx.index.teacherNames).filter(
      (h) => !(tori && oldNames.has(h)),
    );
    const holes = placeholdersIn(line.text);
    if (hits.length > 0 || holes.length > 0)
      report(
        "teacher-name",
        line.path,
        `선생님 말에 ${[...hits, ...holes].map((h) => `'${h}'`).join(" · ")} 이 있다 — 선생님 말에는 명단 이름 · {TEACHER} · {NAME} 을 두지 않는다(설계 7)`,
      );
  }
}

function checkSeconds(
  view: TeachView,
  ctx: TeachContext,
  settings: TeachSettings,
  report: Report,
): void {
  const maxKey = bandKey(TEACH_SETTING_KEYS.teachSecondsMax, bandOf(ctx.level));
  const max = settings.num(maxKey);
  const ko = settings.num(TEACH_SETTING_KEYS.speakCpsKo);
  const en = settings.num(TEACH_SETTING_KEYS.speakCps);
  if (max === undefined || ko === undefined || en === undefined) return;
  if (ko <= 0 || en <= 0) return;
  const cps = { ko, en };
  const s = (text: string | undefined) => speakSeconds(text, cps);
  let total = s(view.todayKo) + s(view.todayEn);
  for (const m of view.models)
    total +=
      s(m.lineKo) +
      s(m.en) +
      s(m.storyEn) +
      s(m.questionEn) +
      s(m.wordAnswerEn) +
      s(m.fromEn);
  total +=
    s(view.recap.frameEn) +
    Math.max(s(view.recap.closeKo), s(view.recap.closeKoPracticed));
  if (total > max) {
    report(
      "teach-seconds",
      "teach",
      `오늘 배울 것 · 보여 주기 · 되짚기의 선생님 글 추정 ${total.toFixed(SECONDS_DIGITS)}초가 ${max}초(${maxKey})를 넘는다`,
    );
  }
}

function checkSpares(
  view: TeachView,
  lesson: TeachLesson,
  ctx: TeachContext,
  settings: TeachSettings,
  report: Report,
): void {
  // 본보기 · 같이 해 보기와 같은 글은 checkDiffer(teach-differ)가 한 번 낸다.
  const others = new Set<string>();
  for (const s of view.solo) for (const x of s.stimuli) others.add(norm(x));
  const repeat = repeatStimuli(lesson);
  for (const x of repeat.items) others.add(norm(x));
  const spareSeen = new Map<string, string>();
  const checkSpareText = (path: string, text: string) => {
    const key = norm(text);
    if (others.has(key)) {
      report(
        "spare",
        path,
        `짝의 글 '${text}' 이 혼자 문항 · 따라 말하기의 자극과 같다`,
      );
    }
    const first = spareSeen.get(key);
    if (first !== undefined && first !== path)
      report("spare", path, `짝의 글 '${text}' 이 다른 짝 ${first} 와 같다`);
    else spareSeen.set(key, path);
  };
  for (const s of view.solo) {
    if (!s.spare) {
      report("spare", s.path, "채점되는 혼자 문항에 짝(spare)이 없다");
      continue;
    }
    for (const x of s.spare.stimuli) checkSpareText(x.path, x.text);
  }
  // 따라 말하기 짝(같은 차례 배열)
  if (ctx.area === "speaking") {
    const r = (lesson as SpeakingLesson).content.repeat;
    const has = r.words.length + r.sentences.length > 0;
    if (has && !r.spares) {
      report(
        "spare",
        "content.repeat.spares",
        "따라 말하기 낱말 · 문장에 짝(spares)이 없다",
      );
    } else if (r.spares) {
      if (r.spares.words.length !== r.words.length)
        report(
          "spare",
          "content.repeat.spares.words",
          `따라 말할 낱말 짝 ${r.spares.words.length}개가 낱말 ${r.words.length}개와 다르다`,
        );
      if (r.spares.sentences.length !== r.sentences.length)
        report(
          "spare",
          "content.repeat.spares.sentences",
          `따라 말할 문장 짝 ${r.spares.sentences.length}개가 문장 ${r.sentences.length}개와 다르다`,
        );
      r.spares.words.forEach((w, i) => {
        checkSpareText(`content.repeat.spares.words.${i}`, w);
      });
      r.spares.sentences.forEach((w, i) => {
        checkSpareText(`content.repeat.spares.sentences.${i}`, w);
      });
    }
  }
  // 읽기 짝 글 길이 · 범위
  if (ctx.area === "reading") {
    const reading = lesson as ReadingLesson;
    const key = bandKey(
      TEACH_SETTING_KEYS.spareTextMaxWords,
      bandOf(ctx.level),
    );
    const max = settings.num(key);
    reading.content.questions.forEach((q, i) => {
      if (!q.spare || max === undefined) return;
      const words = sentenceWords(q.spare.textEn);
      if (words > max)
        report(
          "spare",
          `content.questions.${i}.spare.textEn`,
          `읽기 짝 글 ${words}낱말이 ${max}낱말(${key})을 넘는다`,
        );
    });
  }
  // 말하기 질문 짝의 허용 답 셋 이상(서로 다른 꼴)은 checkSpeakingQuestions 가 본다.
}

function checkWhy(
  view: TeachView,
  lesson: TeachLesson,
  ctx: TeachContext,
  report: Report,
): void {
  if (ctx.level <= WHY_REQUIRED_UNTIL_LEVEL) {
    for (const s of view.solo) {
      if (s.whyKo === undefined)
        report(
          "why",
          `${s.path}.whyKo`,
          `${WHY_REQUIRED_UNTIL_LEVEL}단계까지 채점 문항에는 '왜' 한 줄(whyKo)이 있어야 한다`,
        );
      if (s.spare && s.spare.whyKo === undefined)
        report(
          "why",
          `${s.spare.path}.whyKo`,
          `${WHY_REQUIRED_UNTIL_LEVEL}단계까지 짝에는 '왜' 한 줄(whyKo)이 있어야 한다`,
        );
    }
  }
  for (const s of view.solo) {
    if (!s.retry) continue;
    const at = `${s.path}.retryHighlight`;
    const highlight = s.retry.highlight;
    if (highlight === undefined) {
      report("why", at, "다시 볼 자리(retryHighlight)가 없다");
      continue;
    }
    if (!norm(s.retry.source).includes(norm(highlight)))
      report(
        "why",
        at,
        `다시 볼 자리 '${highlight}' 가 지문 · 대본 안의 글이 아니다`,
      );
    if (s.answer && !norm(highlight).includes(norm(s.answer)))
      report(
        "why",
        at,
        `다시 볼 자리 '${highlight}' 에 정답 '${s.answer}' 이 없다`,
      );
  }
  if (ctx.area === "speaking") {
    const r = (lesson as SpeakingLesson).content.repeat;
    if (r.sentences.length === 0) return;
    if (!r.chunks) {
      report(
        "why",
        "content.repeat.chunks",
        "따라 말할 문장의 끊어 들려줄 자리(chunks)가 없다",
      );
      return;
    }
    if (r.chunks.length !== r.sentences.length)
      report(
        "why",
        "content.repeat.chunks",
        `끊어 들려줄 자리 ${r.chunks.length}개가 문장 ${r.sentences.length}개와 다르다`,
      );
    r.chunks.forEach((chunk, i) => {
      const sentence = r.sentences[i];
      if (sentence === undefined) return;
      const joined = chunk
        .split(CHUNK_MARK)
        .map((part) => part.trim())
        .join(" ");
      if (norm(joined) !== norm(sentence))
        report(
          "why",
          `content.repeat.chunks.${i}`,
          `'${chunk}' 의 덩어리를 이으면 문장 '${sentence}' 이 되지 않는다`,
        );
    });
  }
}

function checkGoals(
  view: TeachView,
  lesson: TeachLesson,
  ctx: TeachContext,
  settings: TeachSettings,
  report: Report,
): void {
  const pattern = new RegExp(
    `^${GOAL_AREA_PREFIX[ctx.area]}-${ctx.level}-${ctx.unit}-[1-9][0-9]*$`,
  );
  view.goals.forEach((goal, i) => {
    if (!pattern.test(goal))
      report(
        "goal",
        `teach.goals.${i}`,
        `목표 ID ${goal} 가 ${GOAL_AREA_PREFIX[ctx.area]}-${ctx.level}-${ctx.unit}-<n> 꼴이 아니다`,
      );
  });
  const known = new Set(view.goals);
  const checkGoal = (path: string, goal: GoalRef | undefined) => {
    const list = goalsOf(goal);
    if (list.length === 0) {
      report("goal", `${path}.goal`, "혼자 문항에 닿는 목표(goal)가 없다");
      return;
    }
    for (const id of list)
      if (!known.has(id))
        report(
          "goal",
          `${path}.goal`,
          `목표 ${id} 가 이 수업의 teach.goals 에 없다`,
        );
  };
  for (const s of view.solo) checkGoal(s.path, s.goal);
  const repeatItems: {
    path: string;
    task: string;
    goal: GoalRef | undefined;
  }[] = [];
  if (ctx.area === "speaking") {
    const r = (lesson as SpeakingLesson).content.repeat;
    if (r.words.length + r.sentences.length > 0) {
      checkGoal("content.repeat", r.goal);
      repeatItems.push({
        path: "content.repeat",
        task: REPEAT_TASK,
        goal: r.goal,
      });
    }
  }
  // 단원 목표 대조(필수, 요청자 C177 (5)): teach.goals 는 그 단원 unit-specs goals 의 id 안이고(혼자 문항 goal 은 위에서
  // teach.goals 안이므로 함께 닫힌다), 이어진 목표마다 과제 유형이 그 목표의 tasks 안이다. seed.goals_required_levels 단계는
  // 단원 목표가 비면 막는다.
  const unitGoals = unitGoalsOf(ctx);
  // 키가 없으면 기본값 없이 settings 오류(M2).
  const required = settings.list(TEACH_SETTING_KEYS.goalsRequiredLevels);
  if (unitGoals.size === 0) {
    if (required?.includes(ctx.level))
      report(
        "goal",
        "teach.goals",
        `${ctx.level}단계는 단원 목표가 있어야 하는데(seed.goals_required_levels) unit-specs 의 이 단원에 goals 가 없다`,
      );
    return;
  }
  view.goals.forEach((goal, i) => {
    // 꼴이 틀린 id 는 위에서 한 건 냈다.
    if (pattern.test(goal) && !unitGoals.has(goal))
      report(
        "goal",
        `teach.goals.${i}`,
        `목표 ${goal} 가 이 단원의 unit-specs goals [${[...unitGoals.keys()].join(", ")}] 에 없다`,
      );
  });
  for (const item of [...view.solo, ...repeatItems]) {
    for (const id of goalsOf(item.goal)) {
      const goal = unitGoals.get(id);
      if (goal && !goal.tasks.includes(item.task))
        report(
          "goal",
          `${item.path}.goal`,
          `과제 유형 ${item.task} 가 목표 ${id} 의 tasks [${goal.tasks.join(", ")}] 밖이다`,
        );
    }
  }
}

/** 그 단원의 unit-specs 목표(id → 목표). */
function unitGoalsOf(ctx: TeachContext): Map<string, UnitGoal> {
  const goals = ctx.index.unitSpec(ctx.area, ctx.level, ctx.unit)?.goals ?? [];
  return new Map(goals.map((g) => [g.id, g]));
}

/** 서로 다른 꼴로 셀 답(대소문자 · 문장 부호 · 겹친 빈칸을 고름). */
function answerForm(text: string): string {
  return norm(normalizeQuotes(text))
    .replace(FORM_PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type QuestionItem = {
  path: string;
  /** 혼자 질문 · 짝 · 같이 해 보기. */
  place: "solo" | "spare" | "together";
  storyEn?: string;
  en: string;
  modelAnswer?: string;
  goal?: GoalRef;
  accepted?: readonly string[];
  acceptedMeaning?: readonly string[];
};

/** 낱말 하나뿐인 답은 accepted · acceptedMeaning 어디에도 두지 않는다(C175 (2), 설계 6 accepted 행). */
function singleWordAnswers(item: QuestionItem, report: Report): void {
  const single = (key: string, list: readonly string[] | undefined) => {
    list?.forEach((answer, j) => {
      if (sentenceWords(answer) === 1)
        report(
          "speaking-question",
          `${item.path}.${key}.${j}`,
          `낱말 하나뿐인 답 '${answer}' 은 허용 답으로 두지 않는다`,
        );
    });
  };
  single("accepted", item.accepted);
  single("acceptedMeaning", item.acceptedMeaning);
}

/** 이 칸이 말하기 이야기 질문 꼴(3단계 단원 1~4, AC-4c · AC-4d)을 따르는가. */
function storyQuestionScope(ctx: TeachContext): boolean {
  return (
    ctx.area === "speaking" &&
    STORY_QUESTION_LEVELS.includes(ctx.level) &&
    ctx.unit >= 1 &&
    ctx.unit <= STORY_QUESTION_UNITS_MAX
  );
}

/**
 * 말하기 질문 문항 검사(델타 spec 3판 설계 6 · 7, AC-4c · AC-4d, C177 (3) · (4)).
 * 모든 단계: accepted 와 acceptedMeaning 에 같은 꼴이 없다, expression 목표에 이은 질문은 accepted 가 있다,
 * 1~3단계 짝은 허용 답 서로 다른 꼴 셋 이상. 3단계 단원 1~4 의 혼자 질문 · 짝: storyEn 이 있고, 바른 답에서 질문에 없는 낱말
 * (no · yes · they 빼고)이 이야기에 있고, 혼자 질문 허용 답은 서로 다른 꼴 셋 이상, 낱말 하나뿐인 답이 없고, 질문 넷 가운데 '예' 하나다.
 */
function checkSpeakingQuestions(
  lesson: SpeakingLesson,
  ctx: TeachContext,
  _settings: TeachSettings,
  report: Report,
): void {
  const items: QuestionItem[] = [];
  lesson.teach?.together.forEach((t, i) => {
    items.push({ path: `teach.together.${i}`, place: "together", ...t });
  });
  lesson.content.questions.forEach((q, i) => {
    const path = `content.questions.${i}`;
    items.push({ path, place: "solo", ...q });
    if (q.spare)
      items.push({ path: `${path}.spare`, place: "spare", ...q.spare });
  });
  const unitGoals = unitGoalsOf(ctx);
  const lexicon = ctx.index.lexicon;
  const story = storyQuestionScope(ctx);
  for (const item of items) {
    const accepted = item.accepted ?? [];
    // (가) 정답 묶음과 뜻 묶음은 겹치지 않는다(앱이 높은 쪽으로 갈라 뜻만 맞은 답이 표현 근거가 되지 않게).
    const forms = new Set(accepted.map(answerForm));
    item.acceptedMeaning?.forEach((answer, j) => {
      if (forms.has(answerForm(answer)))
        report(
          "speaking-question",
          `${item.path}.acceptedMeaning.${j}`,
          `'${answer}' 가 accepted 에도 있다 — 정답 꼴과 뜻만 통하는 꼴은 겹치지 않는다`,
        );
    });
    const expression = goalsOf(item.goal).some((id) =>
      unitGoals.get(id)?.needs.includes("expression"),
    );
    if (expression && accepted.length === 0)
      report(
        "goal",
        `${item.path}.accepted`,
        "needs 에 expression 이 있는 목표에 이어진 질문 문항에 허용 답(accepted)이 없다",
      );
    if (
      item.place === "spare" &&
      ctx.level <= SPARE_ACCEPTED_UNTIL_LEVEL &&
      forms.size < SPARE_ACCEPTED_MIN
    )
      report(
        "spare",
        `${item.path}.accepted`,
        `말하기 질문 짝의 허용 답 서로 다른 꼴 ${forms.size}개가 ${SPARE_ACCEPTED_MIN}개보다 적다`,
      );
    if (!story) continue;
    // 같이 해 보기는 낱말 하나 답 검사만 받는다(설계 6 accepted 행, fix 3 N1).
    if (item.place === "together") {
      singleWordAnswers(item, report);
      continue;
    }
    if (item.storyEn === undefined) {
      report(
        "speaking-question",
        `${item.path}.storyEn`,
        "말하기 3단계 단원 1~4 질문에 질문 앞 이야기(storyEn)가 없다",
      );
    } else if (item.modelAnswer !== undefined) {
      const seen = `${item.en} ${item.storyEn}`;
      const tokens = new Set(tokenize(seen).map((t) => t.text.toLowerCase()));
      const ids = wordIdsIn(seen, lexicon);
      const missing = tokenize(item.modelAnswer)
        .filter((t) => t.kind === "word")
        .map((t) => t.text)
        .filter(
          (word) =>
            !STORY_FREE_WORDS.includes(word.toLowerCase()) &&
            !tokens.has(word.toLowerCase()) &&
            !resolveWord(word, lexicon).some((p) =>
              p.ids.some((id) => ids.has(id)),
            ),
        );
      if (missing.length > 0)
        report(
          "speaking-question",
          `${item.path}.modelAnswer`,
          `바른 답의 낱말 ${missing.join(", ")} 이 질문에도 이야기(storyEn)에도 없다 — 이야기가 답의 자극이어야 한다: ${item.modelAnswer}`,
        );
    }
    if (item.place === "solo" && forms.size < SPARE_ACCEPTED_MIN)
      report(
        "speaking-question",
        `${item.path}.accepted`,
        `허용 답의 서로 다른 꼴 ${forms.size}개가 ${SPARE_ACCEPTED_MIN}개보다 적다`,
      );
    singleWordAnswers(item, report);
  }
  if (story) {
    const answers = lesson.content.questions.map((q) => q.modelAnswer ?? "");
    const yes = answers.filter((a) => YES_ANSWER.test(a)).length;
    const no = answers.filter((a) => NO_ANSWER.test(a)).length;
    if (yes !== 1 || yes + no !== answers.length)
      report(
        "speaking-question",
        "content.questions",
        `질문 ${answers.length}개 가운데 '예'로 답하는 질문이 ${yes}개 · '아니요'가 ${no}개다 — '예' 하나, 나머지는 '아니요'여야 한다(C174)`,
      );
  }
}

/** 핵심 목표(teach.goals 첫 값)에 이어진 혼자 문항이 lesson.recap_min_evidence 보다 적으면 경고(되짚기 줄을 고를 근거가 모자람). */
function checkRecapEvidence(
  view: TeachView,
  lesson: TeachLesson,
  ctx: TeachContext,
  settings: TeachSettings,
  report: Report,
): void {
  const core = view.goals[0];
  const min = settings.num(TEACH_SETTING_KEYS.recapMinEvidence);
  if (core === undefined || min === undefined) return;
  let count = view.solo.filter((s) => goalsOf(s.goal).includes(core)).length;
  if (ctx.area === "speaking") {
    const r = (lesson as SpeakingLesson).content.repeat;
    if (goalsOf(r.goal).includes(core))
      count += r.words.length + r.sentences.length;
  }
  if (count === 0)
    report(
      "goal",
      "teach.goals.0",
      `핵심 목표 ${core}(teach.goals 첫 값)에 이어진 혼자 문항이 없다`,
    );
  else if (count < min)
    report(
      "recap-evidence",
      "teach.goals.0",
      `핵심 목표 ${core} 에 이어진 혼자 문항 ${count}개가 ${min}개(${TEACH_SETTING_KEYS.recapMinEvidence})보다 적다 — 되짚기는 늘 closeKoPracticed 가 된다`,
      "warning",
    );
}

/** 읽기 같이 해 보기 · 짝의 짧은 글도 지문과 같은 어휘 범위 밖 비율(seed.max_offband_ratio)을 받는다(설계 7 '범위(넓힘)'). */
function checkReadingOffband(
  lesson: ReadingLesson,
  ctx: TeachContext,
  report: Report,
): void {
  const max = ctx.index.num("seed.max_offband_ratio");
  const glossary = lesson.content.glossary
    .filter((g) => g.proper)
    .map((g) => g.surface);
  const check = (path: string, text: string) => {
    const ratio = offbandRatio(text, {
      lexicon: ctx.index.lexicon,
      level: ctx.level,
      newWords: lesson.newWords,
      properNouns: glossary,
    });
    const missing = glossaryMissing(
      text,
      lesson.content.glossary,
      ctx.index.lexicon,
    );
    if (missing.length > 0)
      report("glossary", path, `글로서리에 없는 표기형: ${missing.join(", ")}`);
    if (ratio > max)
      report(
        "offband",
        path,
        `어휘 범위 밖 단어 비율 ${(ratio * 100).toFixed(1)}% 가 ${(max * 100).toFixed(1)}%(seed.max_offband_ratio)를 넘는다: ${text}`,
      );
  };
  lesson.teach?.together.forEach((t, i) => {
    check(`teach.together.${i}.textEn`, t.textEn);
  });
  lesson.content.questions.forEach((q, i) => {
    if (q.spare) check(`content.questions.${i}.spare.textEn`, q.spare.textEn);
  });
}

/** 말하기 답은 단계 규격 문장 수 안(같이 해 보기 · 짝의 바른 답, 'No, they …' 는 한 문장). */
function checkSpeakingAnswers(
  lesson: SpeakingLesson,
  ctx: TeachContext,
  report: Report,
): void {
  const spec = ctx.index.levelSpec("speaking", ctx.level);
  if (spec?.area !== "speaking" || !spec.questions.answerSentences) return;
  const range = spec.questions.answerSentences;
  const check = (path: string, answer: string | undefined) => {
    if (answer === undefined) return;
    const n = splitSentences(answer).length;
    if (n < range.min || n > range.max)
      report(
        "speaking",
        path,
        `바른 답 ${n}문장이 ${range.min === range.max ? range.min : `${range.min}~${range.max}`}문장 밖이다: ${answer}`,
      );
  };
  lesson.teach?.together.forEach((t, i) => {
    check(`teach.together.${i}.modelAnswer`, t.modelAnswer);
  });
  lesson.content.questions.forEach((q, i) => {
    check(`content.questions.${i}.spare.modelAnswer`, q.spare?.modelAnswer);
  });
}

/**
 * 가르치는 수업 칸 검사(설계 7 새 행 · 넓힌 행). teach 가 없는 수업은 아무것도 내지 않는다.
 * 경로는 수업 객체 기준이다. 결과 규칙: settings · teach-layout · teacher-line · teach-seconds · grammar-term · teacher-name ·
 * spare · why · goal · offband · speaking.
 */
export function checkTeach(
  lesson: TeachLesson,
  ctx: TeachContext,
  report: Report,
): void {
  const view =
    ctx.area === "reading"
      ? readingView(lesson as ReadingLesson)
      : ctx.area === "writing"
        ? writingView(lesson as WritingLesson)
        : speakingView(lesson as SpeakingLesson);
  if (!view) return;
  const settings = teachSettings(ctx.index, report);
  checkLayout(view, ctx, settings, report);
  checkLines(view, ctx, settings, report);
  checkSeconds(view, ctx, settings, report);
  checkSpares(view, lesson, ctx, settings, report);
  checkWhy(view, lesson, ctx, report);
  checkGoals(view, lesson, ctx, settings, report);
  if (ctx.area === "reading")
    checkReadingOffband(lesson as ReadingLesson, ctx, report);
  checkRecapEvidence(view, lesson, ctx, settings, report);
  checkDiffer(lesson, ctx, report);
  checkSpareShape(lesson, ctx, report);
  checkAskRole(lesson, ctx, report);
  checkRecapLine(view, report);
  checkTogetherTypes(lesson, ctx, report);
  checkTogetherBlanks(lesson, ctx, report);
  checkSlotSeconds(view, lesson, ctx, settings, report);
  checkBlankAnswers(lesson, ctx, report);
  if (ctx.area === "speaking") {
    checkSpeakingAnswers(lesson as SpeakingLesson, ctx, report);
    checkSpeakingQuestions(lesson as SpeakingLesson, ctx, settings, report);
    checkSpeakingMeaning(lesson as SpeakingLesson, ctx, report);
  }
}

// ── fix 1(코드 검토 I1 · I2 · I5): 본보기와 다름 · 짝 꼴 · 이름표 · 되짚기 줄 · 유형 경계 · 같이 해 보기 빈칸 · 자리별 시간 ──

/** 본보기 · 같이 해 보기에서 아이가 이미 본 영어 글(설계 7 '혼자 문항과 본보기의 다름'). */
/** 글과 그 문장들의 꼴(answerForm, 빈 꼴 뺌). 끝 부호만 다른 문장도 같은 꼴이 된다(fix 3). */
function sentenceForms(text: string): string[] {
  return [text, ...splitSentences(text)]
    .map(answerForm)
    .filter((form) => form !== "");
}

function shownTexts(lesson: TeachLesson): Set<string> {
  const out = new Set<string>();
  const add = (text: string | undefined) => {
    if (text !== undefined)
      for (const form of sentenceForms(text)) out.add(form);
  };
  const teach = lesson.teach;
  if (!teach) return out;
  for (const m of teach.models) {
    add(m.en);
    add(m.storyEn);
    add(m.questionEn);
    add(m.fromEn);
  }
  for (const t of teach.together as readonly Record<string, unknown>[]) {
    for (const key of ["textEn", "en", "storyEn", "modelAnswer"])
      add(typeof t[key] === "string" ? (t[key] as string) : undefined);
    const accepted = t.accepted;
    if (Array.isArray(accepted))
      for (const a of accepted) add(typeof a === "string" ? a : undefined);
  }
  return out;
}

/** 혼자 문항 · 짝의 영어 문장과 정답(칸 경로와 글). */
function soloTexts(lesson: TeachLesson, area: TeachArea): Line[] {
  const out: Line[] = [];
  const add = (path: string, text: string | undefined) => {
    if (text !== undefined) out.push({ path, text });
  };
  const all = (path: string, list: readonly string[] | undefined) => {
    list?.forEach((text, i) => {
      add(`${path}.${i}`, text);
    });
  };
  if (area === "reading") {
    const reading = lesson as ReadingLesson;
    add("content.passage", reading.content.passage);
    reading.content.questions.forEach((q, i) => {
      const at = `content.questions.${i}`;
      add(`${at}.prompt`, q.prompt);
      add(`${at}.retryHighlight`, q.retryHighlight);
      if (q.spare) {
        add(`${at}.spare.textEn`, q.spare.textEn);
        add(`${at}.spare.prompt`, q.spare.prompt);
      }
    });
  } else if (area === "writing") {
    const content = (lesson as WritingLesson).content;
    if (content.shape === "items")
      content.items.forEach((item, i) => {
        const at = `content.items.${i}`;
        all(`${at}.accepted`, item.accepted);
        if (item.spare) all(`${at}.spare.accepted`, item.spare.accepted);
      });
  } else {
    const content = (lesson as SpeakingLesson).content;
    all("content.repeat.sentences", content.repeat.sentences);
    all("content.repeat.spares.sentences", content.repeat.spares?.sentences);
    content.listening.forEach((item, i) => {
      const at = `content.listening.${i}`;
      add(`${at}.script`, item.script);
      add(`${at}.retryHighlight`, item.retryHighlight);
      if (item.kind === "text") add(`${at}.prompt`, item.prompt);
      if (item.spare) {
        add(`${at}.spare.script`, item.spare.script);
        if (item.spare.kind === "text")
          add(`${at}.spare.prompt`, item.spare.prompt);
      }
    });
    content.questions.forEach((q, i) => {
      const at = `content.questions.${i}`;
      const one = (base: string, x: typeof q | NonNullable<typeof q.spare>) => {
        add(`${base}.storyEn`, x.storyEn);
        add(`${base}.en`, x.en);
        add(`${base}.modelAnswer`, x.modelAnswer);
        all(`${base}.accepted`, x.accepted);
      };
      one(at, q);
      if (q.spare) one(`${at}.spare`, q.spare);
    });
  }
  return out;
}

/** 혼자 문항 · 짝의 문장과 정답이 본보기 · 같이 해 보기 글과 같으면 막는다(AC-1a, 설계 1 '다 맞힌 아이는 혼자 문항이 곧 다른 예시'). */
function checkDiffer(
  lesson: TeachLesson,
  ctx: TeachContext,
  report: Report,
): void {
  // 지문 · 대본 · 짝 글 · 이야기는 문장으로 나눠 본보기 · 같이 해 보기 문장과 맞댄다(문장 부호는 고른다, fix 3).
  const shown = shownTexts(lesson);
  for (const line of soloTexts(lesson, ctx.area)) {
    const same = splitSentences(line.text).find((sentence) =>
      shown.has(answerForm(sentence)),
    );
    if (same !== undefined || shown.has(answerForm(line.text)))
      report(
        "teach-differ",
        line.path,
        `혼자 문항 · 짝의 글 '${same ?? line.text}' 이 본보기 · 같이 해 보기 글과 같다 — 혼자 문항은 다른 예시여야 한다`,
      );
  }
}

/** 짝은 그 문항과 같은 꼴이다(읽기 kind · type, 쓰기 type, 듣기 kind, 설계 6 · 7 · AC-1a). 보기 번호 · 그림 · 정답은 check-lesson 이 본다. */
function checkSpareShape(
  lesson: TeachLesson,
  ctx: TeachContext,
  report: Report,
): void {
  const same = (path: string, field: string, a: string, b: string) => {
    if (a !== b)
      report(
        "spare",
        `${path}.spare.${field}`,
        `짝의 ${field} ${b} 가 문항의 ${a} 와 다르다 — 짝은 그 문항과 같은 과제 유형이다`,
      );
  };
  if (ctx.area === "reading") {
    (lesson as ReadingLesson).content.questions.forEach((q, i) => {
      if (!q.spare) return;
      const at = `content.questions.${i}`;
      if (q.kind !== q.spare.kind || q.type !== q.spare.type)
        same(
          at,
          "type",
          `${q.kind}/${q.type}`,
          `${q.spare.kind}/${q.spare.type}`,
        );
    });
  } else if (ctx.area === "writing") {
    const content = (lesson as WritingLesson).content;
    if (content.shape === "items")
      content.items.forEach((item, i) => {
        if (item.spare)
          same(`content.items.${i}`, "type", item.type, item.spare.type);
      });
  } else {
    (lesson as SpeakingLesson).content.listening.forEach((item, i) => {
      if (item.spare)
        same(`content.listening.${i}`, "kind", item.kind, item.spare.kind);
    });
  }
}

/** 3단계 단원 1~4 의 읽기 사실 확인 · 듣기 이해 문항(짝 포함)은 빈칸 하나와 이름표(askRole)가 있다(AC-4b · C170 (5)). */
function checkAskRole(
  lesson: TeachLesson,
  ctx: TeachContext,
  report: Report,
): void {
  if (
    !ASK_ROLE_LEVELS.includes(ctx.level) ||
    ctx.unit < 1 ||
    ctx.unit > STORY_QUESTION_UNITS_MAX
  )
    return;
  const one = (path: string, item: { prompt?: string; askRole?: string }) => {
    if (item.askRole === undefined)
      report("ask-role", `${path}.askRole`, "이름표(askRole)가 없다");
    const blanks = (item.prompt ?? "").match(BLANKS_ALL)?.length ?? 0;
    if (blanks !== 1)
      report(
        "ask-role",
        `${path}.prompt`,
        `빈칸(___)이 ${blanks}개다 — 이름표 문항은 빈칸이 하나인 문장 꼴이다`,
      );
  };
  if (ctx.area === "reading") {
    (lesson as ReadingLesson).content.questions.forEach((q, i) => {
      if (q.type !== FACT_TYPE) return;
      const at = `content.questions.${i}`;
      one(at, q);
      if (q.spare) one(`${at}.spare`, q.spare);
    });
  } else if (ctx.area === "speaking") {
    (lesson as SpeakingLesson).content.listening.forEach((item, i) => {
      const at = `content.listening.${i}`;
      one(at, item);
      if (item.spare) one(`${at}.spare`, item.spare);
    });
  }
}

/** 마무리 줄 closeKoPracticed 는 숙달을 단정하지 않는다(AC-7c · C174 (5)). */
function checkRecapLine(view: TeachView, report: Report): void {
  const line = view.recap.closeKoPracticed;
  const hit = RECAP_MASTERY_PHRASES.find((p) => line.includes(p));
  if (hit !== undefined)
    report(
      "recap-line",
      "teach.recap.closeKoPracticed",
      `연습 마무리 줄에 '${hit}' 단정 꼴이 있다 — closeKoPracticed 는 배우고 연습한 것을 말한다: ${line}`,
    );
}

/** 같이 해 보기 유형이 그 단계 혼자 해 보기 유형 안이다(AC-5a, 설계 7 '유형 경계'). */
function checkTogetherTypes(
  lesson: TeachLesson,
  ctx: TeachContext,
  report: Report,
): void {
  const spec = ctx.index.levelSpec(ctx.area, ctx.level);
  const together = (lesson.teach?.together ?? []) as readonly {
    type: string;
  }[];
  let allowed: readonly string[] | undefined;
  if (spec?.area === "reading")
    allowed = Object.entries(spec.questions.mix as Record<string, number>)
      .filter(([, n]) => n > 0)
      .map(([t]) => t);
  else if (spec?.area === "writing" && spec.amount.kind === "items")
    allowed = spec.amount.itemTypes;
  else if (spec?.area === "speaking")
    allowed = spec.questions.count > 0 ? [QUESTION_TASK] : [];
  if (allowed === undefined) return;
  together.forEach((t, i) => {
    if (!allowed.includes(t.type))
      report(
        "teach-type",
        `teach.together.${i}.type`,
        `같이 해 보기 유형 ${t.type} 가 ${ctx.area} ${ctx.level}단계 문항 유형 [${allowed.join(", ")}] 밖이다`,
      );
  });
}

/** 쓰기 같이 해 보기 조립: 빈칸 수 = 남은 카드 수이고, 빈칸 자리의 정답 조각이 남은 카드다(AC-2e · C174 (3)). */
function checkTogetherBlanks(
  lesson: TeachLesson,
  ctx: TeachContext,
  report: Report,
): void {
  if (ctx.area !== "writing") return;
  (lesson as WritingLesson).teach?.together.forEach((t, i) => {
    const at = `teach.together.${i}`;
    if (!t.filled) return;
    const blanks = t.filled.cards.filter((c) => c === null).length;
    const choices = t.choices ?? [];
    if (blanks !== choices.length) {
      report(
        "teach-layout",
        `${at}.filled`,
        `빈칸 ${blanks}개와 남은 카드 ${choices.length}개가 다르다`,
      );
      return;
    }
    if (blanks === 0) return;
    const pieces =
      (t.accepted[0] ?? "").toLowerCase().match(ANSWER_PIECE) ?? [];
    if (pieces.length !== t.filled.cards.length) {
      report(
        "teach-layout",
        `${at}.filled`,
        `채운 카드 ${t.filled.cards.length}칸이 정답 조각 ${pieces.length}개와 맞지 않는다`,
      );
      return;
    }
    const need = pieces.filter((_, j) => t.filled?.cards[j] === null).sort();
    const have = choices.map((c) => c.toLowerCase()).sort();
    if (need.join(" ") !== have.join(" "))
      report(
        "teach-layout",
        `${at}.choices`,
        `남은 카드 [${choices.join(", ")}] 가 빈칸에 들어갈 정답 카드 [${need.join(", ")}] 와 다르다`,
      );
  });
}

/** 자리별 시간 추정이 lesson.slot_seconds_max.<자리> 를 넘으면 경고(설계 7 '설명 시간 합' 둘째 문장, 아이를 끊지 않음). */
function checkSlotSeconds(
  view: TeachView,
  lesson: TeachLesson,
  ctx: TeachContext,
  settings: TeachSettings,
  report: Report,
): void {
  const ko = settings.num(TEACH_SETTING_KEYS.speakCpsKo);
  const en = settings.num(TEACH_SETTING_KEYS.speakCps);
  if (ko === undefined || en === undefined || ko <= 0 || en <= 0) return;
  const s = (...texts: (string | undefined)[]) =>
    texts.reduce((sum, t) => sum + speakSeconds(t, { ko, en }), 0);
  const together = (lesson.teach?.together ?? []) as readonly Record<
    string,
    unknown
  >[];
  const text = (o: Record<string, unknown>, key: string) =>
    typeof o[key] === "string" ? (o[key] as string) : undefined;
  const spareCount = settings.num(
    `${TEACH_SETTING_KEYS.sparesPerSession}.${ctx.area}`,
  );
  const spares = view.solo
    .map((x) =>
      x.spare ? s(...x.spare.stimuli.map((y) => y.text), x.spare.whyKo) : 0,
    )
    .sort((a, b) => b - a)
    .slice(0, spareCount ?? 0);
  const estimates: Record<(typeof TEACH_SLOTS)[number], [string, number]> = {
    today: ["teach.todayKo", s(view.todayKo, view.todayEn)],
    show: [
      "teach.models",
      view.models.reduce(
        (sum, m) =>
          sum +
          s(m.lineKo, m.en, m.storyEn, m.questionEn, m.wordAnswerEn, m.fromEn),
        0,
      ),
    ],
    together: [
      "teach.together",
      together.reduce(
        (sum, t) =>
          sum +
          s(
            text(t, "textEn"),
            text(t, "prompt"),
            text(t, "storyEn"),
            text(t, "en"),
            text(t, "lineKo"),
            text(t, "rightKo"),
          ),
        0,
      ),
    ],
    spare: ["content", spares.reduce((a, b) => a + b, 0)],
    recap: [
      "teach.recap",
      s(view.recap.frameEn) +
        Math.max(s(view.recap.closeKo), s(view.recap.closeKoPracticed)),
    ],
  };
  for (const slot of TEACH_SLOTS) {
    const key = `${TEACH_SETTING_KEYS.slotSecondsMax}.${slot}`;
    const max = settings.num(key);
    const [path, seconds] = estimates[slot];
    if (max !== undefined && seconds > max)
      report(
        "slot-seconds",
        path,
        `${slot} 자리 선생님 글 추정 ${seconds.toFixed(SECONDS_DIGITS)}초가 ${max}초(${key})를 넘는다`,
        "warning",
      );
  }
}

// ── 묶음 타: 짝 · 같이 해 보기 정답 검사(7) · 말하기 질문 의미 검사(8) ──

/** 빈칸 하나인 글에 정답을 넣은 글. 빈칸이 하나가 아니면 undefined. */
function fillBlank(prompt: string, answer: string): string | undefined {
  const blanks = prompt.match(BLANKS_ALL)?.length ?? 0;
  if (blanks !== 1) return undefined;
  return prompt.replace(BLANKS_ALL, answer);
}

/**
 * 짝 · 같이 해 보기의 빈칸 문항 정답 검사(plan 타 (7), AC-1a · AC-8a): 정답 보기를 빈칸에 넣은 글이 그 문항의 글(읽기 짝 · 같이 해 보기의
 * textEn, 듣기 짝의 대본) 안의 문장이고, 말하기 같이 해 보기는 고른 말을 틀에 넣은 글이 바른 답이다. 보기 번호 범위 · 카드는 check-lesson ·
 * teach-layout 이 본다.
 */
function checkBlankAnswers(
  lesson: TeachLesson,
  ctx: TeachContext,
  report: Report,
): void {
  const inText = (
    path: string,
    prompt: string | undefined,
    answer: string | undefined,
    text: string,
  ) => {
    if (prompt === undefined || answer === undefined) return;
    const filled = fillBlank(prompt, answer);
    if (filled === undefined) return;
    const forms = splitSentences(text).map(answerForm);
    if (!forms.includes(answerForm(filled)))
      report(
        "answer",
        path,
        `빈칸에 정답 '${answer}' 를 넣은 '${filled}' 이 그 글에 없다: ${text}`,
      );
  };
  if (ctx.area === "reading") {
    const reading = lesson as ReadingLesson;
    reading.teach?.together.forEach((t, i) => {
      inText(
        `teach.together.${i}.prompt`,
        t.prompt,
        t.choices[t.answerNo - 1],
        t.textEn,
      );
    });
    reading.content.questions.forEach((q, i) => {
      const s = q.spare;
      if (s)
        inText(
          `content.questions.${i}.spare.prompt`,
          s.prompt,
          s.options[s.answerNo - 1],
          s.textEn,
        );
    });
  } else if (ctx.area === "speaking") {
    const speaking = lesson as SpeakingLesson;
    speaking.content.listening.forEach((item, i) => {
      const s = item.spare;
      if (s?.kind === "text")
        inText(
          `content.listening.${i}.spare.prompt`,
          s.prompt,
          s.options[s.answerNo - 1],
          s.script,
        );
    });
    speaking.teach?.together.forEach((t, i) => {
      if (!t.choices || t.answerNo === undefined || !t.modelAnswer) return;
      const filled = fillBlank(t.filled, t.choices[t.answerNo - 1] ?? "");
      if (
        filled !== undefined &&
        answerForm(filled) !== answerForm(t.modelAnswer)
      )
        report(
          "answer",
          `teach.together.${i}.filled`,
          `틀에 고른 말을 넣은 '${filled}' 이 바른 답 '${t.modelAnswer}' 와 다르다`,
        );
    });
  }
}

/**
 * 말하기 질문의 바른 답 · 허용 답 의미 검사(plan 타 (8), 설계 7 말하기 질문 꼴 · 설계 8, C182 (1)): 3단계 단원 1~4 의 Do 질문(혼자 · 짝 ·
 * 같이 해 보기)에서 바른 답 · accepted · acceptedMeaning 이 모두 의미 검사를 통과하고, 아니요 질문의 질문 글에는 틀린 정보 낱말이 있다.
 */
function checkSpeakingMeaning(
  lesson: SpeakingLesson,
  ctx: TeachContext,
  report: Report,
): void {
  if (!storyQuestionScope(ctx)) return;
  const words = [...ctx.index.vocab.values()];
  const homophones = ctx.index.homophones.groups;
  const items: {
    path: string;
    en: string;
    modelAnswer?: string;
    accepted?: readonly string[];
    acceptedMeaning?: readonly string[];
  }[] = [];
  lesson.teach?.together.forEach((t, i) => {
    items.push({ path: `teach.together.${i}`, ...t });
  });
  lesson.content.questions.forEach((q, i) => {
    items.push({ path: `content.questions.${i}`, ...q });
    if (q.spare)
      items.push({ path: `content.questions.${i}.spare`, ...q.spare });
  });
  for (const item of items) {
    const modelAnswer = item.modelAnswer;
    if (modelAnswer === undefined || !DO_QUESTION.test(item.en.trim()))
      continue;
    const frame = meaningFrame({
      question: item.en,
      modelAnswer,
      words,
      homophones,
    });
    if (frame.direction === "no" && frame.wrong.length === 0)
      report(
        "speaking-meaning",
        `${item.path}.en`,
        `아니요 질문 '${item.en}' 에 바른 답 '${modelAnswer}' 와 다른 틀린 정보 낱말이 없다`,
      );
    const answers: [string, string][] = [
      [`${item.path}.modelAnswer`, modelAnswer],
      ...(item.accepted ?? []).map((a, j): [string, string] => [
        `${item.path}.accepted.${j}`,
        a,
      ]),
      ...(item.acceptedMeaning ?? []).map((a, j): [string, string] => [
        `${item.path}.acceptedMeaning.${j}`,
        a,
      ]),
    ];
    for (const [path, answer] of answers) {
      const verdict = checkMeaning({
        question: item.en,
        modelAnswer,
        answer,
        words,
        homophones,
      });
      if (verdict !== "ok")
        report(
          "speaking-meaning",
          path,
          `허용 답 '${answer}' 이 의미 검사에 걸린다(${verdict}) — 질문 '${item.en}', 바른 답 '${modelAnswer}'`,
        );
    }
  }
}
