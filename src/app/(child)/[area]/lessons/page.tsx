// 수업 목록 자리(4절 수업 목록 표 · AC-2b · AC-2d, plan-p10b 작업 3 · 정할 것 ㅌ · 위험 11).
// 영역 값은 넷만 받는다(나머지 notFound — 정적 경로 /first-run · /access · /dev · /session 이 먼저다).
// 회화도 같은 목록이다(plan-p13b 값 12 — '토리가 준비 중이에요' 쪽은 지움). 배치 전이면 배치 평가로(회화는 배치 평가가 없어 말하기 배치
// 평가로 — 4절 홈 표 회화 카드 행과 같은 길), 프로필이 없으면 첫 실행으로 보낸다.
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { AREAS, type Area } from "@/core/seed/structure";
import { now } from "@/server/clock";
import { readLessonList } from "@/server/lesson-list";
import { getSettings } from "@/server/settings";
import { LessonBoard } from "./lesson-board";
import { placementPathOf } from "./placement-path";

export default async function LessonsPage(props: PageProps<"/[area]/lessons">) {
  const { area } = await props.params;
  if (!(AREAS as readonly string[]).includes(area)) notFound();
  await connection();
  const result = await readLessonList({ area: area as Area, now: now() });
  if (result.kind === "no_profile") redirect("/first-run");
  if (result.kind === "placement") redirect(placementPathOf(area as Area));
  const { view, input } = result;
  // '첨삭 보기'로 여는 동안의 기다림 표시(ui.wait_hint_seconds — plan-p11b 값 6)
  const waitHintSeconds = (
    await getSettings({
      "ui.wait_hint_seconds": z.tuple([
        z.number().positive(),
        z.number().positive(),
      ]),
    })
  )["ui.wait_hint_seconds"];
  // 화면은 고른 칸의 제목 · 번호만 쓴다(세션 시작 재판정은 서버가 같은 입력으로 다시 한다 — 차례 6)
  return (
    <LessonBoard
      area={area as Area}
      view={view}
      waitHintSeconds={waitHintSeconds}
      titles={Object.fromEntries(
        Object.values(input.lessonsByUnit)
          .flat()
          .map((c) => [`${c.unit}:${c.kind}:${c.lessonNo}`, c.title]),
      )}
    />
  );
}
