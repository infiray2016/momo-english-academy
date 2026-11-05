// 새 단어 미리보기 · 활동 차례(3.2 · 3.3 첫 활동 · AC-2f, plan-p10b 파일별 값 3 · 정할 것 ㄹ · ㅁ · ㅈ, plan-p11a 파일별 값 1 · 위험 3).
// DB 없는 순수 함수다. 활동 차례는 3.3 영역별 세션 순서이고, 돌려준 목록의 차례 번호(1부터)가 attempts.activity_no 다.
// 가르치는 수업(teach 칸이 있는 수업)은 여섯 자리 차례다(델타 spec 2026-10-29 가르치고 배우는 수업 설계 1 · 9, plan 나 · 정한 것 1 · 3 · 4):
// 오늘 배울 것 → 새 단어 → 본보기 → 같이 해 보기 → 혼자 해 보기(지금 차례) → 짝(모든 짝, 영역 차례로 고정 번호). 되짚기는 결과 화면 몫.
// 단계 숫자로 가르지 않고 teach 칸 유무로 가른다.
import type { LessonOf } from "@/core/seed/schema/lesson";
import type { Area } from "@/core/seed/structure";

export type PreviewWord = {
  word: string;
  meaningKo: string;
  example: string;
  /** 앞 수업을 건너뛰어 못 만난 단원 단어라 더한 것(AC-2f). */
  added: boolean;
};

/**
 * 첫 활동에 보일 단어. 바탕: 새 단어가 있으면 수업 시드의 preview, 없으면(다지기 · 보강) 단원 단어 가운데 '안다'가 아닌 것을
 * 앞에서 k 개(k = 단원 복사본 unit.new_words_per_lesson). 더함: 이 수업 단원 단어 가운데 아직 만나지 않았고 바탕에 없는 단어 전부.
 * knownWords 는 P12(vocab_progress known) 전에는 빈 목록이다(정할 것 ㅁ).
 */
export function previewWordsOf(input: {
  lesson: {
    newWords: readonly string[];
    unitWords: readonly string[];
    preview: readonly { word: string; meaningKo: string; example: string }[];
  };
  metWords: readonly string[];
  knownWords: readonly string[];
  k: number;
  vocab: (word: string) => { meaningKo: string; example: string } | undefined;
}): PreviewWord[] {
  const { lesson } = input;
  const known = new Set(input.knownWords);
  const met = new Set(input.metWords);
  const fromVocab = (word: string, added: boolean): PreviewWord => {
    const entry = input.vocab(word);
    return {
      word,
      meaningKo: entry?.meaningKo ?? word,
      example: entry?.example ?? "",
      added,
    };
  };
  const base: PreviewWord[] =
    lesson.newWords.length > 0
      ? lesson.preview.map((p) => ({ ...p, added: false }))
      : lesson.unitWords
          .filter((w) => !known.has(w))
          .slice(0, Math.max(0, input.k))
          .map((w) => fromVocab(w, false));
  const inBase = new Set(base.map((w) => w.word));
  const added = lesson.unitWords
    .filter((w) => !met.has(w) && !inBase.has(w))
    .map((w) => fromVocab(w, true));
  return [...base, ...added];
}

/** 짝을 두는 혼자 문항 종류(짝 활동의 base — 짝 시도는 이 종류의 꼴에 slot "spare" 를 단다). */
export type SpareBase =
  | "reading-question"
  | "writing-item"
  | "question"
  | "listening"
  | "repeat-sentence"
  | "repeat-word";

