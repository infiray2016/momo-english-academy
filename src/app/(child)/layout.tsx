// 아이 화면 틀(4절 포스트잇 보드, plan-p10a 바뀌는 파일). 코르크 바탕 · 본문 글꼴 · 낱말 단위 줄바꿈은
// 루트(layout.tsx · globals.css)와 보드(ChildScreen)가 맡고, 이 틀은 아이 화면 묶음을 표시한다(lang="ko" 는 <html>).
export default function ChildLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-child-area="" className="min-h-dvh bg-cork font-sans text-ink">
      {children}
    </div>
  );
}
