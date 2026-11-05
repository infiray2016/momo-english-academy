// 아이 화면 공용 컴포넌트(4절 시각 방향 · 아이 화면 크기, plan-p10a 파일별 값 5 · UI · UX 묶음 2-가 디자인 ② 밝은 책상 C168).
// 책상 바탕 · 종이 띠 · 포스트잇(노랑 읽기 · 하늘 쓰기 · 분홍 말하기 · 연두 회화) · 큰 단추 · 확인 쪽지.
// 모두 속성만 받고 훅이 없어 서버 · 클라이언트 둘 다에서 그린다. 색 · 모서리 · 그림자 · 종이 테 값은 globals.css 의 디자인 토큰이고
// (spec UI · UX 개선 설계 5.1 · 5.2), 테이프 길이 · 각도 · 카드 기울기 · 테이프 색은 카드 열쇠로 고른다(paper-key, D-9).
// 아이 화면 크기(4절, 잠정): 안내 20px · 영어 24px · 단추 글자 22px 이상 · 누르는 곳 56 × 56px 이상(CHILD_SIZE).
// 작은 글자는 부모용 정보(data-parent-info 안)에만 쓴다.
import { AlertTriangle, Check, CircleCheck } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import {
  AREA_TONE,
  CHILD_SIZE,
  ICON_STROKE,
} from "@/components/activities/common";
import { DeskDecor } from "@/components/board/decor";
import {
  NOTE_TILT,
  PAPER_TILTS,
  type PaperLook,
  paperLookOf,
  TAPE_CORNER_ANGLE,
} from "@/components/board/paper-key";
import type { AvatarId } from "@/core/profile/start";
import type { Area } from "@/core/seed/structure";
import { cn } from "@/lib/utils";

/** 영역 이름(용어: 영역 — CLAUDE.md). */
export const AREA_LABEL = {
  reading: "읽기",
  writing: "쓰기",
  speaking: "말하기",
  talk: "회화",
} as const satisfies Record<Area, string>;

/** 아바타 동그라미 색(C72 — 포스트잇 넷 + 주황 · 보라, 토큰). */
export const AVATAR_TONE = {
  yellow: "bg-postit-reading",
  sky: "bg-postit-writing",
  pink: "bg-postit-speaking",
  green: "bg-postit-talk",
  orange: "bg-avatar-orange",
  purple: "bg-avatar-purple",
} as const satisfies Record<AvatarId, string>;

/** 아이콘 획(5.2 · D-8 — 아이콘 전부). 정의는 activities/common(board 가 그 파일을 가져와 순환을 피함), 이름 · 값 그대로 다시 내보낸다. */
export { ICON_STROKE } from "@/components/activities/common";

/** 포스트잇 기울기 이름 → 각도(°, 5.2 카드 기울기 목록의 값). 열쇠로 고를 때는 목록 넷 가운데 하나다(paperLookOf). */
const TILT_DEG = {
  none: 0,
  left: PAPER_TILTS[0],
  slightRight: PAPER_TILTS[1],
  slight: PAPER_TILTS[2],
  right: PAPER_TILTS[3],
} as const;
export type Tilt = keyof typeof TILT_DEG;

/** 띠 모서리 테이프의 자리(px, 시안 ② 띠 왼쪽 위 — 테이프 대부분이 띠 밖이라 제목 · 단추를 가리지 않는다). */
const BAND_TAPE_OFFSET = { x: -40, y: -12 } as const;

/** 종이 테(5.2 — 2.6px 먹색, 토큰 --paper-edge). */
const PAPER_EDGE = "border-(length:--paper-edge) border-ink";

/**
 * 마스킹 테이프 한 조각(5.2 · 5.3): 종이 가장자리에 붙고 글 · 단추를 가리지 않는다. 가운데(top)는 종이 위 끝에 반쯤 걸치고(종이 안 위 여백이
 * 테이프 두께의 반보다 넓다), 모서리(left)는 띠 왼쪽 위에 비스듬히 붙는다. 길이 · 각도 · 색은 열쇠로 고른 꼴(look)이다.
 */