/** 세션 활동 하나(화면이 그릴 자리 — 내용은 수업 content 의 그 차례). b · c 몫 종류도 여기서 차례를 정한다. */
export type Activity =
  // 가르치는 수업 자리(teach 칸이 있는 수업만): 오늘 배울 것 · 본보기(teach.models 차례) · 같이 해 보기(teach.together 차례)
  | { kind: "today" }
  | { kind: "model"; index: number }
  | { kind: "together"; index: number }
  /** 짝(다른 예시에서 스스로): base 종류 혼자 문항 index 의 짝. */
  | { kind: "spare"; base: SpareBase; index: number }
  | { kind: "preview" }
  // 읽기
  | { kind: "reading-passage" }
  | { kind: "reading-question"; index: number }
  // 쓰기 1~3
  | { kind: "writing-item"; index: number }
  // 쓰기 4~5(과제 → 문장 전부 한 화면 · 한 제출 · 확인도 같은 화면 → 내 문장 듣고 따라 말하기(선택))
  | { kind: "writing-task" }
  | { kind: "writing-guided" }
  | { kind: "writing-own-repeat" }
  // 쓰기 6~12 첫 세션(과제 → 생각 꺼내기 → 초고)
  | { kind: "thinkout" }
  | { kind: "draft" }
  // 쓰기 6~12 둘째 세션(첨삭 보기 → 고쳐 쓰기 → 모범 답안 → 내 문장 말하기)
  | { kind: "feedback-praise" }
  | { kind: "feedback-correction"; index: number }
  | { kind: "rewrite" }
  | { kind: "model-answer" }
  | { kind: "own-speak" }
  // 말하기
  | { kind: "repeat-word"; index: number }
  | { kind: "repeat-sentence"; index: number }
  | { kind: "listening"; index: number }
  | { kind: "picture-task" }
  | { kind: "question"; index: number }
  | { kind: "presentation" }
  | { kind: "confirm-question"; index: number };

export type ActivityKind = Activity["kind"];

type ContentOf<A extends Area> = LessonOf[A] extends { content: infer C }
  ? C
  : never;

/** 활동 모델의 입력. 부르는 쪽이 level_specs · 설정 · 첨삭에서 채운다. */
export type ActivityModelInput = {
  [A in Area]: { area: A; content: ContentOf<A> };
}[Area] & {
  level: number;
  /** 쓰기 6~12 세션(첫 세션 draft · 둘째 세션 rewrite, sessions.writing_part). 없으면 첫 세션. */
  part?: "draft" | "rewrite";
  /** 생각 꺼내기를 하는가(단계 ≥ writing.thinkout_from_level). */
  thinkout?: boolean;
  /** 둘째 세션의 교정 수(첨삭의 교정 목록 길이, 0 이면 교정 활동 없음). */
  corrections?: number;
  /** 확인 질문 수(그 단계 level_specs presentation.confirmQuestions). */
  confirmQuestions?: number;
  /** 수업 시드의 teach 칸(있으면 여섯 자리 차례 — 정한 것 1). 본보기 · 같이 해 보기 수만 본다. */
  teach?: { models: readonly unknown[]; together: readonly unknown[] };
};

const run = <K extends "feedback-correction" | "confirm-question">(
  kind: K,
  count: number,
): Activity[] =>
  Array.from(
    { length: Math.max(0, count) },
    (_, index) => ({ kind, index }) as Activity,
  );
const each = <
  K extends
    | "reading-question"
    | "writing-item"
    | "repeat-word"
    | "repeat-sentence"
    | "listening"
    | "question",
>(
  kind: K,
  list: readonly unknown[],
): Activity[] => list.map((_, index) => ({ kind, index }) as Activity);

function writingActivities(
  c: ContentOf<"writing">,
  input: ActivityModelInput,
): Activity[] {
  const preview: Activity = { kind: "preview" };
  switch (c.shape) {
    case "items":
      return [preview, ...each("writing-item", c.items)];
    case "guided":
      return [
        preview,
        { kind: "writing-task" },
        { kind: "writing-guided" },
        { kind: "writing-own-repeat" },
      ];
    case "composition":
      // 둘째 세션은 새 단어 미리보기가 없다(3.3 6~12 둘째 세션 행 · AC-4c)
      if (input.part === "rewrite")
        return [
          { kind: "feedback-praise" },
          ...run("feedback-correction", input.corrections ?? 0),
          { kind: "rewrite" },
          { kind: "model-answer" },
          { kind: "own-speak" },
        ];
      return [
        preview,
        { kind: "writing-task" },
        ...(input.thinkout ? [{ kind: "thinkout" } as Activity] : []),
        { kind: "draft" },
      ];
  }
}

function speakingActivities(
  c: ContentOf<"speaking">,
  input: ActivityModelInput,
): Activity[] {
  return [
    { kind: "preview" },
    ...each("repeat-word", c.repeat.words),
    ...each("repeat-sentence", c.repeat.sentences),
    ...each("listening", c.listening),
    // 6 · 8단계 그림 보고 말하기는 질문보다 먼저(3.3 표 차례, C77 (7))
    ...(c.pictureTask ? [{ kind: "picture-task" } as Activity] : []),
    ...each("question", c.questions),
    ...(c.presentation ? [{ kind: "presentation" } as Activity] : []),
    ...(c.presentation
      ? run("confirm-question", input.confirmQuestions ?? 0)
      : []),
  ];
}

