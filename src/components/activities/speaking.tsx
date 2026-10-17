// 말하기 활동 표시(plan-p05b '활동 표시 컴포넌트' speaking.tsx): 따라 말하기 · 듣기 · 질문 · 그림 보고 말하기 · 발표 ·
// 평가 · 배치 말하기 문항. 내용 부분만 그린다(말하기 버튼 · 결과 말 · 세션 틀은 P11). 읽어 줄 글 · 장면 설명은 그리지 않는다.
import type { z } from "zod";
import {
  CHILD_SIZE,
  type Choice,
  ChoiceList,
  EnglishLine,
  GuideLine,
  type PictureLookup,
  SoundMark,
  VocabPicture,
} from "@/components/activities/common";
import type {
  SpeakingPlacementItemSchema,
  SpeakingTestItem as SpeakingTestItemSchemaType,
} from "@/core/seed/schema/assessment";
import type { Listening, SpeakingLesson } from "@/core/seed/schema/lesson";
import { cn } from "@/lib/utils";

/** 따라 말할 낱말 · 문장 하나(소리 자리 + 글). */
export function RepeatItem({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-5">
      <SoundMark />
      <EnglishLine className="font-bold">{text}</EnglishLine>
    </div>
  );
}

/** 듣기 문항(P4a 규격의 듣기 칸 가운데 그리는 것, 수업 · 평가 · 배치 공통). */
export type ListeningData = Pick<Listening, "kind" | "options" | "answerNo"> & {
  prompt?: string;
};

/** 듣기 이해 문항: 소리 자리 · 질문 · 보기. 읽어 줄 글(script)은 그리지 않는다. */
export function ListeningItem({
  item,
  pictures,
  reveal = false,
}: {
  item: ListeningData;
  pictures: PictureLookup;
  reveal?: boolean;
}) {
  const choices: Choice[] = item.options.map((option) =>
    item.kind === "picture"
      ? { kind: "picture", picture: pictures.ofWord(option) }
      : { kind: "text", text: option },
  );
  return (
    <div className="flex flex-col gap-5">
      <SoundMark />
      {item.prompt ? (
        <EnglishLine className="font-bold">{item.prompt}</EnglishLine>
      ) : null}
      <ChoiceList choices={choices} answerNo={item.answerNo} reveal={reveal} />
    </div>
  );
}

/**
 * 질문. 한국어 뜻은 부르는 쪽이 단계로 정한 showKo 일 때만 영어 질문 아래에 보인다(C39, 말하기 단계 규격 questions.koMeaning).
 * 판정 · 바른 답은 그리지 않는다.
 */
export function SpeakingQuestion({
  question,
  showKo,
}: {
  question: Pick<SpeakingLesson["content"]["questions"][number], "en" | "ko">;
  showKo: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SoundMark />
      <EnglishLine className="font-bold">{question.en}</EnglishLine>
      {showKo && question.ko ? <GuideLine>{question.ko}</GuideLine> : null}
    </div>
  );
}

type PictureTaskData = NonNullable<SpeakingLesson["content"]["pictureTask"]>;

/** 그림 보고 말하기: 단어 그림 2~3장(늘어놓기)과 질문. 장면 설명은 아이에게 보이지 않는다(C27). */
export function PictureTask({
  task,
  pictures,
}: {
  task: Pick<PictureTaskData, "images" | "prompt">;
  pictures: PictureLookup;
}) {
  const numbered = task.images.map((key, i) => ({ key, no: i + 1 }));
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-wrap gap-4">
        {numbered.map(({ key, no }) => (
          <li key={no}>
            <VocabPicture picture={pictures.ofKey(key)} />
          </li>
        ))}
      </ul>
      {task.prompt ? (
        <EnglishLine className="font-bold">{task.prompt}</EnglishLine>
      ) : null}
    </div>
  );
}

/**
 * 9단계부터 발표 앞 생각 화면: 주제와 쓸 말 세 개(speaking.prepare_seconds 수는 보이지 않는다). 쓸 말은 누르는 것이 아니라
 * 보고 쓰는 글이라 종이 칩 글 줄이다(한 화면 한 행동 — 누를 것은 P11 의 말하기 버튼 하나).
 */
export function PresentationTask({
  topic,
  prepWords,
}: {
  topic: string;
  prepWords: readonly string[];
}) {
  const numbered = prepWords.map((word, i) => ({ word, no: i + 1 }));
  return (
    <div className="flex flex-col gap-5">
      <EnglishLine className="font-bold">{topic}</EnglishLine>
      <ul className="flex flex-wrap gap-3">
        {numbered.map(({ word, no }) => (
          <li
            key={no}
            lang="en"
            className={cn(
              CHILD_SIZE.english,
              "rounded-lg bg-[#FFFDF7] px-4 py-2 font-bold",
            )}
          >
            {word}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 단계 평가 · 배치 평가 말하기 문항(P4a 규격: 따라 말하기 · 듣기 · 질문 · 발표). */
export type SpeakingTestItemData =
  | SpeakingTestItemSchemaType
  | z.infer<typeof SpeakingPlacementItemSchema>;

export function SpeakingTestItem({
  item,
  pictures,
  showKo,
  reveal = false,
}: {
  item: SpeakingTestItemData;
  pictures: PictureLookup;
  /** 질문 문항의 한국어 뜻(그 단계의 말하기 규격 koMeaning). */
  showKo: boolean;
  reveal?: boolean;
}) {
  switch (item.type) {
    case "repeat":
      return <RepeatItem text={item.sentence} />;
    case "listening":
      return <ListeningItem item={item} pictures={pictures} reveal={reveal} />;
    case "question":
      return <SpeakingQuestion question={item} showKo={showKo} />;
    case "presentation":
      return <PresentationTask topic={item.topic} prepWords={item.prepWords} />;
  }
}
