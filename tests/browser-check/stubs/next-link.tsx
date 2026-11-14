// 점검 틀용 대역: next/link 를 보통 a 로.
import type { AnchorHTMLAttributes } from "react";

export default function Link({
  href,
  prefetch: _prefetch,
  ...rest
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string };
  prefetch?: boolean;
}) {
  return (
    <a
      href={typeof href === "string" ? href : (href.pathname ?? "#")}
      {...rest}
    />
  );
}