export function PaperTape({
  look,
  at = "top",
}: {
  look: PaperLook;
  at?: "top" | "left";
}) {
  const place: CSSProperties =
    at === "top"
      ? {
          top: -look.tapeHeight / 2,
          left: "50%",
          translate: "-50% 0",
          rotate: `${look.tapeAngle}deg`,
        }
      : {
          top: BAND_TAPE_OFFSET.y,
          left: BAND_TAPE_OFFSET.x,
          rotate: `${TAPE_CORNER_ANGLE.left}deg`,
        };
  const style = {
    "--tape-tone": `var(--color-${look.tapeTone})`,
    width: look.tapeWidth,
    height: look.tapeHeight,
    ...place,
  } as CSSProperties;
  return (
    <span
      aria-hidden
      data-tape={at}
      className="paper-tape pointer-events-none"
      style={style}
    />
  );
}

/**
 * 아이 화면 한 장: 책상 바탕(화면 전체 — 화면 테 없음, D-3) · 꾸밈 층(DeskDecor) · 가운데 칸. 세로 820 · 가로 1180 둘 다 가로 넘침이 없다.
 * 꾸밈 층은 이 한 장 맨 뒤(isolate 안 -z)라 글 · 단추 · 종이 아래에 깔린다.
 */
export function ChildScreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden bg-desk">
      <DeskDecor />
      <main
        data-child-screen=""
        className={cn(
          "mx-auto flex min-h-dvh w-full max-w-[1180px] flex-col gap-6 px-6 py-6 text-ink",
          CHILD_SIZE.guide,
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}

/** 위 종이 띠: 제목(Jua) · 둘째 줄(단계 · 단원) · 오른쪽 자리('홈' 등). 종이 테 · 판 모서리 · 판 그림자, 왼쪽 위 모서리 테이프. */
export function PaperBand({
  title,
  detail,
  right,
  heading = false,
  paperKey = "band",
}: {
  title: ReactNode;
  detail?: ReactNode;
  right?: ReactNode;
  /** 제목을 쪽의 h1 로(화면에 다른 h1 이 없을 때). */
  heading?: boolean;
  /** 테이프 꼴을 고르는 열쇠(같은 열쇠면 같은 꼴). */
  paperKey?: string;
}) {
  const Title = heading ? "h1" : "p";
  return (
    <header
      data-paper-band=""
      className={cn(
        "relative flex flex-wrap items-center justify-between gap-4 rounded-board bg-paper px-6 py-3 shadow-band",
        PAPER_EDGE,
      )}
    >
      <PaperTape look={paperLookOf(paperKey)} at="left" />
      {/* 왼쪽 묶음이 남은 너비를 다 차지해 제목 · 둘째 줄이 그 안에서 접히고, 오른쪽 묶음은 같은 줄에 남는다(띠가 단추 줄로 늘지 않음 — 디자인 리뷰 2 N-3) */}
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
        <Title className="font-heading text-[32px] leading-tight">
          {title}
        </Title>
        {detail ? <p className={CHILD_SIZE.guide}>{detail}</p> : null}
      </div>
      {/* 두 줄로 접히면(세로 820 — 제목이 길 때) 오른쪽 묶음이 왼쪽에 붙지 않게 ml-auto(4절 '구석', 차례 5 화면 재검토 N-1) */}
      {right ? (
        <div className="ml-auto flex items-center gap-3">{right}</div>
      ) : null}
    </header>
  );
}

/**
 * 키보드 초점(점선 고리) — 고른 표시(실선 고리 + 체크)와 모양이 다르다(화면 검토 M-3).
 * 누를 수 있는 모든 보드 조각이 같이 쓴다.
 */
export const FOCUS_RING =
  "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-dashed focus-visible:outline-ink";
/** 고른 표시(실선 고리) — 체크 표(SelectedMark)와 함께 쓴다. 먹색 채움은 행동 단추에만(화면 검토 M-2). */
export const SELECTED_RING = "outline outline-4 outline-offset-4 outline-ink";

/** 고른 표시의 체크 표(오른쪽 위 동그라미). 보조 기술은 aria-pressed 로 듣는다. */
export function SelectedMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-selected-mark=""
      className={cn(
        "absolute -top-3 -right-3 flex size-9 items-center justify-center rounded-full bg-ink text-paper",
        className,
      )}
    >
      <Check className="size-6" strokeWidth={ICON_STROKE} />
    </span>
  );
}

