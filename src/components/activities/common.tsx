// 활동 표시 컴포넌트의 공통 조각(plan-p05b '활동 표시 컴포넌트', 정할 것 파).
// 아이 화면의 내용 부분만 그린다. 누르는 버튼(다음 · 확인 · 말하기 …) · 상태 · 진행 표시 · 세션 틀은 P10 · P11 이다.
// 훅 · 'use client' · server-only 가 없어 서버 · 클라이언트 둘 다에서 속성만으로 그린다. 보기 · 타일은 누를 수 없는 버튼 꼴이다
// (aria-disabled, P11 이 동작을 더한다). 포스트잇 색까지 두고 코르크 바탕 · 종이 띠 · 글꼴은 P10 의 board 가 맡는다.
import { Check, Volume2 } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import type { Area } from "@/core/seed/structure";
import { cn } from "@/lib/utils";

/**
 * 4절 아이 화면 크기(잠정, 10.9형 태블릿 기준, 사용 시험 뒤 바뀔 수 있다). 클래스 이름은 여기 한곳에만 둔다.
 * 안내 · 한국어 뜻 20px 이상 · 영어 학습 문장 24px 이상 · 보기 · 버튼 꼴 글자 22px 이상 · 누르는 곳 56 × 56px 이상.
 */
export const CHILD_SIZE = {
  /** 안내 · 한국어 뜻(20px). */
  guide: "text-xl",
  /** 영어 학습 문장(24px). */
  english: "text-2xl",
  /** 보기 · 타일 · 버튼 꼴 글자(24px, 22px 이상). */
  choice: "text-2xl",
  /** 누르는 곳(56 × 56px). 글자 칸도 같다. */
  target: "min-h-14 min-w-14",
  /** 문장 틀 빈칸 높이(누르는 곳이 될 때 56px 이상). */
  blank: "min-h-14",
} as const;

/** 지문 위 단어 그림의 상한(화면 구조 수, 13절 C67 (6), P10 이 옮길 수 있다). */
export const PASSAGE_PICTURE_MAX = 4;
/** 지문 옆 단어 그림을 붙이는 마지막 단계(3.3 '1~4단계 그림은 어휘 시드의 그림 자산', C67 (6)). */
export const PASSAGE_PICTURE_UNTIL_LEVEL = 4;

/** 단어 그림 정사각 한 변(px, 화면 꼴 값). 클래스 size-40 과 같다. */
export const PICTURE_PX = 160;
const PICTURE_BOX = "size-40";

/** 영역 색(포스트잇 노랑 읽기 · 하늘 쓰기 · 분홍 말하기 · 연두 회화, 목업 B_Home4 의 색 — 값은 globals.css 보드 토큰, P10). */
export const AREA_TONE = {
  reading: { name: "노랑", className: "bg-postit-reading" },
  writing: { name: "하늘", className: "bg-postit-writing" },
  speaking: { name: "분홍", className: "bg-postit-speaking" },
  talk: { name: "연두", className: "bg-postit-talk" },
} as const satisfies Record<Area, { name: string; className: string }>;

/** 종이 색(목업의 포스트잇 위 종이 · 보기 바탕 — 보드 토큰 paper, P10). */
const PAPER = "bg-paper";
/** 보기 · 타일 · 소리 자리의 버튼 꼴(누를 수 없는 모습, 4절 크기). */
const CHOICE_FRAME = cn(
  CHILD_SIZE.choice,
  CHILD_SIZE.target,
  PAPER,
  "rounded-xl border-2 border-neutral-900 text-neutral-900",
);

/**
 * 그림 찾기 결과: 한국어 뜻(그림의 alt · 그림이 없을 때 보이는 글), 그림 파일(public/ 아래 경로, 파일이 있을 때만),
 * 그림 카탈로그에 그 낱말 · 키의 그림이 있는가(파일이 아직 없어도 참, 지문 그림 고르기에 쓴다).
 */
export type PictureInfo = {
  meaningKo: string;
  src?: string;
  catalogued: boolean;
};
/** 단어 id · 그림 키로 그림을 찾는다(보기 화면은 seed 의 vocab · images, P11 은 DB). */
export type PictureLookup = {
  ofWord: (word: string) => PictureInfo;
  ofKey: (key: string) => PictureInfo;
};

