import type { Metadata } from "next";
import { Fredoka, Gowun_Dodum, Jua } from "next/font/google";
import "./globals.css";

// 4절 글꼴(포스트잇 보드): 제목 Jua · 본문 Gowun Dodum · 영어 Fredoka(plan-p10a 공용 변경 5).
// 빌드가 Google Fonts 의 글꼴 파일을 모두 내려받아 함께 싣는다. subsets 는 미리 읽기만 정한다 —
// 한국어 조각은 미리 읽지 않고 그 글자를 쓸 때 받는다(확인한 사실 3).
const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jua",
});
const gowunDodum = Gowun_Dodum({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-gowun",
});
const fredoka = Fredoka({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fredoka",
});

export const metadata: Metadata = {
  title: "모모 잉글리시 아카데미",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${jua.variable} ${gowunDodum.variable} ${fredoka.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
