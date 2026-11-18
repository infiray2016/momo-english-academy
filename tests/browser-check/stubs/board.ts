// 판 조각의 대역(talk-log 쪽 — 기록 칸이 닿는 곁 말풍선 · 소리 안내 · 마이크 막힘 안내가 단추 · 연결 조각을 가져온다, b5-fix2). 모양은 보지 않고
// 같은 꼴의 맨 단추 · 연결만 둔다.
import { type ComponentProps, createElement } from "react";

export const FOCUS_RING = "focusring";

export const BigButton = (props: ComponentProps<"button">) =>
  createElement("button", { type: "button", ...props });
export const SmallButton = BigButton;
export const BigLink = ({
  href,
  ...props
}: Omit<ComponentProps<"a">, "href"> & { href: unknown }) =>
  createElement("a", { href: String(href), ...props });
export const SmallLink = BigLink;