type PostItTone = Area | "paper";
const POSTIT_TONE = (tone: PostItTone) =>
  tone === "paper" ? "bg-paper" : AREA_TONE[tone].className;
/**
 * 누를 수 없는 포스트잇의 바탕: 영역 색을 종이와 섞어 옅게 하고 글은 먹색 그대로 둔다
 * (opacity 로 흐리면 글 대비가 4.5:1 아래로 떨어지고 하늘이 회청으로 보인다 — 화면 검토 review-p10-3-design I-1).
 */
const DISABLED_TONE = {
  paper: "bg-paper",
  reading:
    "bg-[color-mix(in_srgb,var(--color-postit-reading)_45%,var(--color-paper))]",
  writing:
    "bg-[color-mix(in_srgb,var(--color-postit-writing)_45%,var(--color-paper))]",
  speaking:
    "bg-[color-mix(in_srgb,var(--color-postit-speaking)_45%,var(--color-paper))]",
  talk: "bg-[color-mix(in_srgb,var(--color-postit-talk)_45%,var(--color-paper))]",
} as const satisfies Record<PostItTone, string>;

/**
 * 포스트잇 한 장(영역 색 · 종이 테 · 손으로 자른 둥근 모서리 · 조금 기운 종이 · 위 테이프). href 면 링크, onClick 이면 단추, 둘 다 없으면 글 상자.
 * 누르는 꼴이면 누르는 곳이 56px 이상이다. disabled 면 누를 수 없는 꼴(aria-disabled).
 * 테이프 길이 · 각도 · 색은 열쇠(paperKey, 없으면 색 이름)로 고르고, 기울기는 tilt 이름이 있으면 그 값, 없고 열쇠가 있으면 열쇠로 고른 값이다.
 */
export function PostIt({
  tone = "paper",
  tilt,
  paperKey,
  tape = true,
  href,
  onClick,
  disabled = false,
  pressed,
  label,
  className,
  children,
}: {
  tone?: PostItTone;
  tilt?: Tilt;
  /** 카드 열쇠(영역 · 수업 번호 같은 글 — 같은 열쇠면 같은 꼴, D-9). */
  paperKey?: string;
  tape?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** 고르기 꼴(aria-pressed). */
  pressed?: boolean;
  /** 보조 기술 이름(글이 길 때). */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const look = paperLookOf(paperKey ?? tone);
  const deg =
    tilt !== undefined
      ? TILT_DEG[tilt]
      : paperKey !== undefined
        ? look.tilt
        : 0;
  const lean: CSSProperties | undefined =
    deg === 0 ? undefined : { rotate: `${deg}deg` };
  const body = cn(
    "relative flex flex-col gap-3 rounded-card p-6 pt-9 text-left text-ink shadow-postit",
    PAPER_EDGE,
    disabled ? DISABLED_TONE[tone] : POSTIT_TONE(tone),
    (href || onClick) &&
      // 움직임 줄이기 설정이면 누름 움직임도 없음(ui-ux-pro-max §1 reduced-motion)
      cn(
        CHILD_SIZE.target,
        "transition-transform motion-reduce:transition-none",
        FOCUS_RING,
      ),
    pressed && SELECTED_RING,
    disabled && "cursor-not-allowed",
    className,
  );
  const inner = (
    <>
      {tape ? <PaperTape look={look} /> : null}
      {pressed ? <SelectedMark /> : null}
      {children}
    </>
  );
  if (href && !disabled) {
    return (
      <Link
        href={href}
        aria-label={label}
        data-touch=""
        className={body}
        style={lean}
      >
        {inner}
      </Link>
    );
  }
  if (onClick || href) {
    return (
      <button
        type="button"
        data-touch=""
        aria-label={label}
        aria-pressed={pressed}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
        className={body}
        style={lean}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={body} style={lean}>
      {inner}
    </div>
  );
}

/**
 * 단추 꼴(5.2): 손으로 자른 단추 모서리 · 단추 그림자. 흐린 단추는 종이 바탕 · 먹색 42% 글 · 먹색 36% 종이 테 · 그림자 없음이다(D-13 —
 * 흐림 40% 회색 덩어리 대신).
 */
const BUTTON_BASE = cn(
  CHILD_SIZE.target,
  FOCUS_RING,
  "inline-flex items-center justify-center gap-2 rounded-button px-8 font-heading shadow-button",
  "disabled:cursor-not-allowed disabled:border-(length:--paper-edge) disabled:border-ink-off-edge disabled:bg-paper disabled:text-ink-off disabled:shadow-none",
);
/** 먹색 큰 단추: 같은 색 종이 테를 둘러 흐려질 때(테가 보임) 크기가 그대로다. */
const INK_BUTTON = cn(PAPER_EDGE, "bg-ink text-2xl text-paper");
/** 흰 단추(작은 단추 · 고르기 단추): 종이 바탕 · 종이 테 · 먹색 글자 22px. */
const PAPER_BUTTON = cn(PAPER_EDGE, "bg-paper px-6 text-[22px] text-ink");

/** 큰 단추(먹색 바탕 · 종이 글, 글자 24px). 화면의 그 행동 하나. */
export function BigButton({
  className,
  type = "button",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type={type}
      data-touch=""
      className={cn(BUTTON_BASE, INK_BUTTON, className)}
      {...props}
    />
  );
}

/** 큰 단추 꼴의 링크(화면을 옮기는 그 행동 하나 — 단추 안에 링크를 넣지 않게). */
export function BigLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      data-touch=""
      className={cn(BUTTON_BASE, INK_BUTTON, className)}
      {...props}
    />
  );
}

