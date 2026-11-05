// 세션 결과 자리(4절 세션 결과 행 · plan-p11a 값 8 · 정할 것 바 — 주소 /result/<id>).
// 그 프로필의 끝난 수업 세션만 연다. 그 프로필에서 찾지 못한 세션(없는 id · 꼴이 틀린 id · 다른 프로필의 세션)은 없는 주소 판(notFound),
// 찾았지만 결과를 열 수 없는 세션(진행 · 닫힘 · 회화)은 그 영역 수업 목록으로 보낸다(UI · UX 묶음 0-나 · spec 설계 4 N-16 · 8절 '앱 오류'
// 행 R-52 — 세션 자리와 같은 갈래, 전에는 둘 다 홈으로 보냈다). 갈 곳은 순수 함수 resultDestinationOf 가 고르고 이 쪽은 notFound · redirect 만 한다.
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { resultDestinationOf } from "@/core/session/destination";
import { now } from "@/server/clock";
import { readHouseholdProfile } from "@/server/profile";
import { readSessionPlace } from "@/server/session";
import { loadResultView } from "@/server/session/result";
import { ResultView } from "./result-view";

export default async function ResultPage(props: PageProps<"/result/[id]">) {
  const { id } = await props.params;
  await connection();
  if (!(await readHouseholdProfile())) redirect("/first-run");
  const view = await loadResultView({ sessionId: id }, { now });
  if (!view) {
    const destination = resultDestinationOf(
      await readSessionPlace({ sessionId: id }),
    );
    if (destination.kind === "missing") notFound();
    redirect(destination.to);
  }
  return <ResultView view={view} />;
}
