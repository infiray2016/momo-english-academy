"use client";

// 고르기 답 조각(plan-p10a 파일별 값 11): 읽기 문제(그림 · 글 보기) · 쓰기 pick-word · 말하기 듣고 고르기.
// 문항 몸통은 P5b 조각(ReadingPassage · EnglishLine · VocabPicture)으로 그리고 누르는 보기만 더한다. 채점하지 않고
// '다음'에서 onAnswer 하나로 고른 번호를 넘긴다(배치는 서버가 채점, P11 은 세션 규칙을 더한다 — 위험 12).
// 평가 중에는 정오를 보이지 않는다(정할 것 처). 그림은 카탈로그 경로를 믿고, 읽지 못하면 뜻 글로 바꾼다(정할 것 파).
// P11 세션(plan-p11a 값 11)은 선택 속성 initial · onChange(같은 입력 되살리기) · reveal(정답 보이기 — 고를 수 없고 '다음' 없음) ·
// instant(고르면 바로 냄 — 내기 '다음' 없음, 읽기 문항과 같은 꼴 · 가로 화면 그림 고르기는 그림을 보기 왼쪽에)를 쓴다.
// 모두 없으면 지금 그대로다(배치 — 위험 5).
import { Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

/** 틀린 보기 표(✕)의 선 굵기 — 고른 표시(SelectedMark 체크)와 같은 굵기(화면 꼴 값). */
const MARK_STROKE = 3;

/** 정답 보이기의 보기 상태: answer 정답 · wrong 고른 오답. */
type RevealState = "answer" | "wrong";

function ChoiceOption({
  choice,
  no,
  selected,
  disabled,
  revealed,
  compact = false,
  onSelect,
}: {
  choice: DisplayChoice;
  no: number;
  selected: boolean;
  disabled: boolean;
  revealed?: RevealState;
  /** 가로 화면에서 그림 칸을 줄인다(P11 세션 듣기 이해 — 고른 뒤 '다음'이 보는 창에 들게, 화면 검토 review-p11-4-design M-2). */
  compact?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-touch=""
      data-answer-choice={no}
      data-choice-state={revealed}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        CHILD_SIZE.choice,
        CHILD_SIZE.target,
        FOCUS_RING,
        "relative flex w-full items-center gap-3 rounded-xl border-2 border-ink bg-paper px-5 py-3 text-left text-ink",
        choice.kind === "picture" && "justify-center",
        compact &&
          choice.kind === "picture" &&
          "landscape:py-1 landscape:[&_[data-picture-missing]]:size-28 landscape:[&_img]:size-28",
        (selected || revealed) && SELECTED_RING,
        revealed === "wrong" && "opacity-70",
      )}
    >
      {choice.kind === "text" ? (
        <span lang="en">{choice.text}</span>
      ) : (
        <AnswerPicture picture={choice.picture} />
      )}
      {revealed === "wrong" ? (
        <span
          aria-hidden
          className="absolute -top-3 -right-3 flex size-9 items-center justify-center rounded-full border-2 border-ink bg-paper text-ink"
        >
          <X className="size-6" strokeWidth={MARK_STROKE} />
        </span>
      ) : selected || revealed === "answer" ? (
        <SelectedMark />
      ) : null}
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
  initial,
  onChange,
  reveal,
  instant = false,
  struck = [],
  onAnswer,
}: {
  item: ChoiceItem;
  level: number;
  speech?: SpeechPort;
  disabled?: boolean;
  /** 되살릴 고른 번호(P11 세션 — 같은 기기에서 다시 열 때). */
  initial?: number;
  /** 고를 때마다(P11 세션이 기기에 쓴다). */
  onChange?: (no: number) => void;
  /** 정답 보이기(P11 세션 — 정답 번호 · 고른 번호, 정답 번호가 없으면 고른 오답 ✕ 만). 고를 수 없고 '다음'을 그리지 않는다. */
  reveal?: { answerNo?: number; picked?: number };
  /** 고르면 바로 낸다(P11 세션 — 내기 '다음'을 그리지 않음, 화면 검토 review-p11-3-design M-2). */
  instant?: boolean;
  /** 앞서 고른 오답(P11 세션 — ✕ 로 남고 다시 고를 수 없음). */
  struck?: readonly number[];
  onAnswer: (answer: Answer) => void;
}) {
  const [picked, setPicked] = useState<number | undefined>(initial);
  const changed = useRef(onChange);
  changed.current = onChange;
  const pictures = item.choices.some((c) => c.kind === "picture");
  const revealOf = (no: number): RevealState | undefined => {
    if (reveal && no === reveal.answerNo) return "answer";
    if (struck.includes(no)) return "wrong";
    if (!reveal) return undefined;
    return no === reveal.picked ? "wrong" : undefined;
  };
  // 세션 그림 고르기는 가로 화면에서 그림을 보기 왼쪽에(세로로 쌓여 넘치지 않게 — 화면 검토 M-1)
  const side = instant && item.type === "pick-word";
  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        side &&
          "landscape:grid landscape:grid-cols-[auto_1fr] landscape:items-center",
      )}
    >
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
          "grid",
          // P11 세션은 표시된 보기가 이어져도 고리가 붙지 않게 틈을 넓힌다(화면 검토 review-p11-fix2-design N-2)
          onChange ? "gap-5" : "gap-4",
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
              selected={!reveal && picked === i + 1}
              disabled={
                disabled || reveal !== undefined || struck.includes(i + 1)
              }
              revealed={revealOf(i + 1)}
              compact={instant}
              onSelect={() => {
                setPicked(i + 1);
                changed.current?.(i + 1);
                if (instant) onAnswer({ kind: "choice", no: i + 1 });
              }}
            />
          </li>
        ))}
      </ol>
      {reveal || instant ? null : (
        <BigButton
          className="self-end"
          disabled={disabled || picked === undefined}
          onClick={() => {
            if (picked !== undefined) onAnswer({ kind: "choice", no: picked });
          }}
        >
          {ANSWER_TEXT.next}
        </BigButton>
      )}
    </div>
  );
}
