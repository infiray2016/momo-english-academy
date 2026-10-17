// 포스트잇 보드 공용 컴포넌트(4절 시각 방향 · 아이 화면 크기, plan-p10a 파일별 값 5).
// 코르크 바탕 · 종이 띠 · 포스트잇(노랑 읽기 · 하늘 쓰기 · 분홍 말하기 · 연두 회화) · 큰 단추 · 확인 쪽지.
// 모두 속성만 받고 훅이 없어 서버 · 클라이언트 둘 다에서 그린다. 색 · 그림자 · 글꼴 값은 globals.css 의 보드 토큰이다.
// 아이 화면 크기(4절, 잠정): 안내 20px · 영어 24px · 단추 글자 22px 이상 · 누르는 곳 56 × 56px 이상(CHILD_SIZE).
// 작은 글자는 부모용 정보(data-parent-info 안)에만 쓴다.
import { AlertTriangle, Check, CircleCheck } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AREA_TONE, CHILD_SIZE } from "@/components/activities/common";
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

/** 포스트잇 기울기(목업의 −2° · 1.5° · −1°). */
const TILT = {
  none: "",
  left: "-rotate-2",
  right: "rotate-[1.5deg]",
  slight: "-rotate-1",
} as const;
export type Tilt = keyof typeof TILT;

/** 아이 화면 한 장: 코르크 바탕 · 나무 테 · 가운데 칸. 세로 820 · 가로 1180 둘 다 가로 넘침이 없다. */
export function ChildScreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-dvh overflow-x-hidden border-[16px] border-cork-frame bg-cork">
      <main
        data-child-screen=""
        className={cn(
          "mx-auto flex min-h-[calc(100dvh-32px)] w-full max-w-[1180px] flex-col gap-6 px-6 py-6 text-ink",
          CHILD_SIZE.guide,
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}

/** 위 종이 띠: 제목(Jua) · 둘째 줄(단계 · 단원) · 오른쪽 자리('홈' 등). */
export function PaperBand({
  title,
  detail,
  right,
  heading = false,
}: {
  title: ReactNode;
  detail?: ReactNode;
  right?: ReactNode;
  /** 제목을 쪽의 h1 로(화면에 다른 h1 이 없을 때). */
  heading?: boolean;
}) {
  const Title = heading ? "h1" : "p";
  return (
    <header
      data-paper-band=""
      className="flex flex-wrap items-center justify-between gap-4 rounded bg-paper px-6 py-3 shadow-band"
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
        <Title className="font-heading text-[32px] leading-tight">
          {title}
        </Title>
        {detail ? <p className={CHILD_SIZE.guide}>{detail}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-3">{right}</div> : null}
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
      <Check className="size-6" strokeWidth={3} />
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
 * 포스트잇 한 장(영역 색 · 조금 기운 종이 · 위 테이프). href 면 링크, onClick 이면 단추, 둘 다 없으면 글 상자.
 * 누르는 꼴이면 누르는 곳이 56px 이상이다. disabled 면 누를 수 없는 꼴(aria-disabled).
 */
export function PostIt({
  tone = "paper",
  tilt = "none",
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
  const body = cn(
    "relative flex flex-col gap-3 p-6 pt-9 text-left text-ink shadow-postit",
    disabled ? DISABLED_TONE[tone] : POSTIT_TONE(tone),
    TILT[tilt],
    (href || onClick) &&
      cn(CHILD_SIZE.target, "transition-transform", FOCUS_RING),
    pressed && SELECTED_RING,
    disabled && "cursor-not-allowed",
    className,
  );
  const inner = (
    <>
      {tape ? (
        <span
          aria-hidden
          className="absolute -top-3 left-1/2 h-6 w-28 -translate-x-1/2 -rotate-3 bg-tape"
        />
      ) : null}
      {pressed ? <SelectedMark /> : null}
      {children}
    </>
  );
  if (href && !disabled) {
    return (
      <Link href={href} aria-label={label} data-touch="" className={body}>
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
      >
        {inner}
      </button>
    );
  }
  return <div className={body}>{inner}</div>;
}

const BUTTON_BASE = cn(
  CHILD_SIZE.target,
  FOCUS_RING,
  "inline-flex items-center justify-center gap-2 rounded-xl px-8 font-heading disabled:cursor-not-allowed disabled:opacity-40",
);

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
      className={cn(BUTTON_BASE, "bg-ink text-2xl text-paper", className)}
      {...props}
    />
  );
}

/** 큰 단추 꼴의 링크(화면을 옮기는 그 행동 하나 — 단추 안에 링크를 넣지 않게). */
export function BigLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      data-touch=""
      className={cn(BUTTON_BASE, "bg-ink text-2xl text-paper", className)}
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
      className={cn(
        BUTTON_BASE,
        "border-2 border-ink bg-paper px-6 text-[22px] text-ink",
        className,
      )}
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
      className={cn(
        BUTTON_BASE,
        "border-2 border-ink bg-paper px-6 text-[22px] text-ink",
        className,
      )}
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
        "border-2 border-ink bg-paper px-6 text-[22px] text-ink",
        selected && "border-4 px-[22px]",
        className,
      )}
      {...props}
    >
      {selected ? (
        <Check aria-hidden className="size-6 shrink-0" strokeWidth={3} />
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
        <AlertTriangle aria-hidden className="size-7 shrink-0" />
      ) : null}
      {shown && tone === "ok" ? (
        <CircleCheck aria-hidden className="size-7 shrink-0" />
      ) : null}
      {shown ? children : null}
    </p>
  );
}

/**
 * 확인 쪽지: 한 문장과 단추 둘(P10b 수업 목록이 쓴다). open 일 때만 그린다.
 * 열리면 초점이 첫 단추(취소 쪽 — 하던 일을 지키는 쪽)로 가고 Esc 는 취소다. 닫힌 뒤 초점 돌려놓기는 부르는 쪽이 한다.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={message}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className="flex w-full max-w-xl flex-col gap-6 rounded bg-paper p-8 text-ink shadow-postit"
      >
        <p className={CHILD_SIZE.guide}>{message}</p>
        <div className="flex flex-wrap justify-end gap-4">
          {/* 쪽지가 열리면 초점을 쪽지 안 첫 단추로(화면 검토 review-p10-4-design) */}
          <SmallButton autoFocus onClick={onCancel}>
            {cancelLabel}
          </SmallButton>
          <BigButton onClick={onConfirm}>{confirmLabel}</BigButton>
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