/** 영역 색의 둥근 활동 카드. className 으로 P10 의 board 가 덮는다. */
export function ActivityCard({
  area,
  className,
  children,
}: {
  area: Area;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-activity-card=""
      className={cn(
        "flex flex-col gap-6 rounded-2xl p-8 text-neutral-900 shadow-md",
        // 안쪽 글의 기본 크기는 안내 크기다(크기를 주지 않은 글 · 그림 대체 글이 물려받는다)
        CHILD_SIZE.guide,
        AREA_TONE[area].className,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 영어 학습 문장 한 줄(24px, lang="en"). */
export function EnglishLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p lang="en" className={cn(CHILD_SIZE.english, "leading-snug", className)}>
      {children}
    </p>
  );
}

/** 안내 · 한국어 뜻 한 줄(20px). */
export function GuideLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn(CHILD_SIZE.guide, className)}>{children}</p>;
}

/**
 * 단어 그림 하나(정사각, next/image unoptimized — .svg 는 Next 가 그대로 낸다). 그림이 없으면 한국어 뜻 글이고,
 * 그 글은 크기를 주지 않아 부모(카드 20px · 보기 24px)를 물려받는다.
 */
export function VocabPicture({
  picture,
  decorative = false,
}: {
  picture: PictureInfo;
  /**
   * 꾸밈 그림(평가 지문): alt 를 비우고 보조 기술에서 숨기며, 파일이 없으면 아무것도 그리지 않는다
   * (평가 중에는 뜻 보기가 없다, 4절 배치 · 단계 평가 행).
   */
  decorative?: boolean;
}) {
  if (picture.src) {
    return (
      <Image
        src={picture.src}
        alt={decorative ? "" : picture.meaningKo}
        aria-hidden={decorative ? true : undefined}
        width={PICTURE_PX}
        height={PICTURE_PX}
        unoptimized
        className={cn(PICTURE_BOX, "shrink-0 object-contain")}
      />
    );
  }
  if (decorative) return null;
  return (
    <span
      data-picture-missing=""
      className={cn(
        PICTURE_BOX,
        "flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-neutral-500 bg-white p-2 text-center",
      )}
    >
      {picture.meaningKo}
    </span>
  );
}

/** 보기 하나: 글(영어) 또는 그림(단어 id). */
export type Choice =
  | { kind: "text"; text: string }
  | { kind: "picture"; picture: PictureInfo };

/** 정답 표시 배지(✓ 원, 보조 기술에는 '정답'). */
function CorrectBadge({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="정답"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white",
        className,
      )}
    >
      <Check aria-hidden="true" strokeWidth={3} className="size-6" />
    </span>
  );
}

/**
 * 보기 목록(누를 수 없는 버튼 꼴). reveal 이면 정답 보기에 4px 테두리 · ✓ 원 배지 · data-correct="true" 를 둔다
 * (바탕은 종이 그대로라 네 영역 색과 겹치지 않는다). 그림 보기의 배지는 모서리에 겹쳐 그림 자리를 밀지 않는다.
 * 보기 화면은 참, P11 은 3.3 '틀리면 정답을 보여 주고 다시 한다'에 쓴다.
 */
