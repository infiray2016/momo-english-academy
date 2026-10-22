"use client";

// 글자 타일 · 낱말 카드 답 조각(plan-p10a 파일별 값 11 · 정할 것 차 · 13절 C73, 목업 B_W3_Order).
// copy-tiles · build-tiles · fill-letters 는 글자 타일, assemble-phrase · assemble-sentence 는 낱말 카드다.
// 남은 타일을 누르면 다음 자리로, 놓인 것을 누르면 돌아간다. '처음부터' · '다 놓았어요'. 문장 조립은 첫 칸에 놓인 낱말 카드에
// '대문자' 단추(첫 글자를 대문자로 — 시드 카드는 소문자 그대로, 마침표 카드는 따로). 채점하지 않고 onAnswer 하나로 놓은 것을 넘긴다.
// P11 세션(plan-p11a 값 11)은 선택 속성 initial · onChange(놓은 것 되살리기) · reveal(정답 조각을 차례대로 보이기 — 누를 것 없음) ·
// slots(조립의 놓는 칸을 카드 수만큼 — 칸 너비는 모두 같게, '대문자'는 놓는 줄 오른쪽 끝, 뜻은 제목 글꼴, 목업 B_W3_Order) ·
// needed(놓아야 할 조각 수 — 다 찼을 때만 '다 놓았어요')를 쓴다. 모두 없으면 지금 그대로다(배치 — 위험 5).
import { useEffect, useRef, useState } from "react";
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