/** 작은 단추 꼴의 링크(종이 바탕 · 먹색 테, 글자 22px) — 종이 띠의 '홈' · '수업 목록' 같은 곁 이동. */
export function SmallLink({
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      data-touch=""
      className={cn(BUTTON_BASE, PAPER_BUTTON, className)}
      {...props}
    />
  );
}

/** 작은 단추(종이 바탕 · 먹색 테, 글자 22px). '이전' · '고르지 않음' 같은 곁 행동. */
export function SmallButton({
  className,
  type = "button",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type={type}
      data-touch=""
      className={cn(BUTTON_BASE, PAPER_BUTTON, className)}
      {...props}
    />
  );
}

/**
 * 고르기 단추(종이 바탕 · 먹색 테, 글자 22px). 고르면 테가 굵어지고 앞에 체크 표가 붙는다(먹색 채움 아님 — '다음' 같은
 * 행동 단추와 다르게, 화면 검토 M-2). aria-pressed 로 고른 상태를 알린다.
 */
export function ChoiceButton({
  selected,
  className,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type={type}
      data-touch=""
      aria-pressed={selected}
      className={cn(
        BUTTON_BASE,
        PAPER_BUTTON,
        // 고르면 테가 굵어져도 단추 바깥 크기는 그대로(안 여백을 테 차이만큼 줄임)
        selected && "border-4 px-[calc(24px+var(--paper-edge)-4px)]",
        className,
      )}
      {...props}
    >
      {selected ? (
        <Check
          aria-hidden
          className="size-6 shrink-0"
          strokeWidth={ICON_STROKE}
        />
      ) : null}
      {children}
    </button>
  );
}

/**
 * 상태 줄(role=status): 오류는 경고 표 · 굵은 글, 잘 됨은 체크 표, 안내는 표 없음 — 색만으로 가르지 않는다(화면 검토 M-6).
 * 글이 비면 자리만 둔다(줄이 생겨도 화면이 뛰지 않게).
 */
export function StatusLine({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "ok" | "error";
  children?: ReactNode;
  className?: string;
}) {
  const shown = children !== undefined && children !== null && children !== "";
  return (
    <p
      role="status"
      data-status-tone={shown ? tone : undefined}
      className={cn(
        "flex min-h-8 items-center gap-2",
        shown && tone === "error" && "font-bold",
        className,
      )}
    >
      {shown && tone === "error" ? (
        <AlertTriangle
          aria-hidden
          className="size-7 shrink-0"
          strokeWidth={ICON_STROKE}
        />
      ) : null}
      {shown && tone === "ok" ? (
        <CircleCheck
          aria-hidden
          className="size-7 shrink-0"
          strokeWidth={ICON_STROKE}
        />
      ) : null}
      {shown ? children : null}
    </p>
  );
}

