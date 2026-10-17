// 첫 실행 자리(4절 첫 실행 행 · AC-1a · AC-1c, plan-p10a 파일별 값 8). 접근 쿠키가 있는 기기만 온다(proxy).
// 프로필이 이미 있으면 홈으로 보낸다(두 번째 기기 · 다시 열기). 화면 값(설정 · 단계 예시 줄 · 묶음 그림 · 음성 설정)을 읽어 넘긴다.
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { readFirstRunView, readHouseholdProfile } from "@/server/profile";
import { FirstRunFlow } from "./first-run-flow";

export default async function FirstRunPage() {
  await connection();
  if (await readHouseholdProfile()) redirect("/");
  const view = await readFirstRunView();
  return <FirstRunFlow view={view} />;
}
