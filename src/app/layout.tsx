import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "모모 잉글리시 아카데미",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
