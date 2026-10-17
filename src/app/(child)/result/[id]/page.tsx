// 세션 결과 자리(4절 세션 결과 행 · plan-p11a 값 8 · 정할 것 바 — 주소 /result/<id>).
// 그 프로필의 끝난 수업 세션만 연다. 그 밖(진행 · 남의 세션 · 없는 세션)은 홈으로 보낸다.
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { now } from "@/server/clock";
import { readHouseholdProfile } from "@/server/profile";
import { loadResultView } from "@/server/session/result";
import { ResultView } from "./result-view";

export default async function ResultPage(props: PageProps<"/result/[id]">) {
  const { id } = await props.params;
  await connection();
  if (!(await readHouseholdProfile())) redirect("/first-run");
  const view = await loadResultView({ sessionId: id }, { now });
  if (!view) redirect("/");
  return <ResultView view={view} />;
}
