"use client";

// 글자 타일 · 낱말 카드 답 조각(plan-p10a 파일별 값 11 · 정할 것 차 · 13절 C73, 목업 B_W3_Order).
// copy-tiles · build-tiles · fill-letters 는 글자 타일, assemble-phrase · assemble-sentence 는 낱말 카드다.
// 남은 타일을 누르면 다음 자리로, 놓인 것을 누르면 돌아간다. '처음부터' · '다 놓았어요'. 문장 조립은 첫 칸에 놓인 낱말 카드에
// '대문자' 단추(첫 글자를 대문자로 — 시드 카드는 소문자 그대로, 마침표 카드는 따로). 채점하지 않고 onAnswer 하나로 놓은 것을 넘긴다.
import { useState } from "react";
import {
  CHILD_SIZE,
  EnglishLine,
  GuideLine,
} from "@/components/activities/common";
import { BigButton, FOCUS_RING, SmallButton } from "@/components/board/board";
import type { Answer } from "@/core/answer/check";
import type { DisplayItem } from "@/core/answer/display";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import { AnswerPicture, SoundButton } from "./choice";

/** 조각 단추 글(정본 밖 문구 표 쓰기 조각 행, C72). */
export const TILE_TEXT = {
  reset: "처음부터",
  done: "다 놓았어요",
  capital: "대문자",
} as const;

/** fill-letters 무늬의 빈 글자 자리(P4a). */
const BLANK_LETTER = "_";
/** 앞 카드에 붙는 문장 부호 카드(대문자 단추를 달지 않는다). */
const PUNCTUATION_CARD = /^[.,?!]$/;

type TileItem = Extract<
  DisplayItem,
  {
    type:
      | "copy-tiles"
      | "build-tiles"
      | "fill-letters"
      | "assemble-phrase"
      | "assemble-sentence";
  }
>;