/**
 * 확인 쪽지: 한 문장과 단추 둘(P10b 수업 목록이 쓴다). open 일 때만 그린다.
 * 열리면 초점이 첫 단추(취소 쪽 — 하던 일을 지키는 쪽)로 가고 Esc 는 취소다. 닫힌 뒤 초점 돌려놓기는 부르는 쪽이 한다.
 * 확인 쪽은 늘 되돌릴 수 없는 선택('새 수업 할래요' · '그만할래요' · '보낼래요')이라 작은 종이 단추이고, 계속하는 쪽(취소)이 큰 먹색
 * 단추다 — 아이는 먹색 큰 단추 = 진행으로 익혔다(UX 검토 3판 U5-6 · U3-3, 13절 C166 · ui-ux-pro-max §8 destructive-emphasis 참고).
 * Tab · Shift+Tab 은 쪽지 안 단추 사이를 맴돈다 — 뒤 화면으로 나가 Esc 가 안 듣는 일이 없게(화면 검토 review-p10-fix3-design N-5).
 * 덮개가 화면 전체를 덮어 뒤 화면은 눌리지 않고, 덮개를 눌러도 초점은 쪽지 안에 남는다.
 */
export function ConfirmSheet({
  open,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    // 덮개 전체가 쪽지(role=dialog, tabIndex −1)다 — 덮개를 누르면 초점이 쪽지 자체로 가고 body 로 빠지지 않는다.
    // 그래서 Tab · Shift+Tab · Esc 가 늘 이 처리기를 지난다(검토 review-p10-5-6-code M-4)
    <div
      role="dialog"
      aria-modal="true"
      aria-label={message}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
          return;
        }
        if (e.key !== "Tab") return;
        const buttons = [
          ...e.currentTarget.querySelectorAll<HTMLElement>("button"),
        ];
        const first = buttons[0];
        const last = buttons.at(-1);
        if (!first || !last) return;
        const at = document.activeElement;
        if (at === e.currentTarget) {
          // 덮개를 눌러 쪽지 자체에 초점이 있으면 쪽지 안 첫 · 끝 단추로
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && at === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && at === last) {
          e.preventDefault();
          first.focus();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 outline-none"
    >
      {/* 쪽지(5.2 · 5.4): 둥근 종이 · 종이 테 · 테이프 하나 · 쪽지 기울기 */}
      <div
        className={cn(
          "relative flex w-full max-w-xl flex-col gap-6 rounded-card bg-paper p-8 pt-10 text-ink shadow-postit",
          PAPER_EDGE,
        )}
        style={{ rotate: `${NOTE_TILT}deg` }}
      >
        <PaperTape look={paperLookOf("note")} />
        <p className={CHILD_SIZE.guide}>{message}</p>
        <div className="flex flex-wrap justify-end gap-4">
          {/* 쪽지가 열리면 초점을 쪽지 안 첫 단추(계속하는 쪽 — 큰 단추)로(화면 검토 review-p10-4-design · U5-6) */}
          <BigButton autoFocus onClick={onCancel}>
            {cancelLabel}
          </BigButton>
          <SmallButton onClick={onConfirm}>{confirmLabel}</SmallButton>
        </div>
      </div>
    </div>
  );
}

/** 아바타 동그라미(목업 B_Profile — 종이 테 · 이름 첫 글자 Jua). size 는 px. */
export function AvatarCircle({
  avatar,
  name,
  size = 120,
}: {
  avatar: AvatarId;
  name: string;
  size?: number;
}) {
  const initial = [...name.trim()][0] ?? "";
  return (
    <span
      role="img"
      aria-label={`${name} 아바타`}
      style={{ width: size, height: size, fontSize: size / 2 }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-4 border-ink font-heading leading-none text-ink",
        AVATAR_TONE[avatar],
      )}
    >
      {initial}
    </span>
  );
}
