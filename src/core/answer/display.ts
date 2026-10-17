// 답 입력 조각에 넘기는 문항 꼴(plan-p10a 파일별 값 11). 시드 문항에서 정답 칸(answerNo · accepted · 글자 만들기의 낱말)을 빼고,
// 그림 보기는 그림 정보(뜻 · 경로)로 바꾼다. 받아쓰기 · 빈 글자 채우기는 읽어 줄 글로 낱말 소리가 실린다(소리 자리에 필요).
// 채점은 서버가 원래 문항으로 한다(check.ts). DB 없는 순수 함수다.
import type { PlacementItem } from "@/core/seed/schema/assessment";
import type { READING_TEXT_QUESTION_TYPES } from "@/core/seed/structure";

type ReadingTextType = (typeof READING_TEXT_QUESTION_TYPES)[number];

/** 그림 정보(P5b PictureInfo 와 같은 꼴 — 뜻 글 · public 경로 · 카탈로그에 있음). */
export type PictureInfo = {
  meaningKo: string;
  src?: string;
  catalogued: boolean;
};

/** 보기 하나(글 또는 그림). */
export type DisplayChoice =
  | { kind: "text"; text: string }
  | { kind: "picture"; picture: PictureInfo };

export type DisplayItem =
  | {
      type: "reading";
      questionType: "picture" | ReadingTextType;
      passage: string;
      prompt: string;
      choices: DisplayChoice[];
    }
  | { type: "pick-word"; picture: PictureInfo; choices: DisplayChoice[] }
  | {
      type: "listening";
      /** 읽어 줄 글(화면에 그리지 않는다). */
      script: string;
      prompt?: string;
      choices: DisplayChoice[];
    }
  | { type: "copy-tiles"; word: string; tiles: string[] }
  | { type: "build-tiles"; meaningKo: string; tiles: string[] }
  | {
      type: "fill-letters";
      pattern: string;
      picture: PictureInfo;
      /** 읽어 줄 낱말(빈 글자 꼴만으로는 낱말을 가를 수 없어 소리 자리를 둔다 — P5b WritingItem 과 같은 꼴). */
      audioText: string;
      tiles: string[];
    }
  /** 받아쓰기 — 읽어 줄 글만(낱말은 보이지 않는다). */
  | { type: "dictation"; audioText: string }
  | {
      type: "assemble-phrase" | "assemble-sentence";
      cards: string[];
      meaningKo?: string;
    }
  | { type: "fill-blank" | "fix-sentence"; prompt: string }
  | { type: "repeat"; sentence: string };

/** 답 꼴(Answer.kind)마다 그 꼴을 받는 문항 — 조각을 고른다. */
export function answerShapeOf(
  item: DisplayItem,
): "choice" | "tiles" | "typing" | "repeat" {
  switch (item.type) {
    case "reading":
    case "pick-word":
    case "listening":
      return "choice";
    case "copy-tiles":
    case "build-tiles":
    case "fill-letters":
    case "assemble-phrase":
    case "assemble-sentence":
      return "tiles";
    case "dictation":
    case "fill-blank":
    case "fix-sentence":
      return "typing";
    case "repeat":
      return "repeat";
  }
}

/** 배치 문항(P4a 규격)을 화면 꼴로. picture 는 낱말 id 의 그림 정보(서버가 vocab · images 에서 찾는다). */
export function displayItemOf(
  item: PlacementItem,
  picture: (word: string) => PictureInfo,
): DisplayItem {
  const pictures = (words: readonly string[]): DisplayChoice[] =>
    words.map((word) => ({ kind: "picture", picture: picture(word) }));
  const texts = (options: readonly string[]): DisplayChoice[] =>
    options.map((text) => ({ kind: "text", text }));
  switch (item.type) {
    case "picture":
      return {
        type: "reading",
        questionType: "picture",
        passage: item.passage,
        prompt: item.prompt,
        choices: pictures(item.options),
      };
    case "pick-word":
      return {
        type: "pick-word",
        picture: picture(item.picture),
        choices: texts(item.options),
      };
    case "listening":
      return {
        type: "listening",
        script: item.script,
        ...("prompt" in item && item.prompt ? { prompt: item.prompt } : {}),
        choices:
          item.kind === "picture"
            ? pictures(item.options)
            : texts(item.options),
      };
    case "copy-tiles":
      return { type: "copy-tiles", word: item.word, tiles: [...item.tiles] };
    case "build-tiles":
      return {
        type: "build-tiles",
        meaningKo: item.meaningKo,
        tiles: [...item.tiles],
      };
    case "fill-letters":
      return {
        type: "fill-letters",
        pattern: item.pattern,
        picture: picture(item.word),
        audioText: item.word,
        tiles: [...item.tiles],
      };
    case "dictation":
      return { type: "dictation", audioText: item.audioText };
    case "assemble-phrase":
    case "assemble-sentence":
      return {
        type: item.type,
        cards: [...item.cards],
        ...(item.meaningKo ? { meaningKo: item.meaningKo } : {}),
      };
    case "fill-blank":
    case "fix-sentence":
      return { type: item.type, prompt: item.prompt };
    case "repeat":
      return { type: "repeat", sentence: item.sentence };
    default:
      return {
        type: "reading",
        questionType: item.type,
        passage: item.passage,
        prompt: item.prompt,
        choices: texts(item.options),
      };
  }
}
