// 지난 수업 다시 하기(4절 수업 목록 표 '지난 수업' 행 · 3.2 · AC-2d, plan-p10b 바뀌는 파일).
// 단원을 먼저 고르고('단원 n') 그 단원의 수업을 고른다. 통과한 단원에서 하지 않은 수업에는 '안 해 본 수업' 표시.
// 세션 시작은 차례 6 — 그 전까지 수업 포스트잇은 보기만 한다.
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import {
  AREA_LABEL,
  ChildScreen,
  PaperBand,
  PostIt,
  SmallLink,
} from "@/components/board/board";
import { pastUnits } from "@/core/lesson-list/state";
import { AREAS, type Area } from "@/core/seed/structure";
import { now } from "@/server/clock";
import { readLessonList } from "@/server/lesson-list";

const TEXT = {
  title: "지난 수업 다시 하기",
  unit: (n: number) => `단원 ${n}`,
  untried: "안 해 본 수업",
  back: "수업 목록",
} as const;

export default async function PastLessonsPage(
  props: PageProps<"/[area]/lessons/past">,
) {
  const { area } = await props.params;
  const query = await props.searchParams;
  if (!(AREAS as readonly string[]).includes(area)) notFound();
  if (area === "talk") redirect("/talk");
  await connection();
  const result = await readLessonList({
    area: area as Exclude<Area, "talk">,
    now: now(),
  });
  if (result.kind === "no_profile") redirect("/first-run");
  if (result.kind === "placement") redirect(`/${area}/placement`);
  const { input } = result;
  if (input.unitsPassed.length === 0) redirect(`/${area}/lessons`);
  const raw = typeof query.unit === "string" ? Number(query.unit) : undefined;
  const unit =
    raw !== undefined && input.unitsPassed.includes(raw) ? raw : undefined;
  if (raw !== undefined && unit === undefined)
    redirect(`/${area}/lessons/past`);

  return (
    <ChildScreen>
      <PaperBand
        heading
        title={TEXT.title}
        detail={`${AREA_LABEL[area as Area]} · ${input.level}단계${unit !== undefined ? ` · ${TEXT.unit(unit)}` : ""}`}
        right={<SmallLink href={`/${area}/lessons`}>{TEXT.back}</SmallLink>}
      />
      {unit === undefined ? (
        <section className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6">
          {input.unitsPassed.map((u, i) => (
            <PostIt
              key={u}
              tone={area as Area}
              tilt={i % 2 === 0 ? "left" : "right"}
              href={`/${area}/lessons/past?unit=${u}`}
              label={TEXT.unit(u)}
              className="items-center justify-center p-6 pt-9"
            >
              <span className="font-heading text-3xl">{TEXT.unit(u)}</span>
            </PostIt>
          ))}
        </section>
      ) : (
        <section className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-6">
          {pastUnits(input, unit).map((item, i) => (
            <PostIt
              key={`${item.ref.kind}-${item.ref.lessonNo}`}
              tone={area as Area}
              tilt={i % 2 === 0 ? "left" : "slight"}
              className="min-h-36 gap-2 p-4 pt-8"
            >
              <span
                data-lesson={`${item.ref.kind}-${item.ref.lessonNo}`}
                className="contents"
              >
                <span className="font-heading text-4xl leading-none">
                  {item.ref.lessonNo}
                </span>
                <span>{item.title}</span>
                {item.mark === "untried" ? (
                  <span className="self-start rounded-md border-2 border-ink px-2 font-heading text-[22px]">
                    {TEXT.untried}
                  </span>
                ) : null}
              </span>
            </PostIt>
          ))}
        </section>
      )}
    </ChildScreen>
  );
}
