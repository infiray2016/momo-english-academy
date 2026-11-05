// 세션 · 결과 주소의 갈 곳(순수, UI · UX 묶음 0-나 fix 1 · 검토 M3 · spec 설계 4 N-16 · 8절 '앱 오류' 행 R-52 · AC-U7 '/' 0회).
// 쪽(session/[id] · result/[id])이 그 프로필의 세션 자리(readSessionPlace)를 읽고, 열 화면이 없을 때 이 함수의 결과로 notFound() 나
// redirect() 만 한다. 그 프로필에서 찾지 못한 세션(없는 id · 꼴이 틀린 id · 다른 프로필의 세션)은 없는 주소 판이고, 어느 갈래도 홈('/')으로
// 보내지 않는다.
import type { Area } from "@/core/seed/structure";

/** 그 프로필의 세션 자리(서버 readSessionPlace 의 꼴 — 회화는 늘 completed 거짓). */
export type SessionPlace = { area: Area; completed: boolean };

/** 갈 곳: 없는 주소 판(missing) 또는 다른 주소로(redirect). */
export type Destination =
  | { kind: "missing" }
  | { kind: "redirect"; to: string };

const lessonList = (area: Area): Destination => ({
  kind: "redirect",
  to: `/${area}/lessons`,
});

/**
 * 세션 주소(/session/<id>)에서 열 세션 화면이 없을 때: 찾지 못하면 없는 주소 판, 끝난 수업 세션은 그 결과, 닫힌 세션은 그 영역 수업
 * 목록이다. 회화는 결과 쪽이 없어(마무리 세 장) 끝났어도 회화 수업 목록이다.
 */
export function sessionDestinationOf(
  sessionId: string,
  place: SessionPlace | undefined,
): Destination {
  if (!place) return { kind: "missing" };
  if (place.completed && place.area !== "talk")
    return { kind: "redirect", to: `/result/${sessionId}` };
  return lessonList(place.area);
}

/** 결과 주소(/result/<id>)에서 결과를 열 수 없을 때: 찾지 못하면 없는 주소 판, 찾았으면(진행 · 닫힘 · 회화) 그 영역 수업 목록이다. */
export function resultDestinationOf(
  place: SessionPlace | undefined,
): Destination {
  return place ? lessonList(place.area) : { kind: "missing" };
}
