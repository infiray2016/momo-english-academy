// 칩 · 문항 이름표(가르치고 배우는 수업 plan 묶음 라-1 · spec 설계 1 '칩' · 5 '정본 밖 문구' 표 칩 이름 · 문항 이름표 · 6 chips[].role · askRole,
// plan 정한 것 15). 칩은 문장 위 낱말 덩어리마다 붙는 작은 색 이름표다. 이름은 role 에서 나오고(문법 용어 없음), 색은 globals.css 의 칩
// 토큰(bg-chip-*)이다. 꺼진 칩은 종이 바탕 · 흐린 테, 켜진 칩은 칩 색 · 먹색 테다(선생님 말에 맞춰 켜짐은 부르는 쪽이 lit 로 넘긴다).
// 훅이 없어 서버 · 클라이언트 둘 다에서 그린다.
import { CHILD_SIZE, EnglishLine } from "@/components/activities/common";
import type { TeachChipRole } from "@/core/seed/structure";
import { chipSegmentsOf } from "@/core/session/teach-line";
import { cn } from "@/lib/utils";

/** 칩 이름(정본 밖 문구 표 '칩 이름' 그대로 — 읽기 · 말하기 who · do · what · where, 쓰기 thing · is · how · end). */
export const CHIP_NAME = {
  who: "누가",
  do: "하는 일",
  what: "무엇",
  where: "어디",
  thing: "무엇",
  is: "is",
  how: "어때요",
  end: "마침표",
} as const satisfies Record<TeachChipRole, string>;

/** 칩 토큰 여덟(globals.css --color-chip-*). 예비(spare)는 4단계부터의 새 role 몫으로 비워 둔 자리다. */
export const CHIP_TOKENS = [
  "chip-who",
  "chip-do",
  "chip-what",
  "chip-where",
  "chip-is",
  "chip-how",
  "chip-end",
  "chip-spare",
] as const;

/** role → 칩 색 클래스(Tailwind 는 소스 글을 훑으므로 클래스 글자 그대로 둔다). 쓰기 '무엇'(thing)은 '무엇'과 같은 색. */
export const CHIP_TONE = {
  who: "bg-chip-who",
  do: "bg-chip-do",
  what: "bg-chip-what",
  where: "bg-chip-where",
  thing: "bg-chip-what",
  is: "bg-chip-is",
  how: "bg-chip-how",
  end: "bg-chip-end",
} as const satisfies Record<TeachChipRole, string>;

/** 칩 하나의 자료(시드 chips[] 와 같은 꼴). */
export type ChipData = { text: string; role: TeachChipRole };

/** 칩 이름표(색 종이 · 먹색 테 · 20px). 꺼지면 종이 바탕 · 흐린 테. */
const NAME_TAG =
  "rounded-card border-(length:--paper-edge) px-3 font-heading leading-snug";

/** 칩 하나: 위는 영어 덩어리(24px), 아래는 칩 이름표. */
export function Chip({
  text,
  role,
  lit,
}: {
  text: string;
  role: TeachChipRole;
  lit: boolean;
}) {
  return (
    <span
      data-chip-role={role}
      data-chip-lit={lit ? "" : undefined}
      className="inline-flex flex-col items-center gap-1"
    >
      <span
        lang="en"
        className={cn(
          CHILD_SIZE.english,
          "rounded-card border-(length:--paper-edge) px-3 py-1 leading-snug text-ink",
          lit
            ? cn(CHIP_TONE[role], "border-ink")
            : "border-ink-off-edge bg-paper",
        )}
      >
        {text}
      </span>
      <span
        lang="ko"
        className={cn(
          CHILD_SIZE.guide,
          NAME_TAG,
          lit
            ? cn(CHIP_TONE[role], "border-ink text-ink")
            : "border-ink-off-edge border-dashed bg-paper text-ink-soft",
        )}
      >
        {CHIP_NAME[role]}
      </span>
    </span>
  );
}

/** 같은 글이 둘일 수 있는 목록(칩 · 낱말 조각)에 열쇠를 단다: 글 + 몇째 같은 글. index 는 목록 차례. */
export function keyedByText<T extends { text: string }>(
  list: readonly T[],
): { key: string; item: T; index: number }[] {
  const seen = new Map<string, number>();
  return list.map((item, index) => {
    const n = (seen.get(item.text) ?? 0) + 1;
    seen.set(item.text, n);
    return { key: `${item.text}#${n}`, item, index };
  });
}

/**
 * 칩을 단 문장. 칩 글을 문장에서 차례로 찾아 그 자리에 칩을 놓고, 칩 밖 글(No, · 쉼표)은 그대로 둔다. lang 은 영어 덩어리에만 en,
 * 칩 이름표에는 ko 를 단다(화면 읽기 기능이 '누가'를 영어 규칙으로 읽지 않게). 차례대로 찾지 못하면 문장 한 줄
 * 아래에 칩 줄을 따로 그린다. lit 는 칩마다 켜짐(없으면 모두 켬).
 */
export function ChipSentence({
  sentence,
  chips,
  lit,
  className,
}: {
  sentence: string;
  chips: readonly ChipData[];
  lit?: readonly boolean[];
  className?: string;
}) {
  const on = (index: number) => lit?.[index] ?? true;
  const segments = chipSegmentsOf(sentence, chips);
  if (segments === undefined) {
    return (
      <div
        data-chip-sentence=""
        className={cn("flex flex-col gap-3", className)}
      >
        <EnglishLine>{sentence}</EnglishLine>
        <span className="flex flex-wrap items-start gap-3">
          {keyedByText(chips).map(({ key, item, index }) => (
            <Chip key={key} text={item.text} role={item.role} lit={on(index)} />
          ))}
        </span>
      </div>
    );
  }
  return (
    <p
      data-chip-sentence=""
      className={cn("flex flex-wrap items-start gap-x-2 gap-y-3", className)}
    >
      {segments.map((segment) => {
        const chip =
          segment.chip === undefined ? undefined : chips[segment.chip];
        if (chip !== undefined && segment.chip !== undefined)
          return (
            <Chip
              key={segment.at}
              text={segment.text}
              role={chip.role}
              lit={on(segment.chip)}
            />
          );
        const plain = segment.text.trim();
        if (plain === "") return null;
        return (
          <span
            key={segment.at}
            lang="en"
            className={cn(CHILD_SIZE.english, "py-1 leading-snug")}
          >
            {plain}
          </span>
        );
      })}
    </p>
  );
}

/** 문항 이름표(정본 밖 문구 표 '문항 이름표' — askRole who · what · where 에서 나옴, C170 (5)). 칩 색 · 먹색 테. */
export function AskTag({
  role,
  className,
}: {
  role: "who" | "what" | "where";
  className?: string;
}) {
  return (
    <span
      data-ask-role={role}
      className={cn(
        CHILD_SIZE.guide,
        NAME_TAG,
        "self-start border-ink py-1 text-ink",
        CHIP_TONE[role],
        className,
      )}
    >
      {CHIP_NAME[role]}
    </span>
  );
}