/** 놓은 상태(되살리기 · 기기에 쓰기). placed 는 pieces 의 번호 차례. */
export type TilePlacement = { placed: number[]; capital: boolean };

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function TileAnswer({
  item,
  speech,
  disabled = false,
  initial,
  onChange,
  reveal,
  slots = false,
  needed,
  onAnswer,
}: {
  item: TileItem;
  speech?: SpeechPort;
  disabled?: boolean;
  /** 되살릴 놓은 상태(P11 세션 — 같은 기기에서 다시 열 때). */
  initial?: TilePlacement;
  /** 놓은 상태가 바뀔 때마다(P11 세션이 기기에 쓴다). */
  onChange?: (placement: TilePlacement) => void;
  /** 정답 조각(타일 · 카드 차례 그대로). 있으면 놓는 자리에 그것을 보이고 남은 타일 · 단추를 그리지 않는다. */
  reveal?: readonly string[];
  /** 놓는 칸을 조각 수만큼 그린다(조립 — 빈 칸은 점선, 너비는 모두 같게). */
  slots?: boolean;
  /** 놓아야 할 조각 수(P11 세션 — 다 찼을 때만 '다 놓았어요', 더 놓을 수 없음). 없으면 지금 조건(fill-letters 는 빈칸 수, 그 밖은 하나 이상). */
  needed?: number;
  onAnswer: (answer: Answer) => void;
}) {
  const pieces = "cards" in item ? item.cards : item.tiles;
  const cards =
    item.type === "assemble-phrase" || item.type === "assemble-sentence";
  /** 놓은 타일의 차례(pieces 의 번호). */
  const [placed, setPlaced] = useState<number[]>(() =>
    (initial?.placed ?? []).filter(
      (at, i, all) => at >= 0 && at < pieces.length && all.indexOf(at) === i,
    ),
  );
  const [capital, setCapital] = useState(initial?.capital ?? false);
  const changed = useRef(onChange);
  changed.current = onChange;
  const first = useRef(true);
  useEffect(() => {
    // 처음 그림(되살린 값)은 다시 쓰지 않는다
    if (first.current) {
      first.current = false;
      return;
    }
    changed.current?.({ placed, capital });
  }, [placed, capital]);
  const blanks =
    needed ??
    (item.type === "fill-letters"
      ? [...item.pattern].filter((c) => c === BLANK_LETTER).length
      : undefined);
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
  /** 가장 긴 조각(빈 칸 너비를 모두 같게 잡는 숨은 글). */
  const widest = pieces.reduce(
    (long, piece) => (piece.length > long.length ? piece : long),
    "",
  );
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
        slots ? (
          // 세션: 이 뜻이 화면의 할 일이라 제목 글꼴로 크게(화면 검토 review-p11-3-design M-3, 목업 B_W3_Order)
          <p
            data-assemble-meaning=""
            className="font-heading text-[32px] leading-tight"
          >
            {item.meaningKo}
          </p>
        ) : (
          <GuideLine className="font-bold">{item.meaningKo}</GuideLine>
        )
      ) : null}
      {item.type === "fill-letters" ? (
        <div className="flex items-start gap-5">
          <AnswerPicture picture={item.picture} />
          <SoundButton speech={speech} text={item.audioText} />
        </div>
      ) : null}

      {/* 놓는 자리(정답 보이기면 정답 조각) */}
      {reveal ? (
        <RevealRow item={item} reveal={reveal} />
      ) : item.type === "fill-letters" ? (
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
              data-slot="placed"
              className="flex flex-col items-center gap-2"
            >
              {placedButton(at, slot)}
              {slot === 0 && canCapital && !slots ? (
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
          {slots
            ? pieces.slice(placed.length).map((_, i) => (
                <span
                  // 빈 칸은 남은 수만큼 — 차례가 곧 자리다
                  // biome-ignore lint/suspicious/noArrayIndexKey: 빈 칸 자리 번호
                  key={`slot-${i}`}
                  data-slot="empty"
                  aria-hidden
                  className={cn(
                    CHILD_SIZE.choice,
                    CHILD_SIZE.target,
                    "flex items-center rounded-xl border-2 border-dashed border-ink bg-paper/60 font-bold",
                  )}
                >
                  {/* 칸 너비는 모두 가장 긴 조각만큼 — 칸 모양이 차례를 가리키지 않게(화면 검토 review-p11-3-design I-1) */}
                  <span className="invisible px-4">{widest}</span>
                </span>
              ))
            : null}
          {slots && cards ? (
            // 세션: '대문자'는 놓는 줄 오른쪽 끝. 자리를 처음부터 잡아 두어(첫 카드 전에는 꺼짐) 카드를 놓을 때 줄이 밀리지 않는다
            // (화면 검토 review-p11-3-design M-4 · 재검토 N-1)
            <SmallButton
              aria-pressed={capital}
              data-capital=""
              disabled={disabled || !canCapital}
              onClick={() => setCapital(!capital)}
              className={cn("ml-auto px-4", capital && "border-4")}
            >
              {TILE_TEXT.capital}
            </SmallButton>
          ) : null}
        </div>
      )}

      {reveal ? null : (
        <>
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
                      disabled ||
                      (blanks !== undefined && placed.length >= blanks)
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
        </>
      )}
    </div>
  );
}

/** 정답 조각 줄(누를 것 없음 — '정답은 이거예요', C77 (2)). fill-letters 는 무늬의 빈 자리에 채운다. */
function RevealRow({
  item,
  reveal,
}: {
  item: TileItem;
  reveal: readonly string[];
}) {
  const piece = (text: string, key: string | number) => (
    <span
      key={key}
      data-reveal-tile=""
      lang="en"
      className={cn(TILE_FRAME, "shadow-none")}
    >
      {text}
    </span>
  );
  if (item.type === "fill-letters") {
    let slot = 0;
    return (
      <p lang="en" data-answer-row="" className="flex flex-wrap gap-2">
        {[...item.pattern].map((letter, i) => {
          if (letter !== BLANK_LETTER)
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
          const text = reveal[slot] ?? "";
          slot += 1;
          return piece(text, i);
        })}
      </p>
    );
  }
  return (
    <div
      data-answer-row=""
      className="flex min-h-20 flex-wrap items-start gap-3 rounded-xl border-2 border-dashed border-ink bg-white p-3"
    >
      {reveal.map((text, i) => piece(text, i))}
    </div>
  );
}
