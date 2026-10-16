// 접근 코드 화면의 자리(plan-p03b 파일별 값 6, C55 (4)).
// proxy 가 쿠키 없는 페이지 요청을 모두 이곳으로 다시 쓴다. 스트리밍 전에 unauthorized() 를 불러 401 이 되고,
// 같은 폴더의 unauthorized.tsx 가 접근 코드 화면을 그린다. 쿠키가 유효하면 홈으로 보낸다.
import { redirect, unauthorized } from "next/navigation";
import { hasValidAccess } from "@/server/access/guard";

export default async function AccessPage() {
  if (await hasValidAccess()) redirect("/");
  unauthorized();
}
