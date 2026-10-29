// 선생님 관찰 쪽(선생님 화면 plan 값 16 — /dev/teacher-probe). 운영 배포 빌드에서는 빠지는 이름이다(next.config.ts 의 pageExtensions —
// 단위 tests/unit/next-config.test.ts). 집 프로필의 선생님 · 영역마다 지금 단원을 읽어 본체에 넘긴다. '3D 보기'(d8)에는 명단 선생님 전부와
// 선생님 창 설정(talk.teacher_render · talk.teacher_load_timeout_seconds — 집 값)을 넘긴다. 설정을 못 읽으면 null(3D 보기를 끔).
import type { Metadata } from "next";
import { connection } from "next/server";
import { z } from "zod";
import { AREAS, type Area } from "@/core/seed/structure";
import { teacherViewOf } from "@/core/teacher/roster";
import {
  PREVIEW_JUMP_LEVEL,
  previewUnitsOf,
  readPreviewProbe,
} from "@/server/preview";
import { getSettings } from "@/server/settings";
import { rosterOf } from "@/server/teacher";
import { type Probe3dSettings, TeacherProbe } from "./teacher-probe";

async function readProbe3dSettings(): Promise<Probe3dSettings | null> {
  try {
    const values = await getSettings({
      "talk.teacher_render": z.enum(["3d", "portrait"]),
      "talk.teacher_load_timeout_seconds": z.number().positive(),
    });
    return {
      render: values["talk.teacher_render"],
      loadTimeoutSeconds: values["talk.teacher_load_timeout_seconds"],
    };
  } catch {
    return null;
  }
}

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
  const roster = rosterOf().map(teacherViewOf);
  const settings3d = await readProbe3dSettings();
  return (
    <TeacherProbe
      view={view ?? null}
      level={PREVIEW_JUMP_LEVEL}
      units={units}
      roster={roster}
      settings3d={settings3d}
    />
  );
}
