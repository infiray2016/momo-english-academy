// 새 단어 미리보기 · 활동 차례(3.2 · 3.3 첫 활동 · AC-2f, plan-p10b 파일별 값 3 · 정할 것 ㄹ · ㅁ · ㅈ, plan-p11a 파일별 값 1 · 위험 3).
// DB 없는 순수 함수다. 활동 차례는 3.3 영역별 세션 순서이고, 돌려준 목록의 차례 번호(1부터)가 attempts.activity_no 다.
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

/** 세션 활동 하나(화면이 그릴 자리 — 내용은 수업 content 의 그 차례). b · c 몫 종류도 여기서 차례를 정한다. */
export type Activity =
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

/**
 * 영역 수업의 활동 차례(3.3 영역별 세션 순서 · plan-p11a 값 1): 읽기 미리보기 → 지문 → 문항, 쓰기 1~3 미리보기 → 문항,
 * 4~5 미리보기 → 과제 → 문장 전부 → 내 문장 따라 말하기, 6~12 첫 세션 미리보기 → 과제 → (생각 꺼내기) → 초고 · 둘째 세션
 * 칭찬 → 교정 → 고쳐 쓰기 → 모범 답안 → 내 문장 말하기, 말하기 미리보기 → 따라 말하기 낱말 → 문장 → 듣기 → 그림 보고 말하기 →
 * 질문 → 발표 → 확인 질문. 회화는 빈 목록(1-나).
 * 영역 · 내용 두 인자 꼴은 P10 서버가 부르는 꼴이다(첫 세션 · 생각 꺼내기 없음 · 확인 질문 0) — P11 차례 2 가 서버를 바꾸면 없앤다.
 */
export function activitiesOf(input: ActivityModelInput): Activity[];
export function activitiesOf<A extends Area>(
  area: A,
  content: ContentOf<A>,
): Activity[];
export function activitiesOf(
  first: ActivityModelInput | Area,
  content?: unknown,
): Activity[] {
  const input =
    typeof first === "string"
      ? ({ area: first, content, level: 0 } as ActivityModelInput)
      : first;
  switch (input.area) {
    case "reading":
      return [
        { kind: "preview" },
        { kind: "reading-passage" },
        ...each("reading-question", input.content.questions),
      ];
    case "writing":
      return writingActivities(input.content, input);
    case "speaking":
      return speakingActivities(input.content, input);
    default:
      return [];
  }
}
