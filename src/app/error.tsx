"use client";

// 루트 오류 경계(UI · UX 묶음 0-나 · spec 설계 4 N-15 · 8절 '앱 오류' 행 R-52 · plan 위험 9). (child) 틀(선생님 읽기 등)이나 그 밖의 쪽에서
// 잡히지 않은 오류를 받는다 — (child)/error.tsx 는 같은 단의 틀(layout)을 감싸지 않기 때문이다. 아이 화면 오류 경계와 같은 판이고,
// '다시 해 볼래요'는 Next 의 retry(한 전환 안에서 router.refresh() 와 reset())다. 루트 틀(layout) 자체의 오류는 이 경계 밖이다.
import { AppErrorPanel } from "@/components/session/app-trouble";

export default function RootError({
  retry,
}: {
  error: unknown;
  reset: () => void;
  retry: () => void;
}) {
  return <AppErrorPanel onRetry={retry} />;
}
