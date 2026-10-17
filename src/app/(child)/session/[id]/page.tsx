// 세션 자리(5절 · 3.3, plan-p10b 파일별 값 6 · 7 · 정할 것 ㅌ · plan-p11a 값 5 — 주소 /session/<id>).
// 그 프로필의 진행 세션만 연다. 끝난 세션은 결과(/result/<id>)로, 닫힌 세션 · 남의 세션은 그 영역 수업 목록(없으면 홈)으로 보낸다.
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { now } from "@/server/clock";
import { readHouseholdProfile } from "@/server/profile";
import { loadSessionView, readSessionPlace } from "@/server/session";
import { SessionFrame } from "./session-frame";

export default async function SessionPage(props: PageProps<"/session/[id]">) {
  const { id } = await props.params;
  await connection();
  if (!(await readHouseholdProfile())) redirect("/first-run");
  const view = await loadSessionView({ sessionId: id }, { now });
  if (!view) {
    const place = await readSessionPlace({ sessionId: id });
    redirect(
      place?.completed
        ? `/result/${id}`
        : place
          ? `/${place.area}/lessons`
          : "/",
    );
  }
  return <SessionFrame view={view} />;
}
