// 배치 평가 자리(4절 배치 평가 행 · 3.2 · AC-11b · 11c · 11d, plan-p10a 파일별 값 12).
// 영역은 읽기 · 쓰기 · 말하기만(회화는 배치 평가가 없다 — 3.2). 프로필이 없으면 첫 실행으로, 단계가 정해진 영역은 수업 목록으로.
// 이 쪽은 읽기만 한다 — 시작은 화면의 '시작'(서버 액션)이 한다.
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { PLACEMENT_AREAS, type PlacementArea } from "@/core/seed/structure";
import { readPlacementPage } from "@/server/placement";
import { PlacementFlow } from "./placement-flow";

export default async function PlacementPage(
  props: PageProps<"/[area]/placement">,
) {
  const { area } = await props.params;
  if (!(PLACEMENT_AREAS as readonly string[]).includes(area)) notFound();
  await connection();
  const page = await readPlacementPage({ area: area as PlacementArea });
  if (page.kind === "no_profile") redirect("/first-run");
  if (page.kind === "placed") redirect(`/${area}/lessons`);
  return (
    <PlacementFlow
      area={area as PlacementArea}
      initial={page.screen}
      config={page.config}
    />
  );
}
