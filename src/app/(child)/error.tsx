"use client";

// 아이 화면 오류 경계(UI · UX 묶음 0-나 · spec 설계 4 N-15 · 8절 '앱 오류' 행 R-52). 아이 화면 쪽(page · 아래 틀)에서 잡히지 않은 오류가
// 나면 앱 오류 화면을 보인다. '다시 해 볼래요'는 Next 의 retry — 한 전환 안에서 router.refresh() 와 reset() 을 불러 서버 자료를 다시
// 읽고 그 화면을 다시 그린다(reset 만으로는 서버 자료를 다시 읽지 않는다, plan 위험 9). (child) 틀 자체의 오류는 루트 경계(app/error.tsx)가
// 같은 판으로 받는다.
import { AppErrorPanel } from "@/components/session/app-trouble";

export default function ChildError({
  retry,
}: {
  error: unknown;
  reset: () => void;
  retry: () => void;
}) {
  return <AppErrorPanel onRetry={retry} />;
}
