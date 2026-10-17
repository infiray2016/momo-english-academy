// 새 단어 미리보기 · 활동 차례(3.2 · 3.3 첫 활동 · AC-2f, plan-p10b 파일별 값 3 · 정할 것 ㄹ · ㅁ · ㅈ).
// DB 없는 순수 함수다. 활동 차례는 P5b 시드 보기의 '화면 차례'와 같고, P11 이 이 목록을 이어받아 활동마다 상호작용을 붙인다.
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

/** 세션 활동 하나(화면이 그릴 자리 — 내용은 수업 content 의 그 차례). */
export type Activity =
  | { kind: "preview" }
  | { kind: "reading-passage" }
  | { kind: "reading-question"; index: number }
  | { kind: "writing-item"; index: number }
  | { kind: "writing-task" }
  | { kind: "writing-sentence"; index: number }
  | { kind: "writing-composition" }
  | { kind: "repeat-word"; index: number }
  | { kind: "repeat-sentence"; index: number }
  | { kind: "listening"; index: number }
  | { kind: "question"; index: number }
  | { kind: "picture-task" }
  | { kind: "presentation" };

type ContentOf<A extends Area> = LessonOf[A] extends { content: infer C }
  ? C
  : never;

const indexes = (list: readonly unknown[]) => list.map((_, i) => i);

/**
 * 영역 수업의 활동 차례(3.3 영역별 세션 순서 — P5b 시드 보기 화면 차례): 읽기 미리보기 → 지문 → 문항, 쓰기 items 미리보기 →
 * 문항 · guided 미리보기 → 과제 → 문장 · composition 미리보기 → 과제, 말하기 미리보기 → 따라 말하기 낱말 → 문장 → 듣기 →
 * 질문 → 그림 보고 말하기 → 발표. 회화는 빈 목록(1-나).
 */
export function activitiesOf<A extends Area>(
  area: A,
  content: ContentOf<A>,
): Activity[] {
  const preview: Activity = { kind: "preview" };
  switch (area) {
    case "reading": {
      const c = content as ContentOf<"reading">;
      return [
        preview,
        { kind: "reading-passage" },
        ...indexes(c.questions).map(
          (index): Activity => ({ kind: "reading-question", index }),
        ),
      ];
    }
    case "writing": {
      const c = content as ContentOf<"writing">;
      switch (c.shape) {
        case "items":
          return [
            preview,
            ...indexes(c.items).map(
              (index): Activity => ({ kind: "writing-item", index }),
            ),
          ];
        case "guided":
          return [
            preview,
            { kind: "writing-task" },
            ...indexes(c.sentences).map(
              (index): Activity => ({ kind: "writing-sentence", index }),
            ),
          ];
        case "composition":
          return [preview, { kind: "writing-composition" }];
      }
      return [preview];
    }
    case "speaking": {
      const c = content as ContentOf<"speaking">;
      return [
        preview,
        ...indexes(c.repeat.words).map(
          (index): Activity => ({ kind: "repeat-word", index }),
        ),
        ...indexes(c.repeat.sentences).map(
          (index): Activity => ({ kind: "repeat-sentence", index }),
        ),
        ...indexes(c.listening).map(
          (index): Activity => ({ kind: "listening", index }),
        ),
        ...indexes(c.questions).map(
          (index): Activity => ({ kind: "question", index }),
        ),
        ...(c.pictureTask ? [{ kind: "picture-task" } as Activity] : []),
        ...(c.presentation ? [{ kind: "presentation" } as Activity] : []),
      ];
    }
    default:
      return [];
  }
}
