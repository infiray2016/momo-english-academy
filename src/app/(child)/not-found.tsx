// 아이 화면의 없는 주소 판(UI · UX 묶음 0-나 · spec 설계 4 N-16 · 8절 '앱 오류' 행 R-52). 아이 화면 쪽에서 notFound() 를 부르면(모르는
// 세션 · 결과 · 영역) '찾는 화면이 없어요'와 큰 '홈'을 보인다 — 돌아갈 자리가 없어 '홈'만 두는 유일한 화면이다.
import { NotFoundPanel } from "@/components/session/app-trouble";

export default function ChildNotFound() {
  return <NotFoundPanel />;
}