/** 짝 활동: 짝이 있는 혼자 문항마다 하나(문항 차례). */
const sparesOf = (
  base: SpareBase,
  list: readonly unknown[],
  has: (item: unknown, index: number) => boolean,
): Activity[] =>
  list.flatMap((item, index) =>
    has(item, index) ? [{ kind: "spare", base, index } as Activity] : [],
  );
const withSpare = (item: unknown) =>
  typeof item === "object" &&
  item !== null &&
  "spare" in item &&
  item.spare !== undefined;

/**
 * 짝 활동 차례(정한 것 3): 읽기 · 쓰기는 문항 차례, 말하기는 질문 → 듣기 → 문장 → 낱말(델타 spec 설계 1 '다른 예시' — 짝 고르기가
 * 먼저 고르는 차례와 같다). 낼 짝은 sparesToShow 가 정하고, 차례 번호는 낸 짝과 상관없이 같다.
 */
function spareActivities(input: ActivityModelInput): Activity[] {
  switch (input.area) {
    case "reading":
      return sparesOf("reading-question", input.content.questions, withSpare);
    case "writing":
      return input.content.shape === "items"
        ? sparesOf("writing-item", input.content.items, withSpare)
        : [];
    case "speaking": {
      const c = input.content;
      const spares = c.repeat.spares;
      return [
        ...sparesOf("question", c.questions, withSpare),
        ...sparesOf("listening", c.listening, withSpare),
        ...sparesOf(
          "repeat-sentence",
          c.repeat.sentences,
          (_, i) => spares?.sentences[i] !== undefined,
        ),
        ...sparesOf(
          "repeat-word",
          c.repeat.words,
          (_, i) => spares?.words[i] !== undefined,
        ),
      ];
    }
    default:
      return [];
  }
}

/** 지금 차례(미리보기 → 과제)를 여섯 자리로: 미리보기 앞에 오늘 배울 것, 뒤에 본보기 · 같이 해 보기, 끝에 짝. 미리보기가 없는 세션은 그대로. */
function teachOrder(base: Activity[], input: ActivityModelInput): Activity[] {
  const { teach } = input;
  const [first, ...rest] = base;
  if (!teach || first?.kind !== "preview") return base;
  return [
    { kind: "today" },
    first,
    ...teach.models.map((_, index): Activity => ({ kind: "model", index })),
    ...teach.together.map(
      (_, index): Activity => ({ kind: "together", index }),
    ),
    ...rest,
    ...spareActivities(input),
  ];
}

/**
 * 영역 수업의 활동 차례(3.3 영역별 세션 순서 · plan-p11a 값 1): 읽기 미리보기 → 지문 → 문항, 쓰기 1~3 미리보기 → 문항,
 * 4~5 미리보기 → 과제 → 문장 전부 → 내 문장 따라 말하기, 6~12 첫 세션 미리보기 → 과제 → (생각 꺼내기) → 초고 · 둘째 세션
 * 칭찬 → 교정 → 고쳐 쓰기 → 모범 답안 → 내 문장 말하기, 말하기 미리보기 → 따라 말하기 낱말 → 문장 → 듣기 → 그림 보고 말하기 →
 * 질문 → 발표 → 확인 질문. 회화는 빈 목록(1-나). teach 가 있으면 여섯 자리 차례(teachOrder).
 */
export function activitiesOf(input: ActivityModelInput): Activity[] {
  switch (input.area) {
    case "reading":
      return teachOrder(
        [
          { kind: "preview" },
          { kind: "reading-passage" },
          ...each("reading-question", input.content.questions),
        ],
        input,
      );
    case "writing":
      return teachOrder(writingActivities(input.content, input), input);
    case "speaking":
      return teachOrder(speakingActivities(input.content, input), input);
    default:
      return [];
  }
}

/**
 * 새 단어 미리보기 활동 번호(1부터, 정한 것 4). 지금 차례는 1, 가르치는 수업은 오늘 배울 것 뒤라 2 다. 미리보기가 없는 세션(쓰기 6~12
 * 둘째 세션)은 undefined. 다른 세션의 미리보기 시도는 번호가 아니라 시도 꼴 kind "preview" 로 찾는다(옛 세션 · 새 세션이 섞임).
 */
export function previewActivityNoOf(
  activities: readonly Activity[],
): number | undefined {
  const index = activities.findIndex((a) => a.kind === "preview");
  return index < 0 ? undefined : index + 1;
}
