// 점검 틀용 대역: next/image 를 보통 img 로(크기 · 클래스는 그대로 — 그림 파일은 읽지 못해도 자리는 같다).
import type { ImgHTMLAttributes } from "react";

export default function Image({
  fill,
  priority: _priority,
  unoptimized: _unoptimized,
  sizes: _sizes,
  style,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
}) {
  return (
    // biome-ignore lint/performance/noImgElement: next/image 의 대역이라 보통 img 다(점검 틀 밖에서는 쓰지 않음)
    <img
      alt=""
      {...rest}
      style={
        fill
          ? {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              ...style,
            }
          : style
      }
    />
  );
}