const TILE_FRAME = cn(
  CHILD_SIZE.choice,
  CHILD_SIZE.target,
  FOCUS_RING,
  "flex items-center justify-center rounded-xl border-2 border-ink bg-paper px-4 font-bold text-ink shadow-sm disabled:cursor-not-allowed",
);

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function TileAnswer({
  item,
  speech,
  disabled = false,
  onAnswer,
}: {
  item: TileItem;
  speech?: SpeechPort;
  disabled?: boolean;
  onAnswer: (answer: Answer) => void;
}) {
  const pieces = "cards" in item ? item.cards : item.tiles;
  const cards =
    item.type === "assemble-phrase" || item.type === "assemble-sentence";
  /** 놓은 타일의 차례(pieces 의 번호). */
  const [placed, setPlaced] = useState<number[]>([]);
  const [capital, setCapital] = useState(false);
  const blanks =
    item.type === "fill-letters"
      ? [...item.pattern].filter((c) => c === BLANK_LETTER).length
      : undefined;
  const full =
    blanks === undefined ? placed.length > 0 : placed.length === blanks;
  const textOf = (at: number, slot: number) => {
    const piece = pieces[at] ?? "";
    return cards && slot === 0 && capital ? capitalize(piece) : piece;
  };

  const place = (at: number) => {
    if (blanks !== undefined && placed.length >= blanks) return;
    setPlaced([...placed, at]);
  };
  const takeBack = (slot: number) => {
    setPlaced(placed.filter((_, i) => i !== slot));
    if (slot === 0) setCapital(false);
  };

  const placedButton = (at: number, slot: number) => (
    <button
      type="button"
      data-touch=""
      data-placed-tile={slot}
      lang="en"
      disabled={disabled}
      onClick={() => takeBack(slot)}
      className={TILE_FRAME}
    >
      {textOf(at, slot)}
    </button>
  );

  const firstCard = placed[0];
  const canCapital =
    cards &&
    firstCard !== undefined &&
    !PUNCTUATION_CARD.test(pieces[firstCard] ?? "");

  return (
    <div className="flex flex-col gap-6">
      {item.type === "copy-tiles" ? (
        <EnglishLine className="font-bold">{item.word}</EnglishLine>
      ) : null}
      {item.type === "build-tiles" ? (
        <GuideLine className="font-bold">{item.meaningKo}</GuideLine>
      ) : null}
      {cards && item.meaningKo ? (
        <GuideLine className="font-bold">{item.meaningKo}</GuideLine>
      ) : null}
      {item.type === "fill-letters" ? (
        <div className="flex items-start gap-5">
          <AnswerPicture picture={item.picture} />
          <SoundButton speech={speech} text={item.audioText} />
        </div>
      ) : null}

      {/* 놓는 자리 */}
      {item.type === "fill-letters" ? (
        <p lang="en" data-answer-row="" className="flex flex-wrap gap-2">
          {(() => {
            let slot = 0;
            return [...item.pattern].map((letter, i) => {
              if (letter !== BLANK_LETTER) {
                return (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: 무늬의 글자 자리는 차례가 곧 자리다
                    key={i}
                    className={cn(
                      CHILD_SIZE.english,
                      CHILD_SIZE.target,
                      "flex items-center justify-center font-bold",
                    )}
                  >
                    {letter}
                  </span>
                );
              }
              const mine = slot;
              slot += 1;
              const at = placed[mine];
              return at === undefined ? (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: 무늬의 글자 자리는 차례가 곧 자리다
                  key={i}
                  data-blank=""
                  className={cn(
                    CHILD_SIZE.target,
                    "rounded-xl border-2 border-dashed border-ink bg-white",
                  )}
                />
              ) : (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: 무늬의 글자 자리는 차례가 곧 자리다
                  key={i}
                >
                  {placedButton(at, mine)}
                </span>
              );
            });
          })()}
        </p>
      ) : (
        <div
          data-answer-row=""
          className="flex min-h-20 flex-wrap items-start gap-3 rounded-xl border-2 border-dashed border-ink bg-white p-3"
        >
          {placed.map((at, slot) => (
            // 놓은 타일 번호(pieces 의 차례)는 놓인 것 가운데 하나뿐이다
            <div
              key={`tile-${at}`}
              className="flex flex-col items-center gap-2"
            >
              {placedButton(at, slot)}
              {slot === 0 && canCapital ? (
                <SmallButton
                  aria-pressed={capital}
                  data-capital=""
                  disabled={disabled}
                  onClick={() => setCapital(!capital)}
                  className={cn("px-4", capital && "border-4")}
                >
                  {TILE_TEXT.capital}
                </SmallButton>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* 남은 타일 · 카드 */}
      <ul className="flex flex-wrap gap-3">
        {pieces.map((piece, at) =>
          placed.includes(at) ? null : (
            // biome-ignore lint/suspicious/noArrayIndexKey: 같은 글자 타일이 둘일 수 있어 차례가 열쇠다
            <li key={at}>
              <button
                type="button"
                data-touch=""
                data-tile={piece}
                lang="en"
                disabled={
                  disabled || (blanks !== undefined && placed.length >= blanks)
                }
                onClick={() => place(at)}
                className={TILE_FRAME}
              >
                {piece}
              </button>
            </li>
          ),
        )}
      </ul>

      <div className="flex flex-wrap items-center justify-end gap-4">
        <SmallButton
          disabled={disabled || placed.length === 0}
          onClick={() => {
            setPlaced([]);
            setCapital(false);
          }}
        >
          {TILE_TEXT.reset}
        </SmallButton>
        <BigButton
          disabled={disabled || !full}
          onClick={() =>
            onAnswer({
              kind: "tiles",
              pieces: placed.map((at, slot) => textOf(at, slot)),
            })
          }
        >
          {TILE_TEXT.done}
        </BigButton>
      </div>
    </div>
  );
}
