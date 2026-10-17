// 읽기 활동 표시(plan-p05b '활동 표시 컴포넌트' reading.tsx): 지문 · 읽기 문항 · 평가 · 배치 읽기 문항 · 토리 이야기 글과 질문.
// 내용 부분만 그린다(누르는 버튼 · 상태 · 세션 틀은 P10 · P11). 훅 · 'use client' · server-only 없음.
import type { z } from "zod";
import {
  CHILD_SIZE,
  type Choice,
  ChoiceList,
  EnglishLine,
  GuideLine,
  PASSAGE_PICTURE_MAX,
  PASSAGE_PICTURE_UNTIL_LEVEL,
  type PictureLookup,
  SoundMark,
  VocabPicture,
} from "@/components/activities/common";
import type {
  ReadingPlacementItemSchema,
  ReadingTestItem as ReadingTestItemSchemaType,
  Story,
} from "@/core/seed/schema/assessment";
import type {
  ReadingLesson,
  ReadingQuestion as ReadingQuestionData,
} from "@/core/seed/schema/lesson";
import { cn } from "@/lib/utils";

/** 글로서리 한 항목(P4a 규격). 표시는 새 단어에만, 누르면 뜻은 P11. */
export type GlossaryEntry = ReadingLesson["content"]["glossary"][number];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 지문을 표시할 표기형과 나머지로 가른다(긴 표기형 먼저, 낱말 경계 안에서만). */
function splitPassage(
  passage: string,
  surfaces: readonly string[],
): { text: string; mark: boolean; at: number }[] {
  const unique = [...new Set(surfaces.filter((s) => s.trim() !== ""))].sort(
    (a, b) => b.length - a.length,
  );
  if (unique.length === 0) return [{ text: passage, mark: false, at: 0 }];
  const pattern = new RegExp(
    `(?<![A-Za-z'])(?:${unique.map(escapeRegExp).join("|")})(?![A-Za-z'])`,
    "g",
  );
  const parts: { text: string; mark: boolean; at: number }[] = [];
  let last = 0;
  for (const match of passage.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last)
      parts.push({ text: passage.slice(last, at), mark: false, at: last });
    parts.push({ text: match[0], mark: true, at });
    last = at + match[0].length;
  }
  if (last < passage.length)
    parts.push({ text: passage.slice(last), mark: false, at: last });
  return parts;
}

/**
 * 지문 위 단어 그림 줄(3.3 '1~4단계 … 글 옆에 단어 그림', 13절 C67 (6)): 1~4단계에서만, 받은 낱말 가운데
 * 그림 카탈로그에 있는 것을 차례대로 최대 PASSAGE_PICTURE_MAX 개. 문장마다 짝 짓지 않는다. 화면 꼴은 H6 에서 맞춘다.
 */
function PassagePictures({
  words,
  level,
  pictures,
  decorative,
}: {
  words: readonly string[];
  level: number;
  pictures: PictureLookup;
  /** 평가 지문: 파일이 있는 그림만, 꾸밈 그림(alt 비움)으로. 뜻 글 대체 없음. */
  decorative: boolean;
}) {
  if (level > PASSAGE_PICTURE_UNTIL_LEVEL) return null;
  const shown = [...new Set(words)]
    .map((word) => ({ word, picture: pictures.ofWord(word) }))
    .filter(
      ({ picture }) =>
        picture.catalogued && (!decorative || picture.src !== undefined),
    )
    .slice(0, PASSAGE_PICTURE_MAX);
  if (shown.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-4">
      {shown.map(({ word, picture }) => (
        <li key={word} data-passage-picture="">
          <VocabPicture picture={picture} decorative={decorative} />
        </li>
      ))}
    </ul>
  );
}

/**
 * 지문. 1~4단계는 위에 단어 그림 줄, 그 아래 '읽어 주기' 소리 자리(목업 B_Reading). 이번 수업 새 단어(원형이
 * markWords 에 든 글로서리 표기형)만 표시하고, 나머지 글로서리 낱말 · 고유 명사는 표시 없이 둔다(누르면 뜻은 P11,
 * 3.3 '단어를 누르면 뜻').
 */
