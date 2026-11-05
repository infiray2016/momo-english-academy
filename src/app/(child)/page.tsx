// 홈(4절 홈 표 · AC-2a · AC-5c, plan-p10b 작업 2). 프로필이 없으면 첫 실행으로, 있으면 영역 카드 넷 · 별 · 부모 점.
// 연속 학습 일수 · 복습 포스트잇은 P12 몫이라 아직 그리지 않는다. 쓰기 6~12(plan-p11b 값 12): 첨삭이 온 수업이 있으면 영역 카드보다
// 앞에 '첨삭이 왔어요'(하늘), 앱 진입마다 응답 뒤(after)에 밀린 첨삭을 많아야 둘 부른다(10절 운영 — 쿠키 · 헤더는 after 안에서 읽지 않음).
// 회화(plan-p13b 값 12): 같은 꼴로 응답 뒤에 홈 진입 정리(closeIdleTalks — 끝맺음 많아야 둘).
// 위 띠(UI · UX 묶음 0-다 · 3 · R-12 · AC-U3 · AC-23c): 왼쪽 '[홈 이름]의 공부 보드', 오른쪽 연속 학습 일수 · 별 수 칸(HomeBandChips —
// 값이 1 이상일 때만, 첫 사용 홈의 위 띠에 0 이 없다) · 부모 꼬리표(kraft). 연속 학습 일수는 P12 가 streakDays 로 넘기면 같은 조각이 그린다.
// 띠 왼쪽 얼굴 자리는 마스코트 그림이 정해진 뒤 채운다(그 전에는 두지 않음).
// 회화 카드 작은 초상(R-8): 집 선생님(householdTeacher — 고르기 전 null 이면 글자 동그라미 '선')을 카드 조각에 넘긴다.
import { redirect } from "next/navigation";
import { after, connection } from "next/server";
import { z } from "zod";
import { ChildScreen, PaperBand } from "@/components/board/board";
import { now } from "@/server/clock";
import { closeIdleTalks } from "@/server/conversation";
import { readHome } from "@/server/home";
import { readHouseholdProfile } from "@/server/profile";
import { getSettings } from "@/server/settings";
import { householdTeacher } from "@/server/teacher";
import { retryPendingFeedback } from "@/server/writing";
import { FeedbackNote, HomeBandChips, HomeCards } from "./home-cards";

export default async function HomePage() {
  // DB 를 읽는 쪽이라 요청 때 그린다(빌드 때 미리 그리지 않는다)
  await connection();
  const home = await readHome({ now: now() });
  if (!home) redirect("/first-run");
  const profile = await readHouseholdProfile();
  if (profile) {
    const profileId = profile.id;
    after(() => retryPendingFeedback({ profileId }).then(() => undefined));
    // 회화 홈 진입 정리(plan-p13b 값 3 · 12 — 목표 턴 뒤 쉰 대화 닫기 · 밀린 끝맺음 · 끝맺음 없이 중단된 대화 지우기). 시각은 after 밖에서
    // 정하지 않고 그 일이 돌 때의 now()(쿠키 · 머리글은 after 안에서 읽지 않음 — P11b 와 같은 꼴)
    after(() =>
      closeIdleTalks({ profileId, at: now() }, { now }).then(() => undefined),
    );
  }
  const waitHintSeconds = home.feedbackReady
    ? (
        await getSettings({
          "ui.wait_hint_seconds": z.tuple([
            z.number().positive(),
            z.number().positive(),
          ]),
        })
      )["ui.wait_hint_seconds"]
    : undefined;
  return (
    <ChildScreen>
      <PaperBand
        heading
        title={`${home.displayName}의 공부 보드`}
        right={
          <>
            <HomeBandChips starTotal={home.starTotal} />
            {/* 부모 메뉴(정할 것 ㅊ — 1-가는 점만, 누를 수 없음. PIN 화면은 1-나). 점은 먹색 — 목업 #8A6134 는 꼬리표 바탕 대비 2.7:1 이라 3:1 을 넘게(화면 검토 H-M4). 꼬리표는 kraft 종이 · 종이 테(시안 ② 띠 .parent) */}
            <span
              data-parent-info=""
              data-parent-menu=""
              className="flex min-h-11 -rotate-3 items-center gap-2 rounded-md border-(length:--paper-edge) border-ink bg-kraft px-4 text-lg text-ink"
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
      {home.feedbackReady && waitHintSeconds ? (
        <FeedbackNote
          lessonId={home.feedbackReady.lessonId}
          waitHintSeconds={waitHintSeconds}
        />
      ) : null}
      <HomeCards cards={home.cards} teacher={await householdTeacher()} />
    </ChildScreen>
  );
}
