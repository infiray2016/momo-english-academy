// 선생님 관찰 쪽(선생님 화면 plan 값 16 — /dev/teacher-probe). 운영 배포 빌드에서는 빠지는 이름이다(next.config.ts 의 pageExtensions —
// 단위 tests/unit/next-config.test.ts). 집 프로필의 선생님 · 영역마다 지금 단원을 읽어 본체에 넘긴다.
import type { Metadata } from "next";
import { connection } from "next/server";
import { AREAS, type Area } from "@/core/seed/structure";
import {
  PREVIEW_JUMP_LEVEL,
  previewUnitsOf,
  readPreviewProbe,
} from "@/server/preview";
import { TeacherProbe } from "./teacher-probe";

export const metadata: Metadata = {
  title: "선생님 관찰",
  robots: { index: false, follow: false },
};

export default async function TeacherProbePage() {
  // DB 를 읽는 쪽이라 요청 때 그린다(빌드 때 미리 그리지 않는다)
  await connection();
  const view = await readPreviewProbe();
  const units = Object.fromEntries(
    AREAS.map((area) => [area, previewUnitsOf(area)]),
  ) as Record<Area, number[]>;
  return (
    <TeacherProbe
      view={view ?? null}
      level={PREVIEW_JUMP_LEVEL}
      units={units}
    />
  );
}