export function ReadingPassage({
  passage,
  glossary = [],
  markWords = [],
  pictureWords = [],
  level,
  pictures,
  readAloud = true,
  decorativePictures = false,
}: {
  passage: string;
  glossary?: readonly GlossaryEntry[];
  /** 표시할 새 단어(원형, 단어 id). */
  markWords?: readonly string[];
  /** 그림을 붙일 낱말 후보(차례대로). */
  pictureWords?: readonly string[];
  level: number;
  pictures: PictureLookup;
  /** '읽어 주기' 소리 자리(수업 지문 참). 단계 평가 · 배치 평가 지문은 거짓(4절 '평가 화면은 B_LevelTest'). */
  readAloud?: boolean;
  /**
   * 그림을 꾸밈 그림으로: 파일이 있는 것만, alt 비움, 뜻 글 대체 없음. 단계 평가 · 배치 평가 지문은 참
   * (4절 '평가 중에는 힌트와 뜻 보기가 없다'). 수업 지문은 거짓(파일이 없으면 뜻 글).
   */
  decorativePictures?: boolean;
}) {
  const marked = new Set(markWords);
  const parts = splitPassage(
    passage,
    glossary
      .filter((entry) => !entry.proper && marked.has(entry.lemma))
      .map((entry) => entry.surface),
  );
  return (
    <div className="flex flex-col gap-4">
      <PassagePictures
        words={pictureWords}
        level={level}
        pictures={pictures}
        decorative={decorativePictures}
      />
      {readAloud ? <SoundMark label="읽어 주기" /> : null}
      <p lang="en" className={cn(CHILD_SIZE.english, "leading-relaxed")}>
        {parts.map((part) =>
          part.mark ? (
            <span
              key={part.at}
              data-new-word=""
              className="rounded bg-[#FFFDF7] px-1 font-bold"
            >
              {part.text}
            </span>
          ) : (
            <span key={part.at}>{part.text}</span>
          ),
        )}
      </p>
    </div>
  );
}

function choicesOf(
  kind: "picture" | "text",
  options: readonly string[],
  pictures: PictureLookup,
): Choice[] {
  return options.map((option) =>
    kind === "picture"
      ? { kind: "picture", picture: pictures.ofWord(option) }
      : { kind: "text", text: option },
  );
}

/** 읽기 수업 문항 하나: 질문과 보기 넷(그림 문제는 단어 그림). */
export function ReadingQuestion({
  question,
  pictures,
  reveal = false,
}: {
  question: ReadingQuestionData;
  pictures: PictureLookup;
  reveal?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <EnglishLine className="font-bold">{question.prompt}</EnglishLine>
      <ChoiceList
        choices={choicesOf(question.kind, question.options, pictures)}
        answerNo={question.answerNo}
        reveal={reveal}
      />
    </div>
  );
}

/** 평가 · 배치 읽기 문항(P4a 규격, 지문 + 질문 + 보기). type 이 picture 면 보기는 단어 그림이다. */
export type ReadingTestItemData =
  | ReadingTestItemSchemaType
  | z.infer<typeof ReadingPlacementItemSchema>;

/**
 * 단계 평가 · 배치 평가 읽기 문항 하나. 평가 중에는 뜻 보기가 없어 새 단어 표시를 두지 않는다.
 * 1~4단계 지문 그림은 부르는 쪽이 고른 낱말(연결 단원 단어 가운데 지문에 나온 것)로 붙인다.
 */
export function ReadingTestItem({
  item,
  level,
  pictureWords = [],
  pictures,
  reveal = false,
}: {
  item: ReadingTestItemData;
  level: number;
  pictureWords?: readonly string[];
  pictures: PictureLookup;
  reveal?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <ReadingPassage
        passage={item.passage}
        level={level}
        pictureWords={pictureWords}
        pictures={pictures}
        readAloud={false}
        decorativePictures
      />
      <EnglishLine className="font-bold">{item.prompt}</EnglishLine>
      <ChoiceList
        choices={choicesOf(
          item.type === "picture" ? "picture" : "text",
          item.options,
          pictures,
        )}
        answerNo={item.answerNo}
        reveal={reveal}
      />
    </div>
  );
}

/**
 * 토리 이야기 글. 한국어 뜻은 부르는 쪽이 구간으로 정한 showKo 일 때만 보인다(4절 토리 이야기 행 '1~3 · 4~6 구간',
 * STORY_KO_BANDS). 그림은 없다(C67 (6)).
 */
export function StoryText({
  story,
  showKo,
}: {
  story: Pick<Story, "title" | "textEn" | "textKo">;
  showKo: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {story.title ? (
        <GuideLine className="font-bold">{story.title}</GuideLine>
      ) : null}
      <SoundMark label="읽어 주기" />
      <EnglishLine className="leading-relaxed">{story.textEn}</EnglishLine>
      {showKo && story.textKo ? <GuideLine>{story.textKo}</GuideLine> : null}
    </div>
  );
}

/** 토리 이야기 질문 하나(보기 셋). */
export function StoryQuestion({
  question,
  reveal = false,
}: {
  question: Story["questions"][number];
  reveal?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <EnglishLine className="font-bold">{question.prompt}</EnglishLine>
      <ChoiceList
        choices={question.options.map((text) => ({ kind: "text", text }))}
        answerNo={question.answerNo}
        reveal={reveal}
      />
    </div>
  );
}
