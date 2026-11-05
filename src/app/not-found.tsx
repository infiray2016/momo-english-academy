// 루트 없는 주소 판(UI · UX 묶음 0-나 · spec 설계 4 N-16 · 8절 '앱 오류' 행 R-52). 앱이 모르는 주소 전부와 (child) 밖의 notFound() 를
// 받는다. 아이 화면의 없는 주소 판과 같다('찾는 화면이 없어요' · 큰 '홈').
import { NotFoundPanel } from "@/components/session/app-trouble";

export default function NotFound() {
  return <NotFoundPanel />;
}