export function ChoiceList({
  choices,
  answerNo,
  reveal = false,
}: {
  choices: readonly Choice[];
  answerNo?: number;
  reveal?: boolean;
}) {
  const numbered = choices.map((choice, i) => ({ choice, no: i + 1 }));
  const pictures = choices.some((choice) => choice.kind === "picture");
  return (
    <ol className={cn("grid gap-3", pictures ? "grid-cols-2" : "grid-cols-1")}>
      {numbered.map(({ choice, no }) => {
        const correct = reveal && answerNo === no;
        return (
          <li key={no}>
            <button
              type="button"
              aria-disabled="true"
              data-choice=""
              data-correct={correct ? "true" : undefined}
              className={cn(
                CHOICE_FRAME,
                "relative flex w-full items-center gap-3 px-5 py-3 text-left",
                pictures && "justify-center",
                correct && "border-4 font-bold",
              )}
            >
              {choice.kind === "text" ? (
                <span lang="en">{choice.text}</span>
              ) : (
                <VocabPicture picture={choice.picture} />
              )}
              {correct ? (
                <CorrectBadge
                  className={pictures ? "absolute top-2 right-2" : "ml-auto"}
                />
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** 글자 타일 · 단어 카드 줄(누를 수 없는 버튼 꼴, 영어). 같은 글자가 둘 있어도 따로 둔다. */
export function TileRow({ tiles }: { tiles: readonly string[] }) {
  const numbered = tiles.map((tile, i) => ({ tile, no: i + 1 }));
  return (
    <ul className="flex flex-wrap gap-3">
      {numbered.map(({ tile, no }) => (
        <li key={no}>
          <button
            type="button"
            aria-disabled="true"
            data-choice=""
            lang="en"
            className={cn(
              CHOICE_FRAME,
              "flex items-center justify-center px-4 font-bold shadow-sm",
            )}
          >
            {tile}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** 답을 놓거나 쓰는 빈 칸. reveal 이고 답이 있으면 정답을 보인다(data-correct="true"). */
export function AnswerBox({
  answer,
  reveal = false,
  tall = false,
}: {
  answer?: string;
  reveal?: boolean;
  tall?: boolean;
}) {
  const shown = reveal && answer !== undefined;
  return (
    <div
      data-correct={shown ? "true" : undefined}
      className={cn(
        "flex w-full items-center rounded-xl border-2 border-dashed border-neutral-700 bg-white px-5",
        tall ? "min-h-40 items-start py-4" : "min-h-16",
      )}
    >
      {shown ? (
        <span lang="en" className={cn(CHILD_SIZE.english, "font-bold")}>
          {answer}
        </span>
      ) : null}
    </div>
  );
}

/** 새 단어 미리보기 한 단어(낱말 · 뜻 · 예문). */
export type PreviewEntry = { word: string; meaningKo: string; example: string };

/** 새 단어 미리보기(3.3 첫 활동). 머리말은 목업 B_Reading 의 '오늘의 새 단어'. */
export function NewWordsPreview({
  entries,
}: {
  entries: readonly PreviewEntry[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <GuideLine className="font-bold">오늘의 새 단어</GuideLine>
      <ul className="flex flex-col gap-4">
        {entries.map((entry) => (
          <li
            key={entry.word}
            className={cn(PAPER, "flex flex-col gap-1 rounded-xl px-5 py-3")}
          >
            <span className="flex flex-wrap items-center gap-4">
              <SoundMark />
              <span lang="en" className={cn(CHILD_SIZE.english, "font-bold")}>
                {entry.word}
              </span>
              <span className={CHILD_SIZE.guide}>{entry.meaningKo}</span>
            </span>
            <EnglishLine>{entry.example}</EnglishLine>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 소리 자리(누를 수 없는 버튼 꼴, 글자 없음). 이름표는 목업의 '다시 듣기'(지문은 B_Reading 의 '읽어 주기'). 읽어 줄 글은 그리지 않는다. */
export function SoundMark({
  label = "다시 듣기",
}: {
  label?: "다시 듣기" | "읽어 주기";
}) {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={label}
      data-choice=""
      className={cn(
        CHOICE_FRAME,
        "inline-flex items-center justify-center self-start rounded-full",
      )}
    >
      <Volume2 aria-hidden="true" className="size-8" />
    </button>
  );
}

/** 영어 틀의 빈칸(밑줄 셋 이상)을 빈 칸 모양으로 바꿔 그린다. */
export function FrameText({ frame }: { frame: string }) {
  const parts: { text: string; blank: boolean; at: number }[] = [];
  const blank = /_{3,}/g;
  let last = 0;
  for (const match of frame.matchAll(blank)) {
    const at = match.index ?? 0;
    if (at > last)
      parts.push({ text: frame.slice(last, at), blank: false, at: last });
    parts.push({ text: "", blank: true, at });
    last = at + match[0].length;
  }
  if (last < frame.length)
    parts.push({ text: frame.slice(last), blank: false, at: last });
  return (
    <EnglishLine>
      {parts.map((part) =>
        part.blank ? (
          <span
            key={part.at}
            data-blank=""
            className={cn(
              CHILD_SIZE.blank,
              // 바탕이 보이는 쓰는 자리(목업 B_Writing). 아래 굵은 테두리를 글줄 바닥에 맞춘다(align-bottom)
              "mx-1 inline-block w-32 rounded-t-lg border-b-4 border-neutral-900 bg-white align-bottom",
            )}
          />
        ) : (
          <span key={part.at}>{part.text}</span>
        ),
      )}
    </EnglishLine>
  );
}
