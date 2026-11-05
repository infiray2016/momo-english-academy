"use client";

// 글자 타일 · 낱말 카드 답 조각(plan-p10a 파일별 값 11 · 정할 것 차 · 13절 C73, 목업 B_W3_Order).
// copy-tiles · build-tiles · fill-letters 는 글자 타일, assemble-phrase · assemble-sentence 는 낱말 카드다.
// 남은 타일을 누르면 다음 자리로, 놓인 것을 누르면 돌아간다. '처음부터' · '다 놓았어요'. 문장 조립은 첫 칸에 놓인 낱말 카드에
// '대문자' 단추(첫 글자를 대문자로 — 시드 카드는 소문자 그대로, 마침표 카드는 따로). 채점하지 않고 onAnswer 하나로 놓은 것을 넘긴다.
// P11 세션(plan-p11a 값 11)은 선택 속성 initial · onChange(놓은 것 되살리기) · reveal(정답 조각을 차례대로 보이기 — 누를 것 없음) ·
// slots(조립의 놓는 칸을 카드 수만큼 — 칸 너비는 모두 같게, '대문자'는 놓는 줄 오른쪽 끝, 뜻은 제목 글꼴, 목업 B_W3_Order) ·
// needed(놓아야 할 조각 수 — 다 찼을 때만 '다 놓았어요')를 쓴다. 모두 없으면 지금 그대로다(배치 — 위험 5).
// 가르치는 수업(가르치고 배우는 수업 plan 묶음 라-2 · 델타 spec 설계 1 '틀린 뒤 차례' 쓰기 행 · 표본 W6 · W7 · W10, 정본 15절 AC-3d · AC-4d):
// 같은 문제 다시는 slotRoles(칸마다 칩 자리 — 색 칸과 칩 이름표, 정답은 보이지 않음) · flashCapital(대문자 단추 반짝임, 움직임 줄이기
// 설정이면 멈춘 굵은 고리)을 쓴다. 같이 해 보기는 TogetherCards — 앱이 놓아 둔 카드 사이 빈칸에 남은 카드를 놓거나(빈칸 수 = 남은 카드 수,
// C174 (3)) 대문자 단추를 누른다. 시도는 빈칸 차례의 카드(pieces)이고, 대문자 단추 문항은 맞출 칸이 없는 시도 하나다(장부 L-34 계약).
import { useEffect, useRef, useState } from "react";
import {
  CHILD_SIZE,
  EnglishLine,
  GuideLine,
} from "@/components/activities/common";
import { BigButton, FOCUS_RING, SmallButton } from "@/components/board/board";
import { CHIP_NAME, CHIP_TONE } from "@/components/session/teach/chips";
import type { Answer } from "@/core/answer/check";
import type { DisplayItem } from "@/core/answer/display";
import type { TeachChipRole } from "@/core/seed/structure";
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

/** 대문자 단추 반짝임(움직임 줄이기 설정이면 고리만 — 멈춘 강조, 설계 1 쓰기 행). */
const CAPITAL_FLASH = "ring-4 ring-ink ring-offset-2 motion-safe:animate-pulse";

/**
 * 조립의 빈 칸(점선 · 너비는 가장 긴 조각만큼 — 칸 모양이 차례를 가리키지 않게, 화면 검토 review-p11-3-design I-1). role 이 있으면(같은 문제 다시)
 * 칸을 칩 색으로 칠하고 아래에 칩 이름표를 단다(색 칸 — 정답 낱말은 보이지 않는다).
 */
function EmptySlot({
  widest,
  role,
}: {
  widest: string;
  role?: TeachChipRole | undefined;
}) {
  const box = (
    <span
      data-slot="empty"
      data-slot-tone={role}
      aria-hidden
      className={cn(
        CHILD_SIZE.choice,
        CHILD_SIZE.target,
        "flex items-center rounded-xl border-2 border-dashed border-ink font-bold",
        role ? CHIP_TONE[role] : "bg-paper/60",
      )}
    >
      <span className="invisible px-4">{widest}</span>
    </span>
  );
  if (!role) return box;
  return (
    <div className="flex flex-col items-center gap-2">
      {box}
      <SlotTag role={role} />
    </div>
  );
}

