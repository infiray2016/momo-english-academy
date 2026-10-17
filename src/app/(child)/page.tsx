// 홈(4절 홈 표 · AC-2a · AC-5c, plan-p10b 작업 2). 프로필이 없으면 첫 실행으로, 있으면 영역 카드 넷 · 별 · 부모 점.
// 연속 학습 일수 · 복습 포스트잇 · '첨삭이 왔어요'는 P11 · P12 몫이라 아직 그리지 않는다.
import { Star } from "lucide-react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ChildScreen, PaperBand } from "@/components/board/board";
import { now } from "@/server/clock";
import { readHome } from "@/server/home";
import { HomeCards } from "./home-cards";

export default async function HomePage() {
  // DB 를 읽는 쪽이라 요청 때 그린다(빌드 때 미리 그리지 않는다)
  await connection();
  const home = await readHome({ now: now() });
  if (!home) redirect("/first-run");
  return (
    <ChildScreen>
      <PaperBand
        heading
        title={`${home.displayName}의 공부 보드`}
        right={
          <>
            <span
              data-star-total=""
              className="flex items-center gap-2 font-heading text-2xl"
            >
              <Star aria-hidden className="size-7 fill-postit-reading" />
              {`별 ${home.starTotal}개`}
            </span>
            {/* 부모 메뉴(정할 것 ㅊ — 1-가는 점만, 누를 수 없음. PIN 화면은 1-나). 점은 먹색 — 목업 #8A6134 는 꼬리표 바탕 대비 2.7:1 이라 3:1 을 넘게(화면 검토 H-M4) */}
            <span
              data-parent-info=""
              data-parent-menu=""
              className="flex min-h-11 -rotate-3 items-center gap-2 rounded-md bg-kraft px-4 text-lg text-ink"
            >
              {home.parentDot ? (
                <span
                  data-parent-dot=""
                  aria-hidden
                  className="size-3 rounded-full bg-ink"
                />
              ) : null}
              부모
            </span>
          </>
        }
      />
      <HomeCards cards={home.cards} />
    </ChildScreen>
  );
}
