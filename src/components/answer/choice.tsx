"use client";

// 고르기 답 조각(plan-p10a 파일별 값 11): 읽기 문제(그림 · 글 보기) · 쓰기 pick-word · 말하기 듣고 고르기.
// 문항 몸통은 P5b 조각(ReadingPassage · EnglishLine · VocabPicture)으로 그리고 누르는 보기만 더한다. 채점하지 않고
// '다음'에서 onAnswer 하나로 고른 번호를 넘긴다(배치는 서버가 채점, P11 은 세션 규칙을 더한다 — 위험 12).
// 평가 중에는 정오를 보이지 않는다(정할 것 처). 그림은 카탈로그 경로를 믿고, 읽지 못하면 뜻 글로 바꾼다(정할 것 파).
import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CHILD_SIZE,
  EnglishLine,
  type PictureLookup,
  VocabPicture,
} from "@/components/activities/common";
import { ReadingPassage } from "@/components/activities/reading";
import {
  BigButton,
  FOCUS_RING,
  SELECTED_RING,
  SelectedMark,
  SmallButton,
} from "@/components/board/board";
import type { Answer } from "@/core/answer/check";
import type {
  DisplayChoice,
  DisplayItem,
  PictureInfo,
} from "@/core/answer/display";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";

/** 조각 단추 글(정본 밖 문구 표 배치 · 쓰기 조각 행, C72). */
export const ANSWER_TEXT = {
  next: "다음",
  listenAgain: "다시 듣기",
} as const;

/** 평가 지문에는 그림을 붙이지 않는다(배치 문항에 지문 그림 낱말 칸이 없다) — 빈 찾기. */
const NO_PICTURES: PictureLookup = {
  ofWord: (word) => ({ meaningKo: word, catalogued: false }),
  ofKey: (key) => ({ meaningKo: key, catalogued: false }),
};

/** 그림 하나 — 파일을 읽지 못하면 뜻 글로(VocabPicture 의 그림 없음 꼴). */
export function AnswerPicture({ picture }: { picture: PictureInfo }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
    if (!picture.src) return;
    const probe = new window.Image();
    probe.onerror = () => setBroken(true);
    probe.src = picture.src;
    return () => {
      probe.onerror = null;
    };
  }, [picture.src]);
  return (
    <VocabPicture
      picture={
        broken
          ? { meaningKo: picture.meaningKo, catalogued: picture.catalogued }
          : picture
      }
    />
  );
}

/** 읽어 주기 단추('다시 듣기'). 처음 그려질 때 한 번 저절로 읽는다(autoPlay). */
export function SoundButton({
  speech,
  text,
  autoPlay = true,
}: {
  speech: SpeechPort | undefined;
  text: string;
  autoPlay?: boolean;
}) {
  useEffect(() => {
    if (!autoPlay || !speech) return;
    void speech.speak(text);
    return () => speech.cancelSpeaking();
  }, [autoPlay, speech, text]);
  return (
    <SmallButton
      className="self-start"
      data-sound=""
      disabled={!speech}
      onClick={() => {
        speech?.unlockFromGesture();
        void speech?.speak(text);
      }}
    >
      <Volume2 aria-hidden className="size-7" />
      {ANSWER_TEXT.listenAgain}
    </SmallButton>
  );
}

function ChoiceOption({
  choice,
  no,
  selected,
  disabled,
  onSelect,
}: {
  choice: DisplayChoice;
  no: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-touch=""
      data-answer-choice={no}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        CHILD_SIZE.choice,
        CHILD_SIZE.target,
        FOCUS_RING,
        "relative flex w-full items-center gap-3 rounded-xl border-2 border-ink bg-paper px-5 py-3 text-left text-ink",
        choice.kind === "picture" && "justify-center",
        selected && SELECTED_RING,
      )}
    >
      {choice.kind === "text" ? (
        <span lang="en">{choice.text}</span>
      ) : (
        <AnswerPicture picture={choice.picture} />
      )}
      {selected ? <SelectedMark /> : null}
    </button>
  );
}

type ChoiceItem = Extract<
  DisplayItem,
  { type: "reading" | "pick-word" | "listening" }
>;

export function ChoiceAnswer({
  item,
  level,
  speech,
  disabled = false,
  onAnswer,
}: {
  item: ChoiceItem;
  level: number;
  speech?: SpeechPort;
  disabled?: boolean;
  onAnswer: (answer: Answer) => void;
}) {
  const [picked, setPicked] = useState<number | undefined>();
  const pictures = item.choices.some((c) => c.kind === "picture");
  return (
    <div className="flex flex-col gap-6">
      {item.type === "reading" ? (
        <div className="flex flex-col gap-5">
          <ReadingPassage
            passage={item.passage}
            level={level}
            pictures={NO_PICTURES}
            readAloud={false}
            decorativePictures
          />
          <EnglishLine className="font-bold">{item.prompt}</EnglishLine>
        </div>
      ) : null}
      {item.type === "pick-word" ? (
        <div className="flex justify-center">
          <AnswerPicture picture={item.picture} />
        </div>
      ) : null}
      {item.type === "listening" ? (
        <div className="flex flex-col gap-4">
          <SoundButton speech={speech} text={item.script} />
          {item.prompt ? (
            <EnglishLine className="font-bold">{item.prompt}</EnglishLine>
          ) : null}
        </div>
      ) : null}
      <ol
        className={cn(
          "grid gap-4",
          pictures ? "grid-cols-2" : "grid-cols-1 landscape:grid-cols-2",
        )}
      >
        {item.choices.map((choice, i) => (
          // 보기 차례는 시드 그대로라 번호가 열쇠다
          // biome-ignore lint/suspicious/noArrayIndexKey: 보기 번호(1부터)가 곧 답이다
          <li key={i}>
            <ChoiceOption
              choice={choice}
              no={i + 1}
              selected={picked === i + 1}
              disabled={disabled}
              onSelect={() => setPicked(i + 1)}
            />
          </li>
        ))}
      </ol>
      <BigButton
        className="self-end"
        disabled={disabled || picked === undefined}
        onClick={() => {
          if (picked !== undefined) onAnswer({ kind: "choice", no: picked });
        }}
      >
        {ANSWER_TEXT.next}
      </BigButton>
    </div>
  );
}
