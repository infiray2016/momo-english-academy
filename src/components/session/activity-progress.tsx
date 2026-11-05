// 세션 진행 표시 — 활동 묶음 막대(UI · UX plan 묶음 5-가 · spec 설계 5.4 세션 행 · UX 검토 3판 D-7). 점 대신 묶음마다 이름(정본 3.2 · 3.3
// 활동 이름 — core/session/progress 이름 표)과 칸 막대(칸 하나 = 활동 하나: 끝냄 먹색 · 지금 영역 색 · 아직 종이)를 둔다. 묶음 너비는 활동
// 수에 비례하고, 이름이 길어 한 줄에 못 들면 다음 줄로 접힌다. 지금 묶음은 aria-current="step" 이고 이름을 제목 글꼴로 둔다(색만으로 가르지
// 않음). 이름은 판 위(종이 · 포스트잇)에 있고 먹색이다(NFR-U1 — 색 종이 위 보조 줄은 먹색). 훅이 없어 서버 · 클라이언트 둘 다에서 그린다.
import { AREA_TONE, CHILD_SIZE } from "@/components/activities/common";
import type { Area } from "@/core/seed/structure";
import type { ActivityGroup } from "@/core/session/progress";
import { cn } from "@/lib/utils";

export function ActivityProgress({
  area,
  groups,
}: {
  area: Area;
  groups: readonly ActivityGroup[];
}) {
  const total = groups.reduce((n, g) => n + g.size, 0);
  return (
    <ol
      data-activity-progress=""
      data-activity-total={total}
      className="flex w-full flex-wrap items-end gap-x-4 gap-y-2"
    >
      {groups.map((group) => (
        <li
          key={group.first}
          data-progress-group={group.key}
          data-group-state={group.state}
          aria-current={group.state === "current" ? "step" : undefined}
          // 묶음은 적어도 이름 너비(min-w-max — 칸 하나짜리 묶음의 이름이 옆 묶음과 겹치지 않게, 컨트롤러 눈 점검 F5 10-30)
          className="flex min-w-max basis-0 flex-col gap-1"
          style={{ flexGrow: group.size }}
        >
          <span
            className={cn(
              CHILD_SIZE.guide,
              "whitespace-nowrap leading-tight",
              group.state === "current" && "font-heading",
            )}
          >
            {group.name}
          </span>
          <span
            aria-hidden
            className="flex h-4 overflow-hidden rounded-full border-2 border-ink bg-paper"
          >
            {group.cells.map((cell, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: 묶음 안 활동 차례가 곧 자리다
                key={i}
                data-progress-cell={cell}
                className={cn(
                  "flex-1",
                  i > 0 && "border-l-2 border-ink",
                  cell === "done" && "bg-ink",
                  cell === "current" && AREA_TONE[area].className,
                )}
              />
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}
