// 세션 자리(5절 · 3.3, plan-p10b 파일별 값 6 · 7 · 정할 것 ㅌ · plan-p11a 값 5 · plan-p13b 값 12 · 회16 — 주소 /session/<id>).
// 그 프로필의 진행 세션만 연다. 회화는 대화가 열려 있으면(진행 · 또는 완료이고 정리 전 — 목표 턴 뒤 '더 이야기하기') 회화 틀로, 닫혔으면
// 회화 수업 목록으로(결과 쪽 없음 — 마무리 세 장). 그 밖 끝난 세션은 결과(/result/<id>)로, 닫힌 세션은 그 영역 수업 목록으로.
// 그 프로필에서 찾지 못한 세션(없는 id · 꼴이 틀린 id · 다른 프로필의 세션)은 없는 주소 판(notFound — UI · UX 묶음 0-나 · spec 설계 4
// N-16 · 8절 '앱 오류' 행 R-52, 전에는 홈으로 보냈다). 갈 곳은 순수 함수 sessionDestinationOf 가 고르고 이 쪽은 notFound · redirect 만 한다.
// 회화는 선생님 그림 층 보관 조각(세션 id 키)으로 감싼다 — 판(version)이 바뀌어 회화 틀을 새로 그려도 3D 그림 층은 세션에 하나다(선생님
// 화면 plan 값 14 · 위험 3). 읽기 · 쓰기 · 말하기 세션은 감싸지 않는다(3D 코드를 받지 않음).
// 회화는 새 꼴 카드 세션만 연다(회화 plan 정한 것 1 · 2 — 묶음 12 가 옛 갈래를 지움): 화면 자료(loadTalkLessonView)와 틀(TalkLessonFrame).
// 옛 꼴 카드 세션은 자료 읽기가 끝맺음 없이 중단으로 닫고 undefined 를 돌려주어 갈 곳(수업 목록)으로 간다. 자료 읽기가 던지면(DB · 시드 결함)
// 오류 이름을 남기고 오류 쪽으로 간다(묶음 11 재검토 N-5 — 소리 없이 삼키지 않는다).
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { TalkLessonFrame } from "@/components/conversation/talk-frame";
import { TeacherLayerHost } from "@/components/teacher/teacher-layer";
import {
  type Destination,
  sessionDestinationOf,
} from "@/core/session/destination";
import { now } from "@/server/clock";
import {
  loadTalkLessonView,
  readTalkSessionArea,
  type TalkLessonView,
} from "@/server/conversation";
import { readHouseholdProfile } from "@/server/profile";
import { loadSessionView, readSessionPlace } from "@/server/session";
import { SessionFrame } from "./session-frame";

export default async function SessionPage(props: PageProps<"/session/[id]">) {
  const { id } = await props.params;
  await connection();
  if (!(await readHouseholdProfile())) redirect("/first-run");
  const area = await readTalkSessionArea({ sessionId: id });
  if (area?.area === "talk") {
    const talk = area.open ? await talkViewOf(id) : undefined;
    if (!talk) go(sessionDestinationOf(id, { area: "talk", completed: false }));
    return (
      <TeacherLayerHost
        key={id}
        teacher={talk.teacher}
        settings={talk.teacherSettings}
      >
        <TalkLessonFrame key={talk.version} view={talk} />
      </TeacherLayerHost>
    );
  }
  const view = await loadSessionView({ sessionId: id }, { now });
  if (!view) {
    go(sessionDestinationOf(id, await readSessionPlace({ sessionId: id })));
  }
  return <SessionFrame view={view} />;
}

/**
 * 열린 회화 세션의 자료(새 꼴 카드 — 옛 꼴 카드 세션은 자료 읽기가 닫고 undefined). 그 사이 닫혔으면 undefined 로 갈 곳에 간다. 자료 읽기가
 * 던지면 오류 이름만 남기고 다시 던져 오류 쪽으로 간다(묶음 11 재검토 N-5 — 아이 글은 남기지 않는다).
 */
async function talkViewOf(
  sessionId: string,
): Promise<TalkLessonView | undefined> {
  try {
    return await loadTalkLessonView({ sessionId }, { now });
  } catch (error) {
    console.error(
      `회화 화면 자료 읽기 실패(${error instanceof Error ? error.name : "Error"})`,
    );
    throw error;
  }
}

/** 갈 곳대로: 없는 주소 판 또는 그 주소로(둘 다 던져 끝난다). */
function go(destination: Destination): never {
  if (destination.kind === "missing") notFound();
  redirect(destination.to);
}