/** 칸 아래 칩 이름표(같은 문제 다시의 색 칸 — 칩 색 · 이름은 라-1 칩 표 그대로). */
function SlotTag({ role }: { role: TeachChipRole }) {
  return (
    <span
      data-slot-role={role}
      lang="ko"
      className={cn(
        CHILD_SIZE.guide,
        "rounded-card border-(length:--paper-edge) border-ink px-3 font-heading leading-snug text-ink",
        CHIP_TONE[role],
      )}
    >
      {CHIP_NAME[role]}
    </span>
  );
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
  slotRoles,
  flashCapital = false,
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
  /** 칸마다 칩 자리(조립 · slots — 같은 문제 다시의 색 칸, 가르치는 수업). 칸 차례 그대로다. */
  slotRoles?: readonly TeachChipRole[];
  /** 대문자 단추를 반짝인다(같은 문제 다시 — 아직 대문자가 아닐 때). */
  flashCapital?: boolean;
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

  /** 칸 아래 칩 이름표(같은 문제 다시 — slots 일 때만). */
  const slotTagAt = (slot: number) => {
    const role = slots ? slotRoles?.[slot] : undefined;
    return role ? <SlotTag role={role} /> : null;
  };
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
                    "rounded-xl border-2 border-dashed border-ink bg-paper",
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
          className="flex min-h-20 flex-wrap items-start gap-3 rounded-xl border-2 border-dashed border-ink bg-paper p-3"
        >
          {placed.map((at, slot) => (
            // 놓은 타일 번호(pieces 의 차례)는 놓인 것 가운데 하나뿐이다
            <div
              key={`tile-${at}`}
              data-slot="placed"
              className="flex flex-col items-center gap-2"
            >
              {placedButton(at, slot)}
              {slotTagAt(slot)}
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
                <EmptySlot
                  // 빈 칸은 남은 수만큼 — 차례가 곧 자리다
                  // biome-ignore lint/suspicious/noArrayIndexKey: 빈 칸 자리 번호
                  key={`slot-${i}`}
                  widest={widest}
                  role={slotRoles?.[placed.length + i]}
                />
              ))
            : null}
          {slots && cards ? (
            // 세션: '대문자'는 놓는 줄 오른쪽 끝. 자리를 처음부터 잡아 두어(첫 카드 전에는 꺼짐) 카드를 놓을 때 줄이 밀리지 않는다
            // (화면 검토 review-p11-3-design M-4 · 재검토 N-1)
            <SmallButton
              aria-pressed={capital}
              data-capital=""
              data-capital-flash={flashCapital && !capital ? "" : undefined}
              disabled={disabled || !canCapital}
              onClick={() => setCapital(!capital)}
              className={cn(
                "ml-auto px-4",
                capital && "border-4",
                flashCapital && !capital && CAPITAL_FLASH,
              )}
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
      className="flex min-h-20 flex-wrap items-start gap-3 rounded-xl border-2 border-dashed border-ink bg-paper p-3"
    >
      {reveal.map((text, i) => piece(text, i))}
    </div>
  );
}

/** 같이 해 보기 카드 시도(빈칸 차례의 카드 — 대문자 단추 문항은 맞출 칸이 없어 빈 시도). */
export type TogetherCardsTry = { pieces?: string[] };

/**
 * 같이 해 보기 쓰기(표본 W6 · W7 · 델타 spec 설계 1 '같이 해 보기의 꼴과 수'): 지금 조립 화면 꼴로 앱이 놓아 둔 카드(cards 의 글, null 은 빈칸)
 * 사이 빈칸에 남은 카드(choices)를 놓는다. 빈칸 수 = 남은 카드 수라 모든 빈칸이 차면 '다 놓았어요'로 시도 하나(pieces = 빈칸 차례의 카드)를
 * 낸다. capitalOnly(대문자 자리 문항)는 카드가 다 놓여 있고 대문자 단추를 누르는 것이 시도다(단추 반짝임). 다시 할 때는 부르는 쪽이 새로 그린다.
 */
export function TogetherCards({
  cards,
  choices,
  capital: capitalAtStart,
  capitalOnly,
  disabled,
  onTry,
}: {
  cards: readonly (string | null)[];
  choices: readonly string[];
  /** 앱이 첫 글자를 이미 대문자로 해 두었나(filled.capital). */
  capital: boolean;
  capitalOnly: boolean;
  disabled: boolean;
  onTry: (attempt: TogetherCardsTry) => void;
}) {
  const blanks = cards.flatMap((card, i) => (card === null ? [i] : []));
  /** 빈칸마다 놓은 남은 카드 번호(choices 의 차례). */
  const [placed, setPlaced] = useState<(number | undefined)[]>(() =>
    blanks.map(() => undefined),
  );
  const [capital, setCapital] = useState(capitalAtStart);
  const full = placed.every((at) => at !== undefined);
  const textAt = (position: number): string | undefined => {
    const fixed = cards[position];
    if (fixed !== null && fixed !== undefined) return fixed;
    const at = placed[blanks.indexOf(position)];
    return at === undefined ? undefined : choices[at];
  };
  const firstWord = cards.findIndex((_, i) => {
    const text = textAt(i);
    return text !== undefined && !PUNCTUATION_CARD.test(text);
  });
  const shown = (position: number, text: string) =>
    capital && position === firstWord ? capitalize(text) : text;
  const widest = [...cards, ...choices].reduce<string>(
    (long, piece) => (piece && piece.length > long.length ? piece : long),
    "",
  );

  return (
    <div data-together-cards="" className="flex flex-col gap-6">
      <div
        data-answer-row=""
        className="flex min-h-20 flex-wrap items-start gap-3 rounded-xl border-2 border-dashed border-ink bg-paper p-3"
      >
        {cards.map((card, position) => {
          if (card !== null) {
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: 칸 차례가 곧 자리다
                key={position}
                data-slot="filled"
                lang="en"
                className={cn(TILE_FRAME, "shadow-none")}
              >
                {shown(position, card)}
              </span>
            );
          }
          const blank = blanks.indexOf(position);
          const at = placed[blank];
          return at === undefined ? (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: 칸 차례가 곧 자리다
              key={position}
              data-slot="empty"
              aria-hidden
              className={cn(
                CHILD_SIZE.choice,
                CHILD_SIZE.target,
                "flex items-center rounded-xl border-2 border-dashed border-ink bg-paper/60 font-bold",
              )}
            >
              <span className="invisible px-4">{widest}</span>
            </span>
          ) : (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: 칸 차례가 곧 자리다
              key={position}
              type="button"
              data-touch=""
              data-placed-tile={blank}
              lang="en"
              disabled={disabled}
              onClick={() =>
                setPlaced(placed.map((p, i) => (i === blank ? undefined : p)))
              }
              className={TILE_FRAME}
            >
              {shown(position, choices[at] ?? "")}
            </button>
          );
        })}
        <SmallButton
          aria-pressed={capital}
          data-capital=""
          data-capital-flash={capitalOnly && !capital ? "" : undefined}
          disabled={disabled || capital || !capitalOnly}
          onClick={() => {
            setCapital(true);
            onTry({});
          }}
          className={cn(
            "ml-auto px-4",
            capital && "border-4",
            capitalOnly && !capital && CAPITAL_FLASH,
          )}
        >
          {TILE_TEXT.capital}
        </SmallButton>
      </div>
      {capitalOnly ? null : (
        <>
          <ul className="flex flex-wrap gap-3">
            {choices.map((choice, at) =>
              placed.includes(at) ? null : (
                // biome-ignore lint/suspicious/noArrayIndexKey: 같은 글 카드가 둘일 수 있어 차례가 열쇠다
                <li key={at}>
                  <button
                    type="button"
                    data-touch=""
                    data-tile={choice}
                    lang="en"
                    disabled={disabled || full}
                    onClick={() => {
                      const blank = placed.indexOf(undefined);
                      if (blank < 0) return;
                      setPlaced(placed.map((p, i) => (i === blank ? at : p)));
                    }}
                    className={TILE_FRAME}
                  >
                    {choice}
                  </button>
                </li>
              ),
            )}
          </ul>
          <div className="flex justify-end">
            <BigButton
              disabled={disabled || !full}
              onClick={() =>
                onTry({
                  pieces: placed.map((at) =>
                    at === undefined ? "" : (choices[at] ?? ""),
                  ),
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
