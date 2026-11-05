// 화면 가족의 큰 판(UI · UX plan 묶음 5-가 · spec 설계 5.4 화면 가족 · 5.2 모양 토큰 · UX 검토 3판 D-1 · D-10 · D-14). 세션 · 결과 · 막힘 ·
// 쉼 · 오류 · 첫 실행이 같은 판 한 장을 쓴다: 종이 테(2.6px 먹색) · 판 모서리 · 판 그림자 · 위 가운데 테이프 하나(열쇠로 고른 꼴 — 판 안으로는
// 테이프 두께의 반만 걸쳐 안 여백 p-8 · p-6 보다 얕다), 기울지 않는다.
// - fill: 위 띠 아래를 보는 창 아래 끝까지 채운다(세션 · 결과 · 배치 — 판 아래에 빈 바탕을 남기지 않음, 설계 5.4 세션 행).
// - standalone: 띠 없는 화면(앱 오류 · 없는 주소)의 가운데 판 — 최소 높이가 화면 높이의 STANDALONE_BOARD_MIN_SHARE 라 빈 바탕이 1/3 아래다.
// - fill · standalone 이 없으면 종이 높이 = 내용(첫 실행 — D-14).
// - center: 판 안 내용을 가운데에(막힘 · 쉼 · 오류 — 안내와 단추 둘).
// 표지 data-family-board 는 e2e 판 상자 셈(tests/e2e/board-fill)이 고른다. 훅이 없어 서버 · 클라이언트 둘 다에서 그린다(회화 틀 — 묶음 6 이 같이 씀).
import type { HTMLAttributes, ReactNode } from "react";
import { AREA_TONE, CHILD_SIZE } from "@/components/activities/common";
import { PaperTape } from "@/components/board/board";
import { paperLookOf } from "@/components/board/paper-key";
import type { Area } from "@/core/seed/structure";
import { cn } from "@/lib/utils";

/** 판의 가족: 세션 · 결과 · 막힘(쉼 · 오류 포함) · 첫 실행. */
export type FamilyBoardKind = "session" | "result" | "stuck" | "first-run";

/** 띠 없는 가운데 판의 최소 높이(화면 높이에 곱함 — 빈 바탕 1/3 아래, 설계 5.4 막힘 · 쉼 · 오류 행). 화면 꼴 상수다. */
export const STANDALONE_BOARD_MIN_SHARE = 0.7;
/** 위 클래스(Tailwind 는 소스의 글 그대로를 읽으므로 값과 같은 글을 둔다 — 단위 시험이 둘을 맞춘다). */
const STANDALONE_MIN_CLASS = "min-h-[70dvh]";

/** 판 꼴(5.2): 종이 테 · 판 모서리 · 판 그림자. 세션 활동 카드도 이 꼴을 덧입는다. */
export const FAMILY_BOARD_SHAPE =
  "rounded-board border-(length:--paper-edge) border-ink shadow-band";

type DataProps = { [key: `data-${string}`]: string | undefined };

/** 판 한 장. tone 은 바탕(종이 또는 영역 포스트잇 색). */
export function FamilyBoard({
  kind,
  tone = "paper",
  fill = false,
  standalone = false,
  center = false,
  paperKey,
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  kind: FamilyBoardKind;
  tone?: Area | "paper";
  fill?: boolean;
  standalone?: boolean;
  center?: boolean;
  /** 테이프 꼴 열쇠(같은 열쇠면 같은 꼴, 없으면 가족 이름). */
  paperKey?: string;
  as?: "div" | "section";
  className?: string;
  children?: ReactNode;
} & DataProps &
  Pick<HTMLAttributes<HTMLElement>, "role" | "aria-label">) {
  return (
    <Tag
      data-family-board={kind}
      className={cn(
        "relative flex w-full flex-col gap-6 p-8 text-ink",
        CHILD_SIZE.guide,
        FAMILY_BOARD_SHAPE,
        tone === "paper" ? "bg-paper" : AREA_TONE[tone].className,
        fill && "flex-1",
        standalone && STANDALONE_MIN_CLASS,
        center && "items-center justify-center text-center",
        className,
      )}
      {...rest}
    >
      <PaperTape look={paperLookOf(paperKey ?? `board:${kind}`)} />
      {children}
    </Tag>
  );
}
