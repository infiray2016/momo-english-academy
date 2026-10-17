// 쓰기 활동 표시(plan-p05b '활동 표시 컴포넌트' writing.tsx): 1~3단계 문항 갈래 일곱 · 4~5단계 문장 틀 · 6단계부터 과제 ·
// 평가의 빈칸 채우기 · 문장 고치기 · 작문 문항. 내용 부분만 그린다(누르는 버튼 · 확인 · 첨삭 · 세션 틀은 P10 · P11).
// 1~3단계는 고르기 · 베끼기 · 조립이다(문장을 만들게 하지 않는다). 카드는 시드 그대로(소문자 · 문장 부호 카드 따로).

import {
  AnswerBox,
  CHILD_SIZE,
  ChoiceList,
  EnglishLine,
  FrameText,
  GuideLine,
  type PictureLookup,
  SoundMark,
  TileRow,
  VocabPicture,
} from "@/components/activities/common";
import type { WritingItem as WritingItemData } from "@/core/seed/schema/lesson";
import { cn } from "@/lib/utils";

/** 빈 글자 꼴(b_ll): 밑줄 자리는 빈 칸, reveal 이면 그 자리에 정답 글자를 보인다. */
function LetterPattern({
  pattern,
  word,
  reveal,
}: {
  pattern: string;
  word: string;
  reveal: boolean;
}) {
  const letters = [...pattern].map((letter, i) => ({
    letter,
    at: i,
    answer: word.charAt(i),
  }));
  return (
    <p lang="en" className="flex flex-wrap gap-2">
      {letters.map(({ letter, at, answer }) => {
        const blank = letter === "_";
        const shown = blank && reveal && answer !== "";
        return (
          <span
            key={at}
            data-blank={blank ? "" : undefined}
            data-correct={shown ? "true" : undefined}
            className={cn(
              CHILD_SIZE.english,
              CHILD_SIZE.target,
              "flex items-center justify-center rounded-lg border-2 font-bold",
              blank
                ? "border-dashed border-neutral-700 bg-white"
                : "border-transparent",
            )}
          >
            {blank ? (shown ? answer : null) : letter}
          </span>
        );
      })}
    </p>
  );
}

/** 쓰기 1~3단계 문항 하나(수업 · 평가 · 배치 공통). reveal 이면 정답을 보인다. */
export function WritingItem({
  item,
  pictures,
  reveal = false,
}: {
  item: WritingItemData;
  pictures: PictureLookup;
  reveal?: boolean;
}) {
  const answer = item.accepted[0];
  switch (item.type) {
    case "pick-word":
      return (
        <div className="flex flex-col items-center gap-5">
          <VocabPicture picture={pictures.ofWord(item.picture)} />
          <div className="w-full">
            <ChoiceList
              choices={item.options.map((text) => ({ kind: "text", text }))}
              answerNo={item.answerNo}
              reveal={reveal}
            />
          </div>
        </div>
      );
    case "copy-tiles":
      return (
        <div className="flex flex-col gap-5">
          <EnglishLine className="font-bold">{item.word}</EnglishLine>
          <AnswerBox answer={answer} reveal={reveal} />
          <TileRow tiles={item.tiles} />
        </div>
      );
    case "build-tiles":
      return (
        <div className="flex flex-col gap-5">
          <GuideLine className="font-bold">{item.meaningKo}</GuideLine>
          <AnswerBox answer={answer} reveal={reveal} />
          <TileRow tiles={item.tiles} />
        </div>
      );
    case "fill-letters":
      // 빈 글자 꼴만으로는 낱말을 가를 수 없어(b_ll → ball · bell …) 단어 그림과 소리 자리를 둔다(목업 B_W1_Words)
      return (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-5">
            <VocabPicture picture={pictures.ofWord(item.word)} />
            <SoundMark />
          </div>
          <LetterPattern
            pattern={item.pattern}
            word={item.word}
            reveal={reveal}
          />
          <TileRow tiles={item.tiles} />
        </div>
      );
    case "dictation":
      // 받아쓰기는 낱말을 보이지 않는다(읽어 줄 글은 소리 자리로만)
      return (
        <div className="flex flex-col gap-5">
          <SoundMark />
          <AnswerBox answer={answer} reveal={reveal} />
        </div>
      );
    case "assemble-phrase":
    case "assemble-sentence":
      return (
        <div className="flex flex-col gap-5">
          {item.meaningKo ? (
            <GuideLine className="font-bold">{item.meaningKo}</GuideLine>
          ) : null}
          <AnswerBox answer={answer} reveal={reveal} />
          <TileRow tiles={item.cards} />
        </div>
      );
  }
}

/** 과제 · 예시 머리(목업 B_Writing 의 '과제' · '예시'). */
function TaskBlock({ task, example }: { task: string; example?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <GuideLine className="font-bold">과제</GuideLine>
        <GuideLine>{task}</GuideLine>
      </div>
      {example ? (
        <div className="flex flex-col gap-1">
          <GuideLine className="font-bold">예시</GuideLine>
          <EnglishLine>{example}</EnglishLine>
        </div>
      ) : null}
    </div>
  );
}

/** 쓰기 4~5단계 과제 화면(과제 · 예시). */
export function WritingGuidedTask({
  task,
  example,
}: {
  task: string;
  example: string;
}) {
  return <TaskBlock task={task} example={example} />;
}

/** 쓰기 4~5단계 문장 하나: 문장 틀(빈칸)과 단어 상자(목업 B_Writing 의 '단어 상자'). */
export function WritingGuidedSentence({
  frame,
  wordBox,
}: {
  frame: string;
  wordBox?: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <FrameText frame={frame} />
      {wordBox && wordBox.length > 0 ? (
        <div className="flex flex-col gap-3">
          <GuideLine className="font-bold">단어 상자</GuideLine>
          <TileRow tiles={wordBox} />
        </div>
      ) : null}
    </div>
  );
}

/** 쓰기 6단계부터 과제(과제 · 예시 · 힌트)와 쓰는 칸. 생각 꺼내기 · 첨삭은 실시간 호출이라 그리지 않는다. */
export function WritingComposition({
  task,
  example,
  hints,
}: {
  task: string;
  example: string;
  hints: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <TaskBlock task={task} example={example} />
      {hints.length > 0 ? (
        <div className="flex flex-col gap-2">
          <GuideLine className="font-bold">힌트</GuideLine>
          <ul className="flex flex-col gap-1">
            {hints.map((hint) => (
              <li key={hint}>
                <EnglishLine>{hint}</EnglishLine>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <AnswerBox tall />
    </div>
  );
}

/** 평가의 빈칸 채우기 문항(문장의 빈칸 + 답 칸). */
export function FillBlankItem({
  prompt,
  accepted,
  reveal = false,
}: {
  prompt: string;
  accepted: readonly string[];
  reveal?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <FrameText frame={prompt} />
      <AnswerBox answer={accepted[0]} reveal={reveal} />
    </div>
  );
}

/** 평가의 문장 고치기 문항(고칠 문장 + 답 칸). */
export function FixSentenceItem({
  prompt,
  accepted,
  reveal = false,
}: {
  prompt: string;
  accepted: readonly string[];
  reveal?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <EnglishLine className="font-bold">{prompt}</EnglishLine>
      <AnswerBox answer={accepted[0]} reveal={reveal} />
    </div>
  );
}

/** 평가의 작문 문항(AI 과제, 과제 · 예시와 쓰는 칸). */
export function CompositionTestItem({
  task,
  example,
}: {
  task: string;
  example?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <TaskBlock task={task} example={example} />
      <AnswerBox tall />
    </div>
  );
}
