// 세션 자리(5절 · 3.3, plan-p10b 파일별 값 6 · 7 · 정할 것 ㅌ · plan-p11a 값 5 · plan-p13b 값 12 · 회16 — 주소 /session/<id>).
// 그 프로필의 진행 세션만 연다. 회화는 대화가 열려 있으면(진행 · 또는 완료이고 정리 전 — 목표 턴 뒤 '더 이야기하기') 회화 틀로, 닫혔으면
// 회화 수업 목록으로(결과 쪽 없음 — 마무리 세 장). 그 밖 끝난 세션은 결과(/result/<id>)로, 닫힌 세션 · 남의 세션은 그 영역 수업 목록(없으면 홈)으로.
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { TalkFrame } from "@/components/conversation/talk-frame";
import { now } from "@/server/clock";
import { loadTalkView, readTalkSessionArea } from "@/server/conversation";
import { readHouseholdProfile } from "@/server/profile";
import { loadSessionView, readSessionPlace } from "@/server/session";
import { SessionFrame } from "./session-frame";

export default async function SessionPage(props: PageProps<"/session/[id]">) {
  const { id } = await props.params;
  await connection();
  if (!(await readHouseholdProfile())) redirect("/first-run");
  const area = await readTalkSessionArea({ sessionId: id });
  if (area?.area === "talk") {
    const talk = area.open
      ? await loadTalkView({ sessionId: id }, { now })
      : undefined;
    if (!talk) redirect("/talk/lessons");
    return <TalkFrame key={talk.version} view={talk} />;
  }
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
