// 지난 수업 다시 하기(4절 수업 목록 표 '지난 수업' 행 · 3.2 · AC-2d, plan-p10b 바뀌는 파일).
// 단원을 먼저 고르고('단원 n') 그 단원의 수업을 고른다. 통과한 단원에서 하지 않은 수업에는 '안 해 본 수업' 표시.
// 수업을 고르면 세션을 연다(PastLessons — 수업 목록과 같은 시작 길, 차례 6).
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
import { PastLessons } from "./past-lessons";

const TEXT = {
  title: "지난 수업 다시 하기",
  unit: (n: number) => `단원 ${n}`,
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

  const band = {
    title: TEXT.title,
    detail: `${AREA_LABEL[area as Area]} · ${input.level}단계${unit !== undefined ? ` · ${TEXT.unit(unit)}` : ""}`,
    back: { href: `/${area}/lessons`, label: TEXT.back },
  };
  return (
    <ChildScreen>
      {unit === undefined ? (
        <PaperBand
          heading
          title={band.title}
          detail={band.detail}
          right={<SmallLink href={band.back.href}>{band.back.label}</SmallLink>}
        />
      ) : null}
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
        // 수업을 고르는 쪽은 띠를 조각이 그린다 — 안전 상한 안내 동안 띠 링크를 숨겨 '홈' 하나만(검토 M-2 · 화면 M-5)
        <PastLessons
          area={area as Exclude<Area, "talk">}
          items={pastUnits(input, unit)}
          band={band}
        />
      )}
    </ChildScreen>
  );
}
